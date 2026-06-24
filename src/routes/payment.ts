// ============================================================
// LEADER — Routes Payment Gateway V2
// Gestion unifiée de tous les modes de paiement
// ============================================================
import { Hono } from 'hono'
import { verifyJWT, verifyPassword, generateId } from '../lib/auth.js'
import { walletOperation, createNotification, getRankIndex, RANK_ORDER, activateAndReward, propagateBV } from '../lib/mlm.js'
import type { Bindings } from '../types/index.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function generatePaymentId(): string {
  return 'pm_' + Math.random().toString(36).substring(2, 18)
}

/** Calcule les frais pour un mode de paiement donné */
function computeFee(feeRow: any, amount: number): number {
  if (!feeRow) return 0
  let fee = 0
  if (feeRow.fee_type === 'percent') {
    fee = (amount * feeRow.fee_percent) / 100
  } else if (feeRow.fee_type === 'fixed') {
    fee = feeRow.fee_fixed
  } else if (feeRow.fee_type === 'percent_plus_fixed') {
    fee = (amount * feeRow.fee_percent) / 100 + feeRow.fee_fixed
  }
  if (feeRow.fee_min > 0) fee = Math.max(fee, feeRow.fee_min)
  if (feeRow.fee_max > 0) fee = Math.min(fee, feeRow.fee_max)
  return Math.round(fee * 100) / 100
}

/** Lire la config OpenAI depuis payment_gateway_config */
async function getOpenAIKey(db: D1Database, env: any): Promise<string> {
  const row = await db.prepare(
    `SELECT value FROM payment_gateway_config WHERE gateway = 'openai' AND key = 'api_key'`
  ).first() as any
  return row?.value || env.OPENAI_API_KEY || ''
}

// ── Router public + membres ────────────────────────────────────────────────────
export const paymentRouter = new Hono<{ Bindings: Bindings }>()

// ── Router admin ───────────────────────────────────────────────────────────────
export const paymentAdminRouter = new Hono<{ Bindings: Bindings }>()

// ════════════════════════════════════════════════════════════════════════════════
// ROUTES MEMBRES (auth middleware)
// ════════════════════════════════════════════════════════════════════════════════

paymentRouter.use('/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload || payload.role !== 'member') return c.json({ error: 'Token invalide' }, 401)
  c.set('memberId' as any, payload.sub)
  return next()
})

// ── GET /api/payment/methods — Liste les modes de paiement actifs ─────────────
paymentRouter.get('/methods', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT pm.*, pf.fee_type, pf.fee_percent, pf.fee_fixed, pf.fee_min, pf.fee_max
    FROM payment_methods pm
    LEFT JOIN payment_fees pf ON pf.payment_method_id = pm.id AND pf.apply_to IN ('purchase','all')
    WHERE pm.is_active = 1
    ORDER BY pm.category, pm.sort_order
  `).all()

  // Grouper par catégorie + parser config JSON
  const grouped: Record<string, any[]> = {}
  for (const row of (rows.results as any[])) {
    let config: any = {}
    try { config = JSON.parse(row.config || '{}') } catch {}
    // Ne pas exposer les clés API secrètes au frontend membre
    const safeConfig = sanitizeConfigForMember(row.category, row.provider, config)
    const item = { ...row, config: safeConfig }
    if (!grouped[row.category]) grouped[row.category] = []
    grouped[row.category].push(item)
  }
  return c.json({ methods: grouped })
})

/** Enlève les clés sensibles pour le frontend membre */
function sanitizeConfigForMember(category: string, provider: string, config: any): any {
  const safe: any = {}
  // Champs toujours safe à exposer
  const safeKeys = [
    'beneficiary', 'iban', 'bic', 'bank_name', 'branch', 'country',
    'account_number', 'phone_number', 'account_name', 'merchant_code',
    'merchant_name', 'contact_name', 'contact_phone', 'contact_location',
    'recipient_name', 'recipient_country', 'instructions_extra',
    'reference_prefix', 'email', 'account_id', 'revolut_tag',
    'paybill_number', 'business_name', 'coins', 'merchant_id',
    'skrill_email', 'swift', 'bank_address'
  ]
  for (const k of safeKeys) {
    if (config[k] !== undefined) safe[k] = config[k]
  }
  return safe
}

// ── GET /api/payment/fees — Calcule les frais pour un mode + montant ──────────
paymentRouter.get('/fees', async (c) => {
  const methodId = c.req.query('method_id')
  const amount = parseFloat(c.req.query('amount') || '0')
  const context = c.req.query('context') || 'purchase' // purchase | topup | transfer

  if (!methodId || !amount) return c.json({ fee: 0, total: amount })

  const feeRow = await c.env.DB.prepare(`
    SELECT * FROM payment_fees
    WHERE payment_method_id = ? AND apply_to IN (?, 'all')
    LIMIT 1
  `).bind(methodId, context).first() as any

  const fee = computeFee(feeRow, amount)
  return c.json({ fee, total: amount + fee, fee_type: feeRow?.fee_type || 'percent', fee_percent: feeRow?.fee_percent || 0, fee_fixed: feeRow?.fee_fixed || 0 })
})

// ════════════════════════════════════════════════════════════════════════════════
// WALLET — PAIEMENT INTERNE (wallet_balance → achat package)
// ════════════════════════════════════════════════════════════════════════════════

paymentRouter.post('/wallet/pay-order', async (c) => {
  const memberId = c.get('memberId' as any)
  const { order_id } = await c.req.json() as { order_id: string }
  if (!order_id) return c.json({ error: 'order_id requis' }, 400)

  // Vérifier la commande
  const order = await c.env.DB.prepare(
    `SELECT * FROM package_orders WHERE id = ? AND member_id = ? AND status = 'pending'`
  ).bind(order_id, memberId).first() as any
  if (!order) return c.json({ error: 'Commande introuvable ou déjà traitée' }, 404)

  // Vérifier le solde
  const wallet = await c.env.DB.prepare(`SELECT balance FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
  const balance = wallet?.balance ?? 0
  const needed = order.amount_usd

  if (balance < needed) {
    return c.json({ error: `Solde insuffisant. Disponible : $${balance.toFixed(2)}, Requis : $${needed.toFixed(2)}` }, 400)
  }

  // Débiter le wallet
  await walletOperation(c.env.DB, memberId, needed, 'debit', 'debit_order_wallet',
    `Paiement commande ${order_id.substring(0, 8)}…`, order_id)

  // Mettre la commande en validated
  await c.env.DB.prepare(
    `UPDATE package_orders SET status='validated', payment_method='internal_wallet',
     validated_at=datetime('now'), validated_by='system_wallet', updated_at=datetime('now')
     WHERE id=?`
  ).bind(order_id).run()

  // Activer et distribuer BV/commissions
  try {
    await activateAndReward(c.env.DB, order_id)
  } catch (e) {
    console.error('[wallet/pay-order] activateAndReward error:', e)
  }

  await createNotification(c.env.DB, memberId, 'success',
    'Commande activée via Wallet',
    `Votre paiement de $${needed.toFixed(2)} a été débité de votre wallet. Commande activée immédiatement.`)

  // Récupérer le nouveau solde après débit pour l'afficher côté client
  const walletAfter = await c.env.DB.prepare(`SELECT balance FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
  const newBalance = walletAfter?.balance ?? 0

  return c.json({ success: true, message: 'Paiement effectué et commande activée.', new_balance: newBalance, amount_paid: needed })
})

// ════════════════════════════════════════════════════════════════════════════════
// WALLET TOPUP — RECHARGE
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/payment/topup/config — Montant minimum et méthodes disponibles
paymentRouter.get('/topup/config', async (c) => {
  const minRow = await c.env.DB.prepare(`SELECT value FROM system_config WHERE key='wallet_topup_min_amount'`).first() as any
  const minAmount = parseFloat(minRow?.value || '50')

  const methods = await c.env.DB.prepare(`
    SELECT pm.id, pm.category, pm.provider, pm.display_name, pm.logo_emoji,
           pm.requires_proof, pm.is_automatic, pm.instructions,
           pf.fee_type, pf.fee_percent, pf.fee_fixed, pf.fee_min, pf.fee_max
    FROM payment_methods pm
    LEFT JOIN payment_fees pf ON pf.payment_method_id = pm.id AND pf.apply_to IN ('topup','all')
    WHERE pm.is_active = 1 AND pm.provider != 'leader_wallet'
    ORDER BY pm.category, pm.sort_order
  `).all()

  return c.json({ min_amount: minAmount, methods: methods.results })
})

// POST /api/payment/topup/create — Créer une demande de recharge
paymentRouter.post('/topup/create', async (c) => {
  const memberId = c.get('memberId' as any)
  const { payment_method_id, legacy_method, amount } = await c.req.json() as {
    payment_method_id?: string; legacy_method?: string; amount: number
  }

  // Validation montant minimum
  const minRow = await c.env.DB.prepare(`SELECT value FROM system_config WHERE key='wallet_topup_min_amount'`).first() as any
  const minAmount = parseFloat(minRow?.value || '50')
  if (!amount || amount < minAmount) {
    return c.json({ error: `Montant minimum de recharge : $${minAmount}` }, 400)
  }

  // Récupérer le mode de paiement — supporte méthodes V2 (payment_methods) ET legacy (system_config)
  let method: any = null
  let methodIdForDB: string | null = null

  if (payment_method_id) {
    // Méthode V2 (Mollie, Juice, etc.) — stockée dans payment_methods avec UUID
    method = await c.env.DB.prepare(
      `SELECT * FROM payment_methods WHERE id = ? AND is_active = 1`
    ).bind(payment_method_id).first() as any
    if (!method) return c.json({ error: 'Mode de paiement introuvable' }, 404)
    methodIdForDB = payment_method_id
  } else if (legacy_method) {
    // Méthode legacy (bank, paypal, crypto, stripe, coinpayments, wallet, manual)
    // Ces méthodes sont configurées dans system_config, pas dans payment_methods
    const legacyNames: Record<string, string> = {
      bank: 'Virement bancaire',
      paypal: 'PayPal / Carte bancaire',
      crypto: 'Cryptomonnaie',
      wallet: 'Wallet LEADER',
      stripe: 'Carte bancaire / Apple Pay / Google Pay',
      coinpayments: 'Cryptomonnaie via CoinPayments',
      manual: 'Autre méthode'
    }
    method = {
      display_name: legacyNames[legacy_method] || legacy_method,
      requires_proof: 1,
      is_automatic: 0,
      instructions: ''
    }
    methodIdForDB = null  // Pas d'UUID pour les méthodes legacy
  } else {
    return c.json({ error: 'Mode de paiement requis (payment_method_id ou legacy_method)' }, 400)
  }

  // Calculer les frais (seulement pour les méthodes V2 avec ID connu)
  let feeAmount = 0
  if (methodIdForDB) {
    const feeRow = await c.env.DB.prepare(
      `SELECT * FROM payment_fees WHERE payment_method_id = ? AND apply_to IN ('topup','all') LIMIT 1`
    ).bind(methodIdForDB).first() as any
    feeAmount = computeFee(feeRow, amount)
  }
  const amountToSend = amount + feeAmount

  // Créer le topup
  const topupId = generateId()
  await c.env.DB.prepare(`
    INSERT INTO wallet_topups (id, member_id, payment_method_id, amount_requested, fee_amount, amount_to_send, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).bind(topupId, memberId, methodIdForDB, amount, feeAmount, amountToSend).run()

  return c.json({
    success: true,
    topup_id: topupId,
    amount_requested: amount,
    fee_amount: feeAmount,
    amount_to_send: amountToSend,
    requires_proof: method.requires_proof === 1,
    is_automatic: method.is_automatic === 1,
    instructions: method.instructions || '',
    method_name: method.display_name
  })
})

