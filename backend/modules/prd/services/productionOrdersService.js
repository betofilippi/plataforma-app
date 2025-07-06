const { ValidationService } = require('./validationService');
const auditLogger = require('../../../src/utils/auditLogger');

class ProductionOrdersService {
  constructor(knex) {
    this.knex = knex;
  }

  async listProductionOrders(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      let query = this.knex('prd_01_ordens_producao as po')
        .leftJoin('cad_04_produtos as p', 'po.produto_id', 'p.id')
        .leftJoin('prd_03_bom as b', 'po.bom_id', 'b.id')
        .leftJoin('prd_02_centros_trabalho as wc', 'po.centro_trabalho_id', 'wc.id')
        .leftJoin('cad_01_usuarios as resp', 'po.responsavel_id', 'resp.id')
        .select(
          'po.*',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo',
          'b.versao as bom_versao',
          'wc.nome as centro_trabalho_nome',
          'resp.nome as responsavel_nome'
        )
        .where('po.ativo', true);

      // Aplicar filtros
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.whereIn('po.status', filters.status);
        } else {
          query = query.where('po.status', filters.status);
        }
      }

      if (filters.produto_id) {
        query = query.where('po.produto_id', filters.produto_id);
      }

      if (filters.centro_trabalho_id) {
        query = query.where('po.centro_trabalho_id', filters.centro_trabalho_id);
      }

      if (filters.data_inicio) {
        query = query.where('po.data_inicio_planejada', '>=', filters.data_inicio);
      }

      if (filters.data_fim) {
        query = query.where('po.data_fim_planejada', '<=', filters.data_fim);
      }

      if (filters.numero_ordem) {
        query = query.where('po.numero_ordem', 'ilike', `%${filters.numero_ordem}%`);
      }

      if (filters.prioridade) {
        query = query.where('po.prioridade', filters.prioridade);
      }

      // Buscar total de registros
      const totalQuery = query.clone().clearSelect().count('* as total');
      const [{ total }] = await totalQuery;

      // Aplicar paginação e ordenação
      const results = await query
        .orderBy('po.data_inicio_planejada', 'desc')
        .limit(limit)
        .offset(offset);

      return {
        data: results,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Erro ao listar ordens de produção: ${error.message}`);
    }
  }

  async getProductionOrderById(id) {
    try {
      const order = await this.knex('prd_01_ordens_producao as po')
        .leftJoin('cad_04_produtos as p', 'po.produto_id', 'p.id')
        .leftJoin('prd_03_bom as b', 'po.bom_id', 'b.id')
        .leftJoin('prd_02_centros_trabalho as wc', 'po.centro_trabalho_id', 'wc.id')
        .leftJoin('cad_01_usuarios as resp', 'po.responsavel_id', 'resp.id')
        .select(
          'po.*',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo',
          'p.unidade_medida as produto_unidade',
          'b.versao as bom_versao',
          'b.tempo_producao_horas as bom_tempo_producao',
          'wc.nome as centro_trabalho_nome',
          'wc.capacidade_horas_dia as centro_capacidade',
          'resp.nome as responsavel_nome'
        )
        .where('po.id', id)
        .where('po.ativo', true)
        .first();

      if (!order) {
        throw new Error('Ordem de produção não encontrada');
      }

      // Buscar materiais consumidos
      const materialsConsumed = await this.knex('prd_05_consumo_materiais as cm')
        .join('cad_04_produtos as p', 'cm.produto_id', 'p.id')
        .select(
          'cm.*',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo'
        )
        .where('cm.ordem_producao_id', id);

      // Buscar BOM items necessários
      const bomItems = await this.knex('prd_04_itens_bom as bi')
        .join('cad_04_produtos as p', 'bi.produto_id', 'p.id')
        .select(
          'bi.*',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo'
        )
        .where('bi.bom_id', order.bom_id)
        .where('bi.ativo', true);

      // Buscar operações
      const operations = await this.knex('prd_06_operacoes as op')
        .leftJoin('prd_02_centros_trabalho as wc', 'op.centro_trabalho_id', 'wc.id')
        .select(
          'op.*',
          'wc.nome as centro_trabalho_nome'
        )
        .where('op.bom_id', order.bom_id)
        .where('op.ativo', true)
        .orderBy('op.sequencia');

      return {
        ...order,
        materiais_consumidos: materialsConsumed,
        bom_itens: bomItems,
        operacoes: operations
      };
    } catch (error) {
      throw new Error(`Erro ao buscar ordem de produção: ${error.message}`);
    }
  }

  async createProductionOrder(data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const validData = ValidationService.validateProductionOrder(data);

      // Validar produto existe
      await ValidationService.validateProductExists(validData.produto_id, trx);

      // Validar BOM existe
      const bom = await ValidationService.validateBOMExists(validData.bom_id, trx);

      // Verificar se o BOM é para o produto correto
      if (bom.produto_id !== validData.produto_id) {
        throw new Error('BOM não corresponde ao produto selecionado');
      }

      // Verificar capacidade se centro de trabalho especificado
      if (validData.centro_trabalho_id) {
        await ValidationService.validateWorkCenterExists(validData.centro_trabalho_id, trx);
        
        const requiredHours = bom.tempo_producao_horas * validData.quantidade_planejada;
        await ValidationService.validateProductionCapacity(
          validData.centro_trabalho_id,
          validData.data_inicio_planejada,
          validData.data_fim_planejada,
          requiredHours,
          trx
        );
      }

      // Gerar número único se não fornecido
      if (!validData.numero_ordem) {
        const lastOrder = await trx('prd_01_ordens_producao')
          .where('numero_ordem', 'like', 'OP%')
          .orderBy('created_at', 'desc')
          .first();
        
        const nextNumber = lastOrder ? 
          parseInt(lastOrder.numero_ordem.substring(2)) + 1 : 1;
        validData.numero_ordem = `OP${nextNumber.toString().padStart(6, '0')}`;
      }

      // Verificar unicidade do número
      const existingOrder = await trx('prd_01_ordens_producao')
        .where('numero_ordem', validData.numero_ordem)
        .where('ativo', true)
        .first();

      if (existingOrder) {
        throw new Error('Número da ordem já existe');
      }

      const now = new Date().toISOString();
      const orderData = {
        ...validData,
        created_at: now,
        updated_at: now,
        created_by: userId
      };

      const [order] = await trx('prd_01_ordens_producao')
        .insert(orderData)
        .returning('*');

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_01_ordens_producao',
        operacao: 'INSERT',
        registro_id: order.id,
        dados_novos: orderData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getProductionOrderById(order.id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async updateProductionOrder(id, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const existingOrder = await trx('prd_01_ordens_producao')
        .where({ id, ativo: true })
        .first();

      if (!existingOrder) {
        throw new Error('Ordem de produção não encontrada');
      }

      // Não permitir alteração se já iniciada
      if (existingOrder.status === 'em_producao' && data.status !== 'em_producao') {
        throw new Error('Não é possível alterar ordem em produção');
      }

      const validData = ValidationService.validateProductionOrder({
        ...existingOrder,
        ...data
      });

      // Validações de relacionamentos se alterados
      if (data.produto_id && data.produto_id !== existingOrder.produto_id) {
        await ValidationService.validateProductExists(validData.produto_id, trx);
      }

      if (data.bom_id && data.bom_id !== existingOrder.bom_id) {
        const bom = await ValidationService.validateBOMExists(validData.bom_id, trx);
        if (bom.produto_id !== validData.produto_id) {
          throw new Error('BOM não corresponde ao produto selecionado');
        }
      }

      if (data.centro_trabalho_id && data.centro_trabalho_id !== existingOrder.centro_trabalho_id) {
        await ValidationService.validateWorkCenterExists(validData.centro_trabalho_id, trx);
      }

      const updateData = {
        ...validData,
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      delete updateData.id;
      delete updateData.created_at;
      delete updateData.created_by;

      await trx('prd_01_ordens_producao')
        .where({ id })
        .update(updateData);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_01_ordens_producao',
        operacao: 'UPDATE',
        registro_id: id,
        dados_anteriores: existingOrder,
        dados_novos: updateData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getProductionOrderById(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async deleteProductionOrder(id, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const order = await trx('prd_01_ordens_producao')
        .where({ id, ativo: true })
        .first();

      if (!order) {
        throw new Error('Ordem de produção não encontrada');
      }

      // Não permitir exclusão se já iniciada
      if (order.status === 'em_producao') {
        throw new Error('Não é possível excluir ordem em produção');
      }

      const updateData = {
        ativo: false,
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      await trx('prd_01_ordens_producao')
        .where({ id })
        .update(updateData);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_01_ordens_producao',
        operacao: 'DELETE',
        registro_id: id,
        dados_anteriores: order,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return { success: true, message: 'Ordem de produção excluída com sucesso' };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async startProduction(id, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const order = await trx('prd_01_ordens_producao')
        .where({ id, ativo: true })
        .first();

      if (!order) {
        throw new Error('Ordem de produção não encontrada');
      }

      if (order.status !== 'liberada') {
        throw new Error('Ordem deve estar liberada para iniciar produção');
      }

      // Verificar disponibilidade de materiais
      const bomItems = await trx('prd_04_itens_bom')
        .where('bom_id', order.bom_id)
        .where('ativo', true);

      for (const item of bomItems) {
        const requiredQty = item.quantidade * order.quantidade_planejada;
        await ValidationService.validateMaterialAvailability(
          item.produto_id, 
          requiredQty, 
          trx
        );
      }

      const updateData = {
        status: 'em_producao',
        data_inicio_real: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      await trx('prd_01_ordens_producao')
        .where({ id })
        .update(updateData);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_01_ordens_producao',
        operacao: 'START_PRODUCTION',
        registro_id: id,
        dados_anteriores: order,
        dados_novos: updateData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getProductionOrderById(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async finishProduction(id, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const order = await trx('prd_01_ordens_producao')
        .where({ id, ativo: true })
        .first();

      if (!order) {
        throw new Error('Ordem de produção não encontrada');
      }

      if (order.status !== 'em_producao') {
        throw new Error('Ordem deve estar em produção para finalizar');
      }

      const updateData = {
        status: 'concluida',
        data_fim_real: new Date().toISOString(),
        quantidade_produzida: data.quantidade_produzida || order.quantidade_planejada,
        observacoes: data.observacoes || order.observacoes,
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      // Calcular custos finais
      const materialCosts = await trx('prd_05_consumo_materiais')
        .where('ordem_producao_id', id)
        .sum('custo_unitario * quantidade_consumida as total')
        .first();

      updateData.custo_material = materialCosts.total || 0;

      await trx('prd_01_ordens_producao')
        .where({ id })
        .update(updateData);

      // Atualizar estoque com produção
      if (updateData.quantidade_produzida > 0) {
        await trx('est_01_estoque')
          .where('produto_id', order.produto_id)
          .increment('quantidade_disponivel', updateData.quantidade_produzida);
      }

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_01_ordens_producao',
        operacao: 'FINISH_PRODUCTION',
        registro_id: id,
        dados_anteriores: order,
        dados_novos: updateData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getProductionOrderById(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async getProductionOrderStats(filters = {}) {
    try {
      let query = this.knex('prd_01_ordens_producao')
        .where('ativo', true);

      // Aplicar filtros de data
      if (filters.data_inicio) {
        query = query.where('data_inicio_planejada', '>=', filters.data_inicio);
      }
      if (filters.data_fim) {
        query = query.where('data_fim_planejada', '<=', filters.data_fim);
      }

      const stats = await query
        .select(
          this.knex.raw('COUNT(*) as total_ordens'),
          this.knex.raw('COUNT(*) FILTER (WHERE status = ?) as planejadas', ['planejada']),
          this.knex.raw('COUNT(*) FILTER (WHERE status = ?) as liberadas', ['liberada']),
          this.knex.raw('COUNT(*) FILTER (WHERE status = ?) as em_producao', ['em_producao']),
          this.knex.raw('COUNT(*) FILTER (WHERE status = ?) as concluidas', ['concluida']),
          this.knex.raw('COUNT(*) FILTER (WHERE status = ?) as canceladas', ['cancelada']),
          this.knex.raw('SUM(quantidade_planejada) as quantidade_total_planejada'),
          this.knex.raw('SUM(quantidade_produzida) as quantidade_total_produzida'),
          this.knex.raw('SUM(custo_material + custo_mao_obra + custo_overhead) as custo_total'),
          this.knex.raw('AVG(CASE WHEN data_fim_real IS NOT NULL AND data_inicio_real IS NOT NULL THEN EXTRACT(epoch FROM (data_fim_real - data_inicio_real))/3600 END) as tempo_medio_producao_horas')
        )
        .first();

      // Estatísticas por centro de trabalho
      const statsByWorkCenter = await this.knex('prd_01_ordens_producao as po')
        .join('prd_02_centros_trabalho as wc', 'po.centro_trabalho_id', 'wc.id')
        .where('po.ativo', true)
        .groupBy('wc.id', 'wc.nome')
        .select(
          'wc.id',
          'wc.nome',
          this.knex.raw('COUNT(*) as total_ordens'),
          this.knex.raw('SUM(po.quantidade_planejada) as quantidade_planejada'),
          this.knex.raw('SUM(po.quantidade_produzida) as quantidade_produzida')
        );

      // Ordens atrasadas
      const ordensAtrasadas = await this.knex('prd_01_ordens_producao')
        .where('ativo', true)
        .where('status', 'in', ['liberada', 'em_producao'])
        .where('data_fim_planejada', '<', new Date().toISOString())
        .count('* as total')
        .first();

      return {
        ...stats,
        ordens_atrasadas: parseInt(ordensAtrasadas.total),
        stats_por_centro: statsByWorkCenter
      };
    } catch (error) {
      throw new Error(`Erro ao obter estatísticas: ${error.message}`);
    }
  }

  async getProductionProgress(id) {
    try {
      const order = await this.knex('prd_01_ordens_producao')
        .where({ id, ativo: true })
        .first();

      if (!order) {
        throw new Error('Ordem de produção não encontrada');
      }

      const operations = await this.knex('prd_06_operacoes')
        .where('bom_id', order.bom_id)
        .where('ativo', true)
        .orderBy('sequencia');

      const operationsProgress = await Promise.all(
        operations.map(async (op) => {
          // Aqui poderia ter uma tabela de progresso de operações
          // Por simplicidade, considerando baseado no status da ordem
          const completed = order.status === 'concluida' ? 100 : 
                          order.status === 'em_producao' ? 50 : 0;

          return {
            ...op,
            percentual_concluido: completed,
            tempo_estimado: op.tempo_setup_minutos + op.tempo_execucao_minutos,
            tempo_realizado: order.status === 'concluida' ? 
              op.tempo_setup_minutos + op.tempo_execucao_minutos : 0
          };
        })
      );

      const totalEstimado = operationsProgress.reduce((sum, op) => sum + op.tempo_estimado, 0);
      const totalRealizado = operationsProgress.reduce((sum, op) => sum + op.tempo_realizado, 0);

      return {
        ordem: order,
        operacoes: operationsProgress,
        resumo: {
          total_operacoes: operations.length,
          operacoes_concluidas: operationsProgress.filter(op => op.percentual_concluido === 100).length,
          tempo_total_estimado: totalEstimado,
          tempo_total_realizado: totalRealizado,
          percentual_global: totalEstimado > 0 ? (totalRealizado / totalEstimado) * 100 : 0
        }
      };
    } catch (error) {
      throw new Error(`Erro ao obter progresso: ${error.message}`);
    }
  }
}

module.exports = ProductionOrdersService;