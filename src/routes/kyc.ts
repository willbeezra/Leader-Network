// ============================================================
// LEADER Network — Routes KYC
// Système KYC complet et paramétrable
// Stockage documents : Cloudflare R2 (kyc/{member_id}/{app_id}/{doc_type}.jpg)
// ============================================================
import { Hono } from 'hono'
import { verifyJWT, generateId } from '../lib/auth.js'
import { sendEmail } from '../lib/mailer.js'
import type { Bindings } from '../types/index.js'

const kyc = new Hono<{ Bindings: Bindings }>()

// ── HELPERS ─────────────────────────────────────────────────

function simpleChecksum(str: string): string {
  let hash = 0
  for (let i = 0; i < Math.min(str.length, 5000); i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36) + str.length.toString(36)
}

async function getConfig(db: D1Database): Promise<Record<string, string>> {
  const rows = await db.prepare(`SELECT key, value FROM kyc_config`).all()
  const cfg: Record<string, string> = {}
  for (const r of (rows.results as any[])) cfg[r.key] = r.value
  return cfg
}

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

// ── Stocker fichier dans R2 (avec fallback KV) ──────────────
async function storeDocFile(env: Bindings, r2Key: string, data_b64: string, mime_type: string): Promise<string> {
  // Convertir base64 → Uint8Array
  const binary = atob(data_b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  if (env.KYC_DOCS) {
    // Stocker dans R2
    await env.KYC_DOCS.put(r2Key, bytes, {
      httpMetadata: { contentType: mime_type },
      customMetadata: { uploaded_at: new Date().toISOString() }
    })
  } else {
    // Fallback KV (si R2 pas encore disponible)
    await env.FILES_KV.put(`kyc:${r2Key}`, data_b64)
  }
  return r2Key
}

// ── Récupérer fichier depuis R2 ou KV ────────────────────────
async function getDocFile(env: Bindings, r2Key: string): Promise<{ data: ArrayBuffer | null, mime: string }> {
  if (env.KYC_DOCS) {
    const obj = await env.KYC_DOCS.get(r2Key)
    if (obj) {
      const data = await obj.arrayBuffer()
      return { data, mime: obj.httpMetadata?.contentType || 'application/octet-stream' }
    }
  }
  // Fallback KV
  const b64 = await env.FILES_KV.get(`kyc:${r2Key}`)
  if (b64) {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return { data: bytes.buffer, mime: 'image/jpeg' }
  }
  return { data: null, mime: 'application/octet-stream' }
}

// ── Générer URL signée temporaire pour un document ───────────
async function getDocAsBase64(env: Bindings, r2Key: string | null, data_b64_legacy: string | null): Promise<string | null> {
  if (r2Key) {
    const { data, mime } = await getDocFile(env, r2Key)
    if (!data) return null
    const bytes = new Uint8Array(data)
    let b64 = ''
    const chunk = 8192
    for (let i = 0; i < bytes.length; i += chunk) {
      b64 += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return btoa(b64)
  }
  // Fallback : base64 stocké en D1 (legacy)
  return data_b64_legacy || null
}

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE AUTH — Membre OU Admin
// ─────────────────────────────────────────────────────────────
kyc.use('/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Token invalide' }, 401)
  c.set('memberId' as any, payload.sub as string)
  c.set('memberRole' as any, payload.role as string)
  await next()
})

// Helper : vérifier rôle admin
function isAdmin(c: any): boolean {
  return c.get('memberRole') === 'admin' || c.get('memberRole') === 'superadmin'
}

// ─────────────────────────────────────────────────────────────
// GET /kyc/config-public — Config visible par le membre
// ─────────────────────────────────────────────────────────────
kyc.get('/config-public', async (c) => {
  const db = c.env.DB
  const [cfg, levels, docTypes, levelDocs] = await Promise.all([
    getConfig(db),
    db.prepare(`SELECT * FROM kyc_levels WHERE is_active=1 ORDER BY sort_order`).all(),
    db.prepare(`SELECT * FROM kyc_doc_types WHERE is_active=1 ORDER BY sort_order`).all(),
    db.prepare(`
      SELECT kld.*, kdt.name as doc_type_name, kdt.category
      FROM kyc_level_docs kld
      JOIN kyc_doc_types kdt ON kdt.id = kld.doc_type_id
      WHERE kdt.is_active = 1
      ORDER BY kld.level_id, kld.sort_order
    `).all(),
  ])

  const allLevelDocs = levelDocs.results as any[]
  const enrichedLevels = (levels.results as any[]).map(lv => ({
    ...lv,
    level: lv.id,
    docs: allLevelDocs.filter(d => d.level_id === lv.id).map(d => ({
      doc_type_id:   d.doc_type_id,
      doc_type_name: d.doc_type_name,
      required:      d.required,
      doc_group:     d.doc_group || null,
      category:      d.category,
    }))
  }))

  return c.json({
    config: {
      kyc_enabled:      cfg['kyc_enabled'] === '1',
      max_file_size_mb: parseInt(cfg['max_file_size_mb'] || '10'),
      accepted_formats: JSON.parse(cfg['accepted_formats'] || '[]'),
    },
    kyc_enabled:      cfg['kyc_enabled'] === '1',
    max_file_size_mb: parseInt(cfg['max_file_size_mb'] || '10'),
    levels:           enrichedLevels,
    doc_types:        (docTypes.results as any[]),
    level_docs:       allLevelDocs,
    withdrawal_limits: {
      level_0: parseInt(cfg['withdrawal_limit_level0'] || '0'),
      level_1: parseInt(cfg['withdrawal_limit_level1'] || '500'),
      level_2: parseInt(cfg['withdrawal_limit_level2'] || '5000'),
      level_3: parseInt(cfg['withdrawal_limit_level3'] || '0'),
    },
  })
})

// ─────────────────────────────────────────────────────────────
// GET /kyc/status — Statut KYC du membre connecté
// ─────────────────────────────────────────────────────────────
kyc.get('/status', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const db = c.env.DB

  const [member, applications] = await Promise.all([
    db.prepare(`SELECT id, kyc_status, kyc_level, kyc_level_expires_at FROM members WHERE id=?`)
      .bind(memberId).first() as any,
    db.prepare(`
      SELECT ka.*,
             GROUP_CONCAT(kd.id) as doc_ids,
             COUNT(kd.id) as doc_count
      FROM kyc_applications ka
      LEFT JOIN kyc_documents kd ON kd.application_id = ka.id
      WHERE ka.member_id = ?
      GROUP BY ka.id
      ORDER BY ka.created_at DESC
    `).bind(memberId).all(),
  ])

  const allApps = (applications.results as any[])
  const normalizeStatus = (s: string) => s === 'in_review' ? 'under_review' : s
  const normalizedApps = allApps.map(a => ({ ...a, status: normalizeStatus(a.status) }))

  // active = dossier en cours (draft/submitted/in_review) pour le PROCHAIN niveau non encore approuvé
  // Note : on exclut "rejected" ici pour ne pas bloquer la progression vers le niveau suivant
  const memberKycLevel = member?.kyc_level || 0
  const active = normalizedApps.find(a =>
    ['submitted','under_review','draft'].includes(a.status) &&
    (a.level_requested || 0) > memberKycLevel
  )
  const approved = normalizedApps.filter(a => a.status === 'approved')
  const rejected = normalizedApps.filter(a => a.status === 'rejected')

  let activeWithDocs = active || null
  if (active) {
    const docs = await db.prepare(`
      SELECT kd.id, kd.doc_type_id, kd.file_name, kd.file_size, kd.mime_type,
             kd.status, kd.rejection_reason_code, kd.rejection_note,
             kd.uploaded_at, kd.r2_key,
             kdt.name as doc_type_name
      FROM kyc_documents kd
      LEFT JOIN kyc_doc_types kdt ON kdt.id = kd.doc_type_id
      WHERE kd.application_id = ?
      ORDER BY kd.uploaded_at
    `).bind(active.id).all()
    activeWithDocs = {
      ...active,
      target_level: active.level_requested,
      documents: (docs.results as any[])
    }
  }

  // Dernier dossier rejeté pour le niveau suivant (info affichée mais ne bloque plus)
  const lastRejected = rejected.find(r => (r.level_requested || 0) > memberKycLevel) || null

  return c.json({
    current_level:            member?.kyc_level || 0,
    kyc_status:               member?.kyc_status || 'none',
    level_expires_at:         member?.kyc_level_expires_at || null,
    active_application:       activeWithDocs,
    last_rejected_application: lastRejected ? { ...lastRejected, target_level: lastRejected.level_requested } : null,
    history:                  normalizedApps.slice(0, 10),
    approved_count:           approved.length,
    rejected_count:     rejected.length,
  })
})

