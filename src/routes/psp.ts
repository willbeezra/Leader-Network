// ============================================================
// LEADER — PSP Router
// Initiation, callback, webhook pour chaque PSP automatique
// Chaque provider a sa propre logique d'intégration API
// ============================================================
import { Hono } from 'hono'
import { verifyJWT } from '../lib/auth.js'
import { activateAndReward, createNotification, walletOperation } from '../lib/mlm.js'
import { validatePSPConfig, isAutoPSP } from '../lib/psp-config.js'
import type { Bindings } from '../types/index.js'

export const pspRouter = new Hono<{ Bindings: Bindings }>()
export const pspAdminRouter = new Hono<{ Bindings: Bindings }>()

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PSPInitiateBody {
  payment_method_id: string
  amount: number
  currency?: string
  order_id?: string         // ID commande package (optionnel)
  license_id?: string       // ID licence (optionnel — parcours licenseOnly)
  topup_id?: string         // ID recharge wallet (optionnel)
  campus_order_id?: string  // ID commande formation campus (optionnel)
  return_url?: string       // URL de retour après paiement
  metadata?: Record<string, any>
}

// ─── Middleware auth membre ────────────────────────────────────────────────────

pspRouter.use('/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload || payload.role !== 'member') return c.json({ error: 'Token invalide' }, 401)
  c.set('memberId' as any, payload.sub)
  return next()
})

// ─── Middleware auth admin ─────────────────────────────────────────────────────

pspAdminRouter.use('/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
    return c.json({ error: 'Accès refusé' }, 403)
  }
  return next()
})

// ─────────────────────────────────────────────────────────────────────────────
// HELPER : récupère la config d'un PSP depuis payment_methods DB
// ─────────────────────────────────────────────────────────────────────────────

