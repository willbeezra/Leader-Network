#!/usr/bin/env python3
"""
apply_0094_remote.py — Applique migration/0094 en production D1.
STRATÉGIE : envoyer par TYPE (tous les membres d'abord, puis wallets, etc.)
pour respecter les FK constraints sans PRAGMA foreign_keys = OFF.
Chunks de 80 statements max. Reprise automatique sur interruption.
"""

import subprocess
import sys
import os
import time
import json
import re

SQL_FILE   = '/home/user/webapp/migrations/0094_import_members.sql'
DB_NAME    = 'leader-network-production'
PROGRESS   = '/home/user/webapp/migrations/.0094_progress.json'
CHUNK_SIZE = 150
DRY_RUN    = '--dry-run' in sys.argv

def load_progress():
    if os.path.exists(PROGRESS):
        with open(PROGRESS, 'r') as f:
            return json.load(f)
    return {'done_sections': [], 'last_section': '', 'last_chunk_in_section': -1, 'errors': []}

def save_progress(p):
    with open(PROGRESS, 'w') as f:
        json.dump(p, f, indent=2)

def parse_stmts(sql_text):
    """Découpe le SQL en statements, filtre PRAGMA."""
    stmts = []
    current = []
    for line in sql_text.splitlines():
        stripped = line.strip()
        if stripped.startswith('--') or stripped == '':
            continue
        current.append(line.rstrip())
        if stripped.endswith(';'):
            stmt = '\n'.join(current).strip()
            # Exclure les PRAGMA (D1 remote les ignore de toute façon)
            if stmt and 'PRAGMA' not in stmt.upper():
                stmts.append(stmt)
            current = []
    return stmts

def classify_stmt(stmt):
    """Retourne la section à laquelle appartient ce statement."""
    s = stmt.upper().lstrip()
    if s.startswith('INSERT OR IGNORE INTO MEMBERS'):       return 'members'
    if s.startswith('INSERT OR IGNORE INTO WALLETS'):       return 'wallets'
    if s.startswith('INSERT OR IGNORE INTO FINSTRATEGIA'): return 'licenses'
    if s.startswith('INSERT OR IGNORE INTO BV_LOGS'):       return 'bv_logs'
    if s.startswith('INSERT OR IGNORE INTO WALLET_TRANSACTIONS'): return 'wallet_tx'
    if s.startswith('INSERT OR IGNORE INTO WITHDRAWALS'):   return 'withdrawals'
    if s.startswith('INSERT OR IGNORE INTO D1_MIGRATIONS'): return 'meta'
    if s.startswith('UPDATE MEMBERS SET BINARY_RIGHT_ID') or s.startswith('UPDATE MEMBERS SET BINARY_LEFT_ID'): return 'bv_updates'
    if s.startswith('UPDATE MEMBERS SET LEFT_BV') or s.startswith('UPDATE MEMBERS SET LEFT_BV'): return 'bv_updates'
    if s.startswith('UPDATE MEMBERS SET SPONSOR_ID') or s.startswith('UPDATE MEMBERS SET BINARY_PARENT'): return 'member_fk'
    if s.startswith('UPDATE MEMBERS'):                      return 'bv_updates'
    return 'other'

def run_chunk(stmts, label):
    """Exécute un chunk de statements via wrangler d1 execute --file (évite Argument list too long)."""
    sql_block = '\n'.join(stmts)

    if DRY_RUN:
        return True, f'DRY-RUN OK ({len(stmts)} stmts)'

    # Écrire dans un fichier temporaire pour éviter "Argument list too long"
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False, encoding='utf-8') as tmp:
        tmp.write(sql_block)
        tmp_path = tmp.name

    try:
        cmd = [
            'npx', 'wrangler', 'd1', 'execute', DB_NAME,
            '--remote',
            '--file', tmp_path
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            cwd='/home/user/webapp'
        )

        if result.returncode == 0:
            return True, result.stdout
        else:
            err = (result.stderr + result.stdout)
            return False, err
    except subprocess.TimeoutExpired:
        return False, 'TIMEOUT après 120s'
    except Exception as e:
        return False, str(e)
    finally:
        import os
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

