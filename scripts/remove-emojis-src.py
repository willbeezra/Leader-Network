#!/usr/bin/env python3
import re, glob

# Pattern corrigé — ranges valides seulement
EMOJI_RE = re.compile(
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
    '\u2600-\u26FF'
    '\u2700-\u27BF'
    ']',
    flags=re.UNICODE
)

SPECIFIC = [
    (' ✓', ''), (' ✗', ''),
    ('✓ ', ''), ('✗ ', ''),
    ('✓', ''), ('✗', ''),
    ('★★★★★', ''), ('★', ''),
    ('✦', ''), ('🗑', ''),
]

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for old, new in SPECIFIC:
        content = content.replace(old, new)
    content = EMOJI_RE.sub('', content)
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

files = (
    glob.glob('src/**/*.ts', recursive=True) +
    glob.glob('src/**/*.tsx', recursive=True) +
    ['public/admin.html']
)

for f in sorted(files):
    try:
        changed = clean_file(f)
        print(f'{"MOD" if changed else "---"} {f}')
    except Exception as e:
        print(f'ERR {f}: {e}')

print('\nTerminé.')
