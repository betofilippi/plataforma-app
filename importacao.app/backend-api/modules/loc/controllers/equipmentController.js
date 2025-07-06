const equipmentService = require('../services/equipmentService');
const { equipmentSchema, equipmentUpdateSchema } = require('../services/validationService');

/**
 * Controller for equipment CRUD operations
 * Handles HTTP requests and responses for equipment management
 */

class EquipmentController {
  /**
   * Get all equipment with pagination and filters
   * GET /api/loc/equipment
   */
  async getAllEquipment(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        status = null,
        tipo_equipamento = null,
        disponivel = null,
        sort = 'codigo_equipamento',
        order = 'asc'
      } = req.validatedQuery || req.query;

      const result = await equipmentService.getAllEquipment({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        status,
        tipo_equipamento,
        disponivel: disponivel === 'true' ? true : disponivel === 'false' ? false : null,
        sort,
        order
      });

      res.json({
        success: true,
        message: 'Equipamentos recuperados com sucesso',
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAllEquipment:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get equipment by ID
   * GET /api/loc/equipment/:id
   */
  async getEquipmentById(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const equipment = await equipmentService.getEquipmentById(parseInt(id));

      res.json({
        success: true,
        message: 'Equipamento encontrado com sucesso',
        data: equipment,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getEquipmentById:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Equipamento não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create new equipment
   * POST /api/loc/equipment
   */
  async createEquipment(req, res) {
    try {
      const validatedData = req.validatedData || req.body;
      
      const newEquipment = await equipmentService.createEquipment(validatedData);

      res.status(201).json({
        success: true,
        message: 'Equipamento criado com sucesso',
        data: newEquipment,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createEquipment:', error);
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
   * Update equipment
   * PUT /api/loc/equipment/:id
   */
  async updateEquipment(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const validatedData = req.validatedData || req.body;

      const updatedEquipment = await equipmentService.updateEquipment(parseInt(id), validatedData);

      res.json({
        success: true,
        message: 'Equipamento atualizado com sucesso',
        data: updatedEquipment,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateEquipment:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('Já existe')) {
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Equipamento não encontrado' : 
               statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete equipment
   * DELETE /api/loc/equipment/:id
   */
  async deleteEquipment(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const result = await equipmentService.deleteEquipment(parseInt(id));

      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in deleteEquipment:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Equipamento não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get equipment statistics
   * GET /api/loc/equipment/stats
   */
  async getEquipmentStats(req, res) {
    try {
      const stats = await equipmentService.getEquipmentStats();

      res.json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getEquipmentStats:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get available equipment
   * GET /api/loc/equipment/available
   */
  async getAvailableEquipment(req, res) {
    try {
      const { data_inicio, data_fim, tipo_equipamento } = req.query;
      
      const equipment = await equipmentService.getAvailableEquipment({
        data_inicio,
        data_fim,
        tipo_equipamento
      });

      res.json({
        success: true,
        message: 'Equipamentos disponíveis recuperados com sucesso',
        data: equipment,
        count: equipment.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAvailableEquipment:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update equipment status
   * PATCH /api/loc/equipment/:id/status
   */
  async updateEquipmentStatus(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const { status, observacoes } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Status é obrigatório',
          timestamp: new Date().toISOString()
        });
      }

      const result = await equipmentService.updateEquipmentStatus(parseInt(id), {
        status,
        observacoes
      });

      res.json({
        success: true,
        message: result.message,
        data: result.equipment,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateEquipmentStatus:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Equipamento não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get equipment maintenance history
   * GET /api/loc/equipment/:id/maintenance
   */
  async getEquipmentMaintenance(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const maintenance = await equipmentService.getEquipmentMaintenance(parseInt(id));

      res.json({
        success: true,
        message: 'Histórico de manutenção recuperado com sucesso',
        data: maintenance,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getEquipmentMaintenance:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Equipamento não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new EquipmentController();
