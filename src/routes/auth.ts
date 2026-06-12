// ============================================================
// LEADER Network — Authentification & Inscription (M1/M2/M3)
// CDC Module Inscriptions v1.0 — Mai 2026
// ============================================================
import { Hono } from 'hono'
import { createJWT, verifyPassword, hashPassword } from '../lib/auth.js'
import { initFastStart } from '../lib/mlm.js'
import type { Bindings } from '../types/index.js'
import { sendEmail } from '../lib/mailer.js'

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
  const root = await db.prepare(`SELECT id FROM members WHERE unique_id = 'ROOT'`).first() as any
  return root?.id || 'root-system-000000000000000000000000'
}

async function generateUniqueIdSafe(db: D1Database): Promise<string | null> {
  for (let i = 0; i < 5; i++) {
    const candidate = generateUniqueId()
    const existing = await db.prepare(`SELECT id FROM members WHERE unique_id = ?`).bind(candidate).first()
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
    const uid = c.req.param('uniqueId').toUpperCase()
    const sponsor = await c.env.DB.prepare(
      `SELECT id, unique_id, first_name, last_name, license_active
       FROM members WHERE unique_id = ? AND unique_id != 'ROOT'`
    ).bind(uid).first() as any
    if (!sponsor) return c.json({ found: false }, 200)
    // Point 4 : le parrainage n'est accessible que si la licence est active
    if (!sponsor.license_active) {
      return c.json({
        found: false,
        reason: 'no_license',
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
    const sponsorMember = await c.env.DB.prepare(
      `SELECT id, unique_id, first_name, last_name, license_active
       FROM members WHERE unique_id = ? AND unique_id != 'ROOT'`
    ).bind(sponsor.toUpperCase()).first() as any

    if (!sponsorMember) {
      return c.json({ error: 'Lien de parrainage invalide', code: 'INVALID_SPONSOR' }, 400)
    }
    if (!sponsorMember.license_active) {
      return c.json({
        error: 'Ce lien de parrainage est inactif. Le parrain doit activer sa licence Finstrategia.',
        code: 'SPONSOR_NO_LICENSE'
      }, 403)
    }

    // 2. Résoudre le NŒUD DE PLACEMENT (parent = où sera placé dans l'arbre binaire)
    //    Rétrocompat : si pas de param 'parent', le nœud de placement = le sponsor lui-même
    const parentUid = (parent || sponsor).toUpperCase()
    const parentNode = await c.env.DB.prepare(
      `SELECT id, unique_id, first_name, last_name, binary_left_id, binary_right_id
       FROM members WHERE unique_id = ? AND unique_id != 'ROOT'`
    ).bind(parentUid).first() as any

    if (!parentNode) {
      return c.json({ error: 'Nœud de placement introuvable', code: 'INVALID_PARENT' }, 400)
    }

    // 3. Vérifier que le slot est libre sur le nœud de placement
    const slotTaken = pos === 'L' ? parentNode.binary_left_id : parentNode.binary_right_id
    if (slotTaken) {
      return c.json({
        error: 'Ce lien n\'est plus disponible. Contactez votre parrain pour en obtenir un nouveau.',
        code: 'SLOT_TAKEN'
      }, 409)
    }

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
    return c.json({ error: e.message }, 500)
  }
})

// ── POST /api/auth/register — Inscription unifiée M1/M2/M3 ────
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const {
      email, password, first_name, last_name, phone, country,
      registration_method = 'M1',
      sponsor_id,           // UUID du sponsor (M2/M3)
      binary_parent_id,     // UUID du parent binaire (M2 uniquement)
      binary_position,      // 'L' ou 'R' (M2 uniquement)
    } = body

    // ── VALIDATIONS ──────────────────────────────────────────
    if (!email || !password || !first_name || !last_name) {
      return c.json({ error: 'Champs obligatoires manquants', code: 'MISSING_FIELDS' }, 400)
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Adresse email invalide', code: 'INVALID_EMAIL' }, 400)
    }

    if (password.length < 8) {
      return c.json({ error: 'Le mot de passe doit faire au moins 8 caractères' }, 400)
    }

    // Unicité email
    const existing = await c.env.DB.prepare(
      `SELECT id FROM members WHERE email = ?`
    ).bind(email.toLowerCase().trim()).first()
    if (existing) return c.json({ error: 'Cette adresse email est déjà utilisée', code: 'EMAIL_EXISTS' }, 409)

    // ── MÉTHODE M2 : Vérification atomique du slot ───────────
    if (registration_method === 'M2') {
      if (!binary_parent_id || !binary_position || !['L', 'R'].includes(binary_position)) {
        return c.json({ error: 'Position invalide', code: 'INVALID_POSITION' }, 400)
      }
      const parent = await c.env.DB.prepare(
        `SELECT id, binary_left_id, binary_right_id FROM members WHERE id = ?`
      ).bind(binary_parent_id).first() as any
      if (!parent) return c.json({ error: 'Code parrain invalide', code: 'INVALID_SPONSOR' }, 400)

      const slotTaken = binary_position === 'L' ? parent.binary_left_id : parent.binary_right_id
      if (slotTaken) {
        return c.json({
          error: 'Ce lien n\'est plus disponible. Contactez votre parrain.',
          code: 'SLOT_TAKEN'
        }, 409)
      }
    }

    // ── GÉNÉRATION IDENTIFIANTS ──────────────────────────────
    const uniqueId = await generateUniqueIdSafe(c.env.DB)
    if (!uniqueId) {
      return c.json({ error: 'Erreur technique, réessayez', code: 'UNIQUE_ID_COLLISION' }, 500)
    }

    const pin = generatePin()
    const id = generateId()
    const passwordHash = await hashPassword(password)
    const pinHash = await hashPassword(pin)

    // ── RÉSOLUTION SPONSOR ───────────────────────────────────
    const rootId = await getRootId(c.env.DB)
    const effectiveSponsorId = sponsor_id || rootId

    // ── CRÉATION MEMBER ──────────────────────────────────────
    const inHoldingTank = registration_method !== 'M2' ? 1 : 0
    const effectiveBinaryParentId = registration_method === 'M2' ? binary_parent_id : null
    const effectiveBinaryPosition = registration_method === 'M2' ? binary_position : null

    await c.env.DB.prepare(
      `INSERT INTO members (
        id, unique_id, email, password_hash, pin_hash,
        first_name, last_name, phone, country,
        sponsor_id, binary_parent_id, binary_position,
        member_status, current_rank,
        license_active, in_holding_tank,
        registration_method,
        created_at, updated_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,  'Membre','none',  0,?,?,  datetime('now'),datetime('now'))`
    ).bind(
      id, uniqueId, email.toLowerCase().trim(), passwordHash, pinHash,
      first_name.trim(), last_name.trim(), phone || null, country || null,
      effectiveSponsorId, effectiveBinaryParentId, effectiveBinaryPosition,
      inHoldingTank,
      registration_method
    ).run()

    // ── CRÉATION WALLET ──────────────────────────────────────
    await c.env.DB.prepare(
      `INSERT INTO wallets (id, member_id, balance, total_earned, total_withdrawn) VALUES (?,?,0,0,0)`
    ).bind(generateId(), id).run()

    // ── HOLDING TANK (M1 et M3) ──────────────────────────────
    if (registration_method !== 'M2') {
      const notes = registration_method === 'M3'
        ? `Inscription M3 par lien de parrainage (sponsor: ${effectiveSponsorId})`
        : 'Inscription M1 — sans parrain'
      await c.env.DB.prepare(
        `INSERT INTO holding_tank (id, member_id, sponsor_id, entry_reason, status) VALUES (?,?,?,?,  'waiting')`
      ).bind(generateId(), id, effectiveSponsorId, notes).run()
    }

    // ── MISE À JOUR PARENT BINAIRE (M2) ──────────────────────
    if (registration_method === 'M2' && binary_parent_id && binary_position) {
      const col = binary_position === 'L' ? 'binary_left_id' : 'binary_right_id'
      await c.env.DB.prepare(
        `UPDATE members SET ${col} = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(id, binary_parent_id).run()
    }

    // ── NOTIFICATION WELCOME ─────────────────────────────────
    await c.env.DB.prepare(
      `INSERT INTO notifications (id, member_id, type, title, message) VALUES (?,?,?,?,?)`
    ).bind(
      generateId(), id, 'welcome',
      'Bienvenue sur LEADER Network !',
      `Votre compte a été créé avec succès. Votre identifiant unique est ${uniqueId}.`
    ).run()

    // ── NOTIFICATIONS ADMINS (M1 et M3) ──────────────────────
    // Les admins utilisent admin_id, pas member_id (tables différentes)
    if (registration_method !== 'M2') {
      const admins = await c.env.DB.prepare(`SELECT id FROM admin_users`).all()
      for (const admin of (admins.results as any[])) {
        await c.env.DB.prepare(
          `INSERT INTO notifications (id, admin_id, type, title, message) VALUES (?,?,?,?,?)`
        ).bind(
          generateId(), admin.id, 'info',
          'Nouveau membre en attente de placement',
          `${first_name} ${last_name} (${uniqueId}) attend son placement dans l'arbre.`
        ).run()
      }
    }

    // ── NOTIFICATION SPONSOR (M2 et M3) ──────────────────────
    if (registration_method === 'M2' && binary_parent_id) {
      const posLabel = binary_position === 'L' ? 'gauche' : 'droite'
      await c.env.DB.prepare(
        `INSERT INTO notifications (id, member_id, type, title, message) VALUES (?,?,?,?,?)`
      ).bind(
        generateId(), binary_parent_id, 'success',
        'Nouveau filleul inscrit',
        `${first_name} ${last_name} vient de s'inscrire (jambe ${posLabel}).`
      ).run()
    }
    if (registration_method === 'M3' && sponsor_id && sponsor_id !== rootId) {
      await c.env.DB.prepare(
        `INSERT INTO notifications (id, member_id, type, title, message) VALUES (?,?,?,?,?)`
      ).bind(
        generateId(), sponsor_id, 'info',
        'Nouveau filleul en attente',
        `${first_name} ${last_name} vient de s'inscrire avec votre lien de parrainage. Il est en attente de placement dans l'arbre.`
      ).run()
    }

    // ── FAST START : initialiser la fenêtre dès l'inscription ──
    // La fenêtre de 30j part de created_at (= maintenant) du nouveau membre.
    // initFastStart est idempotent — pas de risque de double-init.
    try {
      await initFastStart(c.env.DB, id)
    } catch (_) {}

    // ── TOKEN JWT ────────────────────────────────────────────
    const token = await createJWT(
      { sub: id, email: email.toLowerCase().trim(), role: 'member' },
      c.env.JWT_SECRET
    )

    // ── Email de bienvenue ──────────────────────────────────
    // NOTE: await direct — plus fiable que waitUntil dans les sous-routers Hono
    const sponsorRow = sponsor_id
      ? await c.env.DB.prepare(`SELECT first_name, last_name FROM members WHERE id=?`).bind(sponsor_id).first() as any
      : null
    await sendEmail(c.env.DB, {
      to: email.toLowerCase().trim(),
      toName: `${first_name} ${last_name}`,
      templateId: 'welcome',
      variables: {
        prenom:    first_name,
        nom:       last_name,
        email:     email.toLowerCase().trim(),
        membre_id: uniqueId,
        pin:       pin,
        parrain:   sponsorRow ? `${sponsorRow.first_name} ${sponsorRow.last_name}` : 'Aucun',
        login_url: 'https://willbeleader.pages.dev',
      }
    }).catch(() => {})

    return c.json({
      success: true,
      token,
      member: {
        id,
        unique_id: uniqueId,
        email: email.toLowerCase().trim(),
        first_name,
        last_name,
        member_status: 'Membre'
      },
      pin_displayed: pin,           // PIN en clair — UNE SEULE FOIS
      in_holding_tank: inHoldingTank === 1,
      placed: registration_method === 'M2',
      registration_method
    }, 201)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
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
