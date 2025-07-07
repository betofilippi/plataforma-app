/**
 * Database Initialization Script
 * Handles database setup, migrations, and seeding
 */

const path = require('path');
const fs = require('fs');
const sqliteConfig = require('../config/sqlite');
const queryHelpers = require('./utils/queryHelpers');

class DatabaseInitializer {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the complete database setup
   */
  async initialize(options = {}) {
    const { 
      runMigrations = true, 
      runSeeds = true, 
      force = false,
      verbose = true 
    } = options;

    try {
      if (verbose) {
        console.log('🚀 Starting database initialization...');
      }

      // Initialize SQLite connection
      await this.initializeConnection();

      // Run migrations if requested
      if (runMigrations) {
        await this.runMigrations();
      }

      // Run seeds if requested
      if (runSeeds) {
        await this.runSeeds();
      }

      // Initialize FTS tables
      await this.initializeFTSTables();

      // Verify database integrity
      await this.verifyDatabase();

      this.isInitialized = true;

      if (verbose) {
        console.log('✅ Database initialization completed successfully!');
        await this.printDatabaseInfo();
      }

      return true;

    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Initialize database connection
   */
  async initializeConnection() {
    try {
      this.db = await sqliteConfig.initialize();
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    try {
      console.log('🔄 Running database migrations...');
      
      const result = await sqliteConfig.runMigrations();
      
      if (result.migrations.length > 0) {
        console.log(`✅ Executed ${result.migrations.length} migrations:`);
        result.migrations.forEach(migration => {
          console.log(`  - ${migration}`);
        });
      } else {
        console.log('✅ All migrations are up to date');
      }
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Run database seeds
   */
  async runSeeds() {
    try {
      console.log('🌱 Running database seeds...');
      
      // Check if seeds directory exists
      const seedsDir = path.join(__dirname, 'seeds');
      if (!fs.existsSync(seedsDir)) {
        console.log('⚠️ Seeds directory not found, skipping seeding');
        return;
      }

      await sqliteConfig.runSeeds();
      console.log('✅ Seeds executed successfully');
    } catch (error) {
      console.error('❌ Seeding failed:', error.message);
      throw error;
    }
  }

  /**
   * Initialize FTS tables with existing data
   */
  async initializeFTSTables() {
    try {
      console.log('🔍 Initializing full-text search tables...');
      
      const db = sqliteConfig.getInstance();
      
      // Populate clients FTS
      await db.raw(`
        INSERT INTO clients_fts(rowid, name, company_name, trade_name, email, cpf_cnpj)
        SELECT id, name, company_name, trade_name, email, cpf_cnpj FROM clients
      `);

      // Populate products FTS
      await db.raw(`
        INSERT INTO products_fts(rowid, code, description, detailed_description, category, brand, model)
        SELECT id, code, description, detailed_description, category, brand, model FROM products
      `);

      // Populate suppliers FTS
      await db.raw(`
        INSERT INTO suppliers_fts(rowid, name, company_name, trade_name, contact_person, email)
        SELECT id, name, company_name, trade_name, contact_person, email FROM suppliers
      `);

      console.log('✅ Full-text search tables initialized');
    } catch (error) {
      // FTS initialization is not critical, so we just warn
      console.warn('⚠️ FTS initialization warning:', error.message);
    }
  }

  /**
   * Verify database integrity
   */
  async verifyDatabase() {
    try {
      console.log('🔍 Verifying database integrity...');
      
      const db = sqliteConfig.getInstance();
      
      // Check database integrity
      const [integrityResult] = await db.raw('PRAGMA integrity_check');
      if (integrityResult.integrity_check !== 'ok') {
        throw new Error('Database integrity check failed');
      }

      // Check foreign key constraints
      const [foreignKeyResult] = await db.raw('PRAGMA foreign_key_check');
      if (foreignKeyResult) {
        console.warn('⚠️ Foreign key constraint violations detected');
      }

      // Verify tables exist
      const requiredTables = [
        'users', 'clients', 'products', 'suppliers', 'activities',
        'product_categories', 'client_categories', 'supplier_categories',
        'system_settings'
      ];

      for (const table of requiredTables) {
        const exists = await queryHelpers.tableExists(table);
        if (!exists) {
          throw new Error(`Required table '${table}' does not exist`);
        }
      }

      console.log('✅ Database integrity verified');
    } catch (error) {
      console.error('❌ Database verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Print database information
   */
  async printDatabaseInfo() {
    try {
      const info = await queryHelpers.getDatabaseInfo();
      const stats = await sqliteConfig.getConnectionStats();
      
      console.log('\n📊 Database Information:');
      console.log(`   Database file: ${stats.databasePath}`);
      console.log(`   Database size: ${info.sizeFormatted}`);
      console.log(`   Tables: ${info.tables.length}`);
      console.log(`   Connection status: ${stats.isConnected ? 'Connected' : 'Disconnected'}`);
      
      console.log('\n📋 Tables:');
      info.tables.forEach(table => {
        console.log(`   - ${table}`);
      });
    } catch (error) {
      console.warn('⚠️ Could not retrieve database info:', error.message);
    }
  }

  /**
   * Reset database (drop and recreate)
   */
  async resetDatabase() {
    try {
      console.log('🔄 Resetting database...');
      
      // Close existing connection
      await sqliteConfig.destroy();
      
      // Delete database file
      const dbPath = sqliteConfig.dbPath;
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log('✅ Database file deleted');
      }
      
      // Re-initialize
      await this.initialize();
      
      console.log('✅ Database reset completed');
    } catch (error) {
      console.error('❌ Database reset failed:', error.message);
      throw error;
    }
  }

  /**
   * Create database backup
   */
  async createBackup(backupName = null) {
    try {
      if (!backupName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        backupName = `backup_${timestamp}.sqlite`;
      }
      
      const backupPath = path.join(__dirname, '../backups', backupName);
      
      // Ensure backup directory exists
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      await sqliteConfig.backup(backupPath);
      console.log(`✅ Database backup created: ${backupPath}`);
      
      return backupPath;
    } catch (error) {
      console.error('❌ Backup creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      return await sqliteConfig.healthCheck();
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      throw error;
    }
  }

  /**
   * Get initialization status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      connected: sqliteConfig.isConnected,
      databasePath: sqliteConfig.dbPath
    };
  }
}

// Export singleton instance
const dbInitializer = new DatabaseInitializer();

module.exports = dbInitializer;

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const options = {};
  
  // Parse command line arguments
  process.argv.slice(3).forEach(arg => {
    if (arg === '--no-migrations') options.runMigrations = false;
    if (arg === '--no-seeds') options.runSeeds = false;
    if (arg === '--force') options.force = true;
    if (arg === '--quiet') options.verbose = false;
  });

  async function runCommand() {
    try {
      switch (command) {
        case 'init':
          await dbInitializer.initialize(options);
          break;
        case 'reset':
          await dbInitializer.resetDatabase();
          break;
        case 'backup':
          await dbInitializer.createBackup();
          break;
        case 'health':
          const health = await dbInitializer.healthCheck();
          console.log('Health check result:', JSON.stringify(health, null, 2));
          break;
        case 'info':
          await dbInitializer.printDatabaseInfo();
          break;
        default:
          console.log(`
Usage: node init.js <command> [options]

Commands:
  init       Initialize database with migrations and seeds
  reset      Reset database (drop and recreate)
  backup     Create database backup
  health     Check database health
  info       Show database information

Options:
  --no-migrations   Skip running migrations
  --no-seeds       Skip running seeds
  --force          Force operation
  --quiet          Quiet output
          `);
          break;
      }
    } catch (error) {
      console.error('Command failed:', error.message);
      process.exit(1);
    }
  }

  runCommand();
}