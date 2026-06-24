// ============================================================
// LEADER — Routes Membres
// ============================================================
import { Hono } from 'hono'
import { verifyJWT } from '../lib/auth.js'
import { hashPassword, verifyPassword, generateId, generateUniqueId } from '../lib/auth.js'
import { calculateMemberRank, propagateBV, checkFastStart, getRankIndex, RANK_ORDER, placeMemberFromHoldingTank, processBVQueue, getCCBalance, activateAndReward, createNotification, walletOperation } from '../lib/mlm.js'
import { sendEmail } from '../lib/mailer.js'
import type { Bindings } from '../types/index.js'

const members = new Hono<{ Bindings: Bindings }>()

// ── Routes PUBLIQUES (avant le middleware auth) ───────────────────────────────
// GET /api/members/paypal/config — Client ID public pour le SDK frontend
// Route publique : le Client ID PayPal n'est pas un secret (il est dans le HTML)
members.get('/paypal/config', async (c) => {
  const { clientId, mode, enabled } = await getPayPalConfig(c.env.DB, c.env)
  if (!enabled) return c.json({ enabled: false })
  return c.json({
    enabled:   true,
    client_id: clientId,
    mode,
    currency:  'USD',
  })
})

// GET /api/members/coinpayments/config — Merchant ID public pour le checkout
// Route publique : le Merchant ID est requis côté frontend pour le bouton de paiement
members.get('/coinpayments/config', async (c) => {
  const { merchantId, enabled, coins } = await getCoinPaymentsConfig(c.env.DB, c.env)
  if (!enabled) return c.json({ enabled: false })
  return c.json({
    enabled:     true,
    merchant_id: merchantId,
    coins,          // ex: 'USDT.TRC20,BTC,ETH,LTC'
    currency:    'USD',
  })
})

// GET /api/members/stripe/config — Clé publique pour le SDK frontend (route PUBLIQUE)
// Doit être déclarée AVANT le middleware auth pour être accessible sans token
members.get('/stripe/config', async (c) => {
  const { publicKey, mode, enabled } = await getStripeConfig(c.env.DB, c.env)
  if (!enabled) return c.json({ enabled: false })
  return c.json({ enabled: true, public_key: publicKey, mode, currency: 'usd' })
})

// Middleware auth membre — appliqué à toutes les autres routes
members.use('/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload || payload.role !== 'member') return c.json({ error: 'Token invalide' }, 401)
  c.set('memberId' as any, payload.sub)
  await next()
})

// GET /api/members/me — Profil complet (sans password_hash ni pin_hash)
members.get('/me', async (c) => {
  const memberId = c.get('memberId' as any)
  const member = await c.env.DB.prepare(
    `SELECT id, unique_id, email, first_name, last_name, phone, country,
            address, city, postal_code, nationality, birth_date,
            sponsor_id, binary_parent_id, binary_position,
            binary_left_id, binary_right_id,
            member_status, current_rank,
            left_bv_total, right_bv_total, left_bv_monthly, right_bv_monthly,
            personal_bv_monthly, license_active, license_expires_at, kyc_status,
            kyc_document_url, fast_start_start_date, fast_start_completed,
            in_holding_tank, wallet_balance, credit_croissance, reserve_strategique,
            avatar_url, paypal_email, registration_method,
            preferred_lang, profile_photo, vdi_consent, vdi_consent_at,
            whatsapp_number, messenger_id,
            created_at, updated_at
     FROM members WHERE id = ?`
  ).bind(memberId).first()
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)
  const wallet = await c.env.DB.prepare(`SELECT * FROM wallets WHERE member_id = ?`).bind(memberId).first()

  // Récupérer la date d'expiration du package actif (non mensuel)
  const activePackage = await c.env.DB.prepare(
    `SELECT po.package_expires_at, po.validated_at, p.name AS package_name,
            p.pricing_type, p.payment_mode, p.duration_years
     FROM package_orders po
     JOIN packages p ON p.id = po.package_id
     WHERE po.member_id = ? AND po.status = 'active'
       AND (p.pricing_type != 'monthly' OR p.pricing_type IS NULL)
     ORDER BY po.validated_at DESC LIMIT 1`
  ).bind(memberId).first() as any

  return c.json({ member, wallet, activePackage: activePackage || null })
})

// PUT /api/members/me — Mise à jour profil (champs de base)
members.put('/me', async (c) => {
  const memberId = c.get('memberId' as any)
  const {
    first_name, last_name, phone, country,
    address, city, postal_code, nationality, birth_date,
    paypal_email
  } = await c.req.json()
  await c.env.DB.prepare(
    `UPDATE members SET
      first_name=?, last_name=?, phone=?, country=?,
      address=?, city=?, postal_code=?, nationality=?, birth_date=?,
      paypal_email=?, updated_at=datetime('now')
     WHERE id=?`
  ).bind(
    first_name, last_name, phone, country,
    address || null, city || null, postal_code || null, nationality || null, birth_date || null,
    paypal_email, memberId
  ).run()
  return c.json({ success: true })
})

// PUT /api/members/profile — Mise à jour profil enrichi (langue, photo, VDI)
members.put('/profile', async (c) => {
  const memberId = c.get('memberId' as any)
  const body = await c.req.json()
  const { preferred_lang, profile_photo, vdi_consent, city, whatsapp_number, messenger_id } = body
  const LANGS = ['fr','en','es','de','pt','ar']
  if (preferred_lang && !LANGS.includes(preferred_lang)) {
    return c.json({ error: 'Langue non supportée' }, 400)
  }
  // Gestion VDI consent
  let vdiConsentAt: string | null = null
  if (vdi_consent === 1 || vdi_consent === true) {
    const existing = await c.env.DB.prepare(
      `SELECT vdi_consent, vdi_consent_at FROM members WHERE id=?`
    ).bind(memberId).first() as any
    vdiConsentAt = existing?.vdi_consent ? existing.vdi_consent_at : new Date().toISOString()
  }
  await c.env.DB.prepare(
    `UPDATE members SET
      preferred_lang   = COALESCE(?, preferred_lang),
      profile_photo    = COALESCE(?, profile_photo),
      city             = COALESCE(?, city),
      whatsapp_number  = COALESCE(?, whatsapp_number),
      messenger_id     = COALESCE(?, messenger_id),
      vdi_consent      = COALESCE(?, vdi_consent),
      vdi_consent_at   = CASE WHEN ? = 1 THEN COALESCE(?, vdi_consent_at) ELSE vdi_consent_at END,
      updated_at = datetime('now')
     WHERE id=?`
  ).bind(
    preferred_lang || null,
    profile_photo  || null,
    city           || null,
    whatsapp_number != null ? (whatsapp_number || '') : null,
    messenger_id != null ? (messenger_id || '') : null,
    vdi_consent != null ? (vdi_consent ? 1 : 0) : null,
    vdi_consent ? 1 : 0,
    vdiConsentAt,
    memberId
  ).run()
  return c.json({ success: true })
})

// GET /api/members/profile/completeness — Vérifier si le profil est complet pour la carte
members.get('/profile/completeness', async (c) => {
  const memberId = c.get('memberId' as any)
  const m = await c.env.DB.prepare(
    `SELECT first_name, last_name, city, preferred_lang, profile_photo, vdi_consent, license_active
     FROM members WHERE id=?`
  ).bind(memberId).first() as any
  if (!m) return c.json({ error: 'Membre introuvable' }, 404)
  const missing: string[] = []
  if (!m.first_name) missing.push('first_name')
  if (!m.last_name)  missing.push('last_name')
  if (!m.city)       missing.push('city')
  if (!m.profile_photo) missing.push('profile_photo')
  if (!m.vdi_consent)   missing.push('vdi_consent')
  const complete = missing.length === 0
  const license_active = !!m.license_active
  return c.json({ complete, missing, license_active })
})

// PUT /api/members/me/pin — Modifier PIN retrait
members.put('/me/pin', async (c) => {
  const memberId = c.get('memberId' as any)
  const { current_password, new_pin } = await c.req.json()
  if (!new_pin || new_pin.length !== 4) return c.json({ error: 'PIN doit être 4 chiffres' }, 400)
  const member = await c.env.DB.prepare(`SELECT * FROM members WHERE id = ?`).bind(memberId).first() as any
  const valid = await verifyPassword(current_password, member.password_hash)
  if (!valid) return c.json({ error: 'Mot de passe incorrect' }, 401)
  const pinHash = await hashPassword(new_pin)
  await c.env.DB.prepare(`UPDATE members SET pin_hash=? WHERE id=?`).bind(pinHash, memberId).run()
  return c.json({ success: true })
})

// GET /api/members/dashboard — Données dashboard
members.get('/dashboard', async (c) => {
  const memberId = c.get('memberId' as any)
  const member = await c.env.DB.prepare(
    `SELECT id, unique_id, email, first_name, last_name, phone, country,
            sponsor_id, binary_parent_id, binary_position,
            binary_left_id, binary_right_id,
            member_status, current_rank,
            left_bv_total, right_bv_total, left_bv_monthly, right_bv_monthly,
            personal_bv_monthly, license_active, license_expires_at, kyc_status,
            fast_start_start_date, fast_start_completed, fast_start_bv, in_holding_tank,
            wallet_balance, credit_croissance, reserve_strategique,
            avatar_url, paypal_email, registration_method, created_at, updated_at
     FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  const wallet = await c.env.DB.prepare(`SELECT * FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
  const period = new Date().toISOString().substring(0, 7)

  // Pending wallet — total bloqué en attente de libération
  const pendingWalletRows = await c.env.DB.prepare(
    `SELECT total_amount, amount_per_day, days_paid, eligible_date, status, commission_type
     FROM pending_wallet_entries
     WHERE member_id = ? AND status IN ('pending_release','active')`
  ).bind(memberId).all()
  const pendingWalletTotal = ((pendingWalletRows.results || []) as any[]).reduce((sum, e) => {
    return sum + Math.max(0, (e.total_amount || 0) - (e.amount_per_day || 0) * (e.days_paid || 0))
  }, 0)
  const nextEligible = ((pendingWalletRows.results || []) as any[])
    .map((e: any) => e.eligible_date).filter(Boolean).sort()[0] || null

  // Q70/Q108 — Prime du jour : total journalier actuel + ventilation par type
  // Somme des amount_per_day des entrées en cours de libération (status='active')
  const COMM_TYPE_LABELS_DASH: Record<string, string> = {
    prime_leadership:            'Prime de Leadership',
    bonus_influence:             "Bonus d'Influence",
    bonus_rayonnement:           'Bonus de Rayonnement',
    valorisation_recommandation: 'Valorisation Recommandation',
    fast_start:                  'Fast Start Bonus',
    credit_croissance:           'Crédit de Croissance',
    reserve_strategique:         'Réserve Stratégique',
  }
  const activeEntries = ((pendingWalletRows.results || []) as any[]).filter(e => e.status === 'active')
  const dailyReleaseTotal = activeEntries.reduce((sum: number, e: any) => sum + (e.amount_per_day || 0), 0)
  const dailyReleaseByType: Array<{ type: string; label: string; amount_per_day: number }> = []
  for (const e of activeEntries) {
    const existing = dailyReleaseByType.find(x => x.type === e.commission_type)
    if (existing) {
      existing.amount_per_day += e.amount_per_day || 0
    } else {
      dailyReleaseByType.push({
        type:           e.commission_type,
        label:          COMM_TYPE_LABELS_DASH[e.commission_type] || e.commission_type,
        amount_per_day: e.amount_per_day || 0,
      })
    }
  }

  // Dernières opérations : flux unifié (bonus, achats packages, licences, retraits)
  const recentCommissions = await c.env.DB.prepare(
    `SELECT * FROM (
       SELECT id, type AS tx_type, 'bonus' AS category, amount,
              description, status, created_at, NULL AS package_name, NULL AS product_type
       FROM commissions WHERE member_id = ?
       UNION ALL
       SELECT po.id,
              CASE WHEN po.product_type='upgrade' THEN 'package_upgrade' ELSE 'package_purchase' END,
              'purchase', -po.amount_usd,
              CASE WHEN po.product_type='upgrade' THEN 'Upgrade → '||COALESCE(p.name,'Package')
                   ELSE 'Achat package : '||COALESCE(p.name,'Package') END,
              po.status, po.created_at, p.name, po.product_type
       FROM package_orders po LEFT JOIN packages p ON p.id=po.package_id
       WHERE po.member_id = ?
       UNION ALL
       SELECT id, 'license_purchase', 'purchase', -price_usd,
              'Achat licence annuelle', status, created_at,
              'Licence', 'license'
       FROM finstrategia_licenses WHERE member_id = ?
       UNION ALL
       SELECT id, 'withdrawal', 'withdrawal', -net_amount,
              'Retrait — '||COALESCE(paypal_email,'PayPal'),
              status, created_at, NULL, NULL
       FROM withdrawals WHERE member_id = ?
     ) ORDER BY created_at DESC LIMIT 8`
  ).bind(memberId, memberId, memberId, memberId).all()

  // Notifications non lues
  const unreadCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM notifications WHERE member_id = ? AND is_read = 0`
  ).bind(memberId).first() as any

  // Équipe directe
  const directCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM members WHERE sponsor_id = ?`
  ).bind(memberId).first() as any

  // Rank config
  const rankConfig = member.current_rank !== 'none'
    ? await c.env.DB.prepare(`SELECT * FROM rank_config WHERE rank_name = ?`).bind(member.current_rank).first()
    : null

  // Prochain rang
  const currentIdx = getRankIndex(member.current_rank)
  const nextRank = currentIdx < RANK_ORDER.length - 1 ? RANK_ORDER[currentIdx + 1] : null
  const nextRankConfig = nextRank && nextRank !== 'none'
    ? await c.env.DB.prepare(`SELECT * FROM rank_config WHERE rank_name = ?`).bind(nextRank).first() as any
    : null

  // Mode BV pour la progression : utilise le mode configuré sur le prochain rang
  // bv_rank_use_total=1 (défaut CDC) → BV total à vie | =0 → BV mensuel
  const useTotal = nextRankConfig ? (nextRankConfig.bv_rank_use_total !== 0) : true
  const leftBV  = useTotal ? (member.left_bv_total  || 0) : (member.left_bv_monthly  || 0)
  const rightBV = useTotal ? (member.right_bv_total || 0) : (member.right_bv_monthly || 0)
  const minLeg  = Math.min(leftBV, rightBV)
  const progressToNext = nextRankConfig && nextRankConfig.min_bv_leg > 0
    ? Math.min(100, Math.round((minLeg / nextRankConfig.min_bv_leg) * 100))
    : (nextRankConfig ? 0 : 100)
  // Exposer le mode BV utilisé au frontend pour l'affichage correct
  const progressBVMode = useTotal ? 'total' : 'monthly'
  const progressMinLeg = minLeg

  // Paliers Fast Start — pour affichage progression côté membre
  // Enrichi avec paid=1 si la commission du palier a déjà été versée (idempotence visible)
  const fastStartPaliers = await c.env.DB.prepare(
    `SELECT
       fsc.bv_threshold,
       fsc.bonus_amount,
       CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END AS paid
     FROM fast_start_config fsc
     LEFT JOIN commissions c
       ON c.member_id = ?
      AND c.type = 'fast_start'
      AND c.description LIKE '%palier ' || CAST(CAST(fsc.bv_threshold AS INTEGER) AS TEXT) || ' BV%'
     ORDER BY fsc.bv_threshold ASC`
  ).bind(memberId).all()

  // Config Fast Start (durée)
  const fsDaysRow = await c.env.DB.prepare(
    `SELECT value FROM compensation_config WHERE key = 'fast_start_days'`
  ).first() as any
  const fastStartDays = parseInt(fsDaysRow?.value || '30')

  // Solde CC v2
  const ccBalance = await getCCBalance(c.env.DB, memberId)

  // --- Blocs progression dashboard : directs qualifiés rang à vie + prime mensuelle ---
  // Tout dans un try/catch isolé : une erreur SQL ici ne doit jamais casser le dashboard
  let directActiveCount = 0
  // Prime de Leadership mensuelle — données pour Bloc B
  let monthlyBvLegCurrent = 0       // petite jambe mensuelle actuelle
  let monthlyBvLegRequired = 0      // seuil BV jambe requis pour le rang actuel
  let monthlyRecruitsCurrent = 0    // nouvelles recrues directes ce mois
  let monthlyRecruitsRequired = 0   // seuil recrues requis pour le rang actuel
  let monthlyPkgMinValue = 0        // valeur $ minimum package recrues ce mois
  let monthlyFloorRanks = 0         // plancher de rangs (info)
  let monthlyEffectiveRank = ''     // rang mensuel effectif calculé

  try {
    // ── Bloc A : directs qualifiés pour le prochain rang (à vie) ──
    // Seuil de prix lu depuis rank_config.min_monthly_package_value (paramétrable admin).
    // Aucune valeur de prix n'est hardcodée — tout vient de la table rank_config.
    if (nextRankConfig) {
      const activeThreshold = nextRankConfig.min_monthly_package_value || 0
      if (activeThreshold > 0) {
        // Directs avec package validated >= seuil prix du prochain rang
        const directActiveRow = await c.env.DB.prepare(
          `SELECT COUNT(DISTINCT m.id) as cnt FROM members m
           JOIN package_orders po ON po.member_id = m.id
           JOIN packages p ON p.id = po.package_id
           WHERE m.sponsor_id = ? AND po.status = 'validated' AND p.price_usd >= ?`
        ).bind(memberId, activeThreshold).first() as any
        directActiveCount = directActiveRow?.cnt || 0
      } else {
        // Pas de seuil prix configuré → tout package validated avec bv_value > 0 suffit
        const directActiveRow = await c.env.DB.prepare(
          `SELECT COUNT(DISTINCT m.id) as cnt FROM members m
           JOIN package_orders po ON po.member_id = m.id
           JOIN packages p ON p.id = po.package_id
           WHERE m.sponsor_id = ? AND po.status = 'validated' AND p.bv_value > 0`
        ).bind(memberId).first() as any
        directActiveCount = directActiveRow?.cnt || 0
      }
    }

    // ── Bloc B : progression Prime de Leadership mensuelle ──────
    if (rankConfig) {
      // BV mensuel petite jambe actuelle
      monthlyBvLegCurrent  = Math.min(member.left_bv_monthly || 0, member.right_bv_monthly || 0)
      monthlyBvLegRequired = rankConfig.min_monthly_bv_leg     || 0
      monthlyRecruitsRequired = rankConfig.min_monthly_directs  || 0
      monthlyPkgMinValue   = rankConfig.min_monthly_package_value || 0
      monthlyFloorRanks    = rankConfig.monthly_floor_ranks     || 0

      // Nouvelles recrues directes ce mois
      const now = new Date()
      const monthStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
      if (monthlyPkgMinValue > 0) {
        const recruitRow = await c.env.DB.prepare(
          `SELECT COUNT(DISTINCT m.id) as cnt
           FROM members m
           JOIN package_orders po ON po.member_id = m.id
           JOIN packages p ON p.id = po.package_id
           WHERE m.sponsor_id = ?
             AND strftime('%Y-%m', m.created_at) = ?
             AND po.status = 'validated'
             AND p.price_usd >= ?`
        ).bind(memberId, monthStr, monthlyPkgMinValue).first() as any
        monthlyRecruitsCurrent = recruitRow?.cnt || 0
      } else {
        const recruitRow = await c.env.DB.prepare(
          `SELECT COUNT(*) as cnt FROM members
           WHERE sponsor_id = ? AND strftime('%Y-%m', created_at) = ?`
        ).bind(memberId, monthStr).first() as any
        monthlyRecruitsCurrent = recruitRow?.cnt || 0
      }

      // Rang mensuel effectif simplifié (pour affichage — pas le vrai calcul mlm.ts)
      // On détermine quel rang correspond aux critères actuels
      const ranksForEffective = await c.env.DB.prepare(
        `SELECT * FROM rank_config ORDER BY rank_order DESC`
      ).all()
      const realRankOrder = rankConfig.rank_order || 0
      for (const r of ranksForEffective.results as any[]) {
        if (r.rank_order > realRankOrder) continue
        const bvOk = (r.min_monthly_bv_leg || 0) === 0 || monthlyBvLegCurrent >= (r.min_monthly_bv_leg || 0)
        const recOk = (r.min_monthly_directs || 0) === 0 || monthlyRecruitsCurrent >= (r.min_monthly_directs || 0)
        if (bvOk && recOk) { monthlyEffectiveRank = r.rank_name; break }
      }
    }
  } catch (_e: any) {
    // Non-bloquant : le dashboard s'affiche avec des valeurs par défaut
    // En dev, on peut activer le log : console.error('[dashboard bloc A/B]', _e?.message || _e)
  }

  return c.json({
    member,
    wallet,
    ccBalance,
    recentCommissions: recentCommissions.results,
    unreadNotifications: unreadCount?.cnt || 0,
    directTeamCount: directCount?.cnt || 0,
    rankConfig,
    nextRank,
    nextRankConfig,
    progressToNext,
    progressBVMode,
    progressMinLeg,
    pendingWalletTotal,
    nextEligible,
    dailyReleaseTotal,
    dailyReleaseByType,
    fastStartPaliers: fastStartPaliers.results,
    fastStartDays,
    license_price: (await getLicenseConfig(c.env.DB)).price,
    directActiveCount,
    // Bloc B — Prime de Leadership mensuelle
    monthlyBvLegCurrent,
    monthlyBvLegRequired,
    monthlyRecruitsCurrent,
    monthlyRecruitsRequired,
    monthlyPkgMinValue,
    monthlyFloorRanks,
    monthlyEffectiveRank,
    // Package actif + date d'expiration (Fix #4)
    activePackage: await (async () => {
      const row = await c.env.DB.prepare(
        `SELECT po.package_expires_at, po.validated_at, p.name AS package_name,
                p.pricing_type, p.payment_mode, p.duration_years
         FROM package_orders po
         JOIN packages p ON p.id = po.package_id
         WHERE po.member_id = ? AND po.status = 'active'
           AND (p.pricing_type IS NULL OR p.pricing_type != 'monthly')
         ORDER BY po.validated_at DESC LIMIT 1`
      ).bind(memberId).first()
      return row || null
    })()
  })
})

// GET /api/members/downline — Arbre de parrainage récursif (toute la downline du membre)
// Retourne un arbre JSON avec sponsor_name sur chaque nœud, depth max 8
members.get('/downline', async (c) => {
  const memberId = c.get('memberId' as any)

  // Charge tous les membres de la downline en une seule requête (CTE récursif)
  // puis reconstruit l'arbre en mémoire — plus efficace que N appels récursifs D1
  const allRows = await c.env.DB.prepare(`
    WITH RECURSIVE downline(id, unique_id, first_name, last_name, email, member_status,
                             current_rank, license_active, sponsor_id, activation_done,
                             fast_start_bv, left_bv_total, right_bv_total, created_at, depth) AS (
      -- Filleuls directs de niveau 1
      SELECT id, unique_id, first_name, last_name, email, member_status,
             current_rank, license_active, sponsor_id, activation_done,
             fast_start_bv, left_bv_total, right_bv_total, created_at, 1
      FROM members
      WHERE sponsor_id = ? AND unique_id != 'ROOT'
      UNION ALL
      -- Récursion : filleuls des filleuls, jusqu'à depth 8
      SELECT m.id, m.unique_id, m.first_name, m.last_name, m.email, m.member_status,
             m.current_rank, m.license_active, m.sponsor_id, m.activation_done,
             m.fast_start_bv, m.left_bv_total, m.right_bv_total, m.created_at, d.depth + 1
      FROM members m
      JOIN downline d ON m.sponsor_id = d.id
      WHERE d.depth < 8 AND m.unique_id != 'ROOT'
    )
    SELECT * FROM downline ORDER BY depth ASC, created_at ASC
  `).bind(memberId).all()

  const rows = (allRows.results || []) as any[]

  // Indexer par id pour reconstruction rapide
  const byId = new Map<string, any>()
  rows.forEach(r => {
    byId.set(r.id, { ...r, children: [] })
  })

  // Construire l'arbre
  const roots: any[] = []
  rows.forEach(r => {
    const node = byId.get(r.id)!
    if (r.sponsor_id === memberId) {
      roots.push(node)
    } else {
      const parent = byId.get(r.sponsor_id)
      if (parent) parent.children.push(node)
    }
  })

  // Stats globales
  const totalCount  = rows.length
  const activeCount = rows.filter(r => r.license_active).length

  return c.json({ tree: roots, totalCount, activeCount })
})

// GET /api/members/team — Mon équipe
members.get('/team', async (c) => {
  const memberId = c.get('memberId' as any)
  const { page = '1', per_page = '20', search } = c.req.query()
  const offset = (parseInt(page) - 1) * parseInt(per_page)

  let query = `SELECT m.id, m.unique_id, m.email, m.first_name, m.last_name, m.phone, m.country,
                      m.member_status, m.current_rank, m.license_active, m.kyc_status,
                      m.in_holding_tank, m.wallet_balance, m.registration_method, m.created_at,
                      m.left_bv_monthly, m.right_bv_monthly,
                      (SELECT COUNT(*) FROM members s WHERE s.sponsor_id = m.id) as direct_count
               FROM members m WHERE m.sponsor_id = ? AND m.unique_id != 'ROOT'`
  const params: any[] = [memberId]

  if (search) {
    query += ` AND (m.first_name LIKE ? OR m.last_name LIKE ? OR m.email LIKE ? OR m.unique_id LIKE ?)`
    const s = `%${search}%`
    params.push(s, s, s, s)
  }

  query += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`
  params.push(parseInt(per_page), offset)

  const [directs, totalResult] = await Promise.all([
    c.env.DB.prepare(query).bind(...params).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM members WHERE sponsor_id = ?`).bind(memberId).first() as any
  ])

  return c.json({ members: directs.results, total: totalResult?.cnt || 0, page: parseInt(page) })
})

// GET /api/members/tree — Arbre binaire JSON
// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE : 1 seule requête SQL CTE récursive (au lieu de 2N requêtes
// en cascade). Reconstruction de l'arbre imbriqué en mémoire JS.
// Complexité : O(1) requête D1, O(N) mémoire — tient à 10 000+ membres.
//
// Paramètres :
//   ?depth=N   : profondeur max à partir du membre connecté (défaut 5, max 8)
//   ?root=ID   : charger l'arbre depuis un nœud spécifique (ex: admin view)
// ─────────────────────────────────────────────────────────────────────────────
members.get('/tree', async (c) => {
  const memberId = c.get('memberId' as any)
  const { depth: depthParam = '5', root: rootParam } = c.req.query()
  // Cap à 8 niveaux max — au-delà l'UI ne peut pas afficher utilement
  const maxDepth = Math.min(Math.max(parseInt(depthParam) || 5, 1), 12)

  // Point de départ : le membre lui-même (ou un nœud spécifié)
  const startId = rootParam || memberId

  // ── 1 SEULE REQUÊTE : CTE récursive D1 ────────────────────────────────────
  // Charge tous les nœuds jusqu'à maxDepth niveaux en dessous de startId.
  // Colonnes binaire_parent_id + binary_position permettent la reconstruction.
  const rows = await c.env.DB.prepare(`
    WITH RECURSIVE tree_nodes(
      id, unique_id, first_name, last_name,
      member_status, current_rank,
      left_bv_monthly, right_bv_monthly,
      in_holding_tank, activation_done,
      binary_parent_id, binary_position,
      binary_left_id, binary_right_id,
      node_depth
    ) AS (
      -- Nœud racine (membre connecté)
      SELECT
        id, unique_id, first_name, last_name,
        member_status, current_rank,
        left_bv_monthly, right_bv_monthly,
        in_holding_tank, activation_done,
        binary_parent_id, binary_position,
        binary_left_id, binary_right_id,
        0 AS node_depth
      FROM members WHERE id = ?

      UNION ALL

      -- Enfants récursifs jusqu'à maxDepth
      SELECT
        m.id, m.unique_id, m.first_name, m.last_name,
        m.member_status, m.current_rank,
        m.left_bv_monthly, m.right_bv_monthly,
        m.in_holding_tank, m.activation_done,
        m.binary_parent_id, m.binary_position,
        m.binary_left_id, m.binary_right_id,
        t.node_depth + 1
      FROM members m
      INNER JOIN tree_nodes t ON m.binary_parent_id = t.id
      WHERE t.node_depth < ?
        AND m.unique_id != 'ROOT'
    )
    SELECT * FROM tree_nodes ORDER BY node_depth ASC
  `).bind(startId, maxDepth).all()

  const nodes = rows.results as any[]

  if (nodes.length === 0) return c.json({ tree: null })

  // ── Reconstruction de l'arbre imbriqué en mémoire (O(N)) ──────────────────
  // Map id → nœud enrichi
  const nodeMap = new Map<string, any>()
  for (const n of nodes) {
    nodeMap.set(n.id, {
      id:               n.id,
      unique_id:        n.unique_id,
      first_name:       n.first_name,
      last_name:        n.last_name,
      member_status:    n.member_status,
      current_rank:     n.current_rank,
      left_bv_monthly:  n.left_bv_monthly,
      right_bv_monthly: n.right_bv_monthly,
      in_holding_tank:  n.in_holding_tank,
      activation_done:  n.activation_done,
      node_depth:       n.node_depth,
      left:             null,
      right:            null,
    })
  }

  // Attacher chaque nœud à son parent (gauche ou droite)
  for (const n of nodes) {
    if (!n.binary_parent_id) continue
    const parent = nodeMap.get(n.binary_parent_id)
    if (!parent) continue  // parent hors périmètre (au-dessus de startId)
    const child = nodeMap.get(n.id)
    if (n.binary_position === 'L') parent.left  = child
    else                            parent.right = child
  }

  const root = nodeMap.get(startId) || null

  return c.json({
    tree: root,
    meta: { depth_loaded: maxDepth, total_nodes: nodes.length }
  })
})

