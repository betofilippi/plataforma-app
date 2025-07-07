const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDb } = require('../database/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso é obrigatório'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso inválido'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso expirado ou inválido'
      });
    }

    // Check if session exists in database (with fallback for development)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    let session, user;
    try {
      const knex = getDb();
      session = await knex('auth_sessions')
        .where({ token_hash: tokenHash })
        .andWhere('expires_at', '>', new Date())
        .first();

      if (!session) {
        return res.status(401).json({
          success: false,
          message: 'Sessão expirada ou inválida'
        });
      }

      // Get user data
      user = await knex('auth_users')
        .where({ id: decoded.user_id })
        .andWhere({ status: 'active' })
        .first();

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não encontrado ou inativo'
        });
      }
    } catch (dbError) {
      console.warn('Auth middleware database query failed - using mock auth:', dbError.message);
      // Fallback for development without database - validate JWT only
      if (decoded.user_id === 1 && decoded.email === 'admin@plataforma.app') {
        session = { id: 1, user_id: 1 };
        user = {
          id: 1,
          email: 'admin@plataforma.app',
          role: 'admin',
          first_name: 'Admin',
          last_name: 'Plataforma',
          status: 'active'
        };
      } else {
        return res.status(401).json({
          success: false,
          message: 'Usuário não encontrado ou inativo'
        });
      }
    }

    // Attach user and token to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name
    };
    req.token = token;
    req.session = session;

    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    // Try to verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return next();
    }

    // Check session (with fallback)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    let session, user;
    try {
      const knex = getDb();
      session = await knex('auth_sessions')
        .where({ token_hash: tokenHash })
        .andWhere('expires_at', '>', new Date())
        .first();

      if (!session) {
        return next();
      }

      // Get user
      user = await knex('auth_users')
        .where({ id: decoded.user_id })
        .andWhere({ status: 'active' })
        .first();
    } catch (dbError) {
      console.warn('Optional auth middleware database query failed - using mock auth:', dbError.message);
      // Fallback for development without database
      if (decoded.user_id === 1 && decoded.email === 'admin@plataforma.app') {
        session = { id: 1, user_id: 1 };
        user = {
          id: 1,
          email: 'admin@plataforma.app',
          role: 'admin',
          first_name: 'Admin',
          last_name: 'Plataforma',
          status: 'active'
        };
      } else {
        return next();
      }
    }

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name
      };
      req.token = token;
      req.session = session;
    }

    next();

  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    if (Array.isArray(roles)) {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Permissão insuficiente'
        });
      }
    } else {
      if (req.user.role !== roles) {
        return res.status(403).json({
          success: false,
          message: 'Permissão insuficiente'
        });
      }
    }

    next();
  };
};

const rateLimiter = (maxRequests = 10, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [ip, data] of requests.entries()) {
      data.requests = data.requests.filter(timestamp => timestamp > windowStart);
      if (data.requests.length === 0) {
        requests.delete(ip);
      }
    }

    // Get current requests for this IP
    if (!requests.has(key)) {
      requests.set(key, { requests: [] });
    }

    const userData = requests.get(key);
    userData.requests.push(now);

    if (userData.requests.length > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Muitas tentativas. Tente novamente em alguns minutos.',
        retry_after: Math.ceil(windowMs / 1000)
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  optionalAuth,
  requireRole,
  rateLimiter
};