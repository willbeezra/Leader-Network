#!/usr/bin/env python3
"""
fix_binary_parents.py
=====================
Corrige les binary_parent_id et binary_position manquants/erronés en DB
en se basant sur le CSV source u (1) (3).csv.

Deux passes :
  1. UPDATE binary_parent_id + binary_position (lien enfant→parent)
  2. Rebuild binary_left_id / binary_right_id (lien parent→enfants)
     uniquement pour les nœuds touchés par la passe 1.

Usage:
  python3 fix_binary_parents.py

Prérequis:
  - npx wrangler disponible dans PATH
  - DB: leader-network-production (remote)
"""
import csv, uuid, json, subprocess, sys, time
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
NAMESPACE_DNS = uuid.NAMESPACE_DNS
BASE          = 'willbeleader.com:'
DB_NAME       = 'leader-network-production'
CHUNK_SIZE    = 100   # statements/requête wrangler
CSV_PATH      = Path('/home/user/uploaded_files/u (1) (3).csv')
WEBAPP_DIR    = Path('/home/user/webapp')

def make_uuid(username: str) -> str:
    return str(uuid.uuid5(NAMESPACE_DNS, BASE + username))

def sql_str(v):
    if v is None:
        return 'NULL'
    return "'" + str(v).replace("'", "''") + "'"

# ── Wrangler D1 ───────────────────────────────────────────────────────────────
def d1_exec(sql_statements: list[str], label='') -> bool:
    """Exécute une liste de statements SQL via wrangler d1 --remote --command."""
    batch = '; '.join(sql_statements)
    cmd = [
        'npx', 'wrangler', 'd1', 'execute', DB_NAME,
        '--remote', '--json',
        '--command', batch
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(WEBAPP_DIR), timeout=120)
    if result.returncode != 0:
        print(f"  ❌ Erreur wrangler {label}: {result.stderr[-300:]}")
        return False
    try:
        data = json.loads(result.stdout)
        ok = all(r.get('success', False) for r in data)
        if not ok:
            print(f"  ❌ Statement échoué {label}: {result.stdout[-300:]}")
        return ok
    except Exception as e:
        print(f"  ❌ Parse JSON {label}: {e}")
        return False

def d1_query(sql: str) -> list[dict]:
    """Exécute une requête SELECT et retourne les résultats."""
    cmd = [
        'npx', 'wrangler', 'd1', 'execute', DB_NAME,
        '--remote', '--json',
        '--command', sql
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(WEBAPP_DIR), timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"wrangler error: {result.stderr}")
    data = json.loads(result.stdout)
    return data[0]['results']

# ── 1. Charger CSV source ─────────────────────────────────────────────────────
print("📂 Chargement CSV source...")
csv_data = {}
with open(CSV_PATH, 'r') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        username    = row['unique_id'].strip('"').strip()
        bp_username = row['binary_parent_username'].strip('"').strip()
        bp_pos      = row['binary_position'].strip('"').strip()
        csv_data[username] = {
            'parent_username': bp_username if bp_username not in ('NULL', '') else None,
            'position': bp_pos if bp_pos else None
        }
print(f"  {len(csv_data)} membres dans CSV")

# ── 2. Charger tous les membres de la DB ─────────────────────────────────────
print("\n📡 Chargement membres DB (pagination 500)...")
db_members = []
page_size = 500
offset = 0
while True:
    rows = d1_query(
        f"SELECT id, unique_id, binary_parent_id, binary_position, "
        f"binary_left_id, binary_right_id "
        f"FROM members ORDER BY created_at LIMIT {page_size} OFFSET {offset};"
    )
    db_members.extend(rows)
    print(f"  Page offset={offset}: {len(rows)} rows (total: {len(db_members)})")
    if len(rows) < page_size:
        break
    offset += page_size

db_by_id       = {m['id']: m for m in db_members}
db_by_username = {m['unique_id']: m for m in db_members}
print(f"  Total: {len(db_members)} membres en DB")

# ── 3. Calculer les corrections binary_parent_id + binary_position ────────────
print("\n🔍 Calcul des corrections binary_parent_id + binary_position...")

updates_parent = []   # (member_id, new_parent_id, new_position, username)

