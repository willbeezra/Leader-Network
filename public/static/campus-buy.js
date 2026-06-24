// campus-buy.js — Flow d'achat campus autonome
// Safari-safe : zéro template literal imbriqué, zéro async wizard
// Toutes les fonctions sont courtes, synchrones quand possible
// API calls via fetch() natif avec token JWT depuis localStorage
// ─────────────────────────────────────────────────────────────

'use strict';

// ── Utilitaires de base ───────────────────────────────────────

function cbToken() {
  return localStorage.getItem('authToken') || localStorage.getItem('token') || '';
}

function cbApi(method, path, body) {
  var opts = {
    method: method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cbToken() }
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch('/api' + path, opts).then(function(r) {
    return r.json().then(function(d) {
      if (!r.ok) throw d;
      return d;
    });
  });
}

function cbFmt(amount) {
  return '$' + Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
}

function cbEl(id) {
  return document.getElementById(id);
}

function cbSetHTML(id, html) {
  var el = cbEl(id);
  if (el) el.innerHTML = html;
}

function cbShow(id) {
  var el = cbEl(id);
  if (el) el.style.display = 'block';
}

function cbHide(id) {
  var el = cbEl(id);
  if (el) el.style.display = 'none';
}

function cbToast(msg, type) {
  var t = cbEl('cb-toast');
  if (!t) return;
  t.textContent = msg;
  t.style.background = type === 'error' ? '#450a0a' : '#052e16';
  t.style.color = type === 'error' ? '#fca5a5' : '#4ade80';
  t.style.border = type === 'error' ? '1px solid #7f1d1d' : '1px solid #166534';
  t.style.display = 'block';
  setTimeout(function() { t.style.display = 'none'; }, 4000);
}

function cbLoaderHTML() {
  return '<div class="cb-loader"><div class="cb-spinner"></div>Chargement…</div>';
}

function cbErrorHTML(msg) {
  return '<div class="cb-error"><i class="fas fa-exclamation-circle" style="font-size:28px;margin-bottom:10px;display:block;"></i><div>' + (msg || 'Une erreur est survenue.') + '</div><button class="cb-btn-secondary" style="margin-top:14px;width:auto;padding:8px 20px;" onclick="location.reload()">Réessayer</button></div>';
}

// ── État global ───────────────────────────────────────────────

var _cbState = {
  courseId: null,
  course: null,
  gw: null,
  orderId: null,
  stripePublicKey: null,
  ppClientId: null,
  ppSdkLoaded: false,
  ppSdkLoading: false,
  walletBalance: 0,
  selectedMethod: null,
  v2Methods: [],
  v2ManualMethods: [],
  cpEnabled: false,
  cpCoins: 'USDT.TRC20,LTC,ETH,BTC'
};

// ── Étape 1 : charger les infos de la formation ───────────────

function cbLoadCourse() {
  cbSetHTML('cb-course-info', cbLoaderHTML());
  cbApi('GET', '/campus/courses').then(function(data) {
    var courses = data.courses || data || [];
    var found = null;
    for (var i = 0; i < courses.length; i++) {
      if (String(courses[i].id) === String(_cbState.courseId)) {
        found = courses[i];
        break;
      }
    }
    if (!found) {
      cbSetHTML('cb-course-info', cbErrorHTML('Formation introuvable (id: ' + _cbState.courseId + ')'));
      return;
    }
    _cbState.course = found;
    cbRenderCourseInfo(found);
    cbLoadPaymentMethods();
  }).catch(function(err) {
    cbSetHTML('cb-course-info', cbErrorHTML((err && err.error) || 'Impossible de charger la formation.'));
  });
}

