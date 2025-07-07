const BOMService = require('../services/bomService');
const knex = require('../../../src/config/database');

class BOMController {
  constructor() {
    this.service = new BOMService(knex);
  }

  async list(req, res) {
    try {
      const filters = {
        produto_id: req.query.produto_id,
        ativo: req.query.ativo !== 'false',
        tipo: req.query.tipo,
        versao: req.query.versao
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const result = await this.service.listBOMs(filters, pagination);
      
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
      const bom = await this.service.getBOMById(id);
      
      res.json({
        success: true,
        data: bom
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
      const bom = await this.service.createBOM(req.body, userId);
      
      res.status(201).json({
        success: true,
        message: 'BOM criado com sucesso',
        data: bom
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
      const bom = await this.service.updateBOM(id, req.body, userId);
      
      res.json({
        success: true,
        message: 'BOM atualizado com sucesso',
        data: bom
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
      const result = await this.service.deleteBOM(id, userId);
      
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

  async explode(req, res) {
    try {
      const { id } = req.params;
      const levels = parseInt(req.query.levels) || 99;
      const explodedBOM = await this.service.explodeBOM(id, levels);
      
      res.json({
        success: true,
        data: explodedBOM
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async calculateCost(req, res) {
    try {
      const { id } = req.params;
      const { quantidade } = req.body;
      const cost = await this.service.calculateBOMCost(id, quantidade);
      
      res.json({
        success: true,
        data: cost
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getRevisions(req, res) {
    try {
      const { id } = req.params;
      const revisions = await this.service.getBOMRevisions(id);
      
      res.json({
        success: true,
        data: revisions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async createRevision(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const revision = await this.service.createBOMRevision(id, req.body, userId);
      
      res.status(201).json({
        success: true,
        message: 'Revisão do BOM criada com sucesso',
        data: revision
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async copyBOM(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const copy = await this.service.copyBOM(id, req.body, userId);
      
      res.status(201).json({
        success: true,
        message: 'BOM copiado com sucesso',
        data: copy
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async validateBOM(req, res) {
    try {
      const { id } = req.params;
      const validation = await this.service.validateBOM(id);
      
      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      const status = error.message.includes('não encontrado') ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  }

  async getUsage(req, res) {
    try {
      const { id } = req.params;
      const usage = await this.service.getBOMUsage(id);
      
      res.json({
        success: true,
        data: usage
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

module.exports = BOMController;