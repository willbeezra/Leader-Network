import { Hono } from 'hono'

const campus = new Hono<{ Bindings: CloudflareBindings }>()

// ============================================================
// ROUTES MEMBRE — Campus
// ============================================================

// GET /campus — catalogue complet
campus.get('/', async (c) => {
  const db = c.env.DB
  const memberId = (c.get('memberId' as any) as string) || null

  const categories = await db.prepare(`
    SELECT id, name, slug, description, color, icon, display_order
    FROM campus_categories
    WHERE is_active = 1
    ORDER BY display_order ASC
  `).all()

  const courses = await db.prepare(`
    SELECT c.id, c.category_id, c.title, c.slug, c.subtitle, c.instructor,
           c.thumbnail_url, c.is_free, c.price_usd, c.total_lessons,
           c.total_duration_minutes, c.level, c.language, c.display_order,
           c.is_featured, c.access_type, c.required_package_id,
           cat.name AS category_name, cat.color AS category_color,
           cat.slug AS category_slug
    FROM campus_courses c
    LEFT JOIN campus_categories cat ON cat.id = c.category_id
    WHERE c.is_active = 1
    ORDER BY cat.display_order ASC, c.display_order ASC
  `).all()

  // Vérification accès Campus via package_service_access (service_id = 1 = Campus)
  // Un membre a accès si au moins un de ses packages validés a is_enabled=1 pour Campus
  let hasCampusAccess = false
  if (memberId) {
    const accessCheck = await db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM package_service_access psa
      JOIN package_orders po ON po.package_id = psa.package_id
      WHERE po.member_id = ?
        AND po.status = 'validated'
        AND psa.service_id = 1
        AND psa.is_enabled = 1
    `).bind(memberId).first() as any
    hasCampusAccess = (accessCheck?.cnt || 0) > 0
  }

  // Progress si connecté
  let progressMap: Record<string, number> = {}
  if (memberId) {
    const progress = await db.prepare(`
      SELECT course_id,
             ROUND(100.0 * SUM(completed) / NULLIF(COUNT(*), 0), 0) AS pct
      FROM campus_progress
      WHERE member_id = ?
      GROUP BY course_id
    `).bind(memberId).all()
    for (const p of (progress.results as any[])) {
      progressMap[p.course_id] = p.pct || 0
    }
  }

  const coursesWithProgress = (courses.results as any[]).map(course => ({
    ...course,
    progress: progressMap[course.id] || 0,
    has_access: hasCampusAccess
  }))

  // ── Configs landing Campus depuis landing_config ──────────────────────────
  const configRows = await db.prepare(`
    SELECT key, value FROM landing_config WHERE key LIKE 'campus_%'
  `).all()
  const cfg: Record<string, string> = {}
  for (const r of (configRows.results as any[])) cfg[r.key] = r.value

  // ── Logo détouré Campus depuis landing_services (id=1) ───────────────────
  const campusService = await db.prepare(`
    SELECT logo_data_uri, logo_url FROM landing_services WHERE id = 1
  `).first() as any
  const campusLogoUri = campusService?.logo_data_uri || campusService?.logo_url || null

  return c.json({
    categories: categories.results,
    courses: coursesWithProgress,
    has_campus_access: hasCampusAccess,
    config: cfg,
    campus_logo: campusLogoUri
  })
})

// GET /campus/course/:slug — détail formation
campus.get('/course/:slug', async (c) => {
  const db = c.env.DB
  const slug = c.req.param('slug')
  const memberId = (c.get('memberId' as any) as string) || null

  const course = await db.prepare(`
    SELECT c.*, cat.name AS category_name, cat.color AS category_color, cat.slug AS category_slug
    FROM campus_courses c
    LEFT JOIN campus_categories cat ON cat.id = c.category_id
    WHERE c.slug = ? AND c.is_active = 1
  `).bind(slug).first()

  if (!course) return c.json({ error: 'Formation non trouvée' }, 404)

  // Vérification accès Campus via package_service_access (service_id = 1 = Campus)
  let hasAccess = false
  if (memberId) {
    const accessCheck = await db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM package_service_access psa
      JOIN package_orders po ON po.package_id = psa.package_id
      WHERE po.member_id = ?
        AND po.status = 'validated'
        AND psa.service_id = 1
        AND psa.is_enabled = 1
    `).bind(memberId).first() as any
    hasAccess = (accessCheck?.cnt || 0) > 0
  }

  // Récupérer infos package requis si applicable (conservé pour compatibilité UI)
  let requiredPackage = null

  const modules = await db.prepare(`
    SELECT m.id, m.title, m.description, m.display_order
    FROM campus_modules m
    WHERE m.course_id = ? AND m.is_active = 1
    ORDER BY m.display_order ASC
  `).bind((course as any).id).all()

  const lessons = await db.prepare(`
    SELECT l.id, l.module_id, l.title, l.description, l.video_url, l.video_type,
           l.duration_seconds, l.duration_label, l.display_order, l.is_free
    FROM campus_lessons l
    WHERE l.course_id = ? AND l.is_active = 1
    ORDER BY l.module_id, l.display_order ASC
  `).bind((course as any).id).all()

  // Progress leçons si connecté
  let lessonProgress: Record<string, any> = {}
  if (memberId) {
    const prog = await db.prepare(`
      SELECT lesson_id, completed, progress_seconds
      FROM campus_progress
      WHERE member_id = ? AND course_id = ?
    `).bind(memberId, (course as any).id).all()
    for (const p of (prog.results as any[])) {
      lessonProgress[p.lesson_id] = p
    }
  }

  // Agréger leçons par module — si pas d'accès, masquer video_url
  const modulesWithLessons = (modules.results as any[]).map(mod => ({
    ...mod,
    lessons: (lessons.results as any[])
      .filter(l => l.module_id === mod.id)
      .map(l => ({
        ...l,
        video_url: hasAccess || l.is_free ? l.video_url : null,
        completed: lessonProgress[l.id]?.completed || 0,
        progress_seconds: lessonProgress[l.id]?.progress_seconds || 0
      }))
  }))

  return c.json({ course: { ...course, has_access: hasAccess, required_package: requiredPackage }, modules: modulesWithLessons })
})