// POST /api/payment/topup/submit-proof — Soumettre une preuve de paiement
paymentRouter.post('/topup/submit-proof', async (c) => {
  const memberId = c.get('memberId' as any)
  const { topup_id, proof_url, reference } = await c.req.json() as {
    topup_id: string; proof_url: string; reference?: string
  }

  if (!topup_id || !proof_url) return c.json({ error: 'topup_id et proof_url requis' }, 400)

  // Accepte les statuts 'pending' ET 'proof_submitted' (re-soumission autorisée)
  const topup = await c.env.DB.prepare(
    `SELECT * FROM wallet_topups WHERE id = ? AND member_id = ? AND status IN ('pending','proof_submitted')`
  ).bind(topup_id, memberId).first() as any
  if (!topup) return c.json({ error: 'Demande de recharge introuvable ou déjà traitée' }, 404)

  await c.env.DB.prepare(`
    UPDATE wallet_topups SET status='proof_submitted', proof_url=?, reference=?, updated_at=datetime('now') WHERE id=?
  `).bind(proof_url, reference || null, topup_id).run()

  // Lancer l'analyse IA en arrière-plan
  const aiKey = await getOpenAIKey(c.env.DB, c.env)
  const aiEnabled = await c.env.DB.prepare(`SELECT value FROM system_config WHERE key='proof_ai_enabled'`).first() as any
  if (aiKey && aiEnabled?.value === 'true') {
    analyzeProofWithAI(c.env.DB, aiKey, 'topup', topup_id, proof_url, topup.amount_requested).catch(e =>
      console.error('[AI topup proof]', e)
    )
  }

  await createNotification(c.env.DB, memberId, 'info',
    'Preuve de recharge soumise',
    `Votre demande de recharge de $${topup.amount_requested} est en cours de vérification.`)

  return c.json({ success: true, message: 'Preuve soumise. Validation en cours.' })
})

// GET /api/payment/topup/list — Liste des recharges du membre
paymentRouter.get('/topup/list', async (c) => {
  const memberId = c.get('memberId' as any)
  const rows = await c.env.DB.prepare(`
    SELECT wt.*, pm.display_name as method_name, pm.logo_emoji
    FROM wallet_topups wt
    LEFT JOIN payment_methods pm ON pm.id = wt.payment_method_id
    WHERE wt.member_id = ?
    ORDER BY wt.created_at DESC
    LIMIT 50
  `).bind(memberId).all()
  return c.json({ topups: rows.results })
})

// ════════════════════════════════════════════════════════════════════════════════
// WALLET TRANSFER — TRANSFERT ENTRE MEMBRES
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/payment/transfer/config
paymentRouter.get('/transfer/config', async (c) => {
  const [minRow, feeTypeRow, feeValueRow, scopeRow] = await Promise.all([
    c.env.DB.prepare(`SELECT value FROM system_config WHERE key='wallet_transfer_min_amount'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM system_config WHERE key='wallet_transfer_fee_type'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM system_config WHERE key='wallet_transfer_fee_value'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM system_config WHERE key='wallet_transfer_scope'`).first() as any,
  ])
  return c.json({
    min_amount: parseFloat(minRow?.value || '10'),
    fee_type: feeTypeRow?.value || 'fixed',
    fee_value: parseFloat(feeValueRow?.value || '0'),
    scope: scopeRow?.value || 'network'
  })
})