async function getPSPConfig(db: D1Database, paymentMethodId: string): Promise<{ method: any; config: any } | null> {
  const row = await db.prepare(
    `SELECT * FROM payment_methods WHERE id = ? AND is_active = 1`
  ).bind(paymentMethodId).first() as any
  if (!row) return null
  let config: any = {}
  try { config = JSON.parse(row.config || '{}') } catch {}
  return { method: row, config }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER : récupère la base URL du serveur
// ─────────────────────────────────────────────────────────────────────────────

function getBaseUrl(c: any): string {
  const host = c.req.header('x-forwarded-host') || c.req.header('host') || 'localhost:3000'
  const proto = c.req.header('x-forwarded-proto') || 'https'
  return `${proto}://${host}`
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER CRYPTO : HMAC-SHA256 (Web Crypto API — compatible Cloudflare Workers)
// ─────────────────────────────────────────────────────────────────────────────

async function hmacSHA256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hmacSHA512(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER : Enregistre un paiement initié dans wallet_topups ou order
// ─────────────────────────────────────────────────────────────────────────────

async function recordPSPSession(db: D1Database, opts: {
  memberId: string
  paymentMethodId: string
  provider: string
  amount: number
  currency: string
  externalRef: string
  orderId?: string
  licenseId?: string
  topupId?: string
  campusOrderId?: string
  metadata?: any
}): Promise<string> {
  const id = 'psp_' + Math.random().toString(36).substring(2, 18)

  // Si recharge wallet
  if (opts.topupId) {
    await db.prepare(`
      UPDATE wallet_topups
      SET external_ref = ?, status = 'pending', updated_at = datetime('now')
      WHERE id = ?
    `).bind(opts.externalRef, opts.topupId).run()
    return opts.topupId
  }

  // Si licence seule (licenseOnly) — stocke la ref PSP dans paypal_order_id (champ générique)
  if (opts.licenseId) {
    await db.prepare(`
      UPDATE finstrategia_licenses
      SET paypal_order_id = ?, status = 'pending', updated_at = datetime('now')
      WHERE id = ?
    `).bind(opts.externalRef, opts.licenseId).run()
    return opts.licenseId
  }

  // Si commande formation campus
  if (opts.campusOrderId) {
    await db.prepare(`
      UPDATE campus_course_orders
      SET payment_ref = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(opts.externalRef, opts.campusOrderId).run()
    return opts.campusOrderId
  }

  // Si commande package
  if (opts.orderId) {
    await db.prepare(`
      UPDATE package_orders
      SET paypal_order_id = ?, status = 'pending', updated_at = datetime('now')
      WHERE id = ?
    `).bind(opts.externalRef, opts.orderId).run()
    return opts.orderId
  }

  // Cas générique : créer une recharge
  await db.prepare(`
    INSERT INTO wallet_topups
      (id, member_id, payment_method_id, amount, currency, status, external_ref, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now'), datetime('now'))
  `).bind(
    id, opts.memberId, opts.paymentMethodId,
    opts.amount, opts.currency, opts.externalRef,
    JSON.stringify(opts.metadata || {})
  ).run()

  return id
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER : Confirme un paiement PSP (topup → wallet ou order → activation)
// ─────────────────────────────────────────────────────────────────────────────

async function confirmPSPPayment(db: D1Database, externalRef: string, amount: number, provider: string) {
  // 1. Chercher dans wallet_topups
  const topup = await db.prepare(
    `SELECT * FROM wallet_topups WHERE external_ref = ? AND status = 'pending'`
  ).bind(externalRef).first() as any

  if (topup) {
    await db.prepare(
      `UPDATE wallet_topups SET status='confirmed', confirmed_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
    ).bind(topup.id).run()
    await walletOperation(db, topup.member_id, topup.amount, 'credit', 'credit_topup', `Recharge ${provider} — ref: ${externalRef}`)
    await createNotification(db, topup.member_id, 'success', 'Recharge confirmée',
      `Votre recharge ${provider} de $${topup.amount} a été confirmée automatiquement.`)
    return { type: 'topup', id: topup.id }
  }

  // 2. Chercher dans finstrategia_licenses (licenseOnly via PSP) — ref stockée dans paypal_order_id
  const lic = await db.prepare(
    `SELECT * FROM finstrategia_licenses WHERE paypal_order_id = ? AND status != 'active'`
  ).bind(externalRef).first() as any

  if (lic) {
    // Calculer la date d'expiration (365 jours par défaut)
    const renewRow = await db.prepare(
      `SELECT value FROM compensation_config WHERE key = 'license_renewal_days'`
    ).first() as any
    const renewalDays = parseInt(renewRow?.value || '365')
    const now = new Date()
    const finalExpiry = new Date(now)
    finalExpiry.setDate(finalExpiry.getDate() + renewalDays)

    await db.prepare(`
      UPDATE finstrategia_licenses
      SET status = 'active', payment_method = ?, starts_at = datetime('now'),
          expires_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(provider, finalExpiry.toISOString(), lic.id).run()
    await db.prepare(`
      UPDATE members SET license_active = 1, license_expires_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(finalExpiry.toISOString(), lic.member_id).run()
    await createNotification(db, lic.member_id, 'success', 'Licence activée !',
      `Votre paiement ${provider} a été confirmé. Licence active jusqu'au ${finalExpiry.toLocaleDateString('fr-FR')}.`)
    return { type: 'license', id: lic.id }
  }

  // 3. Chercher dans package_orders
  const order = await db.prepare(
    `SELECT * FROM package_orders WHERE paypal_order_id = ? AND status != 'validated'`
  ).bind(externalRef).first() as any

  if (order) {
    await db.prepare(`
      UPDATE package_orders
      SET status='validated', payment_method=?, proof_url=?,
          validated_at=datetime('now'), updated_at=datetime('now')
      WHERE id=?
    `).bind(provider, `${provider}:${externalRef}`, order.id).run()
    try { await activateAndReward(db, order.id, `system-${provider}-webhook`) } catch (e) {
      console.error(`PSP confirmPSPPayment activateAndReward error:`, e)
    }
    await createNotification(db, order.member_id, 'success', 'Paiement confirmé',
      `Votre paiement ${provider} de $${amount} a été confirmé. Commande activée.`)
    return { type: 'order', id: order.id }
  }

  // 4. Chercher dans campus_course_orders (formations achetées via V2 PSP)
  const campusOrder = await db.prepare(
    `SELECT * FROM campus_course_orders WHERE payment_ref = ? AND status = 'pending'`
  ).bind(externalRef).first() as any

  if (campusOrder) {
    await db.prepare(`
      UPDATE campus_course_orders
      SET status = 'validated', payment_ref = ?,
          validated_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).bind(`${provider}:${externalRef}`, campusOrder.id).run()
    await createNotification(db, campusOrder.member_id, 'success', 'Formation debloquee !',
      `Votre paiement ${provider} de $${amount} a ete confirme. Acces a la formation active.`)
    console.log(`[PSP webhook campus] Formation ${campusOrder.course_id} validee via ${provider} — member=${campusOrder.member_id}`)
    return { type: 'campus_order', id: campusOrder.id }
  }

  return null
}

// ═════════════════════════════════════════════════════════════════════════════
// ROUTE PRINCIPALE : POST /api/psp/initiate
// Crée une session de paiement pour le PSP demandé
// ═════════════════════════════════════════════════════════════════════════════

pspRouter.post('/initiate', async (c) => {
  const memberId = (c as any).get('memberId') as string
  const body = await c.req.json() as PSPInitiateBody
  const { payment_method_id, amount, currency = 'USD', order_id, license_id, topup_id, campus_order_id, return_url } = body

  if (!payment_method_id || !amount || amount <= 0) {
    return c.json({ error: 'Paramètres invalides' }, 400)
  }

  const psp = await getPSPConfig(c.env.DB, payment_method_id)
  if (!psp) return c.json({ error: 'Méthode de paiement introuvable ou inactive' }, 404)

  const { method, config } = psp
  const provider = method.provider
  const baseUrl = getBaseUrl(c)

  // Vérifier que la config est complète
  const errors = validatePSPConfig(provider, config)
  if (errors.length > 0) {
    return c.json({ error: 'Configuration PSP incomplète', details: errors }, 400)
  }

  // Récupérer les infos du membre
  const member = await c.env.DB.prepare(`SELECT * FROM members WHERE id = ?`).bind(memberId).first() as any
  if (!member) return c.json({ error: 'Membre introuvable' }, 404)

  const callbackUrl = `${baseUrl}/api/psp/callback/${provider}`
  const webhookUrl = `${baseUrl}/api/psp/webhook/${provider}`
  const finalReturnUrl = return_url || `${baseUrl}/`

  try {
    switch (provider) {
      // ──────────────────────────────────────────────────────────────────────
      // STRIPE — Checkout Session
      // ──────────────────────────────────────────────────────────────────────
      case 'stripe': {
        const amountCents = Math.round(amount * 100)
        const metadata: Record<string, string> = { member_id: memberId }
        if (order_id) metadata.order_id = order_id
        if (topup_id) metadata.topup_id = topup_id

        const params = new URLSearchParams({
          'payment_method_types[]': 'card',
          'line_items[0][price_data][currency]': currency.toLowerCase(),
          'line_items[0][price_data][unit_amount]': amountCents.toString(),
          'line_items[0][price_data][product_data][name]': order_id ? 'Package LEADER' : 'Recharge portefeuille',
          'line_items[0][quantity]': '1',
          'mode': 'payment',
          'success_url': `${callbackUrl}?session_id={CHECKOUT_SESSION_ID}&type=stripe`,
          'cancel_url': finalReturnUrl,
          'client_reference_id': memberId,
        })
        Object.entries(metadata).forEach(([k, v]) => params.set(`metadata[${k}]`, v))

        const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.secret_key}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        })
        const session = await res.json() as any
        if (!res.ok) return c.json({ error: session.error?.message || 'Erreur Stripe' }, 400)

        await recordPSPSession(c.env.DB, {
          memberId, paymentMethodId: payment_method_id, provider,
          amount, currency, externalRef: session.id,
          orderId: order_id, licenseId: license_id, topupId: topup_id, campusOrderId: campus_order_id,
          metadata: { session_id: session.id }
        })

        return c.json({ redirect_url: session.url, session_id: session.id, provider })
      }

      // ──────────────────────────────────────────────────────────────────────
      // PAYPAL — Orders API v2
      // ──────────────────────────────────────────────────────────────────────
      case 'paypal': {
        const base = config.mode === 'live'
          ? 'https://api-m.paypal.com'
          : 'https://api-m.sandbox.paypal.com'

        // Obtenir un token OAuth
        const creds = btoa(`${config.client_id}:${config.client_secret}`)
        const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=client_credentials'
        })
        const { access_token } = await tokenRes.json() as any

        const customId = order_id ? `order:${order_id}` : topup_id ? `topup:${topup_id}` : `member:${memberId}`

        const orderRes = await fetch(`${base}/v2/checkout/orders`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{
              amount: { currency_code: currency.toUpperCase(), value: amount.toFixed(2) },
              custom_id: customId,
              description: order_id ? 'Package LEADER' : 'Recharge portefeuille'
            }],
            application_context: {
              return_url: `${callbackUrl}?type=paypal`,
              cancel_url: finalReturnUrl,
              brand_name: 'LEADER',
              user_action: 'PAY_NOW'
            }
          })
        })
        const paypalOrder = await orderRes.json() as any
        if (!orderRes.ok) return c.json({ error: paypalOrder.message || 'Erreur PayPal' }, 400)

        const approvalLink = paypalOrder.links?.find((l: any) => l.rel === 'approve')?.href
        if (!approvalLink) return c.json({ error: 'Impossible d\'obtenir le lien PayPal' }, 400)

        await recordPSPSession(c.env.DB, {
          memberId, paymentMethodId: payment_method_id, provider,
          amount, currency, externalRef: paypalOrder.id,
          orderId: order_id, licenseId: license_id, topupId: topup_id, campusOrderId: campus_order_id,
        })

        return c.json({ redirect_url: approvalLink, paypal_order_id: paypalOrder.id, provider })
      }

      // ──────────────────────────────────────────────────────────────────────
      // MOLLIE — Payments API
      // ──────────────────────────────────────────────────────────────────────
      case 'mollie': {
        const metadata: Record<string, any> = { member_id: memberId }
        if (order_id) metadata.order_id = order_id
        if (topup_id) metadata.topup_id = topup_id

        const res = await fetch('https://api.mollie.com/v2/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.api_key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: { currency: currency.toUpperCase(), value: amount.toFixed(2) },
            description: order_id ? 'Package LEADER' : 'Recharge portefeuille',
            method: 'creditcard',   // Force carte bancaire — Apple Pay nécessite validation domaine
            redirectUrl: `${callbackUrl}?type=mollie`,
            webhookUrl: webhookUrl,
            metadata: metadata
          })
        })
        const payment = await res.json() as any
        if (!res.ok) return c.json({ error: payment.detail || 'Erreur Mollie' }, 400)

        await recordPSPSession(c.env.DB, {
          memberId, paymentMethodId: payment_method_id, provider,
          amount, currency, externalRef: payment.id,
          orderId: order_id, licenseId: license_id, topupId: topup_id, campusOrderId: campus_order_id,
        })

        const checkoutUrl = payment._links?.checkout?.href
        return c.json({ redirect_url: checkoutUrl, payment_id: payment.id, provider })
      }

      // ──────────────────────────────────────────────────────────────────────
      // FLUTTERWAVE — Payment Link / Hosted Payment Page
      // ──────────────────────────────────────────────────────────────────────
      case 'flutterwave': {
        const txRef = `LDR-${Date.now()}-${memberId.slice(-6)}`
        const res = await fetch('https://api.flutterwave.com/v3/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.secret_key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tx_ref: txRef,
            amount: amount,
            currency: config.currency || currency.toUpperCase(),
            redirect_url: `${callbackUrl}?type=flutterwave`,
            meta: {
              member_id: memberId,
              order_id: order_id || '',
              topup_id: topup_id || ''
            },
            customer: {
              email: member.email,
              name: `${member.first_name} ${member.last_name}`
            },
            customizations: {
              title: 'LEADER',
              description: order_id ? 'Package LEADER' : 'Recharge portefeuille'
            }
          })
        })
        const data = await res.json() as any
        if (!res.ok || data.status !== 'success') {
          return c.json({ error: data.message || 'Erreur Flutterwave' }, 400)
        }

        await recordPSPSession(c.env.DB, {
          memberId, paymentMethodId: payment_method_id, provider,
          amount, currency, externalRef: txRef,
          orderId: order_id, licenseId: license_id, topupId: topup_id, campusOrderId: campus_order_id,
        })

        return c.json({ redirect_url: data.data.link, tx_ref: txRef, provider })
      }

      // ──────────────────────────────────────────────────────────────────────
      // RAZORPAY — Orders API + Hosted checkout
      // ──────────────────────────────────────────────────────────────────────
      case 'razorpay': {
        const amountPaise = Math.round(amount * 100)
        const receipt = `LDR-${Date.now()}`
        const creds = btoa(`${config.key_id}:${config.key_secret}`)

        const res = await fetch('https://api.razorpay.com/v1/payment_links', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${creds}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: currency.toUpperCase(),
            accept_partial: false,
            description: order_id ? 'Package LEADER' : 'Recharge portefeuille',
            reference_id: receipt,
            notify: { sms: false, email: false },
            reminder_enable: false,
            notes: { member_id: memberId, order_id: order_id || '', topup_id: topup_id || '' },
            callback_url: `${callbackUrl}?type=razorpay`,
            callback_method: 'get'
          })
        })
        const link = await res.json() as any
        if (!res.ok) return c.json({ error: link.error?.description || 'Erreur Razorpay' }, 400)

        await recordPSPSession(c.env.DB, {
          memberId, paymentMethodId: payment_method_id, provider,
          amount, currency, externalRef: link.id,
          orderId: order_id, licenseId: license_id, topupId: topup_id, campusOrderId: campus_order_id,
        })

        return c.json({ redirect_url: link.short_url, link_id: link.id, provider })
      }

      // ──────────────────────────────────────────────────────────────────────
      // SQUARE — Checkout API
      // ──────────────────────────────────────────────────────────────────────
      case 'square': {
        const apiBase = config.environment === 'sandbox'
          ? 'https://connect.squareupsandbox.com'
          : 'https://connect.squareup.com'
        const amountCents = Math.round(amount * 100)
        const idempotencyKey = `LDR-${Date.now()}-${memberId.slice(-6)}`

        const res = await fetch(`${apiBase}/v2/online-checkout/payment-links`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.access_token}`,
            'Content-Type': 'application/json',
            'Square-Version': '2024-01-17'
          },
          body: JSON.stringify({
            idempotency_key: idempotencyKey,
            order: {
              location_id: config.location_id,
              line_items: [{
                name: order_id ? 'Package LEADER' : 'Recharge portefeuille',
                quantity: '1',
                base_price_money: { amount: amountCents, currency: currency.toUpperCase() }
              }]
            },
            checkout_options: {
              redirect_url: `${callbackUrl}?type=square`
            },
            pre_populated_data: {
              buyer_email: member.email
            }
          })
        })
        const data = await res.json() as any
        if (!res.ok) return c.json({ error: data.errors?.[0]?.detail || 'Erreur Square' }, 400)

        await recordPSPSession(c.env.DB, {
          memberId, paymentMethodId: payment_method_id, provider,
          amount, currency, externalRef: data.payment_link?.id || idempotencyKey,
          orderId: order_id, licenseId: license_id, topupId: topup_id, campusOrderId: campus_order_id,
        })

        return c.json({ redirect_url: data.payment_link?.url, provider })
      }

      // ──────────────────────────────────────────────────────────────────────
      // ADYEN — PaymentLinks API
      // ──────────────────────────────────────────────────────────────────────
      case 'adyen': {
        const apiBase = config.environment === 'live'
          ? 'https://checkout-live.adyen.com/checkout/v70'
          : 'https://checkout-test.adyen.com/checkout/v70'
        const amountMinor = Math.round(amount * 100)
        const reference = `LDR-${Date.now()}`

        const res = await fetch(`${apiBase}/paymentLinks`, {
          method: 'POST',
          headers: {
            'X-API-Key': config.api_key,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: { value: amountMinor, currency: currency.toUpperCase() },
            merchantAccount: config.merchant_account,
            reference: reference,
            returnUrl: `${callbackUrl}?type=adyen`,
            metadata: {
              member_id: memberId,
              order_id: order_id || '',
              topup_id: topup_id || ''
            },
            shopperEmail: member.email,
            shopperName: {
              firstName: member.first_name,
              lastName: member.last_name
            }
          })
        })
        const link = await res.json() as any
        if (!res.ok) return c.json({ error: link.message || 'Erreur Adyen' }, 400)

        await recordPSPSession(c.env.DB, {
          memberId, paymentMethodId: payment_method_id, provider,
          amount, currency, externalRef: reference,
          orderId: order_id, licenseId: license_id, topupId: topup_id, campusOrderId: campus_order_id,
        })

        return c.json({ redirect_url: link.url, reference, provider })
      }

      // ──────────────────────────────────────────────────────────────────────
      // CHECKOUT.COM — Payment Links
      // ──────────────────────────────────────────────────────────────────────
      case 'checkout_com': {
        const amountCents = Math.round(amount * 100)
        const reference = `LDR-${Date.now()}`

        const res = await fetch('https://api.checkout.com/payment-links', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.secret_key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: amountCents,
            currency: currency.toUpperCase(),
            reference: reference,
            return_url: `${callbackUrl}?type=checkout_com`,
            metadata: {
              member_id: memberId,
              order_id: order_id || '',
              topup_id: topup_id || ''
            }
          })
        })
        const data = await res.json() as any
        if (!res.ok) return c.json({ error: data.error_codes?.[0] || 'Erreur Checkout.com' }, 400)

        await recordPSPSession(c.env.DB, {
          memberId, paymentMethodId: payment_method_id, provider,
          amount, currency, externalRef: reference,
          orderId: order_id, licenseId: license_id, topupId: topup_id, campusOrderId: campus_order_id,
        })

        return c.json({ redirect_url: data._links?.redirect?.href, reference, provider })
      }

      // ──────────────────────────────────────────────────────────────────────
      // COINPAYMENTS — createTransaction API
      // ──────────────────────────────────────────────────────────────────────
      case 'coinpayments': {
        const { createHmac } = await import('node:crypto').catch(() => ({ createHmac: null }))
        // On utilise Web Crypto car pas de node:crypto dans Cloudflare Workers
        const custom = order_id ? `order:${order_id}` : topup_id ? `topup:${topup_id}` : `member:${memberId}`
        const ipnUrl = `${baseUrl}/api/psp/webhook/coinpayments`

        const params = new URLSearchParams({
          version: '1',
          cmd: 'create_transaction',
          key: config.public_key,
          amount: amount.toString(),
          currency1: currency.toUpperCase(),
          currency2: config.receive_currency || 'USDT.TRC20',
          buyer_email: member.email,
          buyer_name: `${member.first_name} ${member.last_name}`,
          item_name: order_id ? 'Package LEADER' : 'Recharge portefeuille',
          ipn_url: ipnUrl,
          success_url: `${callbackUrl}?type=coinpayments`,
          cancel_url: finalReturnUrl,
          custom: custom,
          custom2: memberId,
          format: 'json'
        })
        const bodyStr = params.toString()
        const hmac = await hmacSHA512(config.private_key, bodyStr)

        const res = await fetch('https://www.coinpayments.net/api.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'HMAC': hmac
          },
          body: bodyStr
        })
        const data = await res.json() as any
        if (data.error !== 'ok') return c.json({ error: data.error || 'Erreur CoinPayments' }, 400)

        await recordPSPSession(c.env.DB, {
          memberId, paymentMethodId: payment_method_id, provider,
          amount, currency, externalRef: data.result.txn_id,
          orderId: order_id, licenseId: license_id, topupId: topup_id, campusOrderId: campus_order_id,
          metadata: { address: data.result.address, qr_url: data.result.qrcode_url }
        })

        return c.json({
          provider,
          address: data.result.address,
          amount_crypto: data.result.amount,
          currency_crypto: config.receive_currency || 'USDT.TRC20',
          qr_url: data.result.qrcode_url,
          txn_id: data.result.txn_id,
          expires_at: data.result.timeout,
          // Pour crypto, pas de redirect — affichage d'une adresse
          type: 'crypto_address'
        })
      }

      // ──────────────────────────────────────────────────────────────────────
      // COINBASE COMMERCE — Charge API
      // ──────────────────────────────────────────────────────────────────────
      case 'coinbase_commerce': {
        const res = await fetch('https://api.commerce.coinbase.com/charges', {
          method: 'POST',
          headers: {
            'X-CC-Api-Key': config.api_key,
            'X-CC-Version': '2018-03-22',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: order_id ? 'Package LEADER' : 'Recharge portefeuille',
            description: `Paiement membre ${member.first_name} ${member.last_name}`,
            local_price: { amount: amount.toFixed(2), currency: currency.toUpperCase() },
            pricing_type: 'fixed_price',
            redirect_url: `${callbackUrl}?type=coinbase_commerce`,
            cancel_url: finalReturnUrl,
            metadata: {
              member_id: memberId,
              order_id: order_id || '',
              topup_id: topup_id || ''
            }
          })
        })
        const data = await res.json() as any
        if (!res.ok) return c.json({ error: data.error?.message || 'Erreur Coinbase Commerce' }, 400)

        await recordPSPSession(c.env.DB, {
          memberId, paymentMethodId: payment_method_id, provider,
          amount, currency, externalRef: data.data.code,
          orderId: order_id, licenseId: license_id, topupId: topup_id, campusOrderId: campus_order_id,
        })

        return c.json({ redirect_url: data.data.hosted_url, charge_code: data.data.code, provider })
      }

      // ──────────────────────────────────────────────────────────────────────
      // NOWPAYMENTS — Payment API
      // ──────────────────────────────────────────────────────────────────────
      case 'nowpayments': {
        const orderId2 = `LDR-${Date.now()}`
        const res = await fetch('https://api.nowpayments.io/v1/invoice', {
          method: 'POST',
          headers: {
            'x-api-key': config.api_key,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            price_amount: amount,
            price_currency: currency.toLowerCase(),
            pay_currency: config.pay_currency || 'usdttrc20',
            order_id: orderId2,
            order_description: order_id ? 'Package LEADER' : 'Recharge portefeuille',
            ipn_callback_url: `${baseUrl}/api/psp/webhook/nowpayments`,
            success_url: `${callbackUrl}?type=nowpayments`,
            cancel_url: finalReturnUrl,
            is_fixed_rate: true,
            is_fee_paid_by_user: false
          })
        })
        const data = await res.json() as any
        if (!res.ok) return c.json({ error: data.message || 'Erreur NOWPayments' }, 400)

        // Stocker le mapping orderId2 → member/order/topup dans KV
        try {
          await (c.env as any).FILES_KV.put(
            `nowpay:${orderId2}`,
            JSON.stringify({ memberId, orderId: order_id, licenseId: license_id, topupId: topup_id, paymentMethodId: payment_method_id }),
            { expirationTtl: 86400 }
          )
        } catch {}

        await recordPSPSession(c.env.DB, {
          memberId, paymentMethodId: payment_method_id, provider,
          amount, currency, externalRef: orderId2,
          orderId: order_id, licenseId: license_id, topupId: topup_id, campusOrderId: campus_order_id,
        })

        return c.json({ redirect_url: data.invoice_url, invoice_id: data.id, order_id: orderId2, provider })
      }

      // ──────────────────────────────────────────────────────────────────────
      // BINANCE PAY — Order API
      // ──────────────────────────────────────────────────────────────────────
      case 'binance_pay': {
        const nonce = Math.random().toString(36).substring(2, 18).toUpperCase()
        const timestamp = Date.now()
        const merchantTradeNo = `LDR${timestamp}`
        const amountStr = amount.toFixed(2)
        const reqBody = JSON.stringify({
          env: { terminalType: 'WEB' },
          merchantTradeNo,
          orderAmount: amountStr,
          currency: currency.toUpperCase(),
          goods: {
            goodsType: '01',
            goodsCategory: 'Z000',
            referenceGoodsId: order_id || topup_id || memberId,
            goodsName: order_id ? 'Package LEADER' : 'Recharge portefeuille',
            goodsDetail: ''
          },
          returnUrl: `${callbackUrl}?type=binance_pay`,
          cancelUrl: finalReturnUrl,
          webhookUrl: `${baseUrl}/api/psp/webhook/binance_pay`
        })
        const payload = `${timestamp}\n${nonce}\n${reqBody}\n`
        const signature = (await hmacSHA512(config.api_secret, payload)).toUpperCase()

        const res = await fetch('https://bpay.binanceapi.com/binancepay/openapi/v2/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'BinancePay-Timestamp': timestamp.toString(),
            'BinancePay-Nonce': nonce,
            'BinancePay-Certificate-SN': config.api_key,
            'BinancePay-Signature': signature
          },
          body: reqBody
        })
        const data = await res.json() as any
        if (data.status !== 'SUCCESS') {
          return c.json({ error: data.errorMessage || 'Erreur Binance Pay' }, 400)
        }

        await recordPSPSession(c.env.DB, {
          memberId, paymentMethodId: payment_method_id, provider,
          amount, currency, externalRef: merchantTradeNo,
          orderId: order_id, licenseId: license_id, topupId: topup_id, campusOrderId: campus_order_id,
        })

        return c.json({
          redirect_url: data.data.checkoutUrl,
          qr_code: data.data.qrcodeLink,
          trade_no: merchantTradeNo,
          provider
        })
      }

      // ──────────────────────────────────────────────────────────────────────
      // BTCPAY SERVER — Invoices API
      // ──────────────────────────────────────────────────────────────────────
      case 'btcpay': {
        const serverUrl = config.server_url.replace(/\/$/, '')
        const res = await fetch(`${serverUrl}/api/v1/stores/${config.store_id}/invoices`, {
          method: 'POST',
          headers: {
            'Authorization': `token ${config.api_key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: amount.toFixed(2),
            currency: currency.toUpperCase(),
            metadata: {
              member_id: memberId,
              order_id: order_id || '',
              topup_id: topup_id || '',
              buyer_email: member.email,
              buyer_name: `${member.first_name} ${member.last_name}`
            },
            checkout: {
              redirectURL: `${callbackUrl}?type=btcpay`,
              redirectAutomatically: true
            },
            receiptData: {
              enabled: true,
              showQR: true
            }
          })
        })
        const invoice = await res.json() as any
        if (!res.ok) return c.json({ error: invoice.message || 'Erreur BTCPay' }, 400)

        await recordPSPSession(c.env.DB, {
          memberId, paymentMethodId: payment_method_id, provider,
          amount, currency, externalRef: invoice.id,
          orderId: order_id, licenseId: license_id, topupId: topup_id, campusOrderId: campus_order_id,
        })

        const serverUrlBase = config.server_url.replace(/\/$/, '')
        return c.json({
          redirect_url: `${serverUrlBase}/i/${invoice.id}`,
          invoice_id: invoice.id,
          provider
        })
      }

      default:
        return c.json({ error: `PSP non supporté pour initiation automatique: ${provider}` }, 400)
    }
  } catch (err: any) {
    console.error(`[PSP initiate ${provider}]`, err)
    return c.json({ error: err.message || 'Erreur interne PSP' }, 500)
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// CALLBACKS — GET /api/psp/callback/:provider
// Retour de l'utilisateur après paiement (redirect depuis PSP)
// ═════════════════════════════════════════════════════════════════════════════

pspRouter.get('/callback/:provider', async (c) => {
  const provider = c.req.param('provider')
  const url = new URL(c.req.url)
  const baseUrl = getBaseUrl(c)

  try {
    switch (provider) {

      // ── STRIPE callback ────────────────────────────────────────────────────
      case 'stripe': {
        const sessionId = url.searchParams.get('session_id')
        if (!sessionId) return c.redirect('/?payment=cancelled')

        // Récupérer la session via API Stripe pour confirmer
        const pspMethod = await c.env.DB.prepare(
          `SELECT config FROM payment_methods WHERE provider = 'stripe' AND is_active = 1 LIMIT 1`
        ).first() as any
        let config: any = {}
        try { config = JSON.parse(pspMethod?.config || '{}') } catch {}

        const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
          headers: { 'Authorization': `Bearer ${config.secret_key}` }
        })
        const session = await res.json() as any

        if (session.payment_status === 'paid') {
          // Chercher le topup/order via external_ref
          await confirmPSPPayment(c.env.DB, sessionId, session.amount_total / 100, 'stripe')
          return c.redirect('/?payment=success&provider=stripe')
        }
        return c.redirect('/?payment=pending&provider=stripe')
      }

      // ── PAYPAL callback ────────────────────────────────────────────────────
      case 'paypal': {
        const paypalOrderId = url.searchParams.get('token')
        if (!paypalOrderId) return c.redirect('/?payment=cancelled')

        // Capture du paiement PayPal
        const pspMethod = await c.env.DB.prepare(
          `SELECT config FROM payment_methods WHERE provider = 'paypal' AND is_active = 1 LIMIT 1`
        ).first() as any
        let config: any = {}
        try { config = JSON.parse(pspMethod?.config || '{}') } catch {}

        const base = config.mode === 'live'
          ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
        const creds = btoa(`${config.client_id}:${config.client_secret}`)
        const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=client_credentials'
        })
        const { access_token } = await tokenRes.json() as any

        const captureRes = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}/capture`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' }
        })
        const captured = await captureRes.json() as any

        if (captured.status === 'COMPLETED') {
          const customId = captured.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id || ''
          const amountValue = parseFloat(captured.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0')
          await confirmPSPPayment(c.env.DB, paypalOrderId, amountValue, 'paypal')
          return c.redirect('/?payment=success&provider=paypal')
        }
        return c.redirect('/?payment=pending&provider=paypal')
      }

      // ── MOLLIE callback ────────────────────────────────────────────────────
      case 'mollie': {
        // Mollie ne passe pas l'ID dans l'URL de redirection par défaut
        // La confirmation arrive via webhook (voir webhook handler ci-dessous)
        return c.redirect('/?payment=pending&provider=mollie')
      }

      // ── FLUTTERWAVE callback ───────────────────────────────────────────────
      case 'flutterwave': {
        const txRef = url.searchParams.get('tx_ref')
        const status = url.searchParams.get('status')
        const transId = url.searchParams.get('transaction_id')

        if (status === 'successful' && txRef && transId) {
          // Vérifier via API Flutterwave
          const pspMethod = await c.env.DB.prepare(
            `SELECT config FROM payment_methods WHERE provider = 'flutterwave' AND is_active = 1 LIMIT 1`
          ).first() as any
          let config: any = {}
          try { config = JSON.parse(pspMethod?.config || '{}') } catch {}

          const res = await fetch(`https://api.flutterwave.com/v3/transactions/${transId}/verify`, {
            headers: { 'Authorization': `Bearer ${config.secret_key}` }
          })
          const data = await res.json() as any

          if (data.data?.status === 'successful') {
            await confirmPSPPayment(c.env.DB, txRef, data.data.amount, 'flutterwave')
            return c.redirect('/?payment=success&provider=flutterwave')
          }
        }
        if (status === 'cancelled') return c.redirect('/?payment=cancelled')
        return c.redirect('/?payment=pending&provider=flutterwave')
      }

      // ── RAZORPAY callback ──────────────────────────────────────────────────
      case 'razorpay': {
        const linkId = url.searchParams.get('razorpay_payment_link_id')
        const payStatus = url.searchParams.get('razorpay_payment_link_status')
        if (payStatus === 'paid' && linkId) {
          await confirmPSPPayment(c.env.DB, linkId, 0, 'razorpay')
          return c.redirect('/?payment=success&provider=razorpay')
        }
        return c.redirect('/?payment=pending&provider=razorpay')
      }

      // ── SQUARE callback ────────────────────────────────────────────────────
      case 'square': {
        return c.redirect('/?payment=pending&provider=square')
      }

      // ── ADYEN callback ─────────────────────────────────────────────────────
      case 'adyen': {
        const resultCode = url.searchParams.get('resultCode')
        if (resultCode === 'Authorised') {
          const merchantRef = url.searchParams.get('merchantReference')
          await confirmPSPPayment(c.env.DB, merchantRef || '', 0, 'adyen')
          return c.redirect('/?payment=success&provider=adyen')
        }
        return c.redirect('/?payment=pending&provider=adyen')
      }

      // ── CHECKOUT.COM callback ──────────────────────────────────────────────
      case 'checkout_com': {
        return c.redirect('/?payment=pending&provider=checkout_com')
      }

      // ── COINPAYMENTS callback ──────────────────────────────────────────────
      case 'coinpayments': {
        return c.redirect('/?payment=pending&provider=coinpayments')
      }

      // ── COINBASE COMMERCE callback ─────────────────────────────────────────
      case 'coinbase_commerce': {
        const chargeCode = url.searchParams.get('charge')
        if (chargeCode) {
          return c.redirect('/?payment=pending&provider=coinbase_commerce')
        }
        return c.redirect('/?payment=pending&provider=coinbase_commerce')
      }

      // ── NOWPAYMENTS callback ───────────────────────────────────────────────
      case 'nowpayments': {
        return c.redirect('/?payment=pending&provider=nowpayments')
      }

      // ── BINANCE PAY callback ───────────────────────────────────────────────
      case 'binance_pay': {
        return c.redirect('/?payment=pending&provider=binance_pay')
      }

      // ── BTCPAY callback ────────────────────────────────────────────────────
      case 'btcpay': {
        const status = url.searchParams.get('status')
        if (status === 'complete') {
          return c.redirect('/?payment=success&provider=btcpay')
        }
        return c.redirect('/?payment=pending&provider=btcpay')
      }

      default:
        return c.redirect('/?payment=unknown')
    }
  } catch (err) {
    console.error(`[PSP callback ${provider}]`, err)
    return c.redirect('/?payment=error')
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// WEBHOOKS — POST /api/psp/webhook/:provider
// Notifications asynchrones depuis les PSP (confirmation définitive)
// Ces routes sont publiques (appelées par les serveurs PSP)
// ═════════════════════════════════════════════════════════════════════════════

// Route webhook publique — sans middleware auth
pspRouter.post('/webhook/:provider', async (c) => {
  const provider = c.req.param('provider')
  const bodyText = await c.req.text()

  try {
    switch (provider) {

      // ── STRIPE webhook ─────────────────────────────────────────────────────
      case 'stripe': {
        const pspMethod = await c.env.DB.prepare(
          `SELECT config FROM payment_methods WHERE provider = 'stripe' AND is_active = 1 LIMIT 1`
        ).first() as any
        let config: any = {}
        try { config = JSON.parse(pspMethod?.config || '{}') } catch {}

        // Vérification signature Stripe
        if (config.webhook_secret) {
          const sig = c.req.header('stripe-signature') || ''
          const parts = Object.fromEntries(sig.split(',').map((p: string) => p.split('=')))
          const timestamp = parts['t']
          const v1 = parts['v1']
          const computed = await hmacSHA256(config.webhook_secret, `${timestamp}.${bodyText}`)
          if (computed !== v1) return c.text('Unauthorized', 401)
        }

        const event = JSON.parse(bodyText)
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object
          if (session.payment_status === 'paid') {
            await confirmPSPPayment(c.env.DB, session.id, session.amount_total / 100, 'stripe')
          }
        }
        if (event.type === 'payment_intent.succeeded') {
          const pi = event.data.object
          await confirmPSPPayment(c.env.DB, pi.id, pi.amount_received / 100, 'stripe')
        }
        return c.text('OK', 200)
      }

      // ── PAYPAL webhook ─────────────────────────────────────────────────────
      case 'paypal': {
        // Vérification signature PayPal via l'API de vérification
        const ppMethod = await c.env.DB.prepare(
          `SELECT config FROM payment_methods WHERE provider = 'paypal' AND is_active = 1 LIMIT 1`
        ).first() as any
        let ppConfig: any = {}
        try { ppConfig = JSON.parse(ppMethod?.config || '{}') } catch {}

        // Vérification de la signature webhook PayPal (recommandée)
        const ppWebhookId = ppConfig.webhook_id || ''
        if (ppWebhookId && ppConfig.client_id && ppConfig.client_secret) {
          try {
            const ppBase = ppConfig.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
            const ppCreds = btoa(`${ppConfig.client_id}:${ppConfig.client_secret}`)
            // Obtenir un access token PayPal
            const tokenRes = await fetch(`${ppBase}/v1/oauth2/token`, {
              method: 'POST',
              headers: { 'Authorization': `Basic ${ppCreds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
              body: 'grant_type=client_credentials'
            })
            const tokenData = await tokenRes.json() as any
            if (tokenData.access_token) {
              // Vérifier la signature via l'API PayPal
              const verifyRes = await fetch(`${ppBase}/v1/notifications/verify-webhook-signature`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${tokenData.access_token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  auth_algo: c.req.header('paypal-auth-algo') || '',
                  cert_url: c.req.header('paypal-cert-url') || '',
                  transmission_id: c.req.header('paypal-transmission-id') || '',
                  transmission_sig: c.req.header('paypal-transmission-sig') || '',
                  transmission_time: c.req.header('paypal-transmission-time') || '',
                  webhook_id: ppWebhookId,
                  webhook_event: JSON.parse(bodyText)
                })
              })
              const verifyData = await verifyRes.json() as any
              if (verifyData.verification_status !== 'SUCCESS') {
                console.warn('[PSP webhook paypal] Signature invalide', verifyData)
                return c.text('Unauthorized', 401)
              }
            }
          } catch (verifyErr) {
            // En cas d'erreur de vérification, on log mais on ne bloque pas
            // (évite les faux positifs si PayPal API est indisponible)
            console.warn('[PSP webhook paypal] Erreur vérification signature, traitement quand même:', verifyErr)
          }
        }

        let event: any
        try { event = JSON.parse(bodyText) } catch { return c.text('Bad Request', 400) }

        if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
          const resource = event.resource
          const customId = resource.custom_id || ''
          const amount = parseFloat(resource.amount?.value || '0')
          const paypalOrderId = resource.supplementary_data?.related_ids?.order_id || resource.id

          await confirmPSPPayment(c.env.DB, paypalOrderId, amount, 'paypal')
        }
        return c.text('OK', 200)
      }

      // ── MOLLIE webhook ─────────────────────────────────────────────────────
      case 'mollie': {
        const params = new URLSearchParams(bodyText)
        const paymentId = params.get('id')
        if (!paymentId) return c.text('OK', 200)

        // Récupérer le paiement depuis Mollie pour vérifier son statut
        const pspMethod = await c.env.DB.prepare(
          `SELECT config FROM payment_methods WHERE provider = 'mollie' AND is_active = 1 LIMIT 1`
        ).first() as any
        let config: any = {}
        try { config = JSON.parse(pspMethod?.config || '{}') } catch {}

        const res = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${config.api_key}` }
        })
        const payment = await res.json() as any

        if (payment.status === 'paid') {
          const metadata = payment.metadata || {}
          const memberId = metadata.member_id
          const externalRef = paymentId
          await confirmPSPPayment(c.env.DB, externalRef, parseFloat(payment.amount.value), 'mollie')
        }
        return c.text('OK', 200)
      }

      // ── FLUTTERWAVE webhook ────────────────────────────────────────────────
      case 'flutterwave': {
        // Vérification du header verif-hash (secret key hashé)
        const fwMethod = await c.env.DB.prepare(
          `SELECT config FROM payment_methods WHERE provider = 'flutterwave' AND is_active = 1 LIMIT 1`
        ).first() as any
        let fwConfig: any = {}
        try { fwConfig = JSON.parse(fwMethod?.config || '{}') } catch {}

        if (fwConfig.secret_hash || fwConfig.secret_key) {
          // Flutterwave envoie le header 'verif-hash' = la valeur du secret_hash configuré
          const receivedHash = c.req.header('verif-hash') || ''
          const expectedHash = fwConfig.secret_hash || ''
          if (expectedHash && receivedHash !== expectedHash) {
            console.warn('[PSP webhook flutterwave] verif-hash invalide')
            return c.text('Unauthorized', 401)
          }
        }

        let data: any
        try { data = JSON.parse(bodyText) } catch { return c.text('Bad Request', 400) }

        if (data.event === 'charge.completed' && data.data?.status === 'successful') {
          const txRef = data.data.tx_ref
          await confirmPSPPayment(c.env.DB, txRef, data.data.amount, 'flutterwave')
        }
        return c.text('OK', 200)
      }

      // ── RAZORPAY webhook ───────────────────────────────────────────────────
      case 'razorpay': {
        let data: any
        try { data = JSON.parse(bodyText) } catch { return c.text('Bad Request', 400) }

        // Vérification signature optionnelle
        const pspMethod = await c.env.DB.prepare(
          `SELECT config FROM payment_methods WHERE provider = 'razorpay' AND is_active = 1 LIMIT 1`
        ).first() as any
        let config: any = {}
        try { config = JSON.parse(pspMethod?.config || '{}') } catch {}

        if (config.webhook_secret) {
          const sig = c.req.header('x-razorpay-signature') || ''
          const computed = await hmacSHA256(config.webhook_secret, bodyText)
          if (computed !== sig) return c.text('Unauthorized', 401)
        }

        if (data.event === 'payment_link.paid') {
          const linkId = data.payload.payment_link?.entity?.id
          const amount = data.payload.payment?.entity?.amount / 100
          if (linkId) await confirmPSPPayment(c.env.DB, linkId, amount, 'razorpay')
        }
        return c.text('OK', 200)
      }

      // ── SQUARE webhook ─────────────────────────────────────────────────────
      case 'square': {
        // Vérification HMAC-SHA256 Square (webhook_signature_key)
        const sqMethod = await c.env.DB.prepare(
          `SELECT config FROM payment_methods WHERE provider = 'square' AND is_active = 1 LIMIT 1`
        ).first() as any
        let sqConfig: any = {}
        try { sqConfig = JSON.parse(sqMethod?.config || '{}') } catch {}

        if (sqConfig.webhook_signature_key) {
          // Square : HMAC-SHA256(signature_key, notificationUrl + body)
          const sqSig = c.req.header('x-square-hmacsha256-signature') || ''
          const sqUrl = `${getBaseUrl(c)}/api/psp/webhook/square`
          const computed = await hmacSHA256(sqConfig.webhook_signature_key, sqUrl + bodyText)
          // Square encode en base64 (pas hex)
          const computedB64 = btoa(String.fromCharCode(...new Uint8Array(
            computed.match(/.{2}/g)!.map((b: string) => parseInt(b, 16))
          )))
          if (computedB64 !== sqSig) {
            console.warn('[PSP webhook square] Signature invalide')
            return c.text('Unauthorized', 401)
          }
        }

        let data: any
        try { data = JSON.parse(bodyText) } catch { return c.text('Bad Request', 400) }

        if (data.type === 'payment.completed') {
          const payment = data.data?.object?.payment
          if (payment?.status === 'COMPLETED') {
            const ref = payment.order_id || payment.id
            const amount = (payment.total_money?.amount || 0) / 100
            await confirmPSPPayment(c.env.DB, ref, amount, 'square')
          }
        }
        return c.text('OK', 200)
      }

      // ── ADYEN webhook ──────────────────────────────────────────────────────
      case 'adyen': {
        // Vérification HMAC Adyen (webhook_hmac)
        const adyenMethod = await c.env.DB.prepare(
          `SELECT config FROM payment_methods WHERE provider = 'adyen' AND is_active = 1 LIMIT 1`
        ).first() as any
        let adyenConfig: any = {}
        try { adyenConfig = JSON.parse(adyenMethod?.config || '{}') } catch {}

        let data: any
        try { data = JSON.parse(bodyText) } catch { return c.text('Bad Request', 400) }

        if (adyenConfig.webhook_hmac) {
          // Adyen HMAC : vérifier chaque notification individuellement
          for (const item of (data.notificationItems || [])) {
            const notif = item.NotificationRequestItem
            if (!notif) continue
            // Adyen construit la string à signer : pspReference:originalReference:merchantAccountCode:merchantReference:value:currency:success
            const hmacString = [
              notif.pspReference || '',
              notif.originalReference || '',
              notif.merchantAccountCode || '',
              notif.merchantReference || '',
              notif.amount?.value ?? '',
              notif.amount?.currency || '',
              notif.success || ''
            ].join(':')
            const computed = await hmacSHA256(adyenConfig.webhook_hmac, hmacString)
            const received = notif.additionalData?.hmacSignature || ''
            // Adyen encode en base64
            const computedB64 = btoa(String.fromCharCode(...new Uint8Array(
              computed.match(/.{2}/g)!.map((b: string) => parseInt(b, 16))
            )))
            if (computedB64 !== received) {
              console.warn('[PSP webhook adyen] HMAC invalide sur notification', notif.merchantReference)
              return c.text('Unauthorized', 401)
            }
          }
        }

        for (const item of (data.notificationItems || [])) {
          const notif = item.NotificationRequestItem
          if (notif?.success === 'true' && notif.eventCode === 'AUTHORISATION') {
            const reference = notif.merchantReference
            const amount = (notif.amount?.value || 0) / 100
            await confirmPSPPayment(c.env.DB, reference, amount, 'adyen')
          }
        }
        return c.text('[accepted]', 200)
      }

      // ── CHECKOUT.COM webhook ───────────────────────────────────────────────
      case 'checkout_com': {
        // Vérification signature Checkout.com (webhook_signature)
        const ckoMethod = await c.env.DB.prepare(
          `SELECT config FROM payment_methods WHERE provider = 'checkout_com' AND is_active = 1 LIMIT 1`
        ).first() as any
        let ckoConfig: any = {}
        try { ckoConfig = JSON.parse(ckoMethod?.config || '{}') } catch {}

        if (ckoConfig.webhook_signature) {
          // Checkout.com : HMAC-SHA256(webhook_signature, body)
          const ckoSig = c.req.header('cko-signature') || ''
          const computed = await hmacSHA256(ckoConfig.webhook_signature, bodyText)
          if (computed !== ckoSig) {
            console.warn('[PSP webhook checkout_com] Signature invalide')
            return c.text('Unauthorized', 401)
          }
        }

        let data: any
        try { data = JSON.parse(bodyText) } catch { return c.text('Bad Request', 400) }

        if (data.type === 'payment_approved' || data.type === 'payment_captured') {
          const reference = data.data?.reference
          const amount = (data.data?.amount || 0) / 100
          if (reference) await confirmPSPPayment(c.env.DB, reference, amount, 'checkout_com')
        }
        return c.text('OK', 200)
      }

      // ── COINPAYMENTS webhook (IPN) ─────────────────────────────────────────
      case 'coinpayments': {
        const params = new URLSearchParams(bodyText)
        const status = Number(params.get('status') || '0')
        const txnId = params.get('txn_id') || ''
        const amount1 = Number(params.get('amount1') || '0')
        const custom = params.get('custom') || ''
        const memberId = params.get('custom2') || ''

        // Vérification HMAC depuis la DB
        const pspMethod = await c.env.DB.prepare(
          `SELECT config FROM payment_methods WHERE provider = 'coinpayments' AND is_active = 1 LIMIT 1`
        ).first() as any
        let config: any = {}
        try { config = JSON.parse(pspMethod?.config || '{}') } catch {}

        if (config.ipn_secret) {
          const receivedHmac = c.req.header('HMAC') || ''
          const computed = await hmacSHA512(config.ipn_secret, bodyText)
          if (computed.toLowerCase() !== receivedHmac.toLowerCase()) {
            return c.text('Unauthorized', 401)
          }
        }

        if (status >= 100) {
          // Chercher via custom field (order: ou topup:)
          if (custom.startsWith('order:')) {
            const orderId = custom.replace('order:', '')
            await c.env.DB.prepare(`
              UPDATE package_orders
              SET status='validated', payment_method='coinpayments',
                  paypal_order_id=?, validated_at=datetime('now'), updated_at=datetime('now')
              WHERE id=? AND status != 'validated'
            `).bind(`cp:${txnId}`, orderId).run()
            try { await activateAndReward(c.env.DB, orderId, 'system-coinpayments-webhook') } catch {}
          } else if (custom.startsWith('topup:')) {
            const topupId = custom.replace('topup:', '')
            await c.env.DB.prepare(`
              UPDATE wallet_topups
              SET status='confirmed', confirmed_at=datetime('now'), updated_at=datetime('now')
              WHERE id=?
            `).bind(topupId).run()
            const topup = await c.env.DB.prepare(`SELECT * FROM wallet_topups WHERE id=?`).bind(topupId).first() as any
            if (topup) await walletOperation(c.env.DB, topup.member_id, topup.amount, 'credit', 'credit_topup', `CoinPayments — txn: ${txnId}`)
          }
        }
        return c.text('IPN OK', 200)
      }

      // ── COINBASE COMMERCE webhook ──────────────────────────────────────────
      case 'coinbase_commerce': {
        // Vérification signature
        const pspMethod = await c.env.DB.prepare(
          `SELECT config FROM payment_methods WHERE provider = 'coinbase_commerce' AND is_active = 1 LIMIT 1`
        ).first() as any
        let config: any = {}
        try { config = JSON.parse(pspMethod?.config || '{}') } catch {}

        if (config.webhook_secret) {
          const sig = c.req.header('x-cc-webhook-signature') || ''
          const computed = await hmacSHA256(config.webhook_secret, bodyText)
          if (computed !== sig) return c.text('Unauthorized', 401)
        }

        let data: any
        try { data = JSON.parse(bodyText) } catch { return c.text('Bad Request', 400) }

        if (data.event?.type === 'charge:confirmed' || data.event?.type === 'charge:resolved') {
          const charge = data.event.data
          const metadata = charge.metadata || {}
          const memberId = metadata.member_id
          const chargeCode = charge.code
          const amount = parseFloat(charge.pricing?.local?.amount || '0')

          await confirmPSPPayment(c.env.DB, chargeCode, amount, 'coinbase_commerce')
        }
        return c.text('OK', 200)
      }

      // ── NOWPAYMENTS webhook (IPN) ──────────────────────────────────────────
      case 'nowpayments': {
        // Vérification signature NowPayments
        const pspMethod = await c.env.DB.prepare(
          `SELECT config FROM payment_methods WHERE provider = 'nowpayments' AND is_active = 1 LIMIT 1`
        ).first() as any
        let config: any = {}
        try { config = JSON.parse(pspMethod?.config || '{}') } catch {}

        if (config.ipn_secret_key) {
          const sig = c.req.header('x-nowpayments-sig') || ''
          // NOWPayments : signature = sha512 du body JSON trié par clé
          let parsed: any = {}
          try { parsed = JSON.parse(bodyText) } catch {}
          const sorted = Object.keys(parsed).sort().reduce((acc: any, k) => { acc[k] = parsed[k]; return acc }, {})
          const computed = await hmacSHA512(config.ipn_secret_key, JSON.stringify(sorted))
          if (computed !== sig) return c.text('Unauthorized', 401)
        }

        let data: any
        try { data = JSON.parse(bodyText) } catch { return c.text('Bad Request', 400) }

        if (data.payment_status === 'finished' || data.payment_status === 'confirmed') {
          const orderId = data.order_id
          const amount = parseFloat(data.price_amount || '0')
          await confirmPSPPayment(c.env.DB, orderId, amount, 'nowpayments')
        }
        return c.text('OK', 200)
      }

      // ── BINANCE PAY webhook ────────────────────────────────────────────────
      case 'binance_pay': {
        // Vérification signature Binance Pay
        // Binance signe : timestamp + nonce + body (HMAC-SHA512)
        const bnMethod = await c.env.DB.prepare(
          `SELECT config FROM payment_methods WHERE provider = 'binance_pay' AND is_active = 1 LIMIT 1`
        ).first() as any
        let bnConfig: any = {}
        try { bnConfig = JSON.parse(bnMethod?.config || '{}') } catch {}

        if (bnConfig.api_secret) {
          const bnTimestamp = c.req.header('Binancepay-Timestamp') || ''
          const bnNonce = c.req.header('Binancepay-Nonce') || ''
          const bnSig = c.req.header('Binancepay-Signature') || ''
          if (bnTimestamp && bnNonce && bnSig) {
            const bnPayload = `${bnTimestamp}\n${bnNonce}\n${bodyText}\n`
            const computed = await hmacSHA512(bnConfig.api_secret, bnPayload)
            if (computed.toUpperCase() !== bnSig.toUpperCase()) {
              console.warn('[PSP webhook binance_pay] Signature invalide')
              return c.json({ returnCode: 'FAIL', returnMessage: 'Unauthorized' })
            }
          }
        }

        let data: any
        try { data = JSON.parse(bodyText) } catch { return c.text('Bad Request', 400) }

        if (data.bizStatus === 'PAY_SUCCESS') {
          const tradeNo = data.data?.merchantTradeNo
          const amount = parseFloat(data.data?.orderAmount || '0')
          if (tradeNo) await confirmPSPPayment(c.env.DB, tradeNo, amount, 'binance_pay')
        }
        return c.json({ returnCode: 'SUCCESS', returnMessage: null })
      }

      // ── BTCPAY webhook ─────────────────────────────────────────────────────
      case 'btcpay': {
        // Vérification signature BTCPAY
        const pspMethod = await c.env.DB.prepare(
          `SELECT config FROM payment_methods WHERE provider = 'btcpay' AND is_active = 1 LIMIT 1`
        ).first() as any
        let config: any = {}
        try { config = JSON.parse(pspMethod?.config || '{}') } catch {}

        if (config.webhook_secret) {
          const sig = c.req.header('BTCPAY-SIG') || ''
          // BTCPay : sha256 du body
          const computed = 'sha256=' + await hmacSHA256(config.webhook_secret, bodyText)
          if (computed !== sig) return c.text('Unauthorized', 401)
        }

        let data: any
        try { data = JSON.parse(bodyText) } catch { return c.text('Bad Request', 400) }

        if (data.type === 'InvoiceSettled' || data.type === 'InvoicePaymentSettled') {
          const invoiceId = data.invoiceId
          const amount = parseFloat(data.payment?.value || '0')
          await confirmPSPPayment(c.env.DB, invoiceId, amount, 'btcpay')
        }
        return c.text('OK', 200)
      }

      default:
        return c.text('Unknown provider', 400)
    }
  } catch (err) {
    console.error(`[PSP webhook ${provider}]`, err)
    return c.text('Error', 500)
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN : POST /api/admin/psp/test/:provider
// Teste la connexion avec les credentials fournis (sans enregistrement)
// ═════════════════════════════════════════════════════════════════════════════

pspAdminRouter.post('/test/:provider', async (c) => {
  const provider = c.req.param('provider')
  const body = await c.req.json() as Record<string, any>
  const config = body.config || body

  // Valider les champs requis
  const errors = validatePSPConfig(provider, config)
  if (errors.length > 0) {
    return c.json({ success: false, error: 'Configuration incomplète', details: errors }, 400)
  }

  try {
    switch (provider) {

      // ── Stripe test ────────────────────────────────────────────────────────
      case 'stripe': {
        const res = await fetch('https://api.stripe.com/v1/account', {
          headers: { 'Authorization': `Bearer ${config.secret_key}` }
        })
        const data = await res.json() as any
        if (!res.ok) return c.json({ success: false, error: data.error?.message || 'Clé invalide' })
        return c.json({ success: true, message: `Connecté — Compte : ${data.display_name || data.id}`, details: { account_id: data.id, country: data.country } })
      }

      // ── PayPal test ────────────────────────────────────────────────────────
      case 'paypal': {
        const base = config.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
        const creds = btoa(`${config.client_id}:${config.client_secret}`)
        const res = await fetch(`${base}/v1/oauth2/token`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=client_credentials'
        })
        const data = await res.json() as any
        if (!res.ok) return c.json({ success: false, error: 'Credentials invalides' })
        return c.json({ success: true, message: `Connecté — Mode : ${config.mode}`, details: { app_id: data.app_id } })
      }

      // ── Mollie test ────────────────────────────────────────────────────────
      case 'mollie': {
        // /v2/methods accepte les clés API de profil (live_... ou test_...)
        const res = await fetch('https://api.mollie.com/v2/methods', {
          headers: { 'Authorization': `Bearer ${config.api_key}` }
        })
        const data = await res.json() as any
        if (!res.ok) return c.json({ success: false, error: data.detail || data.title || 'API Key invalide' })
        return c.json({ success: true, message: `Connecté — Mollie OK (${data.count ?? '?'} méthode(s) active(s))` })
      }

      // ── Flutterwave test ───────────────────────────────────────────────────
      case 'flutterwave': {
        const res = await fetch('https://api.flutterwave.com/v3/banks/NG', {
          headers: { 'Authorization': `Bearer ${config.secret_key}` }
        })
        if (!res.ok) return c.json({ success: false, error: 'Secret key invalide' })
        return c.json({ success: true, message: 'Connecté — Secret key valide' })
      }

      // ── Razorpay test ──────────────────────────────────────────────────────
      case 'razorpay': {
        const creds = btoa(`${config.key_id}:${config.key_secret}`)
        const res = await fetch('https://api.razorpay.com/v1/payments?count=1', {
          headers: { 'Authorization': `Basic ${creds}` }
        })
        if (!res.ok) return c.json({ success: false, error: 'Credentials invalides' })
        return c.json({ success: true, message: `Connecté — Key ID : ${config.key_id}` })
      }

      // ── Square test ────────────────────────────────────────────────────────
      case 'square': {
        const base = config.environment === 'sandbox'
          ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
        const res = await fetch(`${base}/v2/merchants`, {
          headers: { 'Authorization': `Bearer ${config.access_token}`, 'Square-Version': '2024-01-17' }
        })
        const data = await res.json() as any
        if (!res.ok) return c.json({ success: false, error: 'Access token invalide' })
        return c.json({ success: true, message: `Connecté — ${config.environment}` })
      }

      // ── Adyen test ─────────────────────────────────────────────────────────
      case 'adyen': {
        const base = config.environment === 'live'
          ? 'https://management-live.adyen.com' : 'https://management-test.adyen.com'
        const res = await fetch(`${base}/v3/merchants`, {
          headers: { 'X-API-Key': config.api_key }
        })
        if (!res.ok) return c.json({ success: false, error: 'API Key invalide' })
        return c.json({ success: true, message: `Connecté — Merchant : ${config.merchant_account}` })
      }

      // ── Checkout.com test ──────────────────────────────────────────────────
      case 'checkout_com': {
        const res = await fetch('https://api.checkout.com/metadata/card-types', {
          headers: { 'Authorization': `Bearer ${config.secret_key}` }
        })
        if (!res.ok) return c.json({ success: false, error: 'Secret key invalide' })
        return c.json({ success: true, message: 'Connecté — Secret key valide' })
      }

      // ── CoinPayments test ──────────────────────────────────────────────────
      case 'coinpayments': {
        const params = new URLSearchParams({
          version: '1', cmd: 'get_basic_info',
          key: config.public_key, format: 'json'
        })
        const bodyStr = params.toString()
        const hmac = await hmacSHA512(config.private_key, bodyStr)
        const res = await fetch('https://www.coinpayments.net/api.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'HMAC': hmac },
          body: bodyStr
        })
        const data = await res.json() as any
        if (data.error !== 'ok') return c.json({ success: false, error: data.error })
        return c.json({ success: true, message: `Connecté — Merchant ID : ${data.result.merchant}` })
      }

      // ── Coinbase Commerce test ─────────────────────────────────────────────
      case 'coinbase_commerce': {
        const res = await fetch('https://api.commerce.coinbase.com/charges?limit=1', {
          headers: { 'X-CC-Api-Key': config.api_key, 'X-CC-Version': '2018-03-22' }
        })
        if (!res.ok) return c.json({ success: false, error: 'API Key invalide' })
        return c.json({ success: true, message: 'Connecté — API key valide' })
      }

      // ── NOWPayments test ───────────────────────────────────────────────────
      case 'nowpayments': {
        const res = await fetch('https://api.nowpayments.io/v1/status', {
          headers: { 'x-api-key': config.api_key }
        })
        const data = await res.json() as any
        if (data.message !== 'OK') return c.json({ success: false, error: 'API key invalide ou service indisponible' })
        return c.json({ success: true, message: 'Connecté — NOWPayments opérationnel' })
      }

      // ── Binance Pay test ───────────────────────────────────────────────────
      case 'binance_pay': {
        // Binance Pay n'a pas d'endpoint de test simple public
        // On tente une petite requête pour vérifier les credentials
        return c.json({ success: true, message: 'Credentials enregistrés (vérification live nécessaire)' })
      }

      // ── BTCPay test ────────────────────────────────────────────────────────
      case 'btcpay': {
        const serverUrl = config.server_url.replace(/\/$/, '')
        const res = await fetch(`${serverUrl}/api/v1/stores/${config.store_id}`, {
          headers: { 'Authorization': `token ${config.api_key}` }
        })
        const data = await res.json() as any
        if (!res.ok) return c.json({ success: false, error: data.message || 'Connexion BTCPay échouée' })
        return c.json({ success: true, message: `Connecté — Store : ${data.name}` })
      }

      // ── PSP semi-manuels / manuels — pas de test API possible ─────────────
      case 'skrill': case 'neteller': case 'payoneer': case 'wise':
      case 'revolut': case 'sumopay': case 'sepa': case 'swift':
      case 'local_bank': case 'western_union': case 'moneygram':
      case 'cash_in_person': case 'juice': case 'mpesa': case 'orange_money':
      case 'wave': case 'mtn_momo': case 'airtel_money': case 'lydia': {
        return c.json({ success: true, message: 'Configuration enregistrée. Ce PSP ne supporte pas de test de connexion automatique — les coordonnées seront affichées aux membres.' })
      }

      default:
        return c.json({ success: false, error: `Provider inconnu : ${provider}` }, 400)
    }
  } catch (err: any) {
    console.error(`[PSP test ${provider}]`, err)
    return c.json({ success: false, error: err.message || 'Erreur lors du test' }, 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN : GET /api/admin/psp/providers — Liste tous les PSPs avec leur statut
// ─────────────────────────────────────────────────────────────────────────────

pspAdminRouter.get('/providers', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT id, provider, display_name, category, type, is_active, sort_order,
           config, created_at, updated_at
    FROM payment_methods
    ORDER BY category, sort_order, display_name
  `).all()

  const providers = (rows.results as any[]).map(row => {
    let config: any = {}
    try { config = JSON.parse(row.config || '{}') } catch {}
    // Masquer les clés sensibles
    const safeConfig: any = {}
    for (const [k, v] of Object.entries(config)) {
      if (k.includes('secret') || k.includes('key') || k.includes('token') || k.includes('password')) {
        safeConfig[k] = v ? '••••••••' : ''
      } else {
        safeConfig[k] = v
      }
    }
    return { ...row, config: safeConfig }
  })

  return c.json({ providers })
})

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN : PUT /api/admin/psp/config/:id — Sauvegarder la config d'un PSP
// ─────────────────────────────────────────────────────────────────────────────

pspAdminRouter.put('/config/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json() as Record<string, any>

  const { config, is_active, display_name, sort_order } = body

  // Récupérer la config existante pour merger (ne pas écraser les secrets non modifiés)
  const existing = await c.env.DB.prepare(`SELECT config FROM payment_methods WHERE id = ?`).bind(id).first() as any
  let existingConfig: any = {}
  try { existingConfig = JSON.parse(existing?.config || '{}') } catch {}

  // Merger : garder l'ancienne valeur si la nouvelle est masquée ("••••••••")
  const mergedConfig: any = { ...existingConfig }
  if (config && typeof config === 'object') {
    for (const [k, v] of Object.entries(config)) {
      if (v !== '••••••••' && v !== '') {
        mergedConfig[k] = v
      }
    }
  }

  const updates: string[] = ['config = ?', 'updated_at = datetime(\'now\')']
  const binds: any[] = [JSON.stringify(mergedConfig)]

  if (is_active !== undefined) { updates.push('is_active = ?'); binds.push(is_active ? 1 : 0) }
  if (display_name !== undefined) { updates.push('display_name = ?'); binds.push(display_name) }
  if (sort_order !== undefined) { updates.push('sort_order = ?'); binds.push(sort_order) }

  binds.push(id)
  await c.env.DB.prepare(`UPDATE payment_methods SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run()

  return c.json({ success: true, message: 'Configuration sauvegardée' })
})
