// Script de correction générique — tous les modes de paiement pour la licence
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../public/static/member-app.js');
let code = fs.readFileSync(FILE, 'utf8');
let changes = 0;

// ─────────────────────────────────────────────────────────────────
// HELPER : remplacer une chaîne unique dans le code
// ─────────────────────────────────────────────────────────────────
function replace(oldStr, newStr, label) {
  const count = (code.split(oldStr).length - 1);
  if (count === 0) {
    console.error(`ERROR [${label}] : chaîne non trouvée`);
    process.exit(1);
  }
  if (count > 1) {
    console.warn(`WARN [${label}] : ${count} occurrences trouvées, remplacement de toutes`);
  }
  code = code.split(oldStr).join(newStr);
  changes++;
  console.log(`OK [${label}] : ${count} occurrence(s) remplacée(s)`);
}

// ═════════════════════════════════════════════════════════════════
// 1. wizardStep5V2() — ajouter branche licenseOnly
//    Avant : seulement isUpgrade + package normal
//    Après : licenseOnly → POST /license/order puis /psp/initiate avec license_id
// ═════════════════════════════════════════════════════════════════
replace(
  // OLD — création commande sans branche licenseOnly
  'async function wizardStep5V2(){_wizardShow(\'<div class="p-10 flex flex-col items-center gap-4"><div class="loader"></div><p class="text-gray-400 text-sm">Création de votre commande…</p></div>\');const t=_wizardData.v2MethodId;const n=_wizardData.totalAmt;let orderId=null;try{let orderResp;if(_wizardData.isUpgrade){orderResp=await api("POST","/members/packages/upgrade",{target_package_id:_wizardData.pkgId,payment_method:"v2_psp"});}else{const body={package_id:_wizardData.pkgId,payment_method:"v2_psp"};if(_wizardData.addLicense)body.add_license=true;orderResp=await api("POST","/members/packages/order",body);}orderId=orderResp.order_id;_wizardData.orderId=orderId;}catch(err){if(err.existing_order_id){orderId=err.existing_order_id;_wizardData.orderId=orderId;}else{_wizardShow(`<div class="p-8 text-center space-y-4"><i class="fas fa-exclamation-circle text-red-400 text-3xl"></i><p class="text-red-400">Erreur lors de la création de commande.<br><span class="text-xs text-gray-500">${err.error||err.message||""}</span></p><button onclick="wizardStep4()" class="py-2 px-6 bg-dark-700 text-gray-300 rounded-xl text-sm"><i class="fas fa-arrow-left mr-1"></i>Retour</button></div>`);return;}}_wizardShow(\'<div class="p-10 flex flex-col items-center gap-4"><div class="loader"></div><p class="text-gray-400 text-sm">Redirection vers ${_wizardData.v2DisplayName}…</p></div>\');try{const pspResp=await api("POST","/psp/initiate",{payment_method_id:t,amount:n,order_id:orderId,return_url:window.location.href});if(pspResp.redirect_url){window.location.href=pspResp.redirect_url;}else{throw {error:"URL de redirection manquante"};}}catch(pspErr){_wizardShow(`<div class="p-8 text-center space-y-4"><i class="fas fa-exclamation-circle text-red-400 text-3xl"></i><p class="text-red-400">Erreur de paiement ${_wizardData.v2DisplayName}.<br><span class="text-xs text-gray-500">${pspErr.error||pspErr.message||""}</span></p><button onclick="wizardStep4()" class="py-2 px-6 bg-dark-700 text-gray-300 rounded-xl text-sm"><i class="fas fa-arrow-left mr-1"></i>Retour</button></div>`);}}',
  // NEW — avec branche licenseOnly + body PSP générique
  'async function wizardStep5V2(){_wizardShow(\'<div class="p-10 flex flex-col items-center gap-4"><div class="loader"></div><p class="text-gray-400 text-sm">Création de votre commande…</p></div>\');const t=_wizardData.v2MethodId;const n=_wizardData.totalAmt;let orderId=null;let licenseId=null;try{let orderResp;if(_wizardData.licenseOnly){orderResp=await api("POST","/members/license/order",{payment_method:"v2_psp"});licenseId=orderResp.license_id||null;_wizardData.licenseId=licenseId;_wizardData.orderId=licenseId;orderId=licenseId;}else if(_wizardData.isUpgrade){orderResp=await api("POST","/members/packages/upgrade",{target_package_id:_wizardData.pkgId,payment_method:"v2_psp"});orderId=orderResp.order_id;_wizardData.orderId=orderId;}else{const body={package_id:_wizardData.pkgId,payment_method:"v2_psp"};if(_wizardData.addLicense)body.add_license=true;orderResp=await api("POST","/members/packages/order",body);orderId=orderResp.order_id;_wizardData.orderId=orderId;}}catch(err){if(err.existing_order_id){orderId=err.existing_order_id;_wizardData.orderId=orderId;}else{_wizardShow(`<div class="p-8 text-center space-y-4"><i class="fas fa-exclamation-circle text-red-400 text-3xl"></i><p class="text-red-400">Erreur lors de la création de commande.<br><span class="text-xs text-gray-500">${err.error||err.message||""}</span></p><button onclick="wizardStep4()" class="py-2 px-6 bg-dark-700 text-gray-300 rounded-xl text-sm"><i class="fas fa-arrow-left mr-1"></i>Retour</button></div>`);return;}}_wizardShow(\'<div class="p-10 flex flex-col items-center gap-4"><div class="loader"></div><p class="text-gray-400 text-sm">Redirection vers ${_wizardData.v2DisplayName}…</p></div>\');try{const pspBody={payment_method_id:t,amount:n,return_url:window.location.href};if(licenseId)pspBody.license_id=licenseId;else pspBody.order_id=orderId;const pspResp=await api("POST","/psp/initiate",pspBody);if(pspResp.redirect_url){window.location.href=pspResp.redirect_url;}else{throw {error:"URL de redirection manquante"};}}catch(pspErr){_wizardShow(`<div class="p-8 text-center space-y-4"><i class="fas fa-exclamation-circle text-red-400 text-3xl"></i><p class="text-red-400">Erreur de paiement ${_wizardData.v2DisplayName}.<br><span class="text-xs text-gray-500">${pspErr.error||pspErr.message||""}</span></p><button onclick="wizardStep4()" class="py-2 px-6 bg-dark-700 text-gray-300 rounded-xl text-sm"><i class="fas fa-arrow-left mr-1"></i>Retour</button></div>`);}}',
  'wizardStep5V2'
);

