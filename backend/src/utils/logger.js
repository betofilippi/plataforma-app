const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

/**
 * Sistema de logs estruturado com Winston
 */
class Logger {
  constructor() {
    this.logDir = process.env.LOG_DIR || 'logs';
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.maxFiles = process.env.LOG_MAX_FILES || '30d';
    this.maxSize = process.env.LOG_MAX_SIZE || '20m';
    
    // Criar diretório de logs se não existir
    this.ensureLogDirectory();
    
    // Criar logger principal
    this.logger = this.createLogger();
    
    // Loggers especializados
    this.errorLogger = this.createErrorLogger();
    this.auditLogger = this.createAuditLogger();
    this.performanceLogger = this.createPerformanceLogger();
    this.securityLogger = this.createSecurityLogger();
  }

  /**
   * Garantir que o diretório de logs existe
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Formato customizado para logs
   */
  getLogFormat() {
    return winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level: level.toUpperCase(),
          service: service || 'ERP-API',
          message,
          ...meta
        });
      })
    );
  }

  /**
   * Criar logger principal
   */
  createLogger() {
    return winston.createLogger({
      level: this.logLevel,
      format: this.getLogFormat(),
      defaultMeta: { 
        service: 'ERP-API',
        hostname: require('os').hostname(),
        pid: process.pid
      },
      transports: [
        // Console para desenvolvimento
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
            })
          ),
          silent: process.env.NODE_ENV === 'test'
        }),

        // Arquivo para todos os logs
        new DailyRotateFile({
          filename: path.join(this.logDir, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: this.maxFiles,
          maxSize: this.maxSize,
          format: this.getLogFormat()
        }),

        // Arquivo separado para erros
        new DailyRotateFile({
          filename: path.join(this.logDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxFiles: this.maxFiles,
          maxSize: this.maxSize,
          format: this.getLogFormat()
        })
      ],
      exceptionHandlers: [
        new DailyRotateFile({
          filename: path.join(this.logDir, 'exceptions-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: this.maxFiles,
          maxSize: this.maxSize,
          format: this.getLogFormat()
        })
      ],
      rejectionHandlers: [
        new DailyRotateFile({
          filename: path.join(this.logDir, 'rejections-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: this.maxFiles,
          maxSize: this.maxSize,
          format: this.getLogFormat()
        })
      ]
    });
  }

  /**
   * Logger específico para erros
   */
  createErrorLogger() {
    return winston.createLogger({
      level: 'error',
      format: this.getLogFormat(),
      defaultMeta: { 
        service: 'ERP-ERROR',
        hostname: require('os').hostname()
      },
      transports: [
        new DailyRotateFile({
          filename: path.join(this.logDir, 'errors-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: this.maxFiles,
          maxSize: this.maxSize
        })
      ]
    });
  }

  /**
   * Logger específico para auditoria
   */
  createAuditLogger() {
    return winston.createLogger({
      level: 'info',
      format: this.getLogFormat(),
      defaultMeta: { 
        service: 'ERP-AUDIT',
        hostname: require('os').hostname()
      },
      transports: [
        new DailyRotateFile({
          filename: path.join(this.logDir, 'audit-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: '90d', // Manter logs de auditoria por mais tempo
          maxSize: this.maxSize
        })
      ]
    });
  }

  /**
   * Logger específico para performance
   */
  createPerformanceLogger() {
    return winston.createLogger({
      level: 'info',
      format: this.getLogFormat(),
      defaultMeta: { 
        service: 'ERP-PERFORMANCE',
        hostname: require('os').hostname()
      },
      transports: [
        new DailyRotateFile({
          filename: path.join(this.logDir, 'performance-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: this.maxFiles,
          maxSize: this.maxSize
        })
      ]
    });
  }

  /**
   * Logger específico para segurança
   */
  createSecurityLogger() {
    return winston.createLogger({
      level: 'warn',
      format: this.getLogFormat(),
      defaultMeta: { 
        service: 'ERP-SECURITY',
        hostname: require('os').hostname()
      },
      transports: [
        new DailyRotateFile({
          filename: path.join(this.logDir, 'security-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: '90d', // Manter logs de segurança por mais tempo
          maxSize: this.maxSize
        })
      ]
    });
  }

  /**
   * Métodos de conveniência para logging
   */
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
    
    // Também logar no logger de erros específico
    this.errorLogger.error(message, {
      ...meta,
      stack: meta.stack || (meta.error && meta.error.stack)
    });
  }

  /**
   * Log de auditoria
   */
  audit(action, details = {}) {
    this.auditLogger.info('Audit Event', {
      action,
      ...details,
      audit: true
    });
  }

  /**
   * Log de performance
   */
  performance(metric, value, details = {}) {
    this.performanceLogger.info('Performance Metric', {
      metric,
      value,
      ...details,
      performance: true
    });
  }

  /**
   * Log de segurança
   */
  security(event, details = {}) {
    this.securityLogger.warn('Security Event', {
      event,
      ...details,
      security: true
    });
  }

  /**
   * Log de requisição HTTP
   */
  request(req, res, duration) {
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user ? req.user.id : null,
      requestId: req.requestId,
      http: true
    };

    if (res.statusCode >= 500) {
      this.error('HTTP Request Error', logData);
    } else if (res.statusCode >= 400) {
      this.warn('HTTP Request Warning', logData);
    } else {
      this.info('HTTP Request', logData);
    }
  }

  /**
   * Log de query de banco de dados
   */
  database(query, duration, error = null) {
    const logData = {
      query: query.sql || query,
      duration,
      database: true
    };

    if (error) {
      this.error('Database Query Error', {
        ...logData,
        error: error.message,
        stack: error.stack
      });
    } else if (duration > 1000) {
      this.warn('Slow Database Query', logData);
    } else {
      this.debug('Database Query', logData);
    }
  }

  /**
   * Log de integração externa
   */
  integration(service, action, success, details = {}) {
    const logData = {
      service,
      action,
      success,
      ...details,
      integration: true
    };

    if (success) {
      this.info('Integration Success', logData);
    } else {
      this.error('Integration Failure', logData);
    }
  }

  /**
   * Log estruturado para diferentes contextos
   */
  structured(level, context, message, data = {}) {
    const logData = {
      context,
      ...data,
      structured: true
    };

    this.logger.log(level, message, logData);
  }

  /**
   * Capturar logs não tratados
   */
  setupGlobalHandlers() {
    // Capturar uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
        uncaught: true
      });
      
      // Dar tempo para o log ser escrito antes de sair
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    // Capturar unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.error('Unhandled Rejection', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: promise.toString(),
        unhandled: true
      });
    });

    // Log de início/parada da aplicação
    process.on('SIGTERM', () => {
      this.info('Application Shutdown', { signal: 'SIGTERM' });
    });

    process.on('SIGINT', () => {
      this.info('Application Shutdown', { signal: 'SIGINT' });
    });
  }

  /**
   * Rotacionar logs manualmente
   */
  rotateLogs() {
    this.logger.transports.forEach(transport => {
      if (transport.rotate) {
        transport.rotate();
      }
    });
  }

  /**
   * Obter estatísticas de logs
   */
  getStats() {
    const logFiles = fs.readdirSync(this.logDir)
      .filter(file => file.endsWith('.log'))
      .map(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      });

    return {
      logDirectory: this.logDir,
      totalFiles: logFiles.length,
      totalSize: logFiles.reduce((total, file) => total + file.size, 0),
      files: logFiles
    };
  }

  /**
   * Limpar logs antigos
   */
  cleanup(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const logFiles = fs.readdirSync(this.logDir);
    let deletedCount = 0;

    logFiles.forEach(file => {
      const filePath = path.join(this.logDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });

    this.info('Log Cleanup Completed', {
      deletedFiles: deletedCount,
      cutoffDate: cutoffDate.toISOString()
    });

    return deletedCount;
  }
}

// Instância singleton
const logger = new Logger();

// Configurar handlers globais
logger.setupGlobalHandlers();

module.exports = logger;