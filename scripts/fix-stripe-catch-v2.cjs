#!/usr/bin/env node
'use strict';
const fs = require('fs');

let content = fs.readFileSync('public/static/member-app.js', 'utf8');

// ══════════════════════════════════════════════════════════════════
// FIX 3 : wizardStep5 catch — pour licenseOnly + existing_order_id,
//          ne pas tomber dans le return void _wizardShow(erreur générique)
//
// La transition exacte dans le fichier (caractères littéraux) est:
//   `);}}return void _wizardShow(`\n    <div class="p-8 text-center space-y-4">
// où \n est backslash+n (2 chars), pas un vrai newline
// ══════════════════════════════════════════════════════════════════

// Vérification du pattern exact
const SEARCH = '`);}}return void _wizardShow(`';
const idx = content.indexOf(SEARCH);
console.log('Pattern trouvé à idx:', idx);
if (idx < 0) {
  console.error('ERREUR: Pattern non trouvé!');
  process.exit(1);
}

// Contexte autour
console.log('Context:', JSON.stringify(content.slice(idx-10, idx+60)));

// Vérifier que c'est unique
const count = (content.split(SEARCH)).length - 1;
console.log('Occurrences:', count);
if (count !== 1) {
  console.error('ERREUR: Pattern non unique! count:', count);
  // Lister toutes les occurrences
  let i = 0;
  while(true) {
    const p = content.indexOf(SEARCH, i);
    if(p === -1) break;
    console.log('  at', p, ':', JSON.stringify(content.slice(p-20, p+60)));
    i = p+1;
  }
  process.exit(1);
}

// Transformation : wrapper le return void dans un if guard
const REPLACE_OLD = '`);}}return void _wizardShow(`';
const REPLACE_NEW = '`);}}if(!(_wizardData.licenseOnly&&_wizardData.licenseId)){return void _wizardShow(`';

content = content.replace(REPLACE_OLD, REPLACE_NEW);
console.log('✅ Transition modifiée');

// Maintenant fermer le if ajouté
// La fin du return void générique est: `)}let a=""
// = backtick ferme le template, ) ferme _wizardShow, } ferme le catch
// On doit insérer un } avant pour fermer le if guard: `})}let a=""
const END_SEARCH = '`)}let a=""';
const endIdx = content.indexOf(END_SEARCH);
console.log('End pattern idx:', endIdx);
console.log('End context:', JSON.stringify(content.slice(endIdx-20, endIdx+30)));

const endCount = (content.split(END_SEARCH)).length - 1;
console.log('End occurrences:', endCount);
if (endCount !== 1) {
  console.error('ERREUR: End pattern non unique! count:', endCount);
  let i = 0;
  while(true) {
    const p = content.indexOf(END_SEARCH, i);
    if(p === -1) break;
    console.log('  at', p, ':', JSON.stringify(content.slice(p-20, p+30)));
    i = p+1;
  }
  process.exit(1);
}

content = content.replace(END_SEARCH, '`})}let a=""');
console.log('✅ Fermeture if ajoutée');

fs.writeFileSync('public/static/member-app.js', content);
console.log('✅ Fix3 complet — fichier sauvegardé');
