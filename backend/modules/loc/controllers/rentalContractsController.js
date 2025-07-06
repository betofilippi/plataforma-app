const rentalContractsService = require('../services/rentalContractsService');
const { rentalContractSchema, rentalContractUpdateSchema } = require('../services/validationService');

/**
 * Controller for rental contracts CRUD operations
 * Handles HTTP requests and responses for rental contract management
 */

class RentalContractsController {
  /**
   * Get all rental contracts with pagination and filters
   * GET /api/loc/rental-contracts
   */
  async getAllRentalContracts(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        status = null,
        cliente_id = null,
        equipment_type = null,
        sort = 'numero_contrato',
        order = 'desc'
      } = req.validatedQuery || req.query;

      const result = await rentalContractsService.getAllRentalContracts({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        status,
        cliente_id: cliente_id ? parseInt(cliente_id) : null,
        equipment_type,
        sort,
        order
      });

      res.json({
        success: true,
        message: 'Contratos de locação recuperados com sucesso',
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAllRentalContracts:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get rental contract by ID
   * GET /api/loc/rental-contracts/:id
   */
  async getRentalContractById(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const contract = await rentalContractsService.getRentalContractById(parseInt(id));

      res.json({
        success: true,
        message: 'Contrato de locação encontrado com sucesso',
        data: contract,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getRentalContractById:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Contrato não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create new rental contract
   * POST /api/loc/rental-contracts
   */
  async createRentalContract(req, res) {
    try {
      const validatedData = req.validatedData || req.body;
      
      // Additional business validation
      if (new Date(validatedData.data_inicio) >= new Date(validatedData.data_fim)) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Data de início deve ser anterior à data de fim',
          timestamp: new Date().toISOString()
        });
      }

      const newContract = await rentalContractsService.createRentalContract(validatedData);

      res.status(201).json({
        success: true,
        message: 'Contrato de locação criado com sucesso',
        data: newContract,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createRentalContract:', error);
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
   * Update rental contract
   * PUT /api/loc/rental-contracts/:id
   */
  async updateRentalContract(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const validatedData = req.validatedData || req.body;

      const updatedContract = await rentalContractsService.updateRentalContract(parseInt(id), validatedData);

      res.json({
        success: true,
        message: 'Contrato de locação atualizado com sucesso',
        data: updatedContract,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateRentalContract:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('Já existe')) {
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Contrato não encontrado' : 
               statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete rental contract
   * DELETE /api/loc/rental-contracts/:id
   */
  async deleteRentalContract(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const result = await rentalContractsService.deleteRentalContract(parseInt(id));

      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in deleteRentalContract:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Contrato não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get rental contract statistics
   * GET /api/loc/rental-contracts/stats
   */
  async getRentalContractStats(req, res) {
    try {
      const stats = await rentalContractsService.getRentalContractStats();

      res.json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getRentalContractStats:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Renew rental contract
   * POST /api/loc/rental-contracts/:id/renew
   */
  async renewRentalContract(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const { nova_data_fim, ajuste_valor } = req.body;

      if (!nova_data_fim) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Nova data de fim é obrigatória',
          timestamp: new Date().toISOString()
        });
      }

      const result = await rentalContractsService.renewRentalContract(parseInt(id), {
        nova_data_fim,
        ajuste_valor: ajuste_valor || 0
      });

      res.json({
        success: true,
        message: result.message,
        data: result.contract,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in renewRentalContract:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Contrato não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Calculate rental billing
   * GET /api/loc/rental-contracts/:id/billing
   */
  async calculateRentalBilling(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const { periodo_inicio, periodo_fim } = req.query;

      const billing = await rentalContractsService.calculateRentalBilling(parseInt(id), {
        periodo_inicio,
        periodo_fim
      });

      res.json({
        success: true,
        message: 'Cálculo de faturamento realizado com sucesso',
        data: billing,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in calculateRentalBilling:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Contrato não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get contracts expiring soon
   * GET /api/loc/rental-contracts/expiring
   */
  async getExpiringContracts(req, res) {
    try {
      const { days = 30 } = req.query;
      const contracts = await rentalContractsService.getExpiringContracts(parseInt(days));

      res.json({
        success: true,
        message: 'Contratos vencendo recuperados com sucesso',
        data: contracts,
        count: contracts.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getExpiringContracts:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new RentalContractsController();
