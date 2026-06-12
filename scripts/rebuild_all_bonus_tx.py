#!/usr/bin/env python3
"""
Reconstruit TOUTES les transactions bonus pour TOUS les membres.
Objectif : exactement 9 transactions par membre/type (1er au 9 juin 2026)
avec le montant journalier correct issu des pending_wallet_entries.

Stratégie :
1. DELETE toutes les transactions *_daily pour tous les membres
2. INSERT 9 transactions par membre/type avec le bon montant
3. UPDATE wallets : recalculer balance = non-bonus + (9j × apd_total par type)
"""

import uuid
from datetime import date, timedelta

MONTHS_FR = {6: 'juin'}

def day_label(d):
    return f"{d.day:02d} {MONTHS_FR[d.month]} {d.year}"

def tx_id():
    return uuid.uuid4().hex  # 32 chars hex sans tirets

# ── Données APD (amount_per_day total) par membre/type ──────────────────────
# Source : SELECT member_id, commission_type, SUM(amount_per_day) FROM pending_wallet_entries WHERE period='2026-05' GROUP BY member_id, commission_type
APD = {
    # duchef blanchet  (210e5ddb)
    "210e5ddb-58fd-4eb6-8361-c60c7b576a3d": {
        "fast_start":                  500/30,
        "prime_leadership":            960.0,
        "valorisation_recommandation": 400/30,
    },
    # Willy LAGARRIGUE (503e854c)
    "503e854c-6c9a-49ab-9948-2a89df4d4a68": {
        "bonus_influence":             107.420968,
        "bonus_rayonnement":           175.83871,
        "fast_start":                  500/30,
        "prime_leadership":            7595.0,       # = 70000/30 + autres
        "valorisation_recommandation": 99.003333,
    },
    # Martin Simon (53d91e73)
    "53d91e73-4027-4210-b537-b18e22ed9bbf": {
        "bonus_rayonnement":           4.83871,
        "fast_start":                  500/30,
        "prime_leadership":            50.0,
        "valorisation_recommandation": 880/30,
    },
    # Fanny fan (67086114)
    "67086114-f9d2-4bdd-843c-2bf8ecf44156": {
        "fast_start":                  500/30,
        "prime_leadership":            360.0,
        "valorisation_recommandation": 200/30,
    },
    # Jean Jacques LAGARRIGUE (6a1b782d)
    "6a1b782d-af9d-4913-a680-3c3e957578ed": {
        "fast_start":                  500/30,
        "prime_leadership":            360.0,
        "valorisation_recommandation": 200/30,
    },
    # ROOT System (6d3bd3ed)
    "6d3bd3ed-e29b-42c9-8e66-1b60b796bb86": {
        "fast_start":                  500/30,
        "valorisation_recommandation": 100/30,
    },
    # Medhini SOOBHEN (6e31a694)
    "6e31a694-c993-41fc-b5f1-69448acf8453": {
        "fast_start":                  500/30,
        "prime_leadership":            360.0,
        "valorisation_recommandation": 200/30,
    },
    # Gabrielle LAGARRIGUE (76fd23c2)
    "76fd23c2-26bf-4b71-b114-e663c8c2661c": {
        "bonus_influence":             36.0,
        "fast_start":                  500/30,
        "prime_leadership":            365.0,        # attention : toutes ses entries
        "valorisation_recommandation": 500/30,
    },
    # Georges Dom (a2d63726)
    "a2d63726-9f41-4c1b-aa67-7f96eb20f003": {
        "bonus_influence":             0.4,
        "fast_start":                  500/30,
        "prime_leadership":            410.0,
        "valorisation_recommandation": 500/30,
    },
    # carlo an (adabc0e6)
    "adabc0e6-6cc5-470c-9176-6bd1ceb39f64": {
        "fast_start":                  500/30,
        "prime_leadership":            460.0,
        "valorisation_recommandation": 200/30,
    },
    # JP lag (d2b204e7)
    "d2b204e7-66df-4f99-9032-7517e5297b7e": {
        "fast_start":                  300/30,
        "prime_leadership":            200/30,
        "valorisation_recommandation": 1920/30,
    },
    # Jean Jacques (d45a41bd) — autre membre "Jean Jacques"
    "d45a41bd-346e-4ebd-a3a7-5d9c3209ab98": {
        "fast_start":                  500/30,
        "prime_leadership":            360.0,
        "valorisation_recommandation": 250/30,
    },
    # ROOT System (root-system)
    "root-system-000000000000000000000000": {
        "fast_start":                  500/30,
        "valorisation_recommandation": 344.8/30,
    },
}

