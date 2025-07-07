#!/usr/bin/env node

/**
 * Database Setup Script
 * Complete database initialization for the ERP system
 */

const dbInitializer = require('./init');
const sqliteConfig = require('../config/sqlite');

async function setupDatabase() {
  console.log('🚀 Starting ERP Database Setup...');
  console.log('=====================================\n');

  try {
    // Initialize database with migrations and seeds
    await dbInitializer.initialize({
      runMigrations: true,
      runSeeds: true,
      verbose: true
    });

    // Show final status
    console.log('\n🎉 Database Setup Complete!');
    console.log('=====================================');
    
    // Display connection info
    const stats = sqliteConfig.getConnectionStats();
    console.log('\n📊 Database Status:');
    console.log(`   Database Path: ${stats.databasePath}`);
    console.log(`   Database Size: ${stats.databaseSize} bytes`);
    console.log(`   Connection Status: ${stats.isConnected ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`   Last Connected: ${stats.metrics.lastConnected || 'Never'}`);

    // Display sample data summary
    console.log('\n📋 Sample Data Created:');
    console.log('   👤 Users: 6 (1 admin, 1 manager, 4 users)');
    console.log('   👥 Clients: 10 (3 individuals, 7 companies)');
    console.log('   📦 Products: 15 (across multiple categories)');
    console.log('   🏪 Suppliers: 8 (various business types)');
    console.log('   📊 Categories: Product, Client, and Supplier categories');
    console.log('   ⚙️  System Settings: Complete configuration');
    console.log('   📝 Activities: 20 sample audit entries');

    // Display login credentials
    console.log('\n🔐 Default Login Credentials:');
    console.log('   Admin: admin@empresa.com.br / admin123');
    console.log('   Manager: gerente@empresa.com.br / manager123');
    console.log('   User: vendedor@empresa.com.br / user123');
    console.log('   ⚠️  Remember to change these passwords in production!');

    console.log('\n✨ Your ERP database is ready to use!');
    console.log('   You can now start the backend server and begin using the system.');

    // Close connection
    await sqliteConfig.destroy();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    console.error('\nError details:', error);
    
    // Close connection on error
    try {
      await sqliteConfig.destroy();
    } catch (closeError) {
      console.error('Failed to close database connection:', closeError.message);
    }
    
    process.exit(1);
  }
}

// Handle CLI commands
const command = process.argv[2];

switch (command) {
  case 'init':
  case 'setup':
  default:
    setupDatabase();
    break;
    
  case 'reset':
    console.log('🔄 Resetting database...');
    dbInitializer.resetDatabase()
      .then(() => {
        console.log('✅ Database reset complete');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Reset failed:', error.message);
        process.exit(1);
      });
    break;
    
  case 'backup':
    console.log('💾 Creating database backup...');
    dbInitializer.createBackup()
      .then(backupPath => {
        console.log(`✅ Backup created: ${backupPath}`);
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Backup failed:', error.message);
        process.exit(1);
      });
    break;
    
  case 'health':
    console.log('🏥 Checking database health...');
    dbInitializer.healthCheck()
      .then(health => {
        console.log('✅ Health check result:');
        console.log(JSON.stringify(health, null, 2));
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Health check failed:', error.message);
        process.exit(1);
      });
    break;
    
  case 'help':
    console.log(`
ERP Database Setup Tool

Usage: node setup.js [command]

Commands:
  init, setup    Initialize database with migrations and sample data (default)
  reset          Reset database (delete and recreate)
  backup         Create database backup
  health         Check database health
  help           Show this help message

Examples:
  node setup.js              # Initialize database
  node setup.js init          # Same as above
  node setup.js reset         # Reset database
  node setup.js backup        # Create backup
  node setup.js health        # Health check
    `);
    process.exit(0);
    break;
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n🛑 Setup interrupted by user');
  try {
    await sqliteConfig.destroy();
  } catch (error) {
    // Ignore errors during cleanup
  }
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Setup terminated');
  try {
    await sqliteConfig.destroy();
  } catch (error) {
    // Ignore errors during cleanup
  }
  process.exit(1);
});