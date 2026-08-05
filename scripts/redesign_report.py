#!/usr/bin/env python3
"""Redesign the PDF report builder functions for a more professional look."""

import re

filepath = '/home/z/my-project/src/app/page.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# =============================================
# 1. Replace buildRoomTableHTML (line 137 to end of function)
# =============================================

old_buildRoom = '''function buildRoomTableHTML(room: string, roomEntries: CarEntry[], branchName: string) {
  const prices = getPricesForRoom(room)
  let roomTotalAmount = 0
  let roomTotalCars = 0
  let roomExtraCars = 0
  let roomExtraAmount = 0
  const mergedCounts: Record<string, number> = {}
  const mergedCustoms: Record<string, { price: number; count: number }> = {}

  roomEntries.forEach(entry => {'''

new_buildRoom = '''function buildRoomTableHTML(room: string, roomEntries: CarEntry[], branchName: string) {
  const prices = getPricesForRoom(room)
  let roomTotalAmount = 0
  let roomTotalCars = 0
  let roomExtraCars = 0
  let roomExtraAmount = 0
  const mergedCounts: Record<string, number> = {}
  const mergedCustoms: Record<string, { price: number; count: number }> = {}

  roomEntries.forEach(entry => {'''

# We need a more targeted approach - replace the whole function between markers
# Find the function start and end
start_marker = "function buildRoomTableHTML(room: string, roomEntries: CarEntry[], branchName: string) {"
end_marker = "\n}\n\nfunction buildEmptyRoomTableHTML"

start_idx = content.index(start_marker)
end_idx = content.index(end_marker, start_idx)

new_function = '''function buildRoomTableHTML(room: string, roomEntries: CarEntry[], branchName: string) {
  const prices = getPricesForRoom(room)
  let roomTotalAmount = 0
  let roomTotalCars = 0
  let roomExtraCars = 0
  let roomExtraAmount = 0
  const mergedCounts: Record<string, number> = {}
  const mergedCustoms: Record<string, { price: number; count: number }> = {}

  roomEntries.forEach(entry => {
    prices.forEach(price => {
      const count = (entry.priceCounts && entry.priceCounts[price]) || 0
      mergedCounts[price] = (mergedCounts[price] || 0) + count
    })
    if (entry.customPrices) {
      Object.keys(entry.customPrices).forEach(key => {
        const item = entry.customPrices[key]
        if (mergedCustoms[key]) {
          mergedCustoms[key].count += item.count
        } else {
          mergedCustoms[key] = { price: item.price, count: item.count }
        }
      })
    }
    roomTotalAmount += entry.totalAmount
    roomTotalCars += entry.totalCars
    roomExtraCars += (entry.extraCars || 0)
    roomExtraAmount += (entry.extraAmount || 0)
  })

  const roomNet = getNetAmount(roomTotalAmount, branchName, room)
  const cellPad = 'padding:6px 8px;vertical-align:middle;'
  const cellFs = 'font-size:11px;letter-spacing:0.3px;'

  // Build rows - show ALL prices (even 0) so all room tables are same height
  let rowsHtml = ''
  let rowNum = 0
  prices.forEach((price, idx) => {
    const count = mergedCounts[price] || 0
    rowNum++
    const isExtra = EXTRA_PRICES.includes(price)
    const displayPrice = isExtra ? (price - 5) : price
    const rowAmount = displayPrice * count
    rowsHtml += '<tr>' +
      '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + '">' + rowNum + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + '">' + displayPrice + ' د.ل</td>' +
      '<td style="' + cellPad + 'border:1px solid #444;text-align:center;font-size:12px;font-weight:bold;">' + count + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + '">' + rowAmount + ' د.ل</td>' +
    '</tr>'
  })

  // Custom price rows
  const customKeys = Object.keys(mergedCustoms)
  customKeys.forEach(key => {
    const item = mergedCustoms[key]
    rowNum++
    rowsHtml += '<tr>' +
      '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + 'color:#7c3aed;">✦</td>' +
      '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + 'color:#7c3aed;">' + item.price + ' د.ل</td>' +
      '<td style="' + cellPad + 'border:1px solid #444;text-align:center;font-size:12px;font-weight:bold;">' + item.count + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + 'font-weight:bold;">' + (item.price * item.count) + ' د.ل</td>' +
    '</tr>'
  })

  // Extra row
  let extraRowHtml = ''
  if (roomExtraCars > 0) {
    extraRowHtml = '<tr style="background:#fff8e1;">' +
      '<td colspan="2" style="' + cellPad + 'border:1px solid #444;font-size:11px;font-weight:bold;text-align:center;color:#e65100;">⭐ إكسترا</td>' +
      '<td style="' + cellPad + 'border:1px solid #444;text-align:center;font-size:12px;font-weight:bold;color:#e65100;">' + roomExtraCars + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #444;text-align:center;font-size:12px;font-weight:bold;color:#e65100;">' + roomExtraAmount + ' د.ل</td>' +
    '</tr>'
  }

  return '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;table-layout:fixed;border:1.5px solid #222;">' +
    '<colgroup><col style="width:10%;"/><col style="width:26%;"/><col style="width:24%;"/><col style="width:40%;"/></colgroup>' +
    '<tr><td colspan="4" style="padding:7px 6px;text-align:center;font-size:13px;font-weight:bold;background:#1a237e;color:#fff;border-bottom:1.5px solid #222;">' + room + '</td></tr>' +
    '<tr style="background:#e3f2fd;">' +
    '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + 'font-weight:bold;color:#1a237e;">م</td>' +
    '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + 'font-weight:bold;color:#1a237e;">السعر</td>' +
    '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + 'font-weight:bold;color:#1a237e;">العدد</td>' +
    '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + 'font-weight:bold;color:#1a237e;">الإجمالي</td>' +
    '</tr>' +
    rowsHtml +
    extraRowHtml +
    '<tr style="background:#e8eaf6;">' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #444;font-size:11px;font-weight:bold;text-align:center;color:#1a237e;">إجمالي الغرفة</td>' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #444;text-align:center;font-size:12px;font-weight:bold;color:#1a237e;">' + roomTotalCars + ' سيارة = ' + roomTotalAmount + ' د.ل</td>' +
    '</tr>' +
    '<tr style="background:#c8e6c9;">' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #444;font-size:11px;font-weight:bold;text-align:center;color:#1b5e20;">الصافي</td>' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #444;text-align:center;font-size:13px;font-weight:bold;color:#1b5e20;">' + roomNet + ' د.ل</td>' +
    '</tr>' +
    '</table>'
}

'''

