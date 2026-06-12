// ══════════════════════════════════════════════════════════════════════════
// COMPOSANT UPLOAD UNIVERSEL — UploadZone
// Drag-and-drop + Browse + URL manuelle + Preview + Progression simulée
// Usage :
//   createUploadZone({ containerId, accept, purpose, onUrl, apiPrefix })
// ══════════════════════════════════════════════════════════════════════════

/**
 * @param {Object} opts
 * @param {string}   opts.containerId  - id du <div> où injecter la zone
 * @param {string}   [opts.accept]     - types MIME acceptés ('image/*,application/pdf' etc.)
 * @param {string}   [opts.purpose]    - 'marketing'|'kyc'|'proof'|'other'
 * @param {Function} opts.onUrl        - callback(url, filename, size) appelé après upload réussi
 * @param {string}   [opts.apiPrefix]  - '/api/admin' ou '/api/members'
 * @param {string}   [opts.label]      - texte du titre (optionnel)
 * @param {boolean}  [opts.showUrlInput] - afficher l'onglet URL manuelle (défaut: true)
 * @param {Function} [opts.getToken]   - () => string  retourne le Bearer token à utiliser
 *                                       Si absent : fallback localStorage leader_admin_token / leader_member_token
 */
function createUploadZone(opts) {
  const {
    containerId,
    accept = '*/*',
    purpose = 'other',
    onUrl,
    apiPrefix = '/api/admin',
    label = 'Fichier ou document',
    showUrlInput = true,
    getToken = null,
  } = opts

  const container = document.getElementById(containerId)
  if (!container) return

  const uid = 'uz-' + Math.random().toString(36).substring(2, 8)

  container.innerHTML = `
  <div class="upload-zone-wrapper space-y-2">
    ${label ? `<label class="block text-sm font-medium text-gray-300 mb-1">${label}</label>` : ''}

    ${showUrlInput ? `
    <!-- Tabs -->
    <div class="flex gap-1 bg-dark-700 rounded-xl p-1 mb-2" id="${uid}-tabs">
      <button onclick="uzSwitchTab('${uid}','upload')"
        id="${uid}-tab-upload"
        class="flex-1 text-xs py-1.5 px-2 rounded-lg font-medium transition uz-tab uz-tab-active">
        <i class="fas fa-cloud-upload-alt mr-1"></i>Upload
      </button>
      <button onclick="uzSwitchTab('${uid}','url')"
        id="${uid}-tab-url"
        class="flex-1 text-xs py-1.5 px-2 rounded-lg font-medium transition uz-tab">
        <i class="fas fa-link mr-1"></i>URL directe
      </button>
    </div>` : ''}

    <!-- Zone Drag & Drop -->
    <div id="${uid}-panel-upload">
      <div id="${uid}-dropzone"
        class="relative border-2 border-dashed border-dark-500 rounded-2xl p-6 text-center transition-all duration-200 cursor-pointer
               hover:border-gold-500/60 hover:bg-gold-500/5 group"
        onclick="document.getElementById('${uid}-file-input').click()"
        ondragover="uzDragOver(event,'${uid}')"
        ondragleave="uzDragLeave(event,'${uid}')"
        ondrop="uzDrop(event,'${uid}')">

        <!-- Icône centrale -->
        <div class="w-14 h-14 rounded-2xl bg-dark-600 border border-dark-500 flex items-center justify-center mx-auto mb-3
                    group-hover:bg-gold-500/10 group-hover:border-gold-500/40 transition-all" id="${uid}-icon-wrap">
          <i class="fas fa-cloud-upload-alt text-2xl text-gray-500 group-hover:text-gold-400 transition-colors" id="${uid}-drop-icon"></i>
        </div>

        <p class="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors" id="${uid}-drop-title">
          Glissez-déposez votre fichier ici
        </p>
        <p class="text-xs text-gray-500 mt-1" id="${uid}-drop-sub">
          ou <span class="text-gold-400 underline">parcourir depuis votre appareil</span>
        </p>
        <p class="text-xs text-gray-600 mt-2" id="${uid}-drop-hint">
          ${accept !== '*/*' ? accept.replace(/\*/g,'').replace(/,/g,' · ').replace(/\//g,'') : 'Tous formats'} — Max 10 MB
        </p>

        <!-- Input cach\u00e9 (data-* utilis\u00e9s par uzDrop pour retrouver apiPrefix/purpose) -->
        <input type="file" id="${uid}-file-input" accept="${accept}" class="hidden"
          data-api-prefix="${apiPrefix}" data-purpose="${purpose}"
          onchange="uzFileSelected(event,'${uid}','${apiPrefix}','${purpose}')">
      </div>

      <!-- Barre de progression -->
      <div id="${uid}-progress" class="hidden mt-3">
        <div class="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span id="${uid}-progress-name" class="truncate max-w-[70%]">upload.pdf</span>
          <span id="${uid}-progress-pct">0%</span>
        </div>
        <div class="h-2 bg-dark-600 rounded-full overflow-hidden">
          <div id="${uid}-progress-bar" class="h-full bg-gradient-to-r from-gold-500 to-yellow-400 rounded-full transition-all duration-300" style="width:0%"></div>
        </div>
      </div>

      <!-- Aperçu fichier uploadé -->
      <div id="${uid}-preview" class="hidden mt-3 bg-dark-700 border border-dark-500 rounded-xl p-3 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" id="${uid}-preview-icon-wrap">
          <i class="fas fa-file text-gray-400 text-xl" id="${uid}-preview-icon"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-white truncate" id="${uid}-preview-name">fichier.pdf</div>
          <div class="text-xs text-gray-500" id="${uid}-preview-size"></div>
          <div class="text-xs text-green-400 mt-0.5"><i class="fas fa-check-circle mr-1"></i>Uploadé avec succès</div>
        </div>
        <button onclick="uzReset('${uid}')" class="text-gray-500 hover:text-red-400 transition ml-auto flex-shrink-0">
          <i class="fas fa-times-circle text-lg"></i>
        </button>
      </div>

      <!-- Erreur -->
      <div id="${uid}-error" class="hidden mt-2 text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
        <i class="fas fa-exclamation-triangle mr-1"></i><span id="${uid}-error-msg"></span>
      </div>
    </div>

    ${showUrlInput ? `
    <!-- Panel URL directe -->
    <div id="${uid}-panel-url" class="hidden space-y-2">
      <div class="relative">
        <i class="fas fa-link absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
        <input type="url" id="${uid}-url-input"
          placeholder="https://drive.google.com/... ou tout lien public"
          class="form-input pl-9"
          oninput="uzUrlInput(event,'${uid}')">
      </div>
      <p class="text-xs text-gray-500">Copiez un lien Google Drive, Dropbox, Imgur ou tout hébergeur public.</p>
      <div id="${uid}-url-preview" class="hidden bg-dark-700 border border-dark-500 rounded-xl p-3 flex items-center gap-3 text-sm">
        <i class="fas fa-external-link-alt text-blue-400"></i>
        <span class="truncate text-gray-300" id="${uid}-url-label"></span>
        <button onclick="uzUrlClear('${uid}')" class="ml-auto text-gray-500 hover:text-red-400 transition">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>` : ''}

    <!-- Champ caché stockant l'URL résultante -->
    <input type="hidden" id="${uid}-result-url">
  </div>`

  // Stocker les callbacks dans un registre global
  if (!window._uzCallbacks) window._uzCallbacks = {}
  window._uzCallbacks[uid] = onUrl

  // Stocker le getter de token dans un registre dédié
  if (!window._uzTokenGetters) window._uzTokenGetters = {}
  if (getToken) {
    window._uzTokenGetters[uid] = getToken
  }

  // Retourner l'uid pour accéder à la valeur résultante
  return uid
}

