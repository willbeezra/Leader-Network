// ============================================================
// LEADER — Routes Landing Page
// GET  /                    → landing page publique (depuis DB)
// GET  /s/:slug             → redirection directe service
// GET  /api/landing/config  → config publique JSON
// GET  /api/landing/services → services publics JSON
// POST /api/admin/landing/config → update config (admin)
// POST /api/admin/landing/services → CRUD services (admin)
// POST /api/admin/landing/testimonials → CRUD témoignages (admin)
// POST /api/admin/landing/sections → update sections (admin)
// ============================================================
import { Hono } from 'hono'
import type { Bindings } from '../types/index.js'
import { verifyJWT } from '../lib/auth.js'

export const landingPublic = new Hono<{ Bindings: Bindings }>()
export const landingAdmin  = new Hono<{ Bindings: Bindings }>()

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
async function getLandingConfig(db: D1Database): Promise<Record<string, string>> {
  try {
    const rows = await db.prepare('SELECT key, value FROM landing_config').all()
    const cfg: Record<string, string> = {}
    for (const r of (rows.results || []) as any[]) cfg[r.key] = r.value
    return cfg
  } catch { return {} }
}

async function getServices(db: D1Database, includeInactive = false): Promise<any[]> {
  // Déduplique par id (rowid MIN) pour éviter l'affichage en double
  // si la table a été peuplée plusieurs fois (INSERT OR IGNORE réexécuté)
  const dedup = (rows: any[]): any[] => {
    const seen = new Set<number>()
    return rows.filter(r => {
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })
  }
  try {
    // Essai direct sur landing_services
    const q = includeInactive
      ? 'SELECT * FROM landing_services ORDER BY display_order ASC, id ASC'
      : "SELECT * FROM landing_services WHERE status != 'inactive' ORDER BY display_order ASC, id ASC"
    const rows = await db.prepare(q).all()
    if (rows.results && rows.results.length > 0) return dedup(rows.results as any[])
    // Fallback : si landing_services vide, essayer services
    const q2 = includeInactive
      ? 'SELECT * FROM services ORDER BY display_order ASC, id ASC'
      : "SELECT * FROM services WHERE status != 'inactive' ORDER BY display_order ASC, id ASC"
    const rows2 = await db.prepare(q2).all()
    return dedup((rows2.results || []) as any[])
  } catch {
    try {
      // Dernier fallback direct sur services
      const q2 = includeInactive
        ? 'SELECT * FROM services ORDER BY display_order ASC, id ASC'
        : "SELECT * FROM services WHERE status != 'inactive' ORDER BY display_order ASC, id ASC"
      const rows2 = await db.prepare(q2).all()
      return dedup((rows2.results || []) as any[])
    } catch { return [] }
  }
}

async function getTestimonials(db: D1Database, featuredOnly = false): Promise<any[]> {
  const dedup = (rows: any[]): any[] => {
    const seen = new Set<number>()
    return rows.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
  }
  try {
    const q = featuredOnly
      ? 'SELECT * FROM landing_testimonials WHERE is_active=1 AND is_featured=1 ORDER BY display_order ASC LIMIT 6'
      : 'SELECT * FROM landing_testimonials WHERE is_active=1 ORDER BY display_order ASC'
    const rows = await db.prepare(q).all()
    if (rows.results && rows.results.length > 0) return dedup(rows.results as any[])
    // Fallback sur testimonials
    const q2 = featuredOnly
      ? 'SELECT * FROM testimonials WHERE is_active=1 AND is_featured=1 ORDER BY display_order ASC LIMIT 6'
      : 'SELECT * FROM testimonials WHERE is_active=1 ORDER BY display_order ASC'
    const rows2 = await db.prepare(q2).all()
    return dedup((rows2.results || []) as any[])
  } catch {
    try {
      const q2 = featuredOnly
        ? 'SELECT * FROM testimonials WHERE is_active=1 AND is_featured=1 ORDER BY display_order ASC LIMIT 6'
        : 'SELECT * FROM testimonials WHERE is_active=1 ORDER BY display_order ASC'
      const rows2 = await db.prepare(q2).all()
      return dedup((rows2.results || []) as any[])
    } catch { return [] }
  }
}

async function getSections(db: D1Database): Promise<any[]> {
  try {
    const rows = await db.prepare('SELECT * FROM landing_sections ORDER BY display_order ASC').all()
    return (rows.results || []) as any[]
  } catch { return [] }
}

function isSectionActive(sections: any[], key: string): boolean {
  const s = sections.find((x: any) => x.section_key === key)
  return s ? s.is_active === 1 : true
}

// ─────────────────────────────────────────────────────────────
// LOGO RENDERER — adapte chaque logo à son contexte
// ─────────────────────────────────────────────────────────────
function renderServiceLogo(service: any): string {
  const src = service.logo_data_uri || service.logo_url

  // Fallback lettre si pas de logo
  if (!src) {
    return `<div style="width:72px;height:72px;border-radius:18px;background:linear-gradient(135deg,#791E15,#5A1510);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#fff;flex-shrink:0">${service.name.charAt(0).toUpperCase()}</div>`
  }

  // Technique transparent universelle :
  // - mix-blend-mode:screen → supprime les fonds blancs/clairs sur fond sombre
  // - Le conteneur a le bg_color du service en très faible opacité
  //   pour que le logo reste lisible si son fond est transparent
  const bgColor = service.bg_color || 'transparent'
  return `<div style="width:80px;height:80px;border-radius:16px;background:${bgColor};display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
    <img src="${src}" alt="${service.name}"
         style="max-width:90%;max-height:90%;object-fit:contain;mix-blend-mode:screen;filter:brightness(1.05) contrast(1.02)"
         loading="lazy">
  </div>`
}