// GET /api/members/bv-journal — Journal BV
members.get('/bv-journal', async (c) => {
  const memberId = c.get('memberId' as any)
  const { page = '1', per_page = '20' } = c.req.query()
  const offset = (parseInt(page) - 1) * parseInt(per_page)

  const [logs, total] = await Promise.all([
    c.env.DB.prepare(
      `SELECT bl.*,
              m.first_name, m.last_name, m.unique_id AS source_unique_id,
              m.current_rank AS source_rank,
              m.left_bv_monthly AS source_left_bv,
              m.right_bv_monthly AS source_right_bv
       FROM bv_logs bl
       LEFT JOIN members m ON m.id = bl.source_member_id
       WHERE bl.member_id = ? AND bl.bv_type != 'fast_start_contribution'
       ORDER BY bl.created_at DESC LIMIT ? OFFSET ?`
    ).bind(memberId, parseInt(per_page), offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM bv_logs WHERE member_id = ? AND bv_type != 'fast_start_contribution'`).bind(memberId).first() as any
  ])

  return c.json({ logs: logs.results, total: total?.cnt || 0 })
})

// GET /api/members/commissions — Mes commissions
members.get('/commissions', async (c) => {
  const memberId = c.get('memberId' as any)
  const { page = '1', per_page = '20', type, period } = c.req.query()
  const offset = (parseInt(page) - 1) * parseInt(per_page)

  let query = `SELECT c.*, m.first_name as source_first, m.last_name as source_last
               FROM commissions c LEFT JOIN members m ON m.id = c.source_member_id
               WHERE c.member_id = ?`
  const params: any[] = [memberId]
  if (type) { query += ` AND c.type = ?`; params.push(type) }
  if (period) { query += ` AND c.period = ?`; params.push(period) }
  query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`
  params.push(parseInt(per_page), offset)

  const [comms, total, summary] = await Promise.all([
    c.env.DB.prepare(query).bind(...params).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM commissions WHERE member_id = ?`).bind(memberId).first() as any,
    c.env.DB.prepare(
      `SELECT type, SUM(amount) as total FROM commissions WHERE member_id = ? AND status = 'approved' GROUP BY type`
    ).bind(memberId).all()
  ])

  return c.json({ commissions: comms.results, total: total?.cnt || 0, summary: summary.results })
})

// GET /api/members/wallet — Portefeuille complet (5 wallets + pending + historique)
members.get('/wallet', async (c) => {
  const memberId = c.get('memberId' as any)
  const [wallet, member, pendingWithdrawals, recentCC, recentRS, pendingEntries] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM wallets WHERE member_id = ?`).bind(memberId).first(),
    c.env.DB.prepare(
      `SELECT wallet_balance, credit_croissance, reserve_strategique, pending_withdrawal, kyc_status, pin_hash, paypal_email FROM members WHERE id = ?`
    ).bind(memberId).first(),
    // Retraits en cours (pending)
    c.env.DB.prepare(
      `SELECT id, amount, net_amount, fee, paypal_email, status, created_at, admin_note
       FROM withdrawals WHERE member_id = ? AND status IN ('pending','processing')
       ORDER BY created_at DESC`
    ).bind(memberId).all(),
    // Derniers Crédits de Croissance
    c.env.DB.prepare(
      `SELECT id, amount, period, status, created_at FROM credit_croissance
       WHERE member_id = ? ORDER BY created_at DESC LIMIT 5`
    ).bind(memberId).all(),
    // Dernières Réserves Stratégiques
    c.env.DB.prepare(
      `SELECT id, amount, period, status, locked_until, created_at FROM reserve_strategique
       WHERE member_id = ? ORDER BY created_at DESC LIMIT 5`
    ).bind(memberId).all(),
    // Entrées Pending Wallet actives (commissions en cours de libération)
    c.env.DB.prepare(
      `SELECT commission_type, period, total_amount, amount_per_day,
              days_in_month, days_paid, eligible_date, start_date, status
       FROM pending_wallet_entries
       WHERE member_id = ? AND status IN ('pending_release','active')
       ORDER BY eligible_date ASC`
    ).bind(memberId).all(),
  ])

  // Calculer le total pending wallet et la date de prochaine libération
  const pendingEntryList = (pendingEntries.results || []) as any[]
  const pendingWalletTotal = pendingEntryList.reduce((sum: number, e: any) => {
    const remaining = (e.total_amount || 0) - (e.amount_per_day || 0) * (e.days_paid || 0)
    return sum + Math.max(0, remaining)
  }, 0)
  const nextEligible = pendingEntryList.length > 0
    ? pendingEntryList.reduce((min: string, e: any) => (!min || e.eligible_date < min) ? e.eligible_date : min, '')
    : null

  // ── Solde CC v2 depuis le nouveau système ──────────────────
  const ccBalance = await getCCBalance(c.env.DB, memberId)

  // ── Config retrait dynamique (tout depuis DB, rien hardcodé) ───────────
  const kycLevel = member?.kyc_level ?? 0
  const [wdConfigRows, kycLimitRow2] = await Promise.all([
    c.env.DB.prepare(
      `SELECT key, value FROM compensation_config
       WHERE key IN ('min_withdrawal','withdrawal_enabled','withdrawal_allowed_days',
                     'withdrawal_disabled_msg','withdrawal_fee_type','withdrawal_fee_pct','withdrawal_fee_fixed',
                     'withdrawal_max_amount','withdrawal_max_per_month',
                     'withdrawal_processing_time','withdrawal_kyc_min_level',
                     'withdrawal_min_remaining_balance')`
    ).all() as any,
    c.env.DB.prepare(
      `SELECT value FROM kyc_config WHERE key = ?`
    ).bind(`withdrawal_level_${kycLevel}`).first() as any,
  ])
  const wdCfg: Record<string, string> = {}
  for (const row of wdConfigRows.results) wdCfg[row.key] = row.value

  const minWithdrawal   = parseFloat(wdCfg['min_withdrawal']   ?? '50')
  const kycMaxWithdrawal = parseFloat(kycLimitRow2?.value ?? '0')

  // Calculer le prochain jour autorisé
  const allowedDaysStr  = wdCfg['withdrawal_allowed_days'] ?? '3'
  const allowedDaysArr  = allowedDaysStr.split(',').map((d: string) => parseInt(d.trim(), 10)).filter((d: number) => !isNaN(d))
  const JOURS_FR_SHORT  = ['dim','lun','mar','mer','jeu','ven','sam']
  const JOURS_FR_LONG   = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']

  // Vérifier si aujourd'hui est un jour autorisé
  const todayDay = new Date().getDay()
  const isTodayAllowed = allowedDaysArr.length === 0 || allowedDaysArr.includes(todayDay)
  const nextAllowedDate = isTodayAllowed ? null : getNextAllowedDay(allowedDaysArr)

  return c.json({
    wallet, member,
    ccBalance,
    pendingWithdrawals: pendingWithdrawals.results,
    recentCC: recentCC.results,
    recentRS: recentRS.results,
    pendingWallet: {
      total: pendingWalletTotal,
      entries: pendingEntryList,
      nextEligible,
    },
    withdrawalConfig: {
      // Montants
      min_withdrawal:         minWithdrawal,
      kyc_level:              kycLevel,
      kyc_max_withdrawal:     kycMaxWithdrawal, // 0 = illimité
      max_amount:             parseFloat(wdCfg['withdrawal_max_amount']    ?? '0'),
      max_per_month:          parseInt(wdCfg['withdrawal_max_per_month']   ?? '0', 10),
      // Frais
      fee_pct:                parseFloat(wdCfg['withdrawal_fee_pct']       ?? '0'),
      fee_fixed:              parseFloat(wdCfg['withdrawal_fee_fixed']     ?? '0'),
      // Disponibilité
      enabled:                (wdCfg['withdrawal_enabled'] ?? '1') === '1',
      disabled_msg:           wdCfg['withdrawal_disabled_msg'] ?? '',
      // Jours autorisés
      allowed_days:           allowedDaysArr,           // [3] = mercredi
      allowed_days_labels:    allowedDaysArr.map((d: number) => JOURS_FR_LONG[d] ?? ''),
      is_today_allowed:       isTodayAllowed,
      next_allowed_date:      nextAllowedDate,
      // Divers
      processing_time:        wdCfg['withdrawal_processing_time'] ?? '24-48h',
      kyc_min_level:          parseInt(wdCfg['withdrawal_kyc_min_level'] ?? '1', 10),
    }
  })
})

// GET /api/members/services — Services accessibles au membre selon son package actif
// Retourne aussi tous les services avec un flag is_accessible pour afficher les cadenas
members.get('/services', async (c) => {
  const memberId = c.get('memberId' as any)

  // Tous les services non-inactifs — on lit landing_services qui contient
  // les logos détourés haute qualité (logo_data_uri travaillés)
  const allServices = await c.env.DB.prepare(`
    SELECT id, name, slug, description, url, logo_url, logo_data_uri,
           status, display_order, category, bg_color, text_color
    FROM landing_services
    WHERE status != 'inactive'
    ORDER BY display_order ASC, name ASC
  `).all()

  // Services accessibles au membre : jointure package_orders validés → package_service_access
  const accessibleRows = await c.env.DB.prepare(`
    SELECT DISTINCT psa.service_id
    FROM package_service_access psa
    JOIN package_orders po ON po.package_id = psa.package_id
    WHERE po.member_id = ?
      AND po.status = 'validated'
      AND psa.is_enabled = 1
  `).bind(memberId).all()

  const accessibleIds = new Set(
    ((accessibleRows.results || []) as any[]).map((r: any) => r.service_id)
  )

  // Récupérer le nom du package actif (pour le message cadenas)
  const activePackage = await c.env.DB.prepare(`
    SELECT p.name as package_name, p.id as package_id
    FROM package_orders po
    JOIN packages p ON p.id = po.package_id
    WHERE po.member_id = ? AND po.status = 'validated'
    ORDER BY po.validated_at DESC
    LIMIT 1
  `).bind(memberId).first() as any

  // Enrichir chaque service avec le flag is_accessible
  const services = ((allServices.results || []) as any[]).map((s: any) => ({
    ...s,
    is_accessible: accessibleIds.has(s.id),
  }))

  return c.json({
    success: true,
    services,
    active_package: activePackage?.package_name || null,
    accessible_count: accessibleIds.size,
    total_count: services.length,
  })
})

// GET /api/members/withdrawals — Historique des retraits du membre
members.get('/withdrawals', async (c) => {
  const memberId = c.get('memberId' as any)
  const { page = '1', per_page = '20', status } = c.req.query()
  const offset = (parseInt(page) - 1) * parseInt(per_page)
  let where = `WHERE w.member_id = ?`; const params: any[] = [memberId]
  if (status) { where += ` AND w.status = ?`; params.push(status) }
  const [rows, total] = await Promise.all([
    c.env.DB.prepare(
      `SELECT w.id, w.amount, w.net_amount, w.fee, w.paypal_email, w.status, w.admin_note, w.created_at, w.confirmed_at
       FROM withdrawals w ${where} ORDER BY w.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, parseInt(per_page), offset).all(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM withdrawals w ${where}`
    ).bind(...params).first() as any,
  ])
  return c.json({ withdrawals: rows.results, total: total?.cnt || 0 })
})

// GET /api/members/transactions — Toutes les transactions (wallet_transactions + retraits)
members.get('/transactions', async (c) => {
  const memberId = c.get('memberId' as any)
  const { page = '1', per_page = '25' } = c.req.query()
  const limit  = Math.min(parseInt(per_page) || 25, 100)
  const offset = (Math.max(parseInt(page), 1) - 1) * limit
  try {

  // ── Flux unifié : toutes les opérations financières du membre ──────────────
  // 5 sources fusionnées par UNION ALL puis triées par date DESC + pagination.
  //
  // Source 1 : wallet_transactions (bonus versés journaliers + mouvements wallet)
  //   enrichies via 3 chemins JOIN pour retrouver la commission source.
  // Source 2 : package_orders validés (achats de packages et upgrades)
  // Source 3 : finstrategia_licenses (achats de licence)
  // Source 4 : withdrawals (demandes de retrait)
  // Source 5 : commissions non encore versées (fallback si wallet_transactions vide)
  //
  // Colonnes communes : id, tx_type, category, amount, description,
  //                     source_name, status, created_at, extra_json

  const unifiedSQL = `
    SELECT * FROM (

      -- ── Source 1 : mouvements wallet (bonus journaliers, conversions…) ──
      SELECT
        wt.id,
        COALESCE(c1.type, c2.type, c3.type, wt.transaction_type) AS tx_type,
        'wallet'          AS category,
        wt.amount,
        wt.balance_before,
        wt.balance_after,
        wt.description,
        wt.wallet_type,
        wt.created_at,
        COALESCE(c1.status, c2.status, 'validated') AS status,
        -- Source du bonus (filleul/parrain)
        COALESCE(
          sm1.first_name || ' ' || sm1.last_name,
          sm2.first_name || ' ' || sm2.last_name,
          sm3.first_name || ' ' || sm3.last_name,
          sm_tsend.first_name || ' ' || sm_tsend.last_name,
          sm_trecv.first_name || ' ' || sm_trecv.last_name
        ) AS source_name,
        COALESCE(sm1.unique_id, sm2.unique_id, sm3.unique_id,
                 sm_tsend.unique_id, sm_trecv.unique_id)              AS source_unique_id,
        COALESCE(c1.period,        c2.period,        c3.period)        AS comm_period,
        NULL AS package_name,
        NULL AS product_type,
        NULL AS payment_method
      FROM wallet_transactions wt
      LEFT JOIN pending_wallet_entries pwe ON pwe.id  = wt.reference_id
      LEFT JOIN commissions c1  ON c1.id  = pwe.commission_id
      LEFT JOIN members     sm1 ON sm1.id = c1.source_member_id
      LEFT JOIN commissions c2  ON c2.id  = wt.reference_id
      LEFT JOIN members     sm2 ON sm2.id = c2.source_member_id
      LEFT JOIN commissions c3  ON c3.member_id = wt.member_id
                                AND c3.type      = wt.transaction_type
                                AND c3.amount    = wt.amount
                                AND c1.id IS NULL AND c2.id IS NULL
      LEFT JOIN members     sm3     ON sm3.id     = c3.source_member_id
      -- Transferts entre membres : expéditeur (pour le créditeur) ou destinataire (pour le débiteur)
      LEFT JOIN wallet_transfers wtr     ON wtr.id = wt.reference_id
      LEFT JOIN members sm_tsend ON sm_tsend.id = wtr.sender_id    AND wt.transaction_type = 'credit_transfer'
      LEFT JOIN members sm_trecv ON sm_trecv.id = wtr.recipient_id AND wt.transaction_type = 'debit_transfer'
      WHERE wt.member_id = ?

      UNION ALL

      -- ── Source 2 : achats de packages et upgrades ──
      SELECT
        po.id,
        CASE WHEN po.product_type = 'upgrade' THEN 'package_upgrade'
             ELSE 'package_purchase' END     AS tx_type,
        'purchase'       AS category,
        -po.amount_usd   AS amount,        -- débit (sortie d'argent)
        NULL             AS balance_before,
        NULL             AS balance_after,
        CASE WHEN po.product_type = 'upgrade'
             THEN 'Upgrade → ' || COALESCE(p.name, 'Package')
             ELSE 'Achat package : ' || COALESCE(p.name, 'Package')
        END              AS description,
        'external'       AS wallet_type,
        po.created_at,
        po.status,
        NULL AS source_name,
        NULL AS source_unique_id,
        NULL AS comm_period,
        p.name           AS package_name,
        po.product_type  AS product_type,
        po.payment_method AS payment_method
      FROM package_orders po
      LEFT JOIN packages p ON p.id = po.package_id
      WHERE po.member_id = ?

      UNION ALL

      -- ── Source 3 : achats de licence ──
      SELECT
        fl.id,
        'license_purchase' AS tx_type,
        'purchase'         AS category,
        -fl.price_usd      AS amount,
        NULL AS balance_before,
        NULL AS balance_after,
        'Achat licence annuelle' AS description,
        'external'         AS wallet_type,
        fl.created_at,
        fl.status,
        NULL AS source_name,
        NULL AS source_unique_id,
        NULL AS comm_period,
        'Licence annuelle' AS package_name,
        'license'          AS product_type,
        fl.payment_method  AS payment_method
      FROM finstrategia_licenses fl
      WHERE fl.member_id = ?

      UNION ALL

      -- ── Source 4 : retraits ──
      SELECT
        wd.id,
        'withdrawal'       AS tx_type,
        'withdrawal'       AS category,
        -wd.net_amount     AS amount,
        NULL AS balance_before,
        NULL AS balance_after,
        'Retrait — ' || COALESCE(wd.paypal_email, 'PayPal') AS description,
        'principal'        AS wallet_type,
        wd.created_at,
        wd.status,
        NULL AS source_name,
        NULL AS source_unique_id,
        NULL AS comm_period,
        NULL AS package_name,
        NULL AS product_type,
        'paypal'           AS payment_method
      FROM withdrawals wd
      WHERE wd.member_id = ?

      UNION ALL

      -- ── Source 5 : Crédit de Croissance (wallet CC — non retirable) ──
      -- Le CC ne passe jamais par wallet_transactions (il est dans credit_croissance).
      -- On l'expose ici pour que le membre voit son CC dans l'historique Transactions.
      SELECT
        cc.id,
        'credit_croissance' AS tx_type,
        'wallet'            AS category,
        cc.amount,
        NULL AS balance_before,
        NULL AS balance_after,
        'Crédit de Croissance — ' || cc.period
          || CASE cc.status
               WHEN 'held'      THEN ' · En attente (disponible ' || substr(cc.available_at,1,7) || ')'
               WHEN 'available' THEN ' · Disponible'
               WHEN 'used'      THEN ' · Utilisé'
               WHEN 'expired'   THEN ' · Expiré'
               ELSE ''
             END            AS description,
        'cc'                AS wallet_type,
        cc.created_at,
        CASE cc.status
          WHEN 'held'      THEN 'pending'
          WHEN 'available' THEN 'validated'
          WHEN 'used'      THEN 'validated'
          WHEN 'expired'   THEN 'cancelled'
          ELSE cc.status
        END                 AS status,
        NULL AS source_name,
        NULL AS source_unique_id,
        cc.period           AS comm_period,
        NULL AS package_name,
        NULL AS product_type,
        NULL AS payment_method
      FROM credit_croissance cc
      WHERE cc.member_id = ?

      UNION ALL

      -- ── Source 6 : achats de formations campus ──
      SELECT
        cco.id,
        'campus_purchase'  AS tx_type,
        'purchase'         AS category,
        -cco.amount_usd    AS amount,
        NULL AS balance_before,
        NULL AS balance_after,
        'Achat formation : ' || COALESCE(cc2.title, cco.course_id) AS description,
        CASE cco.payment_method
          WHEN 'wallet' THEN 'principal'
          ELSE 'external'
        END                AS wallet_type,
        cco.created_at,
        cco.status,
        NULL AS source_name,
        NULL AS source_unique_id,
        NULL AS comm_period,
        COALESCE(cc2.title, cco.course_id) AS package_name,
        'campus_course'    AS product_type,
        cco.payment_method AS payment_method
      FROM campus_course_orders cco
      LEFT JOIN campus_courses cc2 ON cc2.id = cco.course_id
      WHERE cco.member_id = ?

    ) unified
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `

  const countSQL = `
    SELECT (
      SELECT COUNT(*) FROM wallet_transactions      WHERE member_id = ?
    ) + (
      SELECT COUNT(*) FROM package_orders           WHERE member_id = ?
    ) + (
      SELECT COUNT(*) FROM finstrategia_licenses    WHERE member_id = ?
    ) + (
      SELECT COUNT(*) FROM withdrawals              WHERE member_id = ?
    ) + (
      SELECT COUNT(*) FROM credit_croissance        WHERE member_id = ?
    ) + (
      SELECT COUNT(*) FROM campus_course_orders     WHERE member_id = ?
    ) AS total
  `

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(unifiedSQL)
      .bind(memberId, memberId, memberId, memberId, memberId, memberId, limit, offset)
      .all(),
    c.env.DB.prepare(countSQL)
      .bind(memberId, memberId, memberId, memberId, memberId, memberId)
      .first() as any,
  ])

  const transactions = (rows.results || []).map((t: any) => ({
    ...t,
    direction: (t.amount ?? 0) >= 0 ? 'credit' : 'debit',
  }))

  return c.json({ transactions, total: countRow?.total || transactions.length })
  } catch (err: any) {
    console.error('[/transactions] Erreur:', err?.message || err)
    return c.json({ error: err?.message || 'Erreur lors du chargement des transactions', transactions: [], total: 0 }, 500)
  }
})

