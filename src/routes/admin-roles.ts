// ============================================================
// LEADER — Routes Gestion des Rôles Admin
// RBAC entièrement paramétrable
// ============================================================

import { Hono } from 'hono'
import { hashPassword, generateId, verifyJWT } from '../lib/auth.js'
import { ALL_PERMISSIONS, MODULE_ORDER, invalidatePermCache, requirePermission } from '../middleware/permissions.js'
import type { Bindings } from '../types/index.js'

const rolesRouter = new Hono<{ Bindings: Bindings }>()

// ── MIDDLEWARE AUTH ──────────────────────────────────────────
// rolesRouter est monté AVANT admin dans index.tsx (pour éviter que
// admin.use('/*') n'intercepte /roles et /admin-users).
// Il doit donc gérer lui-même l'authentification JWT.
rolesRouter.use('/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.slice(7)

  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Accès admin requis' }, 403)

  // Vérifier que l'admin existe bien en DB
  const adminRow = await c.env.DB.prepare(
    `SELECT id FROM admin_users WHERE id = ?`
  ).bind(payload.sub).first() as any

  if (!adminRow) {
    return c.json({ error: 'Session invalide — veuillez vous reconnecter', code: 'INVALID_ADMIN_SESSION' }, 401)
  }

  c.set('adminId' as any, adminRow.id as string)
  await next()
})

// ── Helpers ─────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

async function getAdminId(c: any): Promise<string> {
  return c.get('adminId') as string
}

// ── GET /api/admin/roles ─────────────────────────────────────
// Retourne tous les rôles avec leurs permissions et le nombre d'admins
rolesRouter.get('/roles', requirePermission('roles.view'), async (c) => {
  const roles = await c.env.DB.prepare(`
    SELECT r.id, r.label, r.color, r.icon, r.is_system, r.created_at,
           COUNT(DISTINCT aur.admin_user_id) AS member_count
    FROM admin_roles r
    LEFT JOIN admin_user_roles aur ON aur.role_id = r.id
    GROUP BY r.id
    ORDER BY r.is_system DESC, r.created_at ASC
  `).all()

  const perms = await c.env.DB.prepare(`
    SELECT role_id, permission FROM admin_role_permissions ORDER BY role_id
  `).all()

  // Regrouper les permissions par rôle
  const permsByRole: Record<string, string[]> = {}
  for (const p of (perms.results as any[])) {
    if (!permsByRole[p.role_id]) permsByRole[p.role_id] = []
    permsByRole[p.role_id].push(p.permission)
  }

  const result = (roles.results as any[]).map(r => ({
    ...r,
    permissions: permsByRole[r.id] || []
  }))

  return c.json({
    roles: result,
    all_permissions: ALL_PERMISSIONS,
    module_order: MODULE_ORDER
  })
})

