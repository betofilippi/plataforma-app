const logger = require('./logger');
const os = require('os');

/**
 * Monitor de performance do sistema
 */
class PerformanceMonitor {
  constructor() {
    this.knex = null;
    this.metrics = {
      requests: new Map(),
      database: new Map(),
      system: new Map(),
      errors: new Map()
    };
    
    this.intervals = {
      system: null,
      cleanup: null
    };

    this.config = {
      systemMetricsInterval: parseInt(process.env.PERF_SYSTEM_INTERVAL) || 30000, // 30s
      cleanupInterval: parseInt(process.env.PERF_CLEANUP_INTERVAL) || 300000, // 5min
      retentionPeriod: parseInt(process.env.PERF_RETENTION_PERIOD) || 3600000, // 1h
      slowRequestThreshold: parseInt(process.env.PERF_SLOW_REQUEST_MS) || 2000,
      slowQueryThreshold: parseInt(process.env.PERF_SLOW_QUERY_MS) || 1000,
      errorRateThreshold: parseFloat(process.env.PERF_ERROR_RATE_THRESHOLD) || 0.05
    };

    this.startMonitoring();
  }

  /**
   * Inicializar com instância do Knex
   */
  async initialize(knexInstance) {
    this.knex = knexInstance;
    await this.createMetricsTables();
  }

  /**
   * Criar tabelas de métricas
   */
  async createMetricsTables() {
    if (!this.knex) return;

    // Tabela de métricas de requisições
    const requestMetricsExists = await this.knex.schema.hasTable('request_metrics');
    if (!requestMetricsExists) {
      await this.knex.schema.createTable('request_metrics', (table) => {
        table.increments('id').primary();
        table.string('method', 10).notNullable();
        table.string('path', 500).notNullable();
        table.integer('status_code').notNullable();
        table.integer('duration_ms').notNullable();
        table.integer('user_id').nullable();
        table.string('ip_address', 45).nullable();
        table.timestamp('created_at').defaultTo(this.knex.fn.now());

        table.index(['method', 'path']);
        table.index(['status_code']);
        table.index(['duration_ms']);
        table.index(['created_at']);
        table.index(['user_id']);
      });
    }

    // Tabela de métricas do banco de dados
    const dbMetricsExists = await this.knex.schema.hasTable('database_metrics');
    if (!dbMetricsExists) {
      await this.knex.schema.createTable('database_metrics', (table) => {
        table.increments('id').primary();
        table.integer('query_duration').notNullable();
        table.string('query_type', 20).notNullable();
        table.integer('affected_rows').default(0);
        table.text('query_hash').nullable(); // Hash da query para agrupar similares
        table.timestamp('created_at').defaultTo(this.knex.fn.now());

        table.index(['query_type']);
        table.index(['query_duration']);
        table.index(['created_at']);
        table.index(['query_hash']);
      });
    }

    // Tabela de métricas do sistema
    const systemMetricsExists = await this.knex.schema.hasTable('system_metrics');
    if (!systemMetricsExists) {
      await this.knex.schema.createTable('system_metrics', (table) => {
        table.increments('id').primary();
        table.decimal('cpu_usage', 5, 2).notNullable();
        table.decimal('memory_usage', 5, 2).notNullable();
        table.bigInteger('memory_used_bytes').notNullable();
        table.bigInteger('memory_total_bytes').notNullable();
        table.decimal('disk_usage', 5, 2).nullable();
        table.integer('active_connections').default(0);
        table.integer('requests_per_minute').default(0);
        table.decimal('error_rate', 5, 4).default(0);
        table.timestamp('created_at').defaultTo(this.knex.fn.now());

        table.index(['created_at']);
        table.index(['cpu_usage']);
        table.index(['memory_usage']);
      });
    }

    // Tabela de queries lentas
    const slowQueriesExists = await this.knex.schema.hasTable('slow_queries');
    if (!slowQueriesExists) {
      await this.knex.schema.createTable('slow_queries', (table) => {
        table.increments('id').primary();
        table.text('sql').notNullable();
        table.integer('duration_ms').notNullable();
        table.json('bindings').nullable();
        table.text('stack_trace').nullable();
        table.integer('user_id').nullable();
        table.timestamp('created_at').defaultTo(this.knex.fn.now());

        table.index(['duration_ms']);
        table.index(['created_at']);
        table.index(['user_id']);
      });
    }

    // Tabela de erros de banco
    const dbErrorsExists = await this.knex.schema.hasTable('database_errors');
    if (!dbErrorsExists) {
      await this.knex.schema.createTable('database_errors', (table) => {
        table.increments('id').primary();
        table.text('error_message').notNullable();
        table.text('sql').nullable();
        table.json('bindings').nullable();
        table.text('stack_trace').nullable();
        table.integer('user_id').nullable();
        table.timestamp('created_at').defaultTo(this.knex.fn.now());

        table.index(['created_at']);
        table.index(['user_id']);
      });
    }
  }

