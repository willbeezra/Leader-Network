/**
 * i18n.js v2 — Moteur de traduction multilingue — Leader Network
 *
 * Stratégie : patch de Element.prototype.innerHTML pour intercepter
 * chaque rendu de member-app.js et remplacer les strings FR → cible.
 *
 * Langues : FR · EN · ES · PT · HI · DE
 * Zero modification de member-app.js ou index.tsx (sauf 1 <script>).
 */
(function () {
  'use strict';

  // ─── Config ────────────────────────────────────────────────────────────────
  const SUPPORTED   = ['fr','en','es','pt','hi','de'];
  const DEFAULT     = 'fr';
  const STORAGE_KEY = 'leader_lang';
  const META = {
    fr: { name: 'Français',  flag: '🇫🇷' },
    en: { name: 'English',   flag: '🇬🇧' },
    es: { name: 'Español',   flag: '🇪🇸' },
    pt: { name: 'Português', flag: '🇧🇷' },
    hi: { name: 'हिंदी',      flag: '🇮🇳' },
    de: { name: 'Deutsch',   flag: '🇩🇪' },
  };

  // ─── État ──────────────────────────────────────────────────────────────────
  let _lang    = DEFAULT;
  let _dict    = {};   // { "texte fr": "texte traduit" }
  let _ready   = false;
  let _patched = false;

  // ─── Détection langue ──────────────────────────────────────────────────────
  function detectLang() {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s && SUPPORTED.includes(s)) return s;
    const n = (navigator.language || '').split('-')[0].toLowerCase();
    if (SUPPORTED.includes(n)) return n;
    return DEFAULT;
  }

  // ─── Chargement locale ─────────────────────────────────────────────────────
  async function loadLocale(lang) {
    if (lang === DEFAULT) return {};
    try {
      const r = await fetch('/static/locales/' + lang + '.json?_=' + Date.now());
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch(e) {
      console.warn('[i18n] locale "' + lang + '" introuvable:', e.message);
      return null;
    }
  }

  // ─── Construit le dictionnaire de remplacement ────────────────────────────
  // Double source :
  //   1. fr.json + {lang}.json  (clés structurées)
  //   2. strings.{lang}.json    (mapping direct FR→cible des strings exactes de member-app.js)
  // Les strings.{lang}.json ont priorité (écrasent les entrées structurées si conflit).
  async function buildDict(lang) {
    if (lang === DEFAULT) { _dict = {}; return; }

    const ts = Date.now();
    const [fr, target, stringsMap] = await Promise.all([
      fetch('/static/locales/fr.json?_=' + ts).then(r => r.json()).catch(() => null),
      loadLocale(lang),
      fetch('/static/locales/strings.' + lang + '.json?_=' + ts).then(r => r.json()).catch(() => ({}))
    ]);

    _dict = {};

    // 1. Mapping structuré fr.json → {lang}.json
    if (fr && target) {
      (function walk(frObj, tObj) {
        for (const k in frObj) {
          if (typeof frObj[k] === 'object') {
            if (tObj && typeof tObj[k] === 'object') walk(frObj[k], tObj[k]);
          } else {
            const frVal = frObj[k];
            const tVal  = tObj && tObj[k];
            if (frVal && tVal && frVal !== tVal) _dict[frVal] = tVal;
          }
        }
      })(fr, target);
    }

    // 2. Mapping direct (strings.{lang}.json) — priorité maximale
    if (stringsMap && typeof stringsMap === 'object') {
      Object.assign(_dict, stringsMap);
    }

    console.log('[i18n] dict chargé pour "' + lang + '" — ' + Object.keys(_dict).length + ' entrées');
  }

  // ─── Remplacement d'un segment texte via le dict ─────────────────────────
  function applyDict(text) {
    let result = text;
    for (const fr in _dict) {
      if (result.includes(fr)) result = result.split(fr).join(_dict[fr]);
    }
    return result;
  }

  // ─── Remplacement dans une string HTML ────────────────────────────────────
  // Couvre :  >texte visible<   +  placeholder="..."  title="..."  value="..."
  function translateHTML(html) {
    if (!html || _lang === DEFAULT || !_ready) return html;

    // 1. Textes visibles entre balises
    html = html.replace(/>([^<]+)</g, function(match, text) {
      if (!text.trim()) return match;
      return '>' + applyDict(text) + '<';
    });

    // 2. Attributs placeholder / title / value (guillemets doubles ou simples)
    html = html.replace(/\b(placeholder|title|value)=(['"])([^'"]+)\2/g,
      function(match, attr, q, val) {
        const t = applyDict(val);
        return t !== val ? attr + '=' + q + t + q : match;
      }
    );

    return html;
  }

  // ─── Patch de innerHTML ────────────────────────────────────────────────────
  // On intercepte chaque assignation innerHTML sur n'importe quel élément
  // (sauf le sélecteur de langue lui-même)
  function patchInnerHTML() {
    if (_patched) return;
    _patched = true;

    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (!descriptor || !descriptor.set) return;

    const originalSet = descriptor.set;

    Object.defineProperty(Element.prototype, 'innerHTML', {
      get: descriptor.get,
      set: function(val) {
        // Ne pas intercepter notre propre sélecteur
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

  // ─── Traduit le DOM existant (première application) ───────────────────────
  function translateExistingDOM() {
    if (_lang === DEFAULT || !_ready) return;

    // Parcourir tous les nœuds texte du body
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const p = node.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          const tag = p.tagName;
          if (['SCRIPT','STYLE','NOSCRIPT'].includes(tag)) return NodeFilter.FILTER_REJECT;
          if (p.closest('#i18n-lang-selector')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach(node => {
      const raw = node.textContent;
      if (!raw || !raw.trim()) return;
      const result = applyDict(raw);
      if (result !== raw) node.textContent = result;
    });

    // Traduire aussi les attributs placeholder/title/value
    document.body.querySelectorAll('[placeholder],[title]').forEach(el => {
      ['placeholder','title'].forEach(attr => {
        const v = el.getAttribute(attr);
        if (v) { const t = applyDict(v); if (t !== v) el.setAttribute(attr, t); }
      });
    });
  }

  // ─── Traduit la sidebar statique (index.tsx) ──────────────────────────────
  // La sidebar est générée côté serveur avec des textes FR hardcodés
  function translateSidebar() {
    if (_lang === DEFAULT || !_ready) return;

    // Boutons nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      // Le texte est après l'icône <i> — on cherche le dernier nœud texte
      const childNodes = [...btn.childNodes];
      childNodes.forEach(cn => {
        if (cn.nodeType === Node.TEXT_NODE) {
          const raw = cn.textContent.trim();
          if (raw) { const t = applyDict(raw); if (t !== raw) cn.textContent = ' ' + t; }
        }
      });
    });

    // Tous les nœuds texte dans la sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) translateExistingDOM_el(sidebar);

    // Header
    const header = document.querySelector('header') || document.querySelector('.header');
    if (header) translateExistingDOM_el(header);
  }

  function translateExistingDOM_el(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const p = node.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          if (['SCRIPT','STYLE'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
          if (p.closest('#i18n-lang-selector')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(node => {
      const raw = node.textContent;
      if (!raw || !raw.trim()) return;
      const result = applyDict(raw);
      if (result !== raw) node.textContent = result;
    });
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

    // Dropdown (au-dessus du bouton)
    const drop = document.createElement('div');
    drop.id = 'i18n-lang-dropdown';
    Object.assign(drop.style, {
      position: 'absolute', bottom: 'calc(100% + 8px)', right: '0',
      background: 'rgba(10,15,30,0.97)',
      border: '1px solid rgba(255,255,255,0.13)',
      borderRadius: '12px', overflow: 'hidden',
      minWidth: '170px', display: 'none',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    });

    SUPPORTED.forEach(lang => {
      const m = META[lang];
      const item = document.createElement('button');
      item.setAttribute('data-lang', lang);
      item.textContent = m.flag + '  ' + m.name;
      Object.assign(item.style, {
        display: 'block', width: '100%',
        padding: '10px 16px',
        background: lang === _lang ? 'rgba(99,102,241,0.25)' : 'transparent',
        color: '#f1f5f9', border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
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
      drop.appendChild(item);
    });
    if (drop.lastElementChild) drop.lastElementChild.style.borderBottom = 'none';

    // Bouton principal
    const btn = document.createElement('button');
    btn.id = 'i18n-lang-btn';
    const cm = META[_lang] || META[DEFAULT];
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
    function openDrop()  { drop.style.display = 'block'; open = true; }
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
    const m = META[_lang] || META[DEFAULT];
    btn.textContent = m.flag + ' ' + m.name;
    document.querySelectorAll('#i18n-lang-dropdown button[data-lang]').forEach(el => {
      const l = el.getAttribute('data-lang');
      el.style.background  = l === _lang ? 'rgba(99,102,241,0.25)' : 'transparent';
      el.style.fontWeight  = l === _lang ? '700' : '400';
    });
  }

  // ─── Watchdog ──────────────────────────────────────────────────────────────
  function startWatchdog() {
    setInterval(() => {
      if (!document.getElementById('i18n-lang-selector') && document.body) {
        buildSelector();
      }
    }, 1500);
  }

  // ─── Changement de langue ─────────────────────────────────────────────────
  async function switchLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT;
    if (lang === _lang) return;

    _lang  = lang;
    _ready = false;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);

    if (lang === DEFAULT) {
      _dict  = {};
      _ready = true;
      updateSelectorBtn();
      // Recharger pour restaurer les textes FR originaux
      location.reload();
      return;
    }

    await buildDict(lang);
    _ready = true;
    updateSelectorBtn();

    // Appliquer au DOM actuel
    translateSidebar();
    translateExistingDOM();

    // Forcer le re-rendu de la page courante via member-app.js
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

    // Construire le dictionnaire si nécessaire
    if (_lang !== DEFAULT) {
      await buildDict(_lang);
    }
    _ready = true;

    // Injecter le sélecteur dès que le body est disponible
    function inject() {
      buildSelector();
      startWatchdog();
      if (_lang !== DEFAULT) {
        // Attendre que member-app.js ait rendu l'interface (~300ms)
        setTimeout(() => {
          translateSidebar();
          translateExistingDOM();
          // Forcer re-rendu page courante
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
  window.t    = (key) => key; // stub — les traductions passent par le dict
  window.i18n = {
    switch:    switchLang,
    current:   () => _lang,
    supported: SUPPORTED,
    meta:      META,
  };

  init();
})();