# Ordre d'insertion pour respecter les FK
SECTION_ORDER = [
    'members',      # INSERT sans FK cross-membres
    'member_fk',    # UPDATE sponsor_id + binary_parent_id réels
    'wallets',      # référence members
    'licenses',     # référence members
    'bv_logs',      # référence members
    'bv_updates',   # UPDATE BV totaux + FOUNDER100
    'wallet_tx',    # référence members
    'withdrawals',  # référence members
    'other',
    'meta',
]

def main():
    print("=" * 65)
    print("Migration 0094 → Production D1 (remote)")
    print("Stratégie : envoi par TYPE pour respecter les FK")
    print("=" * 65)

    if DRY_RUN:
        print("MODE DRY-RUN activé\n")

    # Lire et parser
    print(f"Lecture {SQL_FILE} …")
    with open(SQL_FILE, 'r', encoding='utf-8') as f:
        sql_text = f.read()

    print("Parsing et classification des statements …")
    all_stmts = parse_stmts(sql_text)
    print(f"  → {len(all_stmts)} statements (PRAGMA exclus)")

    # Classifier par section
    sections = {k: [] for k in SECTION_ORDER}
    for stmt in all_stmts:
        sec = classify_stmt(stmt)
        if sec not in sections:
            sections[sec] = []
        sections[sec].append(stmt)

    print("\nDistribution par section :")
    total = 0
    for sec in SECTION_ORDER:
        n = len(sections.get(sec, []))
        total += n
        chunks_n = (n + CHUNK_SIZE - 1) // CHUNK_SIZE
        print(f"  {sec:25} : {n:6} stmts → {chunks_n} chunks")
    print(f"  {'TOTAL':25} : {total:6} stmts")

    total_chunks = sum((len(sections.get(s,[])) + CHUNK_SIZE - 1) // CHUNK_SIZE
                       for s in SECTION_ORDER)
    print(f"\n  Total chunks à envoyer : {total_chunks}")

    # Charger progression
    progress = load_progress()
    done_sections = set(progress.get('done_sections', []))
    current_section = progress.get('last_section', '')
    last_chunk_in_section = progress.get('last_chunk_in_section', -1)

    if done_sections:
        print(f"\n⚡ Reprise — sections déjà traitées : {sorted(done_sections)}")
        if current_section:
            print(f"   Section en cours : {current_section}, dernier chunk : {last_chunk_in_section}")
        print(f"   (supprimer {PROGRESS} pour recommencer depuis le début)")

    print()

    errors = progress.get('errors', [])
    total_ok = 0
    total_err = 0
    chunk_global = 0

    for section in SECTION_ORDER:
        stmts = sections.get(section, [])
        if not stmts:
            continue

        # Section déjà complète ?
        if section in done_sections:
            n = len(stmts)
            total_ok += n
            chunk_global += (n + CHUNK_SIZE - 1) // CHUNK_SIZE
            print(f"  ⏭  {section:25} — déjà traité ({n} stmts)")
            continue

        # Découper en chunks
        chunks = [stmts[i:i+CHUNK_SIZE] for i in range(0, len(stmts), CHUNK_SIZE)]
        start_chunk = 0

        # Reprendre dans la section en cours ?
        if section == current_section and last_chunk_in_section >= 0:
            start_chunk = last_chunk_in_section + 1
            # Compter les déjà traités
            for i in range(start_chunk):
                total_ok += len(chunks[i])
            chunk_global += start_chunk
            print(f"\n  ↩  Reprise {section} depuis chunk {start_chunk+1}/{len(chunks)}")

        section_errors = 0
        print(f"\n  [{section.upper()}] — {len(stmts)} stmts → {len(chunks)} chunks")

        for i in range(start_chunk, len(chunks)):
            chunk = chunks[i]
            pct = (chunk_global + 1) / total_chunks * 100
            print(f"  [{pct:5.1f}%] {section}  chunk {i+1}/{len(chunks)} ({len(chunk)} stmts) …",
                  end='', flush=True)

            ok, msg = run_chunk(chunk, f"{section}[{i}]")

            if ok:
                total_ok += len(chunk)
                chunk_global += 1
                progress['last_section'] = section
                progress['last_chunk_in_section'] = i
                save_progress(progress)
                print(f" ✓")
            else:
                err_short = re.sub(r'\x1b\[[0-9;]*m', '', msg)[:300]
                chunk_global += 1

                # Si FK error sur members/wallets : essayer statement par statement
                if 'FOREIGN KEY' in msg and section in ('members', 'wallets', 'licenses', 'bv_logs', 'wallet_tx', 'withdrawals'):
                    print(f" ⚠ FK — retry 1 par 1 …")
                    chunk_ok = 0
                    chunk_err = 0
                    for j, single_stmt in enumerate(chunk):
                        ok2, msg2 = run_chunk([single_stmt], f"{section}[{i}][{j}]")
                        if ok2:
                            chunk_ok += 1
                        else:
                            chunk_err += 1
                            err2 = re.sub(r'\x1b\[[0-9;]*m', '', msg2)[:150]
                            # Ignorer les FK silencieusement (membre sans parent = skip)
                            if 'FOREIGN KEY' in msg2:
                                pass  # skip silencieux
                            else:
                                errors.append({'section': section, 'chunk': i, 'stmt': j, 'error': err2})
                        time.sleep(0.1 if not DRY_RUN else 0)
                    total_ok  += chunk_ok
                    total_err += chunk_err
                    print(f"       → {chunk_ok} OK, {chunk_err} ignorés (FK)")
                    progress['last_section'] = section
                    progress['last_chunk_in_section'] = i
                    save_progress(progress)

                elif 'no such table' in msg.lower():
                    print(f"\n  ⛔ Erreur critique (table manquante) dans {section} chunk {i+1}")
                    print(f"     {err_short[:200]}")
                    errors.append({'section': section, 'chunk': i, 'error': err_short})
                    progress['errors'] = errors
                    save_progress(progress)
                    sys.exit(1)

                else:
                    total_err += len(chunk)
                    section_errors += 1
                    print(f" ✗  {err_short[:120]}")
                    errors.append({'section': section, 'chunk': i, 'error': err_short[:300]})
                    progress['errors'] = errors

            time.sleep(0.1 if not DRY_RUN else 0)

        # Section terminée
        progress['done_sections'] = list(done_sections | {section})
        progress['last_section'] = section
        progress['last_chunk_in_section'] = len(chunks) - 1
        done_sections.add(section)
        save_progress(progress)

        if section_errors == 0:
            print(f"     ✅ {section} — terminé ({len(stmts)} statements)")
        else:
            print(f"     ⚠️  {section} — {section_errors} chunks en erreur")

    # Résumé
    print()
    print("=" * 65)
    if total_err == 0:
        print(f"✅ Migration 0094 terminée avec succès !")
    else:
        print(f"⚠️  Migration terminée avec {total_err} statements en erreur")
    print(f"   Statements OK    : {total_ok}")
    print(f"   Statements erreur: {total_err}")

    if errors:
        print(f"\nErreurs ({len(errors)}) :")
        for e in errors[:5]:
            print(f"  {e.get('section','?')} chunk {e.get('chunk','?')}: {e.get('error','')[:100]}")

    if total_err == 0 and os.path.exists(PROGRESS):
        os.remove(PROGRESS)
        print(f"\n🧹 Progression supprimée")

    print("=" * 65)

if __name__ == '__main__':
    main()
