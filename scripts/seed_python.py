#!/usr/bin/env python3
"""
Seed complet LEADER Network — packages exacts issus des captures d'écran
Schémas vérifiés directement depuis la DB locale.
"""
import sqlite3
import hashlib

DB = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/d3e041905f05e515c70eeff7a19bb719b7fd5943de6f9e0a4f0dad6a65e8bfec.sqlite'

def make_hash(salt: str, password: str) -> str:
    data = (salt + password).encode('utf-8')
    digest = hashlib.sha256(data).hexdigest()
    return f"{salt}:{digest}"

ADMIN_HASH  = make_hash('seed-salt-admin-2024',  'Admin123!')
MEMBER_HASH = make_hash('seed-salt-member-2024', 'Member123!')

print(f"Admin hash  : {ADMIN_HASH}")
print(f"Member hash : {MEMBER_HASH}")

conn = sqlite3.connect(DB)
conn.execute("PRAGMA foreign_keys = OFF")

# ===========================================================================
# 0. Nettoyage complet
# ===========================================================================
for tbl in ['wallets','dreamiles_wallet','holding_tank','package_orders',
            'commissions','bv_logs','bv_queue','rank_queue','commission_queue',
            'notifications','wallet_transactions','pending_wallet_entries',
            'withdrawals','finstrategia_licenses','monthly_validations']:
    conn.execute(f'DELETE FROM {tbl}')
conn.execute("DELETE FROM members")
conn.execute("DELETE FROM packages WHERE id != 'pkg-licence'")
conn.commit()
print("\n[0] Nettoyage OK")

# ===========================================================================
# 1. Admin
# ===========================================================================
conn.execute(
    "UPDATE admin_users SET password_hash = ? WHERE id = 'admin-000000000000000000000000'",
    (ADMIN_HASH,)
)
print(f"[1] admin_users mis a jour")

# ===========================================================================
# 2. Catégories — mise à jour des descriptions/tags depuis les captures
# ===========================================================================
# Schéma : id, name, description, icon, is_active, display_order, tag
cats = [
    ('cat-synex', 'SYNEX',
     'Commencez là où vous êtes. Avancez vers là où vous voulez être.',
     '', 1, 1, 'Paiement unique'),
    ('cat-club', "CLUB PRIVÉ D'ÉDUCATION FINANCIÈRE",
     'Comprendre • Se former • Découvrir l\'écosystème',
     '', 1, 2, 'Paiement unique'),
    ('cat-luxia', 'LUXIA',
     'L\'expérience LUXIA — abonnement mensuel avec points Dreamiles.',
     '', 1, 3, 'Abonnement mensuel'),
    ('cat-ezra', 'EZRA',
     'Accès aux signaux de trading et formations, abonnement mensuel.',
     '', 1, 4, 'Abonnement mensuel'),
]
for (cid, name, desc, icon, active, order, tag) in cats:
    conn.execute("""
        UPDATE package_categories
        SET name=?, description=?, icon=?, is_active=?, display_order=?, tag=?
        WHERE id=?
    """, (name, desc, icon, active, order, tag, cid))
conn.commit()
print("[2] package_categories mis a jour")

# ===========================================================================
# 3. Packages — données exactes des captures d'écran
#
# Colonnes INSERT :
#   id, name, slug, price_usd, bv_value, description, features,
#   is_active, type, includes_license, category_id,
#   pricing_type ('one_time'|'monthly'), price_monthly,
#   direct_commission_rate, display_order, currency, title,
#   payment_mode, dreamiles_per_payment, bv_per_payment
# ===========================================================================

# Helper : sérialise une liste d'avantages en JSON array string
import json

def feat(*lines):
    return json.dumps(list(lines), ensure_ascii=False)