// ── POST /api/admin/roles ─────────────────────────────────────
// Créer un nouveau rôle
rolesRouter.post('/roles', requirePermission('roles.edit'), async (c) => {
  const adminId = await getAdminId(c)
  const body = await c.req.json() as any

  if (!body.label?.trim()) {
    return c.json({ error: 'Le nom du rôle est requis' }, 400)
  }

  // Générer un ID unique basé sur le label
  let baseId = slugify(body.label)
  if (!baseId) baseId = 'role'

  // Vérifier l'unicité de l'ID
  let finalId = baseId
  let attempt = 0
  while (true) {
    const existing = await c.env.DB.prepare(
      `SELECT id FROM admin_roles WHERE id = ?`
    ).bind(finalId).first()
    if (!existing) break
    attempt++
    finalId = `${baseId}-${attempt}`
  }

  await c.env.DB.prepare(`
    INSERT INTO admin_roles (id, label, color, icon, is_system)
    VALUES (?, ?, ?, ?, 0)
  `).bind(
    finalId,
    body.label.trim(),
    body.color || '#6b7280',
    body.icon  || 'fa-user'
  ).run()

  // Insérer les permissions si fournies
  if (Array.isArray(body.permissions) && body.permissions.length > 0) {
    const validPerms = body.permissions.filter((p: string) => ALL_PERMISSIONS[p])
    for (const perm of validPerms) {
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO admin_role_permissions (role_id, permission) VALUES (?, ?)
      `).bind(finalId, perm).run()
    }
  }

  return c.json({ success: true, id: finalId }, 201)
})

// ── PATCH /api/admin/roles/:id ───────────────────────────────
// Modifier label, couleur, icône d'un rôle
rolesRouter.patch('/roles/:id', requirePermission('roles.edit'), async (c) => {
  const roleId = c.req.param('id')
  const body   = await c.req.json() as any

  const role = await c.env.DB.prepare(
    `SELECT id, is_system FROM admin_roles WHERE id = ?`
  ).bind(roleId).first() as any

  if (!role) return c.json({ error: 'Rôle introuvable' }, 404)

  // Empêcher la modification du label/icône du super_admin
  if (role.is_system && roleId === 'super_admin') {
    return c.json({ error: 'Le rôle super_admin ne peut pas être modifié' }, 403)
  }

  const updates: string[] = []
  const values: any[]    = []

  if (body.label !== undefined) { updates.push('label=?'); values.push(body.label.trim()) }
  if (body.color !== undefined) { updates.push('color=?'); values.push(body.color) }
  if (body.icon  !== undefined) { updates.push('icon=?');  values.push(body.icon) }

  if (updates.length === 0) return c.json({ error: 'Aucune modification fournie' }, 400)

  values.push(roleId)
  await c.env.DB.prepare(
    `UPDATE admin_roles SET ${updates.join(',')} WHERE id=?`
  ).bind(...values).run()

  // Invalider le cache de tous les admins ayant ce rôle
  const members = await c.env.DB.prepare(
    `SELECT admin_user_id FROM admin_user_roles WHERE role_id = ?`
  ).bind(roleId).all()
  for (const m of (members.results as any[])) invalidatePermCache(m.admin_user_id)

  return c.json({ success: true })
})

// ── DELETE /api/admin/roles/:id ──────────────────────────────
// Supprimer un rôle (interdit si système ou encore utilisé)
rolesRouter.delete('/roles/:id', requirePermission('roles.edit'), async (c) => {
  const roleId = c.req.param('id')

  const role = await c.env.DB.prepare(
    `SELECT id, is_system FROM admin_roles WHERE id = ?`
  ).bind(roleId).first() as any

  if (!role) return c.json({ error: 'Rôle introuvable' }, 404)
  if (role.is_system) return c.json({ error: 'Les rôles système ne peuvent pas être supprimés' }, 403)

  // Vérifier que le rôle n'est pas assigné à un admin
  const usage = await c.env.DB.prepare(
    `SELECT COUNT(*) AS cnt FROM admin_user_roles WHERE role_id = ?`
  ).bind(roleId).first() as any

  if (usage?.cnt > 0) {
    return c.json({
      error: `Ce rôle est attribué à ${usage.cnt} membre(s). Retirez-le d'abord.`,
      count: usage.cnt
    }, 409)
  }

  await c.env.DB.prepare(`DELETE FROM admin_roles WHERE id = ?`).bind(roleId).run()
  return c.json({ success: true })
})