// ─────────────────────────────────────────────────────────────
// POST /kyc/start — Démarrer un dossier KYC pour un niveau
// ─────────────────────────────────────────────────────────────
kyc.post('/start', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const db = c.env.DB
  const body = await c.req.json()
  const level = body.target_level ?? body.level

  if (![1,2,3].includes(level)) return c.json({ error: 'Niveau invalide' }, 400)

  const cfg = await getConfig(db)
  if (cfg['kyc_enabled'] !== '1') return c.json({ error: 'KYC temporairement désactivé' }, 503)

  const member = await db.prepare(
    `SELECT kyc_level, kyc_status FROM members WHERE id=?`
  ).bind(memberId).first() as any

  if ((member?.kyc_level || 0) >= level) {
    return c.json({ error: `Vous avez déjà le niveau ${level} ou supérieur` }, 400)
  }

  // Chercher un dossier draft existant (pas submitted/in_review — ceux-là sont déjà traités)
  const existing = await db.prepare(
    `SELECT id FROM kyc_applications
     WHERE member_id=? AND level_requested=? AND status = 'draft'`
  ).bind(memberId, level).first()

  if (existing) return c.json({ success: true, application_id: (existing as any).id, existing: true })

  const attempts = await db.prepare(
    `SELECT COUNT(*) as cnt FROM kyc_applications WHERE member_id=? AND level_requested=?`
  ).bind(memberId, level).first() as any

  const maxAttempts = parseInt(cfg['max_resubmit_attempts'] || '5')
  if ((attempts?.cnt || 0) >= maxAttempts) {
    return c.json({ error: `Nombre maximum de tentatives atteint (${maxAttempts})` }, 400)
  }

  const appId = generateId()
  await db.prepare(
    `INSERT INTO kyc_applications (id, member_id, level_requested, status, attempt_number)
     VALUES (?, ?, ?, 'draft', ?)`
  ).bind(appId, memberId, level, (attempts?.cnt || 0) + 1).run()

  await logAudit(db, { application_id: appId, member_id: memberId, action: 'created', details: { level } })

  return c.json({ success: true, application_id: appId })
})

// ─────────────────────────────────────────────────────────────
// POST /kyc/upload — Uploader un document → R2
// ─────────────────────────────────────────────────────────────
kyc.post('/upload', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const db = c.env.DB

  const body = await c.req.json()
  const { application_id, doc_type_id, file_name, file_size, mime_type, data_b64 } = body

  if (!application_id || !doc_type_id || !data_b64) {
    return c.json({ error: 'Champs manquants : application_id, doc_type_id, data_b64' }, 400)
  }

  const cfg = await getConfig(db)

  // Vérifier ownership
  const app = await db.prepare(
    `SELECT id, status, level_requested FROM kyc_applications WHERE id=? AND member_id=?`
  ).bind(application_id, memberId).first() as any
  if (!app) return c.json({ error: 'Dossier introuvable' }, 404)
  if (!['draft','submitted'].includes(app.status)) {
    return c.json({ error: 'Ce dossier ne peut plus être modifié' }, 400)
  }

  // Vérifier type de document
  const docType = await db.prepare(
    `SELECT * FROM kyc_doc_types WHERE id=? AND is_active=1`
  ).bind(doc_type_id).first() as any
  if (!docType) return c.json({ error: 'Type de document invalide ou désactivé' }, 400)

  // Vérifier taille
  const maxBytes = parseInt(cfg['max_file_size_mb'] || '10') * 1024 * 1024
  if (file_size > maxBytes) {
    return c.json({ error: `Fichier trop volumineux (max ${cfg['max_file_size_mb']} MB)` }, 400)
  }

  // Vérifier format
  const accepted = JSON.parse(cfg['accepted_formats'] || '[]')
  if (accepted.length && !accepted.includes(mime_type)) {
    return c.json({ error: `Format non accepté. Formats valides : ${accepted.join(', ')}` }, 400)
  }

  // Checksum pour détection doublons
  const checksum = simpleChecksum(data_b64)

  // Détecter doublon
  let duplicateFlag = false
  if (cfg['flag_duplicate_doc'] === '1') {
    const dup = await db.prepare(
      `SELECT kd.member_id FROM kyc_documents kd
       WHERE kd.checksum=? AND kd.member_id != ? AND kd.status != 'rejected'`
    ).bind(checksum, memberId).first() as any
    if (dup) duplicateFlag = true
  }

  // Supprimer ancien document du même type (re-upload)
  const oldDoc = await db.prepare(
    `SELECT r2_key FROM kyc_documents WHERE application_id=? AND doc_type_id=?`
  ).bind(application_id, doc_type_id).first() as any
  if (oldDoc?.r2_key && c.env.KYC_DOCS) {
    await c.env.KYC_DOCS.delete(oldDoc.r2_key).catch(() => {})
  }
  await db.prepare(
    `DELETE FROM kyc_documents WHERE application_id=? AND doc_type_id=?`
  ).bind(application_id, doc_type_id).run()

  // Générer clé R2 : kyc/{member_id}/{app_id}/{doc_type_id}.jpg
  const ext = mime_type === 'application/pdf' ? 'pdf'
             : mime_type === 'image/png' ? 'png' : 'jpg'
  const r2Key = `kyc/${memberId}/${application_id}/${doc_type_id}.${ext}`

  // Stocker dans R2 (ou KV fallback)
  let storedR2Key: string | null = null
  let storedB64: string | null = null
  try {
    storedR2Key = await storeDocFile(c.env, r2Key, data_b64, mime_type || 'image/jpeg')
  } catch(err) {
    console.error('R2 store error, fallback to D1:', err)
    storedB64 = data_b64  // fallback D1
  }

  // Insérer en DB
  const docId = generateId()
  await db.prepare(
    `INSERT INTO kyc_documents
     (id, application_id, member_id, doc_type_id, file_name, file_size, mime_type,
      data_b64, r2_key, r2_uploaded_at, checksum)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`
  ).bind(
    docId, application_id, memberId, doc_type_id,
    file_name || 'document', file_size || 0, mime_type || 'image/jpeg',
    storedB64 || '',        // data_b64 vide si stocké en R2
    storedR2Key || null,
    checksum
  ).run()

  // Flag doublon
  if (duplicateFlag) {
    await db.prepare(
      `INSERT INTO kyc_flags (application_id, member_id, flag_type, severity, description, auto_detected)
       VALUES (?, ?, 'duplicate_doc', 'critical', 'Document identique détecté sur un autre compte', 1)`
    ).bind(application_id, memberId).run()
  }

  await logAudit(db, {
    application_id, member_id: memberId, action: 'doc_uploaded',
    details: { doc_type_id, file_name, file_size, r2_key: storedR2Key, duplicate_flag: duplicateFlag }
  })

  return c.json({ success: true, document_id: docId, duplicate_detected: duplicateFlag })
})

