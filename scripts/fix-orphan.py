# -*- coding: utf-8 -*-

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove the orphaned code: lines 2763 (empty after updateAdminPassword}) to 2775 (orphaned editAdminCarEntry2 tail)
# Keep: lines 1-2762 + addCustomPriceInput2 + INIT

output = lines[:2762]  # Up to end of updateAdminPassword

# Add addCustomPriceInput2 and INIT
output.append('\n')
output.append('        function addCustomPriceInput2(price, count) {\n')
output.append('            adminCustomPricesData[\'custom_\' + Date.now()] = { price: price, count: count };\n')
output.append('            renderCarEntry();\n')
output.append('        }\n')
output.append('\n')
output.append('        // ==================== INIT ====================\n')
output.append('        populateLoginDropdown();\n')
output.append('    </script>\n')
output.append('</body>\n')
output.append('</html>\n')

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(output)

# Verify
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

js_s = content.find('<script>')
js_e = content.rfind('</script>')
js = content[js_s:js_e]
print(f"Lines: {content.count(chr(10)) + 1}")
print(f"Braces: {js.count('{')}/{js.count('}')}, diff: {js.count('{') - js.count('}')}")
print(f"Parens: {js.count('(')}/{js.count(')')}, diff: {js.count('(') - js.count(')')}")
print(f"Brackets: {js.count('[')}/{js.count(']')}")

# Check no duplicates
import re
funcs = []
for line in content.split('\n'):
    m = re.match(r'\s+function (\w+)', line)
    if m:
        funcs.append(m.group(1))
from collections import Counter
dupes = {k: v for k, v in Counter(funcs).items() if v > 1}
print(f"Duplicates: {dupes if dupes else 'None'}")