// POST /api/payment/transfer/lookup — Rechercher un destinataire
paymentRouter.post('/transfer/lookup', async (c) => {
  const memberId = c.get('memberId' as any)
  const { unique_id } = await c.req.json() as { unique_id: string }
  if (!unique_id) return c.json({ error: 'Identifiant requis' }, 400)

  const scopeRow = await c.env.DB.prepare(`SELECT value FROM system_config WHERE key='wallet_transfer_scope'`).first() as any
  const scope = scopeRow?.value || 'network'

  const recipient = await c.env.DB.prepare(
    `SELECT id, unique_id, first_name, last_name, sponsor_id, binary_parent_id FROM members WHERE unique_id = ? AND id != ?`
  ).bind(unique_id.toUpperCase(), memberId).first() as any

  if (!recipient) return c.json({ error: 'Membre introuvable' }, 404)

  if (scope === 'network') {
    // Vérifier que le destinataire est dans le réseau de l'expéditeur
    const inNetwork = await isInNetwork(c.env.DB, memberId, recipient.id)
    if (!inNetwork) return c.json({ error: 'Ce membre n\'est pas dans votre réseau. Les transferts sont limités à votre réseau.' }, 403)
  }

  return c.json({
    found: true,
    recipient: {
      id: recipient.id,
      unique_id: recipient.unique_id,
      name: `${recipient.first_name} ${recipient.last_name}`
    }
  })
})

/** Vérifie si recipientId est dans le réseau de senderId (descendant OU upline) */
async function isInNetwork(db: D1Database, senderId: string, recipientId: string): Promise<boolean> {
  // Stratégie 1 : remonter depuis le destinataire jusqu'à 50 niveaux vers ses sponsors/parents
  // Si on rencontre senderId dans la chaîne, ils sont dans le même réseau
  const visited = new Set<string>()
  let currentId: string = recipientId
  for (let i = 0; i < 50; i++) {
    if (visited.has(currentId)) break
    visited.add(currentId)
    const member = await db.prepare(
      `SELECT sponsor_id, binary_parent_id FROM members WHERE id = ?`
    ).bind(currentId).first() as any
    if (!member) break
    // Vérifier sponsor et parent binaire
    if (member.sponsor_id === senderId || member.binary_parent_id === senderId) return true
    // Poursuivre la remontée via sponsor (priorité) puis parent binaire
    const nextId = member.sponsor_id || member.binary_parent_id
    if (!nextId) break
    currentId = nextId
  }

  // Stratégie 2 : remonter depuis l'expéditeur pour vérifier si recipient est son upline
  // (cas transfert vers son parrain ou grand-parrain)
  currentId = senderId
  visited.clear()
  for (let i = 0; i < 50; i++) {
    if (visited.has(currentId)) break
    visited.add(currentId)
    const member = await db.prepare(
      `SELECT sponsor_id, binary_parent_id FROM members WHERE id = ?`
    ).bind(currentId).first() as any
    if (!member) break
    if (member.sponsor_id === recipientId || member.binary_parent_id === recipientId) return true
    const nextId = member.sponsor_id || member.binary_parent_id
    if (!nextId) break
    currentId = nextId
  }

  // Stratégie 3 : vérification SQL directe — le recipient est-il un sponsor direct de quelqu'un
  // dans la downline directe de sender (1 niveau)
  const directDownline = await db.prepare(
    `SELECT COUNT(*) as cnt FROM members WHERE (sponsor_id = ? OR binary_parent_id = ?) AND id = ?`
  ).bind(senderId, senderId, recipientId).first() as any
  if (directDownline?.cnt > 0) return true

  return false
}

