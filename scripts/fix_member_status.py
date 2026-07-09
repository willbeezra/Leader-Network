#!/usr/bin/env python3
"""
fix_member_status.py
====================
Corrige member_status='Membre' → 'Partenaire' pour les 1,227 membres
qui ont plan_id≠0 OU active_license=1 OU current_rank_id≠NULL dans le CSV source.

Usage:
    python3 scripts/fix_member_status.py

Prérequis:
    - wrangler installé et authentifié (npx wrangler)
    - CSV : /home/user/uploaded_files/master member list (3).csv
    - DB  : leader-network-production (remote via wrangler d1 execute)
"""

import csv
import subprocess
import sys
import json
import uuid
import time

# ─── Config ───────────────────────────────────────────────────────────────────
CSV_PATH    = '/home/user/uploaded_files/master member list (3).csv'
DB_NAME     = 'leader-network-production'
CHUNK_SIZE  = 100  # UPDATEs par batch wrangler
NAMESPACE   = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')  # NAMESPACE_DNS

def make_uuid(username: str) -> str:
    return str(uuid.uuid5(NAMESPACE, f'willbeleader.com:{username}'))

def clean(v: str) -> str:
    return v.strip() if v else ''

# ─── 1. Lire le CSV et identifier les Partenaires ────────────────────────────
print("=" * 60)
print("ÉTAPE 1 : Lecture du CSV")
print("=" * 60)

with open(CSV_PATH, encoding='utf-8-sig') as f:
    reader = csv.reader(f, delimiter=';')
    headers = [h.strip('"') for h in next(reader)]
    idx = {h: i for i, h in enumerate(headers)}
    rows = [[v.strip('"') for v in row] for row in reader]

partenaires = []  # liste de usernames

for r in rows:
    if len(r) < 40:
        continue
    username = clean(r[idx['username']])
    status   = clean(r[idx['status']])
    plan_id  = clean(r[idx.get('plan_id', -1)] if idx.get('plan_id', -1) >= 0 else '')
    act_lic  = clean(r[idx.get('active_license', -1)] if idx.get('active_license', -1) >= 0 else '')
    rank_id  = clean(r[idx.get('current_rank_id', -1)] if idx.get('current_rank_id', -1) >= 0 else '')

    if status != '1':
        continue
    if not username or username in ('NULL', ''):
        continue

    is_partenaire = (
        (plan_id  and plan_id  not in ('0', 'NULL', '')) or
        act_lic == '1' or
        (rank_id  and rank_id  not in ('0', 'NULL', ''))
    )

    if is_partenaire:
        partenaires.append(username)

print(f"✅ Partenaires identifiés dans le CSV : {len(partenaires)}")
print(f"   Exemples : {partenaires[:5]}")
print()

# ─── 2. Construire les UUIDs et les batches SQL ──────────────────────────────
print("=" * 60)
print("ÉTAPE 2 : Construction des batches SQL")
print("=" * 60)

# Générer les UPDATEs : on cible par unique_id (UUID déterministe)
member_ids = [make_uuid(u) for u in partenaires]

def build_batch_sql(ids_chunk: list[str]) -> str:
    """Génère un UPDATE ... WHERE id IN (...) pour un batch d'UUIDs."""
    quoted = ', '.join(f"'{mid}'" for mid in ids_chunk)
    return (
        f"UPDATE members "
        f"SET member_status='Partenaire', updated_at=datetime('now') "
        f"WHERE id IN ({quoted}) AND member_status='Membre';"
    )

batches = []
for i in range(0, len(member_ids), CHUNK_SIZE):
    batches.append(member_ids[i:i + CHUNK_SIZE])

print(f"✅ {len(batches)} batches de {CHUNK_SIZE} membres max")
print()

# ─── 3. Exécuter les batches via wrangler d1 execute ─────────────────────────
print("=" * 60)
print("ÉTAPE 3 : Application des UPDATEs en production (remote D1)")
print("=" * 60)

total_ok  = 0
total_err = 0

