const logger = require('./logger');

/**
 * Sistema de logs de auditoria específico
 */
class AuditLogger {
  constructor() {
    this.knex = null;
    this.enabled = process.env.AUDIT_LOGGING !== 'false';
    this.bufferSize = parseInt(process.env.AUDIT_BUFFER_SIZE) || 100;
    this.buffer = [];
    this.flushInterval = parseInt(process.env.AUDIT_FLUSH_INTERVAL) || 5000; // 5 segundos
    
    // Iniciar flush automático
    if (this.enabled) {
      this.startAutoFlush();
    }
  }

  /**
   * Inicializar com instância do Knex
   */
  async initialize(knexInstance) {
    this.knex = knexInstance;
    await this.createAuditTables();
  }

  /**
   * Criar tabelas de auditoria
   */
  async createAuditTables() {
    if (!this.knex) return;

    // Tabela principal de logs de auditoria
    const auditLogsExists = await this.knex.schema.hasTable('audit_logs');
    if (!auditLogsExists) {
      await this.knex.schema.createTable('audit_logs', (table) => {
        table.increments('id').primary();
        table.string('event_type', 50).notNullable(); // REQUEST, MUTATION, ERROR, etc.
        table.integer('user_id').nullable();
        table.string('user_email', 255).nullable();
        table.string('session_id', 255).nullable();
        table.string('request_id', 255).nullable();
        table.string('method', 10).nullable();
        table.string('path', 500).nullable();
        table.integer('status_code').nullable();
        table.integer('duration_ms').nullable();
        table.string('ip_address', 45).nullable();
        table.text('user_agent').nullable();
        table.json('request_data').nullable();
        table.json('response_data').nullable();
        table.json('metadata').nullable();
        table.text('message').nullable();
        table.timestamp('created_at').defaultTo(this.knex.fn.now());

        // Índices para performance
        table.index(['event_type']);
        table.index(['user_id']);
        table.index(['created_at']);
        table.index(['status_code']);
        table.index(['ip_address']);
        table.index(['method', 'path']);
      });
    }

    // Tabela de eventos de segurança
    const securityEventsExists = await this.knex.schema.hasTable('security_events');
    if (!securityEventsExists) {
      await this.knex.schema.createTable('security_events', (table) => {
        table.increments('id').primary();
        table.string('event_type', 50).notNullable(); // LOGIN_FAILED, ACCESS_DENIED, etc.
        table.integer('user_id').nullable();
        table.string('user_email', 255).nullable();
        table.string('ip_address', 45).nullable();
        table.text('user_agent').nullable();
        table.string('resource', 500).nullable();
        table.string('action', 100).nullable();
        table.json('details').nullable();
        table.string('severity', 20).default('medium'); // low, medium, high, critical
        table.boolean('resolved').default(false);
        table.timestamp('created_at').defaultTo(this.knex.fn.now());

        table.index(['event_type']);
        table.index(['user_id']);
        table.index(['ip_address']);
        table.index(['created_at']);
        table.index(['severity']);
        table.index(['resolved']);
      });
    }

    // Tabela de mudanças em dados
    const dataChangesExists = await this.knex.schema.hasTable('data_changes');
    if (!dataChangesExists) {
      await this.knex.schema.createTable('data_changes', (table) => {
        table.increments('id').primary();
        table.string('table_name', 100).notNullable();
        table.string('record_id', 100).nullable();
        table.string('operation', 20).notNullable(); // INSERT, UPDATE, DELETE
        table.integer('user_id').nullable();
        table.string('user_email', 255).nullable();
        table.json('before_data').nullable();
        table.json('after_data').nullable();
        table.json('changes').nullable();
        table.string('ip_address', 45).nullable();
        table.text('user_agent').nullable();
        table.text('reason').nullable();
        table.timestamp('created_at').defaultTo(this.knex.fn.now());

        table.index(['table_name']);
        table.index(['record_id']);
        table.index(['operation']);
        table.index(['user_id']);
        table.index(['created_at']);
        table.index(['table_name', 'record_id']);
      });
    }

    // Tabela de operações sensíveis
    const sensitiveOperationsExists = await this.knex.schema.hasTable('sensitive_operations');
    if (!sensitiveOperationsExists) {
      await this.knex.schema.createTable('sensitive_operations', (table) => {
        table.increments('id').primary();
        table.string('operation_type', 100).notNullable();
        table.integer('user_id').notNullable();
        table.string('user_email', 255).notNullable();
        table.string('method', 10).nullable();
        table.string('path', 500).nullable();
        table.json('request_data').nullable();
        table.json('response_data').nullable();
        table.integer('status_code').nullable();
        table.integer('duration_ms').nullable();
        table.string('ip_address', 45).nullable();
        table.text('user_agent').nullable();
        table.json('metadata').nullable();
        table.timestamp('created_at').defaultTo(this.knex.fn.now());

        table.index(['operation_type']);
        table.index(['user_id']);
        table.index(['created_at']);
        table.index(['status_code']);
      });
    }
  }

