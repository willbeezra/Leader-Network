#!/usr/bin/env python3
import shutil

FILE = 'public/static/admin-app.js'
with open(FILE, 'rb') as f:
    content = f.read()

shutil.copy2(FILE, 'public/static/admin-app.js.bak_p3b')

# Pattern exact vu dans le hex dump position 228848:
# onclick="admClassicNavigateTo(\'${m}\')
# Bytes: 6f6e636c69636b3d22 61646d436c617373...
# repr: b'onclick="admClassicNavigateTo(\\\'${m}\\\')'

OLD = b"onclick=\"admClassicNavigateTo(\\'${m}\\')"
idx = content.find(OLD)
print("Pattern at:", idx)
if idx > 0:
    NEW = b"onclick=\"admTreeNodeClick(\\'${m}\\',\\'${e.first_name}\xc2\xb4${e.last_name}\\',\\'${e.unique_id}\\')"
    content = content[:idx] + NEW + content[idx+len(OLD):]
    print("Patche OK, delta:", len(NEW)-len(OLD))
    with open(FILE, 'wb') as f:
        f.write(content)
    print("Fichier ecrit, taille:", len(content))
else:
    print("Non trouve")
