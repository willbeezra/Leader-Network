#!/usr/bin/env python3
"""
Patch admin-app.js : onglet + panel + fonctions JS pour les ajustements manuels membre.
"""

import sys

SRC = "/home/user/webapp/public/static/admin-app.js"

with open(SRC, "r", encoding="utf-8") as f:
    content = f.read()

original_len = len(content)

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 1+2 combiné : ajouter onglet Ajustements + panel overrides
# Ancre : depuis le bouton blocked jusqu'au panel orders (zone unique)
# ─────────────────────────────────────────────────────────────────────────────

# Extraire la chaîne exacte depuis le fichier
BLOCKED_BTN_START = 'act-tab-blocked" class="act-tab px-4 py-2 text-sm font-medium text-white/50 border-b-2 border-transparent">'
BLOCKED_BTN_END   = '<!-- Panel Commandes -->\n      <div id="act-panel-orders">'

# Trouver les positions
idx_start = content.find(BLOCKED_BTN_START)
idx_end   = content.find(BLOCKED_BTN_END)

if idx_start == -1:
    print("ERREUR : début bouton blocked non trouvé")
    sys.exit(1)
if idx_end == -1:
    print("ERREUR : Panel Commandes non trouvé")
    sys.exit(1)

# Extraire la zone complète à remplacer (du bouton blocked au panel commandes inclus)
OLD_ZONE = content[idx_start:idx_end + len(BLOCKED_BTN_END)]
print(f"Zone extraite : pos {idx_start}–{idx_end+len(BLOCKED_BTN_END)} ({len(OLD_ZONE)} chars)")

# Construire la zone de remplacement
NEW_ZONE = (
    # Bouton blocked (identique)
    OLD_ZONE[:OLD_ZONE.find('\n      </div>\n\n      <!-- Panel Commandes -->')]
    # Nouveau bouton onglet Ajustements
    + '\n        <button onclick="_actTab(\'overrides\',this);loadMemberOverrides(\'' + "${n.id}" + '\')" id="act-tab-overrides" class="act-tab px-4 py-2 text-sm font-medium text-white/50 border-b-2 border-transparent">\n'
    + '          <i class="fas fa-sliders mr-1 text-purple-400"></i>Ajustements\n'
    + '        </button>\n'
    + '      </div>\n\n'
    # Panel overrides (caché par défaut)
    + '      <!-- Panel Ajustements Manuels -->\n'
    + '      <div id="act-panel-overrides" class="hidden">\n'
    + '        <div id="override-content-' + "${n.id}" + '" class="space-y-4">\n'
    + '          <div class="flex justify-center py-8"><div class="loader"></div></div>\n'
    + '        </div>\n'
    + '      </div>\n\n'
    # Panel commandes (identique)
    + '      <!-- Panel Commandes -->\n'
    + '      <div id="act-panel-orders">'
)

content = content[:idx_start] + NEW_ZONE + content[idx_start + len(OLD_ZONE):]
print("PATCH 1+2 OK — onglet + panel Ajustements ajoutés")

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 3 : ajouter les fonctions JS avant viewMember
# ─────────────────────────────────────────────────────────────────────────────

RANK_NAMES = "['none','Ambassadeur','Partenaire','Manager','Captain','Leader','Mentor','Superviseur','Executive','Ambassador','Legend','Pinnacle']"

