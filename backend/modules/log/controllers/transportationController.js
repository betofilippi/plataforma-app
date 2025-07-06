const transportationService = require('../services/transportationService');
const { transportationSchema, transportationUpdateSchema } = require('../services/validationService');

/**
 * Controller for transportation CRUD operations
 * Handles HTTP requests and responses for transportation management
 */

class TransportationController {
  /**
   * Get all transportation orders with pagination and filters
   * GET /api/log/transportation
   */
  async getAllTransportation(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        status = null,
        transportadora_id = null,
        origem = null,
        destino = null,
        sort = 'numero_envio',
        order = 'desc'
      } = req.validatedQuery || req.query;

      const result = await transportationService.getAllTransportation({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        status,
        transportadora_id: transportadora_id ? parseInt(transportadora_id) : null,
        origem,
        destino,
        sort,
        order
      });

      res.json({
        success: true,
        message: 'Transportes recuperados com sucesso',
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAllTransportation:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get transportation by ID
   * GET /api/log/transportation/:id
   */
  async getTransportationById(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const transportation = await transportationService.getTransportationById(parseInt(id));

      res.json({
        success: true,
        message: 'Transporte encontrado com sucesso',
        data: transportation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getTransportationById:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Transporte não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create new transportation order
   * POST /api/log/transportation
   */
  async createTransportation(req, res) {
    try {
      const validatedData = req.validatedData || req.body;
      
      const newTransportation = await transportationService.createTransportation(validatedData);

      res.status(201).json({
        success: true,
        message: 'Transporte criado com sucesso',
        data: newTransportation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createTransportation:', error);
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
   * Update transportation order
   * PUT /api/log/transportation/:id
   */
  async updateTransportation(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const validatedData = req.validatedData || req.body;

      const updatedTransportation = await transportationService.updateTransportation(parseInt(id), validatedData);

      res.json({
        success: true,
        message: 'Transporte atualizado com sucesso',
        data: updatedTransportation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateTransportation:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('Já existe')) {
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Transporte não encontrado' : 
               statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete transportation order
   * DELETE /api/log/transportation/:id
   */
  async deleteTransportation(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const result = await transportationService.deleteTransportation(parseInt(id));

      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in deleteTransportation:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Transporte não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get transportation statistics
   * GET /api/log/transportation/stats
   */
  async getTransportationStats(req, res) {
    try {
      const stats = await transportationService.getTransportationStats();

      res.json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getTransportationStats:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Track transportation order
   * GET /api/log/transportation/:id/tracking
   */
  async trackTransportation(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const tracking = await transportationService.trackTransportation(parseInt(id));

      res.json({
        success: true,
        message: 'Rastreamento recuperado com sucesso',
        data: tracking,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in trackTransportation:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Transporte não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update transportation status
   * PATCH /api/log/transportation/:id/status
   */
  async updateTransportationStatus(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const { status, observacoes, localizacao_atual } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Status é obrigatório',
          timestamp: new Date().toISOString()
        });
      }

      const result = await transportationService.updateTransportationStatus(parseInt(id), {
        status,
        observacoes,
        localizacao_atual
      });

      res.json({
        success: true,
        message: result.message,
        data: result.transportation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateTransportationStatus:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Transporte não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Calculate freight cost
   * POST /api/log/transportation/calculate-freight
   */
  async calculateFreight(req, res) {
    try {
      const { origem, destino, peso, volume, valor_mercadoria, tipo_servico } = req.body;

      if (!origem || !destino || !peso) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Origem, destino e peso são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      const freight = await transportationService.calculateFreight({
        origem,
        destino,
        peso,
        volume,
        valor_mercadoria,
        tipo_servico
      });

      res.json({
        success: true,
        message: 'Cálculo de frete realizado com sucesso',
        data: freight,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in calculateFreight:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get active deliveries
   * GET /api/log/transportation/active-deliveries
   */
  async getActiveDeliveries(req, res) {
    try {
      const deliveries = await transportationService.getActiveDeliveries();

      res.json({
        success: true,
        message: 'Entregas ativas recuperadas com sucesso',
        data: deliveries,
        count: deliveries.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getActiveDeliveries:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new TransportationController();
