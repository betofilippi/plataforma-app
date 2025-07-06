const suppliersService = require('../services/suppliersService');
const { supplierSchema, supplierUpdateSchema } = require('../services/validationService');

/**
 * Controller for suppliers CRUD operations
 * Handles HTTP requests and responses for supplier management
 */

class SuppliersController {
  /**
   * Get all suppliers with pagination and filters
   * GET /api/cad/suppliers
   */
  async getAllSuppliers(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        search = '',
        ativo = null,
        tipo_pessoa = null,
        uf = null,
        cidade = null,
        forma_pagamento = null,
        avaliacao = null,
        sort = 'nome_razao_social',
        order = 'asc'
      } = req.validatedQuery || req.query;

      const result = await suppliersService.getAllSuppliers({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : null,
        tipo_pessoa,
        uf,
        cidade,
        forma_pagamento,
        avaliacao: avaliacao ? parseInt(avaliacao) : null,
        sort,
        order
      });

      res.json({
        success: true,
        message: 'Fornecedores recuperados com sucesso',
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAllSuppliers:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get supplier by ID
   * GET /api/cad/suppliers/:id
   */
  async getSupplierById(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const supplier = await suppliersService.getSupplierById(parseInt(id));

      res.json({
        success: true,
        message: 'Fornecedor encontrado com sucesso',
        data: supplier,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getSupplierById:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Fornecedor não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create new supplier
   * POST /api/cad/suppliers
   */
  async createSupplier(req, res) {
    try {
      const validatedData = req.validatedData || req.body;

      const newSupplier = await suppliersService.createSupplier(validatedData);

      res.status(201).json({
        success: true,
        message: 'Fornecedor criado com sucesso',
        data: newSupplier,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createSupplier:', error);
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
   * Update supplier
   * PUT /api/cad/suppliers/:id
   */
  async updateSupplier(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const validatedData = req.validatedData || req.body;

      const updatedSupplier = await suppliersService.updateSupplier(parseInt(id), validatedData);

      res.json({
        success: true,
        message: 'Fornecedor atualizado com sucesso',
        data: updatedSupplier,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateSupplier:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('Já existe')) {
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Fornecedor não encontrado' : 
               statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete supplier
   * DELETE /api/cad/suppliers/:id
   */
  async deleteSupplier(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const result = await suppliersService.deleteSupplier(parseInt(id));

      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in deleteSupplier:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Fornecedor não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get supplier statistics
   * GET /api/cad/suppliers/stats
   */
  async getSupplierStats(req, res) {
    try {
      const stats = await suppliersService.getSupplierStats();

      res.json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getSupplierStats:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Advanced supplier search
   * POST /api/cad/suppliers/search
   */
  async searchSuppliers(req, res) {
    try {
      const searchParams = req.body;
      const suppliers = await suppliersService.searchSuppliers(searchParams);

      res.json({
        success: true,
        message: 'Busca realizada com sucesso',
        data: suppliers,
        count: suppliers.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in searchSuppliers:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get suppliers for select dropdown
   * GET /api/cad/suppliers/select
   */
  async getSuppliersForSelect(req, res) {
    try {
      const { search = '' } = req.query;
      const suppliers = await suppliersService.getSuppliersForSelect(search);

      res.json({
        success: true,
        message: 'Fornecedores para seleção recuperados com sucesso',
        data: suppliers,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getSuppliersForSelect:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get supplier performance metrics
   * GET /api/cad/suppliers/:id/performance
   */
  async getSupplierPerformance(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const performance = await suppliersService.getSupplierPerformanceMetrics(parseInt(id));

      res.json({
        success: true,
        message: 'Performance do fornecedor recuperada com sucesso',
        data: performance,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getSupplierPerformance:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Fornecedor não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Toggle supplier active status
   * PATCH /api/cad/suppliers/:id/toggle-status
   */
  async toggleSupplierStatus(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const supplier = await suppliersService.getSupplierById(parseInt(id));
      
      const updatedSupplier = await suppliersService.updateSupplier(parseInt(id), {
        ativo: !supplier.ativo
      });

      res.json({
        success: true,
        message: `Fornecedor ${updatedSupplier.ativo ? 'ativado' : 'desativado'} com sucesso`,
        data: { id: updatedSupplier.id_fornecedor, ativo: updatedSupplier.ativo },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in toggleSupplierStatus:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Fornecedor não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get supplier types for filters
   * GET /api/cad/suppliers/types
   */
  async getSupplierTypes(req, res) {
    try {
      const types = [
        { value: 'MATERIA_PRIMA', label: 'Matéria Prima' },
        { value: 'SERVICOS', label: 'Serviços' },
        { value: 'EQUIPAMENTOS', label: 'Equipamentos' },
        { value: 'OUTROS', label: 'Outros' }
      ];

      res.json({
        success: true,
        message: 'Tipos de fornecedor recuperados com sucesso',
        data: types,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getSupplierTypes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Bulk operations on suppliers
   * POST /api/cad/suppliers/bulk
   */
  async bulkOperations(req, res) {
    try {
      const { operation, supplierIds, data = {} } = req.body;

      if (!operation || !supplierIds || !Array.isArray(supplierIds)) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Operação e IDs dos fornecedores são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      const result = await suppliersService.bulkOperations(operation, supplierIds, data);

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
   * Export suppliers to CSV
   * GET /api/cad/suppliers/export
   */
  async exportSuppliers(req, res) {
    try {
      const { 
        search = '', 
        ativo = null, 
        tipo_pessoa = null,
        uf = null,
        formato = 'csv'
      } = req.query;
      
      const filters = {
        search,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : null,
        tipo_pessoa,
        uf
      };

      if (formato === 'csv') {
        const csvData = await suppliersService.exportSuppliers('csv', filters);

        // Set CSV headers
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=fornecedores.csv');
        res.setHeader('Cache-Control', 'no-cache');

        res.send(csvData);
      } else {
        // JSON export
        const result = await suppliersService.getAllSuppliers({
          page: 1,
          limit: 10000, // Large limit for export
          ...filters,
          sort: 'nome_razao_social',
          order: 'asc'
        });

        res.json({
          success: true,
          message: 'Fornecedores exportados com sucesso',
          data: result.data,
          total: result.pagination.total,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in exportSuppliers:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new SuppliersController();