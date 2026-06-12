// ─────────────────────────────────────────────────────────────
// Routes Admin — Système Email
// ─────────────────────────────────────────────────────────────
import { Hono } from 'hono'
import { verifyJWT } from '../lib/auth.js'
import { sendEmail } from '../lib/mailer.js'

type Bindings = { DB: D1Database; JWT_SECRET: string }

export const emailAdmin = new Hono<{ Bindings: Bindings }>()

// ── Middleware auth admin (même logique que admin.ts) ─────────
emailAdmin.use('/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Accès refusé' }, 403)
  const adminRow = await c.env.DB.prepare(
    `SELECT id FROM admin_users WHERE id = ?`
  ).bind(payload.sub).first() as any
  if (!adminRow) return c.json({ error: 'Session invalide', code: 'INVALID_ADMIN_SESSION' }, 401)
  c.set('adminId' as any, adminRow.id as string)
  await next()
})

// ── GET /admin/emails/config ──────────────────────────────────
// Retourne config sous forme d'objet clé→valeur pour le frontend
emailAdmin.get('/config', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare(`SELECT key, value FROM email_config ORDER BY key`).all()
  const config: Record<string, string> = {}
  for (const r of (rows.results as any[])) config[r.key] = r.value
  return c.json({ config })
})

// ── PATCH /admin/emails/config ────────────────────────────────
emailAdmin.patch('/config', async (c) => {
  const db = c.env.DB
  const { key, value } = await c.req.json()
  if (!key) return c.json({ error: 'key requis' }, 400)
  await db.prepare(`UPDATE email_config SET value=? WHERE key=?`).bind(String(value ?? ''), key).run()
  return c.json({ success: true })
})

// ── POST /admin/emails/config/test ───────────────────────────
emailAdmin.post('/config/test', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const to = body.to || body.test_email
  const templateId = body.templateId || 'welcome'
  if (!to) return c.json({ error: 'to (email de test) requis' }, 400)

  const result = await sendEmail(db, {
    to,
    toName: 'Admin Test',
    templateId,
    variables: {
      prenom: 'Admin',
      nom: 'Test',
      email: to,
      membre_id: 'TEST-001',
      pin: '****',
      parrain: 'N/A',
      login_url: 'https://willbeleader.pages.dev',
      dashboard_url: 'https://willbeleader.pages.dev',
    }
  })

  if (result.success) {
    return c.json({ success: true, resendId: result.resendId })
  } else {
    // Retourner 200 avec success:false pour que le frontend affiche l'erreur proprement
    // (axios throw sur 5xx, ce qui masque le message d'erreur Resend)
    return c.json({ success: false, error: result.error || 'Échec envoi Resend' })
  }
})

// ── GET /admin/emails/templates ───────────────────────────────
// Retourne les templates avec les champs normalisés pour le frontend
emailAdmin.get('/templates', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare(
    `SELECT id, name, description, subject, body_html AS body,
            cta_label AS cta_text, cta_url, is_active AS is_enabled,
            variables, updated_at
     FROM email_templates ORDER BY id`
  ).all()

  // Parser les variables JSON + dériver la catégorie depuis l'id
  const templates = (rows.results as any[]).map(t => {
    let variables: string[] = []
    try { variables = JSON.parse(t.variables || '[]') } catch {}

    // Catégorie dérivée du préfixe de l'id
    let category = 'system'
    if (t.id.startsWith('kyc_'))        category = 'kyc'
    else if (t.id.startsWith('withdrawal_')) category = 'withdrawal'
    else if (t.id === 'welcome' || t.id.startsWith('password_') || t.id.startsWith('login_')) category = 'auth'
    else if (t.id.startsWith('commission_') || t.id.startsWith('package_')) category = 'commission'

    return { ...t, variables, category }
  })

  return c.json({ templates })
})

