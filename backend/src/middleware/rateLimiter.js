const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { createClient } = require('redis');
const { auditLogger } = require('../utils/auditLogger');

// Configuração do Redis para rate limiting
let redisClient;
try {
  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    retry_strategy: (options) => {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        console.warn('Redis connection refused, using memory store for rate limiting');
        return undefined; // Não tentar reconectar
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        console.warn('Redis retry time exhausted, using memory store');
        return undefined;
      }
      return Math.min(options.attempt * 100, 3000);
    }
  });

  redisClient.on('error', (err) => {
    console.warn('Redis error for rate limiting:', err.message);
  });

  redisClient.connect().catch(err => {
    console.warn('Failed to connect to Redis for rate limiting:', err.message);
    redisClient = null;
  });
} catch (error) {
  console.warn('Redis setup failed for rate limiting, using memory store:', error.message);
  redisClient = null;
}

/**
 * Rate limiter básico para APIs gerais
 */
const createBasicRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const store = redisClient ? new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }) : undefined;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: 'Muitas requisições. Tente novamente mais tarde.',
      retry_after: Math.ceil(windowMs / 1000)
    },
    store,
    standardHeaders: true,
    legacyHeaders: false,
    onLimitReached: async (req, res, options) => {
      try {
        await auditLogger.logSecurityEvent({
          type: 'RATE_LIMIT_EXCEEDED',
          user_id: req.user ? req.user.id : null,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          limit: max,
          window_ms: windowMs
        });
      } catch (error) {
        console.error('Erro ao registrar rate limit excedido:', error);
      }
    },
    keyGenerator: (req) => {
      // Usar user ID se autenticado, senão IP
      return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
    }
  });
};

/**
 * Rate limiter rigoroso para autenticação
 */
const authRateLimit = createBasicRateLimit(15 * 60 * 1000, 5); // 5 tentativas por 15 minutos

/**
 * Rate limiter para operações sensíveis
 */
const sensitiveOperationsRateLimit = createBasicRateLimit(60 * 60 * 1000, 10); // 10 operações por hora

/**
 * Rate limiter para uploads
 */
const uploadRateLimit = createBasicRateLimit(60 * 60 * 1000, 20); // 20 uploads por hora

/**
 * Rate limiter por IP mais rigoroso
 */
const strictIPRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // 50 requisições por IP
  message: {
    success: false,
    message: 'Muitas requisições deste IP. Tente novamente mais tarde.',
    retry_after: 900
  },
  store: redisClient ? new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }) : undefined,
  keyGenerator: (req) => req.ip,
  onLimitReached: async (req, res, options) => {
    try {
      await auditLogger.logSecurityEvent({
        type: 'IP_RATE_LIMIT_EXCEEDED',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        limit: 50,
        window_ms: 15 * 60 * 1000
      });
    } catch (error) {
      console.error('Erro ao registrar IP rate limit excedido:', error);
    }
  }
});

/**
 * Rate limiter adaptativo baseado no usuário
 */
const adaptiveRateLimit = (req, res, next) => {
  if (!req.user) {
    // Usuários não autenticados têm limite mais baixo
    return strictIPRateLimit(req, res, next);
  }

  // Definir limites baseados no role do usuário
  const roleLimits = {
    admin: { windowMs: 15 * 60 * 1000, max: 1000 },
    manager: { windowMs: 15 * 60 * 1000, max: 500 },
    user: { windowMs: 15 * 60 * 1000, max: 200 },
    viewer: { windowMs: 15 * 60 * 1000, max: 100 }
  };

  const limits = roleLimits[req.user.role] || roleLimits.viewer;

  const userRateLimit = rateLimit({
    windowMs: limits.windowMs,
    max: limits.max,
    message: {
      success: false,
      message: `Limite de requisições excedido para o role ${req.user.role}. Tente novamente mais tarde.`,
      retry_after: Math.ceil(limits.windowMs / 1000)
    },
    store: redisClient ? new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    }) : undefined,
    keyGenerator: (req) => `user:${req.user.id}:${req.user.role}`,
    onLimitReached: async (req, res, options) => {
      try {
        await auditLogger.logSecurityEvent({
          type: 'USER_RATE_LIMIT_EXCEEDED',
          user_id: req.user.id,
          user_role: req.user.role,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          limit: limits.max,
          window_ms: limits.windowMs
        });
      } catch (error) {
        console.error('Erro ao registrar user rate limit excedido:', error);
      }
    }
  });

  return userRateLimit(req, res, next);
};

