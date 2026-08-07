'use client'

import { useState, useEffect, useRef } from 'react'

// ==================== TYPES ====================
interface User {
  id: string
  name: string
  role: 'admin' | 'employee' | 'viewer'
  branchId?: string
  shift?: string
  password?: string
}

interface Branch {
  id: string
  name: string
  employees?: Employee[]
}

interface Employee {
  id: string
  name: string
  branchId: string
  shift: string
  password: string
  role: string
  hasLogin: boolean
  startDate: string
  endDate: string
  multiBranchIds: string
  branch?: Branch
}

interface CarEntry {
  id: string
  date: string
  branchId: string
  empId: string
  empName: string
  room: string
  totalCars: number
  totalAmount: number
  extraCars: number
  extraAmount: number
  priceCounts: Record<string, number>
  customPrices: Record<string, { price: number; count: number }>
  entryTime: string
  createdAt: string
}

interface FinancialRecord {
  id: string
  empId: string
  type: 'withdrawal' | 'shortage'
  amount: number
  note: string
  date: string
  branchId: string
  employee?: Employee
}

interface WorkerExpense {
  id: string
  date: string
  branchId: string
  amount: number
  note: string
}

interface TreasuryItem {
  id: string
  date: string
  branchId: string
  total: number
  cash: number
  later: number
}

interface ClosedDay {
  id: string
  date: string
  branchId: string
}

// ==================== CONSTANTS ====================
const ROOMS = ['غرفة 1', 'غرفة 2', 'غرفة 3', 'غرفة 4', 'غرفة 5', 'غرفة 6', 'مكينة الغسيل']
const ALL_PRICES = [5, 10, 15, 20, 30, 35, 45]
const EXTRA_PRICES = [30, 35, 45]
const ROOM_PRICES: Record<string, number[]> = { 'مكينة الغسيل': [10, 15] }
let BRANCH_ROOMS: Record<string, string[]> = {
  'أبونواس': ['غرفة 1', 'غرفة 2', 'غرفة 3', 'غرفة 4', 'غرفة 5', 'مكينة الغسيل'],
  'المنصوره': ['غرفة 1', 'غرفة 2', 'غرفة 3']
}
let BRANCH_NET_DEDUCTION: Record<string, number> = {
  'بن غرسه': 10, 'أبونواس': 5, 'المنصوره': 0, 'عين زاره': 0
}
let MACHINE_NO_DEDUCTION_BRANCHES: string[] = ['بن غرسه', 'أبونواس']
let BRANCH_CLEANLINESS: Record<string, { type: string; value?: number; options?: number[] }> = {
  'بن غرسه': { type: 'fixed', value: 100 },
  'أبونواس': { type: 'fixed', value: 50 },
  'المنصوره': { type: 'select', options: [10, 20] },
  'عين زاره': { type: 'select', options: [10, 20, 30, 40, 50] }
}
const ROOM_ICONS: Record<string, string> = {
  'غرفة 1': '🚿', 'غرفة 2': '🚿', 'غرفة 3': '🚿',
  'غرفة 4': '🚿', 'غرفة 5': '🚿', 'غرفة 6': '🚿',
  'مكينة الغسيل': '⚙️'
}
const PRICE_BG: Record<number, string> = {
  5: 'bg-blue-500/10 border-blue-500/30',
  10: 'bg-cyan-500/10 border-cyan-500/30',
  15: 'bg-teal-500/10 border-teal-500/30',
  20: 'bg-emerald-500/10 border-emerald-500/30',
  30: 'bg-amber-500/10 border-amber-500/30',
  35: 'bg-orange-500/10 border-orange-500/30',
  45: 'bg-rose-500/10 border-rose-500/30'
}

function getRoomsForBranch(branchName: string) { return BRANCH_ROOMS[branchName] || ROOMS }
function getPricesForRoom(room: string) { return ROOM_PRICES[room] || ALL_PRICES }
function getNetAmount(totalAmount: number, branchName: string, roomName: string) {
  if (roomName === 'مكينة الغسيل' && MACHINE_NO_DEDUCTION_BRANCHES.includes(branchName)) return Math.floor(totalAmount / 2)
  const deduction = BRANCH_NET_DEDUCTION[branchName] !== undefined ? BRANCH_NET_DEDUCTION[branchName] : 0
  return Math.floor(totalAmount / 2) - deduction
}
function getNetFormulaText(branchName: string, roomName: string) {
  if (roomName === 'مكينة الغسيل' && MACHINE_NO_DEDUCTION_BRANCHES.includes(branchName)) return 'الإجمالي ÷ 2'
  const deduction = BRANCH_NET_DEDUCTION[branchName] !== undefined ? BRANCH_NET_DEDUCTION[branchName] : 0
  if (deduction === 0) return 'الإجمالي ÷ 2'
  return `الإجمالي ÷ 2 - ${deduction}`
}
function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function formatDateShort(dateStr: string) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

// ==================== PDF REPORT BUILDERS ====================
// Auto-adaptive sizing: level 0=normal(<=4 rooms), 1=compact(5-6), 2=ultra-compact(7+)
function buildRoomTableHTML(room: string, roomEntries: CarEntry[], branchName: string, sizeLevel?: number) {
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
  // Auto-adaptive: level 0=normal, 1=compact, 2=ultra-compact
  const sl = sizeLevel || 0
  const padMap = ['10px 10px', '5px 7px', '3px 5px']
  const fsMap = ['font-size:10px;', 'font-size:9px;', 'font-size:8px;']
  const titlePadMap = ['padding:10px 10px;', 'padding:5px 7px;', 'padding:3px 5px;']
  const titleFsMap = ['font-size:11px;', 'font-size:10px;', 'font-size:9px;']
  const countFsMap = ['font-size:11px;', 'font-size:10px;', 'font-size:9px;']
  const _pad = padMap[sl]
  const cellPad = 'padding:' + _pad + ';vertical-align:middle;'
  const cellFs = fsMap[sl]
  const titlePad = titlePadMap[sl]
  const titleFs = titleFsMap[sl]
  const countFs = countFsMap[sl]

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
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + countFs + 'font-weight:bold;">' + count + '</td>' +
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
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + countFs + 'font-weight:bold;">' + item.count + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">' + (item.price * item.count) + ' د.ل</td>' +
    '</tr>'
  })

  let extraRowHtml = ''
  if (roomExtraCars > 0) {
    extraRowHtml = '<tr style="background:#fffde7;">' +
      '<td colspan="2" style="' + cellPad + 'border:1px solid #555;' + cellFs + 'font-weight:bold;text-align:center;color:#e65100;">⭐ إكسترا</td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + countFs + 'font-weight:bold;color:#e65100;">' + roomExtraCars + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + countFs + 'font-weight:bold;color:#e65100;">' + roomExtraAmount + ' د.ل</td>' +
    '</tr>'
  }

  return '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;table-layout:fixed;border:1px solid #333;">' +
    '<colgroup><col style="width:10%;"/><col style="width:28%;"/><col style="width:24%;"/><col style="width:38%;"/></colgroup>' +
    '<tr><td colspan="4" style="' + titlePad + 'text-align:center;' + titleFs + 'font-weight:bold;background:#bdbdbd;color:#222;">' + room + '</td></tr>' +
    '<tr style="background:#e0e0e0;">' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">م</td>' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">السعر</td>' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">العدد</td>' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">الإجمالي</td>' +
    '</tr>' +
    rowsHtml +
    extraRowHtml +
    '<tr style="background:#e0e0e0;">' +
    '<td colspan="2" style="' + titlePad + 'border:1px solid #555;' + cellFs + 'font-weight:bold;text-align:center;">إجمالي الغرفة</td>' +
    '<td colspan="2" style="' + titlePad + 'border:1px solid #555;text-align:center;' + titleFs + 'font-weight:bold;">' + roomTotalCars + ' سيارة = ' + roomTotalAmount + ' د.ل</td>' +
    '</tr>' +
    '<tr style="background:#e8f5e9;">' +
    '<td colspan="2" style="' + titlePad + 'border:1px solid #555;' + cellFs + 'font-weight:bold;text-align:center;color:#2e7d32;">الصافي</td>' +
    '<td colspan="2" style="' + titlePad + 'border:1px solid #555;text-align:center;' + titleFs + 'font-weight:bold;color:#2e7d32;">' + roomNet + ' د.ل</td>' +
    '</tr>' +
    '</table>'
}


function buildEmptyRoomTableHTML(room: string, sizeLevel?: number) {
  const prices = getPricesForRoom(room)
  const sl = sizeLevel || 0
  const padMap = ['10px 10px', '5px 7px', '3px 5px']
  const fsMap = ['font-size:10px;', 'font-size:9px;', 'font-size:8px;']
  const titlePadMap = ['padding:10px 10px;', 'padding:5px 7px;', 'padding:3px 5px;']
  const titleFsMap = ['font-size:11px;', 'font-size:10px;', 'font-size:9px;']
  const _pad = padMap[sl]
  const cellPad = 'padding:' + _pad + ';vertical-align:middle;'
  const cellFs = fsMap[sl]
  const titlePad = titlePadMap[sl]
  const titleFs = titleFsMap[sl]
  let rowsHtml = ''
  let rowNum = 0
  prices.forEach(price => {
    rowNum++
    rowsHtml += '<tr>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + '">' + rowNum + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + '">' + price + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + '">0</td>' +
      '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + '">0</td>' +
    '</tr>'
  })
  return '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;table-layout:fixed;border:1px solid #333;">' +
    '<colgroup><col style="width:10%;"/><col style="width:28%;"/><col style="width:24%;"/><col style="width:38%;"/></colgroup>' +
    '<tr><td colspan="4" style="' + titlePad + 'text-align:center;' + titleFs + 'font-weight:bold;background:#bdbdbd;color:#222;">' + room + '</td></tr>' +
    '<tr style="background:#e0e0e0;">' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">م</td>' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">السعر</td>' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">العدد</td>' +
    '<td style="' + cellPad + 'border:1px solid #555;text-align:center;' + cellFs + 'font-weight:bold;">الإجمالي</td>' +
    '</tr>' +
    rowsHtml +
    '<tr style="background:#e0e0e0;">' +
    '<td colspan="2" style="' + titlePad + 'border:1px solid #555;' + cellFs + 'font-weight:bold;text-align:center;">إجمالي الغرفة</td>' +
    '<td colspan="2" style="' + titlePad + 'border:1px solid #555;text-align:center;' + titleFs + 'font-weight:bold;">0</td>' +
    '</tr>' +
    '<tr style="background:#e8f5e9;">' +
    '<td colspan="2" style="' + titlePad + 'border:1px solid #555;' + cellFs + 'font-weight:bold;text-align:center;color:#2e7d32;">الصافي</td>' +
    '<td colspan="2" style="' + titlePad + 'border:1px solid #555;text-align:center;' + titleFs + 'font-weight:bold;color:#2e7d32;">0</td>' +
    '</tr>' +
    '</table>'
}


const TREASURY_ITEMS = [
  { key: 'المبيعات', label: 'المبيعات' },
  { key: 'ملغي', label: 'ملغي' },
  { key: 'مصاريف_العمال', label: 'مصاريف العمال' },
  { key: 'بدل_البطاقة', label: 'بدل البطاقة المصرفية' },
  { key: 'بيع_البطاقة', label: 'بيع البطاقة المصرفية' },
  { key: 'كوبونات', label: 'كوبونات', branchOnly: 'بن غرسه' },
  { key: 'فائض', label: 'فائض' },
  { key: 'تم_التحويل', label: 'تم التحويل' }
]

function getTreasuryItems(branchName: string) {
  return TREASURY_ITEMS.filter(item => {
    if (item.branchOnly && item.branchOnly !== branchName) return false
    return true
  })
}

function buildCarReportHTML(selectedDate: string, branchId: string, branchName: string, entries: CarEntry[], savedWorkerExpenses?: Record<string, { cleanliness?: number; treasury?: Record<string, { income: number; expense: number }> }>): string[] {
  // Group entries by room
  const roomMap: Record<string, CarEntry[]> = {}
  entries.forEach(e => {
    if (!roomMap[e.room]) roomMap[e.room] = []
    roomMap[e.room].push(e)
  })

  const branchRooms = getRoomsForBranch(branchName)
  let grandTotalAmount = 0
  let grandTotalCars = 0
  let grandTotalNet = 0

  // Order rooms: regular rooms first, machine last
  const regularRooms = branchRooms.filter(r => r !== 'مكينة الغسيل')
  const hasMachine = branchRooms.includes('مكينة الغسيل')
  const orderedRooms = [...regularRooms]
  if (hasMachine) orderedRooms.push('مكينة الغسيل')

  // Auto-adaptive: calculate GLOBAL size level based on total rooms
  // 0 = normal (<=5 rooms), 1 = compact (never used currently), 2 = ultra-compact (6+)
  const totalRoomCount = orderedRooms.length
  const globalSizeLevel = totalRoomCount <= 5 ? 0 : 2

  // Build room data with global adaptive sizing
  const buildRoomCells = (sizeLevel: number) => {
    const cells: string[] = []
    orderedRooms.forEach(room => {
      const roomEntries = roomMap[room] || []
      if (roomEntries.length > 0) {
        const roomTotal = roomEntries.reduce((s, e) => s + e.totalAmount, 0)
        const roomCars = roomEntries.reduce((s, e) => s + e.totalCars, 0)
        grandTotalAmount += roomTotal
        grandTotalCars += roomCars
        grandTotalNet += getNetAmount(roomTotal, branchName, room)
        cells.push(buildRoomTableHTML(room, roomEntries, branchName, sizeLevel))
      } else {
        cells.push(buildEmptyRoomTableHTML(room, sizeLevel))
      }
    })
    return cells
  }

  // Build ALL room cells with global sizeLevel
  const roomCells = buildRoomCells(globalSizeLevel)

  // Helper: build rooms grid HTML from array of room cells (adaptive)
  const buildRoomsGrid = (cells: string[], sizeLevel?: number) => {
    let html = ''
    const sl = sizeLevel || 0
    const gapMap = ['10px', '7px', '5px']
    const mbMap = ['10px', '7px', '5px']
    const gap = gapMap[sl]
    const mb = mbMap[sl]
    for (let i = 0; i < cells.length; i += 2) {
      html += '<div style="display:flex;gap:' + gap + ';margin-bottom:' + mb + ';">' +
        '<div style="flex:1;min-width:0;">' + cells[i] + '</div>' +
        (cells[i + 1] ? '<div style="flex:1;min-width:0;">' + cells[i + 1] + '</div>' : '') +
        '</div>'
    }
    return html
  }

  // Helper: build page header (adaptive)
  const buildHeader = (sizeLevel?: number) => {
    const sl = sizeLevel || 0
    const fsMap = ['22px', '18px', '15px']
    const dateFsMap = ['14px', '12px', '10px']
    const mbMap = ['14px', '10px', '6px']
    const pbMap = ['10px', '6px', '4px']
    return '<div style="text-align:center;margin-bottom:' + mbMap[sl] + ';border-bottom:2px solid #000;padding-bottom:' + pbMap[sl] + ';">' +
      '<h1 style="font-size:' + fsMap[sl] + ';font-weight:bold;margin:0 0 6px 0;">مغسلة <span style="margin:0 0 0 15px;">' + branchName + '</span></h1>' +
      '<p style="font-size:' + dateFsMap[sl] + ';margin:0;color:#000000;">التاريخ: ' + formatDateShort(selectedDate) + '</p>' +
      '</div>'
  }

  // Adaptive page container padding
  const roomPagePadMap = ['12px 10px', '10px 8px', '8px 6px']
  const treasuryPagePadMap = ['8px 10px', '6px 8px', '4px 6px']
  const sl = globalSizeLevel

  // Split rooms across pages: max 6 rooms per page (3 rows × 2 cols)
  const MAX_ROOMS_PER_PAGE = 6
  const pages: string[] = []

  const totalFullPages = Math.floor(roomCells.length / MAX_ROOMS_PER_PAGE)
  const hasRemainder = roomCells.length % MAX_ROOMS_PER_PAGE > 0

  // Full room pages - ALL use global adaptive sizeLevel
  for (let p = 0; p < totalFullPages; p++) {
    const pageRooms = roomCells.slice(p * MAX_ROOMS_PER_PAGE, (p + 1) * MAX_ROOMS_PER_PAGE)
    const isFullPage = pageRooms.length === MAX_ROOMS_PER_PAGE
    // Full pages (e.g. 6 rooms): no min-height/centering to prevent last table cut-off
    // Partial pages: keep min-height for clean layout
    const containerStyle = isFullPage
      ? 'width:780px;color:#000000;padding:' + roomPagePadMap[sl] + ';font-family:Cairo,sans-serif;display:flex;flex-direction:column;box-sizing:border-box;'
      : 'width:780px;min-height:1120px;color:#000000;padding:' + roomPagePadMap[sl] + ';font-family:Cairo,sans-serif;display:flex;flex-direction:column;box-sizing:border-box;'
    const contentStyle = isFullPage
      ? 'display:flex;flex-direction:column;align-items:center;'
      : 'flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;'
    pages.push(
      '<div style="' + containerStyle + '" dir="rtl">' +
      buildHeader(sl) +
      '<div style="' + contentStyle + '">' +
      buildRoomsGrid(pageRooms, sl) +
      '</div>' +
      '</div>'
    )
  }

  // Overflow rooms for treasury page
  const overflowRoomCount = hasRemainder ? roomCells.length % MAX_ROOMS_PER_PAGE : 0
  const overflowCells = overflowRoomCount > 0 ? roomCells.slice(totalFullPages * MAX_ROOMS_PER_PAGE) : []

  // Treasury page - uses same global sizeLevel
  const treasuryContent = buildWorkerExpensesAndTreasury(branchName, selectedDate, orderedRooms, entries, grandTotalNet, savedWorkerExpenses, sl)
  const overflowHtml = overflowCells.length > 0 ? buildRoomsGrid(overflowCells, sl) : ''
  pages.push(
    '<div style="width:780px;color:#000000;padding:' + treasuryPagePadMap[sl] + ';font-family:Cairo,sans-serif;" dir="rtl">' +
    buildHeader(sl) +
    overflowHtml +
    treasuryContent +
    '</div>'
  )

  return pages
}

// Helper: build worker expenses + treasury section (used on last page of car report)
// sizeLevel: 0=normal, 1=compact, 2=ultra-compact
function buildWorkerExpensesAndTreasury(
  branchName: string, selectedDate: string, orderedRooms: string[], entries: CarEntry[],
  grandTotalNet: number, savedWorkerExpenses?: Record<string, { cleanliness?: number; treasury?: Record<string, { income: number; expense: number }> }>,
  sizeLevel?: number
): string {
  const sl = sizeLevel || 0
  // Adaptive sizing maps
  const wPadMap = ['padding:7px 10px;', 'padding:5px 7px;', 'padding:3px 5px;']
  const wLabelFsMap = ['font-size:10px;', 'font-size:9px;', 'font-size:8px;']
  const wValueFsMap = ['font-size:12px;', 'font-size:10px;', 'font-size:9px;']
  const wTotalFsMap = ['font-size:14px;', 'font-size:12px;', 'font-size:10px;']
  const wTitlePadMap = ['padding:7px 10px;', 'padding:5px 7px;', 'padding:3px 5px;']
  const wTitleFsMap = ['font-size:11px;', 'font-size:10px;', 'font-size:9px;']
  const tPadMap = ['padding:7px 10px;', 'padding:5px 7px;', 'padding:3px 5px;']
  const tLabelFsMap = ['font-size:9px;', 'font-size:8px;', 'font-size:7px;']
  const tValueFsMap = ['font-size:10px;', 'font-size:9px;', 'font-size:8px;']
  const sepMtMap = ['margin-top:6px;padding-top:6px;', 'margin-top:4px;padding-top:4px;', 'margin-top:2px;padding-top:2px;']
  const sepGapMap = ['gap:8px;', 'gap:5px;', 'gap:3px;']

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

  const wPad = wPadMap[sl]
  const wCellPad = wPad + 'border:1px solid #555;vertical-align:middle;'
  const wLabelFs = wLabelFsMap[sl]
  const wValueFs = wValueFsMap[sl]

  let workerRowsHtml = ''
  orderedRooms.forEach(room => {
    const roomEnts = entries.filter(e => e.room === room)
    const roomAmt = roomEnts.reduce((s, e) => s + e.totalAmount, 0)
    const roomNet = getNetAmount(roomAmt, branchName, room)
    if (roomNet === 0) return
    const icon = ROOM_ICONS[room] || '🏠'
    workerRowsHtml += '<tr>' +
      '<td style="' + wCellPad + wLabelFs + 'text-align:center;">' + icon + ' ' + room + '</td>' +
      '<td style="' + wCellPad + 'text-align:center;' + wValueFs + 'font-weight:bold;">' + roomNet + ' د.ل</td>' +
    '</tr>'
  })

  workerRowsHtml += '<tr style="">' +
    '<td style="' + wCellPad + wLabelFs + 'font-weight:bold;text-align:center;color:#e65100;">🧹 النظافة</td>' +
    '<td style="' + wCellPad + 'text-align:center;' + wValueFs + 'font-weight:bold;color:#e65100;">' + savedCleanliness + ' د.ل</td>' +
  '</tr>'

  const finalTotalAfterExpenses = grandTotalNet + savedCleanliness
  const wTotalFs = wTotalFsMap[sl]
  workerRowsHtml += '<tr style="">' +
    '<td style="' + wCellPad + 'border:2px solid #333;' + wLabelFs + 'font-weight:bold;text-align:center;">الإجمالي</td>' +
    '<td style="' + wCellPad + 'border:2px solid #333;text-align:center;' + wTotalFs + 'font-weight:bold;color:#2e7d32;">' + finalTotalAfterExpenses + ' د.ل</td>' +
  '</tr>'

  const wTitlePad = wTitlePadMap[sl]
  const wTitleFs = wTitleFsMap[sl]
  const workerExpensesHtml = '<div style="flex:1;border:1.5px solid #333;">' +
    '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;">' +
    '<tr><td colspan="2" style="' + wTitlePad + 'text-align:center;' + wTitleFs + 'font-weight:bold;border:1px solid #555;vertical-align:middle;">مصاريف العمال</td></tr>' +
    workerRowsHtml +
    '</table>' +
    '</div>'

  const treasSaved = savedWE.treasury || {}
  const pdfTreasuryItems = getTreasuryItems(branchName)
  const pdfBankCardSale = parseInt(String(treasSaved['بيع_البطاقة']?.expense)) || 0
  const pdfBankCardReplace = Math.floor(pdfBankCardSale / 2)
  const pdfWorkerExpInTreasury = finalTotalAfterExpenses - pdfBankCardReplace

  const tPad = tPadMap[sl]
  const tCellPad = tPad + 'border:1px solid #555;vertical-align:middle;'
  const tLabelStyle = tCellPad + tLabelFsMap[sl]
  const tValueStyle = tCellPad + 'text-align:center;' + tValueFsMap[sl] + 'font-weight:bold;'

  let treasuryRowsHtml = ''
  treasuryRowsHtml += '<tr style="">' +
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
    '<tr><td colspan="4" style="' + wTitlePad + 'text-align:center;' + wTitleFs + 'font-weight:bold;border:1px solid #555;">الخزينة</td></tr>' +
    treasuryRowsHtml +
    '</table>' +
    '</div>'

  return '<div style="' + sepMtMap[sl] + 'border-top:2px solid #000;"><div style="display:flex;' + sepGapMap[sl] + '">' + workerExpensesHtml + treasuryHtml + '</div></div>'
}




