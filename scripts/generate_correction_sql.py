#!/usr/bin/env python3
"""
Génère le SQL complet de correction pour les pending_wallet_entries erronées.

Stratégie :
1. Supprimer toutes les wallet_transactions liées aux 22 entrées à corriger
2. Recréer 9 transactions par entrée (pending debit + principal credit) = 18 tx par entrée = 396 tx total
3. Ajuster balance et pending_balance par membre
4. Mettre days_paid = 9, last_paid_at = '2026-06-09 08:00:00'

Note : les balance_before/balance_after dans les nouvelles transactions sont mis à 0
pour les transactions de reconstruction (valeur approximative acceptable —
les vraies valeurs ne sont pertinentes que pour l'historique visuel).
"""

from datetime import date, timedelta
import uuid

today     = date(2026, 6, 9)
start     = date(2026, 6, 1)
today_idx = (today - start).days  # = 8

# Libellés selon le commission_type
LABELS = {
    'prime_leadership':           'Prime de Leadership -- versement journalier',
    'fast_start':                 'Fast Start Bonus -- versement journalier',
    'valorisation_recommandation':'Valorisation Recommandation -- versement journalier',
    'bonus_influence':            "Bonus d''Influence -- versement journalier",   # apostrophe SQL échappée
    'bonus_rayonnement':          'Bonus de Rayonnement -- versement journalier',
}

# Libellé pour la transaction de libération (wallet pending → principal)
LABELS_LIBERATION = {
    'prime_leadership':           'Liberation vers portefeuille principal -- Prime de Leadership',
    'fast_start':                 'Liberation vers portefeuille principal -- Fast Start Bonus',
    'valorisation_recommandation':'Liberation vers portefeuille principal -- Valorisation Recommandation',
    'bonus_influence':            "Liberation vers portefeuille principal -- Bonus d''Influence",
    'bonus_rayonnement':          'Liberation vers portefeuille principal -- Bonus de Rayonnement',
}

MONTHS_FR = {
    1: 'janvier', 2: 'février', 3: 'mars', 4: 'avril',
    5: 'mai', 6: 'juin', 7: 'juillet', 8: 'août',
    9: 'septembre', 10: 'octobre', 11: 'novembre', 12: 'décembre'
}

def day_label_fr(d: date) -> str:
    return f"{d.day:02d} {MONTHS_FR[d.month]} {d.year}"

