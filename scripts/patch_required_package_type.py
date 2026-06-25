#!/usr/bin/env python3
"""
Patch admin-app.js pour rendre "Package requis" éditable dans Config MLM.
Deux modifications par remplacement de chaînes exactes.
"""

import sys

SRC = "/home/user/webapp/public/static/admin-app.js"

with open(SRC, "r", encoding="utf-8") as f:
    content = f.read()

original_len = len(content)

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 1 : <span> → <select> pour required_package_type
# Chaîne exacte extraite depuis le fichier
# ─────────────────────────────────────────────────────────────────────────────

OLD_SPAN = '<td><span class="text-xs ${\'Pinnacle\'===e.required_package_type?\'text-gold-400\':\'text-blue-300\'} font-medium">${e.required_package_type}</span></td>'

NEW_SELECT = (
    '<td>'
    '<select id="rc-${e.rank_name}-pkg-type" class="form-input text-xs w-28">'
    '<option value="Production" ${e.required_package_type===\'Production\'?\'selected\':\'\'}>Production</option>'
    '<option value="Pinnacle" ${e.required_package_type===\'Pinnacle\'?\'selected\':\'\'}>Pinnacle</option>'
    '</select>'
    '</td>'
)

count1 = content.count(OLD_SPAN)
if count1 == 0:
    print("ERREUR — PATCH 1 : chaîne non trouvée")
    sys.exit(1)
elif count1 > 1:
    print(f"ATTENTION — PATCH 1 : {count1} occurrences (attendu 1)")

content = content.replace(OLD_SPAN, NEW_SELECT, 1)
print(f"PATCH 1 OK — <span> → <select> ({count1} occurrence remplacée)")

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 2 : ajouter required_package_type dans saveRankConfig()
# Chaîne exacte extraite depuis le fichier
# ─────────────────────────────────────────────────────────────────────────────

OLD_SAVE = "monthly_floor_ranks:parseInt(document.getElementById(`rc-${e}-floor`)?.value||'0')||0}),btnSaved(t),"

NEW_SAVE = (
    "monthly_floor_ranks:parseInt(document.getElementById(`rc-${e}-floor`)?.value||'0')||0,"
    "required_package_type:document.getElementById(`rc-${e}-pkg-type`)?.value||'Production'"
    "}),btnSaved(t),"
)

count2 = content.count(OLD_SAVE)
if count2 == 0:
    print("ERREUR — PATCH 2 : chaîne non trouvée")
    sys.exit(1)
elif count2 > 1:
    print(f"ATTENTION — PATCH 2 : {count2} occurrences (attendu 1)")

content = content.replace(OLD_SAVE, NEW_SAVE, 1)
print(f"PATCH 2 OK — required_package_type ajouté dans saveRankConfig ({count2} occurrence)")

# ─────────────────────────────────────────────────────────────────────────────
# Écriture
# ─────────────────────────────────────────────────────────────────────────────

with open(SRC, "w", encoding="utf-8") as f:
    f.write(content)

new_len = len(content)
print(f"\nFichier mis à jour : {original_len} → {new_len} octets (Δ {new_len - original_len:+d})")
print("Tous les patches appliqués avec succès.")