content = content[:start_idx] + new_function + content[end_idx + len('\n}\n'):]

# =============================================
# 2. Replace buildEmptyRoomTableHTML
# =============================================
start_marker2 = "function buildEmptyRoomTableHTML(room: string) {"
end_marker2 = "\n}\n\nconst TREASURY_ITEMS"

start_idx2 = content.index(start_marker2)
end_idx2 = content.index(end_marker2, start_idx2)

new_function2 = '''function buildEmptyRoomTableHTML(room: string) {
  const prices = getPricesForRoom(room)
  const cellPad = 'padding:6px 8px;vertical-align:middle;'
  const cellFs = 'font-size:11px;letter-spacing:0.3px;'
  let rowsHtml = ''
  prices.forEach(() => {
    rowsHtml += '<tr>' +
      '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + '"></td>' +
      '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + '"></td>' +
      '<td style="' + cellPad + 'border:1px solid #444;text-align:center;font-size:12px;"></td>' +
      '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + '"></td>' +
    '</tr>'
  })
  return '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;table-layout:fixed;border:1.5px solid #222;">' +
    '<colgroup><col style="width:10%;"/><col style="width:26%;"/><col style="width:24%;"/><col style="width:40%;"/></colgroup>' +
    '<tr><td colspan="4" style="padding:7px 6px;text-align:center;font-size:13px;font-weight:bold;background:#1a237e;color:#fff;border-bottom:1.5px solid #222;">' + room + '</td></tr>' +
    '<tr style="background:#e3f2fd;">' +
    '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + 'font-weight:bold;color:#1a237e;">م</td>' +
    '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + 'font-weight:bold;color:#1a237e;">السعر</td>' +
    '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + 'font-weight:bold;color:#1a237e;">العدد</td>' +
    '<td style="' + cellPad + 'border:1px solid #444;text-align:center;' + cellFs + 'font-weight:bold;color:#1a237e;">الإجمالي</td>' +
    '</tr>' +
    rowsHtml +
    '<tr style="background:#e8eaf6;">' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #444;font-size:11px;font-weight:bold;text-align:center;color:#1a237e;">إجمالي الغرفة</td>' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #444;text-align:center;font-size:12px;font-weight:bold;color:#1a237e;"></td>' +
    '</tr>' +
    '<tr style="background:#c8e6c9;">' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #444;font-size:11px;font-weight:bold;text-align:center;color:#1b5e20;">الصافي</td>' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #444;text-align:center;font-size:13px;font-weight:bold;color:#1b5e20;"></td>' +
    '</tr>' +
    '</table>'
}

'''

