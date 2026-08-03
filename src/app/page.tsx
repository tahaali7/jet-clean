'use client'

import { useState, useEffect, useRef } from 'react'

// ==================== TYPES ====================
interface User {
  id: string
  name: string
  role: 'admin' | 'employee'
  branchId?: string
  shift?: string
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
const BRANCH_ROOMS: Record<string, string[]> = {
  'ابونواس': ['غرفة 1', 'غرفة 2', 'غرفة 3', 'غرفة 4', 'غرفة 5', 'مكينة الغسيل'],
  'المنصور': ['غرفة 1', 'غرفة 2', 'غرفة 3']
}
const BRANCH_NET_DEDUCTION: Record<string, number> = {
  'بن غرسه': 10, 'ابونواس': 5, 'المنصور': 0, 'عين زاره': 0
}
const MACHINE_NO_DEDUCTION_BRANCHES = ['بن غرسه', 'ابونواس']
const BRANCH_CLEANLINESS: Record<string, { type: string; value?: number; options?: number[] }> = {
  'بن غرسه': { type: 'fixed', value: 100 },
  'ابونواس': { type: 'fixed', value: 50 },
  'المنصور': { type: 'select', options: [10, 20] },
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
function buildRoomTableHTML(room: string, roomEntries: CarEntry[], branchName: string) {
  const prices = getPricesForRoom(room)
  let roomTotalAmount = 0
  let roomTotalCars = 0
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
  })

  const roomNet = getNetAmount(roomTotalAmount, branchName, room)
  const cellPad = 'padding:5px 4px;vertical-align:middle;'
  const cellFs = 'font-size:10px;'

  // Build rows - only non-empty
  let rowsHtml = ''
  let rowNum = 0
  prices.forEach(price => {
    const count = mergedCounts[price] || 0
    if (count === 0) return
    rowNum++
    const isExtra = EXTRA_PRICES.includes(price)
    const displayPrice = isExtra ? (price - 5) : price
    const rowAmount = displayPrice * count
    rowsHtml += '<tr>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">' + rowNum + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">' + displayPrice + ' د.ل</td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:11px;font-weight:bold;">' + count + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">' + rowAmount + ' د.ل</td>' +
      '</tr>'
  })

  // Custom price rows
  const customKeys = Object.keys(mergedCustoms)
  customKeys.forEach(key => {
    const item = mergedCustoms[key]
    rowNum++
    rowsHtml += '<tr>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'color:#7c3aed;">✦</td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'color:#7c3aed;">' + item.price + ' د.ل</td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:11px;font-weight:bold;">' + item.count + '</td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">' + (item.price * item.count) + ' د.ل</td>' +
      '</tr>'
  })

  return '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;">' +
    '<tr><td colspan="4" style="border:1px solid #333;padding:5px 4px;text-align:center;font-size:12px;font-weight:bold;background:#e8e8e8;vertical-align:middle;">' + room + '</td></tr>' +
    '<tr style="background:#f0f0f0;">' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">م</td>' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">السعر</td>' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">العدد</td>' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">الإجمالي</td>' +
    '</tr>' +
    rowsHtml +
    '<tr style="background:#f0f0f0;">' +
    '<td colspan="2" style="' + cellPad + 'border:1px solid #333;font-size:10px;font-weight:bold;text-align:center;">إجمالي الغرفة</td>' +
    '<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:11px;font-weight:bold;">' + roomTotalCars + ' سيارة = ' + roomTotalAmount + ' د.ل</td>' +
    '</tr>' +
    '<tr>' +
    '<td colspan="2" style="' + cellPad + 'border:1px solid #333;font-size:10px;color:#555;text-align:center;">الصافي</td>' +
    '<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:11px;font-weight:bold;">' + roomNet + ' د.ل</td>' +
    '</tr>' +
    '</table>'
}

function buildEmptyRoomTableHTML(room: string) {
  const prices = getPricesForRoom(room)
  const cellPad = 'padding:5px 4px;vertical-align:middle;'
  const cellFs = 'font-size:10px;'
  let rowsHtml = ''
  prices.forEach(() => {
    rowsHtml += '<tr>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '"></td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '"></td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:11px;"></td>' +
      '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '"></td>' +
      '</tr>'
  })
  return '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;">' +
    '<tr><td colspan="4" style="border:1px solid #333;padding:5px 4px;text-align:center;font-size:12px;font-weight:bold;background:#e8e8e8;vertical-align:middle;">' + room + '</td></tr>' +
    '<tr style="background:#f0f0f0;">' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">م</td>' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">السعر</td>' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">العدد</td>' +
    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">الإجمالي</td>' +
    '</tr>' +
    rowsHtml +
    '<tr style="background:#f0f0f0;">' +
    '<td colspan="2" style="' + cellPad + 'border:1px solid #333;font-size:10px;font-weight:bold;text-align:center;">إجمالي الغرفة</td>' +
    '<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:11px;font-weight:bold;"></td>' +
    '</tr>' +
    '<tr>' +
    '<td colspan="2" style="' + cellPad + 'border:1px solid #333;font-size:10px;color:#555;text-align:center;">الصافي</td>' +
    '<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:11px;font-weight:bold;"></td>' +
    '</tr>' +
    '</table>'
}

