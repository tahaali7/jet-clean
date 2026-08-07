const BASE_URL = 'https://my-project-tan-gamma-26.vercel.app'

async function test() {
  console.log('=== Test Login ===')
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empId: 'admin', password: '1234' })
    })
    console.log('Status:', res.status)
    const data = await res.json()
    console.log('Response:', JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('Error:', e)
  }

  console.log('\n=== Test Activity Log POST ===')
  try {
    const res = await fetch(`${BASE_URL}/api/activity-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'admin',
        userName: 'المسؤول',
        userRole: 'admin',
        action: 'تسجيل دخول',
        category: 'تسجيل الدخول',
        details: 'test'
      })
    })
    console.log('Status:', res.status)
    const data = await res.json()
    console.log('Response:', data)
  } catch (e) {
    console.error('Error:', e)
  }
}

test()