/** Récupérer l'URL résultante d'une zone */
function uzGetUrl(uid) {
  return document.getElementById(uid + '-result-url')?.value || ''
}

/** Changer d'onglet */
function uzSwitchTab(uid, tab) {
  const uploadPanel = document.getElementById(uid + '-panel-upload')
  const urlPanel    = document.getElementById(uid + '-panel-url')
  const tabUpload   = document.getElementById(uid + '-tab-upload')
  const tabUrl      = document.getElementById(uid + '-tab-url')
  if (tab === 'upload') {
    uploadPanel?.classList.remove('hidden')
    urlPanel?.classList.add('hidden')
    tabUpload?.classList.add('uz-tab-active')
    tabUrl?.classList.remove('uz-tab-active')
  } else {
    uploadPanel?.classList.add('hidden')
    urlPanel?.classList.remove('hidden')
    tabUrl?.classList.add('uz-tab-active')
    tabUpload?.classList.remove('uz-tab-active')
  }
}

/** Drag over */
function uzDragOver(e, uid) {
  e.preventDefault()
  const dz = document.getElementById(uid + '-dropzone')
  if (dz) {
    dz.classList.add('border-gold-500', 'bg-gold-500/10', 'scale-[1.01]')
    dz.classList.remove('border-dark-500')
  }
}

