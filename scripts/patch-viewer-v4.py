#!/usr/bin/env python3
"""
Patch v4 : openMktgViewer — iframe direct pour PDF (pas Google Docs Viewer)
Les navigateurs modernes affichent les PDFs nativement dans un iframe.
Google Docs Viewer est gardé uniquement pour .doc/.docx/.pptx/.xlsx
"""

with open('public/static/member-app.js', 'r', encoding='utf-8') as f:
    content = f.read()

START = content.find('function openMktgViewer(e,t,n)')
END   = content.find('function copyReferralLink', START)
assert START > 0 and END > START

old_fn = content[START:END]
print(f"Ancien: {len(old_fn)} chars")

new_fn = """function openMktgViewer(e,t,n){
trackMktgView(e);
var a=decodeURIComponent(t);
var title=decodeURIComponent(n);
var u=a.toLowerCase();
var isImg=/\\.(jpe?g|png|gif|webp|svg|bmp)(\\?|#|$)/.test(u);
var isVid=/\\.(mp4|webm|mov|avi|m4v)(\\?|#|$)/.test(u);
var isAud=/\\.(mp3|wav|aac|flac|m4a|oga)(\\?|#|$)/.test(u);
var isDoc=/\\.(docx?|pptx?|xlsx?)( \\?|#|$)/.test(u);
var icon=isImg?'fa-image':isVid?'fa-video':isAud?'fa-music':isDoc?'fa-file-word':'fa-file-pdf';
var icol=isImg?'text-blue-400':isVid?'text-purple-400':isAud?'text-yellow-400':isDoc?'text-orange-400':'text-red-400';
var body;
if(isImg){
  body='<div class="flex-1 bg-gray-900 flex items-center justify-center p-4 overflow-auto">'
      +'<img src="'+a+'" alt="'+title+'" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl">'
      +'</div>';
}else if(isVid){
  body='<div class="flex-1 bg-black flex items-center justify-center">'
      +'<video src="'+a+'" controls class="max-w-full" style="max-height:calc(85vh - 56px)"></video>'
      +'</div>';
}else if(isAud){
  body='<div class="flex-1 bg-gray-900 flex flex-col items-center justify-center gap-6 p-8">'
      +'<div class="w-20 h-20 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">'
      +'<i class="fas fa-music text-yellow-400 text-3xl"></i></div>'
      +'<p class="font-semibold text-white text-center">'+title+'</p>'
      +'<audio src="'+a+'" controls class="w-full max-w-md"></audio>'
      +'</div>';
}else if(isDoc){
  body='<div class="flex-1 bg-gray-900 relative">'
      +'<iframe src="https://docs.google.com/gview?url='+encodeURIComponent(a)+'&embedded=true"'
      +' class="w-full h-full border-0" allowfullscreen></iframe>'
      +'</div>';
}else{
  /* PDF et tout autre type : iframe direct (navigateurs modernes affichent PDF nativement) */
  body='<div class="flex-1 bg-gray-900 relative flex flex-col">'
      +'<iframe src="'+a+'" class="w-full h-full border-0 flex-1" style="min-height:0"></iframe>'
      +'</div>';
}
var html='<div class="flex flex-col" style="height:85vh;min-width:min(90vw,900px);">'
  +'<div class="flex items-center justify-between px-5 py-3 border-b border-dark-600 bg-dark-800 flex-shrink-0">'
    +'<div class="flex items-center gap-2 min-w-0">'
      +'<i class="fas '+icon+' '+icol+' flex-shrink-0"></i>'
      +'<span class="font-semibold text-white text-sm truncate">'+title+'</span>'
    +'</div>'
    +'<div class="flex items-center gap-2 flex-shrink-0 ml-3">'
      +'<a href="'+a+'" target="_blank" class="text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-1.5 rounded-lg hover:bg-blue-600/30 transition flex items-center gap-1.5">'
        +'<i class="fas fa-external-link-alt"></i> Nouvelle fen&#234;tre'
      +'</a>'
      +'<a href="'+a+'" download target="_blank" class="text-xs bg-green-600/20 text-green-400 border border-green-600/30 px-3 py-1.5 rounded-lg hover:bg-green-600/30 transition flex items-center gap-1.5">'
        +'<i class="fas fa-download"></i> T&#233;l&#233;charger'
      +'</a>'
      +'<button onclick="closeModal()" class="text-gray-400 hover:text-white ml-2"><i class="fas fa-times"></i></button>'
    +'</div>'
  +'</div>'
  +body
+'</div>';
showModal(html,!0);}
"""

new_fn_oneline = new_fn.replace('\n', '').replace('  ', ' ').replace('  ', ' ').replace('  ', ' ')

print(f"Nouveau: {len(new_fn_oneline)} chars")

content = content[:START] + new_fn_oneline + content[END:]

with open('public/static/member-app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fichier sauvegardé.")