packages = [

    # ── SYNEX ───────────────────────────────────────────────────────────────
    # PRODUCTION — 600 $ / 240 BV
    (
        'pkg-synex-production', 'Production', 'synex-production',
        600.0, 240.0,
        'Comprendre, se former, découvrir l\'écosystème',
        feat(
            "S'EDUQUER - Campus LEADER partiel",
            "S'EDUQUER - Accès à toutes les formations gratuites",
            "S'EDUQUER - Education financière de base",
            "S'EDUQUER - Leadership, Mindset & développement personnel",
            "S'EDUQUER - Coaching & mentorat communautaire",
            "CRÉER - Synex",
            "CRÉER - Ezra – niveau Basique",
            "PROTÉGER - Finstrategia essentiel tarif préférentiel",
            "MULTIPLIER - Synex",
            "PROFITER - Luxia – Pass accès avec participation",
            "PROFITER - LeadX",
            "PROFITER - Élan",
        ),
        1, 'Production', 0, 'cat-synex',
        'one_time', None, 10.0, 1, 'USD', 'Production', 'one_time', 0, 240.0
    ),

    # DÉVELOPPEMENT — 1 000 $ / 400 BV
    (
        'pkg-synex-developpement', 'Développement', 'synex-developpement',
        1000.0, 400.0,
        'Structurer • Activer • Commencer à exploiter',
        feat(
            "S'ÉDUQUER - Campus LEADER complet",
            "S'ÉDUQUER - Will be coaching, sélection de formations certifiantes gratuites",
            "CRÉER - Ezra – niveau Intermédiaire",
            "CRÉER - Signaux de trading 2 classes d'actifs maximum 5/jours",
            "CRÉER - Session de trading en direct",
            "PROTÉGER - Finstrategia essentiel tarif préférentiel",
            "PROTÉGER - Will be pay (dès lancement)",
            "MULTIPLIER - Synex",
            "MULTIPLIER - Lyra",
            "PROFITER - Luxia – Pass accès avec participation",
            "PROFITER - LeadX",
            "PROFITER - Élan",
        ),
        1, 'Production', 0, 'cat-synex',
        'one_time', None, 10.0, 2, 'USD', 'Développement', 'one_time', 0, 400.0
    ),

    # PINACLE — 1 500 $ / 600 BV
    (
        'pkg-synex-pinacle', 'Pinacle', 'synex-pinacle',
        1500.0, 600.0,
        'Accélérer • Sécuriser • Multiplier — Tout le package Développement +',
        feat(
            "S'ÉDUQUER - Campus LEADER complet",
            "S'ÉDUQUER - Will be coaching, sélection de formations certifiantes gratuites",
            "CRÉER - EZRA – Avancé • Signaux illimités",
            "CRÉER - Formations complètes • Trading en direct",
            "CRÉER - Coaching de groupe",
            "PROTÉGER - Finstrategia essentiel tarif préférentiel",
            "PROTÉGER - Will be pay (dès lancement)",
            "MULTIPLIER - Synex • Lyra",
            "MULTIPLIER - KRONEX Investissement jusqu'à 3 000 $",
            "MULTIPLIER - Investissements Entreprises",
            "MULTIPLIER - Investissements Immobilier",
            "PROFITER - Luxia – Pass accès • LeadX • Élan",
            "PROFITER - Eventys • Stars • Nexora",
        ),
        1, 'Pinnacle', 0, 'cat-synex',
        'one_time', None, 10.0, 3, 'USD', 'Pinacle', 'one_time', 0, 600.0
    ),

    # INFLUENCE — 2 000 $ / 800 BV
    (
        'pkg-synex-influence', 'Influence', 'synex-influence',
        2000.0, 800.0,
        'Déployer • Influencer • Vision long terme — Tout le package Pinacle +',
        feat(
            "EZRA – Avancé + Coaching personnalisé",
            "KRONEX : Investissement jusqu'à 6 000 $",
            "Luxia – Pass Conciergerie : On fait tout pour vous — Abonnement 99$ au lieu de 179$",
            "Spark - Accès premium",
            "Entreprendre – Programme de 0 à 1",
            "Programme Leadership & Incentives",
            "Accès prioritaire événements & retraites",
            "Will Be Coaching – Priorité absolue",
            "Finstrategia - Essentiel (accompagnement renforcé)",
        ),
        1, 'Pinnacle', 0, 'cat-synex',
        'one_time', None, 10.0, 4, 'USD', 'Influence', 'one_time', 0, 800.0
    ),

    # ── CLUB PRIVÉ D'ÉDUCATION FINANCIÈRE ───────────────────────────────────
    # PRESTIGE — 1 499 $ / 900 BV
    (
        'pkg-club-prestige', 'Prestige', 'club-prestige',
        1499.0, 900.0,
        'Comprendre • Se former • Découvrir l\'écosystème',
        feat(
            "S'ÉDUQUER - Campus LEADER (accès partiel)",
            "S'ÉDUQUER - Accès à toutes les formations gratuites",
            "S'ÉDUQUER - Éducation financière de base",
            "S'ÉDUQUER - Leadership, mindset & développement personnel",
            "S'ÉDUQUER - Coaching & mentorat communautaire",
            "CRÉER - EZRA – Niveau Basique",
            "PROTÉGER - Finstrategia Essentiel (tarif préférentiel)",
            "MULTIPLIER au choix - SYNEX – Premier package 100 % crédité sur le compte du client (sans dépôt de garantie – plafonné à 1 499 $)",
            "MULTIPLIER au choix - OU KRONEX – Capital possible jusqu'à 2 x le montant du package",
            "PROFITER - Luxia – Pass Accès (avec participation)",
            "PROFITER - LeadX",
            "PROFITER - Élan",
        ),
        1, 'Production', 0, 'cat-club',
        'one_time', None, 10.0, 1, 'USD', 'Prestige', 'one_time', 0, 900.0
    ),

    # PREMIUM — 1 600 € / 500 BV
    (
        'pkg-club-premium', 'Premium', 'club-premium',
        1600.0, 500.0,
        'Structurer • Activer • Commencer à exploiter',
        feat(
            "S'ÉDUQUER - Campus LEADER (accès partiel)",
            "S'ÉDUQUER - Will Be Coaching",
            "S'ÉDUQUER - Sélection de formations certifiantes",
            "S'ÉDUQUER - Formation certifiante RS7004 – Création d'entreprise ou RS7311 – Intelligence Artificielle",
            "CRÉER - EZRA – Niveau basique",
            "CRÉER - Signaux de trading",
            "CRÉER - Sessions de trading en direct",
            "PROTÉGER - Finstrategia Essential (tarif préférentiel)",
            "PROTÉGER - Will Be Pay (dès lancement)",
            "MULTIPLIER au choix - SYNEX – Premier package 100 % crédité sur votre compte (plafonné à 1 000 $)",
            "PROFITER - Luxia – Pass Accès (avec participation)",
            "PROFITER - LeadX",
            "PROFITER - Élan",
        ),
        1, 'Production', 0, 'cat-club',
        'one_time', None, 10.0, 2, 'EUR', 'Premium', 'one_time', 0, 500.0
    ),

    # PREMIUM PLUS — 3 200 € / 1 100 BV
    (
        'pkg-club-premium-plus', 'Premium Plus', 'club-premium-plus',
        3200.0, 1100.0,
        'Accélérer • Sécuriser • Multiplier',
        feat(
            "S'ÉDUQUER - Campus LEADER (accès complet)",
            "S'ÉDUQUER - Will Be Coaching",
            "S'ÉDUQUER - Choix entre 2 formations certifiantes : RS7004 – Création d'entreprise",
            "S'ÉDUQUER - RS7311 – Intelligence Artificielle",
            "S'ÉDUQUER - RS7200 – Communiquer sur les réseaux sociaux",
            "S'ÉDUQUER - RS6685 – Créer et gérer un site internet",
            "CRÉER - EZRA – Niveau Intermédiaire",
            "CRÉER - Signaux de trading (2 classes d'actifs, maximum 5/jour)",
            "CRÉER - Trading en direct",
            "PROTÉGER - Finstrategia Essential (tarif préférentiel)",
            "PROTÉGER - Will Be Pay (dès lancement)",
            "MULTIPLIER au choix - SYNEX – Premier package 100 % crédité sur votre compte (plafonné à 3 000 $)",
            "MULTIPLIER au choix - KRONEX – Investissement jusqu'à 3 000 $",
            "PROFITER - Luxia – Pass Accès",
            "PROFITER - LeadX",
            "PROFITER - Élan",
            "PROFITER - Eventys",
        ),
        1, 'Pinnacle', 0, 'cat-club',
        'one_time', None, 10.0, 3, 'EUR', 'Premium Plus', 'one_time', 0, 1100.0
    ),

    # PREMIUM EXECUTIVE — 4 800 € / 1 700 BV
    (
        'pkg-club-premium-executive', 'Premium Executive', 'club-premium-executive',
        4800.0, 1700.0,
        'Déployer • Influencer • Vision long terme',
        feat(
            "S'ÉDUQUER - Campus LEADER (accès complet)",
            "S'ÉDUQUER - Will Be Coaching",
            "S'ÉDUQUER - Choix entre 3 formations certifiantes : RS7004 – Création d'entreprise",
            "S'ÉDUQUER - RS7311 – Intelligence Artificielle",
            "S'ÉDUQUER - RS7200 – Communiquer sur les réseaux sociaux",
            "S'ÉDUQUER - RS6685 – Créer et gérer un site internet",
            "CRÉER - EZRA – Niveau Avancé",
            "CRÉER - Signaux illimités",
            "CRÉER - Formations complètes",
            "CRÉER - Trading en direct",
            "CRÉER - Coaching de groupe",
            "CRÉER - 1 coaching individuel",
            "CRÉER - Accès au groupe privé",
            "PROTÉGER - Finstrategia Essential (accompagnement renforcé)",
            "PROTÉGER - Will Be Pay (dès lancement)",
            "MULTIPLIER au choix - SYNEX – Premier package 100 % crédité sur votre compte (plafonné à 4 500 $)",
            "MULTIPLIER au choix - KRONEX – Investissement jusqu'à 6 000 $",
            "PROFITER - Luxia – Pass Signature (avec participation)",
            "PROFITER - LeadX",
            "PROFITER - Élan",
            "PROFITER - Eventys",
        ),
        1, 'Pinnacle', 0, 'cat-club',
        'one_time', None, 10.0, 4, 'EUR', 'Premium Executive', 'one_time', 0, 1700.0
    ),

    # ── LUXIA ────────────────────────────────────────────────────────────────
    # PASS ACCÈS — 99 € / mois / 500 points
    (
        'pkg-luxia-pass-acces', 'Pass Accès', 'luxia-pass-acces',
        99.0, 0.0,
        'Pour ceux qui commencent leur voyage LUXIA.',
        feat(
            "Accès plateforme complète",
            "Wallet Luxia inclus",
            "Points x1 par euro dépensé",
            "Marketplace LEADX",
            "Dream Experience basique",
            "STARS Investissement",
        ),
        1, 'Production', 0, 'cat-luxia',
        'monthly', 99.0, 10.0, 1, 'EUR', 'Pass Accès', 'subscription', 500, 0.0
    ),

    # SIGNATURE — 149 € / mois / 2 000 points
    (
        'pkg-luxia-signature', 'Signature', 'luxia-signature',
        149.0, 0.0,
        'L\'expérience LUXIA dans sa version la plus complète.',
        feat(
            "Tout du Pass Accès",
            "Points x3 par euro dépensé",
            "Conciergerie dédiée 24/7",
            "DreamPass complet – jusqu'à 100%",
            "DreamTour & DreamWelcome",
            "Invitations évènements exclusifs",
            "Support prioritaire immédiat",
        ),
        1, 'Pinnacle', 0, 'cat-luxia',
        'monthly', 149.0, 10.0, 2, 'EUR', 'Signature', 'subscription', 2000, 0.0
    ),

    # ── EZRA ─────────────────────────────────────────────────────────────────
    # PACK DÉBUTANT — 49 $ / mois
    (
        'pkg-ezra-debutant', 'Pack Débutant', 'ezra-debutant',
        49.0, 0.0,
        'Accès signaux forex et formations débutant.',
        feat(
            "5 trades/Semaine sur le forex",
            "Accès à la communauté débutant",
            "Formation débutant (MindX)",
            "QuantX",
            "LexicounT",
            "Nos partenaires",
            "Réservez un appel (coaching)",
        ),
        1, 'Production', 0, 'cat-ezra',
        'monthly', 49.0, 10.0, 1, 'USD', 'Pack Débutant', 'subscription', 0, 0.0
    ),

    # PACK AVANCÉ — 79 $ / mois
    (
        'pkg-ezra-avance', 'Pack Avancé', 'ezra-avance',
        79.0, 0.0,
        'Accès signaux avancés et formations MindX niveau supérieur.',
        feat(
            "10 Trades/semaine",
            "Accès à la communauté Avancée",
            "Formation Avancée (MindX)",
            "Leadership",
            "Télé Formation",
            "KroneX",
            "QuantX",
            "Optimax",
            "Réservez un appel (coaching)",
            "Nos partenaires",
            "LexicounT",
        ),
        1, 'Production', 0, 'cat-ezra',
        'monthly', 79.0, 10.0, 2, 'USD', 'Pack Avancé', 'subscription', 0, 0.0
    ),

    # PACK EXPERT — 99 $ / mois
    (
        'pkg-ezra-expert', 'Pack Expert', 'ezra-expert',
        99.0, 0.0,
        'Accès complet à tous les trades et services Ezra.',
        feat(
            "Accès à tous les trades et services Ezra",
            "Accès complet à MindX pour toutes les formations",
            "KroneX",
            "LexicounT",
            "Leadership",
            "Mindset du trader",
            "Télé Formation",
            "OptimaX",
            "DynamiX",
            "Notre communauté",
            "Nos partenaires",
            "Réservez un appel (coaching)",
        ),
        1, 'Pinnacle', 0, 'cat-ezra',
        'monthly', 99.0, 10.0, 3, 'USD', 'Pack Expert', 'subscription', 0, 0.0
    ),
]

