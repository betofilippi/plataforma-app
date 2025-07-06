const db = require('../../../src/database/connection');
const { purchaseRequisitionSchema } = require('../services/validationService');
const { z } = require('zod');

// Purchase Requisitions Controller - Manage internal purchase requests
class PurchaseRequisitionsController {
  // Get all requisitions with filtering and pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const filters = {
        search: req.query.search || '',
        status: req.query.status || '',
        departamento: req.query.departamento || '',
        data_inicial: req.query.data_inicial || '',
        data_final: req.query.data_final || '',
        urgente: req.query.urgente || '',
        id_usuario_solicitante: req.query.id_usuario_solicitante || ''
      };

      let query = db('cmp_06_requisicoes_compra as rc')
        .leftJoin('cad_01_empresas as e', 'rc.id_empresa', 'e.id_empresa')
        .leftJoin('cad_05_usuarios as u', 'rc.id_usuario_solicitante', 'u.id_usuario')
        .leftJoin('cad_05_usuarios as ua', 'rc.id_usuario_aprovador', 'ua.id_usuario')
        .select(
          'rc.*',
          'e.nome_fantasia as empresa_nome',
          'u.nome as solicitante_nome',
          'ua.nome as aprovador_nome'
        );

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('rc.numero_requisicao', 'ilike', `%${filters.search}%`)
              .orWhere('rc.justificativa', 'ilike', `%${filters.search}%`)
              .orWhere('rc.departamento', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.status) {
        query = query.where('rc.status', filters.status);
      }

      if (filters.departamento) {
        query = query.where('rc.departamento', 'ilike', `%${filters.departamento}%`);
      }

      if (filters.data_inicial) {
        query = query.where('rc.data_requisicao', '>=', filters.data_inicial);
      }

      if (filters.data_final) {
        query = query.where('rc.data_requisicao', '<=', filters.data_final);
      }

      if (filters.urgente !== '') {
        query = query.where('rc.urgente', filters.urgente === 'true');
      }

      if (filters.id_usuario_solicitante) {
        query = query.where('rc.id_usuario_solicitante', filters.id_usuario_solicitante);
      }

      // Count total records
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting and pagination
      const sortField = req.query.sort || 'data_requisicao';
      const sortOrder = req.query.order || 'desc';
      
      const requisitions = await query
        .orderBy(`rc.${sortField}`, sortOrder)
        .limit(limit)
        .offset(offset);

      // Get items count and estimated value for each requisition
      for (const requisition of requisitions) {
        const itemsData = await db('cmp_07_itens_requisicao')
          .where('id_requisicao', requisition.id_requisicao)
          .count('* as count')
          .sum('valor_estimado as valor_total')
          .first();
        
        requisition.total_itens = parseInt(itemsData.count);
        requisition.valor_estimado_total = parseFloat(itemsData.valor_total) || 0;
      }

      res.json({
        success: true,
        data: requisitions,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching requisitions:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar requisições de compra',
        details: error.message
      });
    }
  }

  // Get requisition by ID with full details
  async getById(req, res) {
    try {
      const { id } = req.params;

      const requisition = await db('cmp_06_requisicoes_compra as rc')
        .leftJoin('cad_01_empresas as e', 'rc.id_empresa', 'e.id_empresa')
        .leftJoin('cad_05_usuarios as u', 'rc.id_usuario_solicitante', 'u.id_usuario')
        .leftJoin('cad_05_usuarios as ua', 'rc.id_usuario_aprovador', 'ua.id_usuario')
        .select(
          'rc.*',
          'e.nome_fantasia as empresa_nome',
          'u.nome as solicitante_nome',
          'u.email as solicitante_email',
          'ua.nome as aprovador_nome'
        )
        .where('rc.id_requisicao', id)
        .first();

      if (!requisition) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Requisição não encontrada'
        });
      }

      // Get items
      const items = await db('cmp_07_itens_requisicao as ir')
        .leftJoin('prd_03_produtos as p', 'ir.id_produto', 'p.id_produto')
        .leftJoin('prd_02_unidades as u', 'p.id_unidade', 'u.id_unidade')
        .select(
          'ir.*',
          'p.descricao as produto_descricao',
          'p.codigo_produto',
          'p.preco_custo',
          'u.sigla as unidade_sigla'
        )
        .where('ir.id_requisicao', id);

      requisition.itens = items;
      requisition.valor_estimado_total = items.reduce((sum, item) => sum + (item.valor_estimado || 0), 0);

      res.json({
        success: true,
        data: requisition
      });

    } catch (error) {
      console.error('Error fetching requisition:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar requisição',
        details: error.message
      });
    }
  }

  // Create new requisition
  async create(req, res) {
    const trx = await db.transaction();
    
    try {
      const validatedData = purchaseRequisitionSchema.parse(req.body);
      
      // Generate requisition number
      const lastRequisition = await trx('cmp_06_requisicoes_compra')
        .orderBy('id_requisicao', 'desc')
        .first();
      
      const nextNumber = lastRequisition ? 
        parseInt(lastRequisition.numero_requisicao.replace(/\D/g, '')) + 1 : 1;
      const numeroRequisicao = `REQ${String(nextNumber).padStart(6, '0')}`;

      // Insert requisition
      const [requisitionId] = await trx('cmp_06_requisicoes_compra').insert({
        numero_requisicao: numeroRequisicao,
        id_empresa: validatedData.id_empresa,
        id_usuario_solicitante: req.user?.id || validatedData.id_usuario_solicitante,
        departamento: validatedData.departamento,
        justificativa: validatedData.justificativa,
        data_requisicao: new Date(),
        data_necessidade: validatedData.data_necessidade,
        urgente: validatedData.urgente || false,
        centro_custo: validatedData.centro_custo,
        status: 'PENDENTE',
        ativo: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id_requisicao');

      // Insert items
      for (const item of validatedData.itens) {
        await trx('cmp_07_itens_requisicao').insert({
          id_requisicao: requisitionId,
          id_produto: item.id_produto,
          descricao_item: item.descricao_item,
          quantidade: item.quantidade,
          especificacoes: item.especificacoes,
          fornecedor_sugerido: item.fornecedor_sugerido,
          valor_estimado: item.valor_estimado || 0,
          ativo: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      await trx.commit();

      // Fetch created requisition with details
      const createdRequisition = await this.getRequisitionDetails(requisitionId);

      res.status(201).json({
        success: true,
        data: createdRequisition,
        message: 'Requisição de compra criada com sucesso'
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

      console.error('Error creating requisition:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar requisição',
        details: error.message
      });
    }
  }

  // Approve/reject requisition
  async approve(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { aprovado, observacoes } = req.body;

      const requisition = await trx('cmp_06_requisicoes_compra')
        .where('id_requisicao', id)
        .first();

      if (!requisition) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Requisição não encontrada'
        });
      }

      if (requisition.status !== 'PENDENTE') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Apenas requisições pendentes podem ser aprovadas/rejeitadas'
        });
      }

      // Update requisition status
      await trx('cmp_06_requisicoes_compra')
        .where('id_requisicao', id)
        .update({
          aprovado: aprovado,
          id_usuario_aprovador: req.user?.id,
          data_aprovacao: new Date(),
          status: aprovado ? 'APROVADA' : 'REJEITADA',
          observacoes_aprovacao: observacoes,
          updated_at: new Date()
        });

      await trx.commit();

      res.json({
        success: true,
        message: `Requisição ${aprovado ? 'aprovada' : 'rejeitada'} com sucesso`
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error approving requisition:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao processar aprovação',
        details: error.message
      });
    }
  }

  // Convert requisition to quotation request
  async convertToQuotation(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { fornecedores, prazo_resposta } = req.body;

      if (!fornecedores || fornecedores.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_SUPPLIERS',
          message: 'Deve ser informado pelo menos um fornecedor'
        });
      }

      const requisition = await trx('cmp_06_requisicoes_compra')
        .where('id_requisicao', id)
        .first();

      if (!requisition) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Requisição não encontrada'
        });
      }

      if (requisition.status !== 'APROVADA') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'Apenas requisições aprovadas podem ser convertidas'
        });
      }

      const items = await trx('cmp_07_itens_requisicao')
        .where('id_requisicao', id);

      const quotationIds = [];

      // Create quotation for each supplier
      for (const fornecedorId of fornecedores) {
        // Generate quotation number
        const lastQuotation = await trx('cmp_04_cotacoes')
          .orderBy('id_cotacao', 'desc')
          .first();
        
        const nextNumber = lastQuotation ? 
          parseInt(lastQuotation.numero_cotacao.replace(/\D/g, '')) + 1 : 1;
        const numeroCotacao = `COT${String(nextNumber).padStart(6, '0')}`;

        // Create quotation
        const [quotationId] = await trx('cmp_04_cotacoes').insert({
          numero_cotacao: numeroCotacao,
          id_fornecedor: fornecedorId,
          id_empresa: requisition.id_empresa,
          id_usuario_solicitante: requisition.id_usuario_solicitante,
          data_cotacao: new Date(),
          data_validade: new Date(Date.now() + (prazo_resposta || 7) * 24 * 60 * 60 * 1000),
          descricao: `Cotação baseada na requisição ${requisition.numero_requisicao}`,
          observacoes: requisition.justificativa,
          status: 'PENDENTE',
          ativo: true,
          created_at: new Date(),
          updated_at: new Date()
        }).returning('id_cotacao');

        // Create quotation items
        for (const item of items) {
          await trx('cmp_05_itens_cotacao').insert({
            id_cotacao: quotationId,
            id_produto: item.id_produto,
            quantidade: item.quantidade,
            preco_unitario: item.valor_estimado || 0,
            observacoes: `${item.descricao_item} - ${item.especificacoes || ''}`,
            ativo: true,
            created_at: new Date(),
            updated_at: new Date()
          });
        }

        quotationIds.push({ id_cotacao: quotationId, numero_cotacao: numeroCotacao });
      }

      // Update requisition status
      await trx('cmp_06_requisicoes_compra')
        .where('id_requisicao', id)
        .update({
          status: 'COTACAO_SOLICITADA',
          updated_at: new Date()
        });

      await trx.commit();

      res.json({
        success: true,
        data: quotationIds,
        message: 'Requisição convertida em cotações com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error converting requisition to quotation:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao converter requisição',
        details: error.message
      });
    }
  }

  // Get requisition statistics
  async getStats(req, res) {
    try {
      // Total requisitions
      const total = await db('cmp_06_requisicoes_compra')
        .count('* as count')
        .first();

      // Requisitions by status
      const byStatus = await db('cmp_06_requisicoes_compra')
        .select('status')
        .count('* as count')
        .groupBy('status');

      // Pending requisitions
      const pending = await db('cmp_06_requisicoes_compra')
        .where('status', 'PENDENTE')
        .count('* as count')
        .first();

      // Urgent requisitions
      const urgent = await db('cmp_06_requisicoes_compra')
        .where('urgente', true)
        .where('status', 'PENDENTE')
        .count('* as count')
        .first();

      // By department
      const byDepartment = await db('cmp_06_requisicoes_compra')
        .select('departamento')
        .count('* as count')
        .groupBy('departamento')
        .orderBy('count', 'desc')
        .limit(5);

      // Average approval time
      const avgApprovalTime = await db('cmp_06_requisicoes_compra')
        .whereNotNull('data_aprovacao')
        .select(db.raw('AVG(EXTRACT(DAY FROM data_aprovacao - data_requisicao)) as avg_days'))
        .first();

      res.json({
        success: true,
        data: {
          total_requisicoes: parseInt(total.count),
          pendentes: parseInt(pending.count),
          urgentes: parseInt(urgent.count),
          tempo_aprovacao_medio: parseFloat(avgApprovalTime.avg_days) || 0,
          por_status: byStatus.map(s => ({
            status: s.status,
            quantidade: parseInt(s.count)
          })),
          por_departamento: byDepartment.map(d => ({
            departamento: d.departamento,
            quantidade: parseInt(d.count)
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching requisition stats:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar estatísticas',
        details: error.message
      });
    }
  }

  // Helper method to get requisition details
  async getRequisitionDetails(id) {
    const requisition = await db('cmp_06_requisicoes_compra as rc')
      .leftJoin('cad_01_empresas as e', 'rc.id_empresa', 'e.id_empresa')
      .leftJoin('cad_05_usuarios as u', 'rc.id_usuario_solicitante', 'u.id_usuario')
      .select(
        'rc.*',
        'e.nome_fantasia as empresa_nome',
        'u.nome as solicitante_nome'
      )
      .where('rc.id_requisicao', id)
      .first();

    if (requisition) {
      const items = await db('cmp_07_itens_requisicao')
        .where('id_requisicao', id);
      
      requisition.itens = items;
    }

    return requisition;
  }
}

module.exports = new PurchaseRequisitionsController();