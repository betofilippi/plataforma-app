const db = require('../../../src/database/connection');
const { salesPipelineSchema, salesPipelineUpdateSchema } = require('../services/validationService');
const { z } = require('zod');

// Sales Pipeline Controller - Complete sales pipeline management
class SalesPipelineController {
  // Get all pipeline opportunities with advanced filtering and pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // Parse and validate filters
      const filters = {
        search: req.query.search || '',
        estagio: req.query.estagio || '',
        id_cliente: req.query.id_cliente || '',
        id_vendedor: req.query.id_vendedor || '',
        data_inicial: req.query.data_inicial || '',
        data_final: req.query.data_final || '',
        valor_min: req.query.valor_min || '',
        valor_max: req.query.valor_max || '',
        probabilidade_min: req.query.probabilidade_min || '',
        origem_lead: req.query.origem_lead || ''
      };

      // Base query with joins
      let query = db('vnd_06_pipeline as p')
        .leftJoin('cad_03_clientes as c', 'p.id_cliente', 'c.id_cliente')
        .leftJoin('cad_01_empresas as e', 'p.id_empresa', 'e.id_empresa')
        .leftJoin('cad_05_usuarios as v', 'p.id_vendedor', 'v.id_usuario')
        .leftJoin('cad_05_usuarios as u', 'p.id_usuario_criacao', 'u.id_usuario')
        .select(
          'p.*',
          'c.nome_razao_social as cliente_nome',
          'c.cnpj_cpf as cliente_documento',
          'c.email as cliente_email',
          'e.nome_fantasia as empresa_nome',
          'v.nome as vendedor_nome',
          'u.nome as criado_por'
        );

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('p.titulo', 'ilike', `%${filters.search}%`)
              .orWhere('p.descricao', 'ilike', `%${filters.search}%`)
              .orWhere('c.nome_razao_social', 'ilike', `%${filters.search}%`)
              .orWhere('c.cnpj_cpf', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.estagio) {
        query = query.where('p.estagio', filters.estagio);
      }

      if (filters.id_cliente) {
        query = query.where('p.id_cliente', filters.id_cliente);
      }

      if (filters.id_vendedor) {
        query = query.where('p.id_vendedor', filters.id_vendedor);
      }

      if (filters.data_inicial) {
        query = query.where('p.data_fechamento_prevista', '>=', filters.data_inicial);
      }

      if (filters.data_final) {
        query = query.where('p.data_fechamento_prevista', '<=', filters.data_final);
      }

      if (filters.valor_min) {
        query = query.where('p.valor_estimado', '>=', parseFloat(filters.valor_min));
      }

      if (filters.valor_max) {
        query = query.where('p.valor_estimado', '<=', parseFloat(filters.valor_max));
      }

      if (filters.probabilidade_min) {
        query = query.where('p.probabilidade', '>=', parseInt(filters.probabilidade_min));
      }

      if (filters.origem_lead) {
        query = query.where('p.origem_lead', 'ilike', `%${filters.origem_lead}%`);
      }

      // Count total records
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting
      const sortField = req.query.sort || 'data_fechamento_prevista';
      const sortOrder = req.query.order || 'asc';
      query = query.orderBy(`p.${sortField}`, sortOrder);

      // Apply pagination
      const opportunities = await query.limit(limit).offset(offset);

      // Add calculated fields
      for (const opportunity of opportunities) {
        // Calculate weighted value (value * probability)
        opportunity.valor_ponderado = opportunity.valor_estimado * (opportunity.probabilidade / 100);
        
        // Calculate days to close
        const today = new Date();
        const closeDate = new Date(opportunity.data_fechamento_prevista);
        opportunity.dias_para_fechamento = Math.ceil((closeDate - today) / (1000 * 60 * 60 * 24));
        
        // Check if overdue
        opportunity.em_atraso = opportunity.dias_para_fechamento < 0;
      }