// ─────────────────────────────────────────────────────────────
// POST /kyc/submit — Soumettre le dossier pour révision
// ─────────────────────────────────────────────────────────────
kyc.post('/submit', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const db = c.env.DB
  const body = await c.req.json()
  const { application_id, force_manual } = body

  const app = await db.prepare(
    `SELECT * FROM kyc_applications WHERE id=? AND member_id=?`
  ).bind(application_id, memberId).first() as any
  if (!app) return c.json({ error: 'Dossier introuvable' }, 404)
  // Autoriser la soumission manuelle même si l'analyse auto a déjà traité le dossier
  // (statuts 'rejected' ou 'in_review' = fallback manuel transparent)
  if (['submitted', 'approved'].includes(app.status)) {
    return c.json({ success: true, already_submitted: true }, 200)
  }

  const docs = await db.prepare(
    `SELECT doc_type_id FROM kyc_documents WHERE application_id=?`
  ).bind(application_id).all()
  const submittedTypes = (docs.results as any[]).map(d => d.doc_type_id)

  // En mode force_manual (fallback automatique), on ne bloque pas sur les docs manquants
  if (!force_manual) {
    const required = await db.prepare(
      `SELECT kld.doc_type_id, kld.required, kld.doc_group, kdt.name
       FROM kyc_level_docs kld
       JOIN kyc_doc_types kdt ON kdt.id = kld.doc_type_id
       WHERE kld.level_id = ? AND kdt.is_active = 1`
    ).bind(app.level_requested).all()
    const requiredDocs = (required.results as any[])

    const mandatory = requiredDocs.filter(d => d.required === 1 && !d.doc_group)
    const missing = mandatory.filter(d => !submittedTypes.includes(d.doc_type_id))
    if (missing.length > 0) {
      return c.json({
        error: 'Documents obligatoires manquants',
        missing: missing.map(d => ({ id: d.doc_type_id, name: d.name }))
      }, 400)
    }

    const groups = [...new Set(requiredDocs.filter(d => d.doc_group).map(d => d.doc_group))]
    for (const group of groups) {
      const groupDocs = requiredDocs.filter(d => d.doc_group === group).map(d => d.doc_type_id)
      const hasOne = groupDocs.some(id => submittedTypes.includes(id))
      if (!hasOne) {
        const groupDocNames = requiredDocs
          .filter(d => d.doc_group === group)
          .map(d => d.name)
        return c.json({
          error: `Au moins un document du groupe "${group}" est requis`,
          group, required_one_of: groupDocNames
        }, 400)
      }
    }
  }

  const cfg = await getConfig(db)
  if (cfg['flag_name_mismatch'] === '1') {
    const member = await db.prepare(
      `SELECT first_name, last_name FROM members WHERE id=?`
    ).bind(memberId).first() as any
    if (member) {
      await db.prepare(
        `INSERT OR IGNORE INTO kyc_flags
         (application_id, member_id, flag_type, severity, description, auto_detected)
         VALUES (?, ?, 'name_check_required', 'low',
                 'Vérifier que le nom sur le document correspond à : ${member.first_name} ${member.last_name}', 1)`
      ).bind(application_id, memberId).run()
    }
  }

  await db.prepare(
    `UPDATE kyc_applications SET status='submitted', submitted_at=datetime('now'), updated_at=datetime('now')
     WHERE id=?`
  ).bind(application_id).run()

  await db.prepare(
    `UPDATE members SET kyc_status='pending', updated_at=datetime('now') WHERE id=?`
  ).bind(memberId).run()

  await logAudit(db, {
    application_id, member_id: memberId, action: 'submitted',
    details: { level: app.level_requested, doc_count: submittedTypes.length }
  })

  // ── Email confirmation soumission KYC ────────────────────
  // NOTE: await direct (pas waitUntil) — executionCtx non disponible dans les sous-routers Hono
  const mbrKyc = await db.prepare(
    `SELECT first_name, email FROM members WHERE id=?`
  ).bind(memberId).first() as any
  if (mbrKyc) {
    await sendEmail(db, {
      to: mbrKyc.email, toName: mbrKyc.first_name,
      templateId: 'kyc_submitted',
      variables: {
        prenom:        mbrKyc.first_name || '',
        dashboard_url: 'https://willbeleader.pages.dev',
      }
    }).catch(() => {})
  }

  return c.json({ success: true, message: 'Dossier soumis avec succès. Notre équipe le traitera sous 48h.' })
})

// ─────────────────────────────────────────────────────────────
// GET /kyc/application/:id — Détail d'un dossier (membre)
// ─────────────────────────────────────────────────────────────
kyc.get('/application/:id', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const db = c.env.DB
  const id = c.req.param('id')

  const [app, docs, flags, audit] = await Promise.all([
    db.prepare(`SELECT * FROM kyc_applications WHERE id=? AND member_id=?`)
      .bind(id, memberId).first() as any,
    db.prepare(`
      SELECT kd.id, kd.doc_type_id, kd.file_name, kd.file_size, kd.mime_type,
             kd.status, kd.rejection_reason_code, kd.rejection_note,
             kd.uploaded_at, kd.r2_key,
             kdt.name as doc_type_name, kdt.description as doc_type_desc
      FROM kyc_documents kd
      JOIN kyc_doc_types kdt ON kdt.id = kd.doc_type_id
      WHERE kd.application_id=?
      ORDER BY kd.uploaded_at
    `).bind(id).all(),
    db.prepare(`SELECT * FROM kyc_flags WHERE application_id=? AND auto_detected=1 ORDER BY created_at DESC`)
      .bind(id).all(),
    db.prepare(`SELECT action, details, created_at FROM kyc_audit_log WHERE application_id=? ORDER BY created_at DESC LIMIT 20`)
      .bind(id).all(),
  ])

  if (!app) return c.json({ error: 'Dossier introuvable' }, 404)

  // Ne pas exposer data_b64 ni admin_notes ni r2_key au membre
  const safeDocs = (docs.results as any[]).map(d => ({
    id: d.id, doc_type_id: d.doc_type_id, doc_type_name: d.doc_type_name,
    doc_type_desc: d.doc_type_desc, file_name: d.file_name,
    file_size: d.file_size, mime_type: d.mime_type,
    status: d.status, rejection_reason_code: d.rejection_reason_code,
    rejection_note: d.rejection_note, uploaded_at: d.uploaded_at,
    has_file: !!(d.r2_key || d.data_b64)
  }))

  return c.json({
    ...app,
    admin_notes: undefined,
    documents: safeDocs,
    public_flags: (flags.results as any[]).filter(f => f.severity !== 'critical'),
    audit: (audit.results as any[]),
  })
})

