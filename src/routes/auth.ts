// ============================================================
// LEADER — Authentification & Inscription (M1/M2/M3)
// CDC Module Inscriptions v1.0 — Mai 2026
// ============================================================
import { Hono } from 'hono'
import { createJWT, verifyPassword, hashPassword } from '../lib/auth.js'
import { initFastStart } from '../lib/mlm.js'
import type { Bindings } from '../types/index.js'
import { sendEmail } from '../lib/mailer.js'
import {
  RegistrationError, findReferralMember, requireSponsorLicense, requireAvailableSlot,
  validateRegistration, validateRegistrationRelations,
} from '../lib/registration.js'

// ── Protection brute force via KV ────────────────────────────
// OPTIMISATION KV : on ne lit le KV qu'APRÈS un échec d'auth (DB),
// ce qui économise ~80% des lectures KV (cas nominal = connexion réussie).
const MAX_ATTEMPTS = 5        // tentatives avant blocage
const BLOCK_TTL    = 900      // blocage 15 minutes (secondes)
const ATTEMPT_TTL  = 600      // fenêtre de comptage 10 minutes

// Vérifie si le compteur KV indique un blocage (appelé seulement après échec)
async function isBlocked(kv: KVNamespace | undefined, key: string): Promise<boolean> {
  if (!kv) return false
  try {
    const raw = await kv.get(`bf:${key}`)
    const attempts = raw ? parseInt(raw) : 0
    return attempts >= MAX_ATTEMPTS
  } catch { return false }
}

// Incrémente le compteur et retourne le nombre de tentatives restantes
async function recordFailedAttempt(kv: KVNamespace | undefined, key: string): Promise<number> {
  if (!kv) return MAX_ATTEMPTS
  try {
    const raw = await kv.get(`bf:${key}`)
    const attempts = raw ? parseInt(raw) : 0
    const newCount = attempts + 1
    const ttl = newCount >= MAX_ATTEMPTS ? BLOCK_TTL : ATTEMPT_TTL
    await kv.put(`bf:${key}`, String(newCount), { expirationTtl: ttl })
    return MAX_ATTEMPTS - newCount
  } catch { return MAX_ATTEMPTS }
}

async function clearAttempts(kv: KVNamespace | undefined, key: string): Promise<void> {
  if (!kv) return
  try { await kv.delete(`bf:${key}`) } catch {}
}

const auth = new Hono<{ Bindings: Bindings }>()

// ── Helpers ──────────────────────────────────────────────────

function generateUniqueId(): string {
  const num = Math.floor(Math.random() * 900000) + 100000
  return `LDR${num}`
}

function generateId(): string {
  return crypto.randomUUID()
}

function generatePin(): string {
  return String(Math.floor(Math.random() * 900000) + 100000)
}

async function getRootId(db: D1Database): Promise<string> {
  const root = await db.prepare(`SELECT id FROM members WHERE unique_id = 'ROOT' COLLATE NOCASE`).first() as any
  if (!root) throw new RegistrationError('REGISTRATION_CONFIG_ERROR', 'Inscription temporairement indisponible. Contactez le support.', 503)
  return root.id
}

async function generateUniqueIdSafe(db: D1Database): Promise<string | null> {
  for (let i = 0; i < 5; i++) {
    const candidate = generateUniqueId()
    const existing = await db.prepare(`SELECT id FROM members WHERE unique_id = ? COLLATE NOCASE`).bind(candidate).first()
    if (!existing) return candidate
  }
  return null
}

