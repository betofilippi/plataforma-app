const QualityControlService = require('../services/qualityControlService');
const knex = require('../../../src/config/database');

class QualityControlController {
  constructor() {
    this.service = new QualityControlService(knex);
  }

  async list(req, res) {
    try {
      const filters = {
        produto_id: req.query.produto_id,
        ordem_producao_id: req.query.ordem_producao_id,
        status: req.query.status,
        tipo_inspecao: req.query.tipo_inspecao,
        data_inicio: req.query.data_inicio,
        data_fim: req.query.data_fim
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const result = await this.service.listQualityControls(filters, pagination);
      
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
      const qualityControl = await this.service.getQualityControlById(id);
      
      res.json({
        success: true,
        data: qualityControl
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
      const qualityControl = await this.service.createQualityControl(req.body, userId);
      
      res.status(201).json({
        success: true,
        message: 'Controle de qualidade criado com sucesso',
        data: qualityControl
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
      const qualityControl = await this.service.updateQualityControl(id, req.body, userId);
      
      res.json({
        success: true,
        message: 'Controle de qualidade atualizado com sucesso',
        data: qualityControl
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
      const result = await this.service.deleteQualityControl(id, userId);
      
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

  async inspect(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const inspection = await this.service.executeInspection(id, req.body, userId);
      
      res.json({
        success: true,
        message: 'Inspeção executada com sucesso',
        data: inspection
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 :
                    error.message.includes('já foi') ||
                    error.message.includes('inválido') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getReports(req, res) {
    try {
      const filters = {
        data_inicio: req.query.data_inicio,
        data_fim: req.query.data_fim,
        produto_id: req.query.produto_id,
        tipo_inspecao: req.query.tipo_inspecao
      };

      const reports = await this.service.getQualityReports(filters);
      
      res.json({
        success: true,
        data: reports
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getInspectionPlans(req, res) {
    try {
      const filters = {
        produto_id: req.query.produto_id,
        ativo: req.query.ativo !== 'false'
      };

      const plans = await this.service.getInspectionPlans(filters);
      
      res.json({
        success: true,
        data: plans
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async createInspectionPlan(req, res) {
    try {
      const userId = req.user?.id;
      const plan = await this.service.createInspectionPlan(req.body, userId);
      
      res.status(201).json({
        success: true,
        message: 'Plano de inspeção criado com sucesso',
        data: plan
      });
    } catch (error) {
      const status = error.message.includes('inválido') || 
                    error.message.includes('obrigatório') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getNonConformities(req, res) {
    try {
      const filters = {
        status: req.query.status,
        severidade: req.query.severidade,
        data_inicio: req.query.data_inicio,
        data_fim: req.query.data_fim
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const result = await this.service.getNonConformities(filters, pagination);
      
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

  async createNonConformity(req, res) {
    try {
      const userId = req.user?.id;
      const nonConformity = await this.service.createNonConformity(req.body, userId);
      
      res.status(201).json({
        success: true,
        message: 'Não conformidade registrada com sucesso',
        data: nonConformity
      });
    } catch (error) {
      const status = error.message.includes('inválido') || 
                    error.message.includes('obrigatório') ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getCorrectiveActions(req, res) {
    try {
      const { id } = req.params;
      const actions = await this.service.getCorrectiveActions(id);
      
      res.json({
        success: true,
        data: actions
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async createCorrectiveAction(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const action = await this.service.createCorrectiveAction(id, req.body, userId);
      
      res.status(201).json({
        success: true,
        message: 'Ação corretiva criada com sucesso',
        data: action
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

  async getCertificates(req, res) {
    try {
      const filters = {
        produto_id: req.query.produto_id,
        lote: req.query.lote,
        data_inicio: req.query.data_inicio,
        data_fim: req.query.data_fim
      };

      const certificates = await this.service.getQualityCertificates(filters);
      
      res.json({
        success: true,
        data: certificates
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async generateCertificate(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const certificate = await this.service.generateQualityCertificate(id, req.body, userId);
      
      res.json({
        success: true,
        message: 'Certificado de qualidade gerado com sucesso',
        data: certificate
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getTraceability(req, res) {
    try {
      const { id } = req.params;
      const traceability = await this.service.getProductTraceability(id);
      
      res.json({
        success: true,
        data: traceability
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

module.exports = QualityControlController;