// ═════════════════════════════════════════════════════════════════
// 2. wizardSubmitProof() — ajouter branche licenseOnly
//    Avant : hardcodé /members/packages/order/{id}/proof
//    Après : si licenseOnly → /members/license/{licenseId}/proof
// ═════════════════════════════════════════════════════════════════
replace(
  // OLD
  'async function wizardSubmitProof(){const e=window._wizProofUrl||(window._wizProofUploadUid?uzGetUrl(window._wizProofUploadUid):""),t=document.getElementById("wiz-proof-note")?.value.trim(),n=document.getElementById("wiz-submit-btn");if(e){n&&(n.disabled=!0,n.innerHTML=\'<i class="fas fa-spinner fa-spin mr-2"></i>Envoi…\');try{await api("POST",`/members/packages/order/${_wizardData.orderId}/proof`,{proof_url:e,note:t||""}),wizardStep7()}catch(e){n&&(n.disabled=!1,n.innerHTML=\'<i class="fas fa-upload mr-2"></i>Soumettre la preuve\'),showToast(e.error||"Erreur lors de l\'envoi","error")}}else showToast("Veuillez uploader ou fournir un justificatif de paiement","error")}',
  // NEW — route générique selon licenseOnly
  'async function wizardSubmitProof(){const e=window._wizProofUrl||(window._wizProofUploadUid?uzGetUrl(window._wizProofUploadUid):""),t=document.getElementById("wiz-proof-note")?.value.trim(),n=document.getElementById("wiz-submit-btn");if(e){n&&(n.disabled=!0,n.innerHTML=\'<i class="fas fa-spinner fa-spin mr-2"></i>Envoi…\');try{const licId=_wizardData.licenseId||null;const proofEndpoint=(_wizardData.licenseOnly&&licId)?`/members/license/${licId}/proof`:`/members/packages/order/${_wizardData.orderId}/proof`;await api("POST",proofEndpoint,{proof_url:e,note:t||""}),wizardStep7()}catch(e){n&&(n.disabled=!1,n.innerHTML=\'<i class="fas fa-upload mr-2"></i>Soumettre la preuve\'),showToast(e.error||"Erreur lors de l\'envoi","error")}}else showToast("Veuillez uploader ou fournir un justificatif de paiement","error")}',
  'wizardSubmitProof'
);

// ─────────────────────────────────────────────────────────────────
// Écriture du fichier
// ─────────────────────────────────────────────────────────────────
fs.writeFileSync(FILE, code, 'utf8');
console.log(`\n✅ ${changes} modification(s) appliquée(s) — ${FILE}`);
