const knex = require('knex');
const { performanceMonitor } = require('../utils/performanceMonitor');

/**
 * Configuração avançada do pool de conexões do banco de dados
 */
class DatabaseConfig {
  constructor() {
    this.knexInstance = null;
    this.connectionPool = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.connectionMetrics = {
      activeConnections: 0,
      totalQueries: 0,
      slowQueries: 0,
      errorCount: 0
    };
  }

  /**
   * Inicializar conexão com o banco
   */
  async initialize() {
    const config = this.getKnexConfig();
    
    try {
      this.knexInstance = knex(config);
      
      // Configurar eventos de monitoramento
      this.setupMonitoring();
      
      // Testar conexão
      await this.testConnection();
      
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      console.log('✅ Conexão com banco de dados estabelecida');
      
      return this.knexInstance;
      
    } catch (error) {
      this.connectionAttempts++;
      console.error(`❌ Erro na conexão com banco (tentativa ${this.connectionAttempts}):`, error.message);
      
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log(`🔄 Tentando reconectar em 5 segundos...`);
        await this.sleep(5000);
        return this.initialize();
      } else {
        throw new Error(`Falha ao conectar ao banco após ${this.maxConnectionAttempts} tentativas`);
      }
    }
  }

  /**
   * Obter configuração do Knex
   */
  getKnexConfig() {
    const env = process.env.NODE_ENV || 'development';
    const path = require('path');
    
    const baseConfig = {
      client: 'sqlite3',
      connection: {
        filename: process.env.DB_PATH || path.join(__dirname, '../../database/erp_nxt.sqlite')
      },
      pool: {
        min: 1,
        max: 10,
        createTimeoutMillis: 30000,
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 600000, // 10 minutos
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
        propagateCreateError: false,
        afterCreate: (conn, done) => {
          // Configurações específicas para SQLite
          conn.run('PRAGMA foreign_keys = ON;', (err) => {
            if (err) {
              console.warn('Aviso: Falha ao habilitar foreign keys:', err.message);
            }
            done(err, conn);
          });
        },
        validate: (resource) => {
          // Validar se a conexão ainda está válida
          return resource && !resource.ended;
        },
        log: (message, logLevel) => {
          if (env === 'development') {
            console.log(`[DB Pool ${logLevel}]:`, message);
          }
        }
      },
      migrations: {
        directory: './src/database/migrations',
        tableName: 'knex_migrations',
        extension: 'js'
      },
      seeds: {
        directory: './src/database/seeds'
      },
      acquireConnectionTimeout: 60000,
      useNullAsDefault: true,
      debug: env === 'development' && process.env.DB_DEBUG === 'true'
    };

    // Configurações específicas por ambiente
    if (env === 'production') {
      baseConfig.pool.min = 2;
      baseConfig.pool.max = 20;
      baseConfig.debug = false;
      baseConfig.connection.filename = process.env.DB_PATH || './database/erp_nxt_production.sqlite';
    } else if (env === 'test') {
      baseConfig.pool.min = 1;
      baseConfig.pool.max = 5;
      baseConfig.connection.filename = process.env.DB_TEST_PATH || path.join(__dirname, '../../database/erp_nxt_test.sqlite');
    }

    return baseConfig;
  }

  /**
   * Configurar monitoramento de performance
   */
  setupMonitoring() {
    if (!this.knexInstance) return;

    // Monitorar queries
    this.knexInstance.on('query', (queryData) => {
      this.connectionMetrics.totalQueries++;
      
      const startTime = Date.now();
      
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
      
      // Detectar queries lentas (> 1 segundo)
      if (duration > 1000) {
        this.connectionMetrics.slowQueries++;
        console.warn(`🐌 Query lenta detectada (${duration}ms):`, queryData.sql);
        
        // Registrar métrica de query lenta
        performanceMonitor.recordSlowQuery({
          sql: queryData.sql,
          duration,
          bindings: queryData.bindings
        });
      }

      // Registrar métricas gerais
      performanceMonitor.recordDatabaseMetrics({
        query_duration: duration,
        query_type: this.getQueryType(queryData.sql),
        affected_rows: response?.rowCount || 0
      });
    });

    // Monitorar erros de query
    this.knexInstance.on('query-error', (error, queryData) => {
      this.connectionMetrics.errorCount++;
      console.error('❌ Erro na query:', error.message);
      console.error('📝 SQL:', queryData.sql);
      
      // Registrar erro
      performanceMonitor.recordDatabaseError({
        error: error.message,
        sql: queryData.sql,
        bindings: queryData.bindings
      });
    });

    // Monitorar conexões do pool
    if (this.knexInstance.client && this.knexInstance.client.pool) {
      const pool = this.knexInstance.client.pool;
      
      pool.on('createSuccess', () => {
        this.connectionMetrics.activeConnections++;
        console.log(`📈 Nova conexão criada. Total: ${this.connectionMetrics.activeConnections}`);
      });

      pool.on('destroySuccess', () => {
        this.connectionMetrics.activeConnections--;
        console.log(`📉 Conexão destruída. Total: ${this.connectionMetrics.activeConnections}`);
      });

      pool.on('createFail', (err) => {
        console.error('❌ Falha ao criar conexão:', err.message);
      });
    }
  }

  /**
   * Testar conexão com o banco
   */
  async testConnection() {
    try {
      await this.knexInstance.raw('SELECT 1+1 as result');
      console.log('✅ Teste de conexão com banco bem-sucedido');
      return true;
    } catch (error) {
      console.error('❌ Teste de conexão falhou:', error.message);
      throw error;
    }
  }

  /**
   * Obter estatísticas da conexão
   */
  getConnectionStats() {
    const pool = this.knexInstance?.client?.pool;
    
    return {
      isConnected: this.isConnected,
      connectionAttempts: this.connectionAttempts,
      metrics: this.connectionMetrics,
      pool: pool ? {
        size: pool.size,
        available: pool.available,
        borrowed: pool.borrowed,
        invalid: pool.invalid,
        pending: pool.pending
      } : null
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
      
      // Obter estatísticas do pool
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
   * Fechar todas as conexões
   */
  async destroy() {
    if (this.knexInstance) {
      await this.knexInstance.destroy();
      this.isConnected = false;
      console.log('🔌 Conexões com banco fechadas');
    }
  }

  /**
   * Executar migrations
   */
  async runMigrations() {
    try {
      console.log('🔄 Executando migrations...');
      const [batchNo, migrations] = await this.knexInstance.migrate.latest();
      
      if (migrations.length === 0) {
        console.log('✅ Todas as migrations já foram executadas');
      } else {
        console.log(`✅ Executadas ${migrations.length} migrations no batch ${batchNo}`);
        migrations.forEach(migration => {
          console.log(`  - ${migration}`);
        });
      }
      
      return { batchNo, migrations };
    } catch (error) {
      console.error('❌ Erro ao executar migrations:', error.message);
      throw error;
    }
  }

  /**
   * Rollback migrations
   */
  async rollbackMigrations() {
    try {
      console.log('🔄 Fazendo rollback das migrations...');
      const [batchNo, migrations] = await this.knexInstance.migrate.rollback();
      
      console.log(`✅ Rollback do batch ${batchNo} concluído`);
      migrations.forEach(migration => {
        console.log(`  - ${migration}`);
      });
      
      return { batchNo, migrations };
    } catch (error) {
      console.error('❌ Erro ao fazer rollback:', error.message);
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
const databaseConfig = new DatabaseConfig();

module.exports = databaseConfig;