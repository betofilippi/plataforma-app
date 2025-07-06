const db = require('../../../src/database/connection');
const { salesQuotationSchema } = require('../services/validationService');
const { z } = require('zod');

// Sales Quotations Controller - Complete quotation management
class SalesQuotationsController {
  // Get all quotations with advanced filtering and pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // Parse and validate filters
      const filters = {
        search: req.query.search || '',
        status: req.query.status || '',
        id_cliente: req.query.id_cliente || '',
        id_vendedor: req.query.id_vendedor || '',
        data_inicial: req.query.data_inicial || '',
        data_final: req.query.data_final || '',
        valido: req.query.valido || ''
      };

      // Base query with joins
      let query = db('vnd_04_orcamentos as o')
        .leftJoin('cad_03_clientes as c', 'o.id_cliente', 'c.id_cliente')
        .leftJoin('cad_01_empresas as e', 'o.id_empresa', 'e.id_empresa')
        .leftJoin('cad_05_usuarios as v', 'o.id_vendedor', 'v.id_usuario')
        .leftJoin('cad_05_usuarios as u', 'o.id_usuario_criacao', 'u.id_usuario')
        .select(
          'o.*',
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
          this.where('o.numero_orcamento', 'ilike', `%${filters.search}%`)
              .orWhere('o.descricao', 'ilike', `%${filters.search}%`)
              .orWhere('c.nome_razao_social', 'ilike', `%${filters.search}%`)
              .orWhere('c.cnpj_cpf', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.status) {
        query = query.where('o.status', filters.status);
      }

      if (filters.id_cliente) {
        query = query.where('o.id_cliente', filters.id_cliente);
      }

      if (filters.id_vendedor) {
        query = query.where('o.id_vendedor', filters.id_vendedor);
      }

      if (filters.data_inicial) {
        query = query.where('o.data_orcamento', '>=', filters.data_inicial);
      }

      if (filters.data_final) {
        query = query.where('o.data_orcamento', '<=', filters.data_final);
      }

      if (filters.valido === 'true') {
        query = query.where('o.data_validade', '>=', new Date());
      } else if (filters.valido === 'false') {
        query = query.where('o.data_validade', '<', new Date());
      }

      // Count total records
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting
      const sortField = req.query.sort || 'data_orcamento';
      const sortOrder = req.query.order || 'desc';
      query = query.orderBy(`o.${sortField}`, sortOrder);

      // Apply pagination
      const quotations = await query.limit(limit).offset(offset);

      // Get items for each quotation
      for (const quotation of quotations) {
        const itemsData = await db('vnd_05_itens_orcamento as io')
          .leftJoin('prd_03_produtos as p', 'io.id_produto', 'p.id_produto')
          .leftJoin('prd_02_unidades as u', 'p.id_unidade', 'u.id_unidade')
          .select(
            'io.*',
            'p.descricao as produto_descricao',
            'p.codigo_produto',
            'u.sigla as unidade_sigla'
          )
          .where('io.id_orcamento', quotation.id_orcamento);
        
        quotation.itens = itemsData;
        
        // Calculate totals
        const subtotal = itemsData.reduce((sum, item) => 
          sum + (item.quantidade * item.preco_unitario * (1 - (item.desconto_percentual || 0) / 100)), 0);
        const descontoGeral = subtotal * ((quotation.desconto_geral || 0) / 100);
        quotation.valor_subtotal = subtotal;
        quotation.valor_desconto = descontoGeral;
        quotation.valor_total = subtotal - descontoGeral + (quotation.valor_frete || 0);
        
        // Check if quotation is valid
        quotation.valido = new Date(quotation.data_validade) >= new Date();
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
        message: 'Erro ao buscar orçamentos',
        details: error.message
      });
    }
  }

  // Get quotation by ID with full details
  async getById(req, res) {
    try {
      const { id } = req.params;

      const quotation = await db('vnd_04_orcamentos as o')
        .leftJoin('cad_03_clientes as c', 'o.id_cliente', 'c.id_cliente')
        .leftJoin('cad_01_empresas as e', 'o.id_empresa', 'e.id_empresa')
        .leftJoin('cad_05_usuarios as v', 'o.id_vendedor', 'v.id_usuario')
        .leftJoin('cad_05_usuarios as u', 'o.id_usuario_criacao', 'u.id_usuario')
        .select(
          'o.*',
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
        .where('o.id_orcamento', id)
        .first();

      if (!quotation) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Orçamento não encontrado'
        });
      }

      // Get items
      const items = await db('vnd_05_itens_orcamento as io')
        .leftJoin('prd_03_produtos as p', 'io.id_produto', 'p.id_produto')
        .leftJoin('prd_02_unidades as u', 'p.id_unidade', 'u.id_unidade')
        .select(
          'io.*',
          'p.descricao as produto_descricao',
          'p.codigo_produto',
          'p.preco_venda',
          'u.sigla as unidade_sigla'
        )
        .where('io.id_orcamento', id);

      quotation.itens = items;
      
      // Calculate totals
      const subtotal = items.reduce((sum, item) => 
        sum + (item.quantidade * item.preco_unitario * (1 - (item.desconto_percentual || 0) / 100)), 0);
      const descontoGeral = subtotal * ((quotation.desconto_geral || 0) / 100);
      quotation.valor_subtotal = subtotal;
      quotation.valor_desconto = descontoGeral;
      quotation.valor_total = subtotal - descontoGeral + (quotation.valor_frete || 0);
      
      // Check if quotation is valid
      quotation.valido = new Date(quotation.data_validade) >= new Date();

      res.json({
        success: true,
        data: quotation
      });

    } catch (error) {
      console.error('Error fetching quotation:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar orçamento',
        details: error.message
      });
    }
  }

  // Create new quotation
  async create(req, res) {
    const trx = await db.transaction();
    
    try {
      // Validate input
      const validatedData = salesQuotationSchema.parse(req.body);
      
      // Check if quotation number already exists
      const existingQuotation = await trx('vnd_04_orcamentos')
        .where('numero_orcamento', validatedData.numero_orcamento)
        .first();

      if (existingQuotation) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'DUPLICATE_NUMBER',
          message: 'Número do orçamento já existe'
        });
      }

      // Calculate totals
      const subtotal = validatedData.itens.reduce((sum, item) => 
        sum + (item.quantidade * item.preco_unitario * (1 - (item.desconto_percentual || 0) / 100)), 0);
      const descontoGeral = subtotal * ((validatedData.desconto_geral || 0) / 100);
      const valorTotal = subtotal - descontoGeral + (validatedData.valor_frete || 0);

      // Insert quotation
      const [quotationId] = await trx('vnd_04_orcamentos').insert({
        numero_orcamento: validatedData.numero_orcamento,
        id_cliente: validatedData.id_cliente,
        id_empresa: validatedData.id_empresa,
        id_vendedor: validatedData.id_vendedor,
        id_usuario_criacao: req.user?.id,
        descricao: validatedData.descricao,
        data_orcamento: new Date(),
        data_validade: validatedData.data_validade,
        observacoes: validatedData.observacoes,
        status: 'PENDENTE',
        condicao_pagamento: validatedData.condicao_pagamento,
        forma_pagamento: validatedData.forma_pagamento,
        prazo_entrega: validatedData.prazo_entrega,
        valor_frete: validatedData.valor_frete || 0,
        desconto_geral: validatedData.desconto_geral || 0,
        valor_subtotal: subtotal,
        valor_total: valorTotal,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id_orcamento');

      // Insert items
      for (const item of validatedData.itens) {
        await trx('vnd_05_itens_orcamento').insert({
          id_orcamento: quotationId,
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
        message: 'Orçamento criado com sucesso'
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
        message: 'Erro ao criar orçamento',
        details: error.message
      });
    }
  }

  // Update quotation status
  async updateStatus(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { status, observacoes } = req.body;

      const validStatuses = ['PENDENTE', 'APROVADO', 'REJEITADO', 'VENCIDO', 'CONVERTIDO'];
      if (!validStatuses.includes(status)) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Status inválido'
        });
      }

      const existingQuotation = await trx('vnd_04_orcamentos')
        .where('id_orcamento', id)
        .first();

      if (!existingQuotation) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Orçamento não encontrado'
        });
      }

      // Update quotation status
      await trx('vnd_04_orcamentos')
        .where('id_orcamento', id)
        .update({
          status,
          observacoes: observacoes || existingQuotation.observacoes,
          updated_at: new Date()
        });

      await trx.commit();

      res.json({
        success: true,
        message: `Status do orçamento atualizado para ${status}`
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error updating quotation status:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao atualizar status do orçamento',
        details: error.message
      });
    }
  }

  // Convert quotation to sales order
  async convertToSalesOrder(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;

      const quotation = await trx('vnd_04_orcamentos')
        .where('id_orcamento', id)
        .first();

      if (!quotation) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Orçamento não encontrado'
        });
      }

      if (quotation.status === 'CONVERTIDO') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'ALREADY_CONVERTED',
          message: 'Orçamento já foi convertido em pedido'
        });
      }

      // Check if quotation is still valid
      if (new Date(quotation.data_validade) < new Date()) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'EXPIRED_QUOTATION',
          message: 'Orçamento vencido não pode ser convertido'
        });
      }

      // Get quotation items
      const items = await trx('vnd_05_itens_orcamento')
        .where('id_orcamento', id);

      // Generate sales order number
      const lastOrder = await trx('vnd_01_pedidos_venda')
        .orderBy('id_pedido_venda', 'desc')
        .first();
      
      const nextNumber = lastOrder ? 
        parseInt(lastOrder.numero_pedido.replace(/\D/g, '')) + 1 : 1;
      const numeroPedido = `PV${String(nextNumber).padStart(6, '0')}`;

      // Create sales order
      const [salesOrderId] = await trx('vnd_01_pedidos_venda').insert({
        numero_pedido: numeroPedido,
        id_cliente: quotation.id_cliente,
        id_empresa: quotation.id_empresa,
        id_vendedor: quotation.id_vendedor,
        id_usuario_criacao: req.user?.id,
        id_orcamento_origem: id,
        data_pedido: new Date(),
        observacoes: `Convertido do orçamento ${quotation.numero_orcamento}`,
        status: 'PENDENTE',
        condicao_pagamento: quotation.condicao_pagamento,
        forma_pagamento: quotation.forma_pagamento,
        prazo_entrega: quotation.prazo_entrega,
        valor_frete: quotation.valor_frete,
        desconto_geral: quotation.desconto_geral,
        valor_subtotal: quotation.valor_subtotal,
        valor_total: quotation.valor_total,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id_pedido_venda');

      // Copy items to sales order
      for (const item of items) {
        await trx('vnd_02_itens_pedido_venda').insert({
          id_pedido_venda: salesOrderId,
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

      // Update quotation status to converted
      await trx('vnd_04_orcamentos')
        .where('id_orcamento', id)
        .update({
          status: 'CONVERTIDO',
          id_pedido_venda_gerado: salesOrderId,
          updated_at: new Date()
        });

      // Create history entry for sales order
      await trx('vnd_03_historico_pedidos').insert({
        id_pedido_venda: salesOrderId,
        id_usuario: req.user?.id,
        status_anterior: null,
        status_novo: 'PENDENTE',
        observacoes: `Pedido criado a partir do orçamento ${quotation.numero_orcamento}`,
        data_alteracao: new Date(),
        created_at: new Date()
      });

      await trx.commit();

      res.json({
        success: true,
        data: {
          id_pedido_venda: salesOrderId,
          numero_pedido: numeroPedido
        },
        message: 'Orçamento convertido em pedido de venda com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error converting quotation to sales order:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao converter orçamento em pedido',
        details: error.message
      });
    }
  }

  // Get quotation statistics
  async getStats(req, res) {
    try {
      // Total quotations
      const totalQuotations = await db('vnd_04_orcamentos')
        .count('* as count')
        .first();

      // Quotations by status
      const quotationsByStatus = await db('vnd_04_orcamentos')
        .select('status')
        .count('* as count')
        .groupBy('status');

      // Valid quotations
      const validQuotations = await db('vnd_04_orcamentos')
        .where('data_validade', '>=', new Date())
        .count('* as count')
        .sum('valor_total as valor')
        .first();

      // Conversion rate
      const convertedQuotations = await db('vnd_04_orcamentos')
        .where('status', 'CONVERTIDO')
        .count('* as count')
        .first();

      const conversionRate = totalQuotations.count > 0 ? 
        (convertedQuotations.count / totalQuotations.count * 100) : 0;

      // This month quotations
      const thisMonth = await db('vnd_04_orcamentos')
        .whereRaw('EXTRACT(MONTH FROM data_orcamento) = EXTRACT(MONTH FROM CURRENT_DATE)')
        .whereRaw('EXTRACT(YEAR FROM data_orcamento) = EXTRACT(YEAR FROM CURRENT_DATE)')
        .count('* as count')
        .sum('valor_total as valor')
        .first();

      res.json({
        success: true,
        data: {
          total_orcamentos: parseInt(totalQuotations.count),
          orcamentos_validos: parseInt(validQuotations.count),
          valor_orcamentos_validos: parseFloat(validQuotations.valor) || 0,
          taxa_conversao: parseFloat(conversionRate.toFixed(2)),
          orcamentos_mes: parseInt(thisMonth.count),
          valor_orcamentos_mes: parseFloat(thisMonth.valor) || 0,
          por_status: quotationsByStatus.map(s => ({
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
        message: 'Erro ao buscar estatísticas de orçamentos',
        details: error.message
      });
    }
  }

  // Helper method to get quotation details
  async getQuotationDetails(id) {
    const quotation = await db('vnd_04_orcamentos as o')
      .leftJoin('cad_03_clientes as c', 'o.id_cliente', 'c.id_cliente')
      .leftJoin('cad_01_empresas as e', 'o.id_empresa', 'e.id_empresa')
      .leftJoin('cad_05_usuarios as v', 'o.id_vendedor', 'v.id_usuario')
      .select(
        'o.*',
        'c.nome_razao_social as cliente_nome',
        'e.nome_fantasia as empresa_nome',
        'v.nome as vendedor_nome'
      )
      .where('o.id_orcamento', id)
      .first();

    if (quotation) {
      const items = await db('vnd_05_itens_orcamento as io')
        .leftJoin('prd_03_produtos as p', 'io.id_produto', 'p.id_produto')
        .select('io.*', 'p.descricao as produto_descricao', 'p.codigo_produto')
        .where('io.id_orcamento', id);
      
      quotation.itens = items;
      quotation.valido = new Date(quotation.data_validade) >= new Date();
    }

    return quotation;
  }
}

module.exports = new SalesQuotationsController();