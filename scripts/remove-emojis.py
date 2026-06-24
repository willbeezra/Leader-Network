#!/usr/bin/env python3
"""
Supprime tous les emojis des fichiers JS publics.
- Conserve les drapeaux de pays (🇦-🇿) utilisés dans le sélecteur de pays
- Conserve les séparateurs ─ et ═ (caractères de box-drawing, pas des emojis)
- Remplace les emojis visuels par leur équivalent texte ou les supprime
"""

import re
import sys

# Remplacement contextuel — ordre important (plus spécifique d'abord)
REPLACEMENTS = [
    # Statuts avec label — on garde le label, retire l'emoji
    ('Validé ✓',        'Validé'),
    ('✓ Actif',         'Actif'),
    ('✗ Inactif',       'Inactif'),
    ('✓ Vérifié',       'Vérifié'),
    ('✗ ',              ''),
    ('✓ ',              ''),
    (' ✓',              ''),
    (' ✗',              ''),
    ('✓',               ''),
    ('✗',               ''),
    # Checkmarks & croix standalone
    ('✅ 100% libéré',  '100% libéré'),
    ('✅ Commission entièrement libérée', 'Commission entièrement libérée'),
    ('Renouvellement confirmé ✅', 'Renouvellement confirmé'),
    ('Wallet ✅',        'Wallet'),
    ('Trio confirmé ✅', 'Trio confirmé'),
    ('✅',               ''),
    ('❌',               ''),
    # Pin localisation sur carte génération
    ("'📍 '",           "''"),
    ('📍 ',             ''),
    ('📍',              ''),
    # Toast étoile
    ("'⭐ Merci pour votre excellent retour !'", "'Merci pour votre excellent retour !'"),
    ('⭐',              ''),
    # Admin tabs/sections — on garde le label texte
    ("stats:'📊 Statistiques'",       "stats:'Statistiques'"),
    ("renewals:'🔄 Renouvellements'", "renewals:'Renouvellements'"),
    ("trio:'🏦 Liste Trio'",          "trio:'Liste Trio'"),
    ("config:'⚙️ Configuration'",    "config:'Configuration'"),
    # Options select subscription
    ('Trio en attente 🕐',  'Trio en attente'),
    ('Suspendu ❌',         'Suspendu'),
    ('Échoué ❌',           'Échoué'),
    # Icône i18n placeholder
    ("placeholder=\"🌐\"", 'placeholder=""'),
    ("value=\"🌐\"",        'value=""'),
    ("|| '🌐'",            "|| ''"),
    # Icône Trio en header admin
    ("text-2xl shrink-0\">🏦</div>", 'text-2xl shrink-0"></div>'),
    # Commentaire dev (ligne entière non visible)
    ('// ⚡ Toute modification',     '// Toute modification'),
    ('⚡',               ''),
    # Confirm supprimer package
    ("'⚠️ Supprimer",  "'Supprimer"),
    ('⚠️',             ''),
    ('⚠',              ''),
    ('⚙️',             ''),
    ('⚙',              ''),
    # Fallback logo_emoji payment method
    ("logo_emoji||'💳'", "logo_emoji||''"),
    ('💳',              ''),
    # Exemples codes créoles
    ('💡 Exemples',    'Exemples'),
    ('💡',             ''),
    ('📊',             ''),
    ('🔄',             ''),
    ('🌐',             ''),
    ('🏦',             ''),
    ('🕐',             ''),
    # Stat card dépôt insuffisant
    ("'Dépôt insuffisant ⚠️'", "'Dépôt insuffisant'"),
    ("deposited_insufficient:'⚠️ Dépôt insuffisant'", "deposited_insufficient:'Dépôt insuffisant'"),
]

def remove_emojis(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Appliquer les remplacements contextuels
    for old, new in REPLACEMENTS:
        content = content.replace(old, new)
    
    # Pattern de nettoyage final : emojis restants (hors drapeaux + box-drawing)
    # Drapeaux: \U0001F1E0-\U0001F1FF (Regional Indicator Symbol Letters)
    # Box-drawing: ─ ═ (U+2500-U+257F) — ce sont des char Unicode, pas des emojis
    emoji_cleanup = re.compile(
        '['
        '\U0001F300-\U0001F5FF'
        '\U0001F600-\U0001F64F'
        '\U0001F680-\U0001F6FF'
        '\U0001F700-\U0001F77F'
        '\U0001F780-\U0001F7FF'
        '\U0001F800-\U0001F8FF'
        '\U0001F900-\U0001F9FF'
        '\U0001FA00-\U0001FA6F'
        '\U0001FA70-\U0001FAFF'
        ']', flags=re.UNICODE)
    
    content = emoji_cleanup.sub('', content)
    
    # Compter les changements
    changed = content != original
    # Compter les emojis restants (hors drapeaux)
    remaining = emoji_cleanup.findall(content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return changed, remaining

files = [
    'public/static/member-app.js',
    'public/static/admin-app.js',
]

for f in files:
    changed, remaining = remove_emojis(f)
    status = '✔ modifié' if changed else '— inchangé'
    print(f'{f}: {status}')
    if remaining:
        print(f'  ⚠ emojis restants: {set(remaining)}')
    else:
        print(f'  OK — aucun emoji résiduel')

print('\nTerminé.')
