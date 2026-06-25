#!/usr/bin/env python3
"""
Patch admin-app.js : rendre _cfgRender_ranks async + charger packages dynamiquement
pour le <select> required_package_type.
"""

import sys

SRC = "/home/user/webapp/public/static/admin-app.js"

with open(SRC, "r", encoding="utf-8") as f:
    content = f.read()

original_len = len(content)

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 1 : rendre _cfgRender_ranks async + charger packages
# ─────────────────────────────────────────────────────────────────────────────

OLD_RENDER_START = "function _cfgRender_ranks(el,data){const{t,l}=data;"

NEW_RENDER_START = (
    "async function _cfgRender_ranks(el,data){const{t,l}=data;"
    "let _pkgs=[];"
    "try{const _pr=await apiAdmin('GET','/packages');_pkgs=(_pr.packages||[]).filter(p=>p.is_active!==0);}catch(e){}"
    "const _pkgOpts=e=>_pkgs.map(p=>`<option value=\"${p.name}\" ${e===p.name?'selected':''}>${p.name} ($${p.price_usd})</option>`).join('');"
)

count1 = content.count(OLD_RENDER_START)
if count1 == 0:
    print("ERREUR — PATCH 1 : début de _cfgRender_ranks non trouvé")
    sys.exit(1)

content = content.replace(OLD_RENDER_START, NEW_RENDER_START, 1)
print(f"PATCH 1 OK — _cfgRender_ranks async + chargement packages ({count1} occurrence)")

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 2 : remplacer le <select> hardcodé par le <select> dynamique
# ─────────────────────────────────────────────────────────────────────────────

OLD_SELECT = (
    '<td>'
    '<select id="rc-${e.rank_name}-pkg-type" class="form-input text-xs w-28">'
    '<option value="Production" ${e.required_package_type===\'Production\'?\'selected\':\'\'}>Production</option>'
    '<option value="Pinnacle" ${e.required_package_type===\'Pinnacle\'?\'selected\':\'\'}>Pinnacle</option>'
    '</select>'
    '</td>'
)

NEW_SELECT_DYN = (
    '<td>'
    '<select id="rc-${e.rank_name}-pkg-type" class="form-input text-xs w-28">'
    '${_pkgOpts(e.required_package_type)}'
    '</select>'
    '</td>'
)

count2 = content.count(OLD_SELECT)
if count2 == 0:
    print("ERREUR — PATCH 2 : <select> hardcodé non trouvé")
    sys.exit(1)

content = content.replace(OLD_SELECT, NEW_SELECT_DYN, 1)
print(f"PATCH 2 OK — <select> dynamique ({count2} occurrence)")

# ─────────────────────────────────────────────────────────────────────────────
# Écriture
# ─────────────────────────────────────────────────────────────────────────────

with open(SRC, "w", encoding="utf-8") as f:
    f.write(content)

new_len = len(content)
print(f"\nFichier mis à jour : {original_len} → {new_len} octets (Δ {new_len - original_len:+d})")
print("Patches appliqués avec succès.")
