#!/usr/bin/env node
/**
 * inject-tz-select.cjs
 * Remplace le champ <input id="bvreset-tz"> par un <select> avec tous les
 * fuseaux horaires IANA + GMT dans admin-app.js
 */

const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, '..', 'public', 'static', 'admin-app.js');

// ── Liste complète des fuseaux horaires groupés ────────────────────────────
const TIMEZONES = [
  // ── UTC / GMT ─────────────────────────────────────────────────────────
  { group: 'UTC / GMT', zones: [
    'UTC',
    'GMT',
    'Etc/GMT',
    'Etc/GMT+0','Etc/GMT+1','Etc/GMT+2','Etc/GMT+3','Etc/GMT+4','Etc/GMT+5',
    'Etc/GMT+6','Etc/GMT+7','Etc/GMT+8','Etc/GMT+9','Etc/GMT+10','Etc/GMT+11','Etc/GMT+12',
    'Etc/GMT-1','Etc/GMT-2','Etc/GMT-3','Etc/GMT-4','Etc/GMT-5',
    'Etc/GMT-6','Etc/GMT-7','Etc/GMT-8','Etc/GMT-9','Etc/GMT-10','Etc/GMT-11','Etc/GMT-12',
    'Etc/GMT-13','Etc/GMT-14',
  ]},
  // ── Africa ────────────────────────────────────────────────────────────
  { group: 'Africa', zones: [
    'Africa/Abidjan','Africa/Accra','Africa/Addis_Ababa','Africa/Algiers',
    'Africa/Asmara','Africa/Bamako','Africa/Bangui','Africa/Banjul',
    'Africa/Bissau','Africa/Blantyre','Africa/Brazzaville','Africa/Bujumbura',
    'Africa/Cairo','Africa/Casablanca','Africa/Ceuta','Africa/Conakry',
    'Africa/Dakar','Africa/Dar_es_Salaam','Africa/Djibouti','Africa/Douala',
    'Africa/El_Aaiun','Africa/Freetown','Africa/Gaborone','Africa/Harare',
    'Africa/Johannesburg','Africa/Juba','Africa/Kampala','Africa/Khartoum',
    'Africa/Kigali','Africa/Kinshasa','Africa/Lagos','Africa/Libreville',
    'Africa/Lome','Africa/Luanda','Africa/Lubumbashi','Africa/Lusaka',
    'Africa/Malabo','Africa/Maputo','Africa/Maseru','Africa/Mbabane',
    'Africa/Mogadishu','Africa/Monrovia','Africa/Nairobi','Africa/Ndjamena',
    'Africa/Niamey','Africa/Nouakchott','Africa/Ouagadougou','Africa/Porto-Novo',
    'Africa/Sao_Tome','Africa/Tripoli','Africa/Tunis','Africa/Windhoek',
  ]},
  // ── America ───────────────────────────────────────────────────────────
  { group: 'America', zones: [
    'America/Adak','America/Anchorage','America/Anguilla','America/Antigua',
    'America/Araguaina','America/Argentina/Buenos_Aires','America/Argentina/Catamarca',
    'America/Argentina/Cordoba','America/Argentina/Jujuy','America/Argentina/La_Rioja',
    'America/Argentina/Mendoza','America/Argentina/Rio_Gallegos','America/Argentina/Salta',
    'America/Argentina/San_Juan','America/Argentina/San_Luis','America/Argentina/Tucuman',
    'America/Argentina/Ushuaia','America/Aruba','America/Asuncion','America/Atikokan',
    'America/Bahia','America/Bahia_Banderas','America/Barbados','America/Belem',
    'America/Belize','America/Blanc-Sablon','America/Boa_Vista','America/Bogota',
    'America/Boise','America/Cambridge_Bay','America/Campo_Grande','America/Cancun',
    'America/Caracas','America/Cayenne','America/Cayman','America/Chicago',
    'America/Chihuahua','America/Costa_Rica','America/Creston','America/Cuiaba',
    'America/Curacao','America/Danmarkshavn','America/Dawson','America/Dawson_Creek',
    'America/Denver','America/Detroit','America/Dominica','America/Edmonton',
    'America/Eirunepe','America/El_Salvador','America/Fortaleza','America/Glace_Bay',
    'America/Godthab','America/Goose_Bay','America/Grand_Turk','America/Grenada',
    'America/Guadeloupe','America/Guatemala','America/Guayaquil','America/Guyana',
    'America/Halifax','America/Havana','America/Hermosillo','America/Indiana/Indianapolis',
    'America/Indiana/Knox','America/Indiana/Marengo','America/Indiana/Petersburg',
    'America/Indiana/Tell_City','America/Indiana/Vevay','America/Indiana/Vincennes',
    'America/Indiana/Winamac','America/Inuvik','America/Iqaluit','America/Jamaica',
    'America/Juneau','America/Kentucky/Louisville','America/Kentucky/Monticello',
    'America/Kralendijk','America/La_Paz','America/Lima','America/Los_Angeles',
    'America/Lower_Princes','America/Maceio','America/Managua','America/Manaus',
    'America/Marigot','America/Martinique','America/Matamoros','America/Mazatlan',
    'America/Menominee','America/Merida','America/Metlakatla','America/Mexico_City',
    'America/Miquelon','America/Moncton','America/Monterrey','America/Montevideo',
    'America/Montserrat','America/Nassau','America/New_York','America/Nipigon',
    'America/Nome','America/Noronha','America/North_Dakota/Beulah',
    'America/North_Dakota/Center','America/North_Dakota/New_Salem',
    'America/Nuuk','America/Ojinaga','America/Panama','America/Pangnirtung',
    'America/Paramaribo','America/Phoenix','America/Port-au-Prince',
    'America/Port_of_Spain','America/Porto_Velho','America/Puerto_Rico',
    'America/Punta_Arenas','America/Rainy_River','America/Rankin_Inlet',
    'America/Recife','America/Regina','America/Resolute','America/Rio_Branco',
    'America/Santa_Isabel','America/Santarem','America/Santiago','America/Santo_Domingo',
    'America/Sao_Paulo','America/Scoresbysund','America/Sitka','America/St_Barthelemy',
    'America/St_Johns','America/St_Kitts','America/St_Lucia','America/St_Thomas',
    'America/St_Vincent','America/Swift_Current','America/Tegucigalpa','America/Thule',
    'America/Thunder_Bay','America/Tijuana','America/Toronto','America/Tortola',
    'America/Vancouver','America/Whitehorse','America/Winnipeg','America/Yakutat',
    'America/Yellowknife',
  ]},
  // ── Antarctica ────────────────────────────────────────────────────────
  { group: 'Antarctica', zones: [
    'Antarctica/Casey','Antarctica/Davis','Antarctica/DumontDUrville',
    'Antarctica/Macquarie','Antarctica/Mawson','Antarctica/McMurdo',
    'Antarctica/Palmer','Antarctica/Rothera','Antarctica/Syowa',
    'Antarctica/Troll','Antarctica/Vostok',
  ]},
  // ── Arctic ────────────────────────────────────────────────────────────
  { group: 'Arctic', zones: ['Arctic/Longyearbyen'] },
  // ── Asia ──────────────────────────────────────────────────────────────
  { group: 'Asia', zones: [
    'Asia/Aden','Asia/Almaty','Asia/Amman','Asia/Anadyr','Asia/Aqtau',
    'Asia/Aqtobe','Asia/Ashgabat','Asia/Atyrau','Asia/Baghdad','Asia/Bahrain',
    'Asia/Baku','Asia/Bangkok','Asia/Barnaul','Asia/Beirut','Asia/Bishkek',
    'Asia/Brunei','Asia/Chita','Asia/Choibalsan','Asia/Colombo','Asia/Damascus',
    'Asia/Dhaka','Asia/Dili','Asia/Dubai','Asia/Dushanbe','Asia/Famagusta',
    'Asia/Gaza','Asia/Hebron','Asia/Ho_Chi_Minh','Asia/Hong_Kong','Asia/Hovd',
    'Asia/Irkutsk','Asia/Jakarta','Asia/Jayapura','Asia/Jerusalem','Asia/Kabul',
    'Asia/Kamchatka','Asia/Karachi','Asia/Kathmandu','Asia/Khandyga','Asia/Kolkata',
    'Asia/Krasnoyarsk','Asia/Kuala_Lumpur','Asia/Kuching','Asia/Kuwait','Asia/Macau',
    'Asia/Magadan','Asia/Makassar','Asia/Manila','Asia/Muscat','Asia/Nicosia',
    'Asia/Novokuznetsk','Asia/Novosibirsk','Asia/Omsk','Asia/Oral','Asia/Phnom_Penh',
    'Asia/Pontianak','Asia/Pyongyang','Asia/Qatar','Asia/Qostanay','Asia/Qyzylorda',
    'Asia/Riyadh','Asia/Sakhalin','Asia/Samarkand','Asia/Seoul','Asia/Shanghai',
    'Asia/Singapore','Asia/Srednekolymsk','Asia/Taipei','Asia/Tashkent',
    'Asia/Tbilisi','Asia/Tehran','Asia/Thimphu','Asia/Tokyo','Asia/Tomsk',
    'Asia/Ulaanbaatar','Asia/Urumqi','Asia/Ust-Nera','Asia/Vientiane',
    'Asia/Vladivostok','Asia/Yakutsk','Asia/Yangon','Asia/Yekaterinburg','Asia/Yerevan',
  ]},
  // ── Atlantic ──────────────────────────────────────────────────────────
  { group: 'Atlantic', zones: [
    'Atlantic/Azores','Atlantic/Bermuda','Atlantic/Canary','Atlantic/Cape_Verde',
    'Atlantic/Faroe','Atlantic/Madeira','Atlantic/Reykjavik','Atlantic/South_Georgia',
    'Atlantic/St_Helena','Atlantic/Stanley',
  ]},
  // ── Australia ─────────────────────────────────────────────────────────
  { group: 'Australia', zones: [
    'Australia/Adelaide','Australia/Brisbane','Australia/Broken_Hill',
    'Australia/Darwin','Australia/Eucla','Australia/Hobart','Australia/Lindeman',
    'Australia/Lord_Howe','Australia/Melbourne','Australia/Perth','Australia/Sydney',
  ]},
  // ── Europe ────────────────────────────────────────────────────────────
  { group: 'Europe', zones: [
    'Europe/Amsterdam','Europe/Andorra','Europe/Astrakhan','Europe/Athens',
    'Europe/Belgrade','Europe/Berlin','Europe/Bratislava','Europe/Brussels',
    'Europe/Bucharest','Europe/Budapest','Europe/Busingen','Europe/Chisinau',
    'Europe/Copenhagen','Europe/Dublin','Europe/Gibraltar','Europe/Guernsey',
    'Europe/Helsinki','Europe/Isle_of_Man','Europe/Istanbul','Europe/Jersey',
    'Europe/Kaliningrad','Europe/Kiev','Europe/Kirov','Europe/Lisbon',
    'Europe/Ljubljana','Europe/London','Europe/Luxembourg','Europe/Madrid',
    'Europe/Malta','Europe/Mariehamn','Europe/Minsk','Europe/Monaco',
    'Europe/Moscow','Europe/Nicosia','Europe/Oslo','Europe/Paris',
    'Europe/Podgorica','Europe/Prague','Europe/Riga','Europe/Rome',
    'Europe/Samara','Europe/San_Marino','Europe/Sarajevo','Europe/Saratov',
    'Europe/Simferopol','Europe/Skopje','Europe/Sofia','Europe/Stockholm',
    'Europe/Tallinn','Europe/Tirane','Europe/Ulyanovsk','Europe/Uzhgorod',
    'Europe/Vaduz','Europe/Vatican','Europe/Vienna','Europe/Vilnius',
    'Europe/Volgograd','Europe/Warsaw','Europe/Zagreb','Europe/Zaporozhye',
    'Europe/Zurich',
  ]},
  // ── Indian ────────────────────────────────────────────────────────────
  { group: 'Indian', zones: [
    'Indian/Antananarivo','Indian/Chagos','Indian/Christmas','Indian/Cocos',
    'Indian/Comoro','Indian/Kerguelen','Indian/Mahe','Indian/Maldives',
    'Indian/Mauritius','Indian/Mayotte','Indian/Reunion',
  ]},
  // ── Pacific ───────────────────────────────────────────────────────────
  { group: 'Pacific', zones: [
    'Pacific/Apia','Pacific/Auckland','Pacific/Bougainville','Pacific/Chatham',
    'Pacific/Chuuk','Pacific/Easter','Pacific/Efate','Pacific/Enderbury',
    'Pacific/Fakaofo','Pacific/Fiji','Pacific/Funafuti','Pacific/Galapagos',
    'Pacific/Gambier','Pacific/Guadalcanal','Pacific/Guam','Pacific/Honolulu',
    'Pacific/Kiritimati','Pacific/Kosrae','Pacific/Kwajalein','Pacific/Majuro',
    'Pacific/Marquesas','Pacific/Midway','Pacific/Nauru','Pacific/Niue',
    'Pacific/Norfolk','Pacific/Noumea','Pacific/Pago_Pago','Pacific/Palau',
    'Pacific/Pitcairn','Pacific/Pohnpei','Pacific/Port_Moresby','Pacific/Rarotonga',
    'Pacific/Saipan','Pacific/Tahiti','Pacific/Tarawa','Pacific/Tongatapu',
    'Pacific/Wake','Pacific/Wallis',
  ]},
];