  /**
   * Log geral de auditoria
   */
  async logInfo(data) {
    return this.addToBuffer('INFO', data);
  }

  async logWarning(data) {
    return this.addToBuffer('WARNING', data);
  }

  async logError(data) {
    return this.addToBuffer('ERROR', data);
  }

  /**
   * Log de evento de segurança
   */
  async logSecurityEvent(data) {
    const securityEvent = {
      event_type: data.type || 'UNKNOWN',
      user_id: data.user_id || null,
      user_email: data.user_email || null,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      resource: data.resource || data.path || null,
      action: data.action || data.method || null,
      details: {
        permission: data.permission || null,
        limit: data.limit || null,
        window_ms: data.window_ms || null,
        violations: data.violations || null,
        ...data
      },
      severity: this.determineSeverity(data.type),
      resolved: false
    };

    // Log também no Winston
    logger.security(`Security Event: ${data.type}`, securityEvent);

    if (this.knex) {
      try {
        await this.knex('security_events').insert(securityEvent);
      } catch (error) {
        logger.error('Falha ao inserir evento de segurança no banco', { error: error.message });
      }
    }

    return securityEvent;
  }

  /**
   * Log de mudança de dados
   */
  async logDataChange(data) {
    const dataChange = {
      table_name: data.table_name,
      record_id: data.record_id ? data.record_id.toString() : null,
      operation: data.operation || 'UNKNOWN',
      user_id: data.user_id || null,
      user_email: data.user_email || null,
      before_data: data.before_data || null,
      after_data: data.after_data || null,
      changes: data.changes || null,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      reason: data.reason || null
    };

    // Log também no Winston
    logger.audit(`Data Change: ${data.operation} on ${data.table_name}`, dataChange);

    if (this.knex) {
      try {
        await this.knex('data_changes').insert(dataChange);
      } catch (error) {
        logger.error('Falha ao inserir mudança de dados no banco', { error: error.message });
      }
    }

    return dataChange;
  }

  /**
   * Log de operação sensível
   */
  async logSensitiveOperation(data) {
    const sensitiveOp = {
      operation_type: data.operation_type,
      user_id: data.user_id,
      user_email: data.user_email,
      method: data.method || null,
      path: data.path || null,
      request_data: data.request_data || null,
      response_data: data.response_data || null,
      status_code: data.status_code || null,
      duration_ms: data.duration_ms || null,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      metadata: data.metadata || null
    };

    // Log também no Winston
    logger.audit(`Sensitive Operation: ${data.operation_type}`, sensitiveOp);

    if (this.knex) {
      try {
        await this.knex('sensitive_operations').insert(sensitiveOp);
      } catch (error) {
        logger.error('Falha ao inserir operação sensível no banco', { error: error.message });
      }
    }

    return sensitiveOp;
  }

  /**
   * Adicionar ao buffer para flush em lote
   */
  addToBuffer(level, data) {
    if (!this.enabled) return;

    const auditEntry = {
      event_type: data.event_type || level,
      user_id: data.user_id || null,
      user_email: data.user_email || null,
      session_id: data.session_id || null,
      request_id: data.request_id || null,
      method: data.method || null,
      path: data.path || null,
      status_code: data.status_code || null,
      duration_ms: data.duration_ms || null,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      request_data: data.request_data || data.request_body || null,
      response_data: data.response_data || data.response_body || null,
      metadata: {
        level,
        timestamp: data.timestamp || new Date().toISOString(),
        ...data
      },
      message: data.message || null
    };

    this.buffer.push(auditEntry);

    // Log também no Winston
    logger.audit(`Audit ${level}`, auditEntry);

    // Flush se buffer estiver cheio
    if (this.buffer.length >= this.bufferSize) {
      this.flushBuffer();
    }

    return auditEntry;
  }

