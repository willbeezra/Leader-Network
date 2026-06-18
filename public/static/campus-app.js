// ============================================================
// CAMPUS APP — Interface membre premium + Admin
// ============================================================

// ── Helper traduction : utilise window.t() si disponible ─────────────────
function _t(text) {
  if (!text) return text;
  if (typeof window.t === 'function') return window.t(text);
  return text;
}

// ── Helpers API campus (avec auth automatique) ──────────────
function _campusToken() {
  // Essaie le token admin d'abord, sinon le token membre
  return (typeof adminToken !== 'undefined' && adminToken)
    ? adminToken
    : (typeof memberToken !== 'undefined' && memberToken)
      ? memberToken
      : localStorage.getItem('leader_admin_token') || localStorage.getItem('leader_member_token') || '';
}

async function campusFetch(url, options = {}) {
  const tok = _campusToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (tok) headers['Authorization'] = `Bearer ${tok}`;
  const res = await window.fetch(url, { ...options, headers });
  return res;
}

// ============================================================
// SECTION MEMBRE — Catalogue Campus
// ============================================================
// ── URL logo Campus (stockée en DB, réutilisée ici en dur pour la landing) ──
const _CAMPUS_LOGO_URL = 'https://www.genspark.ai/api/files/s/7McAtYcm';

// ── Les 6 piliers de l'éducation financière LEADER ───────────────────────────
const _CAMPUS_PILLARS = [
  { id: 1, icon: 'fa-graduation-cap', label: 'Campus',         color: '#c9a84c', active: true  },
  { id: 2, icon: 'fa-chart-line',     label: 'Investissement', color: '#4ade80', active: false },
  { id: 3, icon: 'fa-briefcase',      label: 'Business',       color: '#60a5fa', active: false },
  { id: 4, icon: 'fa-brain',          label: 'Mindset',        color: '#a78bfa', active: false },
  { id: 5, icon: 'fa-handshake',      label: 'Réseau',         color: '#f472b6', active: false },
  { id: 6, icon: 'fa-shield-halved',  label: 'Protection',     color: '#fb923c', active: false },
];

async function showCampusPage(container) {
  console.log('[Campus] showCampusPage appelé — v2025-06-17');
  const mainContent = container || document.getElementById('page-content') || document.getElementById('main-content');
  if (!mainContent) { console.error('[Campus] container introuvable'); return; }

  mainContent.innerHTML = `
    <div class="campus-loading">
      <div class="campus-loading-inner">
        <i class="fas fa-graduation-cap campus-loading-icon"></i>
        <p>Chargement du Campus...</p>
      </div>
    </div>
  `;

  try {
    console.log('[Campus] fetch /api/campus...');
    const res = await campusFetch('/api/campus');
    console.log('[Campus] réponse HTTP', res.status);
    const data = await res.json();
    const { categories, courses, has_campus_access, config = {}, campus_logo } = data;
    console.log('[Campus] données reçues — courses:', courses?.length, 'cats:', categories?.length, 'access:', has_campus_access);

    // ── Stocker la config globalement pour renderCampusCourseCard ─────────────
    window._campusConfig = config;

    // ── TOUJOURS : landing en premier, catalogue en dessous ───────────────────
    _renderCampusFullPage(mainContent, courses, categories, !!has_campus_access, config, campus_logo);
    console.log('[Campus] rendu terminé');

  } catch (err) {
    console.error('[Campus] Erreur showCampusPage:', err);
    mainContent.innerHTML = `
      <div class="campus-error">
        <i class="fas fa-exclamation-circle"></i>
        <p>Erreur de chargement du campus</p>
        <p style="font-size:11px;color:#f87171;margin-top:6px;font-family:monospace;max-width:600px;word-break:break-all;">${err?.message || String(err)}</p>
        <button onclick="showCampusPage()">Réessayer</button>
      </div>
    `;
  }
}

