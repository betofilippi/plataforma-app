const db = require('../../../src/database/connection');

/**
 * Service layer for clients (cad_03_clientes)
 * Handles all database operations for client management
 */

class ClientsService {
  constructor() {
    this.tableName = 'cad_03_clientes';
  }

  /**
   * Get all clients with pagination and filters
   */
  async getAllClients({
    page = 1,
    limit = 10,
    search = '',
    ativo = null,
    sort = 'nome_razao_social',
    order = 'asc'
  } = {}) {
    try {
      const offset = (page - 1) * limit;
      
      let query = db(this.tableName)
        .select([
          'id_cliente',
          'tipo_pessoa',
          'cnpj_cpf',
          'nome_razao_social',
          'nome_fantasia',
          'telefone',
          'email',
          'cidade',
          'uf',
          'ativo',
          'classificacao_cliente',
          'total_compras',
          'limite_credito',
          'created_at',
          'updated_at'
        ]);

      // Apply filters
      if (search) {
        query = query.where(function() {
          this.where('nome_razao_social', 'ilike', `%${search}%`)
              .orWhere('nome_fantasia', 'ilike', `%${search}%`)
              .orWhere('cnpj_cpf', 'ilike', `%${search}%`)
              .orWhere('email', 'ilike', `%${search}%`);
        });
      }

      if (ativo !== null) {
        query = query.where('ativo', ativo);
      }

      // Get total count for pagination
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count('id_cliente as count');
      const total = parseInt(count);

      // Apply sorting and pagination
      const validSortFields = [
        'nome_razao_social', 'cnpj_cpf', 'email', 'cidade', 
        'total_compras', 'classificacao_cliente', 'created_at'
      ];
      
      if (validSortFields.includes(sort)) {
        query = query.orderBy(sort, order);
      } else {
        query = query.orderBy('nome_razao_social', 'asc');
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
      const client = await db(this.tableName)
        .where('id_cliente', id)
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
      // Check if CNPJ/CPF already exists
      const existingClient = await db(this.tableName)
        .where('cnpj_cpf', clientData.cnpj_cpf)
        .first();

      if (existingClient) {
        throw new Error('Já existe um cliente com este CPF/CNPJ');
      }

      const [newClient] = await db(this.tableName)
        .insert({
          ...clientData,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

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
      // Check if client exists
      const existingClient = await this.getClientById(id);

      // Check if CNPJ/CPF is being changed and if it's already in use
      if (clientData.cnpj_cpf && clientData.cnpj_cpf !== existingClient.cnpj_cpf) {
        const duplicateClient = await db(this.tableName)
          .where('cnpj_cpf', clientData.cnpj_cpf)
          .where('id_cliente', '!=', id)
          .first();

        if (duplicateClient) {
          throw new Error('Já existe outro cliente com este CPF/CNPJ');
        }
      }

      const [updatedClient] = await db(this.tableName)
        .where('id_cliente', id)
        .update({
          ...clientData,
          updated_at: new Date()
        })
        .returning('*');

      return updatedClient;
    } catch (error) {
      console.error('Error updating client:', error);
      if (error.message.includes('Já existe') || error.message.includes('não encontrado')) {
        throw error;
      }
      throw new Error('Erro ao atualizar cliente: ' + error.message);
    }
  }

  /**
   * Delete client (soft delete)
   */
  async deleteClient(id) {
    try {
      // Check if client exists
      await this.getClientById(id);

      // Check if client has active sales/orders
      const hasSales = await db('vnd_05_vendas')
        .where('id_cliente', id)
        .where('ativo', true)
        .first();

      if (hasSales) {
        // Soft delete only
        await db(this.tableName)
          .where('id_cliente', id)
          .update({
            ativo: false,
            updated_at: new Date()
          });

        return { message: 'Cliente desativado com sucesso (possui vendas associadas)' };
      } else {
        // Can be completely removed
        await db(this.tableName)
          .where('id_cliente', id)
          .del();

        return { message: 'Cliente removido com sucesso' };
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
   * Get client statistics
   */
  async getClientStats() {
    try {
      const stats = await db(this.tableName)
        .select([
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(*) FILTER (WHERE ativo = true) as ativos'),
          db.raw('COUNT(*) FILTER (WHERE ativo = false) as inativos'),
          db.raw('COUNT(*) FILTER (WHERE tipo_pessoa = \'F\') as pessoas_fisicas'),
          db.raw('COUNT(*) FILTER (WHERE tipo_pessoa = \'J\') as pessoas_juridicas'),
          db.raw('AVG(total_compras) as ticket_medio'),
          db.raw('SUM(total_compras) as total_vendas')
        ])
        .first();

      // Get top clients by purchase amount
      const topClients = await db(this.tableName)
        .select(['nome_razao_social', 'total_compras', 'classificacao_cliente'])
        .where('ativo', true)
        .orderBy('total_compras', 'desc')
        .limit(5);

      // Get clients by classification
      const byClassification = await db(this.tableName)
        .select('classificacao_cliente')
        .count('id_cliente as count')
        .where('ativo', true)
        .groupBy('classificacao_cliente');

      return {
        ...stats,
        topClients,
        byClassification: byClassification.reduce((acc, item) => {
          acc[item.classificacao_cliente] = parseInt(item.count);
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Error fetching client stats:', error);
      throw new Error('Erro ao buscar estatísticas: ' + error.message);
    }
  }

  /**
   * Search clients with advanced filters
   */
  async searchClients({
    termo = '',
    tipo_pessoa = null,
    classificacao = null,
    cidade = '',
    uf = '',
    ativo = null,
    limite_credito_min = null,
    limite_credito_max = null
  } = {}) {
    try {
      let query = db(this.tableName)
        .select([
          'id_cliente',
          'tipo_pessoa',
          'cnpj_cpf',
          'nome_razao_social',
          'nome_fantasia',
          'telefone',
          'email',
          'endereco',
          'cidade',
          'uf',
          'classificacao_cliente',
          'total_compras',
          'limite_credito',
          'ativo'
        ]);

      if (termo) {
        query = query.where(function() {
          this.where('nome_razao_social', 'ilike', `%${termo}%`)
              .orWhere('nome_fantasia', 'ilike', `%${termo}%`)
              .orWhere('cnpj_cpf', 'ilike', `%${termo}%`)
              .orWhere('email', 'ilike', `%${termo}%`);
        });
      }

      if (tipo_pessoa) {
        query = query.where('tipo_pessoa', tipo_pessoa);
      }

      if (classificacao) {
        query = query.where('classificacao_cliente', classificacao);
      }

      if (cidade) {
        query = query.where('cidade', 'ilike', `%${cidade}%`);
      }

      if (uf) {
        query = query.where('uf', uf);
      }

      if (ativo !== null) {
        query = query.where('ativo', ativo);
      }

      if (limite_credito_min !== null) {
        query = query.where('limite_credito', '>=', limite_credito_min);
      }

      if (limite_credito_max !== null) {
        query = query.where('limite_credito', '<=', limite_credito_max);
      }

      const clients = await query
        .orderBy('nome_razao_social', 'asc')
        .limit(50); // Limit advanced search results

      return clients;
    } catch (error) {
      console.error('Error in advanced client search:', error);
      throw new Error('Erro na busca avançada: ' + error.message);
    }
  }

  /**
   * Update client purchase history
   */
  async updateClientPurchaseHistory(clientId, purchaseData) {
    try {
      const client = await this.getClientById(clientId);
      
      // Get current history or initialize
      let historico = client.historico_compras || [];
      
      // Add new purchase to history
      historico.push({
        ...purchaseData,
        data_compra: new Date().toISOString()
      });

      // Update totals and classification
      const novoTotal = client.total_compras + purchaseData.valor;
      let novaClassificacao = client.classificacao_cliente;

      // Auto-classify based on total purchases
      if (novoTotal >= 100000) {
        novaClassificacao = 'DIAMANTE';
      } else if (novoTotal >= 50000) {
        novaClassificacao = 'OURO';
      } else if (novoTotal >= 20000) {
        novaClassificacao = 'PRATA';
      } else if (novoTotal >= 5000) {
        novaClassificacao = 'BRONZE';
      }

      await db(this.tableName)
        .where('id_cliente', clientId)
        .update({
          historico_compras: JSON.stringify(historico),
          total_compras: novoTotal,
          classificacao_cliente: novaClassificacao,
          ultima_compra: new Date(),
          updated_at: new Date()
        });

      return { message: 'Histórico de compras atualizado com sucesso' };
    } catch (error) {
      console.error('Error updating purchase history:', error);
      throw new Error('Erro ao atualizar histórico: ' + error.message);
    }
  }
}

module.exports = new ClientsService();