  /**
   * Fazer flush do buffer para o banco
   */
  async flushBuffer() {
    if (this.buffer.length === 0 || !this.knex) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await this.knex('audit_logs').insert(entries);
      logger.debug(`Flushed ${entries.length} audit entries to database`);
    } catch (error) {
      logger.error('Falha ao fazer flush de entradas de auditoria', { 
        error: error.message,
        entriesCount: entries.length 
      });
      
      // Recolocar no buffer se falhou
      this.buffer.unshift(...entries);
    }
  }

  /**
   * Iniciar flush automático
   */
  startAutoFlush() {
    setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);
  }

  /**
   * Determinar severidade baseada no tipo de evento
   */
  determineSeverity(eventType) {
    const criticalEvents = [
      'AUTHENTICATION_BYPASS',
      'PRIVILEGE_ESCALATION',
      'SQL_INJECTION',
      'XSS_ATTEMPT',
      'SYSTEM_COMPROMISE'
    ];

    const highEvents = [
      'MULTIPLE_LOGIN_FAILURES',
      'ACCOUNT_LOCKOUT',
      'SUSPICIOUS_ACTIVITY',
      'DATA_BREACH_ATTEMPT'
    ];

    const mediumEvents = [
      'ACCESS_DENIED',
      'RATE_LIMIT_EXCEEDED',
      'INVALID_TOKEN',
      'PERMISSION_DENIED'
    ];

    if (criticalEvents.includes(eventType)) return 'critical';
    if (highEvents.includes(eventType)) return 'high';
    if (mediumEvents.includes(eventType)) return 'medium';
    
    return 'low';
  }

  /**
   * Buscar logs de auditoria
   */
  async searchAuditLogs(filters = {}) {
    if (!this.knex) return [];

    let query = this.knex('audit_logs').select('*');

    // Aplicar filtros
    if (filters.user_id) {
      query = query.where('user_id', filters.user_id);
    }

    if (filters.event_type) {
      query = query.where('event_type', filters.event_type);
    }

    if (filters.ip_address) {
      query = query.where('ip_address', filters.ip_address);
    }

    if (filters.start_date) {
      query = query.where('created_at', '>=', filters.start_date);
    }

    if (filters.end_date) {
      query = query.where('created_at', '<=', filters.end_date);
    }

    if (filters.status_code) {
      query = query.where('status_code', filters.status_code);
    }

    if (filters.path) {
      query = query.where('path', 'like', `%${filters.path}%`);
    }

    // Paginação
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    query = query.orderBy('created_at', 'desc').limit(limit).offset(offset);

    return await query;
  }

  /**
   * Obter estatísticas de auditoria
   */
  async getAuditStats(period = '24h') {
    if (!this.knex) return {};

    const periodMap = {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30
    };

    const hours = periodMap[period] || 24;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      const [
        totalEvents,
        errorEvents,
        securityEvents,
        uniqueUsers,
        uniqueIPs
      ] = await Promise.all([
        this.knex('audit_logs').where('created_at', '>=', startTime).count('id as count'),
        this.knex('audit_logs').where('created_at', '>=', startTime).where('event_type', 'ERROR').count('id as count'),
        this.knex('security_events').where('created_at', '>=', startTime).count('id as count'),
        this.knex('audit_logs').where('created_at', '>=', startTime).whereNotNull('user_id').countDistinct('user_id as count'),
        this.knex('audit_logs').where('created_at', '>=', startTime).whereNotNull('ip_address').countDistinct('ip_address as count')
      ]);

      return {
        period,
        totalEvents: parseInt(totalEvents[0].count),
        errorEvents: parseInt(errorEvents[0].count),
        securityEvents: parseInt(securityEvents[0].count),
        uniqueUsers: parseInt(uniqueUsers[0].count),
        uniqueIPs: parseInt(uniqueIPs[0].count),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de auditoria', { error: error.message });
      return {};
    }
  }

  /**
   * Limpar logs antigos
   */
  async cleanupOldLogs(daysToKeep = 90) {
    if (!this.knex) return 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const deletedCount = await this.knex('audit_logs')
        .where('created_at', '<', cutoffDate)
        .del();

      logger.info('Limpeza de logs de auditoria concluída', {
        deletedCount,
        cutoffDate: cutoffDate.toISOString()
      });

      return deletedCount;
    } catch (error) {
      logger.error('Erro na limpeza de logs de auditoria', { error: error.message });
      return 0;
    }
  }
}

// Instância singleton
const auditLogger = new AuditLogger();

module.exports = { auditLogger };