// ============================================================
// LEADER Network — Routes Broker Triomarkets
// Flow : Membre choisit package → redirection Triomarkets →
//        webhook On Registration → webhook On Deposit → activation BV
// ============================================================
import { Hono } from 'hono'
import { verifyJWT, generateId } from '../lib/auth.js'
import { activateAndReward, createNotification } from '../lib/mlm.js'

// ── Utilitaire interne : crée un package_order validated + appelle activateAndReward ──
// activateAndReward attend un orderId (pas un memberId) — il faut créer la commande d'abord.
// payment_mode='broker' → pas de proof ni de montant à valider manuellement.
async function activateBrokerPackage(
  db: D1Database,
  memberId: string,
  packageId: string,
  source: string   // pour les logs — ex: 'broker_triomarkets' | 'broker_triomarkets_admin'
): Promise<{ success: boolean; orderId: string }> {
  const pkg = await db.prepare(
    `SELECT id, name, price_usd, bv_value, type, pricing_type, payment_mode, duration_years, includes_license
     FROM packages WHERE id = ? AND is_active = 1 AND deleted_at IS NULL`
  ).bind(packageId).first() as any
  if (!pkg) throw new Error(`Package introuvable: ${packageId}`)

  // Vérifier si le membre a déjà un package_order validated+activated pour ce package (idempotence)
  const existingOrder = await db.prepare(
    `SELECT id FROM package_orders
     WHERE member_id = ? AND package_id = ? AND status = 'validated' AND activation_done = 1
     LIMIT 1`
  ).bind(memberId, packageId).first() as any
  if (existingOrder) {
    console.log(`[activateBrokerPackage] Déjà activé (idempotent) member=${memberId} pkg=${packageId}`)
    return { success: true, orderId: existingOrder.id }
  }

  // Vérifier si le membre a déjà un package actif → détecter upgrade
  const currentPkg = await db.prepare(
    `SELECT po.package_id, p.price_usd as current_price, p.bv_value as current_bv
     FROM package_orders po
     JOIN packages p ON p.id = po.package_id
     WHERE po.member_id = ? AND po.status = 'validated' AND po.activation_done = 1
       AND p.type != 'licence'
     ORDER BY po.created_at DESC LIMIT 1`
  ).bind(memberId).first() as any

  const isUpgrade = !!(currentPkg && pkg.price_usd > currentPkg.current_price)
  const diffBv = isUpgrade ? Math.max(0, (pkg.bv_value || 0) - (currentPkg.current_bv || 0)) : null
  const productType = isUpgrade ? 'upgrade' : 'package'

  // Créer le bon de commande en statut 'validated' (flow broker = pas de validation manuelle)
  const orderId = generateId()
  await db.prepare(
    `INSERT INTO package_orders
       (id, member_id, package_id, price_usd, amount_usd, bv_value,
        status, payment_method, product_type,
        upgrade_from_package_id, upgrade_diff_bv,
        admin_fee_amount, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?,
             'validated', ?, ?,
             ?, ?,
             0, datetime('now'), datetime('now'))`
  ).bind(
    orderId, memberId, packageId,
    pkg.price_usd, pkg.price_usd, pkg.bv_value,
    source,           // payment_method
    productType,
    isUpgrade ? currentPkg.package_id : null,
    diffBv
  ).run()

  // Appeler activateAndReward avec le bon orderId
  const result = await activateAndReward(db, orderId)
  console.log(`[activateBrokerPackage] ${source} member=${memberId} pkg=${packageId} order=${orderId} → ${result.message}`)
  return { success: result.success, orderId }
}

type Bindings = { DB: D1Database; JWT_SECRET: string }
type Variables = { memberId: string }

const broker = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ── Auth middleware membre (pattern standard du projet) ───────────────────────
const memberAuth = async (c: any, next: any) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload?.sub) return c.json({ error: 'Token invalide' }, 401)
  c.set('memberId', payload.sub)
  await next()
}