// ─────────────────────────────────────────────────────────────
// POST /kyc/analyze — Validation IA automatique KYC
// ─────────────────────────────────────────────────────────────
// Flux :
//   1. L'IA analyse le document (+ selfie si fourni)
//   2. Si l'IA approuve → niveau KYC mis à jour, dossier approuvé → decision: "approved"
//   3. Si l'IA ne peut pas valider (rejet, doute, erreur) → dossier soumis à l'admin
//      avec une note IA détaillée expliquant pourquoi → decision: "manual_review"
//   4. Le frontend n'affiche JAMAIS d'écran d'erreur — toujours un écran de succès
// ─────────────────────────────────────────────────────────────
kyc.post('/analyze', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const db = c.env.DB

  const body = await c.req.json()
  const { application_id, doc_b64, selfie_b64, doc_mime, selfie_mime } = body

  // Seul doc_b64 est obligatoire — le selfie est optionnel (niveaux sans selfie)
  if (!application_id || !doc_b64) {
    return c.json({ error: 'Champs manquants : application_id, doc_b64' }, 400)
  }
  if (!c.env.OPENAI_API_KEY) {
    // Clé OpenAI absente → fallback immédiat vers admin, sans bloquer le membre
    await _submitToAdmin(db, memberId, application_id, null, 'Clé API OpenAI non configurée sur le serveur')
    return c.json({ success: true, decision: 'manual_review', score: 0,
      message: 'Votre dossier est transmis à notre équipe pour vérification' })
  }

  const app = await db.prepare(
    `SELECT * FROM kyc_applications WHERE id=? AND member_id=?`
  ).bind(application_id, memberId).first() as any
  if (!app) return c.json({ error: 'Dossier introuvable' }, 404)
  if (!['draft','submitted','in_review'].includes(app.status)) {
    return c.json({ error: 'Ce dossier ne peut plus être vérifié' }, 400)
  }

  const hasSelfie = !!(selfie_b64 && selfie_b64.length > 100)

  // ── Construction du prompt selon présence ou non du selfie ──
  const promptText = hasSelfie
    ? `Tu es un expert en vérification d'identité KYC. Tu analyses 2 images pour valider l'identité d'une personne.
- Image 1 : document d'identité officiel (CNI, passeport, permis de conduire, titre de séjour)
- Image 2 : selfie de la personne (peut tenir ou non le document, peut être pris depuis un écran)

IMPORTANT : Tu n'es pas un système biométrique de précision. Tu fais une estimation visuelle. Sois pragmatique et bienveillant : si la personne ressemble globalement à la photo du document, approuve.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte avant ou après :
{
  "valid_doc": true/false,
  "doc_type": "id_card|passport|driving_license|residence_permit|unknown",
  "doc_readable": true/false,
  "doc_expired": true/false,
  "face_detected_doc": true/false,
  "face_detected_selfie": true/false,
  "faces_match": true/false,
  "similarity_score": 0-100,
  "rejection_reason": "explication courte et précise en français du problème bloquant, ou null si OK",
  "recommendation": "approve|manual_review"
}

Règles de décision :
- "approve" : document valide + lisible + non expiré + un visage visible sur chaque image + les deux personnes semblent être la même (score estimé ≥ 55)
- "manual_review" : document invalide/illisible/expiré, OU aucun visage détectable, OU les personnes sont clairement différentes (score < 55)
Note : un score entre 55 et 75 est normal pour une estimation visuelle — c'est suffisant pour "approve" si rien d'autre ne bloque.
NE JAMAIS répondre autre chose que "approve" ou "manual_review" dans le champ recommendation.`
    : `Tu es un expert en vérification d'identité KYC. Tu analyses un document d'identité.
- Image 1 : document d'identité officiel (CNI, passeport, permis de conduire, justificatif de domicile, titre de séjour)

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte avant ou après :
{
  "valid_doc": true/false,
  "doc_type": "id_card|passport|driving_license|proof_of_address|residence_permit|unknown",
  "doc_readable": true/false,
  "doc_expired": true/false,
  "face_detected_doc": true/false,
  "faces_match": null,
  "face_detected_selfie": null,
  "similarity_score": null,
  "rejection_reason": "explication courte et précise en français du problème bloquant, ou null si OK",
  "recommendation": "approve|manual_review"
}

Règles de décision :
- "approve" : document reconnaissable + suffisamment lisible + semble valide + non expiré
- "manual_review" : document clairement illisible, très flou, tronqué au point d'être inutilisable, expiré, ou de type totalement inconnu
En cas de doute léger, préfère "approve" — l'admin peut toujours rejeter ensuite.
NE JAMAIS répondre autre chose que "approve" ou "manual_review" dans le champ recommendation.`

  // ── Appel GPT-4o Vision ────────────────────────────────────
  let aiResult: any = null
  let aiError: string | null = null

  try {
    const imageContent: any[] = [
      { type: 'text', text: promptText },
      { type: 'image_url', image_url: { url: `data:${doc_mime || 'image/jpeg'};base64,${doc_b64}`, detail: 'high' } }
    ]
    if (hasSelfie) {
      imageContent.push({
        type: 'image_url',
        image_url: { url: `data:${selfie_mime || 'image/jpeg'};base64,${selfie_b64}`, detail: 'high' }
      })
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: imageContent }],
        max_tokens: 500,
        temperature: 0,
      })
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error('OpenAI API error:', openaiRes.status, errText)
      aiError = `Service OpenAI indisponible (HTTP ${openaiRes.status})`
    } else {
      const openaiData = await openaiRes.json() as any
      const rawContent = openaiData.choices?.[0]?.message?.content || ''
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      aiResult = JSON.parse(cleaned)
    }
  } catch (err: any) {
    console.error('KYC AI parse/network error:', err)
    aiError = `Erreur technique lors de l'analyse : ${err?.message || 'inconnue'}`
  }

  // ── Si l'IA a échoué techniquement → fallback admin immédiat ──
  if (!aiResult) {
    await _submitToAdmin(db, memberId, application_id, null, aiError || 'Analyse IA impossible')
    return c.json({
      success: true, decision: 'manual_review', score: 0,
      message: 'Votre dossier est transmis à notre équipe pour vérification'
    })
  }

  // ── Évaluation du résultat IA ──────────────────────────────
  const {
    recommendation, similarity_score, rejection_reason,
    faces_match, valid_doc, doc_expired, doc_readable
  } = aiResult
  const score = typeof similarity_score === 'number' ? similarity_score : 0

  // Critères d'approbation automatique
  // GPT-4o n'est pas un outil biométrique — il estime visuellement.
  // On se fie à sa recommendation + critères objectifs (doc valide/lisible/non expiré).
  // Seuil abaissé à 55 (estimation visuelle normale entre 55-75).
  // faces_match n'est PAS un critère bloquant — le score et la recommendation suffisent.
  const canAutoApprove = hasSelfie
    ? (recommendation === 'approve' && valid_doc && doc_readable && !doc_expired && (score >= 55 || score === 0))
    : (recommendation === 'approve' && valid_doc && doc_readable && !doc_expired)

  if (canAutoApprove) {
    // ✅ L'IA approuve → mise à jour immédiate du niveau KYC
    await db.prepare(
      `UPDATE kyc_applications
       SET status='approved', reviewed_at=datetime('now'), updated_at=datetime('now'),
           admin_notes=?
       WHERE id=?`
    ).bind(JSON.stringify({
      ai_validated: true,
      ai_auto_approved: true,
      score: score || null,
      doc_type: aiResult.doc_type,
      has_selfie: hasSelfie,
      analyzed_at: new Date().toISOString(),
      result: aiResult
    }), application_id).run()

    await db.prepare(
      `UPDATE members
       SET kyc_level=?, kyc_status='verified', updated_at=datetime('now')
       WHERE id=? AND (kyc_level IS NULL OR kyc_level < ?)`
    ).bind(app.level_requested, memberId, app.level_requested).run()

    await logAudit(db, {
      application_id, member_id: memberId, action: 'auto_approved',
      details: { score, has_selfie: hasSelfie, recommendation, result: aiResult }
    })

    // ── Email KYC approuvé automatiquement par l'IA ────────
    const mbrAuto = await db.prepare(
      `SELECT first_name, last_name, email FROM members WHERE id=?`
    ).bind(memberId).first() as any
    if (mbrAuto) {
      const levelRow = await db.prepare(`SELECT name FROM kyc_levels WHERE id=?`).bind(app.level_requested).first() as any
      await sendEmail(db, {
        to: mbrAuto.email, toName: `${mbrAuto.first_name} ${mbrAuto.last_name}`,
        templateId: 'kyc_approved',
        variables: {
          prenom:           mbrAuto.first_name || '',
          niveau:           String(app.level_requested),
          niveau_nom:       levelRow?.name || `Niveau ${app.level_requested}`,
          date_approbation: new Date().toLocaleDateString('fr-FR'),
          date_expiration:  'Illimitée',
          dashboard_url:    'https://willbeleader.pages.dev',
        }
      }).catch(() => {})
    }

    return c.json({
      success: true,
      decision: 'approved',
      score,
      message: 'Identité vérifiée avec succès ✓',
    })

  } else {
    // ❌ L'IA ne peut pas valider → transmission à l'admin avec note détaillée
    const aiNote = _buildAiNote(aiResult, hasSelfie, score, rejection_reason)
    await _submitToAdmin(db, memberId, application_id, aiResult, aiNote)

    return c.json({
      success: true,
      decision: 'manual_review',
      score,
      message: 'Votre dossier est transmis à notre équipe pour vérification',
    })
  }
})