// ==================== EMPLOYEE REPORT (WITHDRAWALS/SHORTAGES) ====================
function buildEmployeeReportHTML(
  periodLabel: string,
  allEmployees: Employee[],
  allRecords: FinancialRecord[],
  allBranches: Branch[],
  matchRecord: (r: FinancialRecord) => boolean
): string[] {
  // Exclude deleted employees
  const activeEmployees = allEmployees.filter((e: any) => !e.deleted)
  const now = new Date()
  const generatedOn = now.toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' })
  const pages: string[] = []

  let grandWithdrawals = 0
  let grandShortages = 0
  const branchDatas: { name: string; withdrawals: number; shortages: number; empsHtml: string }[] = []

  allBranches.forEach(branch => {
    const branchEmps = activeEmployees.filter(e => e.branchId === branch.id)
    if (branchEmps.length === 0) return

    let branchWithdrawals = 0
    let branchShortages = 0
    let rowsHtml = ''
    let branchHasRecords = false

    branchEmps.forEach(emp => {
      const empRecords = allRecords
        .filter(r => r.empId === emp.id && matchRecord(r))
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      const withdrawals = empRecords.filter(r => r.type === 'withdrawal').reduce((sum, r) => sum + r.amount, 0)
      const shortages = empRecords.filter(r => r.type === 'shortage').reduce((sum, r) => sum + r.amount, 0)
      const total = withdrawals + shortages
      branchWithdrawals += withdrawals
      branchShortages += shortages
      grandWithdrawals += withdrawals
      grandShortages += shortages
      if (empRecords.length > 0) branchHasRecords = true

      let detailHtml = ''
      empRecords.forEach(r => {
        const typeLabel = r.type === 'withdrawal' ? 'سحب' : 'عجز'
        const typeColor = r.type === 'withdrawal' ? '#b45309' : '#be123c'
        detailHtml += '<tr>' +
          '<td style="padding:4px 8px;border:1px solid #eee;font-size:11px;color:#000000;">' + formatDateShort(r.date) + '</td>' +
          '<td style="padding:4px 8px;border:1px solid #eee;font-size:11px;color:' + typeColor + ';font-weight:600;">' + typeLabel + '</td>' +
          '<td style="padding:4px 8px;border:1px solid #eee;font-size:11px;">' + r.amount + ' د.ل</td>' +
          '<td style="padding:4px 8px;border:1px solid #eee;font-size:11px;color:#000000;">' + (r.note || '—') + '</td>' +
          '</tr>'
      })

      rowsHtml += '<tr style="background:#f8fafc;">' +
        '<td style="padding:8px;border:1px solid #ddd;font-weight:700;color:#0e7490;">' + emp.name + ' <span style="font-size:10px;color:#94a3b8;font-weight:400;">(' + emp.shift + ')</span></td>' +
        '<td style="padding:8px;border:1px solid #ddd;color:#b45309;font-weight:bold;">' + withdrawals + ' د.ل</td>' +
        '<td style="padding:8px;border:1px solid #ddd;color:#be123c;font-weight:bold;">' + shortages + ' د.ل</td>' +
        '<td style="padding:8px;border:1px solid #ddd;font-weight:800;color:#1e293b;">' + total + ' د.ل</td>' +
        '</tr>'
      if (detailHtml) {
        rowsHtml += '<tr><td colspan="4" style="padding:0;border:1px solid #ddd;">' +
          '<table style="width:100%;border-collapse:collapse;margin:0;">' +
          '<thead><tr style="background:#f1f5f9;">' +
          '<th style="padding:4px 8px;border:1px solid #eee;font-size:10px;color:#64748b;">التاريخ</th>' +
          '<th style="padding:4px 8px;border:1px solid #eee;font-size:10px;color:#64748b;">النوع</th>' +
          '<th style="padding:4px 8px;border:1px solid #eee;font-size:10px;color:#64748b;">المبلغ</th>' +
          '<th style="padding:4px 8px;border:1px solid #eee;font-size:10px;color:#64748b;">ملاحظة</th>' +
          '</tr></thead>' +
          '<tbody>' + detailHtml + '</tbody>' +
          '</table></td></tr>'
      }
    })

    if (!branchHasRecords) return
    branchDatas.push({ name: branch.name, withdrawals: branchWithdrawals, shortages: branchShortages, empsHtml: rowsHtml })
  })

  // ---- Multi-branch employees section ----
  const multiEmps = activeEmployees.filter(e => {
    try { return JSON.parse(e.multiBranchIds || '[]').length > 0 } catch { return false }
  })
  if (multiEmps.length > 0) {
    let multiWithdrawals = 0
    let multiShortages = 0
    let multiRowsHtml = ''
    let multiHasRecords = false

    multiEmps.forEach(emp => {
      const empRecords = allRecords
        .filter(r => r.empId === emp.id && matchRecord(r))
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      const withdrawals = empRecords.filter(r => r.type === 'withdrawal').reduce((sum, r) => sum + r.amount, 0)
      const shortages = empRecords.filter(r => r.type === 'shortage').reduce((sum, r) => sum + r.amount, 0)
      const total = withdrawals + shortages
      multiWithdrawals += withdrawals
      multiShortages += shortages
      grandWithdrawals += withdrawals
      grandShortages += shortages
      if (empRecords.length > 0) multiHasRecords = true

      const branchNames = (() => {
        try {
          const ids: string[] = JSON.parse(emp.multiBranchIds || '[]')
          return ids.map(id => allBranches.find(b => b.id === id)?.name).filter(Boolean).join(' | ')
        } catch { return '' }
      })()

      let detailHtml = ''
      empRecords.forEach(r => {
        const typeLabel = r.type === 'withdrawal' ? 'سحب' : 'عجز'
        const typeColor = r.type === 'withdrawal' ? '#b45309' : '#be123c'
        const recordBranchName = allBranches.find(b => b.id === r.branchId)?.name || ''
        detailHtml += '<tr>' +
          '<td style="padding:4px 8px;border:1px solid #eee;font-size:11px;color:#000000;">' + formatDateShort(r.date) + '</td>' +
          '<td style="padding:4px 8px;border:1px solid #eee;font-size:11px;color:' + typeColor + ';font-weight:600;">' + typeLabel + '</td>' +
          '<td style="padding:4px 8px;border:1px solid #eee;font-size:11px;color:#000000;font-weight:600;">' + recordBranchName + '</td>' +
          '<td style="padding:4px 8px;border:1px solid #eee;font-size:11px;">' + r.amount + ' د.ل</td>' +
          '<td style="padding:4px 8px;border:1px solid #eee;font-size:11px;color:#000000;">' + (r.note || '—') + '</td>' +
          '</tr>'
      })

      multiRowsHtml += '<tr style="background:#fffbeb;">' +
        '<td style="padding:8px;border:1px solid #ddd;font-weight:700;color:#92400e;">' + emp.name + ' <span style="font-size:10px;color:#94a3b8;font-weight:400;">(' + (branchNames || emp.shift) + ')</span></td>' +
        '<td style="padding:8px;border:1px solid #ddd;color:#b45309;font-weight:bold;">' + withdrawals + ' د.ل</td>' +
        '<td style="padding:8px;border:1px solid #ddd;color:#be123c;font-weight:bold;">' + shortages + ' د.ل</td>' +
        '<td style="padding:8px;border:1px solid #ddd;font-weight:800;color:#1e293b;">' + total + ' د.ل</td>' +
        '</tr>'
      if (detailHtml) {
        multiRowsHtml += '<tr><td colspan="5" style="padding:0;border:1px solid #ddd;">' +
          '<table style="width:100%;border-collapse:collapse;margin:0;"><thead><tr style="background:#f1f5f9;">' +
          '<th style="padding:4px 8px;border:1px solid #eee;font-size:10px;color:#64748b;">التاريخ</th>' +
          '<th style="padding:4px 8px;border:1px solid #eee;font-size:10px;color:#64748b;">النوع</th>' +
          '<th style="padding:4px 8px;border:1px solid #eee;font-size:10px;color:#64748b;">الفرع</th>' +
          '<th style="padding:4px 8px;border:1px solid #eee;font-size:10px;color:#64748b;">المبلغ</th>' +
          '<th style="padding:4px 8px;border:1px solid #eee;font-size:10px;color:#64748b;">ملاحظة</th>' +
          '</tr></thead><tbody>' + detailHtml + '</tbody></table></td></tr>'
      }
    })

    if (multiHasRecords) {
      branchDatas.push({ name: '🌐 موظفين مشتركين (أكثر من فرع)', withdrawals: multiWithdrawals, shortages: multiShortages, empsHtml: multiRowsHtml })
    }
  }

  if (branchDatas.length === 0) {
    pages.push('<div style="width:800px;color:#000000;padding:32px;font-family:Cairo,sans-serif;">' +
      '<div style="text-align:center;margin-bottom:20px;border-bottom:3px solid #0e7490;padding-bottom:16px;">' +
      '<h1 style="font-size:22px;font-weight:800;color:#0e7490;margin:0;">مغسلة جيت كلين</h1>' +
      '<p style="font-size:15px;font-weight:700;margin:6px 0 0;color:#000000;">تقرير مصاريف الموظفين التفصيلي</p>' +
      '<p style="font-size:12px;color:#000000;margin:4px 0 0;">' + periodLabel + '</p>' +
      '</div>' +
      '<p style="text-align:center;color:#000000;font-size:14px;margin-top:60px;">لا توجد سحوبات أو عجوزات في هذه الفترة</p>' +
      '</div>')
    return pages
  }

  const grandTotal = grandWithdrawals + grandShortages
  const headerHtml = '<div style="text-align:center;margin-bottom:16px;border-bottom:3px solid #0e7490;padding-bottom:12px;">' +
    '<h1 style="font-size:20px;font-weight:800;color:#0e7490;margin:0;">مغسلة جيت كلين</h1>' +
    '<p style="font-size:14px;font-weight:700;margin:4px 0 0;">تقرير مصاريف الموظفين التفصيلي</p>' +
    '<p style="font-size:11px;color:#000000;margin:4px 0 0;">' + periodLabel + ' — ' + generatedOn + '</p>' +
    '</div>'
  const summaryHtml = '<div style="display:flex;gap:12px;margin-bottom:16px;">' +
    '<div style="flex:1;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px;text-align:center;">' +
    '<p style="font-size:10px;color:#92400e;margin:0;">إجمالي السحبيات</p>' +
    '<p style="font-size:16px;font-weight:800;color:#b45309;margin:2px 0 0;">' + grandWithdrawals + ' د.ل</p>' +
    '</div>' +
    '<div style="flex:1;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;padding:8px;text-align:center;">' +
    '<p style="font-size:10px;color:#9f1239;margin:0;">إجمالي العجوزات</p>' +
    '<p style="font-size:16px;font-weight:800;color:#be123c;margin:2px 0 0;">' + grandShortages + ' د.ل</p>' +
    '</div>' +
    '<div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px;text-align:center;">' +
    '<p style="font-size:10px;color:#166534;margin:0;">الإجمالي العام</p>' +
    '<p style="font-size:16px;font-weight:800;color:#15803d;margin:2px 0 0;">' + grandTotal + ' د.ل</p>' +
    '</div></div>'

  const footerHtml = '<div style="text-align:center;margin-top:12px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:9px;color:#000000;">صفحة __PAGE__</div>'
  const pageStyle = 'width:800px;color:#000000;padding:24px;font-family:Cairo,sans-serif;'
  const pageWithMinHeight = pageStyle + 'min-height:1120px;'

  // Render each branch as a separate block, then pack into pages
  const branchBlocks: { html: string; estimatedHeight: number }[] = []
  branchDatas.forEach(bd => {
    const blockHtml = '<div style="margin-bottom:16px;">' +
      '<h3 style="background:#0e7490;color:#fff;padding:6px 10px;border-radius:6px;font-size:13px;margin-bottom:6px;">' +
      'فرع ' + bd.name + ' — سحوبات: ' + bd.withdrawals + ' د.ل | عجوزات: ' + bd.shortages + ' د.ل | الإجمالي: ' + (bd.withdrawals + bd.shortages) + ' د.ل' +
      '</h3>' +
      '<table style="width:100%;border-collapse:collapse;font-size:11px;">' +
      '<thead><tr style="background:#e2e8f0;">' +
      '<th style="padding:6px;border:1px solid #ddd;">الموظف</th>' +
      '<th style="padding:6px;border:1px solid #ddd;">السحبيات</th>' +
      '<th style="padding:6px;border:1px solid #ddd;">العجوزات</th>' +
      '<th style="padding:6px;border:1px solid #ddd;">الإجمالي</th>' +
      '</tr></thead>' +
      '<tbody>' + bd.empsHtml + '</tbody>' +
      '</table></div>'
    // Estimate: title ~30px + header row ~30px + each emp row ~35px + detail rows ~25px each
    const rowCount = bd.empsHtml.split('<tr').length
    branchBlocks.push({ html: blockHtml, estimatedHeight: 30 + 30 + rowCount * 35 })
  })

  // Header + summary estimated ~200px, footer ~30px, page usable ~880px (1120 - 200 - 30)
  const headerHeight = 200
  const footerHeight = 30
  const usableHeight = 890

  let pageNum = 1
  let currentPageContent = headerHtml + summaryHtml
  let currentPageUsed = headerHeight

  branchBlocks.forEach((block, idx) => {
    if (currentPageUsed + block.estimatedHeight + footerHeight > 1120 && idx > 0) {
      // Current page is full, start a new one
      currentPageContent += footerHtml.replace('__PAGE__', String(pageNum))
      pages.push('<div style="' + pageWithMinHeight + '">' + currentPageContent + '</div>')
      pageNum++
      currentPageContent = headerHtml + block.html
      currentPageUsed = headerHeight + block.estimatedHeight
    } else {
      currentPageContent += block.html
      currentPageUsed += block.estimatedHeight
    }
  })

  // Last page
  if (currentPageContent) {
    currentPageContent += footerHtml.replace('__PAGE__', String(pageNum))
    const isLastPage = branchBlocks.length <= 2
    pages.push('<div style="' + (isLastPage ? pageWithMinHeight : pageStyle) + '">' + currentPageContent + '</div>')
  }

  return pages
}

