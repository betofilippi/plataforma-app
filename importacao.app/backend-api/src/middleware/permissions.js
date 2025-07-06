const { auditLogger } = require('../utils/auditLogger');

// Sistema RBAC (Role-Based Access Control) com permissões granulares
const PERMISSIONS = {
  // Usuários e Autenticação
  'users.create': ['admin'],
  'users.read': ['admin', 'manager', 'user'],
  'users.update': ['admin', 'manager'],
  'users.delete': ['admin'],
  'users.change_role': ['admin'],
  'users.reset_password': ['admin', 'manager'],

  // Configurações do Sistema
  'system.read': ['admin', 'manager'],
  'system.update': ['admin'],
  'system.backup': ['admin'],
  'system.restore': ['admin'],
  'system.logs': ['admin', 'manager'],

  // Módulos do ERP
  'cadastros.create': ['admin', 'manager', 'user'],
  'cadastros.read': ['admin', 'manager', 'user', 'viewer'],
  'cadastros.update': ['admin', 'manager', 'user'],
  'cadastros.delete': ['admin', 'manager'],

  'produtos.create': ['admin', 'manager', 'user'],
  'produtos.read': ['admin', 'manager', 'user', 'viewer'],
  'produtos.update': ['admin', 'manager', 'user'],
  'produtos.delete': ['admin', 'manager'],

  'vendas.create': ['admin', 'manager', 'user'],
  'vendas.read': ['admin', 'manager', 'user', 'viewer'],
  'vendas.update': ['admin', 'manager', 'user'],
  'vendas.delete': ['admin', 'manager'],

  'estoque.create': ['admin', 'manager', 'user'],
  'estoque.read': ['admin', 'manager', 'user', 'viewer'],
  'estoque.update': ['admin', 'manager', 'user'],
  'estoque.delete': ['admin', 'manager'],

  'fiscal.create': ['admin', 'manager'],
  'fiscal.read': ['admin', 'manager', 'user'],
  'fiscal.update': ['admin', 'manager'],
  'fiscal.delete': ['admin'],

  'importacao.create': ['admin', 'manager', 'user'],
  'importacao.read': ['admin', 'manager', 'user', 'viewer'],
  'importacao.update': ['admin', 'manager', 'user'],
  'importacao.delete': ['admin', 'manager'],

  'relatorios.read': ['admin', 'manager', 'user', 'viewer'],
  'relatorios.export': ['admin', 'manager', 'user'],

  // Webhooks e Integrações
  'webhooks.create': ['admin', 'manager'],
  'webhooks.read': ['admin', 'manager', 'user'],
  'webhooks.update': ['admin', 'manager'],
  'webhooks.delete': ['admin', 'manager'],

  'integracoes.create': ['admin', 'manager'],
  'integracoes.read': ['admin', 'manager', 'user'],
  'integracoes.update': ['admin', 'manager'],
  'integracoes.delete': ['admin', 'manager'],

  // Suporte e Tickets
  'suporte.create': ['admin', 'manager', 'user'],
  'suporte.read': ['admin', 'manager', 'user'],
  'suporte.update': ['admin', 'manager'],
  'suporte.delete': ['admin'],

  // Localização e Logs
  'localizacao.read': ['admin', 'manager', 'user', 'viewer'],
  'logs.read': ['admin', 'manager'],
  'logs.delete': ['admin'],

  // Compras e Processos
  'compras.create': ['admin', 'manager', 'user'],
  'compras.read': ['admin', 'manager', 'user', 'viewer'],
  'compras.update': ['admin', 'manager', 'user'],
  'compras.delete': ['admin', 'manager'],

  'processos.create': ['admin', 'manager'],
  'processos.read': ['admin', 'manager', 'user'],
  'processos.update': ['admin', 'manager'],
  'processos.delete': ['admin'],
};

const ROLE_HIERARCHY = {
  'admin': 4,
  'manager': 3,
  'user': 2,
  'viewer': 1
};

/**
 * Middleware para verificar permissões específicas
 * @param {string|string[]} permission - Permissão(ões) necessária(s)
 * @param {object} options - Opções adicionais
 */
