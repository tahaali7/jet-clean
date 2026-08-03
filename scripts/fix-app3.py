# -*- coding: utf-8 -*-

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix admin renderTreasury - add treasury show after it
old_admin = """                renderTreasury(branchName, date, grandTotalAmount, workerExpTotal);
                grandCard.classList.remove('hidden');
                return;
            }

            // === EMPLOYEE MODE ==="""

new_admin = """                renderTreasury(branchName, date, grandTotalAmount, workerExpTotal);
                // إظهار الخزينة للمسؤول
                document.getElementById('workerExpTreasuryRow').classList.remove('hidden');
                var treasurySection = document.querySelector('#workerExpTreasuryRow > div > div:nth-child(2)');
                if (treasurySection) treasurySection.style.display = '';
                grandCard.classList.remove('hidden');
                return;
            }

            // === EMPLOYEE MODE ==="""

if old_admin in content:
    content = content.replace(old_admin, new_admin)
    print("OK: Added treasury show for admin mode")
else:
    print("FAIL: Could not find admin block")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
