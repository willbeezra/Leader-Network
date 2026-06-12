// ============================================================
// LEADER Network — Sélecteur Pays Universel
// 250+ pays + territoires + DOM-TOM avec indicatifs téléphoniques
// Utilisation : CountrySelector.init(config)
// ============================================================
;(function(global) {
'use strict'

// ── Données : 250+ pays triés alphabétiquement en français ──
// Format : { code, name, dial, flag }
// DOM-TOM inclus avec leurs propres indicatifs
const COUNTRIES = [
  {code:'AF',name:'Afghanistan',dial:'+93',flag:'🇦🇫'},
  {code:'ZA',name:'Afrique du Sud',dial:'+27',flag:'🇿🇦'},
  {code:'AL',name:'Albanie',dial:'+355',flag:'🇦🇱'},
  {code:'DZ',name:'Algérie',dial:'+213',flag:'🇩🇿'},
  {code:'DE',name:'Allemagne',dial:'+49',flag:'🇩🇪'},
  {code:'AD',name:'Andorre',dial:'+376',flag:'🇦🇩'},
  {code:'AO',name:'Angola',dial:'+244',flag:'🇦🇴'},
  {code:'AI',name:'Anguilla',dial:'+1264',flag:'🇦🇮'},
  {code:'AG',name:'Antigua-et-Barbuda',dial:'+1268',flag:'🇦🇬'},
  {code:'SA',name:'Arabie Saoudite',dial:'+966',flag:'🇸🇦'},
  {code:'AR',name:'Argentine',dial:'+54',flag:'🇦🇷'},
  {code:'AM',name:'Arménie',dial:'+374',flag:'🇦🇲'},
  {code:'AW',name:'Aruba',dial:'+297',flag:'🇦🇼'},
  {code:'AU',name:'Australie',dial:'+61',flag:'🇦🇺'},
  {code:'AT',name:'Autriche',dial:'+43',flag:'🇦🇹'},
  {code:'AZ',name:'Azerbaïdjan',dial:'+994',flag:'🇦🇿'},
  {code:'BS',name:'Bahamas',dial:'+1242',flag:'🇧🇸'},
  {code:'BH',name:'Bahreïn',dial:'+973',flag:'🇧🇭'},
  {code:'BD',name:'Bangladesh',dial:'+880',flag:'🇧🇩'},
  {code:'BB',name:'Barbade',dial:'+1246',flag:'🇧🇧'},
  {code:'BE',name:'Belgique',dial:'+32',flag:'🇧🇪'},
  {code:'BZ',name:'Belize',dial:'+501',flag:'🇧🇿'},
  {code:'BJ',name:'Bénin',dial:'+229',flag:'🇧🇯'},
  {code:'BM',name:'Bermudes',dial:'+1441',flag:'🇧🇲'},
  {code:'BT',name:'Bhoutan',dial:'+975',flag:'🇧🇹'},
  {code:'BY',name:'Biélorussie',dial:'+375',flag:'🇧🇾'},
  {code:'BO',name:'Bolivie',dial:'+591',flag:'🇧🇴'},
  {code:'BA',name:'Bosnie-Herzégovine',dial:'+387',flag:'🇧🇦'},
  {code:'BW',name:'Botswana',dial:'+267',flag:'🇧🇼'},
  {code:'BR',name:'Brésil',dial:'+55',flag:'🇧🇷'},
  {code:'BN',name:'Brunei',dial:'+673',flag:'🇧🇳'},
  {code:'BG',name:'Bulgarie',dial:'+359',flag:'🇧🇬'},
  {code:'BF',name:'Burkina Faso',dial:'+226',flag:'🇧🇫'},
  {code:'BI',name:'Burundi',dial:'+257',flag:'🇧🇮'},
  {code:'KH',name:'Cambodge',dial:'+855',flag:'🇰🇭'},
  {code:'CM',name:'Cameroun',dial:'+237',flag:'🇨🇲'},
  {code:'CA',name:'Canada',dial:'+1',flag:'🇨🇦'},
  {code:'CV',name:'Cap-Vert',dial:'+238',flag:'🇨🇻'},
  {code:'CF',name:'Centrafrique',dial:'+236',flag:'🇨🇫'},
  {code:'CL',name:'Chili',dial:'+56',flag:'🇨🇱'},
  {code:'CN',name:'Chine',dial:'+86',flag:'🇨🇳'},
  {code:'CY',name:'Chypre',dial:'+357',flag:'🇨🇾'},
  {code:'CO',name:'Colombie',dial:'+57',flag:'🇨🇴'},
  {code:'KM',name:'Comores',dial:'+269',flag:'🇰🇲'},
  {code:'CG',name:'Congo',dial:'+242',flag:'🇨🇬'},
  {code:'CD',name:'Congo (RDC)',dial:'+243',flag:'🇨🇩'},
  {code:'KP',name:'Corée du Nord',dial:'+850',flag:'🇰🇵'},
  {code:'KR',name:'Corée du Sud',dial:'+82',flag:'🇰🇷'},
  {code:'CR',name:'Costa Rica',dial:'+506',flag:'🇨🇷'},
  {code:'CI',name:"Côte d'Ivoire",dial:'+225',flag:'🇨🇮'},
  {code:'HR',name:'Croatie',dial:'+385',flag:'🇭🇷'},
  {code:'CU',name:'Cuba',dial:'+53',flag:'🇨🇺'},
  {code:'CW',name:'Curaçao',dial:'+599',flag:'🇨🇼'},
  {code:'DK',name:'Danemark',dial:'+45',flag:'🇩🇰'},
  {code:'DJ',name:'Djibouti',dial:'+253',flag:'🇩🇯'},
  {code:'DM',name:'Dominique',dial:'+1767',flag:'🇩🇲'},
  {code:'EG',name:'Égypte',dial:'+20',flag:'🇪🇬'},
  {code:'AE',name:'Émirats arabes unis',dial:'+971',flag:'🇦🇪'},
  {code:'EC',name:'Équateur',dial:'+593',flag:'🇪🇨'},
  {code:'ER',name:'Érythrée',dial:'+291',flag:'🇪🇷'},
  {code:'ES',name:'Espagne',dial:'+34',flag:'🇪🇸'},
  {code:'EE',name:'Estonie',dial:'+372',flag:'🇪🇪'},
  {code:'SZ',name:'Eswatini',dial:'+268',flag:'🇸🇿'},
  {code:'US',name:'États-Unis',dial:'+1',flag:'🇺🇸'},
  {code:'ET',name:'Éthiopie',dial:'+251',flag:'🇪🇹'},
  {code:'FJ',name:'Fidji',dial:'+679',flag:'🇫🇯'},
  {code:'FI',name:'Finlande',dial:'+358',flag:'🇫🇮'},
  {code:'FR',name:'France',dial:'+33',flag:'🇫🇷'},
  {code:'GA',name:'Gabon',dial:'+241',flag:'🇬🇦'},
  {code:'GM',name:'Gambie',dial:'+220',flag:'🇬🇲'},
  {code:'GE',name:'Géorgie',dial:'+995',flag:'🇬🇪'},
  {code:'GH',name:'Ghana',dial:'+233',flag:'🇬🇭'},
  {code:'GI',name:'Gibraltar',dial:'+350',flag:'🇬🇮'},
  {code:'GR',name:'Grèce',dial:'+30',flag:'🇬🇷'},
  {code:'GD',name:'Grenade',dial:'+1473',flag:'🇬🇩'},
  {code:'GL',name:'Groenland',dial:'+299',flag:'🇬🇱'},
  {code:'GP',name:'Guadeloupe',dial:'+590',flag:'🇬🇵'},
  {code:'GU',name:'Guam',dial:'+1671',flag:'🇬🇺'},
  {code:'GT',name:'Guatemala',dial:'+502',flag:'🇬🇹'},
  {code:'GN',name:'Guinée',dial:'+224',flag:'🇬🇳'},
  {code:'GQ',name:'Guinée équatoriale',dial:'+240',flag:'🇬🇶'},
  {code:'GW',name:'Guinée-Bissau',dial:'+245',flag:'🇬🇼'},
  {code:'GY',name:'Guyana',dial:'+592',flag:'🇬🇾'},
  {code:'GF',name:'Guyane française',dial:'+594',flag:'🇬🇫'},
  {code:'HT',name:'Haïti',dial:'+509',flag:'🇭🇹'},
  {code:'HN',name:'Honduras',dial:'+504',flag:'🇭🇳'},
  {code:'HK',name:'Hong Kong',dial:'+852',flag:'🇭🇰'},
  {code:'HU',name:'Hongrie',dial:'+36',flag:'🇭🇺'},
  {code:'IN',name:'Inde',dial:'+91',flag:'🇮🇳'},
  {code:'ID',name:'Indonésie',dial:'+62',flag:'🇮🇩'},
  {code:'IQ',name:'Irak',dial:'+964',flag:'🇮🇶'},
  {code:'IR',name:'Iran',dial:'+98',flag:'🇮🇷'},
  {code:'IE',name:'Irlande',dial:'+353',flag:'🇮🇪'},
  {code:'IS',name:'Islande',dial:'+354',flag:'🇮🇸'},
  {code:'IL',name:'Israël',dial:'+972',flag:'🇮🇱'},
  {code:'IT',name:'Italie',dial:'+39',flag:'🇮🇹'},
  {code:'JM',name:'Jamaïque',dial:'+1876',flag:'🇯🇲'},
  {code:'JP',name:'Japon',dial:'+81',flag:'🇯🇵'},
  {code:'JO',name:'Jordanie',dial:'+962',flag:'🇯🇴'},
  {code:'KZ',name:'Kazakhstan',dial:'+7',flag:'🇰🇿'},
  {code:'KE',name:'Kenya',dial:'+254',flag:'🇰🇪'},
  {code:'KG',name:'Kirghizstan',dial:'+996',flag:'🇰🇬'},
  {code:'KI',name:'Kiribati',dial:'+686',flag:'🇰🇮'},
  {code:'XK',name:'Kosovo',dial:'+383',flag:'🇽🇰'},
  {code:'KW',name:'Koweït',dial:'+965',flag:'🇰🇼'},
  {code:'RE',name:'La Réunion',dial:'+262',flag:'🇷🇪'},
  {code:'LA',name:'Laos',dial:'+856',flag:'🇱🇦'},
  {code:'LS',name:'Lesotho',dial:'+266',flag:'🇱🇸'},
  {code:'LV',name:'Lettonie',dial:'+371',flag:'🇱🇻'},
  {code:'LB',name:'Liban',dial:'+961',flag:'🇱🇧'},
  {code:'LR',name:'Libéria',dial:'+231',flag:'🇱🇷'},
  {code:'LY',name:'Libye',dial:'+218',flag:'🇱🇾'},
  {code:'LI',name:'Liechtenstein',dial:'+423',flag:'🇱🇮'},
  {code:'LT',name:'Lituanie',dial:'+370',flag:'🇱🇹'},
  {code:'LU',name:'Luxembourg',dial:'+352',flag:'🇱🇺'},
  {code:'MO',name:'Macao',dial:'+853',flag:'🇲🇴'},
  {code:'MK',name:'Macédoine du Nord',dial:'+389',flag:'🇲🇰'},
  {code:'MG',name:'Madagascar',dial:'+261',flag:'🇲🇬'},
  {code:'MY',name:'Malaisie',dial:'+60',flag:'🇲🇾'},
  {code:'MW',name:'Malawi',dial:'+265',flag:'🇲🇼'},
  {code:'MV',name:'Maldives',dial:'+960',flag:'🇲🇻'},
  {code:'ML',name:'Mali',dial:'+223',flag:'🇲🇱'},
  {code:'MT',name:'Malte',dial:'+356',flag:'🇲🇹'},
  {code:'MA',name:'Maroc',dial:'+212',flag:'🇲🇦'},
  {code:'MH',name:'Marshall (Îles)',dial:'+692',flag:'🇲🇭'},
  {code:'MQ',name:'Martinique',dial:'+596',flag:'🇲🇶'},
  {code:'MU',name:'Maurice',dial:'+230',flag:'🇲🇺'},
  {code:'MR',name:'Mauritanie',dial:'+222',flag:'🇲🇷'},
  {code:'YT',name:'Mayotte',dial:'+262',flag:'🇾🇹'},
  {code:'MX',name:'Mexique',dial:'+52',flag:'🇲🇽'},
  {code:'FM',name:'Micronésie',dial:'+691',flag:'🇫🇲'},
  {code:'MD',name:'Moldavie',dial:'+373',flag:'🇲🇩'},
  {code:'MC',name:'Monaco',dial:'+377',flag:'🇲🇨'},
  {code:'MN',name:'Mongolie',dial:'+976',flag:'🇲🇳'},
  {code:'ME',name:'Monténégro',dial:'+382',flag:'🇲🇪'},
  {code:'MS',name:'Montserrat',dial:'+1664',flag:'🇲🇸'},
  {code:'MZ',name:'Mozambique',dial:'+258',flag:'🇲🇿'},
  {code:'MM',name:'Myanmar (Birmanie)',dial:'+95',flag:'🇲🇲'},
  {code:'NA',name:'Namibie',dial:'+264',flag:'🇳🇦'},
  {code:'NR',name:'Nauru',dial:'+674',flag:'🇳🇷'},
  {code:'NP',name:'Népal',dial:'+977',flag:'🇳🇵'},
  {code:'NI',name:'Nicaragua',dial:'+505',flag:'🇳🇮'},
  {code:'NE',name:'Niger',dial:'+227',flag:'🇳🇪'},
  {code:'NG',name:'Nigeria',dial:'+234',flag:'🇳🇬'},
  {code:'NU',name:'Niue',dial:'+683',flag:'🇳🇺'},
  {code:'NO',name:'Norvège',dial:'+47',flag:'🇳🇴'},
  {code:'NC',name:'Nouvelle-Calédonie',dial:'+687',flag:'🇳🇨'},
  {code:'NZ',name:'Nouvelle-Zélande',dial:'+64',flag:'🇳🇿'},
  {code:'OM',name:'Oman',dial:'+968',flag:'🇴🇲'},
  {code:'UG',name:'Ouganda',dial:'+256',flag:'🇺🇬'},
  {code:'UZ',name:'Ouzbékistan',dial:'+998',flag:'🇺🇿'},
  {code:'PK',name:'Pakistan',dial:'+92',flag:'🇵🇰'},
  {code:'PW',name:'Palaos',dial:'+680',flag:'🇵🇼'},
  {code:'PS',name:'Palestine',dial:'+970',flag:'🇵🇸'},
  {code:'PA',name:'Panama',dial:'+507',flag:'🇵🇦'},
  {code:'PG',name:'Papouasie-Nouvelle-Guinée',dial:'+675',flag:'🇵🇬'},
  {code:'PY',name:'Paraguay',dial:'+595',flag:'🇵🇾'},
  {code:'NL',name:'Pays-Bas',dial:'+31',flag:'🇳🇱'},
  {code:'PE',name:'Pérou',dial:'+51',flag:'🇵🇪'},
  {code:'PH',name:'Philippines',dial:'+63',flag:'🇵🇭'},
  {code:'PL',name:'Pologne',dial:'+48',flag:'🇵🇱'},
  {code:'PF',name:'Polynésie française',dial:'+689',flag:'🇵🇫'},
  {code:'PR',name:'Porto Rico',dial:'+1787',flag:'🇵🇷'},
  {code:'PT',name:'Portugal',dial:'+351',flag:'🇵🇹'},
  {code:'QA',name:'Qatar',dial:'+974',flag:'🇶🇦'},
  {code:'DO',name:'République dominicaine',dial:'+1809',flag:'🇩🇴'},
  {code:'CZ',name:'République tchèque',dial:'+420',flag:'🇨🇿'},
  {code:'RO',name:'Roumanie',dial:'+40',flag:'🇷🇴'},
  {code:'GB',name:'Royaume-Uni',dial:'+44',flag:'🇬🇧'},
  {code:'RU',name:'Russie',dial:'+7',flag:'🇷🇺'},
  {code:'RW',name:'Rwanda',dial:'+250',flag:'🇷🇼'},
  {code:'KN',name:'Saint-Christophe-et-Niévès',dial:'+1869',flag:'🇰🇳'},
  {code:'SM',name:'Saint-Marin',dial:'+378',flag:'🇸🇲'},
  {code:'PM',name:'Saint-Pierre-et-Miquelon',dial:'+508',flag:'🇵🇲'},
  {code:'VC',name:'Saint-Vincent-et-les-Grenadines',dial:'+1784',flag:'🇻🇨'},
  {code:'BL',name:'Saint-Barthélemy',dial:'+590',flag:'🇧🇱'},
  {code:'MF',name:'Saint-Martin (fr)',dial:'+590',flag:'🇲🇫'},
  {code:'SX',name:'Sint Maarten (nl)',dial:'+1721',flag:'🇸🇽'},
  {code:'SB',name:'Salomon (Îles)',dial:'+677',flag:'🇸🇧'},
  {code:'WS',name:'Samoa',dial:'+685',flag:'🇼🇸'},
  {code:'AS',name:'Samoa américaines',dial:'+1684',flag:'🇦🇸'},
  {code:'ST',name:'Sao Tomé-et-Príncipe',dial:'+239',flag:'🇸🇹'},
  {code:'SN',name:'Sénégal',dial:'+221',flag:'🇸🇳'},
  {code:'RS',name:'Serbie',dial:'+381',flag:'🇷🇸'},
  {code:'SC',name:'Seychelles',dial:'+248',flag:'🇸🇨'},
  {code:'SL',name:'Sierra Leone',dial:'+232',flag:'🇸🇱'},
  {code:'SG',name:'Singapour',dial:'+65',flag:'🇸🇬'},
  {code:'SK',name:'Slovaquie',dial:'+421',flag:'🇸🇰'},
  {code:'SI',name:'Slovénie',dial:'+386',flag:'🇸🇮'},
  {code:'SO',name:'Somalie',dial:'+252',flag:'🇸🇴'},
  {code:'SD',name:'Soudan',dial:'+249',flag:'🇸🇩'},
  {code:'SS',name:'Soudan du Sud',dial:'+211',flag:'🇸🇸'},
  {code:'LK',name:'Sri Lanka',dial:'+94',flag:'🇱🇰'},
  {code:'SE',name:'Suède',dial:'+46',flag:'🇸🇪'},
  {code:'CH',name:'Suisse',dial:'+41',flag:'🇨🇭'},
  {code:'SR',name:'Suriname',dial:'+597',flag:'🇸🇷'},
  {code:'SY',name:'Syrie',dial:'+963',flag:'🇸🇾'},
  {code:'TJ',name:'Tadjikistan',dial:'+992',flag:'🇹🇯'},
  {code:'TW',name:'Taïwan',dial:'+886',flag:'🇹🇼'},
  {code:'TZ',name:'Tanzanie',dial:'+255',flag:'🇹🇿'},
  {code:'TD',name:'Tchad',dial:'+235',flag:'🇹🇩'},
  {code:'TH',name:'Thaïlande',dial:'+66',flag:'🇹🇭'},
  {code:'TL',name:'Timor oriental',dial:'+670',flag:'🇹🇱'},
  {code:'TG',name:'Togo',dial:'+228',flag:'🇹🇬'},
  {code:'TO',name:'Tonga',dial:'+676',flag:'🇹🇴'},
  {code:'TT',name:'Trinité-et-Tobago',dial:'+1868',flag:'🇹🇹'},
  {code:'TN',name:'Tunisie',dial:'+216',flag:'🇹🇳'},
  {code:'TM',name:'Turkménistan',dial:'+993',flag:'🇹🇲'},
  {code:'TR',name:'Turquie',dial:'+90',flag:'🇹🇷'},
  {code:'TV',name:'Tuvalu',dial:'+688',flag:'🇹🇻'},
  {code:'UA',name:'Ukraine',dial:'+380',flag:'🇺🇦'},
  {code:'UY',name:'Uruguay',dial:'+598',flag:'🇺🇾'},
  {code:'VU',name:'Vanuatu',dial:'+678',flag:'🇻🇺'},
  {code:'VA',name:'Vatican',dial:'+379',flag:'🇻🇦'},
  {code:'VE',name:'Venezuela',dial:'+58',flag:'🇻🇪'},
  {code:'VN',name:'Viêt Nam',dial:'+84',flag:'🇻🇳'},
  {code:'WF',name:'Wallis-et-Futuna',dial:'+681',flag:'🇼🇫'},
  {code:'YE',name:'Yémen',dial:'+967',flag:'🇾🇪'},
  {code:'ZM',name:'Zambie',dial:'+260',flag:'🇿🇲'},
  {code:'ZW',name:'Zimbabwe',dial:'+263',flag:'🇿🇼'},
]

// Pays suggérés en premier (DOM-TOM + pays fréquents)
const PRIORITY_CODES = ['FR','GP','MQ','GF','RE','YT','PM','BL','MF','NC','PF','WF','BE','CH','LU','CA','SN','CI','CM','MA','DZ','TN','MU','MG','ML','BF','NE','BJ','TG','GN','GH','NG']

function buildSortedList() {
  var priority = [], rest = []
  COUNTRIES.forEach(function(c) {
    if (PRIORITY_CODES.indexOf(c.code) >= 0) priority.push(c)
    else rest.push(c)
  })
  // Trier les prioritaires dans l'ordre PRIORITY_CODES
  priority.sort(function(a,b) {
    return PRIORITY_CODES.indexOf(a.code) - PRIORITY_CODES.indexOf(b.code)
  })
  return priority.concat(rest)
}

var SORTED_COUNTRIES = buildSortedList()

// ── Styles injectés une seule fois ──────────────────────────
var _stylesInjected = false
function injectStyles() {
  if (_stylesInjected) return
  _stylesInjected = true
  var style = document.createElement('style')
  style.textContent = [
    /* Wrapper : simple block, pas de position relative */
    '.cs-wrap{display:block;user-select:none}',
    /* Bouton trigger : pleine largeur, style dark */
    '.cs-trigger{display:flex;align-items:center;gap:0.5rem;width:100%;background:#1A1A26;border:1px solid #374151;border-radius:0.75rem;padding:0.7rem 1rem;color:#fff;cursor:pointer;transition:border-color .2s;min-height:3rem;box-sizing:border-box}',
    '.cs-trigger:focus,.cs-trigger.open{border-color:#F59E0B;outline:none}',
    '.cs-trigger-flag{font-size:1.2rem;line-height:1;flex-shrink:0}',
    '.cs-trigger-name{flex:1;text-align:left;font-size:0.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}',
    '.cs-trigger-dial{font-size:0.8rem;color:#F59E0B;font-weight:700;flex-shrink:0;min-width:2.8rem;text-align:right}',
    '.cs-trigger-arrow{flex-shrink:0;color:#6B7280;font-size:0.6rem;margin-left:0.25rem;transition:transform .2s}',
    '.cs-trigger.open .cs-trigger-arrow{transform:rotate(180deg)}',
    '.cs-trigger-placeholder{color:#6B7280}',
    /* Dropdown : porté sur body, position fixed calculée par JS */
    '.cs-dropdown{position:fixed;z-index:99999;background:#1A1A26;border:1px solid #F59E0B55;border-radius:0.75rem;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.75)}',
    '.cs-search-wrap{padding:0.5rem;border-bottom:1px solid #22223A}',
    '.cs-search{width:100%;background:#0D0D18;border:1px solid #374151;border-radius:0.5rem;padding:0.5rem 0.75rem;color:#fff;font-size:0.875rem;outline:none;box-sizing:border-box}',
    '.cs-search:focus{border-color:#F59E0B}',
    '.cs-search::placeholder{color:#6B7280}',
    '.cs-list{max-height:200px;overflow-y:auto;overscroll-behavior:contain}',
    '.cs-list::-webkit-scrollbar{width:4px}',
    '.cs-list::-webkit-scrollbar-track{background:#12121A}',
    '.cs-list::-webkit-scrollbar-thumb{background:#F59E0B50;border-radius:2px}',
    '.cs-item{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.75rem;cursor:pointer;transition:background .1s;font-size:0.85rem}',
    '.cs-item:hover,.cs-item.focused{background:#F59E0B18}',
    '.cs-item-flag{font-size:1.1rem;flex-shrink:0;width:1.4rem;text-align:center}',
    '.cs-item-name{flex:1;color:#e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cs-item-dial{font-size:0.78rem;color:#F59E0B;font-weight:700;flex-shrink:0;min-width:3rem;text-align:right}',
    '.cs-sep{height:1px;background:#2A2A3A;margin:0.2rem 0}',
    '.cs-empty{padding:1rem;text-align:center;color:#6B7280;font-size:0.875rem}',
  ].join('\n')
  document.head.appendChild(style)
}

// ── Constructeur CountrySelector ────────────────────────────
// config = {
//   triggerId   : id du bouton-déclencheur (sera créé si inexistant)
//   dropdownId  : id du div dropdown (sera créé)
//   countryInputId : input hidden / text qui reçoit le nom du pays
//   dialInputId    : input hidden / text qui reçoit l'indicatif
//   placeholder    : texte par défaut (optional)
//   onSelect       : callback(country) appelé après sélection (optional)
//   defaultCode    : code ISO à pré-sélectionner (optional)
//   theme          : 'dark' (default) | 'member' (reg-* forms, slightly larger)
// }
function CountrySelectorInstance(config) {
  injectStyles()
  var self = this
  var wrap       = document.getElementById(config.wrapperId)
  var cInput     = config.countryInputId ? document.getElementById(config.countryInputId) : null
  var dInput     = config.dialInputId    ? document.getElementById(config.dialInputId)    : null
  var isOpen     = false
  var query      = ''
  var focusIdx   = -1
  var selected   = null

  if (!wrap) { console.warn('[CountrySelector] wrapper #'+config.wrapperId+' not found'); return }

  // ── Créer le bouton trigger dans le wrapper ──
  wrap.innerHTML = [
    '<button type="button" class="cs-trigger" id="'+config.wrapperId+'-btn" aria-haspopup="listbox" aria-expanded="false">',
    '  <span class="cs-trigger-flag" id="'+config.wrapperId+'-flag">🌍</span>',
    '  <span class="cs-trigger-name cs-trigger-placeholder" id="'+config.wrapperId+'-name">'+(config.placeholder||'Sélectionner un pays')+'</span>',
    '  <span class="cs-trigger-dial" id="'+config.wrapperId+'-dial"></span>',
    '  <i class="fas fa-chevron-down cs-trigger-arrow"></i>',
    '</button>'
  ].join('')

  // ── Créer le dropdown et l'attacher au body ──
  // (évite les problèmes de overflow:hidden / stacking context des parents)
  var dd = document.createElement('div')
  dd.id = config.wrapperId+'-dd'
  dd.className = 'cs-dropdown'
  dd.setAttribute('role','listbox')
  dd.style.display = 'none'
  dd.innerHTML = [
    '<div class="cs-search-wrap">',
    '  <input class="cs-search" id="'+config.wrapperId+'-search" type="text" placeholder="Rechercher un pays…" autocomplete="off">',
    '</div>',
    '<div class="cs-list" id="'+config.wrapperId+'-list"></div>'
  ].join('')
  document.body.appendChild(dd)

  var btn    = document.getElementById(config.wrapperId+'-btn')
  var search = document.getElementById(config.wrapperId+'-search')
  var list   = document.getElementById(config.wrapperId+'-list')
  var flagEl = document.getElementById(config.wrapperId+'-flag')
  var nameEl = document.getElementById(config.wrapperId+'-name')
  var dialEl = document.getElementById(config.wrapperId+'-dial')

  function getFiltered() {
    var q = query.toLowerCase().trim()
    if (!q) return SORTED_COUNTRIES
    return SORTED_COUNTRIES.filter(function(c) {
      return c.name.toLowerCase().indexOf(q) >= 0 ||
             c.code.toLowerCase().indexOf(q) >= 0 ||
             c.dial.indexOf(q) >= 0
    })
  }

  function renderList() {
    var filtered = getFiltered()
    if (!filtered.length) {
      list.innerHTML = '<div class="cs-empty">Aucun pays trouvé</div>'
      return
    }
    var hasPriority = !query.trim()
    var html = []
    var sepDone = false
    filtered.forEach(function(c, i) {
      var isPriority = PRIORITY_CODES.indexOf(c.code) >= 0
      if (hasPriority && !isPriority && !sepDone) {
        html.push('<div class="cs-sep"></div>')
        sepDone = true
      }
      html.push(
        '<div class="cs-item'+(i===focusIdx?' focused':'')+'" data-code="'+c.code+'" role="option">'+
        '<span class="cs-item-flag">'+c.flag+'</span>'+
        '<span class="cs-item-name">'+c.name+'</span>'+
        '<span class="cs-item-dial">'+c.dial+'</span>'+
        '</div>'
      )
    })
    list.innerHTML = html.join('')
    // Bind click
    list.querySelectorAll('.cs-item').forEach(function(el) {
      el.addEventListener('mousedown', function(e) {
        e.preventDefault()
        var code = el.getAttribute('data-code')
        var country = COUNTRIES.find(function(c){ return c.code===code })
        if (country) selectCountry(country)
      })
    })
  }

  function selectCountry(country) {
    selected = country
    // Mettre à jour le trigger
    flagEl.textContent = country.flag
    nameEl.textContent = country.name
    nameEl.className = 'cs-trigger-name'
    dialEl.textContent = country.dial
    // Mettre à jour les inputs cachés/texte
    if (cInput) { cInput.value = country.name; cInput.dispatchEvent(new Event('change')) }
    if (dInput) { dInput.value = country.dial; dInput.dispatchEvent(new Event('change')) }
    // Callback
    if (typeof config.onSelect === 'function') config.onSelect(country)
    close()
  }

  function positionDropdown() {
    var rect = btn.getBoundingClientRect()
    // position:fixed → coordonnées viewport uniquement, PAS de scrollX/scrollY
    var spaceBelow = window.innerHeight - rect.bottom - 8
    var spaceAbove = rect.top - 8
    var listEl = dd.querySelector('.cs-list')

    if (spaceBelow >= 120) {
      // Ouvrir vers le bas
      dd.style.top    = rect.bottom + 4 + 'px'
      dd.style.bottom = 'auto'
      var maxH = Math.min(260, spaceBelow - 4)
      if (listEl) listEl.style.maxHeight = Math.max(80, maxH - 54) + 'px'
    } else {
      // Pas assez de place en bas → ouvrir vers le haut
      dd.style.bottom = (window.innerHeight - rect.top + 4) + 'px'
      dd.style.top    = 'auto'
      var maxH2 = Math.min(260, spaceAbove - 4)
      if (listEl) listEl.style.maxHeight = Math.max(80, maxH2 - 54) + 'px'
    }
    dd.style.left  = rect.left + 'px'
    dd.style.width = rect.width + 'px'
  }

  function open() {
    isOpen = true
    query = ''
    focusIdx = -1
    positionDropdown()
    dd.style.display = 'block'
    btn.setAttribute('aria-expanded','true')
    btn.classList.add('open')
    renderList()
    setTimeout(function(){ search.focus(); search.select() }, 30)
    document.addEventListener('mousedown', outsideClick)
    window.addEventListener('scroll', positionDropdown, true)
    window.addEventListener('resize', positionDropdown)
  }

  function close() {
    isOpen = false
    dd.style.display = 'none'
    btn.setAttribute('aria-expanded','false')
    btn.classList.remove('open')
    document.removeEventListener('mousedown', outsideClick)
    window.removeEventListener('scroll', positionDropdown, true)
    window.removeEventListener('resize', positionDropdown)
  }

  function outsideClick(e) {
    if (!wrap.contains(e.target) && !dd.contains(e.target)) close()
  }

  btn.addEventListener('click', function(e) {
    e.preventDefault()
    isOpen ? close() : open()
  })

  search.addEventListener('input', function() {
    query = search.value
    focusIdx = -1
    renderList()
  })

  // Navigation clavier
  search.addEventListener('keydown', function(e) {
    var filtered = getFiltered()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusIdx = Math.min(focusIdx+1, filtered.length-1)
      renderList()
      var focused = list.querySelector('.focused')
      if (focused) focused.scrollIntoView({block:'nearest'})
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusIdx = Math.max(focusIdx-1, 0)
      renderList()
      var focused = list.querySelector('.focused')
      if (focused) focused.scrollIntoView({block:'nearest'})
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusIdx >= 0 && filtered[focusIdx]) selectCountry(filtered[focusIdx])
      else if (filtered.length === 1) selectCountry(filtered[0])
    } else if (e.key === 'Escape') {
      close()
      btn.focus()
    }
  })

  // Pré-sélection
  if (config.defaultCode) {
    var def = COUNTRIES.find(function(c){ return c.code===config.defaultCode })
    if (def) selectCountry(def)
  }

  // API publique
  self.setValue = function(countryName) {
    var found = COUNTRIES.find(function(c){ return c.name.toLowerCase()===countryName.toLowerCase() })
    if (found) selectCountry(found)
  }
  self.getValue = function() { return selected }
  self.reset = function() {
    selected = null
    flagEl.textContent = '🌍'
    nameEl.textContent = config.placeholder || 'Sélectionner un pays'
    nameEl.className = 'cs-trigger-name cs-trigger-placeholder'
    dialEl.textContent = ''
    if (cInput) cInput.value = ''
    if (dInput) dInput.value = ''
  }
  self.destroy = function() {
    close()
    if (dd && dd.parentNode) dd.parentNode.removeChild(dd)
  }
}

// ── API publique ────────────────────────────────────────────
var instances = {}

global.CountrySelector = {
  COUNTRIES: COUNTRIES,

  // Initialise un sélecteur et retourne l'instance
  init: function(config) {
    var inst = new CountrySelectorInstance(config)
    if (config.wrapperId) instances[config.wrapperId] = inst
    return inst
  },

  // Récupère une instance existante
  get: function(wrapperId) { return instances[wrapperId] },

  // Trouve un pays par code ISO
  findByCode: function(code) {
    return COUNTRIES.find(function(c){ return c.code===code }) || null
  },

  // Trouve un pays par nom (insensible à la casse)
  findByName: function(name) {
    var n = name.toLowerCase()
    return COUNTRIES.find(function(c){ return c.name.toLowerCase()===n }) || null
  }
}

})(window)
