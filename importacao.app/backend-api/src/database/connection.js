const knex = require('knex')
const databaseConfig = require('../config/database')

let db = null

// Initialize database connection
const initializeDatabase = async () => {
  try {
    db = await databaseConfig.initialize()
    console.log('✅ Database connection established successfully')
    return db
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    throw error
  }
}

// Get database instance
const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.')
  }
  return db
}

// Test connection
const testConnection = async () => {
  try {
    await databaseConfig.testConnection()
    return true
  } catch (error) {
    console.error('Database connection test failed:', error.message)
    return false
  }
}

// Close database connection
const closeConnection = async () => {
  if (db) {
    await databaseConfig.destroy()
    db = null
    console.log('✅ Database connection closed')
  }
}

// Auto-initialize for backward compatibility
const initPromise = initializeDatabase()
  .then(async (dbInstance) => {
    const fs = require('fs');
    const path = require('path');
    
    // Ensure database directory exists
    const dbDir = path.dirname(path.join(__dirname, '../../database/erp_nxt.sqlite'));
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Run migrations and seeds on first initialization
    try {
      await dbInstance.migrate.latest();
      console.log('✅ Database migrations completed');
      
      // Check if we need to seed data
      const userCount = await dbInstance('auth_users').count('id as count').first();
      if (parseInt(userCount.count) === 0) {
        await dbInstance.seed.run();
        console.log('✅ Database seeded with initial data');
      }
    } catch (error) {
      console.error('❌ Database initialization error:', error);
    }
    
    return dbInstance;
  })
  .catch(err => {
    console.warn('⚠️ Auto database initialization failed:', err.message)
  })

module.exports = {
  initializeDatabase,
  getDb,
  testConnection,
  closeConnection,
  // For backward compatibility
  get db() {
    return db
  }
}