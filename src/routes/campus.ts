import { Hono } from 'hono'
import { walletOperation, createNotification } from '../lib/mlm.js'

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
           c.is_featured,
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

  // ── Accès par achat direct formation (campus_course_orders validées) ────
  let memberPurchasedCourseIds: Set<string> = new Set()
  if (memberId) {
    const purchasedCourses = await db.prepare(`
      SELECT course_id FROM campus_course_orders
      WHERE member_id = ? AND status = 'validated'
    `).bind(memberId).all()
    for (const p of (purchasedCourses.results as any[])) {
      memberPurchasedCourseIds.add(p.course_id)
    }
  }

  // ── Accès par formation via campus_course_packages ──────────────────────
  // Pour chaque cours, on vérifie si le membre possède un package autorisé
  // Set des package_ids validés du membre
  let memberPackageIds: Set<string> = new Set()
  if (memberId) {
    const memberPkgs = await db.prepare(`
      SELECT package_id FROM package_orders
      WHERE member_id = ? AND status IN ('validated', 'active')
    `).bind(memberId).all()
    for (const p of (memberPkgs.results as any[])) {
      memberPackageIds.add(p.package_id)
    }
  }

  // Récupérer tous les packages autorisés par formation (en une seule requête)
  const coursePackagesRows = await db.prepare(`
    SELECT ccp.course_id, ccp.package_id, p.name AS package_name, p.price_usd AS package_price
    FROM campus_course_packages ccp
    JOIN packages p ON p.id = ccp.package_id
    ORDER BY ccp.course_id
  `).all()

  // Map : course_id → liste de packages autorisés
  const coursePackagesMap: Record<string, any[]> = {}
  for (const row of (coursePackagesRows.results as any[])) {
    if (!coursePackagesMap[row.course_id]) coursePackagesMap[row.course_id] = []
    coursePackagesMap[row.course_id].push(row)
  }

  const coursesWithProgress = (courses.results as any[]).map(course => {
    const allowedPackages = coursePackagesMap[course.id] || []

    // ── Règles d'accès (priorité décroissante) ──────────────────────────────
    //
    // 1. GRATUITE  : is_free = 1  → tout le monde accède (status: 'free')
    //
    // 2. PAYANTE   : is_free = 0 ET price_usd > 0
    //    a) Si packages liés définis → accès SEULEMENT si membre possède un de ces packages
    //       Sinon → status 'priced' (achat requis)
    //    b) Si AUCUN package lié → formation payante à l'unité :
    //       - L'accès Campus global NE donne PAS accès (formation hors catalogue inclus)
    //       - status 'priced' toujours (sauf si achat individuel futur)
    //
    // 3. VERROUILLÉE : is_free = 0 ET price_usd = 0 ET pas de package lié possédé
    //    → status 'locked'
    //
    // 4. INCLUSE (accès global Campus) : is_free = 0, price_usd = 0, aucun package lié
    //    → le membre avec hasCampusAccess y accède (formation comprise dans Campus)
    //
    // Résumé : si price_usd > 0 → jamais inclus via accès global seul
    // ──────────────────────────────────────────────────────────────────────

    const memberHasLinkedPackage = allowedPackages.length > 0 && memberId
      ? allowedPackages.some((p: any) => memberPackageIds.has(p.package_id))
      : false

    // Est-ce une formation payante (prix explicitement défini) ?
    const isPriced = course.is_free !== 1 && course.price_usd > 0

    // access_status : 'included' | 'free' | 'priced' | 'locked'
    let accessStatus: string

    if (course.is_free === 1) {
      // Cas 1 : formation gratuite
      accessStatus = 'free'
    } else if (memberPurchasedCourseIds.has(course.id)) {
      // Cas 0 : achat direct validé → inclus (priorité absolue)
      accessStatus = 'included'
    } else if (memberHasLinkedPackage) {
      // Cas 2a : membre possède un package lié → inclus
      accessStatus = 'included'
    } else if (isPriced) {
      // Cas 2b : formation payante, membre n'a pas le bon package → achat requis
      accessStatus = 'priced'
    } else if (allowedPackages.length === 0 && hasCampusAccess) {
      // Cas 4 : formation gratuite dans Campus (price=0, is_free=0) + accès global
      accessStatus = 'included'
    } else {
      // Cas 3 : verrouillée
      accessStatus = 'locked'
    }

    const courseAccess = accessStatus === 'included' || accessStatus === 'free'

    // Package à acheter si la formation est payante et a des packages définis
    // → on prend le moins cher des packages non possédés
    const buyPackage = accessStatus === 'priced' && allowedPackages.length > 0
      ? allowedPackages
          .filter((p: any) => !memberPackageIds.has(p.package_id))
          .sort((a: any, b: any) => (a.package_price || 0) - (b.package_price || 0))[0] || allowedPackages[0]
      : null

    return {
      ...course,
      progress: progressMap[course.id] || 0,
      has_access: courseAccess,
      access_status: accessStatus,
      allowed_packages: allowedPackages,
      buy_package: buyPackage,
    }
  })

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

  // Vérification accès Campus global (service_id = 1)
  let hasCampusAccessDetail = false
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
    hasCampusAccessDetail = (accessCheck?.cnt || 0) > 0
  }

  // Packages liés à cette formation + packages du membre
  let memberPackageIdsDetail: Set<string> = new Set()
  if (memberId) {
    const memberPkgs = await db.prepare(
      `SELECT package_id FROM package_orders WHERE member_id = ? AND status IN ('validated','active')`
    ).bind(memberId).all()
    for (const p of (memberPkgs.results as any[])) memberPackageIdsDetail.add(p.package_id)
  }

  // Achat direct formation validé ?
  let hasPurchasedCourseDetail = false
  if (memberId) {
    const purchased = await db.prepare(
      `SELECT id FROM campus_course_orders WHERE member_id = ? AND course_id = ? AND status = 'validated' LIMIT 1`
    ).bind(memberId, (course as any).id).first()
    hasPurchasedCourseDetail = !!purchased
  }

  const courseLinkedPkgs = await db.prepare(
    `SELECT ccp.package_id FROM campus_course_packages ccp WHERE ccp.course_id = ?`
  ).bind((course as any).id).all()
  const courseLinkedPkgIds = (courseLinkedPkgs.results as any[]).map((r: any) => r.package_id)

  const memberHasLinkedPkgDetail = courseLinkedPkgIds.length > 0 && memberId
    ? courseLinkedPkgIds.some((pid: string) => memberPackageIdsDetail.has(pid))
    : false
  const isPricedDetail = (course as any).is_free !== 1 && (course as any).price_usd > 0

  // Même logique que le catalogue
  let hasAccess: boolean
  if ((course as any).is_free === 1) {
    hasAccess = true
  } else if (hasPurchasedCourseDetail) {
    hasAccess = true  // achat direct validé
  } else if (memberHasLinkedPkgDetail) {
    hasAccess = true
  } else if (isPricedDetail) {
    hasAccess = false  // formation payante sans le bon package
  } else if (courseLinkedPkgIds.length === 0 && hasCampusAccessDetail) {
    hasAccess = true   // formation gratuite dans Campus (price=0) + accès global
  } else {
    hasAccess = false
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

  const id = 'course-' + Math.random().toString(36).substring(2, 12)
  await db.prepare(`
    INSERT INTO campus_courses (id, category_id, title, slug, subtitle, description, instructor, instructor_bio,
      thumbnail_url, trailer_url, trailer_type, price_usd, is_free, is_featured, display_order, level, language, tags, meta_title, meta_description)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, category_id || null, title, slug, subtitle || null, description || null,
    instructor || null, instructor_bio || null, thumbnail_url || null,
    trailer_url || null, trailer_type || 'youtube',
    price_usd || 0, is_free !== false ? 1 : 0, is_featured ? 1 : 0,
    display_order || 0, level || 'all', language || 'fr',
    tags ? JSON.stringify(tags) : null, meta_title || null, meta_description || null
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
    'is_active','display_order','level','language','tags','meta_title','meta_description'
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

// ============================================================
// ADMIN — Packages autorisés par formation (campus_course_packages)
// ============================================================

// GET /campus/admin/course-packages/:courseId
// Retourne les packages autorisés pour une formation + liste de tous les packages
campus.get('/admin/course-packages/:courseId', async (c) => {
  const db = c.env.DB
  const courseId = c.req.param('courseId')

  // Packages déjà autorisés pour ce cours
  const linked = await db.prepare(`
    SELECT ccp.package_id, p.name, p.price_usd, p.category_id,
           cat.name AS category_name
    FROM campus_course_packages ccp
    JOIN packages p ON p.id = ccp.package_id
    LEFT JOIN package_categories cat ON cat.id = p.category_id
    WHERE ccp.course_id = ?
    ORDER BY p.price_usd ASC
  `).bind(courseId).all()

  // Tous les packages actifs (pour les cases à cocher)
  const allPackages = await db.prepare(`
    SELECT p.id, p.name, p.price_usd, p.category_id,
           cat.name AS category_name
    FROM packages p
    LEFT JOIN package_categories cat ON cat.id = p.category_id
    WHERE p.is_active = 1 AND (p.slug IS NULL OR p.slug != 'licence')
    ORDER BY cat.name ASC, p.price_usd ASC
  `).all()

  const linkedIds = new Set((linked.results as any[]).map((r: any) => r.package_id))

  return c.json({
    linked: linked.results,
    all_packages: (allPackages.results as any[]).map((p: any) => ({
      ...p,
      is_linked: linkedIds.has(p.id)
    }))
  })
})

// POST /campus/admin/course-packages/:courseId
// Remplace entièrement la liste des packages autorisés pour une formation
// Body: { package_ids: string[] }
campus.post('/admin/course-packages/:courseId', async (c) => {
  const db = c.env.DB
  const courseId = c.req.param('courseId')
  const { package_ids = [] } = await c.req.json()

  // Supprimer toutes les liaisons existantes
  await db.prepare(`DELETE FROM campus_course_packages WHERE course_id = ?`).bind(courseId).run()

  // Insérer les nouvelles liaisons
  if (package_ids.length > 0) {
    for (const pkgId of package_ids) {
      await db.prepare(`
        INSERT OR IGNORE INTO campus_course_packages (course_id, package_id)
        VALUES (?, ?)
      `).bind(courseId, pkgId).run()
    }
  }

  return c.json({ success: true, linked_count: package_ids.length })
})

// DELETE /campus/admin/course-packages/:courseId/:packageId
// Supprime un seul lien formation-package
campus.delete('/admin/course-packages/:courseId/:packageId', async (c) => {
  const db = c.env.DB
  const courseId = c.req.param('courseId')
  const packageId = c.req.param('packageId')

  await db.prepare(`
    DELETE FROM campus_course_packages WHERE course_id = ? AND package_id = ?
  `).bind(courseId, packageId).run()

  return c.json({ success: true })
})

// GET /campus/admin/packages — liste tous les packages actifs (pour les dropdowns)
campus.get('/admin/packages', async (c) => {
  const db = c.env.DB
  const pkgs = await db.prepare(`
    SELECT p.id, p.name, p.price_usd, p.category_id,
           cat.name AS category_name
    FROM packages p
    LEFT JOIN package_categories cat ON cat.id = p.category_id
    WHERE p.is_active = 1 AND (p.slug IS NULL OR p.slug != 'licence')
    ORDER BY cat.name ASC, p.price_usd ASC
  `).all()
  return c.json(pkgs.results)
})

// ============================================================
// ROUTES ACHAT DIRECT FORMATION (campus_course_orders)
// Vente simple — pas de BV, pas de guard catégorie packages
// ============================================================

// POST /campus/course/:courseId/order — créer une commande formation
campus.post('/course/:courseId/order', async (c) => {
  const db = c.env.DB
  const memberId = (c.get('memberId' as any) as string) || null
  if (!memberId) return c.json({ error: 'Non authentifié' }, 401)

  const courseId = c.req.param('courseId')
  const { payment_method = 'manual' } = await c.req.json()

  // Vérifier que la formation existe et est payante
  const course = await db.prepare(
    `SELECT id, title, price_usd, is_free FROM campus_courses WHERE id = ? AND is_active = 1`
  ).bind(courseId).first() as any
  if (!course) return c.json({ error: 'Formation introuvable' }, 404)
  if (course.is_free === 1 || !course.price_usd || course.price_usd <= 0) {
    return c.json({ error: 'Cette formation est gratuite — aucun achat requis' }, 400)
  }

  // Vérifier que la formation n'est pas déjà achetée (validée)
  const existing = await db.prepare(
    `SELECT id, status FROM campus_course_orders
     WHERE member_id = ? AND course_id = ? AND status IN ('validated','pending','proof_submitted')
     LIMIT 1`
  ).bind(memberId, courseId).first() as any
  if (existing) {
    if (existing.status === 'validated') {
      return c.json({ error: 'Vous avez déjà accès à cette formation', code: 'ALREADY_OWNED' }, 409)
    }
    return c.json({ order_id: existing.id, status: existing.status, existing: true })
  }

  // ── FLOW WALLET : paiement immédiat + validation automatique ────────────
  if (payment_method === 'wallet' || payment_method === 'internal_wallet') {
    const price = Number(course.price_usd)
    // Vérifier le solde
    const walletRow = await db.prepare(
      `SELECT balance FROM wallets WHERE member_id = ?`
    ).bind(memberId).first() as any
    const balance = Number(walletRow?.balance ?? 0)
    if (balance < price) {
      return c.json({
        error: `Solde insuffisant. Disponible : $${balance.toFixed(2)}, Requis : $${price.toFixed(2)}`
      }, 400)
    }
    // Débiter le wallet
    await walletOperation(db, memberId, price, 'debit', 'debit_order_wallet',
      `Achat formation : ${course.title}`)
    // Créer la commande directement validée
    const orderId = crypto.randomUUID().replace(/-/g, '').substring(0, 16)
    await db.prepare(
      `INSERT INTO campus_course_orders
         (id, member_id, course_id, amount_usd, status, payment_method, proof_url, validated_at, updated_at)
       VALUES (?, ?, ?, ?, 'validated', 'wallet', 'wallet_auto', datetime('now'), datetime('now'))`
    ).bind(orderId, memberId, courseId, price).run()
    // Notification
    const walletAfter = await db.prepare(`SELECT balance FROM wallets WHERE member_id = ?`).bind(memberId).first() as any
    await createNotification(db, memberId, 'success',
      'Formation débloquée !',
      `Votre accès à "${course.title}" a été activé. $${price.toFixed(2)} débités de votre wallet (nouveau solde : $${Number(walletAfter?.balance ?? 0).toFixed(2)}).`)
    return c.json({
      order_id: orderId,
      amount_usd: price,
      course_title: course.title,
      status: 'validated',
      auto_validated: true,
      message: 'Accès activé immédiatement — paiement wallet confirmé !'
    })
  }

  // ── Autres méthodes : créer la commande en pending ───────────────────────
  const orderId = crypto.randomUUID().replace(/-/g, '').substring(0, 16)
  await db.prepare(
    `INSERT INTO campus_course_orders (id, member_id, course_id, amount_usd, status, payment_method)
     VALUES (?, ?, ?, ?, 'pending', ?)`
  ).bind(orderId, memberId, courseId, course.price_usd, payment_method).run()

  return c.json({ order_id: orderId, amount_usd: course.price_usd, course_title: course.title })
})

// POST /campus/course-order/:orderId/proof — soumettre la preuve de paiement
campus.post('/course-order/:orderId/proof', async (c) => {
  const db = c.env.DB
  const memberId = (c.get('memberId' as any) as string) || null
  if (!memberId) return c.json({ error: 'Non authentifié' }, 401)

  const orderId = c.req.param('orderId')
  const { proof_url, note = '' } = await c.req.json()
  if (!proof_url) return c.json({ error: 'proof_url requis' }, 400)

  const order = await db.prepare(
    `SELECT id, status, member_id FROM campus_course_orders WHERE id = ?`
  ).bind(orderId).first() as any
  if (!order) return c.json({ error: 'Commande introuvable' }, 404)
  if (order.member_id !== memberId) return c.json({ error: 'Accès refusé' }, 403)
  if (order.status === 'validated') return c.json({ error: 'Commande déjà validée' }, 409)
  if (order.status === 'proof_submitted') return c.json({ error: 'Preuve déjà soumise — en attente de validation' }, 409)

  await db.prepare(
    `UPDATE campus_course_orders SET status = 'proof_submitted', proof_url = ?, note = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(proof_url, note, orderId).run()

  return c.json({ success: true, message: 'Preuve soumise — validation sous 24–48h' })
})

