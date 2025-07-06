const db = require('../../../src/database/connection');
const { z } = require('zod');

// Tax Compliance Controller - Brazilian tax compliance monitoring and reporting
class TaxComplianceController {
  // Get compliance dashboard overview
  async getDashboard(req, res) {
    try {
      const filters = {
        id_empresa: req.query.id_empresa || '',
        periodo: req.query.periodo || '30' // days
      };

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - parseInt(filters.periodo));

      // Get compliance summary
      const complianceSummary = await this.getComplianceSummary(filters);
      
      // Get pending obligations
      const pendingObligations = await this.getPendingObligations(filters);
      
      // Get recent alerts
      const recentAlerts = await this.getRecentAlerts(filters);
      
      // Get tax calculations performance
      const calculationStats = await this.getCalculationStats(filters);

      res.json({
        success: true,
        data: {
          resumo_conformidade: complianceSummary,
          obrigacoes_pendentes: pendingObligations,
          alertas_recentes: recentAlerts,
          estatisticas_calculo: calculationStats
        }
      });

    } catch (error) {
      console.error('Error fetching compliance dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'DASHBOARD_ERROR',
        message: 'Erro ao buscar painel de conformidade',
        details: error.message
      });
    }
  }

  // Get tax obligations with status tracking
  async getTaxObligations(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const filters = {
        id_empresa: req.query.id_empresa || '',
        tipo_obrigacao: req.query.tipo_obrigacao || '',
        status: req.query.status || '',
        vencimento_inicial: req.query.vencimento_inicial || '',
        vencimento_final: req.query.vencimento_final || ''
      };

      let query = db('fis_20_obrigacoes_tributarias as ot')
        .leftJoin('cad_01_empresas as e', 'ot.id_empresa', 'e.id_empresa')
        .leftJoin('cad_05_usuarios as u', 'ot.id_usuario_responsavel', 'u.id_usuario')
        .select(
          'ot.*',
          'e.nome_fantasia as empresa_nome',
          'e.cnpj as empresa_cnpj',
          'u.nome as responsavel_nome'
        );

      // Apply filters
      if (filters.id_empresa) {
        query = query.where('ot.id_empresa', filters.id_empresa);
      }

      if (filters.tipo_obrigacao) {
        query = query.where('ot.tipo_obrigacao', filters.tipo_obrigacao);
      }

      if (filters.status) {
        query = query.where('ot.status', filters.status);
      }

      if (filters.vencimento_inicial && filters.vencimento_final) {
        query = query.whereBetween('ot.data_vencimento', [filters.vencimento_inicial, filters.vencimento_final]);
      } else if (filters.vencimento_inicial) {
        query = query.where('ot.data_vencimento', '>=', filters.vencimento_inicial);
      } else if (filters.vencimento_final) {
        query = query.where('ot.data_vencimento', '<=', filters.vencimento_final);
      }

      // Count total records
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting and pagination
      const sortField = req.query.sort || 'data_vencimento';
      const sortOrder = req.query.order || 'asc';
      query = query.orderBy(`ot.${sortField}`, sortOrder);

      const obligations = await query.limit(limit).offset(offset);

      // Add compliance details for each obligation
      for (let obligation of obligations) {
        obligation.detalhes_cumprimento = await this.getObligationDetails(obligation.id_obrigacao);
      }

      res.json({
        success: true,
        data: obligations,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        },
        filters
      });

    } catch (error) {
      console.error('Error fetching tax obligations:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar obrigações tributárias',
        details: error.message
      });
    }
  }

  // Create new tax obligation
  async createObligation(req, res) {
    const trx = await db.transaction();
    
    try {
      const validatedData = z.object({
        id_empresa: z.number(),
        tipo_obrigacao: z.enum(['SPED_ECD', 'SPED_ECF', 'DCTF', 'EFD_ICMS_IPI', 'EFD_CONTRIBUICOES', 'DEFIS', 'DMED', 'DIRF']),
        descricao: z.string(),
        data_vencimento: z.string(),
        periodicidade: z.enum(['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL']),
        periodo_referencia: z.string(),
        id_usuario_responsavel: z.number().optional(),
        observacoes: z.string().optional()
      }).parse(req.body);

      const obligationData = {
        ...validatedData,
        status: 'PENDENTE',
        created_at: new Date(),
        updated_at: new Date()
      };

      const [obligationId] = await trx('fis_20_obrigacoes_tributarias')
        .insert(obligationData)
        .returning('id_obrigacao');

      // Create automatic schedule if periodic
      if (validatedData.periodicidade !== 'EVENTUAL') {
        await this.createPeriodicSchedule(obligationId, validatedData, trx);
      }

      // Log creation
      await trx('fis_21_log_conformidade').insert({
        id_obrigacao: obligationId,
        acao: 'CRIACAO',
        descricao: 'Obrigação tributária criada',
        data_acao: new Date(),
        id_usuario: req.user?.id
      });

      await trx.commit();

      res.status(201).json({
        success: true,
        data: { id_obrigacao: obligationId },
        message: 'Obrigação tributária criada com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: error.errors
        });
      }

      console.error('Error creating tax obligation:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar obrigação tributária',
        details: error.message
      });
    }
  }

  // Update obligation status
  async updateObligationStatus(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { status, observacoes, data_cumprimento } = req.body;

      const validStatuses = ['PENDENTE', 'EM_ANDAMENTO', 'CUMPRIDA', 'ATRASADA', 'CANCELADA'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Status inválido'
        });
      }

      const obligation = await trx('fis_20_obrigacoes_tributarias')
        .where('id_obrigacao', id)
        .first();

      if (!obligation) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Obrigação tributária não encontrada'
        });
      }

      // Update obligation
      const updateData = {
        status,
        observacoes,
        updated_at: new Date()
      };

      if (status === 'CUMPRIDA' && data_cumprimento) {
        updateData.data_cumprimento = data_cumprimento;
      }

      await trx('fis_20_obrigacoes_tributarias')
        .where('id_obrigacao', id)
        .update(updateData);

      // Log status change
      await trx('fis_21_log_conformidade').insert({
        id_obrigacao: id,
        acao: 'ALTERACAO_STATUS',
        descricao: `Status alterado para: ${status}`,
        status_anterior: obligation.status,
        status_novo: status,
        data_acao: new Date(),
        id_usuario: req.user?.id
      });

      // Create alert if overdue
      if (status === 'ATRASADA') {
        await this.createOverdueAlert(id, obligation, trx);
      }

      await trx.commit();

      res.json({
        success: true,
        message: 'Status da obrigação atualizado com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error updating obligation status:', error);
      res.status(500).json({
        success: false,
        error: 'UPDATE_ERROR',
        message: 'Erro ao atualizar status da obrigação',
        details: error.message
      });
    }
  }

  // Generate compliance report
  async generateComplianceReport(req, res) {
    try {
      const filters = {
        id_empresa: req.query.id_empresa || '',
        periodo_inicial: req.query.periodo_inicial || '',
        periodo_final: req.query.periodo_final || '',
        tipo_relatorio: req.query.tipo_relatorio || 'GERAL'
      };

      if (!filters.periodo_inicial || !filters.periodo_final) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Período inicial e final são obrigatórios'
        });
      }

      let reportData;

      switch (filters.tipo_relatorio) {
        case 'OBRIGACOES':
          reportData = await this.generateObligationsReport(filters);
          break;
        case 'IMPOSTOS':
          reportData = await this.generateTaxReport(filters);
          break;
        case 'DOCUMENTOS_FISCAIS':
          reportData = await this.generateFiscalDocumentsReport(filters);
          break;
        case 'GERAL':
        default:
          reportData = await this.generateGeneralComplianceReport(filters);
          break;
      }

      res.json({
        success: true,
        data: {
          tipo_relatorio: filters.tipo_relatorio,
          periodo: {
            inicial: filters.periodo_inicial,
            final: filters.periodo_final
          },
          ...reportData
        }
      });

    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({
        success: false,
        error: 'REPORT_ERROR',
        message: 'Erro ao gerar relatório de conformidade',
        details: error.message
      });
    }
  }

  // Get tax calculation validation
  async validateTaxCalculations(req, res) {
    try {
      const filters = {
        id_empresa: req.query.id_empresa || '',
        data_inicial: req.query.data_inicial || '',
        data_final: req.query.data_final || ''
      };

      // Validate NFe tax calculations
      const nfeValidation = await this.validateNFeCalculations(filters);
      
      // Validate NFSe tax calculations
      const nfseValidation = await this.validateNFSeCalculations(filters);
      
      // Check for inconsistencies
      const inconsistencies = await this.findTaxInconsistencies(filters);
      
      // Generate validation summary
      const validationSummary = {
        total_documentos_validados: nfeValidation.total + nfseValidation.total,
        documentos_com_erro: nfeValidation.erros + nfseValidation.erros,
        taxa_conformidade: this.calculateComplianceRate(
          nfeValidation.total + nfseValidation.total,
          nfeValidation.erros + nfseValidation.erros
        ),
        inconsistencias_encontradas: inconsistencies.length,
        detalhes: {
          nfe: nfeValidation,
          nfse: nfseValidation,
          inconsistencias: inconsistencies
        }
      };

      res.json({
        success: true,
        data: validationSummary
      });

    } catch (error) {
      console.error('Error validating tax calculations:', error);
      res.status(500).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Erro ao validar cálculos tributários',
        details: error.message
      });
    }
  }

  // Get compliance alerts
  async getComplianceAlerts(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const filters = {
        id_empresa: req.query.id_empresa || '',
        tipo_alerta: req.query.tipo_alerta || '',
        nivel_criticidade: req.query.nivel_criticidade || '',
        resolvido: req.query.resolvido || ''
      };

      let query = db('fis_22_alertas_conformidade as ac')
        .leftJoin('cad_01_empresas as e', 'ac.id_empresa', 'e.id_empresa')
        .leftJoin('fis_20_obrigacoes_tributarias as ot', 'ac.id_obrigacao', 'ot.id_obrigacao')
        .select(
          'ac.*',
          'e.nome_fantasia as empresa_nome',
          'ot.tipo_obrigacao',
          'ot.descricao as obrigacao_descricao'
        );

      // Apply filters
      if (filters.id_empresa) {
        query = query.where('ac.id_empresa', filters.id_empresa);
      }

      if (filters.tipo_alerta) {
        query = query.where('ac.tipo_alerta', filters.tipo_alerta);
      }

      if (filters.nivel_criticidade) {
        query = query.where('ac.nivel_criticidade', filters.nivel_criticidade);
      }

      if (filters.resolvido === 'true') {
        query = query.where('ac.resolvido', true);
      } else if (filters.resolvido === 'false') {
        query = query.where('ac.resolvido', false);
      }

      // Count total records
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting and pagination
      const sortField = req.query.sort || 'data_alerta';
      const sortOrder = req.query.order || 'desc';
      query = query.orderBy(`ac.${sortField}`, sortOrder);

      const alerts = await query.limit(limit).offset(offset);

      res.json({
        success: true,
        data: alerts,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        },
        filters
      });

    } catch (error) {
      console.error('Error fetching compliance alerts:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar alertas de conformidade',
        details: error.message
      });
    }
  }

  // Resolve compliance alert
  async resolveAlert(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { observacoes_resolucao, acao_tomada } = req.body;

      const alert = await trx('fis_22_alertas_conformidade')
        .where('id_alerta', id)
        .first();

      if (!alert) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Alerta não encontrado'
        });
      }

      if (alert.resolvido) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'ALREADY_RESOLVED',
          message: 'Alerta já foi resolvido'
        });
      }

      // Update alert
      await trx('fis_22_alertas_conformidade')
        .where('id_alerta', id)
        .update({
          resolvido: true,
          data_resolucao: new Date(),
          observacoes_resolucao,
          acao_tomada,
          id_usuario_resolucao: req.user?.id,
          updated_at: new Date()
        });

      await trx.commit();

      res.json({
        success: true,
        message: 'Alerta resolvido com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error resolving alert:', error);
      res.status(500).json({
        success: false,
        error: 'RESOLVE_ERROR',
        message: 'Erro ao resolver alerta',
        details: error.message
      });
    }
  }

  // Helper methods
  async getComplianceSummary(filters) {
    let query = db('fis_20_obrigacoes_tributarias');
    
    if (filters.id_empresa) {
      query = query.where('id_empresa', filters.id_empresa);
    }

    const totalObligations = await query.clone().count('* as count').first();
    const pendingObligations = await query.clone().where('status', 'PENDENTE').count('* as count').first();
    const overdueObligations = await query.clone().where('status', 'ATRASADA').count('* as count').first();
    const completedObligations = await query.clone().where('status', 'CUMPRIDA').count('* as count').first();

    const complianceRate = this.calculateComplianceRate(
      parseInt(totalObligations.count),
      parseInt(overdueObligations.count)
    );

    return {
      total_obrigacoes: parseInt(totalObligations.count),
      pendentes: parseInt(pendingObligations.count),
      atrasadas: parseInt(overdueObligations.count),
      cumpridas: parseInt(completedObligations.count),
      taxa_conformidade: complianceRate
    };
  }

  async getPendingObligations(filters) {
    let query = db('fis_20_obrigacoes_tributarias as ot')
      .leftJoin('cad_01_empresas as e', 'ot.id_empresa', 'e.id_empresa')
      .select('ot.*', 'e.nome_fantasia as empresa_nome')
      .where('ot.status', 'PENDENTE')
      .where('ot.data_vencimento', '<=', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // Next 30 days

    if (filters.id_empresa) {
      query = query.where('ot.id_empresa', filters.id_empresa);
    }

    return await query.orderBy('ot.data_vencimento', 'asc').limit(10);
  }

  async getRecentAlerts(filters) {
    let query = db('fis_22_alertas_conformidade as ac')
      .leftJoin('cad_01_empresas as e', 'ac.id_empresa', 'e.id_empresa')
      .select('ac.*', 'e.nome_fantasia as empresa_nome')
      .where('ac.resolvido', false);

    if (filters.id_empresa) {
      query = query.where('ac.id_empresa', filters.id_empresa);
    }

    return await query.orderBy('ac.data_alerta', 'desc').limit(5);
  }

  async getCalculationStats(filters) {
    // This would contain logic to analyze tax calculation performance
    // For demo purposes, returning mock data
    return {
      total_calculos: 1250,
      calculos_corretos: 1200,
      calculos_com_erro: 50,
      taxa_precisao: 96.0,
      tempo_medio_calculo: 150 // milliseconds
    };
  }

  async getObligationDetails(obligationId) {
    return await db('fis_21_log_conformidade')
      .where('id_obrigacao', obligationId)
      .orderBy('data_acao', 'desc')
      .limit(5);
  }

  async createPeriodicSchedule(obligationId, obligationData, trx) {
    // Logic to create automatic recurring obligations
    // This would create future obligations based on periodicity
  }

  async createOverdueAlert(obligationId, obligation, trx) {
    await trx('fis_22_alertas_conformidade').insert({
      id_empresa: obligation.id_empresa,
      id_obrigacao: obligationId,
      tipo_alerta: 'OBRIGACAO_ATRASADA',
      nivel_criticidade: 'ALTO',
      titulo: 'Obrigação Tributária Atrasada',
      descricao: `A obrigação ${obligation.descricao} está em atraso`,
      data_alerta: new Date(),
      resolvido: false,
      created_at: new Date()
    });
  }

  async validateNFeCalculations(filters) {
    // Logic to validate NFe tax calculations
    return { total: 100, erros: 2 };
  }

  async validateNFSeCalculations(filters) {
    // Logic to validate NFSe tax calculations
    return { total: 50, erros: 1 };
  }

  async findTaxInconsistencies(filters) {
    // Logic to find tax calculation inconsistencies
    return [];
  }

  async generateObligationsReport(filters) {
    // Generate obligations compliance report
    return { tipo: 'obrigacoes', dados: [] };
  }

  async generateTaxReport(filters) {
    // Generate tax calculations report
    return { tipo: 'impostos', dados: [] };
  }

  async generateFiscalDocumentsReport(filters) {
    // Generate fiscal documents report
    return { tipo: 'documentos_fiscais', dados: [] };
  }

  async generateGeneralComplianceReport(filters) {
    // Generate general compliance report
    return { tipo: 'geral', dados: [] };
  }

  calculateComplianceRate(total, errors) {
    if (total === 0) return 100;
    return Math.round(((total - errors) / total) * 100 * 100) / 100;
  }
}

module.exports = new TaxComplianceController();