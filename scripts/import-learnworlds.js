#!/usr/bin/env node
// ============================================================
// IMPORT LEARNWORLDS → Campus DB
// Usage: node scripts/import-learnworlds.js
// Variables d'env requises:
//   LW_CLIENT_ID, LW_CLIENT_SECRET, LW_SCHOOL_URL
//   CF_D1_DB_ID, CF_ACCOUNT_ID, CF_API_TOKEN
// ============================================================

const LW_URL = process.env.LW_SCHOOL_URL || 'https://leaderbackoffice.mylearnworlds.com'
const LW_CLIENT_ID = process.env.LW_CLIENT_ID || ''
const LW_CLIENT_SECRET = process.env.LW_CLIENT_SECRET || ''
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || ''
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || 'e3c22eb11c116deb6d2d21349b153b91'
const CF_DB_ID = process.env.CF_D1_DB_ID || '9f446266-de38-4dd1-8201-9cec9ec682c8'

// ── Auth LearnWorlds ──────────────────────────────────────────
async function getLWToken() {
  const res = await fetch(`${LW_URL}/oauth2/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: LW_CLIENT_ID,
      client_secret: LW_CLIENT_SECRET,
      grant_type: 'client_credentials'
    })
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Auth LW failed: ' + JSON.stringify(data))
  console.log('✅ Auth LearnWorlds OK')
  return data.access_token
}

// ── API LearnWorlds paginated ─────────────────────────────────
async function lwGet(token, path, params = {}) {
  const url = new URL(`${LW_URL}/api/v2${path}`)
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v))
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}`, 'Lw-Client': LW_CLIENT_ID }
  })
  if (!res.ok) throw new Error(`LW API ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function lwGetAll(token, path) {
  let page = 1, all = []
  while (true) {
    const data = await lwGet(token, path, { page, itemsPerPage: 100 })
    const items = data.data || data.items || data || []
    all.push(...items)
    console.log(`  📄 ${path} page ${page}: ${items.length} items`)
    if (items.length < 100) break
    page++
  }
  return all
}

// ── D1 Execute ───────────────────────────────────────────────
async function d1Execute(sql) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DB_ID}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    }
  )
  const data = await res.json()
  if (!data.success) throw new Error('D1 error: ' + JSON.stringify(data.errors))
  return data.result
}

async function d1Batch(statements) {
  // Exécuter par lots de 50
  for (let i = 0; i < statements.length; i += 50) {
    const batch = statements.slice(i, i + 50)
    const sql = batch.join(';\n') + ';'
    await d1Execute(sql)
    console.log(`  💾 Batch ${Math.floor(i/50)+1}/${Math.ceil(statements.length/50)} OK`)
  }
}

// ── Helpers ───────────────────────────────────────────────────
function slugify(str) {
  return (str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-')
}

function esc(str) {
  return (str || '').replace(/'/g, "''")
}

function detectVideoType(url) {
  if (!url) return 'url'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('vimeo.com')) return 'vimeo'
  if (url.includes('drive.google.com')) return 'drive'
  return 'url'
}

// ── MAPPING catégories LearnWorlds → campus_categories ───────
// À ajuster selon les tags/catégories réels LW
function mapCategory(course) {
  const title = (course.title || '').toLowerCase()
  const tags = (course.tags || []).join(' ').toLowerCase()
  const combined = title + ' ' + tags

  if (combined.includes('webinar') || combined.includes('zoom') || combined.includes('live')) {
    return 'cat-webinar-001'
  }
  if (combined.includes('leadership') || combined.includes('leader') || combined.includes('maxwell') || combined.includes('sinek')) {
    return 'cat-leadership-001'
  }
  if (combined.includes('mindset') || combined.includes('développement') || combined.includes('personnel') || combined.includes('proctor') || combined.includes('habit') || combined.includes('rohn') || combined.includes('covey')) {
    return 'cat-mindset-001'
  }
  if (combined.includes('entreprise') || combined.includes('business') || combined.includes('startup') || combined.includes('économi') || combined.includes('economi') || combined.includes('financ')) {
    return 'cat-entreprise-001'
  }
  return 'cat-leadership-001' // défaut
}

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Import LearnWorlds → Campus')
  console.log('================================')

  // 1. Auth
  const token = await getLWToken()

  // 2. Récupérer tous les cours
  console.log('\n📚 Récupération des cours...')
  const courses = await lwGetAll(token, '/courses')
  console.log(`✅ ${courses.length} cours trouvés`)

  // 3. Vider les tables campus existantes (sauf catégories)
  console.log('\n🗑️  Nettoyage des tables campus...')
  await d1Execute(`DELETE FROM campus_lessons`)
  await d1Execute(`DELETE FROM campus_modules`)
  await d1Execute(`DELETE FROM campus_courses`)
  console.log('✅ Tables vidées')

  // 4. Importer les cours + détails
  console.log('\n📥 Import des cours...')
  const courseInserts = []
  const moduleInserts = []
  const lessonInserts = []

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i]
    const courseId = course.id
    const slug = course.permalink || slugify(course.title)
    const categoryId = mapCategory(course)
    const thumbnail = course.image || course.cover_image || null
    const instructor = course.instructors?.map(i => i.name).join(', ') || 'Équipe LEADER'
    const isPublished = course.status === 'published' || course.is_published

    if (!isPublished) {
      console.log(`  ⏭️  Cours non publié ignoré: ${course.title}`)
      continue
    }

    console.log(`  [${i+1}/${courses.length}] ${course.title}`)

    courseInserts.push(`
      INSERT OR REPLACE INTO campus_courses 
        (id, category_id, title, slug, subtitle, description, instructor, 
         thumbnail_url, is_free, price_usd, level, language, display_order, is_active, is_featured)
      VALUES (
        '${esc(courseId)}',
        '${categoryId}',
        '${esc(course.title)}',
        '${esc(slug)}',
        '${esc(course.subtitle || '')}',
        '${esc(course.description || '')}',
        '${esc(instructor)}',
        ${thumbnail ? `'${esc(thumbnail)}'` : 'NULL'},
        ${course.price == 0 || course.is_free ? 1 : 0},
        ${course.price || 0},
        'all', 'fr',
        ${i + 1},
        1, 0
      )
    `.trim())

    // 5. Récupérer les sections (modules) du cours
    try {
      const sections = await lwGetAll(token, `/courses/${courseId}/sections`)
      
      for (let mi = 0; mi < sections.length; mi++) {
        const section = sections[mi]
        const moduleId = `mod-${courseId}-${mi}`
        
        moduleInserts.push(`
          INSERT OR REPLACE INTO campus_modules
            (id, course_id, title, description, display_order, is_active)
          VALUES (
            '${esc(moduleId)}',
            '${esc(courseId)}',
            '${esc(section.title || `Module ${mi+1}`)}',
            '',
            ${mi + 1},
            1
          )
        `.trim())

        // 6. Récupérer les leçons de la section
        const activities = section.activities || section.learning_activities || []
        for (let li = 0; li < activities.length; li++) {
          const activity = activities[li]
          const lessonId = `lesson-${courseId}-${mi}-${li}`
          const videoUrl = activity.video_url || activity.url || null
          const videoType = detectVideoType(videoUrl)
          const durationSec = activity.duration || 0
          const durationMin = Math.floor(durationSec / 60)
          const durationLabel = durationMin > 0 
            ? `${Math.floor(durationMin/60) > 0 ? Math.floor(durationMin/60)+'h ' : ''}${durationMin%60 > 0 ? durationMin%60+'min' : ''}`.trim()
            : ''

          lessonInserts.push(`
            INSERT OR REPLACE INTO campus_lessons
              (id, module_id, course_id, title, video_url, video_type, 
               duration_seconds, duration_label, display_order, is_free, is_active)
            VALUES (
              '${esc(lessonId)}',
              '${esc(moduleId)}',
              '${esc(courseId)}',
              '${esc(activity.title || `Leçon ${li+1}`)}',
              ${videoUrl ? `'${esc(videoUrl)}'` : 'NULL'},
              '${videoType}',
              ${durationSec},
              '${durationLabel}',
              ${li + 1},
              ${course.is_free || course.price == 0 ? 1 : 0},
              1
            )
          `.trim())
        }
      }
    } catch (err) {
      console.log(`    ⚠️  Sections non disponibles pour ${course.title}: ${err.message}`)
    }
  }

  // 7. Insérer en DB
  console.log(`\n💾 Insertion en DB: ${courseInserts.length} cours, ${moduleInserts.length} modules, ${lessonInserts.length} leçons`)
  
  if (courseInserts.length) await d1Batch(courseInserts)
  console.log('✅ Cours insérés')
  
  if (moduleInserts.length) await d1Batch(moduleInserts)
  console.log('✅ Modules insérés')
  
  if (lessonInserts.length) await d1Batch(lessonInserts)
  console.log('✅ Leçons insérées')

  // 8. Mettre à jour les compteurs
  console.log('\n📊 Mise à jour des compteurs...')
  await d1Execute(`
    UPDATE campus_courses SET 
      total_lessons = (SELECT COUNT(*) FROM campus_lessons WHERE course_id = campus_courses.id),
      total_duration_minutes = (SELECT COALESCE(SUM(duration_seconds), 0)/60 FROM campus_lessons WHERE course_id = campus_courses.id)
  `)
  console.log('✅ Compteurs mis à jour')

  // 9. Résumé final
  const stats = await d1Execute('SELECT COUNT(*) as n FROM campus_courses')
  const statsM = await d1Execute('SELECT COUNT(*) as n FROM campus_modules')
  const statsL = await d1Execute('SELECT COUNT(*) as n FROM campus_lessons')
  
  console.log('\n🎉 IMPORT TERMINÉ')
  console.log('================================')
  console.log(`📚 Cours: ${stats[0].results[0].n}`)
  console.log(`📂 Modules: ${statsM[0].results[0].n}`)
  console.log(`🎬 Leçons: ${statsL[0].results[0].n}`)
}

main().catch(err => {
  console.error('❌ ERREUR:', err)
  process.exit(1)
})
