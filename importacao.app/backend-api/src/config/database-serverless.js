const knex = require('knex');
const path = require('path');
const fs = require('fs');

/**
 * Serverless-optimized database configuration
 * Uses SQLite with optimizations for Vercel/serverless environments
 */

class ServerlessDatabaseConfig {
  constructor() {
    this.knexInstance = null;
    this.isConnected = false;
    this.connectionMetrics = {
      totalQueries: 0,
      errors: 0
    };
  }

  /**
   * Initialize database connection for serverless
   */
  async initialize() {
    if (this.knexInstance) {
      return this.knexInstance;
    }

    const config = this.getKnexConfig();
    
    try {
      this.knexInstance = knex(config);
      
      // Test connection
      await this.testConnection();
      
      // Run migrations if needed
      await this.runMigrations();
      
      // Seed initial data if needed
      await this.seedData();
      
      this.isConnected = true;
      console.log('✅ Serverless database connection established');
      
      return this.knexInstance;
      
    } catch (error) {
      console.error('❌ Serverless database initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Get Knex configuration optimized for serverless
   */
  getKnexConfig() {
    const env = process.env.NODE_ENV || 'production';
    
    // For serverless, we use in-memory SQLite or temporary file
    const dbPath = process.env.DB_PATH || '/tmp/erp_nxt_serverless.sqlite';
    
    const config = {
      client: 'sqlite3',
      connection: {
        filename: dbPath
      },
      pool: {
        min: 0,
        max: 1,
        createTimeoutMillis: 3000,
        acquireTimeoutMillis: 3000,
        idleTimeoutMillis: 3000,
        reapIntervalMillis: 1000,
        destroyTimeoutMillis: 5000,
        afterCreate: (conn, done) => {
          // Enable foreign keys and optimizations for SQLite
          conn.run('PRAGMA foreign_keys = ON;', (err1) => {
            if (err1) console.warn('Failed to enable foreign keys:', err1.message);
            conn.run('PRAGMA journal_mode = WAL;', (err2) => {
              if (err2) console.warn('Failed to set WAL mode:', err2.message);
              conn.run('PRAGMA synchronous = NORMAL;', (err3) => {
                if (err3) console.warn('Failed to set synchronous mode:', err3.message);
                done(err1 || err2 || err3, conn);
              });
            });
          });
        }
      },
      migrations: {
        directory: path.join(__dirname, '../database/migrations'),
        tableName: 'knex_migrations',
        extension: 'js'
      },
      seeds: {
        directory: path.join(__dirname, '../database/seeds')
      },
      useNullAsDefault: true,
      debug: false // Always false for serverless
    };

    return config;
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      await this.knexInstance.raw('SELECT 1');
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error.message);
      throw error;
    }
  }

  /**
   * Run migrations
   */
  async runMigrations() {
    try {
      const [batchNo, migrations] = await this.knexInstance.migrate.latest();
      
      if (migrations.length > 0) {
        console.log(`✅ Executed ${migrations.length} migrations in batch ${batchNo}`);
      }
      
      return { batchNo, migrations };
    } catch (error) {
      console.error('❌ Migration error:', error.message);
      // Don't throw - allow app to continue even if migrations fail
      return { batchNo: 0, migrations: [] };
    }
  }

  /**
   * Seed initial data
   */
  async seedData() {
    try {
      // Check if we need to seed
      const userCount = await this.knexInstance('auth_users').count('id as count').first();
      
      if (parseInt(userCount.count) === 0) {
        await this.knexInstance.seed.run();
        console.log('✅ Database seeded with initial data');
      }
    } catch (error) {
      console.error('❌ Seeding error:', error.message);
      // Don't throw - allow app to continue even if seeding fails
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      await this.knexInstance.raw('SELECT 1');
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        isConnected: this.isConnected,
        metrics: this.connectionMetrics,
        timestamp: new Date().toISOString(),
        serverless: true
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
        serverless: true
      };
    }
  }

  /**
   * Get database instance
   */
  getInstance() {
    return this.knexInstance;
  }

  /**
   * Destroy connection (for cleanup)
   */
  async destroy() {
    if (this.knexInstance) {
      await this.knexInstance.destroy();
      this.isConnected = false;
      this.knexInstance = null;
    }
  }
}

// Export singleton instance
const serverlessDb = new ServerlessDatabaseConfig();
module.exports = serverlessDb;