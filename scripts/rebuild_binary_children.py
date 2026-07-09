#!/usr/bin/env python3
"""
rebuild_binary_children.py
Lit tous les membres depuis D1 remote, calcule les binary_left_id / binary_right_id
manquants à partir de binary_parent_id + binary_position, génère les UPDATE SQL,
et les applique par chunks.
"""
import subprocess, json, sys, time, os

DB_NAME   = 'leader-network-production'
WEBAPP    = '/home/user/webapp'
CHUNK_SIZE = 200
DRY_RUN   = '--dry-run' in sys.argv

def d1_query(sql):
    cmd = ['npx', 'wrangler', 'd1', 'execute', DB_NAME, '--remote', '--command', sql]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=60, cwd=WEBAPP)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[:400])
    # Parser la sortie wrangler (JSON après les lignes de log)
    out = r.stdout
    # Trouver le début du JSON
    idx = out.find('[')
    if idx == -1:
        return []
    data = json.loads(out[idx:])
    return data[0].get('results', [])

def d1_exec(sql):
    cmd = ['npx', 'wrangler', 'd1', 'execute', DB_NAME, '--remote', '--command', sql]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=120, cwd=WEBAPP)
    return r.returncode == 0, r.stderr + r.stdout

print("=" * 60)
print("Reconstruction binary_left_id / binary_right_id")
print("=" * 60)

# ── 1. Récupérer tous les membres avec leurs colonnes binaires ──
print("\nChargement des membres depuis D1 remote...")
# D1 limite à ~1000 rows par requête — paginer
all_members = []
offset = 0
page_size = 500

while True:
    rows = d1_query(f"""
        SELECT id, unique_id, binary_parent_id, binary_position,
               binary_left_id, binary_right_id
        FROM members
        ORDER BY created_at
        LIMIT {page_size} OFFSET {offset}
    """)
    if not rows:
        break
    all_members.extend(rows)
    print(f"  Chargé {len(all_members)} membres...", end='\r')
    if len(rows) < page_size:
        break
    offset += page_size
    time.sleep(0.2)

print(f"\n  → {len(all_members)} membres chargés")

# ── 2. Construire le mapping id → member ──
by_id = {m['id']: m for m in all_members}

# ── 3. Calculer les left/right children manquants ──
# Pour chaque membre avec binary_parent_id + binary_position :
#   → le parent doit avoir binary_left_id = cet id (si position='L')
#   → ou binary_right_id = cet id (si position='R')

# Construire l'état cible de chaque parent
updates = {}  # parent_id → {'L': child_id, 'R': child_id}

for m in all_members:
    parent_id = m.get('binary_parent_id')
    position  = m.get('binary_position')
    child_id  = m['id']
    
    if not parent_id or not position:
        continue
    if parent_id not in by_id:
        continue  # parent inconnu, skip
    
    if parent_id not in updates:
        updates[parent_id] = {'L': None, 'R': None}
    
    if position == 'L':
        updates[parent_id]['L'] = child_id
    elif position == 'R':
        updates[parent_id]['R'] = child_id

print(f"\n  → {len(updates)} parents à mettre à jour")

# ── 4. Générer uniquement les UPDATE nécessaires ──
# (quand la valeur actuelle diffère de la valeur calculée)
needed_updates = []

for parent_id, children in updates.items():
    parent = by_id.get(parent_id, {})
    current_left  = parent.get('binary_left_id')
    current_right = parent.get('binary_right_id')
    
    new_left  = children['L']
    new_right = children['R']
    
    parts = []
    if new_left != current_left:
        parts.append(f"binary_left_id='{new_left}'" if new_left else "binary_left_id=NULL")
    if new_right != current_right:
        parts.append(f"binary_right_id='{new_right}'" if new_right else "binary_right_id=NULL")
    
    if parts:
        sql = f"UPDATE members SET {', '.join(parts)}, updated_at=updated_at WHERE id='{parent_id}';"
        needed_updates.append(sql)

print(f"  → {len(needed_updates)} UPDATE nécessaires")

if not needed_updates:
    print("\n✅ Rien à mettre à jour — déjà correct !")
    sys.exit(0)

# Aperçu
print("\nAperçu (5 premiers UPDATE) :")
for u in needed_updates[:5]:
    print(f"  {u[:110]}")

if DRY_RUN:
    print("\n[DRY-RUN] — pas d'envoi")
    sys.exit(0)

# ── 5. Appliquer par chunks ──
print(f"\nApplication des UPDATE ({len(needed_updates)} statements, chunks de {CHUNK_SIZE})...")
chunks = [needed_updates[i:i+CHUNK_SIZE] for i in range(0, len(needed_updates), CHUNK_SIZE)]
print(f"  → {len(chunks)} chunks")

ok_total  = 0
err_total = 0

for i, chunk in enumerate(chunks):
    pct = (i+1)/len(chunks)*100
    print(f"  [{pct:5.1f}%] chunk {i+1}/{len(chunks)} ({len(chunk)} stmts)...", end='', flush=True)
    
    sql_block = '\n'.join(chunk)
    ok, msg = d1_exec(sql_block)
    
    if ok:
        ok_total += len(chunk)
        print(" ✓")
    else:
        err_total += len(chunk)
        err_short = msg.replace('\x1b[','').replace('\n',' ')[:150]
        print(f" ✗ {err_short}")
    
    time.sleep(0.15)

print(f"\n{'='*60}")
print(f"✅ Terminé !")
print(f"   UPDATE OK    : {ok_total}")
print(f"   UPDATE erreur: {err_total}")
print(f"{'='*60}")

# Vérification rapide
print("\nVérification spot-check...")
rows = d1_query("""
    SELECT unique_id, binary_left_id, binary_right_id
    FROM members
    WHERE unique_id IN ('leaderuser4','leaderuser5','sorjenking','FOUNDER100','LEADER')
    ORDER BY unique_id
""")
for r in rows:
    print(f"  {r['unique_id']:15} | left={str(r['binary_left_id'])[:36] if r['binary_left_id'] else 'NULL':36} | right={str(r['binary_right_id'])[:36] if r['binary_right_id'] else 'NULL'}")
