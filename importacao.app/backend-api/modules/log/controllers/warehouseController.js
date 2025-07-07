const WarehouseService = require('../services/warehouseService');
const knex = require('../../../src/config/database');

class WarehouseController {
  constructor() {
    this.service = new WarehouseService(knex);
  }

  async list(req, res) {
    try {
      const filters = {
        ativo: req.query.ativo !== 'false',
        tipo: req.query.tipo,
        cidade: req.query.cidade,
        responsavel_id: req.query.responsavel_id
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const result = await this.service.listWarehouses(filters, pagination);
      
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
      const warehouse = await this.service.getWarehouseById(id);
      
      res.json({
        success: true,
        data: warehouse
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async create(req, res) {
    try {
      const userId = req.user?.id;
      const warehouse = await this.service.createWarehouse(req.body, userId);
      
      res.status(201).json({
        success: true,
        message: 'Depósito criado com sucesso',
        data: warehouse
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
      const warehouse = await this.service.updateWarehouse(id, req.body, userId);
      
      res.json({
        success: true,
        message: 'Depósito atualizado com sucesso',
        data: warehouse
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 :
                    error.message.includes('inválido') ? 400 : 500;
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
      const result = await this.service.deleteWarehouse(id, userId);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 :
                    error.message.includes('não é possível') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getInventory(req, res) {
    try {
      const { id } = req.params;
      const filters = {
        produto_id: req.query.produto_id,
        localizacao: req.query.localizacao,
        status: req.query.status
      };

      const inventory = await this.service.getWarehouseInventory(id, filters);
      
      res.json({
        success: true,
        data: inventory
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async createMovement(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const movement = await this.service.createInventoryMovement(id, req.body, userId);
      
      res.status(201).json({
        success: true,
        message: 'Movimentação criada com sucesso',
        data: movement
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 :
                    error.message.includes('inválido') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getMovements(req, res) {
    try {
      const { id } = req.params;
      const filters = {
        data_inicio: req.query.data_inicio,
        data_fim: req.query.data_fim,
        tipo_movimento: req.query.tipo_movimento,
        produto_id: req.query.produto_id
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const movements = await this.service.getInventoryMovements(id, filters, pagination);
      
      res.json({
        success: true,
        data: movements.data,
        pagination: movements.pagination
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async processShipment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const shipment = await this.service.processShipment(id, req.body, userId);
      
      res.json({
        success: true,
        message: 'Expedição processada com sucesso',
        data: shipment
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 :
                    error.message.includes('insuficiente') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async processReceipt(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const receipt = await this.service.processReceipt(id, req.body, userId);
      
      res.json({
        success: true,
        message: 'Recebimento processado com sucesso',
        data: receipt
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 :
                    error.message.includes('inválido') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async optimizeLayout(req, res) {
    try {
      const { id } = req.params;
      const { algoritmo, parametros } = req.body;
      
      const optimization = await this.service.optimizeWarehouseLayout(id, algoritmo, parametros);
      
      res.json({
        success: true,
        message: 'Layout otimizado com sucesso',
        data: optimization
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getPickingList(req, res) {
    try {
      const { id } = req.params;
      const { pedidos, tipo_picking } = req.query;
      
      const pickingList = await this.service.generatePickingList(id, {
        pedidos: pedidos ? pedidos.split(',') : [],
        tipo_picking: tipo_picking || 'batch'
      });
      
      res.json({
        success: true,
        data: pickingList
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async executePicking(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await this.service.executePicking(id, req.body, userId);
      
      res.json({
        success: true,
        message: 'Picking executado com sucesso',
        data: result
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 :
                    error.message.includes('quantidade') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getOccupancyReport(req, res) {
    try {
      const { id } = req.params;
      const { data_referencia } = req.query;
      
      const report = await this.service.getOccupancyReport(id, data_referencia);
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getPerformanceMetrics(req, res) {
    try {
      const { id } = req.params;
      const { data_inicio, data_fim } = req.query;
      
      const metrics = await this.service.getPerformanceMetrics(id, data_inicio, data_fim);
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async cycleCount(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const count = await this.service.executeCycleCount(id, req.body, userId);
      
      res.json({
        success: true,
        message: 'Inventário cíclico executado com sucesso',
        data: count
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async allocateSpace(req, res) {
    try {
      const { id } = req.params;
      const { produto_id, quantidade, preferencias } = req.body;
      
      const allocation = await this.service.allocateSpace(id, {
        produto_id,
        quantidade,
        preferencias
      });
      
      res.json({
        success: true,
        message: 'Espaço alocado com sucesso',
        data: allocation
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 :
                    error.message.includes('insuficiente') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getCapacityAnalysis(req, res) {
    try {
      const { id } = req.params;
      const analysis = await this.service.getCapacityAnalysis(id);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = WarehouseController;