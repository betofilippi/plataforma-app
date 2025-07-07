const SchedulingService = require('../services/schedulingService');
const knex = require('../../../src/config/database');

class SchedulingController {
  constructor() {
    this.service = new SchedulingService(knex);
  }

  async getSchedule(req, res) {
    try {
      const filters = {
        data_inicio: req.query.data_inicio,
        data_fim: req.query.data_fim,
        centro_trabalho_id: req.query.centro_trabalho_id,
        status: req.query.status,
        view_type: req.query.view_type || 'gantt'
      };

      const schedule = await this.service.getProductionSchedule(filters);
      
      res.json({
        success: true,
        data: schedule
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async optimizeSchedule(req, res) {
    try {
      const { orders, constraints } = req.body;
      const userId = req.user?.id;
      
      const optimizedSchedule = await this.service.optimizeSchedule(orders, constraints, userId);
      
      res.json({
        success: true,
        message: 'Programação otimizada com sucesso',
        data: optimizedSchedule
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async generateSchedule(req, res) {
    try {
      const { periodo, algoritmo, parametros } = req.body;
      const userId = req.user?.id;
      
      const schedule = await this.service.generateSchedule(periodo, algoritmo, parametros, userId);
      
      res.json({
        success: true,
        message: 'Programação gerada com sucesso',
        data: schedule
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateSchedule(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const result = await this.service.updateOrderSchedule(id, req.body, userId);
      
      res.json({
        success: true,
        message: 'Programação atualizada com sucesso',
        data: result
      });
    } catch (error) {
      const status = error.message.includes('não encontrada') ? 404 :
                    error.message.includes('conflito') ? 409 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getCapacityAnalysis(req, res) {
    try {
      const filters = {
        data_inicio: req.query.data_inicio,
        data_fim: req.query.data_fim,
        centro_trabalho_id: req.query.centro_trabalho_id
      };

      const analysis = await this.service.getCapacityAnalysis(filters);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getBottlenecks(req, res) {
    try {
      const filters = {
        data_inicio: req.query.data_inicio,
        data_fim: req.query.data_fim
      };

      const bottlenecks = await this.service.identifyBottlenecks(filters);
      
      res.json({
        success: true,
        data: bottlenecks
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getGanttData(req, res) {
    try {
      const filters = {
        data_inicio: req.query.data_inicio,
        data_fim: req.query.data_fim,
        centro_trabalho_id: req.query.centro_trabalho_id,
        zoom_level: req.query.zoom_level || 'day'
      };

      const ganttData = await this.service.getGanttChartData(filters);
      
      res.json({
        success: true,
        data: ganttData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async simulateSchedule(req, res) {
    try {
      const { cenario, parametros } = req.body;
      
      const simulation = await this.service.simulateScheduleScenario(cenario, parametros);
      
      res.json({
        success: true,
        data: simulation
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getSchedulingRules(req, res) {
    try {
      const rules = await this.service.getSchedulingRules();
      
      res.json({
        success: true,
        data: rules
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateSchedulingRules(req, res) {
    try {
      const userId = req.user?.id;
      const rules = await this.service.updateSchedulingRules(req.body, userId);
      
      res.json({
        success: true,
        message: 'Regras de programação atualizadas com sucesso',
        data: rules
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getScheduleMetrics(req, res) {
    try {
      const filters = {
        data_inicio: req.query.data_inicio,
        data_fim: req.query.data_fim
      };

      const metrics = await this.service.getScheduleMetrics(filters);
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async validateSchedule(req, res) {
    try {
      const validation = await this.service.validateSchedule(req.body);
      
      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getAlternativeSchedules(req, res) {
    try {
      const { ordem_id, criterios } = req.query;
      
      const alternatives = await this.service.getAlternativeSchedules(ordem_id, criterios);
      
      res.json({
        success: true,
        data: alternatives
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async applySchedule(req, res) {
    try {
      const { programacao_id } = req.params;
      const userId = req.user?.id;
      
      const result = await this.service.applySchedule(programacao_id, userId);
      
      res.json({
        success: true,
        message: 'Programação aplicada com sucesso',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = SchedulingController;