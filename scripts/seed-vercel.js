/**
 * Seed Script: Push backup data to Vercel PostgreSQL
 * Uses the backup JSON files to restore all data via API
 */

const BASE_URL = 'https://my-project-tan-gamma-26.vercel.app'
const ADMIN_PASSWORD = '19970880528'

// Backup data extracted from backup JSON files
const branchesData = [
  {
    "id": "cmsfdbli00000l204pvtsu4el",
    "name": "أبونواس",
    "config": null
  },
  {
    "id": "cmsfdc0hv0002l204uu2leax5",
    "name": "المنصوره",
    "config": {"rooms":3,"hasMachine":false,"cleanliness":{"type":"fixed","value":10},"netDeduction":0,"extraDisabled":true,"machineNoDeduction":false}
  },
  {
    "id": "cmsfdbtp60001l20440x4ji3m",
    "name": "بن غرسه",
    "config": null
  },
  {
    "id": "cmsfdc7js0003l204xntksxrg",
    "name": "عين زاره",
    "config": {"extraDisabled":true}
  },
  {
    "id": "cmsjl0j3l0003ld045nv7l14s",
    "name": "غوط الشعال",
    "config": {"rooms":2,"hasMachine":false,"cleanliness":{"type":"select","options":[0]},"netDeduction":0,"extraDisabled":true,"machineNoDeduction":false}
  }
]

