// Script de correction v2 — fixes #2 à #5 (Fix #1 déjà appliqué)
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../public/static/member-app.js');
let code = fs.readFileSync(FILE, 'utf8');
let changes = 0;

function replace(oldStr, newStr, label) {
  const count = (code.split(oldStr).length - 1);
  if (count === 0) { console.error(`ERROR [${label}] : chaîne non trouvée`); process.exit(1); }
  if (count > 1)   { console.warn(`WARN  [${label}] : ${count} occurrences`); }
  code = code.split(oldStr).join(newStr);
  changes++;
  console.log(`OK    [${label}] : ${count} occurrence(s)`);
}

// ══════════════════════════════════════════════════════════════════════════════
// FIX #2 : orderLicense() → parallélisation des appels + ouverture immédiate du wizard
// Avant : 2 appels séquentiels AVANT d'ouvrir le modal → lenteur 2-4s
// Après : ouvrir le modal avec loader IMMÉDIATEMENT, charger en parallèle en fond
// ══════════════════════════════════════════════════════════════════════════════
replace(
  `async function orderLicense(){
  // Charger le prix de la licence depuis l'API
  let _price = null;
  try { const cfg = await api("GET","/members/license"); _price = cfg.license_price||null; } catch(e){}

  // Charger les gateways si pas encore chargés (comme wizardStep4)
  if(!_gw||!Object.keys(_gw).length){
    try{const r=await api("GET","/members/packages");_gw=_buildGw(r.gateways||{});_adminFeeInfo=r.adminFee||{amount:0,active:false,paid:true};if(!_price)_price=r.licensePrice||null;}catch(e){}
  }
  // Initialiser le wizard pour "licence seule"
  _wizardReset();
  _wizardData.licenseOnly = true;
  _wizardData.totalAmt = _price || (typeof _licPriceForWizard!=="undefined" ? _licPriceForWizard : 97);
  _wizardData.licensePrice = _wizardData.totalAmt;
  // Ouvrir directement l'étape de sélection du mode de paiement
  wizardStep4();
}`,
  `async function orderLicense(){
  // Initialiser le wizard licenseOnly tout de suite — PAS d'attente réseau
  _wizardReset();
  _wizardData.licenseOnly = true;
  // Utiliser le prix en cache si disponible, sinon valeur par défaut
  _wizardData.totalAmt = (typeof _licPriceForWizard!=="undefined"&&_licPriceForWizard) ? _licPriceForWizard : 97;
  _wizardData.licensePrice = _wizardData.totalAmt;
  // Ouvrir le modal tout de suite avec un loader
  _wizardShow('<div class="p-10 flex flex-col items-center gap-4"><div class="loader"></div><p class="text-gray-400 text-sm">Chargement…</p></div>');
  const overlay=document.getElementById("wizard-overlay");if(overlay)overlay.style.display="flex";
  // Charger prix + gateways en parallèle pendant que le modal est visible
  try{
    const [licCfg,pkgData]=await Promise.all([
      api("GET","/members/license").catch(()=>null),
      (!_gw||!Object.keys(_gw).length)?api("GET","/members/packages").catch(()=>null):Promise.resolve(null)
    ]);
    if(licCfg&&licCfg.license_price){_wizardData.totalAmt=licCfg.license_price;_wizardData.licensePrice=licCfg.license_price;}
    if(pkgData){_gw=_buildGw(pkgData.gateways||{});_adminFeeInfo=pkgData.adminFee||{amount:0,active:false,paid:true};if(pkgData.licensePrice){_licPriceForWizard=pkgData.licensePrice;_wizardData.totalAmt=pkgData.licensePrice;_wizardData.licensePrice=pkgData.licensePrice;}}
  }catch(e){}
  // Ouvrir l'étape de sélection du mode de paiement
  wizardStep4();
}`,
  'orderLicense → parallèle + immédiat'
);

// ══════════════════════════════════════════════════════════════════════════════
// FIX #3 : wizardStep4() bouton "Retour" → intelligent selon licenseOnly
// Avant : toujours wizardStep3() → crash si licenseOnly (pas de package data)
// Après : si licenseOnly → wizardClose(), sinon → wizardStep3()
// ══════════════════════════════════════════════════════════════════════════════
replace(
  'onclick="wizardStep3()" class="text-sm text-gray-500 hover:text-gray-300 transition"><i class="fas fa-arrow-left mr-1">',
  'onclick="_wizardData.licenseOnly?wizardClose():wizardStep3()" class="text-sm text-gray-500 hover:text-gray-300 transition"><i class="fas fa-arrow-left mr-1">',
  'wizardStep4 Retour → licenseOnly aware'
);