// GET /api/members/wallet-history?type=principal|pending|cc|rs&page=1&per_page=50
// Retourne l'historique des mouvements d'un wallet spécifique
members.get('/wallet-history', async (c) => {
  const memberId = c.get('memberId' as any)
  const { type = 'principal', page = '1', per_page = '50' } = c.req.query()
  const limit = parseInt(per_page)
  const offset = (parseInt(page) - 1) * limit

  if (type === 'principal') {
    // Source principale : wallet_transactions enrichies avec source (même logique que /transactions)
    const [txRows, txCount] = await Promise.all([
      c.env.DB.prepare(`
        SELECT wt.id, wt.transaction_type, wt.amount, wt.balance_before, wt.balance_after,
               wt.description, wt.reference_id, wt.created_at, 'principal' AS wallet_type,
               COALESCE(c1.period,           c2.period,           c3.period)           AS comm_period,
               COALESCE(c1.source_member_id, c2.source_member_id, c3.source_member_id) AS source_member_id,
               COALESCE(sm1.first_name || ' ' || sm1.last_name,
                        sm2.first_name || ' ' || sm2.last_name,
                        sm3.first_name || ' ' || sm3.last_name,
                        sm_tsend.first_name || ' ' || sm_tsend.last_name,
                        sm_trecv.first_name || ' ' || sm_trecv.last_name)             AS source_name,
               COALESCE(sm1.unique_id, sm2.unique_id, sm3.unique_id,
                        sm_tsend.unique_id, sm_trecv.unique_id)                      AS source_unique_id,
               COALESCE(sm1.current_rank, sm2.current_rank, sm3.current_rank)        AS source_rank
        FROM wallet_transactions wt
        LEFT JOIN pending_wallet_entries pwe ON pwe.id        = wt.reference_id
        LEFT JOIN commissions            c1  ON c1.id         = pwe.commission_id
        LEFT JOIN members                sm1 ON sm1.id        = c1.source_member_id
        LEFT JOIN commissions            c2  ON c2.id         = wt.reference_id
        LEFT JOIN members                sm2 ON sm2.id        = c2.source_member_id
        LEFT JOIN commissions            c3  ON c3.member_id  = wt.member_id
                                            AND c3.type       = wt.transaction_type
                                            AND c3.amount     = wt.amount
                                            AND c1.id IS NULL AND c2.id IS NULL
        LEFT JOIN members                sm3     ON sm3.id     = c3.source_member_id
        -- Transferts entre membres
        LEFT JOIN wallet_transfers       wtr     ON wtr.id = wt.reference_id
        LEFT JOIN members                sm_tsend ON sm_tsend.id = wtr.sender_id    AND wt.transaction_type = 'credit_transfer'
        LEFT JOIN members                sm_trecv ON sm_trecv.id = wtr.recipient_id AND wt.transaction_type = 'debit_transfer'
        WHERE wt.member_id = ? AND wt.wallet_type = 'principal'
        ORDER BY wt.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(memberId, limit, offset).all(),
      c.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM wallet_transactions WHERE member_id = ? AND wallet_type = 'principal'`
      ).bind(memberId).first() as any,
    ])

    // Libellés lisibles pour les transaction_type techniques (Q77)
    const TX_TYPE_LABELS: Record<string, string> = {
      prime_leadership_daily:            'Prime de Leadership — versement journalier',
      bonus_influence_daily:             "Bonus d'Influence — versement journalier",
      bonus_rayonnement_daily:           'Bonus de Rayonnement — versement journalier',
      valorisation_recommandation_daily: 'Valorisation Recommandation — versement journalier',
      fast_start_daily:                  'Fast Start Bonus — versement journalier',
      prime_leadership:                  'Prime de Leadership',
      bonus_influence:                   "Bonus d'Influence",
      bonus_rayonnement:                 'Bonus de Rayonnement',
      valorisation_recommandation:       'Valorisation Recommandation',
      fast_start:                        'Fast Start Bonus',
      credit_croissance:                 'Crédit de Croissance',
      reserve_strategique:               'Réserve Stratégique',
      withdrawal:                        'Retrait PayPal',
      retrait_paypal:                    'Retrait PayPal',
      credit_transfer:                   'Virement reçu',
      debit_transfer:                    'Libération vers portefeuille',
      upgrade_cancel:                    'Annulation upgrade',
      admin_credit:                      'Crédit administrateur',
      admin_debit:                       'Débit administrateur',
      reconciliation:                    'Réconciliation',
    }

    // Enrichir : direction selon le signe du montant + libellé lisible
    const enriched = (txRows.results || []).map((t: any) => ({
      ...t,
      direction:  t.amount >= 0 ? 'credit' : 'debit',
      type_label: TX_TYPE_LABELS[t.transaction_type] || t.transaction_type,
    }))

    // Si aucune transaction dans wallet_transactions, fallback sur commissions + retraits
    if (enriched.length === 0) {
      const [commRows, wdRows] = await Promise.all([
        c.env.DB.prepare(`
          SELECT 'credit' AS direction, id, amount,
                 type AS transaction_type, description, created_at
          FROM commissions
          WHERE member_id = ?
            AND type NOT IN ('credit_croissance','reserve_strategique')
          ORDER BY created_at DESC LIMIT 200
        `).bind(memberId).all(),
        c.env.DB.prepare(`
          SELECT 'debit' AS direction, id, net_amount AS amount,
                 'retrait_paypal' AS transaction_type,
                 paypal_email AS description, created_at
          FROM withdrawals WHERE member_id = ?
          ORDER BY created_at DESC LIMIT 200
        `).bind(memberId).all(),
      ])
      const all = [...(commRows.results || []), ...(wdRows.results || [])]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      return c.json({ type, transactions: all.slice(offset, offset + limit), total: all.length })
    }

    return c.json({ type, transactions: enriched, total: (txCount?.cnt || 0) })
  }

  if (type === 'pending') {
    // Wallet en attente : entrées pending_wallet_entries + mouvements wallet_transactions pending
    const [pendingEntries, pendingTx] = await Promise.all([
      c.env.DB.prepare(`
        SELECT pwe.id, pwe.commission_type, pwe.period, pwe.total_amount, pwe.amount_per_day,
               pwe.days_in_month, pwe.days_paid, pwe.eligible_date, pwe.start_date, pwe.status,
               pwe.last_paid_at, pwe.created_at,
               sm.first_name || ' ' || sm.last_name AS source_name,
               sm.unique_id                         AS source_unique_id,
               sm.current_rank                      AS source_rank,
               c.rank_at_time                       AS commission_rank
        FROM pending_wallet_entries pwe
        LEFT JOIN commissions c  ON c.id  = pwe.commission_id
        LEFT JOIN members     sm ON sm.id = c.source_member_id
        WHERE pwe.member_id = ? AND pwe.status IN ('pending_release', 'active')
        ORDER BY pwe.created_at DESC
      `).bind(memberId).all(),
      c.env.DB.prepare(`
        SELECT id, transaction_type, amount, balance_before, balance_after,
               description, reference_id, created_at
        FROM wallet_transactions
        WHERE member_id = ? AND wallet_type = 'pending'
        ORDER BY created_at DESC LIMIT ? OFFSET ?
      `).bind(memberId, limit, offset).all(),
    ])

    // Labels lisibles pour les types de commission
    const COMMISSION_TYPE_LABELS: Record<string, string> = {
      prime_leadership:            'Prime de Leadership',
      bonus_influence:             "Bonus d'Influence",
      bonus_rayonnement:           'Bonus de Rayonnement',
      valorisation_recommandation: 'Valorisation Recommandation',
      fast_start:                  'Fast Start Bonus',
      credit_croissance:           'Crédit de Croissance',
      reserve_strategique:         'Réserve Stratégique',
    }
    // Labels lisibles pour les statuts
    const STATUS_LABELS: Record<string, string> = {
      pending_release: 'En attente (14j)',
      active:          'En cours de libération',
      completed:       'Entièrement libéré',
      cancelled:       'Annulé',
    }

    const enrichedEntries = (pendingEntries.results || []).map((e: any) => {
      const released   = Math.min(e.total_amount, (e.amount_per_day || 0) * (e.days_paid || 0))
      const remaining  = Math.max(0, e.total_amount - released)
      const progress   = e.days_in_month > 0 ? Math.round((e.days_paid / e.days_in_month) * 100) : 0
      const daysPaid   = e.days_paid || 0
      const daysLeft   = Math.max(0, (e.days_in_month || 0) - daysPaid)

      // Calculer end_date = start_date + days_in_month jours
      let endDate: string | null = null
      if (e.start_date && e.days_in_month) {
        const startMs = new Date(e.start_date).getTime()
        const endMs   = startMs + (e.days_in_month - 1) * 24 * 60 * 60 * 1000
        endDate = new Date(endMs).toISOString().substring(0, 10)
      }

      // Message explicatif selon le statut
      let status_message = ''
      if (e.status === 'pending_release') {
        const eligDate = e.eligible_date ? new Date(e.eligible_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
        status_message = `Votre commission est en attente. La libération commencera le ${eligDate}. Un rattrapage de ${daysPaid === 0 ? 'tous les jours écoulés' : `${daysPaid} jours`} sera versé ce jour-là.`
      } else if (e.status === 'active') {
        status_message = `Libération en cours — ${e.amount_per_day?.toFixed(2) || '0'} $/jour. ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}.`
      } else if (e.status === 'completed') {
        status_message = 'Commission entièrement libérée dans votre portefeuille disponible.'
      }

      return {
        ...e,
        // Champs calculés
        amount_released:  released,
        amount_remaining: remaining,
        progress_pct:     progress,
        days_remaining:   daysLeft,
        end_date:         endDate,
        // Labels lisibles
        type_label:       COMMISSION_TYPE_LABELS[e.commission_type] || e.commission_type,
        status_label:     STATUS_LABELS[e.status] || e.status,
        status_message,
      }
    })

    return c.json({
      type,
      transactions: enrichedEntries,
      pending_movements: pendingTx.results || [],
      total: (pendingEntries.results || []).length
    })
  }

  if (type === 'cc') {
    // Retourne le journal cc_transactions (crédit/débit) + solde + crédits actifs
    const [txRows, txTotal, credits, balance] = await Promise.all([
      c.env.DB.prepare(`
        SELECT id, type, amount, balance_after, label, reference_id, reference_type, period, created_at
        FROM cc_transactions WHERE member_id = ?
        ORDER BY created_at DESC LIMIT ? OFFSET ?
      `).bind(memberId, limit, offset).all(),
      c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM cc_transactions WHERE member_id=?`).bind(memberId).first() as any,
      c.env.DB.prepare(`
        SELECT id, amount, used_amount, (amount - used_amount) AS remaining,
               period, status, available_at, expires_at, created_at
        FROM credit_croissance WHERE member_id = ? AND status IN ('held','available')
        ORDER BY available_at ASC
      `).bind(memberId).all(),
      getCCBalance(c.env.DB, memberId),
    ])
    return c.json({
      type,
      transactions: txRows.results || [],
      total: txTotal?.cnt || 0,
      credits: credits.results || [],
      balance,
    })
  }

  if (type === 'rs') {
    const [rows, total] = await Promise.all([
      c.env.DB.prepare(`
        SELECT id, amount, period, source_commission_id,
               abondement_rate, status, locked_until, unlocked_at, created_at
        FROM reserve_strategique WHERE member_id = ?
        ORDER BY created_at DESC LIMIT ? OFFSET ?
      `).bind(memberId, limit, offset).all(),
      c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM reserve_strategique WHERE member_id=?`).bind(memberId).first() as any
    ])
    return c.json({ type, transactions: rows.results, total: (total?.cnt || 0) })
  }

  if (type === 'luxia') {
    // Wallet Luxia = dreamiles_transactions
    const [rows, total] = await Promise.all([
      c.env.DB.prepare(`
        SELECT id, type, dreamiles, usd_amount, description, status, expires_at, created_at
        FROM dreamiles_transactions WHERE member_id = ?
        ORDER BY created_at DESC LIMIT ? OFFSET ?
      `).bind(memberId, limit, offset).all(),
      c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM dreamiles_transactions WHERE member_id=?`).bind(memberId).first() as any,
    ])
    const wallet = await c.env.DB.prepare(`SELECT * FROM dreamiles_wallet WHERE member_id = ?`).bind(memberId).first() as any
    return c.json({ type, transactions: rows.results, total: (total?.cnt || 0), wallet })
  }

  return c.json({ error: 'Type de wallet invalide. Utilisez: principal, pending, cc, rs, luxia' }, 400)
})

// GET /api/members/commissions/:pweId/calendar
// Retourne le calendrier jour-par-jour d'une entrée PWE (Q39/Q40)
members.get('/commissions/:pweId/calendar', async (c) => {
  const memberId = c.get('memberId' as any)
  const pweId    = c.req.param('pweId')

  const entry = await c.env.DB.prepare(
    `SELECT id, commission_type, period, total_amount, amount_per_day,
            days_in_month, days_paid, eligible_date, start_date, status, created_at
     FROM pending_wallet_entries
     WHERE id = ? AND member_id = ?`
  ).bind(pweId, memberId).first() as any

  if (!entry) return c.json({ error: 'Commission introuvable' }, 404)

  const COMM_LABELS: Record<string, string> = {
    prime_leadership:            'Prime de Leadership',
    bonus_influence:             "Bonus d'Influence",
    bonus_rayonnement:           'Bonus de Rayonnement',
    valorisation_recommandation: 'Valorisation Recommandation',
    fast_start:                  'Fast Start Bonus',
    credit_croissance:           'Crédit de Croissance',
    reserve_strategique:         'Réserve Stratégique',
  }

  // Construire la liste de chaque jour
  const startMs    = new Date(entry.start_date).getTime()
  const eligMs     = new Date(entry.eligible_date).getTime()
  const apd        = entry.amount_per_day || 0
  const totalDays  = entry.days_in_month || 30
  const daysPaid   = entry.days_paid || 0

  // Récupérer les transactions réelles versées pour cette entrée
  const realTx = await c.env.DB.prepare(
    `SELECT amount, created_at, description
     FROM wallet_transactions
     WHERE reference_id = ? AND wallet_type = 'principal' AND amount > 0
     ORDER BY created_at ASC`
  ).bind(pweId).all()
  const realTxList = (realTx.results || []) as any[]

  const calendar: Array<{
    day_index: number
    date: string
    status: 'paid' | 'pending' | 'waiting'
    amount: number
    is_catchup: boolean
    note: string
  }> = []

  // Indice du jour éligible dans le mois
  const eligDayIndex = Math.floor((eligMs - startMs) / (24 * 60 * 60 * 1000))

  for (let i = 0; i < totalDays; i++) {
    const dayMs   = startMs + i * 24 * 60 * 60 * 1000
    const dateStr = new Date(dayMs).toISOString().substring(0, 10)
    const isPaid  = i < daysPaid
    const isWaiting = dayMs < eligMs
    const isCatchup = i === eligDayIndex && eligDayIndex > 0 && daysPaid > 0 && i < daysPaid

    let note = ''
    if (isWaiting && !isPaid)      note = 'Délai 14 jours — pas encore éligible'
    else if (!isPaid)              note = 'Versement à venir'
    else if (isCatchup)            note = 'Rattrapage versé (jours précédents inclus)'
    else                           note = 'Versé'

    calendar.push({
      day_index:  i + 1,
      date:       dateStr,
      status:     isPaid ? 'paid' : (isWaiting ? 'waiting' : 'pending'),
      amount:     apd,
      is_catchup: isCatchup,
      note,
    })
  }

  // Montants cumulatifs
  const totalReleased  = Math.min(entry.total_amount, apd * daysPaid)
  const totalRemaining = Math.max(0, entry.total_amount - totalReleased)

  return c.json({
    pwe_id:          entry.id,
    commission_type: entry.commission_type,
    type_label:      COMM_LABELS[entry.commission_type] || entry.commission_type,
    period:          entry.period,
    total_amount:    entry.total_amount,
    amount_per_day:  apd,
    days_in_month:   totalDays,
    days_paid:       daysPaid,
    days_remaining:  Math.max(0, totalDays - daysPaid),
    eligible_date:   entry.eligible_date,
    start_date:      entry.start_date,
    end_date:        new Date(startMs + (totalDays - 1) * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    status:          entry.status,
    total_released:  totalReleased,
    total_remaining: totalRemaining,
    progress_pct:    totalDays > 0 ? Math.round((daysPaid / totalDays) * 100) : 0,
    calendar,
    real_transactions: realTxList,
  })
})

// POST /api/members/withdraw — Demande de retrait (paramètres 100% depuis DB)
// W1 — Retrait uniquement sur wallet_balance (portefeuille retirable)
// Méthodes: paypal | bank_transfer | crypto
members.post('/withdraw', async (c) => {
  const memberId = c.get('memberId' as any)
  const body = await c.req.json()
  const { amount, pin } = body

  // Méthode de paiement (défaut: paypal pour compatibilité ascendante)
  const payoutMethod: string = body.payout_method || 'paypal'

  if (!amount || !pin)
    return c.json({ error: 'Champs requis manquants (amount, pin)' }, 400)

  // Valider la méthode de paiement
  const validMethods = ['paypal', 'bank_transfer', 'crypto']
  if (!validMethods.includes(payoutMethod))
    return c.json({ error: 'Méthode de paiement invalide (paypal, bank_transfer, crypto)' }, 400)

  // Extraire les coordonnées selon la méthode
  let payoutDetails: Record<string, string> = {}
  if (payoutMethod === 'paypal') {
    const email = body.paypal_email || body.payout_paypal_email
    if (!email) return c.json({ error: 'Email PayPal requis' }, 400)
    payoutDetails = { email }
  } else if (payoutMethod === 'bank_transfer') {
    const { payout_bank_holder, payout_bank_iban, payout_bank_bic, payout_bank_name,
            payout_bank_account, payout_bank_address, payout_bank_city,
            payout_bank_country, payout_bank_swift } = body
    if (!payout_bank_holder || !payout_bank_iban || !payout_bank_bic)
      return c.json({ error: 'Virement bancaire: titulaire, IBAN et BIC obligatoires' }, 400)
    payoutDetails = {
      holder:  payout_bank_holder,
      iban:    payout_bank_iban,
      bic:     payout_bank_bic,
      bank:    payout_bank_name    || '',
      account: payout_bank_account || '',
      address: payout_bank_address || '',
      city:    payout_bank_city    || '',
      country: payout_bank_country || '',
      swift:   payout_bank_swift   || '',
    }
  } else if (payoutMethod === 'crypto') {
    const { payout_crypto_address, payout_crypto_network, payout_crypto_currency } = body
    if (!payout_crypto_address || !payout_crypto_network || !payout_crypto_currency)
      return c.json({ error: 'Crypto: adresse, réseau et devise obligatoires' }, 400)
    payoutDetails = {
      address:  payout_crypto_address,
      network:  payout_crypto_network,
      currency: payout_crypto_currency,
    }
  }

  // ── LIRE TOUTE LA CONFIG RETRAIT EN UNE SEULE REQUÊTE ───────────────────
  const wdConfigRows = await c.env.DB.prepare(
    `SELECT key, value FROM compensation_config
     WHERE key IN ('withdrawal_enabled','withdrawal_allowed_days','withdrawal_disabled_msg',
                   'withdrawal_fee_type','withdrawal_fee_pct','withdrawal_fee_fixed','withdrawal_max_amount',
                   'withdrawal_max_per_month','withdrawal_kyc_min_level','min_withdrawal',
                   'withdrawal_min_remaining_balance')`
  ).all() as any
  const wdCfg: Record<string, string> = {}
  for (const row of wdConfigRows.results) wdCfg[row.key] = row.value

  // ── VÉRIFICATION : retraits activés ─────────────────────────────────────
  if ((wdCfg['withdrawal_enabled'] ?? '1') === '0') {
    return c.json({
      error: wdCfg['withdrawal_disabled_msg'] || 'Les retraits sont temporairement suspendus.'
    }, 403)
  }

  // ── VÉRIFICATION : jour autorisé ─────────────────────────────────────────
  const allowedDaysStr = wdCfg['withdrawal_allowed_days'] ?? '3'
  const allowedDays = allowedDaysStr.split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d))
  const JOURS_FR = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']
  const JOURS_LABELS: Record<number,string> = {0:'dimanche',1:'lundi',2:'mardi',3:'mercredi',4:'jeudi',5:'vendredi',6:'samedi'}
  const today = new Date()
  const dayOfWeek = today.getDay()

  if (allowedDays.length > 0 && !allowedDays.includes(dayOfWeek)) {
    const joursAutorisesLabels = allowedDays.map(d => JOURS_LABELS[d] ?? `jour ${d}`).join(', ')
    const nextAllowedDate = getNextAllowedDay(allowedDays)
    return c.json({
      error: `Les retraits ne sont autorisés que le(s) : ${joursAutorisesLabels}. Aujourd'hui c'est ${JOURS_FR[dayOfWeek]}.`,
      next_allowed_date: nextAllowedDate
    }, 403)
  }

  const member = await c.env.DB.prepare(`SELECT * FROM members WHERE id = ?`).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  // ── VÉRIFICATION : KYC obligatoire ──────────────────────────────────────
  const kycMinLevel = parseInt(wdCfg['withdrawal_kyc_min_level'] ?? '1', 10)
  if (kycMinLevel > 0) {
    if (member.kyc_status !== 'verified')
      return c.json({ error: 'KYC non vérifié. Veuillez compléter votre vérification d\'identité.' }, 403)
    if ((member.kyc_level ?? 0) < kycMinLevel)
      return c.json({ error: `Niveau KYC insuffisant. Niveau ${kycMinLevel} minimum requis.` }, 403)
  }

  // ── VÉRIFICATION : PIN ───────────────────────────────────────────────────
  if (!member.pin_hash) return c.json({ error: 'PIN non configuré. Définissez votre PIN dans votre profil.' }, 403)
  const validPin = await verifyPassword(pin, member.pin_hash)
  if (!validPin) return c.json({ error: 'PIN incorrect' }, 401)

  // ── ANTI-DOUBLON : 1 seul retrait pending/processing à la fois ──────────
  const existingPending = await c.env.DB.prepare(
    `SELECT id FROM withdrawals WHERE member_id = ? AND status IN ('pending', 'processing') LIMIT 1`
  ).bind(memberId).first() as any
  if (existingPending) {
    return c.json({
      error: 'Vous avez déjà une demande de retrait en cours de traitement. Attendez qu\'elle soit traitée avant d\'en soumettre une nouvelle.'
    }, 409)
  }

  // ── PLAFONDS KYC par niveau ──────────────────────────────────────────────
  const kycLevel = member.kyc_level ?? 0
  const [lvl0Row, lvl1Row, lvl2Row, lvl3Row] = await Promise.all([
    c.env.DB.prepare(`SELECT value FROM kyc_config WHERE key = 'withdrawal_level_0'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM kyc_config WHERE key = 'withdrawal_level_1'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM kyc_config WHERE key = 'withdrawal_level_2'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM kyc_config WHERE key = 'withdrawal_level_3'`).first() as any,
  ])
  const kycLimits: Record<number, number> = {
    0: parseFloat(lvl0Row?.value ?? '0'),
    1: parseFloat(lvl1Row?.value ?? '500'),
    2: parseFloat(lvl2Row?.value ?? '5000'),
    3: parseFloat(lvl3Row?.value ?? '0'),
  }
  const kycMax = kycLimits[kycLevel] ?? 0
  if (kycMax > 0 && amount > kycMax) {
    return c.json({
      error: `Votre niveau KYC (niveau ${kycLevel}) limite les retraits à $${kycMax.toFixed(2)} par transaction.`
    }, 403)
  }
  if (kycMax === 0 && kycLevel === 0 && kycMinLevel > 0) {
    return c.json({
      error: 'Les retraits nécessitent un KYC vérifié (niveau 1 minimum). Veuillez compléter votre vérification d\'identité.'
    }, 403)
  }

  // ── VÉRIFICATION : montant maximum global ───────────────────────────────
  const maxAmount = parseFloat(wdCfg['withdrawal_max_amount'] ?? '0')
  if (maxAmount > 0 && amount > maxAmount) {
    return c.json({ error: `Montant maximum par demande : $${maxAmount}` }, 400)
  }

  // ── VÉRIFICATION : montant minimum ──────────────────────────────────────
  const minWithdrawal = parseFloat(wdCfg['min_withdrawal'] ?? '50')
  if (amount < minWithdrawal)
    return c.json({ error: `Montant minimum de retrait : $${minWithdrawal}` }, 400)

  // ── VÉRIFICATION : limite mensuelle ─────────────────────────────────────
  const maxPerMonth = parseInt(wdCfg['withdrawal_max_per_month'] ?? '0', 10)
  if (maxPerMonth > 0) {
    const monthStart = new Date()
    monthStart.setDate(1); monthStart.setHours(0,0,0,0)
    const countRow = await c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM withdrawals
       WHERE member_id = ? AND created_at >= ? AND status NOT IN ('rejected')`
    ).bind(memberId, monthStart.toISOString().substring(0, 10)).first() as any
    if ((countRow?.cnt ?? 0) >= maxPerMonth) {
      return c.json({
        error: `Vous avez atteint la limite de ${maxPerMonth} retrait(s) par mois.`
      }, 429)
    }
  }

  // W1 — Vérifier le wallet_balance (retirable, pas le pending)
  if (member.wallet_balance < amount)
    return c.json({ error: `Solde insuffisant. Solde disponible : $${member.wallet_balance.toFixed(2)}` }, 400)

  // ── CALCUL DES FRAIS ─────────────────────────────────────────────────────
  const feePct   = parseFloat(wdCfg['withdrawal_fee_pct']   ?? '0')
  const feeFixed = parseFloat(wdCfg['withdrawal_fee_fixed'] ?? '0')
  const fee      = Math.round((amount * feePct / 100 + feeFixed) * 100) / 100
  const netAmount = Math.round((amount - fee) * 100) / 100

  const processingTime = wdCfg['withdrawal_processing_time'] ?? '24-48h'

  const id = generateId()
  // Compatibilité: paypal_email reste le champ historique, on y stocke l'email PayPal si applicable
  const legacyPaypalEmail = payoutMethod === 'paypal' ? (payoutDetails.email || '') : ''
  await c.env.DB.prepare(
    `INSERT INTO withdrawals (id, member_id, amount, fee, net_amount, paypal_email,
                             pin_verified, status, payment_method, payout_method, payout_details)
     VALUES (?, ?, ?, ?, ?, ?, 1, 'pending', ?, ?, ?)`
  ).bind(id, memberId, amount, fee, netAmount, legacyPaypalEmail,
         payoutMethod, payoutMethod, JSON.stringify(payoutDetails)).run()

  // W1 — Déduire du wallet_balance et incrémenter pending_withdrawal
  await c.env.DB.prepare(
    `UPDATE members SET wallet_balance = wallet_balance - ?, pending_withdrawal = pending_withdrawal + ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(amount, amount, memberId).run()
  await c.env.DB.prepare(
    `UPDATE wallets SET balance = balance - ?, total_withdrawn = total_withdrawn + ? WHERE member_id = ?`
  ).bind(amount, amount, memberId).run()

  await c.env.DB.prepare(
    `INSERT INTO notifications (id, member_id, type, title, message)
     VALUES (?, ?, 'withdrawal', 'Demande de retrait soumise', ?)`
  ).bind(generateId(), memberId,
    `Votre demande de retrait de $${amount}${fee > 0 ? ` (net : $${netAmount} après frais)` : ''} est en cours de traitement. Paiement sous ${processingTime}.`
  ).run()

  // ── Email confirmation demande de retrait ────────────────
  // NOTE: await direct — executionCtx non disponible dans les sous-routers Hono
  const mbrWd = await c.env.DB.prepare(
    `SELECT first_name, email FROM members WHERE id=?`
  ).bind(memberId).first() as any
  if (mbrWd) {
    await sendEmail(c.env.DB, {
      to: mbrWd.email, toName: mbrWd.first_name,
      templateId: 'withdrawal_requested',
      variables: {
        prenom:           mbrWd.first_name || '',
        montant:          String(amount),
        montant_net:      String(netAmount),
        devise:           'USD',
        frais:            String(fee),
        delai_traitement: processingTime,
        dashboard_url:    'https://willbeleader.pages.dev',
      }
    }).catch(() => {})
  }

  return c.json({ success: true, withdrawal_id: id, fee, net_amount: netAmount })
})

// Calcule la date du prochain jour autorisé parmi les jours donnés (0=dim … 6=sam)
function getNextAllowedDay(allowedDays: number[]): string {
  if (!allowedDays || allowedDays.length === 0) return ''
  const d = new Date()
  const today = d.getDay()
  // Chercher le prochain jour autorisé dans les 7 prochains jours
  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = (today + offset) % 7
    if (allowedDays.includes(nextDay)) {
      d.setDate(d.getDate() + offset)
      return d.toISOString().substring(0, 10)
    }
  }
  return ''
}

// GET /api/members/packages — Liste des packages + commandes + frais admin CDC v2
members.get('/packages', async (c) => {
  const memberId = c.get('memberId' as any)

  // Packages actifs avec catégorie — exclure la licence (gérée via /license)
  // exclure direct_commission_rate (confidentiel admin, non visible membre)
  const packages = await c.env.DB.prepare(
    `SELECT p.id, p.name, p.slug, p.price_usd, p.bv_value, p.description, p.features,
            p.is_active, p.type, p.category_id, p.pricing_type, p.price_monthly,
            p.display_order, p.currency, p.title, p.includes_license,
            p.payment_mode, p.dreamiles_per_payment, p.bv_per_payment,
            pc.name as category_name, pc.icon as category_icon,
            pc.description as category_description, pc.tag as category_tag
     FROM packages p
     LEFT JOIN package_categories pc ON pc.id = p.category_id
     WHERE p.is_active = 1
       AND p.deleted_at IS NULL
       AND p.slug != 'licence'
     ORDER BY p.display_order ASC, p.price_usd ASC`
  ).all()

  // Commandes du membre — aliases alignés sur ce qu'attend renderPkgCard côté frontend
  // Frontend attend : status, package_id, category, bv_value, price_usd, package_name, validated_at
  const myOrders = await c.env.DB.prepare(
    `SELECT po.id, po.member_id, po.status, po.amount_usd, po.created_at,
            po.validated_at, po.proof_url, po.upgrade_from_package_id,
            po.package_id,
            p.name       AS package_name,
            p.type       AS pkg_type,
            p.category_id AS category,
            p.bv_value   AS bv_value,
            p.price_usd  AS price_usd
     FROM package_orders po
     JOIN packages p ON p.id = po.package_id
     WHERE po.member_id = ? ORDER BY po.created_at DESC LIMIT 20`
  ).bind(memberId).all()

  // Infos frais admin (CDC v2 A10) — afficher dans le checkout
  const [feeAmountRow, feeActiveRow, feeModeRow, memberRow] = await Promise.all([
    c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_amount'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_active'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_mode'`).first() as any,
    c.env.DB.prepare(`SELECT admin_fee_paid, admin_fee_paid_at FROM members WHERE id = ?`).bind(memberId).first() as any,
  ])
  const adminFee = {
    amount:  parseFloat(feeAmountRow?.value || '49'),
    active:  (feeActiveRow?.value || 'true') === 'true',
    mode:    feeModeRow?.value || 'once',
    paid:    !!(memberRow?.admin_fee_paid),
    paid_at: memberRow?.admin_fee_paid_at || null,
  }

  // Toutes les passerelles configurees — retourner par gateway
  const gwRows = await c.env.DB.prepare(
    `SELECT gateway, key, value FROM payment_gateway_config ORDER BY gateway, key`
  ).all()
  const gateways: Record<string, Record<string, string>> = {}
  for (const r of (gwRows.results as any[])) {
    if (!gateways[r.gateway]) gateways[r.gateway] = {}
    gateways[r.gateway][r.key] = r.value
  }

  const licCfgPkg = await getLicenseConfig(c.env.DB)

  return c.json({ packages: packages.results, myOrders: myOrders.results, gateways, adminFee, licensePrice: licCfgPkg.price })
})

