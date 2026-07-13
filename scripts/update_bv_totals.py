#!/usr/bin/env python3
"""
Met à jour les colonnes BV sur les membres à partir des bv_logs :
- left_bv_total / right_bv_total : somme totale des BV propagés par côté
- left_bv_monthly / right_bv_monthly : somme du mois courant
- personal_bv_monthly : BV personnels du mois courant

On considère le dernier mois disponible dans les données comme "mois courant" pour le mensuel.
"""

import sqlite3
from collections import defaultdict
from datetime import datetime

DB_PATH = "/home/user/webapp/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/50b2b2a431a1233500e1085db1aebe736ed5e396a5291d31dafc2c2a25c4393f.sqlite"
OUTPUT_SQL = "/home/user/webapp/scripts/bv_members_update.sql"

def main():
    print("=== Mise à jour des totaux BV sur les membres ===")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # 1. Charger tous les membres avec leur position binaire
    print("\n1. Chargement des membres et de l'arbre binaire...")
    cur.execute("SELECT id, unique_id, binary_parent_id, binary_position FROM members")
    members = {row['id']: dict(row) for row in cur.fetchall()}
    print(f"   {len(members)} membres chargés")
    
    # 2. Charger tous les bv_logs de type 'propagated'
    print("\n2. Chargement des bv_logs propagés...")
    cur.execute("""
        SELECT bl.member_id, bl.source_member_id, bl.bv_amount, bl.period
        FROM bv_logs bl
        WHERE bl.bv_type = 'propagated'
    """)
    propagated_logs = cur.fetchall()
    print(f"   {len(propagated_logs)} entrées propagées")
    
    # 3. Charger les bv_logs de type 'personal_purchase'
    print("\n3. Chargement des bv_logs personnels...")
    cur.execute("""
        SELECT bl.member_id, bl.bv_amount, bl.period
        FROM bv_logs bl
        WHERE bl.bv_type = 'personal_purchase'
    """)
    personal_logs = cur.fetchall()
    print(f"   {len(personal_logs)} entrées personnelles")
    
    # 4. Déterminer le mois "courant" (le plus récent dans les données)
    cur.execute("SELECT MAX(period) as max_period FROM bv_logs")
    max_period = cur.fetchone()[0]
    print(f"\n4. Période la plus récente: {max_period} (utilisée pour left/right_bv_monthly)")
    
    conn.close()
    
    # 5. Calculer les totaux par membre
    print("\n5. Calcul des totaux par membre...")
    
    # Pour les propagations : on doit déterminer de quel côté (L ou R) vient le BV propagé
    # Le côté est déterminé par la position de la source dans l'arbre du receveur
    # On doit remonter l'arbre depuis source_member_id jusqu'à trouver l'enfant direct du member_id
    
    # Construire index parent → {L: child_id, R: child_id}
    children_map = defaultdict(dict)  # parent_id -> {position: child_id}
    for mid, m in members.items():
        parent_id = m.get('binary_parent_id')
        pos = m.get('binary_position')
        if parent_id and pos:
            children_map[parent_id][pos] = mid
    
    # Pour chaque source_member_id, pré-calculer le chemin vers le haut
    # path_cache[member_id][ancestor_id] = position (L ou R) dans ancestor
    # On calcule ça à la volée avec cache
    
    # Accumulateurs
    left_bv_total = defaultdict(float)   # member_id -> total
    right_bv_total = defaultdict(float)
    left_bv_monthly = defaultdict(float)
    right_bv_monthly = defaultdict(float)
    personal_bv_monthly = defaultdict(float)
    
    # Cache de position : (receiver_id, source_id) -> 'L' ou 'R'
    position_cache = {}
    
    def get_position_in_receiver(receiver_id, source_id):
        """Détermine de quel côté (L ou R) du receveur se trouve la source"""
        key = (receiver_id, source_id)
        if key in position_cache:
            return position_cache[key]
        
        # Remonter depuis source jusqu'à trouver l'enfant direct du receiver
        current = source_id
        visited = set()
        result = None
        max_iter = 100
        while max_iter > 0:
            max_iter -= 1
            if current in visited:
                break
            visited.add(current)
            m = members.get(current)
            if not m:
                break
            parent_id = m.get('binary_parent_id')
            pos = m.get('binary_position')
            if parent_id == receiver_id:
                result = pos
                break
            if not parent_id:
                break
            current = parent_id
        
        position_cache[key] = result
        return result
    
    # Traiter les propagations
    print("   Traitement des propagations...")
    unknown_positions = 0
    for log in propagated_logs:
        receiver_id = log['member_id']
        source_id = log['source_member_id']
        bv = log['bv_amount']
        period = log['period']
        
        pos = get_position_in_receiver(receiver_id, source_id)
        
        if pos == 'L':
            left_bv_total[receiver_id] += bv
            if period == max_period:
                left_bv_monthly[receiver_id] += bv
        elif pos == 'R':
            right_bv_total[receiver_id] += bv
            if period == max_period:
                right_bv_monthly[receiver_id] += bv
        else:
            unknown_positions += 1
            # Fallback: ignorer ou mettre en L par défaut
    
    print(f"   Positions inconnues (ignorées): {unknown_positions}")
    
    # Traiter les personnels
    print("   Traitement des BV personnels...")
    for log in personal_logs:
        member_id = log['member_id']
        bv = log['bv_amount']
        period = log['period']
        if period == max_period:
            personal_bv_monthly[member_id] += bv
    
    # 6. Générer le SQL de mise à jour
    print("\n6. Génération du SQL de mise à jour...")
    
    # Collecter tous les membres à mettre à jour
    all_members_to_update = set(left_bv_total.keys()) | set(right_bv_total.keys()) | \
                            set(left_bv_monthly.keys()) | set(right_bv_monthly.keys()) | \
                            set(personal_bv_monthly.keys())
    
    print(f"   Membres à mettre à jour: {len(all_members_to_update)}")
    
    updates = []
    for mid in all_members_to_update:
        lbt = round(left_bv_total.get(mid, 0), 2)
        rbt = round(right_bv_total.get(mid, 0), 2)
        lbm = round(left_bv_monthly.get(mid, 0), 2)
        rbm = round(right_bv_monthly.get(mid, 0), 2)
        pbm = round(personal_bv_monthly.get(mid, 0), 2)
        updates.append((mid, lbt, rbt, lbm, rbm, pbm))
    
    write_sql(updates)
    print(f"\n   Fichier SQL écrit: {OUTPUT_SQL}")
    
    # Stats
    total_left = sum(left_bv_total.values())
    total_right = sum(right_bv_total.values())
    print(f"\n7. Résumé:")
    print(f"   Total BV côté gauche (tous membres): {total_left:,.0f}")
    print(f"   Total BV côté droit (tous membres): {total_right:,.0f}")

def write_sql(updates):
    lines = []
    lines.append("-- Mise à jour des totaux BV sur les membres")
    lines.append(f"-- Généré le {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"-- {len(updates)} membres mis à jour")
    lines.append("")
    
    # Reset tous les BV d'abord
    lines.append("-- Reset des BV existants")
    lines.append("UPDATE members SET left_bv_total = 0, right_bv_total = 0, left_bv_monthly = 0, right_bv_monthly = 0, personal_bv_monthly = 0;")
    lines.append("")
    
    for (mid, lbt, rbt, lbm, rbm, pbm) in updates:
        lines.append(
            f"UPDATE members SET "
            f"left_bv_total = {lbt}, right_bv_total = {rbt}, "
            f"left_bv_monthly = {lbm}, right_bv_monthly = {rbm}, "
            f"personal_bv_monthly = {pbm} "
            f"WHERE id = '{mid}';"
        )
    
    lines.append("")
    
    with open(OUTPUT_SQL, "w") as f:
        f.write("\n".join(lines))

if __name__ == "__main__":
    main()
