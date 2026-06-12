#!/usr/bin/env python3
"""Fix the adminCoinPaymentsTest button in admin-app.js"""

with open('public/static/admin-app.js', 'rb') as f:
    content = f.read()

# The old block starts at position 469851 and is 300 bytes
start_pos = 469851
old_bloc = content[start_pos:start_pos+300]
print(f"Old bloc:\n{repr(old_bloc)}\n")

# Build new bloc using bytearray to avoid Python escaping issues
# In the JS template literal, the ternary string uses single quotes '...'
# Inside single-quoted strings, double quotes " do NOT need escaping
# So the correct version has raw " inside the button's attributes

# The ${...} wrapper: e.id=== needs \"coinpayments_api\" (2 backslashes + quote in file)
# because it's inside a template literal where " must be escaped as \"
# But wait - looking at the old bloc, it has \\\" (2 backslashes + quote) for the comparison too
# which means in the actual JS string it's \" → which in the template literal becomes "
# 
# Let me check: in the old bloc we see: \\\"coinpayments_api\\\"
# That's: backslash backslash quote = \\" in file → but that's inside a file that's JS
# The file is the JS source. In the JS source, the template literal is written as:
# `...${e.id==="coinpayments_api"?'<button...>':''}\n...`
# But since the whole file is minified and the template literal spans a long line,
# the \" we see in the raw file bytes are actual backslash+quote characters
# which ARE the JS source characters.
# 
# So in the JS source: e.id===\\"coinpayments_api\\" 
# means: e.id===\"coinpayments_api\" ... wait, we need to count carefully.
# 
# The file bytes for the comparison are: 5c 5c 22 (2 backslashes + quote = \\")
# In JS string literal context (inside template literal), \\" means: \ followed by "
# But in a template literal, we don't need to escape " at all!
# The template literal uses backticks, so " inside is fine.
# The \" inside a template literal is... just \" (backslash + quote).
# So e.id===\\"coinpayments_api\\" in JS source means e.id==="coinpayments_api" ? No...
# 
# Actually in a template literal `...` the " characters don't need escaping.
# The \\" in the source would be interpreted as \" (escaped quote) → which is just ".
# But \\\" would be \\ + " → a literal backslash followed by a quote.
#
# OK let me just look at what the file actually contains and what JS parses it as:
# The file has bytes: 5c 5c 22 c o i n p a y...
# In JS template literal: \\\" → \\ is an escaped backslash = one \ , then " is a literal "
# So the runtime string gets: \"coinpayments_api\" - wait that can't be right for comparison
#
# Let me reconsider. The old bloc starts at 469851 with these bytes:
# 24 7b 65 2e 69 64 3d 3d 3d 5c 5c 22 63 6f 69 6e...
# $ { e . i d = = = \ \ " c o i n ...
# In JS template literal, \\ is an escape sequence for a single backslash.
# So \\\" in a template literal means: \ (from \\) + " (literal) = \"
# That's a backslash-quote in the string... but the comparison e.id===\" won't match "coinpayments_api"
#
# WAIT. This is not in a template literal directly. Let me re-read the structure.
# The file is minified. The whole content of r() is built as a big template literal.
# Inside that template literal (between backticks), we have HTML.
# The HTML attributes use \" as the quote character (escaped in the template literal).
# So class=\"foo\" in the template literal means class="foo" in the rendered HTML.
# 
# The ${...} expression inside the template literal is evaluated as JS:
# ${e.id===\\"coinpayments_api\\"?'...':""}
# Wait, inside ${...} we're back in JS land, not template literal land.
# So inside ${}, the \\" is NOT an escape sequence, it's... 
# Actually inside ${} of a template literal, you write normal JS code.
# So if we write ${e.id==="coinpayments_api"?"yes":""} that's the correct form.
# The \\" we see in the file must be from the surrounding template literal escaping.
# 
# I think the minifier or previous code added \" for the comparisons because
# it thought they needed escaping. Let's just see what valid JS should look like
# and write that.
#
# CORRECT FORM for the whole renderer r() template:
# r=e=>{...return `
#   ...<div class="flex items-center gap-2">
#   ${e.id==="coinpayments_api"?'<button onclick="adminCoinPaymentsTest(this)" class="..."><i class="fas fa-plug mr-1"></i>Tester</button>':''}
#   <button onclick="saveGateway('${e.id}')" class="${r.btn}...">...
# `}
#
# In the minified file (template literal with escaped newlines as \n):
# The " inside the template literal (outside ${}) need escaping: \"
# The " inside ${} in a string literal '...' do NOT need escaping
# The \\n represents a literal newline in the template
#
# So the correct file bytes for the ternary expression:
# ${e.id===\"coinpayments_api\"?'<button onclick=\"adminCoinPaymentsTest(this)\" class=\"...\"><i class=\"fas fa-plug mr-1\"></i>Tester</button>':''}
# Wait - inside ${} we're in JS code, so the "..." should be escaped if they're 
# attribute values that will appear INSIDE THE TEMPLATE LITERAL HTML.
# But no - the ternary returns a string value, not template literal content.
# The '...' string is a JS string with single quotes.
# Inside '...', double quotes " are fine without escaping.
# And when the ternary evaluates, it returns the string and it gets interpolated.
# So the correct source is:
# ${e.id==="coinpayments_api"?'<button onclick="adminCoinPaymentsTest(this)" class="flex..."><i class="fas fa-plug mr-1"></i>Tester</button>':''}
# In the template literal file:
# The ${e.id==="coinpayments_api"...} - inside ${}, the " are normal, no escaping needed
# The '...' string has " which are normal in single-quoted strings

# So the correct bytes for the whole ternary are simply:
new_bloc = bytearray()
new_bloc += b'${e.id==="coinpayments_api"?'
new_bloc += b"'"
new_bloc += b'<button onclick="adminCoinPaymentsTest(this)" '
new_bloc += b'class="flex items-center gap-2 bg-dark-700 border border-orange-500/30 text-orange-300 hover:bg-orange-900/30 font-medium px-3 py-2 rounded-xl text-sm transition">'
new_bloc += b'<i class="fas fa-plug mr-1"></i>Tester</button>'
new_bloc += b"'"
new_bloc += b":''"
new_bloc += b'}'

print(f"New bloc ({len(new_bloc)} bytes):\n{repr(bytes(new_bloc))}\n")

# Apply replacement
new_content = content[:start_pos] + bytes(new_bloc) + content[start_pos+300:]
print(f"Original size: {len(content)}")
print(f"New size: {len(new_content)}")

# Write
with open('public/static/admin-app.js', 'wb') as f:
    f.write(new_content)
print("File written.")
