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

    const startTime = Date.now();
    
    // Initialize database if not connected
    try {
      await databaseConfig.initialize();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
    }

    // Get database health
    const dbHealth = await databaseConfig.healthCheck();
    const responseTime = Date.now() - startTime;

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'plataforma-erp-backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      responseTime,
      database: dbHealth,
      serverless: true,
      region: process.env.VERCEL_REGION || 'unknown',
      deployment: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      serverless: true
    });
  }
};