conn.executemany("""
INSERT INTO packages
  (id, name, slug, price_usd, bv_value, description, features, is_active,
   type, includes_license, category_id, pricing_type, price_monthly,
   direct_commission_rate, display_order, currency, title, payment_mode,
   dreamiles_per_payment, bv_per_payment)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
""", packages)
conn.commit()
print(f"[3] {len(packages)} packages insérés")

# ===========================================================================
# 4. Membres
# ===========================================================================
members = [
    ('mbr-001','LN00001','alice@test.com', MEMBER_HASH,
     'Alice','Martin', None, None, None,
     'Partenaire','Director', 1, 0, 0.0,0.0,0.0,
     'Production', 1, 1, 1),
    ('mbr-002','LN00002','bob@test.com', MEMBER_HASH,
     'Bob','Dupont', 'mbr-001','mbr-001','L',
     'Partenaire','Manager', 1, 0, 0.0,0.0,0.0,
     'Production', 1, 1, 1),
    ('mbr-003','LN00003','carol@test.com', MEMBER_HASH,
     'Carol','Bernard', 'mbr-001','mbr-001','R',
     'Partenaire','none', 1, 0, 0.0,0.0,0.0,
     'Production', 1, 1, 1),
    ('mbr-004','LN00004','david@test.com', MEMBER_HASH,
     'David','Leroy', 'mbr-002','mbr-002','L',
     'Partenaire','none', 1, 0, 0.0,0.0,0.0,
     'Production', 1, 1, 1),
    ('mbr-005','LN00005','eva@test.com', MEMBER_HASH,
     'Eva','Simon', 'mbr-002','mbr-002','R',
     'Partenaire','none', 1, 0, 0.0,0.0,0.0,
     'Production', 1, 1, 1),
    ('mbr-006','LN00006','frank@test.com', MEMBER_HASH,
     'Frank','Moreau', 'mbr-003', None, None,
     'Membre','none', 0, 1, 0.0,0.0,0.0,
     None, 0, 0, 0),
]
conn.executemany("""
INSERT INTO members
  (id, unique_id, email, password_hash,
   first_name, last_name, sponsor_id, binary_parent_id, binary_position,
   member_status, current_rank, license_active, in_holding_tank,
   wallet_balance, credit_croissance, reserve_strategique,
   package_type, package_purchased, activation_done, admin_fee_paid,
   created_at, updated_at)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
""", members)
conn.execute("UPDATE members SET binary_left_id='mbr-002', binary_right_id='mbr-003' WHERE id='mbr-001'")
conn.execute("UPDATE members SET binary_left_id='mbr-004', binary_right_id='mbr-005' WHERE id='mbr-002'")
conn.commit()
print(f"[4] {len(members)} membres insérés")