// POST /api/payment/transfer/send — Exécuter le transfert
paymentRouter.post('/transfer/send', async (c) => {
  const memberId = c.get('memberId' as any)
  const { recipient_unique_id, amount, pin, note } = await c.req.json() as {
    recipient_unique_id: string; amount: number; pin: string; note?: string
  }

  if (!recipient_unique_id || !amount || !pin) {
    return c.json({ error: 'Destinataire, montant et PIN requis' }, 400)
  }

  // Vérifier PIN
  const sender = await c.env.DB.prepare(
    `SELECT id, unique_id, pin_hash, wallet_balance, first_name, last_name FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  if (!sender?.pin_hash) return c.json({ error: 'PIN non configuré' }, 400)
  const pinValid = await verifyPassword(pin, sender.pin_hash)
  if (!pinValid) return c.json({ error: 'PIN incorrect' }, 401)

  // Config transfert
  const [minRow, feeTypeRow, feeValueRow, scopeRow] = await Promise.all([
    c.env.DB.prepare(`SELECT value FROM system_config WHERE key='wallet_transfer_min_amount'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM system_config WHERE key='wallet_transfer_fee_type'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM system_config WHERE key='wallet_transfer_fee_value'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM system_config WHERE key='wallet_transfer_scope'`).first() as any,
  ])
  const minAmount = parseFloat(minRow?.value || '10')
  const feeType = feeTypeRow?.value || 'fixed'
  const feeValue = parseFloat(feeValueRow?.value || '0')
  const scope = scopeRow?.value || 'network'

  if (amount < minAmount) return c.json({ error: `Montant minimum de transfert : $${minAmount}` }, 400)

  // Calculer les frais
  let feeAmount = 0
  if (feeType === 'percent') feeAmount = (amount * feeValue) / 100
  else if (feeType === 'fixed') feeAmount = feeValue
  feeAmount = Math.round(feeAmount * 100) / 100

  const totalDebit = amount + feeAmount

  // Vérifier solde expéditeur
  const senderWallet = await c.env.DB.prepare(`SELECT balance FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
  const senderBalance = senderWallet?.balance ?? 0
  if (senderBalance < totalDebit) {
    return c.json({ error: `Solde insuffisant. Disponible : $${senderBalance.toFixed(2)}, Requis : $${totalDebit.toFixed(2)}` }, 400)
  }

  // Récupérer le destinataire
  const recipient = await c.env.DB.prepare(
    `SELECT id, unique_id, first_name, last_name, sponsor_id, binary_parent_id FROM members WHERE unique_id = ? AND id != ?`
  ).bind(recipient_unique_id.toUpperCase(), memberId).first() as any
  if (!recipient) return c.json({ error: 'Destinataire introuvable' }, 404)

  if (scope === 'network') {
    const inNetwork = await isInNetwork(c.env.DB, memberId, recipient.id)
    if (!inNetwork) return c.json({ error: 'Ce membre n\'est pas dans votre réseau' }, 403)
  }

  // Exécuter le transfert
  const transferId = generateId()
  const netAmount = amount // Le destinataire reçoit le montant sans frais

  // Débiter l'expéditeur (montant + frais)
  await walletOperation(c.env.DB, memberId, totalDebit, 'debit', 'debit_transfer',
    `Transfert vers ${recipient.unique_id}${note ? ` — ${note}` : ''}`, transferId)

  // Créditer le destinataire (montant net)
  await walletOperation(c.env.DB, recipient.id, netAmount, 'credit', 'credit_transfer',
    `Transfert de ${sender.unique_id}${note ? ` — ${note}` : ''}`, transferId)

  // Enregistrer le transfert
  await c.env.DB.prepare(`
    INSERT INTO wallet_transfers (id, sender_id, recipient_id, amount, fee_amount, net_amount, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(transferId, memberId, recipient.id, amount, feeAmount, netAmount, note || null).run()

  // Notifications
  await createNotification(c.env.DB, memberId, 'info',
    'Transfert envoyé',
    `$${netAmount.toFixed(2)} envoyés à ${recipient.first_name} ${recipient.last_name} (${recipient.unique_id}).${feeAmount > 0 ? ` Frais : $${feeAmount.toFixed(2)}` : ''}`)

  await createNotification(c.env.DB, recipient.id, 'success',
    'Transfert reçu',
    `Vous avez reçu $${netAmount.toFixed(2)} de ${sender.first_name} ${sender.last_name} (${sender.unique_id}).`)

  return c.json({
    success: true,
    transfer_id: transferId,
    amount_sent: amount,
    fee: feeAmount,
    total_debited: totalDebit,
    recipient_name: `${recipient.first_name} ${recipient.last_name}`,
    recipient_uid: recipient.unique_id
  })
})

// GET /api/payment/transfer/history
paymentRouter.get('/transfer/history', async (c) => {
  const memberId = c.get('memberId' as any)
  const rows = await c.env.DB.prepare(`
    SELECT wt.*,
           s.unique_id as sender_uid, s.first_name||' '||s.last_name as sender_name,
           r.unique_id as recipient_uid, r.first_name||' '||r.last_name as recipient_name
    FROM wallet_transfers wt
    LEFT JOIN members s ON s.id = wt.sender_id
    LEFT JOIN members r ON r.id = wt.recipient_id
    WHERE wt.sender_id = ? OR wt.recipient_id = ?
    ORDER BY wt.created_at DESC
    LIMIT 50
  `).bind(memberId, memberId).all()
  return c.json({ transfers: rows.results })
})

// ════════════════════════════════════════════════════════════════════════════════
// IA ANALYSE PREUVE DE PAIEMENT
// ════════════════════════════════════════════════════════════════════════════════

/** Analyse une preuve de paiement avec GPT-4o Vision */
export async function analyzeProofWithAI(
  db: D1Database,
  apiKey: string,
  refType: 'order' | 'topup' | 'license',
  refId: string,
  proofUrl: string,
  expectedAmount: number
): Promise<void> {
  const threshold = parseFloat(
    ((await db.prepare(`SELECT value FROM system_config WHERE key='proof_ai_threshold'`).first()) as any)?.value || '80'
  )

  const prompt = `Tu es un expert en vérification de preuves de paiement financières.
Analyse cette image et détermine si c'est une preuve de paiement authentique.

MONTANT ATTENDU : $${expectedAmount} USD (ou équivalent dans la devise locale)

Réponds UNIQUEMENT en JSON valide avec cette structure :
{
  "verdict": "authentic" | "suspicious" | "invalid",
  "score": <nombre 0-100 représentant la confiance que c'est authentique>,
  "amount_detected": <montant détecté ou null>,
  "currency_detected": "<devise détectée ou null>",
  "date_detected": "<date détectée YYYY-MM-DD ou null>",
  "message": "<explication courte en français>",
  "red_flags": ["<liste des signes suspects si applicable>"]
}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: proofUrl, detail: 'high' } }
          ]
        }]
      })
    })

    if (!response.ok) {
      console.error('[AI] OpenAI error:', response.status, await response.text())
      await db.prepare(`
        INSERT OR REPLACE INTO proof_ai_reviews (id, reference_type, reference_id, proof_url, ai_verdict, ai_score, ai_message, model_used)
        VALUES (lower(hex(randomblob(16))), ?, ?, ?, 'error', 0, 'Erreur API OpenAI', 'gpt-4o')
      `).bind(refType, refId, proofUrl).run()
      return
    }

    const data = await response.json() as any
    const content = data.choices?.[0]?.message?.content || '{}'
    let parsed: any = {}
    try {
      // Extraire le JSON du contenu (au cas où il y aurait du texte autour)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch {
      parsed = { verdict: 'error', score: 0, message: 'Réponse IA non parseable' }
    }

    const score = Math.min(100, Math.max(0, Number(parsed.score) || 0))
    const verdict = parsed.verdict || 'error'

    // Sauvegarder l'analyse
    await db.prepare(`
      INSERT OR REPLACE INTO proof_ai_reviews
        (id, reference_type, reference_id, proof_url, ai_score, ai_verdict, ai_message,
         ai_amount, ai_date, ai_currency, model_used, reviewed_at)
      VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'gpt-4o', datetime('now'))
    `).bind(
      refType, refId, proofUrl, score, verdict,
      parsed.message || '',
      parsed.amount_detected || null,
      parsed.date_detected || null,
      parsed.currency_detected || null
    ).run()

    // Si authentique avec score >= seuil, pré-valider
    if (verdict === 'authentic' && score >= threshold) {
      if (refType === 'order') {
        await preValidateOrder(db, refId, score, parsed.message || '')
      } else if (refType === 'topup') {
        await preValidateTopup(db, refId, score, parsed.message || '')
      }
    }

    // Mettre à jour le statut de la référence avec le score IA
    if (refType === 'order') {
      await db.prepare(`
        UPDATE package_orders SET ai_reviewed=1, ai_score=?, ai_verdict=?, updated_at=datetime('now') WHERE id=?
      `).bind(score, verdict, refId).run()
    } else if (refType === 'topup') {
      await db.prepare(`
        UPDATE wallet_topups SET ai_score=?, ai_reviewed_at=datetime('now'), updated_at=datetime('now') WHERE id=?
      `).bind(score, refId).run()
    }

  } catch (err) {
    console.error('[AI analyzeProof] Error:', err)
  }
}

/** Pré-valide une commande suite à l'analyse IA positive */
async function preValidateOrder(db: D1Database, orderId: string, score: number, aiMessage: string): Promise<void> {
  const order = await db.prepare(`SELECT * FROM package_orders WHERE id = ? AND status = 'proof_submitted'`).bind(orderId).first() as any
  if (!order) return

  // Pré-valider : status = validated (mais avec pre_validated_by='ai')
  await db.prepare(`
    UPDATE package_orders
    SET status='validated', ai_reviewed=1, ai_score=?, ai_verdict='authentic',
        pre_validated_at=datetime('now'), pre_validated_by='ai',
        validated_at=datetime('now'), validated_by='ai_system',
        updated_at=datetime('now')
    WHERE id=?
  `).bind(score, orderId).run()

  // Activer BV/commissions/rangs
  try {
    await activateAndReward(db, orderId)
  } catch (e) {
    console.error('[preValidateOrder] activateAndReward error:', e)
  }

  // Notifier le membre
  await createNotification(db, order.member_id, 'success',
    ' Paiement pré-validé par IA',
    `Votre preuve de paiement a été analysée et jugée authentique (confiance : ${score}%). Votre commande est activée. La confirmation finale sera effectuée à réception des fonds.`)
}

/** Pré-valide une recharge wallet suite à l'analyse IA positive */
async function preValidateTopup(db: D1Database, topupId: string, score: number, aiMessage: string): Promise<void> {
  const topup = await db.prepare(`SELECT * FROM wallet_topups WHERE id = ? AND status = 'proof_submitted'`).bind(topupId).first() as any
  if (!topup) return

  // Créditer le wallet
  await walletOperation(db, topup.member_id, topup.amount_requested, 'credit', 'credit_topup',
    `Recharge wallet pré-validée par IA ($${topup.amount_requested})`, topupId)

  // Mettre à jour le statut
  await db.prepare(`
    UPDATE wallet_topups SET status='ai_approved', updated_at=datetime('now') WHERE id=?
  `).bind(topupId).run()

  await createNotification(db, topup.member_id, 'success',
    ' Recharge pré-validée par IA',
    `Votre recharge de $${topup.amount_requested} a été analysée et pré-validée. Votre wallet a été crédité. Confirmation finale à réception des fonds.`)
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTES ADMIN PAYMENT GATEWAY V2
// ════════════════════════════════════════════════════════════════════════════════

// Auth middleware admin
paymentAdminRouter.use('/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Token invalide' }, 401)
  c.set('adminId' as any, payload.sub)
  return next()
})