function buildCarReportHTML(selectedDate: string, branchId: string, branchName: string, entries: CarEntry[]) {
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

  // Page 1: Room tables
  let tablesHtml = ''
  branchRooms.forEach(room => {
    const roomEntries = roomMap[room] || []
    if (roomEntries.length > 0) {
      tablesHtml += buildRoomTableHTML(room, roomEntries, branchName)
      const roomTotal = roomEntries.reduce((s, e) => s + e.totalAmount, 0)
      const roomCars = roomEntries.reduce((s, e) => s + e.totalCars, 0)
      grandTotalAmount += roomTotal
      grandTotalCars += roomCars
      grandTotalNet += getNetAmount(roomTotal, branchName, room)
    } else {
      tablesHtml += buildEmptyRoomTableHTML(room)
    }
  })

  const page1 = '<div style="width:780px;background:#fff;color:#000;padding:20px;font-family:Cairo,sans-serif;" dir="rtl">' +
    '<div style="text-align:center;margin-bottom:15px;">' +
    '<h1 style="font-size:18px;margin:0;color:#333;">مغسلة جيت كلين - ' + branchName + '</h1>' +
    '<p style="font-size:12px;color:#666;margin:4px 0 0 0;">التاريخ: ' + formatDateShort(selectedDate) + '</p>' +
    '</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">' +
    tablesHtml +
    '</div>' +
    '<div style="margin-top:10px;display:flex;justify-content:space-around;background:#f5f5f5;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:11px;">' +
    '<div><strong>السيارات:</strong> ' + grandTotalCars + '</div>' +
    '<div><strong>المبيعات:</strong> ' + grandTotalAmount + ' د.ل</div>' +
    '<div><strong>الصافي:</strong> ' + grandTotalNet + ' د.ل</div>' +
    '</div>' +
    '</div>'

  // Page 2: Worker expenses + Treasury (placeholder data)
  const page2 = '<div style="width:780px;background:#fff;color:#000;padding:20px;font-family:Cairo,sans-serif;" dir="rtl">' +
    '<div style="text-align:center;margin-bottom:15px;">' +
    '<h1 style="font-size:18px;margin:0;color:#333;">مغسلة جيت كلين - ' + branchName + '</h1>' +
    '<p style="font-size:12px;color:#666;margin:4px 0 0 0;">التاريخ: ' + formatDateShort(selectedDate) + '</p>' +
    '</div>' +
    '<div style="margin-bottom:15px;">' +
    '<h3 style="font-size:14px;margin-bottom:8px;color:#333;">🧹 مصاريف العمال</h3>' +
    '<table style="width:100%;border-collapse:collapse;">' +
    '<tr><td style="border:1px solid #333;padding:8px;text-align:center;font-weight:bold;background:#f0f0f0;">البيان</td><td style="border:1px solid #333;padding:8px;text-align:center;font-weight:bold;background:#f0f0f0;">المبلغ (د.ل)</td></tr>' +
    '<tr><td style="border:1px solid #333;padding:8px;text-align:center;">النظافة</td><td style="border:1px solid #333;padding:8px;text-align:center;">-</td></tr>' +
    '</table>' +
    '</div>' +
    '<div>' +
    '<h3 style="font-size:14px;margin-bottom:8px;color:#333;">🏦 الخزينة</h3>' +
    '<table style="width:100%;border-collapse:collapse;">' +
    '<tr><td style="border:1px solid #333;padding:8px;text-align:center;font-weight:bold;background:#f0f0f0;">البيان</td><td style="border:1px solid #333;padding:8px;text-align:center;font-weight:bold;background:#f0f0f0;">المبلغ (د.ل)</td></tr>' +
    '<tr><td style="border:1px solid #333;padding:8px;text-align:center;">الإجمالي</td><td style="border:1px solid #333;padding:8px;text-align:center;">-</td></tr>' +
    '<tr><td style="border:1px solid #333;padding:8px;text-align:center;">نقدي</td><td style="border:1px solid #333;padding:8px;text-align:center;">-</td></tr>' +
    '<tr><td style="border:1px solid #333;padding:8px;text-align:center;">آجل</td><td style="border:1px solid #333;padding:8px;text-align:center;">-</td></tr>' +
    '</table>' +
    '</div>' +
    '</div>'

  return { page1, page2 }
}