function cbRenderCourseInfo(course) {
  var price = cbFmt(course.price_usd || course.price || 0);
  var title = (course.title || course.name || 'Formation').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  var desc = (course.description || course.short_description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  var html = '<div class="cb-card">';
  html += '<div class="cb-title">' + title + '</div>';
  html += '<div class="cb-price">' + price + '</div>';
  if (desc) html += '<div class="cb-desc">' + desc + '</div>';
  html += '</div>';
  cbSetHTML('cb-course-info', html);
}

// ── Étape 2 : charger les moyens de paiement ─────────────────

function cbLoadPaymentMethods() {
  cbSetHTML('cb-methods-list', cbLoaderHTML());
  cbShow('cb-payment-section');

  // On lance toutes les requêtes en parallèle
  var promises = [
    cbApi('GET', '/members/packages'),
    cbApi('GET', '/members/stripe/config').catch(function() { return null; }),
    cbApi('GET', '/members/coinpayments/config').catch(function() { return null; }),
    cbApi('GET', '/payment/methods').catch(function() { return null; }),
    cbApi('GET', '/members/wallet').catch(function() { return null; })
  ];

  Promise.all(promises).then(function(results) {
    var pkgData = results[0] || {};
    var stripeData = results[1];
    var cpData = results[2];
    var methodsData = results[3];
    var walletData = results[4];

    // Gateways (paypal, bank, crypto, manual)
    var gateways = pkgData.gateways || {};
    _cbState.gw = cbBuildGw(gateways);
    _cbState.adminFee = pkgData.adminFee || { amount: 0, active: false, paid: true };

    // Stripe
    if (stripeData && stripeData.enabled) {
      _cbState.stripePublicKey = stripeData.public_key;
    }

    // CoinPayments
    if (cpData && cpData.enabled) {
      _cbState.cpEnabled = true;
      _cbState.cpCoins = cpData.coins || 'USDT.TRC20,USDT.ERC20,BTC,ETH';
    }

    // v2 PSP (automatiques sauf exclus)
    var excluded = ['stripe', 'paypal', 'coinpayments', 'wallet', 'internal_wallet', 'internal', 'leader_wallet'];
    if (methodsData && methodsData.methods) {
      var allMethods = [];
      Object.values(methodsData.methods).forEach(function(arr) {
        if (Array.isArray(arr)) allMethods = allMethods.concat(arr);
      });
      _cbState.v2Methods = allMethods.filter(function(m) {
        return m.is_automatic && m.is_active && excluded.indexOf(m.provider) === -1;
      });
      _cbState.v2ManualMethods = allMethods.filter(function(m) {
        return !m.is_automatic && m.is_active && ['leader_wallet', 'internal_wallet', 'internal', 'wallet'].indexOf(m.provider) === -1;
      });
    }

    // Wallet
    if (walletData) {
      _cbState.walletBalance = Number(
        (walletData.wallet && walletData.wallet.balance) ||
        (walletData.member && walletData.member.wallet_balance) ||
        0
      );
    }

    cbRenderMethods();
  }).catch(function(err) {
    cbSetHTML('cb-methods-list', cbErrorHTML((err && err.error) || 'Impossible de charger les moyens de paiement.'));
  });
}

function cbBuildGw(e) {
  return {
    paypal_email: (e.paypal && e.paypal.email) || '',
    paypal_instructions: (e.paypal && e.paypal.instructions) || '',
    paypal_active: (e.paypal && e.paypal.active === 'true'),
    bank_name: (e.bank && e.bank.name) || '',
    bank_beneficiary: (e.bank && e.bank.beneficiary) || '',
    bank_iban: (e.bank && e.bank.iban) || '',
    bank_swift: (e.bank && e.bank.swift) || '',
    bank_instructions: (e.bank && e.bank.instructions) || '',
    bank_active: (e.bank && e.bank.active === 'true'),
    crypto_address: (e.crypto && e.crypto.address) || '',
    crypto_network: (e.crypto && e.crypto.network) || '',
    crypto_instructions: (e.crypto && e.crypto.instructions) || '',
    crypto_active: (e.crypto && e.crypto.active === 'true'),
    wallet_active: (e.wallet && e.wallet.active === 'true'),
    instructions: (e.manual && e.manual.instructions) || '',
    contact_email: (e.manual && e.manual.contact_email) || '',
    contact_phone: (e.manual && e.manual.contact_phone) || '',
    manual_active: (e.manual && e.manual.active === 'true')
  };
}

// ── Rendu de la liste des méthodes ───────────────────────────

function cbRenderMethods() {
  var gw = _cbState.gw;
  var amount = parseFloat((_cbState.course && (_cbState.course.price_usd || _cbState.course.price)) || 0);
  var html = '';

  // Stripe
  if (_cbState.stripePublicKey) {
    html += '<button class="cb-method stripe" onclick="cbSelectMethod(\'stripe\')">';
    html += '<span class="cb-method-icon"><i class="fas fa-credit-card" style="color:#a78bfa;"></i></span>';
    html += '<span><div class="cb-method-label">Carte bancaire / Apple Pay / Google Pay</div>';
    html += '<div class="cb-method-sub">Paiement immédiat · Visa, Mastercard, Amex, Apple Pay, Google Pay</div></span>';
    html += '<span class="cb-badge green">Recommandé</span>';
    html += '</button>';
  }

  // PayPal
  if (gw.paypal_active && gw.paypal_email) {
    html += '<button class="cb-method paypal" onclick="cbSelectMethod(\'paypal\')">';
    html += '<span class="cb-method-icon"><i class="fab fa-paypal" style="color:#60a5fa;"></i></span>';
    html += '<span><div class="cb-method-label">PayPal / Carte bancaire</div>';
    html += '<div class="cb-method-sub">Paiement immédiat et sécurisé · Visa, Mastercard, PayPal</div></span>';
    html += '</button>';
  }

  // Virement bancaire
  if (gw.bank_active && (gw.bank_iban || gw.bank_name)) {
    html += '<button class="cb-method bank" onclick="cbSelectMethod(\'bank\')">';
    html += '<span class="cb-method-icon"><i class="fas fa-university" style="color:#34d399;"></i></span>';
    html += '<span><div class="cb-method-label">Virement bancaire</div>';
    html += '<div class="cb-method-sub">Traitement sous 1-3 jours ouvrés</div></span>';
    html += '</button>';
  }

  // Crypto manuel
  if (gw.crypto_active && gw.crypto_address) {
    html += '<button class="cb-method crypto" onclick="cbSelectMethod(\'crypto\')">';
    html += '<span class="cb-method-icon"><i class="fas fa-coins" style="color:#fbbf24;"></i></span>';
    html += '<span><div class="cb-method-label">Cryptomonnaie (manuel)</div>';
    html += '<div class="cb-method-sub">Envoi direct vers notre adresse · ' + (gw.crypto_network || 'Réseau blockchain') + '</div></span>';
    html += '</button>';
  }

  // CoinPayments
  if (_cbState.cpEnabled) {
    html += '<button class="cb-method coinpayments" onclick="cbSelectMethod(\'coinpayments\')">';
    html += '<span class="cb-method-icon"><i class="fas fa-coins" style="color:#f97316;"></i></span>';
    html += '<span><div class="cb-method-label">Cryptomonnaie via CoinPayments</div>';
    html += '<div class="cb-method-sub">Bitcoin, Ethereum, USDT TRC20, Litecoin et plus</div></span>';
    html += '<span class="cb-badge orange">Crypto</span>';
    html += '</button>';
  }

  // Wallet interne
  if (gw.wallet_active) {
    var wbal = _cbState.walletBalance;
    var canW = wbal >= amount;
    var wbalStr = cbFmt(wbal);
    html += '<button class="cb-method wallet" onclick="cbSelectMethod(\'wallet\')" ' + (canW ? '' : 'style="opacity:.6;"') + '>';
    html += '<span class="cb-method-icon"><i class="fas fa-wallet" style="color:#22d3ee;"></i></span>';
    html += '<span><div class="cb-method-label">Wallet interne — ' + wbalStr + '</div>';
    html += '<div class="cb-method-sub">' + (canW ? 'Paiement instantané depuis votre solde' : 'Solde insuffisant (' + wbalStr + ' disponible)') + '</div></span>';
    if (canW) html += '<span class="cb-badge cyan">Instantané</span>';
    html += '</button>';
  }

  // v2 PSP automatiques (Mollie, etc.)
  for (var i = 0; i < _cbState.v2Methods.length; i++) {
    var m = _cbState.v2Methods[i];
    var ico = m.provider === 'mollie' ? 'fas fa-credit-card' : 'fas fa-globe';
    var name = (m.display_name || m.provider).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var safeId = (m.id + '').replace(/'/g, '');
    var safeProvider = (m.provider + '').replace(/'/g, '');
    var safeName = name;
    html += '<button class="cb-method v2psp" onclick="cbSelectMethodV2Psp(\'' + safeId + '\',\'' + safeProvider + '\',\'' + safeName + '\')">';
    html += '<span class="cb-method-icon"><i class="' + ico + '" style="color:#a78bfa;"></i></span>';
    html += '<span><div class="cb-method-label">' + name + '</div>';
    html += '<div class="cb-method-sub">Paiement en ligne sécurisé</div></span>';
    html += '</button>';
  }

  // v2 manuels
  for (var j = 0; j < _cbState.v2ManualMethods.length; j++) {
    var mm = _cbState.v2ManualMethods[j];
    var mname = (mm.display_name || mm.provider).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var mmId = (mm.id + '').replace(/'/g, '');
    var mmProvider = (mm.provider + '').replace(/'/g, '');
    var mmName = mname;
    html += '<button class="cb-method manual" onclick="cbSelectMethodV2Manual(\'' + mmId + '\',\'' + mmProvider + '\',\'' + mmName + '\')">';
    html += '<span class="cb-method-icon">' + (mm.logo_emoji || '<i class="fas fa-info-circle" style="color:#9ca3af;"></i>') + '</span>';
    html += '<span><div class="cb-method-label">' + mname + '</div>';
    html += '<div class="cb-method-sub">Paiement manuel</div></span>';
    html += '</button>';
  }

  // Manuel générique (instructions)
  if (gw.manual_active && gw.instructions) {
    html += '<button class="cb-method manual" onclick="cbSelectMethod(\'manual\')">';
    html += '<span class="cb-method-icon"><i class="fas fa-info-circle" style="color:#9ca3af;"></i></span>';
    html += '<span><div class="cb-method-label">Autre méthode</div>';
    html += '<div class="cb-method-sub">Voir instructions de paiement</div></span>';
    html += '</button>';
  }

  if (!html) {
    html = '<div class="cb-info"><i class="fas fa-info-circle" style="margin-right:8px;"></i>Aucun moyen de paiement disponible pour le moment. Contactez le support.</div>';
  }

  cbSetHTML('cb-methods-list', html);
}

// ── Sélection d'une méthode ───────────────────────────────────

function cbSelectMethod(method) {
  _cbState.selectedMethod = method;
  cbHide('cb-payment-section');
  cbShow('cb-checkout-section');
  cbRenderCheckout(method);
}

function cbSelectMethodV2Psp(id, provider, name) {
  _cbState.selectedMethod = 'v2_psp';
  _cbState.v2MethodId = id;
  _cbState.v2DisplayName = name;
  cbHide('cb-payment-section');
  cbShow('cb-checkout-section');
  cbRenderCheckoutV2Psp(id, name);
}

function cbSelectMethodV2Manual(id, provider, name) {
  _cbState.selectedMethod = 'v2_manual';
  _cbState.v2MethodId = id;
  _cbState.v2DisplayName = name;
  cbHide('cb-payment-section');
  cbShow('cb-checkout-section');
  cbRenderCheckoutV2Manual(id, name);
}

// ── Checkout : rendu selon la méthode ────────────────────────

function cbRenderCheckout(method) {
  var gw = _cbState.gw;
  var course = _cbState.course;
  var amount = parseFloat((course && (course.price_usd || course.price)) || 0);
  var amtStr = cbFmt(amount);
  var html = '';

  html += '<div class="cb-card">';
  html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">';
  html += '<button class="cb-btn-secondary" style="width:auto;padding:6px 14px;" onclick="cbBackToMethods()"><i class="fas fa-arrow-left"></i></button>';
  html += '<span style="font-weight:700;color:#fff;">Montant : <span style="color:#c9a84c;">' + amtStr + '</span></span>';
  html += '</div>';

  if (method === 'stripe') {
    html += cbCheckoutStripeHTML(amount);
  } else if (method === 'paypal') {
    html += cbCheckoutPayPalHTML(amount);
  } else if (method === 'bank') {
    html += cbCheckoutBankHTML(gw, amount);
  } else if (method === 'crypto') {
    html += cbCheckoutCryptoHTML(gw, amount);
  } else if (method === 'coinpayments') {
    html += cbCheckoutCoinPaymentsHTML(amount);
  } else if (method === 'wallet') {
    html += cbCheckoutWalletHTML(amount);
  } else if (method === 'manual') {
    html += cbCheckoutManualHTML(gw, amount);
  }

  html += '</div>';
  cbSetHTML('cb-checkout-section', html);

  // Initialisation post-rendu
  if (method === 'stripe') {
    setTimeout(function() { cbInitStripe(amount); }, 100);
  } else if (method === 'paypal') {
    setTimeout(function() { cbInitPayPal(amount); }, 100);
  } else if (method === 'coinpayments') {
    setTimeout(function() { cbCreateCoinPaymentsOrder(amount); }, 100);
  }
}

// ─────────────── Stripe ──────────────────────────────────────

function cbCheckoutStripeHTML(amount) {
  var html = '<div id="stripe-payment-element" style="margin-bottom:16px;">';
  html += '<div class="cb-loader"><div class="cb-spinner"></div>Chargement du module Stripe…</div>';
  html += '</div>';
  html += '<div id="stripe-error-msg" class="cb-error" style="display:none;margin-bottom:12px;"></div>';
  html += '<button id="stripe-pay-btn" class="cb-btn-primary" onclick="cbStripeConfirm()" disabled>';
  html += '<i class="fas fa-lock" style="margin-right:8px;"></i>Payer ' + cbFmt(amount);
  html += '</button>';
  return html;
}

var _cbStripe = null;
var _cbStripeElements = null;
var _cbStripePiSecret = null;
var _cbStripePiId = null;

function cbInitStripe(amount) {
  var key = _cbState.stripePublicKey;
  if (!key) {
    cbSetHTML('stripe-payment-element', '<div class="cb-error">Stripe non configuré.</div>');
    return;
  }

  cbLoadStripeSdk().then(function(ok) {
    if (!ok) {
      cbSetHTML('stripe-payment-element', '<div class="cb-error">Impossible de charger Stripe. Vérifiez votre connexion.</div>');
      return;
    }
    return cbCreateOrderThen(function(orderId) {
      return cbApi('POST', '/members/stripe/create-payment-intent', {
        amount: amount,
        order_id: orderId,
        description: 'LEADER — Campus ' + _cbState.courseId
      });
    });
  }).then(function(pi) {
    if (!pi) return;
    _cbStripePiSecret = pi.client_secret;
    _cbStripePiId = pi.payment_intent_id;
    var appearance = {
      theme: 'night',
      variables: {
        colorPrimary: '#c9a84c',
        colorBackground: '#1a1f2e',
        colorText: '#ffffff',
        colorDanger: '#f87171',
        borderRadius: '12px',
        fontFamily: 'system-ui, sans-serif'
      }
    };
    _cbStripe = Stripe(key);
    _cbStripeElements = _cbStripe.elements({ clientSecret: _cbStripePiSecret, appearance: appearance });
    _cbStripeElements.create('payment', { layout: 'tabs' }).mount('#stripe-payment-element');
    var btn = cbEl('stripe-pay-btn');
    if (btn) btn.disabled = false;
  }).catch(function(err) {
    cbSetHTML('stripe-payment-element', cbErrorHTML((err && err.error) || 'Erreur Stripe.'));
  });
}

function cbLoadStripeSdk() {
  if (window.Stripe) return Promise.resolve(true);
  return new Promise(function(resolve) {
    var s = document.createElement('script');
    s.src = 'https://js.stripe.com/v3/';
    s.onload = function() { resolve(true); };
    s.onerror = function() { resolve(false); };
    document.head.appendChild(s);
  });
}

function cbStripeConfirm() {
  var btn = cbEl('stripe-pay-btn');
  var errEl = cbEl('stripe-error-msg');
  if (!_cbStripe || !_cbStripeElements) return;
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="cb-spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></div>'; }
  if (errEl) errEl.style.display = 'none';

  _cbStripe.confirmPayment({ elements: _cbStripeElements, redirect: 'if_required' }).then(function(result) {
    var error = result.error;
    var pi = result.paymentIntent;
    if (error) {
      if (errEl) { errEl.textContent = error.message || 'Paiement refusé'; errEl.style.display = 'block'; }
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock" style="margin-right:8px;"></i>Réessayer'; }
      return;
    }
    if (pi && pi.status === 'succeeded') {
      if (btn) btn.innerHTML = '<div class="cb-spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto;"></div>';
      return cbApi('POST', '/members/stripe/confirm-payment', {
        payment_intent_id: _cbStripePiId,
        order_id: _cbState.orderId
      });
    }
    if (errEl) { errEl.textContent = 'Statut inattendu: ' + (pi && pi.status); errEl.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock" style="margin-right:8px;"></i>Réessayer'; }
  }).then(function(res) {
    if (!res) return;
    cbShowSuccess(res.message || 'Paiement confirmé et formation activée !');
  }).catch(function(err) {
    if (errEl) { errEl.textContent = (err && err.error) || 'Erreur lors du paiement'; errEl.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock" style="margin-right:8px;"></i>Réessayer'; }
  });
}

// ─────────────── PayPal ──────────────────────────────────────

function cbCheckoutPayPalHTML(amount) {
  var html = '<div class="cb-info"><i class="fas fa-bolt" style="margin-right:8px;color:#fbbf24;"></i>';
  html += 'Paiement sécurisé via PayPal. Activation immédiate après confirmation.';
  html += '</div>';
  html += '<div id="cb-paypal-container">';
  html += '<div class="cb-loader"><div class="cb-spinner"></div>Chargement PayPal…</div>';
  html += '</div>';
  return html;
}

function cbInitPayPal(amount) {
  if (!_cbState.ppClientId) {
    cbApi('GET', '/members/paypal/config').then(function(data) {
      if (!data || !data.enabled || !data.client_id) {
        cbSetHTML('cb-paypal-container', cbErrorHTML('PayPal non disponible.'));
        return;
      }
      _cbState.ppClientId = data.client_id;
      cbLoadPayPalSdk().then(function(ok) {
        if (!ok) { cbSetHTML('cb-paypal-container', cbErrorHTML('SDK PayPal indisponible.')); return; }
        cbRenderPayPalButtons(amount);
      });
    }).catch(function() {
      cbSetHTML('cb-paypal-container', cbErrorHTML('Erreur PayPal.'));
    });
    return;
  }
  cbLoadPayPalSdk().then(function(ok) {
    if (!ok) { cbSetHTML('cb-paypal-container', cbErrorHTML('SDK PayPal indisponible.')); return; }
    cbRenderPayPalButtons(amount);
  });
}

function cbLoadPayPalSdk() {
  if (window.paypal) return Promise.resolve(true);
  if (_cbState.ppSdkLoaded) return Promise.resolve(true);
  if (_cbState.ppSdkLoading) {
    return new Promise(function(resolve) {
      var tries = 0;
      var check = setInterval(function() {
        tries++;
        if (window.paypal) { clearInterval(check); resolve(true); return; }
        if (tries > 80) { clearInterval(check); resolve(false); }
      }, 100);
    });
  }
  _cbState.ppSdkLoading = true;
  return new Promise(function(resolve) {
    var s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + _cbState.ppClientId + '&currency=USD&components=buttons&enable-funding=card,paylater&disable-funding=venmo';
    s.onload = function() { _cbState.ppSdkLoaded = true; _cbState.ppSdkLoading = false; resolve(true); };
    s.onerror = function() { _cbState.ppSdkLoading = false; resolve(false); };
    document.head.appendChild(s);
  });
}

function cbRenderPayPalButtons(amount) {
  var containerId = 'cb-paypal-container';
  cbSetHTML(containerId, '<div id="cb-paypal-btns"></div>');

  paypal.Buttons({
    style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 45 },
    createOrder: function() {
      return cbCreateOrderThen(function(orderId) {
        return cbApi('POST', '/members/paypal/create-order', {
          amount: amount,
          order_id: orderId,
          currency: 'USD'
        }).then(function(d) { return d.paypal_order_id || d.id; });
      });
    },
    onApprove: function(data) {
      cbSetHTML(containerId, cbLoaderHTML());
      return cbApi('POST', '/members/paypal/capture-order', { paypal_order_id: data.orderID }).then(function(r) {
        cbShowSuccess(r.message || 'Paiement PayPal confirmé et formation activée !');
      }).catch(function(err) {
        cbSetHTML(containerId, cbErrorHTML((err && err.error) || 'Erreur lors de la capture PayPal.'));
      });
    },
    onError: function() {
      cbSetHTML(containerId, cbErrorHTML('Une erreur PayPal est survenue. Réessayez ou choisissez une autre méthode.'));
    },
    onCancel: function() {
      cbSetHTML(containerId, '<div class="cb-info" style="color:#fbbf24;"><i class="fas fa-times-circle" style="margin-right:8px;"></i>Paiement annulé. Cliquez sur « Retour » pour recommencer.</div>');
    }
  }).render('#cb-paypal-btns');
}

// ─────────────── Virement bancaire ───────────────────────────

function cbCheckoutBankHTML(gw, amount) {
  var html = '<div class="cb-info">';
  html += '<div style="font-weight:700;margin-bottom:8px;"><i class="fas fa-university" style="margin-right:8px;color:#34d399;"></i>Coordonnées bancaires</div>';
  if (gw.bank_beneficiary) html += '<div class="cb-field"><span class="cb-label">Bénéficiaire</span><div style="color:#e5e7eb;font-weight:600;">' + gw.bank_beneficiary.replace(/</g,'&lt;') + '</div></div>';
  if (gw.bank_name) html += '<div class="cb-field"><span class="cb-label">Banque</span><div style="color:#e5e7eb;">' + gw.bank_name.replace(/</g,'&lt;') + '</div></div>';
  if (gw.bank_iban) html += '<div class="cb-field"><span class="cb-label">IBAN</span><div style="color:#e5e7eb;font-family:monospace;font-size:13px;word-break:break-all;">' + gw.bank_iban.replace(/</g,'&lt;') + '</div></div>';
  if (gw.bank_swift) html += '<div class="cb-field"><span class="cb-label">BIC/SWIFT</span><div style="color:#e5e7eb;font-family:monospace;">' + gw.bank_swift.replace(/</g,'&lt;') + '</div></div>';
  html += '<div class="cb-field"><span class="cb-label">Montant exact à virer</span><div style="color:#c9a84c;font-size:20px;font-weight:800;">' + cbFmt(amount) + '</div></div>';
  if (gw.bank_instructions) html += '<div style="margin-top:8px;font-size:13px;color:#93c5fd;">' + gw.bank_instructions.replace(/</g,'&lt;') + '</div>';
  html += '</div>';
  html += cbProofFormHTML('bank');
  return html;
}

// ─────────────── Crypto manuel ───────────────────────────────

function cbCheckoutCryptoHTML(gw, amount) {
  var html = '<div class="cb-info">';
  html += '<div style="font-weight:700;margin-bottom:8px;"><i class="fas fa-coins" style="margin-right:8px;color:#fbbf24;"></i>Adresse de réception crypto</div>';
  if (gw.crypto_network) html += '<div class="cb-field"><span class="cb-label">Réseau</span><div style="color:#e5e7eb;font-weight:600;">' + gw.crypto_network.replace(/</g,'&lt;') + '</div></div>';
  if (gw.crypto_address) html += '<div class="cb-field"><span class="cb-label">Adresse</span><div style="color:#e5e7eb;font-family:monospace;font-size:12px;word-break:break-all;">' + gw.crypto_address.replace(/</g,'&lt;') + '</div></div>';
  html += '<div class="cb-field"><span class="cb-label">Montant équivalent</span><div style="color:#c9a84c;font-size:20px;font-weight:800;">' + cbFmt(amount) + '</div></div>';
  html += '<div style="color:#f87171;font-size:12px;margin-top:4px;"><i class="fas fa-exclamation-triangle" style="margin-right:4px;"></i>Vérifiez bien le réseau avant d\'envoyer.</div>';
  if (gw.crypto_instructions) html += '<div style="margin-top:8px;font-size:13px;color:#93c5fd;">' + gw.crypto_instructions.replace(/</g,'&lt;') + '</div>';
  html += '</div>';
  html += cbProofFormHTML('crypto');
  return html;
}

// ─────────────── CoinPayments ────────────────────────────────

function cbCheckoutCoinPaymentsHTML(amount) {
  return '<div class="cb-loader"><div class="cb-spinner"></div>Création du paiement CoinPayments…</div>';
}

function cbCreateCoinPaymentsOrder(amount) {
  cbCreateOrderThen(function(orderId) {
    return cbApi('POST', '/members/coinpayments/create', {
      amount: amount,
      order_id: orderId,
      currency1: 'USD',
      currency2: 'USDT.TRC20'
    });
  }).then(function(data) {
    var html = '<div class="cb-info">';
    html += '<div style="font-weight:700;margin-bottom:12px;"><i class="fas fa-coins" style="margin-right:8px;color:#f97316;"></i>Paiement CoinPayments</div>';
    if (data.checkout_url || data.status_url) {
      html += '<a href="' + (data.checkout_url || data.status_url) + '" target="_blank" class="cb-btn-primary" style="display:block;text-align:center;text-decoration:none;margin-bottom:12px;">';
      html += '<i class="fas fa-external-link-alt" style="margin-right:8px;"></i>Ouvrir la page de paiement CoinPayments';
      html += '</a>';
    }
    if (data.txn_id) html += '<div class="cb-field"><span class="cb-label">Référence transaction</span><div style="font-family:monospace;font-size:12px;color:#e5e7eb;">' + data.txn_id + '</div></div>';
    html += '<div style="font-size:12px;color:#9ca3af;margin-top:8px;">La formation sera activée automatiquement après confirmation du paiement.</div>';
    html += '</div>';
    cbSetHTML('cb-checkout-section', html);
  }).catch(function(err) {
    cbSetHTML('cb-checkout-section', cbErrorHTML((err && err.error) || 'Erreur CoinPayments.'));
  });
}

// ─────────────── Wallet interne ──────────────────────────────

function cbCheckoutWalletHTML(amount) {
  var wbal = _cbState.walletBalance;
  var canW = wbal >= amount;
  var html = '<div class="cb-info">';
  html += '<div style="font-weight:700;margin-bottom:8px;"><i class="fas fa-wallet" style="margin-right:8px;color:#22d3ee;"></i>Paiement depuis votre Wallet</div>';
  html += '<div class="cb-field"><span class="cb-label">Solde disponible</span><div style="color:#22d3ee;font-size:20px;font-weight:800;">' + cbFmt(wbal) + '</div></div>';
  html += '<div class="cb-field"><span class="cb-label">Montant à payer</span><div style="color:#c9a84c;font-size:20px;font-weight:800;">' + cbFmt(amount) + '</div></div>';
  if (!canW) {
    html += '<div style="color:#f87171;font-size:13px;"><i class="fas fa-exclamation-circle" style="margin-right:6px;"></i>Solde insuffisant. Il vous manque ' + cbFmt(amount - wbal) + '.</div>';
  }
  html += '</div>';
  if (canW) {
    html += '<button class="cb-btn-primary" id="cb-wallet-pay-btn" onclick="cbPayWithWallet()">';
    html += '<i class="fas fa-check" style="margin-right:8px;"></i>Confirmer le paiement par Wallet';
    html += '</button>';
  }
  return html;
}

function cbPayWithWallet() {
  var btn = cbEl('cb-wallet-pay-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = cbLoaderHTML(); }
  cbCreateOrderThen(function(orderId) {
    return cbApi('POST', '/members/wallet/pay', {
      order_id: orderId,
      amount: (_cbState.course && (_cbState.course.price_usd || _cbState.course.price)) || 0
    });
  }).then(function(r) {
    cbShowSuccess(r.message || 'Paiement par Wallet confirmé ! Formation activée.');
  }).catch(function(err) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check" style="margin-right:8px;"></i>Confirmer le paiement par Wallet'; }
    cbToast((err && err.error) || 'Erreur Wallet.', 'error');
  });
}

// ─────────────── Manuel générique ────────────────────────────

function cbCheckoutManualHTML(gw, amount) {
  var html = '<div class="cb-info">';
  html += '<div style="font-weight:700;margin-bottom:8px;"><i class="fas fa-info-circle" style="margin-right:8px;"></i>Instructions de paiement</div>';
  if (gw.instructions) html += '<div style="margin-bottom:10px;font-size:14px;white-space:pre-wrap;">' + gw.instructions.replace(/</g,'&lt;') + '</div>';
  if (gw.contact_email) html += '<div class="cb-field"><span class="cb-label">Contact email</span><div><a href="mailto:' + gw.contact_email + '" style="color:#60a5fa;">' + gw.contact_email + '</a></div></div>';
  if (gw.contact_phone) html += '<div class="cb-field"><span class="cb-label">Téléphone</span><div style="color:#e5e7eb;">' + gw.contact_phone.replace(/</g,'&lt;') + '</div></div>';
  html += '<div class="cb-field"><span class="cb-label">Montant</span><div style="color:#c9a84c;font-size:20px;font-weight:800;">' + cbFmt(amount) + '</div></div>';
  html += '</div>';
  html += cbProofFormHTML('manual');
  return html;
}

// ─────────────── v2 PSP (Mollie, etc.) ───────────────────────

function cbRenderCheckoutV2Psp(methodId, name) {
  var course = _cbState.course;
  var amount = parseFloat((course && (course.price_usd || course.price)) || 0);
  var safeName = (name + '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  var html = '<div class="cb-card">';
  html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">';
  html += '<button class="cb-btn-secondary" style="width:auto;padding:6px 14px;" onclick="cbBackToMethods()"><i class="fas fa-arrow-left"></i></button>';
  html += '<span style="font-weight:700;color:#fff;">' + safeName + ' — <span style="color:#c9a84c;">' + cbFmt(amount) + '</span></span>';
  html += '</div>';
  html += '<div class="cb-loader"><div class="cb-spinner"></div>Création de la commande et redirection vers ' + safeName + '…</div>';
  html += '</div>';
  cbSetHTML('cb-checkout-section', html);

  // Créer la commande et rediriger
  cbCreateOrderFor('v2_psp').then(function(orderId) {
    return cbApi('POST', '/psp/initiate', {
      payment_method_id: methodId,
      amount: amount,
      order_id: orderId,
      return_url: window.location.href
    });
  }).then(function(pspResp) {
    if (pspResp.redirect_url) {
      window.location.href = pspResp.redirect_url;
    } else {
      throw { error: 'URL de redirection manquante' };
    }
  }).catch(function(err) {
    var errHtml = '<div class="cb-card">';
    errHtml += '<button class="cb-btn-secondary" style="width:auto;padding:6px 14px;margin-bottom:16px;" onclick="cbBackToMethods()"><i class="fas fa-arrow-left"></i> Retour</button>';
    errHtml += cbErrorHTML((err && err.error) || 'Erreur lors de la redirection vers ' + safeName + '.');
    errHtml += '</div>';
    cbSetHTML('cb-checkout-section', errHtml);
  });
}

// ─────────────── v2 Manuel ───────────────────────────────────

function cbRenderCheckoutV2Manual(methodId, name) {
  var course = _cbState.course;
  var amount = parseFloat((course && (course.price_usd || course.price)) || 0);
  var safeName = (name + '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  var html = '<div class="cb-card">';
  html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">';
  html += '<button class="cb-btn-secondary" style="width:auto;padding:6px 14px;" onclick="cbBackToMethods()"><i class="fas fa-arrow-left"></i></button>';
  html += '<span style="font-weight:700;color:#fff;">' + safeName + ' — <span style="color:#c9a84c;">' + cbFmt(amount) + '</span></span>';
  html += '</div>';
  html += '<div class="cb-info"><i class="fas fa-info-circle" style="margin-right:8px;"></i>';
  html += 'Effectuez le paiement de <strong>' + cbFmt(amount) + '</strong> via <strong>' + safeName + '</strong>, puis soumettez votre preuve ci-dessous.';
  html += '</div>';
  html += cbProofFormHTML('v2manual_' + methodId);
  html += '</div>';
  cbSetHTML('cb-checkout-section', html);
}

// ─────────────── Formulaire de preuve ────────────────────────

function cbProofFormHTML(context) {
  var ctxSafe = context.replace(/'/g, '');
  var html = '<div style="margin-top:16px;">';
  html += '<div class="cb-section-title">Soumettre votre preuve de paiement</div>';
  html += '<div class="cb-field">';
  html += '<label class="cb-label" for="cb-proof-url">Lien / hash de transaction <span style="color:#9ca3af;">(optionnel)</span></label>';
  html += '<input class="cb-input" type="url" id="cb-proof-url" placeholder="https://... ou txid...">';
  html += '</div>';
  html += '<div class="cb-field">';
  html += '<label class="cb-label" for="cb-proof-note">Référence / commentaire <span style="color:#9ca3af;">(optionnel)</span></label>';
  html += '<input class="cb-input" type="text" id="cb-proof-note" placeholder="Ex: Virement du 24/06 — John Doe">';
  html += '</div>';
  html += '<div id="cb-proof-error" class="cb-error" style="display:none;margin-bottom:12px;"></div>';
  html += '<button class="cb-btn-primary" id="cb-proof-btn" onclick="cbSubmitProof(\'' + ctxSafe + '\')">';
  html += '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>J\'ai payé — Soumettre la preuve';
  html += '</button>';
  html += '<div class="cb-proof-note" style="margin-top:8px;text-align:center;">Votre formation sera activée après vérification du paiement (généralement sous 24h).</div>';
  html += '</div>';
  return html;
}

function cbSubmitProof(context) {
  var proofUrl = (cbEl('cb-proof-url') && cbEl('cb-proof-url').value.trim()) || '';
  var note = (cbEl('cb-proof-note') && cbEl('cb-proof-note').value.trim()) || '';
  var errEl = cbEl('cb-proof-error');
  var btn = cbEl('cb-proof-btn');

  if (errEl) errEl.style.display = 'none';
  if (btn) { btn.disabled = true; btn.innerHTML = cbLoaderHTML(); }

  // Déterminer le payment_method à partir du contexte
  var pm = 'manual';
  if (context === 'bank') pm = 'bank';
  else if (context === 'crypto') pm = 'crypto';
  else if (context.indexOf('v2manual_') === 0) pm = 'v2_manual';

  // Créer la commande si pas déjà fait, puis soumettre la preuve
  cbCreateOrderFor(pm).then(function(orderId) {
    return cbApi('POST', '/campus/course-order/' + orderId + '/proof', {
      proof_url: proofUrl,
      note: note
    });
  }).then(function() {
    cbShowSuccess('Preuve de paiement soumise avec succès ! Votre formation sera activée après vérification (sous 24h).');
  }).catch(function(err) {
    if (errEl) { errEl.textContent = (err && err.error) || 'Erreur lors de la soumission.'; errEl.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>J\'ai payé — Soumettre la preuve'; }
  });
}

// ─────────────── Gestion de la commande campus ───────────────

function cbCreateOrderFor(paymentMethod) {
  if (_cbState.orderId) return Promise.resolve(_cbState.orderId);
  return cbApi('POST', '/campus/course/' + _cbState.courseId + '/order', { payment_method: paymentMethod }).then(function(r) {
    _cbState.orderId = r.order_id;
    return _cbState.orderId;
  }).catch(function(err) {
    // Si commande existante, récupérer son ID
    if (err && err.existing_order_id) {
      _cbState.orderId = err.existing_order_id;
      return _cbState.orderId;
    }
    // Parfois l'API retourne existing dans r avec order_id
    if (err && err.order_id) {
      _cbState.orderId = err.order_id;
      return _cbState.orderId;
    }
    throw err;
  });
}

// cbCreateOrderThen : crée la commande puis exécute un callback async qui reçoit l'orderId
function cbCreateOrderThen(callback) {
  return cbCreateOrderFor('manual').then(function(orderId) {
    return callback(orderId);
  });
}

// ─────────────── Navigation ──────────────────────────────────

function cbBackToMethods() {
  _cbState.selectedMethod = null;
  _cbState.orderId = null; // Réinitialiser pour permettre une nouvelle commande
  cbHide('cb-checkout-section');
  cbHide('cb-result-section');
  cbShow('cb-payment-section');
  cbSetHTML('cb-checkout-section', '');
}

function cbShowSuccess(msg) {
  cbHide('cb-checkout-section');
  cbHide('cb-payment-section');
  cbShow('cb-result-section');
  var html = '<div class="cb-success">';
  html += '<div class="cb-success-icon">✅</div>';
  html += '<div class="cb-success-title">Paiement enregistré</div>';
  html += '<div class="cb-success-msg">' + (msg || 'Votre paiement a été pris en compte.').replace(/</g, '&lt;') + '</div>';
  html += '<button class="cb-btn-primary" style="margin-top:20px;max-width:280px;margin-left:auto;margin-right:auto;display:block;" onclick="window.location.href=\'/login#campus\'">';
  html += '<i class="fas fa-graduation-cap" style="margin-right:8px;"></i>Retour au Campus';
  html += '</button>';
  html += '</div>';
  cbSetHTML('cb-result-section', html);
}

// ─────────────── Init ─────────────────────────────────────────

function cbInit() {
  var courseId = window._CB_COURSE_ID;
  if (!courseId) {
    cbSetHTML('cb-course-info', cbErrorHTML('Identifiant de formation manquant.'));
    return;
  }

  // Vérifier qu'on est authentifié
  var token = cbToken();
  if (!token) {
    window.location.href = '/login';
    return;
  }

  _cbState.courseId = courseId;
  cbLoadCourse();
}

// Démarrage au chargement du DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cbInit);
} else {
  cbInit();
}