/** Drag leave */
function uzDragLeave(e, uid) {
  const dz = document.getElementById(uid + '-dropzone')
  if (dz) {
    dz.classList.remove('border-gold-500', 'bg-gold-500/10', 'scale-[1.01]')
    dz.classList.add('border-dark-500')
  }
}

/** Drop */
function uzDrop(e, uid) {
  e.preventDefault()
  uzDragLeave(e, uid)
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    const inp = document.getElementById(uid + '-file-input')
    // dataset.apiPrefix = camelCase de data-api-prefix → "apiPrefix"
    uzUploadFile(file, uid,
      inp?.dataset?.apiPrefix || '/api/admin',
      inp?.dataset?.purpose   || 'other')
  }
}

/** Sélection via input */
function uzFileSelected(e, uid, apiPrefix, purpose) {
  const file = e.target?.files?.[0]
  if (file) uzUploadFile(file, uid, apiPrefix, purpose)
}

/** Upload effectif */
async function uzUploadFile(file, uid, apiPrefix, purpose) {
  // Vérification taille
  if (file.size > 10 * 1024 * 1024) {
    uzShowError(uid, 'Fichier trop volumineux (maximum 10 MB)')
    return
  }

  // Masquer erreur précédente, montrer progression
  document.getElementById(uid + '-error')?.classList.add('hidden')
  document.getElementById(uid + '-preview')?.classList.add('hidden')
  document.getElementById(uid + '-dropzone')?.classList.add('hidden')
  const progressEl = document.getElementById(uid + '-progress')
  progressEl?.classList.remove('hidden')

  const nameEl = document.getElementById(uid + '-progress-name')
  const pctEl  = document.getElementById(uid + '-progress-pct')
  const barEl  = document.getElementById(uid + '-progress-bar')
  if (nameEl) nameEl.textContent = file.name
  if (pctEl)  pctEl.textContent  = '0%'
  if (barEl)  barEl.style.width  = '0%'

  // Animation progression simulée
  let pct = 0
  const interval = setInterval(() => {
    pct = Math.min(pct + Math.random() * 15, 85)
    if (pctEl)  pctEl.textContent  = Math.round(pct) + '%'
    if (barEl)  barEl.style.width  = pct + '%'
  }, 120)

  try {
    // Lire en base64
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const b64 = btoa(binary)

    // Récupérer le token : priorité au getter enregistré, puis fallback localStorage
    const tokenGetter = window._uzTokenGetters?.[uid]
    const token = tokenGetter
      ? tokenGetter()
      : (localStorage.getItem('leader_admin_token') || localStorage.getItem('leader_member_token'))
    const res = await fetch(`${apiPrefix}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        purpose,
        data_b64: b64
      })
    })

    clearInterval(interval)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      uzShowError(uid, err.error || `Erreur ${res.status}`)
      document.getElementById(uid + '-dropzone')?.classList.remove('hidden')
      progressEl?.classList.add('hidden')
      return
    }

    const data = await res.json()

    // Progression à 100%
    if (pctEl)  pctEl.textContent  = '100%'
    if (barEl)  barEl.style.width  = '100%'
    barEl?.classList.add('bg-green-500')

    setTimeout(() => {
      progressEl?.classList.add('hidden')
      uzShowPreview(uid, file.name, data.size || '', data.mime_type || file.type)
    }, 400)

    // Stocker l'URL
    const resultEl = document.getElementById(uid + '-result-url')
    if (resultEl) resultEl.value = data.url

    // Callback
    if (window._uzCallbacks?.[uid]) {
      window._uzCallbacks[uid](data.url, file.name, data.size || '')
    }

  } catch (err) {
    clearInterval(interval)
    progressEl?.classList.add('hidden')
    document.getElementById(uid + '-dropzone')?.classList.remove('hidden')
    uzShowError(uid, err.message || 'Erreur réseau')
  }
}

/** Afficher l'aperçu après upload */
function uzShowPreview(uid, filename, size, mimeType) {
  const preview = document.getElementById(uid + '-preview')
  const iconWrap = document.getElementById(uid + '-preview-icon-wrap')
  const icon     = document.getElementById(uid + '-preview-icon')
  const nameEl   = document.getElementById(uid + '-preview-name')
  const sizeEl   = document.getElementById(uid + '-preview-size')

  const mimeMap = {
    'application/pdf': { icon: 'fa-file-pdf', bg: 'bg-red-500/20', text: 'text-red-400' },
    'image/':          { icon: 'fa-file-image', bg: 'bg-blue-500/20', text: 'text-blue-400' },
    'video/':          { icon: 'fa-file-video', bg: 'bg-purple-500/20', text: 'text-purple-400' },
    'text/':           { icon: 'fa-file-alt', bg: 'bg-green-500/20', text: 'text-green-400' },
  }
  let meta = { icon: 'fa-file', bg: 'bg-gray-500/20', text: 'text-gray-400' }
  for (const [k, v] of Object.entries(mimeMap)) {
    if (mimeType?.startsWith(k)) { meta = v; break }
  }

  if (iconWrap) iconWrap.className = `w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`
  if (icon)     icon.className     = `fas ${meta.icon} text-xl ${meta.text}`
  if (nameEl)   nameEl.textContent = filename
  if (sizeEl)   sizeEl.textContent = size
  preview?.classList.remove('hidden')
}

/** Afficher une erreur */
function uzShowError(uid, msg) {
  const errEl = document.getElementById(uid + '-error')
  const msgEl = document.getElementById(uid + '-error-msg')
  if (msgEl) msgEl.textContent = msg
  errEl?.classList.remove('hidden')
}

/** Réinitialiser */
function uzReset(uid) {
  document.getElementById(uid + '-preview')?.classList.add('hidden')
  document.getElementById(uid + '-dropzone')?.classList.remove('hidden')
  document.getElementById(uid + '-error')?.classList.add('hidden')
  document.getElementById(uid + '-progress')?.classList.add('hidden')
  const resultEl = document.getElementById(uid + '-result-url')
  if (resultEl) resultEl.value = ''
  const fileInput = document.getElementById(uid + '-file-input')
  if (fileInput) fileInput.value = ''
  const bar = document.getElementById(uid + '-progress-bar')
  if (bar) { bar.style.width = '0%'; bar.classList.remove('bg-green-500') }
  if (window._uzCallbacks?.[uid]) window._uzCallbacks[uid]('', '', '')
}

/** Saisie URL manuelle */
function uzUrlInput(e, uid) {
  const val = e.target?.value?.trim()
  const preview = document.getElementById(uid + '-url-preview')
  const label   = document.getElementById(uid + '-url-label')
  const resultEl = document.getElementById(uid + '-result-url')
  if (val && val.startsWith('http')) {
    preview?.classList.remove('hidden')
    if (label) label.textContent = val
    if (resultEl) resultEl.value = val
    if (window._uzCallbacks?.[uid]) {
      const filename = val.split('/').pop()?.split('?')[0] || 'document'
      window._uzCallbacks[uid](val, filename, '')
    }
  } else {
    preview?.classList.add('hidden')
    if (resultEl) resultEl.value = ''
    if (window._uzCallbacks?.[uid]) window._uzCallbacks[uid]('', '', '')
  }
}

/** Effacer URL manuelle */
function uzUrlClear(uid) {
  const inp = document.getElementById(uid + '-url-input')
  if (inp) inp.value = ''
  document.getElementById(uid + '-url-preview')?.classList.add('hidden')
  const resultEl = document.getElementById(uid + '-result-url')
  if (resultEl) resultEl.value = ''
  if (window._uzCallbacks?.[uid]) window._uzCallbacks[uid]('', '', '')
}

// Injecter les styles CSS pour les tabs
;(function injectUploadZoneStyles() {
  if (document.getElementById('uz-styles')) return
  const style = document.createElement('style')
  style.id = 'uz-styles'
  style.textContent = `
    .uz-tab {
      color: #9ca3af;
      background: transparent;
    }
    .uz-tab:hover {
      color: #e5e7eb;
      background: rgba(255,255,255,0.05);
    }
    .uz-tab-active {
      color: #fbbf24 !important;
      background: rgba(251,191,36,0.12) !important;
    }
    .upload-zone-wrapper {
      width: 100%;
    }
  `
  document.head.appendChild(style)
})()
