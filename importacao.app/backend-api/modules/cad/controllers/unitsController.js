const unitsService = require('../services/unitsService');
const { unitSchema, unitUpdateSchema } = require('../services/validationService');

/**
 * Controller for units of measurement CRUD operations
 * Handles HTTP requests and responses for unit management
 */

class UnitsController {
  /**
   * Get all units with pagination and filters
   * GET /api/cad/units
   */
  async getAllUnits(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        ativo = null,
        sort = 'descricao',
        order = 'asc'
      } = req.query;

      const result = await unitsService.getAllUnits({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : null,
        sort,
        order
      });

      res.json({
        success: true,
        message: 'Unidades de medida recuperadas com sucesso',
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAllUnits:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get unit by ID
   * GET /api/cad/units/:id
   */
  async getUnitById(req, res) {
    try {
      const { id } = req.params;
      const unit = await unitsService.getUnitById(parseInt(id));

      res.json({
        success: true,
        message: 'Unidade encontrada com sucesso',
        data: unit,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getUnitById:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Unidade não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create new unit
   * POST /api/cad/units
   */
  async createUnit(req, res) {
    try {
      const validatedData = unitSchema.parse(req.body);
      
      const newUnit = await unitsService.createUnit(validatedData);

      res.status(201).json({
        success: true,
        message: 'Unidade criada com sucesso',
        data: newUnit,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createUnit:', error);
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
   * Update unit
   * PUT /api/cad/units/:id
   */
  async updateUnit(req, res) {
    try {
      const { id } = req.params;
      const validatedData = unitUpdateSchema.parse(req.body);

      const updatedUnit = await unitsService.updateUnit(parseInt(id), validatedData);

      res.json({
        success: true,
        message: 'Unidade atualizada com sucesso',
        data: updatedUnit,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateUnit:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('Já existe')) {
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Unidade não encontrada' : 
               statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete unit
   * DELETE /api/cad/units/:id
   */
  async deleteUnit(req, res) {
    try {
      const { id } = req.params;
      const result = await unitsService.deleteUnit(parseInt(id));

      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in deleteUnit:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('em uso')) {
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Unidade não encontrada' : 
               statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get conversion rates between units
   * GET /api/cad/units/conversions
   */
  async getConversions(req, res) {
    try {
      const { from_unit_id, to_unit_id } = req.query;

      if (!from_unit_id || !to_unit_id) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'IDs das unidades de origem e destino são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      const conversion = await unitsService.getConversion(
        parseInt(from_unit_id), 
        parseInt(to_unit_id)
      );

      res.json({
        success: true,
        message: 'Conversão recuperada com sucesso',
        data: conversion,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getConversions:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Add or update conversion factor between units
   * POST /api/cad/units/conversions
   */
  async setConversion(req, res) {
    try {
      const { from_unit_id, to_unit_id, factor } = req.body;

      if (!from_unit_id || !to_unit_id || !factor) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'IDs das unidades e fator de conversão são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      const conversion = await unitsService.setConversion(
        parseInt(from_unit_id), 
        parseInt(to_unit_id), 
        parseFloat(factor)
      );

      res.json({
        success: true,
        message: 'Conversão configurada com sucesso',
        data: conversion,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in setConversion:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get units for select dropdown
   * GET /api/cad/units/select
   */
  async getUnitsForSelect(req, res) {
    try {
      const { search = '' } = req.query;
      
      const result = await unitsService.getAllUnits({
        page: 1,
        limit: 100,
        search,
        ativo: true,
        sort: 'descricao',
        order: 'asc'
      });

      const selectOptions = result.data.map(unit => ({
        value: unit.id_unidade,
        label: `${unit.simbolo} - ${unit.descricao}`,
        simbolo: unit.simbolo,
        descricao: unit.descricao,
        precisao_decimal: unit.precisao_decimal
      }));

      res.json({
        success: true,
        message: 'Unidades para seleção recuperadas com sucesso',
        data: selectOptions,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getUnitsForSelect:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Convert value between units
   * POST /api/cad/units/convert
   */
  async convertValue(req, res) {
    try {
      const { value, from_unit_id, to_unit_id } = req.body;

      if (!value || !from_unit_id || !to_unit_id) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Valor e IDs das unidades são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      const result = await unitsService.convertValue(
        parseFloat(value),
        parseInt(from_unit_id),
        parseInt(to_unit_id)
      );

      res.json({
        success: true,
        message: 'Conversão realizada com sucesso',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in convertValue:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get unit statistics
   * GET /api/cad/units/stats
   */
  async getUnitStats(req, res) {
    try {
      const stats = await unitsService.getUnitStats();

      res.json({
        success: true,
        message: 'Estatísticas de unidades recuperadas com sucesso',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getUnitStats:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new UnitsController();