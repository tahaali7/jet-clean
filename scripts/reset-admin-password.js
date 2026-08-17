const BASE_URL = 'https://my-project-tan-gamma-26.vercel.app'

async function resetAdmin() {
  // Step 1: Re-setup admin (this should work without auth)
  console.log('Step 1: Re-setup admin...')
  const setupRes = await fetch(BASE_URL + '/api/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'setup-admin',
      password: '19970880528',
      name: 'طه علي'
    })
  })
  const setupData = await setupRes.json()
  console.log('Setup:', JSON.stringify(setupData))

  // Step 2: Login
  console.log('\nStep 2: Login...')
  const loginRes = await fetch(BASE_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empId: 'admin', password: '19970880528' })
  })
  const loginData = await loginRes.json()
  console.log('Login:', JSON.stringify(loginData))

  if (loginData.success) {
    console.log('\n✅ Login successful! Token:', loginData.token?.substring(0, 50) + '...')
  } else {
    console.log('\n❌ Login failed:', loginData.error)
  }
}

resetAdmin().catch(e => console.error('Error:', e.message))
