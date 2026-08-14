import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Mode 1: Setup admin account
    if (body.action === 'setup-admin') {
      const { password, name } = body
      if (!password) {
        return NextResponse.json({ error: 'كلمة المرور مطلوبة' }, { status: 400 })
      }
      
      const existing = await db.adminAccount.findUnique({ where: { id: 'admin' } })
      if (existing) {
        const hashed = await bcrypt.hash(password, 12)
        await db.adminAccount.update({ where: { id: 'admin' }, data: { password: hashed, name: name || existing.name } })
        return NextResponse.json({ success: true, message: 'تم تحديث كلمة مرور المسؤول' })
      }
      
      const hashed = await bcrypt.hash(password, 12)
      const admin = await db.adminAccount.create({
        data: { id: 'admin', name: name || 'طه علي', password: hashed }
      })
      return NextResponse.json({ success: true, message: 'تم إنشاء حساب المسؤول' })
    }
    
    // Mode 2: Seed branches + employees
    if (body.action === 'seed-data') {
      const { branches, employees } = body
      
      if (!branches || !employees) {
        return NextResponse.json({ error: 'البيانات مطلوبة' }, { status: 400 })
      }
      
      const results = { branches: [], employees: [] }
      
      // Create branches
      for (const branch of branches) {
        try {
          const existing = await db.branch.findFirst({ where: { name: branch.name } })
          if (existing) {
            results.branches.push({ name: branch.name, status: 'already_exists', id: existing.id })
            continue
          }
          const created = await db.branch.create({ data: { name: branch.name } })
          results.branches.push({ name: branch.name, status: 'created', id: created.id })
        } catch (e: any) {
          results.branches.push({ name: branch.name, status: 'error', error: e.message })
        }
      }
      
      // Create employees
      for (const emp of employees) {
        try {
          // Find matching branch by name
          const vercelBranch = await db.branch.findFirst({ where: { name: emp.branchName } })
          if (!vercelBranch) {
            results.employees.push({ name: emp.name, status: 'branch_not_found', branchName: emp.branchName })
            continue
          }
          
          // Check if employee exists
          const existing = await db.employee.findFirst({ where: { name: emp.name, branchId: vercelBranch.id } })
          if (existing) {
            results.employees.push({ name: emp.name, status: 'already_exists' })
            continue
          }
          
          const hashedPassword = await bcrypt.hash('1234', 12)
          const created = await db.employee.create({
            data: {
              id: emp.name.replace(/\s+/g, '_') + '_' + vercelBranch.id + '_' + Date.now(),
              name: emp.name,
              branchId: vercelBranch.id,
              shift: emp.shift,
              role: 'employee',
              hasLogin: false,
              password: hashedPassword,
              startDate: '',
              endDate: '',
              multiBranchIds: '[]',
              deleted: false
            }
          })
          results.employees.push({ name: emp.name, status: 'created', id: created.id })
        } catch (e: any) {
          results.employees.push({ name: emp.name, status: 'error', error: e.message })
        }
      }
      
      return NextResponse.json({ success: true, results })
    }
    
    return NextResponse.json({ error: ' action غير معروف. استخدم setup-admin أو seed-data' }, { status: 400 })
  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'حدث خطأ: ' + (error?.message || '') }, { status: 500 })
  }
}
