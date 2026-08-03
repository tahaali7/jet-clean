# -*- coding: utf-8 -*-
"""
Remove duplicate functions from the file.
Keep lines 1-2536, then only append NEW functions (not duplicates).
"""

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Functions that already exist in the first part (lines 1-2536)
import re
first_funcs = set()
for i in range(2536):
    m = re.match(r'\s+function (\w+)', lines[i])
    if m:
        first_funcs.add(m.group(1))

# Build output: keep first part + new functions only
output = lines[:2536]  # Keep everything up to end of exportCarEntryPDF

# Process remaining lines, skip duplicate functions
skip_until_next = False
for i in range(2536, len(lines)):
    m = re.match(r'\s+function (\w+)', lines[i])
    if m:
        if m.group(1) in first_funcs:
            # Skip this duplicate function
            skip_until_next = True
            continue
        else:
            # New function - keep it
            skip_until_next = False
            output.append(lines[i])
    elif skip_until_next and lines[i].strip() == '}':
        # End of a duplicate function
        skip_until_next = False
        continue
    elif skip_until_next:
        continue
    else:
        output.append(lines[i])

# Ensure INIT section is at the end
init_line = '        populateLoginDropdown();'
has_init = any(init_line in line for line in output)
if not has_init:
    output.append('\n        // ==================== INIT ====================\n')
    output.append('        populateLoginDropdown();\n')

# Add closing tags if missing
last_lines = ''.join(output[-10:])
if '</script>' not in last_lines:
    output.append('    </script>\n</body>\n</html>\n')

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(output)

# Verify
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Total lines: {content.count(chr(10)) + 1}")

# Check for remaining duplicates
funcs = []
for i, line in enumerate(content.split('\n')):
    m = re.match(r'\s+function (\w+)', line)
    if m:
        funcs.append((i+1, m.group(1)))

from collections import Counter
names = [f[1] for f in funcs]
dupes = {k: v for k, v in Counter(names).items() if v > 1}

if dupes:
    print(f"REMAINING DUPLICATES: {dupes}")
else:
    print("No duplicates!")

# Check JS balance
js_s = content.find('<script>')
js_e = content.rfind('</script>')
js = content[js_s:js_e]
print(f"Braces: {js.count('{')}/{js.count('}')}, Parens: {js.count('(')}/{js.count(')')}")
print(f"Ends with </html>: {'</html>' in content}")
