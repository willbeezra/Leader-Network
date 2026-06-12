#!/usr/bin/env python3
"""
Patch chirurgical pour member-app.js :
1. mktgMemberCard : bouton Consulter universel (tous types sauf link)
2. openMktgViewer : viewer adaptatif par type (pdf/doc/image/video/audio)
"""

with open('public/static/member-app.js', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Taille initiale: {len(content)}")

# ===========================================================
# PATCH 1 : mktgMemberCard — bouton Consulter universel
# ===========================================================
# On remplace par position (le fichier est restauré à 1ab695c, positions stables)

# Localiser le début du bloc boutons
start_marker = content.find('"pdf"===e.type||e.url.includes(".pdf")')
if start_marker < 0:
    print("ERREUR: marker pdf non trouvé")
    exit(1)

# Le ${ précédent
start = content.rfind('${', 0, start_marker)
print(f"Bloc boutons start: {start}")

# La fin du bloc : après le closing `` de is_downloadable
# On cherche "}\\\\n      </div>\\\\n    </div>\\\\n  </div>`}async"
end_marker = content.find('</div>`}async function renderMarketing', start)
if end_marker < 0:
    print("ERREUR: end marker non trouvé")
    exit(1)

# La fin est juste avant </div>`}async
# On remonte jusqu'à `:""}`
# Le vrai end = position de "\\\\n      </div>" après le download button
seg_from_start = content[start:]
# Chercher la fin du bloc is_downloadable: `:""}`
dl_end_rel = seg_from_start.find(':""}')
print(f"dl_end_rel: {dl_end_rel}")
end = start + dl_end_rel + 4  # +4 pour inclure `:""}` 

old_bloc = content[start:end]
print(f"Longueur old_bloc: {len(old_bloc)}")
print(f"Début: {repr(old_bloc[:80])}")
print(f"Fin: {repr(old_bloc[-80:])}")

# Nouveau bloc
# Garder EXACTEMENT le même style d'escaping que le fichier original :
# - \\\\n pour les newlines dans les template strings imbriqués
# - \\' pour les apostrophes imbriquées
# - On passe e.type comme 4e argument à openMktgViewer
new_bloc = (
    '${"link"===e.type?`\\\\n'
    '        <a href="${e.url}" target="_blank" onclick="trackMktgView(\\\'${e.id}\\\')"\\\\n'
    '          class="flex-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-2 rounded-xl hover:bg-blue-600/30 transition flex items-center justify-center gap-1.5 font-medium">\\\\n'
    '          <i class="fas fa-external-link-alt"></i> Ouvrir\\\\n'
    '        </a>`:`\\\\n'
    '        <button onclick="openMktgViewer(\\\'${e.id}\\\',\\\'${encodeURIComponent(e.url)}\\\',\\\'${encodeURIComponent(e.title)}\\\',\\\'${e.type||"pdf"}\\\')"\\\\n'
    '          class="flex-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-2 rounded-xl hover:bg-blue-600/30 transition flex items-center justify-center gap-1.5 font-medium">\\\\n'
    '          <i class="fas fa-eye"></i> Consulter\\\\n'
    '        </button>`}\\\\n'
    '        ${e.is_downloadable?`\\\\n'
    '        <a href="${e.url}" download target="_blank"\\\\n'
    '          class="text-xs bg-green-600/20 text-green-400 border border-green-600/30 px-3 py-2 rounded-xl hover:bg-green-600/30 transition flex items-center justify-center gap-1.5"\\\\n'
    '          title="T&#233;l&#233;charger">\\\\n'
    '          <i class="fas fa-download"></i>\\\\n'
    '        </a>`:""}'
)

print(f"Longueur new_bloc: {len(new_bloc)}")
content = content[:start] + new_bloc + content[end:]
print("Patch 1 OK")

# ===========================================================
# PATCH 2 : openMktgViewer — viewer adaptatif par type
# ===========================================================
# Ancienne signature : function openMktgViewer(e,t,n)
# Nouvelle signature : function openMktgViewer(e,t,n,tp)
# tp = type (pdf, image, video, audio, doc, link, ...)

old_fn_start = content.find('function openMktgViewer(e,t,n)')
if old_fn_start < 0:
    print("ERREUR: openMktgViewer non trouvé")
    exit(1)

old_fn_end = content.find('function copyReferralLink', old_fn_start)
if old_fn_end < 0:
    print("ERREUR: fin de openMktgViewer non trouvée")
    exit(1)

old_fn = content[old_fn_start:old_fn_end]
print(f"openMktgViewer longueur: {len(old_fn)}")

# Nouvelle fonction — même style de header (barre avec titre + boutons)
# Corps adaptatif selon tp
# IMPORTANT : tout en une seule logique cohérente, même escaping
new_fn = (
    'function openMktgViewer(e,t,n,tp){'
    'trackMktgView(e);'
    'const a=decodeURIComponent(t),title=decodeURIComponent(n),type=tp||"pdf";'
    # Pour les liens → ouvrir directement (ne devrait pas arriver via le nouveau bouton mais sécurité)
    'if(type==="link"){window.open(a,"_blank");return;}'
    # Icône selon type
    'const icon=type==="image"?"fa-image":type==="video"?"fa-video":type==="audio"?"fa-music":type==="doc"?"fa-file-word":"fa-file-pdf";'
    'const iconColor=type==="image"?"text-blue-400":type==="video"?"text-purple-400":type==="audio"?"text-yellow-400":type==="doc"?"text-orange-400":"text-red-400";'
    # Corps du viewer selon type
    'let body;'
    'if(type==="image"){body=`<div class="flex-1 bg-gray-900 flex items-center justify-center p-4 overflow-auto"><img src="${a}" alt="${title}" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl"></div>`; }'
    'else if(type==="video"){body=`<div class="flex-1 bg-black flex items-center justify-center"><video src="${a}" controls class="max-w-full max-h-full" style="max-height:calc(85vh - 60px)">Votre navigateur ne supporte pas la lecture vid&#233;o.</video></div>`; }'
    'else if(type==="audio"){body=`<div class="flex-1 bg-gray-900 flex flex-col items-center justify-center gap-6 p-8"><div class="w-24 h-24 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center"><i class="fas fa-music text-yellow-400 text-4xl"></i></div><p class="text-white font-semibold text-center">${title}</p><audio src="${a}" controls class="w-full max-w-md">Votre navigateur ne supporte pas la lecture audio.</audio></div>`; }'
    'else{'
    # PDF, doc, et tout autre type → Google Docs Viewer
    'body=`<div class="flex-1 bg-gray-900 relative"><iframe src="https://docs.google.com/gview?url=${encodeURIComponent(a)}&embedded=true" class="w-full h-full border-0" allowfullscreen onerror="this.style.display=\'none\'; document.getElementById(\'pdf-fallback\').style.display=\'flex\'"></iframe><div id="pdf-fallback" class="hidden absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-400"><i class="fas ${icon} ${iconColor} text-4xl"></i><p class="text-sm">Impossible d\'afficher le document dans la fen&#234;tre.</p><a href="${a}" target="_blank" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-500 transition flex items-center gap-2"><i class="fas fa-external-link-alt"></i> Ouvrir dans un nouvel onglet</a></div></div>`;'
    '}'
    'showModal(`\\\\n'
    '  <div class="flex flex-col" style="height:85vh;min-width:min(90vw,900px);">\\\\n'
    '    <div class="flex items-center justify-between px-5 py-3 border-b border-dark-600 bg-dark-800 flex-shrink-0">\\\\n'
    '      <div class="flex items-center gap-2 min-w-0">\\\\n'
    '        <i class="fas ${icon} ${iconColor} flex-shrink-0"></i>\\\\n'
    '        <span class="font-semibold text-white text-sm truncate">${title}</span>\\\\n'
    '      </div>\\\\n'
    '      <div class="flex items-center gap-2 flex-shrink-0 ml-3">\\\\n'
    '        <a href="${a}" target="_blank"\\\\n'
    '          class="text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-1.5 rounded-lg hover:bg-blue-600/30 transition flex items-center gap-1.5">\\\\n'
    '          <i class="fas fa-external-link-alt"></i> Nouvelle fen&#234;tre\\\\n'
    '        </a>\\\\n'
    '        <a href="${a}" download target="_blank"\\\\n'
    '          class="text-xs bg-green-600/20 text-green-400 border border-green-600/30 px-3 py-1.5 rounded-lg hover:bg-green-600/30 transition flex items-center gap-1.5">\\\\n'
    '          <i class="fas fa-download"></i> T&#233;l&#233;charger\\\\n'
    '        </a>\\\\n'
    '        <button onclick="closeModal()" class="text-gray-400 hover:text-white ml-2">\\\\n'
    '          <i class="fas fa-times"></i>\\\\n'
    '        </button>\\\\n'
    '      </div>\\\\n'
    '    </div>\\\\n'
    '    ${body}\\\\n'
    '  </div>`,!0)}'
)

print(f"Nouvelle openMktgViewer longueur: {len(new_fn)}")
content = content[:old_fn_start] + new_fn + content[old_fn_end:]
print("Patch 2 OK")

with open('public/static/member-app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Taille finale: {len(content)}")
print("Fichier sauvegardé")
