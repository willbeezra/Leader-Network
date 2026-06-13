/**
 * i18n.js v5 — Moteur de traduction multilingue — Leader Network
 *
 * FIXES v5 :
 *  - Langues : JAMAIS de cache localStorage → toujours depuis /api/i18n/languages
 *    Désactiver une langue côté admin → disparaît immédiatement côté membre
 *  - Créoles : warm-up échoue (pas de fichier .json) → on passe directement
 *    au batch DeepSeek avec les textes visibles à l'écran
 *  - Premier rendu : on attend que _langs soit chargé AVANT tout, puis on active
 *    patchInnerHTML, puis on force rerenderPage() pour que member-app.js
 *    re-rende avec les traductions
 *
 * Flux :
 *   1. loadLanguages() → GET /api/i18n/languages (DB, aucun cache)
 *   2. warmupCache(lang) → strings.{lang}.json si dispo (EN/ES/PT…)
 *      Pour les créoles : cache vide, mais _ready = true
 *   3. patchInnerHTML() activé
 *   4. rerenderPage() → showPage(currentPage) → innerHTML patché → traduction
 *   5. Textes manquants → batch POST /api/i18n/translate → KV → DeepSeek
 *   6. Après batch → rebuildRegex() → rerenderPage() → DOM mis à jour
 */
