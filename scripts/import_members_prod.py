#!/usr/bin/env python3
"""
import_members_prod.py
======================
Import les 1,723 membres dans D1 prod via --command (pas --file).
Stratégie : CHUNK_SIZE=10, retry stmt-par-stmt en cas d'erreur.
"""

import subprocess, sys, os, json, time, re

DB_NAME    = 'leader-network-production'
SQL_FILE   = '/home/user/webapp/migrations/0094_import_members.sql'
PROGRESS_F = '/home/user/webapp/migrations/.members_import_progress.json'
CHUNK_SIZE = 10   # INSERTs par appel wrangler --command

# ─── Helpers ──────────────────────────────────────────────────────────────────
def load_progress():
    if os.path.exists(PROGRESS_F):
        with open(PROGRESS_F) as f:
            return json.load(f)
    return {'done_chunks': [], 'errors': [], 'total_ok': 0}

def save_progress(p):
    with open(PROGRESS_F, 'w') as f:
        json.dump(p, f, indent=2)

def run_cmd(sql: str) -> tuple[bool, str]:
    """Exécute via --command. Retourne (ok, message)."""
    cmd = ['npx', 'wrangler', 'd1', 'execute', DB_NAME, '--command', sql]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=60,
                           cwd='/home/user/webapp')
        if r.returncode == 0:
            return True, r.stdout
        return False, (r.stderr + r.stdout)[:400]
    except subprocess.TimeoutExpired:
        return False, 'TIMEOUT'
    except Exception as e:
        return False, str(e)[:200]

# ─── Parser les INSERTs membres depuis 0094 ───────────────────────────────────
print("=" * 65)
print("Import membres → Production D1 (--command, CHUNK_SIZE=10)")
print("=" * 65)

print(f"Lecture {SQL_FILE} …")
with open(SQL_FILE, encoding='utf-8') as f:
    content = f.read()

# Extraire uniquement les INSERT INTO members
member_inserts = []
for line in content.splitlines():
    s = line.strip()
    if s.upper().startswith('INSERT OR IGNORE INTO MEMBERS') and s.endswith(';'):
        member_inserts.append(s)

print(f"  → {len(member_inserts)} INSERT membres trouvés")

# Chunker
chunks = [member_inserts[i:i+CHUNK_SIZE]
          for i in range(0, len(member_inserts), CHUNK_SIZE)]
print(f"  → {len(chunks)} chunks de {CHUNK_SIZE}")
print()

# ─── Charger progression ──────────────────────────────────────────────────────
progress = load_progress()
done = set(progress.get('done_chunks', []))
total_ok = progress.get('total_ok', 0)

if done:
    print(f"⚡ Reprise — {len(done)} chunks déjà traités ({total_ok} membres insérés)")
    print(f"   Supprimer {PROGRESS_F} pour recommencer\n")

# ─── Exécution ────────────────────────────────────────────────────────────────
errors = []
start_time = time.time()

for i, chunk in enumerate(chunks):
    if i in done:
        continue

    sql_block = '\n'.join(chunk)
    pct = (i + 1) / len(chunks) * 100
    print(f"  [{pct:5.1f}%] chunk {i+1:3d}/{len(chunks)} ({len(chunk)} stmts) … ",
          end='', flush=True)

    ok, msg = run_cmd(sql_block)

    if ok:
        total_ok += len(chunk)
        done.add(i)
        print(f"✓  (total: {total_ok})")
    else:
        # Retry 1 par 1
        print(f"⚠ FK retry …")
        chunk_ok = 0
        for j, stmt in enumerate(chunk):
            ok2, msg2 = run_cmd(stmt)
            if ok2:
                total_ok += 1
                chunk_ok += 1
            else:
                # Vérifier si c'est juste un IGNORE (doublon)
                if 'FOREIGN KEY' not in msg2 and 'UNIQUE' not in msg2.upper():
                    errors.append({'chunk': i, 'stmt': j, 'error': msg2[:200]})
                    print(f"    ✗ stmt {j}: {msg2[:100]}")
        done.add(i)
        print(f"    → {chunk_ok}/{len(chunk)} OK")

    # Sauvegarder progression toutes les 10 chunks
    if i % 10 == 0:
        progress['done_chunks'] = sorted(done)
        progress['errors'] = errors
        progress['total_ok'] = total_ok
        save_progress(progress)

# Sauvegarde finale
progress['done_chunks'] = sorted(done)
progress['errors'] = errors
progress['total_ok'] = total_ok
save_progress(progress)

elapsed = time.time() - start_time
print()
print("=" * 65)
print(f"✅ Import membres terminé : {total_ok} insérés / {len(member_inserts)} total")
print(f"   Durée: {elapsed:.0f}s | Erreurs: {len(errors)}")
print("=" * 65)