  /**
   * Iniciar monitoramento automático
   */
  startMonitoring() {
    // Coletar métricas do sistema periodicamente
    this.intervals.system = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.systemMetricsInterval);

    // Limpeza de dados antigos
    this.intervals.cleanup = setInterval(() => {
      this.cleanupOldMetrics();
    }, this.config.cleanupInterval);

    logger.info('Performance monitoring iniciado', {
      systemInterval: this.config.systemMetricsInterval,
      cleanupInterval: this.config.cleanupInterval
    });
  }

  /**
   * Parar monitoramento
   */
  stopMonitoring() {
    if (this.intervals.system) {
      clearInterval(this.intervals.system);
      this.intervals.system = null;
    }

    if (this.intervals.cleanup) {
      clearInterval(this.intervals.cleanup);
      this.intervals.cleanup = null;
    }

    logger.info('Performance monitoring parado');
  }

  /**
   * Registrar métricas de requisição
   */
  async recordRequestMetrics(data) {
    const now = Date.now();
    const key = `${data.method}:${data.path}`;
    
    // Armazenar em memória para cálculos rápidos
    if (!this.metrics.requests.has(key)) {
      this.metrics.requests.set(key, []);
    }

    this.metrics.requests.get(key).push({
      duration: data.duration_ms,
      status: data.status_code,
      timestamp: now,
      userId: data.user_id
    });

    // Persistir no banco se disponível
    if (this.knex) {
      try {
        await this.knex('request_metrics').insert({
          method: data.method,
          path: data.path,
          status_code: data.status_code,
          duration_ms: data.duration_ms,
          user_id: data.user_id || null,
          ip_address: data.ip_address || null
        });
      } catch (error) {
        logger.error('Erro ao registrar métrica de requisição', { error: error.message });
      }
    }

    // Alertas para requisições lentas
    if (data.duration_ms > this.config.slowRequestThreshold) {
      logger.warn('Requisição lenta detectada', {
        method: data.method,
        path: data.path,
        duration: data.duration_ms,
        threshold: this.config.slowRequestThreshold
      });
    }
  }

  /**
   * Registrar métricas de banco de dados
   */
  async recordDatabaseMetrics(data) {
    const now = Date.now();
    
    // Armazenar em memória
    const key = data.query_type || 'UNKNOWN';
    if (!this.metrics.database.has(key)) {
      this.metrics.database.set(key, []);
    }

    this.metrics.database.get(key).push({
      duration: data.query_duration,
      affectedRows: data.affected_rows || 0,
      timestamp: now
    });

    // Persistir no banco se disponível
    if (this.knex) {
      try {
        await this.knex('database_metrics').insert({
          query_duration: data.query_duration,
          query_type: data.query_type,
          affected_rows: data.affected_rows || 0,
          query_hash: data.query_hash || null
        });
      } catch (error) {
        logger.error('Erro ao registrar métrica de banco', { error: error.message });
      }
    }
  }

  /**
   * Registrar query lenta
   */
  async recordSlowQuery(data) {
    logger.warn('Query lenta detectada', {
      duration: data.duration,
      sql: data.sql?.substring(0, 200) + '...'
    });

    if (this.knex) {
      try {
        await this.knex('slow_queries').insert({
          sql: data.sql,
          duration_ms: data.duration,
          bindings: data.bindings || null,
          stack_trace: data.stack || null,
          user_id: data.user_id || null
        });
      } catch (error) {
        logger.error('Erro ao registrar query lenta', { error: error.message });
      }
    }
  }

  /**
   * Registrar erro de banco
   */
  async recordDatabaseError(data) {
    logger.error('Erro de banco de dados', {
      error: data.error,
      sql: data.sql?.substring(0, 200) + '...'
    });

    if (this.knex) {
      try {
        await this.knex('database_errors').insert({
          error_message: data.error,
          sql: data.sql || null,
          bindings: data.bindings || null,
          stack_trace: data.stack || null,
          user_id: data.user_id || null
        });
      } catch (error) {
        logger.error('Erro ao registrar erro de banco', { error: error.message });
      }
    }
  }

  /**
   * Registrar erro do Redis
   */
  recordRedisError(error) {
    const now = Date.now();
    
    if (!this.metrics.errors.has('redis')) {
      this.metrics.errors.set('redis', []);
    }

    this.metrics.errors.get('redis').push({
      error: error.message,
      timestamp: now
    });

    logger.error('Erro do Redis', { error: error.message });
  }

  /**
   * Coletar métricas do sistema
   */
  async collectSystemMetrics() {
    try {
      const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memoryUsage = (usedMem / totalMem) * 100;

      // Calcular requisições por minuto
      const requestsPerMinute = this.calculateRequestsPerMinute();
      
      // Calcular taxa de erro
      const errorRate = this.calculateErrorRate();

      // Obter conexões ativas (se disponível)
      let activeConnections = 0;
      if (this.knex && this.knex.client && this.knex.client.pool) {
        activeConnections = this.knex.client.pool.numUsed() || 0;
      }

      const systemMetric = {
        cpu_usage: Math.round(cpuUsage * 100) / 100,
        memory_usage: Math.round(memoryUsage * 100) / 100,
        memory_used_bytes: usedMem,
        memory_total_bytes: totalMem,
        active_connections: activeConnections,
        requests_per_minute: requestsPerMinute,
        error_rate: errorRate
      };

      // Armazenar em memória
      const now = Date.now();
      if (!this.metrics.system.has('current')) {
        this.metrics.system.set('current', []);
      }
      this.metrics.system.get('current').push({
        ...systemMetric,
        timestamp: now
      });

      // Persistir no banco se disponível
      if (this.knex) {
        try {
          await this.knex('system_metrics').insert(systemMetric);
        } catch (error) {
          logger.error('Erro ao registrar métrica de sistema', { error: error.message });
        }
      }

      // Alertas baseados em thresholds
      if (cpuUsage > 80) {
        logger.warn('Alto uso de CPU detectado', { usage: cpuUsage });
      }

      if (memoryUsage > 85) {
        logger.warn('Alto uso de memória detectado', { usage: memoryUsage });
      }

      if (errorRate > this.config.errorRateThreshold) {
        logger.warn('Alta taxa de erro detectada', { rate: errorRate });
      }

    } catch (error) {
      logger.error('Erro ao coletar métricas do sistema', { error: error.message });
    }
  }

  /**
   * Calcular requisições por minuto
   */
  calculateRequestsPerMinute() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    let totalRequests = 0;

    for (const [key, requests] of this.metrics.requests.entries()) {
      const recentRequests = requests.filter(req => req.timestamp > oneMinuteAgo);
      totalRequests += recentRequests.length;
      
      // Atualizar o array com apenas requisições recentes
      this.metrics.requests.set(key, recentRequests);
    }

    return totalRequests;
  }

  /**
   * Calcular taxa de erro
   */
  calculateErrorRate() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    let totalRequests = 0;
    let errorRequests = 0;

    for (const [key, requests] of this.metrics.requests.entries()) {
      const recentRequests = requests.filter(req => req.timestamp > oneMinuteAgo);
      totalRequests += recentRequests.length;
      errorRequests += recentRequests.filter(req => req.status >= 500).length;
    }

    return totalRequests > 0 ? errorRequests / totalRequests : 0;
  }

  /**
   * Verificar taxa de erro para um endpoint específico
   */
  async checkErrorRate(path, method) {
    const key = `${method}:${path}`;
    const requests = this.metrics.requests.get(key) || [];
    const recentRequests = requests.filter(req => req.timestamp > Date.now() - 300000); // 5 min

    if (recentRequests.length >= 10) {
      const errorRequests = recentRequests.filter(req => req.status >= 500);
      const errorRate = errorRequests.length / recentRequests.length;

      if (errorRate > this.config.errorRateThreshold) {
        logger.warn('Alta taxa de erro para endpoint específico', {
          endpoint: key,
          errorRate,
          totalRequests: recentRequests.length,
          errorRequests: errorRequests.length
        });
      }
    }
  }

  /**
   * Obter métricas atuais
   */
  getCurrentMetrics() {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;

    // Métricas de sistema mais recentes
    const systemMetrics = this.metrics.system.get('current') || [];
    const recentSystemMetrics = systemMetrics.filter(m => m.timestamp > fiveMinutesAgo);
    
    const latestSystem = recentSystemMetrics.length > 0 
      ? recentSystemMetrics[recentSystemMetrics.length - 1]
      : null;

    // Estatísticas de requisições
    let totalRequests = 0;
    let slowRequests = 0;
    const endpointStats = {};

    for (const [endpoint, requests] of this.metrics.requests.entries()) {
      const recentRequests = requests.filter(req => req.timestamp > fiveMinutesAgo);
      totalRequests += recentRequests.length;
      
      const slowCount = recentRequests.filter(req => req.duration > this.config.slowRequestThreshold).length;
      slowRequests += slowCount;

      if (recentRequests.length > 0) {
        const durations = recentRequests.map(req => req.duration);
        endpointStats[endpoint] = {
          count: recentRequests.length,
          avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
          maxDuration: Math.max(...durations),
          slowCount
        };
      }
    }

    return {
      timestamp: new Date().toISOString(),
      system: latestSystem,
      requests: {
        total: totalRequests,
        slow: slowRequests,
        slowPercentage: totalRequests > 0 ? (slowRequests / totalRequests) * 100 : 0,
        perMinute: this.calculateRequestsPerMinute(),
        errorRate: this.calculateErrorRate(),
        endpoints: endpointStats
      },
      database: {
        queriesLast5Min: Array.from(this.metrics.database.values())
          .flat()
          .filter(q => q.timestamp > fiveMinutesAgo).length
      }
    };
  }

  /**
   * Obter relatório de performance
   */
  async getPerformanceReport(period = '24h') {
    if (!this.knex) {
      return { error: 'Banco de dados não disponível' };
    }

    const hours = this.parsePeriod(period);
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      const [
        requestStats,
        slowQueries,
        systemStats,
        topEndpoints,
        errorStats
      ] = await Promise.all([
        this.getRequestStats(startTime),
        this.getSlowQueries(startTime),
        this.getSystemStats(startTime),
        this.getTopEndpoints(startTime),
        this.getErrorStats(startTime)
      ]);

      return {
        period,
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        requests: requestStats,
        slowQueries,
        system: systemStats,
        topEndpoints,
        errors: errorStats
      };
    } catch (error) {
      logger.error('Erro ao gerar relatório de performance', { error: error.message });
      return { error: 'Erro ao gerar relatório' };
    }
  }

  /**
   * Limpar métricas antigas da memória
   */
  cleanupOldMetrics() {
    const cutoff = Date.now() - this.config.retentionPeriod;

    // Limpar métricas de requisições
    for (const [key, requests] of this.metrics.requests.entries()) {
      const filtered = requests.filter(req => req.timestamp > cutoff);
      if (filtered.length === 0) {
        this.metrics.requests.delete(key);
      } else {
        this.metrics.requests.set(key, filtered);
      }
    }

    // Limpar métricas de banco
    for (const [key, queries] of this.metrics.database.entries()) {
      const filtered = queries.filter(query => query.timestamp > cutoff);
      if (filtered.length === 0) {
        this.metrics.database.delete(key);
      } else {
        this.metrics.database.set(key, filtered);
      }
    }

    // Limpar métricas de sistema
    for (const [key, metrics] of this.metrics.system.entries()) {
      const filtered = metrics.filter(metric => metric.timestamp > cutoff);
      if (filtered.length === 0) {
        this.metrics.system.delete(key);
      } else {
        this.metrics.system.set(key, filtered);
      }
    }

    logger.debug('Limpeza de métricas antigas concluída');
  }

  /**
   * Helpers para relatórios
   */
  async getRequestStats(startTime) {
    const stats = await this.knex('request_metrics')
      .where('created_at', '>=', startTime)
      .select(
        this.knex.raw('COUNT(*) as total_requests'),
        this.knex.raw('AVG(duration_ms) as avg_duration'),
        this.knex.raw('MAX(duration_ms) as max_duration'),
        this.knex.raw('MIN(duration_ms) as min_duration'),
        this.knex.raw(`COUNT(CASE WHEN duration_ms > ${this.config.slowRequestThreshold} THEN 1 END) as slow_requests`),
        this.knex.raw('COUNT(CASE WHEN status_code >= 500 THEN 1 END) as error_requests'),
        this.knex.raw('COUNT(CASE WHEN status_code >= 400 AND status_code < 500 THEN 1 END) as client_error_requests')
      )
      .first();

    return {
      ...stats,
      slow_percentage: stats.total_requests > 0 ? (stats.slow_requests / stats.total_requests) * 100 : 0,
      error_rate: stats.total_requests > 0 ? (stats.error_requests / stats.total_requests) * 100 : 0
    };
  }

  async getSlowQueries(startTime) {
    return await this.knex('slow_queries')
      .where('created_at', '>=', startTime)
      .orderBy('duration_ms', 'desc')
      .limit(10)
      .select('sql', 'duration_ms', 'created_at');
  }

  async getSystemStats(startTime) {
    return await this.knex('system_metrics')
      .where('created_at', '>=', startTime)
      .select(
        this.knex.raw('AVG(cpu_usage) as avg_cpu'),
        this.knex.raw('MAX(cpu_usage) as max_cpu'),
        this.knex.raw('AVG(memory_usage) as avg_memory'),
        this.knex.raw('MAX(memory_usage) as max_memory'),
        this.knex.raw('AVG(active_connections) as avg_connections'),
        this.knex.raw('MAX(active_connections) as max_connections')
      )
      .first();
  }

  async getTopEndpoints(startTime) {
    return await this.knex('request_metrics')
      .where('created_at', '>=', startTime)
      .select('method', 'path')
      .count('* as requests')
      .avg('duration_ms as avg_duration')
      .groupBy('method', 'path')
      .orderBy('requests', 'desc')
      .limit(10);
  }

  async getErrorStats(startTime) {
    return await this.knex('request_metrics')
      .where('created_at', '>=', startTime)
      .where('status_code', '>=', 400)
      .select('method', 'path', 'status_code')
      .count('* as count')
      .groupBy('method', 'path', 'status_code')
      .orderBy('count', 'desc')
      .limit(10);
  }

  parsePeriod(period) {
    const periodMap = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30
    };
    return periodMap[period] || 24;
  }
}

// Instância singleton
const performanceMonitor = new PerformanceMonitor();

module.exports = { performanceMonitor };