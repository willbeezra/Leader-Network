#!/usr/bin/env python3
"""
Audit & suppression exhaustive de tous les emojis/symboles visuels du projet.
Préserve uniquement les drapeaux de pays (Regional Indicator \U0001F1E0-\U0001F1FF).
"""
import re, glob

# ── Pattern ultra-large ────────────────────────────────────────────────────
EMOJI_RE = re.compile(
    '['
    '\U0001F000-\U0001F1DF'   # SMP jusqu'aux drapeaux (exclus)
    '\U0001F1F0-\U0001FFFF'   # SMP après drapeaux
    '\u2300-\u23FF'            # Misc Technical (⏳⌚ etc)
    '\u2400-\u24FF'            # Enclosed Alphanumerics
    '\u2500-\u257F'            # Box Drawing (─═) — on les garde? NON, on les exclut du pattern
    '\u2580-\u259F'            # Block elements
    '\u25A0-\u25FF'            # Geometric shapes (●○)
    '\u2600-\u26FF'            # Misc symbols (⭐⚠⚡⛔)
    '\u2700-\u27BF'            # Dingbats (✓✗★✦)
    '\u2B00-\u2BFF'            # Misc symbols/arrows
    ']',
    flags=re.UNICODE
)

# Box-drawing chars à préserver (─ ═ et famille)
BOX_DRAWING_RE = re.compile('[\u2500-\u257F]+')

def is_box_drawing_only(s):
    return bool(BOX_DRAWING_RE.fullmatch(s))

# ── Remplacements contextuels spécifiques (ordre : plus long d'abord) ─────
SPECIFIC = [
    # member-app.js — icône fa-crown sur message "abonnement supérieur"
    ('<i class="fas fa-crown mr-1.5 text-yellow-400"></i>Vous avez déjà un abonnement supérieur',
     'Vous avez déjà un abonnement supérieur'),

    # admin.html — symboles divers
    ('⏳ En attente',      'En attente'),
    ('⏳ HOLDING',         'HOLDING'),
    ('● Vue actuelle',     'Vue actuelle'),
    # ○ dans SVG — remplacer par un cercle SVG ou rien
    ('>○<',               '><'),
    # ⌂ bouton "home" — remplacer par texte
    ('">⌂</button>',      '"><i class="fas fa-home"></i></button>'),

    # admin-landing.js — étoiles notation
    ("'★'.repeat(t.rating)",        "'★'.repeat(t.rating)".replace('★','*')),
    ("'★'.repeat(5 - t.rating)",    "'★'.repeat(5 - t.rating)".replace('★','*')),
    ("'★'.repeat(",                 "'*'.repeat("),
    ('★',                           ''),
    ("'⭐ Mis en avant'",            "'Mis en avant'"),
    ('⭐',                           ''),
    ('"⚡ ',                         '"'),
    ("'⚡ ",                         "'"),
    ('⚡',                           ''),

    # country-selector.js — globe de reset
    (">🌍</span>'",                 "></span>'"),
    ("= '🌍'",                      "= ''"),
    ('🌍',                          ''),

    # i18n.js — globe fallback + spinner + loupe
    ("|| { flag: '🌐',",            "|| { flag: '',"),
    ("'⏳ Chargement…'",             "'Chargement…'"),
    ("'🔍 Rechercher…'",             "'Rechercher…'"),
    ('🌐',                           ''),
    ('⏳',                           ''),
    ('🔍',                           ''),

    # mlm.ts — notifications texte
    ("'⏳ Crédit de Croissance expiré'",     "'Crédit de Croissance expiré'"),
    ("'⏳ Renouvellement en attente'",        "'Renouvellement en attente'"),

    # support.ts — note qualité
    ('⭐ Note qualité',              'Note qualité'),

    # Fallback générique
    (' ✓', ''), (' ✗', ''), ('✓ ', ''), ('✗ ', ''),
    ('✓', ''), ('✗', ''),
    ('★', ''), ('✦', ''),
]

def clean(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content

    for old, new in SPECIFIC:
        content = content.replace(old, new)

    # Nettoyage regex final — préserve le box-drawing
    def replacer(m):
        s = m.group(0)
        # Préserver box-drawing
        if is_box_drawing_only(s):
            return s
        # Préserver drapeaux de pays (deux Regional Indicator consécutifs)
        if all('\U0001F1E0' <= c <= '\U0001F1FF' for c in s):
            return s
        return ''

    content = EMOJI_RE.sub(replacer, content)

    changed = content != original
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
    return changed

# ── Fichiers à traiter ────────────────────────────────────────────────────
files = sorted(set(
    glob.glob('src/**/*.ts', recursive=True) +
    glob.glob('src/**/*.tsx', recursive=True) +
    glob.glob('public/**/*.js', recursive=True) +
    glob.glob('public/**/*.html', recursive=True)
))

for f in files:
    try:
        changed = clean(f)
        print(f'{"MOD" if changed else "---"} {f}')
    except Exception as e:
        print(f'ERR {f}: {e}')

print('\nTerminé.')