for username, data in csv_data.items():
    db_member = db_by_username.get(username)
    if not db_member:
        continue  # pas en DB, skip

    member_id  = db_member['id']
    db_parent  = db_member.get('binary_parent_id')
    db_pos     = db_member.get('binary_position')

    # Calculer parent attendu
    par_un = data['parent_username']
    exp_pos = data['position']

    if par_un:
        # Le parent doit exister en DB
        par_db = db_by_username.get(par_un)
        if not par_db:
            # Essayer via UUID5
            par_uuid = make_uuid(par_un)
            par_db = db_by_id.get(par_uuid)
        exp_parent_id = par_db['id'] if par_db else None
    else:
        exp_parent_id = None

    # Vérifier si correction nécessaire
    parent_needs_fix = (db_parent or '') != (exp_parent_id or '')
    pos_needs_fix    = exp_pos and db_pos != exp_pos

    if parent_needs_fix or pos_needs_fix:
        if exp_parent_id is None and par_un:
            print(f"  ⚠️  Parent '{par_un}' introuvable en DB pour '{username}' — skip")
            continue
        updates_parent.append({
            'member_id':    member_id,
            'new_parent_id': exp_parent_id,
            'new_position':  exp_pos,
            'username':      username,
            'old_parent_id': db_parent,
            'par_username':  par_un or 'NULL'
        })

print(f"  {len(updates_parent)} corrections binary_parent_id/position nécessaires")

# Afficher les corrections prévues
for u in updates_parent[:10]:
    old_par = db_by_id.get(u['old_parent_id'] or '', {}).get('unique_id', 'NULL')
    print(f"    {u['username']:25s}: {old_par:25s} → {u['par_username']}, pos={u['new_position']}")
if len(updates_parent) > 10:
    print(f"    ... et {len(updates_parent)-10} autres")

# ── 4. Appliquer les corrections binary_parent_id + binary_position ───────────
if not updates_parent:
    print("\n✅ Aucune correction binary_parent_id nécessaire.")
else:
    print(f"\n🚀 Application des {len(updates_parent)} corrections binary_parent_id...")
    
    sqls = []
    for u in updates_parent:
        pid   = sql_str(u['new_parent_id'])
        pos   = sql_str(u['new_position'])
        mid   = u['member_id']
        sqls.append(
            f"UPDATE members SET binary_parent_id={pid}, binary_position={pos}, "
            f"updated_at=updated_at WHERE id='{mid}';"
        )
    
    ok_count = 0
    err_count = 0
    
    for i in range(0, len(sqls), CHUNK_SIZE):
        chunk = sqls[i:i+CHUNK_SIZE]
        chunk_num = i // CHUNK_SIZE + 1
        total_chunks = (len(sqls) + CHUNK_SIZE - 1) // CHUNK_SIZE
        
        ok = d1_exec(chunk, label=f"parent_fix chunk {chunk_num}/{total_chunks}")
        if ok:
            ok_count += len(chunk)
            print(f"  ✅ Chunk {chunk_num}/{total_chunks}: {len(chunk)} OK")
        else:
            # Retry statement par statement
            print(f"  ⚠️  Retry stmt-par-stmt chunk {chunk_num}...")
            for stmt in chunk:
                ok2 = d1_exec([stmt], label=f"retry")
                if ok2:
                    ok_count += 1
                else:
                    err_count += 1
                    print(f"    ❌ Échec: {stmt[:80]}...")
        time.sleep(0.1)
    
    print(f"\n  UPDATE OK: {ok_count}, Erreurs: {err_count}")

# ── 5. Recharger la DB pour rebuild binary_left/right ─────────────────────────
print("\n📡 Rechargement DB après corrections...")
db_members = []
offset = 0
while True:
    rows = d1_query(
        f"SELECT id, unique_id, binary_parent_id, binary_position, "
        f"binary_left_id, binary_right_id "
        f"FROM members ORDER BY created_at LIMIT {page_size} OFFSET {offset};"
    )
    db_members.extend(rows)
    if len(rows) < page_size:
        break
    offset += page_size

db_by_id       = {m['id']: m for m in db_members}
db_by_username = {m['unique_id']: m for m in db_members}
print(f"  {len(db_members)} membres rechargés")

# ── 6. Rebuild COMPLET binary_left_id / binary_right_id ──────────────────────
print("\n🌳 Rebuild COMPLET binary_left_id / binary_right_id...")

# Calculer les liens parent→enfants depuis binary_parent_id + binary_position
children_map = {}  # parent_id → {'L': child_id, 'R': child_id}

