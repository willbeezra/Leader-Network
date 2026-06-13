/**
 * i18n.js — Moteur de traduction multilingue
 * Leader Network — Member Backoffice
 *
 * Langues supportées : FR · EN · ES · PT · HI · DE
 * Architecture : chargement JSON externe, window.t(), MutationObserver
 * Aucune modification de member-app.js requise.
 */

(function () {
  'use strict';

  // ─── Configuration ────────────────────────────────────────────────────────

  const SUPPORTED_LANGS = ['fr', 'en', 'es', 'pt', 'hi', 'de'];
  const DEFAULT_LANG    = 'fr';
  const STORAGE_KEY     = 'leader_lang';
  const LOCALES_PATH    = '/static/locales/';

  const LANG_META = {
    fr: { name: 'Français',    flag: '🇫🇷' },
    en: { name: 'English',     flag: '🇬🇧' },
    es: { name: 'Español',     flag: '🇪🇸' },
    pt: { name: 'Português',   flag: '🇧🇷' },
    hi: { name: 'हिंदी',        flag: '🇮🇳' },
    de: { name: 'Deutsch',     flag: '🇩🇪' },
  };

  // ─── État interne ─────────────────────────────────────────────────────────

  let _translations = {};   // Traductions aplaties { 'section.key': 'valeur' }
  let _currentLang  = DEFAULT_LANG;
  let _observer     = null;
  let _selectorEl   = null;

  // ─── Détection de langue ──────────────────────────────────────────────────

  function detectLang() {
    // 1. localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGS.includes(stored)) return stored;

    // 2. Navigator language
    const nav = (navigator.language || navigator.userLanguage || '').split('-')[0].toLowerCase();
    if (SUPPORTED_LANGS.includes(nav)) return nav;

    // 3. Default
    return DEFAULT_LANG;
  }

  // ─── Aplatissement récursif des clés JSON ─────────────────────────────────

  function flattenObject(obj, prefix, result) {
    prefix = prefix || '';
    result = result || {};
    for (var key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      var fullKey = prefix ? prefix + '.' + key : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        flattenObject(obj[key], fullKey, result);
      } else {
        result[fullKey] = obj[key];
      }
    }
    return result;
  }

  // ─── Chargement du fichier locale ─────────────────────────────────────────

  async function loadLocale(lang) {
    try {
      const url = LOCALES_PATH + lang + '.json?v=' + (window._i18nVersion || Date.now());
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      return flattenObject(data);
    } catch (e) {
      console.warn('[i18n] Impossible de charger la locale "' + lang + '":', e.message);
      return null;
    }
  }

  // ─── Fonction de traduction principale ────────────────────────────────────

  /**
   * t('section.key') → 'Texte traduit'
   * t('dashboard.hello', { name: 'Alice' }) → 'Bonjour, Alice !'
   */
  function t(key, vars) {
    var val = _translations[key];
    if (val === undefined || val === '') {
      // Fallback : retourner la dernière partie de la clé
      return key.split('.').pop();
    }
    if (vars && typeof vars === 'object') {
      // Interpolation : {name} → vars.name
      val = val.replace(/\{(\w+)\}/g, function (_, k) {
        return vars[k] !== undefined ? vars[k] : '{' + k + '}';
      });
    }
    return val;
  }

  // ─── Application des traductions au DOM ───────────────────────────────────

  /**
   * Stratégie de traduction DOM :
   * On scanne les éléments avec [data-i18n] (ajoutés dynamiquement par member-app.js)
   * + on effectue un remplacement basé sur un mapping texte→clé pour les textes
   *   générés par member-app.js qui n'ont pas encore d'attribut data-i18n.
   */

  // Mapping texte source FR → clé i18n (pour les textes hardcodés dans member-app.js)
  // On utilise l'approche "textContent exact" pour cibler des éléments précis.
  const TEXT_MAP = {
    // Navigation
    'Tableau de bord':  'nav.dashboard',
    'Portefeuille':     'nav.wallet',
    'Commissions':      'nav.commissions',
    'Mon Réseau':       'nav.network',
    'Boutique':         'nav.shop',
    'Mon Profil':       'nav.profile',
    'Support':          'nav.support',
    'Déconnexion':      'nav.logout',
    // Wallet labels
    'Portefeuille Principal': 'wallet.principal',
    'Wallet en Attente':      'wallet.pending',
    'Crédit de Croissance':   'wallet.cc',
    'Réserve Stratégique':    'wallet.rs',
    'Wallet Luxia':           'wallet.luxia',
    // Common labels
    'Solde':            'wallet.balance',
    'Disponible':       'wallet.available',
    'Chargement...':    'common.loading',
    'Aucune transaction pour ce wallet.': 'wallet.no_transactions',
    'Voir l\'historique': 'wallet.see_history',
    'Retirer':          'wallet.withdraw',
    'Déposer':          'wallet.deposit',
    'Transférer':       'wallet.transfer',
    // Auth page
    'Connexion':            'auth.title_login',
    'Se souvenir de moi':   'auth.remember_me',
    'Mot de passe oublié ?':'auth.forgot_password',
    'Se connecter':         'auth.btn_login',
    'Pas encore de compte ?': 'auth.no_account',
    'S\'inscrire':          'auth.register_link',
    'Déjà un compte ?':     'auth.already_account',
    // Commissions
    'Mes Commissions':      'commissions.title',
    'Commissions':          'commissions.tab_commissions',
    'En cours de versement':'commissions.tab_pending',
    'Aucune commission pour le moment': 'commissions.no_commissions',
    // Network
    'Mon Réseau':           'network.title',
    'Arbre Binaire':        'network.tab_binary',
    'Filleuls':             'network.tab_downline',
    'Statistiques':         'network.tab_stats',
    // Dashboard
    'Voir portefeuille':    'dashboard.see_wallet',
    'Voir mes commissions': 'dashboard.see_commissions',
    'Actions rapides':      'dashboard.quick_actions',
    'Mon parrain':          'dashboard.my_sponsor',
    // Common actions
    'Retour':       'common.back',
    'Suivant':      'common.next',
    'Annuler':      'common.cancel',
    'Confirmer':    'common.confirm',
    'Fermer':       'common.close',
    'Enregistrer':  'common.save',
    'Modifier':     'common.edit',
    'Supprimer':    'common.delete',
    'Rechercher':   'common.search',
    'Tous':         'common.all',
    'Erreur':       'common.error',
    'Réessayer':    'common.retry',
    'Copier':       'common.copy',
    'Partager':     'common.share',
    // Password strength
    'Trop faible':  'register.pwd_too_weak',
    'Faible':       'register.pwd_weak',
    'Correct':      'register.pwd_ok',
    'Fort':         'register.pwd_strong',
    // Status labels
    'En attente':   'commissions.status_pending',
    'Approuvée':    'commissions.status_approved',
    'Payée':        'commissions.status_paid',
    'Annulée':      'commissions.status_cancelled',
    // Commission types
    'Prime de Leadership':        'commissions.type_prime_leadership',
    'Bonus d\'Influence':         'commissions.type_bonus_influence',
    'Bonus de Rayonnement':       'commissions.type_bonus_rayonnement',
    'Valorisation Recommandation':'commissions.type_valorisation_reco',
    'Fast Start Bonus':           'commissions.type_fast_start',
    // Support
    'Support':          'nav.support',
    'Mes tickets':      'support.tab_tickets',
    'Nouveau ticket':   'support.tab_new',
    'FAQ':              'support.tab_faq',
    'Envoyer':          'support.btn_send',
    'Aucun ticket pour le moment': 'support.no_tickets',
    // Profile
    'Mon Profil':           'profile.title',
    'Informations personnelles': 'profile.tab_personal',
    'Sécurité':             'profile.tab_security',
    'Vérification KYC':     'profile.tab_kyc',
    'Méthodes de paiement': 'profile.tab_payment',
    // Shop
    'Boutique':             'shop.title',
    'Licence LEADER':       'shop.license_title',
    'Acheter':              'shop.btn_buy',
    'Renouveler':           'shop.btn_renew',
  };

  // Construit un index inverse : texte FR normalisé → clé
  // (comparaison insensible à la casse et aux espaces superflus)
  const _textIndex = {};
  (function buildTextIndex() {
    for (var fr in TEXT_MAP) {
      _textIndex[fr.trim()] = TEXT_MAP[fr];
    }
  })();

  /**
   * Traduit le contenu text d'un nœud texte si on trouve une correspondance.
   */
  function translateTextNode(node) {
    var raw = node.textContent;
    if (!raw) return;
    var trimmed = raw.trim();
    if (!trimmed) return;

    // Correspondance exacte
    var key = _textIndex[trimmed];
    if (key) {
      var translated = t(key);
      if (translated !== trimmed) {
        node.textContent = raw.replace(trimmed, translated);
      }
      return;
    }
  }

  /**
   * Traduit les attributs placeholder, title, aria-label d'un élément.
   */
  function translateAttributes(el) {
    ['placeholder', 'title', 'aria-label'].forEach(function (attr) {
      var val = el.getAttribute(attr);
      if (!val) return;
      var trimmed = val.trim();
      var key = _textIndex[trimmed];
      if (key) {
        var translated = t(key);
        if (translated !== trimmed) el.setAttribute(attr, translated);
      }
    });
  }

  /**
   * Applique les traductions via [data-i18n] (approche explicite)
   * Format : data-i18n="section.key" ou data-i18n="attr:placeholder:section.key"
   */
  function applyDataI18n(root) {
    var els = (root || document).querySelectorAll('[data-i18n]');
    els.forEach(function (el) {
      var directive = el.getAttribute('data-i18n');
      if (!directive) return;

      // Format "attr:placeholder:key" ou juste "key"
      if (directive.startsWith('attr:')) {
        var parts = directive.split(':');
        // parts = ['attr', attrName, key]
        if (parts.length >= 3) {
          var attrName = parts[1];
          var key = parts.slice(2).join(':');
          el.setAttribute(attrName, t(key));
        }
      } else {
        el.textContent = t(directive);
      }
    });
  }

  /**
   * Scanner complet du DOM : applique les deux stratégies.
   */
  function translateDOM(root) {
    if (_currentLang === DEFAULT_LANG) return; // FR : pas de traduction nécessaire

    root = root || document.body;
    if (!root) return;

    // 1. Éléments avec data-i18n explicites
    applyDataI18n(root);

    // 2. Scan des nœuds texte
    var walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          var parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          var tag = parent.tagName;
          // Ignorer scripts, styles, iframes
          if (['SCRIPT', 'STYLE', 'IFRAME', 'NOSCRIPT'].indexOf(tag) !== -1)
            return NodeFilter.FILTER_REJECT;
          // Ignorer le sélecteur de langue lui-même
          if (parent.closest && parent.closest('#i18n-lang-selector'))
            return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    var nodes = [];
    var node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(translateTextNode);

    // 3. Attributs (placeholder, title, aria-label)
    var allEls = root.querySelectorAll('[placeholder],[title],[aria-label]');
    allEls.forEach(translateAttributes);
  }

  // ─── MutationObserver — écoute les changements de DOM ─────────────────────

  function startObserver() {
    if (_observer) _observer.disconnect();

    _observer = new MutationObserver(function (mutations) {
      // Watchdog : réinjecter le sélecteur s'il a été supprimé
      if (!document.getElementById('i18n-lang-selector')) {
        buildSelector();
      }

      if (_currentLang === DEFAULT_LANG) return;

      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function (added) {
            if (added.nodeType === Node.ELEMENT_NODE) {
              // Ignorer les mutations du sélecteur lui-même
              if (added.id === 'i18n-lang-selector') return;
              // Délai court pour laisser member-app.js finir de rendre
              setTimeout(function () { translateDOM(added); }, 30);
            }
          });
        }
      });
    });

    _observer.observe(document.body, {
      childList: true,
      subtree:   true
    });
  }

  // ─── Watchdog timer — garantit la présence du sélecteur ─────────────────

  function startWatchdog() {
    // Vérifie toutes les 2s que le sélecteur est toujours dans le DOM
    setInterval(function () {
      if (!document.getElementById('i18n-lang-selector') && document.body) {
        buildSelector();
      }
    }, 2000);
  }

  // ─── Sélecteur de langue ───────────────────────────────────────────────────

  function buildSelector() {
    // Éviter les doublons
    var existing = document.getElementById('i18n-lang-selector');
    if (existing) existing.remove();

    var container = document.createElement('div');
    container.id = 'i18n-lang-selector';
    container.setAttribute('aria-label', 'Language selector');

    // Styles inline pour fonctionner sans CSS externe
    Object.assign(container.style, {
      position:   'fixed',
      bottom:     '20px',
      right:      '20px',
      zIndex:     '99999',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize:   '13px',
    });

    // Bouton toggle
    var btn = document.createElement('button');
    btn.id = 'i18n-lang-btn';
    var meta = LANG_META[_currentLang] || LANG_META[DEFAULT_LANG];
    btn.textContent = meta.flag + ' ' + meta.name;
    Object.assign(btn.style, {
      display:         'flex',
      alignItems:      'center',
      gap:             '6px',
      padding:         '8px 14px',
      background:      'rgba(15, 23, 42, 0.92)',
      color:           '#f1f5f9',
      border:          '1px solid rgba(255,255,255,0.12)',
      borderRadius:    '24px',
      cursor:          'pointer',
      backdropFilter:  'blur(8px)',
      boxShadow:       '0 4px 20px rgba(0,0,0,0.3)',
      transition:      'all 0.2s ease',
      whiteSpace:      'nowrap',
      fontSize:        '13px',
      fontWeight:      '500',
    });

    btn.addEventListener('mouseenter', function () {
      btn.style.background = 'rgba(30, 41, 59, 0.96)';
      btn.style.borderColor = 'rgba(255,255,255,0.25)';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.background = 'rgba(15, 23, 42, 0.92)';
      btn.style.borderColor = 'rgba(255,255,255,0.12)';
    });

    // Dropdown
    var dropdown = document.createElement('div');
    dropdown.id = 'i18n-lang-dropdown';
    Object.assign(dropdown.style, {
      position:        'absolute',
      bottom:          'calc(100% + 8px)',
      right:           '0',
      background:      'rgba(15, 23, 42, 0.96)',
      border:          '1px solid rgba(255,255,255,0.12)',
      borderRadius:    '12px',
      overflow:        'hidden',
      display:         'none',
      minWidth:        '160px',
      boxShadow:       '0 8px 32px rgba(0,0,0,0.4)',
      backdropFilter:  'blur(12px)',
    });

    SUPPORTED_LANGS.forEach(function (lang) {
      var lm = LANG_META[lang];
      var item = document.createElement('button');
      item.textContent = lm.flag + '  ' + lm.name;
      item.setAttribute('data-lang', lang);
      Object.assign(item.style, {
        display:         'block',
        width:           '100%',
        padding:         '10px 16px',
        background:      lang === _currentLang ? 'rgba(99,102,241,0.3)' : 'transparent',
        color:           '#f1f5f9',
        border:          'none',
        borderBottom:    '1px solid rgba(255,255,255,0.05)',
        cursor:          'pointer',
        textAlign:       'left',
        fontSize:        '13px',
        fontWeight:      lang === _currentLang ? '600' : '400',
        transition:      'background 0.15s',
      });
      item.addEventListener('mouseenter', function () {
        if (lang !== _currentLang) item.style.background = 'rgba(255,255,255,0.07)';
      });
      item.addEventListener('mouseleave', function () {
        item.style.background = lang === _currentLang ? 'rgba(99,102,241,0.3)' : 'transparent';
      });
      item.addEventListener('click', function () {
        switchLang(lang);
        closeDropdown();
      });
      dropdown.appendChild(item);
    });

    // Remove border-bottom on last item
    var lastItem = dropdown.lastElementChild;
    if (lastItem) lastItem.style.borderBottom = 'none';

    // Toggle logic
    var isOpen = false;
    function openDropdown()  { dropdown.style.display = 'block'; isOpen = true; }
    function closeDropdown() { dropdown.style.display = 'none';  isOpen = false; }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      isOpen ? closeDropdown() : openDropdown();
    });

    document.addEventListener('click', function () {
      if (isOpen) closeDropdown();
    });

    container.appendChild(dropdown);
    container.appendChild(btn);
    document.body.appendChild(container);
    _selectorEl = container;
  }

  /**
   * Met à jour le libellé du bouton après changement de langue.
   */
  function updateSelectorButton() {
    var btn = document.getElementById('i18n-lang-btn');
    if (!btn) return;
    var meta = LANG_META[_currentLang] || LANG_META[DEFAULT_LANG];
    btn.textContent = meta.flag + ' ' + meta.name;

    // Rafraîchir les items actifs dans le dropdown
    var items = document.querySelectorAll('#i18n-lang-dropdown button[data-lang]');
    items.forEach(function (item) {
      var lang = item.getAttribute('data-lang');
      item.style.background  = lang === _currentLang ? 'rgba(99,102,241,0.3)' : 'transparent';
      item.style.fontWeight  = lang === _currentLang ? '600' : '400';
    });
  }

  // ─── Changement de langue ─────────────────────────────────────────────────

  async function switchLang(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;
    if (lang === _currentLang && Object.keys(_translations).length > 0) return;

    _currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);

    // Mettre à jour l'attribut lang de la page
    document.documentElement.setAttribute('lang', lang);

    if (lang === DEFAULT_LANG) {
      // Retour au FR : recharger la page pour restaurer les textes originaux
      // (membre-app.js génère déjà les textes en FR, pas besoin de traduction)
      _translations = {};
      updateSelectorButton();
      // On recharge uniquement si on venait d'une autre langue
      location.reload();
      return;
    }

    // Charger la locale
    var data = await loadLocale(lang);
    if (!data) {
      // Fallback FR
      _currentLang = DEFAULT_LANG;
      _translations = {};
      updateSelectorButton();
      return;
    }

    _translations = data;
    updateSelectorButton();

    // Appliquer les traductions au DOM complet
    translateDOM(document.body);
  }

  // ─── Initialisation ───────────────────────────────────────────────────────

  async function init() {
    var lang = detectLang();

    // Toujours injecter le sélecteur (même en FR)
    // Attendre que le body soit disponible
    if (document.body) {
      buildSelector();
    } else {
      document.addEventListener('DOMContentLoaded', buildSelector);
    }

    if (lang === DEFAULT_LANG) {
      // FR : pas de traduction, mais on démarre l'observer au cas où
      // l'utilisateur changerait de langue plus tard
      _currentLang = DEFAULT_LANG;
      document.documentElement.setAttribute('lang', DEFAULT_LANG);
      // Démarrer l'observer + watchdog pour les changements futurs
      if (document.body) {
        startObserver();
        startWatchdog();
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          startObserver();
          startWatchdog();
        });
      }
      return;
    }

    // Charger la locale cible
    var data = await loadLocale(lang);
    if (!data) {
      _currentLang = DEFAULT_LANG;
      return;
    }

    _currentLang  = lang;
    _translations = data;
    document.documentElement.setAttribute('lang', lang);

    // Appliquer au DOM existant (après que member-app.js a rendu l'interface)
    function applyWhenReady() {
      if (document.body) {
        // Délai pour laisser member-app.js s'initialiser complètement
        setTimeout(function () {
          translateDOM(document.body);
          startObserver();
        }, 150);
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          setTimeout(function () {
            translateDOM(document.body);
            startObserver();
          }, 150);
        });
      }
    }

    applyWhenReady();

    // Watchdog pour garantir la persistance du sélecteur
    startWatchdog();
  }

  // ─── API publique ─────────────────────────────────────────────────────────

  window.t        = t;
  window.i18n     = {
    t:          t,
    switch:     switchLang,
    current:    function () { return _currentLang; },
    supported:  SUPPORTED_LANGS,
    meta:       LANG_META,
  };

  // ─── Lancement ────────────────────────────────────────────────────────────

  init();

})();
