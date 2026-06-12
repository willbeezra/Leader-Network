// Script d'injection — carte et section BV Reset dans admin-app.js
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '../public/static/admin-app.js')
let content = fs.readFileSync(filePath, 'utf8')

// ─────────────────────────────────────────────────────────────
// 1. CARTE dans la grille _cfgShowGrid
//    On cherche la fin de la carte ccwithdrawals dans la grille
//    Le marqueur unique est : "Remboursements CC</div>    </button>  </div></div>`"
// ─────────────────────────────────────────────────────────────
const CARTE_MARKER = "Approuver ou refuser les demandes de remboursement CC</div>    </button>  </div></div>`"

const CARTE_INSERT = `Approuver ou refuser les demandes de remboursement CC</div>    </button>    <button onclick="_cfgShowSection(window._cfgEl,window._cfgData,'bvreset')" class="cfg-card group text-left bg-dark-800 border border-dark-600 hover:border-teal-500/40 rounded-2xl p-5 transition-all duration-200 hover:bg-dark-700 hover:shadow-lg hover:shadow-teal-500/10">      <div class="flex items-start justify-between mb-3">        <div class="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center"><i class="fas fa-rotate text-teal-400 text-lg"></i></div>        <span id="cfg-card-bvreset-badge" class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400">Auto</span>      </div>      <div class="font-semibold text-white text-sm mb-1 group-hover:text-teal-300 transition">Reset BV Mensuel</div>      <div class="text-xs text-gray-400">Mode auto/manuel, fuseau horaire, heure et durée du cycle</div>    </button>  </div></div>\``

if (!content.includes(CARTE_MARKER)) {
  console.error('❌ CARTE_MARKER non trouvé')
  process.exit(1)
}
content = content.replace(CARTE_MARKER, CARTE_INSERT)
console.log('✅ Carte BV Reset injectée dans la grille')

// ─────────────────────────────────────────────────────────────
// 2. Ajouter 'bvreset' dans SECTIONS de _cfgShowSection
//    Marqueur : la fin du dernier objet SECTIONS connu
// ─────────────────────────────────────────────────────────────
const SECTIONS_MARKER = `ccwithdrawals:{label:'CC — Remboursements',icon:'fa-seedling',color:'text-green-400'}};`
const SECTIONS_INSERT = `ccwithdrawals:{label:'CC — Remboursements',icon:'fa-seedling',color:'text-green-400'},bvreset:{label:'Reset BV Mensuel',icon:'fa-rotate',color:'text-teal-400'}};`

if (!content.includes(SECTIONS_MARKER)) {
  console.error('❌ SECTIONS_MARKER non trouvé')
  process.exit(1)
}
content = content.replace(SECTIONS_MARKER, SECTIONS_INSERT)
console.log('✅ Section bvreset ajoutée dans SECTIONS')

// ─────────────────────────────────────────────────────────────
// 3. Ajouter le handler dans _cfgShowSection
//    Marqueur : else if(section==='ccwithdrawals')adminCCWithdrawals(body);
// ─────────────────────────────────────────────────────────────
const HANDLER_MARKER = `else if(section==='ccwithdrawals')adminCCWithdrawals(body);else body.innerHTML`
const HANDLER_INSERT = `else if(section==='ccwithdrawals')adminCCWithdrawals(body);else if(section==='bvreset')await _cfgRender_bvreset(body);else body.innerHTML`

if (!content.includes(HANDLER_MARKER)) {
  console.error('❌ HANDLER_MARKER non trouvé')
  process.exit(1)
}
content = content.replace(HANDLER_MARKER, HANDLER_INSERT)
console.log('✅ Handler bvreset ajouté dans _cfgShowSection')

// ─────────────────────────────────────────────────────────────
// 4. Injecter la fonction _cfgRender_bvreset + saveBVResetConfig
//    avant la fermeture du fichier / après la dernière fonction _cfgRender
// ─────────────────────────────────────────────────────────────
const INJECT_AFTER = `function _cfgRender_general(el,data){`

