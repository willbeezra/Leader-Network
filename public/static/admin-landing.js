// ============================================================
// LEADER Admin — Landing Page Manager
// Gestion complète de la landing page depuis l'admin
// ============================================================

// ── Page principale admin landing ─────────────────────────────
async function adminLandingPage(el) {
  el.innerHTML = '<div class="flex justify-center py-16"><div class="loader"></div></div>'
  try {
    const data = await apiAdmin('GET', '/landing/data')
    const { cfg, services, testimonials, sections } = data.data

    el.innerHTML = `
    <div class="space-y-6">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 class="text-xl font-bold text-white">Landing Page LEADER</h2>
          <p class="text-gray-400 text-sm mt-0.5">Gérez l'apparence et le contenu de la page publique <code class="text-gold-400">/</code></p>
        </div>
        <div class="flex gap-3">
          <a href="/" target="_blank" class="flex items-center gap-2 px-4 py-2.5 bg-dark-700 border border-dark-500 text-gray-300 rounded-xl text-sm hover:border-gold-500/40 transition">
            <i class="fas fa-external-link-alt text-gold-400"></i> Voir la landing
          </a>
          <button onclick="adminLandingPage(document.getElementById('admin-page-content'))"
            class="flex items-center gap-2 px-4 py-2.5 bg-dark-700 border border-dark-500 text-gray-300 rounded-xl text-sm hover:border-gold-500/40 transition">
            <i class="fas fa-sync text-blue-400"></i> Actualiser
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 bg-dark-800 rounded-xl p-1 border border-dark-600 overflow-x-auto">
        ${[
          { id: 'config',       icon: 'fa-sliders-h',     label: 'Textes & Config' },
          { id: 'services',     icon: 'fa-th-large',      label: 'Services' },
          { id: 'testimonials', icon: 'fa-quote-left',    label: 'Témoignages' },
          { id: 'sections',     icon: 'fa-layer-group',   label: 'Sections' },
        ].map(t => `
        <button onclick="landingShowTab('${t.id}')"
          id="landing-tab-${t.id}"
          class="landing-tab flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
            ${t.id === 'config' ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' : 'text-gray-400 hover:text-gray-200'}">
          <i class="fas ${t.icon} text-xs"></i>${t.label}
        </button>`).join('')}
      </div>

      <!-- Tab content -->
      <div id="landing-tab-content">
        ${buildLandingConfigTab(cfg)}
      </div>
    </div>`

    // Stocker les données globalement pour les autres tabs
    window._landingData = { cfg, services, testimonials, sections }

  } catch (e) {
    if (!e._accessDenied) el.innerHTML = `<div class="text-red-400 p-4">Erreur: ${e.error || e.message}</div>`
  }
}

// ── Tab switcher ───────────────────────────────────────────────
function landingShowTab(tab) {
  document.querySelectorAll('.landing-tab').forEach(btn => {
    const isActive = btn.id === `landing-tab-${tab}`
    btn.className = `landing-tab flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
      isActive ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' : 'text-gray-400 hover:text-gray-200'
    }`
  })
  const content = document.getElementById('landing-tab-content')
  if (!content || !window._landingData) return
  const { cfg, services, testimonials, sections } = window._landingData
  switch (tab) {
    case 'config':       content.innerHTML = buildLandingConfigTab(cfg); break
    case 'services':     content.innerHTML = buildLandingServicesTab(services); break
    case 'testimonials': content.innerHTML = buildLandingTestimonialsTab(testimonials); break
    case 'sections':     content.innerHTML = buildLandingSectionsTab(sections); break
  }
}

// ── Tab Config ─────────────────────────────────────────────────
function buildLandingConfigTab(cfg) {
  const field = (key, label, type = 'text', placeholder = '') => `
  <div class="space-y-1.5">
    <label class="text-xs text-gray-400 font-medium uppercase tracking-wide">${label}</label>
    ${type === 'textarea'
      ? `<textarea id="lc-${key}" rows="3" class="form-input w-full text-sm resize-none" placeholder="${placeholder}">${cfg[key] || ''}</textarea>`
      : `<input id="lc-${key}" type="${type}" value="${(cfg[key] || '').replace(/"/g, '&quot;')}" placeholder="${placeholder}" class="form-input w-full text-sm">`
    }
  </div>`

  return `
  <div class="space-y-6">

    <!-- Hero -->
    <div class="bg-dark-800 rounded-2xl border border-dark-600 p-6">
      <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
        <i class="fas fa-star text-gold-400 text-sm"></i> Section Hero
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${field('hero_title', 'Slogan principal (3 mots séparés par .)', 'text', 'Révéler. Prospérer. Inspirer.')}
        ${field('hero_subtitle', 'Sous-titre', 'textarea', '')}
        ${field('hero_cta_label', 'Bouton principal — texte', 'text', 'Accéder à mon espace')}
        ${field('hero_cta_url', 'Bouton principal — URL', 'text', '/login')}
        ${field('hero_cta2_label', 'Bouton secondaire — texte', 'text', 'Découvrir les services')}
        ${field('hero_cta2_url', 'Bouton secondaire — URL', 'text', '#services')}
      </div>
    </div>

    <!-- Stats -->
    <div class="bg-dark-800 rounded-2xl border border-dark-600 p-6">
      <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
        <i class="fas fa-chart-bar text-blue-400 text-sm"></i> Statistiques
      </h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        ${field('stats_members', 'Membres', 'text', '12 000+')}
        ${field('stats_members_label', 'Libellé membres', 'text', 'Membres actifs')}
        ${field('stats_countries', 'Pays', 'text', '47')}
        ${field('stats_countries_label', 'Libellé pays', 'text', 'Pays')}
        ${field('stats_services', 'Services', 'text', '14')}
        ${field('stats_services_label', 'Libellé services', 'text', 'Services')}
        ${field('stats_years', 'Années', 'text', '5+')}
        ${field('stats_years_label', "Libellé années", 'text', "Années d'excellence")}
      </div>
    </div>

    <!-- About -->
    <div class="bg-dark-800 rounded-2xl border border-dark-600 p-6">
      <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
        <i class="fas fa-info-circle text-purple-400 text-sm"></i> Section À propos
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${field('about_title', 'Titre', 'text', '')}
        ${field('about_text', 'Texte', 'textarea', '')}
      </div>
    </div>

    <!-- Services section -->
    <div class="bg-dark-800 rounded-2xl border border-dark-600 p-6">
      <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
        <i class="fas fa-th-large text-green-400 text-sm"></i> Section Services
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${field('services_title', 'Titre', 'text', 'Nos Services')}
        ${field('services_subtitle', 'Sous-titre', 'text', '')}
      </div>
    </div>

    <!-- Testimonials section -->
    <div class="bg-dark-800 rounded-2xl border border-dark-600 p-6">
      <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
        <i class="fas fa-quote-left text-yellow-400 text-sm"></i> Section Témoignages
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${field('testimonials_title', 'Titre', 'text', 'Ils ont transformé leur vie')}
        ${field('testimonials_subtitle', 'Sous-titre', 'text', '')}
      </div>
    </div>

    <!-- CTA final -->
    <div class="bg-dark-800 rounded-2xl border border-dark-600 p-6">
      <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
        <i class="fas fa-rocket text-orange-400 text-sm"></i> CTA Final
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${field('cta_final_title', 'Titre', 'text', '')}
        ${field('cta_final_subtitle', 'Sous-titre', 'text', '')}
        ${field('cta_final_label', 'Bouton — texte', 'text', 'Rejoindre LEADER')}
        ${field('cta_final_url', 'Bouton — URL', 'text', '/register')}
      </div>
    </div>

    <!-- SEO / Footer -->
    <div class="bg-dark-800 rounded-2xl border border-dark-600 p-6">
      <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
        <i class="fas fa-search text-cyan-400 text-sm"></i> SEO & Footer
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${field('meta_title', 'Meta title', 'text', 'LEADER — Révéler. Prospérer. Inspirer.')}
        ${field('meta_description', 'Meta description', 'textarea', '')}
        ${field('footer_tagline', 'Tagline footer', 'text', 'Révéler. Prospérer. Inspirer.')}
      </div>
    </div>

    <!-- Bouton save -->
    <div class="flex justify-end">
      <button id="btn-save-landing-config"
        onclick="saveLandingConfig(this)"
        class="bg-gold-500 text-dark-900 font-bold px-8 py-3 rounded-xl hover:bg-gold-400 transition flex items-center gap-2">
        <i class="fas fa-save"></i> Sauvegarder toute la configuration
      </button>
    </div>
  </div>`
}

async function saveLandingConfig(btn) {
  const restore = btnSaving(btn)
  const keys = [
    'hero_title','hero_subtitle','hero_cta_label','hero_cta_url','hero_cta2_label','hero_cta2_url',
    'stats_members','stats_members_label','stats_countries','stats_countries_label',
    'stats_services','stats_services_label','stats_years','stats_years_label',
    'about_title','about_text',
    'services_title','services_subtitle',
    'testimonials_title','testimonials_subtitle',
    'cta_final_title','cta_final_subtitle','cta_final_label','cta_final_url',
    'meta_title','meta_description','footer_tagline'
  ]
  const payload = {}
  keys.forEach(k => {
    const el = document.getElementById(`lc-${k}`)
    if (el) payload[k] = el.value
  })
  try {
    await apiAdmin('POST', '/landing/config', payload)
    if (window._landingData) window._landingData.cfg = { ...window._landingData.cfg, ...payload }
    btnSaved(btn)
    showToast('Configuration sauvegardée !', 'success')
  } catch (e) {
    restore()
    showToast(e.error || 'Erreur', 'error')
  }
}

// ── Tab Services ───────────────────────────────────────────────
function buildLandingServicesTab(services) {
  const statusBadgeLocal = (s) => ({
    active: '<span class="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">Actif</span>',
    coming_soon: '<span class="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full">Bientôt</span>',
    inactive: '<span class="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">Inactif</span>',
  })[s] || s

  return `
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <p class="text-gray-400 text-sm">${services.length} service(s) au total</p>
      <button onclick="showServiceModal(null)"
        class="bg-gold-500 text-dark-900 font-bold px-4 py-2.5 rounded-xl hover:bg-gold-400 transition text-sm flex items-center gap-2">
        <i class="fas fa-plus"></i> Nouveau service
      </button>
    </div>

    <div class="bg-dark-800 rounded-2xl border border-dark-600 overflow-hidden">
      <table class="data-table w-full">
        <thead>
          <tr>
            <th class="w-8">#</th>
            <th>Service</th>
            <th>Logo</th>
            <th>URL / API</th>
            <th>Statut</th>
            <th>Catégorie</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${services.map(s => `
          <tr>
            <td class="text-gray-500 text-xs">${s.display_order}</td>
            <td>
              <div class="font-medium text-white">${s.name}</div>
              <div class="text-gray-500 text-xs font-mono">/s/${s.slug}</div>
            </td>
            <td>
              ${(s.logo_url || s.logo_data_uri)
                ? `<img src="${s.logo_data_uri || s.logo_url}" alt="${s.name}" class="w-10 h-10 object-contain rounded-lg bg-white/5 p-1">`
                : '<span class="text-gray-600 text-xs">—</span>'
              }
            </td>
            <td>
              ${s.url
                ? `<a href="${s.url}" target="_blank" class="text-blue-400 text-xs hover:underline truncate max-w-[180px] block">${s.url}</a>`
                : '<span class="text-gray-600 text-xs">—</span>'
              }
              ${s.api_url
                ? `<span class="text-purple-400 text-xs flex items-center gap-1 mt-0.5"><i class="fas fa-plug text-[10px]"></i>${s.api_url.replace(/^https?:\/\//, '').substring(0, 30)}…</span>`
                : ''
              }
            </td>
            <td>${statusBadgeLocal(s.status)}</td>
            <td><span class="text-gray-400 text-xs">${s.category}</span></td>
            <td>
              <div class="flex gap-1.5">
                <button onclick="showServiceModal(${JSON.stringify(s).replace(/"/g, '&quot;')})"
                  class="text-gold-400 hover:text-gold-300 text-xs px-2 py-1 rounded bg-gold-900/20 hover:bg-gold-900/30 transition">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteService(${s.id}, '${s.name}')"
                  class="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-900/20 hover:bg-red-900/30 transition">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`
}

function showServiceModal(service) {
  const isEdit = !!service
  showModal(`
  <div class="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
    <h3 class="text-lg font-bold text-white">${isEdit ? 'Modifier' : 'Nouveau'} service</h3>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <label class="text-xs text-gray-400 uppercase tracking-wide">Nom *</label>
        <input id="svc-name" type="text" value="${isEdit ? service.name.replace(/"/g,'&quot;') : ''}" class="form-input w-full" placeholder="Campus">
      </div>
      <div class="space-y-1.5">
        <label class="text-xs text-gray-400 uppercase tracking-wide">Slug * (ex: campus)</label>
        <input id="svc-slug" type="text" value="${isEdit ? service.slug : ''}" class="form-input w-full font-mono" placeholder="campus">
      </div>
      <div class="space-y-1.5 md:col-span-2">
        <label class="text-xs text-gray-400 uppercase tracking-wide">Description</label>
        <textarea id="svc-desc" rows="2" class="form-input w-full resize-none">${isEdit ? service.description : ''}</textarea>
      </div>
      <div class="space-y-1.5 md:col-span-2">
        <label class="text-xs text-gray-400 uppercase tracking-wide">URL du service</label>
        <input id="svc-url" type="url" value="${isEdit ? service.url : ''}" class="form-input w-full" placeholder="https://...">
      </div>
      <div class="space-y-1.5 md:col-span-2">
        <label class="text-xs text-gray-400 uppercase tracking-wide">URL du logo (image externe)</label>
        <input id="svc-logo-url" type="url" value="${isEdit ? service.logo_url : ''}" class="form-input w-full" placeholder="https://...">
      </div>
      <div class="space-y-1.5 md:col-span-2">
        <label class="text-xs text-gray-400 uppercase tracking-wide">Logo — Upload (remplace l'URL)</label>
        <div class="flex items-center gap-3">
          <input type="file" id="svc-logo-file" accept="image/*" onchange="previewServiceLogo(this)" class="hidden">
          <label for="svc-logo-file" class="cursor-pointer px-4 py-2 bg-dark-700 border border-dark-500 rounded-xl text-sm text-gray-300 hover:border-gold-500/40 transition">
            <i class="fas fa-upload mr-2"></i>Choisir un logo
          </label>
          <div id="svc-logo-preview" class="w-14 h-14 rounded-xl bg-dark-700 border border-dark-600 flex items-center justify-center overflow-hidden">
            ${isEdit && (service.logo_data_uri || service.logo_url)
              ? `<img src="${service.logo_data_uri || service.logo_url}" class="w-full h-full object-contain p-1">`
              : '<i class="fas fa-image text-gray-600"></i>'
            }
          </div>
        </div>
        <input type="hidden" id="svc-logo-data" value="${isEdit ? (service.logo_data_uri || '') : ''}">
      </div>
      <div class="space-y-1.5">
        <label class="text-xs text-gray-400 uppercase tracking-wide">Statut</label>
        <select id="svc-status" class="form-input w-full">
          <option value="active"      ${(!isEdit || service.status === 'active') ? 'selected' : ''}>Actif</option>
          <option value="coming_soon" ${isEdit && service.status === 'coming_soon' ? 'selected' : ''}>Bientôt</option>
          <option value="inactive"    ${isEdit && service.status === 'inactive' ? 'selected' : ''}>Inactif</option>
        </select>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs text-gray-400 uppercase tracking-wide">Catégorie</label>
        <input id="svc-category" type="text" value="${isEdit ? service.category : ''}" class="form-input w-full" placeholder="formation, finance, coaching...">
      </div>
      <div class="space-y-1.5">
        <label class="text-xs text-gray-400 uppercase tracking-wide">Ordre d'affichage</label>
        <input id="svc-order" type="number" value="${isEdit ? service.display_order : 99}" class="form-input w-full">
      </div>
      <div class="space-y-1.5">
        <label class="text-xs text-gray-400 uppercase tracking-wide">Couleur de fond (hex)</label>
        <input id="svc-bgcolor" type="text" value="${isEdit ? service.bg_color : '#1A1A26'}" class="form-input w-full font-mono" placeholder="#1A1A26">
      </div>
    </div>

    <!-- Section API -->
    <div class="bg-dark-900 border border-purple-500/20 rounded-xl p-4 space-y-3">
      <h4 class="text-sm font-semibold text-purple-300 flex items-center gap-2">
        <i class="fas fa-plug text-purple-400 text-xs"></i>
        Connexion API (optionnel)
      </h4>
      <p class="text-xs text-gray-500">Configure la connexion API de ce service. Laissez vide si non applicable.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="space-y-1.5 md:col-span-2">
          <label class="text-xs text-gray-400 uppercase tracking-wide">URL de base de l'API</label>
          <input id="svc-api-url" type="url" value="${isEdit ? (service.api_url || '') : ''}" class="form-input w-full font-mono text-sm" placeholder="https://api.monservice.com">
        </div>
        <div class="space-y-1.5">
          <label class="text-xs text-gray-400 uppercase tracking-wide">Clé / Token API</label>
          <input id="svc-api-key" type="password" value="${isEdit ? (service.api_key || '') : ''}" class="form-input w-full font-mono text-sm" placeholder="sk-... ou token..." autocomplete="off">
        </div>
        <div class="space-y-1.5">
          <label class="text-xs text-gray-400 uppercase tracking-wide">Config JSON (paramètres avancés)</label>
          <input id="svc-api-config" type="text" value="${isEdit ? (service.api_config || '') : ''}" class="form-input w-full font-mono text-sm" placeholder='{"plan_id":"...","webhook_secret":"..."}'>
        </div>
      </div>
    </div>

    <div class="flex justify-end gap-3 pt-2">
      <button onclick="closeModal()" class="px-5 py-2.5 bg-dark-700 border border-dark-500 text-gray-300 rounded-xl text-sm hover:bg-dark-600 transition">
        Annuler
      </button>
      <button id="btn-save-service" onclick="saveService(${isEdit ? service.id : 'null'}, this)"
        class="bg-gold-500 text-dark-900 font-bold px-6 py-2.5 rounded-xl hover:bg-gold-400 transition text-sm flex items-center gap-2">
        <i class="fas fa-save"></i> ${isEdit ? 'Modifier' : 'Créer'}
      </button>
    </div>
  </div>`)
}

function previewServiceLogo(input) {
  const file = input.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUri = e.target.result
    document.getElementById('svc-logo-data').value = dataUri
    const prev = document.getElementById('svc-logo-preview')
    prev.innerHTML = `<img src="${dataUri}" class="w-full h-full object-contain p-1">`
  }
  reader.readAsDataURL(file)
}

async function saveService(id, btn) {
  const restore = btnSaving(btn)
  const payload = {
    name:          document.getElementById('svc-name').value.trim(),
    slug:          document.getElementById('svc-slug').value.trim(),
    description:   document.getElementById('svc-desc').value.trim(),
    url:           document.getElementById('svc-url').value.trim(),
    logo_url:      document.getElementById('svc-logo-url').value.trim(),
    logo_data_uri: document.getElementById('svc-logo-data').value,
    status:        document.getElementById('svc-status').value,
    category:      document.getElementById('svc-category').value.trim(),
    display_order: parseInt(document.getElementById('svc-order').value) || 0,
    bg_color:      document.getElementById('svc-bgcolor').value.trim(),
    text_color:    '#FFFFFF',
    api_url:       document.getElementById('svc-api-url').value.trim() || null,
    api_key:       document.getElementById('svc-api-key').value.trim() || null,
    api_config:    document.getElementById('svc-api-config').value.trim() || null,
  }
  if (!payload.name || !payload.slug) { restore(); return showToast('Nom et slug requis', 'error') }
  try {
    if (id) {
      await apiAdmin('PUT', `/landing/services/${id}`, payload)
    } else {
      await apiAdmin('POST', '/landing/services', payload)
    }
    closeModal()
    showToast(id ? 'Service modifié !' : 'Service créé !', 'success')
    const data = await apiAdmin('GET', '/landing/data')
    window._landingData = data.data
    landingShowTab('services')
  } catch (e) {
    restore()
    showToast(e.error || 'Erreur', 'error')
  }
}

async function deleteService(id, name) {
  if (!confirm(`Supprimer le service "${name}" ?`)) return
  try {
    await apiAdmin('DELETE', `/landing/services/${id}`)
    showToast('Service supprimé', 'success')
    const data = await apiAdmin('GET', '/landing/data')
    window._landingData = data.data
    landingShowTab('services')
  } catch (e) {
    showToast(e.error || 'Erreur', 'error')
  }
}

// ── Tab Témoignages ────────────────────────────────────────────
function buildLandingTestimonialsTab(testimonials) {
  return `
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <p class="text-gray-400 text-sm">${testimonials.length} témoignage(s)</p>
      <button onclick="showTestimonialModal(null)"
        class="bg-gold-500 text-dark-900 font-bold px-4 py-2.5 rounded-xl hover:bg-gold-400 transition text-sm flex items-center gap-2">
        <i class="fas fa-plus"></i> Nouveau témoignage
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${testimonials.map(t => `
      <div class="bg-dark-800 rounded-2xl border border-dark-600 p-5 space-y-3">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            ${t.author_photo
              ? `<img src="${t.author_photo}" class="w-10 h-10 rounded-full object-cover border border-dark-500">`
              : `<div class="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold">${t.author_name.charAt(0)}</div>`
            }
            <div>
              <div class="text-white font-semibold text-sm">${t.author_name}</div>
              <div class="text-gray-500 text-xs">${t.author_role}${t.author_country ? ' · ' + t.author_country : ''}</div>
            </div>
          </div>
          <div class="flex gap-1">
            <span class="${t.is_featured ? 'bg-gold-500/20 text-gold-400' : 'bg-gray-700 text-gray-500'} text-xs px-1.5 py-0.5 rounded">
              ${t.is_featured ? 'Mis en avant' : 'Standard'}
            </span>
          </div>
        </div>
        <div class="flex gap-0.5">
          ${'*'.repeat(t.rating)}<span class="text-gray-600">${'*'.repeat(5 - t.rating)}</span>
        </div>
        ${t.transformation ? `<div class="text-gold-400 text-xs font-semibold bg-gold-500/10 rounded-full px-2 py-0.5 inline-block"> ${t.transformation}</div>` : ''}
        <p class="text-gray-400 text-xs line-clamp-3 italic">"${t.content}"</p>
        <div class="flex gap-1.5 pt-1 border-t border-dark-600">
          <button onclick="showTestimonialModal(${JSON.stringify(t).replace(/"/g, '&quot;')})"
            class="text-gold-400 text-xs px-2 py-1 rounded bg-gold-900/20 hover:bg-gold-900/30 transition flex items-center gap-1">
            <i class="fas fa-edit"></i> Modifier
          </button>
          <button onclick="deleteTestimonial(${t.id}, '${t.author_name}')"
            class="text-red-400 text-xs px-2 py-1 rounded bg-red-900/20 hover:bg-red-900/30 transition flex items-center gap-1">
            <i class="fas fa-trash"></i>
          </button>
          <button onclick="toggleTestimonialFeatured(${t.id}, ${t.is_featured ? 0 : 1})"
            class="text-${t.is_featured ? 'gray' : 'yellow'}-400 text-xs px-2 py-1 rounded bg-${t.is_featured ? 'gray' : 'yellow'}-900/20 hover:opacity-80 transition ml-auto flex items-center gap-1">
            <i class="fas fa-star"></i> ${t.is_featured ? 'Retirer' : 'Mettre en avant'}
          </button>
        </div>
      </div>`).join('') || '<p class="text-gray-500 col-span-3 text-center py-8">Aucun témoignage</p>'}
    </div>
  </div>`
}

function showTestimonialModal(t) {
  const isEdit = !!t
  showModal(`
  <div class="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
    <h3 class="text-lg font-bold text-white">${isEdit ? 'Modifier' : 'Nouveau'} témoignage</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <label class="text-xs text-gray-400 uppercase tracking-wide">Nom *</label>
        <input id="tm-name" type="text" value="${isEdit ? t.author_name.replace(/"/g,'&quot;') : ''}" class="form-input w-full">
      </div>
      <div class="space-y-1.5">
        <label class="text-xs text-gray-400 uppercase tracking-wide">Rôle</label>
        <input id="tm-role" type="text" value="${isEdit ? t.author_role : ''}" class="form-input w-full" placeholder="Coach, Entrepreneur...">
      </div>
      <div class="space-y-1.5">
        <label class="text-xs text-gray-400 uppercase tracking-wide">Pays</label>
        <input id="tm-country" type="text" value="${isEdit ? t.author_country : ''}" class="form-input w-full" placeholder="France">
      </div>
      <div class="space-y-1.5">
        <label class="text-xs text-gray-400 uppercase tracking-wide">Note (1-5)</label>
        <select id="tm-rating" class="form-input w-full">
          ${[5,4,3,2,1].map(n => `<option value="${n}" ${isEdit && t.rating === n ? 'selected' : ''}>${'*'.repeat(n)} (${n}/5)</option>`).join('')}
        </select>
      </div>
      <div class="space-y-1.5 md:col-span-2">
        <label class="text-xs text-gray-400 uppercase tracking-wide">Témoignage *</label>
        <textarea id="tm-content" rows="4" class="form-input w-full resize-none">${isEdit ? t.content : ''}</textarea>
      </div>
      <div class="space-y-1.5 md:col-span-2">
        <label class="text-xs text-gray-400 uppercase tracking-wide">Transformation (ex: "Revenus ×3 en 6 mois")</label>
        <input id="tm-transformation" type="text" value="${isEdit ? t.transformation : ''}" class="form-input w-full" placeholder="Revenus ×3 en 6 mois">
      </div>
      <div class="space-y-1.5">
        <label class="text-xs text-gray-400 uppercase tracking-wide">URL photo (optionnel)</label>
        <input id="tm-photo" type="url" value="${isEdit ? t.author_photo : ''}" class="form-input w-full">
      </div>
      <div class="space-y-1.5">
        <label class="text-xs text-gray-400 uppercase tracking-wide">Ordre d'affichage</label>
        <input id="tm-order" type="number" value="${isEdit ? t.display_order : 99}" class="form-input w-full">
      </div>
      <div class="space-y-1.5">
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" id="tm-featured" ${isEdit && t.is_featured ? 'checked' : ''} class="w-4 h-4 accent-yellow-400">
          <span class="text-sm text-gray-300">Mettre en avant (affiché sur la landing)</span>
        </label>
      </div>
      <div class="space-y-1.5">
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" id="tm-active" ${!isEdit || t.is_active ? 'checked' : ''} class="w-4 h-4 accent-green-400">
          <span class="text-sm text-gray-300">Actif</span>
        </label>
      </div>
    </div>
    <div class="flex justify-end gap-3 pt-2">
      <button onclick="closeModal()" class="px-5 py-2.5 bg-dark-700 border border-dark-500 text-gray-300 rounded-xl text-sm">Annuler</button>
      <button id="btn-save-tm" onclick="saveTestimonial(${isEdit ? t.id : 'null'}, this)"
        class="bg-gold-500 text-dark-900 font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2">
        <i class="fas fa-save"></i> ${isEdit ? 'Modifier' : 'Créer'}
      </button>
    </div>
  </div>`)
}

async function saveTestimonial(id, btn) {
  const restore = btnSaving(btn)
  const payload = {
    author_name:    document.getElementById('tm-name').value.trim(),
    author_role:    document.getElementById('tm-role').value.trim(),
    author_country: document.getElementById('tm-country').value.trim(),
    author_photo:   document.getElementById('tm-photo').value.trim(),
    content:        document.getElementById('tm-content').value.trim(),
    rating:         parseInt(document.getElementById('tm-rating').value),
    transformation: document.getElementById('tm-transformation').value.trim(),
    is_featured:    document.getElementById('tm-featured').checked ? 1 : 0,
    is_active:      document.getElementById('tm-active').checked ? 1 : 0,
    display_order:  parseInt(document.getElementById('tm-order').value) || 0,
  }
  if (!payload.author_name || !payload.content) { restore(); return showToast('Nom et contenu requis', 'error') }
  try {
    if (id) { await apiAdmin('PUT', `/landing/testimonials/${id}`, payload) }
    else     { await apiAdmin('POST', '/landing/testimonials', payload) }
    closeModal()
    showToast(id ? 'Témoignage modifié !' : 'Témoignage créé !', 'success')
    const data = await apiAdmin('GET', '/landing/data')
    window._landingData = data.data
    landingShowTab('testimonials')
  } catch (e) { restore(); showToast(e.error || 'Erreur', 'error') }
}

async function toggleTestimonialFeatured(id, val) {
  try {
    await apiAdmin('PUT', `/landing/testimonials/${id}`, { is_featured: val })
    showToast(val ? 'Mis en avant !' : 'Retiré des mis en avant', 'success')
    const data = await apiAdmin('GET', '/landing/data')
    window._landingData = data.data
    landingShowTab('testimonials')
  } catch (e) { showToast(e.error || 'Erreur', 'error') }
}

async function deleteTestimonial(id, name) {
  if (!confirm(`Supprimer le témoignage de "${name}" ?`)) return
  try {
    await apiAdmin('DELETE', `/landing/testimonials/${id}`)
    showToast('Témoignage supprimé', 'success')
    const data = await apiAdmin('GET', '/landing/data')
    window._landingData = data.data
    landingShowTab('testimonials')
  } catch (e) { showToast(e.error || 'Erreur', 'error') }
}

// ── Tab Sections ───────────────────────────────────────────────
function buildLandingSectionsTab(sections) {
  return `
  <div class="space-y-4">
    <p class="text-gray-400 text-sm">Activez ou désactivez les sections de la landing page.</p>
    <div class="bg-dark-800 rounded-2xl border border-dark-600 divide-y divide-dark-600">
      ${sections.map(s => `
      <div class="flex items-center justify-between px-6 py-4 gap-4">
        <div class="flex items-center gap-3">
          <span class="text-gray-400 text-sm font-mono w-6">${s.display_order}</span>
          <div>
            <div class="text-white font-medium text-sm">${s.label}</div>
            <div class="text-gray-600 text-xs font-mono">${s.section_key}</div>
          </div>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" ${s.is_active ? 'checked' : ''}
            onchange="toggleSection('${s.section_key}', this.checked, ${s.display_order})"
            class="sr-only peer">
          <div class="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer
            peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px]
            after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
            peer-checked:bg-gold-500"></div>
        </label>
      </div>`).join('')}
    </div>
  </div>`
}

async function toggleSection(key, active, order) {
  try {
    await apiAdmin('PUT', `/landing/sections/${key}`, { is_active: active ? 1 : 0, display_order: order })
    showToast(`Section "${key}" ${active ? 'activée' : 'désactivée'}`, 'success')
    if (window._landingData) {
      window._landingData.sections = window._landingData.sections.map(s =>
        s.section_key === key ? { ...s, is_active: active ? 1 : 0 } : s
      )
    }
  } catch (e) { showToast(e.error || 'Erreur', 'error') }
}
