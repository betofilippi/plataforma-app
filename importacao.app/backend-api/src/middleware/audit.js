const { auditLogger } = require('../utils/auditLogger');
const { performanceMonitor } = require('../utils/performanceMonitor');

/**
 * Middleware para logging automático de todas as operações
 */
const auditMiddleware = (options = {}) => {
  const {
    excludePaths = ['/health', '/metrics', '/favicon.ico'],
    excludeMethods = ['OPTIONS'],
    logBody = false,
    logResponse = false,
    logHeaders = false
  } = options;

  return async (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Adicionar request ID ao request para uso posterior
    req.requestId = requestId;

    // Pular paths excluídos
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Pular métodos excluídos
    if (excludeMethods.includes(req.method)) {
      return next();
    }

    // Interceptar o response
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody = null;

    res.send = function(body) {
      if (logResponse) {
        responseBody = body;
      }
      return originalSend.call(this, body);
    };

    res.json = function(body) {
      if (logResponse) {
        responseBody = body;
      }
      return originalJson.call(this, body);
    };

    // Interceptar o final da response
    res.on('finish', async () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      try {
        // Preparar dados do log
        const logData = {
          request_id: requestId,
          user_id: req.user ? req.user.id : null,
          method: req.method,
          path: req.path,
          query: Object.keys(req.query).length > 0 ? req.query : null,
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('User-Agent'),
          status_code: res.statusCode,
          duration_ms: duration,
          timestamp: new Date().toISOString()
        };

        // Adicionar headers se solicitado
        if (logHeaders) {
          logData.headers = {
            authorization: req.headers.authorization ? '[REDACTED]' : undefined,
            'content-type': req.headers['content-type'],
            accept: req.headers.accept,
            origin: req.headers.origin,
            referer: req.headers.referer
          };
        }

        // Adicionar body da requisição se solicitado (com sanitização)
        if (logBody && req.body && Object.keys(req.body).length > 0) {
          logData.request_body = sanitizeData(req.body);
        }

        // Adicionar body da resposta se solicitado (apenas para erros ou solicitado)
        if (logResponse && responseBody && (res.statusCode >= 400 || logResponse === true)) {
          try {
            const parsedBody = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
            logData.response_body = sanitizeData(parsedBody);
          } catch (e) {
            logData.response_body = responseBody;
          }
        }

        // Determinar tipo de evento
        let eventType = 'REQUEST';
        if (res.statusCode >= 500) {
          eventType = 'ERROR';
        } else if (res.statusCode >= 400) {
          eventType = 'CLIENT_ERROR';
        } else if (req.method !== 'GET') {
          eventType = 'MUTATION';
        }

        logData.event_type = eventType;

        // Determinar nível de log baseado no status
        if (res.statusCode >= 500) {
          await auditLogger.logError(logData);
        } else if (res.statusCode >= 400) {
          await auditLogger.logWarning(logData);
        } else {
          await auditLogger.logInfo(logData);
        }

        // Registrar métricas de performance
        await performanceMonitor.recordRequestMetrics({
          method: req.method,
          path: req.path,
          status_code: res.statusCode,
          duration_ms: duration,
          user_id: req.user ? req.user.id : null
        });

        // Alertas para requisições lentas
        if (duration > 5000) { // > 5 segundos
          await auditLogger.logWarning({
            ...logData,
            event_type: 'SLOW_REQUEST',
            message: `Requisição lenta detectada: ${duration}ms`
          });
        }

        // Alertas para muitos erros
        if (res.statusCode >= 500) {
          await performanceMonitor.checkErrorRate(req.path, req.method);
        }

      } catch (error) {
        console.error('Erro no middleware de auditoria:', error);
      }
    });

    next();
  };
};

/**
 * Middleware específico para operações sensíveis
 */
const auditSensitiveOperation = (operationType) => {
  return async (req, res, next) => {
    const startTime = Date.now();

    // Interceptar response para capturar resultado
    const originalJson = res.json;
    res.json = function(body) {
      // Log da operação sensível
      setTimeout(async () => {
        try {
          await auditLogger.logSensitiveOperation({
            operation_type: operationType,
            user_id: req.user ? req.user.id : null,
            user_email: req.user ? req.user.email : null,
            method: req.method,
            path: req.path,
            request_data: sanitizeData(req.body),
            response_data: res.statusCode < 400 ? { success: true } : sanitizeData(body),
            status_code: res.statusCode,
            duration_ms: Date.now() - startTime,
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Erro ao registrar operação sensível:', error);
        }
      }, 0);

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Sanitizar dados sensíveis antes de logar
 */
const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'password_hash',
    'token',
    'access_token',
    'refresh_token',
    'secret',
    'key',
    'authorization',
    'auth',
    'cpf',
    'cnpj',
    'credit_card',
    'card_number',
    'cvv',
    'pin'
  ];

  const sanitized = { ...data };

  const sanitizeRecursive = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeRecursive(item));
    }

    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeRecursive(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    return obj;
  };

  return sanitizeRecursive(sanitized);
};

/**
 * Middleware para log de mudanças em dados
 */
const auditDataChange = (tableName, options = {}) => {
  return async (req, res, next) => {
    // Capturar dados antes da mudança se necessário
    let beforeData = null;
    if (options.logBefore && req.params.id) {
      try {
        const knex = require('../database/connection');
        beforeData = await knex(tableName).where({ id: req.params.id }).first();
      } catch (error) {
        console.error('Erro ao capturar dados antes da mudança:', error);
      }
    }

    // Interceptar response para capturar dados após mudança
    const originalJson = res.json;
    res.json = function(body) {
      if (res.statusCode < 400) {
        setTimeout(async () => {
          try {
            await auditLogger.logDataChange({
              table_name: tableName,
              operation: req.method,
              record_id: req.params.id || (body.data && body.data.id),
              user_id: req.user ? req.user.id : null,
              before_data: beforeData ? sanitizeData(beforeData) : null,
              after_data: body.data ? sanitizeData(body.data) : null,
              changes: req.body ? sanitizeData(req.body) : null,
              ip_address: req.ip,
              user_agent: req.get('User-Agent'),
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('Erro ao registrar mudança de dados:', error);
          }
        }, 0);
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

module.exports = {
  auditMiddleware,
  auditSensitiveOperation,
  auditDataChange,
  sanitizeData
};