// ─────────────────────────────────────────────────────────────
// Mailer — Service d'envoi email via Resend API
// ─────────────────────────────────────────────────────────────

export interface MailerConfig {
  apiKey: string
  fromEmail: string
  fromName: string
  replyTo?: string
  brandColor: string
  brandLogoUrl: string
  brandName: string
  supportEmail: string
  footerAddress: string
}

export interface SendEmailOptions {
  to: string
  toName?: string
  templateId: string
  variables: Record<string, string>
}

// ── Moteur de remplacement de variables ──────────────────────
function replaceVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

// ── Wrapper HTML premium autour du body ──────────────────────
function wrapInLayout(body: string, cfg: MailerConfig, subject: string, ctaLabel: string, ctaUrl: string): string {
  const cta = ctaLabel && ctaUrl
    ? `<div style="text-align:center;margin:32px 0;">
        <a href="${ctaUrl}"
           style="display:inline-block;background:${cfg.brandColor};color:#ffffff;text-decoration:none;
                  font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;
                  letter-spacing:0.3px;">
          ${ctaLabel}
        </a>
       </div>`
    : ''

  const logo = cfg.brandLogoUrl
    ? `<img src="${cfg.brandLogoUrl}" alt="${cfg.brandName}" style="height:40px;max-width:160px;object-fit:contain;">`
    : `<span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${cfg.brandName}</span>`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${subject}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Arial,sans-serif;-webkit-text-size-adjust:100%;">

  <!-- Preheader invisible -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${subject}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:${cfg.brandColor};border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
              ${logo}
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff;padding:40px;border-left:1px solid #e8e8ed;border-right:1px solid #e8e8ed;">
              <div style="font-size:15px;line-height:1.7;color:#374151;">
                ${body}
              </div>
              ${cta}
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="background:#ffffff;padding:0 40px;border-left:1px solid #e8e8ed;border-right:1px solid #e8e8ed;">
              <hr style="border:none;border-top:1px solid #e8e8ed;margin:0;">
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#ffffff;border-radius:0 0 16px 16px;padding:24px 40px;border:1px solid #e8e8ed;border-top:none;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:12px;color:#9ca3af;line-height:1.6;">
                    <p style="margin:0 0 6px;">Vous recevez cet email car vous êtes membre de <strong>${cfg.brandName}</strong>.</p>
                    ${cfg.supportEmail ? `<p style="margin:0 0 6px;">Questions ? <a href="mailto:${cfg.supportEmail}" style="color:${cfg.brandColor};text-decoration:none;">${cfg.supportEmail}</a></p>` : ''}
                    ${cfg.footerAddress ? `<p style="margin:0;">${cfg.footerAddress}</p>` : ''}
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <span style="font-size:20px;font-weight:800;color:${cfg.brandColor};">${cfg.brandName}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOTTOM SPACE -->
          <tr><td style="padding:24px 0;"></td></tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}

// ── Fonction principale d'envoi ───────────────────────────────
export async function sendEmail(
  db: D1Database,
  options: SendEmailOptions
): Promise<{ success: boolean; resendId?: string; error?: string }> {

  // 1. Charger la config email
  const cfgRows = await db.prepare(`SELECT key, value FROM email_config`).all()
  const cfgMap: Record<string, string> = {}
  for (const r of (cfgRows.results as any[])) cfgMap[r.key] = r.value

  if (cfgMap['email_enabled'] !== '1') {
    return { success: false, error: 'Emails désactivés dans la configuration' }
  }

  const apiKey = cfgMap['resend_api_key']
  if (!apiKey) {
    return { success: false, error: 'Clé API Resend non configurée' }
  }

  const mailerCfg: MailerConfig = {
    apiKey,
    fromEmail:     cfgMap['from_email']     || 'noreply@entrepreneur0a1.com',
    fromName:      cfgMap['from_name']       || 'LEADER',
    replyTo:       cfgMap['reply_to']        || undefined,
    brandColor:    cfgMap['brand_color']     || '#7C3AED',
    brandLogoUrl:  cfgMap['brand_logo_url']  || '',
    brandName:     cfgMap['brand_name']      || 'LEADER',
    supportEmail:  cfgMap['support_email']   || '',
    footerAddress: cfgMap['footer_address']  || '',
  }

  // 2. Charger le template
  const tpl = await db.prepare(
    `SELECT * FROM email_templates WHERE id=? AND is_active=1`
  ).bind(options.templateId).first() as any

  if (!tpl) {
    return { success: false, error: `Template "${options.templateId}" introuvable ou inactif` }
  }

  // 3. Fusionner variables (brand + utilisateur)
  const allVars: Record<string, string> = {
    brand_name:    mailerCfg.brandName,
    support_email: mailerCfg.supportEmail,
    ...options.variables,
  }

  const subject  = replaceVars(tpl.subject,   allVars)
  const bodyHtml = replaceVars(tpl.body_html,  allVars)
  const ctaLabel = replaceVars(tpl.cta_label || '', allVars)
  const ctaUrl   = replaceVars(tpl.cta_url   || '', allVars)

  // 4. Générer le HTML complet
  const fullHtml = wrapInLayout(bodyHtml, mailerCfg, subject, ctaLabel, ctaUrl)

  // 5. Envoyer via Resend API
  const from = `${mailerCfg.fromName} <${mailerCfg.fromEmail}>`
  const payload: any = {
    from,
    to: options.toName ? `${options.toName} <${options.to}>` : options.to,
    subject,
    html: fullHtml,
  }
  if (mailerCfg.replyTo) payload.reply_to = mailerCfg.replyTo

  let resendId = ''
  let sendError = ''
  let status = 'sent'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json() as any
    if (!res.ok) {
      sendError = data?.message || `Erreur HTTP ${res.status}`
      status = 'failed'
    } else {
      resendId = data?.id || ''
    }
  } catch (e: any) {
    sendError = e?.message || 'Erreur réseau'
    status = 'failed'
  }

  // 6. Logger le résultat
  await db.prepare(
    `INSERT INTO email_logs (template_id, recipient_email, recipient_name, subject, status, resend_id, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    options.templateId,
    options.to,
    options.toName || '',
    subject,
    status,
    resendId,
    sendError
  ).run()

  return status === 'sent'
    ? { success: true, resendId }
    : { success: false, error: sendError }
}
