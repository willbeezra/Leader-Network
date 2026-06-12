#!/usr/bin/env node
/**
 * check-js-syntax.js — Vérification syntaxe JS avant déploiement
 *
 * Ce script vérifie que tous les fichiers JS statiques sont syntaxiquement
 * valides AVANT le build Vite. Si un fichier est cassé, le build échoue
 * immédiatement avec un message d'erreur clair.
 *
 * Erreurs détectées :
 *   - Template literal non fermé (ex: `...`renderPagination sans ;)
 *   - Tagged template literal involontaire
 *   - Toute autre erreur de syntaxe JS
 *
 * Usage : node scripts/check-js-syntax.js
 */

const fs = require('fs')
const path = require('path')

const FILES_TO_CHECK = [
  'public/static/member-app.js',
  'public/static/admin-app.js',
]

let hasError = false

for (const relPath of FILES_TO_CHECK) {
  const absPath = path.resolve(__dirname, '..', relPath)

  if (!fs.existsSync(absPath)) {
    console.warn(`⚠️  Fichier non trouvé (ignoré) : ${relPath}`)
    continue
  }

  const code = fs.readFileSync(absPath, 'utf8')

  // ── Test 1 : syntaxe JS via acorn (parser léger) ─────────────
  // new Function() ne supporte pas les template literals multilignes.
  // node --check interprète le fichier comme module (problèmes de scope).
  // On utilise acorn qui parse en mode "script" comme un vrai navigateur.
  let acorn
  try { acorn = require('acorn') } catch(e) { acorn = null }
  if (acorn) {
    try {
      acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script' })
    } catch (e) {
      console.error(`\n❌ ERREUR SYNTAXE JS : ${relPath}`)
      console.error(`   ${e.message}`)
      // Aide au diagnostic : détecter le pattern backtick+renderPagination
      const badPattern = code.split('`renderPagination').length - 1
      if (badPattern > 0) {
        console.error(`\n   💡 Cause probable : ${badPattern} occurrence(s) de \`renderPagination sans point-virgule`)
        console.error(`   Remplacer \`renderPagination par ;\`renderPagination`)
      }
      hasError = true
      continue
    }
  } else {
    // Fallback: new Function() wrappé dans une fonction async pour supporter await
    try {
      new Function(code)
    } catch (e) {
      console.error(`\n❌ ERREUR SYNTAXE JS : ${relPath}`)
      console.error(`   ${e.message}`)
      hasError = true
      continue
    }
  }

  // ── Test 2 : détecter "`renderPagination" sans point-virgule ───
  // C'est le pattern exact qui a causé le bug du bouton login.
  // Un backtick fermant IMMÉDIATEMENT suivi de "renderPagination(" sans ";"
  // est interprété comme un tagged template literal par le navigateur.
  // Note : on ne teste pas les autres identifiants car ils génèrent des faux
  // positifs (ex: `...}function foo(` ou `...}window.x` qui sont syntaxiquement OK).
  const badPagination = code.split('`renderPagination').length - 1
  if (badPagination > 0) {
    console.error(`\n❌ TAGGED TEMPLATE PAGINATION dans ${relPath} :`)
    console.error(`   ${badPagination} occurrence(s) de \`renderPagination sans point-virgule`)
    console.error(`   → Remplacer \`renderPagination par \`;\renderPagination`)
    hasError = true
    continue
  }

  // ── Test 3 : vérifier que doLogin() est présent dans member-app.js ──
  if (relPath.includes('member-app.js')) {
    if (!code.includes('function doLogin(')) {
      console.error(`\n❌ ERREUR CRITIQUE : doLogin() absent de ${relPath}`)
      console.error(`   Le bouton de connexion ne fonctionnera pas !`)
      hasError = true
      continue
    }
  }

  const sizeKB = (fs.statSync(absPath).size / 1024).toFixed(1)
  console.log(`✅ ${relPath} — OK (${sizeKB} KB)`)
}

if (hasError) {
  console.error('\n🚫 Build interrompu — corriger les erreurs ci-dessus avant de déployer.\n')
  process.exit(1)
} else {
  console.log('\n✅ Tous les fichiers JS sont valides — build autorisé.\n')
}