// POST /api/members/packages/order — Commander un package
members.post('/packages/order', async (c) => {
  const memberId = c.get('memberId' as any)
  const { package_id, payment_method: _pm = 'manual', product_type = 'package', add_license = false } = await c.req.json()
  // Normaliser v2_manual → manual (compatibilité wizard v2 avec contrainte CHECK DB)
  const payment_method = (_pm === 'v2_manual') ? 'manual' : _pm

  const pkg = await c.env.DB.prepare(`SELECT * FROM packages WHERE id = ? AND is_active = 1`).bind(package_id).first() as any
  if (!pkg) return c.json({ error: 'Package introuvable' }, 404)

  // ── GUARD ANTI-DOUBLON ─────────────────────────────────────────────────────
  // On récupère aussi payment_method, paypal_order_id et linked_license_id
  // pour pouvoir annuler proprement une commande PayPal échouée.
  const existingActive = await c.env.DB.prepare(
    `SELECT id, status, payment_method, paypal_order_id, linked_license_id, created_at, proof_url
     FROM package_orders
     WHERE member_id = ? AND status IN ('pending','proof_submitted') AND activation_done = 0
     LIMIT 1`
  ).bind(memberId).first() as any

  if (existingActive) {
    // ── CAS PASSERELLE ÉLECTRONIQUE ÉCHOUÉE : commande pending jamais capturée ──
    // PayPal, Stripe, CoinPayments créent une commande pending AVANT le paiement.
    // Si le paiement échoue ou est abandonné, la commande reste bloquée en 'pending'.
    // → On annule la commande existante et on laisse l'utilisateur réessayer.
    // v2_psp = toutes les passerelles automatiques V2 (Mollie, etc.) — commande abandonnée avant paiement
    // wallet/internal_wallet = commande wallet créée mais paiement non finalisé (wizard fermé, erreur réseau, etc.)
    // 'manual' en 'pending' (pas encore de preuve) → annulé silencieusement pour permettre un nouvel essai
    // Toute commande pending (quelle que soit la méthode) est annulée silencieusement
    // Seul 'proof_submitted' bloque réellement (preuve déjà envoyée, en attente de validation)
    const isStaleWithoutProof = existingActive.status === 'pending' &&
      !existingActive.proof_url &&
      new Date(existingActive.created_at).getTime() < Date.now() - 72 * 3600 * 1000
    if (existingActive.status === 'pending' || isStaleWithoutProof) {
      // Annuler la commande abandonnée
      await c.env.DB.prepare(
        `UPDATE package_orders
         SET status = 'cancelled', rejection_reason = 'Commande abandonnée — annulée automatiquement', updated_at = datetime('now')
         WHERE id = ?`
      ).bind(existingActive.id).run()

      // Si une licence était liée à cette commande, l'annuler aussi
      if (existingActive.linked_license_id) {
        await c.env.DB.prepare(
          `UPDATE finstrategia_licenses
           SET status = 'cancelled', updated_at = datetime('now')
           WHERE id = ? AND status = 'pending'`
        ).bind(existingActive.linked_license_id).run()
      }
      // On ne retourne pas d'erreur : on laisse la création de la nouvelle commande continuer
    } else {
      // ── CAS NORMAL : commande manuelle en cours (proof_submitted ou pending manuel) ──
      return c.json({
        error: 'Une commande est déjà en cours de traitement.',
        hint:  'Soumettez votre preuve de paiement pour la commande existante, ou attendez sa validation.',
        existing_order_id: existingActive.id,
        existing_status:   existingActive.status,
      }, 409)
    }
  }

  // ── GUARD MÊME CATÉGORIE ───────────────────────────────────────────────────
  if (pkg.category_id) {
    const bestInCat = await c.env.DB.prepare(
      `SELECT MAX(p.bv_value) as best_bv
       FROM package_orders po
       JOIN packages p ON p.id = po.package_id
       WHERE po.member_id = ?
         AND po.status IN ('validated', 'active')
         AND p.category_id = ?
         AND p.slug != 'licence'`
    ).bind(memberId, pkg.category_id).first() as any
    const bestBV = bestInCat?.best_bv || 0
    if (bestBV > 0 && pkg.bv_value <= bestBV) {
      return c.json({
        error: 'Vous possédez déjà un package de niveau supérieur ou égal dans cette catégorie.',
        hint:  'Pour monter en gamme, utilisez la fonction Upgrade. Pour une offre différente, choisissez une autre catégorie.',
        code:  'SAME_CATEGORY_LOWER_OR_EQUAL',
      }, 409)
    }
  }

  // ── FRAIS D'ADMINISTRATION ─────────────────────────────────────────────────
  // admin_fee_mode = 'once'     → frais facturés une seule fois par compte (défaut)
  // admin_fee_mode = 'multiple' → frais facturés à chaque achat
  const [feeActiveRow, feeAmountRow, feeModeRow, memberRow] = await Promise.all([
    c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_active'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_amount'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_mode'`).first() as any,
    c.env.DB.prepare(`SELECT admin_fee_paid FROM members WHERE id = ?`).bind(memberId).first() as any,
  ])
  const feeActive  = (feeActiveRow?.value || 'true') === 'true'
  const feeAmount  = parseFloat(feeAmountRow?.value || '49')
  const feeMode    = feeModeRow?.value || 'once'
  // Mode 'once'     : facturer seulement si pas encore payé
  // Mode 'multiple' : facturer à chaque commande (admin_fee_paid ignoré)
  const shouldCharge = feeActive && (feeMode === 'multiple' || !memberRow?.admin_fee_paid)
  const adminFeeAmount = shouldCharge ? feeAmount : 0

  // ── CRÉER LA COMMANDE PACKAGE ──────────────────────────────────────────────
  const id = generateId()
  await c.env.DB.prepare(
    `INSERT INTO package_orders
       (id, member_id, package_id, price_usd, amount_usd, bv_value, status, payment_method, product_type, admin_fee_amount)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
  ).bind(id, memberId, package_id, pkg.price_usd, pkg.price_usd, pkg.bv_value, payment_method, product_type, adminFeeAmount).run()

  // ── LICENCE ADDITIONNELLE (add_license=true) ───────────────────────────────
  // Si le membre a coché "Ajouter la licence", créer une finstrategia_license
  // en statut 'pending' et la lier à cette commande via linked_license_id.
  // À la validation par l'admin, activateAndReward lira linked_license_id et
  // appellera activateLicense() pour cette licence.
  let licenseId: string | null = null
  let licenseAmount = 0
  if (add_license) {
    // Vérifier que la licence n'est pas déjà active sur ce compte
    const memberLic = await c.env.DB.prepare(
      `SELECT license_active FROM members WHERE id = ?`
    ).bind(memberId).first() as any
    if (!memberLic?.license_active) {
      // Lire le prix depuis compensation_config (pas de hardcode)
      const licCfgForOrder = await getLicenseConfig(c.env.DB)
      licenseId = generateId()
      licenseAmount = licCfgForOrder.price
      await c.env.DB.prepare(
        `INSERT INTO finstrategia_licenses (id, member_id, price_usd, status, payment_method)
         VALUES (?, ?, ?, 'pending', ?)`
      ).bind(licenseId, memberId, licenseAmount, payment_method).run()
      // Lier la licence à la commande
      await c.env.DB.prepare(
        `UPDATE package_orders SET linked_license_id = ? WHERE id = ?`
      ).bind(licenseId, id).run()
    }
    // Si licence déjà active : on ignore silencieusement (pas d'erreur, juste pas de double licence)
  }

  return c.json({
    order_id:       id,
    amount:         pkg.price_usd,
    admin_fee:      adminFeeAmount,
    license_added:  !!licenseId,
    license_amount: licenseAmount,
    total_amount:   pkg.price_usd + adminFeeAmount + licenseAmount,
    package:        pkg,
  })
})

// POST /api/members/packages/upgrade — Upgrader vers un package supérieur (BV différentiel)
// CDC §6 : lors d'un upgrade, seul le BV différentiel (cible - actuel) est propagé.
members.post('/packages/upgrade', async (c) => {
  const memberId = c.get('memberId' as any)
  const { target_package_id, payment_method: _pm2 = 'manual' } = await c.req.json()
  // Normaliser v2_manual → manual (compatibilité wizard v2 avec contrainte CHECK DB)
  const payment_method = (_pm2 === 'v2_manual') ? 'manual' : _pm2

  // 1. Vérifier que le package cible existe et est actif
  const targetPkg = await c.env.DB.prepare(
    `SELECT * FROM packages WHERE id = ? AND is_active = 1`
  ).bind(target_package_id).first() as any
  if (!targetPkg) return c.json({ error: 'Package cible introuvable' }, 404)

  // 2. Trouver le dernier package actif du membre (commande validée/active, non-licence)
  // status='validated' = validé par admin, status='active' = activé via activateAndReward
  const currentOrder = await c.env.DB.prepare(
    `SELECT po.*, p.bv_value as pkg_bv, p.price_usd as pkg_price, p.name as pkg_name, p.id as pkg_id
     FROM package_orders po
     JOIN packages p ON p.id = po.package_id
     WHERE po.member_id = ?
       AND po.status IN ('validated', 'active')
       AND p.slug != 'licence'
       AND po.product_type != 'license'
     ORDER BY po.validated_at DESC, po.created_at DESC LIMIT 1`
  ).bind(memberId).first() as any

  if (!currentOrder) return c.json({ error: 'Aucun package actif à upgrader' }, 400)

  // 3. Valider que le package cible est supérieur en BV
  const currentBV  = currentOrder.pkg_bv || 0
  const targetBV   = targetPkg.bv_value  || 0
  const diffBV     = targetBV - currentBV
  const diffAmount = targetPkg.price_usd - (currentOrder.pkg_price || 0)

  if (diffBV <= 0) return c.json({ error: 'Le package cible doit avoir plus de BV que le package actuel' }, 400)

  // 4. Calculer frais admin selon admin_fee_mode (once/multiple)
  const [feeActiveRow, feeAmountRow, feeModeRow, memberRow] = await Promise.all([
    c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_active'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_amount'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_mode'`).first() as any,
    c.env.DB.prepare(`SELECT admin_fee_paid FROM members WHERE id = ?`).bind(memberId).first() as any,
  ])
  const feeActive      = (feeActiveRow?.value || 'true') === 'true'
  const feeAmount      = parseFloat(feeAmountRow?.value || '49')
  const feeMode        = feeModeRow?.value || 'once'
  const shouldCharge   = feeActive && (feeMode === 'multiple' || !memberRow?.admin_fee_paid)
  const adminFeeAmount = shouldCharge ? feeAmount : 0

  // ── GUARD ANTI-DOUBLON upgrade ────────────────────────────────────────────
  const existingActiveUpgrade = await c.env.DB.prepare(
    `SELECT id, status, payment_method, paypal_order_id, linked_license_id, created_at, proof_url
     FROM package_orders
     WHERE member_id = ? AND status IN ('pending','proof_submitted') AND activation_done = 0
     LIMIT 1`
  ).bind(memberId).first() as any

  if (existingActiveUpgrade) {
    // Commande électronique (PayPal / Stripe / CoinPayments / V2 PSP / wallet) en attente non capturée → annuler silencieusement
    // wallet/internal_wallet = commande wallet créée mais paiement non finalisé (wizard fermé, erreur réseau, etc.)
    // 'manual' en 'pending' (pas encore de preuve soumise) → annulé silencieusement pour permettre un nouvel essai
    // Toute commande pending (quelle que soit la méthode) est annulée silencieusement
    // Seul 'proof_submitted' bloque réellement (preuve déjà envoyée, en attente de validation)
    const isStaleUpgradeWithoutProof = existingActiveUpgrade.status === 'pending' &&
      !existingActiveUpgrade.proof_url &&
      new Date(existingActiveUpgrade.created_at).getTime() < Date.now() - 72 * 3600 * 1000
    if (existingActiveUpgrade.status === 'pending' || isStaleUpgradeWithoutProof) {
      await c.env.DB.prepare(
        `UPDATE package_orders SET status = 'cancelled', rejection_reason = 'Commande abandonnée — annulée automatiquement', updated_at = datetime('now') WHERE id = ?`
      ).bind(existingActiveUpgrade.id).run()
      if (existingActiveUpgrade.linked_license_id) {
        await c.env.DB.prepare(
          `UPDATE finstrategia_licenses SET status = 'cancelled', updated_at = datetime('now') WHERE id = ? AND status = 'pending'`
        ).bind(existingActiveUpgrade.linked_license_id).run()
      }
    } else {
      return c.json({
        error: 'Une commande est déjà en cours de traitement.',
        hint:  'Finalisez ou annulez la commande existante avant de lancer un upgrade.',
        existing_order_id: existingActiveUpgrade.id,
        existing_status:   existingActiveUpgrade.status,
      }, 409)
    }
  }
  // ───────────────────────────────────────────────────────────────────────────

  // 5. Créer la commande d'upgrade avec les colonnes différentielles
  const id = generateId()
  await c.env.DB.prepare(
    `INSERT INTO package_orders
       (id, member_id, package_id, price_usd, amount_usd, bv_value, status, payment_method,
        product_type, upgrade_from_package_id, upgrade_diff_amount, upgrade_diff_bv, admin_fee_amount)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, 'upgrade', ?, ?, ?, ?)`
  ).bind(
    id, memberId, target_package_id,
    targetPkg.price_usd,       // price_usd (NOT NULL)
    Math.max(0, diffAmount),   // amount_usd = montant réellement à payer (différentiel)
    targetBV,                  // bv_value = BV total du nouveau package (stocké pour référence)
    payment_method,
    currentOrder.id,           // upgrade_from_package_id
    Math.max(0, diffAmount),
    diffBV,                    // upgrade_diff_bv = BV effectivement propagé
    adminFeeAmount
  ).run()

  return c.json({
    order_id:          id,
    amount:            Math.max(0, diffAmount),
    admin_fee:         adminFeeAmount,
    total_amount:      Math.max(0, diffAmount) + adminFeeAmount,
    bv_diff:           diffBV,
    current_package:   currentOrder.pkg_name,
    target_package:    targetPkg.name,
    current_bv:        currentBV,
    target_bv:         targetBV,
  })
})

// POST /api/members/packages/order/:id/proof — Soumettre preuve de paiement
members.post('/packages/order/:id/proof', async (c) => {
  const memberId = c.get('memberId' as any)
  const orderId = c.req.param('id')
  const { proof_url } = await c.req.json()

  const order = await c.env.DB.prepare(`SELECT * FROM package_orders WHERE id = ? AND member_id = ?`).bind(orderId, memberId).first() as any
  if (!order) return c.json({ error: 'Commande introuvable' }, 404)

  // ── GUARD : refuser si déjà activée ou déjà annulée ─────────────────────
  if ((order as any).activation_done) return c.json({ error: 'Cette commande est déjà activée.' }, 409)
  if (['cancelled','rejected','validated'].includes((order as any).status)) {
    return c.json({ error: `Cette commande est en statut "${(order as any).status}" et ne peut plus être modifiée.` }, 409)
  }
  // ───────────────────────────────────────────────────────────────────────────

  await c.env.DB.prepare(
    `UPDATE package_orders SET proof_url = ?, status = 'proof_submitted', updated_at = datetime('now') WHERE id = ?`
  ).bind(proof_url, orderId).run()

  // ── Email confirmation réception preuve ──────────────────
  // NOTE: await direct — executionCtx non disponible dans les sous-routers Hono
  const memberForEmail = await c.env.DB.prepare(
    `SELECT m.first_name, m.email, p.name as package_name, po.amount_usd
     FROM members m
     JOIN package_orders po ON po.member_id = m.id
     JOIN packages p ON p.id = po.package_id
     WHERE po.id = ?`
  ).bind(orderId).first() as any
  if (memberForEmail) {
    await sendEmail(c.env.DB, {
      to: memberForEmail.email,
      toName: memberForEmail.first_name,
      templateId: 'package_proof_received',
      variables: {
        prenom:       memberForEmail.first_name || '',
        package_nom:  memberForEmail.package_name || '',
        montant:      String(memberForEmail.amount_usd || ''),
        devise:       'USD',
        dashboard_url: 'https://willbeleader.pages.dev',
      }
    }).catch(() => {})
  }

  return c.json({ success: true })
})

// POST /api/members/packages/submit-proof — Soumettre preuve (v2 wizard simplifié)
// Accepte : { order_id, reference?, proof_url?, proof_data_url? }
// proof_url = URL hébergée (prioritaire — evite D1 SQLITE_TOOBIG)
// proof_data_url = data:image/...;base64,... (legacy — éviter pour les gros fichiers)
members.post('/packages/submit-proof', async (c) => {
  const memberId = c.get('memberId' as any)
  const body = await c.req.json() as any
  const { order_id, reference, proof_url: proofUrlInput, proof_data_url } = body

  if (!order_id) return c.json({ error: 'order_id requis' }, 400)

  const order = await c.env.DB.prepare(
    `SELECT * FROM package_orders WHERE id = ? AND member_id = ?`
  ).bind(order_id, memberId).first() as any
  if (!order) return c.json({ error: 'Commande introuvable' }, 404)
  if (order.activation_done) return c.json({ error: 'Cette commande est déjà activée.' }, 409)
  if (['cancelled','rejected','validated'].includes(order.status)) {
    return c.json({ error: `Commande en statut "${order.status}" — non modifiable.` }, 409)
  }

  // Priorité : proof_url (URL hébergée) > proof_data_url (base64 legacy) > existant
  let proofUrl: string = order.proof_url || ''
  if (proofUrlInput && !proofUrlInput.startsWith('data:')) {
    proofUrl = proofUrlInput  // URL hébergée — priorité absolue
  } else if (proof_data_url && proof_data_url.startsWith('data:')) {
    proofUrl = proof_data_url  // Base64 legacy (déconseillé — risque SQLITE_TOOBIG)
  }

  await c.env.DB.prepare(
    `UPDATE package_orders SET proof_url=?, status='proof_submitted', updated_at=datetime('now') WHERE id=?`
  ).bind(proofUrl || null, order_id).run()

  // Email confirmation
  try {
    const memberForEmail = await c.env.DB.prepare(
      `SELECT m.first_name, m.email, p.name as package_name, po.amount_usd
       FROM members m
       JOIN package_orders po ON po.member_id = m.id
       JOIN packages p ON p.id = po.package_id
       WHERE po.id = ?`
    ).bind(order_id).first() as any
    if (memberForEmail) {
      await sendEmail(c.env.DB, {
        to: memberForEmail.email,
        toName: memberForEmail.first_name,
        templateId: 'package_proof_received',
        variables: {
          prenom: memberForEmail.first_name || '',
          package_nom: memberForEmail.package_name || '',
          montant: String(memberForEmail.amount_usd || ''),
          devise: 'USD',
          dashboard_url: 'https://willbeleader.pages.dev',
        }
      }).catch(() => {})
    }
  } catch (_) {}

  return c.json({ success: true })
})

// GET /api/members/license — Info licence + config (prix, alertes, délai renouvellement anticipé)
members.get('/license', async (c) => {
  const memberId = c.get('memberId' as any)
  const [license, member, licCfg] = await Promise.all([
    c.env.DB.prepare(
      `SELECT * FROM finstrategia_licenses WHERE member_id = ? ORDER BY created_at DESC LIMIT 1`
    ).bind(memberId).first(),
    c.env.DB.prepare(
      `SELECT license_active, license_expires_at FROM members WHERE id = ?`
    ).bind(memberId).first(),
    getLicenseConfig(c.env.DB),
  ])
  return c.json({
    license,
    member,
    license_price:          licCfg.price,
    license_alert_days:     licCfg.alertDays,
    license_renew_early_days: licCfg.renewEarlyDays,
  })
})

// POST /api/members/license/order — Commander une licence
// CDC v2 A10 — Les frais admin s'appliquent sur le PREMIER achat (licence ou package)
//
// ⚠️  SÉCURITÉ : pour PayPal, cette route retourne UNIQUEMENT un intent (montants).
//     La licence n'est PAS créée en DB ici — elle sera créée dans /paypal/capture-order
//     APRÈS confirmation du paiement par PayPal. Cela évite qu'une licence soit
//     activée sans paiement confirmé si l'utilisateur ferme la fenêtre PayPal.
//
//     Pour le flow manuel, le comportement est inchangé : la licence est créée
//     en 'pending' et le membre soumet ensuite sa preuve de paiement.
//
// C3 FIX : Renouvellement anticipé autorisé pendant la fenêtre `license_renew_early_days`
//          avant l'expiration. En dehors de cette fenêtre, si la licence est encore active,
//          la commande est bloquée.
members.post('/license/order', async (c) => {
  const memberId = c.get('memberId' as any)
  const { payment_method: _pm3 = 'manual' } = await c.req.json()
  const payment_method = (_pm3 === 'v2_manual') ? 'manual' : _pm3

  // Lire la config licence (prix + délai renouvellement anticipé)
  const licCfg = await getLicenseConfig(c.env.DB)
  const licensePrice = licCfg.price

  // Vérifier si la licence est active et calculer si le renouvellement anticipé est autorisé
  const memberData = await c.env.DB.prepare(
    `SELECT license_active, license_expires_at, admin_fee_paid FROM members WHERE id = ?`
  ).bind(memberId).first() as any

  if (memberData?.license_active) {
    const now = new Date()
    const expiresAt = memberData.license_expires_at ? new Date(memberData.license_expires_at) : null

    if (expiresAt) {
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000)
      // Bloquer si la licence est active ET que la fenêtre anticipée n'est pas ouverte
      if (daysLeft > licCfg.renewEarlyDays) {
        return c.json({
          error: `Votre licence est encore active. Le renouvellement anticipé est possible uniquement dans les ${licCfg.renewEarlyDays} jours avant l'expiration (expire le ${expiresAt.toLocaleDateString('fr-FR')}, dans ${daysLeft} jours).`,
          days_left: daysLeft,
          renew_early_days: licCfg.renewEarlyDays,
          can_renew_at: new Date(expiresAt.getTime() - licCfg.renewEarlyDays * 86_400_000).toISOString(),
        }, 409)
      }
      // Renouvellement anticipé autorisé : on continue
    } else {
      // Licence active sans date d'expiration connue → bloquer par sécurité
      return c.json({ error: 'Vous possédez déjà une licence active.' }, 409)
    }
  }

  // Calculer les frais admin si c'est le premier achat du membre
  const [feeActiveRow, feeAmountRow] = await Promise.all([
    c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_active'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_amount'`).first() as any,
  ])
  const feeActive      = (feeActiveRow?.value || 'true') === 'true'
  const feeAmount      = parseFloat(feeAmountRow?.value || '49')
  const adminFeeAmount = (feeActive && !memberData?.admin_fee_paid) ? feeAmount : 0

  // ── FLOW PAYPAL : intent uniquement, PAS de ligne en DB ──────────────────
  // La licence sera créée dans /paypal/capture-order après paiement confirmé.
  if (payment_method === 'paypal') {
    return c.json({
      license_id:   null,           // Pas encore de licence en DB
      intent_only:  true,           // Signal pour le frontend
      amount:       licensePrice,
      admin_fee:    adminFeeAmount,
      total_amount: licensePrice + adminFeeAmount,
    })
  }

  // ── FLOW WALLET : paiement immédiat depuis le wallet LEADER ──────
  if (payment_method === 'wallet' || payment_method === 'internal_wallet') {
    const totalNeeded = licensePrice + adminFeeAmount
    // Vérifier le solde wallet
    const walletRow = await c.env.DB.prepare(
      `SELECT balance FROM wallets WHERE member_id = ?`
    ).bind(memberId).first() as any
    const balance = walletRow?.balance ?? 0
    if (balance < totalNeeded) {
      return c.json({
        error: `Solde insuffisant. Disponible : $${Number(balance).toFixed(2)}, Requis : $${totalNeeded.toFixed(2)}`,
      }, 400)
    }
    // Débiter le wallet
    await walletOperation(c.env.DB, memberId, totalNeeded, 'debit', 'debit_order_wallet',
      `Paiement Licence Finstrategia`, undefined)
    // Marquer admin_fee_paid si applicable
    if (adminFeeAmount > 0) {
      await c.env.DB.prepare(
        `UPDATE members SET admin_fee_paid = 1, updated_at = datetime('now') WHERE id = ?`
      ).bind(memberId).run()
    }
    // Créer la licence en DB puis activer immédiatement
    const licId = generateId()
    await c.env.DB.prepare(
      `INSERT INTO finstrategia_licenses (id, member_id, price_usd, status, payment_method, admin_fee_amount) VALUES (?, ?, ?, 'pending', 'wallet', ?)`
    ).bind(licId, memberId, licensePrice, adminFeeAmount).run()
    // Activer via activateAndReward (ne s'applique qu'aux packages) — on utilise directement activateLicense via mlm
    // Activation manuelle : passer la licence en active + mettre à jour le membre
    const renewalDays = licCfg.renewalDays ?? 365
    const now = new Date()
    const existingActiveLic = await c.env.DB.prepare(
      `SELECT expires_at FROM finstrategia_licenses WHERE member_id = ? AND status = 'active' ORDER BY expires_at DESC LIMIT 1`
    ).bind(memberId).first() as any
    let finalExpiry: Date
    if (existingActiveLic?.expires_at) {
      const existingExpiry = new Date(existingActiveLic.expires_at)
      const baseDate = existingExpiry > now ? existingExpiry : now
      finalExpiry = new Date(baseDate)
      finalExpiry.setDate(finalExpiry.getDate() + renewalDays)
    } else {
      finalExpiry = new Date(now)
      finalExpiry.setDate(finalExpiry.getDate() + renewalDays)
    }
    await c.env.DB.prepare(
      `UPDATE finstrategia_licenses SET status = 'active', starts_at = datetime('now'), expires_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(finalExpiry.toISOString(), licId).run()
    await c.env.DB.prepare(
      `UPDATE members SET license_active = 1, license_expires_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(finalExpiry.toISOString(), memberId).run()
    // Notification
    await createNotification(c.env.DB, memberId, 'success', 'Licence activée !',
      `Votre Licence Finstrategia a été activée jusqu'au ${finalExpiry.toLocaleDateString('fr-FR')}. Paiement de $${totalNeeded.toFixed(2)} débité de votre wallet.`)
    // Solde après débit
    const walletAfter = await c.env.DB.prepare(`SELECT balance FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
    return c.json({
      license_id:   licId,
      intent_only:  false,
      activated:    true,
      amount:       licensePrice,
      admin_fee:    adminFeeAmount,
      total_amount: totalNeeded,
      expires_at:   finalExpiry.toISOString(),
      new_balance:  walletAfter?.balance ?? 0,
      message:      `Licence activée jusqu'au ${finalExpiry.toLocaleDateString('fr-FR')} !`,
    })
  }

  // ── FLOW MANUEL/CRYPTO : créer la licence en DB (statut pending) ──────────
  // Annuler toute licence pending non payée existante pour éviter les doublons
  const existingPending = await c.env.DB.prepare(
    `SELECT id FROM finstrategia_licenses WHERE member_id = ? AND status = 'pending' LIMIT 1`
  ).bind(memberId).first() as any
  if (existingPending) {
    await c.env.DB.prepare(
      `UPDATE finstrategia_licenses SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`
    ).bind(existingPending.id).run()
  }

  const id = generateId()
  await c.env.DB.prepare(
    `INSERT INTO finstrategia_licenses (id, member_id, price_usd, status, payment_method, admin_fee_amount) VALUES (?, ?, ?, 'pending', ?, ?)`
  ).bind(id, memberId, licensePrice, payment_method, adminFeeAmount).run()

  return c.json({
    license_id:   id,
    intent_only:  false,
    amount:       licensePrice,
    admin_fee:    adminFeeAmount,
    total_amount: licensePrice + adminFeeAmount,
  })
})

// POST /api/members/license/:id/proof — Soumettre preuve de paiement pour une licence pending
// Utilisé par les modes bank, crypto, manual, CoinPayments, PSP v2 côté licenseOnly
members.post('/license/:id/proof', async (c) => {
  const memberId = c.get('memberId' as any)
  const licenseId = c.req.param('id')
  const { proof_url, note = '' } = await c.req.json()

  if (!proof_url) return c.json({ error: 'URL de preuve manquante' }, 400)

  // Vérifier que la licence appartient bien au membre et est en attente
  const lic = await c.env.DB.prepare(
    `SELECT id, status FROM finstrategia_licenses WHERE id = ? AND member_id = ?`
  ).bind(licenseId, memberId).first() as any

  if (!lic) return c.json({ error: 'Licence introuvable' }, 404)
  if (!['pending', 'proof_submitted'].includes(lic.status)) {
    return c.json({ error: `Impossible de soumettre une preuve pour une licence en statut "${lic.status}"` }, 409)
  }

  await c.env.DB.prepare(
    `UPDATE finstrategia_licenses SET proof_url = ?, status = 'proof_submitted', updated_at = datetime('now') WHERE id = ?`
  ).bind(proof_url, licenseId).run()

  await createNotification(c.env.DB, memberId, 'info', 'Preuve soumise',
    'Votre preuve de paiement de licence a été reçue. Elle sera vérifiée sous 24–48h.')

  return c.json({ success: true, message: 'Preuve soumise — en cours de vérification' })
})