for batch_num, chunk in enumerate(batches, 1):
    sql = build_batch_sql(chunk)
    cmd = [
        'npx', '--yes', 'wrangler', 'd1', 'execute', DB_NAME,
        '--command', sql,
        '--json'
    ]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True, text=True, timeout=120,
            cwd='/home/user/webapp'
        )
        if result.returncode == 0:
            total_ok += len(chunk)
            print(f"  Batch {batch_num:2d}/{len(batches)} ✅  ({len(chunk)} membres, cumulatif: {total_ok})")
        else:
            total_err += len(chunk)
            print(f"  Batch {batch_num:2d}/{len(batches)} ❌  ERREUR:")
            print(f"    stdout: {result.stdout[:300]}")
            print(f"    stderr: {result.stderr[:300]}")
            # Retry stmt par stmt
            print(f"    → Retry un par un...")
            for mid in chunk:
                sql_single = (
                    f"UPDATE members "
                    f"SET member_status='Partenaire', updated_at=datetime('now') "
                    f"WHERE id='{mid}' AND member_status='Membre';"
                )
                cmd_single = [
                    'npx', '--yes', 'wrangler', 'd1', 'execute', DB_NAME,
                    '--command', sql_single
                ]
                r2 = subprocess.run(cmd_single, capture_output=True, text=True,
                                    timeout=60, cwd='/home/user/webapp')
                if r2.returncode == 0:
                    total_ok += 1
                    total_err -= 1
    except subprocess.TimeoutExpired:
        print(f"  Batch {batch_num:2d}/{len(batches)} ⏰  TIMEOUT")
        total_err += len(chunk)
    
    # Petite pause pour ne pas surcharger
    if batch_num % 5 == 0:
        time.sleep(1)

print()
print(f"✅ Total appliqués : {total_ok}")
if total_err > 0:
    print(f"❌ Total erreurs   : {total_err}")

# ─── 4. Vérification DB post-fix ─────────────────────────────────────────────
print()
print("=" * 60)
print("ÉTAPE 4 : Vérification en DB")
print("=" * 60)

check_sql = """
SELECT 
  member_status,
  COUNT(*) as count
FROM members
GROUP BY member_status
ORDER BY count DESC;
"""
cmd_check = [
    'npx', '--yes', 'wrangler', 'd1', 'execute', DB_NAME,
    '--command', check_sql.strip(),
    '--json'
]
r = subprocess.run(cmd_check, capture_output=True, text=True,
                   timeout=60, cwd='/home/user/webapp')
if r.returncode == 0:
    try:
        data = json.loads(r.stdout)
        results = data[0].get('results', data) if isinstance(data, list) else data
        print("Distribution member_status en DB :")
        for row in results:
            print(f"  {row.get('member_status', '?'):15s} : {row.get('count', '?')}")
    except Exception as e:
        print("stdout:", r.stdout[:500])
else:
    print("Erreur vérif:", r.stderr[:300])

# Vérifier riteshs spécifiquement
riteshs_id = make_uuid('riteshs')
check_sql2 = f"""
SELECT unique_id, member_status, license_active, current_rank, left_bv_total, right_bv_total
FROM members WHERE id='{riteshs_id}';
"""
cmd2 = [
    'npx', '--yes', 'wrangler', 'd1', 'execute', DB_NAME,
    '--command', check_sql2.strip(),
    '--json'
]
r2 = subprocess.run(cmd2, capture_output=True, text=True,
                    timeout=60, cwd='/home/user/webapp')
if r2.returncode == 0:
    try:
        data2 = json.loads(r2.stdout)
        results2 = data2[0].get('results', data2) if isinstance(data2, list) else data2
        print(f"\nriteshs en DB après fix :")
        for row in results2:
            for k, v in row.items():
                print(f"  {k}: {v}")
    except Exception as e:
        print("stdout:", r2.stdout[:500])

print()
print("=" * 60)
print("✅ FIX MEMBER_STATUS TERMINÉ")
print("   → Prochaine étape : POST /api/admin/ranks/force-recalc")
print("=" * 60)
