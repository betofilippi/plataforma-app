const usersService = require('../services/usersService');
const { userSchema, userUpdateSchema } = require('../services/validationService');

/**
 * Controller for users CRUD operations
 * Handles HTTP requests and responses for user management
 */

class UsersController {
  /**
   * Get all users with pagination and filters
   * GET /api/cad/users
   */
  async getAllUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        search = '',
        ativo = null,
        tipo_usuario = null,
        departamento = null,
        bloqueado = null,
        nivel_acesso = null,
        sort = 'nome',
        order = 'asc'
      } = req.validatedQuery || req.query;

      const result = await usersService.getAllUsers({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : null,
        tipo_usuario,
        departamento,
        bloqueado: bloqueado === 'true' ? true : bloqueado === 'false' ? false : null,
        nivel_acesso: nivel_acesso ? parseInt(nivel_acesso) : null,
        sort,
        order
      });

      res.json({
        success: true,
        message: 'Usuários recuperados com sucesso',
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get user by ID
   * GET /api/cad/users/:id
   */
  async getUserById(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const { include_permissions = false } = req.query;
      
      const user = await usersService.getUserById(
        parseInt(id), 
        include_permissions === 'true'
      );

      res.json({
        success: true,
        message: 'Usuário encontrado com sucesso',
        data: user,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getUserById:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Usuário não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create new user
   * POST /api/cad/users
   */
  async createUser(req, res) {
    try {
      const validatedData = req.validatedData || req.body;

      // Validate user type and access level
      if (!usersService.validateUserType(validatedData.tipo_usuario)) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Tipo de usuário inválido',
          timestamp: new Date().toISOString()
        });
      }

      if (!usersService.validateAccessLevel(validatedData.nivel_acesso)) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Nível de acesso deve ser entre 1 e 5',
          timestamp: new Date().toISOString()
        });
      }

      // Validate password strength
      if (validatedData.senha && !usersService.validatePassword(validatedData.senha)) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Senha deve ter no mínimo 8 caracteres, incluindo letra e número',
          timestamp: new Date().toISOString()
        });
      }

      const newUser = await usersService.createUser(validatedData);

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: newUser,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createUser:', error);
      const statusCode = error.message.includes('Já existe') ? 409 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update user
   * PUT /api/cad/users/:id
   */
  async updateUser(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const validatedData = req.validatedData || req.body;

      // Validate user type if provided
      if (validatedData.tipo_usuario && !usersService.validateUserType(validatedData.tipo_usuario)) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Tipo de usuário inválido',
          timestamp: new Date().toISOString()
        });
      }

      // Validate access level if provided
      if (validatedData.nivel_acesso && !usersService.validateAccessLevel(validatedData.nivel_acesso)) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Nível de acesso deve ser entre 1 e 5',
          timestamp: new Date().toISOString()
        });
      }

      const updatedUser = await usersService.updateUser(parseInt(id), validatedData);

      res.json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: updatedUser,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateUser:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('Já existe')) {
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Usuário não encontrado' : 
               statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete user
   * DELETE /api/cad/users/:id
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const result = await usersService.deleteUser(parseInt(id));

      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in deleteUser:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Usuário não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Reset user password
   * POST /api/cad/users/:id/reset-password
   */
  async resetPassword(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Nova senha é obrigatória',
          timestamp: new Date().toISOString()
        });
      }

      if (!usersService.validatePassword(newPassword)) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Senha deve ter no mínimo 8 caracteres, incluindo letra e número',
          timestamp: new Date().toISOString()
        });
      }

      const result = await usersService.resetPassword(parseInt(id), newPassword);

      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in resetPassword:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Usuário não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Generate temporary password
   * POST /api/cad/users/:id/generate-password
   */
  async generateTemporaryPassword(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const temporaryPassword = usersService.generateTemporaryPassword();
      
      const result = await usersService.resetPassword(parseInt(id), temporaryPassword);

      res.json({
        success: true,
        message: 'Senha temporária gerada com sucesso',
        data: { temporaryPassword },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in generateTemporaryPassword:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Usuário não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Authenticate user
   * POST /api/auth/login
   */
  async authenticateUser(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Email e senha são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      const user = await usersService.authenticateUser(email, password);

      res.json({
        success: true,
        message: 'Autenticação realizada com sucesso',
        data: user,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in authenticateUser:', error);
      res.status(401).json({
        success: false,
        error: 'Falha na autenticação',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get user statistics
   * GET /api/cad/users/stats
   */
  async getUserStats(req, res) {
    try {
      const stats = await usersService.getUserStats();

      res.json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getUserStats:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Bulk operations on users
   * POST /api/cad/users/bulk
   */
  async bulkOperations(req, res) {
    try {
      const { operation, userIds, data = {} } = req.body;

      if (!operation || !userIds || !Array.isArray(userIds)) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Operação e IDs dos usuários são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      // Validate password for reset_password operation
      if (operation === 'reset_password' && data.newPassword) {
        if (!usersService.validatePassword(data.newPassword)) {
          return res.status(400).json({
            success: false,
            error: 'Dados inválidos',
            message: 'Senha deve ter no mínimo 8 caracteres, incluindo letra e número',
            timestamp: new Date().toISOString()
          });
        }
      }

      const result = await usersService.bulkOperations(operation, userIds, data);

      res.json({
        success: true,
        message: `Operação '${operation}' executada com sucesso`,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in bulkOperations:', error);
      const statusCode = error.message.includes('obrigatório') || 
                        error.message.includes('inválido') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 400 ? 'Dados inválidos' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Toggle user active status
   * PATCH /api/cad/users/:id/toggle-status
   */
  async toggleUserStatus(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const user = await usersService.getUserById(parseInt(id));
      
      const updatedUser = await usersService.updateUser(parseInt(id), {
        ativo: !user.ativo
      });

      res.json({
        success: true,
        message: `Usuário ${updatedUser.ativo ? 'ativado' : 'desativado'} com sucesso`,
        data: { id: updatedUser.id_usuario, ativo: updatedUser.ativo },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in toggleUserStatus:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Usuário não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Toggle user blocked status
   * PATCH /api/cad/users/:id/toggle-block
   */
  async toggleUserBlock(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const user = await usersService.getUserById(parseInt(id));
      
      const updatedUser = await usersService.updateUser(parseInt(id), {
        bloqueado: !user.bloqueado,
        tentativas_login: 0 // Reset attempts when unblocking
      });

      res.json({
        success: true,
        message: `Usuário ${updatedUser.bloqueado ? 'bloqueado' : 'desbloqueado'} com sucesso`,
        data: { id: updatedUser.id_usuario, bloqueado: updatedUser.bloqueado },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in toggleUserBlock:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Usuário não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get users for select dropdown
   * GET /api/cad/users/select
   */
  async getUsersForSelect(req, res) {
    try {
      const { search = '', type = null } = req.query;
      const users = await usersService.getUsersForSelect(search, type);

      res.json({
        success: true,
        message: 'Usuários para seleção recuperados com sucesso',
        data: users,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getUsersForSelect:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check user permission
   * GET /api/cad/users/:id/permissions/:module/:action
   */
  async checkUserPermission(req, res) {
    try {
      const { id, module, action } = req.params;
      const hasPermission = await usersService.checkUserPermission(
        parseInt(id), 
        module, 
        action
      );

      res.json({
        success: true,
        message: 'Permissão verificada com sucesso',
        data: { hasPermission },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in checkUserPermission:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Export users to CSV/JSON
   * GET /api/cad/users/export
   */
  async exportUsers(req, res) {
    try {
      const { 
        search = '', 
        ativo = null, 
        tipo_usuario = null,
        departamento = null,
        bloqueado = null,
        formato = 'csv'
      } = req.query;
      
      const filters = {
        search,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : null,
        tipo_usuario,
        departamento,
        bloqueado: bloqueado === 'true' ? true : bloqueado === 'false' ? false : null
      };

      if (formato === 'csv') {
        const csvData = await usersService.exportUsers('csv', filters);

        // Set CSV headers
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=usuarios.csv');
        res.setHeader('Cache-Control', 'no-cache');

        res.send(csvData);
      } else {
        // JSON export
        const result = await usersService.getAllUsers({
          page: 1,
          limit: 10000, // Large limit for export
          ...filters,
          sort: 'nome',
          order: 'asc'
        });

        res.json({
          success: true,
          message: 'Usuários exportados com sucesso',
          data: result.data,
          total: result.pagination.total,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in exportUsers:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get user types for filters
   * GET /api/cad/users/types
   */
  async getUserTypes(req, res) {
    try {
      const types = [
        { value: 'ADMIN', label: 'Administrador' },
        { value: 'GERENTE', label: 'Gerente' },
        { value: 'OPERADOR', label: 'Operador' },
        { value: 'VENDEDOR', label: 'Vendedor' },
        { value: 'COMPRADOR', label: 'Comprador' }
      ];

      res.json({
        success: true,
        message: 'Tipos de usuário recuperados com sucesso',
        data: types,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getUserTypes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get user session information
   * GET /api/cad/users/:id/session
   */
  async getUserSession(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const session = await usersService.getUserSession(parseInt(id));

      res.json({
        success: true,
        message: 'Informações de sessão recuperadas com sucesso',
        data: session,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getUserSession:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new UsersController();