for m in db_members:
    parent_id = m.get('binary_parent_id')
    position  = m.get('binary_position')  # 'L' ou 'R'
    child_id  = m['id']

    if not parent_id or not position:
        continue

    if parent_id not in children_map:
        children_map[parent_id] = {'L': None, 'R': None}

    pos_key = 'L' if position == 'L' else 'R'
    if children_map[parent_id][pos_key] is not None:
        # Conflit : deux enfants en même position
        existing = db_by_id.get(children_map[parent_id][pos_key], {}).get('unique_id', '?')
        current  = m.get('unique_id', '?')
        print(f"  ⚠️  Conflit position {pos_key} pour parent {db_by_id.get(parent_id,{}).get('unique_id','?')}: {existing} vs {current}")
    else:
        children_map[parent_id][pos_key] = child_id

# Générer les UPDATE uniquement si valeur actuelle differ
rebuild_sqls = []
for parent_id, children in children_map.items():
    parent = db_by_id.get(parent_id)
    if not parent:
        continue

    new_left  = children['L']
    new_right = children['R']
    cur_left  = parent.get('binary_left_id')
    cur_right = parent.get('binary_right_id')

    parts = []
    if new_left != cur_left:
        parts.append(f"binary_left_id={sql_str(new_left)}")
    if new_right != cur_right:
        parts.append(f"binary_right_id={sql_str(new_right)}")

    if parts:
        sql = f"UPDATE members SET {', '.join(parts)}, updated_at=updated_at WHERE id='{parent_id}';"
        rebuild_sqls.append(sql)

# Aussi remettre à NULL les parents qui n'ont plus d'enfants
for m in db_members:
    mid = m['id']
    if mid not in children_map:
        # Ce membre n'a aucun enfant → s'assurer que left/right = NULL
        cur_left  = m.get('binary_left_id')
        cur_right = m.get('binary_right_id')
        if cur_left or cur_right:
            rebuild_sqls.append(
                f"UPDATE members SET binary_left_id=NULL, binary_right_id=NULL, "
                f"updated_at=updated_at WHERE id='{mid}';"
            )

print(f"  {len(rebuild_sqls)} UPDATE binary_left/right_id à appliquer")

if rebuild_sqls:
    REBUILD_CHUNK = 150
    ok_count = 0
    err_count = 0

    for i in range(0, len(rebuild_sqls), REBUILD_CHUNK):
        chunk = rebuild_sqls[i:i+REBUILD_CHUNK]
        chunk_num = i // REBUILD_CHUNK + 1
        total_chunks = (len(rebuild_sqls) + REBUILD_CHUNK - 1) // REBUILD_CHUNK

        ok = d1_exec(chunk, label=f"rebuild chunk {chunk_num}/{total_chunks}")
        if ok:
            ok_count += len(chunk)
            print(f"  ✅ Chunk {chunk_num}/{total_chunks}: {len(chunk)} OK")
        else:
            for stmt in chunk:
                ok2 = d1_exec([stmt])
                if ok2:
                    ok_count += 1
                else:
                    err_count += 1
        time.sleep(0.05)

    print(f"\n  Rebuild OK: {ok_count}, Erreurs: {err_count}")

# ── 7. Vérification spot-check ────────────────────────────────────────────────
print("\n🔎 Vérification spot-check...")
spot_check = [
    'LEADER', 'FOUNDER100', 'leaderuser4', 'leaderuser5',
    'sorjenking', 'leaderuser6', 'neljack974', 'leaderuser7',
    'alphonsine1927', 'pandore111'
]
for un in spot_check:
    rows = d1_query(
        f"SELECT unique_id, binary_parent_id, binary_position, binary_left_id, binary_right_id "
        f"FROM members WHERE unique_id='{un}' LIMIT 1;"
    )
    if not rows:
        print(f"  {un:20s}: ABSENT de DB")
        continue
    r = rows[0]
    par_name = db_by_id.get(r.get('binary_parent_id') or '', {}).get('unique_id', 'NULL')
    left_name  = db_by_id.get(r.get('binary_left_id') or '', {}).get('unique_id', 'NULL')
    right_name = db_by_id.get(r.get('binary_right_id') or '', {}).get('unique_id', 'NULL')
    print(f"  {un:20s}: parent={par_name:15s}, pos={r.get('binary_position','?'):2s}, left={left_name:15s}, right={right_name}")

print("\n✅ Script terminé !")