// ============================================================
// STRIPE — Paiement automatique formations campus
// ============================================================

// Helper : lire la config Stripe depuis la DB
async function getCampusStripeConfig(db: D1Database, env: any) {
  // 1. Lire depuis payment_gateway_config (ancien système)
  const rows = await db.prepare(
    `SELECT key, value FROM payment_gateway_config WHERE gateway = 'stripe_api'`
  ).all()
  const map: Record<string, string> = {}
  for (const r of (rows.results as any[])) map[r.key] = r.value

  // 2. Fallback : lire depuis payment_methods V2 (clé = publishable_key dans V2)
  let v2PublicKey = '', v2SecretKey = '', v2WebhookSecret = ''
  try {
    const v2Row = await db.prepare(
      `SELECT config FROM payment_methods WHERE provider = 'stripe' AND is_active = 1 LIMIT 1`
    ).first() as any
    if (v2Row?.config) {
      const v2cfg = JSON.parse(v2Row.config)
      v2PublicKey     = v2cfg['publishable_key'] || v2cfg['public_key'] || ''
      v2SecretKey     = v2cfg['secret_key'] || ''
      v2WebhookSecret = v2cfg['webhook_secret'] || ''
    }
  } catch {}

  const publicKey  = map['public_key']  || v2PublicKey     || ''
  const secretKey  = map['secret_key']  || v2SecretKey     || (env?.STRIPE_SECRET_KEY as string) || ''
  const webhookSec = map['webhook_secret'] || v2WebhookSecret || ''
  // enabled = true si les clés sont présentes (V2 is_active=1 suffit)
  const enabledFlag = map['enabled']
  const enabled    = (enabledFlag === undefined || enabledFlag === 'true') && !!(publicKey && secretKey)

  return { enabled, secretKey, publicKey, webhookSecret: webhookSec }
}