// ── Helpers internes ───────────────────────────────────────

// Construit un message lisible expliquant pourquoi l'IA n'a pas pu valider
// Court, précis, actionnable — pour que l'admin comprenne en 2 secondes
function _buildAiNote(aiResult: any, hasSelfie: boolean, score: number, rejection_reason: string | null): string {
  const issues: string[] = []

  // Problèmes sur le document
  if (!aiResult.valid_doc)    issues.push('Document non reconnu (type inconnu ou image incorrecte)')
  if (!aiResult.doc_readable) issues.push('Document illisible ou trop flou')
  if (aiResult.doc_expired)   issues.push('Document expiré')

  // Problèmes sur le selfie / correspondance visages
  if (hasSelfie) {
    if (!aiResult.face_detected_doc)    issues.push('Aucun visage visible sur le document')
    if (!aiResult.face_detected_selfie) issues.push('Aucun visage visible sur le selfie')
    if (score > 0 && score < 55)        issues.push(`Correspondance visages insuffisante (score ${score}/100 — seuil : 55)`)
  }

  // Motif explicite renvoyé par l'IA
  if (rejection_reason && rejection_reason.trim()) {
    // Éviter de dupliquer si déjà couvert
    const alreadyCovered = issues.some(i => i.toLowerCase().includes(rejection_reason.substring(0, 15).toLowerCase()))
    if (!alreadyCovered) issues.push(rejection_reason.trim())
  }

  // Fallback générique si l'IA a dit manual_review sans raison précise
  if (issues.length === 0) {
    issues.push('Doute de l\'IA — vérification humaine requise (aucun critère bloquant détecté)')
  }

  const docType = aiResult.doc_type && aiResult.doc_type !== 'unknown' ? ` [${aiResult.doc_type}]` : ''
  const scoreStr = hasSelfie && score > 0 ? ` | Score similarité : ${score}/100` : ''

  return `IA — validation refusée${docType}${scoreStr} : ${issues.join(' ; ')}.`
}

