const auditLogger = require('../../../src/utils/auditLogger');
const z = require('zod');

const WarehouseSchema = z.object({
  codigo: z.string().min(1).max(20),
  nome: z.string().min(1).max(100),
  tipo: z.enum(['deposito', 'centro_distribuicao', 'cross_docking', 'hub_urbano']),
  endereco: z.object({
    logradouro: z.string().min(1).max(200),
    numero: z.string().max(20),
    complemento: z.string().max(100).optional(),
    bairro: z.string().min(1).max(100),
    cidade: z.string().min(1).max(100),
    estado: z.string().length(2),
    cep: z.string().regex(/^\d{5}-?\d{3}$/),
    pais: z.string().default('Brasil')
  }),
  coordenadas: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }),
  capacidade: z.object({
    area_total_m2: z.number().positive(),
    area_armazenagem_m2: z.number().positive(),
    capacidade_peso_kg: z.number().positive(),
    altura_util_m: z.number().positive(),
    posicoes_palete: z.number().int().positive()
  }),
  configuracao: z.object({
    horario_funcionamento: z.object({
      segunda: z.object({ inicio: z.string(), fim: z.string() }),
      terca: z.object({ inicio: z.string(), fim: z.string() }),
      quarta: z.object({ inicio: z.string(), fim: z.string() }),
      quinta: z.object({ inicio: z.string(), fim: z.string() }),
      sexta: z.object({ inicio: z.string(), fim: z.string() }),
      sabado: z.object({ inicio: z.string(), fim: z.string() }).optional(),
      domingo: z.object({ inicio: z.string(), fim: z.string() }).optional()
    }),
    recursos: z.object({
      empilhadeiras: z.number().int().min(0).default(0),
      transpaleteiras: z.number().int().min(0).default(0),
      docas_recebimento: z.number().int().min(0).default(0),
      docas_expedicao: z.number().int().min(0).default(0),
      operadores: z.number().int().min(0).default(0)
    }),
    tecnologias: z.object({
      wms: z.boolean().default(false),
      rfid: z.boolean().default(false),
      codigo_barras: z.boolean().default(true),
      picking_by_voice: z.boolean().default(false),
      picking_by_light: z.boolean().default(false)
    })
  }),
  responsavel_id: z.number().int().positive(),
  observacoes: z.string().max(1000).optional()
});

class WarehouseService {
  constructor(knex) {
    this.knex = knex;
  }