// ── PUT /api/admin/roles/:id/perms ───────────────────────────
// Remplacer entièrement les permissions d'un rôle
rolesRouter.put('/roles/:id/perms', requirePermission('roles.edit'), async (c) => {
  const roleId = c.req.param('id')
  const body   = await c.req.json() as any

  if (roleId === 'super_admin') {
    return c.json({ error: 'Les permissions du super_admin ne peuvent pas être modifiées' }, 403)
  }

  const role = await c.env.DB.prepare(
    `SELECT id FROM admin_roles WHERE id = ?`
  ).bind(roleId).first()
  if (!role) return c.json({ error: 'Rôle introuvable' }, 404)

  // Valider les permissions fournies
  const incoming: string[] = Array.isArray(body.permissions) ? body.permissions : []
  const validPerms = incoming.filter(p => ALL_PERMISSIONS[p])

  // Remplacer les permissions existantes
  await c.env.DB.prepare(
    `DELETE FROM admin_role_permissions WHERE role_id = ?`
  ).bind(roleId).run()

  for (const perm of validPerms) {
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO admin_role_permissions (role_id, permission) VALUES (?, ?)
    `).bind(roleId, perm).run()
  }

  // Invalider le cache des admins ayant ce rôle
  const members = await c.env.DB.prepare(
    `SELECT admin_user_id FROM admin_user_roles WHERE role_id = ?`
  ).bind(roleId).all()
  for (const m of (members.results as any[])) invalidatePermCache(m.admin_user_id)

  return c.json({ success: true, permissions: validPerms })
})

// ── GET /api/admin/admin-users ───────────────────────────────
// Liste des admins avec leurs rôles
rolesRouter.get('/admin-users', requirePermission('admin_users.view'), async (c) => {
  const users = await c.env.DB.prepare(`
    SELECT id, email, name, created_at FROM admin_users ORDER BY created_at ASC
  `).all()

  const userRoles = await c.env.DB.prepare(`
    SELECT aur.admin_user_id, aur.role_id, aur.assigned_at,
           ar.label AS role_label, ar.color AS role_color, ar.icon AS role_icon
    FROM admin_user_roles aur
    JOIN admin_roles ar ON ar.id = aur.role_id
    ORDER BY aur.assigned_at ASC
  `).all()

  // Regrouper les rôles par admin
  const rolesByUser: Record<string, any[]> = {}
  for (const r of (userRoles.results as any[])) {
    if (!rolesByUser[r.admin_user_id]) rolesByUser[r.admin_user_id] = []
    rolesByUser[r.admin_user_id].push({
      id:          r.role_id,
      label:       r.role_label,
      color:       r.role_color,
      icon:        r.role_icon,
      assigned_at: r.assigned_at
    })
  }

  const result = (users.results as any[]).map(u => ({
    ...u,
    roles: rolesByUser[u.id] || []
  }))

  return c.json({ users: result })
})

// ── POST /api/admin/admin-users ──────────────────────────────
// Créer un nouveau compte admin
rolesRouter.post('/admin-users', requirePermission('admin_users.create'), async (c) => {
  try {
    const adminId = await getAdminId(c)
    const body    = await c.req.json() as any

    if (!body.email?.trim() || !body.name?.trim() || !body.password?.trim()) {
      return c.json({ error: 'Email, nom et mot de passe sont requis' }, 400)
    }

    if (body.password.length < 8) {
      return c.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, 400)
    }

    // Vérifier que l'email n'existe pas déjà
    const existing = await c.env.DB.prepare(
      `SELECT id FROM admin_users WHERE email = ?`
    ).bind(body.email.trim().toLowerCase()).first()
    if (existing) return c.json({ error: 'Cet email est déjà utilisé par un autre admin' }, 409)

    const newId  = generateId()
    const pwHash = await hashPassword(body.password)

    await c.env.DB.prepare(`
      INSERT INTO admin_users (id, email, name, password_hash, role)
      VALUES (?, ?, ?, ?, 'admin')
    `).bind(newId, body.email.trim().toLowerCase(), body.name.trim(), pwHash).run()

    // Attribuer les rôles initiaux si fournis
    if (Array.isArray(body.roles) && body.roles.length > 0) {
      for (const roleId of body.roles) {
        const roleExists = await c.env.DB.prepare(
          `SELECT id FROM admin_roles WHERE id = ?`
        ).bind(roleId).first()
        if (roleExists) {
          await c.env.DB.prepare(`
            INSERT OR IGNORE INTO admin_user_roles (admin_user_id, role_id, assigned_by)
            VALUES (?, ?, ?)
          `).bind(newId, roleId, adminId).run()
        }
      }
    }

    return c.json({ success: true, id: newId }, 201)
  } catch (err: any) {
    console.error('[POST /admin-users] Erreur:', err)
    return c.json({
      error: 'Erreur lors de la création : ' + (err?.message || String(err))
    }, 500)
  }
})

// ── PATCH /api/admin/admin-users/:id ────────────────────────
// Modifier nom, email ou mot de passe d'un admin
rolesRouter.patch('/admin-users/:id', requirePermission('admin_users.edit'), async (c) => {
  const targetId = c.req.param('id')
  const adminId  = await getAdminId(c)
  const body     = await c.req.json() as any

  const user = await c.env.DB.prepare(
    `SELECT id, email FROM admin_users WHERE id = ?`
  ).bind(targetId).first() as any
  if (!user) return c.json({ error: 'Admin introuvable' }, 404)

  const updates: string[] = []
  const values: any[]    = []

  if (body.name?.trim())  { updates.push('name=?');          values.push(body.name.trim()) }
  if (body.email?.trim()) { updates.push('email=?');         values.push(body.email.trim().toLowerCase()) }
  if (body.password)      {
    const hash = await hashPassword(body.password)
    updates.push('password_hash=?')
    values.push(hash)
  }

  if (updates.length === 0) return c.json({ error: 'Aucune modification fournie' }, 400)

  values.push(targetId)
  await c.env.DB.prepare(
    `UPDATE admin_users SET ${updates.join(',')} WHERE id=?`
  ).bind(...values).run()

  return c.json({ success: true })
})

// ── DELETE /api/admin/admin-users/:id ───────────────────────
// Supprimer un admin (interdit si dernier super_admin)
rolesRouter.delete('/admin-users/:id', requirePermission('admin_users.delete'), async (c) => {
  const targetId = c.req.param('id')
  const adminId  = await getAdminId(c)

  if (targetId === adminId) {
    return c.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, 403)
  }

  // Vérifier que ce n'est pas le dernier super_admin
  const isSA = await c.env.DB.prepare(`
    SELECT COUNT(*) AS cnt FROM admin_user_roles WHERE role_id='super_admin'
  `).first() as any

  const targetIsSA = await c.env.DB.prepare(`
    SELECT COUNT(*) AS cnt FROM admin_user_roles
    WHERE admin_user_id=? AND role_id='super_admin'
  `).bind(targetId).first() as any

  if (targetIsSA?.cnt > 0 && isSA?.cnt <= 1) {
    return c.json({ error: 'Impossible : dernier super_admin actif' }, 403)
  }

  invalidatePermCache(targetId)
  await c.env.DB.prepare(`DELETE FROM admin_users WHERE id=?`).bind(targetId).run()
  return c.json({ success: true })
})

// ── POST /api/admin/admin-users/:id/roles ───────────────────
// Attribuer un rôle à un admin
rolesRouter.post('/admin-users/:id/roles', requirePermission('admin_users.edit'), async (c) => {
  const targetId = c.req.param('id')
  const adminId  = await getAdminId(c)
  const body     = await c.req.json() as any

  if (!body.role_id) return c.json({ error: 'role_id requis' }, 400)

  // Un non-super_admin ne peut pas attribuer le rôle super_admin
  const assignerPerms = await c.env.DB.prepare(`
    SELECT role_id FROM admin_user_roles WHERE admin_user_id=?
  `).bind(adminId).all()
  const assignerIsSA = (assignerPerms.results as any[]).some(r => r.role_id === 'super_admin')

  if (body.role_id === 'super_admin' && !assignerIsSA) {
    return c.json({ error: 'Seul un super_admin peut attribuer ce rôle' }, 403)
  }

  const roleExists = await c.env.DB.prepare(
    `SELECT id FROM admin_roles WHERE id=?`
  ).bind(body.role_id).first()
  if (!roleExists) return c.json({ error: 'Rôle introuvable' }, 404)

  await c.env.DB.prepare(`
    INSERT OR IGNORE INTO admin_user_roles (admin_user_id, role_id, assigned_by)
    VALUES (?, ?, ?)
  `).bind(targetId, body.role_id, adminId).run()

  invalidatePermCache(targetId)
  return c.json({ success: true })
})

// ── DELETE /api/admin/admin-users/:id/roles/:roleId ─────────
// Retirer un rôle à un admin
rolesRouter.delete('/admin-users/:id/roles/:roleId', requirePermission('admin_users.edit'), async (c) => {
  const targetId = c.req.param('id')
  const roleId   = c.req.param('roleId')
  const adminId  = await getAdminId(c)

  // Empêcher de retirer super_admin si c'est le dernier
  if (roleId === 'super_admin') {
    const count = await c.env.DB.prepare(`
      SELECT COUNT(*) AS cnt FROM admin_user_roles WHERE role_id='super_admin'
    `).first() as any
    if (count?.cnt <= 1) {
      return c.json({ error: 'Impossible : dernier super_admin actif' }, 403)
    }
  }

  await c.env.DB.prepare(`
    DELETE FROM admin_user_roles WHERE admin_user_id=? AND role_id=?
  `).bind(targetId, roleId).run()

  invalidatePermCache(targetId)
  return c.json({ success: true })
})

// ── GET /api/admin/my-permissions ───────────────────────────
// Retourne les permissions de l'admin connecté (utilisé par le frontend)
rolesRouter.get('/my-permissions', async (c) => {
  const adminId = await getAdminId(c)

  const roleRows = await c.env.DB.prepare(`
    SELECT aur.role_id, ar.label, ar.color, ar.icon, ar.is_system
    FROM admin_user_roles aur
    JOIN admin_roles ar ON ar.id = aur.role_id
    WHERE aur.admin_user_id = ?
  `).bind(adminId).all()

  const roles = roleRows.results as any[]
  const isSuperAdmin = roles.some(r => r.role_id === 'super_admin')

  let permissions: string[] = []
  if (!isSuperAdmin) {
    const permRows = await c.env.DB.prepare(`
      SELECT DISTINCT arp.permission
      FROM admin_user_roles aur
      JOIN admin_role_permissions arp ON arp.role_id = aur.role_id
      WHERE aur.admin_user_id = ?
    `).bind(adminId).all()
    permissions = (permRows.results as any[]).map(r => r.permission)
  } else {
    permissions = Object.keys(ALL_PERMISSIONS)
  }

  return c.json({
    roles: roles.map(r => ({
      id: r.role_id, label: r.label, color: r.color, icon: r.icon
    })),
    permissions,
    is_super_admin: isSuperAdmin
  })
})

export default rolesRouter
