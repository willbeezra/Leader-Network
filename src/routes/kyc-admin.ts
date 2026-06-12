// ============================================================
// LEADER Network — Routes Admin KYC
// Gestion complète et paramétrable depuis le backoffice admin
// ============================================================
import { Hono } from 'hono'
import { verifyJWT, generateId } from '../lib/auth.js'
import { requirePermission } from '../middleware/permissions.js'
import type { Bindings } from '../types/index.js'
import { sendEmail } from '../lib/mailer.js'

const kycAdmin = new Hono<{ Bindings: Bindings }>()

// ── MIDDLEWARE AUTH ADMIN ────────────────────────────────────
kycAdmin.use('/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Accès refusé' }, 403)
  const adminRow = await c.env.DB.prepare(
    `SELECT id FROM admin_users WHERE id=?`
  ).bind(payload.sub).first() as any
  if (!adminRow) return c.json({ error: 'Session invalide' }, 401)
  c.set('adminId' as any, adminRow.id as string)
  await next()
})

async function logAudit(db: D1Database, opts: {
  application_id: string, member_id: string,
  admin_id?: string, action: string, details?: any
}) {
  await db.prepare(
    `INSERT INTO kyc_audit_log (application_id, member_id, admin_id, action, details)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(
    opts.application_id, opts.member_id,
    opts.admin_id || null, opts.action,
    JSON.stringify(opts.details || {})
  ).run()
}

// ─────────────────────────────────────────────────────────────
// GET /admin/kyc/dashboard — Tableau de bord KYC admin
// ─────────────────────────────────────────────────────────────
kycAdmin.get('/dashboard', requirePermission('kyc.view'), async (c) => {
  const db = c.env.DB

  const [queue, stats, byLevel, recentActivity, flagsOpen, slaBreached] = await Promise.all([
    // File d'attente
    db.prepare(`
      SELECT COUNT(*) as submitted, 
             SUM(CASE WHEN status='in_review' THEN 1 ELSE 0 END) as in_review,
             SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved_today,
             SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected_today
      FROM kyc_applications
      WHERE (status IN ('submitted','in_review'))
         OR (reviewed_at >= date('now') AND status IN ('approved','rejected'))
    `).first() as any,

    // Stats globales
    db.prepare(`
      SELECT 
        SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as total_approved,
        SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as total_rejected,
        SUM(CASE WHEN status='submitted' THEN 1 ELSE 0 END) as total_pending,
        AVG(CASE WHEN review_duration_s IS NOT NULL THEN review_duration_s ELSE NULL END) as avg_review_s,
        COUNT(*) as total_applications
      FROM kyc_applications WHERE status != 'draft'
    `).first() as any,

    // Distribution par niveau
    db.prepare(`
      SELECT m.kyc_level, COUNT(*) as cnt
      FROM members m WHERE m.unique_id != 'ROOT'
      GROUP BY m.kyc_level ORDER BY m.kyc_level
    `).all(),

    // Activité récente (dernières 24h)
    db.prepare(`
      SELECT ka.id, ka.status, ka.level_requested, ka.reviewed_at, ka.submitted_at,
             m.first_name, m.last_name, m.unique_id
      FROM kyc_applications ka
      JOIN members m ON m.id = ka.member_id
      WHERE ka.updated_at >= datetime('now', '-24 hours')
        AND ka.status != 'draft'
      ORDER BY ka.updated_at DESC LIMIT 10
    `).all(),

    // Flags non résolus
    db.prepare(`
      SELECT COUNT(*) as cnt, severity FROM kyc_flags 
      WHERE resolved=0 GROUP BY severity
    `).all(),

    // Dossiers hors SLA (soumis depuis > 48h non traités)
    db.prepare(`
      SELECT COUNT(*) as cnt FROM kyc_applications
      WHERE status IN ('submitted','in_review')
        AND submitted_at <= datetime('now', '-48 hours')
    `).first() as any,
  ])

  // Comptage approbations/rejets 30 derniers jours
  const approved30 = await db.prepare(
    `SELECT COUNT(*) as cnt FROM kyc_applications WHERE status='approved' AND reviewed_at >= datetime('now','-30 days')`
  ).first() as any
  const rejected30 = await db.prepare(
    `SELECT COUNT(*) as cnt FROM kyc_applications WHERE status='rejected' AND reviewed_at >= datetime('now','-30 days')`
  ).first() as any

  return c.json({
    // Compatibilité frontend : stats avec les bons noms
    stats: {
      pending_review:      (queue?.submitted   || 0),
      in_review:           (queue?.in_review   || 0),
      approved_30d:        (approved30?.cnt    || 0),
      rejected_30d:        (rejected30?.cnt    || 0),
      sla_breached:        (slaBreached?.cnt   || 0),
      total_approved:      stats?.total_approved     || 0,
      total_rejected:      stats?.total_rejected     || 0,
      total_pending:       stats?.total_pending      || 0,
      total_applications:  stats?.total_applications || 0,
      avg_review_minutes:  stats?.avg_review_s ? Math.round(stats.avg_review_s / 60) : null,
    },
    by_level:        (byLevel.results as any[]),
    recent_activity: (recentActivity.results as any[]),
    open_flags:      (flagsOpen.results as any[]),
  })
})

// ─────────────────────────────────────────────────────────────
// GET /admin/kyc/queue — File de révision
// ─────────────────────────────────────────────────────────────
kycAdmin.get('/queue', requirePermission('kyc.view'), async (c) => {
  const { status = 'submitted', level, assigned, page = '1', per_page = '20' } = c.req.query()
  const db = c.env.DB
  const offset = (parseInt(page) - 1) * parseInt(per_page)

  // Normaliser le filtre statut : frontend envoie 'under_review', DB stocke 'in_review'
  const dbStatus = status === 'under_review' ? 'in_review' : status
  // Si pas de filtre statut (vide) → toutes les applications non-draft
  let where = dbStatus ? `WHERE ka.status = ?` : `WHERE ka.status != 'draft'`
  const binds: any[] = dbStatus ? [dbStatus] : []

  if (level) { where += ` AND ka.level_requested = ?`; binds.push(parseInt(level)) }
  if (assigned === 'me') {
    where += ` AND ka.assigned_admin_id = ?`
    binds.push(c.get('adminId' as any))
  } else if (assigned === 'unassigned') {
    where += ` AND ka.assigned_admin_id IS NULL`
  }

  const [rows, total] = await Promise.all([
    db.prepare(`
      SELECT ka.*, 
             m.first_name, m.last_name, m.unique_id, m.email, m.kyc_level as current_level,
             au.email as assigned_admin_email,
             COUNT(kd.id) as doc_count,
             COUNT(kf.id) as flag_count,
             CASE WHEN ka.submitted_at <= datetime('now', '-48 hours') THEN 1 ELSE 0 END as sla_breached
      FROM kyc_applications ka
      JOIN members m ON m.id = ka.member_id
      LEFT JOIN admin_users au ON au.id = ka.assigned_admin_id
      LEFT JOIN kyc_documents kd ON kd.application_id = ka.id
      LEFT JOIN kyc_flags kf ON kf.application_id = ka.id AND kf.resolved = 0
      ${where}
      GROUP BY ka.id
      ORDER BY ka.submitted_at ASC
      LIMIT ? OFFSET ?
    `).bind(...binds, parseInt(per_page), offset).all(),

    db.prepare(`
      SELECT COUNT(*) as cnt FROM kyc_applications ka ${where}
    `).bind(...binds).first() as any,
  ])

  // Normaliser les champs pour le frontend (level_requested → target_level, in_review → under_review)
  const applications = (rows.results as any[]).map((a: any) => ({
    ...a,
    status:             a.status === 'in_review' ? 'under_review' : a.status,
    target_level:       a.level_requested,
    member_name:        `${a.first_name} ${a.last_name}`,
    member_unique_id:   a.unique_id,
    assigned_to_name:   a.assigned_admin_email || null,
    docs_accepted:      0,
    docs_pending:       0,
    docs_rejected:      0,
  }))

  // Enrichir avec comptage docs par statut
  for (const app of applications) {
    const docStats = await db.prepare(
      `SELECT status, COUNT(*) as cnt FROM kyc_documents WHERE application_id=? GROUP BY status`
    ).bind(app.id).all()
    for (const ds of (docStats.results as any[])) {
      if (ds.status === 'accepted') app.docs_accepted = ds.cnt
      else if (ds.status === 'pending') app.docs_pending = ds.cnt
      else if (ds.status === 'rejected') app.docs_rejected = ds.cnt
    }
  }

  return c.json({
    applications,
    total: total?.cnt || 0,
    page: parseInt(page),
    per_page: parseInt(per_page),
  })
})

// ─────────────────────────────────────────────────────────────
// GET /admin/kyc/application/:id — Détail complet d'un dossier
// ─────────────────────────────────────────────────────────────
kycAdmin.get('/application/:id', requirePermission('kyc.view'), async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')

  const [app, member, docs, flags, audit, rejReasons] = await Promise.all([
    db.prepare(`
      SELECT ka.*, au.email as assigned_admin_email
      FROM kyc_applications ka
      LEFT JOIN admin_users au ON au.id = ka.assigned_admin_id
      WHERE ka.id = ?
    `).bind(id).first() as any,

    db.prepare(`
      SELECT id, first_name, last_name, unique_id, email, phone,
             birth_date, country_of_origin, kyc_level, kyc_status,
             kyc_level_expires_at, member_status, current_rank
      FROM members WHERE id = (SELECT member_id FROM kyc_applications WHERE id = ?)
    `).bind(id).first() as any,

    // Documents AVEC data_b64 (admin peut voir)
    db.prepare(`
      SELECT kd.*, kdt.name as doc_type_name, kdt.category, kdt.description as doc_type_desc,
             au.email as reviewed_by_email
      FROM kyc_documents kd
      JOIN kyc_doc_types kdt ON kdt.id = kd.doc_type_id
      LEFT JOIN admin_users au ON au.id = kd.reviewed_by
      WHERE kd.application_id = ?
      ORDER BY kd.uploaded_at
    `).bind(id).all(),

    db.prepare(`SELECT * FROM kyc_flags WHERE application_id=? ORDER BY severity DESC, created_at DESC`)
      .bind(id).all(),

    db.prepare(`
      SELECT kal.*, au.email as admin_email
      FROM kyc_audit_log kal
      LEFT JOIN admin_users au ON au.id = kal.admin_id
      WHERE kal.application_id = ? ORDER BY kal.created_at DESC
    `).bind(id).all(),

    db.prepare(`SELECT * FROM kyc_rejection_reasons WHERE is_active=1 ORDER BY sort_order`).all(),
  ])

  if (!app) return c.json({ error: 'Dossier introuvable' }, 404)

  // Normaliser pour le frontend (in_review → under_review)
  const appNormalized = {
    ...app,
    status:            app.status === 'in_review' ? 'under_review' : app.status,
    target_level:      app.level_requested,
    member_name:       member ? `${member.first_name} ${member.last_name}` : '—',
    member_unique_id:  member?.unique_id || '',
    assigned_to_name:  app.assigned_admin_email || null,
    documents:         (docs.results as any[]),
    flags:             (flags.results as any[]).filter((f: any) => !f.resolved_at),
  }

  return c.json({
    application: appNormalized,
    member,
    audit:             (audit.results as any[]),
    rejection_reasons: (rejReasons.results as any[]),
  })
})

// ─────────────────────────────────────────────────────────────
// POST /admin/kyc/application/:id/assign — S'assigner un dossier
// ─────────────────────────────────────────────────────────────
kycAdmin.post('/application/:id/assign', requirePermission('kyc.review'), async (c) => {
  const adminId = c.get('adminId' as any) as string
  const db = c.env.DB
  const id = c.req.param('id')

  const app = await db.prepare(
    `SELECT id, member_id, status FROM kyc_applications WHERE id=?`
  ).bind(id).first() as any
  if (!app) return c.json({ error: 'Dossier introuvable' }, 404)
  if (!['submitted','in_review'].includes(app.status)) {
    return c.json({ error: 'Ce dossier n\'est pas en attente de révision' }, 400)
  }

  await db.prepare(
    `UPDATE kyc_applications SET assigned_admin_id=?, status='in_review', updated_at=datetime('now') WHERE id=?`
  ).bind(adminId, id).run()

  await logAudit(db, { application_id: id, member_id: app.member_id, admin_id: adminId, action: 'assigned' })
  return c.json({ success: true })
})

// ─────────────────────────────────────────────────────────────
// POST /admin/kyc/document/:id/review — Accepter/rejeter un doc
// ─────────────────────────────────────────────────────────────
kycAdmin.post('/document/:id/review', requirePermission('kyc.review'), async (c) => {
  const adminId = c.get('adminId' as any) as string
  const db = c.env.DB
  const docId = c.req.param('id')
  const body = await c.req.json()
  const status = body.status
  // Accepter rejection_reason (frontend) ou rejection_reason_code (legacy)
  const rejection_reason_code = body.rejection_reason || body.rejection_reason_code || null
  const rejection_note = body.rejection_note || null
  const ocr_data = body.ocr_data || null

  if (!['accepted','rejected'].includes(status)) {
    return c.json({ error: 'Statut invalide : accepted | rejected' }, 400)
  }

  const doc = await db.prepare(
    `SELECT kd.*, ka.member_id FROM kyc_documents kd
     JOIN kyc_applications ka ON ka.id = kd.application_id
     WHERE kd.id=?`
  ).bind(docId).first() as any
  if (!doc) return c.json({ error: 'Document introuvable' }, 404)

  await db.prepare(
    `UPDATE kyc_documents SET 
       status=?, rejection_reason_code=?, rejection_note=?,
       ocr_data=?, reviewed_at=datetime('now'), reviewed_by=?
     WHERE id=?`
  ).bind(
    status,
    rejection_reason_code || null,
    rejection_note || null,
    ocr_data ? JSON.stringify(ocr_data) : null,
    adminId, docId
  ).run()

  await logAudit(db, {
    application_id: doc.application_id, member_id: doc.member_id,
    admin_id: adminId,
    action: status === 'accepted' ? 'doc_accepted' : 'doc_rejected',
    details: { doc_type_id: doc.doc_type_id, rejection_reason_code, rejection_note }
  })

  return c.json({ success: true })
})

// ─────────────────────────────────────────────────────────────
// POST /admin/kyc/application/:id/approve — Approuver le dossier
// ─────────────────────────────────────────────────────────────
kycAdmin.post('/application/:id/approve', requirePermission('kyc.approve'), async (c) => {
  const adminId = c.get('adminId' as any) as string
  const db = c.env.DB
  const id = c.req.param('id')

  const app = await db.prepare(
    `SELECT * FROM kyc_applications WHERE id=?`
  ).bind(id).first() as any
  if (!app) return c.json({ error: 'Dossier introuvable' }, 404)
  if (!['submitted','in_review'].includes(app.status)) {
    return c.json({ error: 'Ce dossier ne peut pas être approuvé dans son état actuel' }, 400)
  }

  // Récupérer la durée d'expiration KYC depuis la config
  const cfg = await db.prepare(
    `SELECT value FROM kyc_config WHERE key='kyc_expiry_days'`
  ).first() as any
  const expiryDays = parseInt(cfg?.value || '365')

  const now = new Date()
  const reviewStarted = app.submitted_at ? new Date(app.submitted_at) : now
  const durationS = Math.round((now.getTime() - reviewStarted.getTime()) / 1000)

  await db.batch([
    // Mettre à jour le dossier
    db.prepare(
      `UPDATE kyc_applications SET 
         status='approved', reviewed_at=datetime('now'), approved_at=datetime('now'),
         assigned_admin_id=?, review_duration_s=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(adminId, durationS, id),

    // Mettre à jour le niveau KYC du membre
    db.prepare(
      `UPDATE members SET 
         kyc_level=?, kyc_status='verified',
         kyc_level_expires_at=datetime('now', '+${expiryDays} days'),
         updated_at=datetime('now')
       WHERE id=?`
    ).bind(app.level_requested, app.member_id),

    // Accepter tous les documents encore en pending
    db.prepare(
      `UPDATE kyc_documents SET status='accepted', reviewed_at=datetime('now'), reviewed_by=?
       WHERE application_id=? AND status='pending'`
    ).bind(adminId, id),
  ])

  await logAudit(db, {
    application_id: id, member_id: app.member_id, admin_id: adminId,
    action: 'approved',
    details: { level: app.level_requested, expiry_days: expiryDays }
  })

  // ── Email KYC approuvé ──
  const memberForEmail = await db.prepare(
    `SELECT first_name, last_name, email FROM members WHERE id=?`
  ).bind(app.member_id).first() as any
  if (memberForEmail) {
    const levelRow = await db.prepare(`SELECT name FROM kyc_levels WHERE id=?`).bind(app.level_requested).first() as any
    const expiresAt = new Date(Date.now() + expiryDays * 86400000).toLocaleDateString('fr-FR')
    // NOTE: await direct — executionCtx non disponible dans les sous-routers Hono
    await sendEmail(db, {
      to: memberForEmail.email,
      toName: `${memberForEmail.first_name} ${memberForEmail.last_name}`,
      templateId: 'kyc_approved',
      variables: {
        prenom:           memberForEmail.first_name || '',
        niveau:           String(app.level_requested),
        niveau_nom:       levelRow?.name || `Niveau ${app.level_requested}`,
        date_approbation: new Date().toLocaleDateString('fr-FR'),
        date_expiration:  expiresAt,
        dashboard_url:    'https://willbeleader.pages.dev',
      }
    }).catch(() => {})
  }

  return c.json({ success: true, level_granted: app.level_requested })
})

