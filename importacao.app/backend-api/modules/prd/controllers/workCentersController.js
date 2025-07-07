const WorkCentersService = require('../services/workCentersService');
const knex = require('../../../src/config/database');

class WorkCentersController {
  constructor() {
    this.service = new WorkCentersService(knex);
  }

  async list(req, res) {
    try {
      const filters = {
        ativo: req.query.ativo !== 'false',
        tipo: req.query.tipo,
        departamento: req.query.departamento,
        disponivel: req.query.disponivel
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const result = await this.service.listWorkCenters(filters, pagination);
      
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
      const workCenter = await this.service.getWorkCenterById(id);
      
      res.json({
        success: true,
        data: workCenter
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
      const workCenter = await this.service.createWorkCenter(req.body, userId);
      
      res.status(201).json({
        success: true,
        message: 'Centro de trabalho criado com sucesso',
        data: workCenter
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
      const workCenter = await this.service.updateWorkCenter(id, req.body, userId);
      
      res.json({
        success: true,
        message: 'Centro de trabalho atualizado com sucesso',
        data: workCenter
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
      const result = await this.service.deleteWorkCenter(id, userId);
      
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

  async getCapacity(req, res) {
    try {
      const { id } = req.params;
      const { data_inicio, data_fim } = req.query;
      
      const capacity = await this.service.getWorkCenterCapacity(id, data_inicio, data_fim);
      
      res.json({
        success: true,
        data: capacity
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getSchedule(req, res) {
    try {
      const { id } = req.params;
      const { data_inicio, data_fim } = req.query;
      
      const schedule = await this.service.getWorkCenterSchedule(id, data_inicio, data_fim);
      
      res.json({
        success: true,
        data: schedule
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
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

      const stats = await this.service.getWorkCenterStats(filters);
      
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

  async getUtilization(req, res) {
    try {
      const { id } = req.params;
      const { data_inicio, data_fim } = req.query;
      
      const utilization = await this.service.getWorkCenterUtilization(id, data_inicio, data_fim);
      
      res.json({
        success: true,
        data: utilization
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getMaintenanceSchedule(req, res) {
    try {
      const { id } = req.params;
      const maintenance = await this.service.getMaintenanceSchedule(id);
      
      res.json({
        success: true,
        data: maintenance
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async scheduleMaintenance(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const maintenance = await this.service.scheduleMaintenance(id, req.body, userId);
      
      res.status(201).json({
        success: true,
        message: 'Manutenção agendada com sucesso',
        data: maintenance
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

  async getAvailableSlots(req, res) {
    try {
      const { id } = req.params;
      const { data_inicio, data_fim, duracao_horas } = req.query;
      
      const slots = await this.service.getAvailableTimeSlots(
        id, 
        data_inicio, 
        data_fim, 
        parseFloat(duracao_horas)
      );
      
      res.json({
        success: true,
        data: slots
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

module.exports = WorkCentersController;