      res.json({
        success: true,
        data: opportunities,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching pipeline opportunities:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar oportunidades do pipeline',
        details: error.message
      });
    }
  }

  // Get opportunity by ID with full details
  async getById(req, res) {
    try {
      const { id } = req.params;

      const opportunity = await db('vnd_06_pipeline as p')
        .leftJoin('cad_03_clientes as c', 'p.id_cliente', 'c.id_cliente')
        .leftJoin('cad_01_empresas as e', 'p.id_empresa', 'e.id_empresa')
        .leftJoin('cad_05_usuarios as v', 'p.id_vendedor', 'v.id_usuario')
        .leftJoin('cad_05_usuarios as u', 'p.id_usuario_criacao', 'u.id_usuario')
        .select(
          'p.*',
          'c.nome_razao_social as cliente_nome',
          'c.cnpj_cpf as cliente_documento',
          'c.email as cliente_email',
          'c.telefone as cliente_telefone',
          'c.endereco as cliente_endereco',
          'e.nome_fantasia as empresa_nome',
          'v.nome as vendedor_nome',
          'v.email as vendedor_email',
          'u.nome as criado_por'
        )
        .where('p.id_pipeline', id)
        .first();

      if (!opportunity) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Oportunidade não encontrada'
        });
      }

      // Get pipeline history/stage changes
      const history = await db('vnd_07_historico_pipeline')
        .leftJoin('cad_05_usuarios as u', 'vnd_07_historico_pipeline.id_usuario', 'u.id_usuario')
        .select(
          'vnd_07_historico_pipeline.*',
          'u.nome as usuario_nome'
        )
        .where('id_pipeline', id)
        .orderBy('data_alteracao', 'desc');

      // Get related activities/interactions
      const activities = await db('vnd_08_atividades_pipeline')
        .leftJoin('cad_05_usuarios as u', 'vnd_08_atividades_pipeline.id_usuario', 'u.id_usuario')
        .select(
          'vnd_08_atividades_pipeline.*',
          'u.nome as usuario_nome'
        )
        .where('id_pipeline', id)
        .orderBy('data_atividade', 'desc');

      opportunity.historico = history;
      opportunity.atividades = activities;
      
      // Calculate additional fields
      opportunity.valor_ponderado = opportunity.valor_estimado * (opportunity.probabilidade / 100);
      
      const today = new Date();
      const closeDate = new Date(opportunity.data_fechamento_prevista);
      opportunity.dias_para_fechamento = Math.ceil((closeDate - today) / (1000 * 60 * 60 * 24));
      opportunity.em_atraso = opportunity.dias_para_fechamento < 0;

      res.json({
        success: true,
        data: opportunity
      });

    } catch (error) {
      console.error('Error fetching pipeline opportunity:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar oportunidade do pipeline',
        details: error.message
      });
    }
  }

  // Create new pipeline opportunity
  async create(req, res) {
    const trx = await db.transaction();
    
    try {
      // Validate input
      const validatedData = salesPipelineSchema.parse(req.body);

      // Insert pipeline opportunity
      const [opportunityId] = await trx('vnd_06_pipeline').insert({
        id_cliente: validatedData.id_cliente,
        id_empresa: validatedData.id_empresa,
        id_vendedor: validatedData.id_vendedor,
        id_usuario_criacao: req.user?.id,
        titulo: validatedData.titulo,
        descricao: validatedData.descricao,
        valor_estimado: validatedData.valor_estimado,
        probabilidade: validatedData.probabilidade,
        data_fechamento_prevista: validatedData.data_fechamento_prevista,
        origem_lead: validatedData.origem_lead,
        observacoes: validatedData.observacoes,
        estagio: 'PROSPECCAO',
        data_criacao: new Date(),
        ativo: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id_pipeline');

      // Create history entry
      await trx('vnd_07_historico_pipeline').insert({
        id_pipeline: opportunityId,
        id_usuario: req.user?.id,
        estagio_anterior: null,
        estagio_novo: 'PROSPECCAO',
        observacoes: 'Oportunidade criada',
        data_alteracao: new Date(),
        created_at: new Date()
      });

      await trx.commit();

      // Fetch created opportunity with details
      const createdOpportunity = await this.getOpportunityDetails(opportunityId);

      res.status(201).json({
        success: true,
        data: createdOpportunity,
        message: 'Oportunidade criada com sucesso'
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

      console.error('Error creating pipeline opportunity:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar oportunidade',
        details: error.message
      });
    }
  }

  // Update pipeline opportunity
  async update(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      
      // Validate input
      const validatedData = salesPipelineUpdateSchema.parse(req.body);

      const existingOpportunity = await trx('vnd_06_pipeline')
        .where('id_pipeline', id)
        .first();

      if (!existingOpportunity) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Oportunidade não encontrada'
        });
      }

      // Update opportunity
      await trx('vnd_06_pipeline')
        .where('id_pipeline', id)
        .update({
          ...validatedData,
          updated_at: new Date()
        });

      // If stage changed, create history entry
      if (validatedData.estagio && validatedData.estagio !== existingOpportunity.estagio) {
        await trx('vnd_07_historico_pipeline').insert({
          id_pipeline: id,
          id_usuario: req.user?.id,
          estagio_anterior: existingOpportunity.estagio,
          estagio_novo: validatedData.estagio,
          observacoes: validatedData.observacoes || `Estágio alterado para ${validatedData.estagio}`,
          data_alteracao: new Date(),
          created_at: new Date()
        });
      }

      await trx.commit();

      res.json({
        success: true,
        message: 'Oportunidade atualizada com sucesso'
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

      console.error('Error updating pipeline opportunity:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao atualizar oportunidade',
        details: error.message
      });
    }
  }

  // Move opportunity to next stage
  async moveStage(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { estagio, observacoes } = req.body;

      const validStages = ['PROSPECCAO', 'QUALIFICACAO', 'PROPOSTA', 'NEGOCIACAO', 'FECHAMENTO', 'GANHO', 'PERDIDO'];
      if (!validStages.includes(estagio)) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STAGE',
          message: 'Estágio inválido'
        });
      }

      const existingOpportunity = await trx('vnd_06_pipeline')
        .where('id_pipeline', id)
        .first();

      if (!existingOpportunity) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Oportunidade não encontrada'
        });
      }

      // Update stage and close dates if won/lost
      const updateData = {
        estagio,
        updated_at: new Date()
      };

      if (estagio === 'GANHO' || estagio === 'PERDIDO') {
        updateData.data_fechamento_real = new Date();
        updateData.ativo = false;
      }

      await trx('vnd_06_pipeline')
        .where('id_pipeline', id)
        .update(updateData);

      // Create history entry
      await trx('vnd_07_historico_pipeline').insert({
        id_pipeline: id,
        id_usuario: req.user?.id,
        estagio_anterior: existingOpportunity.estagio,
        estagio_novo: estagio,
        observacoes: observacoes || `Oportunidade movida para ${estagio}`,
        data_alteracao: new Date(),
        created_at: new Date()
      });

      await trx.commit();

      res.json({
        success: true,
        message: `Oportunidade movida para ${estagio}`
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error moving pipeline stage:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao mover estágio da oportunidade',
        details: error.message
      });
    }
  }

  // Add activity to opportunity
  async addActivity(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { tipo_atividade, descricao, data_atividade, duracao_minutos } = req.body;

      const existingOpportunity = await trx('vnd_06_pipeline')
        .where('id_pipeline', id)
        .first();

      if (!existingOpportunity) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Oportunidade não encontrada'
        });
      }

      await trx('vnd_08_atividades_pipeline').insert({
        id_pipeline: id,
        id_usuario: req.user?.id,
        tipo_atividade: tipo_atividade || 'CONTATO',
        descricao,
        data_atividade: data_atividade || new Date(),
        duracao_minutos: duracao_minutos || 0,
        created_at: new Date()
      });

      await trx.commit();

      res.status(201).json({
        success: true,
        message: 'Atividade adicionada com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error adding pipeline activity:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao adicionar atividade',
        details: error.message
      });
    }
  }

  // Get pipeline statistics and metrics
  async getStats(req, res) {
    try {
      // Total opportunities
      const totalOpportunities = await db('vnd_06_pipeline')
        .count('* as count')
        .sum('valor_estimado as valor_total')
        .first();

      // Opportunities by stage
      const opportunitiesByStage = await db('vnd_06_pipeline')
        .select('estagio')
        .count('* as count')
        .sum('valor_estimado as valor_total')
        .groupBy('estagio');

      // Conversion rates
      const conversionRates = await db('vnd_06_pipeline')
        .select('estagio')
        .count('* as total')
        .sum(db.raw('CASE WHEN estagio = ? THEN 1 ELSE 0 END as won'), ['GANHO'])
        .sum(db.raw('CASE WHEN estagio = ? THEN 1 ELSE 0 END as lost'), ['PERDIDO'])
        .groupBy('estagio');

      // This month opportunities
      const thisMonth = await db('vnd_06_pipeline')
        .whereRaw('EXTRACT(MONTH FROM data_criacao) = EXTRACT(MONTH FROM CURRENT_DATE)')
        .whereRaw('EXTRACT(YEAR FROM data_criacao) = EXTRACT(YEAR FROM CURRENT_DATE)')
        .count('* as count')
        .sum('valor_estimado as valor')
        .first();

      // Average deal size
      const avgDealSize = await db('vnd_06_pipeline')
        .avg('valor_estimado as media')
        .first();

      // Top performing salespeople
      const topSalespeople = await db('vnd_06_pipeline as p')
        .leftJoin('cad_05_usuarios as u', 'p.id_vendedor', 'u.id_usuario')
        .select('u.nome as vendedor', 'u.id_usuario')
        .count('p.id_pipeline as total_oportunidades')
        .sum('p.valor_estimado as valor_total')
        .sum(db.raw('CASE WHEN p.estagio = ? THEN 1 ELSE 0 END as ganhas'), ['GANHO'])
        .groupBy('u.id_usuario', 'u.nome')
        .orderBy('valor_total', 'desc')
        .limit(5);

      // Weighted pipeline value
      const weightedValue = await db('vnd_06_pipeline')
        .sum(db.raw('valor_estimado * (probabilidade / 100) as valor_ponderado'))
        .first();

      res.json({
        success: true,
        data: {
          total_oportunidades: parseInt(totalOpportunities.count),
          valor_total_pipeline: parseFloat(totalOpportunities.valor_total) || 0,
          valor_ponderado: parseFloat(weightedValue.valor_ponderado) || 0,
          ticket_medio: parseFloat(avgDealSize.media) || 0,
          oportunidades_mes: parseInt(thisMonth.count),
          valor_oportunidades_mes: parseFloat(thisMonth.valor) || 0,
          por_estagio: opportunitiesByStage.map(s => ({
            estagio: s.estagio,
            quantidade: parseInt(s.count),
            valor_total: parseFloat(s.valor_total)
          })),
          top_vendedores: topSalespeople.map(v => ({
            vendedor: v.vendedor,
            total_oportunidades: parseInt(v.total_oportunidades),
            valor_total: parseFloat(v.valor_total),
            oportunidades_ganhas: parseInt(v.ganhas),
            taxa_conversao: v.total_oportunidades > 0 ? 
              parseFloat((v.ganhas / v.total_oportunidades * 100).toFixed(2)) : 0
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching pipeline stats:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar estatísticas do pipeline',
        details: error.message
      });
    }
  }

  // Helper method to get opportunity details
  async getOpportunityDetails(id) {
    const opportunity = await db('vnd_06_pipeline as p')
      .leftJoin('cad_03_clientes as c', 'p.id_cliente', 'c.id_cliente')
      .leftJoin('cad_01_empresas as e', 'p.id_empresa', 'e.id_empresa')
      .leftJoin('cad_05_usuarios as v', 'p.id_vendedor', 'v.id_usuario')
      .select(
        'p.*',
        'c.nome_razao_social as cliente_nome',
        'e.nome_fantasia as empresa_nome',
        'v.nome as vendedor_nome'
      )
      .where('p.id_pipeline', id)
      .first();

    if (opportunity) {
      opportunity.valor_ponderado = opportunity.valor_estimado * (opportunity.probabilidade / 100);
      
      const today = new Date();
      const closeDate = new Date(opportunity.data_fechamento_prevista);
      opportunity.dias_para_fechamento = Math.ceil((closeDate - today) / (1000 * 60 * 60 * 24));
      opportunity.em_atraso = opportunity.dias_para_fechamento < 0;
    }

    return opportunity;
  }
}

module.exports = new SalesPipelineController();