const companiesService = require('../services/companiesService');
const { companySchema, companyUpdateSchema } = require('../services/validationService');

/**
 * Controller for companies/branches CRUD operations
 * Handles HTTP requests and responses for company management
 */

class CompaniesController {
  /**
   * Get all companies with pagination and filters
   * GET /api/cad/companies
   */
  async getAllCompanies(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        ativo = null,
        sort = 'razao_social',
        order = 'asc'
      } = req.query;

      const result = await companiesService.getAllCompanies({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : null,
        sort,
        order
      });

      res.json({
        success: true,
        message: 'Empresas recuperadas com sucesso',
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAllCompanies:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get company by ID
   * GET /api/cad/companies/:id
   */
  async getCompanyById(req, res) {
    try {
      const { id } = req.params;
      const includeEstablishments = req.query.include_establishments === 'true';
      
      const company = await companiesService.getCompanyById(parseInt(id), includeEstablishments);

      res.json({
        success: true,
        message: 'Empresa encontrada com sucesso',
        data: company,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getCompanyById:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Empresa não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create new company
   * POST /api/cad/companies
   */
  async createCompany(req, res) {
    try {
      const validatedData = companySchema.parse(req.body);
      
      const newCompany = await companiesService.createCompany(validatedData);

      res.status(201).json({
        success: true,
        message: 'Empresa criada com sucesso',
        data: newCompany,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createCompany:', error);
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
   * Update company
   * PUT /api/cad/companies/:id
   */
  async updateCompany(req, res) {
    try {
      const { id } = req.params;
      const validatedData = companyUpdateSchema.parse(req.body);

      const updatedCompany = await companiesService.updateCompany(parseInt(id), validatedData);

      res.json({
        success: true,
        message: 'Empresa atualizada com sucesso',
        data: updatedCompany,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateCompany:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('Já existe')) {
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Empresa não encontrada' : 
               statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete company
   * DELETE /api/cad/companies/:id
   */
  async deleteCompany(req, res) {
    try {
      const { id } = req.params;
      const result = await companiesService.deleteCompany(parseInt(id));

      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in deleteCompany:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('possui estabelecimentos') || error.message.includes('principal')) {
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Empresa não encontrada' : 
               statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get companies for select dropdown
   * GET /api/cad/companies/select
   */
  async getCompaniesForSelect(req, res) {
    try {
      const { search = '' } = req.query;
      
      const result = await companiesService.getAllCompanies({
        page: 1,
        limit: 100,
        search,
        ativo: true,
        sort: 'razao_social',
        order: 'asc'
      });

      const selectOptions = result.data.map(company => ({
        value: company.id_empresa,
        label: company.razao_social,
        cnpj: company.cnpj,
        nome_fantasia: company.nome_fantasia
      }));

      res.json({
        success: true,
        message: 'Empresas para seleção recuperadas com sucesso',
        data: selectOptions,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getCompaniesForSelect:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get company statistics
   * GET /api/cad/companies/stats
   */
  async getCompanyStats(req, res) {
    try {
      const stats = await companiesService.getCompanyStats();

      res.json({
        success: true,
        message: 'Estatísticas de empresas recuperadas com sucesso',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getCompanyStats:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get all establishments for a company
   * GET /api/cad/companies/:id/establishments
   */
  async getCompanyEstablishments(req, res) {
    try {
      const { id } = req.params;
      const establishments = await companiesService.getCompanyEstablishments(parseInt(id));

      res.json({
        success: true,
        message: 'Estabelecimentos recuperados com sucesso',
        data: establishments,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getCompanyEstablishments:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Empresa não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create establishment for company
   * POST /api/cad/companies/:id/establishments
   */
  async createEstablishment(req, res) {
    try {
      const { id } = req.params;
      const establishmentData = req.body;

      const newEstablishment = await companiesService.createEstablishment(
        parseInt(id), 
        establishmentData
      );

      res.status(201).json({
        success: true,
        message: 'Estabelecimento criado com sucesso',
        data: newEstablishment,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createEstablishment:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 
                         error.message.includes('Já existe') ? 409 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Empresa não encontrada' : 
               statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Set main company
   * PATCH /api/cad/companies/:id/set-main
   */
  async setMainCompany(req, res) {
    try {
      const { id } = req.params;
      
      const result = await companiesService.setMainCompany(parseInt(id));

      res.json({
        success: true,
        message: 'Empresa principal definida com sucesso',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in setMainCompany:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Empresa não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Export companies to CSV
   * GET /api/cad/companies/export
   */
  async exportCompanies(req, res) {
    try {
      const { format = 'csv' } = req.query;
      
      const result = await companiesService.exportCompanies(format);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=empresas.csv');
      } else {
        res.setHeader('Content-Type', 'application/json');
      }

      res.send(result);
    } catch (error) {
      console.error('Error in exportCompanies:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new CompaniesController();