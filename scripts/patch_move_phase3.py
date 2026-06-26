#!/usr/bin/env python3
"""
Phase 3 — Bouton Mode Deplacement dans toolbar arbre + fonctions JS
"""
import sys, shutil

FILE = 'public/static/admin-app.js'
BACKUP = 'public/static/admin-app.js.bak_move_phase3'

with open(FILE, 'rb') as f:
    content = f.read()

original_size = len(content)
print("Taille originale: %d bytes" % original_size)
shutil.copy2(FILE, BACKUP)
patches_applied = 0

# ─── PATCH 1 : Bouton Mode Deplacement dans la toolbar ────────────────────────
# Ancre exacte (bytes verifies avec hex dump):
# <i class=\"fas fa-rotate-right\"></i>\\n      </button>\\n    </div>\\n    <div id="adm-tree-wrap">
# En bytes: 5c 22 = \" dans le JS string, 5c 6e = \n dans le JS string

# Construire l'ancre avec les bytes exacts:
BS22 = bytes([0x5C, 0x22])  # \"  (backslash + guillemet dans la string JS)
BS6E = bytes([0x5C, 0x6E])  # \n  (backslash + n dans la string JS = newline)

ANCHOR_REFRESH = (
    b'<i class=' + BS22 + b'fas fa-rotate-right' + BS22 + b'></i>'
    + BS6E + b'      </button>'
    + BS6E + b'    </div>'
)

idx_anchor = content.find(ANCHOR_REFRESH)
print("Anchor at: %d" % idx_anchor)

if idx_anchor == -1:
    print("ERREUR: ancre rafraichir non trouvee"); sys.exit(1)

# Inserer le bouton Mode Deplacement APRES la fermeture </button>
# et AVANT le </div> de la toolbar
# Pattern: ...fa-rotate-right\"></i>\\n      </button>[ICI]\\n    </div>
# On insere apres </button> (avant \\n    </div>)
end_refresh_btn = b'</button>'
idx_after_btn = idx_anchor + len(ANCHOR_REFRESH[:ANCHOR_REFRESH.rfind(b'</button>') + len(b'</button>')])

print("Insert at: %d" % idx_after_btn)
print("Contexte: %s" % repr(content[idx_after_btn:idx_after_btn+40]))

# HTML du bouton (dans une JS string avec \" pour les guillemets HTML)
MOVE_BTN = (
    BS6E + b'      '
    b'<button id=' + BS22 + b'adm-move-mode-btn' + BS22
    + b' onclick=' + BS22 + b'toggleAdmMoveMode()' + BS22
    + b' class=' + BS22
    + b'flex items-center gap-1.5 px-3 py-2 bg-dark-700 border border-dark-500'
    + b' text-gray-300 hover:bg-purple-900/30 hover:text-purple-300'
    + b' hover:border-purple-500/50 rounded-xl text-xs font-medium transition'
    + BS22 + b'>'
    + b'<i class=' + BS22 + b'fas fa-arrows-up-down-left-right' + BS22 + b'></i>'
    + b' D\xc3\xa9placement</button>'
)

content = content[:idx_after_btn] + MOVE_BTN + content[idx_after_btn:]
patches_applied += 1
print("Patch 1 OK — %d bytes inseres" % len(MOVE_BTN))

# ─── PATCH 2 : Barre de statut sous la toolbar ────────────────────────────────
# Ancre: <div id="adm-tree-wrap">\\n      <div class=...loader
# Les guillemets ici sont normaux (pas dans template string)
ANCHOR2 = b'<div id="adm-tree-wrap">' + BS6E
idx_wrap = content.find(ANCHOR2)
print("adm-tree-wrap at: %d" % idx_wrap)

if idx_wrap > 0:
    idx_after_wrap = idx_wrap + len(ANCHOR2)
    STATUS_BAR = (
        b'<div id=' + BS22 + b'adm-move-status' + BS22
        + b' class=' + BS22
        + b'hidden mb-2 p-3 bg-indigo-900/30 border border-indigo-500/40'
        + b' rounded-xl flex items-center justify-between gap-3 text-xs' + BS22 + b'>'
        + b'<div class=' + BS22 + b'flex items-center gap-2' + BS22 + b'>'
        + b'<i class=' + BS22 + b'fas fa-hand-pointer text-indigo-400' + BS22 + b'></i>'
        + b'<span id=' + BS22 + b'adm-move-status-text' + BS22 + b' class=' + BS22 + b'text-indigo-200' + BS22 + b'>'
        + b'Cliquez sur le membre \xc3\xa0 d\xc3\xa9placer'
        + b'</span></div>'
        + b'<button onclick=' + BS22 + b'cancelAdmMoveMode()' + BS22
        + b' class=' + BS22 + b'text-gray-400 hover:text-white text-xs px-2 py-1 bg-dark-700 rounded-lg transition' + BS22 + b'>'
        + b'<i class=' + BS22 + b'fas fa-times mr-1' + BS22 + b'></i>Annuler'
        + b'</button></div>' + BS6E + b'      '
    )
    content = content[:idx_after_wrap] + STATUS_BAR + content[idx_after_wrap:]
    patches_applied += 1
    print("Patch 2 (status bar) OK — %d bytes" % len(STATUS_BAR))

# ─── PATCH 3 : Modifier onclick noeuds classiques ─────────────────────────────
# Pattern exact dans renderAdmClassicNode:
# admClassicNavigateTo('${e.id}')
# Bytes: b"admClassicNavigateTo('${e.id}')"  (apostrophes normales 0x27)
NODE_OLD = b"admClassicNavigateTo('${e.id}')"
idx_node = content.find(NODE_OLD)
print("Node onclick at: %d" % idx_node)

if idx_node > 0:
    # Nouveau: admTreeNodeClick(id, 'name separator uid')
    # Separateur: \xb4 (degre) entre prenom et nom pour eviter conflits
    NODE_NEW = b"admTreeNodeClick('${e.id}','${e.first_name}\xc2\xb4${e.last_name}','${e.unique_id}')"
    content = content[:idx_node] + NODE_NEW + content[idx_node + len(NODE_OLD):]
    patches_applied += 1
    print("Patch 3 (node click) OK")
else:
    print("WARNING: node onclick non trouve (pas critique)")

# ─── PATCH 4 : Fonctions JS mode deplacement ──────────────────────────────────
with open('scripts/move_mode_js.js', 'rb') as f:
    move_mode_js = f.read()

content = content + b'\n\n' + move_mode_js
patches_applied += 1
print("Patch 4 (JS functions) OK — %d bytes" % len(move_mode_js))

with open(FILE, 'wb') as f:
    f.write(content)

new_size = len(content)
print("\nPatches: %d" % patches_applied)
print("Taille originale : %d bytes" % original_size)
print("Taille finale    : %d bytes" % new_size)
print("Delta            : +%d bytes" % (new_size - original_size))
print("OK Phase 3 patche avec succes")
