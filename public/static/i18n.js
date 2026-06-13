/**
 * i18n.js v3 — Moteur de traduction multilingue — Leader Network
 *
 * Architecture : memCache (RAM) → KV Cloudflare → DeepSeek AI
 *
 * Flux :
 *   1. patch Element.prototype.innerHTML intercepte chaque rendu
 *   2. Les segments texte FR sont collectés par batch (rAF)
 *   3. POST /api/i18n/translate avec le batch complet
 *   4. Backend cherche dans KV, appelle DeepSeek si manquant
 *   5. Résultat stocké dans _memCache (Map) — 0ms pour les appels suivants
 *
 * Toutes les langues du monde supportées — zéro maintenance manuelle.
 * Termes protégés : BV, LEADER, Finstrategia, noms de rang MLM.
 */
(function () {
  'use strict';

  // ─── Config ────────────────────────────────────────────────────────────────
  const DEFAULT     = 'fr';
  const STORAGE_KEY = 'leader_lang';

  // Langues avec sélecteur rapide (les plus utilisées par les membres)
  const QUICK_LANGS = ['fr','en','es','pt','hi','de','ar','zh','it','ru'];

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
  };

  // ─── État ──────────────────────────────────────────────────────────────────
  let _lang     = DEFAULT;
  let _ready    = false;
  let _patched  = false;

  // Cache mémoire : Map<lang, Map<texteFR, texteTraduction>>
  const _memCache = new Map();

  // File d'attente de traduction (batch rAF)
  let _pendingTexts  = new Set();
  let _batchTimer    = null;
  let _batchCallbacks = new Map(); // texte → [resolve]

  // ─── Termes à ne JAMAIS traduire ──────────────────────────────────────────
  const PROTECTED = /\b(BV|LEADER|Finstrategia|Leader\s*Network|Pinnacle|Production|Fast\s*Start|KYC|PayPal|Stripe|USDT|TRON|TRC-?20|Manager|Captain|Mentor|Superviseur|Executive|President|Director|Visionary|Boss)\b/;

  // ─── Détection langue ──────────────────────────────────────────────────────
  function detectLang() {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return s;
    const n = (navigator.language || '').split('-')[0].toLowerCase();
    return n || DEFAULT;
  }

  // ─── Cache mémoire ─────────────────────────────────────────────────────────
  function getCached(lang, text) {
    const langMap = _memCache.get(lang);
    if (!langMap) return undefined;
    return langMap.get(text);
  }

  function setCached(lang, text, translation) {
    if (!_memCache.has(lang)) _memCache.set(lang, new Map());
    _memCache.get(lang).set(text, translation);
  }

  // ─── Traduction d'un texte (async, via batch) ──────────────────────────────
  function translateText(text) {
    if (_lang === DEFAULT || !text || !text.trim()) return Promise.resolve(text);

    // 1. Cache mémoire (0ms)
    const cached = getCached(_lang, text);
    if (cached !== undefined) return Promise.resolve(cached);

    // 2. Mettre en file d'attente pour le batch
    return new Promise((resolve) => {
      _pendingTexts.add(text);
      if (!_batchCallbacks.has(text)) _batchCallbacks.set(text, []);
      _batchCallbacks.get(text).push(resolve);
      scheduleBatch();
    });
  }

  // ─── Batch de traduction (envoi groupé) ────────────────────────────────────
  function scheduleBatch() {
    if (_batchTimer) return;
    _batchTimer = requestAnimationFrame ? requestAnimationFrame(flushBatch) : setTimeout(flushBatch, 50);
  }

  async function flushBatch() {
    _batchTimer = null;
    if (!_pendingTexts.size || _lang === DEFAULT) return;

    const texts = [..._pendingTexts];
    _pendingTexts.clear();

    // Filtrer les déjà cachés (arrivés pendant l'attente)
    const toFetch = texts.filter(t => getCached(_lang, t) === undefined);

    if (toFetch.length > 0) {
      try {
        const resp = await fetch('/api/i18n/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: toFetch, lang: _lang }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const translations = data?.translations || {};
          Object.entries(translations).forEach(([fr, translated]) => {
            setCached(_lang, fr, translated);
          });
          // Textes non traduits (erreur API) → retourner l'original
          toFetch.forEach(t => {
            if (getCached(_lang, t) === undefined) setCached(_lang, t, t);
          });
        }
      } catch (e) {
        console.warn('[i18n] batch error:', e);
        toFetch.forEach(t => setCached(_lang, t, t));
      }
    }

    // Résoudre les callbacks
    texts.forEach(text => {
      const translation = getCached(_lang, text) ?? text;
      const callbacks = _batchCallbacks.get(text) || [];
      callbacks.forEach(cb => cb(translation));
      _batchCallbacks.delete(text);
    });

    // Appliquer les traductions au DOM
    applyPendingDOM();
  }

  // ─── Segments de texte à traduire ─────────────────────────────────────────
  // Nœuds DOM en attente de traduction
  const _domPending = new Set(); // Set<TextNode ou Element>

  function applyPendingDOM() {
    if (_lang === DEFAULT || !_ready) return;
    _domPending.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const raw = node._i18n_original || node.textContent;
        const cached = getCached(_lang, raw.trim());
        if (cached !== undefined && cached !== raw.trim()) {
          node._i18n_original = raw;
          node.textContent = raw.replace(raw.trim(), cached);
        }
      }
    });
    _domPending.clear();
  }

  // ─── Traduction synchrone (depuis le cache) ou déclenchement async ─────────
  // Retourne le texte traduit si en cache, sinon déclenche une traduction async
  // et retourne l'original (sera mis à jour via DOM walk plus tard)
  function applyDict(text) {
    if (_lang === DEFAULT || !text || !text.trim()) return text;
    const trimmed = text.trim();
    const cached = getCached(_lang, trimmed);
    if (cached !== undefined) {
      return text.replace(trimmed, cached);
    }
    // Programmer la traduction async
    translateText(trimmed);
    return text;
  }

  // ─── Remplacement dans une string HTML ─────────────────────────────────────
  function translateHTML(html) {
    if (!html || _lang === DEFAULT || !_ready) return html;

    // 1. Textes visibles entre balises
    html = html.replace(/>([^<]+)</g, function(match, text) {
      if (!text.trim()) return match;
      return '>' + applyDict(text) + '<';
    });

    // 2. Attributs placeholder / title / value
    html = html.replace(/\b(placeholder|title|value)=(['"])([^'"]+)\2/g,
      function(match, attr, q, val) {
        const t = applyDict(val);
        return t !== val ? attr + '=' + q + t + q : match;
      }
    );

    return html;
  }

  // ─── Patch de innerHTML ────────────────────────────────────────────────────
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

  // ─── Traduit le DOM existant ───────────────────────────────────────────────
  function translateExistingDOM_el(root) {
    if (_lang === DEFAULT || !_ready) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const p = node.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          if (['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
          if (p.closest('#i18n-lang-selector')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);

    // Collecter tous les textes uniques
    const textsToTranslate = [];
    nodes.forEach(node => {
      const raw = node.textContent;
      if (!raw || !raw.trim()) return;
      const trimmed = raw.trim();
      if (getCached(_lang, trimmed) === undefined) {
        textsToTranslate.push(trimmed);
        _pendingTexts.add(trimmed);
      }
    });

    // Appliquer ce qui est déjà en cache, planifier le reste
    nodes.forEach(node => {
      const raw = node.textContent;
      if (!raw || !raw.trim()) return;
      const trimmed = raw.trim();
      const cached = getCached(_lang, trimmed);
      if (cached !== undefined && cached !== trimmed) {
        node.textContent = raw.replace(trimmed, cached);
      } else if (cached === undefined) {
        _domPending.add(node);
      }
    });

    // Traduire les attributs placeholder/title
    root.querySelectorAll('[placeholder],[title]').forEach(el => {
      ['placeholder','title'].forEach(attr => {
        const v = el.getAttribute(attr);
        if (v) {
          const cached = getCached(_lang, v);
          if (cached !== undefined && cached !== v) {
            el.setAttribute(attr, cached);
          } else if (cached === undefined) {
            _pendingTexts.add(v);
          }
        }
      });
    });

    if (textsToTranslate.length > 0) scheduleBatch();
  }

  function translateExistingDOM() {
    translateExistingDOM_el(document.body);
  }

  function translateSidebar() {
    if (_lang === DEFAULT || !_ready) return;
    const sidebar = document.getElementById('sidebar');
    if (sidebar) translateExistingDOM_el(sidebar);
    const header = document.querySelector('header') || document.querySelector('.header');
    if (header) translateExistingDOM_el(header);
    document.querySelectorAll('.nav-btn').forEach(btn => {
      [...btn.childNodes].forEach(cn => {
        if (cn.nodeType === Node.TEXT_NODE) {
          const raw = cn.textContent.trim();
          if (raw) {
            const cached = getCached(_lang, raw);
            if (cached !== undefined && cached !== raw) {
              cn.textContent = ' ' + cached;
            } else if (cached === undefined) {
              _pendingTexts.add(raw);
              scheduleBatch();
            }
          }
        }
      });
    });
  }

  // ─── Pré-charge les traductions depuis strings.en.json (warm-up) ──────────
  // Cela évite le cold-start : les textes les plus fréquents sont en memCache
  // avant même le premier rendu du DOM.
  async function warmupCache(lang) {
    if (lang === DEFAULT) return;
    // Essayer strings.{lang}.json (fallback statique existant)
    try {
      const r = await fetch('/static/locales/strings.' + lang + '.json?_=' + Date.now());
      if (r.ok) {
        const dict = await r.json();
        if (dict && typeof dict === 'object') {
          Object.entries(dict).forEach(([fr, translated]) => {
            if (fr && translated && fr !== translated) {
              setCached(lang, fr, translated);
            }
          });
          console.log('[i18n v3] warm-up cache "' + lang + '" → ' + Object.keys(dict).length + ' entrées');
        }
      }
    } catch(e) {
      // Pas de fichier statique → normal pour les nouvelles langues
    }
  }

  // ─── Sélecteur de langue ───────────────────────────────────────────────────
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

    // Dropdown
    const drop = document.createElement('div');
    drop.id = 'i18n-lang-dropdown';
    Object.assign(drop.style, {
      position: 'absolute', bottom: 'calc(100% + 8px)', right: '0',
      background: 'rgba(10,15,30,0.97)',
      border: '1px solid rgba(255,255,255,0.13)',
      borderRadius: '12px', overflow: 'hidden',
      minWidth: '180px', display: 'none',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    });

    // Input de recherche langue
    const searchWrap = document.createElement('div');
    Object.assign(searchWrap.style, { padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' });
    const searchInput = document.createElement('input');
    searchInput.placeholder = '🔍 Langue / Language';
    Object.assign(searchInput.style, {
      width: '100%', background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
      color: '#f1f5f9', padding: '5px 8px', fontSize: '12px', boxSizing: 'border-box',
    });
    searchWrap.appendChild(searchInput);
    drop.appendChild(searchWrap);

    // Liste des langues rapides
    const listEl = document.createElement('div');
    Object.assign(listEl.style, { maxHeight: '240px', overflowY: 'auto' });
    drop.appendChild(listEl);

    function renderList(filter) {
      listEl.innerHTML = '';
      const entries = Object.entries(META).filter(([code, m]) =>
        !filter || m.name.toLowerCase().includes(filter) || code.includes(filter)
      );
      entries.forEach(([lang, m]) => {
        const item = document.createElement('button');
        item.setAttribute('data-lang', lang);
        item.textContent = m.flag + '  ' + m.name;
        Object.assign(item.style, {
          display: 'block', width: '100%',
          padding: '9px 16px',
          background: lang === _lang ? 'rgba(99,102,241,0.25)' : 'transparent',
          color: '#f1f5f9', border: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          cursor: 'pointer', textAlign: 'left',
          fontSize: '13px',
          fontWeight: lang === _lang ? '700' : '400',
        });
        item.addEventListener('mouseenter', () => {
          if (lang !== _lang) item.style.background = 'rgba(255,255,255,0.08)';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = lang === _lang ? 'rgba(99,102,241,0.25)' : 'transparent';
        });
        item.addEventListener('click', () => { switchLang(lang); closeDrop(); });
        listEl.appendChild(item);
      });
    }
    renderList('');

    searchInput.addEventListener('input', () => {
      renderList(searchInput.value.trim().toLowerCase());
    });

    // Bouton principal
    const btn = document.createElement('button');
    btn.id = 'i18n-lang-btn';
    const cm = META[_lang] || { flag: '🌐', name: _lang.toUpperCase() };
    btn.textContent = cm.flag + ' ' + cm.name;
    Object.assign(btn.style, {
      padding: '8px 14px', borderRadius: '24px',
      background: 'rgba(10,15,30,0.92)',
      color: '#f1f5f9',
      border: '1px solid rgba(255,255,255,0.15)',
      cursor: 'pointer', whiteSpace: 'nowrap',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      fontSize: '13px', fontWeight: '500',
    });

    let open = false;
    function openDrop()  {
      drop.style.display = 'block'; open = true;
      searchInput.value = ''; renderList('');
      setTimeout(() => searchInput.focus(), 50);
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
    const m = META[_lang] || { flag: '🌐', name: _lang.toUpperCase() };
    btn.textContent = m.flag + ' ' + m.name;
  }

  // ─── Watchdog ──────────────────────────────────────────────────────────────
  function startWatchdog() {
    setInterval(() => {
      if (!document.getElementById('i18n-lang-selector') && document.body) {
        buildSelector();
      }
    }, 1500);
  }

  // ─── Changement de langue ──────────────────────────────────────────────────
  async function switchLang(lang) {
    if (lang === _lang) return;

    _lang  = lang;
    _ready = false;
    _memCache.clear(); // Vider le cache pour éviter les mélanges
    _pendingTexts.clear();
    _batchCallbacks.clear();
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);

    if (lang === DEFAULT) {
      _ready = true;
      updateSelectorBtn();
      location.reload();
      return;
    }

    // Warm-up depuis fichier statique (si disponible)
    await warmupCache(lang);
    _ready = true;
    updateSelectorBtn();

    // Appliquer au DOM actuel
    translateSidebar();
    translateExistingDOM();

    // Forcer re-rendu via member-app.js si disponible
    if (typeof showPage === 'function' && typeof currentPage !== 'undefined') {
      showPage(currentPage);
    }
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  async function init() {
    _lang = detectLang();
    document.documentElement.setAttribute('lang', _lang);

    // Patch innerHTML en premier (avant tout rendu)
    patchInnerHTML();

    // Warm-up cache si langue non-FR
    if (_lang !== DEFAULT) {
      await warmupCache(_lang);
    }
    _ready = true;

    function inject() {
      buildSelector();
      startWatchdog();
      if (_lang !== DEFAULT) {
        setTimeout(() => {
          translateSidebar();
          translateExistingDOM();
          if (typeof showPage === 'function' && typeof currentPage !== 'undefined') {
            showPage(currentPage);
          }
        }, 400);
      }
    }

    if (document.body) {
      inject();
    } else {
      document.addEventListener('DOMContentLoaded', inject);
    }
  }

  // ─── API publique ──────────────────────────────────────────────────────────
  window.t    = (key) => key;
  window.i18n = {
    switch:    switchLang,
    current:   () => _lang,
    supported: Object.keys(META),
    meta:      META,
    cache:     _memCache,  // Debug : accès au cache mémoire
    // Méthode utilitaire pour pré-charger une traduction depuis l'extérieur
    preload:   (texts) => {
      if (_lang === DEFAULT) return Promise.resolve({});
      return fetch('/api/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, lang: _lang }),
      }).then(r => r.json()).then(d => {
        Object.entries(d.translations || {}).forEach(([fr, t]) => setCached(_lang, fr, t));
        return d.translations;
      });
    },
  };

  init();
})();