// POST /api/members/kyc/submit — Soumettre KYC
members.post('/kyc/submit', async (c) => {
  const memberId = c.get('memberId' as any)
  const { document_url } = await c.req.json()

  await c.env.DB.prepare(
    `UPDATE members SET kyc_status = 'pending', kyc_document_url = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(document_url, memberId).run()

  await c.env.DB.prepare(
    `INSERT INTO notifications (id, member_id, type, title, message) VALUES (?, ?, 'kyc', 'KYC soumis', 'Votre document a été soumis et est en cours de vérification.')`
  ).bind(generateId(), memberId).run()

  // ── Email confirmation soumission KYC (route legacy) ─────
  // NOTE: await direct — executionCtx non disponible dans les sous-routers Hono
  const mbrKyc = await c.env.DB.prepare(
    `SELECT first_name, email FROM members WHERE id=?`
  ).bind(memberId).first() as any
  if (mbrKyc) {
    await sendEmail(c.env.DB, {
      to: mbrKyc.email, toName: mbrKyc.first_name,
      templateId: 'kyc_submitted',
      variables: {
        prenom:        mbrKyc.first_name || '',
        dashboard_url: 'https://willbeleader.pages.dev',
      }
    }).catch(() => {})
  }

  return c.json({ success: true })
})

// GET /api/members/notifications
members.get('/notifications', async (c) => {
  const memberId = c.get('memberId' as any)
  const { page = '1', per_page = '25' } = c.req.query()
  const limit = parseInt(per_page)
  const offset = (parseInt(page) - 1) * limit
  const [rows, total] = await Promise.all([
    c.env.DB.prepare(
      `SELECT * FROM notifications WHERE member_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(memberId, limit, offset).all(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM notifications WHERE member_id = ?`
    ).bind(memberId).first() as any
  ])
  return c.json({ notifications: rows.results, total: total?.cnt || 0 })
})

// PUT /api/members/notifications/read-all
members.put('/notifications/read-all', async (c) => {
  const memberId = c.get('memberId' as any)
  await c.env.DB.prepare(`UPDATE notifications SET is_read = 1 WHERE member_id = ?`).bind(memberId).run()
  return c.json({ success: true })
})

// POST /api/members/upload — Upload universel (KYC, preuves, etc.)
// Stockage : binaire dans KV (FILES_KV), métadonnées dans D1 (évite SQLITE_TOOBIG)
members.post('/upload', async (c) => {
  try {
    const memberId = c.get('memberId' as any)
    const contentType = c.req.header('content-type') || ''
    let filename = 'document'
    let mimeType = 'application/octet-stream'
    let sizeBytes = 0
    let fileBytes: Uint8Array | null = null
    let purpose = 'other'

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData()
      const file = formData.get('file') as File | null
      purpose = (formData.get('purpose') as string) || 'other'
      if (!file) return c.json({ error: 'Aucun fichier fourni' }, 400)
      filename = file.name || 'document'
      mimeType = file.type || 'application/octet-stream'
      const buffer = await file.arrayBuffer()
      sizeBytes = buffer.byteLength
      if (sizeBytes > 10 * 1024 * 1024) return c.json({ error: 'Fichier trop volumineux (max 10 MB)' }, 400)
      fileBytes = new Uint8Array(buffer)
    } else {
      const body = await c.req.json() as any
      filename  = body.filename  || 'document'
      mimeType  = body.mime_type || 'application/octet-stream'
      sizeBytes = body.size_bytes || 0
      purpose   = body.purpose   || 'other'
      const dataB64 = body.data_b64 || ''
      if (!dataB64) return c.json({ error: 'data_b64 requis' }, 400)
      if (sizeBytes > 10 * 1024 * 1024) return c.json({ error: 'Fichier trop volumineux (max 10 MB)' }, 400)
      // Décoder base64 → bytes
      const binary = atob(dataB64)
      fileBytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) fileBytes[i] = binary.charCodeAt(i)
      if (!sizeBytes) sizeBytes = fileBytes.length
    }

    const fileId = (crypto as any).randomUUID
      ? (crypto as any).randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36)
    const now = new Date().toISOString().replace('T',' ').substring(0,19)
    const publicUrl = `/api/members/files/${fileId}`

    // Convertir bytes en base64 pour stockage D1 (fallback universel si KV absent)
    let storedB64 = ''
    const bytesArr = fileBytes!
    let binaryStr = ''
    for (let i = 0; i < bytesArr.length; i++) binaryStr += String.fromCharCode(bytesArr[i])
    storedB64 = btoa(binaryStr)

    let storage = 'd1'
    if (c.env.FILES_KV) {
      // Stocker le binaire dans KV si disponible
      try {
        await c.env.FILES_KV.put(`file:${fileId}`, fileBytes!.buffer as ArrayBuffer, {
          expirationTtl: 365 * 24 * 3600,
          metadata: { mimeType, filename }
        })
        storage = 'kv'
        storedB64 = '' // Pas besoin de dupliquer en D1
      } catch (_kvErr) {
        // KV write failed → fallback D1
        storage = 'd1'
      }
    }

    await c.env.DB.prepare(
      `INSERT INTO uploaded_files (id, member_id, filename, mime_type, size_bytes, purpose, storage, data_b64, url, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).bind(fileId, memberId, filename, mimeType, sizeBytes, purpose, storage, storedB64, publicUrl, now).run()

    const sizeFmt = sizeBytes > 1024*1024
      ? `${(sizeBytes/1024/1024).toFixed(2)} MB`
      : sizeBytes > 1024 ? `${(sizeBytes/1024).toFixed(1)} KB` : `${sizeBytes} B`

    return c.json({ success: true, file_id: fileId, url: publicUrl, filename, mime_type: mimeType, size: sizeFmt })
  } catch (e: any) {
    return c.json({ error: e.message || 'Erreur upload' }, 500)
  }
})

// GET /api/members/files/:id — Servir un fichier uploadé (lit depuis KV)
members.get('/files/:id', async (c) => {
  const id = c.req.param('id')
  const memberId = c.get('memberId' as any)
  // Vérifier que le fichier appartient au membre (ou est public)
  const row = await c.env.DB.prepare(
    `SELECT * FROM uploaded_files WHERE id=? AND (member_id=? OR member_id IS NULL)`
  ).bind(id, memberId).first() as any
  if (!row) return c.json({ error: 'Fichier introuvable' }, 404)

  // Servir depuis KV si disponible, sinon depuis base64 en D1
  if (row.storage === 'kv' && c.env.FILES_KV) {
    const buf = await c.env.FILES_KV.get(`file:${id}`, 'arrayBuffer').catch(() => null)
    if (buf) {
      return new Response(buf, {
        headers: {
          'Content-Type': row.mime_type || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${row.filename}"`,
          'Cache-Control': 'public, max-age=86400'
        }
      })
    }
  }
  // Fallback base64 stocké dans D1
  if (row.data_b64) {
    const binary = atob(row.data_b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Response(bytes.buffer, {
      headers: { 'Content-Type': row.mime_type || 'application/octet-stream', 'Content-Disposition': `inline; filename="${row.filename}"`, 'Cache-Control': 'public, max-age=86400' }
    })
  }
  return c.json({ error: 'Contenu du fichier introuvable' }, 404)
})

// GET /api/members/marketing — Assets marketing (enrichi avec catégories)
members.get('/marketing', async (c) => {
  const assets = await c.env.DB.prepare(
    `SELECT ma.*, mc.name as category_name, mc.icon as category_icon,
            mc.color as category_color, mc.gradient as category_gradient
     FROM marketing_assets ma
     LEFT JOIN marketing_categories mc ON mc.id = ma.category_id
     WHERE ma.is_active = 1
     ORDER BY ma.sort_order ASC, ma.created_at DESC`
  ).all()
  const rows = assets.results as any[]
  // Catégories actives triées
  const catsRaw = await c.env.DB.prepare(
    `SELECT mc.*, COUNT(ma.id) as assets_count
     FROM marketing_categories mc
     LEFT JOIN marketing_assets ma ON ma.category_id = mc.id AND ma.is_active=1
     WHERE mc.is_active=1
     GROUP BY mc.id
     ORDER BY mc.sort_order ASC`
  ).all()
  const featured = rows.filter((r: any) => r.featured)
  return c.json({ assets: rows, categories: catsRaw.results, featured })
})

// POST /api/members/marketing/:id/view — Incrémenter le compteur de vues
members.post('/marketing/:id/view', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare(
    `UPDATE marketing_assets SET views_count = views_count + 1 WHERE id=? AND is_active=1`
  ).bind(id).run()
  return c.json({ success: true })
})

// GET /api/members/holding-tank — Filleuls en attente de placement (parrainés par moi)
members.get('/holding-tank', async (c) => {
  const memberId = c.get('memberId' as any)

  // Filleuls directs dont je suis le sponsor ET qui sont en holding tank (non placés)
  // On join holding_tank pour récupérer sponsor_deadline_at + jours restants
  const pending = await c.env.DB.prepare(
    `SELECT m.id, m.unique_id, m.first_name, m.last_name, m.email, m.phone, m.country,
            m.member_status, m.current_rank, m.registration_method,
            m.in_holding_tank, m.created_at,
            ht.sponsor_deadline_at,
            CAST((julianday(COALESCE(ht.sponsor_deadline_at, datetime(ht.created_at,'+15 days')))
                  - julianday('now')) AS INTEGER) as days_remaining
     FROM members m
     LEFT JOIN holding_tank ht ON ht.member_id = m.id
     WHERE m.sponsor_id = ?
       AND m.in_holding_tank = 1
       AND m.unique_id != 'ROOT'
     ORDER BY m.created_at DESC`
  ).bind(memberId).all()

  // Filleuls déjà placés dans l'arbre (pour comparaison)
  const placed = await c.env.DB.prepare(
    `SELECT id, unique_id, first_name, last_name, email,
            member_status, current_rank, binary_position,
            binary_parent_id, registration_method, created_at
     FROM members
     WHERE sponsor_id = ?
       AND in_holding_tank = 0
       AND unique_id != 'ROOT'
     ORDER BY created_at DESC
     LIMIT 20`
  ).bind(memberId).all()

  // Compteurs
  const counts = await c.env.DB.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN in_holding_tank = 1 THEN 1 ELSE 0 END) as pending_count,
       SUM(CASE WHEN in_holding_tank = 0 THEN 1 ELSE 0 END) as placed_count
     FROM members WHERE sponsor_id = ? AND unique_id != 'ROOT'`
  ).bind(memberId).first() as any

  // Infos du membre connecté (lien parrainage — uniquement si licence active)
  const me = await c.env.DB.prepare(
    `SELECT unique_id, license_active FROM members WHERE id = ?`
  ).bind(memberId).first() as any

  // Point 4 : le lien de parrainage n'est fourni que si la licence est active
  const myUniqueId = me?.license_active ? (me?.unique_id || '') : ''

  return c.json({
    pending: pending.results,
    placed: placed.results,
    total: counts?.total || 0,
    pending_count: counts?.pending_count || 0,
    placed_count: counts?.placed_count || 0,
    my_unique_id: myUniqueId,
    license_active: !!(me?.license_active)
  })
})

// POST /api/members/holding-tank/place — Le SPONSOR place son filleul dans son arbre
members.post('/holding-tank/place', async (c) => {
  const memberId = c.get('memberId' as any)
  const { member_id, parent_id, position } = await c.req.json()

  if (!member_id || !parent_id || !['L','R'].includes(position))
    return c.json({ error: 'Paramètres invalides (member_id, parent_id, position L/R requis)' }, 400)

  // Vérifier que le filleul à placer est bien dans le réservoir du sponsor connecté
  // HT-FIX : chercher le filleul sans filtrer sur in_holding_tank=1 pour gérer les désync
  // (in_holding_tank peut être 0 si désync, mais holding_tank.status='waiting' est encore présent)
  const filleul = await c.env.DB.prepare(
    `SELECT m.id, m.unique_id, m.first_name, m.last_name, m.in_holding_tank,
            m.sponsor_id, m.binary_parent_id, m.binary_position
     FROM members m
     WHERE m.id = ?
       AND (m.in_holding_tank = 1
            OR EXISTS (SELECT 1 FROM holding_tank ht WHERE ht.member_id = m.id AND ht.status = 'waiting'))`
  ).bind(member_id).first() as any

  if (!filleul)
    return c.json({ error: 'Filleul introuvable ou déjà placé' }, 404)

  if (filleul.sponsor_id !== memberId)
    return c.json({ error: 'Ce filleul ne vous appartient pas' }, 403)

  // ── CAS HT-DESYNC côté sponsor : membre déjà placé mais entrée HT orpheline ──
  // Si in_holding_tank=0 ET binary_parent_id SET → placement déjà effectué, succès silencieux
  if (!filleul.in_holding_tank && filleul.binary_parent_id) {
    // placed_by REFERENCES admin_users(id) → NULL si c'est un sponsor (membre) qui place
    await c.env.DB.prepare(
      `UPDATE holding_tank SET status='placed', placed_at=datetime('now'), placed_by=NULL
       WHERE member_id=? AND status='waiting'`
    ).bind(member_id).run()
    return c.json({
      success: true,
      message: `${filleul.first_name} ${filleul.last_name} (${filleul.unique_id}) est déjà placé dans l'arbre (position ${filleul.binary_position}). Entrée synchronisée.`,
      newRank: 'none'
    })
  }

  // Vérifier que le parent_id est bien dans l'arbre du sponsor (descendant ou soi-même)
  const parentMember = await c.env.DB.prepare(
    `SELECT id, unique_id, binary_left_id, binary_right_id FROM members WHERE id = ?`
  ).bind(parent_id).first() as any

  if (!parentMember)
    return c.json({ error: 'Nœud parent introuvable' }, 404)

  // Placer le filleul (réutilise la même logique que l'admin)
  const result = await placeMemberFromHoldingTank(
    c.env.DB, member_id, parent_id, position as 'L'|'R', memberId, false  // false = sponsor, pas admin → placed_by = NULL
  )

  // placeMemberFromHoldingTank retourne success:true même en cas HT-DESYNC (déjà placé = résultat correct)
  // On ne retourne erreur 409 que pour HOLD_001/HOLD_002 (slot vraiment occupé par un autre)
  if (!result.success) return c.json({ error: result.message }, 409)

  // ── Opérations post-placement non bloquantes ──────────────
  // Recalculer rang du filleul placé
  let newRank = 'none'
  try {
    newRank = await calculateMemberRank(c.env.DB, member_id)
    await c.env.DB.prepare(
      `UPDATE members SET current_rank=?, updated_at=datetime('now') WHERE id=?`
    ).bind(newRank, member_id).run()
  } catch (_) {}

  // Notifier le sponsor
  try {
    await c.env.DB.prepare(
      `INSERT INTO notifications (id, member_id, type, title, message, created_at)
       VALUES (?, ?, 'success', 'Filleul placé', ?, datetime('now'))`
    ).bind(
      crypto.randomUUID(), memberId,
      `${filleul.first_name} ${filleul.last_name} (${filleul.unique_id}) a été placé dans votre arbre à la position ${position === 'L' ? 'Gauche' : 'Droite'}.`
    ).run()
  } catch (_) {}

  return c.json({ success: true, message: result.message, newRank })
})

// ── COORDONNÉES DE PAIEMENT ──────────────────────────────────────────────────

// GET /api/members/payout-info — Lire les coordonnées de paiement sauvegardées
members.get('/payout-info', async (c) => {
  const memberId = c.get('memberId' as any)
  const m = await c.env.DB.prepare(
    `SELECT payout_method,
            payout_paypal_email,
            payout_bank_holder, payout_bank_iban, payout_bank_bic,
            payout_bank_name, payout_bank_account, payout_bank_address,
            payout_bank_city, payout_bank_country, payout_bank_swift,
            payout_crypto_currency, payout_crypto_network, payout_crypto_address
     FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  if (!m) return c.json({ error: 'Membre introuvable' }, 404)
  return c.json({ payout: m })
})

// PUT /api/members/payout-info — Sauvegarder les coordonnées de paiement
members.put('/payout-info', async (c) => {
  const memberId = c.get('memberId' as any)
  const body = await c.req.json()
  const method: string = body.payout_method || 'paypal'

  const allowed = [
    'payout_method',
    'payout_paypal_email',
    'payout_bank_holder', 'payout_bank_iban', 'payout_bank_bic',
    'payout_bank_name', 'payout_bank_account', 'payout_bank_address',
    'payout_bank_city', 'payout_bank_country', 'payout_bank_swift',
    'payout_crypto_currency', 'payout_crypto_network', 'payout_crypto_address',
  ]

  // Validation minimale selon la méthode
  if (method === 'paypal' && !body.payout_paypal_email)
    return c.json({ error: 'Email PayPal obligatoire' }, 400)
  if (method === 'bank_transfer' && (!body.payout_bank_holder || !body.payout_bank_iban || !body.payout_bank_bic))
    return c.json({ error: 'Titulaire, IBAN et BIC obligatoires pour le virement bancaire' }, 400)
  if (method === 'crypto' && (!body.payout_crypto_address || !body.payout_crypto_network || !body.payout_crypto_currency))
    return c.json({ error: 'Adresse, réseau et devise obligatoires pour la crypto' }, 400)

  // Filtrer uniquement les champs autorisés
  const setClauses: string[] = []
  const values: any[] = []
  for (const key of allowed) {
    if (key in body) {
      setClauses.push(`${key} = ?`)
      values.push(body[key] ?? null)
    }
  }
  if (setClauses.length === 0)
    return c.json({ error: 'Aucun champ valide fourni' }, 400)

  values.push(memberId)
  await c.env.DB.prepare(
    `UPDATE members SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
  ).bind(...values).run()

  return c.json({ success: true })
})

// ── WALLET LUXIA (DREAMILES) ────────────────────────────────

// GET /api/members/dreamiles — Solde + infos wallet Luxia
members.get('/dreamiles', async (c) => {
  const memberId = c.get('memberId' as any)

  // Créer le wallet si inexistant (lazy init)
  const existing = await c.env.DB.prepare(
    `SELECT * FROM dreamiles_wallet WHERE member_id = ?`
  ).bind(memberId).first() as any
  if (!existing) {
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO dreamiles_wallet (id, member_id) VALUES (lower(hex(randomblob(16))), ?)`
    ).bind(memberId).run()
  }

  const wallet = await c.env.DB.prepare(
    `SELECT * FROM dreamiles_wallet WHERE member_id = ?`
  ).bind(memberId).first() as any

  // Transactions récentes
  const transactions = await c.env.DB.prepare(
    `SELECT * FROM dreamiles_transactions WHERE member_id = ? ORDER BY created_at DESC LIMIT 50`
  ).bind(memberId).all()

  // Dreamiles qui vont expirer dans les 30 prochains jours
  const expiringSoon = await c.env.DB.prepare(
    `SELECT SUM(dreamiles) as amount FROM dreamiles_transactions
     WHERE member_id = ? AND type = 'credit' AND status = 'completed'
     AND expires_at IS NOT NULL AND expires_at <= datetime('now', '+30 days') AND expires_at > datetime('now')`
  ).bind(memberId).first() as any

  // Ce mois (crédits du mois en cours)
  const thisMonth = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(dreamiles),0) as amount FROM dreamiles_transactions
     WHERE member_id = ? AND type = 'credit' AND status = 'completed'
     AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`
  ).bind(memberId).first() as any

  return c.json({
    wallet: wallet || { dreamiles: 0, total_earned: 0, total_converted: 0, total_expired: 0 },
    transactions: transactions.results,
    expiring_soon: expiringSoon?.amount || 0,
    credited_this_month: thisMonth?.amount || 0
  })
})

