#!/usr/bin/env python3
"""Remplace le bloc Rang à vie / Prime mensuelle par les KPIs admin."""
import sys

path = 'public/static/admin-app.js'
content = open(path, encoding='utf-8').read()

# Chaîne exacte à remplacer (telle qu'elle apparaît dans le fichier minifié)
OLD = '       <div class="px-4 py-3 bg-dark-700/50 border-t border-dark-600 text-xs text-gray-400 flex flex-wrap gap-x-6 gap-y-1">\\\\n          <span><strong class="text-gray-300">&#x2720; Rang à vie</strong> — Colonnes utilisées pour obtenir le rang (une seule fois)</span>\\\\n          <span><strong class="text-gold-400">&#x2605; Prime mensuelle</strong> — Conditions à réunir chaque mois pour recevoir la prime. Plancher = nb de rangs sous lequel aucun paiement n\\\\\'est versé (0 = désactivé)</span>\\\\n        </div>'

NEW = (
  '<div class=\\"bg-dark-800 rounded-2xl border border-dark-600 p-5 space-y-4\\">'
  '\\\\n\\\\n'

  # ── Bloc 1 : CA ─────────────────────────────────────────────────────────
  '          <div>'
  '\\\\n            <div class=\\"text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-semibold flex items-center gap-1.5\\"><i class=\\"fas fa-chart-line text-green-400\\"></i> Chiffre d\\'affaires</div>'
  '\\\\n            <div class=\\"grid grid-cols-3 gap-2\\">'
  '\\\\n              <div class=\\"bg-dark-700 rounded-xl p-3\\"><div class=\\"text-[10px] text-gray-500 mb-1\\">CA Total</div><div class=\\"text-sm font-bold text-white\\">${fmt$(n.totalCommissions)}</div></div>'
  '\\\\n              <div class=\\"bg-dark-700 rounded-xl p-3\\"><div class=\\"text-[10px] text-gray-500 mb-1\\">Ce mois</div><div class=\\"text-sm font-bold text-green-400\\">${fmt$(n.caThisMois)}</div></div>'
  '\\\\n              <div class=\\"bg-dark-700 rounded-xl p-3\\"><div class=\\"text-[10px] text-gray-500 mb-1\\">Mois dernier</div><div class=\\"text-sm font-bold text-gray-300\\">${fmt$(n.caLastMois)}</div>${n.caEvoPct!==null?`<div class=\\"text-[10px] mt-0.5 font-semibold ${n.caEvoPct>=0?\\'text-green-400\\':\\'text-red-400\\'}\\">${n.caEvoPct>=0?\\'▲\\':\\'▼\\'} ${Math.abs(n.caEvoPct)}%</div>`:\'\'}</div>'
  '\\\\n            </div>'
  '\\\\n          </div>'
  '\\\\n\\\\n'

  # ── Bloc 2 : Membres ────────────────────────────────────────────────────
  '          <div>'
  '\\\\n            <div class=\\"text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-semibold flex items-center gap-1.5\\"><i class=\\"fas fa-users text-blue-400\\"></i> Réseau membres</div>'
  '\\\\n            <div class=\\"grid grid-cols-4 gap-2\\">'
  '\\\\n              <div class=\\"bg-dark-700 rounded-xl p-3\\"><div class=\\"text-[10px] text-gray-500 mb-1\\">Actifs</div><div class=\\"text-sm font-bold text-white\\">${n.totalActifs}</div></div>'
  '\\\\n              <div class=\\"bg-dark-700 rounded-xl p-3\\"><div class=\\"text-[10px] text-gray-500 mb-1\\">Ce mois</div><div class=\\"text-sm font-bold text-blue-400\\">+${n.newThisMois}</div></div>'
  '\\\\n              <div class=\\"bg-dark-700 rounded-xl p-3\\"><div class=\\"text-[10px] text-gray-500 mb-1\\">7 jours</div><div class=\\"text-sm font-bold text-indigo-400\\">+${n.newThisWeek}</div></div>'
  '\\\\n              <div class=\\"bg-dark-700 rounded-xl p-3\\"><div class=\\"text-[10px] text-gray-500 mb-1\\">Conversion</div><div class=\\"text-sm font-bold ${n.tauxConversion>=50?\\'text-green-400\\':\\'text-yellow-400\\'}\\">${n.tauxConversion}%</div></div>'
  '\\\\n            </div>'
  '\\\\n          </div>'
  '\\\\n\\\\n'

  # ── Bloc 3 : Wallets ────────────────────────────────────────────────────
  '          <div>'
  '\\\\n            <div class=\\"text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-semibold flex items-center gap-1.5\\"><i class=\\"fas fa-wallet text-yellow-400\\"></i> Portefeuilles & flux</div>'
  '\\\\n            <div class=\\"grid grid-cols-3 gap-2\\">'
  '\\\\n              <div class=\\"bg-dark-700 rounded-xl p-3\\"><div class=\\"text-[10px] text-gray-500 mb-1\\">Wallets dispo</div><div class=\\"text-sm font-bold text-yellow-400\\">${fmt$(n.walletsMain)}</div></div>'
  '\\\\n              <div class=\\"bg-dark-700 rounded-xl p-3\\"><div class=\\"text-[10px] text-gray-500 mb-1\\">En attente</div><div class=\\"text-sm font-bold text-orange-400\\">${fmt$(n.walletsPending)}</div></div>'
  '\\\\n              <div class=\\"bg-dark-700 rounded-xl p-3\\"><div class=\\"text-[10px] text-gray-500 mb-1\\">Versé ce mois</div><div class=\\"text-sm font-bold text-purple-400\\">${fmt$(n.commissionsThisMois)}</div></div>'
  '\\\\n            </div>'
  '\\\\n          </div>'
  '\\\\n\\\\n'

  # ── Bloc 4 : Primes Leadership ──────────────────────────────────────────
  '          <div>'
  '\\\\n            <div class=\\"text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-semibold flex items-center gap-1.5\\"><i class=\\"fas fa-crown text-gold-400\\"></i> Primes de Leadership</div>'
  '\\\\n            <div class=\\"grid grid-cols-4 gap-2\\">'
  '\\\\n              <div class=\\"bg-dark-700 rounded-xl p-3\\"><div class=\\"text-[10px] text-gray-500 mb-1\\">Actives</div><div class=\\"text-sm font-bold text-white\\">${n.primesActives}</div></div>'
  '\\\\n              <div class=\\"bg-dark-700 rounded-xl p-3\\"><div class=\\"text-[10px] text-gray-500 mb-1\\">Engagé restant</div><div class=\\"text-sm font-bold text-red-400\\">${fmt$(n.primesEngagees)}</div></div>'
  '\\\\n              <div class=\\"bg-dark-700 rounded-xl p-3\\"><div class=\\"text-[10px] text-gray-500 mb-1\\">Versé auj.</div><div class=\\"text-sm font-bold text-green-400\\">${fmt$(n.versementsJour)}</div></div>'
  '\\\\n              <div class=\\"bg-dark-700 rounded-xl p-3\\"><div class=\\"text-[10px] text-gray-500 mb-1\\">Versé ce mois</div><div class=\\"text-sm font-bold text-teal-400\\">${fmt$(n.versementsMois)}</div></div>'
  '\\\\n            </div>'
  '\\\\n          </div>'
  '\\\\n\\\\n'

  # ── Bloc 5 : Alertes ────────────────────────────────────────────────────
  '          <div>'
  '\\\\n            <div class=\\"text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-semibold flex items-center gap-1.5\\"><i class=\\"fas fa-bell text-red-400\\"></i> Alertes opérationnelles</div>'
  '\\\\n            <div class=\\"space-y-1.5\\">'
  '\\\\n              <div class=\\"flex items-center justify-between bg-dark-700 rounded-lg px-3 py-2\\">'
  '\\\\n                <span class=\\"text-xs text-gray-400 flex items-center gap-2\\"><i class=\\"fas fa-robot text-gray-500\\"></i> Cron automatique</span>'
  '\\\\n                <span class=\\"text-xs font-semibold ${n.cronOk?\\'text-green-400\\':\\'text-red-400\\'}\\">${n.cronOk?\\'✅ OK\\':\\'❌ INACTIF\\'} ${n.cronAgeMin!==null?\\'<span class=\\\\\\"text-gray-500 font-normal\\\\\">· il y a \\'+n.cronAgeMin+\\'min</span>\\':\\'\\'}</span>'
  '\\\\n              </div>'
  '\\\\n              <div class=\\"flex items-center justify-between bg-dark-700 rounded-lg px-3 py-2\\">'
  '\\\\n                <span class=\\"text-xs text-gray-400 flex items-center gap-2\\"><i class=\\"fas fa-calendar-check text-gray-500\\"></i> Dernier paiement journalier</span>'
  '\\\\n                <span class=\\"text-xs font-semibold ${n.lastDailyPayment===new Date().toISOString().substring(0,10)?\\'text-green-400\\':\\'text-yellow-400\\'}\\">${n.lastDailyPayment||\'—\'}</span>'
  '\\\\n              </div>'
  '\\\\n              <div class=\\"flex items-center justify-between bg-dark-700 rounded-lg px-3 py-2\\">'
  '\\\\n                <span class=\\"text-xs text-gray-400 flex items-center gap-2\\"><i class=\\"fas fa-id-card text-gray-500\\"></i> Licences expirées (actives)</span>'
  '\\\\n                <span class=\\"text-xs font-bold ${n.licencesExpirees>0?\\'text-red-400\\':\\'text-green-400\\'}\\">${n.licencesExpirees>0?\\'⚠️ \\'+n.licencesExpirees:\\'✅ 0\\'}</span>'
  '\\\\n              </div>'
  '\\\\n              <div class=\\"flex items-center justify-between bg-dark-700 rounded-lg px-3 py-2 cursor-pointer\\" onclick=\\"showAdminPage(\\'withdrawals\\')\\">'
  '\\\\n                <span class=\\"text-xs text-gray-400 flex items-center gap-2\\"><i class=\\"fas fa-clock text-gray-500\\"></i> Retraits en attente >48h</span>'
  '\\\\n                <span class=\\"text-xs font-bold ${n.retraits48h>0?\\'text-red-400\\':\\'text-green-400\\'}\\">${n.retraits48h>0?\\'⚠️ \\'+n.retraits48h+\\' → traiter\\':\\'✅ 0\\'}</span>'
  '\\\\n              </div>'
  '\\\\n            </div>'
  '\\\\n          </div>'
  '\\\\n\\\\n        </div>'
)

if OLD not in content:
    print("ERREUR: chaîne OLD non trouvée dans le fichier", file=sys.stderr)
    sys.exit(1)

count = content.count(OLD)
print(f"Occurrences trouvées: {count}")

new_content = content.replace(OLD, NEW, 1)
open(path, 'w', encoding='utf-8').write(new_content)
print("Remplacement effectué avec succès")