// ── POST /api/auth/login ─────────────────────────────────────
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    if (!email || !password) return c.json({ error: 'Email et mot de passe requis' }, 400)

    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    const bfKey = `login:${ip}:${email.toLowerCase().trim()}`

    // ── Brute force : vérifier AVANT seulement si l'IP est déjà suspecte ──
    // (lecture KV uniquement si compteur existe déjà = après un premier échec)
    if (await isBlocked(c.env.FILES_KV, bfKey)) {
      return c.json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, 429)
    }

    const member = await c.env.DB.prepare(
      `SELECT * FROM members WHERE email = ? AND unique_id != 'ROOT'`
    ).bind(email.toLowerCase().trim()).first() as any

    if (!member) {
      await recordFailedAttempt(c.env.FILES_KV, bfKey)
      return c.json({ error: 'Identifiants incorrects' }, 401)
    }

    const valid = await verifyPassword(password, member.password_hash)
    if (!valid) {
      const remaining = await recordFailedAttempt(c.env.FILES_KV, bfKey)
      const msg = remaining <= 1 ? `Identifiants incorrects. ${remaining} tentative(s) restante(s).` : 'Identifiants incorrects'
      return c.json({ error: msg }, 401)
    }

    // Connexion réussie — reset compteur (fire & forget, pas critique)
    c.executionCtx?.waitUntil(clearAttempts(c.env.FILES_KV, bfKey))

    // ── Détection nouvel appareil (nouvelle IP) ───────────────
    const previousIp = member.last_login_ip
    const isNewDevice = !previousIp || previousIp !== ip

    // Mettre à jour last_login_ip et last_login_at
    await c.env.DB.prepare(
      `UPDATE members SET last_login_ip=?, last_login_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
    ).bind(ip, member.id).run()

    // Envoyer email si nouvelle IP (et ce n'est pas la toute première connexion)
    if (isNewDevice && previousIp) {
      const userAgent = c.req.header('User-Agent') || 'Appareil inconnu'
      const device = userAgent.length > 80 ? userAgent.substring(0, 80) + '…' : userAgent
      await sendEmail(c.env.DB, {
        to: member.email, toName: member.first_name,
        templateId: 'login_new_device',
        variables: {
          prenom:        member.first_name || '',
          date:          new Date().toLocaleString('fr-FR'),
          ip,
          device,
          dashboard_url: 'https://willbeleader.pages.dev',
        }
      }).catch(() => {})
    }

    const token = await createJWT(
      { sub: member.id, email: member.email, role: 'member' },
      c.env.JWT_SECRET
    )

    return c.json({
      token,
      member: {
        id: member.id,
        unique_id: member.unique_id,
        email: member.email,
        first_name: member.first_name,
        last_name: member.last_name,
        member_status: member.member_status,
        current_rank: member.current_rank,
        license_active: member.license_active,
        kyc_status: member.kyc_status,
        avatar_url: member.avatar_url,
        in_holding_tank: member.in_holding_tank
      }
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ── POST /api/auth/admin/login ────────────────────────────────
auth.post('/admin/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    if (!email || !password) return c.json({ error: 'Email et mot de passe requis' }, 400)

    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    const bfKey = `admin:${ip}:${email.toLowerCase().trim()}`

    // ── Brute force admin : vérifier seulement si déjà suspecté ──
    if (await isBlocked(c.env.FILES_KV, bfKey)) {
      return c.json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, 429)
    }

    const admin = await c.env.DB.prepare(
      `SELECT * FROM admin_users WHERE email = ?`
    ).bind(email.toLowerCase().trim()).first() as any

    if (!admin) {
      await recordFailedAttempt(c.env.FILES_KV, bfKey)
      return c.json({ error: 'Identifiants incorrects' }, 401)
    }

    const valid = await verifyPassword(password, admin.password_hash)
    if (!valid) {
      const remaining = await recordFailedAttempt(c.env.FILES_KV, bfKey)
      const msg = remaining <= 1 ? `Identifiants incorrects. ${remaining} tentative(s) restante(s).` : 'Identifiants incorrects'
      return c.json({ error: msg }, 401)
    }

    // Connexion réussie — reset compteur (fire & forget)
    c.executionCtx?.waitUntil(clearAttempts(c.env.FILES_KV, bfKey))

    const token = await createJWT(
      { sub: admin.id, email: admin.email, role: 'admin' },
      c.env.JWT_SECRET
    )

    return c.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ── GET /api/auth/sponsor/:uniqueId — Résolution sponsor (M3) ─
// Vérifie qu'un unique_id existe, est actif ET a une licence active
auth.get('/sponsor/:uniqueId', async (c) => {
  try {
    const sponsor = await findReferralMember(c.env.DB, c.req.param('uniqueId'))
    // Point 4 : le parrainage n'est accessible que si la licence est active
    if (!sponsor.license_active) {
      return c.json({
        found: false,
        reason: 'no_license',
        code: 'SPONSOR_NO_LICENSE',
        message: 'Ce lien de parrainage est inactif. Le parrain doit activer sa licence Finstrategia.'
      }, 200)
    }
    return c.json({
      found: true,
      id: sponsor.id,
      unique_id: sponsor.unique_id,
      name: `${sponsor.first_name} ${sponsor.last_name}`
    })
  } catch (e: any) {
    if (e instanceof RegistrationError) {
      if (e.code === 'INVALID_SPONSOR') return c.json({ found: false, reason: 'not_found', code: e.code, message: e.message })
      return c.json({ found: false, error: e.message, code: e.code }, e.status)
    }
    return c.json({ error: e.message }, 500)
  }
})

// ── GET /api/auth/validate-slot — Validation slot binaire (M2) ─
// Paramètres :
//   sponsor  = unique_id du RECRUTEUR (celui qui a généré le lien)
//   parent   = unique_id du NŒUD DE PLACEMENT (le slot cliqué dans l'arbre)
//              si absent → rétrocompat : parent = sponsor (ancien format de lien)
//   position = 'L' ou 'R'
auth.get('/validate-slot', async (c) => {
  try {
    const { sponsor, parent, position } = c.req.query()
    if (!sponsor || !position) return c.json({ error: 'Paramètres sponsor et position requis' }, 400)
    if (!['L', 'R'].includes(position.toUpperCase())) {
      return c.json({ error: 'Position invalide', code: 'INVALID_POSITION' }, 400)
    }

    const pos = position.toUpperCase() as 'L' | 'R'

    // 1. Résoudre le RECRUTEUR (sponsor = celui qui parraine réellement)
    const sponsorMember = await findReferralMember(c.env.DB, sponsor)
    requireSponsorLicense(sponsorMember)

    // 2. Résoudre le NŒUD DE PLACEMENT (parent = où sera placé dans l'arbre binaire)
    //    Rétrocompat : si pas de param 'parent', le nœud de placement = le sponsor lui-même
    const parentNode = await findReferralMember(c.env.DB, parent || sponsor, true)

    // 3. Vérifier que le slot est libre sur le nœud de placement
    await requireAvailableSlot(c.env.DB, parentNode.id, pos)

    return c.json({
      valid: true,
      // Recruteur (sponsor réel)
      sponsor_id:        sponsorMember.id,
      sponsor_unique_id: sponsorMember.unique_id,
      sponsor_name:      `${sponsorMember.first_name} ${sponsorMember.last_name}`,
      // Nœud de placement (parent binaire)
      parent_id:         parentNode.id,
      parent_unique_id:  parentNode.unique_id,
      parent_name:       `${parentNode.first_name} ${parentNode.last_name}`,
      position: pos
    })
  } catch (e: any) {
    if (e instanceof RegistrationError) return c.json({ error: e.message, code: e.code }, e.status)
    return c.json({ error: e.message }, 500)
  }
})

// ── POST /api/auth/register — Inscription unifiée M1/M2/M3 ────
auth.post('/register', async (c) => {
  try {
    const input = await validateRegistration(c.env.DB, await c.req.json())
    const {
      email, password, first_name, last_name, phone, country,
      birth_date, nationality, address, postal_code, city,
      registration_method, sponsor_id, binary_parent_id, binary_position,
    } = input
    const uniqueId = await generateUniqueIdSafe(c.env.DB)
    if (!uniqueId) return c.json({ error: 'Erreur technique, réessayez.', code: 'UNIQUE_ID_COLLISION' }, 503)

    const id = generateId()
    const pin = generatePin()
    const passwordHash = await hashPassword(password)
    const pinHash = await hashPassword(pin)
    const effectiveSponsorId = sponsor_id || await getRootId(c.env.DB)
    const inHoldingTank = registration_method === 'M2' ? 0 : 1
    const effectiveParentId = registration_method === 'M2' ? binary_parent_id : null
    const effectivePosition = registration_method === 'M2' ? binary_position : null
    const sponsorRow = await c.env.DB.prepare(`SELECT first_name, last_name FROM members WHERE id = ?`)
      .bind(effectiveSponsorId).first() as any

    // Prepare the response token before committing the account.
    const token = await createJWT({ sub: id, email, role: 'member' }, c.env.JWT_SECRET)

    // Recheck eligibility inside the same D1 transaction as every account write.
    // If the conditional INSERT inserts nothing, the wallet's member_id foreign key
    // fails and D1 rolls back the entire batch (including notifications/placement).
    // No schema change or rewrite of existing members is needed.
    const conditions = [
      sponsor_id
        ? `s.id = ? AND s.unique_id != 'ROOT' COLLATE NOCASE AND s.license_active = 1`
        : `s.id = ? AND s.unique_id = 'ROOT' COLLATE NOCASE`,
    ]
    const guardValues: string[] = [effectiveSponsorId]
    if (registration_method === 'M2') {
      const slotColumn = binary_position === 'L' ? 'binary_left_id' : 'binary_right_id'
      conditions.push(`EXISTS (
        SELECT 1 FROM members p WHERE p.id = ? AND p.unique_id != 'ROOT' COLLATE NOCASE
          AND p.${slotColumn} IS NULL
          AND NOT EXISTS (SELECT 1 FROM members child WHERE child.binary_parent_id = p.id AND child.binary_position = ?)
      )`)
      guardValues.push(binary_parent_id, binary_position)
    }
    const statements: D1PreparedStatement[] = [
      c.env.DB.prepare(
        `INSERT INTO members (
          id, unique_id, email, password_hash, pin_hash, first_name, last_name, phone, country,
          birth_date, nationality, address, postal_code, city,
          sponsor_id, binary_parent_id, binary_position,
          member_status, current_rank, license_active, in_holding_tank, registration_method,
          created_at, updated_at
         ) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'Membre','none',0,?,?,datetime('now'),datetime('now')
           FROM members s WHERE ${conditions.join(' AND ')}`
      ).bind(id, uniqueId, email, passwordHash, pinHash, first_name, last_name, phone || null, country || null,
        birth_date || null, nationality || null, address || null, postal_code || null, city || null,
        effectiveSponsorId, effectiveParentId, effectivePosition, inHoldingTank, registration_method, ...guardValues),
      c.env.DB.prepare(
        `INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn) VALUES (?,?,0,0,0)`
      ).bind(generateId(), id),
    ]
    if (registration_method === 'M2') {
      const col = binary_position === 'L' ? 'binary_left_id' : 'binary_right_id'
      statements.push(c.env.DB.prepare(
        `UPDATE members SET ${col} = ?, updated_at = datetime('now') WHERE id = ? AND ${col} IS NULL`
      ).bind(id, binary_parent_id))
    } else {
      const notes = registration_method === 'M3'
        ? `Inscription M3 par lien de parrainage (sponsor: ${effectiveSponsorId})`
        : 'Inscription M1 — sans placement direct'
      statements.push(c.env.DB.prepare(
        `INSERT INTO holding_tank (id, member_id, sponsor_id, entry_reason, status) VALUES (?,?,?,?,'waiting')`
      ).bind(generateId(), id, effectiveSponsorId, notes))
    }
    statements.push(c.env.DB.prepare(
      `INSERT INTO notifications (id, member_id, type, title, message) VALUES (?,?,'welcome',?,?)`
    ).bind(generateId(), id, 'Bienvenue sur LEADER !',
      `Votre compte a été créé avec succès. Votre identifiant unique est ${uniqueId}.`))
    if (registration_method !== 'M2') {
      statements.push(c.env.DB.prepare(
        `INSERT INTO notifications (id, admin_id, type, title, message)
         SELECT lower(hex(randomblob(16))), id, 'info', ?, ? FROM admin_users`
      ).bind('Nouveau membre en attente de placement',
        `${first_name} ${last_name} (${uniqueId}) attend son placement dans l'arbre.`))
    }
    if (registration_method === 'M2') {
      statements.push(c.env.DB.prepare(
        `INSERT INTO notifications (id, member_id, type, title, message) VALUES (?,?,'success',?,?)`
      ).bind(generateId(), binary_parent_id, 'Nouveau filleul inscrit',
        `${first_name} ${last_name} vient de s'inscrire (jambe ${binary_position === 'L' ? 'gauche' : 'droite'}).`))
    } else if (registration_method === 'M3') {
      statements.push(c.env.DB.prepare(
        `INSERT INTO notifications (id, member_id, type, title, message) VALUES (?,?,'info',?,?)`
      ).bind(generateId(), sponsor_id, 'Nouveau filleul en attente',
        `${first_name} ${last_name} vient de s'inscrire avec votre lien de parrainage. Il est en attente de placement dans l'arbre.`))
    }
    try {
      await c.env.DB.batch(statements)
    } catch (error) {
      // A slot/license/email may have changed since the initial validation.
      await validateRegistrationRelations(c.env.DB, input)
      throw error
    }

    // Optional follow-up work must not turn a committed registration into an error.
    try { await initFastStart(c.env.DB, id) } catch (_) {}
    await sendEmail(c.env.DB, {
      to: email, toName: `${first_name} ${last_name}`, templateId: 'welcome',
      variables: {
        prenom: first_name, nom: last_name, email, membre_id: uniqueId, pin,
        parrain: sponsor_id && sponsorRow ? `${sponsorRow.first_name} ${sponsorRow.last_name}` : 'Aucun',
        login_url: 'https://willbeleader.pages.dev',
      },
    }).catch(() => {})
    return c.json({
      success: true, token,
      member: { id, unique_id: uniqueId, email, first_name, last_name, member_status: 'Membre' },
      pin_displayed: pin,
      in_holding_tank: inHoldingTank === 1,
      placed: registration_method === 'M2',
      registration_method,
    }, 201)
  } catch (e: any) {
    if (e instanceof RegistrationError) return c.json({ error: e.message, code: e.code }, e.status)
    if (e instanceof SyntaxError) return c.json({ error: 'Formulaire invalide.', code: 'INVALID_REQUEST' }, 400)
    console.error('[register] Account creation failed', e)
    return c.json({ error: 'Inscription impossible pour le moment. Veuillez réessayer.', code: 'REGISTRATION_FAILED' }, 500)
  }
})

