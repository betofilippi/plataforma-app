const db = require('../../../src/database/connection');
const { salesOrderSchema, salesOrderUpdateSchema } = require('../services/validationService');
const { z } = require('zod');

// Sales Orders Controller - Complete sales order management
class SalesOrdersController {
  // Get all sales orders with advanced filtering and pagination
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
        forma_pagamento: req.query.forma_pagamento || ''
      };

      // Base query with joins
      let query = db('vnd_01_pedidos_venda as pv')
        .leftJoin('cad_03_clientes as c', 'pv.id_cliente', 'c.id_cliente')
        .leftJoin('cad_01_empresas as e', 'pv.id_empresa', 'e.id_empresa')
        .leftJoin('cad_05_usuarios as v', 'pv.id_vendedor', 'v.id_usuario')
        .leftJoin('cad_05_usuarios as u', 'pv.id_usuario_criacao', 'u.id_usuario')
        .select(
          'pv.*',
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
          this.where('pv.numero_pedido', 'ilike', `%${filters.search}%`)
              .orWhere('c.nome_razao_social', 'ilike', `%${filters.search}%`)
              .orWhere('c.cnpj_cpf', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.status) {
        query = query.where('pv.status', filters.status);
      }

      if (filters.id_cliente) {
        query = query.where('pv.id_cliente', filters.id_cliente);
      }

      if (filters.id_vendedor) {
        query = query.where('pv.id_vendedor', filters.id_vendedor);
      }

      if (filters.data_inicial) {
        query = query.where('pv.data_pedido', '>=', filters.data_inicial);
      }

      if (filters.data_final) {
        query = query.where('pv.data_pedido', '<=', filters.data_final);
      }

      if (filters.forma_pagamento) {
        query = query.where('pv.forma_pagamento', 'ilike', `%${filters.forma_pagamento}%`);
      }

      // Count total records
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting
      const sortField = req.query.sort || 'data_pedido';
      const sortOrder = req.query.order || 'desc';
      query = query.orderBy(`pv.${sortField}`, sortOrder);

      // Apply pagination
      const salesOrders = await query.limit(limit).offset(offset);

      // Get items and totals for each sales order
      for (const order of salesOrders) {
        const itemsData = await db('vnd_02_itens_pedido_venda as ipv')
          .leftJoin('prd_03_produtos as p', 'ipv.id_produto', 'p.id_produto')
          .leftJoin('prd_02_unidades as u', 'p.id_unidade', 'u.id_unidade')
          .select(
            'ipv.*',
            'p.descricao as produto_descricao',
            'p.codigo_produto',
            'u.sigla as unidade_sigla'
          )
          .where('ipv.id_pedido_venda', order.id_pedido_venda);
        
        order.itens = itemsData;
        
        // Calculate totals
        const subtotal = itemsData.reduce((sum, item) => 
          sum + (item.quantidade * item.preco_unitario * (1 - (item.desconto_percentual || 0) / 100)), 0);
        const descontoGeral = subtotal * ((order.desconto_geral || 0) / 100);
        order.valor_subtotal = subtotal;
        order.valor_desconto = descontoGeral;
        order.valor_total = subtotal - descontoGeral + (order.valor_frete || 0);
      }

      res.json({
        success: true,
        data: salesOrders,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching sales orders:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar pedidos de venda',
        details: error.message
      });
    }
  }

  // Get sales order by ID with full details
  async getById(req, res) {
    try {
      const { id } = req.params;

      const salesOrder = await db('vnd_01_pedidos_venda as pv')
        .leftJoin('cad_03_clientes as c', 'pv.id_cliente', 'c.id_cliente')
        .leftJoin('cad_01_empresas as e', 'pv.id_empresa', 'e.id_empresa')
        .leftJoin('cad_05_usuarios as v', 'pv.id_vendedor', 'v.id_usuario')
        .leftJoin('cad_05_usuarios as u', 'pv.id_usuario_criacao', 'u.id_usuario')
        .leftJoin('cad_06_listas_precos as lp', 'pv.id_lista_precos', 'lp.id_lista_precos')
        .select(
          'pv.*',
          'c.nome_razao_social as cliente_nome',
          'c.cnpj_cpf as cliente_documento',
          'c.email as cliente_email',
          'c.telefone as cliente_telefone',
          'c.endereco as cliente_endereco',
          'e.nome_fantasia as empresa_nome',
          'v.nome as vendedor_nome',
          'v.email as vendedor_email',
          'u.nome as criado_por',
          'lp.nome as lista_precos_nome'
        )
        .where('pv.id_pedido_venda', id)
        .first();

      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Pedido de venda não encontrado'
        });
      }

      // Get items
      const items = await db('vnd_02_itens_pedido_venda as ipv')
        .leftJoin('prd_03_produtos as p', 'ipv.id_produto', 'p.id_produto')
        .leftJoin('prd_02_unidades as u', 'p.id_unidade', 'u.id_unidade')
        .select(
          'ipv.*',
          'p.descricao as produto_descricao',
          'p.codigo_produto',
          'p.preco_venda',
          'u.sigla as unidade_sigla'
        )
        .where('ipv.id_pedido_venda', id);

      // Get order history/status changes
      const history = await db('vnd_03_historico_pedidos')
        .leftJoin('cad_05_usuarios as u', 'vnd_03_historico_pedidos.id_usuario', 'u.id_usuario')
        .select(
          'vnd_03_historico_pedidos.*',
          'u.nome as usuario_nome'
        )
        .where('id_pedido_venda', id)
        .orderBy('data_alteracao', 'desc');

      salesOrder.itens = items;
      salesOrder.historico = history;
      
      // Calculate totals
      const subtotal = items.reduce((sum, item) => 
        sum + (item.quantidade * item.preco_unitario * (1 - (item.desconto_percentual || 0) / 100)), 0);
      const descontoGeral = subtotal * ((salesOrder.desconto_geral || 0) / 100);
      salesOrder.valor_subtotal = subtotal;
      salesOrder.valor_desconto = descontoGeral;
      salesOrder.valor_total = subtotal - descontoGeral + (salesOrder.valor_frete || 0);

      res.json({
        success: true,
        data: salesOrder
      });

    } catch (error) {
      console.error('Error fetching sales order:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar pedido de venda',
        details: error.message
      });
    }
  }

  // Create new sales order
  async create(req, res) {
    const trx = await db.transaction();
    
    try {
      // Validate input
      const validatedData = salesOrderSchema.parse(req.body);
      
      // Generate sales order number
      const lastOrder = await trx('vnd_01_pedidos_venda')
        .orderBy('id_pedido_venda', 'desc')
        .first();
      
      const nextNumber = lastOrder ? 
        parseInt(lastOrder.numero_pedido.replace(/\D/g, '')) + 1 : 1;
      const numeroPedido = `PV${String(nextNumber).padStart(6, '0')}`;

      // Calculate totals
      const subtotal = validatedData.itens.reduce((sum, item) => 
        sum + (item.quantidade * item.preco_unitario * (1 - (item.desconto_percentual || 0) / 100)), 0);
      const descontoGeral = subtotal * ((validatedData.desconto_geral || 0) / 100);
      const valorTotal = subtotal - descontoGeral + (validatedData.valor_frete || 0);

      // Insert sales order
      const [salesOrderId] = await trx('vnd_01_pedidos_venda').insert({
        numero_pedido: numeroPedido,
        id_cliente: validatedData.id_cliente,
        id_empresa: validatedData.id_empresa,
        id_vendedor: validatedData.id_vendedor,
        id_lista_precos: validatedData.id_lista_precos,
        id_usuario_criacao: req.user?.id,
        data_pedido: new Date(),
        data_entrega: validatedData.data_entrega,
        observacoes: validatedData.observacoes,
        observacoes_internas: validatedData.observacoes_internas,
        status: 'PENDENTE',
        condicao_pagamento: validatedData.condicao_pagamento,
        forma_pagamento: validatedData.forma_pagamento,
        prazo_entrega: validatedData.prazo_entrega,
        local_entrega: validatedData.local_entrega,
        valor_frete: validatedData.valor_frete || 0,
        desconto_geral: validatedData.desconto_geral || 0,
        valor_subtotal: subtotal,
        valor_total: valorTotal,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id_pedido_venda');

      // Insert items
      for (const item of validatedData.itens) {
        await trx('vnd_02_itens_pedido_venda').insert({
          id_pedido_venda: salesOrderId,
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

      // Create history entry
      await trx('vnd_03_historico_pedidos').insert({
        id_pedido_venda: salesOrderId,
        id_usuario: req.user?.id,
        status_anterior: null,
        status_novo: 'PENDENTE',
        observacoes: 'Pedido criado',
        data_alteracao: new Date(),
        created_at: new Date()
      });

      await trx.commit();

      // Fetch created sales order with details
      const createdOrder = await this.getOrderDetails(salesOrderId);

      res.status(201).json({
        success: true,
        data: createdOrder,
        message: 'Pedido de venda criado com sucesso'
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

      console.error('Error creating sales order:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar pedido de venda',
        details: error.message
      });
    }
  }

  // Update sales order status
  async updateStatus(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { status, observacoes } = req.body;

      const validStatuses = ['PENDENTE', 'CONFIRMADO', 'PRODUCAO', 'SEPARACAO', 'FATURADO', 'ENTREGUE', 'CANCELADO'];
      if (!validStatuses.includes(status)) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Status inválido'
        });
      }

      const existingOrder = await trx('vnd_01_pedidos_venda')
        .where('id_pedido_venda', id)
        .first();

      if (!existingOrder) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Pedido de venda não encontrado'
        });
      }

      // Update order status
      await trx('vnd_01_pedidos_venda')
        .where('id_pedido_venda', id)
        .update({
          status,
          updated_at: new Date()
        });

      // Create history entry
      await trx('vnd_03_historico_pedidos').insert({
        id_pedido_venda: id,
        id_usuario: req.user?.id,
        status_anterior: existingOrder.status,
        status_novo: status,
        observacoes: observacoes || `Status alterado para ${status}`,
        data_alteracao: new Date(),
        created_at: new Date()
      });

      await trx.commit();

      res.json({
        success: true,
        message: `Status do pedido atualizado para ${status}`
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error updating sales order status:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao atualizar status do pedido',
        details: error.message
      });
    }
  }

  // Cancel sales order
  async cancel(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      const existingOrder = await trx('vnd_01_pedidos_venda')
        .where('id_pedido_venda', id)
        .first();

      if (!existingOrder) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Pedido de venda não encontrado'
        });
      }

      if (existingOrder.status === 'ENTREGUE') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Não é possível cancelar pedido já entregue'
        });
      }

      // Update order status
      await trx('vnd_01_pedidos_venda')
        .where('id_pedido_venda', id)
        .update({
          status: 'CANCELADO',
          observacoes: motivo,
          updated_at: new Date()
        });

      // Create history entry
      await trx('vnd_03_historico_pedidos').insert({
        id_pedido_venda: id,
        id_usuario: req.user?.id,
        status_anterior: existingOrder.status,
        status_novo: 'CANCELADO',
        observacoes: motivo || 'Pedido cancelado',
        data_alteracao: new Date(),
        created_at: new Date()
      });

      await trx.commit();

      res.json({
        success: true,
        message: 'Pedido de venda cancelado com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error canceling sales order:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao cancelar pedido de venda',
        details: error.message
      });
    }
  }

  // Get sales statistics
  async getStats(req, res) {
    try {
      // Total sales orders
      const totalOrders = await db('vnd_01_pedidos_venda')
        .count('* as count')
        .first();

      // Orders by status
      const ordersByStatus = await db('vnd_01_pedidos_venda')
        .select('status')
        .count('* as count')
        .groupBy('status');

      // Orders this month
      const thisMonth = await db('vnd_01_pedidos_venda')
        .whereRaw('EXTRACT(MONTH FROM data_pedido) = EXTRACT(MONTH FROM CURRENT_DATE)')
        .whereRaw('EXTRACT(YEAR FROM data_pedido) = EXTRACT(YEAR FROM CURRENT_DATE)')
        .count('* as count')
        .sum('valor_total as valor')
        .first();

      // Top selling products
      const topProducts = await db('vnd_02_itens_pedido_venda as ipv')
        .leftJoin('prd_03_produtos as p', 'ipv.id_produto', 'p.id_produto')
        .leftJoin('vnd_01_pedidos_venda as pv', 'ipv.id_pedido_venda', 'pv.id_pedido_venda')
        .select('p.descricao as produto', 'p.codigo_produto')
        .sum('ipv.quantidade as total_vendido')
        .sum(db.raw('ipv.quantidade * ipv.preco_unitario * (1 - COALESCE(ipv.desconto_percentual, 0) / 100) as valor_total'))
        .where('pv.status', '!=', 'CANCELADO')
        .groupBy('p.id_produto', 'p.descricao', 'p.codigo_produto')
        .orderBy('total_vendido', 'desc')
        .limit(5);

      // Top customers
      const topCustomers = await db('vnd_01_pedidos_venda as pv')
        .leftJoin('cad_03_clientes as c', 'pv.id_cliente', 'c.id_cliente')
        .select('c.nome_razao_social as cliente', 'c.id_cliente')
        .sum('pv.valor_total as valor_total')
        .count('pv.id_pedido_venda as total_pedidos')
        .where('pv.status', '!=', 'CANCELADO')
        .groupBy('c.id_cliente', 'c.nome_razao_social')
        .orderBy('valor_total', 'desc')
        .limit(5);

      res.json({
        success: true,
        data: {
          total_pedidos: parseInt(totalOrders.count),
          pedidos_mes: parseInt(thisMonth.count),
          faturamento_mes: parseFloat(thisMonth.valor) || 0,
          por_status: ordersByStatus.map(s => ({
            status: s.status,
            quantidade: parseInt(s.count)
          })),
          produtos_mais_vendidos: topProducts.map(p => ({
            produto: p.produto,
            codigo: p.codigo_produto,
            quantidade: parseInt(p.total_vendido),
            valor_total: parseFloat(p.valor_total)
          })),
          principais_clientes: topCustomers.map(c => ({
            cliente: c.cliente,
            valor_total: parseFloat(c.valor_total),
            total_pedidos: parseInt(c.total_pedidos)
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching sales stats:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar estatísticas de vendas',
        details: error.message
      });
    }
  }

  // Helper method to get order details
  async getOrderDetails(id) {
    const order = await db('vnd_01_pedidos_venda as pv')
      .leftJoin('cad_03_clientes as c', 'pv.id_cliente', 'c.id_cliente')
      .leftJoin('cad_01_empresas as e', 'pv.id_empresa', 'e.id_empresa')
      .leftJoin('cad_05_usuarios as v', 'pv.id_vendedor', 'v.id_usuario')
      .select(
        'pv.*',
        'c.nome_razao_social as cliente_nome',
        'e.nome_fantasia as empresa_nome',
        'v.nome as vendedor_nome'
      )
      .where('pv.id_pedido_venda', id)
      .first();

    if (order) {
      const items = await db('vnd_02_itens_pedido_venda as ipv')
        .leftJoin('prd_03_produtos as p', 'ipv.id_produto', 'p.id_produto')
        .select('ipv.*', 'p.descricao as produto_descricao', 'p.codigo_produto')
        .where('ipv.id_pedido_venda', id);
      
      order.itens = items;
    }

    return order;
  }
}

module.exports = new SalesOrdersController();