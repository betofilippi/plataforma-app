const db = require('../../../src/database/connection');
const { z } = require('zod');

// Import History Controller - Comprehensive import operation tracking and monitoring
class ImportHistoryController {
  // Get all import history records with advanced filtering and pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const filters = {
        search: req.query.search || '',
        tipo_importacao: req.query.tipo_importacao || '',
        status: req.query.status || '',
        data_inicial: req.query.data_inicial || '',
        data_final: req.query.data_final || '',
        id_usuario: req.query.id_usuario || '',
        origem_arquivo: req.query.origem_arquivo || ''
      };

      // Base query with joins
      let query = db('imp_10_historico_importacoes as hi')
        .leftJoin('cad_05_usuarios as u', 'hi.id_usuario', 'u.id_usuario')
        .leftJoin('cad_05_usuarios as uu', 'hi.id_usuario_aprovacao', 'uu.id_usuario')
        .select(
          'hi.*',
          'u.nome as usuario_nome',
          'u.email as usuario_email',
          'uu.nome as aprovado_por'
        );

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('hi.nome_arquivo', 'ilike', `%${filters.search}%`)
              .orWhere('hi.descricao_importacao', 'ilike', `%${filters.search}%`)
              .orWhere('u.nome', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.tipo_importacao) {
        query = query.where('hi.tipo_importacao', filters.tipo_importacao);
      }

      if (filters.status) {
        query = query.where('hi.status', filters.status);
      }

      if (filters.data_inicial && filters.data_final) {
        query = query.whereBetween('hi.data_inicio', [filters.data_inicial, filters.data_final]);
      } else if (filters.data_inicial) {
        query = query.where('hi.data_inicio', '>=', filters.data_inicial);
      } else if (filters.data_final) {
        query = query.where('hi.data_inicio', '<=', filters.data_final);
      }

      if (filters.id_usuario) {
        query = query.where('hi.id_usuario', filters.id_usuario);
      }

      if (filters.origem_arquivo) {
        query = query.where('hi.origem_arquivo', filters.origem_arquivo);
      }

      // Count total records
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting and pagination
      const sortField = req.query.sort || 'data_inicio';
      const sortOrder = req.query.order || 'desc';
      query = query.orderBy(`hi.${sortField}`, sortOrder);

      const imports = await query.limit(limit).offset(offset);

      // Add detailed information for each import
      for (let importRecord of imports) {
        // Get validation summary if exists
        if (importRecord.id_validacao) {
          const validationSummary = await db('imp_04_historico_validacoes')
            .select('total_registros', 'registros_validos', 'registros_invalidos', 'taxa_validacao')
            .where('id_validacao', importRecord.id_validacao)
            .first();
          
          importRecord.resumo_validacao = validationSummary;
        }

        // Get transformation workflow info if exists
        if (importRecord.id_workflow_transformacao) {
          const workflowInfo = await db('imp_06_workflows_transformacao')
            .select('nome_workflow', 'categoria')
            .where('id_workflow', importRecord.id_workflow_transformacao)
            .first();
          
          importRecord.workflow_usado = workflowInfo;
        }

        // Get error count
        const errorCount = await db('imp_11_erros_importacao')
          .where('id_importacao', importRecord.id_importacao)
          .count('* as count')
          .first();
        
        importRecord.total_erros = parseInt(errorCount.count);

        // Calculate duration if finished
        if (importRecord.data_fim) {
          const duration = new Date(importRecord.data_fim) - new Date(importRecord.data_inicio);
          importRecord.duracao_segundos = Math.round(duration / 1000);
          importRecord.duracao_formatada = this.formatDuration(duration);
        }

        // Get processing rate
        if (importRecord.total_registros > 0 && importRecord.data_fim) {
          const duration = new Date(importRecord.data_fim) - new Date(importRecord.data_inicio);
          const seconds = duration / 1000;
          importRecord.taxa_processamento = Math.round((importRecord.total_registros / seconds) * 100) / 100; // records per second
        }
      }

      res.json({
        success: true,
        data: imports,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        },
        filters
      });

    } catch (error) {
      console.error('Error fetching import history:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar histórico de importações',
        details: error.message
      });
    }
  }

  // Get import history by ID with complete details
  async getById(req, res) {
    try {
      const { id } = req.params;

      // Get main import data
      const importRecord = await db('imp_10_historico_importacoes as hi')
        .leftJoin('cad_05_usuarios as u', 'hi.id_usuario', 'u.id_usuario')
        .leftJoin('cad_05_usuarios as uu', 'hi.id_usuario_aprovacao', 'uu.id_usuario')
        .select(
          'hi.*',
          'u.nome as usuario_nome',
          'u.email as usuario_email',
          'uu.nome as aprovado_por'
        )
        .where('hi.id_importacao', id)
        .first();

      if (!importRecord) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Histórico de importação não encontrado'
        });
      }

      // Get validation details
      if (importRecord.id_validacao) {
        importRecord.detalhes_validacao = await db('imp_04_historico_validacoes')
          .where('id_validacao', importRecord.id_validacao)
          .first();
        
        // Get validation errors summary
        importRecord.erros_validacao = await db('imp_05_detalhes_validacao')
          .where('id_validacao', importRecord.id_validacao)
          .where('valido', false)
          .select('campo', 'tipo_erro', 'mensagem_erro')
          .count('* as frequency')
          .groupBy('campo', 'tipo_erro', 'mensagem_erro')
          .orderBy('frequency', 'desc')
          .limit(10);
      }

      // Get transformation workflow execution details
      if (importRecord.id_workflow_transformacao) {
        importRecord.detalhes_workflow = await db('imp_06_workflows_transformacao')
          .where('id_workflow', importRecord.id_workflow_transformacao)
          .first();

        // Get workflow execution steps
        importRecord.execucoes_workflow = await db('imp_08_execucoes_workflow')
          .where('id_workflow', importRecord.id_workflow_transformacao)
          .orderBy('data_execucao', 'desc')
          .limit(5);
      }

      // Get import errors
      importRecord.erros_importacao = await db('imp_11_erros_importacao as ei')
        .leftJoin('cad_05_usuarios as u', 'ei.id_usuario_resolucao', 'u.id_usuario')
        .select(
          'ei.*',
          'u.nome as resolvido_por'
        )
        .where('ei.id_importacao', id)
        .orderBy('ei.numero_linha');

      // Get import events/timeline
      importRecord.timeline_eventos = await db('imp_12_eventos_importacao as ei')
        .leftJoin('cad_05_usuarios as u', 'ei.id_usuario', 'u.id_usuario')
        .select(
          'ei.*',
          'u.nome as usuario_nome'
        )
        .where('ei.id_importacao', id)
        .orderBy('ei.data_evento', 'desc');

      // Parse JSON fields
      if (importRecord.configuracao_importacao) {
        importRecord.configuracao_importacao = JSON.parse(importRecord.configuracao_importacao);
      }
      if (importRecord.resultado_importacao) {
        importRecord.resultado_importacao = JSON.parse(importRecord.resultado_importacao);
      }
      if (importRecord.metadados_arquivo) {
        importRecord.metadados_arquivo = JSON.parse(importRecord.metadados_arquivo);
      }

      // Calculate metrics
      if (importRecord.data_fim) {
        const duration = new Date(importRecord.data_fim) - new Date(importRecord.data_inicio);
        importRecord.duracao_segundos = Math.round(duration / 1000);
        importRecord.duracao_formatada = this.formatDuration(duration);
        
        if (importRecord.total_registros > 0) {
          const seconds = duration / 1000;
          importRecord.taxa_processamento = Math.round((importRecord.total_registros / seconds) * 100) / 100;
        }
      }

      res.json({
        success: true,
        data: importRecord
      });

    } catch (error) {
      console.error('Error fetching import history by ID:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar histórico de importação',
        details: error.message
      });
    }
  }

  // Create new import history record
  async create(req, res) {
    const trx = await db.transaction();
    
    try {
      const validatedData = z.object({
        tipo_importacao: z.string(),
        nome_arquivo: z.string(),
        origem_arquivo: z.enum(['UPLOAD', 'FTP', 'API', 'EMAIL', 'MANUAL']),
        tamanho_arquivo: z.number().optional(),
        total_registros: z.number(),
        descricao_importacao: z.string().optional(),
        configuracao_importacao: z.object({}).optional(),
        metadados_arquivo: z.object({}).optional(),
        id_validacao: z.number().optional(),
        id_workflow_transformacao: z.number().optional(),
        requer_aprovacao: z.boolean().default(false)
      }).parse(req.body);

      const importData = {
        ...validatedData,
        status: validatedData.requer_aprovacao ? 'AGUARDANDO_APROVACAO' : 'PROCESSANDO',
        configuracao_importacao: JSON.stringify(validatedData.configuracao_importacao || {}),
        metadados_arquivo: JSON.stringify(validatedData.metadados_arquivo || {}),
        id_usuario: req.user?.id,
        data_inicio: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const [importId] = await trx('imp_10_historico_importacoes')
        .insert(importData)
        .returning('id_importacao');

      // Create initial event
      await trx('imp_12_eventos_importacao').insert({
        id_importacao: importId,
        tipo_evento: 'INICIO',
        descricao: 'Importação iniciada',
        data_evento: new Date(),
        id_usuario: req.user?.id,
        detalhes_evento: JSON.stringify({
          origem: validatedData.origem_arquivo,
          arquivo: validatedData.nome_arquivo,
          total_registros: validatedData.total_registros
        })
      });

      await trx.commit();

      res.status(201).json({
        success: true,
        data: { id_importacao: importId },
        message: 'Histórico de importação criado com sucesso'
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

      console.error('Error creating import history:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar histórico de importação',
        details: error.message
      });
    }
  }

  // Update import status
  async updateStatus(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { status, observacoes, resultado_importacao } = req.body;

      const validStatuses = [
        'AGUARDANDO_APROVACAO', 'PROCESSANDO', 'VALIDANDO', 'TRANSFORMANDO',
        'IMPORTANDO', 'CONCLUIDA', 'ERRO', 'CANCELADA', 'APROVADA', 'REJEITADA'
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Status inválido'
        });
      }

      const importRecord = await trx('imp_10_historico_importacoes')
        .where('id_importacao', id)
        .first();

      if (!importRecord) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Histórico de importação não encontrado'
        });
      }

      // Update import record
      const updateData = {
        status,
        observacoes,
        updated_at: new Date()
      };

      if (resultado_importacao) {
        updateData.resultado_importacao = JSON.stringify(resultado_importacao);
      }

      // Set completion date for final statuses
      if (['CONCLUIDA', 'ERRO', 'CANCELADA'].includes(status)) {
        updateData.data_fim = new Date();
      }

      // Set approval information
      if (['APROVADA', 'REJEITADA'].includes(status)) {
        updateData.id_usuario_aprovacao = req.user?.id;
        updateData.data_aprovacao = new Date();
      }

      await trx('imp_10_historico_importacoes')
        .where('id_importacao', id)
        .update(updateData);

      // Create status change event
      await trx('imp_12_eventos_importacao').insert({
        id_importacao: id,
        tipo_evento: 'MUDANCA_STATUS',
        descricao: `Status alterado para: ${status}`,
        data_evento: new Date(),
        id_usuario: req.user?.id,
        detalhes_evento: JSON.stringify({
          status_anterior: importRecord.status,
          status_novo: status,
          observacoes: observacoes
        })
      });

      await trx.commit();

      res.json({
        success: true,
        message: 'Status da importação atualizado com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error updating import status:', error);
      res.status(500).json({
        success: false,
        error: 'UPDATE_ERROR',
        message: 'Erro ao atualizar status da importação',
        details: error.message
      });
    }
  }

  // Add import event
  async addEvent(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const validatedData = z.object({
        tipo_evento: z.enum(['INICIO', 'VALIDACAO', 'TRANSFORMACAO', 'IMPORTACAO', 'ERRO', 'AVISO', 'MUDANCA_STATUS', 'APROVACAO', 'CANCELAMENTO']),
        descricao: z.string(),
        detalhes_evento: z.object({}).optional(),
        nivel_importancia: z.enum(['BAIXO', 'MEDIO', 'ALTO', 'CRITICO']).default('MEDIO')
      }).parse(req.body);

      // Check if import exists
      const importRecord = await trx('imp_10_historico_importacoes')
        .where('id_importacao', id)
        .first();

      if (!importRecord) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Histórico de importação não encontrado'
        });
      }

      // Create event
      await trx('imp_12_eventos_importacao').insert({
        id_importacao: id,
        tipo_evento: validatedData.tipo_evento,
        descricao: validatedData.descricao,
        nivel_importancia: validatedData.nivel_importancia,
        detalhes_evento: JSON.stringify(validatedData.detalhes_evento || {}),
        data_evento: new Date(),
        id_usuario: req.user?.id
      });

      await trx.commit();

      res.status(201).json({
        success: true,
        message: 'Evento adicionado com sucesso'
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

      console.error('Error adding import event:', error);
      res.status(500).json({
        success: false,
        error: 'EVENT_ERROR',
        message: 'Erro ao adicionar evento',
        details: error.message
      });
    }
  }

  // Get import statistics
  async getStats(req, res) {
    try {
      const filters = {
        periodo: req.query.periodo || '30', // days
        tipo_importacao: req.query.tipo_importacao || '',
        id_usuario: req.query.id_usuario || ''
      };

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - parseInt(filters.periodo));

      let baseQuery = db('imp_10_historico_importacoes');
      
      if (filters.tipo_importacao) {
        baseQuery = baseQuery.where('tipo_importacao', filters.tipo_importacao);
      }

      if (filters.id_usuario) {
        baseQuery = baseQuery.where('id_usuario', filters.id_usuario);
      }

      // Total imports
      const totalImports = await baseQuery.clone()
        .count('* as count')
        .first();

      // Imports in period
      const importsInPeriod = await baseQuery.clone()
        .where('data_inicio', '>=', dateFrom)
        .count('* as count')
        .first();

      // Imports by status
      const importsByStatus = await baseQuery.clone()
        .select('status')
        .count('* as count')
        .groupBy('status');

      // Imports by type
      const importsByType = await baseQuery.clone()
        .select('tipo_importacao')
        .count('* as count')
        .sum('total_registros as total_records')
        .avg('total_registros as avg_records')
        .groupBy('tipo_importacao');

      // Success rate
      const successfulImports = await baseQuery.clone()
        .where('status', 'CONCLUIDA')
        .count('* as count')
        .first();

      const errorImports = await baseQuery.clone()
        .where('status', 'ERRO')
        .count('* as count')
        .first();

      const totalFinished = parseInt(successfulImports.count) + parseInt(errorImports.count);
      const successRate = totalFinished > 0 ? 
        Math.round((parseInt(successfulImports.count) / totalFinished) * 100 * 100) / 100 : 0;

      // Average processing time
      const avgProcessingTime = await baseQuery.clone()
        .whereNotNull('data_fim')
        .select(db.raw('AVG(EXTRACT(EPOCH FROM (data_fim - data_inicio))) as avg_seconds'))
        .first();

      // Top error types
      const topErrors = await db('imp_11_erros_importacao as ei')
        .join('imp_10_historico_importacoes as hi', 'ei.id_importacao', 'hi.id_importacao')
        .select('ei.tipo_erro', 'ei.mensagem_erro')
        .count('* as frequency')
        .where('hi.data_inicio', '>=', dateFrom)
        .groupBy('ei.tipo_erro', 'ei.mensagem_erro')
        .orderBy('frequency', 'desc')
        .limit(10);

      // Records processing trends
      const processingTrends = await baseQuery.clone()
        .where('data_inicio', '>=', dateFrom)
        .select(db.raw('DATE(data_inicio) as data'))
        .count('* as importacoes')
        .sum('total_registros as registros')
        .groupBy(db.raw('DATE(data_inicio)'))
        .orderBy('data');

      res.json({
        success: true,
        data: {
          total_importacoes: parseInt(totalImports.count),
          importacoes_periodo: parseInt(importsInPeriod.count),
          taxa_sucesso: successRate,
          tempo_medio_processamento: parseFloat(avgProcessingTime.avg_seconds) || 0,
          por_status: importsByStatus.map(s => ({
            status: s.status,
            quantidade: parseInt(s.count)
          })),
          por_tipo: importsByType.map(t => ({
            tipo: t.tipo_importacao,
            quantidade: parseInt(t.count),
            total_registros: parseInt(t.total_records),
            media_registros: Math.round(parseFloat(t.avg_records))
          })),
          principais_erros: topErrors.map(e => ({
            tipo: e.tipo_erro,
            mensagem: e.mensagem_erro,
            frequencia: parseInt(e.frequency)
          })),
          tendencia_processamento: processingTrends.map(t => ({
            data: t.data,
            importacoes: parseInt(t.importacoes),
            registros: parseInt(t.registros)
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching import stats:', error);
      res.status(500).json({
        success: false,
        error: 'STATS_ERROR',
        message: 'Erro ao buscar estatísticas de importação',
        details: error.message
      });
    }
  }

  // Get import timeline
  async getTimeline(req, res) {
    try {
      const { id } = req.params;

      const timeline = await db('imp_12_eventos_importacao as ei')
        .leftJoin('cad_05_usuarios as u', 'ei.id_usuario', 'u.id_usuario')
        .select(
          'ei.*',
          'u.nome as usuario_nome',
          'u.email as usuario_email'
        )
        .where('ei.id_importacao', id)
        .orderBy('ei.data_evento', 'desc');

      // Parse JSON details
      timeline.forEach(event => {
        if (event.detalhes_evento) {
          event.detalhes_evento = JSON.parse(event.detalhes_evento);
        }
      });

      res.json({
        success: true,
        data: timeline
      });

    } catch (error) {
      console.error('Error fetching import timeline:', error);
      res.status(500).json({
        success: false,
        error: 'TIMELINE_ERROR',
        message: 'Erro ao buscar timeline da importação',
        details: error.message
      });
    }
  }

  // Cancel import
  async cancel(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { motivo_cancelamento } = req.body;

      if (!motivo_cancelamento || motivo_cancelamento.length < 5) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Motivo de cancelamento deve ter pelo menos 5 caracteres'
        });
      }

      const importRecord = await trx('imp_10_historico_importacoes')
        .where('id_importacao', id)
        .first();

      if (!importRecord) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Histórico de importação não encontrado'
        });
      }

      // Check if import can be cancelled
      const cancellableStatuses = ['AGUARDANDO_APROVACAO', 'PROCESSANDO', 'VALIDANDO'];
      if (!cancellableStatuses.includes(importRecord.status)) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Importação não pode ser cancelada no status atual'
        });
      }

      // Update import status
      await trx('imp_10_historico_importacoes')
        .where('id_importacao', id)
        .update({
          status: 'CANCELADA',
          observacoes: motivo_cancelamento,
          data_fim: new Date(),
          updated_at: new Date()
        });

      // Add cancellation event
      await trx('imp_12_eventos_importacao').insert({
        id_importacao: id,
        tipo_evento: 'CANCELAMENTO',
        descricao: 'Importação cancelada',
        nivel_importancia: 'ALTO',
        detalhes_evento: JSON.stringify({
          motivo: motivo_cancelamento,
          status_anterior: importRecord.status
        }),
        data_evento: new Date(),
        id_usuario: req.user?.id
      });

      await trx.commit();

      res.json({
        success: true,
        message: 'Importação cancelada com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error cancelling import:', error);
      res.status(500).json({
        success: false,
        error: 'CANCEL_ERROR',
        message: 'Erro ao cancelar importação',
        details: error.message
      });
    }
  }

  // Get comparison between imports
  async compare(req, res) {
    try {
      const { ids } = req.body; // Array of import IDs

      if (!ids || !Array.isArray(ids) || ids.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'É necessário informar pelo menos 2 IDs de importação'
        });
      }

      const imports = await db('imp_10_historico_importacoes as hi')
        .leftJoin('cad_05_usuarios as u', 'hi.id_usuario', 'u.id_usuario')
        .select(
          'hi.*',
          'u.nome as usuario_nome'
        )
        .whereIn('hi.id_importacao', ids)
        .orderBy('hi.data_inicio');

      if (imports.length !== ids.length) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Algumas importações não foram encontradas'
        });
      }

      // Calculate metrics for comparison
      const comparison = imports.map(imp => {
        const duration = imp.data_fim ? 
          new Date(imp.data_fim) - new Date(imp.data_inicio) : null;
        
        return {
          id_importacao: imp.id_importacao,
          nome_arquivo: imp.nome_arquivo,
          tipo_importacao: imp.tipo_importacao,
          status: imp.status,
          usuario_nome: imp.usuario_nome,
          data_inicio: imp.data_inicio,
          data_fim: imp.data_fim,
          total_registros: imp.total_registros,
          registros_processados: imp.registros_processados,
          registros_erro: imp.registros_erro,
          duracao_segundos: duration ? Math.round(duration / 1000) : null,
          taxa_processamento: duration && imp.total_registros > 0 ? 
            Math.round((imp.total_registros / (duration / 1000)) * 100) / 100 : null,
          taxa_sucesso: imp.total_registros > 0 ? 
            Math.round(((imp.registros_processados || 0) / imp.total_registros) * 100 * 100) / 100 : 0
        };
      });

      // Calculate comparative statistics
      const stats = {
        media_registros: Math.round(comparison.reduce((sum, imp) => sum + imp.total_registros, 0) / comparison.length),
        media_duracao: Math.round(comparison.filter(imp => imp.duracao_segundos).reduce((sum, imp) => sum + imp.duracao_segundos, 0) / comparison.filter(imp => imp.duracao_segundos).length),
        melhor_taxa_sucesso: Math.max(...comparison.map(imp => imp.taxa_sucesso)),
        pior_taxa_sucesso: Math.min(...comparison.map(imp => imp.taxa_sucesso))
      };

      res.json({
        success: true,
        data: {
          importacoes: comparison,
          estatisticas_comparativas: stats
        }
      });

    } catch (error) {
      console.error('Error comparing imports:', error);
      res.status(500).json({
        success: false,
        error: 'COMPARISON_ERROR',
        message: 'Erro ao comparar importações',
        details: error.message
      });
    }
  }

  // Helper methods
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

module.exports = new ImportHistoryController();