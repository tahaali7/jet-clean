#!/usr/bin/env python3
"""Fix: restore original colors, separate treasury page, complete rooms on page 2."""

filepath = '/home/z/my-project/src/app/page.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ========================================================
# 1. Replace buildRoomTableHTML - original gray/black colors, better spacing
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
  const cellPad = 'padding:6px 8px;vertical-align:middle;'
  const cellFs = 'font-size:11px;'

  let rowsHtml = ''
  let rowNum = 0
  prices.forEach((price, idx) => {
    const count = mergedCounts[price] || 0
    rowNum++
    const isExtra = EXTRA_PRICES.includes(price)
    const displayPrice = isExtra ? (price - 5) : price
    const rowAmount = displayPrice * count
    rowsHtml += '<tr>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">' + rowNum + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">' + displayPrice + ' د.ل</td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:12px;font-weight:bold;">' + count + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">' + rowAmount + ' د.ل</td>' +
    '</tr>'
  })

  const customKeys = Object.keys(mergedCustoms)
  customKeys.forEach(key => {
    const item = mergedCustoms[key]
    rowNum++
    rowsHtml += '<tr>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'color:#7c3aed;">✦</td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'color:#7c3aed;">' + item.price + ' د.ل</td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:12px;font-weight:bold;">' + item.count + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">' + (item.price * item.count) + ' د.ل</td>' +
    '</tr>'
  })

  let extraRowHtml = ''
  if (roomExtraCars > 0) {
    extraRowHtml = '<tr style="background:#fffbe6;">' +
      '<td colspan="2" style="' + cellPad + 'border:1px solid #333;font-size:11px;font-weight:bold;text-align:center;color:#b45309;">⭐ إكسترا</td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:12px;font-weight:bold;color:#b45309;">' + roomExtraCars + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:12px;font-weight:bold;color:#b45309;">' + roomExtraAmount + ' د.ل</td>' +
    '</tr>'
  }

  return '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;table-layout:fixed;">' +
    '<colgroup><col style="width:12%;"/><col style="width:28%;"/><col style="width:25%;"/><col style="width:35%;"/></colgroup>' +
    '<tr><td colspan="4" style="border:1px solid #333;padding:6px 6px;text-align:center;font-size:12px;font-weight:bold;background:#e0e0e0;vertical-align:middle;">' + room + '</td></tr>' +
    '<tr style="background:#f5f5f5;">' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">م</td>' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">السعر</td>' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">العدد</td>' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">الإجمالي</td>' +
    '</tr>' +
    rowsHtml +
    extraRowHtml +
    '<tr style="background:#eeeeee;">' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #333;font-size:11px;font-weight:bold;text-align:center;">إجمالي الغرفة</td>' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #333;text-align:center;font-size:12px;font-weight:bold;">' + roomTotalCars + ' سيارة = ' + roomTotalAmount + ' د.ل</td>' +
    '</tr>' +
    '<tr style="background:#e8f5e9;">' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #333;font-size:11px;font-weight:bold;text-align:center;color:#1b5e20;">الصافي</td>' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #333;text-align:center;font-size:13px;font-weight:bold;color:#1b5e20;">' + roomNet + ' د.ل</td>' +
    '</tr>' +
    '</table>'
}


'''

content = content[:start_idx] + new_func + content[end_idx + len('\n\n\n'):]

# ========================================================
# 2. Replace buildEmptyRoomTableHTML - matching style
# ========================================================
start_marker2 = "function buildEmptyRoomTableHTML(room: string) {"
end_marker2 = "\n\n\nconst TREASURY_ITEMS"

start_idx2 = content.index(start_marker2)
end_idx2 = content.index(end_marker2, start_idx2)

new_func2 = '''function buildEmptyRoomTableHTML(room: string) {
  const prices = getPricesForRoom(room)
  const cellPad = 'padding:6px 8px;vertical-align:middle;'
  const cellFs = 'font-size:11px;'
  let rowsHtml = ''
  prices.forEach(() => {
    rowsHtml += '<tr>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '"></td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '"></td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:12px;"></td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '"></td>' +
    '</tr>'
  })
  return '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;table-layout:fixed;">' +
    '<colgroup><col style="width:12%;"/><col style="width:28%;"/><col style="width:25%;"/><col style="width:35%;"/></colgroup>' +
    '<tr><td colspan="4" style="border:1px solid #333;padding:6px 6px;text-align:center;font-size:12px;font-weight:bold;background:#e0e0e0;vertical-align:middle;">' + room + '</td></tr>' +
    '<tr style="background:#f5f5f5;">' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">م</td>' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">السعر</td>' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">العدد</td>' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">الإجمالي</td>' +
    '</tr>' +
    rowsHtml +
    '<tr style="background:#eeeeee;">' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #333;font-size:11px;font-weight:bold;text-align:center;">إجمالي الغرفة</td>' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #333;text-align:center;font-size:12px;font-weight:bold;"></td>' +
    '</tr>' +
    '<tr style="background:#e8f5e9;">' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #333;font-size:11px;font-weight:bold;text-align:center;color:#1b5e20;">الصافي</td>' +
    '<td colspan="2" style="padding:7px 8px;border:1px solid #333;text-align:center;font-size:13px;font-weight:bold;color:#1b5e20;"></td>' +
    '</tr>' +
    '</table>'
}