// POST /campus/lesson/:id/progress — sauvegarder progression
campus.post('/lesson/:id/progress', async (c) => {
  const db = c.env.DB
  const lessonId = c.req.param('id')
  const memberId = (c.get('memberId' as any) as string)
  if (!memberId) return c.json({ error: 'Non authentifié' }, 401)

  const { completed, progress_seconds } = await c.req.json()

  const lesson = await db.prepare(`
    SELECT course_id FROM campus_lessons WHERE id = ?
  `).bind(lessonId).first() as any
  if (!lesson) return c.json({ error: 'Leçon non trouvée' }, 404)

  await db.prepare(`
    INSERT INTO campus_progress (id, member_id, course_id, lesson_id, completed, progress_seconds, completed_at, updated_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(member_id, lesson_id) DO UPDATE SET
      completed = excluded.completed,
      progress_seconds = excluded.progress_seconds,
      completed_at = CASE WHEN excluded.completed = 1 THEN datetime('now') ELSE completed_at END,
      updated_at = datetime('now')
  `).bind(
    memberId, lesson.course_id, lessonId,
    completed ? 1 : 0,
    progress_seconds || 0,
    completed ? new Date().toISOString() : null
  ).run()

  return c.json({ success: true })
})

// GET /campus/my-progress — progression globale membre
campus.get('/my-progress', async (c) => {
  const db = c.env.DB
  const memberId = (c.get('memberId' as any) as string)
  if (!memberId) return c.json({ courses: [] })

  const progress = await db.prepare(`
    SELECT cp.course_id, c.title, c.slug, c.thumbnail_url,
           COUNT(cp.id) AS total_started,
           SUM(cp.completed) AS total_completed,
           cl_total.cnt AS total_lessons,
           ROUND(100.0 * SUM(cp.completed) / NULLIF(cl_total.cnt, 0), 0) AS pct
    FROM campus_progress cp
    JOIN campus_courses c ON c.id = cp.course_id
    LEFT JOIN (
      SELECT course_id, COUNT(*) AS cnt FROM campus_lessons WHERE is_active = 1 GROUP BY course_id
    ) cl_total ON cl_total.course_id = cp.course_id
    WHERE cp.member_id = ?
    GROUP BY cp.course_id
    ORDER BY pct DESC
  `).bind(memberId).all()

  return c.json({ courses: progress.results })
})

