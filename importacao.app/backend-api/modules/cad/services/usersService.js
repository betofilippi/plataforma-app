const db = require('../../../src/database/connection');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * Service for users operations
 * Handles comprehensive user management and authentication
 */

class UsersService {
  /**
   * Get all users with pagination and filters
   */
  async getAllUsers(options = {}) {
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
    } = options;

    try {
      const offset = (page - 1) * limit;
      
      // Base query
      let query = db('cad_usuarios as u')
        .select([
          'u.id_usuario',
          'u.nome',
          'u.email',
          'u.telefone',
          'u.cargo',
          'u.departamento',
          'u.tipo_usuario',
          'u.nivel_acesso',
          'u.ativo',
          'u.ultimo_login',
          'u.data_criacao',
          'u.data_expiracao',
          'u.tentativas_login',
          'u.bloqueado',
          'u.created_at',
          'u.updated_at',
          db.raw('(SELECT COUNT(*) FROM cad_usuario_empresas WHERE id_usuario = u.id_usuario) as total_empresas_acesso'),
          db.raw('(SELECT COUNT(*) FROM cad_usuario_permissoes WHERE id_usuario = u.id_usuario) as total_permissoes')
        ]);

      // Apply filters
      if (search) {
        query.where(function() {
          this.whereILike('u.nome', `%${search}%`)
              .orWhereILike('u.email', `%${search}%`)
              .orWhereILike('u.cargo', `%${search}%`)
              .orWhereILike('u.departamento', `%${search}%`);
        });
      }

      if (ativo !== null) {
        query.where('u.ativo', ativo);
      }

      if (tipo_usuario) {
        query.where('u.tipo_usuario', tipo_usuario);
      }

      if (departamento) {
        query.whereILike('u.departamento', `%${departamento}%`);
      }

      if (bloqueado !== null) {
        query.where('u.bloqueado', bloqueado);
      }

      if (nivel_acesso !== null) {
        query.where('u.nivel_acesso', nivel_acesso);
      }

      // Count total
      const totalQuery = query.clone().count('u.id_usuario as count').first();
      const { count: total } = await totalQuery;

      // Apply sorting and pagination
      query.orderBy(`u.${sort}`, order)
           .limit(limit)
           .offset(offset);

      const users = await query;

      return {
        data: users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error in UsersService.getAllUsers:', error);
      throw new Error('Erro ao buscar usuários');
    }
  }

