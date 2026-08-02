# -*- coding: utf-8 -*-
import re

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# 1. Fix oninput argument bug in renderTreasury
#    The oninput calls pass key and branchName as ONE string argument
#    Current pattern in file: onTreasuryFieldChange(\'  + key + , \'  + branchName + \')
#    This produces HTML: onTreasuryFieldChange('value1, value2') - ONE arg
#    Fix: onTreasuryFieldChange(\'  + key + \',\'  + branchName + \')
#    This produces HTML: onTreasuryFieldChange('value1','value2') - TWO args
# ============================================================

lines = content.split('\n')
fixed_lines = []
for i, line in enumerate(lines):
    if 'onTreasuryFieldChange' in line and 'oninput' in line:
        print(f"Line {i+1}: found oninput with onTreasuryFieldChange")
        # The bug: the comma is inside the quotes making one string arg
        # Replace: ', \'  (which is JS string: , ')
        # With:    \',\' (which is JS string: ',')

        # In raw file bytes, ', \' appears as these exact chars:
        # '  ,  \  '
        # We need: \  '  ,  \  '
        # But we only want to change it in the onTreasuryFieldChange context

        # The specific pattern: + ', \' +
        # Replace with: + '\',\' +
        old_part = ", \\'"
        new_part = "\\',\\'"
        if old_part in line:
            line = line.replace(old_part, new_part)
            print(f"  -> Fixed oninput arguments!")
            fixed_lines.append(line)
            continue
        else:
            print(f"  -> Pattern not found, checking raw bytes...")
            idx = line.find("onTreasuryFieldChange")
            if idx >= 0:
                segment = line[idx:idx+150]
                for j, ch in enumerate(segment):
                    if ch in ("'", "\\", ","):
                        print(f"    char[{j}] = {repr(ch)} (0x{ord(ch):02x})")
    fixed_lines.append(line)

content = '\n'.join(fixed_lines)
print()

# ============================================================
# 2. Show treasury for admin in employee screen
# ============================================================

# Search for the admin renderTreasury call
admin_patterns = [
    'renderTreasury(branchName, date, grandTotalAmount, workerExpTotal)',
]
for pat in admin_patterns:
    idx = content.find(pat)
    if idx >= 0:
        # Get context around it
        ctx_start = max(0, idx - 200)
        ctx_end = min(len(content), idx + 300)
        ctx = content[ctx_start:ctx_end]
        # Find the line
        line_start = content.rfind('\n', 0, idx) + 1
        line_end = content.find('\n', idx)
        line_text = content[line_start:line_end]
        print(f"Admin renderTreasury line: {repr(line_text.strip())}")

# The admin block: we need to add treasury section show after renderTreasury
# Look for the pattern near the admin renderTreasury
old_admin_block = """renderTreasury(branchName, date, grandTotalAmount, workerExpTotal);
            grandCard.classList.remove('hidden');
            return;"""

new_admin_block = """renderTreasury(branchName, date, grandTotalAmount, workerExpTotal);
            // إظهار الخزينة للمسؤول
            document.getElementById('workerExpTreasuryRow').classList.remove('hidden');
            var treasurySection = document.querySelector('#workerExpTreasuryRow > div > div:nth-child(2)');
            if (treasurySection) treasurySection.style.display = '';
            grandCard.classList.remove('hidden');
            return;"""

# But there might be multiple occurrences (admin mode + employee mode)
# The admin one is the one followed by "return;" in the adminMode block
# Let's count occurrences
count = content.count(old_admin_block)
print(f"Found '{old_admin_block}' {count} times")

# Replace only the first occurrence (admin mode)
content = content.replace(old_admin_block, new_admin_block, 1)
print("OK: Added treasury show for admin mode")

# ============================================================
# Save
# ============================================================
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n=== Phase 2 fixes completed ===")
