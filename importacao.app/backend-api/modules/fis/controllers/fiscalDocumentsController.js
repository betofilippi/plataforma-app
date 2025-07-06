const db = require('../../../src/database/connection');
const { fiscalDocumentSchema, fiscalDocumentUpdateSchema } = require('../services/validationService');
const { z } = require('zod');

// Fiscal Documents Controller - Comprehensive fiscal document management
class FiscalDocumentsController {
  // Get all fiscal documents with advanced filtering and pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // Parse and validate filters
      const filters = {
        search: req.query.search || '',
        tipo_documento: req.query.tipo_documento || '',
        id_empresa: req.query.id_empresa || '',
        status: req.query.status || '',
        data_inicial: req.query.data_inicial || '',
        data_final: req.query.data_final || '',
        id_parceiro: req.query.id_parceiro || '',
        modelo_documento: req.query.modelo_documento || ''
      };

      // Base query with joins
      let query = db('fis_14_documentos_fiscais as df')
        .leftJoin('cad_01_empresas as e', 'df.id_empresa', 'e.id_empresa')
        .leftJoin('cad_03_clientes as c', function() {
          this.on('df.id_parceiro', '=', 'c.id_cliente')
              .andOn('df.tipo_parceiro', '=', db.raw('?', ['CLIENTE']));
        })
        .leftJoin('cad_04_fornecedores as f', function() {
          this.on('df.id_parceiro', '=', 'f.id_fornecedor')
              .andOn('df.tipo_parceiro', '=', db.raw('?', ['FORNECEDOR']));
        })
        .leftJoin('cad_05_usuarios as u', 'df.id_usuario_criacao', 'u.id_usuario')
        .select(
          'df.*',
          'e.nome_fantasia as empresa_nome',
          'e.cnpj as empresa_cnpj',
          db.raw('COALESCE(c.nome_razao_social, f.nome_razao_social) as parceiro_nome'),
          db.raw('COALESCE(c.cnpj_cpf, f.cnpj_cpf) as parceiro_documento'),
          'u.nome as criado_por'
        );

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('df.numero_documento', 'ilike', `%${filters.search}%`)
              .orWhere('df.chave_acesso', 'ilike', `%${filters.search}%`)
              .orWhere('c.nome_razao_social', 'ilike', `%${filters.search}%`)
              .orWhere('f.nome_razao_social', 'ilike', `%${filters.search}%`)
              .orWhere('c.cnpj_cpf', 'ilike', `%${filters.search}%`)
              .orWhere('f.cnpj_cpf', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.tipo_documento) {
        query = query.where('df.tipo_documento', filters.tipo_documento);
      }

      if (filters.id_empresa) {
        query = query.where('df.id_empresa', filters.id_empresa);
      }

      if (filters.status) {
        query = query.where('df.status', filters.status);
      }

      if (filters.data_inicial && filters.data_final) {
        query = query.whereBetween('df.data_emissao', [filters.data_inicial, filters.data_final]);
      } else if (filters.data_inicial) {
        query = query.where('df.data_emissao', '>=', filters.data_inicial);
      } else if (filters.data_final) {
        query = query.where('df.data_emissao', '<=', filters.data_final);
      }

      if (filters.id_parceiro) {
        query = query.where('df.id_parceiro', filters.id_parceiro);
      }

      if (filters.modelo_documento) {
        query = query.where('df.modelo_documento', filters.modelo_documento);
      }

      // Count total records for pagination
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting and pagination
      const sortField = req.query.sort || 'data_emissao';
      const sortOrder = req.query.order || 'desc';
      query = query.orderBy(`df.${sortField}`, sortOrder);

      const documents = await query.limit(limit).offset(offset);

      // Add document items if requested
      if (req.query.include_items === 'true') {
        for (let doc of documents) {
          doc.itens = await db('fis_15_itens_documento_fiscal as idf')
            .leftJoin('prd_03_produtos as p', 'idf.id_produto', 'p.id_produto')
            .select(
              'idf.*',
              'p.nome as produto_nome',
              'p.codigo_barras',
              'p.ncm'
            )
            .where('idf.id_documento', doc.id_documento);
        }
      }

