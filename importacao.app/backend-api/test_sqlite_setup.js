#!/usr/bin/env node

/**
 * Test SQLite Database Setup
 * Direct test of SQLite database initialization
 */

const path = require('path');
const fs = require('fs');

// Simple SQLite configuration for testing
const knex = require('knex');

async function testSQLiteSetup() {
  console.log('🧪 Testing SQLite Database Setup...');
  
  const dbPath = path.join(__dirname, 'database/erp_test.sqlite');
  
  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Create Knex instance
  const db = knex({
    client: 'sqlite3',
    connection: {
      filename: dbPath
    },
    useNullAsDefault: true,
    migrations: {
      directory: './src/database/migrations/src/database/migrations_clean'
    },
    seeds: {
      directory: './src/database/seeds'
    }
  });

  try {
    // Test connection
    console.log('📞 Testing database connection...');
    await db.raw('SELECT 1 as test');
    console.log('✅ Connection successful');

    // Run migrations
    console.log('📦 Running migrations...');
    const [batchNo, migrations] = await db.migrate.latest();
    
    if (migrations.length > 0) {
      console.log(`✅ Executed ${migrations.length} migrations in batch ${batchNo}`);
      migrations.forEach(migration => {
        console.log(`  - ${migration}`);
      });
    } else {
      console.log('✅ All migrations are up to date');
    }

    // Check if bcrypt is available
    console.log('🔐 Testing bcrypt...');
    const bcrypt = require('bcrypt');
    const testPassword = await bcrypt.hash('test123', 12);
    console.log('✅ bcrypt working correctly');

    // Run seeds
    console.log('🌱 Running seeds...');
    await db.seed.run();
    console.log('✅ Seeds executed successfully');

    // Test some queries
    console.log('🔍 Testing queries...');
    
    const userCount = await db('users').count('* as count').first();
    console.log(`   Users: ${userCount.count}`);
    
    const clientCount = await db('clients').count('* as count').first();
    console.log(`   Clients: ${clientCount.count}`);
    
    const productCount = await db('products').count('* as count').first();
    console.log(`   Products: ${productCount.count}`);
    
    const supplierCount = await db('suppliers').count('* as count').first();
    console.log(`   Suppliers: ${supplierCount.count}`);

    console.log('\n🎉 SQLite Database Test Successful!');
    console.log(`📁 Database created at: ${dbPath}`);
    console.log(`📊 Database size: ${fs.statSync(dbPath).size} bytes`);

    // Show login credentials
    console.log('\n🔐 Test Login Credentials:');
    console.log('   Admin: admin@empresa.com.br / admin123');
    console.log('   Manager: gerente@empresa.com.br / manager123');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error details:', error);
    throw error;
  } finally {
    await db.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
if (require.main === module) {
  testSQLiteSetup()
    .then(() => {
      console.log('\n✨ Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testSQLiteSetup };