// ─────────────────────────────────────────────────────────────
// STARS RENDERER
// ─────────────────────────────────────────────────────────────
function renderStars(rating: number): string {
  return Array.from({ length: 5 }, (_, i) =>
    `<span style="color:${i < rating ? '#791E15' : '#4B5563'}">★</span>`
  ).join('')
}

// ─────────────────────────────────────────────────────────────
// HTML LANDING PAGE
// ─────────────────────────────────────────────────────────────
function buildLandingHTML(cfg: Record<string, string>, services: any[], testimonials: any[], sections: any[]): string {
  const activeServices    = services.filter(s => s.status === 'active')
  const comingSoonServices = services.filter(s => s.status === 'coming_soon')
  const featuredTestimonials = testimonials.filter(t => t.is_featured)

  const heroActive         = isSectionActive(sections, 'hero')
  const statsActive        = isSectionActive(sections, 'stats')
  const aboutActive        = isSectionActive(sections, 'about')
  const servicesActive     = isSectionActive(sections, 'services')
  const testimonialsActive = isSectionActive(sections, 'testimonials')
  const ctaFinalActive     = isSectionActive(sections, 'cta_final')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cfg.meta_title || 'LEADER — Révéler. Prospérer. Inspirer.'}</title>
  <meta name="description" content="${cfg.meta_description || ''}">
  <meta property="og:title" content="${cfg.meta_title || 'LEADER'}">
  <meta property="og:description" content="${cfg.meta_description || ''}">
  <meta property="og:image" content="/static/og-leader.png">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%2302072C'/><path d='M10 10 L14 10 L14 21 L22 21 L22 24 L10 24 Z' fill='%23791E15'/><path d='M19 10 L22 10 L22 18 L19 18 Z' fill='%23791E15'/></svg>">

  <script src="/static/tailwind.min.js"></script>
  <script>
    tailwind.config = {
      theme: { extend: { colors: {
        'rouge':     { DEFAULT:'#791E15', light:'#A02820', dark:'#5A1510' },
        'bleu':      { nuit:'#02072C', medium:'#0A1240', clair:'#1A2560' },
        'anthracite':{ DEFAULT:'#1D1D1B' },
        'cream':     { DEFAULT:'#F5F0E8', muted:'#9A9080' },
      }, fontFamily: { display: ['Georgia', 'serif'] } }}
    }
  </script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
  <style>
    /* ═══════════════════════════════════════
       CHARTE GRAPHIQUE LEADER
       Bleu Nuit #02072C · Rouge Cardinal #791E15 · Blanc #FFFFFF
    ═══════════════════════════════════════ */
    :root {
      --rouge:      #791E15;
      --rouge-lt:   #A02820;
      --rouge-dk:   #5A1510;
      --bleu-nuit:  #02072C;
      --bleu-med:   #0A1240;
      --bleu-clair: #1A2560;
      --anthracite: #1D1D1B;
      --blanc:      #FFFFFF;
      --cream:      #F5F0E8;
      --border:     rgba(255,255,255,0.07);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: var(--bleu-nuit); color: var(--cream); font-family: 'Inter', system-ui, sans-serif; overflow-x: hidden; }

    /* Particules */
    #particles-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; opacity: 0.3; }

    /* Glassmorphism — teinte bleu nuit */
    .glass       { background: rgba(10,18,64,0.55);  backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.07); }
    .glass-rouge { background: rgba(121,30,21,0.15); backdrop-filter: blur(12px); border: 1px solid rgba(121,30,21,0.28); }
    .glass-dark  { background: rgba(1,3,18,0.65);    backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.05); }

    /* Texte */
    .text-gradient       { color: #FFFFFF; }
    .text-gradient-rouge { color: #791E15; }

    /* Animations */
    @keyframes fadeInUp    { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
    @keyframes float       { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
    @keyframes pulse-rouge { 0%,100% { box-shadow:0 0 0 0 rgba(121,30,21,0.55); } 50% { box-shadow:0 0 0 14px rgba(121,30,21,0); } }

    .fade-in-up  { animation: fadeInUp 0.8s ease forwards; }
    .float-anim  { animation: float 4s ease-in-out infinite; }
    .pulse-rouge { animation: pulse-rouge 2.2s ease-in-out infinite; }

    /* Service card */
    .service-card { transition: all 0.35s cubic-bezier(0.4,0,0.2,1); cursor: pointer; position: relative; overflow: hidden; }
    .service-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(121,30,21,0.18) 0%, transparent 60%); opacity: 0; transition: opacity 0.35s ease; }
    .service-card:hover { transform: translateY(-6px); border-color: rgba(121,30,21,0.55) !important; box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(121,30,21,0.2); }
    .service-card:hover::before { opacity: 1; }
    .service-card.coming-soon { cursor: default; opacity: 0.7; }
    .service-card.coming-soon:hover { transform: none; }

    /* Badge bientôt */
    .badge-soon { background: rgba(121,30,21,0.25); color: #F5F0E8; border: 1px solid rgba(121,30,21,0.4); font-size: 0.62rem; font-weight: 800; letter-spacing: 0.1em; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; }

    /* Testimonial */
    .testimonial-card { transition: transform 0.3s ease; }
    .testimonial-card:hover { transform: translateY(-4px); }

    /* Navbar */
    .navbar-scrolled { backdrop-filter: blur(20px); border-bottom: 1px solid rgba(121,30,21,0.2) !important; }

    /* Scroll progress */
    .scroll-progress { position: fixed; top: 0; left: 0; height: 2px; background: linear-gradient(90deg, #791E15, #A02820); z-index: 100; transition: width 0.1s linear; }

    /* Dividers */
    .section-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(121,30,21,0.4), transparent); margin: 0 auto; max-width: 600px; }

    /* Bouton principal rouge */
    .btn-rouge { display: inline-block; background: linear-gradient(135deg, #791E15 0%, #A02820 50%, #791E15 100%); background-size: 200% 200%; color: #FFFFFF !important; font-weight: 700; border-radius: 9999px; transition: all 0.3s ease; border: none; }
    .btn-rouge:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(121,30,21,0.5); background-position: right center; }

    /* Bouton secondaire blanc */
    .btn-outline { display: inline-block; border: 1.5px solid rgba(255,255,255,0.3); color: #FFFFFF !important; border-radius: 9999px; transition: all 0.3s ease; }
    .btn-outline:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.6); transform: translateY(-2px); }

    /* Stats */
    .stat-number { color: #FFFFFF; font-size: 2.25rem; font-weight: 900; line-height: 1; }
    .stat-label  { color: rgba(245,240,232,0.5); font-size: 0.8rem; margin-top: 4px; }
    .stat-icon   { color: #791E15; font-size: 1.5rem; margin-bottom: 8px; }
    .stat-glow   { text-shadow: 0 0 20px rgba(255,255,255,0.2); }

    /* Labels de section */
    .section-label { color: #791E15; font-size: 0.7rem; letter-spacing: 0.3em; text-transform: uppercase; font-weight: 700; }

    /* Accent ligne rouge */
    .accent-rouge { display: block; width: 40px; height: 3px; background: #791E15; border-radius: 2px; margin: 0 auto 16px; }

    /* Icônes about */
    .about-icon { width:52px; height:52px; border-radius:14px; background:rgba(121,30,21,0.15); border:1px solid rgba(121,30,21,0.3); display:flex; align-items:center; justify-content:center; font-size:1.25rem; color:#791E15; flex-shrink:0; }

    /* Logo fallback */
    .logo-hero { font-size: clamp(3rem, 8vw, 6rem); font-weight: 900; letter-spacing: 0.25em; color: #FFFFFF; line-height: 1; }

    /* Sections alternées */
    .section-alt { background: var(--bleu-med); }

    /* Reveal */
    .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.7s ease, transform 0.7s ease; }
    .reveal.visible { opacity: 1; transform: translateY(0); }

    /* Overrides garantis */
    .c-rouge { color: #791E15 !important; }
    .c-blanc { color: #FFFFFF !important; }
    .c-cream { color: #F5F0E8 !important; }
  </style>
</head>
<body>

<!-- Barre de progression scroll -->
<div class="scroll-progress" id="scroll-progress" style="width:0%"></div>

<!-- Canvas particules -->
<canvas id="particles-canvas"></canvas>

<!-- ════════════════════════════════════════
     NAVBAR
════════════════════════════════════════ -->
<nav id="navbar" class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-4 px-6" style="background:rgba(2,7,44,0.88);border-bottom:1px solid rgba(121,30,21,0.18)">
  <div class="max-w-7xl mx-auto flex items-center justify-between">
    <!-- Logo LEADER -->
    <a href="/" class="flex items-center gap-2 group" style="text-decoration:none">
      <img src="/static/logo-leader.png" alt="LEADER" class="h-10 object-contain"
           onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <span style="display:none;font-size:1.4rem;font-weight:900;letter-spacing:0.2em;color:#FFFFFF">LEADER</span>
    </a>

    <!-- Nav links desktop -->
    <div class="hidden md:flex items-center gap-8 text-sm font-medium" style="color:rgba(245,240,232,0.65)">
      <a href="#services"     data-i18n="Services" style="color:rgba(245,240,232,0.65);text-decoration:none" onmouseover="this.style.color='#FFFFFF'" onmouseout="this.style.color='rgba(245,240,232,0.65)'">Services</a>
      <a href="#testimonials" data-i18n="Témoignages" style="color:rgba(245,240,232,0.65);text-decoration:none" onmouseover="this.style.color='#FFFFFF'" onmouseout="this.style.color='rgba(245,240,232,0.65)'">Témoignages</a>
      <a href="#about"        data-i18n="À propos" style="color:rgba(245,240,232,0.65);text-decoration:none" onmouseover="this.style.color='#FFFFFF'" onmouseout="this.style.color='rgba(245,240,232,0.65)'">À propos</a>
    </div>

    <!-- CTA -->
    <a href="${cfg.hero_cta_url || '/login'}" data-i18n="${cfg.hero_cta_label || 'Mon espace'}" class="btn-rouge px-6 py-2.5 text-sm font-bold tracking-wide" style="text-decoration:none">
      ${cfg.hero_cta_label || 'Mon espace'}
    </a>
  </div>
</nav>

<!-- ════════════════════════════════════════
     HERO
════════════════════════════════════════ -->
${heroActive ? `
<section id="hero" class="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">

  <!-- Glows aux couleurs du logo : bleu nuit + rouge cardinal -->
  <div class="absolute inset-0 z-0" style="pointer-events:none">
    <div style="position:absolute;top:60%;left:8%;width:500px;height:500px;background:rgba(121,30,21,0.1);border-radius:50%;filter:blur(100px)"></div>
    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:1000px;height:700px;background:rgba(10,18,64,0.5);border-radius:50%;filter:blur(80px)"></div>
    <div style="position:absolute;top:25%;right:5%;width:350px;height:350px;background:rgba(121,30,21,0.07);border-radius:50%;filter:blur(80px)"></div>
  </div>

  <div class="relative z-10 max-w-5xl mx-auto px-6 text-center">

    <!-- Logo grand format -->
    <div class="mb-10 fade-in-up float-anim flex justify-center">
      <img src="/static/logo-leader.png" alt="LEADER"
           style="height:clamp(70px,10vw,140px);object-fit:contain"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <span class="logo-hero" style="display:none;align-items:center">LEADER</span>
    </div>

    <!-- Slogan -->
    <h1 class="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-tight mb-6 fade-in-up" style="animation-delay:0.15s">
      <span class="text-gradient" data-i18n-hero="${cfg.hero_title || 'Révéler. Prospérer. Inspirer.'}">${(cfg.hero_title || 'Révéler. Prospérer. Inspirer.').replace(/\./g, '.<br class="hidden md:block">')}</span>
    </h1>

    <!-- Sous-titre -->
    <p class="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed fade-in-up" style="animation-delay:0.3s;color:rgba(245,240,232,0.65)">
      <span data-i18n="${cfg.hero_subtitle || 'Un écosystème unique de services pensé pour révéler votre potentiel.'}">${cfg.hero_subtitle || 'Un écosystème unique de services pensé pour révéler votre potentiel.'}</span>
    </p>

    <!-- CTA buttons -->
    <div class="flex flex-col sm:flex-row gap-4 justify-center fade-in-up" style="animation-delay:0.45s">
      <a href="${cfg.hero_cta_url || '/login'}"
         class="btn-rouge px-10 py-4 text-base font-bold tracking-wide pulse-rouge" style="text-decoration:none">
        <i class="fas fa-arrow-right mr-2"></i><span data-i18n="${cfg.hero_cta_label || 'Accéder à mon espace'}">${cfg.hero_cta_label || 'Accéder à mon espace'}</span>
      </a>
      <a href="${cfg.hero_cta2_url || '#services'}"
         class="btn-outline px-10 py-4 text-base font-semibold" style="text-decoration:none">
        <i class="fas fa-th-large mr-2"></i><span data-i18n="${cfg.hero_cta2_label || 'Découvrir les services'}">${cfg.hero_cta2_label || 'Découvrir les services'}</span>
      </a>
    </div>

    <!-- Scroll indicator -->
    <div class="mt-16 fade-in-up flex justify-center" style="animation-delay:0.6s">
      <a href="#stats" style="color:rgba(245,240,232,0.3);text-decoration:none;display:flex;flex-direction:column;align-items:center;gap:8px" onmouseover="this.style.color='rgba(121,30,21,0.9)'" onmouseout="this.style.color='rgba(245,240,232,0.3)'">
        <span class="text-xs tracking-widest uppercase" data-i18n="Découvrir">Découvrir</span>
        <i class="fas fa-chevron-down animate-bounce text-sm"></i>
      </a>
    </div>
  </div>
</section>
` : ''}

<!-- ════════════════════════════════════════
     STATS
════════════════════════════════════════ -->
${statsActive ? `
<section id="stats" class="relative z-10 py-20 px-6 section-alt">
  <div class="max-w-5xl mx-auto">
    <div class="section-divider mb-16"></div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
      ${[
        { val: cfg.stats_members || '12 000+',  label: cfg.stats_members_label || 'Membres actifs',   icon: 'users' },
        { val: cfg.stats_countries || '47',      label: cfg.stats_countries_label || 'Pays',           icon: 'globe-europe' },
        { val: cfg.stats_services || '14',       label: cfg.stats_services_label || 'Services',        icon: 'th-large' },
        { val: cfg.stats_years || '5+',          label: cfg.stats_years_label || 'Années d\'excellence', icon: 'star' },
      ].map(s => `
      <div class="glass-dark rounded-2xl p-6 text-center reveal" style="border:1px solid rgba(121,30,21,0.18)">
        <i class="fas fa-${s.icon} stat-icon"></i>
        <div class="stat-number stat-glow">${s.val}</div>
        <div class="stat-label" data-i18n="${s.label}">${s.label}</div>
      </div>`).join('')}
    </div>
    <div class="section-divider mt-16"></div>
  </div>
</section>
` : ''}

<!-- ════════════════════════════════════════
     ABOUT
════════════════════════════════════════ -->
${aboutActive ? `
<section id="about" class="relative z-10 py-20 px-6">
  <div class="max-w-4xl mx-auto text-center reveal">
    <span class="accent-rouge"></span><span class="section-label mb-4 block" data-i18n="Notre vision">Notre vision</span>
    <h2 class="text-3xl md:text-5xl font-black mb-6 leading-tight" style="color:#FFFFFF">
      <span data-i18n="${cfg.about_title || 'Un écosystème pensé pour les ambitieux'}">${cfg.about_title || 'Un écosystème pensé pour les ambitieux'}</span>
    </h2>
    <p class="text-lg leading-relaxed max-w-2xl mx-auto" style="color:rgba(245,240,232,0.6)">
      <span data-i18n="${cfg.about_text || 'LEADER réunit sous un même toit les meilleurs outils pour former, financer, développer et élever chaque membre.'}">${cfg.about_text || 'LEADER réunit sous un même toit les meilleurs outils pour former, financer, développer et élever chaque membre.'}</span>
    </p>

    <!-- Valeurs LEADER -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
      ${[
        { icon: 'seedling',  title: 'Révéler',   text: 'Votre potentiel unique est la clé. Nous créons les conditions pour le voir éclore.' },
        { icon: 'chart-line', title: 'Prospérer', text: 'Les bons outils et le bon réseau transforment l\'ambition en résultats concrets.' },
        { icon: 'star',      title: 'Inspirer',  text: 'Chaque réussite devient un phare pour les autres. Ensemble, plus loin.' },
      ].map(v => `
      <div class="glass-rouge rounded-2xl p-8 text-left reveal">
        <div class="about-icon mb-4">
          <i class="fas fa-${v.icon}"></i>
        </div>
        <h3 class="text-xl font-bold mb-2" style="color:#FFFFFF" data-i18n="${v.title}">${v.title}</h3>
        <p class="text-sm leading-relaxed" style="color:rgba(245,240,232,0.6)" data-i18n="${v.text}">${v.text}</p>
      </div>`).join('')}
    </div>
  </div>
</section>
` : ''}

<!-- ════════════════════════════════════════
     SERVICES
════════════════════════════════════════ -->
${servicesActive ? `
<section id="services" class="relative z-10 py-20 px-6 section-alt">
  <div class="max-w-7xl mx-auto">

    <div class="text-center mb-16 reveal">
      <span class="section-label mb-4 block" data-i18n="Écosystème">Écosystème</span>
      <span class="accent-rouge"></span><h2 class="text-3xl md:text-5xl font-black mb-4" style="color:#FFFFFF" data-i18n="${cfg.services_title || 'Nos Services'}">${cfg.services_title || 'Nos Services'}</h2>
      <p class="max-w-xl mx-auto" style="color:rgba(245,240,232,0.5)" data-i18n="${cfg.services_subtitle || 'Des solutions complètes pour chaque dimension de votre réussite'}">${cfg.services_subtitle || 'Des solutions complètes pour chaque dimension de votre réussite'}</p>
    </div>

    <!-- Services actifs -->
    ${activeServices.length > 0 ? `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-12">
      ${activeServices.map(s => `
      <a href="/s/${s.slug}" class="service-card glass-dark rounded-2xl p-6 flex flex-col gap-4 no-underline reveal"
         style="border:1px solid rgba(255,255,255,0.06)">
        <div class="flex items-start justify-between">
          <div class="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1)">
            <img src="${s.logo_data_uri || s.logo_url}" alt="${s.name}"
                 class="w-full h-full object-contain p-1"
                 loading="lazy"
                 onerror="this.parentElement.innerHTML='<span style=\\'color:#791E15;font-size:1.2rem;font-weight:900\\'>${s.name.charAt(0)}</span>'">
          </div>
          <i class="fas fa-external-link-alt text-xs mt-1" style="color:rgba(245,240,232,0.2)"></i>
        </div>
        <div>
          <h3 class="font-bold text-base mb-1" style="color:#FFFFFF">${s.name}</h3>
          <p class="text-xs leading-relaxed line-clamp-3" style="color:rgba(245,240,232,0.45)">${s.description}</p>
        </div>
        <div style="margin-top:auto;padding-top:8px;border-top:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;gap:6px;color:#791E15;font-size:0.75rem;font-weight:700">
          <span data-i18n="Accéder">Accéder</span>
          <i class="fas fa-arrow-right text-xs"></i>
        </div>
      </a>`).join('')}
    </div>` : ''}

    <!-- Services bientôt -->
    ${comingSoonServices.length > 0 ? `
    <div class="mb-6">
      <div class="flex items-center gap-4 mb-6">
        <div class="flex-1 h-px" style="background:linear-gradient(to right,transparent,rgba(121,30,21,0.3),transparent)"></div>
        <span class="text-xs tracking-widest uppercase" data-i18n="Bientôt disponibles" style="color:rgba(245,240,232,0.35)">Bientôt disponibles</span>
        <div class="flex-1 h-px" style="background:linear-gradient(to right,transparent,rgba(121,30,21,0.3),transparent)"></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        ${comingSoonServices.map(s => `
        <div class="service-card coming-soon glass-dark rounded-2xl p-6 flex flex-col gap-4 reveal"
             style="border:1px solid rgba(255,255,255,0.04)">
          <div class="flex items-start justify-between">
            <div class="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center opacity-60" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08)">
              <img src="${s.logo_data_uri || s.logo_url}" alt="${s.name}"
                   class="w-full h-full object-contain p-1"
                   loading="lazy"
                   onerror="this.parentElement.innerHTML='<span style=\\'color:#791E15;font-size:1.2rem;font-weight:900\\'>${s.name.charAt(0)}</span>'">
            </div>
            <span class="badge-soon" data-i18n="Bientôt">Bientôt</span>
          </div>
          <div>
            <h3 class="font-bold text-base mb-1" style="color:rgba(245,240,232,0.65)">${s.name}</h3>
            <p class="text-xs leading-relaxed line-clamp-3" style="color:rgba(245,240,232,0.35)">${s.description}</p>
          </div>
        </div>`).join('')}
      </div>
    </div>` : ''}

  </div>
</section>
` : ''}

<!-- ════════════════════════════════════════
     TÉMOIGNAGES
════════════════════════════════════════ -->
${testimonialsActive && featuredTestimonials.length > 0 ? `
<section id="testimonials" class="relative z-10 py-20 px-6">
  <div class="max-w-7xl mx-auto">

    <div class="text-center mb-16 reveal">
      <span class="section-label mb-4 block" data-i18n="Témoignages">Témoignages</span>
      <h2 class="text-3xl md:text-5xl font-black mb-4" data-i18n="${cfg.testimonials_title || 'Ils ont transformé leur vie'}">${cfg.testimonials_title || 'Ils ont transformé leur vie'}</h2>
      <p class="text-cream/50 max-w-xl mx-auto">${cfg.testimonials_subtitle || ''}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${featuredTestimonials.map(t => `
      <div class="testimonial-card glass-dark rounded-2xl p-7 flex flex-col gap-4 reveal" style="border:1px solid rgba(121,30,21,0.2)">
        <!-- Stars -->
        <div class="flex gap-0.5 text-base">${renderStars(t.rating)}</div>

        <!-- Transformation badge -->
        ${t.transformation ? `<div class="inline-flex items-center gap-2 glass-rouge rounded-full px-3 py-1 w-fit">
          <i class="fas fa-bolt" style="color:#791E15;font-size:0.7rem"></i>
          <span style="color:#791E15;font-size:0.75rem;font-weight:700">${t.transformation}</span>
        </div>` : ''}

        <!-- Contenu -->
        <blockquote class="text-cream/70 text-sm leading-relaxed flex-1 italic">"${t.content}"</blockquote>

        <!-- Auteur -->
        <div class="flex items-center gap-3 pt-3 border-t border-white/5">
          ${t.author_photo
            ? `<img src="${t.author_photo}" alt="${t.author_name}" class="w-10 h-10 rounded-full object-cover" style="border:1px solid rgba(121,30,21,0.4)">`
            : `<div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white" style="background:linear-gradient(135deg,#791E15,#5A1510)">${t.author_name.charAt(0)}</div>`
          }
          <div>
            <div class="text-cream font-semibold text-sm">${t.author_name}</div>
            <div class="text-cream/40 text-xs">${t.author_role}${t.author_country ? ` · ${t.author_country}` : ''}</div>
          </div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>
` : ''}

<!-- ════════════════════════════════════════
     CTA FINAL
════════════════════════════════════════ -->
${ctaFinalActive ? `
<section id="cta" class="relative z-10 py-28 px-6 section-alt">
  <div class="max-w-3xl mx-auto text-center reveal">

    <!-- Glow background -->
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="w-[600px] h-[400px] rounded-full blur-[80px]" style="background:rgba(121,30,21,0.08)"></div>
    </div>

    <span class="section-label mb-4 block" data-i18n="Rejoignez-nous">Rejoignez-nous</span>
    <h2 class="text-3xl md:text-5xl font-black mb-6 leading-tight">
      <span data-i18n="${cfg.cta_final_title || 'Prêt à rejoindre l\'aventure LEADER ?'}">${cfg.cta_final_title || 'Prêt à rejoindre l\'aventure LEADER ?'}</span>
    </h2>
    <p class="text-cream/60 text-lg mb-10 max-w-xl mx-auto">
      <span data-i18n="${cfg.cta_final_subtitle || 'Rejoignez une communauté internationale d\'entrepreneurs ambitieux.'}">${cfg.cta_final_subtitle || 'Rejoignez une communauté internationale d\'entrepreneurs ambitieux.'}</span>
    </p>

    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a href="${cfg.cta_final_url || '/register'}"
         class="btn-rouge px-12 py-4 text-base font-bold tracking-wide pulse-rouge">
        <i class="fas fa-rocket mr-2"></i><span data-i18n="${cfg.cta_final_label || 'Rejoindre LEADER'}">${cfg.cta_final_label || 'Rejoindre LEADER'}</span>
      </a>
      <a href="${cfg.hero_cta_url || '/login'}"
         class="btn-outline px-12 py-4 text-base font-semibold">
        <i class="fas fa-sign-in-alt mr-2"></i><span data-i18n="J'ai déjà un compte">J'ai déjà un compte</span>
      </a>
    </div>
  </div>
</section>
` : ''}

<!-- ════════════════════════════════════════
     FOOTER
════════════════════════════════════════ -->
<footer class="relative z-10 py-12 px-6" style="background:#010518;border-top:1px solid rgba(121,30,21,0.25)">
  <div class="max-w-7xl mx-auto">
    <div class="flex flex-col md:flex-row items-center justify-between gap-6">

      <!-- Logo + tagline -->
      <div class="flex flex-col items-center md:items-start gap-2">
        <img src="/static/logo-leader.png" alt="LEADER" style="height:2rem;object-fit:contain"
             onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
        <span style="display:none;font-size:1.6rem;letter-spacing:0.2em;font-weight:900;color:#FFFFFF">LEADER</span>
        <p class="text-cream/30 text-sm italic" data-i18n="${cfg.footer_tagline || 'Révéler. Prospérer. Inspirer.'}">${cfg.footer_tagline || 'Révéler. Prospérer. Inspirer.'}</p>
      </div>

      <!-- Links -->
      <div class="flex flex-wrap justify-center gap-6 text-cream/30 text-sm">
        <a href="#services" data-i18n="Services" style="color:rgba(245,240,232,0.35);text-decoration:none" onmouseover="this.style.color='#A02820'" onmouseout="this.style.color='rgba(245,240,232,0.35)'">Services</a>
        <a href="#testimonials" data-i18n="Témoignages" style="color:rgba(245,240,232,0.35);text-decoration:none" onmouseover="this.style.color='#A02820'" onmouseout="this.style.color='rgba(245,240,232,0.35)'">Témoignages</a>
        <a href="${cfg.hero_cta_url || '/login'}" data-i18n="Connexion" style="color:rgba(245,240,232,0.35);text-decoration:none" onmouseover="this.style.color='#A02820'" onmouseout="this.style.color='rgba(245,240,232,0.35)'">Connexion</a>
        <a href="${cfg.cta_final_url || '/register'}" data-i18n="Rejoindre" style="color:rgba(245,240,232,0.35);text-decoration:none" onmouseover="this.style.color='#A02820'" onmouseout="this.style.color='rgba(245,240,232,0.35)'">Rejoindre</a>
      </div>

      <!-- Copyright -->
      <div class="text-xs text-center md:text-right" style="color:rgba(245,240,232,0.25)">
        <div><span data-i18n="Tous droits réservés.">© ${new Date().getFullYear()} LEADER. Tous droits réservés.</span></div>
      </div>
    </div>
  </div>
</footer>

<!-- ════════════════════════════════════════
     JAVASCRIPT
════════════════════════════════════════ -->
<script>
// ── Particules canvas ──────────────────────────────────────────────
(function() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function Particle() {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.r = Math.random() * 1.5 + 0.3;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.alpha = Math.random() * 0.5 + 0.1;
    this.color = Math.random() > 0.7 ? '#791E15' : '#FFFFFF';
  }

  Particle.prototype.update = function() {
    this.x += this.vx; this.y += this.vy;
    if (this.x < 0) this.x = W; if (this.x > W) this.x = 0;
    if (this.y < 0) this.y = H; if (this.y > H) this.y = 0;
  };

  Particle.prototype.draw = function() {
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  };

  function init() {
    resize();
    particles = Array.from({ length: 120 }, () => new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  init(); animate();
})();

// ── Navbar scroll ──────────────────────────────────────────────────
const navbar = document.getElementById('navbar');
const scrollProgress = document.getElementById('scroll-progress');
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollProgress) scrollProgress.style.width = (scrolled / total * 100) + '%';
  if (navbar) {
    if (scrolled > 50) navbar.classList.add('navbar-scrolled');
    else navbar.classList.remove('navbar-scrolled');
  }
}, { passive: true });

// ── Intersection Observer (reveal) ────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
</script>

<script src="/static/i18n.js?v=${Date.now()}"></script>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────
// ROUTES PUBLIQUES
// ─────────────────────────────────────────────────────────────

// GET /api/landing/config — config publique JSON
landingPublic.get('/api/landing/config', async (c) => {
  const cfg = await getLandingConfig(c.env.DB)
  return c.json({ success: true, data: cfg })
})

// GET /api/landing/services — services publics JSON
landingPublic.get('/api/landing/services', async (c) => {
  const services = await getServices(c.env.DB, false)
  return c.json({ success: true, data: services })
})

// GET /s/:slug — redirection directe vers le service
landingPublic.get('/s/:slug', async (c) => {
  const slug = c.req.param('slug')
  try {
    // Essai landing_services, fallback services
    let row = await c.env.DB.prepare(
      "SELECT url, status, name FROM landing_services WHERE slug = ?"
    ).bind(slug).first().catch(() => null) as any
    if (!row) {
      row = await c.env.DB.prepare(
        "SELECT url, status, name FROM services WHERE slug = ?"
      ).bind(slug).first().catch(() => null) as any
    }

    if (!row) {
      return c.html(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Service introuvable</title>
      <script src="/static/tailwind.min.js"></script></head>
      <body class="bg-gray-950 text-white min-h-screen flex items-center justify-center">
        <div class="text-center"><h1 class="text-2xl font-bold mb-4">Service introuvable</h1>
        <a href="/" style="color:#791E15">Retour à l'accueil</a></div>
      </body></html>`, 404)
    }

    if (row.status === 'coming_soon' || !row.url) {
      return c.html(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${row.name} — Bientôt</title>
      <script src="/static/tailwind.min.js"></script></head>
      <body class="bg-gray-950 text-white min-h-screen flex items-center justify-center">
        <div class="text-center">
          <div class="text-5xl mb-6">🚀</div>
          <h1 class="text-3xl font-black mb-2">${row.name}</h1>
          <p style="color:#791E15" class="font-semibold mb-6">Bientôt disponible</p>
          <p class="text-gray-400 mb-8">Ce service sera bientôt accessible aux membres LEADER.</p>
          <a href="/" class="btn-rouge px-8 py-3 rounded-full font-bold" style="text-decoration:none">Retour à l'accueil</a>
        </div>
      </body></html>`, 200)
    }

    // Redirection directe
    return c.redirect(row.url, 302)
  } catch (e) {
    return c.redirect('/', 302)
  }
})

// ─────────────────────────────────────────────────────────────
// ROUTES ADMIN — /admin/landing/*
// ─────────────────────────────────────────────────────────────

// Middleware auth admin — même logique que admin.ts (JWT + vérif admin_users)
// Routes montées sur /api/admin → /api/admin/landing/data, etc.
landingAdmin.use('*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.slice(7)

  // 1. Vérifier la signature JWT et le rôle
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Accès refusé' }, 403)

  // 2. Vérifier que l'admin existe toujours en DB
  const adminRow = await c.env.DB.prepare(
    `SELECT id FROM admin_users WHERE id = ?`
  ).bind(payload.sub).first() as any
  if (!adminRow) return c.json({ error: 'Session invalide — veuillez vous reconnecter', code: 'INVALID_ADMIN_SESSION' }, 401)

  c.set('adminId' as any, adminRow.id)
  return next()
})

// GET /admin/landing/data — tout en une requête
landingAdmin.get('/landing/data', async (c) => {
  try {
    const [cfg, services, testimonials, sections] = await Promise.all([
      getLandingConfig(c.env.DB),
      getServices(c.env.DB, true),
      getTestimonials(c.env.DB, false),
      getSections(c.env.DB),
    ])
    return c.json({ success: true, data: { cfg, services, testimonials, sections } })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /admin/landing/config — update une clé
landingAdmin.post('/landing/config', async (c) => {
  try {
    const body = await c.req.json() as Record<string, string>
    for (const [key, value] of Object.entries(body)) {
      await c.env.DB.prepare(
        `INSERT INTO landing_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`
      ).bind(key, value).run()
    }
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /admin/landing/services — liste complète
landingAdmin.get('/landing/services', async (c) => {
  const services = await getServices(c.env.DB, true)
  return c.json({ success: true, data: services })
})

// POST /admin/landing/services — créer service
landingAdmin.post('/landing/services', async (c) => {
  try {
    const b = await c.req.json() as any
    const r = await c.env.DB.prepare(
      `INSERT INTO landing_services (name, slug, description, url, logo_url, logo_data_uri, status, display_order, category, bg_color, text_color, api_url, api_key, api_config)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(b.name, b.slug, b.description||'', b.url||'', b.logo_url||'', b.logo_data_uri||'',
           b.status||'active', b.display_order||0, b.category||'general', b.bg_color||'#1A1A26', b.text_color||'#FFFFFF',
           b.api_url||null, b.api_key||null, b.api_config||null).run()
    return c.json({ success: true, id: r.meta.last_row_id })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// PUT /admin/landing/services/:id — modifier service
landingAdmin.put('/landing/services/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const b  = await c.req.json() as any
    await c.env.DB.prepare(
      `UPDATE landing_services SET name=?, slug=?, description=?, url=?, logo_url=?, logo_data_uri=?,
       status=?, display_order=?, category=?, bg_color=?, text_color=?,
       api_url=?, api_key=?, api_config=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(b.name, b.slug, b.description||'', b.url||'', b.logo_url||'', b.logo_data_uri||'',
           b.status||'active', b.display_order||0, b.category||'general', b.bg_color||'#1A1A26',
           b.text_color||'#FFFFFF',
           b.api_url||null, b.api_key||null, b.api_config||null,
           id).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// DELETE /admin/landing/services/:id
landingAdmin.delete('/landing/services/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    await c.env.DB.prepare('DELETE FROM landing_services WHERE id=?').bind(id).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /admin/landing/testimonials
landingAdmin.get('/landing/testimonials', async (c) => {
  const t = await getTestimonials(c.env.DB, false)
  return c.json({ success: true, data: t })
})

// POST /admin/landing/testimonials
landingAdmin.post('/landing/testimonials', async (c) => {
  try {
    const b = await c.req.json() as any
    const r = await c.env.DB.prepare(
      `INSERT INTO landing_testimonials (author_name, author_role, author_country, author_photo, content, rating, transformation, source, is_featured, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(b.author_name, b.author_role||'', b.author_country||'', b.author_photo||'',
           b.content, b.rating||5, b.transformation||'', b.source||'manual',
           b.is_featured||0, b.display_order||0, b.is_active??1).run()
    return c.json({ success: true, id: r.meta.last_row_id })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// PUT /admin/landing/testimonials/:id
landingAdmin.put('/landing/testimonials/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const b  = await c.req.json() as any
    await c.env.DB.prepare(
      `UPDATE landing_testimonials SET author_name=?, author_role=?, author_country=?, author_photo=?,
       content=?, rating=?, transformation=?, is_featured=?, display_order=?, is_active=?, updated_at=datetime('now')
       WHERE id=?`
    ).bind(b.author_name, b.author_role||'', b.author_country||'', b.author_photo||'',
           b.content, b.rating||5, b.transformation||'', b.is_featured||0,
           b.display_order||0, b.is_active??1, id).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// DELETE /admin/landing/testimonials/:id
landingAdmin.delete('/landing/testimonials/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    await c.env.DB.prepare('DELETE FROM landing_testimonials WHERE id=?').bind(id).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// PUT /admin/landing/sections/:key — activer/désactiver/réordonner
landingAdmin.put('/landing/sections/:key', async (c) => {
  try {
    const key = c.req.param('key')
    const b   = await c.req.json() as any
    await c.env.DB.prepare(
      `UPDATE landing_sections SET is_active=?, display_order=?, updated_at=datetime('now') WHERE section_key=?`
    ).bind(b.is_active??1, b.display_order||0, key).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ─────────────────────────────────────────────────────────────
// LANDING PAGE BUILDER — Route principale GET /
// ─────────────────────────────────────────────────────────────
export async function buildLandingPage(db: D1Database): Promise<string> {
  const [cfg, services, testimonials, sections] = await Promise.all([
    getLandingConfig(db),
    getServices(db, false),
    getTestimonials(db, true),
    getSections(db),
  ])
  return buildLandingHTML(cfg, services, testimonials, sections)
}
