const API="";async function openWalletDetail(type){const labels={principal:"Portefeuille Principal",pending:"Wallet en Attente",cc:"Crédit de Croissance",rs:"Réserve Stratégique",luxia:"Wallet Luxia"};let modal=document.getElementById("wallet-detail-modal");if(!modal){modal=document.createElement("div");modal.id="wallet-detail-modal";modal.className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4";modal.innerHTML=`<div class="absolute inset-0 bg-black/70 backdrop-blur-sm" onclick="document.getElementById('wallet-detail-modal').remove()"></div><div class="relative bg-dark-800 border border-dark-600 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col"><div class="flex items-center justify-between p-4 border-b border-dark-600"><h3 id="wdm-title" class="font-bold text-white text-lg"></h3><button onclick="document.getElementById('wallet-detail-modal').remove()" class="text-gray-500 hover:text-white text-xl leading-none">&times;</button></div><div id="wdm-body" class="overflow-y-auto flex-1 p-4"></div></div>`;document.body.appendChild(modal);}document.getElementById("wdm-title").textContent=labels[type]||type;const body=document.getElementById("wdm-body");body.innerHTML='<div class="flex justify-center py-8"><div class="loader"></div></div>';try{const r=await api("GET",`/members/wallet-history?type=${type}&per_page=50`);const rows=r.transactions||[];if(!rows.length){body.innerHTML='<p class="text-gray-500 text-center py-8">Aucune transaction pour ce wallet.</p>';return;}const fmtD=d=>d?new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}):"—";
const LABELS={"prime_leadership":"Prime de Leadership","bonus_influence":"Bonus d'Influence","bonus_rayonnement":"Bonus de Rayonnement","valorisation_recommandation":"Valorisation Recommandation","fast_start":"Fast Start Bonus","credit_croissance":"Crédit de Croissance","reserve_strategique":"Réserve Stratégique"};if(type==="pending"){body.innerHTML=`<div class="space-y-3">${rows.map(e=>{const remaining=Math.max(0,(e.total_amount||0)-(e.amount_per_day||0)*(e.days_paid||0));const daysLeft=Math.max(0,(e.days_in_month||0)-(e.days_paid||0));const progress=e.days_in_month>0?Math.round((e.days_paid/e.days_in_month)*100):0;const baseLabel=LABELS[e.commission_type]||e.commission_type;const rankForLabel=e.commission_type==="prime_leadership"?(e.commission_rank||e.source_rank||null):null;const typeLabel=rankForLabel?`${baseLabel} ${rankForLabel}`:baseLabel;const rankLabels={"none":"—","administrator":"Administrator","manager":"Manager","captain":"Captain","leader":"Leader","mentor":"Mentor","superviseur":"Superviseur","executive":"Executive","president":"President","director":"Director","boss":"Boss","visionary":"Visionary"};const sourceHtml=e.source_name?`<span class="text-gray-300"> · ${e.source_name}</span> <span class="text-gray-500 text-xs">${e.source_unique_id||""}</span>`:"";const releaseHtml=e.status==="pending_release"?`<span class="text-yellow-400">Libération le ${fmtD(e.eligible_date)}</span>`:e.status==="active"?`<span class="text-green-400">${daysLeft}j restants · ${(e.amount_per_day||0).toFixed(2)}$/j</span>`:`<span class="text-gray-400">Libéré</span>`;return`<div class="bg-dark-700 rounded-xl p-3"><div class="flex justify-between items-start mb-1"><div class="text-sm font-medium text-white">${typeLabel}${sourceHtml}</div><div class="text-orange-300 font-bold ml-3 flex-shrink-0">${fmt$(remaining)}</div></div><div class="text-xs mb-2">${releaseHtml} · Période ${e.period||"—"}</div><div class="h-1.5 bg-dark-600 rounded-full"><div class="h-1.5 bg-orange-500/60 rounded-full" style="width:${progress}%"></div></div><div class="flex justify-between text-xs text-gray-600 mt-1"><span>${e.days_paid||0}j versés</span><span>${daysLeft}j restants</span></div></div>`}).join("")}</div>`;}else{const fmtA=v=>v===undefined||v===null?"—":(v<0?`<span class="text-red-400">-$${Math.abs(v).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`:`<span class="text-green-400">+$${v.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`);body.innerHTML=`<div class="space-y-2">${rows.map(tx=>`<div class="flex items-center justify-between py-2 border-b border-dark-700"><div class="flex-1 min-w-0"><div class="text-sm text-white truncate">${tx.type_label||tx.label||tx.description||tx.transaction_type||"Transaction"}</div><div class="text-xs text-gray-500">${fmtD(tx.created_at)}</div></div><div class="text-right ml-3">${fmtA(tx.amount)}</div></div>`).join("")}</div>`;}}catch(e){body.innerHTML=`<p class="text-red-400 text-center py-8">Erreur : ${e.message||e.error||"inconnue"}</p>`;
}}const WALLET_COMMISSION_LABELS={"binary":"Commission Binaire","fast_start":"Fast Start","fast_start_contribution":"Contribution Fast Start","unilevel":"Unilevel","rayonnement":"Rayonnement","prime_leadership":"Prime Leadership","credit_croissance":"Crédit de Croissance","reserve_strategique":"Réserve Stratégique","dreamiles":"Dreamiles Luxia","matching":"Matching Bonus","rank_bonus":"Bonus de Rang","admin_fee":"Frais Admin","manual":"Ajustement manuel"};let memberToken=window.__IMPERSONATE_TOKEN__||localStorage.getItem("leader_member_token"),currentMember=null,currentPage="dashboard";function api(e,t,n){return axios({method:e,url:`/api${t}`,data:n,headers:memberToken?{Authorization:`Bearer ${memberToken}`}:{}}).then(e=>e.data).catch(e=>{throw e.response?.data||{error:e.message}})}function fmt$(e){return"$"+Number(e||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}function fmtBV(e){return Number(e||0).toLocaleString("en-US",{maximumFractionDigits:0})+" BV"}function fmtPrice(v){v=Number(v||0);return Number.isInteger(v)?String(v):v.toFixed(2)}function fmtDate(e){return e?new Date(e).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}):"—"}function fmtDatetime(e){return e?new Date(e).toLocaleString("fr-FR",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—"}function showToast(e,t="success"){const n=document.getElementById("toast"),a=document.getElementById("toast-inner");a.textContent=e,a.className="px-6 py-3 rounded-xl shadow-lg text-sm font-medium "+("success"===t?"bg-green-600 text-white":"bg-red-600 text-white"),n.classList.remove("hidden"),n.classList.add("show"),setTimeout(()=>{n.classList.add("hidden"),n.classList.remove("show")},3500)}function renderPagination(containerId,total,page,perPage,onPageChange,onPerPageChange){var totalPages=Math.ceil(total/perPage);
var el=document.getElementById(containerId);if(!el)return;if(total===0){el.innerHTML='';return;}var cid=containerId;window['_cbPg_'+cid]=typeof onPageChange==='function'?onPageChange:new Function('p',onPageChange.replace(/^\s*\(function\s*\([^)]*\)\s*\{/,'').replace(/\}\s*\)\s*$/,'').replace(/^\s*p\s*=>\s*/,''));window['_cbPp_'+cid]=typeof onPerPageChange==='function'?onPerPageChange:new Function('pp','p',onPerPageChange.replace(/^\s*\(function\s*\([^)]*\)\s*\{/,'').replace(/\}\s*\)\s*$/,''));window['_pg_'+cid]=function(p){window['_cbPg_'+cid](p);};window['_pp_'+cid]=function(pp,p){window['_cbPp_'+cid](pp,p);};var k='_pg_'+cid;var kp='_pp_'+cid;var selectHtml='<select class="pagination-perpage" onchange="window[this.dataset.kp](parseInt(this.value),1)" data-kp="'+kp+'">'+'<option value="10"'+(perPage===10?' selected':'')+'>10 / page</option>'+'<option value="25"'+(perPage===25?' selected':'')+'>25 / page</option>'+'<option value="50"'+(perPage===50?' selected':'')+'>50 / page</option>'+'</select>';var info='<span class="text-xs text-gray-400">'+((page-1)*perPage+1)+'-'+Math.min(page*perPage,total)+' sur '+total+'</span>';var buttons='';var WINDOW=2;var start=Math.max(1,page-WINDOW);var end=Math.min(totalPages,page+WINDOW);if(start>1){buttons+='<button class="pagination-btn" onclick="window[this.dataset.k](1)" data-k="'+k+'">1</button>';if(start>2)buttons+='<span class="pagination-ellipsis">…</span>';}for(var p=start;p<=end;p++){var active=p===page?'pagination-btn active':'pagination-btn';
buttons+='<button class="'+active+'" onclick="window[this.dataset.k]('+p+')" data-k="'+k+'">'+p+'</button>';}if(end<totalPages){if(end<totalPages-1)buttons+='<span class="pagination-ellipsis">…</span>';buttons+='<button class="pagination-btn" onclick="window[this.dataset.k]('+totalPages+')" data-k="'+k+'">'+totalPages+'</button>';}var prevBtn='<button class="pagination-btn"'+(page<=1?' disabled':'')+' onclick="if('+page+'>1)window[this.dataset.k]('+(page-1)+')" data-k="'+k+'">&#8592;</button>';var nextBtn='<button class="pagination-btn"'+(page>=totalPages?' disabled':'')+' onclick="if('+page+'<'+totalPages+')window[this.dataset.k]('+(page+1)+')" data-k="'+k+'">&#8594;</button>';el.innerHTML='<div class="pagination-bar">'+info+selectHtml+'<div class="pagination-pages">'+prevBtn+buttons+nextBtn+'</div></div>';}function rankBadge(e){const t=(e||"none").toLowerCase().replace(" ","");return`<span class="rank-${t} text-xs px-2 py-0.5 rounded-full font-medium">${{none:"—",administrator:"Administrator",manager:"Manager",captain:"Captain",leader:"Leader",mentor:"Mentor",superviseur:"Superviseur",executive:"Executive",president:"President",director:"Director",boss:"Boss",visionary:"Visionary"}[t]||e}</span>`}function statusBadge(e){return`<span class="${{AMI:"status-ami",Partenaire:"status-partner",Client:"status-client",Membre:"status-member"}[e]||"status-member"} text-xs px-2 py-0.5 rounded-full font-medium">${e}</span>`}function commTypeFr(e){return{prime_leadership:"Prime Leadership",bonus_influence:"Bonus Influence",bonus_rayonnement:"Bonus Rayonnement",valorisation_recommandation:"Val. Recommandation",fast_start:"Fast Start",credit_croissance:"Crédit Croissance",reserve_strategique:"Réserve Stratégique"}[e]||e}const DREAMILES_LOGO_SM='<svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">\n  <circle cx="16" cy="16" r="16" fill="#EAB308" opacity="0.15"/>\n  <text x="16" y="22" font-family="Georgia,serif" font-size="18" font-weight="bold"\n        fill="#EAB308" text-anchor="middle" dominant-baseline="auto">D</text>\n</svg>';
function loading(e){document.getElementById(e).innerHTML='<div class="flex items-center justify-center py-16"><div class="loader"></div></div>'}function showModal(e,t=!1){const n=document.getElementById("member-modal-overlay"),a=document.getElementById("member-modal-content");n&&a&&(a.className=`bg-dark-800 rounded-2xl shadow-2xl border border-dark-600 w-full ${t?"max-w-4xl":"max-w-lg"} max-h-[92vh] overflow-y-auto relative`,a.innerHTML=e,n.classList.remove("hidden"),n.onclick=e=>{e.target===n&&closeModal()})}function closeModal(){const e=document.getElementById("member-modal-overlay");e&&e.classList.add("hidden")}function showLogin(){document.getElementById("login-form").classList.remove("hidden"),document.getElementById("register-form").classList.add("hidden"),document.getElementById("pin-confirmation").classList.add("hidden")}function showRegister(){document.getElementById("register-form").classList.remove("hidden"),document.getElementById("login-form").classList.add("hidden"),document.getElementById("pin-confirmation").classList.add("hidden")}// ══════════════════════════════════════════════════════════════
// INSCRIPTION MULTI-ÉTAPES — gestion navigation + pays
// ══════════════════════════════════════════════════════════════
const REG_COUNTRIES = [
  {code:'AF',name:'Afghanistan',flag:'🇦🇫'},{code:'ZA',name:'Afrique du Sud',flag:'🇿🇦'},{code:'AL',name:'Albanie',flag:'🇦🇱'},
  {code:'DZ',name:'Algérie',flag:'🇩🇿'},{code:'DE',name:'Allemagne',flag:'🇩🇪'},{code:'AD',name:'Andorre',flag:'🇦🇩'},
  {code:'AO',name:'Angola',flag:'🇦🇴'},{code:'AI',name:'Anguilla',flag:'🇦🇮'},{code:'AG',name:'Antigua-et-Barbuda',flag:'🇦🇬'},
  {code:'SA',name:'Arabie Saoudite',flag:'🇸🇦'},{code:'AR',name:'Argentine',flag:'🇦🇷'},{code:'AM',name:'Arménie',flag:'🇦🇲'},
  {code:'AW',name:'Aruba',flag:'🇦🇼'},{code:'AU',name:'Australie',flag:'🇦🇺'},{code:'AT',name:'Autriche',flag:'🇦🇹'},
  {code:'AZ',name:'Azerbaïdjan',flag:'🇦🇿'},{code:'BS',name:'Bahamas',flag:'🇧🇸'},{code:'BH',name:'Bahreïn',flag:'🇧🇭'},
  {code:'BD',name:'Bangladesh',flag:'🇧🇩'},{code:'BB',name:'Barbade',flag:'🇧🇧'},{code:'BE',name:'Belgique',flag:'🇧🇪'},
  {code:'BZ',name:'Belize',flag:'🇧🇿'},{code:'BJ',name:'Bénin',flag:'🇧🇯'},{code:'BM',name:'Bermudes',flag:'🇧🇲'},
  {code:'BT',name:'Bhoutan',flag:'🇧🇹'},{code:'BY',name:'Biélorussie',flag:'🇧🇾'},{code:'BO',name:'Bolivie',flag:'🇧🇴'},
  {code:'BA',name:'Bosnie-Herzégovine',flag:'🇧🇦'},{code:'BW',name:'Botswana',flag:'🇧🇼'},{code:'BR',name:'Brésil',flag:'🇧🇷'},
  {code:'BN',name:'Brunei',flag:'🇧🇳'},{code:'BG',name:'Bulgarie',flag:'🇧🇬'},{code:'BF',name:'Burkina Faso',flag:'🇧🇫'},
  {code:'BI',name:'Burundi',flag:'🇧🇮'},{code:'KY',name:'Caïmans (Îles)',flag:'🇰🇾'},{code:'KH',name:'Cambodge',flag:'🇰🇭'},
  {code:'CM',name:'Cameroun',flag:'🇨🇲'},{code:'CA',name:'Canada',flag:'🇨🇦'},{code:'CV',name:'Cap-Vert',flag:'🇨🇻'},
  {code:'CF',name:'Centrafrique',flag:'🇨🇫'},{code:'CL',name:'Chili',flag:'🇨🇱'},{code:'CN',name:'Chine',flag:'🇨🇳'},
  {code:'CY',name:'Chypre',flag:'🇨🇾'},{code:'CC',name:'Cocos (Îles)',flag:'🇨🇨'},{code:'CO',name:'Colombie',flag:'🇨🇴'},
  {code:'KM',name:'Comores',flag:'🇰🇲'},{code:'CG',name:'Congo',flag:'🇨🇬'},{code:'CD',name:'Congo (RDC)',flag:'🇨🇩'},
  {code:'CK',name:'Cook (Îles)',flag:'🇨🇰'},{code:'KP',name:'Corée du Nord',flag:'🇰🇵'},{code:'KR',name:'Corée du Sud',flag:'🇰🇷'},
  {code:'CR',name:'Costa Rica',flag:'🇨🇷'},{code:'CI',name:'Côte d\'Ivoire',flag:'🇨🇮'},{code:'HR',name:'Croatie',flag:'🇭🇷'},
  {code:'CU',name:'Cuba',flag:'🇨🇺'},{code:'CW',name:'Curaçao',flag:'🇨🇼'},{code:'DK',name:'Danemark',flag:'🇩🇰'},
  {code:'DJ',name:'Djibouti',flag:'🇩🇯'},{code:'DM',name:'Dominique',flag:'🇩🇲'},{code:'EG',name:'Égypte',flag:'🇪🇬'},
  {code:'AE',name:'Émirats arabes unis',flag:'🇦🇪'},{code:'EC',name:'Équateur',flag:'🇪🇨'},{code:'ER',name:'Érythrée',flag:'🇪🇷'},
  {code:'ES',name:'Espagne',flag:'🇪🇸'},{code:'EE',name:'Estonie',flag:'🇪🇪'},{code:'SZ',name:'Eswatini',flag:'🇸🇿'},
  {code:'US',name:'États-Unis',flag:'🇺🇸'},{code:'ET',name:'Éthiopie',flag:'🇪🇹'},{code:'FK',name:'Falkland (Îles)',flag:'🇫🇰'},
  {code:'FO',name:'Féroé (Îles)',flag:'🇫🇴'},{code:'FJ',name:'Fidji',flag:'🇫🇯'},{code:'FI',name:'Finlande',flag:'🇫🇮'},
  {code:'FR',name:'France',flag:'🇫🇷'},{code:'GA',name:'Gabon',flag:'🇬🇦'},{code:'GM',name:'Gambie',flag:'🇬🇲'},
  {code:'GE',name:'Géorgie',flag:'🇬🇪'},{code:'GH',name:'Ghana',flag:'🇬🇭'},{code:'GI',name:'Gibraltar',flag:'🇬🇮'},
  {code:'GR',name:'Grèce',flag:'🇬🇷'},{code:'GD',name:'Grenade',flag:'🇬🇩'},{code:'GL',name:'Groenland',flag:'🇬🇱'},
  {code:'GP',name:'Guadeloupe',flag:'🇬🇵'},{code:'GU',name:'Guam',flag:'🇬🇺'},{code:'GT',name:'Guatemala',flag:'🇬🇹'},
  {code:'GG',name:'Guernesey',flag:'🇬🇬'},{code:'GN',name:'Guinée',flag:'🇬🇳'},{code:'GQ',name:'Guinée équatoriale',flag:'🇬🇶'},
  {code:'GW',name:'Guinée-Bissau',flag:'🇬🇼'},{code:'GY',name:'Guyana',flag:'🇬🇾'},{code:'GF',name:'Guyane française',flag:'🇬🇫'},
  {code:'HT',name:'Haïti',flag:'🇭🇹'},{code:'HN',name:'Honduras',flag:'🇭🇳'},{code:'HK',name:'Hong Kong',flag:'🇭🇰'},
  {code:'HU',name:'Hongrie',flag:'🇭🇺'},{code:'CX',name:'Île Christmas',flag:'🇨🇽'},{code:'IM',name:'Île de Man',flag:'🇮🇲'},
  {code:'NF',name:'Île Norfolk',flag:'🇳🇫'},{code:'MP',name:'Îles Mariannes du Nord',flag:'🇲🇵'},{code:'MH',name:'Îles Marshall',flag:'🇲🇭'},
  {code:'SB',name:'Îles Salomon',flag:'🇸🇧'},{code:'TC',name:'Îles Turques-et-Caïques',flag:'🇹🇨'},{code:'VI',name:'Îles Vierges américaines',flag:'🇻🇮'},
  {code:'VG',name:'Îles Vierges britanniques',flag:'🇻🇬'},{code:'AX',name:'Îles Åland',flag:'🇦🇽'},{code:'IN',name:'Inde',flag:'🇮🇳'},
  {code:'ID',name:'Indonésie',flag:'🇮🇩'},{code:'IQ',name:'Irak',flag:'🇮🇶'},{code:'IR',name:'Iran',flag:'🇮🇷'},
  {code:'IE',name:'Irlande',flag:'🇮🇪'},{code:'IS',name:'Islande',flag:'🇮🇸'},{code:'IL',name:'Israël',flag:'🇮🇱'},
  {code:'IT',name:'Italie',flag:'🇮🇹'},{code:'JM',name:'Jamaïque',flag:'🇯🇲'},{code:'JP',name:'Japon',flag:'🇯🇵'},
  {code:'JE',name:'Jersey',flag:'🇯🇪'},{code:'JO',name:'Jordanie',flag:'🇯🇴'},{code:'KZ',name:'Kazakhstan',flag:'🇰🇿'},
  {code:'KE',name:'Kenya',flag:'🇰🇪'},{code:'KG',name:'Kirghizstan',flag:'🇰🇬'},{code:'KI',name:'Kiribati',flag:'🇰🇮'},
  {code:'XK',name:'Kosovo',flag:'🇽🇰'},{code:'KW',name:'Koweït',flag:'🇰🇼'},{code:'RE',name:'La Réunion',flag:'🇷🇪'},
  {code:'LA',name:'Laos',flag:'🇱🇦'},{code:'LS',name:'Lesotho',flag:'🇱🇸'},{code:'LV',name:'Lettonie',flag:'🇱🇻'},
  {code:'LB',name:'Liban',flag:'🇱🇧'},{code:'LR',name:'Libéria',flag:'🇱🇷'},{code:'LY',name:'Libye',flag:'🇱🇾'},
  {code:'LI',name:'Liechtenstein',flag:'🇱🇮'},{code:'LT',name:'Lituanie',flag:'🇱🇹'},{code:'LU',name:'Luxembourg',flag:'🇱🇺'},
  {code:'MO',name:'Macao',flag:'🇲🇴'},{code:'MK',name:'Macédoine du Nord',flag:'🇲🇰'},{code:'MG',name:'Madagascar',flag:'🇲🇬'},
  {code:'MY',name:'Malaisie',flag:'🇲🇾'},{code:'MW',name:'Malawi',flag:'🇲🇼'},{code:'MV',name:'Maldives',flag:'🇲🇻'},
  {code:'ML',name:'Mali',flag:'🇲🇱'},{code:'MT',name:'Malte',flag:'🇲🇹'},{code:'MA',name:'Maroc',flag:'🇲🇦'},
  {code:'MQ',name:'Martinique',flag:'🇲🇶'},{code:'MU',name:'Maurice',flag:'🇲🇺'},{code:'MR',name:'Mauritanie',flag:'🇲🇷'},
  {code:'YT',name:'Mayotte',flag:'🇾🇹'},{code:'MX',name:'Mexique',flag:'🇲🇽'},{code:'FM',name:'Micronésie',flag:'🇫🇲'},
  {code:'MD',name:'Moldavie',flag:'🇲🇩'},{code:'MC',name:'Monaco',flag:'🇲🇨'},{code:'MN',name:'Mongolie',flag:'🇲🇳'},
  {code:'ME',name:'Monténégro',flag:'🇲🇪'},{code:'MS',name:'Montserrat',flag:'🇲🇸'},{code:'MZ',name:'Mozambique',flag:'🇲🇿'},
  {code:'MM',name:'Myanmar',flag:'🇲🇲'},{code:'NA',name:'Namibie',flag:'🇳🇦'},{code:'NR',name:'Nauru',flag:'🇳🇷'},
  {code:'NP',name:'Népal',flag:'🇳🇵'},{code:'NI',name:'Nicaragua',flag:'🇳🇮'},{code:'NE',name:'Niger',flag:'🇳🇪'},
  {code:'NG',name:'Nigeria',flag:'🇳🇬'},{code:'NU',name:'Niue',flag:'🇳🇺'},{code:'NO',name:'Norvège',flag:'🇳🇴'},
  {code:'NC',name:'Nouvelle-Calédonie',flag:'🇳🇨'},{code:'NZ',name:'Nouvelle-Zélande',flag:'🇳🇿'},{code:'OM',name:'Oman',flag:'🇴🇲'},
  {code:'UG',name:'Ouganda',flag:'🇺🇬'},{code:'UZ',name:'Ouzbékistan',flag:'🇺🇿'},{code:'PK',name:'Pakistan',flag:'🇵🇰'},
  {code:'PW',name:'Palaos',flag:'🇵🇼'},{code:'PS',name:'Palestine',flag:'🇵🇸'},{code:'PA',name:'Panama',flag:'🇵🇦'},
  {code:'PG',name:'Papouasie-Nouvelle-Guinée',flag:'🇵🇬'},{code:'PY',name:'Paraguay',flag:'🇵🇾'},{code:'NL',name:'Pays-Bas',flag:'🇳🇱'},
  {code:'PE',name:'Pérou',flag:'🇵🇪'},{code:'PH',name:'Philippines',flag:'🇵🇭'},{code:'PN',name:'Pitcairn',flag:'🇵🇳'},
  {code:'PL',name:'Pologne',flag:'🇵🇱'},{code:'PF',name:'Polynésie française',flag:'🇵🇫'},{code:'PR',name:'Porto Rico',flag:'🇵🇷'},
  {code:'PT',name:'Portugal',flag:'🇵🇹'},{code:'QA',name:'Qatar',flag:'🇶🇦'},{code:'DO',name:'République dominicaine',flag:'🇩🇴'},
  {code:'RO',name:'Roumanie',flag:'🇷🇴'},{code:'GB',name:'Royaume-Uni',flag:'🇬🇧'},{code:'RU',name:'Russie',flag:'🇷🇺'},
  {code:'RW',name:'Rwanda',flag:'🇷🇼'},{code:'EH',name:'Sahara occidental',flag:'🇪🇭'},{code:'BL',name:'Saint-Barthélemy',flag:'🇧🇱'},
  {code:'KN',name:'Saint-Christophe-et-Niévès',flag:'🇰🇳'},{code:'SM',name:'Saint-Marin',flag:'🇸🇲'},{code:'MF',name:'Saint-Martin (France)',flag:'🇲🇫'},
  {code:'PM',name:'Saint-Pierre-et-Miquelon',flag:'🇵🇲'},{code:'VC',name:'Saint-Vincent-et-les-Grenadines',flag:'🇻🇨'},{code:'SH',name:'Sainte-Hélène',flag:'🇸🇭'},
  {code:'LC',name:'Sainte-Lucie',flag:'🇱🇨'},{code:'WS',name:'Samoa',flag:'🇼🇸'},{code:'AS',name:'Samoa américaines',flag:'🇦🇸'},
  {code:'ST',name:'Sao Tomé-et-Principe',flag:'🇸🇹'},{code:'SN',name:'Sénégal',flag:'🇸🇳'},{code:'RS',name:'Serbie',flag:'🇷🇸'},
  {code:'SC',name:'Seychelles',flag:'🇸🇨'},{code:'SL',name:'Sierra Leone',flag:'🇸🇱'},{code:'SG',name:'Singapour',flag:'🇸🇬'},
  {code:'SX',name:'Sint Maarten',flag:'🇸🇽'},{code:'SK',name:'Slovaquie',flag:'🇸🇰'},{code:'SI',name:'Slovénie',flag:'🇸🇮'},
  {code:'SO',name:'Somalie',flag:'🇸🇴'},{code:'SD',name:'Soudan',flag:'🇸🇩'},{code:'SS',name:'Soudan du Sud',flag:'🇸🇸'},
  {code:'LK',name:'Sri Lanka',flag:'🇱🇰'},{code:'SE',name:'Suède',flag:'🇸🇪'},{code:'CH',name:'Suisse',flag:'🇨🇭'},
  {code:'SR',name:'Suriname',flag:'🇸🇷'},{code:'SY',name:'Syrie',flag:'🇸🇾'},{code:'TJ',name:'Tadjikistan',flag:'🇹🇯'},
  {code:'TW',name:'Taïwan',flag:'🇹🇼'},{code:'TZ',name:'Tanzanie',flag:'🇹🇿'},{code:'TD',name:'Tchad',flag:'🇹🇩'},
  {code:'CZ',name:'Tchéquie',flag:'🇨🇿'},{code:'TF',name:'Terres australes françaises',flag:'🇹🇫'},{code:'IO',name:'Territoire brit. Océan Indien',flag:'🇮🇴'},
  {code:'TH',name:'Thaïlande',flag:'🇹🇭'},{code:'TL',name:'Timor oriental',flag:'🇹🇱'},{code:'TG',name:'Togo',flag:'🇹🇬'},
  {code:'TK',name:'Tokelau',flag:'🇹🇰'},{code:'TO',name:'Tonga',flag:'🇹🇴'},{code:'TT',name:'Trinité-et-Tobago',flag:'🇹🇹'},
  {code:'TN',name:'Tunisie',flag:'🇹🇳'},{code:'TM',name:'Turkménistan',flag:'🇹🇲'},{code:'TR',name:'Turquie',flag:'🇹🇷'},
  {code:'TV',name:'Tuvalu',flag:'🇹🇻'},{code:'UA',name:'Ukraine',flag:'🇺🇦'},{code:'UY',name:'Uruguay',flag:'🇺🇾'},
  {code:'VU',name:'Vanuatu',flag:'🇻🇺'},{code:'VE',name:'Venezuela',flag:'🇻🇪'},{code:'VN',name:'Viêt Nam',flag:'🇻🇳'},
  {code:'WF',name:'Wallis-et-Futuna',flag:'🇼🇫'},{code:'YE',name:'Yémen',flag:'🇾🇪'},{code:'ZM',name:'Zambie',flag:'🇿🇲'},
  {code:'ZW',name:'Zimbabwe',flag:'🇿🇼'}
]

// regShowCountryList / regHideCountryList / regFilterCountries / regSelectCountry
// sont définis dans src/index.tsx (page inscription) — ne pas redéfinir ici
function regTogglePassword(id){
  const el=document.getElementById(id);
  const eye=document.getElementById(id+'-eye');
  if(!el)return;
  if(el.type==='password'){el.type='text';if(eye){eye.className='fas fa-eye-slash';}}
  else{el.type='password';if(eye){eye.className='fas fa-eye';}}
}
function regCheckPasswordStrength(pwd){
  const bars=['reg-pwd-bar-1','reg-pwd-bar-2','reg-pwd-bar-3','reg-pwd-bar-4'];
  const lbl=document.getElementById('reg-pwd-strength-label');
  let score=0;
  if(pwd.length>=8)score++;
  if(pwd.length>=12)score++;
  if(/[A-Z]/.test(pwd)&&/[a-z]/.test(pwd))score++;
  if(/[0-9]/.test(pwd)||/[^A-Za-z0-9]/.test(pwd))score++;
  const colors=['bg-red-500','bg-orange-500','bg-yellow-500','bg-green-500'];
  const labels=['Trop faible','Faible','Correct','Fort'];
  const labelColors=['text-red-400','text-orange-400','text-yellow-400','text-green-400'];
  bars.forEach((id,i)=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.className='h-1 flex-1 rounded-full '+(i<score?colors[score-1]:'bg-dark-600');
  });
  if(lbl){lbl.textContent=pwd.length>0?(labels[score-1]||''):'';lbl.className='text-xs mt-1 '+(score>0?labelColors[score-1]:'text-gray-500');}
}
let _regCurrentStep=1;
function regNextStep(target){
  const err1=document.getElementById('reg-error-1');
  const err2=document.getElementById('reg-error-2');
  // Validation avant d'avancer
  if(target===2){
    // Vérifier étape 1
    const fn=(document.getElementById('reg-firstname')?.value||'').trim();
    const ln=(document.getElementById('reg-lastname')?.value||'').trim();
    const em=(document.getElementById('reg-email')?.value||'').trim();
    const bd=(document.getElementById('reg-birthdate')?.value||'').trim();
    if(!fn||!ln){if(err1){err1.textContent='Prénom et nom sont obligatoires.';err1.classList.remove('hidden');}return;}
    if(!em||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){if(err1){err1.textContent='Adresse email invalide.';err1.classList.remove('hidden');}return;}
    if(!bd){if(err1){err1.textContent='La date de naissance est obligatoire.';err1.classList.remove('hidden');}return;}
    if(err1)err1.classList.add('hidden');
  }
  if(target===3){
    // Vérifier étape 2
    const ph=(document.getElementById('reg-phone')?.value||'').trim();
    const co=(document.getElementById('reg-country')?.value||'').trim();
    const nat=(document.getElementById('reg-nationality')?.value||'').trim();
    const addr=(document.getElementById('reg-address')?.value||'').trim();
    const city=(document.getElementById('reg-city')?.value||'').trim();
    const postal=(document.getElementById('reg-postal')?.value||'').trim();
    if(!ph){if(err2){err2.textContent='Le téléphone est obligatoire.';err2.classList.remove('hidden');}return;}
    if(!co){if(err2){err2.textContent='Le pays est obligatoire.';err2.classList.remove('hidden');}return;}
    if(!nat){if(err2){err2.textContent='La nationalité est obligatoire.';err2.classList.remove('hidden');}return;}
    if(!addr){if(err2){err2.textContent='L\'adresse est obligatoire.';err2.classList.remove('hidden');}return;}
    if(!city){if(err2){err2.textContent='La ville est obligatoire.';err2.classList.remove('hidden');}return;}
    if(!postal){if(err2){err2.textContent='Le code postal est obligatoire.';err2.classList.remove('hidden');}return;}
    if(err2)err2.classList.add('hidden');
    // Mettre à jour le récap étape 3
    const fn=(document.getElementById('reg-firstname')?.value||'').trim();
    const ln=(document.getElementById('reg-lastname')?.value||'').trim();
    const em=(document.getElementById('reg-email')?.value||'').trim();
    const rName=document.getElementById('reg-recap-name');
    const rEmail=document.getElementById('reg-recap-email');
    const rCountry=document.getElementById('reg-recap-country');
    const rCity=document.getElementById('reg-recap-city');
    if(rName)rName.textContent=fn+' '+ln;
    if(rEmail)rEmail.textContent=em;
    if(rCountry)rCountry.textContent=co;
    if(rCity)rCity.textContent=city+(postal?' — '+postal:'');
  }
  // Cacher toutes les étapes
  [1,2,3].forEach(s=>{
    const el=document.getElementById('reg-step-'+s);
    if(el)el.classList.add('hidden');
  });
  // Afficher la cible
  const next=document.getElementById('reg-step-'+target);
  if(next)next.classList.remove('hidden');
  _regCurrentStep=target;
  // Mettre à jour les dots
  [1,2,3].forEach(s=>{
    const dot=document.getElementById('reg-step-dot-'+s);
    const lbl=document.getElementById('reg-step-label-'+s);
    if(!dot)return;
    if(s<target){
      dot.className='w-8 h-8 rounded-full bg-green-500 text-white font-bold text-sm flex items-center justify-center transition-all';
      dot.innerHTML='<i class="fas fa-check text-xs"></i>';
    } else if(s===target){
      dot.className='w-8 h-8 rounded-full bg-rouge-500 text-dark-900 font-bold text-sm flex items-center justify-center transition-all';
      dot.textContent=s;
      if(lbl){lbl.className='text-xs mt-1 text-rouge-400 font-medium';}
    } else {
      dot.className='w-8 h-8 rounded-full bg-dark-600 text-gray-400 font-bold text-sm flex items-center justify-center transition-all';
      dot.textContent=s;
      if(lbl){lbl.className='text-xs mt-1 text-gray-500';}
    }
  });
  // Lignes
  const l1=document.getElementById('reg-line-1');
  const l2=document.getElementById('reg-line-2');
  if(l1)l1.style.background=target>=2?'linear-gradient(90deg,#22c55e,#22c55e)':'';
  if(l2)l2.style.background=target>=3?'linear-gradient(90deg,#22c55e,#22c55e)':'';
}

async function initRegistrationMode(){const e=window.__REGISTRATION__||{},t=e.mode||"M1";if("M1"===t)return document.getElementById("reg-title").textContent="Créer un compte",void document.getElementById("reg-sponsor-field").classList.remove("hidden");if("M2"===t){document.getElementById("reg-title").textContent="Inscription — Placement direct",document.getElementById("reg-sponsor-field").classList.add("hidden");const t=document.getElementById("slot-error-banner"),n=document.getElementById("sponsor-banner"),a=document.getElementById("reg-submit-btn");try{const s=e.parent||e.sponsor,r=(await axios.get(`/api/auth/validate-slot?sponsor=${encodeURIComponent(e.sponsor)}&parent=${encodeURIComponent(s)}&position=${encodeURIComponent(e.position)}`)).data;if(r.valid){document.getElementById("reg-sponsor").value=r.sponsor_id,document.getElementById("reg-binary-parent").value=r.parent_id,n.classList.remove("hidden");const t=r.parent_unique_id!==r.sponsor_unique_id?`Parrainé(e) par ${r.sponsor_name} — placé(e) sous ${r.parent_name} (${r.parent_unique_id}), jambe ${"L"===e.position?"GAUCHE":"DROITE"}`:`Vous serez placé(e) côté ${"L"===e.position?"GAUCHE":"DROITE"} de ${r.sponsor_name} (${r.sponsor_unique_id})`;document.getElementById("sponsor-banner-text").textContent=t}else t.classList.remove("hidden"),document.getElementById("slot-error-text").textContent=r.error||"Slot invalide",a.disabled=!0}catch(e){const n=e.response?.data?.error||"Lien de parrainage invalide ou expiré.";t.classList.remove("hidden"),document.getElementById("slot-error-text").textContent=n,a.disabled=!0}return}if("M3"===t){document.getElementById("reg-title").textContent="Inscription — Via lien parrain",document.getElementById("reg-sponsor-field").classList.add("hidden");const t=document.getElementById("sponsor-banner"),n=document.getElementById("slot-error-banner"),a=document.getElementById("reg-submit-btn"),s=e.sponsorUid||"";if(s)try{const e=(await axios.get(`/api/auth/sponsor/${encodeURIComponent(s)}`)).data;e.found?(document.getElementById("reg-sponsor").value=e.id,t.classList.remove("hidden"),document.getElementById("sponsor-banner-text").textContent=`Parrainé(e) par : ${e.name} (${e.unique_id})`):"no_license"===e.reason?(n.classList.remove("hidden"),document.getElementById("slot-error-text").textContent=e.message||"Ce lien de parrainage est inactif (licence du parrain expirée ou non activée).",a.disabled=!0):(t.classList.remove("hidden"),document.getElementById("sponsor-banner-text").textContent="Inscription sans parrain (lien introuvable)")}catch(e){const t=e.response?.data?.error||"Lien de parrainage invalide.";n.classList.remove("hidden"),document.getElementById("slot-error-text").textContent=t,a.disabled=!0}}}async function doRegister(){
const e=window.__REGISTRATION__||{},t=e.mode||"M1";
const n=document.getElementById("reg-firstname").value.trim();
const a=document.getElementById("reg-lastname").value.trim();
const s=document.getElementById("reg-email").value.trim();
const dialCode=(document.getElementById("reg-phone-dial")?.value||"").trim();
const phoneNum=(document.getElementById("reg-phone")?.value||"").trim();
const r=phoneNum?(dialCode&&!phoneNum.startsWith("+")?(dialCode+" "+phoneNum):phoneNum):"";
const i=(document.getElementById("reg-country")?.value||"").trim();
const regBirthdate=(document.getElementById("reg-birthdate")?.value||"").trim();
const regNationality=(document.getElementById("reg-nationality")?.value||"").trim();
const regAddress=(document.getElementById("reg-address")?.value||"").trim();
const regPostal=(document.getElementById("reg-postal")?.value||"").trim();
const regCity=(document.getElementById("reg-city")?.value||"").trim();
const l=document.getElementById("reg-password").value;
const d=document.getElementById("reg-password2").value;
const o=document.getElementById("reg-cgu").checked;
const c=document.getElementById("reg-error");
const x=document.getElementById("reg-btn-text");
const p=document.getElementById("reg-submit-btn");
c.classList.add("hidden");
if(!(n&&a&&s&&l))return c.textContent="Veuillez remplir tous les champs obligatoires (*)",void c.classList.remove("hidden");
if(l.length<8)return c.textContent="Le mot de passe doit faire au moins 8 caractères",void c.classList.remove("hidden");
if(l!==d)return c.textContent="Les mots de passe ne correspondent pas",void c.classList.remove("hidden");
if(!o)return c.textContent="Vous devez accepter les conditions générales",void c.classList.remove("hidden");
let reqFields=["country","birth_date","nationality","address","postal_code","city"];
try{const cfg=await api("GET","/auth/reg-required-fields");if(cfg&&Array.isArray(cfg.fields))reqFields=cfg.fields;}catch(err){}
const fieldMap={country:{val:i,label:"Pays"},birth_date:{val:regBirthdate,label:"Date de naissance"},nationality:{val:regNationality,label:"Nationalité"},address:{val:regAddress,label:"Adresse"},postal_code:{val:regPostal,label:"Code postal"},city:{val:regCity,label:"Ville"}};
for(const fk of reqFields){if(fieldMap[fk]&&!fieldMap[fk].val)return c.textContent="Le champ «"+fieldMap[fk].label+"» est obligatoire.",void c.classList.remove("hidden");}
const m={first_name:n,last_name:a,email:s,password:l,phone:r||null,country:i||null,birth_date:regBirthdate||null,nationality:regNationality||null,address:regAddress||null,postal_code:regPostal||null,city:regCity||null};
if("M1"===t){m.registration_method="M1";const e=document.getElementById("reg-sponsor").value.trim();if(e)try{const t=await axios.get(`/api/auth/sponsor/${encodeURIComponent(e.toUpperCase())}`);t.data.found&&(m.sponsor_id=t.data.id)}catch{}}
if("M2"===t&&(m.registration_method="M2",m.sponsor_id=document.getElementById("reg-sponsor").value.trim(),m.binary_parent_id=document.getElementById("reg-binary-parent").value.trim(),m.binary_position=e.position,!m.binary_parent_id||!m.sponsor_id))return c.textContent="Slot invalide — rechargez la page",void c.classList.remove("hidden");
if("M3"===t){m.registration_method="M3";const e=document.getElementById("reg-sponsor").value.trim();e&&(m.sponsor_id=e)}
p.disabled=!0,x.textContent="Création en cours...";
try{const e=await api("POST","/auth/register",m);memberToken=e.token,localStorage.setItem("leader_member_token",e.token),currentMember=e.member,showPinConfirmation(e)}catch(e){c.textContent=e.error||"Erreur lors de l'inscription",c.classList.remove("hidden"),p.disabled=!1,x.textContent="Créer mon compte"}
}function showPinConfirmation(e){document.getElementById("register-form").classList.add("hidden"),document.getElementById("login-form").classList.add("hidden"),document.getElementById("pin-confirmation").classList.remove("hidden");const t={M1:"Inscription libre",M2:"Placement direct",M3:"Via lien de parrainage"}[e.registration_method]||e.registration_method;document.getElementById("pin-confirm-content").innerHTML=`\n
    <div class="space-y-4">\n
      \x3c!-- Identifiant unique --\x3e\n
      <div class="bg-dark-700 rounded-xl p-4 border border-rouge-500/25">\n
        <div class="text-xs text-gray-400 mb-1 uppercase tracking-wider">Votre identifiant unique</div>\n
        <div class="text-2xl font-bold text-rouge-400 font-mono tracking-widest">${e.member.unique_id}</div>\n
        <div class="text-xs text-gray-500 mt-1">Conservez-le précieusement — il ne peut pas être modifié</div>\n
      </div>\n
\n
      \x3c!-- PIN affiché UNE SEULE FOIS --\x3e\n
      <div class="bg-dark-700 rounded-xl p-4 border border-red-500/40">\n
        <div class="flex items-center gap-2 mb-2">\n
          <i class="fas fa-triangle-exclamation text-red-400"></i>\n
          <div class="text-xs text-red-300 uppercase tracking-wider font-bold">PIN de sécurité — Visible une seule fois !</div>\n
        </div>\n
        <div class="text-3xl font-bold text-white font-mono tracking-[0.3em] text-center py-2">${e.pin_displayed}</div>\n
        <div class="text-xs text-red-400/80 mt-1 text-center">Ce PIN sera requis pour chaque retrait. Notez-le maintenant.</div>\n
      </div>\n
\n
      \x3c!-- Infos compte --\x3e\n
      <div class="bg-dark-700/50 rounded-xl p-3 space-y-2 text-sm">\n
        <div class="flex justify-between"><span class="text-gray-400">Nom</span><span class="text-white font-medium">${e.member.first_name} ${e.member.last_name}</span></div>\n
        <div class="flex justify-between"><span class="text-gray-400">Email</span><span class="text-white">${e.member.email}</span></div>\n
        <div class="flex justify-between"><span class="text-gray-400">Méthode</span><span class="text-rouge-400 text-xs">${t}</span></div>\n
        ${e.in_holding_tank?'<div class="flex justify-between"><span class="text-gray-400">Statut</span><span class="text-orange-400 text-xs"><i class="fas fa-clock mr-1"></i>En attente de placement</span></div>':'<div class="flex justify-between"><span class="text-gray-400">Statut</span><span class="text-green-400 text-xs"><i class="fas fa-check mr-1"></i>Placé dans l\'arbre</span></div>'}\n
      </div>\n
\n
      \x3c!-- Avertissement --\x3e\n
      <div class="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-3">\n
        <p class="text-xs text-yellow-400">\n
          <i class="fas fa-info-circle mr-1"></i>\n
          Un email de bienvenue vous a été envoyé. Votre PIN ne sera <strong>jamais</strong> affiché à nouveau.\n
          Vous pouvez le modifier dans votre profil si vous le perdez.\n
        </p>\n
      </div>\n
    </div>`}function pinConfirmOk(){document.getElementById("pin-confirmation").classList.add("hidden"),initApp()}async function doLogin(){const e=document.getElementById("login-email").value.trim(),t=document.getElementById("login-password").value,n=document.getElementById("login-error");n.classList.add("hidden");try{const n=await api("POST","/auth/login",{email:e,password:t});memberToken=n.token,localStorage.setItem("leader_member_token",n.token),currentMember=n.member,initApp()}catch(e){n.textContent=e.error||"Erreur de connexion",n.classList.remove("hidden")}}function doLogout(){localStorage.removeItem("leader_member_token"),memberToken=null,currentMember=null,document.getElementById("app").classList.add("hidden"),document.getElementById("auth-screen").classList.remove("hidden"),showLogin()}async function initApp(){if(memberToken)try{const e=await api("GET","/members/me");currentMember=e.member,updateSidebar(),document.getElementById("auth-screen").classList.add("hidden"),document.getElementById("app").classList.remove("hidden"),showPage("dashboard"),loadNotifCount(),loadReservoirCount(),loadSupportUnread()}catch{doLogout()}else document.getElementById("auth-screen").classList.remove("hidden")}function updateSidebar(){const e=currentMember;if(!e)return;const t=((e.first_name||"")[0]+(e.last_name||"")[0]).toUpperCase();document.getElementById("sidebar-avatar").textContent=t,document.getElementById("sidebar-name").textContent=`${e.first_name} ${e.last_name}`,document.getElementById("sidebar-uid").textContent=e.unique_id;const n=document.getElementById("sidebar-status");n.textContent=e.member_status,n.className=`text-xs px-2 py-0.5 rounded-full font-medium ${{AMI:"bg-rouge-500/15 text-rouge-400",Partenaire:"bg-green-500/20 text-green-400",Client:"bg-blue-500/20 text-blue-400",Membre:"bg-gray-500/20 text-gray-400"}[e.member_status]||""}`,document.getElementById("sidebar-rank").textContent="none"===e.current_rank?"—":e.current_rank}async function loadNotifCount(){try{const e=((await api("GET","/members/notifications?per_page=100")).notifications||[]).filter(e=>!e.is_read).length,t=document.getElementById("notif-badge"),n=document.getElementById("header-notif-badge");e>0?(t.textContent=e,t.classList.remove("hidden"),n.textContent=e,n.classList.remove("hidden")):(t.classList.add("hidden"),n.classList.add("hidden"))}catch{}}async function loadReservoirCount(){try{const e=await api("GET","/members/holding-tank"),t=document.getElementById("reservoir-badge");if(!t)return;(e.pending_count||0)>0?(t.textContent=e.pending_count,t.classList.remove("hidden")):t.classList.add("hidden")}catch{}}function showPage(e){window._prevPage=(typeof currentPage!=='undefined'&&currentPage!==e?currentPage:window._prevPage)||'wallet';currentPage=e,document.querySelectorAll(".nav-btn").forEach(t=>{t.classList.toggle("active",t.dataset.page===e)});const t=document.getElementById("page-content");t.className="p-4 md:p-6 fade-in";const n={dashboard:renderDashboard,team:renderTeam,tree:renderTree,bv:renderBV,commissions:renderCommissions,wallet:renderWallet,withdraw:renderWithdraw,transactions:renderTransactions,packages:renderPackages,license:renderLicense,kyc:renderKYC,marketing:renderMarketing,notifications:renderNotifications,profile:window.renderProfile,reservoir:renderReservoir,"cc-wallet":renderCCWallet,"reserve-strategique":renderReserveStrategique,"commissions-faq":renderCommissionsFAQ,support:window.renderSupport,earnings:window.renderEarnings,"member-card":window.renderMemberCard,services:renderServices,campus:showCampusPage};n[e]?(n[e](t),setTimeout(_applyMemberMobileFixes,300)):t.innerHTML=`<p class="text-gray-400">Page "${e}" non disponible</p>`}function refreshCurrentPage(){const btn=document.getElementById("header-refresh-btn");if(btn){btn.style.pointerEvents="none";btn.style.opacity="0.5";const icon=btn.querySelector("i");if(icon)icon.style.transform="rotate(360deg)";}showPage(currentPage||"dashboard");setTimeout(()=>{if(btn){btn.style.pointerEvents="";btn.style.opacity="";const icon=btn.querySelector("i");if(icon)icon.style.transform="";}},800);}/* ── Mobile responsive fix — appliqué après chaque rendu de page membre ── */
function _applyMemberMobileFixes(){
  if(window.innerWidth>=768)return;
  const content=document.getElementById('page-content');
  if(!content)return;
  content.querySelectorAll('div').forEach(el=>{
    const cs=window.getComputedStyle(el);
    if(cs.display==='flex'&&(cs.flexDirection==='row'||cs.flexDirection==='')){
      el.style.flexWrap='wrap';
    }
  });
  content.querySelectorAll('table.data-table').forEach(tbl=>{
    const p=tbl.parentElement;
    if(p&&!p.classList.contains('overflow-x-auto')){
      p.style.overflowX='auto';
      p.style.webkitOverflowScrolling='touch';
    }
  });
}
function openSidebar(){const s=document.getElementById('sidebar'),o=document.getElementById('sidebar-overlay');if(s)s.classList.remove('-translate-x-full');if(o){o.classList.remove('hidden');document.body.style.overflow='hidden';}}function closeSidebar(){const s=document.getElementById('sidebar'),o=document.getElementById('sidebar-overlay');if(s)s.classList.add('-translate-x-full');if(o){o.classList.add('hidden');document.body.style.overflow='';}}function toggleSidebar(){const isMobile=window.innerWidth<768;if(isMobile){const s=document.getElementById('sidebar');const isOpen=s&&!s.classList.contains('-translate-x-full');if(isOpen){closeSidebar();}else{openSidebar();}}else{const e=document.getElementById('sidebar');if(e){e.classList.toggle('w-64');e.classList.toggle('w-16');}}}async function renderDashboard(e){e.innerHTML='<div class="flex items-center justify-center py-16"><div class="loader"></div></div>';try{const t=await api("GET","/members/dashboard"),n=t.member,a=t.wallet,s=t.pendingWalletTotal||0;t.nextEligible,document.getElementById("header-balance").innerHTML=`<span class="text-gray-400">Solde : </span><span class="text-rouge-400 font-bold">${fmt$(a?.balance)}</span>`;const _licPrice=fmtPrice(t.license_price||97);e.innerHTML=`\n
    <div class="space-y-6">\n
      <div>\n
        <h1 class="text-2xl font-bold text-white">Bonjour, ${n.first_name} ! </h1>\n
        <p class="text-gray-400 mt-1">Voici votre tableau de bord LEADER</p>\n
      </div>\n
\n
      \x3c!-- Widget Fast Start Bonus — EN ÉVIDENCE, disparaît uniquement à la fin des 30j --\x3e\n
      ${(()=>{const e=n.fast_start_start_date;if(!e)return"";const a=new Date(e.replace(" ","T")),s=new Date,r=Math.floor((s-a)/864e5),i=t.fastStartDays||30,l=Math.max(0,i-r);if(l<=0)return"";const d=Math.min(100,Math.round(r/i*100)),o=n.fast_start_bv||0,c=t.fastStartPaliers||[];let x=null,p=null;for(const e of c)o>=e.bv_threshold?x=e:p||(p=e);const m=p?Math.min(100,Math.round(o/p.bv_threshold*100)):x?100:0,u=l<=7,g=l<=14,f=u?"border-red-500/60":g?"border-orange-500/50":"border-emerald-500/50",b=u?"rgba(239,68,68,0.08)":g?"rgba(249,115,22,0.07)":"rgba(16,185,129,0.07)",v=u?"text-red-400":g?"text-orange-400":"text-emerald-400",y=u?"#ef4444,#dc2626":g?"#f97316,#ea580c":"#10b981,#059669",h=u?"animate-pulse":"",w=new Date(a.getTime()+864e5*i).toLocaleDateString("fr-FR");return`\n
        <div class="rounded-xl border ${f} overflow-hidden relative"\n
             style="background: linear-gradient(135deg, #0f1a14 0%, #0d1a16 100%); box-shadow: 0 0 24px ${b}">\n
\n
          \x3c!-- Bande supérieure colorée --\x3e\n
          <div class="h-0.5 w-full" style="background:linear-gradient(90deg,${y})"></div>\n
\n
          \x3c!-- En-tête --\x3e\n
          <div class="px-4 py-3 flex items-center justify-between flex-wrap gap-2">\n
            <div class="flex items-center gap-2.5">\n
              <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${h}"\n
                   style="background:linear-gradient(135deg,${y.split(",")[0]}33,${y.split(",")[0]}11)">\n
                <i class="fas fa-rocket ${v} text-sm"></i>\n
              </div>\n
              <div>\n
                <div class="font-bold text-white text-sm flex items-center gap-2">\n
                  Fast Start Bonus\n
                  ${x?x.paid?`<span class="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-full font-semibold"><i class="fas fa-wallet mr-0.5"></i>Bonus ${x.bv_threshold} BV versé !</span>`:`<span class="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-semibold"><i class="fas fa-check mr-0.5"></i>Palier ${x.bv_threshold} BV atteint !</span>`:""}\n
                </div>\n
                <div class="text-[11px] text-gray-400 mt-0.5">Filleuls directs avant le <span class="font-medium text-white">${w}</span></div>\n
              </div>\n
            </div>\n
            <div class="flex flex-col items-end">\n
              <span class="${v} font-black text-xl leading-none">${l}</span>\n
              <span class="text-[10px] text-gray-400">jour${1!==l?"s":""} restant${1!==l?"s":""}</span>\n
            </div>\n
          </div>\n
\n
          \x3c!-- Corps --\x3e\n
          <div class="px-4 pb-3 space-y-2.5">\n
\n
            \x3c!-- Barre de temps --\x3e\n
            <div>\n
              <div class="flex justify-between text-[11px] text-gray-400 mb-1">\n
                <span>Temps écoulé</span>\n
                <span class="${v} font-semibold">${d}% — ${r}j / ${i}j</span>\n
              </div>\n
              <div class="h-1.5 rounded-full bg-dark-700 overflow-hidden">\n
                <div class="h-full rounded-full transition-all" style="width:${d}%; background:linear-gradient(90deg,${y})"></div>\n
              </div>\n
            </div>\n
\n
            \x3c!-- BV + progression --\x3e\n
            <div>\n
              <div class="flex justify-between text-[11px] text-gray-400 mb-1">\n
                <span>BV filleuls directs accumulés</span>\n
                <span class="text-emerald-400 font-bold">${fmtBV(o)}</span>\n
              </div>\n
              <div class="h-1.5 rounded-full bg-dark-700 overflow-hidden">\n
                <div class="h-full rounded-full transition-all" style="width:${m}%; background:linear-gradient(90deg,#10b981,#059669)"></div>\n
              </div>\n
              <div class="flex justify-between text-[10px] text-gray-500 mt-1">\n
                ${p?`<span>${fmtBV(o)} / ${fmtBV(p.bv_threshold)} BV pour décrocher <span class="text-emerald-400 font-bold">${fmt$(p.bonus_amount)}</span></span><span class="text-emerald-400">${m}%</span>`:x?x.paid?`<span class="text-indigo-400 font-semibold"><i class="fas fa-wallet mr-1"></i>Palier max atteint — bonus ${fmt$(x.bonus_amount)} versé dans votre wallet</span><span></span>`:`<span class="text-emerald-400 font-semibold"><i class="fas fa-check-circle mr-1"></i>Palier max atteint — bonus ${fmt$(x.bonus_amount)} en cours de versement</span><span></span>`:`<span>Premier palier : ${c[0]?fmtBV(c[0].bv_threshold)+" BV":"—"}</span><span></span>`}\n
              </div>\n
            </div>\n
\n
            \x3c!-- Paliers --\x3e\n
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">\n
              ${c.map(e=>{const t=o>=e.bv_threshold,n=t&&e.paid,a=n?"border-indigo-500/50 bg-indigo-500/10":t?"border-emerald-500/50 bg-emerald-500/10":"border-dark-500/60 bg-dark-800/60",s=n?"text-indigo-300":t?"text-emerald-300":"text-gray-500",r=n?"text-indigo-400":t?"text-emerald-400":"text-gray-600",i=n?'<div class="mt-0.5 text-[9px] text-indigo-400 font-semibold"><i class="fas fa-wallet mr-0.5"></i>Versé ✓</div>':t?'<div class="mt-0.5 text-[9px] text-emerald-500 font-semibold"><i class="fas fa-check-circle mr-0.5"></i>Atteint</div>':`<div class="mt-0.5 text-[9px] text-gray-600">${fmtBV(e.bv_threshold-o)} manquants</div>`;return`\n
                <div class="rounded-lg px-2.5 py-2 text-center border transition-all ${a}">\n
                  <div class="text-[11px] font-bold ${s} mb-0.5">${fmtBV(e.bv_threshold)}</div>\n
                  <div class="text-sm font-black ${r}">${fmt$(e.bonus_amount)}</div>\n
                  ${i}\n
                </div>`}).join("")}\n
            </div>\n
\n
          </div>\n
        </div>`})()}\n

      \x3c!-- Widget Prime du Jour (Q70/Q108) \x3e
      ${(()=>{
        const drt = t.dailyReleaseTotal || 0;
        const drb = t.dailyReleaseByType || [];
        if (drt <= 0) return '';
        const rows = drb.map(x =>
          `<div class="flex justify-between text-xs py-0.5"><span class="text-gray-400">${x.label}</span><span class="text-emerald-300 font-medium">+${fmt$(x.amount_per_day)}/j</span></div>`
        ).join('');
        return `
        <div class="rounded-xl border border-emerald-500/30 overflow-hidden"
             style="background:linear-gradient(135deg,#0a1a0f 0%,#071209 100%)">
          <div class="h-0.5 w-full" style="background:linear-gradient(90deg,#10b981,#059669)"></div>
          <div class="px-4 py-3 flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-droplet text-emerald-400 text-sm"></i>
              </div>
              <div>
                <div class="text-xs text-gray-400 uppercase tracking-wider">Prime libérée aujourd'hui</div>
                <div class="text-xl font-black text-emerald-400">${fmt$(drt)}<span class="text-xs text-gray-400 font-normal ml-1">/jour</span></div>
              </div>
            </div>
            <div class="text-right">
              <button onclick="showPage('commissions')"
                      class="text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors">
                <i class="fas fa-arrow-right mr-1"></i>Voir mes commissions
              </button>
            </div>
          </div>
          ${drb.length > 1 ? `<div class="px-4 pb-3 border-t border-emerald-500/10 pt-2 space-y-0.5">${rows}</div>` : ''}
        </div>`;
      })()}\n
      \x3c!-- Stats principales --\x3e\n
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">\n
        <div class="stat-card cursor-pointer hover:border-rouge-500/30 transition-all group" onclick="showPage(\'wallet\')" title="Voir mon portefeuille complet">\n
          <div class="flex items-center justify-between mb-3">\n
            <span class="text-xs text-gray-400 uppercase tracking-wider">Solde</span>\n
            <div class="w-8 h-8 rounded-lg bg-rouge-500/15 flex items-center justify-center"><i class="fas fa-wallet text-rouge-400 text-sm group-hover:scale-110 transition-transform"></i></div>\n
          </div>\n
          <div class="text-2xl font-bold text-rouge-400">${fmt$(a?.balance)}</div>\n
          <div class="text-xs text-gray-500 mt-1">Disponible au retrait</div>\n
          ${s>0?`<div class="text-xs text-orange-400 mt-1"><i class="fas fa-hourglass-half mr-1"></i>${fmt$(s)} en attente</div>`:""}\n
          <div class="text-xs text-rouge-500/50 mt-2 group-hover:text-rouge-400 transition-colors"><i class="fas fa-arrow-right mr-1"></i>Voir portefeuille</div>\n
        </div>\n
        <div class="stat-card">\n
          <div class="flex items-center justify-between mb-3">\n
            <span class="text-xs text-gray-400 uppercase tracking-wider">BV Gauche</span>\n
            <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center"><i class="fas fa-arrow-left text-blue-400 text-sm"></i></div>\n
          </div>\n
          <div class="text-2xl font-bold text-blue-400">${fmtBV(n.left_bv_total)}</div>\n
          <div class="text-xs text-gray-500 mt-1">À vie &nbsp;<span class="text-gray-600">/</span>&nbsp; <span class="text-blue-300/70">${fmtBV(n.left_bv_monthly)} ce mois</span></div>\n
        </div>\n
        <div class="stat-card">\n
          <div class="flex items-center justify-between mb-3">\n
            <span class="text-xs text-gray-400 uppercase tracking-wider">BV Droit</span>\n
            <div class="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center"><i class="fas fa-arrow-right text-green-400 text-sm"></i></div>\n
          </div>\n
          <div class="text-2xl font-bold text-green-400">${fmtBV(n.right_bv_total)}</div>\n
          <div class="text-xs text-gray-500 mt-1">À vie &nbsp;<span class="text-gray-600">/</span>&nbsp; <span class="text-green-300/70">${fmtBV(n.right_bv_monthly)} ce mois</span></div>\n
        </div>\n
        <div class="stat-card">\n
          <div class="flex items-center justify-between mb-3">\n
            <span class="text-xs text-gray-400 uppercase tracking-wider">Équipe directe</span>\n
            <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center"><i class="fas fa-users text-purple-400 text-sm"></i></div>\n
          </div>\n
          <div class="text-2xl font-bold text-purple-400">${t.directTeamCount||0}</div>\n
          <div class="text-xs text-gray-500 mt-1">Membres parrainés</div>\n
        </div>\n
      </div>\n
\n
      \x3c!-- Rang + BV côte à côte --\x3e\n
      <div style="display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:1rem; align-items:start;">\n
\n
        \x3c!-- GAUCHE : Rang actuel --\x3e\n
        <div class="stat-card overflow-hidden relative" style="align-self:start">\n
          ${(()=>{const e=n.current_rank&&"none"!==n.current_rank,a=t.rankConfig?.badge_url||null,s=e?n.current_rank:null;return e?`\n
              <div class="absolute inset-0 opacity-5 pointer-events-none"\n
                   style="background: radial-gradient(ellipse at 50% 0%, var(--rank-glow-color, #d4af37) 0%, transparent 70%)"></div>\n
              <div class="flex items-start justify-between mb-5">\n
                <h3 class="font-semibold text-white text-sm uppercase tracking-wider">Mon Rang Actuel</h3>\n
                ${rankBadge(n.current_rank)}\n
              </div>\n
              \x3c!-- Badge SVG central premium --\x3e\n
              <div class="flex flex-col items-center mb-5">\n
                <div class="relative group">\n
\n
                  <div class="relative w-28 h-28 rounded-full overflow-hidden shadow-2xl"\n
                       style="filter: drop-shadow(0 0 16px rgba(212,175,55,0.35));">\n
                    ${a?`<img src="${a}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" style="border-radius:50%">`:'<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-rouge-500/20 to-gold-800/30"><i class="fas fa-medal text-rouge-400 text-4xl"></i></div>'}\n
                  </div>\n
\n
                </div>\n
                <div class="mt-4 text-center">\n
                  <div class="text-lg font-bold text-rouge-400 tracking-wide" style="text-shadow: 0 0 12px rgba(212,175,55,0.5)">${s}</div>\n
\n
                </div>\n
              </div>\n
              \x3c!-- Progression --\x3e\n
              ${t.nextRankConfig?`\n
              <div class="border-t border-dark-600 pt-4">\n
                <div class="flex justify-between text-xs text-gray-400 mb-2">\n
                  <span class="flex items-center gap-1"><i class="fas fa-arrow-up text-[9px] text-green-400"></i>Vers <span class="text-white font-medium ml-1">${t.nextRank}</span></span>\n
                  <span class="font-bold ${t.progressToNext>=80?"text-green-400":t.progressToNext>=50?"text-yellow-400":"text-gray-400"}">${t.progressToNext}%</span>\n
                </div>\n
                <div class="progress-bar">\n
                  <div class="progress-fill" style="width:${t.progressToNext}%; background: linear-gradient(90deg, ${t.progressToNext>=80?"#22c55e,#16a34a":t.progressToNext>=50?"#eab308,#ca8a04":"#d4af37,#b8860b"})"></div>\n
                </div>\n
                <div class="text-xs text-gray-500 mt-1.5 flex justify-between">\n
                  <span>${fmtBV(t.progressMinLeg)} / ${fmtBV(t.nextRankConfig.min_bv_leg)} BV jambe faible</span>\n
                  <span class="${"total"===t.progressBVMode?"text-rouge-400/70":"text-blue-400/70"}">${"total"===t.progressBVMode?"∞ à vie":"mensuel"}</span>\n
                </div>\n
              </div>`:'\n              <div class="border-t border-dark-600 pt-3 text-center">\n                <span class="text-xs text-rouge-400/70 flex items-center justify-center gap-1"><i class="fas fa-crown text-[10px]"></i>Rang maximum atteint</span>\n              </div>'}\n
            `:'\n              <div class="flex items-center justify-between mb-4">\n                <h3 class="font-semibold text-white">Mon Rang Actuel</h3>\n              </div>\n              <div class="flex flex-col items-center py-4 gap-3">\n                <div class="w-20 h-20 rounded-full bg-dark-700 border-2 border-dark-500 flex items-center justify-center opacity-40">\n                  <i class="fas fa-medal text-gray-500 text-3xl"></i>\n                </div>\n                <p class="text-gray-500 text-sm text-center">Aucun rang actif<br><span class="text-xs">Activez votre package pour débloquer</span></p>\n              </div>\n              '+(t.nextRankConfig?`\n
              <div class="border-t border-dark-600 pt-4 mt-2">\n
                <div class="flex justify-between text-xs text-gray-400 mb-2">\n
                  <span class="flex items-center gap-1"><i class="fas fa-arrow-up text-[9px] text-green-400"></i>Vers <span class="text-white font-medium ml-1">${t.nextRank}</span></span>\n
                  <span class="font-bold ${t.progressToNext>=80?"text-green-400":t.progressToNext>=50?"text-yellow-400":"text-gray-400"}">${t.progressToNext}%</span>\n
                </div>\n
                <div class="progress-bar">\n
                  <div class="progress-fill" style="width:${t.progressToNext}%; background: linear-gradient(90deg, ${t.progressToNext>=80?"#22c55e,#16a34a":t.progressToNext>=50?"#eab308,#ca8a04":"#d4af37,#b8860b"})"></div>\n
                </div>\n
                <div class="text-xs text-gray-500 mt-1.5 flex justify-between">\n
                  <span>${fmtBV(t.progressMinLeg)} / ${fmtBV(t.nextRankConfig.min_bv_leg)} BV jambe faible</span>\n
                  <span class="${"total"===t.progressBVMode?"text-rouge-400/70":"text-blue-400/70"}">${"total"===t.progressBVMode?"∞ à vie":"mensuel"}</span>\n
                </div>\n
              </div>`:"")})()}\n
        </div>\n
\n
        \x3c!-- DROITE : Volumes BV — aligné en haut, ne s'étire pas --\x3e\n
        <div class="stat-card" style="align-self:start">\n
          <h3 class="font-semibold text-white mb-4">Volumes BV détaillés</h3>\n
          <div class="space-y-2">\n
            <div class="text-xs text-rouge-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">\n
              <i class="fas fa-infinity text-[10px]"></i> BV Total à vie <span class="text-gray-500 font-normal normal-case">(pour les rangs)</span>\n
            </div>\n
            <div class="flex justify-between text-sm"><span class="text-gray-400">↳ Jambe gauche</span><span class="text-rouge-400 font-bold">${fmtBV(n.left_bv_total)}</span></div>\n
            <div class="flex justify-between text-sm"><span class="text-gray-400">↳ Jambe droite</span><span class="text-rouge-400 font-bold">${fmtBV(n.right_bv_total)}</span></div>\n
                        <div class="border-t border-dark-600 pt-2 mt-2 text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">\n
              <i class="fas fa-calendar-alt text-[10px]"></i> BV Mensuel <span class="text-gray-500 font-normal normal-case">(commissions — reset le 1er)</span>\n
            </div>\n
            <div class="flex justify-between text-sm"><span class="text-gray-400">↳ Jambe gauche</span><span class="text-blue-300">${fmtBV(n.left_bv_monthly)}</span></div>\n
            <div class="flex justify-between text-sm"><span class="text-gray-400">↳ Jambe droite</span><span class="text-blue-300">${fmtBV(n.right_bv_monthly)}</span></div>\n
                        <div class="border-t border-dark-600 pt-2 mt-2"></div>\n
            <div class="flex justify-between text-sm"><span class="text-gray-400">Total gagné</span><span class="text-green-400">${fmt$(a?.total_earned)}</span></div>\n
            <div class="flex justify-between text-sm"><span class="text-gray-400">Total retiré</span><span class="text-red-400">${fmt$(a?.total_withdrawn)}</span></div>\n
            ${(t.ccBalance?.total||0)>0?`<div class="flex justify-between text-sm"><span class="text-gray-400">Crédit Croissance</span><span class="text-pink-400">${fmt$(t.ccBalance.total)}</span></div>`:""}\n
            ${n.reserve_strategique>0?`<div class="flex justify-between text-sm"><span class="text-gray-400">Réserve Stratégique</span><span class="text-cyan-400">${fmt$(n.reserve_strategique)}</span></div>`:""}\n
          </div>\n
        </div>\n
\n
      </div>\n
\n
      \x3c!-- Bloc A+B : Prime de Leadership --\x3e\n
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">\n
        \x3c!-- Bloc A : Directs qualifiés rang à vie --\x3e\n
        <div class="stat-card" style="align-self:start">\n
          <h3 class="font-semibold text-white mb-3 flex items-center gap-2"><i class="fas fa-user-check text-rouge-400"></i> Directs Qualifiés (Rang à vie)</h3>\n
          <div class="space-y-2">\n
            <div class="flex justify-between text-sm"><span class="text-gray-400">Directs actifs validés</span><span class="text-rouge-400 font-bold">${t.directActiveCount||0}</span></div>\n
            ${t.nextRankConfig?`<div class="flex justify-between text-sm"><span class="text-gray-400">Requis prochain rang (${t.nextRankConfig.rank_name||''})</span><span class="text-blue-400">${t.nextRankConfig.min_directs||0} direct(s) ≥ ${fmt$(+(t.nextRankConfig.min_monthly_package_value||0))}</span></div>`:""}\n
            <div class="border-t border-dark-600 pt-2 mt-2">\n
              <p class="text-xs text-gray-500">Directs avec package validé ≥ au seuil configuré. Valeurs lues depuis la configuration admin.</p>\n
            </div>\n
          </div>\n
        </div>\n
        \x3c!-- Bloc B : Prime mensuelle de Leadership --\x3e\n
        <div class="stat-card" style="align-self:start">\n
          <h3 class="font-semibold text-white mb-3 flex items-center gap-2"><i class="fas fa-trophy text-rouge-400"></i> Prime Mensuelle de Leadership</h3>\n
          <div class="space-y-2">\n
            <div class="text-xs text-rouge-400 font-semibold uppercase tracking-wider mb-1">BV Jambe Faible (petite jambe)</div>\n
            <div class="flex justify-between text-sm"><span class="text-gray-400">Ce mois</span><span class="text-rouge-400 font-bold">${fmtBV(t.monthlyBvLegCurrent||0)}</span></div>\n
            <div class="flex justify-between text-sm"><span class="text-gray-400">Requis${t.rankConfig?` (${t.rankConfig.rank_name})`:""}</span><span class="text-blue-400">${fmtBV(t.monthlyBvLegRequired||0)}</span></div>\n
            <div class="w-full bg-dark-600 rounded-full h-1.5 my-1"><div class="bg-rouge-500 h-1.5 rounded-full" style="width:${t.monthlyBvLegRequired>0?Math.min(100,Math.round((t.monthlyBvLegCurrent/t.monthlyBvLegRequired)*100)):0}%"></div></div>\n
            <div class="border-t border-dark-600 pt-1 mt-1"></div>\n
            <div class="text-xs text-rouge-400 font-semibold uppercase tracking-wider mb-1">Nouvelles Recrues (ce mois)</div>\n
            <div class="flex justify-between text-sm"><span class="text-gray-400">Ce mois</span><span class="text-rouge-400 font-bold">${t.monthlyRecruitsCurrent||0}</span></div>\n
            <div class="flex justify-between text-sm"><span class="text-gray-400">Requis${t.rankConfig?` (${t.rankConfig.rank_name})`:""}</span><span class="text-blue-400">${t.monthlyRecruitsRequired||0} recrue(s) ≥ ${fmt$(+(t.monthlyPkgMinValue||0))}</span></div>\n
            <div class="border-t border-dark-600 pt-1 mt-1"></div>\n
            <div class="flex justify-between text-sm"><span class="text-gray-400">Plancher rang</span><span class="text-yellow-400">${t.monthlyFloorRanks||0} rang(s) en dessous accepté(s)</span></div>\n
            <div class="flex justify-between text-sm font-semibold"><span class="text-gray-300">Rang effectif</span><span class="${t.monthlyEffectiveRank&&t.monthlyEffectiveRank!=='none'?'text-green-400':'text-red-400'}">${t.monthlyEffectiveRank&&t.monthlyEffectiveRank!=='none'?t.monthlyEffectiveRank:'Non qualifié'}</span></div>\n
          </div>\n
        </div>\n
      </div>\n
\n
      \x3c!-- Bloc Licence Finstrategia — CDC v2 A7 : 4 états --\x3e\n
      ${(()=>{const e=new Date,t=n.license_expires_at?new Date(n.license_expires_at):null,a=t?Math.ceil((t-e)/864e5):null,s=n.license_active&&null!==a&&a<=30&&a>0,r=!n.license_active&&null!==t;return n.license_active||null!==t?s?`\n
        <div class="bg-orange-900/20 border border-orange-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">\n
          <div class="flex items-start gap-3 flex-1">\n
            <div class="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0"><i class="fas fa-triangle-exclamation text-orange-400"></i></div>\n
            <div>\n
              <p class="text-orange-300 font-semibold text-sm">Licence bientôt expirée — ${a} jour(s) restant(s)</p>\n
              <p class="text-orange-400/70 text-xs mt-0.5">Expire le ${t.toLocaleDateString("fr-FR")}. Renouvelez avant l'échéance pour ne pas perdre vos commissions.</p>\n
            </div>\n
          </div>\n
          <button onclick="showPage('license')" class="bg-orange-500 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-orange-400 transition whitespace-nowrap flex-shrink-0"><i class="fas fa-rotate-right mr-2"></i>Renouveler</button>\n
        </div>`:r?`\n
        <div class="bg-red-900/20 border border-red-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">\n
          <div class="flex items-start gap-3 flex-1">\n
            <div class="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0"><i class="fas fa-ban text-red-400"></i></div>\n
            <div>\n
              <p class="text-red-300 font-semibold text-sm">Licence expirée / suspendue</p>\n
              <p class="text-red-400/70 text-xs mt-0.5">Expirée le ${t.toLocaleDateString("fr-FR")}. Les commissions sont stoppées jusqu'au renouvellement.</p>\n
            </div>\n
          </div>\n
          <button onclick="showPage('license')" class="bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-red-500 transition whitespace-nowrap flex-shrink-0"><i class="fas fa-rotate-right mr-2"></i>Renouveler</button>\n
        </div>`:n.license_active?`\n
        <div class="bg-green-900/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">\n
          <div class="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0"><i class="fas fa-check-circle text-green-400"></i></div>\n
          <div class="flex-1">\n
            <p class="text-green-300 font-semibold text-sm">Licence active</p>\n
            <p class="text-green-400/60 text-xs mt-0.5">Valide jusqu'au ${t?t.toLocaleDateString("fr-FR"):"—"} · ${a} jour(s) restant(s)</p>\n
          </div>\n
          <button onclick="showPage('license')" class="text-xs text-green-400 hover:underline">Détails →</button>\n
        </div>`:"":`\n
        <div class="bg-dark-800 border border-rouge-500/25 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">\n
          <div class="flex items-start gap-3 flex-1">\n
            <div class="w-9 h-9 rounded-lg bg-rouge-500/15 flex items-center justify-center flex-shrink-0"><i class="fas fa-id-card text-rouge-400"></i></div>\n
            <div>\n
              <p class="text-white font-semibold text-sm">Licence Finstrategia non activée</p>\n
              <p class="text-gray-400 text-xs mt-0.5">Activez votre licence annuelle ($${_licPrice}/an) pour accéder aux commissions LEADER.</p>\n
            </div>\n
          </div>\n
          <button onclick="showPage('license')" class="bg-rouge-500 text-dark-900 font-bold px-4 py-2 rounded-xl text-sm hover:bg-rouge-500 transition whitespace-nowrap flex-shrink-0"><i class="fas fa-key mr-2"></i>Activer — $${_licPrice}/an</button>\n
        </div>`})()}\n
\n
      <!-- Duree vie package -->\n
      ${(()=>{const ap=t.activePackage;if(!ap||!ap.package_expires_at)return '';const exp=new Date(ap.package_expires_at),now=new Date(),dLeft=Math.ceil((exp-now)/86400000),soon=dLeft>0&&dLeft<=90,expired=dLeft<=0,fE=exp.toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});if(expired)return '<div class="bg-red-900/20 border border-red-500/40 rounded-xl p-4 flex items-center gap-3"><div class="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center"><i class="fas fa-calendar-times text-red-400"></i></div><div class="flex-1"><div class="font-semibold text-red-300 text-sm">Package expir\xc3\xa9</div><div class="text-xs text-gray-400 mt-0.5">'+ap.package_name+' \xe2\x80\x94 expir\xc3\xa9 le '+fE+'</div><button onclick="showPage(\'packages\')" class="mt-2 text-xs bg-red-600/20 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg"><i class="fas fa-arrow-right mr-1"></i>Renouveler</button></div></div>';if(soon)return '<div class="bg-orange-900/20 border border-orange-500/40 rounded-xl p-4 flex items-center gap-3"><div class="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center"><i class="fas fa-calendar-exclamation text-orange-400"></i></div><div class="flex-1"><div class="font-semibold text-orange-300 text-sm">Package expire bient\xc3\xb4t</div><div class="text-xs text-gray-400 mt-0.5">'+ap.package_name+' \xe2\x80\x94 expire le '+fE+' <span class="text-orange-400 font-bold">('+dLeft+'j)</span></div></div></div>';return '<div class="bg-dark-800 border border-dark-600 rounded-xl p-4 flex items-center gap-3"><div class="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center"><i class="fas fa-calendar-check text-green-400"></i></div><div class="flex-1"><div class="font-semibold text-white text-sm">'+ap.package_name+'</div><div class="text-xs text-gray-400 mt-0.5">Valide jusqu\'au <span class="text-green-400 font-medium">'+fE+'</span> \xe2\x80\x94 '+dLeft+' jour'+(dLeft>1?'s':'')+' restant'+(dLeft>1?'s':'')+' </div></div><span class="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30 font-semibold"><i class="fas fa-check mr-1"></i>Actif</span></div>';})()}\n
\n
      \x3c!-- Alertes --\x3e\n
      ${n.in_holding_tank?'<div class="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4 flex items-start gap-3"><i class="fas fa-clock text-orange-400 mt-0.5"></i><div><p class="text-orange-300 font-medium text-sm">En attente de placement</p><p class="text-orange-400/70 text-xs mt-1">Votre position dans l\'arbre binaire sera définie par votre parrain.</p></div></div>':""}\n
      ${"not_submitted"===n.kyc_status?'<div class="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3"><i class="fas fa-triangle-exclamation text-yellow-400 mt-0.5"></i><div><p class="text-yellow-300 font-medium text-sm">KYC non soumis</p><p class="text-yellow-400/70 text-xs mt-1">Complétez votre vérification d\'identité pour pouvoir effectuer des retraits. <button onclick="showPage(\'kyc\')" class="underline">Compléter maintenant</button></p></div></div>':""}\n
\n
      \x3c!-- Dernières commissions --\x3e\n
      <div class="bg-dark-800 rounded-2xl border border-dark-600 overflow-hidden">\n
        <div class="px-6 py-4 border-b border-dark-600 flex items-center justify-between">\n
          <h3 class="font-semibold text-white">Dernières opérations</h3>\n
          <button onclick="showPage('transactions')" class="text-rouge-400 text-xs hover:underline">Voir tout →</button>\n
        </div>\n
        <div class="overflow-x-auto">\n
          <table class="data-table">\n
            <thead><tr><th>Type</th><th>Description</th><th>Montant</th><th>Date</th></tr></thead>\n
            <tbody>\n
              ${(t.recentCommissions||[]).map(e=>{const txType=e.tx_type||e.type||"";const cfg=TX_TYPE_CONFIG[txType]||TX_TYPE_CONFIG.commission;const isCredit=(e.amount??0)>=0;return`\n
              <tr>\n
                <td><span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg?.badge||'bg-gray-500/15 text-gray-400'}"><i class="fas ${cfg?.icon||'fa-circle'} text-[10px]"></i>${cfg?.label||txType||"—"}</span></td>\n
                <td class="text-gray-300 text-xs truncate max-w-[140px]">${(e.description||"—").substring(0,40)}</td>\n
                <td class="font-medium ${isCredit?'text-green-400':'text-red-400'}">${isCredit?'+':'−'}${fmt$(Math.abs(e.amount??0))}</td>\n
                <td class="text-gray-500">${fmtDate(e.created_at)}</td>\n
              </tr>`}).join("")||'<tr><td colspan="4" class="text-center text-gray-500 py-8">Aucune opération pour le moment</td></tr>'}</tbody>\n
          </table>\n
        </div>\n
      </div>\n
    </div>`}catch(t){console.error("renderDashboard ERROR:",t,JSON.stringify(t));e.innerHTML=`<div class="text-red-400">Erreur : ${t?.error||t?.message||JSON.stringify(t)||"JS runtime error"}</div>`}}async function renderTeam(e){e.innerHTML='\n  <div class="space-y-4">\n    <div class="flex items-center justify-between flex-wrap gap-3">\n      <h2 class="text-xl font-bold">Mon Équipe</h2>\n    </div>\n\n    \x3c!-- Onglets --\x3e\n    <div class="flex gap-1 bg-dark-800 border border-dark-600 rounded-xl p-1 w-fit">\n      <button id="team-tab-directs" onclick="switchTeamTab(\'directs\')"\n        class="px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-dark-600 text-white">\n        <i class="fas fa-users mr-1.5"></i>Filleuls directs\n      </button>\n      <button id="team-tab-downline" onclick="switchTeamTab(\'downline\')"\n        class="px-4 py-2 rounded-lg text-sm font-semibold transition-all text-gray-400 hover:text-white">\n        <i class="fas fa-sitemap mr-1.5"></i>Arbre de parrainage\n      </button>\n    </div>\n\n    \x3c!-- Panneau filleuls directs --\x3e\n    <div id="team-panel-directs" class="bg-dark-800 rounded-2xl border border-dark-600 overflow-hidden">\n      <div class="p-4 border-b border-dark-600 flex gap-3">\n        <input id="team-search" type="text" placeholder="Rechercher un membre..." class="form-input flex-1"\n          oninput="loadTeam(this.value)">\n      </div>\n      <div id="team-table-container"></div>\n    </div>\n\n    \x3c!-- Panneau arbre de parrainage --\x3e\n    <div id="team-panel-downline" class="hidden space-y-3">\n      <div id="team-downline-container">\n        <div class="flex justify-center py-12"><div class="loader"></div></div>\n      </div>\n    </div>\n  </div>',switchTeamTab("directs"),loadTeam()}function switchTeamTab(e){["directs","downline"].forEach(t=>{const n=document.getElementById(`team-tab-${t}`),a=document.getElementById(`team-panel-${t}`);if(!n||!a)return;const s=t===e;n.className=s?"px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-dark-600 text-white":"px-4 py-2 rounded-lg text-sm font-semibold transition-all text-gray-400 hover:text-white",a.classList.toggle("hidden",!s)}),"downline"===e&&loadDownline()}async function loadTeam(e="",page,perPage){page=page||window._teamPage||1;perPage=perPage||window._teamPerPage||25;window._teamPage=page;window._teamPerPage=perPage;window._teamSearch=e!==undefined?e:(window._teamSearch||"");e=window._teamSearch;const t=document.getElementById("team-table-container");if(t){t.innerHTML='<div class="flex justify-center py-8"><div class="loader"></div></div>';try{const n=await api("GET",`/members/team?search=${encodeURIComponent(e)}&page=${page}&per_page=${perPage}`);t.innerHTML=`\n
      <div class="overflow-x-auto">\n
        <table class="data-table">\n
          <thead><tr>\n
            <th>ID</th><th>Nom</th><th class="text-blue-400"><i class="fas fa-arrow-left mr-1"></i>BV Gauche</th><th class="text-green-400"><i class="fas fa-arrow-right mr-1"></i>BV Droite</th><th>Statut</th><th>Rang</th>\n
            <th title="Nombre de filleuls directs">Filleuls</th><th>Inscription</th>\n
          </tr></thead>\n
          <tbody>\n
            ${(n.members||[]).map(e=>`\n
            <tr>\n
              <td class="text-rouge-400 font-mono text-xs">${e.unique_id}</td>\n
              <td class="font-medium">${e.first_name} ${e.last_name}</td>\n
              <td class="text-blue-400 font-semibold text-center">${fmtBV(e.left_bv_monthly)}</td><td class="text-green-400 font-semibold text-center">${fmtBV(e.right_bv_monthly)}</td>\n
              <td>${statusBadge(e.member_status)}</td>\n
              <td>${rankBadge(e.current_rank)}</td>\n
              <td class="text-center text-sm">${e.direct_count||0}</td>\n
              <td class="text-gray-500 text-xs">${fmtDate(e.created_at)}</td>\n
            </tr>`).join("")||'<tr><td colspan="9" class="text-center text-gray-500 py-8">Aucun filleul direct</td></tr>'}\n
          </tbody>\n
        </table>\n
      </div>\n
      <div class="px-6 py-3 text-sm text-gray-500 border-t border-dark-600 flex items-center justify-between gap-4"><span>${n.total||0} filleul(s) direct(s)</span><div id="team-pagination"></div></div>`;renderPagination("team-pagination",n.total||0,page,perPage,"(function(p){loadTeam(window._teamSearch,p,window._teamPerPage)})","(function(pp,p){loadTeam(window._teamSearch,p,pp)})");}catch(e){t.innerHTML=`<div class="p-4 text-red-400">Erreur : ${e.error}</div>`}}}document.addEventListener("keydown",e=>{"Enter"===e.key&&(document.getElementById("login-form").classList.contains("hidden")||doLogin())});let _downlineCache=null;async function loadDownline(e=!1){const t=document.getElementById("team-downline-container");if(t)if(!_downlineCache||e){t.innerHTML='<div class="flex justify-center py-12"><div class="loader"></div></div>';try{const s=await api("GET","/members/downline");if(!s.tree||0===s.tree.length)return _downlineCache='<div class="bg-dark-800 rounded-2xl border border-dark-600 p-12 text-center">\n        <i class="fas fa-sitemap text-4xl text-gray-600 mb-4 block"></i>\n        <p class="text-gray-400 font-medium">Votre réseau de parrainage est vide</p>\n        <p class="text-gray-600 text-sm mt-1">Les personnes que vous parrainez apparaîtront ici, ainsi que leurs propres filleuls.</p>\n      </div>',void(t.innerHTML=_downlineCache);function n(e,t){const s=24*t,r=0===t,i={captain:"#791E15",commander:"#A78BFA",admiral:"#60A5FA",vice_admiral:"#34D399",ambassador:"#F97316",diamond:"#38BDF8",triple_diamond:"#E879F9",crown:"#EF4444"}[e.current_rank]||"#6B7280",l=`${(e.first_name||"?")[0]}${(e.last_name||"?")[0]}`.toUpperCase(),d=e.children&&e.children.length>0,o=`dn-${e.id.substring(0,8)}`,c=a(e);return`\n
      <div class="downline-node" style="margin-left:${s}px">\n
        \x3c!-- Connecteur vertical --\x3e\n
        ${t>0?`<div class="downline-connector" style="margin-left:${-s}px;padding-left:${s}px"></div>`:""}\n
        <div class="flex items-center gap-2.5 py-1.5 group">\n
          \x3c!-- Fil de branche --\x3e\n
          ${t>0?'\n          <div class="flex-shrink-0 flex items-center" style="width:20px;margin-left:-20px">\n            <div style="width:16px;height:1px;background:#374151"></div>\n          </div>':""}\n
\n
          \x3c!-- Avatar initiales + couleur rang --\x3e\n
          <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"\n
               style="background:${i}22;border:1.5px solid ${i};color:${i}">\n
            ${l}\n
          </div>\n
\n
          \x3c!-- Infos membre --\x3e\n
          <div class="flex-1 min-w-0">\n
            <div class="flex items-center gap-2 flex-wrap">\n
              <span class="font-semibold text-sm text-white">${e.first_name} ${e.last_name}</span>\n
              ${rankBadge(e.current_rank)}\n
              ${e.activation_done?"":'<span class="text-[10px] bg-orange-500/15 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded-full">Non activé</span>'}\n
            </div>\n
            <div class="flex items-center gap-3 mt-0.5 flex-wrap">\n
              <span class="text-[11px] text-gray-500 font-mono">${e.unique_id}</span>\n
              ${r?'<span class="text-[10px] text-indigo-400"><i class="fas fa-hand-point-right mr-0.5"></i>Filleul direct</span>':`<span class="text-[10px] text-gray-600">Profondeur ${t+1}</span>`}\n
              ${d?`<button onclick="toggleDownlineNode('${o}')"\n
                class="text-[10px] text-rouge-400 hover:text-rouge-400 transition flex items-center gap-1">\n
                <i class="fas fa-chevron-down" id="${o}-icon"></i>\n
                <span>${e.children.length} filleul${e.children.length>1?"s":""} direct${e.children.length>1?"s":""}</span>\n
                ${c>e.children.length?`<span class="text-gray-500">(${c} total)</span>`:""}\n
              </button>`:""}\n
            </div>\n
          </div>\n
\n
          \x3c!-- BV sommaire --\x3e\n
          <div class="hidden sm:flex gap-3 text-right flex-shrink-0">\n
            <div class="text-xs">\n
              <div class="text-gray-600 text-[10px]">BV G</div>\n
              <div class="text-blue-400 font-semibold">${fmtBV(e.left_bv_total)}</div>\n
            </div>\n
            <div class="text-xs">\n
              <div class="text-gray-600 text-[10px]">BV D</div>\n
              <div class="text-green-400 font-semibold">${fmtBV(e.right_bv_total)}</div>\n
            </div>\n
          </div>\n
        </div>\n
\n
        \x3c!-- Enfants (repliables) --\x3e\n
        ${d?`\n
        <div id="${o}-children" class="border-l border-dark-600 ml-4"\n
             style="padding-left:0;margin-top:2px">\n
          ${e.children.map(e=>n(e,t+1)).join("")}\n
        </div>`:""}\n
      </div>`}function a(e){return e.children&&e.children.length?e.children.length+e.children.reduce((e,t)=>e+a(t),0):0}const r=`\n
    <div class="grid grid-cols-3 gap-3 mb-4">\n
      <div class="bg-dark-800 border border-dark-600 rounded-xl p-3 text-center">\n
        <div class="text-2xl font-black text-white">${s.totalCount}</div>\n
        <div class="text-xs text-gray-500 mt-0.5">Membres dans le réseau</div>\n
      </div>\n
      <div class="bg-dark-800 border border-dark-600 rounded-xl p-3 text-center">\n
        <div class="text-2xl font-black text-green-400">${s.activeCount}</div>\n
        <div class="text-xs text-gray-500 mt-0.5">Licences actives</div>\n
      </div>\n
      <div class="bg-dark-800 border border-dark-600 rounded-xl p-3 text-center">\n
        <div class="text-2xl font-black text-indigo-400">${s.tree.length}</div>\n
        <div class="text-xs text-gray-500 mt-0.5">Filleuls directs</div>\n
      </div>\n
    </div>`,i=`\n
    <div class="bg-dark-800 border border-dark-600 rounded-2xl p-5">\n
      <div class="flex items-center justify-between mb-4">\n
        <div class="flex items-center gap-2">\n
          <i class="fas fa-sitemap text-indigo-400"></i>\n
          <span class="font-semibold text-white">Arbre de parrainage</span>\n
          <span class="text-xs text-gray-500">— qui a parrainé qui dans votre réseau</span>\n
        </div>\n
        <button onclick="loadDownline(true)" class="text-xs text-gray-400 hover:text-white transition px-2 py-1 rounded bg-dark-700 border border-dark-600">\n
          <i class="fas fa-rotate-right mr-1"></i>Actualiser\n
        </button>\n
      </div>\n
      <style>\n
        .downline-node { position:relative; }\n
      </style>\n
      <div class="space-y-0.5">\n
        ${s.tree.map(e=>n(e,0)).join("")}\n
      </div>\n
    </div>`;_downlineCache=r+i,t.innerHTML=_downlineCache}catch(l){t.innerHTML=`<div class="p-4 text-red-400">Erreur : ${l.error||l.message}</div>`}}else t.innerHTML=_downlineCache}function toggleDownlineNode(e){const t=document.getElementById(`${e}-children`),n=document.getElementById(`${e}-icon`);if(!t)return;const a="none"===t.style.display;t.style.display=a?"":"none",n&&(n.className=a?"fas fa-chevron-down":"fas fa-chevron-right")}const SVG_NW=154,SVG_NH=108,SVG_HGAP=36,SVG_VGAP=80;function treeMaxDepth(e){return e?1+Math.max(treeMaxDepth(e.left),treeMaxDepth(e.right)):0}function svgAssignPositions(e,t,n){if(!e)return 190;const a=e.left?svgAssignPositions(e.left,t+1,n):190,s=a+(e.right?svgAssignPositions(e.right,t+1,n+a):190);return e._x=n+a-95,e._y=188*t,e.left&&svgAssignPositions(e.left,t+1,n),e.right&&svgAssignPositions(e.right,t+1,n+a),s}function svgBezier(e,t,n,a){const s=(t+a)/2;return`M${e},${t} C${e},${s} ${n},${s} ${n},${a}`}function svgCollectElements(e,t,n,a,s,r,i,l,d,o){if(!e){if(null!==i&&null!==d){const e=i-77,t=l+108+40;a.push(`<path d="${svgBezier(i,l+108,i,t)}" stroke="#374151" stroke-width="1.5" fill="none" stroke-dasharray="5,4"/>`);const n=currentMember&&currentMember.unique_id?currentMember.unique_id:o,s=`/register?sponsor=${encodeURIComponent(n)}&parent=${encodeURIComponent(o)}&position=${d}`;r.push(`\n
        <a href="${s}" target="_blank" title="S'inscrire ici (${"L"===d?"Gauche":"Droite"})">\n
          <rect x="${e}" y="${t}" width="154" height="108" rx="12"\n
                fill="#111827" stroke="#374151" stroke-width="1.5" stroke-dasharray="6,4"\n
                class="svg-slot-view"/>\n
          <text x="${e+77}" y="${t+36}" text-anchor="middle" fill="#4B5563" font-size="20" font-family="sans-serif">+</text>\n
          <text x="${e+77}" y="${t+58}" text-anchor="middle" fill="#6B7280" font-size="10" font-family="sans-serif">Position libre</text>\n
          <text x="${e+77}" y="${t+72}" text-anchor="middle" fill="#4B5563" font-size="9" font-family="sans-serif">Cliquer pour s'inscrire</text>\n
        </a>`)}return}const c=e._x+77,x=e._y;if(null!==i&&a.push(`<path d="${svgBezier(i,l+108,c,x)}" stroke="#374151" stroke-width="1.5" fill="none"/>`),null!==d){const e="L"===d?"#60A5FA":"#34D399";s.push(`<text x="${c}" y="${x-14}" text-anchor="middle" fill="${e}" font-size="9" font-weight="700" font-family="sans-serif">${"L"===d?"G":"D"}</text>`)}const p=e.in_holding_tank,m={captain:"#791E15",commander:"#A78BFA",admiral:"#60A5FA",vice_admiral:"#34D399",ambassador:"#F97316",diamond:"#38BDF8",triple_diamond:"#E879F9",crown:"#EF4444"},u=p?"#FB923C":m[e.current_rank]||"#374151",g=p?"#431407":"#1F2937",f=`${(e.first_name||"?")[0]}${(e.last_name||"?")[0]}`.toUpperCase(),b={captain:"Capt.",commander:"Cmdr.",admiral:"Adm.",vice_admiral:"V-Adm.",ambassador:"Ambas.",diamond:"Diam.",triple_diamond:"3xDiam.",crown:"Crown",membre:"Mbr."}[e.current_rank]||e.current_rank||"",v=m[e.current_rank]||"#9CA3AF";s.push(`\n
    <g class="svg-node-member" title="${e.unique_id}">\n
      <rect x="${e._x}" y="${x}" width="154" height="108" rx="12"\n
            fill="${g}" stroke="${u}" stroke-width="${p?2:1.5}"/>\n
      <circle cx="${c}" cy="${x+28}" r="18" fill="#111827" stroke="${u}" stroke-width="1.5"/>\n
      <text x="${c}" y="${x+33}" text-anchor="middle" fill="${v}" font-size="11" font-weight="700" font-family="sans-serif">${f}</text>\n
      <text x="${c}" y="${x+56}" text-anchor="middle" fill="#F9FAFB" font-size="10" font-weight="600" font-family="sans-serif">${(e.first_name+" "+e.last_name).substring(0,18)}</text>\n
      <text x="${c}" y="${x+68}" text-anchor="middle" fill="#9CA3AF" font-size="8.5" font-family="monospace">${e.unique_id}</text>\n
      <rect x="${c-28}" y="${x+73}" width="56" height="13" rx="6" fill="${v}22"/>\n
      <text x="${c}" y="${x+83}" text-anchor="middle" fill="${v}" font-size="8" font-weight="700" font-family="sans-serif">${b}</text>\n
      <text x="${c}" y="${x+93}" text-anchor="middle" fill="#6B7280" font-size="8" font-family="sans-serif">${e.member_status||""}</text>\n
      <text x="${e._x+8}" y="${x+102}" fill="#60A5FA" font-size="8" font-family="sans-serif">G:${fmtBV(e.left_bv_monthly)}</text>\n
      <text x="${e._x+154-8}" y="${x+102}" text-anchor="end" fill="#34D399" font-size="8" font-family="sans-serif">D:${fmtBV(e.right_bv_monthly)}</text>\n
      ${p?`<text x="${c}" y="${x+8}" text-anchor="middle" fill="#FB923C" font-size="7.5" font-weight="700" font-family="sans-serif">HOLDING</text>`:""}\n
    </g>`),t<n&&(svgCollectElements(e.left,t+1,n,a,s,r,c,x,"L",e.unique_id),svgCollectElements(e.right,t+1,n,a,s,r,c,x,"R",e.unique_id))}function renderTreeSVG(e){const t=Math.min(treeMaxDepth(e),5),n=svgAssignPositions(e,0,0),a=188*(t+1)+40,s=[],r=[],i=[];return svgCollectElements(e,0,t,s,r,i,null,null,null,null),`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(n+36,400)}" height="${a}" style="display:block;overflow:visible">\n
    <style>\n
      .svg-slot-view rect { transition: stroke 0.2s, fill 0.2s; }\n
      .svg-slot-view:hover rect { stroke: #5A1510 !important; fill: #1C1003 !important; }\n
      .svg-slot-view:hover text { fill: #791E15 !important; }\n
      .svg-node-member rect { transition: stroke 0.15s; }\n
    </style>\n
    <g transform="translate(18, 20)">\n
      ${s.join("\n")}\n
      ${i.join("\n")}\n
      ${r.join("\n")}\n
    </g>\n
  </svg>`}function svgPanZoomWrapper(e,t,n=""){return`\n
  <div style="position:relative; background:#111827; border-radius:16px; border:1px solid #374151; overflow:hidden; height:480px; cursor:grab; user-select:none;" id="${t}-vp">\n
    <div id="${t}-canvas" style="position:absolute; top:0; left:0; transform-origin:0 0; transform:translate(0px,0px) scale(1); will-change:transform; padding:24px;">\n
      ${e}\n
    </div>\n
    <div style="position:absolute; bottom:12px; right:12px; display:flex; gap:6px; z-index:10;">\n
      ${n}\n
      <button onclick="svgZoom('${t}',1.25)" style="width:32px;height:32px;background:#1F2937;border:1px solid #374151;border-radius:8px;color:#9CA3AF;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Zoom +">+</button>\n
      <button onclick="svgZoom('${t}',0.8)"  style="width:32px;height:32px;background:#1F2937;border:1px solid #374151;border-radius:8px;color:#9CA3AF;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Zoom −">−</button>\n
      <button onclick="svgReset('${t}')"     style="width:32px;height:32px;background:#1F2937;border:1px solid #374151;border-radius:8px;color:#9CA3AF;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Réinitialiser">Haut</button>\n
    </div>\n
    <div style="position:absolute;bottom:12px;left:12px;font-size:10px;color:#6B7280;pointer-events:none;"><i class="fas fa-hand-paper" style="margin-right:4px"></i>Glisser · Molette / boutons</div>\n
  </div>`}function svgInitPanZoom(e){const t=document.getElementById(e+"-vp"),n=document.getElementById(e+"-canvas");if(!t||!n)return;const a={tx:0,ty:0,scale:1};function s(){n.style.transform=`translate(${a.tx}px,${a.ty}px) scale(${a.scale})`}window._svgPZ[e]=a;let r=!1,i=0,l=0;t.addEventListener("mousedown",e=>{0===e.button&&(r=!0,i=e.clientX-a.tx,l=e.clientY-a.ty,t.style.cursor="grabbing",e.preventDefault())}),window.addEventListener("mousemove",e=>{r&&(a.tx=e.clientX-i,a.ty=e.clientY-l,s())}),window.addEventListener("mouseup",()=>{r=!1,t.style.cursor="grab"});let d=0,o=0;t.addEventListener("touchstart",e=>{1===e.touches.length&&(d=e.touches[0].clientX,o=e.touches[0].clientY)},{passive:!0}),t.addEventListener("touchmove",e=>{1===e.touches.length&&(a.tx+=e.touches[0].clientX-d,a.ty+=e.touches[0].clientY-o,d=e.touches[0].clientX,o=e.touches[0].clientY,s())},{passive:!0}),t.addEventListener("wheel",e=>{e.preventDefault();const n=t.getBoundingClientRect(),r=e.clientX-n.left,i=e.clientY-n.top,l=e.deltaY>0?.88:1.14,d=Math.min(3,Math.max(.15,a.scale*l));a.tx=r-(r-a.tx)*(d/a.scale),a.ty=i-(i-a.ty)*(d/a.scale),a.scale=d,s()},{passive:!1})}function svgZoom(e,t){const n=window._svgPZ[e];if(!n)return;const a=document.getElementById(e+"-vp");if(!a)return;const s=document.getElementById(e+"-canvas"),r=a.getBoundingClientRect(),i=r.width/2,l=r.height/2,d=Math.min(3,Math.max(.15,n.scale*t));n.tx=i-(i-n.tx)*(d/n.scale),n.ty=l-(l-n.ty)*(d/n.scale),n.scale=d,s.style.transform=`translate(${n.tx}px,${n.ty}px) scale(${n.scale})`}function svgReset(e){const t=window._svgPZ[e];if(!t)return;t.tx=0,t.ty=0,t.scale=1;const n=document.getElementById(e+"-canvas");n&&(n.style.transform="translate(0px,0px) scale(1)")}window._svgPZ={};let _fullTree=null,_classicRoot=null,_classicFocus=null,_classicNavStack=[];const CLASSIC_DEPTH=4;function collectAllNodes(e,t=[]){return e?(t.push(e),collectAllNodes(e.left,t),collectAllNodes(e.right,t),t):t}function findNodesByQuery(e){if(!_fullTree||!e||e.trim().length<1)return[];const t=e.trim().toLowerCase(),n=collectAllNodes(_fullTree),a=[];for(const e of n){const n=`${e.first_name||""} ${e.last_name||""}`.toLowerCase(),s=(e.unique_id||"").toLowerCase(),r=(e.first_name||"").toLowerCase(),i=(e.last_name||"").toLowerCase();if((s.includes(t)||n.includes(t)||r.startsWith(t)||i.startsWith(t))&&(a.push(e),a.length>=8))break}return a}function treeSearchNavigateTo(e){const t=findNodeById(_fullTree,e);if(!t)return;const n=document.getElementById("tree-search-dropdown"),a=document.getElementById("tree-search-input");if(n&&n.classList.add("hidden"),a&&(a.value=""),_classicNavStack.push(_classicFocus),_classicFocus=t,"svg"===getTreeMode()){const e=document.getElementById("member-tree-wrap");if(!e)return;const n=renderTreeSVG(t);e.innerHTML=svgPanZoomWrapper(n,"member-tree"),svgInitPanZoom("member-tree")}else renderClassicTreeInner()}function renderTreeSearchResults(e){const t=document.getElementById("tree-search-dropdown");if(!t)return;if(!e||e.trim().length<1)return void t.classList.add("hidden");const n=findNodesByQuery(e);if(0===n.length)return t.innerHTML=`\n
      <div class="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">\n
        <i class="fas fa-search-minus text-gray-600"></i>\n
        Aucun résultat pour <strong class="text-gray-400 ml-1">"${e}"</strong>\n
      </div>`,void t.classList.remove("hidden");const a={captain:"text-yellow-400",commander:"text-purple-400",admiral:"text-blue-400",vice_admiral:"text-green-400",ambassador:"text-orange-400",diamond:"text-sky-400",triple_diamond:"text-fuchsia-400",crown:"text-red-400"};t.innerHTML=n.map((e,t)=>{const n=a[e.current_rank]||"text-rouge-400",s=`${(e.first_name||"?")[0]}${(e.last_name||"?")[0]}`.toUpperCase(),r=e.id===_classicRoot?.id,i=fmtBV(e.left_bv_monthly),l=fmtBV(e.right_bv_monthly);return`\n
    <div class="tree-search-result flex items-center gap-3 px-4 py-2.5 hover:bg-dark-700 cursor-pointer transition-colors\n
                ${t>0?"border-t border-dark-600/50":""}"\n
         onclick="treeSearchNavigateTo('${e.id}')"\n
         onmousedown="event.preventDefault()">\n
      <div class="w-8 h-8 rounded-full bg-dark-900 border border-dark-500 flex items-center justify-center\n
                  text-[11px] font-bold ${n} flex-shrink-0">\n
        ${s}\n
      </div>\n
      <div class="flex-1 min-w-0">\n
        <div class="text-sm font-semibold text-white truncate">\n
          ${e.first_name} ${e.last_name}\n
          ${r?'<span class="ml-1.5 text-[9px] text-rouge-500 font-medium bg-rouge-500/10 px-1.5 py-0.5 rounded-full">Vous</span>':""}\n
        </div>\n
        <div class="flex items-center gap-2 mt-0.5">\n
          <span class="text-[10px] text-gray-500 font-mono">${e.unique_id}</span>\n
          <span class="text-[10px] text-blue-400">G:${i}</span>\n
          <span class="text-[10px] text-green-400">D:${l}</span>\n
        </div>\n
      </div>\n
      <div class="flex-shrink-0">${rankBadge(e.current_rank)}</div>\n
    </div>`}).join(""),t.classList.remove("hidden")}function initTreeSearch(){const e=document.getElementById("tree-search-input"),t=document.getElementById("tree-search-dropdown");e&&t&&(e.addEventListener("input",e=>renderTreeSearchResults(e.target.value)),e.addEventListener("focus",e=>{e.target.value&&renderTreeSearchResults(e.target.value)}),e.addEventListener("blur",()=>setTimeout(()=>t.classList.add("hidden"),150)),e.addEventListener("keydown",n=>{if("Escape"===n.key&&(t.classList.add("hidden"),e.blur()),"Enter"===n.key){const e=t.querySelector(".tree-search-result");e&&e.click()}}),document.addEventListener("keydown",t=>{"/"!==t.key||document.activeElement===e||["INPUT","TEXTAREA"].includes(document.activeElement?.tagName)||(t.preventDefault(),e.focus())}))}function findNodeById(e,t){return e?e.id===t?e:findNodeById(e.left,t)||findNodeById(e.right,t):null}function classicNavigateTo(e){const t=findNodeById(_fullTree,e);t&&(_classicNavStack.push(_classicFocus),_classicFocus=t,renderClassicTreeInner())}function classicGoBack(){0!==_classicNavStack.length&&(_classicFocus=_classicNavStack.pop(),renderClassicTreeInner())}function classicGoHome(){_classicNavStack=[],_classicFocus=_classicRoot,renderClassicTreeInner()}function renderClassicNode(e,t,n=!1){if(!e)return"";const a=n,s=e.in_holding_tank?'<div class="text-[9px] text-orange-400 mt-0.5"><i class="fas fa-clock mr-0.5"></i>Holding</div>':"",r=!a,i=`\n
    tree-node-card ${{captain:"border-yellow-500/60 ring-yellow-500/20",commander:"border-purple-500/60 ring-purple-500/20",admiral:"border-blue-400/60 ring-blue-400/20",vice_admiral:"border-green-400/60 ring-green-400/20",ambassador:"border-orange-500/60 ring-orange-500/20",diamond:"border-sky-400/60 ring-sky-400/20",triple_diamond:"border-fuchsia-500/60 ring-fuchsia-500/20",crown:"border-red-500/60 ring-red-500/20"}[e.current_rank]||"border-dark-500 ring-dark-500/0"}\n
    ${a?"ring-2 bg-dark-700 scale-105 shadow-lg shadow-black/40":""}\n
    ${r?"cursor-pointer hover:border-rouge-500/60 hover:bg-dark-700 transition-all":"cursor-default"}\n
  `,l=`\n
    <div class="w-9 h-9 rounded-full bg-dark-900 flex items-center justify-center mx-auto mb-2 text-xs font-bold ${{captain:"text-yellow-400",commander:"text-purple-400",admiral:"text-blue-400",vice_admiral:"text-green-400",ambassador:"text-orange-400",diamond:"text-sky-400",triple_diamond:"text-fuchsia-400",crown:"text-red-400"}[e.current_rank]||"text-rouge-400"} ${a?"ring-2 ring-gold-500/40":""}">\n
      ${(e.first_name||"?")[0]}${(e.last_name||"?")[0]}\n
    </div>\n
    <div class="text-xs font-semibold text-white truncate">${e.first_name} ${e.last_name}</div>\n
    <div class="text-[10px] text-gray-400 font-mono">${e.unique_id}</div>\n
    <div class="mt-1">${rankBadge(e.current_rank)}</div>\n
    ${s}\n
    ${e.member_status?`<div class="text-[9px] text-gray-400 mt-0.5">${e.member_status}</div>`:""}\n
    <div class="mt-1 flex justify-center gap-2 text-[9px]">\n
      <span class="text-blue-400">G:${fmtBV(e.left_bv_monthly)}</span>\n
      <span class="text-green-400">D:${fmtBV(e.right_bv_monthly)}</span>\n
    </div>\n
    ${a?'<div class="text-[9px] text-rouge-500/70 mt-1 font-medium">Vue actuelle</div>':""}\n
  `,d=r?`<div class="${i}" onclick="classicNavigateTo('${e.id}')" title="Voir l'arbre depuis ${e.first_name}">${l}</div>`:`<div class="${i}">${l}</div>`;if(t>=3)return`<div class="tree-node">${d}</div>`;const o=(e,t)=>{const n=currentMember&&currentMember.unique_id?currentMember.unique_id:e;return`<div class="tree-node">\n
      <a href="/register?sponsor=${encodeURIComponent(n)}&parent=${encodeURIComponent(e)}&position=${t}" target="_blank"\n
         class="tree-node-card empty group cursor-pointer hover:border-rouge-500/60 hover:bg-rouge-500/5 transition-all">\n
        <div class="w-8 h-8 rounded-full border-2 border-dashed border-gray-600 group-hover:border-rouge-500\n
                    flex items-center justify-center mx-auto mb-2 transition-colors">\n
          <i class="fas fa-plus text-gray-600 group-hover:text-rouge-400 text-xs transition-colors"></i>\n
        </div>\n
        <div class="text-gray-500 group-hover:text-rouge-400 text-[10px] font-medium transition-colors">Slot libre</div>\n
        <div class="text-gray-600 group-hover:text-rouge-500/70 text-[9px] mt-0.5 transition-colors">S'inscrire ici</div>\n
      </a>\n
    </div>`};return`\n
  <div class="tree-node">\n
    ${d}\n
    <div class="tree-connector"></div>\n
    <div class="tree-children">\n
      <div class="flex flex-col items-center">\n
        <div class="text-[10px] text-blue-400 mb-1 font-medium">Gauche</div>\n
        ${e.left?renderClassicNode(e.left,t+1):o(e.unique_id,"L")}\n
      </div>\n
      <div class="flex flex-col items-center">\n
        <div class="text-[10px] text-green-400 mb-1 font-medium">Droite</div>\n
        ${e.right?renderClassicNode(e.right,t+1):o(e.unique_id,"R")}\n
      </div>\n
    </div>\n
  </div>`}function renderClassicTreeInner(){const e=document.getElementById("member-tree-wrap");if(!e||!_classicFocus)return;const t=_classicFocus.id===_classicRoot.id,n=_classicNavStack.length>0,a=_classicNavStack.length>0?_classicNavStack.map((e,t)=>`\n
        <span class="text-gray-500 text-xs">${0===t?'<i class="fas fa-home text-[10px]"></i>':""} ${e.first_name}</span>\n
        <span class="text-gray-600 text-xs">›</span>`).join(""):"";e.innerHTML=`\n
  \x3c!-- Barre de navigation --\x3e\n
  <div class="flex items-center gap-2 mb-3 flex-wrap">\n
    <button onclick="classicGoHome()"\n
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition\n
             ${t?"bg-dark-700 text-gray-500 cursor-default":"bg-dark-700 text-gray-300 hover:bg-dark-600 hover:text-white border border-dark-500"}"\n
      ${t?"disabled":""}>\n
      <i class="fas fa-home text-[11px]"></i> Racine\n
    </button>\n
    <button onclick="classicGoBack()"\n
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition\n
             ${n?"bg-dark-700 text-gray-300 hover:bg-dark-600 hover:text-white border border-dark-500":"bg-dark-700 text-gray-500 cursor-default"}"\n
      ${n?"":"disabled"}>\n
      <i class="fas fa-arrow-left text-[11px]"></i> Remonter\n
    </button>\n
    \x3c!-- Breadcrumb --\x3e\n
    <div class="flex items-center gap-1 text-xs text-gray-500 overflow-x-auto flex-1 min-w-0">\n
      ${a}\n
      <span class="text-rouge-400 font-semibold text-xs">${_classicFocus.first_name} ${_classicFocus.last_name}</span>\n
    </div>\n
    <span class="text-[10px] text-gray-600 hidden sm:block">\n
      <i class="fas fa-hand-pointer mr-1"></i>Cliquer un membre pour descendre\n
    </span>\n
  </div>\n
\n
  \x3c!-- Arbre HTML --\x3e\n
  <div class="bg-dark-800 rounded-2xl border border-dark-600 p-6 overflow-x-auto">\n
    <div class="flex justify-center">\n
      <div class="inline-flex flex-col items-center text-center">\n
        ${renderClassicNode(_classicFocus,0,!0)}\n
      </div>\n
    </div>\n
  </div>`}function getTreeMode(){return localStorage.getItem("tree_mode")||"classic"}function setTreeMode(e){localStorage.setItem("tree_mode",e)}function toggleTreeMode(){const e="classic"===getTreeMode()?"svg":"classic";setTreeMode(e),_renderTreeWithMode(e),_updateTreeToggleBtn(e)}function _updateTreeToggleBtn(e){const t=document.getElementById("tree-toggle-btn");t&&("classic"===e?(t.innerHTML='<i class="fas fa-diagram-project mr-1.5"></i>Vue SVG',t.title="Passer en vue SVG (pan/zoom)"):(t.innerHTML='<i class="fas fa-sitemap mr-1.5"></i>Vue Classique',t.title="Passer en vue classique (navigation par clic)"))}function _renderTreeWithMode(e){if(_fullTree)if("classic"===e)_classicFocus||(_classicFocus=_classicRoot,_classicNavStack=[]),renderClassicTreeInner();else{const e=document.getElementById("member-tree-wrap");if(!e)return;e.innerHTML="";const t=renderTreeSVG(_fullTree);e.innerHTML=svgPanZoomWrapper(t,"member-tree"),svgInitPanZoom("member-tree")}}async function renderTree(e){const t=getTreeMode();e.innerHTML='\n  <div class="space-y-3">\n    \x3c!-- Header : titre + recherche + toggle --\x3e\n    <div class="flex items-center gap-3 flex-wrap">\n      <h2 class="text-xl font-bold flex-shrink-0">Arbre Binaire</h2>\n\n      \x3c!-- Barre de recherche premium --\x3e\n      <div class="relative flex-1 min-w-[200px] max-w-sm" id="tree-search-box">\n        <div class="relative">\n          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none"></i>\n          <input id="tree-search-input" type="text" autocomplete="off"\n            placeholder="Rechercher… ID, prénom ou nom"\n            class="w-full bg-dark-800 border border-dark-500 text-gray-200 text-sm rounded-xl\n                   pl-8 pr-8 py-1.5 focus:outline-none focus:ring-0/60 focus:ring-1\n                   focus:ring-gold-500/20 placeholder-gray-600 transition">\n          <kbd class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600\n                      bg-dark-700 border border-dark-500 rounded px-1 py-0.5 font-mono\n                      pointer-events-none select-none hidden sm:block">/</kbd>\n        </div>\n        \x3c!-- Dropdown résultats --\x3e\n        <div id="tree-search-dropdown"\n             class="hidden absolute z-50 left-0 right-0 top-full mt-1.5\n                    bg-dark-800 border border-dark-500/80 rounded-xl shadow-2xl\n                    overflow-hidden max-h-72 overflow-y-auto">\n        </div>\n      </div>\n\n      \x3c!-- Bouton toggle vue --\x3e\n      <button id="tree-toggle-btn"\n        onclick="toggleTreeMode()"\n        class="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 border border-dark-500 text-gray-300\n               hover:bg-dark-600 hover:text-white rounded-xl text-xs font-medium transition flex-shrink-0">\n      </button>\n    </div>\n\n    <div id="member-tree-wrap">\n      <div class="flex justify-center py-16"><div class="loader"></div></div>\n    </div>\n  </div>',_updateTreeToggleBtn(t);try{const e=await api("GET","/members/tree?depth=12");if(!e.tree)return void(document.getElementById("member-tree-wrap").innerHTML='\n        <div class="bg-dark-800 rounded-2xl border border-dark-600 p-10 text-center text-gray-400">\n          <i class="fas fa-tree text-4xl text-gray-600 mb-4 block"></i>\n          Vous n\'êtes pas encore placé dans l\'arbre binaire.\n        </div>');_fullTree=e.tree,_classicRoot=e.tree,_classicFocus=e.tree,_classicNavStack=[],initTreeSearch(),_renderTreeWithMode(t)}catch(e){document.getElementById("member-tree-wrap").innerHTML=`<div class="bg-dark-800 rounded-2xl border border-dark-600 p-6 text-red-400">Erreur : ${e.error||e.message}</div>`}}async function renderBV(e,page,perPage){page=page||window._bvPage||1;perPage=perPage||window._bvPerPage||25;window._bvPage=page;window._bvPerPage=perPage;e.innerHTML='<div class="space-y-4"><h2 class="text-xl font-bold">Journal BV</h2><div class="bg-dark-800 rounded-2xl border border-dark-600 overflow-hidden"><div id="bv-table"></div></div></div>';try{const d=await api("GET",`/members/bv-journal?page=${page}&per_page=${perPage}`);function bvBadge(v){var lbl={personal:"Personnel",propagated:"Propag\u00e9",fast_start_contribution:"Fast Start"};var col={personal:"bg-emerald-500/20 text-emerald-400",propagated:"bg-blue-500/20 text-blue-400",fast_start_contribution:"bg-orange-500/20 text-orange-400"};return'<span class="text-xs px-2 py-0.5 rounded-full '+(col[v]||"bg-gray-500/20 text-gray-400")+'">'+(lbl[v]||v)+"</span>";}function srcRank(r){return r&&r!=="none"?rankBadge(r):'<span class="text-gray-600 text-xs">—</span>'}function bvCell(v,cls){return v!=null?'<span class="'+cls+' font-semibold">'+fmtBV(v)+"</span>":'<span class="text-gray-600">—</span>';}var rows=(d.logs||[]).map(function(l){var src=l.first_name?'<div class="font-medium text-sm text-white">'+l.first_name+" "+l.last_name+'</div><div class="text-xs text-rouge-400/70 font-mono">'+l.source_unique_id+"</div>":'<span class="text-gray-600">—</span>';return "<tr>"+"<td>"+bvBadge(l.bv_type)+"</td>"+"<td class=\"text-rouge-400 font-bold\">"+fmtBV(l.bv_amount)+"</td>"+"<td>"+src+"</td>"+"<td>"+srcRank(l.source_rank)+"</td>"+"<td>"+bvCell(l.source_left_bv,"text-blue-400")+"</td>"+"<td>"+bvCell(l.source_right_bv,"text-green-400")+"</td>"+"<td class=\"text-gray-400\">"+( l.period||"—")+"</td>"+"<td class=\"text-gray-500 text-xs\">"+fmtDate(l.created_at)+"</td>"+"</tr>";}).join("")||'<tr><td colspan="8" class="text-center text-gray-500 py-8">Aucun BV enregistr\u00e9</td></tr>';document.getElementById("bv-table").innerHTML='<div class="overflow-x-auto"><table class="data-table"><thead><tr>'+'<th>Type</th><th>Montant BV</th><th>Source</th><th>Rang</th>'+'<th class="text-blue-400"><i class="fas fa-arrow-left mr-1"></i>BV Gauche</th>'+'<th class="text-green-400"><i class="fas fa-arrow-right mr-1"></i>BV Droite</th>'+'<th>P\u00e9riode</th><th>Date</th>'+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+'<div class="px-6 py-3 text-sm text-gray-500 border-t border-dark-600">'+(d.total||0)+' entr\u00e9e(s)</div>'+'<div id="bv-pagination" class="px-6 py-3 border-t border-dark-600"></div>';renderPagination("bv-pagination",d.total||0,page,perPage,"(function(p){renderBV(document.getElementById('page-content'),p,window._bvPerPage)})","(function(pp,p){renderBV(document.getElementById('page-content'),p,pp)})");}catch(err){e.innerHTML='<div class="p-4 text-red-400">Erreur : '+(err.error||err.message||"Inconnue")+"</div>";}}async function renderCommissions(e, page, perPage) {
  page = page || window._commPage || 1;
  perPage = perPage || window._commPerPage || 25;
  window._commPage = page;
  window._commPerPage = perPage;

  e.innerHTML = '<div class="flex items-center justify-center py-16"><div class="loader"></div></div>';

  try {
    // Charger commissions + PWE en parallèle
    const [commData, pweData] = await Promise.all([
      api('GET', `/members/commissions?page=${page}&per_page=${perPage}`),
      api('GET', '/members/transactions?type=pending&per_page=100')
    ]);

    const commissions = commData.commissions || [];
    const total       = commData.total || 0;
    const totalPages  = Math.ceil(total / perPage);
    const pweEntries  = pweData.transactions || [];

    // Filtrer les PWE actives/en attente (non terminées, non annulées)
    const activePWE = pweEntries.filter(p => p.status !== 'cancelled');
    const pendingPWE = activePWE.filter(p => p.status === 'pending_release');
    const inProgressPWE = activePWE.filter(p => p.status === 'active');
    const completedPWE = activePWE.filter(p => p.status === 'completed');

    // Couleurs par type de commission
    const typeColors = {
      prime_leadership:            { icon: 'fa-crown',      color: 'gold' },
      bonus_influence:             { icon: 'fa-sitemap',    color: 'purple' },
      bonus_rayonnement:           { icon: 'fa-sun',        color: 'yellow' },
      valorisation_recommandation: { icon: 'fa-handshake',  color: 'blue' },
      fast_start:                  { icon: 'fa-rocket',     color: 'emerald' },
      credit_croissance:           { icon: 'fa-seedling',   color: 'pink' },
      reserve_strategique:         { icon: 'fa-shield-alt', color: 'cyan' },
    };

    const colorClasses = {
      gold:    { bg: 'bg-rouge-500/10',    border: 'border-rouge-500/25',    text: 'text-rouge-400',    icon: 'text-rouge-400'    },
      purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400',  icon: 'text-purple-400'  },
      yellow:  { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  text: 'text-yellow-400',  icon: 'text-yellow-400'  },
      blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',    icon: 'text-blue-400'    },
      emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: 'text-emerald-400' },
      pink:    { bg: 'bg-pink-500/10',    border: 'border-pink-500/30',    text: 'text-pink-400',    icon: 'text-pink-400'    },
      cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    text: 'text-cyan-400',    icon: 'text-cyan-400'    },
    };

    function statusBadge(status, statusLabel) {
      const cfg = {
        pending_release: { cls: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: 'fa-hourglass-half' },
        active:          { cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30',       icon: 'fa-unlock' },
        completed:       { cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: 'fa-check-circle' },
        cancelled:       { cls: 'bg-red-500/20 text-red-300 border-red-500/30',          icon: 'fa-times-circle' },
      }[status] || { cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: 'fa-circle' };
      return `<span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${cfg.cls}"><i class="fas ${cfg.icon} text-[9px]"></i>${statusLabel || status}</span>`;
    }

    function progressBar(pct, color) {
      const gradients = {
        gold: '#d4af37,#b8860b', purple: '#a855f7,#9333ea', yellow: '#eab308,#ca8a04',
        blue: '#3b82f6,#2563eb', emerald: '#10b981,#059669', pink: '#ec4899,#db2777', cyan: '#06b6d4,#0891b2'
      };
      const grad = gradients[color] || '#d4af37,#b8860b';
      const safeP = Math.min(100, Math.max(0, pct));
      return `
        <div class="flex items-center gap-2">
          <div class="flex-1 h-2 rounded-full bg-dark-700 overflow-hidden">
            <div class="h-full rounded-full transition-all" style="width:${safeP}%;background:linear-gradient(90deg,${grad})"></div>
          </div>
          <span class="text-[11px] font-bold ${safeP >= 100 ? 'text-emerald-400' : 'text-gray-300'}">${safeP}%</span>
        </div>`;
    }

    function fmtDate(d) {
      if (!d) return '—';
      try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
      catch { return d; }
    }

    // ── Carte PWE (fiche visuelle complète) ──────────────────────────
    function pweCard(p) {
      const tc = typeColors[p.commission_type] || { icon: 'fa-coins', color: 'gold' };
      const cc = colorClasses[tc.color] || colorClasses.gold;
      const isWaiting    = p.status === 'pending_release';
      const isReleasing  = p.status === 'active';
      const isCompleted  = p.status === 'completed';

      const totalJoursVersesAujourdHui = (p.days_in_month || 30);
      const totalAPayer   = (p.amount_per_day || 0) * (p.days_in_month || 0);
      const dejaLiberé    = p.amount_released || 0;
      const aLiberér      = p.amount_remaining || 0;
      const pct           = p.progress_pct || 0;
      const daysLeft      = p.days_remaining || 0;

      return `
      <div class="rounded-xl border ${cc.border} ${cc.bg} overflow-hidden">
        <!-- En-tête -->
        <div class="px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cc.bg} border ${cc.border}">
              <i class="fas ${tc.icon} ${cc.icon} text-sm"></i>
            </div>
            <div>
              <div class="font-bold text-white text-sm">${p.type_label || p.commission_type}</div>
              <div class="text-[11px] text-gray-400">Période : ${p.period || '—'}</div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1">
            ${statusBadge(p.status, p.status_label)}
            ${isCompleted ? '<span class="text-[10px] text-emerald-400 font-bold">✅ 100% libéré</span>' : ''}
          </div>
        </div>

        <!-- Corps : chiffres clés -->
        <div class="px-4 pb-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div class="bg-dark-800/60 rounded-lg p-2">
            <div class="text-[10px] text-gray-400 mb-0.5">Commission totale</div>
            <div class="font-bold ${cc.text} text-sm">${fmt$(p.total_amount)}</div>
          </div>
          <div class="bg-dark-800/60 rounded-lg p-2">
            <div class="text-[10px] text-gray-400 mb-0.5">Prime journalière</div>
            <div class="font-bold text-white text-sm">${fmt$(p.amount_per_day)}<span class="text-[10px] text-gray-500">/j</span></div>
          </div>
          <div class="bg-dark-800/60 rounded-lg p-2">
            <div class="text-[10px] text-gray-400 mb-0.5">Déjà libéré</div>
            <div class="font-bold text-emerald-400 text-sm">${fmt$(dejaLiberé)}</div>
          </div>
          <div class="bg-dark-800/60 rounded-lg p-2">
            <div class="text-[10px] text-gray-400 mb-0.5">Reste à libérer</div>
            <div class="font-bold ${aLiberér > 0 ? 'text-orange-400' : 'text-gray-500'} text-sm">${fmt$(aLiberér)}</div>
          </div>
        </div>

        <!-- Barre de progression -->
        <div class="px-4 py-2">
          ${progressBar(pct, tc.color)}
          <div class="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>${p.days_paid || 0} jour${(p.days_paid||0)>1?'s':''} versé${(p.days_paid||0)>1?'s':''}</span>
            <span>${daysLeft} jour${daysLeft>1?'s':''} restant${daysLeft>1?'s':''} / ${p.days_in_month || 30} jours total</span>
          </div>
        </div>

        <!-- Dates -->
        <div class="px-4 pb-3 grid grid-cols-2 gap-2 text-[11px]">
          <div class="flex items-center gap-1.5">
            <i class="fas fa-calendar-alt text-gray-500 text-[10px]"></i>
            <span class="text-gray-400">Début libération :</span>
            <span class="text-white font-medium">${fmtDate(p.eligible_date)}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <i class="fas fa-flag-checkered text-gray-500 text-[10px]"></i>
            <span class="text-gray-400">Fin prévue :</span>
            <span class="text-white font-medium">${fmtDate(p.end_date)}</span>
          </div>
        </div>

        <!-- Message explicatif -->
        ${p.status_message ? `
        <div class="mx-4 mb-3 px-3 py-2 rounded-lg bg-dark-800/80 border border-dark-600 text-[11px] text-gray-300">
          <i class="fas fa-info-circle text-blue-400 mr-1.5"></i>${p.status_message}
        </div>` : ''}

        ${isWaiting ? `
        <div class="mx-4 mb-3 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[11px] text-orange-300">
          <i class="fas fa-hourglass-half mr-1.5"></i>
          Votre commission est en attente de libération. Le délai de 14 jours garantit la sécurité de votre gain.
          Dès le <strong>${fmtDate(p.eligible_date)}</strong>, tous les jours écoulés seront versés d'un coup (rattrapage),
          puis une prime journalière de <strong>${fmt$(p.amount_per_day)}</strong> sera versée chaque jour jusqu'à la fin du mois.
        </div>` : ''}
      <div class="px-4 pb-3 flex justify-end">
        <button onclick="showCommissionCalendar('${p.id}')"
                class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-dark-500/60 hover:border-gray-500 rounded-lg px-3 py-1.5 transition-all">
          <i class="fas fa-calendar-days text-[10px]"></i>Calendrier jour par jour
        </button>
      </div>
      </div>`;
    }

    // ── Rendu principal ──────────────────────────────────────────────
    let html = `
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 class="text-2xl font-bold text-white">Mes Commissions</h1>
          <p class="text-gray-400 text-sm mt-0.5">Suivi complet de vos bonus et leur libération</p>
        </div>
        <button onclick="showPage('commissions-faq')" class="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/30 rounded-lg px-3 py-1.5">
          <i class="fas fa-question-circle"></i> Comprendre mes commissions
        </button>
      </div>`;

    // ── Section PWE actives ──────────────────────────────────────────
    if (activePWE.length > 0) {
      // Total journalier actuel (somme des APD en cours)
      const totalDailyToday = inProgressPWE.reduce((sum, p) => sum + (p.amount_per_day || 0), 0);
      const totalPending    = activePWE.reduce((sum, p) => sum + (p.amount_remaining || 0), 0);

      html += `
      <!-- Résumé global -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="stat-card text-center">
          <div class="text-xs text-gray-400 mb-1 uppercase tracking-wider">Total en libération</div>
          <div class="text-2xl font-bold text-orange-400">${fmt$(totalPending)}</div>
          <div class="text-xs text-gray-500 mt-1">${activePWE.filter(p=>p.status!=='completed').length} commission(s) active(s)</div>
        </div>
        <div class="stat-card text-center">
          <div class="text-xs text-gray-400 mb-1 uppercase tracking-wider">Prime quotidienne actuelle</div>
          <div class="text-2xl font-bold text-emerald-400">${fmt$(totalDailyToday)}</div>
          <div class="text-xs text-gray-500 mt-1">versée chaque jour</div>
        </div>
        <div class="stat-card text-center">
          <div class="text-xs text-gray-400 mb-1 uppercase tracking-wider">Commissions terminées</div>
          <div class="text-2xl font-bold text-blue-400">${completedPWE.length}</div>
          <div class="text-xs text-gray-500 mt-1">entièrement libérées</div>
        </div>
      </div>`;

      // En attente (14j)
      if (pendingPWE.length > 0) {
        html += `
        <div>
          <h2 class="text-sm font-bold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <i class="fas fa-hourglass-half"></i> En attente de libération (${pendingPWE.length})
          </h2>
          <div class="space-y-4">
            ${pendingPWE.map(p => pweCard(p)).join('')}
          </div>
        </div>`;
      }

      // En cours de libération
      if (inProgressPWE.length > 0) {
        html += `
        <div>
          <h2 class="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <i class="fas fa-unlock"></i> En cours de libération (${inProgressPWE.length})
          </h2>
          <div class="space-y-4">
            ${inProgressPWE.map(p => pweCard(p)).join('')}
          </div>
        </div>`;
      }

      // Terminées (les 5 dernières)
      if (completedPWE.length > 0) {
        const last5 = completedPWE.slice(0, 5);
        html += `
        <div>
          <h2 class="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <i class="fas fa-check-circle"></i> Entièrement libérées (${completedPWE.length})
          </h2>
          <div class="space-y-4">
            ${last5.map(p => pweCard(p)).join('')}
          </div>
          ${completedPWE.length > 5 ? `<p class="text-xs text-gray-500 mt-2 text-center">${completedPWE.length - 5} autres commissions terminées dans l'historique</p>` : ''}
        </div>`;
      }
    } else {
      html += `
      <div class="stat-card text-center py-10">
        <i class="fas fa-coins text-gray-600 text-4xl mb-3"></i>
        <p class="text-gray-400">Aucune commission en cours</p>
        <p class="text-gray-500 text-sm mt-1">Vos commissions apparaîtront ici dès qu'elles seront calculées.</p>
        <button onclick="showPage('commissions-faq')" class="mt-4 text-xs text-blue-400 hover:text-blue-300 underline">
          Comment fonctionnent les commissions ?
        </button>
      </div>`;
    }

    // ── Historique des commissions ───────────────────────────────────
    html += `
    <div>
      <h2 class="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
        <i class="fas fa-history"></i> Historique de toutes mes commissions
      </h2>`;

    if (commissions.length === 0) {
      html += `<div class="stat-card text-center py-6 text-gray-500">Aucune commission pour le moment.</div>`;
    } else {
      html += `<div class="space-y-2">`;
      for (const c of commissions) {
        const tc = typeColors[c.type] || { icon: 'fa-coins', color: 'gold' };
        const cc = colorClasses[tc.color] || colorClasses.gold;
        const statusCfg = {
          pending:  { cls: 'text-orange-400', label: 'En attente' },
          approved: { cls: 'text-blue-400',   label: 'Approuvé' },
          paid:     { cls: 'text-emerald-400', label: 'Versé' },
          cancelled:{ cls: 'text-red-400',     label: 'Annulé' },
        }[c.status] || { cls: 'text-gray-400', label: c.status };

        html += `
        <div class="flex items-center gap-3 p-3 rounded-xl bg-dark-700/50 border border-dark-600 hover:border-dark-500 transition-colors">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cc.bg}">
            <i class="fas ${tc.icon} ${cc.icon} text-xs"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-white truncate">${c.description || c.type}</div>
            <div class="text-[11px] text-gray-400">${c.period || ''} · ${fmtDate(c.created_at)}</div>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="font-bold ${cc.text} text-sm">${fmt$(c.amount)}</div>
            <div class="text-[10px] ${statusCfg.cls}">${statusCfg.label}</div>
          </div>
        </div>`;
      }
      html += `</div>`;

      // Pagination
      if (totalPages > 1) {
        html += `
        <div class="flex justify-center items-center gap-2 mt-4">
          ${page > 1 ? `<button onclick="renderCommissions(document.getElementById('page-content'),${page-1})" class="px-3 py-1.5 text-xs rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600 border border-dark-600">← Précédent</button>` : ''}
          <span class="text-xs text-gray-400">Page ${page} / ${totalPages}</span>
          ${page < totalPages ? `<button onclick="renderCommissions(document.getElementById('page-content'),${page+1})" class="px-3 py-1.5 text-xs rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600 border border-dark-600">Suivant →</button>` : ''}
        </div>`;
      }
    }

    html += `</div></div>`;
    e.innerHTML = html;

  } catch(err) {
    e.innerHTML = `<div class="stat-card text-center py-10 text-red-400"><i class="fas fa-exclamation-circle text-3xl mb-3"></i><p>Erreur de chargement des commissions.</p></div>`;
    console.error(err);
  }
}



function renderCommissionsFAQ(e) {
  e.innerHTML = `
  <div class="space-y-6 max-w-4xl mx-auto">

    <!-- En-tête -->
    <div class="flex items-center gap-3">
      <button onclick="showPage('commissions')"
              class="w-9 h-9 rounded-lg bg-dark-700 border border-dark-500 flex items-center justify-center hover:border-rouge-500/30 transition-all">
        <i class="fas fa-arrow-left text-gray-400 text-sm"></i>
      </button>
      <div>
        <h1 class="text-2xl font-bold text-white flex items-center gap-2">
          <i class="fas fa-book-open text-rouge-400"></i>
          Comprendre mes commissions
        </h1>
        <p class="text-gray-400 text-sm mt-0.5">Guide complet — comment fonctionne la libération progressive</p>
      </div>
    </div>

    <!-- Résumé visuel du principe -->
    <div class="rounded-xl border border-rouge-500/25 overflow-hidden"
         style="background: linear-gradient(135deg, #1a1500 0%, #120f00 100%);">
      <div class="h-0.5 w-full" style="background:linear-gradient(90deg,#d4af37,#b8860b)"></div>
      <div class="p-5">
        <div class="flex items-center gap-2 mb-3">
          <i class="fas fa-lightbulb text-rouge-400"></i>
          <h2 class="font-bold text-rouge-400 text-lg">Le principe en 1 phrase</h2>
        </div>
        <p class="text-white text-base leading-relaxed">
          Chaque commission gagnée est <strong class="text-rouge-400">libérée progressivement</strong> dans votre portefeuille,
          à raison d'<strong class="text-rouge-400">1/30ème par jour</strong>, sur la durée du mois où elle a été calculée.
          Elle ne peut pas commencer avant <strong class="text-rouge-400">le 1er du mois suivant</strong> ni avant
          <strong class="text-rouge-400">14 jours après son calcul</strong>.
        </p>
      </div>
    </div>

    <!-- Exemple concret 70 000$ -->
    <div class="rounded-xl border border-emerald-500/30 overflow-hidden bg-dark-800/60">
      <div class="h-0.5 w-full" style="background:linear-gradient(90deg,#10b981,#059669)"></div>
      <div class="p-5">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <i class="fas fa-calculator text-emerald-400 text-sm"></i>
          </div>
          <h2 class="font-bold text-white text-lg">Exemple concret : Prime de Leadership de 70 000 $</h2>
        </div>

        <!-- Données de l'exemple -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div class="bg-dark-700/80 rounded-lg p-3 border border-dark-500/60">
            <div class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Montant total</div>
            <div class="text-xl font-black text-emerald-400">70 000 $</div>
          </div>
          <div class="bg-dark-700/80 rounded-lg p-3 border border-dark-500/60">
            <div class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Mois de calcul</div>
            <div class="text-xl font-black text-white">31 jours</div>
          </div>
          <div class="bg-dark-700/80 rounded-lg p-3 border border-dark-500/60">
            <div class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Prime / jour</div>
            <div class="text-xl font-black text-rouge-400">2 258,06 $</div>
            <div class="text-[10px] text-gray-500 mt-0.5">70 000 ÷ 31</div>
          </div>
          <div class="bg-dark-700/80 rounded-lg p-3 border border-dark-500/60">
            <div class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Durée totale</div>
            <div class="text-xl font-black text-white">31 jours</div>
          </div>
        </div>

        <!-- Timeline de libération -->
        <div class="mb-4">
          <div class="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <i class="fas fa-timeline text-rouge-400 text-xs"></i>
            Scénario : commission calculée le 12 juillet → mois de juillet (31 jours)
          </div>
          <div class="space-y-2">

            <!-- Étape 1 : Calcul -->
            <div class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i class="fas fa-check text-blue-400 text-[10px]"></i>
              </div>
              <div class="flex-1 bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2">
                <div class="text-sm font-semibold text-blue-300">12 juillet — Commission calculée</div>
                <div class="text-xs text-gray-400 mt-0.5">
                  Votre Prime de Leadership de 70 000 $ est enregistrée. Une fiche de libération est créée.
                </div>
              </div>
            </div>

            <!-- Étape 2 : Délai 14j -->
            <div class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i class="fas fa-hourglass-half text-orange-400 text-[10px]"></i>
              </div>
              <div class="flex-1 bg-orange-500/5 border border-orange-500/20 rounded-lg px-3 py-2">
                <div class="text-sm font-semibold text-orange-300">12 → 26 juillet — Délai de sécurité 14 jours</div>
                <div class="text-xs text-gray-400 mt-0.5">
                  Période de vérification anti-fraude. Aucun versement pendant cette période.
                  La fiche affiche le statut <span class="text-orange-300 font-medium">« En attente (14j) »</span>.
                </div>
              </div>
            </div>

            <!-- Étape 3 : eligible_date -->
            <div class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i class="fas fa-calendar-check text-yellow-400 text-[10px]"></i>
              </div>
              <div class="flex-1 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
                <div class="text-sm font-semibold text-yellow-300">1er août — Date éligible (règle MAX)</div>
                <div class="text-xs text-gray-400 mt-0.5">
                  <strong class="text-white">Règle :</strong> eligible_date = MAX(1er août, 26 juillet) = <strong class="text-yellow-300">1er août</strong>.
                  Le 1er du mois suivant prend priorité ici.
                </div>
              </div>
            </div>

            <!-- Étape 4 : Rattrapage -->
            <div class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i class="fas fa-coins text-emerald-400 text-[10px]"></i>
              </div>
              <div class="flex-1 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                <div class="text-sm font-semibold text-emerald-300">1er août — Premier versement (avec rattrapage)</div>
                <div class="text-xs text-gray-400 mt-0.5">
                  La libération couvre les jours 1 à 1 du mois d'août.
                  Versement : <strong class="text-emerald-300">1 × 2 258,06 $ = 2 258,06 $</strong> (pas de rattrapage ici car eligible_date = start_date).
                </div>
              </div>
            </div>

            <!-- Étape 5 : Libération quotidienne -->
            <div class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-full bg-emerald-500/30 border border-emerald-500/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i class="fas fa-droplet text-emerald-400 text-[10px]"></i>
              </div>
              <div class="flex-1 bg-emerald-500/8 border border-emerald-500/30 rounded-lg px-3 py-2">
                <div class="text-sm font-semibold text-emerald-300">2 → 31 août — 2 258,06 $ chaque jour</div>
                <div class="text-xs text-gray-400 mt-0.5">
                  Chaque nuit, le système verse automatiquement 2 258,06 $ dans votre portefeuille disponible.
                  La fiche affiche le statut <span class="text-emerald-300 font-medium">« En cours de libération »</span>.
                </div>
              </div>
            </div>

            <!-- Étape 6 : 100% libéré -->
            <div class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-full bg-rouge-500/20 border border-rouge-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i class="fas fa-trophy text-rouge-400 text-[10px]"></i>
              </div>
              <div class="flex-1 bg-rouge-500/5 border border-rouge-500/25 rounded-lg px-3 py-2">
                <div class="text-sm font-semibold text-rouge-400">31 août — 100% libéré !</div>
                <div class="text-xs text-gray-400 mt-0.5">
                  Les 70 000 $ sont intégralement dans votre portefeuille disponible.
                  Vous recevez une notification <strong class="text-rouge-400">✅ Commission entièrement libérée</strong>.
                  La fiche passe au statut <span class="text-rouge-400 font-medium">« Entièrement libéré »</span>.
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Barre de progression visuelle -->
        <div class="bg-dark-700/60 rounded-lg p-3 border border-dark-500/40">
          <div class="flex justify-between text-xs text-gray-400 mb-2">
            <span>Progression de libération</span>
            <span class="text-emerald-400 font-bold">0% → 100% sur 31 jours</span>
          </div>
          <div class="h-3 bg-dark-600 rounded-full overflow-hidden">
            <div class="h-full rounded-full" style="width:100%; background:linear-gradient(90deg,#10b981,#059669)"></div>
          </div>
          <div class="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>Jour 1 — 2 258,06 $</span>
            <span>Jour 31 — 70 000 $ ✓</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Cas spécial : Rattrapage -->
    <div class="rounded-xl border border-orange-500/30 overflow-hidden bg-dark-800/60">
      <div class="p-5">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <i class="fas fa-bolt text-orange-400 text-sm"></i>
          </div>
          <h2 class="font-bold text-white text-lg">Le rattrapage — quand eligible_date > start_date</h2>
        </div>
        <p class="text-gray-300 text-sm mb-4">
          Si votre date éligible tombe <em>au milieu du mois</em> (14j + date_commission < 1er M+1),
          le premier versement couvre <strong class="text-orange-300">tous les jours manqués d'un coup</strong>.
        </p>
        <div class="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
          <div class="text-sm font-semibold text-orange-300 mb-2">
            Exemple : commission calculée le 2 août (mois d'août = 31j)
          </div>
          <div class="space-y-1 text-xs text-gray-300">
            <div class="flex gap-2"><span class="text-gray-500 w-36">14j après :</span><span>16 août</span></div>
            <div class="flex gap-2"><span class="text-gray-500 w-36">1er M+1 :</span><span>1er septembre</span></div>
            <div class="flex gap-2"><span class="text-gray-500 w-36">eligible_date :</span><span class="text-orange-300 font-medium">MAX(1er sept, 16 août) = 1er septembre</span></div>
            <div class="flex gap-2"><span class="text-gray-500 w-36">start_date :</span><span>1er août (début du mois)</span></div>
            <div class="flex gap-2 mt-2 pt-2 border-t border-orange-500/20">
              <span class="text-gray-500 w-36">Jours manqués :</span>
              <span class="text-orange-300 font-bold">31 jours (tout le mois d'août)</span>
            </div>
            <div class="flex gap-2">
              <span class="text-gray-500 w-36">Rattrapage versé :</span>
              <span class="text-orange-300 font-bold">31 × APD$ en une seule fois</span>
            </div>
          </div>
          <div class="mt-3 text-xs text-orange-400/80 flex items-start gap-1.5">
            <i class="fas fa-bell mt-0.5"></i>
            <span>Vous recevrez la notification <strong>💰 Rattrapage de commission versé</strong> avec le montant exact.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Les 5 types de bonus -->
    <div class="rounded-xl border border-dark-500/60 overflow-hidden bg-dark-800/60">
      <div class="p-5">
        <div class="flex items-center gap-2 mb-4">
          <i class="fas fa-layer-group text-rouge-400"></i>
          <h2 class="font-bold text-white text-lg">Les 5 types de commissions</h2>
        </div>
        <div class="space-y-2">

          <div class="flex items-center gap-3 p-3 rounded-lg bg-rouge-500/5 border border-rouge-500/20">
            <div class="w-8 h-8 rounded-lg bg-rouge-500/15 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-crown text-rouge-400 text-sm"></i>
            </div>
            <div class="flex-1">
              <div class="text-sm font-bold text-rouge-400">Prime de Leadership</div>
              <div class="text-xs text-gray-400">Basée sur le volume BV de votre organisation — la plus importante</div>
            </div>
            <div class="text-xs text-rouge-400/60 font-mono">prime_leadership</div>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
            <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-sitemap text-purple-400 text-sm"></i>
            </div>
            <div class="flex-1">
              <div class="text-sm font-bold text-purple-300">Bonus d'Influence</div>
              <div class="text-xs text-gray-400">Revenus sur les rangs qualifiés de votre réseau en profondeur</div>
            </div>
            <div class="text-xs text-purple-400/60 font-mono">bonus_influence</div>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
            <div class="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-sun text-yellow-400 text-sm"></i>
            </div>
            <div class="flex-1">
              <div class="text-sm font-bold text-yellow-300">Bonus de Rayonnement</div>
              <div class="text-xs text-gray-400">Pourcentage sur les primes de leadership de vos filleuls de rang</div>
            </div>
            <div class="text-xs text-yellow-400/60 font-mono">bonus_rayonnement</div>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-handshake text-blue-400 text-sm"></i>
            </div>
            <div class="flex-1">
              <div class="text-sm font-bold text-blue-300">Valorisation Recommandation</div>
              <div class="text-xs text-gray-400">Commission sur les packages achetés par vos filleuls directs</div>
            </div>
            <div class="text-xs text-blue-400/60 font-mono">valorisation_recommandation</div>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-rocket text-emerald-400 text-sm"></i>
            </div>
            <div class="flex-1">
              <div class="text-sm font-bold text-emerald-300">Fast Start Bonus</div>
              <div class="text-xs text-gray-400">Bonus par palier BV atteint dans les 30 premiers jours</div>
            </div>
            <div class="text-xs text-emerald-400/60 font-mono">fast_start</div>
          </div>

        </div>
      </div>
    </div>

    <!-- Glossaire des statuts -->
    <div class="rounded-xl border border-dark-500/60 overflow-hidden bg-dark-800/60">
      <div class="p-5">
        <div class="flex items-center gap-2 mb-4">
          <i class="fas fa-tags text-gray-400"></i>
          <h2 class="font-bold text-white text-lg">Glossaire des statuts</h2>
        </div>
        <div class="space-y-2">

          <div class="flex items-center gap-3 p-3 rounded-lg bg-dark-700/60">
            <span class="text-xs font-bold px-2 py-1 rounded-full border bg-orange-500/20 text-orange-300 border-orange-500/30 whitespace-nowrap">
              <i class="fas fa-hourglass-half mr-1"></i>En attente (14j)
            </span>
            <div class="text-xs text-gray-400">
              Commission créée, délai de sécurité en cours. Aucun versement encore.
            </div>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-lg bg-dark-700/60">
            <span class="text-xs font-bold px-2 py-1 rounded-full border bg-blue-500/20 text-blue-300 border-blue-500/30 whitespace-nowrap">
              <i class="fas fa-droplet mr-1"></i>En cours de libération
            </span>
            <div class="text-xs text-gray-400">
              Les versements quotidiens ont commencé. Vérifiez la barre de progression.
            </div>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-lg bg-dark-700/60">
            <span class="text-xs font-bold px-2 py-1 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-500/30 whitespace-nowrap">
              <i class="fas fa-check-circle mr-1"></i>Entièrement libéré
            </span>
            <div class="text-xs text-gray-400">
              100% du montant est dans votre portefeuille disponible. Retrait possible.
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- FAQ Questions fréquentes -->
    <div class="rounded-xl border border-dark-500/60 overflow-hidden bg-dark-800/60">
      <div class="p-5">
        <div class="flex items-center gap-2 mb-4">
          <i class="fas fa-circle-question text-rouge-400"></i>
          <h2 class="font-bold text-white text-lg">Questions fréquentes</h2>
        </div>
        <div class="space-y-3" id="faq-list">

          ${[
            {
              q: "Pourquoi mes commissions ne sont-elles pas disponibles immédiatement ?",
              a: "Le système applique un délai de sécurité de 14 jours pour prévenir toute fraude ou annulation de package. Après ce délai, la libération commence dès le 1er du mois suivant."
            },
            {
              q: "Puis-je retirer avant la fin de la libération ?",
              a: "Vous pouvez retirer uniquement ce qui est dans votre portefeuille principal (solde disponible). Les montants encore en cours de libération (pending) ne sont pas retirables."
            },
            {
              q: "Qu'est-ce que le 'rattrapage' ?",
              a: "Lorsque la date éligible de votre commission est après le début du mois, tous les jours manqués sont versés en une seule fois lors du premier paiement. C'est un versement plus important que les jours suivants."
            },
            {
              q: "Pourquoi la prime quotidienne varie selon les mois ?",
              a: "Le montant par jour = total ÷ nombre de jours du mois de calcul. Un mois de 28 jours donne une prime journalière plus grande qu'un mois de 31 jours."
            },
            {
              q: "Le reset BV mensuel affecte-t-il mes commissions en cours de libération ?",
              a: "Non. Le reset BV efface uniquement les volumes mensuels utilisés pour calculer de nouvelles commissions. Les fiches de libération déjà créées continuent leur versement normalement."
            },
            {
              q: "Comment savoir quand ma commission sera 100% libérée ?",
              a: "Chaque fiche affiche la date de fin et le nombre de jours restants. La date de fin = date de début + nombre de jours du mois. Vous recevrez aussi une notification '✅ Commission entièrement libérée'."
            }
          ].map((item, i) => `
            <div class="border border-dark-500/60 rounded-lg overflow-hidden">
              <button onclick="toggleFAQ(${i})"
                      class="w-full flex items-center justify-between p-3 text-left hover:bg-dark-700/40 transition-all">
                <span class="text-sm font-medium text-white pr-3">${item.q}</span>
                <i id="faq-icon-${i}" class="fas fa-chevron-down text-gray-400 text-xs flex-shrink-0 transition-transform"></i>
              </button>
              <div id="faq-body-${i}" class="hidden px-3 pb-3">
                <p class="text-sm text-gray-400">${item.a}</p>
              </div>
            </div>
          `).join('')}

        </div>
      </div>
    </div>

    <!-- Bouton retour -->
    <div class="text-center">
      <button onclick="showPage('commissions')"
              class="px-6 py-2.5 rounded-xl bg-rouge-500/15 border border-rouge-500/30 text-rouge-400 text-sm font-medium hover:bg-rouge-500/20 transition-all">
        <i class="fas fa-arrow-left mr-2"></i>Retour à mes commissions
      </button>
    </div>

  </div>`;
}

function toggleFAQ(i) {
  const body = document.getElementById('faq-body-' + i);
  const icon = document.getElementById('faq-icon-' + i);
  if (!body) return;
  const isOpen = !body.classList.contains('hidden');
  body.classList.toggle('hidden', isOpen);
  if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
}

// ── Calendrier jour-par-jour d'une commission (Q39/Q40) ─────────────────
async function showCommissionCalendar(pweId) {
  // Créer ou recycler la modal
  let modal = document.getElementById('calendar-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'calendar-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.style.background = 'rgba(0,0,0,0.75)';
    modal.onclick = (ev) => { if (ev.target === modal) modal.remove(); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = '<div class="bg-dark-800 rounded-xl border border-dark-500 p-6 max-w-lg w-full"><div class="flex items-center justify-center py-8"><div class="loader"></div></div></div>';

  try {
    const d = await api('GET', `/members/commissions/${pweId}/calendar`);
    const STATUS_COLORS = {
      paid:    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      pending: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      waiting: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    };
    const STATUS_ICONS = { paid: 'fa-check', pending: 'fa-clock', waiting: 'fa-hourglass-half' };

    const rows = d.calendar.map(day => `
      <div class="flex items-center gap-2 py-1 border-b border-dark-600/40 last:border-0">
        <div class="w-6 text-[10px] text-gray-500 text-right flex-shrink-0">${day.day_index}</div>
        <div class="text-xs text-gray-400 w-20 flex-shrink-0">${day.date}</div>
        <div class="flex-1 text-xs text-gray-300">${day.is_catchup ? '<span class="text-orange-300 font-medium">Rattrapage</span>' : (day.status === 'waiting' ? '<span class="text-orange-400">Délai 14j</span>' : (day.status === 'paid' ? '<span class="text-emerald-400">Versé</span>' : '<span class="text-blue-400">À venir</span>'))}</div>
        <div class="text-xs font-mono ${day.status === 'paid' ? 'text-emerald-400' : day.status === 'waiting' ? 'text-gray-600' : 'text-blue-400'}">${day.status !== 'waiting' ? '+' + fmt$(day.amount) : '—'}</div>
      </div>`).join('');

    modal.innerHTML = `
      <div class="bg-dark-800 rounded-xl border border-dark-500 max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
        <div class="h-0.5 w-full" style="background:linear-gradient(90deg,#10b981,#d4af37)"></div>
        <div class="p-4 border-b border-dark-600 flex items-center justify-between">
          <div>
            <div class="font-bold text-white">${d.type_label}</div>
            <div class="text-xs text-gray-400">${d.period} · ${fmt$(d.total_amount)} total</div>
          </div>
          <button onclick="document.getElementById('calendar-modal').remove()"
                  class="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center hover:bg-dark-600 transition-all">
            <i class="fas fa-xmark text-gray-400"></i>
          </button>
        </div>
        <div class="p-4 grid grid-cols-3 gap-3 border-b border-dark-600">
          <div class="text-center">
            <div class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Libéré</div>
            <div class="text-lg font-black text-emerald-400">${fmt$(d.total_released)}</div>
            <div class="text-[10px] text-gray-500">${d.days_paid}j / ${d.days_in_month}j</div>
          </div>
          <div class="text-center">
            <div class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Restant</div>
            <div class="text-lg font-black text-blue-400">${fmt$(d.total_remaining)}</div>
            <div class="text-[10px] text-gray-500">${d.days_remaining} jours</div>
          </div>
          <div class="text-center">
            <div class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Prime/jour</div>
            <div class="text-lg font-black text-rouge-400">${fmt$(d.amount_per_day)}</div>
            <div class="text-[10px] text-gray-500">× ${d.days_in_month} jours</div>
          </div>
        </div>
        <div class="p-4 border-b border-dark-600">
          <div class="h-2 bg-dark-600 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all" style="width:${d.progress_pct}%; background:linear-gradient(90deg,#10b981,#059669)"></div>
          </div>
          <div class="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>${d.start_date}</span>
            <span class="text-emerald-400 font-medium">${d.progress_pct}% libéré</span>
            <span>${d.end_date}</span>
          </div>
        </div>
        <div class="overflow-y-auto flex-1 p-4">
          <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-2 grid grid-cols-4 gap-2 px-1">
            <span>Jour</span><span>Date</span><span>Statut</span><span class="text-right">Montant</span>
          </div>
          ${rows}
        </div>
      </div>`;
  } catch(e) {
    modal.innerHTML = `<div class="bg-dark-800 rounded-xl border border-red-500/30 p-6 max-w-sm w-full text-center">
      <i class="fas fa-circle-exclamation text-red-400 text-2xl mb-2"></i>
      <p class="text-gray-400 text-sm">Impossible de charger le calendrier.</p>
      <button onclick="document.getElementById('calendar-modal').remove()" class="mt-3 text-xs text-gray-500 hover:text-gray-300">Fermer</button>
    </div>`;
  }
}

async function renderWallet(e){e.innerHTML='<div class="flex items-center justify-center py-16"><div class="loader"></div></div>';try{const t=await api("GET","/members/wallet"),n=t.wallet,a=t.member,s=t.pendingWithdrawals||[];const _wdCfg=t.withdrawalConfig||{};const i=_wdCfg.is_today_allowed||false;const o=_wdCfg.next_allowed_date?new Date(_wdCfg.next_allowed_date+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}):(_wdCfg.allowed_days_labels&&_wdCfg.allowed_days_labels.length?_wdCfg.allowed_days_labels.join(", "):"—"),c=e=>({pending:'<span class="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">En attente</span>',processing:'<span class="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">En cours</span>',completed:'<span class="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">✓ Complété</span>',rejected:'<span class="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">✗ Rejeté</span>'}[e]||`<span class="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full">${e}</span>`),x=t.pendingWallet||{},p=x.total||0,m=x.entries||[],u=x.nextEligible||null;let g=null;try{g=await api("GET","/members/dreamiles")}catch(e){}const f=g?.wallet?.dreamiles||0,b=g?.credited_this_month||0,v=t.ccBalance||{total:0,available:0,held:0},y=v.total||0,h=(n?.balance||0)+p+y+(a?.reserve_strategique||0);e.innerHTML=`\n
    <div class="space-y-6">\n
\n
      \x3c!-- En-tête --\x3e\n
      <div class="flex items-center justify-between">\n
        <div>\n
          <h2 class="text-xl font-bold text-white">Mon Portefeuille</h2>\n
          <p class="text-xs text-gray-500 mt-0.5">Cliquez sur un wallet pour voir l'historique des mouvements</p>\n
        </div>\n
        <div class="text-right">\n
          <div class="text-xs text-gray-500">Patrimoine total</div>\n
          <div class="text-2xl font-bold text-white">${fmt$(h)}</div>\n
        </div>\n
      </div>\n
\n
      \x3c!-- Ligne 1 : Principal + Pending + Crédit de Croissance --\x3e\n
      <div class="flex flex-wrap gap-3 mb-4">\n
        <button onclick="_showTopupModal()" class="flex items-center gap-2 px-4 py-2.5 bg-green-600/20 hover:bg-green-600/40 border border-green-500/40 rounded-xl text-sm text-green-300 font-medium transition-all"><i class="fas fa-plus-circle mr-1"></i>Recharger mon wallet</button>\n
        <button onclick="_showTransferModal()" class="flex items-center gap-2 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 rounded-xl text-sm text-blue-300 font-medium transition-all"><i class="fas fa-exchange-alt mr-1"></i>Transférer à un membre</button>\n
        <button onclick="_showTopupHistoryModal()" class="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-gray-400 font-medium transition-all"><i class="fas fa-history mr-1"></i>Historique recharges &amp; transferts</button>\n
      </div>\n
      <div id="wallet-cards-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">\n
\n
        \x3c!-- W1 — Portefeuille Principal --\x3e\n
        <div class="wallet-card stat-card border-rouge-500/25 cursor-pointer hover:border-rouge-500/60 transition-all select-none"\n
             data-wallet="principal" onclick="openWalletDetail('principal')">\n
          <div class="flex items-center justify-between mb-3">\n
            <div class="flex items-center gap-2">\n
              <div class="w-8 h-8 rounded-lg bg-rouge-500/15 flex items-center justify-center">\n
                <i class="fas fa-wallet text-rouge-400 text-sm"></i>\n
              </div>\n
              <div>\n
                <div class="text-sm font-medium text-white">Portefeuille Principal</div>\n
                <div class="text-xs text-green-400">✓ Retirable</div>\n
              </div>\n
            </div>\n
            <i class="fas fa-chevron-right text-gray-600 text-xs"></i>\n
          </div>\n
          <div class="text-3xl font-bold text-rouge-400">${fmt$(n?.balance??a?.wallet_balance)}</div>\n
          ${a?.pending_withdrawal>0?`\n
          <div class="mt-2 text-xs text-yellow-400 bg-yellow-900/20 rounded-lg px-3 py-1.5">\n
            <i class="fas fa-clock mr-1"></i>${fmt$(a.pending_withdrawal)} retrait en cours\n
          </div>`:""}\n
          <div class="mt-3 flex items-center justify-between text-xs text-gray-500">\n
            <span>Total gagné : <span class="text-green-400">${fmt$(n?.total_earned)}</span></span>\n
            <span>Retiré : <span class="text-red-400">${fmt$(n?.total_withdrawn)}</span></span>\n
          </div>\n
          <button onclick="event.stopPropagation(); showPage('withdraw')"\n
            class="mt-3 w-full ${i?"bg-rouge-500 text-dark-900 hover:bg-rouge-500":"bg-dark-600 text-gray-400"} font-bold py-2 rounded-lg transition text-xs">\n
            <i class="fas fa-paper-plane mr-1"></i>${i?"Demander un retrait":"Retrait · "+o}\n
          </button>\n
        </div>\n
\n
        \x3c!-- W2 — Wallet en Attente (Pending) --\x3e\n
        <div class="wallet-card stat-card border-orange-500/20 cursor-pointer hover:border-orange-400/50 transition-all select-none"\n
             data-wallet="pending" onclick="openWalletDetail('pending')">\n
          <div class="flex items-center justify-between mb-3">\n
            <div class="flex items-center gap-2">\n
              <div class="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">\n
                <i class="fas fa-hourglass-half text-orange-400 text-sm"></i>\n
              </div>\n
              <div>\n
                <div class="text-sm font-medium text-white">Wallet en Attente</div>\n
                <div class="text-xs text-orange-400">Libération progressive M+1</div>\n
              </div>\n
            </div>\n
            <i class="fas fa-chevron-right text-gray-600 text-xs"></i>\n
          </div>\n
          <div class="text-3xl font-bold text-orange-400">${fmt$(p)}</div>\n
          <div class="text-xs text-gray-500 mt-1">\n
            ${u?`Prochain versement : <span class="text-orange-300">${u}</span>`:p>0?"Versements en cours":"Aucune commission en attente"}\n
          </div>\n
          ${m.length>0?`\n
          <div class="mt-3 space-y-1.5 border-t border-dark-600 pt-2">\n
            ${m.slice(0,2).map(e=>{const t=Math.max(0,(e.total_amount||0)-(e.amount_per_day||0)*(e.days_paid||0)),n=e.days_in_month>0?Math.round(e.days_paid/e.days_in_month*100):0;return`<div>\n
                <div class="flex justify-between text-xs"><span class="text-gray-400 truncate">${WALLET_COMMISSION_LABELS[e.commission_type]||e.commission_type}${e.source_name?` · <span class="text-gray-300">${e.source_name}</span> <span class="text-gray-500">${e.source_unique_id||""}</span>`:""}</span><span class="text-orange-300 ml-2 flex-shrink-0">${fmt$(t)}</span></div>\n
                <div class="text-xs mt-0.5">${e.status==="pending_release"?`<span class="text-yellow-500/70">Libération le ${e.eligible_date?new Date(e.eligible_date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}):""}</span>`:e.status==="active"?`<span class="text-green-500/70">${Math.max(0,(e.days_in_month||0)-(e.days_paid||0))}j restants · ${(e.amount_per_day||0).toFixed(2)}$/j</span>`:`<span class="text-gray-500">Libéré</span>`}</div>\n
                <div class="h-1 bg-dark-600 rounded-full mt-0.5"><div class="h-1 bg-orange-500/60 rounded-full" style="width:${n}%"></div></div>\n
              </div>`}).join("")}\n
            ${m.length>2?`<p class="text-xs text-gray-600 text-center mt-1">+${m.length-2} autres…</p>`:""}\n
          </div>`:""}\n
        </div>\n
\n
        \x3c!-- W3 — Crédit de Croissance --\x3e\n
        <div class="wallet-card stat-card border-pink-500/20 cursor-pointer hover:border-pink-400/50 transition-all select-none"\n
             data-wallet="cc" onclick="showPage('cc-wallet')">\n
          <div class="flex items-center justify-between mb-3">\n
            <div class="flex items-center gap-2">\n
              <div class="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">\n
                <i class="fas fa-seedling text-pink-400 text-sm"></i>\n
              </div>\n
              <div>\n
                <div class="text-sm font-medium text-white">Crédit de Croissance</div>\n
                <div class="text-xs text-gray-400">✗ Non retirable · Rang Leader+</div>\n
              </div>\n
            </div>\n
            <i class="fas fa-chevron-right text-gray-600 text-xs"></i>\n
          </div>\n
          <div class="text-3xl font-bold text-pink-400">${fmt$(y)}</div>\n
          <div class="flex gap-3 mt-1">\n
            <span class="text-xs text-green-400">${fmt$(v.available)} disponible</span>\n
            <span class="text-xs text-blue-400">${fmt$(v.held)} en attente</span>\n
          </div>\n
          <div class="mt-3 h-1 bg-dark-600 rounded-full">\n
            <div class="h-1 bg-pink-500/50 rounded-full" style="width:${Math.min(100,y/500*100)}%"></div>\n
          </div>\n
          <div class="text-xs text-gray-600 mt-1 text-right">Remboursement dépenses business</div>\n
          <div class="text-xs text-pink-500/50 mt-2 group-hover:text-pink-400 transition-colors"><i class="fas fa-arrow-right mr-1"></i>Voir détails &amp; demander remboursement</div>\n
        </div>\n
\n
      </div>\n
\n
      \x3c!-- Ligne 2 : Réserve Stratégique + Récapitulatif --\x3e\n
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">\n
\n
        \x3c!-- W4 — Réserve Stratégique --\x3e\n
        <div class="wallet-card stat-card border-cyan-500/20 cursor-pointer hover:border-cyan-400/50 transition-all select-none"\n
             data-wallet="rs" onclick="showPage('reserve-strategique')">\n
          <div class="flex items-center justify-between mb-3">\n
            <div class="flex items-center gap-2">\n
              <div class="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">\n
                <i class="fas fa-lock text-cyan-400 text-sm"></i>\n
              </div>\n
              <div>\n
                <div class="text-sm font-medium text-white">Réserve Stratégique</div>\n
                <div class="text-xs text-cyan-400/70">En épargne · 3 ans · Rang Mentor → President</div>\n
              </div>\n
            </div>\n
            <i class="fas fa-chevron-right text-gray-600 text-xs"></i>\n
          </div>\n
          <div class="text-3xl font-bold text-cyan-400">${fmt$(a?.reserve_strategique)}</div>\n
          <div class="text-xs text-gray-500 mt-1">Épargne 3 ans · Abondement compagnie inclus · Libération automatique à terme</div>\n
        </div>\n
\n
        \x3c!-- W5 — Wallet Luxia (Dreamiles) --\x3e\n
        <div class="wallet-card stat-card border-yellow-500/20 cursor-pointer hover:border-yellow-400/50 transition-all select-none"\n
             data-wallet="luxia" onclick="openWalletDetail('luxia')">\n
          <div class="flex items-center justify-between mb-3">\n
            <div class="flex items-center gap-2">\n
              <div class="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center overflow-hidden">\n
                ${DREAMILES_LOGO_SM}\n
              </div>\n
              <div>\n
                <div class="text-sm font-medium text-white">Wallet Luxia</div>\n
                <div class="text-xs text-yellow-500/70">Dreamiles · valables 24 mois</div>\n
              </div>\n
            </div>\n
            <i class="fas fa-chevron-right text-gray-600 text-xs"></i>\n
          </div>\n
          <div class="flex items-baseline gap-2">\n
            <div class="text-3xl font-bold text-yellow-400">${f.toLocaleString()}</div>\n
            ${DREAMILES_LOGO_SM}\n
          </div>\n
          <div class="text-xs text-gray-500 mt-1">≈ ${fmt$(f)} disponibles · 1 DRM = 1$</div>\n
          ${b>0?`<div class="text-xs text-yellow-400/70 mt-1"><i class="fas fa-plus-circle mr-1"></i>+${b.toLocaleString()} ce mois</div>`:""}\n
        </div>\n
\n
        \x3c!-- W6 — Vue Globale (non cliquable) --\x3e\n
        <div class="stat-card border-dark-500">\n
          <div class="flex items-center gap-2 mb-3">\n
            <div class="w-8 h-8 rounded-lg bg-gray-500/20 flex items-center justify-center">\n
              <i class="fas fa-chart-pie text-gray-400 text-sm"></i>\n
            </div>\n
            <div>\n
              <div class="text-sm font-medium text-white">Vue Globale</div>\n
              <div class="text-xs text-gray-500">Résumé de vos gains</div>\n
            </div>\n
          </div>\n
          <div class="space-y-2">\n
            <div class="flex justify-between items-center">\n
              <span class="text-xs text-gray-500">Total gagné</span>\n
              <span class="text-sm font-bold text-green-400">${fmt$(n?.total_earned)}</span>\n
            </div>\n
            <div class="flex justify-between items-center">\n
              <span class="text-xs text-gray-500">Total retiré</span>\n
              <span class="text-sm font-bold text-red-400">${fmt$(n?.total_withdrawn)}</span>\n
            </div>\n
            <div class="h-px bg-dark-600 my-1"></div>\n
            <div class="flex justify-between items-center">\n
              <span class="text-xs text-gray-500">Principal</span>\n
              <span class="text-sm font-bold text-rouge-400">${fmt$(n?.balance??a?.wallet_balance)}</span>\n
            </div>\n
            <div class="flex justify-between items-center">\n
              <span class="text-xs text-gray-500">En attente</span>\n
              <span class="text-sm font-bold text-orange-400">${fmt$(p)}</span>\n
            </div>\n
            <div class="flex justify-between items-center">\n
              <span class="text-xs text-gray-500">Crédit Croissance</span>\n
              <span class="text-sm font-bold text-pink-400">${fmt$(y)}</span>\n
            </div>\n
            <div class="flex justify-between items-center">\n
              <span class="text-xs text-gray-500">Réserve Stratégique</span>\n
              <span class="text-sm font-bold text-cyan-400">${fmt$(a?.reserve_strategique)}</span>\n
            </div>\n
            <div class="flex justify-between items-center">\n
              <span class="text-xs text-gray-500">Dreamiles Luxia</span>\n
              <span class="text-sm font-bold text-yellow-400">${f.toLocaleString()} DRM</span>\n
            </div>\n
            <div class="h-px bg-dark-600 my-1"></div>\n
            <div class="flex justify-between items-center">\n
              <span class="text-xs text-gray-400 font-medium">Patrimoine total</span>\n
              <span class="text-base font-bold text-white">${fmt$(h)}</span>\n
            </div>\n
          </div>\n
        </div>\n
      </div>\n
\n
      ${a?.pending_withdrawal>0?`\n
      <div class="bg-yellow-900/20 border border-yellow-500/30 rounded-xl px-4 py-3 flex items-center gap-3">\n
        <i class="fas fa-clock text-yellow-400"></i>\n
        <span class="text-xs text-yellow-300">${fmt$(a.pending_withdrawal)} en cours de traitement (retrait)</span>\n
      </div>`:""}\n
\n
      \x3c!-- Alerte KYC --\x3e\n
      ${"verified"!==a?.kyc_status?'\n      <div class="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">\n        <i class="fas fa-triangle-exclamation text-yellow-400 mt-0.5"></i>\n        <div>\n          <p class="text-yellow-300 font-medium text-sm">KYC requis pour les retraits</p>\n          <p class="text-yellow-400/70 text-xs mt-1">Votre identité doit être vérifiée avant de pouvoir effectuer un retrait.\n            <button onclick="showPage(\'kyc\')" class="underline">Compléter maintenant →</button></p>\n        </div>\n      </div>':""}\n
\n
      \x3c!-- Retraits en cours --\x3e\n
      ${s.length>0?`\n
      <div class="bg-dark-800 border border-dark-600 rounded-2xl overflow-hidden">\n
        <div class="p-4 border-b border-dark-600 flex items-center gap-2">\n
          <i class="fas fa-clock text-yellow-400"></i>\n
          <h3 class="font-semibold text-white">Retraits en cours de traitement</h3>\n
        </div>\n
        <div class="divide-y divide-dark-600">\n
          ${s.map(e=>`\n
          <div class="p-4 flex items-center justify-between">\n
            <div>\n
              <div class="font-medium text-white">${fmt$(e.amount)}</div>\n
              <div class="text-xs text-gray-500 mt-0.5">→ ${e.paypal_email} · ${fmtDate(e.created_at)}</div>\n
            </div>\n
            <div>${c(e.status)}</div>\n
          </div>`).join("")}\n
        </div>\n
      </div>`:""}\n
\n
      \x3c!-- Raccourcis --\x3e\n
      <div class="flex gap-3">\n
        <button onclick="showPage('transactions')" class="flex-1 bg-dark-800 border border-dark-600 rounded-xl p-3 text-sm text-gray-300 hover:bg-dark-700 transition text-center">\n
          <i class="fas fa-list-ul mr-2"></i>Toutes les transactions\n
        </button>\n
        <button onclick="showPage('withdraw')" class="flex-1 bg-dark-800 border border-dark-600 rounded-xl p-3 text-sm text-gray-300 hover:bg-dark-700 transition text-center">\n
          <i class="fas fa-paper-plane mr-2"></i>Nouvelle demande de retrait\n
        </button>\n
      </div>\n
    </div>`}catch(t){e.innerHTML=`<div class="p-4 text-red-400">Erreur : ${t.error||t.message}</div>`}}async function renderWithdraw(el,page,perPage){page=page||window._wdPage||1;perPage=perPage||window._wdPerPage||25;window._wdPage=page;window._wdPerPage=perPage;el.innerHTML='<div class="flex items-center justify-center py-16"><div class="loader"></div></div>';try{const walletData=await api("GET","/members/wallet");const t=walletData.member;const wdConfig=walletData.withdrawalConfig||{min_withdrawal:50,kyc_level:0,kyc_max_withdrawal:0,enabled:true,allowed_days:[3],is_today_allowed:false,next_allowed_date:null,allowed_days_labels:[],fee_pct:0,fee_fixed:0,processing_time:"24-48h"};const minWd=wdConfig.min_withdrawal||50;const kycMax=wdConfig.kyc_max_withdrawal||0;const wdResp=await api("GET",`/members/withdrawals?page=${page}&per_page=${perPage}`);window._wdTotal=wdResp.total||0;const n=wdResp.withdrawals||[];const now=new Date;const isTodayAllowed=wdConfig.is_today_allowed!==undefined?wdConfig.is_today_allowed:wdConfig.allowed_days.includes(now.getDay());const allowedDaysLabels=wdConfig.allowed_days_labels&&wdConfig.allowed_days_labels.length?wdConfig.allowed_days_labels:[];const nextAllowedStr=wdConfig.next_allowed_date?new Date(wdConfig.next_allowed_date+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}):"";const wdEnabled=wdConfig.enabled!==false;const hasPending=(walletData.pendingWithdrawals||[]).some(w=>["pending","processing"].includes(w.status));const canWithdraw=("verified"===t?.kyc_status)&&isTodayAllowed&&wdEnabled&&(t?.wallet_balance>=minWd)&&!hasPending;const wdStatusBadge=s=>({pending:'<span class="inline-flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full"><i class="fas fa-clock text-[10px]"></i>En attente</span>',processing:'<span class="inline-flex items-center gap-1 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full"><i class="fas fa-spinner fa-spin text-[10px]"></i>En cours</span>',completed:'<span class="inline-flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full"><i class="fas fa-check text-[10px]"></i>Confirmé</span>',rejected:'<span class="inline-flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full"><i class="fas fa-times text-[10px]"></i>Rejeté</span>'}[s]||`<span class="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full">${s}</span>`);const kycLevelLabel=["Non vérifié","Identité vérifiée","Renforcée","Premium"][wdConfig.kyc_level||0]||"Inconnu";const kycMaxStr=kycMax>0?fmt$(kycMax):"Illimité";el.innerHTML=`
    <div class="max-w-2xl space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-white flex items-center gap-2"><i class="fas fa-paper-plane text-rouge-400"></i> Demande de Retrait</h2>
          <p class="text-xs text-gray-500 mt-0.5">Portefeuille principal uniquement — Traitement sous 24-48h</p>
        </div>
        <button onclick="showPage('wallet')" class="text-xs text-gray-400 hover:text-white transition flex items-center gap-1"><i class="fas fa-arrow-left text-[10px]"></i>Retour</button>
      </div>

      <!-- Checklist conditions -->
      <div class="bg-dark-800 border border-dark-600 rounded-2xl p-5 space-y-3">
        <h3 class="font-semibold text-white text-sm flex items-center gap-2"><i class="fas fa-clipboard-check text-blue-400"></i> Conditions à remplir</h3>
        <div class="space-y-2.5">
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isTodayAllowed&&wdEnabled?"bg-green-500/20":"bg-red-500/20"}">
              <i class="fas ${isTodayAllowed&&wdEnabled?"fa-check text-green-400":"fa-times text-red-400"} text-[10px]"></i>
            </div>
            <div class="flex-1">
              <span class="text-sm text-gray-300">${!wdEnabled?'<span class="text-sm text-gray-300">Retraits <strong class="text-red-400">suspendus</strong></span>':'<span class="text-sm text-gray-300">Jours : <strong class="text-white">'+allowedDaysLabels.join(", ")+'</strong></span>'}</span>
              ${!wdEnabled?'':isTodayAllowed?'<span class="ml-2 text-xs text-green-400 font-medium">✓ Aujourd\'hui !</span>':`<span class="ml-2 text-xs text-gray-500">Prochain : ${nextAllowedStr}</span>`}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${"verified"===t?.kyc_status?"bg-green-500/20":"bg-red-500/20"}">
              <i class="fas ${"verified"===t?.kyc_status?"fa-check text-green-400":"fa-times text-red-400"} text-[10px]"></i>
            </div>
            <div class="flex-1 flex items-center justify-between">
              <span class="text-sm text-gray-300">KYC vérifié — <span class="text-xs text-gray-500">Niveau ${wdConfig.kyc_level||0} · ${kycLevelLabel}</span></span>
              ${"verified"!==t?.kyc_status?`<button onclick="showPage('kyc')" class="text-xs text-rouge-400 hover:underline">Compléter →</button>`:`<span class="text-xs text-gray-500">Plafond : <strong class="text-white">${kycMaxStr}</strong></span>`}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${(t?.wallet_balance||0)>=minWd?"bg-green-500/20":"bg-yellow-500/20"}">
              <i class="fas ${(t?.wallet_balance||0)>=minWd?"fa-check text-green-400":"fa-exclamation text-yellow-400"} text-[10px]"></i>
            </div>
            <div class="flex-1 flex items-center justify-between">
              <span class="text-sm text-gray-300">Solde retirable : <strong class="text-rouge-400">${fmt$(t?.wallet_balance)}</strong></span>
              <span class="text-xs text-gray-500">Minimum : <strong class="text-white">${fmt$(minWd)}</strong></span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${hasPending?"bg-yellow-500/20":"bg-green-500/20"}">
              <i class="fas ${hasPending?"fa-clock text-yellow-400":"fa-check text-green-400"} text-[10px]"></i>
            </div>
            <div class="flex-1">
              <span class="text-sm text-gray-300">${hasPending?'<strong class="text-yellow-400">Retrait en cours</strong> — attendez qu\'il soit traité':'Aucun retrait en cours — vous pouvez soumettre'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Formulaire -->
      <div class="bg-dark-800 rounded-2xl border ${canWithdraw?"border-rouge-500/25":"border-dark-600"} p-6 space-y-4 transition-all ${canWithdraw?"":"opacity-60"}">
        <div>
          <label class="form-label">Montant à retirer ($)</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-rouge-400 font-bold">$</span>
            <input id="wd-amount" type="number" min="${minWd}" max="${t?.wallet_balance||0}" step="0.01"
              placeholder="Minimum ${fmt$(minWd)}" class="form-input pl-7" ${canWithdraw?"":"disabled"}
              oninput="wdUpdatePreview()">
          </div>
          ${(t?.wallet_balance||0)>0?`
          <div class="flex gap-2 mt-1.5 flex-wrap">
            <button onclick="document.getElementById('wd-amount').value='${(t?.wallet_balance||0).toFixed(2)}';wdUpdatePreview()" class="text-xs text-rouge-400 hover:text-rouge-400 bg-rouge-500/10 hover:bg-rouge-500/15 px-2 py-0.5 rounded-lg transition">Tout retirer (${fmt$(t?.wallet_balance)})</button>
            ${(t?.wallet_balance||0)>200?`<button onclick="document.getElementById('wd-amount').value='${Math.floor((t?.wallet_balance||0)/2)}.00';wdUpdatePreview()" class="text-xs text-gray-400 hover:text-gray-300 bg-dark-600 hover:bg-dark-500 px-2 py-0.5 rounded-lg transition">50% (${fmt$((t?.wallet_balance||0)/2)})</button>`:""}
          </div>`:""}
        </div>
        <!-- Sélecteur méthode de paiement -->
        <div>
          <label class="form-label">Méthode de paiement</label>
          <div class="flex gap-2 flex-wrap">
            <button id="wd-tab-paypal" onclick="wdSwitchMethod('paypal')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all bg-dark-700 text-gray-400 border-dark-600">
              <i class="fab fa-paypal text-blue-400"></i>PayPal
            </button>
            <button id="wd-tab-bank_transfer" onclick="wdSwitchMethod('bank_transfer')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all bg-dark-700 text-gray-400 border-dark-600">
              <i class="fas fa-university text-green-400"></i>Virement bancaire
            </button>
            <button id="wd-tab-crypto" onclick="wdSwitchMethod('crypto')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all bg-dark-700 text-gray-400 border-dark-600">
              <i class="fas fa-coins text-yellow-400"></i>Crypto
            </button>
          </div>
        </div>
        <!-- Panel PayPal -->
        <div id="wd-panel-paypal" style="display:none">
          <label class="form-label">Email PayPal de réception</label>
          <div class="relative">
            <i class="fab fa-paypal absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-sm"></i>
            <input id="wd-paypal" type="email" placeholder="votre@paypal.com"
              class="form-input pl-8" ${canWithdraw?"":"disabled"}>
          </div>
          <p class="text-xs text-gray-500 mt-1"><i class="fas fa-info-circle mr-1"></i>Assurez-vous que cet email est bien associé à un compte PayPal actif.</p>
        </div>
        <!-- Panel Virement bancaire -->
        <div id="wd-panel-bank_transfer" style="display:none" class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="form-label">Titulaire du compte <span class="text-red-400">*</span></label>
              <input id="wd-bank-holder" type="text" placeholder="Nom complet du titulaire" class="form-input" ${canWithdraw?"":"disabled"}>
            </div>
            <div>
              <label class="form-label">IBAN <span class="text-red-400">*</span></label>
              <input id="wd-bank-iban" type="text" placeholder="FR76..." class="form-input font-mono" ${canWithdraw?"":"disabled"}>
            </div>
            <div>
              <label class="form-label">BIC / SWIFT <span class="text-red-400">*</span></label>
              <input id="wd-bank-bic" type="text" placeholder="BNPAFRPP" class="form-input font-mono" ${canWithdraw?"":"disabled"}>
            </div>
            <div>
              <label class="form-label">Nom de la banque</label>
              <input id="wd-bank-name" type="text" placeholder="BNP Paribas" class="form-input" ${canWithdraw?"":"disabled"}>
            </div>
            <div>
              <label class="form-label">Numéro de compte</label>
              <input id="wd-bank-account" type="text" placeholder="Numéro de compte (optionnel)" class="form-input" ${canWithdraw?"":"disabled"}>
            </div>
            <div class="sm:col-span-2">
              <label class="form-label">Adresse de la banque</label>
              <input id="wd-bank-address" type="text" placeholder="Adresse complète (optionnel)" class="form-input" ${canWithdraw?"":"disabled"}>
            </div>
          </div>
        </div>
        <!-- Panel Crypto -->
        <div id="wd-panel-crypto" style="display:none" class="space-y-3">
          <div>
            <label class="form-label">Adresse du wallet <span class="text-red-400">*</span></label>
            <input id="wd-crypto-address" type="text" placeholder="Adresse wallet (ex: TXyz...)" class="form-input font-mono" ${canWithdraw?"":"disabled"}>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Réseau <span class="text-red-400">*</span></label>
              <input id="wd-crypto-network" type="text" placeholder="TRC20, ERC20..." class="form-input" ${canWithdraw?"":"disabled"}>
            </div>
            <div>
              <label class="form-label">Devise <span class="text-red-400">*</span></label>
              <input id="wd-crypto-currency" type="text" placeholder="USDT, BTC..." class="form-input" ${canWithdraw?"":"disabled"}>
            </div>
          </div>
        </div>
        <div>
          <label class="form-label">PIN de sécurité <span class="text-gray-500 font-normal">(4 ou 6 chiffres)</span></label>
          <div class="relative">
            <i class="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
            <input id="wd-pin" type="password" maxlength="6" placeholder="••••••"
              class="form-input pl-8 tracking-widest font-mono" ${canWithdraw?"":"disabled"}>
          </div>
          ${t?.pin_hash?"":'\n          <p class="text-xs text-orange-400 mt-1"><i class="fas fa-triangle-exclamation mr-1"></i>PIN non configuré — <button onclick="showPage(\'profile\')" class="underline">Configurer dans Mon Profil</button></p>'}
        </div>

        <!-- Preview récapitulatif dynamique -->
        <div id="wd-preview" class="hidden bg-dark-700 border border-dark-500 rounded-xl p-4 space-y-2">
          <div class="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Récapitulatif de votre demande</div>
          <div class="flex justify-between text-sm"><span class="text-gray-400">Montant demandé</span><span id="prev-amount" class="text-white font-bold">—</span></div>
          <div class="flex justify-between text-sm"><span class="text-gray-400">Frais de traitement</span><span class="text-green-400 font-medium">$0.00 <span class="text-xs text-gray-600">(offerts)</span></span></div>
          <div class="h-px bg-dark-500 my-1"></div>
          <div class="flex justify-between text-sm font-bold"><span class="text-gray-300">Vous recevrez</span><span id="prev-net" class="text-rouge-400 text-base">—</span></div>
          <div class="flex justify-between text-xs text-gray-500 mt-1"><span>Vers :</span><span id="prev-paypal" class="text-gray-300">—</span></div>
          <div class="flex justify-between text-xs text-gray-500"><span>Délai estimé :</span><span class="text-gray-300">24-48h après validation</span></div>
        </div>

        <div id="wd-error" class="hidden text-red-400 text-sm bg-red-900/20 rounded-lg p-3 flex items-start gap-2"><i class="fas fa-circle-exclamation mt-0.5 flex-shrink-0"></i><span id="wd-error-msg"></span></div>
        <button onclick="doWithdrawConfirm()" class="w-full ${canWithdraw?"bg-rouge-500 text-dark-900 hover:bg-rouge-500":"bg-dark-600 text-gray-500 cursor-not-allowed"} font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
          ${canWithdraw?"":"disabled"}>
          <i class="fas fa-paper-plane"></i>Vérifier et soumettre ma demande
        </button>
        <p class="text-xs text-gray-600 text-center"><i class="fas fa-shield-alt mr-1"></i>Votre PIN est chiffré (bcrypt) et jamais transmis en clair sur le réseau.</p>
      </div>

      <!-- Historique retraits -->
      ${n.length>0?`
      <div class="bg-dark-800 border border-dark-600 rounded-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-dark-600 flex items-center justify-between">
          <h3 class="font-semibold text-white flex items-center gap-2"><i class="fas fa-history text-gray-400 text-sm"></i>Historique de mes retraits</h3>
          <span class="text-xs text-gray-500">${window._wdTotal} retrait(s) au total</span>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Montant</th><th>Net reçu</th><th>Vers</th><th>Réf.</th><th>Statut</th></tr></thead>
            <tbody>
              ${n.map(w=>`
              <tr>
                <td class="text-gray-500 text-xs whitespace-nowrap">${fmtDate(w.created_at)}</td>
                <td class="text-white font-medium">${fmt$(w.amount)}</td>
                <td class="text-green-400 font-bold">${fmt$(w.net_amount)}</td>
                <td class="text-gray-400 text-xs max-w-[130px] truncate">${w.paypal_email}</td>
                <td class="text-xs text-gray-500 font-mono">${w.payment_reference||"—"}</td>
                <td>${wdStatusBadge(w.status)}</td>
              </tr>
              ${"rejected"===w.status&&w.admin_note?`
              <tr class="bg-red-900/10"><td colspan="6" class="text-xs text-red-400 py-1.5 px-4"><i class="fas fa-comment-alt mr-1"></i>Raison : ${w.admin_note}</td></tr>`:""}
              ${"completed"===w.status&&w.payment_reference?`
              <tr class="bg-green-900/5"><td colspan="6" class="text-xs text-green-400/60 py-1 px-4"><i class="fas fa-check-circle mr-1"></i>Confirmé le ${fmtDate(w.confirmed_at||w.created_at)} · Réf: ${w.payment_reference}</td></tr>`:""}
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="px-5 py-3 border-t border-dark-600 flex justify-between items-center">
          <button onclick="showPage('transactions')" class="text-xs text-rouge-400 hover:underline">Voir toutes les transactions →</button>
        </div>
      </div>`:""}
    </div><div id="wd-pagination" class="px-6 py-3 border-t border-dark-600 mt-2"></div>`;
  window._wdWithdrawConfig={minWd,kycMax,balance:t?.wallet_balance||0,paypal:t?.paypal_email||""};
  // Charger les coordonnées de paiement sauvegardées et pré-sélectionner la bonne méthode
  try {
    if (!window._memberPayoutInfo || !window._memberPayoutInfo.payout_method) {
      const piRes = await api("GET", "/members/payout-info");
      window._memberPayoutInfo = piRes.payout || {};
    }
  } catch(e) { /* silencieux si pas de coordonnées */ }
  setTimeout(function(){ if(typeof wdInitForm==='function') wdInitForm(); }, 50);
  renderPagination("wd-pagination",(window._wdTotal||0),page,perPage,function(p){renderWithdraw(el,p,window._wdPerPage);},function(pp,p){renderWithdraw(el,p,pp);});}catch(err){el.innerHTML=`<div class="p-4 text-red-400 flex items-center gap-2"><i class="fas fa-triangle-exclamation"></i>Erreur : ${err.error||err.message}</div>`;}}
function wdUpdatePreview(){const cfg=window._wdWithdrawConfig||{};const amount=parseFloat(document.getElementById("wd-amount")?.value)||0;const paypal=document.getElementById("wd-paypal")?.value||cfg.paypal||"—";const preview=document.getElementById("wd-preview");if(!preview)return;if(amount>0){preview.classList.remove("hidden");document.getElementById("prev-amount").textContent=fmt$(amount);document.getElementById("prev-net").textContent=fmt$(amount);document.getElementById("prev-paypal").textContent=paypal||"—";}else{preview.classList.add("hidden");}}
function doWithdrawConfirm(){const cfg=window._wdWithdrawConfig||{minWd:50,kycMax:0,balance:0};const amount=parseFloat(document.getElementById("wd-amount")?.value||"0");const pin=document.getElementById("wd-pin")?.value||"";const method=window._wdActiveMethod||"paypal";const errEl=document.getElementById("wd-error");const errMsg=document.getElementById("wd-error-msg");const hideErr=()=>errEl?.classList.add("hidden");const showErr=(msg)=>{if(errEl&&errMsg){errMsg.textContent=msg;errEl.classList.remove("hidden");}};hideErr();if(!amount||amount<=0)return showErr("Veuillez saisir un montant valide.");if(amount<cfg.minWd)return showErr(`Montant minimum : ${fmt$(cfg.minWd)}`);if(amount>cfg.balance)return showErr(`Solde insuffisant. Disponible : ${fmt$(cfg.balance)}`);if(cfg.kycMax>0&&amount>cfg.kycMax)return showErr(`Votre niveau KYC limite les retraits à ${fmt$(cfg.kycMax)} par transaction.`);if(!pin||pin.length<4)return showErr("Veuillez saisir votre PIN (4 ou 6 chiffres).");let payload={amount,pin,payout_method:method};let methodLabel="";let destSummary="";if(method==="paypal"){const email=document.getElementById("wd-paypal")?.value?.trim()||"";if(!email||!email.includes("@"))return showErr("Email PayPal invalide.");payload.paypal_email=email;methodLabel='<i class="fab fa-paypal mr-1 text-blue-400"></i>Vers PayPal';destSummary=email;}else if(method==="bank_transfer"){const holder=document.getElementById("wd-bank-holder")?.value?.trim()||"";const iban=document.getElementById("wd-bank-iban")?.value?.trim()||"";const bic=document.getElementById("wd-bank-bic")?.value?.trim()||"";if(!holder)return showErr("Titulaire du compte requis.");if(!iban)return showErr("IBAN requis.");if(!bic)return showErr("BIC requis.");payload.payout_bank_holder=holder;payload.payout_bank_iban=iban;payload.payout_bank_bic=bic;payload.payout_bank_name=document.getElementById("wd-bank-name")?.value?.trim()||"";payload.payout_bank_account=document.getElementById("wd-bank-account")?.value?.trim()||"";payload.payout_bank_address=document.getElementById("wd-bank-address")?.value?.trim()||"";payload.payout_bank_city=document.getElementById("wd-bank-city")?.value?.trim()||"";payload.payout_bank_country=document.getElementById("wd-bank-country")?.value?.trim()||"";payload.payout_bank_swift=document.getElementById("wd-bank-swift")?.value?.trim()||"";methodLabel='<i class="fas fa-university mr-1 text-green-400"></i>Virement bancaire';destSummary=`${iban} — ${holder}`;}else if(method==="crypto"){const addr=document.getElementById("wd-crypto-address")?.value?.trim()||"";const network=document.getElementById("wd-crypto-network")?.value?.trim()||"";const currency=document.getElementById("wd-crypto-currency")?.value?.trim()||"";if(!addr)return showErr("Adresse wallet requise.");if(!network)return showErr("Réseau blockchain requis.");if(!currency)return showErr("Devise crypto requise.");payload.payout_crypto_address=addr;payload.payout_crypto_network=network;payload.payout_crypto_currency=currency;methodLabel='<i class="fas fa-coins mr-1 text-yellow-400"></i>Cryptomonnaie';destSummary=`${currency} (${network}) — ${addr.slice(0,12)}...`;}else return showErr("Méthode de paiement invalide.");window._wdCurrentPayload=payload;showModal(`
  <div class="p-6 space-y-5 max-w-sm mx-auto">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-rouge-500/15 flex items-center justify-center flex-shrink-0">
        <i class="fas fa-paper-plane text-rouge-400"></i>
      </div>
      <div>
        <h3 class="font-bold text-white">Confirmer le retrait</h3>
        <p class="text-xs text-gray-500">Vérifiez les informations avant de valider</p>
      </div>
    </div>
    <div class="bg-dark-700 rounded-xl border border-dark-500 divide-y divide-dark-500">
      <div class="flex justify-between items-center px-4 py-3">
        <span class="text-sm text-gray-400">Montant</span>
        <span class="text-lg font-black text-white">${fmt$(amount)}</span>
      </div>
      <div class="flex justify-between items-center px-4 py-3">
        <span class="text-sm text-gray-400">Frais</span>
        <span class="text-sm text-green-400 font-medium">$0.00 <span class="text-xs text-gray-600">(offerts)</span></span>
      </div>
      <div class="flex justify-between items-center px-4 py-3 bg-rouge-500/5">
        <span class="text-sm font-semibold text-gray-200">Vous recevrez</span>
        <span class="text-xl font-black text-rouge-400">${fmt$(amount)}</span>
      </div>
      <div class="flex justify-between items-center px-4 py-3">
        <span class="text-sm text-gray-400">${methodLabel}</span>
        <span class="text-sm text-gray-200 font-mono text-xs break-all">${destSummary}</span>
      </div>
      <div class="flex justify-between items-center px-4 py-3">
        <span class="text-sm text-gray-400">Délai estimé</span>
        <span class="text-sm text-gray-300">24-48h</span>
      </div>
    </div>
    <div class="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-3">
      <p class="text-xs text-yellow-400"><i class="fas fa-triangle-exclamation mr-1"></i>Cette demande sera vérifiée manuellement par notre équipe avant paiement. Vous serez notifié(e) dès validation.</p>
    </div>
    <div id="wd-confirm-error" class="hidden text-red-400 text-xs bg-red-900/20 rounded-lg p-2"></div>
    <div class="flex gap-3">
      <button onclick="closeModal()" class="flex-1 bg-dark-600 text-gray-300 hover:bg-dark-500 font-medium py-2.5 rounded-xl text-sm transition">Annuler</button>
      <button id="wd-confirm-btn" onclick="doWithdraw()" class="flex-1 bg-rouge-500 text-dark-900 hover:bg-rouge-500 font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2"><i class="fas fa-check"></i>Valider</button>
    </div>
  </div>`);}
async function doWithdraw(){const p=window._wdCurrentPayload;if(!p)return;const btn=document.getElementById("wd-confirm-btn");const errEl=document.getElementById("wd-confirm-error");if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Envoi...';}if(errEl)errEl.classList.add("hidden");try{await api("POST","/members/withdraw",p);closeModal();showToast("Demande de retrait soumise ! Traitement sous 24-48h.","success");showPage("wallet");}catch(e){if(errEl){errEl.textContent=e.error||"Erreur lors de la soumission";errEl.classList.remove("hidden");}if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-check mr-2"></i>Valider';}}}

let _wdActiveMethod="paypal";window._wdActiveMethod="paypal";function wdSwitchMethod(method){window._wdActiveMethod=method;_wdActiveMethod=method;const methods=["paypal","bank_transfer","crypto"];methods.forEach(m=>{const tab=document.getElementById("wd-tab-"+m);const panel=document.getElementById("wd-panel-"+m);if(tab){if(m===method){tab.classList.add("bg-rouge-500","text-dark-900","border-rouge-500");tab.classList.remove("bg-dark-700","text-gray-400","border-dark-600");}else{tab.classList.remove("bg-rouge-500","text-dark-900","border-rouge-500");tab.classList.add("bg-dark-700","text-gray-400","border-dark-600");}}if(panel){panel.style.display=m===method?"block":"none";}});}function wdInitForm(){const info=window._memberPayoutInfo||{};const method=info.payout_method||"paypal";wdSwitchMethod(method);const setVal=(id,v)=>{if(v){const el=document.getElementById(id);if(el)el.value=v;}};setVal("wd-paypal",info.payout_paypal_email);setVal("wd-bank-holder",info.payout_bank_holder);setVal("wd-bank-iban",info.payout_bank_iban);setVal("wd-bank-bic",info.payout_bank_bic);setVal("wd-bank-name",info.payout_bank_name);setVal("wd-bank-account",info.payout_bank_account);setVal("wd-bank-address",info.payout_bank_address);setVal("wd-bank-city",info.payout_bank_city);setVal("wd-bank-country",info.payout_bank_country);setVal("wd-bank-swift",info.payout_bank_swift);setVal("wd-crypto-address",info.payout_crypto_address);setVal("wd-crypto-network",info.payout_crypto_network);setVal("wd-crypto-currency",info.payout_crypto_currency);}async function doConvertDreamiles(){let e=null;try{e=await api("GET","/members/dreamiles")}catch(e){return void showToast("Impossible de charger le solde Dreamiles","error")}const t=e?.wallet?.dreamiles||0;t<=0?showToast("Aucun Dreamile disponible à convertir","error"):showModal(`\n
  <div class="p-6 space-y-5 max-w-sm mx-auto">\n
    <div class="flex justify-between items-center">\n
      <div class="flex items-center gap-3">\n
        <div class="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">\n
          <i class="fas fa-sync text-yellow-400"></i>\n
        </div>\n
        <div>\n
          <h3 class="font-bold text-white">Convertir des Dreamiles</h3>\n
          <p class="text-xs text-gray-500">1 Dreamile = 1 $ dans votre wallet principal</p>\n
        </div>\n
      </div>\n
      <button onclick="closeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>\n
    </div>\n
\n
    <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center">\n
      <div class="text-xs text-gray-400 mb-1">Solde disponible</div>\n
      <div class="text-2xl font-bold text-yellow-400">${t.toLocaleString()} <span class="text-base">DRM</span></div>\n
      <div class="text-xs text-yellow-600 mt-0.5">≈ ${fmt$(t)}</div>\n
    </div>\n
\n
    <div>\n
      <label class="form-label">Nombre de Dreamiles à convertir</label>\n
      <input id="drm-convert-amount" type="number" min="1" max="${t}" step="1"\n
        class="form-input" value="${t}" placeholder="Ex: 100">\n
      <button onclick="document.getElementById('drm-convert-amount').value='${t}'"\n
        class="text-xs text-yellow-400 hover:underline mt-1">Tout convertir (${t.toLocaleString()} DRM)</button>\n
    </div>\n
\n
    <div id="drm-convert-error" class="text-red-400 text-sm hidden"></div>\n
\n
    <div class="flex gap-3">\n
      <button onclick="closeModal()" class="flex-1 py-3 bg-dark-700 text-gray-300 rounded-xl hover:bg-dark-600 transition text-sm">Annuler</button>\n
      <button onclick="confirmConvertDreamiles(${t})"\n
        class="flex-1 py-3 bg-yellow-500 text-dark-900 font-bold rounded-xl hover:bg-yellow-400 transition text-sm">\n
        <i class="fas fa-sync mr-2"></i>Convertir\n
      </button>\n
    </div>\n
  </div>`)}async function confirmConvertDreamiles(e){const t=parseInt(document.getElementById("drm-convert-amount").value),n=document.getElementById("drm-convert-error");if(n.classList.add("hidden"),!t||t<=0)return n.textContent="Montant invalide",void n.classList.remove("hidden");if(t>e)return n.textContent=`Maximum disponible : ${e} DRM`,void n.classList.remove("hidden");try{const e=await api("POST","/members/dreamiles/convert",{dreamiles:t});closeModal(),showToast(`${t.toLocaleString()} Dreamiles convertis → ${fmt$(e.usd_credited)} crédités dans votre wallet !`),showPage("wallet")}catch(e){n.textContent=e.error||"Erreur lors de la conversion",n.classList.remove("hidden")}}const TX_TYPE_CONFIG={prime_leadership_daily:{label:"Prime Leadership",badge:"bg-emerald-500/15 text-emerald-400",icon:"fa-crown",group:"Versement journalier"},fast_start_daily:{label:"Fast Start",badge:"bg-emerald-500/15 text-emerald-400",icon:"fa-rocket",group:"Versement journalier"},valorisation_recommandation_daily:{label:"Valorisation Reco.",badge:"bg-emerald-500/15 text-emerald-400",icon:"fa-handshake",group:"Versement journalier"},bonus_influence_daily:{label:"Bonus Influence",badge:"bg-purple-500/15 text-purple-400",icon:"fa-sitemap",group:"Versement journalier"},bonus_rayonnement_daily:{label:"Bonus Rayonnement",badge:"bg-cyan-500/15 text-cyan-400",icon:"fa-sun",group:"Versement journalier"},credit_daily:{label:"Versement journalier",badge:"bg-emerald-500/15 text-emerald-400",icon:"fa-calendar-day",group:"Versement journalier"},prime_leadership:{label:"Prime Leadership",badge:"bg-rouge-500/15 text-rouge-400",icon:"fa-crown",group:"Commission créditée"},fast_start:{label:"Fast Start Bonus",badge:"bg-green-500/15 text-green-400",icon:"fa-rocket",group:"Commission créditée"},valorisation_recommandation:{label:"Valorisation Reco.",badge:"bg-blue-500/15 text-blue-400",icon:"fa-handshake",group:"Commission créditée"},bonus_influence:{label:"Bonus d'Influence",badge:"bg-purple-500/15 text-purple-400",icon:"fa-sitemap",group:"Commission créditée"},bonus_rayonnement:{label:"Bonus de Rayonnement",badge:"bg-cyan-500/15 text-cyan-400",icon:"fa-sun",group:"Commission créditée"},reserve_strategique:{label:"Réserve Stratégique",badge:"bg-amber-500/15 text-amber-400",icon:"fa-piggy-bank",group:"Commission créditée"},credit_croissance:{label:"Crédit de Croissance",badge:"bg-teal-500/15 text-teal-400",icon:"fa-chart-line",group:"Commission créditée"},commission:{label:"Commission",badge:"bg-green-500/15 text-green-400",icon:"fa-coins",group:"Commission créditée"},dreamiles_conversion:{label:"Conversion Luxia",badge:"bg-yellow-500/15 text-yellow-400",icon:"fa-gem",group:"Conversion"},retrait:{label:"Retrait demandé",badge:"bg-red-500/15 text-red-400",icon:"fa-paper-plane",group:"Retrait"},debit_withdrawal:{label:"Retrait exécuté",badge:"bg-red-500/15 text-red-400",icon:"fa-arrow-up-right-from-square",group:"Retrait"},withdrawal:{label:"Retrait",badge:"bg-red-500/15 text-red-400",icon:"fa-paper-plane",group:"Retrait"},retrait_paypal:{label:"Retrait PayPal",badge:"bg-red-500/15 text-red-400",icon:"fa-paper-plane",group:"Retrait"},package_purchase:{label:"Achat Package",badge:"bg-blue-500/15 text-blue-400",icon:"fa-box-open",group:"Achat"},package_upgrade:{label:"Upgrade Package",badge:"bg-indigo-500/15 text-indigo-400",icon:"fa-arrow-up",group:"Achat"},license_purchase:{label:"Achat Licence",badge:"bg-orange-500/15 text-orange-400",icon:"fa-id-card",group:"Achat"},campus_purchase:{label:"Formation Campus",badge:"bg-violet-500/15 text-violet-400",icon:"fa-graduation-cap",group:"Achat"},withdrawal:{label:"Retrait",badge:"bg-red-500/15 text-red-400",icon:"fa-paper-plane",group:"Retrait"}},TX_DETAIL_LABELS={prime_leadership:{title:"Prime de Leadership",color:"text-rouge-400",icon:"fa-crown",desc:"Prime mensuelle basée sur le volume de réseau (BV) généré par les deux jambes."},fast_start:{title:"Fast Start Bonus",color:"text-green-400",icon:"fa-rocket",desc:"Bonus de démarrage rapide attribué selon le BV accumulé dans les premiers jours."},valorisation_recommandation:{title:"Valorisation Recommandation",color:"text-blue-400",icon:"fa-handshake",desc:"Bonus versé pour chaque parrainage direct ayant activé un package."},bonus_influence:{title:"Bonus d'Influence",color:"text-purple-400",icon:"fa-sitemap",desc:"Bonus calculé sur la Prime de Leadership d'un membre de la downline (chaîne sponsor, 5 niveaux)."},bonus_rayonnement:{title:"Bonus de Rayonnement",color:"text-cyan-400",icon:"fa-sun",desc:"10% de la Prime de Leadership de chaque filleul direct ayant validé les conditions du mois."},reserve_strategique:{title:"Réserve Stratégique",color:"text-amber-400",icon:"fa-piggy-bank",desc:"Épargne constituée sur 3 ans, abondée par le réseau. Libération progressive au terme."},credit_croissance:{title:"Crédit de Croissance",color:"text-teal-400",icon:"fa-chart-line",desc:"Crédit différé utilisable pour l'activation ou le renouvellement de packages."},campus_purchase:{title:"Achat Formation Campus",color:"text-violet-400",icon:"fa-graduation-cap",desc:"Achat d'une formation via le Campus LEADER."}},INFLUENCE_LEVEL_PCT={1:5,2:4,3:3,4:2,5:1};function _parseTxInfluenceLevel(e){if(!e)return null;const t=e.match(/Niveau\s+(\d)/i);return t?parseInt(t[1]):null}function _parseTxRayonnementName(e){if(!e)return null;const t=e.match(/Bonus de Rayonnement\s+—\s+(.+?)\s+—/);return t?t[1].trim():null}function _buildSourceSection(e){const t=e.transaction_type||e.tx_type||"";if(!["bonus_influence","bonus_rayonnement","valorisation_recommandation"].includes(t))return"";let n=e.source_name||null,a=e.source_unique_id||null,s=e.source_rank||null;n||"bonus_rayonnement"!==t||(n=_parseTxRayonnementName(e.description));let r="",i="",l="";if("bonus_influence"===t){const t=_parseTxInfluenceLevel(e.description),n=t&&INFLUENCE_LEVEL_PCT[t]||null;t&&(r=`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-xs font-semibold">\n
                      <i class="fas fa-layer-group text-[10px]"></i> Niveau ${t}\n
                    </span>`),n&&(i=`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium">\n
                    ${n}%\n
                  </span>`),n&&e.amount&&(l=`\n
        <div class="flex justify-between items-center py-1.5 border-t border-dark-600 mt-2">\n
          <span class="text-xs text-gray-500">Prime de base (source)</span>\n
          <span class="text-xs font-semibold text-gray-200">${fmt$(Math.abs(e.amount)/(n/100))}</span>\n
        </div>`)}"bonus_rayonnement"===t&&(i='<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium">\n                  10%\n                </span>',e.amount)&&(l=`\n
        <div class="flex justify-between items-center py-1.5 border-t border-dark-600 mt-2">\n
          <span class="text-xs text-gray-500">Prime de base (filleul)</span>\n
          <span class="text-xs font-semibold text-gray-200">${fmt$(Math.abs(e.amount)/.1)}</span>\n
        </div>`);const d=n||"—";return`\n
    <div class="bg-dark-700 rounded-xl p-4 mt-3 border border-dark-600/60">\n
      <div class="text-xs text-gray-400 mb-3 uppercase tracking-wide font-semibold flex items-center gap-2">\n
        <i class="fas fa-user-circle text-gray-500"></i>\n
        ${{bonus_influence:"Membre source (downline)",bonus_rayonnement:"Filleul direct",valorisation_recommandation:"Filleul parrainé"}[t]||"Généré par"}\n
      </div>\n
      <div class="flex items-center gap-3">\n
        <div class="w-10 h-10 rounded-full ${{bonus_influence:"text-purple-400 bg-purple-500/15",bonus_rayonnement:"text-cyan-400 bg-cyan-500/15",valorisation_recommandation:"text-blue-400 bg-blue-500/15"}[t]||"text-gray-400 bg-dark-600"} flex items-center justify-center text-sm font-bold flex-shrink-0">\n
          ${"—"!==d?d.charAt(0).toUpperCase():"?"}\n
        </div>\n
        <div class="flex-1 min-w-0">\n
          <div class="font-semibold text-white text-sm truncate">${d}</div>\n
          <div class="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">\n
            ${a?`<span class="font-mono">${a}</span>`:""}\n
            ${s?`<span class="inline-flex items-center gap-1"><i class="fas fa-medal text-[10px] text-rouge-400"></i>${s}</span>`:""}\n
          </div>\n
        </div>\n
        <div class="flex flex-col items-end gap-1 flex-shrink-0">\n
          ${r}\n
          ${i}\n
        </div>\n
      </div>\n
      ${l}\n
    </div>`}let _txModalData=null;function showTxDetail(e){const t="string"==typeof e?JSON.parse(e):e;_txModalData=t;const n=TX_TYPE_CONFIG[t.transaction_type||t.tx_type]||TX_TYPE_CONFIG.commission,a=TX_DETAIL_LABELS[t.transaction_type]||null,s=(t.amount??0)>=0,r=_buildSourceSection(t),i=t.comm_period?`\n
    <div class="flex justify-between items-center py-2 border-b border-dark-600">\n
      <span class="text-xs text-gray-400">Période</span>\n
      <span class="text-sm font-medium text-white">${t.comm_period}</span>\n
    </div>`:"";document.getElementById("tx-detail-modal")?.remove();const l=document.createElement("div");l.id="tx-detail-modal",l.className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4",l.innerHTML=`\n
    \x3c!-- Overlay --\x3e\n
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" onclick="closeTxModal()"></div>\n
    \x3c!-- Panel --\x3e\n
    <div class="relative w-full max-w-md bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">\n
      \x3c!-- Header coloré selon type --\x3e\n
      <div class="px-5 py-4 border-b border-dark-600 flex items-center justify-between gap-3">\n
        <div class="flex items-center gap-3">\n
          <div class="w-10 h-10 rounded-full flex items-center justify-center ${s?"bg-emerald-500/20":"bg-red-500/20"}">\n
            <i class="fas ${n?.icon||"fa-circle"} ${s?"text-emerald-400":"text-red-400"}"></i>\n
          </div>\n
          <div>\n
            <div class="font-bold text-white text-sm">${n?.label||t.transaction_type}</div>\n
            <div class="text-xs text-gray-400">${n?.group||"Transaction"}</div>\n
          </div>\n
        </div>\n
        <button onclick="closeTxModal()" class="w-8 h-8 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center text-gray-400 hover:text-white transition">\n
          <i class="fas fa-times text-sm"></i>\n
        </button>\n
      </div>\n
\n
      \x3c!-- Corps --\x3e\n
      <div class="p-5 space-y-1 max-h-[75vh] overflow-y-auto">\n
        \x3c!-- Montant principal --\x3e\n
        <div class="text-center py-4">\n
          <div class="text-3xl font-black ${s?"text-emerald-400":"text-red-400"}">\n
            ${s?"+":"−"}${fmt$(Math.abs(t.amount??0))}\n
          </div>\n
          <div class="text-xs text-gray-400 mt-1">${{principal:"Principal (disponible)",pending:"En attente (M+1)",dreamiles:"Luxia (Dreamiles)"}[t.wallet_type]||t.wallet_type||"Wallet"}</div>\n
        </div>\n
\n
        \x3c!-- Données de mouvement --\x3e\n
        <div class="bg-dark-700 rounded-xl p-4 space-y-0">\n
          <div class="flex justify-between items-center py-2 border-b border-dark-600">\n
            <span class="text-xs text-gray-400">Date</span>\n
            <span class="text-sm font-medium text-white">${fmtDate(t.created_at)}</span>\n
          </div>\n
          ${i}\n
          <div class="flex justify-between items-center py-2 border-b border-dark-600">\n
            <span class="text-xs text-gray-400">Solde avant</span>\n
            <span class="text-sm text-gray-300">${null!=t.balance_before?fmt$(Math.abs(t.balance_before)):"—"}</span>\n
          </div>\n
          <div class="flex justify-between items-center py-2">\n
            <span class="text-xs text-gray-400">Solde après</span>\n
            <span class="text-sm font-semibold text-white">${null!=t.balance_after?fmt$(Math.abs(t.balance_after)):"—"}</span>\n
          </div>\n
        </div>\n
\n
        \x3c!-- Membre source (section enrichie) --\x3e\n
        ${r}\n
\n
        \x3c!-- Explication du type --\x3e\n
        ${a?`\n
        <div class="bg-dark-700/50 border border-dark-600 rounded-xl p-4 mt-2">\n
          <div class="flex items-center gap-2 mb-2">\n
            <i class="fas ${a.icon} ${a.color} text-sm"></i>\n
            <span class="text-xs font-semibold ${a.color}">${a.title}</span>\n
          </div>\n
          <p class="text-xs text-gray-400 leading-relaxed">${a.desc}</p>\n
        </div>`:""}\n
      </div>\n
\n
      \x3c!-- Footer --\x3e\n
      <div class="px-5 pb-5 pt-3 border-t border-dark-600">\n
        <button onclick="closeTxModal()" class="w-full bg-dark-700 hover:bg-dark-600 text-gray-300 font-semibold py-3 rounded-xl transition text-sm">\n
          Fermer\n
        </button>\n
      </div>\n
    </div>`,document.body.appendChild(l)}function closeTxModal(){document.getElementById("tx-detail-modal")?.remove(),_txModalData=null}async function renderTransactions(e,page,perPage){page=page||window._txPage||1;perPage=perPage||window._txPerPage||25;window._txPage=page;window._txPerPage=perPage;e.innerHTML='<div class="flex items-center justify-center py-16"><div class="loader"></div></div>';try{const resp=await api("GET","/members/transactions?page="+page+"&per_page="+perPage);const t=resp.transactions||[],total=resp.total||t.length;const statusBadgeTx=function(s){const map={validated:"bg-emerald-500/15 text-emerald-400",pending:"bg-amber-500/15 text-amber-400",approved:"bg-emerald-500/15 text-emerald-400",rejected:"bg-red-500/15 text-red-400",cancelled:"bg-gray-500/15 text-gray-400",processing:"bg-blue-500/15 text-blue-400"};const lbl={validated:"Validé",pending:"En attente",approved:"Approuvé",rejected:"Rejeté",cancelled:"Annulé",processing:"En cours"};return'<span class="text-[10px] px-1.5 py-0.5 rounded-full '+(map[s]||"bg-gray-500/15 text-gray-400")+'">'+(lbl[s]||s||"—")+"</span>";};let rows="";for(const row of t){const isCredit=(row.amount??0)>=0;const txType=row.tx_type||row.transaction_type||"";const cfg=TX_TYPE_CONFIG[txType]||TX_TYPE_CONFIG.commission;const desc=row.description||"—";const balAfter=null!=row.balance_after?fmt$(Math.abs(row.balance_after)):"—";const srcLine=row.source_name?'<div class="text-[10px] text-gray-500 mt-0.5 truncate max-w-[180px]">de '+row.source_name+"</div>":" ";const pkgLine=row.package_name?'<div class="text-[10px] text-indigo-400/70 mt-0.5">'+row.package_name+"</div>":" ";const encoded=encodeURIComponent(JSON.stringify(row));rows+='<tr class="cursor-pointer hover:bg-dark-700/60 transition-colors group" onclick="showTxDetail(decodeURIComponent(\x27'+encoded+'\x27))"><td class="text-gray-400 text-xs whitespace-nowrap">'+fmtDate(row.created_at)+'</td><td><span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full '+(cfg?.badge||"bg-gray-500/15 text-gray-400")+'"><i class="fas '+(cfg?.icon||"fa-circle")+' text-[10px]"></i>'+(cfg?.label||txType||"—")+"</span></td>"+'<td class="text-gray-300 text-sm max-w-[220px]"><div class="truncate" title="'+desc+'">'+desc+"</div>"+srcLine+pkgLine+"</td>"+"<td>"+statusBadgeTx(row.status)+"</td>"+'<td class="text-right font-bold whitespace-nowrap '+(isCredit?"text-green-400":"text-red-400")+'">'+(isCredit?"+":"−")+fmt$(Math.abs(row.amount??0))+"</td>"+'<td class="text-right font-medium text-white text-sm whitespace-nowrap">'+balAfter+'</td><td class="text-center"><i class="fas fa-chevron-right text-gray-600 group-hover:text-gray-400 text-[10px] transition-colors"></i></td></tr>';}const emptyState='<div class="bg-dark-800 border border-dark-600 rounded-2xl p-12 text-center"><div class="w-16 h-16 rounded-full bg-dark-700 flex items-center justify-center mx-auto mb-4"><i class="fas fa-receipt text-gray-600 text-2xl"></i></div><h3 class="text-gray-400 font-medium mb-2">Aucune transaction pour le moment</h3><p class="text-gray-600 text-sm">Vos bonus, achats de packages, licences et retraits apparaîtront ici.</p></div>';const tableHtml=0===t.length?emptyState:'<div class="text-xs text-gray-500 flex items-center gap-2 mb-2"><i class="fas fa-hand-pointer text-gray-600"></i>Cliquez sur une ligne pour voir le détail</div><div class="bg-dark-800 border border-dark-600 rounded-2xl overflow-hidden"><div class="overflow-x-auto"><table class="data-table w-full"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Statut</th><th class="text-right">Montant</th><th class="text-right">Solde après</th><th class="text-center w-8"></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';e.innerHTML='<div class="space-y-5"><div class="flex items-center justify-between flex-wrap gap-2"><div><h2 class="text-xl font-bold text-white">Toutes les transactions</h2><p class="text-xs text-gray-500 mt-0.5">'+total+' opération'+(total>1?"s":"")+" au total</p></div>"+'<button onclick="showPage(\'wallet\')" class="text-xs text-rouge-400 hover:underline"><i class="fas fa-wallet mr-1"></i>Voir le portefeuille</button></div>'+tableHtml+'</div><div id="tx-pagination" class="px-4 py-3 border-t border-dark-600"></div>';renderPagination("tx-pagination",total,page,perPage,"(function(p){renderTransactions(document.getElementById(\'page-content\'),p,window._txPerPage)})","(function(pp,p){renderTransactions(document.getElementById(\'page-content\'),p,pp)})");}catch(err){e.innerHTML='<div class="p-4 text-red-400"><i class="fas fa-exclamation-circle mr-2"></i>Erreur : '+(err.error||err.message||String(err)||'Erreur inconnue')+"</div>";}}
// ════════════════════════════════════════════════════════════════════════════════
// FONCTIONS MANQUANTES : _showTopupModal, _showTransferModal, _walletPayOrder
// ════════════════════════════════════════════════════════════════════════════════

// _showTopupModal — Ouvrir le wizard en mode recharge wallet (topup)
async function _showTopupModal(){
  _wizardReset();
  _wizardData.isTopup=true;
  // Charger les gateways si pas encore disponibles
  if(!_gw||!Object.keys(_gw).length){
    _wizardShow('<div class="p-10 flex flex-col items-center gap-4"><div class="loader"></div><p class="text-gray-400 text-sm">Chargement des moyens de paiement…</p></div>');
    try{
      const r=await api("GET","/members/packages");
      _gw=_buildGw(r.gateways||{});
      _adminFeeInfo=r.adminFee||{amount:0,active:false,paid:true};
    }catch(e){
      _wizardShow(`<div class="p-8 text-center space-y-4"><i class="fas fa-exclamation-circle text-red-400 text-3xl"></i><p class="text-red-400">Impossible de charger les modes de paiement.<br><span class="text-xs text-gray-500">${e.error||e.message||""}</span></p><button onclick="wizardClose()" class="py-2 px-6 bg-dark-700 text-gray-300 rounded-xl text-sm">Fermer</button></div>`);
      return;
    }
  }
  // Afficher le sélecteur de montant avant de passer au choix de paiement
  _wizardShow(`
  <div class="px-6 pt-5 pb-3 border-b border-dark-600">
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-semibold text-green-400 uppercase tracking-wider">Recharger mon Wallet</span>
      <button onclick="wizardClose()" class="text-gray-400 hover:text-white w-7 h-7 flex items-center justify-center rounded-lg hover:bg-dark-700 text-lg">×</button>
    </div>
  </div>
  <div class="p-6 space-y-5">
    <div>
      <h3 class="text-lg font-bold text-white">Montant de la recharge</h3>
      <p class="text-sm text-gray-400 mt-1">Saisissez le montant que vous souhaitez ajouter à votre wallet.</p>
    </div>
    <div>
      <label class="block text-sm text-gray-400 mb-2">Montant ($)</label>
      <div class="relative">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-green-400 font-bold text-lg">$</span>
        <input id="topup-amount-input" type="number" min="10" step="1" placeholder="Ex : 100"
          class="w-full bg-dark-700 border border-dark-500 rounded-xl pl-10 pr-4 py-3 text-white text-lg font-bold focus:border-green-400 focus:outline-none"
          oninput="document.getElementById('topup-amount-err').classList.add('hidden')">
      </div>
      <div id="topup-amount-err" class="hidden mt-2 text-red-400 text-xs"></div>
    </div>
    <div class="grid grid-cols-4 gap-2">
      ${[50,100,200,500].map(v=>`<button onclick="document.getElementById('topup-amount-input').value=${v}" class="py-2.5 bg-dark-700 hover:bg-green-900/30 border border-dark-500 hover:border-green-500/50 rounded-xl text-sm text-gray-300 hover:text-green-300 font-medium transition">$${v}</button>`).join('')}
    </div>
    <div class="flex gap-3">
      <button onclick="wizardClose()" class="flex-1 py-3 bg-dark-700 text-gray-300 rounded-xl hover:bg-dark-600 transition text-sm">Annuler</button>
      <button onclick="_topupConfirmAmount()" class="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition text-sm">
        <i class="fas fa-arrow-right mr-2"></i>Choisir le paiement
      </button>
    </div>
  </div>`);
}

async function _topupConfirmAmount(){
  const inp=document.getElementById('topup-amount-input');
  const errEl=document.getElementById('topup-amount-err');
  const amount=parseFloat(inp?.value||'0');
  if(!amount||amount<10){
    if(errEl){errEl.textContent='Montant minimum : $10';errEl.classList.remove('hidden');}
    return;
  }
  // Vérifier le montant minimum depuis l'API
  try{
    const cfg=await api("GET","/payment/topup/config");
    const minAmt=cfg.min_amount||10;
    if(amount<minAmt){
      if(errEl){errEl.textContent=`Montant minimum de recharge : $${minAmt}`;errEl.classList.remove('hidden');}
      return;
    }
  }catch(e){}
  _wizardData.totalAmt=amount;
  wizardStep4();
}

// _showTransferModal — Ouvrir le modal de transfert wallet membre à membre
async function _showTransferModal(){
  // Charger config transfert
  let transferCfg={min_amount:10,fee_type:'fixed',fee_value:0};
  let walletBalance=0;
  try{
    const [cfgResp,walletResp]=await Promise.all([
      api("GET","/payment/transfer/config"),
      api("GET","/members/wallet")
    ]);
    transferCfg=cfgResp||transferCfg;
    walletBalance=walletResp?.wallet?.balance||walletResp?.member?.wallet_balance||0;
  }catch(e){}
  const fee=transferCfg.fee_type==='percent'
    ?`${transferCfg.fee_value}%`
    :(transferCfg.fee_value>0?`$${transferCfg.fee_value} fixe`:'Aucun frais');
  showModal(`
  <div class="p-6 space-y-5 max-w-md mx-auto">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <i class="fas fa-exchange-alt text-blue-400"></i>
        </div>
        <div>
          <h3 class="font-bold text-white">Transfert vers un membre</h3>
          <p class="text-xs text-gray-400">Solde disponible : <span class="text-green-400 font-semibold">$${Number(walletBalance).toLocaleString('en-US',{minimumFractionDigits:2})}</span></p>
        </div>
      </div>
      <button onclick="closeModal()" class="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-dark-700 text-xl">×</button>
    </div>

    <div>
      <label class="block text-sm text-gray-400 mb-1.5">ID LEADER du destinataire <span class="text-red-400">*</span></label>
      <div class="flex gap-2">
        <input id="tr-recipient-id" type="text" placeholder="Ex: LEAD123456"
          class="flex-1 bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white uppercase placeholder-gray-500 focus:border-blue-400 focus:outline-none text-sm"
          oninput="this.value=this.value.toUpperCase();document.getElementById('tr-recipient-info').innerHTML=''">
        <button onclick="_transferLookup()" class="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition">
          <i class="fas fa-search"></i>
        </button>
      </div>
      <div id="tr-recipient-info" class="mt-2"></div>
    </div>

    <div>
      <label class="block text-sm text-gray-400 mb-1.5">Montant ($) <span class="text-red-400">*</span></label>
      <div class="relative">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 font-bold">$</span>
        <input id="tr-amount" type="number" min="${transferCfg.min_amount}" step="1" placeholder="Ex : 50"
          class="w-full bg-dark-700 border border-dark-500 rounded-xl pl-9 pr-4 py-3 text-white font-bold focus:border-blue-400 focus:outline-none text-sm">
      </div>
      <p class="text-xs text-gray-500 mt-1">Minimum : $${transferCfg.min_amount} · Frais : ${fee}</p>
    </div>

    <div>
      <label class="block text-sm text-gray-400 mb-1.5">PIN de sécurité <span class="text-red-400">*</span></label>
      <input id="tr-pin" type="password" maxlength="6" placeholder="Votre PIN (4-6 chiffres)"
        class="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white focus:border-blue-400 focus:outline-none text-sm tracking-widest">
    </div>

    <div>
      <label class="block text-sm text-gray-400 mb-1.5">Note (optionnel)</label>
      <input id="tr-note" type="text" placeholder="Motif du transfert…"
        class="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none text-sm">
    </div>

    <div id="tr-error" class="hidden bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm"></div>

    <div class="flex gap-3">
      <button onclick="closeModal()" class="flex-1 py-3 bg-dark-700 text-gray-300 rounded-xl hover:bg-dark-600 transition text-sm">Annuler</button>
      <button onclick="_doTransfer()" id="tr-submit-btn" class="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition text-sm">
        <i class="fas fa-paper-plane mr-2"></i>Envoyer
      </button>
    </div>
  </div>`);
}

async function _transferLookup(){
  const uid=document.getElementById('tr-recipient-id')?.value?.trim().toUpperCase();
  const infoEl=document.getElementById('tr-recipient-info');
  if(!uid||uid.length<4){if(infoEl)infoEl.innerHTML='<p class="text-red-400 text-xs">Identifiant requis (min 4 caractères)</p>';return;}
  if(infoEl)infoEl.innerHTML='<div class="flex items-center gap-2 text-xs text-gray-400"><div class="loader-sm"></div>Recherche…</div>';
  try{
    const r=await api("POST","/payment/transfer/lookup",{unique_id:uid});
    if(infoEl)infoEl.innerHTML=`<div class="flex items-center gap-2 mt-1 bg-green-900/20 border border-green-500/30 rounded-lg px-3 py-2"><i class="fas fa-check-circle text-green-400 text-sm"></i><span class="text-green-300 text-sm font-medium">${r.recipient.name} <span class="text-gray-400 font-normal">(${r.recipient.unique_id})</span></span></div>`;
  }catch(e){
    if(infoEl)infoEl.innerHTML=`<p class="text-red-400 text-xs mt-1"><i class="fas fa-times-circle mr-1"></i>${e.error||'Membre introuvable'}</p>`;
  }
}

async function _doTransfer(){
  const uid=document.getElementById('tr-recipient-id')?.value?.trim().toUpperCase();
  const amount=parseFloat(document.getElementById('tr-amount')?.value||'0');
  const pin=document.getElementById('tr-pin')?.value||'';
  const note=document.getElementById('tr-note')?.value?.trim()||'';
  const errEl=document.getElementById('tr-error');
  const btn=document.getElementById('tr-submit-btn');
  const hideErr=()=>errEl?.classList.add('hidden');
  const showErr=(msg)=>{if(errEl){errEl.textContent=msg;errEl.classList.remove('hidden');}};
  hideErr();
  if(!uid)return showErr('Identifiant du destinataire requis');
  if(!amount||amount<=0)return showErr('Montant invalide');
  if(!pin||pin.length<4)return showErr('PIN requis (4-6 chiffres)');
  if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Envoi…';}
  try{
    const r=await api("POST","/payment/transfer/send",{recipient_unique_id:uid,amount,pin,note:note||undefined});
    closeModal();
    showToast(`$${Number(r.amount_sent||amount).toLocaleString('en-US',{minimumFractionDigits:2})} envoyés avec succès !`,'success');
    // Rafraîchir la page wallet
    setTimeout(()=>{const el=document.getElementById('page-content');if(el)renderWallet(el);},800);
  }catch(e){
    if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane mr-2"></i>Envoyer';}
    showErr(e.error||e.message||'Erreur lors du transfert');
  }
}

// _walletPayOrder — Payer une commande package via le wallet LEADER
async function _walletPayOrder(){
  const btn=document.getElementById('wallet-pay-btn');
  const orderId=_wizardData.orderId;
  if(!orderId)return showToast('Identifiant de commande manquant','error');
  if(btn){btn.disabled=true;btn.innerHTML='<div class="loader-sm mx-auto"></div>';}
  try{
    const r=await api("POST","/payment/wallet/pay-order",{order_id:orderId});
    // Mettre à jour le solde affiché dans le header
    if(r.new_balance!==undefined){
      window._memberWalletBalance=r.new_balance;
      const hb=document.getElementById('header-balance');
      if(hb){hb.innerHTML='<span class="text-gray-400">Solde : </span><span class="text-rouge-400 font-bold">$'+Number(r.new_balance).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'</span>';}
    }
    _wizardData.confirmationMsg=r.message||'Paiement effectué et commande activée !';
    wizardStep7();
  }catch(e){
    if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-wallet text-sm"></i> Confirmer le paiement';}
    showToast(e.error||e.message||'Erreur lors du paiement','error');
  }
}

let _wizardData={};let cp_enabled=!1,_cpCoins="USDT.TRC20,USDT.ERC20,BTC,ETH";
// _wizardReset : reset UNIQUEMENT les données wizard, sans toucher à window
// (évite tout setter/Proxy sur window qui causerait un RangeError récursif)
function _wizardReset(){
  // Vider les propriétés de l'objet existant plutôt que recréer (évite les setters window)
  var keys=Object.keys(_wizardData);
  for(var i=0;i<keys.length;i++){delete _wizardData[keys[i]];}
}
// Exposer sur window pour accès inter-fichiers (campus-app.js, etc.)
window._wizardReset=function(){_wizardReset();};
window._wizardOpenForCourse=function(courseId,title,priceUsd){
  // Anti-réentrance strict : un seul appel à la fois, lock de 3 secondes
  var _now=Date.now();
  if(window._wizardOpenLock&&(_now-window._wizardOpenLock)<3000){console.log('[Wizard] déjà en cours, ignoré');return;}
  window._wizardOpenLock=_now;
  // Reset du lock après 3s quoi qu'il arrive
  setTimeout(function(){window._wizardOpenLock=0;},3000);
  _wizardReset();
  _wizardData.isCoursePayment=true;
  _wizardData.courseId=courseId;
  _wizardData.pkgName=title;
  _wizardData.price=Number(priceUsd)||0;
  _wizardData.totalAmt=Number(priceUsd)||0;
  _wizardData.addLicense=false;
  _wizardData.bv=0;
  _wizardData.diffPrice=Number(priceUsd)||0;
  _wizardData.diffBV=0;
  // S'assurer que wizard-overlay existe dans le DOM
  if(!document.getElementById('wizard-overlay')){
    var ov=document.createElement('div');
    ov.id='wizard-overlay';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:9999;display:none;align-items:center;justify-content:center;padding:1rem;';
    ov.innerHTML='<div id="wizard-box" class="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-lg shadow-2xl" style="max-height:92vh;overflow-y:auto;"></div>';
    document.body.appendChild(ov);
  }
  var overlay=document.getElementById('wizard-overlay');
  // Afficher le spinner immédiatement (synchrone)
  var box=document.getElementById('wizard-box');
  if(box)box.innerHTML='<div style="padding:2.5rem;display:flex;flex-direction:column;align-items:center;gap:1rem;"><div class="loader"></div><p style="color:#9ca3af;font-size:.875rem;">Chargement du paiement…</p></div>';
  if(overlay)overlay.style.display='flex';
  // Briser la chaîne synchrone avec setTimeout pour éviter le RangeError stack overflow
  setTimeout(function(){
    if(window._wizardStep4Running){console.log('[Wizard] wizardStep4 déjà en cours (setTimeout)');return;}
    wizardStep4().catch(function(err){
      console.error('[Wizard] wizardStep4 erreur async:', err);
      window._wizardStep4Running=false;
      window._wizardOpenLock=0;
      window._campusBuyLock=0;
    });
  },0);
};let _gw={},_adminFeeInfo={amount:0,active:!1,paid:!0},_ppClientId=null,_ppSdkLoaded=!1,_ppSdkLoading=!1;async function _loadPayPalSdk(){if(!_ppClientId)try{const e=await api("GET","/members/paypal/config");if(!e.enabled)return!1;_ppClientId=e.client_id}catch(e){return!1}if(!_ppClientId)return!1;if(_ppSdkLoaded)return!0;if(_ppSdkLoading){for(let e=0;e<80;e++)if(await new Promise(e=>setTimeout(e,100)),_ppSdkLoaded)return!0;return!1}return _ppSdkLoading=!0,new Promise(e=>{const t=document.createElement("script");t.src=`https://www.paypal.com/sdk/js?client-id=${_ppClientId}&currency=USD&components=buttons&enable-funding=card,paylater&disable-funding=venmo`,t.onload=()=>{_ppSdkLoaded=!0,_ppSdkLoading=!1,e(!0)},t.onerror=()=>{_ppSdkLoading=!1,e(!1)},document.head.appendChild(t)})}async function _renderPayPalButtons(e,t,n,a){await _loadPayPalSdk()&&"undefined"!=typeof paypal?paypal.Buttons({style:{layout:"vertical",color:"gold",shape:"rect",label:"pay",height:45},createOrder:t,onApprove:async t=>{document.getElementById(e).innerHTML='<div class="flex flex-col items-center gap-3 py-4"><div class="loader"></div><p class="text-gray-400 text-sm">Confirmation du paiement…</p></div>';try{const e=await api("POST","/members/paypal/capture-order",{paypal_order_id:t.orderID});n(e)}catch(e){a(e?.error||e?.message||"Erreur lors de la capture du paiement")}},onError:e=>{a("Une erreur PayPal est survenue. Réessayez ou choisissez une autre méthode.")},onCancel:()=>{document.getElementById(e).innerHTML='<div class="text-yellow-400 text-sm text-center py-2"><i class="fas fa-times-circle mr-1"></i>Paiement annulé. Cliquez sur « Retour » pour recommencer.</div>'}}).render(`#${e}`):document.getElementById(e).innerHTML='<div class="text-red-400 text-sm text-center py-2"><i class="fas fa-exclamation-triangle mr-1"></i>SDK PayPal indisponible. Rechargez ou utilisez une autre méthode.</div>'}function _buildGw(e){return{paypal_email:e.paypal?.email||"",paypal_instructions:e.paypal?.instructions||"",paypal_active:"true"===e.paypal?.active,bank_name:e.bank?.name||"",bank_beneficiary:e.bank?.beneficiary||"",bank_iban:e.bank?.iban||"",bank_swift:e.bank?.swift||"",bank_instructions:e.bank?.instructions||"",bank_active:"true"===e.bank?.active,crypto_address:e.crypto?.address||"",crypto_network:e.crypto?.network||"",crypto_instructions:e.crypto?.instructions||"",crypto_active:"true"===e.crypto?.active,wallet_active:"true"===e.wallet?.active,wallet_balance:0,instructions:e.manual?.instructions||"",contact_email:e.manual?.contact_email||"",contact_phone:e.manual?.contact_phone||"",manual_active:"true"===e.manual?.active}}const CAT_THEME={"cat-synex":{gradient:"from-blue-950 via-dark-900 to-dark-900",border:"border-blue-500/30",cardBorder:"border-blue-500/25",accent:"text-blue-400",accentBg:"bg-blue-500/10",priceColor:"text-blue-300",btnClass:"bg-blue-600 hover:bg-blue-500",badgeBg:"bg-blue-500/15 border-blue-500/30 text-blue-300",checkColor:"text-blue-400",headerBg:"from-blue-900/50 to-dark-900",gridCols:"xl:grid-cols-4",catCardBg:"from-blue-950/80 to-dark-900",catCardHover:"hover:border-blue-400/60 hover:shadow-blue-900/40"},"cat-ezra":{gradient:"from-emerald-950 via-dark-900 to-dark-900",border:"border-emerald-500/30",cardBorder:"border-emerald-500/25",accent:"text-emerald-400",accentBg:"bg-emerald-500/10",priceColor:"text-emerald-300",btnClass:"bg-emerald-600 hover:bg-emerald-500",badgeBg:"bg-emerald-500/15 border-emerald-500/30 text-emerald-300",checkColor:"text-emerald-400",headerBg:"from-emerald-900/50 to-dark-900",gridCols:"xl:grid-cols-3",catCardBg:"from-emerald-950/80 to-dark-900",catCardHover:"hover:border-emerald-400/60 hover:shadow-emerald-900/40"},"cat-luxia":{gradient:"from-amber-950 via-dark-900 to-dark-900",border:"border-amber-500/30",cardBorder:"border-amber-500/25",accent:"text-amber-400",accentBg:"bg-amber-500/10",priceColor:"text-amber-300",btnClass:"bg-amber-600 hover:bg-amber-500",badgeBg:"bg-amber-500/15 border-amber-500/30 text-amber-300",checkColor:"text-amber-400",headerBg:"from-amber-900/50 to-dark-900",gridCols:"xl:grid-cols-2",catCardBg:"from-amber-950/80 to-dark-900",catCardHover:"hover:border-amber-400/60 hover:shadow-amber-900/40"},"cat-club":{gradient:"from-indigo-950 via-dark-900 to-dark-900",border:"border-indigo-500/30",cardBorder:"border-indigo-500/25",accent:"text-indigo-400",accentBg:"bg-indigo-500/10",priceColor:"text-indigo-300",btnClass:"bg-indigo-600 hover:bg-indigo-500",badgeBg:"bg-indigo-500/15 border-indigo-500/30 text-indigo-300",checkColor:"text-indigo-400",headerBg:"from-indigo-900/50 to-dark-900",gridCols:"xl:grid-cols-2",catCardBg:"from-indigo-950/80 to-dark-900",catCardHover:"hover:border-indigo-400/60 hover:shadow-indigo-900/40"},"cat-synex-triomarkets":{gradient:"from-orange-950 via-dark-900 to-dark-900",border:"border-orange-500/30",cardBorder:"border-orange-500/25",accent:"text-orange-400",accentBg:"bg-orange-500/10",priceColor:"text-orange-300",btnClass:"bg-orange-600 hover:bg-orange-500",badgeBg:"bg-orange-500/15 border-orange-500/30 text-orange-300",checkColor:"text-orange-400",headerBg:"from-orange-900/50 to-dark-900",gridCols:"xl:grid-cols-4",catCardBg:"from-orange-950/80 to-dark-900",catCardHover:"hover:border-orange-400/60 hover:shadow-orange-900/40"},_none:{gradient:"from-dark-800 to-dark-900",border:"border-dark-600",cardBorder:"border-dark-600",accent:"text-rouge-400",accentBg:"bg-rouge-500/10",priceColor:"text-rouge-400",btnClass:"bg-rouge-600 hover:bg-rouge-500",badgeBg:"bg-rouge-500/15 border-rouge-500/25 text-rouge-400",checkColor:"text-rouge-400",headerBg:"from-dark-700 to-dark-900",gridCols:"xl:grid-cols-3",catCardBg:"from-dark-800 to-dark-900",catCardHover:"hover:border-rouge-500/30"}},CAT_META_FALLBACK={_none:{icon:"[+]",desc:"Autres packages disponibles.",tag:""}};function getCatMeta(e,t){const n=t[e]||{},a=CAT_META_FALLBACK[e]||CAT_META_FALLBACK._none;return{icon:n.icon||a.icon,desc:n.desc||a.desc,tag:n.tag||a.tag}}function renderPkgCard(e,t,n){let a=[];try{a=JSON.parse(e.features||"[]")}catch{}const s="monthly"===e.pricing_type||"subscription"===e.payment_mode,r=`${"EUR"===e.currency?"€":"$"}${Number(e.price_usd).toLocaleString("fr-FR")}`,i=s?'<span class="text-base font-normal text-gray-400">/mois</span>':"",l=e.dreamiles_per_payment||0,d=[];let o=null;for(const e of a){const t=e.match(/^([A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ ''&]+)\s*—\s*(.+)/u);if(t){const e=t[1].trim();o&&o.label===e||(o={label:e,items:[]},d.push(o)),o.items.push(t[2].trim())}else o||(o={label:"",items:[]},d.push(o)),o.items.push(e)}const c={"S'ÉDUQUER":"fa-book-open","CRÉER":"fa-hammer","PROTÉGER":"fa-shield-halved",MULTIPLIER:"fa-arrow-trend-up",PROFITER:"fa-star","IDÉAL POUR":"fa-bullseye"},x=d.map(e=>`\n
    ${e.label?`\n
    <div class="mt-5 mb-2">\n
      <div class="flex items-center gap-2">\n
        <i class="fas ${c[e.label]||"fa-circle-dot"} ${t.accent} text-xs"></i>\n
        <span class="text-xs font-bold uppercase tracking-widest ${t.accent}">${e.label}</span>\n
        <div class="flex-1 h-px bg-white/5"></div>\n
      </div>\n
    </div>`:""}\n
    ${e.items.map(e=>`\n
    <div class="flex items-start gap-2 py-1">\n
      <i class="fas fa-check ${t.checkColor} text-xs mt-0.5 shrink-0"></i>\n
      <span class="text-sm text-gray-300 leading-snug">${e}</span>\n
    </div>`).join("")}\n
  `).join("");return`\n
  <div class="rounded-2xl border ${t.cardBorder} bg-gradient-to-b ${t.gradient} flex flex-col overflow-hidden hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300">\n
    \x3c!-- En-tête prix --\x3e\n
    <div class="bg-gradient-to-b ${t.headerBg} px-6 pt-6 pb-5 border-b ${t.cardBorder}">\n
      <div class="flex items-start justify-between gap-2 mb-2">\n
        <h3 class="text-xl font-extrabold text-white tracking-tight leading-tight">${e.name}</h3>\n
        <span class="shrink-0 text-xs px-2.5 py-1 rounded-full border ${t.badgeBg} font-semibold whitespace-nowrap">\n
          ${s?"Abonnement":"Unique"}\n
        </span>\n
      </div>\n
      ${e.description?`<p class="text-xs text-gray-400 leading-relaxed mb-4 italic">${e.description}</p>`:""}\n
      <div class="flex items-baseline gap-1 mb-4">\n
        <span class="text-4xl font-black ${t.priceColor}">${r}</span>\n
        ${i}\n
      </div>\n
      <div class="flex flex-wrap gap-2">\n
        <span class="text-xs px-2.5 py-1 rounded-full ${t.accentBg} ${t.accent} border ${t.cardBorder} font-medium">\n
          <i class="fas fa-chart-bar mr-1 text-xs"></i>${e.bv_value} BV\n
        </span>\n
        \x3c!-- Point 6 : direct_commission_rate masqué côté membre (confidentiel admin) --\x3e\n
        ${l>0?`\n
        <span class="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">\n
          <i class="fas fa-star mr-1 text-xs"></i>${l} Dreamiles/mois\n
        </span>`:""}\n
      </div>\n
    </div>\n
    \x3c!-- Features --\x3e\n
    <div class="px-6 py-4 flex-1">\n
      ${x}\n
    </div>\n
    \x3c!-- CTA --\x3e\n
    <div class="px-6 pb-6 pt-3">\n
      ${(()=>{const sameOwned=n.find(o=>o.package_id===e.id&&(o.status==='active'||o.status==='validated'));const superiorInCat=e.category_id&&n.find(o=>(o.status==='active'||o.status==='validated')&&o.category===e.category_id&&o.package_id!==e.id&&Number(o.bv_value)>=e.bv_value);const activeOrder=e.category_id&&n.find(o=>(o.status==='active'||o.status==='validated')&&o.category===e.category_id&&o.package_id!==e.id&&Number(o.bv_value)<e.bv_value);if(e.payment_mode==='broker'){
  var _brRegs=window._brokerRegs||[];
  var _brReg=_brRegs.find(function(r){return r.package_id===e.id;});
  if(_brReg&&_brReg.status==='activated'){
    return '<div class="w-full text-center py-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-semibold flex items-center justify-center gap-2"><i class="fas fa-check-circle"></i>Package actif — BV déployés</div>';
  }
  if(_brReg&&(_brReg.status==='deposited'||_brReg.status==='registered')){
    var _brLabel=_brReg.status==='registered'?'Inscrit, en attente du dépôt':'Dépôt reçu — activation en cours';
    return '<div class="w-full text-center py-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm font-semibold flex items-center justify-center gap-2"><i class="fas fa-clock"></i>'+_brLabel+'</div>';
  }
  return '<button onclick="brokerRedirect(\''+e.id+'\',\''+encodeURIComponent(e.name)+'\',event)" class="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold py-3.5 rounded-xl transition-all duration-200 text-sm shadow-lg flex items-center justify-center gap-2"><i class="fas fa-external-link-alt"></i>S&#39;inscrire chez Triomarkets</button>';
}if(sameOwned){return '<div class="w-full text-center py-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-semibold flex items-center justify-center gap-2"><i class="fas fa-check-circle"></i>Package actif</div>';}if(superiorInCat){return '<div class="w-full text-center py-3.5 rounded-xl bg-gray-700/50 border border-gray-600/40 text-gray-500 text-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed select-none"><i class="fas fa-lock mr-1"></i>Niveau d\'abord atteint — Upgrade requis</div>';}if(activeOrder){return `<button onclick="wizardStart('${e.id}','${encodeURIComponent(e.name)}',${e.price_usd},${e.bv_value},true,${activeOrder.price_usd||0},${activeOrder.bv_value||0})" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 text-sm shadow-lg flex items-center justify-center gap-2"><i class="fas fa-arrow-up"></i>Upgrader depuis ${activeOrder.package_name||'mon package'}</button>`;}return `<button onclick="wizardStart('${e.id}','${encodeURIComponent(e.name)}',${e.price_usd},${e.bv_value},false,0,0)" class="w-full ${t.btnClass} text-white font-bold py-3.5 rounded-xl transition-all duration-200 text-sm shadow-lg flex items-center justify-center gap-2"><i class="fas fa-shopping-cart"></i>${s?"S'abonner maintenant":"Acquérir ce package"}</button>`;})()}\n
    </div>\n
  </div>`}async function renderPackages(e){e.innerHTML='<div class="flex items-center justify-center py-16"><div class="loader"></div></div>';try{const [t,_bsRes]=await Promise.all([api("GET","/members/packages"),api("GET","/broker/status").catch(()=>({registrations:[]}))]);window._brokerRegs=_bsRes.registrations||[];_gw=_buildGw(t.gateways||{}),_adminFeeInfo=t.adminFee||{amount:0,active:!1,paid:!0};_licPriceForWizard=t.licensePrice||97;const n={},a={};for(const e of t.packages||[]){const t=e.category_id||"_none";n[t]||(n[t]=[],a[t]={name:e.category_name||"Packages",icon:e.category_icon||"[+]",desc:e.category_description||"",tag:e.category_tag||""}),n[t].push(e)}window._pkgData={pkgByCategory:n,categoryMeta:a,myOrders:t.myOrders||[]};const s=["cat-synex","cat-ezra","cat-luxia","cat-club","cat-synex-triomarkets"].filter(e=>n[e]),r=Object.keys(n).filter(e=>!s.includes(e)),i=[...s,...r].map(e=>{const t=n[e],s=a[e],r=CAT_THEME[e]||CAT_THEME._none,i=getCatMeta(e,a),l=Math.min(...t.map(e=>e.price_usd)),d=Math.max(...t.map(e=>e.price_usd)),o=t.some(e=>"monthly"===e.pricing_type||"subscription"===e.payment_mode),c="EUR"===t[0]?.currency?"€":"$";return l===d?Number(l).toLocaleString("fr-FR"):(Number(l).toLocaleString("fr-FR"),Number(d).toLocaleString("fr-FR")),`\n
      <div onclick="showPackageCategory('${e}')"\n
        class="group cursor-pointer rounded-2xl border ${r.border} ${r.catCardHover}\n
               bg-gradient-to-br ${r.catCardBg} p-7\n
               hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">\n
\n
        \x3c!-- Icône + nom --\x3e\n
        <div class="flex items-center gap-4 mb-4">\n
          <div class="w-14 h-14 rounded-2xl ${r.accentBg} border ${r.border}\n
                      flex items-center justify-center text-2xl shrink-0\n
                      group-hover:scale-110 transition-transform duration-300">\n
            ${i.icon}\n
          </div>\n
          <div class="min-w-0">\n
            <h3 class="font-extrabold text-white text-base leading-tight truncate">${s.name}</h3>\n
            <span class="text-xs px-2 py-0.5 rounded-full border ${r.badgeBg} mt-1 inline-block">${i.tag}</span>\n
          </div>\n
        </div>\n
\n
        \x3c!-- Description --\x3e\n
        <p class="text-sm text-gray-400 leading-relaxed mb-5">${i.desc}</p>\n
\n
        \x3c!-- Prix range + nb packages --\x3e\n
        <div class="flex items-end justify-between">\n
          <div>\n
            <div class="text-xs text-gray-500 mb-0.5 uppercase tracking-wide">À partir de</div>\n
            <div class="font-black text-xl ${r.priceColor} leading-none">\n
              ${c}${Number(l).toLocaleString("fr-FR")}<span class="text-sm font-normal text-gray-400">${o?"/mois":""}</span>\n
            </div>\n
          </div>\n
          <div class="flex items-center gap-2">\n
            <span class="text-xs text-gray-500">${t.length} offre${t.length>1?"s":""}</span>\n
            <div class="w-8 h-8 rounded-full ${r.accentBg} border ${r.border}\n
                        flex items-center justify-center\n
                        group-hover:translate-x-1 transition-transform duration-200">\n
              <i class="fas fa-arrow-right ${r.accent} text-xs"></i>\n
            </div>\n
          </div>\n
        </div>\n
      </div>`}).join("");e.innerHTML=`\n
    <div id="pkg-view-categories">\n
      <div class="mb-8">\n
        <h2 class="text-2xl font-black text-white">Nos Packages</h2>\n
        <p class="text-gray-400 text-sm mt-1">Sélectionnez une catégorie pour découvrir les offres.</p>\n
      </div>\n
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">\n
        ${i}\n
      </div>\n
      ${(t.myOrders||[]).length>0?'<div class="mt-10">'+renderMyOrders(t.myOrders)+"</div>":""}\n
    </div>\n
    <div id="pkg-view-detail" class="hidden"></div>`}catch(t){e.innerHTML=`<div class="p-4 text-red-400">Erreur : ${t.error||t.message}</div>`}}function showPackageCategory(e){const{pkgByCategory:t,categoryMeta:n}=window._pkgData||{};if(!t||!t[e])return;const a=t[e],s=n[e],r=CAT_THEME[e]||CAT_THEME._none,i=getCatMeta(e,n),l=r.gridCols||"xl:grid-cols-3";window.scrollTo({top:0,behavior:"smooth"}),document.getElementById("pkg-view-categories").classList.add("hidden");const d=document.getElementById("pkg-view-detail");d.classList.remove("hidden"),d.innerHTML=`\n
  \x3c!-- Breadcrumb / Retour --\x3e\n
  <div class="mb-6 flex items-center gap-3">\n
    <button onclick="backToCategories()"\n
      class="group flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">\n
      <i class="fas fa-arrow-left group-hover:-translate-x-1 transition-transform duration-200"></i>\n
      Retour aux catégories\n
    </button>\n
    <span class="text-gray-600">/</span>\n
    <span class="text-sm ${r.accent} font-semibold">${s.name}</span>\n
  </div>\n
\n
  \x3c!-- Header catégorie --\x3e\n
  <div class="rounded-2xl border ${r.border} bg-gradient-to-r ${r.headerBg} px-7 py-6 mb-8 flex items-center gap-5">\n
    <div class="w-16 h-16 rounded-2xl ${r.accentBg} border ${r.border} flex items-center justify-center text-3xl shrink-0">\n
      ${i.icon}\n
    </div>\n
    <div>\n
      <h2 class="text-2xl font-black text-white">${s.name}</h2>\n
      ${i.desc?`<p class="text-sm text-gray-400 mt-0.5">${i.desc}</p>`:""}\n
      ${i.tag?`<span class="text-xs px-2.5 py-1 rounded-full border ${r.badgeBg} mt-2 inline-block font-semibold">${i.tag}</span>`:""}\n
    </div>\n
  </div>\n
\n
  \x3c!-- Grille packages --\x3e\n
  <div class="grid grid-cols-1 md:grid-cols-2 ${l} gap-6 items-start">\n
    ${a.map(e=>renderPkgCard(e,r,(window._pkgData||{}).myOrders||[])).join("")}\n
  </div>\n
\n
  \x3c!-- Retour bas --\x3e\n
  <div class="mt-10 text-center">\n
    <button onclick="backToCategories()"\n
      class="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-dark-600 hover:border-dark-400 px-5 py-2.5 rounded-xl transition-all">\n
      <i class="fas fa-th-large"></i>\n
      Voir toutes les catégories\n
    </button>\n
  </div>`}function backToCategories(){document.getElementById("pkg-view-categories").classList.remove("hidden"),document.getElementById("pkg-view-detail").classList.add("hidden"),window.scrollTo({top:0,behavior:"smooth"})}
async function brokerRedirect(pkgId,pkgNameEnc,evt){
  var btn=evt&&evt.target?evt.target.closest('button'):null;
  if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Redirection en cours…';}
  try{
    var r=await api('POST','/broker/redirect',{package_id:pkgId});
    if(r&&r.url){
      // Créer un lien <a> invisible et le cliquer : seule méthode fiable cross-browser
      var a=document.createElement('a');
      a.href=r.url;
      a.target='_blank';
      a.rel='noopener noreferrer';
      a.style.display='none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){document.body.removeChild(a);},1000);
      showToast('Redirection vers Triomarkets — votre inscription est suivie','success');
      if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-check mr-2"></i>Redirection ouverte';}
    }else{
      showToast('Erreur : URL de redirection manquante','error');
      if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-external-link-alt mr-2"></i>S&#39;inscrire chez Triomarkets';}
    }
  }catch(err){
    showToast((err&&err.error)||'Erreur lors de la redirection broker','error');
    if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-external-link-alt mr-2"></i>S&#39;inscrire chez Triomarkets';}
  }
}function renderMyOrders(e){if(!e||0===e.length)return"";const t={pending:"En attente de paiement",proof_submitted:"Preuve soumise — en vérification",validated:"Validé ✓",rejected:"Rejeté",active:"Actif"},n={pending:"text-yellow-400 bg-yellow-500/10 border-yellow-500/30",proof_submitted:"text-blue-400 bg-blue-500/10 border-blue-500/30",validated:"text-green-400 bg-green-500/10 border-green-500/30",rejected:"text-red-400 bg-red-500/10 border-red-500/30",active:"text-green-400 bg-green-500/10 border-green-500/30"};return`\n
  <div class="bg-dark-800 rounded-2xl border border-dark-600 overflow-hidden">\n
    <div class="px-6 py-4 border-b border-dark-600 flex items-center justify-between">\n
      <h3 class="font-semibold flex items-center gap-2"><i class="fas fa-list text-rouge-400"></i>Mes commandes</h3>\n
      <span class="text-xs text-gray-500">${e.length} commande(s)</span>\n
    </div>\n
    <div class="divide-y divide-dark-600">\n
      ${e.map(e=>`\n
      <div class="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">\n
        <div class="flex-1">\n
          <div class="font-medium text-sm">${e.pkg_name}</div>\n
          <div class="text-xs text-gray-500 mt-0.5">Réf. ${e.id.substring(0,12)}… · ${fmtDate(e.created_at)}</div>\n
        </div>\n
        <div class="flex items-center gap-3 flex-wrap">\n
          <span class="font-bold text-rouge-400">$${Number(e.amount_usd).toLocaleString("en-US")}</span>\n
          <span class="text-xs px-3 py-1 rounded-full border ${n[e.status]||"text-gray-400 bg-gray-500/10 border-gray-500/30"}">${t[e.status]||e.status}</span>\n
          ${"pending"===e.status?`<button onclick="wizardProofOnly('${e.id}')" class="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg hover:bg-blue-600/30 transition"><i class="fas fa-upload mr-1"></i>Soumettre preuve</button>`:""}\n
          ${"rejected"===e.status?'<span class="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1"><i class="fas fa-info-circle"></i>Commandez à nouveau</span>':""}\n
        </div>\n
      </div>`).join("")}\n
    </div>\n
  </div>`}function _wizardShow(e){const t=document.getElementById("wizard-overlay"),n=document.getElementById("wizard-box");if(!t||!n)return;/* Détacher du DOM avant mutation pour éviter le MutationObserver Tailwind Play CDN (Safari RangeError) */const _p=n.parentNode,_next=n.nextSibling;if(_p)_p.removeChild(n);n.innerHTML=e;if(_p)_p.insertBefore(n,_next);t.style.display="flex";}function wizardClose(){const e=document.getElementById("wizard-overlay");e&&(e.style.display="none"),_wizardReset();window._wizardStep4Running=false;window._wizardOpenLock=0;window._campusBuyLock=0;}function _wizardProgress(e,t){const n=Math.round(e/t*100);return`\n
  <div class="px-6 pt-5 pb-3 border-b border-dark-600">\n
    <div class="flex items-center justify-between mb-2">\n
      <span class="text-xs font-semibold text-rouge-400 uppercase tracking-wider">Étape ${e}/${t} — ${["Package","Licence","Récap.","Paiement","Preuve","Confirmation","Terminé"][e-1]||""}</span>\n
      <button onclick="wizardClose()" class="text-gray-400 hover:text-white w-7 h-7 flex items-center justify-center rounded-lg hover:bg-dark-700 text-lg">×</button>\n
    </div>\n
    <div class="w-full bg-dark-700 rounded-full h-1.5">\n
      <div class="bg-rouge-500 h-1.5 rounded-full transition-all" style="width:${n}%"></div>\n
    </div>\n
  </div>`}function wizardStart(e,t,n,a,s,r,i){_wizardReset(),_wizardData.pkgId=e,_wizardData.pkgName=decodeURIComponent(t),_wizardData.price=Number(n),_wizardData.bv=Number(a),_wizardData.isUpgrade=!!s,_wizardData.currentPrice=Number(r||0),_wizardData.currentBV=Number(i||0),_wizardData.diffPrice=_wizardData.isUpgrade?Math.max(0,_wizardData.price-_wizardData.currentPrice):_wizardData.price,_wizardData.diffBV=_wizardData.isUpgrade?Math.max(0,_wizardData.bv-_wizardData.currentBV):_wizardData.bv,_wizardData.addLicense=!1,_wizardData.licensePrice=typeof _licPriceForWizard!=="undefined"?_licPriceForWizard:97;const l=_adminFeeInfo.mode||"once",d=_adminFeeInfo.active&&("multiple"===l||!_adminFeeInfo.paid),o=d?Number(_adminFeeInfo.amount):0,c=_wizardData.isUpgrade?`\n
    <div class="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-sm space-y-1">\n
      <div class="flex justify-between text-gray-400">\n
        <span><i class="fas fa-minus-circle text-gray-500 mr-1"></i>Package actuel (déjà payé)</span>\n
        <span>$${_wizardData.currentPrice.toLocaleString("en-US")} · ${_wizardData.currentBV} BV</span>\n
      </div>\n
      <div class="flex justify-between text-green-300 font-semibold">\n
        <span><i class="fas fa-arrow-up text-green-400 mr-1"></i>Vous payez la différence</span>\n
        <span>$${_wizardData.diffPrice.toLocaleString("en-US")} · +${_wizardData.diffBV} BV</span>\n
      </div>\n
    </div>`:"";_wizardShow(`\n
  ${_wizardProgress(1,7)}\n
  <div class="p-6 space-y-5">\n
    <div>\n
      <h3 class="text-lg font-bold text-white">${_wizardData.isUpgrade?"Upgrade de package":"Package sélectionné"}</h3>\n
      <p class="text-sm text-gray-400 mt-1">${_wizardData.isUpgrade?"Vous ne payez que la différence avec votre package actuel.":"Vérifiez votre choix avant de continuer."}</p>\n
    </div>\n
    <div class="bg-dark-700 border border-dark-500 rounded-xl p-5 space-y-3">\n
      <div class="flex justify-between items-center">\n
        <span class="font-bold text-white text-lg">${_wizardData.pkgName}</span>\n
        <span class="text-rouge-400 font-bold text-xl">$${_wizardData.diffPrice.toLocaleString("en-US")}</span>\n
      </div>\n
      <div class="flex gap-4 text-sm text-gray-400">\n
        <span><i class="fas fa-chart-bar mr-1"></i>+${_wizardData.diffBV} BV crédités</span>\n
        ${_wizardData.isUpgrade?`<span class="text-xs text-gray-500">(prix total package : $${_wizardData.price.toLocaleString("en-US")})</span>`:""}\n
      </div>\n
      ${c}\n
      ${d?`\n
      <div class="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3 text-sm text-orange-300">\n
        <i class="fas fa-info-circle mr-2"></i>Frais d'administration : <strong>$${o.toFixed(2)}</strong>${"once"===l?" (1ère commande uniquement)":" (facturés à chaque achat)"}\n
      </div>`:'\n      <div class="bg-green-900/10 border border-green-500/20 rounded-lg p-3 text-sm text-green-400">\n        <i class="fas fa-check-circle mr-2"></i>Frais d\'administration : déjà réglés\n      </div>'}\n
    </div>\n
    <div class="flex gap-3">\n
      <button onclick="wizardClose()" class="flex-1 py-3 bg-dark-700 text-gray-300 rounded-xl hover:bg-dark-600 transition text-sm">Annuler</button>\n
      <button onclick="wizardStep2()" class="flex-1 py-3 bg-rouge-500 text-dark-900 font-bold rounded-xl hover:bg-rouge-500 transition text-sm">\n
        Continuer <i class="fas fa-arrow-right ml-2"></i>\n
      </button>\n
    </div>\n
  </div>`)}function wizardStep2(){if(currentMember&&currentMember.license_active||_wizardData.isUpgrade)return _wizardData.addLicense=!1,void wizardStep3();_wizardShow(`\n
  ${_wizardProgress(2,7)}\n
  <div class="p-6 space-y-5">\n
    <div>\n
      <h3 class="text-lg font-bold text-white">Ajouter la Licence Finstrategia ?</h3>\n
      <p class="text-sm text-gray-400 mt-1">La licence annuelle est nécessaire pour être éligible aux commissions LEADER.</p>\n
    </div>\n
    <div class="space-y-3">\n
      <button onclick="wizardSetLicense(true)" id="btn-yes-lic"\n
        class="w-full border-2 border-dark-500 rounded-xl p-4 text-left hover:border-rouge-500 transition group">\n
        <div class="flex items-start gap-4">\n
          <div class="w-10 h-10 rounded-xl bg-rouge-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-rouge-500/20 transition">\n
            <i class="fas fa-key text-rouge-400"></i>\n
          </div>\n
          <div class="flex-1">\n
            <div class="font-bold text-white flex justify-between">\n
              <span>Oui — Ajouter la licence</span>\n
              <span class="text-rouge-400">+$${fmtPrice(typeof _licPriceForWizard!=="undefined"?_licPriceForWizard:97)}</span>\n
            </div>\n
            <div class="text-sm text-gray-400 mt-1">Accès complet Finstrategia + éligibilité aux commissions pendant 12 mois.</div>\n
            <div class="flex gap-3 mt-2 text-xs text-green-400">\n
              <span><i class="fas fa-check mr-1"></i>Commissions actives</span>\n
              <span><i class="fas fa-check mr-1"></i>Primes de rang</span>\n
              <span><i class="fas fa-check mr-1"></i>Bonus MLM</span>\n
            </div>\n
          </div>\n
        </div>\n
      </button>\n
      <button onclick="wizardSetLicense(false)" id="btn-no-lic"\n
        class="w-full border-2 border-dark-500 rounded-xl p-4 text-left hover:border-gray-400 transition">\n
        <div class="flex items-start gap-4">\n
          <div class="w-10 h-10 rounded-xl bg-dark-600 flex items-center justify-center flex-shrink-0">\n
            <i class="fas fa-times text-gray-400"></i>\n
          </div>\n
          <div class="flex-1">\n
            <div class="font-bold text-white">Non — Package seul</div>\n
            <div class="text-sm text-gray-400 mt-1">Vous pourrez activer la licence plus tard depuis votre espace membre.</div>\n
          </div>\n
        </div>\n
      </button>\n
    </div>\n
    <button onclick="wizardStart('${_wizardData.pkgId}','${encodeURIComponent(_wizardData.pkgName)}',${_wizardData.price},${_wizardData.bv},${_wizardData.isUpgrade},${_wizardData.currentPrice},${_wizardData.currentBV})"\n
      class="text-sm text-gray-500 hover:text-gray-300 transition"><i class="fas fa-arrow-left mr-1"></i>Retour</button>\n
  </div>`)}function wizardSetLicense(e){_wizardData.addLicense=e,wizardStep3()}function wizardStep3(){const e=_adminFeeInfo.mode||"once",t=_adminFeeInfo.active&&("multiple"===e||!_adminFeeInfo.paid),n=t?Number(_adminFeeInfo.amount):0,a=_wizardData.addLicense?(_wizardData.licensePrice||97):0,s=(_wizardData.isUpgrade?_wizardData.diffPrice:_wizardData.price)+a+n;_wizardData.totalAmt=s;const r=_wizardData.isUpgrade?`\n
      <div class="flex justify-between text-xs text-gray-500 pb-2 border-b border-dark-600">\n
        <span>Package actuel (déjà payé)</span>\n
        <span>$${_wizardData.currentPrice.toLocaleString("en-US")} · ${_wizardData.currentBV} BV</span>\n
      </div>\n
      <div class="flex justify-between">\n
        <span class="text-gray-400">Upgrade → ${_wizardData.pkgName} <span class="text-xs text-green-400">(différentiel)</span></span>\n
        <span class="text-white font-medium">$${_wizardData.diffPrice.toLocaleString("en-US")}</span>\n
      </div>`:`\n
      <div class="flex justify-between">\n
        <span class="text-gray-400">Package ${_wizardData.pkgName}</span>\n
        <span class="text-white font-medium">$${_wizardData.price.toLocaleString("en-US")}</span>\n
      </div>`;_wizardShow(`\n
  ${_wizardProgress(3,7)}\n
  <div class="p-6 space-y-5">\n
    <div>\n
      <h3 class="text-lg font-bold text-white">Récapitulatif de votre commande</h3>\n
      <p class="text-sm text-gray-400 mt-1">Vérifiez le détail avant de passer au paiement.</p>\n
    </div>\n
    <div class="bg-dark-700 border border-dark-500 rounded-xl p-5 space-y-3 text-sm">\n
      ${r}\n
      ${_wizardData.addLicense?`\n
      <div class="flex justify-between">\n
        <span class="text-gray-400">Licence Finstrategia (12 mois)</span>\n
        <span class="text-rouge-400 font-medium">+$${fmtPrice(_wizardData.licensePrice||97)}</span>\n
      </div>`:""}\n
      ${t?`\n
      <div class="flex justify-between">\n
        <span class="text-gray-400">Frais d'administration <span class="text-xs text-orange-400">${"once"===e?"(uniques)":"(par achat)"}</span></span>\n
        <span class="text-orange-300 font-medium">+$${n.toFixed(2)}</span>\n
      </div>`:""}\n
      <div class="border-t border-dark-500 pt-3 flex justify-between font-bold">\n
        <span class="text-white">Total à envoyer</span>\n
        <span class="text-rouge-400 text-xl">$${s.toLocaleString("en-US",{minimumFractionDigits:2})}</span>\n
      </div>\n
      <div class="flex justify-between text-xs text-gray-500">\n
        <span>BV crédités</span>\n
        <span class="text-blue-400 font-medium">+${_wizardData.diffBV} BV${_wizardData.isUpgrade?" (différentiel)":""}</span>\n
      </div>\n
    </div>\n
    <div class="flex gap-3">\n
      <button onclick="wizardStep2()" class="flex-1 py-3 bg-dark-700 text-gray-300 rounded-xl hover:bg-dark-600 transition text-sm"><i class="fas fa-arrow-left mr-2"></i>Retour</button>\n
      <button onclick="wizardStep4()" class="flex-1 py-3 bg-rouge-500 text-dark-900 font-bold rounded-xl hover:bg-rouge-500 transition text-sm">\n
        Choisir le paiement <i class="fas fa-arrow-right ml-2"></i>\n
      </button>\n
    </div>\n
  </div>`)}async function wizardStep4(){if(window._wizardStep4Running){console.log('[Wizard] wizardStep4 déjà en cours');return;}window._wizardStep4Running=true;setTimeout(function(){window._wizardStep4Running=false;},5000);const e=_wizardData.totalAmt;if(!_gw||!Object.keys(_gw).length){_wizardShow('<div class="p-10 flex flex-col items-center gap-4"><div class="loader"></div><p class="text-gray-400 text-sm">Chargement des moyens de paiement…</p></div>');try{const e=await api("GET","/members/packages");_gw=_buildGw(e.gateways||{}),_adminFeeInfo=e.adminFee||{amount:0,active:!1,paid:!0}}catch(e){return void _wizardShow(`<div class="p-8 text-center space-y-4">\n
        <i class="fas fa-exclamation-circle text-red-400 text-3xl"></i>\n
        <p class="text-red-400">Impossible de charger les modes de paiement.<br><span class="text-xs text-gray-500">${e.error||e.message||""}</span></p>\n
        <button onclick="wizardClose()" class="py-2 px-6 bg-dark-700 text-gray-300 rounded-xl text-sm">Fermer</button>\n
      </div>`)}}const t=_gw,n=!(!t.paypal_email||!t.paypal_active),a=!(!t.bank_iban&&!t.bank_name)&&t.bank_active,s=!(!t.crypto_address||!t.crypto_active),r=!(!t.instructions||!t.manual_active);let i=!1;try{const e=await api("GET","/members/stripe/config");i=!(!e||!e.enabled),i&&(window._stripePublicKey=e.public_key)}catch(e){i=!1}cp_enabled=!1;_cpCoins="USDT.TRC20,LTC,ETH,BTC";try{const e=await api("GET","/members/coinpayments/config");cp_enabled=!(!e||!e.enabled),cp_enabled&&(_cpCoins=e.coins||"USDT.TRC20,USDT.ERC20,BTC,ETH")}catch(e){cp_enabled=!1}let _v2Methods=[];try{const _v2r=await api("GET","/payment/methods");const _v2all=Object.values(_v2r.methods||{}).flat();_v2Methods=_v2all.filter(m=>m.is_automatic&&m.is_active&&!["stripe","paypal","coinpayments","wallet","internal_wallet","internal","leader_wallet"].includes(m.provider));}catch(_v2e){_v2Methods=[];}const _v2Btns=_v2Methods.map(m=>{const _ico=m.provider==="mollie"?"fas fa-credit-card":m.logo_emoji||"[CB]";const _col=m.provider==="mollie"?"indigo":"gray";return `\n
  <button onclick="wizardSelectPaymentV2('${m.id}','${m.provider}','${(m.display_name||m.provider).replace(/'/g,"")}')"\n    class="w-full border-2 border-${_col}-500/40 rounded-xl p-4 text-left hover:border-${_col}-400 transition flex items-center gap-4 bg-${_col}-900/10">\n    <div class="flex gap-1.5 w-8 justify-center">\n      <i class="${_ico} text-${_col}-400 text-xl"></i>\n    </div>\n    <div>\n      <div class="font-bold text-white">${m.display_name||m.provider}</div>\n      <div class="text-xs text-gray-400">${m.description||"Paiement sécurisé"}</div>\n    </div>\n    <span class="ml-auto text-[9px] bg-${_col}-500/20 text-${_col}-400 border border-${_col}-500/30 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">Automatique</span>\n  </button>`;}).join("");
// ── Méthodes V2 manuelles/semi-manuelles (mobile money, virements…) ──────────
let _v2ManualMethods=[];try{const _v2r2=await api("GET","/payment/methods");const _v2all2=Object.values(_v2r2.methods||{}).flat();_v2ManualMethods=_v2all2.filter(m=>!m.is_automatic&&m.is_active&&!["leader_wallet","internal_wallet","internal","wallet"].includes(m.provider));}catch(_v2e2){_v2ManualMethods=[];}const _v2ManualBtns=_v2ManualMethods.map(m=>{const _ico=m.logo_emoji||"[M]";return `\n  <button onclick="wizardSelectPaymentV2Manual('${m.id}','${m.provider}','${(m.display_name||m.provider).replace(/'/g,"")}')"\n
    class="w-full border-2 border-emerald-500/40 rounded-xl p-4 text-left hover:border-emerald-400 transition flex items-center gap-4 bg-emerald-900/10">\n
    <div class="flex gap-1.5 w-8 justify-center text-xl">${_ico}</div>\n
    <div>\n
      <div class="font-bold text-white">${m.display_name||m.provider}</div>\n
      <div class="text-xs text-gray-400">${m.instructions||m.description||'Envoi manuel · preuve requise'}</div>\n
    </div>\n
    <span class="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">Mobile Money</span>\n
  </button>`;}).join("");
let _preWbal=0;try{const _pwr=await api("GET","/members/wallet");_preWbal=Number(_pwr.wallet?.balance||_pwr.member?.wallet_balance)||0;window._memberWalletBalance=_preWbal;}catch(_pwe){_preWbal=0;}window._wStep4Data={e:e,t:t,n:n,a:a,s:s,r:r,i:i,_v2Btns:_v2Btns,_v2ManualBtns:_v2ManualBtns,_preWbal:_preWbal};setTimeout(function(){_wizardRenderStep4(window._wStep4Data);},0);}
function _wizardRenderStep4(_d){var e=_d.e,t=_d.t,n=_d.n,a=_d.a,s=_d.s,r=_d.r,i=_d.i,_v2Btns=_d._v2Btns,_v2ManualBtns=_d._v2ManualBtns,_preWbal=_d._preWbal;window._wStep4Data=_d;_buildPayButtons(_d);}
function _buildPayButtons(_d){var e=_d.e,t=_d.t,n=_d.n,a=_d.a,s=_d.s,r=_d.r,i=_d.i,_v2Btns=_d._v2Btns,_v2ManualBtns=_d._v2ManualBtns,_preWbal=_d._preWbal;const l=!(n||a||s||r||i||cp_enabled||_v2Methods.length>0||true),d=i?'\n  <button onclick="wizardSelectPayment(\'stripe\')"\n    class="w-full border-2 border-purple-500/40 rounded-xl p-4 text-left hover:border-purple-400 transition flex items-center gap-4 bg-purple-900/10">\n    <div class="flex gap-1.5 w-8 justify-center">\n      <i class="fas fa-credit-card text-purple-400 text-xl"></i>\n    </div>\n    <div>\n      <div class="font-bold text-white">Carte bancaire <span class="text-purple-400">/ Apple Pay / Google Pay</span></div>\n      <div class="text-xs text-gray-400">Paiement immédiat · Visa, Mastercard, Amex, Apple Pay, Google Pay</div>\n    </div>\n    <span class="ml-auto text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">Recommandé</span>\n  </button>':"",cp=cp_enabled?'\n  <button onclick="wizardSelectPayment(\'coinpayments\')"\n    class="w-full border-2 border-orange-500/40 rounded-xl p-4 text-left hover:border-orange-400 transition flex items-center gap-4 bg-orange-900/10">\n    <div class="flex gap-1.5 w-8 justify-center">\n      <i class="fas fa-coins text-orange-400 text-xl"></i>\n    </div>\n    <div>\n      <div class="font-bold text-white">Cryptomonnaie <span class="text-orange-400">via CoinPayments</span></div>\n      <div class="text-xs text-gray-400">Bitcoin, Ethereum, USDT TRC20, Litecoin et plus</div>\n    </div>\n    <span class="ml-auto text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">Crypto</span>\n  </button>':"",o=n?'\n  <button onclick="wizardSelectPayment(\'paypal\')"\n    class="w-full border-2 border-blue-500/40 rounded-xl p-4 text-left hover:border-blue-400 transition flex items-center gap-4 bg-blue-900/10">\n    <div class="flex gap-1.5 w-8 justify-center">\n      <i class="fab fa-paypal text-blue-400 text-xl"></i>\n      <i class="far fa-credit-card text-blue-300 text-xl"></i>\n    </div>\n    <div>\n      <div class="font-bold text-white">PayPal <span class="text-blue-400">/ Carte bancaire</span></div>\n      <div class="text-xs text-gray-400">Paiement immédiat et sécurisé · Visa, Mastercard, PayPal</div>\n    </div>\n  </button>':"",c=a?`\n
  <button onclick="wizardSelectPayment('bank')"\n
    class="w-full border-2 border-dark-500 rounded-xl p-4 text-left hover:border-green-400 transition flex items-center gap-4">\n
    <i class="fas fa-university text-green-400 text-2xl w-8 text-center"></i>\n
    <div><div class="font-bold text-white">Virement bancaire</div><div class="text-xs text-gray-400">2–3 jours ouvrables · ${t.bank_beneficiary||t.bank_name}</div></div>\n
  </button>`:"",x=s?`\n
  <button onclick="wizardSelectPayment('crypto')"\n
    class="w-full border-2 border-dark-500 rounded-xl p-4 text-left hover:border-orange-400 transition flex items-center gap-4">\n
    <i class="fab fa-bitcoin text-orange-400 text-2xl w-8 text-center"></i>\n
    <div><div class="font-bold text-white">Crypto (${t.crypto_network||"USDT"})</div><div class="text-xs text-gray-400">Réseau : ${t.crypto_network||"TRC20"}</div></div>\n
  </button>`:"",p=r?'\n  <button onclick="wizardSelectPayment(\'manual\')"\n    class="w-full border-2 border-dark-500 rounded-xl p-4 text-left hover:border-gray-400 transition flex items-center gap-4">\n    <i class="fas fa-info-circle text-gray-400 text-2xl w-8 text-center"></i>\n    <div><div class="font-bold text-white">Autre méthode</div><div class="text-xs text-gray-400">Voir instructions</div></div>\n  </button>':"";window._wPmtSimple={l:l,d:d,cp:cp,o:o,c:c,x:x,p:p};setTimeout(_buildWalletBtn,0);}
function _buildWalletBtn(){var _d=window._wStep4Data;if(!_d)return;var _preWbal=_d._preWbal;let w='';window._memberWalletBalance=_preWbal;const _wbal=_preWbal;const _wamt=_wizardData.totalAmt||0;const _canW=_wbal>=_wamt;const _wbalFmt=_wbal.toLocaleString('en-US',{minimumFractionDigits:2});const _wamtFmt=_wamt.toLocaleString('en-US',{minimumFractionDigits:2});const _wdiffFmt=Math.max(0,_wamt-_wbal).toLocaleString('en-US',{minimumFractionDigits:2});w=_canW?`\n
  <button onclick="wizardSelectPayment('wallet')"\n
    class="w-full border-2 border-green-500/40 rounded-xl p-4 text-left hover:border-green-400 transition flex items-center gap-4 bg-green-900/10">\n
    <i class="fas fa-wallet text-green-400 text-2xl w-8 text-center"></i>\n
    <div class="flex-1">\n
      <div class="font-bold text-white">Wallet LEADER</div>\n
      <div class="text-xs text-gray-400">Solde disponible : <span class="text-green-400 font-semibold">$${_wbalFmt}</span></div>\n
    </div>\n
    <span class="ml-auto text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">Immédiat</span>\n
  </button>`:`\n
  <div class="w-full border-2 border-dark-600 rounded-xl p-4 flex items-center gap-4 opacity-60 cursor-not-allowed">\n
    <i class="fas fa-wallet text-gray-500 text-2xl w-8 text-center"></i>\n
    <div class="flex-1">\n
      <div class="font-bold text-gray-400">Wallet LEADER</div>\n
      <div class="text-xs text-gray-500">Solde insuffisant : <span class="text-red-400 font-semibold">$${_wbalFmt}</span> / <span class="text-white">$${_wamtFmt}</span> requis</div>\n
      <div class="text-xs text-orange-400 mt-0.5"><i class="fas fa-exclamation-triangle mr-1"></i>Il vous manque <strong>$${_wdiffFmt}</strong> — rechargez votre wallet</div>\n
    </div>\n
  </div>`;if(_wbal>0){w=_canW?`\n
  <button onclick="wizardSelectPayment('wallet')"\n
    class="w-full border-2 border-green-500/40 rounded-xl p-4 text-left hover:border-green-400 transition flex items-center gap-4 bg-green-900/10">\n
    <i class="fas fa-wallet text-green-400 text-2xl w-8 text-center"></i>\n
    <div class="flex-1">\n
      <div class="font-bold text-white">Wallet LEADER</div>\n
      <div class="text-xs text-gray-400">Solde : <span class="text-green-400 font-semibold">$${_wbal.toLocaleString('en-US',{minimumFractionDigits:2})}</span></div>\n
    </div>\n
    <span class="ml-auto text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-semibold">Immédiat</span>\n
  </button>`:`\n
  <div class="w-full border-2 border-dark-600 rounded-xl p-4 flex items-center gap-4 opacity-50 cursor-not-allowed">\n
    <i class="fas fa-wallet text-gray-500 text-2xl w-8 text-center"></i>\n
    <div>\n
      <div class="font-bold text-gray-400">Wallet LEADER</div>\n
      <div class="text-xs text-gray-500">Solde insuffisant : $${_wbal.toLocaleString('en-US',{minimumFractionDigits:2})} / $${_wamt.toLocaleString('en-US',{minimumFractionDigits:2})} requis</div>\n
    </div>\n
  </div>`;}window._wPmtSimple.w=w;setTimeout(_wizardRenderFinal,0);}
function _wizardRenderFinal(){var _d=window._wStep4Data,_b=window._wPmtSimple;if(!_d||!_b)return;var e=_d.e;var l=_b.l,d=_b.d,cp=_b.cp,o=_b.o,c=_b.c,x=_b.x,p=_b.p,w=_b.w,_v2Btns=_d._v2Btns,_v2ManualBtns=_d._v2ManualBtns;_wizardShow(`\n
  ${_wizardProgress(4,7)}\n
  <div class="p-6 space-y-5">\n
    <div>\n
      <h3 class="text-lg font-bold text-white">Moyen de paiement</h3>\n
      <p class="text-sm text-gray-400 mt-1">Total à envoyer : <span class="text-rouge-400 font-bold">$${e.toLocaleString("en-US",{minimumFractionDigits:2})}</span></p>\n
    </div>\n
    <div class="space-y-3">\n
      ${l?'<div class="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 text-yellow-300 text-sm"><i class="fas fa-exclamation-triangle mr-2"></i>Aucune passerelle configurée. Contactez votre administrateur.</div>':""}\n
      ${w}${d}${cp}${o}${c}${x}${p}${_v2Btns}${_v2ManualBtns}\n
    </div>\n
    <button onclick="_wizardData.licenseOnly?wizardClose():wizardStep3()" class="text-sm text-gray-500 hover:text-gray-300 transition"><i class="fas fa-arrow-left mr-1"></i>Retour</button>\n
  </div>`)}function wizardSelectPayment(e){_wizardData.paymentMethod=e,wizardStep5()}async function wizardSelectPaymentV2(methodId,provider,displayName){_wizardData.paymentMethod="v2_psp";_wizardData.v2MethodId=methodId;_wizardData.v2Provider=provider;_wizardData.v2DisplayName=displayName;wizardStep5V2();}
async function wizardSelectPaymentV2Manual(methodId,provider,displayName){_wizardData.paymentMethod="v2_manual";_wizardData.v2MethodId=methodId;_wizardData.v2Provider=provider;_wizardData.v2DisplayName=displayName;await wizardStep5V2Manual();}
async function wizardStep5V2Manual(){
  const methodId=_wizardData.v2MethodId;
  const displayName=_wizardData.v2DisplayName;
  const totalAmt=_wizardData.totalAmt;
  _wizardShow('<div class="p-10 flex flex-col items-center gap-4"><div class="loader"></div><p class="text-gray-400 text-sm">Création de votre commande\u2026</p></div>');
  let orderId=null;
  try{
    let orderResp;
    if(_wizardData.isTopup){
      // MODE RECHARGE WALLET
      orderResp=await api("POST","/payment/topup/create",{payment_method_id:methodId,amount:totalAmt});
      _wizardData.topupId=orderResp.topup_id;
      orderId=orderResp.topup_id;
      _wizardData.orderId=orderId;
    }else if(_wizardData.licenseOnly){orderResp=await api("POST","/members/license/order",{payment_method:"v2_manual"});_wizardData.licenseId=orderResp.license_id||null;_wizardData.orderId=orderResp.license_id||null;orderId=_wizardData.orderId;}
    else if(_wizardData.isUpgrade){orderResp=await api("POST","/members/packages/upgrade",{target_package_id:_wizardData.pkgId,payment_method:"v2_manual"});orderId=orderResp.order_id;_wizardData.orderId=orderId;}
    else if(_wizardData.isPhysicalCard){orderResp=await api("POST","/members/physical-card/order",{payment_method:"v2_manual",shipping_address:_wizardData.shippingAddress||{}});orderId=orderResp.order_id;_wizardData.orderId=orderId;}
    else if(_wizardData.isCoursePayment){orderResp=await api("POST",`/campus/course/${_wizardData.courseId}/order`,{payment_method:"v2_manual"});orderId=orderResp.order_id;_wizardData.orderId=orderId;if(orderResp.existing&&orderResp.status==="proof_submitted"){return void wizardStep7();}if(orderResp.existing){return void wizardStep6();}}
    else{const _b={package_id:_wizardData.pkgId,payment_method:"v2_manual"};if(_wizardData.addLicense)_b.add_license=true;orderResp=await api("POST","/members/packages/order",_b);orderId=orderResp.order_id;_wizardData.orderId=orderId;}
  }catch(err){
    if(err.existing_order_id){orderId=err.existing_order_id;_wizardData.orderId=orderId;}
    else{_wizardShow(`<div class="p-8 text-center space-y-4"><i class="fas fa-exclamation-circle text-red-400 text-3xl"></i><p class="text-red-400">Erreur lors de la cr\u00e9ation de commande.<br><span class="text-xs text-gray-500">${err.error||err.message||""}</span></p><button onclick="wizardStep4()" class="py-2 px-6 bg-dark-700 text-gray-300 rounded-xl text-sm"><i class="fas fa-arrow-left mr-1"></i>Retour</button></div>`);return;}
  }
  let methodDetails={display_name:displayName,instructions:"",config:{}};
  try{
    const mResp=await api("GET","/payment/methods");
    const allMethods=Object.values(mResp.methods||{}).flat();
    const found=allMethods.find(m=>m.id===methodId);
    if(found)methodDetails={...found,config:found.config||{}};
  }catch(_e){}
  const cfg=methodDetails.config||{};
  const instrText=methodDetails.instructions||cfg.instructions||"";
  const phoneNum=cfg.phone_number||cfg.account_number||"";
  const accName=cfg.account_name||cfg.beneficiary||"";
  const emoji=methodDetails.logo_emoji||"\ud83d\udcf1";
  _wizardShow(`
  ${_wizardProgress(5,7)}
  <div class="p-6 space-y-5">
    <div>
      <h3 class="text-lg font-bold text-white">${emoji} ${displayName}</h3>
      <p class="text-sm text-gray-400 mt-1">Effectuez votre paiement puis uploadez votre preuve ci-dessous.</p>
    </div>
    <div class="bg-dark-700 border border-emerald-500/30 rounded-xl p-4 space-y-2 text-sm">
      <div class="flex items-center gap-2 text-emerald-400 font-semibold mb-2"><i class="fas fa-info-circle"></i>Instructions de paiement</div>
      ${phoneNum?`<div class="flex justify-between"><span class="text-gray-400">Num\u00e9ro</span><span class="font-mono font-bold text-white">${phoneNum}</span></div>`:""}
      ${accName?`<div class="flex justify-between"><span class="text-gray-400">B\u00e9n\u00e9ficiaire</span><span class="font-medium text-white">${accName}</span></div>`:""}
      <div class="flex justify-between"><span class="text-gray-400">Montant \u00e0 envoyer</span><span class="font-bold text-rouge-400">$${totalAmt.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
      ${instrText?`<p class="text-xs text-gray-400 mt-2 pt-2 border-t border-dark-600">${instrText}</p>`:""}
      <p class="text-xs text-gray-500 pt-2 border-t border-dark-600">R\u00e9f\u00e9rence : votre identifiant unique LEADER</p>
    </div>
    <div id="v2manual-upload-zone"></div>
    <div>
      <label class="text-xs text-gray-400 block mb-1">R\u00e9f\u00e9rence / N\u00b0 de transaction (optionnel)</label>
      <input id="v2manual-ref-input" type="text" placeholder="Ex: TXN123456789" class="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-400">
    </div>
    <div id="v2manual-error" class="hidden bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm"></div>
    <div class="flex gap-3">
      <button onclick="wizardStep4()" class="flex-1 py-3 bg-dark-700 text-gray-300 rounded-xl hover:bg-dark-600 transition text-sm"><i class="fas fa-arrow-left mr-2"></i>Retour</button>
      <button id="v2manual-submit-btn" onclick="_submitV2ManualProof(\'${orderId||""}\')" class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-sm"><i class="fas fa-paper-plane mr-2"></i>Soumettre la preuve</button>
    </div>
  </div>`);
  // Initialiser la zone upload après rendu du HTML
  setTimeout(()=>{
    window._v2manualProofUrl="";
    window._v2manualUploadUid=createUploadZone({
      containerId:"v2manual-upload-zone",
      accept:"image/*,application/pdf",
      purpose:"proof",
      apiPrefix:"/api/members",
      label:'Justificatif de paiement <span class="text-red-400">*</span>',
      onUrl:url=>{window._v2manualProofUrl=url||"";},
      getToken:()=>memberToken||localStorage.getItem("leader_member_token")
    });
  },50);
}
async function _submitV2ManualProof(orderId){
  const btn=document.getElementById("v2manual-submit-btn");
  const errDiv=document.getElementById("v2manual-error");
  const refInput=document.getElementById("v2manual-ref-input");
  // Lire l'URL uploadée via upload-zone (evite base64 -> D1 SQLITE_TOOBIG)
  const proofUrl=window._v2manualProofUrl||(window._v2manualUploadUid?uzGetUrl(window._v2manualUploadUid):"");
  if(!proofUrl){
    if(errDiv){errDiv.textContent="Veuillez uploader une preuve de paiement.";errDiv.classList.remove("hidden");}
    return;
  }
  if(btn){btn.disabled=true;btn.innerHTML="<i class=\"fas fa-spinner fa-spin mr-2\"></i>Envoi...";}
  if(errDiv)errDiv.classList.add("hidden");
  try{
    if(_wizardData.isTopup){
      // MODE RECHARGE WALLET — soumettre preuve de recharge
      const topupId=_wizardData.topupId||orderId;
      await api("POST","/payment/topup/submit-proof",{topup_id:topupId,proof_url:proofUrl,reference:refInput?.value?.trim()||null});
      _wizardShow(`
      <div class="p-8 text-center space-y-5">
        <div class="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <i class="fas fa-check-circle text-green-400 text-4xl"></i>
        </div>
        <div>
          <p class="text-white font-bold text-xl">Recharge soumise !</p>
          <p class="text-green-400 text-sm mt-1">Votre preuve de paiement a été envoyée. La recharge sera validée sous 24–48h.</p>
          <p class="text-gray-500 text-xs mt-2">Réf. : ${(topupId||"").substring(0,16)}…</p>
        </div>
        <button onclick="wizardClose()" class="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition">
          <i class="fas fa-check mr-2"></i>Fermer
        </button>
      </div>`);
      _wizardReset();
    }else if(_wizardData.isPhysicalCard){
      await api("POST","/members/physical-card/submit-proof",{order_id:orderId,proof_url:proofUrl,reference:refInput?.value?.trim()||null});
      _wizardShow(`
      <div class="p-8 text-center space-y-5">
        <div class="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
          <i class="fas fa-check-circle text-amber-400 text-4xl"></i>
        </div>
        <div>
          <p class="text-white font-bold text-xl">Commande enregistrée !</p>
          <p class="text-amber-400 text-sm mt-1">Votre preuve a été envoyée. Votre carte sera fabriquée et expédiée après validation sous 24–48h.</p>
          <p class="text-gray-500 text-xs mt-2">Réf. commande : ${(orderId||"").substring(0,16)}…</p>
        </div>
        <button onclick="wizardClose();showPage('member-card')" class="w-full py-3 bg-amber-500 text-dark-900 font-bold rounded-xl hover:bg-amber-400 transition">
          <i class="fas fa-credit-card mr-2"></i>Voir ma carte
        </button>
      </div>`);
      _wizardReset();
    }else if(_wizardData.isCoursePayment){
      // ACHAT DIRECT FORMATION CAMPUS
      const courseOrderId=_wizardData.orderId||orderId;
      await api("POST",`/campus/course-order/${courseOrderId}/proof`,{proof_url:proofUrl,note:refInput?.value?.trim()||""});
      _wizardShow(`
      <div class="p-8 text-center space-y-5">
        <div class="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
          <i class="fas fa-check-circle text-emerald-400 text-4xl"></i>
        </div>
        <div>
          <p class="text-white font-bold text-xl">Preuve soumise !</p>
          <p class="text-emerald-400 text-sm mt-1">Votre accès à la formation sera débloqué sous 24–48h après validation.</p>
          <p class="text-gray-500 text-xs mt-2">Réf. : ${(courseOrderId||"").substring(0,16)}…</p>
        </div>
        <button onclick="wizardClose()" class="w-full py-3 bg-rouge-500 text-dark-900 font-bold rounded-xl hover:bg-rouge-500 transition">
          <i class="fas fa-check mr-2"></i>Fermer
        </button>
      </div>`);
      _wizardReset();
    }else{
      // COMMANDE PACKAGE — preuve URL (pas de base64)
      await api("POST","/members/packages/submit-proof",{order_id:orderId,reference:refInput?.value?.trim()||null,proof_url:proofUrl});
      _wizardShow(`
      <div class="p-8 text-center space-y-5">
        <div class="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
          <i class="fas fa-check-circle text-emerald-400 text-4xl"></i>
        </div>
        <div>
          <p class="text-white font-bold text-xl">Preuve soumise !</p>
          <p class="text-emerald-400 text-sm mt-1">Votre paiement sera validé par l'équipe sous 24–48h.</p>
          <p class="text-gray-500 text-xs mt-2">Réf. commande : ${(orderId||"").substring(0,16)}…</p>
        </div>
        <button onclick="wizardClose();showPage('packages')" class="w-full py-3 bg-rouge-500 text-dark-900 font-bold rounded-xl hover:bg-rouge-500 transition">
          <i class="fas fa-check mr-2"></i>Fermer
        </button>
      </div>`);
      _wizardReset();
    }
  }catch(err){
    if(btn){btn.disabled=false;btn.innerHTML="<i class=\"fas fa-paper-plane mr-2\"></i>Soumettre la preuve";}
    if(errDiv){errDiv.textContent=err.error||err.message||"Erreur lors de la soumission";errDiv.classList.remove("hidden");}
  }
}
async function wizardStep5V2(){_wizardShow('<div class="p-10 flex flex-col items-center gap-4"><div class="loader"></div><p class="text-gray-400 text-sm">Création de votre commande…</p></div>');const t=_wizardData.v2MethodId;const n=_wizardData.totalAmt;let orderId=null;let licenseId=null;try{let orderResp;if(_wizardData.isTopup){orderResp=await api("POST","/payment/topup/create",{payment_method_id:t,amount:n});_wizardData.topupId=orderResp.topup_id;orderId=orderResp.topup_id;_wizardData.orderId=orderId;}else if(_wizardData.licenseOnly){orderResp=await api("POST","/members/license/order",{payment_method:"v2_psp"});licenseId=orderResp.license_id||null;_wizardData.licenseId=licenseId;_wizardData.orderId=licenseId;orderId=licenseId;}else if(_wizardData.isUpgrade){orderResp=await api("POST","/members/packages/upgrade",{target_package_id:_wizardData.pkgId,payment_method:"v2_psp"});orderId=orderResp.order_id;_wizardData.orderId=orderId;}else if(_wizardData.isPhysicalCard){orderResp=await api("POST","/members/physical-card/order",{payment_method:"v2_psp",shipping_address:_wizardData.shippingAddress||{}});orderId=orderResp.order_id;_wizardData.orderId=orderId;}else if(_wizardData.isCoursePayment){orderResp=await api("POST",`/campus/course/${_wizardData.courseId}/order`,{payment_method:"v2_psp"});orderId=orderResp.order_id;_wizardData.orderId=orderId;if(orderResp.existing&&orderResp.status==="proof_submitted"){return void wizardStep7();}if(orderResp.existing){return void wizardStep6();}}else{const body={package_id:_wizardData.pkgId,payment_method:"v2_psp"};if(_wizardData.addLicense)body.add_license=true;orderResp=await api("POST","/members/packages/order",body);orderId=orderResp.order_id;_wizardData.orderId=orderId;}}catch(err){if(err.existing_order_id){orderId=err.existing_order_id;_wizardData.orderId=orderId;}else{_wizardShow(`<div class="p-8 text-center space-y-4"><i class="fas fa-exclamation-circle text-red-400 text-3xl"></i><p class="text-red-400">Erreur lors de la création de commande.<br><span class="text-xs text-gray-500">${err.error||err.message||""}</span></p><button onclick="wizardStep4()" class="py-2 px-6 bg-dark-700 text-gray-300 rounded-xl text-sm"><i class="fas fa-arrow-left mr-1"></i>Retour</button></div>`);return;}}_wizardShow('<div class="p-10 flex flex-col items-center gap-4"><div class="loader"></div><p class="text-gray-400 text-sm">Redirection vers ${_wizardData.v2DisplayName}…</p></div>');try{const pspBody={payment_method_id:t,amount:n,return_url:window.location.href};if(_wizardData.isTopup)pspBody.topup_id=orderId;else if(licenseId)pspBody.license_id=licenseId;else pspBody.order_id=orderId;const pspResp=await api("POST","/psp/initiate",pspBody);if(pspResp.redirect_url){window.location.href=pspResp.redirect_url;}else{throw {error:"URL de redirection manquante"};}}catch(pspErr){_wizardShow(`<div class="p-8 text-center space-y-4"><i class="fas fa-exclamation-circle text-red-400 text-3xl"></i><p class="text-red-400">Erreur de paiement ${_wizardData.v2DisplayName}.<br><span class="text-xs text-gray-500">${pspErr.error||pspErr.message||""}</span></p><button onclick="wizardStep4()" class="py-2 px-6 bg-dark-700 text-gray-300 rounded-xl text-sm"><i class="fas fa-arrow-left mr-1"></i>Retour</button></div>`);}}async function wizardStep5(){const e=_gw,t=_wizardData.paymentMethod,n=_wizardData.totalAmt;_wizardData.orderId=null,_wizardShow('\n  <div class="p-10 flex flex-col items-center gap-4">\n    <div class="loader"></div>\n    <p class="text-gray-400 text-sm">Création de votre commande…</p>\n  </div>');try{let _apiResp;if(_wizardData.isTopup){
  // MODE RECHARGE WALLET — méthode legacy (bank, paypal, crypto, stripe, coinpayments, wallet, manual)
  // On crée le topup maintenant avec legacy_method pour que topupId soit disponible dans wizardSubmitProof
  _apiResp=await api("POST","/payment/topup/create",{legacy_method:t,amount:n});
  _wizardData.topupId=_apiResp.topup_id;
  _wizardData.orderId=_apiResp.topup_id;
}else if(_wizardData.licenseOnly){
  _apiResp=await api("POST","/members/license/order",{payment_method:t||"manual"});
  _wizardData.licenseId=_apiResp.license_id||null;
  _wizardData.orderId=_apiResp.license_id||_apiResp.order_id||null;
  // Wallet → activation immédiate
  if(_apiResp.activated){
    if(_apiResp.new_balance!==undefined){window._memberWalletBalance=_apiResp.new_balance;const _hb=document.getElementById('header-balance');if(_hb){const _nb=_apiResp.new_balance;_hb.innerHTML='<span class="text-gray-400">Solde : </span><span class="text-rouge-400 font-bold">$'+Number(_nb).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'</span>';}}
    _wizardShow(`
  <div class="p-8 text-center space-y-5">
    <div class="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
      <i class="fas fa-key text-green-400 text-4xl"></i>
    </div>
    <div>
      <p class="text-white font-bold text-xl">Licence activée !</p>
      <p class="text-green-400 text-sm mt-1">${_apiResp.message||"Votre licence Finstrategia est maintenant active."}</p>
    </div>
    <button onclick="wizardClose(); renderLicense(document.getElementById('page-content'))"
      class="w-full py-3 bg-rouge-500 text-dark-900 font-bold rounded-xl hover:bg-rouge-500 transition">
      <i class="fas fa-check mr-2"></i>Voir ma licence
    </button>
  </div>`);_wizardReset();return;
  }
}else if(_wizardData.isUpgrade){_apiResp=await api("POST","/members/packages/upgrade",{target_package_id:_wizardData.pkgId,payment_method:t||"manual"});_wizardData.orderId=_apiResp.order_id||_wizardData.orderId;}else if(_wizardData.isPhysicalCard){_apiResp=await api("POST","/members/physical-card/order",{payment_method:t||"manual",shipping_address:_wizardData.shippingAddress||{}});_wizardData.orderId=_apiResp.order_id||_wizardData.orderId;}else if(_wizardData.isCoursePayment){_apiResp=await api("POST",`/campus/course/${_wizardData.courseId}/order`,{payment_method:t||"manual"});_wizardData.orderId=_apiResp.order_id||_wizardData.orderId;if(_apiResp.existing&&_apiResp.status==="proof_submitted"){return void wizardStep7();}if(_apiResp.existing){return void wizardStep6();}}else{const _pkgBody={package_id:_wizardData.pkgId,payment_method:t||"manual"};_wizardData.addLicense&&(_pkgBody.add_license=!0);_apiResp=await api("POST","/members/packages/order",_pkgBody);_wizardData.orderId=_apiResp.order_id||_wizardData.orderId;}}catch(_err){if(_err.existing_order_id){const _existId=_err.existing_order_id||"";const _existStatus=_err.existing_status||"pending";if(_wizardData.licenseOnly){_wizardData.licenseId=_existId;_wizardData.orderId=_existId;}else{_wizardData.orderId=_existId;if(_existStatus==="proof_submitted"){return void wizardStep7();}else{return void wizardStep6();}}}}let a="";a="stripe"===t?`\n
    <div class="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 space-y-3">\n
      <div class="flex items-center gap-3">\n
        <i class="fas fa-credit-card text-purple-400 text-2xl"></i>\n
        <div>\n
          <div class="font-semibold">Paiement sécurisé par carte</div>\n
          <div class="text-xs text-gray-400">Visa · Mastercard · Amex · Apple Pay · Google Pay</div>\n
        </div>\n
      </div>\n
      <div id="stripe-payment-element" class="min-h-[120px]">\n
        <div class="flex items-center justify-center py-6"><div class="loader"></div></div>\n
      </div>\n
      <div id="stripe-error-msg" class="hidden text-red-400 text-sm text-center"></div>\n
      <button id="stripe-pay-btn" onclick="_stripeConfirmPayment()"\n
        class="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2">\n
        <i class="fas fa-lock text-sm"></i> Payer $${n.toLocaleString("en-US",{minimumFractionDigits:2})}\n
      </button>\n
      <p class="text-xs text-gray-500 text-center"><i class="fas fa-lock mr-1"></i>Paiement 100% sécurisé — SSL chiffré · Aucune donnée bancaire stockée</p>\n
    </div>`:"paypal"===t?'\n    <div class="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 space-y-3">\n      <div class="flex items-center gap-3">\n        <i class="fab fa-paypal text-blue-400 text-2xl"></i>\n        <div>\n          <div class="font-semibold">Paiement sécurisé PayPal / Carte</div>\n          <div class="text-xs text-gray-400">Visa · Mastercard · PayPal · Activation immédiate</div>\n        </div>\n      </div>\n      <div id="paypal-buttons-container" class="min-h-[80px] flex items-center justify-center">\n        <div class="loader"></div>\n      </div>\n      <p class="text-xs text-gray-500 text-center"><i class="fas fa-lock mr-1"></i>Paiement 100% sécurisé — SSL chiffré · Aucune donnée bancaire stockée</p>\n    </div>':"bank"===t?`\n
    <div class="bg-green-900/20 border border-green-500/30 rounded-xl p-4 space-y-2 text-sm">\n
      <div class="flex items-center gap-3 mb-3">\n
        <i class="fas fa-university text-green-400 text-xl"></i>\n
        <div><div class="font-semibold">Virement bancaire</div><div class="text-xs text-gray-400">2–3 jours ouvrables</div></div>\n
      </div>\n
      ${e.bank_beneficiary?`<div class="flex justify-between"><span class="text-gray-400">Bénéficiaire</span><span class="font-medium">${e.bank_beneficiary}</span></div>`:""}\n
      ${e.bank_iban?`<div class="flex justify-between"><span class="text-gray-400">IBAN</span><span class="font-mono text-xs">${e.bank_iban}</span></div>`:""}\n
      ${e.bank_swift?`<div class="flex justify-between"><span class="text-gray-400">BIC/SWIFT</span><span class="font-mono">${e.bank_swift}</span></div>`:""}\n
      ${e.bank_instructions?`<p class="text-xs text-gray-400 mt-2">${e.bank_instructions}</p>`:""}\n
      <p class="text-xs text-gray-500 mt-2 pt-2 border-t border-dark-500">Référence : votre identifiant unique LEADER</p>\n
    </div>`:"coinpayments"===t?`\n
    <div class="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4 space-y-4">\n
      <div class="flex items-center gap-3 mb-2">\n
        <i class="fas fa-coins text-orange-400 text-2xl"></i>\n
        <div>\n
          <div class="font-semibold text-white">Paiement Crypto via CoinPayments</div>\n
          <div class="text-xs text-gray-400">Choisissez votre cryptomonnaie et payez en quelques clics</div>\n
        </div>\n
      </div>\n
      <div>\n
        <label class="block text-xs text-gray-400 mb-2">Cryptomonnaie</label>\n
        <select id="cp-coin-select" class="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-400 focus:outline-none" onchange="_cpCoinChanged(this)">\n
          ${(()=>{const coins=(_cpCoins||"USDT.TRC20,LTC,ETH,BTC").split(",").map(c=>c.trim());const sorted=[...coins.filter(c=>c==="USDT.TRC20"),...coins.filter(c=>c!=="USDT.TRC20")];const labels={"USDT.TRC20":"USDT (TRC-20) ✓ Recommandé","USDT.ERC20":"USDT (ERC-20) - Deconseille","BTC":"Bitcoin (BTC)","ETH":"Ethereum (ETH)","LTC":"Litecoin (LTC)"};return sorted.map(c=>`<option value="${c}">${labels[c]||c}</option>`).join("");})()}\n
        </select>\n
      </div>\n
      <div id="cp-erc20-warning" class="hidden bg-orange-900/40 border border-orange-500/60 rounded-xl p-3 text-sm text-orange-200">\n
        <i class="fas fa-exclamation-triangle text-orange-400 mr-2"></i>\n
        <strong class="text-orange-300">Attention :</strong> Coinbase Wallet et certains wallets bloquent les adresses ERC-20 de services tiers. Utilisez <strong class="text-green-300">USDT TRC-20</strong> (réseau Tron) — compatible partout et frais très faibles.\n
      </div>\n
      <div id="cp-info" class="bg-dark-700 rounded-xl p-4 text-sm text-gray-300 space-y-2">\n
        <p class="text-xs text-gray-400"><i class="fas fa-info-circle mr-1 text-orange-400"></i>\n
          Vous serez redirigé vers le site sécurisé CoinPayments pour finaliser votre paiement crypto.\n
        </p>\n
        <p class="text-xs text-gray-500">Après paiement, votre commande sera activée automatiquement dès confirmation du réseau.</p>\n
      </div>\n
      <div id="cp-error" class="hidden bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm"></div>\n
      <button id="cp-pay-btn" onclick="_cpStartPayment()"\n
        class="w-full py-3 bg-orange-500 hover:bg-orange-400 text-dark-900 font-bold rounded-xl transition flex items-center justify-center gap-2">\n
        <i class="fas fa-coins text-sm"></i> Payer $${n.toLocaleString("en-US",{minimumFractionDigits:2})} en Crypto\n
      </button>\n
    </div>`:"crypto"===t?`\n
    <div class="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4 space-y-3">\n
      <div class="flex items-center gap-3">\n
        <i class="fab fa-bitcoin text-orange-400 text-xl"></i>\n
        <div><div class="font-semibold">Crypto — ${e.crypto_network||"USDT"}</div></div>\n
      </div>\n
      <div class="bg-dark-700 rounded-lg px-3 py-2 font-mono text-orange-300 text-xs break-all select-all">${e.crypto_address}</div>\n
      ${e.crypto_instructions?`<p class="text-xs text-gray-400">${e.crypto_instructions}</p>`:""}\n
    </div>`:"wallet"===t?`\n
    <div class="bg-green-900/10 border border-green-500/30 rounded-xl p-4 space-y-4">\n
      <div class="flex items-center gap-3">\n
        <i class="fas fa-wallet text-green-400 text-2xl"></i>\n
        <div>\n
          <div class="font-semibold text-white">Paiement via Wallet LEADER</div>\n
          <div class="text-xs text-gray-400">Débit immédiat · Activation instantanée</div>\n
        </div>\n
      </div>\n
      <div class="bg-dark-700 rounded-xl p-4 space-y-2 text-sm">\n
        <div class="flex justify-between"><span class="text-gray-400">Montant débité</span><span class="text-white font-bold">$${n.toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>\n
        <div class="flex justify-between"><span class="text-gray-400">Solde wallet</span><span class="text-green-400">$${(Number(window._memberWalletBalance)||0).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>\n
        <div class="flex justify-between font-semibold"><span class="text-gray-400">Solde après paiement</span><span class="text-${(Number(window._memberWalletBalance)||0)-n>=0?'green':'red'}-400">$${((Number(window._memberWalletBalance)||0)-n).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>\n
      </div>\n
      <button onclick="_walletPayOrder()" id="wallet-pay-btn"\n
        class="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2">\n
        <i class="fas fa-wallet text-sm"></i> Confirmer le paiement\n
      </button>\n
      <p class="text-xs text-gray-500 text-center"><i class="fas fa-bolt mr-1 text-green-400"></i>Activation immédiate — aucune preuve de paiement requise</p>\n
    </div>`:`\n
    <div class="bg-dark-700 border border-dark-500 rounded-xl p-4 space-y-2">\n
      <div class="flex items-center gap-2 mb-1"><i class="fas fa-info-circle text-rouge-400"></i><span class="font-semibold text-sm">Instructions</span></div>\n
      <p class="text-sm text-gray-300 whitespace-pre-line">${e.instructions}</p>\n
      ${e.contact_email?`<p class="text-xs text-gray-400"><i class="fas fa-envelope mr-1"></i>${e.contact_email}</p>`:""}\n
      ${e.contact_phone?`<p class="text-xs text-gray-400"><i class="fas fa-phone mr-1"></i>${e.contact_phone}</p>`:""}\n
    </div>`;const s="paypal"===t,r="stripe"===t,i=s||r?'<div class="bg-green-900/10 border border-green-500/20 rounded-xl p-3 text-xs text-gray-400">\n        <i class="fas fa-bolt text-green-400 mr-1"></i>\n        <strong class="text-green-300">Activation immédiate</strong> — Votre commande sera activée automatiquement après paiement confirmé.\n       </div>':'<div class="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 text-sm text-gray-300">\n        <i class="fas fa-info-circle text-blue-400 mr-2"></i>\n        Une fois le paiement effectué, cliquez sur <strong>"J\'ai payé"</strong> pour soumettre votre preuve.\n       </div>',l=s||r?'<button onclick="wizardStep4()" class="w-full py-2.5 bg-dark-700 text-gray-400 rounded-xl hover:bg-dark-600 transition text-sm"><i class="fas fa-arrow-left mr-2"></i>Retour / Changer de méthode</button>':'<div class="flex gap-3">\n        <button onclick="wizardStep4()" class="flex-1 py-3 bg-dark-700 text-gray-300 rounded-xl hover:bg-dark-600 transition text-sm"><i class="fas fa-arrow-left mr-2"></i>Retour</button>\n        <button onclick="wizardStep6()" class="flex-1 py-3 bg-rouge-500 text-dark-900 font-bold rounded-xl hover:bg-rouge-500 transition text-sm">\n          <i class="fas fa-check mr-2"></i>J\'ai payé\n        </button>\n       </div>';if(_wizardShow(`\n
  ${_wizardProgress(5,7)}\n
  <div class="p-6 space-y-5">\n
    <div>\n
      <h3 class="text-lg font-bold text-white">Effectuez votre paiement</h3>\n
      <p class="text-sm text-gray-400 mt-1">Commande créée · Réf. <span class="font-mono text-rouge-400">${(_wizardData.orderId||"").substring(0,12)}…</span></p>\n
    </div>\n
    <div class="bg-dark-700 border border-dark-500 rounded-xl p-4 flex justify-between items-center">\n
      <span class="text-gray-400 text-sm">Montant total</span>\n
      <span class="text-rouge-400 font-bold text-2xl">$${n.toLocaleString("en-US",{minimumFractionDigits:2})}</span>\n
    </div>\n
    ${a}\n
    ${i}\n
    ${l}\n
  </div>`),s){const e=_wizardData.orderId,t=_wizardData.licenseId||null,a=n;_renderPayPalButtons("paypal-buttons-container",async()=>{const n={amount:a};e&&(n.order_id=e),t&&(n.license_id=t),n.description=`LEADER — ${_wizardData.pkgName||"Licence Finstrategia"} ($${a.toFixed(2)})`;const s=await api("POST","/members/paypal/create-order",n);if(!s.paypal_order_id)throw new Error("Erreur création ordre PayPal");return s.paypal_order_id},e=>{_wizardShow(`\n
        <div class="p-8 text-center space-y-5">\n
          <div class="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">\n
            <i class="fas fa-check text-green-400 text-4xl"></i>\n
          </div>\n
          <div>\n
            <p class="text-white font-bold text-xl">Paiement confirmé !</p>\n
            <p class="text-green-400 text-sm mt-1">${e.message||"Votre commande est activée."}</p>\n
          </div>\n
          <div class="bg-dark-700 rounded-xl p-4 text-left space-y-2 text-sm">\n
            ${e.amount?`<div class="flex justify-between"><span class="text-gray-400">Montant payé</span><span class="text-green-400 font-bold">$${Number(e.amount).toFixed(2)}</span></div>`:""}\n
            ${e.paypal_capture_id?`<div class="flex justify-between"><span class="text-gray-400">Référence PayPal</span><span class="font-mono text-xs text-gray-300">${e.paypal_capture_id}</span></div>`:""}\n
            ${e.order_id?`<div class="flex justify-between"><span class="text-gray-400">Réf. commande</span><span class="font-mono text-xs text-gray-300">${(e.order_id||"").substring(0,16)}…</span></div>`:""}\n
          </div>\n
          <button onclick="wizardClose(); showPage('dashboard')"\n
            class="w-full py-3 bg-rouge-500 text-dark-900 font-bold rounded-xl hover:bg-rouge-500 transition">\n
            <i class="fas fa-home mr-2"></i>Aller à mon tableau de bord\n
          </button>\n
        </div>`),_wizardReset()},e=>{document.getElementById("paypal-buttons-container").innerHTML=`<div class="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-center space-y-3">\n
            <p class="text-red-400 text-sm"><i class="fas fa-exclamation-circle mr-1"></i>${e}</p>\n
            <button onclick="wizardStep5()" class="text-xs text-gray-400 hover:text-white underline">Réessayer</button>\n
          </div>`})}r&&setTimeout(()=>_initStripePaymentElement(n),150)}let _stripe=null,_stripeElements=null,_stripePiClientSecret=null;async function _loadStripeSdk(){return!!window.Stripe||new Promise(e=>{const t=document.createElement("script");t.src="https://js.stripe.com/v3/",t.onload=()=>e(!0),t.onerror=()=>e(!1),document.head.appendChild(t)})}async function _initStripePaymentElement(e){if(!await _loadStripeSdk())return void(document.getElementById("stripe-payment-element").innerHTML='<p class="text-red-400 text-sm text-center"><i class="fas fa-exclamation-circle mr-1"></i>Impossible de charger Stripe. Vérifiez votre connexion.</p>');const t=_wizardData.orderId,n=_wizardData.licenseId||null,a=e;try{const e={amount:a};if(_wizardData.isPhysicalCard&&_wizardData.orderId){e.physical_card_order_id=_wizardData.orderId;}else if(_wizardData.licenseOnly){if(n)e.license_id=n;}else{t&&(e.order_id=t);n&&(e.license_id=n);}e.description=`LEADER — Commande ${(_wizardData.isPhysicalCard?_wizardData.orderId:n||t||"").substring(0,12)}`;const s=await api("POST","/members/stripe/create-payment-intent",e);_stripePiClientSecret=s.client_secret,window._stripePiId=s.payment_intent_id,window._stripeOrderId=t,window._stripeLicenseId=n,_stripe=Stripe(window._stripePublicKey);const r={theme:"night",variables:{colorPrimary:"#c9a84c",colorBackground:"#1a1f2e",colorText:"#ffffff",colorDanger:"#f87171",borderRadius:"12px",fontFamily:"system-ui, sans-serif"}};_stripeElements=_stripe.elements({clientSecret:_stripePiClientSecret,appearance:r}),_stripeElements.create("payment",{layout:"tabs"}).mount("#stripe-payment-element")}catch(e){const t=e.error||e.message||"Erreur Stripe";console.error("[Stripe init error]",t,e);const _se=document.getElementById("stripe-payment-element");if(_se){_se.innerHTML=`<div class="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-center space-y-3"><i class="fas fa-exclamation-circle text-red-400 text-2xl"></i><p class="text-red-300 font-semibold text-sm mt-2">${t}</p><button onclick="wizardStep4()" class="py-2 px-4 bg-dark-700 text-gray-300 rounded-xl text-xs mt-2">← Retour</button></div>`;}else{_wizardShow(`<div class="p-6 text-center space-y-4"><div class="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto"><i class="fas fa-exclamation-circle text-red-400 text-3xl"></i></div><p class="text-red-300 font-semibold">${t}</p><button onclick="wizardStep4()" class="py-2 px-4 bg-dark-700 text-gray-300 rounded-xl text-sm">← Retour</button></div>`);}}}async function _stripeConfirmPayment(){const e=document.getElementById("stripe-pay-btn"),t=document.getElementById("stripe-error-msg");if(_stripe&&_stripeElements){e.disabled=!0,e.innerHTML='<div class="loader-sm mx-auto"></div>',t.classList.add("hidden");try{const{error:n,paymentIntent:a}=await _stripe.confirmPayment({elements:_stripeElements,redirect:"if_required"});if(n)return t.textContent=n.message||"Paiement refusé",t.classList.remove("hidden"),e.disabled=!1,void(e.innerHTML='<i class="fas fa-lock text-sm"></i> Réessayer');if(a&&"succeeded"===a.status){e.innerHTML='<div class="loader-sm mx-auto"></div>';const t=await api("POST","/members/stripe/confirm-payment",{payment_intent_id:window._stripePiId,order_id:(_wizardData.isPhysicalCard?null:window._stripeOrderId)||null,license_id:window._stripeLicenseId||null,physical_card_order_id:_wizardData.isPhysicalCard?(_wizardData.orderId||null):null});_wizardData.confirmationMsg=t.message||"Paiement confirmé et commande activée !",wizardStep7()}else t.textContent=`Statut inattendu: ${a?.status}`,t.classList.remove("hidden"),e.disabled=!1,e.innerHTML='<i class="fas fa-lock text-sm"></i> Réessayer'}catch(n){t.textContent=n.error||n.message||"Erreur lors du paiement",t.classList.remove("hidden"),e.disabled=!1,e.innerHTML='<i class="fas fa-lock text-sm"></i> Réessayer'}}}function wizardStep6(){_wizardShow(`\n
  ${_wizardProgress(6,7)}\n
  <div class="p-6 space-y-5">\n
    <div>\n
      <h3 class="text-lg font-bold text-white">Preuve de paiement</h3>\n
      <p class="text-sm text-gray-400 mt-1">Uploadez une capture d'écran de votre virement ou tout justificatif de paiement.</p>\n
    </div>\n
\n
    \x3c!-- Zone upload preuve de paiement --\x3e\n
    <div id="wiz-proof-upload-zone"></div>\n
\n
    <div>\n
      <label class="block text-sm text-gray-400 mb-1.5">Note (optionnel)</label>\n
      <input id="wiz-proof-note" type="text" placeholder="Ex : virement du 15 mai 2026…"\n
        class="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-0 focus:outline-none text-sm">\n
    </div>\n
\n
    <div class="bg-yellow-900/10 border border-yellow-500/20 rounded-xl p-3 text-xs text-gray-400">\n
      <i class="fas fa-clock text-yellow-400 mr-2"></i>\n
      Validation sous <strong class="text-white">24–48h</strong> après réception de votre preuve.\n
    </div>\n
    <div class="flex gap-3">\n
      <button onclick="wizardStep5()" class="flex-1 py-3 bg-dark-700 text-gray-300 rounded-xl hover:bg-dark-600 transition text-sm"><i class="fas fa-arrow-left mr-2"></i>Retour</button>\n
      <button onclick="wizardSubmitProof()" id="wiz-submit-btn" class="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition text-sm">\n
        <i class="fas fa-upload mr-2"></i>Soumettre la preuve\n
      </button>\n
    </div>\n
  </div>`),setTimeout(()=>{window._wizProofUploadUid=createUploadZone({containerId:"wiz-proof-upload-zone",accept:"image/*,application/pdf",purpose:"proof",apiPrefix:"/api/members",label:'Justificatif de paiement <span class="text-red-400">*</span>',onUrl:e=>{window._wizProofUrl=e||""},getToken:()=>memberToken||localStorage.getItem("leader_member_token")})},50)}async function wizardSubmitProof(){
  // Récupérer l'URL : 1) callback onUrl, 2) uzGetUrl(uid), 3) input caché dans le container
  let proofUrl = window._wizProofUrl || '';
  if(!proofUrl && window._wizProofUploadUid){
    proofUrl = uzGetUrl(window._wizProofUploadUid) || '';
  }
  if(!proofUrl){
    const hiddenInput = document.querySelector('#wiz-proof-upload-zone input[type="hidden"]');
    if(hiddenInput) proofUrl = hiddenInput.value || '';
  }
  const t=document.getElementById("wiz-proof-note")?.value.trim();
  const n=document.getElementById("wiz-submit-btn");
  // Afficher une erreur inline dans le wizard (plus fiable que showToast derrière le modal)
  function _showWizErr(msg){
    let errDiv=document.getElementById("wiz-proof-error");
    if(!errDiv){
      errDiv=document.createElement("div");
      errDiv.id="wiz-proof-error";
      errDiv.className="bg-red-900/30 border border-red-500/40 rounded-xl px-4 py-3 text-red-300 text-sm flex items-start gap-2";
      const btnRow=n?.parentElement;
      if(btnRow)btnRow.parentElement.insertBefore(errDiv,btnRow);
    }
    errDiv.innerHTML='<i class="fas fa-exclamation-circle mt-0.5 shrink-0"></i><span>'+msg+'</span>';
    errDiv.style.display="flex";
    setTimeout(()=>{if(errDiv)errDiv.style.display="none";},8000);
  }
  if(!proofUrl){
    _showWizErr("Veuillez uploader ou fournir un justificatif de paiement");
    return;
  }
  n&&(n.disabled=!0,n.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Envoi…');
  try{
    const licId=_wizardData.licenseId||null;
    let proofEndpoint,proofBody;
    if(_wizardData.isTopup){
      const topupId=_wizardData.topupId||_wizardData.orderId;
      proofEndpoint="/payment/topup/submit-proof";
      proofBody={topup_id:topupId,proof_url:proofUrl,reference:t||null};
    }else if(_wizardData.licenseOnly&&licId){
      proofEndpoint=`/members/license/${licId}/proof`;
      proofBody={proof_url:proofUrl,note:t||""};
    }else if(_wizardData.isCoursePayment){
      proofEndpoint=`/campus/course-order/${_wizardData.orderId}/proof`;
      proofBody={proof_url:proofUrl,note:t||""};
    }else{
      if(!_wizardData.orderId){
        try{
          const _chk=await api("GET","/members/orders");
          const _pending=(_chk.orders||[]).find(o=>o.status==="pending"||o.status==="proof_submitted");
          if(_pending)_wizardData.orderId=_pending.id;
        }catch(_e){}
      }
      if(!_wizardData.orderId){
        n&&(n.disabled=!1,n.innerHTML='<i class="fas fa-upload mr-2"></i>Soumettre la preuve');
        _showWizErr("Commande introuvable. Veuillez fermer et rouvrir le wizard.");
        return;
      }
      proofEndpoint=`/members/packages/order/${_wizardData.orderId}/proof`;
      proofBody={proof_url:proofUrl,note:t||""};
    }
    await api("POST",proofEndpoint,proofBody);
    wizardStep7();
  }catch(err){
    // Tout code 409 ou message indiquant statut non modifiable = déjà traité → succès
    const errMsg=err.error||err.message||"";
    const isAlreadyHandled=errMsg.includes("proof_submitted")||errMsg.includes("déjà")||errMsg.includes("activée")||errMsg.includes("validated")||errMsg.includes("cancelled")||errMsg.includes("rejected");
    if(isAlreadyHandled){return void wizardStep7();}
    n&&(n.disabled=!1,n.innerHTML='<i class="fas fa-upload mr-2"></i>Soumettre la preuve');
    _showWizErr(errMsg||"Erreur lors de l'envoi. Réessayez.");
    showToast(errMsg||"Erreur lors de l'envoi","error");
  }
}
function wizardStep7(){_wizardShow(`\n
  ${_wizardProgress(7,7)}\n
  <div class="p-6 space-y-6 text-center">\n
    <div class="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center mx-auto">\n
      <i class="fas fa-check text-green-400 text-4xl"></i>\n
    </div>\n
    <div>\n
      <h3 class="text-2xl font-bold text-white">${_wizardData.isTopup?"Recharge soumise !":"Commande confirmée !"}</h3>\n
      <p class="text-gray-400 mt-2">${_wizardData.isTopup?"Votre recharge sera validée sous 24-48h.":"Votre preuve de paiement a été soumise avec succès."}</p>\n
    </div>\n
    <div class="bg-dark-700 border border-dark-500 rounded-xl p-4 text-sm space-y-2">\n
      <div class="flex justify-between">\n
        <span class="text-gray-400">${_wizardData.isTopup?"Montant":"Package"}</span>\n
        <span class="font-medium text-white">${_wizardData.isTopup?"$"+(_wizardData.totalAmt||0).toLocaleString("en-US",{minimumFractionDigits:2}):_wizardData.pkgName}</span>\n
      </div>\n
      ${_wizardData.addLicense?'<div class="flex justify-between"><span class="text-gray-400">Licence</span><span class="text-rouge-400">Incluse</span></div>':""}\n
      <div class="flex justify-between">\n
        <span class="text-gray-400">Montant</span>\n
        <span class="font-bold text-rouge-400">$${_wizardData.totalAmt?.toLocaleString("en-US",{minimumFractionDigits:2})}</span>\n
      </div>\n
      <div class="flex justify-between">\n
        <span class="text-gray-400">Réf. commande</span>\n
        <span class="font-mono text-xs text-gray-300">${_wizardData.orderId?.substring(0,16)}…</span>\n
      </div>\n
    </div>\n
    <div class="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 text-sm text-gray-400">\n
      <i class="fas fa-clock text-blue-400 mr-2"></i>\n
      Votre commande sera validée par un administrateur sous <strong>24–48h</strong>.\n
      Vous recevrez une notification une fois activée.\n
    </div>\n
    <button onclick="wizardClose(); renderPackages(document.getElementById('page-content'))"\n
      class="w-full py-3 bg-rouge-500 text-dark-900 font-bold rounded-xl hover:bg-rouge-500 transition">\n
      <i class="fas fa-home mr-2"></i>Retour à mes packages\n
    </button>\n
  </div>`),_wizardReset()}function wizardProofOnly(e){_wizardReset(),_wizardData.orderId=e,wizardStep6()}function showProofModal(e){wizardProofOnly(e)}function closeProofModal(){wizardClose()}function closeOrderModal(){wizardClose()}async function renderLicense(e){e.innerHTML='<div class="flex items-center justify-center py-16"><div class="loader"></div></div>';try{const t=await api("GET","/members/license"),n=t.member,a=new Date,s=n?.license_expires_at?new Date(n.license_expires_at):null,r=s?Math.ceil((s-a)/864e5):null,i=t.license_alert_days||7,_renewEarly=t.license_renew_early_days||30,_price=t.license_price||97,l=n?.license_active&&null!==r&&r<=i&&r>0,_canRenew=!n?.license_active||(null!==r&&r<=_renewEarly),d=n?.license_active||null!==s?n?.license_active&&!l?`
      <div class="bg-green-900/10 border border-green-500/30 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <i class="fas fa-check-circle text-green-400 text-lg"></i>
            </div>
            <div>
              <div class="font-bold text-green-300">Licence active</div>
              <div class="text-xs text-green-400/70">Finstrategia — accès complet</div>
            </div>
          </div>
          <span class="bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full font-medium">Active</span>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="bg-dark-700 rounded-xl p-3 text-center">
            <div class="text-lg font-bold text-white">${r} j</div>
            <div class="text-xs text-gray-400">Jours restants</div>
          </div>
          <div class="bg-dark-700 rounded-xl p-3 text-center">
            <div class="text-sm font-bold text-white">${s?s.toLocaleDateString("fr-FR"):"—"}</div>
            <div class="text-xs text-gray-400">Date d'expiration</div>
          </div>
        </div>
        ${_canRenew?`<p class="text-xs text-orange-400 mb-3"><i class="fas fa-info-circle mr-1"></i>Renouvellement anticipé disponible — il reste ${r} jours. Le renouvellement s'ajoutera à la date d'expiration actuelle.</p>`:
          `<p class="text-xs text-gray-500 mb-3">Le bouton de renouvellement sera actif ${_renewEarly} jours avant l'expiration (dans ${r-_renewEarly} jours).</p>`}
        <button onclick="${_canRenew?"orderLicense()":"void(0)"}" id="btn-order-license" class="w-full font-bold py-3 rounded-xl transition border ${_canRenew?"bg-dark-700 text-white hover:bg-dark-600 border-dark-500":"bg-dark-800 text-gray-600 cursor-not-allowed border-dark-700"}" ${_canRenew?"":"disabled"}>
          <i class="fas fa-rotate-right mr-2"></i>${_canRenew?"Renouveler ma licence":"Renouvellement disponible dans "+(r-_renewEarly)+" j"} — $${fmtPrice(_price)}/an
        </button>
      </div>`:l?`
      <div class="bg-orange-900/20 border border-orange-500/40 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <i class="fas fa-triangle-exclamation text-orange-400 text-lg"></i>
            </div>
            <div>
              <div class="font-bold text-orange-300">Licence bientôt expirée</div>
              <div class="text-xs text-orange-400/70">${r} jour(s) restant(s)</div>
            </div>
          </div>
          <span class="bg-orange-500/20 text-orange-400 text-xs px-3 py-1 rounded-full font-medium">Alerte</span>
        </div>
        <div class="bg-orange-900/30 border border-orange-500/20 rounded-xl p-3 mb-4">
          <p class="text-sm text-orange-300"><i class="fas fa-info-circle mr-2"></i>Expire le <strong>${s.toLocaleDateString("fr-FR")}</strong>. Sans renouvellement, vos commissions seront stoppées et votre rang annulé.</p>
        </div>
        <button onclick="orderLicense()" id="btn-order-license" class="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-400 transition">
          <i class="fas fa-rotate-right mr-2"></i>Renouveler maintenant — $${fmtPrice(_price)}/an
        </button>
      </div>`:`
      <div class="bg-red-900/20 border border-red-500/30 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <i class="fas fa-ban text-red-400 text-lg"></i>
            </div>
            <div>
              <div class="font-bold text-red-300">Licence expirée / suspendue</div>
              <div class="text-xs text-red-400/70">${s?"Expirée le "+s.toLocaleDateString("fr-FR"):"Statut inactif"}</div>
            </div>
          </div>
          <span class="bg-red-500/20 text-red-400 text-xs px-3 py-1 rounded-full font-medium">Inactive</span>
        </div>
        <div class="bg-red-900/30 border border-red-500/20 rounded-xl p-3 mb-4">
          <p class="text-sm text-red-300"><i class="fas fa-exclamation-triangle mr-2"></i>Votre licence est expirée. Les commissions sont stoppées. Renouvelez pour réactiver vos droits LEADER.</p>
        </div>
        <button onclick="orderLicense()" id="btn-order-license" class="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-500 transition">
          <i class="fas fa-rotate-right mr-2"></i>Renouveler ma licence — $${fmtPrice(_price)}/an
        </button>
      </div>`:`
      <div class="bg-dark-700 border border-dark-500 rounded-xl p-5">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-id-card text-gray-400 text-xl"></i>
          </div>
          <div>
            <div class="font-bold text-white">Aucune licence active</div>
            <div class="text-gray-400 text-sm">Vous n\'avez pas encore de licence Finstrategia.</div>
          </div>
        </div>
        <div class="bg-rouge-500/10 border border-rouge-500/20 rounded-xl p-4 mb-4">
          <div class="text-3xl font-bold text-rouge-400 mb-1">$${fmtPrice(_price)} <span class="text-sm text-gray-400 font-normal">/an</span></div>
          <p class="text-sm text-gray-400">Accès complet à la plateforme Finstrategia + éligibilité aux commissions LEADER pendant 12 mois.</p>
        </div>
        <div class="space-y-2 text-sm text-gray-400 mb-4">
          <div class="flex items-center gap-2"><i class="fas fa-check text-green-400 w-4"></i>Accès plateforme Finstrategia (12 mois)</div>
          <div class="flex items-center gap-2"><i class="fas fa-check text-green-400 w-4"></i>Éligibilité aux commissions MLM</div>
          <div class="flex items-center gap-2"><i class="fas fa-check text-green-400 w-4"></i>Prime de Leadership mensuelle</div>
          <div class="flex items-center gap-2"><i class="fas fa-check text-green-400 w-4"></i>Bonus d\'Influence et de Rayonnement</div>
        </div>
        <button onclick="orderLicense()" id="btn-order-license" class="w-full bg-rouge-500 text-dark-900 font-bold py-3 rounded-xl hover:bg-rouge-500 transition">
          <i class="fas fa-key mr-2"></i>Activer ma licence Finstrategia — $${fmtPrice(_price)}/an
        </button>
      </div>`;e.innerHTML=`
    <div class="max-w-lg space-y-6">
      <div>
        <h2 class="text-xl font-bold">Ma Licence Finstrategia</h2>
        <p class="text-gray-400 text-sm mt-1">Licence annuelle ($${fmtPrice(_price)}/an) — éligibilité aux commissions LEADER</p>
      </div>
      ${d}
    </div>`}catch(t){e.innerHTML=`<div class="p-4 text-red-400">Erreur : ${t.error||t.message}</div>`}}async function orderLicense(){
  // Initialiser le wizard licenseOnly tout de suite — PAS d'attente réseau
  _wizardReset();
  _wizardData.licenseOnly = true;
  // Prix en cache sinon défaut
  _wizardData.totalAmt = (typeof _licPriceForWizard!=="undefined"&&_licPriceForWizard) ? _licPriceForWizard : 97;
  _wizardData.licensePrice = _wizardData.totalAmt;
  // Ouvrir le modal immédiatement avec un loader
  _wizardShow('<div class="p-10 flex flex-col items-center gap-4"><div class="loader"></div><p class="text-gray-400 text-sm">Chargement…</p></div>');
  const overlay=document.getElementById("wizard-overlay");if(overlay)overlay.style.display="flex";
  // Charger prix + gateways en parallèle
  try{
    const [licCfg,pkgData]=await Promise.all([
      api("GET","/members/license").catch(()=>null),
      (!_gw||!Object.keys(_gw).length)?api("GET","/members/packages").catch(()=>null):Promise.resolve(null)
    ]);
    if(licCfg&&licCfg.license_price){_wizardData.totalAmt=licCfg.license_price;_wizardData.licensePrice=licCfg.license_price;}
    if(pkgData){_gw=_buildGw(pkgData.gateways||{});_adminFeeInfo=pkgData.adminFee||{amount:0,active:false,paid:true};if(pkgData.licensePrice){_licPriceForWizard=pkgData.licensePrice;_wizardData.totalAmt=pkgData.licensePrice;_wizardData.licensePrice=pkgData.licensePrice;}}
  }catch(e){}
  // Ouvrir l'étape de sélection du mode de paiement
  wizardStep4();
}
async function renderProfile(e){
  const t=currentMember;
  const referralUrl=t&&t.license_active?`${window.location.origin}/register/${t.unique_id}`:"";
  const regMethodLabel={M1:"Libre (M1)",M2:"Placement direct (M2)",M3:"Via parrainage (M3)",admin:"Créé par admin"}[t?.registration_method]||"—";
  e.innerHTML=`
  <div class="max-w-2xl space-y-5">

    <!-- En-tête -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-xl font-bold text-white flex items-center gap-2">
        <i class="fas fa-user-circle text-rouge-400"></i> Mon Profil
      </h2>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500">${t?.unique_id||""}</span>
        ${t?.member_status?`<span class="text-xs px-2 py-0.5 rounded-full font-medium ${{AMI:"bg-rouge-500/15 text-rouge-400",Partenaire:"bg-green-500/20 text-green-400",Client:"bg-blue-500/20 text-blue-400",Membre:"bg-gray-500/20 text-gray-400"}[t.member_status]||""}">${t.member_status}</span>`:""}
      </div>
    </div>

    <!-- ═══ BARRE D'ONGLETS ═══ -->
    <div class="flex gap-1 bg-dark-800 border border-dark-600 rounded-2xl p-1.5">
      <button onclick="switchProfileTab('identity')" id="ptab-identity"
        class="profile-tab flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
        <i class="fas fa-id-card text-xs"></i>
        <span class="hidden sm:inline">Identité</span>
        <span class="sm:hidden">ID</span>
      </button>
      <button onclick="switchProfileTab('coords')" id="ptab-coords"
        class="profile-tab flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
        <i class="fas fa-map-marker-alt text-xs"></i>
        <span class="hidden sm:inline">Coordonnées</span>
        <span class="sm:hidden">Adresse</span>
      </button>
      <button onclick="switchProfileTab('payment')" id="ptab-payment"
        class="profile-tab flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
        <i class="fas fa-wallet text-xs"></i>
        <span class="hidden sm:inline">Paiement</span>
        <span class="sm:hidden">Paie.</span>
      </button>
      <button onclick="switchProfileTab('security')" id="ptab-security"
        class="profile-tab flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
        <i class="fas fa-lock text-xs"></i>
        <span class="hidden sm:inline">Sécurité</span>
        <span class="sm:hidden">Sécu.</span>
      </button>
    </div>

    <!-- ═══ ONGLET 1 : IDENTITÉ ═══ -->
    <div id="ptab-panel-identity" class="space-y-5">
      <div class="bg-dark-800 rounded-2xl border border-dark-600 p-6 space-y-4">
        <h3 class="font-semibold text-white flex items-center gap-2 pb-2 border-b border-dark-600">
          <i class="fas fa-id-card text-rouge-400 text-sm"></i> Informations personnelles
        </h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Prénom <span class="text-red-400">*</span></label>
            <input id="p-firstname" class="form-input" value="${t?.first_name||""}" placeholder="Prénom">
          </div>
          <div>
            <label class="form-label">Nom <span class="text-red-400">*</span></label>
            <input id="p-lastname" class="form-input" value="${t?.last_name||""}" placeholder="Nom de famille">
          </div>
        </div>
        <div>
          <label class="form-label">Email <span class="text-xs text-gray-500">(non modifiable)</span></label>
          <input class="form-input opacity-60 cursor-not-allowed" value="${t?.email||""}" disabled>
        </div>
        <!-- Pays de résidence (ici pour pré-remplir l'indicatif avant de saisir le téléphone) -->
        <div>
          <label class="form-label">Pays de résidence <span class="text-red-400">*</span></label>
          <div class="relative">
            <input id="p-country-search" type="text" autocomplete="off"
              class="form-input w-full pr-10"
              placeholder="Rechercher un pays…"
              value="${t?.country||''}"
              oninput="profFilterCountries(this.value)"
              onfocus="profShowCountryList()"
              onblur="setTimeout(()=>profHideCountryList(),200)">
            <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <i class="fas fa-chevron-down text-xs"></i>
            </div>
            <input id="p-country" type="hidden" value="${t?.country||''}">
            <div id="p-country-list"
              class="hidden absolute z-50 w-full mt-1 bg-dark-800 border border-dark-600 rounded-xl shadow-xl overflow-y-auto" style="max-height:220px">
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Téléphone</label>
            <div class="flex gap-2">
              <input id="p-phone-dial" type="text" placeholder="+xx"
                class="w-20 bg-dark-600 border border-dark-600 rounded-xl px-3 py-2 text-rouge-400 text-sm font-mono flex-shrink-0"
                value="${(()=>{if(!t?.phone)return'';const wc=typeof WORLD_COUNTRIES!=='undefined'?WORLD_COUNTRIES:[];const co=wc.find(x=>t.country&&x.n===t.country);return co?co.d:'';})()}">
              <input id="p-phone" class="form-input flex-1" value="${t?.phone||""}" placeholder="6 00 00 00 00">
            </div>
          </div>
          <div>
            <label class="form-label">Date de naissance</label>
            <input id="p-birthdate" type="date" class="form-input" value="${t?.birth_date||""}">
          </div>
        </div>
        <div>
          <label class="form-label">Nationalité</label>
          <input id="p-nationality" class="form-input" value="${t?.nationality||""}" placeholder="Française, Belge…">
        </div>
        <button onclick="saveProfile()" class="bg-rouge-500 text-dark-900 font-bold px-6 py-2.5 rounded-xl hover:bg-rouge-500 transition flex items-center gap-2">
          <i class="fas fa-save"></i> Sauvegarder
        </button>
      </div>

      <!-- Résumé du compte -->
      <div class="bg-dark-800 rounded-2xl border border-dark-600 p-5">
        <h3 class="font-semibold text-white flex items-center gap-2 pb-3 border-b border-dark-600 mb-4">
          <i class="fas fa-circle-info text-rouge-400 text-sm"></i> Résumé du compte
        </h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-dark-700/50 rounded-xl p-3">
            <div class="text-xs text-gray-400 mb-1 uppercase tracking-wider">Identifiant unique</div>
            <div class="text-rouge-400 font-mono font-bold text-lg">${t?.unique_id||"—"}</div>
          </div>
          <div class="bg-dark-700/50 rounded-xl p-3">
            <div class="text-xs text-gray-400 mb-1 uppercase tracking-wider">Rang actuel</div>
            <div class="text-white font-medium">${t?.current_rank&&t.current_rank!=="none"?t.current_rank:"—"}</div>
          </div>
          <div class="bg-dark-700/50 rounded-xl p-3">
            <div class="text-xs text-gray-400 mb-1 uppercase tracking-wider">Méthode d'inscription</div>
            <div class="text-gray-300 text-sm">${regMethodLabel}</div>
          </div>
          <div class="bg-dark-700/50 rounded-xl p-3">
            <div class="text-xs text-gray-400 mb-1 uppercase tracking-wider">Membre depuis</div>
            <div class="text-gray-300 text-sm">${fmtDate(t?.created_at)}</div>
          </div>
          <div class="bg-dark-700/50 rounded-xl p-3">
            <div class="text-xs text-gray-400 mb-1 uppercase tracking-wider">Licence</div>
            <div class="${t?.license_active?"text-green-400":"text-red-400"} text-sm font-medium">
              ${t?.license_active?`<i class="fas fa-check-circle mr-1"></i>Active`:`<i class="fas fa-times-circle mr-1"></i>Inactive`}
              ${t?.license_expires_at?`<span class="text-gray-500 text-xs ml-1">(expire ${fmtDate(t.license_expires_at)})</span>`:""}
            </div>
          </div>
          <div class="bg-dark-700/50 rounded-xl p-3">
            <div class="text-xs text-gray-400 mb-1 uppercase tracking-wider">KYC</div>
            <div class="${{verified:"text-green-400",pending:"text-yellow-400",rejected:"text-red-400",not_submitted:"text-gray-400"}[t?.kyc_status||"not_submitted"]} text-sm">
              ${{verified:"<i class='fas fa-check-circle mr-1'></i>Vérifié",pending:"<i class='fas fa-clock mr-1'></i>En vérification",rejected:"<i class='fas fa-times-circle mr-1'></i>Rejeté",not_submitted:"<i class='fas fa-circle-minus mr-1'></i>Non soumis"}[t?.kyc_status||"not_submitted"]}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ ONGLET 2 : COORDONNÉES ═══ -->
    <div id="ptab-panel-coords" class="hidden space-y-5">
      <div class="bg-dark-800 rounded-2xl border border-dark-600 p-6 space-y-4">
        <h3 class="font-semibold text-white flex items-center gap-2 pb-2 border-b border-dark-600">
          <i class="fas fa-map-marker-alt text-rouge-400 text-sm"></i> Pays et adresse postale
        </h3>

        <!-- Le champ pays est dans l'onglet Infos perso (avant le téléphone) -->

        <div>
          <label class="form-label">Adresse (numéro et rue) <span class="text-red-400">*</span></label>
          <input id="p-address" class="form-input" value="${t?.address||""}" placeholder="12 rue de la Paix">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Code postal <span class="text-red-400">*</span></label>
            <input id="p-postalcode" class="form-input" value="${t?.postal_code||""}" placeholder="75001">
          </div>
          <div>
            <label class="form-label">Ville <span class="text-red-400">*</span></label>
            <input id="p-city" class="form-input" value="${t?.city||""}" placeholder="Paris">
          </div>
        </div>
        <button onclick="saveProfile()" class="bg-rouge-500 text-dark-900 font-bold px-6 py-2.5 rounded-xl hover:bg-rouge-500 transition flex items-center gap-2">
          <i class="fas fa-save"></i> Sauvegarder
        </button>
      </div>

      <!-- Lien de parrainage -->
      <div class="bg-dark-800 rounded-2xl border border-rouge-500/20 p-6">
        <h3 class="font-semibold text-white mb-3 flex items-center gap-2">
          <i class="fas fa-share-nodes text-rouge-400"></i> Mon lien de parrainage
        </h3>
        ${referralUrl?`
        <div class="flex gap-2">
          <input id="profile-referral-input" type="text" value="${referralUrl}" readonly
            class="flex-1 bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-rouge-400 text-xs font-mono focus:outline-none truncate">
          <button onclick="copyProfileReferralLink()" class="bg-rouge-500 text-dark-900 font-bold px-4 py-2.5 rounded-xl hover:bg-rouge-500 transition flex-shrink-0">
            <i class="fas fa-copy"></i>
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          <i class="fas fa-info-circle mr-1"></i>Partagez ce lien pour parrainer de nouveaux membres (méthode M3).
        </p>`:`
        <div class="flex items-start gap-3 bg-orange-900/20 border border-orange-500/30 rounded-xl p-4">
          <i class="fas fa-lock text-orange-400 mt-0.5 flex-shrink-0"></i>
          <div>
            <p class="text-orange-300 font-medium text-sm">Licence requise pour parrainer</p>
            <p class="text-orange-400/70 text-xs mt-1">Activez votre licence Finstrategia pour obtenir votre lien de parrainage.</p>
            <button onclick="showPage('license')" class="mt-2 text-xs bg-rouge-500 text-dark-900 font-bold px-3 py-1.5 rounded-lg hover:bg-rouge-500 transition">
              <i class="fas fa-key mr-1"></i>Activer ma licence
            </button>
          </div>
        </div>`}
      </div>
    </div>

    <!-- ═══ ONGLET 3 : PAIEMENT ═══ -->
    <div id="ptab-panel-payment" class="hidden">
      <div class="bg-dark-800 rounded-2xl border border-dark-600 p-6 space-y-4" id="payout-section">
        <h3 class="font-semibold text-white mb-2 flex items-center gap-2">
          <i class="fas fa-wallet text-rouge-400"></i> Coordonnées de paiement
          <span class="text-xs text-gray-500 font-normal ml-2">Sauvegardées une fois, utilisées à chaque retrait</span>
        </h3>

        <!-- Onglets méthode -->
        <div class="flex gap-2 flex-wrap" id="payout-tab-btns">
          <button onclick="switchPayoutTab('paypal')" id="payout-tab-paypal"
            class="px-4 py-2 rounded-xl text-sm font-medium border transition">
            <i class="fab fa-paypal mr-1.5"></i>PayPal
          </button>
          <button onclick="switchPayoutTab('bank_transfer')" id="payout-tab-bank_transfer"
            class="px-4 py-2 rounded-xl text-sm font-medium border transition">
            <i class="fas fa-university mr-1.5"></i>Virement bancaire
          </button>
          <button onclick="switchPayoutTab('crypto')" id="payout-tab-crypto"
            class="px-4 py-2 rounded-xl text-sm font-medium border transition">
            <i class="fas fa-coins mr-1.5"></i>Cryptomonnaie
          </button>
        </div>

        <!-- PayPal -->
        <div id="payout-panel-paypal" class="space-y-3 hidden">
          <div>
            <label class="form-label">Adresse email PayPal <span class="text-red-400">*</span></label>
            <input id="pi-paypal-email" type="email" placeholder="votre@paypal.com"
              class="form-input w-full">
          </div>
          <p class="text-xs text-gray-500"><i class="fas fa-info-circle mr-1"></i>
            L'email doit correspondre exactement à votre compte PayPal vérifié.</p>
        </div>

        <!-- Virement bancaire -->
        <div id="payout-panel-bank_transfer" class="space-y-3 hidden">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="md:col-span-2">
              <label class="form-label">Titulaire du compte <span class="text-red-400">*</span></label>
              <input id="pi-bank-holder" type="text" placeholder="Prénom NOM (exactement comme sur le RIB)"
                class="form-input w-full">
            </div>
            <div>
              <label class="form-label">IBAN <span class="text-red-400">*</span></label>
              <input id="pi-bank-iban" type="text" placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                class="form-input w-full" style="letter-spacing:0.05em">
            </div>
            <div>
              <label class="form-label">BIC / SWIFT <span class="text-red-400">*</span></label>
              <input id="pi-bank-bic" type="text" placeholder="BNPAFRPP" class="form-input w-full">
            </div>
            <div>
              <label class="form-label">Nom de la banque</label>
              <input id="pi-bank-name" type="text" placeholder="BNP Paribas" class="form-input w-full">
            </div>
            <div>
              <label class="form-label">Numéro de compte</label>
              <input id="pi-bank-account" type="text" placeholder="Numéro de compte (optionnel)" class="form-input w-full">
            </div>
            <div class="md:col-span-2">
              <label class="form-label">Adresse de la banque</label>
              <input id="pi-bank-address" type="text" placeholder="Adresse complète de la banque (optionnel)" class="form-input w-full">
            </div>
          </div>
        </div>

        <!-- Crypto -->
        <div id="payout-panel-crypto" class="space-y-3 hidden">
          <div>
            <label class="form-label">Réseau blockchain <span class="text-red-400">*</span></label>
            <select id="pi-crypto-network" class="form-input w-full">
              <option value="">Sélectionner un réseau…</option>
              <option value="BTC">Bitcoin (BTC)</option>
              <option value="ETH">Ethereum (ETH - ERC20)</option>
              <option value="USDT_TRC20">USDT - TRC20 (Tron)</option>
              <option value="USDT_ERC20">USDT - ERC20 (Ethereum)</option>
              <option value="BNB">BNB Smart Chain (BEP20)</option>
              <option value="SOL">Solana (SOL)</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>
          <div>
            <label class="form-label">Adresse du portefeuille <span class="text-red-400">*</span></label>
            <input id="pi-crypto-address" type="text" placeholder="0x... ou bc1..."
              class="form-input w-full font-mono text-xs" style="letter-spacing:0.03em">
          </div>
          <div class="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-3">
            <p class="text-xs text-yellow-400">
              <i class="fas fa-triangle-exclamation mr-1"></i>
              Vérifiez soigneusement l'adresse et le réseau. Toute erreur peut entraîner une perte définitive des fonds.
            </p>
          </div>
        </div>

        <button onclick="savePayoutInfo(this)" id="payout-save-btn"
          class="bg-dark-700 hover:bg-dark-600 text-white border border-dark-500 font-bold px-6 py-2.5 rounded-xl transition text-sm">
          <i class="fas fa-save mr-2"></i>Sauvegarder mes coordonnées
        </button>
      </div>
    </div>

    <!-- ═══ ONGLET 4 : SÉCURITÉ ═══ -->
    <div id="ptab-panel-security" class="hidden space-y-5">
      <!-- PIN de retrait -->
      <div class="bg-dark-800 rounded-2xl border border-dark-600 p-6 space-y-4">
        <h3 class="font-semibold text-white flex items-center gap-2 pb-2 border-b border-dark-600">
          <i class="fas fa-key text-rouge-400 text-sm"></i> PIN de retrait
        </h3>
        <p class="text-sm text-gray-400">Le PIN (4 chiffres) est requis pour valider chaque retrait.</p>
        <div>
          <label class="form-label">Mot de passe actuel</label>
          <input id="pin-pwd" type="password" class="form-input" placeholder="Votre mot de passe">
        </div>
        <div>
          <label class="form-label">Nouveau PIN (4 chiffres)</label>
          <input id="pin-new" type="password" maxlength="4" placeholder="••••" class="form-input" style="letter-spacing:0.3em;font-size:1.2rem;">
        </div>
        <button onclick="savePin()" class="bg-dark-700 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-dark-600 transition flex items-center gap-2">
          <i class="fas fa-key"></i> Modifier le PIN
        </button>
      </div>

      <!-- Info sécurité -->
      <div class="bg-dark-800/50 border border-dark-600/50 rounded-2xl p-5">
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-shield-alt text-blue-400 text-sm"></i>
          </div>
          <div>
            <p class="text-sm font-medium text-white mb-1">Conseils de sécurité</p>
            <ul class="text-xs text-gray-400 space-y-1">
              <li><i class="fas fa-check text-green-400 mr-1.5"></i>N'utilisez jamais le même PIN qu'ailleurs</li>
              <li><i class="fas fa-check text-green-400 mr-1.5"></i>Ne partagez jamais votre PIN ou mot de passe</li>
              <li><i class="fas fa-check text-green-400 mr-1.5"></i>En cas de doute, changez votre PIN immédiatement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

  </div>`;loadPayoutInfo();
  // Activer l'onglet identité par défaut
  setTimeout(()=>switchProfileTab('identity'),10);
}
function switchProfileTab(tab){
  const tabs=['identity','coords','payment','security'];
  tabs.forEach(function(t){
    const btn=document.getElementById('ptab-'+t);
    const panel=document.getElementById('ptab-panel-'+t);
    if(btn&&panel){
      if(t===tab){
        btn.classList.add('bg-dark-700','text-white');
        btn.classList.remove('text-gray-400');
        panel.classList.remove('hidden');
      } else {
        btn.classList.remove('bg-dark-700','text-white');
        btn.classList.add('text-gray-400');
        panel.classList.add('hidden');
      }
    }
  });
  if(tab==='payment'){setTimeout(function(){loadPayoutInfo&&loadPayoutInfo();},50);}
}
var _profCountryDropdownHovered = false;
function profShowCountryList(){
  const list=document.getElementById('p-country-list');
  if(!list)return;
  const q=document.getElementById('p-country-search')?document.getElementById('p-country-search').value:'';
  profFilterCountries(q);
  list.classList.remove('hidden');
}
function profHideCountryList(){
  if(_profCountryDropdownHovered)return;
  const list=document.getElementById('p-country-list');
  if(list)list.classList.add('hidden');
}
function profFilterCountries(q){
  var list=document.getElementById("p-country-list");
  if(!list)return;
  // Position fixed : évite le clipping par overflow des conteneurs parents
  var inputEl=document.getElementById("p-country-search");
  if(inputEl){
    var rect=inputEl.getBoundingClientRect();
    list.style.position="fixed";
    list.style.top=(rect.bottom+2)+"px";
    list.style.left=rect.left+"px";
    list.style.width=rect.width+"px";
    list.style.maxHeight="220px";
    list.style.zIndex="9999";
  }
  var src=(typeof REG_COUNTRIES!=="undefined"?REG_COUNTRIES:[]).slice().sort(function(a,b){return a.name.localeCompare(b.name,'fr');});
  var filtered=q?src.filter(function(c){return c.name.toLowerCase().indexOf(q.toLowerCase())!==-1;}):src;
  if(filtered.length===0){
    list.innerHTML="<div class=\"px-4 py-3 text-sm text-gray-500\">Aucun pays trouvé</div>";
    list.classList.remove("hidden");
    return;
  }
  var html="";
  filtered.forEach(function(c){
    var safe=c.name.replace(/&/g,"&amp;").replace(/"/g,"&quot;");
    var codeEsc=(c.code||"").replace(/"/g,"&quot;");
    html+="<div class=\"prof-country-item flex items-center gap-3 px-4 py-2.5 hover:bg-dark-700 cursor-pointer text-sm\" data-country-name=\""+safe+"\" data-country-code=\""+codeEsc+"\">";
    html+="<span class=\"text-lg\">"+c.flag+"</span>";
    html+="<span class=\"text-white\">"+c.name+"</span>";
    html+="</div>";
  });
  list.innerHTML=html;
  list.classList.remove("hidden");
  // Anti-blur : empêche le onblur de fermer le dropdown pendant le scroll
  list.onmouseenter=function(){ _profCountryDropdownHovered=true; };
  list.onmouseleave=function(){ _profCountryDropdownHovered=false; };
  list.addEventListener('touchstart',function(){ _profCountryDropdownHovered=true; },{passive:true});
  list.addEventListener('touchend',function(){ setTimeout(function(){ _profCountryDropdownHovered=false; },300); });
  list.querySelectorAll(".prof-country-item").forEach(function(el){
    el.addEventListener("mousedown",function(ev){
      ev.preventDefault();
      profSelectCountry(el.getAttribute("data-country-name"),el.getAttribute("data-country-code"));
    });
  });
}
// Mapping code pays → indicatif téléphonique
const DIAL_CODES={AF:'+93',AL:'+355',DZ:'+213',AD:'+376',AO:'+244',AG:'+1-268',AR:'+54',AM:'+374',AU:'+61',AT:'+43',AZ:'+994',BS:'+1-242',BH:'+973',BD:'+880',BB:'+1-246',BY:'+375',BE:'+32',BZ:'+501',BJ:'+229',BT:'+975',BO:'+591',BA:'+387',BW:'+267',BR:'+55',BN:'+673',BG:'+359',BF:'+226',BI:'+257',CV:'+238',KH:'+855',CM:'+237',CA:'+1',CF:'+236',TD:'+235',CL:'+56',CN:'+86',CO:'+57',KM:'+269',CG:'+242',CD:'+243',CR:'+506',HR:'+385',CU:'+53',CY:'+357',CZ:'+420',DK:'+45',DJ:'+253',DM:'+1-767',DO:'+1-809',EC:'+593',EG:'+20',SV:'+503',GQ:'+240',ER:'+291',EE:'+372',SZ:'+268',ET:'+251',FJ:'+679',FI:'+358',FR:'+33',GA:'+241',GM:'+220',GE:'+995',DE:'+49',GH:'+233',GR:'+30',GD:'+1-473',GT:'+502',GN:'+224',GW:'+245',GY:'+592',HT:'+509',HN:'+504',HU:'+36',IS:'+354',IN:'+91',ID:'+62',IR:'+98',IQ:'+964',IE:'+353',IL:'+972',IT:'+39',JM:'+1-876',JP:'+81',JO:'+962',KZ:'+7',KE:'+254',KI:'+686',KW:'+965',KG:'+996',LA:'+856',LV:'+371',LB:'+961',LS:'+266',LR:'+231',LY:'+218',LI:'+423',LT:'+370',LU:'+352',MG:'+261',MW:'+265',MY:'+60',MV:'+960',ML:'+223',MT:'+356',MH:'+692',MR:'+222',MU:'+230',MX:'+52',FM:'+691',MD:'+373',MC:'+377',MN:'+976',ME:'+382',MA:'+212',MZ:'+258',MM:'+95',NA:'+264',NR:'+674',NP:'+977',NL:'+31',NZ:'+64',NI:'+505',NE:'+227',NG:'+234',NO:'+47',OM:'+968',PK:'+92',PW:'+680',PA:'+507',PG:'+675',PY:'+595',PE:'+51',PH:'+63',PL:'+48',PT:'+351',QA:'+974',RO:'+40',RU:'+7',RW:'+250',KN:'+1-869',LC:'+1-758',VC:'+1-784',WS:'+685',SM:'+378',ST:'+239',SA:'+966',SN:'+221',RS:'+381',SC:'+248',SL:'+232',SG:'+65',SK:'+421',SI:'+386',SB:'+677',SO:'+252',ZA:'+27',SS:'+211',ES:'+34',LK:'+94',SD:'+249',SR:'+597',SE:'+46',CH:'+41',SY:'+963',TW:'+886',TJ:'+992',TZ:'+255',TH:'+66',TL:'+670',TG:'+228',TO:'+676',TT:'+1-868',TN:'+216',TR:'+90',TM:'+993',TV:'+688',UG:'+256',UA:'+380',AE:'+971',GB:'+44',US:'+1',UY:'+598',UZ:'+998',VU:'+678',VE:'+58',VN:'+84',YE:'+967',ZM:'+260',ZW:'+263',RE:'+262',MQ:'+596',GP:'+590',YT:'+262',GF:'+594',PF:'+689',NC:'+687',MF:'+590',BL:'+590',PM:'+508',WF:'+681'};
function profSelectCountry(name,code){
  _profCountryDropdownHovered=false;
  const inp=document.getElementById('p-country-search');
  const hid=document.getElementById('p-country');
  if(inp)inp.value=name;
  if(hid)hid.value=name;
  // Pré-remplir l'indicatif téléphonique (champ éditable par le membre)
  if(code){
    const dialEl=document.getElementById('p-phone-dial');
    if(dialEl){
      const dial=DIAL_CODES[code]||'';
      if(dial)dialEl.value=dial;
    }
  }
  profHideCountryList();
}
async function saveProfile(){const t=currentMember;
// Téléphone : combiner indicatif + numéro si champ dial présent
const _phoneDialVal=(document.getElementById("p-phone-dial")?.value||"").trim();
const _phoneNumVal=(document.getElementById("p-phone")?.value||"").trim();
const _phoneFull=_phoneNumVal?(_phoneDialVal&&!_phoneNumVal.startsWith("+")&&!_phoneNumVal.startsWith(_phoneDialVal)?(_phoneDialVal+" "+_phoneNumVal):_phoneNumVal):null;
const payload={first_name:document.getElementById("p-firstname")?.value.trim()||t?.first_name,last_name:document.getElementById("p-lastname")?.value.trim()||t?.last_name,phone:_phoneFull||null,country:document.getElementById("p-country")?.value.trim()||null,address:document.getElementById("p-address")?.value.trim()||null,city:document.getElementById("p-city")?.value.trim()||null,postal_code:document.getElementById("p-postalcode")?.value.trim()||null,nationality:document.getElementById("p-nationality")?.value.trim()||null,birth_date:document.getElementById("p-birthdate")?.value||null,paypal_email:t?.paypal_email||null};if(!payload.first_name||!payload.last_name){showToast("Prénom et nom sont obligatoires","error");return;}const btn=document.querySelector('[onclick="saveProfile()"]');if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Sauvegarde…';}try{await api("PUT","/members/me",payload);const res=await api("GET","/members/me");currentMember=res.member;updateSidebar();showToast("Profil mis à jour avec succès !");}catch(err){showToast(err.error||"Erreur lors de la sauvegarde","error");}finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-save mr-2"></i>Sauvegarder le profil';}}}async function savePin(){const pwd=document.getElementById("pin-pwd")?.value;const newPin=document.getElementById("pin-new")?.value;if(!pwd||!newPin){showToast("Remplissez tous les champs PIN","error");return;}if(!/^\d{4}$/.test(newPin)){showToast("Le PIN doit être exactement 4 chiffres","error");return;}const btn=document.querySelector('[onclick="savePin()"]');if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Modification…';}try{await api("PUT","/members/me/pin",{current_password:pwd,new_pin:newPin});showToast("PIN modifié avec succès !");document.getElementById("pin-pwd").value="";document.getElementById("pin-new").value="";}catch(err){showToast(err.error||"Erreur lors de la modification du PIN","error");}finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-key mr-2"></i>Modifier le PIN';}}}function copyProfileReferralLink(){const e=document.getElementById("profile-referral-input");e&&navigator.clipboard.writeText(e.value).then(()=>{showToast("Lien de parrainage copié !")}).catch(()=>{e.select();document.execCommand('copy');showToast("Lien copié !")});}


// ── COORDONNÉES DE PAIEMENT (Profil) ──────────────────────────────────────────

// Onglet actif dans le panel paiement
let _payoutActiveTab = 'paypal';

function switchPayoutTab(tab) {
  _payoutActiveTab = tab;
  ['paypal','bank_transfer','crypto'].forEach(t => {
    const panel = document.getElementById('payout-panel-' + t);
    const btn   = document.getElementById('payout-tab-' + t);
    if (!panel || !btn) return;
    if (t === tab) {
      panel.classList.remove('hidden');
      btn.classList.add('bg-rouge-500/15','text-rouge-400','border-rouge-500/30');
      btn.classList.remove('bg-dark-700','text-gray-400','border-dark-600');
    } else {
      panel.classList.add('hidden');
      btn.classList.remove('bg-rouge-500/15','text-rouge-400','border-rouge-500/30');
      btn.classList.add('bg-dark-700','text-gray-400','border-dark-600');
    }
  });
}

async function loadPayoutInfo() {
  try {
    const res = await api('GET', '/members/payout-info');
    const p = res.payout || {};

    // Activer l'onglet selon la méthode sauvegardée
    switchPayoutTab(p.payout_method || 'paypal');

    // Remplir PayPal
    const el = (id) => document.getElementById(id);
    if (el('pi-paypal-email')) el('pi-paypal-email').value = p.payout_paypal_email || '';

    // Remplir virement bancaire
    if (el('pi-bank-holder'))  el('pi-bank-holder').value  = p.payout_bank_holder  || '';
    if (el('pi-bank-iban'))    el('pi-bank-iban').value    = p.payout_bank_iban    || '';
    if (el('pi-bank-bic'))     el('pi-bank-bic').value     = p.payout_bank_bic     || '';
    if (el('pi-bank-name'))    el('pi-bank-name').value    = p.payout_bank_name    || '';
    if (el('pi-bank-account')) el('pi-bank-account').value = p.payout_bank_account || '';
    if (el('pi-bank-address')) el('pi-bank-address').value = p.payout_bank_address || '';
    if (el('pi-bank-city'))    el('pi-bank-city').value    = p.payout_bank_city    || '';
    if (el('pi-bank-country')) el('pi-bank-country').value = p.payout_bank_country || '';
    if (el('pi-bank-swift'))   el('pi-bank-swift').value   = p.payout_bank_swift   || '';

    // Remplir crypto
    if (el('pi-crypto-currency')) el('pi-crypto-currency').value = p.payout_crypto_currency || '';
    if (el('pi-crypto-network'))  el('pi-crypto-network').value  = p.payout_crypto_network  || '';
    if (el('pi-crypto-address'))  el('pi-crypto-address').value  = p.payout_crypto_address  || '';

    // Sauvegarder en cache pour pré-remplir le formulaire retrait
    window._memberPayoutInfo = p;
  } catch(e) {
    console.warn('loadPayoutInfo:', e.error || e.message);
  }
}

async function savePayoutInfo(btn) {
  const tab = _payoutActiveTab;
  const el = (id) => document.getElementById(id);
  const payload = { payout_method: tab };

  if (tab === 'paypal') {
    payload.payout_paypal_email = el('pi-paypal-email')?.value?.trim() || '';
  } else if (tab === 'bank_transfer') {
    payload.payout_bank_holder  = el('pi-bank-holder')?.value?.trim()  || '';
    payload.payout_bank_iban    = el('pi-bank-iban')?.value?.trim().replace(/\s/g,'') || '';
    payload.payout_bank_bic     = el('pi-bank-bic')?.value?.trim().toUpperCase() || '';
    payload.payout_bank_name    = el('pi-bank-name')?.value?.trim()    || '';
    payload.payout_bank_account = el('pi-bank-account')?.value?.trim() || '';
    payload.payout_bank_address = el('pi-bank-address')?.value?.trim() || '';
    payload.payout_bank_city    = el('pi-bank-city')?.value?.trim()    || '';
    payload.payout_bank_country = el('pi-bank-country')?.value?.trim().toUpperCase() || '';
    payload.payout_bank_swift   = el('pi-bank-swift')?.value?.trim().toUpperCase() || '';
  } else if (tab === 'crypto') {
    payload.payout_crypto_currency = el('pi-crypto-currency')?.value?.trim().toUpperCase() || '';
    payload.payout_crypto_network  = el('pi-crypto-network')?.value?.trim().toUpperCase()  || '';
    payload.payout_crypto_address  = el('pi-crypto-address')?.value?.trim()  || '';
  }

  const origText = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sauvegarde...'; }
  try {
    await api('PUT', '/members/payout-info', payload);
    window._memberPayoutInfo = { ...window._memberPayoutInfo, ...payload };
    showToast('Coordonnées de paiement sauvegardées !', 'success');
  } catch(e) {
    showToast(e.error || 'Erreur lors de la sauvegarde', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = origText; }
  }
}
// ── CoinPayments : démarrer le paiement crypto ──────────────────────────────
// Appelée depuis le bouton "Payer en Crypto" dans wizardStep5
// Flow : 
//   1. Envoyer POST /members/coinpayments/create-transaction → txn_id + checkout_url
//   2. Ouvrir la fenêtre CoinPayments (checkout_url)
//   3. Polling GET /members/coinpayments/check-transaction?txn_id=xxx
//   4. Quand status >= 100 → POST /members/coinpayments/confirm-payment → activation
function _cpCoinChanged(sel) {
  const warning = document.getElementById('cp-erc20-warning');
  if (!warning) return;
  if (sel.value === 'USDT.ERC20') {
    warning.classList.remove('hidden');
  } else {
    warning.classList.add('hidden');
  }
}

async function _cpStartPayment() {
  const btn = document.getElementById('cp-pay-btn');
  const errEl = document.getElementById('cp-error');
  const coin = document.getElementById('cp-coin-select')?.value || 'USDT.TRC20';
  const orderId = _wizardData.orderId || null;
  const licId = _wizardData.licenseId || null;
  const amount = _wizardData.totalAmt || 0;
  if (errEl) errEl.classList.add('hidden');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Création de la transaction…'; }
  try {
    const body = { amount, coin, currency: 'USD', description: 'LEADER — Paiement' };
    if (orderId) body.order_id = orderId;
    if (licId)   body.license_id = licId;
    const res = await api('POST', '/members/coinpayments/create-transaction', body);
    if (!res || !res.txn_id) throw new Error(res.error || 'Réponse invalide de CoinPayments');
    // Stocker le txn_id pour le polling
    window._cpTxnId = res.txn_id;
    window._cpCoin  = coin;
    // QR code : adresse directe si disponible, sinon checkout_url
    const qrTarget = res.address || res.checkout_url || '';
    const qrUrl = qrTarget ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrTarget)}` : '';
    const n = amount;
    const coinAmt = res.amount ? Number(res.amount).toFixed(8) : '—';
    const coinLabel = { 'USDT.TRC20':'USDT (TRC-20)', 'USDT.ERC20':'USDT (ERC-20)', 'BTC':'Bitcoin (BTC)', 'ETH':'Ethereum (ETH)' }[coin] || coin;
    _wizardShow(`
      ${_wizardProgress(5, 7)}
      <div class="p-6 space-y-5">
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/20 mb-4">
            <i class="fas fa-coins text-orange-400 text-3xl"></i>
          </div>
          <h3 class="text-xl font-bold text-white mb-1">Paiement Crypto en attente</h3>
          <p class="text-sm text-gray-400">Scannez le QR code ou copiez l'adresse pour finaliser votre paiement.</p>
        </div>

        <!-- Détails de la transaction -->
        <div class="bg-dark-700 rounded-xl p-4 text-sm space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-400">Montant USD</span>
            <span class="text-rouge-400 font-bold">$${n.toLocaleString('en-US',{minimumFractionDigits:2})}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400">Devise</span>
            <span class="text-orange-400 font-semibold">${coinLabel}</span>
          </div>
          ${res.amount ? `<div class="flex justify-between items-center">
            <span class="text-gray-400">Montant crypto</span>
            <span class="text-white font-mono text-xs">${coinAmt} ${coin.split('.')[0]}</span>
          </div>` : ''}
          <div class="flex justify-between items-center">
            <span class="text-gray-400">Transaction ID</span>
            <span class="text-xs text-gray-500 font-mono truncate max-w-[180px]">${res.txn_id}</span>
          </div>
          ${res.confirms_needed ? `<div class="flex justify-between items-center">
            <span class="text-gray-400">Confirmations requises</span>
            <span class="text-gray-300">${res.confirms_needed}</span>
          </div>` : ''}
        </div>

        <!-- QR code + adresse directe -->
        ${qrTarget ? `
        <div class="bg-dark-700 rounded-xl p-4">
          <div class="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">
            <i class="fas fa-qrcode mr-1"></i> Adresse de paiement ${coinLabel}
          </div>
          <div class="flex flex-col sm:flex-row items-center gap-4">
            ${qrUrl ? `<div class="flex-shrink-0">
              <div class="w-[160px] h-[160px] bg-white rounded-xl p-2 flex items-center justify-center">
                <img src="${qrUrl}" alt="QR Code paiement" class="w-full h-full object-contain rounded"
                  onerror="this.parentElement.innerHTML='<div class=\'text-gray-500 text-xs text-center\'>QR non disponible</div>'">
              </div>
            </div>` : ''}
            <div class="flex-1 min-w-0 space-y-2">
              <div class="bg-dark-800 rounded-lg p-2 font-mono text-xs text-gray-300 break-all select-all border border-dark-500">
                ${qrTarget}
              </div>
              <button onclick="navigator.clipboard.writeText('${qrTarget.replace(/'/g,"\\'")}').then(()=>showToast('Adresse copiée !'))"
                class="w-full py-2 bg-dark-600 hover:bg-dark-500 text-gray-300 text-xs rounded-lg transition flex items-center justify-center gap-2">
                <i class="fas fa-copy"></i> Copier l'adresse
              </button>
              ${res.dest_tag ? `<div class="text-xs text-amber-400 bg-amber-900/20 rounded-lg p-2 border border-amber-500/30">
                <i class="fas fa-exclamation-triangle mr-1"></i>
                <strong>Tag / Mémo requis :</strong> <span class="font-mono">${res.dest_tag}</span>
              </div>` : ''}
            </div>
          </div>
          ${res.checkout_url ? `<a href="${res.checkout_url}" target="_blank" rel="noopener"
            class="mt-3 flex items-center justify-center gap-2 text-xs text-orange-400 hover:text-orange-300 transition">
            <i class="fas fa-external-link-alt"></i> Ouvrir la page CoinPayments
          </a>` : ''}
        </div>
        ` : `
        <div class="text-center">
          <a href="${res.checkout_url}" target="_blank" rel="noopener"
            class="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-400 text-dark-900 font-bold rounded-xl transition">
            <i class="fas fa-external-link-alt"></i> Ouvrir la page de paiement CoinPayments
          </a>
        </div>
        `}

        <!-- Statut du paiement -->
        <div id="cp-status-box" class="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 text-center">
          <div class="flex items-center justify-center gap-2 text-blue-300 text-sm">
            <div class="loader w-4 h-4"></div>
            <span id="cp-status-text">Vérification automatique en cours…</span>
          </div>
        </div>

        <div class="flex gap-3">
          <button id="cp-verify-btn" onclick="_cpManualCheck(this)" class="flex-1 py-3 bg-orange-500 hover:bg-orange-400 text-dark-900 font-bold rounded-xl transition text-sm">
            <i class="fas fa-sync mr-2"></i>Vérifier maintenant
          </button>
          <button onclick="wizardStep4()" class="py-3 px-4 bg-dark-700 text-gray-300 rounded-xl text-sm hover:bg-dark-600 transition">
            Retour
          </button>
        </div>
        <p class="text-xs text-gray-600 text-center">
          <i class="fas fa-info-circle mr-1"></i>
          Vérification automatique toutes les 15 secondes. Après paiement, cliquez "Vérifier maintenant".
        </p>
      </div>
    `);
    // Démarrer le polling automatique toutes les 15 secondes
    window._cpPollInterval = setInterval(_cpCheckStatus, 15000);
  } catch (err) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-coins text-sm"></i> Payer en Crypto'; }
    if (errEl) { errEl.textContent = err.error || err.message || 'Erreur CoinPayments'; errEl.classList.remove('hidden'); }
  }
}

// Vérifier le statut de la transaction CoinPayments (polling)
// Compteur d'échecs consécutifs — on n'affiche un message d'erreur qu'après 3 échecs
window._cpPollErrors = 0;
async function _cpCheckStatus() {
  const txnId = window._cpTxnId;
  if (!txnId) return;
  const statusEl = document.getElementById('cp-status-text');
  const statusBox = document.getElementById('cp-status-box');
  try {
    const res = await api('GET', `/members/coinpayments/check-transaction?txn_id=${encodeURIComponent(txnId)}`);
    window._cpPollErrors = 0; // reset compteur d'erreurs
    if (res.is_complete) {
      // Paiement confirmé — arrêter le polling et activer
      clearInterval(window._cpPollInterval);
      if (statusEl) statusEl.textContent = 'Paiement confirmé ! Activation en cours…';
      if (statusBox) { statusBox.className = 'bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center'; }
      // Confirmer côté backend
      const body = { txn_id: txnId };
      if (_wizardData.orderId)   body.order_id   = _wizardData.orderId;
      if (_wizardData.licenseId) body.license_id = _wizardData.licenseId;
      try {
        await api('POST', '/members/coinpayments/confirm-payment', body);
      } catch(_) {}
      wizardStep7(); // Étape succès
    } else if (res.is_cancelled) {
      clearInterval(window._cpPollInterval);
      if (statusEl) statusEl.textContent = 'Transaction annulée ou expirée.';
      if (statusBox) { statusBox.className = 'bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-center'; }
    } else {
      // Statut normal en attente (y compris temporary=true = TX pas encore connue de CP)
      const labels = {0:'En attente de paiement…',1:'Paiement partiel reçu…',2:'En file de traitement…',3:'Paiement en cours de validation…'};
      if (statusEl) statusEl.textContent = res.status_text && res.temporary ? res.status_text : (labels[res.status] || `Statut : ${res.status_text || res.status}`);
    }
  } catch(err) {
    // N'afficher le message d'erreur qu'après 3 échecs réseau consécutifs
    // (évite le message alarmiste lors d'une coupure réseau passagère)
    window._cpPollErrors = (window._cpPollErrors || 0) + 1;
    if (window._cpPollErrors >= 3) {
      if (statusEl) statusEl.textContent = 'Vérification impossible — cliquez "Vérifier maintenant" pour réessayer.';
    }
    // Sinon on garde le dernier texte affiché (pas de message parasite)
  }
}

// Vérification manuelle (bouton) — reset le compteur d'erreurs + feedback visuel
async function _cpManualCheck(btn) {
  window._cpPollErrors = 0;
  const statusEl = document.getElementById('cp-status-text');
  const origHtml = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Vérification…'; }
  if (statusEl) statusEl.textContent = 'Vérification en cours…';
  await _cpCheckStatus();
  if (btn) { btn.disabled = false; btn.innerHTML = origHtml; }
}

// ============================================================
// MODULE SUPPORT MEMBRE
// ============================================================

// État pagination tickets
let _supportPage = 1, _supportPerPage = 10, _supportStatus = '';
let _supportCurrentTicketId = null;
let _supportFaqCategory = '';
let _supportPollingTimer = null;

// ── Polling auto : rafraîchit le ticket toutes les 4s si waiting_member/in_progress
function _supportStartPolling(ticketId) {
  _supportStopPolling();
  _supportPollingTimer = setInterval(async () => {
    if (document.visibilityState !== 'visible') return;
    if (_supportCurrentTicketId !== ticketId) { _supportStopPolling(); return; }
    try {
      const r = await api('GET', `/support/tickets/${ticketId}`);
      const newStatus = r.ticket?.status;
      const thread = document.getElementById('support-thread');
      if (!thread) { _supportStopPolling(); return; }
      // Re-render silencieux du thread uniquement
      const newHtml = (r.messages || []).map(m => supportRenderMessage(m)).join('');
      if (thread.innerHTML !== newHtml) {
        thread.innerHTML = newHtml;
        thread.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // Mise à jour badge + bloc résolu si nouveau msg admin
        loadSupportUnread();
        // Si statut changé → re-render complet
        if (['resolved','closed'].includes(newStatus)) {
          _supportStopPolling();
          await supportOpenTicket(ticketId);
        } else {
          // Mise à jour du bloc résolu/continuer
          _supportRefreshResolutionBlock(r.ticket, r.messages || []);
        }
      }
    } catch(_) {}
  }, 4000);
}

function _supportStopPolling() {
  if (_supportPollingTimer) { clearInterval(_supportPollingTimer); _supportPollingTimer = null; }
}

// Met à jour le bloc résolu/continuer sans re-render complet
function _supportRefreshResolutionBlock(ticket, messages) {
  const block = document.getElementById('support-resolution-block');
  if (!block) return;
  const lastAdminMsg = [...messages].reverse().find(m => m.sender_type === 'admin' && !m.is_internal);
  if (lastAdminMsg && !['resolved','closed'].includes(ticket.status)) {
    block.classList.remove('hidden');
  }
}

// ── Badge sidebar support (non lus) ──────────────────────────
async function loadSupportUnread() {
  try {
    const r = await api('GET', '/support/unread');
    const count = r.unread_count || 0;
    const badge = document.getElementById('support-badge');
    if (!badge) return;
    if (count > 0) { badge.textContent = count > 9 ? '9+' : count; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  } catch(_) {}
}

// ── Labels / couleurs status tickets ─────────────────────────
function supportStatusBadge(s) {
  const map = {
    open:            ['bg-blue-500/15 text-blue-400',    'fas fa-circle-dot',   'Ouvert'],
    in_progress:     ['bg-purple-500/15 text-purple-400','fas fa-spinner',      'En cours'],
    waiting_member:  ['bg-orange-500/15 text-orange-400','fas fa-hourglass',    'En attente'],
    resolved:        ['bg-green-500/15 text-green-400',  'fas fa-check-circle', 'Résolu'],
    closed:          ['bg-gray-500/15 text-gray-400',    'fas fa-lock',         'Fermé'],
  };
  const [cls, ico, lbl] = map[s] || ['bg-gray-500/15 text-gray-400','fas fa-circle','Inconnu'];
  return `<span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cls}"><i class="${ico} text-[10px]"></i>${lbl}</span>`;
}

function supportPriorityBadge(p) {
  const map = { high: 'text-red-400', normal: 'text-gray-400', low: 'text-green-400' };
  const lbl = { high: 'Haute', normal: 'Normale', low: 'Basse' };
  return `<span class="text-xs font-medium ${map[p]||'text-gray-400'}"><i class="fas fa-flag text-[10px] mr-1"></i>${lbl[p]||p}</span>`;
}

function supportCategoryFr(c) {
  return { wallet:'Portefeuille', commission:'Commissions', package:'Package', account:'Compte', tree:'Arbre binaire', license:'Licence', other:'Autre' }[c] || c;
}

// ── Rendre une étoile de rating ────────────────────────────
function renderStars(rating) {
  return [1,2,3,4,5].map(i => `<i class="fa-star ${i<=rating?'fas text-rouge-400':'far text-gray-600'}"></i>`).join('');
}

// ============================================================
// PAGE PRINCIPALE SUPPORT
// ============================================================
async function renderSupport(el) {
  el.innerHTML = `
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-xl font-bold text-white">Support Client</h2>
        <p class="text-gray-400 text-sm mt-0.5">Posez vos questions, suivez vos tickets</p>
      </div>
      <button onclick="supportShowCreate()" class="flex items-center gap-2 bg-rouge-500 hover:bg-rouge-500 text-dark-900 font-bold px-4 py-2.5 rounded-xl transition text-sm">
        <i class="fas fa-plus"></i> Nouveau ticket
      </button>
    </div>

    <!-- Onglets -->
    <div class="flex gap-1 bg-dark-800 border border-dark-600 rounded-xl p-1 w-fit">
      <button id="stab-tickets" onclick="supportTab('tickets')" class="px-4 py-2 rounded-lg text-sm font-medium bg-dark-700 text-white transition">Mes tickets</button>
      <button id="stab-faq"     onclick="supportTab('faq')"     class="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition">FAQ</button>
    </div>

    <!-- Contenu onglets -->
    <div id="support-tickets-tab">
      <!-- Filtres statut -->
      <div class="flex flex-wrap gap-2 mb-4">
        ${['','open','in_progress','waiting_member','resolved','closed'].map(s => {
          const labels = {'':'Tous','open':'Ouverts','in_progress':'En cours','waiting_member':'En attente','resolved':'Résolus','closed':'Fermés'};
          const active = s === _supportStatus;
          return `<button onclick="supportFilterStatus('${s}')" class="px-3 py-1.5 rounded-lg text-xs font-medium transition ${active?'bg-rouge-500 text-dark-900':'bg-dark-800 border border-dark-600 text-gray-400 hover:text-white'}">${labels[s]}</button>`;
        }).join('')}
      </div>
      <div id="support-tickets-list">
        <div class="flex items-center justify-center py-12"><div class="loader"></div></div>
      </div>
      <div id="support-tickets-pagination" class="mt-4"></div>
    </div>

    <div id="support-faq-tab" class="hidden"></div>
  </div>`;

  await supportLoadTickets();
}

function supportTab(tab) {
  document.getElementById('stab-tickets').className = `px-4 py-2 rounded-lg text-sm font-medium transition ${tab==='tickets'?'bg-dark-700 text-white':'text-gray-400 hover:text-white'}`;
  document.getElementById('stab-faq').className     = `px-4 py-2 rounded-lg text-sm font-medium transition ${tab==='faq'?'bg-dark-700 text-white':'text-gray-400 hover:text-white'}`;
  document.getElementById('support-tickets-tab').classList.toggle('hidden', tab !== 'tickets');
  document.getElementById('support-faq-tab').classList.toggle('hidden', tab !== 'faq');
  if (tab === 'faq') supportLoadFaq();
}

function supportFilterStatus(s) {
  _supportStatus = s; _supportPage = 1;
  // Recharger la page support pour rerender les filtres
  showPage('support');
}

// ── Liste tickets ─────────────────────────────────────────────
async function supportLoadTickets() {
  const listEl = document.getElementById('support-tickets-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="flex items-center justify-center py-12"><div class="loader"></div></div>';
  try {
    const params = `?page=${_supportPage}&per_page=${_supportPerPage}${_supportStatus ? '&status='+_supportStatus : ''}`;
    const r = await api('GET', '/support/tickets' + params);
    const tickets = r.tickets || [];
    const total = r.total || 0;

    if (tickets.length === 0) {
      listEl.innerHTML = `
        <div class="bg-dark-800 rounded-2xl border border-dark-600 p-12 text-center">
          <div class="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-headset text-blue-400 text-2xl"></i>
          </div>
          <p class="text-gray-400 text-sm">Aucun ticket${_supportStatus ? ' avec ce statut' : ''}.</p>
          <button onclick="supportShowCreate()" class="mt-4 text-rouge-400 text-sm hover:underline">
            <i class="fas fa-plus mr-1"></i>Créer votre premier ticket
          </button>
        </div>`;
      document.getElementById('support-tickets-pagination').innerHTML = '';
      return;
    }

    listEl.innerHTML = `
      <div class="bg-dark-800 rounded-2xl border border-dark-600 overflow-hidden">
        <div class="divide-y divide-dark-600">
          ${tickets.map(t => `
            <div class="px-5 py-4 hover:bg-dark-700/40 cursor-pointer transition group" onclick="supportOpenTicket('${t.id}')">
              <div class="flex items-start gap-4">
                <div class="w-9 h-9 rounded-xl ${t.unread_member>0?'bg-blue-500/20':'bg-dark-700'} flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i class="fas fa-ticket ${t.unread_member>0?'text-blue-400':'text-gray-500'} text-sm"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs text-gray-500 font-mono">#${t.ticket_number}</span>
                    ${supportStatusBadge(t.status)}
                    ${t.unread_member > 0 ? `<span class="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-medium"><i class="fas fa-circle text-[8px] mr-1 animate-pulse"></i>${t.unread_member} nouveau${t.unread_member>1?'x':''}</span>` : ''}
                  </div>
                  <p class="text-sm font-medium text-white mt-1 truncate">${t.subject}</p>
                  <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span><i class="fas fa-tag mr-1"></i>${supportCategoryFr(t.category)}</span>
                    <span>${supportPriorityBadge(t.priority)}</span>
                    <span>${t.message_count||0} message${(t.message_count||0)>1?'s':''}</span>
                    <span class="ml-auto">${fmtDatetime(t.last_reply_at||t.created_at)}</span>
                  </div>
                </div>
                <i class="fas fa-chevron-right text-gray-600 group-hover:text-gray-400 transition text-xs mt-1 flex-shrink-0"></i>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;

    renderPagination('support-tickets-pagination', total, _supportPage, _supportPerPage,
      '(function(p){_supportPage=p;supportLoadTickets()})',
      '(function(n,p){_supportPerPage=n;_supportPage=p;supportLoadTickets()})');
  } catch(err) {
    listEl.innerHTML = `<div class="text-red-400 text-sm">Erreur : ${err.error||err.message||'Impossible de charger les tickets'}</div>`;
  }
}

// ── Créer un ticket ───────────────────────────────────────────
function supportShowCreate() {
  showModal(`
    <div class="p-6 space-y-5">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold text-white"><i class="fas fa-plus-circle text-rouge-400 mr-2"></i>Nouveau ticket</h3>
        <button onclick="closeModal()" class="text-gray-500 hover:text-white text-xl leading-none">&times;</button>
      </div>

      <div>
        <label class="block text-xs text-gray-400 mb-1.5">Catégorie <span class="text-red-400">*</span></label>
        <select id="stk-category" class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white focus:ring-0 focus:outline-none">
          <option value="">-- Choisissez une catégorie --</option>
          <option value="wallet">Portefeuille / Retraits</option>
          <option value="commission">Commissions</option>
          <option value="package">Package / Activation</option>
          <option value="account">Mon compte</option>
          <option value="tree">Arbre binaire</option>
          <option value="license">Licence Finstrategia</option>
          <option value="other">Autre</option>
        </select>
      </div>

      <div>
        <label class="block text-xs text-gray-400 mb-1.5">Sujet <span class="text-red-400">*</span></label>
        <input id="stk-subject" type="text" placeholder="Décrivez votre problème en quelques mots"
          class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-0 focus:outline-none">
      </div>

      <div>
        <label class="block text-xs text-gray-400 mb-1.5">Message <span class="text-red-400">*</span></label>
        <textarea id="stk-message" rows="5" placeholder="Décrivez votre problème en détail..."
          class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-0 focus:outline-none resize-none"></textarea>
      </div>

      <div id="stk-error" class="hidden text-red-400 text-sm bg-red-900/20 rounded-xl p-3"></div>

      <div class="flex gap-3 pt-2">
        <button onclick="closeModal()" class="flex-1 py-3 bg-dark-700 text-gray-300 rounded-xl text-sm hover:bg-dark-600 transition">Annuler</button>
        <button onclick="supportCreateTicket()" id="stk-btn" class="flex-1 py-3 bg-rouge-500 hover:bg-rouge-500 text-dark-900 font-bold rounded-xl text-sm transition">
          <i class="fas fa-paper-plane mr-2"></i>Envoyer
        </button>
      </div>

      <p class="text-xs text-gray-500 text-center">
        <i class="fas fa-info-circle mr-1"></i>
        Le contexte de votre compte (solde, rang) est automatiquement joint au ticket pour accélérer le traitement.
      </p>
    </div>
  `);
}

async function supportCreateTicket() {
  const category = document.getElementById('stk-category').value;
  const subject  = document.getElementById('stk-subject').value.trim();
  const message  = document.getElementById('stk-message').value.trim();
  const errEl    = document.getElementById('stk-error');
  const btn      = document.getElementById('stk-btn');
  errEl.classList.add('hidden');

  if (!category) { errEl.textContent = 'Veuillez choisir une catégorie.'; errEl.classList.remove('hidden'); return; }
  if (!subject)  { errEl.textContent = 'Le sujet est obligatoire.'; errEl.classList.remove('hidden'); return; }
  if (!message)  { errEl.textContent = 'Le message est obligatoire.'; errEl.classList.remove('hidden'); return; }

  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Envoi…';
  try {
    const r = await api('POST', '/support/tickets', { category, subject, message });
    closeModal();
    showToast('Ticket créé avec succès — #' + (r.ticket?.ticket_number || r.ticket_number || ''));
    _supportPage = 1;
    loadSupportUnread();
    await showPage('support');
    // Ouvrir directement le ticket créé
    setTimeout(() => supportOpenTicket(r.ticket?.id || r.id), 400);
  } catch(err) {
    errEl.textContent = err.error || 'Erreur lors de la création du ticket.';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Envoyer';
  }
}

// ── Ouvrir un ticket (thread) ─────────────────────────────────
async function supportOpenTicket(ticketId) {
  _supportCurrentTicketId = ticketId;
  _supportStopPolling();
  const pc = document.getElementById('page-content');
  pc.innerHTML = '<div class="flex items-center justify-center py-16"><div class="loader"></div></div>';

  try {
    const r = await api('GET', `/support/tickets/${ticketId}`);
    const ticket = r.ticket;
    const messages = r.messages || [];

    // Badge mis à jour
    loadSupportUnread();

    const canReply = !['resolved','closed'].includes(ticket.status);
    const isResolved = ['resolved','closed'].includes(ticket.status);

    // Détecter si le dernier message visible est de l'admin → afficher bloc résolu/continuer
    const lastAdminMsg = [...messages].reverse().find(m => m.sender_type === 'admin' && !m.is_internal);
    const showResolutionBlock = lastAdminMsg && !isResolved;

    pc.innerHTML = `
    <div class="space-y-5 max-w-4xl">
      <!-- En-tête -->
      <div class="flex items-center gap-3 flex-wrap">
        <button onclick="_supportStopPolling();showPage('support')" class="text-gray-400 hover:text-white transition">
          <i class="fas fa-arrow-left"></i>
        </button>
        <div class="flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs text-gray-500 font-mono">#${ticket.ticket_number}</span>
            ${supportStatusBadge(ticket.status)}
            ${supportPriorityBadge(ticket.priority)}
            <span class="text-xs text-gray-500">${supportCategoryFr(ticket.category)}</span>
          </div>
          <h2 class="text-xl font-bold text-white mt-1">${ticket.subject}</h2>
          <p class="text-xs text-gray-500 mt-0.5">Ouvert le ${fmtDatetime(ticket.created_at)}</p>
        </div>
        ${isResolved ? `
          <button onclick="supportShowRate('${ticket.id}', ${ticket.rating||0})" 
            class="flex items-center gap-2 px-4 py-2 bg-rouge-500/10 border border-rouge-500/25 text-rouge-400 rounded-xl text-sm hover:bg-rouge-500/15 transition">
            <i class="fas fa-star"></i> ${ticket.rating ? 'Votre note : ' + renderStars(ticket.rating) : 'Évaluer'}
          </button>` : ''}
      </div>

      <!-- Thread messages -->
      <div class="space-y-4" id="support-thread">
        ${messages.map(m => supportRenderMessage(m)).join('')}
      </div>

      <!-- BLOC RÉSOLUTION PREMIUM — visible après réponse admin, avant que le client réponde -->
      <div id="support-resolution-block" class="${showResolutionBlock ? '' : 'hidden'}">
        <div class="bg-gradient-to-br from-dark-800 to-dark-700 border border-emerald-500/25 rounded-2xl p-5 space-y-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <i class="fas fa-headset text-emerald-400 text-sm"></i>
            </div>
            <div>
              <div class="text-sm font-bold text-white">Le Support LEADER vous a répondu</div>
              <div class="text-xs text-gray-400">Votre problème a-t-il été résolu ?</div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button onclick="supportResolveTicket('${ticket.id}')"
              class="flex items-center justify-center gap-2 py-3 bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition border border-emerald-500/40">
              <i class="fas fa-check-circle"></i> Oui, c'est résolu !
            </button>
            <button onclick="document.getElementById('support-reply-text')?.focus();document.getElementById('support-resolution-block')?.classList.add('hidden')"
              class="flex items-center justify-center gap-2 py-3 bg-dark-600 hover:bg-dark-500 text-gray-300 hover:text-white font-semibold rounded-xl text-sm transition border border-dark-500">
              <i class="fas fa-comment-dots"></i> J'ai une autre question
            </button>
          </div>
          <p class="text-xs text-gray-500 text-center">Votre retour nous aide à améliorer la qualité de notre support</p>
        </div>
      </div>

      <!-- Zone de réponse -->
      ${canReply ? `
      <div class="bg-dark-800 border border-dark-600 rounded-2xl p-5 space-y-4">
        <h4 class="text-sm font-semibold text-white"><i class="fas fa-reply text-rouge-400 mr-2"></i>Votre réponse</h4>
        <textarea id="support-reply-text" rows="4" placeholder="Tapez votre message…"
          class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-0 focus:outline-none resize-none text-sm"></textarea>
        <div id="support-reply-error" class="hidden text-red-400 text-sm"></div>
        <div class="flex gap-3">
          <button onclick="supportSendReply('${ticket.id}')" id="support-reply-btn"
            class="flex items-center gap-2 px-5 py-2.5 bg-rouge-500 hover:bg-rouge-500 text-dark-900 font-bold rounded-xl text-sm transition">
            <i class="fas fa-paper-plane"></i> Envoyer
          </button>
          ${ticket.status !== 'open' ? `
          <button onclick="supportReopenTicket('${ticket.id}')"
            class="px-4 py-2.5 bg-dark-700 text-gray-300 hover:text-white rounded-xl text-sm transition border border-dark-500">
            <i class="fas fa-rotate-left mr-1"></i>Réouvrir
          </button>` : ''}
        </div>
      </div>` : `
      <div class="bg-dark-700/40 border border-dark-600 rounded-2xl p-5 text-center text-gray-500 text-sm">
        <i class="fas fa-lock mr-2"></i>
        Ce ticket est ${ticket.status === 'resolved' ? 'résolu' : 'fermé'} — répondez pour le réouvrir si nécessaire.
        <button onclick="supportReopenTicket('${ticket.id}')" class="ml-2 text-rouge-400 hover:underline">Réouvrir →</button>
      </div>`}

      <!-- Indicateur de polling (discret) -->
      ${['waiting_member','in_progress'].includes(ticket.status) ? `
      <div class="text-center">
        <span class="text-xs text-gray-600 inline-flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-pulse inline-block"></span>
          Surveillance active — actualisation automatique toutes les 4s
        </span>
      </div>` : ''}
    </div>`;

    // Scroller vers le bas du thread
    setTimeout(() => {
      const thread = document.getElementById('support-thread');
      if (thread) thread.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    // Démarrer le polling si ticket en cours
    if (['waiting_member','in_progress','open'].includes(ticket.status)) {
      _supportStartPolling(ticketId);
    }

  } catch(err) {
    pc.innerHTML = `<div class="text-red-400 p-6">Erreur : ${err.error||err.message||'Impossible de charger le ticket'}</div>`;
  }
}

// ── Résoudre le ticket → PATCH resolved → ouvre modale notation ──
async function supportResolveTicket(ticketId) {
  try {
    await api('PATCH', `/support/tickets/${ticketId}/resolve`);
    _supportStopPolling();
    // Ouvrir directement la modale de notation
    supportShowRate(ticketId, 0);
    // Re-render le ticket en fond
    await supportOpenTicket(ticketId);
  } catch(err) {
    showToast(err.error || 'Impossible de résoudre le ticket', 'error');
  }
}

function supportRenderMessage(m) {
  const isAdmin = m.sender_type === 'admin';
  const bubbleClass = isAdmin
    ? 'bg-dark-700 border border-dark-600 mr-8'
    : 'bg-rouge-500/10 border border-rouge-500/20 ml-8';
  const avatar = isAdmin
    ? `<div class="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0"><i class="fas fa-headset text-red-400 text-xs"></i></div>`
    : `<div class="w-8 h-8 rounded-full bg-rouge-500/15 flex items-center justify-center flex-shrink-0"><i class="fas fa-user text-rouge-400 text-xs"></i></div>`;
  const name = isAdmin ? (m.sender_name || 'Support LEADER') : 'Vous';
  const time = fmtDatetime(m.created_at);

  return `
    <div class="flex ${isAdmin ? 'flex-row' : 'flex-row-reverse'} gap-3">
      ${avatar}
      <div class="${bubbleClass} rounded-2xl p-4 flex-1">
        <div class="flex items-center justify-between gap-2 mb-2">
          <span class="text-xs font-semibold ${isAdmin?'text-red-300':'text-rouge-400'}">${name}</span>
          <span class="text-xs text-gray-500">${time}</span>
        </div>
        <p class="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">${m.content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
      </div>
    </div>`;
}

async function supportSendReply(ticketId) {
  const textarea = document.getElementById('support-reply-text');
  const errEl    = document.getElementById('support-reply-error');
  const btn      = document.getElementById('support-reply-btn');
  const content  = textarea?.value.trim();
  if (!content) { errEl.textContent = 'Le message ne peut pas être vide.'; errEl.classList.remove('hidden'); return; }
  errEl.classList.add('hidden');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Envoi…';
  try {
    await api('POST', `/support/tickets/${ticketId}/messages`, { content });
    await supportOpenTicket(ticketId);
  } catch(err) {
    errEl.textContent = err.error || 'Erreur lors de l\'envoi.';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer';
  }
}

async function supportReopenTicket(ticketId) {
  try {
    await api('POST', `/support/tickets/${ticketId}/messages`, {
      content: 'Bonjour, je souhaite réouvrir ce ticket car mon problème n\'est pas résolu.'
    });
    await supportOpenTicket(ticketId);
  } catch(err) {
    showToast(err.error || 'Impossible de réouvrir le ticket', 'error');
  }
}

// ── Évaluation ticket ──────────────────────────────────────────
function supportShowRate(ticketId, currentRating) {
  let selected = currentRating || 0;
  showModal(`
    <div class="p-6 space-y-5">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold text-white"><i class="fas fa-star text-rouge-400 mr-2"></i>Évaluer votre expérience</h3>
        <button onclick="closeModal()" class="text-gray-500 hover:text-white text-xl leading-none">&times;</button>
      </div>

      <!-- Intro premium -->
      <div class="bg-dark-700/60 border border-dark-500 rounded-xl p-3 text-xs text-gray-400 leading-relaxed">
        <i class="fas fa-shield-halved text-rouge-400 mr-1.5"></i>
        Chez LEADER, l'excellence du support est une priorité absolue.
        Votre retour est transmis à notre équipe qualité et nous permet de nous améliorer en permanence.
      </div>

      <!-- Étoiles -->
      <div>
        <div class="text-sm text-gray-300 text-center mb-3 font-medium">Comment évaluez-vous notre réponse ?</div>
        <div class="flex items-center justify-center gap-2 py-2" id="rate-stars">
          ${[1,2,3,4,5].map(i => `
            <button onclick="supportSelectStar(${i})" id="rstar-${i}"
              class="text-5xl transition-all hover:scale-125 ${i<=selected?'text-rouge-400':'text-gray-600'}">
              <i class="${i<=selected?'fas':'far'} fa-star"></i>
            </button>`).join('')}
        </div>
        <div id="rate-label" class="text-center text-xs mt-2 font-semibold ${selected===0?'text-gray-500':selected<=2?'text-red-400':selected<=3?'text-orange-400':'text-emerald-400'}">
          ${['','Pas satisfait','Peut mieux faire','Correct','Bien','Excellent !'][selected]||'Cliquez pour noter'}
        </div>
      </div>

      <!-- Note basse → alerte escalade -->
      <div id="rate-escalade-notice" class="${selected<=2&&selected>0?'':'hidden'} bg-orange-900/20 border border-orange-500/30 rounded-xl p-3 text-xs text-orange-300">
        <i class="fas fa-user-headset mr-1.5"></i>
        <strong>Note insuffisante détectée</strong> — Un conseiller humain sera automatiquement notifié et reprendra contact avec vous sous 24h.
      </div>

      <div>
        <label class="block text-xs text-gray-400 mb-1.5">Votre commentaire <span class="text-gray-600">(optionnel)</span></label>
        <textarea id="rate-comment" rows="3" placeholder="Décrivez votre expérience avec le support…"
          class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-0 focus:outline-none resize-none text-sm"></textarea>
      </div>
      <div id="rate-error" class="hidden text-red-400 text-sm bg-red-900/20 rounded-xl p-3"></div>
      <div class="flex gap-3">
        <button onclick="closeModal()" class="flex-1 py-3 bg-dark-700 text-gray-300 rounded-xl text-sm hover:bg-dark-600 transition">Annuler</button>
        <button onclick="supportSubmitRate('${ticketId}')" class="flex-1 py-3 bg-rouge-500 hover:bg-rouge-500 text-dark-900 font-bold rounded-xl text-sm transition">
          <i class="fas fa-check mr-2"></i>Envoyer mon avis
        </button>
      </div>
    </div>`);
  window._supportRating = selected;
}

function supportSelectStar(n) {
  window._supportRating = n;
  [1,2,3,4,5].forEach(i => {
    const btn = document.getElementById('rstar-' + i);
    if (btn) btn.innerHTML = `<i class="${i<=n?'fas':'far'} fa-star"></i>`;
    if (btn) btn.className = `text-5xl transition-all hover:scale-125 ${i<=n?'text-rouge-400':'text-gray-600'}`;
  });
  // Mettre à jour le label et la notice d'escalade
  const lbl = document.getElementById('rate-label');
  if (lbl) {
    lbl.textContent = ['','Pas satisfait','Peut mieux faire','Correct','Bien','Excellent !'][n] || '';
    lbl.className = `text-center text-xs mt-2 font-semibold ${n<=2?'text-red-400':n<=3?'text-orange-400':'text-emerald-400'}`;
  }
  const notice = document.getElementById('rate-escalade-notice');
  if (notice) notice.classList.toggle('hidden', n > 2);
}

async function supportSubmitRate(ticketId) {
  const rating  = window._supportRating || 0;
  const comment = document.getElementById('rate-comment')?.value.trim() || '';
  const errEl   = document.getElementById('rate-error');
  if (!rating) { errEl.textContent = 'Veuillez sélectionner une note.'; errEl.classList.remove('hidden'); return; }
  try {
    const result = await api('POST', `/support/tickets/${ticketId}/rate`, { rating, comment });
    closeModal();

    if (rating <= 2) {
      // Mauvaise note → message premium d'escalade
      showToast('Merci pour votre retour — un conseiller humain va reprendre votre dossier.', 'success');
    } else {
      showToast(rating >= 4 ? '⭐ Merci pour votre excellent retour !' : 'Merci pour votre évaluation !');
    }
    await supportOpenTicket(ticketId);
  } catch(err) {
    errEl.textContent = err.error || 'Erreur lors de l\'envoi.';
    errEl.classList.remove('hidden');
  }
}

// ── FAQ ────────────────────────────────────────────────────────
async function supportLoadFaq() {
  const faqEl = document.getElementById('support-faq-tab');
  if (!faqEl) return;
  faqEl.innerHTML = '<div class="flex items-center justify-center py-12"><div class="loader"></div></div>';

  try {
    const url = `/support/faq${_supportFaqCategory ? '?category=' + _supportFaqCategory : ''}`;
    const r = await api('GET', url);
    const faq = r.faq || [];
    const cats = ['', 'wallet', 'commission', 'package', 'account', 'tree', 'license', 'other'];
    const catLabels = { '':'Toutes', wallet:'Portefeuille', commission:'Commissions', package:'Package', account:'Compte', tree:'Arbre', license:'Licence', other:'Autre' };

    faqEl.innerHTML = `
      <div class="space-y-5">
        <!-- Filtre catégorie FAQ -->
        <div class="flex flex-wrap gap-2">
          ${cats.map(c => `
            <button onclick="_supportFaqCategory='${c}';supportLoadFaq()" 
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition ${c===_supportFaqCategory?'bg-rouge-500 text-dark-900':'bg-dark-800 border border-dark-600 text-gray-400 hover:text-white'}">
              ${catLabels[c]||c}
            </button>`).join('')}
        </div>

        ${faq.length === 0 ? `
          <div class="bg-dark-800 rounded-2xl border border-dark-600 p-10 text-center text-gray-500 text-sm">
            Aucune question trouvée pour cette catégorie.
          </div>` : `
        <div class="space-y-3">
          ${faq.map(item => `
            <div class="bg-dark-800 border border-dark-600 rounded-2xl overflow-hidden">
              <button class="w-full px-5 py-4 text-left flex items-center justify-between gap-3 hover:bg-dark-700/40 transition"
                      onclick="supportToggleFaq('faq-${item.id}')">
                <div class="flex items-center gap-3">
                  <span class="text-xs px-2 py-0.5 rounded-full bg-dark-700 text-gray-400">${catLabels[item.category]||item.category}</span>
                  <span class="text-sm font-medium text-white">${item.question}</span>
                </div>
                <i id="faq-ico-${item.id}" class="fas fa-chevron-down text-gray-500 text-xs flex-shrink-0 transition-transform"></i>
              </button>
              <div id="faq-${item.id}" class="hidden px-5 pb-4">
                <div class="pt-3 border-t border-dark-600 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  ${item.answer.replace(/</g,'&lt;').replace(/>/g,'&gt;')}
                </div>
                <div class="mt-2 text-xs text-gray-600"><i class="fas fa-eye mr-1"></i>${item.view_count||0} vue${(item.view_count||0)>1?'s':''}</div>
              </div>
            </div>
          `).join('')}
        </div>`}

        <!-- CTA si pas trouvé -->
        <div class="bg-dark-800 border border-dark-600 rounded-2xl p-5 flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-rouge-500/10 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-question-circle text-rouge-400"></i>
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium text-white">Vous n'avez pas trouvé votre réponse ?</p>
            <p class="text-xs text-gray-400 mt-0.5">Créez un ticket et notre équipe vous répondra dans les plus brefs délais.</p>
          </div>
          <button onclick="supportShowCreate()" class="px-4 py-2 bg-rouge-500 hover:bg-rouge-500 text-dark-900 font-bold rounded-xl text-sm transition flex-shrink-0">
            <i class="fas fa-plus mr-1"></i>Nouveau ticket
          </button>
        </div>
      </div>`;
  } catch(err) {
    faqEl.innerHTML = `<div class="text-red-400 text-sm">Erreur : ${err.error||'Impossible de charger la FAQ'}</div>`;
  }
}

function supportToggleFaq(id) {
  const el  = document.getElementById(id);
  const ico = document.getElementById('faq-ico-' + id.replace('faq-',''));
  if (!el) return;
  const open = !el.classList.contains('hidden');
  el.classList.toggle('hidden');
  if (ico) ico.style.transform = open ? '' : 'rotate(180deg)';
  if (!open) {
    // Incrémenter vues
    const faqId = id.replace('faq-','');
    api('POST', `/support/faq/${faqId}/view`).catch(()=>{});
  }
}

// ============================================================
// KYC — Interface membre complète
// ============================================================

// État KYC global pour la session
let _kycState = {
  config: null, levels: null, status: null, application: null,
  uploadQueue: [], // { file, docTypeId, docTypeName, dataB64, preview }
  currentLevel: 0, loadedAt: 0
};

// Labels niveaux KYC
function kycLevelLabel(lvl) {
  return ['Non vérifié','Identité vérifiée','Renforcé','Premium'][lvl] || 'Niveau '+lvl;
}
function kycLevelColor(lvl) {
  return ['text-gray-400','text-blue-400','text-purple-400','text-rouge-400'][lvl] || 'text-gray-400';
}
function kycLevelBg(lvl) {
  return ['bg-gray-500/10 border-gray-500/30','bg-blue-500/10 border-blue-500/30',
          'bg-purple-500/10 border-purple-500/30','bg-rouge-500/10 border-rouge-500/25'][lvl]
         || 'bg-gray-500/10 border-gray-500/30';
}
function kycStatusLabel(st) {
  return {draft:'Brouillon',submitted:'Soumis',under_review:'En révision',
          approved:'Approuvé',rejected:'Rejeté',expired:'Expiré'}[st] || st;
}
function kycStatusClass(st) {
  return {draft:'text-gray-400',submitted:'text-blue-400',under_review:'text-yellow-400',
          approved:'text-green-400',rejected:'text-red-400',expired:'text-orange-400'}[st] || 'text-gray-400';
}
function kycDocStatusIcon(st) {
  return {pending:'<i class="fas fa-clock text-yellow-400"></i>',
          accepted:'<i class="fas fa-check-circle text-green-400"></i>',
          rejected:'<i class="fas fa-times-circle text-red-400"></i>'}[st]
         || '<i class="fas fa-question-circle text-gray-400"></i>';
}

async function renderKYC(el) {
  el.innerHTML = '<div class="flex items-center justify-center py-16"><div class="loader"></div></div>';
  try {
    const [cfgRes, statusRes] = await Promise.all([
      api('GET','/kyc/config-public').catch(()=>null),
      api('GET','/kyc/status').catch(()=>null)
    ]);
    _kycState.config   = cfgRes;
    _kycState.levels   = cfgRes?.levels || [];
    _kycState.status   = statusRes;
    _kycState.loadedAt = Date.now();

    const kycEnabled = cfgRes?.config?.kyc_enabled ?? true;
    const memberLevel = statusRes?.current_level ?? 0;
    const app = statusRes?.active_application;
    const lastRejected = statusRes?.last_rejected_application;

    if (!kycEnabled) {
      el.innerHTML = `<div class="text-center py-20 text-gray-500">
        <i class="fas fa-shield-halved text-4xl mb-4 block opacity-30"></i>
        <p>Le système de vérification d'identité n'est pas actif pour le moment.</p>
      </div>`;
      return;
    }

    el.innerHTML = `
    <div class="space-y-6">

      <!-- En-tête -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-2">
            <i class="fas fa-shield-halved text-purple-400"></i>
            Vérification d'identité (KYC)
          </h1>
          <p class="text-gray-400 mt-1 text-sm">Complétez votre vérification pour accéder à toutes les fonctionnalités</p>
        </div>
        <button onclick="renderKYC(document.getElementById('page-content'))"
                class="btn-secondary text-xs px-3 py-1.5">
          <i class="fas fa-refresh mr-1"></i> Actualiser
        </button>
      </div>

      <!-- Barre de progression des niveaux -->
      ${_kycBuildLevelProgress(memberLevel, cfgRes?.levels || [])}

      <!-- Bandeau rejet précédent (informatif, ne bloque plus la progression) -->
      ${(!app && lastRejected) ? `
      <div class="bg-orange-900/20 border border-orange-500/30 rounded-2xl p-4 flex items-start gap-3">
        <i class="fas fa-exclamation-triangle text-orange-400 mt-0.5 flex-shrink-0"></i>
        <div>
          <div class="text-sm font-semibold text-orange-300">Vérification niveau ${lastRejected.target_level} refusée</div>
          <div class="text-xs text-gray-400 mt-0.5">Votre dernier dossier a été refusé. Vous pouvez en soumettre un nouveau ci-dessous.</div>
        </div>
      </div>` : ''}

      <!-- Carte statut dossier en cours -->
      ${app ? _kycBuildApplicationCard(app, memberLevel) : ''}

      <!-- Section actions -->
      ${_kycBuildActionSection(memberLevel, app, cfgRes?.levels || [], statusRes)}

    </div>`;

  } catch(e) {
    el.innerHTML = `<div class="text-center py-16 text-red-400">
      <i class="fas fa-triangle-exclamation text-3xl mb-3 block"></i>
      <p>${e.error || 'Erreur lors du chargement KYC'}</p>
    </div>`;
  }
}

function _kycBuildLevelProgress(current, levels) {
  if (!levels.length) return '';
  const maxLevel = levels.length - 1;
  const pct = Math.round((current / maxLevel) * 100);

  const steps = levels.map((lv, i) => {
    const done  = i <= current;
    const active = i === current;
    const bg    = done ? (active ? 'bg-purple-500' : 'bg-green-500') : 'bg-dark-600';
    const border = active ? 'border-purple-400' : (done ? 'border-green-500' : 'border-dark-500');
    const txtCol = done ? 'text-white' : 'text-gray-500';
    const icon   = done && !active ? 'fas fa-check' : (active ? 'fas fa-user-check' : 'fas fa-lock');
    return `
      <div class="flex flex-col items-center flex-1">
        <div class="w-9 h-9 rounded-full border-2 ${border} ${bg} flex items-center justify-center mb-1.5 relative z-10">
          <i class="${icon} text-xs ${active ? 'text-white' : (done ? 'text-white' : 'text-gray-500')}"></i>
        </div>
        <div class="text-[10px] font-semibold ${txtCol} text-center leading-tight">
          ${lv.name || 'Niveau '+i}
        </div>
      </div>`;
  });

  return `
  <div class="bg-dark-800 border border-dark-600 rounded-2xl p-5">
    <div class="flex items-center gap-2 mb-4">
      <span class="text-sm font-semibold text-white">Votre niveau actuel :</span>
      <span class="text-sm font-bold ${kycLevelColor(current)}">${kycLevelLabel(current)}</span>
    </div>
    <div class="relative">
      <!-- Ligne de connexion -->
      <div class="absolute top-4 left-0 right-0 h-0.5 bg-dark-600 z-0"></div>
      <div class="absolute top-4 left-0 h-0.5 bg-green-500 z-0 transition-all" style="width:${pct}%"></div>
      <div class="flex relative z-10">${steps.join('')}</div>
    </div>
    ${current < maxLevel ? `
    <p class="text-xs text-gray-400 mt-4 text-center">
      <i class="fas fa-info-circle mr-1 text-purple-400"></i>
      Passez au niveau <strong class="text-white">${kycLevelLabel(current+1)}</strong> pour débloquer davantage de fonctionnalités
    </p>` : `
    <p class="text-xs text-green-400 mt-4 text-center font-semibold">
      <i class="fas fa-star mr-1"></i> Niveau maximum atteint — vous avez complété toute la vérification !
    </p>`}
  </div>`;
}

function _kycBuildApplicationCard(app, memberLevel) {
  if (!app) return '';
  const stLabel     = kycStatusLabel(app.status);
  const stClass     = kycStatusClass(app.status);
  const docs        = app.documents || [];
  // Déclarer isDraft AVANT docRows pour pouvoir l'utiliser dans le map
  const isDraft     = app.status === 'draft';
  const hasRejected = docs.some(d => d.status === 'rejected');
  const canResubmit = app.status === 'rejected';

  const docRows  = docs.map(d => `
    <div class="flex items-center justify-between py-2 border-b border-dark-600/50 last:border-0">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        ${kycDocStatusIcon(d.status)}
        <span class="text-sm text-gray-300 truncate">${d.doc_type_name || d.doc_type_id}</span>
        ${d.status==='rejected'&&d.rejection_reason?`<span class="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded flex-shrink-0">${d.rejection_reason}</span>`:''}
      </div>
      <div class="flex items-center gap-2 flex-shrink-0 ml-2">
        <span class="text-xs text-gray-500">${fmtDate(d.uploaded_at)}</span>
        ${(isDraft || d.status==='rejected') ? `<button onclick="kycDeleteDoc('${d.id}')"
          class="text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/20 bg-red-500/10 px-2 py-1 rounded-lg transition flex items-center gap-1">
          <i class="fas fa-trash text-[9px]"></i>Supprimer
        </button>` : ''}
      </div>
    </div>`).join('');

  return `
  <div class="bg-dark-800 border ${app.status==='approved'?'border-green-500/40':app.status==='rejected'?'border-red-500/40':'border-purple-500/30'} rounded-2xl p-5">
    <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
      <div class="flex items-center gap-2">
        <i class="fas fa-folder-open text-purple-400"></i>
        <span class="font-semibold text-white">Dossier niveau ${app.target_level}</span>
        <span class="text-xs px-2 py-0.5 rounded-full border ${kycLevelBg(app.target_level)} ${kycLevelColor(app.target_level)}">
          ${kycLevelLabel(app.target_level)}
        </span>
      </div>
      <span class="text-sm font-semibold ${stClass}">
        <i class="fas fa-circle text-[8px] mr-1"></i>${stLabel}
      </span>
    </div>

    ${app.rejection_reason ? `
    <div class="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
      <i class="fas fa-triangle-exclamation text-red-400 mt-0.5"></i>
      <div>
        <div class="text-sm text-red-300 font-medium">Motif de rejet</div>
        <div class="text-sm text-red-400/80 mt-0.5">${app.rejection_reason}</div>
        ${canResubmit ? `<button onclick="kycOpenUpload(${app.target_level}, '${app.id}')" 
          class="mt-2 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded-lg transition font-medium">
          <i class="fas fa-refresh mr-1"></i>Corriger et re-soumettre
        </button>` : ''}
      </div>
    </div>` : ''}

    ${docs.length ? `
    <div class="mb-4">
      <div class="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">Documents soumis</div>
      <div class="bg-dark-700/50 rounded-xl px-3 py-1">${docRows}</div>
    </div>` : ''}

    <!-- Actions dossier draft -->
    ${isDraft ? `
    <div class="flex gap-2 flex-wrap">
      <button onclick="kycOpenUpload(${app.target_level}, '${app.id}')"
              class="btn-primary text-sm flex-1">
        <i class="fas fa-plus mr-2"></i>Ajouter des documents
      </button>
      ${docs.length > 0 ? `<button onclick="kycSubmitApplication('${app.id}')"
              class="btn-success text-sm flex-1">
        <i class="fas fa-paper-plane mr-2"></i>Soumettre pour vérification
      </button>` : ''}
    </div>` : ''}

    <!-- Re-soumettre si rejeté -->
    ${canResubmit ? `
    <button onclick="kycOpenUpload(${app.target_level}, null)"
            class="w-full btn-primary text-sm mt-2">
      <i class="fas fa-refresh mr-2"></i>Créer un nouveau dossier
    </button>` : ''}

    <div class="mt-3 text-xs text-gray-500 text-right">
      Créé le ${fmtDate(app.created_at)}
      ${app.submitted_at ? ` · Soumis le ${fmtDate(app.submitted_at)}` : ''}
    </div>
  </div>`;
}

function _kycBuildActionSection(memberLevel, app, levels, statusRes) {
  const maxLevel = levels.length - 1;
  const nextLevel = memberLevel + 1;
  const hasActiveApp = app && ['draft','submitted','under_review'].includes(app.status);

  if (memberLevel >= maxLevel) {
    return `
    <div class="bg-dark-800 border border-green-500/30 rounded-2xl p-5 text-center">
      <div class="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
        <i class="fas fa-shield-check text-green-400 text-xl"></i>
      </div>
      <h3 class="font-bold text-white">Vérification complète !</h3>
      <p class="text-gray-400 text-sm mt-1">Vous avez atteint le niveau maximum de vérification.</p>
    </div>`;
  }

  if (hasActiveApp) {
    const st = app.status;
    if (st === 'submitted' || st === 'under_review') {
      return `
      <div class="bg-dark-800 border border-yellow-500/30 rounded-2xl p-5 text-center">
        <div class="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3 animate-pulse">
          <i class="fas fa-hourglass-half text-yellow-400 text-xl"></i>
        </div>
        <h3 class="font-bold text-white">Vérification en cours</h3>
        <p class="text-gray-400 text-sm mt-1">Votre dossier est examiné par notre équipe. Délai habituel : 24-48h.</p>
      </div>`;
    }
    return '';
  }

  // Afficher le bouton pour démarrer le niveau suivant
  const nextLv = levels.find(l => l.level === nextLevel);
  if (!nextLv) return '';

  const docs = _kycGetRequiredDocs(nextLevel, statusRes);

  return `
  <div class="bg-dark-800 border border-dark-600 rounded-2xl p-5">
    <div class="flex items-center gap-2 mb-4">
      <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
        <i class="fas fa-arrow-up text-purple-400 text-sm"></i>
      </div>
      <div>
        <div class="font-semibold text-white">Passez au niveau ${nextLevel}</div>
        <div class="text-xs text-gray-400">${nextLv.name || kycLevelLabel(nextLevel)}${nextLv.description ? ' — ' + nextLv.description : ''}</div>
      </div>
    </div>

    ${docs.length ? `
    <div class="mb-4">
      <div class="text-xs text-gray-400 uppercase tracking-wider mb-2">Documents requis</div>
      <div class="grid grid-cols-1 gap-2">
        ${docs.map(d => `
        <div class="flex items-center gap-2 text-sm text-gray-300">
          <i class="fas fa-file-alt text-purple-400/60 text-xs w-4 flex-shrink-0"></i>
          <span>${d.label}</span>
          ${d.required ? '' : '<span class="text-[10px] text-gray-500 ml-auto">Optionnel</span>'}
        </div>`).join('')}
      </div>
    </div>` : ''}

    <button onclick="kycOpenUpload(${nextLevel}, null)"
            class="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm px-4 py-3 rounded-xl transition flex items-center justify-center gap-2">
      <i class="fas fa-id-card"></i>
      Commencer la vérification niveau ${nextLevel}
    </button>
    <p class="text-[11px] text-gray-500 text-center mt-2">
      <i class="fas fa-lock mr-1"></i>Vos documents sont stockés de façon sécurisée et confidentielle
    </p>
  </div>`;
}

function _kycGetRequiredDocs(level, statusRes) {
  const levelData = (_kycState.config?.levels || []).find(l => l.level === level);
  if (!levelData || !levelData.docs) return [];
  return levelData.docs.map(d => ({
    label: d.doc_type_name || d.doc_type_id,
    required: !!d.required
  }));
}


// ════════════════════════════════════════════════════════════
// WIZARD KYC IA — 3 ÉTAPES (remplace la modale upload)
// Étape 1 : Upload pièce d'identité
// Étape 2 : Selfie webcam (ou upload)
// Étape 3 : Analyse IA en temps réel + résultat
// ════════════════════════════════════════════════════════════

// État global du wizard
const _kycWizard = {
  step: 1,
  targetLevel: null,
  docTypeId: null,
  docTypeName: null,
  docBase64: null,
  docMime: null,
  docFileName: null,
  docDataUrl: null,
  selfieBase64: null,
  selfieDataUrl: null,
  selfieStream: null,   // MediaStream webcam actif
  applicationId: null,
  livenessEnabled: false,
  livenessCompleted: false,
  livenessSteps: [],
  livenessCurrentStep: 0,
};

// ── Entrée principale — remplace kycOpenUpload ───────────────
async function kycOpenUpload(targetLevel, existingAppId) {
  const levels  = _kycState.config?.levels || [];
  const levelData = levels.find(l => l.level === targetLevel);
  const docs    = levelData?.docs || [];

  // Reset wizard
  Object.assign(_kycWizard, {
    step: 1, targetLevel, docTypeId: null, docTypeName: null,
    docBase64: null, docMime: null, docFileName: null, docDataUrl: null,
    selfieBase64: null, selfieDataUrl: null, applicationId: existingAppId || null
  });
  _kycWizardStopCamera();

  // Pré-sélectionner si 1 seul type de doc
  if (docs.length === 1) {
    _kycWizard.docTypeId   = docs[0].doc_type_id;
    _kycWizard.docTypeName = docs[0].doc_type_name || docs[0].doc_type_id;
  }

  // Config liveness : lue depuis le niveau cible (liveness_required)
  _kycWizard.livenessEnabled = !!(levelData?.liveness_required);
  _kycWizard.livenessSteps = ['blink','turn_left','turn_right'];
  _kycWizard.livenessCompleted = false;
  _kycWizard.livenessCurrentStep = 0;
  _kycWizardStopLivenessCamera();
  _kycWizardRender(docs);
}

// ── Rendu principal du wizard (inline dans la modal) ─────────
function _kycWizardRender(docs) {
  const docsForLevel = docs || (() => {
    const lvl = (_kycState.config?.levels || []).find(l => l.level === _kycWizard.targetLevel);
    return lvl?.docs || [];
  })();

  const step = _kycWizard.step;

  const _sl = _kycWizard.livenessEnabled ? ['Pièce d\'identité','Selfie','Liveness','Vérification IA'] : ['Pièce d\'identité','Selfie','Vérification IA'];
  const stepsHtml = _sl.map((label, i) => {
    const n = i + 1;
    const done   = n < step;
    const active = n === step;
    const bg   = done ? 'bg-green-500' : active ? 'bg-purple-600' : 'bg-dark-600';
    const ring = active ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-dark-800' : '';
    return `
      <div class="flex flex-col items-center flex-1">
        <div class="w-8 h-8 rounded-full ${bg} ${ring} flex items-center justify-center text-xs font-bold text-white mb-1 transition-all">
          ${done ? '<i class="fas fa-check text-[10px]"></i>' : n}
        </div>
        <span class="text-[10px] ${active ? 'text-purple-300 font-semibold' : done ? 'text-green-400' : 'text-gray-500'} text-center leading-tight">${label}</span>
      </div>`;
  }).join(`<div class="flex-1 h-0.5 bg-dark-600 mt-4 mx-1 relative top-[-16px]"></div>`);

  let bodyHtml = '';
  if      (step === 1) bodyHtml = _kycWizardStep1Html(docsForLevel);
  else if (step === 2) bodyHtml = _kycWizardStep2Html();
  else if (step === 3 && _kycWizard.livenessEnabled) bodyHtml = _kycWizardStepLivenessHtml();
  else if (step === 3 || step === 4) bodyHtml = _kycWizardStep3Html();

  const html = `
  <div class="p-6 space-y-5">
    <!-- En-tête -->
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-bold text-white flex items-center gap-2">
        <i class="fas fa-shield-halved text-purple-400"></i>
        Vérification niveau ${_kycWizard.targetLevel}
      </h3>
      <button onclick="_kycWizardClose()" class="text-gray-500 hover:text-white transition text-sm">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- Indicateur d'étapes -->
    <div class="flex items-start gap-0">${stepsHtml}</div>

    <!-- Corps de l'étape -->
    <div id="kyc-wizard-body">${bodyHtml}</div>
  </div>`;

  showModal(html, true);

  // Après injection dans le DOM → attacher les events de sélection de doc
  if (step === 1) {
    setTimeout(_kycWizardBindDocOptions, 0);
  }
  // Démarrer automatiquement la caméra liveness à l'étape liveness
  if (step === 3 && _kycWizard.livenessEnabled && !_kycWizard.livenessCompleted) {
    setTimeout(_kycWizardStartLivenessCamera, 150);
  }
}

// ────────────────────────────────────────────────────────────
// ÉTAPE 1 — Pièce d'identité
// ────────────────────────────────────────────────────────────
function _kycWizardStep1Html(docs) {
  // Si docs non fourni, réutiliser le cache (cas re-render après compression)
  docs = docs || _kycWizard._docsForLevel || [];
  const groups = [...new Set(docs.filter(d=>d.doc_group).map(d=>d.doc_group))];
  const groupHint = groups.length ? `
    <div class="bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-purple-300">
      <i class="fas fa-info-circle mr-1.5"></i>Un seul document par groupe suffit.
    </div>` : '';

  // Stocker les docs dans _kycWizard pour y accéder depuis _kycWizardSelectDocType
  _kycWizard._docsForLevel = docs;

  const docOptions = docs.map(d => {
    const isSelected = _kycWizard.docTypeId === d.doc_type_id;
    const catIcon = d.category === 'identity' ? 'id-card' : d.category === 'address' ? 'home' : 'file-alt';
    return `
    <div class="kyc-doc-option flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none
                ${isSelected ? 'border-purple-500 bg-purple-500/10' : 'border-dark-500 bg-dark-700/50 hover:border-purple-500/50 hover:bg-dark-700'}"
         data-doc-id="${d.doc_type_id}"
         role="button" tabindex="0">
      <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 pointer-events-none">
        <i class="fas fa-${catIcon} text-purple-400 text-sm"></i>
      </div>
      <div class="flex-1 pointer-events-none">
        <div class="text-sm text-white font-medium">${d.doc_type_name || d.doc_type_id}</div>
        ${d.required ? '<div class="text-[10px] text-purple-400">Obligatoire</div>' : '<div class="text-[10px] text-gray-500">Optionnel</div>'}
      </div>
      <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all pointer-events-none
                  ${isSelected ? 'border-purple-500 bg-purple-500' : 'border-dark-400 bg-transparent'}">
        ${isSelected ? '<i class="fas fa-check text-white text-[8px]"></i>' : ''}
      </div>
    </div>`;
  }).join('');

  const previewHtml = _kycWizard.docDataUrl ? `
    <div class="flex items-center gap-3 bg-dark-700 border border-green-500/30 rounded-xl px-3 py-2.5 mt-2">
      ${_kycWizard.docMime?.startsWith('image/')
        ? `<img src="${_kycWizard.docDataUrl}" class="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-dark-500">`
        : `<div class="w-14 h-14 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0"><i class="fas fa-file-pdf text-red-400 text-xl"></i></div>`}
      <div class="flex-1 min-w-0">
        <div class="text-sm text-white font-medium truncate">${_kycWizard.docFileName}</div>
        <div class="text-xs text-green-400"><i class="fas fa-check-circle mr-1"></i>Prêt</div>
      </div>
      <button onclick="_kycWizardClearDoc()" class="text-gray-500 hover:text-red-400 transition">
        <i class="fas fa-times"></i>
      </button>
    </div>` : '';

  const canNext = _kycWizard.docTypeId && _kycWizard.docBase64;

  return `
    <div class="space-y-4">
      <div>
        <div class="text-sm font-semibold text-white mb-1">Sélectionnez le type de document</div>
        <div class="text-xs text-gray-400 mb-3">Choisissez la pièce d'identité que vous souhaitez soumettre</div>
        ${groupHint}
        <div class="space-y-2 mt-3" id="kyc-doc-options-list">${docOptions}</div>
      </div>

      <div>
        <div class="text-sm font-semibold text-white mb-2">
          <i class="fas fa-upload text-purple-400 mr-2"></i>Uploader le document
        </div>
        ${previewHtml || `
        <div class="border-2 border-dashed border-purple-500/40 rounded-xl p-5 text-center cursor-pointer hover:border-purple-400 transition-all"
             id="kyc-step1-drop"
             onclick="document.getElementById('kyc-step1-file').click()"
             ondragover="event.preventDefault();this.classList.add('!border-purple-500')"
             ondragleave="this.classList.remove('!border-purple-500')"
             ondrop="_kycWizardDropDoc(event)">
          <i class="fas fa-cloud-upload-alt text-3xl text-gray-500 mb-2 block"></i>
          <p class="text-sm text-gray-400">Glissez votre fichier ici ou <span class="text-purple-400 font-medium">cliquez</span></p>
          <p class="text-xs text-gray-600 mt-1">JPG, PNG, PDF — toute taille acceptée (compression auto)</p>
        </div>`}
        <input type="file" id="kyc-step1-file" class="hidden" accept=".jpg,.jpeg,.png,.pdf"
               onchange="_kycWizardLoadDocFile(this.files[0])">
        <div id="kyc-compress-progress" class="hidden mt-2 text-xs text-purple-300 text-center animate-pulse"></div>
      </div>

      <div id="kyc-wizard-err1" class="hidden bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400"></div>

      <button onclick="_kycWizardNext1()"
              class="w-full ${canNext ? 'bg-purple-600 hover:bg-purple-500' : 'bg-dark-600 cursor-not-allowed opacity-60'} text-white font-bold text-sm px-4 py-3 rounded-xl transition flex items-center justify-center gap-2">
        <i class="fas fa-arrow-right"></i>
        Continuer vers la selfie
      </button>
    </div>`;
}

// Attacher les event listeners sur les options doc (après insertion dans le DOM)
function _kycWizardBindDocOptions() {
  const list = document.getElementById('kyc-doc-options-list');
  if (!list) return;
  list.querySelectorAll('.kyc-doc-option').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.docId;
      const docs = _kycWizard._docsForLevel || [];
      const doc = docs.find(d => d.doc_type_id === id);
      if (!doc) return;
      _kycWizard.docTypeId   = id;
      _kycWizard.docTypeName = doc.doc_type_name || id;
      // Mise à jour visuelle sans re-render complet (plus rapide)
      list.querySelectorAll('.kyc-doc-option').forEach(opt => {
        const sel = opt.dataset.docId === id;
        opt.className = opt.className
          .replace(/border-purple-500 bg-purple-500\/10|border-dark-500 bg-dark-700\/50 hover:border-purple-500\/50 hover:bg-dark-700/g, '')
          .trim();
        opt.classList.add(...(sel
          ? ['border-purple-500','bg-purple-500/10']
          : ['border-dark-500','bg-dark-700/50','hover:border-purple-500/50','hover:bg-dark-700']));
        // Mettre à jour le radio visuel
        const radio = opt.querySelector('div.rounded-full');
        if (radio) {
          if (sel) {
            radio.className = radio.className.replace('border-dark-400 bg-transparent','').trim();
            radio.classList.add('border-purple-500','bg-purple-500');
            radio.innerHTML = '<i class="fas fa-check text-white text-[8px]"></i>';
          } else {
            radio.className = radio.className.replace('border-purple-500 bg-purple-500','').trim();
            radio.classList.add('border-dark-400','bg-transparent');
            radio.innerHTML = '';
          }
        }
      });
      // Activer le bouton "Continuer" si fichier déjà chargé
      const nextBtn = document.querySelector('#kyc-wizard-body button[onclick="_kycWizardNext1()"]');
      if (nextBtn && _kycWizard.docBase64) {
        nextBtn.classList.remove('bg-dark-600','cursor-not-allowed','opacity-60');
        nextBtn.classList.add('bg-purple-600','hover:bg-purple-500');
      }
    });
    // Accessibilité clavier
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') el.click(); });
  });
}

function _kycWizardSelectDocType(id, name) {
  // Appelé depuis binding — délégué à _kycWizardBindDocOptions
  _kycWizard.docTypeId   = id;
  _kycWizard.docTypeName = name;
  const body = document.getElementById('kyc-wizard-body');
  if (body) body.innerHTML = _kycWizardStep1Html();
  setTimeout(_kycWizardBindDocOptions, 0);
}

function _kycWizardClearDoc() {
  _kycWizard.docBase64 = null;
  _kycWizard.docMime   = null;
  _kycWizard.docFileName = null;
  _kycWizard.docDataUrl  = null;
  const body = document.getElementById('kyc-wizard-body');
  if (body) { body.innerHTML = _kycWizardStep1Html(); setTimeout(_kycWizardBindDocOptions, 0); }
}

function _kycWizardDropDoc(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) _kycWizardLoadDocFile(file);
}

async function _kycWizardLoadDocFile(file) {
  const errEl = document.getElementById('kyc-wizard-err1');
  // Limite libérée à 50 Mo côté client — la compression s'occupe de tout
  const maxRaw = 50 * 1024 * 1024;
  const allowed = ['image/jpeg','image/png','application/pdf'];

  if (!file) return;
  if (!allowed.includes(file.type)) {
    if (errEl) { errEl.textContent = 'Format non accepté (JPG, PNG, PDF uniquement)'; errEl.classList.remove('hidden'); }
    return;
  }
  if (file.size > maxRaw) {
    if (errEl) { errEl.textContent = 'Fichier trop volumineux (max 50 Mo)'; errEl.classList.remove('hidden'); }
    return;
  }
  if (errEl) errEl.classList.add('hidden');

  // Indicateur de traitement
  const body = document.getElementById('kyc-wizard-body');
  const progressEl = document.getElementById('kyc-compress-progress');
  if (progressEl) { progressEl.textContent = 'Optimisation en cours...'; progressEl.classList.remove('hidden'); }

  try {
    let finalDataUrl, finalMime, finalName;

    if (file.type === 'application/pdf') {
      // ── PDF → JPEG via pdf.js ──────────────────────────────
      if (!window.pdfjsLib) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
          s.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
            res();
          };
          s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const arrayBuf = await file.arrayBuffer();
      const pdfDoc   = await window.pdfjsLib.getDocument({ data: arrayBuf }).promise;
      const page     = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 }); // 2× pour haute qualité
      const canvas   = document.createElement('canvas');
      canvas.width   = viewport.width;
      canvas.height  = viewport.height;
      const ctx      = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      // Compression JPEG 88%
      finalDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      finalMime    = 'image/jpeg';
      finalName    = file.name.replace(/\.pdf$/i, '.jpg');

    } else {
      // ── Image JPEG/PNG → canvas resize + compression ──────
      finalDataUrl = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = ev => {
          const img = new Image();
          img.onload = () => {
            const MAX = 1500;
            let { width, height } = img;
            if (width > MAX || height > MAX) {
              if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
              else { width = Math.round(width * MAX / height); height = MAX; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            res(canvas.toDataURL('image/jpeg', 0.88));
          };
          img.onerror = rej;
          img.src = ev.target.result;
        };
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      finalMime = 'image/jpeg';
      finalName = file.name.replace(/\.[^.]+$/, '.jpg');
    }

    // Taille après compression
    const approxKB = Math.round((finalDataUrl.length * 0.75) / 1024);
    if (progressEl) { progressEl.textContent = `Optimisé (${approxKB} Ko) — Ajustez si besoin`; }

    // Stocker temporairement avant ajustement
    _kycWizard._rawDataUrl  = finalDataUrl;
    _kycWizard._rawMime     = finalMime;
    _kycWizard._rawFileName = finalName;

    // Ouvrir l'éditeur de cadrage interactif
    _kycWizardOpenCropEditor(finalDataUrl, finalMime, finalName);

  } catch(e) {
    if (progressEl) progressEl.classList.add('hidden');
    if (errEl) { errEl.textContent = 'Erreur lors du traitement du fichier. Réessayez.'; errEl.classList.remove('hidden'); }
    console.error('KYC compress error:', e);
  }
}

// ────────────────────────────────────────────────────────────
// ÉDITEUR DE CADRAGE — Pan / Zoom / Rotation à la souris
// ────────────────────────────────────────────────────────────
function _kycWizardOpenCropEditor(dataUrl, mime, fileName) {
  // État de l'éditeur
  const crop = {
    img: null,
    scale: 1, minScale: 0.3, maxScale: 4,
    offsetX: 0, offsetY: 0,
    rotation: 0,  // 0 | 90 | 180 | 270
    dragging: false,
    lastX: 0, lastY: 0,
    // Touch
    lastTouchDist: null,
  };

  // Injecter le HTML de l'éditeur dans kyc-wizard-body
  const body = document.getElementById('kyc-wizard-body');
  if (!body) return;

  body.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="text-sm font-semibold text-white">
          <i class="fas fa-crop-alt text-purple-400 mr-2"></i>Ajuster le document
        </div>
        <div class="text-xs text-gray-400">Glissez pour déplacer · Molette pour zoomer</div>
      </div>

      <!-- Canvas zone -->
      <div class="relative rounded-xl overflow-hidden bg-dark-900 border-2 border-purple-500/30"
           style="height:280px">
        <canvas id="kyc-crop-canvas"
                style="width:100%;height:100%;display:block;cursor:grab;touch-action:none"
                onmousedown="_kycCropMouseDown(event)"
                onmousemove="_kycCropMouseMove(event)"
                onmouseup="_kycCropMouseUp(event)"
                onmouseleave="_kycCropMouseUp(event)"
                onwheel="_kycCropWheel(event)"
                ontouchstart="_kycCropTouchStart(event)"
                ontouchmove="_kycCropTouchMove(event)"
                ontouchend="_kycCropTouchEnd(event)"></canvas>
        <!-- Grille guide -->
        <div class="absolute inset-0 pointer-events-none" style="
          background-image: linear-gradient(rgba(139,92,246,.15) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(139,92,246,.15) 1px, transparent 1px);
          background-size: 33.33% 33.33%;">
        </div>
        <!-- Coins de cadrage -->
        <div class="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-purple-400 rounded-tl pointer-events-none"></div>
        <div class="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-purple-400 rounded-tr pointer-events-none"></div>
        <div class="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-purple-400 rounded-bl pointer-events-none"></div>
        <div class="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-purple-400 rounded-br pointer-events-none"></div>
      </div>

      <!-- Contrôles -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Zoom -->
        <div class="flex items-center gap-1.5 bg-dark-700 rounded-xl px-3 py-2 border border-dark-500">
          <button onclick="_kycCropZoom(-0.15)"
                  class="w-7 h-7 rounded-lg bg-dark-600 hover:bg-purple-600 text-white text-sm font-bold transition flex items-center justify-center">
            <i class="fas fa-minus text-xs"></i>
          </button>
          <span id="kyc-crop-zoom-label" class="text-xs text-gray-300 w-10 text-center">100%</span>
          <button onclick="_kycCropZoom(0.15)"
                  class="w-7 h-7 rounded-lg bg-dark-600 hover:bg-purple-600 text-white text-sm font-bold transition flex items-center justify-center">
            <i class="fas fa-plus text-xs"></i>
          </button>
        </div>
        <!-- Rotation -->
        <button onclick="_kycCropRotate()"
                class="flex items-center gap-2 bg-dark-700 hover:bg-dark-600 border border-dark-500 text-white text-xs font-medium px-3 py-2 rounded-xl transition">
          <i class="fas fa-rotate-right text-purple-400"></i>Pivoter 90°
        </button>
        <!-- Réinitialiser -->
        <button onclick="_kycCropReset()"
                class="flex items-center gap-2 bg-dark-700 hover:bg-dark-600 border border-dark-500 text-gray-400 text-xs px-3 py-2 rounded-xl transition">
          <i class="fas fa-undo"></i>Réinitialiser
        </button>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <button onclick="_kycWizardClearDoc()"
                class="flex-1 bg-dark-600 hover:bg-dark-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition border border-dark-400">
          <i class="fas fa-arrow-left mr-2"></i>Rechoisir
        </button>
        <button onclick="_kycCropConfirm()"
                class="flex-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition flex items-center gap-2">
          <i class="fas fa-check-circle"></i>Confirmer
        </button>
      </div>
    </div>`;

  // Charger l'image dans le canvas
  const img = new Image();
  img.onload = () => {
    crop.img = img;
    window._kycCropState = crop;
    _kycCropReset();
  };
  img.src = dataUrl;

  // Stocker les infos du fichier source
  window._kycCropMeta = { dataUrl, mime, fileName };
}

// ── Dessin du canvas ──────────────────────────────────────────
function _kycCropDraw() {
  const state = window._kycCropState;
  if (!state || !state.img) return;
  const canvas = document.getElementById('kyc-crop-canvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width  || canvas.offsetWidth  || 360;
  canvas.height = rect.height || canvas.offsetHeight || 280;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  // Centrer + offset + rotation
  ctx.translate(canvas.width / 2 + state.offsetX, canvas.height / 2 + state.offsetY);
  ctx.rotate(state.rotation * Math.PI / 180);
  ctx.scale(state.scale, state.scale);

  const { naturalWidth: w, naturalHeight: h } = state.img;
  ctx.drawImage(state.img, -w / 2, -h / 2, w, h);
  ctx.restore();

  // Mettre à jour le label zoom
  const lbl = document.getElementById('kyc-crop-zoom-label');
  if (lbl) lbl.textContent = Math.round(state.scale * 100) + '%';
}

// ── Réinitialiser centrer + fit ───────────────────────────────
function _kycCropReset() {
  const state = window._kycCropState;
  if (!state || !state.img) return;
  const canvas = document.getElementById('kyc-crop-canvas');
  if (!canvas) return;

  const cw = canvas.offsetWidth  || 360;
  const ch = canvas.offsetHeight || 280;
  const { naturalWidth: iw, naturalHeight: ih } = state.img;

  // Rotation : si 90/270 on inverse w/h
  const eff_w = (state.rotation % 180 === 0) ? iw : ih;
  const eff_h = (state.rotation % 180 === 0) ? ih : iw;

  state.scale   = Math.min(cw / eff_w, ch / eff_h) * 0.92;
  state.offsetX = 0;
  state.offsetY = 0;
  _kycCropDraw();
}

// ── Zoom bouton ───────────────────────────────────────────────
function _kycCropZoom(delta) {
  const state = window._kycCropState;
  if (!state) return;
  state.scale = Math.max(state.minScale, Math.min(state.maxScale, state.scale + delta));
  _kycCropDraw();
}

// ── Rotation 90° ─────────────────────────────────────────────
function _kycCropRotate() {
  const state = window._kycCropState;
  if (!state) return;
  state.rotation = (state.rotation + 90) % 360;
  _kycCropReset();
}

// ── Molette souris → zoom ─────────────────────────────────────
function _kycCropWheel(e) {
  e.preventDefault();
  const state = window._kycCropState;
  if (!state) return;
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  state.scale = Math.max(state.minScale, Math.min(state.maxScale, state.scale + delta));
  _kycCropDraw();
}

// ── Drag souris ───────────────────────────────────────────────
function _kycCropMouseDown(e) {
  const state = window._kycCropState;
  if (!state) return;
  state.dragging = true;
  state.lastX = e.clientX;
  state.lastY = e.clientY;
  e.target.style.cursor = 'grabbing';
}
function _kycCropMouseMove(e) {
  const state = window._kycCropState;
  if (!state || !state.dragging) return;
  state.offsetX += e.clientX - state.lastX;
  state.offsetY += e.clientY - state.lastY;
  state.lastX = e.clientX;
  state.lastY = e.clientY;
  _kycCropDraw();
}
function _kycCropMouseUp(e) {
  const state = window._kycCropState;
  if (!state) return;
  state.dragging = false;
  if (e.target) e.target.style.cursor = 'grab';
}

// ── Touch (mobile) — pinch-to-zoom ───────────────────────────
function _kycCropTouchStart(e) {
  const state = window._kycCropState;
  if (!state) return;
  if (e.touches.length === 1) {
    state.dragging = true;
    state.lastX = e.touches[0].clientX;
    state.lastY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    state.dragging = false;
    state.lastTouchDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
}
function _kycCropTouchMove(e) {
  e.preventDefault();
  const state = window._kycCropState;
  if (!state) return;
  if (e.touches.length === 1 && state.dragging) {
    state.offsetX += e.touches[0].clientX - state.lastX;
    state.offsetY += e.touches[0].clientY - state.lastY;
    state.lastX = e.touches[0].clientX;
    state.lastY = e.touches[0].clientY;
    _kycCropDraw();
  } else if (e.touches.length === 2 && state.lastTouchDist) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const delta = (dist - state.lastTouchDist) * 0.008;
    state.scale = Math.max(state.minScale, Math.min(state.maxScale, state.scale + delta));
    state.lastTouchDist = dist;
    _kycCropDraw();
  }
}
function _kycCropTouchEnd(e) {
  const state = window._kycCropState;
  if (!state) return;
  state.dragging = false;
  state.lastTouchDist = null;
}

// ── Confirmer le cadrage → exporter canvas en JPEG ───────────
function _kycCropConfirm() {
  const state  = window._kycCropState;
  const meta   = window._kycCropMeta;
  if (!state || !state.img || !meta) return;

  const canvas = document.getElementById('kyc-crop-canvas');
  if (!canvas) return;

  // Exporter le canvas visible en JPEG 90%
  const exportedDataUrl = canvas.toDataURL('image/jpeg', 0.90);

  // Finaliser dans _kycWizard
  _kycWizard.docBase64   = exportedDataUrl.split(',')[1];
  _kycWizard.docMime     = 'image/jpeg';
  _kycWizard.docFileName = meta.fileName.replace(/\.[^.]+$/, '.jpg');
  _kycWizard.docDataUrl  = exportedDataUrl;

  // Nettoyer l'état crop
  window._kycCropState = null;
  window._kycCropMeta  = null;

  // Re-render l'étape 1 avec la preview
  const body = document.getElementById('kyc-wizard-body');
  if (body) { body.innerHTML = _kycWizardStep1Html(); setTimeout(_kycWizardBindDocOptions, 0); }
}

// ────────────────────────────────────────────────────────────
// (suite) Passage à l'étape suivante
// ────────────────────────────────────────────────────────────
function _kycWizardNext1() {
  if (!_kycWizard.docTypeId) {
    const e = document.getElementById('kyc-wizard-err1');
    if (e) { e.textContent = 'Choisissez d\'abord le type de document'; e.classList.remove('hidden'); }
    return;
  }
  if (!_kycWizard.docBase64) {
    const e = document.getElementById('kyc-wizard-err1');
    if (e) { e.textContent = 'Uploadez votre pièce d\'identité avant de continuer'; e.classList.remove('hidden'); }
    return;
  }
  _kycWizard.step = 2;
  _kycWizardRender();
}

// ────────────────────────────────────────────────────────────
// ÉTAPE 2 — Selfie (webcam ou upload)
// ────────────────────────────────────────────────────────────
function _kycWizardStep2Html() {
  const hasPhoto = !!_kycWizard.selfieBase64;

  return `
    <div class="space-y-4">
      <div class="text-sm text-gray-400 text-center">
        Prenez un selfie en tenant votre pièce d'identité bien visible,
        <br>ou uploadez une photo récente de votre visage.
      </div>

      ${hasPhoto ? `
      <!-- Preview selfie pris -->
      <div class="relative">
        <img src="${_kycWizard.selfieDataUrl}" class="w-full max-h-96 object-cover rounded-2xl border-2 border-green-500/40">
        <div class="absolute top-3 right-3">
          <button onclick="_kycWizardClearSelfie()"
                  class="bg-dark-900/80 hover:bg-red-500/80 text-white rounded-full w-8 h-8 flex items-center justify-center transition">
            <i class="fas fa-redo text-xs"></i>
          </button>
        </div>
        <div class="absolute bottom-3 left-3 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full font-semibold">
          <i class="fas fa-check mr-1"></i>Photo prise
        </div>
      </div>` : `

      <!-- Webcam + options -->
      <div class="space-y-3">
        <!-- Vue webcam -->
        <div class="relative bg-dark-900 rounded-2xl overflow-hidden border-2 border-dark-500" style="min-height:320px">
          <video id="kyc-webcam" autoplay playsinline muted
                 class="w-full rounded-2xl" style="max-height:400px;object-fit:cover;display:none"></video>
          <canvas id="kyc-canvas" class="hidden"></canvas>

          <!-- Overlay cercle guide -->
          <div id="kyc-cam-overlay"
               class="absolute inset-0 flex flex-col items-center justify-center text-center p-4 hidden">
            <div class="w-52 h-52 rounded-full border-2 border-dashed border-purple-400/70 flex items-center justify-center mb-3">
              <i class="fas fa-user text-4xl text-purple-400/50"></i>
            </div>
            <p class="text-xs text-gray-400">Centrez votre visage dans le cercle</p>
          </div>

          <!-- Placeholder avant activation -->
          <div id="kyc-cam-placeholder" class="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <i class="fas fa-camera text-4xl text-gray-600 mb-3"></i>
            <p class="text-sm text-gray-400">Activez la caméra ou uploadez une photo</p>
          </div>
        </div>

        <!-- Boutons -->
        <div class="grid grid-cols-2 gap-3">
          <button id="kyc-cam-btn" onclick="_kycWizardStartCamera()"
                  class="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-2">
            <i class="fas fa-camera"></i>Activer la caméra
          </button>
          <button onclick="document.getElementById('kyc-selfie-file').click()"
                  class="bg-dark-600 hover:bg-dark-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition border border-dark-400 flex items-center justify-center gap-2">
            <i class="fas fa-upload text-purple-400"></i>Uploader photo
          </button>
        </div>

        <!-- Bouton capture (apparaît quand webcam active) -->
        <button id="kyc-capture-btn" onclick="_kycWizardCapture()" class="hidden
                w-full bg-green-600 hover:bg-green-500 text-white font-bold text-sm px-4 py-3 rounded-xl transition flex items-center justify-center gap-2">
          <i class="fas fa-camera-rotate"></i>Prendre la photo
        </button>

        <input type="file" id="kyc-selfie-file" class="hidden" accept=".jpg,.jpeg,.png"
               onchange="_kycWizardLoadSelfieFile(this.files[0])">
      </div>`}

      <div id="kyc-wizard-err2" class="hidden bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400"></div>

      <!-- Navigation -->
      <div class="flex gap-3">
        <button onclick="_kycWizardBack()"
                class="flex-1 bg-dark-600 hover:bg-dark-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition border border-dark-400">
          <i class="fas fa-arrow-left mr-2"></i>Retour
        </button>
        <button onclick="_kycWizardNext2()"
                class="flex-2 ${hasPhoto ? 'bg-purple-600 hover:bg-purple-500' : 'bg-dark-600 cursor-not-allowed opacity-60'} text-white font-bold text-sm px-6 py-2.5 rounded-xl transition flex items-center gap-2">
          <i class="fas fa-shield-check"></i>Valider mon KYC
        </button>
      </div>
    </div>`;
}

function _kycWizardClearSelfie() {
  _kycWizardStopCamera();
  _kycWizard.selfieBase64  = null;
  _kycWizard.selfieDataUrl = null;
  const body = document.getElementById('kyc-wizard-body');
  if (body) body.innerHTML = _kycWizardStep2Html();
}

async function _kycWizardStartCamera() {
  const btn = document.getElementById('kyc-cam-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="loader !w-4 !h-4"></div> Activation...'; }

  try {
    // Préférer la caméra frontale
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    _kycWizard.selfieStream = stream;

    const video = document.getElementById('kyc-webcam');
    const placeholder = document.getElementById('kyc-cam-placeholder');
    const overlay = document.getElementById('kyc-cam-overlay');
    const captureBtn = document.getElementById('kyc-capture-btn');

    if (video) {
      video.srcObject = stream;
      video.style.display = '';
    }
    if (placeholder) placeholder.classList.add('hidden');
    if (overlay)   overlay.classList.remove('hidden');
    if (captureBtn) captureBtn.classList.remove('hidden');
    if (btn) btn.classList.add('hidden');

  } catch(err) {
    const e = document.getElementById('kyc-wizard-err2');
    if (e) {
      e.textContent = err.name === 'NotAllowedError'
        ? 'Accès à la caméra refusé — utilisez le bouton "Uploader photo"'
        : 'Caméra non disponible — utilisez le bouton "Uploader photo"';
      e.classList.remove('hidden');
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-camera"></i>Activer la caméra'; }
  }
}

function _kycWizardCapture() {
  const video  = document.getElementById('kyc-webcam');
  const canvas = document.getElementById('kyc-canvas');
  if (!video || !canvas) return;

  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  // Miroir horizontal (selfie naturel)
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  _kycWizard.selfieBase64  = dataUrl.split(',')[1];
  _kycWizard.selfieDataUrl = dataUrl;

  // Arrêter la caméra après capture
  _kycWizardStopCamera();

  // Re-render pour afficher la preview
  const body = document.getElementById('kyc-wizard-body');
  if (body) body.innerHTML = _kycWizardStep2Html();
}

async function _kycWizardLoadSelfieFile(file) {
  if (!file) return;
  const errEl = document.getElementById('kyc-wizard-err2');
  const allowed = ['image/jpeg','image/png'];
  if (!allowed.includes(file.type)) {
    if (errEl) { errEl.textContent = 'Format non accepté (JPG ou PNG uniquement)'; errEl.classList.remove('hidden'); }
    return;
  }
  // Limite libérée — compression auto
  const maxRaw = 30 * 1024 * 1024;
  if (file.size > maxRaw) {
    if (errEl) { errEl.textContent = 'Photo trop lourde (max 30 Mo)'; errEl.classList.remove('hidden'); }
    return;
  }
  if (errEl) errEl.classList.add('hidden');
  _kycWizardStopCamera();

  try {
    // Compression canvas : max 1200px, JPEG 88%
    const dataUrl = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1200;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
            else { width = Math.round(width * MAX / height); height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          res(canvas.toDataURL('image/jpeg', 0.88));
        };
        img.onerror = rej;
        img.src = ev.target.result;
      };
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

    _kycWizard.selfieBase64  = dataUrl.split(',')[1];
    _kycWizard.selfieDataUrl = dataUrl;
    const body = document.getElementById('kyc-wizard-body');
    if (body) body.innerHTML = _kycWizardStep2Html();
  } catch(e) {
    if (errEl) { errEl.textContent = 'Erreur lors du traitement de la photo. Réessayez.'; errEl.classList.remove('hidden'); }
    console.error('Selfie compress error:', e);
  }
}

function _kycWizardNext2() {
  if (!_kycWizard.selfieBase64) {
    const e = document.getElementById('kyc-wizard-err2');
    if (e) { e.textContent = 'Prenez un selfie ou uploadez une photo avant de continuer'; e.classList.remove('hidden'); }
    return;
  }
  _kycWizardStopCamera();
  _kycWizard.step = 3;
  _kycWizardRender();
  if (!_kycWizard.livenessEnabled) setTimeout(_kycWizardRunAnalysis, 500);
}

function _kycWizardStepLivenessHtml() {
  const steps = _kycWizard.livenessSteps;
  const cur   = _kycWizard.livenessCurrentStep;
  const done  = _kycWizard.livenessCompleted;
  const SL = {
    blink:      { icon: 'fa-eye',         label: 'Clignez des yeux',     hint: 'Regardez la caméra et clignez des yeux lentement' },
    turn_left:  { icon: 'fa-arrow-left',  label: 'Tête à gauche',         hint: 'Tournez doucement la tête vers la gauche' },
    turn_right: { icon: 'fa-arrow-right', label: 'Tête à droite',         hint: 'Tournez doucement la tête vers la droite' },
    nod:        { icon: 'fa-arrows-up-down', label: 'Hochez la tête',       hint: 'Faites oui de haut en bas' },
    smile:      { icon: 'fa-face-smile',  label: 'Souriez',              hint: 'Souriez naturellement à la caméra' },
  };

  // Toutes les étapes validées
  if (done) return `
    <div class="flex flex-col items-center gap-4 py-4">
      <div class="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
        <i class="fas fa-check text-3xl text-green-400"></i>
      </div>
      <div class="text-center">
        <div class="font-bold text-white text-lg">Liveness validée !</div>
        <div class="text-sm text-gray-400 mt-1">Toutes les vérifications ont été effectuées.</div>
      </div>
      <button onclick="_kycWizardLivenessFinish()" class="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition">
        Continuer <i class="fas fa-arrow-right ml-2"></i>
      </button>
    </div>`;

  const s = SL[steps[cur]] || { icon: 'fa-circle-question', label: steps[cur], hint: 'Effectuez le geste' };

  // Barre de progression des étapes
  const progress = steps.map((st, ix) => {
    const info = SL[st] || { icon: 'fa-circle' };
    const cls = ix < cur ? 'text-green-400' : ix === cur ? 'text-purple-400 animate-pulse' : 'text-gray-600';
    return `<i class="fas ${info.icon} ${cls} text-lg"></i>`;
  }).join('<span class="text-gray-600 mx-1">\u203a</span>');

  return `
  <div class="space-y-3">

    <!-- Progression -->
    <div class="flex items-center justify-between px-1">
      <div class="flex items-center gap-1">${progress}</div>
      <span class="text-xs text-gray-500">Étape ${cur+1} / ${steps.length}</span>
    </div>

    <!-- Flux caméra -->
    <div class="relative bg-dark-900 rounded-2xl overflow-hidden border-2 border-purple-500/50" style="min-height:280px">
      <video id="kyc-liveness-video" autoplay playsinline muted
             class="w-full rounded-2xl" style="max-height:340px;object-fit:cover;display:none"></video>

      <!-- Overlay cercle + instruction -->
      <div id="kyc-liveness-overlay" class="absolute inset-0 flex flex-col items-center justify-center text-center p-4 hidden">
        <div class="w-48 h-48 rounded-full border-2 border-dashed border-purple-400/80 flex items-center justify-center mb-3">
          <i class="fas ${s.icon} text-4xl text-purple-400/70"></i>
        </div>
        <div class="font-bold text-white text-base mt-1">${s.label}</div>
        <div class="text-xs text-gray-300 mt-1">${s.hint}</div>
      </div>

      <!-- Placeholder avant activation caméra -->
      <div id="kyc-liveness-placeholder" class="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
        <div class="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-3">
          <i class="fas fa-camera text-2xl text-purple-400"></i>
        </div>
        <p class="text-sm text-gray-400">Activation de la caméra…</p>
      </div>
    </div>

    <!-- Instruction texte sous la cam -->
    <div id="kyc-liveness-hint" class="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3 text-center hidden">
      <i class="fas ${s.icon} text-purple-400 mr-2"></i>
      <span class="text-sm text-white font-medium">${s.hint}</span>
    </div>

    <!-- Boutons -->
    <button onclick="_kycWizardLivenessDone()"
            class="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
      <i class="fas fa-check"></i>Fait — étape suivante
    </button>
    <button onclick="_kycWizardBack()" class="w-full text-gray-400 hover:text-white text-sm py-1.5 transition">
      <i class="fas fa-arrow-left mr-1"></i>Retour
    </button>
  </div>`;
}

function _kycWizardLivenessDone() {
  _kycWizard.livenessCurrentStep++;
  if (_kycWizard.livenessCurrentStep >= _kycWizard.livenessSteps.length) {
    _kycWizard.livenessCompleted = true;
  }
  // Arrêter la caméra liveness avant de re-rendre
  _kycWizardStopLivenessCamera();
  _kycWizardRender();
  // Si pas encore fini, redémarrer la cam pour l'étape suivante
  if (!_kycWizard.livenessCompleted) {
    setTimeout(_kycWizardStartLivenessCamera, 100);
  }
}

function _kycWizardLivenessFinish() {
  _kycWizardStopLivenessCamera();
  _kycWizard.step = 4;
  _kycWizardRender();
  setTimeout(_kycWizardRunAnalysis, 500);
}

function _kycWizardStartLivenessCamera() {
  navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false
  }).then(function(stream) {
    _kycWizard.livenessStream = stream;
    const video = document.getElementById('kyc-liveness-video');
    const placeholder = document.getElementById('kyc-liveness-placeholder');
    const overlay = document.getElementById('kyc-liveness-overlay');
    const hint = document.getElementById('kyc-liveness-hint');
    if (video) { video.srcObject = stream; video.style.display = ''; }
    if (placeholder) placeholder.classList.add('hidden');
    if (overlay) overlay.classList.remove('hidden');
    if (hint) hint.classList.remove('hidden');
  }).catch(function(err) {
    const ph = document.getElementById('kyc-liveness-placeholder');
    if (ph) {
      ph.innerHTML = '<i class="fas fa-exclamation-triangle text-2xl text-red-400 mb-2"></i><p class="text-sm text-red-400">Caméra non disponible</p>';
    }
  });
}

function _kycWizardStopLivenessCamera() {
  if (_kycWizard.livenessStream) {
    _kycWizard.livenessStream.getTracks().forEach(function(t) { t.stop(); });
    _kycWizard.livenessStream = null;
  }
}

function _kycWizardBack() {
  _kycWizardStopCamera();
  _kycWizard.step = Math.max(1, _kycWizard.step - 1);
  _kycWizardRender();
}

function _kycWizardStopCamera() {
  if (_kycWizard.selfieStream) {
    _kycWizard.selfieStream.getTracks().forEach(t => t.stop());
    _kycWizard.selfieStream = null;
  }
}

function _kycWizardClose() {
  _kycWizardStopCamera();
  closeModal();
}

// ────────────────────────────────────────────────────────────
// ÉTAPE 3 — Vérification de votre identité / Résultat
// ────────────────────────────────────────────────────────────
function _kycWizardStep3Html(result) {
  if (!result) {
    // État : analyse en cours (barre animée)
    return `
      <div class="space-y-6 text-center py-4">
        <div class="w-20 h-20 rounded-full bg-purple-500/20 border-2 border-purple-500/40 flex items-center justify-center mx-auto animate-pulse">
          <i class="fas fa-shield-check text-4xl text-purple-400"></i>
        </div>
        <div>
          <div class="text-white font-bold text-lg mb-1">Validation en cours…</div>
          <div id="kyc-ai-status" class="text-sm text-gray-400">Vérification de votre document</div>
        </div>

        <!-- Barre de progression animée -->
        <div class="bg-dark-700 rounded-full h-2 overflow-hidden">
          <div id="kyc-ai-progress-bar"
               class="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-700"
               style="width:5%"></div>
        </div>

        <!-- Étapes visuelles -->
        <div class="space-y-2 text-left">
          ${[
            { id:'ai-s1', icon:'fa-file-shield',  label:'Contrôle de conformité du document' },
            { id:'ai-s2', icon:'fa-user-check',    label:'Vérification de votre identité' },
            { id:'ai-s3', icon:'fa-lock',           label:'Sécurisation de votre dossier' },
            { id:'ai-s4', icon:'fa-circle-check',   label:'Validation finale' },
          ].map(s => `
          <div id="${s.id}" class="flex items-center gap-3 px-3 py-2 rounded-xl bg-dark-700/50 opacity-40 transition-all">
            <div class="w-7 h-7 rounded-full bg-dark-600 flex items-center justify-center flex-shrink-0">
              <i class="fas ${s.icon} text-gray-400 text-xs"></i>
            </div>
            <span class="text-sm text-gray-400">${s.label}</span>
            <div class="ml-auto" id="${s.id}-spin"></div>
          </div>`).join('')}
        </div>
      </div>`;
  }

  // ── Écran succès auto-approuvé ─────────────────────────────
  if (result.decision === 'approved') {
    return `
    <div class="space-y-5 text-center">
      <div class="relative mx-auto w-24 h-24">
        <div class="absolute inset-0 rounded-full bg-green-500/20 border-2 border-green-500/40 animate-pulse"></div>
        <div class="relative w-24 h-24 rounded-full bg-green-500/30 border-2 border-green-400/60 flex items-center justify-center">
          <i class="fas fa-shield-check text-4xl text-green-400"></i>
        </div>
      </div>

      <div>
        <div class="text-white font-bold text-xl mb-1">Identité vérifiée !</div>
        <div class="text-sm text-green-400 font-medium">Niveau ${_kycWizard.targetLevel} débloqué avec succès</div>
      </div>

      <div class="bg-green-500/10 border border-green-500/25 rounded-2xl p-5 text-left space-y-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-star text-green-400 text-sm"></i>
          </div>
          <div>
            <div class="text-sm font-semibold text-green-300">Accès immédiat débloqué</div>
            <div class="text-xs text-gray-400 mt-0.5">Vous bénéficiez maintenant de toutes les fonctionnalités du niveau ${_kycWizard.targetLevel}.</div>
          </div>
        </div>
      </div>

      <button onclick="_kycWizardClose();renderKYC(document.getElementById('page-content'))"
              class="w-full bg-green-600 hover:bg-green-500 text-white font-bold text-sm px-4 py-3 rounded-xl transition flex items-center justify-center gap-2">
        <i class="fas fa-check-circle"></i>Accéder à mon espace
      </button>
    </div>`;
  }

  // ── Écran succès soumission manuelle (manual_review ou submitted) ──
  // Affiché aussi bien après un vrai manual_review que après un échec auto silencieux
  return `
    <div class="space-y-5 text-center">
      <!-- Icône animée succès -->
      <div class="relative mx-auto w-24 h-24">
        <div class="absolute inset-0 rounded-full bg-purple-500/15 animate-ping" style="animation-duration:2s"></div>
        <div class="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-600/40 to-purple-800/40 border-2 border-purple-500/60 flex items-center justify-center">
          <i class="fas fa-paper-plane text-4xl text-purple-300"></i>
        </div>
      </div>

      <!-- Titre & sous-titre -->
      <div>
        <div class="text-white font-bold text-xl mb-1">Dossier transmis avec succès</div>
        <div class="text-sm text-purple-300 font-medium">Votre demande de vérification est entre de bonnes mains</div>
      </div>

      <!-- Bloc premium d'information -->
      <div class="bg-dark-700/60 border border-purple-500/20 rounded-2xl p-5 text-left space-y-4">

        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <i class="fas fa-user-shield text-purple-400 text-sm"></i>
          </div>
          <div>
            <div class="text-sm font-semibold text-white">Examiné par notre équipe dédiée</div>
            <div class="text-xs text-gray-400 mt-0.5 leading-relaxed">Vos documents ont bien été reçus et seront vérifiés par un membre de notre équipe. Ce processus garantit une validation soignée de votre dossier.</div>
          </div>
        </div>

        <div class="h-px bg-dark-600"></div>

        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <i class="fas fa-clock text-blue-400 text-sm"></i>
          </div>
          <div>
            <div class="text-sm font-semibold text-white">Délai de traitement : 24 à 48h</div>
            <div class="text-xs text-gray-400 mt-0.5 leading-relaxed">Vous recevrez une notification dès que votre vérification sera finalisée. En cas de question, notre support reste disponible.</div>
          </div>
        </div>

        <div class="h-px bg-dark-600"></div>

        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <i class="fas fa-lock text-green-400 text-sm"></i>
          </div>
          <div>
            <div class="text-sm font-semibold text-white">Confidentialité assurée</div>
            <div class="text-xs text-gray-400 mt-0.5 leading-relaxed">Vos documents sont chiffrés et traités dans le strict respect de votre vie privée, conformément à nos engagements de sécurité.</div>
          </div>
        </div>

      </div>

      <!-- Bouton de retour premium -->
      <button onclick="_kycWizardClose();renderKYC(document.getElementById('page-content'))"
              class="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-sm px-4 py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30">
        <i class="fas fa-home"></i>Retour à mon espace KYC
      </button>
    </div>`;
}

// ── Exécution de l'analyse IA ─────────────────────────────────
async function _kycWizardRunAnalysis() {
  const steps = ['ai-s1','ai-s2','ai-s3','ai-s4'];
  const progBar = document.getElementById('kyc-ai-progress-bar');
  const statusEl = document.getElementById('kyc-ai-status');

  const setProgress = (pct, msg, stepIdx) => {
    if (progBar) progBar.style.width = pct + '%';
    if (statusEl) statusEl.textContent = msg;
    steps.forEach((id, i) => {
      const el = document.getElementById(id);
      const spin = document.getElementById(id + '-spin');
      if (!el) return;
      if (i < stepIdx) {
        el.classList.remove('opacity-40');
        el.classList.add('opacity-100');
        el.querySelector('i').className = 'fas fa-check text-green-400 text-xs';
        if (spin) spin.innerHTML = '';
      } else if (i === stepIdx) {
        el.classList.remove('opacity-40');
        el.classList.add('opacity-100');
        if (spin) spin.innerHTML = '<div class="loader !w-3 !h-3"></div>';
      }
    });
  };

  try {
    // Phase 1 : Création du dossier
    setProgress(10, 'Création du dossier KYC...', 0);
    if (!_kycWizard.applicationId) {
      const startRes = await api('POST','/kyc/start',{ target_level: _kycWizard.targetLevel });
      _kycWizard.applicationId = startRes.application_id;
    }

    // Phase 2 : Upload du document
    setProgress(25, 'Upload du document d\'identité...', 0);
    await api('POST','/kyc/upload',{
      application_id: _kycWizard.applicationId,
      doc_type_id:    _kycWizard.docTypeId,
      file_name:      _kycWizard.docFileName || 'document',
      mime_type:      _kycWizard.docMime,
      file_size:      Math.round(_kycWizard.docBase64.length * 0.75),
      data_b64:       _kycWizard.docBase64
    });

    // Phase 3 : Validation sécurisée
    setProgress(40, 'Contrôle de conformité du document...', 0);
    await new Promise(r => setTimeout(r, 600));
    setProgress(55, 'Vérification de votre identité...', 1);
    await new Promise(r => setTimeout(r, 400));
    setProgress(70, 'Sécurisation de votre dossier...', 2);

    const analysisRes = await api('POST','/kyc/analyze',{
      application_id: _kycWizard.applicationId,
      doc_b64:        _kycWizard.docBase64,
      selfie_b64:     _kycWizard.selfieBase64,
      doc_mime:       _kycWizard.docMime || 'image/jpeg',
      selfie_mime:    'image/jpeg',
    });

    setProgress(95, 'Décision finale...', 3);
    await new Promise(r => setTimeout(r, 600));
    setProgress(100, 'Terminé !', 4);
    await new Promise(r => setTimeout(r, 400));

    // Marquer les uploads comme déjà effectués
    _kycWizard._docUploaded     = _kycWizard.applicationId;
    _kycWizard._selfieUploaded  = _kycWizard.applicationId;

    // DEBUG TEMPORAIRE — visible dans la console du navigateur (F12)
    console.log('[KYC DEBUG] Résultat analyse IA:', JSON.stringify(analysisRes, null, 2));

    const body = document.getElementById('kyc-wizard-body');

    if (analysisRes.decision === 'approved') {
      // IA a approuvé → écran succès vert immédiat
      if (body) body.innerHTML = _kycWizardStep3Html(analysisRes);
    } else {
      // IA n'a pas pu valider → le backend a DÉJÀ soumis à l'admin via _submitToAdmin
      // On affiche juste l'écran "Dossier transmis" sans rien faire de plus
      if (body) body.innerHTML = _kycWizardStep3Html({ decision: 'manual_review' });
    }

  } catch(err) {
    // Échec réseau sur /kyc/analyze (OpenAI down, timeout, etc.)
    // Dans ce cas le backend n'a PAS encore traité → on soumet manuellement
    console.warn('[KYC DEBUG] /analyze a échoué, fallback manuel:', err?.error || err?.message);
    await _kycWizardSubmitManually();
  }
}

// ── Soumission manuelle silencieuse ──────────────────────────
// Appelée UNIQUEMENT si /kyc/analyze échoue complètement (réseau mort, timeout)
// Dans ce cas le backend n'a rien fait → on doit soumettre nous-mêmes
async function _kycWizardSubmitManually() {
  const body = document.getElementById('kyc-wizard-body');

  if (body) body.innerHTML = `
    <div class="text-center py-10 space-y-4">
      <div class="w-16 h-16 rounded-full bg-purple-500/20 border-2 border-purple-500/40 flex items-center justify-center mx-auto animate-pulse">
        <i class="fas fa-shield-check text-3xl text-purple-400"></i>
      </div>
      <div class="text-white font-semibold">Finalisation de votre dossier…</div>
      <div class="text-sm text-gray-400">Quelques instants</div>
    </div>`;

  try {
    // Créer le dossier si pas encore fait
    if (!_kycWizard.applicationId) {
      const startRes = await api('POST','/kyc/start',{ target_level: _kycWizard.targetLevel });
      _kycWizard.applicationId = startRes.application_id;
    }

    // Uploader le doc seulement s'il n'a pas encore été uploadé pour ce dossier
    if (_kycWizard.docBase64 && _kycWizard._docUploaded !== _kycWizard.applicationId) {
      try {
        await api('POST','/kyc/upload',{
          application_id: _kycWizard.applicationId,
          doc_type_id:    _kycWizard.docTypeId,
          file_name:      _kycWizard.docFileName || 'document',
          mime_type:      _kycWizard.docMime,
          file_size:      Math.round(_kycWizard.docBase64.length * 0.75),
          data_b64:       _kycWizard.docBase64
        });
      } catch(_) { /* doc peut-être déjà uploadé — non bloquant */ }
    }

    // Uploader le selfie seulement s'il n'a pas encore été uploadé
    if (_kycWizard.selfieBase64 && _kycWizard._selfieUploaded !== _kycWizard.applicationId) {
      try {
        await api('POST','/kyc/upload',{
          application_id: _kycWizard.applicationId,
          doc_type_id:    'selfie',
          file_name:      'selfie.jpg',
          mime_type:      'image/jpeg',
          file_size:      Math.round(_kycWizard.selfieBase64.length * 0.75),
          data_b64:       _kycWizard.selfieBase64
        });
      } catch(_) { /* selfie peut-être déjà uploadé — non bloquant */ }
    }

    // Soumettre à l'admin (force_manual ignore les docs obligatoires manquants)
    await api('POST','/kyc/submit',{ application_id: _kycWizard.applicationId, force_manual: true });

  } catch(e) {
    console.warn('[KYC] Fallback submit error (non-bloquant):', e?.error || e?.message);
  }

  // Toujours écran succès — jamais d'erreur visible
  if (body) body.innerHTML = _kycWizardStep3Html({ decision: 'manual_review' });
}

// ── Anciennes fonctions maintenues pour compatibilité ────────

// Soumettre un dossier draft existant (appelé depuis _kycBuildApplicationCard)
async function kycSubmitApplication(appId) {
  if (!confirm('Soumettre ce dossier pour vérification ? Vous ne pourrez plus modifier les documents.')) return;
  try {
    await api('POST','/kyc/submit',{ application_id: appId });
    showToast('Dossier soumis ! Notre équipe va l\'examiner sous 24-48h.');
    renderKYC(document.getElementById('page-content'));
  } catch(e) {
    showToast(e.error || 'Erreur lors de la soumission','error');
  }
}

// Supprimer un document (draft uniquement)
async function kycDeleteDoc(docId) {
  if (!confirm('Supprimer ce document ?')) return;
  try {
    await api('DELETE',`/kyc/document/${docId}`);
    showToast('Document supprimé');
    renderKYC(document.getElementById('page-content'));
  } catch(e) {
    showToast(e.error || 'Erreur suppression','error');
  }
}

!function(){if(document.getElementById("wizard-overlay"))return;const e=document.createElement("div");e.id="wizard-overlay",e.className="hidden fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4",e.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:9999;display:none;align-items:center;justify-content:center;padding:1rem;",e.innerHTML='<div id="wizard-box" class="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-lg shadow-2xl" style="max-height:92vh;overflow-y:auto;"></div>',document.body?document.body.appendChild(e):document.addEventListener("DOMContentLoaded",()=>document.body.appendChild(e))}();function detectImpersonation(){try{const p=new URLSearchParams(window.location.search);const t=p.get("impersonate");if(t){window.__IMPERSONATE_TOKEN__=t;return t;}}catch(e){}return window.__IMPERSONATE_TOKEN__||null;}function showImpersonationBar(t){const b=document.createElement("div");b.style.cssText="position:fixed;top:0;left:0;right:0;z-index:99999;background:#7c3aed;color:#fff;text-align:center;padding:6px 12px;font-size:12px;font-weight:600;";b.textContent="Mode impersonation actif";document.body&&document.body.prepend(b);}window.addEventListener("load",async()=>{
  // Attacher les listeners du formulaire auth via JS (fallback robuste pour tous navigateurs)
  (function _bindAuthButtons() {
    var btnLogin = document.querySelector("button[onclick='doLogin()']");
    if (btnLogin) btnLogin.addEventListener('click', function(e){ e.preventDefault(); doLogin(); });
    var btnRegister = document.querySelector("button[onclick='doRegister()']") || document.getElementById('reg-submit-btn');
    if (btnRegister) btnRegister.addEventListener('click', function(e){ e.preventDefault(); doRegister(); });
    var btnShowReg = document.querySelector("button[onclick='showRegister()']");
    if (btnShowReg) btnShowReg.addEventListener('click', function(e){ e.preventDefault(); showRegister(); });
    var btnShowLogin = document.querySelector("button[onclick='showLogin()']");
    if (btnShowLogin) btnShowLogin.addEventListener('click', function(e){ e.preventDefault(); showLogin(); });
    var emailInput = document.getElementById('login-email');
    var passInput  = document.getElementById('login-password');
    if (emailInput) emailInput.addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });
    if (passInput)  passInput.addEventListener('keydown',  function(e){ if(e.key==='Enter') doLogin(); });
  })();
  await initRegistrationMode();const e=detectImpersonation();if(e)return await initApp(),void showImpersonationBar(e);if(memberToken)initApp();else{document.getElementById("auth-screen").classList.remove("hidden");const e=window.__REGISTRATION__||{};"M2"!==e.mode&&"M3"!==e.mode||showRegister()}});

// ═══════════════════════════════════════════════════════════════════
// EARNINGS & DOCUMENTS — Générateur de documents officiels premium
// ═══════════════════════════════════════════════════════════════════

async function renderEarnings(el) {
  el.innerHTML = '<div class="flex justify-center py-16"><div class="loader"></div></div>';
  try {
    // Charger les données en parallèle
    const [stmtData, ordersData] = await Promise.all([
      api('GET', '/members/earnings/statement'),
      api('GET', '/members/orders').catch(() => ({ orders: [] })),
    ]);

    const periods = stmtData.available_periods || [];
    const orders  = ordersData.orders || [];

    el.innerHTML = `
    <div class="space-y-6">

      <!-- En-tête premium -->
      <div class="relative overflow-hidden bg-gradient-to-br from-dark-800 via-dark-800 to-emerald-900/20 border border-emerald-500/20 rounded-2xl p-6">
        <div class="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div class="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <div class="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <i class="fas fa-file-invoice-dollar text-emerald-400 text-xl"></i>
              </div>
              <div>
                <h2 class="text-xl font-bold text-white">Earnings &amp; Documents</h2>
                <p class="text-xs text-emerald-400 font-medium">Official Income Documents · Registered in England &amp; Wales</p>
              </div>
            </div>
            <p class="text-sm text-gray-400 max-w-lg">Téléchargez vos documents officiels pour vos déclarations fiscales, preuves de revenus ou tout usage légal. Chaque document porte un numéro de référence unique.</p>
          </div>
          <div class="flex flex-col items-end gap-2">
            <div class="text-xs text-gray-500">Généré automatiquement par</div>
            <div class="text-sm font-bold text-white">${stmtData.company?.legal_name || stmtData.company?.name || stmtData.company?.network_name || 'LEADER'}</div>
            ${stmtData.company?.registration_number ? `<div class="text-[10px] font-mono text-gray-500">Co. No. ${stmtData.company.registration_number}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- 3 cartes documents -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">

        <!-- Document 1 : Monthly Earnings Statement -->
        <div class="bg-dark-800 border border-dark-600 hover:border-emerald-500/40 rounded-2xl p-5 transition-all group">
          <div class="flex items-start justify-between mb-4">
            <div class="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <i class="fas fa-file-invoice-dollar text-emerald-400 text-lg"></i>
            </div>
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">Mensuel</span>
          </div>
          <div class="font-bold text-white mb-1">Monthly Earnings Statement</div>
          <div class="text-xs text-gray-400 mb-4">Relevé mensuel détaillé de toutes vos commissions. Accepté pour déclaration fiscale dans la plupart des pays.</div>

          <div class="space-y-2 mb-4">
            <label class="text-xs text-gray-400">Sélectionner la période :</label>
            <select id="stmt-period-select" class="form-input w-full text-sm">
              ${periods.length > 0
                ? periods.map(p => {
                    const [yr, mo] = p.split('-');
                    const label = new Date(yr, parseInt(mo)-1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                    return `<option value="${p}">${label.charAt(0).toUpperCase()+label.slice(1)}</option>`;
                  }).join('')
                : `<option value="${new Date().toISOString().substring(0,7)}">Ce mois</option>`
              }
            </select>
          </div>

          <button onclick="generateMonthlyStatement()" id="btn-stmt"
            class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm">
            <i class="fas fa-download"></i>Relevé mensuel PDF
          </button>
          <button onclick="generateOfficialLetterMonthly()" id="btn-letter-monthly"
            class="w-full mt-2 bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm">
            <i class="fas fa-file-contract text-emerald-600"></i>Lettre officielle (fond blanc)
          </button>
          <div class="mt-2 text-[10px] text-center font-mono text-gray-600">STMT-YYYY-MM-MXXXXX / LTR-YYYY-MM-MXXXXX</div>
        </div>

        <!-- Document 2 : Annual Income Certificate -->
        <div class="bg-dark-800 border border-dark-600 hover:border-rouge-500/30 rounded-2xl p-5 transition-all group">
          <div class="flex items-start justify-between mb-4">
            <div class="w-11 h-11 rounded-xl bg-rouge-500/15 flex items-center justify-center">
              <i class="fas fa-certificate text-rouge-400 text-lg"></i>
            </div>
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rouge-500/15 text-rouge-400">Annuel</span>
          </div>
          <div class="font-bold text-white mb-1">Annual Income Certificate</div>
          <div class="text-xs text-gray-400 mb-4">Attestation officielle de revenus pour l'année fiscale complète. Idéal pour déclaration d'impôts ou obtention de crédit.</div>

          <div class="space-y-2 mb-4">
            <label class="text-xs text-gray-400">Année fiscale :</label>
            <select id="annual-year-select" class="form-input w-full text-sm">
              ${[new Date().getFullYear()-1, new Date().getFullYear()-2, new Date().getFullYear()-3]
                .map(y => `<option value="${y}">${y}</option>`).join('')}
            </select>
          </div>

          <button onclick="generateAnnualCertificate()" id="btn-annual"
            class="w-full bg-gradient-to-r from-rouge-600 to-yellow-600 hover:from-rouge-500 hover:to-yellow-500 text-dark-900 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm">
            <i class="fas fa-download"></i>Certificat annuel PDF
          </button>
          <button onclick="generateOfficialLetterAnnual()" id="btn-letter-annual"
            class="w-full mt-2 bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm">
            <i class="fas fa-file-contract text-yellow-600"></i>Lettre officielle (fond blanc)
          </button>
          <div class="mt-2 text-[10px] text-center font-mono text-gray-600">AIC-YYYY-MXXXXX / LTR-YYYY-MXXXXX</div>
        </div>

        <!-- Document 3 : Purchase Receipt -->
        <div class="bg-dark-800 border border-dark-600 hover:border-blue-500/40 rounded-2xl p-5 transition-all group">
          <div class="flex items-start justify-between mb-4">
            <div class="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <i class="fas fa-receipt text-blue-400 text-lg"></i>
            </div>
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">Par commande</span>
          </div>
          <div class="font-bold text-white mb-1">Purchase Receipt</div>
          <div class="text-xs text-gray-400 mb-4">Reçu officiel pour chaque achat de package. Prouve votre investissement. Peut être déductible selon votre pays.</div>

          <div class="space-y-2 mb-4">
            <label class="text-xs text-gray-400">Sélectionner une commande :</label>
            <select id="receipt-order-select" class="form-input w-full text-sm">
              ${orders.length > 0
                ? orders.map(o => {
                    const d = new Date(o.created_at).toLocaleDateString('fr-FR');
                    const amt = '$' + Number(o.amount_usd||0).toFixed(2);
                    return `<option value="${o.id}">${d} — ${o.package_name} ${amt}</option>`;
                  }).join('')
                : '<option value="">Aucune commande</option>'
              }
            </select>
          </div>

          <button onclick="generatePurchaseReceipt()" id="btn-receipt"
            ${orders.length === 0 ? 'disabled' : ''}
            class="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm">
            <i class="fas fa-download"></i>Télécharger PDF
          </button>
          <div class="mt-2 text-[10px] text-center font-mono text-gray-600">RCP-XXXXXXXX</div>
        </div>
      </div>

      <!-- Info légale -->
      <div class="bg-dark-800/50 border border-dark-700 rounded-xl p-4 flex items-start gap-3">
        <i class="fas fa-shield-halved text-emerald-400 mt-0.5"></i>
        <div class="text-xs text-gray-400">
          <span class="font-semibold text-gray-300">Documents officiels</span> — Ces documents sont émis par 
          <span class="text-white font-medium">${stmtData.company?.name || 'la compagnie'}</span>
          ${stmtData.company?.registration_number ? `, enregistrée sous le numéro <span class="font-mono text-emerald-400">${stmtData.company.registration_number}</span>` : ''}
          en Angleterre et au Pays de Galles. Chaque document porte un numéro de référence unique et peut être utilisé comme justificatif officiel auprès des autorités fiscales de votre pays.
        </div>
      </div>
    </div>`;

  } catch(err) {
    el.innerHTML = `<div class="text-red-400 p-6">Erreur: ${err.error || err.message || 'Erreur inconnue'}</div>`;
  }
}

// ─── Helpers PDF communs ───────────────────────────────────────────────────

async function _loadJsPDF() {
  if (window.jspdf) return;
  await new Promise(r => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = r;
    document.head.appendChild(s);
  });
}

function _hexToRgb(hex) {
  const r = parseInt((hex || '#D4AF37').slice(1, 3), 16);
  const g = parseInt((hex || '#D4AF37').slice(3, 5), 16);
  const b = parseInt((hex || '#D4AF37').slice(5, 7), 16);
  return [r, g, b];
}

function _fmtMoney(v) { return '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function _fmtDate(v)  { return v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
function _trunc(v, n) { return String(v || '—').substring(0, n || 40); }

const _COMM_LABELS = {
  prime_leadership: 'Leadership Prime', bonus_influence: 'Influence Bonus',
  bonus_rayonnement: 'Rayonnement Bonus', valorisation_recommandation: 'Referral Bonus',
  fast_start: 'Fast Start Bonus', credit_croissance: 'Growth Credit',
  reserve_strategique: 'Strategic Reserve', admin_credit: 'Admin Credit',
};

// ─── Fonctions PDF déportées ───────────────────────────────────────────────

function _pdfDrawPageBg(pdf, pw, ph, co) {
  const DARK  = _hexToRgb(co.pdf_color_dark || '#0A0A16');
  const GOLD  = _hexToRgb(co.pdf_color_primary || '#D4AF37');
  pdf.setFillColor(...DARK); pdf.rect(0, 0, pw, ph, 'F');
  pdf.setFillColor(...GOLD); pdf.rect(0, 0, 1.8, ph, 'F');  // Barre latérale gauche
}

function _pdfDrawHeader(pdf, pw, co, member, docRef, docTitle) {
  const GOLD   = _hexToRgb(co.pdf_color_primary || '#D4AF37');
  const ACCENT = _hexToRgb(co.pdf_color_accent  || '#34D399');
  const GRAY   = [140, 140, 160];
  const DARK2  = [15, 15, 30];
  const WHITE  = [255, 255, 255];

  // Bande de fond en-tête
  pdf.setFillColor(...DARK2); pdf.rect(0, 0, pw, 30, 'F');
  pdf.setFillColor(...GOLD);  pdf.rect(0, 0, pw, 1.2, 'F');  // Trait doré top

  // Logo (depuis DB ou logo LEADER par défaut intégré)
  const _logoUri = co.logo_data_uri || _DEFAULT_LEADER_LOGO;
  try {
    const _fmt = _logoUri.includes('image/jpeg') || _logoUri.includes('image/jpg') ? 'JPEG' : 'PNG';
    pdf.addImage(_logoUri, _fmt, pw/2 - 19, 5, 38, 10);
  } catch(e) {
    pdf.setTextColor(...GOLD); pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
    pdf.text(co.legal_name || co.network_name || 'LEADER', 7, 12);
  }

  // Titre document (centré)
  pdf.setTextColor(...GOLD); pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
  pdf.text(docTitle, pw / 2, 12, { align: 'center' });

  // Ref & date (droite)
  pdf.setTextColor(...GRAY); pdf.setFontSize(6.5); pdf.setFont('helvetica', 'normal');
  pdf.text('Ref: ' + docRef, pw - 5, 9, { align: 'right' });
  pdf.text('Generated: ' + new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), pw - 5, 14, { align: 'right' });

  // Bande membre
  pdf.setFillColor(20, 20, 42); pdf.rect(0, 21, pw, 9, 'F');
  pdf.setTextColor(...ACCENT); pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold');
  pdf.text((member.first_name || '') + ' ' + (member.last_name || '') + '  ·  ' + (member.unique_id || ''), pw / 2, 27, { align: 'center' });
}

function _pdfDrawFooter(pdf, pw, ph, co, pageNum, totalPages) {
  const GRAY2 = [100, 100, 120];
  const GOLD  = _hexToRgb(co.pdf_color_primary || '#D4AF37');

  pdf.setFillColor(18, 18, 38); pdf.rect(0, ph - 14, pw, 14, 'F');
  pdf.setFillColor(...GOLD);    pdf.rect(0, ph - 14, pw, 0.8, 'F');

  // Infos légales compagnie
  pdf.setTextColor(...GRAY2); pdf.setFontSize(5.5); pdf.setFont('helvetica', 'normal');
  const line1 = co.name + (co.registration_number ? '  ·  Company No. ' + co.registration_number : '') + (co.vat_number ? '  ·  VAT: ' + co.vat_number : '');
  const line2 = [co.address, co.city, co.postal_code, co.country].filter(Boolean).join(', ');
  const line3 = [co.email ? co.email : '', co.website ? co.website : ''].filter(Boolean).join('   ');
  pdf.text(line1, pw / 2, ph - 10.5, { align: 'center' });
  if (line2) pdf.text(line2, pw / 2, ph - 7.5, { align: 'center' });
  if (line3) pdf.text(line3, pw / 2, ph - 4.5, { align: 'center' });

  pdf.setTextColor(...GOLD); pdf.setFontSize(6); pdf.setFont('helvetica', 'bold');
  pdf.text('Page ' + pageNum + ' / ' + totalPages, pw - 5, ph - 3, { align: 'right' });
}

function _pdfKpiCard(pdf, x, y, w, h, label, value, color) {
  const DARK3 = [28, 28, 55];
  const GRAY  = [140, 140, 160];
  pdf.setFillColor(...DARK3); pdf.roundedRect(x, y, w, h, 2, 2, 'F');
  pdf.setFillColor(...color);  pdf.roundedRect(x, y, w, 1.5, 1, 1, 'F');
  pdf.setTextColor(...GRAY);   pdf.setFontSize(5.5); pdf.setFont('helvetica', 'normal');
  pdf.text(label, x + 2.5, y + 7);
  pdf.setTextColor(...color);  pdf.setFontSize(9);   pdf.setFont('helvetica', 'bold');
  pdf.text(String(value), x + 2.5, y + 14);
}

// ─── Générateur 1 : Monthly Earnings Statement ─────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
// LOGO LEADER — Intégré par défaut (PNG base64, fond transparent)
// ═══════════════════════════════════════════════════════════════════════════
const _DEFAULT_LEADER_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAB1CAYAAACSy58dAAA1wklEQVR42u29f3ydVZXv/15rP+ckaQu0TUspbVLEKpC0gFbkp1ZHZxjH67xmRlPGGb165zqojD9AhBaYmTRfUQqKjIO/HcerV+dqo150HGW8OppxrijcMmKbFrGAtAUE2vKjtEnOefZe3z+e5zRpoTRp0uQ5J/vzep1XmtOT5Jy9117rs37stYSIiIi6Rhe4XvCrF7fe1OT05VUzD2gR3puBlQWpeHvnuh277ugG7YEQd228WJlkX/uMbD0trknENIHCSoXjDXpr8l9IJFLq7APR4rwl8+AS8D+0an83dCv01IlC7nLQ651b3hVULgVfBXHxPBzOBosidp9VNr0lNxQSDcbYyNVVbXN/t+T0UjNIRArz/gLQrELV/CuBO3LiNxXnWQCTcuenMV2W6Rm0gFuagg2C7MXYjYRHxOShoGzH2E5Vt8HGx6EvfabueVSgL1CXBDbTnZp0/JVJ8mdRd45KdQZQB/4Oq26+7DnOVib7pc6Pg55ZYNkHqILtQ+RpjF0i/BbjwRDsPhK2MzS0A7YO5XI+4vOtdEWU/UREX56tf4HsLQ6zdHf2/WapH4F/VABMwkki5fOGuULEYR0Sq54YGdXYmekq4PIFC2Yi6afMsCJFr3L4iuFAzh/BuaYQco6IO6PYHERGfHEgoBiIQdl2G533g2ySEO4I6M9JmzZD775nevh9vn4clZrulFNFXNSdY7KVNtqFOlvEvaT4/FsO+IKAOgPzVUrNDxvL7gb+n4ndRsVvgLsfHuFwFIpsJWAVsCJ5CimEBNG99Sv4MgTBg6VgSVQEhw1yKMKeuBRjw9osepVeVfZrW1Sfvy+YFyiUvBmQGmrw4ssWL27p2bFjgKmNUD6dn01fML130Kod+A8QydnWXEHngqxA3VuUAKWhbSadPxOTfw3O/5DBLQ8Me/hdDnoBfJ3ozsGoO0fvvEBwmUyPam3rSfYPln8FKSHSLkg7yO8JBmV5ymzZnWLyvSB8j+rGjcNka+plP8kWukihWMtoOab1K/eWK0OzGOYelbuiFDdkXUh0geuBdM3i1rOccNlgRq60gJur3swcLGrRwdOAO7tBeqaMYJnmZzMPDxXYgz+kfjTL0kMAkmRGx7UjrNLAXit13iZob6j6b0Pvb4d/aZdCb8HrtaLuHCMZGYOtrHfZJ5f9YNRKS5BjReQViLxC8R+yUuftIro+qP8mg73bDrIxk060olGLiKhPUko3JKLyKRVxPnuukDkVA19WETM7O+qdiXJIJMkekJGt1GcPZoq4VyP6GS25fikv+wLJ8pdn29Cbpwy7InGJqGfZd7nsa0a4vIc0BZyIOxf0Jg26UcrLv0TScUHORH3+85Mq+1HRRUTUGdaD9oIfWNz6vhaVFRUzr3Vwlg25AGBzvMBwFPS41DIRNYPjEeYK7q2q9El52b9T6rwoMzC9NU8+Eq2IBiBd+wmXZSnQ1APHCvpmVfcTKS37AeVlrx1BtCYtYxIJVkREHaEbdBX4v1407wUlR/dgsFAH51hTA7CzuiHpHfYmI46ewcnTbKkHM0FfppJ8VcrLbqfU8cb8tZNqbCIijr7sM8LRyGVf9FWKfkdKy35AsmwlWd1vGG51EglWREQE0JkTk9TxyZLojJAVrRSarAhIaoaInFxZ2Lo0J4qRYE0a2UJqUS1BX6xS+icpLf8prvPCyTQ2ERFTJ/shiOirVOXHUl7+ZZo6n58Xw8vR5EGRYEVE1AnWg1sF/srFc/9bi8qrB4OlUh9pHjHwTSrOSpwVdc+UbEHu2YcAqReRc9W5W6W8/Ks0dSydDGMTETF1so9mRMtM0D/XIP9Pk85L8xccNQcjHqaIiDpAN2gXhO4l808oqX64YnWRGhwJy6rwszqsiCmDDhOtEAS9SE3v0GTZe8hqVGI0K6KRiZZk9YkyG01uktLyf6Pc0ZE7GPn/R4IVETGt0Jk1QrJBH/6urNLqDZP6Or/qDczs7Hxcjo+7OtVEC83qVGQ26j6WFQOf+sLM2HRNuLGJiCgO0TKDNBWRVyjuNkrL/oJMJ9lE8qJIsCIiCo6uPDW4uq31dc1OL8p7XtXVDbBaHRZwyuDCOYsB6476p2DGRl+llH6mpWVvGnHTMO5RREMKfnbz0HvgWBX3eSl1fho6ykCYqFYm8fBERBRcEXSAdS+de6yK3BzyDoxH8otsaocCZ3VYTptV5SUwXLAfUShjMwdx/1NKnR8jI/Eh9s2KmAYOhhdJ3i4l/QEtL1iUORjjT5VHghURUWB0Zx3bw+CQfLBFZUnVjqxjuwElEZWM6EwJLG8lLarnAfRHglVQY+O9SPIeKS37PnScMFHGJiKiwA6Gy6O4L9O0+d8pdZ6RpcrHJ/eRYEVEFBS1cTjvb59zfknlkoEjTA0ahESEqoWfBWyfm6JIloAEA8POBVgb67AKamzIjY17pZbcv1M6rXMijE1ERMFFPwGfInKyov9GctrLxiv3kWBFRBTX0NHdQbmMflIRHfn8WDlWWUCRazG7pFlVbWrIjaZmGLLs8pMXHC/jSHdGTIaxSVNEXqC4H2UjRyLJipgWJMsjzFVx38Od9qrxyH0kWBERBUQ3uF7wQ0/NW92senrFrHaN+EiYmg4FM0J4bN323V/c6/0/zFBJDNLJ1l4eQlnl2FK1eiZAb9RBdWBsZL6q3uqalv1uJFkR00DuHVhAZKY69y2S014+4mZtJFgREfWMWmrwqva5HU65epy3Bk1BfOCJQV+5rxu0afuudw56+1Hz1JCs4AQEiXVY9WRskJlm8m2aTnt1JFkR0wBak3uV5NuUTntRVos4NpIVCVZERMEsWleNGZl8qqTSHPLnj4hdgTkRELv/ow8/vROgB7w1JRdVze4riSSTnC4UA0w4v0a44pbXi7GhWc3dQtJ5fiRZEdND7oNH5DjB/TPNnW15+xIdwy+IiIgoCrrznldr2lrf0eL05RMwDie4rP7qbshaI6wHvW7rbx8bqsrrzWyvE8Qmr+hd06zS/YzVJ885rgdCrMOqG2OTe/T6reHC99jCIaKh/V2X3ap1iyRwC5w+kzE4vJFgRUQUh1zpWvBXLpq7WEWuqwQLTFBD0UDYBFlKbhX4bkg+8tBjv6j48F8dojrcxfjoqiuQFKykMl/TZBnAqqiH6sXY1Dz6VsX9MyxbMFaPPiKiPklWmgrJi6Wcfp5snNSoJh3EgxERURDUxuGoyt83qcz22fy+cUV3hlsjyKb8bxhAD6TdkNzw4O5vVoK/Oq/HmqxUoU9EMMK5AB0xglVvHn2KuOdJ2b6edb7uEuIeRjS23CeQVoXSRdmQ6L40J1mRYEVEFB3ra+NwFs19fbPTP56gcTgm4CpmaclxD0D/iChVjWSt2777un0hfGkSbxZmzU5NzgfYPHXd5SOO3NikQnKBlOTmvBFpTBVGTAO59x7VGygtXzFiQHQkWBERRYWB9IOtaT9ujjr9WGo2If2hDExFAH47J23ZlpOqA8jMWvBd4PaWd1086MNtkxTJkjR7Fyu6lyxp7s3+XoyA1CPJkuRiLXW8NdZjRUwHoc/Up5RUwhdgadPw85FgRUQUEr2gPRDMkuubVRalRpAJOJsC5gTM7N7Ld+wYyIcr28Gv6QC7eStDJXhDNdiOkogLR/F2n4B6M1Nh8WB172kA3ZFg1aO9ceADoh+nfPoLYz1WxDSR+RSS5VJq6gY8dGkkWBERBcRwarD1FWXVv8xTgxNyLmuz/xDb/FznvQfCenA923c9VA3h9WY26PKfP1qf28A3qYg4Ozvqorr26A3cTCV8IdvDWI8VMS1IlheR91NadnruWLhIsCIiCnZSe4HuJUuaReVTcoDhmsA/YrLxcK+p3Sy8Ycfu29NgbyurqEzCzUIlq8PqjHVYdWxs0hTceZp0vj9vxhjtSkSjOxaAKyn298+t3yIiIqYE60F7wQ/4p/9mhpNTxzMO5xBwadbVczMcvph8f9H7jl1fGfTh2pajW4+laTb4+aXdK0lWxcHPdU6yQkClm/KpL4TeMMFyHBFRRMfCI8lKysvfQJYqdJFgRUQUAN2gq8BffeL8M8sqV0zQrcGRMAWpWtjnLdwL0DGKKFFPHslat33X3wyE0NtylG4W5nVYIHLyvl+3Pr+2JlEy6tWjDwZuhpj7O8CgK65KRKOLvYCZWrg2K3jvDRyUfYgKLSJiCk5mZzYSxwVnn3IipfGMw3lWdlUbkWOy/f4Hdz+ck6fRpOFsbUaytFwtv3XQhzubjlIkK2R1WEmScFbUR43h0Yu411DufN2RzG2LiKgzaHbJIzmFUtObM7V7YLuSqNAiIiYZ6/Po1fPa5r27xck5QzbucTjPSpRcVm58T2/eioFR1jlJrRnpww/vC5q+Pg32SCLibOJvFlrGKOX8KBWN4tFjCtfBihL0GrHgPaLhZd5M4Iqs6W7fAS1nIsGKiJhE5KnBcE37cc9LxD4wFCzI0alXsYxf2SYYe7f02s3C6x948jeVwEWYpZpdGZvIYnT1BmZ2DiA9sQ6rMTx6kk4tDbwJCLHgPWI6yLxI8kJK+kccFMWKwj89EQr6aHh0ZkTHUks+XladFfLOdRPuV9W6pQubjvR31G4WfnjHzr5q8O8sqziZQBIkIKkZwKmrF85pAyzWYTWGRw9yNSxpfra6lKg7J/ohIcrdlMo8YCbCe7Pv+0IkWNNbIBS0KI8EVDFmNPqq7+95taT1z1qc/sFgOCqpwf1nuxqMgGwZYRjGjNrNwut3PP4Pg95unOCidzHwTU6b1emLRxDQiDr36JFkKaVZqzKPvpGiWIXSnaXsq7VEsZtSOAgIci5Jx0tzXesAkrg20xBmD5iEp3iWzt5T8W7yfpi/buQl7wbtB7vqhFnz1fhoioWj5eBkBe5IMHaJVX8DsBas5wh/Xw/49eBWbd/5/qvaWk9pcfpfBjJymEzIe80CH+cDt/RHgtUwHr0KlwX4Sh7FahDVaVuRMFAQ3RkwEkx+FWVuyiXDg0tE/VsMboeVAn2RYE0zBFAVqV4SKlu+CyuTvCivEBp5hMJquKaTnSCrwK8pN32krLpgYOLbMhxw2h0iHrt/3bYnHyfP24zn9/XneZ81T4c3DR3D/y2LdlZs/J9BQLJupnZuTgR9TzynDeDR+wDuTJo6X8VQ//ezG4W9dV9jZ9gbqPTflUcoikAcZYS+jKnCqduGLIpl8sdGx2roe5os3BkxHel29uUVYQSxmcpHoIE7eXflqcGrF8+/sKz6XwePMrkCUiekYmwB6J6Av9UDYRXo9Y8//mRI5U+C2eNORCfgZqGmwQBZftUJs+bXCnim55k0T1bj1gjnIYAggXc01jZpGEFmou6c0AiQ1bPsC4SAuIWU5ZXZUytdJFjTmHLDjzX3gIrwaFSrKQCXL1gw0zR8wmziCYRlXR5TAy8gTqTcrJIYYUJTB721JqQP7bwntfCngpkeGHk8Ijn0EMoqx1IqnwmwanrWhgo4B+pyx1cyY2NpfUYmco9euJDmzrbGGQRtNX0VdeeEwrlc/rXW7qMOZT+AmMAf7afjkWdM5yjW8UXwwMZroAuNteB6wZfKvqdF9flVszABw5wN8LVi85KItqgkzSrOoBrM+p/24csJdssIb3tCsH+czvbd3696ubQp+5vjTf2ERMBEz4Oxt5RoEA6+xyzcavifYeE+YDAzNkmSE66Qe/j15NGnkMzQYG/IPXptnD0j6s6Jk/2nzfx3zcK/Gv5OzH6bkawkyYv4fX0QLVEIIsbvZJ3d+9JYgxURcZTQBa4H0jWLW89KhEvz1OCRGhkji1SZQFIWcSpQCYY3+1Ua7CcoP0q93DHjwZ339oxQSD0TrJxqJKtnx2M3r26be+pM5y7ZN46id8nvmQt23kQTwjoxMgJ2n1U3vSZ7oqNMs53ggp0eTH4HeK2IvjBfmlA/znFW+mcmq4CbRl5fj4jYL/tm26za/9rhJ8+YTeJPU/W/a9AluGXZ/3ifRUYLi6xVoOhJJE2nk3JHJFjTU65dVuC+x2W3HSYbfZ4GjloN8wbohmRI+LQTcVWzoGOMzuQ1TkEgKYk4JzAUrFoN4XYzudWwf713x667eqEy8ufWg+vKfu6orHPtZmHv9t3vWdo+74XNKq8ePEKSZaCpGcF4UffSucf2bN39FAcW706HM6nsv5m2ucIg2zxsA74Di6/R8uwLzXgXoq/KuXbRjU1ucAIissLKp7+Qyi/vyT9jHRMtzXXnYwrzp+BzNKLuNOWASRN3PUHKbQFug451UqIL+BskOSUjWfvTs0X8LB5covgLApFgTUuIypPQl3IUhvhG7Cc4ugr8mvbW1S2qLx4I5nVsxeYeIBFxZUEHg1nV7OcB+7oJ/3Ldtl13H0yo8hYHoQds1dHvim79YL1ga9KhP60m5Z+VRZcOZSRyTNGVrOEoVlKdP1BhGfDTLtDe6dfZ/aDoVJfAowJ9A76y4xbgFsqdf6ImH8qMTVp0kiVZHU1S0lC9MMA9WZqwjiNZKo/nujNi4mW/1nQ5r3FbKdBXCVW+Aqd8W0ryIRF914gobmFLCUzlXOCmSLCmGbcCwwf3Rk06l4Mkk+tNioG5kIRbGNy8rVGjFN01cnXivBc6sb+tjD41aJZFnVxZM8OZBrtvIPCNRPjaB7bt3DByMfPbgZNFqJ6BHghd4NY9tGfX6sVz/kRU/m8izPSGydiVny8JSYqdA/y0Y3r3w8pra3pHnNsuhV6j0v/NwNIfSNJ8o2jytqwdQvGLnU3kQuDmek8TSkjfLknHjqw2aNJ1l4Q0/Se4exeNHeG1zMHsy2V/pYO+PVbl3ZYsu0dV/z6L4BYxkiUKhhhnGB3lSLCmIcES9J3oVMmlQrV6L7AtNxoNF6XY34084RMl0RmDWb8oeQ5tYoBXSJpV3FAwS4N9P5j/x0ql/C83PvLI3mchVaGnABHI2s3Cnh2Pb1zd1vrmJtFbDEste59jETIxQAIXAB/dPK3Sg6MxOLVzsjKBvqcs5S8l6diMJh8ttke//zbh2caK42DDk/VMDkTcmuyS2xShNPTvVGl0gnWQ7Pel2eddkZBuuJmk06PuE9klisL18pTsMqG0UfYnRYI1LRF8FiyZfP8PgnJQvVAjYf84nMVz/6JF5dXP1fE8J1bBCa4smlRCeKIS7KsB/mHdiGhVd/bzhSFVB6MH0ouhdP32Xd+6cnHr6lmJXn8ERe/iDQxb0b2E5p4HGGTa1WGNBjVjs9KFtO8mLS17EtHP5x59EdOFeWsznUcydCYpfXnkoU4dKz/FNVDJdE1PGmxIYUUppBs+KaXOU0SS9xQwTZ7rLGlxuBfGNg3TEy5LD072g/yrNWT6pzYO5+r2eQud6ocrxqHG4ZhlzUClRcWZ2aOVYB8crKRnfnDbzneu27ZzQzfo+jwK1ANpT8ELgz8L1W5Ibtix64aBEL4wQyUJYyCDkhW6m4q0VTnu1Hw949ic5/TqV5RCddM/Qnh/1kPICmp8zYOi2Euz71fW8b7KFOlOaWjdOTaS1eWsOnQl5rfkqdqCkXULIBicFglWRMQEoTMjQ8FjNzWpzPVmdlDtldWagbaoJJg9Ug32t+bc6R/c9thf3/jbJx5YD64bNO+cXlc3hnrAd4HbNX/X2wdC+I+ZGckaNTE08E0qYiE5O38q6qfnxIYUViahsulGo/qlrG9QcXtlmZATrONjVDJiHCQLYOtQkLAmbwVSSNJpxtKowCIiJgC1cThr2lr/sFn1ooPH4eTNOKVFxQk8MRjCB4NzZ1y7becHrrv/0Ue6IbF8XmFP/V5jtw6wz24gFWTVUAgbS4KMfZyOnJ8T1miID2ts+jygVqm8G/MP5B59weQnL/xFOjPS3OuJ0cmII0Y+FaCy+TuG/wW4gsl8rUjPTooEKyJiAk5UB1j30rnHisjfhxHjcHJy4ZtVnIIfDPbZVKovum7brr8eSax6IJUGIRTdIB/atvNhH+SniYiMQflpmhWmvbQbkjyCFw3xYUlWl8DWp4KE9+cefdHkSPKm3W3M6Dg+blnE+LFSgSDol/Kyp1C0YymiCyLBiogYP6FwPRAGh+SDzSpLqtmtQTXwiYg2qbg0hFt9sHOv27bz7dc/8ORv1oNrNGK1Pl+HzZBc0z7vi02JvH0wWBhtsXvWD8sQ4flDJ847uUbWooSNxqPvclQ2f8PwP8/qsQpVl1Kb4T2Lii2pkem4bxFHjqzdR8D/a97hPaE4elRyjjU73iKMiBgHauNwrmqff74TuyRPDQpgLVnLhQeqZtd8cNuur9RISP8U9a06yiQzWQXpe553/IJjffhqWfUVAyEckCYdjWKyLNqXDCbhLKABOn9PFh4VwMTkowhfG+7ZWBiPPoA6FT0pwM/zJpJx2yKOWKAAqLCVkm1H9KQ8clscoRc7NhKsiIhxeirvXrq0icrjn1JUq2aVJpVywKh6u3nAKmtv2vHU7u7cY1/VgN3JuyHpgfT9i2af3uT9NxLVpftCONLZhJa1cZbzga9EERu1R+8BQlX/RUv+IURPLJjBybLmwpK4VxETRLAUNleMZfcLclI2qrUQ4l5LSjRHghURceTEwvVAurryxDXNqssHvFVnOi1XQvilF7v0uu27fgTDvbEakWDW1uDq9nmvVfiyisweHMfgZ0C9QTA7J5+C7KOkjdbgdDno3WvSeaugf5H3CCqUjjeTE+NWRUwMuiSbdmBPDJe8Fko9upgHj4g4kqOdE4sr2+Z0OrHVqUFJKQ0Ff9PAkDvvugd2/ahWZ9WI5MoyciU9kK5pn/suFflnE2ZXsvqzIzbqI+qwTv3r589ZDMMXBiIOh0cFEDH94fByFo2SW17kHls1REyYUBW2hCBGsCIijuBEd5H5Toq7+RinM/ZUw/1B/SXrtj1+a42ANWjUim5QyYezXt3e+tGy6mVDwcyy9N54uypLAN8k2jJY4cXA9t667vw9megLgAX0Ls0Kf4vW4RqM2dm3vXG7IsaJ3pyk24yCOhQhRrAiIsZOMGo9r94xp+ReuSf1X7Nqcva6Bx6/NR9rI70NSghqNwWvaG095pr2ed9sdnrZYMiaW8rEKThTAcn7YfXHCNao1w2AarIDs93FS5sYwMwD3mtExJET9gCICG35pQ4p1DnEhmIEKyJibORKeyC9YtG8Fwh209NpesWHtu36SI18rCrgrMAJ/OzJKkgvbz/ueWWkt6yyYp8fV73VoTSnBAMROxdgbdZ8NWLU2PA0dO4G5lOY64RS+1KOBCtiggTKaHnRQnzlebk4SaHenrE3RrAiIsaIyxcsmOkclxtc9IFtuz7S1cC1ViPJVQ+kV54457xmSv+RqKwYCBNPrnLLqykGJsu7F86aJ7EOa4yeM96EfcVcMnFxmyLGj5UKCD49H9zMfERUwQTenooEKyJi9NZLeiAkzYPzQW9Yt33Xt7sh6c3mCzaqRy7ra7cll7T+WbnkfqAiJw6F8RWzH8b3E2+EkspxQ6XymQCrYmPKiIiI/TjeABMLf5YHs4qkfy0f9vxYVFoREaM3/AZw/QNP/mbdtkfvq90kbNTPO7J319Vt865pRr8SoKViFiagmP1wCE5A0PMAOmIEa5QiCoATY2YxOb/FywoR44VCb6C8/BQRfQ14K1hk1PLTuC3WYEVEHKGLMhU9mgxkLUgnSK34e3M+ZHkih0Tn5NFfDKXWttZPNjl522Awb9k04aPumEl+99qw82qEK0rdaLFiFgzNPYh0FcLmYAyNeF+xDiviCLBSoS8VC9ciSVPe761ABGu/rN8XCVZExJERgKNuHLpBN2eDpKUzH6+T/117jgiGTcDfTXogffcJs+YfV27+p7LTV+/zWWf2ybLWlvfDwjjzitbWY3p27doTjfJoxBKjtLcNSeYWsvAX9uUUXmKrhogjcB5K0FfFdbxBxL2B4rUjoXabUZBfRYIVEVEQdIPWIlM9kD5bRKp78bFzB115iQvWbsjJiC0Wo92EWZZW3rTuoT278uiaHeF7SGoNVEvivl5SObVGribZFKs3LFFZwCy/jF3c1gXaG/thHc6zN0jOAKcF8+xraZPH4z5FHDm52lCldOoyRT+XzbcsZG2mQkgDsiUSrIiIKXR1ukA7MkLlDyZU3YvmLq6KdZroi0Q4w4xTh0TanTG35DTXLEIiwtM+7Gh6aM+T4whZ7B97c+XiOReW1f2TInOP1k3BUcKXRJLUu3OB22Id1uFQK/y1V+9v61k0mDyW/ePRuJcRY/C3ViSwoUq58zQ1/RdEZoMPBep9NcKREMHCI1QHt0aCFRExdaQqHRmRueak2UvEJ2cH5eUY51SwU0riZiV5OMobeIxgUMnqoQzwTUJiZrf3QNoFbqxRnlpdVw+ka9pa31FS+bghbrxjbyZQZ50PfHRzTA8exgj1euiYJSIX5j0YC+fdi9iDcRMjRifPSK3eCjZUaer4fTX5IiLHFzM1CEAAcQZ3w9anIsGKiJgE5DfydCSpuhhKre3zXyoWfg/l1SFwZpOTGUL2gtSgYhYqtj+ypWQumwCuVpDkBCfCFhj7bbuRY2/WtM27vtnJlZVgFpiUm4KHg6aZNV7x7qU03byVIWId1iGw0kFfqiVeh+hCCjkqxwgmD8S9inimbKxIYJbB0wInh8xZwLLxT8sWSInVYnJZ9nIfittPrdayT34OcRZhRMRRRVdOUnoyzhS6QSvt888Vsz8S5Q8EOkqqBIMqRj52xsiIj0hOzJ5DM2WTToNsGut7yzvP+8sXLJjZ3JR+oUmlayC/KSgFqG0Q0NTMVKRtxsD8U+Gxu/IB05FgPQN9BoiJXib7AwCFsqEKBuYfGPF+IyJAJItQ7ceGTIBLHWcIcpEgb0X0hCyGX5Olwn4YBcOC/49IsCIijtIpWw+6CnwtWrVm8fylTsIbUuEiJ5xZUiE1qJpZavg8KqVHEDXSSjALjl/l34+qnUFt7M3qhXPak5JfX1Z39r4wuTcFR+UPgm9WSQaxlwJ35WQztmw4ACuTLHrVeRG4s4p3bb3W1STsId0fwYp7GJEVPxitWur4S0AQmWfwAmCFIMuyQH2ggDJ9KDlX8E/i7fZIsCIijhKxysfmyDVL5l9owf47Yn/QpG5GakYlJ1UMR4qSIzzN5gTxZjsHSe8HGE10p3ZT8PJFc88uOe1NVNoGQkilwPrA4ALgc50xevUsRqovwBmzwX8YghW38Fe2Q/8jccsiDiBYwglQ+uyIJzORyYhVmhGrehixZAGcMws/hbt3QbdGghURMcHE6pL582fNabGLEN7h4CXqhEow9oWQjpdUHaSdgkNcMO7/2LYnn+Dw9Un7bwpe0z6/S8T+hyAzBkNRitmfFZoamPHSWkozittIEchqr6ScfhKStmJ6+hZA1MQ2ZfLZ5fIam4iInE2lB8mDZLMGkaS+PgeI8c9ZIdaPNY7KiYgYB9ZnKT1bBX71yXOOu6pt3mWzW8Ivyir/4JCXVMxC3gHd8vSbTuBpNicA4W6A7udIL3aDGtAD6dXtraudsN5gxiSNvRkPg5DUDBWef8eiY06ufZYoeZAVBvelWl62RkjeOOztF3QvA3dk/4otGiKeccyTAx/kBKueyJUmkO4LKd8hL9CPEazpCT81wzElgClI3ad5ukHXZqTJX7xw4Yx5paG3SaqXlZ2cVDVhICtWl6NdLC5AENn4XK+pjb3ZDO7q9nmfaFJ5+2CwkBcMFJ2sSF6HVTJpegns+TWxDqsWuapqsuztoNeBLzC5EgeBgN6efX98HZ///ZdQpvA4RBRTLpwzCz+C/u3QrdATCdb0hLqpcw4UqJbq2bjV0oE9wDXtrX8O1WvK6k6rGiOJ1WQYO/UGItIP8Gz1SbV6q8sWHzt3ppa/Unby+/u8pZJVj9aLh2gCiIULgP81vc9uVtCeRa46rwS9HoInk7ci7met8eJO0oG7sqd665gcOze1y7wv2uzCOj2Iif6P7NsfKxAJ1nSj2SBilv6dwC/ycKxN7t/3gnd1qWhrNUCrwF/ZPue8Eu7aksor/eQTqxrp0IpZ1Xt+DdB/EMGqkav3LWw9dYZKb0llWU6u6urcC4g3MJNzyLveTz/l3aXZeelLYfkcKdtN4N6S9QQqcjrFAqgz5Gdw35PUffQxdGNhW154PfnRpGrztmFdGlEUoQB1WLqNavN3s6f6PMRbhNOSYDln30wHt/ykGO+nPhZtVR61et/ChfNakmo3wl8lIjI4+cSq9p4sEREf7OFHk53b4cAbhDVydUV766vKyFdVZd4Uj70ZDzTN+vedduWiuYtueHD3ju6saWujpgnzLtZdOWnq9bWi8KwVAx8Cd3IdXV1HLNyaCedKzW491qklFfclKpt+E3VnxIFOhFPEPg8b9g1HmSPBmqbiYMdlQtDiYGAKogF9vl4UxPosleYBf037/C6h+uGSypLBYDaUjZKZEgMneYG7h61ffIDBEYRDuvKO8VctnvffnfBpkKRS7JuCh/24Br5JtWXIwouBHZ2NOZdQGb6fDvTmT58+05XtD4LZuxF9WfaSuiFXCfhqUPt+fvbrmxQHmwMrd8BjCvOn4LPUj+6cPkELdeCfCpX0c+xvm5IhEqxpCfEZw+4yuDVelz7EItVqrS5fMPP45nLLjYnyJp8VsNcacropPNWWVafb5ppx7gZ6IPSCv7q99YMllasrwcwo9k3B0X7e7API+cC3+xuOYEkYJlYrZtA0uBDjDEFeJRZeY+jzRAQI+WvqoS8QeXow3EFly6/J72TU9z6FXHfGhrcRkBe3J2bVf4S7Hz64BUkkWBERByGPBtkq8Fe3z3utg08kWdTK510ci3RuNgHMXYp771bSyxbT0qKtn29WfWORxt6Mm37kdViInQuwNr9k0AjMKg9IPF9KnT8W4RhsqBXjRHCl4WFIPuQ1P3VElLO8rgRbn6cHXS11EhHRCOwKVMHvscTdSBWB3gOii0UnWJL3TClgZ+JGUOyFW9spX9daIXsXuOe3zf1QInJlgJFRq6LAZYOQ/eYucO/dytDVi+cuQmR9k+p5+4r3fseLrA7L5PT3LVw4Tx5+eGdOdq3+z6EBzBJxK7Nnah/J5+kg0WLPXzvUWZasL1BJv0EKdZ8ezD5WTWdG3Rn5VR698jczsHHHyNqrOiBYYpnQ/NjH3h8TvbRxbZ8Ntfl8l58we0lzOflCk8or9wULuRUszFnJ04OSWtgbUnmgF/wVba0vEZHekspJdVzM/pxS6yGUVY6Tkj8D+GFvFplrlBS35ek/GSZeUsdpXfOQJGbV72XGp1G6t2vIyUwsrZjeyG8O+oes6j4MaO3mYH0QLDMHK0rwCgcrCiTMAwKbU+o5/25SKtbaDkhWMDpl6YP9I2RWt7f+Thn5klNZtK+4RMUSEakEdlz/8OPbVi+e+8clkS+JyKzBxiRX+5VaImjF0vOAHzZYHZZQ53VyBzMRMCzYpxtMBnPd+aTCcQWwAVOuO6cpLIBLAukauOuJ3IEIdUCwxIFHRH5fSkObYahIStSDK4l2vsMP9X+/Dr0yhYCZfEZLQ3sLsrYBEgc7fxWqvDb3Dg83U29CBW7/rbu21rc75OMmkhR5Pl/tBqGI3bmmfd7FZZHPeIyqWdDGrquUTIPJ+cOyE1FA4+PBqeHvxG/5t0xkG2P2oGK3UBoagmaBoSKsc8ls108s5S3EwvtJXPckMUt/SLX/fz4XDyiiMq4Z/VmILC2mY+aPrW8zJQuLRxkmP+Q+ctzNVe3z1jWprK4Es2CFv3WnQ8Ew+F0Hb0zNyGcQNfqMPkmz5PaZV7S2HtOza9eeSSbjEWNQMmL2UYPwbLUpdfyx2gpnj0i3R3mbPHaVqRy/19TekTsPh9Q/SbE/iBVNcfrstrjWubIwK5BRyriBMDDZ5KoHwsNQurpt3heanf75Ph9Ssr5X9TCfD4fMC/lmSmP2hTqYhmtqZonKApr8MuC2LtDeWA9TJARQxdJ7QrXy9Wzb+hpof6xAESLL7dGUh9KmE7/ykCSEyhWkW7YeLotVZIJV1NuD9Tblux7WVplEUlMjV5fMnz9rTktY36T6mn0+1F3tUsjTqQ3PrA5yckoiiXfuHOC2jmlALOvPeXMK4YOwdaiholfDuirao+kp22mWGvTftHTLpzLZfu7Ut8ZFi5hO6MqK2cN7lxw3e3aLfa+s+pqBEKp1Whg+HRVr7drr+QCbY3qwYJzfKaQbQ7X5f3GIm1UREXVIrjy4BPP3WlXelst27UZpJFgREd15OmlN+3FzZlrp1iaVC/YFS4FSXJ36IVipgcFL3r10aVOeHowefDGMkAESvKyBDdV8lmIkwBEN4DioQNgb8F2w8XFGOZUgEqyIaUOueiCsPnnOcUrpe00qZ+8LlmqcZlBf7ArUm5kKbbMGnjol39tIsArh4SfOLP0OftN3G6fvVcR0F+yMSIkGwlupbvnPLDU4urrPSLAipgu5sssXLJjpUv1OJFd1r/F8k4riwtlRjxVlS2o3q+RSDnOzKiKifuQ6Tw0GfymVzV8fa01hVEwR00Hzsx603JR+vVn1goFg1UiuGmFv7QKAzpiGmuqd8JA4Qvhbhvrvha7YjymiQZAkZmlPSPs/diQXNiLBimhorM2L2v+zbd4XWlR/fyBYVWLNVb1DvYEYZ63vymZHxiWZUnKVYNWfhHTzTTE1GNEgCCCpWbrOqv1rc3I1ZrmOBCuiYdENST7+5toWp28eCFYlkqu6h9QGPyNL7/jpvJPzvY66bGqMkEDYE9T+ArCYGoxoBK8BRLHwhFWH1jLKG4ORYEVMP3LVNvetLarXDISQEtOCjWTZfZOTkiZ2VtRlU2aHsrYMll7C0Oa86WJMDUY0gg8XPJLM16T8V5lMdx3RRZqolCIaDuvzwc3vP3HOuSXRz1TNvGWjbwpz2ywbIYJlHQeK/7Di1TmZABr2zyWMmNzlr0IpMat+MlS3fHk0TRcjIuqIY0keoH0fnHJMPsh5zPYjevQRDYVu0C4IV50wa74m+lURKedDkAt1lb8kogGrq/4CvlgUS302I+hsgJ5YhzWZ5CqFpGSW/tiqLZfGuquIBoTmUaxFmthfhpSPHkmReyRYEQ3ldpB1hEvXlJq+WFZtHwjmtViDm4MAqbc/Fyd3qw8lL8W9BecM8So+wImYfUNFynk0S6Z4oyWrw7KOKxfNXXzDg7t31HqdxWNwVMlVraP1r606uAo2VWGDEm9yRjSeOREIhsjlcMrnoO9pxjhcPhKsiIZBd54aXN3WumaG09fsC1ao+YIGvkXFDaThS+t27PpqnS3vnVe1tW5zIkurZlaA4dJi4MuiLYMaVgA7OmPD0aMtwQHUYeGxIPwhbH2MzHmJ0auIRoRCSJHkRBK5mJQbxxrFigQroiGQzxhMr1w896UlkQ8MBvNSoMiVgakgQ96eCmbXdIHLBxWHzQUmBh1gD4P7DKRXwa+csLRqxYhW5GuKIOcB3+qPBOtoIoAqxp5g/nVUt9wdU4MRjQ9RCKZi7wss/Rz07WEMUaxIsCIa4hQAXLZ4cYvKwBdUJEnNvBTL4IZmEbcP1t3w4O4d68GtgrQeFrc7S7vaGtG7FF5LQdJBAhIAxM4dJgERR4HK+ixyZXtDsD/Eb/l5XtSexrWJaHDUarFOJOFiUj4yFsci3iKMqHusz4c4l2Xf2hlOOypmqRSr7sqXRHQghK1NafKxbtBVdUgGxOyu/CpNUYirpsHAZPmaE49p7YFgMYp1lMgVT4Vgr8P3//hIin0jIurYf5csiiWXwdJjx3KjMBKsiLpGTlb8mvZ5K0qilxctNQhZuMcJErA1PQ8/vK9zjIWSBUDIbe3moWCB4qyveAhlldmSlM8EWBV12kRKbgrOYTwSLP09fP+PIrmKmIZQCAFxJ2rS9PZMd3fpKH8wIqJ+XYtOkO4s1f1pJ+LysFCR+l35ZhU34O1H12/b/Y0u6m+0S09OBivV8v1m9oiTrP6pKOTPCViQ8wA6YgRrAslVkpjZliCsJK2lBSO5ipiWpqZ2o/AyWHHcaKNYkWBF1C3W59GrofbWS2eovGSoeKnBrJ1AsLSkXJ4TgHq8zm7doDc+8shehHucCFKcFKcYIGrn1QhXPBnj9QnwGbkK/8eqQy+nsvFXWd1JJFcR0xa1KNZCTQbzKNZKN4ofioioP9TqmNYsnr/UIWsHg4UCpgZ9s4qm8I/XPrDzP/MO8/VKADRnMxvzpkdFIYqammHGi65obT0mX98YxToyifWZp67OLL3RqhsvhHt2AvG2YMRkEPtnexTJXR4RxTr5uHz4s0SCFdFwqNUxmYZPlFRmhgI0vzxIW5gTZCjY4+L0bw2kvwGaMQaRu2raphAqD8QblqgucE1hGUBX1GtHIq4eEgfsCub/1Kr97x9hIyK5ipiEo/ysjyLpzFoU6wRNmt/BKKJYURFF1B3yFgd+Tdvct8xQ/b3BULzUIBDKIhqMa6+7/9FHeuu8y/jmXNGZhE1VM6RAuiNrOAri3DkQ67DGuHq5F544M39rkHA21f6v5YObIaZcI6b0aEvBznItiqWXwpLZh4tiRYIVUVfoBu0Hu+p5xy9QkY9UzEIB5diXRHTQ25a9TbM/Ua9tGQ4itQFAq82/ToM9oVntU2G8y3xxzx9JBiMOS6wCJA6T3YT0Eqtueg1D/feOGNwc1zHiKB9bBbP7g8npwXT58FfOCOaXB8Lr8+NdmJKErC+WO0GTmXkU69A3CiPBiqg3aA+EkPqbmlTnecOkYHJsgApiwpU3b906VIdtGZ7pt+Up2HUPPbRLRO51mWNZoDosMOwl715KU2+W0opRrEMaNfPgHIga4ctBKytC2v+p3B5oLGaPmGTtMkB140aqv9w0/HXTL6lu6afS/00z+zY4yZ2CIrxfzWuxLoUzZj/XjcJIsCLqBrVxOFe0z/svzU7fWMTUYK0tw6APt67btvM76+uwLcOhsD7XFwb9TmrGuhDkT72ZqUjbrIHZpwB0R4J1sGT6fJaggnNm4T+CpK+2ysY3M/Sr32RRKwIxJRgx+bKpZHp85FeFFSVADf0ABF+gdGFei5Us0LJ/J89RixUJVkRdoBu0A+yK1tZjErObg2FWPPk1AakGq6iFKwD6GyjNsn/Wn3FX4VQ0hCYVxSVnR902cllqXr9z4NQItwdslVU3vYyhLT8kRq0iioHwzMeGKnQJ1Y13mvlvgdMCRbGyWiyz98LyOYeqxYpKKKJeoD0QtIVrW5yeVDULBUwN+hYV9WafuW7H45vqvC3DM7C/tknCL70VTn9kRfjYBQCd07d+KCdVtZYLiQPBLPwo4N9glU3nUNnYmxsDR4xaRRQavQBi2LXFjWKFQ0axIsGKKDxqqcE1S+acW3LyroFsHE7RyFVwgg6G8FhTOvT/dYN2NZjhqjVJ3Ve1e6oWBjTbg0LVYYnJWSPSstMhTWgZQbJ0mFQ5lxWv22MW/OdCsPOsuul3qPR/I3t9l2N/Q9GIiELDQ5dS3fKfZv6WPIpVkGhrXotlHDKKFQlWRNEhAJ9ZQUlMP6WI2nCPlEIZuiYRDYG1PQ8/vbMzs3QNFUWpjcy54OHHHzSTbU6kMA1Hs35YBsLSOxfPfx40ZB2WDROjGqFCMkWfJFm0yvaY2Xex8N9CtdJh6aaLSTfdlr2uy2VfY9PQiHpCr5HdWr4WvM/kvSi2KXgkOV7L4RKeJYpVK2yMBaGjQ22tDmNUJPcqJYbfR7emHGqdukB7wS99tPWKZqdn7PNWUcEVyfu2rOdVsi+Ejbt37PpcI7RlONRHrUWHrsI2O2RpNdsHVxBB8s0qyZDZi4GtuQMZnv1s1oXey/mrjGi8KIC44bfuwbjXJNwmZreGxP2YgbseHFZQXS43UKE+iFXUnRNvjw4g6EWS/dro2HD413U5qr2/sFLn/xZJ3gC+kvOXYpAsk3fB0puhb8/IPUlAS5FfjRp5ViQ93MaWsts6oRzXdpRrar7lWciV6wV/9aK55ySq1xnQ7KRcwM+QXaoze99nodo1XNvScKgVugfY1Ozkj33AFcWdDOCaVBgM9lpg/SFsTHN2Nustem9AqGL2mInch1m/ILcH5A6q/lewuWIA1dqZ6pLs+ni9RausHHXnqNcqt0e+eZQ/UDTZr73/GaNn3/IBIbwetFyosymlE6RkV1mVq3KnxucEy99RoJBb0b2rADhEdmXfdxzkORxfKwJ+CPydEFKK12G8iJZDRdh68H/Uan6C2Gwz+5sBs6Gi1V4JGCaJt/DIDTt2/yBvPdzIKZiQbVrytb3eD1bMqkXZE4Ww1zSxYA8A9Dz7Pvwyd+J9fj28YOIk3swGgT2I7MT4rRgPitr93thGtfk3sOFJnhG26HLwqEBfHqHorTOxynSnGPcjUXeOUnWGLJppm0b3ctuIhFKBZN+yYyv3H/6lvR5Qqpt+aaXOm0XcBcX6HCnAGbC4BXoHyKNY/z+2EOgkpJK3gAAAAABJRU5ErkJggg==';

// ═══════════════════════════════════════════════════════════════════════════
// DICTIONNAIRE MULTILINGUE — Lettres et documents officiels
// ═══════════════════════════════════════════════════════════════════════════
const _LANGS = {
  en: {
    name: 'English', flag: '🇬🇧',
    letterTitle:       'Letter Confirming Commercial Relationship & Earnings',
    letterTitleMonthly:'Letter Confirming Commercial Relationship & Monthly Earnings',
    subject:           'Letter to confirm the commercial relationship & earnings between the parties.',
    subjectMonthly:    'Letter to confirm the commercial relationship & monthly earnings between the parties.',
    dated:             'Dated:',
    ref:               'Ref:',
    dear:              'To Whom It May Concern,',
    para1: (name, date)       => `Kindly note that this letter is issued on the specific request made by ${name} on ${date}.`,
    para2: (name, co, regNo, memberId, title) => `It is hereby informed that ${name} and ${co} entered into a Marketing and Promotion Agreement where ${name} has been appointed as ${title||'an Independent Partner'}. Under the said agreement, ${name} is eligible to receive commissions based on the services provided. The Registration Number of ${name} with us is ${memberId}.`,
    para3annual: (name, start, amount, year)   => `Since the start date (${start}) to date, ${name} has earned ${amount} USD in commissions during the fiscal year ${year}.`,
    para3monthly: (name, period, amount)        => `For the period of ${period}, ${name} has earned ${amount} USD in commissions.`,
    para4:         () => `Should you need any further clarification regarding the content of this letter then please contact us at the address below. This letter is issued without any prejudice and is provided solely for the purpose of confirming the commercial relationship and earnings.`,
    summaryTitle:  (year)   => `ANNUAL EARNINGS SUMMARY — ${year}`,
    summaryMonthly:(period) => `MONTHLY EARNINGS SUMMARY — ${period}`,
    fullName:      'Full Name',
    memberId:      'Member ID / Registration No.',
    status:        'Member Status',
    rank:          'Current Rank',
    totalAnnual:   (year)   => `Total Commissions Earned (${year})`,
    periodCovered: 'Period Covered',
    totalComm:     'TOTAL COMMISSIONS',
    yoursFaithfully: 'Yours faithfully,',
    director:      'Director',
    authorised:    'Authorised Signatory',
    // Relevé mensuel
    stmtTitle:     'MONTHLY EARNINGS STATEMENT',
    stmtCont:      'MONTHLY EARNINGS STATEMENT (cont.)',
    stmtSummary:   'MONTHLY EARNINGS STATEMENT — Summary',
    periodCoveredLbl: 'PERIOD COVERED',
    summaryByType: 'SUMMARY BY TYPE',
    total:         'TOTAL',
    declText: (name, uid, period, co, regNo) =>
      `This Monthly Earnings Statement certifies that the above-listed commissions were earned by ${name} (Member ID: ${uid}) during the period of ${period}. This document is issued by ${co}${regNo ? ', registered under Company No. ' + regNo : ''}, and constitutes an official record of income for tax declaration purposes.`,
    officialDecl:  'OFFICIAL DECLARATION',
    // Certificat annuel
    annualCertTitle: 'ANNUAL INCOME CERTIFICATE',
    fiscalYear:    (y) => `Fiscal Year ${y}`,
    memberInfo:    'MEMBER INFORMATION',
    earningsByType:'EARNINGS BY TYPE',
    monthlyBreakdown: 'MONTHLY BREAKDOWN',
    officialCert:  'OFFICIAL CERTIFICATION',
    certText: (name, uid, amount, co, wdAmount, year) =>
      `We, the undersigned, hereby certify that ${name} (Member ID: ${uid}) has earned the total gross amount of ${amount} in commissions and bonuses from ${co} during the fiscal year ${year}. Total withdrawals processed during this period amount to ${wdAmount}. This Annual Income Certificate is issued for tax declaration and legal purposes.`,
    authorisedBy:  (name) => `Authorised by: ${name}`,
    generated:     'Generated:',
    page:          (n, t) => `Page ${n} / ${t}`,
    months:        ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  },
  fr: {
    name: 'Français', flag: '🇫🇷',
    letterTitle:       'Lettre Confirmant la Relation Commerciale & les Revenus',
    letterTitleMonthly:'Lettre Confirmant la Relation Commerciale & les Revenus Mensuels',
    subject:           'Lettre confirmant la relation commerciale et les revenus entre les parties.',
    subjectMonthly:    'Lettre confirmant la relation commerciale et les revenus mensuels entre les parties.',
    dated:             'Date :',
    ref:               'Réf :',
    dear:              'À qui de droit,',
    para1: (name, date)       => `Nous vous informons que cette lettre est émise à la demande expresse de ${name} en date du ${date}.`,
    para2: (name, co, regNo, memberId, title) => `Il est par la présente confirmé que ${name} et ${co} ont conclu un Accord de Partenariat aux termes duquel ${name} a été nommé(e) ${title||'Partenaire Indépendant(e)'}. Dans le cadre dudit accord, ${name} est éligible à percevoir des commissions en contrepartie des services fournis. Le numéro d'enregistrement de ${name} auprès de nos services est le ${memberId}.`,
    para3annual: (name, start, amount, year)   => `Depuis la date d'adhésion (${start}) à ce jour, ${name} a perçu ${amount} USD de commissions au cours de l'exercice fiscal ${year}.`,
    para3monthly: (name, period, amount)        => `Pour la période du ${period}, ${name} a perçu ${amount} USD de commissions.`,
    para4:         () => `Pour toute question relative au contenu de cette lettre, veuillez nous contacter à l'adresse indiquée ci-dessous. Cette lettre est émise sans préjudice et est fournie uniquement à des fins de confirmation de la relation commerciale et des revenus.`,
    summaryTitle:  (year)   => `RÉCAPITULATIF ANNUEL — ${year}`,
    summaryMonthly:(period) => `RÉCAPITULATIF MENSUEL — ${period}`,
    fullName:      'Nom et Prénom',
    memberId:      'N° de Membre / N° d\'Enregistrement',
    status:        'Statut Membre',
    rank:          'Rang Actuel',
    totalAnnual:   (year)   => `Total Commissions Perçues (${year})`,
    periodCovered: 'Période Couverte',
    totalComm:     'TOTAL COMMISSIONS',
    yoursFaithfully: 'Veuillez agréer, Madame, Monsieur, l\'expression de mes salutations distinguées,',
    director:      'Directeur',
    authorised:    'Signataire Autorisé',
    // Relevé mensuel
    stmtTitle:     'RELEVÉ DE COMMISSIONS MENSUEL',
    stmtCont:      'RELEVÉ DE COMMISSIONS MENSUEL (suite)',
    stmtSummary:   'RELEVÉ DE COMMISSIONS MENSUEL — Récapitulatif',
    periodCoveredLbl: 'PÉRIODE COUVERTE',
    summaryByType: 'RÉCAPITULATIF PAR TYPE',
    total:         'TOTAL',
    declText: (name, uid, period, co, regNo) =>
      `Ce Relevé de Commissions Mensuel certifie que les commissions listées ci-dessus ont été perçues par ${name} (N° Membre : ${uid}) au cours de la période ${period}. Ce document est émis par ${co}${regNo ? ', immatriculée sous le numéro ' + regNo : ''}, et constitue un justificatif officiel de revenus à des fins de déclaration fiscale.`,
    officialDecl:  'DÉCLARATION OFFICIELLE',
    // Certificat annuel
    annualCertTitle: 'CERTIFICAT DE REVENUS ANNUEL',
    fiscalYear:    (y) => `Exercice Fiscal ${y}`,
    memberInfo:    'INFORMATIONS MEMBRE',
    earningsByType:'REVENUS PAR TYPE',
    monthlyBreakdown: 'DÉTAIL MENSUEL',
    officialCert:  'CERTIFICATION OFFICIELLE',
    certText: (name, uid, amount, co, wdAmount, year) =>
      `Nous, soussignés, certifions que ${name} (N° Membre : ${uid}) a perçu un montant brut total de ${amount} en commissions et primes de la part de ${co} au cours de l'exercice fiscal ${year}. Le total des retraits traités au cours de cette période s'élève à ${wdAmount}. Ce Certificat de Revenus Annuel est émis à des fins de déclaration fiscale et légale.`,
    authorisedBy:  (name) => `Autorisé par : ${name}`,
    generated:     'Généré le :',
    page:          (n, t) => `Page ${n} / ${t}`,
    months:        ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'],
  },
  es: {
    name: 'Español', flag: '🇪🇸',
    letterTitle:       'Carta Confirmando Relación Comercial e Ingresos',
    letterTitleMonthly:'Carta Confirmando Relación Comercial e Ingresos Mensuales',
    subject:           'Carta para confirmar la relación comercial e ingresos entre las partes.',
    subjectMonthly:    'Carta para confirmar la relación comercial e ingresos mensuales entre las partes.',
    dated:             'Fecha:',
    ref:               'Ref:',
    dear:              'A quien corresponda,',
    para1: (name, date)       => `Se comunica que esta carta ha sido emitida a petición expresa de ${name} con fecha ${date}.`,
    para2: (name, co, regNo, memberId, title) => `Se informa por la presente que ${name} y ${co} han suscrito un Acuerdo de Marketing y Promoción en virtud del cual ${name} ha sido designado/a como Socio/a Independiente. Conforme a dicho acuerdo, ${name} es elegible para recibir comisiones en función de los servicios prestados. El número de registro de ${name} en nuestro sistema es ${memberId}.`,
    para3annual: (name, start, amount, year)   => `Desde la fecha de inicio (${start}) hasta la fecha, ${name} ha percibido ${amount} USD en comisiones durante el ejercicio fiscal ${year}.`,
    para3monthly: (name, period, amount)        => `Durante el período de ${period}, ${name} ha percibido ${amount} USD en comisiones.`,
    para4:         () => `Para cualquier aclaración sobre el contenido de esta carta, no dude en ponerse en contacto con nosotros en la dirección indicada. Esta carta se emite sin perjuicio y únicamente a efectos de confirmar la relación comercial y los ingresos.`,
    summaryTitle:  (year)   => `RESUMEN ANUAL DE GANANCIAS — ${year}`,
    summaryMonthly:(period) => `RESUMEN MENSUAL DE GANANCIAS — ${period}`,
    fullName:      'Nombre Completo',
    memberId:      'N° de Socio / N° de Registro',
    status:        'Estado del Socio',
    rank:          'Rango Actual',
    totalAnnual:   (year)   => `Total Comisiones Percibidas (${year})`,
    periodCovered: 'Período Cubierto',
    totalComm:     'TOTAL COMISIONES',
    yoursFaithfully: 'Atentamente,',
    director:      'Director',
    authorised:    'Firmante Autorizado',
    stmtTitle:     'EXTRACTO MENSUAL DE COMISIONES',
    stmtCont:      'EXTRACTO MENSUAL DE COMISIONES (cont.)',
    stmtSummary:   'EXTRACTO MENSUAL — Resumen',
    periodCoveredLbl: 'PERÍODO CUBIERTO',
    summaryByType: 'RESUMEN POR TIPO',
    total:         'TOTAL',
    declText: (name, uid, period, co, regNo) =>
      `Este Extracto Mensual de Comisiones certifica que las comisiones enumeradas fueron percibidas por ${name} (N° Socio: ${uid}) durante el período ${period}. Este documento es emitido por ${co}${regNo ? ', registrada bajo el N° ' + regNo : ''}, y constituye un registro oficial de ingresos a efectos fiscales.`,
    officialDecl:  'DECLARACIÓN OFICIAL',
    annualCertTitle: 'CERTIFICADO DE INGRESOS ANUALES',
    fiscalYear:    (y) => `Ejercicio Fiscal ${y}`,
    memberInfo:    'INFORMACIÓN DEL SOCIO',
    earningsByType:'GANANCIAS POR TIPO',
    monthlyBreakdown: 'DESGLOSE MENSUAL',
    officialCert:  'CERTIFICACIÓN OFICIAL',
    certText: (name, uid, amount, co, wdAmount, year) =>
      `Los abajo firmantes certifican que ${name} (N° Socio: ${uid}) ha percibido un importe bruto total de ${amount} en comisiones y bonificaciones de ${co} durante el ejercicio fiscal ${year}. El total de retiros procesados durante este período asciende a ${wdAmount}. Este Certificado de Ingresos Anuales se emite a efectos de declaración fiscal y legal.`,
    authorisedBy:  (name) => `Autorizado por: ${name}`,
    generated:     'Generado:',
    page:          (n, t) => `Página ${n} / ${t}`,
    months:        ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
  },
  de: {
    name: 'Deutsch', flag: '🇩🇪',
    letterTitle:       'Bestätigung der Geschäftsbeziehung & Einnahmen',
    letterTitleMonthly:'Bestätigung der Geschäftsbeziehung & Monatliche Einnahmen',
    subject:           'Schreiben zur Bestätigung der Geschäftsbeziehung und der Einnahmen zwischen den Parteien.',
    subjectMonthly:    'Schreiben zur Bestätigung der Geschäftsbeziehung und der monatlichen Einnahmen zwischen den Parteien.',
    dated:             'Datum:',
    ref:               'Ref.:',
    dear:              'Sehr geehrte Damen und Herren,',
    para1: (name, date)       => `Dieses Schreiben wird auf ausdrücklichen Wunsch von ${name} vom ${date} ausgestellt.`,
    para2: (name, co, regNo, memberId, title) => `Hiermit wird bestätigt, dass ${name} und ${co} eine Marketing- und Promotionsvereinbarung abgeschlossen haben, in deren Rahmen ${name} als unabhängige/r Partner/in ernannt wurde. Gemäß dieser Vereinbarung ist ${name} berechtigt, Provisionen auf Basis der erbrachten Dienstleistungen zu erhalten. Die Registrierungsnummer von ${name} in unserem System lautet ${memberId}.`,
    para3annual: (name, start, amount, year)   => `Seit dem Startdatum (${start}) bis heute hat ${name} im Geschäftsjahr ${year} Provisionen in Höhe von ${amount} USD verdient.`,
    para3monthly: (name, period, amount)        => `Im Zeitraum ${period} hat ${name} Provisionen in Höhe von ${amount} USD verdient.`,
    para4:         () => `Sollten Sie weitere Fragen zum Inhalt dieses Schreibens haben, wenden Sie sich bitte an die unten angegebene Adresse. Dieses Schreiben wird ohne Vorurteile ausgestellt und dient ausschließlich der Bestätigung der Geschäftsbeziehung und der Einnahmen.`,
    summaryTitle:  (year)   => `JAHRESVERDIENST-ÜBERSICHT — ${year}`,
    summaryMonthly:(period) => `MONATSVERDIENST-ÜBERSICHT — ${period}`,
    fullName:      'Vollständiger Name',
    memberId:      'Mitglieds-Nr. / Registrierungsnummer',
    status:        'Mitgliedsstatus',
    rank:          'Aktueller Rang',
    totalAnnual:   (year)   => `Gesamtprovisionen (${year})`,
    periodCovered: 'Abgedeckter Zeitraum',
    totalComm:     'GESAMTPROVISIONEN',
    yoursFaithfully: 'Mit freundlichen Grüßen,',
    director:      'Direktor',
    authorised:    'Bevollmächtigte/r',
    stmtTitle:     'MONATLICHE PROVISIONSABRECHNUNG',
    stmtCont:      'MONATLICHE PROVISIONSABRECHNUNG (Forts.)',
    stmtSummary:   'MONATLICHE ABRECHNUNG — Zusammenfassung',
    periodCoveredLbl: 'ABGEDECKTER ZEITRAUM',
    summaryByType: 'ZUSAMMENFASSUNG NACH TYP',
    total:         'GESAMT',
    declText: (name, uid, period, co, regNo) =>
      `Diese monatliche Provisionsabrechnung bestätigt, dass die oben aufgeführten Provisionen von ${name} (Mitgl.-Nr.: ${uid}) im Zeitraum ${period} verdient wurden. Dieses Dokument wird von ${co}${regNo ? ', eingetragen unter Nr. ' + regNo : ''} ausgestellt und stellt einen offiziellen Einkommensnachweis für Steuererklärungszwecke dar.`,
    officialDecl:  'OFFIZIELLE ERKLÄRUNG',
    annualCertTitle: 'JAHRESEINKOMMENSBESCHEINIGUNG',
    fiscalYear:    (y) => `Geschäftsjahr ${y}`,
    memberInfo:    'MITGLIEDSINFORMATIONEN',
    earningsByType:'EINNAHMEN NACH TYP',
    monthlyBreakdown: 'MONATLICHE AUFSCHLÜSSELUNG',
    officialCert:  'OFFIZIELLE ZERTIFIZIERUNG',
    certText: (name, uid, amount, co, wdAmount, year) =>
      `Die Unterzeichnenden bescheinigen hiermit, dass ${name} (Mitgl.-Nr.: ${uid}) im Geschäftsjahr ${year} einen Bruttobetrag von ${amount} an Provisionen und Boni von ${co} erhalten hat. Die im gleichen Zeitraum verarbeiteten Auszahlungen belaufen sich auf ${wdAmount}. Diese Jahreseinkommensbescheinigung wird für steuerliche und rechtliche Zwecke ausgestellt.`,
    authorisedBy:  (name) => `Autorisiert von: ${name}`,
    generated:     'Erstellt:',
    page:          (n, t) => `Seite ${n} / ${t}`,
    months:        ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
  },
  pt: {
    name: 'Português', flag: '🇵🇹',
    letterTitle:       'Carta de Confirmação de Relação Comercial e Rendimentos',
    letterTitleMonthly:'Carta de Confirmação de Relação Comercial e Rendimentos Mensais',
    subject:           'Carta para confirmar a relação comercial e os rendimentos entre as partes.',
    subjectMonthly:    'Carta para confirmar a relação comercial e os rendimentos mensais entre as partes.',
    dated:             'Data:',
    ref:               'Ref:',
    dear:              'A quem possa interessar,',
    para1: (name, date)       => `Comunicamos que esta carta foi emitida a pedido expresso de ${name} em ${date}.`,
    para2: (name, co, regNo, memberId, title) => `Informa-se pela presente que ${name} e ${co} celebraram um Acordo de Marketing e Promoção pelo qual ${name} foi nomeado/a Parceiro/a Independente. Ao abrigo do referido acordo, ${name} tem direito a receber comissões pelos serviços prestados. O número de registo de ${name} nos nossos sistemas é ${memberId}.`,
    para3annual: (name, start, amount, year)   => `Desde a data de início (${start}) até à presente data, ${name} recebeu ${amount} USD em comissões durante o exercício fiscal ${year}.`,
    para3monthly: (name, period, amount)        => `No período de ${period}, ${name} recebeu ${amount} USD em comissões.`,
    para4:         () => `Para qualquer esclarecimento sobre o conteúdo desta carta, contacte-nos através do endereço indicado abaixo. Esta carta é emitida sem prejuízo e destina-se exclusivamente a confirmar a relação comercial e os rendimentos.`,
    summaryTitle:  (year)   => `RESUMO ANUAL DE GANHOS — ${year}`,
    summaryMonthly:(period) => `RESUMO MENSAL DE GANHOS — ${period}`,
    fullName:      'Nome Completo',
    memberId:      'N.º de Sócio / N.º de Registo',
    status:        'Estado do Sócio',
    rank:          'Nível Atual',
    totalAnnual:   (year)   => `Total de Comissões Recebidas (${year})`,
    periodCovered: 'Período Abrangido',
    totalComm:     'TOTAL DE COMISSÕES',
    yoursFaithfully: 'Com os melhores cumprimentos,',
    director:      'Diretor',
    authorised:    'Signatário Autorizado',
    stmtTitle:     'EXTRATO MENSAL DE COMISSÕES',
    stmtCont:      'EXTRATO MENSAL DE COMISSÕES (cont.)',
    stmtSummary:   'EXTRATO MENSAL — Resumo',
    periodCoveredLbl: 'PERÍODO ABRANGIDO',
    summaryByType: 'RESUMO POR TIPO',
    total:         'TOTAL',
    declText: (name, uid, period, co, regNo) =>
      `Este Extrato Mensal de Comissões certifica que as comissões listadas foram recebidas por ${name} (N.º Sócio: ${uid}) durante o período ${period}. Este documento é emitido por ${co}${regNo ? ', registada sob o N.º ' + regNo : ''} e constitui um registo oficial de rendimentos para efeitos de declaração fiscal.`,
    officialDecl:  'DECLARAÇÃO OFICIAL',
    annualCertTitle: 'CERTIFICADO DE RENDIMENTOS ANUAIS',
    fiscalYear:    (y) => `Exercício Fiscal ${y}`,
    memberInfo:    'INFORMAÇÕES DO SÓCIO',
    earningsByType:'GANHOS POR TIPO',
    monthlyBreakdown: 'DETALHE MENSAL',
    officialCert:  'CERTIFICAÇÃO OFICIAL',
    certText: (name, uid, amount, co, wdAmount, year) =>
      `Os abaixo assinados certificam que ${name} (N.º Sócio: ${uid}) recebeu um montante bruto total de ${amount} em comissões e bónus de ${co} durante o exercício fiscal ${year}. O total de levantamentos processados durante este período ascende a ${wdAmount}. Este Certificado de Rendimentos Anuais é emitido para efeitos de declaração fiscal e legal.`,
    authorisedBy:  (name) => `Autorizado por: ${name}`,
    generated:     'Gerado em:',
    page:          (n, t) => `Página ${n} / ${t}`,
    months:        ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  },
  ar: {
    name: 'العربية', flag: '🇸🇦',
    letterTitle:       'خطاب تأكيد العلاقة التجارية والأرباح',
    letterTitleMonthly:'خطاب تأكيد العلاقة التجارية والأرباح الشهرية',
    subject:           'خطاب لتأكيد العلاقة التجارية والأرباح بين الطرفين.',
    subjectMonthly:    'خطاب لتأكيد العلاقة التجارية والأرباح الشهرية بين الطرفين.',
    dated:             'التاريخ:',
    ref:               'مرجع:',
    dear:              'إلى من يهمه الأمر،',
    para1: (name, date)       => `يُشار إلى أن هذا الخطاب صادر بناءً على الطلب المقدّم من ${name} بتاريخ ${date}.`,
    para2: (name, co, regNo, memberId, title) => `يُشعر بموجب هذا أن ${name} و${co} أبرما اتفاقية تسويق وترويج حيث عُيّن(ت) ${name} بوصفه(ا) شريكاً(ة) مستقلاً(ة). بموجب الاتفاقية المذكورة، يحق لـ${name} تلقّي عمولات مقابل الخدمات المقدَّمة. رقم تسجيل ${name} لدينا هو ${memberId}.`,
    para3annual: (name, start, amount, year)   => `منذ تاريخ الانضمام (${start}) وحتى اليوم، حقّق(ت) ${name} مبلغ ${amount} دولار أمريكي من العمولات خلال السنة المالية ${year}.`,
    para3monthly: (name, period, amount)        => `خلال فترة ${period}، حقّق(ت) ${name} مبلغ ${amount} دولار أمريكي من العمولات.`,
    para4:         () => `لأي استفسار يتعلق بمحتوى هذا الخطاب، يُرجى التواصل معنا على العنوان الموضّح أدناه. يصدر هذا الخطاب دون أي إخلال، وذلك لغرض تأكيد العلاقة التجارية والأرباح فحسب.`,
    summaryTitle:  (year)   => `ملخص الأرباح السنوية — ${year}`,
    summaryMonthly:(period) => `ملخص الأرباح الشهرية — ${period}`,
    fullName:      'الاسم الكامل',
    memberId:      'رقم العضو / رقم التسجيل',
    status:        'حالة العضو',
    rank:          'الرتبة الحالية',
    totalAnnual:   (year)   => `إجمالي العمولات المحققة (${year})`,
    periodCovered: 'الفترة المشمولة',
    totalComm:     'إجمالي العمولات',
    yoursFaithfully: 'مع خالص التحيات،',
    director:      'المدير',
    authorised:    'المفوّض بالتوقيع',
    stmtTitle:     'كشف العمولات الشهري',
    stmtCont:      'كشف العمولات الشهري (تابع)',
    stmtSummary:   'كشف العمولات الشهري — الملخص',
    periodCoveredLbl: 'الفترة المشمولة',
    summaryByType: 'ملخص حسب النوع',
    total:         'الإجمالي',
    declText: (name, uid, period, co, regNo) =>
      `يُشهد بموجب هذا الكشف الشهري للعمولات أن العمولات المدرجة أعلاه قد حققها ${name} (رقم العضو: ${uid}) خلال فترة ${period}. يصدر هذا المستند عن ${co}${regNo ? ' المسجّلة برقم ' + regNo : ''}، ويُعدّ سجلاً رسمياً للدخل لأغراض التصريح الضريبي.`,
    officialDecl:  'الإفادة الرسمية',
    annualCertTitle: 'شهادة الدخل السنوي',
    fiscalYear:    (y) => `السنة المالية ${y}`,
    memberInfo:    'معلومات العضو',
    earningsByType:'الأرباح حسب النوع',
    monthlyBreakdown: 'التفصيل الشهري',
    officialCert:  'التصديق الرسمي',
    certText: (name, uid, amount, co, wdAmount, year) =>
      `نحن الموقّعين أدناه نُشهد بأن ${name} (رقم العضو: ${uid}) قد حقّق(ت) مبلغاً إجمالياً قدره ${amount} من العمولات والمكافآت من ${co} خلال السنة المالية ${year}. وقد بلغ إجمالي المسحوبات المعالجة خلال هذه الفترة ${wdAmount}. تُصدر هذه الشهادة لأغراض التصريح الضريبي والإجراءات القانونية.`,
    authorisedBy:  (name) => `معتمد من: ${name}`,
    generated:     'تاريخ الإصدار:',
    page:          (n, t) => `صفحة ${n} من ${t}`,
    months:        ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  },
};

// ─── Sélecteur de langue (modale légère) ─────────────────────────────────
function _showLangPicker(callback) {
  const existing = document.getElementById('lang-picker-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'lang-picker-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';

  const card = document.createElement('div');
  card.style.cssText = 'background:#1a1f2e;border:1px solid #2d3448;border-radius:16px;padding:24px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5)';

  const title = document.createElement('h3');
  title.style.cssText = 'color:#fff;font-size:16px;font-weight:700;margin:0 0 6px;display:flex;align-items:center;gap:8px';
  title.innerHTML = '<i class="fas fa-language" style="color:#d4a847"></i>Langue du document';

  const sub = document.createElement('p');
  sub.style.cssText = 'color:#9ca3af;font-size:11px;margin:0 0 16px';
  sub.textContent = 'Sélectionnez la langue pour ce document officiel.';

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px';

  const _pick = (lang) => {
    overlay.remove();
    callback(lang);
  };

  Object.entries(_LANGS).forEach(([code, l]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = 'display:flex;align-items:center;gap:10px;background:#252b3b;border:1px solid #3a4260;color:#fff;font-size:13px;font-weight:500;padding:10px 14px;border-radius:10px;cursor:pointer;transition:background 0.15s,border-color 0.15s;text-align:left;width:100%';
    btn.onmouseenter = () => { btn.style.background='#2e3650'; btn.style.borderColor='#d4a847'; };
    btn.onmouseleave = () => { btn.style.background='#252b3b'; btn.style.borderColor='#3a4260'; };
    btn.innerHTML = `<span style="font-size:20px">${l.flag}</span><span>${l.name}</span>`;
    btn.addEventListener('click', () => _pick(code));
    grid.appendChild(btn);
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.style.cssText = 'margin-top:12px;width:100%;background:none;border:none;color:#6b7280;font-size:11px;cursor:pointer;padding:8px;border-radius:6px;transition:color 0.15s';
  cancelBtn.onmouseenter = () => { cancelBtn.style.color='#d1d5db'; };
  cancelBtn.onmouseleave = () => { cancelBtn.style.color='#6b7280'; };
  cancelBtn.textContent = 'Annuler';
  cancelBtn.addEventListener('click', () => _pick(null));

  card.appendChild(title);
  card.appendChild(sub);
  card.appendChild(grid);
  card.appendChild(cancelBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// ─── Générateur 1 : Monthly Statement (fond blanc + logo + multilingue) ──
async function generateMonthlyStatement() {
  // Sélecteur de langue avant génération
  window._pdfLang = window._pdfLang || 'fr';
  const _langChosen = await new Promise(resolve => _showLangPicker(lang => resolve(lang)));
  if (!_langChosen) return;  // Annulé par l'utilisateur
  window._pdfLang = _langChosen;

  const btn = document.getElementById('btn-stmt');
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Génération...'; btn.disabled = true;
  try {
    const period = document.getElementById('stmt-period-select')?.value;
    if (!period) { showToast('Sélectionnez une période', 'error'); btn.innerHTML = orig; btn.disabled = false; return; }

    const [yr, mo] = period.split('-');
    const data = await api('GET', '/members/earnings/statement?year=' + yr + '&month=' + parseInt(mo));

    await _loadJsPDF();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = 210, ph = 297;
    const co = data.company || {};
    const m  = data.member  || {};

    const L    = _LANGS[window._pdfLang || 'en'];
    const NAVY = [13, 27, 62];
    const BORD = [139, 26, 26];
    const BLACK = [30, 30, 40];
    const GRAY  = [90, 90, 100];
    const LGRAY = [160, 160, 170];
    const DBLUE = [220, 235, 255];
    const GREEN = [34, 139, 34];
    const RED   = [180, 50, 50];

    const totGross   = data.totals?.gross || 0;
    const periodLabel= data.period_label || (new Date(parseInt(yr), parseInt(mo)-1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
    const today      = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const _drawPage = () => {
      // Fond blanc total
      pdf.setFillColor(255,255,255); pdf.rect(0,0,pw,ph,'F');
      // Bande navy en-tête
      pdf.setFillColor(...NAVY); pdf.rect(0,0,pw,28,'F');
      // Trait bordeaux
      pdf.setFillColor(...BORD); pdf.rect(0,28,pw,1.5,'F');
      // Logo (depuis DB ou logo LEADER par défaut)
      const _stmtLogoUri = co.logo_data_uri || _DEFAULT_LEADER_LOGO;
      try { const _f = _stmtLogoUri.includes('image/jpeg')||_stmtLogoUri.includes('image/jpg') ? 'JPEG':'PNG'; pdf.addImage(_stmtLogoUri,_f,pw/2-22,5,44,14); }
      catch(e) { pdf.setTextColor(255,255,255); pdf.setFontSize(16); pdf.setFont('helvetica','bold'); pdf.text(co.network_name||'LEADER',12,18); }
      // Infos compagnie droite dans en-tête
      pdf.setTextColor(200,200,215); pdf.setFontSize(6.5); pdf.setFont('helvetica','normal');
      const coL1 = co.legal_name||co.name||''; const coL2 = co.registration_number ? 'Co. No. '+co.registration_number:''; const coL3=[co.address,co.city,co.country].filter(Boolean).join(', ');
      if(coL1) pdf.text(coL1,pw-8,10,{align:'right'}); if(coL2) pdf.text(coL2,pw-8,15.5,{align:'right'}); if(coL3) pdf.text(coL3,pw-8,21,{align:'right'});
    };

    const _drawFooter = () => _letterDrawFooter(pdf, pw, ph, co);

    // ── PAGE 1 ─────────────────────────────────────────────────
    _drawPage();
    let y = 35;

    // Titre du document
    pdf.setTextColor(...NAVY); pdf.setFontSize(11.5); pdf.setFont('helvetica','bold');
    pdf.text(L.stmtTitle, pw/2, y, {align:'center'}); y+=6;
    pdf.setFillColor(...NAVY); pdf.rect(20,y,pw-40,0.4,'F'); y+=5;

    // Infos membre + période
    pdf.setFillColor(245,248,255); pdf.roundedRect(14,y,pw-28,18,2,2,'F');
    pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.2); pdf.roundedRect(14,y,pw-28,18,2,2,'S');
    pdf.setFillColor(...NAVY); pdf.roundedRect(14,y,pw-28,6,2,2,'F'); pdf.rect(14,y+3,pw-28,3,'F');
    pdf.setTextColor(255,255,255); pdf.setFontSize(6.5); pdf.setFont('helvetica','bold');
    pdf.text(L.periodCoveredLbl, 18, y+4.5);
    pdf.setTextColor(255,255,255); pdf.setFontSize(10); pdf.setFont('helvetica','bold');
    pdf.text(periodLabel, pw/2, y+14, {align:'center'});
    y+=22;

    // Infos membre
    pdf.setFillColor(250,251,254); pdf.roundedRect(14,y,pw-28,14,2,2,'F');
    pdf.setDrawColor(220,225,240); pdf.setLineWidth(0.2); pdf.roundedRect(14,y,pw-28,14,2,2,'S');
    const infoItems = [
      [L.fullName, ((m.first_name||'')+' '+(m.last_name||'')).trim()],
      [L.memberId, m.unique_id||'N/A'],
      [L.rank, m.current_rank||'N/A'],
    ];
    const iw = (pw-30)/3;
    infoItems.forEach(([lbl,val],i) => {
      const ix = 16+i*(iw+2);
      pdf.setTextColor(...GRAY); pdf.setFontSize(5.5); pdf.setFont('helvetica','normal'); pdf.text(lbl,ix,y+5);
      pdf.setTextColor(...NAVY); pdf.setFontSize(7.5); pdf.setFont('helvetica','bold'); pdf.text(_trunc(val,22),ix,y+11);
    });
    y+=18;

    // Total en grand
    pdf.setFillColor(13,27,62); pdf.roundedRect(14,y,pw-28,16,2,2,'F');
    pdf.setTextColor(200,200,215); pdf.setFontSize(7); pdf.setFont('helvetica','normal');
    pdf.text(L.totalComm, pw/2,y+5.5,{align:'center'});
    pdf.setTextColor(255,255,255); pdf.setFontSize(16); pdf.setFont('helvetica','bold');
    pdf.text(_fmtMoney(totGross)+' USD', pw/2,y+13,{align:'center'});
    y+=20;

    // Tableau commissions
    const comms = data.commissions||[];
    pdf.setFillColor(...NAVY); pdf.roundedRect(14,y,pw-28,7,2,2,'F');
    pdf.setTextColor(255,255,255); pdf.setFontSize(6.5); pdf.setFont('helvetica','bold');
    const cols=[{x:16,l:'Date',w:20},{x:38,l:'Type',w:42},{x:82,l:'Description',w:58},{x:142,l:'Status',w:22},{x:167,l:'Amount',w:25}];
    cols.forEach(c=>pdf.text(c.l,c.x,y+4.7));
    y+=8;

    const rowH=6.5;
    let rowIdx=0;
    for (const c of comms) {
      if (y+rowH > ph-20) {
        _drawFooter();
        pdf.addPage(); _drawPage(); y=35;
        // Répéter en-tête tableau
        pdf.setFillColor(...NAVY); pdf.roundedRect(14,y,pw-28,7,2,2,'F');
        pdf.setTextColor(255,255,255); pdf.setFontSize(6.5); pdf.setFont('helvetica','bold');
        cols.forEach(c=>pdf.text(c.l,c.x,y+4.7)); y+=8;
      }
      pdf.setFillColor(rowIdx%2===0?248:242, rowIdx%2===0?250:246, rowIdx%2===0?255:252);
      pdf.rect(14,y-1,pw-28,rowH,'F');
      const sc = c.status==='approved'||c.status==='paid'?GREEN:c.status==='pending'?[200,140,0]:RED;
      pdf.setTextColor(...GRAY);    pdf.setFontSize(5.5); pdf.setFont('helvetica','normal'); pdf.text(_fmtDate(c.created_at),16,y+3.5);
      pdf.setTextColor(...NAVY);    pdf.setFontSize(5.5); pdf.text(_trunc(_COMM_LABELS[c.type]||c.type,22),38,y+3.5);
      pdf.setTextColor(...GRAY);    pdf.text(_trunc(c.description||'—',36),82,y+3.5);
      pdf.setTextColor(...sc);      pdf.setFont('helvetica','bold'); pdf.text((c.status||'—').toUpperCase(),142,y+3.5);
      pdf.setTextColor(...NAVY);    pdf.setFont('helvetica','bold'); pdf.text(_fmtMoney(c.amount),192,y+3.5,{align:'right'});
      y+=rowH; rowIdx++;
    }
    if (comms.length===0) {
      pdf.setTextColor(...GRAY); pdf.setFontSize(8); pdf.setFont('helvetica','italic');
      pdf.text('No commissions recorded for this period.', pw/2,y+6,{align:'center'}); y+=14;
    }

    // Récapitulatif par type
    y+=6;
    if (y+60>ph-22) { _drawFooter(); pdf.addPage(); _drawPage(); y=35; }

    pdf.setFillColor(...NAVY); pdf.roundedRect(14,y,(pw-30)/2,7,2,2,'F');
    pdf.setTextColor(255,255,255); pdf.setFontSize(6.5); pdf.setFont('helvetica','bold');
    pdf.text(L.summaryByType, 18, y+4.7); y+=9;

    const summary = data.summary||{};
    for (const [type,amount] of Object.entries(summary)) {
      pdf.setFillColor(248,250,255); pdf.rect(14,y-1,(pw-30)/2,6,'F');
      pdf.setDrawColor(220,228,245); pdf.setLineWidth(0.1); pdf.rect(14,y-1,(pw-30)/2,6,'S');
      pdf.setTextColor(...NAVY); pdf.setFontSize(6); pdf.setFont('helvetica','normal'); pdf.text(_COMM_LABELS[type]||type,17,y+3);
      pdf.setTextColor(...BORD); pdf.setFont('helvetica','bold'); pdf.text(_fmtMoney(amount),(pw-30)/2+11,y+3,{align:'right'}); y+=6.5;
    }
    y+=2;
    pdf.setFillColor(...NAVY); pdf.roundedRect(14,y,(pw-30)/2,9,2,2,'F');
    pdf.setTextColor(255,255,255); pdf.setFontSize(7.5); pdf.setFont('helvetica','bold');
    pdf.text(L.total,18,y+6); pdf.text(_fmtMoney(totGross),(pw-30)/2+11,y+6,{align:'right'});

    // Déclaration officielle
    y+=16;
    if (y+32>ph-22) { _drawFooter(); pdf.addPage(); _drawPage(); y=35; }
    pdf.setFillColor(245,248,255); pdf.roundedRect(14,y,pw-28,30,3,3,'F');
    pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.3); pdf.roundedRect(14,y,pw-28,30,3,3,'S');
    pdf.setTextColor(...NAVY); pdf.setFontSize(7); pdf.setFont('helvetica','bold');
    pdf.text(L.officialDecl, pw/2,y+6,{align:'center'});
    pdf.setTextColor(...GRAY); pdf.setFontSize(6.2); pdf.setFont('helvetica','normal');
    const declLines = pdf.splitTextToSize(L.declText((m.first_name||'')+' '+(m.last_name||''),m.unique_id||'N/A',periodLabel,co.legal_name||co.name||'LEADER',co.registration_number), pw-30);
    pdf.text(declLines,pw/2,y+13,{align:'center'});

    // Footer sur toutes les pages
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i=1; i<=totalPages; i++) { pdf.setPage(i); _letterDrawFooter(pdf,pw,ph,co); }

    pdf.save(data.doc_ref+'.pdf');
    showToast('Monthly Statement téléchargé avec succès', 'success');
  } catch(e) { showToast(e.error||'Erreur lors de la génération','error'); console.error(e); }
  finally { btn.innerHTML = orig; btn.disabled = false; }
}

// ─── Générateur 2 : Annual Income Certificate (fond blanc + logo + multilingue) ──
async function generateAnnualCertificate() {
  // Sélecteur de langue avant génération
  window._pdfLang = window._pdfLang || 'fr';
  const _langChosen = await new Promise(resolve => _showLangPicker(lang => resolve(lang)));
  if (!_langChosen) return;  // Annulé par l'utilisateur
  window._pdfLang = _langChosen;

  const btn = document.getElementById('btn-annual');
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Génération...'; btn.disabled = true;
  try {
    const year = document.getElementById('annual-year-select')?.value;
    const data = await api('GET', '/members/earnings/annual?year=' + year);

    await _loadJsPDF();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = 210, ph = 297;
    const co = data.company || {};
    const m  = data.member  || {};
    const L  = _LANGS[window._pdfLang || 'en'];

    const NAVY  = [13,27,62]; const BORD=[139,26,26]; const BLACK=[30,30,40];
    const GRAY  = [90,90,100]; const LGRAY=[160,160,170];
    const GREEN = [34,139,34]; const DBLUE=[230,238,255];

    const totalAnnual = data.totals?.gross    || 0;
    const totalWd     = data.totals?.withdrawn || 0;

    _letterDrawHeader(pdf, pw, co, new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}));
    let y = 40;

    // Titre central
    pdf.setFillColor(245,248,255); pdf.roundedRect(14,y,pw-28,22,3,3,'F');
    pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.4); pdf.roundedRect(14,y,pw-28,22,3,3,'S');
    pdf.setFillColor(...BORD); pdf.roundedRect(14,y,pw-28,2.5,3,3,'F'); pdf.rect(14,y+1.5,pw-28,1,'F');
    pdf.setTextColor(...NAVY); pdf.setFontSize(14); pdf.setFont('helvetica','bold');
    pdf.text(L.annualCertTitle, pw/2, y+12, {align:'center'});
    pdf.setTextColor(...BORD); pdf.setFontSize(9); pdf.setFont('helvetica','normal');
    pdf.text(L.fiscalYear(data.year), pw/2, y+19, {align:'center'});
    y+=28;

    // Infos membre (grille)
    pdf.setFillColor(245,248,255); pdf.roundedRect(14,y,pw-28,30,2,2,'F');
    pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.2); pdf.roundedRect(14,y,pw-28,30,2,2,'S');
    pdf.setFillColor(...NAVY); pdf.roundedRect(14,y,pw-28,7,2,2,'F'); pdf.rect(14,y+4,pw-28,3,'F');
    pdf.setTextColor(255,255,255); pdf.setFontSize(6.5); pdf.setFont('helvetica','bold');
    pdf.text(L.memberInfo, 18, y+5);
    const infoData = [
      [L.fullName,   (m.first_name||'')+' '+(m.last_name||'')],
      [L.memberId,    m.unique_id||'N/A'],
      ['Email',       m.email||'N/A'],
      ['Country',     m.country||'N/A'],
      [L.rank,        m.current_rank||'N/A'],
      [L.status,      m.member_status||'N/A'],
    ];
    const colW=(pw-32)/3;
    infoData.forEach(([lbl,val],i) => {
      const col=i%3, row=Math.floor(i/3);
      const ix=16+col*(colW+2), iy=y+11+row*9;
      pdf.setTextColor(...GRAY); pdf.setFontSize(5.5); pdf.setFont('helvetica','normal'); pdf.text(lbl,ix,iy);
      pdf.setTextColor(...NAVY); pdf.setFontSize(7);   pdf.setFont('helvetica','bold');   pdf.text(_trunc(val,26),ix,iy+5);
    });
    y+=36;

    // KPIs (4 cases fond blanc bordure navy)
    const kpis=[
      {l:L.totalAnnual(data.year), v:_fmtMoney(totalAnnual),  c:NAVY},
      {l:'Total Withdrawn',        v:_fmtMoney(totalWd),       c:BORD},
      {l:'Balance',                v:_fmtMoney(totalAnnual-totalWd), c:[34,139,34]},
      {l:'Fiscal Year',            v:String(data.year),        c:[100,100,130]},
    ];
    const kw=(pw-30)/4;
    kpis.forEach((k,i)=>{
      const kx=14+i*(kw+2);
      pdf.setFillColor(245,248,255); pdf.roundedRect(kx,y,kw,18,2,2,'F');
      pdf.setDrawColor(...k.c); pdf.setLineWidth(0.4); pdf.roundedRect(kx,y,kw,18,2,2,'S');
      pdf.setFillColor(...k.c); pdf.roundedRect(kx,y,kw,2.5,1,1,'F');
      pdf.setTextColor(...GRAY); pdf.setFontSize(5.5); pdf.setFont('helvetica','normal');
      const ll=pdf.splitTextToSize(k.l,kw-4); pdf.text(ll,kx+kw/2,y+8,{align:'center'});
      pdf.setTextColor(...k.c); pdf.setFontSize(9); pdf.setFont('helvetica','bold');
      pdf.text(k.v,kx+kw/2,y+15,{align:'center'});
    });
    y+=24;

    // Tableau récap par type (gauche)
    pdf.setFillColor(...NAVY); pdf.roundedRect(14,y,(pw-30)/2,7,2,2,'F');
    pdf.setTextColor(255,255,255); pdf.setFontSize(6.5); pdf.setFont('helvetica','bold');
    pdf.text(L.earningsByType,18,y+4.7); y+=9;
    let yTypeStart=y;
    for (const [type,amount] of Object.entries(data.commissions_by_type||{})) {
      pdf.setFillColor(248,250,255); pdf.roundedRect(14,y-1,(pw-30)/2,6.5,1,1,'F');
      pdf.setDrawColor(220,228,245); pdf.setLineWidth(0.1); pdf.roundedRect(14,y-1,(pw-30)/2,6.5,1,1,'S');
      pdf.setTextColor(...NAVY); pdf.setFontSize(6); pdf.setFont('helvetica','normal'); pdf.text(_COMM_LABELS[type]||type,17,y+3.5);
      pdf.setTextColor(...BORD); pdf.setFont('helvetica','bold'); pdf.text(_fmtMoney(amount),(pw-30)/2+11,y+3.5,{align:'right'}); y+=7;
    }

    // Tableau mensuel (droite)
    let yR=yTypeStart-9;
    const xR=(pw-30)/2+16;
    pdf.setFillColor(...BORD); pdf.roundedRect(xR,yR,(pw-30)/2,7,2,2,'F');
    pdf.setTextColor(255,255,255); pdf.setFontSize(6.5); pdf.setFont('helvetica','bold');
    pdf.text(L.monthlyBreakdown,xR+4,yR+4.7); yR+=9;
    const months = L.months;
    for (let mo=1; mo<=12; mo++) {
      const key=data.year+'-'+String(mo).padStart(2,'0');
      const val=(data.commissions_monthly||{})[key]||0;
      pdf.setFillColor(mo%2===0?248:242,mo%2===0?250:246,mo%2===0?255:252);
      pdf.roundedRect(xR,yR-1,(pw-30)/2,6.5,1,1,'F');
      pdf.setTextColor(...GRAY); pdf.setFontSize(6); pdf.setFont('helvetica','normal'); pdf.text(months[mo-1]+' '+data.year,xR+4,yR+3.5);
      pdf.setTextColor(val>0?GREEN[0]:LGRAY[0],val>0?GREEN[1]:LGRAY[1],val>0?GREEN[2]:LGRAY[2]);
      pdf.setFont('helvetica',val>0?'bold':'normal');
      pdf.text(val>0?_fmtMoney(val):'—',xR+(pw-30)/2-4,yR+3.5,{align:'right'}); yR+=6.5;
    }

    y=Math.max(y,yR)+8;

    // Certification officielle
    if (y+40>ph-22) { _letterDrawFooter(pdf,pw,ph,co); pdf.addPage(); _letterDrawHeader(pdf,pw,co,''); y=40; }
    pdf.setFillColor(245,248,255); pdf.roundedRect(14,y,pw-28,38,3,3,'F');
    pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.4); pdf.roundedRect(14,y,pw-28,38,3,3,'S');
    pdf.setDrawColor(...BORD); pdf.setLineWidth(0.2); pdf.roundedRect(16,y+2,pw-32,34,2,2,'S');
    pdf.setTextColor(...NAVY); pdf.setFontSize(8); pdf.setFont('helvetica','bold');
    pdf.text(L.officialCert, pw/2,y+10,{align:'center'});
    pdf.setTextColor(...GRAY); pdf.setFontSize(6.5); pdf.setFont('helvetica','normal');
    const certLines = pdf.splitTextToSize(L.certText((m.first_name||'')+' '+(m.last_name||''),m.unique_id||'N/A',_fmtMoney(totalAnnual),co.legal_name||co.name||'LEADER',_fmtMoney(totalWd),data.year),pw-32);
    pdf.text(certLines,pw/2,y+18,{align:'center'});
    if (co.director) {
      pdf.setTextColor(...BORD); pdf.setFontSize(6); pdf.setFont('helvetica','bold');
      pdf.text(L.authorisedBy(co.director),pw/2,y+35,{align:'center'});
    }

    // Footer sur toutes les pages
    const totalPages=pdf.internal.getNumberOfPages();
    for (let i=1; i<=totalPages; i++) { pdf.setPage(i); _letterDrawFooter(pdf,pw,ph,co); }

    pdf.save(data.doc_ref+'.pdf');
    showToast('Annual Certificate téléchargé avec succès', 'success');
  } catch(e) { showToast(e.error||'Erreur lors de la génération','error'); console.error(e); }
  finally { btn.innerHTML = orig; btn.disabled = false; }
}

// ─── Générateur 3 : Purchase Receipt ──────────────────────────────────────

// ─── Générateur 3 : Purchase Receipt ──────────────────────────────────────

async function generatePurchaseReceipt() {
  const btn = document.getElementById('btn-receipt');
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Génération...'; btn.disabled = true;
  try {
    const orderId = document.getElementById('receipt-order-select')?.value;
    if (!orderId) { showToast('Sélectionnez une commande', 'error'); return; }

    const data = await api('GET', '/members/earnings/receipt/' + orderId);

    await _loadJsPDF();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = 210, ph = 297;
    const co = data.company || {};
    const m  = data.member  || {};
    const o  = data.order   || {};

    // ── Palette fond blanc premium (identique aux lettres officielles) ──
    const NAVY  = [13, 27, 62];      // #0D1B3E
    const BORD  = [139, 26, 26];     // #8B1A1A bordeaux
    const BLACK = [30, 30, 45];
    const GRAY  = [100, 100, 115];
    const LGRAY = [180, 180, 195];
    const WHITE = [255, 255, 255];
    const GREEN_STATUS = [22, 163, 74];
    const ORANGE_STATUS = [234, 88, 12];

    // ── Fond blanc total ──
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pw, ph, 'F');

    // ── En-tête fond navy (identique _letterDrawHeader) ──
    pdf.setFillColor(...NAVY);
    pdf.rect(0, 0, pw, 28, 'F');
    pdf.setFillColor(...BORD);
    pdf.rect(0, 28, pw, 1.5, 'F');

    // Logo centré dans bande navy
    const _rcptLogo = co.logo_data_uri || _DEFAULT_LEADER_LOGO;
    try {
      const _fR = _rcptLogo.includes('image/jpeg') || _rcptLogo.includes('image/jpg') ? 'JPEG' : 'PNG';
      pdf.addImage(_rcptLogo, _fR, pw/2 - 22, 5, 44, 14);
    } catch(e) {
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
      pdf.text(co.trade_name || co.network_name || 'LEADER', pw/2, 18, { align: 'center' });
    }

    // Infos société droite dans bande navy
    pdf.setTextColor(200, 200, 215);
    pdf.setFontSize(6); pdf.setFont('helvetica', 'normal');
    const rcptLegal = co.legal_name || co.name || '';
    const rcptReg   = co.registration_number ? 'Co. No. ' + co.registration_number : '';
    const rcptAddr  = [co.address, co.city, co.country].filter(Boolean).join(', ');
    if (rcptLegal) pdf.text(rcptLegal, pw - 8, 11, { align: 'right' });
    if (rcptReg)   pdf.text(rcptReg,   pw - 8, 16, { align: 'right' });
    if (rcptAddr)  pdf.text(rcptAddr,  pw - 8, 21, { align: 'right' });

    let y = 36;

    // ── Titre et numéro du document ──
    pdf.setTextColor(...NAVY);
    pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
    pdf.text('REÇU OFFICIEL D\'ACHAT', pw / 2, y + 7, { align: 'center' });
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...GRAY);
    pdf.text('Official Purchase Receipt', pw / 2, y + 13, { align: 'center' });

    // Ref doc (gauche) + date (droite)
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...GRAY);
    pdf.text('Réf : ' + (data.doc_ref || '—'), 14, y + 7);
    pdf.text('Date : ' + _fmtDate(o.created_at || new Date()), pw - 14, y + 7, { align: 'right' });

    // Trait de séparation
    pdf.setDrawColor(...BORD); pdf.setLineWidth(0.5);
    pdf.line(14, y + 17, pw - 14, y + 17);
    y += 22;

    // ── Montant principal — grosse boîte premium ──
    pdf.setFillColor(247, 248, 252);
    pdf.roundedRect(14, y, pw - 28, 28, 3, 3, 'F');
    pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.3);
    pdf.roundedRect(14, y, pw - 28, 28, 3, 3, 'S');
    // Trait gauche bordeaux
    pdf.setFillColor(...BORD);
    pdf.roundedRect(14, y, 2, 28, 1, 1, 'F');

    pdf.setTextColor(...GRAY);
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
    pdf.text('MONTANT TOTAL / AMOUNT PAID', pw/2, y + 8, { align: 'center' });
    pdf.setTextColor(...NAVY);
    pdf.setFontSize(24); pdf.setFont('helvetica', 'bold');
    pdf.text(_fmtMoney(o.amount_usd), pw/2, y + 21, { align: 'center' });
    y += 34;

    // ── Grille 2 colonnes : détails commande + détails acheteur ──
    const colW = (pw - 28 - 4) / 2; // 2 colonnes avec gap 4mm
    const col1x = 14, col2x = 14 + colW + 4;
    const rowH = 42;

    // COLONNE 1 : Détails commande
    pdf.setFillColor(247, 248, 252);
    pdf.roundedRect(col1x, y, colW, rowH, 2, 2, 'F');
    pdf.setFillColor(...NAVY);
    pdf.roundedRect(col1x, y, colW, 7, 2, 2, 'F');
    pdf.rect(col1x, y + 4, colW, 3, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold');
    pdf.text('DÉTAILS COMMANDE', col1x + 4, y + 5);

    const orderRows = [
      ['Package / Produit',  o.package_name || 'N/A'],
      ['Référence',          o.id ? o.id.substring(0,16).toUpperCase() : 'N/A'],
      ['Date commande',      _fmtDate(o.created_at)],
      ['Méthode paiement',   o.payment_method || 'N/A'],
      ['Valeur BV',          (o.bv_value || 0) + ' BV'],
    ];
    let yi1 = y + 11;
    orderRows.forEach(([lbl, val]) => {
      pdf.setTextColor(...LGRAY); pdf.setFontSize(5.5); pdf.setFont('helvetica', 'normal');
      pdf.text(lbl, col1x + 4, yi1);
      pdf.setTextColor(...BLACK); pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold');
      pdf.text(_trunc(String(val), 22), col1x + 4, yi1 + 4);
      yi1 += 8;
    });

    // COLONNE 2 : Informations acheteur
    pdf.setFillColor(247, 248, 252);
    pdf.roundedRect(col2x, y, colW, rowH, 2, 2, 'F');
    pdf.setFillColor(...BORD);
    pdf.roundedRect(col2x, y, colW, 7, 2, 2, 'F');
    pdf.rect(col2x, y + 4, colW, 3, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold');
    pdf.text('INFORMATIONS ACHETEUR', col2x + 4, y + 5);

    const buyerRows = [
      ['Nom complet',   (m.first_name||'') + ' ' + (m.last_name||'')],
      ['ID Membre',     m.unique_id || 'N/A'],
      ['Email',         m.email || 'N/A'],
      ['Pays',          m.country || 'N/A'],
      ['Statut',        co.member_title || 'Partenaire Indépendant(e)'],
    ];
    let yi2 = y + 11;
    buyerRows.forEach(([lbl, val]) => {
      pdf.setTextColor(...LGRAY); pdf.setFontSize(5.5); pdf.setFont('helvetica', 'normal');
      pdf.text(lbl, col2x + 4, yi2);
      pdf.setTextColor(...BLACK); pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold');
      pdf.text(_trunc(String(val), 22), col2x + 4, yi2 + 4);
      yi2 += 8;
    });
    y += rowH + 6;

    // ── Informations vendeur / émetteur ──
    pdf.setFillColor(247, 248, 252);
    pdf.roundedRect(14, y, pw - 28, 38, 2, 2, 'F');
    pdf.setFillColor(...NAVY);
    pdf.roundedRect(14, y, pw - 28, 7, 2, 2, 'F');
    pdf.rect(14, y + 4, pw - 28, 3, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold');
    pdf.text('ÉMETTEUR / SELLER — WILL BE COACHING LLP', 18, y + 5);

    const sellerCols = [
      [
        ['Nom commercial',   co.trade_name  || co.network_name || 'LEADER'],
        ['Raison sociale',   co.legal_name  || 'WILL BE COACHING LLP'],
        ['N° entreprise',    co.registration_number || 'OC445365'],
      ],
      [
        ['Adresse',          co.address || '72 Halliwick Road'],
        ['Ville / Code',     [co.city, co.postal_code].filter(Boolean).join(' ') || 'London, N10 1AB'],
        ['Pays',             co.country || 'England'],
      ],
      [
        ['Email',            co.email   || 'N/A'],
        ['Site web',         co.website || 'N/A'],
        ['Directeur',        co.director || 'N/A'],
      ],
    ];

    const sColW = (pw - 32) / 3;
    sellerCols.forEach((rows, ci) => {
      const sx = 18 + ci * (sColW + 2);
      let sy = y + 11;
      rows.forEach(([lbl, val]) => {
        pdf.setTextColor(...LGRAY); pdf.setFontSize(5.5); pdf.setFont('helvetica', 'normal');
        pdf.text(lbl, sx, sy);
        pdf.setTextColor(...NAVY); pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold');
        pdf.text(_trunc(String(val), 24), sx, sy + 4);
        sy += 10;
      });
    });
    y += 44;

    // ── Note légale fond bleu très clair ──
    pdf.setFillColor(240, 244, 255);
    pdf.roundedRect(14, y, pw - 28, 30, 2, 2, 'F');
    pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.2);
    pdf.roundedRect(14, y, pw - 28, 30, 2, 2, 'S');

    pdf.setTextColor(...NAVY); pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
    pdf.text('NOTE LÉGALE / LEGAL NOTE', pw/2, y + 7, { align: 'center' });

    pdf.setTextColor(...GRAY); pdf.setFontSize(6); pdf.setFont('helvetica', 'normal');
    const tradeName  = co.trade_name || co.network_name || 'LEADER';
    const legalName  = co.legal_name || 'WILL BE COACHING LLP';
    const regNo      = co.registration_number || 'OC445365';
    const memberFull = ((m.first_name||'') + ' ' + (m.last_name||'')).trim();
    const memberTitle = co.member_title || 'Partenaire Indépendant(e)';
    const legalNote = `Ce reçu officiel certifie que ${memberFull} (ID: ${m.unique_id||'N/A'}), ${memberTitle}, a effectué l'achat du "${o.package_name||'Package'}" pour un montant de ${_fmtMoney(o.amount_usd)} le ${_fmtDate(o.created_at)}. Ce document est émis par ${tradeName} (${legalName}, Co. No. ${regNo}) et peut être utilisé comme justificatif d'investissement à des fins fiscales et légales. / This receipt certifies that ${memberFull} purchased "${o.package_name||'Package'}" for ${_fmtMoney(o.amount_usd)} on ${_fmtDate(o.created_at)}, issued by ${tradeName} (${legalName}, Co. No. ${regNo}).`;
    const legalLines = pdf.splitTextToSize(legalNote, pw - 32);
    pdf.text(legalLines, pw/2, y + 14, { align: 'center' });
    y += 36;

    // ── Footer identique _letterDrawFooter ──
    _letterDrawFooter(pdf, pw, ph, co);

    // QR code / tampon (simulation)
    pdf.setFillColor(247, 248, 252);
    pdf.roundedRect(pw - 30, ph - 30, 20, 20, 2, 2, 'F');
    pdf.setDrawColor(...LGRAY); pdf.setLineWidth(0.3);
    pdf.roundedRect(pw - 30, ph - 30, 20, 20, 2, 2, 'S');
    pdf.setTextColor(...LGRAY); pdf.setFontSize(5); pdf.setFont('helvetica', 'normal');
    pdf.text('Document officiel', pw - 20, ph - 8, { align: 'center' });
    pdf.text(data.doc_ref || '', pw - 20, ph - 5, { align: 'center' });

    pdf.save((data.doc_ref || 'receipt') + '.pdf');
    showToast('Reçu Premium téléchargé avec succès ✓', 'success');
  } catch(e) {
    showToast(e.error || 'Erreur lors de la génération', 'error');
  } finally {
    btn.innerHTML = orig; btn.disabled = false;
  }
}

// ─── Helpers lettre officielle fond blanc ──────────────────────────────────

function _letterDrawHeader(pdf, pw, co, dateStr) {
  const NAVY = [13, 27, 62];   // #0D1B3E bleu marine logo
  const BORD = [139, 26, 26];  // #8B1A1A rouge bordeaux logo
  const GRAY = [100, 100, 110];
  const WHITE = [255, 255, 255];

  // Fond blanc total
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pw, 297, 'F');

  // Bande supérieure navy
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pw, 28, 'F');

  // Accent bordeaux (ligne sous bande)
  pdf.setFillColor(...BORD);
  pdf.rect(0, 28, pw, 1.5, 'F');

  // Logo (depuis DB ou logo LEADER par défaut intégré)
  const _logoUriLtr = co.logo_data_uri || _DEFAULT_LEADER_LOGO;
  try {
    const _fmtLtr = _logoUriLtr.includes('image/jpeg') || _logoUriLtr.includes('image/jpg') ? 'JPEG' : 'PNG';
    // Ratio ~5:1 → largeur 54mm, hauteur ~11mm centré dans bande 28mm (y=8.5 pour centrer)
    pdf.addImage(_logoUriLtr, _fmtLtr, pw/2 - 22, 5, 44, 14);
  } catch(e) {
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    pdf.text(co.network_name || co.name || 'LEADER', 12, 18);
  }

  // Infos compagnie (droite, bande navy)
  pdf.setTextColor(200, 200, 215);
  pdf.setFontSize(6.5); pdf.setFont('helvetica', 'normal');
  const coLine1 = co.legal_name || co.name || '';
  const coLine2 = co.registration_number ? 'Co. No. ' + co.registration_number : '';
  const coLine3 = [co.address, co.city, co.country].filter(Boolean).join(', ');
  if (coLine1) pdf.text(coLine1, pw - 8, 10, { align: 'right' });
  if (coLine2) pdf.text(coLine2, pw - 8, 15.5, { align: 'right' });
  if (coLine3) pdf.text(coLine3, pw - 8, 21, { align: 'right' });

  // Date sous la bande
  pdf.setTextColor(...GRAY);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
  pdf.text('Dated: ' + dateStr, pw - 8, 37, { align: 'right' });
}

function _letterDrawFooter(pdf, pw, ph, co) {
  const NAVY = [13, 27, 62];
  const BORD = [139, 26, 26];
  const GRAY = [120, 120, 130];

  // Ligne séparatrice bordeaux
  pdf.setFillColor(...BORD);
  pdf.rect(0, ph - 18, pw, 0.8, 'F');

  // Bande footer navy
  pdf.setFillColor(...NAVY);
  pdf.rect(0, ph - 17, pw, 17, 'F');

  // Infos légales footer
  pdf.setTextColor(180, 180, 200);
  pdf.setFontSize(5.5); pdf.setFont('helvetica', 'normal');
  const line1 = [co.legal_name || co.name, co.registration_number ? 'Co. No. ' + co.registration_number : '', co.vat_number ? 'VAT: ' + co.vat_number : ''].filter(Boolean).join('  ·  ');
  const line2 = [co.address, co.city, co.postal_code, co.country].filter(Boolean).join(', ');
  const line3 = [co.phone ? co.phone : '', co.email ? co.email : ''].filter(Boolean).join('   ');
  pdf.text(line1, pw / 2, ph - 12, { align: 'center' });
  if (line2) pdf.text(line2, pw / 2, ph - 8.5, { align: 'center' });
  if (line3) pdf.text(line3, pw / 2, ph - 5, { align: 'center' });
}

// ─── Générateur 4 : Official Letter — Annual (fond blanc) ─────────────────

async function generateOfficialLetterAnnual() {
  // Sélecteur de langue avant génération
  window._pdfLang = window._pdfLang || 'fr';
  const _langChosen = await new Promise(resolve => _showLangPicker(lang => resolve(lang)));
  if (!_langChosen) return;  // Annulé par l'utilisateur
  window._pdfLang = _langChosen;

  const btn = document.getElementById('btn-letter-annual');
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Génération...'; btn.disabled = true;
  try {
    const year = document.getElementById('annual-year-select')?.value || new Date().getFullYear() - 1;
    const data = await api('GET', '/members/earnings/annual?year=' + year);

    await _loadJsPDF();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = 210, ph = 297;
    const co = data.company || {};
    const m  = data.member  || {};

    const NAVY   = [13, 27, 62];
    const BORD   = [139, 26, 26];
    const BLACK  = [30, 30, 40];
    const GRAY   = [90, 90, 100];
    const LGRAY  = [160, 160, 170];
    const L = _LANGS[window._pdfLang || 'fr'];
    const totalEarned = data.totals?.gross || 0;
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const startDateStr = m.created_at
      ? new Date(m.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      : 'registration date';

    // ── EN-TÊTE ────────────────────────────────────────────────
    _letterDrawHeader(pdf, pw, co, today);

    let y = 45;

    // Titre de la lettre (multilingue)
    pdf.setTextColor(...NAVY);
    pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
    pdf.text(L.letterTitle, pw / 2, y, { align: 'center' });
    y += 8;

    // Ligne de séparation navy sous le titre
    pdf.setFillColor(...NAVY);
    pdf.rect(20, y, pw - 40, 0.5, 'F');
    y += 7;

    // Subject
    pdf.setTextColor(...GRAY);
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold');
    pdf.text(L.ref, 14, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(L.subject, 14 + pdf.getTextWidth(L.ref) + 3, y);
    y += 10;

    // Référence lettre + année
    pdf.setTextColor(...LGRAY);
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal');
    pdf.text((data.doc_ref || ('LTR-' + year + '-' + (m.unique_id || ''))), pw - 14, y - 2, { align: 'right' });
    y += 2;

    // Corps principal de la lettre (multilingue)
    const fullName = ((m.first_name || '') + ' ' + (m.last_name || '')).toUpperCase().trim();
    const companyName = co.legal_name || co.network_name || co.name || 'LEADER';
    const regNo = co.registration_number || '';
    const memberRef = m.unique_id || 'N/A';

    const paragraphs = [
      L.para1(fullName, today),
      L.para2(fullName, companyName, regNo, memberRef, co.member_title),
      L.para3annual(fullName, startDateStr, _fmtMoney(totalEarned), year),
      L.para4(),
    ];

    pdf.setTextColor(...BLACK);
    pdf.setFontSize(9.5); pdf.setFont('helvetica', 'normal');

    for (const para of paragraphs) {
      const lines = pdf.splitTextToSize(para, pw - 28);
      pdf.text(lines, 14, y);
      y += lines.length * 5.5 + 5;
    }

    // Bloc récapitulatif annuel (tableau stylisé fond blanc)
    y += 4;
    pdf.setFillColor(245, 247, 250);
    pdf.roundedRect(14, y, pw - 28, 40, 3, 3, 'F');
    pdf.setDrawColor(...NAVY);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(14, y, pw - 28, 40, 3, 3, 'S');

    // Titre bloc (multilingue)
    pdf.setFillColor(...NAVY);
    pdf.roundedRect(14, y, pw - 28, 8, 3, 3, 'F');
    pdf.rect(14, y + 3, pw - 28, 5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold');
    pdf.text(L.summaryTitle(year), pw / 2, y + 5.5, { align: 'center' });
    y += 10;

    // Lignes du récap (multilingue)
    const recapRows = [
      [L.fullName, fullName],
      [L.memberId, memberRef],
      [L.status, m.member_status || 'N/A'],
      [L.rank, m.current_rank && m.current_rank !== 'none' ? m.current_rank : 'N/A'],
      [L.totalAnnual(year), _fmtMoney(totalEarned) + ' USD'],
    ];
    const rowH2 = 5.8;
    recapRows.forEach(([lbl, val], i) => {
      const rowY = y + i * rowH2;
      pdf.setFillColor(i % 2 === 0 ? 245 : 238, i % 2 === 0 ? 247 : 242, i % 2 === 0 ? 250 : 248);
      pdf.rect(14, rowY - 1, pw - 28, rowH2, 'F');
      pdf.setTextColor(...GRAY);    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
      pdf.text(lbl, 18, rowY + 2.5);
      const isAmount = i === 4;
      pdf.setTextColor(isAmount ? BORD[0] : NAVY[0], isAmount ? BORD[1] : NAVY[1], isAmount ? BORD[2] : NAVY[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(val, pw - 18, rowY + 2.5, { align: 'right' });
    });
    y += recapRows.length * rowH2 + 14;

    // Signature / autorisation
    if (y + 40 > ph - 30) { pdf.addPage(); y = 30; }

    pdf.setTextColor(...GRAY);
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
    pdf.text(L.yoursFaithfully, 14, y);
    y += 14;

    // Ligne signature
    pdf.setDrawColor(...NAVY);
    pdf.setLineWidth(0.4);
    pdf.line(14, y, 80, y);
    y += 5;

    if (co.director) {
      pdf.setTextColor(...NAVY);
      pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
      pdf.text(co.director, 14, y);
      y += 4.5;
      pdf.setTextColor(...GRAY); pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal');
      pdf.text(L.director, 14, y);
    } else {
      pdf.setTextColor(...NAVY); pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
      pdf.text(L.authorised, 14, y);
    }
    y += 5;
    pdf.setTextColor(...LGRAY); pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal');
    pdf.text(companyName, 14, y);

    // Footer
    _letterDrawFooter(pdf, pw, ph, co);

    const filename = ('LTR-' + year + '-' + (m.unique_id || 'M') + '.pdf');
    pdf.save(filename);
    showToast('Lettre officielle annuelle téléchargée', 'success');
  } catch(e) {
    showToast(e.error || 'Erreur lors de la génération', 'error');
    console.error(e);
  } finally {
    btn.innerHTML = orig; btn.disabled = false;
  }
}

// ─── Générateur 5 : Official Letter — Monthly (fond blanc) ────────────────

async function generateOfficialLetterMonthly() {
  // Sélecteur de langue avant génération
  window._pdfLang = window._pdfLang || 'fr';
  const _langChosen = await new Promise(resolve => _showLangPicker(lang => resolve(lang)));
  if (!_langChosen) return;  // Annulé par l'utilisateur
  window._pdfLang = _langChosen;

  const btn = document.getElementById('btn-letter-monthly');
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Génération...'; btn.disabled = true;
  try {
    const period = document.getElementById('stmt-period-select')?.value;
    if (!period) { showToast('Sélectionnez une période', 'error'); btn.innerHTML = orig; btn.disabled = false; return; }
    const [yr, mo] = period.split('-');
    const data = await api('GET', '/members/earnings/statement?year=' + yr + '&month=' + parseInt(mo));

    await _loadJsPDF();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = 210, ph = 297;
    const co = data.company || {};
    const m  = data.member  || {};

    const NAVY  = [13, 27, 62];
    const BORD  = [139, 26, 26];
    const BLACK = [30, 30, 40];
    const GRAY  = [90, 90, 100];
    const LGRAY = [160, 160, 170];
    const L = _LANGS[window._pdfLang || 'fr'];

    const totalMonth  = data.totals?.gross || 0;
    const periodLabel = data.period_label || (new Date(parseInt(yr), parseInt(mo)-1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const startDateStr = m.created_at
      ? new Date(m.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      : 'registration date';

    // ── EN-TÊTE ────────────────────────────────────────────────
    _letterDrawHeader(pdf, pw, co, today);

    let y = 45;

    // Titre (multilingue)
    pdf.setTextColor(...NAVY);
    pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
    pdf.text(L.letterTitleMonthly, pw / 2, y, { align: 'center' });
    y += 8;

    pdf.setFillColor(...NAVY);
    pdf.rect(20, y, pw - 40, 0.5, 'F');
    y += 7;

    // Subject
    pdf.setTextColor(...GRAY);
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold');
    pdf.text(L.ref, 14, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(L.subjectMonthly, 14 + pdf.getTextWidth(L.ref) + 3, y);
    y += 10;

    // Référence
    pdf.setTextColor(...LGRAY); pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal');
    pdf.text((data.doc_ref ? data.doc_ref.replace('STMT-','LTR-') : ('LTR-' + period + '-' + (m.unique_id || ''))), pw - 14, y - 2, { align: 'right' });
    y += 2;

    // Corps (multilingue)
    const fullName    = ((m.first_name || '') + ' ' + (m.last_name || '')).toUpperCase().trim();
    const companyName = co.legal_name || co.network_name || co.name || 'LEADER';
    const regNo       = co.registration_number || '';
    const memberRef   = m.unique_id || 'N/A';

    const paragraphs = [
      L.para1(fullName, today),
      L.para2(fullName, companyName, regNo, memberRef, co.member_title),
      L.para3monthly(fullName, periodLabel, _fmtMoney(totalMonth)),
      L.para4(),
    ];

    pdf.setTextColor(...BLACK);
    pdf.setFontSize(9.5); pdf.setFont('helvetica', 'normal');

    for (const para of paragraphs) {
      const lines = pdf.splitTextToSize(para, pw - 28);
      pdf.text(lines, 14, y);
      y += lines.length * 5.5 + 5;
    }

    // Bloc récapitulatif mensuel
    y += 4;
    pdf.setFillColor(245, 247, 250);
    pdf.roundedRect(14, y, pw - 28, 50, 3, 3, 'F');
    pdf.setDrawColor(...NAVY);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(14, y, pw - 28, 50, 3, 3, 'S');

    pdf.setFillColor(...NAVY);
    pdf.roundedRect(14, y, pw - 28, 8, 3, 3, 'F');
    pdf.rect(14, y + 3, pw - 28, 5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold');
    pdf.text(L.summaryMonthly(periodLabel.toUpperCase()), pw / 2, y + 5.5, { align: 'center' });
    y += 10;

    // Détail par type de commission (étiquettes multilingues)
    const summary = data.summary || {};
    const summaryEntries = Object.entries(summary);
    const recapRows = [
      [L.fullName, fullName],
      [L.memberId, memberRef],
      [L.periodCovered, periodLabel],
      ...summaryEntries.map(([type, amount]) => [_COMM_LABELS[type] || type, _fmtMoney(amount) + ' USD']),
      [L.totalComm, _fmtMoney(totalMonth) + ' USD'],
    ];

    const rowH2 = 5.6;
    recapRows.forEach(([lbl, val], i) => {
      const rowY = y + i * rowH2;
      const isTotal = i === recapRows.length - 1;
      const isAmount = i >= 3;
      pdf.setFillColor(isTotal ? 230 : (i % 2 === 0 ? 245 : 238), isTotal ? 235 : (i % 2 === 0 ? 247 : 242), isTotal ? 245 : (i % 2 === 0 ? 250 : 248));
      pdf.rect(14, rowY - 1, pw - 28, rowH2, 'F');
      pdf.setTextColor(isTotal ? NAVY[0] : GRAY[0], isTotal ? NAVY[1] : GRAY[1], isTotal ? NAVY[2] : GRAY[2]);
      pdf.setFontSize(isTotal ? 7.5 : 7); pdf.setFont('helvetica', isTotal ? 'bold' : 'normal');
      pdf.text(lbl, 18, rowY + 2.5);
      pdf.setTextColor(BORD[0], BORD[1], BORD[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(val, pw - 18, rowY + 2.5, { align: 'right' });
    });
    y += recapRows.length * rowH2 + 14;

    // Signature
    if (y + 40 > ph - 30) { pdf.addPage(); _letterDrawHeader(pdf, pw, co, today); y = 45; }

    pdf.setTextColor(...GRAY);
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
    pdf.text(L.yoursFaithfully, 14, y);
    y += 14;

    pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.4);
    pdf.line(14, y, 80, y);
    y += 5;

    if (co.director) {
      pdf.setTextColor(...NAVY); pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
      pdf.text(co.director, 14, y);
      y += 4.5;
      pdf.setTextColor(...GRAY); pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal');
      pdf.text(L.director, 14, y);
    } else {
      pdf.setTextColor(...NAVY); pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
      pdf.text(L.authorised, 14, y);
    }
    y += 5;
    pdf.setTextColor(...LGRAY); pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal');
    pdf.text(companyName, 14, y);

    _letterDrawFooter(pdf, pw, ph, co);

    const filename = ('LTR-' + period + '-' + (m.unique_id || 'M') + '.pdf');
    pdf.save(filename);
    showToast('Lettre officielle mensuelle téléchargée', 'success');
  } catch(e) {
    showToast(e.error || 'Erreur lors de la génération', 'error');
    console.error(e);
  } finally {
    btn.innerHTML = orig; btn.disabled = false;
  }
}


// ════════════════════════════════════════════════════════════════════════
// CARTE DE MEMBRE — Profil enrichi + Génération carte digitale
// ════════════════════════════════════════════════════════════════════════

// ── Profil enrichi : mise à jour langue / photo / VDI ────────────────
async function saveProfileEnriched() {
  const lang       = document.getElementById('prof-lang')?.value;
  const photo      = window._profilePhotoB64 || null;
  // vdi_consent géré séparément via signMandate() — non inclus ici
  const city       = document.getElementById('p-city')?.value?.trim() || null;
  const whatsapp   = document.getElementById('prof-whatsapp')?.value?.trim() || null;
  const messenger  = document.getElementById('prof-messenger')?.value?.trim() || null;
  try {
    await api('PUT', '/members/profile', {
      preferred_lang: lang, profile_photo: photo,
      city,
      whatsapp_number: whatsapp,
      messenger_id: messenger
    });
    const data = await api('GET', '/members/me');
    currentMember = data.member;
    showToast('Profil enrichi sauvegardé', 'success');
    if (currentPage === 'member-card') showPage('member-card');
  } catch(e) {
    showToast(e.error || 'Erreur lors de la sauvegarde', 'error');
  }
}

// ── Upload photo profil — compression automatique (comme KYC) ────────
async function handleProfilePhotoUpload(input) {
  const file = input.files[0];
  if (!file) return;

  // Formats acceptés : JPEG, PNG, WebP, HEIC (toute image)
  const allowed = ['image/jpeg','image/png','image/webp','image/heic','image/heif','image/gif','image/bmp','image/tiff'];
  if (!file.type.startsWith('image/')) {
    showToast('Format non accepté — utilisez une image (JPG, PNG, WebP…)', 'error'); return;
  }
  // Limite libérée à 50 Mo côté client — la compression s'occupe de tout
  if (file.size > 50 * 1024 * 1024) {
    showToast('Fichier trop volumineux (max 50 Mo)', 'error'); return;
  }

  // Indicateur visuel
  const preview = document.getElementById('prof-photo-preview');
  const ph = document.getElementById('prof-photo-placeholder');
  const statusEl = document.getElementById('prof-photo-status');
  if (statusEl) { statusEl.textContent = 'Optimisation en cours...'; statusEl.classList.remove('hidden'); }

  try {
    // Compression : resize max 800px + JPEG 88% (portrait photo, pas besoin de plus)
    const finalDataUrl = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 800;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
            else { width = Math.round(width * MAX / height); height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          res(canvas.toDataURL('image/jpeg', 0.88));
        };
        img.onerror = rej;
        img.src = ev.target.result;
      };
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

    const approxKB = Math.round((finalDataUrl.length * 0.75) / 1024);
    if (statusEl) { statusEl.textContent = 'Photo optimisée (' + approxKB + ' Ko)'; }

    window._profilePhotoB64 = finalDataUrl;
    if (preview) { preview.src = finalDataUrl; preview.classList.remove('hidden'); }
    if (ph) ph.classList.add('hidden');

  } catch(e) {
    showToast('Erreur lors du traitement de la photo. Réessayez.', 'error');
    if (statusEl) statusEl.classList.add('hidden');
    console.error('Photo compress error:', e);
  }
}

// ── Helper : bloc Mandat Finestrategia ───────────────────────────────
function _buildMandateBlock(cardData, m) {
  var mandate = (cardData && cardData.mandate) || {};
  if (!mandate.enabled) {
    // Fallback : ancienne Autorisation VDI si mandat désactivé
    return '<div class="bg-dark-700/50 rounded-xl p-4 border border-dark-500">'
      + '<label class="flex items-start gap-3 cursor-pointer">'
      + '<input type="checkbox" id="prof-vdi" class="mt-0.5 accent-gold-500 w-4 h-4 flex-shrink-0" ' + (m && m.vdi_consent ? 'checked' : '') + ' onchange="if(this.checked){api(\'PUT\',\'/members/profile\',{vdi_consent:1}).catch(()=>{})}">'
      + '<span class="text-sm text-gray-300"><strong class="text-white">Autorisation VDI</strong> — Je déclare exercer mon activité de Vendeur à Domicile Indépendant(e) en conformité avec la réglementation en vigueur et les exigences légales du marketing de réseau.'
      + (m && m.vdi_consent_at ? '<span class="block text-xs text-gray-500 mt-1">Accepté le ' + new Date(m.vdi_consent_at).toLocaleDateString('fr-FR') + '</span>' : '')
      + '</span></label></div>';
  }
  var signed   = mandate.signed;
  var signedAt = mandate.signed_at;
  var title    = mandate.title || 'Mandat de création de statut professionnel — Finestrategia';
  var bodyRaw  = mandate.body || '';
  var bodyHtml = bodyRaw
    .replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong class="text-white">$1</strong>')
    .replace(/\[DATE\]/g, signedAt ? new Date(signedAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'))
    .replace(/\n/g,'<br>');
  return '<div class="bg-dark-700/50 rounded-xl p-4 border ' + (signed ? 'border-indigo-500/40' : 'border-dark-500') + '">'
    + '<div class="flex items-start gap-3">'
    + '<input type="checkbox" id="prof-mandate" class="mt-0.5 accent-indigo-500 w-4 h-4 flex-shrink-0 cursor-pointer" '
    + (signed ? 'checked disabled' : '') + ' onchange="if(this.checked)signMandate(this)">'
    + '<div class="flex-1 min-w-0">'
    + '<span class="text-sm ' + (signed ? 'text-indigo-300' : 'text-gray-300') + '"><strong class="' + (signed ? 'text-indigo-200' : 'text-white') + '">' + title + '</strong></span>'
    + (signed
      ? '<span class="block text-xs text-indigo-400 mt-1"><i class="fas fa-check-circle mr-1"></i>Signé électroniquement le ' + new Date(signedAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}) + '</span>'
      : '<span class="block text-xs text-gray-500 mt-1">Cochez pour signer électroniquement</span>')
    + '<button type="button" onclick="toggleMandateText()" class="mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 flex items-center gap-1">'
    + '<i id="mandate-chevron" class="fas fa-chevron-right text-[10px] transition-transform"></i>'
    + '<span id="mandate-toggle-label">Voir le texte complet</span></button>'
    + '<div id="mandate-full-text" class="hidden mt-3 p-3 bg-dark-800 border border-dark-600 rounded-lg text-xs text-gray-300 leading-relaxed max-h-64 overflow-y-auto">' + bodyHtml + '</div>'
    + '</div></div></div>';
}

// ── Helper : boutons carte (Virtuelle dropdown + Physique) ────────────
function _buildCardButtonsBlock(cardData) {
  var phys        = (cardData && cardData.physical_card) || {};
  var physEnabled = phys.enabled !== false;
  var physPrice   = phys.price   || 19.90;
  var physCurr    = phys.currency|| 'USD';
  var physOrder   = phys.current_order || null;

  var virtualBtn = '<div class="relative" id="virtual-card-menu-wrap">'
    + '<button onclick="_showVirtualCardMenu()" class="flex items-center gap-2 bg-rouge-500 text-dark-900 font-bold px-5 py-2.5 rounded-xl hover:bg-rouge-500 transition text-sm">'
    + '<i class="fas fa-id-card"></i> Carte virtuelle <i class="fas fa-chevron-down text-xs ml-1"></i></button>'
    + '<div id="virtual-card-dropdown" class="hidden absolute left-0 top-full mt-1 z-50 bg-dark-800 border border-dark-600 rounded-xl shadow-xl min-w-[160px] overflow-hidden">'
    + '<button onclick="downloadCardPNG();_hideVirtualCardMenu()" class="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-300 hover:bg-dark-700 hover:text-white transition"><i class="fas fa-image text-rouge-400"></i> Télécharger PNG</button>'
    + '<button onclick="downloadCardPDF();_hideVirtualCardMenu()" class="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-300 hover:bg-dark-700 hover:text-white transition"><i class="fas fa-file-pdf text-red-400"></i> Télécharger PDF</button>'
    + '</div></div>';

  var physicalBtn = '';
  if (physEnabled) {
    if (physOrder && ['pending','paid','processing','shipped'].includes(physOrder.status)) {
      var sl = {pending:'En attente de paiement',paid:'Payée — en traitement',processing:'En fabrication',shipped:'Expédiée'};
      physicalBtn = '<div class="flex items-center gap-2 border border-amber-500/40 text-amber-400 px-5 py-2.5 rounded-xl text-sm">'
        + '<i class="fas fa-credit-card"></i><div><span class="font-bold block text-xs">Carte physique</span>'
        + '<span class="text-xs text-amber-300/70">' + (sl[physOrder.status]||physOrder.status) + '</span></div></div>';
    } else {
      physicalBtn = '<button onclick="wizardPhysicalCard()" class="flex items-center gap-2 border border-amber-500/50 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 font-bold px-5 py-2.5 rounded-xl transition text-sm">'
        + '<i class="fas fa-credit-card"></i> Carte physique</button>';
    }
  }

  var revokeBtn = '<button onclick="revokeCard()" id="btn-revoke" class="flex items-center gap-2 border border-red-500/40 text-red-400 px-5 py-2.5 rounded-xl hover:bg-red-900/20 transition text-sm ml-auto">'
    + '<i class="fas fa-ban"></i> Révoquer</button>';

  return '<div class="flex flex-wrap gap-3 items-center">' + virtualBtn + physicalBtn + revokeBtn + '</div>';
}

function _showVirtualCardMenu() {
  var dd = document.getElementById('virtual-card-dropdown');
  if (!dd) return;
  dd.classList.toggle('hidden');
  setTimeout(function() {
    function outside(ev) {
      var wrap = document.getElementById('virtual-card-menu-wrap');
      if (wrap && !wrap.contains(ev.target)) { _hideVirtualCardMenu(); document.removeEventListener('click', outside); }
    }
    document.addEventListener('click', outside);
  }, 10);
}
function _hideVirtualCardMenu() {
  var dd = document.getElementById('virtual-card-dropdown');
  if (dd) dd.classList.add('hidden');
}
function toggleMandateText() {
  var box   = document.getElementById('mandate-full-text');
  var chev  = document.getElementById('mandate-chevron');
  var label = document.getElementById('mandate-toggle-label');
  if (!box) return;
  var nowHidden = box.classList.toggle('hidden');
  if (!nowHidden) { chev.style.transform='rotate(90deg)'; label.textContent='Masquer le texte'; }
  else            { chev.style.transform='';              label.textContent='Voir le texte complet'; }
}
async function signMandate(checkbox) {
  checkbox.disabled = true; checkbox.checked = false;
  try {
    var res = await api('POST', '/members/mandate/sign');
    if (res.success) {
      checkbox.checked = true; checkbox.disabled = true;
      showToast('Mandat signé électroniquement ✓', 'success');
      showPage('member-card');
    } else { checkbox.disabled = false; }
  } catch(e) {
    showToast(e.error || 'Erreur lors de la signature', 'error');
    checkbox.checked = false; checkbox.disabled = false;
  }
}
// ── Wizard Carte Physique ────────────────────────────────────────────
async function wizardPhysicalCard() {
  _wizardReset();
  _wizardData.isPhysicalCard = true;
  _wizardShow('<div class="p-10 flex flex-col items-center gap-4"><div class="loader"></div><p class="text-gray-400 text-sm">Chargement…</p></div>');
  var overlay = document.getElementById('wizard-overlay');
  if (overlay) overlay.style.display = 'flex';
  try {
    var results = await Promise.all([
      api('GET', '/members/card').catch(function() { return null; }),
      (!_gw || !Object.keys(_gw).length) ? api('GET', '/members/packages').catch(function() { return null; }) : Promise.resolve(null)
    ]);
    var cardData = results[0];
    var pkgData  = results[1];
    var phys = (cardData && cardData.physical_card) || {};
    _wizardData.physCardPrice    = parseFloat(phys.price    || '19.90');
    _wizardData.physCardCurrency = phys.currency || 'USD';
    _wizardData.physCardDesc     = phys.desc     || 'Carte de membre physique LEADER';
    _wizardData.totalAmt         = _wizardData.physCardPrice;
    if (pkgData) {
      _gw = _buildGw(pkgData.gateways || {});
      _adminFeeInfo = pkgData.adminFee || { amount: 0, active: false, paid: true };
    }
  } catch(e) {
    _wizardData.physCardPrice    = 19.90;
    _wizardData.physCardCurrency = 'USD';
    _wizardData.physCardDesc     = 'Carte de membre physique LEADER';
    _wizardData.totalAmt         = 19.90;
  }
  _wizardPhysCardStep1();
}

function _wizardPhysCardStep1() {
  var price = _wizardData.physCardPrice || 19.90;
  var curr  = _wizardData.physCardCurrency || 'USD';
  _wizardShow(
    '<div class="px-6 pt-5 pb-3 border-b border-dark-600">'
    + '<div class="flex items-center justify-between mb-2">'
    + '<span class="text-xs font-semibold text-amber-400 uppercase tracking-wider"><i class="fas fa-credit-card mr-1.5"></i>Carte physique — Livraison</span>'
    + '<button onclick="wizardClose()" class="text-gray-400 hover:text-white w-7 h-7 flex items-center justify-center rounded-lg hover:bg-dark-700 text-lg">×</button>'
    + '</div>'
    + '<div class="w-full bg-dark-700 rounded-full h-1.5"><div class="bg-amber-500 h-1.5 rounded-full" style="width:33%"></div></div>'
    + '</div>'
    + '<div class="p-6 space-y-4">'
    + '<div><h3 class="text-lg font-bold text-white">Informations de livraison</h3>'
    + '<p class="text-sm text-gray-400 mt-1">Votre carte sera expédiée à cette adresse sous 7–14 jours ouvrés.</p></div>'
    + '<div class="grid grid-cols-1 gap-3">'
    + '<div><label class="text-xs text-gray-400 block mb-1">Nom complet <span class="text-red-400">*</span></label>'
    + '<input id="phys-full-name" class="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400" placeholder="Prénom Nom"></div>'
    + '<div><label class="text-xs text-gray-400 block mb-1">Adresse <span class="text-red-400">*</span></label>'
    + '<input id="phys-address" class="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400" placeholder="Numéro et nom de rue"></div>'
    + '<div class="grid grid-cols-2 gap-3">'
    + '<div><label class="text-xs text-gray-400 block mb-1">Ville <span class="text-red-400">*</span></label>'
    + '<input id="phys-city" class="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400" placeholder="Paris"></div>'
    + '<div><label class="text-xs text-gray-400 block mb-1">Code postal <span class="text-red-400">*</span></label>'
    + '<input id="phys-postal" class="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400" placeholder="75001"></div>'
    + '</div>'
    + '<div><label class="text-xs text-gray-400 block mb-1">Pays <span class="text-red-400">*</span></label>'
    + '<input id="phys-country" class="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400" placeholder="France"></div>'
    + '<div><label class="text-xs text-gray-400 block mb-1">Téléphone <span class="text-red-400">*</span></label>'
    + '<input id="phys-phone" class="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400" placeholder="+33612345678"></div>'
    + '</div>'
    + '<div id="phys-addr-error" class="hidden bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm"></div>'
    + '<div class="flex items-center justify-between bg-dark-700/50 rounded-xl px-4 py-3 border border-dark-600">'
    + '<div class="flex items-center gap-2 text-gray-400 text-sm"><i class="fas fa-credit-card text-amber-400"></i> Carte physique LEADER</div>'
    + '<span class="text-amber-400 font-bold">' + curr + ' ' + price.toFixed(2) + '</span>'
    + '</div>'
    + '<div class="flex gap-3">'
    + '<button onclick="wizardClose()" class="flex-1 py-3 bg-dark-700 text-gray-300 rounded-xl hover:bg-dark-600 transition text-sm">Annuler</button>'
    + '<button onclick="_wizardPhysCardValidate()" class="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-dark-900 font-bold rounded-xl transition text-sm">Continuer <i class="fas fa-arrow-right ml-2"></i></button>'
    + '</div>'
    + '</div>'
  );
}

function _wizardPhysCardValidate() {
  var fn = (document.getElementById('phys-full-name')  || {value:''}).value.trim();
  var ad = (document.getElementById('phys-address')    || {value:''}).value.trim();
  var ci = (document.getElementById('phys-city')       || {value:''}).value.trim();
  var po = (document.getElementById('phys-postal')     || {value:''}).value.trim();
  var co = (document.getElementById('phys-country')    || {value:''}).value.trim();
  var ph = (document.getElementById('phys-phone')      || {value:''}).value.trim();
  var errDiv = document.getElementById('phys-addr-error');
  if (!fn || !ad || !ci || !po || !co || !ph) {
    if (errDiv) { errDiv.textContent = 'Veuillez remplir tous les champs obligatoires.'; errDiv.classList.remove('hidden'); }
    return;
  }
  _wizardData.shippingAddress = { full_name: fn, address: ad, city: ci, postal_code: po, country: co, phone: ph };
  wizardStep4();
}

// ── Page principale : Carte de Membre ────────────────────────────────
async function renderMemberCard(e) {
  e.innerHTML = '<div class="flex items-center justify-center py-16"><div class="loader"></div></div>';
  try {
    const [cardData, completeness] = await Promise.all([
      api('GET', '/members/card'),
      api('GET', '/members/profile/completeness'),
    ]);
    const { card, config } = cardData;
    const m = currentMember;
    const LANGS = [
      { code:'fr', label:'🇫🇷 Français' },
      { code:'en', label:'🇬🇧 English' },
      { code:'es', label:'🇪🇸 Español' },
      { code:'de', label:'🇩🇪 Deutsch' },
      { code:'pt', label:'🇵🇹 Português' },
      { code:'ar', label:'🇸🇦 العربية' },
    ];
    const langOptions = LANGS.map(l =>
      '<option value="' + l.code + '" ' + ((m && m.preferred_lang || 'fr') === l.code ? 'selected' : '') + '>' + l.label + '</option>'
    ).join('');
    const missingItems = completeness.missing || [];
    const profileComplete = completeness.complete;
    const licenseActive   = completeness.license_active;
    const missingLabels = { city: 'Ville de résidence', profile_photo: 'Photo de profil', vdi_consent: 'Mandat Finestrategia (non signé)' };
    const missingHtml = missingItems.length > 0
      ? '<div class="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4 mb-4"><p class="text-orange-300 font-medium text-sm mb-2"><i class="fas fa-exclamation-triangle mr-1"></i>Profil incomplet :</p><ul class="list-disc list-inside text-orange-400 text-xs space-y-1">' + missingItems.map(k => '<li>' + (missingLabels[k] || k) + '</li>').join('') + '</ul></div>'
      : '';
    const photoSrc = (m && m.profile_photo) ? m.profile_photo : '';

    const enrichedSection = '<div class="bg-dark-800 rounded-2xl border border-dark-600 p-6 space-y-4">'
      + '<h3 class="font-semibold text-white flex items-center gap-2 pb-2 border-b border-dark-600"><i class="fas fa-user-circle text-rouge-400 text-sm"></i> Profil enrichi<span class="text-xs text-gray-500 font-normal ml-2">Requis pour la carte</span></h3>'
      + missingHtml
      + '<div><label class="form-label">Photo de profil <span class="text-red-400">*</span></label>'
      + '<div class="flex items-center gap-4">'
      + '<div class="relative w-20 h-20 rounded-full overflow-hidden bg-dark-700 border-2 border-dark-500 flex-shrink-0">'
      + (photoSrc ? '<img id="prof-photo-preview" src="' + photoSrc + '" class="w-full h-full object-cover">' : '<img id="prof-photo-preview" src="" class="w-full h-full object-cover hidden"><div id="prof-photo-placeholder" class="w-full h-full flex items-center justify-center"><i class="fas fa-user text-gray-500 text-2xl"></i></div>')
      + '</div>'
      + '<div><input type="file" id="prof-photo-input" accept="image/*" class="hidden" onchange="handleProfilePhotoUpload(this)">'
      + '<button onclick="document.getElementById(\'prof-photo-input\').click()" class="text-sm bg-dark-700 border border-dark-500 text-gray-300 px-4 py-2 rounded-xl hover:bg-dark-600 transition"><i class="fas fa-upload mr-1"></i>Choisir une photo</button>'
      + '<p class="text-xs text-gray-500 mt-1">Toute image · max 50 Mo (compressée automatiquement)</p><p id="prof-photo-status" class="text-xs text-rouge-400 mt-1 hidden"></p></div></div></div>'
      + '<div><label class="form-label">Ville de résidence <span class="text-red-400">*</span></label>'
      + '<input id="p-city" class="form-input" value="' + (m && m.city ? m.city : '') + '" placeholder="Paris, London, Dakar\u2026"></div>'
      + '<div><label class="form-label">Langue préférée <span class="text-red-400">*</span></label>'
      + '<select id="prof-lang" class="form-input">' + langOptions + '</select></div>'
      + '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">'
      + '<div><label class="form-label"><i class=\"fas fa-brands fa-whatsapp text-green-400 mr-1\"></i>Numéro WhatsApp</label>'
      + '<input id="prof-whatsapp" class="form-input" value="' + (m && m.whatsapp_number ? m.whatsapp_number : '') + '" placeholder="+33612345678 (avec indicatif)"></div>'
      + '<div><label class="form-label"><i class=\"fas fa-comment text-blue-400 mr-1\"></i>ID Messenger Facebook</label>'
      + '<input id="prof-messenger" class="form-input" value="' + (m && m.messenger_id ? m.messenger_id : '') + '" placeholder="votre.nom.facebook"></div>'
      + '</div>'
      + _buildMandateBlock(cardData, m)
      + '<button onclick="saveProfileEnriched()" class="bg-rouge-500 text-dark-900 font-bold px-6 py-2.5 rounded-xl hover:bg-rouge-500 transition flex items-center gap-2"><i class="fas fa-save"></i> Sauvegarder le profil</button>'
      + '</div>';

    let cardSection = '';
    if (!licenseActive) {
      cardSection = '<div class="bg-dark-800 rounded-2xl border border-dark-600 p-6"><div class="flex items-start gap-3 bg-orange-900/20 border border-orange-500/30 rounded-xl p-4"><i class="fas fa-lock text-orange-400 mt-0.5"></i><div><p class="text-orange-300 font-medium">Licence inactive</p><p class="text-orange-400/70 text-sm mt-1">Vous devez avoir une licence active pour obtenir votre carte de membre.</p><button onclick="showPage(\'license\')" class="mt-2 text-xs bg-rouge-500 text-dark-900 font-bold px-3 py-1.5 rounded-lg hover:bg-rouge-500 transition"><i class="fas fa-key mr-1"></i>Activer ma licence</button></div></div></div>';
    } else if (card) {
      const verifyUrl = window.location.origin + '/v/' + card.token;
      cardSection = '<div class="bg-dark-800 rounded-2xl border border-rouge-500/25 p-6 space-y-4">'
        + '<h3 class="font-semibold text-white flex items-center gap-2 pb-2 border-b border-dark-600"><i class="fas fa-id-badge text-rouge-400 text-sm"></i> Ma Carte de Membre'
        + '<span class="ml-auto text-xs px-2 py-1 rounded-full font-medium ' + (card.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400') + '">' + (card.status === 'active' ? 'Active' : 'Révoquée') + '</span></h3>'
        + '<div class="flex justify-center"><canvas id="card-canvas" width="600" height="360" style="max-width:100%;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.4);"></canvas></div>'
        + '<div class="bg-dark-700/50 rounded-xl p-3"><p class="text-xs text-gray-400 mb-1">Lien de vérification publique</p>'
        + '<div class="flex gap-2 items-center"><span class="text-xs text-rouge-400 font-mono truncate flex-1">' + verifyUrl + '</span>'
        + '<button onclick="navigator.clipboard.writeText(\'' + verifyUrl + '\').then(()=>showToast(\'Lien copié\',\'success\'))" class="text-xs bg-dark-600 px-3 py-1.5 rounded-lg hover:bg-dark-500 text-gray-300 transition flex-shrink-0"><i class="fas fa-copy"></i></button></div></div>'
        + _buildCardButtonsBlock(cardData)
        + '<div class="pt-2 border-t border-dark-600"><p class="text-xs text-gray-400 mb-2">Changer de design</p><div class="flex gap-2">'
        + (config.design_a_enabled ? '<button onclick="orderCard(\'A\')" class="text-sm px-4 py-2 rounded-xl border ' + (card.design === 'A' ? 'border-rouge-500 bg-rouge-500/10 text-rouge-400' : 'border-dark-500 text-gray-300 hover:border-rouge-500/40') + ' transition">Design A — Prestige</button>' : '')
        + (config.design_b_enabled ? '<button onclick="orderCard(\'B\')" class="text-sm px-4 py-2 rounded-xl border ' + (card.design === 'B' ? 'border-blue-400 bg-blue-500/10 text-blue-300' : 'border-dark-500 text-gray-300 hover:border-blue-400/50') + ' transition">Design B — Navy</button>' : '')
        + '</div></div></div>';
    } else {
      cardSection = '<div class="bg-dark-800 rounded-2xl border border-dark-600 p-6 space-y-4">'
        + '<h3 class="font-semibold text-white flex items-center gap-2 pb-2 border-b border-dark-600"><i class="fas fa-id-badge text-rouge-400 text-sm"></i> Demander ma Carte de Membre</h3>'
        + (!profileComplete ? '<div class="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4"><p class="text-orange-300 text-sm"><i class="fas fa-info-circle mr-1"></i>Complétez votre profil ci-dessus avant de demander votre carte.</p></div>' : '')
        + '<p class="text-sm text-gray-400">Votre carte digitale certifie votre statut d\'<strong class="text-white">Ambassadeur</strong> LEADER. Elle contient un QR code permettant de vérifier son authenticité en temps réel.</p>'
        + '<div><p class="form-label mb-2">Choisissez votre design</p><div class="grid grid-cols-2 gap-3">'
        + (config.design_a_enabled ? '<label class="cursor-pointer"><input type="radio" name="card-design" value="A" checked class="hidden peer"><div class="border-2 border-dark-500 peer-checked:border-rouge-500 rounded-xl p-4 text-center transition"><div class="w-full h-12 rounded-lg mb-2" style="background:linear-gradient(135deg,' + config.design_a_color1 + ',' + config.design_a_color2 + ',' + config.design_a_color3 + ')"></div><p class="text-sm font-medium text-white">Design A</p><p class="text-xs text-gray-400">Prestige Orange</p></div></label>' : '')
        + (config.design_b_enabled ? '<label class="cursor-pointer"><input type="radio" name="card-design" value="B" ' + (!config.design_a_enabled ? 'checked' : '') + ' class="hidden peer"><div class="border-2 border-dark-500 peer-checked:border-blue-400 rounded-xl p-4 text-center transition"><div class="w-full h-12 rounded-lg mb-2" style="background:linear-gradient(135deg,#0D1B2A,#1B2A4A,#8B6914)"></div><p class="text-sm font-medium text-white">Design B</p><p class="text-xs text-gray-400">Prestige Navy</p></div></label>' : '')
        + '</div></div>'
        + '<button onclick="orderCard(document.querySelector(\'[name=card-design]:checked\')?.value||\'A\')" id="btn-order-card" '
        + (!profileComplete ? 'disabled title="Complétez votre profil"' : '')
        + ' class="w-full bg-rouge-500 text-dark-900 font-bold py-3 rounded-xl hover:bg-rouge-500 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><i class="fas fa-id-badge"></i>'
        + (config.price > 0 ? 'Obtenir ma carte — ' + config.price + ' ' + config.currency : 'Obtenir ma carte gratuitement')
        + '</button><p class="text-xs text-gray-500 text-center">' + (config.legal_mention || '') + '</p></div>';
    }

    e.innerHTML = '<div class="max-w-2xl space-y-6"><div class="flex items-center justify-between"><h2 class="text-xl font-bold text-white flex items-center gap-2"><i class="fas fa-id-badge text-rouge-400"></i> Carte de Membre</h2></div>'
      + enrichedSection + cardSection + '</div>';

    if (card && card.status === 'active') {
      await _renderCardCanvas('card-canvas', card, config, m);
    }
  } catch(err) {
    e.innerHTML = '<p class="text-red-400 p-4">Erreur : ' + (err.message || 'Impossible de charger les données') + '</p>';
    console.error(err);
  }
}

// ── Commander / changer de design ────────────────────────────────────
async function orderCard(design) {
  if (!design) design = 'A';
  const btn = document.getElementById('btn-order-card');
  if (btn) { btn.disabled = true; btn.innerHTML = 'Génération...'; }
  try {
    await api('POST', '/members/card/order', { design });
    showToast('Carte générée avec succès !', 'success');
    showPage('member-card');
  } catch(e) {
    showToast(e.error || 'Erreur lors de la génération', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-id-badge"></i> Obtenir ma carte'; }
  }
}

// ── Révoquer sa carte ─────────────────────────────────────────────────
async function revokeCard() {
  if (!confirm('Révoquer votre carte ? Elle sera invalide immédiatement.')) return;
  try {
    await api('DELETE', '/members/card');
    showToast('Carte révoquée', 'success');
    showPage('member-card');
  } catch(e) {
    showToast(e.error || 'Erreur', 'error');
  }
}

// ── QR Code via qrcode-generator (CDN) ───────────────────────────────
function _generateQRDataUrl(text, size) {
  size = size || 160;
  return new Promise(function(resolve) {
    function doGen() {
      var qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      var mod = qr.getModuleCount();
      var cell = Math.max(2, Math.floor(size / mod));
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = mod * cell;
      var ctx2 = canvas.getContext('2d');
      ctx2.fillStyle = '#FFFFFF';
      ctx2.fillRect(0, 0, canvas.width, canvas.height);
      ctx2.fillStyle = '#000000';
      for (var r = 0; r < mod; r++) {
        for (var col = 0; col < mod; col++) {
          if (qr.isDark(r, col)) ctx2.fillRect(col * cell, r * cell, cell, cell);
        }
      }
      resolve(canvas.toDataURL('image/png'));
    }
    if (typeof qrcode !== 'undefined') { doGen(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload = function() {
      if (typeof qrcode !== 'undefined') { doGen(); return; }
      resolve('https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&data=' + encodeURIComponent(text));
    };
    s.onerror = function() {
      resolve('https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&data=' + encodeURIComponent(text));
    };
    document.head.appendChild(s);
  });
}

// ── Charger une image ─────────────────────────────────────────────────
function _loadImg(src) {
  return new Promise(function(resolve, reject) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() { resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

// ── Helper : rectangle arrondi ────────────────────────────────────────
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Design A — Gradient orange / rose / violet ────────────────────────
async function _drawCardDesignA(ctx, W, H, member, config, qrImg, logoImg) {
  var c1 = config.design_a_color1 || '#FF6B35';
  var c2 = config.design_a_color2 || '#FF1F8E';
  var c3 = config.design_a_color3 || '#8B00FF';
  var grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, c1); grad.addColorStop(0.5, c2); grad.addColorStop(1, c3);
  ctx.fillStyle = grad; _roundRect(ctx, 0, 0, W, H, 20); ctx.fill();
  var ov = ctx.createLinearGradient(0, 0, 0, H);
  ov.addColorStop(0, 'rgba(255,255,255,0.08)'); ov.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = ov; _roundRect(ctx, 0, 0, W, H, 20); ctx.fill();
  // Pas de motifs ronds — fond gradient pur
  if (logoImg) {
    var lh = 34, lw = lh * (logoImg.width / logoImg.height);
    ctx.drawImage(logoImg, 26, 20, Math.min(lw, 100), lh);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'bold 18px Arial,sans-serif';
    ctx.fillText(config.network_name || 'LEADER', 26, 46);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '600 10px Arial,sans-serif';
  ctx.fillText('CARTE DE MEMBRE', 26, 78);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial,sans-serif';
  ctx.fillText(config.member_title || 'Ambassadeur', 26, 98);
  var fullName = ((member.first_name || '') + ' ' + (member.last_name || '')).trim();
  ctx.font = 'bold 24px Arial,sans-serif'; ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 8;
  ctx.fillText(fullName, 26, 200); ctx.shadowBlur = 0;
  ctx.font = '13px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(member.unique_id || '', 26, 222);
  if (member.city) {
    ctx.font = '12px Arial,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText('📍 ' + member.city, 26, 244);
  }
  if (qrImg) {
    var qs = 108;
    ctx.save(); ctx.fillStyle = '#fff';
    _roundRect(ctx, W - qs - 22, H - qs - 22, qs, qs, 8); ctx.fill();
    ctx.drawImage(qrImg, W - qs - 18, H - qs - 18, qs - 8, qs - 8);
    ctx.restore();
  }
  if (member.profile_photo) {
    try {
      var pImg = await _loadImg(member.profile_photo);
      var ps = 70;
      ctx.save();
      ctx.beginPath(); ctx.arc(26 + ps / 2, H - 22 - ps / 2, ps / 2, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(pImg, 26, H - 22 - ps, ps, ps); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(26 + ps / 2, H - 22 - ps / 2, ps / 2, 0, Math.PI * 2); ctx.stroke();
    } catch(_e) {}
  }
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(0, H - 26, W, 26);
  ctx.font = '9px Arial,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(config.legal_mention ? config.legal_mention.substring(0, 90) : '', 10, H - 9);
}

// ── Design B — Prestige Navy ──────────────────────────────────────────
async function _drawCardDesignB(ctx, W, H, member, config, qrImg, logoImg) {
  var grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#0D1B2A'); grad.addColorStop(0.6, '#1B2A4A'); grad.addColorStop(1, '#0A0F1E');
  ctx.fillStyle = grad; _roundRect(ctx, 0, 0, W, H, 20); ctx.fill();
  var goldGrad = ctx.createLinearGradient(0, 0, W, 0);
  goldGrad.addColorStop(0, '#8B6914'); goldGrad.addColorStop(0.5, '#D4AF37'); goldGrad.addColorStop(1, '#8B6914');
  ctx.fillStyle = goldGrad; ctx.fillRect(0, 0, W, 4); ctx.fillRect(0, H - 4, W, 4);
  // Pas de motifs ronds — fond navy pur
  if (logoImg) {
    var lh = 32, lw = lh * (logoImg.width / logoImg.height);
    ctx.drawImage(logoImg, 26, 18, Math.min(lw, 100), lh);
  } else {
    var gText = ctx.createLinearGradient(26, 0, 140, 0);
    gText.addColorStop(0, '#D4AF37'); gText.addColorStop(1, '#F5E06A');
    ctx.fillStyle = gText; ctx.font = 'bold 20px Arial,sans-serif';
    ctx.fillText(config.network_name || 'LEADER', 26, 44);
  }
  ctx.fillStyle = 'rgba(212,175,55,0.7)'; ctx.font = '600 10px Arial,sans-serif';
  ctx.fillText('CARTE DE MEMBRE', 26, 72);
  ctx.fillStyle = '#D4AF37'; ctx.font = 'bold 12px Arial,sans-serif';
  ctx.fillText((config.member_title || 'Ambassadeur').toUpperCase(), 26, 92);
  var lg = ctx.createLinearGradient(26, 0, W - 26, 0);
  lg.addColorStop(0, '#D4AF37'); lg.addColorStop(1, 'transparent');
  ctx.strokeStyle = lg; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(26, 104); ctx.lineTo(W - 26, 104); ctx.stroke();
  var fullName = ((member.first_name || '') + ' ' + (member.last_name || '')).trim();
  ctx.font = 'bold 22px Arial,sans-serif'; ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 6;
  ctx.fillText(fullName, 26, 194); ctx.shadowBlur = 0;
  ctx.font = '12px monospace'; ctx.fillStyle = '#D4AF37';
  ctx.fillText(member.unique_id || '', 26, 216);
  if (member.city) {
    ctx.font = '11px Arial,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('📍 ' + member.city, 26, 236);
  }
  if (qrImg) {
    var qs = 108;
    ctx.save(); ctx.fillStyle = '#fff';
    _roundRect(ctx, W - qs - 22, H - qs - 22, qs, qs, 8); ctx.fill();
    ctx.drawImage(qrImg, W - qs - 18, H - qs - 18, qs - 8, qs - 8); ctx.restore();
  }
  if (member.profile_photo) {
    try {
      var pImg = await _loadImg(member.profile_photo);
      var ps = 66;
      ctx.save();
      ctx.beginPath(); ctx.arc(26 + ps / 2, H - 22 - ps / 2, ps / 2, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(pImg, 26, H - 22 - ps, ps, ps); ctx.restore();
      ctx.strokeStyle = '#D4AF37'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(26 + ps / 2, H - 22 - ps / 2, ps / 2, 0, Math.PI * 2); ctx.stroke();
    } catch(_e) {}
  }
  ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(0, H - 26, W, 26);
  ctx.font = '9px Arial,sans-serif'; ctx.fillStyle = 'rgba(212,175,55,0.35)';
  ctx.fillText(config.legal_mention ? config.legal_mention.substring(0, 90) : '', 10, H - 9);
}

// ── Orchestrateur canvas ──────────────────────────────────────────────
async function _renderCardCanvas(canvasId, card, config, member) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var W = canvas.width, H = canvas.height;
  var ctx = canvas.getContext('2d');
  var verifyUrl = window.location.origin + '/v/' + card.token;
  var qrImg = null;
  try {
    var qrDataUrl = await _generateQRDataUrl(verifyUrl, 160);
    qrImg = await _loadImg(qrDataUrl);
  } catch(_e) {}
  var logoImg = null;
  if (config.logo_uri) {
    try { logoImg = await _loadImg(config.logo_uri); } catch(_e) {}
  }
  if (card.design === 'B') {
    await _drawCardDesignB(ctx, W, H, member, config, qrImg, logoImg);
  } else {
    await _drawCardDesignA(ctx, W, H, member, config, qrImg, logoImg);
  }
  window._memberCardCanvas = canvas;
  window._memberCardConfig = config;
  window._memberCardData = card;
}

// ── Téléchargement PNG ────────────────────────────────────────────────
function downloadCardPNG() {
  var canvas = window._memberCardCanvas;
  if (!canvas) return;
  var m = currentMember;
  var link = document.createElement('a');
  link.download = 'carte-membre-' + ((m && m.unique_id) || 'LEADER') + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ── Téléchargement PDF ────────────────────────────────────────────────
async function downloadCardPDF() {
  var canvas = window._memberCardCanvas;
  if (!canvas) { showToast('Aperçu non disponible', 'error'); return; }
  var btn = document.getElementById('btn-dl-pdf');
  var orig = btn && btn.innerHTML;
  if (btn) { btn.innerHTML = 'Génération...'; btn.disabled = true; }
  try {
    var pdf = new jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] });
    var imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 54);
    var m = currentMember;
    pdf.save('carte-membre-' + ((m && m.unique_id) || 'LEADER') + '.pdf');
    showToast('PDF téléchargé', 'success');
  } catch(err) {
    showToast('Erreur PDF : ' + (err.message || err), 'error');
  } finally {
    if (btn) { btn.innerHTML = orig; btn.disabled = false; }
  }
}




// ─── Fonctions restaurées depuis commit 72bc54a ───


/* ═══════════════════════════════════════════════════════════════
   PAGE SERVICES — Design premium "Apple App Store meets Stripe"
   Source : /api/landing/services (même API que landing page)
   Paramétrable 100% côté admin → pilote landing + backoffice
   ═══════════════════════════════════════════════════════════════ */
async function renderReserveStrategique(el){el.innerHTML='<div class="flex items-center justify-center py-16"><div class="loader"></div></div>';try{var d=await api('GET','/members/reserve-strategique');var entries=d.entries||[];var active=entries.filter(function(e){return e.status==='locked';});var available=entries.filter(function(e){return e.status==='released'||e.status==='unlocked';});var fmtD=function(v){return v?new Date(v).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}):'—';};var today=new Date();var daysUntil=function(ds){if(!ds)return null;return Math.ceil((new Date(ds).getTime()-today.getTime())/86400000);};var totalActive=d.total_locked||0;var totalAvailable=d.total_released||0;var totalPrelevement=d.total_prelevement||0;var totalAbondement=d.total_abondement||0;var aboRate=Math.round((d.abondement_rate||0)*100);var nextUnlock=d.next_unlock_date;var daysNext=daysUntil(nextUnlock);var withdrawalEnabled=d.withdrawal_enabled!==false;var rsPct=d.rs_pct||10;var firstActive=active.length>0?active[active.length-1]:null;var progressPct=(function(){if(!firstActive)return 0;var start=new Date(firstActive.created_at).getTime();var end=new Date(firstActive.locked_until).getTime();var now=today.getTime();if(end<=start)return 100;return Math.min(100,Math.max(0,Math.round((now-start)/(end-start)*100)));})();var html='<div class="space-y-6">'; html+='<div class="flex items-center gap-3 mb-2"><button onclick="(window._prevPage?showPage(window._prevPage):showPage(\'wallet\'))" class="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-dark-700"><i class="fas fa-arrow-left text-sm"></i></button><div><h1 class="text-xl font-bold text-white flex items-center gap-2"><i class="fas fa-vault text-cyan-400"></i> Réserve Stratégique</h1><p class="text-gray-400 text-xs mt-0.5">Votre épargne constituée avec le soutien de LEADER</p></div></div>';
 html+='<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">'; html+='<div class="stat-card"><div class="flex items-center justify-between mb-2"><span class="text-xs text-gray-400 uppercase tracking-wider">Votre épargne constituée</span><div class="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center"><i class="fas fa-piggy-bank text-cyan-400 text-sm"></i></div></div><div class="text-2xl font-bold text-cyan-400">'+fmt$(totalActive)+'</div><div class="text-xs text-gray-500 mt-1">'+active.length+' dépôt'+(active.length>1?'s en cours':' en cours')+'</div></div>'; html+='<div class="stat-card"><div class="flex items-center justify-between mb-2"><span class="text-xs text-gray-400 uppercase tracking-wider">Soutien LEADER</span><div class="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center"><i class="fas fa-seedling text-emerald-400 text-sm"></i></div></div><div class="text-2xl font-bold text-emerald-400">'+fmt$(totalAbondement)+'</div><div class="text-xs text-gray-500 mt-1">Abondement compagnie (+'+aboRate+'%)</div></div>'; html+='<div class="stat-card"><div class="flex items-center justify-between mb-2"><span class="text-xs text-gray-400 uppercase tracking-wider">Disponibilité prévue</span><div class="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center"><i class="fas fa-calendar-check text-orange-400 text-sm"></i></div></div>'+(nextUnlock?'<div class="text-lg font-bold text-orange-400">'+fmtD(nextUnlock)+'</div><div class="text-xs text-gray-500 mt-1">'+(daysNext!==null?'dans '+daysNext+' jours':'—')+'</div>':' <div class="text-lg font-bold text-gray-500">—</div><div class="text-xs text-gray-500 mt-1">Aucun dépôt actif</div>')+'</div>';
 html+='</div>'; if(totalActive>0){var totalProg=totalPrelevement+totalAbondement;var progPct=totalProg>0?Math.round(totalAbondement/totalProg*100):0;html+='<div class="stat-card border-cyan-500/20 space-y-3"><div class="flex items-center justify-between mb-1"><span class="text-sm font-semibold text-white">Récapitulatif de votre épargne</span></div><div class="grid grid-cols-3 gap-3 text-center"><div class="bg-dark-700/50 rounded-xl p-3"><div class="text-xs text-gray-400 mb-1">Votre contribution</div><div class="text-base font-bold text-cyan-400">'+fmt$(totalPrelevement)+'</div><div class="text-xs text-gray-500">prélevé sur votre prime</div></div><div class="bg-dark-700/50 rounded-xl p-3"><div class="text-xs text-gray-400 mb-1">Soutien de la compagnie</div><div class="text-base font-bold text-emerald-400">+'+fmt$(totalAbondement)+'</div><div class="text-xs text-gray-500">abondement garanti</div></div><div class="bg-dark-700/50 rounded-xl p-3 border border-cyan-500/20"><div class="text-xs text-gray-400 mb-1">Total constitué</div><div class="text-base font-bold text-white">'+fmt$(totalActive)+'</div><div class="text-xs text-gray-500">disponible à l\'échéance</div></div></div><div class="flex justify-between text-xs text-gray-400 mb-1 mt-2"><span>Part abondement dans votre épargne</span><span class="text-emerald-400 font-medium">'+progPct+'%</span></div><div class="h-2 bg-dark-700 rounded-full overflow-hidden"><div class="h-2 rounded-full" style="width:'+progPct+'%;background:linear-gradient(90deg,#10b981,#059669)"></div></div><div class="flex justify-between text-xs text-gray-600 mt-1"><span>Votre mise</span><span>Abondement compagnie</span></div></div>';} if(withdrawalEnabled&&totalAvailable>0){html+='<div class="stat-card border-cyan-500/20"><h3 class="font-semibold text-white mb-2 flex items-center gap-2"><i class="fas fa-arrow-right-from-bracket text-cyan-400"></i> Transférer vers mon portefeuille</h3><p class="text-xs text-gray-400 mb-4">Vos fonds disponibles peuvent être transférés immédiatement dans votre portefeuille.</p><div class="flex flex-col sm:flex-row gap-3"><div class="flex-1"><label class="text-xs text-gray-400 block mb-1">Montant à transférer (max '+fmt$(totalAvailable)+')</label><input id="rs-withdraw-amount" type="number" min="1" max="'+totalAvailable.toFixed(2)+'" step="0.01" placeholder="Ex : 500" class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-white text-sm focus:border-cyan-500/60 focus:outline-none" /></div><button onclick="submitRSWithdrawal('+totalAvailable+')" class="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2 justify-center sm:self-end"><i class="fas fa-wallet"></i> Transférer</button></div><div id="rs-withdraw-msg" class="mt-3 text-sm hidden"></div></div>';}else if(totalAvailable===0&&totalActive>0&&withdrawalEnabled){html+='<div class="bg-dark-700/60 border border-cyan-500/20 rounded-xl p-4 text-sm"><div class="flex items-start gap-3"><i class="fas fa-hourglass-half text-cyan-400 mt-0.5 text-base"></i><div><p class="text-white font-semibold mb-1">Votre épargne est en cours de maturation</p><p class="text-gray-400">Elle sera disponible le <span class="text-cyan-400 font-medium">'+(nextUnlock?fmtD(nextUnlock):'—')+'</span>'+(daysNext!==null?' — dans <span class="text-white font-medium">'+daysNext+' jours</span>':'')+'.</p><p class="text-gray-500 text-xs mt-2">À cette date, vous pourrez transférer librement votre épargne et l\'abondement vers votre portefeuille.</p></div></div></div>';}else if(totalActive>0&&!withdrawalEnabled){html+='<div class="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-4 text-sm text-yellow-400"><i class="fas fa-info-circle mr-2"></i>Les transferts de Réserve Stratégique sont momentanément suspendus.</div>';} if(active.length>0){html+='<div><h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2"><i class="fas fa-piggy-bank text-cyan-400"></i> Dépôts en cours ('+active.length+')</h3><div class="space-y-3">'+active.map(function(e){var days=daysUntil(e.locked_until);var abo=Math.round((e.abondement_rate||0)*100);var partPrel=e.part_prelevement||0;var partAbo=e.part_abondement||0;var total=e.amount||0;var createdTs=new Date(e.created_at).getTime();var lockedTs=new Date(e.locked_until).getTime();var elapsed=Math.max(0,today.getTime()-createdTs);var totalDur=Math.max(1,lockedTs-createdTs);var pct=Math.min(100,Math.round(elapsed/totalDur*100));return'<div class="bg-dark-700/60 border border-dark-600 rounded-xl p-4"><div class="flex items-start justify-between mb-3"><div><div class="text-sm font-semibold text-white">Période '+(e.period||'—')+'</div><div class="text-xs text-gray-400 mt-0.5">Constitué le '+fmtD(e.created_at)+'</div></div><div class="text-right"><div class="text-lg font-bold text-cyan-400">'+fmt$(total)+'</div><div class="text-xs text-gray-500">total constitué</div></div></div><div class="grid grid-cols-3 gap-2 mb-3"><div class="bg-dark-800/60 rounded-lg p-2 text-center"><div class="text-xs text-gray-500 mb-0.5">Votre contribution</div><div class="text-sm font-semibold text-cyan-300">'+fmt$(partPrel)+'</div><div class="text-xs text-gray-600">'+rsPct+'% de votre prime</div></div><div class="bg-dark-800/60 rounded-lg p-2 text-center"><div class="text-xs text-gray-500 mb-0.5">Soutien LEADER</div><div class="text-sm font-semibold text-emerald-400">+'+fmt$(partAbo)+'</div><div class="text-xs text-gray-600">abondement +'+abo+'%</div></div><div class="bg-dark-800/60 rounded-lg p-2 text-center border border-cyan-500/15"><div class="text-xs text-gray-500 mb-0.5">Total à l\'échéance</div><div class="text-sm font-bold text-white">'+fmt$(total)+'</div><div class="text-xs text-gray-600">garanti</div></div></div><div class="flex justify-between text-xs text-gray-400 mb-1"><span>Progression vers la disponibilité</span><span class="text-cyan-400 font-medium">'+pct+'%</span></div><div class="h-1.5 bg-dark-600 rounded-full overflow-hidden"><div class="h-1.5 rounded-full" style="width:'+pct+'%;background:linear-gradient(90deg,#06b6d4,#0e7490)"></div></div><div class="flex justify-between text-xs text-gray-500 mt-1.5"><span>Déposé le '+fmtD(e.created_at)+'</span><span>Disponible le <span class="text-orange-400 font-medium">'+fmtD(e.locked_until)+'</span>'+(days!==null?' ('+days+' j)':'')+'</span></div></div>';}).join('')+'</div></div>';} var hist=entries.filter(function(e){return e.status!=='locked';});
if(hist.length>0){html+='<div><h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2"><i class="fas fa-history text-gray-400"></i> Historique</h3><div class="space-y-1">'+hist.map(function(e){var isAvail=e.status==='released'||e.status==='unlocked';var isWithdrawn=e.status==='withdrawn';var isCan=e.status==='cancelled';var color=isAvail?'text-green-400':isWithdrawn?'text-cyan-400':isCan?'text-gray-500':'text-gray-400';var icon=isAvail?'fa-check-circle':isWithdrawn?'fa-arrow-right-from-bracket':isCan?'fa-ban':'fa-circle';var label=isAvail?'Disponible':isWithdrawn?'Transféré':isCan?'Remplacé':e.status;var partPrel=e.part_prelevement||0;var partAbo=e.part_abondement||0;return'<div class="bg-dark-700/30 rounded-xl p-3 mb-1"><div class="flex items-center justify-between"><div class="flex items-center gap-3"><i class="fas '+icon+' '+color+' text-sm"></i><div><div class="text-sm text-white">Période '+(e.period||'—')+'</div><div class="text-xs text-gray-500">'+fmtD(isAvail?e.unlocked_at:e.created_at)+'</div></div></div><div class="text-right"><div class="text-sm font-semibold '+color+'">'+fmt$(e.amount)+'</div><div class="text-xs text-gray-500">'+label+'</div></div></div>'+(partPrel>0&&!isCan?'<div class="flex gap-4 mt-2 pt-2 border-t border-dark-600 text-xs text-gray-500"><span>Votre part : <span class="text-gray-300">'+fmt$(partPrel)+'</span></span><span>Soutien LEADER : <span class="text-emerald-400">+'+fmt$(partAbo)+'</span></span></div>':'')+'</div>';}).join('')+'</div></div>';} if(entries.length===0){html+='<div class="text-center py-12"><div class="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-4"><i class="fas fa-vault text-cyan-500/50 text-2xl"></i></div><p class="text-gray-400 font-medium">Aucune réserve stratégique pour le moment</p><p class="text-gray-600 text-sm mt-1">Vos primes de leadership alimenteront automatiquement votre réserve dès le rang Mentor.</p></div>';} html+='</div>';
el.innerHTML=html;}catch(err){el.innerHTML='<div class="text-red-400 text-center py-12"><i class="fas fa-exclamation-triangle text-2xl mb-3 block"></i>'+(err.message||err.error||'Erreur inconnue')+'</div>';}}async function submitRSWithdrawal(maxAmount){var inp=document.getElementById('rs-withdraw-amount');var msg=document.getElementById('rs-withdraw-msg');var amount=parseFloat(inp?inp.value:0);if(!inp||!msg)return;if(!amount||amount<=0){msg.textContent='Veuillez saisir un montant valide.';msg.className='mt-3 text-sm text-red-400';msg.classList.remove('hidden');return;}if(amount>maxAmount){msg.textContent='Montant supérieur au solde disponible ('+fmt$(maxAmount)+').';msg.className='mt-3 text-sm text-red-400';msg.classList.remove('hidden');return;}msg.textContent='Transfert en cours...';msg.className='mt-3 text-sm text-gray-400';msg.classList.remove('hidden');try{var r=await api('POST','/members/reserve-strategique/withdraw',{amount:amount});showToast(r.message||'Transfert effectué avec succès !','success');showPage('reserve-strategique');}catch(e){msg.textContent=e.error||e.message||'Erreur lors du transfert.';msg.className='mt-3 text-sm text-red-400';msg.classList.remove('hidden');}}

async function renderServices(el) {
  // Loader immédiat
  el.innerHTML = `
    <div class="flex items-center justify-center py-24">
      <div class="flex flex-col items-center gap-4">
        <div class="loader"></div>
        <p class="text-gray-500 text-sm">Chargement des services…</p>
      </div>
    </div>`;

  let services = [], cfg = {}, activePkg = null;
  try {
    const [svcRes, cfgRes] = await Promise.all([
      api('GET', '/members/services'),   // ← route dynamique avec accès par package
      api('GET', '/landing/config'),
    ]);
    services  = svcRes.services || [];
    activePkg = svcRes.active_package || null;
    cfg       = cfgRes.data || cfgRes.config || {};
  } catch(e) {
    el.innerHTML = `<div class="p-8 text-center text-red-400"><i class="fas fa-exclamation-triangle mr-2"></i>Impossible de charger les services</div>`;
    return;
  }

  // Trier par display_order
  services.sort((a,b) => (a.display_order||0) - (b.display_order||0));

  // Catégories uniques (ordre d'apparition)
  const cats = ['Tous', ...([...new Set(services.map(s => s.category || 'général'))]) ];
  const accessibleCount = services.filter(s => s.is_accessible && s.status === 'active').length;
  const activeCount     = services.filter(s => s.status === 'active').length;

  // Titre/sous-titre configurables
  const pageTitle    = cfg.services_title    || 'Mes Services';
  const pageSubtitle = cfg.services_subtitle || 'Accédez à vos outils et plateformes LEADER.';

  // Injecter les styles de la page (une seule fois)
  if (!document.getElementById('services-page-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'services-page-styles';
    styleEl.textContent = `
      /* ── Hero ── */
      .svc-hero {
        background: linear-gradient(135deg, #02072C 0%, #0A1240 60%, #12185A 100%);
        border-radius: 20px;
        padding: 40px 32px 32px;
        position: relative;
        overflow: hidden;
        margin-bottom: 32px;
      }
      .svc-hero::before {
        content: '';
        position: absolute;
        top: -60px; right: -60px;
        width: 320px; height: 320px;
        background: radial-gradient(circle, rgba(121,30,21,0.18) 0%, transparent 70%);
        pointer-events: none;
      }
      .svc-hero::after {
        content: '';
        position: absolute;
        bottom: -40px; left: 20%;
        width: 280px; height: 200px;
        background: radial-gradient(circle, rgba(10,18,64,0.6) 0%, transparent 70%);
        pointer-events: none;
      }

      /* ── Recherche ── */
      .svc-search {
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 12px;
        padding: 10px 16px;
        color: #fff;
        font-size: 14px;
        width: 100%;
        max-width: 340px;
        outline: none;
        transition: border-color .2s, background .2s;
      }
      .svc-search::placeholder { color: rgba(255,255,255,0.35); }
      .svc-search:focus { border-color: rgba(121,30,21,0.7); background: rgba(255,255,255,0.1); }

      /* ── Pills catégories ── */
      .svc-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; }
      .svc-pill {
        padding: 6px 16px; border-radius: 999px; font-size: 12px; font-weight: 600;
        cursor: pointer; border: 1.5px solid rgba(255,255,255,0.12);
        color: rgba(245,240,232,0.55); background: transparent;
        transition: all .2s; user-select: none;
      }
      .svc-pill:hover { border-color: rgba(121,30,21,0.5); color: #F5F0E8; }
      .svc-pill.active {
        background: linear-gradient(135deg, #791E15, #A02820);
        border-color: transparent; color: #fff;
        box-shadow: 0 4px 12px rgba(121,30,21,0.35);
      }
      .svc-pill-count {
        display: inline-flex; align-items: center; justify-content: center;
        background: rgba(255,255,255,0.15); border-radius: 999px;
        min-width: 18px; height: 18px; padding: 0 5px;
        font-size: 10px; font-weight: 700; margin-left: 4px;
      }
      .svc-pill.active .svc-pill-count { background: rgba(255,255,255,0.25); }

      /* ── Grille ── */
      .svc-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 20px;
      }
      @media (max-width: 480px) {
        .svc-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
      }

      /* ── Card service ── */
      .svc-card {
        background: linear-gradient(145deg, rgba(10,18,64,0.8) 0%, rgba(2,7,44,0.95) 100%);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 20px;
        overflow: hidden;
        cursor: pointer;
        transition: transform .28s cubic-bezier(.22,.68,0,1.2),
                    box-shadow .28s ease,
                    border-color .28s ease;
        text-decoration: none;
        display: flex; flex-direction: column;
        position: relative;
      }
      .svc-card:hover {
        transform: translateY(-8px);
        border-color: rgba(121,30,21,0.55);
        box-shadow: 0 20px 48px rgba(0,0,0,0.55),
                    0 0 0 1px rgba(121,30,21,0.2),
                    0 0 32px rgba(121,30,21,0.12);
      }

      /* ── Card verrouillée ── */
      .svc-card.locked {
        cursor: default;
        opacity: 0.6;
        filter: saturate(0.3);
      }
      .svc-card.locked:hover {
        transform: none; box-shadow: none; border-color: rgba(255,255,255,0.07);
      }
      .svc-lock-badge {
        position: absolute; top: 10px; right: 10px;
        background: rgba(0,0,0,0.7);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 999px;
        padding: 3px 8px;
        display: flex; align-items: center; gap: 4px;
        font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.6);
        backdrop-filter: blur(4px);
        z-index: 2;
      }

      /* ── Zone logo ── */
      .svc-logo-zone {
        height: 140px;
        display: flex; align-items: center; justify-content: center;
        position: relative;
        overflow: hidden;
        background: #02072C !important;
      }
      .svc-logo-zone::before {
        content: '';
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 120px; height: 120px;
        border-radius: 50%;
        background: var(--svc-accent, rgba(121,30,21,0.18));
        filter: blur(32px);
        pointer-events: none;
        z-index: 0;
      }
      .svc-logo-zone::after {
        content: '';
        position: absolute; bottom: 0; left: 8%; right: 8%;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
        pointer-events: none;
      }
      .svc-logo-img {
        max-height: 88px; max-width: 78%;
        object-fit: contain;
        position: relative; z-index: 1;
        transition: transform .28s cubic-bezier(.22,.68,0,1.2), filter .28s ease;
        mix-blend-mode: screen;
        filter: brightness(1.08) contrast(1.05) saturate(1.1);
      }
      .svc-card:not(.locked):hover .svc-logo-img {
        transform: scale(1.1);
        filter: brightness(1.15) contrast(1.08) saturate(1.15);
      }
      .svc-logo-letter {
        width: 76px; height: 76px; border-radius: 20px;
        display: flex; align-items: center; justify-content: center;
        font-size: 30px; font-weight: 900; color: #fff;
        background: linear-gradient(135deg, #791E15, #5A1510);
        box-shadow: 0 8px 28px rgba(121,30,21,0.45);
        position: relative; z-index: 1;
        transition: transform .28s cubic-bezier(.22,.68,0,1.2);
      }
      .svc-card:not(.locked):hover .svc-logo-letter { transform: scale(1.1); }

      /* ── Corps card ── */
      .svc-body {
        padding: 18px 20px 20px;
        flex: 1; display: flex; flex-direction: column; gap: 8px;
      }
      .svc-name {
        font-size: 16px; font-weight: 700; color: #fff;
        line-height: 1.3;
      }
      .svc-cat {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 11px; font-weight: 600; padding: 3px 10px;
        border-radius: 999px; width: fit-content;
      }
      .svc-desc {
        font-size: 13px; color: rgba(245,240,232,0.5);
        line-height: 1.55; flex: 1;
        display: -webkit-box; -webkit-line-clamp: 3;
        -webkit-box-orient: vertical; overflow: hidden;
      }
      .svc-footer {
        margin-top: 12px; padding-top: 12px;
        border-top: 1px solid rgba(255,255,255,0.06);
        display: flex; align-items: center; justify-content: space-between;
      }
      .svc-status-dot {
        width: 7px; height: 7px; border-radius: 50%;
        display: inline-block; margin-right: 5px;
      }
      .svc-arrow {
        width: 28px; height: 28px; border-radius: 50%;
        background: rgba(121,30,21,0.2);
        display: flex; align-items: center; justify-content: center;
        font-size: 11px; color: #791E15;
        transition: background .2s, transform .2s;
      }
      .svc-card:not(.locked):hover .svc-arrow {
        background: #791E15; color: #fff; transform: translateX(3px);
      }

      /* ── Tooltip upgrade ── */
      .svc-upgrade-tooltip {
        position: absolute; bottom: 0; left: 0; right: 0;
        background: linear-gradient(to top, rgba(0,0,0,0.92), transparent);
        padding: 24px 16px 12px;
        text-align: center;
        opacity: 0; transition: opacity .2s;
        pointer-events: none;
      }
      .svc-card.locked:hover .svc-upgrade-tooltip { opacity: 1; }
    `;
    document.head.appendChild(styleEl);
  }

  // ── Rendu HTML ─────────────────────────────────────────────────────────────

  function catColors(cat) {
    const map = {
      formation:   ['rgba(59,130,246,0.15)', '#93c5fd'],
      finance:     ['rgba(16,185,129,0.15)', '#6ee7b7'],
      coaching:    ['rgba(139,92,246,0.15)', '#c4b5fd'],
      business:    ['rgba(245,158,11,0.15)', '#fcd34d'],
      technologie: ['rgba(6,182,212,0.15)',  '#67e8f9'],
      bien_etre:   ['rgba(236,72,153,0.15)', '#f9a8d4'],
      immobilier:  ['rgba(217,119,6,0.15)',  '#fbbf24'],
    };
    const k = (cat||'').toLowerCase().replace(/ /g,'_').replace(/[éè]/g,'e');
    return map[k] || ['rgba(121,30,21,0.15)', '#f87171'];
  }

  function accentFromBg(bgColor) {
    if (!bgColor || bgColor === '#1A1A26') return 'rgba(121,30,21,0.22)';
    if (bgColor.startsWith('#')) {
      const r = parseInt(bgColor.slice(1,3),16);
      const g = parseInt(bgColor.slice(3,5),16);
      const b = parseInt(bgColor.slice(5,7),16);
      return `rgba(${r},${g},${b},0.22)`;
    }
    return bgColor.replace(')', ',0.22)').replace('rgb(', 'rgba(');
  }

  function buildCard(s) {
    const isAccessible = s.is_accessible && s.status === 'active';
    const isComing     = s.status === 'coming_soon';
    const [catBg, catColor] = catColors(s.category);
    const accent = accentFromBg(s.bg_color);
    const logo   = s.logo_data_uri || s.logo_url;
    const href   = (isAccessible && s.url) ? s.url : null;

    // Si accessible et URL : lien cliquable
    const tag   = href ? 'a' : 'div';
    const attrs = href ? `href="${href}" target="_blank" rel="noopener noreferrer"` : '';
    const lockedClass = (!isAccessible && !isComing) ? 'locked' : '';

    return `
    <${tag} class="svc-card ${lockedClass}" ${attrs}
      data-name="${(s.name||'').toLowerCase()}"
      data-cat="${(s.category||'général').toLowerCase()}"
      style="--svc-accent:${accent}">

      ${!isAccessible && !isComing ? `
        <div class="svc-lock-badge">
          <i class="fas fa-lock" style="font-size:8px"></i> Non inclus
        </div>
        <div class="svc-upgrade-tooltip">
          <p style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:600">
            ${activePkg ? `Inclus dans un pack supérieur` : `Achetez un package pour accéder`}
          </p>
        </div>
      ` : ''}

      ${isComing ? `
        <div class="svc-lock-badge" style="color:#f59e0b;border-color:rgba(245,158,11,0.3)">
          <i class="fas fa-clock" style="font-size:8px"></i> Bientôt
        </div>
      ` : ''}

      <!-- Zone logo -->
      <div class="svc-logo-zone">
        ${logo
          ? `<img src="${logo}" alt="${s.name}" class="svc-logo-img">`
          : `<div class="svc-logo-letter">${s.name.charAt(0)}</div>`
        }
      </div>

      <!-- Corps -->
      <div class="svc-body">
        <div class="svc-name">${s.name}</div>
        <div class="svc-cat" style="background:${catBg};color:${catColor}">
          ${s.category || 'Général'}
        </div>
        ${s.description ? `<p class="svc-desc">${s.description}</p>` : ''}

        <div class="svc-footer">
          <span style="font-size:11px;color:rgba(245,240,232,0.35)">
            <span class="svc-status-dot" style="background:${isAccessible ? '#22c55e' : isComing ? '#f59e0b' : '#4b5563'}"></span>
            ${isAccessible ? 'Accessible' : isComing ? 'Bientôt' : 'Non inclus'}
          </span>
          ${isAccessible && href ? `<div class="svc-arrow"><i class="fas fa-arrow-right"></i></div>` : ''}
        </div>
      </div>
    </${tag}>`;
  }

  // Construire la page
  el.innerHTML = `
    <div>
      <!-- Hero -->
      <div class="svc-hero">
        <div style="position:relative;z-index:1">
          <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(121,30,21,0.9);margin-bottom:8px">
            <i class="fas fa-th-large mr-2"></i>Espace Services
          </div>
          <h1 style="font-size:clamp(22px,4vw,32px);font-weight:900;color:#fff;line-height:1.2;margin-bottom:10px">
            ${pageTitle}
          </h1>
          <p style="font-size:14px;color:rgba(245,240,232,0.55);max-width:480px;line-height:1.6">
            ${pageSubtitle}
          </p>
          <div style="display:flex;gap:16px;margin-top:20px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:6px;font-size:12px">
              <span style="width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block"></span>
              <span style="color:rgba(245,240,232,0.6)">${accessibleCount} service${accessibleCount > 1 ? 's' : ''} accessible${accessibleCount > 1 ? 's' : ''}</span>
            </div>
            ${activePkg ? `
            <div style="display:flex;align-items:center;gap:6px;font-size:12px">
              <i class="fas fa-box" style="color:rgba(121,30,21,0.8);font-size:10px"></i>
              <span style="color:rgba(245,240,232,0.6)">Package : <span style="color:#fff;font-weight:700">${activePkg}</span></span>
            </div>` : ''}
          </div>
        </div>

        <!-- Barre recherche -->
        <div style="margin-top:24px;position:relative;z-index:1">
          <input type="search" class="svc-search" placeholder="Rechercher un service…"
                 oninput="svcFilter(this.value, window._svcActiveCat||'Tous')">
        </div>
      </div>

      <!-- Pills catégories -->
      <div class="svc-pills" id="svc-pills">
        ${cats.map(cat => {
          const count = cat === 'Tous'
            ? services.length
            : services.filter(s => (s.category||'général').toLowerCase() === cat.toLowerCase()).length;
          return `<button class="svc-pill ${cat === 'Tous' ? 'active' : ''}"
                    onclick="svcFilter('', '${cat}')"
                    data-cat="${cat}">
            ${cat}
            <span class="svc-pill-count">${count}</span>
          </button>`;
        }).join('')}
      </div>

      <!-- Grille -->
      <div class="svc-grid" id="svc-grid">
        ${services.map(buildCard).join('')}
      </div>
    </div>`;

  // Stocker pour les filtres
  window._svcData      = services;
  window._svcActiveCat = 'Tous';
  window._svcBuildCard = buildCard;
}

// ── Filtre services (catégorie + recherche) ────────────────────────────────
function svcFilter(search, cat) {
  const grid = document.getElementById('svc-grid');
  if (!grid || !window._svcData) return;

  // Mettre à jour la pill active
  if (cat !== undefined) {
    window._svcActiveCat = cat;
    document.querySelectorAll('.svc-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.cat === cat);
    });
  }

  const activeCat = window._svcActiveCat || 'Tous';
  const q = (search !== undefined ? search : (document.querySelector('.svc-search')?.value || '')).toLowerCase().trim();

  const filtered = window._svcData.filter(s => {
    const matchCat = activeCat === 'Tous' || (s.category||'général').toLowerCase() === activeCat.toLowerCase();
    const matchQ   = !q || (s.name||'').toLowerCase().includes(q) || (s.description||'').toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  grid.innerHTML = filtered.length
    ? filtered.map(window._svcBuildCard).join('')
    : `<div style="grid-column:1/-1;text-align:center;padding:48px;color:rgba(245,240,232,0.3)">
         <i class="fas fa-search" style="font-size:32px;margin-bottom:12px;display:block;opacity:.4"></i>
         Aucun service ne correspond à votre recherche
       </div>`;
}

async function renderReservoir(e){loading("page-content");try{const t=await api("GET","/members/holding-tank"),n=!0===t.license_active,a=n&&t.my_unique_id?`${window.location.origin}/register/${t.my_unique_id}`:"",s=t.pending||[],r=t.placed||[];e.innerHTML=`\n
    <div class="space-y-6">\n
      <div class="flex items-center justify-between flex-wrap gap-2">\n
        <h2 class="text-xl font-bold">Réservoir à placement</h2>\n
        <div class="flex items-center gap-2">\n
          <span class="bg-orange-500/20 text-orange-400 text-xs px-3 py-1 rounded-full font-medium">\n
            <i class="fas fa-clock mr-1"></i>${t.pending_count} en attente\n
          </span>\n
          <span class="bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full font-medium">\n
            <i class="fas fa-check mr-1"></i>${t.placed_count} placé(s)\n
          </span>\n
        </div>\n
      </div>\n
\n
      \x3c!-- Explication + lien M3 --\x3e\n
      <div class="bg-dark-800 rounded-2xl border border-rouge-500/25 p-5">\n
        <div class="flex items-start gap-4">\n
          <div class="w-10 h-10 rounded-xl bg-rouge-500/15 flex items-center justify-center flex-shrink-0">\n
            <i class="fas fa-info-circle text-rouge-400 text-lg"></i>\n
          </div>\n
          <div class="flex-1">\n
            <h3 class="font-semibold text-white mb-1">Comment fonctionne le Réservoir ?</h3>\n
            <p class="text-sm text-gray-400 mb-3">\n
              Les membres inscrits via votre <strong class="text-rouge-400">lien de parrainage M3</strong>\n
              arrivent ici en attente. <strong class="text-white">C'est vous</strong> qui choisissez\n
              où les placer dans votre arbre binaire en cliquant sur\n
              <span class="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-xs font-medium">\n
                <i class="fas fa-sitemap mr-1"></i>Placer dans l'arbre\n
              </span>.\n
              Vous pouvez aussi envoyer un <strong class="text-blue-400">lien M2</strong> à un filleul\n
              pour qu'il s'inscrive directement sur un spot libre de votre arbre.\n
            </p>\n
            \x3c!-- Lien de parrainage M3 — Point 4 : visible uniquement si licence active --\x3e\n
            ${n&&a?`\n
            <div class="flex gap-2">\n
              <input id="reservoir-link-input" type="text" value="${a}" readonly\n
                class="flex-1 bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-rouge-400 text-sm font-mono focus:outline-none truncate">\n
              <button onclick="copyReservoirLink()" class="bg-rouge-500 text-dark-900 font-bold px-4 py-2.5 rounded-xl hover:bg-rouge-500 transition flex items-center gap-2 flex-shrink-0">\n
                <i class="fas fa-copy"></i>\n
                <span class="hidden sm:inline text-sm">Copier</span>\n
              </button>\n
            </div>\n
            <p class="text-xs text-gray-500 mt-2">\n
              <i class="fas fa-share-nodes mr-1"></i>\n
              Partagez aussi via :\n
              <a href="https://wa.me/?text=${encodeURIComponent("Rejoignez LEADER avec mon lien : "+a)}"\n
                 target="_blank" class="text-green-400 hover:underline mx-1"><i class="fab fa-whatsapp"></i> WhatsApp</a>\n
              <a href="https://t.me/share/url?url=${encodeURIComponent(a)}&text=${encodeURIComponent("Rejoignez LEADER !")}"\n
                 target="_blank" class="text-blue-400 hover:underline mx-1"><i class="fab fa-telegram"></i> Telegram</a>\n
            </p>`:'\n            <div class="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4 flex items-start gap-3 mt-2">\n              <i class="fas fa-lock text-orange-400 mt-0.5"></i>\n              <div>\n                <p class="text-orange-300 font-medium text-sm">Lien de parrainage indisponible</p>\n                <p class="text-orange-400/70 text-xs mt-1">Activez votre licence Finstrategia pour obtenir votre lien de parrainage et inviter des membres.</p>\n                <button onclick="showPage(\'license\')" class="mt-2 text-xs bg-rouge-500 text-dark-900 font-bold px-3 py-1.5 rounded-lg hover:bg-rouge-500 transition">\n                  <i class="fas fa-key mr-1"></i>Activer ma licence\n                </button>\n              </div>\n            </div>'}\n
          </div>\n
        </div>\n
      </div>\n
\n
      \x3c!-- Filleuls EN ATTENTE de placement --\x3e\n
      <div class="bg-dark-800 rounded-2xl border border-dark-600 overflow-hidden">\n
        <div class="px-5 py-4 border-b border-dark-600 flex items-center justify-between">\n
          <h3 class="font-semibold flex items-center gap-2">\n
            <i class="fas fa-clock text-orange-400"></i>\n
            En attente de placement\n
            ${s.length>0?`<span class="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">${s.length}</span>`:""}\n
          </h3>\n
        </div>\n
\n
        ${0===s.length?'\n        <div class="p-8 text-center">\n          <i class="fas fa-inbox text-gray-600 text-3xl mb-3"></i>\n          <p class="text-gray-400 text-sm">Aucun filleul en attente de placement.</p>\n          <p class="text-gray-500 text-xs mt-1">Partagez votre lien de parrainage pour inviter des membres.</p>\n        </div>':`\n
        <div class="divide-y divide-dark-600">\n
          ${s.map(e=>{const t=null!==e.days_remaining&&void 0!==e.days_remaining?e.days_remaining:null,n=null!==t?t<=3?"text-red-400":t<=7?"text-yellow-400":"text-orange-400":"text-orange-400",a=null!==t&&t<=3;return`\n
          <div class="p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap ${a?"bg-red-900/10":""}">\n
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">\n
              ${(e.first_name||"?")[0]}${(e.last_name||"?")[0]}\n
            </div>\n
            <div class="flex-1 min-w-0">\n
              <div class="font-medium text-sm text-white">${e.first_name} ${e.last_name}</div>\n
              <div class="text-xs text-rouge-400 font-mono">${e.unique_id}</div>\n
              <div class="text-xs text-gray-500 mt-0.5">${e.email}</div>\n
              ${a?'<div class="text-xs text-red-400 mt-1 font-medium"><i class="fas fa-exclamation-triangle mr-1"></i>Urgent ! L\'admin peut bientôt placer à votre place</div>':""}\n
            </div>\n
            <div class="flex items-center gap-3 flex-shrink-0">\n
              <div class="text-right">\n
                ${null!==t?`\n
                  <div class="${n} font-bold text-base">${Math.max(0,t)}j</div>\n
                  <div class="text-[10px] text-gray-500">pour placer</div>\n
                `:'\n                  <div class="text-xs text-orange-400 mb-1"><i class="fas fa-clock mr-1"></i>En attente</div>\n                '}\n
                <div class="text-[10px] text-gray-600">${fmtDate(e.created_at)}</div>\n
              </div>\n
              <button onclick="openPlacementModal('${e.id}','${e.first_name} ${e.last_name}','${e.unique_id}')"\n
                class="bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap">\n
                <i class="fas fa-sitemap"></i>\n
                Placer dans l'arbre\n
              </button>\n
            </div>\n
          </div>`}).join("")}\n
        </div>`}\n
      </div>\n
\n
      \x3c!-- Filleuls DÉJÀ PLACÉS --\x3e\n
      ${r.length>0?`\n
      <div class="bg-dark-800 rounded-2xl border border-dark-600 overflow-hidden">\n
        <div class="px-5 py-4 border-b border-dark-600">\n
          <h3 class="font-semibold flex items-center gap-2">\n
            <i class="fas fa-check-circle text-green-400"></i>\n
            Filleuls placés dans l'arbre\n
            <span class="text-xs text-gray-500">(${r.length} derniers)</span>\n
          </h3>\n
        </div>\n
        <div class="divide-y divide-dark-600">\n
          ${r.map(e=>`\n
          <div class="p-4 flex items-center gap-4">\n
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">\n
              ${(e.first_name||"?")[0]}${(e.last_name||"?")[0]}\n
            </div>\n
            <div class="flex-1 min-w-0">\n
              <div class="font-medium text-sm text-white">${e.first_name} ${e.last_name}</div>\n
              <div class="text-xs text-rouge-400 font-mono">${e.unique_id}</div>\n
              <div class="text-xs text-gray-500">${e.email}</div>\n
            </div>\n
            <div class="text-right flex-shrink-0">\n
              <div class="text-xs text-green-400 mb-1">\n
                <i class="fas fa-check mr-1"></i>Placé\n
                ${e.binary_position?`<span class="ml-1 text-${"L"===e.binary_position?"blue":"green"}-400">(${"L"===e.binary_position?"Gauche":"Droite"})</span>`:""}\n
              </div>\n
              <div class="text-[10px] text-gray-500">${fmtDate(e.created_at)}</div>\n
            </div>\n
          </div>`).join("")}\n
        </div>\n
      </div>`:""}\n
    </div>\n
\n
    \x3c!-- ═══ MODALE PLACEMENT DANS L'ARBRE ═══ --\x3e\n
    <div id="placement-modal" class="fixed inset-0 z-50 hidden items-center justify-center p-4" style="background:rgba(0,0,0,0.85);">\n
      <div class="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">\n
        \x3c!-- En-tête --\x3e\n
        <div class="flex items-center justify-between px-6 py-4 border-b border-dark-600 flex-shrink-0">\n
          <div>\n
            <h3 class="font-bold text-white text-lg flex items-center gap-2">\n
              <i class="fas fa-sitemap text-orange-400"></i>\n
              Placement dans l'arbre\n
            </h3>\n
            <p id="placement-modal-subtitle" class="text-sm text-gray-400 mt-0.5"></p>\n
          </div>\n
          <button onclick="closePlacementModal()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white transition">\n
            <i class="fas fa-times"></i>\n
          </button>\n
        </div>\n
        \x3c!-- Instruction --\x3e\n
        <div class="px-6 py-3 bg-orange-900/20 border-b border-orange-500/20 flex-shrink-0">\n
          <p class="text-orange-300 text-sm flex items-center gap-2">\n
            <i class="fas fa-hand-pointer text-orange-400"></i>\n
            Cliquez sur un <strong>spot libre</strong> (fond pointillé) pour y placer votre filleul.\n
            Les spots occupés ne sont pas cliquables.\n
          </p>\n
        </div>\n
        \x3c!-- Arbre scrollable --\x3e\n
        <div id="placement-tree-container" class="flex-1 overflow-auto p-6 min-h-0">\n
          <div class="flex justify-center py-8"><div class="loader"></div></div>\n
        </div>\n
        \x3c!-- Pied --\x3e\n
        <div class="px-6 py-4 border-t border-dark-600 flex justify-end flex-shrink-0">\n
          <button onclick="closePlacementModal()" class="px-5 py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-xl text-sm transition">\n
            Annuler\n
          </button>\n
        </div>\n
      </div>\n
    </div>`}catch(t){e.innerHTML=`<div class="p-4 text-red-400"><i class="fas fa-exclamation-triangle mr-2"></i>Erreur : ${t.error||t.message||"Impossible de charger le réservoir"}</div>`}}function copyReservoirLink(){const e=document.getElementById("reservoir-link-input");e&&navigator.clipboard.writeText(e.value).then(()=>showToast("Lien de parrainage copié !")).catch(()=>{e.select(),document.execCommand("copy"),showToast("Lien copié !")})}let _placementMemberId=null,_placementMemberName=null,_placementMemberUid=null;function svgCollectPlacement(e,t,n,a,s,r,i,l,d,o,c){if(!e){if(null!==d&&null!==c){const e=d-77,t=o+108+40,n="L"===c?"Gauche":"Droite",s="L"===c?"#3B82F6":"#10B981";a.push(`<path d="${svgBezier(d,o+108,d,t)}" stroke="#374151" stroke-width="1.5" fill="none" stroke-dasharray="5,4"/>`);const x=(i||"").replace(/'/g,""),p=(l||"").replace(/'/g,"");r.push(`\n
        <g class="svg-slot-place" onclick="confirmPlacement('${x}','${p}','${c}')" style="cursor:pointer">\n
          <rect x="${e}" y="${t}" width="154" height="108" rx="12"\n
                fill="#111827" stroke="${s}44" stroke-width="1.5" stroke-dasharray="6,4"\n
                class="svg-slot-rect-place"/>\n
          <text x="${e+77}" y="${t+32}" text-anchor="middle" fill="${s}99" font-size="22" font-family="sans-serif">⊕</text>\n
          <text x="${e+77}" y="${t+54}" text-anchor="middle" fill="${s}dd" font-size="10" font-weight="700" font-family="sans-serif">Spot libre — ${n}</text>\n
          <text x="${e+77}" y="${t+70}" text-anchor="middle" fill="${s}88" font-size="9" font-family="sans-serif">Cliquer pour placer ici</text>\n
          \x3c!-- Zone hover invisible pour agrandir la cible de clic --\x3e\n
          <rect x="${e}" y="${t}" width="154" height="108" rx="12" fill="transparent" class="svg-slot-hover-zone"/>\n
        </g>`)}return}const x=e._x+77,p=e._y;if(null!==d&&a.push(`<path d="${svgBezier(d,o+108,x,p)}" stroke="#374151" stroke-width="1.5" fill="none"/>`),null!==c){const e="L"===c?"#60A5FA":"#34D399";s.push(`<text x="${x}" y="${p-14}" text-anchor="middle" fill="${e}" font-size="9" font-weight="700" font-family="sans-serif">${"L"===c?"G":"D"}</text>`)}const m=e.in_holding_tank,u={captain:"#791E15",commander:"#A78BFA",admiral:"#60A5FA",vice_admiral:"#34D399",ambassador:"#F97316",diamond:"#38BDF8",triple_diamond:"#E879F9",crown:"#EF4444"},g=m?"#FB923C":u[e.current_rank]||"#374151",f=m?"#431407":"#1F2937",b=`${(e.first_name||"?")[0]}${(e.last_name||"?")[0]}`.toUpperCase(),v={captain:"Capt.",commander:"Cmdr.",admiral:"Adm.",vice_admiral:"V-Adm.",ambassador:"Ambas.",diamond:"Diam.",triple_diamond:"3xDiam.",crown:"Crown",membre:"Mbr."}[e.current_rank]||e.current_rank||"",y=u[e.current_rank]||"#9CA3AF";s.push(`\n
    <g class="svg-node-member">\n
      <rect x="${e._x}" y="${p}" width="154" height="108" rx="12"\n
            fill="${f}" stroke="${g}" stroke-width="${m?2:1.5}"/>\n
      <circle cx="${x}" cy="${p+28}" r="18" fill="#111827" stroke="${g}" stroke-width="1.5"/>\n
      <text x="${x}" y="${p+33}" text-anchor="middle" fill="${y}" font-size="11" font-weight="700" font-family="sans-serif">${b}</text>\n
      <text x="${x}" y="${p+56}" text-anchor="middle" fill="#F9FAFB" font-size="10" font-weight="600" font-family="sans-serif">${(e.first_name+" "+e.last_name).substring(0,18)}</text>\n
      <text x="${x}" y="${p+68}" text-anchor="middle" fill="#9CA3AF" font-size="8.5" font-family="monospace">${e.unique_id}</text>\n
      <rect x="${x-28}" y="${p+73}" width="56" height="13" rx="6" fill="${y}22"/>\n
      <text x="${x}" y="${p+83}" text-anchor="middle" fill="${y}" font-size="8" font-weight="700" font-family="sans-serif">${v}</text>\n
      <text x="${x}" y="${p+93}" text-anchor="middle" fill="#6B7280" font-size="8" font-family="sans-serif">${e.member_status||""}</text>\n
      <text x="${e._x+8}" y="${p+102}" fill="#60A5FA" font-size="8" font-family="sans-serif">G:${fmtBV(e.left_bv_monthly)}</text>\n
      <text x="${e._x+154-8}" y="${p+102}" text-anchor="end" fill="#34D399" font-size="8" font-family="sans-serif">D:${fmtBV(e.right_bv_monthly)}</text>\n
      ${m?`<text x="${x}" y="${p+8}" text-anchor="middle" fill="#FB923C" font-size="7.5" font-weight="700" font-family="sans-serif">HOLDING</text>`:""}\n
    </g>`),t<n&&(svgCollectPlacement(e.left,t+1,n,a,s,r,e.id,e.unique_id,x,p,"L"),svgCollectPlacement(e.right,t+1,n,a,s,r,e.id,e.unique_id,x,p,"R"))}function renderPlacementSVG(e){const t=Math.min(treeMaxDepth(e),5),n=svgAssignPositions(e,0,0),a=188*(t+1)+60,s=[],r=[],i=[];return svgCollectPlacement(e,0,t,s,r,i,null,null,null,null,null),`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(n+36,400)}" height="${a}" style="display:block;overflow:visible">\n
    <style>\n
      .svg-slot-rect-place { transition: stroke 0.18s, fill 0.18s; }\n
      .svg-slot-place:hover .svg-slot-rect-place { stroke: #FB923C !important; fill: #431407 !important; }\n
      .svg-slot-place:hover text { fill: #FB923C !important; }\n
    </style>\n
    <g transform="translate(18, 24)">\n
      ${s.join("\n")}\n
      ${i.join("\n")}\n
      ${r.join("\n")}\n
    </g>\n
  </svg>`}window._svgNodeMap={};let _placeTree=null,_placeRoot=null,_placeFocus=null,_placeNavStack=[];function placeNavigateTo(e){const t=findNodeById(_placeTree,e);t&&(_placeNavStack.push(_placeFocus),_placeFocus=t,renderPlacementClassicInner())}function placeGoBack(){0!==_placeNavStack.length&&(_placeFocus=_placeNavStack.pop(),renderPlacementClassicInner())}function placeGoHome(){_placeNavStack=[],_placeFocus=_placeRoot,renderPlacementClassicInner()}function renderPlacementNode(e,t,n=!1){if(!e)return"";const a=e.in_holding_tank?'<div class="text-[9px] text-orange-400 mt-0.5"><i class="fas fa-clock mr-0.5"></i>Holding</div>':"",s="tree-node-card\n    "+(n?"ring-2 ring-gold-500/40 bg-dark-700 scale-105 shadow-lg shadow-black/40 cursor-default":"cursor-pointer hover:border-rouge-500/60 hover:bg-dark-700 transition-all"),r=`\n
    <div class="w-9 h-9 rounded-full bg-dark-900 flex items-center justify-center mx-auto mb-2 text-xs font-bold ${{captain:"text-yellow-400",commander:"text-purple-400",admiral:"text-blue-400",vice_admiral:"text-green-400",ambassador:"text-orange-400",diamond:"text-sky-400",triple_diamond:"text-fuchsia-400",crown:"text-red-400"}[e.current_rank]||"text-rouge-400"}">\n
      ${(e.first_name||"?")[0]}${(e.last_name||"?")[0]}\n
    </div>\n
    <div class="text-xs font-semibold text-white truncate">${e.first_name} ${e.last_name}</div>\n
    <div class="text-[10px] text-gray-400 font-mono">${e.unique_id}</div>\n
    <div class="mt-1">${rankBadge(e.current_rank)}</div>\n
    ${a}\n
    ${e.member_status?`<div class="text-[9px] text-gray-400 mt-0.5">${e.member_status}</div>`:""}\n
    <div class="mt-1 flex justify-center gap-2 text-[9px]">\n
      <span class="text-blue-400">G:${fmtBV(e.left_bv_monthly)}</span>\n
      <span class="text-green-400">D:${fmtBV(e.right_bv_monthly)}</span>\n
    </div>\n
    ${n?'<div class="text-[9px] text-rouge-500/70 mt-1 font-medium">Vue actuelle</div>':'<div class="text-[9px] text-gray-600 mt-1"><i class="fas fa-hand-pointer mr-0.5"></i>Cliquer pour descendre</div>'}\n
  `,i=n?`<div class="${s}">${r}</div>`:`<div class="${s}" onclick="placeNavigateTo('${e.id}')">${r}</div>`;if(t>=3)return`<div class="tree-node">${i}</div>`;const l=(e,t,n)=>{const a="L"===n?"Gauche":"Droite",s="L"===n?"blue":"green";return`<div class="tree-node">\n
      <button onclick="confirmPlacement('${(e||"").replace(/'/g,"")}','${(t||"").replace(/'/g,"")}','${n}')"\n
        class="tree-node-card empty group cursor-pointer border-dashed border-${s}-500/40\n
               hover:border-orange-400 hover:bg-orange-500/10 transition-all w-full text-left"\n
        title="Placer ${_placementMemberName||"le filleul"} ici (${a})">\n
        <div class="w-8 h-8 rounded-full border-2 border-dashed border-${s}-600\n
                    group-hover:border-orange-400 flex items-center justify-center mx-auto mb-2 transition-colors">\n
          <i class="fas fa-user-plus text-${s}-600 group-hover:text-orange-400 text-xs transition-colors"></i>\n
        </div>\n
        <div class="text-${s}-500 group-hover:text-orange-300 text-[10px] font-medium transition-colors">Spot libre</div>\n
        <div class="text-gray-600 group-hover:text-orange-400/70 text-[9px] mt-0.5 transition-colors">← Placer ici</div>\n
      </button>\n
    </div>`};return`\n
  <div class="tree-node">\n
    ${i}\n
    <div class="tree-connector"></div>\n
    <div class="tree-children">\n
      <div class="flex flex-col items-center">\n
        <div class="text-[10px] text-blue-400 mb-1 font-medium">Gauche</div>\n
        ${e.left?renderPlacementNode(e.left,t+1):l(e.id,e.unique_id,"L")}\n
      </div>\n
      <div class="flex flex-col items-center">\n
        <div class="text-[10px] text-green-400 mb-1 font-medium">Droite</div>\n
        ${e.right?renderPlacementNode(e.right,t+1):l(e.id,e.unique_id,"R")}\n
      </div>\n
    </div>\n
  </div>`}function renderPlacementClassicInner(){const e=document.getElementById("placement-tree-container");if(!e||!_placeFocus)return;const t=_placeFocus.id===_placeRoot.id,n=_placeNavStack.length>0,a=_placeNavStack.map((e,t)=>`\n
    <span class="text-gray-500 text-xs">${0===t?'<i class="fas fa-home text-[10px]"></i>':""} ${e.first_name}</span>\n
    <span class="text-gray-600 text-xs">›</span>`).join("");e.innerHTML=`\n
  \x3c!-- Navigation placement --\x3e\n
  <div class="flex items-center gap-2 mb-3 flex-wrap sticky top-0 z-10 bg-dark-900/95 py-2 backdrop-blur rounded-xl px-2">\n
    <button onclick="placeGoHome()"\n
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition\n
             ${t?"bg-dark-700 text-gray-500 cursor-default":"bg-dark-700 text-gray-300 hover:bg-dark-600 border border-dark-500"}"\n
      ${t?"disabled":""}>\n
      <i class="fas fa-home text-[11px]"></i> Racine\n
    </button>\n
    <button onclick="placeGoBack()"\n
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition\n
             ${n?"bg-dark-700 text-gray-300 hover:bg-dark-600 border border-dark-500":"bg-dark-700 text-gray-500 cursor-default"}"\n
      ${n?"":"disabled"}>\n
      <i class="fas fa-arrow-left text-[11px]"></i> Remonter\n
    </button>\n
    <div class="flex items-center gap-1 text-xs text-gray-500 overflow-x-auto flex-1 min-w-0">\n
      ${a}\n
      <span class="text-rouge-400 font-semibold text-xs">${_placeFocus.first_name} ${_placeFocus.last_name}</span>\n
    </div>\n
    <span class="text-[10px] text-orange-400/70">\n
      <i class="fas fa-user-plus mr-1"></i>Cliquer un slot orange pour placer\n
    </span>\n
  </div>\n
\n
  \x3c!-- Arbre placement --\x3e\n
  <div class="flex justify-center w-full overflow-x-auto pb-4">\n
    <div class="inline-flex flex-col items-center text-center">\n
      ${renderPlacementNode(_placeFocus,0,!0)}\n
    </div>\n
  </div>`}async function openPlacementModal(e,t,n){_placementMemberId=e,_placementMemberName=t,_placementMemberUid=n;const a=document.getElementById("placement-modal"),s=document.getElementById("placement-modal-subtitle"),r=document.getElementById("placement-tree-container");s.textContent=`Choisissez où placer : ${t} (${n})`,r.innerHTML='<div class="flex justify-center py-8"><div class="loader"></div></div>',a.classList.remove("hidden"),a.classList.add("flex");try{if(_fullTree)return _placeTree=_fullTree,_placeRoot=_fullTree,_placeFocus=_fullTree,_placeNavStack=[],void renderPlacementClassicInner();const e=await api("GET","/members/tree?depth=12");if(!e.tree)return void(r.innerHTML='\n        <div class="text-center py-12">\n          <i class="fas fa-tree text-gray-600 text-4xl mb-4"></i>\n          <p class="text-gray-400">Vous n\'êtes pas encore placé dans l\'arbre binaire.</p>\n          <p class="text-gray-500 text-sm mt-2">Vous devez être placé pour pouvoir placer vos filleuls.</p>\n        </div>');_placeTree=e.tree,_placeRoot=e.tree,_placeFocus=e.tree,_placeNavStack=[],renderPlacementClassicInner()}catch(e){r.innerHTML=`<p class="text-red-400 text-center py-8">Erreur : ${e.error||e.message}</p>`}}function closePlacementModal(){const e=document.getElementById("placement-modal");e.classList.add("hidden"),e.classList.remove("flex"),_placementMemberId=null}async function confirmPlacement(e,t,n){if(!_placementMemberId)return;const a="L"===n?"jambe GAUCHE":"jambe DROITE",s=document.getElementById("placement-tree-container"),r=document.createElement("div");r.id="placement-confirm-banner",r.className="sticky top-0 z-10 bg-orange-900/90 border border-orange-400/50 rounded-xl p-4 mb-4 flex items-center justify-between gap-4 backdrop-blur",r.innerHTML=`\n
    <div class="flex items-center gap-3">\n
      <i class="fas fa-question-circle text-orange-400 text-xl flex-shrink-0"></i>\n
      <div>\n
        <div class="font-bold text-orange-200 text-sm">Confirmer le placement ?</div>\n
        <div class="text-orange-300/80 text-xs mt-0.5">\n
          <strong>${_placementMemberName}</strong> (${_placementMemberUid}) →\n
          sous <strong>${t}</strong> — ${a}\n
        </div>\n
        <div class="text-orange-400/60 text-xs mt-0.5">[!] Cette action est irréversible.</div>\n
      </div>\n
    </div>\n
    <div class="flex gap-2 flex-shrink-0">\n
      <button id="btn-cancel-place" class="px-4 py-2 bg-dark-700 text-gray-300 rounded-xl text-sm hover:bg-dark-600 transition">Annuler</button>\n
      <button id="btn-confirm-place" class="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl text-sm hover:bg-orange-400 transition">\n
        <i class="fas fa-check mr-1"></i>Confirmer\n
      </button>\n
    </div>`,s.insertBefore(r,s.firstChild),s.scrollTop=0;const i=s.querySelectorAll("button:not(#btn-confirm-place):not(#btn-cancel-place)");i.forEach(e=>{e.disabled=!0,e.style.opacity="0.3"}),document.getElementById("btn-cancel-place").onclick=()=>{r.remove(),i.forEach(e=>{e.disabled=!1,e.style.opacity="1"})},document.getElementById("btn-confirm-place").onclick=async()=>{const t=document.getElementById("btn-confirm-place");if(!t)return;t.disabled=!0,t.innerHTML='<i class="fas fa-spinner fa-spin mr-1"></i>En cours…';const a=_placementMemberId,s=_placementMemberName;if(!a)return void showToast("Erreur interne : aucun filleul sélectionné","error");let l=null;try{l=await api("POST","/members/holding-tank/place",{member_id:a,parent_id:e,position:n})}catch(e){return r.isConnected&&r.remove(),i.forEach(e=>{e.disabled=!1,e.style.opacity="1"}),void showToast(`Échec du placement : ${e&&(e.error||e.message)||"Erreur serveur lors du placement"}`,"error")}closePlacementModal(),showToast(` ${s} placé(e) avec succès dans l'arbre !`);try{const e=document.getElementById("page-content");e&&await renderReservoir(e)}catch(e){showPage("reservoir")}}}const MKTG_MEMBER_TYPE_META={pdf:{icon:"fa-file-pdf",color:"red",label:"PDF",bg:"bg-red-900/30",text:"text-red-400"},image:{icon:"fa-image",color:"blue",label:"Image",bg:"bg-blue-900/30",text:"text-blue-400"},video:{icon:"fa-play-circle",color:"purple",label:"Vidéo",bg:"bg-purple-900/30",text:"text-purple-400"},link:{icon:"fa-link",color:"green",label:"Lien",bg:"bg-green-900/30",text:"text-green-400"}},MKTG_MEMBER_TAG={gold:"bg-yellow-900/40 text-yellow-300 border-yellow-600/30",blue:"bg-blue-900/40 text-blue-300 border-blue-600/30",green:"bg-green-900/40 text-green-300 border-green-600/30",red:"bg-red-900/40 text-red-300 border-red-600/30",purple:"bg-purple-900/40 text-purple-300 border-purple-600/30",gray:"bg-gray-700/40 text-gray-300 border-gray-600/30"},MKTG_CAT_PAL={gold:{bg:"bg-yellow-900/20",border:"border-yellow-600/30",text:"text-yellow-400",activeBg:"bg-yellow-500",activeText:"text-dark-900",gradient:"from-yellow-900/30 to-dark-800"},blue:{bg:"bg-blue-900/20",border:"border-blue-600/30",text:"text-blue-400",activeBg:"bg-blue-500",activeText:"text-white",gradient:"from-blue-900/30 to-dark-800"},purple:{bg:"bg-purple-900/20",border:"border-purple-600/30",text:"text-purple-400",activeBg:"bg-purple-500",activeText:"text-white",gradient:"from-purple-900/30 to-dark-800"},pink:{bg:"bg-pink-900/20",border:"border-pink-600/30",text:"text-pink-400",activeBg:"bg-pink-500",activeText:"text-white",gradient:"from-pink-900/30 to-dark-800"},red:{bg:"bg-red-900/20",border:"border-red-600/30",text:"text-red-400",activeBg:"bg-red-500",activeText:"text-white",gradient:"from-red-900/30 to-dark-800"},green:{bg:"bg-green-900/20",border:"border-green-600/30",text:"text-green-400",activeBg:"bg-green-500",activeText:"text-white",gradient:"from-green-900/30 to-dark-800"}};function mktgCatPal(e){return MKTG_CAT_PAL[e]||MKTG_CAT_PAL.gold}function mktgMemberCard(e){const t=MKTG_MEMBER_TYPE_META[e.type]||MKTG_MEMBER_TYPE_META.link,n=e.category_color?mktgCatPal(e.category_color):null;return`\n
  <div class="bg-dark-800 rounded-2xl border border-dark-600 hover:border-dark-500 transition-all duration-200 overflow-hidden flex flex-col group hover:shadow-lg hover:shadow-black/30">\n
    \x3c!-- Placeholder / header coloré --\x3e\n
    ${e.thumbnail_url?`\n
    <div class="relative overflow-hidden h-32">\n
      <img src="${e.thumbnail_url}" alt="${e.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">\n
      <div class="absolute inset-0 bg-gradient-to-t from-dark-900/80 to-transparent"></div>\n
      <div class="absolute top-2 right-2">\n
        <span class="text-xs ${t.bg} ${t.text} px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10 font-medium">\n
          <i class="fas ${t.icon} mr-1"></i>${t.label}\n
        </span>\n
      </div>\n
      ${e.featured?'<div class="absolute top-2 left-2"><span class="bg-yellow-500/90 text-dark-900 text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm"><i class="fas fa-star mr-1"></i>Une</span></div>':""}\n
    </div>`:`\n
    <div class="h-24 ${t.bg} flex items-center justify-center relative overflow-hidden">\n
      <div class="absolute inset-0 opacity-30" style="background: radial-gradient(circle at 70% 30%, rgba(255,255,255,0.1), transparent)"></div>\n
      <i class="fas ${t.icon} ${t.text} text-5xl opacity-40"></i>\n
      <div class="absolute top-2 right-2">\n
        <span class="text-xs bg-dark-900/70 ${t.text} px-2 py-0.5 rounded-full backdrop-blur-sm font-medium">${t.label}</span>\n
      </div>\n
      ${e.featured?'<div class="absolute top-2 left-2"><span class="bg-yellow-500/90 text-dark-900 text-xs font-bold px-2 py-0.5 rounded-full"><i class="fas fa-star mr-1"></i>Une</span></div>':""}\n
    </div>`}\n
\n
    \x3c!-- Corps --\x3e\n
    <div class="p-4 flex-1 flex flex-col">\n
      <h3 class="font-semibold text-sm text-white leading-snug mb-1.5">${e.title}</h3>\n
      ${e.description?`<p class="text-xs text-gray-400 mb-2.5 line-clamp-2 leading-relaxed">${e.description}</p>`:""}\n
\n
      <div class="flex items-center gap-1.5 mb-3 flex-wrap">\n
        ${e.category_name&&n?`\n
        <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${n.bg} ${n.text} ${n.border} font-medium">\n
          <i class="fas ${e.category_icon||"fa-tag"} text-[10px]"></i>${e.category_name}\n
        </span>`:""}\n
        ${e.file_size?`<span class="text-xs text-gray-500">${e.file_size}</span>`:""}\n
        ${e.is_downloadable?'<span class="text-xs text-green-500/70"><i class="fas fa-download mr-0.5 text-[10px]"></i>DL</span>':""}\n
        ${e.views_count>0?`<span class="text-xs text-gray-600 ml-auto"><i class="fas fa-eye mr-0.5 text-[10px]"></i>${e.views_count}</span>`:""}\n
      </div>\n
\n
      \x3c!-- Boutons --\x3e\n
      <div class="mt-auto flex gap-2">\n
        ${"pdf"===e.type||e.url.includes(".pdf")?`\n
        <button onclick="openMktgViewer('${e.id}','${encodeURIComponent(e.url)}','${encodeURIComponent(e.title)}')"\n
          class="flex-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-2 rounded-xl hover:bg-blue-600/30 transition flex items-center justify-center gap-1.5 font-medium">\n
          <i class="fas fa-eye"></i> Consulter\n
        </button>`:`\n
        <a href="${e.url}" target="_blank" onclick="trackMktgView('${e.id}')"\n
          class="flex-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-2 rounded-xl hover:bg-blue-600/30 transition flex items-center justify-center gap-1.5 font-medium">\n
          <i class="fas fa-external-link-alt"></i> Ouvrir\n
        </a>`}\n
        ${e.is_downloadable?`\n
        <a href="${e.url}" download target="_blank"\n
          class="text-xs bg-green-600/20 text-green-400 border border-green-600/30 px-3 py-2 rounded-xl hover:bg-green-600/30 transition flex items-center justify-center gap-1.5"\n
          title="Télécharger">\n
          <i class="fas fa-download"></i>\n
        </a>`:""}\n
      </div>\n
    </div>\n
  </div>`}async function renderMarketing(e){const t=currentMember,n=t&&t.license_active?`${window.location.origin}/register/${t.unique_id}`:"";try{const t=await api("GET","/members/marketing"),a=t.assets||[],s=t.categories||[],r=t.featured||[],i=window._memberMktgFilter||"all";let l=a;"__featured__"===i?l=r:"all"!==i&&(l=a.filter(e=>e.category_id===i)),e.innerHTML=`\n
    <div class="space-y-5">\n
\n
      \x3c!-- HEADER --\x3e\n
      <div class="flex items-center gap-3">\n
        <div class="w-10 h-10 rounded-xl bg-rouge-500/15 border border-rouge-500/25 flex items-center justify-center flex-shrink-0">\n
          <i class="fas fa-bullhorn text-rouge-400"></i>\n
        </div>\n
        <div>\n
          <h2 class="text-xl font-bold text-white">Espace Marketing</h2>\n
          <p class="text-xs text-gray-400">Documents, outils et ressources pour développer votre réseau</p>\n
        </div>\n
      </div>\n
\n
      \x3c!-- LIEN DE PARRAINAGE — compact --\x3e\n
      <div class="bg-dark-800 rounded-2xl border border-rouge-500/20 p-4">\n
        <div class="flex items-center gap-3 mb-3">\n
          <i class="fas fa-share-alt text-rouge-400 text-sm"></i>\n
          <span class="font-semibold text-white text-sm">Mon lien de parrainage</span>\n
        </div>\n
        ${n?`\n
        <div class="flex gap-2 mb-3">\n
          <input id="referral-link-input" type="text" value="${n}" readonly\n
            class="flex-1 bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-rouge-400 text-xs font-mono focus:outline-none min-w-0">\n
          <button onclick="copyReferralLink()" class="bg-rouge-500 text-dark-900 font-bold px-3 py-2.5 rounded-xl hover:bg-rouge-500 transition text-sm flex-shrink-0">\n
            <i class="fas fa-copy"></i>\n
          </button>\n
        </div>\n
        <div class="flex flex-wrap gap-2">\n
          <a href="https://wa.me/?text=${encodeURIComponent("Rejoignez LEADER : "+n)}" target="_blank"\n
            class="flex items-center gap-1.5 bg-green-600/20 text-green-400 border border-green-600/30 text-xs px-2.5 py-1.5 rounded-lg hover:bg-green-600/30 transition">\n
            <i class="fab fa-whatsapp"></i><span class="hidden sm:inline">WhatsApp</span>\n
          </a>\n
          <a href="https://t.me/share/url?url=${encodeURIComponent(n)}&text=${encodeURIComponent("Rejoignez LEADER !")}" target="_blank"\n
            class="flex items-center gap-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1.5 rounded-lg hover:bg-blue-500/30 transition">\n
            <i class="fab fa-telegram"></i><span class="hidden sm:inline">Telegram</span>\n
          </a>\n
          <a href="mailto:?subject=${encodeURIComponent("Rejoignez LEADER")}&body=${encodeURIComponent("Lien invitation : "+n)}"\n
            class="flex items-center gap-1.5 bg-gray-500/20 text-gray-400 border border-gray-500/30 text-xs px-2.5 py-1.5 rounded-lg hover:bg-gray-500/30 transition">\n
            <i class="fas fa-envelope"></i><span class="hidden sm:inline">Email</span>\n
          </a>\n
          <button onclick="toggleQR()" class="flex items-center gap-1.5 bg-dark-600 text-gray-400 border border-dark-500 text-xs px-2.5 py-1.5 rounded-lg hover:text-white transition ml-auto">\n
            <i class="fas fa-qrcode"></i><span class="hidden sm:inline">QR</span>\n
          </button>\n
        </div>\n
        <div id="qr-panel" class="hidden mt-3 flex items-center gap-4">\n
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(n)}"\n
            alt="QR Code" class="rounded-xl border border-dark-600 w-20 h-20 flex-shrink-0">\n
          <p class="text-xs text-gray-400">Faites scanner ce QR pour que votre filleul s'inscrive via votre lien.</p>\n
        </div>`:'\n        <div class="bg-orange-900/20 border border-orange-500/30 rounded-xl p-3 flex items-center gap-3">\n          <i class="fas fa-lock text-orange-400 flex-shrink-0"></i>\n          <div class="flex-1 min-w-0">\n            <p class="text-orange-300 font-medium text-sm">Licence requise</p>\n            <p class="text-orange-400/70 text-xs mt-0.5">Activez votre licence pour obtenir votre lien de parrainage.</p>\n          </div>\n          <button onclick="showPage(\'license\')" class="text-xs bg-rouge-500 text-dark-900 font-bold px-3 py-1.5 rounded-lg hover:bg-rouge-500 transition flex-shrink-0">\n            <i class="fas fa-key mr-1"></i>Activer\n          </button>\n        </div>'}\n
      </div>\n
\n
      ${0===a.length?'\n      <div class="bg-dark-800 rounded-2xl border border-dark-600 p-12 text-center">\n        <i class="fas fa-folder-open text-gray-600 text-5xl mb-4"></i>\n        <p class="text-gray-400 font-medium">Aucun document disponible</p>\n        <p class="text-gray-600 text-sm mt-1">Les ressources seront disponibles prochainement.</p>\n      </div>':`\n
\n
      \x3c!-- ══════════ NAVIGATION CATÉGORIES PREMIUM ══════════ --\x3e\n
      ${s.length>0?`\n
      <div class="space-y-2">\n
        \x3c!-- Scrollable tabs --\x3e\n
        <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style="scrollbar-width:none">\n
          \x3c!-- Tab Tous --\x3e\n
          <button onclick="window._memberMktgFilter='all'; showPage('marketing')"\n
            class="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition whitespace-nowrap\n
            ${"all"===i?"bg-rouge-500 text-dark-900 border-rouge-500 shadow-lg shadow-yellow-900/30":"bg-dark-700 text-gray-400 border-dark-600 hover:text-white hover:border-dark-500"}">\n
            <i class="fas fa-th text-xs"></i>\n
            Tout (${a.length})\n
          </button>\n
          \x3c!-- Tab Featured --\x3e\n
          ${r.length>0?`\n
          <button onclick="window._memberMktgFilter='__featured__'; showPage('marketing')"\n
            class="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition whitespace-nowrap\n
            ${"__featured__"===i?"bg-yellow-500 text-dark-900 border-yellow-500 shadow-lg shadow-yellow-900/30":"bg-dark-700 text-yellow-600 border-yellow-900/40 hover:text-yellow-400 hover:border-yellow-600/40"}">\n
            <i class="fas fa-star text-xs"></i>\n
            À la une (${r.length})\n
          </button>`:""}\n
          \x3c!-- Tabs catégories --\x3e\n
          ${s.map(e=>{const t=mktgCatPal(e.color),n=a.filter(t=>t.category_id===e.id).length,s=i===e.id;return`\n
          <button onclick="window._memberMktgFilter='${e.id}'; showPage('marketing')"\n
            class="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition whitespace-nowrap\n
            ${s?`${t.activeBg} ${t.activeText} border-transparent shadow-lg`:`bg-dark-700 ${t.text} ${t.border} hover:opacity-80`}">\n
            <i class="fas ${e.icon||"fa-folder"} text-xs"></i>\n
            ${e.name} <span class="opacity-60 text-xs">(${n})</span>\n
          </button>`}).join("")}\n
        </div>\n
\n
        \x3c!-- Carte catégorie active (description) --\x3e\n
        ${"all"!==i&&"__featured__"!==i?(()=>{const e=s.find(e=>e.id===i);if(!e)return"";const t=mktgCatPal(e.color);return`\n
        <div class="bg-gradient-to-r ${t.gradient} rounded-xl border ${t.border} p-3 flex items-center gap-3">\n
          <div class="w-9 h-9 rounded-xl ${t.bg} border ${t.border} flex items-center justify-center flex-shrink-0">\n
            <i class="fas ${e.icon||"fa-folder"} ${t.text}"></i>\n
          </div>\n
          <div>\n
            <div class="font-semibold ${t.text} text-sm">${e.name}</div>\n
            ${e.description?`<div class="text-xs text-gray-400 mt-0.5">${e.description}</div>`:""}\n
          </div>\n
          <span class="${t.text} text-xs ml-auto opacity-70">${l.length} doc${1!==l.length?"s":""}</span>\n
        </div>`})():"__featured__"===i?'\n        <div class="bg-gradient-to-r from-yellow-900/20 to-dark-800 rounded-xl border border-yellow-600/20 p-3 flex items-center gap-3">\n          <i class="fas fa-star text-yellow-400"></i>\n          <span class="text-sm text-yellow-300 font-medium">Documents mis en avant par l\'équipe LEADER</span>\n        </div>':""}\n
      </div>`:""}\n
\n
      \x3c!-- ══════════ GRILLE ASSETS ══════════ --\x3e\n
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">\n
        ${l.map(e=>mktgMemberCard(e)).join("")||'\n        <div class="col-span-3 py-12 text-center text-gray-500">\n          <i class="fas fa-inbox text-4xl mb-3 text-gray-700"></i>\n          <p>Aucun document dans cette catégorie</p>\n        </div>'}\n
      </div>\n
      `}\n
\n
    </div>`}catch(t){e.innerHTML=`<div class="p-4 text-red-400">Erreur : ${t.error||t.message}</div>`}}function toggleQR(){const e=document.getElementById("qr-panel");e&&(e.classList.toggle("hidden"),e.classList.toggle("flex"))}function trackMktgView(e){api("POST",`/members/marketing/${e}/view`).catch(()=>{})}function openMktgViewer(e,t,n){trackMktgView(e);var a=decodeURIComponent(t);var title=decodeURIComponent(n);var u=a.toLowerCase();var isImg=/\.(jpe?g|png|gif|webp|svg|bmp)(\?|#|$)/.test(u);var isVid=/\.(mp4|webm|mov|avi|m4v)(\?|#|$)/.test(u);var isAud=/\.(mp3|wav|aac|flac|m4a|oga)(\?|#|$)/.test(u);var isDoc=/\.(docx?|pptx?|xlsx?)( \?|#|$)/.test(u);var icon=isImg?'fa-image':isVid?'fa-video':isAud?'fa-music':isDoc?'fa-file-word':'fa-file-pdf';var icol=isImg?'text-blue-400':isVid?'text-purple-400':isAud?'text-yellow-400':isDoc?'text-orange-400':'text-red-400';var body;if(isImg){ body='<div class="flex-1 bg-gray-900 flex items-center justify-center p-4 overflow-auto">' +'<img src="'+a+'" alt="'+title+'" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl">' +'</div>';}else if(isVid){ body='<div class="flex-1 bg-black flex items-center justify-center">' +'<video src="'+a+'" controls class="max-w-full" style="max-height:calc(85vh - 56px)"></video>' +'</div>';}else if(isAud){ body='<div class="flex-1 bg-gray-900 flex flex-col items-center justify-center gap-6 p-8">' +'<div class="w-20 h-20 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">' +'<i class="fas fa-music text-yellow-400 text-3xl"></i></div>' +'<p class="font-semibold text-white text-center">'+title+'</p>' +'<audio src="'+a+'" controls class="w-full max-w-md"></audio>' +'</div>';}else if(isDoc){ body='<div class="flex-1 bg-gray-900 relative">' +'<iframe src="https://docs.google.com/gview?url='+encodeURIComponent(a)+'&embedded=true"' +' class="w-full h-full border-0" allowfullscreen></iframe>' +'</div>';}else{ /* PDF et tout autre type : iframe direct (navigateurs modernes affichent PDF nativement) */ body='<div class="flex-1 bg-gray-900 relative flex flex-col">' +'<iframe src="'+a+'" class="w-full h-full border-0 flex-1" style="min-height:0"></iframe>' +'</div>';}var html='<div class="flex flex-col" style="height:85vh;min-width:min(90vw,900px);">' +'<div class="flex items-center justify-between px-5 py-3 border-b border-dark-600 bg-dark-800 flex-shrink-0">' +'<div class="flex items-center gap-2 min-w-0">' +'<i class="fas '+icon+' '+icol+' flex-shrink-0"></i>' +'<span class="font-semibold text-white text-sm truncate">'+title+'</span>' +'</div>' +'<div class="flex items-center gap-2 flex-shrink-0 ml-3">' +'<a href="'+a+'" target="_blank" class="text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-1.5 rounded-lg hover:bg-blue-600/30 transition flex items-center gap-1.5">' +'<i class="fas fa-external-link-alt"></i> Nouvelle fen&#234;tre' +'</a>' +'<a href="'+a+'" download target="_blank" class="text-xs bg-green-600/20 text-green-400 border border-green-600/30 px-3 py-1.5 rounded-lg hover:bg-green-600/30 transition flex items-center gap-1.5">' +'<i class="fas fa-download"></i> T&#233;l&#233;charger' +'</a>' +'<button onclick="closeModal()" class="text-gray-400 hover:text-white ml-2"><i class="fas fa-times"></i></button>' +'</div>' +'</div>' +body+'</div>';showModal(html,!0);}function copyReferralLink(){const e=document.getElementById("referral-link-input");e&&navigator.clipboard.writeText(e.value).then(()=>{showToast("Lien copié dans le presse-papiers !")}).catch(()=>{e.select(),document.execCommand("copy"),showToast("Lien copié !")})}async function renderCCWallet(e){e.innerHTML='<div class="flex items-center justify-center py-16"><div class="loader"></div></div>';try{window._ccWdFiles=[];const t=await api("GET","/members/cc-wallet"),n=t.balance||{total:0,available:0,held:0},a=t.transactions||[],s=t.credits||[],r=t.withdrawals||[],cfg=t.config||{min_amount:10,max_amount:5000,desc_min_chars:10,processing_time:"48h",max_pending:1},_=window._ccWalletCfg=cfg,i=e=>"$"+(e||0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g," "),l=e=>e?new Date(e).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}):"—",d=e=>({pending:'<span class="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">En attente</span>',approved:'<span class="text-xs bg-green-500/20  text-green-400  px-2 py-0.5 rounded-full">✓ Approuvé</span>',rejected:'<span class="text-xs bg-red-500/20    text-red-400    px-2 py-0.5 rounded-full">✗ Refusé</span>'}[e]||`<span class="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full">${e}</span>`),o=e=>({held:'<span class="text-xs bg-blue-500/20   text-blue-400   px-2 py-0.5 rounded-full">En attente</span>',available:'<span class="text-xs bg-green-500/20  text-green-400  px-2 py-0.5 rounded-full">Disponible</span>',expired:'<span class="text-xs bg-gray-500/20   text-gray-400   px-2 py-0.5 rounded-full">Expiré</span>',used:'<span class="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">✓ Utilisé</span>'}[e]||e),c=r.some(e=>"pending"===e.status);e.innerHTML=`\n
    <div class="space-y-6">\n
\n
      \x3c!-- En-tête --\x3e\n
      <div class="flex items-center justify-between flex-wrap gap-3">\n
        <div>\n
          <button onclick="showPage('wallet')" class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition mb-2"><i class="fas fa-arrow-left text-[10px] mr-1"></i>Retour au wallet</button>\n
          <h2 class="text-xl font-bold text-white flex items-center gap-2">\n
            <i class="fas fa-seedling text-green-400"></i>\n
            Crédit de Croissance\n
          </h2>\n
          <p class="text-xs text-gray-500 mt-0.5">Bonus additionnel 20% sur vos primes — disponible M+1, valable 3 mois</p>\n
        </div>\n
      </div>\n
\n
      \x3c!-- Solde en 3 cartes --\x3e\n
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">\n
        <div class="stat-card border-green-500/30">\n
          <div class="flex items-center gap-2 mb-2">\n
            <div class="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">\n
              <i class="fas fa-circle-check text-green-400 text-sm"></i>\n
            </div>\n
            <span class="text-xs text-gray-400 uppercase tracking-wider">Disponible</span>\n
          </div>\n
          <div class="text-2xl font-bold text-green-400">${i(n.available)}</div>\n
          <div class="text-xs text-gray-500 mt-1">Utilisable pour remboursement</div>\n
        </div>\n
        <div class="stat-card border-blue-500/30">\n
          <div class="flex items-center gap-2 mb-2">\n
            <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">\n
              <i class="fas fa-lock text-blue-400 text-sm"></i>\n
            </div>\n
            <span class="text-xs text-gray-400 uppercase tracking-wider">En attente</span>\n
          </div>\n
          <div class="text-2xl font-bold text-blue-400">${i(n.held)}</div>\n
          <div class="text-xs text-gray-500 mt-1">Libéré le 1er du mois suivant</div>\n
        </div>\n
        <div class="stat-card border-rouge-500/25">\n
          <div class="flex items-center gap-2 mb-2">\n
            <div class="w-8 h-8 rounded-lg bg-rouge-500/15 flex items-center justify-center">\n
              <i class="fas fa-seedling text-rouge-400 text-sm"></i>\n
            </div>\n
            <span class="text-xs text-gray-400 uppercase tracking-wider">Total actif</span>\n
          </div>\n
          <div class="text-2xl font-bold text-rouge-400">${i(n.total)}</div>\n
          <div class="text-xs text-gray-500 mt-1">Held + Available</div>\n
        </div>\n
      </div>\n
\n
      \x3c!-- Formulaire demande de remboursement --\x3e\n
      <div class="stat-card border-green-500/20 space-y-4" id="cc-withdrawal-form-card">\n
        <div class="flex items-center gap-2">\n
          <i class="fas fa-file-invoice-dollar text-green-400"></i>\n
          <h3 class="font-semibold text-white">Demande de remboursement</h3>\n
        </div>\n
        <p class="text-xs text-gray-400">\n
          Le Crédit de Croissance peut être utilisé pour rembourser vos dépenses business (formation, marketing, abonnements...).\n
          Chaque demande est examinée par un administrateur sous ${cfg.processing_time}.\n
        </p>\n
        ${c?'<div class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-xs text-yellow-300">\n               <i class="fas fa-clock mr-2"></i>Une demande est déjà en cours de traitement.\n             </div>':n.available<=0?'<div class="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-300">\n               <i class="fas fa-lock mr-2"></i>Aucun Crédit de Croissance disponible pour le moment.\n             </div>':`<div class="space-y-3">               <div><label class="text-xs text-gray-400 block mb-1">Montant (min ${cfg.min_amount}$ — max ${i(Math.min(n.available,cfg.max_amount))})</label><input id="cc-wd-amount" type="number" min="${cfg.min_amount}" max="${Math.min(n.available,cfg.max_amount).toFixed(2)}" step="0.01" placeholder="Ex : 150" class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-white text-sm focus:border-green-500/60 focus:outline-none" /></div>\               ${(cfg.fields?.description?.visible!==false)?`<div>\n
                 <label class="text-xs text-gray-400 block mb-1">${cfg.fields?.description?.label||'Motif de la demande'}${cfg.fields?.description?.required!==false?'<span class=\\"text-red-400 ml-0.5\\">*</span>':''}</label>\n
                 <textarea id="cc-wd-desc" rows="3" placeholder="Ex : Abonnement outil CRM — janvier 2026"\n
                   class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-white text-sm focus:border-green-500/60 focus:outline-none resize-none"></textarea>\n
                 ${cfg.desc_min_chars>0?`<div class="text-xs text-gray-600 mt-1">${cfg.desc_min_chars} caractères minimum</div>`:''}\n
               </div>`:''}\n
               ${(cfg.fields?.justificatif?.visible!==false)?`<div>\n
                 <label class="text-xs text-gray-400 block mb-1">${cfg.fields?.justificatif?.label||'Justificatif (PDF, JPG, PNG)'}${cfg.fields?.justificatif?.required?'<span class=\\"text-red-400 ml-0.5\\">*</span>':''}</label>\n
                 <div id="cc-wd-files-list" class="space-y-1.5 mb-2"></div><label for="cc-wd-file" class="flex items-center gap-3 cursor-pointer bg-dark-700 border border-dashed border-dark-500 hover:border-green-500/50 rounded-xl px-4 py-3 transition-all group"><div class="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0"><i class="fas fa-paperclip text-green-400 text-sm"></i></div><div class="flex-1 min-w-0"><div class="text-sm text-gray-400 group-hover:text-green-300 transition">Ajouter un justificatif</div><div class="text-xs text-gray-600 mt-0.5">PDF, JPG, PNG — plusieurs fichiers possibles</div></div><i class="fas fa-plus text-gray-600 group-hover:text-green-400 transition"></i></label><input id="cc-wd-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" class="hidden" multiple onchange="_ccAddJustif(this)">\n
               </div>`:''}\n
               ${(cfg.fields?.custom1?.visible===true||cfg.fields?.custom1?.visible==='1')?`<div>\n
                 <label class="text-xs text-gray-400 block mb-1">${cfg.fields.custom1.label||'Information complémentaire 1'}${cfg.fields.custom1.required?'<span class=\\"text-red-400 ml-0.5\\">*</span>':''}</label>\n
                 <input id="cc-wd-custom1" type="text" placeholder="${cfg.fields.custom1.label||''}" class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-white text-sm focus:border-green-500/60 focus:outline-none">\n
               </div>`:''}\n
               ${(cfg.fields?.custom2?.visible===true||cfg.fields?.custom2?.visible==='1')?`<div>\n
                 <label class="text-xs text-gray-400 block mb-1">${cfg.fields.custom2.label||'Information complémentaire 2'}${cfg.fields.custom2.required?'<span class=\\"text-red-400 ml-0.5\\">*</span>':''}</label>\n
                 <input id="cc-wd-custom2" type="text" placeholder="${cfg.fields.custom2.label||''}" class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-white text-sm focus:border-green-500/60 focus:outline-none">\n
               </div>`:''}\n
               ${(cfg.fields?.custom3?.visible===true||cfg.fields?.custom3?.visible==='1')?`<div>\n
                 <label class="text-xs text-gray-400 block mb-1">${cfg.fields.custom3.label||'Information complémentaire 3'}${cfg.fields.custom3.required?'<span class=\\"text-red-400 ml-0.5\\">*</span>':''}</label>\n
                 <input id="cc-wd-custom3" type="text" placeholder="${cfg.fields.custom3.label||''}" class="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-white text-sm focus:border-green-500/60 focus:outline-none">\n
               </div>`:''}\n
               <div id="cc-wd-error" class="hidden text-xs text-red-400"></div>\n
               <button onclick="submitCCWithdrawal()" id="cc-wd-btn"\n
                 class="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2">\n
                 <i class="fas fa-paper-plane"></i> Soumettre la demande\n
               </button>\n
             </div>`}\n
      </div>\n
\n
      \x3c!-- Crédits actifs (entrées CC) avec progression et alertes --\x3e\n
      ${s.length>0?`\n
      <div class="stat-card space-y-3">\n
        <h3 class="font-semibold text-white flex items-center gap-2">\n
          <i class="fas fa-list-check text-green-400 text-sm"></i>\n
          Mes crédits actifs\n
          <span class="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">${s.filter(e=>"available"===e.status).length} disponible(s)</span>\n
        </h3>\n
        <div class="space-y-3">\n
          ${s.map(e=>{const t=e.remaining||e.amount-e.used_amount||0,n=e.amount>0?Math.round((e.amount-t)/e.amount*100):0,a=Date.now(),s=e.expires_at?new Date(e.expires_at).getTime():0,r=s?Math.ceil((s-a)/864e5):999,d="available"===e.status&&r<=7,c="available"===e.status&&r<=30,x=d?"border-red-500/40":c?"border-yellow-500/40":"available"===e.status?"border-green-500/30":"held"===e.status?"border-blue-500/30":"border-dark-600",p=e.available_at?new Date(e.available_at):null,m="held"===e.status,u=m&&p?Math.ceil((p.getTime()-a)/864e5):0;return`\n
            <div class="bg-dark-700 rounded-xl border ${x} p-4">\n
              \x3c!-- En-tête --\x3e\n
              <div class="flex items-start justify-between gap-3 mb-3">\n
                <div class="flex items-center gap-2 flex-wrap">\n
                  ${o(e.status)}\n
                  <span class="text-xs text-gray-400">Période ${e.period}</span>\n
                  ${d?`<span class="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full animate-pulse">Expire dans ${r}j !</span>`:""}\n
                  ${c&&!d?`<span class="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Expire dans ${r}j</span>`:""}\n
                </div>\n
                <div class="text-right flex-shrink-0">\n
                  <div class="text-lg font-bold text-white">${i(t)}</div>\n
                  <div class="text-xs text-gray-500">restant sur ${i(e.amount)}</div>\n
                </div>\n
              </div>\n
\n
              \x3c!-- Barre d'utilisation --\x3e\n
              ${n>0?`\n
              <div class="mb-3">\n
                <div class="flex justify-between text-xs text-gray-500 mb-1">\n
                  <span>Utilisation</span>\n
                  <span>${n}% utilisé</span>\n
                </div>\n
                <div class="h-1.5 rounded-full bg-dark-600 overflow-hidden">\n
                  <div class="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400" style="width:${n}%"></div>\n
                </div>\n
              </div>`:""}\n
\n
              \x3c!-- Dates --\x3e\n
              <div class="grid grid-cols-2 gap-3 text-xs">\n
                <div class="bg-dark-600 rounded-lg p-2">\n
                  <div class="text-gray-500 mb-0.5">\n
                    ${m?"Disponible le":"Disponible depuis"}\n
                  </div>\n
                  <div class="font-semibold ${m?"text-blue-400":"text-green-400"}">\n
                    ${l(e.available_at)}\n
                    ${m&&u>0?`<span class="text-gray-500"> (dans ${u}j)</span>`:""}\n
                  </div>\n
                </div>\n
                <div class="bg-dark-600 rounded-lg p-2">\n
                  <div class="text-gray-500 mb-0.5">Expire le</div>\n
                  <div class="font-semibold ${d?"text-red-400":c?"text-yellow-400":"text-gray-300"}">\n
                    ${l(e.expires_at)}\n
                    ${"available"===e.status&&r>0?`<span class="text-gray-500"> (dans ${r}j)</span>`:""}\n
                  </div>\n
                </div>\n
              </div>\n
\n
              ${d?`\n
              <div class="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-300">\n
                <i class="fas fa-exclamation-triangle mr-1"></i>\n
                Ce crédit expire dans <strong>${r} jour${r>1?"s":""}</strong> — soumettez une demande de remboursement maintenant pour ne pas le perdre !\n
              </div>`:""}\n
            </div>`}).join("")}\n
        </div>\n
      </div>`:'\n      <div class="stat-card text-center py-6">\n        <i class="fas fa-seedling text-gray-600 text-3xl mb-3 block"></i>\n        <p class="text-gray-500 text-sm">Aucun Crédit de Croissance actif pour le moment.</p>\n        <p class="text-xs text-gray-600 mt-1">Le CC est attribué chaque mois selon votre prime de Leadership.</p>\n      </div>'}\n
\n
      \x3c!-- Historique demandes de remboursement --\x3e\n
      ${r.length>0?`\n
      <div class="stat-card space-y-3">\n
        <h3 class="font-semibold text-white flex items-center gap-2">\n
          <i class="fas fa-receipt text-gray-400 text-sm"></i>\n
          Mes demandes de remboursement\n
        </h3>\n
        <div class="overflow-x-auto">\n
          <table class="w-full text-sm">\n
            <thead>\n
              <tr class="text-xs text-gray-500 border-b border-dark-600">\n
                <th class="pb-2 text-left">Date</th>\n
                <th class="pb-2 text-right">Montant</th>\n
                <th class="pb-2 text-left pl-4">Description</th>\n
                <th class="pb-2 text-center">Statut</th>\n
                <th class="pb-2 text-left pl-4">Note admin</th>\n
                <th class="pb-2 text-center">Justificatif</th>\n
              </tr>\n
            </thead>\n
            <tbody class="divide-y divide-dark-700">\n
              ${r.map(e=>`\n
              <tr>\n
                <td class="py-2 text-gray-400 text-xs">${l(e.created_at)}</td>\n
                <td class="py-2 text-right font-semibold text-white">${i(e.amount)}</td>\n
                <td class="py-2 pl-4 text-gray-300 text-xs max-w-xs truncate">${e.description}</td>\n
                <td class="py-2 text-center">${d(e.status)}</td>\n
                <td class="py-2 pl-4 text-xs text-gray-400">${e.admin_note||"—"}</td>\n
                <td class="py-2 text-center">${e.justificatif_url?'<a href="'+e.justificatif_url+'" download="'+(e.justificatif_name||'justif')+'" class="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"><i class="fas fa-'+(e.justificatif_url.startsWith('data:image/')?'fa-image':(e.justificatif_url.startsWith('data:application/pdf')?'fa-file-pdf':'fa-file'))+'"></i><span>Voir</span></a>':'<span class="text-gray-600 text-xs">—</span>'}</td>\n
              </tr>`).join("")}\n
            </tbody>\n
          </table>\n
        </div>\n
      </div>`:""}\n
\n
      \x3c!-- Journal des transactions CC --\x3e\n
      <div class="stat-card space-y-3">\n
        <h3 class="font-semibold text-white flex items-center gap-2">\n
          <i class="fas fa-clock-rotate-left text-gray-400 text-sm"></i>\n
          Journal des opérations\n
        </h3>\n
        ${0===a.length?'<p class="text-gray-500 text-sm text-center py-4">Aucune opération pour le moment</p>':`<div class="overflow-x-auto">\n
               <table class="w-full text-sm">\n
                 <thead>\n
                   <tr class="text-xs text-gray-500 border-b border-dark-600">\n
                     <th class="pb-2 text-left">Date</th>\n
                     <th class="pb-2 text-right">Montant</th>\n
                     <th class="pb-2 text-right">Solde après</th>\n
                     <th class="pb-2 text-left pl-4">Libellé</th>\n
                   </tr>\n
                 </thead>\n
                 <tbody class="divide-y divide-dark-700">\n
                   ${a.map(e=>{const t="credit"===e.type;return`\n
                     <tr>\n
                       <td class="py-2 text-gray-400 text-xs">${l(e.created_at)}</td>\n
                       <td class="py-2 text-right font-semibold ${t?"text-green-400":"text-red-400"}">\n
                         ${t?"+":"-"}${i(e.amount)}\n
                       </td>\n
                       <td class="py-2 text-right text-gray-300">${i(e.balance_after)}</td>\n
                       <td class="py-2 pl-4 text-gray-300 text-xs">${e.label}</td>\n
                     </tr>`}).join("")}\n
                 </tbody>\n
               </table>\n
             </div>`}\n
      </div>\n
\n
    </div>`}catch(t){e.innerHTML=`<div class="p-4 text-red-400 text-sm"><i class="fas fa-triangle-exclamation mr-2"></i>Erreur : ${t?.error||t?.message||"Impossible de charger le wallet CC"}</div>`}}function _ccAddJustif(inp){if(!window._ccWdFiles)window._ccWdFiles=[];var files=Array.from(inp.files||[]);if(!files.length)return;var oversized=files.filter(function(f){return f.size>4*1024*1024;});if(oversized.length){alert("Fichier trop volumineux : "+oversized.map(function(f){return f.name+" ("+((f.size/1024/1024).toFixed(1))+" MB)";}).join(", ")+"\nLimite : 4 MB par fichier.");inp.value="";return;}var list=document.getElementById("cc-wd-files-list");files.forEach(function(f){var i=window._ccWdFiles.push(f)-1;var ext=(f.name.split(".").pop()||".").toLowerCase();var isPdf=f.type.indexOf("pdf")>=0||ext==="pdf";var isImg=f.type.indexOf("image")>=0||["jpg","jpeg","png","gif","webp"].indexOf(ext)>=0;var icon=isPdf?"fa-file-pdf text-red-400":isImg?"fa-image text-blue-400":"fa-file text-gray-400";var sz=f.size>1048576?(f.size/1048576).toFixed(1)+" MB":(f.size/1024).toFixed(0)+" KB";var tl=isPdf?"PDF":isImg?"Image":"Fichier";var card=document.createElement("div");card.className="flex items-center gap-3 bg-green-900/20 border border-green-500/30 rounded-xl px-4 py-2.5";var iconEl=document.createElement("div");iconEl.className="w-9 h-9 rounded-lg bg-green-500/15 border border-green-500/25 flex items-center justify-center flex-shrink-0";iconEl.innerHTML="<i class=\"fas "+icon+" text-base\"></i>";var info=document.createElement("div");info.className="flex-1 min-w-0";info.innerHTML="<div class=\"text-sm text-white font-medium truncate\">"+f.name+"</div><div class=\"text-xs text-gray-500\">"+tl+" · "+sz+"</div>";var btn=document.createElement("button");btn.type="button";btn.className="ml-auto w-7 h-7 rounded-full bg-dark-600 hover:bg-red-900/40 border border-dark-500 flex items-center justify-center flex-shrink-0";btn.innerHTML="<i class=\"fas fa-times text-gray-400 hover:text-red-400 text-xs\"></i>";(function(idx,c){btn.onclick=function(){window._ccWdFiles.splice(idx,1);c.remove();};})(i,card);card.appendChild(iconEl);card.appendChild(info);card.appendChild(btn);if(list)list.appendChild(card);});inp.value="";}async function submitCCWithdrawal(){const elAmt=document.getElementById("cc-wd-amount");const elDesc=document.getElementById("cc-wd-desc");const elErr=document.getElementById("cc-wd-error");const elBtn=document.getElementById("cc-wd-btn");const files=window._ccWdFiles||[];if(!elAmt)return;const cfg=window._ccWalletCfg||{};const fields=cfg.fields||{};const amount=parseFloat(elAmt.value);const description=elDesc?elDesc.value.trim():"";elErr.classList.add("hidden");if(!amount||amount<(cfg.min_amount||10))return elErr.textContent="Montant minimum : "+(cfg.min_amount||10)+"$",void elErr.classList.remove("hidden");if(fields.description?.visible!==false&&fields.description?.required!==false){const minC=cfg.desc_min_chars||10;if(!description||description.length<minC)return elErr.textContent=(fields.description?.label||"Motif de la demande")+" requis ("+minC+" caractères minimum)",void elErr.classList.remove("hidden");}if(fields.justificatif?.visible!==false&&fields.justificatif?.required){if(!files.length)return elErr.textContent=(fields.justificatif?.label||"Justificatif")+" obligatoire",void elErr.classList.remove("hidden");}const elC1=document.getElementById("cc-wd-custom1");if((fields.custom1?.visible===true||fields.custom1?.visible==="1")&&fields.custom1?.required){if(!elC1||!elC1.value.trim())return elErr.textContent=(fields.custom1?.label||"Champ 1")+" obligatoire",void elErr.classList.remove("hidden");}const elC2=document.getElementById("cc-wd-custom2");if((fields.custom2?.visible===true||fields.custom2?.visible==="1")&&fields.custom2?.required){if(!elC2||!elC2.value.trim())return elErr.textContent=(fields.custom2?.label||"Champ 2")+" obligatoire",void elErr.classList.remove("hidden");}const elC3=document.getElementById("cc-wd-custom3");if((fields.custom3?.visible===true||fields.custom3?.visible==="1")&&fields.custom3?.required){if(!elC3||!elC3.value.trim())return elErr.textContent=(fields.custom3?.label||"Champ 3")+" obligatoire",void elErr.classList.remove("hidden");}elBtn.disabled=true;elBtn.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Envoi...';try{const fd=new FormData();fd.append("amount",String(amount));fd.append("description",description);files.forEach(function(f,i){fd.append("justificatif_"+i,f);});if(elC1&&elC1.value.trim())fd.append("custom1",elC1.value.trim());if(elC2&&elC2.value.trim())fd.append("custom2",elC2.value.trim());if(elC3&&elC3.value.trim())fd.append("custom3",elC3.value.trim());const res=await fetch("/api/members/cc-withdrawal",{method:"POST",headers:{Authorization:memberToken?"Bearer "+memberToken:""},body:fd});const data=await res.json();if(!res.ok)throw data;showToast("Demande soumise avec succès — traitement sous "+(cfg.processing_time||"48h")+" ✓","success");showPage("cc-wallet");}catch(e){elErr.textContent=e?.error||"Erreur lors de l'envoi";elErr.classList.remove("hidden");elBtn.disabled=false;elBtn.innerHTML='<i class="fas fa-paper-plane"></i> Soumettre la demande';}}
async function renderNotifications(e,page,perPage){page=page||window._notifPage||1;perPage=perPage||window._notifPerPage||25;window._notifPage=page;window._notifPerPage=perPage;try{const t=await api("GET",`/members/notifications?page=${page}&per_page=${perPage}`);await api("PUT","/members/notifications/read-all"),document.getElementById("notif-badge").classList.add("hidden"),document.getElementById("header-notif-badge").classList.add("hidden"),e.innerHTML=`\n
    <div class="space-y-4">\n
      <h2 class="text-xl font-bold">Notifications</h2>\n
      <div class="space-y-2">\n
        ${(t.notifications||[]).map(e=>`\n
        <div class="bg-dark-800 rounded-xl border border-dark-600 p-4 ${e.is_read?"":"border-rouge-500/25"} fade-in">\n
          <div class="flex items-start gap-3">\n
            <div class="w-8 h-8 rounded-full bg-rouge-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">\n
              <i class="fas fa-bell text-rouge-400 text-xs"></i>\n
            </div>\n
            <div class="flex-1">\n
              <div class="font-medium text-sm ${e.is_read?"text-gray-300":"text-white"}">${e.title}</div>\n
              <div class="text-xs text-gray-400 mt-0.5">${e.message}</div>\n
              <div class="text-xs text-gray-600 mt-1">${fmtDatetime(e.created_at)}</div>\n
            </div>\n
          </div>\n
        </div>`).join("")||'<p class="text-gray-400 text-center py-8">Aucune notification</p>'}\n
      </div>\n
    </div><div id="notif-pagination" class="py-3 border-t border-dark-600"></div>`;renderPagination("notif-pagination",t.total||0,page,perPage,"(function(p){renderNotifications(document.getElementById('page-content'),p,window._notifPerPage)})","(function(pp,p){renderNotifications(document.getElementById('page-content'),p,pp)})");}catch(t){e.innerHTML=`<div class="p-4 text-red-400">Erreur : ${t.error}</div>`}}