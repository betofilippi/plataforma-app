const db = require('../../../src/database/connection');
const { purchaseOrderSchema, purchaseOrderUpdateSchema, purchaseOrderFiltersSchema } = require('../services/validationService');
const { z } = require('zod');

// Purchase Order Controller - Comprehensive CRUD and business logic
class PurchaseOrdersController {
  // Get all purchase orders with advanced filtering and pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // Parse and validate filters
      const filters = {
        search: req.query.search || '',
        status: req.query.status || '',
        id_fornecedor: req.query.id_fornecedor || '',
        data_inicial: req.query.data_inicial || '',
        data_final: req.query.data_final || '',
        aprovado: req.query.aprovado || '',
        urgente: req.query.urgente || '',
        centro_custo: req.query.centro_custo || ''
      };

      // Base query with joins
      let query = db('cmp_01_pedidos_compra as pc')
        .leftJoin('cad_04_fornecedores as f', 'pc.id_fornecedor', 'f.id_fornecedor')
        .leftJoin('cad_01_empresas as e', 'pc.id_empresa', 'e.id_empresa')
        .leftJoin('cad_05_usuarios as u', 'pc.id_usuario_solicitante', 'u.id_usuario')
        .select(
          'pc.*',
          'f.nome_razao_social as fornecedor_nome',
          'f.cnpj_cpf as fornecedor_documento',
          'e.nome_fantasia as empresa_nome',
          'u.nome as solicitante_nome'
        );

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('pc.numero_pedido', 'ilike', `%${filters.search}%`)
              .orWhere('pc.descricao', 'ilike', `%${filters.search}%`)
              .orWhere('f.nome_razao_social', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.status) {
        query = query.where('pc.status', filters.status);
      }

      if (filters.id_fornecedor) {
        query = query.where('pc.id_fornecedor', filters.id_fornecedor);
      }

      if (filters.data_inicial) {
        query = query.where('pc.data_pedido', '>=', filters.data_inicial);
      }

      if (filters.data_final) {
        query = query.where('pc.data_pedido', '<=', filters.data_final);
      }

      if (filters.aprovado !== '') {
        query = query.where('pc.aprovado', filters.aprovado === 'true');
      }

      if (filters.urgente !== '') {
        query = query.where('pc.urgente', filters.urgente === 'true');
      }

      if (filters.centro_custo) {
        query = query.where('pc.centro_custo', 'ilike', `%${filters.centro_custo}%`);
      }

      // Count total records
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting
      const sortField = req.query.sort || 'data_pedido';
      const sortOrder = req.query.order || 'desc';
      query = query.orderBy(`pc.${sortField}`, sortOrder);

      // Apply pagination
      const purchaseOrders = await query.limit(limit).offset(offset);

      // Get items for each purchase order
      for (const order of purchaseOrders) {
        const items = await db('cmp_02_itens_pedido_compra as ipc')
          .leftJoin('prd_03_produtos as p', 'ipc.id_produto', 'p.id_produto')
          .leftJoin('prd_02_unidades as u', 'p.id_unidade', 'u.id_unidade')
          .select(
            'ipc.*',
            'p.descricao as produto_descricao',
            'p.codigo_produto',
            'u.sigla as unidade_sigla'
          )
          .where('ipc.id_pedido_compra', order.id_pedido_compra);
        
        order.itens = items;
        order.valor_total = items.reduce((sum, item) => sum + (item.quantidade * item.preco_unitario), 0);
      }