// POST /campus/stripe/create-payment-intent
// Crée un PaymentIntent pour une formation, retourne client_secret
campus.post('/stripe/create-payment-intent', async (c) => {
  const db = c.env.DB
  const memberId = (c.get('memberId' as any) as string) || null
  if (!memberId) return c.json({ error: 'Non authentifié' }, 401)

  const { order_id, course_id, amount } = await c.req.json()
  if (!order_id || !course_id || !amount) return c.json({ error: 'Paramètres manquants' }, 400)

  const { secretKey, enabled } = await getCampusStripeConfig(db, c.env)
  if (!enabled || !secretKey) return c.json({ error: 'Stripe non configuré' }, 503)

  // Vérifier que la commande appartient bien au membre et est en pending
  const order = await db.prepare(
    `SELECT id, status, amount_usd, course_id FROM campus_course_orders WHERE id = ? AND member_id = ?`
  ).bind(order_id, memberId).first() as any
  if (!order) return c.json({ error: 'Commande introuvable' }, 404)
  if (order.status === 'validated') return c.json({ error: 'Commande déjà validée', code: 'ALREADY_OWNED' }, 409)

  const course = await db.prepare(`SELECT title FROM campus_courses WHERE id = ?`).bind(course_id).first() as any

  try {
    const body = new URLSearchParams({
      amount:   String(Math.round(Number(amount) * 100)),
      currency: 'usd',
      'automatic_payment_methods[enabled]': 'true',
      description: `LEADER Campus — ${course?.title || 'Formation'}`,
      'metadata[member_id]':   memberId,
      'metadata[order_id]':    order_id,
      'metadata[course_id]':   course_id,
      'metadata[order_type]':  'campus_course',
    })
    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${secretKey}`,
        'Content-Type':   'application/x-www-form-urlencoded',
        'Stripe-Version': '2024-06-20',
      },
      body: body.toString(),
    })
    if (!res.ok) {
      const err = await res.json() as any
      return c.json({ error: err?.error?.message || 'Erreur Stripe' }, 502)
    }
    const pi = await res.json() as { id: string; client_secret: string }
    // Stocker le payment_intent_id dans la commande pour tracking
    await db.prepare(
      `UPDATE campus_course_orders SET payment_ref = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(`stripe:${pi.id}`, order_id).run()
    return c.json({ client_secret: pi.client_secret, payment_intent_id: pi.id })
  } catch (err: any) {
    return c.json({ error: err.message || 'Erreur Stripe' }, 500)
  }
})

