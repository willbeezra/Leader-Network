#!/usr/bin/env python3
"""
Phase 2 — Bouton Déplacer + fonctions modal 3 etapes
Bytes corrects: ESC_QD = 5C 22 (\"), ESC_QS = 5C 27 (\')
"""
import sys, shutil

FILE = 'public/static/admin-app.js'
BACKUP = 'public/static/admin-app.js.bak_move_phase2'

with open(FILE, 'rb') as f:
    content = f.read()

original_size = len(content)
print("Taille originale: %d bytes" % original_size)
shutil.copy2(FILE, BACKUP)
patches_applied = 0

# ─── TROUVER L'ANCRE ─────────────────────────────────────────────────────────
needle_recalcul = b'adminRecalculBonus'
idx_r = content.find(needle_recalcul)
if idx_r == -1:
    print("ERREUR: adminRecalculBonus non trouve"); sys.exit(1)

window = content[idx_r - 300: idx_r]
# Pattern exact (bytes 5C 22 = \")
sub_needle = b'<div class=\\"mt-4 pt-4 border-t border-dark-600\\">'
sub_idx = window.rfind(sub_needle)
if sub_idx == -1:
    print("ERREUR: div mt-4 non trouve"); sys.exit(1)

prefix_needle = b'\\n\\n      '
pre_idx = window.rfind(prefix_needle, 0, sub_idx)
if pre_idx != -1:
    idx_insert = idx_r - 300 + pre_idx + len(prefix_needle)
else:
    idx_insert = idx_r - 300 + sub_idx

print("Position insertion: %d" % idx_insert)
print("Contexte: %s" % repr(content[idx_insert:idx_insert+60]))

# ─── PATCH 1 : HTML du bouton Déplacer ───────────────────────────────────────
# Bytes corrects (vérifiés avec hex dump):
# onclick=\"fn(...)\" = 5C 22 f n ( ... ) 5C 22
# onclick=\'x\'      = 5C 27 x 5C 27
ESC_QD = bytes([0x5C, 0x22])   # \"
ESC_QS = bytes([0x5C, 0x27])   # \'

ONCLICK = (
    b'onclick=' + ESC_QD +
    b'openMoveMember(' +
    ESC_QS + b'${n.id}' + ESC_QS + b',' +
    ESC_QS + b'${n.first_name} ${n.last_name}' + ESC_QS + b',' +
    ESC_QS + b'${n.unique_id}' + ESC_QS +
    b')' + ESC_QD
)

CLASS_BTN = (
    b' class=' + ESC_QD +
    b'w-full bg-indigo-600 text-white font-semibold px-4 py-2.5 rounded-xl'
    b' hover:bg-indigo-500 transition text-sm flex items-center justify-center gap-2'
    + ESC_QD
)
CLASS_DIV = b' class=' + ESC_QD + b'mt-3 pt-3 border-t border-dark-600' + ESC_QD
CLASS_P   = b' class=' + ESC_QD + b'text-xs text-gray-500 text-center mt-1' + ESC_QD
CLASS_I   = b' class=' + ESC_QD + b'fas fa-arrows-up-down-left-right mr-2' + ESC_QD

INSERT = (
    b'<div' + CLASS_DIV + b'>' +
    b'<button ' + ONCLICK + CLASS_BTN + b'>' +
    b'<i' + CLASS_I + b'></i>' +
    'Déplacer dans l\u2019arbre binaire'.encode('utf-8') +
    b'</button>' +
    b'<p' + CLASS_P + b'>' +
    'Déplace ce membre vers une nouvelle position'.encode('utf-8') +
    b'</p>' +
    b'</div>\\n\\n      '
)

# Verifier les bytes de l'INSERT
print("INSERT hex (30 bytes): %s" % INSERT[:30].hex())
print("INSERT preview: %s" % repr(INSERT[:80]))

content = content[:idx_insert] + INSERT + content[idx_insert:]
patches_applied += 1
print("Patch 1 OK — %d bytes inseres" % len(INSERT))

# ─── PATCH 2 : Fonctions JS en fin de fichier ─────────────────────────────
with open('scripts/move_member_js.js', 'rb') as f:
    new_js = f.read()

content = content + b'\n\n' + new_js
patches_applied += 1
print("Patch 2 OK — %d bytes ajoutes" % len(new_js))

# ─── ECRITURE ──────────────────────────────────────────────────────────────
with open(FILE, 'wb') as f:
    f.write(content)

new_size = len(content)
print("\nPatches: %d/2" % patches_applied)
print("Taille originale : %d bytes" % original_size)
print("Taille finale    : %d bytes" % new_size)
print("Delta            : +%d bytes" % (new_size - original_size))
print("OK admin-app.js patche avec succes")
