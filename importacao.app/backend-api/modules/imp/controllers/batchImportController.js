const db = require('../../../src/database/connection');
const { z } = require('zod');

// Batch Import Controller - Advanced batch processing for large-scale data imports
class BatchImportController {
  // Get all batch imports with advanced filtering and pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const filters = {
        search: req.query.search || '',
        status: req.query.status || '',
        tipo_processamento: req.query.tipo_processamento || '',
        data_inicial: req.query.data_inicial || '',
        data_final: req.query.data_final || '',
        id_usuario: req.query.id_usuario || '',
        prioridade: req.query.prioridade || ''
      };

      // Base query with joins
      let query = db('imp_15_lotes_importacao as li')
        .leftJoin('cad_05_usuarios as u', 'li.id_usuario_criacao', 'u.id_usuario')
        .leftJoin('cad_05_usuarios as uu', 'li.id_usuario_processamento', 'uu.id_usuario')
        .select(
          'li.*',
          'u.nome as criado_por',
          'uu.nome as processado_por'
        );

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('li.nome_lote', 'ilike', `%${filters.search}%`)
              .orWhere('li.descricao', 'ilike', `%${filters.search}%`)
              .orWhere('li.nome_arquivo_origem', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.status) {
        query = query.where('li.status', filters.status);
      }

      if (filters.tipo_processamento) {
        query = query.where('li.tipo_processamento', filters.tipo_processamento);
      }

      if (filters.data_inicial && filters.data_final) {
        query = query.whereBetween('li.data_criacao', [filters.data_inicial, filters.data_final]);
      } else if (filters.data_inicial) {
        query = query.where('li.data_criacao', '>=', filters.data_inicial);
      } else if (filters.data_final) {
        query = query.where('li.data_criacao', '<=', filters.data_final);
      }

      if (filters.id_usuario) {
        query = query.where('li.id_usuario_criacao', filters.id_usuario);
      }

      if (filters.prioridade) {
        query = query.where('li.prioridade', filters.prioridade);
      }

      // Count total records
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting and pagination
      const sortField = req.query.sort || 'data_criacao';
      const sortOrder = req.query.order || 'desc';
      query = query.orderBy(`li.${sortField}`, sortOrder);

      const batches = await query.limit(limit).offset(offset);

      // Add detailed information for each batch
      for (let batch of batches) {
        // Get processing progress
        batch.progresso = await this.calculateProgress(batch.id_lote);

        // Get error summary
        batch.resumo_erros = await this.getErrorSummary(batch.id_lote);

        // Get chunk processing status
        batch.chunks_status = await this.getChunksStatus(batch.id_lote);

        // Calculate processing rate if in progress or completed
        if (batch.data_inicio && batch.total_registros > 0) {
          const currentTime = batch.data_fim || new Date();
          const duration = new Date(currentTime) - new Date(batch.data_inicio);
          if (duration > 0) {
            batch.taxa_processamento = Math.round((batch.registros_processados / (duration / 1000)) * 100) / 100; // records per second
          }
        }

        // Format duration
        if (batch.data_inicio && batch.data_fim) {
          const duration = new Date(batch.data_fim) - new Date(batch.data_inicio);
          batch.duracao_formatada = this.formatDuration(duration);
        }
      }

      res.json({
        success: true,
        data: batches,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        },
        filters
      });

    } catch (error) {
      console.error('Error fetching batch imports:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar lotes de importação',
        details: error.message
      });
    }
  }

  // Get batch import by ID with complete details
  async getById(req, res) {
    try {
      const { id } = req.params;

      // Get main batch data
      const batch = await db('imp_15_lotes_importacao as li')
        .leftJoin('cad_05_usuarios as u', 'li.id_usuario_criacao', 'u.id_usuario')
        .leftJoin('cad_05_usuarios as uu', 'li.id_usuario_processamento', 'uu.id_usuario')
        .select(
          'li.*',
          'u.nome as criado_por',
          'u.email as email_criador',
          'uu.nome as processado_por'
        )
        .where('li.id_lote', id)
        .first();

      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Lote de importação não encontrado'
        });
      }

      // Get detailed chunks information
      batch.chunks = await db('imp_16_chunks_processamento as cp')
        .leftJoin('cad_05_usuarios as u', 'cp.id_usuario_processamento', 'u.id_usuario')
        .select(
          'cp.*',
          'u.nome as processado_por'
        )
        .where('cp.id_lote', id)
        .orderBy('cp.numero_chunk');

      // Get processing events/timeline
      batch.timeline_processamento = await db('imp_17_eventos_lote as el')
        .leftJoin('cad_05_usuarios as u', 'el.id_usuario', 'u.id_usuario')
        .select(
          'el.*',
          'u.nome as usuario_nome'
        )
        .where('el.id_lote', id)
        .orderBy('el.data_evento', 'desc');

      // Get error details grouped by type
      batch.erros_detalhados = await db('imp_11_erros_importacao as ei')
        .join('imp_16_chunks_processamento as cp', 'ei.id_chunk', 'cp.id_chunk')
        .select(
          'ei.tipo_erro',
          'ei.mensagem_erro',
          db.raw('COUNT(*) as frequencia'),
          db.raw('MIN(ei.numero_linha) as primeira_linha'),
          db.raw('MAX(ei.numero_linha) as ultima_linha')
        )
        .where('cp.id_lote', id)
        .groupBy('ei.tipo_erro', 'ei.mensagem_erro')
        .orderBy('frequencia', 'desc')
        .limit(20);

      // Get performance metrics
      batch.metricas_performance = await this.getPerformanceMetrics(id);

      // Parse JSON fields
      if (batch.configuracao_lote) {
        batch.configuracao_lote = JSON.parse(batch.configuracao_lote);
      }
      if (batch.resultado_processamento) {
        batch.resultado_processamento = JSON.parse(batch.resultado_processamento);
      }
      if (batch.configuracao_chunks) {
        batch.configuracao_chunks = JSON.parse(batch.configuracao_chunks);
      }

      // Calculate overall progress
      batch.progresso_detalhado = await this.calculateDetailedProgress(id);

      res.json({
        success: true,
        data: batch
      });

    } catch (error) {
      console.error('Error fetching batch import by ID:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar lote de importação',
        details: error.message
      });
    }
  }

  // Create new batch import
  async create(req, res) {
    const trx = await db.transaction();
    
    try {
      const validatedData = z.object({
        nome_lote: z.string(),
        descricao: z.string().optional(),
        nome_arquivo_origem: z.string(),
        caminho_arquivo: z.string(),
        tamanho_arquivo: z.number(),
        total_registros: z.number(),
        tipo_processamento: z.enum(['SEQUENCIAL', 'PARALELO', 'CHUNK_BASED']),
        prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).default('MEDIA'),
        configuracao_lote: z.object({
          chunk_size: z.number().default(1000),
          max_parallel_chunks: z.number().default(5),
          timeout_chunk: z.number().default(300), // seconds
          retry_attempts: z.number().default(3),
          rollback_on_error: z.boolean().default(false),
          notification_settings: z.object({
            notify_on_completion: z.boolean().default(true),
            notify_on_error: z.boolean().default(true),
            email_recipients: z.array(z.string()).optional()
          }).optional()
        }).optional(),
        id_validacao: z.number().optional(),
        id_workflow_transformacao: z.number().optional(),
        processar_imediatamente: z.boolean().default(false)
      }).parse(req.body);

      // Calculate chunk configuration
      const chunkConfig = this.calculateChunkConfiguration(
        validatedData.total_registros,
        validatedData.configuracao_lote || {}
      );

      const batchData = {
        ...validatedData,
        status: validatedData.processar_imediatamente ? 'PROCESSANDO' : 'AGUARDANDO',
        configuracao_lote: JSON.stringify(validatedData.configuracao_lote || {}),
        configuracao_chunks: JSON.stringify(chunkConfig),
        total_chunks: chunkConfig.total_chunks,
        chunks_processados: 0,
        registros_processados: 0,
        registros_erro: 0,
        id_usuario_criacao: req.user?.id,
        data_criacao: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      if (validatedData.processar_imediatamente) {
        batchData.data_inicio = new Date();
        batchData.id_usuario_processamento = req.user?.id;
      }

      const [batchId] = await trx('imp_15_lotes_importacao')
        .insert(batchData)
        .returning('id_lote');

      // Create chunks
      await this.createBatchChunks(batchId, chunkConfig, trx);

      // Create initial event
      await trx('imp_17_eventos_lote').insert({
        id_lote: batchId,
        tipo_evento: 'CRIACAO',
        descricao: 'Lote de importação criado',
        data_evento: new Date(),
        id_usuario: req.user?.id,
        detalhes_evento: JSON.stringify({
          configuracao: validatedData.configuracao_lote,
          total_chunks: chunkConfig.total_chunks,
          chunk_size: chunkConfig.chunk_size
        })
      });

      await trx.commit();

      // Start processing if requested
      if (validatedData.processar_imediatamente) {
        this.startBatchProcessing(batchId, validatedData.tipo_processamento, req.user?.id);
      }

      res.status(201).json({
        success: true,
        data: { 
          id_lote: batchId,
          total_chunks: chunkConfig.total_chunks,
          chunk_size: chunkConfig.chunk_size
        },
        message: 'Lote de importação criado com sucesso'
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

      console.error('Error creating batch import:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar lote de importação',
        details: error.message
      });
    }
  }

  // Start batch processing
  async startProcessing(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { tipo_processamento } = req.body;

      const batch = await trx('imp_15_lotes_importacao')
        .where('id_lote', id)
        .first();

      if (!batch) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Lote de importação não encontrado'
        });
      }

      if (!['AGUARDANDO', 'PAUSADO'].includes(batch.status)) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Lote não pode ser iniciado no status atual'
        });
      }

      // Update batch status
      await trx('imp_15_lotes_importacao')
        .where('id_lote', id)
        .update({
          status: 'PROCESSANDO',
          tipo_processamento: tipo_processamento || batch.tipo_processamento,
          data_inicio: new Date(),
          id_usuario_processamento: req.user?.id,
          updated_at: new Date()
        });

      // Create processing start event
      await trx('imp_17_eventos_lote').insert({
        id_lote: id,
        tipo_evento: 'INICIO_PROCESSAMENTO',
        descricao: 'Processamento do lote iniciado',
        data_evento: new Date(),
        id_usuario: req.user?.id,
        detalhes_evento: JSON.stringify({
          tipo_processamento: tipo_processamento || batch.tipo_processamento
        })
      });

      await trx.commit();

      // Start asynchronous processing
      this.startBatchProcessing(id, tipo_processamento || batch.tipo_processamento, req.user?.id);

      res.json({
        success: true,
        message: 'Processamento do lote iniciado com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error starting batch processing:', error);
      res.status(500).json({
        success: false,
        error: 'PROCESSING_ERROR',
        message: 'Erro ao iniciar processamento do lote',
        details: error.message
      });
    }
  }

  // Pause batch processing
  async pauseProcessing(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      const batch = await trx('imp_15_lotes_importacao')
        .where('id_lote', id)
        .first();

      if (!batch) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Lote de importação não encontrado'
        });
      }

      if (batch.status !== 'PROCESSANDO') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Lote não está em processamento'
        });
      }

      // Update batch status
      await trx('imp_15_lotes_importacao')
        .where('id_lote', id)
        .update({
          status: 'PAUSADO',
          observacoes: motivo,
          updated_at: new Date()
        });

      // Update running chunks to paused
      await trx('imp_16_chunks_processamento')
        .where('id_lote', id)
        .where('status', 'PROCESSANDO')
        .update({
          status: 'PAUSADO',
          data_pausa: new Date()
        });

      // Create pause event
      await trx('imp_17_eventos_lote').insert({
        id_lote: id,
        tipo_evento: 'PAUSA',
        descricao: 'Processamento do lote pausado',
        data_evento: new Date(),
        id_usuario: req.user?.id,
        detalhes_evento: JSON.stringify({
          motivo: motivo
        })
      });

      await trx.commit();

      res.json({
        success: true,
        message: 'Processamento do lote pausado com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error pausing batch processing:', error);
      res.status(500).json({
        success: false,
        error: 'PAUSE_ERROR',
        message: 'Erro ao pausar processamento do lote',
        details: error.message
      });
    }
  }

  // Cancel batch processing
  async cancelProcessing(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { motivo_cancelamento, realizar_rollback } = req.body;

      if (!motivo_cancelamento || motivo_cancelamento.length < 5) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Motivo de cancelamento deve ter pelo menos 5 caracteres'
        });
      }

      const batch = await trx('imp_15_lotes_importacao')
        .where('id_lote', id)
        .first();

      if (!batch) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Lote de importação não encontrado'
        });
      }

      const cancellableStatuses = ['AGUARDANDO', 'PROCESSANDO', 'PAUSADO'];
      if (!cancellableStatuses.includes(batch.status)) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Lote não pode ser cancelado no status atual'
        });
      }

      // Update batch status
      await trx('imp_15_lotes_importacao')
        .where('id_lote', id)
        .update({
          status: 'CANCELADO',
          observacoes: motivo_cancelamento,
          data_fim: new Date(),
          updated_at: new Date()
        });

      // Cancel all pending and running chunks
      await trx('imp_16_chunks_processamento')
        .where('id_lote', id)
        .whereIn('status', ['AGUARDANDO', 'PROCESSANDO', 'PAUSADO'])
        .update({
          status: 'CANCELADO',
          data_fim: new Date(),
          observacoes: 'Cancelado junto com o lote'
        });

      // Perform rollback if requested
      if (realizar_rollback) {
        await this.performBatchRollback(id, trx);
      }

      // Create cancellation event
      await trx('imp_17_eventos_lote').insert({
        id_lote: id,
        tipo_evento: 'CANCELAMENTO',
        descricao: 'Processamento do lote cancelado',
        data_evento: new Date(),
        id_usuario: req.user?.id,
        detalhes_evento: JSON.stringify({
          motivo: motivo_cancelamento,
          rollback_realizado: realizar_rollback || false
        })
      });

      await trx.commit();

      res.json({
        success: true,
        message: 'Processamento do lote cancelado com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error cancelling batch processing:', error);
      res.status(500).json({
        success: false,
        error: 'CANCEL_ERROR',
        message: 'Erro ao cancelar processamento do lote',
        details: error.message
      });
    }
  }

  // Retry failed chunks
  async retryFailedChunks(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { chunk_ids } = req.body; // Optional: specific chunks to retry

      const batch = await trx('imp_15_lotes_importacao')
        .where('id_lote', id)
        .first();

      if (!batch) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Lote de importação não encontrado'
        });
      }

      // Get failed chunks
      let failedChunksQuery = trx('imp_16_chunks_processamento')
        .where('id_lote', id)
        .where('status', 'ERRO');

      if (chunk_ids && chunk_ids.length > 0) {
        failedChunksQuery = failedChunksQuery.whereIn('id_chunk', chunk_ids);
      }

      const failedChunks = await failedChunksQuery;

      if (failedChunks.length === 0) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NO_FAILED_CHUNKS',
          message: 'Nenhum chunk com falha encontrado'
        });
      }

      // Reset failed chunks for retry
      const chunkIds = failedChunks.map(chunk => chunk.id_chunk);
      await trx('imp_16_chunks_processamento')
        .whereIn('id_chunk', chunkIds)
        .update({
          status: 'AGUARDANDO',
          tentativas: db.raw('tentativas + 1'),
          data_inicio: null,
          data_fim: null,
          erro_processamento: null,
          observacoes: 'Reset para nova tentativa',
          updated_at: new Date()
        });

      // Update batch status if it was in error
      if (batch.status === 'ERRO') {
        await trx('imp_15_lotes_importacao')
          .where('id_lote', id)
          .update({
            status: 'PROCESSANDO',
            updated_at: new Date()
          });
      }

      // Create retry event
      await trx('imp_17_eventos_lote').insert({
        id_lote: id,
        tipo_evento: 'RETRY_CHUNKS',
        descricao: `${failedChunks.length} chunk(s) reconfigurado(s) para nova tentativa`,
        data_evento: new Date(),
        id_usuario: req.user?.id,
        detalhes_evento: JSON.stringify({
          chunks_retry: chunkIds,
          total_chunks: failedChunks.length
        })
      });

      await trx.commit();

      // Restart processing for retried chunks
      this.processPendingChunks(id, batch.tipo_processamento);

      res.json({
        success: true,
        data: {
          chunks_reconfigurados: failedChunks.length,
          chunk_ids: chunkIds
        },
        message: `${failedChunks.length} chunk(s) reconfigurado(s) para nova tentativa`
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error retrying failed chunks:', error);
      res.status(500).json({
        success: false,
        error: 'RETRY_ERROR',
        message: 'Erro ao reconfigurar chunks para nova tentativa',
        details: error.message
      });
    }
  }

  // Get batch processing statistics
  async getStats(req, res) {
    try {
      const filters = {
        periodo: req.query.periodo || '30', // days
        tipo_processamento: req.query.tipo_processamento || '',
        id_usuario: req.query.id_usuario || ''
      };

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - parseInt(filters.periodo));

      let baseQuery = db('imp_15_lotes_importacao');
      
      if (filters.tipo_processamento) {
        baseQuery = baseQuery.where('tipo_processamento', filters.tipo_processamento);
      }

      if (filters.id_usuario) {
        baseQuery = baseQuery.where('id_usuario_criacao', filters.id_usuario);
      }

      // Total batches
      const totalBatches = await baseQuery.clone()
        .count('* as count')
        .first();

      // Batches in period
      const batchesInPeriod = await baseQuery.clone()
        .where('data_criacao', '>=', dateFrom)
        .count('* as count')
        .first();

      // Batches by status
      const batchesByStatus = await baseQuery.clone()
        .select('status')
        .count('* as count')
        .groupBy('status');

      // Batches by processing type
      const batchesByType = await baseQuery.clone()
        .select('tipo_processamento')
        .count('* as count')
        .avg('total_registros as avg_records')
        .sum('total_registros as total_records')
        .groupBy('tipo_processamento');

      // Success rate
      const successfulBatches = await baseQuery.clone()
        .where('status', 'CONCLUIDO')
        .count('* as count')
        .first();

      const errorBatches = await baseQuery.clone()
        .where('status', 'ERRO')
        .count('* as count')
        .first();

      const totalFinished = parseInt(successfulBatches.count) + parseInt(errorBatches.count);
      const successRate = totalFinished > 0 ? 
        Math.round((parseInt(successfulBatches.count) / totalFinished) * 100 * 100) / 100 : 0;

      // Average processing time
      const avgProcessingTime = await baseQuery.clone()
        .whereNotNull('data_fim')
        .select(db.raw('AVG(EXTRACT(EPOCH FROM (data_fim - data_inicio))) as avg_seconds'))
        .first();

      // Performance by chunk size
      const performanceByChunkSize = await db('imp_15_lotes_importacao as li')
        .join('imp_16_chunks_processamento as cp', 'li.id_lote', 'cp.id_lote')
        .select(
          db.raw('CASE WHEN cp.tamanho_chunk <= 500 THEN \'Pequeno (≤500)\' WHEN cp.tamanho_chunk <= 2000 THEN \'Médio (501-2000)\' ELSE \'Grande (>2000)\' END as categoria_chunk'),
          db.raw('COUNT(DISTINCT li.id_lote) as total_lotes'),
          db.raw('AVG(EXTRACT(EPOCH FROM (cp.data_fim - cp.data_inicio))) as tempo_medio_chunk')
        )
        .whereNotNull('cp.data_fim')
        .groupBy(db.raw('CASE WHEN cp.tamanho_chunk <= 500 THEN \'Pequeno (≤500)\' WHEN cp.tamanho_chunk <= 2000 THEN \'Médio (501-2000)\' ELSE \'Grande (>2000)\' END'));

      // Processing trends by day
      const processingTrends = await baseQuery.clone()
        .where('data_criacao', '>=', dateFrom)
        .select(db.raw('DATE(data_criacao) as data'))
        .count('* as lotes')
        .sum('total_registros as registros')
        .groupBy(db.raw('DATE(data_criacao)'))
        .orderBy('data');

      // Top error types
      const topErrors = await db('imp_11_erros_importacao as ei')
        .join('imp_16_chunks_processamento as cp', 'ei.id_chunk', 'cp.id_chunk')
        .join('imp_15_lotes_importacao as li', 'cp.id_lote', 'li.id_lote')
        .select('ei.tipo_erro', 'ei.mensagem_erro')
        .count('* as frequency')
        .where('li.data_criacao', '>=', dateFrom)
        .groupBy('ei.tipo_erro', 'ei.mensagem_erro')
        .orderBy('frequency', 'desc')
        .limit(10);

      res.json({
        success: true,
        data: {
          total_lotes: parseInt(totalBatches.count),
          lotes_periodo: parseInt(batchesInPeriod.count),
          taxa_sucesso: successRate,
          tempo_medio_processamento: parseFloat(avgProcessingTime.avg_seconds) || 0,
          por_status: batchesByStatus.map(s => ({
            status: s.status,
            quantidade: parseInt(s.count)
          })),
          por_tipo: batchesByType.map(t => ({
            tipo: t.tipo_processamento,
            quantidade: parseInt(t.count),
            total_registros: parseInt(t.total_records),
            media_registros: Math.round(parseFloat(t.avg_records))
          })),
          performance_chunk_size: performanceByChunkSize.map(p => ({
            categoria: p.categoria_chunk,
            total_lotes: parseInt(p.total_lotes),
            tempo_medio: parseFloat(p.tempo_medio_chunk) || 0
          })),
          tendencia_processamento: processingTrends.map(t => ({
            data: t.data,
            lotes: parseInt(t.lotes),
            registros: parseInt(t.registros)
          })),
          principais_erros: topErrors.map(e => ({
            tipo: e.tipo_erro,
            mensagem: e.mensagem_erro,
            frequencia: parseInt(e.frequency)
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching batch stats:', error);
      res.status(500).json({
        success: false,
        error: 'STATS_ERROR',
        message: 'Erro ao buscar estatísticas de lotes',
        details: error.message
      });
    }
  }

  // Get real-time batch progress
  async getProgress(req, res) {
    try {
      const { id } = req.params;

      const batch = await db('imp_15_lotes_importacao')
        .where('id_lote', id)
        .first();

      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Lote de importação não encontrado'
        });
      }

      // Get detailed progress information
      const progress = await this.calculateDetailedProgress(id);

      res.json({
        success: true,
        data: {
          id_lote: id,
          status: batch.status,
          ...progress
        }
      });

    } catch (error) {
      console.error('Error fetching batch progress:', error);
      res.status(500).json({
        success: false,
        error: 'PROGRESS_ERROR',
        message: 'Erro ao buscar progresso do lote',
        details: error.message
      });
    }
  }

  // Helper methods
  calculateChunkConfiguration(totalRecords, userConfig) {
    const defaultChunkSize = 1000;
    const maxChunkSize = 5000;
    const minChunkSize = 100;

    let chunkSize = userConfig.chunk_size || defaultChunkSize;
    
    // Adjust chunk size based on total records
    if (totalRecords < 1000) {
      chunkSize = Math.max(minChunkSize, Math.floor(totalRecords / 2));
    } else if (totalRecords > 100000) {
      chunkSize = Math.min(maxChunkSize, chunkSize);
    }

    const totalChunks = Math.ceil(totalRecords / chunkSize);

    return {
      chunk_size: chunkSize,
      total_chunks: totalChunks,
      max_parallel_chunks: Math.min(userConfig.max_parallel_chunks || 5, totalChunks),
      timeout_chunk: userConfig.timeout_chunk || 300,
      retry_attempts: userConfig.retry_attempts || 3
    };
  }

  async createBatchChunks(batchId, chunkConfig, trx) {
    for (let i = 0; i < chunkConfig.total_chunks; i++) {
      const startLine = (i * chunkConfig.chunk_size) + 1;
      const endLine = Math.min((i + 1) * chunkConfig.chunk_size, Number.MAX_SAFE_INTEGER);

      await trx('imp_16_chunks_processamento').insert({
        id_lote: batchId,
        numero_chunk: i + 1,
        linha_inicio: startLine,
        linha_fim: endLine,
        tamanho_chunk: chunkConfig.chunk_size,
        status: 'AGUARDANDO',
        tentativas: 0,
        created_at: new Date()
      });
    }
  }

  async startBatchProcessing(batchId, processingType, userId) {
    try {
      switch (processingType) {
        case 'SEQUENCIAL':
          await this.processSequential(batchId, userId);
          break;
        case 'PARALELO':
          await this.processParallel(batchId, userId);
          break;
        case 'CHUNK_BASED':
          await this.processChunkBased(batchId, userId);
          break;
      }
    } catch (error) {
      console.error('Batch processing error:', error);
      await this.markBatchAsError(batchId, error.message);
    }
  }

  async processSequential(batchId, userId) {
    const chunks = await db('imp_16_chunks_processamento')
      .where('id_lote', batchId)
      .where('status', 'AGUARDANDO')
      .orderBy('numero_chunk');

    for (const chunk of chunks) {
      await this.processChunk(chunk, userId);
    }

    await this.finalizeBatch(batchId);
  }

  async processParallel(batchId, userId) {
    const batch = await db('imp_15_lotes_importacao').where('id_lote', batchId).first();
    const chunkConfig = JSON.parse(batch.configuracao_chunks);
    
    await this.processPendingChunks(batchId, 'PARALELO', chunkConfig.max_parallel_chunks);
  }

  async processChunkBased(batchId, userId) {
    // Advanced chunk-based processing with dynamic load balancing
    await this.processPendingChunks(batchId, 'CHUNK_BASED');
  }

  async processPendingChunks(batchId, processingType, maxParallel = 5) {
    const pendingChunks = await db('imp_16_chunks_processamento')
      .where('id_lote', batchId)
      .where('status', 'AGUARDANDO')
      .orderBy('numero_chunk')
      .limit(maxParallel);

    const processingPromises = pendingChunks.map(chunk => 
      this.processChunk(chunk, null)
    );

    await Promise.allSettled(processingPromises);

    // Check if there are more pending chunks
    const remainingChunks = await db('imp_16_chunks_processamento')
      .where('id_lote', batchId)
      .where('status', 'AGUARDANDO')
      .count('* as count')
      .first();

    if (parseInt(remainingChunks.count) > 0) {
      // Continue processing remaining chunks
      setTimeout(() => this.processPendingChunks(batchId, processingType, maxParallel), 1000);
    } else {
      // All chunks processed, finalize batch
      await this.finalizeBatch(batchId);
    }
  }

  async processChunk(chunk, userId) {
    const trx = await db.transaction();
    
    try {
      // Update chunk status
      await trx('imp_16_chunks_processamento')
        .where('id_chunk', chunk.id_chunk)
        .update({
          status: 'PROCESSANDO',
          data_inicio: new Date(),
          id_usuario_processamento: userId
        });

      await trx.commit();

      // Simulate chunk processing (in real implementation, this would process the actual data)
      await this.simulateChunkProcessing(chunk);

      // Update chunk as completed
      await db('imp_16_chunks_processamento')
        .where('id_chunk', chunk.id_chunk)
        .update({
          status: 'CONCLUIDO',
          data_fim: new Date(),
          registros_processados: chunk.tamanho_chunk,
          updated_at: new Date()
        });

      // Update batch progress
      await this.updateBatchProgress(chunk.id_lote);

    } catch (error) {
      await trx.rollback();
      
      // Update chunk as failed
      await db('imp_16_chunks_processamento')
        .where('id_chunk', chunk.id_chunk)
        .update({
          status: 'ERRO',
          data_fim: new Date(),
          erro_processamento: error.message,
          updated_at: new Date()
        });

      throw error;
    }
  }

  async simulateChunkProcessing(chunk) {
    // Simulate processing time based on chunk size
    const processingTime = Math.random() * 2000 + 500; // 500ms to 2.5s
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate random errors (5% chance)
    if (Math.random() < 0.05) {
      throw new Error(`Simulated processing error for chunk ${chunk.numero_chunk}`);
    }
  }

  async updateBatchProgress(batchId) {
    const progress = await db('imp_16_chunks_processamento')
      .where('id_lote', batchId)
      .select(
        db.raw('COUNT(*) as total_chunks'),
        db.raw('COUNT(CASE WHEN status = \'CONCLUIDO\' THEN 1 END) as chunks_concluidos'),
        db.raw('COUNT(CASE WHEN status = \'ERRO\' THEN 1 END) as chunks_erro'),
        db.raw('SUM(COALESCE(registros_processados, 0)) as registros_processados')
      )
      .first();

    await db('imp_15_lotes_importacao')
      .where('id_lote', batchId)
      .update({
        chunks_processados: progress.chunks_concluidos,
        registros_processados: progress.registros_processados,
        registros_erro: progress.chunks_erro,
        updated_at: new Date()
      });
  }

  async finalizeBatch(batchId) {
    const batch = await db('imp_15_lotes_importacao').where('id_lote', batchId).first();
    const chunkStats = await db('imp_16_chunks_processamento')
      .where('id_lote', batchId)
      .select(
        db.raw('COUNT(*) as total_chunks'),
        db.raw('COUNT(CASE WHEN status = \'CONCLUIDO\' THEN 1 END) as chunks_concluidos'),
        db.raw('COUNT(CASE WHEN status = \'ERRO\' THEN 1 END) as chunks_erro')
      )
      .first();

    const finalStatus = parseInt(chunkStats.chunks_erro) > 0 ? 'ERRO' : 'CONCLUIDO';

    await db('imp_15_lotes_importacao')
      .where('id_lote', batchId)
      .update({
        status: finalStatus,
        data_fim: new Date(),
        resultado_processamento: JSON.stringify({
          total_chunks: parseInt(chunkStats.total_chunks),
          chunks_concluidos: parseInt(chunkStats.chunks_concluidos),
          chunks_erro: parseInt(chunkStats.chunks_erro),
          taxa_sucesso: Math.round((parseInt(chunkStats.chunks_concluidos) / parseInt(chunkStats.total_chunks)) * 100 * 100) / 100
        }),
        updated_at: new Date()
      });

    // Create completion event
    await db('imp_17_eventos_lote').insert({
      id_lote: batchId,
      tipo_evento: finalStatus === 'CONCLUIDO' ? 'CONCLUSAO' : 'ERRO',
      descricao: `Processamento do lote ${finalStatus === 'CONCLUIDO' ? 'concluído' : 'finalizado com erros'}`,
      data_evento: new Date(),
      detalhes_evento: JSON.stringify(chunkStats)
    });
  }

  async markBatchAsError(batchId, errorMessage) {
    await db('imp_15_lotes_importacao')
      .where('id_lote', batchId)
      .update({
        status: 'ERRO',
        data_fim: new Date(),
        observacoes: errorMessage,
        updated_at: new Date()
      });
  }

  async calculateProgress(batchId) {
    const stats = await db('imp_16_chunks_processamento')
      .where('id_lote', batchId)
      .select(
        db.raw('COUNT(*) as total'),
        db.raw('COUNT(CASE WHEN status = \'CONCLUIDO\' THEN 1 END) as concluidos'),
        db.raw('COUNT(CASE WHEN status = \'PROCESSANDO\' THEN 1 END) as processando'),
        db.raw('COUNT(CASE WHEN status = \'ERRO\' THEN 1 END) as erros')
      )
      .first();

    const total = parseInt(stats.total);
    const concluidos = parseInt(stats.concluidos);
    
    return {
      percentual: total > 0 ? Math.round((concluidos / total) * 100 * 100) / 100 : 0,
      chunks_concluidos: concluidos,
      chunks_processando: parseInt(stats.processando),
      chunks_erro: parseInt(stats.erros),
      total_chunks: total
    };
  }

  async calculateDetailedProgress(batchId) {
    const progress = await this.calculateProgress(batchId);
    
    const chunkDetails = await db('imp_16_chunks_processamento')
      .where('id_lote', batchId)
      .select('status', 'numero_chunk', 'registros_processados', 'data_inicio', 'data_fim')
      .orderBy('numero_chunk');

    return {
      ...progress,
      detalhes_chunks: chunkDetails
    };
  }

  async getErrorSummary(batchId) {
    const errorSummary = await db('imp_11_erros_importacao as ei')
      .join('imp_16_chunks_processamento as cp', 'ei.id_chunk', 'cp.id_chunk')
      .where('cp.id_lote', batchId)
      .select('ei.tipo_erro')
      .count('* as count')
      .groupBy('ei.tipo_erro')
      .orderBy('count', 'desc');

    return errorSummary.map(e => ({
      tipo: e.tipo_erro,
      quantidade: parseInt(e.count)
    }));
  }

  async getChunksStatus(batchId) {
    const chunksStatus = await db('imp_16_chunks_processamento')
      .where('id_lote', batchId)
      .select('status')
      .count('* as count')
      .groupBy('status');

    return chunksStatus.map(c => ({
      status: c.status,
      quantidade: parseInt(c.count)
    }));
  }

  async getPerformanceMetrics(batchId) {
    const metrics = await db('imp_16_chunks_processamento')
      .where('id_lote', batchId)
      .whereNotNull('data_fim')
      .select(
        db.raw('AVG(EXTRACT(EPOCH FROM (data_fim - data_inicio))) as tempo_medio_chunk'),
        db.raw('MIN(EXTRACT(EPOCH FROM (data_fim - data_inicio))) as tempo_min_chunk'),
        db.raw('MAX(EXTRACT(EPOCH FROM (data_fim - data_inicio))) as tempo_max_chunk'),
        db.raw('AVG(registros_processados) as media_registros_chunk')
      )
      .first();

    return {
      tempo_medio_chunk: parseFloat(metrics.tempo_medio_chunk) || 0,
      tempo_min_chunk: parseFloat(metrics.tempo_min_chunk) || 0,
      tempo_max_chunk: parseFloat(metrics.tempo_max_chunk) || 0,
      media_registros_chunk: Math.round(parseFloat(metrics.media_registros_chunk)) || 0
    };
  }

  async performBatchRollback(batchId, trx) {
    // This would implement rollback logic for processed data
    // For demo purposes, we'll just log the rollback action
    await trx('imp_17_eventos_lote').insert({
      id_lote: batchId,
      tipo_evento: 'ROLLBACK',
      descricao: 'Rollback dos dados processados realizado',
      data_evento: new Date(),
      detalhes_evento: JSON.stringify({
        tipo_rollback: 'COMPLETO',
        dados_afetados: 'Todos os dados processados do lote'
      })
    });
  }

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

module.exports = new BatchImportController();