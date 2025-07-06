#!/usr/bin/env node

// Comprehensive ERP module test script
const http = require('http')

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          })
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function testAllModules() {
  console.log('🧪 Testing All 12 ERP Modules + Core Features\n')
  
  const tests = [
    // Core Features
    { name: 'Health Check', path: '/health' },
    { name: 'API Test', path: '/api/test' },
    { name: 'Dashboard Stats', path: '/dashboard/stats' },
    { name: 'Dashboard Activities', path: '/dashboard/activities?limit=5' },
    
    // 12 ERP Modules
    { name: 'CAD - Cadastros (Companies)', path: '/api/cad/empresas' },
    { name: 'CMP - Compras', path: '/api/cmp/test' },
    { name: 'EST - Estoque (Metrics)', path: '/api/est/metrics' },
    { name: 'EST - Estoque (Movements)', path: '/api/est/movements?limit=5' },
    { name: 'FIS - Fiscal', path: '/api/fis/test' },
    { name: 'IMP - Importação', path: '/api/imp/test' },
    { name: 'LOC - Locação', path: '/api/loc/test' },
    { name: 'LOG - Logística', path: '/api/log/test' },
    { name: 'PRD - Produção', path: '/api/prd/test' },
    { name: 'PRO - Projetos', path: '/api/pro/test' },
    { name: 'SPT - Suporte', path: '/api/spt/test' },
    { name: 'VND - Vendas', path: '/api/vnd/test' },
    { name: 'WHK - Webhooks', path: '/api/whk/test' }
  ]

  let passedTests = 0
  let totalTests = tests.length

  for (const test of tests) {
    try {
      const result = await makeRequest({
        hostname: 'localhost',
        port: 3002,
        path: test.path,
        method: 'GET'
      })
      
      if (result.status === 200) {
        console.log(`✅ ${test.name}`)
        passedTests++
        
        // Show sample data for key endpoints
        if (test.path.includes('/api/est/metrics') || test.path.includes('/dashboard/stats')) {
          console.log(`   Sample: ${JSON.stringify(result.data.data, null, 2).substring(0, 100)}...`)
        }
      } else {
        console.log(`❌ ${test.name} (${result.status})`)
        if (result.data.message) {
          console.log(`   Error: ${result.data.message}`)
        }
      }
    } catch (error) {
      console.log(`💥 ${test.name} - ERROR: ${error.message}`)
    }
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed (${Math.round(passedTests/totalTests*100)}%)`)
  
  if (passedTests === totalTests) {
    console.log('🎉 All ERP modules are working perfectly!')
  } else {
    console.log('⚠️  Some modules need attention')
  }

  // Test authentication flow
  console.log('\n🔐 Testing Authentication Flow:')
  try {
    const loginResult = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (loginResult.status === 200) {
      console.log('✅ Login endpoint accessible')
      
      // Test profile with mock token
      const profileResult = await makeRequest({
        hostname: 'localhost',
        port: 3002,
        path: '/auth/profile',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      })
      
      if (profileResult.status === 200) {
        console.log('✅ Profile endpoint working with auth')
      } else {
        console.log('❌ Profile endpoint failed')
      }
    }
  } catch (error) {
    console.log(`💥 Auth test failed: ${error.message}`)
  }
}

testAllModules()