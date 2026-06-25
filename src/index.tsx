// ============================================================
// LEADER — Application principale
// ============================================================
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { auth, verifyJWT } from './routes/auth.js'
import { members } from './routes/members.js'
import { admin } from './routes/admin.js'
import { support, adminSupport } from './routes/support.js'
import { aiAgent } from './routes/ai-agent.js'
import rolesRouter from './routes/admin-roles.js'
import kycRouter from './routes/kyc.js'
import kycAdminRouter from './routes/kyc-admin.js'
import { paymentRouter, paymentAdminRouter } from './routes/payment.js'
import { pspRouter, pspAdminRouter } from './routes/psp.js'
import { emailAdmin } from './routes/email-admin.js'
import brokerRouter, { brokerAdmin as brokerAdminRouter } from './routes/broker.js'
import { landingPublic, landingAdmin, buildLandingPage } from './routes/landing.js'
import { i18nPublic, i18nAdmin } from './routes/i18n-admin.js'
import { campus } from './routes/campus.js'
import type { Bindings } from './types/index.js'
import { processDailyPayments, getMauritiusDateStr, processBVQueue, processRankQueue, activateAndReward, createNotification, orchestrateur, processSubscriptionCBRetries, sendSubscriptionReminderEmails } from './lib/mlm.js'
import { sendEmail } from './lib/mailer.js'

const app = new Hono<{ Bindings: Bindings }>()

// CORS
app.use('/api/*', cors({ origin: '*', allowMethods: ['GET','POST','PUT','DELETE','OPTIONS'] }))

// ── Rate limiting global — 120 req/minute par IP ─────────────────
// Optimisation perf : le kv.put (incrément) est non-bloquant via waitUntil
// → La requête n'attend plus l'écriture KV avant de continuer
// → Seul le kv.get (lecture) bloque, pour vérifier la limite
app.use('/api/*', async (c, next) => {
  try {
    const kv = (c.env as any)?.FILES_KV as KVNamespace | undefined
    if (kv) {
      const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
      const rlKey = `rl:${ip}`
      const raw = await kv.get(rlKey)
      const count = raw ? parseInt(raw) : 0
      if (count >= 120) {
        return c.json({ error: 'Trop de requêtes. Réessayez dans une minute.' }, 429)
      }
      // Incrément non-bloquant : ne pas attendre la réponse KV
      // waitUntil permet au Worker de terminer l'écriture après la réponse HTTP
      const execCtx = (c as any).executionCtx
      const putPromise = kv.put(rlKey, String(count + 1), { expirationTtl: 60 })
      if (execCtx?.waitUntil) {
        execCtx.waitUntil(putPromise)
      } else {
        putPromise.catch(() => {}) // fire-and-forget si pas de contexte
      }
    }
  } catch (_) {
    // Ne jamais bloquer la requête si le rate limiting échoue
  }
  return next()
})

// ── Cache mémoire Worker pour l'orchestrateur ──────────────────────
// Évite 2 requêtes D1 à chaque requête API.
// Les valeurs sont mises en cache dans la mémoire du Worker (durée de vie ~= instance Worker).
// TTL explicite de 5 minutes pour forcer un re-check D1 périodique.
const ORCH_CACHE_TTL = 300_000 // 5 minutes
let _orchCache: {
  lastDaily: string       // date format 'YYYY-MM-DD'
  lastOrch: Date          // date du dernier run orchestrateur
  ts: number              // timestamp du dernier chargement depuis D1
} | null = null

// ── Auto-trigger : paiements journaliers + orchestrateur BV/Rangs ──
//
// PAIEMENTS JOURNALIERS — une seule fois par jour (heure Maurice UTC+4)
// ORCHESTRATEUR (BV queue + rank queue) — toutes les 5 minutes max
//   → déclenché en arrière-plan (waitUntil ou fire-and-forget)
//   → verrou via system_config pour éviter les exécutions concurrentes
//   → ne bloque JAMAIS la réponse HTTP
//
// OPTIMISATION PERF :
//   → Cache mémoire Worker : évite 2 requêtes D1 sur chaque requête
//   → Déclenchement probabiliste 5% : 95% des requêtes court-circuitent
//     immédiatement sans aucune opération DB
app.use('/api/*', async (c, next) => {
  await next()

  // ── Déclenchement probabiliste : seulement ~5% des requêtes vérifient ──
  // Les 95% restantes sont ignorées → zéro overhead sur la majorité du trafic
  // La granularité est suffisante : avec 100 req/s, l'orchestrateur est
  // vérifié ~5 fois par seconde, bien au-delà de la précision nécessaire.
  if (Math.random() > 0.05) return

  // Exclure les routes auth (login/register) du déclenchement automatique
  const path = c.req.path
  if (path.includes('/auth/login') || path.includes('/auth/register')) return

  try {
    const db = (c.env as any)?.DB
    if (!db) return

    const execContext = (c as any).executionCtx
    const now = new Date()
    const todayMauritius = getMauritiusDateStr()

    // ── Lire le cache mémoire ou recharger depuis D1 ────────────
    // Le cache est partagé entre toutes les requêtes de la même instance Worker.
    // Une seule requête D1 par 5 minutes maximum, au lieu de 2 par chaque requête.
    const cacheExpired = !_orchCache || (Date.now() - _orchCache.ts) > ORCH_CACHE_TTL

    if (cacheExpired) {
      // Charger les 2 valeurs en parallèle (1 batch D1 = ~1 aller-retour)
      const [dailyCfg, orchCfg] = await Promise.all([
        db.prepare(`SELECT value FROM system_config WHERE key = 'last_daily_payment'`).first() as Promise<any>,
        db.prepare(`SELECT value FROM system_config WHERE key = 'last_orchestrator_run'`).first() as Promise<any>,
      ])
      _orchCache = {
        lastDaily: dailyCfg?.value || '1970-01-01',
        lastOrch:  orchCfg?.value ? new Date(orchCfg.value) : new Date(0),
        ts: Date.now(),
      }
    }

    // ── 1. Paiements journaliers (1x/jour, heure Maurice) ────────
    if (_orchCache!.lastDaily < todayMauritius) {
      // Mettre à jour le cache immédiatement pour éviter les appels concurrents
      _orchCache!.lastDaily = todayMauritius
      _orchCache!.ts = Date.now()

      // Persister en DB de façon non-bloquante
      const writeDaily = db.prepare(
        `INSERT OR REPLACE INTO system_config (key, value, updated_at)
         VALUES ('last_daily_payment', ?, datetime('now'))`
      ).bind(todayMauritius).run()

      if (execContext?.waitUntil) {
        execContext.waitUntil(writeDaily.then(() => processDailyPayments(db)))
      } else {
        writeDaily.then(() => processDailyPayments(db)).catch(() => {})
      }
    }

    // ── 2. Orchestrateur BV + Rangs (max toutes les 5 minutes) ──
    const minutesSinceLast = (now.getTime() - _orchCache!.lastOrch.getTime()) / 60000

    if (minutesSinceLast >= 5) {
      // Mettre à jour le cache immédiatement pour éviter les appels concurrents
      _orchCache!.lastOrch = now
      _orchCache!.ts = Date.now()

      // Persister en DB + exécuter l'orchestrateur de façon non-bloquante
      const writeOrch = db.prepare(
        `INSERT OR REPLACE INTO system_config (key, value, updated_at)
         VALUES ('last_orchestrator_run', datetime('now'), datetime('now'))`
      ).run()

      const runOrchestrator = async () => {
        await writeOrch
        try {
          await processBVQueue(db)
          await processRankQueue(db)
        } catch (err) {
          console.error('[AUTO-ORCH] Erreur orchestrateur automatique:', err)
        }
      }

      if (execContext?.waitUntil) {
        execContext.waitUntil(runOrchestrator())
      } else {
        runOrchestrator().catch(() => {})
      }
    }
  } catch {
    // Ne jamais bloquer une requête pour un problème d'orchestration
  }
})

// Static files
app.use('/static/*', serveStatic({ root: './' }))

// Routes API
app.route('/api/auth', auth)
app.route('/api/members', members)
// IMPORTANT : rolesRouter doit être monté AVANT admin.
// admin.use('/*') intercepterait sinon /roles et /admin-users avant que
// rolesRouter puisse les traiter (premier router qui matche gagne dans Hono).
app.route('/api/admin', rolesRouter)
app.route('/api/admin', admin)
app.route('/api/support', support)
app.route('/api/admin/support', adminSupport)
app.route('/api/admin/ai-agent', aiAgent)
app.route('/api/kyc', kycRouter)
app.route('/api/admin/kyc', kycAdminRouter)
app.route('/api/payment', paymentRouter)
app.route('/api/admin/payment', paymentAdminRouter)
// PSP routes — Initiation / Callback / Webhook par provider
// Les webhooks (POST /api/psp/webhook/:provider) doivent être hors rate limiting
// car ils sont appelés par les serveurs PSP directement
app.route('/api/psp', pspRouter)
app.route('/api/admin/psp', pspAdminRouter)
app.route('/api/admin/emails', emailAdmin)
app.route('/api/broker', brokerRouter)
app.route('/api/admin/broker', brokerAdminRouter)

// ── Campus routes ──────────────────────────────────────────────
// Middleware auth pour les routes membres campus (JWT — pas de sessions DB)
app.use('/api/campus/*', async (c, next) => {
  const token = c.req.header('Authorization')?.split(' ')[1] || ''

  if (c.req.path.startsWith('/api/campus/admin')) {
    // Routes admin — vérifier JWT admin
    if (!token) return c.json({ error: 'Admin non authentifié' }, 401)
    const payload = await verifyJWT(token, c.env.JWT_SECRET).catch(() => null)
    if (!payload || payload.role !== 'admin') return c.json({ error: 'Session admin invalide' }, 401)
    c.set('adminId' as any, payload.sub)
  } else {
    // Routes membres — JWT optionnel (pour la progression)
    if (token) {
      const payload = await verifyJWT(token, c.env.JWT_SECRET).catch(() => null)
      if (payload && payload.role === 'member') {
        c.set('memberId' as any, payload.sub)
      }
    }
  }
  return next()
})
app.route('/api/campus', campus)

// ── Landing page routes ────────────────────────────────────────
app.route('/', landingPublic)
app.route('/api/admin', landingAdmin)
app.route('/api/i18n', i18nPublic)
app.route('/api/admin/i18n', i18nAdmin)

// ── Route cron externe (cron-job.org) ─────────────────────────
// Répond immédiatement 200 puis exécute l'orchestrateur en arrière-plan
// via waitUntil — évite le timeout de 30s de cron-job.org
app.post('/api/cron/orchestrateur', async (c) => {
  const secret = (c.env as any).CRON_SECRET as string | undefined
  if (secret) {
    const authHeader = c.req.header('Authorization') || ''
    const tokenParam = c.req.query('token') || ''
    const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : tokenParam
    if (provided !== secret) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
  }
  // Répondre immédiatement pour éviter le timeout cron-job.org (30s)
  // L'orchestrateur tourne en arrière-plan via waitUntil
  const execCtx = (c as any).executionCtx
  const db = c.env.DB
  const task = orchestrateur(db).catch((err: any) => {
    console.error('[CRON] Erreur orchestrateur (background):', err)
  })
  if (execCtx?.waitUntil) {
    execCtx.waitUntil(task)
  }
  return c.json({ ok: true, message: 'Orchestrateur démarré en arrière-plan', ts: new Date().toISOString() })
})

// ── Route cron status — état de configuration ──────────────
// GET /api/cron/status — retourne si CRON_SECRET est configuré et le prochain cycle
app.get('/api/cron/status', async (c) => {
  const adminToken = c.req.header('Authorization')?.replace('Bearer ', '') || ''
  if (!adminToken) return c.json({ error: 'Non autorisé' }, 401)
  try {
    const payload = await verifyJWT(adminToken, (c.env as any).JWT_SECRET || 'leader-secret-2024') as any
    if (!payload || payload.role !== 'admin') return c.json({ error: 'Non autorisé' }, 401)
  } catch { return c.json({ error: 'Token invalide' }, 401) }

  const hasCronSecret = !!((c.env as any).CRON_SECRET)
  const now = new Date()
  const nextFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const msUntil = nextFirst.getTime() - now.getTime()
  const daysUntil = Math.ceil(msUntil / 86_400_000)

  const lastRun = await c.env.DB.prepare(
    `SELECT value FROM system_config WHERE key = 'cron_last_run'`
  ).first() as any

  return c.json({
    cron_secret_configured: hasCronSecret,
    cron_url: 'POST /api/cron/orchestrateur',
    recommended_schedule: '0 2 * * *',
    next_subscription_billing: nextFirst.toISOString().substring(0, 10),
    days_until_billing: daysUntil,
    last_cron_run: lastRun?.value || null,
    warning: !hasCronSecret ? 'CRON_SECRET non configuré — la route cron est accessible sans authentification !' : null,
  })
})

// ── Route publique pour servir les fichiers uploadés ──────────
// Accessible sans auth — utilisée par les liens admin et membres
// Le fichier est stocké dans KV (FILES_KV) avec fallback D1 (data_b64)
app.get('/api/files/:id', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare(
    `SELECT * FROM uploaded_files WHERE id = ?`
  ).bind(id).first() as any
  if (!row) return c.json({ error: 'Fichier introuvable' }, 404)

  // 1. Tenter lecture depuis KV (optionnel — absent en gsk-hosted)
  const buf = c.env.FILES_KV ? await c.env.FILES_KV.get(`file:${id}`, 'arrayBuffer') : null
  if (buf) {
    return new Response(buf, {
      headers: {
        'Content-Type': row.mime_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${row.filename}"`,
        'Cache-Control': 'public, max-age=86400'
      }
    })
  }

  // 2. Fallback : ancien stockage base64 en D1
  if (row.data_b64) {
    const binary = atob(row.data_b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Response(bytes.buffer, {
      headers: {
        'Content-Type': row.mime_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${row.filename}"`,
        'Cache-Control': 'public, max-age=86400'
      }
    })
  }

  return c.json({ error: 'Contenu du fichier introuvable' }, 404)
})

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', app: 'LEADER', version: '1.0.0' }))

// ── COINPAYMENTS IPN WEBHOOK ──────────────────────────────────────────────────
// CoinPayments envoie un POST IPN après chaque changement de statut de transaction.
// Hors rate limiting — CoinPayments doit pouvoir appeler cette route librement.
//
// Vérification HMAC-SHA512 : le body POST est signé avec l'IPN Secret.
// Statuts traités :
//   status >= 100 → paiement complet → activer la commande/licence
//   status = -1   → annulé
//   status = -2   → remboursé
//
// CoinPayments IPN fields :
//   ipn_type     : 'api' pour les transactions API
//   txn_id       : ID de la transaction
//   status       : code numérique (-1=cancelled, 0=waiting, ..., 100=complete)
//   currency1    : USD (devise de référence)
//   currency2    : crypto réelle (USDT.TRC20, BTC, etc.)
//   amount1      : montant en USD
//   amount2      : montant en crypto
//   custom       : custom1 — "order:{id}" ou "license:{id}"
//   custom2      : member_id
app.post('/api/webhooks/coinpayments', async (c) => {
  const db = c.env.DB

  // Lire le body brut (nécessaire pour vérification HMAC)
  const bodyText = await c.req.text()

  // Récupérer l'IPN Secret depuis la DB ou les secrets Cloudflare
  const ipnSecretRow = await db.prepare(
    `SELECT value FROM payment_gateway_config WHERE gateway = 'coinpayments_api' AND key = 'ipn_secret'`
  ).first() as any
  const ipnSecret = ipnSecretRow?.value || (c.env as any).CP_IPN_SECRET || ''

  // Vérification de signature HMAC-SHA512
  if (ipnSecret) {
    try {
      const receivedHmac = c.req.header('HMAC') || ''
      if (!receivedHmac) {
        console.error('CoinPayments IPN: header HMAC manquant')
        return c.text('Unauthorized', 401)
      }

      const keyData  = new TextEncoder().encode(ipnSecret)
      const msgData  = new TextEncoder().encode(bodyText)
      const cryptoKey = await crypto.subtle.importKey(
        'raw', keyData,
        { name: 'HMAC', hash: 'SHA-512' },
        false, ['sign']
      )
      const sigBuf  = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
      const computed = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

      if (computed.toLowerCase() !== receivedHmac.toLowerCase()) {
        console.error('CoinPayments IPN: signature invalide')
        return c.text('Unauthorized', 401)
      }
    } catch (e) {
      console.error('CoinPayments IPN: erreur vérification signature', e)
      return c.text('Signature error', 400)
    }
  }

  // Parser le body URL-encoded
  const params = new URLSearchParams(bodyText)
  const ipnType  = params.get('ipn_type')     || ''
  const txnId    = params.get('txn_id')        || ''
  const status   = Number(params.get('status') || '0')
  const amount1  = Number(params.get('amount1') || '0') // montant USD
  const custom   = params.get('custom')        || '' // "order:{id}" ou "license:{id}"
  const custom2  = params.get('custom2')       || '' // member_id
  const currency2 = params.get('currency2')   || ''

  // CoinPayments exige une réponse rapide (sinon il réessaie)
  // On effectue toutes les opérations de façon asynchrone

  const cpRef = `cp:${txnId}`
  const execCtx = (c as any).executionCtx

  // Fonction d'activation principale
  const processIPN = async () => {
    try {
      // ── Paiement complet (status >= 100) ──────────────────────────────
      if (status >= 100) {

        if (custom.startsWith('order:')) {
          const orderId = custom.replace('order:', '')
          const ord = await db.prepare(`SELECT * FROM package_orders WHERE id = ?`).bind(orderId).first() as any
          if (ord && ord.status !== 'validated' && !ord.activation_done) {
            await db.prepare(
              `UPDATE package_orders
               SET status='validated', payment_method='crypto',
                   paypal_order_id=?, proof_url=?,
                   validated_at=datetime('now'), updated_at=datetime('now')
               WHERE id=?`
            ).bind(cpRef, cpRef, orderId).run()

            await activateAndReward(db, orderId, 'system-coinpayments-ipn')

            if (custom2) {
              await createNotification(
                db, custom2, 'success',
                'Paiement crypto confirmé',
                `Votre paiement crypto (${currency2}) de $${amount1.toFixed(2)} a été reçu. Commande activée automatiquement.`
              )
            }
            console.log(`CoinPayments IPN: commande ${orderId} activée (txn: ${txnId})`)
          }
        }

        if (custom.startsWith('license:')) {
          const licId    = custom.replace('license:', '')
          const memberId = custom2
          if (!memberId) return

          let lic = await db.prepare(`SELECT * FROM finstrategia_licenses WHERE id = ?`).bind(licId).first() as any

          if (!lic) {
            await db.prepare(
              `INSERT OR IGNORE INTO finstrategia_licenses
                 (id, member_id, price_usd, status, payment_method, paypal_order_id, validated_at)
               VALUES (?, ?, ?, 'active', 'crypto', ?, datetime('now'))`
            ).bind(licId, memberId, amount1, cpRef).run()
          } else if (lic.status !== 'active') {
            await db.prepare(
              `UPDATE finstrategia_licenses
               SET status='active', payment_method='crypto',
                   paypal_order_id=?, validated_at=datetime('now'), updated_at=datetime('now')
               WHERE id=?`
            ).bind(cpRef, licId).run()
          }

          const expires = new Date()
          expires.setFullYear(expires.getFullYear() + 1)
          await db.prepare(
            `UPDATE members SET license_active=1, license_expires_at=?, updated_at=datetime('now') WHERE id=?`
          ).bind(expires.toISOString(), memberId).run()

          await createNotification(
            db, memberId, 'success',
            'Licence activée par paiement crypto',
            `Votre paiement crypto (${currency2}) de $${amount1.toFixed(2)} a été reçu. Licence active pour 1 an.`
          )
          console.log(`CoinPayments IPN: licence ${licId} activée (txn: ${txnId})`)
        }
      }

      // ── Annulé ou remboursé (status < 0) ──────────────────────────────
      if (status < 0 && custom.startsWith('order:')) {
        const orderId = custom.replace('order:', '')
        const ord = await db.prepare(`SELECT * FROM package_orders WHERE id = ?`).bind(orderId).first() as any
        if (ord && ord.status === 'pending') {
          await db.prepare(
            `UPDATE package_orders SET status='cancelled', updated_at=datetime('now') WHERE id=?`
          ).bind(orderId).run()
          console.log(`CoinPayments IPN: commande ${orderId} annulée (status: ${status}, txn: ${txnId})`)
        }
      }

    } catch (err) {
      console.error('[CoinPayments IPN] Erreur traitement:', err)
    }
  }

  if (execCtx?.waitUntil) {
    execCtx.waitUntil(processIPN())
  } else {
    processIPN().catch(() => {})
  }

  // CoinPayments exige une réponse HTTP 200 "IPN OK" exactement
  return c.text('IPN OK', 200)
})