// POST /campus/stripe/confirm-payment
// Appelé par le frontend après confirmCardPayment() réussi
// Vérifie le PaymentIntent auprès de Stripe puis valide la commande automatiquement
campus.post('/stripe/confirm-payment', async (c) => {
  const db = c.env.DB
  const memberId = (c.get('memberId' as any) as string) || null
  if (!memberId) return c.json({ error: 'Non authentifié' }, 401)

  const { payment_intent_id, order_id } = await c.req.json()
  if (!payment_intent_id || !order_id) return c.json({ error: 'Paramètres manquants' }, 400)

  const { secretKey, enabled } = await getCampusStripeConfig(db, c.env)
  if (!enabled || !secretKey) return c.json({ error: 'Stripe non configuré' }, 503)

  // Vérifier le statut du PaymentIntent directement auprès de Stripe (source de vérité)
  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${payment_intent_id}`, {
    headers: {
      'Authorization':  `Bearer ${secretKey}`,
      'Stripe-Version': '2024-06-20',
    },
  })
  if (!res.ok) return c.json({ error: 'Impossible de vérifier le paiement Stripe' }, 502)
  const pi = await res.json() as { id: string; status: string; amount: number; metadata: any }

  if (pi.status !== 'succeeded') {
    return c.json({ error: `Paiement non confirmé par Stripe (statut : ${pi.status})` }, 402)
  }

  // Vérifier que la commande appartient bien au membre
  const order = await db.prepare(
    `SELECT * FROM campus_course_orders WHERE id = ? AND member_id = ?`
  ).bind(order_id, memberId).first() as any
  if (!order) return c.json({ error: 'Commande introuvable' }, 404)
  if (order.status === 'validated') {
    return c.json({ success: true, already_validated: true, order_id })
  }

  const capturedAmount = pi.amount / 100
  const stripeRef = `stripe:${payment_intent_id}`

  // Valider la commande automatiquement
  await db.prepare(
    `UPDATE campus_course_orders
     SET status       = 'validated',
         payment_ref  = ?,
         proof_url    = ?,
         validated_at = datetime('now'),
         updated_at   = datetime('now')
     WHERE id = ?`
  ).bind(stripeRef, stripeRef, order_id).run()

  // Récupérer le titre de la formation pour la notification
  const course = await db.prepare(
    `SELECT title FROM campus_courses WHERE id = ?`
  ).bind(order.course_id).first() as any

  await createNotification(db, memberId, 'success',
    'Paiement Stripe confirmé — Formation débloquée !',
    `Votre paiement de $${capturedAmount.toFixed(2)} a été reçu. Accès à "${course?.title || 'la formation'}" activé immédiatement.`)

  return c.json({
    success: true,
    order_id,
    payment_intent_id,
    amount: capturedAmount,
    status: 'validated',
    auto_validated: true,
    message: 'Paiement confirmé — accès à la formation activé immédiatement !',
  })
})

// GET /campus/my-course-orders — mes commandes formations
campus.get('/my-course-orders', async (c) => {
  const db = c.env.DB
  const memberId = (c.get('memberId' as any) as string) || null
  if (!memberId) return c.json({ orders: [] })

  const rows = await db.prepare(`
    SELECT cco.id, cco.course_id, cco.amount_usd, cco.status, cco.created_at,
           cc.title AS course_title, cc.slug AS course_slug
    FROM campus_course_orders cco
    JOIN campus_courses cc ON cc.id = cco.course_id
    WHERE cco.member_id = ?
    ORDER BY cco.created_at DESC
  `).bind(memberId).all()

  return c.json({ orders: rows.results })
})

// ============================================================
// ROUTES ADMIN — gestion commandes formations
// ============================================================

// GET /campus/admin/course-orders — liste toutes les commandes formations
campus.get('/admin/course-orders', async (c) => {
  const db = c.env.DB
  const status = (c.req.query('status') as string) || ''
  const whereStatus = status ? `AND cco.status = '${status}'` : ''

  const rows = await db.prepare(`
    SELECT cco.id, cco.amount_usd, cco.status, cco.proof_url, cco.note,
           cco.rejection_reason, cco.created_at, cco.updated_at,
           cc.title AS course_title, cc.slug AS course_slug,
           m.first_name || ' ' || m.last_name AS member_name,
           m.unique_id AS member_uid, m.id AS member_id
    FROM campus_course_orders cco
    JOIN campus_courses cc ON cc.id = cco.course_id
    JOIN members m ON m.id = cco.member_id
    WHERE 1=1 ${whereStatus}
    ORDER BY cco.created_at DESC
    LIMIT 200
  `).all()

  return c.json({ orders: rows.results })
})

// POST /campus/admin/course-orders/:orderId/validate — valider une commande formation
campus.post('/admin/course-orders/:orderId/validate', async (c) => {
  const db = c.env.DB
  const orderId = c.req.param('orderId')

  const order = await db.prepare(
    `SELECT * FROM campus_course_orders WHERE id = ?`
  ).bind(orderId).first() as any
  if (!order) return c.json({ error: 'Commande introuvable' }, 404)
  if (order.status === 'validated') return c.json({ error: 'Déjà validée' }, 409)

  await db.prepare(
    `UPDATE campus_course_orders SET status = 'validated', updated_at = datetime('now') WHERE id = ?`
  ).bind(orderId).run()

  return c.json({ success: true, message: 'Commande validée — membre a maintenant accès à la formation' })
})

// POST /campus/admin/course-orders/:orderId/reject — rejeter une commande formation
campus.post('/admin/course-orders/:orderId/reject', async (c) => {
  const db = c.env.DB
  const orderId = c.req.param('orderId')
  const { reason = 'Preuve de paiement non valide' } = await c.req.json()

  const order = await db.prepare(
    `SELECT id, status FROM campus_course_orders WHERE id = ?`
  ).bind(orderId).first() as any
  if (!order) return c.json({ error: 'Commande introuvable' }, 404)

  await db.prepare(
    `UPDATE campus_course_orders SET status = 'rejected', rejection_reason = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(reason, orderId).run()

  return c.json({ success: true })
})

export { campus }
