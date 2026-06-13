/**
 * i18n.js v7 — Moteur de traduction multilingue — Leader Network
 *
 * ARCHITECTURE v7 :
 * ─────────────────────────────────────────────────────────────────
 * STRATÉGIE DUALE :
 *
 * 1. [data-i18n="texte FR"] — pour les éléments de la landing SSR
 *    → Traduction directe et fiable : textContent de l'élément remplacé
 *    → Clé FR stockée dans l'attribut → pas de problème de TreeWalker
 *    → Hero title : [data-i18n-hero="texte FR"] → innerHTML avec <br>
 *
 * 2. patchInnerHTML — pour member-app.js (pages dynamiques)
 *    → Intercepte les innerHTML= futurs → traduire à la volée
 *    → showPage(currentPage) pour re-rendre les pages dynamiques
 *
 * FLUX :
 *   1. loadLanguages() → /api/i18n/languages (DB, no-cache)
 *   2. warmupCache(lang) → strings.{lang}.json (EN/ES/PT/DE/HI)
 *   3. patchInnerHTML() activé
 *   4. applyDataI18n() → traduit tous [data-i18n] depuis le cache
 *   5. collectDataI18nMissing() → envoie les clés absentes au batch
 *   6. Batch POST /api/i18n/translate → KV → DeepSeek
 *   7. Après batch → applyDataI18n() + rerenderPage() → DOM mis à jour
 * ─────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  const DEFAULT     = 'fr';
  const STORAGE_KEY = 'leader_lang';

  // ─── État ─────────────────────────────────────────────────────────────────
  let _lang    = DEFAULT;
  let _ready   = false;
  let _patched = false;
  let _langs   = [];

  // Cache : Map<texteFR, texteTraduction>
  let _cache     = new Map();
  let _dictRegex = null;
  let _dictKeys  = [];

  // Batch
  let _missing      = new Set();
  let _batchPending = false;

  // ─── Utilitaires ──────────────────────────────────────────────────────────
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function rebuildRegex() {
    _dictKeys  = [..._cache.keys()].sort((a, b) => b.length - a.length);
    _dictRegex = _dictKeys.length > 0
      ? new RegExp(_dictKeys.map(escapeRegex).join('|'), 'g')
      : null;
  }

  // ─── Détection langue ─────────────────────────────────────────────────────
  function detectLang() {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return s;
    return (navigator.language || '').split('-')[0].toLowerCase() || DEFAULT;
  }

  // ─── Chargement langues actives ───────────────────────────────────────────
  async function loadLanguages() {
    try {
      const r = await fetch('/api/i18n/languages?_=' + Date.now());
      if (r.ok) _langs = (await r.json()).languages || [];
    } catch(e) {
      console.warn('[i18n v7] loadLanguages:', e);
      if (!_langs.length) _langs = [{ code: 'fr', name: 'Français', flag: '🇫🇷', sort_order: 1 }];
    }
    if (_lang !== DEFAULT && _langs.length && !_langs.find(l => l.code === _lang)) {
      _lang = DEFAULT;
      localStorage.setItem(STORAGE_KEY, DEFAULT);
      document.documentElement.setAttribute('lang', DEFAULT);
    }
  }

  // ─── Warm-up cache depuis JSON statique ───────────────────────────────────
  async function warmupCache(lang) {
    _cache.clear(); _dictRegex = null; _dictKeys = [];
    if (lang === DEFAULT) return;
    try {
      const r = await fetch('/static/locales/strings.' + lang + '.json?_=' + Date.now());
      if (r.ok) {
        const dict = await r.json();
        let count = 0;
        Object.entries(dict || {}).forEach(([fr, t]) => {
          if (fr && t && typeof t === 'string' && fr !== t) { _cache.set(fr, t); count++; }
        });
        if (count > 0) { rebuildRegex(); console.log('[i18n v7] warm-up "' + lang + '": ' + count); }
      }
    } catch(e) { /* pas de fichier pour les créoles */ }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STRATÉGIE 1 : data-i18n — Landing page SSR
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Applique les traductions sur tous les éléments [data-i18n] et [data-i18n-hero]
   * depuis le _cache. Collecte les manquants dans _missing pour le batch.
   */
  function applyDataI18n() {
    if (_lang === DEFAULT || !_ready) return;

    // ── 1. [data-i18n="texte FR"] → remplace textContent ──────────────────
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      if (_cache.has(key)) {
        el.textContent = _cache.get(key);
      } else if (key.length > 1 && !/^\d+([.,]\d+)?[%€$]?$/.test(key)) {
        _missing.add(key);
      }
    });

    // ── 2. [data-i18n-hero="texte FR"] → remplace innerHTML avec <br> ─────
    document.querySelectorAll('[data-i18n-hero]').forEach(el => {
      const key = el.getAttribute('data-i18n-hero');
      if (!key) return;
      if (_cache.has(key)) {
        const translated = _cache.get(key);
        // Reproduire le formatage avec <br> pour mobile
        el.innerHTML = translated.replace(/\./g, '.<br class="hidden md:block">');
      } else if (key.length > 1) {
        _missing.add(key);
      }
    });

    if (_missing.size > 0) scheduleBatch();
  }

  /**
   * Collecte TOUTES les clés [data-i18n] absentes du cache → batch forcé.
   * Utilisé pour les créoles et langues sans fichier warm-up.
   */
  function collectDataI18nMissing() {
    if (_lang === DEFAULT) return;
    document.querySelectorAll('[data-i18n], [data-i18n-hero]').forEach(el => {
      const key = el.getAttribute('data-i18n') || el.getAttribute('data-i18n-hero');
      if (key && key.length > 1 && !_cache.has(key) && !/^\d+([.,]\d+)?[%€$]?$/.test(key)) {
        _missing.add(key);
      }
    });
    if (_missing.size > 0) {
      console.log('[i18n v7] collecte data-i18n : ' + _missing.size + ' clés');
      scheduleBatch();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STRATÉGIE 2 : patchInnerHTML — Pages dynamiques (member-app.js)
  // ═══════════════════════════════════════════════════════════════════════════

  function translateHTML(html) {
    if (!html || _lang === DEFAULT || !_ready) return html;
    let hasMissing = false;
    html = html.replace(/>([^<]+)</g, (match, text) => {
      const t = text.trim();
      if (!t) return match;
      if (_cache.has(t)) return '>' + text.replace(t, _cache.get(t)) + '<';
      if (t.length > 1 && !/^\d+([.,]\d+)?[%€$]?$/.test(t)) { _missing.add(t); hasMissing = true; }
      return match;
    });
    html = html.replace(/\b(placeholder|title)=(['"])([^'"]+)\2/g, (match, attr, q, val) => {
      const t = val.trim();
      if (_cache.has(t)) return attr + '=' + q + _cache.get(t) + q;
      if (t.length > 1) { _missing.add(t); hasMissing = true; }
      return match;
    });
    if (hasMissing) scheduleBatch();
    return html;
  }

  function patchInnerHTML() {
    if (_patched) return;
    _patched = true;
    const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (!desc?.set) return;
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

  // ═══════════════════════════════════════════════════════════════════════════
  // BATCH DeepSeek
  // ═══════════════════════════════════════════════════════════════════════════

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
    if (texts.length === 0) return;

    console.log('[i18n v7] batch', texts.length, 'textes →', _lang);

    try {
      const resp = await fetch('/api/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, lang: _lang }),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const { translations = {} } = await resp.json();

      let newEntries = 0;
      Object.entries(translations).forEach(([fr, t]) => {
        if (fr && t && typeof t === 'string' && t !== fr) { _cache.set(fr, t); newEntries++; }
      });
      texts.forEach(t => { if (!_cache.has(t)) _cache.set(t, t); });

      if (newEntries > 0) {
        rebuildRegex();
        console.log('[i18n v7] +' + newEntries + ' traductions → mise à jour DOM');

        // Appliquer sur la landing (data-i18n)
        applyDataI18n();

        // Re-rendre les pages dynamiques (member-app.js)
        if (typeof showPage === 'function' && typeof currentPage !== 'undefined') {
          showPage(currentPage);
        }
      }
    } catch(e) {
      console.warn('[i18n v7] batch error:', e);
      texts.forEach(t => _cache.set(t, t));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Re-rendu page dynamique
  // ═══════════════════════════════════════════════════════════════════════════

  function rerenderPage() {
    if (typeof showPage === 'function' && typeof currentPage !== 'undefined') {
      showPage(currentPage);
    }
    // La landing est gérée par applyDataI18n(), pas besoin de TreeWalker
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Sélecteur de langue
  // ═══════════════════════════════════════════════════════════════════════════

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
    Object.assign(listEl.style, { maxHeight: '260px', overflowY: 'auto' });
    drop.appendChild(listEl);

    function renderList(filter) {
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      _langs.filter(l => !filter || l.name.toLowerCase().includes(filter) || l.code.startsWith(filter))
        .forEach(l => {
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
          item.addEventListener('mouseenter', () => { if (l.code !== _lang) item.style.background = 'rgba(255,255,255,0.08)'; });
          item.addEventListener('mouseleave', () => { item.style.background = l.code === _lang ? 'rgba(99,102,241,0.28)' : 'transparent'; });
          item.addEventListener('click', () => { switchLang(l.code); closeDrop(); });
          listEl.appendChild(item);
        });
    }
    renderList('');

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
    function openDrop() { drop.style.display = 'block'; open = true; searchInput.value = ''; renderList(''); setTimeout(() => searchInput.focus(), 40); }
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

  function startWatchdog() {
    setInterval(() => {
      if (!document.getElementById('i18n-lang-selector') && document.body) buildSelector();
    }, 1500);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Retour au français : restaurer les attributs data-i18n
  // ═══════════════════════════════════════════════════════════════════════════

  function restoreFR() {
    // Restaurer les éléments data-i18n depuis leur attribut (= texte FR)
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = el.getAttribute('data-i18n');
    });
    // Restaurer le hero title
    document.querySelectorAll('[data-i18n-hero]').forEach(el => {
      const key = el.getAttribute('data-i18n-hero');
      el.innerHTML = key.replace(/\./g, '.<br class="hidden md:block">');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Changement de langue
  // ═══════════════════════════════════════════════════════════════════════════

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
      await loadLanguages();
      _ready = true;
      updateSelectorBtn();
      restoreFR();
      // Si page dynamique → reload pour état propre
      if (typeof showPage === 'function') location.reload();
      return;
    }

    await loadLanguages();
    await warmupCache(lang);
    _ready = true;

    // Activer le patch pour les pages dynamiques
    patchInnerHTML();

    updateSelectorBtn();

    // ── ÉTAPE CLÉ : Appliquer immédiatement depuis le cache warm-up ─────────
    applyDataI18n();

    // ── Collecter TOUT ce qui manque (textes absents du warm-up JSON) ────────
    collectDataI18nMissing();

    // ── Pages dynamiques (member-app.js) ─────────────────────────────────────
    if (typeof showPage === 'function' && typeof currentPage !== 'undefined') {
      showPage(currentPage);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Init
  // ═══════════════════════════════════════════════════════════════════════════

  async function init() {
    _lang = detectLang();
    document.documentElement.setAttribute('lang', _lang);

    await loadLanguages();

    if (_lang !== DEFAULT) {
      await warmupCache(_lang);
    }

    _ready = true;
    patchInnerHTML();

    function inject() {
      buildSelector();
      startWatchdog();

      if (_lang !== DEFAULT) {
        // Appliquer immédiatement les traductions du warm-up
        applyDataI18n();

        // Collecter et batcher les textes absents du JSON statique
        collectDataI18nMissing();

        // Pages dynamiques : attendre le premier rendu de member-app.js
        setTimeout(() => {
          if (typeof showPage === 'function' && typeof currentPage !== 'undefined') {
            showPage(currentPage);
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
    switch:      switchLang,
    current:     () => _lang,
    langs:       () => _langs,
    supported:   () => _langs.map(l => l.code),
    cache:       () => _cache,
    stats:       () => ({ lang: _lang, cached: _cache.size, missing: _missing.size }),
    apply:       applyDataI18n,
    reloadLangs: async () => { await loadLanguages(); buildSelector(); },
    // Debug : forcer re-traduction complète
    retranslate: () => { applyDataI18n(); collectDataI18nMissing(); },
  };

  init();
})();