# ──────────────────────────────────────────────────────────────
# Données des 22 entrées à corriger (état réel production)
# ──────────────────────────────────────────────────────────────
entries = [
    # (pwe_id, member_id, commission_type, amount_per_day, days_paid_actuel, eligible_date)
    ("66c60041-0385-457e-9f75-165f5822b644", "76fd23c2-26bf-4b71-b114-e663c8c2661c",  "bonus_influence",            18.0,              26, "2026-06-07"),  # Gabrielle
    ("487f2ecf-1c3c-4b3d-b2cf-9338eb559baf", "503e854c-6c9a-49ab-9948-2a89df4d4a68",  "bonus_influence",             2.5,              29, "2026-06-08"),  # Willy
    ("cb65666e-6f1c-4b09-b641-06a1bd1b6d0e", "503e854c-6c9a-49ab-9948-2a89df4d4a68",  "bonus_influence",            14.4,              21, "2026-06-08"),  # Willy
    ("2e679bd2-1490-4713-a71e-5de285a0203c", "503e854c-6c9a-49ab-9948-2a89df4d4a68",  "bonus_influence",            18.0,              15, "2026-06-08"),  # Willy
    ("a3b832ec-52c7-4180-90e1-83384f129e0e", "503e854c-6c9a-49ab-9948-2a89df4d4a68",  "bonus_rayonnement",           5.0,              29, "2026-06-08"),  # Willy
    ("1e9ce140-16a5-4f8a-bcaa-f283b9dc59cf", "503e854c-6c9a-49ab-9948-2a89df4d4a68",  "bonus_rayonnement",           5.0,              28, "2026-06-08"),  # Willy
    ("fb351790-d8bc-4b8e-b5c1-70e70ef53983", "503e854c-6c9a-49ab-9948-2a89df4d4a68",  "bonus_rayonnement",          60.0,              27, "2026-06-08"),  # Willy
    ("6d54fb66-bd38-43e9-9b24-1fc4c28ab22f", "503e854c-6c9a-49ab-9948-2a89df4d4a68",  "bonus_rayonnement",          60.0,              26, "2026-06-08"),  # Willy
    ("a90cbbf0-9b90-4c9b-9231-075f7e814943", "503e854c-6c9a-49ab-9948-2a89df4d4a68",  "bonus_rayonnement",          36.0,              25, "2026-06-08"),  # Willy
    ("71990968-8942-4e85-9aac-6a7943dfe0e9", "503e854c-6c9a-49ab-9948-2a89df4d4a68",  "bonus_rayonnement",           5.0,              24, "2026-06-08"),  # Willy
    ("5aefe36c-5d7e-4c46-b07a-678792a17d1b", "6a1b782d-af9d-4913-a680-3c3e957578ed",  "fast_start",    500/30,            3, "2026-06-09"),  # JJ
    ("2aa0d768-3949-4366-991a-6f8077d3a525", "503e854c-6c9a-49ab-9948-2a89df4d4a68",  "prime_leadership",         70000/30,              23, "2026-06-08"),  # Willy
    ("d772e910-fb0b-4980-be61-2bd06af336d3", "6a1b782d-af9d-4913-a680-3c3e957578ed",  "prime_leadership",          360.0,               2, "2026-06-09"),  # JJ
    ("4f33d6ce-b8b4-4f6d-9d86-aa8ea5e4c514", "503e854c-6c9a-49ab-9948-2a89df4d4a68",  "valorisation_recommandation", 100/30,            17, "2026-06-08"),  # Willy
    ("f1178425-9560-4f32-9bf4-95c2f5b2d420", "503e854c-6c9a-49ab-9948-2a89df4d4a68",  "valorisation_recommandation", 16.0,              17, "2026-06-08"),  # Willy
    ("428b831c-b728-41ff-ba33-43c1e0487708", "503e854c-6c9a-49ab-9948-2a89df4d4a68",  "valorisation_recommandation", 16.0,              11, "2026-06-08"),  # Willy
    ("f498a7f6-71b8-4abd-bd50-684c632c8360", "6a1b782d-af9d-4913-a680-3c3e957578ed",  "valorisation_recommandation", 100/30,             3, "2026-06-09"),  # JJ
    ("73a90074-81bd-4185-b186-e6ed494b9435", "6a1b782d-af9d-4913-a680-3c3e957578ed",  "valorisation_recommandation", 100/30,             2, "2026-06-09"),  # JJ
    ("a59f749d-9ab8-412f-8930-c603cf791857", "67086114-f9d2-4bdd-843c-2bf8ecf44156",  "fast_start",    500/30,            4, "2026-06-09"),  # Fanny
    ("18e91fa5-abbd-4f83-ab81-a240e0a708bf", "67086114-f9d2-4bdd-843c-2bf8ecf44156",  "prime_leadership",          360.0,               3, "2026-06-09"),  # Fanny
    ("2b252a78-77e9-44ce-977b-77d0d78b65ef", "67086114-f9d2-4bdd-843c-2bf8ecf44156",  "valorisation_recommandation", 100/30,            13, "2026-06-09"),  # Fanny
    ("0ed06c76-4f1a-4942-a545-a056ac792c3b", "67086114-f9d2-4bdd-843c-2bf8ecf44156",  "valorisation_recommandation", 100/30,             4, "2026-06-09"),  # Fanny
]

