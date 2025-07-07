/**
 * Database Manager
 * Manages database connections for both PostgreSQL and SQLite
 */

const path = require('path');
const sqliteConfig = require('./sqlite');
const postgresConfig = require('./database'); // Original PostgreSQL config

class DatabaseManager {
  constructor() {
    this.currentDb = null;
    this.dbType = null;
    this.isInitialized = false;
  }

  /**
   * Initialize database based on environment configuration
   */
  async initialize(options = {}) {
    const { 
      dbType = process.env.DB_TYPE || 'sqlite',
      force = false 
    } = options;

    try {
      if (this.isInitialized && !force) {
        return this.currentDb;
      }

      console.log(`🔄 Initializing ${dbType.toUpperCase()} database...`);

      if (dbType === 'sqlite') {
        this.currentDb = await sqliteConfig.initialize();
        this.dbType = 'sqlite';
        console.log('✅ SQLite database initialized');
      } else if (dbType === 'postgresql' || dbType === 'postgres') {
        this.currentDb = await postgresConfig.initialize();
        this.dbType = 'postgresql';
        console.log('✅ PostgreSQL database initialized');
      } else {
        throw new Error(`Unsupported database type: ${dbType}`);
      }

      this.isInitialized = true;
      return this.currentDb;

    } catch (error) {
      console.error(`❌ Database initialization failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get current database instance
   */
  getInstance() {
    if (!this.isInitialized || !this.currentDb) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.currentDb;
  }

  /**
   * Get database type
   */
  getType() {
    return this.dbType;
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      if (this.dbType === 'sqlite') {
        return await sqliteConfig.testConnection();
      } else if (this.dbType === 'postgresql') {
        return await postgresConfig.testConnection();
      }
      throw new Error('No database configured');
    } catch (error) {
      console.error('Database connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    try {
      if (this.dbType === 'sqlite') {
        return await sqliteConfig.runMigrations();
      } else if (this.dbType === 'postgresql') {
        return await postgresConfig.runMigrations();
      }
      throw new Error('No database configured');
    } catch (error) {
      console.error('Migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Get database health status
   */
  async getHealthStatus() {
    try {
      if (this.dbType === 'sqlite') {
        return await sqliteConfig.healthCheck();
      } else if (this.dbType === 'postgresql') {
        return await postgresConfig.healthCheck();
      }
      throw new Error('No database configured');
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    try {
      if (this.dbType === 'sqlite') {
        return {
          ...sqliteConfig.getConnectionStats(),
          type: 'sqlite'
        };
      } else if (this.dbType === 'postgresql') {
        return {
          ...postgresConfig.getConnectionStats(),
          type: 'postgresql'
        };
      }
      return { type: 'none', isConnected: false };
    } catch (error) {
      return { 
        type: this.dbType || 'unknown', 
        isConnected: false, 
        error: error.message 
      };
    }
  }

  /**
   * Close database connection
   */
  async destroy() {
    try {
      if (this.dbType === 'sqlite') {
        await sqliteConfig.destroy();
      } else if (this.dbType === 'postgresql') {
        await postgresConfig.destroy();
      }
      
      this.currentDb = null;
      this.dbType = null;
      this.isInitialized = false;
      
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error.message);
      throw error;
    }
  }

  /**
   * Switch database type (for development/testing)
   */
  async switchDatabase(newDbType) {
    console.log(`🔄 Switching from ${this.dbType} to ${newDbType}...`);
    
    // Close current connection
    await this.destroy();
    
    // Initialize new database
    await this.initialize({ dbType: newDbType, force: true });
    
    console.log(`✅ Successfully switched to ${newDbType}`);
  }

  /**
   * Create database backup (SQLite only)
   */
  async createBackup(backupName = null) {
    if (this.dbType !== 'sqlite') {
      throw new Error('Backup is only supported for SQLite databases');
    }
    
    try {
      if (!backupName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        backupName = `erp_backup_${timestamp}.sqlite`;
      }
      
      const backupPath = path.join(__dirname, '../database/backups', backupName);
      return await sqliteConfig.backup(backupPath);
    } catch (error) {
      console.error('Backup creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get database configuration info
   */
  getConfig() {
    return {
      type: this.dbType,
      isInitialized: this.isInitialized,
      hasConnection: !!this.currentDb,
      supportedTypes: ['sqlite', 'postgresql'],
      currentConfig: this.dbType === 'sqlite' ? {
        path: sqliteConfig.dbPath,
        size: sqliteConfig.getConnectionStats().databaseSize
      } : this.dbType === 'postgresql' ? {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'erp_nxt'
      } : null
    };
  }

  /**
   * Auto-detect and configure database based on environment
   */
  async autoDetectAndConfigure() {
    // Check if PostgreSQL connection is available
    if (process.env.DB_HOST && process.env.DB_NAME) {
      try {
        console.log('🔍 Attempting PostgreSQL connection...');
        await this.initialize({ dbType: 'postgresql' });
        console.log('✅ PostgreSQL detected and configured');
        return 'postgresql';
      } catch (error) {
        console.log('⚠️ PostgreSQL not available, falling back to SQLite');
      }
    }

    // Fall back to SQLite
    try {
      await this.initialize({ dbType: 'sqlite' });
      console.log('✅ SQLite configured as default database');
      return 'sqlite';
    } catch (error) {
      console.error('❌ Failed to configure any database:', error.message);
      throw new Error('No database could be configured');
    }
  }
}

// Export singleton instance
const databaseManager = new DatabaseManager();

module.exports = databaseManager;

// CLI interface for database management
if (require.main === module) {
  const command = process.argv[2];
  const dbType = process.argv[3] || 'sqlite';

  async function runCommand() {
    try {
      switch (command) {
        case 'init':
          await databaseManager.initialize({ dbType });
          console.log(`Database initialized with ${databaseManager.getType()}`);
          break;
          
        case 'switch':
          const currentType = databaseManager.getType();
          const newType = dbType;
          if (currentType === newType) {
            console.log(`Already using ${currentType}`);
            return;
          }
          await databaseManager.switchDatabase(newType);
          break;
          
        case 'status':
          const config = databaseManager.getConfig();
          const stats = databaseManager.getConnectionStats();
          console.log('Database Status:');
          console.log(JSON.stringify({ config, stats }, null, 2));
          break;
          
        case 'test':
          await databaseManager.initialize({ dbType });
          const isHealthy = await databaseManager.testConnection();
          console.log(`Connection test: ${isHealthy ? '✅ Healthy' : '❌ Failed'}`);
          break;
          
        case 'auto':
          const detectedType = await databaseManager.autoDetectAndConfigure();
          console.log(`Auto-configured database: ${detectedType}`);
          break;
          
        default:
          console.log(`
Database Manager CLI

Usage: node databaseManager.js <command> [database_type]

Commands:
  init [type]    Initialize database (sqlite or postgresql)
  switch [type]  Switch database type
  status         Show current database status
  test [type]    Test database connection
  auto           Auto-detect and configure best available database
  
Database Types:
  sqlite         SQLite database (default)
  postgresql     PostgreSQL database
  
Examples:
  node databaseManager.js init sqlite
  node databaseManager.js switch postgresql
  node databaseManager.js status
  node databaseManager.js auto
          `);
          break;
      }
    } catch (error) {
      console.error('Command failed:', error.message);
      process.exit(1);
    } finally {
      try {
        await databaseManager.destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  runCommand();
}