OVERRIDE_JS = (
    "async function loadMemberOverrides(memberId){"
    "const el=document.getElementById('override-content-'+memberId);"
    "if(!el)return;"
    "el.innerHTML='<div class=\"flex justify-center py-8\"><div class=\"loader\"></div></div>';"
    "try{"
    "const r=await apiAdmin('GET','/members/'+memberId+'/overrides');"
    "const ov=r.override||{};"
    "const logs=r.logs||[];"
    "const fmtBV=v=>v?'+'+parseFloat(v).toLocaleString('fr-CA')+' BV':'0';"
    "const fmtDate=d=>d?new Date(d+'Z').toLocaleString('fr-CA',{dateStyle:'short',timeStyle:'short'}):'-';"
    "const rankNames=" + RANK_NAMES + ";"
    "const rankOpts=rankNames.map(r=>'<option value=\"'+r+'\"'+(ov.rank_override===r?' selected':'')+'>'+( r==='none'?'— Aucun override —':r)+'</option>').join('');"
    "el.innerHTML="
    "'<div class=\"bg-dark-800 rounded-2xl border border-purple-500/20 p-5 space-y-5\">'"
    "+'<div class=\"flex items-center gap-2 mb-1\"><i class=\"fas fa-sliders text-purple-400\"></i><span class=\"font-semibold text-purple-300\">Ajustements manuels</span>'"
    "+(ov.rank_override||ov.bv_left_monthly_bonus||ov.bv_right_monthly_bonus||ov.bv_left_total_bonus||ov.bv_right_total_bonus"
    "?'<span class=\"ml-2 bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full border border-purple-500/30\">Override actif</span>'"
    ":'<span class=\"ml-2 text-xs text-gray-500\">Aucun override actif</span>')+'</div>'"
    "+'<div class=\"grid grid-cols-2 gap-3\">'"
    "+'<div class=\"bg-dark-700 rounded-xl p-4 border border-dark-600\">'"
    "+'<div class=\"text-xs text-gray-400 uppercase tracking-wide mb-3\"><i class=\"fas fa-chart-bar text-blue-400 mr-1\"></i>BV Mensuel bonus</div>'"
    "+'<div class=\"grid grid-cols-2 gap-3\">'"
    "+'<div><label class=\"form-label text-xs\">Jambe Gauche (+)</label><input type=\"number\" id=\"ov-bv-lm\" class=\"form-input text-sm\" value=\"'+(ov.bv_left_monthly_bonus||0)+'\" min=\"0\" step=\"0.01\"></div>'"
    "+'<div><label class=\"form-label text-xs\">Jambe Droite (+)</label><input type=\"number\" id=\"ov-bv-rm\" class=\"form-input text-sm\" value=\"'+(ov.bv_right_monthly_bonus||0)+'\" min=\"0\" step=\"0.01\"></div>'"
    "+'</div><div class=\"mt-2 text-xs text-gray-500\">Override actif — G: <span class=\"text-blue-300\">'+fmtBV(ov.bv_left_monthly_bonus)+'</span> D: <span class=\"text-blue-300\">'+fmtBV(ov.bv_right_monthly_bonus)+'</span></div></div>'"
    "+'<div class=\"bg-dark-700 rounded-xl p-4 border border-dark-600\">'"
    "+'<div class=\"text-xs text-gray-400 uppercase tracking-wide mb-3\"><i class=\"fas fa-database text-gold-400 mr-1\"></i>BV Total à vie bonus</div>'"
    "+'<div class=\"grid grid-cols-2 gap-3\">'"
    "+'<div><label class=\"form-label text-xs\">Jambe Gauche (+)</label><input type=\"number\" id=\"ov-bv-lt\" class=\"form-input text-sm\" value=\"'+(ov.bv_left_total_bonus||0)+'\" min=\"0\" step=\"0.01\"></div>'"
    "+'<div><label class=\"form-label text-xs\">Jambe Droite (+)</label><input type=\"number\" id=\"ov-bv-rt\" class=\"form-input text-sm\" value=\"'+(ov.bv_right_total_bonus||0)+'\" min=\"0\" step=\"0.01\"></div>'"
    "+'</div><div class=\"mt-2 text-xs text-gray-500\">Override actif — G: <span class=\"text-gold-300\">'+fmtBV(ov.bv_left_total_bonus)+'</span> D: <span class=\"text-gold-300\">'+fmtBV(ov.bv_right_total_bonus)+'</span></div></div>'"
    "+'</div>'"
    "+'<div class=\"bg-dark-700 rounded-xl p-4 border border-purple-500/20\">'"
    "+'<div class=\"text-xs text-gray-400 uppercase tracking-wide mb-3\"><i class=\"fas fa-crown text-purple-400 mr-1\"></i>Rang override</div>'"
    "+'<div class=\"grid grid-cols-2 gap-4 items-end\">'"
    "+'<div><label class=\"form-label text-xs\">Forcer le rang à</label><select id=\"ov-rank\" class=\"form-input\">'+rankOpts+'</select></div>'"
    "+'<div class=\"text-xs text-gray-400 bg-dark-600 rounded-lg p-3\"><i class=\"fas fa-info-circle mr-1 text-purple-400\"></i>Override permanent jusqu\\'à réinitialisation manuelle.</div>'"
    "+'</div></div>'"
    "+'<div><label class=\"form-label text-xs\">Raison (obligatoire)</label><input type=\"text\" id=\"ov-reason\" class=\"form-input\" value=\"'+(ov.reason||'')+'\" placeholder=\"Ex: Correction suite à erreur technique...\"></div>'"
    "+'<div class=\"flex gap-3\">'"
    "+'<button onclick=\"saveMemberOverrides(\\\"'+memberId+'\\\",this)\" class=\"flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2\"><i class=\"fas fa-save\"></i>Sauvegarder</button>'"
    "+(ov.rank_override||ov.bv_left_monthly_bonus||ov.bv_right_monthly_bonus||ov.bv_left_total_bonus||ov.bv_right_total_bonus"
    "?'<button onclick=\"resetMemberOverrides(\\\"'+memberId+'\\\",this)\" class=\"bg-red-900/40 hover:bg-red-900/60 text-red-400 font-bold py-2.5 px-4 rounded-xl border border-red-800/30 transition flex items-center gap-2\"><i class=\"fas fa-undo\"></i>Réinitialiser</button>':'')+'</div>'"
    "+(logs.length>0?"
    "'<div class=\"border-t border-dark-600 pt-4\"><div class=\"text-xs text-gray-400 uppercase tracking-wide mb-3\"><i class=\"fas fa-history mr-1\"></i>Historique</div>'"
    "+'<div class=\"space-y-2 max-h-48 overflow-y-auto\">'"
    "+logs.map(l=>'<div class=\"bg-dark-700 rounded-lg px-3 py-2 flex items-start justify-between gap-3\"><div><div class=\"text-xs font-medium '+(l.action===\"reset\"?'text-red-400':'text-purple-300')+'\">'+(l.action===\"reset\"?'🔄 Réinitialisation':'✏️ Ajustement')+'</div><div class=\"text-xs text-gray-400 mt-0.5\">'+(l.reason||'—')+'</div><div class=\"text-xs text-gray-500\">par '+(l.admin_username||'admin')+'</div>'+(l.action===\"set\"?'<div class=\"text-xs text-gray-500\">BV mensuel G:+'+(l.bv_left_monthly_bonus||0)+' D:+'+(l.bv_right_monthly_bonus||0)+' | Total G:+'+(l.bv_left_total_bonus||0)+' D:+'+(l.bv_right_total_bonus||0)+' | Rang:'+(l.rank_override||'—')+'</div>':'')+'</div><div class=\"text-xs text-gray-500 whitespace-nowrap\">'+fmtDate(l.created_at)+'</div></div>').join('')"
    "+'</div></div>':'')+'</div>';"
    "}catch(e){el.innerHTML='<div class=\"p-4 text-red-400\"><i class=\"fas fa-exclamation-circle mr-2\"></i>'+(e.error||'Erreur chargement')+'</div>';}}"

    "async function saveMemberOverrides(memberId,btn){"
    "const reason=document.getElementById('ov-reason')?.value?.trim();"
    "if(!reason)return showToast('La raison est obligatoire','error');"
    "const orig=btn.innerHTML;"
    "btn.disabled=true;btn.innerHTML='<i class=\"fas fa-spinner fa-spin\"></i> Sauvegarde...';"
    "try{"
    "await apiAdmin('POST','/members/'+memberId+'/overrides',{"
    "bv_left_monthly_bonus:parseFloat(document.getElementById('ov-bv-lm')?.value||'0')||0,"
    "bv_right_monthly_bonus:parseFloat(document.getElementById('ov-bv-rm')?.value||'0')||0,"
    "bv_left_total_bonus:parseFloat(document.getElementById('ov-bv-lt')?.value||'0')||0,"
    "bv_right_total_bonus:parseFloat(document.getElementById('ov-bv-rt')?.value||'0')||0,"
    "rank_override:document.getElementById('ov-rank')?.value||null,"
    "reason"
    "});"
    "showToast('✅ Ajustements sauvegardés','success');"
    "loadMemberOverrides(memberId);"
    "}catch(e){showToast(e.error||'Erreur','error');btn.disabled=false;btn.innerHTML=orig;}}"

    "async function resetMemberOverrides(memberId,btn){"
    "if(!confirm('Réinitialiser tous les ajustements ?\\nLe membre retrouvera ses vrais BV et rang calculé automatiquement.'))return;"
    "const orig=btn.innerHTML;"
    "btn.disabled=true;btn.innerHTML='<i class=\"fas fa-spinner fa-spin\"></i> Réinitialisation...';"
    "try{"
    "const r=await apiAdmin('DELETE','/members/'+memberId+'/overrides',{});"
    "showToast('✅ Override supprimé — rang réel : '+(r.realRank||'recalculé'),'success',5000);"
    "loadMemberOverrides(memberId);"
    "}catch(e){showToast(e.error||'Erreur','error');btn.disabled=false;btn.innerHTML=orig;}}"

    "async function viewMember("
)

OLD_VIEW = "async function viewMember("
count3 = content.count(OLD_VIEW)
if count3 == 0:
    print("ERREUR — PATCH 3 : viewMember non trouvé")
    sys.exit(1)
content = content.replace(OLD_VIEW, OVERRIDE_JS, 1)
print(f"PATCH 3 OK — fonctions JS override ajoutées ({count3} occurrence)")

# ─────────────────────────────────────────────────────────────────────────────
# Vérifications
# ─────────────────────────────────────────────────────────────────────────────

checks = ['act-tab-overrides', 'act-panel-overrides', 'loadMemberOverrides', 'saveMemberOverrides', 'resetMemberOverrides', 'override-content-']
for c in checks:
    assert c in content, f"ABSENT: {c}"
print("Vérifications OK")

# ─────────────────────────────────────────────────────────────────────────────
# Écriture
# ─────────────────────────────────────────────────────────────────────────────

with open(SRC, "w", encoding="utf-8") as f:
    f.write(content)

new_len = len(content)
print(f"\nFichier mis à jour : {original_len} → {new_len} octets (Δ {new_len - original_len:+d})")
print("Tous les patches appliqués avec succès.")
