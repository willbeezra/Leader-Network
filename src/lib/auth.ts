// ============================================================
// LEADER — Authentification JWT
// ============================================================

// JWT_SECRET doit être défini comme variable d'environnement Cloudflare (secret)
// Fallback uniquement pour le développement local
export const JWT_SECRET = 'leader-network-secret-2026' // remplacé par env.JWT_SECRET en production

export interface JWTPayload {
  sub: string
  email: string
  role: 'member' | 'admin'
  exp: number
  iat: number
}

// Encoder base64url
function base64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return atob(str)
}

async function sign(data: string, secret: string): Promise<string> {
  // Fallback si le secret est vide ou undefined (worker sans variable d'env configurée)
  const effectiveSecret = (secret && secret.length > 0) ? secret : JWT_SECRET
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(effectiveSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const bytes = new Uint8Array(sig)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function createJWT(payload: Omit<JWTPayload, 'exp' | 'iat'>, secret: string | undefined, expiresInDays = 7): Promise<string> {
  const effectiveSecret = (secret && secret.length > 0) ? secret : JWT_SECRET
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = base64urlEncode(JSON.stringify({
    ...payload,
    iat: now,
    exp: now + expiresInDays * 86400
  }))
  const sigInput = `${header}.${fullPayload}`
  const signature = await sign(sigInput, effectiveSecret)
  return `${sigInput}.${signature}`
}

export async function verifyJWT(token: string, secret: string | undefined): Promise<JWTPayload | null> {
  const effectiveSecret = (secret && secret.length > 0) ? secret : JWT_SECRET
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const sigInput = `${parts[0]}.${parts[1]}`
    const expectedSig = await sign(sigInput, effectiveSecret)
    if (expectedSig !== parts[2]) return null
    const payload = JSON.parse(base64urlDecode(parts[1])) as JWTPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

// Hash mot de passe simple (SHA-256 + salt)
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID()
  const data = new TextEncoder().encode(salt + password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${salt}:${hex}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const data = new TextEncoder().encode(salt + password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === hash
}

export function generateUniqueId(): string {
  const num = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `LDR${num}`
}

export function generateId(): string {
  return crypto.randomUUID()
}