TYPE_TO_TX  = {
    "prime_leadership":           "prime_leadership_daily",
    "fast_start":                 "fast_start_daily",
    "bonus_influence":            "bonus_influence_daily",
    "bonus_rayonnement":          "bonus_rayonnement_daily",
    "valorisation_recommandation":"valorisation_recommandation_daily",
}
TYPE_LABEL = {
    "prime_leadership":           "Prime de Leadership -- versement journalier",
    "fast_start":                 "Fast Start Bonus -- versement journalier",
    "bonus_influence":            "Bonus d''Influence -- versement journalier",
    "bonus_rayonnement":          "Bonus de Rayonnement -- versement journalier",
    "valorisation_recommandation":"Valorisation Recommandation -- versement journalier",
}

start = date(2026, 6, 1)
DAYS  = 9   # du 1er au 9 juin

lines = []
lines.append("-- =====================================================")
lines.append("-- RECONSTRUCTION TOTALE DES TRANSACTIONS BONUS")
lines.append("-- 9 jours × tous membres × tous types")
lines.append("-- =====================================================")
lines.append("")

# ── STEP 1 : DELETE toutes les *_daily pour tous les membres ─────────────────
lines.append("-- STEP 1 : Supprimer TOUTES les transactions *_daily existantes")
lines.append("""DELETE FROM wallet_transactions
WHERE wallet_type = 'principal'
  AND transaction_type IN (
    'prime_leadership_daily',
    'fast_start_daily',
    'bonus_influence_daily',
    'bonus_rayonnement_daily',
    'valorisation_recommandation_daily'
  );""")
lines.append("")

# ── STEP 2 : INSERT 9 tx par membre/type ─────────────────────────────────────
lines.append("-- STEP 2 : Recréer exactement 9 transactions par membre/type")
lines.append("")

# Calculer aussi le total versé correct par membre (pour step 3)
total_correct = {}  # member_id -> montant total correct (9j × sum_apd)

for member_id, types in APD.items():
    total_correct[member_id] = 0.0
    for ctype, apd in types.items():
        tx_type = TYPE_TO_TX[ctype]
        label   = TYPE_LABEL[ctype]
        lines.append(f"-- {member_id[:8]}... | {ctype} | APD={apd:.4f} | 9j = {apd*9:.4f}")
        for day_idx in range(DAYS):
            d      = start + timedelta(days=day_idx)
            dl     = day_label(d)
            tid    = tx_id()
            ts     = f"2026-06-{d.day:02d} 08:00:{day_idx:02d}"
            lines.append(
                f"INSERT INTO wallet_transactions "
                f"(id,member_id,wallet_type,transaction_type,amount,balance_before,balance_after,description,created_at) "
                f"VALUES ('{tid}','{member_id}','principal','{tx_type}',{apd:.10f},0,0,"
                f"'{label} · {dl} · ${apd:.2f}/j','{ts}');"
            )
        total_correct[member_id] += apd * DAYS
        lines.append("")

# ── STEP 3 : Recalculer les wallets ──────────────────────────────────────────
lines.append("-- STEP 3 : Recalculer balance = non-bonus credits + bonus corrects")
lines.append("--          = (total actuel) - (transactions *_daily actuelles supprimées) + total_correct")
lines.append("")

