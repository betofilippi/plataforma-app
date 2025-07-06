const db = require('../../../src/database/connection');
const { quotationSchema } = require('../services/validationService');
const { z } = require('zod');

// Quotations Controller - Manage supplier quotations
class QuotationsController {
  // Get all quotations with filtering and pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const filters = {
        search: req.query.search || '',
        status: req.query.status || '',
        id_fornecedor: req.query.id_fornecedor || '',
        data_inicial: req.query.data_inicial || '',
        data_final: req.query.data_final || '',
        vencidas: req.query.vencidas || ''
      };

      let query = db('cmp_04_cotacoes as c')
        .leftJoin('cad_04_fornecedores as f', 'c.id_fornecedor', 'f.id_fornecedor')
        .leftJoin('cad_01_empresas as e', 'c.id_empresa', 'e.id_empresa')
        .leftJoin('cad_05_usuarios as u', 'c.id_usuario_solicitante', 'u.id_usuario')
        .select(
          'c.*',
          'f.nome_razao_social as fornecedor_nome',
          'f.cnpj_cpf as fornecedor_documento',
          'e.nome_fantasia as empresa_nome',
          'u.nome as solicitante_nome'
        );

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('c.numero_cotacao', 'ilike', `%${filters.search}%`)
              .orWhere('c.descricao', 'ilike', `%${filters.search}%`)
              .orWhere('f.nome_razao_social', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.status) {
        query = query.where('c.status', filters.status);
      }

      if (filters.id_fornecedor) {
        query = query.where('c.id_fornecedor', filters.id_fornecedor);
      }

      if (filters.data_inicial) {
        query = query.where('c.data_cotacao', '>=', filters.data_inicial);
      }

      if (filters.data_final) {
        query = query.where('c.data_cotacao', '<=', filters.data_final);
      }

      if (filters.vencidas === 'true') {
        query = query.where('c.data_validade', '<', new Date());
      }

      // Count total records
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting and pagination
      const sortField = req.query.sort || 'data_cotacao';
      const sortOrder = req.query.order || 'desc';
      
      const quotations = await query
        .orderBy(`c.${sortField}`, sortOrder)
        .limit(limit)
        .offset(offset);

      // Get items count for each quotation
      for (const quotation of quotations) {
        const itemsCount = await db('cmp_05_itens_cotacao')
          .where('id_cotacao', quotation.id_cotacao)
          .count('* as count')
          .first();
        
        quotation.total_itens = parseInt(itemsCount.count);

        // Calculate total value
        const totalValue = await db('cmp_05_itens_cotacao')
          .where('id_cotacao', quotation.id_cotacao)
          .sum(db.raw('quantidade * preco_unitario * (1 - COALESCE(desconto_percentual, 0) / 100)'))
          .first();
        
        quotation.valor_total = parseFloat(totalValue.sum) || 0;
      }

      res.json({
        success: true,
        data: quotations,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching quotations:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar cotações',
        details: error.message
      });
    }
  }

  // Get quotation by ID with full details
  async getById(req, res) {
    try {
      const { id } = req.params;

      const quotation = await db('cmp_04_cotacoes as c')
        .leftJoin('cad_04_fornecedores as f', 'c.id_fornecedor', 'f.id_fornecedor')
        .leftJoin('cad_01_empresas as e', 'c.id_empresa', 'e.id_empresa')
        .leftJoin('cad_05_usuarios as u', 'c.id_usuario_solicitante', 'u.id_usuario')
        .select(
          'c.*',
          'f.nome_razao_social as fornecedor_nome',
          'f.cnpj_cpf as fornecedor_documento',
          'f.email as fornecedor_email',
          'f.telefone as fornecedor_telefone',
          'e.nome_fantasia as empresa_nome',
          'u.nome as solicitante_nome'
        )
        .where('c.id_cotacao', id)
        .first();

      if (!quotation) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Cotação não encontrada'
        });
      }

      // Get items
      const items = await db('cmp_05_itens_cotacao as ic')
        .leftJoin('prd_03_produtos as p', 'ic.id_produto', 'p.id_produto')
        .leftJoin('prd_02_unidades as u', 'p.id_unidade', 'u.id_unidade')
        .select(
          'ic.*',
          'p.descricao as produto_descricao',
          'p.codigo_produto',
          'p.preco_custo',
          'u.sigla as unidade_sigla'
        )
        .where('ic.id_cotacao', id);

      quotation.itens = items;
      quotation.valor_total = items.reduce((sum, item) => 
        sum + (item.quantidade * item.preco_unitario * (1 - (item.desconto_percentual || 0) / 100)), 0);

      res.json({
        success: true,
        data: quotation
      });

    } catch (error) {
      console.error('Error fetching quotation:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar cotação',
        details: error.message
      });
    }
  }

  // Create new quotation
  async create(req, res) {
    const trx = await db.transaction();
    
    try {
      const validatedData = quotationSchema.parse(req.body);
      
      // Check if quotation number already exists
      const existingQuotation = await trx('cmp_04_cotacoes')
        .where('numero_cotacao', validatedData.numero_cotacao)
        .first();

      if (existingQuotation) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'DUPLICATE_QUOTATION',
          message: 'Número de cotação já existe'
        });
      }

      // Insert quotation
      const [quotationId] = await trx('cmp_04_cotacoes').insert({
        numero_cotacao: validatedData.numero_cotacao,
        id_fornecedor: validatedData.id_fornecedor,
        id_empresa: validatedData.id_empresa,
        id_usuario_solicitante: req.user?.id || validatedData.id_usuario_solicitante,
        data_cotacao: new Date(),
        data_validade: validatedData.data_validade,
        descricao: validatedData.descricao,
        observacoes: validatedData.observacoes,
        condicao_pagamento: validatedData.condicao_pagamento,
        prazo_entrega: validatedData.prazo_entrega,
        frete_incluso: validatedData.frete_incluso || false,
        valor_frete: validatedData.valor_frete || 0,
        status: 'PENDENTE',
        ativo: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id_cotacao');

      // Insert items
      for (const item of validatedData.itens) {
        await trx('cmp_05_itens_cotacao').insert({
          id_cotacao: quotationId,
          id_produto: item.id_produto,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          desconto_percentual: item.desconto_percentual || 0,
          observacoes: item.observacoes,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      await trx.commit();

      // Fetch created quotation with details
      const createdQuotation = await this.getQuotationDetails(quotationId);

      res.status(201).json({
        success: true,
        data: createdQuotation,
        message: 'Cotação criada com sucesso'
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

      console.error('Error creating quotation:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar cotação',
        details: error.message
      });
    }
  }

  // Update quotation status
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, observacoes } = req.body;

      const validStatuses = ['PENDENTE', 'APROVADA', 'REJEITADA', 'VENCIDA'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Status inválido'
        });
      }

      const quotation = await db('cmp_04_cotacoes')
        .where('id_cotacao', id)
        .first();

      if (!quotation) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Cotação não encontrada'
        });
      }

      await db('cmp_04_cotacoes')
        .where('id_cotacao', id)
        .update({
          status,
          observacoes: observacoes || quotation.observacoes,
          updated_at: new Date()
        });

      res.json({
        success: true,
        message: `Status da cotação atualizado para ${status}`
      });

    } catch (error) {
      console.error('Error updating quotation status:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao atualizar status da cotação',
        details: error.message
      });
    }
  }

  // Convert quotation to purchase order
  async convertToPurchaseOrder(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;

      // Get quotation with items
      const quotation = await trx('cmp_04_cotacoes')
        .where('id_cotacao', id)
        .first();

      if (!quotation) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Cotação não encontrada'
        });
      }

      if (quotation.status !== 'APROVADA') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Apenas cotações aprovadas podem ser convertidas em pedidos'
        });
      }

      const items = await trx('cmp_05_itens_cotacao')
        .where('id_cotacao', id);

      // Generate purchase order number
      const lastOrder = await trx('cmp_01_pedidos_compra')
        .orderBy('id_pedido_compra', 'desc')
        .first();
      
      const nextNumber = lastOrder ? 
        parseInt(lastOrder.numero_pedido.replace(/\D/g, '')) + 1 : 1;
      const numeroPedido = `PC${String(nextNumber).padStart(6, '0')}`;

      // Create purchase order
      const [purchaseOrderId] = await trx('cmp_01_pedidos_compra').insert({
        numero_pedido: numeroPedido,
        id_fornecedor: quotation.id_fornecedor,
        id_empresa: quotation.id_empresa,
        id_usuario_solicitante: quotation.id_usuario_solicitante,
        data_pedido: new Date(),
        data_necessidade: quotation.data_validade,
        descricao: `Convertido da cotação ${quotation.numero_cotacao} - ${quotation.descricao}`,
        observacoes: quotation.observacoes,
        status: 'PENDENTE',
        urgente: false,
        condicao_pagamento: quotation.condicao_pagamento,
        prazo_entrega: quotation.prazo_entrega,
        aprovado: false,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id_pedido_compra');

      // Create purchase order items
      for (const item of items) {
        await trx('cmp_02_itens_pedido_compra').insert({
          id_pedido_compra: purchaseOrderId,
          id_produto: item.id_produto,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          desconto_percentual: item.desconto_percentual,
          observacoes: item.observacoes,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      // Update quotation status
      await trx('cmp_04_cotacoes')
        .where('id_cotacao', id)
        .update({
          status: 'CONVERTIDA',
          updated_at: new Date()
        });

      await trx.commit();

      res.json({
        success: true,
        data: { 
          id_pedido_compra: purchaseOrderId,
          numero_pedido: numeroPedido
        },
        message: 'Cotação convertida em pedido de compra com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error converting quotation to purchase order:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao converter cotação em pedido',
        details: error.message
      });
    }
  }

  // Get quotation statistics
  async getStats(req, res) {
    try {
      // Total quotations
      const total = await db('cmp_04_cotacoes')
        .count('* as count')
        .first();

      // Quotations by status
      const byStatus = await db('cmp_04_cotacoes')
        .select('status')
        .count('* as count')
        .groupBy('status');

      // Expired quotations
      const expired = await db('cmp_04_cotacoes')
        .where('data_validade', '<', new Date())
        .where('status', 'PENDENTE')
        .count('* as count')
        .first();

      // This month quotations
      const thisMonth = await db('cmp_04_cotacoes')
        .whereRaw('EXTRACT(MONTH FROM data_cotacao) = EXTRACT(MONTH FROM CURRENT_DATE)')
        .whereRaw('EXTRACT(YEAR FROM data_cotacao) = EXTRACT(YEAR FROM CURRENT_DATE)')
        .count('* as count')
        .first();

      // Average response time (in days)
      const avgResponseTime = await db('cmp_04_cotacoes')
        .whereNot('status', 'PENDENTE')
        .select(db.raw('AVG(EXTRACT(DAY FROM updated_at - created_at)) as avg_days'))
        .first();

      res.json({
        success: true,
        data: {
          total_cotacoes: parseInt(total.count),
          vencidas: parseInt(expired.count),
          cotacoes_mes: parseInt(thisMonth.count),
          tempo_resposta_medio: parseFloat(avgResponseTime.avg_days) || 0,
          por_status: byStatus.map(s => ({
            status: s.status,
            quantidade: parseInt(s.count)
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching quotation stats:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar estatísticas de cotações',
        details: error.message
      });
    }
  }

  // Helper method to get quotation details
  async getQuotationDetails(id) {
    const quotation = await db('cmp_04_cotacoes as c')
      .leftJoin('cad_04_fornecedores as f', 'c.id_fornecedor', 'f.id_fornecedor')
      .leftJoin('cad_01_empresas as e', 'c.id_empresa', 'e.id_empresa')
      .select(
        'c.*',
        'f.nome_razao_social as fornecedor_nome',
        'e.nome_fantasia as empresa_nome'
      )
      .where('c.id_cotacao', id)
      .first();

    if (quotation) {
      const items = await db('cmp_05_itens_cotacao as ic')
        .leftJoin('prd_03_produtos as p', 'ic.id_produto', 'p.id_produto')
        .select('ic.*', 'p.descricao as produto_descricao', 'p.codigo_produto')
        .where('ic.id_cotacao', id);
      
      quotation.itens = items;
    }

    return quotation;
  }
}

module.exports = new QuotationsController();