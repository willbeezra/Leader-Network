#!/usr/bin/env python3
"""
generate_import.py — Génère migration/0094_import_members.sql
Comprend :
  1. Membres (1 723)
  2. Wallets (1 723)
  3. finstrategia_licenses — TOUT l'historique (actifs + expirés)
  4. bv_logs — chaque ligne de BV History + update left/right_bv_total
  5. wallet_transactions — toutes les 7 521 lignes
  6. withdrawals — 305 lignes avec statut exact
  7. UPDATE FOUNDER100 → binary_right = sorjenking
"""

import csv
import uuid
import hashlib
import os
from collections import defaultdict

# ── Constantes ────────────────────────────────────────────────
HASH          = 'bdbfbc76-53ee-4b51-a448-e663c79b7688:1870a0c2525f796c77b806c90a4b960d1772c87cef7094deff6c4c1a56fb4b63'
LEADER_ID     = 'leader-root-000000000000000000000001'
ROOT_ID       = 'root-system-000000000000000000000000'
FOUNDER100_ID = 'a0203d9c-1cce-58a5-b60e-db6b28cdfa83'
FILES         = '/home/user/uploaded_files'

SKIP = {'rootuser'}

# ── Helpers ───────────────────────────────────────────────────
def clean(v):
    if v is None: return ''
    return str(v).strip('"').strip().strip('\r')

def sql_str(v):
    if v is None or clean(v) == '' or clean(v).upper() == 'NULL':
        return 'NULL'
    return "'" + clean(v).replace("'", "''") + "'"

def sql_num(v, default='0'):
    v = clean(v)
    if not v or v.upper() == 'NULL': return default
    try:
        return str(float(v))
    except:
        return default

def make_id(username):
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, 'willbeleader.com:' + username))

def resolve_id(username):
    if not username or username.upper() == 'NULL' or username == '':
        return None
    if username == 'rootuser':
        return ROOT_ID
    if username == 'LEADER':
        return ROOT_ID
    return make_id(username)

