// ============================================================
// LEADER — Middleware de permissions RBAC
// Système de rôles multi-rôles par admin
// ============================================================

import type { Context, Next } from 'hono'
import type { Bindings } from '../types/index.js'

// ── Catalogue complet des permissions disponibles ──────────
export const ALL_PERMISSIONS: Record<string, { label: string; module: string }> = {
  // Membres
  'members.view':        { label: 'Voir les membres',           module: 'Membres' },
  'members.edit':        { label: 'Modifier les membres',       module: 'Membres' },
  'members.delete':      { label: 'Supprimer un membre',        module: 'Membres' },
  'members.impersonate': { label: 'Se connecter en tant que membre', module: 'Membres' },
  // Finances
  'wallets.view':        { label: 'Voir les wallets',           module: 'Finances' },
  'wallets.edit':        { label: 'Ajuster un solde',           module: 'Finances' },
  'withdrawals.view':    { label: 'Voir les retraits',          module: 'Finances' },
  'withdrawals.approve': { label: 'Approuver/rejeter retraits', module: 'Finances' },
  'commissions.view':    { label: 'Voir les commissions',       module: 'Finances' },
  'commissions.edit':    { label: 'Modifier les commissions',   module: 'Finances' },
  // Packages
  'packages.view':       { label: 'Voir les packages',          module: 'Packages' },
  'packages.edit':       { label: 'Modifier les packages',      module: 'Packages' },
  // Arbre MLM
  'tree.view':           { label: "Voir l'arbre de parrainage", module: 'Arbre MLM' },
  'tree.edit':           { label: "Modifier l'arbre",           module: 'Arbre MLM' },
  // Support
  'support.view':        { label: 'Voir les tickets',           module: 'Support' },
  'support.reply':       { label: 'Répondre aux tickets',       module: 'Support' },
  'support.assign':      { label: 'Assigner des tickets',       module: 'Support' },
  'support.close':       { label: 'Fermer/rouvrir un ticket',   module: 'Support' },
  'support.delete':      { label: 'Supprimer un ticket',        module: 'Support' },
  // Paramètres
  'settings.view':       { label: 'Voir les paramètres',        module: 'Paramètres' },
  'settings.edit':       { label: 'Modifier les paramètres',    module: 'Paramètres' },
  // Administration
  'admin_users.view':    { label: "Voir l'équipe admin",        module: 'Administration' },
  'admin_users.create':  { label: 'Créer un admin',             module: 'Administration' },
  'admin_users.edit':    { label: 'Modifier un admin',          module: 'Administration' },
  'admin_users.delete':  { label: 'Supprimer un admin',         module: 'Administration' },
  'roles.view':          { label: 'Voir les rôles',             module: 'Administration' },
  'roles.edit':          { label: 'Gérer les rôles',            module: 'Administration' },
  // Licences
  'licenses.view':       { label: 'Voir les licences',          module: 'Licences' },
  'licenses.edit':       { label: 'Gérer les licences',         module: 'Licences' },
  // Frais d'administration
  'admin_fee.view':      { label: "Voir les frais d'administration",   module: 'Frais Admin' },
  'admin_fee.edit':      { label: "Gérer les frais d'administration",  module: 'Frais Admin' },
  // Marketing
  'marketing.view':      { label: 'Voir les assets marketing',  module: 'Marketing' },
  'marketing.edit':      { label: 'Gérer les assets marketing', module: 'Marketing' },
  // Passerelle de Paiement
  'payment_gateway.view': { label: 'Voir la passerelle de paiement', module: 'Passerelle' },
  'payment_gateway.edit': { label: 'Configurer la passerelle',       module: 'Passerelle' },
  // Journal d'Audit
  'audit.view':          { label: "Voir le journal d'audit",    module: 'Audit' },
  // Crédit Croissance (remboursements CC)
  'cc_withdrawals.view': { label: 'Voir les remboursements CC', module: 'Crédit Croissance' },
  'cc_withdrawals.edit': { label: 'Traiter les remboursements CC', module: 'Crédit Croissance' },
  // Rapports
  'reports.view':        { label: 'Voir les rapports',          module: 'Rapports' },
  // Parcours / DréaMiles
  'dreamiles.view':      { label: 'Voir les DréaMiles',         module: 'Parcours' },
  'dreamiles.edit':      { label: 'Gérer les DréaMiles',        module: 'Parcours' },
  // KYC — Vérification d'identité
  'kyc.view':            { label: 'Voir les dossiers KYC',      module: 'KYC' },
  'kyc.review':          { label: 'Réviser les documents KYC',  module: 'KYC' },
  'kyc.approve':         { label: 'Approuver / rejeter KYC',    module: 'KYC' },
  'kyc.config':          { label: 'Configurer le système KYC',  module: 'KYC' },
}