// ── POST /api/auth/reset-password ────────────────────────────
auth.post('/reset-password', async (c) => {
  try {
    const { email, new_password, pin } = await c.req.json()
    const member = await c.env.DB.prepare(
      `SELECT * FROM members WHERE email = ? AND unique_id != 'ROOT'`
    ).bind(email.toLowerCase().trim()).first() as any
    if (!member) return c.json({ error: 'Membre introuvable' }, 404)

    if (pin) {
      if (!member.pin_hash) return c.json({ error: 'PIN non configuré' }, 400)
      const validPin = await verifyPassword(pin, member.pin_hash)
      if (!validPin) return c.json({ error: 'PIN invalide' }, 401)
    }

    if (!new_password || new_password.length < 8) {
      return c.json({ error: 'Le mot de passe doit faire au moins 8 caractères' }, 400)
    }

    const hash = await hashPassword(new_password)
    await c.env.DB.prepare(
      `UPDATE members SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(hash, member.id).run()

    // ── Email confirmation reset mot de passe ────────────────
    // NOTE: await direct — plus fiable que waitUntil dans les sous-routers Hono
    await sendEmail(c.env.DB, {
      to: member.email, toName: member.first_name,
      templateId: 'password_reset',
      variables: {
        prenom:        member.first_name || '',
        dashboard_url: 'https://willbeleader.pages.dev',
      }
    }).catch(() => {})

    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ── GET /auth/reg-required-fields — Config champs obligatoires formulaire ──
// Retourne { fields: string[], form_type: 'simple'|'multistep' }
// Appelé par doRegister() (validation côté client) et _cfgRender_inscription() (admin)
auth.get('/reg-required-fields', async (c) => {
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

export { auth }
export { verifyJWT, hashPassword, generateId, generateUniqueId } from '../lib/auth.js'
