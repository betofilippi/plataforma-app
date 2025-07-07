# ERP System Database Setup

This document provides comprehensive instructions for setting up the SQLite database for the ERP system.

## 🚀 Quick Start

To set up the complete database with sample data:

```bash
# Navigate to the backend directory
cd src/database

# Run the setup script
node setup.js
```

This will:
- Create the SQLite database file
- Run all migrations
- Populate with realistic sample data
- Display login credentials

## 📁 Database Structure

### Core Tables

1. **users** - System users with role-based access
2. **clients** - Customer data (individuals and companies)
3. **products** - Product catalog with pricing and inventory
4. **suppliers** - Supplier information and terms
5. **activities** - Audit trail and system activities

### Support Tables

- **product_categories** - Product categorization
- **client_categories** - Client classification
- **supplier_categories** - Supplier types
- **system_settings** - Application configuration

## 🔧 Database Configuration

### SQLite Configuration (`src/config/sqlite.js`)

- **Location**: `src/database/erp_system.sqlite`
- **Performance optimizations**: WAL mode, memory temp store, optimized cache
- **Full-text search**: FTS5 virtual tables for fast searching
- **Connection pooling**: Managed connection pool
- **Error handling**: Comprehensive error management

### Database Manager (`src/config/databaseManager.js`)

Supports both SQLite and PostgreSQL:

```javascript
const dbManager = require('./src/config/databaseManager');

// Auto-detect and configure best available database
await dbManager.autoDetectAndConfigure();

// Or manually specify database type
await dbManager.initialize({ dbType: 'sqlite' });
```

## 📊 Sample Data

### Users (6 users)
- **Admin**: admin@empresa.com.br / admin123
- **Manager**: gerente@empresa.com.br / manager123
- **Sales**: vendedor@empresa.com.br / user123
- **Inventory**: estoque@empresa.com.br / user123
- **Finance**: financeiro@empresa.com.br / user123
- **Viewer**: viewer@empresa.com.br / user123

### Clients (10 entries)
- 3 individual clients (CPF)
- 7 corporate clients (CNPJ)
- Realistic Brazilian addresses and documents
- Different categories and credit limits

### Products (15 items)
- Electronics (smartphones, laptops, tablets, TVs)
- Clothing and accessories
- Home and garden items
- Sports equipment
- Automotive parts
- Tools and office supplies
- Complete pricing and inventory data

### Suppliers (8 companies)
- Brazilian companies with real CNPJ format
- Different supplier categories
- Complete contact and financial information
- Regional distribution across Brazil

### System Settings
- Complete application configuration
- Security policies
- Business rules
- UI preferences

## 🛠 Available Scripts

### Setup and Initialization

```bash
# Complete database setup
node src/database/setup.js

# Initialize database only
node src/database/init.js init

# Reset database (delete and recreate)
node src/database/setup.js reset

# Create backup
node src/database/setup.js backup
```

### Database Management

```bash
# Check database health
node src/database/setup.js health

# Database manager CLI
node src/config/databaseManager.js status
node src/config/databaseManager.js auto
node src/config/databaseManager.js switch postgresql
```

### Individual Components

```bash
# Run migrations only
node src/database/init.js init --no-seeds

# Run seeds only
node src/database/init.js init --no-migrations

# Quiet mode
node src/database/init.js init --quiet
```

## 🔍 Features

### Full-Text Search
- **FTS5** virtual tables for clients, products, and suppliers
- **Real-time indexing** with triggers
- **Search API** through query helpers

### Performance Optimization
- **Composite indexes** for common queries
- **SQLite WAL mode** for better concurrency
- **Query monitoring** and slow query detection
- **Connection pooling** and optimization

### Error Handling
- **Comprehensive error handling** for all database operations
- **SQLite-specific error codes** handling
- **Transaction support** with automatic rollback
- **Connection recovery** and retry logic

### Audit Trail
- **Complete activity logging** for all operations
- **User action tracking** with IP and browser info
- **System event monitoring** 
- **Security event logging**

## 🔐 Security Features

### Password Security
- **bcrypt hashing** with salt rounds of 12
- **Password policies** defined in system settings
- **Force password change** capability
- **Login attempt monitoring**

### Data Protection
- **Input sanitization** and validation
- **SQL injection prevention** through parameterized queries
- **Foreign key constraints** enforcement
- **Data integrity checks**

## 📈 Query Helpers

The `queryHelpers.js` provides utilities for:

```javascript
const queryHelpers = require('./src/database/utils/queryHelpers');

// Paginated queries
const result = await queryHelpers.paginate(query, page, limit);

// Full-text search
const clients = await queryHelpers.searchTable('clients', 'João Silva');

// Batch operations
await queryHelpers.batchInsert('products', dataArray);

// Upsert operations
await queryHelpers.upsert('clients', clientData, ['cpf_cnpj']);

// Transaction support
await queryHelpers.transaction(async (trx) => {
  // Your transaction code here
});
```

## 🏗 Migration System

### Creating Migrations

```javascript
// src/database/migrations/003_new_feature.js
exports.up = async function(knex) {
  await knex.schema.createTable('new_table', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('new_table');
};
```

### Running Migrations

```bash
# Run all pending migrations
node src/database/init.js init --no-seeds

# Rollback last migration
node -e "require('./src/config/sqlite').getInstance().migrate.rollback()"
```

## 💾 Backup and Recovery

### Automatic Backups
- **Scheduled backups** (configurable frequency)
- **Retention policy** (configurable retention period)
- **Backup verification** and integrity checks

### Manual Backup
```bash
# Create named backup
node src/database/setup.js backup

# Create backup with custom name
node -e "require('./src/database/init').createBackup('my_backup.sqlite')"
```

### Recovery
```bash
# Restore from backup (manual process)
cp src/database/backups/backup_file.sqlite src/database/erp_system.sqlite
```

## 🌍 Internationalization

### Brazilian Business Data
- **Real Brazilian company names** and addresses
- **Proper CPF/CNPJ formatting** (11.222.333/0001-44)
- **Valid postal codes** and state abbreviations
- **Realistic phone numbers** in Brazilian format
- **Business categories** relevant to Brazilian market

### Tax Information
- **NCM codes** for product classification
- **ICMS, IPI, PIS, COFINS** tax rates
- **State and municipal registrations**
- **Brazilian business document formats**

## 🚨 Troubleshooting

### Common Issues

1. **Database locked error**
   ```bash
   # Check for existing connections
   node src/config/databaseManager.js status
   
   # Force close connections
   pkill -f "node.*database"
   ```

2. **Permission errors**
   ```bash
   # Check file permissions
   ls -la src/database/
   
   # Fix permissions
   chmod 664 src/database/erp_system.sqlite
   ```

3. **Migration errors**
   ```bash
   # Check migration status
   node -e "require('./src/config/sqlite').getInstance().migrate.currentVersion().then(console.log)"
   
   # Reset and retry
   node src/database/setup.js reset
   ```

### Database Integrity

```bash
# Check database integrity
node -e "require('./src/config/sqlite').getInstance().raw('PRAGMA integrity_check').then(console.log)"

# Vacuum database
node -e "require('./src/config/sqlite').getInstance().raw('VACUUM').then(() => console.log('Done'))"
```

## 📚 API Reference

### Database Manager Methods

- `initialize(options)` - Initialize database connection
- `getInstance()` - Get database instance
- `testConnection()` - Test database connectivity
- `runMigrations()` - Execute pending migrations
- `getHealthStatus()` - Get database health information
- `createBackup(name)` - Create database backup
- `destroy()` - Close database connection

### Query Helpers Methods

- `paginate(query, page, limit)` - Paginated query execution
- `searchTable(table, term, columns, options)` - Full-text search
- `batchInsert(table, data, options)` - Batch insert with conflict resolution
- `upsert(table, data, conflictColumns)` - Insert or update operation
- `findById(table, id, columns)` - Find record by ID
- `softDelete(table, id, userId)` - Soft delete with audit
- `logActivity(activityData)` - Log user activity
- `transaction(callback)` - Execute in transaction

## 🔄 Environment Variables

```bash
# Database configuration
DB_TYPE=sqlite                    # Database type (sqlite/postgresql)
DB_DEBUG=false                   # Enable query debugging
DB_LOG_QUERIES=false            # Log all queries

# SQLite specific
SQLITE_DB_PATH=./database/erp_system.sqlite

# PostgreSQL fallback
DB_HOST=localhost
DB_PORT=5432
DB_NAME=erp_nxt
DB_USER=postgres
DB_PASSWORD=postgres
```

## 📋 Production Checklist

- [ ] Change default user passwords
- [ ] Configure automated backups
- [ ] Set up monitoring and alerting
- [ ] Configure log rotation
- [ ] Test disaster recovery procedures
- [ ] Set appropriate file permissions
- [ ] Configure environment variables
- [ ] Enable query optimization
- [ ] Set up database maintenance tasks

---

**Note**: This database setup is production-ready and includes all necessary components for a complete ERP system. The sample data is realistic and follows Brazilian business standards and formats.