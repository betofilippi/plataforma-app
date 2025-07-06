const db = require('../../../src/database/connection');
const { commissionSchema, salesTargetSchema } = require('../services/validationService');
const { z } = require('zod');

// Commissions Controller - Complete commission and targets management
class CommissionsController {
  // Get all commissions with advanced filtering and pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // Parse and validate filters
      const filters = {
        search: req.query.search || '',
        id_vendedor: req.query.id_vendedor || '',
        tipo_comissao: req.query.tipo_comissao || '',
        data_inicial: req.query.data_inicial || '',
        data_final: req.query.data_final || '',
        pago: req.query.pago || '',
        id_pedido_venda: req.query.id_pedido_venda || ''
      };

      // Base query with joins
      let query = db('vnd_09_comissoes as cm')
        .leftJoin('cad_05_usuarios as v', 'cm.id_vendedor', 'v.id_usuario')
        .leftJoin('vnd_01_pedidos_venda as pv', 'cm.id_pedido_venda', 'pv.id_pedido_venda')
        .leftJoin('prd_03_produtos as p', 'cm.id_produto', 'p.id_produto')
        .leftJoin('cad_03_clientes as c', 'pv.id_cliente', 'c.id_cliente')
        .select(
          'cm.*',
          'v.nome as vendedor_nome',
          'v.email as vendedor_email',
          'pv.numero_pedido',
          'pv.valor_total as pedido_valor_total',
          'p.descricao as produto_descricao',
          'p.codigo_produto',
          'c.nome_razao_social as cliente_nome'
        );

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('v.nome', 'ilike', `%${filters.search}%`)
              .orWhere('pv.numero_pedido', 'ilike', `%${filters.search}%`)
              .orWhere('c.nome_razao_social', 'ilike', `%${filters.search}%`)
              .orWhere('p.descricao', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.id_vendedor) {
        query = query.where('cm.id_vendedor', filters.id_vendedor);
      }

      if (filters.tipo_comissao) {
        query = query.where('cm.tipo_comissao', filters.tipo_comissao);
      }

      if (filters.data_inicial) {
        query = query.where('cm.data_referencia', '>=', filters.data_inicial);
      }

      if (filters.data_final) {
        query = query.where('cm.data_referencia', '<=', filters.data_final);
      }

      if (filters.pago === 'true') {
        query = query.whereNotNull('cm.data_pagamento');
      } else if (filters.pago === 'false') {
        query = query.whereNull('cm.data_pagamento');
      }

      if (filters.id_pedido_venda) {
        query = query.where('cm.id_pedido_venda', filters.id_pedido_venda);
      }

      // Count total records
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting
      const sortField = req.query.sort || 'data_referencia';
      const sortOrder = req.query.order || 'desc';
      query = query.orderBy(`cm.${sortField}`, sortOrder);

      // Apply pagination
      const commissions = await query.limit(limit).offset(offset);

      // Add calculated fields
      for (const commission of commissions) {
        commission.pago = !!commission.data_pagamento;
        commission.dias_atraso = commission.data_pagamento ? 0 : 
          Math.floor((new Date() - new Date(commission.data_referencia)) / (1000 * 60 * 60 * 24));
      }

