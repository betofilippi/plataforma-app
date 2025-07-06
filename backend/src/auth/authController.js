const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const knex = require('../database/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

class AuthController {
  
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email e senha são obrigatórios'
        });
      }

      // Find user by email (with fallback for development)
      let user;
      try {
        user = await knex('auth_users')
          .where({ email: email.toLowerCase() })
          .andWhere({ status: 'active' })
          .first();
      } catch (dbError) {
        // Fallback for development without database
        if (email === 'admin@plataforma.app' && password === 'admin123') {
          user = {
            id: 1,
            email: 'admin@plataforma.app',
            password_hash: await bcrypt.hash('admin123', 10),
            first_name: 'Admin',
            last_name: 'Plataforma',
            role: 'admin',
            status: 'active'
          };
        } else {
          user = null;
        }
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken();

      // Store session (with fallback for development)
      const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      
      try {
        await knex('auth_sessions').insert({
          user_id: user.id,
          token_hash: tokenHash,
          refresh_token_hash: refreshTokenHash,
          expires_at: new Date(Date.now() + this.parseExpiration(JWT_EXPIRES_IN)),
          ip_address: req.ip,
          user_agent: req.get('User-Agent') || ''
        });
      } catch (dbError) {
        console.warn('Session storage failed - continuing without database session:', dbError.message);
      }

      // Update last login (with fallback for development)
      try {
        await knex('auth_users')
          .where({ id: user.id })
          .update({ last_login_at: new Date() });
      } catch (dbError) {
        console.warn('Last login update failed - continuing:', dbError.message);
      }

      // Return user data (without password)
      const userData = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        preferences: user.preferences
      };

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          user: userData,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: JWT_EXPIRES_IN
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  async logout(req, res) {
    try {
      const token = req.token;
      
      if (token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        // Remove session from database
        await knex('auth_sessions')
          .where({ token_hash: tokenHash })
          .del();
      }

      res.json({
        success: true,
        message: 'Logout realizado com sucesso'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token é obrigatório'
        });
      }

      const refreshTokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');

      // Find valid session
      const session = await knex('auth_sessions')
        .where({ refresh_token_hash: refreshTokenHash })
        .andWhere('expires_at', '>', new Date())
        .first();

      if (!session) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token inválido ou expirado'
        });
      }

      // Get user data
      const user = await knex('auth_users')
        .where({ id: session.user_id })
        .andWhere({ status: 'active' })
        .first();

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken();

      // Update session
      const newTokenHash = crypto.createHash('sha256').update(newAccessToken).digest('hex');
      const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

      await knex('auth_sessions')
        .where({ id: session.id })
        .update({
          token_hash: newTokenHash,
          refresh_token_hash: newRefreshTokenHash,
          expires_at: new Date(Date.now() + this.parseExpiration(JWT_EXPIRES_IN)),
          updated_at: new Date()
        });

      res.json({
        success: true,
        data: {
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          expires_in: JWT_EXPIRES_IN
        }
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const user = await knex('auth_users')
        .select('id', 'email', 'first_name', 'last_name', 'role', 'preferences', 'last_login_at')
        .where({ id: userId })
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { first_name, last_name, preferences } = req.body;

      const updateData = {};
      if (first_name) updateData.first_name = first_name;
      if (last_name) updateData.last_name = last_name;
      if (preferences) updateData.preferences = JSON.stringify(preferences);

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum campo para atualizar'
        });
      }

      await knex('auth_users')
        .where({ id: userId })
        .update(updateData);

      res.json({
        success: true,
        message: 'Perfil atualizado com sucesso'
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  generateAccessToken(user) {
    return jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  parseExpiration(expiration) {
    const units = {
      'd': 24 * 60 * 60 * 1000, // days
      'h': 60 * 60 * 1000,     // hours
      'm': 60 * 1000,          // minutes
      's': 1000                // seconds
    };

    const match = expiration.match(/^(\d+)([dhms])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

    const [, amount, unit] = match;
    return parseInt(amount) * units[unit];
  }
}

const authController = new AuthController();

// Export both the controller and the router
module.exports = {
  ...authController,
  router: require('express').Router()
    .post('/login', authController.login.bind(authController))
    .post('/logout', authController.logout.bind(authController))
    .post('/refresh', authController.refreshToken.bind(authController))
    .get('/profile', authController.getProfile.bind(authController))
    .put('/profile', authController.updateProfile.bind(authController))
};