// ── GET /admin/emails/templates/:id ──────────────────────────
emailAdmin.get('/templates/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const tpl = await db.prepare(
    `SELECT id, name, description, subject, body_html AS body,
            cta_label AS cta_text, cta_url, is_active AS is_enabled,
            variables, updated_at
     FROM email_templates WHERE id=?`
  ).bind(id).first() as any
  if (!tpl) return c.json({ error: 'Template introuvable' }, 404)

  let variables: string[] = []
  try { variables = JSON.parse(tpl.variables || '[]') } catch {}

  let category = 'system'
  if (tpl.id.startsWith('kyc_'))           category = 'kyc'
  else if (tpl.id.startsWith('withdrawal_')) category = 'withdrawal'
  else if (tpl.id === 'welcome' || tpl.id.startsWith('password_')) category = 'auth'
  else if (tpl.id.startsWith('commission_') || tpl.id.startsWith('package_')) category = 'commission'

  return c.json({ template: { ...tpl, variables, category } })
})

// ── PATCH /admin/emails/templates/:id ────────────────────────
// Accepte body (= body_html), cta_text (= cta_label), is_enabled (= is_active)
emailAdmin.patch('/templates/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { subject, body, cta_text, cta_url, is_enabled, description } = await c.req.json()

  await db.prepare(
    `UPDATE email_templates SET
       subject   = COALESCE(?, subject),
       body_html = COALESCE(?, body_html),
       cta_label = COALESCE(?, cta_label),
       cta_url   = COALESCE(?, cta_url),
       is_active = COALESCE(?, is_active),
       description = COALESCE(?, description),
       updated_at  = datetime('now')
     WHERE id=?`
  ).bind(
    subject    ?? null,
    body       ?? null,
    cta_text   ?? null,
    cta_url    ?? null,
    is_enabled !== undefined ? (is_enabled ? 1 : 0) : null,
    description ?? null,
    id
  ).run()

  return c.json({ success: true })
})