      res.json({
        success: true,
        data: commissions,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching commissions:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar comissões',
        details: error.message
      });
    }
  }

  // Get commission by ID with full details
  async getById(req, res) {
    try {
      const { id } = req.params;

      const commission = await db('vnd_09_comissoes as cm')
        .leftJoin('cad_05_usuarios as v', 'cm.id_vendedor', 'v.id_usuario')
        .leftJoin('vnd_01_pedidos_venda as pv', 'cm.id_pedido_venda', 'pv.id_pedido_venda')
        .leftJoin('prd_03_produtos as p', 'cm.id_produto', 'p.id_produto')
        .leftJoin('cad_03_clientes as c', 'pv.id_cliente', 'c.id_cliente')
        .select(
          'cm.*',
          'v.nome as vendedor_nome',
          'v.email as vendedor_email',
          'v.telefone as vendedor_telefone',
          'pv.numero_pedido',
          'pv.valor_total as pedido_valor_total',
          'pv.data_pedido',
          'p.descricao as produto_descricao',
          'p.codigo_produto',
          'c.nome_razao_social as cliente_nome',
          'c.cnpj_cpf as cliente_documento'
        )
        .where('cm.id_comissao', id)
        .first();

      if (!commission) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Comissão não encontrada'
        });
      }

      commission.pago = !!commission.data_pagamento;
      commission.dias_atraso = commission.data_pagamento ? 0 : 
        Math.floor((new Date() - new Date(commission.data_referencia)) / (1000 * 60 * 60 * 24));

      res.json({
        success: true,
        data: commission
      });

    } catch (error) {
      console.error('Error fetching commission:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar comissão',
        details: error.message
      });
    }
  }

  // Create new commission
  async create(req, res) {
    const trx = await db.transaction();
    
    try {
      // Validate input
      const validatedData = commissionSchema.parse(req.body);

      // Insert commission
      const [commissionId] = await trx('vnd_09_comissoes').insert({
        id_vendedor: validatedData.id_vendedor,
        id_pedido_venda: validatedData.id_pedido_venda,
        id_produto: validatedData.id_produto,
        tipo_comissao: validatedData.tipo_comissao,
        valor_fixo: validatedData.valor_fixo,
        percentual: validatedData.percentual,
        valor_base: validatedData.valor_base,
        valor_comissao: validatedData.valor_comissao,
        data_referencia: validatedData.data_referencia,
        observacoes: validatedData.observacoes,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id_comissao');

      await trx.commit();

      // Fetch created commission with details
      const createdCommission = await this.getCommissionDetails(commissionId);

      res.status(201).json({
        success: true,
        data: createdCommission,
        message: 'Comissão criada com sucesso'
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

      console.error('Error creating commission:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar comissão',
        details: error.message
      });
    }
  }

  // Mark commission as paid
  async markAsPaid(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { data_pagamento, observacoes_pagamento } = req.body;

      const existingCommission = await trx('vnd_09_comissoes')
        .where('id_comissao', id)
        .first();

      if (!existingCommission) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Comissão não encontrada'
        });
      }

      if (existingCommission.data_pagamento) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'ALREADY_PAID',
          message: 'Comissão já foi paga'
        });
      }

      // Update commission as paid
      await trx('vnd_09_comissoes')
        .where('id_comissao', id)
        .update({
          data_pagamento: data_pagamento || new Date(),
          observacoes_pagamento,
          updated_at: new Date()
        });

      await trx.commit();

      res.json({
        success: true,
        message: 'Comissão marcada como paga'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error marking commission as paid:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao marcar comissão como paga',
        details: error.message
      });
    }
  }

  // Calculate commissions for sales orders
  async calculateFromOrders(req, res) {
    const trx = await db.transaction();
    
    try {
      const { pedido_ids, data_referencia } = req.body;

      if (!pedido_ids || pedido_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_INPUT',
          message: 'IDs dos pedidos são obrigatórios'
        });
      }

      const commissionsCreated = [];

      for (const pedidoId of pedido_ids) {
        // Get sales order details
        const salesOrder = await trx('vnd_01_pedidos_venda as pv')
          .leftJoin('vnd_02_itens_pedido_venda as ipv', 'pv.id_pedido_venda', 'ipv.id_pedido_venda')
          .leftJoin('prd_03_produtos as p', 'ipv.id_produto', 'p.id_produto')
          .select(
            'pv.*',
            'ipv.id_produto',
            'ipv.quantidade',
            'ipv.preco_unitario',
            'ipv.desconto_percentual',
            'p.percentual_comissao'
          )
          .where('pv.id_pedido_venda', pedidoId)
          .where('pv.status', '!=', 'CANCELADO');

        if (salesOrder.length === 0) continue;

        const order = salesOrder[0];
        
        // Check if commissions already exist for this order
        const existingCommissions = await trx('vnd_09_comissoes')
          .where('id_pedido_venda', pedidoId);

        if (existingCommissions.length > 0) continue;

        // Calculate commission for each item
        for (const item of salesOrder) {
          if (!item.id_produto) continue;

          const valorItem = item.quantidade * item.preco_unitario * (1 - (item.desconto_percentual || 0) / 100);
          const percentualComissao = item.percentual_comissao || 5; // Default 5%
          const valorComissao = valorItem * (percentualComissao / 100);

          if (valorComissao > 0) {
            const [commissionId] = await trx('vnd_09_comissoes').insert({
              id_vendedor: order.id_vendedor,
              id_pedido_venda: pedidoId,
              id_produto: item.id_produto,
              tipo_comissao: 'PERCENTUAL',
              percentual: percentualComissao,
              valor_base: valorItem,
              valor_comissao: valorComissao,
              data_referencia: data_referencia || new Date(),
              observacoes: `Comissão calculada automaticamente - ${percentualComissao}%`,
              ativo: true,
              created_at: new Date(),
              updated_at: new Date()
            }).returning('id_comissao');

            commissionsCreated.push({
              id_comissao: commissionId,
              id_pedido_venda: pedidoId,
              id_produto: item.id_produto,
              valor_comissao: valorComissao
            });
          }
        }
      }

      await trx.commit();

      res.json({
        success: true,
        data: {
          comissoes_criadas: commissionsCreated.length,
          detalhes: commissionsCreated
        },
        message: `${commissionsCreated.length} comissões calculadas com sucesso`
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error calculating commissions:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao calcular comissões',
        details: error.message
      });
    }
  }

  // Get commission statistics
  async getStats(req, res) {
    try {
      const { id_vendedor, ano, mes } = req.query;

      let query = db('vnd_09_comissoes as cm')
        .leftJoin('cad_05_usuarios as v', 'cm.id_vendedor', 'v.id_usuario');

      // Apply filters
      if (id_vendedor) {
        query = query.where('cm.id_vendedor', id_vendedor);
      }

      if (ano) {
        query = query.whereRaw('EXTRACT(YEAR FROM cm.data_referencia) = ?', [ano]);
      }

      if (mes) {
        query = query.whereRaw('EXTRACT(MONTH FROM cm.data_referencia) = ?', [mes]);
      }

      // Total commissions
      const totalCommissions = await query.clone()
        .count('* as count')
        .sum('cm.valor_comissao as valor_total')
        .first();

      // Paid commissions
      const paidCommissions = await query.clone()
        .whereNotNull('cm.data_pagamento')
        .count('* as count')
        .sum('cm.valor_comissao as valor_total')
        .first();

      // Pending commissions
      const pendingCommissions = await query.clone()
        .whereNull('cm.data_pagamento')
        .count('* as count')
        .sum('cm.valor_comissao as valor_total')
        .first();

      // Commissions by salesperson
      const commissionsBySalesperson = await query.clone()
        .select('v.nome as vendedor', 'v.id_usuario')
        .count('cm.id_comissao as total_comissoes')
        .sum('cm.valor_comissao as valor_total')
        .sum(db.raw('CASE WHEN cm.data_pagamento IS NOT NULL THEN cm.valor_comissao ELSE 0 END as valor_pago'))
        .sum(db.raw('CASE WHEN cm.data_pagamento IS NULL THEN cm.valor_comissao ELSE 0 END as valor_pendente'))
        .groupBy('v.id_usuario', 'v.nome')
        .orderBy('valor_total', 'desc');

      // Monthly commission evolution
      const monthlyEvolution = await query.clone()
        .select(
          db.raw('EXTRACT(YEAR FROM cm.data_referencia) as ano'),
          db.raw('EXTRACT(MONTH FROM cm.data_referencia) as mes')
        )
        .count('cm.id_comissao as total_comissoes')
        .sum('cm.valor_comissao as valor_total')
        .groupBy(db.raw('EXTRACT(YEAR FROM cm.data_referencia), EXTRACT(MONTH FROM cm.data_referencia)'))
        .orderBy('ano', 'desc')
        .orderBy('mes', 'desc')
        .limit(12);

      res.json({
        success: true,
        data: {
          total_comissoes: parseInt(totalCommissions.count),
          valor_total_comissoes: parseFloat(totalCommissions.valor_total) || 0,
          comissoes_pagas: parseInt(paidCommissions.count),
          valor_pago: parseFloat(paidCommissions.valor_total) || 0,
          comissoes_pendentes: parseInt(pendingCommissions.count),
          valor_pendente: parseFloat(pendingCommissions.valor_total) || 0,
          por_vendedor: commissionsBySalesperson.map(c => ({
            vendedor: c.vendedor,
            total_comissoes: parseInt(c.total_comissoes),
            valor_total: parseFloat(c.valor_total),
            valor_pago: parseFloat(c.valor_pago),
            valor_pendente: parseFloat(c.valor_pendente)
          })),
          evolucao_mensal: monthlyEvolution.map(e => ({
            ano: parseInt(e.ano),
            mes: parseInt(e.mes),
            total_comissoes: parseInt(e.total_comissoes),
            valor_total: parseFloat(e.valor_total)
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching commission stats:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar estatísticas de comissões',
        details: error.message
      });
    }
  }

  // Sales targets management
  async createTarget(req, res) {
    const trx = await db.transaction();
    
    try {
      // Validate input
      const validatedData = salesTargetSchema.parse(req.body);

      // Check if target already exists for this period
      const existingTarget = await trx('vnd_10_metas_vendas')
        .where('id_vendedor', validatedData.id_vendedor)
        .where('ano', validatedData.ano)
        .where('mes', validatedData.mes)
        .first();

      if (existingTarget) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'TARGET_EXISTS',
          message: 'Meta já existe para este período'
        });
      }

      // Insert target
      const [targetId] = await trx('vnd_10_metas_vendas').insert({
        id_vendedor: validatedData.id_vendedor,
        id_empresa: validatedData.id_empresa,
        ano: validatedData.ano,
        mes: validatedData.mes,
        meta_valor: validatedData.meta_valor,
        meta_quantidade: validatedData.meta_quantidade,
        categoria_produto: validatedData.categoria_produto,
        observacoes: validatedData.observacoes,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id_meta');

      await trx.commit();

      res.status(201).json({
        success: true,
        data: { id_meta: targetId },
        message: 'Meta criada com sucesso'
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

      console.error('Error creating sales target:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar meta de vendas',
        details: error.message
      });
    }
  }

  // Get sales targets performance
  async getTargetsPerformance(req, res) {
    try {
      const { ano, mes, id_vendedor } = req.query;

      let query = db('vnd_10_metas_vendas as mv')
        .leftJoin('cad_05_usuarios as v', 'mv.id_vendedor', 'v.id_usuario')
        .select(
          'mv.*',
          'v.nome as vendedor_nome'
        );

      if (ano) query = query.where('mv.ano', ano);
      if (mes) query = query.where('mv.mes', mes);
      if (id_vendedor) query = query.where('mv.id_vendedor', id_vendedor);

      const targets = await query;

      // Calculate performance for each target
      for (const target of targets) {
        // Get actual sales for the period
        const salesQuery = db('vnd_01_pedidos_venda')
          .where('id_vendedor', target.id_vendedor)
          .whereRaw('EXTRACT(YEAR FROM data_pedido) = ?', [target.ano])
          .whereRaw('EXTRACT(MONTH FROM data_pedido) = ?', [target.mes])
          .where('status', '!=', 'CANCELADO');

        const actualSales = await salesQuery
          .count('* as quantidade')
          .sum('valor_total as valor')
          .first();

        target.realizado_valor = parseFloat(actualSales.valor) || 0;
        target.realizado_quantidade = parseInt(actualSales.quantidade) || 0;
        target.percentual_valor = target.meta_valor > 0 ? 
          (target.realizado_valor / target.meta_valor * 100) : 0;
        target.percentual_quantidade = target.meta_quantidade > 0 ? 
          (target.realizado_quantidade / target.meta_quantidade * 100) : 0;
        target.meta_atingida = target.percentual_valor >= 100;
      }

      res.json({
        success: true,
        data: targets
      });

    } catch (error) {
      console.error('Error fetching targets performance:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar performance de metas',
        details: error.message
      });
    }
  }

  // Helper method to get commission details
  async getCommissionDetails(id) {
    const commission = await db('vnd_09_comissoes as cm')
      .leftJoin('cad_05_usuarios as v', 'cm.id_vendedor', 'v.id_usuario')
      .leftJoin('vnd_01_pedidos_venda as pv', 'cm.id_pedido_venda', 'pv.id_pedido_venda')
      .leftJoin('prd_03_produtos as p', 'cm.id_produto', 'p.id_produto')
      .select(
        'cm.*',
        'v.nome as vendedor_nome',
        'pv.numero_pedido',
        'p.descricao as produto_descricao'
      )
      .where('cm.id_comissao', id)
      .first();

    if (commission) {
      commission.pago = !!commission.data_pagamento;
    }

    return commission;
  }
}

module.exports = new CommissionsController();