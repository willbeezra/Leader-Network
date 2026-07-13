#!/usr/bin/env python3
"""
Génère les bv_logs depuis le Master sheet (2).xlsx
- bv_type='personal_purchase' pour chaque membre ayant acheté un package avec BV > 0
- bv_type='propagated' pour chaque ancêtre dans l'arbre binaire qui a une licence active
- Période = YYYY-MM basée sur plan_purchase_date
"""

import sqlite3
import openpyxl
import uuid
import json
from datetime import datetime

DB_PATH = "/home/user/webapp/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/50b2b2a431a1233500e1085db1aebe736ed5e396a5291d31dafc2c2a25c4393f.sqlite"
EXCEL_PATH = "/home/user/uploaded_files/Master sheet (2).xlsx"
OUTPUT_SQL = "/home/user/webapp/scripts/bv_logs_import.sql"

def load_members(conn):
    """Charge tous les membres en mémoire : {unique_id_lower -> {id, binary_parent_id, binary_position, license_active}}"""
    cur = conn.cursor()
    cur.execute("SELECT id, unique_id, binary_parent_id, binary_position, license_active FROM members")
    rows = cur.fetchall()
    by_uid = {}
    by_id = {}
    for (mid, uid, parent_id, pos, lic) in rows:
        key = uid.strip().lower() if uid else None
        if key:
            by_uid[key] = {
                "id": mid,
                "unique_id": uid,
                "binary_parent_id": parent_id,
                "binary_position": pos,
                "license_active": lic
            }
        by_id[mid] = {
            "id": mid,
            "unique_id": uid,
            "binary_parent_id": parent_id,
            "binary_position": pos,
            "license_active": lic
        }
    print(f"  Membres chargés: {len(by_uid)} uniques, {len(by_id)} total")
    return by_uid, by_id

def get_ancestors(member_id, by_id, max_levels=50):
    """Remonte l'arbre binaire et retourne la liste des ancêtres avec leur position"""
    ancestors = []
    current_id = member_id
    visited = set()
    levels = 0
    while levels < max_levels:
        m = by_id.get(current_id)
        if not m:
            break
        parent_id = m.get("binary_parent_id")
        if not parent_id or parent_id in visited:
            break
        visited.add(current_id)
        parent = by_id.get(parent_id)
        if not parent:
            break
        ancestors.append({
            "id": parent_id,
            "position": m.get("binary_position"),  # position de l'enfant (L ou R) dans le parent
            "license_active": parent.get("license_active", 0),
            "unique_id": parent.get("unique_id", "")
        })
        current_id = parent_id
        levels += 1
    return ancestors

def load_excel_data():
    """Charge le Master sheet et retourne la liste des achats avec BV > 0"""
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
    ws = wb.active
    purchases = []
    skipped_null = 0
    skipped_no_bv = 0
    for row in ws.iter_rows(min_row=2, values_only=True):
        username, firstname, lastname, status, pkg, date, amount, bv = row
        # Ignorer les lignes sans package ou sans BV
        if pkg == 'NULL' or pkg is None:
            skipped_null += 1
            continue
        if bv is None or not isinstance(bv, (int, float)) or bv <= 0:
            skipped_no_bv += 1
            continue
        # Normaliser username
        if isinstance(username, int):
            username = str(username)
        elif isinstance(username, str):
            username = username.strip().lower()
        else:
            continue
        # Normaliser date → période YYYY-MM
        if isinstance(date, datetime):
            period = date.strftime("%Y-%m")
            created_at = date.strftime("%Y-%m-%d %H:%M:%S")
        elif isinstance(date, str) and date != 'NULL':
            try:
                d = datetime.strptime(date[:10], "%Y-%m-%d")
                period = d.strftime("%Y-%m")
                created_at = d.strftime("%Y-%m-%d %H:%M:%S")
            except:
                period = "2023-08"
                created_at = "2023-08-01 00:00:00"
        else:
            period = "2023-08"
            created_at = "2023-08-01 00:00:00"
        purchases.append({
            "username": username,
            "firstname": firstname,
            "lastname": lastname,
            "status": status,
            "package_name": pkg,
            "bv": float(bv),
            "amount": float(amount) if isinstance(amount, (int, float)) else 0,
            "period": period,
            "created_at": created_at
        })
    wb.close()
    print(f"  Achats chargés: {len(purchases)} avec BV")
    print(f"  Ignorés (NULL package): {skipped_null}")
    print(f"  Ignorés (BV=0): {skipped_no_bv}")
    return purchases

