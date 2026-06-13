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
    const seen = new Set()
    return rows.filter((r, idx) => {
      const key = r.id != null ? r.id : `_idx_${idx}`
      if (seen.has(key)) return false
      seen.add(key)
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
    const seen = new Set()
    return rows.filter((r, idx) => {
      const key = r.id != null ? r.id : `_idx_${idx}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  try {
    const q = featuredOnly
      ? 'SELECT * FROM landing_testimonials WHERE is_active=1 AND is_featured=1 ORDER BY display_order ASC LIMIT 20'
      : 'SELECT * FROM landing_testimonials WHERE is_active=1 ORDER BY display_order ASC'
    const rows = await db.prepare(q).all()
    if (rows.results && rows.results.length > 0) return dedup(rows.results as any[])
    // Fallback sur testimonials
    const q2 = featuredOnly
      ? 'SELECT * FROM testimonials WHERE is_active=1 AND is_featured=1 ORDER BY display_order ASC LIMIT 20'
      : 'SELECT * FROM testimonials WHERE is_active=1 ORDER BY display_order ASC'
    const rows2 = await db.prepare(q2).all()
    return dedup((rows2.results || []) as any[])
  } catch {
    try {
      const q2 = featuredOnly
        ? 'SELECT * FROM testimonials WHERE is_active=1 AND is_featured=1 ORDER BY display_order ASC LIMIT 20'
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

    /* Pilier card hover */
    .pilier-card:hover { transform: translateY(-5px); border-color: rgba(121,30,21,0.45) !important; box-shadow: 0 16px 50px rgba(0,0,0,0.5), 0 0 24px rgba(121,30,21,0.15); }

    /* Animation Apple-style pour les logos de services */
    @keyframes logoReveal { from { opacity:0; transform:scale(0.7) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
    .service-logo-anim { animation: logoReveal 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards; opacity:0; }
    .service-card:nth-child(1) .service-logo-anim { animation-delay:0.05s }
    .service-card:nth-child(2) .service-logo-anim { animation-delay:0.12s }
    .service-card:nth-child(3) .service-logo-anim { animation-delay:0.19s }
    .service-card:nth-child(4) .service-logo-anim { animation-delay:0.26s }
    .service-card:nth-child(5) .service-logo-anim { animation-delay:0.33s }
    .service-card:nth-child(6) .service-logo-anim { animation-delay:0.40s }
    .service-card:nth-child(7) .service-logo-anim { animation-delay:0.47s }
    .service-card:nth-child(8) .service-logo-anim { animation-delay:0.54s }

    /* Testimonials carrousel */
    #testimonials-track::-webkit-scrollbar { display:none; }
    #testimonials-track.dragging { cursor: grabbing; user-select: none; }

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

    <!-- Badges preuves sociales -->
    <div class="flex flex-wrap justify-center gap-3 mt-10 mb-2 fade-in-up" style="animation-delay:0.55s">
      <div class="flex items-center gap-2 px-4 py-2 rounded-full" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12)">
        <i class="fas fa-users" style="color:#791E15;font-size:0.8rem"></i>
        <span style="color:rgba(245,240,232,0.85);font-size:0.8rem;font-weight:600">${cfg.stats_members || '12 000'}+ membres</span>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 rounded-full" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12)">
        <i class="fas fa-globe-europe" style="color:#791E15;font-size:0.8rem"></i>
        <span style="color:rgba(245,240,232,0.85);font-size:0.8rem;font-weight:600">${cfg.stats_countries || '47'} pays</span>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 rounded-full" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12)">
        <span style="color:#F5A623;font-size:0.75rem">★★★★★</span>
        <span style="color:rgba(245,240,232,0.85);font-size:0.8rem;font-weight:600">${cfg.stats_rating || '4.9'}/5 · ${cfg.stats_reviews || '237'} avis</span>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 rounded-full" style="background:rgba(121,30,21,0.15);border:1px solid rgba(121,30,21,0.35)">
        <i class="fas fa-lock" style="color:#791E15;font-size:0.8rem"></i>
        <span style="color:rgba(245,240,232,0.85);font-size:0.8rem;font-weight:600">Club privé</span>
      </div>
    </div>

    <!-- Slogan viral -->
    <div class="mt-8 mb-4 fade-in-up" style="animation-delay:0.65s">
      <p class="text-base md:text-lg font-semibold tracking-widest uppercase" style="color:rgba(121,30,21,0.9);letter-spacing:0.2em">✦ ${cfg.slogan || 'Ensemble, faisons une différence'} ✦</p>
    </div>

    <!-- Scroll indicator -->
    <div class="mt-8 fade-in-up flex justify-center" style="animation-delay:0.75s">
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
        { val: cfg.stats_members || '12 000+',  label: cfg.stats_members_label || 'Membres actifs',     icon: 'users',        sub: cfg.stats_members_sub || '+300 ce mois' },
        { val: cfg.stats_countries || '47',      label: cfg.stats_countries_label || 'Pays représentés', icon: 'globe-europe', sub: cfg.stats_countries_sub || 'sur 6 continents' },
        { val: cfg.stats_services || '14',       label: cfg.stats_services_label || 'Services exclusifs', icon: 'th-large',    sub: cfg.stats_services_sub || 'dès le 1er jour' },
        { val: cfg.stats_years || '5+',          label: cfg.stats_years_label || 'Années d\'excellence',  icon: 'star',        sub: cfg.stats_years_sub || 'de résultats prouvés' },
      ].map(s => `
      <div class="glass-dark rounded-2xl p-6 text-center reveal" style="border:1px solid rgba(121,30,21,0.18)">
        <i class="fas fa-${s.icon} stat-icon"></i>
        <div class="stat-number stat-glow">${s.val}</div>
        <div class="stat-label" data-i18n="${s.label}">${s.label}</div>
        <div style="color:#791E15;font-size:0.7rem;font-weight:600;margin-top:6px;letter-spacing:0.05em">${s.sub}</div>
      </div>`).join('')}
    </div>
    <div class="section-divider mt-16"></div>
  </div>
</section>
` : ''}

<!-- ════════════════════════════════════════
     POUR QUI ?
════════════════════════════════════════ -->
${aboutActive ? `
<section id="about" class="relative z-10 py-24 px-6">
  <div class="max-w-5xl mx-auto">

    <!-- Titre section -->
    <div class="text-center mb-16 reveal">
      <span class="accent-rouge"></span>
      <span class="section-label mb-4 block">Pour qui ?</span>
      <h2 class="text-3xl md:text-5xl font-black mb-4 leading-tight" style="color:#FFFFFF">
        LEADER est fait pour <span style="color:#791E15">vous</span>
      </h2>
      <p class="text-lg max-w-xl mx-auto" style="color:rgba(245,240,232,0.55)">
        Quel que soit votre point de départ, LEADER vous accompagne vers la liberté financière.
      </p>
    </div>

    <!-- 3 profils -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
      ${[
        {
          icon: 'briefcase', num: '01',
          title: 'L\'Entrepreneur',
          desc: 'Vous avez un projet ou une activité. LEADER vous donne les outils pour structurer, financer et scaler votre business.',
          tag: 'Business & Scale'
        },
        {
          icon: 'user-tie', num: '02',
          title: 'Le Salarié ambitieux',
          desc: 'Vous avez un emploi mais voulez plus. Apprenez à investir, diversifier vos revenus et construire votre patrimoine.',
          tag: 'Revenus & Patrimoine'
        },
        {
          icon: 'seedling', num: '03',
          title: 'Le Débutant motivé',
          desc: 'Vous démarrez de zéro. Nos formations et notre communauté vous guident pas à pas, sans jargon ni barrières.',
          tag: 'Formation & Démarrage'
        },
      ].map(p => `
      <div class="glass-dark rounded-2xl p-8 flex flex-col gap-4 reveal" style="border:1px solid rgba(121,30,21,0.18);position:relative;overflow:hidden">
        <div style="position:absolute;top:16px;right:20px;font-size:3.5rem;font-weight:900;color:rgba(121,30,21,0.08);line-height:1">${p.num}</div>
        <div class="about-icon"><i class="fas fa-${p.icon}"></i></div>
        <div>
          <span style="background:rgba(121,30,21,0.18);color:#A02820;font-size:0.65rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:3px 10px;border-radius:999px;border:1px solid rgba(121,30,21,0.3)">${p.tag}</span>
        </div>
        <h3 class="text-xl font-bold" style="color:#FFFFFF">${p.title}</h3>
        <p class="text-sm leading-relaxed" style="color:rgba(245,240,232,0.55)">${p.desc}</p>
      </div>`).join('')}
    </div>

    <!-- Comment ça marche — 3 étapes -->
    <div class="text-center mb-12 reveal">
      <span class="section-label mb-4 block">Processus</span>
      <h2 class="text-3xl md:text-4xl font-black mb-2" style="color:#FFFFFF">Comment ça marche ?</h2>
      <p class="max-w-lg mx-auto" style="color:rgba(245,240,232,0.45)">3 étapes simples pour transformer votre rapport à l'argent</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
      <!-- Ligne de connexion desktop -->
      <div class="hidden md:block absolute top-10 left-[20%] right-[20%] h-px" style="background:linear-gradient(90deg,transparent,rgba(121,30,21,0.4),transparent)"></div>
      ${[
        { step: '1', icon: 'user-plus',   title: 'Rejoignez le Club',    desc: 'Créez votre compte et accédez immédiatement à l\'espace membre et à la communauté privée LEADER.' },
        { step: '2', icon: 'graduation-cap', title: 'Formez-vous',       desc: 'Parcourez les 6 piliers de l\'éducation financière avec des formations concrètes, des experts et du contenu exclusif.' },
        { step: '3', icon: 'chart-line',  title: 'Transformez votre vie', desc: 'Appliquez, investissez, construisez et partagez votre succès. Ensemble, faisons une différence.' },
      ].map(e => `
      <div class="flex flex-col items-center text-center gap-4 reveal" style="position:relative;z-index:1">
        <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#791E15,#A02820);display:flex;align-items:center;justify-content:center;font-size:1.25rem;color:#FFFFFF;font-weight:900;flex-shrink:0;box-shadow:0 0 24px rgba(121,30,21,0.4)">
          <i class="fas fa-${e.icon}"></i>
        </div>
        <div style="width:28px;height:28px;border-radius:50%;background:rgba(121,30,21,0.15);border:1px solid rgba(121,30,21,0.35);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:900;color:#791E15">${e.step}</div>
        <h3 class="text-lg font-bold" style="color:#FFFFFF">${e.title}</h3>
        <p class="text-sm leading-relaxed" style="color:rgba(245,240,232,0.5)">${e.desc}</p>
      </div>`).join('')}
    </div>

  </div>
</section>
` : ''}

<!-- ════════════════════════════════════════
     6 PILIERS DE L'ÉDUCATION FINANCIÈRE
════════════════════════════════════════ -->
<section id="piliers" class="relative z-10 py-24 px-6 section-alt">
  <div class="max-w-6xl mx-auto">

    <div class="text-center mb-6 reveal">
      <span class="accent-rouge"></span>
      <span class="section-label mb-4 block">Club privé · Éducation financière</span>
      <h2 class="text-3xl md:text-5xl font-black mb-4 leading-tight" style="color:#FFFFFF">
        Les <span style="color:#791E15">6 Piliers</span> de l'Éducation Financière LEADER
      </h2>
      <p class="text-base max-w-2xl mx-auto mb-2" style="color:rgba(245,240,232,0.55)">
        Chez LEADER, l'éducation financière ne se limite pas à apprendre à gagner de l'argent.<br>
        Elle repose sur un parcours complet : comprendre, créer, protéger, faire grandir, vivre pleinement et transmettre.
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
      ${[
        { num:'01', icon:'book-open',      title:'S\'éduquer',             desc:'Comprendre l\'argent pour prendre de meilleures décisions.',                                                                        color:'#791E15' },
        { num:'02', icon:'rocket',          title:'Créer de la richesse',   desc:'Développer ses compétences, ses projets et sa capacité à produire de la valeur.',                                                  color:'#791E15' },
        { num:'03', icon:'shield-alt',      title:'Garder sa richesse',     desc:'Apprendre à gérer, protéger et structurer ce qui a été construit.',                                                                color:'#791E15' },
        { num:'04', icon:'chart-line',      title:'Multiplier sa richesse', desc:'Faire grandir ses ressources avec méthode, stratégie et intelligence.',                                                            color:'#791E15' },
        { num:'05', icon:'smile-beam',      title:'Profiter de sa richesse',desc:'Utiliser ses ressources pour améliorer sa vie, sa liberté et ses expériences.',                                                    color:'#791E15' },
        { num:'06', icon:'hands-helping',   title:'Partager',               desc:'Transmettre, inspirer et contribuer à faire une différence autour de soi.\n✦ Ensemble, faisons une différence ✦',                 color:'#A02820' },
      ].map((p, idx) => `
      <div class="glass-dark rounded-2xl p-7 flex flex-col gap-3 reveal pilier-card" style="border:1px solid rgba(121,30,21,0.18);transition:all 0.35s cubic-bezier(0.4,0,0.2,1);animation-delay:${idx * 0.08}s;position:relative;overflow:hidden">
        <!-- Numéro watermark -->
        <div style="position:absolute;top:12px;right:16px;font-size:3rem;font-weight:900;color:rgba(121,30,21,0.07);line-height:1;font-variant-numeric:tabular-nums">${p.num}</div>
        <!-- Icône -->
        <div style="width:48px;height:48px;border-radius:14px;background:rgba(121,30,21,0.15);border:1px solid rgba(121,30,21,0.3);display:flex;align-items:center;justify-content:center;font-size:1.1rem;color:${p.color};flex-shrink:0">
          <i class="fas fa-${p.icon}"></i>
        </div>
        <!-- Titre -->
        <h3 class="text-base font-bold leading-snug" style="color:#FFFFFF">${p.title}</h3>
        <!-- Desc — gestion du \n pour le 6e pilier -->
        <p class="text-sm leading-relaxed" style="color:rgba(245,240,232,0.55)">${p.desc.replace(/\n/g, '<br><span style="color:#791E15;font-weight:700;letter-spacing:0.1em;font-size:0.8rem">')}</p>
      </div>`).join('')}
    </div>

    <!-- CTA piliers -->
    <div class="text-center mt-14 reveal">
      <a href="${cfg.hero_cta_url || '/login'}" class="btn-rouge px-10 py-4 text-base font-bold tracking-wide" style="text-decoration:none">
        <i class="fas fa-lock-open mr-2"></i>Accéder aux 6 piliers
      </a>
      <p class="mt-4 text-sm" style="color:rgba(245,240,232,0.35)">Réservé aux membres du club privé LEADER</p>
    </div>

  </div>
</section>

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
          <div class="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.15)">
            <img src="${s.logo_data_uri || s.logo_url}" alt="${s.name}"
                 class="w-full h-full object-contain p-1 service-logo-anim"
                 style="mix-blend-mode:screen;filter:brightness(1.15) contrast(1.05)"
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
            <div class="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center opacity-70" style="background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.12)">
              <img src="${s.logo_data_uri || s.logo_url}" alt="${s.name}"
                   class="w-full h-full object-contain p-1"
                   style="mix-blend-mode:screen;filter:brightness(1.1) contrast(1.05)"
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

    <div class="text-center mb-10">
      <span class="section-label mb-4 block" data-i18n="Témoignages">Témoignages</span>
      <h2 class="text-3xl md:text-5xl font-black mb-6" data-i18n="${cfg.testimonials_title || 'Ils ont transformé leur vie'}">${cfg.testimonials_title || 'Ils ont transformé leur vie'}</h2>

      <!-- Badge Trustpilot officiel -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">

        <!-- Widget Trustpilot style -->
        <a href="https://fr.trustpilot.com/review/willbenetwork.com" target="_blank" rel="noopener"
           style="display:inline-flex;align-items:center;gap:12px;background:#FFFFFF;border-radius:10px;padding:10px 18px;text-decoration:none;box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:transform 0.2s"
           onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
          <!-- Logo Trustpilot SVG officiel -->
          <svg width="110" height="28" viewBox="0 0 110 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0L17.163 9.763H27.456L19.147 15.819L22.31 25.582L14 19.527L5.69 25.582L8.853 15.819L0.544 9.763H10.837L14 0Z" fill="#00B67A"/>
            <text x="33" y="20" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#191919">Trustpilot</text>
          </svg>
          <!-- Note + étoiles -->
          <div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px">
            <div style="display:flex;align-items:center;gap:4px">
              <!-- 5 étoiles Trustpilot vertes -->
              ${Array.from({length: 5}, (_, i) => `<span style="display:inline-block;width:20px;height:20px;background:${i < 4 ? '#00B67A' : '#FF8622'};border-radius:2px;display:flex;align-items:center;justify-content:center"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span>`).join('')}
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:0.8rem;font-weight:700;color:#191919">${cfg.stats_rating || '4.9'} / 5</span>
              <span style="font-size:0.72rem;color:#555;border-left:1px solid #ddd;padding-left:6px">${cfg.stats_reviews || '38'} avis</span>
            </div>
          </div>
        </a>

        <!-- Séparateur + total membres -->
        <div style="display:flex;align-items:center;gap-8px;color:rgba(245,240,232,0.4);font-size:0.8rem">
          <span style="color:rgba(245,240,232,0.35)">Rejoignez les</span>
          <span style="color:#FFFFFF;font-weight:700;margin:0 4px">${cfg.stats_members || '12 000'}+</span>
          <span style="color:rgba(245,240,232,0.35)">membres satisfaits</span>
        </div>

      </div>
    </div>

    <!-- Carrousel desktop : grille 3 colonnes / mobile : scroll horizontal -->
    <div id="testimonials-track" style="display:flex;gap:1.25rem;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:8px;cursor:grab">
      ${featuredTestimonials.map(t => `
      <div class="testimonial-card glass-dark rounded-2xl p-7 flex flex-col gap-4"
           style="border:1px solid rgba(121,30,21,0.2);min-width:clamp(280px,80vw,360px);flex-shrink:0;scroll-snap-align:start;opacity:1;transform:none">
        <!-- Stars -->
        <div class="flex gap-0.5 text-base">${renderStars(t.rating)}</div>

        <!-- Transformation badge -->
        ${t.transformation ? `<div class="inline-flex items-center gap-2 glass-rouge rounded-full px-3 py-1 w-fit">
          <i class="fas fa-bolt" style="color:#791E15;font-size:0.7rem"></i>
          <span style="color:#791E15;font-size:0.75rem;font-weight:700">${t.transformation}</span>
        </div>` : ''}

        <!-- Contenu -->
        <blockquote class="text-cream/70 text-sm leading-relaxed italic" style="overflow-wrap:break-word;word-break:break-word;white-space:normal;overflow:visible;flex-shrink:0">"${t.content}"</blockquote>

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

    <!-- Dots navigation mobile -->
    <div id="testimonials-dots" class="flex justify-center gap-2 mt-6 md:hidden">
      ${featuredTestimonials.map((_, i) => `<button onclick="scrollToTestimonial(${i})" style="width:8px;height:8px;border-radius:50%;background:${i === 0 ? '#791E15' : 'rgba(255,255,255,0.2)'};border:none;cursor:pointer;padding:0;transition:all 0.3s" class="dot-btn"></button>`).join('')}
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
<footer class="relative z-10 pt-16 pb-8 px-6" style="background:#010518;border-top:1px solid rgba(121,30,21,0.25)">
  <div class="max-w-7xl mx-auto">

    <!-- Colonnes principales -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

      <!-- Colonne 1 : Logo + tagline + slogan -->
      <div class="flex flex-col gap-4">
        <img src="/static/logo-leader.png" alt="LEADER" style="height:2.2rem;object-fit:contain;object-position:left"
             onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
        <span style="display:none;font-size:1.6rem;letter-spacing:0.2em;font-weight:900;color:#FFFFFF">LEADER</span>
        <p class="text-sm italic" style="color:rgba(245,240,232,0.35)" data-i18n="${cfg.footer_tagline || 'Révéler. Prospérer. Inspirer.'}">${cfg.footer_tagline || 'Révéler. Prospérer. Inspirer.'}</p>
        <p class="text-xs font-bold tracking-widest uppercase" style="color:rgba(121,30,21,0.8)">✦ ${cfg.slogan || 'Ensemble, faisons une différence'} ✦</p>
        <!-- Badges confiance -->
        <div class="flex flex-wrap gap-2 mt-2">
          <span style="display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:4px 9px;font-size:0.68rem;color:rgba(245,240,232,0.45)"><i class="fas fa-lock" style="color:#791E15;font-size:0.65rem"></i>RGPD conforme</span>
          <span style="display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:4px 9px;font-size:0.68rem;color:rgba(245,240,232,0.45)"><i class="fas fa-shield-alt" style="color:#791E15;font-size:0.65rem"></i>SSL sécurisé</span>
          <span style="display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:4px 9px;font-size:0.68rem;color:rgba(245,240,232,0.45)"><i class="fas fa-globe" style="color:#791E15;font-size:0.65rem"></i>${cfg.stats_countries || '47'} pays</span>
        </div>
      </div>

      <!-- Colonne 2 : Liens rapides -->
      <div>
        <h4 class="text-sm font-bold mb-4 tracking-wider uppercase" style="color:rgba(245,240,232,0.65)">Navigation</h4>
        <ul class="flex flex-col gap-2.5">
          ${[
            { href:'#services',      label:'Nos Services' },
            { href:'#piliers',       label:'Les 6 Piliers' },
            { href:'#testimonials',  label:'Témoignages' },
            { href:'#about',         label:'Pour qui ?' },
          ].map(l => `<li><a href="${l.href}" style="color:rgba(245,240,232,0.38);text-decoration:none;font-size:0.87rem;transition:color 0.2s" onmouseover="this.style.color='#A02820'" onmouseout="this.style.color='rgba(245,240,232,0.38)'">${l.label}</a></li>`).join('')}
        </ul>
      </div>

      <!-- Colonne 3 : Compte -->
      <div>
        <h4 class="text-sm font-bold mb-4 tracking-wider uppercase" style="color:rgba(245,240,232,0.65)">Mon espace</h4>
        <ul class="flex flex-col gap-2.5">
          ${[
            { href: cfg.hero_cta_url || '/login',       label:'Se connecter' },
            { href: cfg.cta_final_url || '/register',   label:'Rejoindre LEADER' },
            { href:'#',                                   label:'Politique de confidentialité' },
            { href:'#',                                   label:'Mentions légales' },
          ].map(l => `<li><a href="${l.href}" style="color:rgba(245,240,232,0.38);text-decoration:none;font-size:0.87rem;transition:color 0.2s" onmouseover="this.style.color='#A02820'" onmouseout="this.style.color='rgba(245,240,232,0.38)'">${l.label}</a></li>`).join('')}
        </ul>
      </div>

      <!-- Colonne 4 : Réseaux sociaux -->
      <div>
        <h4 class="text-sm font-bold mb-4 tracking-wider uppercase" style="color:rgba(245,240,232,0.65)">Suivez-nous</h4>
        <div class="flex flex-wrap gap-3">
          ${[
            { icon:'instagram',  href: cfg.social_instagram || '#', label:'Instagram' },
            { icon:'facebook-f', href: cfg.social_facebook  || '#', label:'Facebook' },
            { icon:'youtube',    href: cfg.social_youtube   || '#', label:'YouTube' },
            { icon:'linkedin-in',href: cfg.social_linkedin  || '#', label:'LinkedIn' },
            { icon:'tiktok',     href: cfg.social_tiktok    || '#', label:'TikTok' },
          ].map(s => `
          <a href="${s.href}" aria-label="${s.label}" title="${s.label}"
             style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);display:flex;align-items:center;justify-content:center;color:rgba(245,240,232,0.45);font-size:0.85rem;text-decoration:none;transition:all 0.25s"
             onmouseover="this.style.background='rgba(121,30,21,0.25)';this.style.borderColor='rgba(121,30,21,0.45)';this.style.color='#FFFFFF'"
             onmouseout="this.style.background='rgba(255,255,255,0.05)';this.style.borderColor='rgba(255,255,255,0.09)';this.style.color='rgba(245,240,232,0.45)'">
            <i class="fab fa-${s.icon}"></i>
          </a>`).join('')}
        </div>
        <p class="mt-5 text-xs leading-relaxed" style="color:rgba(245,240,232,0.28)">
          Rejoignez la communauté internationale LEADER et transformez votre rapport à l'argent.
        </p>
      </div>
    </div>

    <!-- Séparateur + Copyright -->
    <div class="section-divider mb-6"></div>
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style="color:rgba(245,240,232,0.22)">
      <span>© ${new Date().getFullYear()} LEADER. Tous droits réservés.</span>
      <span class="italic">✦ ${cfg.slogan || 'Ensemble, faisons une différence'} ✦</span>
      <span>Club privé d'éducation financière · ${cfg.stats_countries || '47'} pays</span>
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

// ── Carrousel témoignages (drag-scroll + auto-scroll + dots) ──────
(function() {
  const track = document.getElementById('testimonials-track');
  if (!track) return;

  // Drag scroll
  let isDown = false, startX = 0, scrollLeft = 0;
  track.addEventListener('mousedown', e => {
    isDown = true; track.classList.add('dragging');
    startX = e.pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
  });
  track.addEventListener('mouseleave', () => { isDown = false; track.classList.remove('dragging'); });
  track.addEventListener('mouseup',    () => { isDown = false; track.classList.remove('dragging'); });
  track.addEventListener('mousemove',  e => {
    if (!isDown) return; e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    track.scrollLeft = scrollLeft - (x - startX) * 1.2;
  });

  // Auto-scroll toutes les 4s (pause si hover)
  let autoTimer, paused = false;
  function nextSlide() {
    if (paused) return;
    const cardW = track.querySelector('[style*="min-width"]')?.offsetWidth || 320;
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (track.scrollLeft + cardW + 10 >= maxScroll) track.scrollTo({ left: 0, behavior: 'smooth' });
    else track.scrollBy({ left: cardW + 20, behavior: 'smooth' });
    updateDots();
  }
  autoTimer = setInterval(nextSlide, 4000);
  track.addEventListener('mouseenter', () => { paused = true; });
  track.addEventListener('mouseleave', () => { paused = false; });
  track.addEventListener('touchstart', () => { paused = true; }, { passive: true });
  track.addEventListener('touchend',   () => { setTimeout(() => { paused = false; }, 2000); }, { passive: true });

  // Dots
  function updateDots() {
    const dots = document.querySelectorAll('.dot-btn');
    if (!dots.length) return;
    const cardW = track.querySelector('[style*="min-width"]')?.offsetWidth || 320;
    const idx = Math.round(track.scrollLeft / (cardW + 20));
    dots.forEach(function(d, i) {
      d.style.background = i === idx ? '#791E15' : 'rgba(255,255,255,0.2)';
    });
  }
  track.addEventListener('scroll', updateDots, { passive: true });
})();

// Fonction globale pour les dots
function scrollToTestimonial(idx) {
  const track = document.getElementById('testimonials-track');
  if (!track) return;
  const cardW = track.querySelector('[style*="min-width"]')?.offsetWidth || 320;
  track.scrollTo({ left: idx * (cardW + 20), behavior: 'smooth' });
}
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