// ── Webhook PayPal — hors rate limiting (appelé par les serveurs PayPal) ──────
// Événements traités :
//   PAYMENT.CAPTURE.COMPLETED  → sécurité : s'assurer que la commande est bien activée
//   PAYMENT.CAPTURE.REFUNDED   → remboursement → désactiver la commande
//   CUSTOMER.DISPUTE.CREATED   → litige → notifier l'admin
app.post('/api/webhooks/paypal', async (c) => {
  const clientId     = c.env.PAYPAL_CLIENT_ID
  const clientSecret = c.env.PAYPAL_CLIENT_SECRET
  const mode         = c.env.PAYPAL_MODE || 'sandbox'

  // Lire le body brut pour vérification de signature
  const bodyText = await c.req.text()
  let event: any
  try { event = JSON.parse(bodyText) } catch { return c.text('Bad Request', 400) }

  const eventType = event.event_type || ''
  const resource  = event.resource   || {}

  // ── Vérification de signature PayPal ────────────────────────────────────────
  // PayPal envoie des headers de signature pour authentifier le webhook
  const webhookId      = c.env.PAYPAL_WEBHOOK_ID || ''   // optionnel mais recommandé
  const transmissionId = c.req.header('paypal-transmission-id')     || ''
  const timestamp      = c.req.header('paypal-transmission-time')   || ''
  const certUrl        = c.req.header('paypal-cert-url')            || ''
  const authAlgo       = c.req.header('paypal-auth-algo')           || ''
  const signature      = c.req.header('paypal-transmission-sig')    || ''

  // Si PAYPAL_WEBHOOK_ID est configuré → vérifier la signature via l'API PayPal
  if (webhookId && transmissionId && signature) {
    try {
      const base = mode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com'
      const creds = btoa(`${clientId}:${clientSecret}`)
      const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      })
      const { access_token } = await tokenRes.json() as { access_token: string }

      const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_algo:          authAlgo,
          cert_url:           certUrl,
          transmission_id:    transmissionId,
          transmission_sig:   signature,
          transmission_time:  timestamp,
          webhook_id:         webhookId,
          webhook_event:      event,
        }),
      })
      const { verification_status } = await verifyRes.json() as { verification_status: string }
      if (verification_status !== 'SUCCESS') {
        console.error('PayPal webhook signature invalide')
        return c.text('Unauthorized', 401)
      }
    } catch (err) {
      console.error('PayPal webhook verify error:', err)
      // En cas d'erreur de vérification → on continue (pour ne pas bloquer)
    }
  }

  const db = c.env.DB

  // ── PAYMENT.CAPTURE.COMPLETED ────────────────────────────────────────────────
  // Filet de sécurité : si la capture frontend a échoué, on active quand même
  if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
    const captureId    = resource.id || ''
    const customId     = resource.custom_id || ''
    const capturedAmt  = parseFloat(resource.amount?.value || '0')

    if (customId.startsWith('order:')) {
      const orderId = customId.replace('order:', '')
      const ord = await db.prepare(`SELECT * FROM package_orders WHERE id = ?`).bind(orderId).first() as any
      // Activer seulement si pas encore validé
      if (ord && ord.status !== 'validated') {
        await db.prepare(
          `UPDATE package_orders SET status='validated', payment_method='paypal',
           paypal_order_id=?, proof_url=?, validated_at=datetime('now'), updated_at=datetime('now')
           WHERE id=?`
        ).bind(resource.supplementary_data?.related_ids?.order_id || captureId, `paypal:webhook:${captureId}`, orderId).run()
        console.log(`Webhook PayPal : commande ${orderId} activée via webhook COMPLETED`)
      }
    }

    if (customId.startsWith('license:')) {
      const licId = customId.replace('license:', '')
      const lic = await db.prepare(`SELECT * FROM finstrategia_licenses WHERE id = ?`).bind(licId).first() as any
      if (lic && lic.status !== 'active') {
        const expires = new Date()
        expires.setFullYear(expires.getFullYear() + 1)
        await db.prepare(
          `UPDATE finstrategia_licenses SET status='active', payment_method='paypal',
           paypal_order_id=?, validated_at=datetime('now'), updated_at=datetime('now')
           WHERE id=?`
        ).bind(captureId, licId).run()
        await db.prepare(
          `UPDATE members SET license_active=1, license_expires_at=?, updated_at=datetime('now') WHERE id=?`
        ).bind(expires.toISOString(), lic.member_id).run()
        console.log(`Webhook PayPal : licence ${licId} activée via webhook COMPLETED`)
      }
    }
  }

  // ── PAYMENT.CAPTURE.REFUNDED ─────────────────────────────────────────────────
  // Remboursement → passer la commande en 'refunded' + notifier l'admin via KV flag
  if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
    const captureId = resource.id || ''
    // Chercher la commande par paypal_order_id (approximatif via capture parent)
    const ord = await db.prepare(
      `SELECT * FROM package_orders WHERE proof_url LIKE ? OR paypal_order_id = ?`
    ).bind(`%${captureId}%`, captureId).first() as any
    if (ord) {
      await db.prepare(
        `UPDATE package_orders SET status='refunded', updated_at=datetime('now') WHERE id=?`
      ).bind(ord.id).run()
      // Flag dans KV pour alerter l'admin au prochain login
      try {
        await c.env.FILES_KV.put(`alert:refund:${ord.id}`, JSON.stringify({
          order_id: ord.id, member_id: ord.member_id, amount: resource.amount?.value,
          capture_id: captureId, created_at: new Date().toISOString()
        }), { expirationTtl: 604800 }) // 7 jours
      } catch (_) {}
      console.log(`Webhook PayPal : commande ${ord.id} remboursée`)
    }
  }

  // ── CUSTOMER.DISPUTE.CREATED ─────────────────────────────────────────────────
  // Litige → stocker dans KV pour alerte admin
  if (eventType === 'CUSTOMER.DISPUTE.CREATED') {
    const disputeId = resource.dispute_id || resource.id || ''
    const amount    = resource.dispute_amount?.value || '?'
    try {
      await c.env.FILES_KV.put(`alert:dispute:${disputeId}`, JSON.stringify({
        dispute_id: disputeId, amount, reason: resource.reason || 'unknown',
        created_at: new Date().toISOString()
      }), { expirationTtl: 604800 })
    } catch (_) {}
    console.log(`Webhook PayPal : litige ${disputeId} créé — montant $${amount}`)
  }

  // Toujours répondre 200 à PayPal (sinon il réessaie indéfiniment)
  return c.text('OK', 200)
})