  async listWarehouses(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      let query = this.knex('log_05_depositos as d')
        .leftJoin('cad_01_usuarios as resp', 'd.responsavel_id', 'resp.id')
        .leftJoin('cad_01_usuarios as u', 'd.created_by', 'u.id')
        .select(
          'd.*',
          'resp.nome as responsavel_nome',
          'u.nome as criado_por_nome',
          this.knex.raw('(SELECT COUNT(*) FROM log_06_estoque_deposito WHERE deposito_id = d.id) as total_produtos')
        )
        .where('d.ativo', filters.ativo !== false);

      if (filters.tipo) {
        query = query.where('d.tipo', filters.tipo);
      }

      if (filters.cidade) {
        query = query.whereRaw("d.endereco->>'cidade' ILIKE ?", [`%${filters.cidade}%`]);
      }

      if (filters.responsavel_id) {
        query = query.where('d.responsavel_id', filters.responsavel_id);
      }

      const totalQuery = query.clone().clearSelect().count('* as total');
      const [{ total }] = await totalQuery;

      const results = await query
        .orderBy('d.nome')
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
      throw new Error(`Erro ao listar depósitos: ${error.message}`);
    }
  }

  async getWarehouseById(id) {
    try {
      const warehouse = await this.knex('log_05_depositos as d')
        .leftJoin('cad_01_usuarios as resp', 'd.responsavel_id', 'resp.id')
        .leftJoin('cad_01_usuarios as u', 'd.created_by', 'u.id')
        .select(
          'd.*',
          'resp.nome as responsavel_nome',
          'resp.email as responsavel_email',
          'u.nome as criado_por_nome'
        )
        .where('d.id', id)
        .where('d.ativo', true)
        .first();

      if (!warehouse) {
        throw new Error('Depósito não encontrado');
      }

      // Buscar estatísticas do depósito
      const stats = await this.getWarehouseStats(id);

      // Buscar localizações
      const locations = await this.knex('log_07_localizacoes')
        .where('deposito_id', id)
        .where('ativo', true)
        .orderBy('codigo');

      return {
        ...warehouse,
        estatisticas: stats,
        localizacoes: locations
      };
    } catch (error) {
      throw new Error(`Erro ao buscar depósito: ${error.message}`);
    }
  }

  async createWarehouse(data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const validData = WarehouseSchema.parse(data);

      // Verificar se código já existe
      const existingCode = await trx('log_05_depositos')
        .where('codigo', validData.codigo)
        .where('ativo', true)
        .first();

      if (existingCode) {
        throw new Error('Código do depósito já existe');
      }

      const now = new Date().toISOString();
      const warehouseData = {
        ...validData,
        endereco: JSON.stringify(validData.endereco),
        coordenadas: JSON.stringify(validData.coordenadas),
        capacidade: JSON.stringify(validData.capacidade),
        configuracao: JSON.stringify(validData.configuracao),
        created_at: now,
        updated_at: now,
        created_by: userId
      };

      const [warehouse] = await trx('log_05_depositos')
        .insert(warehouseData)
        .returning('*');

      // Criar localizações padrão
      await this.createDefaultLocations(trx, warehouse.id);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'log_05_depositos',
        operacao: 'INSERT',
        registro_id: warehouse.id,
        dados_novos: warehouseData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getWarehouseById(warehouse.id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async createDefaultLocations(trx, warehouseId) {
    const defaultLocations = [
      { codigo: 'RECEBIMENTO', tipo: 'recebimento', descricao: 'Área de recebimento' },
      { codigo: 'EXPEDICAO', tipo: 'expedicao', descricao: 'Área de expedição' },
      { codigo: 'AVARIAS', tipo: 'quarentena', descricao: 'Área de avarias' },
      { codigo: 'PICKING', tipo: 'picking', descricao: 'Área de separação' },
      { codigo: 'ESTOQUE-01', tipo: 'armazenagem', descricao: 'Estoque geral - Corredor 1' },
      { codigo: 'ESTOQUE-02', tipo: 'armazenagem', descricao: 'Estoque geral - Corredor 2' }
    ];

    for (const location of defaultLocations) {
      await trx('log_07_localizacoes').insert({
        deposito_id: warehouseId,
        codigo: location.codigo,
        tipo: location.tipo,
        descricao: location.descricao,
        capacidade_maxima: 1000,
        ativo: true,
        created_at: new Date().toISOString()
      });
    }
  }

  async updateWarehouse(id, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const existingWarehouse = await trx('log_05_depositos')
        .where({ id, ativo: true })
        .first();

      if (!existingWarehouse) {
        throw new Error('Depósito não encontrado');
      }

      const validData = WarehouseSchema.parse({
        ...existingWarehouse,
        endereco: typeof existingWarehouse.endereco === 'string' ? 
          JSON.parse(existingWarehouse.endereco) : existingWarehouse.endereco,
        coordenadas: typeof existingWarehouse.coordenadas === 'string' ? 
          JSON.parse(existingWarehouse.coordenadas) : existingWarehouse.coordenadas,
        capacidade: typeof existingWarehouse.capacidade === 'string' ? 
          JSON.parse(existingWarehouse.capacidade) : existingWarehouse.capacidade,
        configuracao: typeof existingWarehouse.configuracao === 'string' ? 
          JSON.parse(existingWarehouse.configuracao) : existingWarehouse.configuracao,
        ...data
      });

      const updateData = {
        ...validData,
        endereco: JSON.stringify(validData.endereco),
        coordenadas: JSON.stringify(validData.coordenadas),
        capacidade: JSON.stringify(validData.capacidade),
        configuracao: JSON.stringify(validData.configuracao),
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      delete updateData.id;
      delete updateData.created_at;
      delete updateData.created_by;

      await trx('log_05_depositos')
        .where({ id })
        .update(updateData);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'log_05_depositos',
        operacao: 'UPDATE',
        registro_id: id,
        dados_anteriores: existingWarehouse,
        dados_novos: updateData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getWarehouseById(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async deleteWarehouse(id, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const warehouse = await trx('log_05_depositos')
        .where({ id, ativo: true })
        .first();

      if (!warehouse) {
        throw new Error('Depósito não encontrado');
      }

      // Verificar se há estoque
      const hasInventory = await trx('log_06_estoque_deposito')
        .where('deposito_id', id)
        .where('quantidade_atual', '>', 0)
        .count('* as total')
        .first();

      if (parseInt(hasInventory.total) > 0) {
        throw new Error('Não é possível excluir depósito com estoque');
      }

      const updateData = {
        ativo: false,
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      await trx('log_05_depositos')
        .where({ id })
        .update(updateData);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'log_05_depositos',
        operacao: 'DELETE',
        registro_id: id,
        dados_anteriores: warehouse,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return { success: true, message: 'Depósito excluído com sucesso' };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async getWarehouseInventory(warehouseId, filters = {}) {
    try {
      let query = this.knex('log_06_estoque_deposito as ed')
        .join('cad_04_produtos as p', 'ed.produto_id', 'p.id')
        .leftJoin('log_07_localizacoes as l', 'ed.localizacao_id', 'l.id')
        .leftJoin('cad_06_unidades as u', 'p.unidade_medida', 'u.sigla')
        .select(
          'ed.*',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo',
          'p.preco_custo',
          'l.codigo as localizacao_codigo',
          'l.tipo as localizacao_tipo',
          'u.nome as unidade_nome'
        )
        .where('ed.deposito_id', warehouseId);

      if (filters.produto_id) {
        query = query.where('ed.produto_id', filters.produto_id);
      }

      if (filters.localizacao) {
        query = query.where('l.codigo', 'ilike', `%${filters.localizacao}%`);
      }

      if (filters.status) {
        if (filters.status === 'disponivel') {
          query = query.where('ed.quantidade_disponivel', '>', 0);
        } else if (filters.status === 'zerado') {
          query = query.where('ed.quantidade_atual', '=', 0);
        } else if (filters.status === 'reservado') {
          query = query.where('ed.quantidade_reservada', '>', 0);
        }
      }

      const inventory = await query.orderBy('p.nome');

      // Calcular totais
      const totals = inventory.reduce((acc, item) => {
        acc.valor_total += (item.quantidade_atual * item.preco_custo);
        acc.quantidade_total += item.quantidade_atual;
        acc.produtos_distintos = new Set([...acc.produtos_distintos, item.produto_id]).size;
        return acc;
      }, { valor_total: 0, quantidade_total: 0, produtos_distintos: new Set() });

      return {
        itens: inventory,
        resumo: {
          valor_total_estoque: totals.valor_total,
          quantidade_total_itens: totals.quantidade_total,
          produtos_distintos: totals.produtos_distintos,
          localizacoes_ocupadas: new Set(inventory.map(i => i.localizacao_id)).size
        }
      };
    } catch (error) {
      throw new Error(`Erro ao buscar estoque: ${error.message}`);
    }
  }

  async createInventoryMovement(warehouseId, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const MovementSchema = z.object({
        produto_id: z.number().int().positive(),
        tipo_movimento: z.enum(['entrada', 'saida', 'transferencia', 'ajuste']),
        quantidade: z.number().positive(),
        localizacao_origem_id: z.number().int().positive().optional(),
        localizacao_destino_id: z.number().int().positive().optional(),
        documento_referencia: z.string().max(100).optional(),
        observacoes: z.string().max(500).optional(),
        custo_unitario: z.number().min(0).optional()
      });

      const validData = MovementSchema.parse(data);

      // Validar warehouse existe
      const warehouse = await trx('log_05_depositos')
        .where({ id: warehouseId, ativo: true })
        .first();

      if (!warehouse) {
        throw new Error('Depósito não encontrado');
      }

      // Gerar número do movimento
      const lastMovement = await trx('log_08_movimentacoes_estoque')
        .where('numero_movimento', 'like', 'MOV%')
        .orderBy('created_at', 'desc')
        .first();

      const nextNumber = lastMovement ? 
        parseInt(lastMovement.numero_movimento.substring(3)) + 1 : 1;
      const numeroMovimento = `MOV${nextNumber.toString().padStart(8, '0')}`;

      const movementData = {
        numero_movimento: numeroMovimento,
        deposito_id: warehouseId,
        ...validData,
        data_movimento: new Date().toISOString(),
        created_at: new Date().toISOString(),
        created_by: userId
      };

      const [movement] = await trx('log_08_movimentacoes_estoque')
        .insert(movementData)
        .returning('*');

      // Atualizar estoque
      await this.updateInventoryFromMovement(trx, movement);

      await trx.commit();

      return movement;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async updateInventoryFromMovement(trx, movement) {
    const { 
      deposito_id, 
      produto_id, 
      tipo_movimento, 
      quantidade, 
      localizacao_origem_id, 
      localizacao_destino_id,
      custo_unitario 
    } = movement;

    if (tipo_movimento === 'entrada') {
      await this.processEntrada(trx, deposito_id, produto_id, localizacao_destino_id, quantidade, custo_unitario);
    } else if (tipo_movimento === 'saida') {
      await this.processSaida(trx, deposito_id, produto_id, localizacao_origem_id, quantidade);
    } else if (tipo_movimento === 'transferencia') {
      await this.processTransferencia(trx, deposito_id, produto_id, localizacao_origem_id, localizacao_destino_id, quantidade);
    } else if (tipo_movimento === 'ajuste') {
      await this.processAjuste(trx, deposito_id, produto_id, localizacao_destino_id || localizacao_origem_id, quantidade);
    }
  }

  async processEntrada(trx, depositoId, produtoId, localizacaoId, quantidade, custoUnitario) {
    const existingStock = await trx('log_06_estoque_deposito')
      .where({
        deposito_id: depositoId,
        produto_id: produtoId,
        localizacao_id: localizacaoId
      })
      .first();

    if (existingStock) {
      await trx('log_06_estoque_deposito')
        .where({
          deposito_id: depositoId,
          produto_id: produtoId,
          localizacao_id: localizacaoId
        })
        .update({
          quantidade_atual: existingStock.quantidade_atual + quantidade,
          quantidade_disponivel: existingStock.quantidade_disponivel + quantidade,
          custo_medio: custoUnitario || existingStock.custo_medio,
          updated_at: new Date().toISOString()
        });
    } else {
      await trx('log_06_estoque_deposito').insert({
        deposito_id: depositoId,
        produto_id: produtoId,
        localizacao_id: localizacaoId,
        quantidade_atual: quantidade,
        quantidade_disponivel: quantidade,
        quantidade_reservada: 0,
        custo_medio: custoUnitario || 0,
        created_at: new Date().toISOString()
      });
    }
  }

  async processSaida(trx, depositoId, produtoId, localizacaoId, quantidade) {
    const stock = await trx('log_06_estoque_deposito')
      .where({
        deposito_id: depositoId,
        produto_id: produtoId,
        localizacao_id: localizacaoId
      })
      .first();

    if (!stock || stock.quantidade_disponivel < quantidade) {
      throw new Error('Estoque insuficiente para movimentação');
    }

    await trx('log_06_estoque_deposito')
      .where({
        deposito_id: depositoId,
        produto_id: produtoId,
        localizacao_id: localizacaoId
      })
      .update({
        quantidade_atual: stock.quantidade_atual - quantidade,
        quantidade_disponivel: stock.quantidade_disponivel - quantidade,
        updated_at: new Date().toISOString()
      });
  }

  async processTransferencia(trx, depositoId, produtoId, localizacaoOrigemId, localizacaoDestinoId, quantidade) {
    // Saída da origem
    await this.processSaida(trx, depositoId, produtoId, localizacaoOrigemId, quantidade);
    
    // Entrada no destino
    const stock = await trx('log_06_estoque_deposito')
      .where({
        deposito_id: depositoId,
        produto_id: produtoId,
        localizacao_id: localizacaoOrigemId
      })
      .first();

    await this.processEntrada(trx, depositoId, produtoId, localizacaoDestinoId, quantidade, stock?.custo_medio);
  }

  async processAjuste(trx, depositoId, produtoId, localizacaoId, quantidadeNova) {
    const stock = await trx('log_06_estoque_deposito')
      .where({
        deposito_id: depositoId,
        produto_id: produtoId,
        localizacao_id: localizacaoId
      })
      .first();

    if (stock) {
      await trx('log_06_estoque_deposito')
        .where({
          deposito_id: depositoId,
          produto_id: produtoId,
          localizacao_id: localizacaoId
        })
        .update({
          quantidade_atual: quantidadeNova,
          quantidade_disponivel: quantidadeNova - stock.quantidade_reservada,
          updated_at: new Date().toISOString()
        });
    } else {
      await trx('log_06_estoque_deposito').insert({
        deposito_id: depositoId,
        produto_id: produtoId,
        localizacao_id: localizacaoId,
        quantidade_atual: quantidadeNova,
        quantidade_disponivel: quantidadeNova,
        quantidade_reservada: 0,
        custo_medio: 0,
        created_at: new Date().toISOString()
      });
    }
  }

  async getInventoryMovements(warehouseId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      let query = this.knex('log_08_movimentacoes_estoque as me')
        .join('cad_04_produtos as p', 'me.produto_id', 'p.id')
        .leftJoin('log_07_localizacoes as lo', 'me.localizacao_origem_id', 'lo.id')
        .leftJoin('log_07_localizacoes as ld', 'me.localizacao_destino_id', 'ld.id')
        .leftJoin('cad_01_usuarios as u', 'me.created_by', 'u.id')
        .select(
          'me.*',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo',
          'lo.codigo as localizacao_origem_codigo',
          'ld.codigo as localizacao_destino_codigo',
          'u.nome as criado_por_nome'
        )
        .where('me.deposito_id', warehouseId);

      if (filters.data_inicio) {
        query = query.where('me.data_movimento', '>=', filters.data_inicio);
      }

      if (filters.data_fim) {
        query = query.where('me.data_movimento', '<=', filters.data_fim);
      }

      if (filters.tipo_movimento) {
        query = query.where('me.tipo_movimento', filters.tipo_movimento);
      }

      if (filters.produto_id) {
        query = query.where('me.produto_id', filters.produto_id);
      }

      const totalQuery = query.clone().clearSelect().count('* as total');
      const [{ total }] = await totalQuery;

      const results = await query
        .orderBy('me.data_movimento', 'desc')
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
      throw new Error(`Erro ao buscar movimentações: ${error.message}`);
    }
  }

  async getWarehouseStats(warehouseId) {
    try {
      // Estatísticas básicas de estoque
      const inventoryStats = await this.knex('log_06_estoque_deposito as ed')
        .join('cad_04_produtos as p', 'ed.produto_id', 'p.id')
        .where('ed.deposito_id', warehouseId)
        .select(
          this.knex.raw('COUNT(DISTINCT ed.produto_id) as produtos_distintos'),
          this.knex.raw('COUNT(DISTINCT ed.localizacao_id) as localizacoes_ocupadas'),
          this.knex.raw('SUM(ed.quantidade_atual) as quantidade_total'),
          this.knex.raw('SUM(ed.quantidade_atual * p.preco_custo) as valor_total_estoque'),
          this.knex.raw('COUNT(*) FILTER (WHERE ed.quantidade_atual = 0) as posicoes_vazias'),
          this.knex.raw('COUNT(*) FILTER (WHERE ed.quantidade_atual > 0) as posicoes_ocupadas')
        )
        .first();

      // Movimentações do mês
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const movementStats = await this.knex('log_08_movimentacoes_estoque')
        .where('deposito_id', warehouseId)
        .where('data_movimento', '>=', startOfMonth.toISOString())
        .select(
          this.knex.raw('COUNT(*) FILTER (WHERE tipo_movimento = ?) as entradas', ['entrada']),
          this.knex.raw('COUNT(*) FILTER (WHERE tipo_movimento = ?) as saidas', ['saida']),
          this.knex.raw('COUNT(*) FILTER (WHERE tipo_movimento = ?) as transferencias', ['transferencia']),
          this.knex.raw('COUNT(*) FILTER (WHERE tipo_movimento = ?) as ajustes', ['ajuste'])
        )
        .first();

      return {
        estoque: inventoryStats,
        movimentacoes_mes: movementStats
      };
    } catch (error) {
      throw new Error(`Erro ao obter estatísticas: ${error.message}`);
    }
  }

  async processShipment(warehouseId, data, userId) {
    // Implementação simplificada do processamento de expedição
    const trx = await this.knex.transaction();
    
    try {
      const { pedido_id, itens } = data;

      for (const item of itens) {
        await this.createInventoryMovement(warehouseId, {
          produto_id: item.produto_id,
          tipo_movimento: 'saida',
          quantidade: item.quantidade,
          localizacao_origem_id: item.localizacao_id,
          documento_referencia: pedido_id,
          observacoes: 'Expedição de pedido'
        }, userId);
      }

      await trx.commit();

      return {
        pedido_id,
        status: 'expedido',
        data_expedicao: new Date().toISOString(),
        itens_expedidos: itens.length
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async processReceipt(warehouseId, data, userId) {
    // Implementação simplificada do processamento de recebimento
    const trx = await this.knex.transaction();
    
    try {
      const { ordem_compra_id, itens } = data;

      for (const item of itens) {
        await this.createInventoryMovement(warehouseId, {
          produto_id: item.produto_id,
          tipo_movimento: 'entrada',
          quantidade: item.quantidade,
          localizacao_destino_id: item.localizacao_id,
          documento_referencia: ordem_compra_id,
          observacoes: 'Recebimento de compra',
          custo_unitario: item.custo_unitario
        }, userId);
      }

      await trx.commit();

      return {
        ordem_compra_id,
        status: 'recebido',
        data_recebimento: new Date().toISOString(),
        itens_recebidos: itens.length
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async optimizeWarehouseLayout(warehouseId, algoritmo, parametros) {
    // Implementação básica de otimização de layout
    try {
      const warehouse = await this.knex('log_05_depositos')
        .where({ id: warehouseId, ativo: true })
        .first();

      if (!warehouse) {
        throw new Error('Depósito não encontrado');
      }

      // Buscar produtos com maior rotatividade
      const highTurnoverProducts = await this.knex('log_08_movimentacoes_estoque as me')
        .join('cad_04_produtos as p', 'me.produto_id', 'p.id')
        .where('me.deposito_id', warehouseId)
        .where('me.data_movimento', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .groupBy('me.produto_id', 'p.nome', 'p.codigo')
        .select(
          'me.produto_id',
          'p.nome',
          'p.codigo',
          this.knex.raw('COUNT(*) as total_movimentacoes')
        )
        .orderBy('total_movimentacoes', 'desc')
        .limit(20);

      // Sugestões de otimização
      const suggestions = [
        {
          tipo: 'proximidade_expedicao',
          descricao: 'Posicionar produtos de alta rotatividade próximos à expedição',
          produtos: highTurnoverProducts.slice(0, 10)
        },
        {
          tipo: 'consolidacao_categoria',
          descricao: 'Agrupar produtos da mesma categoria',
          impacto: 'Redução de 15% no tempo de picking'
        },
        {
          tipo: 'otimizacao_altura',
          descricao: 'Produtos pesados em posições baixas',
          impacto: 'Melhoria na ergonomia e segurança'
        }
      ];

      return {
        deposito_id: warehouseId,
        algoritmo: algoritmo,
        parametros: parametros,
        sugestoes: suggestions,
        beneficios_estimados: {
          reducao_tempo_picking: '15%',
          melhoria_ergonomia: '25%',
          otimizacao_espaco: '10%'
        }
      };
    } catch (error) {
      throw new Error(`Erro na otimização: ${error.message}`);
    }
  }

  async generatePickingList(warehouseId, options) {
    try {
      const { pedidos, tipo_picking } = options;

      if (!pedidos || pedidos.length === 0) {
        throw new Error('Nenhum pedido informado');
      }

      // Buscar itens dos pedidos
      const items = await this.knex('vnd_02_itens_pedido as ip')
        .join('vnd_01_pedidos as p', 'ip.pedido_id', 'p.id')
        .join('cad_04_produtos as prod', 'ip.produto_id', 'prod.id')
        .join('log_06_estoque_deposito as ed', function() {
          this.on('ed.produto_id', 'ip.produto_id')
              .andOn('ed.deposito_id', this.knex.raw('?', [warehouseId]));
        })
        .join('log_07_localizacoes as l', 'ed.localizacao_id', 'l.id')
        .whereIn('p.id', pedidos)
        .where('p.status', 'confirmado')
        .where('ed.quantidade_disponivel', '>', 0)
        .select(
          'ip.*',
          'p.numero_pedido',
          'prod.nome as produto_nome',
          'prod.codigo as produto_codigo',
          'ed.quantidade_disponivel',
          'ed.localizacao_id',
          'l.codigo as localizacao_codigo',
          'l.tipo as localizacao_tipo'
        )
        .orderBy('l.codigo');

      // Organizar por tipo de picking
      let pickingList;
      if (tipo_picking === 'batch') {
        pickingList = this.organizeBatchPicking(items);
      } else if (tipo_picking === 'zone') {
        pickingList = this.organizeZonePicking(items);
      } else {
        pickingList = this.organizeOrderPicking(items);
      }

      return {
        deposito_id: warehouseId,
        tipo_picking: tipo_picking,
        total_pedidos: pedidos.length,
        total_itens: items.length,
        lista_picking: pickingList,
        gerado_em: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Erro ao gerar lista de picking: ${error.message}`);
    }
  }

  organizeBatchPicking(items) {
    // Agrupar itens do mesmo produto de diferentes pedidos
    const grouped = items.reduce((acc, item) => {
      const key = `${item.produto_id}_${item.localizacao_id}`;
      if (!acc[key]) {
        acc[key] = {
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          produto_codigo: item.produto_codigo,
          localizacao_codigo: item.localizacao_codigo,
          quantidade_total: 0,
          pedidos: []
        };
      }
      acc[key].quantidade_total += item.quantidade;
      acc[key].pedidos.push({
        pedido_id: item.pedido_id,
        numero_pedido: item.numero_pedido,
        quantidade: item.quantidade
      });
      return acc;
    }, {});

    return Object.values(grouped);
  }

  organizeZonePicking(items) {
    // Agrupar por zona/área do depósito
    return items.reduce((acc, item) => {
      const zona = item.localizacao_tipo;
      if (!acc[zona]) {
        acc[zona] = [];
      }
      acc[zona].push(item);
      return acc;
    }, {});
  }

  organizeOrderPicking(items) {
    // Agrupar por pedido
    return items.reduce((acc, item) => {
      const pedidoId = item.pedido_id;
      if (!acc[pedidoId]) {
        acc[pedidoId] = {
          pedido_id: pedidoId,
          numero_pedido: item.numero_pedido,
          itens: []
        };
      }
      acc[pedidoId].itens.push(item);
      return acc;
    }, {});
  }

  async executePicking(pickingListId, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const { itens_coletados } = data;

      for (const item of itens_coletados) {
        // Criar movimentação de saída
        await this.createInventoryMovement(item.deposito_id, {
          produto_id: item.produto_id,
          tipo_movimento: 'saida',
          quantidade: item.quantidade_coletada,
          localizacao_origem_id: item.localizacao_id,
          documento_referencia: `PICKING-${pickingListId}`,
          observacoes: 'Separação de picking'
        }, userId);

        // Reservar estoque para expedição
        await trx('log_06_estoque_deposito')
          .where({
            deposito_id: item.deposito_id,
            produto_id: item.produto_id,
            localizacao_id: item.localizacao_id
          })
          .increment('quantidade_reservada', item.quantidade_coletada)
          .decrement('quantidade_disponivel', item.quantidade_coletada);
      }

      await trx.commit();

      return {
        picking_list_id: pickingListId,
        status: 'executado',
        itens_coletados: itens_coletados.length,
        executado_por: userId,
        executado_em: new Date().toISOString()
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async getOccupancyReport(warehouseId, dataReferencia) {
    try {
      const warehouse = await this.knex('log_05_depositos')
        .where({ id: warehouseId, ativo: true })
        .first();

      if (!warehouse) {
        throw new Error('Depósito não encontrado');
      }

      const capacidade = JSON.parse(warehouse.capacidade);

      // Ocupação por localização
      const occupancyByLocation = await this.knex('log_07_localizacoes as l')
        .leftJoin('log_06_estoque_deposito as ed', 'l.id', 'ed.localizacao_id')
        .leftJoin('cad_04_produtos as p', 'ed.produto_id', 'p.id')
        .where('l.deposito_id', warehouseId)
        .where('l.ativo', true)
        .groupBy('l.id', 'l.codigo', 'l.tipo', 'l.capacidade_maxima')
        .select(
          'l.id',
          'l.codigo',
          'l.tipo',
          'l.capacidade_maxima',
          this.knex.raw('COALESCE(SUM(ed.quantidade_atual), 0) as quantidade_ocupada'),
          this.knex.raw('COUNT(DISTINCT ed.produto_id) as produtos_distintos')
        )
        .orderBy('l.codigo');

      // Calcular percentuais de ocupação
      const locationsWithPercentage = occupancyByLocation.map(loc => ({
        ...loc,
        percentual_ocupacao: loc.capacidade_maxima > 0 ? 
          (loc.quantidade_ocupada / loc.capacidade_maxima) * 100 : 0
      }));

      // Resumo geral
      const totalOccupied = locationsWithPercentage.reduce((sum, loc) => sum + loc.quantidade_ocupada, 0);
      const totalCapacity = locationsWithPercentage.reduce((sum, loc) => sum + loc.capacidade_maxima, 0);

      return {
        deposito_id: warehouseId,
        data_referencia: dataReferencia || new Date().toISOString(),
        capacidade_total: capacidade,
        resumo: {
          posicoes_totais: locationsWithPercentage.length,
          posicoes_ocupadas: locationsWithPercentage.filter(l => l.quantidade_ocupada > 0).length,
          percentual_ocupacao_geral: totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0,
          quantidade_total_armazenada: totalOccupied
        },
        detalhes_por_localizacao: locationsWithPercentage
      };
    } catch (error) {
      throw new Error(`Erro no relatório de ocupação: ${error.message}`);
    }
  }

  async getPerformanceMetrics(warehouseId, dataInicio, dataFim) {
    try {
      // Métricas de movimentação
      const movementMetrics = await this.knex('log_08_movimentacoes_estoque')
        .where('deposito_id', warehouseId)
        .whereBetween('data_movimento', [dataInicio, dataFim])
        .select(
          this.knex.raw('COUNT(*) as total_movimentacoes'),
          this.knex.raw('COUNT(*) FILTER (WHERE tipo_movimento = ?) as total_entradas', ['entrada']),
          this.knex.raw('COUNT(*) FILTER (WHERE tipo_movimento = ?) as total_saidas', ['saida']),
          this.knex.raw('SUM(CASE WHEN tipo_movimento = ? THEN quantidade ELSE 0 END) as volume_entradas', ['entrada']),
          this.knex.raw('SUM(CASE WHEN tipo_movimento = ? THEN quantidade ELSE 0 END) as volume_saidas', ['saida'])
        )
        .first();

      // Giro de estoque (simplificado)
      const inventoryTurnover = await this.knex('log_06_estoque_deposito as ed')
        .join('cad_04_produtos as p', 'ed.produto_id', 'p.id')
        .where('ed.deposito_id', warehouseId)
        .where('ed.quantidade_atual', '>', 0)
        .select(
          this.knex.raw('AVG(ed.quantidade_atual * p.preco_custo) as valor_medio_estoque')
        )
        .first();

      // Acuracidade de estoque (mock - seria baseado em inventários)
      const accuracyRate = 98.5;

      return {
        deposito_id: warehouseId,
        periodo: { inicio: dataInicio, fim: dataFim },
        metricas: {
          movimentacao: movementMetrics,
          giro_estoque: {
            valor_medio: inventoryTurnover.valor_medio_estoque,
            // Seria calculado baseado em vendas/saídas
            giro_anual_estimado: 12
          },
          qualidade: {
            acuracidade_estoque: accuracyRate,
            avarias_percentual: 2.1,
            perdas_percentual: 0.8
          },
          produtividade: {
            movimentacoes_por_dia: Math.ceil(movementMetrics.total_movimentacoes / 30),
            tempo_medio_picking: 5.2, // minutos
            itens_por_hora_operador: 45
          }
        }
      };
    } catch (error) {
      throw new Error(`Erro ao calcular métricas: ${error.message}`);
    }
  }

  async executeCycleCount(warehouseId, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const { localizacoes, produtos } = data;

      const results = [];

      for (const location of localizacoes || []) {
        // Buscar estoque atual
        const currentStock = await trx('log_06_estoque_deposito')
          .where({
            deposito_id: warehouseId,
            localizacao_id: location.localizacao_id
          });

        // Comparar com contagem física
        for (const count of location.contagens) {
          const existing = currentStock.find(s => s.produto_id === count.produto_id);
          const currentQty = existing ? existing.quantidade_atual : 0;
          const countedQty = count.quantidade_contada;
          const difference = countedQty - currentQty;

          if (difference !== 0) {
            // Criar ajuste de estoque
            await this.createInventoryMovement(warehouseId, {
              produto_id: count.produto_id,
              tipo_movimento: 'ajuste',
              quantidade: Math.abs(difference),
              localizacao_destino_id: location.localizacao_id,
              documento_referencia: `INV-${new Date().getTime()}`,
              observacoes: `Inventário cíclico - ${difference > 0 ? 'Sobra' : 'Falta'}: ${Math.abs(difference)}`
            }, userId);
          }

          results.push({
            produto_id: count.produto_id,
            quantidade_sistema: currentQty,
            quantidade_contada: countedQty,
            diferenca: difference,
            status: difference === 0 ? 'ok' : 'divergente'
          });
        }
      }

      await trx.commit();

      return {
        deposito_id: warehouseId,
        data_inventario: new Date().toISOString(),
        executado_por: userId,
        resultados: results,
        resumo: {
          total_itens: results.length,
          itens_ok: results.filter(r => r.status === 'ok').length,
          itens_divergentes: results.filter(r => r.status === 'divergente').length,
          acuracidade: (results.filter(r => r.status === 'ok').length / results.length) * 100
        }
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async allocateSpace(warehouseId, data) {
    try {
      const { produto_id, quantidade, preferencias } = data;

      // Buscar localizações disponíveis
      const availableLocations = await this.knex('log_07_localizacoes as l')
        .leftJoin('log_06_estoque_deposito as ed', function() {
          this.on('l.id', 'ed.localizacao_id')
              .andOn('ed.produto_id', this.knex.raw('?', [produto_id]));
        })
        .where('l.deposito_id', warehouseId)
        .where('l.ativo', true)
        .where('l.tipo', 'armazenagem')
        .select(
          'l.*',
          this.knex.raw('COALESCE(ed.quantidade_atual, 0) as quantidade_atual'),
          this.knex.raw('l.capacidade_maxima - COALESCE(ed.quantidade_atual, 0) as capacidade_disponivel')
        )
        .having('capacidade_disponivel', '>=', quantidade)
        .orderBy('capacidade_disponivel', 'asc');

      if (availableLocations.length === 0) {
        throw new Error('Espaço insuficiente no depósito');
      }

      // Aplicar preferências
      let selectedLocation = availableLocations[0];

      if (preferencias?.proximidade_expedicao) {
        // Priorizar localizações próximas à expedição
        const expeditionNearby = availableLocations.filter(l => 
          l.codigo.includes('EXP') || l.tipo === 'picking'
        );
        if (expeditionNearby.length > 0) {
          selectedLocation = expeditionNearby[0];
        }
      }

      return {
        localizacao_recomendada: selectedLocation,
        alternativas: availableLocations.slice(1, 4),
        criterios_selecao: {
          capacidade_necessaria: quantidade,
          capacidade_disponivel: selectedLocation.capacidade_disponivel,
          eficiencia_picking: selectedLocation.tipo === 'picking' ? 'alta' : 'media'
        }
      };
    } catch (error) {
      throw new Error(`Erro na alocação de espaço: ${error.message}`);
    }
  }

  async getCapacityAnalysis(warehouseId) {
    try {
      const warehouse = await this.knex('log_05_depositos')
        .where({ id: warehouseId, ativo: true })
        .first();

      if (!warehouse) {
        throw new Error('Depósito não encontrado');
      }

      const capacidade = JSON.parse(warehouse.capacidade);

      // Análise de ocupação atual
      const currentOccupancy = await this.knex('log_06_estoque_deposito as ed')
        .join('cad_04_produtos as p', 'ed.produto_id', 'p.id')
        .where('ed.deposito_id', warehouseId)
        .select(
          this.knex.raw('COUNT(DISTINCT ed.produto_id) as produtos_distintos'),
          this.knex.raw('SUM(ed.quantidade_atual) as quantidade_total'),
          this.knex.raw('SUM(ed.quantidade_atual * p.preco_custo) as valor_total'),
          // Estimativa de volume (assumindo produtos padrão)
          this.knex.raw('SUM(ed.quantidade_atual * 0.1) as volume_estimado_m3')
        )
        .first();

      // Análise de tendências (últimos 6 meses)
      const trends = await this.knex('log_08_movimentacoes_estoque')
        .where('deposito_id', warehouseId)
        .where('data_movimento', '>=', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())
        .select(
          this.knex.raw('DATE_TRUNC(\'month\', data_movimento) as mes'),
          this.knex.raw('SUM(CASE WHEN tipo_movimento = ? THEN quantidade ELSE 0 END) as entradas', ['entrada']),
          this.knex.raw('SUM(CASE WHEN tipo_movimento = ? THEN quantidade ELSE 0 END) as saidas', ['saida'])
        )
        .groupBy(this.knex.raw('DATE_TRUNC(\'month\', data_movimento)'))
        .orderBy('mes');

      // Calcular projeções
      const avgMonthlyGrowth = trends.length > 1 ? 
        (trends[trends.length - 1].entradas - trends[0].entradas) / trends.length : 0;

      const projectedCapacity = {
        '3_meses': currentOccupancy.volume_estimado_m3 + (avgMonthlyGrowth * 3 * 0.1),
        '6_meses': currentOccupancy.volume_estimado_m3 + (avgMonthlyGrowth * 6 * 0.1),
        '12_meses': currentOccupancy.volume_estimado_m3 + (avgMonthlyGrowth * 12 * 0.1)
      };

      return {
        deposito_id: warehouseId,
        capacidade_maxima: capacidade,
        ocupacao_atual: {
          ...currentOccupancy,
          percentual_area: (currentOccupancy.volume_estimado_m3 / capacidade.area_armazenagem_m2) * 100,
          percentual_paletes: ((currentOccupancy.quantidade_total / 100) / capacidade.posicoes_palete) * 100
        },
        tendencias: trends,
        projecoes: {
          capacidade_projetada: projectedCapacity,
          alertas: [
            projectedCapacity['3_meses'] > capacidade.area_armazenagem_m2 * 0.8 ? 'Atenção: 80% da capacidade em 3 meses' : null,
            projectedCapacity['6_meses'] > capacidade.area_armazenagem_m2 * 0.9 ? 'Crítico: 90% da capacidade em 6 meses' : null
          ].filter(Boolean)
        },
        recomendacoes: [
          currentOccupancy.volume_estimado_m3 > capacidade.area_armazenagem_m2 * 0.8 ? 
            'Considerar expansão ou otimização do layout' : null,
          'Implementar gestão de estoque just-in-time para produtos de alta rotatividade',
          'Revisar políticas de estoque mínimo e máximo'
        ].filter(Boolean)
      };
    } catch (error) {
      throw new Error(`Erro na análise de capacidade: ${error.message}`);
    }
  }
}

module.exports = WarehouseService;