  /**
   * Get user by ID with detailed information
   */
  async getUserById(id, includePermissions = false) {
    try {
      const user = await db('cad_usuarios as u')
        .select([
          'u.*',
          db.raw('(SELECT COUNT(*) FROM cad_usuario_empresas WHERE id_usuario = u.id_usuario) as total_empresas_acesso')
        ])
        .where('u.id_usuario', id)
        .first();

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Remove password from response
      delete user.senha_hash;

      if (includePermissions) {
        // Get user companies access
        user.empresas_acesso = await db('cad_usuario_empresas as ue')
          .join('cad_empresas as e', 'ue.id_empresa', 'e.id_empresa')
          .select(['e.id_empresa', 'e.razao_social', 'e.nome_fantasia'])
          .where('ue.id_usuario', id);

        // Get user permissions
        user.permissoes = await db('cad_usuario_permissoes as up')
          .join('cad_permissoes as p', 'up.id_permissao', 'p.id_permissao')
          .select(['p.codigo', 'p.nome', 'p.modulo', 'up.pode_ler', 'up.pode_criar', 'up.pode_editar', 'up.pode_excluir'])
          .where('up.id_usuario', id);
      }

      return user;
    } catch (error) {
      console.error('Error in UsersService.getUserById:', error);
      if (error.message.includes('não encontrado')) {
        throw error;
      }
      throw new Error('Erro ao buscar usuário');
    }
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    const trx = await db.transaction();
    
    try {
      // Validate email uniqueness
      const existingEmail = await trx('cad_usuarios')
        .where('email', userData.email)
        .first();

      if (existingEmail) {
        throw new Error('Já existe um usuário com este email');
      }

      // Hash password
      const saltRounds = 12;
      const senha_hash = await bcrypt.hash(userData.senha, saltRounds);

      const newUser = {
        nome: userData.nome,
        email: userData.email,
        telefone: userData.telefone,
        cargo: userData.cargo,
        departamento: userData.departamento,
        tipo_usuario: userData.tipo_usuario,
        nivel_acesso: userData.nivel_acesso,
        senha_hash,
        data_criacao: new Date(),
        data_expiracao: userData.data_expiracao ? new Date(userData.data_expiracao) : null,
        tentativas_login: 0,
        bloqueado: false,
        ativo: userData.ativo !== undefined ? userData.ativo : true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [id] = await trx('cad_usuarios').insert(newUser).returning('id_usuario');
      const userId = id.id_usuario || id;

      // Associate with companies if provided
      if (userData.empresas_acesso && userData.empresas_acesso.length > 0) {
        const empresasData = userData.empresas_acesso.map(empresaId => ({
          id_usuario: userId,
          id_empresa: empresaId
        }));
        await trx('cad_usuario_empresas').insert(empresasData);
      }

      // Set permissions if provided
      if (userData.permissoes && userData.permissoes.length > 0) {
        const permissoesData = userData.permissoes.map(permissao => ({
          id_usuario: userId,
          id_permissao: permissao.id_permissao,
          pode_ler: permissao.pode_ler || false,
          pode_criar: permissao.pode_criar || false,
          pode_editar: permissao.pode_editar || false,
          pode_excluir: permissao.pode_excluir || false
        }));
        await trx('cad_usuario_permissoes').insert(permissoesData);
      }

      await trx.commit();
      return await this.getUserById(userId);
    } catch (error) {
      await trx.rollback();
      console.error('Error in UsersService.createUser:', error);
      if (error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao criar usuário');
    }
  }

  /**
   * Update user
   */
  async updateUser(id, updateData) {
    const trx = await db.transaction();
    
    try {
      const user = await this.getUserById(id);

      // Check for duplicate email (excluding current user)
      if (updateData.email) {
        const existing = await trx('cad_usuarios')
          .where('email', updateData.email)
          .whereNot('id_usuario', id)
          .first();

        if (existing) {
          throw new Error('Já existe um usuário com este email');
        }
      }

      const updatedData = {
        ...updateData,
        updated_at: new Date()
      };

      // Remove sensitive fields that shouldn't be updated directly
      delete updatedData.senha;
      delete updatedData.senha_hash;
      delete updatedData.empresas_acesso;
      delete updatedData.permissoes;

      await trx('cad_usuarios').where('id_usuario', id).update(updatedData);

      // Update companies access if provided
      if (updateData.empresas_acesso !== undefined) {
        await trx('cad_usuario_empresas').where('id_usuario', id).del();
        
        if (updateData.empresas_acesso.length > 0) {
          const empresasData = updateData.empresas_acesso.map(empresaId => ({
            id_usuario: id,
            id_empresa: empresaId
          }));
          await trx('cad_usuario_empresas').insert(empresasData);
        }
      }

      // Update permissions if provided
      if (updateData.permissoes !== undefined) {
        await trx('cad_usuario_permissoes').where('id_usuario', id).del();
        
        if (updateData.permissoes.length > 0) {
          const permissoesData = updateData.permissoes.map(permissao => ({
            id_usuario: id,
            id_permissao: permissao.id_permissao,
            pode_ler: permissao.pode_ler || false,
            pode_criar: permissao.pode_criar || false,
            pode_editar: permissao.pode_editar || false,
            pode_excluir: permissao.pode_excluir || false
          }));
          await trx('cad_usuario_permissoes').insert(permissoesData);
        }
      }

      await trx.commit();
      return await this.getUserById(id);
    } catch (error) {
      await trx.rollback();
      console.error('Error in UsersService.updateUser:', error);
      if (error.message.includes('não encontrado') || 
          error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao atualizar usuário');
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id) {
    const trx = await db.transaction();
    
    try {
      const user = await this.getUserById(id);

      // Check for dependencies (orders, logs, etc.)
      const dependencies = await Promise.all([
        trx('vnd_pedidos').where('id_usuario_vendedor', id).count().first(),
        trx('cmp_pedidos_compra').where('id_usuario_comprador', id).count().first(),
        trx('log_sistema').where('id_usuario', id).count().first()
      ]);

      const hasDependencies = dependencies.some(dep => parseInt(dep.count) > 0);

      if (hasDependencies) {
        // Instead of deleting, deactivate the user
        await trx('cad_usuarios')
          .where('id_usuario', id)
          .update({ 
            ativo: false, 
            email: `deleted_${Date.now()}_${user.email}`,
            updated_at: new Date() 
          });
        
        await trx.commit();
        return { message: 'Usuário desativado com sucesso (possui registros associados)' };
      }

      // Delete related records
      await trx('cad_usuario_empresas').where('id_usuario', id).del();
      await trx('cad_usuario_permissoes').where('id_usuario', id).del();
      await trx('cad_usuario_sessoes').where('id_usuario', id).del();

      // Delete user
      await trx('cad_usuarios').where('id_usuario', id).del();

      await trx.commit();
      return { message: 'Usuário removido com sucesso' };
    } catch (error) {
      await trx.rollback();
      console.error('Error in UsersService.deleteUser:', error);
      if (error.message.includes('não encontrado')) {
        throw error;
      }
      throw new Error('Erro ao remover usuário');
    }
  }

  /**
   * Reset user password
   */
  async resetPassword(userId, newPassword) {
    try {
      const user = await this.getUserById(userId);

      const saltRounds = 12;
      const senha_hash = await bcrypt.hash(newPassword, saltRounds);

      await db('cad_usuarios')
        .where('id_usuario', userId)
        .update({
          senha_hash,
          tentativas_login: 0,
          bloqueado: false,
          data_alteracao_senha: new Date(),
          updated_at: new Date()
        });

      return { message: 'Senha redefinida com sucesso' };
    } catch (error) {
      console.error('Error in UsersService.resetPassword:', error);
      if (error.message.includes('não encontrado')) {
        throw error;
      }
      throw new Error('Erro ao redefinir senha');
    }
  }

  /**
   * Authenticate user
   */
  async authenticateUser(email, password) {
    try {
      const user = await db('cad_usuarios')
        .where('email', email)
        .where('ativo', true)
        .first();

      if (!user) {
        throw new Error('Credenciais inválidas');
      }

      if (user.bloqueado) {
        throw new Error('Usuário bloqueado. Entre em contato com o administrador');
      }

      if (user.data_expiracao && new Date(user.data_expiracao) < new Date()) {
        throw new Error('Usuário expirado. Entre em contato com o administrador');
      }

      const isValidPassword = await bcrypt.compare(password, user.senha_hash);

      if (!isValidPassword) {
        // Increment login attempts
        const tentativas = user.tentativas_login + 1;
        const shouldBlock = tentativas >= 5;

        await db('cad_usuarios')
          .where('id_usuario', user.id_usuario)
          .update({
            tentativas_login: tentativas,
            bloqueado: shouldBlock,
            updated_at: new Date()
          });

        if (shouldBlock) {
          throw new Error('Usuário bloqueado após 5 tentativas inválidas');
        }

        throw new Error('Credenciais inválidas');
      }

      // Reset login attempts and update last login
      await db('cad_usuarios')
        .where('id_usuario', user.id_usuario)
        .update({
          tentativas_login: 0,
          ultimo_login: new Date(),
          updated_at: new Date()
        });

      // Remove password from response
      delete user.senha_hash;

      return user;
    } catch (error) {
      console.error('Error in UsersService.authenticateUser:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    try {
      const [total, ativos, bloqueados, porTipo, porNivel] = await Promise.all([
        db('cad_usuarios').count().first(),
        db('cad_usuarios').where('ativo', true).count().first(),
        db('cad_usuarios').where('bloqueado', true).count().first(),
        db('cad_usuarios')
          .select('tipo_usuario')
          .count()
          .groupBy('tipo_usuario'),
        db('cad_usuarios')
          .select('nivel_acesso')
          .count()
          .groupBy('nivel_acesso')
          .orderBy('nivel_acesso')
      ]);

      const ultimosLogins = await db('cad_usuarios')
        .select(['nome', 'email', 'ultimo_login'])
        .where('ativo', true)
        .whereNotNull('ultimo_login')
        .orderBy('ultimo_login', 'desc')
        .limit(5);

      return {
        total: parseInt(total.count),
        ativos: parseInt(ativos.count),
        inativos: parseInt(total.count) - parseInt(ativos.count),
        bloqueados: parseInt(bloqueados.count),
        por_tipo: porTipo.map(stat => ({
          tipo: stat.tipo_usuario,
          quantidade: parseInt(stat.count)
        })),
        por_nivel: porNivel.map(stat => ({
          nivel: stat.nivel_acesso,
          quantidade: parseInt(stat.count)
        })),
        ultimos_logins: ultimosLogins
      };
    } catch (error) {
      console.error('Error in UsersService.getUserStats:', error);
      throw new Error('Erro ao buscar estatísticas de usuários');
    }
  }

  /**
   * Bulk operations on users
   */
  async bulkOperations(operation, userIds, data = {}) {
    const trx = await db.transaction();
    
    try {
      switch (operation) {
        case 'activate':
          await trx('cad_usuarios')
            .whereIn('id_usuario', userIds)
            .update({ ativo: true, updated_at: new Date() });
          break;

        case 'deactivate':
          await trx('cad_usuarios')
            .whereIn('id_usuario', userIds)
            .update({ ativo: false, updated_at: new Date() });
          break;

        case 'block':
          await trx('cad_usuarios')
            .whereIn('id_usuario', userIds)
            .update({ bloqueado: true, updated_at: new Date() });
          break;

        case 'unblock':
          await trx('cad_usuarios')
            .whereIn('id_usuario', userIds)
            .update({ 
              bloqueado: false, 
              tentativas_login: 0,
              updated_at: new Date() 
            });
          break;

        case 'reset_password':
          if (!data.newPassword) {
            throw new Error('Nova senha é obrigatória');
          }
          
          const saltRounds = 12;
          const senha_hash = await bcrypt.hash(data.newPassword, saltRounds);
          
          await trx('cad_usuarios')
            .whereIn('id_usuario', userIds)
            .update({ 
              senha_hash,
              tentativas_login: 0,
              bloqueado: false,
              data_alteracao_senha: new Date(),
              updated_at: new Date()
            });
          break;

        case 'set_expiration':
          if (!data.data_expiracao) {
            throw new Error('Data de expiração é obrigatória');
          }
          
          await trx('cad_usuarios')
            .whereIn('id_usuario', userIds)
            .update({ 
              data_expiracao: new Date(data.data_expiracao),
              updated_at: new Date() 
            });
          break;

        case 'delete':
          // Check for dependencies for all users
          const dependencies = await trx('vnd_pedidos')
            .whereIn('id_usuario_vendedor', userIds)
            .count().first();
          
          if (parseInt(dependencies.count) > 0 && !data.force) {
            throw new Error('Alguns usuários possuem registros associados');
          }

          if (data.force) {
            // Deactivate instead of deleting
            await trx('cad_usuarios')
              .whereIn('id_usuario', userIds)
              .update({ ativo: false, updated_at: new Date() });
          } else {
            // Delete related records first
            await trx('cad_usuario_empresas').whereIn('id_usuario', userIds).del();
            await trx('cad_usuario_permissoes').whereIn('id_usuario', userIds).del();
            await trx('cad_usuario_sessoes').whereIn('id_usuario', userIds).del();
            await trx('cad_usuarios').whereIn('id_usuario', userIds).del();
          }
          break;

        default:
          throw new Error('Operação não suportada');
      }

      await trx.commit();
      return { affected: userIds.length };
    } catch (error) {
      await trx.rollback();
      console.error('Error in UsersService.bulkOperations:', error);
      throw error;
    }
  }

  /**
   * Export users to different formats
   */
  async exportUsers(format = 'csv', filters = {}) {
    try {
      const users = await db('cad_usuarios')
        .select([
          'nome',
          'email',
          'telefone',
          'cargo',
          'departamento',
          'tipo_usuario',
          'nivel_acesso',
          'data_criacao',
          'ultimo_login',
          'ativo',
          'bloqueado'
        ])
        .modify(queryBuilder => {
          if (filters.ativo !== undefined) {
            queryBuilder.where('ativo', filters.ativo);
          }
          if (filters.tipo_usuario) {
            queryBuilder.where('tipo_usuario', filters.tipo_usuario);
          }
          if (filters.bloqueado !== undefined) {
            queryBuilder.where('bloqueado', filters.bloqueado);
          }
          if (filters.departamento) {
            queryBuilder.whereILike('departamento', `%${filters.departamento}%`);
          }
        })
        .orderBy('nome');

      if (format === 'csv') {
        let csv = 'Nome,Email,Telefone,Cargo,Departamento,Tipo Usuario,Nivel Acesso,Data Criacao,Ultimo Login,Ativo,Bloqueado\n';
        
        users.forEach(user => {
          csv += [
            user.nome || '',
            user.email || '',
            user.telefone || '',
            user.cargo || '',
            user.departamento || '',
            user.tipo_usuario || '',
            user.nivel_acesso || '',
            user.data_criacao ? new Date(user.data_criacao).toLocaleDateString('pt-BR') : '',
            user.ultimo_login ? new Date(user.ultimo_login).toLocaleDateString('pt-BR') : '',
            user.ativo ? 'Sim' : 'Não',
            user.bloqueado ? 'Sim' : 'Não'
          ].map(field => `"${field}"`).join(',') + '\n';
        });

        return csv;
      } else {
        return users;
      }
    } catch (error) {
      console.error('Error in UsersService.exportUsers:', error);
      throw new Error('Erro ao exportar usuários');
    }
  }

  /**
   * Get users for select dropdown
   */
  async getUsersForSelect(search = '', typeFilter = null) {
    try {
      let query = db('cad_usuarios')
        .select([
          'id_usuario as value',
          'nome as label',
          'email',
          'tipo_usuario',
          'cargo'
        ])
        .where('ativo', true);

      if (search) {
        query.where(function() {
          this.whereILike('nome', `%${search}%`)
              .orWhereILike('email', `%${search}%`)
              .orWhereILike('cargo', `%${search}%`);
        });
      }

      if (typeFilter) {
        query.where('tipo_usuario', typeFilter);
      }

      return await query.orderBy('nome').limit(50);
    } catch (error) {
      console.error('Error in UsersService.getUsersForSelect:', error);
      throw new Error('Erro ao buscar usuários para seleção');
    }
  }

  /**
   * Check user permissions
   */
  async checkUserPermission(userId, module, action) {
    try {
      const permission = await db('cad_usuario_permissoes as up')
        .join('cad_permissoes as p', 'up.id_permissao', 'p.id_permissao')
        .where('up.id_usuario', userId)
        .where('p.modulo', module)
        .first();

      if (!permission) {
        return false;
      }

      const actionMap = {
        'read': 'pode_ler',
        'create': 'pode_criar',
        'update': 'pode_editar',
        'delete': 'pode_excluir'
      };

      return permission[actionMap[action]] || false;
    } catch (error) {
      console.error('Error in UsersService.checkUserPermission:', error);
      return false;
    }
  }

  /**
   * Get user session info
   */
  async getUserSession(userId) {
    try {
      const session = await db('cad_usuario_sessoes')
        .where('id_usuario', userId)
        .where('ativo', true)
        .orderBy('created_at', 'desc')
        .first();

      return session;
    } catch (error) {
      console.error('Error in UsersService.getUserSession:', error);
      throw new Error('Erro ao buscar sessão do usuário');
    }
  }

  /**
   * Create user session
   */
  async createUserSession(userId, token, expiresAt, ipAddress, userAgent) {
    try {
      const sessionData = {
        id_usuario: userId,
        token_sessao: token,
        expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent,
        ativo: true,
        created_at: new Date()
      };

      // Deactivate old sessions
      await db('cad_usuario_sessoes')
        .where('id_usuario', userId)
        .update({ ativo: false });

      const [id] = await db('cad_usuario_sessoes').insert(sessionData).returning('id_sessao');
      return id.id_sessao || id;
    } catch (error) {
      console.error('Error in UsersService.createUserSession:', error);
      throw new Error('Erro ao criar sessão do usuário');
    }
  }

  /**
   * Validation helpers
   */
  
  validateUserType(tipo) {
    const validTypes = ['ADMIN', 'GERENTE', 'OPERADOR', 'VENDEDOR', 'COMPRADOR'];
    return validTypes.includes(tipo);
  }

  validateAccessLevel(nivel) {
    return nivel >= 1 && nivel <= 5;
  }

  validatePassword(password) {
    // Minimum 8 characters, at least one letter and one number
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return regex.test(password);
  }

  generateTemporaryPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

module.exports = new UsersService();