# ===========================================================================
# 5. Wallets
# ===========================================================================
wallets = [
    ('wal-001','mbr-001', 1250.0, 3500.0, 2250.0),
    ('wal-002','mbr-002',  450.0,  800.0,  350.0),
    ('wal-003','mbr-003',  125.0,  200.0,   75.0),
    ('wal-004','mbr-004',    0.0,    0.0,    0.0),
    ('wal-005','mbr-005',    0.0,    0.0,    0.0),
    ('wal-006','mbr-006',    0.0,    0.0,    0.0),
]
conn.executemany("""
INSERT INTO wallets
  (id, member_id, balance, total_earned, total_withdrawn, pending_balance, updated_at)
VALUES (?,?,?,?,?,0,datetime('now'))
""", wallets)
conn.commit()
print(f"[5] {len(wallets)} wallets insérés")

# ===========================================================================
# 6. Dreamiles
# ===========================================================================
dreamiles = [
    ('drm-001','mbr-001', 5000,5000,0,0),
    ('drm-002','mbr-002',  500, 500,0,0),
    ('drm-003','mbr-003',  200, 200,0,0),
    ('drm-004','mbr-004',    0,   0,0,0),
    ('drm-005','mbr-005',    0,   0,0,0),
    ('drm-006','mbr-006',    0,   0,0,0),
]
conn.executemany("""
INSERT INTO dreamiles_wallet
  (id, member_id, dreamiles, total_earned, total_converted, total_expired,
   created_at, updated_at)
VALUES (?,?,?,?,?,?,datetime('now'),datetime('now'))
""", dreamiles)
conn.commit()
print(f"[6] {len(dreamiles)} dreamiles_wallet insérés")