'''

content = content[:start_idx2] + new_func2 + content[end_idx2 + len('\n\n\n'):]

# ========================================================
# 3. Replace buildHeader - simple black/dark style
# ========================================================
old_header = """  const buildHeader = (title: string) => {
    return '<div style="text-align:center;margin-bottom:14px;border-bottom:3px solid #1a237e;padding-bottom:10px;">' +
      '<h1 style="font-size:20px;font-weight:bold;margin:0;color:#1a237e;">مغسلة جيت كلين - ' + branchName + '</h1>' +
      '<p style="font-size:13px;margin:5px 0 0 0;color:#333;font-weight:600;">' + title + '</p>' +
      '<p style="font-size:12px;margin:3px 0 0 0;color:#666;">التاريخ: ' + formatDateShort(selectedDate) + '</p>' +
      '</div>'
  }"""

new_header = """  const buildHeader = (title: string) => {
    return '<div style="text-align:center;margin-bottom:12px;border-bottom:2px solid #000;padding-bottom:8px;">' +
      '<h1 style="font-size:20px;font-weight:bold;margin:0;">مغسلة جيت كلين - ' + branchName + '</h1>' +
      '<p style="font-size:13px;margin:4px 0 0 0;color:#333;">' + title + '</p>' +
      '<p style="font-size:12px;margin:2px 0 0 0;color:#555;">التاريخ: ' + formatDateShort(selectedDate) + '</p>' +
      '</div>'
  }"""

content = content.replace(old_header, new_header)

# ========================================================
# 4. Replace page splitting logic:
#    - Rooms pages only (no treasury mixed in)
#    - Treasury gets its OWN separate page at the end
# ========================================================

old_split = """  // Split rooms across pages: max 6 rooms per page (3 rows × 2 cols)
  const MAX_ROOMS_PER_PAGE = 6
  const pages: string[] = []
  let roomIndex = 0

  // Page 1+: Room pages
  while (roomIndex < roomCells.length) {
    const pageRooms = roomCells.slice(roomIndex, roomIndex + MAX_ROOMS_PER_PAGE)
    const isLastRoomPage = (roomIndex + MAX_ROOMS_PER_PAGE >= roomCells.length)
    roomIndex += MAX_ROOMS_PER_PAGE

    // If this is the last page of rooms, add worker expenses + treasury below
    let extraContent = ''
    if (isLastRoomPage) {
      extraContent = buildWorkerExpensesAndTreasury(branchName, selectedDate, orderedRooms, entries, grandTotalNet, savedWorkerExpenses)
    }

    const title = isLastRoomPage ? 'مصاريف العمال والخزينة' : 'تقرير تسجيل السيارات'
    pages.push(
      '<div style="width:780px;background:#fff;color:#000;padding:18px 14px;font-family:Cairo,sans-serif;" dir="rtl">' +
      buildHeader(title) +
      buildRoomsGrid(pageRooms) +
      extraContent +
      '</div>'
    )
  }

  // Edge case: if no rooms at all, still output a page with worker expenses + treasury
  if (roomCells.length === 0) {
    const extraContent = buildWorkerExpensesAndTreasury(branchName, selectedDate, orderedRooms, entries, grandTotalNet, savedWorkerExpenses)
    pages.push(
      '<div style="width:780px;background:#fff;color:#000;padding:18px 14px;font-family:Cairo,sans-serif;" dir="rtl">' +
      buildHeader('مصاريف العمال والخزينة') +
      extraContent +
      '</div>'
    )
  }

  return pages"""

new_split = """  // Split rooms across pages: max 6 rooms per page (3 rows × 2 cols)
  const MAX_ROOMS_PER_PAGE = 6
  const pages: string[] = []
  let roomIndex = 0

  // Room pages only
  while (roomIndex < roomCells.length) {
    const pageRooms = roomCells.slice(roomIndex, roomIndex + MAX_ROOMS_PER_PAGE)
    roomIndex += MAX_ROOMS_PER_PAGE
    pages.push(
      '<div style="width:780px;background:#fff;color:#000;padding:15px 12px;font-family:Cairo,sans-serif;" dir="rtl">' +
      buildHeader('تقرير تسجيل السيارات') +
      buildRoomsGrid(pageRooms) +
      '</div>'
    )
  }

  // Always add treasury page at the end
  const treasuryContent = buildWorkerExpensesAndTreasury(branchName, selectedDate, orderedRooms, entries, grandTotalNet, savedWorkerExpenses)
  pages.push(
    '<div style="width:780px;background:#fff;color:#000;padding:15px 12px;font-family:Cairo,sans-serif;" dir="rtl">' +
    buildHeader('مصاريف العمال والخزينة') +
    treasuryContent +
    '</div>'
  )

  return pages"""

content = content.replace(old_split, new_split)

# ========================================================
# 5. Replace buildWorkerExpensesAndTreasury - original colors
# ========================================================
start_marker3 = "// Helper: build worker expenses + treasury section (used on last page of car report)"
fn_start = content.index(start_marker3)
search_from = fn_start
return_marker = "return '<div style=\"margin-top:18px;border-top:3px solid #1a237e;padding-top:14px;\"><div style=\"display:flex;gap:14px;\">' + workerExpensesHtml + treasuryHtml + '</div></div>'"
ret_idx = content.index(return_marker, search_from)
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

  const wCellPad = 'padding:6px 8px;border:1px solid #333;vertical-align:middle;'

  let workerRowsHtml = ''
  orderedRooms.forEach(room => {
    const roomEnts = entries.filter(e => e.room === room)
    const roomAmt = roomEnts.reduce((s, e) => s + e.totalAmount, 0)
    const roomNet = getNetAmount(roomAmt, branchName, room)
    if (roomNet === 0) return
    const icon = ROOM_ICONS[room] || '🏠'
    workerRowsHtml += '<tr>' +
      '<td style="' + wCellPad + 'font-size:11px;text-align:center;">' + icon + ' ' + room + '</td>' +
      '<td style="' + wCellPad + 'text-align:center;font-size:13px;font-weight:bold;">' + roomNet + ' د.ل</td>' +
    '</tr>'
  })

  workerRowsHtml += '<tr style="background:#fffbe6;">' +
    '<td style="' + wCellPad + 'font-size:11px;font-weight:bold;text-align:center;color:#b45309;">🧹 النظافة</td>' +
    '<td style="' + wCellPad + 'text-align:center;font-size:13px;font-weight:bold;color:#b45309;">' + savedCleanliness + ' د.ل</td>' +
  '</tr>'

  const finalTotalAfterExpenses = grandTotalNet + savedCleanliness
  workerRowsHtml += '<tr style="background:#e8f5e9;">' +
    '<td style="' + wCellPad + 'border:2px solid #333;font-size:12px;font-weight:bold;text-align:center;">الإجمالي</td>' +
    '<td style="' + wCellPad + 'border:2px solid #333;text-align:center;font-size:15px;font-weight:bold;color:#1b7a3d;">' + finalTotalAfterExpenses + ' د.ل</td>' +
  '</tr>'

  const workerExpensesHtml = '<div style="flex:1;border:2px solid #333;">' +
    '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;">' +
    '<tr><td colspan="2" style="padding:6px 8px;text-align:center;font-size:13px;font-weight:bold;background:#e0e0e0;border:1px solid #333;vertical-align:middle;">مصاريف العمال</td></tr>' +
    workerRowsHtml +
    '</table>' +
    '</div>'

  const treasSaved = savedWE.treasury || {}
  const pdfTreasuryItems = getTreasuryItems(branchName)
  const pdfBankCardSale = parseInt(String(treasSaved['بيع_البطاقة']?.expense)) || 0
  const pdfBankCardReplace = Math.floor(pdfBankCardSale / 2)
  const pdfWorkerExpInTreasury = finalTotalAfterExpenses - pdfBankCardReplace

  const tCellPad = 'padding:6px 8px;border:1px solid #333;vertical-align:middle;'
  const tLabelStyle = tCellPad + 'font-size:11px;'
  const tValueStyle = tCellPad + 'text-align:center;font-size:12px;font-weight:bold;'

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
    const balColor = tRunningBalance >= 0 ? '#1b7a3d' : '#dc2626'
    const labelSuffix = isAuto ? ' *' : ''

    treasuryRowsHtml += '<tr>' +
      '<td style="' + tLabelStyle + 'text-align:center;">' + item.label + labelSuffix + '</td>' +
      '<td style="' + tValueStyle + 'color:#16a34a;">' + (tIncome > 0 ? tIncome : '') + '</td>' +
      '<td style="' + tValueStyle + 'color:#dc2626;">' + (tExpense > 0 ? tExpense : '') + '</td>' +
      '<td style="' + tValueStyle + 'color:' + balColor + ';">' + tRunningBalance + '</td>' +
    '</tr>'
  })

  const treasuryHtml = '<div style="flex:1;border:2px solid #333;">' +
    '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;">' +
    '<tr><td colspan="4" style="padding:6px 8px;text-align:center;font-size:13px;font-weight:bold;background:#dbeafe;border:1px solid #333;">الخزينة</td></tr>' +
    treasuryRowsHtml +
    '</table>' +
    '</div>'

  return '<div style="margin-top:15px;border-top:2px solid #000;padding-top:12px;"><div style="display:flex;gap:10px;">' + workerExpensesHtml + treasuryHtml + '</div></div>'
}"""

content = content[:fn_start] + new_treasury + '\n' + content[fn_end:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ All fixes applied!")
print("  1. Colors reverted to original gray/black theme")
print("  2. Treasury page separated - always on its own last page")
print("  3. Rooms distribute across pages, max 6 per page")
