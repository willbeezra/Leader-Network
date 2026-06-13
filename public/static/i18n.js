/**
 * i18n.js v4 — Moteur de traduction multilingue — Leader Network
 *
 * ZERO hardcode : les langues disponibles sont chargées depuis /api/i18n/languages
 * Architecture : memCache (RAM) → KV Cloudflare → DeepSeek AI
 *
 * Flow :
 *   1. init() → fetch /api/i18n/languages → liste des langues actives en DB
 *   2. warmupCache() → charge strings.{lang}.json (fallback statique si existe)
 *   3. patchInnerHTML() → actif après warm-up, synchrone, regex unique
 *   4. Textes manquants → batch /api/i18n/translate → DeepSeek → KV
 *   5. rerenderPage() après chaque batch pour appliquer les nouvelles trad
 */
(function () {
  'use strict';

  const DEFAULT     = 'fr';
  const STORAGE_KEY = 'leader_lang';

  // ─── État ────────────────────────────────────────────────────────────────────
  let _lang      = DEFAULT;
  let _ready     = false;
  let _patched   = false;
  let _languages = []; // [{ code, name, flag, sort_order }] — chargé depuis l'API

  // Cache mémoire : Map<texteFR, texteTraduction> pour la langue courante
  let _cache     = new Map();
  let _missing   = new Set();
  let _batchPending = false;

  // Regex unique (rebuilt à chaque fois que _cache grossit)
  let _dictRegex = null;
  let _dictKeys  = [];

  // ─── Escape RegExp ───────────────────────────────────────────────────────────
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function rebuildRegex() {
    _dictKeys  = [..._cache.keys()].sort((a, b) => b.length - a.length);
    _dictRegex = _dictKeys.length > 0
      ? new RegExp(_dictKeys.map(escapeRegex).join('|'), 'g')
      : null;
  }

  // ─── Détection langue ────────────────────────────────────────────────────────
  function detectLang() {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return s;
    const n = (navigator.language || '').split('-')[0].toLowerCase();
    return n || DEFAULT;
  }

  // ─── Chargement des langues depuis l'API ─────────────────────────────────────
  async function loadLanguages() {
    try {
      const r = await fetch('/api/i18n/languages');
      if (r.ok) {
        const d = await r.json();
        _languages = d.languages || [];
      }
    } catch(e) {
      console.warn('[i18n v4] loadLanguages error:', e);
    }
    // Toujours avoir au moins FR comme fallback
    if (!_languages.length) {
      _languages = [{ code: 'fr', name: 'Français', flag: '🇫🇷', sort_order: 1 }];
    }
  }

  // ─── Remplacement synchrone depuis _cache ────────────────────────────────────
  function applyCache(text) {
    if (!_dictRegex || !text) return text;
    return text.replace(_dictRegex, m => _cache.has(m) ? _cache.get(m) : m);
  }

  // ─── Remplacement dans HTML ──────────────────────────────────────────────────
  function translateHTML(html) {
    if (!html || _lang === DEFAULT || !_ready) return html;

    let hasMissing = false;

    // 1. Textes visibles entre balises
    html = html.replace(/>([^<]+)</g, function(match, text) {
      const trimmed = text.trim();
      if (!trimmed) return match;
      if (_cache.has(trimmed)) {
        return '>' + text.replace(trimmed, _cache.get(trimmed)) + '<';
      }
      if (trimmed.length > 1 && !/^\d+([.,]\d+)?[%€$]?$/.test(trimmed)) {
        _missing.add(trimmed);
        hasMissing = true;
      }
      return match;
    });

    // 2. Attributs placeholder / title / value
    html = html.replace(/\b(placeholder|title|value)=(['"])([^'"]+)\2/g,
      function(match, attr, q, val) {
        const trimmed = val.trim();
        if (_cache.has(trimmed)) {
          return attr + '=' + q + _cache.get(trimmed) + q;
        }
        if (trimmed.length > 1) { _missing.add(trimmed); hasMissing = true; }
        return match;
      }
    );

    if (hasMissing) scheduleBatch();
    return html;
  }

  // ─── Batch ───────────────────────────────────────────────────────────────────
  function scheduleBatch() {
    if (_batchPending || _missing.size === 0) return;
    _batchPending = true;
    setTimeout(flushBatch, 80);
  }

  async function flushBatch() {
    _batchPending = false;
    if (_missing.size === 0 || _lang === DEFAULT) return;

    const texts = [..._missing].filter(t => !_cache.has(t));
    _missing.clear();
    if (!texts.length) return;

    console.log('[i18n v4] batch', texts.length, '→', _lang);
    try {
      const resp = await fetch('/api/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, lang: _lang }),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      let newEntries = 0;
      Object.entries(data.translations || {}).forEach(([fr, t]) => {
        if (fr && t && typeof t === 'string') { _cache.set(fr, t); newEntries++; }
      });
      texts.forEach(t => { if (!_cache.has(t)) _cache.set(t, t); });
      if (newEntries > 0) { rebuildRegex(); rerenderPage(); }
    } catch(e) {
      console.warn('[i18n v4] batch error:', e);
      texts.forEach(t => _cache.set(t, t));
    }
  }

  function rerenderPage() {
    if (typeof showPage === 'function' && typeof currentPage !== 'undefined') {
      showPage(currentPage);
      return;
    }
    translateExistingDOM();
    translateSidebar();
  }

  // ─── Patch de innerHTML ──────────────────────────────────────────────────────
  function patchInnerHTML() {
    if (_patched) return;
    _patched = true;
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (!descriptor || !descriptor.set) return;
    const originalSet = descriptor.set;
    Object.defineProperty(Element.prototype, 'innerHTML', {
      get: descriptor.get,
      set: function(val) {
        if (this.id === 'i18n-lang-selector' || this.id === 'i18n-lang-dropdown') {
          originalSet.call(this, val); return;
        }
        if (_lang !== DEFAULT && _ready && typeof val === 'string') val = translateHTML(val);
        originalSet.call(this, val);
      },
      configurable: true,
    });
  }

  // ─── Traduit le DOM existant ─────────────────────────────────────────────────
  function translateExistingDOM_el(root) {
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
      const raw = node.textContent, trimmed = raw && raw.trim();
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

  function translateExistingDOM() { if (document.body) translateExistingDOM_el(document.body); }

  function translateSidebar() {
    if (_lang === DEFAULT || !_ready) return;
    const sidebar = document.getElementById('sidebar');
    if (sidebar) translateExistingDOM_el(sidebar);
    const header = document.querySelector('header') || document.querySelector('.header');
    if (header) translateExistingDOM_el(header);
    document.querySelectorAll('.nav-btn').forEach(btn => {
      [...btn.childNodes].forEach(cn => {
        if (cn.nodeType !== Node.TEXT_NODE) return;
        const raw = cn.textContent.trim();
        if (!raw) return;
        if (_cache.has(raw)) {
          const t = _cache.get(raw); if (t !== raw) cn.textContent = ' ' + t;
        } else { _missing.add(raw); scheduleBatch(); }
      });
    });
  }

  // ─── Warm-up cache ───────────────────────────────────────────────────────────
  async function warmupCache(lang) {
    if (lang === DEFAULT) return;
    _cache.clear(); _dictRegex = null; _dictKeys = [];
    try {
      const r = await fetch('/static/locales/strings.' + lang + '.json?_=' + Date.now());
      if (r.ok) {
        const dict = await r.json();
        if (dict && typeof dict === 'object') {
          let n = 0;
          Object.entries(dict).forEach(([fr, t]) => {
            if (fr && t && typeof t === 'string' && fr !== t) { _cache.set(fr, t); n++; }
          });
          console.log('[i18n v4] warm-up "' + lang + '" : ' + n + ' entrées');
        }
      }
    } catch(e) { /* pas de fichier statique */ }
    rebuildRegex();
  }

  // ─── Sélecteur de langue ─────────────────────────────────────────────────────
  function buildSelector() {
    const existing = document.getElementById('i18n-lang-selector');
    if (existing) existing.remove();

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
      minWidth: '185px', display: 'none',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    });

    // Barre de recherche
    const searchWrap = document.createElement('div');
    Object.assign(searchWrap.style, { padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)' });
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
    Object.assign(listEl.style, { maxHeight: '250px', overflowY: 'auto' });
    drop.appendChild(listEl);

    function renderList(filter) {
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      const entries = _languages.filter(l =>
        !filter || l.name.toLowerCase().includes(filter) || l.code.startsWith(filter)
      );
      entries.forEach(l => {
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
    const cur = _languages.find(l => l.code === _lang) || { flag: '🌐', name: _lang.toUpperCase() };
    btn.textContent = cur.flag + ' ' + cur.name;
    Object.assign(btn.style, {
      padding: '8px 14px', borderRadius: '24px',
      background: 'rgba(10,15,30,0.92)', color: '#f1f5f9',
      border: '1px solid rgba(255,255,255,0.15)',
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
    const cur = _languages.find(l => l.code === _lang) || { flag: '🌐', name: _lang.toUpperCase() };
    btn.textContent = cur.flag + ' ' + cur.name;
  }

  // ─── Watchdog ────────────────────────────────────────────────────────────────
  function startWatchdog() {
    setInterval(() => {
      if (!document.getElementById('i18n-lang-selector') && document.body) buildSelector();
    }, 1500);
  }

  // ─── Changement de langue ────────────────────────────────────────────────────
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
      _ready = true;
      updateSelectorBtn();
      location.reload();
      return;
    }

    await warmupCache(lang);
    _ready = true;
    updateSelectorBtn();
    translateSidebar();
    translateExistingDOM();
    rerenderPage();
  }

  // ─── Init ────────────────────────────────────────────────────────────────────
  async function init() {
    _lang = detectLang();
    document.documentElement.setAttribute('lang', _lang);

    // 1. Charger la liste des langues depuis l'API (async, non bloquant pour le rendu)
    const langPromise = loadLanguages();

    // 2. Warm-up cache AVANT patchInnerHTML
    if (_lang !== DEFAULT) await warmupCache(_lang);

    _ready = true;
    patchInnerHTML();

    // 3. Attendre que les langues soient chargées pour le sélecteur
    await langPromise;

    function inject() {
      buildSelector();
      startWatchdog();
      if (_lang !== DEFAULT) {
        setTimeout(() => {
          translateSidebar();
          translateExistingDOM();
          rerenderPage();
        }, 350);
      }
    }

    if (document.body) inject();
    else document.addEventListener('DOMContentLoaded', inject);
  }

  // ─── API publique ─────────────────────────────────────────────────────────────
  window.t    = (key) => _cache.get(key) || key;
  window.i18n = {
    switch:    switchLang,
    current:   () => _lang,
    languages: () => _languages,
    cache:     () => _cache,
    stats:     () => ({ size: _cache.size, missing: _missing.size, lang: _lang, langs: _languages.length }),
  };

  init();
})();