// ── GET /api/admin/payment/methods — Tous les modes (actifs + inactifs) ────────
paymentAdminRouter.get('/methods', async (c) => {
  const category = c.req.query('category') || ''
  const whereClause = category ? `WHERE pm.category = ?` : ''
  const bindArgs = category ? [category] : []

  const rows = await c.env.DB.prepare(`
    SELECT pm.*,
           pf.fee_type, pf.fee_percent, pf.fee_fixed, pf.fee_min, pf.fee_max
    FROM payment_methods pm
    LEFT JOIN payment_fees pf ON pf.payment_method_id = pm.id AND pf.apply_to = 'all'
    ${whereClause}
    ORDER BY pm.category, pm.sort_order, pm.display_name
  `).bind(...bindArgs).all()

  const methods: any[] = []
  for (const row of (rows.results as any[])) {
    let config: any = {}
    try { config = JSON.parse(row.config || '{}') } catch {}
    methods.push({ ...row, config })
  }

  return c.json({ methods })
})

// ── GET /api/admin/payment/methods/:id — Détail d'un mode ────────────────────
paymentAdminRouter.get('/methods/:id', async (c) => {
  const id = c.req.param('id')
  const method = await c.env.DB.prepare(`SELECT * FROM payment_methods WHERE id=?`).bind(id).first() as any
  if (!method) return c.json({ error: 'Introuvable' }, 404)
  const feeRow = await c.env.DB.prepare(`SELECT * FROM payment_fees WHERE payment_method_id=? AND apply_to='all'`).bind(id).first() as any
  let config: any = {}
  try { config = JSON.parse(method.config || '{}') } catch {}
  return c.json({ method: { ...method, config }, fee: feeRow })
})

// ── GET /api/admin/payment/methods/:id/fees — Tous les frais d'un mode ────────
paymentAdminRouter.get('/methods/:id/fees', async (c) => {
  const id = c.req.param('id')
  const rows = await c.env.DB.prepare(`
    SELECT * FROM payment_fees WHERE payment_method_id=? ORDER BY apply_to
  `).bind(id).all()
  return c.json({ fees: rows.results })
})

// ── PUT /api/admin/payment/methods/:id — Modifier un mode ────────────────────
paymentAdminRouter.put('/methods/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json() as {
    display_name?: string; description?: string; logo_emoji?: string
    is_active?: boolean; requires_proof?: boolean; is_automatic?: boolean
    instructions?: string; config?: Record<string, any>; sort_order?: number
    // Frais : soit un array (nouveau format frontend), soit champs directs (legacy)
    fees?: Array<{ apply_to: string; fee_type: string; fee_percent: number; fee_fixed: number; fee_min: number; fee_max: number }>
    fee_type?: string; fee_percent?: number; fee_fixed?: number
    fee_min?: number; fee_max?: number
  }

  const method = await c.env.DB.prepare(`SELECT * FROM payment_methods WHERE id=?`).bind(id).first() as any
  if (!method) return c.json({ error: 'Introuvable' }, 404)

  // Fusionner la config existante avec les nouvelles valeurs
  let existingConfig: any = {}
  try { existingConfig = JSON.parse(method.config || '{}') } catch {}
  const newConfig = body.config !== undefined ? body.config : existingConfig

  await c.env.DB.prepare(`
    UPDATE payment_methods SET
      display_name=COALESCE(?,display_name),
      description=COALESCE(?,description),
      logo_emoji=COALESCE(?,logo_emoji),
      is_active=COALESCE(?,is_active),
      requires_proof=COALESCE(?,requires_proof),
      is_automatic=COALESCE(?,is_automatic),
      instructions=COALESCE(?,instructions),
      config=?,
      sort_order=COALESCE(?,sort_order),
      updated_at=datetime('now')
    WHERE id=?
  `).bind(
    body.display_name ?? null,
    body.description ?? null,
    body.logo_emoji ?? null,
    body.is_active !== undefined ? (body.is_active ? 1 : 0) : null,
    body.requires_proof !== undefined ? (body.requires_proof ? 1 : 0) : null,
    body.is_automatic !== undefined ? (body.is_automatic ? 1 : 0) : null,
    body.instructions ?? null,
    JSON.stringify(newConfig),
    body.sort_order ?? null,
    id
  ).run()

  // Mettre à jour les frais — format array (front) ou champs directs (legacy)
  if (Array.isArray(body.fees) && body.fees.length > 0) {
    for (const fee of body.fees) {
      await c.env.DB.prepare(`
        INSERT INTO payment_fees (id, payment_method_id, fee_type, fee_percent, fee_fixed, fee_min, fee_max, apply_to)
        VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(payment_method_id, apply_to) DO UPDATE SET
          fee_type=excluded.fee_type, fee_percent=excluded.fee_percent,
          fee_fixed=excluded.fee_fixed, fee_min=excluded.fee_min,
          fee_max=excluded.fee_max, updated_at=datetime('now')
      `).bind(id, fee.fee_type || 'percent', fee.fee_percent ?? 0,
        fee.fee_fixed ?? 0, fee.fee_min ?? 0, fee.fee_max ?? 0, fee.apply_to || 'all').run()
    }
  } else if (body.fee_type !== undefined) {
    await c.env.DB.prepare(`
      INSERT INTO payment_fees (id, payment_method_id, fee_type, fee_percent, fee_fixed, fee_min, fee_max, apply_to)
      VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, 'all')
      ON CONFLICT(payment_method_id, apply_to) DO UPDATE SET
        fee_type=excluded.fee_type, fee_percent=excluded.fee_percent,
        fee_fixed=excluded.fee_fixed, fee_min=excluded.fee_min,
        fee_max=excluded.fee_max, updated_at=datetime('now')
    `).bind(id, body.fee_type || 'percent', body.fee_percent ?? 0,
      body.fee_fixed ?? 0, body.fee_min ?? 0, body.fee_max ?? 0).run()
  }

  return c.json({ success: true })
})

// ── POST /api/admin/payment/methods/:id/toggle — Activer/désactiver ───────────
paymentAdminRouter.post('/methods/:id/toggle', async (c) => {
  const id = c.req.param('id')
  const method = await c.env.DB.prepare(`SELECT is_active FROM payment_methods WHERE id=?`).bind(id).first() as any
  if (!method) return c.json({ error: 'Introuvable' }, 404)
  const newActive = method.is_active ? 0 : 1
  await c.env.DB.prepare(`UPDATE payment_methods SET is_active=?, updated_at=datetime('now') WHERE id=?`).bind(newActive, id).run()
  return c.json({ success: true, is_active: newActive === 1 })
})