// ══════════════════════════════════════════════════════════════════════════════
// FIX #4 : wizardStep5() — conflit de variable 'e' (gw vs réponse API)
// Avant : let e; dans le try shadowe const e=_gw de l'outer scope
// Après : renommer la variable interne en '_apiResp'
// ══════════════════════════════════════════════════════════════════════════════
replace(
  `try{let e;if(_wizardData.licenseOnly){
  e=await api("POST","/members/license/order",{payment_method:t||"manual"});
  _wizardData.licenseId=e.license_id||null;
  _wizardData.orderId=e.license_id||e.order_id||null;
  // Wallet → activation immédiate, pas besoin de continuer le wizard
  if(e.activated){
    if(e.new_balance!==undefined){window._memberWalletBalance=e.new_balance;const _hb=document.getElementById('header-balance');if(_hb){const _nb=e.new_balance;_hb.innerHTML='<span class="text-gray-400">Solde : </span><span class="text-gold-400 font-bold">$'+Number(_nb).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'</span>';}}
    _wizardShow(\`
  <div class="p-8 text-center space-y-5">
    <div class="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
      <i class="fas fa-key text-green-400 text-4xl"></i>
    </div>
    <div>
      <p class="text-white font-bold text-xl">Licence activée !</p>
      <p class="text-green-400 text-sm mt-1">\${e.message||"Votre licence Finstrategia est maintenant active."}</p>
    </div>
    <button onclick="wizardClose(); renderLicense(document.getElementById('page-content'))"
      class="w-full py-3 bg-gold-500 text-dark-900 font-bold rounded-xl hover:bg-gold-400 transition">
      <i class="fas fa-check mr-2"></i>Voir ma licence
    </button>
  </div>\`);_wizardReset();return;
  }
}else if(_wizardData.isUpgrade)e=await api("POST","/members/packages/upgrade",{target_package_id:_wizardData.pkgId,payment_method:t||"manual"});else{const n={package_id:_wizardData.pkgId,payment_method:t||"manual"};_wizardData.addLicense&&(n.add_license=!0),e=await api("POST","/members/packages/order",n)}_wizardData.orderId=e.order_id||_wizardData.orderId}`,
  `try{let _apiResp;if(_wizardData.licenseOnly){
  _apiResp=await api("POST","/members/license/order",{payment_method:t||"manual"});
  _wizardData.licenseId=_apiResp.license_id||null;
  _wizardData.orderId=_apiResp.license_id||_apiResp.order_id||null;
  // Wallet → activation immédiate
  if(_apiResp.activated){
    if(_apiResp.new_balance!==undefined){window._memberWalletBalance=_apiResp.new_balance;const _hb=document.getElementById('header-balance');if(_hb){const _nb=_apiResp.new_balance;_hb.innerHTML='<span class="text-gray-400">Solde : </span><span class="text-gold-400 font-bold">$'+Number(_nb).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'</span>';}}
    _wizardShow(\`
  <div class="p-8 text-center space-y-5">
    <div class="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
      <i class="fas fa-key text-green-400 text-4xl"></i>
    </div>
    <div>
      <p class="text-white font-bold text-xl">Licence activée !</p>
      <p class="text-green-400 text-sm mt-1">\${_apiResp.message||"Votre licence Finstrategia est maintenant active."}</p>
    </div>
    <button onclick="wizardClose(); renderLicense(document.getElementById('page-content'))"
      class="w-full py-3 bg-gold-500 text-dark-900 font-bold rounded-xl hover:bg-gold-400 transition">
      <i class="fas fa-check mr-2"></i>Voir ma licence
    </button>
  </div>\`);_wizardReset();return;
  }
}else if(_wizardData.isUpgrade){_apiResp=await api("POST","/members/packages/upgrade",{target_package_id:_wizardData.pkgId,payment_method:t||"manual"});_wizardData.orderId=_apiResp.order_id||_wizardData.orderId;}else{const _pkgBody={package_id:_wizardData.pkgId,payment_method:t||"manual"};_wizardData.addLicense&&(_pkgBody.add_license=!0);_apiResp=await api("POST","/members/packages/order",_pkgBody);_wizardData.orderId=_apiResp.order_id||_wizardData.orderId;}}`,
  'wizardStep5 variable e → _apiResp'
);

