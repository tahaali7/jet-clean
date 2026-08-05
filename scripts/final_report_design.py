#!/usr/bin/env python3
"""Complete PDF report redesign: professional, organized, clear text."""

filepath = '/home/z/my-project/src/app/page.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ========================================================
# 1. Replace buildRoomTableHTML
# ========================================================
start_marker = "function buildRoomTableHTML(room: string, roomEntries: CarEntry[], branchName: string) {"
end_marker = "\n\n\nfunction buildEmptyRoomTableHTML"

start_idx = content.index(start_marker)
end_idx = content.index(end_marker, start_idx)

new_func = '''function buildRoomTableHTML(room: string, roomEntries: CarEntry[], branchName: string) {
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
  const cellPad = 'padding:4px 6px;vertical-align:middle;'
  const cellFs = 'font-size:10px;'

  let rowsHtml = ''
  let rowNum = 0
  prices.forEach((price, idx) => {
    const count = mergedCounts[price] || 0
    rowNum++
    const isExtra = EXTRA_PRICES.includes(price)
    const displayPrice = isExtra ? (price - 5) : price
    const rowAmount = displayPrice * count
    rowsHtml += '<tr>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + '">' + rowNum + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + '">' + displayPrice + ' د.ل</td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;font-size:11px;font-weight:bold;">' + count + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + '">' + rowAmount + ' د.ل</td>' +
    '</tr>'
  })

  const customKeys = Object.keys(mergedCustoms)
  customKeys.forEach(key => {
    const item = mergedCustoms[key]
    rowNum++
    rowsHtml += '<tr>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'color:#7c3aed;">✦</td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'color:#7c3aed;">' + item.price + ' د.ل</td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;font-size:11px;font-weight:bold;">' + item.count + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">' + (item.price * item.count) + ' د.ل</td>' +
    '</tr>'
  })

  let extraRowHtml = ''
  if (roomExtraCars > 0) {
    extraRowHtml = '<tr style="background:#fffde7;">' +
      '<td colspan="2" style="' + cellPad + 'border:1px solid #555;font-size:10px;font-weight:bold;text-align:center;color:#e65100;">⭐ إكسترا</td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;font-size:11px;font-weight:bold;color:#e65100;">' + roomExtraCars + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;font-size:11px;font-weight:bold;color:#e65100;">' + roomExtraAmount + ' د.ل</td>' +
    '</tr>'
  }

  return '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;table-layout:fixed;border:1px solid #333;">' +
    '<colgroup><col style="width:10%;"/><col style="width:28%;"/><col style="width:24%;"/><col style="width:38%;"/></colgroup>' +
    '<tr><td colspan="4" style="padding:5px 6px;text-align:center;font-size:11px;font-weight:bold;background:#bdbdbd;color:#222;">' + room + '</td></tr>' +
    '<tr style="background:#e0e0e0;">' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">م</td>' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">السعر</td>' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">العدد</td>' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">الإجمالي</td>' +
    '</tr>' +
    rowsHtml +
    extraRowHtml +
    '<tr style="background:#e0e0e0;">' +
    '<td colspan="2" style="padding:5px 6px;border:1px solid #555;font-size:10px;font-weight:bold;text-align:center;">إجمالي الغرفة</td>' +
    '<td colspan="2" style="padding:5px 6px;border:1px solid #555;text-align:center;font-size:11px;font-weight:bold;">' + roomTotalCars + ' سيارة = ' + roomTotalAmount + ' د.ل</td>' +
    '</tr>' +
    '<tr style="background:#e8f5e9;">' +
    '<td colspan="2" style="padding:5px 6px;border:1px solid #555;font-size:10px;font-weight:bold;text-align:center;color:#2e7d32;">الصافي</td>' +
    '<td colspan="2" style="padding:5px 6px;border:1px solid #555;text-align:center;font-size:12px;font-weight:bold;color:#2e7d32;">' + roomNet + ' د.ل</td>' +
    '</tr>' +
    '</table>'
}


'''

content = content[:start_idx] + new_func + content[end_idx + len('\n\n\n'):]

# ========================================================
# 2. Replace buildEmptyRoomTableHTML
# ========================================================
start_marker2 = "function buildEmptyRoomTableHTML(room: string) {"
end_marker2 = "\n\n\nconst TREASURY_ITEMS"

