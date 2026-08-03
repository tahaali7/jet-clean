#!/usr/bin/env python3
# Fix the broken single-quote issue in line 2621 of get-clean-employee.html
# The line: '<button onclick="closeModal('closingModal')" ...>'
# Should be: '<button onclick="closeModal(\'closingModal\')" ...>'

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: replace the broken closeModal call in the JS string concatenation
# The problematic pattern is: closeModal('closingModal') inside a single-quoted JS string
old = "closeModal('closingModal')"
new = "closeModal(\\'closingModal\\')"

# Only fix line 2621 area (inside renderClosingModalBody)
# The problematic line is:
# '<button onclick="closeModal('closingModal')" class=...>'
# We need to change the inner quotes to escaped

old_line = "'<button onclick=\"closeModal('closingModal')\" class=\"flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm\">\u0625\u063a\u0644\u0627\u0642</button>' +"
new_line = "'<button onclick=\"closeModal(\\'closingModal\\')\" class=\"flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm\">\u0625\u063a\u0644\u0627\u0642</button>' +"

count = content.count(old_line)
print(f"Found {count} occurrences of the broken line")

if count > 0:
    content = content.replace(old_line, new_line)
    print("Fixed!")
else:
    # Try alternative approach - find by line content
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if "closeModal('closingModal')" in line and 'renderClosingModalBody' not in line:
            print(f"Found broken line at index {i} (line {i+1}): {line.strip()[:80]}")
            lines[i] = line.replace("closeModal('closingModal')", "closeModal(\\'closingModal\\')")
            print(f"Fixed line {i+1}")
    content = '\n'.join(lines)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