      res.json({
        success: true,
        data: purchaseOrders,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar pedidos de compra',
        details: error.message
      });
    }
  }

  // Get purchase order by ID with full details
  async getById(req, res) {
    try {
      const { id } = req.params;

      const purchaseOrder = await db('cmp_01_pedidos_compra as pc')
        .leftJoin('cad_04_fornecedores as f', 'pc.id_fornecedor', 'f.id_fornecedor')
        .leftJoin('cad_01_empresas as e', 'pc.id_empresa', 'e.id_empresa')
        .leftJoin('cad_05_usuarios as u', 'pc.id_usuario_solicitante', 'u.id_usuario')
        .leftJoin('cad_05_usuarios as ua', 'pc.id_usuario_aprovador', 'ua.id_usuario')
        .select(
          'pc.*',
          'f.nome_razao_social as fornecedor_nome',
          'f.cnpj_cpf as fornecedor_documento',
          'f.email as fornecedor_email',
          'f.telefone as fornecedor_telefone',
          'e.nome_fantasia as empresa_nome',
          'u.nome as solicitante_nome',
          'ua.nome as aprovador_nome'
        )
        .where('pc.id_pedido_compra', id)
        .first();

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Pedido de compra não encontrado'
        });
      }

      // Get items
      const items = await db('cmp_02_itens_pedido_compra as ipc')
        .leftJoin('prd_03_produtos as p', 'ipc.id_produto', 'p.id_produto')
        .leftJoin('prd_02_unidades as u', 'p.id_unidade', 'u.id_unidade')
        .select(
          'ipc.*',
          'p.descricao as produto_descricao',
          'p.codigo_produto',
          'p.preco_custo',
          'u.sigla as unidade_sigla'
        )
        .where('ipc.id_pedido_compra', id);

      // Get approval history
      const approvalHistory = await db('cmp_03_aprovacoes_compra')
        .leftJoin('cad_05_usuarios as u', 'cmp_03_aprovacoes_compra.id_usuario', 'u.id_usuario')
        .select(
          'cmp_03_aprovacoes_compra.*',
          'u.nome as usuario_nome'
        )
        .where('id_pedido_compra', id)
        .orderBy('data_aprovacao', 'desc');

      purchaseOrder.itens = items;
      purchaseOrder.aprovacoes = approvalHistory;
      purchaseOrder.valor_total = items.reduce((sum, item) => sum + (item.quantidade * item.preco_unitario), 0);

      res.json({
        success: true,
        data: purchaseOrder
      });

    } catch (error) {
      console.error('Error fetching purchase order:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar pedido de compra',
        details: error.message
      });
    }
  }

  // Create new purchase order
  async create(req, res) {
    const trx = await db.transaction();
    
    try {
      // Validate input
      const validatedData = purchaseOrderSchema.parse(req.body);
      
      // Generate purchase order number
      const lastOrder = await trx('cmp_01_pedidos_compra')
        .orderBy('id_pedido_compra', 'desc')
        .first();
      
      const nextNumber = lastOrder ? 
        parseInt(lastOrder.numero_pedido.replace(/\D/g, '')) + 1 : 1;
      const numeroPedido = `PC${String(nextNumber).padStart(6, '0')}`;

      // Insert purchase order
      const [purchaseOrderId] = await trx('cmp_01_pedidos_compra').insert({
        numero_pedido: numeroPedido,
        id_fornecedor: validatedData.id_fornecedor,
        id_empresa: validatedData.id_empresa,
        id_usuario_solicitante: req.user?.id || validatedData.id_usuario_solicitante,
        data_pedido: new Date(),
        data_necessidade: validatedData.data_necessidade,
        descricao: validatedData.descricao,
        observacoes: validatedData.observacoes,
        status: 'PENDENTE',
        urgente: validatedData.urgente || false,
        centro_custo: validatedData.centro_custo,
        condicao_pagamento: validatedData.condicao_pagamento,
        forma_pagamento: validatedData.forma_pagamento,
        prazo_entrega: validatedData.prazo_entrega,
        local_entrega: validatedData.local_entrega,
        aprovado: false,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id_pedido_compra');

      // Insert items
      for (const item of validatedData.itens) {
        await trx('cmp_02_itens_pedido_compra').insert({
          id_pedido_compra: purchaseOrderId,
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

      // Create approval request if required
      const valorTotal = validatedData.itens.reduce((sum, item) => 
        sum + (item.quantidade * item.preco_unitario * (1 - (item.desconto_percentual || 0) / 100)), 0);

      if (valorTotal > 1000 || validatedData.urgente) {
        await trx('cmp_03_aprovacoes_compra').insert({
          id_pedido_compra: purchaseOrderId,
          status: 'PENDENTE',
          valor_total: valorTotal,
          observacoes: 'Aprovação automática necessária',
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      await trx.commit();

      // Fetch created purchase order with details
      const createdOrder = await this.getOrderDetails(purchaseOrderId);

      res.status(201).json({
        success: true,
        data: createdOrder,
        message: 'Pedido de compra criado com sucesso'
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

      console.error('Error creating purchase order:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar pedido de compra',
        details: error.message
      });
    }
  }

  // Update purchase order
  async update(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const validatedData = purchaseOrderUpdateSchema.parse(req.body);

      // Check if purchase order exists and is editable
      const existingOrder = await trx('cmp_01_pedidos_compra')
        .where('id_pedido_compra', id)
        .first();

      if (!existingOrder) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Pedido de compra não encontrado'
        });
      }

      if (existingOrder.status === 'APROVADO' || existingOrder.status === 'ENTREGUE') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Não é possível editar pedido aprovado ou entregue'
        });
      }

      // Update purchase order
      await trx('cmp_01_pedidos_compra')
        .where('id_pedido_compra', id)
        .update({
          ...validatedData,
          updated_at: new Date()
        });

      // Update items if provided
      if (validatedData.itens) {
        // Delete existing items
        await trx('cmp_02_itens_pedido_compra')
          .where('id_pedido_compra', id)
          .del();

        // Insert new items
        for (const item of validatedData.itens) {
          await trx('cmp_02_itens_pedido_compra').insert({
            id_pedido_compra: id,
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
      }

      await trx.commit();

      // Fetch updated purchase order
      const updatedOrder = await this.getOrderDetails(id);

      res.json({
        success: true,
        data: updatedOrder,
        message: 'Pedido de compra atualizado com sucesso'
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

      console.error('Error updating purchase order:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao atualizar pedido de compra',
        details: error.message
      });
    }
  }

  // Approve/reject purchase order
  async approve(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { aprovado, observacoes } = req.body;

      // Check if purchase order exists
      const existingOrder = await trx('cmp_01_pedidos_compra')
        .where('id_pedido_compra', id)
        .first();

      if (!existingOrder) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Pedido de compra não encontrado'
        });
      }

      // Update approval status
      await trx('cmp_01_pedidos_compra')
        .where('id_pedido_compra', id)
        .update({
          aprovado: aprovado,
          id_usuario_aprovador: req.user?.id,
          data_aprovacao: new Date(),
          status: aprovado ? 'APROVADO' : 'REJEITADO',
          updated_at: new Date()
        });

      // Record approval history
      await trx('cmp_03_aprovacoes_compra').insert({
        id_pedido_compra: id,
        id_usuario: req.user?.id,
        status: aprovado ? 'APROVADO' : 'REJEITADO',
        observacoes: observacoes,
        data_aprovacao: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      });

      await trx.commit();

      res.json({
        success: true,
        message: `Pedido de compra ${aprovado ? 'aprovado' : 'rejeitado'} com sucesso`
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error approving purchase order:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao processar aprovação',
        details: error.message
      });
    }
  }

  // Cancel purchase order
  async cancel(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      const existingOrder = await db('cmp_01_pedidos_compra')
        .where('id_pedido_compra', id)
        .first();

      if (!existingOrder) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Pedido de compra não encontrado'
        });
      }

      if (existingOrder.status === 'ENTREGUE') {
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Não é possível cancelar pedido já entregue'
        });
      }

      await db('cmp_01_pedidos_compra')
        .where('id_pedido_compra', id)
        .update({
          status: 'CANCELADO',
          observacoes: motivo,
          updated_at: new Date()
        });

      res.json({
        success: true,
        message: 'Pedido de compra cancelado com sucesso'
      });

    } catch (error) {
      console.error('Error canceling purchase order:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao cancelar pedido de compra',
        details: error.message
      });
    }
  }

  // Get purchase statistics
  async getStats(req, res) {
    try {
      // Total purchase orders
      const totalOrders = await db('cmp_01_pedidos_compra')
        .count('* as count')
        .first();

      // Orders by status
      const ordersByStatus = await db('cmp_01_pedidos_compra')
        .select('status')
        .count('* as count')
        .groupBy('status');

      // Pending approvals
      const pendingApprovals = await db('cmp_01_pedidos_compra')
        .where('status', 'PENDENTE')
        .where('aprovado', false)
        .count('* as count')
        .first();

      // Orders this month
      const thisMonth = await db('cmp_01_pedidos_compra')
        .whereRaw('EXTRACT(MONTH FROM data_pedido) = EXTRACT(MONTH FROM CURRENT_DATE)')
        .whereRaw('EXTRACT(YEAR FROM data_pedido) = EXTRACT(YEAR FROM CURRENT_DATE)')
        .count('* as count')
        .first();

      // Total value this month
      const monthlyValue = await db('cmp_01_pedidos_compra as pc')
        .leftJoin('cmp_02_itens_pedido_compra as i', 'pc.id_pedido_compra', 'i.id_pedido_compra')
        .whereRaw('EXTRACT(MONTH FROM pc.data_pedido) = EXTRACT(MONTH FROM CURRENT_DATE)')
        .whereRaw('EXTRACT(YEAR FROM pc.data_pedido) = EXTRACT(YEAR FROM CURRENT_DATE)')
        .sum(db.raw('i.quantidade * i.preco_unitario * (1 - COALESCE(i.desconto_percentual, 0) / 100)'))
        .first();

      // Top suppliers
      const topSuppliers = await db('cmp_01_pedidos_compra as pc')
        .leftJoin('cad_04_fornecedores as f', 'pc.id_fornecedor', 'f.id_fornecedor')
        .leftJoin('cmp_02_itens_pedido_compra as i', 'pc.id_pedido_compra', 'i.id_pedido_compra')
        .select('f.nome_razao_social as nome', 'f.id_fornecedor')
        .sum(db.raw('i.quantidade * i.preco_unitario * (1 - COALESCE(i.desconto_percentual, 0) / 100) as valor_total'))
        .count('pc.id_pedido_compra as total_pedidos')
        .groupBy('f.id_fornecedor', 'f.nome_razao_social')
        .orderBy('valor_total', 'desc')
        .limit(5);

      res.json({
        success: true,
        data: {
          total_pedidos: parseInt(totalOrders.count),
          pendentes_aprovacao: parseInt(pendingApprovals.count),
          pedidos_mes: parseInt(thisMonth.count),
          valor_mes: parseFloat(monthlyValue.sum) || 0,
          por_status: ordersByStatus.map(s => ({
            status: s.status,
            quantidade: parseInt(s.count)
          })),
          principais_fornecedores: topSuppliers.map(s => ({
            nome: s.nome,
            valor_total: parseFloat(s.valor_total) || 0,
            total_pedidos: parseInt(s.total_pedidos)
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching purchase stats:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar estatísticas',
        details: error.message
      });
    }
  }

  // Helper method to get order details
  async getOrderDetails(id) {
    const order = await db('cmp_01_pedidos_compra as pc')
      .leftJoin('cad_04_fornecedores as f', 'pc.id_fornecedor', 'f.id_fornecedor')
      .leftJoin('cad_01_empresas as e', 'pc.id_empresa', 'e.id_empresa')
      .leftJoin('cad_05_usuarios as u', 'pc.id_usuario_solicitante', 'u.id_usuario')
      .select('pc.*', 'f.nome_razao_social as fornecedor_nome', 'e.nome_fantasia as empresa_nome', 'u.nome as solicitante_nome')
      .where('pc.id_pedido_compra', id)
      .first();

    if (order) {
      const items = await db('cmp_02_itens_pedido_compra as ipc')
        .leftJoin('prd_03_produtos as p', 'ipc.id_produto', 'p.id_produto')
        .select('ipc.*', 'p.descricao as produto_descricao', 'p.codigo_produto')
        .where('ipc.id_pedido_compra', id);
      
      order.itens = items;
    }

    return order;
  }
}

module.exports = new PurchaseOrdersController();