#!/usr/bin/env python3
"""
fix_member_status_v2.py
=======================
Met à jour member_status en DB prod avec la bonne règle métier :
  AMI       = plan_id≠0 OU current_rank_id≠NULL (package acheté → rangs illimités)
  Partenaire = active_license=1 mais pas de package (plafonné Manager)
  Membre    = ni package ni licence
"""
import csv, subprocess, sys, os, json, time, uuid

CSV_PATH   = '/home/user/uploaded_files/master member list (3).csv'
DB_NAME    = 'leader-network-production'
CHUNK_SIZE = 80
NAMESPACE  = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')

def make_uuid(username): return str(uuid.uuid5(NAMESPACE, f'willbeleader.com:{username}'))
def clean(v): return v.strip() if v else ''

def run(sql):
    r = subprocess.run(['npx','wrangler','d1','execute',DB_NAME,'--command',sql],
                       capture_output=True, text=True, timeout=60, cwd='/home/user/webapp')
    return r.returncode == 0, (r.stderr+r.stdout)[:300]

# ─── Lire CSV ─────────────────────────────────────────────────
print("=" * 60)
print("FIX member_status → AMI / Partenaire / Membre")
print("=" * 60)
with open(CSV_PATH, encoding='utf-8-sig') as f:
    reader = csv.reader(f, delimiter=';')
    headers = [h.strip('"') for h in next(reader)]
    idx = {h: i for i, h in enumerate(headers)}
    rows = [[v.strip('"') for v in row] for row in reader]

ami_ids = []; partenaire_ids = []; membre_ids = []

for r in rows:
    if len(r) < 40: continue
    username = clean(r[idx['username']])
    status   = clean(r[idx['status']])
    plan_id  = clean(r[idx['plan_id']])
    act_lic  = clean(r[idx['active_license']])
    rank_id  = clean(r[idx['current_rank_id']])
    if not username or username in ('NULL','ROOT','rootuser'): continue
    
    has_pkg  = bool(plan_id and plan_id not in ('0','NULL',''))
    has_rank = bool(rank_id and rank_id not in ('0','NULL',''))
    
    uid = make_uuid(username)
    if status == '1' and (has_pkg or has_rank):
        ami_ids.append(uid)
    elif status == '1' and act_lic == '1':
        partenaire_ids.append(uid)
    else:
        membre_ids.append(uid)

print(f"AMI:        {len(ami_ids)}")
print(f"Partenaire: {len(partenaire_ids)}")
print(f"Membre:     {len(membre_ids)}")
print()

def apply_updates(ids, new_status):
    total_ok = 0
    chunks = [ids[i:i+CHUNK_SIZE] for i in range(0, len(ids), CHUNK_SIZE)]
    for i, chunk in enumerate(chunks, 1):
        quoted = ','.join(f"'{x}'" for x in chunk)
        sql = f"UPDATE members SET member_status='{new_status}', updated_at=datetime('now') WHERE id IN ({quoted});"
        pct = i/len(chunks)*100
        print(f"  [{pct:5.1f}%] {new_status} chunk {i}/{len(chunks)} … ", end='', flush=True)
        ok, msg = run(sql)
        if ok:
            total_ok += len(chunk)
            print(f"✓")
        else:
            print(f"⚠ retry…")
            for uid in chunk:
                sql2 = f"UPDATE members SET member_status='{new_status}', updated_at=datetime('now') WHERE id='{uid}';"
                ok2, _ = run(sql2)
                if ok2: total_ok += 1
    return total_ok

print("Application des updates :")
ok_ami  = apply_updates(ami_ids,        'AMI')
ok_p    = apply_updates(partenaire_ids, 'Partenaire')
ok_m    = apply_updates(membre_ids,     'Membre')

print()
print(f"✅ AMI: {ok_ami} | Partenaire: {ok_p} | Membre: {ok_m}")

# Vérification
r = subprocess.run(['npx','wrangler','d1','execute',DB_NAME,
                    '--command',"SELECT member_status, COUNT(*) cnt FROM members GROUP BY member_status ORDER BY cnt DESC;",
                    '--json'], capture_output=True, text=True, timeout=60, cwd='/home/user/webapp')
if r.returncode == 0:
    data = json.loads(r.stdout)
    print("\nDistribution finale en DB :")
    for row in data[0]['results']:
        print(f"  {row['member_status']:12}: {row['cnt']}")

# Vérifier riteshs
r2 = subprocess.run(['npx','wrangler','d1','execute',DB_NAME,
                     '--command',"SELECT unique_id, member_status, left_bv_total, right_bv_total FROM members WHERE unique_id='riteshs';",
                     '--json'], capture_output=True, text=True, timeout=60, cwd='/home/user/webapp')
if r2.returncode == 0:
    data2 = json.loads(r2.stdout)
    print(f"\nriteshs: {data2[0]['results']}")

print()
print("=" * 60)
print("✅ FIX TERMINÉ — Lancer forceRecalcAllRanks depuis l'admin")
print("=" * 60)