// ── POST /admin/emails/templates/:id/preview ─────────────────
// Retourne le HTML rendu avec des données de démo
emailAdmin.post('/templates/:id/preview', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const bodyReq = await c.req.json().catch(() => ({}))

  // Config
  const cfgRows = await db.prepare(`SELECT key, value FROM email_config`).all()
  const cfgMap: Record<string, string> = {}
  for (const r of (cfgRows.results as any[])) cfgMap[r.key] = r.value

  // Template (depuis DB ou depuis le body de la requête pour aperçu live)
  const tpl = await db.prepare(`SELECT * FROM email_templates WHERE id=?`).bind(id).first() as any
  if (!tpl) return c.json({ error: 'Template introuvable' }, 404)

  // Priorité: corps envoyé dans la requête (édition live) sinon DB
  const subjectStr  = bodyReq.subject   || tpl.subject   || ''
  const bodyHtmlStr = bodyReq.body      || tpl.body_html || ''
  const ctaLabel    = bodyReq.cta_text  || tpl.cta_label || ''
  const ctaUrl      = tpl.cta_url || 'https://willbeleader.pages.dev'

  // Variables de démo
  const demoVars: Record<string, string> = {
    prenom: 'Jean', nom: 'Dupont', email: 'jean.dupont@exemple.com',
    membre_id: 'MBR-20260001', pin: '7291', parrain: 'Marie Martin',
    login_url: 'https://willbeleader.pages.dev',
    dashboard_url: 'https://willbeleader.pages.dev',
    reset_url: 'https://willbeleader.pages.dev/reset',
    niveau: '1', niveau_nom: 'Identité vérifiée', ancien_niveau: '0', nouveau_niveau: '1',
    date_approbation: new Date().toLocaleDateString('fr-FR'),
    date_expiration: new Date(Date.now() + 365*86400000).toLocaleDateString('fr-FR'),
    date_soumission: new Date().toLocaleDateString('fr-FR'),
    date_demande: new Date().toLocaleDateString('fr-FR'),
    date_traitement: new Date().toLocaleDateString('fr-FR'),
    date: new Date().toLocaleDateString('fr-FR'),
    raison_rejet: 'Document illisible — veuillez soumettre une photo plus nette.',
    montant: '500.00', devise: 'USDT', wallet: 'TQn5x8...mK7pL',
    reseau: 'TRC-20', txid: '0xabc123...def456',
    package_nom: 'Pack Premium',
    date_activation: new Date().toLocaleDateString('fr-FR'),
    jours_restants: '7', type_commission: 'Commission directe',
    source: 'Marie Martin', sla_heures: '48', expire_dans: '24 heures',
    ip: '85.123.45.67', device: 'Chrome / macOS',
    brand_name: cfgMap['brand_name'] || 'LEADER',
    support_email: cfgMap['support_email'] || 'support@entrepreneur0a1.com',
  }

  function replaceVars(text: string, vars: Record<string, string>) {
    return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
  }

  const brandColor   = cfgMap['brand_color']    || '#7C3AED'
  const brandLogoUrl = cfgMap['brand_logo_url'] || ''
  const brandName    = cfgMap['brand_name']     || 'LEADER'
  const supportEmail = cfgMap['support_email']  || ''
  const footerAddr   = cfgMap['footer_address'] || ''

  const subjectR  = replaceVars(subjectStr,  demoVars)
  const bodyR     = replaceVars(bodyHtmlStr, demoVars)
  const ctaLabelR = replaceVars(ctaLabel,    demoVars)
  const ctaUrlR   = replaceVars(ctaUrl,      demoVars)

  const cta = ctaLabelR && ctaUrlR
    ? `<div style="text-align:center;margin:32px 0;">
        <a href="${ctaUrlR}" style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;">${ctaLabelR}</a>
       </div>`
    : ''

  const logo = brandLogoUrl
    ? `<img src="${brandLogoUrl}" alt="${brandName}" style="height:40px;max-width:160px;object-fit:contain;">`
    : `<span style="font-size:22px;font-weight:800;color:#ffffff;">${brandName}</span>`

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${subjectR}</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:${brandColor};border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">${logo}</td></tr>
<tr><td style="background:#ffffff;padding:40px;border-left:1px solid #e8e8ed;border-right:1px solid #e8e8ed;">
<div style="font-size:15px;line-height:1.7;color:#374151;">${bodyR}</div>${cta}
</td></tr>
<tr><td style="background:#ffffff;padding:0 40px;border-left:1px solid #e8e8ed;border-right:1px solid #e8e8ed;"><hr style="border:none;border-top:1px solid #e8e8ed;margin:0;"></td></tr>
<tr><td style="background:#ffffff;border-radius:0 0 16px 16px;padding:24px 40px;border:1px solid #e8e8ed;border-top:none;">
<p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">Vous recevez cet email car vous êtes membre de <strong>${brandName}</strong>.</p>
${supportEmail ? `<p style="margin:0;font-size:12px;color:#9ca3af;">Support : <a href="mailto:${supportEmail}" style="color:${brandColor};">${supportEmail}</a></p>` : ''}
${footerAddr ? `<p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">${footerAddr}</p>` : ''}
</td></tr>
</table></td></tr></table></body></html>`

  return c.json({ html })
})

// ── GET /admin/emails/logs ────────────────────────────────────
// Retourne les logs avec champs normalisés pour le frontend
emailAdmin.get('/logs', async (c) => {
  const db = c.env.DB
  const status     = c.req.query('status')   || ''
  const templateId = c.req.query('template') || ''
  const page       = Math.max(1, parseInt(c.req.query('page') || '1'))
  const perPage    = 50

  let query = `SELECT id, template_id, recipient_email AS to_email,
                      subject, status, resend_id, error_message, sent_at
               FROM email_logs WHERE 1=1`
  const params: any[] = []
  if (status)     { query += ` AND status=?`;      params.push(status) }
  if (templateId) { query += ` AND template_id=?`; params.push(templateId) }
  query += ` ORDER BY sent_at DESC LIMIT ? OFFSET ?`
  params.push(perPage, (page - 1) * perPage)

  let countQ = `SELECT COUNT(*) as total FROM email_logs WHERE 1=1`
  const countParams: any[] = []
  if (status)     { countQ += ` AND status=?`;      countParams.push(status) }
  if (templateId) { countQ += ` AND template_id=?`; countParams.push(templateId) }

  const [logs, countRow] = await Promise.all([
    db.prepare(query).bind(...params).all(),
    db.prepare(countQ).bind(...(countParams.length ? countParams : [])).first() as any,
  ])

  return c.json({ logs: logs.results, total: countRow?.total || 0, page, per_page: perPage })
})

// ── DELETE /admin/emails/logs ─────────────────────────────────
emailAdmin.delete('/logs', async (c) => {
  const db = c.env.DB
  const result = await db.prepare(
    `DELETE FROM email_logs WHERE sent_at < datetime('now', '-30 days')`
  ).run()
  return c.json({ success: true, deleted: result.meta?.changes || 0 })
})