const requirePermission = (permission, options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const userRole = req.user.role;
      const userId = req.user.id;
      const permissions = Array.isArray(permission) ? permission : [permission];

      // Verificar se o usuário tem pelo menos uma das permissões necessárias
      const hasPermission = permissions.some(perm => {
        const allowedRoles = PERMISSIONS[perm] || [];
        return allowedRoles.includes(userRole);
      });

      if (!hasPermission) {
        // Log da tentativa de acesso negado
        await auditLogger.logSecurityEvent({
          type: 'ACCESS_DENIED',
          user_id: userId,
          permission: permissions.join(','),
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          path: req.path,
          method: req.method
        });

        return res.status(403).json({
          success: false,
          message: 'Permissão insuficiente para esta operação',
          required_permissions: permissions,
          user_role: userRole
        });
      }

      // Verificar se é operação em próprio usuário (para alguns casos)
      if (options.allowOwnUser && req.params.userId) {
        const targetUserId = parseInt(req.params.userId);
        if (targetUserId === userId) {
          return next(); // Permitir operação no próprio usuário
        }
      }

      // Verificar hierarquia de roles para operações em outros usuários
      if (options.checkHierarchy && req.params.userId) {
        const knex = require('../database/connection');
        try {
          const targetUser = await knex('auth_users')
            .where({ id: req.params.userId })
            .first();

          if (targetUser) {
            const userLevel = ROLE_HIERARCHY[userRole] || 0;
            const targetLevel = ROLE_HIERARCHY[targetUser.role] || 0;

            if (userLevel <= targetLevel && userId !== targetUser.id) {
              return res.status(403).json({
                success: false,
                message: 'Não é possível realizar operações em usuários com nível igual ou superior'
              });
            }
          }
        } catch (error) {
          console.error('Erro ao verificar hierarquia de usuários:', error);
        }
      }

      // Log da operação autorizada
      await auditLogger.logSecurityEvent({
        type: 'ACCESS_GRANTED',
        user_id: userId,
        permission: permissions.join(','),
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });

      next();

    } catch (error) {
      console.error('Erro no middleware de permissões:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
};

/**
 * Middleware para verificar se usuário pode acessar dados de outro usuário
 */
const canAccessUser = (req, res, next) => {
  const currentUserId = req.user.id;
  const targetUserId = parseInt(req.params.userId || req.body.user_id);
  const userRole = req.user.role;

  // Admin pode acessar qualquer usuário
  if (userRole === 'admin') {
    return next();
  }

  // Manager pode acessar usuários com role 'user' ou 'viewer'
  if (userRole === 'manager') {
    // Verificar o role do usuário alvo
    const knex = require('../database/connection');
    knex('auth_users')
      .where({ id: targetUserId })
      .first()
      .then(targetUser => {
        if (!targetUser) {
          return res.status(404).json({
            success: false,
            message: 'Usuário não encontrado'
          });
        }

        if (['user', 'viewer'].includes(targetUser.role) || targetUserId === currentUserId) {
          return next();
        }

        return res.status(403).json({
          success: false,
          message: 'Permissão insuficiente para acessar este usuário'
        });
      })
      .catch(error => {
        console.error('Erro ao verificar permissão de usuário:', error);
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      });
    return;
  }

  // Usuários comuns só podem acessar seus próprios dados
  if (targetUserId === currentUserId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Você só pode acessar seus próprios dados'
  });
};

/**
 * Verificar se usuário tem permissão específica (sem middleware)
 */
const hasPermission = (userRole, permission) => {
  const allowedRoles = PERMISSIONS[permission] || [];
  return allowedRoles.includes(userRole);
};

/**
 * Obter todas as permissões de um role
 */
const getRolePermissions = (role) => {
  return Object.keys(PERMISSIONS).filter(permission => 
    PERMISSIONS[permission].includes(role)
  );
};

/**
 * Middleware para verificar se é super admin (para operações críticas)
 */
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso restrito a administradores'
    });
  }
  next();
};

module.exports = {
  requirePermission,
  canAccessUser,
  hasPermission,
  getRolePermissions,
  requireSuperAdmin,
  PERMISSIONS,
  ROLE_HIERARCHY
};