const knex = require('knex');
const path = require('path');
const fs = require('fs');
const { performanceMonitor } = require('../utils/performanceMonitor');

/**
 * Configuração SQLite para o sistema ERP
 */
class SQLiteConfig {
  constructor() {
    this.knexInstance = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    this.dbPath = path.join(__dirname, '../../database/erp_system.sqlite');
    this.connectionMetrics = {
      totalQueries: 0,
      slowQueries: 0,
      errorCount: 0,
      lastConnected: null
    };
  }

  /**
   * Inicializar conexão SQLite
   */
  async initialize() {
    try {
      // Garantir que o diretório existe
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const config = this.getKnexConfig();
      this.knexInstance = knex(config);
      
      // Configurar eventos de monitoramento
      this.setupMonitoring();
      
      // Testar conexão
      await this.testConnection();
      
      // Configurar SQLite para performance
      await this.configurePerformance();
      
      this.isConnected = true;
      this.connectionAttempts = 0;
      this.connectionMetrics.lastConnected = new Date();
      
      console.log('✅ SQLite database connection established successfully');
      console.log(`📁 Database path: ${this.dbPath}`);
      
      return this.knexInstance;
      
    } catch (error) {
      this.connectionAttempts++;
      console.error(`❌ SQLite connection error (attempt ${this.connectionAttempts}):`, error.message);
      
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log(`🔄 Retrying connection in 2 seconds...`);
        await this.sleep(2000);
        return this.initialize();
      } else {
        throw new Error(`Failed to connect to SQLite after ${this.maxConnectionAttempts} attempts`);
      }
    }
  }

  /**
   * Configuração do Knex para SQLite
   */
  getKnexConfig() {
    const env = process.env.NODE_ENV || 'development';
    
    const config = {
      client: 'sqlite3',
      connection: {
        filename: this.dbPath
      },
      useNullAsDefault: true,
      pool: {
        min: 1,
        max: 10,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
        afterCreate: (conn, done) => {
          // Configurações SQLite específicas
          conn.run('PRAGMA foreign_keys = ON;', done);
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
      debug: env === 'development' && process.env.DB_DEBUG === 'true'
    };

    // Configurações específicas por ambiente
    if (env === 'test') {
      config.connection.filename = path.join(__dirname, '../../database/erp_test.sqlite');
    } else if (env === 'production') {
      config.pool.min = 2;
      config.pool.max = 20;
      config.debug = false;
    }

    return config;
  }

  /**
   * Configurar SQLite para performance
   */
  async configurePerformance() {
    try {
      // Configurações de performance do SQLite
      await this.knexInstance.raw('PRAGMA journal_mode = WAL;');
      await this.knexInstance.raw('PRAGMA synchronous = NORMAL;');
      await this.knexInstance.raw('PRAGMA cache_size = 10000;');
      await this.knexInstance.raw('PRAGMA temp_store = MEMORY;');
      await this.knexInstance.raw('PRAGMA mmap_size = 268435456;'); // 256MB
      await this.knexInstance.raw('PRAGMA optimize;');
      
      console.log('⚡ SQLite performance optimizations applied');
    } catch (error) {
      console.warn('⚠️ Warning: Could not apply some SQLite optimizations:', error.message);
    }
  }

  /**
   * Configurar monitoramento de performance
   */
  setupMonitoring() {
    if (!this.knexInstance) return;

    // Monitorar queries
    this.knexInstance.on('query', (queryData) => {
      this.connectionMetrics.totalQueries++;
      
      // Log de queries em desenvolvimento
      if (process.env.NODE_ENV === 'development' && process.env.DB_LOG_QUERIES === 'true') {
        console.log('🔍 Query:', queryData.sql);
        if (queryData.bindings && queryData.bindings.length > 0) {
          console.log('📋 Bindings:', queryData.bindings);
        }
      }
    });

    // Monitorar queries completadas
    this.knexInstance.on('query-response', (response, queryData, builder) => {
      const duration = Date.now() - (queryData.startTime || Date.now());
      
      // Detectar queries lentas (> 500ms para SQLite)
      if (duration > 500) {
        this.connectionMetrics.slowQueries++;
        console.warn(`🐌 Slow query detected (${duration}ms):`, queryData.sql);
        
        // Registrar métrica de query lenta
        if (performanceMonitor && performanceMonitor.recordSlowQuery) {
          performanceMonitor.recordSlowQuery({
            sql: queryData.sql,
            duration,
            bindings: queryData.bindings
          });
        }
      }

      // Registrar métricas gerais
      if (performanceMonitor && performanceMonitor.recordDatabaseMetrics) {
        performanceMonitor.recordDatabaseMetrics({
          query_duration: duration,
          query_type: this.getQueryType(queryData.sql),
          database_type: 'sqlite'
        });
      }
    });

    // Monitorar erros de query
    this.knexInstance.on('query-error', (error, queryData) => {
      this.connectionMetrics.errorCount++;
      console.error('❌ Query error:', error.message);
      console.error('📝 SQL:', queryData.sql);
      
      // Registrar erro
      if (performanceMonitor && performanceMonitor.recordDatabaseError) {
        performanceMonitor.recordDatabaseError({
          error: error.message,
          sql: queryData.sql,
          bindings: queryData.bindings,
          database_type: 'sqlite'
        });
      }
    });
  }

  /**
   * Testar conexão com o banco
   */
  async testConnection() {
    try {
      await this.knexInstance.raw('SELECT 1 as test');
      console.log('✅ SQLite connection test successful');
      return true;
    } catch (error) {
      console.error('❌ SQLite connection test failed:', error.message);
      throw error;
    }
  }

  /**
   * Obter estatísticas da conexão
   */
  getConnectionStats() {
    return {
      isConnected: this.isConnected,
      connectionAttempts: this.connectionAttempts,
      metrics: this.connectionMetrics,
      databasePath: this.dbPath,
      databaseExists: fs.existsSync(this.dbPath),
      databaseSize: fs.existsSync(this.dbPath) ? fs.statSync(this.dbPath).size : 0
    };
  }

  /**
   * Health check do banco
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      // Teste simples
      await this.knexInstance.raw('SELECT 1');
      
      const responseTime = Date.now() - startTime;
      
      // Obter estatísticas
      const stats = this.getConnectionStats();
      
      return {
        status: 'healthy',
        responseTime,
        ...stats,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Fechar conexão
   */
  async destroy() {
    if (this.knexInstance) {
      await this.knexInstance.destroy();
      this.isConnected = false;
      console.log('🔌 SQLite connection closed');
    }
  }

  /**
   * Executar migrations
   */
  async runMigrations() {
    try {
      console.log('🔄 Running database migrations...');
      const [batchNo, migrations] = await this.knexInstance.migrate.latest();
      
      if (migrations.length === 0) {
        console.log('✅ All migrations are up to date');
      } else {
        console.log(`✅ Ran ${migrations.length} migrations in batch ${batchNo}`);
        migrations.forEach(migration => {
          console.log(`  - ${migration}`);
        });
      }
      
      return { batchNo, migrations };
    } catch (error) {
      console.error('❌ Migration error:', error.message);
      throw error;
    }
  }

  /**
   * Rollback migrations
   */
  async rollbackMigrations() {
    try {
      console.log('🔄 Rolling back migrations...');
      const [batchNo, migrations] = await this.knexInstance.migrate.rollback();
      
      console.log(`✅ Rollback of batch ${batchNo} completed`);
      migrations.forEach(migration => {
        console.log(`  - ${migration}`);
      });
      
      return { batchNo, migrations };
    } catch (error) {
      console.error('❌ Rollback error:', error.message);
      throw error;
    }
  }

  /**
   * Executar seeds
   */
  async runSeeds() {
    try {
      console.log('🌱 Running database seeds...');
      await this.knexInstance.seed.run();
      console.log('✅ Seeds executed successfully');
    } catch (error) {
      console.error('❌ Seed error:', error.message);
      throw error;
    }
  }

  /**
   * Backup do banco
   */
  async backup(backupPath) {
    try {
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      await fs.promises.copyFile(this.dbPath, backupPath);
      console.log(`✅ Database backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('❌ Backup error:', error.message);
      throw error;
    }
  }

  /**
   * Determinar tipo de query
   */
  getQueryType(sql) {
    const trimmedSql = sql.trim().toUpperCase();
    
    if (trimmedSql.startsWith('SELECT')) return 'SELECT';
    if (trimmedSql.startsWith('INSERT')) return 'INSERT';
    if (trimmedSql.startsWith('UPDATE')) return 'UPDATE';
    if (trimmedSql.startsWith('DELETE')) return 'DELETE';
    if (trimmedSql.startsWith('CREATE')) return 'CREATE';
    if (trimmedSql.startsWith('ALTER')) return 'ALTER';
    if (trimmedSql.startsWith('DROP')) return 'DROP';
    if (trimmedSql.startsWith('PRAGMA')) return 'PRAGMA';
    
    return 'OTHER';
  }

  /**
   * Utility para sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obter instância do Knex
   */
  getInstance() {
    return this.knexInstance;
  }
}

// Instância singleton
const sqliteConfig = new SQLiteConfig();

module.exports = sqliteConfig;