/**
 * LW COURSE STRUCTURE INTERCEPTOR v3
 * ===================================
 * Coller ce script dans la console Safari sur leaderbackoffice.com/author/dashboard
 * 
 * MÉTHODE : Intercepte les appels XHR/fetch NATIFS de la SPA React
 * et stocke tous les JSON contenant des données de cours/leçons.
 * 
 * INSTRUCTIONS :
 * 1. Ouvrir leaderbackoffice.com/author/dashboard (connecté)
 * 2. Ouvrir DevTools Console (Cmd+Option+J ou F12)
 * 3. Coller ce script ENTIER et appuyer Entrée
 * 4. Appuyer Cmd+R pour recharger la page (l'intercepteur se réinstalle auto)
 *    → NON : le script doit être actif AVANT le rechargement
 *    → CORRECT : après avoir collé, naviguer vers chaque cours via l'UI
 * 5. Dans l'interface admin, ouvrir chaque cours pour voir son contenu
 * 6. Après avoir parcouru tous les cours, exécuter : copy(JSON.stringify(window._lwData, null, 2))
 * 
 * ALTERNATIVE (meilleure) :
 * 1. Coller le script
 * 2. Attendre 3 secondes
 * 3. Exécuter : window._lwAutoScrape()  ← scrape automatiquement tous les cours
 */

