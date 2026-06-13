/**
 * i18n.js v3.1 — Moteur de traduction multilingue — Leader Network
 *
 * Architecture : memCache (RAM) → KV Cloudflare → DeepSeek AI
 *
 * FIX v3.1 : innerHTML est SYNCHRONE — on ne peut pas faire d'async dedans.
 * Solution correcte :
 *   1. warmupCache() charge strings.{lang}.json EN ENTIER dans _memCache AVANT tout rendu
 *   2. patchInnerHTML() traduit depuis _memCache (synchrone, 0ms)
 *   3. Pour les textes manquants en cache : flushBatch() appelle /api/i18n/translate
 *      puis RE-DÉCLENCHE showPage(currentPage) pour re-rendre avec les nouvelles trad
 *   4. Cycle converge rapidement : page 1→ warm-up hit, page 2→ tout en cache
 */
(function () {
  'use strict';

  // ─── Config ─────────────────────────────────────────────────────────────────
  const DEFAULT     = 'fr';
  const STORAGE_KEY = 'leader_lang';

  const META = {
    fr: { name: 'Français',    flag: '🇫🇷' },
    en: { name: 'English',     flag: '🇬🇧' },
    es: { name: 'Español',     flag: '🇪🇸' },
    pt: { name: 'Português',   flag: '🇧🇷' },
    hi: { name: 'हिंदी',        flag: '🇮🇳' },
    de: { name: 'Deutsch',     flag: '🇩🇪' },
    ar: { name: 'العربية',     flag: '🇸🇦' },
    zh: { name: '中文',         flag: '🇨🇳' },
    it: { name: 'Italiano',    flag: '🇮🇹' },
    ru: { name: 'Русский',     flag: '🇷🇺' },
    tr: { name: 'Türkçe',      flag: '🇹🇷' },
    nl: { name: 'Nederlands',  flag: '🇳🇱' },
    ko: { name: '한국어',        flag: '🇰🇷' },
    ja: { name: '日本語',        flag: '🇯🇵' },
    vi: { name: 'Tiếng Việt',  flag: '🇻🇳' },
    id: { name: 'Bahasa',      flag: '🇮🇩' },
    pl: { name: 'Polski',      flag: '🇵🇱' },
    uk: { name: 'Українська',  flag: '🇺🇦' },
    ro: { name: 'Română',      flag: '🇷🇴' },
    th: { name: 'ภาษาไทย',     flag: '🇹🇭' },
  };

  // ─── État ────────────────────────────────────────────────────────────────────
  let _lang    = DEFAULT;
  let _ready   = false;  // true = warmup terminé, on peut traduire
  let _patched = false;

  // Cache mémoire : Map<texteFR, texteTraduction> pour la langue courante
  // Un seul niveau — on change de langue = on vide + recharge
  let _cache = new Map();

  // Textes vus mais non encore traduits (en attente de batch)
  let _missing     = new Set();
  let _batchPending = false;

  // ─── Détection langue ────────────────────────────────────────────────────────
  function detectLang() {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return s;
    const n = (navigator.language || '').split('-')[0].toLowerCase();
    return n || DEFAULT;
  }

  // ─── Escape RegExp ───────────────────────────────────────────────────────────
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ─── Regex de remplacement (synchrone, depuis _cache) ───────────────────────
  // Reconstruit à chaque fois que _cache grossit
  let _dictRegex = null;
  let _dictKeys  = [];

  function rebuildRegex() {
    _dictKeys  = [..._cache.keys()].sort((a, b) => b.length - a.length);
    _dictRegex = _dictKeys.length > 0
      ? new RegExp(_dictKeys.map(escapeRegex).join('|'), 'g')
      : null;
  }

  // ─── Remplacement synchrone depuis _cache ────────────────────────────────────
  function applyCache(text) {
    if (!_dictRegex || !text) return text;
    return text.replace(_dictRegex, m => _cache.has(m) ? _cache.get(m) : m);
  }

  // ─── Remplacement dans HTML ──────────────────────────────────────────────────
  function translateHTML(html) {
    if (!html || _lang === DEFAULT || !_ready) return html;

    // Collecter les textes manquants au passage (pour batch ultérieur)
    let hasMissing = false;

    // 1. Textes visibles entre balises
    html = html.replace(/>([^<]+)</g, function(match, text) {
      const trimmed = text.trim();
      if (!trimmed) return match;
      if (_cache.has(trimmed)) {
        return '>' + text.replace(trimmed, _cache.get(trimmed)) + '<';
      }
      // Texte non en cache → l'enregistrer pour batch
      if (trimmed.length > 1 && !/^\d+([.,]\d+)?[%€$]?$/.test(trimmed)) {
        _missing.add(trimmed);
        hasMissing = true;
      }
      return match; // retourner FR pour l'instant
    });

    // 2. Attributs placeholder / title / value
    html = html.replace(/\b(placeholder|title|value)=(['"])([^'"]+)\2/g,
      function(match, attr, q, val) {
        const trimmed = val.trim();
        if (_cache.has(trimmed)) {
          return attr + '=' + q + _cache.get(trimmed) + q;
        }
        if (trimmed.length > 1) {
          _missing.add(trimmed);
          hasMissing = true;
        }
        return match;
      }
    );

    if (hasMissing) scheduleBatch();
    return html;
  }

  // ─── Batch : envoie les textes manquants à /api/i18n/translate ───────────────
  function scheduleBatch() {
    if (_batchPending || _missing.size === 0) return;
    _batchPending = true;
    setTimeout(flushBatch, 80); // petit délai pour accumuler
  }

  async function flushBatch() {
    _batchPending = false;
    if (_missing.size === 0 || _lang === DEFAULT) return;

    const texts = [..._missing].filter(t => !_cache.has(t));
    _missing.clear();
    if (texts.length === 0) return;

    console.log('[i18n v3] batch translate', texts.length, 'textes →', _lang);

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
        if (fr && translated && typeof translated === 'string') {
          _cache.set(fr, translated);
          newEntries++;
        }
      });
      // Textes que DeepSeek n'a pas traduits → stocker l'original pour éviter re-batchs
      texts.forEach(t => { if (!_cache.has(t)) _cache.set(t, t); });

      if (newEntries > 0) {
        rebuildRegex();
        console.log('[i18n v3] +' + newEntries + ' traductions en cache → re-rendu');
        // RE-DÉCLENCHER le rendu de la page courante avec les nouvelles traductions
        rerenderPage();
      }
    } catch (e) {
      console.warn('[i18n v3] batch error:', e);
      texts.forEach(t => _cache.set(t, t)); // fallback : ne plus re-tenter ces textes
    }
  }

  // ─── Re-rendu de la page courante ────────────────────────────────────────────
  function rerenderPage() {
    if (typeof showPage === 'function' && typeof currentPage !== 'undefined') {
      showPage(currentPage);
      return;
    }
    // Fallback : re-traduire le DOM manuellement
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
          originalSet.call(this, val);
          return;
        }
        if (_lang !== DEFAULT && _ready && typeof val === 'string') {
          val = translateHTML(val);
        }
        originalSet.call(this, val);
      },
      configurable: true,
    });
  }

  // ─── Traduit le DOM existant (nœuds texte) ───────────────────────────────────
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
        if (_cache.has(v)) {
          const t = _cache.get(v);
          if (t !== v) el.setAttribute(attr, t);
        } else if (v.length > 1) {
          _missing.add(v);
        }
      });
    });

    if (_missing.size > 0) scheduleBatch();
  }

  function translateExistingDOM() { translateExistingDOM_el(document.body); }

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
          const t = _cache.get(raw);
          if (t !== raw) cn.textContent = ' ' + t;
        } else {
          _missing.add(raw);
          scheduleBatch();
        }
      });
    });
  }

  // ─── Warm-up : charge strings.{lang}.json ENTIER dans _cache ─────────────────
  // Critique : doit être terminé AVANT que patchInnerHTML soit actif
  async function warmupCache(lang) {
    if (lang === DEFAULT) return;
    _cache.clear();
    _dictRegex = null;
    _dictKeys  = [];

    // Fichiers statiques existants (fallback rapide)
    const sources = [
      '/static/locales/strings.' + lang + '.json',
    ];

    let totalLoaded = 0;
    for (const url of sources) {
      try {
        const r = await fetch(url + '?_=' + Date.now());
        if (!r.ok) continue;
        const dict = await r.json();
        if (dict && typeof dict === 'object') {
          Object.entries(dict).forEach(([fr, translated]) => {
            if (fr && translated && typeof translated === 'string' && fr !== translated) {
              _cache.set(fr, translated);
              totalLoaded++;
            }
          });
        }
      } catch(e) { /* pas de fichier statique = normal */ }
    }

    rebuildRegex();
    console.log('[i18n v3] warm-up "' + lang + '" : ' + totalLoaded + ' entrées en cache');
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
    searchInput.placeholder = '🔍 Search language…';
    Object.assign(searchInput.style, {
      width: '100%', background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
      color: '#f1f5f9', padding: '5px 8px', fontSize: '12px', boxSizing: 'border-box',
      outline: 'none',
    });
    // Empêcher le patch innerHTML sur l'input
    searchInput.addEventListener('input', (e) => {
      renderList(searchInput.value.trim().toLowerCase());
    });
    searchWrap.appendChild(searchInput);
    drop.appendChild(searchWrap);

    const listEl = document.createElement('div');
    Object.assign(listEl.style, { maxHeight: '250px', overflowY: 'auto' });
    drop.appendChild(listEl);

    function renderList(filter) {
      // Vider sans innerHTML pour éviter le patch
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

      const entries = Object.entries(META).filter(([code, m]) =>
        !filter || m.name.toLowerCase().includes(filter) || code.startsWith(filter)
      );

      entries.forEach(([code, m]) => {
        const item = document.createElement('button');
        item.setAttribute('data-lang', code);
        item.textContent = m.flag + '  ' + m.name;
        Object.assign(item.style, {
          display: 'block', width: '100%', padding: '9px 16px',
          background: code === _lang ? 'rgba(99,102,241,0.28)' : 'transparent',
          color: '#f1f5f9', border: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          cursor: 'pointer', textAlign: 'left', fontSize: '13px',
          fontWeight: code === _lang ? '700' : '400',
        });
        item.addEventListener('mouseenter', () => {
          if (code !== _lang) item.style.background = 'rgba(255,255,255,0.08)';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = code === _lang ? 'rgba(99,102,241,0.28)' : 'transparent';
        });
        item.addEventListener('click', () => { switchLang(code); closeDrop(); });
        listEl.appendChild(item);
      });
    }
    renderList('');

    // Bouton principal
    const btn = document.createElement('button');
    btn.id = 'i18n-lang-btn';
    const cm = META[_lang] || { flag: '🌐', name: _lang.toUpperCase() };
    btn.textContent = cm.flag + ' ' + cm.name;
    Object.assign(btn.style, {
      padding: '8px 14px', borderRadius: '24px',
      background: 'rgba(10,15,30,0.92)',
      color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.15)',
      cursor: 'pointer', whiteSpace: 'nowrap',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      fontSize: '13px', fontWeight: '500',
    });

    let open = false;
    function openDrop()  { drop.style.display = 'block'; open = true; searchInput.value = ''; renderList(''); setTimeout(() => searchInput.focus(), 40); }
    function closeDrop() { drop.style.display = 'none';  open = false; }

    btn.addEventListener('click', e => { e.stopPropagation(); open ? closeDrop() : openDrop(); });
    document.addEventListener('click', () => { if (open) closeDrop(); });

    wrap.appendChild(drop);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
  }

  function updateSelectorBtn() {
    const btn = document.getElementById('i18n-lang-btn');
    if (!btn) { buildSelector(); return; }
    const m = META[_lang] || { flag: '🌐', name: _lang.toUpperCase() };
    btn.textContent = m.flag + ' ' + m.name;
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

    // Spinner sur le bouton pendant le chargement
    const btn = document.getElementById('i18n-lang-btn');
    if (btn) btn.textContent = '⏳ Loading…';

    _lang    = lang;
    _ready   = false;
    _missing.clear();
    _batchPending = false;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);

    if (lang === DEFAULT) {
      _cache.clear();
      _dictRegex = null;
      _dictKeys  = [];
      _ready     = true;
      updateSelectorBtn();
      location.reload();
      return;
    }

    // 1. Charger le warm-up COMPLET avant d'activer les traductions
    await warmupCache(lang);
    _ready = true;
    updateSelectorBtn();

    // 2. Appliquer au DOM statique (sidebar, header)
    translateSidebar();
    translateExistingDOM();

    // 3. Re-rendre la page dynamique (member-app.js)
    rerenderPage();
  }

  // ─── Init ────────────────────────────────────────────────────────────────────
  async function init() {
    _lang = detectLang();
    document.documentElement.setAttribute('lang', _lang);

    if (_lang !== DEFAULT) {
      // Warm-up AVANT patchInnerHTML → le premier rendu de member-app.js
      // sera déjà traduit depuis le cache statique
      await warmupCache(_lang);
    }

    _ready = true;
    patchInnerHTML(); // Activer le patch seulement après warm-up

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
    supported: Object.keys(META),
    meta:      META,
    cache:     () => _cache,
    stats:     () => ({ size: _cache.size, missing: _missing.size, lang: _lang }),
  };

  init();
})();