// Construire les <optgroup> + <option>
function buildSelectHtml(currentTz) {
  let html = '';
  for (const grp of TIMEZONES) {
    html += `<optgroup label="${grp.group}">`;
    for (const tz of grp.zones) {
      const sel = tz === currentTz ? ' selected' : '';
      html += `<option value="${tz}"${sel}>${tz}</option>`;
    }
    html += '</optgroup>';
  }
  return html;
}

// ── Lecture du fichier ─────────────────────────────────────────────────────
let src = fs.readFileSync(TARGET, 'utf8');

// ── Marqueur OLD : le champ input + la ligne d'aide ───────────────────────
const OLD_INPUT = `<input id="bvreset-tz" type="text" value="\${cfg.timezone}" class="form-input mt-2" placeholder="Indian/Mauritius">
            <p class="text-xs text-gray-500 mt-1">Exemples : Indian/Mauritius · UTC · America/New_York · Europe/Paris</p>`;

if (!src.includes(OLD_INPUT)) {
  console.error('❌ Marqueur OLD non trouvé — vérifiez que admin-app.js contient bien le champ bvreset-tz');
  process.exit(1);
}

// ── Génération du select avec les options (current tz dynamique via template) ──
// On injecte le HTML avec un marqueur JS dynamique pour la valeur courante.
// Comme le fichier est un template littéral JS, on utilise ${...} côté template.
// Le select sera rendu avec la valeur cfg.timezone présélectionnée.

