#!/usr/bin/env python3
"""
Patch admin-app.js : bannière d'alerte rouge sur le dashboard admin
si les paiements journaliers n'ont pas été effectués aujourd'hui (heure Maurice UTC+4).
"""

import sys

SRC = "/home/user/webapp/public/static/admin-app.js"

with open(SRC, "r", encoding="utf-8") as f:
    content = f.read()

original_len = len(content)

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 1 : insérer la bannière en haut du dashboard
# Ancre UNIQUE : juste après les setBadge dans adminDashboard
# ─────────────────────────────────────────────────────────────────────────────

OLD_ANCHOR = 'setBadge("admin-kyc-badge",n.pendingKYC),e.innerHTML=`\\n    <div class="space-y-6">'

# Bannière conditionnelle :
# - _todayMU = date du jour en heure Maurice (UTC+4) calculée côté client
# - Alerte si lastDailyPayment !== _todayMU ET versementsJour === 0
# - Bouton "Forcer maintenant" → forceDailyPayments()
BANNER = (
    '${(()=>{'
    'const _todayMU=new Date(Date.now()+4*3600000).toISOString().substring(0,10);'
    'const _paid=n.lastDailyPayment===_todayMU||n.versementsJour>0;'
    "if(_paid)return '';"
    'return `'
    '<div id="cron-alert-banner" class="bg-red-900/80 border-2 border-red-500 rounded-2xl p-4 flex items-start justify-between gap-4 shadow-lg shadow-red-900/40 animate-pulse">'
    '<div class="flex items-start gap-3">'
    '<div class="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">'
    '<i class="fas fa-exclamation-triangle text-red-400 text-xl"></i>'
    '</div>'
    '<div>'
    '<div class="font-bold text-red-300 text-base">⚠️ Paiements journaliers non effectués ce jour</div>'
    '<div class="text-sm text-red-200 mt-1">Le cron automatique n\\\'a pas déclenché les versements. Dernier paiement connu : <strong class="text-white">${n.lastDailyPayment||\'aucun\'}</strong> — date Maurice aujourd\\\'hui : <strong class="text-white">${_todayMU}</strong></div>'
    '<div class="text-xs text-red-300/80 mt-1.5">Les membres n\\\'ont pas encore reçu leurs commissions de la nuit. Vérifiez cron-job.org ou forcez le paiement ci-contre.</div>'
    '</div>'
    '</div>'
    '<button onclick="forceDailyPayments(this)" class="flex-shrink-0 bg-red-500 hover:bg-red-400 active:bg-red-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 whitespace-nowrap shadow-md">'
    '<i class="fas fa-play-circle"></i>Forcer maintenant'
    '</button>'
    '</div>\\n`;})()} '
)

NEW_ANCHOR = 'setBadge("admin-kyc-badge",n.pendingKYC),e.innerHTML=`\\n    <div class="space-y-6">\\n      ' + BANNER

count = content.count(OLD_ANCHOR)
if count == 0:
    print("ERREUR — ancre unique setBadge+innerHTML non trouvée")
    sys.exit(1)
if count > 1:
    print(f"ATTENTION — {count} occurrences (attendu 1)")
    sys.exit(1)

content = content.replace(OLD_ANCHOR, NEW_ANCHOR, 1)
print(f"PATCH 1 OK — bannière alerte dashboard insérée (1 occurrence unique)")

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 2 : ajouter forceDailyPayments() avant adminDashboard
# ─────────────────────────────────────────────────────────────────────────────

FORCE_FN_ANCHOR = "async function adminDashboard(e){"

FORCE_FN = (
    "async function forceDailyPayments(btn){"
    "if(!confirm('Forcer le versement des commissions journalières maintenant ?\\n\\nCette action est irréversible.'))return;"
    "const orig=btn.innerHTML;"
    "btn.disabled=true;btn.innerHTML='<i class=\"fas fa-spinner fa-spin\"></i> En cours...';"
    "try{"
    "const r=await apiAdmin('POST','/trigger-daily-payments',{});"
    "const paid=r.paid??r.versements??0;"
    "showToast(`✅ ${paid} versement(s) effectué(s) avec succès`,'success',7000);"
    "const banner=document.getElementById('cron-alert-banner');"
    "if(banner){banner.classList.remove('animate-pulse');banner.style.opacity='0';banner.style.transition='opacity 0.5s';setTimeout(()=>banner.remove(),500);}"
    "}catch(e){"
    "showToast(e.error||'Erreur lors du déclenchement des paiements','error',6000);"
    "btn.disabled=false;btn.innerHTML=orig;"
    "}"
    "}"
    "async function adminDashboard(e){"
)

if "async function forceDailyPayments" in content:
    print("PATCH 2 SKIP — forceDailyPayments déjà présente")
else:
    count2 = content.count(FORCE_FN_ANCHOR)
    if count2 == 0:
        print("ERREUR — PATCH 2 : ancre adminDashboard non trouvée")
        sys.exit(1)
    content = content.replace(FORCE_FN_ANCHOR, FORCE_FN, 1)
    print(f"PATCH 2 OK — fonction forceDailyPayments() ajoutée")

# ─────────────────────────────────────────────────────────────────────────────
# Vérifications
# ─────────────────────────────────────────────────────────────────────────────

assert content.count('cron-alert-banner') == 2, f"Erreur : {content.count('cron-alert-banner')} occurrences cron-alert-banner (attendu 2 : id + remove)"
assert content.count('_todayMU') >= 2, f"Erreur : {content.count('_todayMU')} occurrences _todayMU (attendu ≥2)"
assert content.count('forceDailyPayments') == 2, f"Erreur : {content.count('forceDailyPayments')} occurrences forceDailyPayments (attendu 2 : def + appel)"
print("Vérifications OK")

# ─────────────────────────────────────────────────────────────────────────────
# Écriture
# ─────────────────────────────────────────────────────────────────────────────

with open(SRC, "w", encoding="utf-8") as f:
    f.write(content)

new_len = len(content)
print(f"\nFichier mis à jour : {original_len} → {new_len} octets (Δ {new_len - original_len:+d})")
print("Tous les patches appliqués avec succès.")
