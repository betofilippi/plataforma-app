const routeOptimizationService = require('../services/routeOptimizationService');
const { routeSchema, routeUpdateSchema } = require('../services/validationService');

/**
 * Controller for route optimization operations
 * Handles HTTP requests and responses for route management and optimization
 */

class RouteOptimizationController {
  /**
   * Get all routes with pagination and filters
   * GET /api/log/routes
   */
  async getAllRoutes(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        status = null,
        veiculo_id = null,
        motorista_id = null,
        sort = 'data_rota',
        order = 'desc'
      } = req.validatedQuery || req.query;

      const result = await routeOptimizationService.getAllRoutes({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        status,
        veiculo_id: veiculo_id ? parseInt(veiculo_id) : null,
        motorista_id: motorista_id ? parseInt(motorista_id) : null,
        sort,
        order
      });

      res.json({
        success: true,
        message: 'Rotas recuperadas com sucesso',
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAllRoutes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get route by ID
   * GET /api/log/routes/:id
   */
  async getRouteById(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const route = await routeOptimizationService.getRouteById(parseInt(id));

      res.json({
        success: true,
        message: 'Rota encontrada com sucesso',
        data: route,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getRouteById:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Rota não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create new route
   * POST /api/log/routes
   */
  async createRoute(req, res) {
    try {
      const validatedData = req.validatedData || req.body;
      
      const newRoute = await routeOptimizationService.createRoute(validatedData);

      res.status(201).json({
        success: true,
        message: 'Rota criada com sucesso',
        data: newRoute,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createRoute:', error);
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
   * Optimize routes automatically
   * POST /api/log/routes/optimize
   */
  async optimizeRoutes(req, res) {
    try {
      const { 
        entregas_ids, 
        veiculo_id, 
        motorista_id, 
        data_rota, 
        restricoes = {} 
      } = req.body;

      if (!entregas_ids || !Array.isArray(entregas_ids) || entregas_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Lista de entregas é obrigatória',
          timestamp: new Date().toISOString()
        });
      }

      const optimizedRoutes = await routeOptimizationService.optimizeRoutes({
        entregas_ids,
        veiculo_id,
        motorista_id,
        data_rota,
        restricoes
      });

      res.json({
        success: true,
        message: 'Otimização de rotas realizada com sucesso',
        data: optimizedRoutes,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in optimizeRoutes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Calculate route distance and time
   * POST /api/log/routes/calculate
   */
  async calculateRoute(req, res) {
    try {
      const { origem, destinos } = req.body;

      if (!origem || !destinos || !Array.isArray(destinos)) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Origem e lista de destinos são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      const calculation = await routeOptimizationService.calculateRoute({
        origem,
        destinos
      });

      res.json({
        success: true,
        message: 'Cálculo de rota realizado com sucesso',
        data: calculation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in calculateRoute:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update route
   * PUT /api/log/routes/:id
   */
  async updateRoute(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const validatedData = req.validatedData || req.body;

      const updatedRoute = await routeOptimizationService.updateRoute(parseInt(id), validatedData);

      res.json({
        success: true,
        message: 'Rota atualizada com sucesso',
        data: updatedRoute,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateRoute:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Rota não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Start route execution
   * POST /api/log/routes/:id/start
   */
  async startRoute(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const { observacoes } = req.body;

      const result = await routeOptimizationService.startRoute(parseInt(id), { observacoes });

      res.json({
        success: true,
        message: result.message,
        data: result.route,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in startRoute:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Rota não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Complete route execution
   * POST /api/log/routes/:id/complete
   */
  async completeRoute(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const { observacoes, km_final, combustivel_usado } = req.body;

      const result = await routeOptimizationService.completeRoute(parseInt(id), {
        observacoes,
        km_final,
        combustivel_usado
      });

      res.json({
        success: true,
        message: result.message,
        data: result.route,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in completeRoute:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Rota não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get route statistics
   * GET /api/log/routes/stats
   */
  async getRouteStats(req, res) {
    try {
      const { periodo } = req.query;
      const stats = await routeOptimizationService.getRouteStats({ periodo });

      res.json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getRouteStats:', error);
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
   * GET /api/log/routes/performance
   */
  async getDeliveryPerformance(req, res) {
    try {
      const { motorista_id, periodo } = req.query;
      const performance = await routeOptimizationService.getDeliveryPerformance({
        motorista_id: motorista_id ? parseInt(motorista_id) : null,
        periodo
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
}

module.exports = new RouteOptimizationController();