DAYS_PAID_TARGET = 9  # today_idx + 1

# Wallets actuels en production
wallets_actuels = {
    "503e854c-6c9a-49ab-9948-2a89df4d4a68": {"balance": 135361.82999999804, "pending": 10480.769999999813,  "nom": "Willy LAGARRIGUE"},
    "76fd23c2-26bf-4b71-b114-e663c8c2661c": {"balance": 2078.6666666666615, "pending": 18016.000000000047,  "nom": "Gabrielle LAGARRIGUE"},
    "6a1b782d-af9d-4913-a680-3c3e957578ed": {"balance": 426.6666666666667,  "pending": 10713.333333333332,   "nom": "Jean Jacques LAGARRIGUE"},
    "67086114-f9d2-4bdd-843c-2bf8ecf44156": {"balance": 1203.3333333333335, "pending": 10296.666666666659,   "nom": "Fanny fan"},
}

# Calculer les deltas par membre
deltas = {mid: {"delta_balance": 0.0, "delta_pending": 0.0} for mid in wallets_actuels}

for (pwe_id, member_id, ctype, apd, days_paid_actuel, eligible_str) in entries:
    montant_actuel  = days_paid_actuel * apd
    montant_correct = DAYS_PAID_TARGET * apd
    delta           = montant_actuel - montant_correct  # positif = trop versé
    deltas[member_id]["delta_balance"]  += delta
    deltas[member_id]["delta_pending"]  += -delta

# ──────────────────────────────────────────────────────────────
# Génération du SQL
# ──────────────────────────────────────────────────────────────
lines = []

lines.append("-- =================================================================")
lines.append("-- CORRECTION CHIRURGICALE PENDING WALLET — 2026-06-09")
lines.append("-- Généré automatiquement par generate_correction_sql.py")
lines.append("-- =================================================================")
lines.append("")

# ── ÉTAPE 1 : Supprimer les transactions erronées ─────────────
lines.append("-- ÉTAPE 1 : Supprimer toutes les transactions erronées")
ids_str = ",\n  ".join(f"'{e[0]}'" for e in entries)
lines.append(f"""DELETE FROM wallet_transactions
WHERE reference_id IN (
  {ids_str}
);""")
lines.append("")

# ── ÉTAPE 2 : Recréer 9 transactions par entrée ──────────────
lines.append("-- ÉTAPE 2 : Recréer 9 transactions par entrée (pending debit + principal credit)")
lines.append("")

for (pwe_id, member_id, ctype, apd, days_paid_actuel, eligible_str) in entries:
    label_daily   = LABELS[ctype]
    label_pending = LABELS_LIBERATION[ctype]
    source_daily  = ctype + '_daily'
    
    lines.append(f"-- Entrée {pwe_id[:8]}... | {ctype} | APD={apd:.4f}")
    
    for day_idx in range(DAYS_PAID_TARGET):  # 0..8 = jours 1 à 9 juin
        day_date  = start + timedelta(days=day_idx)
        day_str   = day_label_fr(day_date)
        tx_id_1   = str(uuid.uuid4()).replace('-', '')  # pending debit
        tx_id_2   = str(uuid.uuid4()).replace('-', '')  # principal credit
        created_at = f"2026-06-{day_date.day:02d} 08:00:{day_idx:02d}"
        
        # Transaction 1 : pending → debit_transfer (1 ligne = 1 INSERT)
        desc1 = f"{label_pending} · {day_str}"
        lines.append(f"INSERT INTO wallet_transactions (id,member_id,wallet_type,transaction_type,amount,balance_before,balance_after,description,reference_id,created_at) VALUES ('{tx_id_1}','{member_id}','pending','debit_transfer',{-apd:.10f},0,0,'{desc1}','{pwe_id}','{created_at}');")
        
        # Transaction 2 : principal → credit (source = commission_type_daily)
        desc2 = f"{label_daily} · {day_str} · ${apd:.2f}/j"
        lines.append(f"INSERT INTO wallet_transactions (id,member_id,wallet_type,transaction_type,amount,balance_before,balance_after,description,reference_id,created_at) VALUES ('{tx_id_2}','{member_id}','principal','{source_daily}',{apd:.10f},0,0,'{desc2}','{pwe_id}','{created_at}');")
    
    lines.append("")