content = content[:start_idx2] + new_function2 + content[end_idx2 + len('\n}\n'):]

# =============================================
# 3. Replace buildRoomsGrid
# =============================================
old_grid = """  const buildRoomsGrid = (cells: string[]) => {
    let html = ''
    for (let i = 0; i < cells.length; i += 2) {
      html += '<div style="display:flex;gap:8px;margin-bottom:6px;">' +
        '<div style="flex:1;min-width:0;">' + cells[i] + '</div>' +
        (cells[i + 1] ? '<div style="flex:1;min-width:0;">' + cells[i + 1] + '</div>' : '') +
        '</div>'
    }
    return html
  }"""

new_grid = """  const buildRoomsGrid = (cells: string[]) => {
    let html = ''
    for (let i = 0; i < cells.length; i += 2) {
      html += '<div style="display:flex;gap:12px;margin-bottom:10px;">' +
        '<div style="flex:1;min-width:0;">' + cells[i] + '</div>' +
        (cells[i + 1] ? '<div style="flex:1;min-width:0;">' + cells[i + 1] + '</div>' : '') +
        '</div>'
    }
    return html
  }"""

content = content.replace(old_grid, new_grid)

# =============================================
# 4. Replace buildHeader
# =============================================
old_header = """  const buildHeader = (title: string) => {
    return '<div style="text-align:center;margin-bottom:10px;border-bottom:2px solid #000;padding-bottom:8px;">' +
      '<h1 style="font-size:22px;font-weight:bold;margin:0;">مغسلة جيت كلين - ' + branchName + '</h1>' +
      '<p style="font-size:13px;margin:4px 0 0 0;color:#333;">' + title + '</p>' +
      '<p style="font-size:12px;margin:2px 0 0 0;color:#555;">التاريخ: ' + formatDateShort(selectedDate) + '</p>' +
      '</div>'
  }"""

new_header = """  const buildHeader = (title: string) => {
    return '<div style="text-align:center;margin-bottom:14px;border-bottom:3px solid #1a237e;padding-bottom:10px;">' +
      '<h1 style="font-size:20px;font-weight:bold;margin:0;color:#1a237e;">مغسلة جيت كلين - ' + branchName + '</h1>' +
      '<p style="font-size:13px;margin:5px 0 0 0;color:#333;font-weight:600;">' + title + '</p>' +
      '<p style="font-size:12px;margin:3px 0 0 0;color:#666;">التاريخ: ' + formatDateShort(selectedDate) + '</p>' +
      '</div>'
  }"""

content = content.replace(old_header, new_header)

# =============================================
# 5. Replace MAX_ROOMS_PER_PAGE back to 4 for better readability
# =============================================
content = content.replace(
    "  // Split rooms across pages: max 6 rooms per page (3 rows × 2 cols)\n  const MAX_ROOMS_PER_PAGE = 6",
    "  // Split rooms across pages: max 6 rooms per page (3 rows × 2 cols)\n  const MAX_ROOMS_PER_PAGE = 6"
)

