#!/usr/bin/env node

// Simple API test script to verify backend functionality
const http = require('http')

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data)
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          })
        }
      })
    })

    req.on('error', reject)
    
    if (postData) {
      req.write(postData)
    }
    
    req.end()
  })
}

async function testAPI() {
  console.log('Testing API endpoints...\n')
  
  const tests = [
    {
      name: 'Health Check',
      options: {
        hostname: 'localhost',
        port: 3002,
        path: '/health',
        method: 'GET'
      }
    },
    {
      name: 'API Test Endpoint',
      options: {
        hostname: 'localhost',
        port: 3002,
        path: '/api/test',
        method: 'GET'
      }
    },
    {
      name: 'Dashboard Stats',
      options: {
        hostname: 'localhost',
        port: 3002,
        path: '/dashboard/stats',
        method: 'GET'
      }
    },
    {
      name: 'EST Module Metrics',
      options: {
        hostname: 'localhost',
        port: 3002,
        path: '/api/est/metrics',
        method: 'GET'
      }
    },
    {
      name: 'Login Test',
      options: {
        hostname: 'localhost',
        port: 3002,
        path: '/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': 0
        }
      },
      postData: JSON.stringify({
        email: 'admin@plataforma.app',
        password: 'admin123'
      })
    }
  ]

  for (const test of tests) {
    try {
      if (test.postData) {
        test.options.headers['Content-Length'] = Buffer.byteLength(test.postData)
      }
      
      console.log(`🧪 Testing: ${test.name}`)
      const result = await makeRequest(test.options, test.postData)
      
      if (result.status === 200) {
        console.log(`✅ SUCCESS (${result.status})`)
        if (typeof result.data === 'object') {
          console.log('   Response:', JSON.stringify(result.data, null, 2).substring(0, 200) + '...')
        }
      } else {
        console.log(`❌ FAILED (${result.status})`)
        console.log('   Response:', result.data)
      }
    } catch (error) {
      console.log(`💥 ERROR: ${error.message}`)
    }
    
    console.log('')
  }
}

testAPI()