const NEW_FUNCTIONS = `async function _cfgRender_bvreset(el){
  el.innerHTML='<div class="flex justify-center py-8"><div class="loader"></div></div>';
  try{
    const cfg=await apiAdmin('GET','/config/bv-reset');
    const lastReset=cfg.last_reset?new Date(cfg.last_reset+'Z').toLocaleString('fr-FR',{timeZone:'UTC'}):'Jamais';
    el.innerHTML=\`
    <div class="space-y-5">
      <div class="bg-dark-800 rounded-2xl border border-dark-600 p-6">
        <div class="flex justify-between items-center mb-5">
          <h3 class="font-semibold text-lg flex items-center gap-2">
            <i class="fas fa-rotate text-teal-400"></i>Reset BV Mensuel
          </h3>
          <button onclick="saveBVResetConfig()" class="bg-teal-500 text-dark-900 font-bold px-5 py-2 rounded-xl hover:bg-teal-400 transition text-sm">
            <i class="fas fa-save mr-2"></i>Sauvegarder
          </button>
        </div>

        <!-- Mode auto/manuel -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="bg-dark-700 rounded-xl p-4">
            <label class="form-label flex items-center gap-2">
              <i class="fas fa-robot text-teal-400 text-xs"></i>Mode de reset
            </label>
            <div class="flex gap-3 mt-2">
              <label class="flex items-center gap-2 cursor-pointer bg-dark-600 hover:bg-dark-500 px-4 py-2.5 rounded-xl border border-dark-500 transition">
                <input type="radio" name="bvreset-mode" id="bvreset-auto" value="true" \${cfg.auto==='true'?'checked':''} class="accent-teal-500">
                <div>
                  <div class="text-sm font-medium text-teal-300">Automatique</div>
                  <div class="text-xs text-gray-400">L'orchestrateur remet à zéro selon le cycle configuré</div>
                </div>
              </label>
              <label class="flex items-center gap-2 cursor-pointer bg-dark-600 hover:bg-dark-500 px-4 py-2.5 rounded-xl border border-dark-500 transition">
                <input type="radio" name="bvreset-mode" id="bvreset-manual" value="false" \${cfg.auto!=='true'?'checked':''} class="accent-teal-500">
                <div>
                  <div class="text-sm font-medium text-gray-300">Manuel</div>
                  <div class="text-xs text-gray-400">Déclenché uniquement par un bouton admin</div>
                </div>
              </label>
            </div>
          </div>

          <div class="bg-dark-700 rounded-xl p-4">
            <label class="form-label flex items-center gap-2">
              <i class="fas fa-clock text-teal-400 text-xs"></i>Heure du reset (0–23)
            </label>
            <input id="bvreset-hour" type="number" min="0" max="23" value="\${cfg.hour}" class="form-input mt-2" placeholder="0 = minuit">
            <p class="text-xs text-gray-500 mt-1">Heure locale dans le fuseau configuré</p>
          </div>

          <div class="bg-dark-700 rounded-xl p-4">
            <label class="form-label flex items-center gap-2">
              <i class="fas fa-globe text-teal-400 text-xs"></i>Fuseau horaire
            </label>
            <input id="bvreset-tz" type="text" value="\${cfg.timezone}" class="form-input mt-2" placeholder="Indian/Mauritius">
            <p class="text-xs text-gray-500 mt-1">Exemples : Indian/Mauritius · UTC · America/New_York · Europe/Paris</p>
          </div>

          <div class="bg-dark-700 rounded-xl p-4">
            <label class="form-label flex items-center gap-2">
              <i class="fas fa-calendar-days text-teal-400 text-xs"></i>Durée du cycle BV (jours)
            </label>
            <input id="bvreset-cycle" type="number" min="1" max="365" value="\${cfg.cycle_days}" class="form-input mt-2" placeholder="30">
            <p class="text-xs text-gray-500 mt-1">30 = mois standard · 37 = jusqu'au 7 du mois suivant</p>
          </div>
        </div>

        <!-- Infos dernier reset + bouton manuel -->
        <div class="mt-5 pt-5 border-t border-dark-600 flex items-center justify-between flex-wrap gap-3">
          <div class="text-xs text-gray-400">
            <i class="fas fa-history mr-1 text-gray-500"></i>
            Dernier reset : <span class="text-white font-medium">\${lastReset}</span>
          </div>
          <button onclick="triggerManualBVReset()" class="flex items-center gap-2 bg-red-600/20 text-red-400 border border-red-500/30 font-semibold px-4 py-2 rounded-xl hover:bg-red-600/30 transition text-sm">
            <i class="fas fa-bolt"></i>Déclencher reset maintenant
          </button>
        </div>
      </div>

      <!-- Aide -->
      <div class="bg-dark-800 rounded-xl border border-dark-600 p-4">
        <div class="text-xs text-gray-400 space-y-1">
          <p><i class="fas fa-info-circle text-teal-400 mr-1"></i><strong class="text-gray-300">Comment ça fonctionne :</strong> en mode automatique, l'orchestrateur (qui tourne toutes les heures) vérifie si l'heure locale correspond à l'heure configurée ET si le nombre de jours depuis le dernier reset est ≥ au cycle configuré. Si oui, il remet tous les BV mensuels à zéro.</p>
          <p class="mt-1"><i class="fas fa-triangle-exclamation text-amber-400 mr-1"></i><strong class="text-amber-300">Attention :</strong> le bouton "Déclencher reset maintenant" remet à zéro immédiatement, indépendamment du cycle. À utiliser uniquement en cas de correction manuelle.</p>
        </div>
      </div>
    </div>\`;
  }catch(e){el.innerHTML=\`<p class="text-red-400 p-4">Erreur: \${e.error||e.message}</p>\`;}
}

async function saveBVResetConfig(){
  try{
    const auto=document.getElementById('bvreset-auto')?.checked;
    const hour=parseInt(document.getElementById('bvreset-hour')?.value||'0');
    const timezone=document.getElementById('bvreset-tz')?.value?.trim()||'Indian/Mauritius';
    const cycle_days=parseInt(document.getElementById('bvreset-cycle')?.value||'30');
    if(isNaN(hour)||hour<0||hour>23)return showToast('Heure invalide (0-23)','error');
    if(isNaN(cycle_days)||cycle_days<1)return showToast('Durée invalide (min 1 jour)','error');
    if(!timezone)return showToast('Fuseau horaire requis','error');
    await apiAdmin('PUT','/config/bv-reset',{auto,hour,timezone,cycle_days});
    showToast('Configuration reset BV sauvegardée');
    // Mettre à jour le badge de la carte
    const badge=document.getElementById('cfg-card-bvreset-badge');
    if(badge){badge.textContent=auto?'Auto':'Manuel';badge.className='text-[10px] font-semibold px-2 py-0.5 rounded-full '+(auto?'bg-teal-500/20 text-teal-400':'bg-gray-700 text-gray-400');}
  }catch(e){showToast(e.error||'Erreur sauvegarde','error');}
}

async function triggerManualBVReset(){
  if(!confirm('Remettre tous les BV mensuels à zéro maintenant ?\\nCette action est irréversible.'))return;
  try{
    await apiAdmin('POST','/reset-monthly-bv');
    showToast('BV mensuels remis à zéro avec succès');
    // Recharger la section pour afficher la nouvelle date
    const body=document.getElementById('cfg-section-body');
    if(body)await _cfgRender_bvreset(body);
  }catch(e){showToast(e.error||'Erreur reset BV','error');}
}

function _cfgRender_general(el,data){`

if (!content.includes(INJECT_AFTER)) {
  console.error('❌ INJECT_AFTER non trouvé')
  process.exit(1)
}
content = content.replace(INJECT_AFTER, NEW_FUNCTIONS)
console.log('✅ Fonctions _cfgRender_bvreset, saveBVResetConfig, triggerManualBVReset injectées')

fs.writeFileSync(filePath, content, 'utf8')
console.log('✅ Fichier admin-app.js mis à jour')