// ── GET /api/broker/config — Config broker visible côté membre ────────────────
broker.get('/config', memberAuth, async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT key, value FROM system_config WHERE key LIKE 'broker_triomarkets_%'`
  ).all()
  const cfg: Record<string, string> = {}
  for (const r of (rows.results || []) as any[]) {
    cfg[r.key.replace('broker_triomarkets_', '')] = r.value
  }
  return c.json({
    enabled: cfg.enabled === '1' || cfg.enabled === 'true',
    affiliate_url: cfg.affiliate_url || '',
  })
})

// ── POST /api/broker/redirect — Enregistrer la redirection vers Triomarkets ──
broker.post('/redirect', memberAuth, async (c) => {
  const memberId = c.get('memberId')
  const { package_id } = await c.req.json()

  if (!package_id) return c.json({ error: 'package_id requis' }, 400)

  // Vérifier que le package existe et est bien un package broker
  const pkg = await c.env.DB.prepare(
    `SELECT id, name, price_usd, bv_value, payment_mode, is_active, deleted_at
     FROM packages WHERE id=?`
  ).bind(package_id).first() as any
  if (!pkg || !pkg.is_active || pkg.deleted_at)
    return c.json({ error: 'Package introuvable' }, 404)
  if (pkg.payment_mode !== 'broker')
    return c.json({ error: 'Ce package n\'utilise pas le flow broker' }, 400)

  // Vérifier la config broker
  const rows = await c.env.DB.prepare(
    `SELECT key, value FROM system_config WHERE key LIKE 'broker_triomarkets_%'`
  ).all()
  const cfg: Record<string, string> = {}
  for (const r of (rows.results || []) as any[]) {
    cfg[r.key.replace('broker_triomarkets_', '')] = r.value
  }
  if (cfg.enabled !== '1' && cfg.enabled !== 'true')
    return c.json({ error: 'L\'intégration broker est désactivée' }, 403)

  // Récupérer infos membre
  const member = await c.env.DB.prepare(
    `SELECT id, first_name, last_name, email FROM members WHERE id=?`
  ).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  // Créer l'enregistrement broker (si pas déjà pending/actif)
  const existing = await c.env.DB.prepare(
    `SELECT id, status FROM broker_registrations
     WHERE member_id=? AND package_id=? AND status NOT IN ('failed','cancelled')
     ORDER BY created_at DESC LIMIT 1`
  ).bind(memberId, package_id).first() as any
  if (existing && existing.status === 'activated') {
    return c.json({ error: 'Ce package est déjà activé pour ce membre' }, 409)
  }

  // Créer nouveau enregistrement si pas déjà en cours
  let regId = existing?.id
  if (!existing) {
    regId = `breg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await c.env.DB.prepare(
      `INSERT INTO broker_registrations (id, member_id, package_id, broker, status, created_at, updated_at)
       VALUES (?, ?, ?, 'triomarkets', 'pending', datetime('now'), datetime('now'))`
    ).bind(regId, memberId, package_id).run()
  }

  // Construire URL de redirection avec click_id = regId pour traçabilité
  const baseUrl = cfg.affiliate_url || 'https://my.triomarkets.com/live_signup'
  const sep = baseUrl.includes('?') ? '&' : '?'
  const redirectUrl = `${baseUrl}${sep}click_id=${regId}&utm_source=leader_network&utm_medium=referral`

  return c.json({ url: redirectUrl, registration_id: regId })
})

// ── GET /api/broker/status — Statut des inscriptions broker du membre ─────────
broker.get('/status', memberAuth, async (c) => {
  const memberId = c.get('memberId')
  const rows = await c.env.DB.prepare(
    `SELECT br.id, br.broker, br.package_id, br.status, br.amount, br.currency,
            br.broker_customer_no, br.is_ftd, br.created_at, br.updated_at,
            p.name as package_name, p.price_usd, p.bv_value
     FROM broker_registrations br
     JOIN packages p ON p.id = br.package_id
     WHERE br.member_id = ?
     ORDER BY br.created_at DESC`
  ).bind(memberId).all()
  return c.json({ registrations: rows.results || [] })
})

