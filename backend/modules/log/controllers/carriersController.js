const carriersService = require('../services/carriersService');
const { carrierSchema, carrierUpdateSchema } = require('../services/validationService');

/**
 * Controller for carriers CRUD operations
 * Handles HTTP requests and responses for carrier management
 */

class CarriersController {
  /**
   * Get all carriers with pagination and filters
   * GET /api/log/carriers
   */
  async getAllCarriers(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        ativo = null,
        tipo_transporte = null,
        sort = 'nome_transportadora',
        order = 'asc'
      } = req.validatedQuery || req.query;

      const result = await carriersService.getAllCarriers({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : null,
        tipo_transporte,
        sort,
        order
      });

      res.json({
        success: true,
        message: 'Transportadoras recuperadas com sucesso',
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAllCarriers:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get carrier by ID
   * GET /api/log/carriers/:id
   */
  async getCarrierById(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const carrier = await carriersService.getCarrierById(parseInt(id));

      res.json({
        success: true,
        message: 'Transportadora encontrada com sucesso',
        data: carrier,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getCarrierById:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Transportadora não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create new carrier
   * POST /api/log/carriers
   */
  async createCarrier(req, res) {
    try {
      const validatedData = req.validatedData || req.body;
      
      const newCarrier = await carriersService.createCarrier(validatedData);

      res.status(201).json({
        success: true,
        message: 'Transportadora criada com sucesso',
        data: newCarrier,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createCarrier:', error);
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
   * Update carrier
   * PUT /api/log/carriers/:id
   */
  async updateCarrier(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const validatedData = req.validatedData || req.body;

      const updatedCarrier = await carriersService.updateCarrier(parseInt(id), validatedData);

      res.json({
        success: true,
        message: 'Transportadora atualizada com sucesso',
        data: updatedCarrier,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateCarrier:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('Já existe')) {
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Transportadora não encontrada' : 
               statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete carrier
   * DELETE /api/log/carriers/:id
   */
  async deleteCarrier(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const result = await carriersService.deleteCarrier(parseInt(id));

      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in deleteCarrier:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Transportadora não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get carrier statistics
   * GET /api/log/carriers/stats
   */
  async getCarrierStats(req, res) {
    try {
      const stats = await carriersService.getCarrierStats();

      res.json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getCarrierStats:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get carrier performance metrics
   * GET /api/log/carriers/:id/performance
   */
  async getCarrierPerformance(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const { periodo } = req.query;
      
      const performance = await carriersService.getCarrierPerformance(parseInt(id), { periodo });

      res.json({
        success: true,
        message: 'Performance recuperada com sucesso',
        data: performance,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getCarrierPerformance:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Transportadora não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get carriers for selection dropdown
   * GET /api/log/carriers/select
   */
  async getCarriersForSelect(req, res) {
    try {
      const { search = '', tipo_transporte } = req.query;
      
      const result = await carriersService.getAllCarriers({
        page: 1,
        limit: 50,
        search,
        ativo: true,
        tipo_transporte,
        sort: 'nome_transportadora',
        order: 'asc'
      });

      const selectOptions = result.data.map(carrier => ({
        value: carrier.id_transportadora,
        label: carrier.nome_transportadora,
        cnpj: carrier.cnpj,
        tipo_transporte: carrier.tipo_transporte,
        contato: carrier.contato_principal
      }));

      res.json({
        success: true,
        message: 'Transportadoras para seleção recuperadas com sucesso',
        data: selectOptions,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getCarriersForSelect:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Toggle carrier active status
   * PATCH /api/log/carriers/:id/toggle-status
   */
  async toggleCarrierStatus(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const carrier = await carriersService.getCarrierById(parseInt(id));
      
      const updatedCarrier = await carriersService.updateCarrier(parseInt(id), {
        ativo: !carrier.ativo
      });

      res.json({
        success: true,
        message: `Transportadora ${updatedCarrier.ativo ? 'ativada' : 'desativada'} com sucesso`,
        data: { id: updatedCarrier.id_transportadora, ativo: updatedCarrier.ativo },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in toggleCarrierStatus:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Transportadora não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Calculate shipping quote
   * POST /api/log/carriers/:id/quote
   */
  async calculateShippingQuote(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const { origem, destino, peso, volume, valor_mercadoria, tipo_servico } = req.body;

      if (!origem || !destino || !peso) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Origem, destino e peso são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      const quote = await carriersService.calculateShippingQuote(parseInt(id), {
        origem,
        destino,
        peso,
        volume,
        valor_mercadoria,
        tipo_servico
      });

      res.json({
        success: true,
        message: 'Cotação calculada com sucesso',
        data: quote,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in calculateShippingQuote:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Transportadora não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new CarriersController();
