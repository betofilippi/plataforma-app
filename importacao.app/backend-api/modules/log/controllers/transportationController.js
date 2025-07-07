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

  /**
   * Get delivery performance metrics
   * GET /api/log/transportation/performance
   */
  async getDeliveryPerformance(req, res) {
    try {
      const { data_inicio, data_fim, transportadora_id } = req.query;
      
      const performance = await transportationService.getDeliveryPerformance({
        data_inicio,
        data_fim,
        transportadora_id: transportadora_id ? parseInt(transportadora_id) : null
      });

      res.json({
        success: true,
        message: 'Métricas de performance recuperadas com sucesso',
        data: performance,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getDeliveryPerformance:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get transportation analytics
   * GET /api/log/transportation/analytics
   */
  async getTransportationAnalytics(req, res) {
    try {
      const { periodo, granularidade, metricas } = req.query;
      
      const analytics = await transportationService.getTransportationAnalytics({
        periodo,
        granularidade: granularidade || 'day',
        metricas: metricas ? metricas.split(',') : ['volume', 'custo', 'performance']
      });

      res.json({
        success: true,
        message: 'Analytics recuperados com sucesso',
        data: analytics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getTransportationAnalytics:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get delivery route optimization
   * POST /api/log/transportation/optimize-route
   */
  async optimizeRoute(req, res) {
    try {
      const { pontos_entrega, veiculo_id, restricoes } = req.body;

      if (!pontos_entrega || !Array.isArray(pontos_entrega) || pontos_entrega.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Pontos de entrega são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      const optimizedRoute = await transportationService.optimizeDeliveryRoute({
        pontos_entrega,
        veiculo_id,
        restricoes
      });

      res.json({
        success: true,
        message: 'Rota otimizada com sucesso',
        data: optimizedRoute,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in optimizeRoute:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Schedule delivery
   * POST /api/log/transportation/schedule-delivery
   */
  async scheduleDelivery(req, res) {
    try {
      const { 
        pedido_id, 
        data_entrega_solicitada, 
        janela_entrega, 
        prioridade, 
        instrucoes_especiais 
      } = req.body;

      if (!pedido_id || !data_entrega_solicitada) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Pedido ID e data de entrega são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      const delivery = await transportationService.scheduleDelivery({
        pedido_id,
        data_entrega_solicitada,
        janela_entrega,
        prioridade,
        instrucoes_especiais
      });

      res.status(201).json({
        success: true,
        message: 'Entrega agendada com sucesso',
        data: delivery,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in scheduleDelivery:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get freight comparison
   * POST /api/log/transportation/compare-freight
   */
  async compareFreight(req, res) {
    try {
      const { origem, destino, peso, volume, valor_mercadoria, transportadoras } = req.body;

      if (!origem || !destino || !peso) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Origem, destino e peso são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      const comparison = await transportationService.compareFreightRates({
        origem,
        destino,
        peso,
        volume,
        valor_mercadoria,
        transportadoras
      });

      res.json({
        success: true,
        message: 'Comparação de frete realizada com sucesso',
        data: comparison,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in compareFreight:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create delivery proof
   * POST /api/log/transportation/:id/proof
   */
  async createDeliveryProof(req, res) {
    try {
      const { id } = req.params;
      const { 
        tipo_comprovante, 
        data_entrega, 
        recebedor_nome, 
        recebedor_documento,
        observacoes,
        anexos 
      } = req.body;

      if (!tipo_comprovante || !data_entrega || !recebedor_nome) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Tipo de comprovante, data de entrega e recebedor são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      const proof = await transportationService.createDeliveryProof(parseInt(id), {
        tipo_comprovante,
        data_entrega,
        recebedor_nome,
        recebedor_documento,
        observacoes,
        anexos
      });

      res.status(201).json({
        success: true,
        message: 'Comprovante de entrega criado com sucesso',
        data: proof,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createDeliveryProof:', error);
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
   * Get real-time tracking updates
   * GET /api/log/transportation/:id/real-time-tracking
   */
  async getRealTimeTracking(req, res) {
    try {
      const { id } = req.params;
      const tracking = await transportationService.getRealTimeTracking(parseInt(id));

      res.json({
        success: true,
        message: 'Rastreamento em tempo real recuperado com sucesso',
        data: tracking,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getRealTimeTracking:', error);
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
   * Update GPS location
   * POST /api/log/transportation/:id/update-location
   */
  async updateGPSLocation(req, res) {
    try {
      const { id } = req.params;
      const { latitude, longitude, timestamp, velocidade, direcao } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Latitude e longitude são obrigatórias',
          timestamp: new Date().toISOString()
        });
      }

      const result = await transportationService.updateGPSLocation(parseInt(id), {
        latitude,
        longitude,
        timestamp: timestamp || new Date().toISOString(),
        velocidade,
        direcao
      });

      res.json({
        success: true,
        message: 'Localização GPS atualizada com sucesso',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateGPSLocation:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Transporte não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new TransportationController();
