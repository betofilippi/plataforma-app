const { getDb } = require('../../../src/database/connection');

/**
 * Service layer for clients (importacao_clientes)
 * Handles all database operations for client management
 */

class ClientsService {
  constructor() {
    this.tableName = 'importacao_clientes';
  }

  /**
   * Get all clients with pagination and filters
   */
  async getAllClients({
    page = 1,
    limit = 10,
    search = '',
    ativo = null,
    sort = 'nome',
    order = 'asc'
  } = {}) {
    try {
      const offset = (page - 1) * limit;
      
      const db = getDb();
      let query = db(this.tableName)
        .select([
          'id',
          'tipo_pessoa',
          'cpf_cnpj',
          'nome',
          'email',
          'telefone',
          'endereco',
          'cidade',
          'estado',
          'cep',
          'status',
          'limite_credito',
          'saldo_devedor',
          'data_cadastro',
          'created_at',
          'updated_at'
        ]);

      // Apply filters
      if (search) {
        query = query.where(function() {
          this.where('nome', 'like', `%${search}%`)
              .orWhere('email', 'like', `%${search}%`)
              .orWhere('cpf_cnpj', 'like', `%${search}%`);
        });
      }

      if (ativo !== null) {
        query = query.where('status', ativo ? 'ativo' : 'inativo');
      }

      // Get total count for pagination
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count('id as count');
      const total = parseInt(count);

      // Apply sorting and pagination
      const validSortFields = [
        'nome', 'cpf_cnpj', 'email', 'cidade', 
        'limite_credito', 'saldo_devedor', 'created_at'
      ];
      
      if (validSortFields.includes(sort)) {
        query = query.orderBy(sort, order);
      } else {
        query = query.orderBy('nome', 'asc');
      }

      const clients = await query.limit(limit).offset(offset);

      return {
        data: clients,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw new Error('Erro ao buscar clientes: ' + error.message);
    }
  }

  /**
   * Get client by ID
   */
  async getClientById(id) {
    try {
      const db = getDb();
      const client = await db(this.tableName)
        .where('id', id)
        .first();

      if (!client) {
        throw new Error('Cliente não encontrado');
      }

      return client;
    } catch (error) {
      console.error('Error fetching client by ID:', error);
      throw new Error('Erro ao buscar cliente: ' + error.message);
    }
  }

  /**
   * Create new client
   */
  async createClient(clientData) {
    try {
      const db = getDb();
      
      // Check if CNPJ/CPF already exists
      if (clientData.cpf_cnpj) {
        const existingClient = await db(this.tableName)
          .where('cpf_cnpj', clientData.cpf_cnpj)
          .first();

        if (existingClient) {
          throw new Error('Já existe um cliente com este CPF/CNPJ');
        }
      }

      // SQLite doesn't support returning clause the same way, so we do insert and then fetch
      const [newClientId] = await db(this.tableName)
        .insert({
          ...clientData,
          status: clientData.status || 'ativo',
          limite_credito: clientData.limite_credito || 0,
          saldo_devedor: clientData.saldo_devedor || 0,
          data_cadastro: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      // Fetch the created client
      const newClient = await db(this.tableName)
        .where('id', newClientId)
        .first();

      return newClient;
    } catch (error) {
      console.error('Error creating client:', error);
      if (error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao criar cliente: ' + error.message);
    }
  }

  /**
   * Update client
   */
  async updateClient(id, clientData) {
    try {
      const db = getDb();
      
      // Check if client exists
      const existingClient = await this.getClientById(id);

      // Check if CNPJ/CPF is being changed and already exists
      if (clientData.cpf_cnpj && clientData.cpf_cnpj !== existingClient.cpf_cnpj) {
        const duplicateClient = await db(this.tableName)
          .where('cpf_cnpj', clientData.cpf_cnpj)
          .whereNot('id', id)
          .first();

        if (duplicateClient) {
          throw new Error('Já existe um cliente com este CPF/CNPJ');
        }
      }

      await db(this.tableName)
        .where('id', id)
        .update({
          ...clientData,
          updated_at: new Date().toISOString()
        });

      // Return updated client
      return await this.getClientById(id);
    } catch (error) {
      console.error('Error updating client:', error);
      if (error.message.includes('não encontrado') || error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao atualizar cliente: ' + error.message);
    }
  }

  /**
   * Delete client
   */
  async deleteClient(id) {
    try {
      const db = getDb();
      
      // Check if client exists
      await this.getClientById(id);

      // Check if client has associated sales or orders
      const hasSales = await db('importacao_vendas')
        .where('cliente_id', id)
        .first();

      const hasOrders = await db('importacao_pedidos')
        .where('cliente_id', id)
        .first();

      if (hasSales || hasOrders) {
        // Soft delete - just mark as inactive
        await db(this.tableName)
          .where('id', id)
          .update({ 
            status: 'inativo',
            updated_at: new Date().toISOString()
          });
        
        return { soft_deleted: true };
      } else {
        // Hard delete if no dependencies
        await db(this.tableName)
          .where('id', id)
          .del();
        
        return { hard_deleted: true };
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      if (error.message.includes('não encontrado')) {
        throw error;
      }
      throw new Error('Erro ao excluir cliente: ' + error.message);
    }
  }

  /**
   * Toggle client status
   */
  async toggleClientStatus(id) {
    try {
      const db = getDb();
      const client = await this.getClientById(id);
      
      const newStatus = client.status === 'ativo' ? 'inativo' : 'ativo';
      
      await db(this.tableName)
        .where('id', id)
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        });

      return await this.getClientById(id);
    } catch (error) {
      console.error('Error toggling client status:', error);
      throw new Error('Erro ao alterar status do cliente: ' + error.message);
    }
  }

  /**
   * Get client statistics
   */
  async getClientStats() {
    try {
      const db = getDb();
      
      const [
        totalClients,
        activeClients,
        inactiveClients,
        totalCreditLimit,
        totalDebt
      ] = await Promise.all([
        db(this.tableName).count('id as count').first(),
        db(this.tableName).where('status', 'ativo').count('id as count').first(),
        db(this.tableName).where('status', 'inativo').count('id as count').first(),
        db(this.tableName).sum('limite_credito as total').first(),
        db(this.tableName).sum('saldo_devedor as total').first()
      ]);

      return {
        total: parseInt(totalClients.count) || 0,
        ativo: parseInt(activeClients.count) || 0,
        inativo: parseInt(inactiveClients.count) || 0,
        limite_credito_total: parseFloat(totalCreditLimit.total) || 0,
        saldo_devedor_total: parseFloat(totalDebt.total) || 0
      };
    } catch (error) {
      console.error('Error getting client stats:', error);
      throw new Error('Erro ao buscar estatísticas de clientes: ' + error.message);
    }
  }

  /**
   * Get clients for dropdown/select
   */
  async getClientsForSelect(activeOnly = true) {
    try {
      const db = getDb();
      let query = db(this.tableName)
        .select('id', 'nome', 'cpf_cnpj', 'email')
        .orderBy('nome', 'asc');

      if (activeOnly) {
        query = query.where('status', 'ativo');
      }

      return await query;
    } catch (error) {
      console.error('Error getting clients for select:', error);
      throw new Error('Erro ao buscar clientes para seleção: ' + error.message);
    }
  }

  /**
   * Search clients
   */
  async searchClients(searchTerm) {
    try {
      const db = getDb();
      return await db(this.tableName)
        .select('id', 'nome', 'cpf_cnpj', 'email', 'telefone', 'cidade')
        .where('status', 'ativo')
        .where(function() {
          this.where('nome', 'like', `%${searchTerm}%`)
              .orWhere('cpf_cnpj', 'like', `%${searchTerm}%`)
              .orWhere('email', 'like', `%${searchTerm}%`);
        })
        .orderBy('nome', 'asc')
        .limit(20);
    } catch (error) {
      console.error('Error searching clients:', error);
      throw new Error('Erro ao pesquisar clientes: ' + error.message);
    }
  }

  /**
   * Update purchase history
   */
  async updatePurchaseHistory(id, purchaseData) {
    try {
      const db = getDb();
      const client = await this.getClientById(id);
      
      // This would typically update purchase statistics
      // For now, we'll just update the debt balance if provided
      if (purchaseData.valor_compra) {
        const newDebt = (parseFloat(client.saldo_devedor) || 0) + parseFloat(purchaseData.valor_compra);
        
        await db(this.tableName)
          .where('id', id)
          .update({ 
            saldo_devedor: newDebt,
            updated_at: new Date().toISOString()
          });
      }

      return await this.getClientById(id);
    } catch (error) {
      console.error('Error updating purchase history:', error);
      throw new Error('Erro ao atualizar histórico de compras: ' + error.message);
    }
  }
}

module.exports = new ClientsService();