// All employees - only the active/real ones (not duplicate viewer entries)
const employeesData = [
  // أبونواس
  {"id":"هيثم_cmsfdbli00000l204pvtsu4el_1785891651073","name":"هيثم","branchId":"cmsfdbli00000l204pvtsu4el","shift":"الفترة الصباحية","password":"","role":"employee","hasLogin":false,"startDate":"","endDate":"","multiBranchIds":"[]","deleted":false},
  {"id":"إياد_عناد_cmsfdbli00000l204pvtsu4el_1785891361210","name":"إياد عماد","branchId":"cmsfdbli00000l204pvtsu4el","shift":"الفترة المسائية","password":"1969","role":"employee","hasLogin":true,"startDate":"","endDate":"","multiBranchIds":"[]","deleted":false},
  // المنصوره
  {"id":"وسام_cmsfdc0hv0002l204uu2leax5_1785891674629","name":"وسام","branchId":"cmsfdc0hv0002l204uu2leax5","shift":"الفترة كاملة","password":"1234","role":"employee","hasLogin":true,"startDate":"","endDate":"","multiBranchIds":"[]","deleted":true},
  // بن غرسه
  {"id":"احمد_cmsfdbtp60001l20440x4ji3m_1785891690117","name":"احمد","branchId":"cmsfdbtp60001l20440x4ji3m","shift":"الفترة الصباحية","password":"","role":"employee","hasLogin":false,"startDate":"","endDate":"","multiBranchIds":"[]","deleted":false},
  {"id":"اكرم_بورتر_cmsfdbtp60001l20440x4ji3m_1786021252115","name":"اكرم بورتر","branchId":"cmsfdbtp60001l20440x4ji3m","shift":"الفترة كاملة","password":"","role":"employee","hasLogin":false,"startDate":"","endDate":"","multiBranchIds":"[]","deleted":true},
  {"id":"هاشم_cmsfdbtp60001l20440x4ji3m_1785891707339","name":"هاشم","branchId":"cmsfdbtp60001l20440x4ji3m","shift":"الفترة المسائية","password":"2007","role":"employee","hasLogin":true,"startDate":"","endDate":"","multiBranchIds":"[]","deleted":false},
  // عين زاره
  {"id":"إياد_cmsfdc7js0003l204xntksxrg_1785891721878","name":"إياد","branchId":"cmsfdc7js0003l204xntksxrg","shift":"الفترة المسائية","password":"","role":"employee","hasLogin":false,"startDate":"","endDate":"","multiBranchIds":"[]","deleted":false},
  {"id":"اسامه_cmsfdc7js0003l204xntksxrg_1785891737678","name":"اسامه","branchId":"cmsfdc7js0003l204xntksxrg","shift":"الفترة الصباحية","password":"","role":"employee","hasLogin":false,"startDate":"","endDate":"","multiBranchIds":"[]","deleted":false},
  {"id":"عبيده_cmsfdc7js0003l204xntksxrg_1786066238605","name":"عبيده","branchId":"cmsfdc7js0003l204xntksxrg","shift":"الفترة كاملة","password":"","role":"employee","hasLogin":false,"startDate":"","endDate":"","multiBranchIds":"[]","deleted":true},
  {"id":"عبدالخالق_cmsfdc7js0003l204xntksxrg_1786074405599","name":"عبدالخالق","branchId":"cmsfdc7js0003l204xntksxrg","shift":"الفترة كاملة","password":"1234","role":"employee","hasLogin":true,"startDate":"","endDate":"","multiBranchIds":"[]","deleted":false},
  // مشاهدون (viewers) - multi-branch
  {"id":"أكرم_-_سيارة_نقل_viewer_1786074372398","name":"أكرم - سيارة نقل","branchId":null,"shift":"الفترة كاملة","password":"","role":"employee","hasLogin":false,"startDate":"","endDate":"","multiBranchIds":"[\"cmsfdbtp60001l20440x4ji3m\",\"cmsfdbli00000l204pvtsu4el\"]","deleted":false},
  {"id":"حقي_viewer_1785893419207","name":"حقي","branchId":null,"shift":"مشاهد","password":"1234","role":"viewer","hasLogin":true,"startDate":"","endDate":"","multiBranchIds":"[]","deleted":false},
  {"id":"طه_viewer_1786074239923","name":"طه","branchId":null,"shift":"الفترة كاملة","password":"","role":"employee","hasLogin":false,"startDate":"","endDate":"","multiBranchIds":"[\"cmsfdbli00000l204pvtsu4el\",\"cmsfdc0hv0002l204uu2leax5\",\"cmsfdbtp60001l20440x4ji3m\",\"cmsfdc7js0003l204xntksxrg\"]","deleted":false},
  {"id":"عبدالحق_viewer_1786074273805","name":"عبدالحق","branchId":null,"shift":"الفترة كاملة","password":"","role":"employee","hasLogin":false,"startDate":"","endDate":"","multiBranchIds":"[\"cmsfdc7js0003l204xntksxrg\",\"cmsfdbli00000l204pvtsu4el\",\"cmsfdc0hv0002l204uu2leax5\",\"cmsfdbtp60001l20440x4ji3m\"]","deleted":false},
  {"id":"عماد_viewer_1786074303095","name":"عماد","branchId":null,"shift":"الفترة كاملة","password":"","role":"employee","hasLogin":false,"startDate":"","endDate":"","multiBranchIds":"[\"cmsfdbli00000l204pvtsu4el\",\"cmsfdc0hv0002l204uu2leax5\",\"cmsfdbtp60001l20440x4ji3m\",\"cmsfdc7js0003l204xntksxrg\"]","deleted":false},
  {"id":"ياسر_viewer_1786304541766","name":"ياسر","branchId":null,"shift":"الفترة كاملة","password":"","role":"employee","hasLogin":false,"startDate":"","endDate":"","multiBranchIds":"[\"cmsfdbli00000l204pvtsu4el\",\"cmsfdc0hv0002l204uu2leax5\",\"cmsfdbtp60001l20440x4ji3m\",\"cmsfdc7js0003l204xntksxrg\",\"cmsjl0j3l0003ld045nv7l14s\"]","deleted":false}
]

const adminData = [
  {"id":"admin","name":"طه علي","password": ADMIN_PASSWORD}
]

// Build the backup JSON in the format the restore endpoint expects
const backupJSON = JSON.stringify({
  version: 1,
  date: new Date().toISOString(),
  data: {
    branches: branchesData,
    employees: employeesData,
    carEntries: [],
    workerExpenses: [],
    treasuries: [],
    records: [],
    closedDays: [],
    adminAccount: adminData
  }
})

