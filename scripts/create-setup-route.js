/**
 * Emergency Setup: Create admin account on Vercel PostgreSQL
 * Creates /api/setup endpoint that initializes admin account
 * 
 * This adds a ONE-TIME setup route that creates the admin if not exists
 */

// This script patches the app to add a setup endpoint
// After running, deploy and visit /api/setup to create admin

const fs = require('fs')
const path = require('path')

const setupRoute = `import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { password, name } = await req.json()
    if (!password) {
      return NextResponse.json({ error: 'كلمة المرور مطلوبة' }, { status: 400 })
    }
    
    // Check if admin exists
    const existing = await db.adminAccount.findUnique({ where: { id: 'admin' } })
    if (existing) {
      // Update password
      const hashed = await bcrypt.hash(password, 12)
      await db.adminAccount.update({ where: { id: 'admin' }, data: { password: hashed, name: name || existing.name } })
      return NextResponse.json({ success: true, message: 'تم تحديث كلمة مرور المسؤول' })
    }
    
    // Create admin
    const hashed = await bcrypt.hash(password, 12)
    const admin = await db.adminAccount.create({
      data: { id: 'admin', name: name || 'طه علي', password: hashed }
    })
    return NextResponse.json({ success: true, message: 'تم إنشاء حساب المسؤول', admin: { id: admin.id, name: admin.name } })
  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'حدث خطأ: ' + (error?.message || '') }, { status: 500 })
  }
}
`

const setupDir = path.join(__dirname, '..', 'src', 'app', 'api', 'setup')
fs.mkdirSync(setupDir, { recursive: true })
fs.writeFileSync(path.join(setupDir, 'route.ts'), setupRoute)
console.log('✅ Created /api/setup route')
console.log('⚠️  IMPORTANT: This route allows anyone to set the admin password!')
console.log('📋 After fixing the admin account, DELETE this route immediately.')