// ══════════════════════════════════════════════════════════════════════════════
// FIX #5 : wizardStep5() catch — gérer existing_order_id pour licenseOnly
// ══════════════════════════════════════════════════════════════════════════════
// On remplace d'abord la fin du catch (message d'erreur générique) : e → _err
replace(
  `      <p class="text-red-400 font-medium">\${e.error||e.message||"Erreur lors de la création de la commande"}</p>`,
  `      <p class="text-red-400 font-medium">\${_err.error||_err.message||"Erreur lors de la création de la commande"}</p>`,
  'wizardStep5 catch tail e.error → _err.error'
);

// Puis on remplace le début du catch (existing_order_id) avec la logique licenseOnly
replace(
  `}catch(e){if(e.existing_order_id){const t=e.existing_order_id||"";return void _wizardShow(\`
      <div class="p-8 text-center space-y-5">
        <div class="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
          <i class="fas fa-clock text-yellow-400 text-3xl"></i>
        </div>
        <div>
          <p class="text-white font-semibold text-lg">Une commande est déjà en cours</p>
          <p class="text-gray-400 text-sm mt-1">Statut actuel : <span class="text-yellow-400">\${"proof_submitted"===(e.existing_status||"pending")?"preuve soumise, en attente de validation":"en attente de paiement"}</span></p>
          \${t?\`<p class="text-gray-500 text-xs mt-1 font-mono">Réf. \${t.substring(0,16)}…</p>\`:""}
        </div>
        <p class="text-gray-400 text-sm">\${e.hint||"Soumettez votre preuve de paiement pour la commande existante."}</p>
        <div class="flex flex-col gap-3">
          \${t?\`<button onclick="wizardClose(); wizardProofOnly('\${t}')" class="py-3 bg-gold-500 text-dark-900 font-bold rounded-xl hover:bg-gold-400 transition text-sm"><i class="fas fa-upload mr-2"></i>Soumettre la preuve de cette commande</button>\`:""}
          <button onclick="wizardStep4()" class="py-3 bg-dark-700 text-gray-300 rounded-xl hover:bg-dark-600 transition text-sm"><i class="fas fa-arrow-left mr-2"></i>Retour</button>
        </div>
      </div>\`)}`,
  `}catch(_err){if(_err.existing_order_id){const _existId=_err.existing_order_id||"";if(_wizardData.licenseOnly){_wizardData.licenseId=_existId;_wizardData.orderId=_existId;}else{return void _wizardShow(\`
      <div class="p-8 text-center space-y-5">
        <div class="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
          <i class="fas fa-clock text-yellow-400 text-3xl"></i>
        </div>
        <div>
          <p class="text-white font-semibold text-lg">Une commande est déjà en cours</p>
          <p class="text-gray-400 text-sm mt-1">Statut actuel : <span class="text-yellow-400">\${"proof_submitted"===(_err.existing_status||"pending")?"preuve soumise, en attente de validation":"en attente de paiement"}</span></p>
          \${_existId?\`<p class="text-gray-500 text-xs mt-1 font-mono">Réf. \${_existId.substring(0,16)}…</p>\`:""}
        </div>
        <p class="text-gray-400 text-sm">\${_err.hint||"Soumettez votre preuve de paiement pour la commande existante."}</p>
        <div class="flex flex-col gap-3">
          \${_existId?\`<button onclick="wizardClose(); wizardProofOnly('\${_existId}')" class="py-3 bg-gold-500 text-dark-900 font-bold rounded-xl hover:bg-gold-400 transition text-sm"><i class="fas fa-upload mr-2"></i>Soumettre la preuve de cette commande</button>\`:""}
          <button onclick="wizardStep4()" class="py-3 bg-dark-700 text-gray-300 rounded-xl hover:bg-dark-600 transition text-sm"><i class="fas fa-arrow-left mr-2"></i>Retour</button>
        </div>
      </div>\`);}}`,
  'wizardStep5 catch existing_order_id → licenseOnly aware'
);

// ══════════════════════════════════════════════════════════════════════════════
// Écriture du fichier
// ══════════════════════════════════════════════════════════════════════════════
fs.writeFileSync(FILE, code, 'utf8');
console.log(`\n✅ ${changes} correction(s) appliquée(s) avec succès`);