// ============================================================
// ROUTES ADMIN — Campus CRUD
// ============================================================

// GET /campus/admin/categories
campus.get('/admin/categories', async (c) => {
  const db = c.env.DB
  const cats = await db.prepare(`
    SELECT c.*, 
           (SELECT COUNT(*) FROM campus_courses WHERE category_id = c.id AND is_active = 1) AS course_count
    FROM campus_categories c
    ORDER BY c.display_order ASC
  `).all()
  return c.json(cats.results)
})

// POST /campus/admin/categories
campus.post('/admin/categories', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const { name, slug, description, color, icon, display_order } = body
  if (!name || !slug) return c.json({ error: 'name et slug requis' }, 400)

  const id = 'cat-' + Math.random().toString(36).substring(2, 10)
  await db.prepare(`
    INSERT INTO campus_categories (id, name, slug, description, color, icon, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, name, slug, description || null, color || '#791E15', icon || 'fa-graduation-cap', display_order || 0).run()

  return c.json({ success: true, id })
})

// PUT /campus/admin/categories/:id
campus.put('/admin/categories/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  const { name, slug, description, color, icon, display_order, is_active } = body

  await db.prepare(`
    UPDATE campus_categories SET
      name = COALESCE(?, name),
      slug = COALESCE(?, slug),
      description = ?,
      color = COALESCE(?, color),
      icon = COALESCE(?, icon),
      display_order = COALESCE(?, display_order),
      is_active = COALESCE(?, is_active),
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(name, slug, description, color, icon, display_order, is_active, id).run()

  return c.json({ success: true })
})