# =============================================
# 6. Replace buildWorkerExpensesAndTreasury
# =============================================
start_marker3 = "// Helper: build worker expenses + treasury section (used on last page of car report)"
end_marker3 = "  return '<div style=\"margin-top:15px;border-top:2px solid #000;padding-top:12px;\"><div style=\"display:flex;gap:8px;\">' + workerExpensesHtml + treasuryHtml + '</div></div>'\n}"

# Find the function
fn_start = content.index(start_marker3)
# Find the end of buildWorkerExpensesAndTreasury function
# We look for the return statement and the closing brace
search_from = fn_start
return_marker = "return '<div style=\"margin-top:15px;border-top:2px solid #000;padding-top:12px;\"><div style=\"display:flex;gap:8px;\">' + workerExpensesHtml + treasuryHtml + '</div></div>'"
ret_idx = content.index(return_marker, search_from)
# Find the closing } after the return
fn_end = content.index('\n}', ret_idx) + 2

new_treasury_func = """// Helper: build worker expenses + treasury section (used on last page of car report)
function buildWorkerExpensesAndTreasury(
  branchName: string, selectedDate: string, orderedRooms: string[], entries: CarEntry[],
  grandTotalNet: number, savedWorkerExpenses?: Record<string, { cleanliness?: number; treasury?: Record<string, { income: number; expense: number }> }>
): string {
  const cleannessConfig = BRANCH_CLEANLINESS[branchName]
  const wKey = branchName + '_' + selectedDate
  const savedWE = savedWorkerExpenses?.[wKey] || {}
  let savedCleanliness = 0
  if (cleannessConfig) {
    if (cleannessConfig.type === 'fixed') {
      savedCleanliness = cleannessConfig.value || 0
    } else {
      savedCleanliness = savedWE.cleanliness || 0
    }
  }

  const wCellPad = 'padding:7px 10px;border:1px solid #444;vertical-align:middle;'

  // Worker expenses rows - net per room + cleanliness + grand total
  let workerRowsHtml = ''
  orderedRooms.forEach(room => {
    const roomEnts = entries.filter(e => e.room === room)
    const roomAmt = roomEnts.reduce((s, e) => s + e.totalAmount, 0)
    const roomNet = getNetAmount(roomAmt, branchName, room)
    if (roomNet === 0) return
    const icon = ROOM_ICONS[room] || '🏠'
    workerRowsHtml += '<tr>' +
      '<td style="' + wCellPad + 'font-size:11px;text-align:center;font-weight:600;">' + icon + ' ' + room + '</td>' +
      '<td style="' + wCellPad + 'text-align:center;font-size:13px;font-weight:bold;">' + roomNet + ' د.ل</td>' +
    '</tr>'
  })

  // Cleanliness row
  workerRowsHtml += '<tr style="background:#fff8e1;">' +
    '<td style="' + wCellPad + 'font-size:11px;font-weight:bold;text-align:center;color:#e65100;">🧹 النظافة</td>' +
    '<td style="' + wCellPad + 'text-align:center;font-size:13px;font-weight:bold;color:#e65100;">' + savedCleanliness + ' د.ل</td>' +
  '</tr>'

  // Grand total after expenses
  const finalTotalAfterExpenses = grandTotalNet + savedCleanliness
  workerRowsHtml += '<tr style="background:#e8f5e9;">' +
    '<td style="' + wCellPad + 'border:2px solid #1b5e20;font-size:12px;font-weight:bold;text-align:center;color:#1b5e20;">الإجمالي</td>' +
    '<td style="' + wCellPad + 'border:2px solid #1b5e20;text-align:center;font-size:15px;font-weight:bold;color:#1b5e20;">' + finalTotalAfterExpenses + ' د.ل</td>' +
  '</tr>'

  const workerExpensesHtml = '<div style="flex:1;border:2px solid #1a237e;">' +
    '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;">' +
    '<tr><td colspan="2" style="padding:8px 10px;text-align:center;font-size:14px;font-weight:bold;background:#1a237e;color:#fff;border-bottom:2px solid #1a237e;">مصاريف العمال</td></tr>' +
    workerRowsHtml +
    '</table>' +
    '</div>'

  // Treasury table
  const treasSaved = savedWE.treasury || {}
  const pdfTreasuryItems = getTreasuryItems(branchName)
  const pdfBankCardSale = parseInt(String(treasSaved['بيع_البطاقة']?.expense)) || 0
  const pdfBankCardReplace = Math.floor(pdfBankCardSale / 2)
  const pdfWorkerExpInTreasury = finalTotalAfterExpenses - pdfBankCardReplace

  const tCellPad = 'padding:7px 8px;border:1px solid #444;vertical-align:middle;'
  const tLabelStyle = tCellPad + 'font-size:11px;'
  const tValueStyle = tCellPad + 'text-align:center;font-size:12px;font-weight:bold;'

  let treasuryRowsHtml = ''
  treasuryRowsHtml += '<tr style="background:#e3f2fd;">' +
    '<td style="' + tLabelStyle + 'font-weight:bold;text-align:center;color:#1a237e;">البيان</td>' +
    '<td style="' + tValueStyle + 'color:#1a237e;">دخل</td>' +
    '<td style="' + tValueStyle + 'color:#1a237e;">خرج</td>' +
    '<td style="' + tValueStyle + 'color:#1a237e;">الرصيد</td>' +
  '</tr>'

  let tRunningBalance = 0
  pdfTreasuryItems.forEach(item => {
    const rowS = treasSaved[item.key] || {}
    let tIncome = rowS.income || 0
    let tExpense = rowS.expense || 0
    let isAuto = false

    if (item.key === 'بدل_البطاقة') {
      tExpense = pdfBankCardReplace
      isAuto = true
    }
    if (item.key === 'مصاريف_العمال') {
      tExpense = pdfWorkerExpInTreasury
      isAuto = true
    }
    if (item.key === 'تم_التحويل') {
      tExpense = Math.max(0, tRunningBalance)
      isAuto = true
    }

    tRunningBalance = tRunningBalance + tIncome - tExpense
    const balColor = tRunningBalance >= 0 ? '#1b5e20' : '#c62828'
    const labelSuffix = isAuto ? ' *' : ''

    treasuryRowsHtml += '<tr>' +
      '<td style="' + tLabelStyle + 'text-align:center;">' + item.label + labelSuffix + '</td>' +
      '<td style="' + tValueStyle + 'color:#2e7d32;">' + (tIncome > 0 ? tIncome : '') + '</td>' +
      '<td style="' + tValueStyle + 'color:#c62828;">' + (tExpense > 0 ? tExpense : '') + '</td>' +
      '<td style="' + tValueStyle + 'color:' + balColor + ';">' + tRunningBalance + '</td>' +
    '</tr>'
  })

  const treasuryHtml = '<div style="flex:1;border:2px solid #1a237e;">' +
    '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;">' +
    '<tr><td colspan="4" style="padding:8px 10px;text-align:center;font-size:14px;font-weight:bold;background:#1a237e;color:#fff;border-bottom:2px solid #1a237e;">الخزينة</td></tr>' +
    treasuryRowsHtml +
    '</table>' +
    '</div>'

  return '<div style="margin-top:18px;border-top:3px solid #1a237e;padding-top:14px;"><div style="display:flex;gap:14px;">' + workerExpensesHtml + treasuryHtml + '</div></div>'
}"""

content = content[:fn_start] + new_treasury_func + '\n' + content[fn_end:]

# =============================================
# 7. Update page container styles
# =============================================
content = content.replace(
    "'<div style=\"width:780px;background:#fff;color:#000;padding:15px 10px;font-family:Cairo,sans-serif;\" dir=\"rtl\">' +",
    "'<div style=\"width:780px;background:#fff;color:#000;padding:18px 14px;font-family:Cairo,sans-serif;\" dir=\"rtl\">' +"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Report redesign applied successfully!")
print("Changes:")
print("  1. buildRoomTableHTML - Professional colors, better spacing")
print("  2. buildEmptyRoomTableHTML - Matching professional style")
print("  3. buildRoomsGrid - Better gap/margin")
print("  4. buildHeader - Brand colors, clear separator")
print("  5. buildWorkerExpensesAndTreasury - Larger fonts, brand theme")
print("  6. Page container - More padding")