(function () {
  'use strict';

  const DEFAULT     = 'fr';
  const STORAGE_KEY = 'leader_lang';

  // ─── État ─────────────────────────────────────────────────────────────────
  let _lang    = DEFAULT;
  let _ready   = false;
  let _patched = false;
  let _langs   = [];  // chargé depuis API à chaque init/switch — jamais hardcodé

  // Cache traductions : Map<texteFR, texteTraduction>
  let _cache     = new Map();
  let _dictRegex = null;
  let _dictKeys  = [];

  // File d'attente batch
  let _missing      = new Set();
  let _batchPending = false;

  // ─── Escape RegExp ────────────────────────────────────────────────────────
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function rebuildRegex() {
    _dictKeys  = [..._cache.keys()].sort((a, b) => b.length - a.length);
    _dictRegex = _dictKeys.length > 0
      ? new RegExp(_dictKeys.map(escapeRegex).join('|'), 'g')
      : null;
  }

  function applyCache(text) {
    if (!_dictRegex || !text) return text;
    return text.replace(_dictRegex, m => _cache.has(m) ? _cache.get(m) : m);
  }

  // ─── Détection langue ─────────────────────────────────────────────────────
  function detectLang() {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return s;
    const n = (navigator.language || '').split('-')[0].toLowerCase();
    return n || DEFAULT;
  }

  // ─── Chargement des langues ACTIVES depuis l'API — aucun cache ──────────
  // Appel réseau à chaque init et à chaque switchLang.
  // Garantit qu'une langue désactivée dans l'admin disparaît immédiatement.
  async function loadLanguages() {
    try {
      const r = await fetch('/api/i18n/languages?_=' + Date.now());
      if (r.ok) {
        const data = await r.json();
        _langs = data.languages || [];
      }
    } catch(e) {
      console.warn('[i18n v5] loadLanguages error:', e);
      // Fallback minimal — juste FR
      if (!_langs.length) _langs = [{ code: 'fr', name: 'Français', flag: '🇫🇷', sort_order: 1 }];
    }

    // Si la langue courante a été désactivée → revenir au FR
    if (_lang !== DEFAULT && _langs.length && !_langs.find(l => l.code === _lang)) {
      console.warn('[i18n v5] langue "' + _lang + '" désactivée → retour FR');
      _lang = DEFAULT;
      localStorage.setItem(STORAGE_KEY, DEFAULT);
      document.documentElement.setAttribute('lang', DEFAULT);
    }
  }

  // ─── Warm-up : charge strings.{lang}.json dans _cache (si disponible) ───
  // Pour les créoles (rcf, mfe, hat, gcf, mart, mad) : pas de fichier statique
  // → _cache reste vide mais _ready = true
  // → Le premier rendu passe en batch DeepSeek immédiatement
  async function warmupCache(lang) {
    _cache.clear();
    _dictRegex = null;
    _dictKeys  = [];

    if (lang === DEFAULT) return;

    try {
      const r = await fetch('/static/locales/strings.' + lang + '.json?_=' + Date.now());
      if (r.ok) {
        const dict = await r.json();
        if (dict && typeof dict === 'object') {
          let count = 0;
          Object.entries(dict).forEach(([fr, translated]) => {
            if (fr && translated && typeof translated === 'string' && fr !== translated) {
              _cache.set(fr, translated);
              count++;
            }
          });
          if (count > 0) {
            rebuildRegex();
            console.log('[i18n v5] warm-up "' + lang + '" : ' + count + ' entrées');
          }
        }
      }
      // Pas de fichier → cache vide, pas d'erreur — DeepSeek prendra le relais
    } catch(e) { /* normal pour les créoles */ }
  }

  // ─── Traduction HTML (synchrone depuis _cache) ────────────────────────────
  function translateHTML(html) {
    if (!html || _lang === DEFAULT || !_ready) return html;

    let hasMissing = false;

    // Textes visibles entre balises
    html = html.replace(/>([^<]+)</g, function(match, text) {
      const trimmed = text.trim();
      if (!trimmed) return match;
      if (_cache.has(trimmed)) {
        return '>' + text.replace(trimmed, _cache.get(trimmed)) + '<';
      }
      // Texte non en cache : l'ajouter à la file sauf si c'est un nombre/montant pur
      if (trimmed.length > 1 && !/^\d+([.,]\d+)?[%€$]?$/.test(trimmed)) {
        _missing.add(trimmed);
        hasMissing = true;
      }
      return match;
    });

    // Attributs placeholder / title
    html = html.replace(/\b(placeholder|title)=(['"])([^'"]+)\2/g,
      function(match, attr, q, val) {
        const trimmed = val.trim();
        if (_cache.has(trimmed)) return attr + '=' + q + _cache.get(trimmed) + q;
        if (trimmed.length > 1) { _missing.add(trimmed); hasMissing = true; }
        return match;
      }
    );

    if (hasMissing) scheduleBatch();
    return html;
  }

  // ─── Patch innerHTML ──────────────────────────────────────────────────────
  function patchInnerHTML() {
    if (_patched) return;
    _patched = true;
    const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (!desc || !desc.set) return;
    const orig = desc.set;
    Object.defineProperty(Element.prototype, 'innerHTML', {
      get: desc.get,
      set: function(val) {
        if (this.id === 'i18n-lang-selector' || this.id === 'i18n-lang-dropdown') {
          orig.call(this, val); return;
        }
        if (_lang !== DEFAULT && _ready && typeof val === 'string') val = translateHTML(val);
        orig.call(this, val);
      },
      configurable: true,
    });
  }

  // ─── Batch DeepSeek ───────────────────────────────────────────────────────
  function scheduleBatch() {
    if (_batchPending || _missing.size === 0) return;
    _batchPending = true;
    setTimeout(flushBatch, 100);
  }

  async function flushBatch() {
    _batchPending = false;
    if (_missing.size === 0 || _lang === DEFAULT) return;

    const texts = [..._missing].filter(t => !_cache.has(t));
    _missing.clear();
    if (texts.length === 0) return;

    console.log('[i18n v5] batch', texts.length, 'textes →', _lang);

    try {
      const resp = await fetch('/api/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, lang: _lang }),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      const translations = data?.translations || {};

      let newEntries = 0;
      Object.entries(translations).forEach(([fr, translated]) => {
        if (fr && translated && typeof translated === 'string' && translated !== fr) {
          _cache.set(fr, translated);
          newEntries++;
        }
      });
      // Textes non traduits → stocker original pour éviter batchs infinis
      texts.forEach(t => { if (!_cache.has(t)) _cache.set(t, t); });

      if (newEntries > 0) {
        rebuildRegex();
        console.log('[i18n v5] +' + newEntries + ' nouvelles traductions → re-rendu');
        rerenderPage();
      }
    } catch(e) {
      console.warn('[i18n v5] batch error:', e);
      texts.forEach(t => _cache.set(t, t));
    }
  }

  // ─── Re-rendu de la page ──────────────────────────────────────────────────
  function rerenderPage() {
    // member-app.js expose showPage() + currentPage
    if (typeof showPage === 'function' && typeof currentPage !== 'undefined') {
      showPage(currentPage);
      return;
    }
    // Fallback : re-traduire le DOM directement
    translateDOM_el(document.body);
    translateSidebar();
  }

  // ─── Traduire les nœuds texte d'un élément ───────────────────────────────
  function translateDOM_el(root) {
    if (_lang === DEFAULT || !_ready || !root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (p.closest('#i18n-lang-selector')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(node => {
      const raw = node.textContent;
      const trimmed = raw && raw.trim();
      if (!trimmed) return;
      if (_cache.has(trimmed)) {
        const t = _cache.get(trimmed);
        if (t !== trimmed) node.textContent = raw.replace(trimmed, t);
      } else if (trimmed.length > 1 && !/^\d+([.,]\d+)?[%€$]?$/.test(trimmed)) {
        _missing.add(trimmed);
      }
    });
    root.querySelectorAll('[placeholder],[title]').forEach(el => {
      ['placeholder','title'].forEach(attr => {
        const v = el.getAttribute(attr);
        if (!v) return;
        if (_cache.has(v)) { const t = _cache.get(v); if (t !== v) el.setAttribute(attr, t); }
        else if (v.length > 1) _missing.add(v);
      });
    });
    if (_missing.size > 0) scheduleBatch();
  }

  function translateSidebar() {
    if (_lang === DEFAULT || !_ready) return;
    const sidebar = document.getElementById('sidebar');
    if (sidebar) translateDOM_el(sidebar);
    const header = document.querySelector('header') || document.querySelector('.header');
    if (header) translateDOM_el(header);
    document.querySelectorAll('.nav-btn').forEach(btn => {
      [...btn.childNodes].forEach(cn => {
        if (cn.nodeType !== Node.TEXT_NODE) return;
        const raw = cn.textContent.trim();
        if (!raw) return;
        if (_cache.has(raw)) {
          const t = _cache.get(raw);
          if (t !== raw) cn.textContent = ' ' + t;
        } else {
          _missing.add(raw);
          scheduleBatch();
        }
      });
    });
  }

  // ─── Sélecteur de langue ──────────────────────────────────────────────────
  function buildSelector() {
    const existing = document.getElementById('i18n-lang-selector');
    if (existing) existing.remove();
    if (!_langs.length) return;

    const wrap = document.createElement('div');
    wrap.id = 'i18n-lang-selector';
    Object.assign(wrap.style, {
      position: 'fixed', bottom: '20px', right: '20px',
      zIndex: '2147483647',
      fontFamily: 'system-ui,-apple-system,sans-serif',
      fontSize: '13px', userSelect: 'none',
    });

    const drop = document.createElement('div');
    drop.id = 'i18n-lang-dropdown';
    Object.assign(drop.style, {
      position: 'absolute', bottom: 'calc(100% + 8px)', right: '0',
      background: 'rgba(10,15,30,0.97)',
      border: '1px solid rgba(255,255,255,0.13)',
      borderRadius: '12px', overflow: 'hidden',
      minWidth: '195px', display: 'none',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    });

    // Barre de recherche
    const searchWrap = document.createElement('div');
    Object.assign(searchWrap.style, {
      padding: '8px 10px',
      borderBottom: '1px solid rgba(255,255,255,0.07)'
    });
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '🔍 Rechercher…';
    Object.assign(searchInput.style, {
      width: '100%', background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
      color: '#f1f5f9', padding: '5px 8px', fontSize: '12px',
      boxSizing: 'border-box', outline: 'none',
    });
    searchInput.addEventListener('input', () => renderList(searchInput.value.trim().toLowerCase()));
    searchWrap.appendChild(searchInput);
    drop.appendChild(searchWrap);

    const listEl = document.createElement('div');
    Object.assign(listEl.style, { maxHeight: '260px', overflowY: 'auto' });
    drop.appendChild(listEl);

    function renderList(filter) {
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      const filtered = _langs.filter(l =>
        !filter || l.name.toLowerCase().includes(filter) || l.code.startsWith(filter)
      );
      filtered.forEach(l => {
        const item = document.createElement('button');
        item.setAttribute('data-lang', l.code);
        item.textContent = l.flag + '  ' + l.name;
        Object.assign(item.style, {
          display: 'block', width: '100%', padding: '9px 16px',
          background: l.code === _lang ? 'rgba(99,102,241,0.28)' : 'transparent',
          color: '#f1f5f9', border: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          cursor: 'pointer', textAlign: 'left', fontSize: '13px',
          fontWeight: l.code === _lang ? '700' : '400',
        });
        item.addEventListener('mouseenter', () => {
          if (l.code !== _lang) item.style.background = 'rgba(255,255,255,0.08)';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = l.code === _lang ? 'rgba(99,102,241,0.28)' : 'transparent';
        });
        item.addEventListener('click', () => { switchLang(l.code); closeDrop(); });
        listEl.appendChild(item);
      });
    }
    renderList('');

    // Bouton principal
    const btn = document.createElement('button');
    btn.id = 'i18n-lang-btn';
    const cur = _langs.find(l => l.code === _lang) || { flag: '🌐', name: _lang.toUpperCase() };
    btn.textContent = cur.flag + ' ' + cur.name;
    Object.assign(btn.style, {
      padding: '8px 14px', borderRadius: '24px',
      background: 'rgba(10,15,30,0.92)',
      color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.15)',
      cursor: 'pointer', whiteSpace: 'nowrap',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      fontSize: '13px', fontWeight: '500',
    });

    let open = false;
    function openDrop() {
      drop.style.display = 'block'; open = true;
      searchInput.value = ''; renderList('');
      setTimeout(() => searchInput.focus(), 40);
    }
    function closeDrop() { drop.style.display = 'none'; open = false; }

    btn.addEventListener('click', e => { e.stopPropagation(); open ? closeDrop() : openDrop(); });
    document.addEventListener('click', () => { if (open) closeDrop(); });

    wrap.appendChild(drop);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
  }

  function updateSelectorBtn() {
    const btn = document.getElementById('i18n-lang-btn');
    if (!btn) { buildSelector(); return; }
    const cur = _langs.find(l => l.code === _lang) || { flag: '🌐', name: _lang.toUpperCase() };
    btn.textContent = cur.flag + ' ' + cur.name;
  }

  // ─── Watchdog ─────────────────────────────────────────────────────────────
  function startWatchdog() {
    setInterval(() => {
      if (!document.getElementById('i18n-lang-selector') && document.body) buildSelector();
    }, 1500);
  }

  // ─── Changement de langue ─────────────────────────────────────────────────
  async function switchLang(lang) {
    if (lang === _lang) return;

    const btn = document.getElementById('i18n-lang-btn');
    if (btn) btn.textContent = '⏳ Chargement…';

    _lang = lang;
    _ready = false;
    _missing.clear();
    _batchPending = false;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);

    if (lang === DEFAULT) {
      _cache.clear(); _dictRegex = null; _dictKeys = [];
      // Recharger les langues actives (l'admin peut en avoir réactivé)
      await loadLanguages();
      _ready = true;
      updateSelectorBtn();
      location.reload();
      return;
    }

    // Recharger les langues actives depuis la DB
    await loadLanguages();

    // Warm-up depuis fichier statique (si disponible)
    await warmupCache(lang);

    _ready = true;
    updateSelectorBtn();
    translateSidebar();

    // Re-rendre la page pour déclencher le patch innerHTML
    rerenderPage();

    // Pour les créoles (cache vide) : forcer un batch immédiat
    // en collectant tous les textes visibles du DOM
    if (_cache.size === 0) {
      _collectVisibleTexts();
    }
  }

  // ─── Collecte des textes visibles pour forcer le premier batch ────────────
  // Utilisé pour les langues sans fichier warm-up (créoles, langues rares)
  function _collectVisibleTexts() {
    if (!document.body) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (p.closest('#i18n-lang-selector')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) {
      const trimmed = n.textContent && n.textContent.trim();
      if (trimmed && trimmed.length > 1 && !/^\d+([.,]\d+)?[%€$]?$/.test(trimmed)) {
        _missing.add(trimmed);
      }
    }
    document.body.querySelectorAll('[placeholder],[title]').forEach(el => {
      ['placeholder','title'].forEach(attr => {
        const v = el.getAttribute(attr);
        if (v && v.length > 1) _missing.add(v);
      });
    });
    if (_missing.size > 0) {
      console.log('[i18n v5] collecte forcée : ' + _missing.size + ' textes pour batch');
      scheduleBatch();
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  async function init() {
    _lang = detectLang();
    document.documentElement.setAttribute('lang', _lang);

    // 1. Charger les langues actives depuis la DB (sans cache)
    await loadLanguages();

    // 2. Warm-up si langue non-FR
    if (_lang !== DEFAULT) {
      await warmupCache(_lang);
    }

    // 3. Activer le patch APRÈS warm-up
    _ready = true;
    patchInnerHTML();

    function inject() {
      buildSelector();
      startWatchdog();

      if (_lang !== DEFAULT) {
        // Attendre le premier rendu de member-app.js (~400ms)
        setTimeout(() => {
          translateSidebar();
          rerenderPage();
          // Si cache encore vide (créoles) → collecter et batcher
          if (_cache.size === 0) {
            _collectVisibleTexts();
          }
        }, 450);
      }
    }

    if (document.body) inject();
    else document.addEventListener('DOMContentLoaded', inject);
  }

  // ─── API publique ─────────────────────────────────────────────────────────
  window.t    = (key) => _cache.get(key) || key;
  window.i18n = {
    switch:    switchLang,
    current:   () => _lang,
    langs:     () => _langs,
    supported: () => _langs.map(l => l.code),
    cache:     () => _cache,
    stats:     () => ({ lang: _lang, cached: _cache.size, missing: _missing.size }),
    // Forcer un rechargement de la liste des langues (ex: après modif admin)
    reloadLangs: async () => {
      await loadLanguages();
      buildSelector();
    },
  };

  init();
})();
