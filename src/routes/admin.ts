// ============================================================
// LEADER — Routes Admin
// CDC v6.0 — Plan de compensation intégral déployé
// ============================================================
import { Hono } from 'hono'
import { verifyJWT } from '../lib/auth.js'
import { hashPassword, generateId, generateUniqueId } from '../lib/auth.js'
import {
  calculateMemberRank, propagateBV, checkFastStart, initFastStart,
  processMonthlyCommissions, activateAndReward, recalculateMemberStatus,
  placeMemberFromHoldingTank, processBVQueue, processRankQueue, processDailyPayments,
  walletOperation, createNotification, orchestrateur, resetMonthlyBV,
  forceRecalcAllRanks, RANK_ORDER, getRankIndex,
  recordCCWithdrawal, getCCBalance,
  recalculBonusRetroactif, upgradePrimeLeadership, getMauritiusDateStr,
  processMonthlySubscriptions
} from '../lib/mlm.js'
import type { Bindings } from '../types/index.js'
import { requirePermission, requireAnyPermission } from '../middleware/permissions.js'
import { sendEmail } from '../lib/mailer.js'

const admin = new Hono<{ Bindings: Bindings }>()

// ── MIDDLEWARE AUTH ADMIN ───────────────────────────────────
// Vérifie JWT + existence réelle en DB → garantie absolue que adminId est valide
admin.use('/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.slice(7)

  // 1. Vérifier la signature et le rôle du JWT
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Accès refusé' }, 403)

  // 2. Vérifier que le sub du JWT correspond à un vrai admin en DB
  const adminRow = await c.env.DB.prepare(
    `SELECT id FROM admin_users WHERE id = ?`
  ).bind(payload.sub).first() as any

  if (!adminRow) {
    // Token JWT admin valide MAIS sub inexistant en DB (session fantôme, ancien token)
    // → forcer la déconnexion côté client avec 401
    console.error(`[auth-admin] sub=${payload.sub} absent de admin_users — token rejeté`)
    return c.json({ error: 'Session invalide — veuillez vous reconnecter', code: 'INVALID_ADMIN_SESSION' }, 401)
  }

  // 3. Stocker l'ID réel (garanti existant en DB)
  c.set('adminId' as any, adminRow.id as string)
  await next()
})

// ── DASHBOARD ──────────────────────────────────────────────
admin.get('/dashboard', async (c) => {
  // Nettoyage préventif des orphelins holding_tank avant tout calcul de badge
  await c.env.DB.prepare(
    `UPDATE holding_tank SET status='placed'
     WHERE status='waiting'
       AND member_id IN (SELECT id FROM members WHERE in_holding_tank=0)`
  ).run()

  const now = new Date()
  const thisMois  = now.toISOString().substring(0, 7)  // 'YYYY-MM'
  const lastMoisD = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMois  = lastMoisD.toISOString().substring(0, 7)
  const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  const todayStr  = now.toISOString().substring(0, 10)

  const [
    totalMembers, activeAMI, partenaires, pendingOrders,
    pendingWithdrawals, pendingKYC, holdingTank,
    totalCommissions, totalWithdrawn, pendingBVQueue, pendingCCWithdrawals,
    // KPI Bloc 1 — CA
    caThisMois, caLastMois,
    // KPI Bloc 2 — Membres
    newThisMois, newThisWeek, totalActifs,
    // KPI Bloc 3 — Wallets
    walletsMain, walletsPending, commissionsThisMois,
    // KPI Bloc 4 — Primes Leadership
    primesActives, primesEngagees, versementsJour, versementsMois,
    // KPI Bloc 5 — Alertes
    lastCronRun, lastDailyPayment, licencesExpirees, retraits48h,
  ] = await Promise.all([
    // ── existants ──────────────────────────────────────────────────────────
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM members`).first() as any,
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM members WHERE member_status='AMI' AND license_active=1`).first() as any,
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM members WHERE member_status='Partenaire' AND license_active=1`).first() as any,
    c.env.DB.prepare(`SELECT (
      SELECT COUNT(*) FROM package_orders WHERE status='proof_submitted' AND activation_done=0
    ) + (
      SELECT COUNT(*) FROM finstrategia_licenses WHERE status IN ('pending','proof_submitted')
    ) as cnt`).first() as any,
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM withdrawals WHERE status='pending'`).first() as any,
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM members WHERE kyc_status='pending'`).first() as any,
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM holding_tank ht JOIN members m ON m.id=ht.member_id WHERE ht.status='waiting' AND m.in_holding_tank=1`).first() as any,
    c.env.DB.prepare(`SELECT SUM(amount) as total FROM commissions WHERE status IN ('approved','paid')`).first() as any,
    c.env.DB.prepare(`SELECT SUM(net_amount) as total FROM withdrawals WHERE status='completed'`).first() as any,
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM bv_queue WHERE status='pending'`).first() as any,
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM cc_withdrawals WHERE status='pending'`).first() as any,
    // ── Bloc 1 : CA — souscriptions (package_orders validées) ─────────────
    c.env.DB.prepare(`SELECT COALESCE(SUM(p.price_usd),0) as total
      FROM package_orders po JOIN packages p ON p.id=po.package_id
      WHERE po.status='validated' AND strftime('%Y-%m',po.created_at)=?`).bind(thisMois).first() as any,
    c.env.DB.prepare(`SELECT COALESCE(SUM(p.price_usd),0) as total
      FROM package_orders po JOIN packages p ON p.id=po.package_id
      WHERE po.status='validated' AND strftime('%Y-%m',po.created_at)=?`).bind(lastMois).first() as any,
    // ── Bloc 2 : Membres ───────────────────────────────────────────────────
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM members WHERE strftime('%Y-%m',created_at)=?`).bind(thisMois).first() as any,
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM members WHERE date(created_at) >= ?`).bind(thisWeekStart).first() as any,
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM members WHERE license_active=1`).first() as any,
    // ── Bloc 3 : Wallets ───────────────────────────────────────────────────
    c.env.DB.prepare(`SELECT COALESCE(SUM(balance),0) as total FROM wallets`).first() as any,
    c.env.DB.prepare(`SELECT COALESCE(SUM(pending_balance),0) as total FROM wallets`).first() as any,
    c.env.DB.prepare(`SELECT COALESCE(SUM(amount),0) as total
      FROM wallet_transactions
      WHERE transaction_type LIKE '%_daily'
        AND strftime('%Y-%m',created_at)=?`).bind(thisMois).first() as any,
    // ── Bloc 4 : Primes Leadership ─────────────────────────────────────────
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM pending_wallet_entries
      WHERE commission_type='prime_leadership' AND status IN ('active','pending_release')`).first() as any,
    c.env.DB.prepare(`SELECT COALESCE(SUM((days_in_month - days_paid) * amount_per_day),0) as total
      FROM pending_wallet_entries
      WHERE commission_type='prime_leadership' AND status IN ('active','pending_release')`).first() as any,
    c.env.DB.prepare(`SELECT COALESCE(SUM(amount),0) as total
      FROM wallet_transactions
      WHERE transaction_type LIKE '%_daily' AND date(created_at)=?`).bind(todayStr).first() as any,
    c.env.DB.prepare(`SELECT COALESCE(SUM(amount),0) as total
      FROM wallet_transactions
      WHERE transaction_type='prime_leadership_daily'
        AND strftime('%Y-%m',created_at)=?`).bind(thisMois).first() as any,
    // ── Bloc 5 : Alertes ───────────────────────────────────────────────────
    c.env.DB.prepare(`SELECT value, updated_at FROM system_config WHERE key='last_orchestrator_run'`).first() as any,
    c.env.DB.prepare(`SELECT value, updated_at FROM system_config WHERE key='last_daily_payment'`).first() as any,
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM members
      WHERE license_active=1 AND license_expires_at IS NOT NULL AND license_expires_at < datetime('now')`).first() as any,
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM withdrawals
      WHERE status='pending' AND created_at < datetime('now','-48 hours')`).first() as any,
  ])

  // Calcul évolution CA M/M-1
  const caM  = caThisMois?.total  || 0
  const caMm1 = caLastMois?.total || 0
  const caEvo = caMm1 > 0 ? Math.round(((caM - caMm1) / caMm1) * 100) : null

  // Taux de conversion : membres actifs (licence active) / total membres
  const total = totalMembers?.cnt || 1
  const actifs = totalActifs?.cnt || 0
  const tauxConversion = Math.round((actifs / total) * 100)

  // Statut cron : OK si dernière exécution < 2h
  const lastCronDate = lastCronRun?.updated_at ? new Date(lastCronRun.updated_at + 'Z') : null
  const cronAgeMin   = lastCronDate ? Math.floor((Date.now() - lastCronDate.getTime()) / 60000) : null
  const cronOk       = cronAgeMin !== null && cronAgeMin < 120

  const recentMembers = await c.env.DB.prepare(
    `SELECT m.id, m.unique_id, m.first_name, m.last_name, m.email,
            m.member_status, m.current_rank, m.created_at,
            ap.package_name
     FROM members m
     LEFT JOIN (
       SELECT po.member_id, p.name AS package_name
       FROM package_orders po
       JOIN packages p ON p.id = po.package_id
       WHERE po.status = 'validated'
         AND po.id = (
           SELECT id FROM package_orders po2
           WHERE po2.member_id = po.member_id
             AND po2.status = 'validated'
           ORDER BY po2.created_at DESC
           LIMIT 1
         )
     ) ap ON ap.member_id = m.id
     ORDER BY m.created_at DESC LIMIT 8`
  ).all()

  const rankDistribution = await c.env.DB.prepare(
    `SELECT current_rank, COUNT(*) as cnt FROM members GROUP BY current_rank ORDER BY cnt DESC`
  ).all()

  const monthlyStats = await c.env.DB.prepare(
    `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as new_members
     FROM members GROUP BY month ORDER BY month DESC LIMIT 6`
  ).all()

  return c.json({
    stats: {
      // ── existants (inchangés) ──────────────────────────────────────────
      totalMembers:        totalMembers?.cnt        || 0,
      activeAMI:           activeAMI?.cnt           || 0,
      partenaires:         partenaires?.cnt         || 0,
      pendingOrders:       pendingOrders?.cnt       || 0,
      pendingWithdrawals:  pendingWithdrawals?.cnt  || 0,
      pendingKYC:          pendingKYC?.cnt          || 0,
      holdingTankCount:    holdingTank?.cnt         || 0,
      totalCommissions:    totalCommissions?.total  || 0,
      totalWithdrawn:      totalWithdrawn?.total    || 0,
      pendingBVQueue:      pendingBVQueue?.cnt       || 0,
      pendingCCWithdrawals:pendingCCWithdrawals?.cnt || 0,
      // ── Bloc 1 : CA ───────────────────────────────────────────────────
      caThisMois:          caM,
      caLastMois:          caMm1,
      caEvoPct:            caEvo,        // null si pas de M-1
      // ── Bloc 2 : Membres ──────────────────────────────────────────────
      newThisMois:         newThisMois?.cnt  || 0,
      newThisWeek:         newThisWeek?.cnt  || 0,
      totalActifs:         actifs,
      tauxConversion:      tauxConversion,  // %
      // ── Bloc 3 : Wallets ──────────────────────────────────────────────
      walletsMain:         walletsMain?.total    || 0,
      walletsPending:      walletsPending?.total || 0,
      commissionsThisMois: commissionsThisMois?.total || 0,
      // ── Bloc 4 : Primes Leadership ────────────────────────────────────
      primesActives:       primesActives?.cnt    || 0,
      primesEngagees:      primesEngagees?.total || 0,
      versementsJour:      versementsJour?.total || 0,
      versementsMois:      versementsMois?.total || 0,
      // ── Bloc 5 : Alertes ──────────────────────────────────────────────
      cronOk:              cronOk,
      cronLastRun:         lastCronRun?.updated_at  || null,
      cronAgeMin:          cronAgeMin,
      lastDailyPayment:    lastDailyPayment?.value  || null,
      licencesExpirees:    licencesExpirees?.cnt    || 0,
      retraits48h:         retraits48h?.cnt         || 0,
    },
    recentMembers:    recentMembers.results,
    rankDistribution: rankDistribution.results,
    monthlyStats:     monthlyStats.results,
  })
})

// ── MEMBRES ────────────────────────────────────────────────
admin.get('/members', requirePermission('members.view'), async (c) => {
  const { page='1', per_page='20', search, status, rank } = c.req.query()
  const offset = (parseInt(page)-1)*parseInt(per_page)
  let where = 'WHERE 1=1'; const params: any[] = []
  if (search) {
    where += ` AND (m.first_name LIKE ? OR m.last_name LIKE ? OR m.email LIKE ? OR m.unique_id LIKE ?)`
    const s = `%${search}%`; params.push(s,s,s,s)
  }
  if (status) { where += ` AND m.member_status=?`; params.push(status) }
  if (rank)   { where += ` AND m.current_rank=?`;  params.push(rank)   }

  const [rows, total] = await Promise.all([
    c.env.DB.prepare(
      `SELECT m.id, m.unique_id, m.email, m.first_name, m.last_name, m.phone, m.country,
              m.sponsor_id, m.binary_parent_id, m.binary_position, m.member_status, m.current_rank,
              m.left_bv_total, m.right_bv_total, m.left_bv_monthly, m.right_bv_monthly,
              m.personal_bv_monthly, m.license_active, m.license_expires_at, m.kyc_status,
              m.fast_start_start_date, m.fast_start_completed, m.in_holding_tank,
              m.wallet_balance, m.credit_croissance, m.reserve_strategique,
              m.avatar_url, m.paypal_email, m.created_at, m.updated_at,
        (SELECT COUNT(*) FROM members s WHERE s.sponsor_id=m.id) as direct_count,
        (SELECT p.slug FROM package_orders po JOIN packages p ON p.id=po.package_id
         WHERE po.member_id=m.id AND po.status='validated'
           AND p.slug != 'licence' ORDER BY po.created_at DESC LIMIT 1) as package_slug,
        (SELECT p.name FROM package_orders po JOIN packages p ON p.id=po.package_id
         WHERE po.member_id=m.id AND po.status='validated'
           AND p.slug != 'licence' ORDER BY po.created_at DESC LIMIT 1) as package_name,
        (SELECT sp.first_name || ' ' || sp.last_name FROM members sp WHERE sp.id = m.sponsor_id) as sponsor_name,
        (SELECT sp.unique_id FROM members sp WHERE sp.id = m.sponsor_id) as sponsor_unique_id
       FROM members m ${where} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, parseInt(per_page), offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM members m ${where}`).bind(...params).first() as any
  ])
  return c.json({ members: rows.results, total: total?.cnt||0 })
})

// GET /api/admin/members/:id/sponsorship — Lignée ascendante + downline de parrainage
admin.get('/members/:id/sponsorship', requirePermission('members.view'), async (c) => {
  const id = c.req.param('id')

  // 1. Lignée ascendante via CTE récursive (remplace la boucle while avec 20 requêtes)
  //    Un seul round-trip D1 pour toute la chaîne de parrainage ascendante
  const ancestryRows = await c.env.DB.prepare(`
    WITH RECURSIVE ancestry(id, unique_id, first_name, last_name, email, current_rank,
                             member_status, license_active, sponsor_id, created_at, depth) AS (
      -- Point de départ : sponsor direct du membre cible
      SELECT m.id, m.unique_id, m.first_name, m.last_name, m.email, m.current_rank,
             m.member_status, m.license_active, m.sponsor_id, m.created_at, 1
      FROM members m
      WHERE m.id = (SELECT sponsor_id FROM members WHERE id = ?)
        AND m.unique_id != 'ROOT'
      UNION ALL
      -- Remonte la chaîne jusqu'à 20 niveaux max
      SELECT m.id, m.unique_id, m.first_name, m.last_name, m.email, m.current_rank,
             m.member_status, m.license_active, m.sponsor_id, m.created_at, a.depth + 1
      FROM members m
      JOIN ancestry a ON m.id = a.sponsor_id
      WHERE m.unique_id != 'ROOT' AND a.depth < 20
    )
    SELECT * FROM ancestry ORDER BY depth ASC
  `).bind(id).all()

  const ancestry = (ancestryRows.results || []) as any[]

  // 2. Downline complète de parrainage (CTE récursif, depth 8 max)
  const allRows = await c.env.DB.prepare(`
    WITH RECURSIVE downline(id, unique_id, first_name, last_name, email, member_status,
                             current_rank, license_active, sponsor_id, activation_done,
                             left_bv_total, right_bv_total, created_at, depth) AS (
      SELECT id, unique_id, first_name, last_name, email, member_status,
             current_rank, license_active, sponsor_id, activation_done,
             left_bv_total, right_bv_total, created_at, 1
      FROM members WHERE sponsor_id = ? AND unique_id != 'ROOT'
      UNION ALL
      SELECT m.id, m.unique_id, m.first_name, m.last_name, m.email, m.member_status,
             m.current_rank, m.license_active, m.sponsor_id, m.activation_done,
             m.left_bv_total, m.right_bv_total, m.created_at, d.depth + 1
      FROM members m JOIN downline d ON m.sponsor_id = d.id
      WHERE d.depth < 8 AND m.unique_id != 'ROOT'
    )
    SELECT * FROM downline ORDER BY depth ASC, created_at ASC
  `).bind(id).all()

  const rows = (allRows.results || []) as any[]

  // Reconstruire l'arbre en mémoire
  const byId = new Map<string, any>()
  rows.forEach(r => byId.set(r.id, { ...r, children: [] }))
  const roots: any[] = []
  rows.forEach(r => {
    const node = byId.get(r.id)!
    if (r.sponsor_id === id) roots.push(node)
    else { const p = byId.get(r.sponsor_id); if (p) p.children.push(node) }
  })

  return c.json({
    ancestry,               // [sponsor direct, grand-sponsor, …]
    downline: roots,        // arbre récursif
    totalCount: rows.length,
    activeCount: rows.filter((r: any) => r.license_active).length
  })
})

admin.get('/members/:id', requirePermission('members.view'), async (c) => {
  const id = c.req.param('id')
  const member = await c.env.DB.prepare(
    `SELECT id, unique_id, email, first_name, last_name, phone, country,
            sponsor_id, binary_parent_id, binary_position, member_status, current_rank,
            left_bv_total, right_bv_total, left_bv_monthly, right_bv_monthly,
            personal_bv_monthly, license_active, license_expires_at, kyc_status,
            kyc_document_url, kyc_reviewed_at, fast_start_start_date, fast_start_completed,
            in_holding_tank, wallet_balance, credit_croissance, reserve_strategique,
            avatar_url, paypal_email, created_at, updated_at,
            personal_bv_total, fast_start_bv, pending_withdrawal, activation_done,
            birth_date, country_of_origin
     FROM members WHERE id=?`
  ).bind(id).first()
  if (!member) return c.json({ error: 'Introuvable' }, 404)
  const [wallet, orders, commissions, licenses, bvSummary, rankConfig] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM wallets WHERE member_id=?`).bind(id).first(),
    c.env.DB.prepare(
      `SELECT po.*, p.name as pkg_name, p.type as pkg_type, p.bv_value
       FROM package_orders po JOIN packages p ON p.id=po.package_id
       WHERE po.member_id=? ORDER BY po.created_at DESC LIMIT 50`
    ).bind(id).all(),
    c.env.DB.prepare(
      `SELECT * FROM commissions WHERE member_id=? ORDER BY created_at DESC LIMIT 10`
    ).bind(id).all(),
    c.env.DB.prepare(
      `SELECT * FROM finstrategia_licenses WHERE member_id=? ORDER BY created_at DESC LIMIT 20`
    ).bind(id).all(),
    c.env.DB.prepare(
      `SELECT SUM(bv_amount) as total, COUNT(*) as cnt FROM bv_logs WHERE member_id=?`
    ).bind(id).first(),
    (member as any).current_rank && (member as any).current_rank !== 'none'
      ? c.env.DB.prepare(
          `SELECT rank_name, monthly_prime, monthly_cap, badge_url FROM rank_config WHERE rank_name=?`
        ).bind((member as any).current_rank).first()
      : Promise.resolve(null),
  ])
  return c.json({ member, wallet, orders: orders.results, commissions: commissions.results, licenses: licenses.results, bvSummary, rankConfig })
})

admin.post('/members', requirePermission('members.edit'), async (c) => {
  const { email, password, first_name, last_name, phone, country, sponsor_id, member_status } = await c.req.json()
  const existing = await c.env.DB.prepare(`SELECT id FROM members WHERE email=?`).bind(email).first()
  if (existing) return c.json({ error: 'Email déjà utilisé' }, 409)

  const id = generateId()
  const unique_id = generateUniqueId()
  const password_hash = await hashPassword(password || 'Leader2026!')

  await c.env.DB.prepare(
    `INSERT INTO members (id,unique_id,email,password_hash,first_name,last_name,phone,country,sponsor_id,member_status,in_holding_tank)
     VALUES (?,?,?,?,?,?,?,?,?,?,1)`
  ).bind(id, unique_id, email, password_hash, first_name, last_name, phone||null, country||null, sponsor_id||null, member_status||'Membre').run()

  await c.env.DB.prepare(`INSERT INTO wallets (id,member_id) VALUES (?,?)`).bind(generateId(), id).run()

  // Ajouter au Holding Tank
  await c.env.DB.prepare(
    `INSERT INTO holding_tank (id,member_id,sponsor_id,entry_reason,status) VALUES (?,?,?,'admin_created','waiting')`
  ).bind(generateId(), id, sponsor_id||null).run()

  // Fast Start : initialiser la fenêtre dès la création du compte
  try { await initFastStart(c.env.DB, id) } catch (_) {}

  return c.json({ id, unique_id }, 201)
})

admin.put('/members/:id', requirePermission('members.edit'), async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json() as Record<string, any>

  // Récupérer les valeurs actuelles pour ne pas écraser les champs non envoyés
  const current = await c.env.DB.prepare(
    `SELECT first_name, last_name, email, phone, country, kyc_status, kyc_level, birth_date, country_of_origin FROM members WHERE id=?`
  ).bind(id).first() as any
  if (!current) return c.json({ error: 'Membre introuvable' }, 404)

  const first_name         = body.first_name         ?? current.first_name
  const last_name          = body.last_name          ?? current.last_name
  const phone              = body.phone              ?? current.phone
  const country            = body.country            ?? current.country
  const kyc_status         = body.kyc_status         ?? current.kyc_status
  const birth_date         = body.birth_date         ?? current.birth_date
  const country_of_origin  = body.country_of_origin  ?? current.country_of_origin

  // Email : vérifier unicité si l'admin le change
  let email = current.email
  if (body.email && body.email.trim() !== '' && body.email.trim().toLowerCase() !== current.email?.toLowerCase()) {
    const newEmail = body.email.trim().toLowerCase()
    const existing = await c.env.DB.prepare(
      `SELECT id FROM members WHERE LOWER(email)=? AND id!=?`
    ).bind(newEmail, id).first()
    if (existing) return c.json({ error: 'Cet email est déjà utilisé par un autre membre' }, 409)
    email = newEmail
  }

  // Synchronisation kyc_level ↔ kyc_status :
  // Si l'admin change kyc_status manuellement, kyc_level doit suivre
  let kyc_level = current.kyc_level ?? 0
  if (body.kyc_status !== undefined) {
    if (body.kyc_status === 'verified' && kyc_level < 1) {
      kyc_level = 1 // passage à verified → niveau 1 minimum
    } else if (body.kyc_status === 'rejected' || body.kyc_status === 'pending') {
      kyc_level = 0 // rejet ou remise en attente → niveau 0
    }
  }

  await c.env.DB.prepare(
    `UPDATE members SET first_name=?,last_name=?,email=?,phone=?,country=?,kyc_status=?,kyc_level=?,birth_date=?,country_of_origin=?,updated_at=datetime('now') WHERE id=?`
  ).bind(first_name, last_name, email, phone||null, country||null, kyc_status||null, kyc_level, birth_date||null, country_of_origin||null, id).run()

  // Réinitialisation du mot de passe si fourni
  if (body.password) {
    const { hashPassword } = await import('../lib/auth.js')
    const hash = await hashPassword(body.password)
    await c.env.DB.prepare(
      `UPDATE members SET password_hash=?, updated_at=datetime('now') WHERE id=?`
    ).bind(hash, id).run()
  }

  return c.json({ success: true })
})

admin.delete('/members/:id', requirePermission('members.delete'), async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare(`DELETE FROM notifications WHERE member_id=?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM bv_logs WHERE member_id=?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM commissions WHERE member_id=?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM withdrawals WHERE member_id=?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM wallets WHERE member_id=?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM holding_tank WHERE member_id=?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM package_orders WHERE member_id=?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM finstrategia_licenses WHERE member_id=?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM reserve_strategique WHERE member_id=?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM bv_queue WHERE member_id=?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM rank_queue WHERE member_id=?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM commission_queue WHERE member_id=?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM members WHERE id=?`).bind(id).run()
  return c.json({ success: true })
})

// ── MEMBER OVERRIDES — Ajustements manuels BV & Rang ──────────────────────

// GET /members/:id/overrides — lire l'override actuel + historique
admin.get('/members/:id/overrides', requirePermission('members.edit'), async (c) => {
  const memberId = c.req.param('id')
  try {
    const [current, logs] = await Promise.all([
      c.env.DB.prepare(
        `SELECT * FROM member_overrides WHERE member_id = ?`
      ).bind(memberId).first(),
      c.env.DB.prepare(
        `SELECT mol.*, au.name as admin_username
         FROM member_overrides_log mol
         LEFT JOIN admin_users au ON au.id = mol.admin_id
         WHERE mol.member_id = ?
         ORDER BY mol.created_at DESC LIMIT 50`
      ).bind(memberId).all(),
    ])
    return c.json({ override: current || null, logs: logs.results })
  } catch (e: any) {
    console.error('GET overrides error:', e)
    return c.json({ error: e.message || 'Erreur serveur overrides' }, 500)
  }
})

// POST /members/:id/overrides — créer ou remplacer l'override
admin.post('/members/:id/overrides', requirePermission('members.edit'), async (c) => {
  const memberId = c.req.param('id')
  try {
    const {
      bv_left_monthly_bonus  = 0,
      bv_right_monthly_bonus = 0,
      bv_left_total_bonus    = 0,
      bv_right_total_bonus   = 0,
      rank_override          = null,
      reason                 = '',
    } = await c.req.json()

    // adminId déjà résolu par le middleware d'auth
    const adminId = (c.get('adminId' as any) as string) || null

    const id = crypto.randomUUID()

    // UPSERT : remplace si déjà existant (une seule ligne par membre)
    await c.env.DB.prepare(
      `INSERT INTO member_overrides
         (id, member_id, bv_left_monthly_bonus, bv_right_monthly_bonus,
          bv_left_total_bonus, bv_right_total_bonus, rank_override, reason, created_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(member_id) DO UPDATE SET
         bv_left_monthly_bonus  = excluded.bv_left_monthly_bonus,
         bv_right_monthly_bonus = excluded.bv_right_monthly_bonus,
         bv_left_total_bonus    = excluded.bv_left_total_bonus,
         bv_right_total_bonus   = excluded.bv_right_total_bonus,
         rank_override          = excluded.rank_override,
         reason                 = excluded.reason,
         created_by             = excluded.created_by,
         updated_at             = datetime('now')`
    ).bind(
      id, memberId,
      bv_left_monthly_bonus, bv_right_monthly_bonus,
      bv_left_total_bonus,   bv_right_total_bonus,
      rank_override || null, reason || null, adminId
    ).run()

    // Log immuable
    const logId = crypto.randomUUID()
    await c.env.DB.prepare(
      `INSERT INTO member_overrides_log
         (id, member_id, admin_id, action,
          bv_left_monthly_bonus, bv_right_monthly_bonus,
          bv_left_total_bonus, bv_right_total_bonus,
          rank_override, reason)
       VALUES (?, ?, ?, 'set', ?, ?, ?, ?, ?, ?)`
    ).bind(
      logId, memberId, adminId,
      bv_left_monthly_bonus, bv_right_monthly_bonus,
      bv_left_total_bonus,   bv_right_total_bonus,
      rank_override || null, reason || null
    ).run()

    // Si rang override → mettre à jour current_rank immédiatement
    if (rank_override) {
      await c.env.DB.prepare(
        `UPDATE members SET current_rank = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(rank_override, memberId).run()
    }

    return c.json({ success: true })
  } catch (e: any) {
    console.error('POST overrides error:', e)
    return c.json({ error: e.message || 'Erreur sauvegarde override' }, 500)
  }
})

// DELETE /members/:id/overrides — supprimer l'override (réinitialiser)
admin.delete('/members/:id/overrides', requirePermission('members.edit'), async (c) => {
  const memberId = c.req.param('id')
  try {
    // adminId déjà résolu par le middleware d'auth
    const adminId = (c.get('adminId' as any) as string) || null

    await c.env.DB.prepare(
      `DELETE FROM member_overrides WHERE member_id = ?`
    ).bind(memberId).run()

    // Log immuable (action reset)
    const logId = crypto.randomUUID()
    await c.env.DB.prepare(
      `INSERT INTO member_overrides_log (id, member_id, admin_id, action, reason)
       VALUES (?, ?, ?, 'reset', 'Réinitialisation complète par admin')`
    ).bind(logId, memberId, adminId).run()

    // Recalculer le vrai rang et le remettre
    const realRank = await calculateMemberRank(c.env.DB, memberId)
    await c.env.DB.prepare(
      `UPDATE members SET current_rank = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(realRank, memberId).run()

    return c.json({ success: true, realRank })
  } catch (e: any) {
    console.error('DELETE overrides error:', e)
    return c.json({ error: e.message || 'Erreur réinitialisation override' }, 500)
  }
})

// ── TRIGGER BONUSES MANUELLEMENT ───────────────────────────
// POST /members/:id/trigger-bonuses
// Déclenche immédiatement les bonus pour un membre (prime leadership + rayonnement + influence)
// Purge d'abord toutes les données du mois courant pour repartir proprement.
admin.post('/members/:id/trigger-bonuses', requirePermission('members.edit'), async (c) => {
  const memberId = c.req.param('id')
  try {
    // Période courante (YYYY-MM)
    const period = getMauritiusDateStr().substring(0, 7)

    // 1. Récupérer le membre frais
    const member = await c.env.DB.prepare(`SELECT * FROM members WHERE id = ?`).bind(memberId).first() as any
    if (!member) return c.json({ error: 'Membre introuvable' }, 404)
    if (!member.license_active) return c.json({ error: 'Licence inactive — aucun bonus possible' }, 400)
    if (member.member_status === 'Membre' || member.member_status === 'Client') {
      return c.json({ error: 'Statut insuffisant (Membre/Client) — aucun bonus possible' }, 400)
    }

    // 2. Calculer le rang effectif (avec overrides BV inclus)
    const effectiveRank = await calculateMemberRank(c.env.DB, memberId)
    if (!effectiveRank || effectiveRank === 'none') {
      return c.json({ error: `Rang calculé = none — conditions de rang non remplies (BV insuffisant ou directs insuffisants)` }, 400)
    }

    // 3. Purge complète des données du mois courant pour ce membre
    //    (évite les doublons et erreurs FK si le bouton est cliqué plusieurs fois)

    // 3a. Récupérer les IDs des commissions de ce mois (pour purger pending_wallet_entries)
    const existingComms = await c.env.DB.prepare(
      `SELECT id FROM commissions WHERE member_id = ? AND period = ?`
    ).bind(memberId, period).all()
    const commIds = (existingComms.results as any[]).map(r => r.id)

    // 3b. Supprimer les pending_wallet_entries liées à ces commissions
    for (const commId of commIds) {
      await c.env.DB.prepare(
        `DELETE FROM pending_wallet_entries WHERE commission_id = ?`
      ).bind(commId).run()
    }
    // Supprimer aussi les pending_wallet_entries directes du membre pour cette période
    await c.env.DB.prepare(
      `DELETE FROM pending_wallet_entries WHERE member_id = ? AND period = ?`
    ).bind(memberId, period).run()

    // 3c. Annuler les commissions prime_leadership de ce mois (pending → cancelled)
    //     et rembourser le pending_balance wallet
    const primeComms = await c.env.DB.prepare(
      `SELECT id, amount FROM commissions WHERE member_id = ? AND period = ? AND type = 'prime_leadership' AND status IN ('pending','approved')`
    ).bind(memberId, period).all()
    for (const pc of primeComms.results as any[]) {
      await c.env.DB.prepare(
        `UPDATE commissions SET status = 'cancelled' WHERE id = ?`
      ).bind(pc.id).run()
      // Rembourser le pending_balance
      await c.env.DB.prepare(
        `UPDATE wallets SET pending_balance = MAX(0, pending_balance - ?) WHERE member_id = ?`
      ).bind(pc.amount, memberId).run()
    }

    // 3c-bis. Purger les wallet_transactions prime_leadership de ce mois
    //         (sinon upgradePrimeLeadership voit alreadyPaid > 0 → delta = 0 → ne recrée pas)
    const wtMonth = period + '-'
    await c.env.DB.prepare(
      `DELETE FROM wallet_transactions
       WHERE member_id = ? AND transaction_type = 'prime_leadership'
         AND wallet_type = 'pending'
         AND created_at >= ? || '01'`
    ).bind(memberId, wtMonth).run()

    // 3d. Annuler credit_croissance et reserve_strategique de ce mois
    const ccRows = await c.env.DB.prepare(
      `SELECT id, amount FROM credit_croissance WHERE member_id = ? AND period = ? AND status IN ('held','available')`
    ).bind(memberId, period).all()
    for (const cc of ccRows.results as any[]) {
      await c.env.DB.prepare(
        `UPDATE credit_croissance SET status = 'expired' WHERE id = ?`
      ).bind(cc.id).run()
      await c.env.DB.prepare(
        `UPDATE members SET credit_croissance = MAX(0, credit_croissance - ?) WHERE id = ?`
      ).bind(cc.amount, memberId).run()
    }
    await c.env.DB.prepare(
      `UPDATE commissions SET status = 'cancelled' WHERE member_id = ? AND period = ? AND type IN ('credit_croissance','reserve_strategique') AND status NOT IN ('cancelled')`
    ).bind(memberId, period).run()
    const rsRows = await c.env.DB.prepare(
      `SELECT id, amount FROM reserve_strategique WHERE member_id = ? AND period = ? AND status = 'locked'`
    ).bind(memberId, period).all()
    for (const rs of rsRows.results as any[]) {
      await c.env.DB.prepare(
        `UPDATE reserve_strategique SET status = 'cancelled' WHERE id = ?`
      ).bind(rs.id).run()
      await c.env.DB.prepare(
        `UPDATE members SET reserve_strategique = MAX(0, reserve_strategique - ?) WHERE id = ?`
      ).bind(rs.amount, memberId).run()
    }

    // 3e. Supprimer le verrou monthly_validations
    await c.env.DB.prepare(
      `DELETE FROM monthly_validations WHERE member_id = ? AND period = ?`
    ).bind(memberId, period).run()

    // 4. Mettre à jour current_rank avec le rang calculé (override inclus)
    await c.env.DB.prepare(
      `UPDATE members SET current_rank = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(effectiveRank, memberId).run()

    // 5. Déclencher la prime leadership + CC + RS + rayonnement + influence
    // On tente upgradePrimeLeadership — si ça échoue on laisse passer et on retourne quand même succès partiel
    let upgradeError: string | null = null
    let retroError: string | null = null
    try {
      await upgradePrimeLeadership(c.env.DB, memberId, effectiveRank, period)
    } catch (e1: any) {
      upgradeError = e1.message || String(e1)
      console.error('upgradePrimeLeadership error:', e1)
    }

    // 6. Recalcul rétroactif rayonnement/influence vers les sponsors
    let retro = { rayonnement: 0, influence: 0, details: [] as string[] }
    try {
      retro = await recalculBonusRetroactif(c.env.DB, memberId, period, true)
    } catch (e2: any) {
      retroError = e2.message || String(e2)
      console.error('recalculBonusRetroactif error:', e2)
    }

    // Si les deux ont échoué, retourner erreur
    if (upgradeError && retroError) {
      return c.json({
        error: `Échec étape upgradePrimeLeadership: ${upgradeError}`,
        upgradeError,
        retroError,
      }, 500)
    }

    return c.json({
      success: true,
      memberId,
      period,
      rang: effectiveRank,
      retroactif: {
        rayonnement: retro.rayonnement,
        influence:   retro.influence,
      },
      upgradeError: upgradeError || undefined,
      retroError:   retroError   || undefined,
      message: `Bonus déclenchés pour ${member.first_name} ${member.last_name} — rang ${effectiveRank} — période ${period}${upgradeError ? ' (avec erreurs partielles)' : ''}`,
    })

  } catch (e: any) {
    return c.json({ error: e.message || 'Erreur interne', detail: String(e) }, 500)
  }
})

// ── HOLDING TANK ───────────────────────────────────────────
admin.get('/holding-tank', requirePermission('tree.view'), async (c) => {
  // Lire le délai sponsor depuis la config (défaut 15j)
  const delayCfg = await c.env.DB.prepare(
    `SELECT value FROM compensation_config WHERE key='holding_tank_sponsor_days'`
  ).first() as any
  const sponsorDays = parseInt(delayCfg?.value || '15', 10)

  // Nettoyer les entrées orphelines : holding_tank waiting mais member.in_holding_tank=0
  await c.env.DB.prepare(
    `UPDATE holding_tank SET status='placed'
     WHERE status='waiting'
       AND member_id IN (SELECT id FROM members WHERE in_holding_tank=0)`
  ).run()

  // Mettre à jour admin_can_place pour les entrées dont le délai est expiré
  await c.env.DB.prepare(
    `UPDATE holding_tank
     SET admin_can_place = 1
     WHERE status = 'waiting'
       AND admin_can_place = 0
       AND sponsor_deadline_at IS NOT NULL
       AND sponsor_deadline_at < datetime('now')`
  ).run()

  const rows = await c.env.DB.prepare(
    `SELECT ht.*,
            m.first_name, m.last_name, m.email, m.unique_id, m.member_status,
            m.license_active, m.created_at as member_created,
            s.first_name as sponsor_first, s.last_name as sponsor_last,
            s.unique_id as sponsor_uid, s.id as sponsor_id_raw,
            (SELECT p.name FROM package_orders po JOIN packages p ON p.id=po.package_id
             WHERE po.member_id=m.id AND po.status='validated'
             ORDER BY po.created_at DESC LIMIT 1) as package_name
     FROM holding_tank ht
     JOIN members m ON m.id=ht.member_id
     LEFT JOIN members s ON s.id=ht.sponsor_id
     WHERE ht.status='waiting'
       AND m.in_holding_tank = 1
     ORDER BY ht.created_at ASC`
  ).all()

  // Calculer days_remaining côté JS (D1 ne supporte pas la concaténation dans datetime())
  const now = Date.now()
  const members = (rows.results as any[]).map(row => {
    const deadline = row.sponsor_deadline_at
      ? new Date(row.sponsor_deadline_at).getTime()
      : new Date(row.created_at).getTime() + sponsorDays * 86400000
    return {
      ...row,
      days_remaining: Math.ceil((deadline - now) / 86400000)
    }
  })

  return c.json({ members, sponsor_days: sponsorDays })
})

// PUT /admin/holding-tank/update-deadlines — Recalcule les deadlines si le paramètre change
admin.put('/holding-tank/update-deadlines', requirePermission('tree.edit'), async (c) => {
  const delayCfg = await c.env.DB.prepare(
    `SELECT value FROM compensation_config WHERE key='holding_tank_sponsor_days'`
  ).first() as any
  const sponsorDays = parseInt(delayCfg?.value || '15', 10)

  // D1 ne supporte pas la concaténation de bind dans datetime() — on utilise une valeur littérale
  const deadlineExpr = `datetime(created_at, '+${sponsorDays} days')`
  await c.env.DB.prepare(
    `UPDATE holding_tank
     SET sponsor_deadline_at = ${deadlineExpr},
         admin_can_place = CASE
           WHEN ${deadlineExpr} < datetime('now') THEN 1
           ELSE 0 END
     WHERE status = 'waiting'`
  ).run()

  return c.json({ success: true, sponsor_days: sponsorDays })
})

admin.post('/holding-tank/place', requirePermission('tree.edit'), async (c) => {
  const adminId: string = (c.get('adminId' as any) as string) || 'admin-000000000000000000000000'
  const { member_id, parent_id, position, force_place } = await c.req.json()

  if (!member_id || !parent_id || !['L','R'].includes(position))
    return c.json({ error: 'Paramètres invalides (member_id, parent_id, position L/R requis)' }, 400)

  // Vérifier que l'admin EST autorisé à placer ce membre
  // On cherche status IN ('waiting','placed') pour être robuste aux désynchronisations
  // mais on ne place effectivement que si le membre n'est pas encore dans l'arbre
  const htEntry = await c.env.DB.prepare(
    `SELECT ht.*, m.first_name, m.last_name, m.in_holding_tank,
            s.unique_id as sponsor_unique_id
     FROM holding_tank ht
     JOIN members m ON m.id = ht.member_id
     LEFT JOIN members s ON s.id = ht.sponsor_id
     WHERE ht.member_id = ?`
  ).bind(member_id).first() as any

  if (!htEntry) return c.json({ error: 'Membre introuvable en Holding Tank' }, 404)

  // ── CAS HT-DESYNC : membre déjà placé dans l'arbre mais entrée HT orpheline ──
  // in_holding_tank=0 + binary_parent_id SET = placement déjà effectué.
  // On corrige la désync et on répond SUCCESS (pas une erreur, le résultat est correct).
  if (htEntry.in_holding_tank === 0) {
    // Vérifier si le membre a bien un parent binaire (vraiment placé)
    const memberState = await c.env.DB.prepare(
      `SELECT binary_parent_id, binary_position, unique_id FROM members WHERE id = ?`
    ).bind(member_id).first() as any

    if (memberState?.binary_parent_id) {
      // Synchroniser l'entrée HT si elle est encore 'waiting'
      if (htEntry.status === 'waiting') {
        await c.env.DB.prepare(
          `UPDATE holding_tank SET status='placed', placed_at=datetime('now'), placed_by=?
           WHERE member_id=? AND status='waiting'`
        ).bind(adminId, member_id).run()
      }
      return c.json({
        success: true,
        message: `Membre (${memberState.unique_id}) déjà placé dans l'arbre (position ${memberState.binary_position}). Entrée Holding Tank synchronisée.`,
        newRank: 'none'
      })
    }
  }

  // ── Vérification autorisation placement ──────────────────────
  // Bypass si : délai expiré OU parrain est ROOT OU force_place explicite
  const sponsorIsRoot = htEntry.sponsor_unique_id === 'ROOT' || !htEntry.sponsor_id
  const canPlace = htEntry.admin_can_place || sponsorIsRoot || force_place === true

  if (!canPlace) {
    const deadline = htEntry.sponsor_deadline_at
      ? new Date(htEntry.sponsor_deadline_at).toLocaleDateString('fr-FR')
      : '?'
    return c.json({
      error: `Le parrain a encore la priorité de placement jusqu'au ${deadline}. L'admin peut placer uniquement après expiration du délai.`
    }, 403)
  }

  const result = await placeMemberFromHoldingTank(
    c.env.DB, member_id, parent_id, position as 'L'|'R', adminId, true
  )

  // placeMemberFromHoldingTank retourne toujours success:true si le membre est dans l'arbre
  // (y compris après correction HT-DESYNC interne). On ne retourne erreur que si
  // HOLD_001 / HOLD_002 → slot vraiment occupé par un autre membre.
  if (!result.success) return c.json({ error: result.message }, 409)

  // ── Opérations post-placement non bloquantes ──────────────
  // placeMemberFromHoldingTank a déjà fait UPDATE holding_tank SET status='placed'
  // On complète juste placed_by='admin' sans écraser le statut
  try {
    await c.env.DB.prepare(
      `UPDATE holding_tank SET placed_by=?, placed_at=datetime('now') WHERE member_id=? AND status='placed'`
    ).bind(adminId, member_id).run()
  } catch (_) {}

  // Notifier le parrain
  try {
    if (htEntry.sponsor_id) {
      await createNotification(
        c.env.DB, htEntry.sponsor_id, 'warning',
        "L'admin a placé votre filleul",
        `${htEntry.first_name} ${htEntry.last_name} a été placé dans l'arbre par l'administration.`
      )
    }
  } catch (_) {}

  // Recalculer rang du membre placé (non bloquant)
  let newRank = 'none'
  try {
    newRank = await calculateMemberRank(c.env.DB, member_id)
    await c.env.DB.prepare(
      `UPDATE members SET current_rank=?, updated_at=datetime('now') WHERE id=?`
    ).bind(newRank, member_id).run()
  } catch (_) {}

  return c.json({ success: true, message: result.message, newRank })
})

// ── ACTIVATIONS ────────────────────────────────────────────
admin.get('/activations', requirePermission('packages.view'), async (c) => {
  const { status = 'proof_submitted', type = 'all' } = c.req.query()

  const orders = type !== 'license' ? await c.env.DB.prepare(
    `SELECT po.id, po.member_id, po.package_id, po.status, po.activation_done,
            po.amount_usd, po.payment_method, po.paypal_order_id as reference, po.created_at, po.updated_at,
            po.ai_score, po.pre_validated_at,
            CASE WHEN po.proof_url IS NOT NULL AND po.proof_url != '' THEN 1 ELSE 0 END as has_proof,
            p.name as pkg_name, p.bv_value, p.type as pkg_type, p.includes_license,
            m.first_name, m.last_name, m.email, m.unique_id,
            m.member_status, m.license_active, m.in_holding_tank
     FROM package_orders po
     JOIN packages p ON p.id=po.package_id
     JOIN members m ON m.id=po.member_id
     WHERE po.status=? AND po.activation_done=0
     ORDER BY po.created_at ASC`
  ).bind(status).all() : { results: [] }

  const licenses = type !== 'package' ? await c.env.DB.prepare(
    `SELECT fl.id, fl.member_id, fl.status, fl.price_usd as amount_usd, fl.payment_method,
            fl.created_at, fl.updated_at,
            CASE WHEN fl.proof_url IS NOT NULL AND fl.proof_url != '' THEN 1 ELSE 0 END as has_proof,
            m.first_name, m.last_name, m.email, m.unique_id
     FROM finstrategia_licenses fl
     JOIN members m ON m.id=fl.member_id
     WHERE fl.status IN ('pending','proof_submitted')
     ORDER BY fl.created_at ASC`
  ).all() : { results: [] }

  return c.json({ orders: orders.results, licenses: licenses.results })
})

// ── GET /api/admin/activations/order-proof/:id ───────────
// Retourne uniquement la proof_url d'une commande (peut être une data URL base64 volumineuse)
admin.get('/activations/order-proof/:id', requirePermission('packages.view'), async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare(
    `SELECT proof_url FROM package_orders WHERE id = ?`
  ).bind(id).first() as any
  if (!row) return c.json({ error: 'Commande introuvable' }, 404)
  return c.json({ proof_url: row.proof_url || null })
})

// ── POST /api/admin/activations/validate-order/:id ───────────
// Reconstruction complète — robuste, idempotent, sans FK fragile
admin.post('/activations/validate-order/:id', requirePermission('packages.edit'), async (c) => {
  // adminId garanti valide par le middleware (vérifié en DB)
  const adminId = c.get('adminId' as any) as string
  const orderId = c.req.param('id')
  console.log(`[validate-order] adminId="${adminId}" orderId="${orderId}"`)

  // ── 1. Récupérer la commande ──────────────────────────────
  const order = await c.env.DB.prepare(
    `SELECT id, member_id, package_id, status, activation_done, bv_value, amount_usd
     FROM package_orders WHERE id = ?`
  ).bind(orderId).first() as any
  if (!order) return c.json({ error: 'Commande introuvable' }, 404)

  // ── 2. Guard : membre existant ────────────────────────────
  const member = await c.env.DB.prepare(
    `SELECT id FROM members WHERE id = ?`
  ).bind(order.member_id).first() as any
  if (!member) {
    console.error(`[validate-order] Membre ${order.member_id} introuvable — order orpheline`)
    return c.json({ error: 'Membre introuvable pour cette commande' }, 400)
  }

  // ── 3. Idempotence : déjà activé → retourner succès ──────
  if (order.activation_done) {
    if (order.status !== 'validated') {
      await c.env.DB.prepare(
        `UPDATE package_orders
         SET status='validated', validated_by=?, validated_at=datetime('now'), updated_at=datetime('now')
         WHERE id=?`
      ).bind(adminId, orderId).run()
    }
    const newRank = await calculateMemberRank(c.env.DB, order.member_id)
    return c.json({ success: true, message: 'Déjà activé (idempotent)', newRank })
  }

  // ── 4. Marquer validated (sans FK — colonne TEXT libre) ───
  await c.env.DB.prepare(
    `UPDATE package_orders
     SET status='validated', validated_by=?, validated_at=datetime('now'), updated_at=datetime('now')
     WHERE id=?`
  ).bind(adminId, orderId).run()

  // ── 5. Déclencher activateAndReward ───────────────────────
  let result: { success: boolean; message: string }
  try {
    result = await activateAndReward(c.env.DB, orderId)
  } catch (err: any) {
    // Vérifier si l'activation a quand même réussi malgré l'erreur
    const check = await c.env.DB.prepare(
      `SELECT activation_done FROM package_orders WHERE id=?`
    ).bind(orderId).first() as any

    if (check?.activation_done) {
      console.error('[validate-order] Erreur post-activation (non bloquante):', err?.message || err)
      const oldRankErr = (await c.env.DB.prepare(`SELECT current_rank FROM members WHERE id=?`).bind(order.member_id).first() as any)?.current_rank || 'none'
      const newRankErr = await calculateMemberRank(c.env.DB, order.member_id)
      if (newRankErr !== 'none' && getRankIndex(newRankErr) > getRankIndex(oldRankErr)) {
        // Promotion détectée dans le chemin d'erreur → mettre à jour le rang ET créditer prime/CC
        const periodErr = getMauritiusDateStr().substring(0, 7)
        await c.env.DB.prepare(`UPDATE members SET current_rank=?, rank_achieved_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).bind(newRankErr, order.member_id).run()
        await upgradePrimeLeadership(c.env.DB, order.member_id, newRankErr, periodErr)
      } else if (newRankErr !== oldRankErr) {
        await c.env.DB.prepare(`UPDATE members SET current_rank=?, updated_at=datetime('now') WHERE id=?`).bind(newRankErr, order.member_id).run()
      }
      return c.json({
        success: true,
        message: 'Activé avec succès',
        newRank: newRankErr,
        warning: err?.message
      })
    }

    // Pas encore activé → rollback propre
    console.error('[validate-order] Erreur avant activation (rollback):', err?.message || err)
    await c.env.DB.prepare(
      `UPDATE package_orders
       SET status='proof_submitted', validated_by=NULL, validated_at=NULL, updated_at=datetime('now')
       WHERE id=?`
    ).bind(orderId).run()
    return c.json({ error: `Erreur lors de l'activation : ${err?.message || 'Erreur inconnue'}` }, 500)
  }

  if (!result.success) {
    const check = await c.env.DB.prepare(
      `SELECT activation_done FROM package_orders WHERE id=?`
    ).bind(orderId).first() as any
    if (check?.activation_done) {
      const oldRankIdem = (await c.env.DB.prepare(`SELECT current_rank FROM members WHERE id=?`).bind(order.member_id).first() as any)?.current_rank || 'none'
      const newRankIdem = await calculateMemberRank(c.env.DB, order.member_id)
      if (newRankIdem !== 'none' && getRankIndex(newRankIdem) > getRankIndex(oldRankIdem)) {
        const periodIdem = getMauritiusDateStr().substring(0, 7)
        await c.env.DB.prepare(`UPDATE members SET current_rank=?, rank_achieved_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).bind(newRankIdem, order.member_id).run()
        await upgradePrimeLeadership(c.env.DB, order.member_id, newRankIdem, periodIdem)
      } else if (newRankIdem !== oldRankIdem) {
        await c.env.DB.prepare(`UPDATE members SET current_rank=?, updated_at=datetime('now') WHERE id=?`).bind(newRankIdem, order.member_id).run()
      }
      return c.json({ success: true, message: 'Activé (idempotent)', newRank: newRankIdem })
    }
    await c.env.DB.prepare(
      `UPDATE package_orders
       SET status='proof_submitted', validated_by=NULL, validated_at=NULL, updated_at=datetime('now')
       WHERE id=?`
    ).bind(orderId).run()
    return c.json({ error: result.message }, 400)
  }

  // ── 6. Recalculer le rang et créditer prime/CC si promotion ───────────────
  const oldRankFinal = (await c.env.DB.prepare(`SELECT current_rank FROM members WHERE id=?`).bind(order.member_id).first() as any)?.current_rank || 'none'
  const newRank = await calculateMemberRank(c.env.DB, order.member_id)
  if (newRank !== 'none' && getRankIndex(newRank) > getRankIndex(oldRankFinal)) {
    const period = getMauritiusDateStr().substring(0, 7)
    await c.env.DB.prepare(
      `UPDATE members SET current_rank=?, rank_achieved_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
    ).bind(newRank, order.member_id).run()
    await upgradePrimeLeadership(c.env.DB, order.member_id, newRank, period)
  } else if (newRank !== oldRankFinal) {
    await c.env.DB.prepare(
      `UPDATE members SET current_rank=?, updated_at=datetime('now') WHERE id=?`
    ).bind(newRank, order.member_id).run()
  }

  // ── 7. Email confirmation package activé ──────────────────
  try {
    const orderFull = await c.env.DB.prepare(
      `SELECT m.first_name, m.email, p.name as package_name, po.amount_usd,
              po.validated_at, po.package_expires_at
       FROM package_orders po
       JOIN members m ON m.id = po.member_id
       JOIN packages p ON p.id = po.package_id
       WHERE po.id = ?`
    ).bind(orderId).first() as any
    if (orderFull) {
      // NOTE: await direct — executionCtx non disponible dans les sous-routers Hono
      await sendEmail(c.env.DB, {
        to: orderFull.email,
        toName: orderFull.first_name,
        templateId: 'package_activated',
        variables: {
          prenom:           orderFull.first_name || '',
          package_nom:      orderFull.package_name || '',
          montant:          String(orderFull.amount_usd || ''),
          devise:           'USD',
          date_activation:  new Date().toLocaleDateString('fr-FR'),
          date_expiration:  orderFull.package_expires_at
            ? new Date(orderFull.package_expires_at).toLocaleDateString('fr-FR')
            : 'Illimitée',
          dashboard_url:    'https://willbeleader.pages.dev',
        }
      }).catch(() => {})
    }
  } catch (_) {}

  return c.json({ success: true, message: result.message, newRank })
})

admin.post('/activations/reject-order/:id', requirePermission('packages.edit'), async (c) => {
  const adminId: string = (c.get('adminId' as any) as string) || 'admin-000000000000000000000000'
  const { reason } = await c.req.json()
  await c.env.DB.prepare(
    `UPDATE package_orders SET status='rejected', validated_by=?, rejection_reason=?, updated_at=datetime('now') WHERE id=?`
  ).bind(adminId, reason||'Preuve de paiement invalide', c.req.param('id')).run()

  const order = await c.env.DB.prepare(`SELECT member_id FROM package_orders WHERE id=?`).bind(c.req.param('id')).first() as any
  if (order) {
    await createNotification(c.env.DB, order.member_id, 'warning', 'Commande rejetée',
      `Votre commande a été rejetée. Raison : ${reason||'Preuve invalide'}. Veuillez créer une nouvelle commande depuis votre espace packages.`)
  }
  return c.json({ success: true })
})

// ── Annuler une commande bloquée (pending PSP abandonné) ────────────────────
// Outil de déblocage admin — à utiliser si un membre reste bloqué par une
// commande pending non payée (Mollie, Stripe, v2_psp abandonné, etc.)
admin.post('/activations/cancel-order/:id', requirePermission('packages.edit'), async (c) => {
  const orderId = c.req.param('id')
  const order = await c.env.DB.prepare(
    `SELECT id, member_id, status, payment_method FROM package_orders WHERE id = ?`
  ).bind(orderId).first() as any
  if (!order) return c.json({ error: 'Commande introuvable' }, 404)
  if (!['pending', 'proof_submitted'].includes(order.status)) {
    return c.json({ error: `Impossible d'annuler une commande au statut "${order.status}"` }, 400)
  }
  await c.env.DB.prepare(
    `UPDATE package_orders SET status='cancelled', updated_at=datetime('now') WHERE id=?`
  ).bind(orderId).run()
  await createNotification(c.env.DB, order.member_id, 'info', 'Commande annulée',
    `Votre commande en attente a été annulée par un administrateur. Vous pouvez relancer un nouvel achat.`)
  return c.json({ success: true, message: `Commande ${orderId.substring(0,8)}… annulée.` })
})

admin.post('/activations/reject-license/:id', requirePermission('packages.edit'), async (c) => {
  const adminId: string = (c.get('adminId' as any) as string) || 'admin-000000000000000000000000'
  const licenseId = c.req.param('id')
  let reason = 'Preuve de paiement invalide'
  try {
    const body = await c.req.json()
    reason = body.reason || reason
  } catch {}

  const license = await c.env.DB.prepare(`SELECT member_id FROM finstrategia_licenses WHERE id=?`).bind(licenseId).first() as any
  if (!license) return c.json({ error: 'Licence introuvable' }, 404)

  await c.env.DB.prepare(
    `UPDATE finstrategia_licenses SET status='rejected', validated_by=?, rejection_reason=?, updated_at=datetime('now') WHERE id=?`
  ).bind(adminId, reason, licenseId).run()

  await createNotification(c.env.DB, license.member_id, 'warning', 'Licence rejetée',
    `Votre preuve de paiement pour la licence Finstrategia a été rejetée. Raison : ${reason}. Contactez le support ou soumettez une nouvelle preuve.`)

  return c.json({ success: true })
})

admin.post('/activations/validate-license/:id', requirePermission('packages.edit'), async (c) => {
  const adminId: string = (c.get('adminId' as any) as string) || 'admin-000000000000000000000000'
  const licenseId = c.req.param('id')

  const license = await c.env.DB.prepare(`SELECT * FROM finstrategia_licenses WHERE id=?`).bind(licenseId).first() as any
  if (!license) return c.json({ error: 'Licence introuvable' }, 404)

  // CDC v2 A8 : renouvellement = +365 jours depuis la date d'expiration existante (sans perte)
  const existingExpiry = license.expires_at ? new Date(license.expires_at) : new Date()
  const newExpiry = new Date(existingExpiry)
  newExpiry.setFullYear(newExpiry.getFullYear() + 1)

  await c.env.DB.prepare(
    `UPDATE finstrategia_licenses
     SET status='active', validated_by=?, validated_at=datetime('now'),
         starts_at=datetime('now'), expires_at=?, updated_at=datetime('now')
     WHERE id=?`
  ).bind(adminId, newExpiry.toISOString(), licenseId).run()

  // CDC v2 A10 — Marquer admin_fee_paid si c'est le premier achat du membre
  // (cas où la licence est achetée avant tout package)
  const memberFeeCheck = await c.env.DB.prepare(
    `SELECT admin_fee_paid FROM members WHERE id=?`
  ).bind(license.member_id).first() as any
  if (!memberFeeCheck?.admin_fee_paid) {
    await c.env.DB.prepare(
      `UPDATE members SET admin_fee_paid=1, admin_fee_paid_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
    ).bind(license.member_id).run()
  }

  // Activer la licence sur le membre
  await c.env.DB.prepare(
    `UPDATE members SET license_active=1, license_expires_at=?, updated_at=datetime('now') WHERE id=?`
  ).bind(newExpiry.toISOString(), license.member_id).run()

  // Recalculer statut et rang
  await recalculateMemberStatus(c.env.DB, license.member_id)
  const newRank = await calculateMemberRank(c.env.DB, license.member_id)
  await c.env.DB.prepare(
    `UPDATE members SET current_rank=?, updated_at=datetime('now') WHERE id=?`
  ).bind(newRank, license.member_id).run()

  await createNotification(c.env.DB, license.member_id, 'success', 'Licence Finstrategia activée',
    `Votre licence est active jusqu'au ${newExpiry.toLocaleDateString('fr-FR')}.`)

  return c.json({ success: true, expires_at: newExpiry.toISOString(), newRank })
})

// ── RETRAITS ───────────────────────────────────────────────
admin.get('/withdrawals', requirePermission('withdrawals.view'), async (c) => {
  const { status='pending', page='1', per_page='20' } = c.req.query()
  const offset = (parseInt(page)-1)*parseInt(per_page)
  const rows = await c.env.DB.prepare(
    `SELECT w.*,
            m.first_name, m.last_name, m.email, m.unique_id, m.current_rank,
            m.kyc_status, m.kyc_level, m.wallet_balance,
            adm.name AS confirmed_by_name
     FROM withdrawals w
     JOIN members m ON m.id = w.member_id
     LEFT JOIN admin_users adm ON adm.id = w.confirmed_by
     WHERE w.status=? ORDER BY w.created_at ASC LIMIT ? OFFSET ?`
  ).bind(status, parseInt(per_page), offset).all()
  const total = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM withdrawals WHERE status=?`
  ).bind(status).first() as any
  return c.json({ withdrawals: rows.results, total: total?.cnt||0 })
})

// PATCH /api/admin/withdrawals/:id/process — Prise en charge (pending → processing)
admin.patch('/withdrawals/:id/process', requirePermission('withdrawals.approve'), async (c) => {
  const adminId: string = (c.get('adminId' as any) as string) || 'admin-000000000000000000000000'
  const w = await c.env.DB.prepare(`SELECT * FROM withdrawals WHERE id=?`).bind(c.req.param('id')).first() as any
  if (!w) return c.json({ error: 'Introuvable' }, 404)
  if (w.status !== 'pending') return c.json({ error: 'Ce retrait n\'est pas en statut "en attente"' }, 400)

  await c.env.DB.prepare(
    `UPDATE withdrawals SET status='processing', confirmed_by=?, updated_at=datetime('now') WHERE id=?`
  ).bind(adminId, c.req.param('id')).run()

  await createNotification(c.env.DB, w.member_id, 'info', 'Retrait en cours de traitement',
    `Votre demande de retrait de $${w.amount} est en cours de traitement par notre équipe. Paiement imminent.`)

  return c.json({ success: true })
})

admin.post('/withdrawals/:id/confirm', requirePermission('withdrawals.approve'), async (c) => {
  const adminId: string = (c.get('adminId' as any) as string) || 'admin-000000000000000000000000'
  const { note, payment_reference, admin_internal_note } = await c.req.json()
  const w = await c.env.DB.prepare(`SELECT * FROM withdrawals WHERE id=?`).bind(c.req.param('id')).first() as any
  if (!w) return c.json({ error: 'Introuvable' }, 404)
  if (!['pending', 'processing'].includes(w.status)) return c.json({ error: 'Retrait déjà traité' }, 400)

  await c.env.DB.prepare(
    `UPDATE withdrawals
     SET status='completed', confirmed_by=?, confirmed_at=datetime('now'),
         admin_note=?, payment_reference=?, admin_internal_note=?, updated_at=datetime('now')
     WHERE id=?`
  ).bind(adminId, note||null, payment_reference||null, admin_internal_note||null, c.req.param('id')).run()

  await c.env.DB.prepare(
    `UPDATE wallets SET total_withdrawn=total_withdrawn+? WHERE member_id=?`
  ).bind(w.net_amount, w.member_id).run()
  // Décrémenter pending_withdrawal lors de la confirmation
  await c.env.DB.prepare(
    `UPDATE members SET pending_withdrawal=MAX(0, pending_withdrawal-?), updated_at=datetime('now') WHERE id=?`
  ).bind(w.amount, w.member_id).run()

  const refInfo = payment_reference ? ` (Réf: ${payment_reference})` : ''
  await createNotification(c.env.DB, w.member_id, 'success', ' Retrait confirmé — Paiement envoyé',
    `Votre retrait de $${w.net_amount} a été traité et envoyé sur PayPal${refInfo}. Délai de réception : 1-3h selon PayPal.`)

  // ── Email retrait approuvé ──
  // NOTE: await direct — executionCtx non disponible dans les sous-routers Hono
  const mbrW = await c.env.DB.prepare(`SELECT first_name, email FROM members WHERE id=?`).bind(w.member_id).first() as any
  if (mbrW) {
    await sendEmail(c.env.DB, {
      to: mbrW.email, toName: mbrW.first_name,
      templateId: 'withdrawal_approved',
      variables: {
        prenom: mbrW.first_name || '',
        montant: String(w.net_amount),
        devise: w.currency || 'USD',
        wallet: w.wallet_address || w.paypal_email || '',
        txid: payment_reference || 'N/A',
        date_traitement: new Date().toLocaleDateString('fr-FR'),
        dashboard_url: 'https://willbeleader.pages.dev',
      }
    }).catch(() => {})
  }

  return c.json({ success: true })
})

admin.post('/withdrawals/:id/reject', requirePermission('withdrawals.approve'), async (c) => {
  const { reason, admin_internal_note } = await c.req.json()
  const w = await c.env.DB.prepare(`SELECT * FROM withdrawals WHERE id=?`).bind(c.req.param('id')).first() as any
  if (!w) return c.json({ error: 'Introuvable' }, 404)
  if (w.status === 'completed') return c.json({ error: 'Impossible de rejeter un retrait déjà confirmé' }, 400)

  // Rembourser le solde (PAY_004 — recrédit du wallet_balance) + reset pending_withdrawal
  await c.env.DB.prepare(
    `UPDATE members SET wallet_balance=wallet_balance+?, pending_withdrawal=MAX(0, pending_withdrawal-?), updated_at=datetime('now') WHERE id=?`
  ).bind(w.amount, w.amount, w.member_id).run()
  await c.env.DB.prepare(
    `UPDATE wallets SET balance=balance+? WHERE member_id=?`
  ).bind(w.amount, w.member_id).run()
  await c.env.DB.prepare(
    `UPDATE withdrawals SET status='rejected', admin_note=?, admin_internal_note=?, updated_at=datetime('now') WHERE id=?`
  ).bind(reason||'Rejeté par admin', admin_internal_note||null, c.req.param('id')).run()

  await createNotification(c.env.DB, w.member_id, 'warning', '️ Retrait refusé — Solde recrédité',
    `Votre demande de retrait de $${w.amount} a été refusée. Raison : ${reason||'Non précisée'}. Le montant a été automatiquement recrédité dans votre portefeuille.`)

  // ── Email retrait rejeté ──
  // NOTE: await direct — executionCtx non disponible dans les sous-routers Hono
  const mbrRej = await c.env.DB.prepare(`SELECT first_name, email FROM members WHERE id=?`).bind(w.member_id).first() as any
  if (mbrRej) {
    await sendEmail(c.env.DB, {
      to: mbrRej.email, toName: mbrRej.first_name,
      templateId: 'withdrawal_rejected',
      variables: {
        prenom: mbrRej.first_name || '',
        montant: String(w.amount),
        devise: w.currency || 'USD',
        raison_rejet: reason || 'Non précisée',
        dashboard_url: 'https://willbeleader.pages.dev',
      }
    }).catch(() => {})
  }

  return c.json({ success: true })
})

// ── KYC ────────────────────────────────────────────────────
admin.get('/kyc', requirePermission('members.view'), async (c) => {
  const { status='pending', page='1', per_page='25' } = c.req.query()
  const limit = parseInt(per_page)
  const offset = (parseInt(page)-1)*limit
  const [rows, total] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id,unique_id,first_name,last_name,email,kyc_status,kyc_document_url,kyc_reviewed_at,created_at
       FROM members WHERE kyc_status=? ORDER BY created_at ASC LIMIT ? OFFSET ?`
    ).bind(status, limit, offset).all(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM members WHERE kyc_status=?`
    ).bind(status).first() as any
  ])
  return c.json({ members: rows.results, total: total?.cnt || 0 })
})

admin.post('/kyc/:id/approve', requirePermission('members.edit'), async (c) => {
  const memberId = c.req.param('id')
  // Récupérer le kyc_level actuel pour ne jamais rétrograder
  const current = await c.env.DB.prepare(
    `SELECT kyc_level FROM members WHERE id=?`
  ).bind(memberId).first() as any
  const currentLevel = current?.kyc_level ?? 0
  const newLevel = Math.max(currentLevel, 1) // niveau 1 minimum à l'approbation
  await c.env.DB.prepare(
    `UPDATE members SET kyc_status='verified', kyc_level=?, kyc_reviewed_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
  ).bind(newLevel, memberId).run()
  await createNotification(c.env.DB, memberId, 'success', 'KYC approuvé !',
    'Votre identité a été vérifiée. Vous pouvez maintenant effectuer des retraits.')
  return c.json({ success: true })
})

admin.post('/kyc/:id/reject', requirePermission('members.edit'), async (c) => {
  const memberId = c.req.param('id')
  const { reason } = await c.req.json()
  // Remettre kyc_level à 0 uniquement si le membre n'avait pas déjà un niveau validé
  await c.env.DB.prepare(
    `UPDATE members SET kyc_status='rejected', kyc_level=0, kyc_reviewed_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
  ).bind(memberId).run()
  await createNotification(c.env.DB, memberId, 'warning', 'KYC rejeté',
    `Votre document n'a pas été accepté. Raison: ${reason||'Document invalide'}. Veuillez soumettre un nouveau document.`)
  return c.json({ success: true })
})

// ── ARBRE BINAIRE ──────────────────────────────────────────
// Utilise une CTE récursive pour charger tous les nœuds en 1 seule requête SQL
// puis reconstruit l'arbre en mémoire → évite le timeout Cloudflare Workers
admin.get('/binary-tree', requirePermission('tree.view'), async (c) => {
  const { root_id, depth: maxD = '10' } = c.req.query()
  const maxDepth = Math.min(parseInt(maxD) || 10, 20)

  // ── Résoudre le rootId ────────────────────────────────────────────────
  let rootId = root_id
  if (!rootId) {
    const root = await c.env.DB.prepare(
      `SELECT id FROM members WHERE unique_id='ROOT' LIMIT 1`
    ).first() as any
    if (!root) {
      const firstMember = await c.env.DB.prepare(
        `SELECT id FROM members WHERE binary_parent_id IS NULL ORDER BY created_at ASC LIMIT 1`
      ).first() as any
      rootId = firstMember?.id
    } else {
      rootId = root.id
    }
  }
  if (!rootId) return c.json({ tree: null })

  // ── 1 SEULE REQUÊTE : CTE récursive ──────────────────────────────────
  // Charge tous les nœuds de l'arbre jusqu'à maxDepth en un seul aller-retour DB
  const rows = await c.env.DB.prepare(`
    WITH RECURSIVE tree_cte(
      id, unique_id, first_name, last_name, member_status, current_rank,
      left_bv_monthly, right_bv_monthly, left_bv_total, right_bv_total,
      in_holding_tank, license_active,
      binary_parent_id, binary_position,
      binary_left_id, binary_right_id,
      node_depth
    ) AS (
      -- Nœud racine
      SELECT
        m.id, m.unique_id, m.first_name, m.last_name, m.member_status, m.current_rank,
        m.left_bv_monthly, m.right_bv_monthly, m.left_bv_total, m.right_bv_total,
        m.in_holding_tank, m.license_active,
        m.binary_parent_id, m.binary_position,
        m.binary_left_id, m.binary_right_id,
        0 AS node_depth
      FROM members m
      WHERE m.id = ?

      UNION ALL

      -- Enfants récursifs
      SELECT
        m.id, m.unique_id, m.first_name, m.last_name, m.member_status, m.current_rank,
        m.left_bv_monthly, m.right_bv_monthly, m.left_bv_total, m.right_bv_total,
        m.in_holding_tank, m.license_active,
        m.binary_parent_id, m.binary_position,
        m.binary_left_id, m.binary_right_id,
        t.node_depth + 1
      FROM members m
      JOIN tree_cte t ON m.binary_parent_id = t.id
      WHERE t.node_depth < ?
    )
    SELECT * FROM tree_cte ORDER BY node_depth ASC
  `).bind(rootId, maxDepth).all()

  if (!rows.results || rows.results.length === 0) return c.json({ tree: null })

  // ── Reconstruction de l'arbre en mémoire ─────────────────────────────
  const nodeMap = new Map<string, any>()
  for (const n of rows.results as any[]) {
    nodeMap.set(n.id, { ...n, left: null, right: null })
  }

  let root: any = null
  for (const n of rows.results as any[]) {
    const node = nodeMap.get(n.id)
    if (n.node_depth === 0) {
      root = node
    } else if (n.binary_parent_id) {
      const parent = nodeMap.get(n.binary_parent_id)
      if (parent) {
        if (n.binary_position === 'L') parent.left = node
        else parent.right = node
      }
    }
  }

  return c.json({
    tree: root,
    total: rows.results.length,
    depth_loaded: maxDepth
  })
})

// ── BV QUEUE ───────────────────────────────────────────────
admin.get('/bv-queue', requirePermission('commissions.view'), async (c) => {
  const { status='pending' } = c.req.query()
  const rows = await c.env.DB.prepare(
    `SELECT bq.*, m.first_name, m.last_name, m.unique_id, m.in_holding_tank
     FROM bv_queue bq JOIN members m ON m.id=bq.member_id
     WHERE bq.status=? ORDER BY bq.created_at ASC LIMIT 50`
  ).bind(status).all()
  return c.json({ queue: rows.results })
})

admin.post('/bv-queue/process', requirePermission('commissions.edit'), async (c) => {
  const result = await processBVQueue(c.env.DB)
  return c.json({ success: true, ...result })
})

admin.post('/bv/force-recalc', requirePermission('commissions.edit'), async (c) => {
  // CDC BV — Recalcul forcé complet :
  // 1. Remettre bv_propagated = 0 sur toutes les commandes validées et activées
  await c.env.DB.prepare(
    `UPDATE package_orders SET bv_propagated = 0
     WHERE status = 'validated' AND activation_done = 1 AND bv_value > 0`
  ).run()

  // 2. Remettre toutes les BVQueue failed/completed en pending pour re-traitement
  await c.env.DB.prepare(
    `UPDATE bv_queue SET status = 'pending', attempts = 0, last_error = NULL
     WHERE status IN ('completed', 'failed')`
  ).run()

  // 3. Reset des BV mensuels (left/right/personal)
  await resetMonthlyBV(c.env.DB)

  // 4. Reprocesser jusqu'à épuisement (max 30 cycles de 10 items)
  let totalProcessed = 0
  for (let i = 0; i < 30; i++) {
    const r = await processBVQueue(c.env.DB)
    totalProcessed += r.processed
    if (r.processed === 0) break
  }

  // 5. Recalculer tous les rangs
  const rankResult = await forceRecalcAllRanks(c.env.DB)

  return c.json({ success: true, totalProcessed, ranksProcessed: rankResult.processed, rankChanges: rankResult.rankChanges })
})

// Recalcul forcé des rangs uniquement (sans BV)
admin.post('/ranks/force-recalc', requirePermission('commissions.edit'), async (c) => {
  const result = await forceRecalcAllRanks(c.env.DB)
  return c.json({ success: true, ...result })
})

// Lire le rang calculé d'un membre
admin.get('/ranks/member/:id', requirePermission('members.view'), async (c) => {
  const memberId = c.req.param('id')
  const rank = await calculateMemberRank(c.env.DB, memberId)
  const member = await c.env.DB.prepare(
    `SELECT unique_id, first_name, last_name, current_rank, left_bv_total, right_bv_total, member_status, license_active FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  return c.json({ success: true, memberId, rank, member })
})

// ── FIX RANG + PRIME + CC (admin manuel) ───────────────────────
// POST /admin/members/:id/fix-rank-prime
// Recalcule le rang réel du membre et, si promotion détectée par rapport au rang
// stocké en DB, crédite la prime de leadership + CC correspondants.
// Corps optionnel : { period?: 'YYYY-MM', force_rank?: string }
//   period     : défaut = mois courant (format YYYY-MM)
//   force_rank : forcer un rang spécifique sans recalcul automatique (cas de test)
admin.post('/members/:id/fix-rank-prime', requirePermission('commissions.edit'), async (c) => {
  const memberId = c.req.param('id')

  const member = await c.env.DB.prepare(
    `SELECT id, unique_id, first_name, last_name, current_rank FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  let body: { period?: string; force_rank?: string } = {}
  try { body = await c.req.json() } catch { /* corps vide OK */ }

  const period = body.period || getMauritiusDateStr().substring(0, 7)
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return c.json({ error: 'Format period invalide, attendu YYYY-MM' }, 400)
  }

  const oldRank = member.current_rank || 'none'

  // Rang cible : forcé manuellement OU recalculé automatiquement
  const targetRank = body.force_rank || await calculateMemberRank(c.env.DB, memberId)

  if (targetRank === 'none') {
    return c.json({
      success: false,
      message: `Aucun rang éligible calculé pour ${member.unique_id} (conditions non remplies)`,
      oldRank, targetRank
    })
  }

  const isPromotion = getRankIndex(targetRank) > getRankIndex(oldRank)
  const isSameRank  = targetRank === oldRank

  if (!isPromotion && !isSameRank) {
    // Rétrogradation — mise à jour simple sans prime
    await c.env.DB.prepare(
      `UPDATE members SET current_rank = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(targetRank, memberId).run()
    return c.json({
      success: true,
      message: `Rang mis à jour (rétrogradation) : ${oldRank} → ${targetRank}. Aucune prime créditée.`,
      oldRank, newRank: targetRank, primeCreated: false
    })
  }

  // Promotion ou recalcul même rang → créditer prime + CC (upgradePrimeLeadership est idempotente)
  if (isPromotion) {
    await c.env.DB.prepare(
      `UPDATE members SET current_rank = ?, rank_achieved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).bind(targetRank, memberId).run()
  }

  await upgradePrimeLeadership(c.env.DB, memberId, targetRank, period)

  return c.json({
    success: true,
    message: isPromotion
      ? `Promotion ${oldRank} → ${targetRank} appliquée. Prime de leadership et CC crédités pour ${period}.`
      : `Rang inchangé (${targetRank}). Prime et CC recalculés / complétés pour ${period}.`,
    oldRank,
    newRank: targetRank,
    period,
    primeCreated: true
  })
})

// ── RECALCUL BONUS RÉTROACTIF (admin manuel) ───────────────────
// POST /admin/members/:id/recalcul-bonus
// Corps optionnel : { period?: 'YYYY-MM', force_retro?: boolean }
// - period    : défaut = mois courant
// - force_retro : true = forcer mode rétroactif quel que soit le toggle global
admin.post('/members/:id/recalcul-bonus', requirePermission('commissions.edit'), async (c) => {
  const memberId = c.req.param('id')

  // Vérifier que le membre existe
  const member = await c.env.DB.prepare(
    `SELECT id, unique_id, first_name, last_name, current_rank FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  // Lire body optionnel
  let body: { period?: string; force_retro?: boolean } = {}
  try { body = await c.req.json() } catch { /* corps vide OK */ }

  // Période : fournie ou mois courant
  const period = body.period ||
    new Date().toISOString().substring(0, 7) // 'YYYY-MM'

  // Valider format YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return c.json({ error: 'Format period invalide, attendu YYYY-MM' }, 400)
  }

  const forceRetro = body.force_retro === true ? true : undefined

  const result = await recalculBonusRetroactif(c.env.DB, memberId, period, forceRetro)

  return c.json({
    success: true,
    member: {
      id: member.id,
      unique_id: member.unique_id,
      name: `${member.first_name} ${member.last_name}`,
      rank: member.current_rank,
    },
    period,
    ...result,
  })
})

// ── CONFIG MLM ─────────────────────────────────────────────
admin.get('/config', requirePermission('settings.view'), async (c) => {
  const [comp, ranks, influence, faststart, bonus] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM compensation_config ORDER BY id`).all(),
    c.env.DB.prepare(`SELECT * FROM rank_config ORDER BY rank_order ASC`).all(),
    c.env.DB.prepare(`SELECT * FROM influence_config ORDER BY level ASC`).all(),
    c.env.DB.prepare(`SELECT * FROM fast_start_config ORDER BY bv_threshold ASC`).all(),
    c.env.DB.prepare(`SELECT * FROM bonus_config ORDER BY id`).all(),
  ])
  return c.json({
    compensation: comp.results,
    ranks:        ranks.results,
    influence:    influence.results,
    faststart:    faststart.results,
    bonus:        bonus.results,
  })
})

admin.put('/config/compensation', requirePermission('settings.edit'), async (c) => {
  const updates = await c.req.json() as Record<string, string>
  for (const [key, value] of Object.entries(updates)) {
    await c.env.DB.prepare(
      `INSERT INTO compensation_config (id, key, value) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`
    ).bind(generateId(), key, String(value)).run()
  }

  // Si le délai sponsor holding_tank a changé → recalculer les deadlines existantes
  if ('holding_tank_sponsor_days' in updates) {
    const days = parseInt(updates['holding_tank_sponsor_days'] || '15', 10)
    const dExpr = `datetime(created_at, '+${days} days')`
    await c.env.DB.prepare(
      `UPDATE holding_tank
       SET sponsor_deadline_at = ${dExpr},
           admin_can_place = CASE
             WHEN ${dExpr} < datetime('now') THEN 1
             ELSE 0 END
       WHERE status = 'waiting'`
    ).run()
  }

  return c.json({ success: true })
})

admin.put('/config/rank/:name', requirePermission('settings.edit'), async (c) => {
  const {
    monthly_prime, monthly_cap, min_bv_leg, min_directs,
    bv_rank_use_total, badge_url,
    // Champs Prime de Leadership mensuelle
    min_monthly_bv_leg, min_monthly_directs, min_monthly_package_value, monthly_floor_ranks,
    // Type de package requis (affiché dans Config MLM, persisté en DB)
    required_package_type
  } = await c.req.json()
  await c.env.DB.prepare(
    `UPDATE rank_config SET
      monthly_prime=?, monthly_cap=?, min_bv_leg=?, min_directs=?,
      bv_rank_use_total=?,
      badge_url=COALESCE(?,badge_url),
      min_monthly_bv_leg=COALESCE(?,min_monthly_bv_leg),
      min_monthly_directs=COALESCE(?,min_monthly_directs),
      min_monthly_package_value=COALESCE(?,min_monthly_package_value),
      monthly_floor_ranks=COALESCE(?,monthly_floor_ranks),
      required_package_type=COALESCE(?,required_package_type),
      updated_at=datetime('now')
     WHERE rank_name=?`
  ).bind(
    monthly_prime, monthly_cap, min_bv_leg, min_directs,
    bv_rank_use_total ?? 1,
    badge_url ?? null,
    min_monthly_bv_leg != null ? min_monthly_bv_leg : null,
    min_monthly_directs != null ? min_monthly_directs : null,
    min_monthly_package_value != null ? min_monthly_package_value : null,
    monthly_floor_ranks != null ? monthly_floor_ranks : null,
    required_package_type ?? null,
    c.req.param('name')
  ).run()
  return c.json({ success: true })
})

// DELETE badge d'un rang
admin.delete('/config/rank/:name/badge', requirePermission('settings.edit'), async (c) => {
  await c.env.DB.prepare(
    `UPDATE rank_config SET badge_url = NULL, updated_at = datetime('now') WHERE rank_name = ?`
  ).bind(c.req.param('name')).run()
  return c.json({ success: true })
})

admin.put('/config/bonus', requirePermission('settings.edit'), async (c) => {
  const updates = await c.req.json() as Record<string, string>
  for (const [key, value] of Object.entries(updates)) {
    await c.env.DB.prepare(
      `INSERT INTO bonus_config (id, key, value) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value`
    ).bind(generateId(), key, String(value)).run()
  }
  return c.json({ success: true })
})

// ── CONFIG RAYONNEMENT — lecture ────────────────────────────
admin.get('/config/rayonnement', requirePermission('settings.view'), async (c) => {
  const [configRows, categoriesRows] = await Promise.all([
    c.env.DB.prepare(
      `SELECT key, value, description FROM bonus_config
       WHERE key LIKE 'rayonnement_%' ORDER BY key`
    ).all(),
    c.env.DB.prepare(
      `SELECT id, name, description FROM package_categories
       WHERE is_active = 1 ORDER BY display_order`
    ).all(),
  ])
  // Convertir en objet clé→valeur pour faciliter l'usage côté front
  const config: Record<string, string> = {}
  const descriptions: Record<string, string> = {}
  for (const row of configRows.results as any[]) {
    config[row.key] = row.value
    descriptions[row.key] = row.description || ''
  }
  return c.json({
    config,
    descriptions,
    categories: categoriesRows.results,
  })
})

// ── CONFIG RAYONNEMENT — mise à jour ────────────────────────
admin.put('/config/rayonnement', requirePermission('settings.edit'), async (c) => {
  const updates = await c.req.json() as Record<string, string>
  const allowed = [
    'rayonnement_enabled',
    'rayonnement_pct',
    'rayonnement_min_package_price',
    'rayonnement_eligible_categories',
    'rayonnement_require_parrainage',
    'rayonnement_min_monthly_bv',
    'rayonnement_min_rank',
  ]
  for (const [key, value] of Object.entries(updates)) {
    if (!allowed.includes(key)) continue
    await c.env.DB.prepare(
      `INSERT INTO bonus_config (id, key, value)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value`
    ).bind(generateId(), key, String(value)).run()
  }
  return c.json({ success: true })
})

// ── GET /config/influence — taux par niveau + conditions ──────
admin.get('/config/influence', requirePermission('settings.view'), async (c) => {
  const [levelsRes, configRes] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM influence_config ORDER BY level ASC`).all(),
    c.env.DB.prepare(
      `SELECT key, value FROM bonus_config WHERE key IN (
         'influence_enabled',
         'influence_min_rank',
         'influence_min_filleul_rank',
         'influence_require_parrainage_achat',
         'influence_min_monthly_bv_ratio',
         'retroactivite_intra_mois_enabled'
       )`
    ).all(),
  ])

  const configMap: Record<string, string> = {}
  for (const row of configRes.results as any[]) {
    configMap[row.key] = row.value
  }

  return c.json({
    levels: levelsRes.results,
    influence_enabled:                   configMap['influence_enabled']                   ?? 'true',
    influence_min_rank:                  configMap['influence_min_rank']                  ?? 'Leader',
    influence_min_filleul_rank:          configMap['influence_min_filleul_rank']          ?? 'Manager',
    influence_require_parrainage_achat:  configMap['influence_require_parrainage_achat']  ?? 'true',
    influence_min_monthly_bv_ratio:      configMap['influence_min_monthly_bv_ratio']      ?? 'true',
    retroactivite_intra_mois_enabled:    configMap['retroactivite_intra_mois_enabled']    ?? 'true',
  })
})

// ── PUT /config/influence — taux par niveau + conditions ──────
admin.put('/config/influence', requirePermission('settings.edit'), async (c) => {
  const body = await c.req.json()

  // 1. Mise à jour des taux par niveau
  const levels = Array.isArray(body.levels) ? body.levels : []
  for (const lvl of levels) {
    if (lvl.level !== undefined && lvl.percentage !== undefined) {
      await c.env.DB.prepare(
        `UPDATE influence_config SET percentage=?, updated_at=datetime('now') WHERE level=?`
      ).bind(Number(lvl.percentage), Number(lvl.level)).run()
    }
  }

  // 2. Mise à jour des clés bonus_config influence
  const influenceKeys = [
    'influence_enabled',
    'influence_min_rank',
    'influence_min_filleul_rank',
    'influence_require_parrainage_achat',
    'influence_min_monthly_bv_ratio',
    'retroactivite_intra_mois_enabled',
  ]
  for (const key of influenceKeys) {
    if (body[key] !== undefined) {
      await c.env.DB.prepare(
        `INSERT INTO bonus_config (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value`
      ).bind(key, String(body[key])).run()
    }
  }

  return c.json({ success: true })
})

// ── GET /config/credit-croissance — paramètres CC dédiés ──────
admin.get('/config/credit-croissance', requirePermission('settings.view'), async (c) => {
  const [compRows, bonusRows, entriesRes] = await Promise.all([
    c.env.DB.prepare(
      `SELECT key, value FROM compensation_config
       WHERE key IN ('credit_croissance_pct','credit_croissance_validity_months','credit_croissance_max_withdrawal',
                     'credit_croissance_cap',
                     'cc_withdrawal_min_amount','cc_withdrawal_max_amount',
                     'cc_withdrawal_desc_min_chars','cc_withdrawal_processing_time','cc_withdrawal_max_pending')
       ORDER BY key`
    ).all(),
    c.env.DB.prepare(
      `SELECT key, value FROM bonus_config
       WHERE key IN ('credit_croissance_enabled','credit_croissance_rank')
       ORDER BY key`
    ).all(),
    c.env.DB.prepare(
      `SELECT cc.*, m.first_name, m.last_name, m.unique_id
       FROM credit_croissance cc
       JOIN members m ON m.id = cc.member_id
       WHERE cc.status IN ('held','available','expired')
       ORDER BY cc.created_at DESC LIMIT 50`
    ).all(),
  ])

  const compMap: Record<string,string> = {}
  for (const r of compRows.results as any[]) compMap[r.key] = r.value
  const bonusMap: Record<string,string> = {}
  for (const r of bonusRows.results as any[]) bonusMap[r.key] = r.value

  // Statistiques globales
  const stats = await c.env.DB.prepare(
    `SELECT
      COALESCE(SUM(CASE WHEN status='held'      THEN amount - used_amount ELSE 0 END),0) as total_held,
      COALESCE(SUM(CASE WHEN status='available' THEN amount - used_amount ELSE 0 END),0) as total_available,
      COALESCE(SUM(CASE WHEN status='expired'   THEN amount - used_amount ELSE 0 END),0) as total_expired,
      COUNT(DISTINCT CASE WHEN status IN ('held','available') THEN member_id END)         as active_members
     FROM credit_croissance`
  ).first() as any

  return c.json({
    pct:              compMap['credit_croissance_pct']              ?? '20',
    validity_months:  compMap['credit_croissance_validity_months']  ?? '3',
    max_withdrawal:   compMap['credit_croissance_max_withdrawal']   ?? '0',
    cap:              compMap['credit_croissance_cap']              ?? '5000',
    enabled:          bonusMap['credit_croissance_enabled']         ?? 'true',
    min_rank:         bonusMap['credit_croissance_rank']            ?? 'Leader',
    // Paramètres des demandes de remboursement
    withdrawal_min_amount:     compMap['cc_withdrawal_min_amount']      ?? '10',
    withdrawal_max_amount:     compMap['cc_withdrawal_max_amount']      ?? '5000',
    withdrawal_desc_min_chars: compMap['cc_withdrawal_desc_min_chars']  ?? '10',
    withdrawal_processing_time:compMap['cc_withdrawal_processing_time'] ?? '48h',
    withdrawal_max_pending:    compMap['cc_withdrawal_max_pending']     ?? '1',
    stats:            stats || { total_held:0, total_available:0, total_expired:0, active_members:0 },
    entries:          entriesRes.results || [],
  })
})

// ── PUT /config/credit-croissance — mise à jour paramètres CC ─
admin.put('/config/credit-croissance', requirePermission('settings.edit'), async (c) => {
  const body = await c.req.json()

  // compensation_config
  const compKeys: Record<string, string> = {
    pct:                      'credit_croissance_pct',
    validity_months:          'credit_croissance_validity_months',
    max_withdrawal:           'credit_croissance_max_withdrawal',
    cap:                      'credit_croissance_cap',
    withdrawal_min_amount:    'cc_withdrawal_min_amount',
    withdrawal_max_amount:    'cc_withdrawal_max_amount',
    withdrawal_desc_min_chars:'cc_withdrawal_desc_min_chars',
    withdrawal_processing_time:'cc_withdrawal_processing_time',
    withdrawal_max_pending:   'cc_withdrawal_max_pending',
  }
  for (const [field, key] of Object.entries(compKeys)) {
    if (body[field] !== undefined) {
      await c.env.DB.prepare(
        `INSERT INTO compensation_config (id, key, value) VALUES (lower(hex(randomblob(16))), ?, ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`
      ).bind(key, String(body[field])).run()
    }
  }

  // bonus_config
  const bonusKeys: Record<string, string> = {
    enabled:  'credit_croissance_enabled',
    min_rank: 'credit_croissance_rank',
  }
  for (const [field, key] of Object.entries(bonusKeys)) {
    if (body[field] !== undefined) {
      await c.env.DB.prepare(
        `INSERT INTO bonus_config (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value`
      ).bind(key, String(body[field])).run()
    }
  }

  return c.json({ success: true })
})

// ── GET /config/fast-start — paliers + paramètres ─────────────
admin.get('/config/fast-start', requirePermission('settings.view'), async (c) => {
  const [paliersRes, compRows, bonusRows] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM fast_start_config ORDER BY bv_threshold ASC`).all(),
    c.env.DB.prepare(
      `SELECT key, value FROM compensation_config WHERE key = 'fast_start_days'`
    ).all(),
    c.env.DB.prepare(
      `SELECT key, value FROM bonus_config WHERE key = 'fast_start_enabled'`
    ).all(),
  ])

  const compMap: Record<string,string> = {}
  for (const r of compRows.results as any[]) compMap[r.key] = r.value
  const bonusMap: Record<string,string> = {}
  for (const r of bonusRows.results as any[]) bonusMap[r.key] = r.value

  // Membres en cours de Fast Start
  const activeMembersRes = await c.env.DB.prepare(
    `SELECT m.id, m.first_name, m.last_name, m.unique_id, m.fast_start_start_date,
            m.fast_start_bv, m.fast_start_completed,
            (julianday('now') - julianday(m.fast_start_start_date)) as days_elapsed
     FROM members m
     WHERE m.fast_start_start_date IS NOT NULL
       AND m.fast_start_completed = 0
     ORDER BY m.fast_start_start_date DESC LIMIT 30`
  ).all()

  return c.json({
    paliers:         paliersRes.results || [],
    days:            compMap['fast_start_days']    ?? '30',
    enabled:         bonusMap['fast_start_enabled'] ?? 'true',
    active_members:  activeMembersRes.results || [],
  })
})

admin.put('/config/fast-start', requirePermission('settings.edit'), async (c) => {
  // Accepte soit un tableau direct [{bv_threshold, bonus_amount}] soit {paliers:[...], days, enabled}
  const body = await c.req.json()
  const paliers = Array.isArray(body) ? body : (body.paliers || [])

  if (Array.isArray(paliers) && paliers.length > 0) {
    for (const p of paliers) {
      await c.env.DB.prepare(
        `UPDATE fast_start_config SET bonus_amount=? WHERE bv_threshold=?`
      ).bind(p.bonus_amount, p.bv_threshold).run()
    }
  }

  // Durée (jours) — compensation_config
  if (body.days !== undefined) {
    await c.env.DB.prepare(
      `INSERT INTO compensation_config (id, key, value) VALUES (lower(hex(randomblob(16))), 'fast_start_days', ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`
    ).bind(String(body.days)).run()
  }

  // Activation — bonus_config
  if (body.enabled !== undefined) {
    await c.env.DB.prepare(
      `INSERT INTO bonus_config (key, value) VALUES ('fast_start_enabled', ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value`
    ).bind(String(body.enabled)).run()
  }

  return c.json({ success: true })
})

// ── GET /config/reserve-strategique — paramètres RS dédiés ────
admin.get('/config/reserve-strategique', requirePermission('settings.view'), async (c) => {
  const [compRows, bonusRows, entriesRes] = await Promise.all([
    c.env.DB.prepare(
      `SELECT key, value FROM compensation_config
       WHERE key IN ('reserve_strategique_pct','abondement_mentor_pct','abondement_executive_pct')
       ORDER BY key`
    ).all(),
    c.env.DB.prepare(
      `SELECT key, value FROM bonus_config
       WHERE key IN ('reserve_strategique_enabled','reserve_strategique_rank')
       ORDER BY key`
    ).all(),
    c.env.DB.prepare(
      `SELECT rs.*, m.first_name, m.last_name, m.unique_id
       FROM reserve_strategique rs
       JOIN members m ON m.id = rs.member_id
       ORDER BY rs.created_at DESC LIMIT 50`
    ).all(),
  ])

  const compMap: Record<string,string> = {}
  for (const r of compRows.results as any[]) compMap[r.key] = r.value
  const bonusMap: Record<string,string> = {}
  for (const r of bonusRows.results as any[]) bonusMap[r.key] = r.value

  // Statistiques globales RS
  const stats = await c.env.DB.prepare(
    `SELECT
      COALESCE(SUM(CASE WHEN status='locked'   THEN amount ELSE 0 END),0) as total_locked,
      COALESCE(SUM(CASE WHEN status='unlocked' THEN amount ELSE 0 END),0) as total_unlocked,
      COUNT(DISTINCT CASE WHEN status='locked' THEN member_id END)         as active_members,
      MIN(CASE WHEN status='locked' THEN locked_until END)                 as next_unlock_date
     FROM reserve_strategique`
  ).first() as any

  // RS à libérer dans les 30 prochains jours
  const upcoming = await c.env.DB.prepare(
    `SELECT rs.*, m.first_name, m.last_name, m.unique_id
     FROM reserve_strategique rs
     JOIN members m ON m.id = rs.member_id
     WHERE rs.status = 'locked'
       AND rs.locked_until <= date('now', '+30 days')
     ORDER BY rs.locked_until ASC LIMIT 20`
  ).all()

  return c.json({
    pct:                   compMap['reserve_strategique_pct']    ?? '10',
    abondement_mentor_pct: compMap['abondement_mentor_pct']      ?? '10',
    abondement_exec_pct:   compMap['abondement_executive_pct']   ?? '20',
    enabled:               bonusMap['reserve_strategique_enabled'] ?? 'true',
    min_rank:              bonusMap['reserve_strategique_rank']    ?? 'Mentor',
    stats:                 stats || { total_locked:0, total_unlocked:0, active_members:0, next_unlock_date:null },
    upcoming_unlocks:      upcoming.results || [],
    entries:               entriesRes.results || [],
  })
})

// ── PUT /config/reserve-strategique — mise à jour paramètres RS
admin.put('/config/reserve-strategique', requirePermission('settings.edit'), async (c) => {
  const body = await c.req.json()

  // compensation_config
  const compKeys: Record<string, string> = {
    pct:                   'reserve_strategique_pct',
    abondement_mentor_pct: 'abondement_mentor_pct',
    abondement_exec_pct:   'abondement_executive_pct',
  }
  for (const [field, key] of Object.entries(compKeys)) {
    if (body[field] !== undefined) {
      await c.env.DB.prepare(
        `INSERT INTO compensation_config (id, key, value) VALUES (lower(hex(randomblob(16))), ?, ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`
      ).bind(key, String(body[field])).run()
    }
  }

  // bonus_config
  const bonusKeys: Record<string, string> = {
    enabled:  'reserve_strategique_enabled',
    min_rank: 'reserve_strategique_rank',
  }
  for (const [field, key] of Object.entries(bonusKeys)) {
    if (body[field] !== undefined) {
      await c.env.DB.prepare(
        `INSERT INTO bonus_config (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value`
      ).bind(key, String(body[field])).run()
    }
  }

  return c.json({ success: true })
})

// ── COMMISSIONS ────────────────────────────────────────────
admin.get('/commissions', requirePermission('commissions.view'), async (c) => {
  const { page='1', per_page='30', period, type, member_id } = c.req.query()
  const offset = (parseInt(page)-1)*parseInt(per_page)
  let where='WHERE 1=1'; const params: any[]=[]
  if (period)    { where+=` AND c.period=?`;     params.push(period)    }
  if (type)      { where+=` AND c.type=?`;       params.push(type)      }
  if (member_id) { where+=` AND c.member_id=?`;  params.push(member_id) }

  const [rows, total, summary] = await Promise.all([
    c.env.DB.prepare(
      `SELECT c.*, m.first_name, m.last_name, m.unique_id, m.current_rank
       FROM commissions c JOIN members m ON m.id=c.member_id
       ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, parseInt(per_page), offset).all(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM commissions c ${where}`
    ).bind(...params).first() as any,
    c.env.DB.prepare(
      `SELECT type, SUM(amount) as total, COUNT(*) as cnt
       FROM commissions c ${where} GROUP BY type`
    ).bind(...params).all(),
  ])
  return c.json({ commissions: rows.results, total: total?.cnt||0, summary: summary.results })
})

admin.post('/commissions/process-monthly', requirePermission('commissions.edit'), async (c) => {
  // Body optionnel — on ignore les erreurs de parsing JSON
  let period: string | undefined
  try {
    const body = await c.req.json()
    period = body?.period
  } catch { /* body vide, c'est ok */ }
  const p = period || new Date().toISOString().substring(0,7)
  const result = await processMonthlyCommissions(c.env.DB, p)
  return c.json({ success: true, period: p, ...result })
})

admin.post('/commissions/process-daily', requirePermission('commissions.edit'), async (c) => {
  const paid = await processDailyPayments(c.env.DB)
  return c.json({ success: true, paid })
})

// ── CYCLE MENSUEL COMPLET ─────────────────────────────────
// Enchaîne : rangs → commissions mensuelles → paiements du jour
// À appeler chaque 1er du mois depuis le cron ou manuellement
admin.post('/commissions/run-monthly-cycle', requirePermission('commissions.edit'), async (c) => {
  let period: string | undefined
  try { const b = await c.req.json(); period = b?.period } catch {}
  const p = period || new Date().toISOString().substring(0, 7)

  // 1. Recalculer tous les rangs (idempotent)
  const rankResult = await forceRecalcAllRanks(c.env.DB)

  // 2. Calculer les commissions mensuelles pour la période
  const commResult = await processMonthlyCommissions(c.env.DB, p)

  // 3. Traiter les paiements journaliers du jour
  const dailyPaid = await processDailyPayments(c.env.DB)

  return c.json({
    success: true,
    period: p,
    ranks: { processed: rankResult.processed, changes: rankResult.rankChanges },
    commissions: { processed: commResult.processed, skipped: commResult.skipped, alreadyDone: commResult.alreadyDone },
    dailyPaid
  })
})

// ── RENOUVELLEMENTS ABONNEMENTS MENSUELS ──────────────────
// POST /admin/subscriptions/run-renewals
// Déclenche manuellement processMonthlySubscriptions pour la période en cours.
// Idempotent : les abonnements déjà traités ce mois sont ignorés.
// Crédite automatiquement les BV (bv_per_payment) pour chaque renouvellement payé.
admin.post('/subscriptions/run-renewals', requirePermission('commissions.edit'), async (c) => {
  try {
    const result = await processMonthlySubscriptions(c.env.DB)
    return c.json({
      success: true,
      period: new Date().toISOString().substring(0, 7),
      ...result,
    })
  } catch (err: any) {
    console.error('[admin/subscriptions/run-renewals] Erreur:', err?.message)
    return c.json({ error: err?.message || 'Erreur lors du traitement des renouvellements' }, 500)
  }
})

// ── LISTE DES RENOUVELLEMENTS (pagination) ─────────────────
// GET /admin/subscriptions/renewals?period=YYYY-MM&status=&page=1&per_page=25
admin.get('/subscriptions/renewals', requirePermission('commissions.view'), async (c) => {
  const period   = c.req.query('period')   || new Date().toISOString().substring(0, 7)
  const status   = c.req.query('status')   || ''
  const page     = Math.max(1, parseInt(c.req.query('page')     || '1',  10))
  const perPage  = Math.min(100, parseInt(c.req.query('per_page') || '25', 10))
  const offset   = (page - 1) * perPage

  let where = `WHERE sr.period = ?`
  const params: any[] = [period]
  if (status) { where += ` AND sr.status = ?`; params.push(status) }

  const total = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM subscription_renewals sr ${where}`
  ).bind(...params).first() as any

  const rows = await c.env.DB.prepare(
    `SELECT sr.*, m.first_name, m.last_name, m.email, p.name as pkg_name, p.price_monthly
     FROM subscription_renewals sr
     JOIN members  m ON m.id = sr.member_id
     JOIN packages p ON p.id = sr.package_id
     ${where}
     ORDER BY sr.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...params, perPage, offset).all()

  return c.json({
    renewals: rows.results || [],
    total: total?.cnt || 0,
    period,
    page,
    per_page: perPage,
  })
})

// ── CONFIRMER UN RENOUVELLEMENT TRIO ───────────────────────
// POST /admin/subscriptions/renewals/:id/confirm-trio
// Valide manuellement un renouvellement trio_pending (admin confirme que Triomarkets a débité)
admin.post('/subscriptions/renewals/:id/confirm-trio', requirePermission('commissions.edit'), async (c) => {
  const renewalId = c.req.param('id')
  const adminId   = c.get('adminId' as any) as string
  const { amount_received, notes } = await c.req.json() as any

  const renewal = await c.env.DB.prepare(
    `SELECT sr.*, p.bv_per_payment, p.bv_value, p.name as pkg_name,
            po.id as order_id
     FROM subscription_renewals sr
     JOIN packages      p  ON p.id  = sr.package_id
     JOIN package_orders po ON po.id = sr.package_order_id
     WHERE sr.id = ?`
  ).bind(renewalId).first() as any

  if (!renewal) return c.json({ error: 'Renouvellement introuvable' }, 404)
  if (renewal.status !== 'trio_pending') {
    return c.json({ error: `Statut incompatible : ${renewal.status} (attendu: trio_pending)` }, 409)
  }

  // 1. Marquer comme confirmé
  await c.env.DB.prepare(
    `UPDATE subscription_renewals
     SET status='trio_confirmed', trio_confirmed_at=datetime('now'),
         trio_confirmed_by=?, trio_amount_received=?,
         notes=?, updated_at=datetime('now')
     WHERE id=?`
  ).bind(adminId, amount_received || renewal.amount_due, notes || null, renewalId).run()

  // 2. Créditer les BV du renouvellement (bv_per_payment ou bv_value)
  const bvAmount = (renewal.bv_per_payment > 0 ? renewal.bv_per_payment : renewal.bv_value) || 0
  if (bvAmount > 0) {
    const period = renewal.period
    await c.env.DB.prepare(
      `UPDATE members SET
        personal_bv_monthly = personal_bv_monthly + ?,
        personal_bv_total   = COALESCE(personal_bv_total, 0) + ?,
        updated_at          = datetime('now')
       WHERE id = ?`
    ).bind(bvAmount, bvAmount, renewal.member_id).run()

    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO bv_logs
         (id, member_id, source_member_id, bv_amount, bv_type, package_order_id, propagated, period)
       VALUES (?, ?, ?, ?, 'subscription_renewal', ?, 0, ?)`
    ).bind(
      `bvlog-trio-${renewalId}`,
      renewal.member_id, renewal.member_id, bvAmount,
      renewal.order_id, period
    ).run()
  }

  // 3. Notifier le membre
  await c.env.DB.prepare(
    `INSERT INTO notifications (id, member_id, type, title, message, created_at)
     VALUES (?, ?, 'success', 'Abonnement renouvelé', ?, datetime('now'))`
  ).bind(
    `notif-trio-${renewalId}`,
    renewal.member_id,
    `Votre abonnement ${renewal.pkg_name} a été confirmé pour ${renewal.period}. ${bvAmount > 0 ? `${bvAmount} BV crédités.` : ''}`
  ).run()

  return c.json({
    success: true,
    renewal_id: renewalId,
    bv_credited: bvAmount,
    message: 'Renouvellement Trio confirmé' + (bvAmount > 0 ? ` + ${bvAmount} BV crédités` : ''),
  })
})

// ── RECALCUL FORCÉ POUR UN MEMBRE SPÉCIFIQUE ──────────────
// Supprime le verrou monthly_validations du membre puis relance processMonthlyCommissions
// Utile pour corriger les bonus d'influence manquants après montée en rang tardive
admin.post('/commissions/recalculate-member', requirePermission('commissions.edit'), async (c) => {
  const { member_id, period } = await c.req.json() as any
  if (!member_id) return c.json({ error: 'member_id requis' }, 400)
  const p = period || new Date().toISOString().substring(0, 7)

  // 1. Supprimer le verrou pour ce membre sur cette période
  await c.env.DB.prepare(
    `DELETE FROM monthly_validations WHERE member_id = ? AND period = ?`
  ).bind(member_id, p).run()

  // 2. Recalculer uniquement ce membre : processMonthlyCommissions itère sur tous
  //    les membres éligibles — on force juste le re-traitement en supprimant son verrou
  const result = await processMonthlyCommissions(c.env.DB, p)

  return c.json({ success: true, period: p, member_id, ...result })
})

// ── CORRECTION MONTANT COMMISSION + RECALCUL APD ──────────
// PATCH /admin/commissions/:id/correct
// Corrige le montant d'une commission et recalcule automatiquement l'APD de sa PWE.
// Utile pour corriger une erreur de calcul sans tout refaire.
admin.patch('/commissions/:id/correct', requirePermission('commissions.edit'), async (c) => {
  const commId    = c.req.param('id')
  const { new_amount, reason } = await c.req.json() as any
  if (!new_amount || isNaN(parseFloat(new_amount))) return c.json({ error: 'new_amount requis' }, 400)
  const amount = parseFloat(new_amount)
  if (amount <= 0) return c.json({ error: 'new_amount doit être > 0' }, 400)

  // Lire la commission actuelle
  const comm = await c.env.DB.prepare(
    `SELECT * FROM commissions WHERE id = ?`
  ).bind(commId).first() as any
  if (!comm) return c.json({ error: 'Commission introuvable' }, 404)
  if (comm.status === 'cancelled') return c.json({ error: 'Commission annulée — non modifiable' }, 400)

  // Lire la PWE associée
  const pwe = await c.env.DB.prepare(
    `SELECT * FROM pending_wallet_entries WHERE commission_id = ? AND status NOT IN ('cancelled','completed')`
  ).bind(commId).first() as any

  const oldAmount = comm.amount
  const delta     = amount - oldAmount

  // 1. Mettre à jour la commission
  await c.env.DB.prepare(
    `UPDATE commissions SET amount = ?, description = description || ' [CORRIGÉ: ' || ? || ']', updated_at = datetime('now') WHERE id = ?`
  ).bind(amount, reason || `${oldAmount} → ${amount}`, commId).run()

  let pweUpdated = false
  if (pwe) {
    // 2. Recalculer l'APD
    const newAPD     = amount / pwe.days_in_month
    const alreadyPaid = (pwe.amount_per_day || 0) * (pwe.days_paid || 0)
    const newTotal    = amount
    const newRemaining = Math.max(0, newTotal - alreadyPaid)

    await c.env.DB.prepare(
      `UPDATE pending_wallet_entries
       SET total_amount    = ?,
           amount_per_day  = ?,
           updated_at      = datetime('now')
       WHERE id = ?`
    ).bind(newTotal, newAPD, pwe.id).run()

    // 3. Ajuster le pending_balance du wallet (delta)
    if (delta !== 0) {
      if (delta > 0) {
        await c.env.DB.prepare(
          `UPDATE wallets SET pending_balance = pending_balance + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE member_id = ?`
        ).bind(delta, delta, comm.member_id).run()
      } else {
        await c.env.DB.prepare(
          `UPDATE wallets SET pending_balance = MAX(0, pending_balance + ?), updated_at = datetime('now') WHERE member_id = ?`
        ).bind(delta, comm.member_id).run()
      }
    }
    pweUpdated = true
  }

  return c.json({
    success:    true,
    commission_id: commId,
    old_amount: oldAmount,
    new_amount: amount,
    delta,
    pwe_updated: pweUpdated,
    new_apd:    pwe ? (amount / pwe.days_in_month).toFixed(4) : null,
  })
})

// ── ÉTAT COMMISSIONS TEMPS RÉEL ───────────────────────────
// Résumé complet : queue active, membres éligibles, dernières validations
admin.get('/commissions/dashboard', requirePermission('commissions.view'), async (c) => {
  const currentPeriod = new Date().toISOString().substring(0, 7)

  const [queueActive, queueTotal, monthlyValidations, commSummary, eligibleMembers] = await Promise.all([
    // Paiements journaliers en cours (limité — peut être large à grande échelle)
    c.env.DB.prepare(
      `SELECT cq.*, m.first_name, m.last_name, m.unique_id, m.current_rank
       FROM commission_queue cq JOIN members m ON m.id = cq.member_id
       WHERE cq.status = 'active' ORDER BY cq.start_date ASC LIMIT 500`
    ).all(),
    // Total paiements terminés
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM commission_queue WHERE status = 'completed'`).first(),
    // Validations mensuelles faites ce mois (limité)
    c.env.DB.prepare(
      `SELECT mv.*, m.first_name, m.last_name, m.unique_id, m.current_rank
       FROM monthly_validations mv JOIN members m ON m.id = mv.member_id
       WHERE mv.period = ? ORDER BY mv.processed_at DESC LIMIT 200`
    ).bind(currentPeriod).all(),
    // Résumé commissions par type ce mois
    c.env.DB.prepare(
      `SELECT type, status, SUM(amount) as total, COUNT(*) as cnt
       FROM commissions WHERE period = ? GROUP BY type, status ORDER BY total DESC`
    ).bind(currentPeriod).all(),
    // Membres éligibles aux commissions (rang actif) — limité à 500 pour scalabilité
    c.env.DB.prepare(
      `SELECT m.unique_id, m.first_name, m.last_name, m.current_rank,
              m.left_bv_total, m.right_bv_total, m.personal_bv_monthly,
              m.member_status, m.license_active,
              rc.monthly_prime, rc.monthly_cap,
              (SELECT COUNT(*) FROM members c WHERE c.sponsor_id=m.id AND c.member_status IN ('Client','AMI')) as active_clients
       FROM members m
       LEFT JOIN rank_config rc ON rc.rank_name = m.current_rank
       WHERE m.license_active = 1 AND m.member_status IN ('AMI','Partenaire')
         AND m.unique_id != 'ROOT'
       ORDER BY rc.rank_order DESC, m.left_bv_total DESC LIMIT 500`
    ).all(),
  ])

  return c.json({
    currentPeriod,
    queueActive: queueActive.results,
    queueCompletedCount: (queueTotal as any)?.cnt || 0,
    monthlyValidations: monthlyValidations.results,
    commSummary: commSummary.results,
    eligibleMembers: eligibleMembers.results,
  })
})

// ── VOLUMES BV ─────────────────────────────────────────────
admin.get('/bv', requirePermission('commissions.view'), async (c) => {
  const { page='1', per_page='25', member_id, period } = c.req.query()
  const limit = parseInt(per_page)
  const offset = (parseInt(page)-1)*limit
  let where='WHERE 1=1'; const params: any[]=[]
  if (member_id) { where+=` AND bl.member_id=?`; params.push(member_id) }
  if (period)    { where+=` AND bl.period=?`;    params.push(period)    }
  const [rows, total] = await Promise.all([
    c.env.DB.prepare(
      `SELECT bl.*, m.first_name, m.last_name, m.unique_id,
              sm.first_name as src_first, sm.last_name as src_last
       FROM bv_logs bl
       JOIN members m ON m.id=bl.member_id
       LEFT JOIN members sm ON sm.id=bl.source_member_id
       ${where} ORDER BY bl.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM bv_logs bl ${where}`
    ).bind(...params).first() as any
  ])
  return c.json({ logs: rows.results, total: total?.cnt || 0 })
})

// ── RANGS & BONUS ──────────────────────────────────────────
admin.get('/ranks', requirePermission('members.view'), async (c) => {
  const ranks = await c.env.DB.prepare(
    `SELECT rc.*,
      (SELECT COUNT(*) FROM members m WHERE m.current_rank=rc.rank_name) as member_count,
      (SELECT SUM(w.balance) FROM wallets w JOIN members m ON m.id=w.member_id WHERE m.current_rank=rc.rank_name) as total_wallet
     FROM rank_config rc ORDER BY rc.rank_order ASC`
  ).all()
  return c.json({ ranks: ranks.results })
})

// Gardé pour compatibilité ascendante — redirige vers force-recalc
admin.post('/ranks/recalculate-all', requirePermission('commissions.edit'), async (c) => {
  const result = await forceRecalcAllRanks(c.env.DB)
  return c.json({ success: true, updated: result.processed, ...result })
})

// POST /admin/members/recalculate-all-statuses — recalcul de cohérence statut pour tous les membres
// Corrige les incohérences : license_active=1 + package validé mais member_status != 'AMI', etc.
admin.post('/members/recalculate-all-statuses', requirePermission('members.edit'), async (c) => {
  // Trouver tous les membres incohérents
  const incoherent = await c.env.DB.prepare(`
    SELECT DISTINCT m.id, m.unique_id, m.member_status
    FROM members m
    WHERE m.id != 'root-system-000000000000000000000000'
      AND (
        -- license + package validé mais pas AMI
        (m.license_active = 1
         AND EXISTS (SELECT 1 FROM package_orders po JOIN packages p ON p.id = po.package_id
                     WHERE po.member_id = m.id AND po.status = 'validated' AND p.slug != 'licence')
         AND m.member_status != 'AMI')
        OR
        -- license sans package mais pas Partenaire
        (m.license_active = 1
         AND NOT EXISTS (SELECT 1 FROM package_orders po JOIN packages p ON p.id = po.package_id
                         WHERE po.member_id = m.id AND po.status = 'validated' AND p.slug != 'licence')
         AND m.member_status NOT IN ('AMI','Partenaire'))
        OR
        -- package sans license mais pas Client
        (m.license_active = 0
         AND EXISTS (SELECT 1 FROM package_orders po JOIN packages p ON p.id = po.package_id
                     WHERE po.member_id = m.id AND po.status = 'validated' AND p.slug != 'licence')
         AND m.member_status NOT IN ('AMI','Client'))
      )
  `).all() as any

  const members = incoherent.results || []
  let fixed = 0
  const details: any[] = []

  for (const m of members) {
    const before = m.member_status
    await recalculateMemberStatus(c.env.DB, m.id)
    const after = await c.env.DB.prepare(`SELECT member_status FROM members WHERE id = ?`).bind(m.id).first() as any
    details.push({ unique_id: m.unique_id, before, after: after?.member_status })
    if (before !== after?.member_status) fixed++
  }

  return c.json({ success: true, scanned: members.length, fixed, details })
})

// ── LICENCES ───────────────────────────────────────────────
admin.get('/licenses', requirePermission('licenses.view'), async (c) => {
  const { status, page='1', per_page='25' } = c.req.query()
  const limit = parseInt(per_page)
  const offset = (parseInt(page)-1)*limit
  const where = status ? 'WHERE fl.status=?' : ''
  const baseParams = status ? [status] : []
  const q = `SELECT fl.*, m.first_name, m.last_name, m.email, m.unique_id, m.member_status
             FROM finstrategia_licenses fl JOIN members m ON m.id=fl.member_id ${where} ORDER BY fl.created_at DESC LIMIT ? OFFSET ?`
  const cntQ = `SELECT COUNT(*) as cnt FROM finstrategia_licenses fl ${where}`
  const [rows, total] = await Promise.all([
    c.env.DB.prepare(q).bind(...baseParams, limit, offset).all(),
    c.env.DB.prepare(cntQ).bind(...baseParams).first() as any
  ])
  return c.json({ licenses: rows.results, total: total?.cnt || 0 })
})

// Vérification et expiration des licences (quotidien — appelable manuellement ou via cron)
admin.post('/licenses/check-expired', requirePermission('licenses.edit'), async (c) => {
  return runLicenseCheckExpired(c.env.DB)
})

// Fonction interne réutilisable (cron + route admin)
export async function runLicenseCheckExpired(db: D1Database): Promise<Response> {
  const now = new Date().toISOString()

  // Lire license_alert_days depuis la config (défaut : 7)
  const alertRow = await db.prepare(
    `SELECT value FROM compensation_config WHERE key = 'license_alert_days'`
  ).first() as any
  const alertDays = parseInt(alertRow?.value || '7', 10)

  // Expirer les licences dépassées
  const expired = await db.prepare(
    `UPDATE finstrategia_licenses SET status='expired' WHERE status='active' AND expires_at < ?`
  ).bind(now).run()

  // MAJ membres avec licences expirées
  const expiredMembers = await db.prepare(
    `SELECT DISTINCT member_id FROM finstrategia_licenses WHERE status='expired'
     AND member_id IN (SELECT id FROM members WHERE license_active=1)`
  ).all()

  for (const row of expiredMembers.results as any[]) {
    // Vérifier si une autre licence active existe
    const activeLic = await db.prepare(
      `SELECT id FROM finstrategia_licenses WHERE member_id=? AND status='active' AND expires_at > ?`
    ).bind(row.member_id, now).first()

    if (!activeLic) {
      await db.prepare(
        `UPDATE members SET license_active=0, updated_at=datetime('now') WHERE id=?`
      ).bind(row.member_id).run()
      await recalculateMemberStatus(db, row.member_id)
      await createNotification(db, row.member_id, 'warning', 'Licence expirée',
        'Votre licence Finstrategia a expiré. Renouvelez-la pour continuer à recevoir des commissions.')
    }
  }

  // Alertes J-N avant expiration (N = license_alert_days depuis config)
  const soonExpiring = await db.prepare(
    `SELECT DISTINCT fl.member_id FROM finstrategia_licenses fl
     WHERE fl.status='active' AND fl.expires_at BETWEEN ? AND datetime(?, '+${alertDays} days')`
  ).bind(now, now).all()

  for (const row of soonExpiring.results as any[]) {
    await createNotification(db, (row as any).member_id, 'warning', 'Licence bientôt expirée',
      `Votre licence Finstrategia expire dans moins de ${alertDays} jours. Pensez à la renouveler !`)
  }

  return new Response(JSON.stringify({ success: true, expired: expired.meta.changes, alert_days: alertDays }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// ── WALLETS ────────────────────────────────────────────────
admin.get('/wallets', requirePermission('wallets.view'), async (c) => {
  const { search, page = '1', per_page = '30' } = c.req.query()
  const offset = (parseInt(page) - 1) * parseInt(per_page)
  let where = 'WHERE 1=1'; const params: any[] = []
  if (search) {
    where += ` AND (m.first_name LIKE ? OR m.last_name LIKE ? OR m.email LIKE ? OR m.unique_id LIKE ?)`
    const s = `%${search}%`; params.push(s, s, s, s)
  }
  const [rows, total, stats] = await Promise.all([
    c.env.DB.prepare(
      `SELECT w.*, m.first_name, m.last_name, m.email, m.unique_id, m.current_rank, m.member_status,
              m.wallet_balance, m.credit_croissance, m.reserve_strategique, m.pending_withdrawal
       FROM wallets w JOIN members m ON m.id=w.member_id
       ${where} ORDER BY w.balance DESC LIMIT ? OFFSET ?`
    ).bind(...params, parseInt(per_page), offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM wallets w JOIN members m ON m.id=w.member_id ${where}`).bind(...params).first() as any,
    c.env.DB.prepare(
      `SELECT SUM(w.balance) as total_balance, SUM(w.total_earned) as total_earned,
              SUM(w.total_withdrawn) as total_withdrawn,
              SUM(m.credit_croissance) as total_cc, SUM(m.reserve_strategique) as total_rs,
              SUM(m.pending_withdrawal) as total_pending
       FROM wallets w JOIN members m ON m.id=w.member_id`
    ).first() as any,
  ])
  return c.json({ wallets: rows.results, total: total?.cnt || 0, stats })
})

admin.post('/wallets/credit', requirePermission('wallets.edit'), async (c) => {
  const { member_id, amount, note, wallet_type = 'principal' } = await c.req.json()
  if (!member_id || !amount) return c.json({ error: 'member_id et amount requis' }, 400)
  const amt = parseFloat(amount)
  if (amt <= 0) return c.json({ error: 'Montant doit être positif' }, 400)

  // Crédit atomique selon le type de wallet
  if (wallet_type === 'credit_croissance') {
    await c.env.DB.prepare(
      `UPDATE members SET credit_croissance = credit_croissance + ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(amt, member_id).run()
  } else if (wallet_type === 'reserve_strategique') {
    await c.env.DB.prepare(
      `UPDATE members SET reserve_strategique = reserve_strategique + ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(amt, member_id).run()
  } else {
    // Principal — wallet retirable
    await walletOperation(c.env.DB, member_id, amt, 'credit', 'admin_credit')
  }
  await c.env.DB.prepare(
    `INSERT INTO commissions (id,member_id,type,amount,description,status)
     VALUES (?,?,'admin_credit',?,?,'approved')`
  ).bind(generateId(), member_id, amt, note || `Ajustement admin (${wallet_type})`).run()
  await createNotification(c.env.DB, member_id, 'commission', 'Crédit administrateur',
    `$${amt.toFixed(2)} crédités sur votre compte${wallet_type !== 'principal' ? ` (${wallet_type})` : ''}.`)
  return c.json({ success: true })
})

admin.post('/wallets/debit', requirePermission('wallets.edit'), async (c) => {
  const { member_id, amount, note } = await c.req.json()
  if (!member_id || !amount) return c.json({ error: 'member_id et amount requis' }, 400)
  const amt = parseFloat(amount)
  if (amt <= 0) return c.json({ error: 'Montant doit être positif' }, 400)
  const member = await c.env.DB.prepare(`SELECT wallet_balance FROM members WHERE id=?`).bind(member_id).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)
  if (member.wallet_balance < amt) return c.json({ error: `Solde insuffisant ($${member.wallet_balance.toFixed(2)} disponible)` }, 400)
  await walletOperation(c.env.DB, member_id, amt, 'debit', 'admin_debit')
  await createNotification(c.env.DB, member_id, 'warning', 'Débit administrateur',
    `$${amt.toFixed(2)} débités de votre compte. Raison : ${note || 'Ajustement admin'}.`)
  return c.json({ success: true })
})

// ── RÉSERVE STRATÉGIQUE — Déblocage après 36 mois ──────────
admin.get('/reserve-strategique', requirePermission('wallets.view'), async (c) => {
  const { member_id, status = 'all', page='1', per_page='25' } = c.req.query()
  const limit = parseInt(per_page)
  const offset = (parseInt(page)-1)*limit
  let where = 'WHERE 1=1'; const params: any[] = []
  if (member_id) { where += ` AND rs.member_id = ?`; params.push(member_id) }
  if (status !== 'all') { where += ` AND rs.status = ?`; params.push(status) }
  const [rows, total] = await Promise.all([
    c.env.DB.prepare(
      `SELECT rs.*, m.first_name, m.last_name, m.unique_id, m.current_rank
       FROM reserve_strategique rs JOIN members m ON m.id = rs.member_id
       ${where} ORDER BY rs.locked_until ASC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM reserve_strategique rs ${where}`
    ).bind(...params).first() as any
  ])
  return c.json({ reserves: rows.results, total: total?.cnt || 0 })
})

// Déblocage automatique des RS dont les 36 mois sont écoulés
admin.post('/reserve-strategique/unlock-due', requirePermission('wallets.edit'), async (c) => {
  const now = new Date().toISOString()

  // Trouver toutes les RS dont locked_until est dépassé
  const due = await c.env.DB.prepare(
    `SELECT rs.*, m.id as member_db_id
     FROM reserve_strategique rs
     JOIN members m ON m.id = rs.member_id
     WHERE rs.status = 'locked' AND rs.locked_until <= ?`
  ).bind(now).all()

  let unlocked = 0

  for (const row of due.results as any[]) {
    // Créditer le wallet_balance du membre
    await walletOperation(c.env.DB, row.member_id, row.amount, 'credit', 'reserve_strategique_unlock')

    // Marquer comme débloquée
    await c.env.DB.prepare(
      `UPDATE reserve_strategique
       SET status = 'unlocked', unlocked_at = datetime('now')
       WHERE id = ?`
    ).bind(row.id).run()

    // Commission pour traçabilité
    await c.env.DB.prepare(
      `INSERT INTO commissions (id, member_id, type, amount, description, period, status)
       VALUES (?, ?, 'reserve_strategique', ?, ?, ?, 'approved')`
    ).bind(
      generateId(), row.member_id, row.amount,
      `Réserve Stratégique libérée — ${row.period} (3 ans)`, row.period
    ).run()

    await createNotification(c.env.DB, row.member_id, 'commission',
      'Réserve Stratégique libérée',
      `Votre Réserve Stratégique de $${row.amount.toFixed(2)} a été libérée et créditée sur votre portefeuille.`)

    unlocked++
  }

  return c.json({ success: true, unlocked })
})

// ── CRÉDIT DE CROISSANCE — Consultation ────────────────────
admin.get('/credit-croissance', requirePermission('wallets.view'), async (c) => {
  const { member_id, page='1', per_page='25' } = c.req.query()
  const limit = parseInt(per_page)
  const offset = (parseInt(page)-1)*limit
  let where = 'WHERE 1=1'; const params: any[] = []
  if (member_id) { where += ` AND cc.member_id = ?`; params.push(member_id) }
  const [rows, total] = await Promise.all([
    c.env.DB.prepare(
      `SELECT cc.*, m.first_name, m.last_name, m.unique_id, m.current_rank
       FROM credit_croissance cc JOIN members m ON m.id = cc.member_id
       ${where} ORDER BY cc.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM credit_croissance cc ${where}`
    ).bind(...params).first() as any
  ])
  return c.json({ credits: rows.results, total: total?.cnt || 0 })
})

// ── ORCHESTRATEUR / AUTOMATIONS ────────────────────────────
admin.post('/orchestrate', requirePermission('settings.edit'), async (c) => {
  const result = await orchestrateur(c.env.DB)
  // Déclencher aussi le déblocage des RS à chaque orchestration
  const now = new Date().toISOString()
  const dueRS = await c.env.DB.prepare(
    `SELECT id, member_id, amount, period FROM reserve_strategique
     WHERE status = 'locked' AND locked_until <= ?`
  ).bind(now).all()
  let rsUnlocked = 0
  for (const row of dueRS.results as any[]) {
    await walletOperation(c.env.DB, row.member_id, row.amount, 'credit', 'reserve_strategique_unlock')
    await c.env.DB.prepare(
      `UPDATE reserve_strategique SET status = 'unlocked', unlocked_at = datetime('now') WHERE id = ?`
    ).bind(row.id).run()
    await c.env.DB.prepare(
      `INSERT INTO commissions (id, member_id, type, amount, description, period, status)
       VALUES (?, ?, 'reserve_strategique', ?, ?, ?, 'approved')`
    ).bind(generateId(), row.member_id, row.amount,
      `Réserve Stratégique libérée — ${row.period} (3 ans)`, row.period).run()
    await createNotification(c.env.DB, row.member_id, 'commission',
      'Réserve Stratégique libérée',
      `$${row.amount.toFixed(2)} libérés et crédités sur votre portefeuille.`)
    rsUnlocked++
  }
  return c.json({ success: true, ...result, rsUnlocked })
})

admin.post('/reset-monthly-bv', requirePermission('commissions.edit'), async (c) => {
  await resetMonthlyBV(c.env.DB)
  return c.json({ success: true, message: 'BV mensuels remis à zéro' })
})

// ── CONFIG RESET BV MENSUEL ────────────────────────────────
// GET  /admin/config/bv-reset  — lire la config reset BV
// PUT  /admin/config/bv-reset  — mettre à jour la config reset BV

admin.get('/config/bv-reset', requirePermission('settings.view'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT key, value FROM compensation_config
     WHERE key IN ('bv_reset_auto','bv_reset_mode','bv_reset_timezone','bv_reset_hour','bv_reset_cycle_days','bv_reset_last_at')`
  ).all()
  const cfg: Record<string, string> = {}
  for (const row of rows.results as any[]) cfg[row.key] = row.value
  return c.json({
    auto:        cfg['bv_reset_auto']        ?? 'true',
    mode:        cfg['bv_reset_mode']        ?? 'cycle',
    timezone:    cfg['bv_reset_timezone']    ?? 'Indian/Mauritius',
    hour:        parseInt(cfg['bv_reset_hour'] ?? '0', 10),
    cycle_days:  parseInt(cfg['bv_reset_cycle_days'] ?? '30', 10),
    last_reset:  cfg['bv_reset_last_at']     ?? '',
  })
})

admin.put('/config/bv-reset', requirePermission('settings.edit'), async (c) => {
  const { auto, mode, timezone, hour, cycle_days } = await c.req.json()

  const updates: Array<{ key: string; value: string }> = []
  if (auto       !== undefined) updates.push({ key: 'bv_reset_auto',        value: auto ? 'true' : 'false' })
  if (mode       !== undefined) updates.push({ key: 'bv_reset_mode',        value: ['cycle','first_of_month'].includes(mode) ? mode : 'cycle' })
  if (timezone   !== undefined) updates.push({ key: 'bv_reset_timezone',    value: String(timezone) })
  if (hour       !== undefined) updates.push({ key: 'bv_reset_hour',        value: String(parseInt(hour, 10)) })
  if (cycle_days !== undefined) updates.push({ key: 'bv_reset_cycle_days',  value: String(parseInt(cycle_days, 10)) })

  for (const u of updates) {
    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO compensation_config (key, value) VALUES (?, ?)`
    ).bind(u.key, u.value).run()
  }
  return c.json({ success: true })
})

// ── RAPPORTS ───────────────────────────────────────────────
admin.get('/reports', requirePermission('reports.view'), async (c) => {
  const period = c.req.query('period') || new Date().toISOString().substring(0,7)
  const [newMembers, totalBV, totalComm, byRank, byStatus, topEarners] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM members WHERE strftime('%Y-%m',created_at)=?`).bind(period).first() as any,
    c.env.DB.prepare(`SELECT SUM(bv_amount) as total FROM bv_logs WHERE period=?`).bind(period).first() as any,
    c.env.DB.prepare(`SELECT SUM(amount) as total FROM commissions WHERE period=? AND status IN ('approved','paid')`).bind(period).first() as any,
    c.env.DB.prepare(`SELECT current_rank, COUNT(*) as cnt FROM members GROUP BY current_rank ORDER BY (SELECT rank_order FROM rank_config WHERE rank_name=current_rank) ASC`).all(),
    c.env.DB.prepare(`SELECT member_status, COUNT(*) as cnt FROM members GROUP BY member_status`).all(),
    c.env.DB.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank, SUM(c.amount) as earned
       FROM commissions c JOIN members m ON m.id=c.member_id
       WHERE c.period=? AND c.status IN ('approved','paid')
       GROUP BY c.member_id ORDER BY earned DESC LIMIT 10`
    ).bind(period).all(),
  ])
  return c.json({
    period,
    newMembers:       newMembers?.cnt   || 0,
    totalBV:          totalBV?.total    || 0,
    totalCommissions: totalComm?.total  || 0,
    byRank:           byRank.results,
    byStatus:         byStatus.results,
    topEarners:       topEarners.results,
  })
})

// ── ADMINISTRATEURS ────────────────────────────────────────
admin.get('/admins', requirePermission('admin_users.view'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id,email,name,role,created_at FROM admin_users ORDER BY created_at ASC`
  ).all()
  return c.json({ admins: rows.results })
})

admin.post('/admins', requirePermission('admin_users.create'), async (c) => {
  const { email, password, name, role } = await c.req.json()
  const id = generateId()
  const hash = await hashPassword(password)
  await c.env.DB.prepare(
    `INSERT INTO admin_users (id,email,password_hash,name,role) VALUES (?,?,?,?,?)`
  ).bind(id, email, hash, name, role||'admin').run()
  return c.json({ id }, 201)
})

// ══════════════════════════════════════════════════════════════
// ── UPLOAD UNIVERSEL ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

// POST /api/admin/upload — Upload admin
// Stockage : binaire dans KV (FILES_KV), métadonnées dans D1 (évite SQLITE_TOOBIG)
admin.post('/upload', requirePermission('settings.edit'), async (c) => {
  try {
    const contentType = c.req.header('content-type') || ''
    let filename = 'document'
    let mimeType = 'application/octet-stream'
    let sizeBytes = 0
    let fileBytes: Uint8Array | null = null
    let purpose = 'marketing'

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData()
      const file = formData.get('file') as File | null
      purpose = (formData.get('purpose') as string) || 'marketing'
      if (!file) return c.json({ error: 'Aucun fichier fourni' }, 400)
      filename = file.name || 'document'
      mimeType = file.type || 'application/octet-stream'
      const buffer = await file.arrayBuffer()
      sizeBytes = buffer.byteLength
      fileBytes = new Uint8Array(buffer)
    } else {
      const body = await c.req.json() as any
      filename  = body.filename  || 'document'
      mimeType  = body.mime_type || 'application/octet-stream'
      sizeBytes = body.size_bytes || 0
      purpose   = body.purpose   || 'marketing'
      const dataB64 = body.data_b64 || ''
      if (!dataB64) return c.json({ error: 'data_b64 requis' }, 400)
      // Décoder base64 → bytes
      const binary = atob(dataB64)
      fileBytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) fileBytes[i] = binary.charCodeAt(i)
      if (!sizeBytes) sizeBytes = fileBytes.length
    }

    const fileId = generateId()
    const now = new Date().toISOString().replace('T',' ').substring(0,19)
    const publicUrl = `/api/files/${fileId}`  // Route publique — accessible sans auth

    // 1. Stocker le binaire dans KV si disponible, sinon base64 en D1
    let storedData_b64 = ''
    let storageMode = 'kv'
    if (c.env.FILES_KV) {
      await c.env.FILES_KV.put(`file:${fileId}`, fileBytes!.buffer as ArrayBuffer, {
        expirationTtl: 365 * 24 * 3600,
        metadata: { mimeType, filename }
      })
    } else {
      // Fallback D1 base64 (gsk-hosted sans KV)
      storedData_b64 = btoa(String.fromCharCode(...new Uint8Array(fileBytes!.buffer as ArrayBuffer)))
      storageMode = 'db'
    }

    // 2. Métadonnées en D1
    await c.env.DB.prepare(
      `INSERT INTO uploaded_files (id, filename, mime_type, size_bytes, purpose, storage, data_b64, url, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(fileId, filename, mimeType, sizeBytes, purpose, storageMode, storedData_b64, publicUrl, now).run()

    const sizeFmt = sizeBytes > 1024*1024
      ? `${(sizeBytes/1024/1024).toFixed(2)} MB`
      : sizeBytes > 1024 ? `${(sizeBytes/1024).toFixed(1)} KB` : `${sizeBytes} B`

    return c.json({ success: true, file_id: fileId, url: publicUrl, filename, mime_type: mimeType, size: sizeFmt })
  } catch (e: any) {
    return c.json({ error: e.message || 'Erreur upload' }, 500)
  }
})

// GET /api/admin/files/:id — Servir un fichier uploadé (lit depuis KV)
admin.get('/files/:id', requirePermission('settings.view'), async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare(`SELECT * FROM uploaded_files WHERE id=?`).bind(id).first() as any
  if (!row) return c.json({ error: 'Fichier introuvable' }, 404)

  // Lire le binaire depuis KV (optionnel — absent en gsk-hosted)
  const buf = c.env.FILES_KV ? await c.env.FILES_KV.get(`file:${id}`, 'arrayBuffer') : null
  if (!buf) {
    // Fallback : ancien stockage base64 en DB (rétro-compatibilité)
    if (row.data_b64) {
      const binary = atob(row.data_b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return new Response(bytes.buffer, {
        headers: { 'Content-Type': row.mime_type, 'Content-Disposition': `inline; filename="${row.filename}"`, 'Cache-Control': 'public, max-age=86400' }
      })
    }
    return c.json({ error: 'Contenu du fichier introuvable' }, 404)
  }
  return new Response(buf, {
    headers: {
      'Content-Type': row.mime_type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${row.filename}"`,
      'Cache-Control': 'public, max-age=86400'
    }
  })
})

// ══════════════════════════════════════════════════════════════
// ── CATÉGORIES MARKETING ──────────────────────────────────────
// ══════════════════════════════════════════════════════════════

admin.get('/marketing/categories', requirePermission('marketing.view'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT * FROM marketing_categories ORDER BY sort_order ASC, created_at ASC`
  ).all()
  // Compter les assets par catégorie
  const counts = await c.env.DB.prepare(
    `SELECT category_id, COUNT(*) as cnt FROM marketing_assets WHERE category_id IS NOT NULL GROUP BY category_id`
  ).all()
  const countMap: Record<string, number> = {}
  for (const r of counts.results as any[]) countMap[r.category_id] = r.cnt
  const cats = (rows.results as any[]).map((cat: any) => ({ ...cat, assets_count: countMap[cat.id] || 0 }))
  return c.json({ categories: cats })
})

admin.post('/marketing/categories', requirePermission('marketing.edit'), async (c) => {
  const body = await c.req.json() as any
  const { name, icon, color, gradient, description, sort_order } = body
  if (!name) return c.json({ error: 'name requis' }, 400)
  const id = 'cat-' + generateId().substring(0, 8)
  const now = new Date().toISOString().replace('T',' ').substring(0,19)
  const maxRow = await c.env.DB.prepare(`SELECT MAX(sort_order) as mx FROM marketing_categories`).first() as any
  const autoSort = sort_order ?? ((maxRow?.mx ?? -1) + 1)
  await c.env.DB.prepare(
    `INSERT INTO marketing_categories (id, name, icon, color, gradient, description, sort_order, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).bind(id, name, icon||'fa-folder', color||'gold', gradient||'from-yellow-600 to-amber-700', description||null, autoSort, now, now).run()
  return c.json({ id }, 201)
})

admin.put('/marketing/categories/:id', requirePermission('marketing.edit'), async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json() as any
  const now = new Date().toISOString().replace('T',' ').substring(0,19)
  const allowed = ['name','icon','color','gradient','description','sort_order','is_active']
  const fields: string[] = []
  const vals: any[] = []
  for (const k of allowed) {
    if (k in body) {
      fields.push(`${k}=?`)
      vals.push(typeof body[k] === 'boolean' ? (body[k] ? 1 : 0) : body[k])
    }
  }
  if (fields.length === 0) return c.json({ error: 'Aucun champ' }, 400)
  fields.push('updated_at=?'); vals.push(now); vals.push(id)
  await c.env.DB.prepare(`UPDATE marketing_categories SET ${fields.join(',')} WHERE id=?`).bind(...vals).run()
  return c.json({ success: true })
})

admin.delete('/marketing/categories/:id', requirePermission('marketing.edit'), async (c) => {
  const id = c.req.param('id')
  // Dissocier les assets de cette catégorie
  await c.env.DB.prepare(`UPDATE marketing_assets SET category_id=NULL WHERE category_id=?`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM marketing_categories WHERE id=?`).bind(id).run()
  return c.json({ success: true })
})

// ══════════════════════════════════════════════════════════════
// ── ASSETS MARKETING — CRUD COMPLET ──────────────────────────
// ══════════════════════════════════════════════════════════════

admin.get('/marketing', requirePermission('marketing.view'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT ma.*, mc.name as category_name, mc.icon as category_icon, mc.color as category_color, mc.gradient as category_gradient
     FROM marketing_assets ma
     LEFT JOIN marketing_categories mc ON mc.id = ma.category_id
     ORDER BY ma.sort_order ASC, ma.created_at DESC`
  ).all()
  const cats = await c.env.DB.prepare(
    `SELECT * FROM marketing_categories WHERE is_active=1 ORDER BY sort_order ASC`
  ).all()
  const total = rows.results.length
  const active = (rows.results as any[]).filter((r: any) => r.is_active).length
  const featured = (rows.results as any[]).filter((r: any) => r.featured).length
  return c.json({ assets: rows.results, categories: cats.results, stats: { total, active, featured } })
})

admin.post('/marketing', requirePermission('marketing.edit'), async (c) => {
  const body = await c.req.json() as any
  const { title, type, url, thumbnail_url, category, category_id, description,
          is_downloadable, file_size, tag_color, featured, sort_order } = body
  if (!title || !type || !url) return c.json({ error: 'title, type et url requis' }, 400)
  const id = generateId()
  const now = new Date().toISOString().replace('T',' ').substring(0,19)
  const maxRow = await c.env.DB.prepare(`SELECT MAX(sort_order) as mx FROM marketing_assets`).first() as any
  const autoSort = sort_order ?? ((maxRow?.mx ?? -1) + 1)
  await c.env.DB.prepare(
    `INSERT INTO marketing_assets
     (id, title, type, url, thumbnail_url, category, category_id, description,
      is_active, is_downloadable, sort_order, file_size, tag_color, featured, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?)`
  ).bind(
    id, title, type, url,
    thumbnail_url||null, category||null, category_id||null, description||null,
    is_downloadable!=null ? (is_downloadable ? 1 : 0) : 1,
    autoSort, file_size||null, tag_color||'gold',
    featured ? 1 : 0, now, now
  ).run()
  return c.json({ id }, 201)
})

admin.put('/marketing/:id', requirePermission('marketing.edit'), async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const now = new Date().toISOString().replace('T',' ').substring(0,19)
  const fields: string[] = []
  const vals: any[] = []
  const allowed = ['title','type','url','thumbnail_url','category','category_id','description',
                   'is_active','is_downloadable','sort_order','file_size','tag_color','featured']
  for (const k of allowed) {
    if (k in body) {
      fields.push(`${k}=?`)
      const v = body[k]
      vals.push(typeof v === 'boolean' ? (v ? 1 : 0) : v)
    }
  }
  if (fields.length === 0) return c.json({ error: 'Aucun champ à modifier' }, 400)
  fields.push('updated_at=?'); vals.push(now); vals.push(id)
  await c.env.DB.prepare(`UPDATE marketing_assets SET ${fields.join(',')} WHERE id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// Toggle actif/inactif
admin.post('/marketing/:id/toggle', requirePermission('marketing.edit'), async (c) => {
  const id = c.req.param('id')
  const now = new Date().toISOString().replace('T',' ').substring(0,19)
  await c.env.DB.prepare(
    `UPDATE marketing_assets SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END, updated_at=? WHERE id=?`
  ).bind(now, id).run()
  const row = await c.env.DB.prepare(`SELECT is_active FROM marketing_assets WHERE id=?`).bind(id).first() as any
  return c.json({ is_active: row?.is_active ?? 0 })
})

// Toggle featured
admin.post('/marketing/:id/featured', requirePermission('marketing.edit'), async (c) => {
  const id = c.req.param('id')
  const now = new Date().toISOString().replace('T',' ').substring(0,19)
  await c.env.DB.prepare(
    `UPDATE marketing_assets SET featured = CASE WHEN featured=1 THEN 0 ELSE 1 END, updated_at=? WHERE id=?`
  ).bind(now, id).run()
  const row = await c.env.DB.prepare(`SELECT featured FROM marketing_assets WHERE id=?`).bind(id).first() as any
  return c.json({ featured: row?.featured ?? 0 })
})

// Incrément vues
admin.post('/marketing/:id/view', requirePermission('marketing.view'), async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare(
    `UPDATE marketing_assets SET views_count = views_count + 1 WHERE id=?`
  ).bind(id).run()
  return c.json({ success: true })
})

// Réordonner (drag & drop) — reçoit un tableau [{id, sort_order}]
admin.post('/marketing/reorder', requirePermission('marketing.edit'), async (c) => {
  const { items } = await c.req.json() as { items: {id:string, sort_order:number}[] }
  if (!Array.isArray(items)) return c.json({ error: 'items requis' }, 400)
  const now = new Date().toISOString().replace('T',' ').substring(0,19)
  for (const item of items) {
    await c.env.DB.prepare(
      `UPDATE marketing_assets SET sort_order=?, updated_at=? WHERE id=?`
    ).bind(item.sort_order, now, item.id).run()
  }
  return c.json({ success: true })
})

admin.delete('/marketing/:id', requirePermission('marketing.edit'), async (c) => {
  await c.env.DB.prepare(`DELETE FROM marketing_assets WHERE id=?`).bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// ── PACKAGES CRUD ───────────────────────────────────────────
admin.get('/packages', requirePermission('packages.view'), async (c) => {
  const rows = await c.env.DB.prepare(`SELECT * FROM packages WHERE deleted_at IS NULL ORDER BY price_usd ASC`).all()
  return c.json({ packages: rows.results })
})

admin.post('/packages', requirePermission('packages.edit'), async (c) => {
  const { name, slug, price_usd, bv_value, description, features, is_active } = await c.req.json()
  if (!name || !price_usd || !bv_value) return c.json({ error: 'name, price_usd et bv_value requis' }, 400)
  const id = generateId()
  const safeSlug = slug || name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
  await c.env.DB.prepare(
    `INSERT INTO packages (id, name, slug, price_usd, bv_value, description, features, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, name, safeSlug, price_usd, bv_value, description||null, features||null, is_active===false?0:1).run()
  return c.json({ id }, 201)
})

admin.put('/packages/:id', requirePermission('packages.edit'), async (c) => {
  const { name, price_usd, bv_value, description, features, is_active } = await c.req.json()
  await c.env.DB.prepare(
    `UPDATE packages SET name=COALESCE(?,name), price_usd=COALESCE(?,price_usd),
     bv_value=COALESCE(?,bv_value), description=COALESCE(?,description),
     features=COALESCE(?,features), is_active=COALESCE(?,is_active)
     WHERE id=?`
  ).bind(name||null, price_usd||null, bv_value||null, description||null,
         features||null, is_active===undefined?null:is_active?1:0, c.req.param('id')).run()
  return c.json({ success: true })
})

admin.delete('/packages/:id', requirePermission('packages.edit'), async (c) => {
  // Soft-delete : on marque deleted_at plutôt que de supprimer physiquement
  // Les package_orders existants restent intacts (FK toujours valide)
  await c.env.DB.prepare(
    `UPDATE packages SET is_active=0, deleted_at=datetime('now') WHERE id=?`
  ).bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// PATCH /admin/packages/:id/toggle-active — activer/désactiver sans supprimer
admin.patch('/packages/:id/toggle-active', requirePermission('packages.edit'), async (c) => {
  const { is_active } = await c.req.json()
  await c.env.DB.prepare(`UPDATE packages SET is_active=? WHERE id=?`)
    .bind(is_active ? 1 : 0, c.req.param('id')).run()
  return c.json({ success: true })
})

// ── PAYMENT GATEWAY CONFIG ──────────────────────────────────
admin.get('/config/payment-gateway', requirePermission('payment_gateway.view'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT gateway, key, value FROM payment_gateway_config ORDER BY gateway, key`
  ).all()
  // Retourner sous forme {gateway: {key: value}}
  const result: Record<string, Record<string, string>> = {}
  for (const r of (rows.results as any[])) {
    if (!result[r.gateway]) result[r.gateway] = {}
    result[r.gateway][r.key] = r.value
  }
  return c.json({ gateways: result })
})

admin.put('/config/payment-gateway', requirePermission('payment_gateway.edit'), async (c) => {
  const { gateway, settings } = await c.req.json() as { gateway: string; settings: Record<string, string> }
  if (!gateway || !settings) return c.json({ error: 'gateway et settings requis' }, 400)
  for (const [key, value] of Object.entries(settings)) {
    await c.env.DB.prepare(
      `INSERT INTO payment_gateway_config (id, gateway, key, value)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?)
       ON CONFLICT(gateway, key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`
    ).bind(gateway, key, String(value)).run()
  }
  return c.json({ success: true })
})

// ── TEST CONNEXION COINPAYMENTS ──────────────────────────────
// POST /admin/coinpayments/test-connection
// Appelle cmd=get_basic_info pour valider les clés API CoinPayments
admin.post('/coinpayments/test-connection', requirePermission('payment_gateway.view'), async (c) => {
  // Lire les clés depuis la DB (priorité) ou depuis les secrets Cloudflare
  const rows = await c.env.DB.prepare(
    `SELECT key, value FROM payment_gateway_config WHERE gateway = 'coinpayments_api'`
  ).all()
  const cfg: Record<string, string> = {}
  for (const r of (rows.results as any[])) cfg[r.key] = r.value

  const publicKey  = cfg['public_key']  || (c.env as any).COINPAYMENTS_PUBLIC_KEY  || ''
  const privateKey = cfg['private_key'] || (c.env as any).COINPAYMENTS_PRIVATE_KEY || ''

  if (!publicKey || !privateKey) {
    return c.json({ success: false, error: 'Clés API CoinPayments non configurées (public_key / private_key manquants).' }, 400)
  }

  try {
    // Construire le body de la requête
    const body = new URLSearchParams({
      cmd:     'get_basic_info',
      version: '1',
      key:     publicKey,
      format:  'json',
      nonce:   Date.now().toString(),
    })
    const bodyStr = body.toString()

    // HMAC-SHA512
    const keyData   = new TextEncoder().encode(privateKey)
    const msgData   = new TextEncoder().encode(bodyStr)
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

    if (!res.ok) return c.json({ success: false, error: `Erreur HTTP CoinPayments: ${res.status}` }, 502)

    const json = await res.json() as { error: string; result: any }
    if (json.error !== 'ok') {
      return c.json({ success: false, error: `CoinPayments API: ${json.error}` })
    }

    // Succès — retourner les infos de base du compte
    const info = json.result || {}
    return c.json({
      success: true,
      merchant_id: info.merchant_id || info.username || '(non communiqué)',
      username:    info.username    || '(non communiqué)',
      public_name: info.public_name || info.username || '(non communiqué)',
    })

  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Erreur inconnue lors du test de connexion' }, 500)
  }
})

// ── INCLURE PAYMENT GATEWAY DANS /config ───────────────────
// (le GET /config existant est étendu pour inclure packages + gateway)
// NOTE: on surcharge en ajoutant une route distincte plus spécifique

// ── PACKAGES CDC v2 — Routes enrichies ─────────────────────

// GET /admin/packages — avec catégories et tous les champs CDC v2
admin.get('/packages/enriched', requirePermission('packages.view'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT p.*,
            pc.name as category_name, pc.icon as category_icon
     FROM packages p
     LEFT JOIN package_categories pc ON pc.id = p.category_id
     WHERE p.deleted_at IS NULL
     ORDER BY p.display_order ASC, p.price_usd ASC`
  ).all()
  return c.json({ packages: rows.results })
})

// PUT /admin/packages/:id — mise à jour complète champs CDC v2
admin.put('/packages/:id/enriched', requirePermission('packages.edit'), async (c) => {
  const {
    name, slug, price_usd, bv_value, description, features, is_active, type,
    category_id, pricing_type, price_monthly, direct_commission_rate,
    display_order, currency, title, includes_license,
    payment_mode, dreamiles_per_payment, bv_per_payment, duration_years,
    duration_value, duration_unit
  } = await c.req.json()

  // Compatibilité : si l'ancien champ duration_years est envoyé, le mapper
  const finalDurationValue = duration_value !== undefined ? duration_value
    : duration_years !== undefined ? duration_years : undefined
  const finalDurationUnit  = duration_unit || 'years'
  const durationValueBound = finalDurationValue === undefined ? undefined
    : (finalDurationValue === '' || finalDurationValue === null ? null : parseInt(finalDurationValue))

  await c.env.DB.prepare(
    `UPDATE packages SET
      name                  = COALESCE(?, name),
      slug                  = COALESCE(?, slug),
      price_usd             = COALESCE(?, price_usd),
      bv_value              = COALESCE(?, bv_value),
      description           = COALESCE(?, description),
      features              = COALESCE(?, features),
      is_active             = COALESCE(?, is_active),
      type                  = COALESCE(?, type),
      category_id           = COALESCE(?, category_id),
      pricing_type          = COALESCE(?, pricing_type),
      price_monthly         = COALESCE(?, price_monthly),
      direct_commission_rate= COALESCE(?, direct_commission_rate),
      display_order         = COALESCE(?, display_order),
      currency              = COALESCE(?, currency),
      title                 = COALESCE(?, title),
      includes_license      = COALESCE(?, includes_license),
      payment_mode          = COALESCE(?, payment_mode),
      dreamiles_per_payment = COALESCE(?, dreamiles_per_payment),
      bv_per_payment        = COALESCE(?, bv_per_payment),
      duration_value        = ?,
      duration_unit         = COALESCE(?, duration_unit)
     WHERE id = ?`
  ).bind(
    name||null, slug||null, price_usd||null, bv_value||null,
    description||null, features||null,
    is_active === undefined ? null : (is_active ? 1 : 0),
    type||null, category_id||null, pricing_type||null,
    price_monthly||null, direct_commission_rate||null,
    display_order||null, currency||null, title||null,
    includes_license === undefined ? null : (includes_license ? 1 : 0),
    payment_mode||null, dreamiles_per_payment === undefined ? null : parseInt(dreamiles_per_payment),
    bv_per_payment === undefined ? null : parseFloat(bv_per_payment),
    durationValueBound !== undefined ? durationValueBound : null,
    finalDurationUnit,
    c.req.param('id')
  ).run()
  return c.json({ success: true })
})

// POST /admin/packages/enriched — création complète CDC v2 (alias pour le frontend)
admin.post('/packages/enriched', requirePermission('packages.edit'), async (c) => {
  const {
    name, slug, price_usd, bv_value, description, features, type,
    category_id, pricing_type, price_monthly, direct_commission_rate,
    display_order, currency, title, includes_license, is_active,
    payment_mode, dreamiles_per_payment, bv_per_payment,
    duration_value, duration_unit
  } = await c.req.json()

  if (!name || price_usd === undefined || bv_value === undefined) return c.json({ error: 'name, price_usd et bv_value requis' }, 400)

  const id = generateId()
  const safeSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const dv = duration_value === '' || duration_value === null || duration_value === undefined ? null : parseInt(duration_value)
  const du = duration_unit || 'years'

  await c.env.DB.prepare(
    `INSERT INTO packages
      (id, name, slug, price_usd, bv_value, description, features, is_active, type,
       category_id, pricing_type, price_monthly, direct_commission_rate,
       display_order, currency, title, includes_license,
       payment_mode, dreamiles_per_payment, bv_per_payment,
       duration_value, duration_unit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, name, safeSlug, parseFloat(price_usd), parseFloat(bv_value),
    description||null, features||null, is_active === false ? 0 : 1,
    type||'Production', category_id||null,
    pricing_type||'one_time', price_monthly||null,
    parseFloat(direct_commission_rate||'10'),
    parseInt(display_order||'0'), currency||'USD',
    title||null, includes_license ? 1 : 0,
    payment_mode||'one_time',
    parseInt(dreamiles_per_payment||'0'),
    parseFloat(bv_per_payment||'0'),
    dv, du
  ).run()
  return c.json({ id }, 201)
})

// POST /admin/packages — création complète CDC v2
admin.post('/packages/create', requirePermission('packages.edit'), async (c) => {
  const {
    name, slug, price_usd, bv_value, description, features, type,
    category_id, pricing_type, price_monthly, direct_commission_rate,
    display_order, currency, title, includes_license, is_active,
    payment_mode, dreamiles_per_payment, bv_per_payment
  } = await c.req.json()

  if (!name || !price_usd || !bv_value) return c.json({ error: 'name, price_usd et bv_value requis' }, 400)

  const id = generateId()
  const safeSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  await c.env.DB.prepare(
    `INSERT INTO packages
      (id, name, slug, price_usd, bv_value, description, features, is_active, type,
       category_id, pricing_type, price_monthly, direct_commission_rate,
       display_order, currency, title, includes_license,
       payment_mode, dreamiles_per_payment, bv_per_payment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, name, safeSlug, parseFloat(price_usd), parseFloat(bv_value),
    description||null, features||null, is_active === false ? 0 : 1,
    type||'Production', category_id||null,
    pricing_type||'one_time', price_monthly||null,
    parseFloat(direct_commission_rate||'10'),
    parseInt(display_order||'0'), currency||'USD',
    title||null, includes_license ? 1 : 0,
    payment_mode||'one_time',
    parseInt(dreamiles_per_payment||'0'),
    parseFloat(bv_per_payment||'0')
  ).run()
  return c.json({ id }, 201)
})

// ── CATÉGORIES DE PACKAGES CDC v2 ───────────────────────────

admin.get('/package-categories', requirePermission('packages.view'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT pc.*, COUNT(p.id) as package_count
     FROM package_categories pc
     LEFT JOIN packages p ON p.category_id = pc.id AND p.is_active = 1
     GROUP BY pc.id
     ORDER BY pc.display_order ASC`
  ).all()
  return c.json({ categories: rows.results })
})

admin.post('/package-categories', requirePermission('packages.edit'), async (c) => {
  const { name, description, icon, display_order } = await c.req.json()
  if (!name) return c.json({ error: 'name requis' }, 400)
  const id = generateId()
  await c.env.DB.prepare(
    `INSERT INTO package_categories (id, name, description, icon, display_order)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, name, description||null, icon||null, parseInt(display_order||'0')).run()
  return c.json({ id }, 201)
})

admin.put('/package-categories/:id', requirePermission('packages.edit'), async (c) => {
  const { name, description, icon, display_order, is_active, tag } = await c.req.json()
  await c.env.DB.prepare(
    `UPDATE package_categories SET
      name          = COALESCE(?, name),
      description   = COALESCE(?, description),
      icon          = COALESCE(?, icon),
      display_order = COALESCE(?, display_order),
      is_active     = COALESCE(?, is_active),
      tag           = COALESCE(?, tag)
     WHERE id = ?`
  ).bind(
    name||null, description||null, icon||null,
    display_order||null,
    is_active === undefined ? null : (is_active ? 1 : 0),
    tag||null,
    c.req.param('id')
  ).run()
  return c.json({ success: true })
})

// POST /admin/package-categories — avec champ tag
admin.post('/package-categories/create', requirePermission('packages.edit'), async (c) => {
  const { name, description, icon, display_order, tag } = await c.req.json()
  if (!name) return c.json({ error: 'name requis' }, 400)
  const id = generateId()
  await c.env.DB.prepare(
    `INSERT INTO package_categories (id, name, description, icon, display_order, tag)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, name, description||null, icon||null, parseInt(display_order||'0'), tag||null).run()
  return c.json({ id }, 201)
})

// DELETE /admin/package-categories/:id — supprimer une catégorie (si aucun package actif)
admin.delete('/package-categories/:id', requirePermission('packages.edit'), async (c) => {
  const id = c.req.param('id')
  // Vérifier que la catégorie existe
  const cat = await c.env.DB.prepare(`SELECT * FROM package_categories WHERE id = ?`).bind(id).first() as any
  if (!cat) return c.json({ error: 'Catégorie introuvable' }, 404)
  // Compter les packages liés
  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM packages WHERE category_id = ?`
  ).bind(id).first() as any
  if (countRow && countRow.cnt > 0) {
    return c.json({ error: `Impossible de supprimer : ${countRow.cnt} package(s) lié(s) à cette catégorie. Supprimez-les d'abord.` }, 409)
  }
  await c.env.DB.prepare(`DELETE FROM package_categories WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

// ── FRAIS ADMIN — Actions sur un membre (CDC v2 A11) ────────

// POST /admin/members/:id/mark-admin-fee-paid — marquer frais admin comme payés manuellement
admin.post('/members/:id/mark-admin-fee-paid', requirePermission('admin_fee.edit'), async (c) => {
  const adminId: string = (c.get('adminId' as any) as string) || 'admin-000000000000000000000000'
  const memberId = c.req.param('id')
  const member = await c.env.DB.prepare(`SELECT * FROM members WHERE id = ?`).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  await c.env.DB.prepare(
    `UPDATE members SET admin_fee_paid = 1, admin_fee_paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).bind(memberId).run()

  await createNotification(c.env.DB, memberId, 'success', 'Frais d\'administration réglés',
    'Vos frais d\'administration ont été confirmés par l\'équipe LEADER.')

  return c.json({ success: true })
})

// POST /admin/members/:id/renew-license-free — renouveler licence gratuitement (+365j)
admin.post('/members/:id/renew-license-free', requirePermission('licenses.edit'), async (c) => {
  const adminId: string = (c.get('adminId' as any) as string) || 'admin-000000000000000000000000'
  const memberId = c.req.param('id')
  const member = await c.env.DB.prepare(`SELECT * FROM members WHERE id = ?`).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  // Calculer la nouvelle date d'expiration : expiry existante + 365j (ou aujourd'hui + 365j)
  const base = member.license_expires_at ? new Date(member.license_expires_at) : new Date()
  const newExpiry = new Date(base)
  newExpiry.setFullYear(newExpiry.getFullYear() + 1)

  // Insérer une nouvelle licence active gratuite
  const licId = generateId()
  await c.env.DB.prepare(
    `INSERT INTO finstrategia_licenses (id, member_id, price_usd, status, starts_at, expires_at, validated_by, validated_at)
     VALUES (?, ?, 0, 'active', datetime('now'), ?, ?, datetime('now'))`
  ).bind(licId, memberId, newExpiry.toISOString(), adminId).run()

  await c.env.DB.prepare(
    `UPDATE members SET license_active = 1, license_expires_at = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(newExpiry.toISOString(), memberId).run()

  await recalculateMemberStatus(c.env.DB, memberId)
  const newRank = await calculateMemberRank(c.env.DB, memberId)
  await c.env.DB.prepare(
    `UPDATE members SET current_rank = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(newRank, memberId).run()

  await createNotification(c.env.DB, memberId, 'success', 'Licence renouvelée (offert)',
    `Votre licence Finstrategia a été renouvelée jusqu'au ${newExpiry.toLocaleDateString('fr-FR')} par l'administration.`)

  return c.json({ success: true, expires_at: newExpiry.toISOString(), newRank })
})

// POST /admin/members/:id/activate-license — activer manuellement la licence d'un membre
// Paramètres body : { activation_date?: string (YYYY-MM-DD), reason?: string }
// Si activation_date absent → aujourd'hui. Durée toujours 365 jours depuis activation_date.
admin.post('/members/:id/activate-license', requirePermission('licenses.edit'), async (c) => {
  const adminId: string = (c.get('adminId' as any) as string) || 'admin-000000000000000000000000'
  const memberId = c.req.param('id')

  const body = await c.req.json().catch(() => ({})) as any
  const reason: string = body.reason || 'Activation manuelle par l\'administration'

  // Date d'activation : celle fournie (YYYY-MM-DD) ou aujourd'hui
  let startsAt: Date
  if (body.activation_date && /^\d{4}-\d{2}-\d{2}$/.test(body.activation_date)) {
    startsAt = new Date(body.activation_date + 'T00:00:00Z')
    if (isNaN(startsAt.getTime())) startsAt = new Date()
  } else {
    startsAt = new Date()
  }

  // Expiration = date d'activation + 365 jours (exactement)
  const expiresAt = new Date(startsAt)
  expiresAt.setFullYear(expiresAt.getFullYear() + 1)

  const member = await c.env.DB.prepare(`SELECT * FROM members WHERE id = ?`).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  // Passer les licences actives précédentes en 'superseded' (remplacées)
  await c.env.DB.prepare(
    `UPDATE finstrategia_licenses SET status = 'expired', updated_at = datetime('now')
     WHERE member_id = ? AND status = 'active'`
  ).bind(memberId).run()

  // Créer la nouvelle entrée de licence
  const licId = generateId()
  await c.env.DB.prepare(
    `INSERT INTO finstrategia_licenses
      (id, member_id, price_usd, status, starts_at, expires_at, validated_by, validated_at)
     VALUES (?, ?, 0, 'active', ?, ?, ?, datetime('now'))`
  ).bind(licId, memberId, startsAt.toISOString(), expiresAt.toISOString(), adminId).run()

  // Mettre à jour le membre
  await c.env.DB.prepare(
    `UPDATE members SET license_active = 1, license_expires_at = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(expiresAt.toISOString(), memberId).run()

  // Recalcul statut (AMI / Partenaire selon s'il a un package)
  await recalculateMemberStatus(c.env.DB, memberId)

  // Recalcul rang
  const newRank = await calculateMemberRank(c.env.DB, memberId)
  await c.env.DB.prepare(
    `UPDATE members SET current_rank = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(newRank, memberId).run()

  // Notification au membre
  await createNotification(c.env.DB, memberId, 'success', 'Licence activée',
    `Votre licence Finstrategia a été activée du ${startsAt.toLocaleDateString('fr-FR')} au ${expiresAt.toLocaleDateString('fr-FR')}.`)

  // Log admin
  await c.env.DB.prepare(
    `INSERT INTO admin_audit_log (id, admin_id, admin_email, action, description, metadata, created_at)
     VALUES (lower(hex(randomblob(16))), ?, ?, 'activate_license', ?, ?, datetime('now'))`
  ).bind(
    adminId,
    (c.get('adminEmail' as any) as string) || 'admin@system',
    `Activation manuelle licence — ${member.first_name} ${member.last_name} — du ${startsAt.toISOString().substring(0,10)} au ${expiresAt.toISOString().substring(0,10)}`,
    JSON.stringify({ memberId, activation_date: startsAt.toISOString().substring(0,10), expires_at: expiresAt.toISOString().substring(0,10), reason, license_id: licId })
  ).run()

  return c.json({
    success: true,
    activation_date: startsAt.toISOString().substring(0, 10),
    expires_at: expiresAt.toISOString().substring(0, 10),
    newRank,
    message: `Licence activée du ${startsAt.toLocaleDateString('fr-FR')} au ${expiresAt.toLocaleDateString('fr-FR')}`
  })
})

// POST /admin/members/:id/suspend-license — suspendre la licence d'un membre
admin.post('/members/:id/suspend-license', requirePermission('licenses.edit'), async (c) => {
  const memberId = c.req.param('id')
  const { reason } = await c.req.json()
  const member = await c.env.DB.prepare(`SELECT * FROM members WHERE id = ?`).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  // Mettre toutes les licences actives en statut 'suspended'
  await c.env.DB.prepare(
    `UPDATE finstrategia_licenses SET status = 'suspended', updated_at = datetime('now')
     WHERE member_id = ? AND status = 'active'`
  ).bind(memberId).run()

  await c.env.DB.prepare(
    `UPDATE members SET license_active = 0, updated_at = datetime('now') WHERE id = ?`
  ).bind(memberId).run()

  await recalculateMemberStatus(c.env.DB, memberId)
  const newRank = await calculateMemberRank(c.env.DB, memberId)
  await c.env.DB.prepare(
    `UPDATE members SET current_rank = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(newRank, memberId).run()

  await createNotification(c.env.DB, memberId, 'warning', 'Licence suspendue',
    `Votre licence Finstrategia a été suspendue. Raison : ${reason || 'Non précisée'}. Contactez le support.`)

  return c.json({ success: true, newRank })
})

// POST /admin/members/:id/recalculate-status — recalcul automatique du statut membre
admin.post('/members/:id/recalculate-status', requirePermission('members.edit'), async (c) => {
  const memberId = c.req.param('id')
  const member = await c.env.DB.prepare(`SELECT id, first_name, last_name FROM members WHERE id = ?`).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  await recalculateMemberStatus(c.env.DB, memberId)

  const updated = await c.env.DB.prepare(`SELECT member_status FROM members WHERE id = ?`).bind(memberId).first() as any
  return c.json({ success: true, new_status: updated?.member_status })
})

// POST /admin/members/:id/set-status — forçage manuel du statut membre
admin.post('/members/:id/set-status', requirePermission('members.edit'), async (c) => {
  const memberId = c.req.param('id')
  const member = await c.env.DB.prepare(`SELECT id FROM members WHERE id = ?`).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  const body = await c.req.json() as any
  const { status } = body
  const validStatuses = ['AMI', 'Partenaire', 'Client', 'Membre']
  if (!validStatuses.includes(status)) {
    return c.json({ error: `Statut invalide. Valeurs acceptées : ${validStatuses.join(', ')}` }, 400)
  }

  await c.env.DB.prepare(
    `UPDATE members SET member_status = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(status, memberId).run()

  return c.json({ success: true, new_status: status })
})

// GET /admin/config/admin-fee — lire la configuration des frais admin
admin.get('/config/admin-fee', requirePermission('admin_fee.view'), async (c) => {
  const [feeAmount, feeActive, feeMode, alertDays] = await Promise.all([
    c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_amount'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_active'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'admin_fee_mode'`).first() as any,
    c.env.DB.prepare(`SELECT value FROM compensation_config WHERE key = 'license_alert_days'`).first() as any,
  ])
  return c.json({
    admin_fee_amount:    feeAmount?.value  || '49',
    admin_fee_active:    feeActive?.value  || 'true',
    admin_fee_mode:      feeMode?.value    || 'once',
    license_alert_days:  alertDays?.value  || '7',
  })
})

// PUT /admin/config/admin-fee — modifier les frais d'administration
admin.put('/config/admin-fee', requirePermission('admin_fee.edit'), async (c) => {
  const { admin_fee_amount, admin_fee_active, admin_fee_mode } = await c.req.json()

  const updates: Array<{ key: string; value: string }> = []

  if (admin_fee_amount !== undefined) {
    const amount = parseFloat(admin_fee_amount)
    if (isNaN(amount) || amount < 0) return c.json({ error: 'Montant invalide' }, 400)
    updates.push({ key: 'admin_fee_amount', value: String(amount) })
  }
  if (admin_fee_active !== undefined) {
    updates.push({ key: 'admin_fee_active', value: admin_fee_active ? 'true' : 'false' })
  }
  if (admin_fee_mode !== undefined) {
    if (!['once', 'multiple'].includes(admin_fee_mode)) return c.json({ error: 'Mode invalide (once|multiple)' }, 400)
    updates.push({ key: 'admin_fee_mode', value: admin_fee_mode })
  }

  if (updates.length === 0) return c.json({ error: 'Aucune valeur à mettre à jour' }, 400)

  for (const { key, value } of updates) {
    await c.env.DB.prepare(
      `INSERT INTO compensation_config (id, key, value, updated_at)
       VALUES (lower(hex(randomblob(16))), ?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(key, value).run()
  }

  return c.json({ success: true })
})

// ══════════════════════════════════════════════════════════════════════════
// CONFIGURATION LICENCE FINSTRATEGIA
// ══════════════════════════════════════════════════════════════════════════

// GET /admin/config/license — lire la configuration complète de la licence
admin.get('/config/license', requirePermission('licenses.view'), async (c) => {
  const keys = [
    'license_price',
    'license_renewal_days',
    'license_alert_days',
    'license_renew_early_days',
    'license_right_bv',
    'license_commission_eligible',
    'license_rank_eligible',
    'license_fast_start',
    'license_valorisation',
    'license_leadership',
    'license_influence',
    'license_rayonnement',
    'license_sponsor_required',
  ]
  const rows = await c.env.DB.prepare(
    `SELECT key, value FROM compensation_config WHERE key IN (${keys.map(() => '?').join(',')})`
  ).bind(...keys).all()

  const cfg: Record<string, string> = {}
  for (const row of (rows.results as any[])) cfg[row.key] = row.value

  return c.json({
    license_price:            cfg.license_price            || '97',
    license_renewal_days:     cfg.license_renewal_days     || '365',
    license_alert_days:       cfg.license_alert_days       || '7',
    license_renew_early_days: cfg.license_renew_early_days || '30',
    license_right_bv:             cfg.license_right_bv             ?? 'true',
    license_commission_eligible:  cfg.license_commission_eligible  ?? 'true',
    license_rank_eligible:        cfg.license_rank_eligible        ?? 'true',
    license_fast_start:           cfg.license_fast_start           ?? 'true',
    license_valorisation:         cfg.license_valorisation         ?? 'true',
    license_leadership:           cfg.license_leadership           ?? 'true',
    license_influence:            cfg.license_influence            ?? 'true',
    license_rayonnement:          cfg.license_rayonnement          ?? 'true',
    license_sponsor_required:     cfg.license_sponsor_required     ?? 'true',
  })
})

// PUT /admin/config/license — modifier la configuration de la licence
admin.put('/config/license', requirePermission('licenses.edit'), async (c) => {
  const body = await c.req.json() as Record<string, any>

  const ALLOWED_KEYS: Record<string, 'number' | 'bool'> = {
    license_price:            'number',
    license_renewal_days:     'number',
    license_alert_days:       'number',
    license_renew_early_days: 'number',
    license_right_bv:             'bool',
    license_commission_eligible:  'bool',
    license_rank_eligible:        'bool',
    license_fast_start:           'bool',
    license_valorisation:         'bool',
    license_leadership:           'bool',
    license_influence:            'bool',
    license_rayonnement:          'bool',
    license_sponsor_required:     'bool',
  }

  const updates: Array<{ key: string; value: string }> = []

  for (const [key, type] of Object.entries(ALLOWED_KEYS)) {
    if (body[key] === undefined) continue
    if (type === 'number') {
      const v = parseFloat(body[key])
      if (isNaN(v) || v < 0) return c.json({ error: `Valeur invalide pour ${key}` }, 400)
      updates.push({ key, value: String(v) })
    } else {
      updates.push({ key, value: body[key] ? 'true' : 'false' })
    }
  }

  if (updates.length === 0) return c.json({ error: 'Aucune valeur à mettre à jour' }, 400)

  for (const { key, value } of updates) {
    await c.env.DB.prepare(
      `INSERT INTO compensation_config (id, key, value, updated_at)
       VALUES (lower(hex(randomblob(16))), ?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(key, value).run()
  }

  return c.json({ success: true })
})

// ══════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════
// PARAMÈTRES RETRAIT
// ══════════════════════════════════════════════════════════════════════════

// Clés gérées par ces routes (whitelist de sécurité)
const WITHDRAWAL_CONFIG_KEYS = [
  'withdrawal_allowed_days',
  'withdrawal_enabled',
  'withdrawal_disabled_msg',
  'withdrawal_fee_type',
  'withdrawal_fee_pct',
  'withdrawal_fee_fixed',
  'withdrawal_max_amount',
  'withdrawal_max_per_month',
  'withdrawal_processing_time',
  'withdrawal_kyc_min_level',
  'withdrawal_min_remaining_balance',
  'min_withdrawal',
]

// GET /admin/config/withdrawal — lire tous les paramètres retrait
admin.get('/config/withdrawal', requirePermission('settings.view'), async (c) => {
  const placeholders = WITHDRAWAL_CONFIG_KEYS.map(() => '?').join(',')
  const rows = await c.env.DB.prepare(
    `SELECT key, value, description FROM compensation_config WHERE key IN (${placeholders}) ORDER BY key`
  ).bind(...WITHDRAWAL_CONFIG_KEYS).all() as any

  // Construire un objet clé→{value, description}
  const config: Record<string, { value: string; description: string }> = {}
  for (const row of rows.results) {
    config[row.key] = { value: row.value, description: row.description || '' }
  }

  // Injecter les valeurs par défaut si une clé manque en DB
  const defaults: Record<string, string> = {
    withdrawal_allowed_days:         '3',
    withdrawal_enabled:              '1',
    withdrawal_disabled_msg:         'Les retraits sont temporairement suspendus.',
    withdrawal_fee_type:             'fixed',
    withdrawal_fee_pct:              '0',
    withdrawal_fee_fixed:            '0',
    withdrawal_max_amount:           '0',
    withdrawal_max_per_month:        '0',
    withdrawal_processing_time:      '24-48h',
    withdrawal_kyc_min_level:        '1',
    withdrawal_min_remaining_balance:'0',
    min_withdrawal:                  '50',
  }
  for (const key of WITHDRAWAL_CONFIG_KEYS) {
    if (!config[key]) config[key] = { value: defaults[key] ?? '', description: '' }
  }

  return c.json({ config })
})

// PUT /admin/config/withdrawal — modifier les paramètres retrait
admin.put('/config/withdrawal', requirePermission('settings.edit'), async (c) => {
  const updates = await c.req.json() as Record<string, string>

  // Filtrer uniquement les clés autorisées
  const filtered = Object.entries(updates).filter(([k]) => WITHDRAWAL_CONFIG_KEYS.includes(k))
  if (filtered.length === 0) return c.json({ error: 'Aucune clé valide fournie' }, 400)

  for (const [key, value] of filtered) {
    await c.env.DB.prepare(
      `INSERT INTO compensation_config (id, key, value, description)
       VALUES (lower(hex(randomblob(16))), ?, ?, '')
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`
    ).bind(key, String(value)).run()
  }

  // Log audit
  const adminId = (c.get('adminId' as any) as string) || 'admin-000000000000000000000000'
  const adminRow_ = await c.env.DB.prepare(`SELECT email FROM admin_users WHERE id = ?`).bind(adminId).first() as any
  try {
    await writeAuditLog(c.env.DB, {
      adminId,
      adminEmail: adminRow_?.email || 'admin@system',
      action: 'update_withdrawal_config',
      description: `Mise à jour config retrait : ${filtered.map(([k]) => k).join(', ')}`,
      metadata: { updates: filtered.map(([k, v]) => ({ key: k, value: v })) },
    })
  } catch (_) { /* non bloquant */ }

  return c.json({ success: true, updated: filtered.length })
})

// ══════════════════════════════════════════════════════════════════════════
// BRANDING & IDENTITÉ VISUELLE
// ══════════════════════════════════════════════════════════════════════════

// ── GET /admin/config/cc-withdrawal-fields — lire la config des champs du formulaire CC ──
admin.get('/config/cc-withdrawal-fields', requirePermission('settings.view'), async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT key, value FROM compensation_config
    WHERE key IN (
      'cc_withdrawal_min_amount','cc_withdrawal_max_amount',
      'cc_withdrawal_desc_min_chars','cc_withdrawal_processing_time','cc_withdrawal_max_pending',
      'cc_field_description_visible','cc_field_description_required','cc_field_description_label',
      'cc_field_justificatif_visible','cc_field_justificatif_required','cc_field_justificatif_label',
      'cc_field_custom1_visible','cc_field_custom1_required','cc_field_custom1_label',
      'cc_field_custom2_visible','cc_field_custom2_required','cc_field_custom2_label',
      'cc_field_custom3_visible','cc_field_custom3_required','cc_field_custom3_label'
    )`).all<{key:string; value:string}>()

  const m: Record<string, string> = {}
  for (const r of (rows.results || [])) m[r.key] = r.value

  const fv = (k: string, def = '1') => m[`cc_field_${k}_visible`]  ?? def
  const fr = (k: string, def = '0') => m[`cc_field_${k}_required`] ?? def
  const fl = (k: string, def: string) => m[`cc_field_${k}_label`]  ?? def

  return c.json({
    // Paramètres généraux
    min_amount:       m['cc_withdrawal_min_amount']       ?? '10',
    max_amount:       m['cc_withdrawal_max_amount']       ?? '5000',
    desc_min_chars:   m['cc_withdrawal_desc_min_chars']   ?? '10',
    processing_time:  m['cc_withdrawal_processing_time']  ?? '48h',
    max_pending:      m['cc_withdrawal_max_pending']      ?? '1',
    // Champs dynamiques
    fields: {
      description:  { visible: fv('description','1'), required: fr('description','1'), label: fl('description','Motif de la demande') },
      justificatif: { visible: fv('justificatif','1'), required: fr('justificatif','0'), label: fl('justificatif','Justificatif (PDF, JPG, PNG)') },
      custom1:      { visible: fv('custom1','0'), required: fr('custom1','0'), label: fl('custom1','Information complémentaire 1') },
      custom2:      { visible: fv('custom2','0'), required: fr('custom2','0'), label: fl('custom2','Information complémentaire 2') },
      custom3:      { visible: fv('custom3','0'), required: fr('custom3','0'), label: fl('custom3','Information complémentaire 3') },
    },
  })
})

// ── PUT /admin/config/cc-withdrawal-fields — mettre à jour la config des champs CC ──
admin.put('/config/cc-withdrawal-fields', requirePermission('settings.edit'), async (c) => {
  const body = await c.req.json() as Record<string, any>

  const upsert = async (key: string, value: string) => {
    await c.env.DB.prepare(
      `INSERT INTO compensation_config (id, key, value)
       VALUES (lower(hex(randomblob(16))), ?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`
    ).bind(key, value).run()
  }

  // Paramètres généraux
  const generalKeys: Record<string, string> = {
    min_amount:      'cc_withdrawal_min_amount',
    max_amount:      'cc_withdrawal_max_amount',
    desc_min_chars:  'cc_withdrawal_desc_min_chars',
    processing_time: 'cc_withdrawal_processing_time',
    max_pending:     'cc_withdrawal_max_pending',
  }
  for (const [field, key] of Object.entries(generalKeys)) {
    if (body[field] !== undefined) await upsert(key, String(body[field]))
  }

  // Champs dynamiques : description, justificatif, custom1, custom2, custom3
  const fieldNames = ['description', 'justificatif', 'custom1', 'custom2', 'custom3']
  for (const fname of fieldNames) {
    const f = body.fields?.[fname]
    if (!f) continue
    if (f.visible  !== undefined) await upsert(`cc_field_${fname}_visible`,  f.visible  ? '1' : '0')
    if (f.required !== undefined) await upsert(`cc_field_${fname}_required`, f.required ? '1' : '0')
    if (f.label    !== undefined) await upsert(`cc_field_${fname}_label`,    String(f.label))
  }

  return c.json({ success: true })
})

// GET /admin/config/branding — lire tous les paramètres branding
admin.get('/config/branding', requirePermission('settings.view'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT key, value FROM branding_config`
  ).all() as any

  const config: Record<string, string> = {}
  for (const row of (rows.results || [])) {
    config[row.key] = row.value ?? ''
  }

  return c.json({ config })
})

// PUT /admin/config/branding — mettre à jour les paramètres branding
admin.put('/config/branding', requirePermission('settings.edit'), async (c) => {
  const body = await c.req.json()

  const ALLOWED_KEYS = [
    'network_name', 'tagline',
    'logo_data_uri',
    'pdf_color_primary', 'pdf_color_dark', 'pdf_color_accent',
    'pdf_footer_text', 'pdf_report_title',
    'company_address', 'company_email', 'company_website',
    // Infos légales UK — Earnings & Documents
    'company_legal_name', 'company_registration_number', 'company_vat_number',
    'company_registered_address', 'company_city', 'company_postal_code',
    'company_country', 'company_phone', 'company_director', 'company_incorporation_date',
    // Noms commerciaux — factures & relevés
    'company_trade_name', 'company_member_title',
  ]

  const updates: Array<{ key: string; value: string }> = []

  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) {
      // Validation taille logo (max 2 Mo en base64 ≈ 2 097 152 chars)
      if (key === 'logo_data_uri' && body[key].length > 2_200_000) {
        return c.json({ error: 'Logo trop volumineux (max 2 Mo)' }, 400)
      }
      // Validation couleurs hex
      if (key.startsWith('pdf_color_') && body[key] && !/^#[0-9A-Fa-f]{6}$/.test(body[key])) {
        return c.json({ error: `Couleur invalide pour ${key} — format attendu : #RRGGBB` }, 400)
      }
      updates.push({ key, value: String(body[key]) })
    }
  }

  if (updates.length === 0) return c.json({ error: 'Aucune valeur à mettre à jour' }, 400)

  for (const { key, value } of updates) {
    await c.env.DB.prepare(
      `INSERT INTO branding_config (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(key, value).run()
  }

  return c.json({ success: true, updated: updates.map(u => u.key) })
})

// ════════════════════════════════════════════════════════════════════════
// CARTE DE MEMBRE — Endpoints admin
// ════════════════════════════════════════════════════════════════════════

// GET /admin/config/cards — Lire la configuration des cartes (design + mandat + physique)
admin.get('/config/cards', requirePermission('settings.view'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT key, value FROM branding_config
     WHERE key LIKE 'card_%' OR key LIKE 'mandate_%' OR key LIKE 'physical_card_%'`
  ).all() as any
  const cfg: Record<string, string> = {}
  for (const r of (rows.results || [])) cfg[r.key] = r.value ?? ''
  return c.json({ config: cfg })
})

// PUT /admin/config/cards — Mettre à jour la configuration des cartes
admin.put('/config/cards', requirePermission('settings.edit'), async (c) => {
  const body = await c.req.json()
  const CARD_KEYS = [
    'card_enabled', 'card_price', 'card_currency',
    'card_design_a_enabled', 'card_design_b_enabled',
    'card_design_a_color1', 'card_design_a_color2', 'card_design_a_color3',
    'card_member_title', 'card_legal_mention', 'card_profile_required',
    // Mandat Finestrategia
    'mandate_enabled', 'mandate_title', 'mandate_body',
    // Carte physique
    'physical_card_enabled', 'physical_card_price', 'physical_card_currency', 'physical_card_desc',
  ]
  const updates: { key: string; value: string }[] = []
  for (const key of CARD_KEYS) {
    if (body[key] !== undefined) {
      if (key.startsWith('card_design_a_color') && body[key] && !/^#[0-9A-Fa-f]{6}$/.test(body[key])) {
        return c.json({ error: `Couleur invalide pour ${key}` }, 400)
      }
      updates.push({ key, value: String(body[key]) })
    }
  }
  if (updates.length === 0) return c.json({ error: 'Aucune valeur à mettre à jour' }, 400)
  for (const { key, value } of updates) {
    await c.env.DB.prepare(
      `INSERT INTO branding_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(key, value).run()
  }
  return c.json({ success: true, updated: updates.map(u => u.key) })
})

// GET /admin/member-cards — Tableau de toutes les cartes émises
admin.get('/member-cards', requirePermission('members.view'), async (c) => {
  const { status, page } = c.req.query()
  const limit = 50
  const offset = (parseInt(page || '1') - 1) * limit

  let whereClause = ''
  const binds: any[] = []
  if (status && ['active', 'revoked'].includes(status)) {
    whereClause = 'WHERE mc.status = ?'
    binds.push(status)
  }

  const rows = await c.env.DB.prepare(
    `SELECT mc.id, mc.design, mc.status, mc.token, mc.issued_at, mc.revoked_at,
            m.id as member_id, m.first_name, m.last_name, m.unique_id, m.email,
            m.license_active, m.city
     FROM member_cards mc
     JOIN members m ON m.id = mc.member_id
     ${whereClause}
     ORDER BY mc.issued_at DESC LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all()

  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM member_cards mc ${whereClause}`
  ).bind(...binds).first() as any

  return c.json({
    cards: rows.results || [],
    total: countRow?.total || 0,
    page: parseInt(page || '1'),
    limit,
  })
})

// DELETE /admin/member-cards/:id — Révoquer une carte
admin.delete('/member-cards/:id', requirePermission('members.edit'), async (c) => {
  const id = c.req.param('id')
  const card = await c.env.DB.prepare(
    `SELECT id, status FROM member_cards WHERE id=?`
  ).bind(id).first() as any
  if (!card) return c.json({ error: 'Carte introuvable' }, 404)
  if (card.status === 'revoked') return c.json({ error: 'Carte déjà révoquée' }, 400)
  await c.env.DB.prepare(
    `UPDATE member_cards SET status='revoked', revoked_at=datetime('now') WHERE id=?`
  ).bind(id).run()
  return c.json({ success: true })
})

// ── COMMANDES CARTES PHYSIQUES ────────────────────────────────
// GET /admin/physical-card-orders
admin.get('/physical-card-orders', requirePermission('members.view'), async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      `SELECT pco.id, pco.member_id, pco.status, pco.amount, pco.currency,
              pco.payment_method, pco.shipping_address, pco.tracking_number,
              pco.created_at, pco.updated_at,
              m.first_name || ' ' || m.last_name AS member_name,
              m.email AS member_email
       FROM physical_card_orders pco
       LEFT JOIN members m ON m.id = pco.member_id
       ORDER BY pco.created_at DESC
       LIMIT 200`
    ).all()
    const orders = (rows.results || []).map((o: any) => ({
      ...o,
      shipping_address: (() => { try { return JSON.parse(o.shipping_address || '{}') } catch { return {} } })()
    }))
    return c.json({ orders, total: orders.length })
  } catch (err: any) {
    // Table pas encore créée — retourner liste vide
    return c.json({ orders: [], total: 0 })
  }
})

// PUT /admin/physical-card-orders/:id/status
admin.put('/physical-card-orders/:id/status', requirePermission('members.edit'), async (c) => {
  const id = parseInt(c.req.param('id'))
  const { status, tracking_number } = await c.req.json()
  const VALID_STATUSES = ['pending', 'paid', 'proof_submitted', 'processing', 'shipped', 'delivered', 'cancelled']
  if (!VALID_STATUSES.includes(status)) {
    return c.json({ error: 'Statut invalide' }, 400)
  }
  try {
    await c.env.DB.prepare(
      `UPDATE physical_card_orders
       SET status = ?, tracking_number = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(status, tracking_number || null, id).run()
    return c.json({ success: true, id, status })
  } catch (err: any) {
    return c.json({ error: err?.message || 'Erreur mise à jour' }, 500)
  }
})

// ── CONFIG FORMULAIRE D'INSCRIPTION ────────────────────────────
// GET /admin/settings/reg-required-fields — Lire la config champs + type formulaire
admin.get('/settings/reg-required-fields', requirePermission('settings.view'), async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      `SELECT key, value FROM system_config WHERE key IN ('reg_required_fields','reg_form_type')`
    ).all() as any
    const map: Record<string, string> = {}
    for (const r of (rows.results || [])) map[r.key] = r.value
    const fields: string[] = map.reg_required_fields
      ? JSON.parse(map.reg_required_fields)
      : []
    const form_type: string = map.reg_form_type || 'simple'
    return c.json({ fields, form_type })
  } catch (e: any) {
    return c.json({ fields: [], form_type: 'simple' })
  }
})

// POST /admin/settings/reg-required-fields — Sauvegarder champs obligatoires + type formulaire
// Body: { fields: string[], form_type: 'simple'|'multistep' }
admin.post('/settings/reg-required-fields', requirePermission('settings.edit'), async (c) => {
  try {
    const body = await c.req.json() as { fields?: string[]; form_type?: string }
    const ALLOWED_FIELDS = ['phone', 'country', 'birth_date', 'nationality', 'address', 'postal_code', 'city']
    const fields: string[] = Array.isArray(body.fields)
      ? body.fields.filter((f: string) => ALLOWED_FIELDS.includes(f))
      : []
    const form_type = (body.form_type === 'multistep') ? 'multistep' : 'simple'

    // Sauvegarder les deux clés dans system_config
    await c.env.DB.prepare(
      `INSERT INTO system_config (key, value, updated_at) VALUES ('reg_required_fields', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind(JSON.stringify(fields)).run()

    await c.env.DB.prepare(
      `INSERT INTO system_config (key, value, updated_at) VALUES ('reg_form_type', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind(form_type).run()

    return c.json({ success: true, fields, form_type })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ── RESET DONNÉES DE TEST ──────────────────────────────────────
// POST /admin/reset-test-data — vide toutes les données membres (sauf ROOT)
// [!] RÉSERVÉ AU DÉVELOPPEMENT — à désactiver en production
admin.post('/reset-test-data', requirePermission('settings.edit'), async (c) => {
  const db = c.env.DB

  try {
    // 1. Récupérer tous les membres non-ROOT
    const members = await db.prepare(
      `SELECT id FROM members WHERE id != 'root-system-000000000000000000000000'`
    ).all() as any
    const memberIds = (members.results || []).map((m: any) => m.id)

    // 2. Nullifier les FK circulaires sur tous les membres (arbre binaire auto-référentiel)
    //    ROOT d'abord (ses enfants), puis les membres eux-mêmes
    await db.prepare(
      `UPDATE members SET binary_left_id = NULL, binary_right_id = NULL
       WHERE id = 'root-system-000000000000000000000000'`
    ).run()

    if (memberIds.length > 0) {
      // Nullifier par batch de 10 pour éviter les timeouts
      for (const mid of memberIds) {
        await db.prepare(
          `UPDATE members SET binary_left_id = NULL, binary_right_id = NULL,
           binary_parent_id = NULL, sponsor_id = NULL WHERE id = ?`
        ).bind(mid).run()
      }
    }

    // 3. Supprimer les tables enfants dans l'ordre correct
    const tablesToClear = [
      'bv_logs', 'bv_queue', 'rank_queue', 'commissions', 'commission_queue',
      'credit_croissance', 'reserve_strategique', 'finstrategia_licenses',
      'monthly_validations', 'notifications', 'withdrawals', 'checkout_orders',
      'package_orders', 'holding_tank'
    ]

    for (const tbl of tablesToClear) {
      await db.prepare(`DELETE FROM ${tbl}`).run()
    }

    // 4. Supprimer wallets des membres test
    await db.prepare(
      `DELETE FROM wallets WHERE member_id != 'root-system-000000000000000000000000'`
    ).run()

    // 5. Supprimer les membres test
    await db.prepare(
      `DELETE FROM members WHERE id != 'root-system-000000000000000000000000'`
    ).run()

    // 6. Remettre ROOT à zéro
    await db.prepare(
      `UPDATE members SET
        left_bv_monthly = 0, right_bv_monthly = 0,
        left_bv_total = 0, right_bv_total = 0,
        personal_bv_monthly = 0, personal_bv_total = 0,
        fast_start_bv = 0, wallet_balance = 0,
        binary_left_id = NULL, binary_right_id = NULL,
        updated_at = datetime('now')
       WHERE id = 'root-system-000000000000000000000000'`
    ).run()

    await db.prepare(
      `UPDATE wallets SET balance = 0, total_earned = 0, total_withdrawn = 0, pending_balance = 0
       WHERE member_id = 'root-system-000000000000000000000000'`
    ).run()

    return c.json({
      success: true,
      message: `Reset complet effectué. ${memberIds.length} membre(s) supprimé(s). BASE PROPRE — ROOT seul.`
    })

  } catch (err: any) {
    console.error('[reset-test-data] Erreur:', err?.message || err)
    return c.json({ error: `Erreur lors du reset : ${err?.message || 'Erreur inconnue'}` }, 500)
  }
})

// ── ADMIN DREAMILES ─────────────────────────────────────────

// GET /admin/dreamiles — Vue globale de tous les wallets Dreamiles
admin.get('/dreamiles', requirePermission('dreamiles.view'), async (c) => {
  const { page='1', per_page='25', search } = c.req.query()
  const limit = parseInt(per_page)
  const offset = (parseInt(page)-1)*limit
  let where = 'WHERE 1=1'; const params: any[] = []
  if (search) {
    where += ` AND (m.first_name LIKE ? OR m.last_name LIKE ? OR m.unique_id LIKE ?)`
    const s = `%${search}%`; params.push(s, s, s)
  }
  const [rows, total] = await Promise.all([
    c.env.DB.prepare(
      `SELECT dw.*, m.unique_id, m.first_name, m.last_name, m.email
       FROM dreamiles_wallet dw
       JOIN members m ON m.id = dw.member_id
       ${where} ORDER BY dw.dreamiles DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM dreamiles_wallet dw JOIN members m ON m.id = dw.member_id ${where}`
    ).bind(...params).first() as any
  ])
  return c.json({ wallets: rows.results, total: total?.cnt || 0 })
})

// POST /admin/dreamiles/credit — Créditer manuellement des Dreamiles à un membre
admin.post('/dreamiles/credit', requirePermission('dreamiles.edit'), async (c) => {
  const { member_id, dreamiles, description } = await c.req.json()
  if (!member_id || !dreamiles || dreamiles <= 0)
    return c.json({ error: 'member_id et dreamiles requis' }, 400)

  // Créer le wallet si inexistant
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO dreamiles_wallet (id, member_id) VALUES (lower(hex(randomblob(16))), ?)`
  ).bind(member_id).run()

  // Créditer
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 24)

  await c.env.DB.prepare(
    `UPDATE dreamiles_wallet SET dreamiles = dreamiles + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE member_id = ?`
  ).bind(dreamiles, dreamiles, member_id).run()

  await c.env.DB.prepare(
    `INSERT INTO dreamiles_transactions (id, member_id, type, dreamiles, usd_amount, description, expires_at, status)
     VALUES (lower(hex(randomblob(16))), ?, 'credit', ?, ?, ?, ?, 'completed')`
  ).bind(member_id, dreamiles, dreamiles, description || 'Crédit administrateur', expiresAt.toISOString()).run()

  return c.json({ success: true })
})

// ============================================================
// MODULE IMPERSONATION + WALLET ADMIN + AUDIT LOG
// ============================================================

// ── HELPER : écrire dans le journal d'audit ─────────────────
async function writeAuditLog(db: D1Database, params: {
  adminId: string, adminEmail: string,
  memberId?: string, memberUniqueId?: string,
  action: string, walletType?: string,
  amount?: number, description: string, metadata?: object
}) {
  const mauritiusNow = new Date(Date.now() + 4 * 60 * 60 * 1000)
    .toISOString().replace('T', ' ').substring(0, 19)
  await db.prepare(
    `INSERT INTO admin_audit_log
     (id, admin_id, admin_email, member_id, member_unique_id,
      action, wallet_type, amount, description, metadata, created_at)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    params.adminId, params.adminEmail,
    params.memberId || null, params.memberUniqueId || null,
    params.action, params.walletType || null,
    params.amount ?? null, params.description,
    params.metadata ? JSON.stringify(params.metadata) : null,
    mauritiusNow
  ).run()
}

// ── GET /admin/members/:id/impersonate ──────────────────────
// Génère un token JWT temporaire (2h) au nom du membre
// pour que l'admin puisse voir le backoffice comme le membre
admin.get('/members/:id/impersonate', requirePermission('members.impersonate'), async (c) => {
  const adminId: string = (c.get('adminId' as any) as string) || 'admin-000000000000000000000000'
  const memberId   = c.req.param('id')

  const member = await c.env.DB.prepare(
    `SELECT id, email, unique_id, first_name, last_name FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  const admin_ = await c.env.DB.prepare(
    `SELECT email FROM admin_users WHERE id = ?`
  ).bind(adminId).first() as any

  // Créer un JWT de courte durée (2h) avec flag impersonation
  const { createJWT } = await import('../lib/auth.js')
  const token = await createJWT({
    sub: member.id,
    email: member.email,
    role: 'member',
    // @ts-ignore — champ custom
    impersonated_by: adminId,
    impersonated_by_email: admin_?.email || 'admin',
    impersonated_name: `${member.first_name} ${member.last_name}`,
    impersonated_uid: member.unique_id,
  }, c.env.JWT_SECRET, 0.083) // 0.083 jours = 2 heures

  // Audit
  await writeAuditLog(c.env.DB, {
    adminId, adminEmail: admin_?.email || 'admin',
    memberId: member.id, memberUniqueId: member.unique_id,
    action: 'impersonate',
    description: `Impersonation du compte de ${member.first_name} ${member.last_name} (${member.unique_id})`
  })

  return c.json({
    token,
    member: { id: member.id, name: `${member.first_name} ${member.last_name}`, unique_id: member.unique_id, email: member.email }
  })
})

// ── GET /admin/members/:id/wallet-full ─────────────────────
// Retourne tous les wallets + entrées pending d'un membre
admin.get('/members/:id/wallet-full', requirePermission('wallets.view'), async (c) => {
  const memberId = c.req.param('id')

  const [member, wallet, pendingEntries, ccRows, rsRows, drmWallet, txRows] = await Promise.all([
    c.env.DB.prepare(`SELECT id, first_name, last_name, unique_id, email, current_rank FROM members WHERE id = ?`).bind(memberId).first() as any,
    c.env.DB.prepare(`SELECT * FROM wallets WHERE member_id = ?`).bind(memberId).first() as any,
    c.env.DB.prepare(`SELECT * FROM pending_wallet_entries WHERE member_id = ? ORDER BY created_at DESC`).bind(memberId).all(),
    c.env.DB.prepare(`SELECT * FROM credit_croissance WHERE member_id = ? ORDER BY created_at DESC LIMIT 20`).bind(memberId).all(),
    c.env.DB.prepare(`SELECT * FROM reserve_strategique WHERE member_id = ? ORDER BY created_at DESC LIMIT 20`).bind(memberId).all(),
    c.env.DB.prepare(`SELECT * FROM dreamiles_wallet WHERE member_id = ?`).bind(memberId).first() as any,
    c.env.DB.prepare(`SELECT * FROM wallet_transactions WHERE member_id = ? ORDER BY created_at DESC LIMIT 50`).bind(memberId).all(),
  ])

  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  return c.json({
    member,
    wallet,
    pending_entries: pendingEntries.results || [],
    credit_croissance: ccRows.results || [],
    reserve_strategique: rsRows.results || [],
    dreamiles_wallet: drmWallet,
    transactions: txRows.results || [],
  })
})

// ── POST /admin/members/:id/wallet-operation ────────────────
// Effectue une opération manuelle sur n'importe quel wallet
// body: { wallet_type, operation, amount, description, entry_id?, days_paid? }
admin.post('/members/:id/wallet-operation', requirePermission('wallets.edit'), async (c) => {
  const adminId: string = (c.get('adminId' as any) as string) || 'admin-000000000000000000000000'
  const memberId = c.req.param('id')
  const body     = await c.req.json()
  const { wallet_type, operation, amount, description, entry_id, days_paid, eligible_date } = body

  if (!wallet_type || !operation || !description)
    return c.json({ error: 'wallet_type, operation et description obligatoires' }, 400)

  const admin_ = await c.env.DB.prepare(`SELECT email FROM admin_users WHERE id = ?`).bind(adminId).first() as any
  const member = await c.env.DB.prepare(`SELECT id, first_name, last_name, unique_id FROM members WHERE id = ?`).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  const mauritiusNow = new Date(Date.now() + 4 * 60 * 60 * 1000)
    .toISOString().replace('T', ' ').substring(0, 19)

  // ── Portefeuille Principal ──────────────────────────────
  if (wallet_type === 'principal') {
    if (operation === 'credit') {
      if (!amount || amount <= 0) return c.json({ error: 'Montant invalide' }, 400)
      const w = await c.env.DB.prepare(`SELECT balance FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
      const balBefore = w?.balance ?? 0
      await c.env.DB.prepare(`UPDATE wallets SET balance = balance + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE member_id = ?`).bind(amount, amount, memberId).run()
      await c.env.DB.prepare(`UPDATE members SET wallet_balance = wallet_balance + ?, updated_at = datetime('now') WHERE id = ?`).bind(amount, memberId).run()
      await c.env.DB.prepare(`INSERT INTO wallet_transactions (id, member_id, wallet_type, transaction_type, amount, balance_before, balance_after, description, created_at) VALUES (lower(hex(randomblob(16))), ?, 'principal', 'admin_credit', ?, ?, ?, ?, ?)`).bind(memberId, amount, balBefore, balBefore + amount, `[Admin] ${description}`, mauritiusNow).run()

    } else if (operation === 'debit') {
      if (!amount || amount <= 0) return c.json({ error: 'Montant invalide' }, 400)
      const w = await c.env.DB.prepare(`SELECT balance FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
      const balBefore = w?.balance ?? 0
      await c.env.DB.prepare(`UPDATE wallets SET balance = MAX(0, balance - ?), updated_at = datetime('now') WHERE member_id = ?`).bind(amount, memberId).run()
      await c.env.DB.prepare(`UPDATE members SET wallet_balance = MAX(0, wallet_balance - ?), updated_at = datetime('now') WHERE id = ?`).bind(amount, memberId).run()
      await c.env.DB.prepare(`INSERT INTO wallet_transactions (id, member_id, wallet_type, transaction_type, amount, balance_before, balance_after, description, created_at) VALUES (lower(hex(randomblob(16))), ?, 'principal', 'admin_debit', ?, ?, ?, ?, ?)`).bind(memberId, -amount, balBefore, Math.max(0, balBefore - amount), `[Admin] ${description}`, mauritiusNow).run()

    } else if (operation === 'force_balance') {
      if (amount == null || amount < 0) return c.json({ error: 'Montant invalide' }, 400)
      const w = await c.env.DB.prepare(`SELECT balance FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
      const balBefore = w?.balance ?? 0
      const diff = amount - balBefore
      await c.env.DB.prepare(`UPDATE wallets SET balance = ?, updated_at = datetime('now') WHERE member_id = ?`).bind(amount, memberId).run()
      await c.env.DB.prepare(`UPDATE members SET wallet_balance = ?, updated_at = datetime('now') WHERE id = ?`).bind(amount, memberId).run()
      await c.env.DB.prepare(`INSERT INTO wallet_transactions (id, member_id, wallet_type, transaction_type, amount, balance_before, balance_after, description, created_at) VALUES (lower(hex(randomblob(16))), ?, 'principal', 'admin_force', ?, ?, ?, ?, ?)`).bind(memberId, diff, balBefore, amount, `[Admin Force] ${description}`, mauritiusNow).run()
    } else {
      return c.json({ error: 'Opération invalide pour ce wallet' }, 400)
    }
  }

  // ── Wallet en Attente (Pending) ────────────────────────
  else if (wallet_type === 'pending') {
    if (operation === 'credit') {
      if (!amount || amount <= 0) return c.json({ error: 'Montant invalide' }, 400)
      const w = await c.env.DB.prepare(`SELECT pending_balance FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
      const pendBefore = w?.pending_balance ?? 0
      await c.env.DB.prepare(`UPDATE wallets SET pending_balance = pending_balance + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE member_id = ?`).bind(amount, amount, memberId).run()
      await c.env.DB.prepare(`INSERT INTO wallet_transactions (id, member_id, wallet_type, transaction_type, amount, balance_before, balance_after, description, created_at) VALUES (lower(hex(randomblob(16))), ?, 'pending', 'admin_credit', ?, ?, ?, ?, ?)`).bind(memberId, amount, pendBefore, pendBefore + amount, `[Admin] ${description}`, mauritiusNow).run()

    } else if (operation === 'debit') {
      if (!amount || amount <= 0) return c.json({ error: 'Montant invalide' }, 400)
      const w = await c.env.DB.prepare(`SELECT pending_balance FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
      const pendBefore = w?.pending_balance ?? 0
      await c.env.DB.prepare(`UPDATE wallets SET pending_balance = MAX(0, pending_balance - ?), updated_at = datetime('now') WHERE member_id = ?`).bind(amount, memberId).run()
      await c.env.DB.prepare(`INSERT INTO wallet_transactions (id, member_id, wallet_type, transaction_type, amount, balance_before, balance_after, description, created_at) VALUES (lower(hex(randomblob(16))), ?, 'pending', 'admin_debit', ?, ?, ?, ?, ?)`).bind(memberId, -amount, pendBefore, Math.max(0, pendBefore - amount), `[Admin] ${description}`, mauritiusNow).run()

    } else if (operation === 'release') {
      // Libération : transfert pending → principal
      if (!amount || amount <= 0) return c.json({ error: 'Montant invalide' }, 400)
      const w = await c.env.DB.prepare(`SELECT balance, pending_balance FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
      const balBefore  = w?.balance ?? 0
      const pendBefore = w?.pending_balance ?? 0
      const actualRelease = Math.min(amount, pendBefore)
      if (actualRelease <= 0) return c.json({ error: 'Solde pending insuffisant' }, 400)
      await c.env.DB.prepare(`UPDATE wallets SET pending_balance = MAX(0, pending_balance - ?), balance = balance + ?, updated_at = datetime('now') WHERE member_id = ?`).bind(actualRelease, actualRelease, memberId).run()
      await c.env.DB.prepare(`UPDATE members SET wallet_balance = wallet_balance + ?, updated_at = datetime('now') WHERE id = ?`).bind(actualRelease, memberId).run()
      // Mouvement sortie pending
      await c.env.DB.prepare(`INSERT INTO wallet_transactions (id, member_id, wallet_type, transaction_type, amount, balance_before, balance_after, description, created_at) VALUES (lower(hex(randomblob(16))), ?, 'pending', 'admin_release', ?, ?, ?, ?, ?)`).bind(memberId, -actualRelease, pendBefore, Math.max(0, pendBefore - actualRelease), `[Admin Libération] ${description}`, mauritiusNow).run()
      // Mouvement entrée principal
      await c.env.DB.prepare(`INSERT INTO wallet_transactions (id, member_id, wallet_type, transaction_type, amount, balance_before, balance_after, description, created_at) VALUES (lower(hex(randomblob(16))), ?, 'principal', 'admin_release', ?, ?, ?, ?, ?)`).bind(memberId, actualRelease, balBefore, balBefore + actualRelease, `[Admin Libération] ${description}`, mauritiusNow).run()

    } else if (operation === 'edit_entry' && entry_id) {
      // Modifier une entrée pending (days_paid, eligible_date)
      const updates: string[] = []
      const vals: any[] = []
      if (days_paid != null) { updates.push('days_paid = ?'); vals.push(days_paid) }
      if (eligible_date)     { updates.push('eligible_date = ?'); vals.push(eligible_date) }
      if (updates.length === 0) return c.json({ error: 'Rien à modifier' }, 400)
      updates.push("updated_at = datetime('now')")
      vals.push(entry_id)
      await c.env.DB.prepare(`UPDATE pending_wallet_entries SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run()
    } else {
      return c.json({ error: 'Opération invalide pour ce wallet' }, 400)
    }
  }

  // ── Crédit de Croissance ───────────────────────────────
  else if (wallet_type === 'cc') {
    if (operation === 'credit') {
      if (!amount || amount <= 0) return c.json({ error: 'Montant invalide' }, 400)
      const period = new Date().toISOString().substring(0, 7)
      await c.env.DB.prepare(`INSERT INTO credit_croissance (id, member_id, amount, period, source_commission_id, status, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, 'admin', 'available', ?)`).bind(memberId, amount, period, mauritiusNow).run()
      await c.env.DB.prepare(`UPDATE members SET credit_croissance = credit_croissance + ? WHERE id = ?`).bind(amount, memberId).run()

    } else if (operation === 'unlock') {
      // Débloquer une entrée CC
      if (!entry_id) return c.json({ error: 'entry_id requis' }, 400)
      await c.env.DB.prepare(`UPDATE credit_croissance SET status = 'available', updated_at = datetime('now') WHERE id = ? AND member_id = ?`).bind(entry_id, memberId).run()

    } else if (operation === 'cancel') {
      if (!entry_id) return c.json({ error: 'entry_id requis' }, 400)
      const entry = await c.env.DB.prepare(`SELECT amount FROM credit_croissance WHERE id = ? AND member_id = ?`).bind(entry_id, memberId).first() as any
      await c.env.DB.prepare(`UPDATE credit_croissance SET status = 'cancelled', updated_at = datetime('now') WHERE id = ? AND member_id = ?`).bind(entry_id, memberId).run()
      if (entry) await c.env.DB.prepare(`UPDATE members SET credit_croissance = MAX(0, credit_croissance - ?) WHERE id = ?`).bind(entry.amount, memberId).run()
    } else {
      return c.json({ error: 'Opération invalide pour CC' }, 400)
    }
  }

  // ── Réserve Stratégique ────────────────────────────────
  else if (wallet_type === 'rs') {
    if (operation === 'credit') {
      if (!amount || amount <= 0) return c.json({ error: 'Montant invalide' }, 400)
      const period = new Date().toISOString().substring(0, 7)
      const lockedUntil = new Date(); lockedUntil.setFullYear(lockedUntil.getFullYear() + 3)
      await c.env.DB.prepare(`INSERT INTO reserve_strategique (id, member_id, amount, period, source_commission_id, abondement_rate, status, locked_until, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, 'admin', 0, 'locked', ?, ?)`).bind(memberId, amount, period, lockedUntil.toISOString().substring(0, 10), mauritiusNow).run()
      await c.env.DB.prepare(`UPDATE members SET reserve_strategique = reserve_strategique + ? WHERE id = ?`).bind(amount, memberId).run()

    } else if (operation === 'unlock') {
      if (!entry_id) return c.json({ error: 'entry_id requis' }, 400)
      const entry = await c.env.DB.prepare(`SELECT amount FROM reserve_strategique WHERE id = ? AND member_id = ?`).bind(entry_id, memberId).first() as any
      await c.env.DB.prepare(`UPDATE reserve_strategique SET status = 'unlocked', unlocked_at = datetime('now') WHERE id = ? AND member_id = ?`).bind(entry_id, memberId).run()
      if (entry) {
        await c.env.DB.prepare(`UPDATE wallets SET balance = balance + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE member_id = ?`).bind(entry.amount, entry.amount, memberId).run()
        await c.env.DB.prepare(`UPDATE members SET wallet_balance = wallet_balance + ?, updated_at = datetime('now') WHERE id = ?`).bind(entry.amount, memberId).run()
      }

    } else if (operation === 'cancel') {
      if (!entry_id) return c.json({ error: 'entry_id requis' }, 400)
      const entry = await c.env.DB.prepare(`SELECT amount FROM reserve_strategique WHERE id = ? AND member_id = ?`).bind(entry_id, memberId).first() as any
      await c.env.DB.prepare(`UPDATE reserve_strategique SET status = 'cancelled' WHERE id = ? AND member_id = ?`).bind(entry_id, memberId).run()
      if (entry) await c.env.DB.prepare(`UPDATE members SET reserve_strategique = MAX(0, reserve_strategique - ?) WHERE id = ?`).bind(entry.amount, memberId).run()
    } else {
      return c.json({ error: 'Opération invalide pour RS' }, 400)
    }
  }

  // ── Wallet Luxia (Dreamiles) ───────────────────────────
  else if (wallet_type === 'luxia') {
    await c.env.DB.prepare(`INSERT OR IGNORE INTO dreamiles_wallet (id, member_id) VALUES (lower(hex(randomblob(16))), ?)`).bind(memberId).run()

    if (operation === 'credit') {
      if (!amount || amount <= 0) return c.json({ error: 'Montant invalide' }, 400)
      const expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + 24)
      await c.env.DB.prepare(`UPDATE dreamiles_wallet SET dreamiles = dreamiles + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE member_id = ?`).bind(amount, amount, memberId).run()
      await c.env.DB.prepare(`INSERT INTO dreamiles_transactions (id, member_id, type, dreamiles, usd_amount, description, expires_at, status) VALUES (lower(hex(randomblob(16))), ?, 'credit', ?, ?, ?, ?, 'completed')`).bind(memberId, amount, amount, `[Admin] ${description}`, expiresAt.toISOString()).run()

    } else if (operation === 'debit') {
      if (!amount || amount <= 0) return c.json({ error: 'Montant invalide' }, 400)
      await c.env.DB.prepare(`UPDATE dreamiles_wallet SET dreamiles = MAX(0, dreamiles - ?), updated_at = datetime('now') WHERE member_id = ?`).bind(amount, memberId).run()
      await c.env.DB.prepare(`INSERT INTO dreamiles_transactions (id, member_id, type, dreamiles, usd_amount, description, status) VALUES (lower(hex(randomblob(16))), ?, 'withdrawal', ?, ?, ?, 'completed')`).bind(memberId, -amount, amount, `[Admin] ${description}`).run()

    } else if (operation === 'convert') {
      // Convertir Dreamiles → $ principal
      if (!amount || amount <= 0) return c.json({ error: 'Montant invalide' }, 400)
      const dw = await c.env.DB.prepare(`SELECT dreamiles FROM dreamiles_wallet WHERE member_id = ?`).bind(memberId).first() as any
      const available = dw?.dreamiles ?? 0
      const actualConvert = Math.min(amount, available)
      if (actualConvert <= 0) return c.json({ error: 'Solde Dreamiles insuffisant' }, 400)
      await c.env.DB.prepare(`UPDATE dreamiles_wallet SET dreamiles = MAX(0, dreamiles - ?), total_converted = total_converted + ?, updated_at = datetime('now') WHERE member_id = ?`).bind(actualConvert, actualConvert, memberId).run()
      const w = await c.env.DB.prepare(`SELECT balance FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
      const balBefore = w?.balance ?? 0
      await c.env.DB.prepare(`UPDATE wallets SET balance = balance + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE member_id = ?`).bind(actualConvert, actualConvert, memberId).run()
      await c.env.DB.prepare(`UPDATE members SET wallet_balance = wallet_balance + ?, updated_at = datetime('now') WHERE id = ?`).bind(actualConvert, memberId).run()
      await c.env.DB.prepare(`INSERT INTO wallet_transactions (id, member_id, wallet_type, transaction_type, amount, balance_before, balance_after, description, created_at) VALUES (lower(hex(randomblob(16))), ?, 'principal', 'dreamiles_conversion', ?, ?, ?, ?, ?)`).bind(memberId, actualConvert, balBefore, balBefore + actualConvert, `[Admin] Conversion Dreamiles → $ : ${description}`, mauritiusNow).run()
    } else {
      return c.json({ error: 'Opération invalide pour Luxia' }, 400)
    }
  } else {
    return c.json({ error: 'wallet_type invalide' }, 400)
  }

  // Journal d'audit
  await writeAuditLog(c.env.DB, {
    adminId, adminEmail: admin_?.email || 'admin',
    memberId: member.id, memberUniqueId: member.unique_id,
    action: `wallet_${operation}`, walletType: wallet_type,
    amount: amount ?? 0, description,
    metadata: { entry_id, days_paid, eligible_date }
  })

  return c.json({ success: true })
})

// ── GET /admin/audit-log ─────────────────────────────────────
admin.get('/audit-log', requirePermission('audit.view'), async (c) => {
  const { page = '1', per_page = '50', member_id, action } = c.req.query()
  const limit  = parseInt(per_page)
  const offset = (parseInt(page) - 1) * limit

  let where = 'WHERE 1=1'
  const binds: any[] = []
  if (member_id) { where += ' AND member_id = ?'; binds.push(member_id) }
  if (action)    { where += ' AND action LIKE ?';  binds.push(`%${action}%`) }

  const [rows, total] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM admin_audit_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...binds, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM admin_audit_log ${where}`).bind(...binds).first() as any,
  ])

  return c.json({ logs: rows.results || [], total: total?.cnt || 0 })
})

// ── GET /api/admin/members/:id/binary-slots ─────────────────────────────────
// Retourne l'état des slots L et R d'un membre (pour l'outil de nettoyage admin)
admin.get('/members/:id/binary-slots', requirePermission('tree.view'), async (c) => {
  const db = c.env.DB
  const memberId = c.req.param('id')

  const member = await db.prepare(
    `SELECT id, unique_id, first_name, last_name, binary_left_id, binary_right_id FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  const memberFullName = `${member.first_name} ${member.last_name}`.trim()

  // Récupérer les infos des enfants actuels (si présents)
  const childLeft = member.binary_left_id
    ? await db.prepare(`SELECT id, unique_id, first_name, last_name, in_holding_tank FROM members WHERE id = ?`)
        .bind(member.binary_left_id).first() as any
    : null

  const childRight = member.binary_right_id
    ? await db.prepare(`SELECT id, unique_id, first_name, last_name, in_holding_tank FROM members WHERE id = ?`)
        .bind(member.binary_right_id).first() as any
    : null

  // Normaliser les enfants avec un champ full_name synthétique
  const normChild = (c: any) => c ? { ...c, full_name: `${c.first_name} ${c.last_name}`.trim() } : null

  // Vérifier la cohérence (désync possible)
  const childLeftByParent = await db.prepare(
    `SELECT id, unique_id, first_name, last_name FROM members WHERE binary_parent_id = ? AND binary_position = 'L' AND in_holding_tank = 0`
  ).bind(memberId).first() as any

  const childRightByParent = await db.prepare(
    `SELECT id, unique_id, first_name, last_name FROM members WHERE binary_parent_id = ? AND binary_position = 'R' AND in_holding_tank = 0`
  ).bind(memberId).first() as any

  return c.json({
    member: { id: member.id, unique_id: member.unique_id, full_name: memberFullName },
    slots: {
      L: {
        column_value: member.binary_left_id,
        child_by_column: normChild(childLeft),
        child_by_parent_ref: normChild(childLeftByParent),
        is_synced: (member.binary_left_id ?? null) === (childLeftByParent?.id ?? null),
        is_occupied: !!member.binary_left_id || !!childLeftByParent,
      },
      R: {
        column_value: member.binary_right_id,
        child_by_column: normChild(childRight),
        child_by_parent_ref: normChild(childRightByParent),
        is_synced: (member.binary_right_id ?? null) === (childRightByParent?.id ?? null),
        is_occupied: !!member.binary_right_id || !!childRightByParent,
      }
    }
  })
})

// ── POST /api/admin/members/:id/clear-slot ───────────────────────────────────
// Nettoie un slot (L ou R) d'un membre parent :
//   1. Remet l'enfant en Holding Tank (binary_parent_id=NULL, in_holding_tank=1)
//   2. Remet binary_left_id ou binary_right_id du parent à NULL
//   3. Écrit une entrée dans admin_audit_log
admin.post('/members/:id/clear-slot', requirePermission('tree.edit'), async (c) => {
  const db      = c.env.DB
  const adminId: string = (c.get('adminId' as any) as string) || 'admin-000000000000000000000000'
  const memberId = c.req.param('id')
  const body   = await c.req.json() as { position: 'L' | 'R'; reason: string }

  const { position, reason } = body
  if (!position || !['L', 'R'].includes(position)) {
    return c.json({ error: 'Position invalide (L ou R requis)' }, 400)
  }
  if (!reason || reason.trim().length < 3) {
    return c.json({ error: 'Raison obligatoire (min 3 caractères)' }, 400)
  }

  // Récupérer le membre parent
  const parent = await db.prepare(
    `SELECT id, unique_id, first_name, last_name, binary_left_id, binary_right_id FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  if (!parent) return c.json({ error: 'Membre parent introuvable' }, 404)

  const parentFullName = `${parent.first_name} ${parent.last_name}`.trim()

  const colParent   = position === 'L' ? 'binary_left_id' : 'binary_right_id'
  const childIdFromCol = position === 'L' ? parent.binary_left_id : parent.binary_right_id

  // Trouver l'enfant via la colonne OU via binary_parent_id (les deux pour couvrir les désync)
  const childByParentRef = await db.prepare(
    `SELECT id, unique_id, first_name, last_name FROM members WHERE binary_parent_id = ? AND binary_position = ?`
  ).bind(memberId, position).first() as any

  // Liste de tous les IDs enfants concernés (peut y en avoir 2 en cas de désync grave)
  const childIds = new Set<string>()
  if (childIdFromCol)         childIds.add(childIdFromCol)
  if (childByParentRef?.id)   childIds.add(childByParentRef.id)

  const cleanedChildren: any[] = []

  for (const childId of childIds) {
    const child = await db.prepare(
      `SELECT id, unique_id, first_name, last_name FROM members WHERE id = ?`
    ).bind(childId).first() as any
    if (!child) continue

    const childFullName = `${child.first_name} ${child.last_name}`.trim()

    // Remettre l'enfant en Holding Tank
    await db.prepare(
      `UPDATE members SET binary_parent_id = NULL, binary_position = NULL, in_holding_tank = 1, updated_at = datetime('now') WHERE id = ?`
    ).bind(childId).run()

    // Remettre ou créer une entrée holding_tank 'waiting' pour cet enfant
    const existingHT = await db.prepare(
      `SELECT id FROM holding_tank WHERE member_id = ?`
    ).bind(childId).first()
    if (existingHT) {
      await db.prepare(
        `UPDATE holding_tank SET status = 'waiting', placed_at = NULL, placed_by = NULL WHERE member_id = ?`
      ).bind(childId).run()
    } else {
      const htId = generateId()
      await db.prepare(
        `INSERT INTO holding_tank (id, member_id, status, created_at) VALUES (?, ?, 'waiting', datetime('now'))`
      ).bind(htId, childId).run()
    }

    cleanedChildren.push({ id: child.id, unique_id: child.unique_id, full_name: childFullName })
  }

  // Remettre la colonne du parent à NULL
  await db.prepare(
    `UPDATE members SET ${colParent} = NULL, updated_at = datetime('now') WHERE id = ?`
  ).bind(memberId).run()

  // Écrire dans le journal d'audit
  // Récupérer l'email admin pour l'audit (adminId garanti par le middleware)
  const adminRow2 = await db.prepare(`SELECT email FROM admin_users WHERE id = ?`).bind(adminId).first() as any
  const adminEmail2 = adminRow2?.email || 'admin@system'
  await writeAuditLog(db, {
    adminId,
    adminEmail:    adminEmail2,
    memberId,
    memberUniqueId: parent.unique_id,
    action:         `CLEAR_SLOT_${position}`,
    amount:         null,
    description:    `Nettoyage du slot ${position} de ${parentFullName} (${parent.unique_id}). Raison : ${reason}. Enfants remis en Holding Tank : ${cleanedChildren.map(c => c.unique_id).join(', ') || 'aucun'}`,
    metadata:       { position, reason, parent_id: memberId, cleaned_children: cleanedChildren },
  })

  return c.json({
    success: true,
    message: `Slot ${position} de ${parentFullName} nettoyé avec succès.`,
    parent:  { id: parent.id, unique_id: parent.unique_id },
    cleaned_children: cleanedChildren,
  })
})

// ── GET /api/admin/members/:id/rank-diagnosis ────────────────────────────────
// Explique pourquoi un membre est au rang actuel et ce qu'il manque pour monter
admin.get('/members/:id/rank-diagnosis', requirePermission('members.view'), async (c) => {
  const db = c.env.DB
  const memberId = c.req.param('id')

  const member = await db.prepare(
    `SELECT id, unique_id, first_name, last_name, member_status, license_active, current_rank,
            left_bv_total, right_bv_total, left_bv_monthly, right_bv_monthly,
            personal_bv_monthly, personal_bv_total, in_holding_tank, binary_parent_id`
    + ` FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  // Lire la config BV (total vs mensuel)
  const globalCfg = await db.prepare(
    `SELECT value FROM compensation_config WHERE key = 'bv_rank_global_use_total'`
  ).first() as any
  const globalUseTotal = !globalCfg || globalCfg.value !== 'false'

  // Lire tous les rangs dans l'ordre croissant
  const ranks = await db.prepare(
    `SELECT * FROM rank_config ORDER BY rank_order ASC`
  ).all()

  // Directs dédupliqués avec leur meilleur package validé.
  // Le seuil de qualification est lu depuis rank_config.min_monthly_package_value pour chaque rang.
  // Aucune valeur de prix n'est hardcodée — tout vient du catalogue packages et de rank_config.
  const directsRaw = await db.prepare(
    `SELECT m.id, m.unique_id, m.first_name, m.last_name, m.member_status, m.license_active,
            MAX(COALESCE(p.price_usd, 0))  as max_price_usd,
            MAX(p.name)                     as best_package_name,
            MAX(CASE WHEN p.bv_value > 0 THEN 1 ELSE 0 END) as has_bv_package
     FROM members m
     LEFT JOIN package_orders po ON po.member_id = m.id AND po.status = 'validated'
     LEFT JOIN packages p ON p.id = po.package_id
     WHERE m.sponsor_id = ?
       AND m.member_status IN ('Partenaire','AMI','Membre','Client')
     GROUP BY m.id`
  ).bind(memberId).all()

  const directs = (directsRaw.results as any[]).map(d => ({
    id: d.id,
    unique_id: d.unique_id,
    first_name: d.first_name,
    last_name: d.last_name,
    best_package_name: d.best_package_name ?? null,
    max_price_usd: d.max_price_usd ?? 0,
    has_bv_package: d.has_bv_package === 1
  }))

  // Calculer les BV selon la config
  const leftBV  = globalUseTotal ? (member.left_bv_total  || 0) : (member.left_bv_monthly  || 0)
  const rightBV = globalUseTotal ? (member.right_bv_total || 0) : (member.right_bv_monthly || 0)
  const minLeg  = Math.min(leftBV, rightBV)
  const bvMode  = globalUseTotal ? 'total' : 'mensuel'

  // Blocanges généraux
  const blockers: string[] = []
  if (!member.license_active) blockers.push('Licence inactive — aucun rang possible')
  if (member.member_status === 'Membre' || member.member_status === 'Client') {
    blockers.push(`Statut "${member.member_status}" — upgrade vers Partenaire ou AMI requis`)
  }
  if (member.in_holding_tank) blockers.push('Membre en Holding Tank — doit être placé dans l\'arbre d\'abord')
  if (!member.binary_parent_id) blockers.push('Pas de parent binaire — placement dans l\'arbre requis')

  // Analyse rang par rang
  const rankAnalysis = (ranks.results as any[]).map((rank: any) => {
    const useTotal = rank.bv_rank_use_total !== undefined ? rank.bv_rank_use_total === 1 : globalUseTotal
    const lbv = useTotal ? (member.left_bv_total || 0) : (member.left_bv_monthly || 0)
    const rbv = useTotal ? (member.right_bv_total || 0) : (member.right_bv_monthly || 0)
    const ml  = Math.min(lbv, rbv)
    const bvOk = ml >= rank.min_bv_leg
    const bvMissing = Math.max(0, rank.min_bv_leg - ml)

    // Seuil lu depuis rank_config.min_monthly_package_value (100% configurable admin)
    // Règle unique : max_price_usd du direct >= seuil configuré
    // Si seuil = 0 → fallback : tout package avec bv_value > 0 suffit
    // Aucun type de package (Pinnacle, Production…) n'intervient dans la logique.
    const rankPriceThreshold: number = rank.min_monthly_package_value ?? 0
    const qualifiedDirects = directs.filter(d =>
      rankPriceThreshold > 0
        ? d.max_price_usd >= rankPriceThreshold  // seuil configuré admin
        : d.has_bv_package                        // fallback : tout package avec BV
    )
    const directsOk = qualifiedDirects.length >= rank.min_directs
    const directsMissing = Math.max(0, rank.min_directs - qualifiedDirects.length)

    const isCurrent = rank.rank_name === member.current_rank
    const isAchievable = bvOk && directsOk && blockers.length === 0

    return {
      rank_name: rank.rank_name,
      rank_order: rank.rank_order,
      is_current: isCurrent,
      is_achievable: isAchievable,
      bv: { required: rank.min_bv_leg, actual: ml, ok: bvOk, missing: bvMissing, mode: useTotal ? 'total' : 'mensuel' },
      directs: {
        required: rank.min_directs,
        actual: qualifiedDirects.length,
        ok: directsOk,
        missing: directsMissing,
        required_min_value: rankPriceThreshold,
        qualified_list: qualifiedDirects
      }
    }
  })

  // Prochain rang atteignable
  const currentRankOrder = rankAnalysis.find(r => r.is_current)?.rank_order || 0
  const nextRank = rankAnalysis.find(r => r.rank_order > currentRankOrder)

  return c.json({
    member: {
      id: member.id,
      unique_id: member.unique_id,
      first_name: member.first_name,
      last_name: member.last_name,
      member_status: member.member_status,
      license_active: member.license_active,
      current_rank: member.current_rank,
      left_bv: { total: member.left_bv_total || 0, monthly: member.left_bv_monthly || 0 },
      right_bv: { total: member.right_bv_total || 0, monthly: member.right_bv_monthly || 0 },
      min_leg_bv: minLeg,
      bv_mode: bvMode,
      personal_bv_monthly: member.personal_bv_monthly || 0,
      personal_bv_total: member.personal_bv_total || 0,
    },
    directs_qualified: directs,
    directs_count: directs.length,
    blockers,
    next_rank: nextRank || null,
    rank_analysis: rankAnalysis,
  })
})

// ── POST /api/admin/orchestrate-now ──────────────────────────────────────────
// Déclenche manuellement l'orchestrateur complet (BV queue + Rank queue)
admin.post('/orchestrate-now', requirePermission('settings.edit'), async (c) => {
  try {
    const { processBVQueue, processRankQueue } = await import('../lib/mlm.js')
    const db = c.env.DB
    const bvResult   = await processBVQueue(db)
    const rankResult = await processRankQueue(db)
    // Réinitialiser le verrou pour permettre une prochaine exécution auto immédiate
    await db.prepare(
      `INSERT OR REPLACE INTO system_config (key, value, updated_at)
       VALUES ('last_orchestrator_run', '1970-01-01T00:00:00.000Z', datetime('now'))`
    ).run()
    return c.json({ success: true, bvResult, rankResult })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// ── POST /api/admin/fix-leadership-primes ────────────────────────────────────
// Correction one-shot : pour chaque membre/période ayant plusieurs commissions
// prime_leadership, annule toutes sauf la plus haute, et s'assure que le wallet
// reflète le bon montant net.
admin.post('/fix-leadership-primes', requirePermission('commissions.edit'), async (c) => {
  const db = c.env.DB

  // 1. Trouver tous les groupes membre+période avec plusieurs prime_leadership
  const groups = await db.prepare(`
    SELECT member_id, period,
           COUNT(*) as cnt,
           SUM(amount) as total_sum,
           MAX(amount) as max_amount
    FROM commissions
    WHERE type = 'prime_leadership'
      AND status IN ('pending','approved')
    GROUP BY member_id, period
    HAVING COUNT(*) > 1
  `).all()

  const fixes: any[] = []

  for (const g of groups.results as any[]) {
    // 2. Récupérer toutes les commissions du groupe triées par montant DESC
    const rows = await db.prepare(`
      SELECT id, amount, rank_at_time, description, status
      FROM commissions
      WHERE member_id = ? AND period = ? AND type = 'prime_leadership'
        AND status IN ('pending','approved')
      ORDER BY amount DESC
    `).bind(g.member_id, g.period).all()

    const all = rows.results as any[]
    if (all.length <= 1) continue

    // La commission avec le montant le plus élevé = la bonne (rang final)
    const keeper   = all[0]
    const toCancel = all.slice(1)

    // 3. Annuler toutes les commissions inférieures
    for (const c_ of toCancel) {
      await db.prepare(`
        UPDATE commissions
        SET amount = 0,
            description = description || ' — Remplacée par rang ' || ?,
            status = 'cancelled'
        WHERE id = ?
      `).bind(keeper.rank_at_time || 'supérieur', c_.id).run()
    }

    // 4. S'assurer que la description de la commission gardée est propre
    await db.prepare(`
      UPDATE commissions
      SET description = 'Prime de Leadership ' || rank_at_time || ' — ' || period
      WHERE id = ?
    `).bind(keeper.id).run()

    fixes.push({
      member_id: g.member_id,
      period: g.period,
      kept: { id: keeper.id, amount: keeper.amount, rank: keeper.rank_at_time },
      cancelled: toCancel.map(r => ({ id: r.id, amount: r.amount, rank: r.rank_at_time }))
    })
  }

  return c.json({ success: true, fixed: fixes.length, details: fixes })
})

// ── GET /api/admin/members/:id/vr-history ────────────────────
// Historique des Valorisations Recommandation reçues par un sponsor
admin.get('/members/:id/vr-history', requirePermission('commissions.view'), async (c) => {
  const db       = c.env.DB
  const memberId = c.req.param('id')

  const rows = await db.prepare(
    `SELECT
       cm.id, cm.amount, cm.period, cm.status, cm.created_at,
       cm.reference_order_id,
       m.first_name || ' ' || m.last_name AS filleul_name,
       m.unique_id                          AS filleul_uid
     FROM commissions cm
     JOIN members m ON m.id = cm.source_member_id
     WHERE cm.member_id = ?
       AND cm.type = 'valorisation_recommandation'
     ORDER BY cm.created_at DESC
     LIMIT 50`
  ).bind(memberId).all()

  const vr_received  = rows.results as any[]
  const total_amount = vr_received.reduce((s: number, r: any) => s + (r.amount || 0), 0)

  return c.json({ vr_received, total_amount, count: vr_received.length })
})

// ── POST /api/admin/members/:id/reset-placement ─────────────────────────────
// Annule le placement binaire d'un membre et remet tout à zéro proprement :
//   1. Récupère le membre + son parent binaire actuel
//   2. Nettoie binary_left_id ou binary_right_id du parent (selon la position)
//   3. Remet le membre : in_holding_tank=1, binary_parent_id=NULL, binary_position=NULL, activation_done=0
//   4. Annule les BV propagés depuis cet achat (DELETE bv_logs type=propagated/binary_bv)
//      + recalcule les compteurs BV des membres affectés (left_bv_monthly, right_bv_monthly, etc.)
//   5. Remet package_orders.bv_propagated=0 pour les orders du membre
//   6. Recrée / réactive l'entrée holding_tank 'waiting' pour le parrain (sponsor)
//   7. Annule les commissions VR générées par cet achat
//   8. INSERT admin_audit_log avec résumé complet
admin.post('/members/:id/reset-placement', requirePermission('tree.edit'), async (c) => {
  const db      = c.env.DB
  const adminId: string = (c.get('adminId' as any) as string) || 'admin-000000000000000000000000'
  const memberId = c.req.param('id')

  const body = await c.req.json().catch(() => ({})) as { reason?: string }
  const reason = (body.reason || '').trim() || 'Reset placement administratif'

  // ── ÉTAPE 0 : récupérer l'admin (email pour audit) ─────────────────
  const adminRow = await db.prepare(
    `SELECT id, email FROM admin_users WHERE id = ?`
  ).bind(adminId).first() as any
  const adminEmail = adminRow?.email || 'admin@system'

  // ── ÉTAPE 1 : récupérer le membre ──────────────────────────────────
  const member = await db.prepare(
    `SELECT id, unique_id, first_name, last_name,
            binary_parent_id, binary_position,
            binary_left_id, binary_right_id,
            in_holding_tank, activation_done, sponsor_id
     FROM members WHERE id = ?`
  ).bind(memberId).first() as any

  if (!member) return c.json({ error: 'Membre introuvable' }, 404)
  if (!member.binary_parent_id && member.in_holding_tank === 1) {
    return c.json({ error: 'Ce membre est déjà en Holding Tank — aucun placement à annuler' }, 400)
  }

  const memberName = `${member.first_name} ${member.last_name}`.trim()
  const summary: string[] = []

  // ── ÉTAPE 2 : nettoyer le slot du parent binaire ────────────────────
  if (member.binary_parent_id) {
    const parentColToNull = member.binary_position === 'L' ? 'binary_left_id' : 'binary_right_id'
    await db.prepare(
      `UPDATE members SET ${parentColToNull} = NULL, updated_at = datetime('now')
       WHERE id = ? AND ${parentColToNull} = ?`
    ).bind(member.binary_parent_id, memberId).run()

    // Double-sécurité : chercher aussi via binary_parent_id référencé depuis l'autre sens
    const parentNode = await db.prepare(
      `SELECT unique_id FROM members WHERE id = ?`
    ).bind(member.binary_parent_id).first() as any
    summary.push(`Slot ${member.binary_position} de ${parentNode?.unique_id ?? member.binary_parent_id} → NULL`)
  }

  // ── ÉTAPE 3 : remettre le membre en Holding Tank ────────────────────
  await db.prepare(
    `UPDATE members SET
       binary_parent_id = NULL,
       binary_position  = NULL,
       binary_left_id   = NULL,
       binary_right_id  = NULL,
       in_holding_tank  = 1,
       activation_done  = 0,
       updated_at       = datetime('now')
     WHERE id = ?`
  ).bind(memberId).run()
  summary.push(`${memberName} (${member.unique_id}) remis en Holding Tank`)

  // ── ÉTAPE 4 : identifier les orders du membre et annuler les BV propagés ──
  const orders = await db.prepare(
    `SELECT id, bv_value, bv_propagated FROM package_orders
     WHERE member_id = ? AND bv_propagated = 1`
  ).bind(memberId).all()
  const memberOrders = orders.results as any[]

  // Trouver tous les membres dont les BV ont été crédités depuis ces orders
  // (source_member_id = memberId, types = 'binary_bv' ou 'propagated')
  const affectedMemberIds = new Set<string>()
  let bvLogsDeleted = 0

  for (const order of memberOrders) {
    // Chercher les bv_logs générés par cet order en tant que source
    const logs = await db.prepare(
      `SELECT DISTINCT member_id FROM bv_logs
       WHERE source_member_id = ? AND package_order_id = ?
         AND bv_type IN ('binary_bv', 'propagated', 'binary_propagation')`
    ).bind(memberId, order.id).all()

    for (const log of logs.results as any[]) {
      affectedMemberIds.add(log.member_id)
    }

    // Supprimer les bv_logs de propagation liés à cet order
    const del = await db.prepare(
      `DELETE FROM bv_logs
       WHERE source_member_id = ? AND package_order_id = ?
         AND bv_type IN ('binary_bv', 'propagated', 'binary_propagation')`
    ).bind(memberId, order.id).run()
    bvLogsDeleted += (del.meta?.changes ?? 0)

    // Remettre bv_propagated = 0
    await db.prepare(
      `UPDATE package_orders SET bv_propagated = 0, updated_at = datetime('now') WHERE id = ?`
    ).bind(order.id).run()
  }

  // Supprimer aussi les bv_logs de fast_start_contribution liés à ce membre comme source
  // (pour éviter que les parrains gardent des fast_start_bv orphelins)
  for (const order of memberOrders) {
    await db.prepare(
      `DELETE FROM bv_logs
       WHERE source_member_id = ? AND package_order_id = ?
         AND bv_type = 'fast_start_contribution'`
    ).bind(memberId, order.id).run()
  }

  summary.push(`${memberOrders.length} order(s) → bv_propagated=0, ${bvLogsDeleted} bv_log(s) de propagation supprimés`)

  // ── ÉTAPE 5 : recalculer les compteurs BV des membres affectés ─────
  let membersRecalculated = 0
  for (const affectedId of affectedMemberIds) {
    if (affectedId === memberId) continue // le membre lui-même sera recalculé séparément

    // Recalculer left_bv_monthly, right_bv_monthly, left_bv_total, right_bv_total
    // à partir des bv_logs restants (source = enfants L ou R)
    // On identifie la position de l'affecté par rapport à ses enfants directs
    const leftChild = await db.prepare(
      `SELECT id FROM members WHERE binary_parent_id = ? AND binary_position = 'L' LIMIT 1`
    ).bind(affectedId).first() as any
    const rightChild = await db.prepare(
      `SELECT id FROM members WHERE binary_parent_id = ? AND binary_position = 'R' LIMIT 1`
    ).bind(affectedId).first() as any

    // Recalcul BV mensuels depuis bv_logs (source = descendants L/R récursifs est trop lourd)
    // On utilise la somme des bv_logs reçus par cet affecté depuis les sources
    const period = new Date().toISOString().substring(0, 7) // YYYY-MM

    const leftBvMonthly = await db.prepare(
      `SELECT COALESCE(SUM(bv_amount), 0) as total FROM bv_logs
       WHERE member_id = ? AND bv_type IN ('binary_bv','propagated','binary_propagation')
         AND period = ? AND source_member_id IN (
           SELECT id FROM members WHERE binary_position = 'L'
             AND id IN (SELECT id FROM members WHERE binary_parent_id = ?)
         )`
    ).bind(affectedId, period, affectedId).first() as any

    // Plus robuste : recalcul global depuis bv_logs par période
    const bvSums = await db.prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN bv_type = 'binary_bv' THEN bv_amount ELSE 0 END), 0) as total_binary,
         COALESCE(SUM(bv_amount), 0) as total_all
       FROM bv_logs WHERE member_id = ? AND period = ?`
    ).bind(affectedId, period).first() as any

    // Recalcul total global
    const bvTotal = await db.prepare(
      `SELECT COALESCE(SUM(bv_amount), 0) as total FROM bv_logs WHERE member_id = ?`
    ).bind(affectedId).first() as any

    // Mise à jour simplifiée : on décrémente proportionnellement
    // La méthode exacte nécessiterait de retourner dans l'arbre — on fait un recalc depuis bv_logs
    await db.prepare(
      `UPDATE members SET
         left_bv_monthly  = COALESCE((
           SELECT SUM(bl.bv_amount) FROM bv_logs bl
           JOIN members src ON src.id = bl.source_member_id
           WHERE bl.member_id = ?
             AND bl.bv_type IN ('binary_bv','propagated','binary_propagation')
             AND bl.period = ?
             AND src.binary_position = 'L'
             AND src.binary_parent_id = ?
         ), 0),
         right_bv_monthly = COALESCE((
           SELECT SUM(bl.bv_amount) FROM bv_logs bl
           JOIN members src ON src.id = bl.source_member_id
           WHERE bl.member_id = ?
             AND bl.bv_type IN ('binary_bv','propagated','binary_propagation')
             AND bl.period = ?
             AND src.binary_position = 'R'
             AND src.binary_parent_id = ?
         ), 0),
         updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      affectedId, period, affectedId,
      affectedId, period, affectedId,
      affectedId
    ).run()

    membersRecalculated++
  }

  // Remettre à zéro les compteurs BV personnels du membre reset
  await db.prepare(
    `UPDATE members SET
       left_bv_monthly = 0, right_bv_monthly = 0,
       personal_bv_monthly = 0,
       fast_start_bv = COALESCE((
         SELECT SUM(bv_amount) FROM bv_logs
         WHERE member_id = ? AND bv_type = 'fast_start_contribution'
       ), 0),
       updated_at = datetime('now')
     WHERE id = ?`
  ).bind(memberId, memberId).run()

  summary.push(`${membersRecalculated} membre(s) ancêtre(s) recalculés`)

  // ── ÉTAPE 6 : annuler les commissions VR liées aux orders du membre ─
  let commissionsNulled = 0
  for (const order of memberOrders) {
    const vrCancel = await db.prepare(
      `UPDATE commissions SET status = 'cancelled', amount = 0,
          description = description || ' — Annulé par reset-placement (' || ? || ')',
          updated_at = datetime('now')
       WHERE reference_order_id = ?
         AND source_member_id = ?
         AND type IN ('valorisation_recommandation', 'binary_commission')
         AND status IN ('pending','approved')`
    ).bind(reason, order.id, memberId).run()
    commissionsNulled += (vrCancel.meta?.changes ?? 0)
  }
  if (commissionsNulled > 0) summary.push(`${commissionsNulled} commission(s) VR/binaire annulée(s)`)

  // ── ÉTAPE 7 : remettre l'entrée holding_tank du parrain (sponsor) ──
  const sponsorId = member.sponsor_id
  if (sponsorId) {
    const existingHT = await db.prepare(
      `SELECT id, status FROM holding_tank WHERE member_id = ?`
    ).bind(memberId).first() as any

    if (existingHT) {
      await db.prepare(
        `UPDATE holding_tank
         SET status = 'waiting', placed_at = NULL, placed_by = NULL,
             sponsor_id = ?, created_at = datetime('now')
         WHERE member_id = ?`
      ).bind(sponsorId, memberId).run()
    } else {
      await db.prepare(
        `INSERT INTO holding_tank (id, member_id, sponsor_id, entry_reason, status, created_at)
         VALUES (lower(hex(randomblob(16))), ?, ?, 'reset_placement', 'waiting', datetime('now'))`
      ).bind(memberId, sponsorId).run()
    }

    // Recalculer sponsor_deadline_at
    const delayCfg = await db.prepare(
      `SELECT value FROM compensation_config WHERE key='holding_tank_sponsor_days'`
    ).first() as any
    const sponsorDays = parseInt(delayCfg?.value || '15', 10)
    await db.prepare(
      `UPDATE holding_tank
       SET sponsor_deadline_at = datetime('now', '+${sponsorDays} days'),
           admin_can_place = 0
       WHERE member_id = ?`
    ).bind(memberId).run()

    summary.push(`Holding Tank recréé pour parrain (sponsor_id=${sponsorId}), délai ${sponsorDays}j`)
  }

  // ── ÉTAPE 8 : audit log ─────────────────────────────────────────────
  await writeAuditLog(db, {
    adminId,
    adminEmail,
    memberId,
    memberUniqueId: member.unique_id,
    action: 'RESET_PLACEMENT',
    description: `Reset placement de ${memberName} (${member.unique_id}). Raison: ${reason}. ${summary.join(' | ')}`,
    metadata: {
      reason,
      previous_binary_parent_id: member.binary_parent_id,
      previous_binary_position:  member.binary_position,
      sponsor_id: sponsorId,
      orders_reset: memberOrders.length,
      bv_logs_deleted: bvLogsDeleted,
      commissions_nulled: commissionsNulled,
      ancestors_recalculated: membersRecalculated,
    }
  })

  return c.json({
    success: true,
    message: `Placement de ${memberName} (${member.unique_id}) annulé avec succès.`,
    summary,
    details: {
      member:               { id: memberId, unique_id: member.unique_id, name: memberName },
      previous_parent_id:   member.binary_parent_id,
      previous_position:    member.binary_position,
      orders_reset:         memberOrders.length,
      bv_logs_deleted:      bvLogsDeleted,
      commissions_nulled:   commissionsNulled,
      ancestors_recalculated: membersRecalculated,
      holding_tank_status:  'waiting',
    }
  })
})

// ── GET /admin/cc-withdrawals ─────────────────────────────────────────────────
// Liste toutes les demandes de remboursement CC (filtrables par status)
admin.get('/cc-withdrawals', requirePermission('cc_withdrawals.view'), async (c) => {
  const db = c.env.DB
  const { status, page = '1', per_page = '50' } = c.req.query()
  const limit  = parseInt(per_page)
  const offset = (parseInt(page) - 1) * limit

  let where = 'WHERE 1=1'
  const binds: any[] = []
  if (status) { where += ' AND w.status = ?'; binds.push(status) }

  const [rows, total] = await Promise.all([
    db.prepare(
      `SELECT w.*,
              m.first_name || ' ' || m.last_name AS member_name,
              m.unique_id AS member_unique_id,
              au.email AS reviewed_by_email
       FROM cc_withdrawals w
       JOIN members m ON m.id = w.member_id
       LEFT JOIN admin_users au ON au.id = w.reviewed_by
       ${where}
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset).all(),
    db.prepare(
      `SELECT COUNT(*) as cnt FROM cc_withdrawals w ${where}`
    ).bind(...binds).first() as any,
  ])

  return c.json({
    withdrawals: rows.results || [],
    total:       total?.cnt   || 0,
    page:        parseInt(page),
    per_page:    limit,
  })
})

// ── GET /admin/members/:id/cc-wallet ─────────────────────────────────────────
// Journal CC complet d'un membre + solde détaillé
admin.get('/members/:id/cc-wallet', requirePermission('cc_withdrawals.view'), async (c) => {
  const db       = c.env.DB
  const memberId = c.req.param('id')

  const member = await db.prepare(
    `SELECT id, unique_id, first_name, last_name FROM members WHERE id = ?`
  ).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  const [balance, transactions, credits, withdrawals] = await Promise.all([
    getCCBalance(db, memberId),
    db.prepare(
      `SELECT * FROM cc_transactions
       WHERE member_id = ?
       ORDER BY created_at DESC
       LIMIT 200`
    ).bind(memberId).all(),
    db.prepare(
      `SELECT id, amount, used_amount, (amount - used_amount) AS remaining,
              period, status, available_at, expires_at, created_at
       FROM credit_croissance
       WHERE member_id = ? AND status IN ('held','available')
       ORDER BY available_at ASC`
    ).bind(memberId).all(),
    db.prepare(
      `SELECT * FROM cc_withdrawals
       WHERE member_id = ?
       ORDER BY created_at DESC`
    ).bind(memberId).all(),
  ])

  return c.json({
    member: {
      id:        member.id,
      unique_id: member.unique_id,
      name:      `${member.first_name} ${member.last_name}`.trim(),
    },
    balance,
    transactions: transactions.results || [],
    credits:      credits.results      || [],
    withdrawals:  withdrawals.results  || [],
  })
})

// ── POST /admin/cc-withdrawals/:id/review ────────────────────────────────────
// Approuver ou rejeter une demande de remboursement CC
admin.post('/cc-withdrawals/:id/review', requirePermission('cc_withdrawals.edit'), async (c) => {
  const db           = c.env.DB
  const adminId      = c.get('adminId'    as any) as string
  const adminEmail   = c.get('adminEmail' as any) as string
  const withdrawalId = c.req.param('id')

  const body = await c.req.json() as { action: 'approved' | 'rejected'; admin_note?: string }
  const { action, admin_note } = body

  if (!['approved', 'rejected'].includes(action))
    return c.json({ error: 'Action invalide — "approved" ou "rejected" attendu' }, 400)

  const withdrawal = await db.prepare(
    `SELECT * FROM cc_withdrawals WHERE id = ?`
  ).bind(withdrawalId).first() as any
  if (!withdrawal)
    return c.json({ error: 'Demande introuvable' }, 404)
  if (withdrawal.status !== 'pending')
    return c.json({ error: `Demande déjà traitée (status: ${withdrawal.status})` }, 409)

  if (action === 'approved') {
    try {
      // Vérifier solde disponible
      const bal = await getCCBalance(db, withdrawal.member_id)
      if (bal.available < withdrawal.amount)
        return c.json({
          error: `Solde CC insuffisant — ${bal.available.toFixed(2)}$ disponible, ${withdrawal.amount}$ demandé`
        }, 422)

      // Consommer en FIFO + journaliser
      await recordCCWithdrawal(db, withdrawal.member_id, withdrawal.amount, withdrawalId, admin_note || '')

      // Créditer le wallet principal (disponible) du membre
      await walletOperation(db, withdrawal.member_id, withdrawal.amount, 'credit', 'cc_withdrawal',
        `Remboursement CC approuvé — demande #${withdrawalId}`)

      await db.prepare(
        `UPDATE cc_withdrawals
         SET status='approved', admin_note=?, reviewed_by=?, reviewed_at=datetime('now'), updated_at=datetime('now')
         WHERE id=?`
      ).bind(admin_note || null, adminId, withdrawalId).run()

      // Notification membre
      await db.prepare(
        `INSERT INTO notifications (id, member_id, type, title, message, created_at)
         VALUES (lower(hex(randomblob(16))), ?, 'cc_withdrawal',
                 'Remboursement CC approuvé',
                 'Votre demande de remboursement de ' || ? || '$ sur votre Crédit de Croissance a été approuvée.',
                 datetime('now'))`
      ).bind(withdrawal.member_id, withdrawal.amount).run().catch(() => {})

    } catch (err: any) {
      console.error('[CC_WITHDRAWAL_APPROVE] Error:', err)
      return c.json({
        error: err?.message || 'Erreur interne lors de l\'approbation — contactez le support'
      }, 500)
    }

  } else {
    await db.prepare(
      `UPDATE cc_withdrawals
       SET status='rejected', admin_note=?, reviewed_by=?, reviewed_at=datetime('now'), updated_at=datetime('now')
       WHERE id=?`
    ).bind(admin_note || null, adminId, withdrawalId).run()

    await db.prepare(
      `INSERT INTO notifications (id, member_id, type, title, message, created_at)
       VALUES (lower(hex(randomblob(16))), ?, 'cc_withdrawal',
               'Remboursement CC refusé',
               'Votre demande de ' || ? || '$ a été refusée.' ||
               CASE WHEN ? IS NOT NULL THEN ' Motif : ' || ? ELSE '' END,
               datetime('now'))`
    ).bind(withdrawal.member_id, withdrawal.amount, admin_note || null, admin_note || null).run().catch(() => {})
  }

  await writeAuditLog(db, {
    adminId,
    adminEmail,
    memberId:       withdrawal.member_id,
    memberUniqueId: '',
    action:         `CC_WITHDRAWAL_${action.toUpperCase()}`,
    description:    `${action === 'approved' ? 'Approbation' : 'Rejet'} remboursement CC #${withdrawalId} — ${withdrawal.amount}$`,
    metadata:       { withdrawal_id: withdrawalId, amount: withdrawal.amount, admin_note }
  }).catch(() => {}) // audit log failure must never block the response

  return c.json({
    success:       true,
    withdrawal_id: withdrawalId,
    new_status:    action,
    message:       action === 'approved'
      ? `Remboursement de ${withdrawal.amount}$ approuvé.`
      : `Demande rejetée.`,
  })
})

// ══════════════════════════════════════════════════════════════════════
// SYSTÈME DE RAPPORTS — Phase 2 : rapport individuel membre
// ══════════════════════════════════════════════════════════════════════

// ── GET /api/admin/members/:id/report — Fiche analytique complète ──────
admin.get('/members/:id/report', requirePermission('reports.view'), async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB

  // Membre de base
  const member = await db.prepare(
    `SELECT m.*, sp.first_name as sponsor_first, sp.last_name as sponsor_last, sp.unique_id as sponsor_uid
     FROM members m
     LEFT JOIN members sp ON sp.id = m.sponsor_id
     WHERE m.id=?`
  ).bind(id).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  const [
    wallet,
    licenses,
    packages,
    commByType,
    commRecent,
    bvByMonth,
    withdrawals,
    dreamiles,
    ccWallet,
    rsWallet,
    supportTickets,
    auditLog,
    directDownline,
    fastStartInfo,
    binaryPosition,
    top5Downline,
    withdrawalStats,
    supportTicketsList,
  ] = await Promise.all([
    // Wallet complet
    db.prepare(`SELECT * FROM wallets WHERE member_id=?`).bind(id).first(),

    // Toutes les licences
    db.prepare(
      `SELECT * FROM finstrategia_licenses WHERE member_id=? ORDER BY created_at DESC`
    ).bind(id).all(),

    // Tous les packages achetés
    db.prepare(
      `SELECT po.*, p.name as pkg_name, p.bv_value, p.price_usd as pkg_price
       FROM package_orders po JOIN packages p ON p.id=po.package_id
       WHERE po.member_id=? ORDER BY po.created_at DESC`
    ).bind(id).all(),

    // Commissions regroupées par type (all-time)
    db.prepare(
      `SELECT type,
              SUM(amount) as total,
              COUNT(*) as count,
              AVG(amount) as avg_amount,
              MAX(amount) as max_amount,
              MIN(created_at) as first_at,
              MAX(created_at) as last_at
       FROM commissions
       WHERE member_id=? AND status IN ('approved','paid','non_withdrawable','locked')
       GROUP BY type ORDER BY total DESC`
    ).bind(id).all(),

    // 25 dernières commissions
    db.prepare(
      `SELECT c.*, m2.first_name as src_first, m2.last_name as src_last, m2.unique_id as src_uid
       FROM commissions c
       LEFT JOIN members m2 ON m2.id = c.source_member_id
       WHERE c.member_id=? ORDER BY c.created_at DESC LIMIT 25`
    ).bind(id).all(),

    // BV par mois (14 derniers mois)
    db.prepare(
      `SELECT period,
              SUM(bv_amount) as total_bv,
              COUNT(*) as entries,
              SUM(CASE WHEN bv_type='package_purchase' THEN bv_amount ELSE 0 END) as bv_packages,
              SUM(CASE WHEN bv_type='license_renewal'  THEN bv_amount ELSE 0 END) as bv_licenses,
              SUM(CASE WHEN bv_type='personal'         THEN bv_amount ELSE 0 END) as bv_personal
       FROM bv_logs WHERE member_id=?
       GROUP BY period ORDER BY period DESC LIMIT 14`
    ).bind(id).all(),

    // Tous les retraits
    db.prepare(
      `SELECT *, (amount - net_amount) as fee_paid FROM withdrawals
       WHERE member_id=? ORDER BY created_at DESC`
    ).bind(id).all(),

    // DréaMiles
    db.prepare(`SELECT * FROM dreamiles_wallet WHERE member_id=?`).bind(id).first(),

    // Crédit Croissance
    db.prepare(`SELECT * FROM credit_croissance WHERE member_id=?`).bind(id).first(),

    // Réserve Stratégique
    db.prepare(
      `SELECT SUM(amount) as total, COUNT(*) as count,
              SUM(CASE WHEN unlocked_at IS NOT NULL THEN amount ELSE 0 END) as unlocked,
              SUM(CASE WHEN unlocked_at IS NULL THEN amount ELSE 0 END) as locked
       FROM reserve_strategique WHERE member_id=?`
    ).bind(id).first(),

    // Tickets de support
    db.prepare(
      `SELECT status, category, priority,
              COUNT(*) as count,
              AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
              MIN(created_at) as first_at,
              MAX(created_at) as last_at
       FROM support_tickets WHERE member_id=?
       GROUP BY status, category, priority`
    ).bind(id).all(),

    // 10 dernières actions admin sur ce membre
    db.prepare(
      `SELECT al.action, al.wallet_type, al.amount, al.description, al.created_at,
              au.name as admin_name, au.email as admin_email
       FROM admin_audit_log al
       LEFT JOIN admin_users au ON au.id = al.admin_id
       WHERE al.member_id=? ORDER BY al.created_at DESC LIMIT 10`
    ).bind(id).all(),

    // Filleuls directs de parrainage (sponsor_id = id)
    db.prepare(
      `SELECT id, unique_id, first_name, last_name, member_status, current_rank,
              license_active, left_bv_total, right_bv_total,
              personal_bv_total, created_at,
              binary_parent_id, binary_position
       FROM members WHERE sponsor_id=?
       ORDER BY personal_bv_total DESC LIMIT 20`
    ).bind(id).all(),

    // Fast Start détail
    db.prepare(
      `SELECT fast_start_start_date, fast_start_completed, fast_start_bv,
              (SELECT SUM(amount) FROM commissions
               WHERE member_id=? AND type='fast_start' AND status IN ('approved','paid')) as fs_commissions_total,
              (SELECT COUNT(*) FROM commissions
               WHERE member_id=? AND type='fast_start' AND status IN ('approved','paid')) as fs_commissions_count
       FROM members WHERE id=?`
    ).bind(id, id, id).first(),

    // Position dans l'arbre binaire (parent + enfants directs)
    db.prepare(
      `SELECT
         p.unique_id as parent_uid, p.first_name as parent_first, p.last_name as parent_last,
         lc.unique_id as left_uid,  lc.first_name as left_first,  lc.last_name as left_last,  lc.current_rank as left_rank,
         rc.unique_id as right_uid, rc.first_name as right_first, rc.last_name as right_last, rc.current_rank as right_rank,
         m.binary_position, m.binary_parent_id
       FROM members m
       LEFT JOIN members p  ON p.id  = m.binary_parent_id
       LEFT JOIN members lc ON lc.id = m.binary_left_id
       LEFT JOIN members rc ON rc.id = m.binary_right_id
       WHERE m.id=?`
    ).bind(id).first(),

    // Top 5 downline les plus actifs (BV personnel le plus élevé dans toute la downline)
    db.prepare(
      `WITH RECURSIVE downline(mid) AS (
         SELECT id FROM members WHERE binary_parent_id=?
         UNION ALL
         SELECT m.id FROM members m JOIN downline d ON m.binary_parent_id=d.mid
       )
       SELECT m.id, m.unique_id, m.first_name, m.last_name, m.current_rank,
              m.personal_bv_total, m.left_bv_total, m.right_bv_total, m.member_status
       FROM members m
       JOIN downline d ON m.id=d.mid
       ORDER BY m.personal_bv_total DESC LIMIT 5`
    ).bind(id).all(),

    // Statistiques retraits agrégées (total, frais, moyenne, dernier)
    db.prepare(
      `SELECT
         COUNT(*) as total_count,
         SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed_count,
         SUM(CASE WHEN status='pending'   THEN 1 ELSE 0 END) as pending_count,
         SUM(CASE WHEN status='rejected'  THEN 1 ELSE 0 END) as rejected_count,
         SUM(CASE WHEN status='completed' THEN net_amount ELSE 0 END) as total_net,
         SUM(CASE WHEN status='completed' THEN (amount - net_amount) ELSE 0 END) as total_fees,
         AVG(CASE WHEN status='completed' THEN net_amount END) as avg_net,
         MAX(CASE WHEN status='completed' THEN created_at END) as last_completed_at,
         MIN(CASE WHEN status='completed' THEN created_at END) as first_completed_at
       FROM withdrawals WHERE member_id=?`
    ).bind(id).first(),

    // Tickets de support — liste complète (pas seulement groupés)
    db.prepare(
      `SELECT id, subject, category, priority, status, rating, created_at, updated_at
       FROM support_tickets WHERE member_id=?
       ORDER BY created_at DESC LIMIT 20`
    ).bind(id).all(),
  ])

  // Agrégats côté serveur
  const commAll          = (commByType as any).results || []
  const totalCommEarned  = commAll.reduce((s: number, r: any) => s + (r.total || 0), 0)
  // Moyenne mensuelle commissions : nb de mois distincts dans commissions_recent
  const commRecents      = (commRecent as any).results || []
  const distinctMonths   = new Set(commRecents.map((c: any) => (c.period || c.created_at || '').substring(0, 7))).size || 1
  const avgMonthlyComm   = totalCommEarned / distinctMonths
  const bestCommMonth    = commAll.reduce((best: any, r: any) => (!best || r.max_amount > best.max_amount) ? r : best, null)

  const wdAll            = (withdrawals as any).results || []
  const wdStats          = withdrawalStats as any || {}

  const pkgAll           = (packages as any).results || []
  const totalSpent       = pkgAll.filter((p: any) => p.status === 'validated').reduce((s: number, r: any) => s + (r.amount_usd || 0), 0)

  const bvMonths         = (bvByMonth as any).results || []
  const totalBVEarned    = bvMonths.reduce((s: number, r: any) => s + (r.total_bv || 0), 0)
  const bestBVMonth      = bvMonths.reduce((best: any, r: any) => (!best || r.total_bv > best.total_bv) ? r : best, null)

  const licAll           = (licenses as any).results || []
  const activeLic        = licAll.find((l: any) => l.status === 'active') || null

  // Support : groupé (existant) + liste complète (nouveau)
  const stAll            = (supportTickets as any).results || []
  const stList           = (supportTicketsList as any).results || []
  const openTickets      = stAll.filter((t: any) => ['open','in_progress'].includes(t.status)).reduce((s: number, r: any) => s + r.count, 0)
  const ratedTickets     = stList.filter((t: any) => t.rating !== null && t.rating !== undefined)
  const avgRating        = ratedTickets.length > 0
    ? ratedTickets.reduce((s: number, t: any) => s + (t.rating || 0), 0) / ratedTickets.length
    : null

  // Top 5 downline
  const top5             = (top5Downline as any).results || []

  return c.json({
    generated_at: new Date().toISOString(),
    member,
    wallet,
    financials: {
      total_commissions_earned:  totalCommEarned,
      avg_monthly_commissions:   Math.round(avgMonthlyComm * 100) / 100,
      best_commission_month:     bestCommMonth,
      total_withdrawn_completed: wdStats.total_net    || 0,
      total_withdrawal_fees:     wdStats.total_fees   || 0,
      avg_withdrawal:            wdStats.avg_net      || 0,
      last_withdrawal_at:        wdStats.last_completed_at || null,
      first_withdrawal_at:       wdStats.first_completed_at || null,
      total_packages_spent:      totalSpent,
      total_bv_earned:           totalBVEarned,
      best_bv_month:             bestBVMonth,
      net_position:              totalCommEarned - (wdStats.total_net || 0),
    },
    withdrawal_stats: {
      total_count:     wdStats.total_count     || 0,
      completed_count: wdStats.completed_count || 0,
      pending_count:   wdStats.pending_count   || 0,
      rejected_count:  wdStats.rejected_count  || 0,
      total_net:       wdStats.total_net       || 0,
      total_fees:      wdStats.total_fees      || 0,
      avg_net:         wdStats.avg_net         || 0,
      last_at:         wdStats.last_completed_at  || null,
      first_at:        wdStats.first_completed_at || null,
    },
    licenses: licAll,
    active_license: activeLic,
    packages: pkgAll,
    commissions_by_type: commAll,
    commissions_recent: commRecents,
    bv_by_month: bvMonths,
    withdrawals: wdAll,
    dreamiles,
    cc_wallet: ccWallet,
    reserve_strategique: rsWallet,
    support: {
      tickets_summary: stAll,
      tickets_list:    stList,
      open_tickets:    openTickets,
      avg_rating:      avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
    },
    audit_log:        (auditLog as any).results || [],
    direct_downline:  (directDownline as any).results || [],
    top5_downline:    top5,
    binary_position:  binaryPosition,
    fast_start:       fastStartInfo,
  })
})

// ══════════════════════════════════════════════════════════════════════
// SYSTÈME DE RAPPORTS — Phase 3 : rapports globaux (8 prioritaires)
// Toutes les routes sont en Promise.all pour la performance maximale
// ══════════════════════════════════════════════════════════════════════

// Helper : bornes de période selon granularité
function periodBounds(period: string, date: string): { start: string; end: string; label: string } {
  if (period === 'day') {
    const d = date || new Date().toISOString().substring(0, 10)
    return { start: d + ' 00:00:00', end: d + ' 23:59:59', label: d }
  }
  if (period === 'week') {
    // date = YYYY-Www ou YYYY-MM-DD → on calcule lundi-dimanche
    const base = new Date(date || new Date().toISOString().substring(0, 10))
    const day  = base.getDay() || 7
    const mon  = new Date(base); mon.setDate(base.getDate() - day + 1)
    const sun  = new Date(mon);  sun.setDate(mon.getDate() + 6)
    const fmt  = (d: Date) => d.toISOString().substring(0, 10)
    return { start: fmt(mon) + ' 00:00:00', end: fmt(sun) + ' 23:59:59', label: `${fmt(mon)} → ${fmt(sun)}` }
  }
  if (period === 'year') {
    const y = (date || new Date().getFullYear().toString()).substring(0, 4)
    return { start: `${y}-01-01 00:00:00`, end: `${y}-12-31 23:59:59`, label: y }
  }
  // month (défaut)
  const m = (date || new Date().toISOString().substring(0, 7))
  return { start: `${m}-01 00:00:00`, end: `${m}-31 23:59:59`, label: m }
}

// ── R-25 : Executive Summary ──────────────────────────────────────────
admin.get('/reports/executive-summary', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [
    membersTotal, membersNew, membersActive, membersRank, membersStatus,
    salesCAAll, salesCountAll, salesCAperiod, salesCountPeriod, salesPending,
    commTotalAll, commPeriod, commPending,
    wdTotal, wdPending,
    bvTotalAll, bvPeriod, bvNetworkRoot,
    ticketsOpen, ticketsUrgent, ticketsTotal,
    licensesExpiring, licensesActive,
    holdingTank,
    walletsStats,
  ] = await Promise.all([
    // Membres — globaux
    db.prepare(`SELECT COUNT(*) as cnt FROM members`).first() as any,
    db.prepare(`SELECT COUNT(*) as cnt FROM members WHERE created_at BETWEEN ? AND ?`).bind(start, end).first() as any,
    db.prepare(`SELECT COUNT(*) as cnt FROM members WHERE license_active=1`).first() as any,
    db.prepare(`SELECT current_rank, COUNT(*) as cnt FROM members GROUP BY current_rank ORDER BY cnt DESC LIMIT 8`).all(),
    db.prepare(`SELECT member_status, COUNT(*) as cnt FROM members GROUP BY member_status`).all(),

    // Ventes — ALL TIME (status=validated)
    db.prepare(`SELECT COALESCE(SUM(amount_usd),0) as total, COUNT(*) as cnt FROM package_orders WHERE status='validated'`).first() as any,
    db.prepare(`SELECT COUNT(*) as cnt FROM package_orders WHERE status='validated'`).first() as any,
    // Ventes — période
    db.prepare(`SELECT COALESCE(SUM(amount_usd),0) as total FROM package_orders WHERE status='validated' AND validated_at BETWEEN ? AND ?`).bind(start, end).first() as any,
    db.prepare(`SELECT COUNT(*) as cnt FROM package_orders WHERE status='validated' AND validated_at BETWEEN ? AND ?`).bind(start, end).first() as any,
    db.prepare(`SELECT COUNT(*) as cnt FROM package_orders WHERE status='pending'`).first() as any,

    // Commissions — ALL TIME
    db.prepare(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as cnt FROM commissions`).first() as any,
    // Commissions — période
    db.prepare(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as cnt FROM commissions WHERE created_at BETWEEN ? AND ?`).bind(start, end).first() as any,
    db.prepare(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as cnt FROM commissions WHERE status='pending'`).first() as any,

    // Retraits
    db.prepare(`SELECT COALESCE(SUM(net_amount),0) as total, COUNT(*) as cnt FROM withdrawals WHERE status='completed'`).first() as any,
    db.prepare(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as cnt FROM withdrawals WHERE status='pending'`).first() as any,

    // BV personnel ALL TIME = achats réels uniquement (personal_purchase)
    // NE PAS utiliser SUM(bv_amount) qui inclut les propagations internes (double-comptage)
    db.prepare(`SELECT COALESCE(SUM(bv_amount),0) as total FROM bv_logs WHERE bv_type='personal_purchase'`).first() as any,
    // BV personnel période
    db.prepare(`SELECT COALESCE(SUM(bv_amount),0) as total FROM bv_logs WHERE bv_type='personal_purchase' AND created_at BETWEEN ? AND ?`).bind(start, end).first() as any,
    // BV réseau left/right — ROOT est la vraie racine de l'arbre (binary_parent_id IS NULL)
    // ROOT.left_bv_total / right_bv_total = vision complète du réseau
    db.prepare(
      `SELECT COALESCE(left_bv_total,0) as left_total, COALESCE(right_bv_total,0) as right_total,
              COALESCE(left_bv_monthly,0) as left_monthly, COALESCE(right_bv_monthly,0) as right_monthly
       FROM members WHERE unique_id = 'ROOT'`
    ).first() as any,

    // Support
    db.prepare(`SELECT COUNT(*) as cnt FROM support_tickets WHERE status IN ('open','in_progress','waiting_member')`).first() as any,
    db.prepare(`SELECT COUNT(*) as cnt FROM support_tickets WHERE priority='urgent'`).first() as any,
    db.prepare(`SELECT COUNT(*) as cnt FROM support_tickets`).first() as any,

    // Licences
    db.prepare(`SELECT COUNT(*) as cnt FROM finstrategia_licenses WHERE status='active' AND expires_at BETWEEN datetime('now') AND datetime('now','+30 days')`).first() as any,
    db.prepare(`SELECT COUNT(*) as cnt FROM finstrategia_licenses WHERE status='active'`).first() as any,

    // Holding tank
    db.prepare(`SELECT COUNT(*) as cnt FROM members WHERE in_holding_tank=1`).first() as any,

    // Wallets
    db.prepare(`SELECT COALESCE(SUM(balance),0) as balance, COALESCE(SUM(total_earned),0) as earned, COUNT(*) as cnt FROM wallets`).first() as any,
  ])

  return c.json({
    generated_at: new Date().toISOString(),
    period, label,
    network: {
      total_members:    membersTotal?.cnt    || 0,
      new_members:      membersNew?.cnt      || 0,
      active_members:   membersActive?.cnt   || 0,
      active_ami:       membersActive?.cnt   || 0,
      in_holding_tank:  holdingTank?.cnt     || 0,
      rank_distribution: (membersRank as any).results || [],
      by_status:         (membersStatus as any).results || [],
    },
    sales: {
      // ALL TIME
      ca_total:         salesCAAll?.total    || 0,
      orders_total:     salesCAAll?.cnt      || 0,
      // Période sélectionnée
      ca_period:        salesCAperiod?.total || 0,
      orders_period:    salesCountPeriod?.cnt|| 0,
      orders_pending:   salesPending?.cnt   || 0,
    },
    commissions: {
      // ALL TIME
      total_all:        commTotalAll?.total  || 0,
      count_all:        commTotalAll?.cnt    || 0,
      // Période
      total_period:     commPeriod?.total    || 0,
      count_period:     commPeriod?.cnt      || 0,
      pending_total:    commPending?.total   || 0,
      pending_count:    commPending?.cnt     || 0,
    },
    withdrawals: {
      total_period:     wdTotal?.total       || 0,
      count_period:     wdTotal?.cnt         || 0,
      pending_total:    wdPending?.total     || 0,
      pending_count:    wdPending?.cnt       || 0,
    },
    bv: {
      // Transactions BV ALL TIME (depuis bv_logs — transactions réelles)
      total_all:        bvTotalAll?.total    || 0,
      total_period:     bvPeriod?.total      || 0,
      // Jambes réseau = valeur du membre utero 1 (Willy, racine opérationnelle)
      // Source de vérité unique : left_bv_total/right_bv_total du 1er enfant de ROOT
      network_left_total:   bvNetworkRoot?.left_total   || 0,
      network_right_total:  bvNetworkRoot?.right_total  || 0,
      network_left_monthly: bvNetworkRoot?.left_monthly || 0,
      network_right_monthly:bvNetworkRoot?.right_monthly|| 0,
    },
    support: {
      tickets_total:    ticketsTotal?.cnt    || 0,
      tickets_open:     ticketsOpen?.cnt     || 0,
      tickets_urgent:   ticketsUrgent?.cnt   || 0,
    },
    licenses: {
      active:           licensesActive?.cnt  || 0,
      expiring_30d:     licensesExpiring?.cnt|| 0,
    },
    wallets: {
      total_balance:    walletsStats?.balance || 0,
      total_earned:     walletsStats?.earned  || 0,
      total_wallets:    walletsStats?.cnt     || 0,
    },
  })
})

// ── R-04 : Rapport Ventes & Packages ─────────────────────────────────
admin.get('/reports/sales', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [caAll, caPeriod, byStatus, byStatusAll, byPackage, byPackageAll, byMethod, recentOrders, avgValidation] = await Promise.all([
    // ALL TIME stats
    db.prepare(
      `SELECT COALESCE(SUM(amount_usd),0) as total, COUNT(*) as count, AVG(amount_usd) as avg_order
       FROM package_orders WHERE status='validated'`
    ).first() as any,

    // Période stats
    db.prepare(
      `SELECT COALESCE(SUM(amount_usd),0) as total, COUNT(*) as count, AVG(amount_usd) as avg_order
       FROM package_orders WHERE status='validated' AND validated_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    // Par statut — période
    db.prepare(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(amount_usd),0) as total
       FROM package_orders WHERE created_at BETWEEN ? AND ?
       GROUP BY status`
    ).bind(start, end).all(),

    // Par statut — ALL TIME
    db.prepare(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(amount_usd),0) as total
       FROM package_orders GROUP BY status`
    ).all(),

    // Par package — période
    db.prepare(
      `SELECT p.name, p.slug, COUNT(*) as orders, COALESCE(SUM(po.amount_usd),0) as revenue, COALESCE(SUM(po.bv_value),0) as bv_total
       FROM package_orders po LEFT JOIN packages p ON p.id=po.package_id
       WHERE po.status='validated' AND po.validated_at BETWEEN ? AND ?
       GROUP BY po.package_id ORDER BY revenue DESC`
    ).bind(start, end).all(),

    // Par package — ALL TIME
    db.prepare(
      `SELECT p.name, p.slug, COUNT(*) as orders, COALESCE(SUM(po.amount_usd),0) as revenue, COALESCE(SUM(po.bv_value),0) as bv_total
       FROM package_orders po LEFT JOIN packages p ON p.id=po.package_id
       WHERE po.status='validated'
       GROUP BY po.package_id ORDER BY revenue DESC`
    ).all(),

    // Par méthode — ALL TIME
    db.prepare(
      `SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount_usd),0) as total
       FROM package_orders WHERE status='validated'
       GROUP BY payment_method`
    ).all(),

    // Commandes récentes (toutes)
    db.prepare(
      `SELECT po.id, po.amount_usd, po.status, po.payment_method, po.created_at, po.validated_at,
              m.first_name, m.last_name, m.unique_id, p.name as pkg_name
       FROM package_orders po
       LEFT JOIN members m ON m.id=po.member_id
       LEFT JOIN packages p ON p.id=po.package_id
       ORDER BY po.created_at DESC LIMIT 50`
    ).all(),

    db.prepare(
      `SELECT AVG((julianday(validated_at) - julianday(created_at)) * 24) as avg_hours
       FROM package_orders WHERE status='validated'`
    ).first() as any,
  ])

  return c.json({
    generated_at: new Date().toISOString(),
    period, label,
    summary: {
      // ALL TIME
      revenue:       caAll?.total       || 0,
      orders:        caAll?.count       || 0,
      avg_order:     Math.round((caAll?.avg_order || 0) * 100) / 100,
      avg_validation_hours: Math.round((avgValidation?.avg_hours || 0) * 10) / 10,
      // Période
      revenue_period:  caPeriod?.total  || 0,
      orders_period:   caPeriod?.count  || 0,
    },
    by_status:        (byStatus as any).results     || [],
    by_status_all:    (byStatusAll as any).results  || [],
    by_package:       (byPackage as any).results    || [],
    by_package_all:   (byPackageAll as any).results || [],
    by_method:        (byMethod as any).results     || [],
    recent_orders:    (recentOrders as any).results || [],
  })
})

// ── R-14 : Rapport Retraits ───────────────────────────────────────────
admin.get('/reports/withdrawals', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [summary, byStatus, topWithdrawers, recent, pendingList, feesTotal] = await Promise.all([
    db.prepare(
      `SELECT SUM(net_amount) as total_net, SUM(amount) as total_gross,
              SUM(fee) as total_fees, COUNT(*) as count,
              AVG(net_amount) as avg_amount,
              MAX(net_amount) as max_amount,
              MIN(net_amount) as min_amount
       FROM withdrawals WHERE status='completed' AND confirmed_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT status, COUNT(*) as count, SUM(net_amount) as total
       FROM withdrawals WHERE created_at BETWEEN ? AND ?
       GROUP BY status`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              COUNT(*) as wd_count, SUM(w.net_amount) as total_withdrawn
       FROM withdrawals w JOIN members m ON m.id=w.member_id
       WHERE w.status='completed' AND w.confirmed_at BETWEEN ? AND ?
       GROUP BY w.member_id ORDER BY total_withdrawn DESC LIMIT 20`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT w.*, m.first_name, m.last_name, m.unique_id
       FROM withdrawals w JOIN members m ON m.id=w.member_id
       WHERE w.created_at BETWEEN ? AND ?
       ORDER BY w.created_at DESC LIMIT 50`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT w.id, w.amount, w.net_amount, w.fee, w.paypal_email, w.created_at,
              m.first_name, m.last_name, m.unique_id
       FROM withdrawals w JOIN members m ON m.id=w.member_id
       WHERE w.status='pending' ORDER BY w.created_at ASC`
    ).all(),

    db.prepare(
      `SELECT SUM(fee) as total_fees, COUNT(*) as count
       FROM withdrawals WHERE status='completed' AND confirmed_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,
  ])

  return c.json({
    generated_at: new Date().toISOString(),
    period, label,
    summary: {
      total_net:    summary?.total_net    || 0,
      total_gross:  summary?.total_gross  || 0,
      total_fees:   feesTotal?.total_fees || 0,
      count:        summary?.count        || 0,
      avg_amount:   Math.round((summary?.avg_amount || 0) * 100) / 100,
      max_amount:   summary?.max_amount   || 0,
      min_amount:   summary?.min_amount   || 0,
    },
    by_status:      (byStatus as any).results    || [],
    top_withdrawers:(topWithdrawers as any).results || [],
    recent:         (recent as any).results      || [],
    pending_list:   (pendingList as any).results || [],
  })
})

// ── R-07 : Rapport Commissions Global ────────────────────────────────
admin.get('/reports/commissions', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [totalAll, totalPeriod, byTypeAll, byType, topEarnersAll, topEarners, monthly, pending, ratioVsCA] = await Promise.all([
    // ALL TIME
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COUNT(DISTINCT member_id) as beneficiaries,
              AVG(amount) as avg_commission
       FROM commissions`
    ).first() as any,

    // Période
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COUNT(DISTINCT member_id) as beneficiaries,
              AVG(amount) as avg_commission
       FROM commissions WHERE created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    // Par type — ALL TIME
    db.prepare(
      `SELECT type, COALESCE(SUM(amount),0) as total, COUNT(*) as count,
              COUNT(DISTINCT member_id) as beneficiaries, AVG(amount) as avg_amount
       FROM commissions
       GROUP BY type ORDER BY total DESC`
    ).all(),

    // Par type — période
    db.prepare(
      `SELECT type, COALESCE(SUM(amount),0) as total, COUNT(*) as count,
              COUNT(DISTINCT member_id) as beneficiaries, AVG(amount) as avg_amount
       FROM commissions WHERE created_at BETWEEN ? AND ?
       GROUP BY type ORDER BY total DESC`
    ).bind(start, end).all(),

    // Top earners — ALL TIME
    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              COALESCE(SUM(c.amount),0) as earned, COUNT(*) as count,
              COUNT(DISTINCT c.type) as types_earned
       FROM commissions c JOIN members m ON m.id=c.member_id
       GROUP BY c.member_id ORDER BY earned DESC LIMIT 20`
    ).all(),

    // Top earners — période
    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              COALESCE(SUM(c.amount),0) as earned, COUNT(*) as count,
              COUNT(DISTINCT c.type) as types_earned
       FROM commissions c JOIN members m ON m.id=c.member_id
       WHERE c.created_at BETWEEN ? AND ?
       GROUP BY c.member_id ORDER BY earned DESC LIMIT 20`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month,
              COALESCE(SUM(amount),0) as total, COUNT(*) as count
       FROM commissions
       GROUP BY month ORDER BY month DESC LIMIT 14`
    ).all(),

    db.prepare(
      `SELECT type, COALESCE(SUM(amount),0) as total, COUNT(*) as count
       FROM commissions WHERE status='pending'
       GROUP BY type ORDER BY total DESC`
    ).all(),

    db.prepare(
      `SELECT COALESCE(SUM(po.amount_usd),0) as ca
       FROM package_orders po WHERE po.status='validated'`
    ).first() as any,
  ])

  const ca   = ratioVsCA?.ca || 0
  const comm = totalAll?.total || 0

  return c.json({
    generated_at: new Date().toISOString(),
    period, label,
    summary: {
      // ALL TIME
      total:            comm,
      count:            totalAll?.count         || 0,
      beneficiaries:    totalAll?.beneficiaries || 0,
      avg_commission:   Math.round((totalAll?.avg_commission || 0) * 100) / 100,
      // Période
      total_period:     totalPeriod?.total      || 0,
      count_period:     totalPeriod?.count      || 0,
      ca_period:        ca,
      ratio_comm_vs_ca: ca > 0 ? Math.round((comm / ca) * 1000) / 10 : null,
    },
    by_type_all:   (byTypeAll as any).results      || [],
    by_type:       (byType as any).results          || [],
    top_earners_all:(topEarnersAll as any).results  || [],
    top_earners:   (topEarners as any).results      || [],
    monthly_trend: (monthly as any).results         || [],
    pending:       (pending as any).results         || [],
  })
})

// ── R-01 : Rapport Croissance Membres ────────────────────────────────
admin.get('/reports/members-growth', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [totalAll, newMembers, byStatus, byCountry, byRank, holdingTank,
         monthlyGrowth, kycStats, activationRate, topSponsors] = await Promise.all([
    // Totaux globaux ALL TIME
    db.prepare(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN license_active=1 THEN 1 ELSE 0 END) as with_license,
              SUM(CASE WHEN package_purchased=1 THEN 1 ELSE 0 END) as with_package,
              SUM(CASE WHEN activation_done=1 THEN 1 ELSE 0 END) as activated
       FROM members`
    ).first() as any,

    // Nouveaux membres sur la période
    db.prepare(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN license_active=1 THEN 1 ELSE 0 END) as with_license,
              SUM(CASE WHEN package_purchased=1 THEN 1 ELSE 0 END) as with_package
       FROM members WHERE created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT member_status, COUNT(*) as count
       FROM members GROUP BY member_status`
    ).all(),

    db.prepare(
      `SELECT country, COUNT(*) as count
       FROM members WHERE country IS NOT NULL
       GROUP BY country ORDER BY count DESC LIMIT 20`
    ).all(),

    db.prepare(
      `SELECT current_rank, COUNT(*) as count
       FROM members GROUP BY current_rank ORDER BY count DESC`
    ).all(),

    db.prepare(
      `SELECT COUNT(*) as cnt FROM members WHERE in_holding_tank=1`
    ).first() as any,

    db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as new_members
       FROM members GROUP BY month ORDER BY month DESC LIMIT 14`
    ).all(),

    db.prepare(
      `SELECT kyc_status, COUNT(*) as count FROM members GROUP BY kyc_status`
    ).all(),

    db.prepare(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN activation_done=1 THEN 1 ELSE 0 END) as activated
       FROM members WHERE created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT sp.first_name, sp.last_name, sp.unique_id, sp.current_rank,
              COUNT(*) as recruits
       FROM members m JOIN members sp ON sp.id=m.sponsor_id
       WHERE m.created_at BETWEEN ? AND ?
       GROUP BY m.sponsor_id ORDER BY recruits DESC LIMIT 10`
    ).bind(start, end).all(),
  ])

  const totalMbr   = totalAll?.total     || 0
  const activated  = totalAll?.activated || 0
  const actPeriod  = activationRate?.activated || 0
  const newPeriod  = activationRate?.total     || 0

  return c.json({
    generated_at: new Date().toISOString(),
    period, label,
    // Totaux ALL TIME
    totals: {
      total_members:    totalMbr,
      with_license:     totalAll?.with_license  || 0,
      with_package:     totalAll?.with_package  || 0,
      activated:        activated,
      in_holding_tank:  holdingTank?.cnt         || 0,
      activation_rate:  totalMbr > 0 ? Math.round((activated / totalMbr) * 1000) / 10 : 0,
    },
    // Nouveaux sur la période
    new_members: {
      total:            newMembers?.total        || 0,
      with_license:     newMembers?.with_license || 0,
      with_package:     newMembers?.with_package || 0,
      activation_rate:  newPeriod > 0 ? Math.round((actPeriod / newPeriod) * 1000) / 10 : 0,
      in_holding_tank:  holdingTank?.cnt         || 0,
    },
    by_status:       (byStatus as any).results      || [],
    by_country:      (byCountry as any).results     || [],
    by_rank:         (byRank as any).results        || [],
    monthly_growth:  (monthlyGrowth as any).results || [],
    kyc_stats:       (kycStats as any).results      || [],
    top_sponsors:    (topSponsors as any).results   || [],
  })
})

// ── R-04b : Rapport Membres par Mois ─────────────────────────────────
admin.get('/reports/members-monthly', requirePermission('reports.view'), async (c) => {
  const { month, page = '1', per_page = '30' } = c.req.query()
  const db = c.env.DB
  const targetMonth = month || new Date().toISOString().substring(0, 7)
  const start = targetMonth + '-01T00:00:00.000Z'
  const end   = targetMonth + '-31T23:59:59.999Z'
  const pg    = Math.max(1, parseInt(page))
  const pp    = Math.min(100, Math.max(10, parseInt(per_page)))
  const offset = (pg - 1) * pp

  const [summary, members, monthlyBreakdown, totalCount] = await Promise.all([
    db.prepare(
      `SELECT COUNT(*) as total_month,
              SUM(CASE WHEN license_active=1 THEN 1 ELSE 0 END) as with_license,
              SUM(CASE WHEN package_purchased=1 THEN 1 ELSE 0 END) as with_package,
              SUM(CASE WHEN kyc_status='verified' THEN 1 ELSE 0 END) as kyc_verified
       FROM members WHERE created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT m.id, m.unique_id, m.first_name, m.last_name, m.email,
              m.member_status, m.current_rank, m.license_active,
              m.package_type, m.kyc_status, m.created_at,
              sp.first_name||' '||sp.last_name as sponsor_name, sp.unique_id as sponsor_unique_id
       FROM members m
       LEFT JOIN members sp ON sp.id = m.sponsor_id
       WHERE m.created_at BETWEEN ? AND ?
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(start, end, pp, offset).all(),

    db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month,
              COUNT(*) as total,
              SUM(CASE WHEN license_active=1 THEN 1 ELSE 0 END) as with_license,
              SUM(CASE WHEN member_status='AMI' THEN 1 ELSE 0 END) as ami
       FROM members
       GROUP BY month ORDER BY month DESC LIMIT 24`
    ).all(),

    db.prepare(
      `SELECT COUNT(*) as cnt FROM members WHERE created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,
  ])

  return c.json({
    generated_at: new Date().toISOString(),
    target_month: targetMonth,
    summary: {
      total_month:   summary?.total_month   || 0,
      with_license:  summary?.with_license  || 0,
      with_package:  summary?.with_package  || 0,
      kyc_verified:  summary?.kyc_verified  || 0,
    },
    members:           (members as any).results        || [],
    monthly_breakdown: (monthlyBreakdown as any).results || [],
    total:             totalCount?.cnt || 0,
    page:              pg,
    per_page:          pp,
  })
})

// ── R-04c : Rapport Démographie ───────────────────────────────────────
admin.get('/reports/demographics', requirePermission('reports.view'), async (c) => {
  const db = c.env.DB

  const [ageStats, ageGroups, byCountryOrigin, byCountryResidence, avgAgeByRank, genderApprox] = await Promise.all([
    db.prepare(
      `SELECT
        COUNT(*) as total_with_birthdate,
        AVG(CAST((strftime('%Y%m%d','now') - strftime('%Y%m%d',birth_date)) / 10000 AS INTEGER)) as avg_age,
        MIN(CAST((strftime('%Y%m%d','now') - strftime('%Y%m%d',birth_date)) / 10000 AS INTEGER)) as min_age,
        MAX(CAST((strftime('%Y%m%d','now') - strftime('%Y%m%d',birth_date)) / 10000 AS INTEGER)) as max_age
       FROM members WHERE birth_date IS NOT NULL AND birth_date != ''`
    ).first() as any,

    db.prepare(
      `SELECT
        CASE
          WHEN age < 25 THEN '18-24 ans'
          WHEN age < 35 THEN '25-34 ans'
          WHEN age < 45 THEN '35-44 ans'
          WHEN age < 55 THEN '45-54 ans'
          WHEN age < 65 THEN '55-64 ans'
          ELSE '65+ ans'
        END as age_group,
        COUNT(*) as count
       FROM (
         SELECT CAST((strftime('%Y%m%d','now') - strftime('%Y%m%d',birth_date)) / 10000 AS INTEGER) as age
         FROM members WHERE birth_date IS NOT NULL AND birth_date != ''
       ) sub
       GROUP BY age_group ORDER BY MIN(age)`
    ).all(),

    db.prepare(
      `SELECT country_of_origin as country, COUNT(*) as count
       FROM members WHERE country_of_origin IS NOT NULL AND country_of_origin != ''
       GROUP BY country_of_origin ORDER BY count DESC LIMIT 25`
    ).all(),

    db.prepare(
      `SELECT country, COUNT(*) as count
       FROM members WHERE country IS NOT NULL AND country != ''
       GROUP BY country ORDER BY count DESC LIMIT 25`
    ).all(),

    db.prepare(
      `SELECT current_rank,
              AVG(CAST((strftime('%Y%m%d','now') - strftime('%Y%m%d',birth_date)) / 10000 AS INTEGER)) as avg_age,
              COUNT(*) as count
       FROM members WHERE birth_date IS NOT NULL AND birth_date != '' AND current_rank IS NOT NULL AND current_rank != 'none'
       GROUP BY current_rank ORDER BY avg_age DESC`
    ).all(),

    // Total membres sans info démographique
    db.prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN birth_date IS NOT NULL AND birth_date != '' THEN 1 ELSE 0 END) as with_birth_date,
        SUM(CASE WHEN country_of_origin IS NOT NULL AND country_of_origin != '' THEN 1 ELSE 0 END) as with_country_origin
       FROM members`
    ).first() as any,
  ])

  return c.json({
    generated_at: new Date().toISOString(),
    age: {
      total_with_birthdate: ageStats?.total_with_birthdate || 0,
      avg_age:   ageStats?.avg_age ? Math.round(ageStats.avg_age * 10) / 10 : null,
      min_age:   ageStats?.min_age || null,
      max_age:   ageStats?.max_age || null,
    },
    age_groups:           (ageGroups as any).results         || [],
    by_country_origin:    (byCountryOrigin as any).results   || [],
    by_country_residence: (byCountryResidence as any).results|| [],
    avg_age_by_rank:      (avgAgeByRank as any).results      || [],
    completeness: {
      total:               genderApprox?.total              || 0,
      with_birth_date:     genderApprox?.with_birth_date    || 0,
      with_country_origin: genderApprox?.with_country_origin|| 0,
    },
  })
})

// ── R-05 : Rapport BV (Business Volume) ──────────────────────────────
admin.get('/reports/bv', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [bvPersonnel, bvPersonnelPeriod, topGeneratorsAll, topGenerators, monthly, networkBalance, fastStart] = await Promise.all([

    // BV personnel ALL TIME = uniquement les achats réels (personal_purchase)
    // NB: bv_type='propagated' = propagation interne de l'arbre, pas un BV "nouveau"
    //     bv_type='fast_start_contribution' = contribution FS (vrai BV généré)
    //     → on expose les 3 séparément pour la transparence
    db.prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN bv_type='personal_purchase' THEN bv_amount ELSE 0 END),0)      as personal_bv,
        COALESCE(SUM(CASE WHEN bv_type='fast_start_contribution' THEN bv_amount ELSE 0 END),0) as fast_start_bv,
        COALESCE(SUM(CASE WHEN bv_type='propagated' THEN bv_amount ELSE 0 END),0)              as propagated_bv,
        COUNT(DISTINCT CASE WHEN bv_type='personal_purchase' THEN member_id END)               as contributors,
        COUNT(*) as total_entries
       FROM bv_logs`
    ).first() as any,

    // BV période sélectionnée
    db.prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN bv_type='personal_purchase' THEN bv_amount ELSE 0 END),0)      as personal_bv,
        COALESCE(SUM(CASE WHEN bv_type='fast_start_contribution' THEN bv_amount ELSE 0 END),0) as fast_start_bv,
        COUNT(DISTINCT CASE WHEN bv_type='personal_purchase' THEN member_id END)               as contributors
       FROM bv_logs WHERE created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    // Top générateurs BV personnel (achats réels) — ALL TIME
    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank, m.member_status,
              COALESCE(SUM(bl.bv_amount),0) as bv_total, COUNT(*) as entries
       FROM bv_logs bl JOIN members m ON m.id=bl.member_id
       WHERE bl.bv_type='personal_purchase'
       GROUP BY bl.member_id ORDER BY bv_total DESC LIMIT 20`
    ).all(),

    // Top générateurs BV personnel — période
    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank, m.member_status,
              COALESCE(SUM(bl.bv_amount),0) as bv_total, COUNT(*) as entries
       FROM bv_logs bl JOIN members m ON m.id=bl.member_id
       WHERE bl.bv_type='personal_purchase' AND bl.created_at BETWEEN ? AND ?
       GROUP BY bl.member_id ORDER BY bv_total DESC LIMIT 20`
    ).bind(start, end).all(),

    // Tendance mensuelle (BV personnel uniquement)
    db.prepare(
      `SELECT period, COALESCE(SUM(bv_amount),0) as total, COUNT(DISTINCT member_id) as contributors
       FROM bv_logs WHERE bv_type='personal_purchase'
       GROUP BY period ORDER BY period DESC LIMIT 14`
    ).all(),

    // Jambes réseau = valeur du membre utero 1 (Willy, 1er enfant direct de ROOT)
    // C'est la SEULE source de vérité pour left/right BV réseau.
    // SUM(left_bv_total) de tous les membres = double-comptage car chaque nœud
    // cumule le BV de toute sa sous-arbre.
    db.prepare(
      `SELECT
        COALESCE(left_bv_total,0)    as left_total,
        COALESCE(right_bv_total,0)   as right_total,
        COALESCE(left_bv_monthly,0)  as left_monthly,
        COALESCE(right_bv_monthly,0) as right_monthly,
        unique_id, first_name, last_name
       FROM members WHERE unique_id = 'ROOT'`
    ).first() as any,

    db.prepare(
      `SELECT COUNT(*) as in_progress,
              SUM(CASE WHEN fast_start_completed=1 THEN 1 ELSE 0 END) as completed
       FROM members WHERE fast_start_start_date IS NOT NULL AND unique_id != 'ROOT'`
    ).first() as any,
  ])

  return c.json({
    generated_at: new Date().toISOString(),
    period, label,
    summary: {
      // BV personnel réel ALL TIME (achats uniquement, sans propagations)
      total_bv:        bvPersonnel?.personal_bv   || 0,
      fast_start_bv:   bvPersonnel?.fast_start_bv || 0,
      propagated_bv:   bvPersonnel?.propagated_bv || 0,
      contributors:    bvPersonnel?.contributors  || 0,
      total_entries:   bvPersonnel?.total_entries || 0,
      // Période
      total_bv_period: bvPersonnelPeriod?.personal_bv   || 0,
      fast_start_period: bvPersonnelPeriod?.fast_start_bv || 0,
    },
    by_type_all:    [],
    by_type:        [],
    top_generators_all: (topGeneratorsAll as any).results || [],
    top_generators: (topGenerators as any).results    || [],
    monthly_trend:  (monthly as any).results          || [],
    network_balance: {
      // Jambes gauche/droite du réseau = valeur de l'utero 1 (Willy LAGARRIGUE)
      left_monthly:    networkBalance?.left_monthly  || 0,
      right_monthly:   networkBalance?.right_monthly || 0,
      left_total:      networkBalance?.left_total    || 0,
      right_total:     networkBalance?.right_total   || 0,
      root_member:     networkBalance ? `${networkBalance.first_name} ${networkBalance.last_name} (${networkBalance.unique_id})` : '',
    },
    fast_start: {
      in_progress: fastStart?.in_progress || 0,
      completed:   fastStart?.completed   || 0,
    },
  })
})

// ── R-13 : Rapport Wallets & Liquidité ───────────────────────────────
admin.get('/reports/wallets', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [walletStats, topWallets, txSummary, txByType, txTrend, pendingStats] = await Promise.all([
    db.prepare(
      `SELECT COALESCE(SUM(balance),0) as total_balance,
              COALESCE(SUM(pending_balance),0) as total_pending,
              COALESCE(SUM(total_earned),0) as total_earned,
              COALESCE(SUM(total_withdrawn),0) as total_withdrawn,
              AVG(balance) as avg_balance,
              MAX(balance) as max_balance,
              COUNT(*) as total_wallets,
              SUM(CASE WHEN balance=0 THEN 1 ELSE 0 END) as empty_wallets
       FROM wallets`
    ).first() as any,

    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              w.balance, w.pending_balance,
              (w.balance + w.pending_balance) as total
       FROM wallets w JOIN members m ON m.id=w.member_id
       ORDER BY total DESC LIMIT 20`
    ).all(),

    db.prepare(
      `SELECT SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_credits,
              SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_debits,
              COUNT(*) as total_tx,
              COUNT(DISTINCT member_id) as members_active
       FROM wallet_transactions WHERE created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT transaction_type, COUNT(*) as count, SUM(ABS(amount)) as volume
       FROM wallet_transactions WHERE created_at BETWEEN ? AND ?
       GROUP BY transaction_type ORDER BY volume DESC`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month,
              SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as credits,
              SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as debits,
              COUNT(*) as count
       FROM wallet_transactions
       GROUP BY month ORDER BY month DESC LIMIT 14`
    ).all(),

    db.prepare(
      `SELECT COUNT(*) as count, SUM(total_amount) as total
       FROM pending_wallet_entries WHERE status='pending'`
    ).first() as any,
  ])

  return c.json({
    generated_at: new Date().toISOString(),
    period, label,
    wallets: {
      total_balance:   walletStats?.total_balance   || 0,
      total_pending:   walletStats?.total_pending   || 0,
      total_earned:    walletStats?.total_earned    || 0,
      total_withdrawn: walletStats?.total_withdrawn || 0,
      avg_balance:     Math.round((walletStats?.avg_balance || 0) * 100) / 100,
      max_balance:     walletStats?.max_balance     || 0,
      total_wallets:   walletStats?.total_wallets   || 0,
      empty_wallets:   walletStats?.empty_wallets   || 0,
    },
    top_wallets:    (topWallets as any).results  || [],
    transactions: {
      total_credits:  txSummary?.total_credits  || 0,
      total_debits:   txSummary?.total_debits   || 0,
      total_tx:       txSummary?.total_tx       || 0,
      members_active: txSummary?.members_active || 0,
    },
    by_type:        (txByType as any).results   || [],
    monthly_trend:  (txTrend as any).results    || [],
    pending_entries:{
      count: pendingStats?.count || 0,
      total: pendingStats?.total || 0,
    },
  })
})

// ── R-06 : Rapport Licences Finstrategia ─────────────────────────────
admin.get('/reports/licenses', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [snapshot, newLicenses, byStatus, expiring30, expiring7,
         revenueTotal, avgValidation, recentLicenses] = await Promise.all([
    db.prepare(
      `SELECT
        SUM(CASE WHEN status='active'  THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status='expired' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN status='pending' OR status='proof_submitted' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected,
        COUNT(*) as total
       FROM finstrategia_licenses`
    ).first() as any,

    db.prepare(
      `SELECT COUNT(*) as count, SUM(price_usd) as revenue
       FROM finstrategia_licenses WHERE status='active' AND validated_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT status, COUNT(*) as count, SUM(price_usd) as revenue
       FROM finstrategia_licenses WHERE created_at BETWEEN ? AND ?
       GROUP BY status`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT COUNT(*) as cnt FROM finstrategia_licenses
       WHERE status='active' AND expires_at BETWEEN datetime('now') AND datetime('now','+30 days')`
    ).first() as any,

    db.prepare(
      `SELECT COUNT(*) as cnt FROM finstrategia_licenses
       WHERE status='active' AND expires_at BETWEEN datetime('now') AND datetime('now','+7 days')`
    ).first() as any,

    db.prepare(
      `SELECT SUM(price_usd) as total, COUNT(*) as count
       FROM finstrategia_licenses WHERE status='active'`
    ).first() as any,

    db.prepare(
      `SELECT AVG((julianday(validated_at) - julianday(created_at)) * 24) as avg_hours
       FROM finstrategia_licenses WHERE status='active' AND validated_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT fl.*, m.first_name, m.last_name, m.unique_id, m.current_rank
       FROM finstrategia_licenses fl JOIN members m ON m.id=fl.member_id
       WHERE fl.created_at BETWEEN ? AND ?
       ORDER BY fl.created_at DESC LIMIT 30`
    ).bind(start, end).all(),
  ])

  return c.json({
    generated_at: new Date().toISOString(),
    period, label,
    snapshot: {
      active:          snapshot?.active    || 0,
      expired:         snapshot?.expired   || 0,
      pending:         snapshot?.pending   || 0,
      rejected:        snapshot?.rejected  || 0,
      total:           snapshot?.total     || 0,
    },
    period_activity: {
      new_licenses:    newLicenses?.count   || 0,
      revenue_period:  newLicenses?.revenue || 0,
      avg_validation_hours: Math.round((avgValidation?.avg_hours || 0) * 10) / 10,
    },
    revenue_total: {
      total:           revenueTotal?.total  || 0,
      count:           revenueTotal?.count  || 0,
    },
    alerts: {
      expiring_7d:     expiring7?.cnt   || 0,
      expiring_30d:    expiring30?.cnt  || 0,
    },
    by_status:         (byStatus as any).results       || [],
    recent_licenses:   (recentLicenses as any).results || [],
  })
})

// ══════════════════════════════════════════════════════════════════════
// SYSTÈME DE RAPPORTS — Phase 4 : rapports globaux secondaires
// ══════════════════════════════════════════════════════════════════════

// ── R-08 : Rapport Prime Leadership ──────────────────────────────────
admin.get('/reports/leadership', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [summaryAll, summary, byRankAll, byRank, topBeneficiariesAll, topBeneficiaries, monthly, monthlyValidations] = await Promise.all([
    // ALL TIME
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COUNT(DISTINCT member_id) as beneficiaries,
              AVG(amount) as avg_amount, MAX(amount) as max_amount
       FROM commissions WHERE type='prime_leadership'`
    ).first() as any,

    // Période
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COUNT(DISTINCT member_id) as beneficiaries,
              AVG(amount) as avg_amount, MAX(amount) as max_amount
       FROM commissions WHERE type='prime_leadership' AND created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    // Par rang — ALL TIME
    db.prepare(
      `SELECT rank_at_time, COALESCE(SUM(amount),0) as total, COUNT(*) as count, AVG(amount) as avg
       FROM commissions WHERE type='prime_leadership'
       GROUP BY rank_at_time ORDER BY total DESC`
    ).all(),

    // Par rang — période
    db.prepare(
      `SELECT rank_at_time, COALESCE(SUM(amount),0) as total, COUNT(*) as count, AVG(amount) as avg
       FROM commissions WHERE type='prime_leadership' AND created_at BETWEEN ? AND ?
       GROUP BY rank_at_time ORDER BY total DESC`
    ).bind(start, end).all(),

    // Top bénéficiaires — ALL TIME
    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              COALESCE(SUM(c.amount),0) as earned, COUNT(*) as count, MAX(c.amount) as best_month
       FROM commissions c JOIN members m ON m.id=c.member_id
       WHERE c.type='prime_leadership'
       GROUP BY c.member_id ORDER BY earned DESC LIMIT 20`
    ).all(),

    // Top bénéficiaires — période
    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              COALESCE(SUM(c.amount),0) as earned, COUNT(*) as count, MAX(c.amount) as best_month
       FROM commissions c JOIN members m ON m.id=c.member_id
       WHERE c.type='prime_leadership' AND c.created_at BETWEEN ? AND ?
       GROUP BY c.member_id ORDER BY earned DESC LIMIT 20`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total, COUNT(DISTINCT member_id) as beneficiaries
       FROM commissions WHERE type='prime_leadership' AND status IN ('approved','paid')
       GROUP BY month ORDER BY month DESC LIMIT 14`
    ).all(),

    db.prepare(
      `SELECT period, SUM(leadership_prime) as total_prime, COUNT(*) as members_validated
       FROM monthly_validations GROUP BY period ORDER BY period DESC LIMIT 14`
    ).all(),
  ])

  return c.json({
    generated_at: new Date().toISOString(), period, label,
    summary: {
      total:         summaryAll?.total        || 0,
      count:         summaryAll?.count        || 0,
      beneficiaries: summaryAll?.beneficiaries|| 0,
      avg:           Math.round((summaryAll?.avg_amount || 0) * 100) / 100,
      max:           summaryAll?.max_amount   || 0,
      period_total:  summary?.total           || 0,
    },
    by_rank_all:          (byRankAll as any).results             || [],
    by_rank:              (byRank as any).results                || [],
    top_beneficiaries_all:(topBeneficiariesAll as any).results   || [],
    top_beneficiaries:    (topBeneficiaries as any).results      || [],
    monthly_trend:        (monthly as any).results               || [],
    monthly_validations:  (monthlyValidations as any).results    || [],
  })
})

// ── R-09 : Rapport Bonus Influence & Rayonnement ──────────────────────
admin.get('/reports/bonuses', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [influenceAll, influence, rayonnementAll, rayonnement, topInfluenceAll, topInfluence, topRayonnementAll, topRayonnement, trend] = await Promise.all([
    // ALL TIME
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COUNT(DISTINCT member_id) as beneficiaries, AVG(amount) as avg
       FROM commissions WHERE type='bonus_influence'`
    ).first() as any,

    // Période
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COUNT(DISTINCT member_id) as beneficiaries, AVG(amount) as avg
       FROM commissions WHERE type='bonus_influence' AND created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    // ALL TIME
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COUNT(DISTINCT member_id) as beneficiaries, AVG(amount) as avg
       FROM commissions WHERE type='bonus_rayonnement'`
    ).first() as any,

    // Période
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COUNT(DISTINCT member_id) as beneficiaries, AVG(amount) as avg
       FROM commissions WHERE type='bonus_rayonnement' AND created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    // Top influence — ALL TIME
    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank, COALESCE(SUM(c.amount),0) as earned
       FROM commissions c JOIN members m ON m.id=c.member_id
       WHERE c.type='bonus_influence'
       GROUP BY c.member_id ORDER BY earned DESC LIMIT 10`
    ).all(),

    // Top influence — période
    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank, COALESCE(SUM(c.amount),0) as earned
       FROM commissions c JOIN members m ON m.id=c.member_id
       WHERE c.type='bonus_influence' AND c.created_at BETWEEN ? AND ?
       GROUP BY c.member_id ORDER BY earned DESC LIMIT 10`
    ).bind(start, end).all(),

    // Top rayonnement — ALL TIME
    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank, COALESCE(SUM(c.amount),0) as earned
       FROM commissions c JOIN members m ON m.id=c.member_id
       WHERE c.type='bonus_rayonnement'
       GROUP BY c.member_id ORDER BY earned DESC LIMIT 10`
    ).all(),

    // Top rayonnement — période
    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank, COALESCE(SUM(c.amount),0) as earned
       FROM commissions c JOIN members m ON m.id=c.member_id
       WHERE c.type='bonus_rayonnement' AND c.created_at BETWEEN ? AND ?
       GROUP BY c.member_id ORDER BY earned DESC LIMIT 10`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month,
              SUM(CASE WHEN type='bonus_influence' THEN amount ELSE 0 END) as influence_total,
              SUM(CASE WHEN type='bonus_rayonnement' THEN amount ELSE 0 END) as rayonnement_total
       FROM commissions WHERE type IN ('bonus_influence','bonus_rayonnement') AND status IN ('approved','paid')
       GROUP BY month ORDER BY month DESC LIMIT 14`
    ).all(),
  ])

  return c.json({
    generated_at: new Date().toISOString(), period, label,
    influence: {
      total:         influenceAll?.total        || 0,
      count:         influenceAll?.count        || 0,
      beneficiaries: influenceAll?.beneficiaries|| 0,
      avg:           Math.round((influenceAll?.avg || 0) * 100) / 100,
      period_total:  influence?.total           || 0,
    },
    rayonnement: {
      total:         rayonnementAll?.total        || 0,
      count:         rayonnementAll?.count        || 0,
      beneficiaries: rayonnementAll?.beneficiaries|| 0,
      avg:           Math.round((rayonnementAll?.avg || 0) * 100) / 100,
      period_total:  rayonnement?.total           || 0,
    },
    top_influence_all:    (topInfluenceAll as any).results    || [],
    top_influence:        (topInfluence as any).results       || [],
    top_rayonnement_all:  (topRayonnementAll as any).results  || [],
    top_rayonnement:      (topRayonnement as any).results     || [],
    monthly_trend:        (trend as any).results              || [],
  })
})

// ── R-10 : Rapport Valorisation Recommandation ────────────────────────
admin.get('/reports/vr', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [summaryAll, summary, topSponsorsAll, topSponsors, trend, recentVR] = await Promise.all([
    // ALL TIME
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COUNT(DISTINCT member_id) as beneficiaries,
              AVG(amount) as avg, MAX(amount) as max
       FROM commissions WHERE type='valorisation_recommandation'`
    ).first() as any,

    // Période
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COUNT(DISTINCT member_id) as beneficiaries,
              AVG(amount) as avg, MAX(amount) as max
       FROM commissions WHERE type='valorisation_recommandation' AND created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    // Top sponsors — ALL TIME
    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              COALESCE(SUM(c.amount),0) as earned, COUNT(*) as recruits_rewarded
       FROM commissions c JOIN members m ON m.id=c.member_id
       WHERE c.type='valorisation_recommandation'
       GROUP BY c.member_id ORDER BY recruits_rewarded DESC LIMIT 20`
    ).all(),

    // Top sponsors — période
    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              COALESCE(SUM(c.amount),0) as earned, COUNT(*) as recruits_rewarded
       FROM commissions c JOIN members m ON m.id=c.member_id
       WHERE c.type='valorisation_recommandation' AND c.created_at BETWEEN ? AND ?
       GROUP BY c.member_id ORDER BY recruits_rewarded DESC LIMIT 20`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total, COUNT(*) as count
       FROM commissions WHERE type='valorisation_recommandation' AND status IN ('approved','paid')
       GROUP BY month ORDER BY month DESC LIMIT 14`
    ).all(),

    db.prepare(
      `SELECT c.amount, c.created_at, c.rank_at_time,
              m.first_name, m.last_name, m.unique_id,
              src.first_name as recruit_first, src.last_name as recruit_last, src.unique_id as recruit_uid
       FROM commissions c
       JOIN members m ON m.id=c.member_id
       LEFT JOIN members src ON src.id=c.source_member_id
       WHERE c.type='valorisation_recommandation' AND c.status IN ('approved','paid') AND c.created_at BETWEEN ? AND ?
       ORDER BY c.created_at DESC LIMIT 30`
    ).bind(start, end).all(),
  ])

  return c.json({
    generated_at: new Date().toISOString(), period, label,
    summary: {
      total:         summaryAll?.total        || 0,
      count:         summaryAll?.count        || 0,
      beneficiaries: summaryAll?.beneficiaries|| 0,
      avg:           Math.round((summaryAll?.avg || 0) * 100) / 100,
      max:           summaryAll?.max          || 0,
      period_total:  summary?.total           || 0,
    },
    top_sponsors_all: (topSponsorsAll as any).results || [],
    top_sponsors:     (topSponsors as any).results    || [],
    monthly_trend:    (trend as any).results          || [],
    recent:           (recentVR as any).results       || [],
  })
})

// ── R-11 : Rapport Fast Start ─────────────────────────────────────────
admin.get('/reports/fast-start', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [commSummaryAll, commSummary, statusSummary, topPerformersAll, topPerformers, trend, inProgress] = await Promise.all([
    // ALL TIME
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COUNT(DISTINCT member_id) as beneficiaries
       FROM commissions WHERE type='fast_start'`
    ).first() as any,

    // Période
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COUNT(DISTINCT member_id) as beneficiaries
       FROM commissions WHERE type='fast_start' AND created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT
        SUM(CASE WHEN fast_start_completed=1 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN fast_start_start_date IS NOT NULL AND fast_start_completed=0 THEN 1 ELSE 0 END) as in_progress,
        COUNT(*) as total_started
       FROM members WHERE fast_start_start_date IS NOT NULL`
    ).first() as any,

    // Top ALL TIME
    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              COALESCE(SUM(c.amount),0) as fs_earned, COUNT(*) as fs_count
       FROM commissions c JOIN members m ON m.id=c.member_id
       WHERE c.type='fast_start'
       GROUP BY c.member_id ORDER BY fs_earned DESC LIMIT 10`
    ).all(),

    // Top période
    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              COALESCE(SUM(c.amount),0) as fs_earned, COUNT(*) as fs_count
       FROM commissions c JOIN members m ON m.id=c.member_id
       WHERE c.type='fast_start' AND c.created_at BETWEEN ? AND ?
       GROUP BY c.member_id ORDER BY fs_earned DESC LIMIT 10`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(amount),0) as total, COUNT(DISTINCT member_id) as members
       FROM commissions WHERE type='fast_start'
       GROUP BY month ORDER BY month DESC LIMIT 14`
    ).all(),

    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.fast_start_start_date, m.fast_start_bv,
              (julianday('now') - julianday(m.fast_start_start_date)) as days_elapsed
       FROM members m WHERE m.fast_start_start_date IS NOT NULL AND m.fast_start_completed=0
       ORDER BY days_elapsed DESC LIMIT 20`
    ).all(),
  ])

  const completed = statusSummary?.completed    || 0
  const started   = statusSummary?.total_started|| 0

  return c.json({
    generated_at: new Date().toISOString(), period, label,
    commissions: {
      total:         commSummaryAll?.total        || 0,
      count:         commSummaryAll?.count        || 0,
      beneficiaries: commSummaryAll?.beneficiaries|| 0,
      period_total:  commSummary?.total           || 0,
    },
    status: {
      completed,
      in_progress:    statusSummary?.in_progress  || 0,
      total_started:  started,
      completion_rate:started > 0 ? Math.round((completed / started) * 1000) / 10 : 0,
    },
    top_performers_all: (topPerformersAll as any).results || [],
    top_performers:     (topPerformers as any).results    || [],
    monthly_trend:      (trend as any).results            || [],
    in_progress_members:(inProgress as any).results       || [],
  })
})

// ── R-12 : Rapport Réserve Stratégique ───────────────────────────────
admin.get('/reports/reserve', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [commSummaryAll, commSummary, stockSummary, topHolders, unlocked, commTrend] = await Promise.all([
    // RS commissions ALL TIME
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COUNT(DISTINCT member_id) as members
       FROM commissions WHERE type='reserve_strategique'`
    ).first() as any,

    // RS commissions période
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COUNT(DISTINCT member_id) as members
       FROM commissions WHERE type='reserve_strategique' AND created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total_stock,
              COALESCE(SUM(CASE WHEN status='locked' THEN amount ELSE 0 END),0) as locked,
              COALESCE(SUM(CASE WHEN unlocked_at IS NOT NULL THEN amount ELSE 0 END),0) as unlocked,
              COUNT(DISTINCT member_id) as members_with_rs
       FROM reserve_strategique`
    ).first() as any,

    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              SUM(rs.amount) as total_rs,
              SUM(CASE WHEN rs.unlocked_at IS NULL THEN rs.amount ELSE 0 END) as locked
       FROM reserve_strategique rs JOIN members m ON m.id=rs.member_id
       GROUP BY rs.member_id ORDER BY total_rs DESC LIMIT 20`
    ).all(),

    db.prepare(
      `SELECT SUM(amount) as total, COUNT(*) as count
       FROM reserve_strategique WHERE unlocked_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total, COUNT(DISTINCT member_id) as members
       FROM commissions WHERE type='reserve_strategique'
       GROUP BY month ORDER BY month DESC LIMIT 14`
    ).all(),
  ])

  return c.json({
    generated_at: new Date().toISOString(), period, label,
    new_reserves: {
      total:        commSummaryAll?.total   || 0,
      count:        commSummaryAll?.count   || 0,
      members:      commSummaryAll?.members || 0,
      period_total: commSummary?.total      || 0,
      period_count: commSummary?.count      || 0,
    },
    stock: {
      total:   stockSummary?.total_stock    || 0,
      locked:  stockSummary?.locked         || 0,
      unlocked:stockSummary?.unlocked       || 0,
      members: stockSummary?.members_with_rs|| 0,
    },
    unlocked_period: { total: unlocked?.total || 0, count: unlocked?.count || 0 },
    top_holders: (topHolders as any).results || [],
    monthly_trend: (commTrend as any).results || [],
  })
})

// ── R-16 : Rapport Crédit Croissance ─────────────────────────────────
admin.get('/reports/credit-croissance', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [stock, txSummary, withdrawalsSummary, pending, topHolders, trend] = await Promise.all([
    db.prepare(
      `SELECT SUM(amount - used_amount) as total_balance, COUNT(DISTINCT member_id) as members,
              AVG(amount - used_amount) as avg_balance, MAX(amount - used_amount) as max_balance
       FROM credit_croissance WHERE (amount - used_amount) > 0 AND status='held'`
    ).first() as any,

    db.prepare(
      `SELECT type, SUM(amount) as total, COUNT(*) as count
       FROM cc_transactions WHERE created_at BETWEEN ? AND ?
       GROUP BY type`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT status, SUM(amount) as total, COUNT(*) as count
       FROM cc_withdrawals WHERE created_at BETWEEN ? AND ?
       GROUP BY status`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT w.id, w.amount, w.status, w.created_at,
              m.first_name, m.last_name, m.unique_id
       FROM cc_withdrawals w JOIN members m ON m.id=w.member_id
       WHERE w.status='pending' ORDER BY w.created_at ASC`
    ).all(),

    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              SUM(cc.amount - cc.used_amount) as balance
       FROM credit_croissance cc JOIN members m ON m.id=cc.member_id
       WHERE cc.status='held'
       GROUP BY m.id ORDER BY balance DESC LIMIT 20`
    ).all(),

    db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month,
              SUM(CASE WHEN type='credit' THEN amount ELSE 0 END) as credits,
              SUM(CASE WHEN type='debit'  THEN amount ELSE 0 END) as debits
       FROM cc_transactions GROUP BY month ORDER BY month DESC LIMIT 14`
    ).all(),
  ])

  return c.json({
    generated_at: new Date().toISOString(), period, label,
    stock: { total_balance: stock?.total_balance || 0, members: stock?.members || 0, avg_balance: Math.round((stock?.avg_balance || 0) * 100) / 100, max_balance: stock?.max_balance || 0 },
    transactions: (txSummary as any).results || [],
    withdrawals: (withdrawalsSummary as any).results || [],
    pending_withdrawals: (pending as any).results || [],
    top_holders: (topHolders as any).results || [],
    monthly_trend: (trend as any).results || [],
  })
})

// ── R-17 : Rapport Structure Binaire ─────────────────────────────────
admin.get('/reports/binary-tree', requirePermission('reports.view'), async (c) => {
  const db = c.env.DB

  const [networkBalance, depthStats, orphans, topBalanced, holdingTank, withBothLegs] = await Promise.all([
    // Balance réseau = valeur du membre utero 1 (racine opérationnelle = Willy LDR994691)
    // ️ SUM de tous les membres = double-comptage dans un arbre binaire
    db.prepare(
      `SELECT
        COALESCE(left_bv_total,0)    as total_left,
        COALESCE(right_bv_total,0)   as total_right,
        COALESCE(left_bv_monthly,0)  as monthly_left,
        COALESCE(right_bv_monthly,0) as monthly_right,
        ABS(COALESCE(left_bv_total,0) - COALESCE(right_bv_total,0)) as avg_imbalance
       FROM members WHERE unique_id = 'ROOT'`
    ).first() as any,

    db.prepare(
      `SELECT
        COUNT(*) as total_members,
        SUM(CASE WHEN binary_parent_id IS NULL THEN 1 ELSE 0 END) as root_members,
        SUM(CASE WHEN binary_left_id IS NOT NULL AND binary_right_id IS NOT NULL THEN 1 ELSE 0 END) as full_nodes,
        SUM(CASE WHEN binary_left_id IS NULL AND binary_right_id IS NULL AND binary_parent_id IS NOT NULL THEN 1 ELSE 0 END) as leaf_nodes
       FROM members`
    ).first() as any,

    db.prepare(
      `SELECT COUNT(*) as cnt FROM members m
       WHERE m.sponsor_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM members sp WHERE sp.id=m.sponsor_id AND sp.license_active=1)`
    ).first() as any,

    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              m.left_bv_total, m.right_bv_total,
              ABS(m.left_bv_total - m.right_bv_total) as imbalance,
              MIN(m.left_bv_total, m.right_bv_total) as weaker_leg
       FROM members m WHERE m.left_bv_total > 0 AND m.right_bv_total > 0
       ORDER BY weaker_leg DESC LIMIT 20`
    ).all(),

    db.prepare(
      `SELECT COUNT(*) as cnt FROM holding_tank WHERE status='waiting'`
    ).first() as any,

    db.prepare(
      `SELECT COUNT(*) as cnt FROM members WHERE binary_left_id IS NOT NULL AND binary_right_id IS NOT NULL`
    ).first() as any,
  ])

  return c.json({
    generated_at: new Date().toISOString(),
    network: {
      total_left_bv:   networkBalance?.total_left   || 0,
      total_right_bv:  networkBalance?.total_right  || 0,
      monthly_left:    networkBalance?.monthly_left || 0,
      monthly_right:   networkBalance?.monthly_right|| 0,
      avg_imbalance:   Math.round((networkBalance?.avg_imbalance || 0) * 100) / 100,
      balance_ratio:   networkBalance?.total_left && networkBalance?.total_right
        ? Math.round((Math.min(networkBalance.total_left, networkBalance.total_right) /
            Math.max(networkBalance.total_left, networkBalance.total_right)) * 1000) / 10
        : 0,
    },
    structure: {
      total_members:  depthStats?.total_members || 0,
      root_members:   depthStats?.root_members  || 0,
      full_nodes:     depthStats?.full_nodes    || 0,
      leaf_nodes:     depthStats?.leaf_nodes    || 0,
      with_both_legs: withBothLegs?.cnt         || 0,
      in_holding_tank:holdingTank?.cnt          || 0,
      orphan_sponsors:orphans?.cnt              || 0,
    },
    top_balanced_nodes: (topBalanced as any).results || [],
  })
})

// ── R-18 : Rapport Parrainage & Recrutement ───────────────────────────
admin.get('/reports/sponsorship', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [summary, topRecruiters, byMethod, monthlyRecruit, noDownline, deepRecruits] = await Promise.all([
    db.prepare(
      `SELECT COUNT(*) as new_members,
              COUNT(DISTINCT sponsor_id) as active_sponsors,
              AVG(CASE WHEN sponsor_id IS NOT NULL THEN 1 ELSE 0 END) * 100 as pct_sponsored
       FROM members WHERE created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT sp.first_name, sp.last_name, sp.unique_id, sp.current_rank, sp.member_status,
              COUNT(*) as recruits, SUM(CASE WHEN m.license_active=1 THEN 1 ELSE 0 END) as active_recruits
       FROM members m JOIN members sp ON sp.id=m.sponsor_id
       WHERE m.created_at BETWEEN ? AND ?
       GROUP BY m.sponsor_id ORDER BY recruits DESC LIMIT 20`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT registration_method, COUNT(*) as count
       FROM members WHERE created_at BETWEEN ? AND ?
       GROUP BY registration_method`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as new_members,
              COUNT(DISTINCT sponsor_id) as sponsors_active
       FROM members GROUP BY month ORDER BY month DESC LIMIT 14`
    ).all(),

    db.prepare(
      `SELECT COUNT(*) as cnt FROM members m
       WHERE NOT EXISTS (SELECT 1 FROM members sub WHERE sub.sponsor_id=m.id)
         AND m.license_active=1`
    ).first() as any,

    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, sp.first_name as sp_first, sp.last_name as sp_last, m.created_at
       FROM members m LEFT JOIN members sp ON sp.id=m.sponsor_id
       WHERE m.created_at BETWEEN ? AND ? ORDER BY m.created_at DESC LIMIT 30`
    ).bind(start, end).all(),
  ])

  return c.json({
    generated_at: new Date().toISOString(), period, label,
    summary: { new_members: summary?.new_members || 0, active_sponsors: summary?.active_sponsors || 0, no_downline_active: noDownline?.cnt || 0 },
    top_recruiters: (topRecruiters as any).results || [],
    by_method: (byMethod as any).results || [],
    monthly_trend: (monthlyRecruit as any).results || [],
    recent_recruits: (deepRecruits as any).results || [],
  })
})

// ── R-19 : Rapport Support Tickets ────────────────────────────────────
admin.get('/reports/support', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [summary, byStatus, byCategory, byPriority, topAgents, avgResolution, satisfaction, trend, pending] = await Promise.all([
    db.prepare(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status='resolved' OR status='closed' THEN 1 ELSE 0 END) as resolved
       FROM support_tickets WHERE created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT status, COUNT(*) as count FROM support_tickets WHERE created_at BETWEEN ? AND ? GROUP BY status`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT category, COUNT(*) as count, AVG(rating) as avg_rating
       FROM support_tickets WHERE created_at BETWEEN ? AND ? GROUP BY category ORDER BY count DESC`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT priority, COUNT(*) as count FROM support_tickets WHERE created_at BETWEEN ? AND ? GROUP BY priority ORDER BY count DESC`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT au.name, au.email, COUNT(*) as handled,
              SUM(CASE WHEN st.status IN ('resolved','closed') THEN 1 ELSE 0 END) as resolved,
              AVG(st.rating) as avg_rating
       FROM support_tickets st JOIN admin_users au ON au.id=st.assigned_to
       WHERE st.created_at BETWEEN ? AND ?
       GROUP BY st.assigned_to ORDER BY handled DESC LIMIT 10`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 24) as avg_hours
       FROM support_tickets WHERE resolved_at IS NOT NULL AND created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as rated, MIN(rating) as min, MAX(rating) as max
       FROM support_tickets WHERE rating IS NOT NULL AND created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as total,
              SUM(CASE WHEN status IN ('resolved','closed') THEN 1 ELSE 0 END) as resolved
       FROM support_tickets GROUP BY month ORDER BY month DESC LIMIT 14`
    ).all(),

    db.prepare(
      `SELECT st.id, st.ticket_number, st.subject, st.category, st.priority, st.status, st.created_at,
              m.first_name, m.last_name, m.unique_id
       FROM support_tickets st JOIN members m ON m.id=st.member_id
       WHERE st.status IN ('open','in_progress') ORDER BY st.priority DESC, st.created_at ASC LIMIT 20`
    ).all(),
  ])

  const total    = summary?.total    || 0
  const resolved = summary?.resolved || 0

  return c.json({
    generated_at: new Date().toISOString(), period, label,
    summary: { total, resolved, open: total - resolved, resolution_rate: total > 0 ? Math.round((resolved / total) * 1000) / 10 : 0, avg_resolution_hours: Math.round((avgResolution?.avg_hours || 0) * 10) / 10 },
    by_status: (byStatus as any).results || [],
    by_category: (byCategory as any).results || [],
    by_priority: (byPriority as any).results || [],
    top_agents: (topAgents as any).results || [],
    satisfaction: { avg: Math.round((satisfaction?.avg_rating || 0) * 10) / 10, rated: satisfaction?.rated || 0, min: satisfaction?.min || 0, max: satisfaction?.max || 0 },
    monthly_trend: (trend as any).results || [],
    pending_tickets: (pending as any).results || [],
  })
})

// ── R-20 : Rapport Audit Admin ────────────────────────────────────────
admin.get('/reports/audit', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [summary, byAction, byAdmin, riskActions, mostAffected, trend] = await Promise.all([
    db.prepare(
      `SELECT COUNT(*) as total, COUNT(DISTINCT admin_id) as admins_active,
              COUNT(DISTINCT member_id) as members_affected, SUM(ABS(COALESCE(amount,0))) as total_amount
       FROM admin_audit_log WHERE created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT action, COUNT(*) as count, SUM(ABS(COALESCE(amount,0))) as total_amount
       FROM admin_audit_log WHERE created_at BETWEEN ? AND ?
       GROUP BY action ORDER BY count DESC`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT al.admin_email, au.name, COUNT(*) as actions, SUM(ABS(COALESCE(al.amount,0))) as total_amount
       FROM admin_audit_log al LEFT JOIN admin_users au ON au.id=al.admin_id
       WHERE al.created_at BETWEEN ? AND ?
       GROUP BY al.admin_id ORDER BY actions DESC LIMIT 10`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT al.action, al.description, al.amount, al.created_at, al.admin_email,
              m.first_name, m.last_name, m.unique_id
       FROM admin_audit_log al LEFT JOIN members m ON m.id=al.member_id
       WHERE al.action IN ('impersonate','wallet_force','wallet_credit','wallet_debit')
         AND al.created_at BETWEEN ? AND ?
       ORDER BY al.created_at DESC LIMIT 30`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, COUNT(*) as actions
       FROM admin_audit_log al JOIN members m ON m.id=al.member_id
       WHERE al.created_at BETWEEN ? AND ?
       GROUP BY al.member_id ORDER BY actions DESC LIMIT 10`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as total
       FROM admin_audit_log GROUP BY month ORDER BY month DESC LIMIT 14`
    ).all(),
  ])

  return c.json({
    generated_at: new Date().toISOString(), period, label,
    summary: { total: summary?.total || 0, admins_active: summary?.admins_active || 0, members_affected: summary?.members_affected || 0, total_amount: summary?.total_amount || 0 },
    by_action: (byAction as any).results || [],
    by_admin: (byAdmin as any).results || [],
    risk_actions: (riskActions as any).results || [],
    most_affected_members: (mostAffected as any).results || [],
    monthly_trend: (trend as any).results || [],
  })
})

// ── R-22 : Rapport P&L Simplifié ──────────────────────────────────────
admin.get('/reports/pnl', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [packagesAll, packagesPeriod, licensesAll, licensesPeriod, adminFees, commPaidAll, commPaidPeriod, wdCompleted, monthly] = await Promise.all([
    // Packages — ALL TIME
    db.prepare(
      `SELECT COALESCE(SUM(amount_usd),0) as total, COUNT(*) as count
       FROM package_orders WHERE status='validated'`
    ).first() as any,

    // Packages — période
    db.prepare(
      `SELECT COALESCE(SUM(amount_usd),0) as total, COUNT(*) as count
       FROM package_orders WHERE status='validated' AND validated_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    // Licences — ALL TIME
    db.prepare(
      `SELECT COALESCE(SUM(price_usd),0) as total, COUNT(*) as count
       FROM finstrategia_licenses WHERE status='active'`
    ).first() as any,

    // Licences — période
    db.prepare(
      `SELECT COALESCE(SUM(price_usd),0) as total, COUNT(*) as count
       FROM finstrategia_licenses WHERE status='active' AND validated_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT COUNT(*) as count FROM members WHERE admin_fee_paid=1 AND admin_fee_paid_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    // Commissions — ALL TIME
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count
       FROM commissions`
    ).first() as any,

    // Commissions — période
    db.prepare(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count
       FROM commissions WHERE created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT COALESCE(SUM(net_amount),0) as total, COALESCE(SUM(fee),0) as fees, COUNT(*) as count
       FROM withdrawals WHERE status='completed'`
    ).first() as any,

    db.prepare(
      `SELECT strftime('%Y-%m', po.validated_at) as month,
              COALESCE(SUM(po.amount_usd),0) as packages_revenue,
              (SELECT COALESCE(SUM(c.amount),0) FROM commissions c
               WHERE strftime('%Y-%m', c.created_at) = strftime('%Y-%m', po.validated_at)) as commissions_paid
       FROM package_orders po WHERE po.status='validated'
       GROUP BY month ORDER BY month DESC LIMIT 14`
    ).all(),
  ])

  const revenueAll    = (packagesAll?.total || 0) + (licensesAll?.total || 0)
  const revenuePeriod = (packagesPeriod?.total || 0) + (licensesPeriod?.total || 0)
  const charges       = commPaidAll?.total   || 0
  const outflows      = wdCompleted?.total   || 0
  const fees_earned   = wdCompleted?.fees    || 0

  return c.json({
    generated_at: new Date().toISOString(), period, label,
    revenue: {
      // ALL TIME
      packages:       packagesAll?.total    || 0,
      licenses:       licensesAll?.total    || 0,
      fees_earned:    fees_earned,
      total:          revenueAll + fees_earned,
      // Période
      packages_period: packagesPeriod?.total || 0,
      licenses_period: licensesPeriod?.total || 0,
      total_period:    revenuePeriod,
    },
    charges: {
      commissions_distributed: charges,
      commissions_period:      commPaidPeriod?.total || 0,
      total: charges,
    },
    outflows: {
      withdrawals_completed: outflows,
    },
    net_position:  (revenueAll + fees_earned) - charges,
    margin_pct:    revenueAll > 0 ? Math.round(((revenueAll - charges) / revenueAll) * 1000) / 10 : 0,
    monthly_trend: (monthly as any).results || [],
  })
})

// ── R-24 : Rapport DréaMiles ──────────────────────────────────────────
admin.get('/reports/dreamiles', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [stock, periodActivity, topHolders, trend, byType] = await Promise.all([
    db.prepare(
      `SELECT COALESCE(SUM(dreamiles),0) as available,
              COALESCE(SUM(total_earned),0) as total_earned,
              COALESCE(SUM(total_converted),0) as total_converted,
              COALESCE(SUM(total_expired),0) as total_expired,
              COUNT(*) as members
       FROM dreamiles_wallet`
    ).first() as any,

    db.prepare(
      `SELECT COALESCE(SUM(CASE WHEN dreamiles > 0 THEN dreamiles ELSE 0 END),0) as earned,
              COALESCE(SUM(CASE WHEN type='convert' THEN ABS(dreamiles) ELSE 0 END),0) as converted,
              COALESCE(SUM(CASE WHEN type='expire'  THEN ABS(dreamiles) ELSE 0 END),0) as expired,
              COUNT(DISTINCT member_id) as members_active
       FROM dreamiles_transactions WHERE created_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,

    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              dw.dreamiles, dw.total_earned
       FROM dreamiles_wallet dw JOIN members m ON m.id=dw.member_id
       ORDER BY dw.total_earned DESC, dw.dreamiles DESC LIMIT 20`
    ).all(),

    db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month,
              COALESCE(SUM(CASE WHEN dreamiles > 0 THEN dreamiles ELSE 0 END),0) as earned,
              COALESCE(SUM(CASE WHEN dreamiles < 0 THEN ABS(dreamiles) ELSE 0 END),0) as used
       FROM dreamiles_transactions GROUP BY month ORDER BY month DESC LIMIT 14`
    ).all(),

    db.prepare(
      `SELECT type, COALESCE(SUM(ABS(dreamiles)),0) as total, COUNT(*) as count
       FROM dreamiles_transactions
       GROUP BY type ORDER BY total DESC`
    ).all(),
  ])

  const earned    = stock?.total_earned    || 0
  const converted = stock?.total_converted || 0

  return c.json({
    generated_at: new Date().toISOString(), period, label,
    stock: { available: stock?.available || 0, total_earned: earned, total_converted: converted, total_expired: stock?.total_expired || 0, members: stock?.members || 0, conversion_rate: earned > 0 ? Math.round((converted / earned) * 1000) / 10 : 0 },
    period_activity: { earned: periodActivity?.earned || 0, converted: periodActivity?.converted || 0, expired: periodActivity?.expired || 0, members_active: periodActivity?.members_active || 0 },
    top_holders: (topHolders as any).results || [],
    monthly_trend: (trend as any).results || [],
    by_type: (byType as any).results || [],
  })
})

// ── R-15 : Rapport Frais Admin ────────────────────────────────────────
admin.get('/reports/admin-fees', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [paid, unpaid, paidPeriod, byCountry, config] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as count FROM members WHERE admin_fee_paid=1`).first() as any,
    db.prepare(`SELECT COUNT(*) as count FROM members WHERE admin_fee_paid=0 AND license_active=1`).first() as any,
    db.prepare(`SELECT COUNT(*) as count FROM members WHERE admin_fee_paid=1 AND admin_fee_paid_at BETWEEN ? AND ?`).bind(start, end).first() as any,
    db.prepare(
      `SELECT country, COUNT(*) as paid FROM members WHERE admin_fee_paid=1 AND country IS NOT NULL GROUP BY country ORDER BY paid DESC LIMIT 15`
    ).all(),
    db.prepare(`SELECT value FROM system_config WHERE key='admin_fee_amount' LIMIT 1`).first() as any,
  ])

  const feeAmount   = parseFloat(config?.value || '0')
  const paidCount   = paid?.count   || 0
  const unpaidCount = unpaid?.count || 0
  const total       = paidCount + unpaidCount

  return c.json({
    generated_at: new Date().toISOString(), period, label,
    summary: { paid: paidCount, unpaid: unpaidCount, total_active: total, compliance_rate: total > 0 ? Math.round((paidCount / total) * 1000) / 10 : 0, fee_amount_usd: feeAmount, revenue_total: paidCount * feeAmount, revenue_period: (paidPeriod?.count || 0) * feeAmount, new_payments_period: paidPeriod?.count || 0 },
    by_country: (byCountry as any).results || [],
  })
})

// ── R-02 : Rapport KYC ────────────────────────────────────────────────
admin.get('/reports/kyc', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [snapshot, reviewed, avgDelay, byCountry, recentPending] = await Promise.all([
    db.prepare(`SELECT kyc_status, COUNT(*) as count FROM members GROUP BY kyc_status`).all(),
    db.prepare(
      `SELECT kyc_status, COUNT(*) as count FROM members WHERE kyc_reviewed_at BETWEEN ? AND ? GROUP BY kyc_status`
    ).bind(start, end).all(),
    db.prepare(
      `SELECT AVG((julianday(kyc_reviewed_at) - julianday(created_at)) * 24) as avg_hours
       FROM members WHERE kyc_reviewed_at IS NOT NULL AND kyc_reviewed_at BETWEEN ? AND ?`
    ).bind(start, end).first() as any,
    db.prepare(
      `SELECT country, COUNT(*) as count, SUM(CASE WHEN kyc_status='verified' THEN 1 ELSE 0 END) as verified
       FROM members WHERE country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 15`
    ).all(),
    db.prepare(
      `SELECT id, unique_id, first_name, last_name, email, country, created_at
       FROM members WHERE kyc_status='pending' ORDER BY created_at ASC LIMIT 20`
    ).all(),
  ])

  return c.json({
    generated_at: new Date().toISOString(), period, label,
    snapshot: (snapshot as any).results || [],
    reviewed_period: (reviewed as any).results || [],
    avg_review_hours: Math.round((avgDelay?.avg_hours || 0) * 10) / 10,
    by_country: (byCountry as any).results || [],
    pending_queue: (recentPending as any).results || [],
  })
})

// ── R-03 : Rapport Rangs & Avancements ───────────────────────────────
admin.get('/reports/ranks', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [distribution, advances, top10, nearAdvancement, rankConfig] = await Promise.all([
    db.prepare(
      `SELECT current_rank, COUNT(*) as count,
              SUM(CASE WHEN license_active=1 THEN 1 ELSE 0 END) as active
       FROM members GROUP BY current_rank ORDER BY count DESC`
    ).all(),

    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank, m.rank_achieved_at
       FROM members m WHERE m.rank_achieved_at BETWEEN ? AND ?
       ORDER BY m.rank_achieved_at DESC`
    ).bind(start, end).all(),

    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              m.left_bv_total, m.right_bv_total,
              (m.left_bv_total + m.right_bv_total) as total_bv
       FROM members m WHERE m.license_active=1
       ORDER BY total_bv DESC LIMIT 10`
    ).all(),

    db.prepare(
      `SELECT m.first_name, m.last_name, m.unique_id, m.current_rank,
              m.left_bv_monthly, m.right_bv_monthly, rc.rank_name as next_rank
       FROM members m
       JOIN rank_config rc ON rc.rank_order = (
         SELECT MIN(rc2.rank_order) FROM rank_config rc2
         WHERE rc2.rank_order > (SELECT COALESCE(MAX(rc3.rank_order),0) FROM rank_config rc3 WHERE rc3.rank_name=m.current_rank)
       )
       WHERE m.license_active=1
       ORDER BY (m.left_bv_monthly + m.right_bv_monthly) DESC LIMIT 15`
    ).all(),

    db.prepare(`SELECT rank_name, monthly_prime, monthly_cap FROM rank_config ORDER BY rank_order ASC`).all(),
  ])

  return c.json({
    generated_at: new Date().toISOString(), period, label,
    distribution: (distribution as any).results || [],
    advances_period: (advances as any).results || [],
    top_10_performers: (top10 as any).results || [],
    near_advancement: (nearAdvancement as any).results || [],
    rank_config: (rankConfig as any).results || [],
  })
})

// ── R-23 : Rapport Flux de Trésorerie ────────────────────────────────
admin.get('/reports/cash-flow', requirePermission('reports.view'), async (c) => {
  const { period = 'month', date } = c.req.query()
  const db  = c.env.DB
  const { start, end, label } = periodBounds(period, date || '')

  const [inflowsAll, inflowsPeriod, outflowsAll, netByMonth, walletStock, commStock, commPendingStock] = await Promise.all([
    // Entrées — ALL TIME
    db.prepare(
      `SELECT
        (SELECT COALESCE(SUM(amount_usd),0) FROM package_orders WHERE status='validated') as packages,
        (SELECT COALESCE(SUM(price_usd),0)  FROM finstrategia_licenses WHERE status='active') as licenses,
        (SELECT COALESCE(SUM(fee),0)         FROM withdrawals WHERE status='completed') as wd_fees`
    ).first() as any,

    // Entrées — période
    db.prepare(
      `SELECT
        (SELECT COALESCE(SUM(amount_usd),0) FROM package_orders WHERE status='validated' AND validated_at BETWEEN ? AND ?) as packages,
        (SELECT COALESCE(SUM(price_usd),0)  FROM finstrategia_licenses WHERE status='active' AND validated_at BETWEEN ? AND ?) as licenses,
        (SELECT COALESCE(SUM(fee),0)         FROM withdrawals WHERE status='completed' AND confirmed_at BETWEEN ? AND ?) as wd_fees`
    ).bind(start, end, start, end, start, end).first() as any,

    // Sorties — ALL TIME
    db.prepare(
      `SELECT
        (SELECT COALESCE(SUM(net_amount),0) FROM withdrawals WHERE status='completed') as withdrawals,
        (SELECT COALESCE(SUM(amount),0) FROM commissions) as commissions`
    ).first() as any,

    db.prepare(
      `SELECT strftime('%Y-%m', validated_at) as month,
              COALESCE(SUM(amount_usd),0) as packages_in
       FROM package_orders WHERE status='validated'
       GROUP BY month ORDER BY month DESC LIMIT 14`
    ).all(),

    db.prepare(`SELECT COALESCE(SUM(balance),0) + COALESCE(SUM(pending_balance),0) as total, COALESCE(SUM(total_earned),0) as earned FROM wallets`).first() as any,

    db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM commissions WHERE status='pending'`).first() as any,

    db.prepare(`SELECT COALESCE(SUM(amount - used_amount),0) as total FROM credit_croissance WHERE status='held'`).first() as any,
  ])

  const totalInAll    = (inflowsAll?.packages || 0) + (inflowsAll?.licenses || 0) + (inflowsAll?.wd_fees || 0)
  const totalInPeriod = (inflowsPeriod?.packages || 0) + (inflowsPeriod?.licenses || 0) + (inflowsPeriod?.wd_fees || 0)
  const totalOutAll   = (outflowsAll?.withdrawals || 0)

  return c.json({
    generated_at: new Date().toISOString(), period, label,
    inflows: {
      // ALL TIME
      packages: inflowsAll?.packages || 0,
      licenses: inflowsAll?.licenses || 0,
      fees:     inflowsAll?.wd_fees  || 0,
      total:    totalInAll,
      // Période
      packages_period: inflowsPeriod?.packages || 0,
      licenses_period: inflowsPeriod?.licenses || 0,
      total_period:    totalInPeriod,
    },
    outflows: {
      withdrawals: outflowsAll?.withdrawals || 0,
      commissions: outflowsAll?.commissions || 0,
      total:       totalOutAll,
    },
    net_position: totalInAll - totalOutAll,
    system_reserves: {
      wallet_balance:      walletStock?.total     || 0,
      wallet_earned:       walletStock?.earned    || 0,
      commissions_pending: commPendingStock?.total|| 0,
      cc_available:        commStock?.total       || 0,
    },
    monthly_trend: (netByMonth as any).results || [],
  })
})

// ══════════════════════════════════════════════════════════════
// ACCÈS SERVICES PAR PACKAGE
// ══════════════════════════════════════════════════════════════

// GET /admin/package-service-access
// Retourne la matrice complète : packages × services avec is_enabled
admin.get('/package-service-access', requirePermission('packages.view'), async (c) => {
  const db = c.env.DB

  // Tous les packages actifs (non supprimés) avec leur catégorie
  const pkgRows = await db.prepare(`
    SELECT p.id, p.name, p.slug, p.price_usd, p.display_order,
           p.category_id, pc.name AS category_name, pc.display_order AS cat_order
    FROM packages p
    LEFT JOIN package_categories pc ON pc.id = p.category_id
    WHERE p.deleted_at IS NULL AND p.is_active = 1
    ORDER BY pc.display_order ASC, p.display_order ASC, p.name ASC
  `).all()

  // Tous les services actifs
  const svcRows = await db.prepare(`
    SELECT id, name, slug, category, logo_url, logo_data_uri, bg_color, status
    FROM services
    WHERE status != 'inactive'
    ORDER BY display_order ASC, name ASC
  `).all()

  // Tous les accès existants
  const accessRows = await db.prepare(`
    SELECT package_id, service_id, is_enabled, updated_at, updated_by
    FROM package_service_access
  `).all()

  // Construire un map rapide package_id:service_id → {is_enabled, updated_at}
  const accessMap: Record<string, { is_enabled: number; updated_at: string; updated_by: string | null }> = {}
  for (const row of (accessRows.results || []) as any[]) {
    accessMap[`${row.package_id}:${row.service_id}`] = {
      is_enabled: row.is_enabled,
      updated_at: row.updated_at,
      updated_by: row.updated_by,
    }
  }

  return c.json({
    success: true,
    packages: pkgRows.results || [],
    services: svcRows.results || [],
    access:   accessMap,
  })
})

// POST /admin/package-service-access/toggle
// Active ou désactive l'accès d'un service pour un package
admin.post('/package-service-access/toggle', requirePermission('packages.edit'), async (c) => {
  const adminId = c.get('adminId' as any) as string
  const { package_id, service_id, is_enabled } = await c.req.json() as any

  if (!package_id || !service_id || is_enabled === undefined) {
    return c.json({ error: 'package_id, service_id et is_enabled requis' }, 400)
  }

  const enabled = is_enabled ? 1 : 0

  // Vérifier que le package existe
  const pkg = await c.env.DB.prepare(
    `SELECT id, name FROM packages WHERE id = ? AND deleted_at IS NULL`
  ).bind(package_id).first() as any
  if (!pkg) return c.json({ error: 'Package introuvable' }, 404)

  // Vérifier que le service existe
  const svc = await c.env.DB.prepare(
    `SELECT id, name FROM services WHERE id = ?`
  ).bind(service_id).first() as any
  if (!svc) return c.json({ error: 'Service introuvable' }, 404)

  // UPSERT — créer ou mettre à jour
  await c.env.DB.prepare(`
    INSERT INTO package_service_access (package_id, service_id, is_enabled, updated_at, updated_by)
    VALUES (?, ?, ?, datetime('now'), ?)
    ON CONFLICT(package_id, service_id)
    DO UPDATE SET
      is_enabled = excluded.is_enabled,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `).bind(package_id, service_id, enabled, adminId).run()

  // Log d'audit
  const adminEmailToggle = (c.get('adminEmail' as any) as string) || 'admin@system'
  await c.env.DB.prepare(`
    INSERT INTO admin_audit_log
    (id, admin_id, admin_email, action, description, metadata, created_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, 'package_service_access_toggle', ?, ?, datetime('now'))
  `).bind(
    adminId,
    adminEmailToggle,
    `Accès ${svc.name} → ${pkg.name} : ${enabled ? 'activé' : 'désactivé'}`,
    JSON.stringify({ package_id, service_id, package_name: pkg.name, service_name: svc.name, is_enabled: enabled })
  ).run()

  return c.json({
    success: true,
    package_id,
    service_id,
    is_enabled: enabled,
    package_name: pkg.name,
    service_name: svc.name,
  })
})

// POST /admin/package-service-access/bulk
// Activer/désactiver tous les services d'un package en une fois
admin.post('/package-service-access/bulk', requirePermission('packages.edit'), async (c) => {
  const adminId = c.get('adminId' as any) as string
  const { package_id, is_enabled } = await c.req.json() as any

  if (!package_id || is_enabled === undefined) {
    return c.json({ error: 'package_id et is_enabled requis' }, 400)
  }

  const enabled = is_enabled ? 1 : 0

  // Vérifier que le package existe
  const pkg = await c.env.DB.prepare(
    `SELECT id, name FROM packages WHERE id = ? AND deleted_at IS NULL`
  ).bind(package_id).first() as any
  if (!pkg) return c.json({ error: 'Package introuvable' }, 404)

  // Mettre à jour tous les accès de ce package
  const result = await c.env.DB.prepare(`
    UPDATE package_service_access
    SET is_enabled = ?, updated_at = datetime('now'), updated_by = ?
    WHERE package_id = ?
  `).bind(enabled, adminId, package_id).run()

  // S'il n'y avait pas encore d'entrées pour ce package (nouveaux services ajoutés)
  // → insérer les manquants
  await c.env.DB.prepare(`
    INSERT OR IGNORE INTO package_service_access (package_id, service_id, is_enabled, updated_at, updated_by)
    SELECT ?, s.id, ?, datetime('now'), ?
    FROM services s
    WHERE s.status != 'inactive'
  `).bind(package_id, enabled, adminId).run()

  // Remettre à jour après l'insert (les inserts avaient is_enabled correct déjà)
  await c.env.DB.prepare(`
    UPDATE package_service_access
    SET is_enabled = ?, updated_at = datetime('now'), updated_by = ?
    WHERE package_id = ?
  `).bind(enabled, adminId, package_id).run()

  const adminEmailBulk = (c.get('adminEmail' as any) as string) || 'admin@system'
  await c.env.DB.prepare(`
    INSERT INTO admin_audit_log
    (id, admin_id, admin_email, action, description, metadata, created_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, 'package_service_access_bulk', ?, ?, datetime('now'))
  `).bind(
    adminId,
    adminEmailBulk,
    `Bulk ${enabled ? 'activation' : 'désactivation'} services → ${pkg.name}`,
    JSON.stringify({ package_id, package_name: pkg.name, is_enabled: enabled })
  ).run()

  return c.json({ success: true, package_id, is_enabled: enabled, rows_updated: result.meta?.changes || 0 })
})

// ============================================================
// DÉPLACEMENT DE MEMBRE / BRANCHE — Move Member
// ============================================================
// Règles métier :
// - legs: 'both'|'left'|'right'|'none' — jambes binaires à déplacer avec X
// - Jambes non déplacées remontent chez l'ancienne upline de X
// - Filleuls directs de parrainage dans jambe non déplacée → rootuser
// - BV holding tank basculent vers nouvelles uplines
// - BV payés / commissions passées : intouchables
// - Transaction atomique + snapshot admin_audit_log
// ============================================================

// Helper : récupérer un membre complet
async function getMemberFull(db: D1Database, id: string): Promise<any> {
  return db.prepare(
    `SELECT id, unique_id, first_name, last_name, email,
            sponsor_id, binary_parent_id, binary_position,
            binary_left_id, binary_right_id,
            member_status, current_rank, license_active,
            in_holding_tank, left_bv_monthly, right_bv_monthly,
            left_bv_total, right_bv_total
     FROM members WHERE id = ?`
  ).bind(id).first()
}

// Helper : récupérer l'id du rootuser
async function getRootUserId(db: D1Database): Promise<string | null> {
  const root = await db.prepare(
    `SELECT id FROM members WHERE unique_id = 'ROOT' LIMIT 1`
  ).first() as any
  return root?.id || null
}

// Helper : récupérer les enfants binaires directs d'un membre
async function getBinaryChildren(db: D1Database, parentId: string): Promise<{ left: any, right: any }> {
  const rows = await db.prepare(
    `SELECT id, unique_id, first_name, last_name, binary_position,
            binary_left_id, binary_right_id, sponsor_id
     FROM members WHERE binary_parent_id = ? AND in_holding_tank = 0`
  ).bind(parentId).all()
  const children = rows.results as any[]
  return {
    left:  children.find(c => c.binary_position === 'L') || null,
    right: children.find(c => c.binary_position === 'R') || null,
  }
}

// Helper : récupérer les filleuls directs de parrainage d'un membre
async function getSponsorDirects(db: D1Database, sponsorId: string): Promise<any[]> {
  const rows = await db.prepare(
    `SELECT id, unique_id, first_name, last_name FROM members
     WHERE sponsor_id = ? AND unique_id != 'ROOT'`
  ).bind(sponsorId).all()
  return rows.results as any[]
}

// Helper : calculer quels membres sont dans une jambe (descendants binaires)
async function getBinaryDescendants(db: D1Database, rootId: string, _maxDepth = 50): Promise<string[]> {
  // CTE récursive SQLite — une seule requête au lieu de N requêtes séquentielles
  const rows = await db.prepare(`
    WITH RECURSIVE descendants(id, depth) AS (
      SELECT id, 1 FROM members
        WHERE binary_parent_id = ? AND in_holding_tank = 0
      UNION ALL
      SELECT m.id, d.depth + 1 FROM members m
        INNER JOIN descendants d ON m.binary_parent_id = d.id
        WHERE m.in_holding_tank = 0 AND d.depth < 50
    )
    SELECT id FROM descendants
  `).bind(rootId).all()
  return (rows.results as any[]).map((r: any) => r.id)
}

// ── Route PREVIEW (dry-run) ─────────────────────────────────
// POST /admin/members/:id/move/preview
// Calcule l'impact sans modifier quoi que ce soit
admin.post('/members/:id/move/preview', requirePermission('tree.edit'), async (c) => {
  const memberId = c.req.param('id')
  const body = await c.req.json().catch(() => ({})) as any
  const { legs = 'both', target_member_id, target_side } = body

  if (!target_member_id) return c.json({ error: 'target_member_id requis' }, 400)
  if (!['L','R'].includes(target_side)) return c.json({ error: 'target_side doit être L ou R' }, 400)
  if (!['both','left','right','none'].includes(legs)) return c.json({ error: 'legs invalide' }, 400)

  const [member, target, rootId] = await Promise.all([
    getMemberFull(c.env.DB, memberId),
    getMemberFull(c.env.DB, target_member_id),
    getRootUserId(c.env.DB),
  ]) as any[]

  if (!member) return c.json({ error: 'Membre source introuvable' }, 404)
  if (!target) return c.json({ error: 'Membre cible introuvable' }, 404)
  if (memberId === target_member_id) return c.json({ error: 'Source et cible identiques' }, 400)
  if (!rootId) return c.json({ error: 'ROOT introuvable' }, 500)

  // Vérifier que la cible n'est pas un descendant de la source (évite les cycles)
  const sourceDescendants = await getBinaryDescendants(c.env.DB, memberId)
  if (sourceDescendants.includes(target_member_id)) {
    return c.json({ error: 'Impossible : la cible est un descendant de la source' }, 400)
  }

  // Anti-redondance : la source ne doit pas être déjà positionné au même slot cible
  const alreadyAtTargetPreview =
    member.binary_parent_id === target_member_id &&
    member.binary_position  === target_side
  if (alreadyAtTargetPreview) {
    return c.json({ error: 'Le membre est déjà positionné à cet emplacement (même parent, même côté)' }, 400)
  }

  // Enfants binaires actuels de X
  const xChildren = await getBinaryChildren(c.env.DB, memberId)

  // Déterminer quelles jambes partent avec X
  const leftGoesWithX  = legs === 'both' || legs === 'left'
  const rightGoesWithX = legs === 'both' || legs === 'right'

  // Jambes qui restent (remontent chez ancienne upline de X)
  const staysLeft  = !leftGoesWithX  && xChildren.left  ? xChildren.left  : null
  const staysRight = !rightGoesWithX && xChildren.right ? xChildren.right : null

  // Position cible occupée ?
  const targetChildren = await getBinaryChildren(c.env.DB, target_member_id)
  const slotOccupant = target_side === 'L' ? targetChildren.left : targetChildren.right
  const intercalate = !!slotOccupant

  // BV en attente dans bv_queue pour les membres de la branche
  const branchIds = [memberId, ...sourceDescendants]
  const pendingBV = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt, SUM(bv_amount) as total
     FROM bv_queue WHERE member_id IN (${branchIds.map(() => '?').join(',')}) AND status = 'pending'`
  ).bind(...branchIds).first() as any

  // Filleuls directs de parrainage de X
  const sponsorDirects = await getSponsorDirects(c.env.DB, memberId)

  // Ancienne upline binaire de X
  const oldBinaryParent = member.binary_parent_id
    ? await getMemberFull(c.env.DB, member.binary_parent_id) : null

  // Résumé
  return c.json({
    preview: true,
    source: {
      id: member.id,
      name: `${member.first_name} ${member.last_name}`,
      unique_id: member.unique_id,
      current_binary_parent: oldBinaryParent
        ? `${oldBinaryParent.first_name} ${oldBinaryParent.last_name} (${oldBinaryParent.unique_id})` : 'ROOT',
      current_binary_position: member.binary_position,
    },
    target: {
      id: target.id,
      name: `${target.first_name} ${target.last_name}`,
      unique_id: target.unique_id,
      side: target_side,
    },
    legs_config: legs,
    intercalate,
    slot_occupant: slotOccupant
      ? { id: slotOccupant.id, name: `${slotOccupant.first_name} ${slotOccupant.last_name}`, unique_id: slotOccupant.unique_id }
      : null,
    branch_size: sourceDescendants.length + 1,
    pending_bv: {
      count: pendingBV?.cnt || 0,
      total: pendingBV?.total || 0,
    },
    legs_staying_behind: [
      staysLeft  ? { side: 'L', member: { id: staysLeft.id,  name: `${staysLeft.first_name} ${staysLeft.last_name}`,   unique_id: staysLeft.unique_id  }, goes_to: oldBinaryParent ? `${oldBinaryParent.unique_id} (côté L)` : 'ROOT' } : null,
      staysRight ? { side: 'R', member: { id: staysRight.id, name: `${staysRight.first_name} ${staysRight.last_name}`, unique_id: staysRight.unique_id }, goes_to: oldBinaryParent ? `${oldBinaryParent.unique_id} (côté R)` : 'ROOT' } : null,
    ].filter(Boolean),
    sponsor_directs_reparented: sponsorDirects
      .filter(d => {
        // Filleuls dans jambes non déplacées → rootuser
        if (leftGoesWithX && rightGoesWithX) return false // tous partent avec X
        const inLeftBranch  = xChildren.left  ? sourceDescendants.includes(d.id) || d.id === xChildren.left?.id  : false
        const inRightBranch = xChildren.right ? sourceDescendants.includes(d.id) || d.id === xChildren.right?.id : false
        if (!leftGoesWithX  && inLeftBranch)  return true
        if (!rightGoesWithX && inRightBranch) return true
        return false
      })
      .map(d => ({ id: d.id, name: `${d.first_name} ${d.last_name}`, unique_id: d.unique_id, new_sponsor: 'ROOT' })),
  })
})

// ── Route MOVE (transaction atomique) ──────────────────────
// POST /admin/members/:id/move
admin.post('/members/:id/move', requirePermission('tree.edit'), async (c) => {
  const adminId: string = (c.get('adminId' as any) as string) || 'admin-000000000000000000000000'
  const adminEmail: string = (c.get('adminEmail' as any) as string) || 'admin@system'
  const memberId = c.req.param('id')
  const body = await c.req.json().catch(() => ({})) as any
  const { legs = 'both', target_member_id, target_side, confirm = false } = body

  if (!confirm) return c.json({ error: 'confirm=true requis pour exécuter le déplacement' }, 400)
  if (!target_member_id) return c.json({ error: 'target_member_id requis' }, 400)
  if (!['L','R'].includes(target_side)) return c.json({ error: 'target_side doit être L ou R' }, 400)

  // ── Try/catch global pour retourner une erreur JSON propre ──────────────
  try {
  if (!['both','left','right','none'].includes(legs)) return c.json({ error: 'legs invalide' }, 400)

  const [member, target, rootId] = await Promise.all([
    getMemberFull(c.env.DB, memberId),
    getMemberFull(c.env.DB, target_member_id),
    getRootUserId(c.env.DB),
  ]) as any[]

  if (!member) return c.json({ error: 'Membre source introuvable' }, 404)
  if (!target) return c.json({ error: 'Membre cible introuvable' }, 404)
  if (memberId === target_member_id) return c.json({ error: 'Source et cible identiques' }, 400)
  if (!rootId) return c.json({ error: 'ROOT introuvable' }, 500)

  // Anti-cycle : la cible ne doit pas être descendant de la source
  const sourceDescendants = await getBinaryDescendants(c.env.DB, memberId)
  if (sourceDescendants.includes(target_member_id)) {
    return c.json({ error: 'Impossible : la cible est un descendant de la source' }, 400)
  }

  // Anti-redondance : la source ne doit pas être déjà positionnée au même slot cible
  const alreadyAtTarget =
    member.binary_parent_id === target_member_id &&
    member.binary_position  === target_side
  if (alreadyAtTarget) {
    return c.json({ error: 'Le membre est déjà positionné à cet emplacement (même parent, même côté)' }, 400)
  }

  // ── Snapshot AVANT (pour rollback) ─────────────────────────
  const snapshot: any = {
    member: { ...member },
    old_binary_parent_id: member.binary_parent_id,
    old_binary_position:  member.binary_position,
    old_sponsor_id:       member.sponsor_id,
    target_id: target_member_id,
    target_side,
    legs,
    timestamp: new Date().toISOString(),
  }

  // Récupérer état actuel de X et cible
  const xChildren     = await getBinaryChildren(c.env.DB, memberId)
  const targetChildren = await getBinaryChildren(c.env.DB, target_member_id)

  const leftGoesWithX  = legs === 'both' || legs === 'left'
  const rightGoesWithX = legs === 'both' || legs === 'right'

  const staysLeft  = !leftGoesWithX  && xChildren.left  ? xChildren.left  : null
  const staysRight = !rightGoesWithX && xChildren.right ? xChildren.right : null

  const slotOccupant = target_side === 'L' ? targetChildren.left : targetChildren.right

  // Ancienne upline binaire de X
  const oldParentId  = member.binary_parent_id
  const oldPosition  = member.binary_position as 'L' | 'R' | null

  snapshot.xChildren    = { left: xChildren.left?.id || null, right: xChildren.right?.id || null }
  snapshot.slotOccupant = slotOccupant?.id || null

  // ── ÉTAPE 1 : Détacher X de son ancienne upline binaire ────
  // 1a. Libérer le slot chez l'ancienne upline
  if (oldParentId && oldPosition) {
    const colOld = oldPosition === 'L' ? 'binary_left_id' : 'binary_right_id'
    await c.env.DB.prepare(
      `UPDATE members SET ${colOld} = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(oldParentId).run()
  }

  // 1b. Reset binary_parent de X (on le replacera plus tard)
  await c.env.DB.prepare(
    `UPDATE members SET binary_parent_id = NULL, binary_position = NULL,
     updated_at = datetime('now') WHERE id = ?`
  ).bind(memberId).run()

  // ── ÉTAPE 2 : Gérer les jambes qui restent derrière ────────
  // Elles remontent à la place de X chez son ancienne upline

  // On peut remonter au max 2 jambes (L et R) mais la position cible
  // chez l'ancienne upline était UNE seule (celle de X). Si les 2 restent,
  // une va en oldPosition, l'autre est mise en holding tank temporaire.
  const remainingLegs = [
    staysLeft  ? { child: staysLeft,  originalSide: 'L' as const } : null,
    staysRight ? { child: staysRight, originalSide: 'R' as const } : null,
  ].filter(Boolean) as { child: any, originalSide: 'L' | 'R' }[]

  for (let i = 0; i < remainingLegs.length; i++) {
    const { child } = remainingLegs[i]
    if (i === 0 && oldParentId && oldPosition) {
      // Premier enfant qui reste → prend la place de X chez son ancien parent
      const colNew = oldPosition === 'L' ? 'binary_left_id' : 'binary_right_id'
      await c.env.DB.prepare(
        `UPDATE members SET binary_parent_id = ?, binary_position = ?,
         updated_at = datetime('now') WHERE id = ?`
      ).bind(oldParentId, oldPosition, child.id).run()
      await c.env.DB.prepare(
        `UPDATE members SET ${colNew} = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(child.id, oldParentId).run()
    } else if (i === 1 && oldParentId) {
      // Second enfant restant : l'autre slot chez l'ancienne upline (si libre)
      // Déterminer quel côté est disponible chez l'ancienne upline
      const oldParentData = await getMemberFull(c.env.DB, oldParentId) as any
      const altSide = oldPosition === 'L' ? 'R' : 'L'
      const altSlotFree = altSide === 'L' ? !oldParentData?.binary_left_id : !oldParentData?.binary_right_id
      if (altSlotFree) {
        const colAlt = altSide === 'L' ? 'binary_left_id' : 'binary_right_id'
        await c.env.DB.prepare(
          `UPDATE members SET binary_parent_id = ?, binary_position = ?,
           updated_at = datetime('now') WHERE id = ?`
        ).bind(oldParentId, altSide, child.id).run()
        await c.env.DB.prepare(
          `UPDATE members SET ${colAlt} = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(child.id, oldParentId).run()
      } else {
        // Slot plein → rootuser
        await c.env.DB.prepare(
          `UPDATE members SET binary_parent_id = ?, binary_position = 'L',
           updated_at = datetime('now') WHERE id = ?`
        ).bind(rootId, child.id).run()
        await c.env.DB.prepare(
          `UPDATE members SET binary_left_id = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(child.id, rootId).run()
      }
    } else if (!oldParentId) {
      // X était à la racine → enfant remonte chez rootuser
      await c.env.DB.prepare(
        `UPDATE members SET binary_parent_id = ?, binary_position = 'L',
         updated_at = datetime('now') WHERE id = ?`
      ).bind(rootId, child.id).run()
      await c.env.DB.prepare(
        `UPDATE members SET binary_left_id = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(child.id, rootId).run()
    }
  }

  // ── ÉTAPE 3 : Gérer la jambe gauche de X si elle ne part pas ─
  // (déjà géré ci-dessus, nettoyer le lien côté X)
  if (!leftGoesWithX && xChildren.left) {
    await c.env.DB.prepare(
      `UPDATE members SET binary_left_id = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(memberId).run()
  }
  if (!rightGoesWithX && xChildren.right) {
    await c.env.DB.prepare(
      `UPDATE members SET binary_right_id = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(memberId).run()
  }

  // ── ÉTAPE 4 : Intercalation si slot occupé ─────────────────
  if (slotOccupant) {
    // X s'intercale : l'occupant devient enfant de X (côté target_side = son côté actuel)
    // On choisit le même côté par défaut ; si occupé, l'autre côté
    const xChildrenNow = await getBinaryChildren(c.env.DB, memberId)
    let occupantNewSide: 'L' | 'R' = target_side as 'L' | 'R'
    if (occupantNewSide === 'L' && xChildrenNow.left)  occupantNewSide = 'R'
    if (occupantNewSide === 'R' && xChildrenNow.right) occupantNewSide = 'L'

    const colOccupant = occupantNewSide === 'L' ? 'binary_left_id' : 'binary_right_id'

    // Détacher l'occupant de la cible
    const colTargetSlot = target_side === 'L' ? 'binary_left_id' : 'binary_right_id'
    await c.env.DB.prepare(
      `UPDATE members SET ${colTargetSlot} = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(target_member_id).run()

    // L'occupant devient enfant de X
    await c.env.DB.prepare(
      `UPDATE members SET binary_parent_id = ?, binary_position = ?,
       updated_at = datetime('now') WHERE id = ?`
    ).bind(memberId, occupantNewSide, slotOccupant.id).run()
    await c.env.DB.prepare(
      `UPDATE members SET ${colOccupant} = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(slotOccupant.id, memberId).run()

    snapshot.intercalation = { occupant_id: slotOccupant.id, new_side_under_x: occupantNewSide }
  }

  // ── ÉTAPE 5 : Placer X chez la cible ───────────────────────
  const colTarget = target_side === 'L' ? 'binary_left_id' : 'binary_right_id'
  await c.env.DB.prepare(
    `UPDATE members SET binary_parent_id = ?, binary_position = ?,
     updated_at = datetime('now') WHERE id = ?`
  ).bind(target_member_id, target_side, memberId).run()
  await c.env.DB.prepare(
    `UPDATE members SET ${colTarget} = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(memberId, target_member_id).run()

  // ── ÉTAPE 6 : Parrainage — filleuls directs hors branche → rootuser ──
  if (legs !== 'both') {
    // Identifier les descendants de la jambe non déplacée
    const leftDescendants  = xChildren.left  ? [xChildren.left.id,  ...(await getBinaryDescendants(c.env.DB, xChildren.left.id))]  : []
    const rightDescendants = xChildren.right ? [xChildren.right.id, ...(await getBinaryDescendants(c.env.DB, xChildren.right.id))] : []

    const sponsorDirects = await getSponsorDirects(c.env.DB, memberId)
    for (const d of sponsorDirects) {
      const inLeft  = leftDescendants.includes(d.id)
      const inRight = rightDescendants.includes(d.id)
      const shouldReparent =
        (!leftGoesWithX  && inLeft)  ||
        (!rightGoesWithX && inRight)
      if (shouldReparent) {
        await c.env.DB.prepare(
          `UPDATE members SET sponsor_id = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(rootId, d.id).run()
      }
    }
  }

  // ── ÉTAPE 7 : BV holding tank → rebascule vers nouvelles uplines ──
  // Les bv_queue pending des membres de la branche sont relancés
  // Ils seront propagés vers les nouvelles uplines lors du prochain processBVQueue
  try {
    const branchIds = [memberId, ...sourceDescendants]
    if (branchIds.length > 0) {
      // Traitement par lots de 90 pour respecter la limite D1 (100 params max)
      const CHUNK = 90
      for (let i = 0; i < branchIds.length; i += CHUNK) {
        const chunk = branchIds.slice(i, i + CHUNK)
        await c.env.DB.prepare(
          `UPDATE bv_queue SET status = 'pending', attempts = 0, last_error = NULL,
           updated_at = datetime('now')
           WHERE member_id IN (${chunk.map(() => '?').join(',')})
           AND status IN ('failed','pending')`
        ).bind(...chunk).run()
      }
    }
  } catch (e7: any) {
    console.warn('[move_member] étape 7 BV queue ignorée:', e7?.message)
  }

  // ── ÉTAPE 8 : Recalcul BV uplines impactées ────────────────
  // Recalculer les uplines de la nouvelle position et de l'ancienne
  try {
    const uplinesToRecalc = new Set<string>()
    if (oldParentId) uplinesToRecalc.add(oldParentId)
    uplinesToRecalc.add(target_member_id)
    for (const uid of uplinesToRecalc) {
      try {
        await recalculateMemberStatus(c.env.DB, uid)
        await calculateMemberRank(c.env.DB, uid)
      } catch (_) {}
    }
    // Recalculer X lui-même
    try { await recalculateMemberStatus(c.env.DB, memberId) } catch (_) {}
    try { await calculateMemberRank(c.env.DB, memberId) }     catch (_) {}
  } catch (e8: any) {
    console.warn('[move_member] étape 8 recalcul ignorée:', e8?.message)
  }

  // ── ÉTAPE 9 : Log admin audit ───────────────────────────────
  try {
    await c.env.DB.prepare(
      `INSERT INTO admin_audit_log
       (id, admin_id, admin_email, action, description, metadata, created_at)
       VALUES (lower(hex(randomblob(16))), ?, ?, 'move_member', ?, ?, datetime('now'))`
    ).bind(
      adminId,
      adminEmail,
      `Déplacement membre ${member.unique_id} (${member.first_name} ${member.last_name}) → cible ${target.unique_id} côté ${target_side} — jambes: ${legs}`,
      JSON.stringify(snapshot)
    ).run()
  } catch (e9: any) {
    console.warn('[move_member] étape 9 audit log ignorée:', e9?.message)
  }

  // ── Notification au membre ──────────────────────────────────
  try {
    await createNotification(c.env.DB, memberId, 'info', 'Position mise à jour',
      'Votre position dans l\'arbre a été modifiée par l\'administration.')
  } catch (_) {}

  return c.json({
    success: true,
    message: `Membre ${member.unique_id} déplacé avec succès vers ${target.unique_id} côté ${target_side}`,
    member_id: memberId,
    new_binary_parent_id: target_member_id,
    new_binary_position: target_side,
    legs_moved: legs,
    intercalated: !!slotOccupant,
    branch_size: sourceDescendants.length + 1,
  })

  } catch (err: any) {
    console.error('[move_member] ERREUR:', err)
    return c.json({
      error: err?.message || 'Erreur interne lors du déplacement',
      detail: String(err),
    }, 500)
  }
})

export { admin }
