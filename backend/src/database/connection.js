const knex = require('knex')
const knexConfig = require('../../knexfile')

const environment = process.env.NODE_ENV || 'development'
const config = knexConfig[environment]

// Create and export the database connection
const db = knex(config)

// Test connection on startup (non-blocking for development)
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ Database connection established successfully')
  })
  .catch((err) => {
    console.warn('⚠️ Database connection failed (continuing in mock mode):', err.message)
    // Don't exit in development mode - allow mock data to work
  })

module.exports = db