const { ValidationService } = require('./validationService');
const auditLogger = require('../../../src/utils/auditLogger');
const z = require('zod');

const BOMSchema = z.object({
  produto_id: z.number().int().positive(),
  versao: z.string().min(1).max(10),
  tipo: z.enum(['producao', 'engenharia', 'custo', 'planning']),
  descricao: z.string().min(1).max(500),
  data_efetiva: z.string().datetime(),
  data_obsoleta: z.string().datetime().optional(),
  tempo_producao_horas: z.number().positive(),
  tempo_setup_horas: z.number().min(0).default(0),
  rendimento_percentual: z.number().min(0).max(100).default(100),
  observacoes: z.string().max(1000).optional(),
  itens: z.array(z.object({
    produto_id: z.number().int().positive(),
    quantidade: z.number().positive(),
    unidade_medida: z.string().min(1).max(10),
    tipo_item: z.enum(['componente', 'materia_prima', 'semi_acabado', 'ferramenta']),
    obrigatorio: z.boolean().default(true),
    posicao: z.string().max(10).optional(),
    refugo_percentual: z.number().min(0).max(100).default(0),
    observacoes: z.string().max(500).optional()
  }))
});

class BOMService {
  constructor(knex) {
    this.knex = knex;
  }

  async listBOMs(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      let query = this.knex('prd_03_bom as b')
        .leftJoin('cad_04_produtos as p', 'b.produto_id', 'p.id')
        .leftJoin('cad_01_usuarios as u', 'b.created_by', 'u.id')
        .select(
          'b.*',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo',
          'u.nome as criado_por_nome',
          this.knex.raw('(SELECT COUNT(*) FROM prd_04_itens_bom WHERE bom_id = b.id AND ativo = true) as total_itens')
        )
        .where('b.ativo', filters.ativo !== false);

      if (filters.produto_id) {
        query = query.where('b.produto_id', filters.produto_id);
      }

      if (filters.tipo) {
        query = query.where('b.tipo', filters.tipo);
      }

      if (filters.versao) {
        query = query.where('b.versao', 'ilike', `%${filters.versao}%`);
      }

      const totalQuery = query.clone().clearSelect().count('* as total');
      const [{ total }] = await totalQuery;

      const results = await query
        .orderBy('b.created_at', 'desc')
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
      throw new Error(`Erro ao listar BOMs: ${error.message}`);
    }
  }

  async getBOMById(id) {
    try {
      const bom = await this.knex('prd_03_bom as b')
        .leftJoin('cad_04_produtos as p', 'b.produto_id', 'p.id')
        .leftJoin('cad_01_usuarios as u', 'b.created_by', 'u.id')
        .select(
          'b.*',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo',
          'p.unidade_medida as produto_unidade',
          'u.nome as criado_por_nome'
        )
        .where('b.id', id)
        .where('b.ativo', true)
        .first();

      if (!bom) {
        throw new Error('BOM não encontrado');
      }

      // Buscar itens do BOM
      const items = await this.knex('prd_04_itens_bom as bi')
        .join('cad_04_produtos as p', 'bi.produto_id', 'p.id')
        .leftJoin('cad_06_unidades as u', 'bi.unidade_medida', 'u.sigla')
        .select(
          'bi.*',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo',
          'p.preco_custo as produto_preco_custo',
          'u.nome as unidade_nome'
        )
        .where('bi.bom_id', id)
        .where('bi.ativo', true)
        .orderBy('bi.posicao');

      // Buscar operações
      const operations = await this.knex('prd_06_operacoes as op')
        .leftJoin('prd_02_centros_trabalho as wc', 'op.centro_trabalho_id', 'wc.id')
        .leftJoin('cad_01_usuarios as resp', 'op.responsavel_id', 'resp.id')
        .select(
          'op.*',
          'wc.nome as centro_trabalho_nome',
          'wc.custo_hora as centro_custo_hora',
          'resp.nome as responsavel_nome'
        )
        .where('op.bom_id', id)
        .where('op.ativo', true)
        .orderBy('op.sequencia');

      // Buscar histórico de revisões
      const revisions = await this.knex('prd_07_revisoes_bom')
        .leftJoin('cad_01_usuarios as u', 'prd_07_revisoes_bom.created_by', 'u.id')
        .select(
          'prd_07_revisoes_bom.*',
          'u.nome as usuario_nome'
        )
        .where('bom_id', id)
        .orderBy('created_at', 'desc');

      return {
        ...bom,
        itens: items,
        operacoes: operations,
        revisoes: revisions
      };
    } catch (error) {
      throw new Error(`Erro ao buscar BOM: ${error.message}`);
    }
  }

  async createBOM(data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const validData = BOMSchema.parse(data);

      // Validar produto existe
      await ValidationService.validateProductExists(validData.produto_id, trx);

      // Verificar se já existe BOM com a mesma versão para o produto
      const existingBOM = await trx('prd_03_bom')
        .where('produto_id', validData.produto_id)
        .where('versao', validData.versao)
        .where('ativo', true)
        .first();

      if (existingBOM) {
        throw new Error('Já existe BOM com esta versão para o produto');
      }

      const now = new Date().toISOString();
      const bomData = {
        produto_id: validData.produto_id,
        versao: validData.versao,
        tipo: validData.tipo,
        descricao: validData.descricao,
        data_efetiva: validData.data_efetiva,
        data_obsoleta: validData.data_obsoleta,
        tempo_producao_horas: validData.tempo_producao_horas,
        tempo_setup_horas: validData.tempo_setup_horas,
        rendimento_percentual: validData.rendimento_percentual,
        observacoes: validData.observacoes,
        created_at: now,
        updated_at: now,
        created_by: userId
      };

      const [bom] = await trx('prd_03_bom')
        .insert(bomData)
        .returning('*');

      // Criar itens do BOM
      if (validData.itens && validData.itens.length > 0) {
        await this.createBOMItems(trx, bom.id, validData.itens, userId);
      }

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_03_bom',
        operacao: 'INSERT',
        registro_id: bom.id,
        dados_novos: bomData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getBOMById(bom.id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async createBOMItems(trx, bomId, items, userId) {
    const now = new Date().toISOString();
    
    for (const item of items) {
      // Validar produto existe
      await ValidationService.validateProductExists(item.produto_id, trx);

      const itemData = {
        bom_id: bomId,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        unidade_medida: item.unidade_medida,
        tipo_item: item.tipo_item,
        obrigatorio: item.obrigatorio,
        posicao: item.posicao,
        refugo_percentual: item.refugo_percentual,
        observacoes: item.observacoes,
        created_at: now,
        created_by: userId
      };

      await trx('prd_04_itens_bom').insert(itemData);
    }
  }

  async updateBOM(id, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const existingBOM = await trx('prd_03_bom')
        .where({ id, ativo: true })
        .first();

      if (!existingBOM) {
        throw new Error('BOM não encontrado');
      }

      const validData = BOMSchema.parse(data);

      // Validar produto existe
      await ValidationService.validateProductExists(validData.produto_id, trx);

      // Verificar se já existe BOM com a mesma versão (exceto o atual)
      const existingVersion = await trx('prd_03_bom')
        .where('produto_id', validData.produto_id)
        .where('versao', validData.versao)
        .where('ativo', true)
        .whereNot('id', id)
        .first();

      if (existingVersion) {
        throw new Error('Já existe BOM com esta versão para o produto');
      }

      const updateData = {
        produto_id: validData.produto_id,
        versao: validData.versao,
        tipo: validData.tipo,
        descricao: validData.descricao,
        data_efetiva: validData.data_efetiva,
        data_obsoleta: validData.data_obsoleta,
        tempo_producao_horas: validData.tempo_producao_horas,
        tempo_setup_horas: validData.tempo_setup_horas,
        rendimento_percentual: validData.rendimento_percentual,
        observacoes: validData.observacoes,
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      await trx('prd_03_bom')
        .where({ id })
        .update(updateData);

      // Desativar itens existentes
      await trx('prd_04_itens_bom')
        .where('bom_id', id)
        .update({ ativo: false });

      // Criar novos itens
      if (validData.itens && validData.itens.length > 0) {
        await this.createBOMItems(trx, id, validData.itens, userId);
      }

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_03_bom',
        operacao: 'UPDATE',
        registro_id: id,
        dados_anteriores: existingBOM,
        dados_novos: updateData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getBOMById(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async deleteBOM(id, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const bom = await trx('prd_03_bom')
        .where({ id, ativo: true })
        .first();

      if (!bom) {
        throw new Error('BOM não encontrado');
      }

      // Verificar se BOM está sendo usado em ordens de produção
      const ordersUsing = await trx('prd_01_ordens_producao')
        .where('bom_id', id)
        .where('ativo', true)
        .count('* as total')
        .first();

      if (parseInt(ordersUsing.total) > 0) {
        throw new Error('Não é possível excluir BOM em uso por ordens de produção');
      }

      const updateData = {
        ativo: false,
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      await trx('prd_03_bom')
        .where({ id })
        .update(updateData);

      // Desativar itens
      await trx('prd_04_itens_bom')
        .where('bom_id', id)
        .update({ ativo: false });

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_03_bom',
        operacao: 'DELETE',
        registro_id: id,
        dados_anteriores: bom,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return { success: true, message: 'BOM excluído com sucesso' };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async explodeBOM(id, levels = 99) {
    try {
      const bom = await this.knex('prd_03_bom')
        .where({ id, ativo: true })
        .first();

      if (!bom) {
        throw new Error('BOM não encontrado');
      }

      return this.explodeBOMRecursive(id, levels, 0, 1);
    } catch (error) {
      throw new Error(`Erro ao explodir BOM: ${error.message}`);
    }
  }

  async explodeBOMRecursive(bomId, maxLevels, currentLevel, parentQuantity) {
    if (currentLevel >= maxLevels) {
      return [];
    }

    const items = await this.knex('prd_04_itens_bom as bi')
      .join('cad_04_produtos as p', 'bi.produto_id', 'p.id')
      .leftJoin('prd_03_bom as child_bom', function() {
        this.on('child_bom.produto_id', 'p.id')
            .andOn('child_bom.ativo', this.knex.raw('true'));
      })
      .select(
        'bi.*',
        'p.nome as produto_nome',
        'p.codigo as produto_codigo',
        'p.tipo as produto_tipo',
        'child_bom.id as child_bom_id'
      )
      .where('bi.bom_id', bomId)
      .where('bi.ativo', true)
      .orderBy('bi.posicao');

    const explodedItems = [];

    for (const item of items) {
      const totalQuantity = item.quantidade * parentQuantity;
      
      const explodedItem = {
        ...item,
        nivel: currentLevel,
        quantidade_total: totalQuantity,
        filhos: []
      };

      // Se o item tem BOM próprio, explodir recursivamente
      if (item.child_bom_id) {
        explodedItem.filhos = await this.explodeBOMRecursive(
          item.child_bom_id,
          maxLevels,
          currentLevel + 1,
          totalQuantity
        );
      }

      explodedItems.push(explodedItem);
    }

    return explodedItems;
  }

  async calculateBOMCost(id, quantity = 1) {
    try {
      const bom = await this.knex('prd_03_bom')
        .where({ id, ativo: true })
        .first();

      if (!bom) {
        throw new Error('BOM não encontrado');
      }

      // Calcular custo de materiais
      const materialCosts = await this.knex('prd_04_itens_bom as bi')
        .join('cad_04_produtos as p', 'bi.produto_id', 'p.id')
        .select(
          'bi.quantidade',
          'bi.refugo_percentual',
          'p.preco_custo',
          'p.nome as produto_nome'
        )
        .where('bi.bom_id', id)
        .where('bi.ativo', true);

      let totalMaterialCost = 0;
      const materialDetails = [];

      for (const material of materialCosts) {
        const quantityWithWaste = material.quantidade * (1 + material.refugo_percentual / 100);
        const cost = quantityWithWaste * material.preco_custo * quantity;
        totalMaterialCost += cost;

        materialDetails.push({
          produto: material.produto_nome,
          quantidade: material.quantidade,
          refugo_percentual: material.refugo_percentual,
          quantidade_com_refugo: quantityWithWaste,
          preco_unitario: material.preco_custo,
          custo_total: cost
        });
      }

      // Calcular custo de mão de obra
      const laborCosts = await this.knex('prd_06_operacoes as op')
        .leftJoin('prd_02_centros_trabalho as wc', 'op.centro_trabalho_id', 'wc.id')
        .select(
          'op.tempo_setup_minutos',
          'op.tempo_execucao_minutos',
          'op.descricao',
          'wc.custo_hora',
          'wc.nome as centro_nome'
        )
        .where('op.bom_id', id)
        .where('op.ativo', true);

      let totalLaborCost = 0;
      const laborDetails = [];

      for (const operation of laborCosts) {
        const setupCost = (operation.tempo_setup_minutos / 60) * operation.custo_hora;
        const executionCost = (operation.tempo_execucao_minutos / 60) * operation.custo_hora * quantity;
        const totalOpCost = setupCost + executionCost;
        totalLaborCost += totalOpCost;

        laborDetails.push({
          operacao: operation.descricao,
          centro_trabalho: operation.centro_nome,
          tempo_setup: operation.tempo_setup_minutos,
          tempo_execucao: operation.tempo_execucao_minutos,
          custo_hora: operation.custo_hora,
          custo_setup: setupCost,
          custo_execucao: executionCost,
          custo_total: totalOpCost
        });
      }

      // Calcular overhead (pode ser configurável)
      const overheadRate = 0.15; // 15% do custo total de material e mão de obra
      const totalOverhead = (totalMaterialCost + totalLaborCost) * overheadRate;

      const totalCost = totalMaterialCost + totalLaborCost + totalOverhead;

      return {
        bom_id: id,
        quantidade: quantity,
        custo_material: totalMaterialCost,
        custo_mao_obra: totalLaborCost,
        custo_overhead: totalOverhead,
        custo_total: totalCost,
        custo_unitario: totalCost / quantity,
        detalhes_materiais: materialDetails,
        detalhes_mao_obra: laborDetails,
        calculado_em: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Erro ao calcular custo do BOM: ${error.message}`);
    }
  }

  async getBOMRevisions(bomId) {
    try {
      const revisions = await this.knex('prd_07_revisoes_bom as r')
        .leftJoin('cad_01_usuarios as u', 'r.created_by', 'u.id')
        .select(
          'r.*',
          'u.nome as usuario_nome'
        )
        .where('r.bom_id', bomId)
        .orderBy('r.created_at', 'desc');

      return revisions;
    } catch (error) {
      throw new Error(`Erro ao buscar revisões do BOM: ${error.message}`);
    }
  }

  async createBOMRevision(bomId, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const bom = await trx('prd_03_bom')
        .where({ id: bomId, ativo: true })
        .first();

      if (!bom) {
        throw new Error('BOM não encontrado');
      }

      const revisionData = {
        bom_id: bomId,
        versao_anterior: bom.versao,
        motivo: data.motivo,
        descricao_alteracao: data.descricao_alteracao,
        created_at: new Date().toISOString(),
        created_by: userId
      };

      await trx('prd_07_revisoes_bom').insert(revisionData);

      // Criar nova versão do BOM
      const newVersion = this.generateNextVersion(bom.versao);
      await trx('prd_03_bom')
        .where('id', bomId)
        .update({
          versao: newVersion,
          updated_at: new Date().toISOString(),
          updated_by: userId
        });

      await trx.commit();

      return this.getBOMById(bomId);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  generateNextVersion(currentVersion) {
    const parts = currentVersion.split('.');
    const lastPart = parseInt(parts[parts.length - 1]) + 1;
    parts[parts.length - 1] = lastPart.toString();
    return parts.join('.');
  }

  async copyBOM(id, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const originalBOM = await this.getBOMById(id);
      
      const newBOMData = {
        ...originalBOM,
        versao: data.versao,
        produto_id: data.produto_id || originalBOM.produto_id,
        descricao: data.descricao || `Cópia de ${originalBOM.descricao}`,
        data_efetiva: data.data_efetiva || new Date().toISOString(),
        itens: originalBOM.itens
      };

      delete newBOMData.id;
      delete newBOMData.created_at;
      delete newBOMData.updated_at;
      delete newBOMData.created_by;

      const newBOM = await this.createBOM(newBOMData, userId);

      await trx.commit();

      return newBOM;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async validateBOM(id) {
    try {
      const bom = await this.getBOMById(id);
      const validationResults = [];

      // Validar se todos os produtos dos itens existem
      for (const item of bom.itens) {
        const product = await this.knex('cad_04_produtos')
          .where('id', item.produto_id)
          .where('ativo', true)
          .first();

        if (!product) {
          validationResults.push({
            tipo: 'erro',
            item: item.posicao,
            produto: item.produto_nome,
            mensagem: 'Produto não encontrado ou inativo'
          });
        }
      }

      // Validar se há itens duplicados
      const duplicates = bom.itens.filter((item, index, self) => 
        self.findIndex(i => i.produto_id === item.produto_id) !== index
      );

      for (const duplicate of duplicates) {
        validationResults.push({
          tipo: 'aviso',
          item: duplicate.posicao,
          produto: duplicate.produto_nome,
          mensagem: 'Produto duplicado no BOM'
        });
      }

      // Validar se há dependências circulares
      const circularDependency = await this.checkCircularDependency(id, bom.produto_id);
      if (circularDependency) {
        validationResults.push({
          tipo: 'erro',
          mensagem: 'Dependência circular detectada'
        });
      }

      return {
        bom_id: id,
        valido: !validationResults.some(r => r.tipo === 'erro'),
        total_erros: validationResults.filter(r => r.tipo === 'erro').length,
        total_avisos: validationResults.filter(r => r.tipo === 'aviso').length,
        resultados: validationResults
      };
    } catch (error) {
      throw new Error(`Erro ao validar BOM: ${error.message}`);
    }
  }

  async checkCircularDependency(bomId, productId, visited = new Set()) {
    if (visited.has(bomId)) {
      return true;
    }

    visited.add(bomId);

    const items = await this.knex('prd_04_itens_bom as bi')
      .join('prd_03_bom as b', 'bi.produto_id', 'b.produto_id')
      .where('bi.bom_id', bomId)
      .where('bi.ativo', true)
      .where('b.ativo', true)
      .select('b.id', 'b.produto_id');

    for (const item of items) {
      if (item.produto_id === productId) {
        return true;
      }

      const hasCircular = await this.checkCircularDependency(item.id, productId, visited);
      if (hasCircular) {
        return true;
      }
    }

    visited.delete(bomId);
    return false;
  }

  async getBOMUsage(id) {
    try {
      const bom = await this.knex('prd_03_bom')
        .where({ id, ativo: true })
        .first();

      if (!bom) {
        throw new Error('BOM não encontrado');
      }

      // Buscar ordens de produção que usam este BOM
      const productionOrders = await this.knex('prd_01_ordens_producao as po')
        .leftJoin('cad_01_usuarios as u', 'po.created_by', 'u.id')
        .select(
          'po.id',
          'po.numero_ordem',
          'po.status',
          'po.quantidade_planejada',
          'po.data_inicio_planejada',
          'po.data_fim_planejada',
          'u.nome as criado_por'
        )
        .where('po.bom_id', id)
        .where('po.ativo', true)
        .orderBy('po.created_at', 'desc');

      // Buscar outros BOMs que usam produtos deste BOM
      const whereUsed = await this.knex('prd_04_itens_bom as bi')
        .join('prd_03_bom as b', 'bi.bom_id', 'b.id')
        .join('cad_04_produtos as p', 'b.produto_id', 'p.id')
        .where('bi.produto_id', bom.produto_id)
        .where('bi.ativo', true)
        .where('b.ativo', true)
        .whereNot('b.id', id)
        .select(
          'b.id',
          'b.versao',
          'b.tipo',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo',
          'bi.quantidade'
        );

      return {
        bom_id: id,
        ordens_producao: productionOrders,
        usado_em: whereUsed,
        total_ordens: productionOrders.length,
        total_usado_em: whereUsed.length
      };
    } catch (error) {
      throw new Error(`Erro ao buscar uso do BOM: ${error.message}`);
    }
  }
}

module.exports = BOMService;