// On construit les options statiques (sans sélection) et on injecte la sélection via JS inline
const optionsHtml = (() => {
  let html = '';
  for (const grp of TIMEZONES) {
    html += `<optgroup label=\\"${grp.group}\\">`;
    for (const tz of grp.zones) {
      html += `<option value=\\"${tz}\\">\${cfg.timezone==='${tz}'?' ✓ ':''} ${tz}</option>`;
    }
    html += '</optgroup>';
  }
  return html;
})();

// Approche plus propre : select avec selected via JS dans le template littéral
// On encode les options sans l'approche ✓ — on utilise juste l'attribut selected
const selectOptions = (() => {
  let html = '';
  for (const grp of TIMEZONES) {
    html += `<optgroup label=\\"${grp.group}\\">`;
    for (const tz of grp.zones) {
      // Dans un template literal JS (backticks), on a besoin d'échapper correctement
      // cfg.timezone est la valeur du JSON retourné par l'API
      html += `<option value=\\"${tz}\\"\${cfg.timezone==='${tz}'?' selected':''}>${tz}</option>`;
    }
    html += '</optgroup>';
  }
  return html;
})();

const NEW_SELECT =
`<select id="bvreset-tz" class="form-input mt-2 bg-dark-600 text-white" style="max-height:200px">` +
selectOptions +
`</select>
            <p class="text-xs text-gray-500 mt-1">Fuseau sélectionné · Indian/Mauritius = UTC+4 (Maurice)</p>`;

src = src.replace(OLD_INPUT, NEW_SELECT);

if (!src.includes('id="bvreset-tz"') || src.includes('placeholder="Indian/Mauritius"')) {
  // Vérification partielle
  console.error('❌ Remplacement échoué');
  process.exit(1);
}

// ── Mise à jour de saveBVResetConfig : lire value du select ───────────────
// La ligne lit déjà .value — le select retourne aussi .value, donc aucun changement
// nécessaire dans saveBVResetConfig. Le getElementById('bvreset-tz').value fonctionne
// identiquement pour un input et un select.

// ── Écriture ──────────────────────────────────────────────────────────────
fs.writeFileSync(TARGET, src, 'utf8');
console.log('✅ Champ fuseau horaire remplacé par un <select> complet (tous les fuseaux IANA + GMT)');
console.log(`   Taille fichier : ${(src.length / 1024).toFixed(1)} KB`);