// Soumet le dossier à l'admin avec une note IA dans admin_notes
async function _submitToAdmin(
  db: any,
  memberId: string,
  application_id: string,
  aiResult: any | null,
  aiNote: string
): Promise<void> {
  try {
    const notesPayload = JSON.stringify({
      ai_validated: false,
      ai_could_not_validate: true,
      ai_note: aiNote,
      analyzed_at: new Date().toISOString(),
      has_selfie: !!(aiResult),
      result: aiResult || null
    })

    // Passer le dossier en "submitted" pour qu'il apparaisse dans la queue admin
    await db.prepare(
      `UPDATE kyc_applications
       SET status='submitted',
           submitted_at=COALESCE(submitted_at, datetime('now')),
           updated_at=datetime('now'),
           admin_notes=?
       WHERE id=? AND member_id=?`
    ).bind(notesPayload, application_id, memberId).run()

    await db.prepare(
      `UPDATE members SET kyc_status='pending', updated_at=datetime('now') WHERE id=?`
    ).bind(memberId).run()

    await logAudit(db, {
      application_id,
      member_id: memberId,
      action: 'manual_review_required',
      details: { ai_note: aiNote, ai_result: aiResult }
    })

    // ── Email confirmation soumission KYC ──────────────────
    const mbrKyc = await db.prepare(
      `SELECT first_name, email FROM members WHERE id=?`
    ).bind(memberId).first() as any
    if (mbrKyc) {
      await sendEmail(db, {
        to: mbrKyc.email, toName: mbrKyc.first_name,
        templateId: 'kyc_submitted',
        variables: {
          prenom:        mbrKyc.first_name || '',
          dashboard_url: 'https://willbeleader.pages.dev',
        }
      }).catch(() => {})
    }
  } catch (e) {
    console.error('_submitToAdmin error:', e)
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /kyc/document/:id — Supprimer un document (si draft)
// ─────────────────────────────────────────────────────────────
kyc.delete('/document/:id', async (c) => {
  const memberId = c.get('memberId' as any) as string
  const db = c.env.DB
  const docId = c.req.param('id')

  const doc = await db.prepare(
    `SELECT kd.*, ka.status as app_status FROM kyc_documents kd
     JOIN kyc_applications ka ON ka.id = kd.application_id
     WHERE kd.id=? AND kd.member_id=?`
  ).bind(docId, memberId).first() as any

  if (!doc) return c.json({ error: 'Document introuvable' }, 404)
  if (doc.app_status !== 'draft') return c.json({ error: 'Impossible de supprimer un document d\'un dossier soumis' }, 400)

  // Supprimer de R2
  if (doc.r2_key && c.env.KYC_DOCS) {
    await c.env.KYC_DOCS.delete(doc.r2_key).catch(() => {})
  }

  await db.prepare(`DELETE FROM kyc_documents WHERE id=?`).bind(docId).run()
  return c.json({ success: true })
})

// =============================================================
// ROUTES ADMIN KYC
// =============================================================

// ── Middleware admin ──────────────────────────────────────────
async function requireAdmin(c: any, next: any) {
  if (!isAdmin(c)) return c.json({ error: 'Accès réservé aux administrateurs' }, 403)
  await next()
}

// ─────────────────────────────────────────────────────────────
// GET /kyc/admin/dashboard — Statistiques KYC admin
// ─────────────────────────────────────────────────────────────
kyc.get('/admin/dashboard', requireAdmin, async (c) => {
  const db = c.env.DB
  const [pending, inReview, approved30, rejected30, total] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as cnt FROM kyc_applications WHERE status='submitted'`).first() as any,
    db.prepare(`SELECT COUNT(*) as cnt FROM kyc_applications WHERE status='in_review'`).first() as any,
    db.prepare(`SELECT COUNT(*) as cnt FROM kyc_applications WHERE status='approved' AND reviewed_at >= datetime('now','-30 days')`).first() as any,
    db.prepare(`SELECT COUNT(*) as cnt FROM kyc_applications WHERE status='rejected' AND reviewed_at >= datetime('now','-30 days')`).first() as any,
    db.prepare(`SELECT COUNT(*) as cnt FROM kyc_applications`).first() as any,
  ])

  return c.json({
    stats: {
      pending_review: pending?.cnt || 0,
      in_review:      inReview?.cnt || 0,
      approved_30d:   approved30?.cnt || 0,
      rejected_30d:   rejected30?.cnt || 0,
      total:          total?.cnt || 0,
    }
  })
})

// ─────────────────────────────────────────────────────────────
// GET /kyc/admin/queue — File d'attente admin
// ─────────────────────────────────────────────────────────────
kyc.get('/admin/queue', requireAdmin, async (c) => {
  const db = c.env.DB
  const status = c.req.query('status') || ''
  const level  = c.req.query('level') || ''
  const page   = parseInt(c.req.query('page') || '1')
  const perPage = 20

  let where = `WHERE 1=1`
  const binds: any[] = []

  if (status) {
    // Normaliser : under_review → in_review en DB
    const dbStatus = status === 'under_review' ? 'in_review' : status
    where += ` AND ka.status=?`
    binds.push(dbStatus)
  } else {
    where += ` AND ka.status IN ('submitted','in_review')`
  }

  if (level) { where += ` AND ka.level_requested=?`; binds.push(parseInt(level)) }

  const offset = (page - 1) * perPage

  const [apps, countRow] = await Promise.all([
    db.prepare(`
      SELECT ka.*,
             m.first_name || ' ' || m.last_name as member_name,
             m.unique_id as member_unique_id,
             m.email as member_email,
             ka.level_requested as target_level,
             CASE ka.status WHEN 'in_review' THEN 'under_review' ELSE ka.status END as status,
             COUNT(kd.id) as docs_total,
             SUM(CASE WHEN kd.status='accepted' THEN 1 ELSE 0 END) as docs_accepted,
             SUM(CASE WHEN kd.status='pending' THEN 1 ELSE 0 END) as docs_pending,
             SUM(CASE WHEN kd.status='rejected' THEN 1 ELSE 0 END) as docs_rejected,
             au.first_name || ' ' || au.last_name as assigned_to_name
      FROM kyc_applications ka
      JOIN members m ON m.id = ka.member_id
      LEFT JOIN kyc_documents kd ON kd.application_id = ka.id
      LEFT JOIN admin_users au ON au.id = ka.assigned_admin_id
      ${where}
      GROUP BY ka.id
      ORDER BY ka.submitted_at ASC, ka.created_at ASC
      LIMIT ? OFFSET ?
    `).bind(...binds, perPage, offset).all(),
    db.prepare(`SELECT COUNT(*) as cnt FROM kyc_applications ka ${where}`).bind(...binds).first() as any,
  ])

  return c.json({
    applications: apps.results as any[],
    total: countRow?.cnt || 0,
    page, per_page: perPage
  })
})

// ─────────────────────────────────────────────────────────────
// GET /kyc/admin/application/:id — Dossier complet (admin)
// ─────────────────────────────────────────────────────────────
kyc.get('/admin/application/:id', requireAdmin, async (c) => {
  const db = c.env.DB
  const appId = c.req.param('id')

  const [app, docs, flags, audit] = await Promise.all([
    db.prepare(`
      SELECT ka.*,
             m.first_name || ' ' || m.last_name as member_name,
             m.unique_id as member_unique_id,
             m.email as member_email,
             m.phone as member_phone,
             m.country as member_country,
             m.kyc_level as member_kyc_level,
             ka.level_requested as target_level,
             CASE ka.status WHEN 'in_review' THEN 'under_review' ELSE ka.status END as status,
             au.first_name || ' ' || au.last_name as assigned_to_name
      FROM kyc_applications ka
      JOIN members m ON m.id = ka.member_id
      LEFT JOIN admin_users au ON au.id = ka.assigned_admin_id
      WHERE ka.id=?
    `).bind(appId).first() as any,
    db.prepare(`
      SELECT kd.*, kdt.name as doc_type_name, kdt.category as doc_category
      FROM kyc_documents kd
      JOIN kyc_doc_types kdt ON kdt.id = kd.doc_type_id
      WHERE kd.application_id=?
      ORDER BY kd.uploaded_at
    `).bind(appId).all(),
    db.prepare(`SELECT * FROM kyc_flags WHERE application_id=? ORDER BY created_at DESC`).bind(appId).all(),
    db.prepare(`
      SELECT kal.*, au.first_name || ' ' || au.last_name as admin_name
      FROM kyc_audit_log kal
      LEFT JOIN admin_users au ON au.id = kal.admin_id
      WHERE kal.application_id=?
      ORDER BY kal.created_at DESC LIMIT 30
    `).bind(appId).all(),
  ])

  if (!app) return c.json({ error: 'Dossier introuvable' }, 404)

  // Enrichir docs avec base64 depuis R2 pour affichage admin
  const enrichedDocs = await Promise.all((docs.results as any[]).map(async (d: any) => {
    const b64 = await getDocAsBase64(c.env, d.r2_key, d.data_b64)
    return {
      ...d,
      data_b64: b64,
      data_b64_truncated: false,
    }
  }))

  return c.json({
    application: {
      ...app,
      documents: enrichedDocs,
      flags: flags.results,
      audit: audit.results,
    }
  })
})

// ─────────────────────────────────────────────────────────────
// GET /kyc/admin/document/:docId/download — Télécharger 1 document
// ─────────────────────────────────────────────────────────────
kyc.get('/admin/document/:docId/download', requireAdmin, async (c) => {
  const db = c.env.DB
  const docId = c.req.param('docId')

  const doc = await db.prepare(
    `SELECT kd.*, kdt.name as doc_type_name
     FROM kyc_documents kd
     JOIN kyc_doc_types kdt ON kdt.id = kd.doc_type_id
     WHERE kd.id=?`
  ).bind(docId).first() as any

  if (!doc) return c.json({ error: 'Document introuvable' }, 404)

  const { data, mime } = await getDocFile(c.env, doc.r2_key)

  if (!data && !doc.data_b64) return c.json({ error: 'Fichier non trouvé' }, 404)

  if (data) {
    return new Response(data, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${doc.file_name || doc.doc_type_id}"`,
        'Cache-Control': 'no-store',
      }
    })
  }

  // Fallback base64
  const binary = atob(doc.data_b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  return new Response(bytes.buffer, {
    headers: {
      'Content-Type': doc.mime_type || 'image/jpeg',
      'Content-Disposition': `attachment; filename="${doc.file_name || doc.doc_type_id}"`,
      'Cache-Control': 'no-store',
    }
  })
})

