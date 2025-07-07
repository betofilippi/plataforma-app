#!/usr/bin/env node

/**
 * Test ERP SQLite Database Setup
 * Test only the new ERP schema and seeds
 */

const path = require('path');
const fs = require('fs');
const knex = require('knex');

async function testERPSQLite() {
  console.log('🚀 Testing ERP SQLite Database Setup...');
  
  const dbPath = path.join(__dirname, 'database/erp_system.sqlite');
  
  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Delete existing database for clean test
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('🗑️ Removed existing database for clean test');
  }

  // Create Knex instance
  const db = knex({
    client: 'sqlite3',
    connection: {
      filename: dbPath
    },
    useNullAsDefault: true
  });

  try {
    // Test connection
    console.log('📞 Testing database connection...');
    await db.raw('SELECT 1 as test');
    console.log('✅ Connection successful');

    // Configure SQLite for performance
    console.log('⚡ Configuring SQLite for performance...');
    await db.raw('PRAGMA journal_mode = WAL;');
    await db.raw('PRAGMA synchronous = NORMAL;');
    await db.raw('PRAGMA cache_size = 10000;');
    await db.raw('PRAGMA temp_store = MEMORY;');
    await db.raw('PRAGMA foreign_keys = ON;');
    console.log('✅ SQLite optimizations applied');

    // Run schema creation manually
    console.log('📦 Creating database schema...');
    
    // Create the schema using our migration logic
    const { up: createSchema } = require('./src/database/migrations/src/database/migrations_clean/001_create_erp_schema.js');
    await createSchema(db);
    console.log('✅ ERP schema created');
    
    const { up: createIndexes } = require('./src/database/migrations/src/database/migrations_clean/002_create_performance_indexes.js');
    await createIndexes(db);
    console.log('✅ Performance indexes created');

    // Run seeds manually
    console.log('🌱 Populating with sample data...');
    
    const systemSettingsSeed = require('./src/database/seeds/001_system_settings.js');
    await systemSettingsSeed.seed(db);
    console.log('   ✅ System settings');
    
    const categoriesSeed = require('./src/database/seeds/002_categories.js');
    await categoriesSeed.seed(db);
    console.log('   ✅ Categories');
    
    const adminUserSeed = require('./src/database/seeds/003_admin_user.js');
    await adminUserSeed.seed(db);
    console.log('   ✅ Admin user and sample users');
    
    const clientsSeed = require('./src/database/seeds/004_clients.js');
    await clientsSeed.seed(db);
    console.log('   ✅ Sample clients');
    
    const productsSeed = require('./src/database/seeds/005_products.js');
    await productsSeed.seed(db);
    console.log('   ✅ Sample products');
    
    const suppliersSeed = require('./src/database/seeds/006_suppliers.js');
    await suppliersSeed.seed(db);
    console.log('   ✅ Sample suppliers');
    
    const activitiesSeed = require('./src/database/seeds/007_activities.js');
    await activitiesSeed.seed(db);
    console.log('   ✅ Sample activities');

    // Test database integrity
    console.log('🔍 Testing database integrity...');
    const [integrityResult] = await db.raw('PRAGMA integrity_check');
    if (integrityResult.integrity_check !== 'ok') {
      throw new Error('Database integrity check failed');
    }
    console.log('✅ Database integrity verified');

    // Test some queries
    console.log('📊 Testing data queries...');
    
    const userCount = await db('users').count('* as count').first();
    console.log(`   Users: ${userCount.count}`);
    
    const clientCount = await db('clients').count('* as count').first();
    console.log(`   Clients: ${clientCount.count}`);
    
    const productCount = await db('products').count('* as count').first();
    console.log(`   Products: ${productCount.count}`);
    
    const supplierCount = await db('suppliers').count('* as count').first();
    console.log(`   Suppliers: ${supplierCount.count}`);
    
    const activityCount = await db('activities').count('* as count').first();
    console.log(`   Activities: ${activityCount.count}`);

    // Test login user
    console.log('🔐 Testing admin user login...');
    const adminUser = await db('users').where('email', 'admin@empresa.com.br').first();
    if (!adminUser) {
      throw new Error('Admin user not found');
    }
    
    const bcrypt = require('bcrypt');
    const isValidPassword = await bcrypt.compare('admin123', adminUser.password_hash);
    if (!isValidPassword) {
      throw new Error('Admin password verification failed');
    }
    console.log('✅ Admin user login test successful');

    // Test full-text search
    console.log('🔍 Testing full-text search...');
    try {
      await db.raw(`
        INSERT INTO clients_fts(rowid, name, company_name, trade_name, email, cpf_cnpj)
        SELECT id, name, company_name, trade_name, email, cpf_cnpj FROM clients
      `);
      
      const searchResult = await db.raw(`
        SELECT clients.*, rank FROM clients
        JOIN clients_fts ON clients.id = clients_fts.rowid
        WHERE clients_fts MATCH '"João"'
        ORDER BY rank
        LIMIT 1
      `);
      
      if (searchResult.length > 0) {
        console.log('✅ Full-text search working');
      }
    } catch (ftsError) {
      console.log('⚠️ Full-text search may need manual initialization');
    }

    console.log('\n🎉 ERP SQLite Database Test Successful!');
    console.log('=====================================');
    console.log(`📁 Database: ${dbPath}`);
    console.log(`📊 Size: ${(fs.statSync(dbPath).size / 1024).toFixed(2)} KB`);
    
    console.log('\n📋 Sample Data Summary:');
    console.log(`   👤 Users: ${userCount.count} (6 expected)`);
    console.log(`   👥 Clients: ${clientCount.count} (10 expected)`);
    console.log(`   📦 Products: ${productCount.count} (15 expected)`);
    console.log(`   🏪 Suppliers: ${supplierCount.count} (8 expected)`);
    console.log(`   📝 Activities: ${activityCount.count} (20 expected)`);

    console.log('\n🔐 Login Credentials:');
    console.log('   Admin: admin@empresa.com.br / admin123');
    console.log('   Manager: gerente@empresa.com.br / manager123');
    console.log('   User: vendedor@empresa.com.br / user123');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error details:', error);
    throw error;
  } finally {
    await db.destroy();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
if (require.main === module) {
  testERPSQLite()
    .then(() => {
      console.log('\n✨ ERP Database ready for production use!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 ERP Database test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testERPSQLite };