// ── Ordre d'affichage des modules ───────────────────────────
export const MODULE_ORDER = [
  'Membres', 'Finances', 'Packages', 'Licences', 'Arbre MLM',
  'Support', 'Commissions', 'Wallets', 'Paramètres',
  'Frais Admin', 'Marketing', 'Passerelle', 'Audit',
  'Crédit Croissance', 'Rapports', 'Parcours', 'KYC', 'Administration'
]

// ── Cache en mémoire des permissions par admin (TTL 60s) ────
const _permCache: Map<string, { perms: Set<string>; isSuperAdmin: boolean; ts: number }> = new Map()
const CACHE_TTL_MS = 60_000

// Vider le cache d'un admin (après modification de ses rôles)
export function invalidatePermCache(adminId: string) {
  _permCache.delete(adminId)
}

// Récupérer les permissions effectives d'un admin depuis la DB
export async function getAdminPermissions(
  adminId: string,
  db: D1Database
): Promise<{ perms: Set<string>; isSuperAdmin: boolean }> {
  const cached = _permCache.get(adminId)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { perms: cached.perms, isSuperAdmin: cached.isSuperAdmin }
  }

  // Récupérer tous les rôles + permissions de cet admin via JOIN
  const rows = await db.prepare(`
    SELECT arp.permission, ar.id AS role_id
    FROM admin_user_roles aur
    JOIN admin_roles ar ON ar.id = aur.role_id
    JOIN admin_role_permissions arp ON arp.role_id = ar.id
    WHERE aur.admin_user_id = ?
  `).bind(adminId).all()

  const perms = new Set<string>()
  let isSuperAdmin = false

  // Vérifier si l'admin a le rôle super_admin (bypass total)
  const roleRows = await db.prepare(`
    SELECT role_id FROM admin_user_roles WHERE admin_user_id = ?
  `).bind(adminId).all()

  for (const r of (roleRows.results as any[])) {
    if (r.role_id === 'super_admin') { isSuperAdmin = true; break }
  }

  if (!isSuperAdmin) {
    for (const r of (rows.results as any[])) {
      perms.add(r.permission)
    }
  }

  _permCache.set(adminId, { perms, isSuperAdmin, ts: Date.now() })
  return { perms, isSuperAdmin }
}

// ── Middleware : exige une permission spécifique ─────────────
export function requirePermission(permission: string) {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const adminId = c.get('adminId' as any) as string
    if (!adminId) return c.json({ error: 'Non authentifié' }, 401)

    const { perms, isSuperAdmin } = await getAdminPermissions(adminId, c.env.DB)

    if (isSuperAdmin || perms.has(permission)) {
      return next()
    }

    return c.json({
      error: 'Permission refusée',
      required: permission
    }, 403)
  }
}

// ── Middleware : exige au moins une permission parmi une liste ─
export function requireAnyPermission(permissions: string[]) {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const adminId = c.get('adminId' as any) as string
    if (!adminId) return c.json({ error: 'Non authentifié' }, 401)

    const { perms, isSuperAdmin } = await getAdminPermissions(adminId, c.env.DB)

    if (isSuperAdmin || permissions.some(p => perms.has(p))) {
      return next()
    }

    return c.json({
      error: 'Permission refusée',
      required: permissions
    }, 403)
  }
}

// ── Middleware : super_admin uniquement ──────────────────────
export function requireSuperAdmin() {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const adminId = c.get('adminId' as any) as string
    if (!adminId) return c.json({ error: 'Non authentifié' }, 401)

    const { isSuperAdmin } = await getAdminPermissions(adminId, c.env.DB)

    if (isSuperAdmin) return next()

    return c.json({ error: 'Accès super_admin requis' }, 403)
  }
}