// ─────────────────────────────────────────────────────────────
// POST /admin/kyc/application/:id/reject — Rejeter le dossier
// ─────────────────────────────────────────────────────────────
kycAdmin.post('/application/:id/reject', requirePermission('kyc.approve'), async (c) => {
  const adminId = c.get('adminId' as any) as string
  const db = c.env.DB
  const id = c.req.param('id')
  const body2 = await c.req.json()
  // Accepter rejection_reason (frontend) OU rejection_reason_code (legacy)
  const rejection_reason_code = body2.rejection_reason || body2.rejection_reason_code || null
  const rejection_custom_msg  = body2.rejection_custom_msg || null
  const admin_notes           = body2.admin_notes || null

  if (!rejection_reason_code) return c.json({ error: 'Motif de rejet requis' }, 400)

  const app = await db.prepare(
    `SELECT * FROM kyc_applications WHERE id=?`
  ).bind(id).first() as any
  if (!app) return c.json({ error: 'Dossier introuvable' }, 404)

  const now = new Date()
  const reviewStarted = app.submitted_at ? new Date(app.submitted_at) : now
  const durationS = Math.round((now.getTime() - reviewStarted.getTime()) / 1000)

  await db.batch([
    db.prepare(
      `UPDATE kyc_applications SET 
         status='rejected', reviewed_at=datetime('now'),
         assigned_admin_id=?, rejection_reason_code=?,
         rejection_custom_msg=?, admin_notes=?,
         review_duration_s=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(adminId, rejection_reason_code, rejection_custom_msg || null, admin_notes || null, durationS, id),

    // Remettre kyc_status à rejected si aucune approbation précédente
    db.prepare(
      `UPDATE members SET kyc_status='rejected', updated_at=datetime('now')
       WHERE id=? AND kyc_level < ?`
    ).bind(app.member_id, app.level_requested),
  ])

  await logAudit(db, {
    application_id: id, member_id: app.member_id, admin_id: adminId,
    action: 'rejected',
    details: { rejection_reason_code, rejection_custom_msg }
  })

  // ── Email KYC rejeté ──
  const memberForReject = await db.prepare(
    `SELECT first_name, last_name, email FROM members WHERE id=?`
  ).bind(app.member_id).first() as any
  if (memberForReject) {
    // NOTE: await direct — executionCtx non disponible dans les sous-routers Hono
    await sendEmail(db, {
      to: memberForReject.email,
      toName: `${memberForReject.first_name} ${memberForReject.last_name}`,
      templateId: 'kyc_rejected',
      variables: {
        prenom:        memberForReject.first_name || '',
        niveau:        String(app.level_requested),
        raison_rejet:  rejection_custom_msg || rejection_reason_code || 'Motif non précisé',
        dashboard_url: 'https://willbeleader.pages.dev',
      }
    }).catch(() => {})
  }

  return c.json({ success: true })
})

// ─────────────────────────────────────────────────────────────
// POST /admin/kyc/flag — Ajouter un flag manuel
// ─────────────────────────────────────────────────────────────
kycAdmin.post('/flag', requirePermission('kyc.review'), async (c) => {
  const adminId = c.get('adminId' as any) as string
  const db = c.env.DB
  const { application_id, flag_type, severity, description } = await c.req.json()

  const app = await db.prepare(
    `SELECT member_id FROM kyc_applications WHERE id=?`
  ).bind(application_id).first() as any
  if (!app) return c.json({ error: 'Dossier introuvable' }, 404)

  await db.prepare(
    `INSERT INTO kyc_flags (application_id, member_id, flag_type, severity, description, auto_detected)
     VALUES (?, ?, ?, ?, ?, 0)`
  ).bind(application_id, app.member_id, flag_type || 'manual', severity || 'medium', description).run()

  await logAudit(db, {
    application_id, member_id: app.member_id, admin_id: adminId,
    action: 'flag_added', details: { flag_type, severity, description }
  })

  return c.json({ success: true })
})

// ─────────────────────────────────────────────────────────────
// POST /admin/kyc/flag/:id/resolve — Résoudre un flag
// ─────────────────────────────────────────────────────────────
kycAdmin.post('/flag/:id/resolve', requirePermission('kyc.review'), async (c) => {
  const adminId = c.get('adminId' as any) as string
  const db = c.env.DB
  const flagId = c.req.param('id')
  const body = await c.req.json()
  // Accepter {resolution_note} (frontend) OU {note} (legacy)
  const note = body.resolution_note || body.note || null

  const flag = await db.prepare(`SELECT * FROM kyc_flags WHERE id=?`).bind(flagId).first() as any
  if (!flag) return c.json({ error: 'Flag introuvable' }, 404)

  await db.prepare(
    `UPDATE kyc_flags SET resolved=1, resolved_by=?, resolved_at=datetime('now'), resolved_note=? WHERE id=?`
  ).bind(adminId, note, flagId).run()

  await logAudit(db, {
    application_id: flag.application_id, member_id: flag.member_id,
    admin_id: adminId, action: 'flag_resolved', details: { flag_id: flagId, note }
  })

  return c.json({ success: true })
})

// ─────────────────────────────────────────────────────────────
// ── CONFIG KYC — Paramétrage complet depuis l'admin ──────────
// ─────────────────────────────────────────────────────────────

// GET /admin/kyc/config — Toute la configuration KYC
kycAdmin.get('/config', requirePermission('kyc.config'), async (c) => {
  const db = c.env.DB
  const [cfg, levels, docTypes, levelDocs, rankConditions, rejReasons] = await Promise.all([
    db.prepare(`SELECT * FROM kyc_config ORDER BY key`).all(),
    db.prepare(`SELECT * FROM kyc_levels ORDER BY sort_order`).all(),
    db.prepare(`SELECT * FROM kyc_doc_types ORDER BY sort_order`).all(),
    db.prepare(`SELECT * FROM kyc_level_docs ORDER BY level_id, sort_order`).all(),
    db.prepare(`SELECT * FROM kyc_rank_conditions ORDER BY rank_name`).all(),
    db.prepare(`SELECT * FROM kyc_rejection_reasons ORDER BY sort_order`).all(),
  ])
  // Transformer le tableau [{key, value}] en objet {key: value} pour le frontend
  const cfgObj: Record<string, any> = {}
  for (const row of (cfg.results as any[])) {
    cfgObj[row.key] = row.value
  }

  // Normaliser rank_conditions : ajouter rank_code (= rank_name), enabled (= is_active), required_level (= kyc_level_required)
  const ranksNormalized = (rankConditions.results as any[]).map((r: any) => ({
    ...r,
    rank_code:      r.rank_name,          // frontend utilise r.rank_code
    enabled:        r.is_active ? true : false, // frontend utilise r.enabled
    required_level: r.kyc_level_required, // frontend utilise r.required_level
  }))

  return c.json({
    config:            cfgObj,
    levels:            (levels.results as any[]),
    doc_types:         (docTypes.results as any[]),
    level_docs:        (levelDocs.results as any[]),
    rank_conditions:   ranksNormalized,
    rejection_reasons: (rejReasons.results as any[]),
  })
})

// PATCH /admin/kyc/config — Modifier un paramètre global
kycAdmin.patch('/config', requirePermission('kyc.config'), async (c) => {
  const db = c.env.DB
  const { key, value } = await c.req.json()
  if (!key || value === undefined) return c.json({ error: 'key et value requis' }, 400)

  await db.prepare(
    `UPDATE kyc_config SET value=?, updated_at=datetime('now') WHERE key=?`
  ).bind(String(value), key).run()

  return c.json({ success: true })
})

// ── NIVEAUX ──────────────────────────────────────────────────

// PATCH /admin/kyc/level/:id — Modifier un niveau
kycAdmin.patch('/level/:id', requirePermission('kyc.config'), async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { name, description, is_active, liveness_required } = await c.req.json()

  await db.prepare(
    `UPDATE kyc_levels SET 
       name=COALESCE(?,name), description=COALESCE(?,description),
       is_active=COALESCE(?,is_active),
       liveness_required=COALESCE(?,liveness_required),
       updated_at=datetime('now')
     WHERE id=?`
  ).bind(
    name||null,
    description||null,
    is_active!==undefined ? is_active : null,
    liveness_required!==undefined ? (liveness_required ? 1 : 0) : null,
    parseInt(id)
  ).run()

  return c.json({ success: true })
})

// ── TYPES DE DOCUMENTS ───────────────────────────────────────

// POST /admin/kyc/doc-type — Ajouter un nouveau type de document
kycAdmin.post('/doc-type', requirePermission('kyc.config'), async (c) => {
  const db = c.env.DB
  const { id, name, description, category, requires_both_sides, max_age_months, sort_order } = await c.req.json()

  if (!id || !name || !category) return c.json({ error: 'id, name et category requis' }, 400)
  if (!['identity','address','other'].includes(category)) {
    return c.json({ error: 'category doit être : identity | address | other' }, 400)
  }

  const exists = await db.prepare(`SELECT id FROM kyc_doc_types WHERE id=?`).bind(id).first()
  if (exists) return c.json({ error: 'Un type de document avec cet ID existe déjà' }, 400)

  await db.prepare(
    `INSERT INTO kyc_doc_types (id, name, description, category, requires_both_sides, max_age_months, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, name, description||null, category, requires_both_sides||0, max_age_months||null, sort_order||99).run()

  return c.json({ success: true })
})

// PATCH /admin/kyc/doc-type/:id — Modifier un type de document
kycAdmin.patch('/doc-type/:id', requirePermission('kyc.config'), async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { name, description, category, is_active, requires_both_sides, max_age_months, sort_order } = await c.req.json()

  await db.prepare(
    `UPDATE kyc_doc_types SET
       name=COALESCE(?,name),
       description=COALESCE(?,description),
       category=COALESCE(?,category),
       is_active=COALESCE(?,is_active),
       requires_both_sides=COALESCE(?,requires_both_sides),
       max_age_months=COALESCE(?,max_age_months),
       sort_order=COALESCE(?,sort_order),
       updated_at=datetime('now')
     WHERE id=?`
  ).bind(
    name||null, description||null, category||null,
    is_active!==undefined?is_active:null,
    requires_both_sides!==undefined?requires_both_sides:null,
    max_age_months!==undefined?max_age_months:null,
    sort_order!==undefined?sort_order:null,
    id
  ).run()

  return c.json({ success: true })
})

// ── DOCUMENTS REQUIS PAR NIVEAU ──────────────────────────────

// POST /admin/kyc/level-doc — Ajouter un document à un niveau
kycAdmin.post('/level-doc', requirePermission('kyc.config'), async (c) => {
  const db = c.env.DB
  const { level_id, doc_type_id, required, doc_group, sort_order } = await c.req.json()
  if (!level_id || !doc_type_id) return c.json({ error: 'level_id et doc_type_id requis' }, 400)

  await db.prepare(
    `INSERT OR REPLACE INTO kyc_level_docs (level_id, doc_type_id, required, doc_group, sort_order)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(level_id, doc_type_id, required!==undefined?required:1, doc_group||null, sort_order||99).run()

  return c.json({ success: true })
})

// DELETE /admin/kyc/level-doc — Retirer un document d'un niveau
kycAdmin.delete('/level-doc', requirePermission('kyc.config'), async (c) => {
  const db = c.env.DB
  const { level_id, doc_type_id } = await c.req.json()
  if (!level_id || !doc_type_id) return c.json({ error: 'level_id et doc_type_id requis' }, 400)

  await db.prepare(
    `DELETE FROM kyc_level_docs WHERE level_id=? AND doc_type_id=?`
  ).bind(level_id, doc_type_id).run()

  return c.json({ success: true })
})

// PATCH /admin/kyc/level-doc — Modifier (required/group) d'un doc dans un niveau
kycAdmin.patch('/level-doc', requirePermission('kyc.config'), async (c) => {
  const db = c.env.DB
  const { level_id, doc_type_id, required, doc_group, sort_order } = await c.req.json()
  if (!level_id || !doc_type_id) return c.json({ error: 'level_id et doc_type_id requis' }, 400)

  await db.prepare(
    `UPDATE kyc_level_docs SET
       required=COALESCE(?,required),
       doc_group=COALESCE(?,doc_group),
       sort_order=COALESCE(?,sort_order)
     WHERE level_id=? AND doc_type_id=?`
  ).bind(
    required!==undefined?required:null,
    doc_group!==undefined?doc_group:null,
    sort_order!==undefined?sort_order:null,
    level_id, doc_type_id
  ).run()

  return c.json({ success: true })
})

// ── CONDITIONS PAR RANG ──────────────────────────────────────

// PATCH /admin/kyc/rank-condition/:rank — Modifier condition d'un rang
kycAdmin.patch('/rank-condition/:rank', requirePermission('kyc.config'), async (c) => {
  const db = c.env.DB
  const rank = c.req.param('rank')
  const body = await c.req.json()
  // Accepter {enabled} (frontend) OU {is_active} (legacy)
  const is_active  = body.enabled !== undefined ? (body.enabled ? 1 : 0) : (body.is_active ? 1 : 0)
  // Accepter kyc_level_required (legacy) ou required_level (frontend)
  const kyc_level_required = body.kyc_level_required !== undefined ? body.kyc_level_required : (body.required_level || 0)

  await db.prepare(
    `INSERT INTO kyc_rank_conditions (rank_name, kyc_level_required, is_active)
     VALUES (?, ?, ?)
     ON CONFLICT(rank_name) DO UPDATE SET
       kyc_level_required=excluded.kyc_level_required,
       is_active=excluded.is_active,
       updated_at=datetime('now')`
  ).bind(rank, kyc_level_required, is_active).run()

  return c.json({ success: true })
})

// ── MOTIFS DE REJET ──────────────────────────────────────────

// POST /admin/kyc/rejection-reason — Ajouter un motif de rejet
kycAdmin.post('/rejection-reason', requirePermission('kyc.config'), async (c) => {
  const db = c.env.DB
  const { code, label, member_msg, category, sort_order } = await c.req.json()
  if (!code || !label || !member_msg) return c.json({ error: 'code, label et member_msg requis' }, 400)

  const exists = await db.prepare(`SELECT id FROM kyc_rejection_reasons WHERE code=?`).bind(code).first()
  if (exists) return c.json({ error: 'Ce code de motif existe déjà' }, 400)

  await db.prepare(
    `INSERT INTO kyc_rejection_reasons (code, label, member_msg, category, sort_order)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(code, label, member_msg, category||'other', sort_order||99).run()

  return c.json({ success: true })
})

// PATCH /admin/kyc/rejection-reason/:code — Modifier un motif
kycAdmin.patch('/rejection-reason/:code', requirePermission('kyc.config'), async (c) => {
  const db = c.env.DB
  const code = c.req.param('code')
  const { label, member_msg, category, is_active, sort_order } = await c.req.json()

  await db.prepare(
    `UPDATE kyc_rejection_reasons SET
       label=COALESCE(?,label),
       member_msg=COALESCE(?,member_msg),
       category=COALESCE(?,category),
       is_active=COALESCE(?,is_active),
       sort_order=COALESCE(?,sort_order)
     WHERE code=?`
  ).bind(label||null, member_msg||null, category||null,
    is_active!==undefined?is_active:null, sort_order!==undefined?sort_order:null, code).run()

  return c.json({ success: true })
})

// ── RAPPORT KYC ──────────────────────────────────────────────
kycAdmin.get('/report', requirePermission('reports.view'), async (c) => {
  const db = c.env.DB

  const [snapshot, byLevel, topRejReasons, avgReview, flagsSummary, completionRate, recentApproved] = await Promise.all([
    // Snapshot statuts
    db.prepare(`
      SELECT status, COUNT(*) as cnt FROM kyc_applications
      WHERE status != 'draft' GROUP BY status
    `).all(),

    // Distribution niveaux membres
    db.prepare(`
      SELECT m.kyc_level, kl.name as level_name, COUNT(*) as cnt
      FROM members m
      LEFT JOIN kyc_levels kl ON kl.id = m.kyc_level
      WHERE m.unique_id != 'ROOT'
      GROUP BY m.kyc_level ORDER BY m.kyc_level
    `).all(),

    // Top motifs de rejet
    db.prepare(`
      SELECT rejection_reason_code, COUNT(*) as cnt
      FROM kyc_applications WHERE status='rejected' AND rejection_reason_code IS NOT NULL
      GROUP BY rejection_reason_code ORDER BY cnt DESC LIMIT 10
    `).all(),

    // Temps moyen de traitement
    db.prepare(`
      SELECT AVG(review_duration_s) as avg_s, MIN(review_duration_s) as min_s, MAX(review_duration_s) as max_s
      FROM kyc_applications WHERE status IN ('approved','rejected') AND review_duration_s IS NOT NULL
    `).first() as any,

    // Flags par type
    db.prepare(`
      SELECT flag_type, severity, COUNT(*) as cnt, SUM(resolved) as resolved_cnt
      FROM kyc_flags GROUP BY flag_type, severity ORDER BY cnt DESC
    `).all(),

    // Taux de complétion réseau
    db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN kyc_level >= 1 THEN 1 ELSE 0 END) as level_1_plus,
        SUM(CASE WHEN kyc_level >= 2 THEN 1 ELSE 0 END) as level_2_plus,
        SUM(CASE WHEN kyc_level >= 3 THEN 1 ELSE 0 END) as level_3_plus
      FROM members WHERE unique_id != 'ROOT'
    `).first() as any,

    // Derniers approuvés
    db.prepare(`
      SELECT ka.approved_at, ka.level_requested, m.first_name, m.last_name, m.unique_id
      FROM kyc_applications ka JOIN members m ON m.id=ka.member_id
      WHERE ka.status='approved' ORDER BY ka.approved_at DESC LIMIT 10
    `).all(),
  ])

  return c.json({
    generated_at:    new Date().toISOString(),
    snapshot:        (snapshot.results as any[]),
    by_level:        (byLevel.results as any[]),
    top_rej_reasons: (topRejReasons.results as any[]),
    avg_review: {
      avg_minutes: avgReview?.avg_s ? Math.round(avgReview.avg_s / 60) : null,
      min_minutes: avgReview?.min_s ? Math.round(avgReview.min_s / 60) : null,
      max_minutes: avgReview?.max_s ? Math.round(avgReview.max_s / 60) : null,
    },
    flags_summary:   (flagsSummary.results as any[]),
    completion_rate: {
      total:        completionRate?.total       || 0,
      level_1_plus: completionRate?.level_1_plus || 0,
      level_2_plus: completionRate?.level_2_plus || 0,
      level_3_plus: completionRate?.level_3_plus || 0,
      pct_level_1:  completionRate?.total ? Math.round((completionRate.level_1_plus / completionRate.total) * 100) : 0,
      pct_level_2:  completionRate?.total ? Math.round((completionRate.level_2_plus / completionRate.total) * 100) : 0,
    },
    recent_approved: (recentApproved.results as any[]),
  })
})

// ─────────────────────────────────────────────────────────────
// GET /admin/kyc/member/:id/dossier — Dossier complet d'un membre
// ─────────────────────────────────────────────────────────────
kycAdmin.get('/member/:id/dossier', requirePermission('kyc.view'), async (c) => {
  const db = c.env.DB
  const memberId = c.req.param('id')

  const [member, applications] = await Promise.all([
    db.prepare(`SELECT id, first_name, last_name, unique_id, email, kyc_level, kyc_status FROM members WHERE id=?`)
      .bind(memberId).first() as any,
    db.prepare(`
      SELECT ka.*, GROUP_CONCAT(kd.doc_type_id) as doc_types
      FROM kyc_applications ka
      LEFT JOIN kyc_documents kd ON kd.application_id = ka.id
      WHERE ka.member_id=?
      GROUP BY ka.id
      ORDER BY ka.created_at DESC
    `).bind(memberId).all(),
  ])

  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  // Charger les docs pour chaque application
  const apps = await Promise.all(
    (applications.results as any[]).map(async (app: any) => {
      const docs = await db.prepare(`
        SELECT kd.id, kd.doc_type_id, kd.file_name, kd.mime_type, kd.status,
               kd.uploaded_at, kd.r2_key, kd.data_b64,
               kdt.name as doc_type_name
        FROM kyc_documents kd
        JOIN kyc_doc_types kdt ON kdt.id = kd.doc_type_id
        WHERE kd.application_id=?
        ORDER BY kd.uploaded_at
      `).bind(app.id).all()
      return { ...app, documents: docs.results }
    })
  )

  return c.json({
    member,
    applications: apps,
    total_applications: apps.length,
  })
})

// ─────────────────────────────────────────────────────────────
// GET /admin/kyc/member/:id/download-all — Données pour ZIP client
// ─────────────────────────────────────────────────────────────
kycAdmin.get('/member/:id/download-all', requirePermission('kyc.view'), async (c) => {
  const db = c.env.DB
  const env = c.env
  const memberId = c.req.param('id')

  const member = await db.prepare(
    `SELECT id, first_name, last_name, unique_id FROM members WHERE id=?`
  ).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  const docs = await db.prepare(`
    SELECT kd.id, kd.doc_type_id, kd.file_name, kd.mime_type, kd.data_b64, kd.r2_key,
           kd.uploaded_at, kd.status, kd.application_id,
           kdt.name as doc_type_name,
           ka.level_requested as level, ka.status as app_status
    FROM kyc_documents kd
    JOIN kyc_doc_types kdt ON kdt.id = kd.doc_type_id
    JOIN kyc_applications ka ON ka.id = kd.application_id
    WHERE kd.member_id=?
    ORDER BY ka.level_requested, kd.uploaded_at
  `).bind(memberId).all()

  // Enrichir avec data_b64 depuis R2 si disponible
  const docsWithData = await Promise.all(
    (docs.results as any[]).map(async (doc: any) => {
      let data_b64 = doc.data_b64
      if (!data_b64 && doc.r2_key && env.KYC_DOCS) {
        try {
          const obj = await (env as any).KYC_DOCS.get(doc.r2_key)
          if (obj) {
            const buf = await obj.arrayBuffer()
            data_b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
          }
        } catch {}
      }
      if (!data_b64 && doc.r2_key && env.FILES_KV) {
        try {
          data_b64 = await env.FILES_KV.get(`kyc:${doc.r2_key}`)
        } catch {}
      }
      return { ...doc, data_b64: data_b64 || null }
    })
  )

  return c.json({
    member,
    folder_name: `KYC_${member.unique_id}_${member.first_name}_${member.last_name}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
    documents: docsWithData,
    total: docsWithData.length,
  })
})

// ─────────────────────────────────────────────────────────────
// PATCH /admin/kyc/level/:id/docs — Mise à jour en masse des docs d'un niveau
// ─────────────────────────────────────────────────────────────
kycAdmin.patch('/level/:id/docs', requirePermission('kyc.config'), async (c) => {
  const db = c.env.DB
  const levelId = parseInt(c.req.param('id'))
  const { docs } = await c.req.json() as { docs: Array<{doc_type_id: string, enabled: boolean, required?: boolean, doc_group?: string, sort_order?: number}> }

  if (!Array.isArray(docs)) return c.json({ error: 'docs doit être un tableau' }, 400)

  for (const d of docs) {
    if (!d.doc_type_id) continue
    if (d.enabled === false) {
      await db.prepare(
        `DELETE FROM kyc_level_docs WHERE level_id=? AND doc_type_id=?`
      ).bind(levelId, d.doc_type_id).run()
    } else {
      await db.prepare(`
        INSERT INTO kyc_level_docs (level_id, doc_type_id, required, doc_group, sort_order)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(level_id, doc_type_id) DO UPDATE SET
          required=excluded.required,
          doc_group=excluded.doc_group,
          sort_order=excluded.sort_order
      `).bind(
        levelId, d.doc_type_id,
        d.required !== false ? 1 : 0,
        d.doc_group || null,
        d.sort_order || 99
      ).run()
    }
  }

  return c.json({ success: true, updated: docs.length })
})

// ─────────────────────────────────────────────────────────────
// GET /admin/kyc/document/:id/download — Télécharger un document
// Paramètre optionnel ?format=json → retourne { data_b64, mime_type, file_name }
// ─────────────────────────────────────────────────────────────
kycAdmin.get('/document/:id/download', requirePermission('kyc.view'), async (c) => {
  const db = c.env.DB
  const env = c.env
  const docId = c.req.param('id')
  const jsonMode = c.req.query('format') === 'json'

  const doc = await db.prepare(`
    SELECT kd.*, kdt.name as doc_type_name
    FROM kyc_documents kd
    JOIN kyc_doc_types kdt ON kdt.id = kd.doc_type_id
    WHERE kd.id=?
  `).bind(docId).first() as any
  if (!doc) return c.json({ error: 'Document introuvable' }, 404)

  let data_b64 = doc.data_b64
  let mimeType = doc.mime_type || 'application/octet-stream'

  if (!data_b64 && doc.r2_key && (env as any).KYC_DOCS) {
    try {
      const obj = await (env as any).KYC_DOCS.get(doc.r2_key)
      if (obj) {
        if (jsonMode) {
          const buf = await obj.arrayBuffer()
          data_b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
        } else {
          const buf = await obj.arrayBuffer()
          return new Response(buf, {
            headers: {
              'Content-Type': mimeType,
              'Content-Disposition': `attachment; filename="${doc.file_name || docId}"`,
            }
          })
        }
      }
    } catch {}
  }

  if (!data_b64 && doc.r2_key && env.FILES_KV) {
    try { data_b64 = await env.FILES_KV.get(`kyc:${doc.r2_key}`) } catch {}
  }

  if (!data_b64) return c.json({ error: 'Fichier non disponible' }, 404)

  // Mode JSON : retourner data_b64 pour prévisualisation frontend
  if (jsonMode) {
    return c.json({
      data_b64,
      mime_type: mimeType,
      file_name: doc.file_name || docId,
    })
  }

  const binary = atob(data_b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  return new Response(bytes.buffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${doc.file_name || docId}"`,
    }
  })
})

export default kycAdmin