// ==================== EMPLOYEE REPORT (WITHDRAWALS/SHORTAGES) ====================
function buildEmployeeReportHTML(
  periodLabel: string,
  allEmployees: Employee[],
  allRecords: FinancialRecord[],
  allBranches: Branch[],
  matchRecord: (r: FinancialRecord) => boolean
): string {
  const now = new Date()
  const generatedOn = now.toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' })

  let grandWithdrawals = 0
  let grandShortages = 0
  let branchesHtml = ''

  allBranches.forEach(branch => {
    const branchEmps = allEmployees.filter(e => e.branchId === branch.id)
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
      branchWithdrawals += withdrawals
      branchShortages += shortages
      grandWithdrawals += withdrawals
      grandShortages += shortages
      if (empRecords.length > 0) branchHasRecords = true

      const notes = empRecords.map(r =>
        formatDateShort(r.date) + ' — ' + (r.type === 'withdrawal' ? 'سحب' : 'عجز') + ': ' + r.amount + ' د.ل' + (r.note ? ' (' + r.note + ')' : '')
      ).join(' | ') || '—'

      rowsHtml += '<tr>' +
        '<td style="padding:8px;border:1px solid #ddd;">' + emp.name + '</td>' +
        '<td style="padding:8px;border:1px solid #ddd;">' + emp.shift + '</td>' +
        '<td style="padding:8px;border:1px solid #ddd;color:#b45309;font-weight:bold;">' + withdrawals + ' د.ل</td>' +
        '<td style="padding:8px;border:1px solid #ddd;color:#be123c;font-weight:bold;">' + shortages + ' د.ل</td>' +
        '<td style="padding:8px;border:1px solid #ddd;font-size:11px;color:#555;">' + notes + '</td>' +
        '</tr>'
    })

    if (!branchHasRecords) return

    branchesHtml += '<div style="margin-bottom:24px;">' +
      '<h3 style="background:#0e7490;color:#fff;padding:8px 12px;border-radius:6px;font-size:15px;margin-bottom:8px;">' +
      '📍 فرع: ' + branch.name + ' — إجمالي السحبيات: ' + branchWithdrawals + ' د.ل | إجمالي العجوزات: ' + branchShortages + ' د.ل' +
      '</h3>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
      '<thead><tr style="background:#f1f5f9;">' +
      '<th style="padding:8px;border:1px solid #ddd;">الموظف</th>' +
      '<th style="padding:8px;border:1px solid #ddd;">الفترة</th>' +
      '<th style="padding:8px;border:1px solid #ddd;">السحبيات</th>' +
      '<th style="padding:8px;border:1px solid #ddd;">العجوزات</th>' +
      '<th style="padding:8px;border:1px solid #ddd;">تفاصيل الحركات</th>' +
      '</tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody>' +
      '</table></div>'
  })

  return '<div style="width:800px;background:#fff;color:#1e293b;padding:32px;font-family:Cairo,sans-serif;">' +
    '<div style="text-align:center;margin-bottom:24px;border-bottom:3px solid #0e7490;padding-bottom:16px;">' +
    '<h1 style="font-size:24px;font-weight:800;color:#0e7490;margin:0;">💧 مغسلة جيت كلين</h1>' +
    '<p style="font-size:16px;font-weight:700;margin:6px 0 0;">تقرير سحوبات وعجوزات الموظفين</p>' +
    '<p style="font-size:13px;color:#64748b;margin:4px 0 0;">' + periodLabel + ' — تاريخ الإصدار: ' + generatedOn + '</p>' +
    '</div>' +
    '<div style="display:flex;gap:16px;margin-bottom:24px;">' +
    '<div style="flex:1;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;text-align:center;">' +
    '<p style="font-size:12px;color:#92400e;margin:0;">إجمالي السحبيات</p>' +
    '<p style="font-size:20px;font-weight:800;color:#b45309;margin:4px 0 0;">' + grandWithdrawals + ' د.ل</p>' +
    '</div>' +
    '<div style="flex:1;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;padding:12px;text-align:center;">' +
    '<p style="font-size:12px;color:#9f1239;margin:0;">إجمالي العجوزات</p>' +
    '<p style="font-size:20px;font-weight:800;color:#be123c;margin:4px 0 0;">' + grandShortages + ' د.ل</p>' +
    '</div>' +
    '</div>' +
    (branchesHtml || '<p style="text-align:center;color:#94a3b8;">لا توجد بيانات لعرضها لهذه الفترة</p>') +
    '<div style="text-align:center;margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;">' +
    'تم إنشاء هذا التقرير آلياً بواسطة نظام جيت كلين لإدارة الفروع' +
    '</div></div>'
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
  const [selectedRoom, setSelectedRoom] = useState('')
  const [priceInputs, setPriceInputs] = useState<Record<number, number>>({})
  const [customPricesData, setCustomPricesData] = useState<Record<string, { price: number; count: number }>>({})
  const [customPriceInput, setCustomPriceInput] = useState('')
  const [customCountInput, setCustomCountInput] = useState('')
  const [saving, setSaving] = useState(false)

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
  const [showEmpModal, setShowEmpModal] = useState(false)
  const [newEmp, setNewEmp] = useState({ name: '', branchId: '', shift: 'الفترة الصباحية', password: '' })
  const [showPasswordsModal, setShowPasswordsModal] = useState(false)
  const [empPasswords, setEmpPasswords] = useState<Record<string, string>>({})
  const [adminPassword, setAdminPassword] = useState('')
  const [showClosingModal, setShowClosingModal] = useState(false)

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportRangeType, setExportRangeType] = useState<'month' | 'day' | 'range'>('month')
  const [exportMonth, setExportMonth] = useState('')
  const [exportDay, setExportDay] = useState('')
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportingEmp, setExportingEmp] = useState(false)

  // Worker expenses state
  const [cleanlinessAmount, setCleanlinessAmount] = useState(0)

  const pdfAreaRef = useRef<HTMLDivElement>(null)

  // ==================== DATA FETCHING ====================
  const loadBranches = async () => {
    try {
      const res = await fetch('/api/branches')
      if (res.ok) setBranches(await res.json())
    } catch (e) { console.error(e) }
  }

  const loadEmployees = async () => {
    try {
      const res = await fetch('/api/employees')
      if (res.ok) setEmployees(await res.json())
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

  const loadRecords = async (params?: { empId?: string; date?: string; branchId?: string }) => {
    try {
      const searchParams = new URLSearchParams()
      if (params?.empId) searchParams.set('empId', params.empId)
      if (params?.date) searchParams.set('date', params.date)
      if (params?.branchId) searchParams.set('branchId', params.branchId)
      const res = await fetch(`/api/records?${searchParams}`)
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
      if (res.ok) setWorkerExpenses(await res.json())
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

      if (data.user.role === 'admin') {
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
    setScreen('employee')
  }

  const switchToAdminManagement = () => {
    setScreen('admin')
  }

  const handleLogout = () => {
    if (!confirm('هل تريد تسجيل الخروج؟')) return
    setUser(null)
    setIsAdminMode(false)
    setAdminSelectedBranch(null)
    setScreen('login')
  }

  // ==================== EFFECTS ====================
  useEffect(() => {
    void loadEmployees()
  }, [])

  useEffect(() => {
    void loadBranches()
  }, [])

  // Employee screen data fetching
  useEffect(() => {
    if (screen === 'employee' && empDate) {
      if (isAdminMode && adminSelectedBranch) {
        void loadCarEntries(empDate, adminSelectedBranch)
        void loadWorkerExpenses(empDate, adminSelectedBranch)
        void loadTreasuries(empDate, adminSelectedBranch)
      } else if (!isAdminMode && user?.role === 'employee' && user.branchId) {
        void loadCarEntries(empDate, user.branchId)
      }
      void loadClosedDays(empDate)
    }
  }, [screen, empDate, isAdminMode, adminSelectedBranch, user])

  // Admin screen data fetching
  useEffect(() => {
    if (screen === 'admin') {
      void loadBranches()
      void loadEmployees()
      if (adminDate) {
        void loadRecords({ date: adminDate })
        void loadAllCarEntries(adminDate)
        void loadClosedDays(adminDate)
      }
    }
  }, [screen, adminDate])

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
    if (!selectedRoom) return alert('الرجاء اختيار الغرفة')
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
            totalCars, totalAmount, extraCars, extraAmount, priceCounts, customPrices: customPricesSaved
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
      await loadRecords({ date: recordModalData.date })
    } catch (e) { alert('حدث خطأ أثناء الحفظ') }
  }

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('هل تريد حذف هذه الحركة؟')) return
    try {
      await fetch(`/api/records?id=${id}`, { method: 'DELETE' })
      await loadRecords({ date: adminDate })
    } catch (e) { alert('حدث خطأ أثناء الحذف') }
  }

  // ==================== BRANCH & EMPLOYEE MANAGEMENT ====================
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return alert('الرجاء كتابة اسم الفرع')
    try {
      const res = await fetch('/api/branches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBranchName.trim() })
      })
      if (res.ok) {
        setShowBranchModal(false)
        setNewBranchName('')
        await loadBranches()
      } else {
        const data = await res.json()
        alert(data.error || 'حدث خطأ')
      }
    } catch (e) { alert('حدث خطأ') }
  }

  const handleDeleteBranch = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف الفرع؟')) return
    try {
      await fetch(`/api/branches?id=${id}`, { method: 'DELETE' })
      await loadBranches()
      await loadEmployees()
    } catch (e) { alert('حدث خطأ') }
  }

  const handleCreateEmployee = async () => {
    if (!newEmp.name.trim()) return alert('الرجاء كتابة اسم الموظف')
    if (!newEmp.branchId) return alert('الرجاء اختيار الفرع')
    if (!newEmp.password.trim()) return alert('الرجاء إدخال رمز المرور')
    try {
      const res = await fetch('/api/employees', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmp)
      })
      if (res.ok) {
        setShowEmpModal(false)
        setNewEmp({ name: '', branchId: '', shift: 'الفترة الصباحية', password: '' })
        await loadEmployees()
        await loadBranches()
      } else { alert('حدث خطأ') }
    } catch (e) { alert('حدث خطأ') }
  }

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف الموظف؟')) return
    try {
      await fetch(`/api/employees?id=${id}`, { method: 'DELETE' })
      await loadEmployees()
      await loadBranches()
    } catch (e) { alert('حدث خطأ') }
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

      // Load html2canvas and jsPDF dynamically
      const html2canvasModule = await import('html2canvas')
      const html2canvas = html2canvasModule.default
      const jspdfModule = await import('jspdf')
      const jsPDF = jspdfModule.default

      const reportArea = pdfAreaRef.current
      if (!reportArea) { setExporting(false); return alert('خطأ في عنصر التقرير') }

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
          const noDataHtml = '<div style="width:780px;background:#fff;color:#000;padding:40px;font-family:Cairo,sans-serif;text-align:center;" dir="rtl">' +
            '<h1 style="font-size:18px;margin:0;color:#333;">مغسلة جيت كلين</h1>' +
            '<p style="font-size:12px;color:#666;margin:4px 0 0 0;">التاريخ: ' + formatDateShort(date) + '</p>' +
            '<h2 style="font-size:20px;color:#999;margin-top:60px;">لا توجد بيانات في ' + formatDateShort(date) + '</h2>' +
            '</div>'

          reportArea.innerHTML = noDataHtml
          reportArea.style.position = 'fixed'
          reportArea.style.top = '0'
          reportArea.style.left = '-99999px'
          reportArea.style.width = '800px'

          await new Promise(r => setTimeout(r, 200))
          const canvas = await html2canvas(reportArea, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
          const imgHeight = (canvas.height * pageWidth) / canvas.width

          reportArea.style.position = ''
          reportArea.style.top = ''
          reportArea.style.left = ''
          reportArea.style.width = ''
          reportArea.innerHTML = ''

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

          const pages = buildCarReportHTML(date, bid, bName, bEntries)

          // Render Page 1
          reportArea.innerHTML = pages.page1
          reportArea.style.position = 'fixed'
          reportArea.style.top = '0'
          reportArea.style.left = '-99999px'
          reportArea.style.width = '800px'

          await new Promise(r => setTimeout(r, 200))
          const canvas1 = await html2canvas(reportArea, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
          const imgHeight1 = (canvas1.height * pageWidth) / canvas1.width

          reportArea.style.position = ''
          reportArea.style.top = ''
          reportArea.style.left = ''
          reportArea.style.width = ''

          // Render Page 2
          reportArea.innerHTML = pages.page2
          reportArea.style.position = 'fixed'
          reportArea.style.top = '0'
          reportArea.style.left = '-99999px'
          reportArea.style.width = '800px'

          await new Promise(r => setTimeout(r, 200))
          const canvas2 = await html2canvas(reportArea, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
          const imgHeight2 = (canvas2.height * pageWidth) / canvas2.width

          reportArea.style.position = ''
          reportArea.style.top = ''
          reportArea.style.left = ''
          reportArea.style.width = ''
          reportArea.innerHTML = ''

          if (!firstPage) pdf.addPage()
          firstPage = false
          pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imgHeight1)
          pdf.addPage()
          pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imgHeight2)
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
    } catch (err) {
      console.error(err)
      alert('حدث خطأ أثناء التصدير')
    }
    setExporting(false)
  }

  // ==================== EMPLOYEE PDF EXPORT (WITHDRAWALS/SHORTAGES) ====================
  const handleExportEmployeePDF = async () => {
    setExportingEmp(true)
    try {
      // Load html2canvas and jsPDF dynamically
      const html2canvasModule = await import('html2canvas')
      const html2canvas = html2canvasModule.default
      const jspdfModule = await import('jspdf')
      const jsPDF = jspdfModule.default

      // Determine dates - default to admin date if no export range set
      let dates: string[] = []
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

      // Default to admin date if no range was set
      if (dates.length === 0) {
        dates.push(adminDate)
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
        periodLabel = formatDateShort(adminDate)
      }

      // Filter records to only those within the date range
      const filteredRecords = allRecordsData.filter(r => dates.includes(r.date))

      if (filteredRecords.length === 0) {
        alert('لا توجد سحوبات أو عجوزات في الفترة المحددة')
        setExportingEmp(false)
        return
      }

      // Build the report HTML
      const reportHtml = buildEmployeeReportHTML(
        periodLabel,
        employees,
        filteredRecords,
        branches,
        (r: FinancialRecord) => dates.includes(r.date)
      )

      const reportArea = pdfAreaRef.current
      if (!reportArea) { setExportingEmp(false); return alert('خطأ في عنصر التقرير') }

      // Render HTML off-screen
      reportArea.innerHTML = reportHtml
      reportArea.style.position = 'fixed'
      reportArea.style.top = '0'
      reportArea.style.left = '-99999px'
      reportArea.style.width = '800px'
      reportArea.style.zIndex = '-1'

      await new Promise(r => setTimeout(r, 300))

      // Capture with html2canvas
      const canvas = await html2canvas(reportArea, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      })

      // Clean up
      reportArea.style.position = ''
      reportArea.style.top = ''
      reportArea.style.left = ''
      reportArea.style.width = ''
      reportArea.style.zIndex = ''
      reportArea.innerHTML = ''

      // Create PDF - handle multiple pages if content is tall
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * pageWidth) / canvas.width

      if (imgHeight <= pageHeight) {
        // Single page
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight)
      } else {
        // Multiple pages - split the canvas
        let remainingHeight = imgHeight
        let yOffset = 0
        let page = 0

        while (remainingHeight > 0) {
          if (page > 0) pdf.addPage()

          const sourceY = (yOffset / imgHeight) * canvas.height
          const sourceHeight = Math.min((pageHeight / imgHeight) * canvas.height, canvas.height - sourceY)

          const pageCanvas = document.createElement('canvas')
          pageCanvas.width = canvas.width
          pageCanvas.height = sourceHeight
          const ctx = pageCanvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight)
          }

          const pageImgHeight = (pageCanvas.height * pageWidth) / pageCanvas.width
          pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageImgHeight)

          yOffset += pageHeight
          remainingHeight -= pageHeight
          page++
        }
      }

      pdf.save('تقرير_سحوبات_وعجوزات_الموظفين.pdf')
      setShowExportModal(false)
      alert('تم تصدير تقرير السحوبات والعجوزات بنجاح!')
    } catch (err) {
      console.error(err)
      alert('حدث خطأ أثناء تصدير تقرير الموظفين')
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

    const canEdit = isAdminMode || (!isAdminMode && entry.empId === user?.id)
    const dayClosed = isDayClosed(entry.date)

    return (
      <div key={entry.id} className={`room-card bg-slate-800 border ${borderColor} rounded-2xl p-5 shadow-lg`}>
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
          <h3 className={`text-lg font-bold ${labelColor} flex items-center gap-2`}>
            {ROOM_ICONS[room] || '🏠'} {room} <span className="text-xs text-slate-400 font-normal">({entryLabel})</span>
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 bg-slate-700 px-2.5 py-1 rounded-full">{entry.totalCars} سيارة</span>
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

  // ==================== EMPLOYEE SCREEN ====================
  const renderEmployeeScreen = () => {
    const currentBranch = isAdminMode
      ? (adminSelectedBranch ? branches.find(b => b.id === adminSelectedBranch) : null)
      : getEmployeeBranch()
    const branchName = currentBranch?.name || ''
    const branchId = currentBranch?.id || ''
    const availableRooms = branchName ? getRoomsForBranch(branchName) : []

    let displayEntries: CarEntry[] = []
    if (isAdminMode) {
      if (adminSelectedBranch && empDate) {
        const adminEmpId = 'admin_' + adminSelectedBranch
        displayEntries = carEntries.filter(e =>
          (e.branchId === adminSelectedBranch || e.empId === adminEmpId) && e.date === empDate
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
      : `مرحباً ${user?.name} | ${branchName} | ${user?.shift}`

    return (
      <div className="min-h-screen bg-slate-900">
        <header className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🚗</div>
              <div>
                <h1 className="text-base font-bold text-cyan-400">مغسلة جيت كلين</h1>
                <p className="text-xs text-slate-400" id="empInfo">{empInfoText}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdminMode && (
                <button onClick={switchToAdminManagement} className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-600 transition">
                  ⚙️ الإدارة
                </button>
              )}
              <button onClick={handleLogout} className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-xl border border-rose-500/30 transition">
                🚪 خروج
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 pb-24 space-y-4">
          {isAdminMode && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <label className="text-xs text-slate-400 mb-1 block">اختر الفرع</label>
              <select
                value={adminSelectedBranch || ''}
                onChange={e => { setAdminSelectedBranch(e.target.value || null); setSelectedRoom('') }}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- اختر فرع --</option>
                {branches.map(b => <option key={b.id} value={b.id}>📍 {b.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="date" value={empDate}
              onChange={e => setEmpDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 flex-1"
            />
          </div>

          {(branchId || (isAdminMode && adminSelectedBranch)) && availableRooms.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-300 font-semibold whitespace-nowrap">الغرفة:</label>
                <select
                  value={selectedRoom}
                  onChange={e => setSelectedRoom(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- اختر غرفة --</option>
                  {availableRooms.map(room => (
                    <option key={room} value={room}>{ROOM_ICONS[room] || '🏠'} {room}</option>
                  ))}
                </select>
              </div>

              {selectedRoom && (
                <>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {ROOM_ICONS[selectedRoom] || '🏠'} {selectedRoom}
                  </h3>
                  {renderPriceGrid()}
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveCarEntry}
                      disabled={saving}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold py-3 rounded-xl transition shadow-lg text-sm"
                    >
                      {saving ? '⏳ جاري الحفظ...' : '💾 حفظ التسجيل'}
                    </button>
                  </div>
                </>
              )}
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

          <div className="grid grid-cols-1 gap-4">
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
        </main>
      </div>
    )
  }

  // ==================== ADMIN MANAGEMENT SCREEN ====================
  const renderAdminScreen = () => {
    const dayClosed = isDayClosed(adminDate)
    let grandWithdrawals = 0
    let grandShortages = 0

    return (
      <div className="min-h-screen bg-slate-900">
        <header className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50 px-4 py-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🚗</div>
              <div>
                <h1 className="text-base font-bold text-cyan-400">مغسلة جيت كلين - لوحة التحكم</h1>
                <p className="text-xs text-slate-400">مرحباً المسؤول طه علي 👨‍💼</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={switchToCarEntry} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl transition shadow-lg text-sm flex items-center gap-2">
                🚗 تسجيل السيارات
              </button>
              <button onClick={() => setShowExportModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl transition shadow-lg text-sm flex items-center gap-2">
                📄 تصدير تقارير PDF
              </button>
              <button onClick={() => setShowBranchModal(true)} className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-xl transition shadow-lg text-sm flex items-center gap-2">
                ➕ إضافة فرع
              </button>
              <button onClick={() => { setShowEmpModal(true) }} className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2 rounded-xl transition shadow-lg text-sm flex items-center gap-2">
                👤 إضافة موظف
              </button>
              <button onClick={() => { setShowPasswordsModal(true); setAdminPassword('') }} className="bg-teal-600 hover:bg-teal-500 text-white font-semibold px-4 py-2 rounded-xl transition shadow-lg text-sm flex items-center gap-2">
                🔑 كلمات المرور
              </button>
              <button onClick={() => setShowClosingModal(true)} className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 rounded-xl transition shadow-lg text-sm flex items-center gap-2">
                🔒 الإغلاق اليومي
              </button>
              <button onClick={handleLogout} className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-semibold px-4 py-2 rounded-xl transition shadow-lg text-sm flex items-center gap-2 border border-rose-500/30">
                🚪 تسجيل خروج
              </button>
            </div>
            <div className="mt-3">
              <button onClick={handleExportEmployeePDF} disabled={exportingEmp} className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 text-white font-bold py-3 rounded-xl transition shadow-lg text-sm flex items-center justify-center gap-2 border-2 border-orange-400/50">
                {exportingEmp ? '⏳ جاري التصدير...' : '📋 تصدير تقرير سحوبات وعجوزات الموظفين PDF'}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 pb-24 space-y-4">
          <input
            type="date" value={adminDate}
            onChange={e => setAdminDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
          />

          {dayClosed && (
            <div className="bg-violet-500/10 border border-violet-500/30 text-violet-300 rounded-xl p-4 flex justify-between items-center text-sm">
              <span>🔒 هذا اليوم ({formatDateShort(adminDate)}) <strong>مغلق</strong></span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 border border-amber-500/30 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400">إجمالي السحبيات</p>
              <p className="text-xl font-black text-amber-400">{grandWithdrawals} د.ل</p>
            </div>
            <div className="bg-slate-800 border border-rose-500/30 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400">إجمالي العجوزات</p>
              <p className="text-xl font-black text-rose-400">{grandShortages} د.ل</p>
            </div>
          </div>

          <div className="space-y-4">
            {branches.map(branch => {
              const branchEmps = employees.filter(e => e.branchId === branch.id)
              let branchWithdrawals = 0
              let branchShortages = 0

              const empCards = branchEmps.map(emp => {
                const empRecords = records.filter(r => r.empId === emp.id && r.date === adminDate)
                const withdrawals = empRecords.filter(r => r.type === 'withdrawal').reduce((sum, r) => sum + r.amount, 0)
                const shortages = empRecords.filter(r => r.type === 'shortage').reduce((sum, r) => sum + r.amount, 0)
                branchWithdrawals += withdrawals
                branchShortages += shortages
                grandWithdrawals += withdrawals
                grandShortages += shortages

                const empCarEntries = carEntries.filter(e => e.empId === emp.id && e.date === adminDate)
                const carTotal = empCarEntries.reduce((s, e) => s + e.totalAmount, 0)
                const carCount = empCarEntries.reduce((s, e) => s + e.totalCars, 0)

                return (
                  <div key={emp.id} className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-white text-base">{emp.name}</h3>
                        <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full mt-1 inline-block border border-indigo-500/20">{emp.shift}</span>
                      </div>
                      <div className="flex gap-2">
                        {!dayClosed && (
                          <button
                            onClick={() => {
                              setRecordModalData({
                                id: '', empId: emp.id, empName: emp.name, type: 'withdrawal',
                                amount: '', note: '', date: adminDate, branchId: branch.id
                              })
                              setShowRecordModal(true)
                            }}
                            className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white text-xs px-2.5 py-1.5 rounded-lg border border-cyan-500/30 transition"
                          >+ حركة</button>
                        )}
                        <button onClick={() => handleDeleteEmployee(emp.id)} className="text-slate-500 hover:text-rose-400 text-xs p-1">🗑️</button>
                      </div>
                    </div>

                    {carCount > 0 && (
                      <div className="grid grid-cols-2 gap-3 bg-emerald-500/5 border border-emerald-500/20 p-2.5 rounded-lg text-xs mb-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">🚗 السيارات:</span>
                          <span className="font-bold text-emerald-400">{carCount} سيارة</span>
                        </div>
                        <div className="flex justify-between border-r border-slate-700 pr-3">
                          <span className="text-slate-400">💰 المبيعات:</span>
                          <span className="font-bold text-emerald-400">{carTotal} د.ل</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 bg-slate-800/80 p-2.5 rounded-lg text-xs mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">السحبيات:</span>
                        <span className="font-bold text-amber-400">{withdrawals} د.ل</span>
                      </div>
                      <div className="flex justify-between border-r border-slate-700 pr-3">
                        <span className="text-slate-400">العجوزات:</span>
                        <span className="font-bold text-rose-400">{shortages} د.ل</span>
                      </div>
                    </div>

                    <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                      {empRecords.map(r => (
                        <div key={r.id} className="flex justify-between items-center text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded">
                          <span>{r.type === 'withdrawal' ? '💸 سحب' : '📉 عجز'} — {formatDateShort(r.date)}: {r.note || 'بدون ملاحظة'}</span>
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
              })

              return (
                <div key={branch.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">📍 {branch.name}</h2>
                    <button onClick={() => handleDeleteBranch(branch.id)} className="text-rose-400 hover:text-rose-300 text-xs font-semibold bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">حذف الفرع</button>
                  </div>
                  <div className="space-y-4">
                    {branchEmps.length === 0 && (
                      <p className="text-slate-500 text-sm text-center py-4">لا يوجد موظفون بالفرع حالياً</p>
                    )}
                    {empCards}
                  </div>
                </div>
              )
            })}
          </div>
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
            <div className="text-5xl mb-3">🚗</div>
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
                {employees.map(emp => {
                  const brName = branches.find(b => b.id === emp.branchId)?.name || ''
                  return (
                    <option key={emp.id} value={emp.id}>{emp.name} ({brName}) - {emp.shift}</option>
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
                  <option value="shortage">📉 عجز</option>
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
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white text-center">➕ إضافة فرع جديد</h3>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">اسم الفرع</label>
              <input
                type="text" value={newBranchName}
                onChange={e => setNewBranchName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateBranch()}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                placeholder="اسم الفرع الجديد"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreateBranch} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl text-sm transition">💾 حفظ</button>
              <button onClick={() => { setShowBranchModal(false); setNewBranchName('') }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm transition">إلغاء</button>
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
              <div>
                <label className="text-xs text-slate-400 mb-1 block">رمز المرور</label>
                <input type="text" value={newEmp.password}
                  onChange={e => setNewEmp(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  placeholder="رمز المرور"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreateEmployee} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 rounded-xl text-sm transition">💾 حفظ</button>
              <button onClick={() => { setShowEmpModal(false); setNewEmp({ name: '', branchId: '', shift: 'الفترة الصباحية', password: '' }) }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm transition">إلغاء</button>
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
              const branchEmps = employees.filter(e => e.branchId === branch.id)
              if (branchEmps.length === 0) return null
              return (
                <div key={branch.id} className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
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
                    const eRecs = records.filter(r => r.empId === emp.id && r.date === adminDate)
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
                  const eRecs = records.filter(r => r.empId === emp.id && r.date === adminDate)
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
    <div className="min-h-screen bg-slate-900 text-slate-100" style={{ fontFamily: 'Cairo, sans-serif' }}>
      <div ref={pdfAreaRef} id="pdfReportArea" style={{ position: 'fixed', top: '0', left: '-99999px', width: '800px', zIndex: -1 }} />
      {renderModals()}
      {screen === 'login' && renderLoginScreen()}
      {screen === 'employee' && renderEmployeeScreen()}
      {screen === 'admin' && renderAdminScreen()}
    </div>
  )
}