// POST /api/members/dreamiles/convert — Convertir Dreamiles en USD disponible
members.post('/dreamiles/convert', async (c) => {
  const memberId = c.get('memberId' as any)
  const { dreamiles } = await c.req.json()
  if (!dreamiles || dreamiles <= 0) return c.json({ error: 'Nombre de dreamiles invalide' }, 400)

  const wallet = await c.env.DB.prepare(
    `SELECT * FROM dreamiles_wallet WHERE member_id = ?`
  ).bind(memberId).first() as any
  if (!wallet || wallet.dreamiles < dreamiles)
    return c.json({ error: `Solde insuffisant (${wallet?.dreamiles || 0} Dreamiles disponibles)` }, 400)

  // 1 Dreamile = 1 USD
  const usdAmount = dreamiles

  // Déduire les dreamiles et ajouter au wallet principal
  await c.env.DB.prepare(
    `UPDATE dreamiles_wallet SET dreamiles = dreamiles - ?, total_converted = total_converted + ?, updated_at = datetime('now') WHERE member_id = ?`
  ).bind(dreamiles, dreamiles, memberId).run()

  await c.env.DB.prepare(
    `UPDATE wallets SET balance = balance + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE member_id = ?`
  ).bind(usdAmount, usdAmount, memberId).run()

  await c.env.DB.prepare(
    `UPDATE members SET wallet_balance = wallet_balance + ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(usdAmount, memberId).run()

  // Log transaction dreamiles
  await c.env.DB.prepare(
    `INSERT INTO dreamiles_transactions (id, member_id, type, dreamiles, usd_amount, description, status)
     VALUES (lower(hex(randomblob(16))), ?, 'conversion', ?, ?, 'Conversion Dreamiles → Wallet Principal', 'completed')`
  ).bind(memberId, -dreamiles, usdAmount).run()

  // Log wallet operation
  await c.env.DB.prepare(
    `INSERT INTO wallet_operations (id, member_id, type, amount, description, created_at)
     VALUES (lower(hex(randomblob(16))), ?, 'credit', ?, 'Conversion Dreamiles Luxia', datetime('now'))`
  ).bind(memberId, usdAmount).run().catch(() => {})

  return c.json({ success: true, usd_credited: usdAmount, dreamiles_remaining: wallet.dreamiles - dreamiles })
})

// ── GET /api/members/cc-wallet ────────────────────────────────────────────────
// Journal CC + solde du membre connecté
members.get('/cc-wallet', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const db = c.env.DB

  const [balance, transactions, credits, withdrawals, ccConfig] = await Promise.all([
    getCCBalance(db, memberId),
    db.prepare(
      `SELECT * FROM cc_transactions
       WHERE member_id = ?
       ORDER BY created_at DESC
       LIMIT 100`
    ).bind(memberId).all(),
    db.prepare(
      `SELECT id, amount, used_amount, (amount - used_amount) AS remaining,
              period, status, available_at, expires_at, created_at
       FROM credit_croissance
       WHERE member_id = ? AND status IN ('held','available')
       ORDER BY available_at ASC`
    ).bind(memberId).all(),
    db.prepare(
      `SELECT id, amount, description, justificatif_name, justificatif_type, status, admin_note, reviewed_at, created_at
       FROM cc_withdrawals
       WHERE member_id = ?
       ORDER BY created_at DESC`
    ).bind(memberId).all(),
    // Config paramétrable (toutes les clés CC en 1 requête)
    db.prepare(
      `SELECT key, value FROM compensation_config
       WHERE key IN (
         'cc_withdrawal_min_amount','cc_withdrawal_max_amount',
         'cc_withdrawal_desc_min_chars','cc_withdrawal_processing_time','cc_withdrawal_max_pending',
         'cc_field_description_visible','cc_field_description_required','cc_field_description_label',
         'cc_field_justificatif_visible','cc_field_justificatif_required','cc_field_justificatif_label',
         'cc_field_custom1_visible','cc_field_custom1_required','cc_field_custom1_label',
         'cc_field_custom2_visible','cc_field_custom2_required','cc_field_custom2_label',
         'cc_field_custom3_visible','cc_field_custom3_required','cc_field_custom3_label'
       )`
    ).all(),
  ])

  const cfgMap = Object.fromEntries(
    (ccConfig.results as {key:string, value:string}[]).map(r => [r.key, r.value])
  )

  const fv = (k: string, def = '1') => (cfgMap[`cc_field_${k}_visible`]  ?? def) === '1'
  const fr = (k: string, def = '0') => (cfgMap[`cc_field_${k}_required`] ?? def) === '1'
  const fl = (k: string, def: string) => cfgMap[`cc_field_${k}_label`] ?? def

  return c.json({
    balance,
    transactions: transactions.results || [],
    credits:      credits.results      || [],
    withdrawals:  withdrawals.results  || [],
    config: {
      min_amount:      parseFloat(cfgMap['cc_withdrawal_min_amount']   ?? '10'),
      max_amount:      parseFloat(cfgMap['cc_withdrawal_max_amount']   ?? '5000'),
      desc_min_chars:  parseInt(cfgMap['cc_withdrawal_desc_min_chars'] ?? '10', 10),
      processing_time: cfgMap['cc_withdrawal_processing_time']         ?? '48h',
      max_pending:     parseInt(cfgMap['cc_withdrawal_max_pending']    ?? '1', 10),
      // Champs dynamiques du formulaire
      fields: {
        description:  { visible: fv('description','1'), required: fr('description','1'), label: fl('description','Motif de la demande') },
        justificatif: { visible: fv('justificatif','1'), required: fr('justificatif','0'), label: fl('justificatif','Justificatif (PDF, JPG, PNG)') },
        custom1:      { visible: fv('custom1','0'), required: fr('custom1','0'), label: fl('custom1','Information complémentaire 1') },
        custom2:      { visible: fv('custom2','0'), required: fr('custom2','0'), label: fl('custom2','Information complémentaire 2') },
        custom3:      { visible: fv('custom3','0'), required: fr('custom3','0'), label: fl('custom3','Information complémentaire 3') },
      },
    },
  })
})

// ── POST /api/members/cc-withdrawal ──────────────────────────────────────────
// Soumettre une demande de remboursement CC (multipart/form-data)
members.post('/cc-withdrawal', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const db = c.env.DB

  // Détecter le type de contenu pour accepter JSON (ancien) ou multipart (nouveau)
  const contentType = c.req.header('content-type') || ''
  let amount: number
  let description: string = ''
  let justificatifUrl: string | null = null
  let justificatifName: string | null = null
  let justificatifType: string | null = null
  let custom1: string | null = null
  let custom2: string | null = null
  let custom3: string | null = null

  if (contentType.includes('multipart/form-data')) {
    const formData  = await c.req.formData()
    const amountRaw = formData.get('amount')
    const descRaw   = formData.get('description')

    amount      = amountRaw ? parseFloat(amountRaw as string) : 0
    description = descRaw   ? (descRaw as string).trim()     : ''
    custom1     = formData.get('custom1') ? (formData.get('custom1') as string).trim() : null
    custom2     = formData.get('custom2') ? (formData.get('custom2') as string).trim() : null
    custom3     = formData.get('custom3') ? (formData.get('custom3') as string).trim() : null

    // Collecter tous les fichiers justificatif_0, justificatif_1, ... (multi-fichiers)
    // Compatibilité : accepte aussi l'ancien champ "justificatif" (1 seul fichier)
    const fileEntries: File[] = []
    for (let i = 0; i < 10; i++) {
      const f = formData.get(`justificatif_${i}`) as File | null
      if (f && f.size > 0) fileEntries.push(f)
    }
    // Fallback ancien format
    const legacyFile = formData.get('justificatif') as File | null
    if (legacyFile && legacyFile.size > 0 && fileEntries.length === 0) {
      fileEntries.push(legacyFile)
    }

    // Convertir chaque fichier en base64 data URL et stocker en JSON si plusieurs
    if (fileEntries.length === 1) {
      const file = fileEntries[0]
      const buf    = await file.arrayBuffer()
      const bytes  = new Uint8Array(buf)
      let binary   = ''
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
      const b64    = btoa(binary)
      justificatifUrl  = `data:${file.type};base64,${b64}`
      justificatifName = file.name
      justificatifType = file.type
    } else if (fileEntries.length > 1) {
      // Stocker un tableau JSON d'objets {url, name, type}
      const files = await Promise.all(fileEntries.map(async (file) => {
        const buf   = await file.arrayBuffer()
        const bytes = new Uint8Array(buf)
        let binary  = ''
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
        const b64   = btoa(binary)
        return { url: `data:${file.type};base64,${b64}`, name: file.name, type: file.type }
      }))
      justificatifUrl  = JSON.stringify(files)
      justificatifName = files.map(f => f.name).join(', ')
      justificatifType = 'multi'
    }
  } else {
    // Fallback JSON (compatibilité ancienne API)
    const body = await c.req.json() as { amount: number; description: string }
    amount      = body.amount
    description = (body.description || '').trim()
  }

  // ── Lire TOUS les paramètres CC depuis la config admin ────────────────────
  const cfgRows = await db.prepare(`
    SELECT key, value FROM compensation_config
    WHERE key IN (
      'cc_withdrawal_min_amount','cc_withdrawal_max_amount',
      'cc_withdrawal_desc_min_chars','cc_withdrawal_processing_time','cc_withdrawal_max_pending',
      'cc_field_description_visible','cc_field_description_required',
      'cc_field_justificatif_visible','cc_field_justificatif_required',
      'cc_field_custom1_visible','cc_field_custom1_required','cc_field_custom1_label',
      'cc_field_custom2_visible','cc_field_custom2_required','cc_field_custom2_label',
      'cc_field_custom3_visible','cc_field_custom3_required','cc_field_custom3_label'
    )`).all<{key:string; value:string}>()

  const cfg: Record<string, string> = {}
  for (const r of (cfgRows.results || [])) cfg[r.key] = r.value

  const cfgMin        = parseFloat(cfg['cc_withdrawal_min_amount']     ?? '10')
  const cfgMax        = parseFloat(cfg['cc_withdrawal_max_amount']     ?? '5000')
  const cfgDescMin    = parseInt(cfg['cc_withdrawal_desc_min_chars']   ?? '10', 10)
  const cfgProcessing = cfg['cc_withdrawal_processing_time']           ?? '48h'
  const cfgMaxPending = parseInt(cfg['cc_withdrawal_max_pending']      ?? '1', 10)

  // Helpers champs dynamiques
  const fieldVisible  = (k: string, def = '1') => (cfg[`cc_field_${k}_visible`]  ?? def) === '1'
  const fieldRequired = (k: string, def = '0') => (cfg[`cc_field_${k}_required`] ?? def) === '1'
  const fieldLabel    = (k: string, def: string) => cfg[`cc_field_${k}_label`] ?? def

  // ── Validations montant ───────────────────────────────────────────────────
  if (!amount || amount <= 0)
    return c.json({ error: 'Montant invalide' }, 400)
  if (amount < cfgMin)
    return c.json({ error: `Montant minimum : ${cfgMin}$` }, 400)
  if (cfgMax > 0 && amount > cfgMax)
    return c.json({ error: `Montant maximum par demande : ${cfgMax.toLocaleString('fr-FR')}$` }, 400)

  // ── Validation champ Description ─────────────────────────────────────────
  if (fieldVisible('description')) {
    if (fieldRequired('description') && (!description || description.length < cfgDescMin))
      return c.json({ error: `${fieldLabel('description', 'Motif')} requis (${cfgDescMin} caractères minimum)` }, 400)
    if (description && description.length > 0 && description.length < cfgDescMin)
      return c.json({ error: `${fieldLabel('description', 'Motif')} : ${cfgDescMin} caractères minimum` }, 400)
  }

  // ── Validation champ Justificatif ─────────────────────────────────────────
  if (fieldVisible('justificatif') && fieldRequired('justificatif') && !justificatifUrl)
    return c.json({ error: `${fieldLabel('justificatif', 'Justificatif')} obligatoire` }, 400)

  // ── Validation champs custom ──────────────────────────────────────────────
  if (fieldVisible('custom1') && fieldRequired('custom1') && (!custom1 || custom1.length === 0))
    return c.json({ error: `${fieldLabel('custom1', 'Information complémentaire 1')} obligatoire` }, 400)
  if (fieldVisible('custom2') && fieldRequired('custom2') && (!custom2 || custom2.length === 0))
    return c.json({ error: `${fieldLabel('custom2', 'Information complémentaire 2')} obligatoire` }, 400)
  if (fieldVisible('custom3') && fieldRequired('custom3') && (!custom3 || custom3.length === 0))
    return c.json({ error: `${fieldLabel('custom3', 'Information complémentaire 3')} obligatoire` }, 400)

  // ── Vérifier solde disponible ─────────────────────────────────────────────
  const bal = await getCCBalance(db, memberId)
  if (bal.available < amount)
    return c.json({
      error: `Solde CC disponible insuffisant — ${bal.available.toFixed(2)}$ disponible, ${amount}$ demandé`
    }, 422)

  // ── Vérifier le nombre de demandes pending ────────────────────────────────
  if (cfgMaxPending > 0) {
    const pendingCount = await db.prepare(
      `SELECT COUNT(*) as cnt FROM cc_withdrawals WHERE member_id = ? AND status = 'pending'`
    ).bind(memberId).first<{cnt:number}>()
    if ((pendingCount?.cnt ?? 0) >= cfgMaxPending)
      return c.json({
        error: cfgMaxPending === 1
          ? 'Une demande de remboursement est déjà en cours de traitement'
          : `Vous avez déjà ${cfgMaxPending} demande(s) en attente`
      }, 409)
  }

  const withdrawalId = `ccw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

  await db.prepare(
    `INSERT INTO cc_withdrawals
       (id, member_id, amount, description, justificatif_url, justificatif_name, justificatif_type,
        custom1, custom2, custom3, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`
  ).bind(
    withdrawalId, memberId, amount, description,
    justificatifUrl, justificatifName, justificatifType,
    custom1 || null, custom2 || null, custom3 || null
  ).run()

  return c.json({
    success:       true,
    withdrawal_id: withdrawalId,
    message:       `Demande de remboursement de ${amount}$ soumise avec succès. Elle sera traitée sous ${cfgProcessing}.`,
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// RÉSERVE STRATÉGIQUE — Page dédiée + retrait
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/members/reserve-strategique ─────────────────────────────────────
// Données complètes : solde, entrées, statistiques
members.get('/reserve-strategique', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const db = c.env.DB

  const [member, entries, rsConfig] = await Promise.all([
    db.prepare(`SELECT reserve_strategique FROM members WHERE id = ?`).bind(memberId).first() as any,
    db.prepare(`
      SELECT id, amount, period, source_commission_id,
             abondement_rate, status, locked_until, unlocked_at, created_at
      FROM reserve_strategique
      WHERE member_id = ?
      ORDER BY created_at DESC
    `).bind(memberId).all(),
    db.prepare(`SELECT key, value FROM compensation_config WHERE key IN ('reserve_strategique_pct','rs_withdrawal_enabled')`).all(),
  ])

  const cfg: Record<string, string> = {}
  for (const r of ((rsConfig.results || []) as {key:string,value:string}[])) cfg[r.key] = r.value

  const allEntries = (entries.results || []) as any[]

  // Calculs statistiques
  const lockedEntries    = allEntries.filter(e => e.status === 'locked')
  // 'released' et 'unlocked' = libérés disponibles au retrait (pas encore retirés)
  // 'withdrawn' = déjà retirés, ne comptent plus dans le solde disponible
  const releasedEntries  = allEntries.filter(e => e.status === 'released' || e.status === 'unlocked')
  const cancelledEntries = allEntries.filter(e => e.status === 'cancelled')
  const withdrawnEntries = allEntries.filter(e => e.status === 'withdrawn')

  const totalLocked   = lockedEntries.reduce((s: number, e: any) => s + (e.amount || 0), 0)
  // total_released = MIN(somme entrées libérées, solde RS réel) pour cohérence
  const totalReleasedRaw = releasedEntries.reduce((s: number, e: any) => s + (e.amount || 0), 0)
  const rsBalanceVal     = member?.reserve_strategique || 0
  const totalReleased    = Math.min(totalReleasedRaw, rsBalanceVal)

  // ── Calcul correct des parts pour CHAQUE entrée ──────────────────────────
  // La colonne `amount` stocke déjà : prélèvement (10%) + abondement (10% ou 20%)
  // tous deux calculés sur la prime brute du mois.
  // Formule inverse : si rsPct=10% et abondementRate=20%
  //   amount = grossPrime × (rsPct + abondementRate) / 100
  //   → part_prelevement = amount × rsPct / (rsPct + abondementRate×100)
  //   → part_abondement  = amount × abondementRate×100 / (rsPct + abondementRate×100)
  const rsPct = parseFloat(cfg['reserve_strategique_pct'] ?? '10')

  const enrichedEntries = allEntries.map((e: any) => {
    const abondRate   = e.abondement_rate || 0          // ex: 0.20
    const abondPct    = abondRate * 100                 // ex: 20
    const divisor     = rsPct + abondPct                // ex: 30
    const partPrelevement = divisor > 0
      ? Math.round((e.amount || 0) * rsPct / divisor * 100) / 100
      : 0
    const partAbondement = divisor > 0
      ? Math.round((e.amount || 0) * abondPct / divisor * 100) / 100
      : 0
    return {
      ...e,
      part_prelevement: partPrelevement,   // montant prélevé sur la prime
      part_abondement:  partAbondement,    // bonus ajouté par LEADER
    }
  })

  // Totaux des parts sur les entrées actives (locked uniquement)
  const totalPrelevement = lockedEntries.reduce((s: number, e: any) => {
    const abondPct = (e.abondement_rate || 0) * 100
    const divisor  = rsPct + abondPct
    return s + (divisor > 0 ? (e.amount || 0) * rsPct / divisor : 0)
  }, 0)
  const totalAbondement = totalLocked - totalPrelevement

  // Prochaine date de libération (la plus proche parmi les locked)
  const nextUnlock = lockedEntries.length > 0
    ? lockedEntries.reduce((min: string, e: any) => (!min || e.locked_until < min) ? e.locked_until : min, '')
    : null

  // Taux d'abondement de la première entrée active (pour info)
  const abondementRate = lockedEntries.length > 0 ? lockedEntries[0].abondement_rate : 0.10

  const withdrawalEnabled = (cfg['rs_withdrawal_enabled'] ?? '1') === '1'

  return c.json({
    balance:              rsBalanceVal,
    total_locked:         totalLocked,
    total_released:       totalReleased,
    total_prelevement:    Math.round(totalPrelevement * 100) / 100,
    total_abondement:     Math.round(totalAbondement * 100) / 100,
    abondement_rate:      abondementRate,
    next_unlock_date:     nextUnlock,
    entries:              enrichedEntries,
    locked_count:         lockedEntries.length,
    released_count:       releasedEntries.length,
    cancelled_count:      cancelledEntries.length,
    withdrawn_count:      withdrawnEntries.length,
    withdrawal_enabled:   withdrawalEnabled,
    rs_pct:               rsPct,
  })
})

// ── POST /api/members/reserve-strategique/withdraw ───────────────────────────
// Retrait immédiat de la RS vers le wallet disponible
// Pas de justificatif requis — montant transféré directement
members.post('/reserve-strategique/withdraw', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const db = c.env.DB

  const body = await c.req.json() as { amount: number; entry_id?: string }
  const amount = Number(body.amount)

  if (!amount || amount <= 0)
    return c.json({ error: 'Montant invalide' }, 400)

  // Vérifier le solde RS actuel du membre
  const member = await db.prepare(
    `SELECT reserve_strategique FROM members WHERE id = ?`
  ).bind(memberId).first() as any

  const rsBalance = member?.reserve_strategique || 0

  // ── Calculer le solde LIBÉRÉ uniquement (released + unlocked) ────────────
  // Un retrait n'est autorisé que sur les entrées dont le statut est
  // 'released' ou 'unlocked' — les entrées 'locked' sont intouchables.
  const releasedRows = await db.prepare(
    `SELECT id, amount FROM reserve_strategique
     WHERE member_id = ? AND status IN ('released','unlocked')
     ORDER BY created_at ASC`
  ).bind(memberId).all()
  const releasedEntries = (releasedRows.results || []) as any[]
  const releasedBalance = releasedEntries.reduce((s: number, e: any) => s + (e.amount || 0), 0)

  if (releasedBalance <= 0)
    return c.json({
      error: 'Aucun montant libéré disponible — vos fonds sont encore bloqués jusqu\'à la date de libération.'
    }, 422)

  if (amount > releasedBalance)
    return c.json({
      error: `Montant supérieur au solde libéré — ${releasedBalance.toFixed(2)}$ seulement disponibles au retrait.`
    }, 422)

  if (rsBalance < amount)
    return c.json({
      error: `Solde Réserve Stratégique insuffisant — ${rsBalance.toFixed(2)}$ disponible`
    }, 422)

  // Vérifier si le retrait RS est activé
  const cfgRow = await db.prepare(
    `SELECT value FROM compensation_config WHERE key = 'rs_withdrawal_enabled'`
  ).bind().first() as any
  if ((cfgRow?.value ?? '1') !== '1')
    return c.json({ error: 'Les retraits de Réserve Stratégique sont temporairement désactivés' }, 403)

  // ── Transaction atomique ──────────────────────────────────────────────────
  // 1. Débiter la RS du membre
  await db.prepare(
    `UPDATE members SET reserve_strategique = reserve_strategique - ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(amount, memberId).run()

  // 2. Créditer le wallet disponible via walletOperation
  await walletOperation(db, memberId, amount, 'credit', 'reserve_strategique',
    `Retrait Réserve Stratégique — ${amount.toFixed(2)}$`)

  // 3. Consommer les entrées libérées (FIFO — les plus anciennes d'abord)
  //    On ne touche QUE les entrées released/unlocked, jamais les locked
  {
    let remaining = amount
    for (const row of releasedEntries) {
      if (remaining <= 0) break
      await db.prepare(
        `UPDATE reserve_strategique
         SET status = 'withdrawn', unlocked_at = COALESCE(unlocked_at, datetime('now'))
         WHERE id = ?`
      ).bind(row.id).run()
      remaining -= row.amount
    }
  }

  // 4. Notification
  await createNotification(db, memberId,
    'Retrait Réserve Stratégique effectué',
    `${amount.toFixed(2)}$ de votre Réserve Stratégique ont été transférés dans votre portefeuille disponible.`,
    'rs_withdrawal'
  )

  return c.json({
    success: true,
    message: `${amount.toFixed(2)}$ transférés de votre Réserve Stratégique vers votre portefeuille disponible.`,
    amount,
    new_rs_balance: rsBalance - amount,
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// PAYPAL INTEGRATION — Routes de paiement sécurisé
// ══════════════════════════════════════════════════════════════════════════════

// ── Cache en mémoire Worker pour la config PayPal, Stripe et CoinPayments ────
// Durée : 5 minutes (300s). Evite une requête D1 à chaque paiement.
// Le cache est invalidé automatiquement après 5 min (ou redémarrage du Worker).
let _paypalConfigCache: { data: any; ts: number } | null = null
let _stripeConfigCache: { data: any; ts: number } | null = null
let _cpConfigCache:     { data: any; ts: number } | null = null
let _licenseConfigCache: { data: LicenseConfig; ts: number } | null = null
const CONFIG_CACHE_TTL = 300_000 // 5 minutes en ms

// ── Typage de la config licence ───────────────────────────────────────────────
interface LicenseConfig {
  price:          number   // Prix en USD (ex: 97)
  renewalDays:    number   // Durée de validité en jours (ex: 365)
  alertDays:      number   // Alerte avant expiration en jours (ex: 7)
  renewEarlyDays: number   // Renouvellement anticipé autorisé (ex: 30)
}

// ── Helper : lire la config licence depuis compensation_config ────────────────
async function getLicenseConfig(db: D1Database): Promise<LicenseConfig> {
  if (_licenseConfigCache && (Date.now() - _licenseConfigCache.ts) < CONFIG_CACHE_TTL) {
    return _licenseConfigCache.data
  }
  const keys = ['license_price', 'license_renewal_days', 'license_alert_days', 'license_renew_early_days']
  const rows = await db.prepare(
    `SELECT key, value FROM compensation_config WHERE key IN (${keys.map(() => '?').join(',')})`
  ).bind(...keys).all()
  const cfg: Record<string, string> = {}
  for (const r of (rows.results as any[])) cfg[r.key] = r.value

  const result: LicenseConfig = {
    price:          parseFloat(cfg.license_price            || '97'),
    renewalDays:    parseInt(cfg.license_renewal_days     || '365', 10),
    alertDays:      parseInt(cfg.license_alert_days       || '7',   10),
    renewEarlyDays: parseInt(cfg.license_renew_early_days || '30',  10),
  }
  _licenseConfigCache = { data: result, ts: Date.now() }
  return result
}

// ── Helper : calculer la date d'expiration après activation ─────────────────
// Toujours depuis l'expiry existante si valide et future (renouvellement cumulatif)
// Sinon depuis aujourd'hui (première activation ou licence expirée depuis longtemps)
async function computeLicenseExpiry(db: D1Database, memberId: string, renewalDays: number): Promise<Date> {
  const existing = await db.prepare(
    `SELECT license_expires_at FROM members WHERE id = ?`
  ).bind(memberId).first() as any

  const now = new Date()
  if (existing?.license_expires_at) {
    const currentExpiry = new Date(existing.license_expires_at)
    // Si l'expiry actuelle est dans le futur : on part de celle-ci (cumulatif)
    if (currentExpiry > now) {
      const newExpiry = new Date(currentExpiry)
      newExpiry.setDate(newExpiry.getDate() + renewalDays)
      return newExpiry
    }
  }
  // Pas d'expiry existante ou licence déjà expirée : partir d'aujourd'hui
  const newExpiry = new Date(now)
  newExpiry.setDate(newExpiry.getDate() + renewalDays)
  return newExpiry
}

// ── Helper : lire la config PayPal API depuis la DB (priorité) ou les secrets Cloudflare (fallback)
async function getPayPalConfig(db: D1Database, env: { PAYPAL_CLIENT_ID?: string; PAYPAL_CLIENT_SECRET?: string; PAYPAL_MODE?: string }): Promise<{
  clientId: string
  clientSecret: string
  mode: string
  enabled: boolean
}> {
  // Retourner depuis le cache si encore valide
  if (_paypalConfigCache && (Date.now() - _paypalConfigCache.ts) < CONFIG_CACHE_TTL) {
    return _paypalConfigCache.data
  }

  const rows = await db.prepare(
    `SELECT key, value FROM payment_gateway_config WHERE gateway = 'paypal_api'`
  ).all()
  const dbCfg: Record<string, string> = {}
  for (const r of (rows.results as any[])) dbCfg[r.key] = r.value

  const clientId     = dbCfg['client_id']     || env.PAYPAL_CLIENT_ID     || ''
  const clientSecret = dbCfg['client_secret']  || env.PAYPAL_CLIENT_SECRET || ''
  const mode         = dbCfg['mode']           || env.PAYPAL_MODE          || 'sandbox'
  const enabled      = (dbCfg['enabled'] ?? 'true') !== 'false' && !!(clientId && clientSecret)

  const result = { clientId, clientSecret, mode, enabled }
  _paypalConfigCache = { data: result, ts: Date.now() }
  return result
}

// Obtenir un access_token PayPal via l'API OAuth2
async function getPayPalAccessToken(clientId: string, clientSecret: string, mode: string): Promise<string> {
  const base = mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
  const credentials = btoa(`${clientId}:${clientSecret}`)
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

// POST /api/members/paypal/create-order
// Crée un ordre PayPal et retourne l'orderID pour le SDK frontend
members.post('/paypal/create-order', async (c) => {
  const memberId = c.get('memberId' as any) as string

  // Lire la config PayPal depuis la DB (admin) ou les secrets Cloudflare (fallback)
  const { clientId, clientSecret, mode, enabled: ppEnabled } = await getPayPalConfig(c.env.DB, c.env)
  if (!ppEnabled) {
    return c.json({ error: 'PayPal non configuré. Contactez l\'administrateur.' }, 503)
  }

  const { order_id, license_id, amount, currency = 'USD', description } = await c.req.json()

  // Vérifier qu'au moins order_id ou license_id est fourni
  if (!order_id && !license_id) return c.json({ error: 'Référence commande manquante' }, 400)
  if (!amount || amount <= 0)    return c.json({ error: 'Montant invalide' }, 400)

  // Vérifier que la commande appartient bien au membre
  if (order_id) {
    const ord = await c.env.DB.prepare(
      `SELECT id, member_id, status FROM package_orders WHERE id = ? AND member_id = ?`
    ).bind(order_id, memberId).first() as any
    if (!ord) return c.json({ error: 'Commande introuvable' }, 404)
    if (!['pending', 'proof_submitted'].includes(ord.status)) {
      return c.json({ error: 'Cette commande ne peut plus être payée' }, 409)
    }
  }
  if (license_id) {
    // La licence peut ne pas encore exister en DB si on vient du flow PayPal
    // (intent_only=true depuis /license/order) — dans ce cas on valide juste
    // que le membre n'a pas déjà une licence active.
    const lic = await c.env.DB.prepare(
      `SELECT id, member_id, status FROM finstrategia_licenses WHERE id = ? AND member_id = ?`
    ).bind(license_id, memberId).first() as any
    if (lic) {
      // Licence existante (flow manuel) → vérifier son statut
      if (!['pending'].includes(lic.status)) {
        return c.json({ error: 'Cette licence ne peut plus être payée' }, 409)
      }
    } else {
      // Licence inexistante en DB (flow PayPal intent_only) → vérifier pas de double
      const memberCheck = await c.env.DB.prepare(
        `SELECT license_active FROM members WHERE id = ?`
      ).bind(memberId).first() as any
      if (memberCheck?.license_active) {
        return c.json({ error: 'Vous possédez déjà une licence active.' }, 409)
      }
      // OK — l'ID fourni sera utilisé comme custom_id PayPal et la licence
      // sera créée en DB dans /paypal/capture-order après paiement confirmé.
    }
  }

  const base = mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

  try {
    const token = await getPayPalAccessToken(clientId, clientSecret, mode)

    // Construire le custom_id pour retrouver la commande lors de la capture
    const customId = order_id
      ? `order:${order_id}`
      : `license:${license_id}`

    const orderBody = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: Number(amount).toFixed(2),
        },
        description: description || 'LEADER — Paiement',
        custom_id: customId,
        reference_id: customId,
      }],
      application_context: {
        brand_name: 'LEADER',
        locale: 'fr-FR',
        landing_page: 'NO_PREFERENCE',   // affiche carte ET PayPal
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: 'https://willbeleader.pages.dev/payment-success',
        cancel_url: 'https://willbeleader.pages.dev/payment-cancel',
      },
    }

    const ppRes = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `leader-${customId}-${Date.now()}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(orderBody),
    })

    if (!ppRes.ok) {
      const err = await ppRes.text()
      console.error('PayPal create-order error:', err)
      return c.json({ error: 'Erreur PayPal lors de la création de l\'ordre' }, 502)
    }

    const ppOrder = await ppRes.json() as { id: string; status: string }

    // Stocker l'ID PayPal order dans notre DB pour tracking
    if (order_id) {
      await c.env.DB.prepare(
        `UPDATE package_orders SET paypal_order_id = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(ppOrder.id, order_id).run()
    }
    if (license_id) {
      // N'UPDATE que si la licence existe déjà en DB (flow manuel).
      // En flow PayPal intent_only, la licence n'est pas encore en DB —
      // elle sera créée dans /paypal/capture-order après confirmation.
      const licExists = await c.env.DB.prepare(
        `SELECT id FROM finstrategia_licenses WHERE id = ? AND member_id = ?`
      ).bind(license_id, memberId).first()
      if (licExists) {
        await c.env.DB.prepare(
          `UPDATE finstrategia_licenses SET paypal_order_id = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(ppOrder.id, license_id).run()
      }
    }

    return c.json({
      paypal_order_id: ppOrder.id,
      status: ppOrder.status,
    })
  } catch (err: any) {
    console.error('PayPal create-order exception:', err)
    return c.json({ error: err.message || 'Erreur interne PayPal' }, 500)
  }
})

// POST /api/members/paypal/capture-order
// Capture le paiement après approbation côté SDK + active automatiquement la commande
members.post('/paypal/capture-order', async (c) => {
  const memberId = c.get('memberId' as any) as string

  // Lire la config PayPal depuis la DB (admin) ou les secrets Cloudflare (fallback)
  const { clientId, clientSecret, mode, enabled: ppEnabled2 } = await getPayPalConfig(c.env.DB, c.env)
  if (!ppEnabled2) {
    return c.json({ error: 'PayPal non configuré' }, 503)
  }

  const { paypal_order_id } = await c.req.json()
  if (!paypal_order_id) return c.json({ error: 'paypal_order_id manquant' }, 400)

  const base = mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

  try {
    const token = await getPayPalAccessToken(clientId, clientSecret, mode)

    // Capturer le paiement
    const captureRes = await fetch(`${base}/v2/checkout/orders/${paypal_order_id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `capture-${paypal_order_id}-${Date.now()}`,
        'Prefer': 'return=representation',
      },
    })

    if (!captureRes.ok) {
      const errText = await captureRes.text()
      console.error('PayPal capture error:', errText)
      // Si déjà capturé (ORDER_ALREADY_CAPTURED) → considérer comme succès
      if (errText.includes('ORDER_ALREADY_CAPTURED') || errText.includes('DUPLICATE_TRANSACTION')) {
        // Chercher la commande par paypal_order_id dans notre DB
        const existingOrder = await c.env.DB.prepare(
          `SELECT id FROM package_orders WHERE paypal_order_id = ? AND member_id = ?`
        ).bind(paypal_order_id, memberId).first() as any
        if (existingOrder) {
          return c.json({ success: true, already_captured: true, order_id: existingOrder.id })
        }
      }
      return c.json({ error: 'Erreur lors de la capture du paiement PayPal' }, 502)
    }

    const captureData = await captureRes.json() as {
      id: string
      status: string
      purchase_units: Array<{
        custom_id?: string
        reference_id?: string
        payments?: {
          captures?: Array<{ id: string; status: string; amount: { value: string; currency_code: string } }>
        }
      }>
    }

    if (captureData.status !== 'COMPLETED') {
      return c.json({ error: `Paiement non complété: ${captureData.status}` }, 402)
    }

    // Extraire custom_id pour identifier notre commande
    const unit = captureData.purchase_units?.[0]
    const customId = unit?.custom_id || unit?.reference_id || ''
    const capture  = unit?.payments?.captures?.[0]
    const captureId = capture?.id || ''
    const capturedAmount = parseFloat(capture?.amount?.value || '0')

    let internalOrderId: string | null = null
    let licenseId: string | null = null

    if (customId.startsWith('order:')) {
      internalOrderId = customId.replace('order:', '')
    } else if (customId.startsWith('license:')) {
      licenseId = customId.replace('license:', '')
    } else {
      // Fallback : chercher par paypal_order_id dans notre DB
      const found = await c.env.DB.prepare(
        `SELECT id FROM package_orders WHERE paypal_order_id = ? AND member_id = ?`
      ).bind(paypal_order_id, memberId).first() as any
      if (found) internalOrderId = found.id
    }

    // ── Marquer la commande package comme payée + activer ────────────────────
    if (internalOrderId) {
      const ord = await c.env.DB.prepare(
        `SELECT * FROM package_orders WHERE id = ? AND member_id = ?`
      ).bind(internalOrderId, memberId).first() as any
      if (!ord) return c.json({ error: 'Commande introuvable en DB' }, 404)

      // Passer directement à 'validated' en un seul UPDATE atomique.
      // IMPORTANT : le statut 'paid' n'existe PAS dans le CHECK constraint
      // de package_orders — les valeurs autorisées sont :
      // ('pending','proof_submitted','validated','rejected','cancelled')
      await c.env.DB.prepare(
        `UPDATE package_orders
         SET status          = 'validated',
             payment_method  = 'paypal',
             paypal_order_id = ?,
             proof_url       = ?,
             validated_at    = datetime('now'),
             updated_at      = datetime('now')
         WHERE id = ?`
      ).bind(paypal_order_id, `paypal:capture:${captureId}`, internalOrderId).run()

      // Activer le package et créditer le BV
      await activateAndReward(c.env.DB, internalOrderId, 'system-paypal')

      // Frais admin : marquer comme payé si inclus dans le montant
      const adminFeeAmount = ord.admin_fee_amount || 0
      if (adminFeeAmount > 0) {
        await c.env.DB.prepare(
          `UPDATE members SET admin_fee_paid = 1, admin_fee_paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
        ).bind(memberId).run()
      }

      await createNotification(
        c.env.DB, memberId, 'success',
        'Paiement PayPal confirmé',
        `Votre paiement de $${capturedAmount.toFixed(2)} a été reçu et votre commande activée automatiquement.`
      )

      return c.json({
        success:          true,
        order_id:         internalOrderId,
        paypal_capture_id: captureId,
        amount:           capturedAmount,
        message:          'Paiement reçu et package activé automatiquement !',
      })
    }

    // ── Marquer la licence comme payée + activer ──────────────────────────────
    if (licenseId) {
      // Vérifier si la licence existe déjà en DB
      // (flow manuel : créée dans /license/order ; flow PayPal : PAS encore créée)
      let lic = await c.env.DB.prepare(
        `SELECT * FROM finstrategia_licenses WHERE id = ? AND member_id = ?`
      ).bind(licenseId, memberId).first() as any

      // ── GUARD : double-capture impossible ────────────────────────────────────
      if (lic && lic.status === 'active') {
        // Déjà activée (retry SDK) → succès idempotent
        return c.json({
          success:           true,
          license_id:        licenseId,
          paypal_capture_id: captureId,
          amount:            capturedAmount,
          message:           'Licence déjà active.',
        })
      }

      // ── FLOW PAYPAL SANS PRÉ-CRÉATION : créer la licence ici après confirmation
      // C'est le cas normal PayPal depuis /license/order (intent_only=true)
      // La licence est créée directement en 'active' car paiement confirmé par PayPal.
      const licCfgPP = await getLicenseConfig(c.env.DB)

      // C2 FIX : lire les frais admin AVANT de potentiellement écraser lic
      // Pour le flow PayPal (pas de pré-création), calculer les frais depuis le membre
      let adminFeeAmountPP = 0
      if (!lic) {
        // Vérifier que le membre peut créer une nouvelle licence (renouvellement anticipé géré dans /license/order)
        const memberCheck = await c.env.DB.prepare(
          `SELECT license_active, license_expires_at, admin_fee_paid FROM members WHERE id = ?`
        ).bind(memberId).first() as any
        // C2 FIX : calculer admin_fee pour le flow PayPal sans pré-création
        const feeActiveRowPP = await c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_active'`).first() as any
        const feeAmountRowPP = await c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_amount'`).first() as any
        const feeActivePP = (feeActiveRowPP?.value || 'true') === 'true'
        const feeAmtPP    = parseFloat(feeAmountRowPP?.value || '49')
        adminFeeAmountPP  = (feeActivePP && !memberCheck?.admin_fee_paid) ? feeAmtPP : 0

        // Créer la licence directement en 'active' — paiement PayPal confirmé
        await c.env.DB.prepare(
          `INSERT INTO finstrategia_licenses
             (id, member_id, price_usd, status, payment_method, paypal_order_id, admin_fee_amount, validated_at)
           VALUES (?, ?, ?, 'active', 'paypal', ?, ?, datetime('now'))`
        ).bind(licenseId, memberId, capturedAmount, paypal_order_id, adminFeeAmountPP).run()
        lic = { admin_fee_amount: adminFeeAmountPP }
      } else {
        adminFeeAmountPP = lic.admin_fee_amount || 0
        // ── FLOW MANUEL : mise à jour de la licence existante (pending → active)
        await c.env.DB.prepare(
          `UPDATE finstrategia_licenses
           SET status = 'active',
               payment_method = 'paypal',
               paypal_order_id = ?,
               validated_at = datetime('now'),
               updated_at = datetime('now')
           WHERE id = ?`
        ).bind(paypal_order_id, licenseId).run()
      }

      // C1 FIX : calcul de l'expiry depuis l'expiry existante (cumulatif)
      const licExpiresPP = await computeLicenseExpiry(c.env.DB, memberId, licCfgPP.renewalDays)
      await c.env.DB.prepare(
        `UPDATE members SET license_active = 1, license_expires_at = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(licExpiresPP.toISOString(), memberId).run()
      // Mettre aussi à jour l'expiry dans la table finstrategia_licenses
      await c.env.DB.prepare(
        `UPDATE finstrategia_licenses SET expires_at = ?, starts_at = COALESCE(starts_at, datetime('now')) WHERE id = ?`
      ).bind(licExpiresPP.toISOString(), licenseId).run()

      // C2 FIX : marquer admin_fee_paid si des frais admin ont été inclus
      if (adminFeeAmountPP > 0) {
        await c.env.DB.prepare(
          `UPDATE members SET admin_fee_paid = 1, admin_fee_paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
        ).bind(memberId).run()
      }

      await createNotification(
        c.env.DB, memberId, 'success',
        'Licence Finstrategia activée',
        `Votre paiement PayPal de $${capturedAmount.toFixed(2)} a été reçu. Votre licence est active jusqu'au ${licExpiresPP.toLocaleDateString('fr-FR')}.`
      )

      return c.json({
        success:           true,
        license_id:        licenseId,
        paypal_capture_id: captureId,
        amount:            capturedAmount,
        message:           'Paiement reçu et licence activée automatiquement !',
      })
    }

    return c.json({ error: 'Impossible d\'identifier la commande associée' }, 422)

  } catch (err: any) {
    console.error('PayPal capture exception:', err)
    return c.json({ error: err.message || 'Erreur interne PayPal' }, 500)
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// STRIPE — Payment Intents API
// ══════════════════════════════════════════════════════════════════════════════

// Helper : lire la config Stripe depuis la DB (admin) ou les secrets Cloudflare (fallback)
async function getStripeConfig(db: D1Database, env: {
  STRIPE_PUBLIC_KEY?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
}): Promise<{ publicKey: string; secretKey: string; webhookSecret: string; mode: string; enabled: boolean }> {
  // Cache 5 minutes
  if (_stripeConfigCache && (Date.now() - _stripeConfigCache.ts) < CONFIG_CACHE_TTL) {
    return _stripeConfigCache.data
  }

  const rows = await db.prepare(
    `SELECT key, value FROM payment_gateway_config WHERE gateway = 'stripe_api'`
  ).all()
  const cfg: Record<string, string> = {}
  for (const r of (rows.results as any[])) cfg[r.key] = r.value

  // Fallback : lire depuis payment_methods V2 (nouveau système admin)
  // Le champ public key s'appelle 'publishable_key' dans V2
  let v2PublicKey = '', v2SecretKey = '', v2WebhookSecret = '', v2Mode = ''
  try {
    const v2Row = await db.prepare(
      `SELECT config FROM payment_methods WHERE provider = 'stripe' AND is_active = 1 LIMIT 1`
    ).first() as any
    if (v2Row?.config) {
      const v2cfg = JSON.parse(v2Row.config)
      v2PublicKey     = v2cfg['publishable_key'] || v2cfg['public_key'] || ''
      v2SecretKey     = v2cfg['secret_key'] || ''
      v2WebhookSecret = v2cfg['webhook_secret'] || ''
      v2Mode          = v2cfg['mode'] || ''
    }
  } catch {}

  const publicKey     = cfg['public_key']     || v2PublicKey     || env.STRIPE_PUBLIC_KEY     || ''
  const secretKey     = cfg['secret_key']      || v2SecretKey     || env.STRIPE_SECRET_KEY     || ''
  const webhookSecret = cfg['webhook_secret']  || v2WebhookSecret || env.STRIPE_WEBHOOK_SECRET || ''
  const mode          = cfg['mode']            || v2Mode          || (publicKey.startsWith('pk_live') ? 'live' : 'test')
  const enabled       = (cfg['enabled'] ?? 'true') !== 'false' && !!(publicKey && secretKey)

  const result = { publicKey, secretKey, webhookSecret, mode, enabled }
  _stripeConfigCache = { data: result, ts: Date.now() }
  return result
}

// POST /api/members/stripe/create-payment-intent
// Crée un PaymentIntent Stripe et retourne le client_secret pour le SDK frontend
members.post('/stripe/create-payment-intent', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const { secretKey, enabled } = await getStripeConfig(c.env.DB, c.env)
  if (!enabled) return c.json({ error: 'Stripe non configuré. Contactez l\'administrateur.' }, 503)

  const { order_id, license_id, physical_card_order_id, amount, currency = 'usd', description } = await c.req.json()

  if (!order_id && !license_id && !physical_card_order_id) return c.json({ error: 'Référence commande manquante' }, 400)
  if (!amount || amount <= 0)    return c.json({ error: 'Montant invalide' }, 400)

  // Vérifier que la commande/licence appartient bien au membre
  if (order_id) {
    const ord = await c.env.DB.prepare(
      `SELECT id, status FROM package_orders WHERE id = ? AND member_id = ?`
    ).bind(order_id, memberId).first() as any
    if (!ord) return c.json({ error: 'Commande introuvable' }, 404)
    if (!['pending', 'proof_submitted'].includes(ord.status)) {
      return c.json({ error: 'Cette commande ne peut plus être payée' }, 409)
    }
  }
  if (license_id) {
    const lic = await c.env.DB.prepare(
      `SELECT id, status FROM finstrategia_licenses WHERE id = ? AND member_id = ?`
    ).bind(license_id, memberId).first() as any
    if (lic && !['pending'].includes(lic.status)) {
      return c.json({ error: 'Cette licence ne peut plus être payée' }, 409)
    }
    if (!lic) {
      const memberCheck = await c.env.DB.prepare(
        `SELECT license_active FROM members WHERE id = ?`
      ).bind(memberId).first() as any
      if (memberCheck?.license_active) {
        return c.json({ error: 'Vous possédez déjà une licence active.' }, 409)
      }
    }
  }
  if (physical_card_order_id) {
    const pco = await c.env.DB.prepare(
      `SELECT id, status FROM physical_card_orders WHERE id = ? AND member_id = ?`
    ).bind(physical_card_order_id, memberId).first() as any
    if (!pco) return c.json({ error: 'Commande carte introuvable' }, 404)
    if (!['pending'].includes(pco.status)) {
      return c.json({ error: 'Cette commande carte ne peut plus être payée' }, 409)
    }
  }

  // Construire le metadata pour retrouver la commande au webhook
  const metadata: Record<string, string> = { member_id: memberId }
  if (order_id)             metadata['order_id']             = order_id
  if (license_id)           metadata['license_id']           = license_id
  if (physical_card_order_id) metadata['physical_card_order_id'] = physical_card_order_id

  try {
    // Créer le PaymentIntent via l'API Stripe REST (pas de SDK Node — Cloudflare Workers)
    const body = new URLSearchParams({
      amount:                        String(Math.round(Number(amount) * 100)), // cents
      currency:                      currency.toLowerCase(),
      'automatic_payment_methods[enabled]': 'true',  // CB + Apple Pay + Google Pay auto
      description:                   description || 'LEADER — Paiement',
      'metadata[member_id]':         memberId,
      ...(order_id             && { 'metadata[order_id]':             order_id }),
      ...(license_id           && { 'metadata[license_id]':           license_id }),
      ...(physical_card_order_id && { 'metadata[physical_card_order_id]': physical_card_order_id }),
    })

    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type':  'application/x-www-form-urlencoded',
        'Stripe-Version': '2024-06-20',
      },
      body: body.toString(),
    })

    if (!res.ok) {
      const err = await res.json() as any
      console.error('Stripe create-payment-intent error:', err)
      return c.json({ error: err?.error?.message || 'Erreur Stripe' }, 502)
    }

    const pi = await res.json() as { id: string; client_secret: string; status: string }

    // Stocker le payment_intent_id dans notre DB pour tracking
    if (order_id) {
      await c.env.DB.prepare(
        `UPDATE package_orders SET paypal_order_id = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(`stripe:${pi.id}`, order_id).run()
    }
    if (license_id) {
      const licExists = await c.env.DB.prepare(
        `SELECT id FROM finstrategia_licenses WHERE id = ? AND member_id = ?`
      ).bind(license_id, memberId).first()
      if (licExists) {
        await c.env.DB.prepare(
          `UPDATE finstrategia_licenses SET paypal_order_id = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(`stripe:${pi.id}`, license_id).run()
      }
    }
    if (physical_card_order_id) {
      await c.env.DB.prepare(
        `UPDATE physical_card_orders SET payment_ref = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(`stripe:${pi.id}`, physical_card_order_id).run()
    }

    return c.json({ client_secret: pi.client_secret, payment_intent_id: pi.id })

  } catch (err: any) {
    console.error('Stripe create-payment-intent exception:', err)
    return c.json({ error: err.message || 'Erreur interne Stripe' }, 500)
  }
})

// POST /api/members/stripe/confirm-payment
// Appelé par le frontend après confirmation Stripe réussie (payment_intent status = succeeded)
// Stripe garantit le paiement via signature webhook — ce endpoint active la commande.
members.post('/stripe/confirm-payment', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const { payment_intent_id, order_id, license_id, physical_card_order_id } = await c.req.json()

  if (!payment_intent_id) return c.json({ error: 'payment_intent_id manquant' }, 400)
  if (!order_id && !license_id && !physical_card_order_id) return c.json({ error: 'Référence commande manquante' }, 400)

  const { secretKey, enabled } = await getStripeConfig(c.env.DB, c.env)
  if (!enabled) return c.json({ error: 'Stripe non configuré' }, 503)

  // Vérifier le statut du PaymentIntent directement auprès de Stripe (source de vérité)
  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${payment_intent_id}`, {
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Stripe-Version': '2024-06-20',
    },
  })

  if (!res.ok) return c.json({ error: 'Impossible de vérifier le paiement Stripe' }, 502)

  const pi = await res.json() as { id: string; status: string; amount: number; currency: string }

  // Refuser toute activation si le paiement n'est pas confirmé par Stripe
  if (pi.status !== 'succeeded') {
    return c.json({ error: `Paiement non confirmé (statut: ${pi.status})` }, 402)
  }

  const capturedAmount = pi.amount / 100 // Stripe renvoie en cents
  const stripeRef = `stripe:${payment_intent_id}`

  // ── Activer la commande package ──────────────────────────────────────────
  if (order_id) {
    const ord = await c.env.DB.prepare(
      `SELECT * FROM package_orders WHERE id = ? AND member_id = ?`
    ).bind(order_id, memberId).first() as any
    if (!ord) return c.json({ error: 'Commande introuvable' }, 404)
    if (ord.activation_done) {
      return c.json({ success: true, already_activated: true, order_id })
    }

    await c.env.DB.prepare(
      `UPDATE package_orders
       SET status          = 'validated',
           payment_method  = 'stripe',
           paypal_order_id = ?,
           proof_url       = ?,
           validated_at    = datetime('now'),
           updated_at      = datetime('now')
       WHERE id = ?`
    ).bind(stripeRef, stripeRef, order_id).run()

    await activateAndReward(c.env.DB, order_id, 'system-stripe')

    const adminFeeAmount = ord.admin_fee_amount || 0
    if (adminFeeAmount > 0) {
      await c.env.DB.prepare(
        `UPDATE members SET admin_fee_paid = 1, admin_fee_paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).bind(memberId).run()
    }

    await createNotification(
      c.env.DB, memberId, 'success',
      'Paiement Stripe confirmé',
      `Votre paiement de $${capturedAmount.toFixed(2)} a été reçu et votre commande activée automatiquement.`
    )

    return c.json({
      success:              true,
      order_id,
      payment_intent_id,
      amount:               capturedAmount,
      message:              'Paiement reçu et package activé automatiquement !',
    })
  }

  // ── Activer la licence ───────────────────────────────────────────────────
  if (license_id) {
    const licCfgStripe = await getLicenseConfig(c.env.DB)
    let lic = await c.env.DB.prepare(
      `SELECT * FROM finstrategia_licenses WHERE id = ? AND member_id = ?`
    ).bind(license_id, memberId).first() as any

    if (lic?.status === 'active') {
      return c.json({ success: true, already_activated: true, license_id })
    }

    let adminFeeAmtStripe = 0
    if (!lic) {
      const memberCheck = await c.env.DB.prepare(
        `SELECT license_active, admin_fee_paid FROM members WHERE id = ?`
      ).bind(memberId).first() as any
      // Calculer frais admin pour flow Stripe sans pré-création
      const fAR = await c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_active'`).first() as any
      const fAmR = await c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_amount'`).first() as any
      const fAct = (fAR?.value || 'true') === 'true'
      adminFeeAmtStripe = (fAct && !memberCheck?.admin_fee_paid) ? parseFloat(fAmR?.value || '49') : 0

      await c.env.DB.prepare(
        `INSERT INTO finstrategia_licenses
           (id, member_id, price_usd, status, payment_method, paypal_order_id, admin_fee_amount, validated_at)
         VALUES (?, ?, ?, 'active', 'stripe', ?, ?, datetime('now'))`
      ).bind(license_id, memberId, capturedAmount, stripeRef, adminFeeAmtStripe).run()
      lic = { admin_fee_amount: adminFeeAmtStripe }
    } else {
      adminFeeAmtStripe = lic.admin_fee_amount || 0
      await c.env.DB.prepare(
        `UPDATE finstrategia_licenses
         SET status = 'active', payment_method = 'stripe',
             paypal_order_id = ?, validated_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`
      ).bind(stripeRef, license_id).run()
    }

    // C1 FIX : expiry cumulatif depuis l'expiry existante
    const licExpiresStripe = await computeLicenseExpiry(c.env.DB, memberId, licCfgStripe.renewalDays)
    await c.env.DB.prepare(
      `UPDATE members SET license_active = 1, license_expires_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(licExpiresStripe.toISOString(), memberId).run()
    await c.env.DB.prepare(
      `UPDATE finstrategia_licenses SET expires_at = ?, starts_at = COALESCE(starts_at, datetime('now')) WHERE id = ?`
    ).bind(licExpiresStripe.toISOString(), license_id).run()

    if (adminFeeAmtStripe > 0) {
      await c.env.DB.prepare(
        `UPDATE members SET admin_fee_paid = 1, admin_fee_paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).bind(memberId).run()
    }

    await createNotification(
      c.env.DB, memberId, 'success',
      'Licence Finstrategia activée',
      `Votre paiement Stripe de $${capturedAmount.toFixed(2)} a été reçu. Votre licence est active jusqu'au ${licExpiresStripe.toLocaleDateString('fr-FR')}.`
    )

    return c.json({
      success:           true,
      license_id,
      payment_intent_id,
      amount:            capturedAmount,
      message:           'Paiement reçu et licence activée automatiquement !',
    })
  }

  // ── Activer la commande carte physique ──────────────────────────────────────
  if (physical_card_order_id) {
    const pco = await c.env.DB.prepare(
      `SELECT * FROM physical_card_orders WHERE id = ? AND member_id = ?`
    ).bind(physical_card_order_id, memberId).first() as any
    if (!pco) return c.json({ error: 'Commande carte introuvable' }, 404)
    if (pco.status === 'paid' || pco.status === 'processing' || pco.status === 'shipped') {
      return c.json({ success: true, already_paid: true, physical_card_order_id })
    }

    await c.env.DB.prepare(
      `UPDATE physical_card_orders
       SET status = 'paid', payment_ref = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(stripeRef, physical_card_order_id).run()

    await createNotification(
      c.env.DB, memberId, 'success',
      'Carte physique commandée',
      `Votre paiement de $${capturedAmount.toFixed(2)} a été reçu. Votre carte sera expédiée sous 7–14 jours ouvrés.`
    )

    return c.json({
      success:               true,
      physical_card_order_id,
      payment_intent_id,
      amount:                capturedAmount,
      message:               'Paiement reçu — votre carte est en cours de fabrication !',
    })
  }

  return c.json({ error: 'Impossible d\'identifier la commande' }, 422)
})

// ══════════════════════════════════════════════════════════════════════════════
// ── COINPAYMENTS ──────────────────────────────────────────────────────────────
// Architecture identique à PayPal et Stripe :
//   - Config depuis la DB (admin) avec fallback secrets Cloudflare
//   - Cache mémoire Worker 5 minutes
//   - Route publique : /coinpayments/config (merchant_id, coins acceptés)
//   - Route privée  : /coinpayments/create-transaction (crée la transaction CP)
//   - Route privée  : /coinpayments/check-transaction  (vérifie le statut)
//   - Webhook IPN   : /api/webhooks/coinpayments (dans index.tsx)
//
// Flow de paiement CoinPayments :
//   1. Frontend GET /coinpayments/config → récupère merchant_id + coins
//   2. Frontend POST /coinpayments/create-transaction → backend crée la TX via API CoinPayments
//      → retourne { checkout_url, txn_id, status_url }
//   3. Membre est redirigé vers checkout_url (page CoinPayments)
//   4. CoinPayments envoie un IPN (webhook) à /api/webhooks/coinpayments
//   5. Backend vérifie la signature HMAC-SHA512 et active la commande
//   6. Frontend poll GET /coinpayments/check-transaction pour afficher le statut
// ══════════════════════════════════════════════════════════════════════════════

// Helper : lire la config CoinPayments depuis la DB (admin) ou les secrets Cloudflare
async function getCoinPaymentsConfig(db: D1Database, env: {
  CP_MERCHANT_ID?: string
  CP_PUBLIC_KEY?: string
  CP_PRIVATE_KEY?: string
  CP_IPN_SECRET?: string
}): Promise<{
  merchantId: string
  publicKey: string
  privateKey: string
  ipnSecret: string
  coins: string
  enabled: boolean
}> {
  // Cache 5 minutes
  if (_cpConfigCache && (Date.now() - _cpConfigCache.ts) < CONFIG_CACHE_TTL) {
    return _cpConfigCache.data
  }

  const rows = await db.prepare(
    `SELECT key, value FROM payment_gateway_config WHERE gateway = 'coinpayments_api'`
  ).all()
  const cfg: Record<string, string> = {}
  for (const r of (rows.results as any[])) cfg[r.key] = r.value

  const merchantId = cfg['merchant_id'] || env.CP_MERCHANT_ID || ''
  const publicKey  = cfg['public_key']  || env.CP_PUBLIC_KEY  || ''
  const privateKey = cfg['private_key'] || env.CP_PRIVATE_KEY || ''
  const ipnSecret  = cfg['ipn_secret']  || env.CP_IPN_SECRET  || ''
  // Coins acceptés — par défaut : USDT.TRC20, LTC, ETH, BTC
  const coins      = cfg['coins']       || 'USDT.TRC20,LTC,ETH,BTC'
  const enabled    = (cfg['enabled'] ?? 'true') !== 'false' && !!(merchantId && privateKey)

  const result = { merchantId, publicKey, privateKey, ipnSecret, coins, enabled }
  _cpConfigCache = { data: result, ts: Date.now() }
  return result
}

// Helper : appel API CoinPayments REST (HMAC-SHA512)
// ⚠️ Le nonce est OBLIGATOIRE — valeur unique croissante (timestamp ms)
async function callCoinPaymentsAPI(privateKey: string, publicKey: string, params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams({
    ...params,
    version: '1',
    key:     publicKey,
    format:  'json',
    nonce:   Date.now().toString(),   // ← OBLIGATOIRE : manquait, cause de l'erreur
  })
  const bodyStr = body.toString()

  // HMAC-SHA512 du body avec la clé privée
  const keyData  = new TextEncoder().encode(privateKey)
  const msgData  = new TextEncoder().encode(bodyStr)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData,
    { name: 'HMAC', hash: 'SHA-512' },
    false, ['sign']
  )
  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
  const sig    = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

  const res = await fetch('https://www.coinpayments.net/api.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'HMAC': sig,
    },
    body: bodyStr,
  })

  if (!res.ok) throw new Error(`CoinPayments API HTTP ${res.status}`)
  const json = await res.json() as { error: string; result: any }
  if (json.error !== 'ok') throw new Error(`CoinPayments API error: ${json.error}`)
  return json.result
}

// POST /api/members/coinpayments/create-transaction
// Crée une transaction CoinPayments et retourne l'URL de checkout
members.post('/coinpayments/create-transaction', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const { merchantId, publicKey, privateKey, coins, enabled } = await getCoinPaymentsConfig(c.env.DB, c.env)

  if (!enabled) return c.json({ error: 'CoinPayments non configuré. Contactez l\'administrateur.' }, 503)

  const { order_id, license_id, amount, currency = 'USD', coin = 'USDT.TRC20', description } = await c.req.json()

  if (!order_id && !license_id) return c.json({ error: 'Référence commande manquante' }, 400)
  if (!amount || amount <= 0)    return c.json({ error: 'Montant invalide' }, 400)

  // Récupérer l'email du membre (obligatoire pour CoinPayments buyer_email)
  const memberRow = await c.env.DB.prepare(
    `SELECT email FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  const buyerEmail = memberRow?.email || ''

  // Vérifier que le coin demandé est bien dans la liste autorisée
  const allowedCoins = coins.split(',').map((s: string) => s.trim())
  if (!allowedCoins.includes(coin)) {
    return c.json({ error: `Cryptomonnaie non acceptée. Choix disponibles : ${coins}` }, 400)
  }

  // Vérifier ownership de la commande/licence
  if (order_id) {
    const ord = await c.env.DB.prepare(
      `SELECT id, status FROM package_orders WHERE id = ? AND member_id = ?`
    ).bind(order_id, memberId).first() as any
    if (!ord) return c.json({ error: 'Commande introuvable' }, 404)
    if (!['pending', 'proof_submitted'].includes(ord.status)) {
      return c.json({ error: 'Cette commande ne peut plus être payée' }, 409)
    }
  }
  if (license_id) {
    const lic = await c.env.DB.prepare(
      `SELECT id, status FROM finstrategia_licenses WHERE id = ? AND member_id = ?`
    ).bind(license_id, memberId).first() as any
    if (lic && !['pending'].includes(lic.status)) {
      return c.json({ error: 'Cette licence ne peut plus être payée' }, 409)
    }
    if (!lic) {
      const memberCheck = await c.env.DB.prepare(
        `SELECT license_active FROM members WHERE id = ?`
      ).bind(memberId).first() as any
      if (memberCheck?.license_active) {
        return c.json({ error: 'Vous possédez déjà une licence active.' }, 409)
      }
    }
  }

  // Construire le custom1 et custom2 pour retrouver la commande dans l'IPN
  // Format : "order:{id}" ou "license:{id}", + member_id dans custom2
  const custom1 = order_id   ? `order:${order_id}`   : `license:${license_id}`
  const custom2 = memberId

  try {
    const result = await callCoinPaymentsAPI(privateKey, publicKey, {
      cmd:              'create_transaction',
      amount:           String(Number(amount).toFixed(8)),
      currency1:        'USD',          // Devise de référence (prix affiché en USD)
      currency2:        coin,           // Cryptomonnaie réelle pour le paiement
      buyer_email:      buyerEmail,
      item_name:        description || `LEADER — Paiement`,
      item_number:      custom1,
      custom:           custom1,
      custom1,
      custom2,
      ipn_url:          'https://willbeleader.pages.dev/api/webhooks/coinpayments',
    })

    const txnId      = result.txn_id
    const checkoutUrl = result.checkout_url || `https://www.coinpayments.net/index.php?cmd=checkout&id=${txnId}`
    const statusUrl  = result.status_url    || `https://www.coinpayments.net/index.php?cmd=detail&id=${txnId}`
    const address    = result.address       || ''
    const destTag    = result.dest_tag      || ''

    // Stocker le txn_id dans la commande pour tracking
    if (order_id) {
      await c.env.DB.prepare(
        `UPDATE package_orders SET paypal_order_id = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(`cp:${txnId}`, order_id).run()
    }
    if (license_id) {
      const licExists = await c.env.DB.prepare(
        `SELECT id FROM finstrategia_licenses WHERE id = ? AND member_id = ?`
      ).bind(license_id, memberId).first()
      if (licExists) {
        await c.env.DB.prepare(
          `UPDATE finstrategia_licenses SET paypal_order_id = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(`cp:${txnId}`, license_id).run()
      }
    }

    return c.json({
      txn_id:       txnId,
      checkout_url: checkoutUrl,
      status_url:   statusUrl,
      address,
      dest_tag:     destTag,
      coin,
      amount:       result.amount || amount,
      confirms_needed: result.confirms_needed || 1,
      timeout:      result.timeout || 3600,
    })

  } catch (err: any) {
    console.error('CoinPayments create-transaction error:', err)
    return c.json({ error: err.message || 'Erreur CoinPayments' }, 502)
  }
})

