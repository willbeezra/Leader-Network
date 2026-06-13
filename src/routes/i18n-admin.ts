// ============================================================
// routes/i18n-admin.ts — Gestion des langues i18n (admin)
// ============================================================
import { Hono } from 'hono'
import type { Bindings } from '../types/index.js'

const router = new Hono<{ Bindings: Bindings }>()

// ── GET /api/i18n/languages — public, utilisé par i18n.js ───────────────────
// Retourne toutes les langues actives (sans auth)
router.get('/languages', async (c) => {
  const db = (c.env as any)?.DB as D1Database
  if (!db) return c.json({ languages: [] })
  try {
    const { results } = await db.prepare(
      `SELECT code, name, flag, sort_order
       FROM i18n_languages
       WHERE is_active = 1
       ORDER BY sort_order ASC, name ASC`
    ).all()
    return c.json({ languages: results || [] })
  } catch {
    return c.json({ languages: [] })
  }
})

// ── GET /api/admin/i18n/languages — toutes les langues (admin) ───────────────
router.get('/admin/languages', async (c) => {
  const db = (c.env as any)?.DB as D1Database
  try {
    const { results } = await db.prepare(
      `SELECT * FROM i18n_languages ORDER BY sort_order ASC, name ASC`
    ).all()
    return c.json({ languages: results || [] })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// ── POST /api/admin/i18n/languages — créer une nouvelle langue ───────────────
router.post('/admin/languages', async (c) => {
  const db = (c.env as any)?.DB as D1Database
  try {
    const body = await c.req.json()
    const { code, name, flag, is_active, sort_order } = body

    if (!code || !name) return c.json({ error: 'code et name requis' }, 400)

    const codeClean = code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (!codeClean) return c.json({ error: 'Code invalide' }, 400)

    await db.prepare(
      `INSERT INTO i18n_languages (code, name, flag, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      codeClean,
      name.trim(),
      (flag || '🌐').trim(),
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      sort_order || 100
    ).run()

    const row = await db.prepare(
      `SELECT * FROM i18n_languages WHERE code = ?`
    ).bind(codeClean).first()

    return c.json({ ok: true, language: row })
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE')) {
      return c.json({ error: 'Ce code de langue existe déjà' }, 409)
    }
    return c.json({ error: String(err) }, 500)
  }
})

// ── PUT /api/admin/i18n/languages/:id — modifier une langue ──────────────────
router.put('/admin/languages/:id', async (c) => {
  const db = (c.env as any)?.DB as D1Database
  const id = Number(c.req.param('id'))
  try {
    const body = await c.req.json()
    const { name, flag, is_active, sort_order } = body

    await db.prepare(
      `UPDATE i18n_languages
       SET name = COALESCE(?, name),
           flag = COALESCE(?, flag),
           is_active = COALESCE(?, is_active),
           sort_order = COALESCE(?, sort_order),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(
      name?.trim() || null,
      flag?.trim() || null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      sort_order !== undefined ? Number(sort_order) : null,
      id
    ).run()

    const row = await db.prepare(
      `SELECT * FROM i18n_languages WHERE id = ?`
    ).bind(id).first()

    return c.json({ ok: true, language: row })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// ── PATCH /api/admin/i18n/languages/:id/toggle — activer/désactiver ──────────
router.patch('/admin/languages/:id/toggle', async (c) => {
  const db = (c.env as any)?.DB as D1Database
  const id = Number(c.req.param('id'))
  try {
    // Empêcher de désactiver le français (langue source)
    const row = await db.prepare(
      `SELECT * FROM i18n_languages WHERE id = ?`
    ).bind(id).first() as any

    if (!row) return c.json({ error: 'Langue introuvable' }, 404)
    if (row.code === 'fr') return c.json({ error: 'Impossible de désactiver le français (langue source)' }, 400)

    const newActive = row.is_active ? 0 : 1
    await db.prepare(
      `UPDATE i18n_languages SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(newActive, id).run()

    return c.json({ ok: true, is_active: newActive })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// ── DELETE /api/admin/i18n/languages/:id — supprimer une langue ──────────────
router.delete('/admin/languages/:id', async (c) => {
  const db = (c.env as any)?.DB as D1Database
  const id = Number(c.req.param('id'))
  try {
    const row = await db.prepare(
      `SELECT code FROM i18n_languages WHERE id = ?`
    ).bind(id).first() as any

    if (!row) return c.json({ error: 'Langue introuvable' }, 404)
    if (row.code === 'fr') return c.json({ error: 'Impossible de supprimer le français' }, 400)

    await db.prepare(
      `DELETE FROM i18n_languages WHERE id = ?`
    ).bind(id).run()

    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// ── GET /api/admin/i18n/cache-stats — stats du cache KV ─────────────────────
router.get('/admin/cache-stats', async (c) => {
  const env = c.env as any
  const i18nKV: KVNamespace | undefined = env?.I18N_KV
  if (!i18nKV) return c.json({ error: 'I18N_KV non configuré' }, 503)
  try {
    const list = await i18nKV.list({ prefix: 'i18n:' })
    const byLang: Record<string, number> = {}
    for (const key of list.keys) {
      const parts = key.name.split(':')
      if (parts[1]) byLang[parts[1]] = (byLang[parts[1]] || 0) + 1
    }
    return c.json({ total: list.keys.length, by_lang: byLang })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// ── DELETE /api/admin/i18n/cache/:lang — vider le cache KV d'une langue ──────
router.delete('/admin/cache/:lang', async (c) => {
  const env = c.env as any
  const i18nKV: KVNamespace | undefined = env?.I18N_KV
  const lang = c.req.param('lang')
  if (!i18nKV) return c.json({ error: 'I18N_KV non configuré' }, 503)
  try {
    const list = await i18nKV.list({ prefix: `i18n:${lang}:` })
    await Promise.all(list.keys.map(k => i18nKV.delete(k.name)))
    return c.json({ ok: true, deleted: list.keys.length })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

export { router as i18nRouter }
