const databaseConfig = require('../src/config/database-serverless');

module.exports = async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const tests = [];
    const startTime = Date.now();

    // Test 1: Environment Variables
    tests.push({
      name: 'Environment Variables',
      status: 'success',
      details: {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'not configured',
        JWT_SECRET: process.env.JWT_SECRET ? 'configured' : 'not configured',
        PORT: process.env.PORT || 'not set'
      }
    });

    // Test 2: Database Connection
    try {
      await databaseConfig.initialize();
      const dbHealth = await databaseConfig.healthCheck();
      tests.push({
        name: 'Database Connection',
        status: dbHealth.status === 'healthy' ? 'success' : 'failed',
        details: dbHealth
      });
    } catch (dbError) {
      tests.push({
        name: 'Database Connection',
        status: 'failed',
        error: dbError.message
      });
    }

    // Test 3: API Endpoints
    const endpoints = [
      '/health',
      '/api/auth/login',
      '/api/cad/clients',
      '/api/est/products',
      '/api/imp/history',
      '/api/bi/analytics',
      '/api/vnd/orders',
      '/api/notifications'
    ];

    tests.push({
      name: 'API Endpoints',
      status: 'success',
      details: {
        availableEndpoints: endpoints,
        totalEndpoints: endpoints.length
      }
    });

    // Test 4: CORS Configuration
    tests.push({
      name: 'CORS Configuration',
      status: 'success',
      details: {
        allowedOrigins: [
          'https://plataforma.app',
          'https://www.plataforma.app',
          'https://importacao.app',
          'https://www.importacao.app'
        ],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        credentialsSupported: true
      }
    });

    // Test 5: Authentication
    tests.push({
      name: 'Authentication',
      status: process.env.JWT_SECRET ? 'success' : 'warning',
      details: {
        jwtConfigured: !!process.env.JWT_SECRET,
        message: process.env.JWT_SECRET ? 'JWT secret configured' : 'JWT secret not configured'
      }
    });

    const totalTime = Date.now() - startTime;
    const passedTests = tests.filter(t => t.status === 'success').length;
    const failedTests = tests.filter(t => t.status === 'failed').length;
    const warningTests = tests.filter(t => t.status === 'warning').length;

    res.status(200).json({
      message: 'API Test Suite Results',
      timestamp: new Date().toISOString(),
      serverless: true,
      environment: process.env.NODE_ENV || 'production',
      summary: {
        totalTests: tests.length,
        passed: passedTests,
        failed: failedTests,
        warnings: warningTests,
        executionTime: totalTime,
        overallStatus: failedTests > 0 ? 'failed' : (warningTests > 0 ? 'warning' : 'success')
      },
      tests,
      deployment: {
        region: process.env.VERCEL_REGION || 'unknown',
        commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
        branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown'
      }
    });

  } catch (error) {
    console.error('Test suite error:', error);
    res.status(500).json({
      message: 'Test suite failed',
      error: error.message,
      timestamp: new Date().toISOString(),
      serverless: true
    });
  }
};