// GET /api/members/coinpayments/check-transaction?txn_id=xxx
// Vérifie le statut d'une transaction CoinPayments (pour polling frontend)
// Statuts CoinPayments : -1=cancelled, 0=waiting, 1=confirmed(partial), 2=queued, 3=paymentPending, 100=complete
members.get('/coinpayments/check-transaction', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const txnId    = c.req.query('txn_id')
  if (!txnId) return c.json({ error: 'txn_id manquant' }, 400)

  const { publicKey, privateKey, enabled } = await getCoinPaymentsConfig(c.env.DB, c.env)
  if (!enabled) return c.json({ error: 'CoinPayments non configuré' }, 503)

  // Appel direct à l'API CoinPayments sans passer par callCoinPaymentsAPI
  // pour pouvoir inspecter la réponse brute (error field) sans exception
  try {
    const body = new URLSearchParams({
      cmd:     'get_tx_info',
      txid:    txnId,
      version: '1',
      key:     publicKey,
      format:  'json',
      nonce:   Date.now().toString(),
    })
    const bodyStr = body.toString()
    const keyData   = new TextEncoder().encode(privateKey)
    const msgData   = new TextEncoder().encode(bodyStr)
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
    const sigBuf    = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
    const sig       = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

    const res  = await fetch('https://www.coinpayments.net/api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'HMAC': sig },
      body: bodyStr,
    })

    if (!res.ok) {
      // Erreur réseau/HTTP → temporaire, on ne bloque pas
      return c.json({ txn_id: txnId, status: 0, status_text: 'Vérification en cours…', is_complete: false, is_cancelled: false, temporary: true })
    }

    const json = await res.json() as { error: string; result: any }

    // CoinPayments renvoie error !== 'ok' pour les TX non encore indexées
    // ou pour des erreurs légitimes. On retourne toujours un JSON exploitable.
    if (json.error !== 'ok') {
      // Logguer le vrai message pour diagnostic
      console.error(`[CP check-tx] txnId=${txnId} error="${json.error}"`)
      // Toute erreur CP est traitée comme temporaire côté frontend (affichage neutre)
      return c.json({
        txn_id:       txnId,
        status:       0,
        status_text:  'En attente de confirmation…',
        is_complete:  false,
        is_cancelled: false,
        temporary:    true,
        cp_error:     json.error,   // inclus pour debug, non affiché au membre
      })
    }

    const result    = json.result || {}
    const status    = Number(result.status)
    const isComplete  = status >= 100
    const isCancelled = status < 0

    return c.json({
      txn_id:       txnId,
      status,
      status_text:  result.status_text || '',
      is_complete:  isComplete,
      is_cancelled: isCancelled,
      coin:         result.coin     || '',
      amount:       result.amount   || 0,
      amounti:      result.amounti  || 0,
      received:     result.received || 0,
      confirms:     result.confirms || 0,
    })

  } catch (err: any) {
    // Erreur réseau pure (timeout, etc.) → temporaire
    console.error(`[CP check-tx] network error: ${err?.message}`)
    return c.json({
      txn_id:       txnId,
      status:       0,
      status_text:  'Vérification en cours…',
      is_complete:  false,
      is_cancelled: false,
      temporary:    true,
    })
  }
})

