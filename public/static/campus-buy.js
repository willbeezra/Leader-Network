// ============================================================
// campus-buy.js — Flow d'achat formation campus
// Safari-safe : ZERO template literal, ZERO async/await
// ZERO fonction récursive, ZERO imbrication complexe
// Uniquement : function déclarées, XHR callbacks, innerHTML = string
// ============================================================
// jshint esversion:6

(function() {
  'use strict';

  // ── État global ──────────────────────────────────────────────
  var CB = {
    courseId: (window._CB_COURSE_ID || '').replace(/[^a-zA-Z0-9_-]/g, ''),
    token: '',
    course: null,
    orderId: null,
    gw: {},
    stripeEnabled: false,
    stripeKey: '',
    cpEnabled: false,
    cpCoins: 'USDT.TRC20,LTC,ETH,BTC',
    walletBalance: 0,
    v2Methods: [],
    v2ManualMethods: [],
    selectedMethod: '',
    v2MethodId: '',
    v2MethodName: '',
    proofUrl: '',
    step: 'methods'
  };

  // ── Helpers ──────────────────────────────────────────────────
  function getToken() {
    return localStorage.getItem('leader_member_token') || '';
  }

  function fmtUsd(n) {
    var v = parseFloat(n) || 0;
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function el(id) {
    return document.getElementById(id);
  }

  function showToast(msg, type) {
    var t = el('cb-toast');
    if (!t) return;
    t.textContent = msg;
    t.style.background = (type === 'error') ? '#450a0a' : '#052e16';
    t.style.borderColor = (type === 'error') ? '#7f1d1d' : '#166534';
    t.style.color = (type === 'error') ? '#fca5a5' : '#86efac';
    t.style.display = 'block';
    setTimeout(function() { t.style.display = 'none'; }, 4000);
  }

  function setHtml(id, html) {
    var node = el(id);
    if (node) node.innerHTML = html;
  }

  function showSection(id) {
    var ids = ['cb-course-info', 'cb-payment-section', 'cb-checkout-section', 'cb-result-section'];
    for (var i = 0; i < ids.length; i++) {
      var node = el(ids[i]);
      if (!node) continue;
      node.style.display = (ids[i] === id) ? '' : 'none';
    }
  }

  // ── XHR wrapper (callbacks, pas de Promise) ─────────────────
  function xhr(method, path, data, onOk, onErr) {
    var req = new XMLHttpRequest();
    req.open(method, '/api' + path, true);
    req.setRequestHeader('Content-Type', 'application/json');
    var tok = CB.token || getToken();
    if (tok) req.setRequestHeader('Authorization', 'Bearer ' + tok);
    req.onreadystatechange = function() {
      if (req.readyState !== 4) return;
      var body = {};
      try { body = JSON.parse(req.responseText); } catch(e) { body = { error: req.responseText }; }
      if (req.status >= 200 && req.status < 300) {
        if (onOk) onOk(body);
      } else {
        if (onErr) onErr(body);
      }
    };
    req.send(data ? JSON.stringify(data) : null);
  }

  // ── 1. Initialisation ────────────────────────────────────────
  function init() {
    CB.token = getToken();
    if (!CB.token) {
      // Pas connecté — rediriger vers login avec retour campus
      window.location.href = '/login#campus';
      return;
    }
    if (!CB.courseId) {
      showSection('cb-course-info');
      setHtml('cb-course-info', '<div class="cb-error"><i class="fas fa-exclamation-circle" style="font-size:32px;margin-bottom:12px;color:#f87171;display:block;"></i>Formation introuvable.</div>');
      return;
    }
    loadCourse();
  }

  // ── 2. Charger infos formation ───────────────────────────────
  // Utilise GET /api/campus/ (liste) et filtre par ID
  // Évite la dépendance à un endpoint /course/:id inexistant
  function loadCourse() {
    showSection('cb-course-info');
    setHtml('cb-course-info', '<div class="cb-loader"><div class="cb-spinner"></div>Chargement de la formation\u2026</div>');

    xhr('GET', '/campus', null, function(data) {
      var courses = data.courses || [];
      var found = null;
      for (var i = 0; i < courses.length; i++) {
        if (String(courses[i].id) === String(CB.courseId)) {
          found = courses[i];
          break;
        }
      }
      if (!found) {
        setHtml('cb-course-info', '<div class="cb-error"><i class="fas fa-exclamation-circle" style="font-size:32px;margin-bottom:12px;display:block;color:#f87171;"></i>Formation introuvable.</div>');
        return;
      }
      CB.course = found;
      renderCourseInfo();
    }, function(err) {
      setHtml('cb-course-info', '<div class="cb-error"><i class="fas fa-exclamation-circle" style="font-size:32px;margin-bottom:12px;display:block;color:#f87171;"></i>' + escHtml(err.error || 'Impossible de charger la formation.') + '</div>');
    });
  }

  // ── 3. Afficher infos formation ──────────────────────────────
  function renderCourseInfo() {
    var c = CB.course;
    if (!c) return;

    var html = '';
    html += '<div class="cb-card">';
    if (c.thumbnail_url) {
      html += '<img src="' + escHtml(c.thumbnail_url) + '" alt="' + escHtml(c.title) + '" style="width:100%;height:160px;object-fit:cover;border-radius:10px;margin-bottom:14px;">';
    }
    html += '<div class="cb-title">' + escHtml(c.title || 'Formation') + '</div>';
    html += '<div class="cb-price">' + fmtUsd(c.price_usd) + '</div>';
    if (c.description) {
      html += '<div class="cb-desc">' + escHtml(c.description) + '</div>';
    }
    html += '</div>';

    setHtml('cb-course-info', html);

    // Afficher la section paiement
    var sec = el('cb-payment-section');
    if (sec) sec.style.display = '';

    loadPaymentMethods();
  }

  // ── 4. Charger tous les moyens de paiement ───────────────────
  // Séquentiel via callbacks chaînés — pas d'async, pas de Promise.all
  function loadPaymentMethods() {
    setHtml('cb-methods-list', '<div class="cb-loader"><div class="cb-spinner"></div>Chargement des moyens de paiement\u2026</div>');

    // Étape 4a : charger packages (gateways legacy)
    xhr('GET', '/members/packages', null, function(pkgData) {
      var gw = pkgData.gateways || {};
      CB.gw = gw;

      // Étape 4b : charger config Stripe
      xhr('GET', '/members/stripe/config', null, function(strData) {
        CB.stripeEnabled = !!(strData && strData.enabled);
        if (CB.stripeEnabled && strData.public_key) CB.stripeKey = strData.public_key;

        // Étape 4c : charger config CoinPayments
        xhr('GET', '/members/coinpayments/config', null, function(cpData) {
          CB.cpEnabled = !!(cpData && cpData.enabled);
          if (CB.cpEnabled && cpData.coins) CB.cpCoins = cpData.coins;

          // Étape 4d : charger méthodes V2
          xhr('GET', '/payment/methods', null, function(v2Data) {
            var allMethods = [];
            var raw = v2Data.methods || {};
            var keys = Object.keys(raw);
            for (var i = 0; i < keys.length; i++) {
              var arr = raw[keys[i]];
              if (Array.isArray(arr)) {
                for (var j = 0; j < arr.length; j++) allMethods.push(arr[j]);
              }
            }
            var skipProviders = ['stripe', 'paypal', 'coinpayments', 'wallet', 'internal_wallet', 'internal', 'leader_wallet'];
            CB.v2Methods = [];
            CB.v2ManualMethods = [];
            for (var k = 0; k < allMethods.length; k++) {
              var m = allMethods[k];
              if (!m.is_active) continue;
              if (skipProviders.indexOf(m.provider) >= 0) continue;
              if (m.is_automatic) {
                CB.v2Methods.push(m);
              } else {
                CB.v2ManualMethods.push(m);
              }
            }

            // Étape 4e : charger solde wallet
            xhr('GET', '/members/wallet', null, function(wData) {
              CB.walletBalance = parseFloat((wData.wallet && wData.wallet.balance) || (wData.member && wData.member.wallet_balance) || 0) || 0;
              renderMethodsList();
            }, function() {
              CB.walletBalance = 0;
              renderMethodsList();
            });

          }, function() {
            CB.v2Methods = [];
            CB.v2ManualMethods = [];
            // continuer quand même
            xhr('GET', '/members/wallet', null, function(wData) {
              CB.walletBalance = parseFloat((wData.wallet && wData.wallet.balance) || 0) || 0;
              renderMethodsList();
            }, function() {
              CB.walletBalance = 0;
              renderMethodsList();
            });
          });

        }, function() {
          CB.cpEnabled = false;
          // continuer
          xhr('GET', '/payment/methods', null, function(v2Data) {
            buildV2FromData(v2Data);
            xhr('GET', '/members/wallet', null, function(wData) {
              CB.walletBalance = parseFloat((wData.wallet && wData.wallet.balance) || 0) || 0;
              renderMethodsList();
            }, function() { CB.walletBalance = 0; renderMethodsList(); });
          }, function() {
            CB.v2Methods = []; CB.v2ManualMethods = [];
            xhr('GET', '/members/wallet', null, function(wData) {
              CB.walletBalance = parseFloat((wData.wallet && wData.wallet.balance) || 0) || 0;
              renderMethodsList();
            }, function() { CB.walletBalance = 0; renderMethodsList(); });
          });
        });

      }, function() {
        CB.stripeEnabled = false;
        // continuer (CoinPayments → V2 → wallet)
        xhr('GET', '/members/coinpayments/config', null, function(cpData) {
          CB.cpEnabled = !!(cpData && cpData.enabled);
          if (CB.cpEnabled && cpData.coins) CB.cpCoins = cpData.coins;
          xhr('GET', '/payment/methods', null, function(v2Data) {
            buildV2FromData(v2Data);
            xhr('GET', '/members/wallet', null, function(wData) {
              CB.walletBalance = parseFloat((wData.wallet && wData.wallet.balance) || 0) || 0;
              renderMethodsList();
            }, function() { CB.walletBalance = 0; renderMethodsList(); });
          }, function() {
            CB.v2Methods = []; CB.v2ManualMethods = [];
            loadWalletAndRender();
          });
        }, function() {
          CB.cpEnabled = false;
          CB.v2Methods = []; CB.v2ManualMethods = [];
          loadWalletAndRender();
        });
      });

    }, function(err) {
      CB.gw = {};
      // Essayer quand même les autres
      CB.stripeEnabled = false;
      CB.cpEnabled = false;
      CB.v2Methods = []; CB.v2ManualMethods = [];
      loadWalletAndRender();
    });
  }

  function buildV2FromData(v2Data) {
    var allMethods = [];
    var raw = v2Data.methods || {};
    var keys = Object.keys(raw);
    for (var i = 0; i < keys.length; i++) {
      var arr = raw[keys[i]];
      if (Array.isArray(arr)) {
        for (var j = 0; j < arr.length; j++) allMethods.push(arr[j]);
      }
    }
    var skipProviders = ['stripe', 'paypal', 'coinpayments', 'wallet', 'internal_wallet', 'internal', 'leader_wallet'];
    CB.v2Methods = [];
    CB.v2ManualMethods = [];
    for (var k = 0; k < allMethods.length; k++) {
      var m = allMethods[k];
      if (!m.is_active) continue;
      if (skipProviders.indexOf(m.provider) >= 0) continue;
      if (m.is_automatic) { CB.v2Methods.push(m); }
      else { CB.v2ManualMethods.push(m); }
    }
  }

  function loadWalletAndRender() {
    xhr('GET', '/members/wallet', null, function(wData) {
      CB.walletBalance = parseFloat((wData.wallet && wData.wallet.balance) || 0) || 0;
      renderMethodsList();
    }, function() {
      CB.walletBalance = 0;
      renderMethodsList();
    });
  }

  // ── 5. Afficher la liste des méthodes ────────────────────────
  function renderMethodsList() {
    var gw = CB.gw;
    var amt = parseFloat(CB.course && CB.course.price_usd) || 0;

    var hasPaypal  = !!(gw.paypal_email && gw.paypal_active);
    var hasBank    = !!((!(!gw.bank_iban && !gw.bank_name)) && gw.bank_active);
    var hasCrypto  = !!(gw.crypto_address && gw.crypto_active);
    var hasManual  = !!(gw.instructions && gw.manual_active);
    var hasStripe  = CB.stripeEnabled;
    var hasCP      = CB.cpEnabled;
    var hasV2      = CB.v2Methods.length > 0;
    var hasV2Man   = CB.v2ManualMethods.length > 0;

    var wbal   = CB.walletBalance;
    var canWal = wbal >= amt;
    var hasAny = hasPaypal || hasBank || hasCrypto || hasManual || hasStripe || hasCP || hasV2 || hasV2Man || wbal > 0;

    var html = '';

    if (!hasAny) {
      html = '<div class="cb-info"><i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>Aucune passerelle de paiement configurée. Contactez votre administrateur.</div>';
      setHtml('cb-methods-list', html);
      return;
    }

    // Wallet
    if (canWal) {
      html += '<button class="cb-method wallet" onclick="window._cbSelectMethod(\'wallet\')">';
      html += '<span class="cb-method-icon"><i class="fas fa-wallet" style="color:#06b6d4;"></i></span>';
      html += '<span style="flex:1;"><span class="cb-method-label">Wallet LEADER</span>';
      html += '<div class="cb-method-sub">Solde : <span style="color:#22d3ee;font-weight:700;">' + fmtUsd(wbal) + '</span></div></span>';
      html += '<span class="cb-badge cyan">Immédiat</span></button>';
    } else if (wbal > 0) {
      html += '<div class="cb-method" style="opacity:.5;cursor:not-allowed;">';
      html += '<span class="cb-method-icon"><i class="fas fa-wallet" style="color:#6b7280;"></i></span>';
      html += '<span style="flex:1;"><span class="cb-method-label" style="color:#9ca3af;">Wallet LEADER</span>';
      html += '<div class="cb-method-sub">Insuffisant : <span style="color:#f87171;">' + fmtUsd(wbal) + '</span> / ' + fmtUsd(amt) + ' requis</div></span></div>';
    }

    // Stripe
    if (hasStripe) {
      html += '<button class="cb-method stripe" onclick="window._cbSelectMethod(\'stripe\')">';
      html += '<span class="cb-method-icon"><i class="fas fa-credit-card" style="color:#a78bfa;"></i></span>';
      html += '<span style="flex:1;"><span class="cb-method-label">Carte bancaire / Apple Pay / Google Pay</span>';
      html += '<div class="cb-method-sub">Paiement imm\u00e9diat \u00b7 Visa, Mastercard, Amex, Apple Pay</div></span>';
      html += '<span class="cb-badge green">Recommand\u00e9</span></button>';
    }

    // PayPal
    if (hasPaypal) {
      html += '<button class="cb-method paypal" onclick="window._cbSelectMethod(\'paypal\')">';
      html += '<span class="cb-method-icon"><i class="fab fa-paypal" style="color:#60a5fa;"></i></span>';
      html += '<span style="flex:1;"><span class="cb-method-label">PayPal / Carte bancaire</span>';
      html += '<div class="cb-method-sub">Paiement imm\u00e9diat et s\u00e9curis\u00e9 \u00b7 Visa, Mastercard</div></span></button>';
    }

    // Virement bancaire
    if (hasBank) {
      var bankLabel = escHtml(gw.bank_beneficiary || gw.bank_name || '');
      html += '<button class="cb-method bank" onclick="window._cbSelectMethod(\'bank\')">';
      html += '<span class="cb-method-icon"><i class="fas fa-university" style="color:#10b981;"></i></span>';
      html += '<span style="flex:1;"><span class="cb-method-label">Virement bancaire</span>';
      html += '<div class="cb-method-sub">2\u20133 jours ouvrables' + (bankLabel ? ' \u00b7 ' + bankLabel : '') + '</div></span></button>';
    }

    // Crypto direct
    if (hasCrypto) {
      var netLabel = escHtml(gw.crypto_network || 'USDT');
      html += '<button class="cb-method crypto" onclick="window._cbSelectMethod(\'crypto\')">';
      html += '<span class="cb-method-icon"><i class="fab fa-bitcoin" style="color:#f59e0b;"></i></span>';
      html += '<span style="flex:1;"><span class="cb-method-label">Crypto (' + netLabel + ')</span>';
      html += '<div class="cb-method-sub">R\u00e9seau : ' + escHtml(gw.crypto_network || 'TRC20') + '</div></span></button>';
    }

    // CoinPayments
    if (hasCP) {
      html += '<button class="cb-method coinpayments" onclick="window._cbSelectMethod(\'coinpayments\')">';
      html += '<span class="cb-method-icon"><i class="fas fa-coins" style="color:#f97316;"></i></span>';
      html += '<span style="flex:1;"><span class="cb-method-label">Cryptomonnaie via CoinPayments</span>';
      html += '<div class="cb-method-sub">Bitcoin, Ethereum, USDT TRC20, Litecoin et plus</div></span>';
      html += '<span class="cb-badge orange">Crypto</span></button>';
    }

    // Méthodes V2 automatiques (PSP)
    for (var vi = 0; vi < CB.v2Methods.length; vi++) {
      var vm = CB.v2Methods[vi];
      var vIcon = vm.provider === 'mollie' ? 'fas fa-credit-card' : (vm.logo_emoji ? '' : 'fas fa-credit-card');
      var vLabel = escHtml(vm.display_name || vm.provider);
      var vDesc  = escHtml(vm.description || 'Paiement s\u00e9curis\u00e9');
      var vId    = escHtml(vm.id || '');
      var vProv  = escHtml(vm.provider || '');
      html += '<button class="cb-method v2psp" onclick="window._cbSelectV2(\'' + vId + '\',\'' + vProv + '\',\'' + vLabel + '\')">';
      if (vIcon) {
        html += '<span class="cb-method-icon"><i class="' + vIcon + '" style="color:#a78bfa;"></i></span>';
      } else {
        html += '<span class="cb-method-icon">' + escHtml(vm.logo_emoji || '') + '</span>';
      }
      html += '<span style="flex:1;"><span class="cb-method-label">' + vLabel + '</span>';
      html += '<div class="cb-method-sub">' + vDesc + '</div></span>';
      html += '<span class="cb-badge blue">Automatique</span></button>';
    }

    // Méthodes V2 manuelles (Mobile Money, etc.)
    for (var mi = 0; mi < CB.v2ManualMethods.length; mi++) {
      var mm = CB.v2ManualMethods[mi];
      var mmIcon  = mm.logo_emoji || '';
      var mmLabel = escHtml(mm.display_name || mm.provider);
      var mmDesc  = escHtml(mm.instructions || mm.description || 'Envoi manuel \u00b7 preuve requise');
      var mmId    = escHtml(mm.id || '');
      var mmProv  = escHtml(mm.provider || '');
      html += '<button class="cb-method manual" onclick="window._cbSelectV2Manual(\'' + mmId + '\',\'' + mmProv + '\',\'' + mmLabel + '\')">';
      if (mmIcon) {
        html += '<span class="cb-method-icon">' + escHtml(mmIcon) + '</span>';
      } else {
        html += '<span class="cb-method-icon"><i class="fas fa-mobile-alt" style="color:#6b7280;"></i></span>';
      }
      html += '<span style="flex:1;"><span class="cb-method-label">' + mmLabel + '</span>';
      html += '<div class="cb-method-sub">' + mmDesc + '</div></span>';
      html += '<span class="cb-badge orange">Mobile Money</span></button>';
    }

    // Manuel instructions
    if (hasManual) {
      html += '<button class="cb-method manual" onclick="window._cbSelectMethod(\'manual\')">';
      html += '<span class="cb-method-icon"><i class="fas fa-info-circle" style="color:#6b7280;"></i></span>';
      html += '<span style="flex:1;"><span class="cb-method-label">Autre m\u00e9thode</span>';
      html += '<div class="cb-method-sub">Voir instructions</div></span></button>';
    }

    setHtml('cb-methods-list', html);
  }

  // ── 6. Sélection méthode ─────────────────────────────────────
  window._cbSelectMethod = function(method) {
    CB.selectedMethod = method;
    CB.step = 'checkout';
    createOrderThenCheckout(method, null, null);
  };

  window._cbSelectV2 = function(methodId, provider, displayName) {
    CB.selectedMethod = 'v2_psp';
    CB.v2MethodId = methodId;
    CB.v2MethodName = displayName;
    createOrderThenCheckoutV2(methodId, provider, displayName);
  };

  window._cbSelectV2Manual = function(methodId, provider, displayName) {
    CB.selectedMethod = 'v2_manual';
    CB.v2MethodId = methodId;
    CB.v2MethodName = displayName;
    createOrderThenV2Manual(methodId, provider, displayName);
  };

  // ── 7. Créer la commande puis aller au checkout ──────────────
  function createOrderThenCheckout(method, v2Id, v2Name) {
    var courseId = CB.courseId;
    showSection('cb-checkout-section');
    setHtml('cb-checkout-section', '<div class="cb-loader"><div class="cb-spinner"></div>Cr\u00e9ation de la commande\u2026</div>');

    xhr('POST', '/campus/course/' + courseId + '/order', { payment_method: method }, function(data) {
      if (data.code === 'ALREADY_OWNED') {
        showResultOwned();
        return;
      }
      CB.orderId = data.order_id;
      if (data.existing && data.status === 'proof_submitted') {
        showResultProofDone(data.order_id);
        return;
      }
      renderCheckout(method, data);
    }, function(err) {
      if (err.code === 'ALREADY_OWNED' || (err.error && err.error.indexOf('d\u00e9j\u00e0') >= 0)) {
        showResultOwned();
        return;
      }
      setHtml('cb-checkout-section',
        '<div class="cb-error">' +
        '<i class="fas fa-exclamation-circle" style="font-size:32px;margin-bottom:12px;display:block;color:#f87171;"></i>' +
        escHtml(err.error || 'Erreur lors de la cr\u00e9ation de commande.') +
        '<div style="margin-top:16px;"><button class="cb-btn-secondary" onclick="window._cbBackToMethods()" style="width:auto;padding:10px 20px;">Retour</button></div></div>'
      );
    });
  }

  function renderCheckout(method, orderData) {
    var gw = CB.gw;
    var amt = parseFloat(CB.course && CB.course.price_usd) || 0;
    var orderId = CB.orderId || orderData.order_id;

    if (method === 'wallet') {
      renderCheckoutWallet(orderId, amt);
    } else if (method === 'stripe') {
      renderCheckoutStripe(orderId, amt);
    } else if (method === 'paypal') {
      renderCheckoutPaypal(orderId, amt, gw);
    } else if (method === 'bank') {
      renderCheckoutBank(orderId, amt, gw);
    } else if (method === 'crypto') {
      renderCheckoutCrypto(orderId, amt, gw);
    } else if (method === 'coinpayments') {
      renderCheckoutCoinpayments(orderId, amt);
    } else if (method === 'manual') {
      renderCheckoutManual(orderId, amt, gw);
    } else {
      renderCheckoutProof(orderId, amt, 'Paiement');
    }
  }

  // ── 8a. Checkout Wallet ──────────────────────────────────────
  function renderCheckoutWallet(orderId, amt) {
    var wbal = CB.walletBalance;
    var html = '';
    html += '<div class="cb-card">';
    html += '<div class="cb-section-title"><i class="fas fa-wallet" style="color:#06b6d4;margin-right:6px;"></i>Paiement par Wallet LEADER</div>';
    html += '<div class="cb-info">Solde disponible : <strong style="color:#22d3ee;">' + fmtUsd(wbal) + '</strong></div>';
    html += '<div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #1f2937;">';
    html += '<span style="color:#9ca3af;">Formation</span><span style="color:#fff;font-weight:600;">' + escHtml(CB.course && CB.course.title || '') + '</span></div>';
    html += '<div style="display:flex;justify-content:space-between;padding:12px 0;">';
    html += '<span style="color:#9ca3af;">Montant</span><span style="color:#c9a84c;font-weight:800;font-size:20px;">' + fmtUsd(amt) + '</span></div>';
    html += '<div id="cb-wallet-err" class="cb-error" style="display:none;margin-bottom:12px;"></div>';
    html += '<button class="cb-btn-primary" id="cb-wallet-pay-btn" onclick="window._cbWalletPay(\'' + escHtml(orderId) + '\')">Payer ' + fmtUsd(amt) + ' depuis mon Wallet</button>';
    html += '<button class="cb-btn-secondary" onclick="window._cbBackToMethods()"><i class="fas fa-arrow-left" style="margin-right:6px;"></i>Retour</button>';
    html += '</div>';
    setHtml('cb-checkout-section', html);
  }

  window._cbWalletPay = function(orderId) {
    var btn = el('cb-wallet-pay-btn');
    var errDiv = el('cb-wallet-err');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Paiement en cours\u2026'; }
    if (errDiv) errDiv.style.display = 'none';

    xhr('POST', '/campus/course/' + CB.courseId + '/order', { payment_method: 'wallet' }, function(data) {
      if (data.code === 'ALREADY_OWNED') { showResultOwned(); return; }
      CB.orderId = data.order_id || orderId;
      // Soumettre preuve wallet (pas de fichier — juste confirmer)
      xhr('POST', '/campus/course-order/' + CB.orderId + '/proof',
        { proof_url: 'wallet_payment', note: 'Paiement depuis wallet LEADER' },
        function() { showResultSuccess('Paiement effectu\u00e9 !', 'Votre wallet a \u00e9t\u00e9 d\u00e9bit\u00e9. La formation sera disponible d\u00e8s validation.'); },
        function(err2) {
          if (btn) { btn.disabled = false; btn.innerHTML = 'Payer depuis mon Wallet'; }
          if (errDiv) { errDiv.textContent = err2.error || 'Erreur lors du paiement.'; errDiv.style.display = ''; }
        }
      );
    }, function(err) {
      if (btn) { btn.disabled = false; btn.innerHTML = 'Payer depuis mon Wallet'; }
      if (errDiv) { errDiv.textContent = err.error || 'Erreur lors de la commande.'; errDiv.style.display = ''; }
    });
  };

  // ── 8b. Checkout Stripe ──────────────────────────────────────
  function renderCheckoutStripe(orderId, amt) {
    var html = '';
    html += '<div class="cb-card">';
    html += '<div class="cb-section-title"><i class="fas fa-credit-card" style="color:#a78bfa;margin-right:6px;"></i>Paiement par carte bancaire</div>';
    html += '<div class="cb-info">Montant : <strong style="color:#c9a84c;">' + fmtUsd(amt) + '</strong> \u00b7 Formation : ' + escHtml(CB.course && CB.course.title || '') + '</div>';
    html += '<div id="stripe-mount" style="padding:16px 0;min-height:80px;"></div>';
    html += '<div id="cb-stripe-err" class="cb-error" style="display:none;margin-bottom:12px;"></div>';
    html += '<button class="cb-btn-primary" id="cb-stripe-pay-btn" onclick="window._cbStripeSubmit(\'' + escHtml(orderId) + '\')" style="margin-bottom:8px;">Payer ' + fmtUsd(amt) + '</button>';
    html += '<button class="cb-btn-secondary" onclick="window._cbBackToMethods()"><i class="fas fa-arrow-left" style="margin-right:6px;"></i>Retour</button>';
    html += '</div>';
    setHtml('cb-checkout-section', html);

    // Charger Stripe SDK
    var script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = function() { initStripeElement(orderId, amt); };
    document.head.appendChild(script);
  }

  var _stripeInstance = null;
  var _stripeElements = null;
  var _stripeCard = null;

  function initStripeElement(orderId, amt) {
    if (!window.Stripe || !CB.stripeKey) {
      setHtml('cb-stripe-err', 'Stripe non disponible.');
      var errDiv = el('cb-stripe-err');
      if (errDiv) errDiv.style.display = '';
      return;
    }
    _stripeInstance = window.Stripe(CB.stripeKey);
    _stripeElements = _stripeInstance.elements();
    _stripeCard = _stripeElements.create('card', {
      style: {
        base: { color: '#e5e7eb', fontSize: '16px', '::placeholder': { color: '#6b7280' } },
        invalid: { color: '#f87171' }
      }
    });
    _stripeCard.mount('#stripe-mount');
  }

  window._cbStripeSubmit = function(orderId) {
    if (!_stripeInstance || !_stripeCard) {
      showToast('Stripe non initialis\u00e9.', 'error');
      return;
    }
    var btn = el('cb-stripe-pay-btn');
    var errDiv = el('cb-stripe-err');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Paiement\u2026'; }
    if (errDiv) errDiv.style.display = 'none';

    // Créer PaymentIntent côté serveur
    xhr('POST', '/members/stripe/create-payment-intent',
      { amount: CB.course.price_usd, currency: 'usd', order_id: orderId, product: 'campus_course', course_id: CB.courseId },
      function(data) {
        var clientSecret = data.client_secret;
        _stripeInstance.confirmCardPayment(clientSecret, {
          payment_method: { card: _stripeCard }
        }).then(function(result) {
          if (result.error) {
            if (btn) { btn.disabled = false; btn.innerHTML = 'Payer'; }
            if (errDiv) { errDiv.textContent = result.error.message; errDiv.style.display = ''; }
          } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
            // Soumettre preuve Stripe
            xhr('POST', '/campus/course-order/' + orderId + '/proof',
              { proof_url: 'stripe:' + result.paymentIntent.id, note: 'Stripe PaymentIntent: ' + result.paymentIntent.id },
              function() { showResultSuccess('Paiement r\u00e9ussi !', 'Votre paiement Stripe a \u00e9t\u00e9 confirm\u00e9. La formation sera disponible tr\u00e8s rapidement.'); },
              function(err2) { showToast(err2.error || 'Erreur apr\u00e8s paiement Stripe.', 'error'); }
            );
          }
        });
      },
      function(err) {
        if (btn) { btn.disabled = false; btn.innerHTML = 'Payer'; }
        if (errDiv) { errDiv.textContent = err.error || 'Erreur de cr\u00e9ation PaymentIntent.'; errDiv.style.display = ''; }
      }
    );
  };

  // ── 8c. Checkout PayPal ──────────────────────────────────────
  function renderCheckoutPaypal(orderId, amt, gw) {
    var email = escHtml(gw.paypal_email || '');
    var html = '';
    html += '<div class="cb-card">';
    html += '<div class="cb-section-title"><i class="fab fa-paypal" style="color:#60a5fa;margin-right:6px;"></i>Paiement PayPal</div>';
    html += '<div class="cb-info">';
    html += '<p style="margin:0 0 8px;color:#93c5fd;">Envoyez <strong style="color:#c9a84c;">' + fmtUsd(amt) + '</strong> via PayPal \u00e0 :</p>';
    html += '<p style="font-size:18px;font-weight:700;color:#fff;margin:0;">' + email + '</p>';
    html += '<p style="font-size:12px;color:#6b7280;margin:6px 0 0;">Mentionnez votre identifiant unique LEADER en r\u00e9f\u00e9rence.</p>';
    html += '</div>';
    html += renderProofForm(orderId);
    html += '</div>';
    setHtml('cb-checkout-section', html);
  }

  // ── 8d. Checkout Virement bancaire ───────────────────────────
  function renderCheckoutBank(orderId, amt, gw) {
    var html = '';
    html += '<div class="cb-card">';
    html += '<div class="cb-section-title"><i class="fas fa-university" style="color:#10b981;margin-right:6px;"></i>Virement bancaire</div>';
    html += '<div class="cb-info">';
    if (gw.bank_beneficiary || gw.bank_name) {
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#9ca3af;">B\u00e9n\u00e9ficiaire</span><span style="color:#fff;font-weight:600;">' + escHtml(gw.bank_beneficiary || gw.bank_name || '') + '</span></div>';
    }
    if (gw.bank_iban) {
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#9ca3af;">IBAN</span><span style="color:#fff;font-family:monospace;">' + escHtml(gw.bank_iban) + '</span></div>';
    }
    if (gw.bank_bic) {
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#9ca3af;">BIC / SWIFT</span><span style="color:#fff;font-family:monospace;">' + escHtml(gw.bank_bic) + '</span></div>';
    }
    if (gw.bank_account) {
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#9ca3af;">N\u00b0 compte</span><span style="color:#fff;font-family:monospace;">' + escHtml(gw.bank_account) + '</span></div>';
    }
    html += '<div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid #1f2937;"><span style="color:#9ca3af;">Montant</span><span style="color:#c9a84c;font-weight:700;">' + fmtUsd(amt) + '</span></div>';
    html += '<p style="font-size:12px;color:#6b7280;margin:8px 0 0;">Mentionnez votre identifiant unique LEADER en r\u00e9f\u00e9rence.</p>';
    html += '</div>';
    html += renderProofForm(orderId);
    html += '</div>';
    setHtml('cb-checkout-section', html);
  }

  // ── 8e. Checkout Crypto direct ───────────────────────────────
  function renderCheckoutCrypto(orderId, amt, gw) {
    var html = '';
    html += '<div class="cb-card">';
    html += '<div class="cb-section-title"><i class="fab fa-bitcoin" style="color:#f59e0b;margin-right:6px;"></i>Paiement Crypto</div>';
    html += '<div class="cb-info">';
    if (gw.crypto_network) {
      html += '<div style="margin-bottom:8px;"><span style="color:#9ca3af;">R\u00e9seau : </span><span style="color:#fff;font-weight:600;">' + escHtml(gw.crypto_network) + '</span></div>';
    }
    if (gw.crypto_address) {
      html += '<div style="margin-bottom:8px;"><span style="color:#9ca3af;">Adresse :</span><div style="font-family:monospace;font-size:12px;color:#f59e0b;word-break:break-all;margin-top:4px;">' + escHtml(gw.crypto_address) + '</div></div>';
    }
    html += '<div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid #1f2937;"><span style="color:#9ca3af;">Montant</span><span style="color:#c9a84c;font-weight:700;">' + fmtUsd(amt) + '</span></div>';
    html += '</div>';
    html += renderProofForm(orderId);
    html += '</div>';
    setHtml('cb-checkout-section', html);
  }

  // ── 8f. Checkout CoinPayments ────────────────────────────────
  function renderCheckoutCoinpayments(orderId, amt) {
    var html = '';
    html += '<div class="cb-card">';
    html += '<div class="cb-section-title"><i class="fas fa-coins" style="color:#f97316;margin-right:6px;"></i>Paiement via CoinPayments</div>';
    html += '<div class="cb-info">Montant : <strong style="color:#c9a84c;">' + fmtUsd(amt) + '</strong></div>';
    html += '<div style="margin-bottom:14px;">';
    html += '<label class="cb-label">Devise crypto</label>';
    html += '<select id="cp-coin-select" class="cb-input">';
    var coins = (CB.cpCoins || 'USDT.TRC20,LTC,ETH,BTC').split(',');
    for (var ci = 0; ci < coins.length; ci++) {
      var coin = coins[ci].trim();
      html += '<option value="' + escHtml(coin) + '">' + escHtml(coin) + '</option>';
    }
    html += '</select></div>';
    html += '<div id="cb-cp-err" class="cb-error" style="display:none;margin-bottom:12px;"></div>';
    html += '<button class="cb-btn-primary" id="cb-cp-btn" onclick="window._cbCoinPaymentsSubmit(\'' + escHtml(orderId) + '\')">G\u00e9n\u00e9rer l\'adresse de paiement</button>';
    html += '<button class="cb-btn-secondary" onclick="window._cbBackToMethods()"><i class="fas fa-arrow-left" style="margin-right:6px;"></i>Retour</button>';
    html += '</div>';
    setHtml('cb-checkout-section', html);
  }

  window._cbCoinPaymentsSubmit = function(orderId) {
    var btn = el('cb-cp-btn');
    var errDiv = el('cb-cp-err');
    var coinSel = el('cp-coin-select');
    var coin = coinSel ? coinSel.value : 'USDT.TRC20';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Cr\u00e9ation\u2026'; }
    if (errDiv) errDiv.style.display = 'none';

    xhr('POST', '/psp/initiate',
      { order_id: orderId, provider: 'coinpayments', coin: coin, order_type: 'campus_course', course_id: CB.courseId, amount: CB.course.price_usd },
      function(data) {
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else if (data.address) {
          renderCPAddress(data, coin);
        } else {
          if (btn) { btn.disabled = false; btn.innerHTML = 'G\u00e9n\u00e9rer l\'adresse'; }
          if (errDiv) { errDiv.textContent = 'R\u00e9ponse inattendue du serveur.'; errDiv.style.display = ''; }
        }
      },
      function(err) {
        if (btn) { btn.disabled = false; btn.innerHTML = 'G\u00e9n\u00e9rer l\'adresse'; }
        if (errDiv) { errDiv.textContent = err.error || 'Erreur CoinPayments.'; errDiv.style.display = ''; }
      }
    );
  };

  function renderCPAddress(data, coin) {
    var html = '';
    html += '<div class="cb-card">';
    html += '<div class="cb-section-title"><i class="fas fa-coins" style="color:#f97316;margin-right:6px;"></i>Adresse de paiement ' + escHtml(coin) + '</div>';
    html += '<div class="cb-info">';
    html += '<div style="margin-bottom:10px;"><span style="color:#9ca3af;">Adresse : </span><div style="font-family:monospace;font-size:12px;color:#f97316;word-break:break-all;margin-top:4px;">' + escHtml(data.address || '') + '</div></div>';
    if (data.amount) {
      html += '<div><span style="color:#9ca3af;">Montant exact : </span><span style="color:#c9a84c;font-weight:700;">' + escHtml(String(data.amount)) + ' ' + escHtml(coin) + '</span></div>';
    }
    if (data.timeout) {
      html += '<div style="margin-top:8px;font-size:12px;color:#6b7280;">Expire dans : ' + escHtml(String(Math.floor((data.timeout || 0) / 60))) + ' min</div>';
    }
    html += '</div>';
    html += renderProofForm(data.order_id || CB.orderId || '');
    html += '</div>';
    setHtml('cb-checkout-section', html);
  }

  // ── 8g. Checkout Manuel ──────────────────────────────────────
  function renderCheckoutManual(orderId, amt, gw) {
    var html = '';
    html += '<div class="cb-card">';
    html += '<div class="cb-section-title"><i class="fas fa-info-circle" style="color:#6b7280;margin-right:6px;"></i>Autre m\u00e9thode de paiement</div>';
    if (gw.instructions) {
      html += '<div class="cb-info"><p style="margin:0;white-space:pre-wrap;">' + escHtml(gw.instructions) + '</p></div>';
    }
    html += '<div style="display:flex;justify-content:space-between;padding:12px 0;"><span style="color:#9ca3af;">Montant</span><span style="color:#c9a84c;font-weight:700;">' + fmtUsd(amt) + '</span></div>';
    html += renderProofForm(orderId);
    html += '</div>';
    setHtml('cb-checkout-section', html);
  }

  // ── 8h. Checkout V2 PSP (redirection) ───────────────────────
  function createOrderThenCheckoutV2(methodId, provider, displayName) {
    showSection('cb-checkout-section');
    setHtml('cb-checkout-section', '<div class="cb-loader"><div class="cb-spinner"></div>Cr\u00e9ation de la commande\u2026</div>');

    xhr('POST', '/campus/course/' + CB.courseId + '/order', { payment_method: 'v2_psp' }, function(data) {
      if (data.code === 'ALREADY_OWNED') { showResultOwned(); return; }
      CB.orderId = data.order_id;
      if (data.existing && data.status === 'proof_submitted') { showResultProofDone(data.order_id); return; }
      launchV2PSP(data.order_id, methodId, provider, displayName);
    }, function(err) {
      if (err.code === 'ALREADY_OWNED') { showResultOwned(); return; }
      setHtml('cb-checkout-section', '<div class="cb-error"><i class="fas fa-exclamation-circle" style="font-size:32px;margin-bottom:12px;display:block;color:#f87171;"></i>' + escHtml(err.error || 'Erreur de commande.') + '<div style="margin-top:16px;"><button class="cb-btn-secondary" onclick="window._cbBackToMethods()" style="width:auto;padding:10px 20px;">Retour</button></div></div>');
    });
  }

  function launchV2PSP(orderId, methodId, provider, displayName) {
    setHtml('cb-checkout-section', '<div class="cb-loader"><div class="cb-spinner"></div>Redirection vers la passerelle\u2026</div>');
    xhr('POST', '/psp/initiate',
      { order_id: orderId, provider: provider, payment_method_id: methodId, order_type: 'campus_course', course_id: CB.courseId, amount: CB.course.price_usd },
      function(data) {
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else {
          setHtml('cb-checkout-section', '<div class="cb-error">Impossible d\'obtenir l\'URL de paiement. <button class="cb-btn-secondary" onclick="window._cbBackToMethods()" style="width:auto;padding:8px 16px;margin-top:12px;">Retour</button></div>');
        }
      },
      function(err) {
        setHtml('cb-checkout-section', '<div class="cb-error"><i class="fas fa-exclamation-circle" style="font-size:32px;margin-bottom:12px;display:block;color:#f87171;"></i>' + escHtml(err.error || 'Erreur PSP.') + '<div style="margin-top:16px;"><button class="cb-btn-secondary" onclick="window._cbBackToMethods()" style="width:auto;padding:10px 20px;">Retour</button></div></div>');
      }
    );
  }

  // ── 8i. Checkout V2 Manuel (Mobile Money, etc.) ──────────────
  function createOrderThenV2Manual(methodId, provider, displayName) {
    showSection('cb-checkout-section');
    setHtml('cb-checkout-section', '<div class="cb-loader"><div class="cb-spinner"></div>Cr\u00e9ation de la commande\u2026</div>');

    xhr('POST', '/campus/course/' + CB.courseId + '/order', { payment_method: 'v2_manual' }, function(data) {
      if (data.code === 'ALREADY_OWNED') { showResultOwned(); return; }
      CB.orderId = data.order_id;
      if (data.existing && data.status === 'proof_submitted') { showResultProofDone(data.order_id); return; }

      // Charger les détails de la méthode V2
      xhr('GET', '/payment/methods', null, function(v2Data) {
        var allMethods = [];
        var raw = v2Data.methods || {};
        var keys = Object.keys(raw);
        for (var i = 0; i < keys.length; i++) {
          var arr = raw[keys[i]];
          if (Array.isArray(arr)) { for (var j = 0; j < arr.length; j++) allMethods.push(arr[j]); }
        }
        var found = null;
        for (var k = 0; k < allMethods.length; k++) {
          if (allMethods[k].id === methodId) { found = allMethods[k]; break; }
        }
        renderV2ManualCheckout(data.order_id, found || { id: methodId, display_name: displayName, config: {} });
      }, function() {
        renderV2ManualCheckout(data.order_id, { id: methodId, display_name: displayName, config: {} });
      });

    }, function(err) {
      if (err.code === 'ALREADY_OWNED') { showResultOwned(); return; }
      setHtml('cb-checkout-section', '<div class="cb-error"><i class="fas fa-exclamation-circle" style="font-size:32px;margin-bottom:12px;display:block;color:#f87171;"></i>' + escHtml(err.error || 'Erreur de commande.') + '<div style="margin-top:16px;"><button class="cb-btn-secondary" onclick="window._cbBackToMethods()" style="width:auto;padding:10px 20px;">Retour</button></div></div>');
    });
  }

  function renderV2ManualCheckout(orderId, methodDetails) {
    var cfg = (methodDetails && methodDetails.config) || {};
    var amt = parseFloat(CB.course && CB.course.price_usd) || 0;
    var instrText = (methodDetails && methodDetails.instructions) || cfg.instructions || '';
    var phoneNum = cfg.phone_number || cfg.account_number || '';
    var accName  = cfg.account_name || cfg.beneficiary || '';
    var emoji    = (methodDetails && methodDetails.logo_emoji) || '';
    var dname    = escHtml((methodDetails && methodDetails.display_name) || 'M\u00e9thode de paiement');

    var html = '';
    html += '<div class="cb-card">';
    html += '<div class="cb-section-title">' + (emoji ? escHtml(emoji) + ' ' : '<i class="fas fa-mobile-alt" style="color:#6b7280;margin-right:6px;"></i>') + dname + '</div>';
    html += '<div class="cb-info">';
    html += '<div style="color:#93c5fd;font-weight:600;margin-bottom:10px;"><i class="fas fa-info-circle" style="margin-right:6px;"></i>Instructions de paiement</div>';
    if (phoneNum) {
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#9ca3af;">Num\u00e9ro</span><span style="font-family:monospace;font-weight:700;color:#fff;">' + escHtml(phoneNum) + '</span></div>';
    }
    if (accName) {
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#9ca3af;">B\u00e9n\u00e9ficiaire</span><span style="font-weight:600;color:#fff;">' + escHtml(accName) + '</span></div>';
    }
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#9ca3af;">Montant</span><span style="color:#c9a84c;font-weight:700;">' + fmtUsd(amt) + '</span></div>';
    if (instrText) {
      html += '<p style="font-size:12px;color:#9ca3af;margin:10px 0 0;padding-top:10px;border-top:1px solid #1f2937;">' + escHtml(instrText) + '</p>';
    }
    html += '<p style="font-size:12px;color:#6b7280;margin:8px 0 0;">R\u00e9f\u00e9rence : votre identifiant unique LEADER</p>';
    html += '</div>';

    // Zone upload preuve
    html += '<div class="cb-field"><label class="cb-label">Justificatif de paiement <span style="color:#f87171;">*</span></label>';
    html += '<input type="file" id="cb-v2manual-file" accept="image/*,application/pdf" class="cb-input" style="padding:8px;" onchange="window._cbHandleFileSelect(this)">';
    html += '<div id="cb-v2manual-preview" style="margin-top:8px;font-size:12px;color:#22d3ee;"></div>';
    html += '</div>';

    html += '<div class="cb-field"><label class="cb-label">R\u00e9f\u00e9rence / N\u00b0 de transaction (optionnel)</label>';
    html += '<input type="text" id="cb-v2manual-ref" class="cb-input" placeholder="Ex: TXN123456789"></div>';
    html += '<div id="cb-v2manual-err" class="cb-error" style="display:none;margin-bottom:12px;"></div>';
    html += '<button class="cb-btn-primary" id="cb-v2manual-submit-btn" onclick="window._cbV2ManualSubmit(\'' + escHtml(orderId) + '\')"><i class="fas fa-paper-plane" style="margin-right:8px;"></i>Soumettre la preuve</button>';
    html += '<button class="cb-btn-secondary" onclick="window._cbBackToMethods()"><i class="fas fa-arrow-left" style="margin-right:6px;"></i>Retour</button>';
    html += '</div>';
    setHtml('cb-checkout-section', html);
  }

  // Upload fichier preuve via base64 (campus — pas d'endpoint upload dédié)
  window._cbHandleFileSelect = function(input) {
    var file = input.files && input.files[0];
    var preview = el('cb-v2manual-preview');
    if (!file) { CB.proofUrl = ''; if (preview) preview.textContent = ''; return; }
    if (file.size > 5 * 1024 * 1024) {
      CB.proofUrl = '';
      if (preview) { preview.style.color = '#f87171'; preview.textContent = 'Fichier trop volumineux (max 5 Mo).'; }
      return;
    }
    // Upload via API fichiers membres
    var formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'proof');
    var req = new XMLHttpRequest();
    req.open('POST', '/api/members/upload', true);
    var tok = CB.token || getToken();
    if (tok) req.setRequestHeader('Authorization', 'Bearer ' + tok);
    if (preview) { preview.style.color = '#22d3ee'; preview.textContent = 'Upload en cours\u2026'; }
    req.onreadystatechange = function() {
      if (req.readyState !== 4) return;
      var resp = {};
      try { resp = JSON.parse(req.responseText); } catch(e) { resp = {}; }
      if (req.status >= 200 && req.status < 300 && resp.url) {
        CB.proofUrl = resp.url;
        if (preview) { preview.style.color = '#22d3ee'; preview.textContent = 'Fichier upload\u00e9 : ' + file.name; }
      } else {
        // Fallback : encoder en base64 et utiliser comme proof_url
        var reader = new FileReader();
        reader.onload = function(e) {
          CB.proofUrl = e.target.result;
          if (preview) { preview.style.color = '#22d3ee'; preview.textContent = 'Fichier s\u00e9lectionn\u00e9 : ' + file.name; }
        };
        reader.readAsDataURL(file);
      }
    };
    req.send(formData);
  };

  window._cbV2ManualSubmit = function(orderId) {
    var btn    = el('cb-v2manual-submit-btn');
    var errDiv = el('cb-v2manual-err');
    var refInput = el('cb-v2manual-ref');
    var proofUrl = CB.proofUrl || '';
    if (!proofUrl) {
      if (errDiv) { errDiv.textContent = 'Veuillez uploader une preuve de paiement.'; errDiv.style.display = ''; }
      return;
    }
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Envoi\u2026'; }
    if (errDiv) errDiv.style.display = 'none';

    var note = (refInput && refInput.value) ? ('Ref: ' + refInput.value.trim()) : '';
    xhr('POST', '/campus/course-order/' + orderId + '/proof',
      { proof_url: proofUrl, note: note },
      function() { showResultSuccess('Preuve soumise !', 'Votre preuve de paiement a \u00e9t\u00e9 envoy\u00e9e. La formation sera valid\u00e9e sous 24\u201348h.'); },
      function(err) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>Soumettre la preuve'; }
        if (errDiv) { errDiv.textContent = err.error || 'Erreur lors de l\'envoi.'; errDiv.style.display = ''; }
      }
    );
  };

  // ── 9. Formulaire preuve générique (PayPal, Bank, Crypto, Manuel) ─
  function renderProofForm(orderId) {
    var html = '';
    html += '<div class="cb-field" style="margin-top:16px;"><label class="cb-label">Justificatif de paiement <span style="color:#f87171;">*</span></label>';
    html += '<input type="file" id="cb-proof-file" accept="image/*,application/pdf" class="cb-input" style="padding:8px;" onchange="window._cbHandleProofFile(this)">';
    html += '<div id="cb-proof-preview" class="cb-proof-note"></div></div>';
    html += '<div class="cb-field"><label class="cb-label">R\u00e9f\u00e9rence transaction (optionnel)</label>';
    html += '<input type="text" id="cb-proof-ref" class="cb-input" placeholder="Ex: PayPal-XXXXXX ou TXN123"></div>';
    html += '<div id="cb-proof-err" class="cb-error" style="display:none;margin-bottom:12px;"></div>';
    html += '<button class="cb-btn-primary" id="cb-proof-submit-btn" onclick="window._cbProofSubmit(\'' + escHtml(orderId) + '\')"><i class="fas fa-paper-plane" style="margin-right:8px;"></i>Soumettre la preuve</button>';
    html += '<button class="cb-btn-secondary" onclick="window._cbBackToMethods()"><i class="fas fa-arrow-left" style="margin-right:6px;"></i>Retour</button>';
    return html;
  }

  window._cbHandleProofFile = function(input) {
    var file = input.files && input.files[0];
    var preview = el('cb-proof-preview');
    if (!file) { CB.proofUrl = ''; if (preview) preview.textContent = ''; return; }
    if (file.size > 5 * 1024 * 1024) {
      CB.proofUrl = '';
      if (preview) { preview.style.color = '#f87171'; preview.textContent = 'Fichier trop volumineux (max 5 Mo).'; }
      return;
    }
    var formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'proof');
    var req = new XMLHttpRequest();
    req.open('POST', '/api/members/upload', true);
    var tok = CB.token || getToken();
    if (tok) req.setRequestHeader('Authorization', 'Bearer ' + tok);
    if (preview) { preview.style.color = '#22d3ee'; preview.textContent = 'Upload en cours\u2026'; }
    req.onreadystatechange = function() {
      if (req.readyState !== 4) return;
      var resp = {};
      try { resp = JSON.parse(req.responseText); } catch(e) { resp = {}; }
      if (req.status >= 200 && req.status < 300 && resp.url) {
        CB.proofUrl = resp.url;
        if (preview) { preview.style.color = '#22d3ee'; preview.textContent = 'Fichier upload\u00e9 : ' + file.name; }
      } else {
        var reader = new FileReader();
        reader.onload = function(e) {
          CB.proofUrl = e.target.result;
          if (preview) { preview.style.color = '#22d3ee'; preview.textContent = file.name + ' s\u00e9lectionn\u00e9'; }
        };
        reader.readAsDataURL(file);
      }
    };
    req.send(formData);
  };

  window._cbProofSubmit = function(orderId) {
    var btn      = el('cb-proof-submit-btn');
    var errDiv   = el('cb-proof-err');
    var refInput = el('cb-proof-ref');
    var proofUrl = CB.proofUrl || '';
    if (!proofUrl) {
      if (errDiv) { errDiv.textContent = 'Veuillez uploader une preuve de paiement.'; errDiv.style.display = ''; }
      return;
    }
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Envoi\u2026'; }
    if (errDiv) errDiv.style.display = 'none';
    var note = (refInput && refInput.value) ? refInput.value.trim() : '';
    xhr('POST', '/campus/course-order/' + orderId + '/proof',
      { proof_url: proofUrl, note: note },
      function() { showResultSuccess('Preuve soumise !', 'Votre justificatif a \u00e9t\u00e9 envoy\u00e9. La formation sera valid\u00e9e sous 24\u201348h.'); },
      function(err) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>Soumettre la preuve'; }
        if (errDiv) { errDiv.textContent = err.error || 'Erreur.'; errDiv.style.display = ''; }
      }
    );
  };

  // ── Checkout générique (autres méthodes) ─────────────────────
  function renderCheckoutProof(orderId, amt, label) {
    var html = '';
    html += '<div class="cb-card">';
    html += '<div class="cb-section-title">' + escHtml(label) + '</div>';
    html += '<div class="cb-info">Montant : <strong style="color:#c9a84c;">' + fmtUsd(amt) + '</strong></div>';
    html += renderProofForm(orderId);
    html += '</div>';
    setHtml('cb-checkout-section', html);
  }

  // ── 10. Résultats ────────────────────────────────────────────
  function showResultSuccess(title, msg) {
    showSection('cb-result-section');
    var html = '';
    html += '<div class="cb-card cb-success">';
    html += '<div class="cb-success-icon"><i class="fas fa-check-circle" style="color:#4ade80;"></i></div>';
    html += '<div class="cb-success-title">' + escHtml(title) + '</div>';
    html += '<div class="cb-success-msg">' + escHtml(msg) + '</div>';
    html += '<button class="cb-btn-primary" style="margin-top:20px;" onclick="window.location.href=\'/login#campus\'">Retour au Campus</button>';
    html += '</div>';
    setHtml('cb-result-section', html);
  }

  function showResultOwned() {
    showSection('cb-result-section');
    var html = '';
    html += '<div class="cb-card">';
    html += '<div style="text-align:center;padding:20px 0;">';
    html += '<i class="fas fa-graduation-cap" style="font-size:48px;color:#4ade80;margin-bottom:12px;display:block;"></i>';
    html += '<div style="font-size:20px;font-weight:700;color:#4ade80;margin-bottom:8px;">Vous avez d\u00e9j\u00e0 acc\u00e8s</div>';
    html += '<div style="font-size:14px;color:#86efac;margin-bottom:20px;">Vous poss\u00e9dez d\u00e9j\u00e0 cette formation.</div>';
    html += '<button class="cb-btn-primary" onclick="window.location.href=\'/login#campus\'">Aller au Campus</button>';
    html += '</div></div>';
    setHtml('cb-result-section', html);
  }

  function showResultProofDone(orderId) {
    showSection('cb-result-section');
    var html = '';
    html += '<div class="cb-card">';
    html += '<div style="text-align:center;padding:20px 0;">';
    html += '<i class="fas fa-hourglass-half" style="font-size:48px;color:#f59e0b;margin-bottom:12px;display:block;"></i>';
    html += '<div style="font-size:20px;font-weight:700;color:#f59e0b;margin-bottom:8px;">Preuve d\u00e9j\u00e0 soumise</div>';
    html += '<div style="font-size:14px;color:#fcd34d;margin-bottom:8px;">Votre preuve est en cours de validation.</div>';
    if (orderId) {
      html += '<div style="font-size:12px;color:#6b7280;margin-bottom:20px;">R\u00e9f. : ' + escHtml(String(orderId).substring(0, 16)) + '\u2026</div>';
    }
    html += '<button class="cb-btn-primary" onclick="window.location.href=\'/login#campus\'">Retour au Campus</button>';
    html += '</div></div>';
    setHtml('cb-result-section', html);
  }

  // ── 11. Navigation ───────────────────────────────────────────
  window._cbBackToMethods = function() {
    CB.proofUrl = '';
    CB.orderId = null;
    CB.selectedMethod = '';
    showSection('cb-payment-section');
    var sec = el('cb-course-info');
    if (sec) sec.style.display = '';
  };

  // ── Démarrage ────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