// ── POST /api/admin/payment/methods — Créer un nouveau mode ──────────────────
paymentAdminRouter.post('/methods', async (c) => {
  const body = await c.req.json() as {
    category: string; provider: string; display_name: string
    description?: string; logo_emoji?: string; instructions?: string
    config?: Record<string, any>; requires_proof?: boolean; is_automatic?: boolean
  }
  if (!body.category || !body.provider || !body.display_name) {
    return c.json({ error: 'category, provider et display_name requis' }, 400)
  }
  const id = generateId()
  await c.env.DB.prepare(`
    INSERT INTO payment_methods (id, category, provider, display_name, description, logo_emoji, is_active, requires_proof, is_automatic, instructions, config, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 99)
  `).bind(
    id, body.category, body.provider, body.display_name,
    body.description || '', body.logo_emoji || '',
    body.requires_proof ? 1 : 0,
    body.is_automatic ? 1 : 0,
    body.instructions || '',
    JSON.stringify(body.config || {})
  ).run()

  // Créer les frais par défaut (0%)
  await c.env.DB.prepare(`
    INSERT INTO payment_fees (id, payment_method_id, fee_type, fee_percent, fee_fixed, fee_min, fee_max, apply_to)
    VALUES (lower(hex(randomblob(16))), ?, 'percent', 0, 0, 0, 0, 'all')
  `).bind(id).run()

  return c.json({ success: true, id })
})

// ── DELETE /api/admin/payment/methods/:id — Supprimer un mode ────────────────
paymentAdminRouter.delete('/methods/:id', async (c) => {
  const id = c.req.param('id')
  // Ne pas supprimer wallet interne
  const method = await c.env.DB.prepare(`SELECT provider FROM payment_methods WHERE id=?`).bind(id).first() as any
  if (method?.provider === 'leader_wallet') return c.json({ error: 'Le wallet interne ne peut pas être supprimé' }, 400)
  await c.env.DB.prepare(`DELETE FROM payment_fees WHERE payment_method_id=?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM payment_methods WHERE id=?`).bind(id).run()
  return c.json({ success: true })
})

// ── GET /api/admin/payment/settings — Paramètres wallet/transfert ─────────────
paymentAdminRouter.get('/settings', async (c) => {
  const keys = ['wallet_topup_min_amount', 'wallet_topup_max_amount',
    'wallet_topup_fee_active', 'wallet_topup_fee_type', 'wallet_topup_fee_value',
    'wallet_topup_delay_message',
    'wallet_transfer_min_amount', 'wallet_transfer_fee_type', 'wallet_transfer_fee_value',
    'wallet_transfer_scope', 'proof_ai_threshold', 'proof_ai_enabled']
  const rows = await c.env.DB.prepare(
    `SELECT key, value FROM system_config WHERE key IN (${keys.map(() => '?').join(',')})`
  ).bind(...keys).all()
  const settings: Record<string, string> = {}
  for (const r of (rows.results as any[])) settings[r.key] = r.value
  return c.json({ settings })
})

// ── PUT/POST /api/admin/payment/settings — Sauvegarder les paramètres ─────────
const _saveSettings = async (c: any) => {
  const body = await c.req.json() as Record<string, any>
  // Supporte { settings: {...} } ou directement { key: value, ... }
  const settingsObj: Record<string, string> = body.settings ?? body
  const allowed = ['wallet_topup_min_amount', 'wallet_topup_max_amount',
    'wallet_topup_fee_active', 'wallet_topup_fee_type', 'wallet_topup_fee_value',
    'wallet_topup_delay_message',
    'wallet_transfer_min_amount', 'wallet_transfer_fee_type', 'wallet_transfer_fee_value',
    'wallet_transfer_scope', 'proof_ai_threshold', 'proof_ai_enabled']
  for (const [k, v] of Object.entries(settingsObj)) {
    if (!allowed.includes(k)) continue
    await c.env.DB.prepare(
      `INSERT INTO system_config (key,value,updated_at) VALUES (?,?,datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`
    ).bind(k, String(v)).run()
  }
  return c.json({ success: true })
}
paymentAdminRouter.put('/settings', _saveSettings)
paymentAdminRouter.post('/settings', _saveSettings)