// POST /api/members/coinpayments/confirm-payment
// Appelé par le frontend après redirection depuis CoinPayments (flow simplifié)
// Le vrai déclenchement d'activation se fait via l'IPN (webhook) dans index.tsx
// Ce endpoint permet d'activer MANUELLEMENT si l'IPN a raté (filet de sécurité)
members.post('/coinpayments/confirm-payment', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const { txn_id, order_id, license_id } = await c.req.json()

  if (!txn_id)                          return c.json({ error: 'txn_id manquant' }, 400)
  if (!order_id && !license_id)          return c.json({ error: 'Référence commande manquante' }, 400)

  const { publicKey, privateKey, enabled } = await getCoinPaymentsConfig(c.env.DB, c.env)
  if (!enabled) return c.json({ error: 'CoinPayments non configuré' }, 503)

  // Vérifier le statut réel auprès de CoinPayments (source de vérité)
  let txStatus = 0
  let txAmount = 0
  try {
    const result = await callCoinPaymentsAPI(privateKey, publicKey, {
      cmd:  'get_tx_info',
      txid: txn_id,
    })
    txStatus = Number(result.status)
    txAmount = Number(result.amount || 0)
  } catch (err: any) {
    return c.json({ error: `Impossible de vérifier la transaction CoinPayments : ${err.message}` }, 502)
  }

  // N'activer que si statut >= 100 (paiement complet)
  if (txStatus < 100) {
    return c.json({
      error:  `Paiement non encore confirmé (statut CoinPayments: ${txStatus}). Veuillez patienter.`,
      status: txStatus,
    }, 402)
  }

  const cpRef = `cp:${txn_id}`

  // ── Activer la commande package ─────────────────────────────────────────────
  if (order_id) {
    const ord = await c.env.DB.prepare(
      `SELECT * FROM package_orders WHERE id = ? AND member_id = ?`
    ).bind(order_id, memberId).first() as any
    if (!ord) return c.json({ error: 'Commande introuvable' }, 404)
    if (ord.activation_done) {
      return c.json({ success: true, already_activated: true, order_id })
    }

    await c.env.DB.prepare(
      `UPDATE package_orders
       SET status          = 'validated',
           payment_method  = 'crypto',
           paypal_order_id = ?,
           proof_url       = ?,
           validated_at    = datetime('now'),
           updated_at      = datetime('now')
       WHERE id = ?`
    ).bind(cpRef, cpRef, order_id).run()

    await activateAndReward(c.env.DB, order_id, 'system-coinpayments')

    await createNotification(
      c.env.DB, memberId, 'success',
      'Paiement crypto confirmé',
      `Votre paiement crypto de $${txAmount.toFixed(2)} a été reçu et votre commande activée.`
    )

    return c.json({ success: true, order_id, txn_id, amount: txAmount, message: 'Paiement crypto reçu et package activé !' })
  }

  // ── Activer la licence ───────────────────────────────────────────────────────
  if (license_id) {
    const licCfgCP = await getLicenseConfig(c.env.DB)
    let lic = await c.env.DB.prepare(
      `SELECT * FROM finstrategia_licenses WHERE id = ? AND member_id = ?`
    ).bind(license_id, memberId).first() as any

    if (lic?.status === 'active') {
      return c.json({ success: true, already_activated: true, license_id })
    }

    let adminFeeAmtCP = 0
    if (!lic) {
      const memberCheck = await c.env.DB.prepare(`SELECT license_active, admin_fee_paid FROM members WHERE id = ?`).bind(memberId).first() as any
      const fARcp  = await c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_active'`).first() as any
      const fAmRcp = await c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_amount'`).first() as any
      const fActCP = (fARcp?.value || 'true') === 'true'
      adminFeeAmtCP = (fActCP && !memberCheck?.admin_fee_paid) ? parseFloat(fAmRcp?.value || '49') : 0

      await c.env.DB.prepare(
        `INSERT INTO finstrategia_licenses
           (id, member_id, price_usd, status, payment_method, paypal_order_id, admin_fee_amount, validated_at)
         VALUES (?, ?, ?, 'active', 'crypto', ?, ?, datetime('now'))`
      ).bind(license_id, memberId, txAmount, cpRef, adminFeeAmtCP).run()
      lic = { admin_fee_amount: adminFeeAmtCP }
    } else {
      adminFeeAmtCP = lic.admin_fee_amount || 0
      await c.env.DB.prepare(
        `UPDATE finstrategia_licenses
         SET status = 'active', payment_method = 'crypto',
             paypal_order_id = ?, validated_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`
      ).bind(cpRef, license_id).run()
    }

    // C1 FIX : expiry cumulatif depuis l'expiry existante
    const licExpiresCP = await computeLicenseExpiry(c.env.DB, memberId, licCfgCP.renewalDays)
    await c.env.DB.prepare(
      `UPDATE members SET license_active = 1, license_expires_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(licExpiresCP.toISOString(), memberId).run()
    await c.env.DB.prepare(
      `UPDATE finstrategia_licenses SET expires_at = ?, starts_at = COALESCE(starts_at, datetime('now')) WHERE id = ?`
    ).bind(licExpiresCP.toISOString(), license_id).run()

    if (adminFeeAmtCP > 0) {
      await c.env.DB.prepare(
        `UPDATE members SET admin_fee_paid = 1, admin_fee_paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).bind(memberId).run()
    }

    await createNotification(
      c.env.DB, memberId, 'success',
      'Licence activée par paiement crypto',
      `Votre paiement crypto de $${txAmount.toFixed(2)} a été reçu. Votre licence est active jusqu'au ${licExpiresCP.toLocaleDateString('fr-FR')}.`
    )

    return c.json({ success: true, license_id, txn_id, amount: txAmount, message: 'Paiement crypto reçu et licence activée !' })
  }

  return c.json({ error: 'Impossible d\'identifier la commande' }, 422)
})

// ════════════════════════════════════════════════════════════════════════
// EARNINGS & DOCUMENTS — Routes pour la génération de documents officiels
// ════════════════════════════════════════════════════════════════════════

// GET /api/members/earnings/statement — Données relevé mensuel de commissions
members.get('/earnings/statement', async (c) => {
  const memberId = c.get('memberId' as any)
  const { month, year } = c.req.query()

  // Période par défaut : mois précédent
  const now = new Date()
  const targetYear  = parseInt(year  || String(now.getFullYear()))
  const targetMonth = parseInt(month || String(now.getMonth() === 0 ? 12 : now.getMonth()))
  const targetYearAdj = (now.getMonth() === 0 && !year) ? now.getFullYear() - 1 : targetYear
  const period = `${targetYearAdj}-${String(targetMonth).padStart(2, '0')}`

  const [member, commissions, withdrawals, branding, availPeriods] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id, unique_id, first_name, last_name, email, phone, country, address, city,
              postal_code, member_status, current_rank, kyc_status, created_at
       FROM members WHERE id = ?`
    ).bind(memberId).first(),

    // Toutes les commissions de la période (pas seulement approved)
    c.env.DB.prepare(
      `SELECT c.*, m.first_name as src_first, m.last_name as src_last
       FROM commissions c
       LEFT JOIN members m ON m.id = c.source_member_id
       WHERE c.member_id = ? AND (c.period = ? OR strftime('%Y-%m', c.created_at) = ?)
       ORDER BY c.created_at ASC`
    ).bind(memberId, period, period).all(),

    // Retraits du mois
    c.env.DB.prepare(
      `SELECT id, amount, net_amount, fee, status, payment_method, payout_method, created_at, confirmed_at
       FROM withdrawals
       WHERE member_id = ? AND strftime('%Y-%m', created_at) = ?
       ORDER BY created_at ASC`
    ).bind(memberId, period).all(),

    // Infos légales compagnie
    c.env.DB.prepare(`SELECT key, value FROM branding_config`).all(),

    // Périodes disponibles (mois où il y a eu des commissions)
    c.env.DB.prepare(
      `SELECT DISTINCT COALESCE(period, strftime('%Y-%m', created_at)) as p
       FROM commissions WHERE member_id = ? AND p IS NOT NULL
       ORDER BY p DESC LIMIT 24`
    ).bind(memberId).all(),
  ])

  // Parser branding en objet
  const bc: Record<string, string> = {}
  for (const row of (branding.results as any[])) bc[row.key] = row.value

  // Summary par type
  const commRows = (commissions.results as any[])
  const summary: Record<string, number> = {}
  let totalGross = 0
  for (const c2 of commRows) {
    if (!summary[c2.type]) summary[c2.type] = 0
    summary[c2.type] += c2.amount
    totalGross += c2.amount
  }

  const wdRows = (withdrawals.results as any[])
  const totalWithdrawn = wdRows.filter(w => w.status === 'completed' || w.status === 'paid')
    .reduce((s: number, w: any) => s + (w.net_amount || 0), 0)

  // Numéro de référence unique
  const membRef = (member as any)?.unique_id || memberId.substring(0, 8).toUpperCase()
  const docRef = `STMT-${period}-${membRef}`

  return c.json({
    doc_ref: docRef,
    period,
    period_label: new Date(`${period}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    member,
    commissions: commRows,
    withdrawals: wdRows,
    summary,
    totals: { gross: totalGross, withdrawn: totalWithdrawn },
    company: {
      name:               bc.company_legal_name         || bc.network_name || 'LEADER',
      legal_name:         bc.company_legal_name         || bc.network_name || 'LEADER',
      trade_name:         bc.company_trade_name         || bc.network_name || 'LEADER',
      member_title:       bc.company_member_title       || 'Partenaire Indépendant(e)',
      registration_number:bc.company_registration_number|| '',
      vat_number:         bc.company_vat_number         || '',
      address:            bc.company_registered_address || '',
      city:               bc.company_city               || '',
      postal_code:        bc.company_postal_code        || '',
      country:            bc.company_country            || 'England and Wales',
      phone:              bc.company_phone              || '',
      email:              bc.company_email              || '',
      website:            bc.company_website            || '',
      director:           bc.company_director           || '',
      logo_data_uri:      bc.logo_data_uri              || '',
      pdf_color_primary:  bc.pdf_color_primary          || '#D4AF37',
      pdf_color_dark:     bc.pdf_color_dark             || '#0A0A16',
      pdf_color_accent:   bc.pdf_color_accent           || '#34D399',
      network_name:       bc.network_name               || 'LEADER',
    },
    available_periods: (availPeriods.results as any[]).map((r: any) => r.p),
    generated_at: new Date().toISOString(),
  })
})

// GET /api/members/earnings/annual — Attestation annuelle de revenus
members.get('/earnings/annual', async (c) => {
  const memberId = c.get('memberId' as any)
  const { year } = c.req.query()
  const targetYear = parseInt(year || String(new Date().getFullYear() - 1))

  const [member, commissions, withdrawals, branding] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id, unique_id, first_name, last_name, email, phone, country, address, city,
              postal_code, member_status, current_rank, kyc_status, created_at
       FROM members WHERE id = ?`
    ).bind(memberId).first(),

    c.env.DB.prepare(
      `SELECT type, period, SUM(amount) as total, COUNT(*) as cnt
       FROM commissions
       WHERE member_id = ? AND strftime('%Y', COALESCE(created_at, '')) = ?
       GROUP BY type, period
       ORDER BY period ASC, type ASC`
    ).bind(memberId, String(targetYear)).all(),

    c.env.DB.prepare(
      `SELECT strftime('%Y-%m', created_at) as month, SUM(net_amount) as total, COUNT(*) as cnt
       FROM withdrawals
       WHERE member_id = ? AND strftime('%Y', created_at) = ? AND status IN ('completed','paid')
       GROUP BY month ORDER BY month ASC`
    ).bind(memberId, String(targetYear)).all(),

    c.env.DB.prepare(`SELECT key, value FROM branding_config`).all(),
  ])

  const bc: Record<string, string> = {}
  for (const row of (branding.results as any[])) bc[row.key] = row.value

  const commRows = (commissions.results as any[])
  const wdRows   = (withdrawals.results as any[])

  // Total annuel par type
  const byType: Record<string, number> = {}
  let totalAnnual = 0
  for (const r of commRows) {
    if (!byType[r.type]) byType[r.type] = 0
    byType[r.type] += r.total
    totalAnnual += r.total
  }

  // Total retraits annuels
  const totalWithdrawnAnnual = wdRows.reduce((s: number, r: any) => s + (r.total || 0), 0)

  // Récapitulatif mensuel
  const monthlyBreakdown: Record<string, number> = {}
  for (const r of commRows) {
    if (!monthlyBreakdown[r.period]) monthlyBreakdown[r.period] = 0
    monthlyBreakdown[r.period] += r.total
  }

  const membRef = (member as any)?.unique_id || memberId.substring(0, 8).toUpperCase()
  const docRef = `AIC-${targetYear}-${membRef}`

  return c.json({
    doc_ref: docRef,
    year: targetYear,
    member,
    commissions_by_type: byType,
    commissions_monthly: monthlyBreakdown,
    withdrawals_monthly: wdRows,
    totals: { gross: totalAnnual, withdrawn: totalWithdrawnAnnual },
    company: {
      name:               bc.company_legal_name         || bc.network_name || 'LEADER',
      legal_name:         bc.company_legal_name         || bc.network_name || 'LEADER',
      trade_name:         bc.company_trade_name         || bc.network_name || 'LEADER',
      member_title:       bc.company_member_title       || 'Partenaire Indépendant(e)',
      registration_number:bc.company_registration_number|| '',
      vat_number:         bc.company_vat_number         || '',
      address:            bc.company_registered_address || '',
      city:               bc.company_city               || '',
      postal_code:        bc.company_postal_code        || '',
      country:            bc.company_country            || 'England and Wales',
      phone:              bc.company_phone              || '',
      email:              bc.company_email              || '',
      website:            bc.company_website            || '',
      director:           bc.company_director           || '',
      logo_data_uri:      bc.logo_data_uri              || '',
      pdf_color_primary:  bc.pdf_color_primary          || '#D4AF37',
      pdf_color_dark:     bc.pdf_color_dark             || '#0A0A16',
      pdf_color_accent:   bc.pdf_color_accent           || '#34D399',
      network_name:       bc.network_name               || 'LEADER',
    },
    generated_at: new Date().toISOString(),
  })
})

// GET /api/members/earnings/receipt/:orderId — Reçu d'achat de package
members.get('/earnings/receipt/:orderId', async (c) => {
  const memberId = c.get('memberId' as any)
  const orderId  = c.req.param('orderId')

  const [order, branding] = await Promise.all([
    c.env.DB.prepare(
      `SELECT po.*, p.name as package_name, p.description as package_desc,
              m.first_name, m.last_name, m.email, m.unique_id, m.country,
              m.address, m.city, m.postal_code
       FROM package_orders po
       JOIN packages p ON p.id = po.package_id
       JOIN members m ON m.id = po.member_id
       WHERE po.id = ? AND po.member_id = ?`
    ).bind(orderId, memberId).first(),
    c.env.DB.prepare(`SELECT key, value FROM branding_config`).all(),
  ])

  if (!order) return c.json({ error: 'Commande introuvable' }, 404)

  const bc: Record<string, string> = {}
  for (const row of (branding.results as any[])) bc[row.key] = row.value

  const o = order as any
  const docRef = `RCP-${o.id.substring(0, 8).toUpperCase()}`

  return c.json({
    doc_ref: docRef,
    order: {
      id: o.id,
      package_name: o.package_name,
      package_desc: o.package_desc,
      amount_usd:   o.amount_usd,
      bv_value:     o.bv_value,
      status:       o.status,
      payment_method: o.payment_method,
      created_at:   o.created_at,
      validated_at: o.validated_at,
    },
    member: {
      unique_id:  o.unique_id,
      first_name: o.first_name,
      last_name:  o.last_name,
      email:      o.email,
      country:    o.country,
      address:    o.address,
      city:       o.city,
      postal_code:o.postal_code,
    },
    company: {
      name:               bc.company_legal_name         || bc.network_name || 'LEADER',
      legal_name:         bc.company_legal_name         || bc.network_name || 'LEADER',
      trade_name:         bc.company_trade_name         || bc.network_name || 'LEADER',
      member_title:       bc.company_member_title       || 'Partenaire Indépendant(e)',
      registration_number:bc.company_registration_number|| '',
      vat_number:         bc.company_vat_number         || '',
      address:            bc.company_registered_address || '',
      city:               bc.company_city               || '',
      postal_code:        bc.company_postal_code        || '',
      country:            bc.company_country            || 'England and Wales',
      email:              bc.company_email              || '',
      website:            bc.company_website            || '',
      logo_data_uri:      bc.logo_data_uri              || '',
      pdf_color_primary:  bc.pdf_color_primary          || '#D4AF37',
      pdf_color_dark:     bc.pdf_color_dark             || '#0A0A16',
      pdf_color_accent:   bc.pdf_color_accent           || '#34D399',
      network_name:       bc.network_name               || 'LEADER',
    },
    generated_at: new Date().toISOString(),
  })
})

// GET /api/members/orders — Liste des commandes du membre (pour les reçus)
members.get('/orders', async (c) => {
  const memberId = c.get('memberId' as any)
  const orders = await c.env.DB.prepare(
    `SELECT po.id, po.created_at, po.status, po.amount_usd, po.bv_value, po.payment_method,
            p.name as package_name
     FROM package_orders po
     JOIN packages p ON p.id = po.package_id
     WHERE po.member_id = ?
     ORDER BY po.created_at DESC LIMIT 50`
  ).bind(memberId).all()

  return c.json({ orders: orders.results })
})

// ════════════════════════════════════════════════════════════════════════
// CARTE DE MEMBRE — Endpoints pour la carte digitale AMI
// ════════════════════════════════════════════════════════════════════════

// GET /api/members/card — Carte active du membre (ou null) + mandat + carte physique
members.get('/card', async (c) => {
  const memberId = c.get('memberId' as any)

  // Carte active
  const card = await c.env.DB.prepare(
    `SELECT id, design, status, token, issued_at, revoked_at, card_config_json
     FROM member_cards WHERE member_id=? AND status='active' ORDER BY issued_at DESC LIMIT 1`
  ).bind(memberId).first() as any

  // Config branding complète (carte + mandat + carte physique)
  const cfgRows = await c.env.DB.prepare(
    `SELECT key, value FROM branding_config
     WHERE key LIKE 'card_%' OR key LIKE 'mandate_%' OR key LIKE 'physical_card_%'
        OR key = 'logo_data_uri' OR key = 'network_name'`
  ).all()
  const cfg: Record<string, string> = {}
  for (const r of (cfgRows.results || []) as any[]) cfg[r.key] = r.value

  // Données membre pour le statut mandat
  const member = await c.env.DB.prepare(
    `SELECT vdi_mandate_signed, vdi_mandate_signed_at FROM members WHERE id=?`
  ).bind(memberId).first() as any

  // Commande carte physique en cours (si existante)
  const physOrder = await c.env.DB.prepare(
    `SELECT id, status, amount, currency, created_at
     FROM physical_card_orders
     WHERE member_id=? AND status NOT IN ('cancelled','delivered')
     ORDER BY created_at DESC LIMIT 1`
  ).bind(memberId).first() as any

  return c.json({
    card: card || null,
    config: {
      enabled:          cfg.card_enabled === '1',
      price:            parseFloat(cfg.card_price || '0'),
      currency:         cfg.card_currency || 'USD',
      design_a_enabled: cfg.card_design_a_enabled !== '0',
      design_b_enabled: cfg.card_design_b_enabled !== '0',
      design_a_color1:  cfg.card_design_a_color1 || '#FF6B35',
      design_a_color2:  cfg.card_design_a_color2 || '#FF1F8E',
      design_a_color3:  cfg.card_design_a_color3 || '#8B00FF',
      member_title:     cfg.card_member_title || 'Ambassadeur',
      legal_mention:    cfg.card_legal_mention || '',
      logo_uri:         cfg.logo_data_uri || '',
      network_name:     cfg.network_name || 'LEADER',
    },
    mandate: {
      enabled:   cfg.mandate_enabled === '1',
      title:     cfg.mandate_title || 'Mandat de création de statut professionnel — Finestrategia',
      body:      cfg.mandate_body  || '',
      signed:    !!(member && member.vdi_mandate_signed),
      signed_at: (member && member.vdi_mandate_signed_at) || null,
    },
    physical_card: {
      enabled:       cfg.physical_card_enabled === '1',
      price:         parseFloat(cfg.physical_card_price || '19.90'),
      currency:      cfg.physical_card_currency || 'USD',
      description:   cfg.physical_card_desc || 'Carte de membre physique',
      current_order: physOrder ? {
        id:         physOrder.id,
        status:     physOrder.status,
        amount:     physOrder.amount,
        currency:   physOrder.currency,
        created_at: physOrder.created_at,
      } : null,
    },
  })
})

// POST /api/members/mandate/sign — Signature électronique du mandat Finestrategia
members.post('/mandate/sign', async (c) => {
  const memberId = c.get('memberId' as any)

  // Vérifier que le mandat est activé dans la config
  const mandateEnabled = await c.env.DB.prepare(
    `SELECT value FROM branding_config WHERE key='mandate_enabled'`
  ).first() as any
  if (!mandateEnabled || mandateEnabled.value !== '1') {
    // Fallback : accepter quand même (mode VDI classique)
    await c.env.DB.prepare(
      `UPDATE members SET vdi_consent=1, vdi_consent_at=datetime('now'),
       vdi_mandate_signed=1, vdi_mandate_signed_at=datetime('now')
       WHERE id=?`
    ).bind(memberId).run()
    return c.json({ success: true, mode: 'vdi_consent' })
  }

  // Vérifier que le membre n'a pas déjà signé
  const m = await c.env.DB.prepare(
    `SELECT vdi_mandate_signed, first_name, last_name FROM members WHERE id=?`
  ).bind(memberId).first() as any
  if (!m) return c.json({ error: 'Membre introuvable' }, 404)
  if (m.vdi_mandate_signed) return c.json({ error: 'Mandat déjà signé' }, 400)

  // Enregistrer la signature
  await c.env.DB.prepare(
    `UPDATE members
     SET vdi_mandate_signed=1, vdi_mandate_signed_at=datetime('now'),
         vdi_consent=1, vdi_consent_at=datetime('now')
     WHERE id=?`
  ).bind(memberId).run()

  return c.json({ success: true, signed_at: new Date().toISOString() })
})

// POST /api/members/physical-card/order — Commander une carte physique
members.post('/physical-card/order', async (c) => {
  const memberId = c.get('memberId' as any)
  const body = await c.req.json().catch(() => ({})) as any

  // Vérifier si la carte physique est activée
  const physEnabled = await c.env.DB.prepare(
    `SELECT value FROM branding_config WHERE key='physical_card_enabled'`
  ).first() as any
  if (!physEnabled || physEnabled.value !== '1') {
    return c.json({ error: 'Carte physique non disponible' }, 403)
  }

  // Vérifier licence active
  const m = await c.env.DB.prepare(
    `SELECT license_active FROM members WHERE id=?`
  ).bind(memberId).first() as any
  if (!m) return c.json({ error: 'Membre introuvable' }, 404)
  if (!m.license_active) return c.json({ error: 'Licence inactive' }, 403)

  // Vérifier si une commande en cours existe déjà
  const existing = await c.env.DB.prepare(
    `SELECT id, status FROM physical_card_orders
     WHERE member_id=? AND status NOT IN ('cancelled','delivered')
     ORDER BY created_at DESC LIMIT 1`
  ).bind(memberId).first() as any
  if (existing) {
    return c.json({
      error: 'Une commande de carte physique est déjà en cours',
      existing_order_id: existing.id,
      existing_status: existing.status,
    }, 400)
  }

  // Récupérer prix
  const priceRow = await c.env.DB.prepare(
    `SELECT value FROM branding_config WHERE key='physical_card_price'`
  ).first() as any
  const currRow = await c.env.DB.prepare(
    `SELECT value FROM branding_config WHERE key='physical_card_currency'`
  ).first() as any
  const price    = parseFloat((priceRow as any)?.value || '19.90')
  const currency = (currRow as any)?.value || 'USD'

  const orderId = crypto.randomUUID().replace(/-/g, '')
  const shipping = body.shipping_address ? JSON.stringify(body.shipping_address) : null

  await c.env.DB.prepare(
    `INSERT INTO physical_card_orders
       (id, member_id, status, amount, currency, shipping_address, created_at, updated_at)
     VALUES (?, ?, 'pending', ?, ?, ?, datetime('now'), datetime('now'))`
  ).bind(orderId, memberId, price, currency, shipping).run()

  return c.json({ success: true, order_id: orderId, status: 'pending', amount: price, currency })
})

// POST /api/members/card/order — Demander / générer une carte
members.post('/card/order', async (c) => {
  const memberId = c.get('memberId' as any)
  const body = await c.req.json()
  const design = body.design === 'B' ? 'B' : 'A'

  // Vérifier licence active
  const m = await c.env.DB.prepare(
    `SELECT license_active, first_name, last_name, unique_id, city,
            profile_photo, vdi_consent, preferred_lang
     FROM members WHERE id=?`
  ).bind(memberId).first() as any
  if (!m) return c.json({ error: 'Membre introuvable' }, 404)
  if (!m.license_active) return c.json({ error: 'Licence inactive — carte indisponible' }, 403)

  // Vérifier profil complet
  const missing: string[] = []
  if (!m.city)          missing.push('city')
  if (!m.profile_photo) missing.push('profile_photo')
  if (!m.vdi_consent)   missing.push('vdi_consent')
  if (missing.length > 0) return c.json({ error: 'Profil incomplet', missing }, 400)

  // Révoquer l'ancienne carte si existante
  await c.env.DB.prepare(
    `UPDATE member_cards SET status='revoked', revoked_at=datetime('now') WHERE member_id=? AND status='active'`
  ).bind(memberId).run()

  // Générer un token unique signé
  const tokenRaw = `${memberId}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const encoder = new TextEncoder()
  const data = encoder.encode(tokenRaw)
  const hashBuf = await crypto.subtle.digest('SHA-256', data)
  const token = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('').substring(0, 32)

  const cardId = crypto.randomUUID().replace(/-/g, '')
  await c.env.DB.prepare(
    `INSERT INTO member_cards (id, member_id, design, status, token, issued_at, card_config_json)
     VALUES (?, ?, ?, 'active', ?, datetime('now'), ?)`
  ).bind(
    cardId, memberId, design, token,
    JSON.stringify({ preferred_lang: m.preferred_lang || 'fr' })
  ).run()

  return c.json({ success: true, card_id: cardId, token, design })
})

// DELETE /api/members/card — Révoquer sa carte
members.delete('/card', async (c) => {
  const memberId = c.get('memberId' as any)
  await c.env.DB.prepare(
    `UPDATE member_cards SET status='revoked', revoked_at=datetime('now') WHERE member_id=? AND status='active'`
  ).bind(memberId).run()
  return c.json({ success: true })
})

// POST /api/members/physical-card/submit-proof — Soumettre preuve de paiement
members.post('/physical-card/submit-proof', async (c) => {
  const memberId = c.get('memberId' as any)
  const { order_id, reference } = await c.req.json()
  if (!order_id) return c.json({ error: 'order_id requis' }, 400)

  try {
    // Vérifier que la commande appartient bien à ce membre
    const order = await c.env.DB.prepare(
      `SELECT id, status FROM physical_card_orders WHERE id=? AND member_id=?`
    ).bind(order_id, memberId).first() as any

    if (!order) return c.json({ error: 'Commande introuvable' }, 404)
    if (!['pending', 'paid'].includes(order.status)) {
      return c.json({ error: 'Cette commande ne peut plus être modifiée', status: order.status }, 400)
    }

    await c.env.DB.prepare(
      `UPDATE physical_card_orders
       SET status='proof_submitted', updated_at=datetime('now')
       WHERE id=? AND member_id=?`
    ).bind(order_id, memberId).run()

    return c.json({ success: true, order_id, status: 'proof_submitted' })
  } catch (err: any) {
    return c.json({ error: err?.message || 'Erreur serveur' }, 500)
  }
})

// GET /api/members/physical-card/my-order — Commande carte physique en cours
members.get('/physical-card/my-order', async (c) => {
  const memberId = c.get('memberId' as any)
  try {
    const order = await c.env.DB.prepare(
      `SELECT id, status, amount, currency, tracking_number, created_at, shipping_address
       FROM physical_card_orders WHERE member_id=? ORDER BY created_at DESC LIMIT 1`
    ).bind(memberId).first() as any
    if (!order) return c.json({ order: null })
    return c.json({
      order: {
        ...order,
        shipping_address: (() => { try { return JSON.parse(order.shipping_address || '{}') } catch { return {} } })()
      }
    })
  } catch {
    return c.json({ order: null })
  }
})

export { members }