start_idx2 = content.index(start_marker2)
end_idx2 = content.index(end_marker2, start_idx2)

new_func2 = '''function buildEmptyRoomTableHTML(room: string) {
  const prices = getPricesForRoom(room)
  const cellPad = 'padding:4px 6px;vertical-align:middle;'
  const cellFs = 'font-size:10px;'
  let rowsHtml = ''
  prices.forEach(() => {
    rowsHtml += '<tr>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + '"></td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + '"></td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;font-size:11px;"></td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + '"></td>' +
    '</tr>'
  })
  return '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;table-layout:fixed;border:1px solid #333;">' +
    '<colgroup><col style="width:10%;"/><col style="width:28%;"/><col style="width:24%;"/><col style="width:38%;"/></colgroup>' +
    '<tr><td colspan="4" style="padding:5px 6px;text-align:center;font-size:11px;font-weight:bold;background:#bdbdbd;color:#222;">' + room + '</td></tr>' +
    '<tr style="background:#e0e0e0;">' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">م</td>' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">السعر</td>' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">العدد</td>' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">الإجمالي</td>' +
    '</tr>' +
    rowsHtml +
    '<tr style="background:#e0e0e0;">' +
    '<td colspan="2" style="padding:5px 6px;border:1px solid #555;font-size:10px;font-weight:bold;text-align:center;">إجمالي الغرفة</td>' +
    '<td colspan="2" style="padding:5px 6px;border:1px solid #555;text-align:center;font-size:11px;font-weight:bold;"></td>' +
    '</tr>' +
    '<tr style="background:#e8f5e9;">' +
    '<td colspan="2" style="padding:5px 6px;border:1px solid #555;font-size:10px;font-weight:bold;text-align:center;color:#2e7d32;">الصافي</td>' +
    '<td colspan="2" style="padding:5px 6px;border:1px solid #555;text-align:center;font-size:12px;font-weight:bold;color:#2e7d32;"></td>' +
    '</tr>' +
    '</table>'
}


'''

content = content[:start_idx2] + new_func2 + content[end_idx2 + len('\n\n\n'):]

# ========================================================
# 3. Replace buildRoomsGrid - tighter spacing for 6 rooms
# ========================================================
old_grid = """  const buildRoomsGrid = (cells: string[]) => {
    let html = ''
    for (let i = 0; i < cells.length; i += 2) {
      html += '<div style="display:flex;gap:12px;margin-bottom:10px;">' +
        '<div style="flex:1;min-width:0;">' + cells[i] + '</div>' +
        (cells[i + 1] ? '<div style="flex:1;min-width:0;">' + cells[i + 1] + '</div>' : '') +
        '</div>'
    }
    return html
  }"""

new_grid = """  const buildRoomsGrid = (cells: string[]) => {
    let html = ''
    for (let i = 0; i < cells.length; i += 2) {
      html += '<div style="display:flex;gap:8px;margin-bottom:6px;">' +
        '<div style="flex:1;min-width:0;">' + cells[i] + '</div>' +
        (cells[i + 1] ? '<div style="flex:1;min-width:0;">' + cells[i + 1] + '</div>' : '') +
        '</div>'
    }
    return html
  }"""

content = content.replace(old_grid, new_grid)

# ========================================================
# 4. Replace page splitting - 6 rooms per page, auto-balance
# ========================================================
old_split = """  // Split rooms across pages: max 4 rooms per page (2 rows × 2 cols)
  const MAX_ROOMS_PER_PAGE = 4
  const pages: string[] = []
  let roomIndex = 0

  // Room pages - if last room page is not full, merge it with treasury page
  let overflowRooms: string[] = []
  const totalFullPages = Math.floor(roomCells.length / MAX_ROOMS_PER_PAGE)
  const hasRemainder = roomCells.length % MAX_ROOMS_PER_PAGE > 0

  // Full room pages
  for (let p = 0; p < totalFullPages; p++) {
    const pageRooms = roomCells.slice(p * MAX_ROOMS_PER_PAGE, (p + 1) * MAX_ROOMS_PER_PAGE)
    pages.push(
      '<div style="width:780px;height:1120px;background:#fff;color:#000;padding:15px 12px;font-family:Cairo,sans-serif;display:flex;flex-direction:column;box-sizing:border-box;" dir="rtl">' +
      buildHeader('تقرير تسجيل السيارات') +
      '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;">' +
      buildRoomsGrid(pageRooms) +
      '</div>' +
      '</div>'
    )
  }

  // Remaining rooms go to treasury page (not a separate page)
  if (hasRemainder) {
    overflowRooms = roomCells.slice(totalFullPages * MAX_ROOMS_PER_PAGE)
  }

  // Treasury page (always last) - includes overflow rooms if any
  const treasuryContent = buildWorkerExpensesAndTreasury(branchName, selectedDate, orderedRooms, entries, grandTotalNet, savedWorkerExpenses)
  const overflowHtml = overflowRooms.length > 0 ? buildRoomsGrid(overflowRooms) : ''
  pages.push(
    '<div style="width:780px;background:#fff;color:#000;padding:15px 12px;font-family:Cairo,sans-serif;" dir="rtl">' +
    buildHeader('مصاريف العمال والخزينة') +
    overflowHtml +
    treasuryContent +
    '</div>'
  )"""