async function seed() {
  console.log('🚀 بدء نقل البيانات إلى Vercel PostgreSQL...\n')

  // Step 1: Create admin account (works even if DB is empty)
  console.log('📋 الخطوة 1: إنشاء حساب المسؤول...')
  try {
    const setupRes = await fetch(BASE_URL + '/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'setup-admin',
        password: ADMIN_PASSWORD,
        name: 'طه علي'
      })
    })
    const setupData = await setupRes.json()
    console.log('   ', setupData.success ? '✅' : '⚠️', setupData.message || setupData.error)
  } catch (e) {
    console.error('   ❌ فشل إنشاء المسؤول:', e.message)
  }

  // Step 2: Login to get auth token
  console.log('\n🔐 الخطوة 2: تسجيل الدخول...')
  let token = ''
  try {
    const loginRes = await fetch(BASE_URL + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empId: 'admin', password: ADMIN_PASSWORD })
    })
    const loginData = await loginRes.json()

    if (!loginData.success) {
      console.error('   ❌ فشل تسجيل الدخول:', loginData.error)
      console.log('   💡 سيتم المحاولة بدون توكن...')
    } else {
      token = loginData.token || ''
      console.log('   ✅ تم تسجيل الدخول بنجاح')
    }
  } catch (e) {
    console.error('   ❌ فشل تسجيل الدخول:', e.message)
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': 'Bearer ' + token, 'Cookie': 'auth-token=' + token } : {})
  }

  // Step 3: Restore all data via restore endpoint
  console.log('\n📦 الخطوة 3: استعادة البيانات...')
  console.log('   - الفروع:', branchesData.length)
  console.log('   - الموظفين:', employeesData.length)
  console.log('   - المسؤول:', adminData.length)

  try {
    const restoreRes = await fetch(BASE_URL + '/api/restore', {
      method: 'POST',
      headers,
      body: JSON.stringify({ uploadData: backupJSON })
    })
    const restoreData = await restoreRes.json()

    if (restoreData.success) {
      console.log('\n   ✅ تمت الاستعادة بنجاح!')
      if (restoreData.stats) {
        console.log('   📊 الإحصائيات:', JSON.stringify(restoreData.stats, null, 2))
      }
    } else {
      console.error('\n   ❌ فشلت الاستعادة:', restoreData.error)

      // If restore fails, try individual steps
      console.log('\n   🔄 محاولة النقل يدوياً...')

      // Create branches one by one
      console.log('\n   📋 إنشاء الفروع...')
      for (const branch of branchesData) {
        try {
          const res = await fetch(BASE_URL + '/api/branches', {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: branch.name, config: branch.config })
          })
          const data = await res.json()
          console.log('   ', res.ok ? '✅' : '❌', branch.name, '-', data.message || data.error || '')
        } catch (e) {
          console.error('   ❌', branch.name, '-', e.message)
        }
      }

      // Create employees one by one
      console.log('\n   👥 إنشاء الموظفين...')
      for (const emp of employeesData) {
        try {
          const res = await fetch(BASE_URL + '/api/employees', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: emp.name,
              branchId: emp.branchId,
              shift: emp.shift,
              password: emp.password || '',
              role: emp.role,
              hasLogin: emp.hasLogin,
              startDate: emp.startDate,
              endDate: emp.endDate,
              multiBranchIds: emp.multiBranchIds,
              deleted: emp.deleted
            })
          })
          const data = await res.json()
          console.log('   ', res.ok ? '✅' : '❌', emp.name, '-', data.message || data.error || '')
        } catch (e) {
          console.error('   ❌', emp.name, '-', e.message)
        }
      }
    }
  } catch (e) {
    console.error('   ❌ خطأ في الاتصال:', e.message)
  }

  // Step 4: Verify
  console.log('\n✅ الخطوة 4: التحقق...')
  try {
    const branchesRes = await fetch(BASE_URL + '/api/branches', { headers })
    const branches = await branchesRes.json()
    console.log('   📊 الفروع على Vercel:', branches.length)

    // Try login check
    const loginCheck = await fetch(BASE_URL + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empId: 'admin', password: ADMIN_PASSWORD })
    }).then(r => r.json())
    console.log('   🔐 تسجيل دخول المسؤول:', loginCheck.success ? '✅ يعمل' : '❌ فشل')

    // Check employees dropdown (the original problem)
    if (loginCheck.success && loginCheck.token) {
      const empHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + loginCheck.token
      }
      const empRes = await fetch(BASE_URL + '/api/employees', { headers: empHeaders })
      const emps = await empRes.json()
      const activeEmps = Array.isArray(emps) ? emps.filter(e => !e.deleted && (e.hasLogin || e.role === 'viewer')) : []
      console.log('   👥 الموظفين القابلين لتسجيل الدخول:', activeEmps.length)
      activeEmps.forEach(e => console.log('      -', e.name, '(' + e.role + ')'))
    }
  } catch (e) {
    console.error('   ❌ خطأ في التحقق:', e.message)
  }

  console.log('\n🎉 تم الانتهاء!')
}

seed().catch(err => {
  console.error('❌ خطأ:', err.message)
  process.exit(1)
})
