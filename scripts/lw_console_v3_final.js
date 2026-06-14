/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          LW INTERCEPTEUR v3 — SCRIPT CONSOLE COMPLET        ║
 * ║  Coller dans Safari DevTools Console sur leaderbackoffice.com ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * INSTRUCTIONS EN 4 ÉTAPES :
 * 
 * 1. Ouvrir leaderbackoffice.com/author/dashboard (être connecté)
 * 2. Ouvrir DevTools : Cmd+Option+I → onglet Console
 * 3. Coller CE SCRIPT ENTIER et appuyer Entrée
 * 4. Exécuter : window._lwAutoScrape()
 *    → Attendre que tous les cours soient capturés (~30 secondes)
 * 5. Exécuter : copy(window._lwExportForD1())
 *    → Le JSON est maintenant dans le presse-papier
 * 6. Coller le JSON dans un fichier lw_export.json
 * 7. Sur le serveur : python3 scripts/lw_d1_importer.py lw_export.json
 *
 * SI _lwAutoScrape() échoue (Network Error) :
 * → Naviguer MANUELLEMENT dans chaque cours de l'interface admin
 * → L'intercepteur capture automatiquement les données au chargement
 * → Exécuter window._lwStatus() pour voir ce qui a été capturé
 */

(function() {
  'use strict';

  window._lwData = {
    courses: {},
    rawResponses: [],
    capturedAt: new Date().toISOString()
  };

  // ── Parsers ─────────────────────────────────────────────────

  function parseCourseData(url, data) {
    if (!data || typeof data !== 'object') return;
    if (data.sections || data.outline || data.units || data.items) {
      extractFromCourse(url, data);
    }
    if (Array.isArray(data.data)) {
      data.data.forEach(item => {
        if (item.sections || item.outline || item.units) extractFromCourse(url, item);
      });
    }
    ['product','course','item','result'].forEach(k => {
      if (data[k] && (data[k].sections || data[k].outline || data[k].units)) {
        extractFromCourse(url, data[k]);
      }
    });
  }

  function extractFromCourse(url, c) {
    const id = c.id || c._id || c.permalink || extractIdFromUrl(url);
    if (!id) return;
    const title = c.title || c.name || '?';
    const sections = [];

    // Format sections[]
    if (c.sections && Array.isArray(c.sections)) {
      c.sections.forEach(s => {
        const sec = { id: s.id||s._id||genId(), title: s.title||s.name||'', lessons: [] };
        (s.units||s.lessons||s.items||[]).forEach(u => sec.lessons.push(mkLesson(u)));
        sections.push(sec);
      });
    }
    // Format outline[]
    if (!sections.length && c.outline && Array.isArray(c.outline)) {
      c.outline.forEach(s => {
        const sec = { id: s.id||s._id||genId(), title: s.title||s.label||'', lessons: [] };
        (s.items||s.units||s.lessons||[]).forEach(u => sec.lessons.push(mkLesson(u)));
        sections.push(sec);
      });
    }
    // Format units[] flat
    if (!sections.length && c.units && Array.isArray(c.units)) {
      const sec = { id: 'main', title, lessons: [] };
      c.units.forEach(u => sec.lessons.push(mkLesson(u)));
      sections.push(sec);
    }
    // Format items[] (liste de leçons directes)
    if (!sections.length && c.items && Array.isArray(c.items)) {
      const sec = { id: 'main', title, lessons: [] };
      c.items.forEach(u => sec.lessons.push(mkLesson(u)));
      sections.push(sec);
    }

    if (sections.length > 0 || c.title) {
      const totalLessons = sections.reduce((a,s) => a + s.lessons.length, 0);
      window._lwData.courses[id] = {
        id, title,
        slug: c.slug||c.permalink||'',
        thumbnail: c.image||c.thumbnail||c.cover_image||c.coverImage||'',
        sections, totalLessons,
        capturedFrom: url
      };
      console.log(`✅ [LW] "${title}" — ${sections.length} sections, ${totalLessons} leçons`);
    }
  }

  function mkLesson(u) {
    const lesson = {
      id: u.id||u._id||genId(),
      title: u.title||u.name||u.label||'',
      type: u.type||u.kind||'video',
      durationSeconds: 0,
      durationFormatted: '',
      videoUrl: '',
      videoType: 'learnworlds'
    };

    // Durée
    if (typeof u.duration === 'number') {
      lesson.durationSeconds = u.duration;
      lesson.durationFormatted = fmtDur(u.duration);
    } else if (typeof u.duration === 'string') {
      lesson.durationFormatted = u.duration;
      lesson.durationSeconds = parseDur(u.duration);
    } else {
      const d = u.video_duration||u.videoDuration||u.length||u.durationSeconds||0;
      if (d) {
        lesson.durationSeconds = typeof d==='number' ? d : parseDur(String(d));
        lesson.durationFormatted = fmtDur(lesson.durationSeconds);
      }
    }

    // URL vidéo (plusieurs formats possibles)
    const vd = u.video||u.videoData||u.content||u.media||{};
    lesson.videoUrl = (
      (typeof vd === 'string' ? vd : '') ||
      vd.url||vd.src||vd.path||vd.hls_url||
      u.video_url||u.videoUrl||u.url||u.src||''
    );

    // Wistia
    const wid = u.wistia_id||vd.wistia_id||u.wistiaId||'';
    if (wid) { lesson.videoUrl = `https://fast.wistia.com/medias/${wid}`; }

    // Type
    if (lesson.videoUrl) {
      const v = lesson.videoUrl.toLowerCase();
      if (v.includes('youtube.com')||v.includes('youtu.be')) lesson.videoType='youtube';
      else if (v.includes('vimeo.com')) lesson.videoType='vimeo';
      else if (v.includes('wistia')) lesson.videoType='wistia';
      else if (v.includes('lwfiles')) lesson.videoType='learnworlds';
    }

    return lesson;
  }

  function extractIdFromUrl(url) {
    const m = url.match(/\/(?:products|courses|items|c)\/([a-zA-Z0-9_-]{6,})/);
    return m ? m[1] : null;
  }
  function genId() { return 'gen_'+Math.random().toString(36).substr(2,9); }
  function fmtDur(s) {
    if(!s) return '0:00';
    const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
    if(h>0) return `${h}:${pad(m)}:${pad(sec)}`;
    return `${m}:${pad(sec)}`;
  }
  function pad(n) { return String(n).padStart(2,'0'); }
  function parseDur(str) {
    if(!str) return 0;
    const p = str.split(':').map(Number);
    if(p.length===3) return p[0]*3600+p[1]*60+p[2];
    if(p.length===2) return p[0]*60+p[1];
    return parseInt(str)||0;
  }

  // ── Interception XHR ────────────────────────────────────────

  const _xhrOpen = XMLHttpRequest.prototype.open;
  const _xhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(m, url) {
    this.__url = url; this.__method = m;
    return _xhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function() {
    const url = this.__url||'';
    const relevant = /\/(api|v2)\/.*(product|course|section|unit|lesson|outline|curriculum|author)/i.test(url);
    if (relevant) {
      this.addEventListener('load', function() {
        try {
          if (this.responseText && this.responseText.length > 50) {
            const j = JSON.parse(this.responseText);
            window._lwData.rawResponses.push({url, data:j, ts:Date.now()});
            parseCourseData(url, j);
          }
        } catch(e) {}
      });
    }
    return _xhrSend.apply(this, arguments);
  };

  // ── Interception Fetch ──────────────────────────────────────

  const _fetch = window.fetch;
  window.fetch = function(input, init) {
    const url = typeof input==='string' ? input : (input&&input.url)||String(input);
    const relevant = /(learnworlds|leaderbackoffice).*\/(product|course|section|unit|lesson|outline|author)/i.test(url)
      || /\/(api|v2)\/.*(product|course|outline|author)/i.test(url);
    const p = _fetch.apply(this, arguments);
    if (relevant) {
      p.then(r => r.clone().text().then(t => {
        try {
          if (t && t.length > 50) {
            const j = JSON.parse(t);
            window._lwData.rawResponses.push({url, data:j, ts:Date.now()});
            parseCourseData(url, j);
          }
        } catch(e) {}
      }).catch(()=>{})).catch(()=>{});
    }
    return p;
  };

  // ── Auto-scraper ────────────────────────────────────────────

  window._lwAutoScrape = async function() {
    console.log('🚀 [LW] Démarrage auto-scrape...');

    // Détecter la config depuis les globals de la page
    const clientId = window.lw_client||window.__LW_CLIENT__||
      (document.querySelector('[data-client]')||{}).dataset?.client||'64ccb9f73dbaa400be4b2f20';
    const apiBase = window.api||window.__API_URL__||'https://api.us-e2.learnworlds.com/';
    const token = window.lw_access_token||window.__AUTH_TOKEN__||
      getCookie('lw-access-token')||getCookie('access_token')||
      getCookie('Sv8nqmRTsC7xkUj8FwuW1Qnbs6hWKKwZLSvFhGqz');

    console.log(`📌 ClientID: ${clientId}`);
    console.log(`📌 API: ${apiBase}`);
    console.log(`📌 Token: ${token ? token.substring(0,20)+'...' : 'NON TROUVÉ'}`);

    const headers = { 'Content-Type':'application/json', 'Accept':'application/json' };
    if (token) { headers['Authorization'] = `Bearer ${token}`; }
    if (clientId) { headers['Lw-Client'] = clientId; }

    // Essayer de récupérer la liste des produits
    const listEndpoints = [
      `${apiBase}v2/products?page=1&itemsPerPage=200&type=course`,
      `${apiBase}v2/products?page=1&itemsPerPage=200`,
      `${apiBase}author/products?itemsPerPage=200`,
      `/api/v2/products?itemsPerPage=200`,
      `/api/author/products?itemsPerPage=200`
    ];

    let productIds = [];

    for (const ep of listEndpoints) {
      try {
        console.log(`📡 Liste: ${ep.substring(0,60)}...`);
        const r = await _fetch(ep, { headers, credentials:'include' });
        if (r.ok) {
          const d = await r.json();
          console.log(`✅ Réponse liste: ${JSON.stringify(d).substring(0,150)}`);
          parseCourseData(ep, d);
          const items = d.data||d.items||d.products||d.courses||[];
          if (Array.isArray(items) && items.length > 0) {
            productIds = items.map(i => i.id||i._id).filter(Boolean);
            console.log(`📦 ${productIds.length} cours trouvés: ${productIds.join(', ').substring(0,100)}`);
          }
          break;
        } else {
          console.log(`  → HTTP ${r.status}`);
        }
      } catch(e) {
        console.log(`  → Erreur: ${e.message}`);
      }
    }

    // Récupérer les détails de chaque cours
    if (productIds.length > 0) {
      console.log(`\n🔍 Récupération de ${productIds.length} cours...`);
      for (let i=0; i<productIds.length; i++) {
        const pid = productIds[i];
        console.log(`  [${i+1}/${productIds.length}] Cours: ${pid}`);
        await fetchDetail(apiBase, pid, headers);
        await sleep(400);
      }
    }

    // Résumé
    const count = Object.keys(window._lwData.courses).length;
    console.log(`\n✅ Auto-scrape terminé: ${count} cours capturés`);
    if (count > 0) {
      console.log(`\n🎯 PROCHAINE ÉTAPE :`);
      console.log(`   copy(window._lwExportForD1())`);
      console.log(`   → Puis coller dans un fichier lw_export.json`);
    } else {
      console.log(`\n⚠️ Aucun cours capturé via API.`);
      console.log(`   → Navigue manuellement dans chaque cours de l'interface`);
      console.log(`   → L'intercepteur capturera les données automatiquement`);
    }
  };

  async function fetchDetail(api, pid, headers) {
    const eps = [
      `${api}v2/products/${pid}`,
      `${api}v2/courses/${pid}`,
      `${api}author/products/${pid}`,
      `/api/v2/products/${pid}`,
      `/api/author/products/${pid}`
    ];
    for (const ep of eps) {
      try {
        const r = await _fetch(ep, { headers, credentials:'include' });
        if (r.ok) {
          const d = await r.json();
          parseCourseData(ep, d);
          return true;
        }
      } catch(e) {}
    }
    return false;
  }

  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|;\\s*)'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Export ──────────────────────────────────────────────────

  window._lwExportForD1 = function() {
    const courses = Object.values(window._lwData.courses);
    if (!courses.length) {
      console.warn('⚠️ Aucun cours. Exécute _lwAutoScrape() ou navigue dans l\'UI.');
      return '{}';
    }
    const out = {
      exportedAt: new Date().toISOString(),
      totalCourses: courses.length,
      totalLessons: courses.reduce((a,c) => a+c.totalLessons, 0),
      courses: courses.map(c => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        thumbnail: c.thumbnail,
        sections: c.sections.map(s => ({
          id: s.id,
          title: s.title,
          lessons: s.lessons.map(l => ({
            id: l.id,
            title: l.title,
            videoUrl: l.videoUrl,
            videoType: l.videoType,
            durationSeconds: l.durationSeconds,
            durationFormatted: l.durationFormatted
          }))
        }))
      }))
    };
    const json = JSON.stringify(out, null, 2);
    console.log(`📦 Export prêt: ${courses.length} cours, ${out.totalLessons} leçons`);
    console.log(`📋 Utilise: copy(window._lwExportForD1()) pour copier`);
    return json;
  };

  window._lwStatus = function() {
    const courses = Object.values(window._lwData.courses);
    console.log(`\n━━━━ STATUT INTERCEPTEUR LW ━━━━`);
    console.log(`Cours: ${courses.length} | Réponses: ${window._lwData.rawResponses.length}`);
    courses.forEach(c => console.log(`  • [${c.totalLessons} leç.] ${c.title}`));
    console.log(`\nCOMMANDES:`);
    console.log(`  window._lwAutoScrape()      → scrape auto`);
    console.log(`  window._lwStatus()          → ce menu`);
    console.log(`  copy(window._lwExportForD1()) → export JSON`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  };

  // ── Démarrage ───────────────────────────────────────────────

  console.log(`
╔═══════════════════════════════════════╗
║  ✅ INTERCEPTEUR LW ACTIF             ║
╠═══════════════════════════════════════╣
║  ÉTAPE 1: window._lwAutoScrape()      ║
║  ÉTAPE 2: window._lwStatus()          ║
║  ÉTAPE 3: copy(window._lwExportForD1())║
╚═══════════════════════════════════════╝`);

})();
