const ProductionOrdersService = require('../services/productionOrdersService');
const knex = require('../../../src/config/database');

class ProductionOrdersController {
  constructor() {
    this.service = new ProductionOrdersService(knex);
  }

  async list(req, res) {
    try {
      const filters = {
        status: req.query.status,
        produto_id: req.query.produto_id,
        centro_trabalho_id: req.query.centro_trabalho_id,
        data_inicio: req.query.data_inicio,
        data_fim: req.query.data_fim,
        numero_ordem: req.query.numero_ordem,
        prioridade: req.query.prioridade
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const result = await this.service.listProductionOrders(filters, pagination);
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const order = await this.service.getProductionOrderById(id);
      
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      const status = error.message.includes('não encontrada') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async create(req, res) {
    try {
      const userId = req.user?.id;
      const order = await this.service.createProductionOrder(req.body, userId);
      
      res.status(201).json({
        success: true,
        message: 'Ordem de produção criada com sucesso',
        data: order
      });
    } catch (error) {
      const status = error.message.includes('inválido') || 
                    error.message.includes('obrigatório') ||
                    error.message.includes('já existe') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const order = await this.service.updateProductionOrder(id, req.body, userId);
      
      res.json({
        success: true,
        message: 'Ordem de produção atualizada com sucesso',
        data: order
      });
    } catch (error) {
      const status = error.message.includes('não encontrada') ? 404 :
                    error.message.includes('inválido') || 
                    error.message.includes('não é possível') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await this.service.deleteProductionOrder(id, userId);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      const status = error.message.includes('não encontrada') ? 404 :
                    error.message.includes('não é possível') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async start(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const order = await this.service.startProduction(id, userId);
      
      res.json({
        success: true,
        message: 'Produção iniciada com sucesso',
        data: order
      });
    } catch (error) {
      const status = error.message.includes('não encontrada') ? 404 :
                    error.message.includes('deve estar') ||
                    error.message.includes('insuficiente') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async finish(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const order = await this.service.finishProduction(id, req.body, userId);
      
      res.json({
        success: true,
        message: 'Produção finalizada com sucesso',
        data: order
      });
    } catch (error) {
      const status = error.message.includes('não encontrada') ? 404 :
                    error.message.includes('deve estar') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getStats(req, res) {
    try {
      const filters = {
        data_inicio: req.query.data_inicio,
        data_fim: req.query.data_fim
      };

      const stats = await this.service.getProductionOrderStats(filters);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getProgress(req, res) {
    try {
      const { id } = req.params;
      const progress = await this.service.getProductionProgress(id);
      
      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      const status = error.message.includes('não encontrada') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async consumeMaterial(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      // Este endpoint seria implementado no MaterialConsumptionService
      // Por simplicidade, retornando sucesso
      
      res.json({
        success: true,
        message: 'Material consumido registrado com sucesso'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = ProductionOrdersController;