// DELETE /campus/admin/categories/:id
campus.delete('/admin/categories/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  await db.prepare(`UPDATE campus_categories SET is_active = 0 WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

// ============================================================
// ADMIN — Cours CRUD
// ============================================================

// GET /campus/admin/courses
campus.get('/admin/courses', async (c) => {
  const db = c.env.DB
  const categoryId = c.req.query('category_id')

  let query = `
    SELECT c.*, cat.name AS category_name, cat.color AS category_color,
           (SELECT COUNT(*) FROM campus_modules WHERE course_id = c.id) AS module_count,
           (SELECT COUNT(*) FROM campus_lessons WHERE course_id = c.id AND is_active = 1) AS lesson_count_real
    FROM campus_courses c
    LEFT JOIN campus_categories cat ON cat.id = c.category_id
    WHERE 1=1
  `
  const params: any[] = []
  if (categoryId) { query += ` AND c.category_id = ?`; params.push(categoryId) }
  query += ` ORDER BY cat.display_order ASC, c.display_order ASC`

  const courses = await db.prepare(query).bind(...params).all()
  return c.json(courses.results)
})

// POST /campus/admin/courses
campus.post('/admin/courses', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const {
    category_id, title, slug, subtitle, description, instructor, instructor_bio,
    thumbnail_url, trailer_url, trailer_type, price_usd, is_free, is_featured,
    display_order, level, language, tags, meta_title, meta_description
  } = body
  if (!title || !slug) return c.json({ error: 'title et slug requis' }, 400)

  const { access_type, required_package_id } = body
  const id = 'course-' + Math.random().toString(36).substring(2, 12)
  await db.prepare(`
    INSERT INTO campus_courses (id, category_id, title, slug, subtitle, description, instructor, instructor_bio,
      thumbnail_url, trailer_url, trailer_type, price_usd, is_free, is_featured, display_order, level, language, tags, meta_title, meta_description, access_type, required_package_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, category_id || null, title, slug, subtitle || null, description || null,
    instructor || null, instructor_bio || null, thumbnail_url || null,
    trailer_url || null, trailer_type || 'youtube',
    price_usd || 0, is_free !== false ? 1 : 0, is_featured ? 1 : 0,
    display_order || 0, level || 'all', language || 'fr',
    tags ? JSON.stringify(tags) : null, meta_title || null, meta_description || null,
    access_type || 'all', required_package_id || null
  ).run()

  return c.json({ success: true, id })
})

// PUT /campus/admin/courses/:id
campus.put('/admin/courses/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()

  const fields: string[] = []
  const values: any[] = []
  const allowed = [
    'category_id','title','slug','subtitle','description','instructor','instructor_bio',
    'thumbnail_url','trailer_url','trailer_type','price_usd','is_free','is_featured',
    'is_active','display_order','level','language','tags','meta_title','meta_description',
    'access_type','required_package_id'
  ]
  for (const key of allowed) {
    if (key in body) {
      fields.push(`${key} = ?`)
      values.push(key === 'tags' && Array.isArray(body[key]) ? JSON.stringify(body[key]) : body[key])
    }
  }
  if (!fields.length) return c.json({ error: 'Aucun champ à mettre à jour' }, 400)
  fields.push(`updated_at = datetime('now')`)
  values.push(id)

  await db.prepare(`UPDATE campus_courses SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
  return c.json({ success: true })
})

// DELETE /campus/admin/courses/:id
campus.delete('/admin/courses/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  await db.prepare(`UPDATE campus_courses SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

// ============================================================
// ADMIN — Modules CRUD
// ============================================================

// GET /campus/admin/modules/:courseId
campus.get('/admin/modules/:courseId', async (c) => {
  const db = c.env.DB
  const courseId = c.req.param('courseId')
  const modules = await db.prepare(`
    SELECT m.*,
           (SELECT COUNT(*) FROM campus_lessons WHERE module_id = m.id AND is_active = 1) AS lesson_count
    FROM campus_modules m
    WHERE m.course_id = ? AND m.is_active = 1
    ORDER BY m.display_order ASC
  `).bind(courseId).all()
  return c.json(modules.results)
})

// POST /campus/admin/modules
campus.post('/admin/modules', async (c) => {
  const db = c.env.DB
  const { course_id, title, description, display_order } = await c.req.json()
  if (!course_id || !title) return c.json({ error: 'course_id et title requis' }, 400)
  const id = 'mod-' + Math.random().toString(36).substring(2, 12)
  await db.prepare(`INSERT INTO campus_modules (id, course_id, title, description, display_order) VALUES (?,?,?,?,?)`)
    .bind(id, course_id, title, description || null, display_order || 0).run()
  return c.json({ success: true, id })
})

// PUT /campus/admin/modules/:id
campus.put('/admin/modules/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { title, description, display_order, is_active } = await c.req.json()
  await db.prepare(`
    UPDATE campus_modules SET
      title = COALESCE(?, title), description = ?,
      display_order = COALESCE(?, display_order),
      is_active = COALESCE(?, is_active),
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(title, description, display_order, is_active, id).run()
  return c.json({ success: true })
})

// DELETE /campus/admin/modules/:id
campus.delete('/admin/modules/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  await db.prepare(`UPDATE campus_modules SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

// ============================================================
// ADMIN — Leçons CRUD
// ============================================================

// GET /campus/admin/lessons/:moduleId
campus.get('/admin/lessons/:moduleId', async (c) => {
  const db = c.env.DB
  const moduleId = c.req.param('moduleId')
  const lessons = await db.prepare(`
    SELECT * FROM campus_lessons
    WHERE module_id = ? AND is_active = 1
    ORDER BY display_order ASC
  `).bind(moduleId).all()
  return c.json(lessons.results)
})

// POST /campus/admin/lessons
campus.post('/admin/lessons', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const { module_id, course_id, title, description, video_url, video_type, duration_seconds, duration_label, display_order, is_free, transcript, resources } = body
  if (!module_id || !course_id || !title) return c.json({ error: 'module_id, course_id, title requis' }, 400)
  const id = 'lesson-' + Math.random().toString(36).substring(2, 14)
  await db.prepare(`
    INSERT INTO campus_lessons (id, module_id, course_id, title, description, video_url, video_type, duration_seconds, duration_label, display_order, is_free, transcript, resources)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, module_id, course_id, title, description || null,
    video_url || null, video_type || 'youtube',
    duration_seconds || 0, duration_label || null,
    display_order || 0, is_free !== false ? 1 : 0,
    transcript || null, resources ? JSON.stringify(resources) : null
  ).run()

  // Mettre à jour total_lessons du cours
  await db.prepare(`
    UPDATE campus_courses SET total_lessons = (
      SELECT COUNT(*) FROM campus_lessons WHERE course_id = ? AND is_active = 1
    ), updated_at = datetime('now') WHERE id = ?
  `).bind(course_id, course_id).run()

  return c.json({ success: true, id })
})

// PUT /campus/admin/lessons/:id
campus.put('/admin/lessons/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()

  const fields: string[] = []
  const values: any[] = []
  const allowed = ['title','description','video_url','video_type','duration_seconds','duration_label','display_order','is_free','is_active','transcript','resources']
  for (const key of allowed) {
    if (key in body) {
      fields.push(`${key} = ?`)
      values.push(key === 'resources' && Array.isArray(body[key]) ? JSON.stringify(body[key]) : body[key])
    }
  }
  if (!fields.length) return c.json({ error: 'Aucun champ' }, 400)
  fields.push(`updated_at = datetime('now')`)
  values.push(id)

  await db.prepare(`UPDATE campus_lessons SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()

  // Sync total_lessons si changement is_active
  if ('is_active' in body) {
    const lesson = await db.prepare(`SELECT course_id FROM campus_lessons WHERE id = ?`).bind(id).first() as any
    if (lesson) {
      await db.prepare(`
        UPDATE campus_courses SET total_lessons = (
          SELECT COUNT(*) FROM campus_lessons WHERE course_id = ? AND is_active = 1
        ), updated_at = datetime('now') WHERE id = ?
      `).bind(lesson.course_id, lesson.course_id).run()
    }
  }

  return c.json({ success: true })
})

// DELETE /campus/admin/lessons/:id
campus.delete('/admin/lessons/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const lesson = await db.prepare(`SELECT course_id FROM campus_lessons WHERE id = ?`).bind(id).first() as any
  await db.prepare(`UPDATE campus_lessons SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).bind(id).run()
  if (lesson) {
    await db.prepare(`
      UPDATE campus_courses SET total_lessons = (
        SELECT COUNT(*) FROM campus_lessons WHERE course_id = ? AND is_active = 1
      ), updated_at = datetime('now') WHERE id = ?
    `).bind(lesson.course_id, lesson.course_id).run()
  }
  return c.json({ success: true })
})

// GET /campus/admin/packages — liste packages pour dropdown admin
campus.get('/admin/packages', async (c) => {
  const db = c.env.DB
  const packages = await db.prepare(`
    SELECT id, name, slug, price_usd
    FROM packages
    WHERE is_active = 1 AND deleted_at IS NULL
    ORDER BY display_order ASC, name ASC
  `).all()
  return c.json(packages.results)
})

// GET /campus/admin/stats — statistiques globales
campus.get('/admin/stats', async (c) => {
  const db = c.env.DB
  const stats = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM campus_categories WHERE is_active = 1) AS total_categories,
      (SELECT COUNT(*) FROM campus_courses WHERE is_active = 1) AS total_courses,
      (SELECT COUNT(*) FROM campus_modules WHERE is_active = 1) AS total_modules,
      (SELECT COUNT(*) FROM campus_lessons WHERE is_active = 1) AS total_lessons,
      (SELECT COUNT(DISTINCT member_id) FROM campus_progress) AS total_learners,
      (SELECT COUNT(*) FROM campus_progress WHERE completed = 1) AS total_completions
  `).first()
  return c.json(stats)
})

// GET /campus/admin/course-full/:id — cours complet avec modules + leçons
campus.get('/admin/course-full/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')

  const course = await db.prepare(`
    SELECT c.*, cat.name AS category_name
    FROM campus_courses c
    LEFT JOIN campus_categories cat ON cat.id = c.category_id
    WHERE c.id = ?
  `).bind(id).first()

  if (!course) return c.json({ error: 'Cours non trouvé' }, 404)

  const modules = await db.prepare(`
    SELECT * FROM campus_modules WHERE course_id = ? ORDER BY display_order ASC
  `).bind(id).all()

  const lessons = await db.prepare(`
    SELECT * FROM campus_lessons WHERE course_id = ? ORDER BY module_id, display_order ASC
  `).bind(id).all()

  const modulesWithLessons = (modules.results as any[]).map(mod => ({
    ...mod,
    lessons: (lessons.results as any[]).filter(l => l.module_id === mod.id)
  }))

  return c.json({ course, modules: modulesWithLessons })
})

export { campus }