      res.json({
        success: true,
        data: documents,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        },
        filters
      });

    } catch (error) {
      console.error('Error fetching fiscal documents:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar documentos fiscais',
        details: error.message
      });
    }
  }

  // Get fiscal document by ID with complete details
  async getById(req, res) {
    try {
      const { id } = req.params;

      // Get main document data
      const document = await db('fis_14_documentos_fiscais as df')
        .leftJoin('cad_01_empresas as e', 'df.id_empresa', 'e.id_empresa')
        .leftJoin('cad_03_clientes as c', function() {
          this.on('df.id_parceiro', '=', 'c.id_cliente')
              .andOn('df.tipo_parceiro', '=', db.raw('?', ['CLIENTE']));
        })
        .leftJoin('cad_04_fornecedores as f', function() {
          this.on('df.id_parceiro', '=', 'f.id_fornecedor')
              .andOn('df.tipo_parceiro', '=', db.raw('?', ['FORNECEDOR']));
        })
        .leftJoin('cad_05_usuarios as u', 'df.id_usuario_criacao', 'u.id_usuario')
        .select(
          'df.*',
          'e.nome_fantasia as empresa_nome',
          'e.cnpj as empresa_cnpj',
          'e.endereco as empresa_endereco',
          'e.uf as empresa_uf',
          'e.municipio as empresa_municipio',
          'e.inscricao_estadual as empresa_ie',
          'e.inscricao_municipal as empresa_im',
          db.raw('COALESCE(c.nome_razao_social, f.nome_razao_social) as parceiro_nome'),
          db.raw('COALESCE(c.cnpj_cpf, f.cnpj_cpf) as parceiro_documento'),
          db.raw('COALESCE(c.endereco, f.endereco) as parceiro_endereco'),
          db.raw('COALESCE(c.uf, f.uf) as parceiro_uf'),
          db.raw('COALESCE(c.municipio, f.municipio) as parceiro_municipio'),
          db.raw('COALESCE(c.inscricao_estadual, f.inscricao_estadual) as parceiro_ie'),
          'u.nome as criado_por'
        )
        .where('df.id_documento', id)
        .first();

      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Documento fiscal não encontrado'
        });
      }

      // Get document items
      document.itens = await db('fis_15_itens_documento_fiscal as idf')
        .leftJoin('prd_03_produtos as p', 'idf.id_produto', 'p.id_produto')
        .select(
          'idf.*',
          'p.nome as produto_nome',
          'p.codigo_barras',
          'p.ncm',
          'p.unidade_medida'
        )
        .where('idf.id_documento', id)
        .orderBy('idf.numero_item');

      // Get tax totals
      document.totais_tributos = await db('fis_16_totais_tributos_documento')
        .where('id_documento', id)
        .first();

      // Get transport information if exists
      document.transporte = await db('fis_17_transporte_documento')
        .where('id_documento', id)
        .first();

      // Get payments information if exists
      document.pagamentos = await db('fis_18_pagamentos_documento')
        .where('id_documento', id);

      // Get document events/history
      document.eventos = await db('fis_19_eventos_documento as ed')
        .leftJoin('cad_05_usuarios as u', 'ed.id_usuario', 'u.id_usuario')
        .select(
          'ed.*',
          'u.nome as usuario_nome'
        )
        .where('ed.id_documento', id)
        .orderBy('ed.data_evento', 'desc');

      res.json({
        success: true,
        data: document
      });

    } catch (error) {
      console.error('Error fetching fiscal document by ID:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar documento fiscal',
        details: error.message
      });
    }
  }

  // Create new fiscal document
  async create(req, res) {
    const trx = await db.transaction();
    
    try {
      // Validate input
      const validatedData = fiscalDocumentSchema.parse(req.body);

      // Generate sequential number for this company and document type
      const lastDocument = await trx('fis_14_documentos_fiscais')
        .where('id_empresa', validatedData.id_empresa)
        .where('tipo_documento', validatedData.tipo_documento)
        .where('serie', validatedData.serie)
        .orderBy('numero_documento', 'desc')
        .first();

      const nextNumber = lastDocument ? parseInt(lastDocument.numero_documento) + 1 : 1;

      // Create main document record
      const documentData = {
        ...validatedData,
        numero_documento: nextNumber.toString(),
        status: 'DIGITACAO',
        id_usuario_criacao: req.user?.id || validatedData.id_usuario_criacao,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [documentId] = await trx('fis_14_documentos_fiscais')
        .insert(documentData)
        .returning('id_documento');

      // Insert document items
      if (validatedData.itens && validatedData.itens.length > 0) {
        let totalProdutos = 0;
        let totalTributos = 0;
        let totalDesconto = 0;

        for (let i = 0; i < validatedData.itens.length; i++) {
          const item = validatedData.itens[i];
          
          // Calculate item totals
          const valorTotal = item.quantidade * item.valor_unitario;
          const desconto = item.desconto || 0;
          const valorLiquido = valorTotal - desconto;

          await trx('fis_15_itens_documento_fiscal').insert({
            id_documento: documentId,
            numero_item: i + 1,
            ...item,
            valor_total: valorTotal,
            valor_liquido: valorLiquido,
            created_at: new Date()
          });

          totalProdutos += valorLiquido;
          totalDesconto += desconto;
          totalTributos += item.valor_total_tributos || 0;
        }

        // Insert tax totals
        await trx('fis_16_totais_tributos_documento').insert({
          id_documento: documentId,
          valor_total_produtos: totalProdutos,
          valor_total_descontos: totalDesconto,
          valor_total_tributos: totalTributos,
          valor_total_documento: totalProdutos + totalTributos,
          created_at: new Date()
        });
      }

      // Insert transport information if provided
      if (validatedData.transporte) {
        await trx('fis_17_transporte_documento').insert({
          id_documento: documentId,
          ...validatedData.transporte,
          created_at: new Date()
        });
      }

      // Insert payment information if provided
      if (validatedData.pagamentos && validatedData.pagamentos.length > 0) {
        for (const pagamento of validatedData.pagamentos) {
          await trx('fis_18_pagamentos_documento').insert({
            id_documento: documentId,
            ...pagamento,
            created_at: new Date()
          });
        }
      }

      // Log creation event
      await trx('fis_19_eventos_documento').insert({
        id_documento: documentId,
        tipo_evento: 'CRIACAO',
        descricao: 'Documento fiscal criado no sistema',
        data_evento: new Date(),
        id_usuario: req.user?.id || validatedData.id_usuario_criacao
      });

      await trx.commit();

      res.status(201).json({
        success: true,
        data: { 
          id_documento: documentId, 
          numero_documento: nextNumber,
          tipo_documento: validatedData.tipo_documento
        },
        message: 'Documento fiscal criado com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos para criação do documento fiscal',
          details: error.errors
        });
      }

      console.error('Error creating fiscal document:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar documento fiscal',
        details: error.message
      });
    }
  }

  // Update fiscal document
  async update(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      
      // Validate input
      const validatedData = fiscalDocumentUpdateSchema.parse(req.body);

      // Check if document exists and can be updated
      const existingDocument = await trx('fis_14_documentos_fiscais')
        .where('id_documento', id)
        .first();

      if (!existingDocument) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Documento fiscal não encontrado'
        });
      }

      // Check if document can be updated
      if (existingDocument.status === 'AUTORIZADO' || existingDocument.status === 'CANCELADO') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Documento autorizado ou cancelado não pode ser alterado'
        });
      }

      // Update main document record
      await trx('fis_14_documentos_fiscais')
        .where('id_documento', id)
        .update({
          ...validatedData,
          id_usuario_atualizacao: req.user?.id,
          updated_at: new Date()
        });

      // Update items if provided
      if (validatedData.itens) {
        // Delete existing items and related data
        await trx('fis_15_itens_documento_fiscal').where('id_documento', id).del();
        await trx('fis_16_totais_tributos_documento').where('id_documento', id).del();
        
        // Insert new items
        let totalProdutos = 0;
        let totalTributos = 0;
        let totalDesconto = 0;

        for (let i = 0; i < validatedData.itens.length; i++) {
          const item = validatedData.itens[i];
          
          const valorTotal = item.quantidade * item.valor_unitario;
          const desconto = item.desconto || 0;
          const valorLiquido = valorTotal - desconto;

          await trx('fis_15_itens_documento_fiscal').insert({
            id_documento: id,
            numero_item: i + 1,
            ...item,
            valor_total: valorTotal,
            valor_liquido: valorLiquido,
            created_at: new Date()
          });

          totalProdutos += valorLiquido;
          totalDesconto += desconto;
          totalTributos += item.valor_total_tributos || 0;
        }

        // Insert updated tax totals
        await trx('fis_16_totais_tributos_documento').insert({
          id_documento: id,
          valor_total_produtos: totalProdutos,
          valor_total_descontos: totalDesconto,
          valor_total_tributos: totalTributos,
          valor_total_documento: totalProdutos + totalTributos,
          created_at: new Date()
        });
      }

      // Log update event
      await trx('fis_19_eventos_documento').insert({
        id_documento: id,
        tipo_evento: 'ALTERACAO',
        descricao: 'Documento fiscal alterado no sistema',
        data_evento: new Date(),
        id_usuario: req.user?.id
      });

      await trx.commit();

      res.json({
        success: true,
        message: 'Documento fiscal atualizado com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos para atualização do documento fiscal',
          details: error.errors
        });
      }

      console.error('Error updating fiscal document:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao atualizar documento fiscal',
        details: error.message
      });
    }
  }

  // Cancel fiscal document
  async cancel(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { motivo_cancelamento } = req.body;

      if (!motivo_cancelamento || motivo_cancelamento.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Motivo de cancelamento deve ter pelo menos 10 caracteres'
        });
      }

      const document = await trx('fis_14_documentos_fiscais')
        .where('id_documento', id)
        .first();

      if (!document) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Documento fiscal não encontrado'
        });
      }

      // Check if document can be cancelled
      if (document.status !== 'AUTORIZADO') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Apenas documentos autorizados podem ser cancelados'
        });
      }

      // Update status to cancelling
      await trx('fis_14_documentos_fiscais')
        .where('id_documento', id)
        .update({
          status: 'CANCELANDO',
          motivo_cancelamento: motivo_cancelamento,
          data_cancelamento: new Date(),
          id_usuario_atualizacao: req.user?.id,
          updated_at: new Date()
        });

      // Log cancellation event
      await trx('fis_19_eventos_documento').insert({
        id_documento: id,
        tipo_evento: 'CANCELAMENTO',
        descricao: `Solicitação de cancelamento: ${motivo_cancelamento}`,
        data_evento: new Date(),
        id_usuario: req.user?.id
      });

      await trx.commit();

      res.json({
        success: true,
        message: 'Solicitação de cancelamento processada com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error cancelling fiscal document:', error);
      res.status(500).json({
        success: false,
        error: 'CANCELLATION_ERROR',
        message: 'Erro ao cancelar documento fiscal',
        details: error.message
      });
    }
  }

  // Generate fiscal document from business document (quote, order, etc.)
  async generateFromSource(req, res) {
    const trx = await db.transaction();
    
    try {
      const { tipo_origem, id_origem, tipo_documento_fiscal } = req.body;

      if (!tipo_origem || !id_origem || !tipo_documento_fiscal) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Tipo de origem, ID de origem e tipo de documento fiscal são obrigatórios'
        });
      }

      // Get source document data based on type
      let sourceData;
      switch (tipo_origem) {
        case 'PEDIDO_VENDA':
          sourceData = await this.getOrderData(id_origem, trx);
          break;
        case 'PEDIDO_COMPRA':
          sourceData = await this.getPurchaseOrderData(id_origem, trx);
          break;
        case 'ORCAMENTO':
          sourceData = await this.getQuoteData(id_origem, trx);
          break;
        default:
          throw new Error('Tipo de origem não suportado');
      }

      if (!sourceData) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'SOURCE_NOT_FOUND',
          message: 'Documento de origem não encontrado'
        });
      }

      // Generate fiscal document data from source
      const fiscalDocumentData = await this.generateFiscalDocumentFromSource(
        sourceData, 
        tipo_documento_fiscal, 
        req.user?.id
      );

      // Create the fiscal document
      const documentData = {
        ...fiscalDocumentData,
        documento_origem_tipo: tipo_origem,
        documento_origem_id: id_origem,
        status: 'DIGITACAO',
        id_usuario_criacao: req.user?.id,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [documentId] = await trx('fis_14_documentos_fiscais')
        .insert(documentData)
        .returning('id_documento');

      // Log generation event
      await trx('fis_19_eventos_documento').insert({
        id_documento: documentId,
        tipo_evento: 'GERACAO_AUTOMATICA',
        descricao: `Documento gerado a partir de ${tipo_origem} #${id_origem}`,
        data_evento: new Date(),
        id_usuario: req.user?.id
      });

      await trx.commit();

      res.status(201).json({
        success: true,
        data: { 
          id_documento: documentId,
          documento_origem: { tipo: tipo_origem, id: id_origem }
        },
        message: 'Documento fiscal gerado com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error generating fiscal document from source:', error);
      res.status(500).json({
        success: false,
        error: 'GENERATION_ERROR',
        message: 'Erro ao gerar documento fiscal',
        details: error.message
      });
    }
  }

  // Get fiscal documents statistics
  async getStats(req, res) {
    try {
      const filters = {
        id_empresa: req.query.id_empresa || '',
        periodo: req.query.periodo || '30' // days
      };

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - parseInt(filters.periodo));

      let query = db('fis_14_documentos_fiscais');
      
      if (filters.id_empresa) {
        query = query.where('id_empresa', filters.id_empresa);
      }

      // Total documents
      const totalDocuments = await query.clone()
        .count('* as count')
        .first();

      // Documents by type
      const documentsByType = await query.clone()
        .select('tipo_documento')
        .count('* as count')
        .groupBy('tipo_documento');

      // Documents by status
      const documentsByStatus = await query.clone()
        .select('status')
        .count('* as count')
        .groupBy('status');

      // Documents in period
      const documentsInPeriod = await query.clone()
        .where('data_emissao', '>=', dateFrom)
        .count('* as count')
        .first();

      // Total values
      const totalValues = await query.clone()
        .join('fis_16_totais_tributos_documento as tt', 'fis_14_documentos_fiscais.id_documento', 'tt.id_documento')
        .sum('tt.valor_total_produtos as produtos')
        .sum('tt.valor_total_tributos as tributos')
        .sum('tt.valor_total_documento as total')
        .first();

      // Recent activity
      const recentActivity = await db('fis_19_eventos_documento as ed')
        .leftJoin('fis_14_documentos_fiscais as df', 'ed.id_documento', 'df.id_documento')
        .leftJoin('cad_05_usuarios as u', 'ed.id_usuario', 'u.id_usuario')
        .select(
          'ed.tipo_evento',
          'ed.descricao',
          'ed.data_evento',
          'df.numero_documento',
          'df.tipo_documento',
          'u.nome as usuario_nome'
        )
        .where('ed.data_evento', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .orderBy('ed.data_evento', 'desc')
        .limit(10);

      res.json({
        success: true,
        data: {
          total_documentos: parseInt(totalDocuments.count),
          documentos_periodo: parseInt(documentsInPeriod.count),
          por_tipo: documentsByType.map(d => ({
            tipo: d.tipo_documento,
            quantidade: parseInt(d.count)
          })),
          por_status: documentsByStatus.map(d => ({
            status: d.status,
            quantidade: parseInt(d.count)
          })),
          valores: {
            total_produtos: parseFloat(totalValues.produtos) || 0,
            total_tributos: parseFloat(totalValues.tributos) || 0,
            total_geral: parseFloat(totalValues.total) || 0
          },
          atividade_recente: recentActivity
        }
      });

    } catch (error) {
      console.error('Error fetching fiscal documents stats:', error);
      res.status(500).json({
        success: false,
        error: 'STATS_ERROR',
        message: 'Erro ao buscar estatísticas de documentos fiscais',
        details: error.message
      });
    }
  }

  // Helper methods for source document retrieval
  async getOrderData(orderId, trx) {
    return await trx('vnd_01_pedidos_venda')
      .leftJoin('cad_03_clientes as c', 'vnd_01_pedidos_venda.id_cliente', 'c.id_cliente')
      .select('vnd_01_pedidos_venda.*', 'c.*')
      .where('vnd_01_pedidos_venda.id_pedido', orderId)
      .first();
  }

  async getPurchaseOrderData(orderId, trx) {
    return await trx('cmp_01_pedidos_compra')
      .leftJoin('cad_04_fornecedores as f', 'cmp_01_pedidos_compra.id_fornecedor', 'f.id_fornecedor')
      .select('cmp_01_pedidos_compra.*', 'f.*')
      .where('cmp_01_pedidos_compra.id_pedido', orderId)
      .first();
  }

  async getQuoteData(quoteId, trx) {
    return await trx('vnd_02_orcamentos')
      .leftJoin('cad_03_clientes as c', 'vnd_02_orcamentos.id_cliente', 'c.id_cliente')
      .select('vnd_02_orcamentos.*', 'c.*')
      .where('vnd_02_orcamentos.id_orcamento', quoteId)
      .first();
  }

  async generateFiscalDocumentFromSource(sourceData, documentType, userId) {
    // This would contain the business logic to convert
    // source document data into fiscal document format
    // For demo purposes, we'll return a basic structure
    return {
      id_empresa: sourceData.id_empresa,
      tipo_documento: documentType,
      modelo_documento: '55', // NFe
      serie: '1',
      data_emissao: new Date(),
      id_parceiro: sourceData.id_cliente || sourceData.id_fornecedor,
      tipo_parceiro: sourceData.id_cliente ? 'CLIENTE' : 'FORNECEDOR',
      natureza_operacao: 'Venda de mercadoria',
      tipo_operacao: 'SAIDA',
      finalidade_emissao: 'NORMAL'
    };
  }
}

module.exports = new FiscalDocumentsController();