(function() {
  'use strict';
  
  // ============================================================
  // STOCKAGE GLOBAL
  // ============================================================
  window._lwData = {
    courses: {},      // courseId -> {id, title, sections: [{title, lessons: [{title, duration, videoUrl}]}]}
    rawResponses: [], // Toutes les réponses brutes capturées
    capturedAt: new Date().toISOString()
  };
  
  // ============================================================
  // PARSERS POUR DIFFÉRENTS FORMATS D'API
  // ============================================================
  
  function parseCourseData(url, data) {
    if (!data || typeof data !== 'object') return;
    
    // Format 1: /api/author/products/{id} ou /api/author/courses/{id}
    if (data.sections || data.outline || data.units) {
      extractFromCourseResponse(url, data);
    }
    
    // Format 2: Liste de produits { data: [{id, title, ...}] }
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach(item => {
        if (item.sections || item.outline || item.units) {
          extractFromCourseResponse(url, item);
        }
      });
    }
    
    // Format 3: Réponse imbriquée { product: {...} } ou { course: {...} }
    const nested = data.product || data.course || data.item;
    if (nested && (nested.sections || nested.outline || nested.units)) {
      extractFromCourseResponse(url, nested);
    }
  }
  
  function extractFromCourseResponse(url, course) {
    const courseId = course.id || course._id || extractIdFromUrl(url);
    const courseTitle = course.title || course.name || 'Unknown';
    
    if (!courseId) return;
    
    const sections = [];
    
    // Format A: sections[]
    if (course.sections && Array.isArray(course.sections)) {
      course.sections.forEach(section => {
        const sectionData = {
          id: section.id || section._id,
          title: section.title || section.name || '',
          lessons: []
        };
        
        const units = section.units || section.lessons || section.items || [];
        units.forEach(unit => {
          sectionData.lessons.push(extractLesson(unit));
        });
        
        sections.push(sectionData);
      });
    }
    
    // Format B: outline[]
    if (course.outline && Array.isArray(course.outline)) {
      course.outline.forEach(section => {
        const sectionData = {
          id: section.id || section._id,
          title: section.title || section.label || '',
          lessons: []
        };
        
        const items = section.items || section.units || section.lessons || [];
        items.forEach(item => {
          sectionData.lessons.push(extractLesson(item));
        });
        
        sections.push(sectionData);
      });
    }
    
    // Format C: units[] flat (pas de sections)
    if (course.units && Array.isArray(course.units) && sections.length === 0) {
      const sectionData = { id: 'main', title: courseTitle, lessons: [] };
      course.units.forEach(unit => {
        sectionData.lessons.push(extractLesson(unit));
      });
      sections.push(sectionData);
    }
    
    if (sections.length > 0 || course.title) {
      window._lwData.courses[courseId] = {
        id: courseId,
        title: courseTitle,
        slug: course.slug || course.permalink || '',
        thumbnail: course.image || course.thumbnail || course.cover_image || '',
        sections: sections,
        totalLessons: sections.reduce((acc, s) => acc + s.lessons.length, 0),
        capturedFrom: url
      };
      
      console.log(`✅ Cours capturé: "${courseTitle}" — ${sections.length} sections, ${window._lwData.courses[courseId].totalLessons} leçons`);
    }
  }
  
  function extractLesson(unit) {
    const lesson = {
      id: unit.id || unit._id || '',
      title: unit.title || unit.name || unit.label || '',
      type: unit.type || unit.kind || 'video',
      duration: 0,
      durationFormatted: '',
      videoUrl: '',
      videoType: 'learnworlds'
    };
    
    // Durée en secondes
    if (unit.duration) {
      if (typeof unit.duration === 'number') {
        lesson.duration = unit.duration;
        lesson.durationFormatted = formatDuration(unit.duration);
      } else if (typeof unit.duration === 'string') {
        // Format "mm:ss" ou "hh:mm:ss"
        lesson.durationFormatted = unit.duration;
        lesson.duration = parseDuration(unit.duration);
      }
    }
    
    // Durée alternative
    if (!lesson.duration) {
      const dur = unit.video_duration || unit.videoDuration || unit.length || 0;
      if (dur) {
        lesson.duration = typeof dur === 'number' ? dur : parseDuration(String(dur));
        lesson.durationFormatted = formatDuration(lesson.duration);
      }
    }
    
    // URL vidéo
    const videoData = unit.video || unit.videoData || unit.content || {};
    lesson.videoUrl = videoData.url || videoData.src || videoData.path ||
                      unit.video_url || unit.videoUrl || unit.url || '';
    
    // Type vidéo
    if (lesson.videoUrl) {
      if (lesson.videoUrl.includes('youtube.com') || lesson.videoUrl.includes('youtu.be')) {
        lesson.videoType = 'youtube';
      } else if (lesson.videoUrl.includes('vimeo.com')) {
        lesson.videoType = 'vimeo';
      } else if (lesson.videoUrl.includes('lwfiles') || lesson.videoUrl.includes('learnworlds')) {
        lesson.videoType = 'learnworlds';
      }
    }
    
    // Wistia, Vidyard, etc.
    const wistiaId = unit.wistia_id || (videoData && videoData.wistia_id);
    if (wistiaId) {
      lesson.videoUrl = `https://fast.wistia.com/medias/${wistiaId}`;
      lesson.videoType = 'wistia';
    }
    
    return lesson;
  }
  
  function extractIdFromUrl(url) {
    const match = url.match(/\/(?:products|courses|items)\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }
  
  function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
  }
  
  function parseDuration(str) {
    if (!str) return 0;
    const parts = str.split(':').map(Number);
    if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
    if (parts.length === 2) return parts[0]*60 + parts[1];
    return parseInt(str) || 0;
  }
  
  // ============================================================
  // INTERCEPTION XHR
  // ============================================================
  
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url) {
    this._interceptUrl = url;
    this._interceptMethod = method;
    return originalXHROpen.apply(this, arguments);
  };
  
  XMLHttpRequest.prototype.send = function() {
    const xhr = this;
    const url = this._interceptUrl || '';
    
    // Filtrer les URLs pertinentes
    const isRelevant = url.includes('/api/') && (
      url.includes('product') ||
      url.includes('course') ||
      url.includes('section') ||
      url.includes('unit') ||
      url.includes('lesson') ||
      url.includes('outline') ||
      url.includes('curriculum')
    );
    
    if (isRelevant) {
      xhr.addEventListener('load', function() {
        try {
          const text = xhr.responseText;
          if (text && text.length > 100) {
            const json = JSON.parse(text);
            window._lwData.rawResponses.push({ url, data: json, ts: Date.now() });
            parseCourseData(url, json);
          }
        } catch(e) {}
      });
    }
    
    return originalXHRSend.apply(this, arguments);
  };
  
  // ============================================================
  // INTERCEPTION FETCH
  // ============================================================
  
  const originalFetch = window.fetch;
  
  window.fetch = function(input, init) {
    const url = (typeof input === 'string') ? input : (input.url || String(input));
    
    const isRelevant = (
      url.includes('learnworlds') ||
      url.includes('leaderbackoffice')
    ) && (
      url.includes('product') ||
      url.includes('course') ||
      url.includes('section') ||
      url.includes('unit') ||
      url.includes('lesson') ||
      url.includes('outline') ||
      url.includes('curriculum') ||
      url.includes('author')
    );
    
    const promise = originalFetch.apply(this, arguments);
    
    if (isRelevant) {
      promise.then(response => {
        const clone = response.clone();
        clone.text().then(text => {
          try {
            if (text && text.length > 100) {
              const json = JSON.parse(text);
              window._lwData.rawResponses.push({ url, data: json, ts: Date.now() });
              parseCourseData(url, json);
            }
          } catch(e) {}
        }).catch(() => {});
      }).catch(() => {});
    }
    
    return promise;
  };
  
  // ============================================================
  // AUTO-SCRAPER (navigue via l'API interne)
  // ============================================================
  
  window._lwAutoScrape = async function() {
    console.log('🚀 Démarrage auto-scrape via API interne...');
    
    // Trouver le client ID dans les globals
    const clientId = window.lw_client || 
      window.__LW_CLIENT__ ||
      document.querySelector('[data-client-id]')?.dataset?.clientId;
    
    const api = window.api || 'https://api.us-e2.learnworlds.com/';
    const token = window.lw_access_token || 
      window.__LW_TOKEN__ ||
      getCookieValue('lw-access-token') ||
      getCookieValue('access_token');
    
    console.log('📌 Config détectée:', { clientId, api: api?.substring(0,40), hasToken: !!token });
    
    // Essayer de récupérer la liste des cours via l'API admin
    const endpoints = [
      api + 'v2/products?page=1&itemsPerPage=100',
      api + 'author/products?page=1&itemsPerPage=100',
      '/api/author/products?page=1&itemsPerPage=100',
      '/api/v2/author/products'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`📡 Essai: ${endpoint}`);
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          headers['Lw-Client'] = clientId || '';
        }
        
        const resp = await originalFetch(endpoint, { headers, credentials: 'include' });
        if (resp.ok) {
          const data = await resp.json();
          console.log('✅ Réponse obtenue:', JSON.stringify(data).substring(0, 200));
          parseCourseData(endpoint, data);
          
          // Récupérer chaque cours individuellement
          const items = data.data || data.items || data.products || [];
          for (const item of items) {
            const id = item.id || item._id;
            if (id) {
              await fetchCourseDetail(api, id, token, clientId, headers);
              await sleep(300);
            }
          }
          break;
        }
      } catch(e) {
        console.log(`⚠️ ${endpoint}: ${e.message}`);
      }
    }
    
    console.log(`\n📊 Résultat: ${Object.keys(window._lwData.courses).length} cours capturés`);
    console.log('💾 Pour exporter: copy(JSON.stringify(window._lwData, null, 2))');
  };
  
  async function fetchCourseDetail(api, courseId, token, clientId, headers) {
    const detailEndpoints = [
      `${api}v2/products/${courseId}`,
      `${api}author/products/${courseId}`,
      `/api/author/products/${courseId}`
    ];
    
    for (const endpoint of detailEndpoints) {
      try {
        const resp = await originalFetch(endpoint, { headers, credentials: 'include' });
        if (resp.ok) {
          const data = await resp.json();
          parseCourseData(endpoint, data);
          return true;
        }
      } catch(e) {}
    }
    return false;
  }
  
  function getCookieValue(name) {
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ============================================================
  // EXPORT SQL
  // ============================================================
  
  window._lwExportSQL = function() {
    const courses = Object.values(window._lwData.courses);
    if (courses.length === 0) {
      console.warn('⚠️ Aucun cours capturé. Navigue vers les cours dans l\'UI d\'abord.');
      return '';
    }
    
    let sql = `-- LearnWorlds Structure Réelle — ${new Date().toISOString()}\n`;
    sql += `-- ${courses.length} cours, ${courses.reduce((a,c) => a + c.totalLessons, 0)} leçons totales\n\n`;
    sql += `DELETE FROM campus_lessons;\nDELETE FROM campus_modules;\n\n`;
    
    courses.forEach(course => {
      course.sections.forEach((section, sIdx) => {
        const moduleId = `mod_${course.id}_${sIdx}`;
        sql += `-- Sections: ${course.title} > ${section.title}\n`;
        sql += `UPDATE campus_modules SET title = '${esc(section.title)}' WHERE course_id = '${course.id}' AND display_order = ${sIdx+1};\n`;
        
        section.lessons.forEach((lesson, lIdx) => {
          const lessonId = lesson.id || `les_${course.id}_${sIdx}_${lIdx}`;
          sql += `INSERT OR REPLACE INTO campus_lessons (id, module_id, course_id, title, video_url, video_type, duration_seconds, display_order, is_active, is_free) VALUES `;
          sql += `('${lessonId}', '${moduleId}', '${course.id}', '${esc(lesson.title)}', '${esc(lesson.videoUrl)}', '${lesson.videoType}', ${lesson.duration}, ${lIdx+1}, 1, ${lIdx === 0 ? 1 : 0});\n`;
        });
        sql += '\n';
      });
      
      // Mettre à jour le nombre de leçons
      sql += `UPDATE campus_courses SET total_lessons = ${course.totalLessons} WHERE id = '${course.id}';\n\n`;
    });
    
    console.log(sql);
    return sql;
  };
  
  function esc(str) {
    return (str || '').replace(/'/g, "''").replace(/\n/g, ' ');
  }
  
  // ============================================================
  // EXPORT JSON STRUCTURÉ POUR IMPORT D1
  // ============================================================
  
  window._lwExportForD1 = function() {
    const courses = Object.values(window._lwData.courses);
    const result = {
      exportedAt: new Date().toISOString(),
      totalCourses: courses.length,
      totalLessons: courses.reduce((a,c) => a + c.totalLessons, 0),
      courses: courses.map(c => ({
        id: c.id,
        title: c.title,
        sections: c.sections.map(s => ({
          id: s.id,
          title: s.title,
          lessons: s.lessons.map(l => ({
            id: l.id,
            title: l.title,
            videoUrl: l.videoUrl,
            videoType: l.videoType,
            durationSeconds: l.duration,
            durationFormatted: l.durationFormatted
          }))
        }))
      }))
    };
    
    const json = JSON.stringify(result, null, 2);
    console.log(json);
    return json;
  };
  
  // ============================================================
  // STATUS
  // ============================================================
  
  window._lwStatus = function() {
    const courses = Object.values(window._lwData.courses);
    console.log(`\n📊 STATUT INTERCEPTEUR LearnWorlds`);
    console.log(`   Cours capturés: ${courses.length}`);
    console.log(`   Réponses brutes: ${window._lwData.rawResponses.length}`);
    courses.forEach(c => {
      console.log(`   • ${c.title}: ${c.sections.length} sections, ${c.totalLessons} leçons`);
    });
    console.log(`\n📋 COMMANDES DISPONIBLES:`);
    console.log(`   window._lwAutoScrape()  → Scraper auto via API`);
    console.log(`   window._lwStatus()      → Voir statut`);
    console.log(`   window._lwExportForD1() → Export JSON pour import D1`);
    console.log(`   window._lwExportSQL()   → Export SQL direct`);
    console.log(`   copy(JSON.stringify(window._lwData, null, 2)) → Copier tout`);
  };
  
  console.log('✅ INTERCEPTEUR LW ACTIF v3');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ÉTAPE 1 : Exécute window._lwAutoScrape()');
  console.log('         (scraping automatique via API admin)');
  console.log('');
  console.log('ÉTAPE 2 : Si erreur, navigue vers chaque cours');
  console.log('         dans l\'interface admin (clique sur chaque cours)');
  console.log('');
  console.log('ÉTAPE 3 : window._lwStatus() pour voir ce qui a été capturé');
  console.log('ÉTAPE 4 : copy(window._lwExportForD1()) pour exporter');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

})();