# ── Lire u(1).csv ─────────────────────────────────────────────
print("Chargement u(1).csv …")
tree = {}
tree_order = []
with open(f'{FILES}/u (1) (3).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        uid = clean(row['unique_id'])
        if not uid or uid in SKIP:
            continue
        tree[uid] = {
            'unique_id':        uid,
            'firstname':        clean(row['firstname']),
            'lastname':         clean(row['lastname']),
            'email':            clean(row['email']),
            'mobile':           clean(row['mobile']),
            'sponsor':          clean(row['sponsor_username']),
            'binary_parent':    clean(row['binary_parent_username']),
            'binary_position':  clean(row['binary_position']).upper(),
            'registration_date':clean(row['registration_date']),
        }
        tree_order.append(uid)

print(f"  → {len(tree)} membres (hors rootuser)")

# ── Lire master member list.csv ───────────────────────────────
print("Chargement master member list …")
master_by_id = {}  # numeric_id → username
master = {}        # username → row
with open(f'{FILES}/master member list (3).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        num_id = clean(row.get('id', ''))
        uname  = clean(row.get('username', ''))
        if uname:
            master[uname]    = row
            master_by_id[num_id] = uname

print(f"  → {len(master)} membres dans master")

# ── Lire TOUT l'historique packages ───────────────────────────
print("Chargement Historical Plan Purchases …")
all_purchases = defaultdict(list)   # username → [list of rows]
with open(f'{FILES}/Historical Plan Purchases (3).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        num_id = clean(row.get('user_id', ''))
        uname  = master_by_id.get(num_id, '')
        if uname:
            all_purchases[uname].append({
                'plan_id':     clean(row.get('plan_id', '')),
                'started_at':  clean(row.get('started_at', '')),
                'expires_at':  clean(row.get('expires_at', '')),
                'price':       clean(row.get('total_price', '0')),
                'bv':          clean(row.get('total_bv', '0')),
                'active':      clean(row.get('active', '0')),
                'created_at':  clean(row.get('created_at', '')),
            })

total_purch = sum(len(v) for v in all_purchases.values())
print(f"  → {total_purch} achats au total pour {len(all_purchases)} membres")

# ── Lire plans ────────────────────────────────────────────────
plans = {}
with open(f'{FILES}/Current Package Definitions (3).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        pid = clean(row.get('id', ''))
        plans[pid] = {
            'name': clean(row.get('name', '')),
            'bv':   clean(row.get('bv', '0')),
        }

def map_package_type(plan_id, plan_name):
    n = plan_name.lower()
    if 'production' in n:   return 'Production'
    if 'pinnacle' in n or 'pinacle' in n: return 'Pinnacle'
    if 'elite' in n:        return 'Club_Elite'
    if 'prestige' in n:     return 'Club_Prestige'
    if 'influence' in n:    return 'Influence'
    if 'développement' in n or 'developpement' in n or 'd\u00e9veloppement' in n: return 'Developpement'
    if 'permission' in n:   return 'Permission'
    if 'perfectionnement' in n: return 'Perfectionnement'
    if 'expert' in n:       return 'Expert'
    if 'starter' in n:      return 'Starter'
    if 'position' in n:     return 'Position'
    if 'premium plus' in n: return 'Premium_Plus'
    if 'premium executive' in n: return 'Premium_Executive'
    if 'premium' in n:      return 'Premium'
    return plan_name[:50] if plan_name else 'Standard'

# ── Lire BV History ───────────────────────────────────────────
print("Chargement BV History (100 413 lignes) …")
bv_rows_by_user = defaultdict(list)   # numeric_id → rows
with open(f'{FILES}/BV History (3).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        uid = clean(row.get('user_id', ''))
        bv_rows_by_user[uid].append(row)

print(f"  → {sum(len(v) for v in bv_rows_by_user.values())} lignes BV pour {len(bv_rows_by_user)} utilisateurs")

# Pré-calculer les totaux BV par membre (position 1=gauche, 2=droite, trx_type='+')
bv_totals = {}   # numeric_id → {'left': float, 'right': float}
for num_id, rows in bv_rows_by_user.items():
    left_total  = 0.0
    right_total = 0.0
    for r in rows:
        if clean(r.get('trx_type', '')) != '+':
            continue
        try:
            amount = float(clean(r.get('amount', '0')))
        except:
            amount = 0.0
        pos = clean(r.get('position', ''))
        if pos == '1':
            left_total  += amount
        elif pos == '2':
            right_total += amount
    bv_totals[num_id] = {'left': left_total, 'right': right_total}

print(f"  → Totaux BV calculés pour {len(bv_totals)} membres")

# ── Lire Wallet Transactions ──────────────────────────────────
print("Chargement Complete User Transaction History …")
tx_rows = []
with open(f'{FILES}/Complete User Transaction History (3).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        tx_rows.append(row)

print(f"  → {len(tx_rows)} transactions")

# Map remark → transaction_type pour notre système
REMARK_TYPE_MAP = {
    'purchased_plan':       'package_purchase',
    'rank_commission':      'rank_commission',
    'referral_bonus':       'referral_bonus',
    'deposit':              'deposit',
    'withdraw':             'withdrawal',
    'license_fee':          'license_fee',
    'admin_fee':            'admin_fee',
    'balance_add':          'admin_credit',
    'balance_subtract':     'admin_debit',
    'epin':                 'epin',
    'moved_to_balance':     'internal_transfer',
    'deposit_wallet':       'deposit',
    'rank_weekly_payment':  'rank_bonus',
    'strategie_bonus':      'bonus',
    'admin_adjustment':     'admin_adjustment',
}

def map_tx_type(remark, trx_type):
    t = REMARK_TYPE_MAP.get(remark.strip(), remark.strip() or 'other')
    return t

# ── Lire Withdrawals ──────────────────────────────────────────
print("Chargement Withdrawals …")
wd_rows = []
with open(f'{FILES}/Withdrawals (3).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        wd_rows.append(row)

print(f"  → {len(wd_rows)} retraits")

# Map statut numérique → texte
def map_wd_status(s):
    s = clean(s)
    if s == '1': return 'completed'
    if s == '3': return 'rejected'
    return 'pending'   # 0 ou autre

# ── Tri topologique ───────────────────────────────────────────
print("Tri topologique …")

def topo_sort(members_dict, order):
    visited = set()
    result  = []

    def visit(uid):
        if uid in visited or uid not in members_dict:
            return
        visited.add(uid)
        bp = members_dict[uid]['binary_parent']
        if bp and bp not in SKIP and bp in members_dict:
            visit(bp)
        sp = members_dict[uid]['sponsor']
        if sp and sp not in SKIP and sp in members_dict:
            visit(sp)
        result.append(uid)

    for uid in order:
        visit(uid)
    return result

sorted_members = topo_sort(tree, tree_order)
print(f"  → {len(sorted_members)} membres dans l'ordre d'insertion")
if 'sorjenking' in sorted_members:
    idx = sorted_members.index('sorjenking')
    print(f"  → sorjenking position : {idx}")

# ── Rangs ─────────────────────────────────────────────────────
# Les rangs de l'ancien système (captain, commander, triple_diamond…) ne
# correspondent pas aux rangs actuels de rank_config.
# On importe tout à 'none' — le système recalculera les rangs depuis les BV.
RANK_MAP = {}  # toujours 'none' via le fallback ci-dessous

def map_kyc(kv):
    kv = clean(kv)
    if kv == '1': return 'verified'
    return 'not_submitted'

def map_status(status):
    s = clean(status)
    if s == '0': return 'cancelled'
    return 'active'

# ── Construire l'index numeric_id → member_uuid ───────────────
# Nécessaire pour BV logs, transactions et retraits
num_to_uuid = {}   # numeric_id → uuid
num_to_uname = master_by_id  # déjà construit
for uname in sorted_members:
    mx = master.get(uname, {})
    num_id = clean(mx.get('id', ''))
    if num_id:
        num_to_uuid[num_id] = make_id(uname)

print(f"  → {len(num_to_uuid)} mappings numeric_id → UUID")

# ════════════════════════════════════════════════════════════════
# GÉNÉRATION SQL
# ════════════════════════════════════════════════════════════════

member_lines    = []
member_fk_lines = []   # UPDATE pour sponsor_id + binary_parent_id + binary_position (2ème passe)
wallet_lines    = []
license_lines   = []
bvlog_lines     = []
bv_update_lines = []
tx_lines        = []
wd_lines        = []

stats = {
    'no_master': 0, 'no_sponsor': 0, 'no_parent': 0,
    'with_active_pkg': 0, 'total_licenses': 0,
    'bv_logs': 0, 'tx': 0, 'wd': 0,
}

# ── Bloc 1 + 2 + 3 : membres, wallets, licences ──────────────
print("Génération membres / wallets / licences …")

for uid in sorted_members:
    m  = tree[uid]
    mx = master.get(uid, {})
    member_id = make_id(uid)

    firstname = m['firstname'] or 'Membre'
    lastname  = m['lastname']  or uid
    email     = m['email']     or f"{uid}@willbeleader.com"
    mobile    = m['mobile']    or ''
    reg_date  = m['registration_date'] or ''

    if mx:
        firstname    = clean(mx.get('firstname',''))    or firstname
        lastname     = clean(mx.get('lastname',''))     or lastname
        email        = clean(mx.get('email',''))        or email
        mobile       = clean(mx.get('mobile',''))       or mobile
        country      = clean(mx.get('country_name',''))
        country_code = clean(mx.get('country_code',''))
        balance      = sql_num(mx.get('balance','0'))
        credit_cr    = sql_num(mx.get('strategie_de_croissance_wallet','0'))
        reserve_s    = sql_num(mx.get('programme_de_reserve_wallet','0'))
        rank_id      = clean(mx.get('current_rank_id','0'))
        rank         = RANK_MAP.get(rank_id, 'none')
        kyc          = map_kyc(mx.get('kv','0'))
        status       = map_status(mx.get('status','1'))
        active_lic   = '1' if clean(mx.get('active_license','0')) == '1' else '0'
        license_expires = clean(mx.get('expiry_date','')) or None
        paid_admin   = '1' if clean(mx.get('paid_admin_fee','0')) == '1' else '0'
        num_id       = clean(mx.get('id',''))
        # BV totaux calculés depuis BV History (plus précis que master)
        if num_id and num_id in bv_totals:
            bv_left  = str(bv_totals[num_id]['left'])
            bv_right = str(bv_totals[num_id]['right'])
        else:
            bv_left  = sql_num(mx.get('total_volume_left','0'))
            bv_right = sql_num(mx.get('total_volume_right','0'))
        city         = clean(mx.get('city',''))
        address      = clean(mx.get('address',''))
        fs_date      = clean(mx.get('fast_start_start_date','')) or None
    else:
        stats['no_master'] += 1
        country = ''; country_code = ''; balance = '0'
        credit_cr = '0'; reserve_s = '0'; rank = 'none'; kyc = 'not_submitted'
        status = 'active'; active_lic = '0'; license_expires = None
        paid_admin = '0'; bv_left = '0'; bv_right = '0'; num_id = ''
        city = ''; address = ''; fs_date = None

    # Sponsor
    sponsor_raw = m['sponsor']
    if not sponsor_raw or sponsor_raw.upper() == 'NULL' or sponsor_raw == '':
        sponsor_id = ROOT_ID
        stats['no_sponsor'] += 1
    elif sponsor_raw == 'rootuser':
        sponsor_id = ROOT_ID
    else:
        sponsor_id = make_id(sponsor_raw)

    # Binary parent — calculé dans member_fk_lines maintenant
    bp_raw = m['binary_parent']
    # (n'est plus utilisé directement ici)

    # Date création
    if reg_date:
        created_at = f"'{reg_date}'"
    else:
        created_at = "datetime('now')"

    # Package actif (premier de la liste)
    pkg_list    = all_purchases.get(uid, [])
    active_pkgs = [p for p in pkg_list if p['active'] == '1']
    pkg         = active_pkgs[0] if active_pkgs else (pkg_list[0] if pkg_list else None)
    pkg_type    = None; pkg_name = None; pkg_bv = '0'
    if pkg:
        pinfo    = plans.get(pkg['plan_id'], {})
        pkg_type = map_package_type(pkg['plan_id'], pinfo.get('name',''))
        pkg_name = pinfo.get('name', pkg_type)
        pkg_bv   = pinfo.get('bv','0')
        if pkg['active'] == '1':
            stats['with_active_pkg'] += 1

    # ── Déterminer member_status ─────────────────────────────
    # Règle métier :
    #   AMI       = package acheté (plan_id≠0 dans le CSV) → rangs illimités
    #   Partenaire = licence active mais pas de package → plafonné Manager
    #   Membre    = ni licence ni package
    if mx:
        _plan_id  = clean(mx.get('plan_id', '0'))
        _act_lic  = clean(mx.get('active_license', '0'))
        _rank_id  = clean(mx.get('current_rank_id', '0'))
        _status_v = clean(mx.get('status', '1'))
        has_package = bool(_plan_id and _plan_id not in ('0', 'NULL', ''))
        has_rank    = bool(_rank_id  and _rank_id  not in ('0', 'NULL', ''))
        if _status_v == '1' and (has_package or has_rank):
            member_status_val = 'AMI'          # package acheté → rangs illimités
        elif _status_v == '1' and _act_lic == '1':
            member_status_val = 'Partenaire'   # licence seule → plafonné Manager
        else:
            member_status_val = 'Membre'
    else:
        member_status_val = 'Membre'

    # ── INSERT members ────────────────────────────────────────
    # STRATÉGIE FK : on insère avec sponsor_id=ROOT (toujours valide)
    # et binary_parent_id=NULL (pas de FK cross-membre à l'INSERT),
    # puis un UPDATE séparé (section member_fk) remettra les vraies valeurs.
    exp_sql = sql_str(license_expires)

    member_lines.append(
        f"INSERT OR IGNORE INTO members ("
        f"id, unique_id, email, password_hash, "
        f"first_name, last_name, phone, country, "
        f"sponsor_id, binary_parent_id, binary_position, "
        f"member_status, current_rank, "
        f"license_active, license_expires_at, kyc_status, "
        f"in_holding_tank, wallet_balance, credit_croissance, reserve_strategique, "
        f"left_bv_total, right_bv_total, "
        f"admin_fee_paid, "
        f"package_purchased, package_type, package_name, "
        f"registration_method, "
        f"fast_start_start_date, "
        f"city, address, "
        f"account_status, "
        f"created_at, updated_at"
        f") VALUES ("
        f"'{member_id}', {sql_str(uid)}, {sql_str(email)}, '{HASH}', "
        f"{sql_str(firstname)}, {sql_str(lastname)}, {sql_str(mobile)}, {sql_str(country)}, "
        f"'{ROOT_ID}', NULL, NULL, "   # FK sûres pour l'INSERT
        f"'{member_status_val}', '{rank}', "
        f"{active_lic}, {exp_sql}, '{kyc}', "
        f"0, {balance}, {credit_cr}, {reserve_s}, "
        f"{bv_left}, {bv_right}, "
        f"{paid_admin}, "
        f"{'1' if pkg else '0'}, {sql_str(pkg_type)}, {sql_str(pkg_name)}, "
        f"'import', "
        f"{sql_str(fs_date)}, "
        f"{sql_str(city)}, {sql_str(address)}, "
        f"'{status}', "
        f"{created_at}, {created_at}"
        f");"
    )

    # UPDATE FK : remettre sponsor_id et binary_parent_id réels
    # (exécuté APRÈS que tous les membres sont insérés)
    bp_raw = m['binary_parent']
    if uid == 'sorjenking':
        real_bp_id  = FOUNDER100_ID
        real_bp_pos = 'R'
    elif not bp_raw or bp_raw.upper() == 'NULL':
        real_bp_id  = None
        real_bp_pos = None
    elif bp_raw == 'rootuser':
        real_bp_id  = ROOT_ID
        real_bp_pos = m['binary_position'] if m['binary_position'] in ('L','R') else None
    else:
        real_bp_id  = make_id(bp_raw)
        real_bp_pos = m['binary_position'] if m['binary_position'] in ('L','R') else None

    bp_sql   = sql_str(real_bp_id)
    bpos_sql = sql_str(real_bp_pos)

    member_fk_lines.append(
        f"UPDATE members SET "
        f"sponsor_id='{sponsor_id}', "
        f"binary_parent_id={bp_sql}, "
        f"binary_position={bpos_sql}, "
        f"updated_at=updated_at "
        f"WHERE id='{member_id}';"
    )

    # ── INSERT wallets ────────────────────────────────────────
    wallet_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, 'wallet:' + uid))
    wallet_lines.append(
        f"INSERT OR IGNORE INTO wallets (id, member_id, balance, total_earned, total_withdrawn) "
        f"VALUES ('{wallet_id}', '{member_id}', {balance}, 0, 0);"
    )

    # ── INSERT finstrategia_licenses (TOUT l'historique) ──────
    for i, p in enumerate(pkg_list):
        pinfo     = plans.get(p['plan_id'], {})
        p_type    = map_package_type(p['plan_id'], pinfo.get('name',''))
        p_name    = pinfo.get('name', p_type)
        started   = p['started_at']  or '2025-06-01'
        expires   = p['expires_at']  or '2028-05-31'
        price_val = sql_num(p['price'], '97')
        # ID déterministe basé sur username + index
        lic_id    = str(uuid.uuid5(uuid.NAMESPACE_DNS, f'license:{uid}:{i}'))
        p_status  = 'active' if p['active'] == '1' else 'expired'
        p_created = p['created_at'] or started

        license_lines.append(
            f"INSERT OR IGNORE INTO finstrategia_licenses ("
            f"id, member_id, price_usd, status, payment_method, "
            f"starts_at, expires_at, "
            f"created_at, updated_at"
            f") VALUES ("
            f"'{lic_id}', '{member_id}', {price_val}, '{p_status}', 'import', "
            f"'{started}', '{expires}', "
            f"'{p_created}', '{p_created}'"
            f");"
        )
        stats['total_licenses'] += 1

# ── Bloc 4 : bv_logs + UPDATE BV totaux ──────────────────────
print("Génération bv_logs …")

# Types BV reconnus par la DB : 'package_purchase','license_renewal','personal',
#                                'personal_purchase','propagated','fast_start_contribution'
# On utilise 'propagated' comme type générique pour les logs importés
BV_TYPE = 'propagated'

for num_id, rows in bv_rows_by_user.items():
    uname = num_to_uname.get(num_id, '')
    if not uname or uname not in sorted_members:
        continue
    member_uuid = make_id(uname)

    for r in rows:
        if clean(r.get('trx_type', '')) != '+':
            continue   # on importe uniquement les ajouts
        try:
            amount = float(clean(r.get('amount', '0')))
        except:
            amount = 0.0
        if amount <= 0:
            continue

        pos     = clean(r.get('position', ''))
        details = clean(r.get('details', ''))
        bv_date = clean(r.get('created_at', '')) or 'datetime(\'now\')'
        # Période = YYYY-MM basée sur la date
        period  = bv_date[:7] if bv_date and len(bv_date) >= 7 else '2025-01'
        bv_type = 'personal_purchase' if pos == '1' else 'propagated'
        bv_id   = str(uuid.uuid5(uuid.NAMESPACE_DNS, f'bv:{r.get("id","")}{num_id}{pos}'))

        if bv_date and bv_date != "datetime('now')":
            bv_date_sql = f"'{bv_date}'"
        else:
            bv_date_sql = "datetime('now')"

        bvlog_lines.append(
            f"INSERT OR IGNORE INTO bv_logs ("
            f"id, member_id, source_member_id, bv_amount, bv_type, propagated, period, created_at"
            f") VALUES ("
            f"'{bv_id}', '{member_uuid}', '{member_uuid}', {amount}, '{bv_type}', "
            f"{'1' if pos == '2' else '0'}, '{period}', {bv_date_sql}"
            f");"
        )
        stats['bv_logs'] += 1

# UPDATE left_bv_total + right_bv_total sur les membres (calculés depuis BV History)
print("  Génération UPDATE BV totaux …")
for num_id, totals in bv_totals.items():
    uname = num_to_uname.get(num_id, '')
    if not uname or uname not in sorted_members:
        continue
    member_uuid = make_id(uname)
    if totals['left'] > 0 or totals['right'] > 0:
        bv_update_lines.append(
            f"UPDATE members SET "
            f"left_bv_total={totals['left']}, right_bv_total={totals['right']}, "
            f"updated_at=datetime('now') "
            f"WHERE id='{member_uuid}';"
        )

print(f"  → {stats['bv_logs']} bv_logs insérés, {len(bv_update_lines)} UPDATE BV")

# ── Bloc 5 : wallet_transactions ─────────────────────────────
print("Génération wallet_transactions …")

for r in tx_rows:
    num_id  = clean(r.get('user_id', ''))
    uname   = num_to_uname.get(num_id, '')
    if not uname or uname not in sorted_members:
        continue
    member_uuid = make_id(uname)

    try:
        amount = float(clean(r.get('amount', '0')))
    except:
        amount = 0.0

    try:
        bal_after = float(clean(r.get('post_balance', '0')))
    except:
        bal_after = 0.0

    charge_raw = clean(r.get('charge', '0'))
    try:
        charge = float(charge_raw)
    except:
        charge = 0.0

    bal_before = bal_after + (amount if clean(r.get('trx_type','')) == '-' else -amount)

    remark   = clean(r.get('remark', ''))
    trx_type = clean(r.get('trx_type', ''))
    tx_type  = map_tx_type(remark, trx_type)
    details  = clean(r.get('details', ''))
    ref_trx  = clean(r.get('trx', ''))
    tx_date  = clean(r.get('created_at', ''))

    # Ignorer les dates epoch 1970
    if tx_date.startswith('1970'):
        tx_date = clean(r.get('updated_at', ''))
    if tx_date.startswith('1970') or not tx_date:
        tx_date = '2025-06-01 00:00:00'

    tx_id    = str(uuid.uuid5(uuid.NAMESPACE_DNS, f'tx:{r.get("id","")}{num_id}'))

    tx_lines.append(
        f"INSERT OR IGNORE INTO wallet_transactions ("
        f"id, member_id, wallet_type, transaction_type, "
        f"amount, balance_before, balance_after, "
        f"description, reference_id, created_at"
        f") VALUES ("
        f"'{tx_id}', '{member_uuid}', 'principal', '{tx_type}', "
        f"{amount}, {bal_before}, {bal_after}, "
        f"{sql_str(details)}, {sql_str(ref_trx)}, '{tx_date}'"
        f");"
    )
    stats['tx'] += 1

print(f"  → {stats['tx']} transactions générées")

# ── Bloc 6 : withdrawals ──────────────────────────────────────
print("Génération withdrawals …")

for r in wd_rows:
    num_id  = clean(r.get('user_id', ''))
    uname   = num_to_uname.get(num_id, '')
    if not uname or uname not in sorted_members:
        continue
    member_uuid = make_id(uname)

    try:
        amount = float(clean(r.get('amount', '0')))
    except:
        amount = 0.0
    try:
        charge = float(clean(r.get('charge', '0')))
    except:
        charge = 0.0
    try:
        net = float(clean(r.get('final_amount', str(amount - charge))))
    except:
        net = amount - charge

    status_raw  = clean(r.get('status', '0'))
    wd_status   = map_wd_status(status_raw)
    admin_note  = clean(r.get('admin_feedback', ''))
    trx_ref     = clean(r.get('trx', ''))
    wd_date     = clean(r.get('created_at', ''))
    upd_date    = clean(r.get('updated_at', '')) or wd_date

    # Informations de paiement (JSON dans withdraw_information)
    wi_raw      = clean(r.get('withdraw_information', ''))
    # paypal_email : on met le trx comme référence si pas de mail
    paypal_email = trx_ref or 'import@willbeleader.com'

    confirmed_at = upd_date if wd_status == 'completed' else None

    wd_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f'wd:{r.get("id","")}{num_id}'))

    wd_lines.append(
        f"INSERT OR IGNORE INTO withdrawals ("
        f"id, member_id, amount, fee, net_amount, "
        f"paypal_email, pin_verified, status, "
        f"admin_note, payment_reference, payment_method, "
        f"payout_details, "
        f"confirmed_at, "
        f"created_at, updated_at"
        f") VALUES ("
        f"'{wd_id}', '{member_uuid}', {amount}, {charge}, {net}, "
        f"{sql_str(paypal_email)}, 1, '{wd_status}', "
        f"{sql_str(admin_note)}, {sql_str(trx_ref)}, 'import', "
        f"{sql_str(wi_raw)}, "
        f"{sql_str(confirmed_at)}, "
        f"'{wd_date}', '{upd_date}'"
        f");"
    )
    stats['wd'] += 1

print(f"  → {stats['wd']} retraits générés")

# ════════════════════════════════════════════════════════════════
# ÉCRITURE DU FICHIER SQL
# ════════════════════════════════════════════════════════════════

output_path = '/home/user/webapp/migrations/0094_import_members.sql'
sorjenking_id = make_id('sorjenking')

print(f"\nÉcriture SQL → {output_path} …")

with open(output_path, 'w', encoding='utf-8') as f:
    f.write("-- ============================================================\n")
    f.write("-- Migration 0094 — Import complet depuis ancien système\n")
    f.write(f"-- {len(sorted_members)} membres | {stats['total_licenses']} licences\n")
    f.write(f"-- {stats['bv_logs']} bv_logs | {stats['tx']} transactions | {stats['wd']} retraits\n")
    f.write(f"-- Stratégie FK : INSERT sans FK cross-membre, puis UPDATE\n")
    f.write("-- ============================================================\n\n")
    f.write("PRAGMA foreign_keys = OFF;\n\n")

    # ── 1. Membres
    f.write(f"-- ────────────────────────────────────────────────────────────\n")
    f.write(f"-- 1. MEMBRES INSERT (avec sponsor_id=LEADER, binary_parent=NULL)\n")
    f.write(f"--    ({len(member_lines)} membres)\n")
    f.write(f"-- ────────────────────────────────────────────────────────────\n")
    for line in member_lines:
        f.write(line + "\n")

    # ── 1b. UPDATE FK membres
    f.write(f"\n-- ────────────────────────────────────────────────────────────\n")
    f.write(f"-- 1b. MEMBRES FK UPDATE (sponsor_id + binary_parent réels)\n")
    f.write(f"--     ({len(member_fk_lines)} updates)\n")
    f.write(f"-- ────────────────────────────────────────────────────────────\n")
    for line in member_fk_lines:
        f.write(line + "\n")

    # ── 2. Wallets
    f.write(f"\n-- ────────────────────────────────────────────────────────────\n")
    f.write(f"-- 2. WALLETS ({len(wallet_lines)})\n")
    f.write(f"-- ────────────────────────────────────────────────────────────\n")
    for line in wallet_lines:
        f.write(line + "\n")

    # ── 3. Licences (tout l'historique)
    f.write(f"\n-- ────────────────────────────────────────────────────────────\n")
    f.write(f"-- 3. LICENCES — historique complet ({stats['total_licenses']})\n")
    f.write(f"-- ────────────────────────────────────────────────────────────\n")
    for line in license_lines:
        f.write(line + "\n")

    # ── 4. BV logs
    f.write(f"\n-- ────────────────────────────────────────────────────────────\n")
    f.write(f"-- 4. BV LOGS ({stats['bv_logs']})\n")
    f.write(f"-- ────────────────────────────────────────────────────────────\n")
    for line in bvlog_lines:
        f.write(line + "\n")

    # ── 4b. UPDATE BV totaux
    f.write(f"\n-- ── 4b. UPDATE BV TOTAUX ({len(bv_update_lines)}) ─────────────────────\n")
    for line in bv_update_lines:
        f.write(line + "\n")

    # ── 5. Wallet transactions
    f.write(f"\n-- ────────────────────────────────────────────────────────────\n")
    f.write(f"-- 5. WALLET TRANSACTIONS ({stats['tx']})\n")
    f.write(f"-- ────────────────────────────────────────────────────────────\n")
    for line in tx_lines:
        f.write(line + "\n")

    # ── 6. Withdrawals
    f.write(f"\n-- ────────────────────────────────────────────────────────────\n")
    f.write(f"-- 6. WITHDRAWALS ({stats['wd']})\n")
    f.write(f"-- ────────────────────────────────────────────────────────────\n")
    for line in wd_lines:
        f.write(line + "\n")

    # ── 7. FOUNDER100 → binary_right = sorjenking
    f.write(f"\n-- ────────────────────────────────────────────────────────────\n")
    f.write(f"-- 7. BRANCHER sorjenking sous FOUNDER100\n")
    f.write(f"-- ────────────────────────────────────────────────────────────\n")
    f.write(f"UPDATE members SET binary_right_id='{sorjenking_id}', updated_at=datetime('now') WHERE id='{FOUNDER100_ID}';\n")

    # ── 8. Enregistrer migration
    f.write(f"\n-- ────────────────────────────────────────────────────────────\n")
    f.write(f"-- 8. ENREGISTRER LA MIGRATION\n")
    f.write(f"-- ────────────────────────────────────────────────────────────\n")
    f.write("INSERT OR IGNORE INTO d1_migrations (name, applied_at) VALUES ('0094_import_members', datetime('now'));\n")

    f.write("\nPRAGMA foreign_keys = ON;\n")

size = os.path.getsize(output_path)
print(f"\n{'='*60}")
print(f"FICHIER GÉNÉRÉ : {output_path}")
print(f"Taille         : {size/1024/1024:.2f} MB ({size/1024:.1f} KB)")
print(f"{'='*60}")
print(f"Membres INSERT   : {len(member_lines)}")
print(f"Membres FK UPD   : {len(member_fk_lines)}")
print(f"Wallets          : {len(wallet_lines)}")
print(f"Licences         : {stats['total_licenses']}")
print(f"BV logs          : {stats['bv_logs']}")
print(f"UPDATE BV totaux : {len(bv_update_lines)}")
print(f"Transactions     : {stats['tx']}")
print(f"Retraits         : {stats['wd']}")
print(f"{'='*60}")
print(f"Membres sans master  : {stats['no_master']}")
print(f"Sponsors → LEADER    : {stats['no_sponsor']}")
print(f"Sans parent binaire  : {stats['no_parent']}")
print(f"Packages actifs      : {stats['with_active_pkg']}")
print(f"sorjenking ID        : {sorjenking_id}")

# Aperçu
print(f"\n--- Aperçu membres (3 premiers) ---")
for line in member_lines[:3]:
    print(line[:180])
print(f"\n--- Aperçu BV logs (3 premiers) ---")
for line in bvlog_lines[:3]:
    print(line[:180])
print(f"\n--- Aperçu transactions (3 premières) ---")
for line in tx_lines[:3]:
    print(line[:180])
print(f"\n--- Aperçu retraits (3 premiers) ---")
for line in wd_lines[:3]:
    print(line[:180])