// ── GET /api/admin/payment/topups — Liste des recharges ──────────────────────
paymentAdminRouter.get('/topups', async (c) => {
  const status = c.req.query('status') || ''
  const page = parseInt(c.req.query('page') || '1')
  const perPage = parseInt(c.req.query('per_page') || '20')
  const offset = (page - 1) * perPage

  const where = status ? `WHERE wt.status = '${status}'` : ''
  const [rows, total] = await Promise.all([
    c.env.DB.prepare(`
      SELECT wt.*, m.unique_id, m.first_name||' '||m.last_name as member_name,
             pm.display_name as method_name, pm.logo_emoji,
             air.ai_score as ai_score_review, air.ai_verdict, air.ai_message
      FROM wallet_topups wt
      JOIN members m ON m.id = wt.member_id
      LEFT JOIN payment_methods pm ON pm.id = wt.payment_method_id
      LEFT JOIN proof_ai_reviews air ON air.reference_type='topup' AND air.reference_id=wt.id
      ${where} ORDER BY wt.created_at DESC LIMIT ? OFFSET ?
    `).bind(perPage, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM wallet_topups wt ${where}`).first() as any,
  ])
  return c.json({ topups: rows.results, total: total?.cnt || 0, page, per_page: perPage })
})

// ── POST /api/admin/payment/topups/:id/confirm — Confirmer une recharge ───────
paymentAdminRouter.post('/topups/:id/confirm', async (c) => {
  const adminId = c.get('adminId' as any)
  const topupId = c.req.param('id')
  const topup = await c.env.DB.prepare(`SELECT * FROM wallet_topups WHERE id=?`).bind(topupId).first() as any
  if (!topup) return c.json({ error: 'Introuvable' }, 404)

  if (topup.status === 'confirmed') return c.json({ error: 'Déjà confirmé' }, 400)

  // Si pas encore crédité (statut pending ou proof_submitted), créditer maintenant
  if (['pending', 'proof_submitted'].includes(topup.status)) {
    await walletOperation(c.env.DB, topup.member_id, topup.amount_requested, 'credit', 'credit_topup',
      `Recharge wallet confirmée par admin ($${topup.amount_requested})`, topupId)
  }
  // Si ai_approved, le wallet est déjà crédité — ne pas re-créditer

  await c.env.DB.prepare(`
    UPDATE wallet_topups SET status='confirmed', confirmed_by=?, confirmed_at=datetime('now'), updated_at=datetime('now') WHERE id=?
  `).bind(adminId, topupId).run()

  await createNotification(c.env.DB, topup.member_id, 'success',
    ' Recharge confirmée',
    `Votre recharge de $${topup.amount_requested} a été confirmée définitivement.`)

  return c.json({ success: true })
})

// ── POST /api/admin/payment/topups/:id/reject — Rejeter une recharge ──────────
paymentAdminRouter.post('/topups/:id/reject', async (c) => {
  const adminId = c.get('adminId' as any)
  const topupId = c.req.param('id')
  const { reason } = await c.req.json() as { reason?: string }

  const topup = await c.env.DB.prepare(`SELECT * FROM wallet_topups WHERE id=?`).bind(topupId).first() as any
  if (!topup) return c.json({ error: 'Introuvable' }, 404)
  if (['confirmed', 'rejected'].includes(topup.status)) return c.json({ error: 'Déjà traité' }, 400)

  // Si ai_approved, le wallet avait été crédité → le débiter à nouveau (rollback)
  if (topup.status === 'ai_approved') {
    await walletOperation(c.env.DB, topup.member_id, topup.amount_requested, 'debit', 'debit_topup_rollback',
      `Annulation recharge (rejetée par admin)`, topupId)
    await createNotification(c.env.DB, topup.member_id, 'warning',
      '️ Recharge annulée',
      `Votre recharge de $${topup.amount_requested} pré-validée par IA a été annulée : ${reason || 'fonds non reçus'}. Le montant a été retiré de votre wallet.`)
  } else {
    await createNotification(c.env.DB, topup.member_id, 'error',
      ' Recharge rejetée',
      `Votre demande de recharge de $${topup.amount_requested} a été rejetée : ${reason || 'preuve invalide'}.`)
  }

  await c.env.DB.prepare(`
    UPDATE wallet_topups SET status='rejected', rejected_by=?, rejection_reason=?, updated_at=datetime('now') WHERE id=?
  `).bind(adminId, reason || null, topupId).run()

  return c.json({ success: true })
})

// ── GET /api/admin/payment/ai-reviews — Tableau de bord IA ───────────────────
paymentAdminRouter.get('/ai-reviews', async (c) => {
  const status = c.req.query('status') || 'ai_approved' // ai_approved = pré-validés par IA
  const page = parseInt(c.req.query('page') || '1')
  const perPage = parseInt(c.req.query('per_page') || '20')

  // Commandes pré-validées par IA en attente de confirmation admin
  const orders = await c.env.DB.prepare(`
    SELECT po.*,
           m.unique_id, m.first_name||' '||m.last_name as member_name,
           p.name as package_name,
           air.ai_score, air.ai_verdict, air.ai_message, air.ai_amount, air.ai_date, air.reviewed_at
    FROM package_orders po
    JOIN members m ON m.id = po.member_id
    JOIN packages p ON p.id = po.package_id
    LEFT JOIN proof_ai_reviews air ON air.reference_type='order' AND air.reference_id=po.id
    WHERE po.pre_validated_by='ai' AND po.status='validated'
    ORDER BY po.pre_validated_at DESC
    LIMIT ? OFFSET ?
  `).bind(perPage, (page - 1) * perPage).all()

  // Topups pré-validés par IA
  const topups = await c.env.DB.prepare(`
    SELECT wt.*,
           m.unique_id, m.first_name||' '||m.last_name as member_name,
           pm.display_name as method_name,
           air.ai_score, air.ai_verdict, air.ai_message, air.ai_amount, air.ai_date
    FROM wallet_topups wt
    JOIN members m ON m.id = wt.member_id
    LEFT JOIN payment_methods pm ON pm.id = wt.payment_method_id
    LEFT JOIN proof_ai_reviews air ON air.reference_type='topup' AND air.reference_id=wt.id
    WHERE wt.status = 'ai_approved'
    ORDER BY wt.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(perPage, (page - 1) * perPage).all()

  // Stats
  const stats = await c.env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM package_orders WHERE pre_validated_by='ai' AND status='validated') as ai_orders,
      (SELECT COUNT(*) FROM wallet_topups WHERE status='ai_approved') as ai_topups,
      (SELECT COUNT(*) FROM proof_ai_reviews WHERE ai_verdict='suspicious') as suspicious
  `).first() as any

  return c.json({ orders: orders.results, topups: topups.results, stats })
})

// ── POST /api/admin/payment/orders/:id/rollback — Rollback complet ────────────
paymentAdminRouter.post('/orders/:id/rollback', async (c) => {
  const adminId = c.get('adminId' as any)
  const orderId = c.req.param('id')
  const { reason } = await c.req.json() as { reason?: string }

  try {
    await performOrderRollback(c.env.DB, orderId, adminId, reason || 'Rejeté par admin')
    return c.json({ success: true, message: 'Rollback effectué : BV retirés, commissions annulées, rangs recalculés.' })
  } catch (e: any) {
    return c.json({ error: e.message || 'Erreur lors du rollback' }, 500)
  }
})

// ── ROUTES LEGACY (Stripe / PayPal / CoinPayments) ──────────────────────────

/**
 * GET /admin/payment/legacy
 * Retourne les 3 PSP legacy avec leur statut enabled + frais configurés
 */
paymentAdminRouter.get('/legacy', async (c) => {
  const GATEWAYS = ['stripe_api', 'paypal_api', 'coinpayments_api']
  const rows = await c.env.DB.prepare(
    `SELECT gateway, key, value FROM payment_gateway_config
     WHERE gateway IN ('stripe_api','paypal_api','coinpayments_api')
     ORDER BY gateway, key`
  ).all()

  // Regrouper par gateway
  const byGateway: Record<string, Record<string, string>> = {}
  for (const gw of GATEWAYS) byGateway[gw] = {}
  for (const r of (rows.results as any[])) {
    if (byGateway[r.gateway]) byGateway[r.gateway][r.key] = r.value
  }

  // Construire le tableau de réponse (toujours les 3, même si non configurés)
  const gateways = GATEWAYS
    .map(gw => ({
      gateway: gw,
      enabled: byGateway[gw].enabled ?? 'false',
      fee_type: byGateway[gw].fee_type ?? 'percent',
      fee_percent: byGateway[gw].fee_percent ?? '0',
      fee_fixed: byGateway[gw].fee_fixed ?? '0',
      // Clés API (masquées partiellement côté backend pour sécurité)
      public_key: byGateway[gw].public_key ?? '',
      secret_key: byGateway[gw].secret_key ? '••••••••' : '',
      webhook_secret: byGateway[gw].webhook_secret ? '••••••••' : '',
    }))

  return c.json({ gateways })
})

/**
 * PUT /admin/payment/legacy/:gateway
 * Met à jour enabled et/ou les frais d'un PSP legacy
 * Body: { enabled?: 'true'|'false', fee_type?: string, fee_percent?: string, fee_fixed?: string }
 */
paymentAdminRouter.put('/legacy/:gateway', async (c) => {
  const gateway = c.req.param('gateway')
  const ALLOWED = ['stripe_api', 'paypal_api', 'coinpayments_api']
  if (!ALLOWED.includes(gateway)) {
    return c.json({ error: 'Gateway non reconnue' }, 400)
  }

  const body = await c.req.json() as Record<string, string>
  const allowed_keys = ['enabled', 'fee_type', 'fee_percent', 'fee_fixed', 'public_key', 'secret_key', 'webhook_secret']
  const updates = Object.entries(body).filter(([k]) => allowed_keys.includes(k))

  if (!updates.length) return c.json({ error: 'Aucun champ valide fourni' }, 400)

  for (const [key, value] of updates) {
    await c.env.DB.prepare(
      `INSERT INTO payment_gateway_config (id, gateway, key, value)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?)
       ON CONFLICT(gateway, key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`
    ).bind(gateway, key, String(value)).run()
  }

  return c.json({ success: true, gateway, updated: updates.map(([k]) => k) })
})

/**
 * POST /admin/payment/legacy/test
 * Teste la connexion à un PSP legacy (actuellement Stripe uniquement)
 * Body: { gateway: 'stripe_api', public_key: string, secret_key: string }
 */
paymentAdminRouter.post('/legacy/test', async (c) => {
  const { gateway, public_key, secret_key } = await c.req.json() as any
  if (gateway !== 'stripe_api') {
    return c.json({ ok: false, error: 'Test non disponible pour ce gateway' }, 400)
  }
  if (!public_key || !secret_key) {
    return c.json({ ok: false, error: 'Clés manquantes' }, 400)
  }
  // Vérification légère : appel Stripe /v1/balance avec la secret key
  try {
    const resp = await fetch('https://api.stripe.com/v1/balance', {
      headers: {
        'Authorization': `Bearer ${secret_key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    })
    const data = await resp.json() as any
    if (resp.ok && data.object === 'balance') {
      return c.json({ ok: true, message: 'Connexion Stripe validée' })
    }
    return c.json({ ok: false, error: data.error?.message || 'Clé invalide ou accès refusé' })
  } catch (err: any) {
    return c.json({ ok: false, error: 'Impossible de joindre Stripe: ' + err.message })
  }
})