/**
 * Rate limiter para APIs específicas
 */
const createAPISpecificRateLimit = (apiPath, config = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Rate limit exceeded for this API endpoint',
    keyPrefix = 'api'
  } = config;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      retry_after: Math.ceil(windowMs / 1000)
    },
    store: redisClient ? new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    }) : undefined,
    keyGenerator: (req) => {
      const userId = req.user ? req.user.id : 'anonymous';
      return `${keyPrefix}:${apiPath}:${userId}:${req.ip}`;
    },
    onLimitReached: async (req, res, options) => {
      try {
        await auditLogger.logSecurityEvent({
          type: 'API_RATE_LIMIT_EXCEEDED',
          api_path: apiPath,
          user_id: req.user ? req.user.id : null,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          limit: max,
          window_ms: windowMs
        });
      } catch (error) {
        console.error('Erro ao registrar API rate limit excedido:', error);
      }
    }
  });
};

/**
 * Rate limiter progressivo que aumenta o delay após múltiplas violações
 */
const progressiveRateLimit = (req, res, next) => {
  const key = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
  
  // Este seria implementado com Redis para persistir entre requisições
  // Por simplicidade, usando um Map em memória (em produção usar Redis)
  if (!global.progressiveRateLimitStore) {
    global.progressiveRateLimitStore = new Map();
  }

  const store = global.progressiveRateLimitStore;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutos
  
  if (!store.has(key)) {
    store.set(key, { count: 0, violations: 0, lastReset: now });
  }

  const userData = store.get(key);
  
  // Reset counter se passou da janela de tempo
  if (now - userData.lastReset > windowMs) {
    userData.count = 0;
    userData.lastReset = now;
  }

  // Calcular limite baseado em violações anteriores
  const baseLimit = 100;
  const penaltyFactor = Math.pow(0.5, userData.violations); // Reduz pela metade a cada violação
  const currentLimit = Math.max(baseLimit * penaltyFactor, 10); // Mínimo de 10

  userData.count++;
  
  if (userData.count > currentLimit) {
    userData.violations++;
    
    // Log da violação
    auditLogger.logSecurityEvent({
      type: 'PROGRESSIVE_RATE_LIMIT_EXCEEDED',
      user_id: req.user ? req.user.id : null,
      ip_address: req.ip,
      violations: userData.violations,
      current_limit: currentLimit,
      current_count: userData.count
    });

    return res.status(429).json({
      success: false,
      message: `Rate limit excedido. Limite atual: ${Math.floor(currentLimit)} (baseado em ${userData.violations} violações anteriores)`,
      retry_after: Math.ceil(windowMs / 1000),
      violations: userData.violations
    });
  }

  next();
};

/**
 * Middleware para limpar dados de rate limiting antigos
 */
const cleanupRateLimitData = async () => {
  if (!redisClient) return;

  try {
    const pattern = 'rl:*'; // Padrão das chaves do rate limiter
    const keys = await redisClient.keys(pattern);
    
    for (const key of keys) {
      const ttl = await redisClient.ttl(key);
      if (ttl < 0) { // Chave sem TTL ou expirada
        await redisClient.del(key);
      }
    }
    
    console.log(`Limpeza de rate limit: ${keys.length} chaves verificadas`);
  } catch (error) {
    console.error('Erro na limpeza de dados de rate limiting:', error);
  }
};

// Executar limpeza a cada hora
setInterval(cleanupRateLimitData, 60 * 60 * 1000);

module.exports = {
  createBasicRateLimit,
  authRateLimit,
  sensitiveOperationsRateLimit,
  uploadRateLimit,
  strictIPRateLimit,
  adaptiveRateLimit,
  createAPISpecificRateLimit,
  progressiveRateLimit,
  cleanupRateLimitData
};