def generate_bv_logs():
    print("=== Génération des BV Logs ===")
    print(f"\n1. Connexion à la base locale...")
    conn = sqlite3.connect(DB_PATH)
    
    print(f"\n2. Chargement des membres...")
    by_uid, by_id = load_members(conn)
    
    print(f"\n3. Chargement du fichier Excel...")
    purchases = load_excel_data()
    
    print(f"\n4. Génération des entrées bv_logs...")
    
    bv_logs = []
    stats = {
        "personal": 0,
        "propagated": 0,
        "not_found": 0,
        "no_ancestors": 0,
        "ancestors_no_license": 0
    }
    not_found_users = []
    
    for purchase in purchases:
        username = purchase["username"]
        bv = purchase["bv"]
        period = purchase["period"]
        created_at = purchase["created_at"]
        
        # Trouver le membre dans la DB
        member = by_uid.get(username)
        if not member:
            stats["not_found"] += 1
            not_found_users.append(username)
            continue
        
        member_id = member["id"]
        
        # 1. Entrée personal_purchase pour le membre lui-même
        log_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"personal_{member_id}_{period}"))
        bv_logs.append({
            "id": log_id,
            "member_id": member_id,
            "source_member_id": member_id,
            "bv_amount": bv,
            "bv_type": "personal_purchase",
            "package_order_id": None,
            "propagated": 0,
            "period": period,
            "created_at": created_at
        })
        stats["personal"] += 1
        
        # 2. Propagation vers les ancêtres avec licence active
        ancestors = get_ancestors(member_id, by_id)
        if not ancestors:
            stats["no_ancestors"] += 1
        
        for ancestor in ancestors:
            if ancestor["license_active"] != 1:
                stats["ancestors_no_license"] += 1
                continue
            
            ancestor_id = ancestor["id"]
            position = ancestor["position"]  # L ou R = dans quel côté l'ancêtre reçoit ce BV
            
            log_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"propagated_{ancestor_id}_{member_id}_{period}"))
            bv_logs.append({
                "id": log_id,
                "member_id": ancestor_id,
                "source_member_id": member_id,
                "bv_amount": bv,
                "bv_type": "propagated",
                "package_order_id": None,
                "propagated": 1,
                "period": period,
                "created_at": created_at
            })
            stats["propagated"] += 1
    
    conn.close()
    
    print(f"\n5. Statistiques:")
    print(f"   Personal purchases: {stats['personal']}")
    print(f"   Propagations générées: {stats['propagated']}")
    print(f"   Membres non trouvés: {stats['not_found']}")
    print(f"   Membres sans ancêtres: {stats['no_ancestors']}")
    print(f"   Ancêtres sans licence (ignorés): {stats['ancestors_no_license']}")
    print(f"   TOTAL entrées bv_logs: {len(bv_logs)}")
    
    if not_found_users:
        print(f"\n   Utilisateurs non trouvés ({len(not_found_users)}):")
        for u in not_found_users[:20]:
            print(f"     - {u}")
        if len(not_found_users) > 20:
            print(f"     ... et {len(not_found_users)-20} autres")
    
    print(f"\n6. Écriture du fichier SQL...")
    write_sql(bv_logs)
    print(f"   Fichier écrit: {OUTPUT_SQL}")

def write_sql(bv_logs):
    """Génère le fichier SQL d'insertion"""
    lines = []
    lines.append("-- BV Logs Import depuis Master sheet (2).xlsx")
    lines.append(f"-- Généré le {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"-- {len(bv_logs)} entrées")
    lines.append("")
    lines.append("DELETE FROM bv_logs;")
    lines.append("")
    
    # Insérer par batch de 100
    batch_size = 100
    for i in range(0, len(bv_logs), batch_size):
        batch = bv_logs[i:i+batch_size]
        values = []
        for log in batch:
            order_id = f"'{log['package_order_id']}'" if log['package_order_id'] else "NULL"
            values.append(
                f"('{log['id']}', '{log['member_id']}', "
                f"'{log['source_member_id']}', {log['bv_amount']}, "
                f"'{log['bv_type']}', {order_id}, "
                f"{log['propagated']}, '{log['period']}', "
                f"'{log['created_at']}')"
            )
        lines.append(
            "INSERT OR IGNORE INTO bv_logs (id, member_id, source_member_id, bv_amount, bv_type, package_order_id, propagated, period, created_at) VALUES"
        )
        lines.append("  " + ",\n  ".join(values) + ";")
        lines.append("")
    
    with open(OUTPUT_SQL, "w") as f:
        f.write("\n".join(lines))

if __name__ == "__main__":
    generate_bv_logs()
