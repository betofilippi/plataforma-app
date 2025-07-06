const priceListsService = require('../services/priceListsService');
const { priceListSchema, priceListUpdateSchema } = require('../services/validationService');

/**
 * Controller for price lists CRUD operations
 * Handles HTTP requests and responses for price list management
 */

class PriceListsController {
  /**
   * Get all price lists with pagination and filters
   * GET /api/cad/price-lists
   */
  async getAllPriceLists(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        search = '',
        ativo = null,
        tipo_lista = null,
        id_empresa = null,
        sort = 'nome',
        order = 'asc'
      } = req.validatedQuery || req.query;

      const result = await priceListsService.getAllPriceLists({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : null,
        tipo_lista,
        id_empresa: id_empresa ? parseInt(id_empresa) : null,
        sort,
        order
      });

      res.json({
        success: true,
        message: 'Listas de preços recuperadas com sucesso',
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAllPriceLists:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get price list by ID
   * GET /api/cad/price-lists/:id
   */
  async getPriceListById(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const { include_items = false } = req.query;
      
      const priceList = await priceListsService.getPriceListById(
        parseInt(id), 
        include_items === 'true'
      );

      res.json({
        success: true,
        message: 'Lista de preços encontrada com sucesso',
        data: priceList,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getPriceListById:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Lista de preços não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create new price list
   * POST /api/cad/price-lists
   */
  async createPriceList(req, res) {
    try {
      const validatedData = req.validatedData || req.body;

      // Validate date range
      if (validatedData.data_inicio && validatedData.data_fim) {
        if (new Date(validatedData.data_inicio) >= new Date(validatedData.data_fim)) {
          return res.status(400).json({
            success: false,
            error: 'Dados inválidos',
            message: 'Data de início deve ser anterior à data de fim',
            timestamp: new Date().toISOString()
          });
        }
      }

      const newPriceList = await priceListsService.createPriceList(validatedData);

      res.status(201).json({
        success: true,
        message: 'Lista de preços criada com sucesso',
        data: newPriceList,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createPriceList:', error);
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
   * Update price list
   * PUT /api/cad/price-lists/:id
   */
  async updatePriceList(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const validatedData = req.validatedData || req.body;

      // Validate date range if provided
      if (validatedData.data_inicio && validatedData.data_fim) {
        if (new Date(validatedData.data_inicio) >= new Date(validatedData.data_fim)) {
          return res.status(400).json({
            success: false,
            error: 'Dados inválidos',
            message: 'Data de início deve ser anterior à data de fim',
            timestamp: new Date().toISOString()
          });
        }
      }

      const updatedPriceList = await priceListsService.updatePriceList(parseInt(id), validatedData);

      res.json({
        success: true,
        message: 'Lista de preços atualizada com sucesso',
        data: updatedPriceList,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updatePriceList:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('Já existe')) {
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Lista de preços não encontrada' : 
               statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete price list
   * DELETE /api/cad/price-lists/:id
   */
  async deletePriceList(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const result = await priceListsService.deletePriceList(parseInt(id));

      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in deletePriceList:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Lista de preços não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get product price in specific price list
   * GET /api/cad/price-lists/:id/price/:productId
   */
  async getProductPrice(req, res) {
    try {
      const { id, productId } = req.params;
      const { quantidade = 1 } = req.query;

      const price = await priceListsService.getProductPrice(
        parseInt(productId),
        parseInt(id),
        parseInt(quantidade)
      );

      if (!price) {
        return res.status(404).json({
          success: false,
          error: 'Preço não encontrado',
          message: 'Produto não encontrado na lista de preços',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: 'Preço encontrado com sucesso',
        data: price,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getProductPrice:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Calculate prices for multiple products
   * POST /api/cad/price-lists/:id/calculate
   */
  async calculatePrices(req, res) {
    try {
      const { id } = req.params;
      const { produtos } = req.body;

      if (!produtos || !Array.isArray(produtos)) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Lista de produtos é obrigatória',
          timestamp: new Date().toISOString()
        });
      }

      const prices = await priceListsService.calculatePrices(parseInt(id), produtos);

      res.json({
        success: true,
        message: 'Preços calculados com sucesso',
        data: prices,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in calculatePrices:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get price list statistics
   * GET /api/cad/price-lists/stats
   */
  async getPriceListStats(req, res) {
    try {
      const stats = await priceListsService.getPriceListStats();

      res.json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getPriceListStats:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get price lists for select dropdown
   * GET /api/cad/price-lists/select
   */
  async getPriceListsForSelect(req, res) {
    try {
      const { search = '', company_id = null } = req.query;
      const priceLists = await priceListsService.getPriceListsForSelect(
        search, 
        company_id ? parseInt(company_id) : null
      );

      res.json({
        success: true,
        message: 'Listas de preços para seleção recuperadas com sucesso',
        data: priceLists,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getPriceListsForSelect:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Toggle price list active status
   * PATCH /api/cad/price-lists/:id/toggle-status
   */
  async togglePriceListStatus(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const priceList = await priceListsService.getPriceListById(parseInt(id));
      
      const updatedPriceList = await priceListsService.updatePriceList(parseInt(id), {
        ativo: !priceList.ativo
      });

      res.json({
        success: true,
        message: `Lista de preços ${updatedPriceList.ativo ? 'ativada' : 'desativada'} com sucesso`,
        data: { id: updatedPriceList.id_lista_precos, ativo: updatedPriceList.ativo },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in togglePriceListStatus:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Lista de preços não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Bulk operations on price lists
   * POST /api/cad/price-lists/bulk
   */
  async bulkOperations(req, res) {
    try {
      const { operation, priceListIds, data = {} } = req.body;

      if (!operation || !priceListIds || !Array.isArray(priceListIds)) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Operação e IDs das listas de preços são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      // Validate specific operations
      if (operation === 'set_dates' && !data.data_inicio && !data.data_fim) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Data de início ou fim é obrigatória para esta operação',
          timestamp: new Date().toISOString()
        });
      }

      if (operation === 'apply_margin' && !data.margem_percentual) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Margem percentual é obrigatória para esta operação',
          timestamp: new Date().toISOString()
        });
      }

      if (operation === 'copy_prices' && (!data.source_list_id || !data.target_list_id)) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Lista de origem e destino são obrigatórias para esta operação',
          timestamp: new Date().toISOString()
        });
      }

      const result = await priceListsService.bulkOperations(operation, priceListIds, data);

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
   * Export price lists to CSV/JSON
   * GET /api/cad/price-lists/export
   */
  async exportPriceLists(req, res) {
    try {
      const { 
        search = '', 
        ativo = null, 
        tipo_lista = null,
        id_empresa = null,
        formato = 'csv'
      } = req.query;
      
      const filters = {
        search,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : null,
        tipo_lista,
        id_empresa: id_empresa ? parseInt(id_empresa) : null
      };

      if (formato === 'csv') {
        const csvData = await priceListsService.exportPriceLists('csv', filters);

        // Set CSV headers
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=listas-precos.csv');
        res.setHeader('Cache-Control', 'no-cache');

        res.send(csvData);
      } else {
        // JSON export
        const result = await priceListsService.getAllPriceLists({
          page: 1,
          limit: 10000, // Large limit for export
          ...filters,
          sort: 'nome',
          order: 'asc'
        });

        res.json({
          success: true,
          message: 'Listas de preços exportadas com sucesso',
          data: result.data,
          total: result.pagination.total,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in exportPriceLists:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get price list types for filters
   * GET /api/cad/price-lists/types
   */
  async getPriceListTypes(req, res) {
    try {
      const types = [
        { value: 'VENDA', label: 'Venda' },
        { value: 'COMPRA', label: 'Compra' },
        { value: 'PROMOCIONAL', label: 'Promocional' },
        { value: 'ATACADO', label: 'Atacado' },
        { value: 'VAREJO', label: 'Varejo' }
      ];

      res.json({
        success: true,
        message: 'Tipos de lista de preços recuperados com sucesso',
        data: types,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getPriceListTypes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Validate price list dates
   * POST /api/cad/price-lists/validate-dates
   */
  async validateDates(req, res) {
    try {
      const { data_inicio, data_fim } = req.body;

      if (!data_inicio || !data_fim) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Data de início e fim são obrigatórias',
          timestamp: new Date().toISOString()
        });
      }

      const inicio = new Date(data_inicio);
      const fim = new Date(data_fim);
      const now = new Date();

      const validation = {
        valid: true,
        errors: [],
        warnings: []
      };

      // Check if start date is before end date
      if (inicio >= fim) {
        validation.valid = false;
        validation.errors.push('Data de início deve ser anterior à data de fim');
      }

      // Check if dates are in the past
      if (inicio < now) {
        validation.warnings.push('Data de início está no passado');
      }

      if (fim < now) {
        validation.warnings.push('Data de fim está no passado');
      }

      // Check if period is too short
      const diffDays = (fim - inicio) / (1000 * 60 * 60 * 24);
      if (diffDays < 1) {
        validation.warnings.push('Período muito curto (menos de 1 dia)');
      }

      res.json({
        success: true,
        message: 'Validação de datas realizada com sucesso',
        data: validation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in validateDates:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new PriceListsController();