new_split = """  // Split rooms across pages: max 6 rooms per page (3 rows × 2 cols)
  const MAX_ROOMS_PER_PAGE = 6
  const pages: string[] = []

  // Room pages - if last room page is not full, merge it with treasury page
  let overflowRooms: string[] = []
  const totalFullPages = Math.floor(roomCells.length / MAX_ROOMS_PER_PAGE)
  const hasRemainder = roomCells.length % MAX_ROOMS_PER_PAGE > 0

  // Full room pages
  for (let p = 0; p < totalFullPages; p++) {
    const pageRooms = roomCells.slice(p * MAX_ROOMS_PER_PAGE, (p + 1) * MAX_ROOMS_PER_PAGE)
    pages.push(
      '<div style="width:780px;height:1120px;background:#fff;color:#000;padding:12px 10px;font-family:Cairo,sans-serif;display:flex;flex-direction:column;box-sizing:border-box;" dir="rtl">' +
      buildHeader('تقرير تسجيل السيارات') +
      '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;">' +
      buildRoomsGrid(pageRooms) +
      '</div>' +
      '</div>'
    )
  }

  // Remaining rooms go to treasury page (not a separate page)
  if (hasRemainder) {
    overflowRooms = roomCells.slice(totalFullPages * MAX_ROOMS_PER_PAGE)
  }

  // Treasury page (always last) - includes overflow rooms if any
  const treasuryContent = buildWorkerExpensesAndTreasury(branchName, selectedDate, orderedRooms, entries, grandTotalNet, savedWorkerExpenses)
  const overflowHtml = overflowRooms.length > 0 ? buildRoomsGrid(overflowRooms) : ''
  pages.push(
    '<div style="width:780px;background:#fff;color:#000;padding:12px 10px;font-family:Cairo,sans-serif;" dir="rtl">' +
    buildHeader('مصاريف العمال والخزينة') +
    overflowHtml +
    treasuryContent +
    '</div>'
  )"""

content = content.replace(old_split, new_split)

# ========================================================
# 5. Replace buildWorkerExpensesAndTreasury - clean style
# ========================================================
start_marker3 = "// Helper: build worker expenses + treasury section (used on last page of car report)"
fn_start = content.index(start_marker3)
return_marker = "return '<div style=\"margin-top:15px;border-top:2px solid #000;padding-top:12px;\"><div style=\"display:flex;gap:10px;\">' + workerExpensesHtml + treasuryHtml + '</div></div>'"
ret_idx = content.index(return_marker, fn_start)
fn_end = content.index('\n}', ret_idx) + 2