// ── Page complète Campus : landing TOUJOURS visible + catalogue en dessous ────
// config = objet {campus_hero_title, campus_hero_desc, ...} depuis landing_config
// campusLogo = data-uri ou url du logo détouré depuis landing_services
function _renderCampusFullPage(mainContent, courses, categories, hasAccess, config = {}, campusLogo = null) {

  // ── Helpers config ────────────────────────────────────────────────────────
  const cfg = (key, fallback) => (config[key] !== undefined && config[key] !== '') ? config[key] : fallback;

  // ── Logo : data-uri prioritaire, puis URL Genspark, puis fallback icon ────
  const logoSrc = campusLogo || 'https://www.genspark.ai/api/files/s/7McAtYcm';

  // ── Stats : prendre le nombre réel de cours/cats si plus grand ────────────
  const realCourses  = courses.length;
  const realCats     = categories.length;
  const realHours    = courses.reduce((s, c) => s + (c.total_duration_minutes || 0), 0);
  const hoursDisplay = realHours > 0 ? Math.round(realHours / 60) : 0;

  const statCourses = cfg('campus_stat_courses', realCourses > 0 ? realCourses + '+' : '100+');
  const statHours   = cfg('campus_stat_hours',   hoursDisplay > 0 ? hoursDisplay + 'h+' : '1 000h+');
  const statCats    = realCats;
  const statAccess  = cfg('campus_stat_access',  '∞');

  // ── Textes hero ───────────────────────────────────────────────────────────
  const heroTitle       = cfg('campus_hero_title',        'Club privé d\'éducation');
  const heroAccent      = cfg('campus_hero_title_accent', 'financière');
  const heroBadge       = cfg('campus_hero_pillar_badge', 'Pilier n°1 — Éducation Financière');
  const heroSlogan      = cfg('campus_hero_slogan',       '"Ensemble, faisons une différence"');
  const heroDesc        = cfg('campus_hero_desc',
    'Campus LEADER est le 1er des 6 piliers de l\'éducation financière. Une plateforme exclusive réservée aux membres de notre communauté — des formations conçues par les meilleurs formateurs, coachs et conférenciers de la planète pour transformer ta façon de voir l\'argent, les affaires et ta vie.');

  const ctaAccess    = cfg('campus_cta_access',     'Accéder à mes formations');
  const ctaGetAccess = cfg('campus_cta_get_access', 'Obtenir l\'accès Campus');
  const ctaExplore   = cfg('campus_cta_explore',    'Explorer les formations');
  const ctaScroll    = cfg('campus_cta_scroll',     'Explorer');

  // ── Formateurs ────────────────────────────────────────────────────────────
  const coachTitle   = cfg('campus_coaches_title', 'Les meilleurs experts de la planète');
  const coachDesc    = cfg('campus_coaches_desc',
    'Nos formations sont animées par des entrepreneurs millionnaires, investisseurs reconnus, coachs certifiés et conférenciers internationaux. Des méthodes éprouvées, des résultats concrets.');
  const coachBadge1  = cfg('campus_coaches_badge_1', 'Formateurs certifiés');
  const coachBadge2  = cfg('campus_coaches_badge_2', 'Conférenciers internationaux');
  const coachBadge3  = cfg('campus_coaches_badge_3', 'Entrepreneurs & investisseurs');
  const coachBadge4  = cfg('campus_coaches_badge_4', 'Coachs & mentors d\'élite');

  // ── 6 piliers depuis config ───────────────────────────────────────────────
  const PILLARS = [1,2,3,4,5,6].map(n => ({
    num:    n,
    label:  cfg(`campus_pillar_${n}_label`, ['S\'Éduquer','Créer la richesse','Protéger sa richesse','Multiplier sa richesse','Profiter de sa richesse','Partager'][n-1]),
    icon:   cfg(`campus_pillar_${n}_icon`,  ['fa-graduation-cap','fa-seedling','fa-shield-halved','fa-chart-line','fa-gem','fa-heart-handshake'][n-1]),
    color:  cfg(`campus_pillar_${n}_color`, ['#c9a84c','#4ade80','#60a5fa','#a78bfa','#f472b6','#fb923c'][n-1]),
    active: cfg(`campus_pillar_${n}_active`, n === 1 ? '1' : '0') === '1',
  }));

  // ── Piliers textes ────────────────────────────────────────────────────────
  const pillarsTitle = cfg('campus_pillars_title', 'Les 6 piliers de l\'éducation financière');
  const pillarsDesc  = cfg('campus_pillars_desc',  'Campus est le premier. Les 5 autres piliers arrivent bientôt.');

  // ── Bannière accès refusé ─────────────────────────────────────────────────
  const bannerTitle  = cfg('campus_banner_title', 'Les formations ci-dessous sont verrouillées');
  const bannerDesc   = cfg('campus_banner_desc',  'L\'accès Campus est inclus dans certains packages LEADER.');
  const bannerCta    = cfg('campus_banner_cta',   'Voir les packages');

  // ── Grouper cours par catégorie pour le catalogue ─────────────────────────
  const catMap = new Map();
  for (const cat of categories) catMap.set(cat.id, { ...cat, courses: [] });
  for (const course of courses) {
    if (catMap.has(course.category_id)) catMap.get(course.category_id).courses.push(course);
  }

  mainContent.innerHTML = `
    <div class="campus-full-page">

      <!-- ══════════ HERO ══════════ -->
      <section class="cl-hero">
        <div class="cl-hero-glow"></div>
        <div class="cl-hero-content">

          <div class="cl-hero-logo-wrap">
            <img src="${logoSrc}" alt="Campus LEADER" class="cl-hero-logo"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="cl-hero-logo-fallback" style="display:none">
              <i class="fas fa-graduation-cap"></i>
            </div>
          </div>

          <div class="cl-hero-pillar-badge">
            <i class="fas fa-star"></i>
            <span>${heroBadge}</span>
          </div>

          <h1 class="cl-hero-title">
            ${heroTitle}<br>
            <span class="cl-hero-title-accent">${heroAccent}</span>
          </h1>

          <p class="cl-hero-slogan">${heroSlogan}</p>
          <p class="cl-hero-desc">${heroDesc}</p>

          <!-- CTAs -->
          <div class="cl-cta-group">
            ${hasAccess
              ? `<button class="cl-cta-primary" onclick="_campusScrollToCatalog()">
                   <i class="fas fa-play-circle"></i> ${ctaAccess}
                 </button>`
              : `<button class="cl-cta-primary" onclick="campusGoToPackages()">
                   <i class="fas fa-unlock-alt"></i> ${ctaGetAccess}
                 </button>`
            }
            <button class="cl-cta-secondary" onclick="_campusScrollToCatalog()">
              <i class="fas fa-eye"></i> ${ctaExplore}
            </button>
          </div>

          <div class="cl-scroll-hint" onclick="_campusScrollToCatalog()">
            <span>${ctaScroll}</span>
            <i class="fas fa-chevron-down cl-scroll-arrow"></i>
          </div>

        </div>
      </section>

      <!-- ══════════ FORMATEURS ══════════ -->
      <section class="cl-coaches">
        <div class="cl-coaches-header">
          <h2>${coachTitle}</h2>
          <p>${coachDesc}</p>
        </div>
        <div class="cl-coaches-badges">
          <span class="cl-coach-badge"><i class="fas fa-certificate"></i> ${coachBadge1}</span>
          <span class="cl-coach-badge"><i class="fas fa-globe"></i> ${coachBadge2}</span>
          <span class="cl-coach-badge"><i class="fas fa-briefcase"></i> ${coachBadge3}</span>
          <span class="cl-coach-badge"><i class="fas fa-star"></i> ${coachBadge4}</span>
        </div>
        <div class="cl-coaches-quote">
          <p>La connaissance est la seule richesse que personne ne peut te voler. Investir dans ton éducation financière, c'est poser les fondations d'une liberté durable.</p>
          <cite>— Vision LEADER Network</cite>
        </div>
      </section>

      <!-- ══════════ 6 PILIERS ══════════ -->
      <section class="cl-pillars">
        <div class="cl-pillars-header">
          <h2>${pillarsTitle}</h2>
          <p>${pillarsDesc}</p>
        </div>
        <div class="cl-pillars-grid">
          ${PILLARS.map(p => `
            <div class="cl-pillar ${p.active ? 'cl-pillar-active' : 'cl-pillar-soon'}">
              <div class="cl-pillar-num" style="color:${p.color}">0${p.num}</div>
              <div class="cl-pillar-icon" style="background:${p.color}18;border-color:${p.color}35">
                <i class="fas ${p.icon}" style="color:${p.color}"></i>
              </div>
              <div class="cl-pillar-label">${p.label}</div>
              ${p.active
                ? `<div class="cl-pillar-badge-active"><i class="fas fa-check"></i> Disponible</div>`
                : `<div class="cl-pillar-badge-soon"><i class="fas fa-clock"></i> Bientôt</div>`
              }
            </div>
          `).join('')}
        </div>
      </section>

      <!-- ══════════ BANNIÈRE ACCÈS ══════════ -->
      ${!hasAccess ? `
      <section class="cl-access-banner">
        <div class="cl-access-banner-inner">
          <div class="cl-access-banner-icon"><i class="fas fa-lock"></i></div>
          <div class="cl-access-banner-text">
            <strong>${bannerTitle}</strong>
            <span>${bannerDesc}</span>
          </div>
          <button class="cl-cta-primary cl-access-banner-btn" onclick="campusGoToPackages()">
            <i class="fas fa-rocket"></i> ${bannerCta}
          </button>
        </div>
      </section>
      ` : ''}

      <!-- ══════════ CATALOGUE ══════════ -->
      <div id="campus-catalog-anchor" class="campus-wrap" style="padding-top:0">
        <div class="campus-filters">
          <div class="campus-filter-tabs">
            <button class="campus-filter-tab active" onclick="campusFilterBy('all')">
              <i class="fas fa-th-large"></i> Tout
            </button>
            ${categories.map(cat => `
              <button class="campus-filter-tab" onclick="campusFilterBy('${cat.id}')"
                      style="--cat-color:${cat.color}">
                <i class="fas ${cat.icon}"></i> ${cat.name}
              </button>
            `).join('')}
          </div>
          <div class="campus-search-wrap">
            <i class="fas fa-search"></i>
            <input type="text" id="campus-search-input" placeholder="Rechercher une formation..."
                   oninput="campusSearch(this.value)" autocomplete="off">
          </div>
        </div>

        <div id="campus-catalog">
          ${[...catMap.values()].filter(cat => cat.courses.length > 0).map(cat => `
            <section class="campus-section" data-cat="${cat.id}">
              <div class="campus-section-header">
                <div class="campus-section-badge" style="background:${cat.color}20;border-color:${cat.color}40">
                  <i class="fas ${cat.icon}" style="color:${cat.color}"></i>
                  <span style="color:${cat.color}">${cat.name}</span>
                </div>
                <span class="campus-section-count">${cat.courses.length} formation${cat.courses.length > 1 ? 's' : ''}</span>
              </div>
              <div class="campus-grid">
                ${cat.courses.map(course => renderCampusCourseCard(course)).join('')}
              </div>
            </section>
          `).join('')}
        </div>

        <div id="campus-empty" class="campus-empty" style="display:none">
          <i class="fas fa-search"></i>
          <p>Aucune formation trouvée</p>
        </div>
      </div>

    </div>
  `;
}