# ── ÉTAPE 3 : Ajuster les wallets ─────────────────────────────
lines.append("-- ÉTAPE 3 : Ajuster balance et pending_balance par membre")
lines.append("")

for member_id, w in wallets_actuels.items():
    delta_b = deltas[member_id]["delta_balance"]
    delta_p = deltas[member_id]["delta_pending"]
    new_bal  = round(w["balance"]  - delta_b, 4)
    new_pend = round(w["pending"]  - delta_p, 4)
    lines.append(f"-- {w['nom']} : balance {w['balance']:.4f} → {new_bal:.4f}  |  pending {w['pending']:.4f} → {new_pend:.4f}")
    lines.append(f"""UPDATE wallets
SET balance         = {new_bal:.10f},
    pending_balance = {new_pend:.10f},
    updated_at      = '2026-06-09 08:00:00'
WHERE member_id = '{member_id}';""")
    lines.append("")

# ── ÉTAPE 4 : Mettre à jour pending_wallet_entries ────────────
lines.append("-- ÉTAPE 4 : Mettre à jour pending_wallet_entries — days_paid = 9")
ids_pwe = ",\n  ".join(f"'{e[0]}'" for e in entries)
lines.append(f"""UPDATE pending_wallet_entries
SET days_paid    = 9,
    status       = 'active',
    last_paid_at = '2026-06-09 08:00:00'
WHERE id IN (
  {ids_pwe}
);""")
lines.append("")

# ── VÉRIFICATION FINALE ────────────────────────────────────────
lines.append("-- VÉRIFICATION FINALE")
lines.append("""SELECT 
  m.first_name || ' ' || m.last_name as membre,
  ROUND(w.balance, 4) as balance,
  ROUND(w.pending_balance, 4) as pending_balance,
  COUNT(DISTINCT pwe.id) as nb_entries,
  MIN(pwe.days_paid) as min_days_paid,
  MAX(pwe.days_paid) as max_days_paid
FROM wallets w
JOIN members m ON m.id = w.member_id
LEFT JOIN pending_wallet_entries pwe ON pwe.member_id = w.member_id
  AND pwe.status IN ('active','pending_release')
  AND pwe.eligible_date <= '2026-06-09'
WHERE w.member_id IN (
  '503e854c-6c9a-49ab-9948-2a89df4d4a68',
  '76fd23c2-26bf-4b71-b114-e663c8c2661c',
  '6a1b782d-af9d-4913-a680-3c3e957578ed',
  '67086114-f9d2-4bdd-843c-2bf8ecf44156'
)
GROUP BY w.member_id
ORDER BY m.last_name;""")

sql_output = "\n".join(lines)
with open("/home/user/webapp/scripts/correction_prod_20260609.sql", "w") as f:
    f.write(sql_output)

print(f"SQL généré : {len(lines)} lignes")
print(f"Transactions à créer : {len(entries) * DAYS_PAID_TARGET * 2} (= {len(entries)} entrées × {DAYS_PAID_TARGET} jours × 2 tx)")
print()

# Résumé des balances cibles
print("Balances cibles après correction :")
for member_id, w in wallets_actuels.items():
    delta_b = deltas[member_id]["delta_balance"]
    delta_p = deltas[member_id]["delta_pending"]
    new_bal  = round(w["balance"]  - delta_b, 4)
    new_pend = round(w["pending"]  - delta_p, 4)
    print(f"  {w['nom']:<30}  balance: {new_bal:>14.4f}  pending: {new_pend:>14.4f}")