# Pour chaque membre : nouveau balance = balance_non_bonus + total_correct
# On ne peut pas calculer balance_non_bonus sans lire la DB,
# donc on écrit le UPDATE sous forme de delta :
# new_balance = old_balance - sum(*_daily actuel) + total_correct
# Mais on a déjà les totaux *_daily par membre dans le premier SELECT !

# Données lues plus tôt (totaux *_daily par membre = montants incorrects versés)
ACTUEL_DAILY = {
    # Valeurs EXACTES lues depuis la DB production le 2026-06-09
    # SELECT member_id, ROUND(SUM(CASE WHEN transaction_type LIKE '%_daily' THEN amount ELSE 0 END),4)
    # FROM wallet_transactions WHERE wallet_type='principal' GROUP BY member_id
    "210e5ddb-58fd-4eb6-8361-c60c7b576a3d": 19530.0,
    "503e854c-6c9a-49ab-9948-2a89df4d4a68": 97988.7,
    "53d91e73-4027-4210-b537-b18e22ed9bbf": 3030.0,
    "67086114-f9d2-4bdd-843c-2bf8ecf44156": 3450.0,
    "6a1b782d-af9d-4913-a680-3c3e957578ed": 3450.0,
    "6d3bd3ed-e29b-42c9-8e66-1b60b796bb86": 0.0,       # absent de la DB → 0
    "6e31a694-c993-41fc-b5f1-69448acf8453": 12243.3333,
    "76fd23c2-26bf-4b71-b114-e663c8c2661c": 1744.6667,
    "a2d63726-9f41-4c1b-aa67-7f96eb20f003": 12175.3333,
    "adabc0e6-6cc5-470c-9176-6bd1ceb39f64": 716.6667,
    "d2b204e7-66df-4f99-9032-7517e5297b7e": 2386.0,
    "d45a41bd-346e-4ebd-a3a7-5d9c3209ab98": 11550.0,
    "root-system-000000000000000000000000": 744.8,
}

for member_id, actuel in ACTUEL_DAILY.items():
    correct = total_correct[member_id]
    delta   = correct - actuel   # positif = on ajoute, négatif = on retire
    lines.append(f"-- {member_id[:8]}... | actuel={actuel:.2f} | correct={correct:.2f} | delta={delta:+.2f}")
    lines.append(
        f"UPDATE wallets "
        f"SET balance = ROUND(balance + ({delta:.10f}), 4), "
        f"    updated_at = '2026-06-09 14:00:00' "
        f"WHERE member_id = '{member_id}';"
    )
    lines.append("")

# Vérification finale
lines.append("-- VÉRIFICATION")
lines.append("""SELECT m.first_name||' '||m.last_name as membre,
  ROUND(w.balance,2) as balance,
  t.tx_type, t.nb, ROUND(t.total,2) as total
FROM wallets w
JOIN members m ON m.id = w.member_id
JOIN (
  SELECT member_id,
    transaction_type as tx_type,
    COUNT(*) as nb,
    SUM(amount) as total
  FROM wallet_transactions
  WHERE wallet_type='principal'
    AND transaction_type LIKE '%_daily'
  GROUP BY member_id, transaction_type
) t ON t.member_id = w.member_id
ORDER BY m.last_name, t.tx_type;""")

sql = "\n".join(lines)
with open("/home/user/webapp/scripts/rebuild_bonus_tx.sql", "w") as f:
    f.write(sql)

print(f"Fichier généré : {len(lines)} lignes")
total_inserts = sum(len(types) * DAYS for types in APD.values())
print(f"Total INSERT : {total_inserts}")
print()
print("Résumé corrections wallet :")
for mid, actuel in ACTUEL_DAILY.items():
    correct = total_correct.get(mid, 0)
    print(f"  {mid[:8]}  actuel={actuel:>10.2f}  correct={correct:>8.2f}  delta={correct-actuel:>+10.2f}")