// ── FIN ROUTES LEGACY ────────────────────────────────────────────────────────

/** Rollback complet d'une commande validée (annulation BV, commissions, rangs) */
export async function performOrderRollback(
  db: D1Database,
  orderId: string,
  triggeredBy: string,
  reason: string
): Promise<void> {
  const order = await db.prepare(`SELECT * FROM package_orders WHERE id=?`).bind(orderId).first() as any
  if (!order) throw new Error('Commande introuvable')

  const rollbackId = generateId()
  const affectedMembers: string[] = []
  let bvRemoved = 0
  const commissionIds: string[] = []

  // 1. Retirer les BV du membre + sa chaîne upline
  const bvLogs = await db.prepare(
    `SELECT * FROM bv_logs WHERE package_order_id=?`
  ).bind(orderId).all()

  for (const log of (bvLogs.results as any[])) {
    // Décrémenter les BV du membre affecté
    await db.prepare(`
      UPDATE members SET
        left_bv_total   = MAX(0, left_bv_total   - CASE WHEN ? = 'left'  THEN ? ELSE 0 END),
        right_bv_total  = MAX(0, right_bv_total  - CASE WHEN ? = 'right' THEN ? ELSE 0 END),
        left_bv_monthly = MAX(0, left_bv_monthly - CASE WHEN ? = 'left'  THEN ? ELSE 0 END),
        right_bv_monthly= MAX(0, right_bv_monthly- CASE WHEN ? = 'right' THEN ? ELSE 0 END),
        personal_bv_monthly= MAX(0, personal_bv_monthly - ?),
        updated_at=datetime('now')
      WHERE id=?
    `).bind(
      log.side, log.bv_amount, log.side, log.bv_amount,
      log.side, log.bv_amount, log.side, log.bv_amount,
      log.bv_amount, log.member_id
    ).run()
    bvRemoved += log.bv_amount
    if (!affectedMembers.includes(log.member_id)) affectedMembers.push(log.member_id)
  }

  // Marquer les BV logs comme annulés
  await db.prepare(`UPDATE bv_logs SET notes='ROLLBACK:'||? WHERE package_order_id=?`).bind(reason, orderId).run()

  // 2. Annuler les commissions liées
  const commissions = await db.prepare(
    `SELECT * FROM commissions WHERE status IN ('pending','approved','paid') AND description LIKE ?`
  ).bind(`%${orderId.substring(0, 8)}%`).all()

  for (const comm of (commissions.results as any[])) {
    commissionIds.push(comm.id)
    const negAmount = -Math.abs(comm.amount)

    // Mettre la commission en négatif dans wallet_transactions
    const walletBefore = await db.prepare(`SELECT balance FROM wallets WHERE member_id=?`).bind(comm.member_id).first() as any
    const balBefore = walletBefore?.balance ?? 0

    // Débiter le wallet (peut devenir négatif)
    await db.prepare(`UPDATE members SET wallet_balance=wallet_balance-?, updated_at=datetime('now') WHERE id=?`).bind(Math.abs(comm.amount), comm.member_id).run()
    await db.prepare(`UPDATE wallets SET balance=balance-?, updated_at=datetime('now') WHERE member_id=?`).bind(Math.abs(comm.amount), comm.member_id).run()

    // Transaction en négatif visible dans le backoffice
    await db.prepare(`
      INSERT INTO wallet_transactions (id, member_id, wallet_type, transaction_type, amount, balance_before, balance_after, description, reference_id, created_at)
      VALUES (lower(hex(randomblob(16))), ?, 'principal', 'debit_commission_rollback', ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      comm.member_id, negAmount, balBefore, balBefore + negAmount,
      `Annulation commission — ${reason}`, orderId
    ).run()

    // Marquer la commission comme cancelled
    await db.prepare(`UPDATE commissions SET status='cancelled' WHERE id=?`).bind(comm.id).run()

    if (!affectedMembers.includes(comm.member_id)) affectedMembers.push(comm.member_id)
  }

  // 3. Recalculer les rangs pour tous les membres affectés
  const ranksAffected: Array<{ memberId: string; oldRank: string; newRank: string }> = []
  for (const affectedMemberId of affectedMembers) {
    const memberData = await db.prepare(
      `SELECT id, current_rank, left_bv_total, right_bv_total, left_bv_monthly, right_bv_monthly FROM members WHERE id=?`
    ).bind(affectedMemberId).first() as any
    if (!memberData) continue

    const oldRank = memberData.current_rank
    // Recalculer le rang depuis la config
    const newRank = await recalculateRank(db, affectedMemberId)

    if (newRank !== oldRank) {
      await db.prepare(`UPDATE members SET current_rank=?, updated_at=datetime('now') WHERE id=?`).bind(newRank, affectedMemberId).run()
      ranksAffected.push({ memberId: affectedMemberId, oldRank, newRank })

      // Notification de downgrade
      if (getRankIndex(newRank) < getRankIndex(oldRank)) {
        await createNotification(db, affectedMemberId, 'warning',
          '️ Changement de rang',
          `Suite à l'annulation d'une commande, votre rang a été recalculé : ${oldRank} → ${newRank}. Contactez votre upline pour plus d'informations.`)
      }
    }
  }

  // 4. Annuler la commande
  await db.prepare(`
    UPDATE package_orders SET status='rejected', rejection_reason=?, validated_by=?, updated_at=datetime('now') WHERE id=?
  `).bind(`ROLLBACK: ${reason}`, triggeredBy, orderId).run()

  // 5. Enregistrer le rollback
  await db.prepare(`
    INSERT INTO payment_rollbacks (id, reference_type, reference_id, member_id, triggered_by, reason, bv_removed, commissions_reversed, ranks_affected, wallet_debited, details)
    VALUES (?, 'order', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    rollbackId, orderId, order.member_id, triggeredBy, reason,
    bvRemoved,
    JSON.stringify(commissionIds),
    JSON.stringify(ranksAffected),
    commissions.results.reduce((sum: number, c: any) => sum + Math.abs(c.amount), 0),
    JSON.stringify({ affected_members: affectedMembers, bv_logs: bvLogs.results.length })
  ).run()

  // Notifier le membre principal
  await createNotification(db, order.member_id, 'error',
    ' Commande annulée — Rollback complet',
    `Votre commande a été annulée (${reason}). BV retirés, commissions annulées. Contactez l'administration si vous pensez qu'il s'agit d'une erreur.`)
}

/** Recalcule le rang d'un membre basé sur ses BV actuels */
async function recalculateRank(db: D1Database, memberId: string): Promise<string> {
  const member = await db.prepare(
    `SELECT left_bv_total, right_bv_total, left_bv_monthly, right_bv_monthly FROM members WHERE id=?`
  ).bind(memberId).first() as any
  if (!member) return 'none'

  const rankConfigs = await db.prepare(
    `SELECT rank_name, required_bv_left, required_bv_right FROM rank_config ORDER BY required_bv_left DESC`
  ).all()

  let newRank = 'none'
  for (const rc of (rankConfigs.results as any[])) {
    if (member.left_bv_total >= rc.required_bv_left && member.right_bv_total >= rc.required_bv_right) {
      newRank = rc.rank_name
      break
    }
  }
  return newRank
}