// ── GET /api/broker/triomarkets/webhook — On Deposit (GET querystring) ────────
// URL configurée dans Triomarkets : /api/broker/triomarkets/webhook?click_id={{click_id}}&...
broker.get('/triomarkets/webhook', async (c) => {
  const click_id    = c.req.query('click_id') || ''
  const customer_no = c.req.query('customer_no') || ''
  const amount      = parseFloat(c.req.query('amount') || '0')
  const currency    = c.req.query('currency') || 'USD'
  const is_ftd      = c.req.query('is_ftd') === '1' ? 1 : 0
  const tx_id       = c.req.query('tx_id') || ''

  if (!click_id) return c.text('click_id manquant', 400)

  try {
    // ── 1. Retrouver l'inscription via click_id ──────────────────────────────
    const reg = await c.env.DB.prepare(
      `SELECT br.*, m.id as m_id, m.email as m_email, m.first_name, m.last_name
       FROM broker_registrations br
       JOIN members m ON m.id = br.member_id
       WHERE br.id = ? AND br.broker = 'triomarkets'`
    ).bind(click_id).first() as any

    if (!reg) {
      console.error(`[broker webhook] Inscription introuvable pour click_id=${click_id}`)
      return c.text('ok')
    }

    if (reg.status === 'activated') {
      return c.text('ok') // Idempotent — déjà traité
    }

    // ── 2. Enregistrer le dépôt reçu ────────────────────────────────────────
    await c.env.DB.prepare(
      `UPDATE broker_registrations
       SET broker_customer_no=?, amount=?, currency=?, tx_id=?, is_ftd=?,
           updated_at=datetime('now')
       WHERE id=?`
    ).bind(customer_no, amount, currency, tx_id, is_ftd, click_id).run()

    // ── 3. Déterminer le package à activer selon le montant déposé ───────────
    // Règle : package le plus cher dont price_usd <= montant déposé
    // Fonctionne avec TOUS les packages broker présents et futurs (pas hardcodé)
    const bestPkg = await c.env.DB.prepare(
      `SELECT p.id, p.name, p.price_usd, p.bv_value
       FROM packages p
       JOIN package_categories cat ON cat.id = p.category_id
       WHERE p.payment_mode = 'broker'
         AND p.is_active = 1
         AND p.deleted_at IS NULL
         AND p.price_usd <= ?
       ORDER BY p.price_usd DESC
       LIMIT 1`
    ).bind(amount).first() as any

    // ── 4a. Aucun package ne correspond — dépôt insuffisant ──────────────────
    if (!bestPkg) {
      await c.env.DB.prepare(
        `UPDATE broker_registrations
         SET status='deposited_insufficient', updated_at=datetime('now')
         WHERE id=?`
      ).bind(click_id).run()

      // Notification membre
      await createNotification(
        c.env.DB, reg.m_id,
        '⚠️ Dépôt insuffisant chez Triomarkets',
        `Votre dépôt de ${amount} ${currency} ne correspond à aucun package disponible (minimum 600$). Un administrateur va examiner votre dossier.`,
        'warning'
      )

      // Notification admin (via table notifications avec member_id='admin')
      await c.env.DB.prepare(
        `INSERT INTO notifications (id, member_id, title, message, type, is_read, created_at)
         VALUES (?, 'admin', ?, ?, 'warning', 0, datetime('now'))`
      ).bind(
        `notif-admin-${Date.now()}`,
        '🏦 Dépôt broker insuffisant — action requise',
        `${reg.first_name} ${reg.last_name} a déposé ${amount} ${currency} chez Triomarkets (click_id: ${click_id}). Montant insuffisant pour activer un package. Assignez manuellement un package depuis l'espace admin.`
      ).run()

      console.log(`[broker webhook] Dépôt insuffisant: member=${reg.m_id} amount=${amount} ${currency}`)
      return c.text('ok')
    }

    // ── 4b. Package trouvé — activation automatique ──────────────────────────
    // Mettre à jour l'inscription avec le package réellement activé
    await c.env.DB.prepare(
      `UPDATE broker_registrations
       SET status='deposited', package_id=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(bestPkg.id, click_id).run()

    // Activer et déployer les BV (crée un package_order validated + appelle activateAndReward)
    await activateBrokerPackage(c.env.DB, reg.m_id, bestPkg.id, 'broker_triomarkets')

    // Marquer comme activé
    await c.env.DB.prepare(
      `UPDATE broker_registrations
       SET status='activated', updated_at=datetime('now')
       WHERE id=?`
    ).bind(click_id).run()

    // Notification membre
    await createNotification(
      c.env.DB, reg.m_id,
      '🏦 Package Broker activé !',
      `Votre dépôt de ${amount} ${currency} a activé le package ${bestPkg.name} — ${Number(bestPkg.bv_value).toLocaleString()} BV déployés.`,
      'success'
    )

    console.log(`[broker webhook deposit] Activé: member=${reg.m_id} pkg=${bestPkg.id} (${bestPkg.price_usd}$) pour dépôt=${amount} ${currency}`)
    return c.text('ok')

  } catch (err: any) {
    console.error('[broker webhook deposit error]', err.message)
    return c.text('error', 500)
  }
})

// ── GET /api/broker/triomarkets/webhook-registration — On Registration ────────
// URL configurée dans Triomarkets : /api/broker/triomarkets/webhook-registration?click_id={{click_id}}&...
broker.get('/triomarkets/webhook-registration', async (c) => {
  const click_id    = c.req.query('click_id') || ''
  const customer_no = c.req.query('customer_no') || ''
  const fname       = c.req.query('fname') || ''
  const lname       = c.req.query('lname') || ''
  const email       = c.req.query('email') || ''

  if (!click_id) return c.text('click_id manquant', 400)

  try {
    const reg = await c.env.DB.prepare(
      `SELECT id, status FROM broker_registrations WHERE id=? AND broker='triomarkets'`
    ).bind(click_id).first() as any

    if (!reg) return c.text('ok')
    if (reg.status !== 'pending') return c.text('ok') // Déjà avancé

    await c.env.DB.prepare(
      `UPDATE broker_registrations
       SET status='registered', broker_customer_no=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(customer_no, click_id).run()

    console.log(`[broker webhook registration] Inscrit: click_id=${click_id} customer_no=${customer_no}`)
    return c.text('ok')

  } catch (err: any) {
    console.error('[broker webhook registration error]', err.message)
    return c.text('error', 500)
  }
})

// ── Routes Admin Broker ───────────────────────────────────────────────────────
// Routeur séparé monté sur /api/admin/broker dans index.tsx
const brokerAdmin = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/admin/broker/config — Lire la config broker
brokerAdmin.get('/config', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT key, value FROM system_config WHERE key LIKE 'broker_triomarkets_%'`
  ).all()
  const cfg: Record<string, string> = {}
  for (const r of (rows.results || []) as any[]) {
    cfg[r.key.replace('broker_triomarkets_', '')] = r.value
  }
  return c.json({ config: cfg })
})

// PUT /api/admin/broker/config — Sauvegarder la config broker
brokerAdmin.put('/config', async (c) => {
  const body = await c.req.json() as Record<string, string>
  const allowed = ['enabled', 'root_url', 'public_key', 'secret_key', 'user', 'affiliate_url', 'webhook_secret']
  for (const key of allowed) {
    if (body[key] !== undefined) {
      await c.env.DB.prepare(
        `INSERT INTO system_config (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value`
      ).bind(`broker_triomarkets_${key}`, body[key]).run()
    }
  }
  return c.json({ success: true })
})

// GET /api/admin/broker/registrations — Liste des inscriptions broker
brokerAdmin.get('/registrations', async (c) => {
  const page    = parseInt(c.req.query('page') || '1')
  const perPage = parseInt(c.req.query('per_page') || '25')
  const status  = c.req.query('status') || ''
  const offset  = (page - 1) * perPage

  let where = "WHERE br.broker='triomarkets'"
  const params: any[] = []
  if (status) { where += ' AND br.status=?'; params.push(status) }

  const total = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM broker_registrations br ${where}`
  ).bind(...params).first() as any

  const rows = await c.env.DB.prepare(
    `SELECT br.*, m.first_name, m.last_name, m.email, m.unique_id,
            p.name as package_name, p.price_usd, p.bv_value
     FROM broker_registrations br
     JOIN members m ON m.id = br.member_id
     JOIN packages p ON p.id = br.package_id
     ${where}
     ORDER BY br.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...params, perPage, offset).all()

  return c.json({
    registrations: rows.results || [],
    total: (total as any)?.cnt || 0,
    page,
    per_page: perPage
  })
})

// GET /api/admin/broker/stats — Statistiques broker
brokerAdmin.get('/stats', async (c) => {
  const [total, pending, registered, deposited, activated, revenue, bvDeployed] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM broker_registrations WHERE broker='triomarkets'`).first(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM broker_registrations WHERE broker='triomarkets' AND status='pending'`).first(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM broker_registrations WHERE broker='triomarkets' AND status='registered'`).first(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM broker_registrations WHERE broker='triomarkets' AND status='deposited'`).first(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM broker_registrations WHERE broker='triomarkets' AND status='activated'`).first(),
    c.env.DB.prepare(`SELECT SUM(amount) as total FROM broker_registrations WHERE broker='triomarkets' AND status='activated'`).first(),
    c.env.DB.prepare(`SELECT SUM(p.bv_value) as total FROM broker_registrations br JOIN packages p ON p.id=br.package_id WHERE br.broker='triomarkets' AND br.status='activated'`).first(),
  ])

  // Compter aussi les dépôts insuffisants
  const insufficient = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM broker_registrations WHERE broker='triomarkets' AND status='deposited_insufficient'`
  ).first() as any

  return c.json({
    total:        (total as any)?.cnt || 0,
    pending:      (pending as any)?.cnt || 0,
    registered:   (registered as any)?.cnt || 0,
    deposited:    (deposited as any)?.cnt || 0,
    activated:    (activated as any)?.cnt || 0,
    insufficient: (insufficient as any)?.cnt || 0,
    revenue:      (revenue as any)?.total || 0,
    bv_deployed:  (bvDeployed as any)?.total || 0,
  })
})

// ── PATCH /api/admin/broker/registrations/:id/assign-package ─────────────────
// Permet à l'admin d'assigner manuellement un package (dépôt insuffisant ou correction)
brokerAdmin.patch('/registrations/:id/assign-package', async (c) => {
  const regId     = c.req.param('id')
  const { package_id } = await c.req.json() as { package_id: string }

  if (!package_id) return c.json({ error: 'package_id requis' }, 400)

  // Vérifier que l'inscription existe
  const reg = await c.env.DB.prepare(
    `SELECT br.*, m.id as m_id, m.first_name, m.last_name
     FROM broker_registrations br
     JOIN members m ON m.id = br.member_id
     WHERE br.id = ?`
  ).bind(regId).first() as any
  if (!reg) return c.json({ error: 'Inscription introuvable' }, 404)

  // Vérifier que le package cible existe et est broker
  const pkg = await c.env.DB.prepare(
    `SELECT id, name, bv_value, price_usd FROM packages WHERE id=? AND is_active=1 AND deleted_at IS NULL`
  ).bind(package_id).first() as any
  if (!pkg) return c.json({ error: 'Package introuvable' }, 404)

  // Si déjà activé → désactiver l'ancien package avant de ré-activer
  // Mettre à jour le package de la registration avant activation
  await c.env.DB.prepare(
    `UPDATE broker_registrations
     SET package_id=?, status='deposited', updated_at=datetime('now')
     WHERE id=?`
  ).bind(package_id, regId).run()

  try {
    // Créer un package_order validated + appeler activateAndReward correctement
    await activateBrokerPackage(c.env.DB, reg.m_id, package_id, 'broker_triomarkets_admin')
  } catch (err: any) {
    console.error(`[broker admin assign ERROR] member=${reg.m_id} pkg=${package_id}:`, err?.message || err)
    // Remettre le statut de la registration
    await c.env.DB.prepare(
      `UPDATE broker_registrations SET package_id=?, status=?, updated_at=datetime('now') WHERE id=?`
    ).bind(reg.package_id, reg.status, regId).run()
    return c.json({ error: `Erreur activation: ${err?.message || 'inconnue'}` }, 500)
  }

  await c.env.DB.prepare(
    `UPDATE broker_registrations
     SET status='activated', updated_at=datetime('now')
     WHERE id=?`
  ).bind(regId).run()

  // Notifier le membre
  await createNotification(
    c.env.DB, reg.m_id,
    '🏦 Package Broker assigné par l\'administrateur',
    `Votre package ${pkg.name} a été activé manuellement — ${Number(pkg.bv_value).toLocaleString()} BV déployés.`,
    'success'
  )

  console.log(`[broker admin assign] member=${reg.m_id} pkg=${package_id} par admin`)
  return c.json({ success: true, package_id, package_name: pkg.name })
})

// ── PATCH /api/admin/broker/registrations/:id/cancel ─────────────────────────
// Annule une inscription broker avec rollback COMPLET : BV + commissions + wallet
// Si le membre était activé → tous les effets financiers sont annulés proprement
brokerAdmin.patch('/registrations/:id/cancel', async (c) => {
  const regId = c.req.param('id')
  const db = c.env.DB

  const reg = await db.prepare(
    `SELECT br.*, m.id as m_id, m.first_name, m.last_name, m.sponsor_id
     FROM broker_registrations br
     JOIN members m ON m.id = br.member_id
     WHERE br.id = ?`
  ).bind(regId).first() as any
  if (!reg) return c.json({ error: 'Inscription introuvable' }, 404)
  if (reg.status === 'cancelled') return c.json({ error: 'Inscription déjà annulée' }, 409)

  const memberId     = reg.m_id
  const previousStatus = reg.status
  let rollbackSummary = { bv_reversed: 0, commissions_cancelled: 0, wallet_cancelled: 0 }

  // ── 1. Trouver le package_order broker lié à cette inscription ──────────────
  // On cherche la commande créée par activateBrokerPackage (payment_method contient 'broker_triomarkets')
  const order = await db.prepare(
    `SELECT id, bv_value, package_id, product_type, upgrade_from_package_id, upgrade_diff_bv
     FROM package_orders
     WHERE member_id = ? AND package_id = ?
       AND payment_method LIKE 'broker_triomarkets%'
       AND status = 'validated' AND activation_done = 1
     ORDER BY created_at DESC LIMIT 1`
  ).bind(memberId, reg.package_id).first() as any

  if (order) {
    const orderId = order.id
    // BV effectivement propagés = upgrade_diff_bv si upgrade, sinon bv_value complet
    const bvAmount = (order.product_type === 'upgrade' && order.upgrade_diff_bv != null)
      ? Math.max(0, order.upgrade_diff_bv)
      : (order.bv_value || 0)

    // ── 2. Récupérer tous les bv_logs liés à cet order ───────────────────────
    // Inclut : personal_purchase (acheteur) + propagated (ancêtres) + fast_start_contribution (sponsor)
    const bvLogs = await db.prepare(
      `SELECT id, member_id, bv_type, bv_amount
       FROM bv_logs WHERE package_order_id = ?`
    ).bind(orderId).all()
    const logs = (bvLogs.results || []) as any[]

    // ── 3. Soustraire les BV de chaque membre concerné ───────────────────────
    // personal_purchase → soustraire personal_bv_monthly + personal_bv_total de l'acheteur
    // propagated → soustraire left/right bv chez les ancêtres
    // fast_start_contribution → soustraire fast_start_bv chez le sponsor
    const bvStmts: D1PreparedStatement[] = []
    for (const log of logs) {
      if (log.bv_type === 'personal_purchase') {
        bvStmts.push(db.prepare(
          `UPDATE members SET
             personal_bv_monthly = MAX(0, personal_bv_monthly - ?),
             personal_bv_total   = MAX(0, personal_bv_total - ?),
             updated_at = datetime('now')
           WHERE id = ?`
        ).bind(log.bv_amount, log.bv_amount, log.member_id))
        rollbackSummary.bv_reversed += log.bv_amount

      } else if (log.bv_type === 'propagated') {
        // La position (L/R) est stockée dans members.binary_position de l'enfant
        // On cherche le premier enfant de log.member_id dont le source_member_id = memberId
        // → le membre acheteur est dans l'un des deux sous-arbres
        // Approche sûre : lire binary_position du membre acheteur (memberId) dans l'arbre
        const posRow = await db.prepare(
          `SELECT binary_position FROM members WHERE id = ? LIMIT 1`
        ).bind(memberId).first() as any
        const side = posRow?.binary_position || 'L'

        if (side === 'L') {
          bvStmts.push(db.prepare(
            `UPDATE members SET
               left_bv_monthly = MAX(0, left_bv_monthly - ?),
               left_bv_total   = MAX(0, left_bv_total - ?),
               updated_at = datetime('now')
             WHERE id = ?`
          ).bind(log.bv_amount, log.bv_amount, log.member_id))
        } else {
          bvStmts.push(db.prepare(
            `UPDATE members SET
               right_bv_monthly = MAX(0, right_bv_monthly - ?),
               right_bv_total   = MAX(0, right_bv_total - ?),
               updated_at = datetime('now')
             WHERE id = ?`
          ).bind(log.bv_amount, log.bv_amount, log.member_id))
        }
        rollbackSummary.bv_reversed += log.bv_amount

      } else if (log.bv_type === 'fast_start_contribution') {
        bvStmts.push(db.prepare(
          `UPDATE members SET
             fast_start_bv = MAX(0, fast_start_bv - ?),
             updated_at = datetime('now')
           WHERE id = ?`
        ).bind(log.bv_amount, log.member_id))
      }
    }

    // Supprimer tous les bv_logs liés + marquer l'order cancelled
    bvStmts.push(db.prepare(`DELETE FROM bv_logs WHERE package_order_id = ?`).bind(orderId))
    bvStmts.push(db.prepare(`DELETE FROM bv_queue WHERE package_order_id = ?`).bind(orderId))
    bvStmts.push(db.prepare(
      `UPDATE package_orders SET status='cancelled', updated_at=datetime('now') WHERE id=?`
    ).bind(orderId))

    if (bvStmts.length > 0) {
      // D1 batch limit = 100 — on chunke par 50
      for (let i = 0; i < bvStmts.length; i += 50) {
        await db.batch(bvStmts.slice(i, i + 50))
      }
    }

    // ── 4. Annuler les commissions liées à cet order ─────────────────────────
    // valorisation_recommandation → liée par reference_order_id
    const commissions = await db.prepare(
      `SELECT id, member_id, amount, status FROM commissions
       WHERE reference_order_id = ? AND status NOT IN ('cancelled','paid')`
    ).bind(orderId).all()
    const comms = (commissions.results || []) as any[]

    for (const comm of comms) {
      await db.batch([
        db.prepare(
          `UPDATE commissions SET status='cancelled', updated_at=datetime('now') WHERE id=?`
        ).bind(comm.id),
        db.prepare(
          `UPDATE pending_wallet_entries SET status='cancelled', updated_at=datetime('now')
           WHERE reference_id=? AND status='pending'`
        ).bind(comm.id),
        // Déduire du wallet pending (débit compensatoire)
        db.prepare(
          `UPDATE members SET wallet_pending = MAX(0, wallet_pending - ?), updated_at=datetime('now')
           WHERE id=?`
        ).bind(comm.amount, comm.member_id),
      ])
      rollbackSummary.commissions_cancelled++
      rollbackSummary.wallet_cancelled += comm.amount
    }

    // ── 5. Annuler les commissions fast_start liées à cet order ─────────────
    // fast_start est lié via source_member_id = acheteur OU reference_order_id
    const fastStartComms = await db.prepare(
      `SELECT id, member_id, amount, status FROM commissions
       WHERE type = 'fast_start'
         AND source_member_id = ?
         AND status NOT IN ('cancelled','paid')
         AND period = strftime('%Y-%m', 'now')`
    ).bind(memberId).all()
    for (const comm of (fastStartComms.results || []) as any[]) {
      await db.batch([
        db.prepare(`UPDATE commissions SET status='cancelled', updated_at=datetime('now') WHERE id=?`).bind(comm.id),
        db.prepare(
          `UPDATE pending_wallet_entries SET status='cancelled', updated_at=datetime('now')
           WHERE reference_id=? AND status='pending'`
        ).bind(comm.id),
        db.prepare(
          `UPDATE members SET wallet_pending = MAX(0, wallet_pending - ?), updated_at=datetime('now') WHERE id=?`
        ).bind(comm.amount, comm.member_id),
      ])
      rollbackSummary.commissions_cancelled++
    }

    // ── 6. Réinitialiser package_purchased du membre si c'était ce package ───
    const currentPkg = await db.prepare(
      `SELECT package_type FROM members WHERE id=?`
    ).bind(memberId).first() as any
    if (currentPkg?.package_type === (await db.prepare(
      `SELECT type FROM packages WHERE id=?`
    ).bind(reg.package_id).first() as any)?.type) {
      await db.prepare(
        `UPDATE members SET
           package_purchased = 0,
           package_type = NULL,
           package_name = NULL,
           updated_at = datetime('now')
         WHERE id = ?`
      ).bind(memberId).run()
    }

    console.log(`[broker cancel] Rollback complet: order=${orderId} bv_reversed=${rollbackSummary.bv_reversed} comms_cancelled=${rollbackSummary.commissions_cancelled}`)
  }

  // ── 7. Marquer l'inscription broker comme annulée ────────────────────────
  await db.prepare(
    `UPDATE broker_registrations SET status='cancelled', updated_at=datetime('now') WHERE id=?`
  ).bind(regId).run()

  // Notifier le membre
  await createNotification(
    db, memberId,
    '🚫 Inscription broker annulée — BV et commissions annulés',
    `Votre inscription Triomarkets a été annulée par un administrateur. ${rollbackSummary.bv_reversed > 0 ? rollbackSummary.bv_reversed + ' BV ont été retirés de votre réseau.' : ''} Contactez le support pour plus d'informations.`,
    'warning'
  )

  console.log(`[broker admin cancel] reg=${regId} member=${memberId} previous_status=${previousStatus}`)
  return c.json({
    success: true,
    previous_status: previousStatus,
    rollback: rollbackSummary
  })
})

// ── GET /api/admin/broker/packages — Liste des packages broker disponibles ───
// Utilisé par le modal d'assignation admin
brokerAdmin.get('/packages', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, name, price_usd, bv_value
     FROM packages
     WHERE payment_mode = 'broker' AND is_active = 1 AND deleted_at IS NULL
     ORDER BY price_usd ASC`
  ).all()
  return c.json({ packages: rows.results || [] })
})

export { broker as default, brokerAdmin }
