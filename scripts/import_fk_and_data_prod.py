#!/usr/bin/env python3
"""
import_fk_and_data_prod.py
==========================
Applique les UPDATEs FK + wallets + licences + bv_logs + wallet_tx + withdrawals
APRÈS que les membres sont insérés.
Stratégie : CHUNK_SIZE=5 (UPDATEs longs), retry sur erreur.
"""

import subprocess, sys, os, json, time, re

DB_NAME    = 'leader-network-production'
SQL_FILE   = '/home/user/webapp/migrations/0094_import_members.sql'
PROGRESS_F = '/home/user/webapp/migrations/.fk_data_import_progress.json'

# Ajuster selon la section : UPDATEs courts = CHUNK=10, BV logs = CHUNK=5
CHUNK_SIZES = {
    'member_fk': 5,
    'wallets':   5,
    'licenses':  5,
    'bv_updates':5,
    'bv_logs':   5,   # 99k stmts — sera long mais robuste
    'wallet_tx': 5,
    'withdrawals':5,
}

# ─── Helpers ──────────────────────────────────────────────────────────────────
def load_progress():
    if os.path.exists(PROGRESS_F):
        with open(PROGRESS_F) as f:
            return json.load(f)
    return {'done_sections': [], 'section_progress': {}, 'errors': []}

def save_progress(p):
    with open(PROGRESS_F, 'w') as f:
        json.dump(p, f, indent=2)

def run_cmd(sql: str) -> tuple[bool, str]:
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

def classify(stmt: str) -> str:
    s = stmt.upper().lstrip()
    if s.startswith('INSERT OR IGNORE INTO MEMBERS'):        return 'members'  # skip
    if s.startswith('INSERT OR IGNORE INTO WALLETS'):        return 'wallets'
    if s.startswith('INSERT OR IGNORE INTO FINSTRATEGIA'):   return 'licenses'
    if s.startswith('INSERT OR IGNORE INTO BV_LOGS'):        return 'bv_logs'
    if s.startswith('INSERT OR IGNORE INTO WALLET_TRANSACTIONS'): return 'wallet_tx'
    if s.startswith('INSERT OR IGNORE INTO WITHDRAWALS'):    return 'withdrawals'
    if s.startswith('UPDATE MEMBERS SET BINARY_RIGHT_ID') or \
       s.startswith('UPDATE MEMBERS SET BINARY_LEFT_ID') or \
       s.startswith('UPDATE MEMBERS SET LEFT_BV') or \
       s.startswith('UPDATE MEMBERS SET SPONSOR_ID') or \
       s.startswith('UPDATE MEMBERS SET BINARY_PARENT') or \
       s.startswith('UPDATE MEMBERS'):                        return 'bv_updates'
    if s.startswith('UPDATE MEMBERS SET SPONSOR_ID') or \
       s.startswith('UPDATE MEMBERS SET BINARY_PARENT'):      return 'member_fk'
    return 'other'

# ─── Parser ───────────────────────────────────────────────────────────────────
print("=" * 65)
print("Import FK + Data → Production D1 (--command)")
print("=" * 65)

print(f"Lecture {SQL_FILE} …")
with open(SQL_FILE, encoding='utf-8') as f:
    content = f.read()

# Classifier tous les statements (sauf PRAGMA et comments)
sections = {k: [] for k in ['member_fk','wallets','licenses','bv_updates',
                              'bv_logs','wallet_tx','withdrawals']}

for line in content.splitlines():
    s = line.strip()
    if not s or s.startswith('--') or s.upper().startswith('PRAGMA'):
        continue
    if not s.endswith(';'):
        continue
    cat = classify(s)
    if cat in sections:
        sections[cat].append(s)

# Pour member_fk : séparer UPDATE sponsor_id et UPDATE binary_parent
# depuis bv_updates (le classifieur les met tous dans bv_updates)
member_fk_stmts = []
bv_stmts = []
for s in sections['bv_updates']:
    su = s.upper()
    if 'SET SPONSOR_ID' in su or 'SET BINARY_PARENT_ID' in su:
        member_fk_stmts.append(s)
    else:
        bv_stmts.append(s)
sections['member_fk'] = member_fk_stmts
sections['bv_updates'] = bv_stmts

print("\nDistribution :")
for k, v in sections.items():
    print(f"  {k:20} : {len(v):6} stmts")
print()

ORDER = ['member_fk', 'wallets', 'licenses', 'bv_updates',
         'bv_logs', 'wallet_tx', 'withdrawals']

# ─── Progression ──────────────────────────────────────────────────────────────
progress = load_progress()
done_sections = set(progress.get('done_sections', []))
section_prog  = progress.get('section_progress', {})
all_errors    = progress.get('errors', [])

if done_sections:
    print(f"⚡ Reprise — sections déjà traitées : {sorted(done_sections)}")

# ─── Exécution ────────────────────────────────────────────────────────────────
for section in ORDER:
    stmts = sections.get(section, [])
    if not stmts:
        print(f"  ⏭  {section:20} — vide")
        continue

    if section in done_sections:
        print(f"  ⏭  {section:20} — déjà traité ({len(stmts)} stmts)")
        continue

    chunk_size = CHUNK_SIZES.get(section, 5)
    chunks = [stmts[i:i+chunk_size] for i in range(0, len(stmts), chunk_size)]
    start_chunk = section_prog.get(section, 0)
    total_ok = 0
    section_errors = 0

    print(f"\n  [{section.upper()}] — {len(stmts)} stmts → {len(chunks)} chunks")

    for i in range(start_chunk, len(chunks)):
        chunk = chunks[i]
        pct = (i + 1) / len(chunks) * 100
        print(f"  [{pct:5.1f}%] {section}  chunk {i+1:4d}/{len(chunks)} ({len(chunk)}) … ",
              end='', flush=True)

        sql_block = '\n'.join(chunk)
        ok, msg = run_cmd(sql_block)

        if ok:
            total_ok += len(chunk)
            print(f"✓")
        else:
            # Retry 1 par 1
            chunk_ok = 0
            print(f"⚠ retry …")
            for stmt in chunk:
                ok2, msg2 = run_cmd(stmt)
                if ok2:
                    total_ok += 1
                    chunk_ok += 1
                else:
                    if 'FOREIGN KEY' not in msg2:
                        all_errors.append({'section': section, 'error': msg2[:200]})
                        section_errors += 1
            print(f"    → {chunk_ok}/{len(chunk)} OK")

        # Sauvegarder toutes les 20 chunks
        if i % 20 == 0:
            section_prog[section] = i + 1
            progress['section_progress'] = section_prog
            progress['errors'] = all_errors
            save_progress(progress)

    # Section terminée
    done_sections.add(section)
    progress['done_sections'] = sorted(done_sections)
    section_prog[section] = len(chunks)
    progress['section_progress'] = section_prog
    progress['errors'] = all_errors
    save_progress(progress)

    status = "✅" if section_errors == 0 else f"⚠️  ({section_errors} erreurs)"
    print(f"     {status} {section} — {total_ok} stmts OK")

print()
print("=" * 65)
print("✅ Import FK + Data terminé")
print("=" * 65)