// ── STRIPE WEBHOOK ────────────────────────────────────────────────────────────
// Stripe envoie les événements POST ici après chaque paiement.
// Hors rate limiting — Stripe doit pouvoir appeler cette route librement.
// Événements gérés :
//   payment_intent.succeeded    → paiement confirmé → activer commande/licence
//   payment_intent.payment_failed → échec → laisser le membre réessayer
//   charge.dispute.created       → litige → notifier l'admin
app.post('/api/webhooks/stripe', async (c) => {
  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET ||
    (await c.env.DB.prepare(`SELECT value FROM payment_gateway_config WHERE gateway='stripe_api' AND key='webhook_secret'`).first() as any)?.value || ''

  const body      = await c.req.text()
  const signature = c.req.header('stripe-signature') || ''

  // Vérification de signature Stripe (HMAC-SHA256)
  if (webhookSecret && signature) {
    try {
      const sigParts   = Object.fromEntries(signature.split(',').map((p: string) => p.split('=')))
      const timestamp  = sigParts['t']
      const v1         = sigParts['v1']
      const payload    = `${timestamp}.${body}`
      const key        = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      )
      const sigBuffer  = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
      const computed   = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
      if (computed !== v1) {
        console.error('Stripe webhook: signature invalide')
        return c.text('Invalid signature', 400)
      }
    } catch (e) {
      console.error('Stripe webhook: erreur vérification signature', e)
      return c.text('Signature error', 400)
    }
  }

  let event: any
  try { event = JSON.parse(body) } catch { return c.text('Bad JSON', 400) }

  const db = c.env.DB

  // ── payment_intent.succeeded → activer la commande/licence ────────────────
  if (event.type === 'payment_intent.succeeded') {
    const pi       = event.data.object
    const meta     = pi.metadata || {}
    const memberId = meta.member_id
    const orderId  = meta.order_id
    const licId    = meta.license_id
    const amount   = (pi.amount_received || pi.amount || 0) / 100
    const stripeRef = `stripe:${pi.id}`

    if (memberId && orderId) {
      const ord = await db.prepare(
        `SELECT * FROM package_orders WHERE id = ? AND member_id = ?`
      ).bind(orderId, memberId).first() as any
      if (ord && !ord.activation_done) {
        await db.prepare(
          `UPDATE package_orders
           SET status='validated', payment_method='stripe', paypal_order_id=?,
               proof_url=?, validated_at=datetime('now'), updated_at=datetime('now')
           WHERE id=?`
        ).bind(stripeRef, stripeRef, orderId).run()
        try {
          await activateAndReward(db, orderId, 'system-stripe-webhook')
        } catch (e) { console.error('Stripe webhook activateAndReward error:', e) }
      }
    }

    if (memberId && licId) {
      const lic = await db.prepare(
        `SELECT * FROM finstrategia_licenses WHERE id = ? AND member_id = ?`
      ).bind(licId, memberId).first() as any
      if (!lic || lic.status !== 'active') {
        if (!lic) {
          await db.prepare(
            `INSERT OR IGNORE INTO finstrategia_licenses
               (id, member_id, price_usd, status, payment_method, paypal_order_id, validated_at)
             VALUES (?, ?, ?, 'active', 'stripe', ?, datetime('now'))`
          ).bind(licId, memberId, amount, stripeRef).run()
        } else {
          await db.prepare(
            `UPDATE finstrategia_licenses SET status='active', payment_method='stripe',
             paypal_order_id=?, validated_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
          ).bind(stripeRef, licId).run()
        }
        const expires = new Date()
        expires.setFullYear(expires.getFullYear() + 1)
        await db.prepare(
          `UPDATE members SET license_active=1, license_expires_at=?, updated_at=datetime('now') WHERE id=?`
        ).bind(expires.toISOString(), memberId).run()
      }
    }
  }

  // ── charge.dispute.created → litige ───────────────────────────────────────
  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object
    console.warn(`Stripe litige créé: charge ${dispute.charge}, montant ${dispute.amount / 100}`)
    // TODO: notifier l'admin par email
  }

  return c.text('OK', 200)
})

// ── ROUTE PUBLIQUE CARTE DE MEMBRE — /v/:token ────────────────────────────────
// Page anti-fraude : vérification statut de la carte en temps réel
// Aucune auth requise — accessible par scan QR code
app.get('/v/:token', async (c) => {
  const token = c.req.param('token')
  if (!token || token.length < 8) return c.html(cardVerifyHTML('invalid', null, null, null, ''))

  // Construire l'URL de base depuis la requête (pour le lien d'inscription)
  const reqUrl = new URL(c.req.url)
  const siteOrigin = `${reqUrl.protocol}//${reqUrl.host}`

  // Récupérer aussi branding (logo)
  const [row, brandingRows] = await Promise.all([
    c.env.DB.prepare(
      `SELECT mc.id, mc.design, mc.status, mc.issued_at, mc.revoked_at,
              m.first_name, m.last_name, m.unique_id, m.license_active,
              m.license_expires_at, m.current_rank, m.city, m.member_status,
              m.profile_photo, m.phone, m.email,
              m.whatsapp_number, m.messenger_id
       FROM member_cards mc
       JOIN members m ON m.id = mc.member_id
       WHERE mc.token = ?`
    ).bind(token).first(),
    c.env.DB.prepare(
      `SELECT key, value FROM branding_config WHERE key IN ('logo_data_uri','network_name')`
    ).all()
  ])

  const brandingMap: Record<string, string> = {}
  for (const r of (brandingRows.results || []) as { key: string; value: string }[]) brandingMap[r.key] = r.value
  const branding = { logoUri: brandingMap['logo_data_uri'] || '', networkName: brandingMap['network_name'] || 'LEADER' }

  const r = row as any
  if (!r) return c.html(cardVerifyHTML('not_found', null, null, branding, siteOrigin))
  if (r.status === 'revoked') return c.html(cardVerifyHTML('revoked', r, token, branding, siteOrigin))
  const licenceOk = r.license_active === 1
  if (!licenceOk) return c.html(cardVerifyHTML('expired', r, token, branding, siteOrigin))
  return c.html(cardVerifyHTML('valid', r, token, branding, siteOrigin))
})

function cardVerifyHTML(
  result: 'valid'|'invalid'|'not_found'|'revoked'|'expired',
  row: any,
  token: string|null,
  branding: { logoUri: string; networkName: string } | null,
  siteOrigin: string
): string {
  const isValid   = result === 'valid'
  const net       = branding?.networkName || 'LEADER'
  const logoUri   = branding?.logoUri || ''

  const statusColors: Record<string, string> = {
    valid: '#10B981', expired: '#E05040', revoked: '#EF4444', not_found: '#6B7280', invalid: '#6B7280',
  }
  const statusLabels: Record<string, string> = {
    valid: 'CARTE VALIDE', expired: 'LICENCE EXPIREE', revoked: 'CARTE RÉVOQUÉE',
    not_found: 'CARTE INTROUVABLE', invalid: 'CODE INVALIDE',
  }
  const statusMessages: Record<string, string> = {
    valid:     'Cette carte de membre est authentique et en cours de validité.',
    expired:   "La licence de ce membre a expiré. Cette carte n'est plus valide.",
    revoked:   "Cette carte a été révoquée. Si vous avez un doute, contactez l'assistance.",
    not_found: "Aucune carte ne correspond à ce code. Il peut s'agir d'un faux.",
    invalid:   'Code QR invalide ou corrompu.',
  }
  const color = statusColors[result] || '#6B7280'
  const label = statusLabels[result] || 'INCONNU'
  const msg   = statusMessages[result] || ''

  // Lien d'inscription M3 (visible uniquement si carte valide)
  const registerUrl = (isValid && row?.unique_id)
    ? `${siteOrigin}/register/${row.unique_id}`
    : ''

  // Photo membre
  const photoHtml = (isValid && row?.profile_photo)
    ? `<div style="display:flex;justify-content:center;margin:0 0 16px;"><img src="${row.profile_photo}" alt="Photo" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid #e5e7eb;box-shadow:0 2px 12px rgba(0,0,0,.1);"></div>`
    : ''

  // Contacts
  const contactsHtml = isValid && row ? (() => {
    const items: string[] = []
    if (row.phone) items.push(
      `<a href="tel:${row.phone}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f8f8f8;border-radius:10px;text-decoration:none;color:#222;font-size:14px;">
        <i class="fas fa-phone" style="font-size:14px;color:#6b7280;"></i><span>${row.phone}</span></a>`
    )
    // WhatsApp : utiliser whatsapp_number dédié si disponible, sinon phone
    const waNumber = (row.whatsapp_number || row.phone || '').replace(/[^0-9]/g,'')
    if (waNumber) items.push(
      `<a href="https://wa.me/${waNumber}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#dcfce7;border-radius:10px;text-decoration:none;color:#166534;font-size:14px;">
        <i class="fab fa-whatsapp" style="font-size:14px;color:#6b7280;"></i><span>WhatsApp</span></a>`
    )
    if (row.email) items.push(
      `<a href="mailto:${row.email}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f8f8f8;border-radius:10px;text-decoration:none;color:#222;font-size:14px;">
        <i class="fas fa-envelope" style="font-size:14px;color:#6b7280;"></i><span>${row.email}</span></a>`
    )
    // Messenger : utiliser messenger_id dédié si disponible
    const messengerId = row.messenger_id || ''
    if (messengerId) items.push(
      `<a href="https://m.me/${encodeURIComponent(messengerId)}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#eff6ff;border-radius:10px;text-decoration:none;color:#1d4ed8;font-size:14px;">
        <i class="fab fa-facebook-messenger" style="font-size:14px;color:#6b7280;"></i><span>Messenger</span></a>`
    )
    if (!items.length) return ''
    return `<div style="margin:16px 0;text-align:left;"><p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;">Contact</p><div style="display:flex;flex-direction:column;gap:8px;">${items.join('')}</div></div>`
  })() : ''

  // Lien d'inscription avec copie
  const registerHtml = (isValid && registerUrl) ? `
    <div style="margin:16px 0;">
      <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;text-align:left;">Rejoindre le réseau</p>
      <div style="display:flex;gap:8px;align-items:center;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:10px 12px;">
        <i class="fas fa-link" style="font-size:14px;color:#6b7280;"></i>
        <span id="reg-url" style="flex:1;font-size:12px;color:#92400e;word-break:break-all;font-family:monospace;">${registerUrl}</span>
        <button onclick="_copyRegUrl()" style="background:#f59e0b;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">Copier</button>
      </div>
      <p style="font-size:11px;color:#6b7280;margin-top:6px;text-align:left;">Ce lien vous inscrit directement sous ce membre.</p>
    </div>` : ''

  // Logo réseau
  const logoHtml = logoUri
    ? `<img src="${logoUri}" alt="${net}" style="max-height:48px;max-width:160px;object-fit:contain;margin-bottom:12px;">`
    : `<div style="font-size:22px;font-weight:900;letter-spacing:1px;color:#111;margin-bottom:12px;">${net}</div>`

  // Bloc titulaire
  const memberBlock = row ? `
    <div style="background:#f9fafb;border-radius:12px;padding:16px;margin:16px 0;text-align:left;">
      <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px;">Titulaire</p>
      <p style="margin:0 0 2px;font-size:20px;font-weight:700;color:#111;">${row.first_name || ''} ${row.last_name || ''}</p>
      <p style="margin:0 0 2px;font-size:13px;color:#6b7280;font-family:monospace;">${row.unique_id || ''}</p>
      ${row.city ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${row.city}</p>` : ''}
      ${row.current_rank && row.current_rank !== 'none' ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${row.current_rank}</p>` : ''}
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${net} — Vérification Carte</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:linear-gradient(135deg,#f5f7fa 0%,#e8ecf0 100%);min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding:16px;}
    .card{background:#fff;border-radius:24px;padding:28px 22px;max-width:440px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,.12);text-align:center;margin-top:16px;}
    .badge{display:inline-flex;align-items:center;gap:6px;background:${color};color:#fff;border-radius:50px;padding:8px 20px;font-size:14px;font-weight:700;letter-spacing:.3px;margin-bottom:10px;}
    .msg{font-size:14px;color:#6b7280;line-height:1.5;margin-bottom:4px;}
    .sep{height:1px;background:#f3f4f6;margin:16px 0;}
    .footer{font-size:11px;color:#d1d5db;margin-top:20px;padding-top:16px;border-top:1px solid #f3f4f6;}
  </style>
</head>
<body>
  <div class="card">
    <!-- Logo réseau -->
    ${logoHtml}

    <!-- Photo membre -->
    ${photoHtml}

    <!-- Statut -->
    <div class="badge">${isValid ? '' : ''} ${label.replace('','').replace('','').replace('EXPIREE ','')}</div>
    <p class="msg">${msg}</p>

    <!-- Bloc titulaire -->
    ${memberBlock}

    <!-- Contacts -->
    ${contactsHtml}

    <!-- Lien d'inscription -->
    ${registerHtml}

    <div class="footer">
      <strong>${net}</strong> · Vérification en temps réel<br>
      ${new Date().toLocaleString('fr-FR')}
    </div>
  </div>

  <script>
  function _copyRegUrl() {
    const url = document.getElementById('reg-url')?.textContent?.trim();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      const btn = event.target;
      btn.textContent = 'Copié !';
      btn.style.background = '#10b981';
      setTimeout(() => { btn.textContent = 'Copier'; btn.style.background = '#f59e0b'; }, 2000);
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      event.target.textContent = 'Copié !';
      setTimeout(() => { event.target.textContent = 'Copier'; }, 2000);
    });
  }
  </script>
</body>
</html>`
}

// Helper — lire le branding depuis DB (logo + network_name)
async function loadBrandingPublic(db: D1Database): Promise<{ logoUri: string; networkName: string }> {
  try {
    const rows = await db.prepare(
      `SELECT key, value FROM branding_config WHERE key IN ('logo_data_uri','network_name')`
    ).all()
    const map: Record<string, string> = {}
    for (const r of (rows.results || []) as { key: string; value: string }[]) map[r.key] = r.value
    return { logoUri: map['logo_data_uri'] || '', networkName: map['network_name'] || 'LEADER' }
  } catch { return { logoUri: '', networkName: 'LEADER' } }
}

// ============================================================
// GET /campus/acheter/:courseId
// Page d'achat campus dédiée — zéro wizard JS, zéro template literal imbriqué
// Remplace complètement _wizardOpenForCourse pour les formations payantes
// Safari-safe : HTML plat, JS autonome dans campus-buy.js
// ============================================================
app.get('/campus/acheter/:courseId', async (c) => {
  const courseId = c.req.param('courseId')
  const branding = await loadBrandingPublic(c.env.DB)
  const networkName = branding.networkName || 'LEADER'
  const logoUri = branding.logoUri || ''

  const html = campusBuyHTML(courseId, networkName, logoUri)
  return c.html(html)
})

// Toutes les routes → SPA
app.get('*', async (c) => {
  const path = new URL(c.req.url).pathname
  const branding = await loadBrandingPublic(c.env.DB)

  // ── Landing page → route racine ──────────────────────────────
  // Affichée uniquement sur /  (pas /login, /register, /admin, etc.)
  if (path === '/') {
    try {
      const landingHtml = await buildLandingPage(c.env.DB)
      return c.html(landingHtml)
    } catch (e) {
      // Fallback : si la landing plante, rediriger vers le backoffice membre
      console.error('[LANDING ERROR]', e)
    }
  }

  // ── /login → backoffice membre (page de connexion) ───────────
  if (path === '/login') {
    return c.html(memberHTML({}, branding))
  }

  if (path.startsWith('/admin')) {
    return c.html(adminHTML(branding))
  }
  // Route dédiée impersonation — charge UNIQUEMENT le backoffice membre
  // sans l'app admin, pour éviter que le token admin en localStorage prenne le dessus
  if (path === '/member-view') {
    return c.html(memberOnlyHTML())
  }
  // M3 — /register/:uniqueId  → page d'inscription autonome
  if (path.startsWith('/register/')) {
    const sponsorUid = path.replace('/register/', '').trim().toUpperCase()
    return c.html(registerHTML({ mode: 'M3', sponsorUid }))
  }
  // M2 — /register?sponsor=LDRxxxxxx&position=L  → page d'inscription autonome
  // M1 — /register  → page d'inscription libre
  if (path === '/register') {
    const url = new URL(c.req.url)
    const sponsor  = url.searchParams.get('sponsor')
    const parent   = url.searchParams.get('parent')
    const position = url.searchParams.get('position')
    if (sponsor && position) {
      return c.html(registerHTML({ mode: 'M2', sponsor, parent: parent || undefined, position: position.toUpperCase() }))
    }
    return c.html(registerHTML({ mode: 'M1' }))
  }
  return c.html(memberHTML({}, branding))
})

// ============================================================
// HTML — Page d'inscription autonome (M1 / M2 / M3)
// Complètement séparée du backoffice — aucun token requis
// ============================================================
interface RegisterHTMLOpts {
  mode: 'M1' | 'M2' | 'M3'
  sponsorUid?: string  // M3 : unique_id dans l'URL
  sponsor?: string     // M2 : unique_id du RECRUTEUR
  parent?: string      // M2 : unique_id du NŒUD DE PLACEMENT (peut différer du recruteur)
  position?: string    // M2 : L ou R
}

function registerHTML(opts: RegisterHTMLOpts): string {
  const reg = JSON.stringify(opts)
  const posLabel = opts.position === 'L' ? 'GAUCHE' : opts.position === 'R' ? 'DROITE' : ''
  const modeTitle = opts.mode === 'M2'
    ? `Inscription — Placement direct (jambe ${posLabel})`
    : opts.mode === 'M3'
    ? 'Inscription — Via lien de parrainage'
    : 'Créer un compte — LEADER'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${modeTitle}</title>
  <link rel="stylesheet" href="/static/tailwind.compiled.css">
  <script>
    window.__REG__ = ${reg};
  </script>
  <script src="/static/axios.min.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
  </script>
  <style>
    .input-field {
      width:100%; background:#1A1A26; border:1px solid #22223A;
      border-radius:0.75rem; padding:0.75rem 1rem; color:#fff;
      outline:none; transition:border-color .2s;
    }
    .input-field:focus { border-color:#C03020; }
    .input-field::placeholder { color:#6B7280; }
    .btn-rouge {
      width:100%; background:linear-gradient(135deg,#C03020,#E05040,#C03020);
      color:#FFFFFF; font-weight:700; padding:0.875rem; border-radius:0.75rem;
      border:none; cursor:pointer; font-size:1rem; transition:opacity .2s;
    }
    .btn-rouge:hover { opacity:.9; }
    .btn-rouge:disabled { opacity:.5; cursor:not-allowed; }
    .step { display:none; }
    .step.active { display:block; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    .fade-in { animation:fadeIn .35s ease; }
    /* Indicateur de progression multi-étapes */
    .ms-step-bar { display:flex; align-items:center; margin-bottom:1.5rem; }
    .ms-step-item { display:flex; flex-direction:column; align-items:center; flex:1; }
    .ms-step-circle {
      width:2rem; height:2rem; border-radius:50%; border:2px solid #22223A;
      background:#1A1A26; display:flex; align-items:center; justify-content:center;
      font-size:0.75rem; font-weight:700; color:#6B7280; transition:all .3s;
    }
    .ms-step-circle.active { border-color:#C03020; background:rgba(192,48,32,0.15); color:#E05040; }
    .ms-step-circle.done   { border-color:#10B981; background:#10B981; color:#fff; }
    .ms-step-label { font-size:0.65rem; color:#6B7280; margin-top:0.25rem; text-align:center; }
    .ms-step-label.active { color:#E05040; }
    .ms-step-label.done   { color:#10B981; }
    .ms-step-line { flex:1; height:2px; background:#22223A; margin:0 0.25rem; margin-bottom:1.1rem; }
    .ms-step-line.done { background:#10B981; }
    /* Sections multi-étapes dans le formulaire */
    .ms-section { display:none; }
    .ms-section.active { display:block; }
    .btn-outline-rouge {
      background:transparent; border:1px solid #C03020; color:#E05040;
      border-radius:0.75rem; padding:0.75rem 1.5rem; cursor:pointer;
      font-weight:600; transition:all .2s;
    }
    .btn-outline-rouge:hover { background:rgba(192,48,32,0.12); }
  </style>
  <script src="/static/country-selector.js"></script>
</head>
<body class="bg-dark-900 text-white min-h-screen flex items-center justify-center p-4">

<div class="w-full max-w-lg">

  <!-- LOGO -->
  <div class="text-center mb-8">
    <a href="/" class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg" style="background:linear-gradient(135deg,#C03020,#8A1E10)">
      <i class="fas fa-crown text-dark-900 text-2xl"></i>
    </a>
    <h1 class="text-2xl font-bold text-white">LEADER</h1>
    <p class="text-gray-400 mt-1 text-sm" id="page-subtitle">Création de votre compte</p>
  </div>

  <!-- ÉTAPE 1 : CHARGEMENT (M2/M3 — validation du lien) -->
  <div id="step-loading" class="step active">
    <div class="bg-dark-800 rounded-2xl border border-dark-600 p-10 text-center">
      <div class="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style="background:rgba(192,48,32,0.2)">
        <i class="fas fa-spinner fa-spin text-2xl" style="color:#C03020"></i>
      </div>
      <p class="text-gray-300">Vérification du lien en cours…</p>
    </div>
  </div>

  <!-- ÉTAPE 2 : FORMULAIRE D'INSCRIPTION -->
  <div id="step-form" class="step">
    <div class="bg-dark-800 rounded-2xl border border-dark-600 p-8 fade-in">

      <!-- Bandeau parrain (M2/M3) -->
      <div id="sponsor-banner" class="hidden mb-5 rounded-xl px-4 py-3 flex items-start gap-3" style="background:rgba(192,48,32,0.1);border:1px solid rgba(192,48,32,0.3)">
        <i class="fas fa-user-check mt-0.5 flex-shrink-0" style="color:#E05040"></i>
        <div>
          <div class="text-sm font-semibold" id="sponsor-banner-name" style="color:#C03020"></div>
          <div class="text-xs mt-0.5" id="sponsor-banner-detail" style="color:rgba(160,40,32,0.7)"></div>
        </div>
      </div>

      <!-- Bandeau erreur slot (M2) -->
      <div id="slot-error-banner" class="hidden mb-5 bg-red-900/30 border border-red-500/40 rounded-xl px-4 py-4 flex items-start gap-3">
        <i class="fas fa-triangle-exclamation text-red-400 mt-0.5 flex-shrink-0"></i>
        <div>
          <div class="text-sm font-semibold text-red-300">Lien invalide ou expiré</div>
          <div class="text-xs text-red-400/80 mt-1" id="slot-error-text"></div>
          <a href="/" class="text-xs text-red-300 underline mt-2 inline-block">← Retour à l'accueil</a>
        </div>
      </div>

      <!-- Titre formulaire -->
      <h2 class="text-xl font-bold text-white mb-1" id="form-title">Créer un compte</h2>
      <p class="text-xs text-gray-500 mb-4" id="form-subtitle">Tous les champs marqués * sont obligatoires</p>

      <!-- Indicateur de progression multi-étapes (masqué en mode simple) -->
      <div id="ms-progress" class="ms-step-bar hidden">
        <div class="ms-step-item">
          <div class="ms-step-circle active" id="ms-circle-1">1</div>
          <div class="ms-step-label active" id="ms-label-1">Identité</div>
        </div>
        <div class="ms-step-line" id="ms-line-1"></div>
        <div class="ms-step-item">
          <div class="ms-step-circle" id="ms-circle-2">2</div>
          <div class="ms-step-label" id="ms-label-2">Coordonnées</div>
        </div>
        <div class="ms-step-line" id="ms-line-2"></div>
        <div class="ms-step-item">
          <div class="ms-step-circle" id="ms-circle-3">3</div>
          <div class="ms-step-label" id="ms-label-3">Sécurité</div>
        </div>
      </div>

      <!-- ── SECTION 1 : Identité ── -->
      <div class="ms-section active space-y-4" id="ms-s1">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-gray-400 mb-1.5">Prénom <span class="text-red-400">*</span></label>
            <input id="r-firstname" type="text" placeholder="Prénom" autocomplete="given-name" class="input-field">
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1.5">Nom <span class="text-red-400">*</span></label>
            <input id="r-lastname" type="text" placeholder="Nom" autocomplete="family-name" class="input-field">
          </div>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1.5">Adresse email <span class="text-red-400">*</span></label>
          <input id="r-email" type="email" placeholder="votre@email.com" autocomplete="email" class="input-field">
        </div>
        <div id="r-birthdate-field">
          <label class="block text-xs text-gray-400 mb-1.5">Date de naissance <span id="r-birthdate-req" class="text-red-400 hidden">*</span></label>
          <input id="r-birthdate" type="date" autocomplete="bday" class="input-field">
          <p class="text-xs text-gray-500 mt-1">Format JJ/MM/AAAA — requis KYC</p>
        </div>
        <div id="r-nationality-field">
          <label class="block text-xs text-gray-400 mb-1.5">Nationalité <span id="r-nationality-req" class="text-red-400 hidden">*</span></label>
          <input id="r-nationality" type="text" placeholder="Française" autocomplete="language" class="input-field">
          <p class="text-xs text-gray-500 mt-1">Auto-rempli selon le pays (modifiable)</p>
        </div>
      </div>

      <!-- ── SECTION 2 : Coordonnées ── -->
      <div class="ms-section space-y-4" id="ms-s2">
        <div id="r-country-field">
          <label class="block text-xs text-gray-400 mb-1.5">Pays de résidence + Indicatif tél. <span id="r-country-req" class="text-red-400 hidden">*</span></label>
          <!-- Wrapper CountrySelector — remplit automatiquement r-country et r-phone-dial -->
          <div id="cs-r-wrap"></div>
          <input id="r-country" type="hidden" value="">
          <input id="r-phone-dial" type="hidden" value="">
        </div>
        <div id="r-phone-field">
          <label class="block text-xs text-gray-400 mb-1.5">Numéro de téléphone <span id="r-phone-req" class="text-red-400 hidden">*</span></label>
          <div class="flex gap-2 items-center">
            <span id="r-dial-display" style="background:#1a1a2e;border:1px solid #374151;border-radius:0.75rem;padding:0.75rem 0.6rem;color:#C03020;font-weight:600;font-size:0.85rem;white-space:nowrap;flex-shrink:0">+33</span>
            <input id="r-phone" type="tel" placeholder="6 00 00 00 00" autocomplete="tel" class="input-field">
          </div>
        </div>
        <div id="r-address-field">
          <label class="block text-xs text-gray-400 mb-1.5">Adresse <span id="r-address-req" class="text-red-400 hidden">*</span></label>
          <input id="r-address" type="text" placeholder="Numéro et nom de rue" autocomplete="street-address" class="input-field">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div id="r-postal-field">
            <label class="block text-xs text-gray-400 mb-1.5">Code postal <span id="r-postal-req" class="text-red-400 hidden">*</span></label>
            <input id="r-postal" type="text" placeholder="75001" autocomplete="postal-code" class="input-field">
          </div>
          <div id="r-city-field">
            <label class="block text-xs text-gray-400 mb-1.5">Ville <span id="r-city-req" class="text-red-400 hidden">*</span></label>
            <input id="r-city" type="text" placeholder="Paris" autocomplete="address-level2" class="input-field">
          </div>
        </div>
      </div>

      <!-- ── SECTION 3 : Sécurité ── -->
      <div class="ms-section space-y-4" id="ms-s3">
        <div>
          <label class="block text-xs text-gray-400 mb-1.5">Mot de passe <span class="text-red-400">*</span></label>
          <div class="relative">
            <input id="r-password" type="password" placeholder="Minimum 8 caractères" autocomplete="new-password" class="input-field pr-12">
            <button type="button" onclick="togglePwd('r-password','eye1')" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <i id="eye1" class="fas fa-eye text-sm"></i>
            </button>
          </div>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1.5">Confirmer le mot de passe <span class="text-red-400">*</span></label>
          <div class="relative">
            <input id="r-password2" type="password" placeholder="Répétez le mot de passe" autocomplete="new-password" class="input-field pr-12">
            <button type="button" onclick="togglePwd('r-password2','eye2')" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <i id="eye2" class="fas fa-eye text-sm"></i>
            </button>
          </div>
        </div>
        <!-- Code parrain — M1 uniquement -->
        <div id="sponsor-field">
          <label class="block text-xs text-gray-400 mb-1.5">Code parrain (optionnel)</label>
          <input id="r-sponsor-code" type="text" placeholder="LDR000000 — laisser vide si aucun"
            class="input-field" style="text-transform:uppercase">
          <p class="text-xs text-gray-500 mt-1">Entrez le code LDRxxxxxx de votre parrain si vous en avez un.</p>
        </div>
        <!-- CGU -->
        <div class="flex items-start gap-3 pt-1">
          <input id="r-cgu" type="checkbox" class="mt-0.5 w-4 h-4 rounded accent-yellow-500 flex-shrink-0">
          <label for="r-cgu" class="text-sm text-gray-400 leading-relaxed">
            J'accepte les <button type="button" onclick="showCGU()" class="hover:underline" style="color:#E05040">conditions générales d'utilisation</button>
            et la politique de confidentialité de LEADER. <span class="text-red-400">*</span>
          </label>
        </div>
      </div>

      <!-- Erreur -->
      <div id="r-error" class="hidden mt-4 bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm flex items-start gap-2">
        <i class="fas fa-circle-exclamation mt-0.5 flex-shrink-0"></i>
        <span id="r-error-text"></span>
      </div>

      <!-- Navigation multi-étapes / Bouton submit -->
      <div class="mt-6 flex gap-3" id="ms-nav">
        <button type="button" id="ms-btn-prev" onclick="msGoStep(window._msStep - 1)" class="btn-outline-rouge hidden" style="flex:1">
          <i class="fas fa-arrow-left mr-2"></i>Précédent
        </button>
        <button type="button" id="ms-btn-next" onclick="msGoStep(window._msStep + 1)" class="btn-rouge hidden" style="flex:1">
          Suivant <i class="fas fa-arrow-right ml-2"></i>
        </button>
        <button id="r-submit-btn" onclick="doRegister()" class="btn-rouge" style="flex:1">
          <i class="fas fa-user-plus mr-2"></i>
          <span id="r-btn-text">Créer mon compte</span>
        </button>
      </div>

      <div class="mt-4 text-center">
        <a href="/" class="text-sm hover:underline" style="color:#E05040">
          <i class="fas fa-arrow-left mr-1 text-xs"></i>Déjà membre ? Se connecter
        </a>
      </div>
    </div>
  </div>

  <!-- ÉTAPE 3 : CONFIRMATION PIN (affichée une seule fois) -->
  <div id="step-pin" class="step">
    <div class="bg-dark-800 rounded-2xl p-8 fade-in" style="border:1px solid rgba(192,48,32,0.4)">
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg" style="background:linear-gradient(135deg,#C03020,#8A1E10)">
          <i class="fas fa-shield-halved text-dark-900 text-2xl"></i>
        </div>
        <h2 class="text-2xl font-bold text-white">Compte créé avec succès !</h2>
        <p class="text-gray-400 text-sm mt-1">Notez précieusement les informations ci-dessous</p>
      </div>

      <div id="pin-content" class="space-y-4"></div>

      <button onclick="goToBackoffice()" class="btn-rouge mt-6">
        <i class="fas fa-check mr-2"></i>
        J'ai noté mon PIN — Accéder à mon espace membre
      </button>

      <p class="text-xs text-gray-600 text-center mt-3">
        Ce PIN ne sera <strong class="text-gray-400">jamais</strong> affiché à nouveau.
        Vous pouvez le modifier dans votre profil.
      </p>
    </div>
  </div>

  <!-- ÉTAPE 4 : LIEN INVALIDE (slot M2 pris ou sponsor introuvable) -->
  <div id="step-invalid" class="step">
    <div class="bg-dark-800 rounded-2xl border border-red-500/30 p-8 text-center fade-in">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/20 mb-4">
        <i class="fas fa-link-slash text-red-400 text-2xl"></i>
      </div>
      <h2 class="text-xl font-bold text-white mb-2">Lien invalide ou expiré</h2>
      <p class="text-gray-400 text-sm mb-6" id="invalid-message">Ce lien d'inscription n'est plus disponible.</p>
      <a href="/" class="inline-flex items-center gap-2 text-sm" style="color:#E05040">
        <i class="fas fa-arrow-left text-xs"></i> Retour à l'accueil
      </a>
    </div>
  </div>

</div>

<!-- MODAL CGU -->
<div id="cgu-modal" class="hidden fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
  <div class="bg-dark-800 rounded-2xl border border-dark-600 w-full max-w-lg max-h-[80vh] overflow-y-auto">
    <div class="sticky top-0 bg-dark-800 border-b border-dark-600 px-6 py-4 flex items-center justify-between">
      <h3 class="font-bold text-white">Conditions générales d'utilisation</h3>
      <button onclick="hideCGU()" class="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
    </div>
    <div class="p-6 text-sm text-gray-400 space-y-3">
      <p class="font-semibold text-white">LEADER — CGU</p>
      <p>En vous inscrivant sur LEADER, vous acceptez les présentes conditions.</p>
      <p><strong class="text-white">1. Adhésion</strong> — L'adhésion est volontaire. Vous devez avoir au moins 18 ans.</p>
      <p><strong class="text-white">2. Commissions</strong> — Les commissions sont versées selon le plan de compensation en vigueur, sous réserve des conditions d'éligibilité (licence active, KYC validé).</p>
      <p><strong class="text-white">3. Retraits</strong> — Les retraits sont traités sous 48–72h ouvrées. Un PIN de sécurité est requis. KYC obligatoire pour tout retrait.</p>
      <p><strong class="text-white">4. Données personnelles</strong> — Vos données sont traitées conformément au RGPD. Elles ne sont pas revendues à des tiers.</p>
      <p><strong class="text-white">5. Compte</strong> — LEADER se réserve le droit de suspendre tout compte en cas de fraude ou violation des présentes CGU.</p>
      <p><strong class="text-white">6. Résiliation</strong> — Vous pouvez résilier votre compte à tout moment en contactant le support.</p>
      <p class="text-gray-500 text-xs">Dernière mise à jour : Mai 2026</p>
    </div>
    <div class="px-6 pb-5">
      <button onclick="acceptCGU()" class="btn-rouge">J'accepte les CGU — Fermer</button>
    </div>
  </div>
</div>

<script>
// ── Données d'inscription injectées côté serveur ──
const REG = window.__REG__ || { mode: 'M1' }

// Champs cachés pour stocker les UUIDs résolus
let _sponsorId = null       // UUID du sponsor (M2/M3)
let _binaryParentId = null  // UUID du parent binaire (M2)
let _memberToken = null     // JWT après inscription

// ── Utilitaires ──────────────────────────────────
function showStep(id) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'))
  document.getElementById(id).classList.add('active')
}

function showError(msg) {
  const el = document.getElementById('r-error')
  document.getElementById('r-error-text').textContent = msg
  el.classList.remove('hidden')
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}
function hideError() { document.getElementById('r-error').classList.add('hidden') }

function togglePwd(inputId, iconId) {
  const input = document.getElementById(inputId)
  const icon  = document.getElementById(iconId)
  if (input.type === 'password') {
    input.type = 'text'; icon.className = 'fas fa-eye-slash text-sm'
  } else {
    input.type = 'password'; icon.className = 'fas fa-eye text-sm'
  }
}

function showCGU()  { document.getElementById('cgu-modal').classList.remove('hidden') }
function hideCGU()  { document.getElementById('cgu-modal').classList.add('hidden') }
function acceptCGU() {
  document.getElementById('r-cgu').checked = true
  hideCGU()
}

// ── INIT — appelé au chargement ──────────────────
async function initPage() {
  const mode = REG.mode

  if (mode === 'M1') {
    // Inscription libre — afficher le formulaire directement
    document.getElementById('form-title').textContent = 'Créer un compte'
    document.getElementById('form-subtitle').textContent = 'Inscription libre — un parrain optionnel peut être renseigné'
    document.getElementById('page-subtitle').textContent = 'Inscription libre'
    showStep('step-form')
    return
  }

  if (mode === 'M2') {
    // Valider le slot avant d'afficher le formulaire
    // REG.sponsor  = unique_id du RECRUTEUR (celui qui a généré le lien)
    // REG.parent   = unique_id du NŒUD DE PLACEMENT (peut différer du recruteur)
    //                absent sur anciens liens → rétrocompat : parent = sponsor
    const sponsor  = REG.sponsor  || ''
    const parent   = REG.parent   || sponsor  // rétrocompat anciens liens
    const position = REG.position || ''
    try {
      const res = await axios.get(
        '/api/auth/validate-slot?sponsor=' + encodeURIComponent(sponsor) +
        '&parent='   + encodeURIComponent(parent) +
        '&position=' + encodeURIComponent(position)
      )
      const d = res.data
      if (d.valid) {
        _sponsorId      = d.sponsor_id   // UUID du RECRUTEUR → sponsor_id en DB
        _binaryParentId = d.parent_id    // UUID du NŒUD DE PLACEMENT → binary_parent_id en DB
        document.getElementById('form-title').textContent = 'Inscription — Placement direct'
        document.getElementById('form-subtitle').textContent =
          'Vous serez placé(e) directement dans l\\'arbre binaire sur ce slot.'
        document.getElementById('page-subtitle').textContent = 'Placement direct (M2)'
        document.getElementById('sponsor-field').classList.add('hidden')
        const banner = document.getElementById('sponsor-banner')
        banner.classList.remove('hidden')
        // Afficher le recruteur (sponsor réel) dans le bandeau
        document.getElementById('sponsor-banner-name').textContent =
          d.sponsor_name + ' (' + d.sponsor_unique_id + ')'
        // Préciser le nœud de placement si différent du recruteur
        const placementInfo = d.parent_unique_id !== d.sponsor_unique_id
          ? 'Placé(e) sous ' + d.parent_name + ' (' + d.parent_unique_id + '), jambe ' + (position === 'L' ? 'GAUCHE' : 'DROITE')
          : 'Vous serez placé(e) sur la jambe ' + (position === 'L' ? 'GAUCHE' : 'DROITE') + ' de ' + d.sponsor_name
        document.getElementById('sponsor-banner-detail').textContent = placementInfo
        showStep('step-form')
      } else {
        document.getElementById('invalid-message').textContent = d.error || 'Ce slot n\\'est plus disponible.'
        showStep('step-invalid')
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Lien invalide ou expiré.'
      if (err.response?.status === 409) {
        document.getElementById('invalid-message').textContent = msg
        showStep('step-invalid')
      } else {
        document.getElementById('slot-error-text').textContent = msg
        document.getElementById('slot-error-banner').classList.remove('hidden')
        document.getElementById('r-submit-btn').disabled = true
        document.getElementById('sponsor-field').classList.add('hidden')
        document.getElementById('form-title').textContent = 'Inscription — Placement direct'
        showStep('step-form')
      }
    }
    return
  }

  if (mode === 'M3') {
    // Résoudre le sponsor via son unique_id
    const sponsorUid = (REG.sponsorUid || '').toUpperCase()
    document.getElementById('sponsor-field').classList.add('hidden')
    document.getElementById('form-title').textContent = 'Inscription — Via lien parrain'
    document.getElementById('form-subtitle').textContent =
      'Vous serez placé(e) en réservoir — un administrateur vous placera dans l\\'arbre.'
    document.getElementById('page-subtitle').textContent = 'Via lien de parrainage (M3)'

    if (sponsorUid) {
      try {
        const res = await axios.get('/api/auth/sponsor/' + encodeURIComponent(sponsorUid))
        const d = res.data
        if (d.found) {
          _sponsorId = d.id
          const banner = document.getElementById('sponsor-banner')
          banner.classList.remove('hidden')
          document.getElementById('sponsor-banner-name').textContent =
            'Parrain : ' + d.name + ' (' + d.unique_id + ')'
          document.getElementById('sponsor-banner-detail').textContent =
            'Vous rejoignez le réseau de ' + d.name + '. Votre compte sera en attente de placement.'
        } else {
          // Sponsor introuvable → inscription sans parrain
          const banner = document.getElementById('sponsor-banner')
          banner.classList.remove('hidden')
          banner.style.background = 'rgba(107,114,128,0.1)'
          banner.style.borderColor = 'rgba(107,114,128,0.3)'
          document.getElementById('sponsor-banner-name').style.color = '#9CA3AF'
          document.getElementById('sponsor-banner-name').textContent = 'Parrain introuvable'
          document.getElementById('sponsor-banner-detail').textContent =
            'Inscription sans parrain — vous serez rattaché à la racine du réseau.'
        }
      } catch {
        // Erreur silencieuse — inscription sans parrain
      }
    }
    showStep('step-form')
    return
  }

  // Fallback M1
  showStep('step-form')
}

// ── NAVIGATION MULTI-ÉTAPES ───────────────────────
window._msStep    = 1   // étape courante (1=Identité, 2=Coordonnées, 3=Sécurité)
window._msMode    = 'simple'    // 'simple' ou 'multistep'
window._msFields  = []          // champs obligatoires depuis l'API

// Applique l'affichage d'une étape (1-3) ou de tout d'un coup (mode simple)
function msRender() {
  const mode   = window._msMode
  const step   = window._msStep
  const s      = (id) => document.getElementById(id)

  if (mode === 'simple') {
    // Mode simple — tout visible, pas de navigation
    s('ms-progress') && s('ms-progress').classList.add('hidden')
    ;['ms-s1','ms-s2','ms-s3'].forEach(id => { const el=s(id); if(el){el.classList.add('active');el.style.display='block'} })
    s('ms-btn-prev') && (s('ms-btn-prev').classList.add('hidden'))
    s('ms-btn-next') && (s('ms-btn-next').classList.add('hidden'))
    s('r-submit-btn') && (s('r-submit-btn').style.display='')
  } else {
    // Mode multi-étapes
    s('ms-progress') && s('ms-progress').classList.remove('hidden')
    ;['ms-s1','ms-s2','ms-s3'].forEach((id, i) => {
      const el=s(id); if(!el) return
      if (i+1 === step) { el.classList.add('active'); el.style.display='block' }
      else              { el.classList.remove('active'); el.style.display='none' }
    })
    // Bouton précédent
    if (s('ms-btn-prev')) s('ms-btn-prev').classList.toggle('hidden', step === 1)
    // Bouton suivant / submit
    if (s('ms-btn-next')) s('ms-btn-next').classList.toggle('hidden', step === 3)
    if (s('r-submit-btn')) s('r-submit-btn').style.display = (step === 3 ? '' : 'none')
    // Cercles de progression
    for (let i=1; i<=3; i++) {
      const circ = s('ms-circle-'+i), lbl = s('ms-label-'+i)
      if (!circ) continue
      circ.className = 'ms-step-circle' + (i < step ? ' done' : i === step ? ' active' : '')
      if (i < step) circ.innerHTML = '<i class="fas fa-check" style="font-size:0.6rem"></i>'
      else circ.textContent = String(i)
      if (lbl) lbl.className = 'ms-step-label' + (i < step ? ' done' : i === step ? ' active' : '')
    }
    // Lignes de progression
    for (let i=1; i<=2; i++) {
      const line = s('ms-line-'+i)
      if (line) line.className = 'ms-step-line' + (i < step ? ' done' : '')
    }
  }
}

// Navigation vers une étape (avec validation de l'étape courante)
function msGoStep(targetStep) {
  if (window._msMode !== 'multistep') return
  hideError()

  // Validation avant d'avancer
  if (targetStep > window._msStep) {
    const err = msValidateStep(window._msStep)
    if (err) { showError(err); return }
  }

  window._msStep = Math.max(1, Math.min(3, targetStep))
  msRender()
  // Scroll vers le haut du formulaire
  const formEl = document.getElementById('step-form')
  if (formEl) formEl.scrollIntoView({ behavior:'smooth', block:'start' })
}

// Validation par étape
function msValidateStep(step) {
  const v = (id) => (document.getElementById(id)?.value||'').trim()
  if (step === 1) {
    if (!v('r-firstname') || !v('r-lastname')) return 'Veuillez renseigner votre prénom et votre nom.'
    if (!v('r-email') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('r-email'))) return 'Adresse email invalide.'
    // Champs optionnels requis selon config
    const flds = window._msFields
    if (flds.includes('birth_date') && !v('r-birthdate')) return 'Le champ « Date de naissance » est obligatoire.'
    if (flds.includes('nationality') && !v('r-nationality')) return 'Le champ « Nationalité » est obligatoire.'
  }
  if (step === 2) {
    const flds = window._msFields
    if (flds.includes('phone') && !v('r-phone')) return 'Le champ « Téléphone » est obligatoire.'
    if (flds.includes('country') && !v('r-country')) return 'Le champ « Pays de résidence » est obligatoire.'
    if (flds.includes('address') && !v('r-address')) return 'Le champ « Adresse » est obligatoire.'
    if (flds.includes('postal_code') && !v('r-postal')) return 'Le champ « Code postal » est obligatoire.'
    if (flds.includes('city') && !v('r-city')) return 'Le champ « Ville » est obligatoire.'
  }
  return null
}

// Applique les astérisques de champs obligatoires selon la config
function msApplyRequiredMarkers(fields) {
  const map = {
    phone:       'r-phone-req',
    country:     'r-country-req',
    birth_date:  'r-birthdate-req',
    nationality: 'r-nationality-req',
    address:     'r-address-req',
    postal_code: 'r-postal-req',
    city:        'r-city-req',
  }
  for (const [fk, elId] of Object.entries(map)) {
    const el = document.getElementById(elId)
    if (!el) continue
    if (fields.includes(fk)) el.classList.remove('hidden')
    else el.classList.add('hidden')
  }
}

// ── SOUMISSION DU FORMULAIRE ─────────────────────
async function doRegister() {
  hideError()

  const first_name    = (document.getElementById('r-firstname')?.value||'').trim()
  const last_name     = (document.getElementById('r-lastname')?.value||'').trim()
  const email         = (document.getElementById('r-email')?.value||'').trim()
  const dialCode      = (document.getElementById('r-phone-dial')?.value||'').trim()
  const phoneNum      = (document.getElementById('r-phone')?.value||'').trim()
  const phone         = phoneNum ? (dialCode && !phoneNum.startsWith('+') ? dialCode+' '+phoneNum : phoneNum) : ''
  const country       = (document.getElementById('r-country')?.value||'').trim()
  const birthdate     = (document.getElementById('r-birthdate')?.value||'').trim()
  const nationality   = (document.getElementById('r-nationality')?.value||'').trim()
  const address       = (document.getElementById('r-address')?.value||'').trim()
  const postal        = (document.getElementById('r-postal')?.value||'').trim()
  const city          = (document.getElementById('r-city')?.value||'').trim()
  const password      = document.getElementById('r-password').value
  const password2     = document.getElementById('r-password2').value
  const cgu           = document.getElementById('r-cgu').checked
  const btn           = document.getElementById('r-submit-btn')
  const btnText       = document.getElementById('r-btn-text')

  // Validations de base (toujours obligatoires)
  if (!first_name || !last_name) { showError('Veuillez renseigner votre prénom et votre nom.'); return }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('Adresse email invalide.'); return }
  if (password.length < 8) { showError('Le mot de passe doit contenir au moins 8 caractères.'); return }
  if (password !== password2) { showError('Les mots de passe ne correspondent pas.'); return }
  if (!cgu) { showError('Vous devez accepter les conditions générales d\\'utilisation.'); return }

  // Validation des champs configurables obligatoires
  const reqFields = window._msFields || []
  const fieldMap = {
    phone:       { val: phone,       label: 'Téléphone' },
    country:     { val: country,     label: 'Pays de résidence' },
    birth_date:  { val: birthdate,   label: 'Date de naissance' },
    nationality: { val: nationality, label: 'Nationalité' },
    address:     { val: address,     label: 'Adresse' },
    postal_code: { val: postal,      label: 'Code postal' },
    city:        { val: city,        label: 'Ville' },
  }
  for (const fk of reqFields) {
    if (fieldMap[fk] && !fieldMap[fk].val) {
      showError('Le champ « ' + fieldMap[fk].label + ' » est obligatoire.')
      return
    }
  }

  // Construction du payload
  const payload = {
    first_name, last_name,
    email: email.toLowerCase(),
    password,
    phone:       phone       || null,
    country:     country     || null,
    birth_date:  birthdate   || null,
    nationality: nationality || null,
    address:     address     || null,
    postal_code: postal      || null,
    city:        city        || null,
    registration_method: REG.mode
  }

  if (REG.mode === 'M1') {
    // Résoudre le code parrain optionnel
    const code = (document.getElementById('r-sponsor-code')?.value || '').trim().toUpperCase()
    if (code) {
      try {
        const res = await axios.get('/api/auth/sponsor/' + encodeURIComponent(code))
        if (res.data.found) payload.sponsor_id = res.data.id
      } catch { /* sans parrain si erreur */ }
    }
  }

  if (REG.mode === 'M2') {
    if (!_binaryParentId) { showError('Lien invalide — rechargez la page.'); return }
    payload.sponsor_id       = _sponsorId
    payload.binary_parent_id = _binaryParentId
    payload.binary_position  = REG.position
  }

  if (REG.mode === 'M3') {
    if (_sponsorId) payload.sponsor_id = _sponsorId
  }

  // Envoi
  btn.disabled = true
  btnText.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Création en cours…'

  try {
    const res = await axios.post('/api/auth/register', payload)
    const data = res.data

    // Stocker le token dans localStorage
    _memberToken = data.token
    localStorage.setItem('leader_member_token', data.token)

    // Afficher la page de confirmation PIN
    showPinConfirmation(data)

  } catch (err) {
    const msg = err.response?.data?.error || 'Erreur lors de la création du compte.'
    showError(msg)
    btn.disabled = false
    btnText.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Créer mon compte'
  }
}

// ── PAGE CONFIRMATION PIN ────────────────────────
function showPinConfirmation(data) {
  const member = data.member || {}
  const modeLabels = { M1:'Inscription libre', M2:'Placement direct', M3:'Via lien de parrainage' }
  const modeLabel = modeLabels[data.registration_method] || data.registration_method || REG.mode

  const statusHtml = data.in_holding_tank
    ? '<span class="text-orange-400"><i class="fas fa-clock mr-1"></i>En attente de placement dans l\\'arbre</span>'
    : '<span class="text-green-400"><i class="fas fa-check mr-1"></i>Placé(e) directement dans l\\'arbre binaire</span>'

  document.getElementById('pin-content').innerHTML = \`
    <!-- Identifiant unique -->
    <div class="bg-dark-700 rounded-xl p-4" style="border:1px solid rgba(192,48,32,0.3)">
      <div class="text-xs text-gray-400 uppercase tracking-wider mb-1">Votre identifiant unique</div>
      <div class="text-3xl font-bold font-mono tracking-widest text-center py-1" style="color:#E05040">
        \${member.unique_id || '—'}
      </div>
      <div class="text-xs text-gray-500 text-center mt-1">
        Conservez-le précieusement — il ne peut pas être modifié
      </div>
    </div>

    <!-- PIN — visible une seule fois -->
    <div class="bg-dark-700 rounded-xl p-4 border border-red-500/40">
      <div class="flex items-center gap-2 mb-2">
        <i class="fas fa-triangle-exclamation text-red-400"></i>
        <div class="text-xs text-red-300 uppercase tracking-wider font-bold">
          PIN de sécurité — Visible UNE SEULE FOIS
        </div>
      </div>
      <div class="text-4xl font-bold text-white font-mono tracking-[0.4em] text-center py-3 bg-dark-900/50 rounded-lg">
        \${data.pin_displayed || '????'}
      </div>
      <div class="text-xs text-red-400/80 text-center mt-2">
        Ce PIN est requis pour chaque retrait. Notez-le maintenant sur papier.
      </div>
    </div>

    <!-- Récapitulatif -->
    <div class="bg-dark-700/60 rounded-xl p-4 space-y-2 text-sm">
      <div class="flex justify-between items-center">
        <span class="text-gray-400">Nom complet</span>
        <span class="text-white font-medium">\${member.first_name} \${member.last_name}</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-gray-400">Email</span>
        <span class="text-white text-xs">\${member.email}</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-gray-400">Méthode</span>
        <span class="text-xs font-medium" style="color:#E05040">\${modeLabel}</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-gray-400">Statut</span>
        <span class="text-xs">\${statusHtml}</span>
      </div>
    </div>

    <!-- Message info -->
    <div class="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-3">
      <p class="text-xs text-yellow-400">
        <i class="fas fa-info-circle mr-1"></i>
        \${data.in_holding_tank
          ? 'Votre compte est créé. Un administrateur va placer votre profil dans l\\'arbre binaire. Vous recevrez une notification.'
          : 'Votre compte est créé et vous êtes déjà placé(e) dans l\\'arbre binaire. Vous pouvez accéder à votre espace immédiatement.'}
      </p>
    </div>
  \`

  showStep('step-pin')
}

// ── REDIRECTION VERS LE BACKOFFICE ───────────────
function goToBackoffice() {
  window.location.href = '/'
}

// ── CHARGEMENT CONFIG FORMULAIRE DEPUIS L'API ────
// Appelé après initPage() pour appliquer le type de formulaire et les champs obligatoires
async function initFormConfig() {
  try {
    const res = await axios.get('/api/auth/reg-required-fields')
    const { fields, form_type } = res.data || {}
    window._msFields = Array.isArray(fields) ? fields : []
    window._msMode   = form_type === 'multistep' ? 'multistep' : 'simple'
  } catch {
    window._msFields = []
    window._msMode   = 'simple'
  }
  // Appliquer les marqueurs * et l'affichage multi-étapes
  msApplyRequiredMarkers(window._msFields)
  window._msStep = 1
  msRender()
  // ── Initialiser le sélecteur de pays (formulaire autonome) ──
  if (window.CountrySelector) {
    window.CountrySelector.init({
      wrapperId:      'cs-r-wrap',
      countryInputId: 'r-country',
      dialInputId:    'r-phone-dial',
      placeholder:    'Sélectionner un pays',
      defaultCode:    'FR',
      onSelect: function(c) {
        const badge = document.getElementById('r-dial-display')
        if (badge) badge.textContent = c.dial
      }
    })
  }
}

// ── LANCEMENT ────────────────────────────────────
window.addEventListener('load', async () => {
  await initPage()
  await initFormConfig()
})
</script>
</body>
</html>`
}

// ============================================================
// HTML — Interface Membre
// ============================================================
interface MemberHTMLOpts {
  mode?: 'M1' | 'M2' | 'M3'
  sponsorUid?: string   // M3 : WBxxxxxx depuis URL
  sponsor?: string      // M2 : unique_id sponsor
  position?: string     // M2 : L ou R
}

interface BrandingPublic { logoUri: string; networkName: string }

function memberHTML(opts: MemberHTMLOpts = {}, branding: BrandingPublic = { logoUri: '', networkName: 'LEADER' }): string {
  const registrationData = JSON.stringify(opts)
  // Logo HTML : image si dispo, sinon icône couronne fallback
  const logoImgMember = branding.logoUri
    ? `<img src="${branding.logoUri}" alt="${branding.networkName}" style="max-height:40px;max-width:140px;object-fit:contain;" class="block">`
    : `<div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:linear-gradient(135deg,#C03020,#8A1E10)"><i class="fas fa-crown text-white text-lg"></i></div>`
  const logoImgMemberLg = branding.logoUri
    ? `<img src="${branding.logoUri}" alt="${branding.networkName}" style="max-height:56px;max-width:180px;object-fit:contain;" class="block mx-auto">`
    : `<div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg" style="background:linear-gradient(135deg,#C03020,#8A1E10)"><i class="fas fa-crown text-white text-2xl"></i></div>`
  const networkName = branding.networkName || 'LEADER'
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LEADER — Backoffice</title>
  <link rel="stylesheet" href="/static/tailwind.compiled.css">
  <script>
    // Données d'inscription injectées côté serveur
    window.__REGISTRATION__ = ${registrationData};
  </script>
  <script src="/static/axios.min.js"></script>
  <script src="/static/chart.min.js"></script>
  <script src="/static/country-selector.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
  <link rel="stylesheet" href="/static/style.css">
  <link rel="stylesheet" href="/static/campus.css">
</head>
<body class="bg-dark-900 text-white min-h-screen">

<!-- AUTH SCREENS -->
<div id="auth-screen" class="min-h-screen flex items-center justify-center bg-dark-900 p-4">
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <div class="mb-4 flex items-center justify-center">
        ${logoImgMemberLg}
      </div>
      <h1 class="text-3xl font-bold text-white">${networkName}</h1>
      <p class="text-gray-400 mt-1">Votre espace membre</p>
    </div>

    <!-- LOGIN -->
    <div id="login-form" class="bg-dark-800 rounded-2xl p-8 shadow-2xl border border-dark-600">
      <h2 class="text-xl font-semibold mb-6">Connexion</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Email</label>
          <input id="login-email" type="email" placeholder="votre@email.com"
            onkeydown="if(event.key==='Enter')doLogin()"
            class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none" style="border-color:#12185A" onfocus="this.style.borderColor='#C03020'" onblur="this.style.borderColor='#12185A'">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Mot de passe</label>
          <input id="login-password" type="password" placeholder="••••••••"
            onkeydown="if(event.key==='Enter')doLogin()"
            class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none" style="border-color:#12185A" onfocus="this.style.borderColor='#C03020'" onblur="this.style.borderColor='#12185A'">
        </div>
        <div id="login-error" class="hidden text-red-400 text-sm bg-red-900/20 rounded-lg p-3"></div>
        <button type="button" onclick="doLogin()" class="w-full font-bold py-3 rounded-xl transition btn-rouge">
          Se connecter
        </button>
      </div>
      <div class="mt-4 text-center">
        <button type="button" onclick="showRegister()" class="text-sm hover:underline" style="color:#E05040">Pas encore membre ? S'inscrire</button>
      </div>
      <div class="mt-2 text-center">
        <a href="/admin" class="text-gray-500 text-xs hover:text-gray-300">Espace administrateur →</a>
      </div>
    </div>

    <!-- REGISTER M1/M2/M3 -->
    <div id="register-form" class="hidden bg-dark-800 rounded-2xl p-8 shadow-2xl border border-dark-600">
      <!-- Bandeau sponsor (M2/M3) -->
      <div id="sponsor-banner" class="hidden mb-4 rounded-xl px-4 py-3 text-sm flex items-center gap-2" style="background:rgba(192,48,32,0.1);border:1px solid rgba(192,48,32,0.3);color:#C03020">
        <i class="fas fa-user-check"></i>
        <span id="sponsor-banner-text"></span>
      </div>
      <!-- Bandeau erreur slot (M2) -->
      <div id="slot-error-banner" class="hidden mb-4 bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">
        <i class="fas fa-exclamation-triangle mr-2"></i>
        <span id="slot-error-text"></span>
      </div>
      <h2 class="text-xl font-semibold mb-4" id="reg-title">Créer un compte</h2>

      <!-- Indicateur de progression multi-étapes (géré par member-app.js via regMsRender) -->
      <div id="reg-ms-progress" class="hidden mb-4" style="display:none">
        <div style="display:flex;align-items:center;margin-bottom:0.75rem">
          <div style="flex:1;text-align:center">
            <div id="reg-ms-c1" style="width:2rem;height:2rem;border-radius:50%;border:2px solid #C03020;background:rgba(192,48,32,0.15);display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:#C03020">1</div>
            <div id="reg-ms-l1" style="font-size:0.65rem;color:#C03020;margin-top:2px">Identité</div>
          </div>
          <div id="reg-ms-line1" style="flex:1;height:2px;background:#22223A;margin-bottom:1rem"></div>
          <div style="flex:1;text-align:center">
            <div id="reg-ms-c2" style="width:2rem;height:2rem;border-radius:50%;border:2px solid #22223A;background:#1A1A26;display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:#6B7280">2</div>
            <div id="reg-ms-l2" style="font-size:0.65rem;color:#6B7280;margin-top:2px">Coordonnées</div>
          </div>
          <div id="reg-ms-line2" style="flex:1;height:2px;background:#22223A;margin-bottom:1rem"></div>
          <div style="flex:1;text-align:center">
            <div id="reg-ms-c3" style="width:2rem;height:2rem;border-radius:50%;border:2px solid #22223A;background:#1A1A26;display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:#6B7280">3</div>
            <div id="reg-ms-l3" style="font-size:0.65rem;color:#6B7280;margin-top:2px">Sécurité</div>
          </div>
        </div>
      </div>

      <!-- SECTION 1 : Identité -->
      <div id="reg-s1" class="reg-ms-section">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Prénom <span class="text-red-400">*</span></label>
            <input id="reg-firstname" type="text" placeholder="Prénom" autocomplete="given-name"
              class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none" style="border-color:#12185A" onfocus="this.style.borderColor='#C03020'" onblur="this.style.borderColor='#12185A'">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Nom <span class="text-red-400">*</span></label>
            <input id="reg-lastname" type="text" placeholder="Nom" autocomplete="family-name"
              class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none" style="border-color:#12185A" onfocus="this.style.borderColor='#C03020'" onblur="this.style.borderColor='#12185A'">
          </div>
        </div>
        <div class="mt-4">
          <label class="block text-sm text-gray-400 mb-1">Email <span class="text-red-400">*</span></label>
          <input id="reg-email" type="email" placeholder="votre@email.com" autocomplete="email"
            class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none" style="border-color:#12185A" onfocus="this.style.borderColor='#C03020'" onblur="this.style.borderColor='#12185A'">
        </div>
        <div class="mt-4" id="reg-birthdate-wrap">
          <label class="block text-sm text-gray-400 mb-1">Date de naissance <span id="reg-birthdate-req" class="text-red-400 hidden">*</span></label>
          <input id="reg-birthdate" type="date" autocomplete="bday"
            class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none" style="border-color:#12185A" onfocus="this.style.borderColor='#C03020'" onblur="this.style.borderColor='#12185A'">
        </div>
        <div class="mt-4" id="reg-nationality-wrap">
          <label class="block text-sm text-gray-400 mb-1">Nationalité <span id="reg-nationality-req" class="text-red-400 hidden">*</span></label>
          <input id="reg-nationality" type="text" placeholder="Française"
            class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none" style="border-color:#12185A" onfocus="this.style.borderColor='#C03020'" onblur="this.style.borderColor='#12185A'">
        </div>
      </div>

      <!-- SECTION 2 : Coordonnées -->
      <div id="reg-s2" class="reg-ms-section" style="display:none">
        <div class="mt-0" id="reg-country-wrap">
          <label class="block text-sm text-gray-400 mb-1">Pays de résidence + Indicatif tél. <span id="reg-country-req" class="text-red-400 hidden">*</span></label>
          <!-- Wrapper CountrySelector — remplit automatiquement reg-country et reg-phone-dial -->
          <div id="cs-reg-wrap"></div>
          <input id="reg-country" type="hidden" value="">
          <input id="reg-phone-dial" type="hidden" value="">
        </div>
        <div class="mt-4" id="reg-phone-wrap">
          <label class="block text-sm text-gray-400 mb-1">Numéro de téléphone <span id="reg-phone-req" class="text-red-400 hidden">*</span></label>
          <div class="flex gap-2 items-center">
            <span id="reg-dial-display" style="background:#1a1a2e;border:1px solid #374151;border-radius:0.75rem;padding:0.75rem 0.6rem;color:#C03020;font-weight:600;font-size:0.85rem;white-space:nowrap;flex-shrink:0">+33</span>
            <input id="reg-phone" type="tel" placeholder="6 00 00 00 00" autocomplete="tel"
              class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none" style="border-color:#12185A" onfocus="this.style.borderColor='#C03020'" onblur="this.style.borderColor='#12185A'">
          </div>
        </div>
        <div class="mt-4" id="reg-address-wrap">
          <label class="block text-sm text-gray-400 mb-1">Adresse <span id="reg-address-req" class="text-red-400 hidden">*</span></label>
          <input id="reg-address" type="text" placeholder="Numéro et nom de rue" autocomplete="street-address"
            class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none" style="border-color:#12185A" onfocus="this.style.borderColor='#C03020'" onblur="this.style.borderColor='#12185A'">
        </div>
        <div class="mt-4 grid grid-cols-2 gap-4">
          <div id="reg-postal-wrap">
            <label class="block text-sm text-gray-400 mb-1">Code postal <span id="reg-postal-req" class="text-red-400 hidden">*</span></label>
            <input id="reg-postal" type="text" placeholder="75001" autocomplete="postal-code"
              class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none" style="border-color:#12185A" onfocus="this.style.borderColor='#C03020'" onblur="this.style.borderColor='#12185A'">
          </div>
          <div id="reg-city-wrap">
            <label class="block text-sm text-gray-400 mb-1">Ville <span id="reg-city-req" class="text-red-400 hidden">*</span></label>
            <input id="reg-city" type="text" placeholder="Paris" autocomplete="address-level2"
              class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none" style="border-color:#12185A" onfocus="this.style.borderColor='#C03020'" onblur="this.style.borderColor='#12185A'">
          </div>
        </div>
      </div>

      <!-- SECTION 3 : Sécurité -->
      <div id="reg-s3" class="reg-ms-section" style="display:none">
        <div class="mt-0">
          <label class="block text-sm text-gray-400 mb-1">Mot de passe <span class="text-red-400">*</span></label>
          <input id="reg-password" type="password" placeholder="Min. 8 caractères" autocomplete="new-password"
            class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none" style="border-color:#12185A" onfocus="this.style.borderColor='#C03020'" onblur="this.style.borderColor='#12185A'">
        </div>
        <div class="mt-4">
          <label class="block text-sm text-gray-400 mb-1">Confirmer le mot de passe <span class="text-red-400">*</span></label>
          <input id="reg-password2" type="password" placeholder="Répétez le mot de passe" autocomplete="new-password"
            class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none" style="border-color:#12185A" onfocus="this.style.borderColor='#C03020'" onblur="this.style.borderColor='#12185A'">
        </div>
        <!-- Code parrain — affiché seulement en M1 -->
        <div class="mt-4" id="reg-sponsor-field">
          <label class="block text-sm text-gray-400 mb-1">Code parrain (optionnel)</label>
          <input id="reg-sponsor" type="text" placeholder="LDR000000"
            class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none" style="border-color:#12185A" onfocus="this.style.borderColor='#C03020'" onblur="this.style.borderColor='#12185A'">
        </div>
        <!-- CGU -->
        <div class="mt-4 flex items-start gap-3">
          <input id="reg-cgu" type="checkbox" class="mt-1 rounded">
          <label for="reg-cgu" class="text-sm text-gray-400">J'accepte les <span class="cursor-pointer" style="color:#E05040">conditions générales d'utilisation</span></label>
        </div>
      </div>

      <!-- Champ caché : UUID du nœud de placement (M2) — distinct du sponsor réel -->
      <input id="reg-binary-parent" type="hidden" value="">

      <div id="reg-error" class="hidden mt-4 text-red-400 text-sm bg-red-900/20 rounded-lg p-3"></div>

      <!-- Navigation multi-étapes / Bouton submit -->
      <div class="mt-6 flex gap-3">
        <button type="button" id="reg-ms-prev" onclick="regMsGo(window._regMsStep-1)"
          class="hidden flex-1 font-bold py-3 rounded-xl transition btn-outline-rouge">
          <i class="fas fa-arrow-left mr-1"></i> Précédent
        </button>
        <button type="button" id="reg-ms-next" onclick="regMsGo(window._regMsStep+1)"
          class="hidden flex-1 font-bold py-3 rounded-xl transition btn-rouge">
          Suivant <i class="fas fa-arrow-right ml-1"></i>
        </button>
        <button type="button" onclick="doRegister()" id="reg-submit-btn"
          class="flex-1 font-bold py-3 rounded-xl btn-rouge disabled:opacity-50 disabled:cursor-not-allowed">
          <span id="reg-btn-text">Créer mon compte</span>
        </button>
      </div>
      <div class="mt-4 text-center">
        <button type="button" onclick="showLogin()" class="text-sm hover:underline" style="color:#E05040">Déjà membre ? Se connecter</button>
      </div>
    </div>

    <!-- PAGE CONFIRMATION PIN — affichée UNE SEULE FOIS après inscription -->
    <div id="pin-confirmation" class="hidden bg-dark-800 rounded-2xl p-8 shadow-2xl" style="border:1px solid rgba(192,48,32,0.4)">
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style="background:linear-gradient(135deg,#C03020,#8A1E10)">
          <i class="fas fa-shield-halved text-dark-900 text-2xl"></i>
        </div>
        <h2 class="text-2xl font-bold text-white">Compte créé !</h2>
        <p class="text-gray-400 mt-1">Conservez précieusement vos informations</p>
      </div>
      <div id="pin-confirm-content"></div>
      <button type="button" onclick="pinConfirmOk()" class="w-full mt-6 font-bold py-3 rounded-xl btn-rouge">
        <i class="fas fa-check mr-2"></i>J'ai noté mon PIN — Accéder à mon espace
      </button>
    </div>
  </div>
</div>

<!-- MAIN APP -->
<!-- OVERLAY MOBILE MEMBRE -->
<div id="sidebar-overlay" onclick="closeSidebar()" class="hidden fixed inset-0 bg-black/60 z-40 md:hidden"></div>

<div id="app" class="hidden flex h-screen overflow-hidden">

  <!-- SIDEBAR MEMBRE — drawer mobile, fixe desktop -->
  <aside id="sidebar" class="
    fixed inset-y-0 left-0 z-50
    -translate-x-full
    md:relative md:translate-x-0 md:flex
    w-72 md:w-64
    bg-dark-800 border-r border-dark-600
    flex flex-col flex-shrink-0
    transition-transform duration-300
  ">
    <!-- Logo + bouton fermeture mobile -->
    <div class="p-4 border-b border-dark-600 flex items-center justify-between" style="min-height:72px;">
      <div class="flex items-center justify-center flex-1">
        ${logoImgMember}
        ${!branding.logoUri ? `<div class="ml-3"><div class="font-bold text-white">${networkName}</div><div class="text-xs" style="color:#E05040">Network</div></div>` : ''}
      </div>
      <button onclick="closeSidebar()" class="md:hidden text-gray-400 hover:text-white p-1 ml-2 flex-shrink-0" aria-label="Fermer le menu">
        <i class="fas fa-times text-lg"></i>
      </button>
    </div>

    <!-- Member Info -->
    <div id="sidebar-member-info" class="p-4 border-b border-dark-600">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" id="sidebar-avatar" style="background:linear-gradient(135deg,#C03020,#8A1E10)">JD</div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm truncate" id="sidebar-name">Jean Dupont</div>
          <div class="text-xs" id="sidebar-uid" style="color:#E05040">LDR000001</div>
        </div>
      </div>
      <div class="mt-3 flex items-center justify-between">
        <span class="text-xs text-gray-400" data-i18n="Statut">Statut</span>
        <span id="sidebar-status" class="text-xs px-2 py-0.5 rounded-full font-medium" style="background:rgba(192,48,32,0.2);color:#E05040">AMI</span>
      </div>
      <div class="mt-1 flex items-center justify-between">
        <span class="text-xs text-gray-400" data-i18n="Rang">Rang</span>
        <span id="sidebar-rank" class="text-xs text-white font-medium">Captain</span>
      </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto p-3 space-y-1">
      <button onclick="showPage('dashboard');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="dashboard">
        <i class="fas fa-home w-5 text-center"></i> <span data-i18n="Dashboard">Dashboard</span>
      </button>
      <button onclick="showPage('team');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="team">
        <i class="fas fa-users w-5 text-center"></i> <span data-i18n="Mon Équipe">Mon Équipe</span>
      </button>
      <button onclick="showPage('tree');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="tree">
        <i class="fas fa-sitemap w-5 text-center"></i> <span data-i18n="Arbre Binaire">Arbre Binaire</span>
      </button>
      <button onclick="showPage('bv');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="bv">
        <i class="fas fa-chart-line w-5 text-center"></i> <span data-i18n="Journal BV">Journal BV</span>
      </button>
      <button onclick="showPage('commissions');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="commissions">
        <i class="fas fa-dollar-sign w-5 text-center"></i> <span data-i18n="Commissions">Commissions</span>
      </button>
      <button onclick="showPage('wallet');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="wallet">
        <i class="fas fa-wallet w-5 text-center"></i> <span data-i18n="Portefeuille">Portefeuille</span>
      </button>
      <button onclick="showPage('withdraw');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="withdraw">
        <i class="fas fa-arrow-up-right-from-square w-5 text-center"></i> <span data-i18n="Retrait">Retrait</span>
      </button>
      <button onclick="showPage('transactions');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="transactions">
        <i class="fas fa-list w-5 text-center"></i> <span data-i18n="Transactions">Transactions</span>
      </button>
      <div class="px-4 pt-4 pb-1 text-xs text-gray-500 uppercase tracking-wider" data-i18n="Mon Compte">Mon Compte</div>
      <button onclick="showPage('packages');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="packages">
        <i class="fas fa-box w-5 text-center"></i> <span data-i18n="Packages">Packages</span>
      </button>
      <button onclick="showPage('license');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="license">
        <i class="fas fa-id-card w-5 text-center"></i> <span data-i18n="Ma Licence">Ma Licence</span>
      </button>
      <button onclick="showPage('kyc');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="kyc">
        <i class="fas fa-shield-halved w-5 text-center"></i> <span data-i18n="Mon KYC">Mon KYC</span>
      </button>
      <button onclick="showPage('reservoir');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="reservoir">
        <i class="fas fa-users-gear w-5 text-center"></i> <span data-i18n="Réservoir">Réservoir</span>
        <span id="reservoir-badge" class="hidden ml-auto bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">0</span>
      </button>
      <button onclick="showPage('services');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="services">
        <i class="fas fa-th-large w-5 text-center" style="color:#C03020"></i>
        <span data-i18n="Services">Services</span>
      </button>
      <button onclick="showPage('campus');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="campus">
        <i class="fas fa-graduation-cap w-5 text-center" style="color:#e05c4a"></i>
        <span class="flex-1">Campus</span>
        <span class="text-[9px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded font-semibold border border-red-900/40">NOUVEAU</span>
      </button>

      <button onclick="showPage('marketing');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="marketing">
        <i class="fas fa-bullhorn w-5 text-center"></i> <span data-i18n="Marketing">Marketing</span>
      </button>
      <button onclick="showPage('earnings');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="earnings">
        <i class="fas fa-file-invoice-dollar w-5 text-center text-emerald-400"></i>
        <span class="flex-1" data-i18n="Earnings &amp; Docs">Earnings &amp; Docs</span>
        <span class="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold">NEW</span>
      </button>
      <button onclick="showPage('notifications');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="notifications">
        <i class="fas fa-bell w-5 text-center"></i> <span data-i18n="Notifications">Notifications</span>
        <span id="notif-badge" class="hidden ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">0</span>
      </button>
      <button onclick="showPage('support');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="support">
        <i class="fas fa-headset w-5 text-center"></i> <span data-i18n="Support">Support</span>
        <span id="support-badge" class="hidden ml-auto bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">0</span>
      </button>
      <button onclick="showPage('profile');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="profile">
        <i class="fas fa-user w-5 text-center"></i> <span data-i18n="Mon Profil">Mon Profil</span>
      </button>
      <button onclick="showPage('member-card');closeSidebar()" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="member-card">
        <i class="fas fa-id-badge w-5 text-center" style="color:#E05040"></i> <span data-i18n="Carte de Membre">Carte de Membre</span>
      </button>
    </nav>

    <!-- Logout -->
    <div class="p-4 border-t border-dark-600">
      <button onclick="doLogout()" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition text-sm">
        <i class="fas fa-sign-out-alt w-5 text-center"></i> <span data-i18n="Déconnexion">Déconnexion</span>
      </button>
    </div>
  </aside>

  <!-- MAIN CONTENT -->
  <main class="flex-1 overflow-y-auto bg-dark-900">
    <!-- Top Bar -->
    <header class="bg-dark-800 border-b border-dark-600 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <button onclick="toggleSidebar()" class="text-gray-400 hover:text-white p-1" aria-label="Menu">
        <i class="fas fa-bars text-xl"></i>
      </button>
      <div class="flex items-center gap-4">
        <div id="header-balance" class="text-sm">
          <span class="text-gray-400" data-i18n="Solde :">Solde : </span>
          <span class="font-bold" style="color:#C03020">$0.00</span>
        </div>
        <!-- Bouton Rafraîchir — recharge la page courante sans déconnecter -->
        <button onclick="refreshCurrentPage()" id="header-refresh-btn"
          title="Rafraîchir la page"
          class="relative text-gray-400 hover:text-white transition-colors duration-200 group">
          <i class="fas fa-rotate-right text-lg group-hover:rotate-180 transition-transform duration-500"></i>
        </button>
        <button onclick="showPage('notifications')" class="relative text-gray-400 hover:text-white">
          <i class="fas fa-bell text-lg"></i>
          <span id="header-notif-badge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">0</span>
        </button>
      </div>
    </header>

    <!-- Page Content -->
    <div id="page-content" class="p-4 md:p-6" style="overflow-x:auto;min-width:0;"></div>
  </main>
</div>

<!-- TOAST -->
<div id="toast" class="fixed bottom-4 right-4 z-50 hidden">
  <div id="toast-inner" class="px-6 py-3 rounded-xl shadow-lg text-sm font-medium"></div>
</div>

<!-- MODAL MEMBRE -->
<div id="member-modal-overlay" class="hidden fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
  <div id="member-modal-content" class="bg-dark-800 rounded-2xl shadow-2xl border border-dark-600 w-full max-w-2xl max-h-[92vh] overflow-y-auto relative"></div>
</div>

<script src="/static/upload-zone.js"></script>

<!-- Script multi-étapes formulaire d'inscription app membre -->
<script>
// ── Navigation multi-étapes formulaire app membre (reg-*) ─────────────
window._regMsStep   = 1
window._regMsMode   = 'simple'
window._regMsFields = []

function regMsRender() {
  var mode = window._regMsMode
  var step = window._regMsStep
  var g = function(id) { return document.getElementById(id) }

  var prog = g('reg-ms-progress')
  if (prog) prog.style.display = mode === 'multistep' ? 'block' : 'none'

  if (mode === 'simple') {
    ;['reg-s1','reg-s2','reg-s3'].forEach(function(id) {
      var el = g(id); if (el) el.style.display = 'block'
    })
    if (g('reg-ms-prev')) g('reg-ms-prev').classList.add('hidden')
    if (g('reg-ms-next')) g('reg-ms-next').classList.add('hidden')
    if (g('reg-submit-btn')) g('reg-submit-btn').style.display = ''
    // En mode simple toutes les sections sont visibles → init CountrySelector
    _initRegCountrySelector()
  } else {
    ;['reg-s1','reg-s2','reg-s3'].forEach(function(id, i) {
      var el = g(id); if (el) el.style.display = (i+1 === step ? 'block' : 'none')
    })
    // En mode multistep, init CountrySelector dès que step 2 devient visible
    if (step === 2) _initRegCountrySelector()
    if (g('reg-ms-prev')) g('reg-ms-prev').classList.toggle('hidden', step === 1)
    if (g('reg-ms-next')) g('reg-ms-next').classList.toggle('hidden', step === 3)
    if (g('reg-submit-btn')) g('reg-submit-btn').style.display = step === 3 ? '' : 'none'
    var GOLD='#C03020', GREEN='#10B981', GRAY='#6B7280', DARK='#0A1240', BORDER_D='#12185A'
    for (var i=1; i<=3; i++) {
      var c=g('reg-ms-c'+i), l=g('reg-ms-l'+i), ln=g('reg-ms-line'+i)
      if (!c) continue
      if (i < step) {
        c.style.cssText = 'width:2rem;height:2rem;border-radius:50%;border:2px solid '+GREEN+';background:'+GREEN+';display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:#fff'
        c.innerHTML = '<i class="fas fa-check" style="font-size:0.6rem"></i>'
        if (l) l.style.color = GREEN
        if (ln) ln.style.background = GREEN
      } else if (i === step) {
        c.style.cssText = 'width:2rem;height:2rem;border-radius:50%;border:2px solid '+GOLD+';background:'+GOLD+'20;display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:'+GOLD
        c.textContent = String(i)
        if (l) l.style.color = GOLD
      } else {
        c.style.cssText = 'width:2rem;height:2rem;border-radius:50%;border:2px solid '+BORDER_D+';background:'+DARK+';display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:'+GRAY
        c.textContent = String(i)
        if (l) l.style.color = GRAY
        if (ln) ln.style.background = BORDER_D
      }
    }
  }
}

function regMsValidate(step) {
  var v = function(id) { return (document.getElementById(id) ? document.getElementById(id).value : '').trim() }
  var err = document.getElementById('reg-error')
  var show = function(msg) { if(err){err.textContent=msg;err.classList.remove('hidden')} }
  if (err) err.classList.add('hidden')
  if (step === 1) {
    if (!v('reg-firstname')||!v('reg-lastname')) { show('Veuillez renseigner votre prénom et votre nom.'); return false }
    if (!v('reg-email')||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('reg-email'))) { show('Adresse email invalide.'); return false }
    var flds1 = window._regMsFields
    if (flds1.indexOf('birth_date')>=0 && !v('reg-birthdate')) { show('Le champ \u00ab Date de naissance \u00bb est obligatoire.'); return false }
    if (flds1.indexOf('nationality')>=0 && !v('reg-nationality')) { show('Le champ \u00ab Nationalité \u00bb est obligatoire.'); return false }
  }
  if (step === 2) {
    var flds2 = window._regMsFields
    if (flds2.indexOf('phone')>=0 && !v('reg-phone')) { show('Le champ \u00ab Téléphone \u00bb est obligatoire.'); return false }
    if (flds2.indexOf('country')>=0 && !v('reg-country')) { show('Le champ \u00ab Pays de résidence \u00bb est obligatoire.'); return false }
    if (flds2.indexOf('address')>=0 && !v('reg-address')) { show('Le champ \u00ab Adresse \u00bb est obligatoire.'); return false }
    if (flds2.indexOf('postal_code')>=0 && !v('reg-postal')) { show('Le champ \u00ab Code postal \u00bb est obligatoire.'); return false }
    if (flds2.indexOf('city')>=0 && !v('reg-city')) { show('Le champ \u00ab Ville \u00bb est obligatoire.'); return false }
  }
  return true
}

function regMsGo(targetStep) {
  if (window._regMsMode !== 'multistep') return
  if (targetStep > window._regMsStep && !regMsValidate(window._regMsStep)) return
  window._regMsStep = Math.max(1, Math.min(3, targetStep))
  regMsRender()
  var el = document.getElementById('register-form')
  if (el) el.scrollIntoView({ behavior:'smooth', block:'start' })
}

function regMsApplyReq(fields) {
  var map = {phone:'reg-phone-req',country:'reg-country-req',birth_date:'reg-birthdate-req',nationality:'reg-nationality-req',address:'reg-address-req',postal_code:'reg-postal-req',city:'reg-city-req'}
  for (var fk in map) {
    var el=document.getElementById(map[fk])
    if(el) el.classList.toggle('hidden', fields.indexOf(fk)<0)
  }
}

// ── Initialise le CountrySelector pour le formulaire app membre ──
var _regCsInited = false
function _initRegCountrySelector() {
  if (_regCsInited) return
  if (!window.CountrySelector) return
  var wrap = document.getElementById('cs-reg-wrap')
  if (!wrap) return
  _regCsInited = true
  window.CountrySelector.init({
    wrapperId:      'cs-reg-wrap',
    countryInputId: 'reg-country',
    dialInputId:    'reg-phone-dial',
    placeholder:    'Sélectionner un pays',
    defaultCode:    'FR',
    onSelect: function(c) {
      var badge = document.getElementById('reg-dial-display')
      if (badge) badge.textContent = c.dial
    }
  })
}

async function regMsInit() {
  try {
    var res = await axios.get('/api/auth/reg-required-fields')
    var data = res.data || {}
    window._regMsFields = Array.isArray(data.fields) ? data.fields : []
    window._regMsMode   = data.form_type === 'multistep' ? 'multistep' : 'simple'
  } catch(e) {
    window._regMsFields = []
    window._regMsMode   = 'simple'
  }
  regMsApplyReq(window._regMsFields)
  window._regMsStep = 1
  regMsRender()
}

document.addEventListener('DOMContentLoaded', function() { regMsInit() })
</script>

<script src="/static/member-app.js"></script>
<script src="/static/campus-app.js"></script>
<script src="/static/i18n.js"></script>
</body>
</html>`
}

// ============================================================
// HTML — Backoffice Membre UNIQUEMENT (pour impersonation admin)
// Chargé sur /member-view?impersonate=TOKEN
// Réutilise memberHTML() en injectant le token d'impersonation
// AVANT le chargement de member-app.js via window.__IMPERSONATE_TOKEN__
// ============================================================
function memberOnlyHTML(): string {
  // On génère le HTML membre complet, puis on y insère le script d'init
  // d'impersonation juste avant le chargement de member-app.js
  const base = memberHTML()
  const injectedScript = `
  <script>
    // ── IMPERSONATION MODE ────────────────────────────────────
    // Injecté par /member-view : place le token dans window.__IMPERSONATE_TOKEN__
    // AVANT que member-app.js lise localStorage
    ;(function() {
      const params = new URLSearchParams(window.location.search)
      const t = params.get('impersonate')
      if (t) {
        window.__IMPERSONATE_TOKEN__ = t
      }
    })()
  <\/script>`
  // Insérer le script AVANT la balise <script src="/static/member-app.js
  return base.replace(
    `<script src="/static/member-app.js`,
    injectedScript + '\n<script src="/static/member-app.js'
  )
}

// ============================================================
// HTML — Interface Admin
// ============================================================
function adminHTML(branding: BrandingPublic = { logoUri: '', networkName: 'LEADER' }): string {
  const logoImgAdmin = branding.logoUri
    ? `<img src="${branding.logoUri}" alt="${branding.networkName}" style="max-height:40px;max-width:140px;object-fit:contain;" class="block">`
    : `<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center"><i class="fas fa-shield-halved text-white text-lg"></i></div>`
  const logoImgAdminLg = branding.logoUri
    ? `<img src="${branding.logoUri}" alt="${branding.networkName}" style="max-height:56px;max-width:180px;object-fit:contain;" class="block mx-auto">`
    : `<div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 mb-4 shadow-lg"><i class="fas fa-shield-halved text-white text-2xl"></i></div>`
  const networkName = branding.networkName || 'LEADER'
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LEADER — Administration</title>
  <link rel="stylesheet" href="/static/tailwind.compiled.css">
  <script src="/static/axios.min.js"></script>
  <script src="/static/chart.min.js"></script>
  <link rel="stylesheet" href="/static/style.css">
  <link rel="stylesheet" href="/static/campus.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
</head>
<body class="bg-dark-900 text-white min-h-screen">

<!-- ADMIN AUTH -->
<div id="admin-auth-screen" class="min-h-screen flex items-center justify-center bg-dark-900 p-4">
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <div class="mb-4 flex items-center justify-center">
        ${logoImgAdminLg}
      </div>
      <h1 class="text-3xl font-bold text-white">Administration</h1>
      <p class="text-gray-400 mt-1">${networkName} — Accès restreint</p>
    </div>
    <div class="bg-dark-800 rounded-2xl p-8 shadow-2xl border border-dark-600">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Email administrateur</label>
          <input id="admin-email" type="email" placeholder="admin@leader-network.com"
            class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Mot de passe</label>
          <input id="admin-password" type="password" placeholder="••••••••"
            class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none">
        </div>
        <div id="admin-login-error" class="hidden text-red-400 text-sm bg-red-900/20 rounded-lg p-3"></div>
        <button onclick="doAdminLogin()" class="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3 rounded-xl hover:from-red-500 hover:to-red-600 transition">
          Accéder au panneau admin
        </button>
      </div>
      <div class="mt-4 text-center">
        <a href="/" class="text-gray-500 text-xs hover:text-gray-300">← Espace membre</a>
      </div>
    </div>
  </div>
</div>

<!-- ADMIN APP -->
<!-- OVERLAY MOBILE ADMIN -->
<div id="admin-sidebar-overlay" onclick="closeAdminSidebar()" class="hidden fixed inset-0 bg-black/60 z-40 md:hidden"></div>

<div id="admin-app" class="hidden flex h-screen overflow-hidden">
  <!-- SIDEBAR ADMIN — drawer mobile, fixe desktop -->
  <aside id="admin-sidebar" class="
    fixed inset-y-0 left-0 z-50
    -translate-x-full
    md:relative md:translate-x-0 md:flex
    w-72 md:w-64
    bg-dark-800 border-r border-dark-600
    flex flex-col flex-shrink-0
    transition-transform duration-300
  ">
    <div class="p-4 border-b border-dark-600 flex items-center justify-between" style="min-height:72px;">
      <div class="flex items-center justify-center flex-1">
        ${logoImgAdmin}
        ${!branding.logoUri ? `<div class="ml-3"><div class="font-bold text-white">${networkName}</div><div class="text-xs text-red-400">Administration</div></div>` : ''}
      </div>
      <button onclick="closeAdminSidebar()" class="md:hidden text-gray-400 hover:text-white p-1 ml-2 flex-shrink-0" aria-label="Fermer le menu">
        <i class="fas fa-times text-lg"></i>
      </button>
    </div>
    <nav class="flex-1 overflow-y-auto p-3 space-y-1">
      <button onclick="showAdminPage('dashboard');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="dashboard">
        <i class="fas fa-chart-pie w-5 text-center"></i> Dashboard
      </button>
      <button onclick="showAdminPage('members');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="members">
        <i class="fas fa-users w-5 text-center"></i> Membres
      </button>
      <button onclick="showAdminPage('binary-tree');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="binary-tree">
        <i class="fas fa-sitemap w-5 text-center"></i> Arbre Binaire
      </button>
      <button onclick="showAdminPage('holding-tank');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="holding-tank">
        <i class="fas fa-clock w-5 text-center"></i> Holding Tank
        <span id="admin-ht-badge" class="hidden ml-auto bg-orange-500 text-white text-xs rounded-full px-2 py-0.5">0</span>
      </button>
      <button onclick="showAdminPage('activations');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="activations">
        <i class="fas fa-check-circle w-5 text-center"></i> Activations
        <span id="admin-act-badge" class="hidden ml-auto bg-green-500 text-white text-xs rounded-full px-2 py-0.5">0</span>
      </button>
      <button onclick="showAdminPage('withdrawals');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="withdrawals">
        <i class="fas fa-money-bill-transfer w-5 text-center"></i> Retraits
        <span id="admin-wd-badge" class="hidden ml-auto bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">0</span>
      </button>
      <button onclick="showAdminPage('kyc');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="kyc">
        <i class="fas fa-id-card w-5 text-center"></i> KYC
        <span id="admin-kyc-badge" class="hidden ml-auto bg-purple-500 text-white text-xs rounded-full px-2 py-0.5">0</span>
      </button>
      <button onclick="showAdminPage('commissions');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="commissions">
        <i class="fas fa-dollar-sign w-5 text-center"></i> Commissions
      </button>
      <button onclick="showAdminPage('wallets');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="wallets">
        <i class="fas fa-wallet w-5 text-center"></i> Wallets
      </button>
      <button onclick="showAdminPage('bv');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="bv">
        <i class="fas fa-chart-bar w-5 text-center"></i> Volumes BV
      </button>
      <button onclick="showAdminPage('config');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="config">
        <i class="fas fa-gear w-5 text-center"></i> Config MLM
      </button>
      <button onclick="showAdminPage('packages');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="packages">
        <i class="fas fa-box-open w-5 text-center"></i> Packages
      </button>
      <button onclick="showAdminPage('package-service-access');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="package-service-access">
        <i class="fas fa-th-large w-5 text-center"></i> Accès Services
      </button>
      <button onclick="showAdminPage('campus');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="campus">
        <i class="fas fa-graduation-cap w-5 text-center" style="color:#e05c4a"></i>
        <span class="flex-1">Campus</span>
        <span class="text-[9px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded font-semibold border border-red-900/40">NEW</span>
      </button>
      <button onclick="showAdminPage('payment-gateway');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="payment-gateway">
        <i class="fas fa-credit-card w-5 text-center"></i> Paiement
      </button>
      <button onclick="showAdminPage('topups');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="topups">
        <i class="fas fa-arrow-down-to-line w-5 text-center"></i> Recharges Wallet
      </button>
      <button onclick="showAdminPage('support');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="support">
        <i class="fas fa-headset w-5 text-center"></i> Support
        <span id="admin-support-badge" class="hidden ml-auto bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">0</span>
      </button>
      <button onclick="showAdminPage('emails');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="emails">
        <i class="fas fa-envelope w-5 text-center text-purple-400"></i> Emails
      </button>
      <button onclick="showAdminPage('member-cards');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="member-cards">
        <i class="fas fa-id-badge w-5 text-center" style="color:#E05040"></i> Cartes de Membre
      </button>
      <button onclick="showAdminPage('broker');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="broker">
        <i class="fas fa-building-columns w-5 text-center text-orange-400"></i> Broker Triomarkets
      </button>
      <button onclick="showAdminPage('subscriptions');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="subscriptions">
        <i class="fas fa-rotate w-5 text-center text-emerald-400"></i> Abonnements Mensuels
      </button>
      <button onclick="showAdminPage('landing');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="landing">
        <i class="fas fa-rocket w-5 text-center" style="color:#E05040"></i> Landing Page
      </button>
      <button onclick="showAdminPage('i18n-languages');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="i18n-languages">
        <i class="fas fa-language w-5 text-center text-sky-400"></i> Langues & Traductions
      </button>
      <button onclick="showAdminPage('administration');closeAdminSidebar()" class="admin-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-dark-700 hover:text-white transition text-sm" data-page="administration">
        <i class="fas fa-shield-halved w-5 text-center"></i> Administration
      </button>
    </nav>
    <div class="p-4 border-t border-dark-600">
      <button onclick="doAdminLogout()" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition text-sm">
        <i class="fas fa-sign-out-alt w-5 text-center"></i> Déconnexion
      </button>
    </div>
  </aside>

  <!-- ADMIN CONTENT -->
  <main class="flex-1 overflow-y-auto overflow-x-hidden bg-dark-900" style="min-width:0;">
    <header class="bg-dark-800 border-b border-dark-600 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div class="flex items-center gap-3">
        <button onclick="toggleAdminSidebar()" class="text-gray-400 hover:text-white p-1" aria-label="Menu">
          <i class="fas fa-bars text-xl"></i>
        </button>
        <h1 id="admin-page-title" class="text-base md:text-lg font-semibold">Dashboard</h1>
      </div>
      <div class="flex items-center gap-3">
        <div id="admin-header-info" class="hidden md:block text-sm text-gray-400"></div>
        <button id="admin-header-refresh"
          title="Rafraîchir la page (rechargement complet)"
          class="group flex items-center justify-center w-9 h-9 rounded-xl bg-dark-700 border border-dark-500 hover:bg-dark-600" style="--hover-border:rgba(192,48,32,0.6) transition-all duration-200"
          onclick="window.location.reload()">
          <i class="fas fa-rotate-right text-gray-400 group-hover:text-rouge-400 text-sm group-hover:rotate-180 transition-all duration-500"></i>
        </button>
      </div>
    </header>
    <div id="admin-page-content" class="p-4 md:p-6" style="overflow-x:auto;min-width:0;"></div>
  </main>
</div>

<!-- TOAST -->
<div id="toast" class="fixed bottom-4 right-4 z-50 hidden">
  <div id="toast-inner" class="px-6 py-3 rounded-xl shadow-lg text-sm font-medium"></div>
</div>

<!-- MODAL -->
<div id="modal-overlay" class="hidden fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
  <div id="modal-content" class="bg-dark-800 rounded-2xl shadow-2xl border border-dark-600 w-full max-w-lg max-h-[90vh] overflow-y-auto"></div>
</div>

<script src="/static/upload-zone.js"></script>
<script src="/static/campus-app.js"></script>
<script src="/static/admin-app.js"></script>
<script src="/static/admin-landing.js"></script>
</body>
</html>`
}

// ============================================================
// CRON — Scheduled handler (Cloudflare Workers Scheduled Events)
// Déclenché automatiquement selon les triggers configurés
//
// Schedule recommandé (à configurer dans le dashboard Cloudflare) :
//   "0 * * * *"    → Toutes les heures   (orchestrateur BV + rangs + paiements)
//   "0 2 1 * *"    → Le 1er à 02h00      (calcul commissions mensuelles)
//   "0 0 * * 4"    → Tous les jeudis 00h (vérification licences expirées)
//
// Note : Cloudflare Pages ne supporte pas les crons natifs.
// Déclencher manuellement via POST /api/admin/orchestrate ou
// migrer vers un Worker standalone avec wrangler.toml "crons".
// ============================================================
import { runLicenseCheckExpired } from './routes/admin.js'

interface ScheduledEnv extends Bindings {}

export const scheduled = {
  async scheduled(
    event: ScheduledEvent,
    env: ScheduledEnv,
    ctx: ExecutionContext
  ): Promise<void> {
    try {
      const cron = event.cron

      if (cron === '0 * * * *' || cron === '*/5 * * * *') {
        // Toutes les heures ou toutes les 5 min : orchestrateur complet
        await orchestrateur(env.DB)
      } else if (cron === '0 0 * * *') {
        // Chaque jour à minuit UTC : vérifications quotidiennes

        // ── Relance CB automatique J+1/J+3/J+5 ──────────────
        await processSubscriptionCBRetries(env.DB).catch((e: any) =>
          console.error('[CRON] processSubscriptionCBRetries:', e?.message)
        )

        // ── Rappels J-3 avant prélèvement abonnement ─────────
        await sendSubscriptionReminderEmails(env.DB).catch((e: any) =>
          console.error('[CRON] sendSubscriptionReminderEmails:', e?.message)
        )

        // ── Vérification licences expirées + alertes ──────────
        await runLicenseCheckExpired(env.DB)

        // ── Alertes package expirant bientôt (J-7) ──────────
        const alertDate = new Date()
        alertDate.setDate(alertDate.getDate() + 7)
        const alertDateStr = alertDate.toISOString().split('T')[0]
        const nowStr = new Date().toISOString()

        const expiringPackages = await env.DB.prepare(
          `SELECT po.id, po.member_id, po.package_expires_at,
                  m.first_name, m.email, p.name as package_name
           FROM package_orders po
           JOIN members m ON m.id = po.member_id
           JOIN packages p ON p.id = po.package_id
           WHERE po.status IN ('validated','active')
             AND po.activation_done = 1
             AND date(po.package_expires_at) BETWEEN date(?) AND date(?)
             AND po.expiry_email_sent IS NULL`
        ).bind(nowStr, alertDateStr + 'T23:59:59Z').all()

        for (const pkg of expiringPackages.results as any[]) {
          const expiresAt = new Date(pkg.package_expires_at)
          const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 86400000)
          await sendEmail(env.DB, {
            to: pkg.email, toName: pkg.first_name,
            templateId: 'package_expiring',
            variables: {
              prenom:         pkg.first_name || '',
              package_nom:    pkg.package_name || '',
              jours_restants: String(daysLeft),
              date_expiration: expiresAt.toLocaleDateString('fr-FR'),
              dashboard_url:  'https://willbeleader.pages.dev',
            }
          }).catch(() => {})
          // Marquer pour ne pas renvoyer le lendemain
          await env.DB.prepare(
            `UPDATE package_orders SET expiry_email_sent = datetime('now') WHERE id = ?`
          ).bind(pkg.id).run()
        }

        // ── Packages expirés aujourd'hui ─────────────────────
        const expiredPackages = await env.DB.prepare(
          `SELECT po.id, po.member_id,
                  m.first_name, m.email, p.name as package_name,
                  po.package_expires_at
           FROM package_orders po
           JOIN members m ON m.id = po.member_id
           JOIN packages p ON p.id = po.package_id
           WHERE po.status IN ('validated','active')
             AND po.activation_done = 1
             AND po.package_expires_at < ?
             AND po.expired_email_sent IS NULL`
        ).bind(nowStr).all()

        for (const pkg of expiredPackages.results as any[]) {
          await sendEmail(env.DB, {
            to: pkg.email, toName: pkg.first_name,
            templateId: 'package_expired',
            variables: {
              prenom:          pkg.first_name || '',
              package_nom:     pkg.package_name || '',
              date_expiration: new Date(pkg.package_expires_at).toLocaleDateString('fr-FR'),
              dashboard_url:   'https://willbeleader.pages.dev',
            }
          }).catch(() => {})
          await env.DB.prepare(
            `UPDATE package_orders SET expired_email_sent = datetime('now') WHERE id = ?`
          ).bind(pkg.id).run()
        }
      }

      // ── Toujours (quel que soit le cron) : déblocage Réserves Stratégiques échues ──
      if (cron === '0 0 * * *' || cron === '0 * * * *') {
        const now = new Date().toISOString()
        const dueRS = await env.DB.prepare(
          `SELECT id, member_id, amount, period
           FROM reserve_strategique
           WHERE status='locked' AND locked_until <= ?`
        ).bind(now).all()

        for (const rs of dueRS.results as any[]) {
          await env.DB.prepare(
            `UPDATE members SET wallet_balance=wallet_balance+?, updated_at=datetime('now') WHERE id=?`
          ).bind(rs.amount, rs.member_id).run()
          await env.DB.prepare(
            `UPDATE wallets SET balance=balance+?, total_earned=total_earned+? WHERE member_id=?`
          ).bind(rs.amount, rs.amount, rs.member_id).run()
          await env.DB.prepare(
            `UPDATE reserve_strategique SET status='unlocked', unlocked_at=datetime('now') WHERE id=?`
          ).bind(rs.id).run()
        }
      }
    } catch (err) {
      console.error('[CRON ERROR]', err)
    }
  }
}

// ============================================================
// ─── i18n API — Cache KV + DeepSeek AI ─────────────────────
// ============================================================

/**
 * Génère un hash djb2 32-bit pour une string.
 * Utilisé comme clé KV : i18n:{lang}:{hash}
 */
function djb2Hash(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i)
  }
  return (h >>> 0).toString(36)
}

/**
 * POST /api/i18n/translate
 * Body : { texts: string[], lang: string }
 * Response : { translations: Record<string, string> }
 *
 * Flux :
 *   1. Pour chaque texte → cherche dans KV (i18n:{lang}:{hash})
 *   2. Les manquants → batch DeepSeek (1 seul appel API)
 *   3. Stocke les nouvelles traductions dans KV (TTL illimité)
 *   4. Retourne le mapping { texte_fr: texte_traduit }
 */
app.post('/api/i18n/translate', async (c) => {
  const env = c.env as any
  const i18nKV: KVNamespace | undefined = env?.I18N_KV
  const deepseekKey: string | undefined = env?.DEEPSEEK_API_KEY

  try {
    const body = await c.req.json()
    const texts: string[] = Array.isArray(body?.texts) ? body.texts : []
    const lang: string = typeof body?.lang === 'string' ? body.lang.toLowerCase() : 'en'

    if (!texts.length || lang === 'fr') {
      return c.json({ translations: {} })
    }

    // Dédupliquer + filtrer les textes vides
    const unique = [...new Set(texts.filter(t => t && t.trim().length > 0))]

    const result: Record<string, string> = {}
    const toTranslate: string[] = []

    // ── Étape 1 : chercher dans KV ──────────────────────────────────────────
    if (i18nKV) {
      await Promise.all(unique.map(async (text) => {
        const key = `i18n:${lang}:${djb2Hash(text)}`
        try {
          const cached = await i18nKV.get(key)
          if (cached !== null) {
            result[text] = cached
          } else {
            toTranslate.push(text)
          }
        } catch {
          toTranslate.push(text)
        }
      }))
    } else {
      toTranslate.push(...unique)
    }

    // ── Étape 2 : appel DeepSeek pour les manquants ─────────────────────────
    if (toTranslate.length > 0 && deepseekKey) {
      // Récupérer le nom complet de la langue depuis la DB
      // Ex: 'rcf' → 'Créole Réunionnais', 'hat' → 'Créole Haïtien'
      // Si absent, fallback sur un dictionnaire statique commun
      const db = (c.env as any)?.DB as D1Database | undefined
      let langName = lang.toUpperCase()
      if (db) {
        try {
          const row = await db.prepare(
            `SELECT name FROM i18n_languages WHERE code = ? LIMIT 1`
          ).bind(lang).first() as any
          if (row?.name) langName = row.name
        } catch { /* ignore */ }
      }
      // Fallback statique pour les codes ISO standards (si DB non dispo)
      if (langName === lang.toUpperCase()) {
        const fallback: Record<string, string> = {
          en: 'English', es: 'Spanish', pt: 'Portuguese', de: 'German',
          hi: 'Hindi', ar: 'Arabic', zh: 'Chinese (Simplified)', ja: 'Japanese',
          ko: 'Korean', it: 'Italian', ru: 'Russian', nl: 'Dutch',
          tr: 'Turkish', pl: 'Polish', vi: 'Vietnamese', th: 'Thai',
          id: 'Indonesian', ms: 'Malay', ro: 'Romanian', uk: 'Ukrainian',
          sw: 'Swahili', tl: 'Filipino', bn: 'Bengali', ur: 'Urdu',
        }
        langName = fallback[lang] || langName
      }

      // Construire le JSON des textes à traduire (index → texte)
      const inputMap: Record<string, string> = {}
      toTranslate.forEach((t, i) => { inputMap[String(i)] = t })
      const inputJson = JSON.stringify(inputMap)

      // Contexte spécial créoles — aide DeepSeek à produire un vrai créole
      const creoleHints: Record<string, string> = {
        rcf:  'Réunion Island French Creole (Kréol Rényoné). Use authentic Réunion Creole vocabulary. Example: "Bonjour"→"Bonzour", "Merci"→"Mersi", "Oui"→"Wi", "Non"→"Non", "Tableau de bord"→"Tablo de bor".',
        mfe:  'Mauritian Creole (Morisyen). Use authentic Mauritian Creole. Example: "Bonjour"→"Bonzour", "Comment allez-vous"→"Ki manyer ou ete?", "Merci"→"Mersi".',
        hat:  'Haitian Creole (Kreyòl ayisyen). Use authentic Haitian Creole. Example: "Bonjour"→"Bonjou", "Merci"→"Mèsi", "Oui"→"Wi", "Dashboard"→"Tablo debò".',
        gcf:  'Guadeloupean Creole (Gwadloup Kréyòl). Use authentic Guadeloupe Antillean Creole. Example: "Bonjour"→"Bonjou", "Comment vas-tu"→"Koman ou yé?".',
        mart: 'Martinique Creole (Kréyòl Matinik). Use authentic Martinique Antillean Creole. Example: "Bonjour"→"Bonjou", "Merci"→"Mèsi", "Dashboard"→"Tablo de bò".',
        mad:  'Malagasy (Malagasy). Use standard Malagasy (Merina dialect). Example: "Bonjour"→"Manao ahoana", "Merci"→"Misaotra", "Dashboard"→"Tabilao".',
      }
      const creoleHint = creoleHints[lang] ? `\nIMPORTANT — Target language details: ${creoleHints[lang]}` : ''

      const systemPrompt = `You are a professional MLM platform translator.
Translate French text to ${langName}.${creoleHint}
Rules:
- NEVER translate proper nouns: BV, LEADER, Finstrategia, Leader Network, Pinnacle, Production, Fast Start, KYC, PayPal, Stripe, USDT
- NEVER translate rank names: Manager, Captain, Leader, Mentor, Superviseur, Executive, President, Director, Boss, Visionary
- Preserve HTML tags exactly as-is
- Return ONLY a valid JSON object with the same numeric keys and translated values
- No explanations, no markdown, no extra text`

      const userPrompt = `Translate these French texts to ${langName}:\n${inputJson}`

      try {
        const dsResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.1,
            max_tokens: 4096,
          }),
        })

        if (dsResp.ok) {
          const dsData = await dsResp.json() as any
          const rawContent = dsData?.choices?.[0]?.message?.content || ''

          // Parser le JSON retourné par DeepSeek
          let translations: Record<string, string> = {}
          try {
            // Extraire le JSON même si DeepSeek ajoute du texte avant/après
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              translations = JSON.parse(jsonMatch[0])
            }
          } catch {
            console.error('[i18n] DeepSeek JSON parse error:', rawContent.substring(0, 200))
          }

          // Stocker dans KV + construire le résultat
          const storePromises: Promise<void>[] = []
          Object.entries(translations).forEach(([idx, translated]) => {
            const original = toTranslate[Number(idx)]
            if (original && typeof translated === 'string' && translated.trim()) {
              result[original] = translated
              if (i18nKV) {
                const key = `i18n:${lang}:${djb2Hash(original)}`
                storePromises.push(
                  i18nKV.put(key, translated).catch(() => {})
                )
              }
            }
          })
          await Promise.all(storePromises)
        } else {
          console.error('[i18n] DeepSeek error:', dsResp.status, await dsResp.text())
        }
      } catch (err) {
        console.error('[i18n] DeepSeek fetch error:', err)
      }
    }

    return c.json({ translations: result })
  } catch (err) {
    console.error('[i18n] translate endpoint error:', err)
    return c.json({ translations: {} }, 500)
  }
})

/**
 * GET /api/i18n/stats
 * Retourne des statistiques sur le cache KV i18n (admin)
 */
app.get('/api/i18n/stats', async (c) => {
  const env = c.env as any
  const i18nKV: KVNamespace | undefined = env?.I18N_KV

  if (!i18nKV) return c.json({ error: 'I18N_KV not configured' }, 503)

  try {
    const list = await i18nKV.list({ prefix: 'i18n:' })
    const byLang: Record<string, number> = {}
    for (const key of list.keys) {
      const parts = key.name.split(':')
      if (parts[1]) byLang[parts[1]] = (byLang[parts[1]] || 0) + 1
    }
    return c.json({
      total: list.keys.length,
      by_lang: byLang,
      list_complete: !list.list_complete ? false : true,
    })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// ============================================================
// campusBuyHTML — Page d'achat campus autonome (Safari-safe)
// HTML plat, zéro template literal imbriqué, zéro async wizard
// Le JS est dans public/static/campus-buy.js
// ============================================================
function campusBuyHTML(courseId: string, networkName: string, logoUri: string): string {
  const safeId = courseId.replace(/[^a-zA-Z0-9_-]/g, '')
  const safeName = networkName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return '<!DOCTYPE html>' +
    '<html lang="fr">' +
    '<head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Acquérir la formation — ' + safeName + '</title>' +
    '<link rel="stylesheet" href="/static/style.css">' +
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">' +
    '<style>' +
    'body{background:#0f1117;color:#e5e7eb;font-family:system-ui,sans-serif;margin:0;min-height:100vh;}' +
    '.cb-wrap{max-width:560px;margin:0 auto;padding:24px 16px 48px;}' +
    '.cb-back{display:inline-flex;align-items:center;gap:8px;color:#9ca3af;text-decoration:none;font-size:14px;margin-bottom:20px;padding:6px 12px;border-radius:8px;transition:background .2s;}' +
    '.cb-back:hover{background:#1f2937;color:#e5e7eb;}' +
    '.cb-card{background:#1a1f2e;border:1px solid #2d3748;border-radius:16px;padding:24px;margin-bottom:20px;}' +
    '.cb-title{font-size:20px;font-weight:700;color:#fff;margin:0 0 6px;}' +
    '.cb-price{font-size:28px;font-weight:800;color:#c9a84c;margin:8px 0;}' +
    '.cb-desc{font-size:14px;color:#9ca3af;margin:0;}' +
    '.cb-section-title{font-size:13px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin:0 0 12px;}' +
    '.cb-method{width:100%;border:2px solid #2d3748;border-radius:12px;padding:16px;margin-bottom:10px;background:transparent;color:#e5e7eb;cursor:pointer;text-align:left;display:flex;align-items:center;gap:14px;transition:border-color .2s,background .2s;font-size:14px;}' +
    '.cb-method:hover{border-color:#4b5563;background:#1f2937;}' +
    '.cb-method.stripe{border-color:#7c3aed55;background:#4c1d9510;}' +
    '.cb-method.stripe:hover{border-color:#7c3aed;}' +
    '.cb-method.paypal{border-color:#1d4ed855;background:#1e3a8a10;}' +
    '.cb-method.paypal:hover{border-color:#3b82f6;}' +
    '.cb-method.bank{border-color:#05966955;background:#0647341a;}' +
    '.cb-method.bank:hover{border-color:#10b981;}' +
    '.cb-method.crypto{border-color:#d9770655;background:#78350f10;}' +
    '.cb-method.crypto:hover{border-color:#f59e0b;}' +
    '.cb-method.wallet{border-color:#0891b255;background:#0e748510;}' +
    '.cb-method.wallet:hover{border-color:#06b6d4;}' +
    '.cb-method.coinpayments{border-color:#ea580c55;background:#43140710;}' +
    '.cb-method.coinpayments:hover{border-color:#f97316;}' +
    '.cb-method.v2psp{border-color:#6d28d955;background:#2e1065a0;}' +
    '.cb-method.v2psp:hover{border-color:#a78bfa;}' +
    '.cb-method.manual{border-color:#37415155;background:#111827;}' +
    '.cb-method.manual:hover{border-color:#6b7280;}' +
    '.cb-method-icon{font-size:22px;width:32px;text-align:center;flex-shrink:0;}' +
    '.cb-method-label{font-weight:700;color:#fff;}' +
    '.cb-method-sub{font-size:12px;color:#9ca3af;margin-top:2px;}' +
    '.cb-badge{margin-left:auto;font-size:9px;padding:2px 8px;border-radius:999px;font-weight:600;white-space:nowrap;}' +
    '.cb-badge.green{background:#16a34a20;color:#4ade80;border:1px solid #16a34a40;}' +
    '.cb-badge.orange{background:#ea580c20;color:#fb923c;border:1px solid #ea580c40;}' +
    '.cb-badge.blue{background:#1d4ed820;color:#60a5fa;border:1px solid #1d4ed840;}' +
    '.cb-badge.cyan{background:#0891b220;color:#22d3ee;border:1px solid #0891b240;}' +
    '.cb-loader{display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px;color:#9ca3af;font-size:14px;}' +
    '.cb-spinner{width:32px;height:32px;border:3px solid #374151;border-top-color:#c9a84c;border-radius:50%;animation:cb-spin .7s linear infinite;}' +
    '@keyframes cb-spin{to{transform:rotate(360deg);}}' +
    '.cb-error{background:#450a0a;border:1px solid #7f1d1d;border-radius:12px;padding:20px;text-align:center;color:#fca5a5;}' +
    '.cb-info{background:#1e3a5f;border:1px solid #1e40af;border-radius:10px;padding:14px;font-size:13px;color:#93c5fd;margin-bottom:12px;}' +
    '.cb-success{background:#052e16;border:1px solid #166534;border-radius:12px;padding:24px;text-align:center;}' +
    '.cb-success-icon{font-size:48px;margin-bottom:12px;}' +
    '.cb-success-title{font-size:20px;font-weight:700;color:#4ade80;margin-bottom:8px;}' +
    '.cb-success-msg{font-size:14px;color:#86efac;}' +
    '.cb-btn-primary{width:100%;padding:14px;background:#c9a84c;color:#0f1117;font-weight:700;font-size:15px;border:none;border-radius:12px;cursor:pointer;transition:background .2s;}' +
    '.cb-btn-primary:hover{background:#d4b565;}' +
    '.cb-btn-primary:disabled{opacity:.5;cursor:not-allowed;}' +
    '.cb-btn-secondary{width:100%;padding:12px;background:#1f2937;color:#9ca3af;font-weight:600;font-size:14px;border:none;border-radius:12px;cursor:pointer;transition:background .2s;margin-top:8px;}' +
    '.cb-btn-secondary:hover{background:#374151;color:#e5e7eb;}' +
    '.cb-input{width:100%;padding:12px 14px;background:#111827;border:1px solid #374151;border-radius:10px;color:#e5e7eb;font-size:14px;outline:none;box-sizing:border-box;}' +
    '.cb-input:focus{border-color:#c9a84c;}' +
    '.cb-label{font-size:13px;color:#9ca3af;margin-bottom:6px;display:block;}' +
    '.cb-field{margin-bottom:14px;}' +
    '.cb-proof-note{font-size:12px;color:#6b7280;margin-top:4px;}' +
    '.cb-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1f2937;border:1px solid #374151;padding:12px 20px;border-radius:10px;font-size:14px;color:#e5e7eb;z-index:9999;display:none;}' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="cb-wrap">' +
    '<a href="/login#campus" class="cb-back" id="cb-back-btn">' +
    '<i class="fas fa-arrow-left"></i> Retour au Campus' +
    '</a>' +
    '<div id="cb-course-info">' +
    '<div class="cb-loader"><div class="cb-spinner"></div>Chargement de la formation…</div>' +
    '</div>' +
    '<div id="cb-payment-section" style="display:none">' +
    '<div class="cb-card">' +
    '<div class="cb-section-title">Choisissez votre moyen de paiement</div>' +
    '<div id="cb-methods-list">' +
    '<div class="cb-loader"><div class="cb-spinner"></div>Chargement des moyens de paiement…</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div id="cb-checkout-section" style="display:none"></div>' +
    '<div id="cb-result-section" style="display:none"></div>' +
    '</div>' +
    '<div id="cb-toast" class="cb-toast"></div>' +
    '<script>window._CB_COURSE_ID = "' + safeId + '";</script>' +
    '<script src="/static/campus-buy.js"></script>' +
    '</body>' +
    '</html>'
}

export default app