// ==================== MAIN COMPONENT ====================
export default function JetCleanApp() {
  // Screen state
  const [screen, setScreen] = useState<'login' | 'employee' | 'admin'>('login')

  // Auth state
  const [user, setUser] = useState<User | null>(null)
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [adminSelectedBranch, setAdminSelectedBranch] = useState<string | null>(null)

  // Data state
  const [branches, setBranches] = useState<Branch[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [carEntries, setCarEntries] = useState<CarEntry[]>([])
  const [records, setRecords] = useState<FinancialRecord[]>([])
  const [closedDays, setClosedDays] = useState<ClosedDay[]>([])
  const [workerExpenses, setWorkerExpenses] = useState<WorkerExpense[]>([])
  const [treasuries, setTreasuries] = useState<TreasuryItem[]>([])

  // Login state
  const [loginEmpId, setLoginEmpId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Employee screen state
  const [empDate, setEmpDate] = useState(todayISO())
  const [showEmpCalendar, setShowEmpCalendar] = useState(false)
  const [calMonth, setCalMonth] = useState(() => todayISO().slice(0, 7))
  const [datesWithData, setDatesWithData] = useState<string[]>([])
  const [selectedRoom, setSelectedRoom] = useState('')
  const [priceInputs, setPriceInputs] = useState<Record<number, number>>({})
  const [customPricesData, setCustomPricesData] = useState<Record<string, { price: number; count: number }>>({})
  const [customPriceInput, setCustomPriceInput] = useState('')
  const [customCountInput, setCustomCountInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [quickBankCardSale, setQuickBankCardSale] = useState('')
  const [quickCoupons, setQuickCoupons] = useState('')
  const [quickExpName, setQuickExpName] = useState('')
  const [quickExpAmount, setQuickExpAmount] = useState('')
  const [quickExpenses, setQuickExpenses] = useState<{ name: string; amount: number }[]>([])

  // إشعارات الإضافة التلقائية + تحديث حي
  const [notifications, setNotifications] = useState<{ id: string; message: string; time: string }[]>([])
  const [lastCarEntryIds, setLastCarEntryIds] = useState<Set<string>>(new Set())
  const [liveUpdateKey, setLiveUpdateKey] = useState(0)
  const [showActiveEmpsDropdown, setShowActiveEmpsDropdown] = useState(true)

  // Withdrawal/Shortage quick entry state
  const [qEmpId, setQEmpId] = useState('')
  const [qRecordType, setQRecordType] = useState<'withdrawal' | 'shortage'>('withdrawal')
  const [qRecordAmount, setQRecordAmount] = useState('')
  const [qRecordNote, setQRecordNote] = useState('')

  // Admin screen state
  const [adminDate, setAdminDate] = useState(todayISO())

  // Modal states
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [recordModalData, setRecordModalData] = useState({
    id: '', empId: '', empName: '', type: 'withdrawal' as 'withdrawal' | 'shortage',
    amount: '', note: '', date: todayISO(), branchId: ''
  })
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchRooms, setNewBranchRooms] = useState(6)
  const [newBranchHasMachine, setNewBranchHasMachine] = useState(true)
  const [newBranchNetDeduction, setNewBranchNetDeduction] = useState(0)
  const [newBranchMachineNoDeduction, setNewBranchMachineNoDeduction] = useState(false)
  const [newBranchCleanType, setNewBranchCleanType] = useState<'fixed' | 'select'>('select')
  const [newBranchCleanValue, setNewBranchCleanValue] = useState(20)
  const [newBranchCleanOptions, setNewBranchCleanOptions] = useState('10,20')
  const [showEmpModal, setShowEmpModal] = useState(false)
  const [newEmp, setNewEmp] = useState({ name: '', branchId: '', shift: 'الفترة الصباحية', password: '', role: 'employee', hasLogin: false, startDate: '', endDate: '', multiBranchIds: [] as string[] })
  const [showMultiBranchPicker, setShowMultiBranchPicker] = useState(false)
  const [showEditEmpModal, setShowEditEmpModal] = useState(false)
  const [editEmp, setEditEmp] = useState<any>(null)
  const [showPasswordsModal, setShowPasswordsModal] = useState(false)
  const [empPasswords, setEmpPasswords] = useState<Record<string, string>>({})
  const [adminPassword, setAdminPassword] = useState('')
  const [showChangePwdModal, setShowChangePwdModal] = useState(false)
  const [empNewPwd, setEmpNewPwd] = useState('')
  const [showClosingModal, setShowClosingModal] = useState(false)

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [showAdminDropdown, setShowAdminDropdown] = useState(false)
  const [exportRangeType, setExportRangeType] = useState<'month' | 'day' | 'range'>('month')
  const [exportMonth, setExportMonth] = useState('')
  const [exportDay, setExportDay] = useState('')
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportingEmp, setExportingEmp] = useState(false)
  const [showEmpReportModal, setShowEmpReportModal] = useState(false)
  const [showExpReportModal, setShowExpReportModal] = useState(false)
  const [expReportBranchId, setExpReportBranchId] = useState<string>('')
  const [expReportPeriod, setExpReportPeriod] = useState<'day' | 'range' | 'month'>('day')
  const [expReportDay, setExpReportDay] = useState(() => new Date().toISOString().split('T')[0])
  const [expReportFrom, setExpReportFrom] = useState('')
  const [expReportTo, setExpReportTo] = useState('')
  const [expReportMonth, setExpReportMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const [empReportRange, setEmpReportRange] = useState<'month' | 'day' | 'range'>('month')
  const [empReportMonth, setEmpReportMonth] = useState(() => {
    const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0')
  })
  const [empReportDay, setEmpReportDay] = useState(() => new Date().toISOString().split('T')[0])
  const [empReportFrom, setEmpReportFrom] = useState('')
  const [empReportTo, setEmpReportTo] = useState('')

  // Worker expenses state
  const [cleanlinessAmount, setCleanlinessAmount] = useState(0)
  const [workerExpData, setWorkerExpData] = useState<Record<string, { cleanliness?: number; treasury?: Record<string, { income: number; expense: number }> }>>({})

  const pdfAreaRef = useRef<HTMLDivElement>(null)

  // ==================== DATA FETCHING ====================
  const loadBranches = async () => {
    try {
      const res = await fetch('/api/branches')
      if (res.ok) {
        const data = await res.json()
        setBranches(data)
        // Sync branch configs to global constants
        data.forEach((b: any) => {
          if (b.config) {
            const cfg = b.config as any
            const rooms: string[] = []
            for (let i = 1; i <= (cfg.rooms || 6); i++) rooms.push(`غرفة ${i}`)
            if (cfg.hasMachine !== false) rooms.push('مكينة الغسيل')
            BRANCH_ROOMS[b.name] = rooms
            BRANCH_NET_DEDUCTION[b.name] = cfg.netDeduction ?? 0
            if (cfg.machineNoDeduction && !MACHINE_NO_DEDUCTION_BRANCHES.includes(b.name)) {
              MACHINE_NO_DEDUCTION_BRANCHES.push(b.name)
            }
            if (cfg.cleanliness) BRANCH_CLEANLINESS[b.name] = cfg.cleanliness
          }
        })
      }
    } catch (e) { console.error(e) }
  }

  const loadEmployees = async () => {
    try {
      const res = await fetch('/api/employees')
      if (res.ok) {
        const allEmps = await res.json()
        setEmployees(allEmps.filter((e: any) => !e.deleted))
      }
    } catch (e) { console.error(e) }
  }

  const loadCarEntries = async (date?: string, branchId?: string, empId?: string) => {
    try {
      const params = new URLSearchParams()
      if (date) params.set('date', date)
      if (branchId) params.set('branchId', branchId)
      if (empId) params.set('empId', empId)
      const res = await fetch(`/api/car-entries?${params}`)
      if (res.ok) setCarEntries(await res.json())
    } catch (e) { console.error(e) }
  }

  const loadAllCarEntries = async (date?: string) => {
    try {
      const params = new URLSearchParams()
      if (date) params.set('date', date)
      const res = await fetch(`/api/car-entries?${params}`)
      if (res.ok) setCarEntries(await res.json())
    } catch (e) { console.error(e) }
  }

  const loadRecords = async (params?: { empId?: string; date?: string; branchId?: string }, cacheBuster?: boolean) => {
    try {
      const searchParams = new URLSearchParams()
      if (params?.empId) searchParams.set('empId', params.empId)
      if (cacheBuster) searchParams.set('_t', String(Date.now()))
      const res = await fetch(`/api/records?${searchParams}`, { cache: 'no-store' })
      if (res.ok) setRecords(await res.json())
    } catch (e) { console.error(e) }
  }

  const loadClosedDays = async (date?: string) => {
    try {
      const params = new URLSearchParams()
      if (date) params.set('date', date)
      const res = await fetch(`/api/closed-days?${params}`)
      if (res.ok) setClosedDays(await res.json())
    } catch (e) { console.error(e) }
  }

  const loadWorkerExpenses = async (date?: string, branchId?: string) => {
    try {
      const params = new URLSearchParams()
      if (date) params.set('date', date)
      if (branchId) params.set('branchId', branchId)
      const res = await fetch(`/api/worker-expenses?${params}`)
      if (res.ok) {
        const data = await res.json()
        setWorkerExpenses(data)
        // Parse jsonData into workerExpData
        if (data.length > 0 && data[0].jsonData) {
          const jd = data[0].jsonData as { cleanliness?: number; treasury?: Record<string, { income: number; expense: number }> }
          const branch = branches.find(b => b.id === branchId)
          const bName = branch?.name || ''
          if (bName && date) {
            setWorkerExpData(prev => ({ ...prev, [bName + '_' + date]: jd }))
          }
        }
      }
    } catch (e) { console.error(e) }
  }

  const loadTreasuries = async (date?: string, branchId?: string) => {
    try {
      const params = new URLSearchParams()
      if (date) params.set('date', date)
      if (branchId) params.set('branchId', branchId)
      const res = await fetch(`/api/treasury?${params}`)
      if (res.ok) setTreasuries(await res.json())
    } catch (e) { console.error(e) }
  }

  // ==================== LOGIN ====================
  const handleLogin = async () => {
    if (!loginEmpId) { setLoginError('الرجاء اختيار اسم المستخدم'); return }
    if (!loginPassword) { setLoginError('الرجاء إدخال رمز المرور'); return }
    setLoginLoading(true)
    setLoginError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId: loginEmpId, password: loginPassword })
      })
      const data = await res.json()
      if (!data.success) {
        setLoginError(data.error)
        setLoginLoading(false)
        return
      }

      setUser(data.user)
      setLoginPassword('')
      setLoginEmpId('')
      setLoginLoading(false)

      if (data.user.role === 'admin' || data.user.role === 'viewer') {
        setIsAdminMode(false)
        setAdminSelectedBranch(null)
        setAdminDate(todayISO())
        setScreen('admin')
      } else {
        setIsAdminMode(false)
        setAdminSelectedBranch(null)
        setEmpDate(todayISO())
        setScreen('employee')
      }
    } catch {
      setLoginError('حدث خطأ في الاتصال')
      setLoginLoading(false)
    }
  }

  const getEmployeeBranch = () => {
    if (!user?.branchId) return null
    return branches.find(b => b.id === user.branchId) || null
  }

  const switchToCarEntry = () => {
    if (user?.role === 'viewer') {
      setIsAdminMode(false)
    } else {
      setIsAdminMode(true)
    }
    setAdminSelectedBranch(null)
    setPriceInputs({})
    setCustomPricesData({})
    setSelectedRoom('')
    setEmpDate(todayISO())
    setScreen('employee')
  }

  const switchToAdminManagement = () => {
    setIsAdminMode(false)
    setAdminSelectedBranch(null)
    setAdminDate(todayISO())
    setScreen('admin')
  }

  const handleLogout = () => {
    if (!confirm('هل تريد تسجيل الخروج؟')) return
    setUser(null)
    setIsAdminMode(false)
    setAdminSelectedBranch(null)
    setScreen('login')
  }

  const handleChangeOwnPassword = async () => {
    if (!user) return
    const trimmed = empNewPwd.trim()
    if (!trimmed) return alert('الرجاء إدخال كلمة المرور الجديدة')
    if (trimmed.length < 4) return alert('كلمة المرور يجب أن تكون 4 أرقام على الأقل')
    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, password: trimmed })
      })
      if (res.ok) {
        alert('✅ تم تغيير كلمة المرور بنجاح')
        setEmpNewPwd('')
        setShowChangePwdModal(false)
      } else {
        alert('حدث خطأ أثناء تغيير كلمة المرور')
      }
    } catch (e) { alert('حدث خطأ') }
  }

  // نسخ احتياطي تلقائي صامت
  const autoBackup = () => {
    try { fetch('/api/backup', { method: 'POST' }) } catch (_) {}
  }

  const handleRestore = async () => {
    setRestoreLoading(true)
    try {
      // Get list of backups
      const listRes = await fetch('/api/backup')
      const listData = await listRes.json()
      const backups = listData.backups || []
      if (backups.length === 0) {
        alert('❌ لا توجد نسخ احتياطية')
        setRestoreLoading(false)
        return
      }

      // Show backup list to user
      const options = backups.map((b: any, i: number) => `${i + 1}. ${b.label} (${new Date(b.createdAt).toLocaleString('ar-LY')})`).join('\n')
      const choice = prompt(`⚠️ اختر رقم النسخة للاستعادة:\n${options}`)
      if (!choice) { setRestoreLoading(false); return }

      const idx = parseInt(choice) - 1
      if (idx < 0 || idx >= backups.length) {
        alert('❌ رقم غير صحيح')
        setRestoreLoading(false)
        return
      }

      if (!confirm('⚠️ سيتم حذف جميع البيانات الحالية واستبدالها بالنسخة المختارة!\nهل أنت متأكد؟')) {
        setRestoreLoading(false)
        return
      }

      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: backups[idx].id })
      })
      const result = await res.json()
      if (res.ok) {
        alert('✅ تمت الاستعادة بنجاح!')
        await loadBranches()
        await loadEmployees()
        if (adminDate) {
          await loadRecords({ date: adminDate })
          await loadAllCarEntries(adminDate)
          await loadClosedDays(adminDate)
        }
      } else {
        alert('❌ خطأ: ' + result.error)
      }
    } catch (e: any) { alert('❌ خطأ: ' + e.message) }
    setRestoreLoading(false)
  }

  // ==================== EFFECTS ====================
  // Login screen: load branches + employees for dropdown
  useEffect(() => {
    if (screen === 'login') {
      ;(async () => {
        try { await loadBranches() } catch(e) { console.error(e) }
        try { await loadEmployees() } catch(e) { console.error(e) }
      })()
    }
  }, [screen])

  // Fetch dates with data for calendar highlighting
  useEffect(() => {
    if (!calMonth) return
    const branchId = (isAdminMode || user?.role === 'viewer') ? (adminSelectedBranch || user?.branchId) : user?.branchId
    if (!branchId) return
    fetch('/api/car-entries?datesOnly=true&branchId=' + branchId + '&month=' + calMonth)
      .then(r => r.ok ? r.json() : [])
      .then((dates: string[]) => setDatesWithData(dates))
      .catch(() => setDatesWithData([]))
  }, [calMonth, isAdminMode, adminSelectedBranch, user?.branchId])

  // Employee screen data fetching - sequential
  useEffect(() => {
    if (screen === 'employee' && empDate) {
      ;(async () => {
        try { await loadBranches() } catch(e) { console.error(e) }
        try { await loadEmployees() } catch(e) { console.error(e) }
        if ((isAdminMode || user?.role === 'viewer') && adminSelectedBranch) {
          try { await loadCarEntries(empDate, adminSelectedBranch) } catch(e) { console.error(e) }
          try { await loadWorkerExpenses(empDate, adminSelectedBranch) } catch(e) { console.error(e) }
        } else if (!isAdminMode && user?.role !== 'viewer' && user?.role === 'employee' && user.branchId) {
          try { await loadCarEntries(empDate, user.branchId) } catch(e) { console.error(e) }
          try { await loadWorkerExpenses(empDate, user.branchId) } catch(e) { console.error(e) }
        }
        try { await loadClosedDays(empDate) } catch(e) { console.error(e) }
      })()
    }
  }, [screen, empDate, isAdminMode, adminSelectedBranch, user])

  // Admin screen data fetching - sequential to avoid connection saturation
  useEffect(() => {
    if (screen === 'admin') {
      ;(async () => {
        try { await loadBranches() } catch(e) { console.error(e) }
        try { await loadEmployees() } catch(e) { console.error(e) }
        if (adminDate) {
          try { await loadRecords({ date: adminDate }) } catch(e) { console.error(e) }
          try { await loadAllCarEntries(adminDate) } catch(e) { console.error(e) }
          try { await loadClosedDays(adminDate) } catch(e) { console.error(e) }
        }
      })()
    }
  }, [screen, adminDate])

  // تحديث تلقائي للبيانات في وضع المسؤول (كل 10 ثواني)
  useEffect(() => {
    if (screen !== 'admin' || !adminDate) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/car-entries?date=${adminDate}`)
        if (!res.ok) return
        const newEntries: CarEntry[] = await res.json()
        // مقارنة مع البيانات الحالية للكشف عن الإضافات الجديدة
        const currentIds = new Set(carEntries.map(e => e.id))
        const added = newEntries.filter(e => !currentIds.has(e.id))
        if (added.length > 0) {
          // تحديث البيانات
          setCarEntries(newEntries)
          // إشعار لكل إضافة جديدة
          const now = new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })
          added.forEach(entry => {
            const msg = `${entry.empName} أضاف ${entry.room} - ${entry.totalCars} سيارة`
            setNotifications(prev => [{ id: entry.id, message: msg, time: now }, ...prev].slice(0, 20))
          })
        }
      } catch {}
    }, 10000)
    return () => clearInterval(interval)
  }, [screen, adminDate, carEntries.length])

  // Price inputs reset on room change
  useEffect(() => {
    if (!selectedRoom) return
    const prices = getPricesForRoom(selectedRoom)
    const newInputs: Record<number, number> = {}
    prices.forEach(p => { newInputs[p] = 0 })
    setPriceInputs(newInputs)
    setCustomPricesData({})
  }, [selectedRoom])

  // Cleanliness reset on date/branch change
  useEffect(() => {
    if (screen === 'employee' && isAdminMode && adminSelectedBranch && empDate) {
      const branch = branches.find(b => b.id === adminSelectedBranch)
      if (branch) {
        const config = BRANCH_CLEANLINESS[branch.name]
        if (config?.type === 'fixed') setCleanlinessAmount(config.value || 0)
        else setCleanlinessAmount(0)
      }
    }
  }, [screen, isAdminMode, adminSelectedBranch, empDate, branches])

  // ==================== CAR ENTRY ACTIONS ====================
  const handleSaveCarEntry = async () => {
    if (!selectedRoom || selectedRoom.startsWith('__')) return alert('الرجاء اختيار الغرفة')
    const date = empDate
    if (!date) return alert('الرجاء تحديد التاريخ')
    if (!isAdminMode && !user) return
    if (isAdminMode && !adminSelectedBranch) return alert('الرجاء اختيار الفرع')

    const prices = getPricesForRoom(selectedRoom)
    const priceCounts: Record<string, number> = {}
    let totalCars = 0
    let totalAmount = 0
    let extraCars = 0
    let extraAmount = 0

    prices.forEach(price => {
      const count = priceInputs[price] || 0
      if (count > 0) {
        priceCounts[String(price)] = count
        totalCars += count
        if (EXTRA_PRICES.includes(price)) {
          totalAmount += (price - 5) * count
          extraCars += count
          extraAmount += 5 * count
        } else {
          totalAmount += price * count
        }
      }
    })

    const customPricesSaved: Record<string, { price: number; count: number }> = {}
    Object.keys(customPricesData).forEach(key => {
      const item = customPricesData[key]
      priceCounts[key] = item.count
      customPricesSaved[key] = item
      totalCars += item.count
      totalAmount += item.price * item.count
    })

    if (totalCars === 0) return alert('الرجاء إدخال عدد سيارات واحد على الأقل')

    // تسجيل الوقت الحالي تلقائياً
    const now = new Date()
    const entryTime = now.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit', hour12: true })

    let empId: string, empName: string, branchId: string
    if (isAdminMode) {
      branchId = adminSelectedBranch!
      empId = 'admin_' + adminSelectedBranch
      empName = 'المسؤول'
    } else {
      empId = user!.id
      empName = user!.name
      branchId = user!.branchId!
    }

    const existing = carEntries.find(e => e.empId === empId && e.room === selectedRoom && e.date === date)

    setSaving(true)
    try {
      if (existing) {
        await fetch('/api/car-entries', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: existing.id, date, branchId, empId, empName, room: selectedRoom,
            totalCars, totalAmount, extraCars, extraAmount, priceCounts, customPrices: customPricesSaved
          })
        })
      } else {
        await fetch('/api/car-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date, branchId, empId, empName, room: selectedRoom,
            totalCars, totalAmount, extraCars, extraAmount, priceCounts, customPrices: customPricesSaved, entryTime
          })
        })
      }

      if (isAdminMode) {
        await loadCarEntries(date, adminSelectedBranch!)
      } else {
        await loadCarEntries(date, branchId)
      }

      const newInputs: Record<number, number> = {}
      prices.forEach(p => { newInputs[p] = 0 })
      setPriceInputs(newInputs)
      setCustomPricesData({})
      setCustomPriceInput('')
      setCustomCountInput('')

      const branchName = isAdminMode
        ? (branches.find(b => b.id === adminSelectedBranch)?.name || '')
        : (branches.find(b => b.id === branchId)?.name || '')
      const branchRooms = getRoomsForBranch(branchName)
      const currentIdx = branchRooms.indexOf(selectedRoom)
      if (currentIdx >= 0 && currentIdx < branchRooms.length - 1) {
        setSelectedRoom(branchRooms[currentIdx + 1])
      }

      alert(`تم الحفظ بنجاح!\n${selectedRoom} - ${totalCars} سيارات - ${totalAmount} د.ل`)
    } catch (e) {
      alert('حدث خطأ أثناء الحفظ')
    }
    setSaving(false)
    autoBackup()
  }

  const handleDeleteCarEntry = async (id: string) => {
    if (!confirm('هل تريد حذف هذا التسجيل؟')) return
    try {
      await fetch(`/api/car-entries?id=${id}`, { method: 'DELETE' })
      if (isAdminMode && adminSelectedBranch) {
        await loadCarEntries(empDate, adminSelectedBranch)
      } else if (user?.branchId) {
        await loadCarEntries(empDate, user.branchId)
      }
    } catch (e) { alert('حدث خطأ أثناء الحذف') }
    autoBackup()
  }

  const handleEditCarEntry = (entry: CarEntry) => {
    setSelectedRoom(entry.room)
    const prices = getPricesForRoom(entry.room)
    const newInputs: Record<number, number> = {}
    prices.forEach(p => { newInputs[p] = 0 })
    Object.keys(entry.priceCounts).forEach(key => {
      if (!key.startsWith('custom_')) {
        newInputs[Number(key)] = entry.priceCounts[key]
      }
    })
    setPriceInputs(newInputs)
    setCustomPricesData(entry.customPrices || {})
  }

  const handleAddCustomPrice = () => {
    const price = parseFloat(customPriceInput)
    const count = parseInt(customCountInput) || 0
    if (!price || price <= 0) return alert('الرجاء إدخال سعر صحيح')
    if (count <= 0) return alert('الرجاء إدخال عدد سيارات صحيح')
    const key = 'custom_' + price
    setCustomPricesData(prev => ({ ...prev, [key]: { price, count } }))
    setCustomPriceInput('')
    setCustomCountInput('')
  }

  const handleRemoveCustomPrice = (key: string) => {
    setCustomPricesData(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  // ==================== RECORD ACTIONS ====================
  const handleSaveRecord = async () => {
    const amount = parseFloat(recordModalData.amount)
    if (!amount || amount <= 0) return alert('الرجاء إدخال مبلغ صحيح')
    if (!recordModalData.date) return alert('الرجاء تحديد تاريخ الحركة')

    try {
      if (recordModalData.id) {
        await fetch(`/api/records?id=${recordModalData.id}`, { method: 'DELETE' })
      }
      await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empId: recordModalData.empId,
          type: recordModalData.type,
          amount,
          note: recordModalData.note,
          date: recordModalData.date,
          branchId: recordModalData.branchId
        })
      })
      setShowRecordModal(false)
      await new Promise(r => setTimeout(r, 300))
      await loadRecords({ date: recordModalData.date }, true)
    } catch (e) { alert('حدث خطأ أثناء الحفظ') }
    autoBackup()
  }

  const handleDeleteRecord = async (id: string, empDate?: string) => {
    if (!confirm('هل تريد حذف هذه الحركة؟')) return
    try {
      await fetch(`/api/records?id=${id}`, { method: 'DELETE' })
      await new Promise(r => setTimeout(r, 300))
      await loadRecords({ date: empDate || adminDate }, true)
    } catch (e) { alert('حدث خطأ أثناء الحذف') }
    autoBackup()
  }

  // ==================== WORKER EXPENSES & TREASURY ====================
  const saveWorkerExpData = async (branchId: string, date: string, data: { cleanliness?: number; treasury?: Record<string, { income: number; expense: number }> }) => {
    try {
      await fetch('/api/worker-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, branchId, jsonData: data })
      })
    } catch (e) { console.error(e) }
  }

  const handleCleanlinessChange = (key: string, value: number, branchId: string, date: string) => {
    setWorkerExpData(prev => {
      const updated = { ...prev }
      if (!updated[key]) updated[key] = {}
      updated[key] = { ...updated[key], cleanliness: value }
      void saveWorkerExpData(branchId, date, updated[key])
      return updated
    })
  }

  const handleExpenseRename = (wKey: string, branchId: string, date: string, oldKey: string, newName: string) => {
    if (!newName.trim()) return
    const newKey = 'مصروف_' + newName.trim()
    if (newKey === oldKey) return
    setWorkerExpData(prev => {
      const updated = { ...prev }
      if (!updated[wKey]?.treasury) return updated
      const t = { ...updated[wKey].treasury! }
      const oldData = t[oldKey]
      if (!oldData) return updated
      delete t[oldKey]
      t[newKey] = { ...oldData }
      updated[wKey] = { ...updated[wKey], treasury: t }
      void saveWorkerExpData(branchId, date, updated[wKey])
      return updated
    })
  }

  const handleTreasuryFieldChange = (key: string, branchName: string, branchId: string, date: string, itemKey: string, fieldType: 'income' | 'expense', value: number) => {
    setWorkerExpData(prev => {
      const updated = { ...prev }
      if (!updated[key]) updated[key] = {}
      if (!updated[key].treasury) updated[key].treasury = {}
      updated[key] = {
        ...updated[key],
        treasury: { ...updated[key].treasury!, [itemKey]: { ...(updated[key].treasury![itemKey] || { income: 0, expense: 0 }), [fieldType]: value } }
      }
      void saveWorkerExpData(branchId, date, updated[key])
      return updated
    })
  }

  const handleQuickTreasurySave = (branchId: string, branchName: string, date: string) => {
    const wKey = branchName + '_' + date
    const bankVal = parseInt(quickBankCardSale) || 0
    const coupVal = parseInt(quickCoupons) || 0
    if (bankVal === 0 && coupVal === 0) return

    setWorkerExpData(prev => {
      const updated = { ...prev }
      if (!updated[wKey]) updated[wKey] = {}
      if (!updated[wKey].treasury) updated[wKey].treasury = {}

      const treasury = { ...updated[wKey].treasury! }
      if (bankVal > 0) {
        treasury['بيع_البطاقة'] = { ...(treasury['بيع_البطاقة'] || { income: 0, expense: 0 }), expense: bankVal }
      }
      if (coupVal > 0 && branchName === 'بن غرسه') {
        treasury['كوبونات'] = { ...(treasury['كوبونات'] || { income: 0, expense: 0 }), expense: coupVal }
      }
      updated[wKey] = { ...updated[wKey], treasury }

      void saveWorkerExpData(branchId, date, updated[wKey])
      return updated
    })
    setQuickBankCardSale('')
    setQuickCoupons('')
  }

  const handleAddQuickExpense = () => {
    const name = quickExpName.trim()
    const amount = parseInt(quickExpAmount) || 0
    if (!name || amount <= 0) return alert('الرجاء إدخال اسم المصروف وقيمته')
    setQuickExpenses(prev => [...prev, { name, amount }])
    setQuickExpName('')
    setQuickExpAmount('')
  }

  const handleRemoveQuickExpense = (idx: number) => {
    setQuickExpenses(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSaveQuickExpenses = (branchId: string, branchName: string, date: string) => {
    if (quickExpenses.length === 0) return
    const wKey = branchName + '_' + date

    setWorkerExpData(prev => {
      const updated = { ...prev }
      if (!updated[wKey]) updated[wKey] = {}
      if (!updated[wKey].treasury) updated[wKey].treasury = {}

      const treasury = { ...updated[wKey].treasury! }
      quickExpenses.forEach(exp => {
        const key = 'مصروف_' + exp.name
        const existing = treasury[key] || { income: 0, expense: 0 }
        treasury[key] = { ...existing, expense: (existing.expense || 0) + exp.amount }
      })
      updated[wKey] = { ...updated[wKey], treasury }

      void saveWorkerExpData(branchId, date, updated[wKey])
      return updated
    })
    setQuickExpenses([])
  }

  const handleSaveQuickRecord = async (branchId: string, empDate: string) => {
    const amount = parseInt(qRecordAmount) || 0
    if (!qEmpId || amount <= 0) return alert('اختر الموظف وأدخل المبلغ')
    try {
      setSaving(true)
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empId: qEmpId,
          type: qRecordType,
          amount,
          note: qRecordNote,
          date: empDate,
          branchId
        })
      })
      if (res.ok) {
        setQEmpId('')
        setQRecordAmount('')
        setQRecordNote('')
        setSelectedRoom('')
        await loadRecords({ date: empDate }, true)
        alert(qRecordType === 'withdrawal' ? '✅ تم تسجيل السحب' : '✅ تم تسجيل العجز')
      }
    } catch (e) {
      console.error(e)
      alert('حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const handleEditRecord = async (id: string, amount: number, empDate: string) => {
    try {
      const res = await fetch('/api/records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, amount })
      })
      if (res.ok) {
        await loadRecords({ date: empDate }, true)
      }
    } catch (e) { console.error(e) }
  }

  // ==================== BRANCH & EMPLOYEE MANAGEMENT ====================
  const syncBranchConfigs = () => {
    branches.forEach(b => {
      if ((b as any).config) {
        const cfg = (b as any).config as any
        const rooms: string[] = []
        for (let i = 1; i <= (cfg.rooms || 6); i++) rooms.push(`غرفة ${i}`)
        if (cfg.hasMachine !== false) rooms.push('مكينة الغسيل')
        BRANCH_ROOMS[b.name] = rooms
        BRANCH_NET_DEDUCTION[b.name] = cfg.netDeduction ?? 0
        if (cfg.machineNoDeduction && !MACHINE_NO_DEDUCTION_BRANCHES.includes(b.name)) {
          MACHINE_NO_DEDUCTION_BRANCHES.push(b.name)
        }
        if (cfg.cleanliness) BRANCH_CLEANLINESS[b.name] = cfg.cleanliness
      }
    })
  }

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return alert('الرجاء كتابة اسم الفرع')
    const config = {
      rooms: newBranchRooms,
      hasMachine: newBranchHasMachine,
      netDeduction: newBranchNetDeduction,
      machineNoDeduction: newBranchMachineNoDeduction,
      cleanliness: newBranchCleanType === 'fixed'
        ? { type: 'fixed', value: newBranchCleanValue }
        : { type: 'select', options: newBranchCleanOptions.split(',').map(Number).filter(n => !isNaN(n)) }
    }
    try {
      const res = await fetch('/api/branches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBranchName.trim(), config })
      })
      if (res.ok) {
        setShowBranchModal(false)
        setNewBranchName('')
        setNewBranchRooms(6)
        setNewBranchHasMachine(true)
        setNewBranchNetDeduction(0)
        setNewBranchMachineNoDeduction(false)
        setNewBranchCleanType('select')
        setNewBranchCleanValue(20)
        setNewBranchCleanOptions('10,20')
        await loadBranches()
        syncBranchConfigs()
      } else {
        const data = await res.json()
        alert(data.error || 'حدث خطأ')
      }
    } catch (e) { alert('حدث خطأ') }
    autoBackup()
  }

  const handleDeleteBranch = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف الفرع؟')) return
    try {
      await fetch(`/api/branches?id=${id}`, { method: 'DELETE' })
      await loadBranches()
      await loadEmployees()
    } catch (e) { alert('حدث خطأ') }
    autoBackup()
  }

  const handleCreateEmployee = async () => {
    if (!newEmp.name.trim()) return alert('الرجاء كتابة اسم الموظف')
    if (newEmp.role !== 'viewer' && !newEmp.branchId && newEmp.multiBranchIds.length === 0) return alert('الرجاء اختيار الفرع')
    if (newEmp.hasLogin && !newEmp.password.trim()) return alert('الرجاء إدخال رمز المرور')
    try {
      const res = await fetch('/api/employees', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmp)
      })
      if (res.ok) {
        setShowEmpModal(false)
        setNewEmp({ name: '', branchId: '', shift: 'الفترة الصباحية', password: '', role: 'employee', hasLogin: false, startDate: '', endDate: '', multiBranchIds: [] as string[] })
        await loadEmployees()
        await loadBranches()
      } else { alert('حدث خطأ') }
    } catch (e) { alert('حدث خطأ') }
    autoBackup()
  }

  const handleSaveEditEmployee = async () => {
    if (!editEmp) return
    if (!editEmp.name.trim()) return alert('الرجاء كتابة اسم الموظف')
    if (editEmp.hasLogin && !editEmp.password?.trim()) return alert('الرجاء إدخال رمز المرور')
    try {
      const body: any = {
        id: editEmp.id,
        name: editEmp.name.trim(),
        shift: editEmp.shift,
        role: editEmp.role,
        hasLogin: editEmp.hasLogin,
        startDate: editEmp.startDate || '',
        endDate: editEmp.endDate || '',
        branchId: editEmp.branchId,
        multiBranchIds: editEmp.multiBranchIds || [],
      }
      if (editEmp.hasLogin && editEmp.password?.trim()) {
        body.password = editEmp.password.trim()
      }
      const res = await fetch('/api/employees', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        setShowEditEmpModal(false)
        setEditEmp(null)
        await loadEmployees()
      } else {
        const err = await res.json().catch(() => ({}))
        alert('خطأ: ' + (err.error || 'غير معروف'))
      }
    } catch (e: any) { alert('خطأ: ' + (e.message || 'غير معروف')) }
    autoBackup()
  }

  const handleDeleteEmployee = async (id: string, name?: string) => {
    const displayName = name || 'هذا الموظف'
    if (!confirm(`⚠️ سيتم حذف "${displayName}" لكن تبقى جميع حركاته مسجلة في النظام.

هل أنت متأكد؟`)) return
    try {
      await fetch(`/api/employees?id=${id}&keepRecords=true`, { method: 'DELETE' })
      await loadEmployees()
      await loadBranches()
    } catch (e) { alert('حدث خطأ') }
    autoBackup()
  }

  // ==================== PASSWORD MANAGEMENT ====================
  const handleSaveEmpPassword = async (empId: string) => {
    const pwd = empPasswords[empId]
    if (!pwd?.trim()) return alert('الرجاء إدخال كلمة المرور')
    try {
      await fetch('/api/employees', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: empId, password: pwd.trim() })
      })
      alert('تم تحديث كلمة المرور')
      await loadEmployees()
    } catch (e) { alert('حدث خطأ') }
    autoBackup()
  }

  const handleSaveAdminPassword = async () => {
    if (!adminPassword.trim()) return alert('الرجاء إدخال كلمة المرور')
    try {
      await fetch('/api/admin/password', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword.trim() })
      })
      alert('تم تحديث كلمة مرور المسؤول')
      setAdminPassword('')
    } catch (e) { alert('حدث خطأ') }
    autoBackup()
  }

  // ==================== DAILY CLOSING ====================
  const isDayClosedForBranch = (date: string, branchId: string) => {
    return closedDays.some(cd => cd.date === date && cd.branchId === branchId)
  }

  const isDayClosed = (date: string) => {
    if (!date) return false
    return branches.length > 0 && branches.every(b => isDayClosedForBranch(date, b.id))
  }

  const handleToggleDayClosing = async () => {
    const allClosed = isDayClosed(adminDate)
    if (allClosed) {
      for (const b of branches) {
        await fetch('/api/closed-days', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: adminDate, branchId: b.id })
        })
      }
    } else {
      for (const b of branches) {
        if (!isDayClosedForBranch(adminDate, b.id)) {
          await fetch('/api/closed-days', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: adminDate, branchId: b.id })
          })
        }
      }
    }
    await loadClosedDays(adminDate)
  }

  // ==================== PDF EXPORT ====================
  // Helper: fetch worker expenses (cleanliness + treasury) for a date+branch
  const fetchWorkerExpData = async (date: string, branchId: string, branchName: string): Promise<{ cleanliness?: number; treasury?: Record<string, { income: number; expense: number }> }> => {
    try {
      const params = new URLSearchParams()
      params.set('date', date)
      params.set('branchId', branchId)
      const res = await fetch(`/api/worker-expenses?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (data.length > 0 && data[0].jsonData) {
          return data[0].jsonData as { cleanliness?: number; treasury?: Record<string, { income: number; expense: number }> }
        }
      }
    } catch (e) { console.error('fetchWorkerExpData error:', e) }
    return {}
  }

  // Helper: render HTML in a clean iframe (no Tailwind CSS interference) and capture with html2canvas
  const renderHtmlToCanvas = async (html: string, width: number): Promise<HTMLCanvasElement> => {
    const html2canvasModule = await import('html2canvas')
    const html2canvas = html2canvasModule.default
    
    // Create a hidden iframe with clean styles
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.top = '-99999px'
    iframe.style.left = '-99999px'
    iframe.style.width = width + 'px'
    iframe.style.height = '3000px'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) throw new Error('Could not create iframe document')
    
    // Write clean HTML with only our inline styles and Cairo font
    iframeDoc.open()
    iframeDoc.write('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"><style>* { margin: 0; padding: 0; box-sizing: border-box; color: #000; } body { font-family: Cairo, sans-serif; direction: rtl; background: #fff; } table { font-family: Cairo, sans-serif; } td, th { direction: rtl; unicode-bidi: isolate; }</style></head><body>' + html + '</body></html>')
    iframeDoc.close()
    
    // Wait for fonts to load
    try { await (iframeDoc as any).fonts?.ready } catch(e) {}
    await new Promise(r => setTimeout(r, 1500))
    
    const iframeBody = iframeDoc.body
    const canvas = await html2canvas(iframeBody, { 
      scale: 2, 
      backgroundColor: '#ffffff', 
      useCORS: true,
      logging: false,
      width: width,
      windowWidth: width
    })
    
    document.body.removeChild(iframe)
    return canvas
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      // Determine dates to export
      let dates: string[] = []

      if (exportRangeType === 'month') {
        if (!exportMonth) { setExporting(false); return alert('الرجاء اختيار الشهر') }
        const [yearStr, monthStr] = exportMonth.split('-')
        const year = parseInt(yearStr)
        const month = parseInt(monthStr)
        const daysInMonth = new Date(year, month, 0).getDate()
        for (let d = 1; d <= daysInMonth; d++) {
          const mm = month < 10 ? '0' + month : '' + month
          const dd = d < 10 ? '0' + d : '' + d
          dates.push(`${year}-${mm}-${dd}`)
        }
      } else if (exportRangeType === 'day') {
        if (!exportDay) { setExporting(false); return alert('الرجاء اختيار اليوم') }
        dates.push(exportDay)
      } else {
        if (!exportFrom || !exportTo) { setExporting(false); return alert('الرجاء تحديد الفترة') }
        const start = new Date(exportFrom)
        const end = new Date(exportTo)
        const curr = new Date(start)
        while (curr <= end) {
          dates.push(curr.toISOString().split('T')[0])
          curr.setDate(curr.getDate() + 1)
        }
      }

      if (dates.length === 0) { setExporting(false); return }

      // Load jsPDF dynamically
      const jspdfModule = await import('jspdf')
      const jsPDF = jspdfModule.default

      // Create a single PDF for all dates
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      let firstPage = true
      let exportedCount = 0

      for (const date of dates) {
        // Fetch car entries for this date
        const params = new URLSearchParams()
        params.set('date', date)
        const res = await fetch(`/api/car-entries?${params}`)
        const dateEntries: CarEntry[] = res.ok ? await res.json() : []

        if (dateEntries.length === 0) {
          // Generate "no data" page
          const noDataHtml = '<div style="width:780px;color:#000000;padding:40px;font-family:Cairo,sans-serif;text-align:center;" dir="rtl">' +
            '<h1 style="font-size:18px;margin:0;color:#000000;">مغسلة جيت كلين</h1>' +
            '<p style="font-size:12px;color:#000000;margin:4px 0 0 0;">التاريخ: ' + formatDateShort(date) + '</p>' +
            '<h2 style="font-size:20px;color:#000000;margin-top:60px;">لا توجد بيانات في ' + formatDateShort(date) + '</h2>' +
            '</div>'

          const canvas = await renderHtmlToCanvas(noDataHtml, 800)
          const imgHeight = (canvas.height * pageWidth) / canvas.width

          if (!firstPage) pdf.addPage()
          firstPage = false
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imgHeight)
          exportedCount++
          continue
        }

        // Group entries by branch
        const branchGroups: Record<string, CarEntry[]> = {}
        dateEntries.forEach(e => {
          if (!branchGroups[e.branchId]) branchGroups[e.branchId] = []
          branchGroups[e.branchId].push(e)
        })

        for (const bid in branchGroups) {
          const br = branches.find(b => b.id === bid)
          const bName = br ? br.name : ''
          const bEntries = branchGroups[bid]

          // Fetch worker expenses (treasury + cleanliness) for this date+branch
          const weData = await fetchWorkerExpData(date, bid, bName)
          const savedWEMap: Record<string, { cleanliness?: number; treasury?: Record<string, { income: number; expense: number }> }> = {}
          savedWEMap[bName + '_' + date] = weData

          const pages = buildCarReportHTML(date, bid, bName, bEntries, savedWEMap)

          // Render all pages
          for (let pi = 0; pi < pages.length; pi++) {
            const canvas = await renderHtmlToCanvas(pages[pi], 800)
            const imgHeight = (canvas.height * pageWidth) / canvas.width

            if (!firstPage) pdf.addPage()
            firstPage = false
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imgHeight)
          }
          exportedCount++
        }
      }

      if (exportedCount > 0) {
        pdf.save('تقرير_مغاسل_جيت_كلين.pdf')
        setShowExportModal(false)
        alert('تم التصدير بنجاح! (' + exportedCount + ' صفحة)')
      } else {
        alert('لا توجد بيانات للتصدير في الفترة المحددة')
      }
    } catch (err: any) {
      console.error('PDF Export Error:', err?.message, err?.stack)
      alert('حدث خطأ أثناء التصدير: ' + (err?.message || ''))
    }
    setExporting(false)
  }

  // ==================== EMPLOYEE PDF EXPORT (WITHDRAWALS/SHORTAGES) ====================
  const handleExportEmployeePDF = async () => {
    setExportingEmp(true)
    try {
      // Load jsPDF dynamically
      const jspdfModule = await import('jspdf')
      const jsPDF = jspdfModule.default

      // Determine dates - default to current month if no export range set
      let dates: string[] = []
      const now = new Date()
      if (exportRangeType === 'month' && exportMonth) {
        const [yearStr, monthStr] = exportMonth.split('-')
        const year = parseInt(yearStr)
        const month = parseInt(monthStr)
        const daysInMonth = new Date(year, month, 0).getDate()
        for (let d = 1; d <= daysInMonth; d++) {
          dates.push(year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0'))
        }
      } else if (exportRangeType === 'day' && exportDay) {
        dates.push(exportDay)
      } else if (exportFrom && exportTo) {
        const start = new Date(exportFrom)
        const end = new Date(exportTo)
        const curr = new Date(start)
        while (curr <= end) {
          dates.push(curr.toISOString().split('T')[0])
          curr.setDate(curr.getDate() + 1)
        }
      }

      // Default to current month if no range was set
      if (dates.length === 0) {
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const daysInMonth = new Date(year, month, 0).getDate()
        for (let d = 1; d <= daysInMonth; d++) {
          dates.push(year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0'))
        }
      }

      if (dates.length === 0) { setExportingEmp(false); return }

      // Fetch all records for all dates
      const allRecordsRes = await fetch('/api/records')
      const allRecordsData: FinancialRecord[] = allRecordsRes.ok ? await allRecordsRes.json() : []

      // Build period label
      const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      let periodLabel = ''
      if (exportRangeType === 'month' && exportMonth) {
        const [y, m] = exportMonth.split('-')
        periodLabel = arabicMonths[parseInt(m) - 1] + ' ' + y
      } else if (exportRangeType === 'day' && exportDay) {
        periodLabel = formatDateShort(exportDay)
      } else if (exportFrom && exportTo) {
        periodLabel = formatDateShort(exportFrom) + ' إلى ' + formatDateShort(exportTo)
      } else {
        periodLabel = arabicMonths[now.getMonth()] + ' ' + now.getFullYear()
      }

      // Filter records to only those within the date range
      const filteredRecords = allRecordsData.filter(r => dates.includes(r.date))

      // Fetch fresh employees (including multi-branch)
      const empsRes = await fetch('/api/employees')
      const freshEmployees: Employee[] = empsRes.ok ? await empsRes.json() : []

      // Build the report HTML pages
      const reportPages = buildEmployeeReportHTML(
        periodLabel,
        freshEmployees,
        filteredRecords,
        branches,
        (r: FinancialRecord) => dates.includes(r.date)
      )

      // Create PDF with proper pages
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()

      for (let i = 0; i < reportPages.length; i++) {
        const canvas = await renderHtmlToCanvas(reportPages[i], 800)
        const imgHeight = (canvas.height * pageWidth) / canvas.width
        if (i > 0) pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imgHeight)
      }

      pdf.save('تقرير_سحوبات_وعجوزات_الموظفين.pdf')
      setShowExportModal(false)
      alert('تم تصدير تقرير السحوبات والعجوزات بنجاح!')
    } catch (err: any) {
      console.error('Emp PDF Error:', err?.message, err?.stack)
      alert('حدث خطأ أثناء تصدير تقرير الموظفين: ' + (err?.message || ''))
    }
    setExportingEmp(false)
  }

  // ==================== QUICK EMPLOYEE MONTHLY REPORT (from dropdown) ====================
  const handleQuickEmployeeReport = async () => {
    setExporting(true)
    setShowEmpReportModal(false)
    try {
      let dates: string[] = []
      let periodLabel = ''

      if (empReportRange === 'month') {
        if (!empReportMonth) { setExporting(false); return alert('الرجاء اختيار الشهر') }
        const [yStr, mStr] = empReportMonth.split('-')
        const year = parseInt(yStr)
        const month = parseInt(mStr)
        const daysInMonth = new Date(year, month, 0).getDate()
        for (let d = 1; d <= daysInMonth; d++) {
          dates.push(year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0'))
        }
        const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
        periodLabel = arabicMonths[month - 1] + ' ' + year
      } else if (empReportRange === 'day') {
        if (!empReportDay) { setExporting(false); return alert('الرجاء اختيار اليوم') }
        dates.push(empReportDay)
        periodLabel = formatDateShort(empReportDay)
      } else {
        if (!empReportFrom || !empReportTo) { setExporting(false); return alert('الرجاء تحديد الفترة') }
        const start = new Date(empReportFrom)
        const end = new Date(empReportTo)
        const curr = new Date(start)
        while (curr <= end) {
          dates.push(curr.toISOString().split('T')[0])
          curr.setDate(curr.getDate() + 1)
        }
        periodLabel = formatDateShort(empReportFrom) + ' إلى ' + formatDateShort(empReportTo)
      }

      if (dates.length === 0) { setExporting(false); return }

      const allRecordsRes = await fetch('/api/records')
      const allRecordsData: FinancialRecord[] = allRecordsRes.ok ? await allRecordsRes.json() : []
      const filteredRecords = allRecordsData.filter(r => dates.includes(r.date))

      // Fetch fresh employees (including multi-branch)
      const empsRes = await fetch('/api/employees')
      const freshEmployees: Employee[] = empsRes.ok ? await empsRes.json() : []

      const reportPages = buildEmployeeReportHTML(
        periodLabel,
        freshEmployees,
        filteredRecords,
        branches,
        (r: FinancialRecord) => dates.includes(r.date)
      )

      const jspdfModule = await import('jspdf')
      const jsPDF = jspdfModule.default
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()

      for (let i = 0; i < reportPages.length; i++) {
        const canvas = await renderHtmlToCanvas(reportPages[i], 800)
        const imgHeight = (canvas.height * pageWidth) / canvas.width
        if (i > 0) pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imgHeight)
      }

      pdf.save('تقرير_مصاريف_الموظفين_' + periodLabel + '.pdf')
      alert('تم تصدير تقرير مصاريف الموظفين بنجاح!')
    } catch (err: any) {
      console.error('Quick Emp Report Error:', err?.message, err?.stack)
      alert('حدث خطأ أثناء التصدير: ' + (err?.message || ''))
    }
    setExporting(false)
  }

  // ==================== BRANCH EXPENSES PDF EXPORT ====================
  const handleExportExpensesPDF = async () => {
    setExporting(true)
    try {
      if (!expReportBranchId) { setExporting(false); return alert('الرجاء اختيار الفرع') }

      const branch = branches.find(b => b.id === expReportBranchId)
      const branchName = branch ? branch.name : ''

      // Calculate dates
      const dates: string[] = []
      let periodLabel = ''

      if (expReportPeriod === 'day') {
        if (!expReportDay) { setExporting(false); return alert('الرجاء اختيار اليوم') }
        dates.push(expReportDay)
        periodLabel = formatDateShort(expReportDay)
      } else if (expReportPeriod === 'range') {
        if (!expReportFrom || !expReportTo) { setExporting(false); return alert('الرجاء تحديد الفترة') }
        const start = new Date(expReportFrom)
        const end = new Date(expReportTo)
        const cur = new Date(start)
        while (cur <= end) {
          dates.push(cur.toISOString().split('T')[0])
          cur.setDate(cur.getDate() + 1)
        }
        periodLabel = formatDateShort(expReportFrom) + ' إلى ' + formatDateShort(expReportTo)
      } else {
        const [y, m] = expReportMonth.split('-').map(Number)
        const daysInMonth = new Date(y, m, 0).getDate()
        for (let d = 1; d <= daysInMonth; d++) {
          dates.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
        }
        const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
        periodLabel = monthNames[m - 1] + ' ' + y
      }

      // Fetch worker expenses for all dates
      const allExpenses: { date: string; name: string; amount: number }[] = []
      const allRecords: { date: string; empName: string; type: string; amount: number }[] = []

      for (const date of dates) {
        // Worker expenses (treasury)
        const weRes = await fetch(`/api/worker-expenses?date=${date}&branchId=${expReportBranchId}`, { cache: 'no-store' })
        if (weRes.ok) {
          const weData = await weRes.json()
          for (const item of weData) {
            const treas = item.jsonData?.treasury || {}
            for (const [key, val] of Object.entries(treas)) {
              if (key.startsWith('مصروف_') && val && typeof val === 'object' && 'expense' in val) {
                allExpenses.push({ date, name: key.replace('مصروف_', ''), amount: (val as any).expense || 0 })
              }
            }
          }
        }
        // Financial records (withdrawals/shortages)
        const recRes = await fetch(`/api/records?date=${date}&branchId=${expReportBranchId}`, { cache: 'no-store' })
        if (recRes.ok) {
          const recData = await recRes.json()
          for (const r of recData) {
            allRecords.push({ date, empName: r.employee?.name || '', type: r.type, amount: r.amount })
          }
        }
      }

      const totalExpAmount = allExpenses.reduce((s, e) => s + e.amount, 0)
      const totalRecAmount = allRecords.reduce((s, r) => s + r.amount, 0)

      // Build PDF HTML pages
      const pages: string[] = []

      // Page 1: Expenses summary
      let rowsHtml = ''
      let rowNum = 0
      let prevDate = ''
      const grouped: Record<string, { name: string; amount: number }[]> = {}
      allExpenses.forEach(e => {
        if (!grouped[e.date]) grouped[e.date] = []
        grouped[e.date].push(e)
      })

      for (const date of dates) {
        const dayExps = grouped[date] || []
        if (dayExps.length === 0) continue
        if (date !== prevDate) {
          const dayTotal = dayExps.reduce((s, e) => s + e.amount, 0)
          rowsHtml += '<tr style="color:#000000;">' +
            '<td colspan="2" style="padding:8px 10px;border:1px solid #1e3a5f;font-size:11px;font-weight:bold;text-align:center;">📅 ' + formatDateShort(date) + '</td>' +
            '<td style="padding:8px 10px;border:1px solid #1e3a5f;font-size:11px;font-weight:bold;text-align:center;">' + dayTotal + ' د.ل</td>' +
            '</tr>'
          dayExps.forEach(exp => {
            rowNum++
            rowsHtml += '<tr style="">' +
              '<td style="padding:5px 10px;border:1px solid #cbd5e1;font-size:10px;text-align:center;color:#000000;">' + (rowNum) + '</td>' +
              '<td style="padding:5px 10px;border:1px solid #cbd5e1;font-size:11px;text-align:right;color:#000000;">' + exp.name + '</td>' +
              '<td style="padding:5px 10px;border:1px solid #cbd5e1;font-size:11px;font-weight:bold;text-align:center;color:#b91c1c;">' + exp.amount + ' د.ل</td>' +
              '</tr>'
          })
          prevDate = date
        }
      }

      pages.push(
        '<div style="width:780px;color:#000000;padding:30px;font-family:Cairo,sans-serif;" dir="rtl">' +
        '<div style="text-align:center;margin-bottom:25px;border-bottom:3px solid #1e40af;padding-bottom:15px;">' +
        '<h1 style="font-size:26px;font-weight:bold;margin:0;color:#1e40af;">🚗 مغسلة جيت كلين</h1>' +
        '<p style="font-size:15px;margin:8px 0 0;color:#000000;">تقرير مصروفات الفرع: <strong>' + branchName + '</strong> | ' + periodLabel + '</p>' +
        '</div>' +
        '<h2 style="font-size:18px;font-weight:bold;color:#b91c1c;margin:20px 0 12px;padding:8px 15px;border-right:4px solid #b91c1c;border-radius:0 8px 8px 0;">📋 المصروفات</h2>' +
        (rowsHtml ? '<table style="width:100%;border-collapse:collapse;">' +
        '<tr style="color:#000000;"><th style="padding:10px;border:1px solid #1e3a5f;font-size:12px;font-weight:bold;">م</th><th style="padding:10px;border:1px solid #1e3a5f;font-size:12px;font-weight:bold;">البيان</th><th style="padding:10px;border:1px solid #1e3a5f;font-size:12px;font-weight:bold;">المبلغ</th></tr>' +
        rowsHtml +
        '<tr style="color:#000000;"><td colspan="2" style="padding:10px 12px;border:1px solid #991b1b;font-size:13px;font-weight:bold;text-align:center;">إجمالي المصروفات</td><td style="padding:10px 12px;border:1px solid #991b1b;font-size:15px;font-weight:bold;text-align:center;">' + totalExpAmount + ' د.ل</td></tr>' +
        '</table>' : '<p style="text-align:center;color:#000000;padding:30px;font-size:14px;">لا توجد مصروفات في هذه الفترة</p>') +
        '</div>'
      )

      // Page 2: Withdrawals & Shortages
      let recRowsHtml = ''
      const groupedRec: Record<string, { empName: string; type: string; amount: number }[]> = {}
      allRecords.forEach(r => {
        if (!groupedRec[r.date]) groupedRec[r.date] = []
        groupedRec[r.date].push(r)
      })
      const totalWithdrawals = allRecords.filter(r => r.type === 'withdrawal').reduce((s, r) => s + r.amount, 0)
      const totalShortages = allRecords.filter(r => r.type === 'shortage').reduce((s, r) => s + r.amount, 0)

      for (const date of dates) {
        const dayRecs = groupedRec[date] || []
        if (dayRecs.length === 0) continue
        recRowsHtml += '<tr style="color:#000000;">' +
          '<td colspan="3" style="padding:8px 10px;border:1px solid #1e3a5f;font-size:11px;font-weight:bold;text-align:center;">📅 ' + formatDateShort(date) + '</td>' +
          '</tr>'
        dayRecs.forEach(rec => {
          const isWithdrawal = rec.type === 'withdrawal'
          recRowsHtml += '<tr style="">' +
            '<td style="padding:5px 10px;border:1px solid #cbd5e1;font-size:11px;text-align:right;color:#000000;">' + rec.empName + '</td>' +
            '<td style="padding:5px 10px;border:1px solid #cbd5e1;font-size:11px;font-weight:bold;text-align:center;color:#000000;background:' + (isWithdrawal ? '#d97706' : '#dc2626') + ';">' + (isWithdrawal ? '💰 سحب' : '⚠️ عجز') + '</td>' +
            '<td style="padding:5px 10px;border:1px solid #cbd5e1;font-size:11px;font-weight:bold;text-align:center;color:#b91c1c;">' + rec.amount + ' د.ل</td>' +
            '</tr>'
        })
      }

      pages.push(
        '<div style="width:780px;color:#000000;padding:30px;font-family:Cairo,sans-serif;" dir="rtl">' +
        '<div style="text-align:center;margin-bottom:25px;border-bottom:3px solid #1e40af;padding-bottom:15px;">' +
        '<h1 style="font-size:26px;font-weight:bold;margin:0;color:#1e40af;">🚗 مغسلة جيت كلين</h1>' +
        '<p style="font-size:15px;margin:8px 0 0;color:#000000;">تقرير سحوبات وعجوزات الفرع: <strong>' + branchName + '</strong> | ' + periodLabel + '</p>' +
        '</div>' +
        '<h2 style="font-size:18px;font-weight:bold;color:#d97706;margin:20px 0 12px;padding:8px 15px;border-right:4px solid #d97706;border-radius:0 8px 8px 0;">💰 السحوبات والعجوزات</h2>' +
        (recRowsHtml ? '<table style="width:100%;border-collapse:collapse;">' +
        '<tr style="color:#000000;"><th style="padding:10px;border:1px solid #1e3a5f;font-size:12px;font-weight:bold;">الموظف</th><th style="padding:10px;border:1px solid #1e3a5f;font-size:12px;font-weight:bold;">النوع</th><th style="padding:10px;border:1px solid #1e3a5f;font-size:12px;font-weight:bold;">المبلغ</th></tr>' +
        recRowsHtml +
        '<tr style="color:#000000;"><td style="padding:10px 12px;border:1px solid #b45309;font-size:13px;font-weight:bold;text-align:center;">إجمالي السحوبات</td><td colspan="2" style="padding:10px 12px;border:1px solid #b45309;font-size:15px;font-weight:bold;text-align:center;">' + totalWithdrawals + ' د.ل</td></tr>' +
        '<tr style="color:#000000;"><td style="padding:10px 12px;border:1px solid #b91c1c;font-size:13px;font-weight:bold;text-align:center;">إجمالي العجوزات</td><td colspan="2" style="padding:10px 12px;border:1px solid #b91c1c;font-size:15px;font-weight:bold;text-align:center;">' + totalShortages + ' د.ل</td></tr>' +
        '<tr style="color:#000000;"><td style="padding:10px 12px;border:1px solid #020617;font-size:13px;font-weight:bold;text-align:center;">الإجمالي الكلي</td><td colspan="2" style="padding:10px 12px;border:1px solid #020617;font-size:17px;font-weight:bold;text-align:center;">' + totalRecAmount + ' د.ل</td></tr>' +
        '</table>' : '<p style="text-align:center;color:#000000;padding:30px;font-size:14px;">لا توجد سحوبات أو عجوزات في هذه الفترة</p>') +
        '</div>'
      )

      // Generate PDF
      const jspdfModule = await import('jspdf')
      const jsPDF = jspdfModule.default
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()

      for (let i = 0; i < pages.length; i++) {
        const canvas = await renderHtmlToCanvas(pages[i], 800)
        const imgHeight = (canvas.height * pageWidth) / canvas.width
        if (i > 0) pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imgHeight)
      }

      pdf.save('تقرير_مصروفات_' + branchName + '_' + periodLabel + '.pdf')
      setShowExpReportModal(false)
    } catch (err: any) {
      console.error('Expenses Report Error:', err?.message)
      alert('حدث خطأ أثناء التصدير')
    }
    setExporting(false)
  }

  // ==================== CAR ENTRY PDF EXPORT (Employee Screen) ====================
  const handleExportCarEntryPDF = async () => {
    setExportingEmp(true)
    try {
      const jspdfModule = await import('jspdf')
      const jsPDF = jspdfModule.default

      // Determine branch and entries
      let branchId = ''
      let branchName = ''
      let date = empDate

      if (isAdminMode) {
        if (!adminSelectedBranch) { setExportingEmp(false); return alert('الرجاء اختيار الفرع أولاً') }
        branchId = adminSelectedBranch
        const branch = branches.find(b => b.id === branchId)
        branchName = branch ? branch.name : ''
      } else {
        if (!user) { setExportingEmp(false); return }
        branchId = user.branchId
        const branch = branches.find(b => b.id === branchId)
        branchName = branch ? branch.name : ''
      }

      if (!date) { setExportingEmp(false); return alert('الرجاء تحديد التاريخ') }

      // Use already loaded car entries from state instead of re-fetching
      const entries = carEntries.filter(e => {
        if (e.date !== date) return false
        if (isAdminMode) return e.branchId === branchId
        return true
      })

      if (entries.length === 0) {
        alert('لا توجد تسجيلات في هذا التاريخ للتصدير')
        setExportingEmp(false)
        return
      }

      // Fetch worker expenses (treasury + cleanliness) for this date+branch
      const weData = await fetchWorkerExpData(date, branchId, branchName)
      const savedWEMap: Record<string, { cleanliness?: number; treasury?: Record<string, { income: number; expense: number }> }> = {}
      savedWEMap[branchName + '_' + date] = weData

      // Build report
      const pages = buildCarReportHTML(date, branchId, branchName, entries, savedWEMap)

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()

      // Render all pages
      for (let pi = 0; pi < pages.length; pi++) {
        const canvas = await renderHtmlToCanvas(pages[pi], 800)
        const imgHeight = (canvas.height * pageWidth) / canvas.width

        if (pi > 0) pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imgHeight)
      }

      const fileName = 'نموذج_مغاسل_' + branchName + '_' + date + '.pdf'
      pdf.save(fileName)
    } catch (err: any) {
      console.error('CarEntry PDF Error:', err?.message, err?.stack)
      alert('حدث خطأ أثناء إنشاء ملف PDF: ' + (err?.message || ''))
    }
    setExportingEmp(false)
  }

  const renderEntryCard = (entry: CarEntry, branchName: string) => {
    const room = entry.room
    let detailsHtml: React.ReactNode[] = []
    const entryPrices = Object.keys(entry.priceCounts).filter(k => !k.startsWith('custom_')).map(Number)
    entryPrices.forEach(price => {
      const count = entry.priceCounts[String(price)] || 0
      if (count > 0) {
        let subtotal = price * count
        let priceLabel = `${price} د.ل`
        if (EXTRA_PRICES.includes(price)) {
          subtotal = (price - 5) * count
          priceLabel = <>{price} د.ل <span className="text-amber-400 text-[11px]">(بعد خصم 5 إكسترا = {price - 5} د.ل)</span></>
        }
        detailsHtml.push(
          <div key={price} className="flex justify-between items-center text-sm bg-slate-900/60 px-3 py-2 rounded-lg">
            <span className="text-slate-300">تسعيرة {priceLabel}:</span>
            <div className="flex items-center gap-3">
              <span className="text-white font-bold">{count} سيارة</span>
              <span className="text-emerald-400 font-bold">{subtotal} د.ل</span>
            </div>
          </div>
        )
      }
    })

    Object.keys(entry.customPrices || {}).forEach(key => {
      const item = entry.customPrices[key]
      detailsHtml.push(
        <div key={key} className="flex justify-between items-center text-sm bg-violet-500/10 border border-violet-500/20 px-3 py-2 rounded-lg">
          <span className="text-violet-300">تسعيرة مخصصة {item.price} د.ل:</span>
          <div className="flex items-center gap-3">
            <span className="text-white font-bold">{item.count} سيارة</span>
            <span className="text-emerald-400 font-bold">{item.price * item.count} د.ل</span>
          </div>
        </div>
      )
    })

    if (entry.extraCars > 0) {
      detailsHtml.push(
        <div key="extra" className="flex justify-between items-center text-sm bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-lg mt-1">
          <span className="text-amber-300 font-semibold">⭐ إكسترا:</span>
          <div className="flex items-center gap-3">
            <span className="text-amber-200 font-bold">{entry.extraCars} سيارة × 5 د.ل</span>
            <span className="text-amber-400 font-bold">{entry.extraAmount} د.ل</span>
          </div>
        </div>
      )
    }

    const isAdminEntry = entry.empName === 'المسؤول'
    const labelColor = isAdminEntry ? 'text-amber-400' : 'text-cyan-400'
    const borderColor = isAdminEntry ? 'border-amber-500/20' : 'border-slate-700'
    const entryLabel = isAdminEntry ? '👨‍💼 المسؤول' : entry.empName

    const canEdit = isAdminMode || (!isAdminMode && entry.empId === user?.id && user?.role !== 'viewer')
    const dayClosed = isDayClosed(entry.date)

    return (
      <div key={entry.id} className={`room-card bg-slate-800 border ${borderColor} rounded-2xl p-5 shadow-lg`}>
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
          <h3 className={`text-lg font-bold ${labelColor} flex items-center gap-2`}>
            {ROOM_ICONS[room] || '🏠'} {room} <span className="text-xs text-slate-400 font-normal">({entryLabel})</span>
          </h3>
          <div className="flex items-center gap-2">
            {entry.entryTime && <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">🕐 {entry.entryTime}</span>}
            {canEdit && !dayClosed && (
              <>
                <button onClick={() => handleEditCarEntry(entry)} className="text-cyan-400 hover:text-cyan-300 text-xs bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20 hover:bg-cyan-500/20 transition">✏️</button>
                <button onClick={() => handleDeleteCarEntry(entry.id)} className="text-rose-400 hover:text-rose-300 text-xs bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 hover:bg-rose-500/20 transition">🗑️</button>
              </>
            )}
          </div>
        </div>
        <div className="space-y-1.5">{detailsHtml}</div>
        <div className="mt-4 pt-3 border-t border-slate-700">
          <div className="flex justify-between items-center">
            <span className="text-slate-300 font-semibold text-sm">إجمالي {room}:</span>
            <span className="text-xl font-black text-emerald-400">{entry.totalAmount} د.ل</span>
          </div>
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-slate-600">
            <span className="text-cyan-300 font-semibold text-sm">الصافي:</span>
            <span className="text-lg font-black text-cyan-400">{getNetAmount(entry.totalAmount, branchName, room)} د.ل</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 text-left">({getNetFormulaText(branchName, room)})</p>
        </div>
      </div>
    )
  }

  const renderPriceGrid = () => {
    const prices = getPricesForRoom(selectedRoom)
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-5">
        {prices.map(price => {
          const isExtraPrice = EXTRA_PRICES.includes(price)
          return (
            <div key={price} className={`room-card ${PRICE_BG[price] || 'bg-slate-700/10 border-slate-600/30'} border rounded-xl p-4 text-center`}>
              <p className="text-xs text-slate-400 mb-2">تسعيرة</p>
              <p className="text-2xl font-black text-white mb-1">{price} د.ل</p>
              {isExtraPrice && <p className="text-[10px] text-amber-400 mt-1">(شامل 5 د.ل إكسترا)</p>}
              <input
                type="number"
                min="0"
                value={priceInputs[price] || 0}
                onChange={e => setPriceInputs(prev => ({ ...prev, [price]: parseInt(e.target.value) || 0 }))}
                className="w-full bg-slate-900/80 border border-slate-600 rounded-lg p-2 text-center text-white text-lg font-bold focus:outline-none focus:border-cyan-500"
                onFocus={e => (e.target as HTMLInputElement).select()}
              />
            </div>
          )
        })}
        {/* Custom price card */}
        <div className="room-card bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 text-center col-span-full sm:col-span-1">
          <p className="text-xs text-violet-300 mb-2 font-semibold">➕ تسعيرة مخصصة</p>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="0"
              value={customPriceInput}
              placeholder="السعر"
              onChange={e => setCustomPriceInput(e.target.value)}
              className="flex-1 bg-slate-900/80 border border-slate-600 rounded-lg p-2 text-center text-white text-base font-bold focus:outline-none focus:border-violet-500"
              onFocus={e => (e.target as HTMLInputElement).select()}
            />
            <input
              type="number"
              min="0"
              value={customCountInput}
              placeholder="العدد"
              onChange={e => setCustomCountInput(e.target.value)}
              className="w-20 bg-slate-900/80 border border-slate-600 rounded-lg p-2 text-center text-white text-lg font-bold focus:outline-none focus:border-violet-500"
              onFocus={e => (e.target as HTMLInputElement).select()}
            />
          </div>
          <button
            onClick={handleAddCustomPrice}
            className="mt-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition w-full"
          >
            إضافة
          </button>
          <div className="mt-2 space-y-1">
            {Object.keys(customPricesData).map(key => {
              const item = customPricesData[key]
              return (
                <div key={key} className="flex justify-between items-center text-xs bg-slate-900/60 px-2 py-1 rounded-lg">
                  <span className="text-violet-300">{item.price} د.ل × {item.count}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">{item.price * item.count} د.ل</span>
                    <button onClick={() => handleRemoveCustomPrice(key)} className="text-rose-400 hover:text-rose-300">×</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ==================== EMPLOYEE SCREEN ====================
  const renderEmployeeScreen = () => {
    const currentBranch = (isAdminMode || user?.role === 'viewer')
      ? (adminSelectedBranch ? branches.find(b => b.id === adminSelectedBranch) : (user?.role === 'viewer' ? getEmployeeBranch() : null))
      : getEmployeeBranch()
    const branchName = currentBranch?.name || ''
    const branchId = currentBranch?.id || ''
    const availableRooms = branchName ? getRoomsForBranch(branchName) : []

    let displayEntries: CarEntry[] = []
    if (isAdminMode || user?.role === 'viewer') {
      const selectedBranch = user?.role === 'viewer' ? (adminSelectedBranch || user?.branchId) : adminSelectedBranch
      if (selectedBranch && empDate) {
        const adminEmpId = 'admin_' + selectedBranch
        displayEntries = carEntries.filter(e =>
          (e.branchId === selectedBranch || e.empId === adminEmpId) && e.date === empDate
        )
      }
    } else {
      if (user?.branchId && empDate) {
        const adminEmpId = 'admin_' + user.branchId
        displayEntries = carEntries.filter(e =>
          (e.empId === user.id || e.empId === adminEmpId) && e.date === empDate
        )
      }
    }
    // Sort entries by room order (غرفة 1, غرفة 2, ..., مكينة الغسيل)
    if (branchName) {
      const roomOrder = getRoomsForBranch(branchName)
      displayEntries.sort((a, b) => {
        const aIdx = roomOrder.indexOf(a.room)
        const bIdx = roomOrder.indexOf(b.room)
        return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx)
      })
    }

    let grandTotalAmount = 0
    let grandTotalCars = 0
    let grandTotalNet = 0
    displayEntries.forEach(entry => {
      grandTotalAmount += entry.totalAmount
      grandTotalCars += entry.totalCars
      grandTotalNet += getNetAmount(entry.totalAmount, branchName, entry.room)
    })

    const empInfoText = isAdminMode
      ? 'مرحباً المسؤول طه علي 👨‍💼'
      : `مرحباً ${user?.name} | ${branchName} | ${user?.shift}${user?.role === 'viewer' ? ' | 👁️ مشاهد' : ''}`
    const isViewer = user?.role === 'viewer'

    return (
      <div className="min-h-screen bg-slate-900">
        <header className="flex flex-col md:flex-row justify-between items-center bg-slate-800 p-5 rounded-2xl shadow-xl border border-slate-700 mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="logo" className="w-10 h-10 rounded-xl" />
              <h1 className="text-2xl font-extrabold text-cyan-400">جيت كلين</h1>
            </div>
            <p className="text-slate-400 text-sm mt-1">{empInfoText}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {(isAdminMode || user?.role === 'viewer') && (
              <button onClick={switchToAdminManagement} className="bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white font-semibold px-4 py-2 rounded-xl transition shadow-lg text-sm flex items-center gap-2 border border-amber-500/30">
                👤 الموظفين
              </button>
            )}
            {isAdminMode && (
            <button onClick={handleExportCarEntryPDF} disabled={exportingEmp} className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-semibold px-4 py-2 rounded-xl transition shadow-lg text-sm flex items-center gap-2 border border-emerald-500/30">
              📋 تقرير الإغلاق اليومي
            </button>
            )}
            {user?.role !== 'admin' && (
            <button onClick={() => { setShowChangePwdModal(true); setEmpNewPwd('') }} className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white font-semibold px-4 py-2 rounded-xl transition shadow-lg text-sm flex items-center gap-2 border border-cyan-500/30">
              🔑 كلمة المرور
            </button>
            )}
            <button onClick={handleLogout} className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-semibold px-4 py-2 rounded-xl transition shadow-lg text-sm flex items-center gap-2 border border-rose-500/30">
              🚪 تسجيل خروج
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 pb-24 space-y-4">
          <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-6 flex flex-col sm:flex-row items-center gap-4">
            {(isAdminMode || user?.role === 'viewer') && (
              <>
                <label className="text-sm text-amber-300 font-semibold whitespace-nowrap">📍 اختر الفرع:</label>
                <select
                  value={adminSelectedBranch || ''}
                  onChange={e => { setAdminSelectedBranch(e.target.value || null); setSelectedRoom('') }}
                  className="bg-slate-900 border border-slate-600 rounded-xl p-2.5 text-white text-base focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- اختر فرع --</option>
                  {branches.map(b => <option key={b.id} value={b.id}>📍 {b.name}</option>)}
                </select>
              </>
            )}
            <label className="text-sm text-slate-400 font-bold whitespace-nowrap">التاريخ:</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowEmpCalendar(!showEmpCalendar); setCalMonth(empDate.slice(0, 7)) }}
                className="bg-slate-900 border border-slate-600 text-white rounded-xl p-2.5 focus:outline-none focus:border-cyan-500 min-w-[140px] text-left"
              >
                📅 {empDate}
              </button>
              {showEmpCalendar && (
                <div className="absolute top-full mt-2 right-0 z-50 bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-2xl min-w-[280px]">
                  {/* Month navigation */}
                  <div className="flex items-center justify-between mb-2">
                    <button type="button" onClick={() => { const [y, m] = calMonth.split('-').map(Number); const nm = m === 1 ? 12 : m - 1; const ny = m === 1 ? y - 1 : y; setCalMonth(ny + '-' + String(nm).padStart(2, '0')) }} className="text-white px-2 py-1 hover:bg-slate-700 rounded-lg text-lg">◀</button>
                    <span className="text-white font-bold text-sm">
                      {['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][parseInt(calMonth.split('-')[1]) - 1]} {calMonth.split('-')[0]}
                    </span>
                    <button type="button" onClick={() => { const [y, m] = calMonth.split('-').map(Number); const nm = m === 12 ? 1 : m + 1; const ny = m === 12 ? y + 1 : y; setCalMonth(ny + '-' + String(nm).padStart(2, '0')) }} className="text-white px-2 py-1 hover:bg-slate-700 rounded-lg text-lg">▶</button>
                  </div>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['أحد','إث','ثل','أر','خم','جم','سبت'].map(d => (
                      <div key={d} className="text-center text-slate-400 text-xs font-bold py-1">{d}</div>
                    ))}
                  </div>
                  {/* Calendar days */}
                  {(() => {
                    const [year, month] = calMonth.split('-').map(Number)
                    const firstDay = new Date(year, month - 1, 1).getDay()
                    const daysInMonth = new Date(year, month, 0).getDate()
                    const today = todayISO()
                    const cells: React.ReactNode[] = []
                    // Empty cells before first day
                    for (let i = 0; i < firstDay; i++) cells.push(<div key={'e' + i} />)
                    // Day cells
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dateStr = calMonth + '-' + String(d).padStart(2, '0')
                      const hasData = datesWithData.includes(dateStr)
                      const isToday = dateStr === today
                      const isSelected = dateStr === empDate
                      cells.push(
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => { setEmpDate(dateStr); setShowEmpCalendar(false) }}
                          className={`relative w-8 h-8 rounded-lg text-sm font-semibold transition-all ${
                            isSelected ? 'bg-cyan-600 text-white ring-2 ring-cyan-400' :
                            isToday ? 'bg-slate-600 text-white' :
                            'text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {d}
                          {hasData && (
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                          )}
                        </button>
                      )
                    }
                    return <div className="grid grid-cols-7 gap-1">{cells}</div>
                  })()}
                  {/* Legend */}
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-700">
                    <span className="flex items-center gap-1 text-xs text-slate-400"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" /> يوجد بيانات</span>
                    <span className="flex items-center gap-1 text-xs text-slate-400"><span className="w-1.5 h-1.5 bg-cyan-400 rounded-full inline-block" /> محدد</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!isViewer && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">🚗 تسجيل السيارات</h2>

            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-4">
              <label className="block text-sm text-slate-300 mb-2 font-semibold">اختر الغرفة / المحطة:</label>
              <select
                value={selectedRoom}
                onChange={e => setSelectedRoom(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white text-base focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- اختر --</option>
                {availableRooms.map(room => (
                  <option key={room} value={room}>{ROOM_ICONS[room] || '🏠'} {room}</option>
                ))}
                <option value="__extra__">💳 {branchName === 'بن غرسه' ? 'البطاقة المصرفية / الكوبونات' : 'البطاقة المصرفية'}</option>
                <option value="__expenses__">📋 إدخال مصروفات</option>
                <option value="__withdrawal__">💰 {isAdminMode || user?.role === 'viewer' ? 'سحب أو عجز لموظف' : 'سحب لموظف'}</option>
              </select>
            </div>

            {/* غرفة عادية - إدخال سيارات */}
            {selectedRoom && !selectedRoom.startsWith('__') && (
              <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                <h3 className="text-lg font-bold text-cyan-400 mb-4">
                  {ROOM_ICONS[selectedRoom] || '🏠'} {selectedRoom}
                </h3>
                {renderPriceGrid()}
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveCarEntry}
                    disabled={saving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold py-3 rounded-xl transition shadow-lg text-sm flex items-center justify-center gap-2"
                  >
                    {saving ? '⏳ جاري الحفظ...' : '💾 حفظ التسجيل'}
                  </button>
                  <button
                    onClick={() => { setPriceInputs({}); setCustomPricesData({}) }}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition text-sm"
                  >
                    🗑️ مسح
                  </button>
                </div>
              </div>
            )}

            {/* البيانات الإضافية */}
            {selectedRoom === '__extra__' && (() => {
              const qBranchId = isAdminMode ? (adminSelectedBranch || '') : (user?.branchId || '')
              return (
              <div className="bg-slate-800 p-5 rounded-2xl border border-amber-500/30">
                <h3 className="text-lg font-bold text-amber-400 mb-4">💳 {branchName === 'بن غرسه' ? 'البطاقة المصرفية / الكوبونات' : 'البطاقة المصرفية'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">💳 بيع البطاقة المصرفية</label>
                    <input
                      type="number"
                      value={quickBankCardSale}
                      onChange={e => setQuickBankCardSale(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500"
                    />
                  </div>
                  {branchName === 'بن غرسه' && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">🎫 كوبونات</label>
                      <input
                        type="number"
                        value={quickCoupons}
                        onChange={e => setQuickCoupons(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { handleQuickTreasurySave(qBranchId, branchName, empDate); setSelectedRoom('') }}
                  className="mt-3 w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-xl transition text-sm"
                >
                  💾 حفظ البيانات
                </button>
              </div>
              )
            })()}

            {/* إدخال مصروفات */}
            {selectedRoom === '__expenses__' && (() => {
              const qBranchId2 = isAdminMode ? (adminSelectedBranch || '') : (user?.branchId || '')
              return (
              <div className="bg-slate-800 p-5 rounded-2xl border border-rose-500/30">
                <h3 className="text-lg font-bold text-rose-400 mb-4">📋 إدخال مصروفات</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                  <input
                    type="text"
                    value={quickExpName}
                    onChange={e => setQuickExpName(e.target.value)}
                    placeholder="اسم المصروف (مثلاً: صيانة)"
                    className="sm:col-span-2 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-rose-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={quickExpAmount}
                      onChange={e => setQuickExpAmount(e.target.value)}
                      placeholder="المبلغ"
                      className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-rose-500"
                    />
                    <button
                      onClick={handleAddQuickExpense}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-lg transition text-sm"
                    >
                      ➕
                    </button>
                  </div>
                </div>
                {quickExpenses.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {quickExpenses.map((exp, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                        <span className="text-slate-300 text-sm">{exp.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-rose-400 font-bold text-sm">{exp.amount} د.ل</span>
                          <button onClick={() => handleRemoveQuickExpense(idx)} className="text-slate-500 hover:text-rose-400 text-xs">✕</button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => { handleSaveQuickExpenses(qBranchId2, branchName, empDate); setSelectedRoom('') }}
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold py-3 rounded-xl transition text-sm"
                    >
                      💾 حفظ المصروفات ({quickExpenses.reduce((s, e) => s + e.amount, 0)} د.ل)
                    </button>
                  </div>
                )}
              </div>
              )
            })()}

            {/* سحب أو عجز لموظف */}
            {selectedRoom === '__withdrawal__' && (() => {
              const qBranchId3 = isAdminMode ? (adminSelectedBranch || '') : (user?.branchId || '')
              const isViewerOnly = user?.role === 'viewer'
              const isEmployee = !isAdminMode && !isViewerOnly
              const branchEmps = employees.filter(e => {
                if (e.deleted) return false
                if (e.branchId === qBranchId3) return true
                try { const ids: string[] = JSON.parse(e.multiBranchIds || '[]'); return ids.includes(qBranchId3) } catch { return false }
              })
              return (
              <div className="bg-slate-800 p-5 rounded-2xl border border-amber-500/30">
                <h3 className="text-lg font-bold text-amber-400 mb-4">💰 {!isEmployee ? 'سحب أو عجز لموظف' : 'سحب لموظف'}</h3>
                <div className="space-y-3">
                  {/* اختيار الموظف */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">👤 الموظف</label>
                    <select
                      value={qEmpId}
                      onChange={e => setQEmpId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500"
                    >
                      <option value="">-- اختر الموظف --</option>
                      {branchEmps.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* اختيار النوع */}
                  {!isEmployee && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">📝 النوع</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setQRecordType('withdrawal')}
                        className={qRecordType === 'withdrawal'
                          ? 'bg-amber-600 text-white font-bold py-2.5 rounded-lg transition text-sm border-2 border-amber-400'
                          : 'bg-slate-900 text-slate-400 font-bold py-2.5 rounded-lg transition text-sm border-2 border-slate-600 hover:border-amber-500/50'}
                      >
                        💸 سحب
                      </button>
                      <button
                        onClick={() => setQRecordType('shortage')}
                        className={qRecordType === 'shortage'
                          ? 'bg-rose-600 text-white font-bold py-2.5 rounded-lg transition text-sm border-2 border-rose-400'
                          : 'bg-slate-900 text-slate-400 font-bold py-2.5 rounded-lg transition text-sm border-2 border-slate-600 hover:border-rose-500/50'}
                      >
                        📉 عجز
                      </button>
                    </div>
                  </div>
                  )}

                  {/* المبلغ */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">💵 المبلغ</label>
                    <input
                      type="number"
                      value={qRecordAmount}
                      onChange={e => setQRecordAmount(e.target.value)}
                      placeholder="أدخل المبلغ"
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* ملاحظة */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">📝 ملاحظة (اختياري)</label>
                    <input
                      type="text"
                      value={qRecordNote}
                      onChange={e => setQRecordNote(e.target.value)}
                      placeholder="ملاحظة..."
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    onClick={() => handleSaveQuickRecord(qBranchId3, empDate)}
                    disabled={saving || !qEmpId || !qRecordAmount}
                    className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition text-sm"
                  >
                    {saving ? '⏳ جاري الحفظ...' : isEmployee ? '💸 تسجيل سحب' : (qRecordType === 'withdrawal' ? '💸 تسجيل سحب' : '📉 تسجيل عجز')}
                  </button>
                </div>
              </div>
              )
            })()}
          </div>
          )}

          {displayEntries.length === 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-slate-400">
                {!branchId ? 'اختر الفرع لعرض البيانات' : 'لا توجد تسجيلات لهذا اليوم بعد'}
              </p>
              <p className="text-slate-500 text-sm mt-1">اختر غرفة وسجل عدد السيارات</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayEntries.map(entry => renderEntryCard(entry, branchName))}
          </div>

          {displayEntries.length > 0 && (
            <div className="bg-slate-800 border-2 border-cyan-500/30 rounded-2xl p-5 shadow-xl">
              <h3 className="text-sm font-bold text-cyan-400 mb-3">📊 الإجمالي الكلي</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-900/60 rounded-xl p-3">
                  <p className="text-xs text-slate-400">السيارات</p>
                  <p className="text-lg font-black text-white">{grandTotalCars} سيارة</p>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-3">
                  <p className="text-xs text-slate-400">المبيعات</p>
                  <p className="text-lg font-black text-emerald-400">{grandTotalAmount} د.ل</p>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-3">
                  <p className="text-xs text-slate-400">الصافي</p>
                  <p className="text-lg font-black text-cyan-400">{grandTotalNet} د.ل</p>
                </div>
              </div>
            </div>
          )}

          {/* Worker Expenses + Treasury */}
          {displayEntries.length > 0 && branchName && (() => {
            const wKey = branchName + '_' + empDate
            const savedWE = workerExpData[wKey] || {}
            const cleannessConfig = BRANCH_CLEANLINESS[branchName]
            if (!cleannessConfig) return null

            // Calculate room net map
            const roomNetMap: Record<string, number> = {}
            displayEntries.forEach(e => {
              const net = getNetAmount(e.totalAmount, branchName, e.room)
              roomNetMap[e.room] = (roomNetMap[e.room] || 0) + net
            })

            const availableRooms = getRoomsForBranch(branchName)
            let totalRoomsNet = 0
            availableRooms.forEach(r => { if (roomNetMap[r]) totalRoomsNet += roomNetMap[r] })
            if (totalRoomsNet === 0 && !Object.keys(roomNetMap).length) return null

            let selectedCleanliness = savedWE.cleanliness || 0
            if (cleannessConfig.type === 'fixed') selectedCleanliness = cleannessConfig.value || 0

            const workerExpTotal = totalRoomsNet + selectedCleanliness

            // Treasury calculations
            const treasSaved = savedWE.treasury || {}
            const treasuryItems = getTreasuryItems(branchName)
            const bankCardSale = parseInt(String(treasSaved['بيع_البطاقة']?.expense)) || 0
            const bankCardReplaceAuto = Math.floor(bankCardSale / 2)
            const workerExpInTreasury = workerExpTotal - bankCardReplaceAuto

            let runningBalance = 0
            const treasuryRows = treasuryItems.map((item, idx) => {
              const rowSaved = treasSaved[item.key] || {}
              let income = rowSaved.income || 0
              let expense = rowSaved.expense || 0
              let isAuto = false
              if (item.key === 'بدل_البطاقة') { expense = bankCardReplaceAuto; isAuto = true }
              if (item.key === 'مصاريف_العمال') { expense = workerExpInTreasury; isAuto = true }
              if (item.key === 'تم_التحويل') { expense = Math.max(0, runningBalance); isAuto = true }
              runningBalance = runningBalance + income - expense
              const balColor = runningBalance >= 0 ? '#fcd34d' : '#f87171'
              const rowBg = idx % 2 === 0 ? 'rgba(15,23,42,0.4)' : 'rgba(15,23,42,0.2)'
              return { ...item, income, expense, isAuto, balance: runningBalance, balColor, rowBg }
            })

            const currentBranchId = isAdminMode ? adminSelectedBranch : (user?.branchId || '')

            return (
              <div className="bg-gradient-to-l from-emerald-600/10 to-cyan-600/10 border border-emerald-500/30 rounded-2xl p-5 shadow-xl mt-4">
                <div className="border-t border-amber-500/30 pt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* مصاريف العمال */}
                    <div>
                      <h3 className="text-base font-bold text-amber-400 mb-3 flex items-center gap-2">🧹 مصاريف العمال</h3>
                      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                        {availableRooms.map((room, idx) => {
                          const net = roomNetMap[room]
                          if (net === undefined || net === 0) return null
                          const icon = ROOM_ICONS[room] || '🏠'
                          const bgColor = idx % 2 === 0 ? 'background:rgba(15,23,42,0.4)' : 'background:rgba(15,23,42,0.2)'
                          return (
                            <div key={room} className="flex justify-between items-center px-4 py-2.5" style={{ background: bgColor.split('(')[1]?.slice(0,-1) ? bgColor : undefined, borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{icon}</span>
                                <span className="text-slate-200 text-sm font-semibold">{room}</span>
                              </div>
                              <span className="text-cyan-400 text-base font-black">{net} د.ل</span>
                            </div>
                          )
                        })}
                        <div className="border-t border-amber-500/20" />
                        {/* Cleanliness */}
                        <div className="flex justify-between items-center px-4 py-2.5" style={{ background: 'rgba(245,158,11,0.05)' }}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🧹</span>
                            <span className="text-amber-300 text-sm font-semibold">النظافة</span>
                          </div>
                          {cleannessConfig.type === 'fixed' ? (
                            <span className="text-amber-400 text-base font-bold">{cleannessConfig.value} د.ل</span>
                          ) : (
                            <select
                              value={selectedCleanliness}
                              onChange={e => handleCleanlinessChange(wKey, parseInt(e.target.value) || 0, currentBranchId, empDate)}
                              className="bg-slate-900 border border-amber-500/30 text-amber-300 rounded-lg px-3 py-1 text-sm font-bold outline-none"
                            >
                              <option value={0}>-- اختر --</option>
                              {cleannessConfig.options?.map(opt => (
                                <option key={opt} value={opt}>{opt} د.ل</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div className="border-t-2 border-emerald-500/30" />
                        {/* Grand total */}
                        <div className="flex justify-between items-center px-4 py-3" style={{ background: 'rgba(16,185,129,0.1)' }}>
                          <span className="text-emerald-300 text-sm font-bold">الإجمالي</span>
                          <span className="text-emerald-400 text-xl font-black">{workerExpTotal} د.ل</span>
                        </div>
                      </div>
                    </div>

                    {/* الخزينة */}
                    {(isAdminMode || user?.role === 'viewer') && (
                      <div>
                        <h3 className="text-base font-bold text-blue-400 mb-3 flex items-center gap-2">🏦 الخزينة</h3>
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                          {/* Header */}
                          <div className="grid grid-cols-4 gap-0 px-3 py-2" style={{ background: 'rgba(30,41,59,0.8)', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                            <span className="text-blue-300 text-xs font-bold">البيان</span>
                            <span className="text-emerald-400 text-xs font-bold text-center">دخل</span>
                            <span className="text-red-300 text-xs font-bold text-center">خرج</span>
                            <span className="text-amber-300 text-xs font-bold text-center">الرصيد</span>
                          </div>
                          {treasuryRows.map(row => (
                            <div key={row.key} className="grid grid-cols-4 gap-0 items-center px-3 py-2" style={{ background: row.rowBg, borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                              <span className="text-slate-200 text-xs font-semibold">
                                {row.label}
                                {row.isAuto && <span className="text-amber-400 text-[10px] ml-1">(تلقائي)</span>}
                              </span>
                              {/* Income */}
                              {row.isAuto && row.key === 'بدل_البطاقة' ? (
                                <div className="text-center" />
                              ) : row.key === 'بيع_البطاقة' ? (
                                <div className="text-center" />
                              ) : (
                                <div className="text-center">
                                  <input
                                    type="number"
                                    value={row.income || ''}
                                    placeholder="0"
                                    readOnly={user?.role === 'viewer'}
                                    onChange={e => handleTreasuryFieldChange(wKey, branchName, currentBranchId, empDate, row.key, 'income', parseInt(e.target.value) || 0)}
                                    className={"bg-slate-900 border rounded-md px-2 py-1 text-xs font-bold w-16 text-center outline-none " + (user?.role === 'viewer' ? 'border-slate-600 text-slate-400 opacity-70 cursor-not-allowed' : 'border-blue-400/30 text-emerald-400')}
                                  />
                                </div>
                              )}
                              {/* Expense */}
                              {row.isAuto ? (
                                <div className="text-center">
                                  <input
                                    type="number"
                                    value={row.expense || 0}
                                    readOnly
                                    className="bg-slate-900/70 border border-amber-500/30 text-amber-300 rounded-md px-2 py-1 text-xs font-bold w-16 text-center outline-none"
                                  />
                                </div>
                              ) : (
                                <div className="text-center">
                                  <input
                                    type="number"
                                    value={row.expense || ''}
                                    placeholder="0"
                                    readOnly={user?.role === 'viewer'}
                                    onChange={e => handleTreasuryFieldChange(wKey, branchName, currentBranchId, empDate, row.key, 'expense', parseInt(e.target.value) || 0)}
                                    className={"bg-slate-900 border rounded-md px-2 py-1 text-xs font-bold w-16 text-center outline-none " + (user?.role === 'viewer' ? 'border-slate-600 text-slate-400 opacity-70 cursor-not-allowed' : 'border-red-400/30 text-red-300')}
                                  />
                                </div>
                              )}
                              {/* Balance */}
                              <span className="text-center text-xs font-black" style={{ color: row.balColor }}>{row.balance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )
          })()}

          {/* بطاقة المصروفات والسحوبات المدخلة لليوم */}
          {branchName && empDate && (() => {
            const expWKey = branchName + '_' + empDate
            const expBranchId = isAdminMode ? adminSelectedBranch : (user?.branchId || '')
            const savedWE2 = workerExpData[expWKey] || {}
            const treasury = savedWE2.treasury || {}
            const expenseEntries = Object.keys(treasury)
              .filter(k => k.startsWith('مصروف_'))
              .map(k => ({ key: k, name: k.replace('مصروف_', ''), amount: treasury[k].expense || 0, type: 'expense' as const }))

            // سحوبات وعجوزات اليوم
            const todayRecords = records
              .filter(r => r.date === empDate && r.branchId === expBranchId)
              .map(r => ({
                key: r.id,
                name: (r.type === 'withdrawal' ? '💸 سحب: ' : '📉 عجز: ') + (r.employee?.name || ''),
                amount: r.amount,
                type: r.type as 'withdrawal' | 'shortage'
              }))

            const allEntries = [...expenseEntries, ...todayRecords]
            if (allEntries.length === 0) return null
            const totalExp = allEntries.reduce((s, e) => s + e.amount, 0)
            const canEdit = user?.role !== 'viewer'
            return (
              <div className="bg-slate-800 border border-rose-500/30 rounded-2xl p-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2">📋 حركات اليوم</h4>
                  <span className="text-rose-400 text-sm font-black">{totalExp} د.ل</span>
                </div>
                <div className="space-y-2">
                  {allEntries.map(entry => (
                    <div key={entry.key} className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                      {/* الاسم */}
                      {entry.type === 'expense' ? (
                        canEdit ? (
                          <input
                            type="text"
                            defaultValue={entry.name}
                            onBlur={e => {
                              const newName = e.target.value.trim()
                              if (newName && newName !== entry.name) handleExpenseRename(expWKey, expBranchId, empDate, entry.key, newName)
                              else e.target.value = entry.name
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                            }}
                            className="bg-slate-800 border border-slate-600 text-slate-200 rounded-md px-2 py-1 text-xs font-semibold flex-1 outline-none focus:border-cyan-400/50"
                          />
                        ) : (
                          <span className="text-slate-300 text-sm flex-1">{entry.name}</span>
                        )
                      ) : (
                        <span className={"text-sm flex-1 " + (entry.type === 'withdrawal' ? 'text-amber-300' : 'text-rose-300')}>{entry.name}</span>
                      )}
                      {/* المبلغ */}
                      {canEdit ? (
                        <input
                          type="number"
                          value={entry.amount || ''}
                          placeholder="0"
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0
                            if (entry.type === 'expense') {
                              handleTreasuryFieldChange(expWKey, branchName, expBranchId, empDate, entry.key, 'expense', val)
                            } else {
                              handleEditRecord(entry.key, val, empDate)
                            }
                          }}
                          className="bg-slate-800 border border-red-400/30 text-red-300 rounded-md px-2 py-1 text-xs font-bold w-20 text-center outline-none"
                        />
                      ) : (
                        <span className="text-rose-400 text-sm font-bold">{entry.amount} د.ل</span>
                      )}
                      {/* حذف */}
                      {canEdit && (
                        <button
                          onClick={() => {
                            if (entry.type === 'expense') {
                              setWorkerExpData(prev => {
                                const updated = { ...prev }
                                if (updated[expWKey]?.treasury) {
                                  const t = { ...updated[expWKey].treasury! }
                                  delete t[entry.key]
                                  updated[expWKey] = { ...updated[expWKey], treasury: t }
                                  void saveWorkerExpData(expBranchId, empDate, updated[expWKey])
                                }
                                return updated
                              })
                            } else {
                              handleDeleteRecord(entry.key, empDate)
                            }
                          }}
                          className="text-slate-500 hover:text-rose-400 text-xs"
                          title="حذف"
                        >🗑️</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </main>
      </div>
    )
  }

  // ==================== ADMIN MANAGEMENT SCREEN ====================
  const renderAdminScreen = () => {
    const dayClosed = isDayClosed(adminDate)

    // حساب الإجماليات للشهر الحالي من سجلات الفرع المحدد
    const currentMonth = adminDate.substring(0, 7)
    let grandWithdrawals = 0
    let grandShortages = 0
    const selectedBranchId = adminSelectedBranch || user?.branchId
    if (selectedBranchId) {
      records.forEach(r => {
        if (r.date.startsWith(currentMonth) && r.branchId === selectedBranchId) {
          if (r.type === 'withdrawal') grandWithdrawals += r.amount
          if (r.type === 'shortage') grandShortages += r.amount
        }
      })
    }

    return (
      <div className="min-h-screen bg-slate-900">
        <header className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50 px-4 py-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="logo" className="w-10 h-10 rounded-xl" />
                <div>
                  <h1 className="text-base font-bold text-cyan-400">مغسلة جيت كلين - لوحة التحكم</h1>
                  <p className="text-xs text-slate-400">{user?.role === 'viewer' ? 'مرحباً المشاهد 👁️' : 'مرحباً المسؤول طه علي 👨‍💼'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={switchToCarEntry} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-2 rounded-xl transition shadow-lg text-sm flex items-center gap-1">
                  🚗 إعداد الغرف
                </button>
                {user?.role !== 'viewer' && <>
                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setShowAdminDropdown(!showAdminDropdown) }} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-3 py-2 rounded-xl transition shadow-lg text-sm flex items-center gap-1 border border-slate-600">
                    ⚙️ أدوات
                  </button>
                  {showAdminDropdown && (
                    <div className="absolute top-full mt-2 left-0 z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl py-2 min-w-[180px]" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setShowAdminDropdown(false); setShowEmpReportModal(true) }} className="w-full text-right px-4 py-2.5 hover:bg-slate-700 text-white text-sm flex items-center gap-2 transition">
                        <span>📄</span> تقرير الموظفين
                      </button>
                      <button onClick={() => { setShowAdminDropdown(false); setShowExpReportModal(true); setExpReportBranchId('') }} className="w-full text-right px-4 py-2.5 hover:bg-slate-700 text-white text-sm flex items-center gap-2 transition">
                        <span>📋</span> تقرير مصروفات الفروع
                      </button>
                      <button onClick={() => { setShowAdminDropdown(false); setShowBranchModal(true) }} className="w-full text-right px-4 py-2.5 hover:bg-slate-700 text-white text-sm flex items-center gap-2 transition">
                        <span>➕</span> إضافة فرع
                      </button>
                      <button onClick={() => { setShowAdminDropdown(false); setShowMultiBranchPicker(false); setShowEmpModal(true) }} className="w-full text-right px-4 py-2.5 hover:bg-slate-700 text-white text-sm flex items-center gap-2 transition">
                        <span>👤</span> إضافة موظف
                      </button>
                      <button onClick={() => { setShowAdminDropdown(false); setShowPasswordsModal(true); setAdminPassword(''); const pwdMap: Record<string,string> = {}; employees.filter(e => e.hasLogin).forEach(e => { pwdMap[e.id] = e.password || '' }); setEmpPasswords(pwdMap) }} className="w-full text-right px-4 py-2.5 hover:bg-slate-700 text-white text-sm flex items-center gap-2 transition">
                        <span>🔑</span> كلمات السر
                      </button>
                      <button onClick={() => { setShowAdminDropdown(false); handleRestore() }} disabled={restoreLoading} className="w-full text-right px-4 py-2.5 hover:bg-slate-700 text-amber-300 text-sm flex items-center gap-2 transition disabled:opacity-50">
                        <span>{restoreLoading ? '⏳' : '📥'}</span> استعادة
                      </button>
                    </div>
                  )}
                </div>
                </>}
                <button onClick={handleLogout} className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-semibold px-3 py-2 rounded-xl transition shadow-lg text-sm flex items-center gap-1 border border-rose-500/30">
                  🚪 خروج
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto p-4 pb-24 space-y-4">

          {/* إشعارات الإضافة التلقائية */}
          {notifications.length > 0 && (
            <div className="space-y-2">
              {notifications.slice(0, 3).map(n => (
                <div key={n.id} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-3 flex justify-between items-center text-sm animate-[fadeIn_0.3s_ease-in]">
                  <span>🔔 {n.message}</span>
                  <span className="text-xs text-emerald-400/60">{n.time}</span>
                </div>
              ))}
              {notifications.length > 3 && (
                <div className="text-center text-xs text-slate-500">+{notifications.length - 3} إشعارات أخرى</div>
              )}
              <button onClick={() => setNotifications([])} className="text-xs text-slate-500 hover:text-slate-400 transition">إخفاء الكل</button>
            </div>
          )}

          {/* شريط حالة الموظفين السريع */}
          {(() => {
            const todayStr = adminDate
            const loginEmps = employees.filter(e => !e.deleted && e.hasLogin && e.branchId && branches.some(b => b.id === e.branchId))
            const onlineCount = loginEmps.filter(e => carEntries.some(ce => ce.empId === e.id && ce.date === todayStr)).length
            const offlineCount = loginEmps.length - onlineCount
            if (loginEmps.length === 0) return null
            return (
              <div className="flex items-center justify-center gap-4 bg-slate-800/60 rounded-2xl border border-slate-700/40 px-6 py-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-sm font-bold text-emerald-400">{onlineCount}</span>
                  <span className="text-xs text-slate-400">أونلاين</span>
                </div>
                <div className="w-px h-5 bg-slate-700"></div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                  <span className="text-sm font-bold text-slate-400">{offlineCount}</span>
                  <span className="text-xs text-slate-400">أوفلاين</span>
                </div>
                <div className="w-px h-5 bg-slate-700"></div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">الإجمالي</span>
                  <span className="text-sm font-bold text-slate-300">{loginEmps.length}</span>
                  <span className="text-xs text-slate-500">موظف</span>
                </div>
              </div>
            )
          })()}

          {/* الموظفون النشطون اليوم */}
          {(() => {
            const todayStr = adminDate
            const activeEmps = new Map<string, { name: string; lastTime: string; rooms: number; branch: string }>()
            carEntries.filter(e => e.date === todayStr).forEach(e => {
              const existing = activeEmps.get(e.empId)
              if (existing) {
                existing.rooms++
                if (e.entryTime && e.entryTime > existing.lastTime) existing.lastTime = e.entryTime
              } else {
                const branchName = branches.find(b => b.id === e.branchId)?.name || ''
                activeEmps.set(e.empId, { name: e.empName, lastTime: e.entryTime || '', rooms: 1, branch: branchName })
              }
            })
            // موظفين لديهم رمز دخول فقط
            const loginEmps = employees.filter(e => !e.deleted && e.hasLogin && e.branchId && branches.some(b => b.id === e.branchId))
            const activeCount = loginEmps.filter(e => activeEmps.has(e.id)).length

            if (loginEmps.length === 0) return null
            return (
              <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                <button
                  onClick={() => setShowActiveEmpsDropdown(!showActiveEmpsDropdown)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-750 transition"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-300">📊 حالة الموظفين</h3>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">{activeCount} أونلاين</span>
                    <span className="text-xs bg-slate-700/50 text-slate-400 px-2.5 py-1 rounded-full border border-slate-600/30">{loginEmps.length - activeCount} أوفلاين</span>
                  </div>
                  <span className={`text-slate-400 transition-transform duration-200 ${showActiveEmpsDropdown ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {showActiveEmpsDropdown && (
                  <div className="border-t border-slate-700 p-3 space-y-1.5">
                    {loginEmps.map(emp => {
                      const info = activeEmps.get(emp.id)
                      if (info) {
                        return (
                          <div key={emp.id} className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
                              <div>
                                <span className="text-sm text-emerald-300 font-bold">{info.name}</span>
                                <span className="text-xs text-slate-400 mr-2">- {info.branch}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full font-bold border border-emerald-500/20">● أونلاين</span>
                              <span className="text-xs text-emerald-400/80 bg-emerald-500/10 px-2 py-1 rounded-lg">{info.rooms} غرف</span>
                              {info.lastTime && <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">🕐 {info.lastTime}</span>}
                            </div>
                          </div>
                        )
                      } else {
                        return (
                          <div key={emp.id} className="flex items-center justify-between bg-slate-700/20 border border-slate-600/15 rounded-xl px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="w-3 h-3 rounded-full bg-slate-600"></span>
                              <div>
                                <span className="text-sm text-slate-500">{emp.name}</span>
                                <span className="text-xs text-slate-600 mr-2">- {branches.find(b => b.id === emp.branchId)?.name || ''}</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-500 bg-slate-700/50 px-2 py-1 rounded-full font-bold border border-slate-600/30">● أوفلاين</span>
                          </div>
                        )
                      }
                    })}
                  </div>
                )}
              </div>
            )
          })()}

          {/* صف واحد: السحبيات + العجوزات */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-slate-400 text-xs font-bold">إجمالي سحوبات الشهر</p>
                <h2 className="text-2xl font-black text-amber-400 mt-1">{grandWithdrawals} د.ل</h2>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl text-2xl">💸</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-slate-400 text-xs font-bold">إجمالي عجوزات الشهر</p>
                <h2 className="text-2xl font-black text-rose-400 mt-1">{grandShortages} د.ل</h2>
              </div>
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl text-2xl">📉</div>
            </div>
          </div>

          {dayClosed && (
            <div className="bg-violet-500/10 border border-violet-500/30 text-violet-300 rounded-xl p-4 flex justify-between items-center text-sm">
              <span>🔒 هذا اليوم ({formatDateShort(adminDate)}) <strong>مغلق</strong></span>
            </div>
          )}

          {/* بطاقات الفروع - شبكة عمودين */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {branches.map(branch => {
              const todayStr = adminDate
              const isMulti = (e: any) => { try { return JSON.parse(e.multiBranchIds || '[]').length > 0 } catch { return false } }
              const branchEmps = employees.filter(e => e.branchId === branch.id && !isMulti(e))
              let branchWithdrawals = 0
              let branchShortages = 0
              let branchCarTotal = 0
              let branchCarCount = 0

              const currentMonth = adminDate.substring(0, 7) // 'YYYY-MM'
              const empCards = branchEmps.map(emp => {
                const empRecordsDay = records.filter(r => r.empId === emp.id && r.date === adminDate && r.branchId === branch.id)
                const empRecordsMonth = records.filter(r => r.empId === emp.id && r.date.startsWith(currentMonth) && r.branchId === branch.id)
                const withdrawals = empRecordsMonth.filter(r => r.type === 'withdrawal').reduce((sum, r) => sum + r.amount, 0)
                const shortages = empRecordsMonth.filter(r => r.type === 'shortage').reduce((sum, r) => sum + r.amount, 0)
                branchWithdrawals += withdrawals
                branchShortages += shortages

                const empCarEntries = carEntries.filter(e => e.empId === emp.id && e.date === adminDate)
                const carTotal = empCarEntries.reduce((s, e) => s + e.totalAmount, 0)
                const carCount = empCarEntries.reduce((s, e) => s + e.totalCars, 0)
                branchCarTotal += carTotal
                branchCarCount += carCount

                const isEmpOnline = carEntries.some(e => e.empId === emp.id && e.date === todayStr)
                return (
                  <div key={emp.id} className={`bg-slate-900 border rounded-xl p-3.5 transition-all ${isEmpOnline ? 'border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]' : 'border-slate-700/40'}`}>
                    <div className="flex justify-between items-center mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isEmpOnline ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-slate-600'}`} title={isEmpOnline ? 'أونلاين' : 'أوفلاين'}></span>
                        <h3 className={`text-sm ${isEmpOnline ? 'font-bold text-emerald-300' : 'font-bold text-slate-400'}`}>{emp.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isEmpOnline ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-500 bg-slate-700/50 border-slate-600/30'}`}>{isEmpOnline ? 'أونلاين' : 'أوفلاين'}</span>
                        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">{emp.shift}</span>
                        {emp.hasLogin && emp.role === 'viewer' && <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">👁️ مشاهد</span>}
                        {!emp.hasLogin && <span className="text-[10px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full border border-slate-600/30">بدون دخول</span>}
                        {emp.endDate ? (
                          <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">متوقف</span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{emp.startDate ? 'مستمر' : 'مستمر'}</span>
                        )}
                        {(() => { try { const ids = JSON.parse(emp.multiBranchIds || '[]'); if (ids.length > 0) return true; return false } catch { return false } })() && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">🌐 متعدد الفروع</span>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        {user?.role !== 'viewer' && !dayClosed && (
                          <button
                            onClick={() => {
                              setRecordModalData({
                                id: '', empId: emp.id, empName: emp.name, type: 'withdrawal',
                                amount: '', note: '', date: adminDate, branchId: branch.id
                              })
                              setShowRecordModal(true)
                            }}
                            className="bg-cyan-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition hover:bg-cyan-400"
                          >+ حركة</button>
                        )}
                        {user?.role !== 'viewer' && <>
                        <button onClick={() => handleDeleteEmployee(emp.id, emp.name)} className="text-slate-500 hover:text-rose-400 text-xs p-1" title="حذف الموظف مع بقاء الحركات">🗑️</button>
                        <button onClick={() => { setEditEmp({ ...emp, hasLogin: !!emp.hasLogin, password: emp.password || '' }); setShowEditEmpModal(true) }} className="text-slate-500 hover:text-cyan-400 text-xs p-1">✏️</button>
                        </>}
                      </div>
                    </div>

                    {/* سحب + عجز */}
                    <div className="flex items-center gap-0 bg-slate-800/80 rounded-lg overflow-hidden text-[11px] border border-slate-700/30">
                      <div className="flex-1 flex justify-between px-3 py-2">
                        <span className="text-slate-400">💸 السحب</span>
                        <span className="font-bold text-amber-400">{withdrawals}</span>
                      </div>
                      <div className="w-px h-6 bg-slate-700/50" />
                      <div className="flex-1 flex justify-between px-3 py-2">
                        <span className="text-slate-400">📉 العجز</span>
                        <span className="font-bold text-rose-400">{shortages}</span>
                      </div>
                    </div>

                    {/* سجل حركات الشهر */}
                    <div className="space-y-1 mt-2 max-h-52 overflow-y-auto custom-scrollbar">
                      {empRecordsMonth.length === 0 && (
                        <p className="text-slate-500 text-[11px] text-center py-1.5">لا توجد حركات</p>
                      )}
                      {empRecordsMonth.sort((a,b) => (b.date||'').localeCompare(a.date||'')).map(r => (
                        <div key={r.id} className="flex justify-between items-center text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1.5 rounded-lg">
                          <span>{r.date?.substring(5)} {r.type === 'withdrawal' ? '💸 سحب' : '📉 عجز'} {r.note || ''}</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${r.type === 'withdrawal' ? 'text-amber-400' : 'text-rose-400'}`}>{r.amount} د.ل</span>
                            {user?.role !== 'viewer' && !dayClosed && (
                              <>
                                <button onClick={() => {
                                  setRecordModalData({
                                    id: r.id, empId: r.empId, empName: emp.name, type: r.type,
                                    amount: String(r.amount), note: r.note, date: r.date, branchId: r.branchId
                                  })
                                  setShowRecordModal(true)
                                }} className="text-slate-600 hover:text-cyan-400">✏️</button>
                                <button onClick={() => handleDeleteRecord(r.id)} className="text-slate-600 hover:text-rose-400">×</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })

              return (
                <div key={branch.id} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
                  {/* رأس البطاقة */}
                  <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-700/40">
                    <div className="flex items-center gap-2">
                      <span className="text-pink-400">📍</span>
                      <h2 className="text-base font-bold text-cyan-400">{branch.name}</h2>
                    </div>
                    {user?.role !== 'viewer' && <button onClick={() => handleDeleteBranch(branch.id)} className="text-rose-400 hover:text-rose-300 text-[11px] font-bold bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 transition">حذف الكل</button>}
                  </div>
                  {/* محتوى الموظفين */}
                  <div className="p-3.5 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {branchEmps.length === 0 && (
                      <p className="text-slate-500 text-sm text-center py-4">لا يوجد موظفون بالفرع حالياً</p>
                    )}
                    {empCards}
                  </div>
                </div>
              )
            })}
          </div>

          {/* بطاقة الموظفين متعددي الفروع */}
          {(() => {
            const multiEmps = employees.filter(e => {
              try { const ids = JSON.parse(e.multiBranchIds || '[]'); return ids.length > 0 } catch { return false }
            })
            if (multiEmps.length === 0) return null
            const currentMonth = adminDate.substring(0, 7)
            return (
              <div className="mt-4 bg-slate-800 border border-amber-500/30 rounded-2xl overflow-hidden shadow-lg">
                <div className="flex justify-between items-center px-5 py-3.5 border-b border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">🌐</span>
                    <h2 className="text-base font-bold text-amber-400">موظفين مشتركين (أكثر من فرع)</h2>
                  </div>
                </div>
                <div className="p-3.5 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {multiEmps.map(emp => {
                    const empRecordsMonth = records.filter(r => r.empId === emp.id && r.date.startsWith(currentMonth))
                    const withdrawals = empRecordsMonth.filter(r => r.type === 'withdrawal').reduce((s, r) => s + r.amount, 0)
                    const shortages = empRecordsMonth.filter(r => r.type === 'shortage').reduce((s, r) => s + r.amount, 0)
                    const total = withdrawals + shortages
                    const branchNames = (() => {
                      try {
                        const ids: string[] = JSON.parse(emp.multiBranchIds || '[]')
                        const names = ids.map(id => branches.find(b => b.id === id)?.name).filter(Boolean)
                        const mainBranch = branches.find(b => b.id === emp.branchId)?.name
                        return mainBranch ? [mainBranch, ...names] : names
                      } catch { return [] }
                    })()
                    return (
                      <div key={emp.id} className="bg-slate-900 border border-amber-500/20 rounded-xl p-3.5">
                        <div className="flex justify-between items-center mb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white text-sm">{emp.name}</h3>
                            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">{emp.shift}</span>
                            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">🌐 {branchNames.join(' | ')}</span>
                          </div>
                          <div className="flex gap-1.5">
                            {!dayClosed && (
                              <button
                                onClick={() => {
                                  setRecordModalData({
                                    id: '', empId: emp.id, empName: emp.name, type: 'withdrawal',
                                    amount: '', note: '', date: adminDate, branchId: emp.branchId
                                  })
                                  setShowRecordModal(true)
                                }}
                                className="bg-cyan-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition hover:bg-cyan-400"
                              >+ حركة</button>
                            )}
                            {user?.role !== 'viewer' && <button onClick={() => { setEditEmp({ ...emp, hasLogin: !!emp.hasLogin, password: emp.password || '' }); setShowEditEmpModal(true) }} className="text-slate-500 hover:text-cyan-400 text-xs p-1">✏️</button>}
                            {user?.role !== 'viewer' && (
                              <button onClick={() => handleDeleteEmployee(emp.id, emp.name)} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs px-2 py-1 rounded-lg border border-rose-500/20 transition font-bold">🗑️ حذف</button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <div className="bg-slate-800/80 rounded-lg p-2 text-center">
                            <div className="text-[10px] text-slate-400">سحوبات الشهر</div>
                            <div className="text-sm font-bold text-amber-400">{withdrawals} د.ل</div>
                          </div>
                          <div className="bg-slate-800/80 rounded-lg p-2 text-center">
                            <div className="text-[10px] text-slate-400">عجز الشهر</div>
                            <div className="text-sm font-bold text-rose-400">{shortages} د.ل</div>
                          </div>
                          <div className="bg-slate-800/80 rounded-lg p-2 text-center">
                            <div className="text-[10px] text-slate-400">الإجمالي</div>
                            <div className="text-sm font-bold text-white">{total} د.ل</div>
                          </div>
                        </div>
                        <div className="space-y-1 mt-2 max-h-52 overflow-y-auto custom-scrollbar">
                          {empRecordsMonth.length === 0 && (
                            <p className="text-slate-500 text-[11px] text-center py-1.5">لا توجد حركات</p>
                          )}
                          {empRecordsMonth.sort((a,b) => (b.date||'').localeCompare(a.date||'')).map(r => (
                            <div key={r.id} className="flex justify-between items-center text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1.5 rounded-lg">
                              <span>{r.date?.substring(5)} {r.type === 'withdrawal' ? '💸 سحب' : '📉 عجز'} {r.note || ''}</span>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${r.type === 'withdrawal' ? 'text-amber-400' : 'text-rose-400'}`}>{r.amount} د.ل</span>
                                {!dayClosed && (
                                  <>
                                    <button onClick={() => {
                                      setRecordModalData({
                                        id: r.id, empId: r.empId, empName: emp.name, type: r.type,
                                        amount: String(r.amount), note: r.note, date: r.date, branchId: r.branchId
                                      })
                                      setShowRecordModal(true)
                                    }} className="text-slate-600 hover:text-cyan-400">✏️</button>
                                    <button onClick={() => handleDeleteRecord(r.id)} className="text-slate-600 hover:text-rose-400">×</button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </main>
      </div>
    )
  }

  // ==================== LOGIN SCREEN ====================
  const renderLoginScreen = () => (
    <div className="min-h-screen login-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="logo" className="w-20 h-20 rounded-2xl mx-auto mb-3" />
            <h1 className="text-2xl font-black text-cyan-400">جيت كلين</h1>
            <p className="text-sm text-slate-400 mt-1">مغسلة جيت كلين - نظام إدارة الفروع</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300 mb-1 block">اختر المستخدم</label>
              <select
                value={loginEmpId}
                onChange={e => { setLoginEmpId(e.target.value); setLoginError('') }}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- اختر اسمك --</option>
                <option value="admin">👨‍💼 المسؤول (طه علي)</option>
                {employees.filter(emp => emp.hasLogin).map(emp => {
                  const brName = branches.find(b => b.id === emp.branchId)?.name || ''
                  return (
                    <option key={emp.id} value={emp.id}>{emp.name}{emp.role === 'viewer' ? ' 👁️ مشاهد' : ''}</option>
                  )
                })}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-1 block">رمز المرور</label>
              <input
                type="password" value={loginPassword}
                onChange={e => { setLoginPassword(e.target.value); setLoginError('') }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="أدخل رمز المرور"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
              />
            </div>

            {loginError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-3 text-sm text-center">
                {loginError}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loginLoading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white font-bold py-3 rounded-xl transition shadow-lg text-sm"
            >
              {loginLoading ? '⏳ جاري الدخول...' : '🔐 تسجيل الدخول'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ==================== MODALS ====================
  const renderModals = () => (
    <>
      {/* Record Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white text-center">
              {recordModalData.id ? `تعديل حركة لـ (${recordModalData.empName})` : `إضافة حركة لـ (${recordModalData.empName})`}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">نوع الحركة</label>
                <select
                  value={recordModalData.type}
                  onChange={e => setRecordModalData(prev => ({ ...prev, type: e.target.value as 'withdrawal' | 'shortage' }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="withdrawal">💸 سحب</option>
                  {(() => {
                    const emp = employees.find(e => e.id === recordModalData.empId)
                    if (!emp) return true
                    try { return JSON.parse(emp.multiBranchIds || '[]').length === 0 } catch { return true }
                  })() && <option value="shortage">📉 عجز</option>}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">المبلغ (د.ل)</label>
                <input
                  type="number" value={recordModalData.amount}
                  onChange={e => setRecordModalData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">التاريخ</label>
                <input
                  type="date" value={recordModalData.date}
                  onChange={e => setRecordModalData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">ملاحظة</label>
                <input
                  type="text" value={recordModalData.note}
                  onChange={e => setRecordModalData(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  placeholder="ملاحظة (اختياري)"
                />
              </div>
              {(() => {
                const emp = employees.find(e => e.id === recordModalData.empId)
                if (!emp) return null
                try {
                  const ids: string[] = JSON.parse(emp.multiBranchIds || '[]')
                  if (ids.length === 0) return null
                  const allBranchIds = [emp.branchId, ...ids].filter(Boolean)
                  return (
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">📍 الفرع</label>
                      <select
                        value={recordModalData.branchId}
                        onChange={e => setRecordModalData(prev => ({ ...prev, branchId: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                      >
                        {allBranchIds.map(bId => {
                          const bName = branches.find(b => b.id === bId)?.name || 'فرع غير معروف'
                          return <option key={bId} value={bId}>{bName}</option>
                        })}
                      </select>
                    </div>
                  )
                } catch { return null }
              })()}
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveRecord} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl text-sm transition">💾 حفظ</button>
              <button onClick={() => setShowRecordModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm transition">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-bold text-white text-center">➕ إضافة فرع جديد</h3>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">اسم الفرع</label>
              <input
                type="text" value={newBranchName}
                onChange={e => setNewBranchName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                placeholder="اسم الفرع الجديد"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">عدد الغرف ({newBranchRooms})</label>
              <input type="range" min="1" max="6" value={newBranchRooms}
                onChange={e => setNewBranchRooms(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500"><span>1</span><span>6</span></div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">مكينة غسيل</label>
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-600 rounded-lg p-2.5">
                <button type="button"
                  onClick={() => setNewBranchHasMachine(!newBranchHasMachine)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${newBranchHasMachine ? 'bg-cyan-600' : 'bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 ${newBranchHasMachine ? 'left-0.5' : 'left-[22px]'} w-5 h-5 bg-white rounded-full transition-all`} />
                </button>
                <span className={`text-sm ${newBranchHasMachine ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {newBranchHasMachine ? '✅ نعم' : '❌ لا'}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">خصم الصافي (لكل سيارة)</label>
              <input type="number" min="0" max="20" value={newBranchNetDeduction}
                onChange={e => setNewBranchNetDeduction(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">مكينة بدون خصم (الإجمالي ÷ 2 بدون خصم إضافي)</label>
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-600 rounded-lg p-2.5">
                <button type="button"
                  onClick={() => setNewBranchMachineNoDeduction(!newBranchMachineNoDeduction)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${newBranchMachineNoDeduction ? 'bg-cyan-600' : 'bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 ${newBranchMachineNoDeduction ? 'left-0.5' : 'left-[22px]'} w-5 h-5 bg-white rounded-full transition-all`} />
                </button>
                <span className={`text-sm ${newBranchMachineNoDeduction ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {newBranchMachineNoDeduction ? '✅ نعم' : '❌ لا'}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">نوع النظافة</label>
              <select value={newBranchCleanType}
                onChange={e => setNewBranchCleanType(e.target.value as 'fixed' | 'select')}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="select">اختيار من قيم</option>
                <option value="fixed">قيمة ثابتة</option>
              </select>
            </div>
            {newBranchCleanType === 'fixed' ? (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">قيمة النظافة (د.ل)</label>
                <input type="number" min="0" value={newBranchCleanValue}
                  onChange={e => setNewBranchCleanValue(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">خيارات النظافة (مفصولة بفاصلة)</label>
                <input type="text" value={newBranchCleanOptions}
                  onChange={e => setNewBranchCleanOptions(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  placeholder="10,20,30"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleCreateBranch} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl text-sm transition">💾 حفظ</button>
              <button onClick={() => { setShowBranchModal(false); setNewBranchName(''); setNewBranchRooms(6); setNewBranchHasMachine(true); setNewBranchNetDeduction(0); setNewBranchMachineNoDeduction(false); setNewBranchCleanType('select'); setNewBranchCleanValue(20); setNewBranchCleanOptions('10,20') }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm transition">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Modal */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white text-center">👤 إضافة موظف جديد</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">الاسم</label>
                <input type="text" value={newEmp.name}
                  onChange={e => setNewEmp(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  placeholder="اسم الموظف"
                />
              </div>
              {newEmp.role !== 'viewer' && <>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">الفرع</label>
                <select value={newEmp.branchId}
                  onChange={e => setNewEmp(prev => ({ ...prev, branchId: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- اختر فرع --</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between bg-slate-900 border border-slate-600 rounded-lg p-2.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); e.preventDefault() }}>
                  <span className="text-xs text-slate-400">🌐 موظف مشترك (أكثر من فرع)</span>
                  <div
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (showMultiBranchPicker) { setShowMultiBranchPicker(false); setNewEmp(prev => ({ ...prev, multiBranchIds: [] as string[] })) } else { setShowMultiBranchPicker(true) } }}
                    className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer select-none ${showMultiBranchPicker ? 'bg-amber-500' : 'bg-slate-600'}`}
                  >
                    <div className={`absolute top-0.5 ${showMultiBranchPicker ? 'left-0.5' : 'left-[22px]'} w-5 h-5 bg-white rounded-full transition-all shadow`} />
                  </div>
                </div>
                {showMultiBranchPicker && (
                  <div className="mt-2 bg-slate-900 border border-amber-500/30 rounded-lg p-2.5 max-h-32 overflow-y-auto custom-scrollbar">
                    {branches.filter(b => b.id !== newEmp.branchId).map(b => (
                      <label key={b.id} className="flex items-center gap-2 text-white text-sm py-0.5 cursor-pointer hover:bg-slate-800 rounded px-1">
                        <input type="checkbox"
                          checked={newEmp.multiBranchIds.includes(b.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewEmp(prev => ({ ...prev, multiBranchIds: [...prev.multiBranchIds, b.id] }))
                            } else {
                              setNewEmp(prev => ({ ...prev, multiBranchIds: prev.multiBranchIds.filter(id => id !== b.id) }))
                            }
                          }}
                          className="rounded border-slate-500 bg-slate-700 text-amber-500 focus:ring-amber-500"
                        />
                        <span>{b.name}</span>
                      </label>
                    ))}
                    {branches.filter(b => b.id !== newEmp.branchId).length === 0 && (
                      <span className="text-slate-500 text-xs">اختر الفرع الأساسي أولاً</span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">الوردية</label>
                <select value={newEmp.shift}
                  onChange={e => setNewEmp(prev => ({ ...prev, shift: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="الفترة الصباحية">الفترة الصباحية</option>
                  <option value="الفترة المسائية">الفترة المسائية</option>
                  <option value="الفترة كاملة">الفترة كاملة</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">تاريخ المباشرة</label>
                  <input type="date" value={newEmp.startDate}
                    onChange={e => setNewEmp(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">تاريخ التوقف</label>
                  <input type="date" value={newEmp.endDate}
                    onChange={e => setNewEmp(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              </>}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">حساب دخول (يوزر + باسورد)</label>
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-600 rounded-lg p-2.5">
                  <button
                    type="button"
                    onClick={() => setNewEmp(prev => ({ ...prev, hasLogin: !prev.hasLogin }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${newEmp.hasLogin ? 'bg-cyan-600' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 ${newEmp.hasLogin ? 'left-0.5' : 'left-[22px]'} w-5 h-5 bg-white rounded-full transition-all`} />
                  </button>
                  <span className={`text-sm ${newEmp.hasLogin ? 'text-cyan-400' : 'text-slate-500'}`}>
                    {newEmp.hasLogin ? '✅ نعم، يملك حساب دخول' : '❌ لا، بدون يوزر دخول'}
                  </span>
                </div>
              </div>
              {newEmp.hasLogin && (
              <>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">الدور</label>
                  <select value={newEmp.role}
                    onChange={e => setNewEmp(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="employee">👤 موظف عادي</option>
                    <option value="viewer">👁️ مشاهد فقط</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">رمز المرور</label>
                  <input type="text" value={newEmp.password}
                    onChange={e => setNewEmp(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                    placeholder="رمز المرور"
                  />
                </div>
              </>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreateEmployee} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 rounded-xl text-sm transition">💾 حفظ</button>
              <button onClick={() => { setShowEmpModal(false); setNewEmp({ name: '', branchId: '', shift: 'الفترة الصباحية', password: '', role: 'employee', hasLogin: false }) }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm transition">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditEmpModal && editEmp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white text-center">✏️ تعديل الموظف</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">الاسم</label>
                <input type="text" value={editEmp.name}
                  onChange={e => setEditEmp(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  placeholder="اسم الموظف"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">الوردية</label>
                <select value={editEmp.shift}
                  onChange={e => setEditEmp(prev => ({ ...prev, shift: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="الفترة الصباحية">الفترة الصباحية</option>
                  <option value="الفترة المسائية">الفترة المسائية</option>
                  <option value="الفترة كاملة">الفترة كاملة</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">الفرع</label>
                <select value={editEmp.branchId || ''}
                  onChange={e => setEditEmp(prev => ({ ...prev, branchId: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- اختر فرع --</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">فروع إضافية <span className="text-[10px] text-amber-400">(اختياري - للموظفين اللي يخدموا في أكثر من فرع)</span></label>
                <div className="bg-slate-900 border border-slate-600 rounded-lg p-2.5 max-h-32 overflow-y-auto custom-scrollbar">
                  {(() => {
                    const existingIds: string[] = (() => { try { return JSON.parse(editEmp.multiBranchIds || '[]') } catch { return [] } })()
                    return branches.filter(b => b.id !== editEmp.branchId).map(b => (
                      <label key={b.id} className="flex items-center gap-2 text-white text-sm py-0.5 cursor-pointer hover:bg-slate-800 rounded px-1">
                        <input type="checkbox"
                          checked={existingIds.includes(b.id)}
                          onChange={e => {
                            const currentIds: string[] = (() => { try { return JSON.parse(editEmp.multiBranchIds || '[]') } catch { return [] } })()
                            if (e.target.checked) {
                              setEditEmp(prev => ({ ...prev, multiBranchIds: JSON.stringify([...currentIds, b.id]) }))
                            } else {
                              setEditEmp(prev => ({ ...prev, multiBranchIds: JSON.stringify(currentIds.filter(id => id !== b.id)) }))
                            }
                          }}
                          className="rounded border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                        />
                        <span>{b.name}</span>
                      </label>
                    ))
                  })()}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">تاريخ المباشرة {editEmp.startDate ? '' : <span className="text-emerald-400 text-[10px]">(مستمر)</span>}</label>
                  <input type="date" value={editEmp.startDate || ''}
                    onChange={e => setEditEmp(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">تاريخ التوقف</label>
                  <input type="date" value={editEmp.endDate || ''}
                    onChange={e => setEditEmp(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">حساب دخول (يوزر + باسورد)</label>
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-600 rounded-lg p-2.5">
                  <button
                    type="button"
                    onClick={() => setEditEmp(prev => ({ ...prev, hasLogin: !prev.hasLogin }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${editEmp.hasLogin ? 'bg-cyan-600' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 ${editEmp.hasLogin ? 'left-0.5' : 'left-[22px]'} w-5 h-5 bg-white rounded-full transition-all`} />
                  </button>
                  <span className={`text-sm ${editEmp.hasLogin ? 'text-cyan-400' : 'text-slate-500'}`}>
                    {editEmp.hasLogin ? '✅ نعم، يملك حساب دخول' : '❌ لا، بدون يوزر دخول'}
                  </span>
                </div>
              </div>
              {editEmp.hasLogin && (
              <>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">الدور</label>
                  <select value={editEmp.role}
                    onChange={e => setEditEmp(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="employee">👤 موظف عادي</option>
                    <option value="viewer">👁️ مشاهد فقط</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">رمز المرور</label>
                  <input type="text" value={editEmp.password || ''}
                    onChange={e => setEditEmp(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                    placeholder="اتركه فارغاً إذا لا تريد تغييره"
                  />
                </div>
              </>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveEditEmployee} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl text-sm transition">💾 حفظ التعديلات</button>
              <button onClick={() => { setShowEditEmpModal(false); setEditEmp(null) }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm transition">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Own Password Modal */}
      {showChangePwdModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">🔑 تغيير كلمة المرور</h3>
            <div className="space-y-3">
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-600">
                <p className="text-xs text-slate-400 mb-1">رمز المرور الحالي</p>
                <p className="text-2xl font-black text-amber-400 tracking-widest text-center">{user?.password || '—'}</p>
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">كلمة المرور الجديدة</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={empNewPwd}
                  onChange={e => setEmpNewPwd(e.target.value)}
                  placeholder="أدخل الرمز الجديد"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white text-lg font-bold text-center tracking-widest focus:outline-none focus:border-cyan-500"
                  maxLength={20}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleChangeOwnPassword() }}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleChangeOwnPassword} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl text-sm transition">💾 حفظ</button>
                <button onClick={() => setShowChangePwdModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm transition">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Passwords Modal */}
      {showPasswordsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-bold text-white text-center">🔑 تعديل كلمات المرور</h3>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">👨‍💼 المسؤول: طه علي</h4>
                <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded-full">الحساب الرئيسي</span>
              </div>
              <div className="flex gap-2">
                <input type="text" value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة"
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                />
                <button onClick={handleSaveAdminPassword} className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition">💾 حفظ</button>
              </div>
            </div>

            {branches.map(branch => {
              const branchEmps = employees.filter(e => e.branchId === branch.id && e.hasLogin && (() => { try { return JSON.parse(e.multiBranchIds || '[]').length === 0 } catch { return true } })())
              if (branchEmps.length === 0) return null
              return (
                <div key={branch.id} className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                  <h4 className="font-bold text-cyan-400 text-sm mb-3 flex items-center gap-2">📍 {branch.name}</h4>
                  <div className="space-y-3">
                    {branchEmps.map(emp => (
                      <div key={emp.id} className="bg-slate-800/80 border border-slate-700/40 rounded-lg p-3">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold text-sm">{emp.name}</span>
                            <span className="text-[11px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">{emp.shift}</span>
                          </div>
                          <div className="flex gap-2">
                            <input type="text" value={empPasswords[emp.id] || ''}
                              onChange={e => setEmpPasswords(prev => ({ ...prev, [emp.id]: e.target.value }))}
                              placeholder="كلمة المرور"
                              className="flex-1 sm:w-40 bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-teal-500"
                            />
                            <button onClick={() => handleSaveEmpPassword(emp.id)} className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-3 py-2 rounded-lg text-xs transition">💾</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            <button onClick={() => setShowPasswordsModal(false)} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm transition">إغلاق</button>
          </div>
        </div>
      )}

      {/* Daily Closing Modal */}
      {showClosingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-bold text-white text-center">🔒 الإغلاق اليومي - {formatDateShort(adminDate)}</h3>
            <div className="space-y-2">
              {(() => {
                let gw = 0, gs = 0
                branches.forEach(branch => {
                  const bEmps = employees.filter(e => e.branchId === branch.id)
                  bEmps.forEach(emp => {
                    const eRecs = records.filter(r => r.empId === emp.id && r.date === adminDate && r.branchId === branch.id)
                    gw += eRecs.filter(r => r.type === 'withdrawal').reduce((s, r) => s + r.amount, 0)
                    gs += eRecs.filter(r => r.type === 'shortage').reduce((s, r) => s + r.amount, 0)
                  })
                })
                return (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">إجمالي السحوبات:</span>
                      <span className="text-amber-400 font-bold">{gw} د.ل</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">إجمالي العجوزات:</span>
                      <span className="text-rose-400 font-bold">{gs} د.ل</span>
                    </div>
                  </>
                )
              })()}
            </div>

            <div className="space-y-2">
              {branches.map(branch => {
                const bEmps = employees.filter(e => e.branchId === branch.id)
                const isClosed = isDayClosedForBranch(adminDate, branch.id)
                let bw = 0, bs = 0
                const rows = bEmps.map(emp => {
                  const eRecs = records.filter(r => r.empId === emp.id && r.date === adminDate && r.branchId === branch.id)
                  if (eRecs.length === 0) return null
                  const w = eRecs.filter(r => r.type === 'withdrawal').reduce((s, r) => s + r.amount, 0)
                  const s2 = eRecs.filter(r => r.type === 'shortage').reduce((s, r) => s + r.amount, 0)
                  bw += w; bs += s2
                  return (
                    <div key={emp.id} className="flex justify-between items-center text-xs bg-slate-900/70 px-3 py-2 rounded-lg">
                      <span className="text-slate-200 font-semibold">{emp.name}</span>
                      <div className="flex gap-3">
                        <span className="text-amber-400">سحب: {w} د.ل</span>
                        <span className="text-rose-400">عجز: {s2} د.ل</span>
                      </div>
                    </div>
                  )
                })
                if (rows.every(r => r === null)) return null
                return (
                  <div key={branch.id} className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-cyan-400">{branch.name} <span className={`text-xs px-2 py-0.5 rounded-full ${isClosed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{isClosed ? 'مقفل ✓' : 'مفتوح'}</span></h4>
                      <div className="flex gap-2 text-xs">
                        <span className="text-amber-400">سحب: {bw}</span>
                        <span className="text-rose-400">عجز: {bs}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">{rows}</div>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-700">
              <button onClick={handleToggleDayClosing} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 rounded-xl text-sm">
                {isDayClosed(adminDate) ? 'إعادة فتح الكل' : 'إغلاق جميع الفروع'}
              </button>
              <button onClick={() => setShowClosingModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Report Modal */}
      {showEmpReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white text-center">📄 تقرير مصاريف الموظفين</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">نوع الفترة</label>
                <select
                  value={empReportRange}
                  onChange={e => setEmpReportRange(e.target.value as 'month' | 'day' | 'range')}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="month">شهر كامل</option>
                  <option value="day">يوم واحد</option>
                  <option value="range">فترة مخصصة</option>
                </select>
              </div>

              {empReportRange === 'month' && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">اختر الشهر</label>
                  <input type="month" value={empReportMonth}
                    onChange={e => setEmpReportMonth(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {empReportRange === 'day' && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">اختر اليوم</label>
                  <input type="date" value={empReportDay}
                    onChange={e => setEmpReportDay(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {empReportRange === 'range' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">من تاريخ</label>
                    <input type="date" value={empReportFrom}
                      onChange={e => setEmpReportFrom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">إلى تاريخ</label>
                    <input type="date" value={empReportTo}
                      onChange={e => setEmpReportTo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={handleQuickEmployeeReport} disabled={exporting} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm transition">
                {exporting ? '⏳ جاري التصدير...' : '📄 تصدير'}
              </button>
              <button onClick={() => setShowEmpReportModal(false)} disabled={exporting} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm transition">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Expenses Report Modal */}
      {showExpReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white text-center">📋 تقرير مصروفات الفروع</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">اختر الفرع</label>
                <select
                  value={expReportBranchId}
                  onChange={e => setExpReportBranchId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- اختر الفرع --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">نوع الفترة</label>
                <select
                  value={expReportPeriod}
                  onChange={e => setExpReportPeriod(e.target.value as 'day' | 'range' | 'month')}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="day">يوم واحد</option>
                  <option value="range">فترة مخصصة</option>
                  <option value="month">شهر كامل</option>
                </select>
              </div>

              {expReportPeriod === 'day' && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">اختر اليوم</label>
                  <input type="date" value={expReportDay}
                    onChange={e => setExpReportDay(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {expReportPeriod === 'range' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">من تاريخ</label>
                    <input type="date" value={expReportFrom}
                      onChange={e => setExpReportFrom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">إلى تاريخ</label>
                    <input type="date" value={expReportTo}
                      onChange={e => setExpReportTo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {expReportPeriod === 'month' && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">اختر الشهر</label>
                  <input type="month" value={expReportMonth}
                    onChange={e => setExpReportMonth(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={handleExportExpensesPDF} disabled={exporting || !expReportBranchId} className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2.5 rounded-xl text-sm transition">
                {exporting ? '⏳ جاري التصدير...' : '📋 تصدير PDF'}
              </button>
              <button onClick={() => setShowExpReportModal(false)} disabled={exporting} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm transition">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Export PDF Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white text-center">📄 تصدير تقارير PDF</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">نوع الفترة</label>
                <select
                  value={exportRangeType}
                  onChange={e => setExportRangeType(e.target.value as 'month' | 'day' | 'range')}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="month">شهر كامل</option>
                  <option value="day">يوم واحد</option>
                  <option value="range">فترة مخصصة</option>
                </select>
              </div>

              {exportRangeType === 'month' && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">اختر الشهر</label>
                  <input type="month" value={exportMonth}
                    onChange={e => setExportMonth(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {exportRangeType === 'day' && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">اختر اليوم</label>
                  <input type="date" value={exportDay}
                    onChange={e => setExportDay(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {exportRangeType === 'range' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">من تاريخ</label>
                    <input type="date" value={exportFrom}
                      onChange={e => setExportFrom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">إلى تاريخ</label>
                    <input type="date" value={exportTo}
                      onChange={e => setExportTo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={handleExportPDF} disabled={exporting} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm transition">
                {exporting ? '⏳ جاري التصدير...' : '📄 تصدير'}
              </button>
              <button onClick={() => setShowExportModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm transition">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  // ==================== MAIN RENDER ====================
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100" style={{ fontFamily: 'Cairo, sans-serif' }} onClick={() => { if (showAdminDropdown) setShowAdminDropdown(false) }}>
      <div ref={pdfAreaRef} id="pdfReportArea" style={{ position: 'fixed', top: '0', left: '-99999px', width: '800px', zIndex: -1 }} />
      {renderModals()}
      {screen === 'login' && renderLoginScreen()}
      {screen === 'employee' && renderEmployeeScreen()}
      {screen === 'admin' && renderAdminScreen()}
    </div>
  )
}
// trigger rebuild
