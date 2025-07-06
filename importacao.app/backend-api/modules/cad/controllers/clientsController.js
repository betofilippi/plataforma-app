const clientsService = require('../services/clientsService');
const { clientSchema, clientUpdateSchema } = require('../services/validationService');

/**
 * Controller for clients CRUD operations
 * Handles HTTP requests and responses for client management
 */

class ClientsController {
  /**
   * Get all clients with pagination and filters
   * GET /api/cad/clients
   */
  async getAllClients(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        ativo = null,
        sort = 'nome_razao_social',
        order = 'asc'
      } = req.validatedQuery || req.query;

      const result = await clientsService.getAllClients({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : null,
        sort,
        order
      });

      res.json({
        success: true,
        message: 'Clientes recuperados com sucesso',
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAllClients:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get client by ID
   * GET /api/cad/clients/:id
   */
  async getClientById(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const client = await clientsService.getClientById(parseInt(id));

      res.json({
        success: true,
        message: 'Cliente encontrado com sucesso',
        data: client,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getClientById:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Cliente não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create new client
   * POST /api/cad/clients
   */
  async createClient(req, res) {
    try {
      const validatedData = req.validatedData || req.body;
      
      // Additional business validation
      if (validatedData.tipo_pessoa === 'F' && !validatedData.data_nascimento) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Data de nascimento é obrigatória para pessoa física',
          timestamp: new Date().toISOString()
        });
      }

      const newClient = await clientsService.createClient(validatedData);

      res.status(201).json({
        success: true,
        message: 'Cliente criado com sucesso',
        data: newClient,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createClient:', error);
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
   * Update client
   * PUT /api/cad/clients/:id
   */
  async updateClient(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const validatedData = req.validatedData || req.body;

      const updatedClient = await clientsService.updateClient(parseInt(id), validatedData);

      res.json({
        success: true,
        message: 'Cliente atualizado com sucesso',
        data: updatedClient,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateClient:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('Já existe')) {
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Cliente não encontrado' : 
               statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete client
   * DELETE /api/cad/clients/:id
   */
  async deleteClient(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const result = await clientsService.deleteClient(parseInt(id));

      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in deleteClient:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Cliente não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get client statistics
   * GET /api/cad/clients/stats
   */
  async getClientStats(req, res) {
    try {
      const stats = await clientsService.getClientStats();

      res.json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getClientStats:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Advanced client search
   * POST /api/cad/clients/search
   */
  async searchClients(req, res) {
    try {
      const searchParams = req.body;
      const clients = await clientsService.searchClients(searchParams);

      res.json({
        success: true,
        message: 'Busca realizada com sucesso',
        data: clients,
        count: clients.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in searchClients:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update client purchase history
   * POST /api/cad/clients/:id/purchase-history
   */
  async updatePurchaseHistory(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const purchaseData = req.body;

      // Validate purchase data
      if (!purchaseData.valor || purchaseData.valor <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Valor da compra deve ser maior que zero',
          timestamp: new Date().toISOString()
        });
      }

      const result = await clientsService.updateClientPurchaseHistory(parseInt(id), purchaseData);

      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updatePurchaseHistory:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Cliente não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get clients for select dropdown
   * GET /api/cad/clients/select
   */
  async getClientsForSelect(req, res) {
    try {
      const { search = '' } = req.query;
      
      // For select dropdown, we use a simplified search
      const result = await clientsService.getAllClients({
        page: 1,
        limit: 20,
        search,
        ativo: true,
        sort: 'nome_razao_social',
        order: 'asc'
      });

      const selectOptions = result.data.map(client => ({
        value: client.id_cliente,
        label: `${client.nome_razao_social}${client.nome_fantasia ? ` (${client.nome_fantasia})` : ''}`,
        cnpj_cpf: client.cnpj_cpf,
        classificacao: client.classificacao_cliente
      }));

      res.json({
        success: true,
        message: 'Clientes para seleção recuperados com sucesso',
        data: selectOptions,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getClientsForSelect:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Toggle client active status
   * PATCH /api/cad/clients/:id/toggle-status
   */
  async toggleClientStatus(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const client = await clientsService.getClientById(parseInt(id));
      
      const updatedClient = await clientsService.updateClient(parseInt(id), {
        ativo: !client.ativo
      });

      res.json({
        success: true,
        message: `Cliente ${updatedClient.ativo ? 'ativado' : 'desativado'} com sucesso`,
        data: { id: updatedClient.id_cliente, ativo: updatedClient.ativo },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in toggleClientStatus:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Cliente não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new ClientsController();