// ─────────────────────────────────────────────────────────────
// GET /kyc/admin/member/:memberId/dossier — Dossier complet d'un membre
// ─────────────────────────────────────────────────────────────
kyc.get('/admin/member/:memberId/dossier', requireAdmin, async (c) => {
  const db = c.env.DB
  const memberId = c.req.param('memberId')

  const [member, applications] = await Promise.all([
    db.prepare(`
      SELECT id, first_name, last_name, email, unique_id, phone, country,
             kyc_status, kyc_level, kyc_level_expires_at
      FROM members WHERE id=?
    `).bind(memberId).first() as any,
    db.prepare(`
      SELECT ka.*,
             CASE ka.status WHEN 'in_review' THEN 'under_review' ELSE ka.status END as status,
             ka.level_requested as target_level,
             COUNT(kd.id) as doc_count
      FROM kyc_applications ka
      LEFT JOIN kyc_documents kd ON kd.application_id = ka.id
      WHERE ka.member_id=?
      GROUP BY ka.id
      ORDER BY ka.created_at DESC
    `).bind(memberId).all(),
  ])

  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  return c.json({
    member,
    applications: applications.results as any[],
  })
})

// ─────────────────────────────────────────────────────────────
// GET /kyc/admin/member/:memberId/download-all — ZIP de tous les docs
// Note: On retourne une liste de liens signés + métadonnées
// Le frontend génère le ZIP via JSZip
// ─────────────────────────────────────────────────────────────
kyc.get('/admin/member/:memberId/download-all', requireAdmin, async (c) => {
  const db = c.env.DB
  const memberId = c.req.param('memberId')

  const [member, docs] = await Promise.all([
    db.prepare(`SELECT id, first_name, last_name, unique_id FROM members WHERE id=?`).bind(memberId).first() as any,
    db.prepare(`
      SELECT kd.id, kd.doc_type_id, kd.file_name, kd.mime_type, kd.r2_key, kd.data_b64,
             kd.uploaded_at, kdt.name as doc_type_name,
             ka.level_requested as level, ka.status as app_status
      FROM kyc_documents kd
      JOIN kyc_applications ka ON ka.id = kd.application_id
      JOIN kyc_doc_types kdt ON kdt.id = kd.doc_type_id
      WHERE kd.member_id=?
      ORDER BY ka.level_requested, kd.uploaded_at
    `).bind(memberId).all(),
  ])

  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  // Enrichir avec les données base64 pour download
  const enrichedDocs = await Promise.all((docs.results as any[]).map(async (d: any) => {
    const b64 = await getDocAsBase64(c.env, d.r2_key, d.data_b64)
    return {
      id: d.id,
      doc_type_id: d.doc_type_id,
      doc_type_name: d.doc_type_name,
      file_name: d.file_name || `${d.doc_type_id}.jpg`,
      mime_type: d.mime_type || 'image/jpeg',
      level: d.level,
      uploaded_at: d.uploaded_at,
      data_b64: b64,
    }
  }))

  return c.json({
    member: {
      id: member.id,
      name: `${member.first_name} ${member.last_name}`,
      unique_id: member.unique_id,
    },
    documents: enrichedDocs,
    folder_name: `KYC_${member.unique_id}_${member.first_name}_${member.last_name}`,
  })
})

// ─────────────────────────────────────────────────────────────
// POST /kyc/admin/application/:id/assign — Prendre en charge
// ─────────────────────────────────────────────────────────────
kyc.post('/admin/application/:id/assign', requireAdmin, async (c) => {
  const db = c.env.DB
  const adminId = c.get('memberId' as any) as string
  const appId = c.req.param('id')

  const app = await db.prepare(`SELECT id, member_id FROM kyc_applications WHERE id=?`).bind(appId).first() as any
  if (!app) return c.json({ error: 'Dossier introuvable' }, 404)

  await db.prepare(
    `UPDATE kyc_applications SET status='in_review', assigned_admin_id=?, updated_at=datetime('now') WHERE id=?`
  ).bind(adminId, appId).run()

  await logAudit(db, { application_id: appId, member_id: app.member_id, admin_id: adminId, action: 'assigned' })
  return c.json({ success: true })
})

// ─────────────────────────────────────────────────────────────
// POST /kyc/admin/application/:id/approve — Approuver dossier
// ─────────────────────────────────────────────────────────────
kyc.post('/admin/application/:id/approve', requireAdmin, async (c) => {
  const db = c.env.DB
  const adminId = c.get('memberId' as any) as string
  const appId = c.req.param('id')
  const body = await c.req.json().catch(() => ({})) as any
  const note = body.note || ''

  const app = await db.prepare(`SELECT * FROM kyc_applications WHERE id=?`).bind(appId).first() as any
  if (!app) return c.json({ error: 'Dossier introuvable' }, 404)

  const cfg = await getConfig(db)
  const expiryDays = parseInt(cfg['kyc_expiry_days'] || '365')

  await db.prepare(
    `UPDATE kyc_applications
     SET status='approved', reviewed_at=datetime('now'), approved_at=datetime('now'),
         expires_at=datetime('now', '+${expiryDays} days'),
         assigned_admin_id=?, admin_notes=?, updated_at=datetime('now')
     WHERE id=?`
  ).bind(adminId, note, appId).run()

  await db.prepare(
    `UPDATE kyc_documents SET status='accepted', reviewed_at=datetime('now'), reviewed_by=?
     WHERE application_id=? AND status='pending'`
  ).bind(adminId, appId).run()

  await db.prepare(
    `UPDATE members
     SET kyc_level=?, kyc_status='verified', updated_at=datetime('now')
     WHERE id=? AND (kyc_level IS NULL OR kyc_level < ?)`
  ).bind(app.level_requested, app.member_id, app.level_requested).run()

  await logAudit(db, {
    application_id: appId, member_id: app.member_id, admin_id: adminId,
    action: 'approved', details: { level: app.level_requested, note }
  })

  return c.json({ success: true, message: 'Dossier approuvé — niveau KYC mis à jour' })
})

