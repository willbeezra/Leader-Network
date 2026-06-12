#!/usr/bin/env python3
"""
Patch UNIQUE et FINAL : remplace uniquement openMktgViewer
en respectant exactement le niveau d'escaping du fichier (\\n, \\')
"""

with open('public/static/member-app.js', 'r', encoding='utf-8') as f:
    content = f.read()

START = 324503
END   = 326704
old_fn = content[START:END]

# Vérification de sécurité : on s'assure qu'on remplace bien la bonne fonction
assert old_fn.startswith('function openMktgViewer(e,t,n)'), "ERREUR: mauvaise position"
assert old_fn.endswith('!0)}'), "ERREUR: mauvaise fin"
print(f"Ancien: {len(old_fn)} chars — OK")

# Nouvelle fonction.
# Règles d'escaping identiques au reste du fichier :
#   - les \n dans le template string HTML  → \\n  (1 backslash + n)
#   - les apostrophes imbriquées           → \\' (1 backslash + apostrophe)
#   - les guillemets dans les attrs HTML   → " (normaux, pas besoin d'échapper)
#
# Logique : détection du type depuis l'URL (extension ou chemin)
# Corps adapté selon type, header IDENTIQUE à l'original

new_fn = (
    r"function openMktgViewer(e,t,n){"
    r"trackMktgView(e);"
    r"const a=decodeURIComponent(t);"
    # Détection du type depuis l'URL
    r"const _u=a.toLowerCase();"
    r"const _isImg=/\.(jpe?g|png|gif|webp|svg|bmp)(\?|$)/.test(_u)||_u.includes('/image/');"
    r"const _isVid=/\.(mp4|webm|ogg|mov|avi)(\?|$)/.test(_u)||_u.includes('/video/');"
    r"const _isAud=/\.(mp3|wav|ogg|aac|flac|m4a)(\?|$)/.test(_u)||_u.includes('/audio/');"
    # Icône dans le header selon type
    r"const _icon=_isImg?'fa-image':_isVid?'fa-video':_isAud?'fa-music':'fa-file-pdf';"
    r"const _icol=_isImg?'text-blue-400':_isVid?'text-purple-400':_isAud?'text-yellow-400':'text-red-400';"
    # Corps du viewer
    r"let _body;"
    r"if(_isImg){"
    r"""_body='<div class=\"flex-1 bg-gray-900 flex items-center justify-center p-4\"><img src=\"'+a+'\" alt=\"'+decodeURIComponent(n)+'\" class=\"max-w-full max-h-full object-contain rounded-lg\"></div>';"""
    r"}else if(_isVid){"
    r"""_body='<div class=\"flex-1 bg-black flex items-center justify-center\"><video src=\"'+a+'\" controls class=\"max-w-full\" style=\"max-height:calc(85vh - 56px)\"></video></div>';"""
    r"}else if(_isAud){"
    r"""_body='<div class=\"flex-1 bg-gray-900 flex flex-col items-center justify-center gap-6 p-8\"><div class=\"w-20 h-20 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center\"><i class=\"fas fa-music text-yellow-400 text-3xl\"></i></div><audio src=\"'+a+'\" controls class=\"w-full max-w-md\"></audio></div>';"""
    r"}else{"
    # PDF / doc / tout autre → Google Docs Viewer (comportement original)
    r"""_body='<div class=\"flex-1 bg-gray-900 relative\"><iframe src=\"https://docs.google.com/gview?url='+encodeURIComponent(a)+'&embedded=true\" class=\"w-full h-full border-0\" allowfullscreen onerror=\"this.style.display=\'none\'; document.getElementById(\'pdf-fallback\').style.display=\'flex\'\"></iframe><div id=\"pdf-fallback\" class=\"hidden absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-400\"><i class=\"fas fa-file-pdf text-red-400 text-4xl\"></i><p class=\"text-sm\">Impossible d\'afficher le document dans la fen\u00eatre.</p><a href=\"'+a+'\" target=\"_blank\" class=\"bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-500 transition flex items-center gap-2\"><i class=\"fas fa-external-link-alt\"></i> Ouvrir dans un nouvel onglet</a></div></div>';"""
    r"}"
    # showModal avec le même template que l'original — header identique, corps dynamique
    "showModal(`\\\\n"
    "  <div class=\\\"flex flex-col\\\" style=\\\"height:85vh;min-width:min(90vw,900px);\\\">\\\\n"
    "    <div class=\\\"flex items-center justify-between px-5 py-3 border-b border-dark-600 bg-dark-800 flex-shrink-0\\\">\\\\n"
    "      <div class=\\\"flex items-center gap-2 min-w-0\\\">\\\\n"
    "        <i class=\\\"fas ${_icon} ${_icol} flex-shrink-0\\\"></i>\\\\n"
    "        <span class=\\\"font-semibold text-white text-sm truncate\\\">${decodeURIComponent(n)}</span>\\\\n"
    "      </div>\\\\n"
    "      <div class=\\\"flex items-center gap-2 flex-shrink-0 ml-3\\\">\\\\n"
    "        <a href=\\\"${a}\\\" target=\\\"_blank\\\"\\\\n"
    "          class=\\\"text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-1.5 rounded-lg hover:bg-blue-600/30 transition flex items-center gap-1.5\\\">\\\\n"
    "          <i class=\\\"fas fa-external-link-alt\\\"></i> Nouvelle fen\u00eatre\\\\n"
    "        </a>\\\\n"
    "        <a href=\\\"${a}\\\" download target=\\\"_blank\\\"\\\\n"
    "          class=\\\"text-xs bg-green-600/20 text-green-400 border border-green-600/30 px-3 py-1.5 rounded-lg hover:bg-green-600/30 transition flex items-center gap-1.5\\\">\\\\n"
    "          <i class=\\\"fas fa-download\\\"></i> T\u00e9l\u00e9charger\\\\n"
    "        </a>\\\\n"
    "        <button onclick=\\\"closeModal()\\\" class=\\\"text-gray-400 hover:text-white ml-2\\\">\\\\n"
    "          <i class=\\\"fas fa-times\\\"></i>\\\\n"
    "        </button>\\\\n"
    "      </div>\\\\n"
    "    </div>\\\\n"
    "    ${_body}\\\\n"
    "  </div>`,!0)}"
)

print(f"Nouveau: {len(new_fn)} chars")

content = content[:START] + new_fn + content[END:]

with open('public/static/member-app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fichier sauvegardé.")
