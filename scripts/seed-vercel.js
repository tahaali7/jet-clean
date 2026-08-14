/**
 * Seed Script: Push local SQLite data to Vercel PostgreSQL via API
 * Run: node scripts/seed-vercel.js
 */

const LOCAL_DB = '/home/z/my-project/db/custom.db'
const BASE_URL = 'https://my-project-tan-gamma-26.vercel.app'
const ADMIN_PASSWORD = '19970880528' // كلمة مرور المسؤول

const Database = require('better-sqlite3')
const db = new Database(LOCAL_DB)

async function seed() {
  // 1. Login as admin
  console.log('🔐 تسجيل الدخول كمسؤول...')
  const loginRes = await fetch(BASE_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empId: 'admin', password: ADMIN_PASSWORD })
  })
  const loginData = await loginRes.json()
  
  if (!loginData.success) {
    console.error('❌ فشل تسجيل الدخول:', loginData.error)
    console.log('💡 جرب كلمات مرور مختلفة أو تأكد من قاعدة البيانات على Vercel')
    process.exit(1)
  }
  
  // Extract cookie
  const setCookie = loginRes.headers.get('set-cookie') || ''
  const tokenMatch = setCookie.match(/auth-token=([^;]+)/)
  const token = tokenMatch ? tokenMatch[1] : ''
  
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': token ? `auth-token=${token}` : ''
  }
  
  console.log('✅ تم تسجيل الدخول')

  // 2. Get existing branches on Vercel
  console.log('\n📊 جلب الفروع الحالية...')
  const existingBranches = await fetch(BASE_URL + '/api/branches', { headers }).then(r => r.json())
  console.log('   الفروع الموجودة:', existingBranches.length)

  // 3. Get local branches
  const localBranches = db.prepare('SELECT * FROM Branch').all()
  console.log('   الفروع المحلية:', localBranches.length)
  
  // 4. Create missing branches
  for (const branch of localBranches) {
    const exists = existingBranches.find(b => b.name === branch.name)
    if (exists) {
      console.log(`   ⏭️  الفرع "${branch.name}" موجود بالفعل`)
      continue
    }
    
    const res = await fetch(BASE_URL + '/api/branches', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: branch.name })
    })
    const data = await res.json()
    if (res.ok) {
      console.log(`   ✅ تم إنشاء الفرع "${branch.name}"`)
    } else {
      console.error(`   ❌ فشل إنشاء "${branch.name}":`, data.error)
    }
  }

  // 5. Get existing employees on Vercel
  console.log('\n👥 جلب الموظفين الحاليين...')
  const existingEmployees = await fetch(BASE_URL + '/api/employees', { headers }).then(r => r.json())
  console.log('   الموظفين الموجودين:', existingEmployees.length)

  // 6. Get local employees
  const localEmployees = db.prepare('SELECT * FROM Employee').all()
  console.log('   الموظفين المحليين:', localEmployees.length)
  
  // 7. Get updated branches list with IDs
  const updatedBranches = await fetch(BASE_URL + '/api/branches', { headers }).then(r => r.json())

  // 8. Create missing employees
  for (const emp of localEmployees) {
    const exists = existingEmployees.find(e => e.name === emp.name && e.branchId === emp.branchId)
    if (exists) {
      console.log(`   ⏭️  الموظف "${emp.name}" موجود بالفعل`)
      continue
    }
    
    // Find branch ID on Vercel (matching by name since IDs differ)
    const localBranch = localBranches.find(b => b.id === emp.branchId)
    const vercelBranch = updatedBranches.find(b => localBranch && b.name === localBranch.name)
    
    const res = await fetch(BASE_URL + '/api/employees', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: emp.name,
        branchId: vercelBranch ? vercelBranch.id : emp.branchId,
        shift: emp.shift,
        role: emp.role,
        hasLogin: emp.hasLogin === 1,
        password: '1234', // كلمة مرور افتراضية — ستُهاش تلقائياً
        startDate: emp.startDate || '',
        endDate: emp.endDate || ''
      })
    })
    const data = await res.json()
    if (res.ok) {
      console.log(`   ✅ تم إنشاء الموظف "${emp.name}"`)
    } else {
      console.error(`   ❌ فشل إنشاء "${emp.name}":`, data.error)
    }
  }

  console.log('\n🎉 تم الانتهاء من نقل البيانات!')
  db.close()
}

seed().catch(err => {
  console.error('❌ خطأ:', err.message)
  process.exit(1)
})