// Scroll doux vers le catalogue
function _campusScrollToCatalog() {
  const anchor = document.getElementById('campus-catalog-anchor');
  if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Fonctions legacy supprimées — remplacées par _renderCampusFullPage ────────
function _renderCampusLanding(el, courses, categories) { _renderCampusFullPage(el, courses, categories, false); }
function _renderCampusCatalog(el, courses, categories)  { _renderCampusFullPage(el, courses, categories, true);  }
function _campusPreviewCatalog() { _campusScrollToCatalog(); }

function renderCampusCourseCard(course) {
  // ── Configs badges depuis landing_config (100% configurables admin) ──
  const _cfg = window._campusConfig || {};
  const badgeIncludedText  = _cfg.campus_badge_included_text  || 'Inclus';
  const badgeIncludedColor = _cfg.campus_badge_included_color || '#22c55e';
  const badgeIncludedIcon  = _cfg.campus_badge_included_icon  || 'fa-check-circle';
  const badgeLockedText    = _cfg.campus_badge_locked_text    || 'Verrouillé';
  const badgeLockedColor   = _cfg.campus_badge_locked_color   || '#6b7280';
  const badgeLockedIcon    = _cfg.campus_badge_locked_icon    || 'fa-lock';
  const badgeFreeText      = _cfg.campus_badge_free_text      || 'Gratuit';
  const badgeFreeColor     = _cfg.campus_badge_free_color     || '#c9a84c';
  const badgeFreeIcon      = _cfg.campus_badge_free_icon      || 'fa-star';

  // ── Détermination du statut ──
  // access_status : 'included' | 'free' | 'priced' | 'locked'
  const status = course.access_status || (course.has_access ? 'included' : (course.is_free ? 'free' : (course.price_usd > 0 ? 'priced' : 'locked')));

  const progressBar = course.progress > 0 ? `
    <div class="campus-card-progress">
      <div class="campus-card-progress-bar" style="width:${course.progress}%"></div>
    </div>
    <span class="campus-card-pct">${course.progress}%</span>
  ` : '';

  // ── Badge selon le statut ──
  let badge = '';
  if (status === 'included') {
    badge = `<span class="campus-access-badge campus-access-badge--included" style="background:${badgeIncludedColor}22;border-color:${badgeIncludedColor}55;color:${badgeIncludedColor}">
      <i class="fas ${badgeIncludedIcon}"></i> ${badgeIncludedText}
    </span>`;
  } else if (status === 'free') {
    badge = `<span class="campus-access-badge campus-access-badge--free" style="background:${badgeFreeColor}22;border-color:${badgeFreeColor}55;color:${badgeFreeColor}">
      <i class="fas ${badgeFreeIcon}"></i> ${badgeFreeText}
    </span>`;
  } else if (status === 'priced') {
    const price = course.price_usd > 0 ? `$${Number(course.price_usd).toLocaleString('fr-FR')}` : '';
    badge = `<span class="campus-access-badge campus-access-badge--priced" style="background:#791E1522;border-color:#791E1555;color:#c9a84c">
      <i class="fas fa-tag"></i> ${price}
    </span>`;
  } else {
    // locked
    badge = `<span class="campus-access-badge campus-access-badge--locked" style="background:${badgeLockedColor}22;border-color:${badgeLockedColor}44;color:${badgeLockedColor}">
      <i class="fas ${badgeLockedIcon}"></i> ${badgeLockedText}
    </span>`;
  }

  const levelBadge = course.level !== 'all' ? `
    <span class="campus-badge-level">${course.level}</span>
  ` : '';

  const thumb = course.thumbnail_url
    ? `<img src="${course.thumbnail_url}" alt="${course.title}" loading="lazy">`
    : `<div class="campus-card-thumb-placeholder" style="background:${course.category_color || '#791E15'}22">
        <i class="fas fa-play-circle" style="color:${course.category_color || '#791E15'}"></i>
       </div>`;

  // Overlay cadenas si cours verrouillé ou payant
  const locked = (status === 'locked' || status === 'priced');
  const lockOverlay = locked ? `
    <div class="campus-card-lock-overlay">
      <i class="fas ${status === 'priced' ? 'fa-tag' : 'fa-lock'}"></i>
    </div>
  ` : '';

  // ── Action au clic ──
  // - included / free → ouvre la formation
  // - priced → ouvre le wizard d'achat si un package est défini, sinon la formation (qui affichera le banner verrouillé)
  // - locked → ouvre la formation (qui affichera le banner verrouillé avec lien packages)
  let onClickAction = `showCampusCourse('${course.slug}')`;
  if (status === 'priced' && course.buy_package) {
    const pkg = course.buy_package;
    const pkgName = encodeURIComponent(pkg.package_name || pkg.name || '');
    onClickAction = `openCoursePaymentWizard('${pkg.package_id}','${pkgName}',${pkg.package_price || 0})`;
  }

  // ── Texte footer ──
  const footerRight = (status === 'included' || status === 'free')
    ? `<span class="campus-card-lessons"><i class="fas fa-play-circle"></i> ${course.total_lessons || 0} ${_t(course.total_lessons > 1 ? 'leçons' : 'leçon')}</span>`
    : status === 'priced'
      ? `<span class="campus-card-unlock" style="color:#c9a84c"><i class="fas fa-shopping-cart"></i> Acquérir</span>`
      : `<span class="campus-card-unlock"><i class="fas fa-unlock-alt"></i> Débloquer</span>`;

  return `
    <article class="campus-card ${locked ? 'campus-card-locked' : ''}" onclick="${onClickAction}"
             data-title="${course.title.toLowerCase()}" data-cat="${course.category_id}"
             data-status="${status}">
      <div class="campus-card-thumb">
        ${thumb}
        ${badge}
        ${progressBar}
        ${lockOverlay}
      </div>
      <div class="campus-card-body">
        <div class="campus-card-meta">
          <span class="campus-card-cat" style="color:${course.category_color || '#791E15'}">
            ${course.category_name || ''}
          </span>
          ${levelBadge}
        </div>
        <h3 class="campus-card-title">${_t(course.title)}</h3>
        ${course.subtitle ? `<p class="campus-card-sub">${_t(course.subtitle)}</p>` : ''}
        <div class="campus-card-footer">
          <span class="campus-card-instructor">
            <i class="fas fa-user-tie"></i> ${_t(course.instructor || 'Équipe LEADER')}
          </span>
          ${footerRight}
        </div>
      </div>
    </article>
  `;
}

// ── Ouvre le wizard d'achat packages depuis une carte formation ──────────────
// Réutilise exactement le même wizard que l'onglet Packages
function openCoursePaymentWizard(packageId, packageNameEncoded, priceUsd) {
  const packageName = decodeURIComponent(packageNameEncoded);
  // wizardStart est défini dans member-app.js — même wizard que les packages
  if (typeof wizardStart === 'function') {
    wizardStart(packageId, packageNameEncoded, priceUsd, 0, false, 0, 0);
  } else {
    // Fallback : aller vers l'onglet packages
    if (typeof showPage === 'function') showPage('packages');
  }
}

function campusFilterBy(catId) {
  document.querySelectorAll('.campus-filter-tab').forEach(btn => btn.classList.remove('active'));
  const clickedBtn = event?.target?.closest('.campus-filter-tab');
  if (clickedBtn) clickedBtn.classList.add('active');

  document.querySelectorAll('.campus-section').forEach(section => {
    if (catId === 'all' || section.dataset.cat === catId) {
      section.style.display = '';
    } else {
      section.style.display = 'none';
    }
  });
}

function campusSearch(query) {
  const q = query.toLowerCase().trim();
  const cards = document.querySelectorAll('.campus-card');
  let visible = 0;

  cards.forEach(card => {
    const title = card.dataset.title || '';
    const match = !q || title.includes(q);
    card.style.display = match ? '' : 'none';
    if (match) visible++;
  });

  // Masquer sections vides
  document.querySelectorAll('.campus-section').forEach(section => {
    const visibleCards = section.querySelectorAll('.campus-card:not([style*="display: none"])').length;
    section.style.display = visibleCards > 0 ? '' : 'none';
  });

  document.getElementById('campus-empty').style.display = visible === 0 ? 'flex' : 'none';
}

// ============================================================
// PAGE FORMATION — Détail + Player
// ============================================================
async function showCampusCourse(slug) {
  const mainContent = document.getElementById('page-content') || document.getElementById('main-content');
  mainContent.innerHTML = `
    <div class="campus-loading">
      <div class="campus-loading-inner">
        <i class="fas fa-spinner fa-spin campus-loading-icon"></i>
        <p>Chargement...</p>
      </div>
    </div>
  `;

  try {
    const res = await campusFetch(`/api/campus/course/${slug}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const { course, modules } = data;
    const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
    const completedLessons = modules.reduce((acc, m) => acc + m.lessons.filter(l => l.completed).length, 0);
    const progress = totalLessons > 0 ? Math.round(100 * completedLessons / totalLessons) : 0;
    const courseHasAccess = course.has_access !== false;

    // Trouver la première leçon avec vidéo (accessible) ou la première leçon
    let firstLesson = null;
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        if (!firstLesson) firstLesson = lesson;
        if (lesson.video_url && !firstLesson.video_url) firstLesson = lesson;
      }
    }

    // Bloc d'accès restreint
    const lockedBanner = !courseHasAccess ? (() => {
      const pkg = course.required_package;
      const pkgName = pkg?.name || 'ce package';
      const pkgPrice = pkg?.price_usd ? `$${pkg.price_usd}` : '';
      return `
        <div class="campus-locked-banner">
          <div class="campus-locked-banner-icon"><i class="fas fa-lock"></i></div>
          <div class="campus-locked-banner-text">
            <strong>Formation réservée aux membres</strong>
            <p>Cette formation est accessible avec ${_t(pkgName)}${pkgPrice ? ` (${pkgPrice})` : ''}.</p>
          </div>
          <button class="campus-locked-btn" onclick="campusGoToPackages()">
            <i class="fas fa-unlock-alt"></i> Obtenir l'accès
          </button>
        </div>
      `;
    })() : '';

    mainContent.innerHTML = `
      <div class="campus-course-wrap">
        <!-- BACK -->
        <nav class="campus-course-nav">
          <button class="campus-back-btn" onclick="showCampusPage()">
            <i class="fas fa-arrow-left"></i> Retour au catalogue
          </button>
          <span class="campus-course-nav-title">${_t(course.title)}</span>
        </nav>

        ${lockedBanner}

        <div class="campus-course-layout">
          <!-- COLONNE PRINCIPALE -->
          <div class="campus-course-main">
            <!-- PLAYER -->
            <div class="campus-player-wrap" id="campus-player-wrap">
              ${!courseHasAccess
                ? `<div class="campus-player-locked">
                    <i class="fas fa-lock"></i>
                    <p>Obtenez l'accès pour regarder cette formation</p>
                  </div>`
                : firstLesson && firstLesson.video_url
                  ? renderVideoPlayer(firstLesson.video_url, firstLesson.video_type, firstLesson.title)
                  : `<div class="campus-player-placeholder">
                      <i class="fas fa-play-circle"></i>
                      <p>Sélectionnez une leçon pour commencer</p>
                     </div>`
              }
            </div>
            <div class="campus-player-lesson-title" id="campus-current-lesson-title">
              ${firstLesson ? _t(firstLesson.title) : _t('Aucune leçon sélectionnée')}
            </div>

            <!-- DESCRIPTION COURS -->
            <div class="campus-course-info">
              <div class="campus-course-info-header">
                <div>
                  <span class="campus-course-cat-badge" style="background:${course.category_color || '#791E15'}22;color:${course.category_color || '#791E15'}">
                    ${course.category_name || ''}
                  </span>
                  <h1 class="campus-course-title">${_t(course.title)}</h1>
                  ${course.subtitle ? `<p class="campus-course-subtitle">${_t(course.subtitle)}</p>` : ''}
                </div>
                <div class="campus-course-stats">
                  <div class="campus-course-stat">
                    <i class="fas fa-user-tie"></i>
                    <span>${course.instructor || 'Équipe LEADER'}</span>
                  </div>
                  <div class="campus-course-stat">
                    <i class="fas fa-play-circle"></i>
                    <span>${totalLessons} leçons</span>
                  </div>
                  ${progress > 0 ? `
                  <div class="campus-course-stat campus-course-stat-progress">
                    <div class="campus-progress-ring">
                      <svg viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#ffffff20" stroke-width="3"/>
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#e05c4a" stroke-width="3"
                          stroke-dasharray="${progress * 0.942} 94.2" stroke-linecap="round"
                          transform="rotate(-90 18 18)"/>
                      </svg>
                      <span>${progress}%</span>
                    </div>
                    <span>Progression</span>
                  </div>
                  ` : ''}
                </div>
              </div>
              ${course.description ? `
              <div class="campus-course-desc">
                <p>${course.description}</p>
              </div>
              ` : ''}
            </div>
          </div>

          <!-- SIDEBAR — CURRICULUM -->
          <aside class="campus-course-sidebar">
            <div class="campus-sidebar-header">
              <h3><i class="fas fa-list"></i> Contenu du cours</h3>
              ${totalLessons > 0 ? `
              <div class="campus-sidebar-progress">
                <div class="campus-sidebar-progress-bar" style="width:${progress}%"></div>
              </div>
              <span class="campus-sidebar-progress-txt">${completedLessons}/${totalLessons} terminées</span>
              ` : ''}
            </div>
            <div class="campus-curriculum" id="campus-curriculum">
              ${modules.map((mod, modIdx) => `
                <div class="campus-module" data-mod-idx="${modIdx}">
                  <button class="campus-module-header" onclick="campusToggleModule(this)">
                    <i class="fas fa-chevron-${modIdx === 0 ? 'down' : 'right'} campus-module-chevron"></i>
                    <span class="campus-module-title">${_t(mod.title)}</span>
                    <span class="campus-module-count">${mod.lessons.length}</span>
                  </button>
                  <div class="campus-module-lessons ${modIdx === 0 ? 'open' : ''}">
                    ${mod.lessons.map((lesson, lessonIdx) => {
                      // Leçon verrouillée = cours sans accès ET leçon sans video_url (masquée côté backend)
                      const lessonLocked = !courseHasAccess && !lesson.video_url;
                      return `
                      <div class="campus-lesson ${lesson.completed ? 'completed' : ''} ${firstLesson && lesson.id === firstLesson.id ? 'active' : ''} ${lessonLocked ? 'locked' : ''}"
                           id="lesson-item-${lesson.id}"
                           data-lesson-id="${lesson.id}"
                           data-video-url="${encodeURIComponent(lesson.video_url || '')}"
                           data-video-type="${lesson.video_type || 'youtube'}"
                           data-lesson-title="${(lesson.title || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}"
                           data-locked="${lessonLocked ? '1' : '0'}"
                           onclick="campusSelectLessonFromEl(this)"
                      >
                        <div class="campus-lesson-icon">
                          ${lessonLocked
                            ? '<i class="fas fa-lock" style="color:#f59e0b"></i>'
                            : lesson.completed
                              ? '<i class="fas fa-check-circle" style="color:#22c55e"></i>'
                              : lesson.video_url
                                ? '<i class="fas fa-play-circle"></i>'
                                : '<i class="fas fa-file-alt"></i>'
                          }
                        </div>
                        <div class="campus-lesson-info">
                          <span class="campus-lesson-title">${_t(lesson.title)}</span>
                          ${lesson.duration_label ? `<span class="campus-lesson-duration">${lesson.duration_label}</span>` : ''}
                        </div>
                      </div>
                    `}).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </aside>
        </div>
      </div>
    `;
  } catch (err) {
    mainContent.innerHTML = `
      <div class="campus-error">
        <i class="fas fa-exclamation-circle"></i>
        <p>${err.message || 'Erreur de chargement'}</p>
        <button onclick="showCampusPage()">Retour au catalogue</button>
      </div>
    `;
  }
}

function renderVideoPlayer(url, type, title) {
  if (!url) return `<div class="campus-player-placeholder"><i class="fas fa-play-circle"></i><p>Vidéo à venir</p></div>`;

  let embedUrl = url;
  type = type || detectVideoType(url);

  if (type === 'wistia') {
    // Wistia embed — extraire le media ID
    const wistiaId = extractWistiaId(url);
    if (wistiaId) {
      return `
        <div class="campus-player">
          <iframe src="https://fast.wistia.net/embed/iframe/${wistiaId}?videoFoam=true&autoPlay=false"
            title="${title || 'Leçon'}"
            frameborder="0"
            allow="autoplay; fullscreen"
            allowfullscreen
            class="wistia_embed">
          </iframe>
        </div>
      `;
    }
  } else if (type === 'youtube') {
    const ytId = extractYoutubeId(url);
    if (ytId) embedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0&modestbranding=1`;
  } else if (type === 'vimeo') {
    const vimeoId = extractVimeoId(url);
    if (vimeoId) embedUrl = `https://player.vimeo.com/video/${vimeoId}?color=e05c4a&title=0&byline=0`;
  } else if (type === 'drive') {
    const driveId = extractDriveId(url);
    if (driveId) embedUrl = `https://drive.google.com/file/d/${driveId}/preview`;
  }

  return `
    <div class="campus-player">
      <iframe src="${embedUrl}"
        title="${title || 'Leçon'}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowfullscreen>
      </iframe>
    </div>
  `;
}

function detectVideoType(url) {
  if (!url) return 'url';
  if (url.includes('wistia.com') || url.includes('wistia.net')) return 'wistia';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('drive.google.com')) return 'drive';
  return 'url';
}

function extractWistiaId(url) {
  // https://fast.wistia.com/embed/medias/abc123xyz → abc123xyz
  const m = url.match(/(?:embed\/medias?|embed\/iframe)\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

function extractYoutubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function extractVimeoId(url) {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

function extractDriveId(url) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// Wrapper pour les onclick inline utilisant data-* attributes (évite les conflits de quotes)
function campusSelectLessonFromEl(el) {
  const lessonId  = el.dataset.lessonId;
  const videoUrl  = decodeURIComponent(el.dataset.videoUrl || '');
  const videoType = el.dataset.videoType || 'youtube';
  const title     = el.dataset.lessonTitle || '';
  const locked    = el.dataset.locked === '1';
  campusSelectLesson(lessonId, videoUrl, videoType, el, title, locked);
}

function campusSelectLesson(lessonId, videoUrl, videoType, el, lessonTitle, locked) {
  // Si leçon verrouillée → afficher message accès requis, ne pas lancer la vidéo
  if (locked) {
    const playerWrap = document.getElementById('campus-player-wrap');
    if (playerWrap) {
      playerWrap.innerHTML = `
        <div class="campus-player-locked">
          <i class="fas fa-lock"></i>
          <p>Cette leçon est verrouillée</p>
          <small>Obtenez l'accès à cette formation pour la regarder</small>
        </div>`;
    }
    const titleEl = document.getElementById('campus-current-lesson-title');
    if (titleEl) titleEl.textContent = lessonTitle;
    return;
  }

  // Highlight actif
  document.querySelectorAll('.campus-lesson').forEach(l => l.classList.remove('active'));
  el.classList.add('active');

  // Update player
  const playerWrap = document.getElementById('campus-player-wrap');
  const titleEl = document.getElementById('campus-current-lesson-title');

  if (playerWrap) {
    if (videoUrl) {
      playerWrap.innerHTML = renderVideoPlayer(videoUrl, videoType, lessonTitle);
    } else {
      playerWrap.innerHTML = `<div class="campus-player-placeholder"><i class="fas fa-file-alt"></i><p>Contenu texte — Vidéo à venir</p></div>`;
    }
  }
  if (titleEl) titleEl.textContent = lessonTitle;

  // Marquer comme en cours (auto-track)
  saveLessonProgress(lessonId, false, 0);
}

function campusToggleModule(btn) {
  const lessons = btn.nextElementSibling;
  const chevron = btn.querySelector('.campus-module-chevron');
  const isOpen = lessons.classList.contains('open');
  lessons.classList.toggle('open', !isOpen);
  chevron.className = `fas fa-chevron-${!isOpen ? 'down' : 'right'} campus-module-chevron`;
}

async function campusMarkComplete(lessonId) {
  await saveLessonProgress(lessonId, true, 0);
  const el = document.getElementById(`lesson-item-${lessonId}`);
  if (el) {
    el.classList.add('completed');
    const icon = el.querySelector('.campus-lesson-icon i');
    if (icon) icon.className = 'fas fa-check-circle';
    icon.style.color = '#22c55e';
  }
}

async function saveLessonProgress(lessonId, completed, progressSeconds) {
  try {
    await campusFetch(`/api/campus/lesson/${lessonId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed, progress_seconds: progressSeconds })
    });
  } catch (e) {}
}

// ============================================================
// SECTION ADMIN — Gestion Campus
// ============================================================
async function showAdminCampus(container) {
  const mainContent = container || document.getElementById('admin-page-content') || document.getElementById('main-content');
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="campus-admin-wrap">
      <!-- HEADER -->
      <div class="campus-admin-header">
        <div class="campus-admin-header-left">
          <h1><i class="fas fa-graduation-cap"></i> Gestion du Campus</h1>
          <p>100% configurable — Catégories, Formations, Modules, Leçons</p>
        </div>
        <div class="campus-admin-header-actions">
          <button class="btn-campus-admin-primary" onclick="adminCampusNewCategory()">
            <i class="fas fa-plus"></i> Nouvelle catégorie
          </button>
          <button class="btn-campus-admin-primary" onclick="adminCampusNewCourse()">
            <i class="fas fa-plus"></i> Nouvelle formation
          </button>
        </div>
      </div>

      <!-- STATS -->
      <div class="campus-admin-stats" id="campus-admin-stats">
        <div class="campus-stat-loading">Chargement...</div>
      </div>

      <!-- TABS -->
      <div class="campus-admin-tabs">
        <button class="campus-admin-tab active" onclick="adminCampusTab('categories', this)">
          <i class="fas fa-tags"></i> Catégories
        </button>
        <button class="campus-admin-tab" onclick="adminCampusTab('courses', this)">
          <i class="fas fa-book"></i> Formations
        </button>
      </div>

      <!-- CONTENT -->
      <div id="campus-admin-content">
        <div class="campus-stat-loading">Chargement...</div>
      </div>
    </div>
  `;

  await loadAdminCampusStats();
  await adminCampusTab('categories', document.querySelector('.campus-admin-tab.active'));
}

async function loadAdminCampusStats() {
  try {
    const res = await campusFetch('/api/campus/admin/stats');
    const stats = await res.json();
    document.getElementById('campus-admin-stats').innerHTML = `
      <div class="campus-stat-card">
        <i class="fas fa-tags"></i>
        <span class="campus-stat-val">${stats.total_categories || 0}</span>
        <span class="campus-stat-lbl">Catégories</span>
      </div>
      <div class="campus-stat-card">
        <i class="fas fa-book"></i>
        <span class="campus-stat-val">${stats.total_courses || 0}</span>
        <span class="campus-stat-lbl">Formations</span>
      </div>
      <div class="campus-stat-card">
        <i class="fas fa-layer-group"></i>
        <span class="campus-stat-val">${stats.total_modules || 0}</span>
        <span class="campus-stat-lbl">Modules</span>
      </div>
      <div class="campus-stat-card">
        <i class="fas fa-play-circle"></i>
        <span class="campus-stat-val">${stats.total_lessons || 0}</span>
        <span class="campus-stat-lbl">Leçons</span>
      </div>
      <div class="campus-stat-card">
        <i class="fas fa-users"></i>
        <span class="campus-stat-val">${stats.total_learners || 0}</span>
        <span class="campus-stat-lbl">Apprenants</span>
      </div>
      <div class="campus-stat-card">
        <i class="fas fa-check-circle"></i>
        <span class="campus-stat-val">${stats.total_completions || 0}</span>
        <span class="campus-stat-lbl">Leçons terminées</span>
      </div>
    `;
  } catch (e) {}
}

async function adminCampusTab(tab, btn) {
  document.querySelectorAll('.campus-admin-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const content = document.getElementById('campus-admin-content');
  content.innerHTML = `<div class="campus-stat-loading"><i class="fas fa-spinner fa-spin"></i> Chargement...</div>`;

  if (tab === 'categories') {
    await adminCampusLoadCategories();
  } else if (tab === 'courses') {
    await adminCampusLoadCourses();
  }
}

async function adminCampusLoadCategories() {
  const res = await campusFetch('/api/campus/admin/categories');
  const cats = await res.json();
  const content = document.getElementById('campus-admin-content');

  content.innerHTML = `
    <div class="campus-admin-table-wrap">
      <table class="campus-admin-table">
        <thead>
          <tr>
            <th>Ordre</th>
            <th>Catégorie</th>
            <th>Couleur</th>
            <th>Icône</th>
            <th>Cours</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${cats.map(cat => `
            <tr>
              <td><span class="campus-order-badge">${cat.display_order}</span></td>
              <td>
                <div class="campus-cat-cell">
                  <span class="campus-cat-dot" style="background:${cat.color}"></span>
                  <div>
                    <strong>${cat.name}</strong>
                    <small>${cat.slug}</small>
                  </div>
                </div>
              </td>
              <td><span class="campus-color-pill" style="background:${cat.color}">${cat.color}</span></td>
              <td><i class="fas ${cat.icon}"></i> <small>${cat.icon}</small></td>
              <td><span class="campus-badge-count">${cat.course_count || 0}</span></td>
              <td>${cat.is_active ? '<span class="campus-badge-active">Actif</span>' : '<span class="campus-badge-inactive">Inactif</span>'}</td>
              <td>
                <div class="campus-actions">
                  <button class="campus-btn-edit" onclick="adminCampusEditCategory('${cat.id}')">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="campus-btn-delete" onclick="adminCampusDeleteCategory('${cat.id}', decodeURIComponent('${encodeURIComponent(cat.name)}'))">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function adminCampusLoadCourses(categoryId) {
  const url = categoryId ? `/api/campus/admin/courses?category_id=${categoryId}` : '/api/campus/admin/courses';
  const [coursesRes, catsRes] = await Promise.all([
    campusFetch(url),
    campusFetch('/api/campus/admin/categories')
  ]);
  const courses = await coursesRes.json();
  const cats = await catsRes.json();
  const content = document.getElementById('campus-admin-content');

  const catOptions = cats.map(c => `<option value="${c.id}" ${categoryId === c.id ? 'selected' : ''}>${c.name}</option>`).join('');

  content.innerHTML = `
    <div class="campus-courses-filter">
      <select onchange="adminCampusLoadCourses(this.value)" class="campus-select">
        <option value="">— Toutes les catégories —</option>
        ${catOptions}
      </select>
    </div>
    <div class="campus-courses-grid" id="campus-courses-grid">
      ${courses.map(course => `
        <div class="campus-admin-course-card">
          <div class="campus-admin-course-thumb">
            ${course.thumbnail_url
              ? `<img src="${course.thumbnail_url}" alt="${course.title}">`
              : `<div class="campus-admin-course-thumb-placeholder" style="background:${course.category_color || '#791e15'}22">
                  <i class="fas fa-book" style="color:${course.category_color || '#791e15'}"></i>
                 </div>`
            }
            <span class="campus-admin-course-cat" style="background:${course.category_color || '#791e15'}">
              ${course.category_name || 'Sans catégorie'}
            </span>
          </div>
          <div class="campus-admin-course-info">
            <h4>${course.title}</h4>
            <p>${course.instructor || 'Équipe LEADER'}</p>
            <div class="campus-admin-course-meta">
              <span><i class="fas fa-layer-group"></i> ${course.module_count || 0} modules</span>
              <span><i class="fas fa-play-circle"></i> ${course.lesson_count_real || course.total_lessons || 0} leçons</span>
              <span class="${course.is_active ? 'campus-badge-active' : 'campus-badge-inactive'}">
                ${course.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
          <div class="campus-admin-course-actions">
            <button class="campus-btn-manage" onclick="adminCampusManageCourse('${course.id}')">
              <i class="fas fa-cogs"></i> Gérer
            </button>
            <button class="campus-btn-edit" onclick="adminCampusEditCourse('${course.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="campus-btn-delete" onclick="adminCampusDeleteCourse('${course.id}', decodeURIComponent('${encodeURIComponent(course.title)}'))">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================================
// ADMIN — Gestion d'un cours (modules + leçons)
// ============================================================
async function adminCampusManageCourse(courseId) {
  const res = await campusFetch(`/api/campus/admin/course-full/${courseId}`);
  const data = await res.json();
  const { course, modules } = data;

  const content = document.getElementById('campus-admin-content');
  content.innerHTML = `
    <div class="campus-manage-header">
      <button class="campus-back-btn" onclick="adminCampusTab('courses', null)">
        <i class="fas fa-arrow-left"></i> Retour aux formations
      </button>
      <div>
        <h2>${course.title}</h2>
        <small>${course.instructor || ''}</small>
      </div>
      <button class="btn-campus-admin-primary" onclick="adminCampusNewModule('${course.id}')">
        <i class="fas fa-plus"></i> Ajouter un module
      </button>
    </div>

    <div id="campus-modules-list">
      ${modules.map((mod, i) => renderAdminModule(mod, course.id, i)).join('')}
      ${modules.length === 0 ? '<div class="campus-empty-modules"><i class="fas fa-layer-group"></i><p>Aucun module — Créez votre premier module</p></div>' : ''}
    </div>
  `;
}

function renderAdminModule(mod, courseId, idx) {
  return `
    <div class="campus-admin-module" id="admin-mod-${mod.id}">
      <div class="campus-admin-module-header">
        <button class="campus-module-toggle" onclick="campusToggleAdminModule(this)">
          <i class="fas fa-chevron-${idx === 0 ? 'down' : 'right'}"></i>
        </button>
        <span class="campus-admin-module-num">${idx + 1}</span>
        <span class="campus-admin-module-title">${mod.title}</span>
        <span class="campus-badge-count">${mod.lessons?.length || 0} leçon${mod.lessons?.length > 1 ? 's' : ''}</span>
        <div class="campus-actions">
          <button class="campus-btn-edit" onclick="adminCampusEditModule('${mod.id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-campus-admin-primary" onclick="adminCampusNewLesson('${mod.id}', '${courseId}')">
            <i class="fas fa-plus"></i> Leçon
          </button>
          <button class="campus-btn-delete" onclick="adminCampusDeleteModule('${mod.id}', '${courseId}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="campus-admin-module-lessons ${idx === 0 ? 'open' : ''}">
        <table class="campus-lessons-table">
          <thead>
            <tr><th>#</th><th>Titre</th><th>Vidéo</th><th>Type</th><th>Durée</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${(mod.lessons || []).map((lesson, j) => `
              <tr>
                <td>${j + 1}</td>
                <td>${lesson.title}</td>
                <td>
                  ${lesson.video_url
                    ? `<span class="campus-video-set"><i class="fas fa-check" style="color:#22c55e"></i> Défini</span>`
                    : `<span class="campus-video-empty"><i class="fas fa-times" style="color:#ef4444"></i> Vide</span>`
                  }
                </td>
                <td>${lesson.video_type || '—'}</td>
                <td>${lesson.duration_label || '—'}</td>
                <td>
                  <div class="campus-actions">
                    <button class="campus-btn-edit" onclick="adminCampusEditLesson('${lesson.id}')">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="campus-btn-delete" onclick="adminCampusDeleteLesson('${lesson.id}', '${mod.id}', '${courseId}')">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
            ${(mod.lessons || []).length === 0 ? '<tr><td colspan="6" class="campus-empty-row">Aucune leçon</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function campusToggleAdminModule(btn) {
  const lessons = btn.closest('.campus-admin-module-header').nextElementSibling;
  const icon = btn.querySelector('i');
  const isOpen = lessons.classList.contains('open');
  lessons.classList.toggle('open', !isOpen);
  icon.className = `fas fa-chevron-${!isOpen ? 'down' : 'right'}`;
}

// ============================================================
// ADMIN — Modals CRUD
// ============================================================
function adminCampusNewCategory() {
  showCampusModal('Nouvelle catégorie', `
    <form id="campus-cat-form" class="campus-form">
      <div class="campus-form-row">
        <label>Nom *</label>
        <input type="text" name="name" placeholder="ex: Leadership" required>
      </div>
      <div class="campus-form-row">
        <label>Slug *</label>
        <input type="text" name="slug" placeholder="ex: leadership" required>
      </div>
      <div class="campus-form-row">
        <label>Description</label>
        <textarea name="description" placeholder="Description de la catégorie" rows="3"></textarea>
      </div>
      <div class="campus-form-row-2">
        <div class="campus-form-row">
          <label>Couleur</label>
          <input type="color" name="color" value="#791E15">
        </div>
        <div class="campus-form-row">
          <label>Icône FontAwesome</label>
          <input type="text" name="icon" placeholder="fa-graduation-cap" value="fa-graduation-cap">
        </div>
      </div>
      <div class="campus-form-row">
        <label>Ordre d'affichage</label>
        <input type="number" name="display_order" value="0" min="0">
      </div>
    </form>
  `, async () => {
    const form = document.getElementById('campus-cat-form');
    const data = Object.fromEntries(new FormData(form));
    const res = await campusFetch('/api/campus/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      closeCampusModal();
      await adminCampusTab('categories', document.querySelector('.campus-admin-tab.active'));
      await loadAdminCampusStats();
      _campusToast('Catégorie créée !', 'success');
    } else {
      _campusToast(result.error || 'Erreur', 'error');
    }
  });
}

function adminCampusNewCourse() {
  campusFetch('/api/campus/admin/categories').then(r => r.json()).then(cats => {
    showCampusModal('Nouvelle formation', `
      <form id="campus-course-form" class="campus-form">
        <div class="campus-form-row">
          <label>Catégorie</label>
          <select name="category_id" class="campus-select">
            <option value="">— Sans catégorie —</option>
            ${cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="campus-form-row">
          <label>Titre *</label>
          <input type="text" name="title" placeholder="Titre de la formation" required>
        </div>
        <div class="campus-form-row">
          <label>Slug *</label>
          <input type="text" name="slug" placeholder="url-de-la-formation" required>
        </div>
        <div class="campus-form-row">
          <label>Sous-titre</label>
          <input type="text" name="subtitle" placeholder="Accroche courte">
        </div>
        <div class="campus-form-row">
          <label>Description</label>
          <textarea name="description" placeholder="Description complète" rows="4"></textarea>
        </div>
        <div class="campus-form-row-2">
          <div class="campus-form-row">
            <label>Formateur</label>
            <input type="text" name="instructor" placeholder="Nom du formateur">
          </div>
          <div class="campus-form-row">
            <label>Langue</label>
            <select name="language" class="campus-select">
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
            </select>
          </div>
        </div>
        <div class="campus-form-row-2">
          <div class="campus-form-row">
            <label>Niveau</label>
            <select name="level" class="campus-select">
              <option value="all">Tous niveaux</option>
              <option value="beginner">Débutant</option>
              <option value="intermediate">Intermédiaire</option>
              <option value="advanced">Avancé</option>
            </select>
          </div>
          <div class="campus-form-row">
            <label>Ordre d'affichage</label>
            <input type="number" name="display_order" value="0" min="0">
          </div>
        </div>
        <div class="campus-form-row">
          <label>URL miniature</label>
          <input type="text" name="thumbnail_url" placeholder="https://...">
        </div>
        <div class="campus-form-row-2">
          <div class="campus-form-row">
            <label>URL vidéo trailer</label>
            <input type="text" name="trailer_url" placeholder="YouTube / Vimeo / Drive">
          </div>
          <div class="campus-form-row">
            <label>Type vidéo</label>
            <select name="trailer_type" class="campus-select">
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="drive">Google Drive</option>
              <option value="url">URL directe</option>
            </select>
          </div>
        </div>
        <div class="campus-form-row">
          <label class="campus-checkbox-label">
            <input type="checkbox" name="is_featured" value="1"> Mise en avant
          </label>
        </div>
      </form>
    `, async () => {
      const form = document.getElementById('campus-course-form');
      const data = Object.fromEntries(new FormData(form));
      data.is_free = 1;
      data.is_featured = data.is_featured ? 1 : 0;
      const res = await campusFetch('/api/campus/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        closeCampusModal();
        await adminCampusTab('courses', null);
        await loadAdminCampusStats();
        _campusToast('Formation créée !', 'success');
      } else {
        _campusToast(result.error || 'Erreur', 'error');
      }
    });
  });
}

function adminCampusNewModule(courseId) {
  showCampusModal('Nouveau module', `
    <form id="campus-mod-form" class="campus-form">
      <div class="campus-form-row">
        <label>Titre du module *</label>
        <input type="text" name="title" placeholder="ex: Introduction au Leadership" required>
      </div>
      <div class="campus-form-row">
        <label>Description</label>
        <textarea name="description" placeholder="Description du module" rows="3"></textarea>
      </div>
      <div class="campus-form-row">
        <label>Ordre d'affichage</label>
        <input type="number" name="display_order" value="0" min="0">
      </div>
    </form>
  `, async () => {
    const form = document.getElementById('campus-mod-form');
    const data = { ...Object.fromEntries(new FormData(form)), course_id: courseId };
    const res = await campusFetch('/api/campus/admin/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      closeCampusModal();
      adminCampusManageCourse(courseId);
      _campusToast('Module créé !', 'success');
    } else {
      _campusToast(result.error || 'Erreur', 'error');
    }
  });
}

function adminCampusNewLesson(moduleId, courseId) {
  showCampusModal('Nouvelle leçon', `
    <form id="campus-lesson-form" class="campus-form">
      <div class="campus-form-row">
        <label>Titre *</label>
        <input type="text" name="title" placeholder="Titre de la leçon" required>
      </div>
      <div class="campus-form-row">
        <label>Description</label>
        <textarea name="description" placeholder="Description" rows="3"></textarea>
      </div>
      <div class="campus-form-row-2">
        <div class="campus-form-row">
          <label>URL vidéo (YouTube / Vimeo / Drive)</label>
          <input type="text" name="video_url" placeholder="https://...">
        </div>
        <div class="campus-form-row">
          <label>Type vidéo</label>
          <select name="video_type" class="campus-select">
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
            <option value="drive">Google Drive</option>
            <option value="url">URL directe</option>
          </select>
        </div>
      </div>
      <div class="campus-form-row-2">
        <div class="campus-form-row">
          <label>Durée (label, ex: 01:48:39)</label>
          <input type="text" name="duration_label" placeholder="hh:mm:ss">
        </div>
        <div class="campus-form-row">
          <label>Ordre d'affichage</label>
          <input type="number" name="display_order" value="0" min="0">
        </div>
      </div>
    </form>
  `, async () => {
    const form = document.getElementById('campus-lesson-form');
    const data = {
      ...Object.fromEntries(new FormData(form)),
      module_id: moduleId,
      course_id: courseId
    };
    if (data.video_url && !data.video_type) {
      data.video_type = detectVideoType(data.video_url);
    }
    const res = await campusFetch('/api/campus/admin/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      closeCampusModal();
      adminCampusManageCourse(courseId);
      _campusToast('Leçon créée !', 'success');
    } else {
      _campusToast(result.error || 'Erreur', 'error');
    }
  });
}

async function adminCampusEditLesson(lessonId) {
  const res = await campusFetch(`/api/campus/admin/lessons/single/${lessonId}`).catch(() => null);
  // Fallback: utiliser un formulaire vide
  showCampusModal('Modifier la leçon', `
    <form id="campus-lesson-edit-form" class="campus-form">
      <div class="campus-form-row">
        <label>Titre *</label>
        <input type="text" name="title" placeholder="Titre de la leçon" required>
      </div>
      <div class="campus-form-row-2">
        <div class="campus-form-row">
          <label>URL vidéo (YouTube / Vimeo / Drive)</label>
          <input type="text" name="video_url" placeholder="https://youtu.be/... ou https://vimeo.com/...">
        </div>
        <div class="campus-form-row">
          <label>Type vidéo</label>
          <select name="video_type" class="campus-select">
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
            <option value="drive">Google Drive</option>
            <option value="url">URL directe</option>
          </select>
        </div>
      </div>
      <div class="campus-form-row-2">
        <div class="campus-form-row">
          <label>Durée (ex: 01:48:39)</label>
          <input type="text" name="duration_label" placeholder="hh:mm:ss">
        </div>
        <div class="campus-form-row">
          <label>Ordre</label>
          <input type="number" name="display_order" value="0" min="0">
        </div>
      </div>
      <div class="campus-form-row">
        <label>Description</label>
        <textarea name="description" rows="3" placeholder="Description"></textarea>
      </div>
    </form>
  `, async () => {
    const form = document.getElementById('campus-lesson-edit-form');
    const data = Object.fromEntries(new FormData(form));
    if (data.video_url && !data.video_type) data.video_type = detectVideoType(data.video_url);
    const r = await campusFetch(`/api/campus/admin/lessons/${lessonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await r.json();
    if (result.success) {
      closeCampusModal();
      _campusToast('Leçon mise à jour !', 'success');
    } else {
      _campusToast(result.error || 'Erreur', 'error');
    }
  });
}

async function adminCampusDeleteLesson(lessonId, moduleId, courseId) {
  if (!confirm('Supprimer cette leçon ?')) return;
  const res = await campusFetch(`/api/campus/admin/lessons/${lessonId}`, { method: 'DELETE' });
  const result = await res.json();
  if (result.success) {
    _campusToast('Leçon supprimée', 'success');
    adminCampusManageCourse(courseId);
  } else {
    _campusToast('Erreur', 'error');
  }
}

async function adminCampusDeleteModule(moduleId, courseId) {
  if (!confirm('Supprimer ce module et toutes ses leçons ?')) return;
  const res = await campusFetch(`/api/campus/admin/modules/${moduleId}`, { method: 'DELETE' });
  const result = await res.json();
  if (result.success) {
    _campusToast('Module supprimé', 'success');
    adminCampusManageCourse(courseId);
  } else {
    _campusToast('Erreur', 'error');
  }
}

async function adminCampusDeleteCourse(courseId, title) {
  if (!confirm(`Supprimer la formation "${title}" ?`)) return;
  const res = await campusFetch(`/api/campus/admin/courses/${courseId}`, { method: 'DELETE' });
  const result = await res.json();
  if (result.success) {
    _campusToast('Formation supprimée', 'success');
    await adminCampusTab('courses', null);
  } else {
    _campusToast('Erreur', 'error');
  }
}

async function adminCampusDeleteCategory(catId, name) {
  if (!confirm(`Désactiver la catégorie "${name}" ?`)) return;
  const res = await campusFetch(`/api/campus/admin/categories/${catId}`, { method: 'DELETE' });
  const result = await res.json();
  if (result.success) {
    _campusToast('Catégorie désactivée', 'success');
    await adminCampusLoadCategories();
  } else {
    _campusToast('Erreur', 'error');
  }
}

async function adminCampusEditCategory(catId) {
  // Édition simplifiée via prompt pour l'instant
  _campusToast('Double-clic sur la ligne pour éditer', 'info');
}

async function adminCampusEditCourse(courseId) {
  _campusToast('Utilisez "Gérer" pour modifier les détails du cours', 'info');
}

async function adminCampusEditModule(moduleId) {
  _campusToast('Édition du module en cours de développement', 'info');
}

// ============================================================
// Modal helper Campus
// ============================================================
let campusModalCallback = null;

function showCampusModal(title, bodyHtml, onConfirm) {
  campusModalCallback = onConfirm;

  let modal = document.getElementById('campus-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'campus-modal';
    modal.className = 'campus-modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="campus-modal">
      <div class="campus-modal-header">
        <h3>${title}</h3>
        <button class="campus-modal-close" onclick="closeCampusModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="campus-modal-body">${bodyHtml}</div>
      <div class="campus-modal-footer">
        <button class="campus-btn-cancel" onclick="closeCampusModal()">Annuler</button>
        <button class="campus-btn-confirm" onclick="campusModalConfirm()">
          <i class="fas fa-check"></i> Confirmer
        </button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';

  // Auto-slug from title
  const nameInput = modal.querySelector('input[name="name"], input[name="title"]');
  const slugInput = modal.querySelector('input[name="slug"]');
  if (nameInput && slugInput) {
    nameInput.addEventListener('input', () => {
      slugInput.value = nameInput.value
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    });
  }
}

function closeCampusModal() {
  const modal = document.getElementById('campus-modal');
  if (modal) modal.style.display = 'none';
  campusModalCallback = null;
}

async function campusModalConfirm() {
  if (campusModalCallback) {
    const btn = document.querySelector('.campus-btn-confirm');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    try {
      await campusModalCallback();
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Confirmer'; }
    }
  }
}

// Helper toast (si pas déjà défini globalement)
// showToast — utilise la fonction globale si disponible, sinon fallback
function _campusToast(message, type) {
  if (typeof showToast === 'function') {
    _campusToast(message, type);
    return;
  }
  if (typeof window.showNotification === 'function') {
    window.showNotification(message, type);
    return;
  }
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:99999;
    padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;
    color:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.3);
    background:${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============================================================
// Navigation vers la page packages depuis le campus
// Utilise showPage() (contexte membre app) si disponible
// ============================================================
function campusGoToPackages() {
  if (typeof showPage === 'function') {
    showPage('packages');
  } else {
    // Fallback : navigation par hash si hors contexte app
    window.location.hash = 'packages';
  }
}
