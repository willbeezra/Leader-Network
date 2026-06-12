#!/usr/bin/env node
'use strict';
const fs = require('fs');

let content = fs.readFileSync('public/static/member-app.js', 'utf8');

// ══════════════════════════════════════════════════════════════════
// FIX 1 : setTimeout 150ms pour garantir le rendu DOM avant mount Stripe
// ══════════════════════════════════════════════════════════════════
const F1_OLD = 'r&&_initStripePaymentElement(n)}';
const F1_NEW = 'r&&setTimeout(()=>_initStripePaymentElement(n),150)}';
const f1count = (content.split(F1_OLD)).length - 1;
console.log('Fix1 setTimeout occurrences:', f1count);
if (f1count === 1) {
  content = content.replace(F1_OLD, F1_NEW);
  console.log('✅ Fix1 (setTimeout) appliqué');
} else {
  console.warn('⚠️  Fix1 skipped (déjà appliqué ou pattern introuvable)');
}

// ══════════════════════════════════════════════════════════════════
// FIX 2 : Améliorer le catch de _initStripePaymentElement
//   - Ajouter console.error pour voir l'erreur dans la console
//   - Afficher l'erreur de façon bien visible même si #stripe-payment-element absent
// ══════════════════════════════════════════════════════════════════
const F2_OLD = [
  'catch(e){const t=e.error||e.message||',
  '"Erreur lors de l\'initialisation du paiement";',
  'document.getElementById("stripe-payment-element").innerHTML=',
  '`<div class="text-center space-y-2 py-4">\\n',
  '        <p class="text-red-400 text-sm"><i class="fas fa-exclamation-circle mr-1"></i>${t}</p>\\n',
  '        <button onclick="wizardStep5()" class="text-xs text-gray-400 hover:text-white underline">Réessayer</button>\\n',
  '       </div>`}'
].join('');

const F2_NEW = [
  'catch(e){const t=e.error||e.message||"Erreur Stripe";',
  'console.error("[Stripe init error]",t,e);',
  'const _se=document.getElementById("stripe-payment-element");',
  'if(_se){_se.innerHTML=',
  '`<div class="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-center space-y-3">',
  '<i class="fas fa-exclamation-circle text-red-400 text-2xl"></i>',
  '<p class="text-red-300 font-semibold text-sm mt-2">${t}</p>',
  '<button onclick="wizardStep4()" class="py-2 px-4 bg-dark-700 text-gray-300 rounded-xl text-xs mt-2">← Retour</button>',
  '</div>`;',
  '}else{_wizardShow(',
  '`<div class="p-6 text-center space-y-4">',
  '<div class="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">',
  '<i class="fas fa-exclamation-circle text-red-400 text-3xl"></i></div>',
  '<p class="text-red-300 font-semibold">${t}</p>',
  '<button onclick="wizardStep4()" class="py-2 px-4 bg-dark-700 text-gray-300 rounded-xl text-sm">← Retour</button>',
  '</div>`);}}'
].join('');

const f2count = (content.split(F2_OLD)).length - 1;
console.log('Fix2 catch occurrences:', f2count);
if (f2count === 1) {
  content = content.replace(F2_OLD, F2_NEW);
  console.log('✅ Fix2 (catch Stripe visible) appliqué');
} else {
  console.warn('⚠️  Fix2 skipped');
  // Debug
  const idx = content.indexOf('catch(e){const t=e.error||e.message||"Erreur lors de l\'initialisation');
  if (idx >= 0) {
    console.log('Pattern partiel trouvé à', idx);
    console.log(JSON.stringify(content.slice(idx, idx + 300)));
  }
}

// ══════════════════════════════════════════════════════════════════
// FIX 3 : wizardStep5 catch — pour licenseOnly + existing_order_id,
//          ne pas tomber dans le return void _wizardShow(erreur générique)
//
// Structure actuelle :
//   catch(_err){
//     if(_err.existing_order_id){
//       if(licenseOnly){ setIds; }
//       else{ return void _wizardShow(commande existante); }
//     }
//     return void _wizardShow(erreur générique);  ← exécuté même pour licenseOnly!
//   }
//
// Fix : entourer le return void générique d'un if(!licenseOnly_already_recovered)
// ══════════════════════════════════════════════════════════════════

// Trouver la transition exacte : fermeture du if(existing) → return void générique
// Le pattern est: `);}}return void _wizardShow(`\n    <div class="p-8 text-center space-y-4">
// `);` = ferme le template du return void(commande existante)
// }}  = ferme else{ + ferme if(existing_order_id)
// return void _wizardShow(` = début de l'erreur générique

const F3_SEARCH_PREFIX = 'Retour</button>\\n        </div>\\n      </div>`;}}return void _wizardShow(`\\n    <div class="p-8 text-center space-y-4">';

const f3idx = content.indexOf(F3_SEARCH_PREFIX);
console.log('Fix3 search prefix idx:', f3idx);

if (f3idx >= 0) {
  // Transformer: `);}}return void _wizardShow(` 
  // en:          `);}}if(!(_wizardData.licenseOnly&&_wizardData.licenseId)){return void _wizardShow(`
  // Puis à la fin du erreur générique (avant `}let a=`): ajouter un `}` pour fermer le if
  
  // Trouver le exact pattern de transition
  const TRANS_OLD = '`;}}return void _wizardShow(`\\n    <div class="p-8 text-center space-y-4">';
  const TRANS_NEW = '`;}}if(!(_wizardData.licenseOnly&&_wizardData.licenseId)){return void _wizardShow(`\\n    <div class="p-8 text-center space-y-4">';
  
  const f3count = (content.split(TRANS_OLD)).length - 1;
  console.log('Fix3 transition occurrences:', f3count);
  
  if (f3count === 1) {
    content = content.replace(TRANS_OLD, TRANS_NEW);
    
    // Maintenant fermer le if ajouté — trouver la fin de l'erreur générique
    // La fin est: `)}let a=   (backtick + ) + } + let a=)
    // On doit transformer: `)}let a=   en   `})}let a=  (ajouter } pour fermer le if guard)
    const END_OLD = '`)}let a="";';
    const END_NEW = '`})}let a="";';
    
    const endCount = (content.split(END_OLD)).length - 1;
    console.log('Fix3 end occurrences:', endCount);
    
    if (endCount === 1) {
      content = content.replace(END_OLD, END_NEW);
      console.log('✅ Fix3 (catch licenseOnly guard) appliqué');
    } else {
      console.warn('⚠️  Fix3 end not unique, count:', endCount);
    }
  } else {
    console.warn('⚠️  Fix3 transition count:', f3count);
    // Debug
    const dbgIdx = content.indexOf('};}}return void');
    console.log('dbg1:', content.slice(Math.max(0,dbgIdx-10), dbgIdx+50));
  }
} else {
  console.warn('⚠️  Fix3 prefix non trouvé');
}

// Écrire le fichier modifié
fs.writeFileSync('public/static/member-app.js', content);
console.log('\n📝 Fichier mis à jour. Vérification syntaxe...');
