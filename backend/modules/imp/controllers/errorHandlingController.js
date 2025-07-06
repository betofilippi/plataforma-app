const db = require('../../../src/database/connection');
const { z } = require('zod');

// Error Handling Controller - Comprehensive error handling and reporting for import operations
class ErrorHandlingController {
  // Get all import errors with advanced filtering and pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const filters = {
        search: req.query.search || '',
        tipo_erro: req.query.tipo_erro || '',
        nivel_criticidade: req.query.nivel_criticidade || '',
        status: req.query.status || '',
        id_importacao: req.query.id_importacao || '',
        data_inicial: req.query.data_inicial || '',
        data_final: req.query.data_final || '',
        resolvido: req.query.resolvido || ''
      };

      // Base query with joins
      let query = db('imp_11_erros_importacao as ei')
        .leftJoin('imp_10_historico_importacoes as hi', 'ei.id_importacao', 'hi.id_importacao')
        .leftJoin('cad_05_usuarios as u', 'ei.id_usuario_resolucao', 'u.id_usuario')
        .leftJoin('cad_05_usuarios as uu', 'hi.id_usuario', 'uu.id_usuario')
        .select(
          'ei.*',
          'hi.nome_arquivo',
          'hi.tipo_importacao',
          'hi.status as status_importacao',
          'u.nome as resolvido_por',
          'uu.nome as importado_por'
        );

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('ei.mensagem_erro', 'ilike', `%${filters.search}%`)
              .orWhere('ei.detalhes_erro', 'ilike', `%${filters.search}%`)
              .orWhere('hi.nome_arquivo', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.tipo_erro) {
        query = query.where('ei.tipo_erro', filters.tipo_erro);
      }

      if (filters.nivel_criticidade) {
        query = query.where('ei.nivel_criticidade', filters.nivel_criticidade);
      }

      if (filters.status) {
        query = query.where('ei.status', filters.status);
      }

      if (filters.id_importacao) {
        query = query.where('ei.id_importacao', filters.id_importacao);
      }

      if (filters.data_inicial && filters.data_final) {
        query = query.whereBetween('ei.data_erro', [filters.data_inicial, filters.data_final]);
      } else if (filters.data_inicial) {
        query = query.where('ei.data_erro', '>=', filters.data_inicial);
      } else if (filters.data_final) {
        query = query.where('ei.data_erro', '<=', filters.data_final);
      }

      if (filters.resolvido === 'true') {
        query = query.where('ei.resolvido', true);
      } else if (filters.resolvido === 'false') {
        query = query.where('ei.resolvido', false);
      }

      // Count total records
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting and pagination
      const sortField = req.query.sort || 'data_erro';
      const sortOrder = req.query.order || 'desc';
      query = query.orderBy(`ei.${sortField}`, sortOrder);

      const errors = await query.limit(limit).offset(offset);

      // Add additional context for each error
      for (let error of errors) {
        // Parse JSON fields
        if (error.detalhes_erro) {
          try {
            error.detalhes_erro = JSON.parse(error.detalhes_erro);
          } catch (e) {
            // Keep as string if not valid JSON
          }
        }

        if (error.contexto_erro) {
          try {
            error.contexto_erro = JSON.parse(error.contexto_erro);
          } catch (e) {
            // Keep as string if not valid JSON
          }
        }

        // Get similar errors count
        const similarErrorsCount = await db('imp_11_erros_importacao')
          .where('tipo_erro', error.tipo_erro)
          .where('mensagem_erro', error.mensagem_erro)
          .where('resolvido', false)
          .count('* as count')
          .first();

        error.erros_similares = parseInt(similarErrorsCount.count) - 1; // Exclude current error

        // Calculate resolution time if resolved
        if (error.resolvido && error.data_resolucao) {
          const resolutionTime = new Date(error.data_resolucao) - new Date(error.data_erro);
          error.tempo_resolucao = Math.round(resolutionTime / (1000 * 60)); // minutes
        }
      }

      res.json({
        success: true,
        data: errors,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        },
        filters
      });

    } catch (error) {
      console.error('Error fetching import errors:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar erros de importação',
        details: error.message
      });
    }
  }

  // Get error by ID with complete details
  async getById(req, res) {
    try {
      const { id } = req.params;

      const error = await db('imp_11_erros_importacao as ei')
        .leftJoin('imp_10_historico_importacoes as hi', 'ei.id_importacao', 'hi.id_importacao')
        .leftJoin('cad_05_usuarios as u', 'ei.id_usuario_resolucao', 'u.id_usuario')
        .leftJoin('cad_05_usuarios as uu', 'hi.id_usuario', 'uu.id_usuario')
        .select(
          'ei.*',
          'hi.nome_arquivo',
          'hi.tipo_importacao',
          'hi.status as status_importacao',
          'hi.data_inicio as data_inicio_importacao',
          'u.nome as resolvido_por',
          'u.email as email_resolvido_por',
          'uu.nome as importado_por'
        )
        .where('ei.id_erro', id)
        .first();

      if (!error) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Erro de importação não encontrado'
        });
      }

      // Parse JSON fields
      if (error.detalhes_erro) {
        try {
          error.detalhes_erro = JSON.parse(error.detalhes_erro);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }

      if (error.contexto_erro) {
        try {
          error.contexto_erro = JSON.parse(error.contexto_erro);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }

      // Get similar errors
      error.erros_similares = await db('imp_11_erros_importacao')
        .where('tipo_erro', error.tipo_erro)
        .where('mensagem_erro', error.mensagem_erro)
        .where('id_erro', '!=', id)
        .orderBy('data_erro', 'desc')
        .limit(5);

      // Get error resolution history
      error.historico_resolucao = await db('imp_14_historico_resolucao_erros as hre')
        .leftJoin('cad_05_usuarios as u', 'hre.id_usuario', 'u.id_usuario')
        .select(
          'hre.*',
          'u.nome as usuario_nome'
        )
        .where('hre.id_erro', id)
        .orderBy('hre.data_acao', 'desc');

      // Get affected data sample if available
      if (error.numero_linha) {
        error.dados_afetados = await this.getAffectedDataSample(error.id_importacao, error.numero_linha);
      }

      res.json({
        success: true,
        data: error
      });

    } catch (error) {
      console.error('Error fetching error by ID:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar detalhes do erro',
        details: error.message
      });
    }
  }

  // Create new error record
  async create(req, res) {
    const trx = await db.transaction();
    
    try {
      const validatedData = z.object({
        id_importacao: z.number(),
        tipo_erro: z.enum(['VALIDACAO', 'TRANSFORMACAO', 'PROCESSAMENTO', 'SISTEMA', 'DADOS', 'CONFIGURACAO']),
        nivel_criticidade: z.enum(['BAIXO', 'MEDIO', 'ALTO', 'CRITICO']),
        mensagem_erro: z.string(),
        detalhes_erro: z.object({}).optional(),
        contexto_erro: z.object({}).optional(),
        numero_linha: z.number().optional(),
        campo_erro: z.string().optional(),
        valor_erro: z.string().optional(),
        sugestao_correcao: z.string().optional(),
        codigo_erro: z.string().optional()
      }).parse(req.body);

      const errorData = {
        ...validatedData,
        detalhes_erro: JSON.stringify(validatedData.detalhes_erro || {}),
        contexto_erro: JSON.stringify(validatedData.contexto_erro || {}),
        status: 'NOVO',
        resolvido: false,
        data_erro: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const [errorId] = await trx('imp_11_erros_importacao')
        .insert(errorData)
        .returning('id_erro');

      // Create initial resolution history entry
      await trx('imp_14_historico_resolucao_erros').insert({
        id_erro: errorId,
        acao: 'CRIACAO',
        descricao: 'Erro registrado no sistema',
        data_acao: new Date(),
        id_usuario: req.user?.id
      });

      // Auto-assign based on error type and criticality
      if (validatedData.nivel_criticidade === 'CRITICO') {
        await this.autoAssignCriticalError(errorId, validatedData, trx);
      }

      await trx.commit();

      res.status(201).json({
        success: true,
        data: { id_erro: errorId },
        message: 'Erro registrado com sucesso'
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

      console.error('Error creating error record:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao registrar erro de importação',
        details: error.message
      });
    }
  }

  // Update error status and resolution
  async updateStatus(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { 
        status, 
        observacoes_resolucao, 
        solucao_aplicada,
        tempo_resolucao,
        resolvido 
      } = req.body;

      const validStatuses = ['NOVO', 'EM_ANALISE', 'EM_RESOLUCAO', 'RESOLVIDO', 'CANCELADO', 'REABERTO'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Status inválido'
        });
      }

      const existingError = await trx('imp_11_erros_importacao')
        .where('id_erro', id)
        .first();

      if (!existingError) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Erro não encontrado'
        });
      }

      // Update error record
      const updateData = {
        updated_at: new Date()
      };

      if (status) updateData.status = status;
      if (observacoes_resolucao) updateData.observacoes_resolucao = observacoes_resolucao;
      if (solucao_aplicada) updateData.solucao_aplicada = solucao_aplicada;
      if (tempo_resolucao) updateData.tempo_resolucao = tempo_resolucao;

      if (resolvido !== undefined) {
        updateData.resolvido = resolvido;
        if (resolvido) {
          updateData.data_resolucao = new Date();
          updateData.id_usuario_resolucao = req.user?.id;
          updateData.status = 'RESOLVIDO';
        }
      }

      await trx('imp_11_erros_importacao')
        .where('id_erro', id)
        .update(updateData);

      // Log resolution action
      await trx('imp_14_historico_resolucao_erros').insert({
        id_erro: id,
        acao: resolvido ? 'RESOLUCAO' : 'ATUALIZACAO',
        descricao: resolvido ? 'Erro resolvido' : `Status atualizado para: ${status}`,
        detalhes_acao: JSON.stringify({
          status_anterior: existingError.status,
          status_novo: status,
          observacoes: observacoes_resolucao
        }),
        data_acao: new Date(),
        id_usuario: req.user?.id
      });

      await trx.commit();

      res.json({
        success: true,
        message: 'Status do erro atualizado com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error updating error status:', error);
      res.status(500).json({
        success: false,
        error: 'UPDATE_ERROR',
        message: 'Erro ao atualizar status do erro',
        details: error.message
      });
    }
  }

  // Bulk resolve similar errors
  async bulkResolve(req, res) {
    const trx = await db.transaction();
    
    try {
      const { 
        tipo_erro, 
        mensagem_erro, 
        solucao_aplicada,
        observacoes_resolucao 
      } = req.body;

      if (!tipo_erro || !mensagem_erro || !solucao_aplicada) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Tipo de erro, mensagem e solução são obrigatórios'
        });
      }

      // Find all similar unresolved errors
      const similarErrors = await trx('imp_11_erros_importacao')
        .where('tipo_erro', tipo_erro)
        .where('mensagem_erro', mensagem_erro)
        .where('resolvido', false);

      if (similarErrors.length === 0) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Nenhum erro similar encontrado'
        });
      }

      // Update all similar errors
      const errorIds = similarErrors.map(error => error.id_erro);
      
      await trx('imp_11_erros_importacao')
        .whereIn('id_erro', errorIds)
        .update({
          status: 'RESOLVIDO',
          resolvido: true,
          data_resolucao: new Date(),
          id_usuario_resolucao: req.user?.id,
          solucao_aplicada: solucao_aplicada,
          observacoes_resolucao: observacoes_resolucao,
          updated_at: new Date()
        });

      // Log bulk resolution
      for (const errorId of errorIds) {
        await trx('imp_14_historico_resolucao_erros').insert({
          id_erro: errorId,
          acao: 'RESOLUCAO_LOTE',
          descricao: 'Erro resolvido em lote',
          detalhes_acao: JSON.stringify({
            solucao: solucao_aplicada,
            observacoes: observacoes_resolucao,
            total_erros_resolvidos: errorIds.length
          }),
          data_acao: new Date(),
          id_usuario: req.user?.id
        });
      }

      await trx.commit();

      res.json({
        success: true,
        data: { 
          erros_resolvidos: errorIds.length,
          ids_resolvidos: errorIds
        },
        message: `${errorIds.length} erros similares resolvidos com sucesso`
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error bulk resolving errors:', error);
      res.status(500).json({
        success: false,
        error: 'BULK_RESOLVE_ERROR',
        message: 'Erro ao resolver erros em lote',
        details: error.message
      });
    }
  }

  // Get error statistics and analysis
  async getStats(req, res) {
    try {
      const filters = {
        periodo: req.query.periodo || '30', // days
        id_importacao: req.query.id_importacao || '',
        tipo_importacao: req.query.tipo_importacao || ''
      };

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - parseInt(filters.periodo));

      let baseQuery = db('imp_11_erros_importacao as ei')
        .leftJoin('imp_10_historico_importacoes as hi', 'ei.id_importacao', 'hi.id_importacao');

      if (filters.id_importacao) {
        baseQuery = baseQuery.where('ei.id_importacao', filters.id_importacao);
      }

      if (filters.tipo_importacao) {
        baseQuery = baseQuery.where('hi.tipo_importacao', filters.tipo_importacao);
      }

      // Total errors
      const totalErrors = await baseQuery.clone()
        .count('* as count')
        .first();

      // Errors in period
      const errorsInPeriod = await baseQuery.clone()
        .where('ei.data_erro', '>=', dateFrom)
        .count('* as count')
        .first();

      // Errors by type
      const errorsByType = await baseQuery.clone()
        .select('ei.tipo_erro')
        .count('* as count')
        .groupBy('ei.tipo_erro');

      // Errors by criticality
      const errorsByCriticality = await baseQuery.clone()
        .select('ei.nivel_criticidade')
        .count('* as count')
        .groupBy('ei.nivel_criticidade');

      // Resolution rate
      const resolvedErrors = await baseQuery.clone()
        .where('ei.resolvido', true)
        .count('* as count')
        .first();

      const resolutionRate = parseInt(totalErrors.count) > 0 ? 
        Math.round((parseInt(resolvedErrors.count) / parseInt(totalErrors.count)) * 100 * 100) / 100 : 0;

      // Average resolution time
      const avgResolutionTime = await baseQuery.clone()
        .where('ei.resolvido', true)
        .whereNotNull('ei.tempo_resolucao')
        .avg('ei.tempo_resolucao as avg_time')
        .first();

      // Top error messages
      const topErrorMessages = await baseQuery.clone()
        .select('ei.tipo_erro', 'ei.mensagem_erro')
        .count('* as frequency')
        .where('ei.data_erro', '>=', dateFrom)
        .groupBy('ei.tipo_erro', 'ei.mensagem_erro')
        .orderBy('frequency', 'desc')
        .limit(10);

      // Error trends by day
      const errorTrends = await baseQuery.clone()
        .where('ei.data_erro', '>=', dateFrom)
        .select(db.raw('DATE(ei.data_erro) as data'))
        .count('* as erros')
        .groupBy(db.raw('DATE(ei.data_erro)'))
        .orderBy('data');

      // Most problematic imports
      const problematicImports = await baseQuery.clone()
        .select('hi.nome_arquivo', 'hi.tipo_importacao')
        .count('* as total_erros')
        .groupBy('hi.id_importacao', 'hi.nome_arquivo', 'hi.tipo_importacao')
        .orderBy('total_erros', 'desc')
        .limit(5);

      res.json({
        success: true,
        data: {
          total_erros: parseInt(totalErrors.count),
          erros_periodo: parseInt(errorsInPeriod.count),
          taxa_resolucao: resolutionRate,
          tempo_medio_resolucao: parseFloat(avgResolutionTime.avg_time) || 0,
          por_tipo: errorsByType.map(e => ({
            tipo: e.tipo_erro,
            quantidade: parseInt(e.count)
          })),
          por_criticidade: errorsByCriticality.map(e => ({
            criticidade: e.nivel_criticidade,
            quantidade: parseInt(e.count)
          })),
          principais_mensagens: topErrorMessages.map(e => ({
            tipo: e.tipo_erro,
            mensagem: e.mensagem_erro,
            frequencia: parseInt(e.frequency)
          })),
          tendencia_erros: errorTrends.map(e => ({
            data: e.data,
            erros: parseInt(e.erros)
          })),
          importacoes_problematicas: problematicImports.map(i => ({
            nome_arquivo: i.nome_arquivo,
            tipo_importacao: i.tipo_importacao,
            total_erros: parseInt(i.total_erros)
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching error stats:', error);
      res.status(500).json({
        success: false,
        error: 'STATS_ERROR',
        message: 'Erro ao buscar estatísticas de erros',
        details: error.message
      });
    }
  }

  // Generate error report
  async generateReport(req, res) {
    try {
      const filters = {
        data_inicial: req.query.data_inicial || '',
        data_final: req.query.data_final || '',
        tipo_erro: req.query.tipo_erro || '',
        nivel_criticidade: req.query.nivel_criticidade || '',
        formato: req.query.formato || 'json'
      };

      if (!filters.data_inicial || !filters.data_final) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Período inicial e final são obrigatórios'
        });
      }

      let query = db('imp_11_erros_importacao as ei')
        .leftJoin('imp_10_historico_importacoes as hi', 'ei.id_importacao', 'hi.id_importacao')
        .leftJoin('cad_05_usuarios as u', 'ei.id_usuario_resolucao', 'u.id_usuario')
        .select(
          'ei.*',
          'hi.nome_arquivo',
          'hi.tipo_importacao',
          'u.nome as resolvido_por'
        )
        .whereBetween('ei.data_erro', [filters.data_inicial, filters.data_final]);

      if (filters.tipo_erro) {
        query = query.where('ei.tipo_erro', filters.tipo_erro);
      }

      if (filters.nivel_criticidade) {
        query = query.where('ei.nivel_criticidade', filters.nivel_criticidade);
      }

      const errors = await query.orderBy('ei.data_erro', 'desc');

      // Generate report summary
      const reportSummary = {
        periodo: {
          inicio: filters.data_inicial,
          fim: filters.data_final
        },
        total_erros: errors.length,
        erros_resolvidos: errors.filter(e => e.resolvido).length,
        erros_pendentes: errors.filter(e => !e.resolvido).length,
        por_tipo: this.groupBy(errors, 'tipo_erro'),
        por_criticidade: this.groupBy(errors, 'nivel_criticidade'),
        tempo_medio_resolucao: this.calculateAverageResolutionTime(errors.filter(e => e.resolvido))
      };

      res.json({
        success: true,
        data: {
          resumo: reportSummary,
          erros_detalhados: errors,
          gerado_em: new Date(),
          filtros_aplicados: filters
        }
      });

    } catch (error) {
      console.error('Error generating error report:', error);
      res.status(500).json({
        success: false,
        error: 'REPORT_ERROR',
        message: 'Erro ao gerar relatório de erros',
        details: error.message
      });
    }
  }

  // Suggest solutions for similar errors
  async suggestSolutions(req, res) {
    try {
      const { tipo_erro, mensagem_erro } = req.query;

      if (!tipo_erro || !mensagem_erro) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Tipo de erro e mensagem são obrigatórios'
        });
      }

      // Find similar resolved errors
      const similarResolvedErrors = await db('imp_11_erros_importacao')
        .where('tipo_erro', tipo_erro)
        .where('mensagem_erro', 'ilike', `%${mensagem_erro}%`)
        .where('resolvido', true)
        .whereNotNull('solucao_aplicada')
        .select('solucao_aplicada', 'observacoes_resolucao', 'tempo_resolucao')
        .orderBy('data_resolucao', 'desc')
        .limit(5);

      // Get knowledge base solutions
      const knowledgeBaseSolutions = await this.getKnowledgeBaseSolutions(tipo_erro, mensagem_erro);

      res.json({
        success: true,
        data: {
          solucoes_anteriores: similarResolvedErrors,
          solucoes_base_conhecimento: knowledgeBaseSolutions,
          total_sugestoes: similarResolvedErrors.length + knowledgeBaseSolutions.length
        }
      });

    } catch (error) {
      console.error('Error suggesting solutions:', error);
      res.status(500).json({
        success: false,
        error: 'SUGGESTION_ERROR',
        message: 'Erro ao sugerir soluções',
        details: error.message
      });
    }
  }

  // Helper methods
  async getAffectedDataSample(importId, lineNumber) {
    // This would get a sample of the data that caused the error
    // For demo purposes, returning mock data
    return {
      linha: lineNumber,
      dados_linha: "Sample data that caused the error",
      campos_afetados: ["campo1", "campo2"]
    };
  }

  async autoAssignCriticalError(errorId, errorData, trx) {
    // Auto-assign critical errors to appropriate team members
    // This would implement business logic for automatic assignment
    // For demo purposes, just logging the action
    await trx('imp_14_historico_resolucao_erros').insert({
      id_erro: errorId,
      acao: 'AUTO_ATRIBUICAO',
      descricao: 'Erro crítico atribuído automaticamente',
      data_acao: new Date()
    });
  }

  async getKnowledgeBaseSolutions(tipoErro, mensagemErro) {
    // This would query a knowledge base for solutions
    // For demo purposes, returning mock solutions
    const solutions = {
      'VALIDACAO': [
        {
          titulo: 'Verificar formato dos dados',
          descricao: 'Confirme se os dados estão no formato esperado',
          passos: ['1. Verificar formato de data', '2. Validar campos obrigatórios']
        }
      ],
      'TRANSFORMACAO': [
        {
          titulo: 'Revisar regras de transformação',
          descricao: 'Verifique se as regras de transformação estão corretas',
          passos: ['1. Verificar mapeamentos', '2. Testar transformação']
        }
      ]
    };

    return solutions[tipoErro] || [];
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'Indefinido';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  calculateAverageResolutionTime(resolvedErrors) {
    if (resolvedErrors.length === 0) return 0;
    
    const totalTime = resolvedErrors.reduce((sum, error) => {
      if (error.tempo_resolucao) {
        return sum + error.tempo_resolucao;
      }
      return sum;
    }, 0);

    return Math.round(totalTime / resolvedErrors.length);
  }
}

module.exports = new ErrorHandlingController();