new_treasury = """// Helper: build worker expenses + treasury section (used on last page of car report)
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

  const wCellPad = 'padding:5px 8px;border:1px solid #555;vertical-align:middle;'

  let workerRowsHtml = ''
  orderedRooms.forEach(room => {
    const roomEnts = entries.filter(e => e.room === room)
    const roomAmt = roomEnts.reduce((s, e) => s + e.totalAmount, 0)
    const roomNet = getNetAmount(roomAmt, branchName, room)
    if (roomNet === 0) return
    const icon = ROOM_ICONS[room] || '🏠'
    workerRowsHtml += '<tr>' +
      '<td style="' + wCellPad + 'font-size:10px;text-align:center;">' + icon + ' ' + room + '</td>' +
      '<td style="' + wCellPad + 'text-align:center;font-size:12px;font-weight:bold;">' + roomNet + ' د.ل</td>' +
    '</tr>'
  })

  workerRowsHtml += '<tr style="background:#fffde7;">' +
    '<td style="' + wCellPad + 'font-size:10px;font-weight:bold;text-align:center;color:#e65100;">🧹 النظافة</td>' +
    '<td style="' + wCellPad + 'text-align:center;font-size:12px;font-weight:bold;color:#e65100;">' + savedCleanliness + ' د.ل</td>' +
  '</tr>'

  const finalTotalAfterExpenses = grandTotalNet + savedCleanliness
  workerRowsHtml += '<tr style="background:#e8f5e9;">' +
    '<td style="' + wCellPad + 'border:2px solid #333;font-size:11px;font-weight:bold;text-align:center;">الإجمالي</td>' +
    '<td style="' + wCellPad + 'border:2px solid #333;text-align:center;font-size:14px;font-weight:bold;color:#2e7d32;">' + finalTotalAfterExpenses + ' د.ل</td>' +
  '</tr>'

  const workerExpensesHtml = '<div style="flex:1;border:1.5px solid #333;">' +
    '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;">' +
    '<tr><td colspan="2" style="padding:5px 8px;text-align:center;font-size:12px;font-weight:bold;background:#bdbdbd;border:1px solid #555;vertical-align:middle;">مصاريف العمال</td></tr>' +
    workerRowsHtml +
    '</table>' +
    '</div>'

  const treasSaved = savedWE.treasury || {}
  const pdfTreasuryItems = getTreasuryItems(branchName)
  const pdfBankCardSale = parseInt(String(treasSaved['بيع_البطاقة']?.expense)) || 0
  const pdfBankCardReplace = Math.floor(pdfBankCardSale / 2)
  const pdfWorkerExpInTreasury = finalTotalAfterExpenses - pdfBankCardReplace

  const tCellPad = 'padding:5px 6px;border:1px solid #555;vertical-align:middle;'
  const tLabelStyle = tCellPad + 'font-size:10px;'
  const tValueStyle = tCellPad + 'text-align:center;font-size:11px;font-weight:bold;'

  let treasuryRowsHtml = ''
  treasuryRowsHtml += '<tr style="background:#e0e0e0;">' +
    '<td style="' + tLabelStyle + 'font-weight:bold;text-align:center;">البيان</td>' +
    '<td style="' + tValueStyle + '">دخل</td>' +
    '<td style="' + tValueStyle + '">خرج</td>' +
    '<td style="' + tValueStyle + '">الرصيد</td>' +
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
    const balColor = tRunningBalance >= 0 ? '#2e7d32' : '#c62828'
    const labelSuffix = isAuto ? ' *' : ''

    treasuryRowsHtml += '<tr>' +
      '<td style="' + tLabelStyle + 'text-align:center;">' + item.label + labelSuffix + '</td>' +
      '<td style="' + tValueStyle + 'color:#2e7d32;">' + (tIncome > 0 ? tIncome : '') + '</td>' +
      '<td style="' + tValueStyle + 'color:#c62828;">' + (tExpense > 0 ? tExpense : '') + '</td>' +
      '<td style="' + tValueStyle + 'color:' + balColor + ';">' + tRunningBalance + '</td>' +
    '</tr>'
  })

  const treasuryHtml = '<div style="flex:1;border:1.5px solid #333;">' +
    '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;">' +
    '<tr><td colspan="4" style="padding:5px 8px;text-align:center;font-size:12px;font-weight:bold;background:#bbdefb;border:1px solid #555;">الخزينة</td></tr>' +
    treasuryRowsHtml +
    '</table>' +
    '</div>'

  return '<div style="margin-top:12px;border-top:2px solid #000;padding-top:10px;"><div style="display:flex;gap:8px;">' + workerExpensesHtml + treasuryHtml + '</div></div>'
}"""

content = content[:fn_start] + new_treasury + '\n' + content[fn_end:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Complete redesign applied!")
print("  - 6 rooms per page")
print("  - Auto-balance overflow rooms with treasury page")
print("  - Room titles centered with clear background")
print("  - Clean, organized layout")
print("  - All text properly aligned and centered in cells")