// ─────────────────────────────────────────────────────────────
// POST /kyc/admin/application/:id/reject — Rejeter dossier
// ─────────────────────────────────────────────────────────────
kyc.post('/admin/application/:id/reject', requireAdmin, async (c) => {
  const db = c.env.DB
  const adminId = c.get('memberId' as any) as string
  const appId = c.req.param('id')
  const body = await c.req.json()
  const { reason_code, custom_message } = body

  const app = await db.prepare(`SELECT * FROM kyc_applications WHERE id=?`).bind(appId).first() as any
  if (!app) return c.json({ error: 'Dossier introuvable' }, 404)

  await db.prepare(
    `UPDATE kyc_applications
     SET status='rejected', reviewed_at=datetime('now'), assigned_admin_id=?,
         rejection_reason_code=?, rejection_custom_msg=?, updated_at=datetime('now')
     WHERE id=?`
  ).bind(adminId, reason_code || null, custom_message || null, appId).run()

  await db.prepare(
    `UPDATE members SET kyc_status='rejected', updated_at=datetime('now') WHERE id=?`
  ).bind(app.member_id).run()

  await logAudit(db, {
    application_id: appId, member_id: app.member_id, admin_id: adminId,
    action: 'rejected', details: { reason_code, custom_message }
  })

  return c.json({ success: true, message: 'Dossier rejeté' })
})

// ─────────────────────────────────────────────────────────────
// PATCH /kyc/admin/document/:docId/review — Accepter/Rejeter doc
// ─────────────────────────────────────────────────────────────
kyc.patch('/admin/document/:docId/review', requireAdmin, async (c) => {
  const db = c.env.DB
  const adminId = c.get('memberId' as any) as string
  const docId = c.req.param('docId')
  const body = await c.req.json()
  const { status, rejection_reason, rejection_note } = body

  if (!['accepted','rejected'].includes(status)) return c.json({ error: 'Statut invalide' }, 400)

  const doc = await db.prepare(`SELECT kd.*, ka.id as app_id FROM kyc_documents kd JOIN kyc_applications ka ON ka.id=kd.application_id WHERE kd.id=?`).bind(docId).first() as any
  if (!doc) return c.json({ error: 'Document introuvable' }, 404)

  await db.prepare(
    `UPDATE kyc_documents SET status=?, rejection_reason_code=?, rejection_note=?,
     reviewed_at=datetime('now'), reviewed_by=? WHERE id=?`
  ).bind(status, rejection_reason || null, rejection_note || null, adminId, docId).run()

  await logAudit(db, {
    application_id: doc.app_id, member_id: doc.member_id, admin_id: adminId,
    action: status === 'accepted' ? 'doc_accepted' : 'doc_rejected',
    details: { doc_id: docId, doc_type_id: doc.doc_type_id, rejection_reason, rejection_note }
  })

  return c.json({ success: true })
})

// ─────────────────────────────────────────────────────────────
// PATCH /kyc/admin/level/:levelId/docs — Config docs par niveau
// ─────────────────────────────────────────────────────────────
kyc.patch('/admin/level/:levelId/docs', requireAdmin, async (c) => {
  const db = c.env.DB
  const levelId = parseInt(c.req.param('levelId'))
  const body = await c.req.json()
  const { docs } = body
  // docs: Array<{ doc_type_id, required, doc_group, sort_order, enabled }>

  if (!Array.isArray(docs)) return c.json({ error: 'docs doit être un tableau' }, 400)

  for (const d of docs) {
    if (d.enabled === false) {
      // Désactiver : supprimer de la table level_docs
      await db.prepare(
        `DELETE FROM kyc_level_docs WHERE level_id=? AND doc_type_id=?`
      ).bind(levelId, d.doc_type_id).run()
    } else {
      // Activer/modifier
      await db.prepare(`
        INSERT INTO kyc_level_docs (level_id, doc_type_id, required, doc_group, sort_order)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(level_id, doc_type_id) DO UPDATE SET
          required=excluded.required,
          doc_group=excluded.doc_group,
          sort_order=excluded.sort_order
      `).bind(levelId, d.doc_type_id, d.required ? 1 : 0, d.doc_group || null, d.sort_order || 0).run()
    }
  }

  return c.json({ success: true, message: `Configuration du niveau ${levelId} mise à jour` })
})

// ─────────────────────────────────────────────────────────────
// PATCH /kyc/admin/level/:levelId — Modifier nom/description d'un niveau
// ─────────────────────────────────────────────────────────────
kyc.patch('/admin/level/:levelId', requireAdmin, async (c) => {
  const db = c.env.DB
  const levelId = parseInt(c.req.param('levelId'))
  const body = await c.req.json()
  const { name, description, is_active } = body

  await db.prepare(
    `UPDATE kyc_levels SET
       name=COALESCE(?,name),
       description=COALESCE(?,description),
       is_active=COALESCE(?,is_active),
       updated_at=datetime('now')
     WHERE id=?`
  ).bind(name||null, description||null, is_active!=null?is_active:null, levelId).run()

  return c.json({ success: true })
})

// ─────────────────────────────────────────────────────────────
// GET /kyc/admin/config — Lire toute la config KYC admin
// ─────────────────────────────────────────────────────────────
kyc.get('/admin/config', requireAdmin, async (c) => {
  const db = c.env.DB
  const [configs, levels, docTypes, levelDocs] = await Promise.all([
    db.prepare(`SELECT * FROM kyc_config ORDER BY key`).all(),
    db.prepare(`SELECT * FROM kyc_levels ORDER BY sort_order`).all(),
    db.prepare(`SELECT * FROM kyc_doc_types ORDER BY sort_order`).all(),
    db.prepare(`
      SELECT kld.*, kdt.name as doc_type_name, kdt.category
      FROM kyc_level_docs kld
      JOIN kyc_doc_types kdt ON kdt.id = kld.doc_type_id
      ORDER BY kld.level_id, kld.sort_order
    `).all(),
    db.prepare(`SELECT * FROM kyc_rejection_reasons ORDER BY sort_order`).all(),
  ])

  return c.json({
    configs:     configs.results as any[],
    levels:      levels.results as any[],
    doc_types:   docTypes.results as any[],
    level_docs:  levelDocs.results as any[],
  })
})

// ─────────────────────────────────────────────────────────────
// PATCH /kyc/admin/config — Modifier un ou plusieurs paramètres
// ─────────────────────────────────────────────────────────────
kyc.patch('/admin/config', requireAdmin, async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const updates = body.updates as Array<{ key: string, value: string }>

  if (!Array.isArray(updates) || updates.length === 0) {
    return c.json({ error: 'updates doit être un tableau non vide' }, 400)
  }

  for (const u of updates) {
    if (!u.key || u.value === undefined) continue
    await db.prepare(
      `UPDATE kyc_config SET value=?, updated_at=datetime('now') WHERE key=?`
    ).bind(String(u.value), u.key).run()
  }

  return c.json({ success: true, updated: updates.length })
})

// ─────────────────────────────────────────────────────────────
// POST /kyc/admin/flag/:flagId/resolve — Résoudre un flag
// ─────────────────────────────────────────────────────────────
kyc.post('/admin/flag/:flagId/resolve', requireAdmin, async (c) => {
  const db = c.env.DB
  const adminId = c.get('memberId' as any) as string
  const flagId = c.req.param('flagId')
  const body = await c.req.json().catch(() => ({})) as any

  await db.prepare(
    `UPDATE kyc_flags SET resolved=1, resolved_by=?, resolved_at=datetime('now'), resolved_note=?
     WHERE id=?`
  ).bind(adminId, body.note || null, flagId).run()

  return c.json({ success: true })
})

export default kyc
