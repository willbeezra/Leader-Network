// Shared validation for referral previews and the final registration request.
export class RegistrationError extends Error {
  constructor(public code: string, message: string, public status: 400 | 403 | 409 | 503 = 400) {
    super(message)
  }
}

export const registrationFields: Record<string, string> = {
  phone: 'Téléphone', country: 'Pays de résidence', birth_date: 'Date de naissance',
  nationality: 'Nationalité', address: 'Adresse', postal_code: 'Code postal', city: 'Ville',
}

export function registrationText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function findReferralMember(db: D1Database, uid: string, parent = false): Promise<any> {
  const rows = await db.prepare(
    `SELECT id, unique_id, first_name, last_name, license_active, binary_left_id, binary_right_id
     FROM members WHERE unique_id = ? COLLATE NOCASE AND unique_id != 'ROOT' COLLATE NOCASE LIMIT 2`
  ).bind(uid.trim()).all()
  if (rows.results.length > 1) {
    throw new RegistrationError('AMBIGUOUS_REFERRAL',
      'Cet identifiant correspond à plusieurs comptes. Contactez le support.', 409)
  }
  const member = rows.results[0] as any
  if (!member) throw new RegistrationError(parent ? 'INVALID_PARENT' : 'INVALID_SPONSOR',
    parent ? 'Nœud de placement introuvable.' : 'Parrain introuvable. Vérifiez le lien de parrainage.')
  return member
}

export function requireSponsorLicense(member: any): void {
  if (!member.license_active) throw new RegistrationError('SPONSOR_NO_LICENSE',
    'Ce lien de parrainage est inactif. Le parrain doit activer sa licence Finstrategia.', 403)
}

export async function requireAvailableSlot(db: D1Database, parentId: string, position: string): Promise<void> {
  if (!parentId || !['L', 'R'].includes(position)) {
    throw new RegistrationError('INVALID_POSITION', 'Position de placement invalide.')
  }
  const parent = await db.prepare(
    `SELECT binary_left_id, binary_right_id FROM members WHERE id = ? AND unique_id != 'ROOT' COLLATE NOCASE`
  ).bind(parentId).first() as any
  if (!parent) throw new RegistrationError('INVALID_PARENT', 'Nœud de placement introuvable.')
  const child = await db.prepare(
    `SELECT id FROM members WHERE binary_parent_id = ? AND binary_position = ? LIMIT 1`
  ).bind(parentId, position).first()
  if ((position === 'L' ? parent.binary_left_id : parent.binary_right_id) || child) {
    throw new RegistrationError('SLOT_TAKEN',
      'Cette place est déjà occupée. Contactez votre parrain pour obtenir un nouveau lien.', 409)
  }
}

export async function validateRegistration(db: D1Database, body: any) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new RegistrationError('INVALID_REQUEST', 'Formulaire invalide.')
  }
  const method = body.registration_method === undefined ? 'M1' : registrationText(body.registration_method)
  if (!['M1', 'M2', 'M3'].includes(method)) {
    throw new RegistrationError('INVALID_METHOD', 'Méthode d’inscription invalide.')
  }
  const input = {
    first_name: registrationText(body.first_name), last_name: registrationText(body.last_name),
    email: registrationText(body.email).toLowerCase(),
    password: typeof body.password === 'string' ? body.password : '',
    registration_method: method,
    sponsor_id: registrationText(body.sponsor_id),
    binary_parent_id: registrationText(body.binary_parent_id),
    binary_position: registrationText(body.binary_position).toUpperCase(),
    phone: registrationText(body.phone), country: registrationText(body.country),
    birth_date: registrationText(body.birth_date), nationality: registrationText(body.nationality),
    address: registrationText(body.address), postal_code: registrationText(body.postal_code),
    city: registrationText(body.city),
  }
  if (!input.first_name || !input.last_name || !input.email || !input.password) {
    throw new RegistrationError('MISSING_FIELDS', 'Champs obligatoires manquants.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new RegistrationError('INVALID_EMAIL', 'Adresse email invalide.')
  }
  if (input.password.length < 8) {
    throw new RegistrationError('INVALID_PASSWORD', 'Le mot de passe doit faire au moins 8 caractères.')
  }
  if (input.birth_date) {
    const date = new Date(input.birth_date + 'T00:00:00Z')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birth_date) || !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== input.birth_date || date.getTime() > Date.now()) {
      throw new RegistrationError('INVALID_BIRTH_DATE', 'Date de naissance invalide.')
    }
  }
  const config = await db.prepare(`SELECT value FROM system_config WHERE key = 'reg_required_fields'`).first() as any
  let required: unknown = []
  try { required = config?.value ? JSON.parse(config.value) : [] } catch {
    throw new RegistrationError('REGISTRATION_CONFIG_ERROR', 'Configuration du formulaire indisponible. Réessayez plus tard.', 503)
  }
  if (!Array.isArray(required)) {
    throw new RegistrationError('REGISTRATION_CONFIG_ERROR', 'Configuration du formulaire indisponible. Réessayez plus tard.', 503)
  }
  for (const field of required) {
    if (typeof field === 'string' && Object.hasOwn(registrationFields, field) && !input[field as keyof typeof input]) {
      throw new RegistrationError('MISSING_FIELDS', `Le champ « ${registrationFields[field]} » est obligatoire.`)
    }
  }
  await validateRegistrationRelations(db, input)
  return input
}

export async function validateRegistrationRelations(db: D1Database, input: {
  email: string; registration_method: string; sponsor_id: string; binary_parent_id: string; binary_position: string
}) {
  const existing = await db.prepare(`SELECT id FROM members WHERE email = ? COLLATE NOCASE`).bind(input.email).first()
  if (existing) throw new RegistrationError('EMAIL_EXISTS', 'Cette adresse email est déjà utilisée.', 409)
  if (input.registration_method !== 'M1' && !input.sponsor_id) {
    throw new RegistrationError('INVALID_SPONSOR', 'Un parrain valide est obligatoire pour ce lien d’inscription.')
  }
  if (input.sponsor_id) {
    const sponsor = await db.prepare(
      `SELECT id, license_active FROM members WHERE id = ? AND unique_id != 'ROOT' COLLATE NOCASE`
    ).bind(input.sponsor_id).first()
    if (!sponsor) throw new RegistrationError('INVALID_SPONSOR', 'Parrain introuvable. Vérifiez le lien de parrainage.')
    requireSponsorLicense(sponsor)
  }
  if (input.registration_method === 'M2') {
    await requireAvailableSlot(db, input.binary_parent_id, input.binary_position)
  } else if (input.binary_parent_id || input.binary_position) {
    throw new RegistrationError('INVALID_POSITION', 'Le placement direct nécessite un lien provenant de l’arbre binaire.')
  }
}
