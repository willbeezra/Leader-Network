#!/usr/bin/env python3
"""
Patch member-app.js:
1. Remplace openMktgViewer() par une version adaptative (PDF/image/video/link)
   - is_downloadable contrôle le bouton Télécharger
   - lien type "link" s'ouvre dans nouvel onglet directement
2. Remplace les boutons dans mktgMemberCard():
   - Bouton "Consulter" universel pour TOUS les types
   - Bouton "Télécharger" conditionnel sur is_downloadable
"""

with open('public/static/member-app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# =========================================================
# REMPLACEMENT 1 : openMktgViewer  (id, urlEnc, type, titleEnc, dlAllowed)
# Ancienne signature : openMktgViewer(e,t,n)
# Nouvelle signature : openMktgViewer(e,t,tp,n,dl)
# =========================================================

OLD_VIEWER = r"""function openMktgViewer(e,t,n){trackMktgView(e);const a=decodeURIComponent(t);showModal(`\n  <div class="flex flex-col" style="height:85vh;min-width:min(90vw,900px);">\n    <div class="flex items-center justify-between px-5 py-3 border-b border-dark-600 bg-dark-800 flex-shrink-0">\n      <div class="flex items-center gap-2 min-w-0">\n        <i class="fas fa-file-pdf text-red-400 flex-shrink-0"></i>\n        <span class="font-semibold text-white text-sm truncate">${decodeURIComponent(n)}</span>\n      </div>\n      <div class="flex items-center gap-2 flex-shrink-0 ml-3">\n        <a href="${a}" target="_blank"\n          class="text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-1.5 rounded-lg hover:bg-blue-600/30 transition flex items-center gap-1.5">\n          <i class="fas fa-external-link-alt"></i> Nouvelle fenêtre\n        </a>\n        <a href="${a}" download target="_blank"\n          class="text-xs bg-green-600/20 text-green-400 border border-green-600/30 px-3 py-1.5 rounded-lg hover:bg-green-600/30 transition flex items-center gap-1.5">\n          <i class="fas fa-download"></i> Télécharger\n        </a>\n        <button onclick="closeModal()" class="text-gray-400 hover:text-white ml-2">\n          <i class="fas fa-times"></i>\n        </button>\n      </div>\n    </div>\n    <div class="flex-1 bg-gray-900 relative">\n      <iframe src="https://docs.google.com/gview?url=${encodeURIComponent(a)}&embedded=true" class="w-full h-full border-0" allowfullscreen\n        onerror="this.style.display=\'none\'; document.getElementById(\'pdf-fallback\').style.display=\'flex\'">\n      </iframe>\n      <div id="pdf-fallback" class="hidden absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-400">\n        <i class="fas fa-file-pdf text-red-400 text-4xl"></i>\n        <p class="text-sm">Impossible d\'afficher le PDF dans la fenêtre.</p>\n        <a href="${a}" target="_blank"\n          class="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-500 transition flex items-center gap-2">\n          <i class="fas fa-external-link-alt"></i> Ouvrir dans un nouvel onglet\n        </a>\n      </div>\n    </div>\n  </div>`,!0)}"""

NEW_VIEWER = r"""function openMktgViewer(e,t,tp,n,dl){trackMktgView(e);const a=decodeURIComponent(t),title=decodeURIComponent(n),dlOk=dl==='1'||dl===true||dl===1;const typeMeta={pdf:{icon:'fa-file-pdf',color:'text-red-400'},image:{icon:'fa-image',color:'text-blue-400'},video:{icon:'fa-video',color:'text-purple-400'},link:{icon:'fa-link',color:'text-green-400'},doc:{icon:'fa-file-word',color:'text-orange-400'},audio:{icon:'fa-music',color:'text-yellow-400'},zip:{icon:'fa-file-archive',color:'text-gray-400'}};const tm=typeMeta[tp]||typeMeta.link;if(tp==='link'){window.open(a,'_blank');return;}const dlBtn=dlOk?`<a href="${a}" download target="_blank" class="text-xs bg-green-600/20 text-green-400 border border-green-600/30 px-3 py-1.5 rounded-lg hover:bg-green-600/30 transition flex items-center gap-1.5"><i class="fas fa-download"></i> Télécharger</a>`:'';let body='';if(tp==='pdf'||tp==='doc'){body=`<iframe src="https://docs.google.com/gview?url=${encodeURIComponent(a)}&embedded=true" class="w-full h-full border-0" allowfullscreen onerror="this.style.display='none';document.getElementById('doc-fallback').style.display='flex'"></iframe><div id="doc-fallback" class="hidden absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-400"><i class="fas ${tm.icon} ${tm.color} text-4xl"></i><p class="text-sm">Impossible d'afficher ce fichier dans la fenêtre.</p><a href="${a}" target="_blank" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-500 transition flex items-center gap-2"><i class="fas fa-external-link-alt"></i> Ouvrir dans un nouvel onglet</a></div>`;}else if(tp==='image'){body=`<div class="w-full h-full flex items-center justify-center p-4 bg-gray-950"><img src="${a}" alt="${title}" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onerror="this.outerHTML='<div class=text-gray-400 text-center><i class=\\'fas fa-image text-4xl mb-3\\'></i><p>Image non disponible</p></div>'"></div>`;}else if(tp==='video'){body=`<div class="w-full h-full flex items-center justify-center bg-black"><video src="${a}" controls autoplay class="max-w-full max-h-full" controlslist="${dlOk?'':'nodownload'}" oncontextmenu="return false;">Votre navigateur ne supporte pas la lecture vidéo.</video></div>`;}else if(tp==='audio'){body=`<div class="w-full h-full flex flex-col items-center justify-center gap-6 p-8 bg-gray-950"><div class="w-20 h-20 rounded-2xl bg-yellow-900/30 border border-yellow-600/20 flex items-center justify-center"><i class="fas fa-music text-yellow-400 text-3xl"></i></div><p class="text-white font-semibold text-center">${title}</p><audio src="${a}" controls class="w-full max-w-md" controlslist="${dlOk?'':'nodownload'}" oncontextmenu="return false;"></audio></div>`;}else{body=`<div class="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-400 p-8"><i class="fas ${tm.icon} ${tm.color} text-5xl"></i><p class="text-lg font-semibold text-white">${title}</p><p class="text-sm">Aperçu non disponible pour ce type de fichier.</p><a href="${a}" target="_blank" class="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm hover:bg-blue-500 transition flex items-center gap-2"><i class="fas fa-external-link-alt"></i> Ouvrir dans un nouvel onglet</a></div>`;}showModal(`\n  <div class="flex flex-col" style="height:85vh;min-width:min(90vw,900px);">\n    <div class="flex items-center justify-between px-5 py-3 border-b border-dark-600 bg-dark-800 flex-shrink-0">\n      <div class="flex items-center gap-2 min-w-0">\n        <i class="fas ${tm.icon} ${tm.color} flex-shrink-0"></i>\n        <span class="font-semibold text-white text-sm truncate">${title}</span>\n      </div>\n      <div class="flex items-center gap-2 flex-shrink-0 ml-3">\n        <a href="${a}" target="_blank" class="text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-1.5 rounded-lg hover:bg-blue-600/30 transition flex items-center gap-1.5">\n          <i class="fas fa-external-link-alt"></i> Nouvelle fenêtre\n        </a>\n        ${dlBtn}\n        <button onclick="closeModal()" class="text-gray-400 hover:text-white ml-2"><i class="fas fa-times"></i></button>\n      </div>\n    </div>\n    <div class="flex-1 relative overflow-hidden">${body}</div>\n  </div>`,!0)}"""

# =========================================================
# REMPLACEMENT 2 : boutons dans mktgMemberCard
# Remplace le bloc des boutons (section <!-- Boutons -->) 
# =========================================================

OLD_BUTTONS = r"""      <!-- Boutons -->\n      <div class="mt-auto flex gap-2">\n        ${"pdf"===e.type||e.url.includes(".pdf")?`\n        <button onclick="openMktgViewer(\\'${e.id}\\',\\'${encodeURIComponent(e.url)}\\',\\'${encodeURIComponent(e.title)}\\')"\\n          class="flex-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-2 rounded-xl hover:bg-blue-600/30 transition flex items-center justify-center gap-1.5 font-medium">\\n          <i class="fas fa-eye"></i> Consulter\\n        </button>`:`\\n        <a href="${e.url}" target="_blank" onclick="trackMktgView(\\'${e.id}\\')"\n          class="flex-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-2 rounded-xl hover:bg-blue-600/30 transition flex items-center justify-center gap-1.5 font-medium">\n          <i class="fas fa-external-link-alt"></i> Ouvrir\n        </a>`}\n        ${e.is_downloadable?`\n        <a href="${e.url}" download target="_blank"\n          class="text-xs bg-green-600/20 text-green-400 border border-green-600/30 px-3 py-2 rounded-xl hover:bg-green-600/30 transition flex items-center justify-center gap-1.5"\n          title="Télécharger">\n          <i class="fas fa-download"></i>\n        </a>`:""}\n      </div>"""

NEW_BUTTONS = r"""      <!-- Boutons -->\n      <div class="mt-auto flex gap-2">\n        <button onclick="openMktgViewer(\\'${e.id}\\',\\'${encodeURIComponent(e.url)}\\',\\'${e.type||(\\'link\\')}\\',\\'${encodeURIComponent(e.title)}\\',\\'${e.is_downloadable?1:0}\\')"\n          class="flex-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-2 rounded-xl hover:bg-blue-600/30 transition flex items-center justify-center gap-1.5 font-medium">\n          ${"link"===e.type?\'<i class="fas fa-external-link-alt"></i> Ouvrir\':\'<i class="fas fa-eye"></i> Consulter\'}\n        </button>\n        ${e.is_downloadable?`\n        <a href="${e.url}" download target="_blank"\n          class="text-xs bg-green-600/20 text-green-400 border border-green-600/30 px-3 py-2 rounded-xl hover:bg-green-600/30 transition flex items-center justify-center gap-1.5"\n          title="Télécharger">\n          <i class="fas fa-download"></i>\n        </a>`:""}      </div>"""

# Vérification présence
print("OLD_VIEWER found:", OLD_VIEWER in content)
print("OLD_BUTTONS found:", OLD_BUTTONS in content)

if OLD_VIEWER not in content:
    print("ERROR: OLD_VIEWER introuvable")
    exit(1)

if OLD_BUTTONS not in content:
    print("ERROR: OLD_BUTTONS introuvable, cherchons fragments...")
    # Debug: chercher un fragment du bouton actuel
    frag = r'<button onclick="openMktgViewer'
    idx = content.find(frag)
    print(f"Fragment '{frag}' à position:", idx)
    if idx >= 0:
        print("Contexte:", repr(content[idx-50:idx+200]))
    exit(1)

# Effectuer les remplacements
content = content.replace(OLD_VIEWER, NEW_VIEWER, 1)
content = content.replace(OLD_BUTTONS, NEW_BUTTONS, 1)

with open('public/static/member-app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: Patch appliqué")