# ===========================================================================
# 7. Holding tank
# ===========================================================================
conn.execute("DELETE FROM holding_tank")
conn.execute("""
INSERT INTO holding_tank (member_id, sponsor_id, created_at)
VALUES ('mbr-006','mbr-003',datetime('now'))
""")
conn.commit()
print("[7] holding_tank insere (Frank)")

# ===========================================================================
# 8. WAL checkpoint + vérification
# ===========================================================================
conn.execute("PRAGMA foreign_keys = ON")
conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
conn.commit()

print("\n=== VERIFICATION FINALE ===")
for t in ['admin_users','package_categories','packages','members','wallets','dreamiles_wallet','holding_tank']:
    n = conn.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
    print(f"  {t:30} : {n}")

print("\n=== PACKAGES PAR CATEGORIE ===")
for row in conn.execute("""
    SELECT c.name, p.name, p.currency, p.price_usd, p.bv_value,
           p.payment_mode, p.dreamiles_per_payment
    FROM packages p
    JOIN package_categories c ON c.id = p.category_id
    ORDER BY c.display_order, p.display_order
"""):
    drm = f" | {row[6]} DRM" if row[6] > 0 else ""
    print(f"  {row[0]:42} | {row[1]:20} | {row[2]}{row[3]:8.0f} | BV:{row[4]:7.1f} | {row[5]}{drm}")

conn.close()
print("\nSeed termine avec succes")
