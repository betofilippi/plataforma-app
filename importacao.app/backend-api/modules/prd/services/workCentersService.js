const { ValidationService } = require('./validationService');
const auditLogger = require('../../../src/utils/auditLogger');
const z = require('zod');

const WorkCenterSchema = z.object({
  codigo: z.string().min(1).max(20),
  nome: z.string().min(1).max(100),
  descricao: z.string().max(500).optional(),
  tipo: z.enum(['manual', 'automatico', 'semiautomatico', 'servico']),
  departamento: z.string().max(50).optional(),
  localizacao: z.string().max(100).optional(),
  capacidade_horas_dia: z.number().positive(),
  capacidade_operadores: z.number().int().positive(),
  custo_hora: z.number().min(0),
  custo_setup: z.number().min(0).default(0),
  eficiencia_padrao: z.number().min(0).max(100).default(85),
  disponibilidade_padrao: z.number().min(0).max(100).default(90),
  configuracao: z.object({
    horario_funcionamento: z.object({
      inicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      fim: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      dias_semana: z.array(z.number().min(0).max(6))
    }),
    capacidades: z.object({
      simultaneas: z.number().int().min(1).default(1),
      setup_simultaneo: z.boolean().default(false),
      multiplos_operadores: z.boolean().default(false)
    }),
    manutencao: z.object({
      preventiva_horas: z.number().min(0).default(0),
      preditiva_horas: z.number().min(0).default(0),
      corretiva_media_horas: z.number().min(0).default(0)
    })
  }).optional(),
  observacoes: z.string().max(1000).optional()
});

class WorkCentersService {
  constructor(knex) {
    this.knex = knex;
  }

  async listWorkCenters(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      let query = this.knex('prd_02_centros_trabalho as wc')
        .leftJoin('cad_01_usuarios as u', 'wc.created_by', 'u.id')
        .select(
          'wc.*',
          'u.nome as criado_por_nome',
          this.knex.raw('(SELECT COUNT(*) FROM prd_01_ordens_producao WHERE centro_trabalho_id = wc.id AND ativo = true) as total_ordens_ativas')
        )
        .where('wc.ativo', filters.ativo !== false);

      if (filters.tipo) {
        query = query.where('wc.tipo', filters.tipo);
      }

      if (filters.departamento) {
        query = query.where('wc.departamento', 'ilike', `%${filters.departamento}%`);
      }

      if (filters.disponivel) {
        query = query.where('wc.disponivel', filters.disponivel);
      }

      const totalQuery = query.clone().clearSelect().count('* as total');
      const [{ total }] = await totalQuery;

      const results = await query
        .orderBy('wc.nome')
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
      throw new Error(`Erro ao listar centros de trabalho: ${error.message}`);
    }
  }

  async getWorkCenterById(id) {
    try {
      const workCenter = await this.knex('prd_02_centros_trabalho as wc')
        .leftJoin('cad_01_usuarios as u', 'wc.created_by', 'u.id')
        .select(
          'wc.*',
          'u.nome as criado_por_nome'
        )
        .where('wc.id', id)
        .where('wc.ativo', true)
        .first();

      if (!workCenter) {
        throw new Error('Centro de trabalho não encontrado');
      }

      // Buscar operações relacionadas
      const operations = await this.knex('prd_06_operacoes as op')
        .join('prd_03_bom as b', 'op.bom_id', 'b.id')
        .join('cad_04_produtos as p', 'b.produto_id', 'p.id')
        .select(
          'op.id',
          'op.sequencia',
          'op.descricao',
          'op.tempo_setup_minutos',
          'op.tempo_execucao_minutos',
          'b.versao as bom_versao',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo'
        )
        .where('op.centro_trabalho_id', id)
        .where('op.ativo', true)
        .orderBy('p.nome', 'op.sequencia');

      // Buscar ordens de produção ativas
      const activeOrders = await this.knex('prd_01_ordens_producao as po')
        .join('cad_04_produtos as p', 'po.produto_id', 'p.id')
        .select(
          'po.id',
          'po.numero_ordem',
          'po.status',
          'po.quantidade_planejada',
          'po.data_inicio_planejada',
          'po.data_fim_planejada',
          'p.nome as produto_nome'
        )
        .where('po.centro_trabalho_id', id)
        .where('po.ativo', true)
        .whereIn('po.status', ['planejada', 'liberada', 'em_producao'])
        .orderBy('po.data_inicio_planejada');

      // Buscar histórico de manutenção
      const maintenanceHistory = await this.knex('prd_08_manutencao_centros as mc')
        .leftJoin('cad_01_usuarios as u', 'mc.responsavel_id', 'u.id')
        .select(
          'mc.*',
          'u.nome as responsavel_nome'
        )
        .where('mc.centro_trabalho_id', id)
        .orderBy('mc.data_prevista', 'desc')
        .limit(10);

      return {
        ...workCenter,
        operacoes: operations,
        ordens_ativas: activeOrders,
        historico_manutencao: maintenanceHistory
      };
    } catch (error) {
      throw new Error(`Erro ao buscar centro de trabalho: ${error.message}`);
    }
  }

  async createWorkCenter(data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const validData = WorkCenterSchema.parse(data);

      // Verificar se código já existe
      const existingCode = await trx('prd_02_centros_trabalho')
        .where('codigo', validData.codigo)
        .where('ativo', true)
        .first();

      if (existingCode) {
        throw new Error('Código do centro de trabalho já existe');
      }

      const now = new Date().toISOString();
      const workCenterData = {
        ...validData,
        configuracao: JSON.stringify(validData.configuracao || {}),
        disponivel: true,
        created_at: now,
        updated_at: now,
        created_by: userId
      };

      const [workCenter] = await trx('prd_02_centros_trabalho')
        .insert(workCenterData)
        .returning('*');

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_02_centros_trabalho',
        operacao: 'INSERT',
        registro_id: workCenter.id,
        dados_novos: workCenterData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getWorkCenterById(workCenter.id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async updateWorkCenter(id, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const existingWorkCenter = await trx('prd_02_centros_trabalho')
        .where({ id, ativo: true })
        .first();

      if (!existingWorkCenter) {
        throw new Error('Centro de trabalho não encontrado');
      }

      const validData = WorkCenterSchema.parse({
        ...existingWorkCenter,
        ...data,
        configuracao: data.configuracao || JSON.parse(existingWorkCenter.configuracao || '{}')
      });

      // Verificar se código já existe (exceto o atual)
      if (data.codigo && data.codigo !== existingWorkCenter.codigo) {
        const existingCode = await trx('prd_02_centros_trabalho')
          .where('codigo', validData.codigo)
          .where('ativo', true)
          .whereNot('id', id)
          .first();

        if (existingCode) {
          throw new Error('Código do centro de trabalho já existe');
        }
      }

      const updateData = {
        ...validData,
        configuracao: JSON.stringify(validData.configuracao),
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      delete updateData.id;
      delete updateData.created_at;
      delete updateData.created_by;

      await trx('prd_02_centros_trabalho')
        .where({ id })
        .update(updateData);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_02_centros_trabalho',
        operacao: 'UPDATE',
        registro_id: id,
        dados_anteriores: existingWorkCenter,
        dados_novos: updateData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getWorkCenterById(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async deleteWorkCenter(id, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const workCenter = await trx('prd_02_centros_trabalho')
        .where({ id, ativo: true })
        .first();

      if (!workCenter) {
        throw new Error('Centro de trabalho não encontrado');
      }

      // Verificar se há ordens de produção ativas
      const activeOrders = await trx('prd_01_ordens_producao')
        .where('centro_trabalho_id', id)
        .where('ativo', true)
        .whereIn('status', ['planejada', 'liberada', 'em_producao'])
        .count('* as total')
        .first();

      if (parseInt(activeOrders.total) > 0) {
        throw new Error('Não é possível excluir centro de trabalho com ordens de produção ativas');
      }

      const updateData = {
        ativo: false,
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      await trx('prd_02_centros_trabalho')
        .where({ id })
        .update(updateData);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_02_centros_trabalho',
        operacao: 'DELETE',
        registro_id: id,
        dados_anteriores: workCenter,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return { success: true, message: 'Centro de trabalho excluído com sucesso' };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async getWorkCenterCapacity(id, startDate, endDate) {
    try {
      const workCenter = await this.knex('prd_02_centros_trabalho')
        .where({ id, ativo: true })
        .first();

      if (!workCenter) {
        throw new Error('Centro de trabalho não encontrado');
      }

      const configuracao = JSON.parse(workCenter.configuracao || '{}');
      const horarioFuncionamento = configuracao.horario_funcionamento || {};

      // Calcular capacidade teórica
      const capacidadeTeoria = workCenter.capacidade_horas_dia;
      const disponibilidadePadrao = workCenter.disponibilidade_padrao / 100;
      const eficienciaPadrao = workCenter.eficiencia_padrao / 100;

      const capacidadeReal = capacidadeTeoria * disponibilidadePadrao * eficienciaPadrao;

      // Buscar utilização atual
      const utilizacaoAtual = await this.knex('prd_01_ordens_producao as po')
        .join('prd_03_bom as b', 'po.bom_id', 'b.id')
        .where('po.centro_trabalho_id', id)
        .where('po.ativo', true)
        .whereIn('po.status', ['planejada', 'liberada', 'em_producao'])
        .sum('b.tempo_producao_horas * po.quantidade_planejada as horas_planejadas')
        .first();

      const horasUtilizadas = parseFloat(utilizacaoAtual.horas_planejadas || 0);
      const percentualUtilizacao = capacidadeReal > 0 ? (horasUtilizadas / capacidadeReal) * 100 : 0;

      // Calcular capacidade disponível por período
      const capacidadePorPeriodo = [];
      const dataInicio = new Date(startDate);
      const dataFim = new Date(endDate);

      for (let data = new Date(dataInicio); data <= dataFim; data.setDate(data.getDate() + 1)) {
        const diaSemana = data.getDay();
        const diasFuncionamento = horarioFuncionamento.dias_semana || [1, 2, 3, 4, 5];
        const funciona = diasFuncionamento.includes(diaSemana);

        capacidadePorPeriodo.push({
          data: data.toISOString().split('T')[0],
          dia_semana: diaSemana,
          funciona: funciona,
          capacidade_teorica: funciona ? capacidadeTeoria : 0,
          capacidade_real: funciona ? capacidadeReal : 0,
          horas_utilizadas: 0, // Seria calculado com base nas ordens programadas
          percentual_utilizacao: 0
        });
      }

      return {
        centro_trabalho_id: id,
        capacidade_teorica_dia: capacidadeTeoria,
        capacidade_real_dia: capacidadeReal,
        disponibilidade_padrao: workCenter.disponibilidade_padrao,
        eficiencia_padrao: workCenter.eficiencia_padrao,
        utilizacao_atual: {
          horas_utilizadas: horasUtilizadas,
          percentual_utilizacao: percentualUtilizacao
        },
        capacidade_por_periodo: capacidadePorPeriodo
      };
    } catch (error) {
      throw new Error(`Erro ao calcular capacidade: ${error.message}`);
    }
  }

  async getWorkCenterSchedule(id, startDate, endDate) {
    try {
      const workCenter = await this.knex('prd_02_centros_trabalho')
        .where({ id, ativo: true })
        .first();

      if (!workCenter) {
        throw new Error('Centro de trabalho não encontrado');
      }

      // Buscar ordens programadas
      const ordensProgram = await this.knex('prd_01_ordens_producao as po')
        .join('cad_04_produtos as p', 'po.produto_id', 'p.id')
        .join('prd_03_bom as b', 'po.bom_id', 'b.id')
        .select(
          'po.id',
          'po.numero_ordem',
          'po.status',
          'po.quantidade_planejada',
          'po.data_inicio_planejada',
          'po.data_fim_planejada',
          'po.data_inicio_real',
          'po.data_fim_real',
          'po.prioridade',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo',
          'b.tempo_producao_horas',
          'b.tempo_setup_horas'
        )
        .where('po.centro_trabalho_id', id)
        .where('po.ativo', true)
        .whereBetween('po.data_inicio_planejada', [startDate, endDate])
        .orderBy('po.data_inicio_planejada');

      // Buscar manutenções programadas
      const manutencoesProgram = await this.knex('prd_08_manutencao_centros as mc')
        .leftJoin('cad_01_usuarios as u', 'mc.responsavel_id', 'u.id')
        .select(
          'mc.*',
          'u.nome as responsavel_nome'
        )
        .where('mc.centro_trabalho_id', id)
        .whereBetween('mc.data_prevista', [startDate, endDate])
        .orderBy('mc.data_prevista');

      // Criar timeline consolidado
      const timeline = [];

      // Adicionar ordens de produção
      ordensProgram.forEach(ordem => {
        timeline.push({
          tipo: 'producao',
          id: ordem.id,
          titulo: `${ordem.numero_ordem} - ${ordem.produto_nome}`,
          data_inicio: ordem.data_inicio_planejada,
          data_fim: ordem.data_fim_planejada,
          data_inicio_real: ordem.data_inicio_real,
          data_fim_real: ordem.data_fim_real,
          status: ordem.status,
          prioridade: ordem.prioridade,
          duracao_horas: ordem.tempo_producao_horas + ordem.tempo_setup_horas,
          detalhes: ordem
        });
      });

      // Adicionar manutenções
      manutencoesProgram.forEach(manutencao => {
        timeline.push({
          tipo: 'manutencao',
          id: manutencao.id,
          titulo: `${manutencao.tipo} - ${manutencao.descricao}`,
          data_inicio: manutencao.data_prevista,
          data_fim: manutencao.data_fim_prevista,
          data_inicio_real: manutencao.data_inicio_real,
          data_fim_real: manutencao.data_fim_real,
          status: manutencao.status,
          prioridade: manutencao.urgencia,
          duracao_horas: manutencao.duracao_prevista_horas,
          detalhes: manutencao
        });
      });

      // Ordenar timeline
      timeline.sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));

      return {
        centro_trabalho_id: id,
        periodo: {
          inicio: startDate,
          fim: endDate
        },
        timeline: timeline,
        totais: {
          ordens_producao: ordensProgram.length,
          manutencoes: manutencoesProgram.length,
          total_eventos: timeline.length
        }
      };
    } catch (error) {
      throw new Error(`Erro ao buscar programação: ${error.message}`);
    }
  }

  async getWorkCenterStats(filters = {}) {
    try {
      let query = this.knex('prd_02_centros_trabalho as wc')
        .where('wc.ativo', true);

      const stats = await query
        .select(
          this.knex.raw('COUNT(*) as total_centros'),
          this.knex.raw('COUNT(*) FILTER (WHERE wc.disponivel = true) as centros_disponiveis'),
          this.knex.raw('AVG(wc.capacidade_horas_dia) as capacidade_media'),
          this.knex.raw('SUM(wc.capacidade_horas_dia) as capacidade_total'),
          this.knex.raw('AVG(wc.eficiencia_padrao) as eficiencia_media'),
          this.knex.raw('AVG(wc.disponibilidade_padrao) as disponibilidade_media')
        )
        .first();

      // Estatísticas por tipo
      const statsByType = await this.knex('prd_02_centros_trabalho')
        .where('ativo', true)
        .groupBy('tipo')
        .select(
          'tipo',
          this.knex.raw('COUNT(*) as total'),
          this.knex.raw('SUM(capacidade_horas_dia) as capacidade_total')
        );

      // Estatísticas por departamento
      const statsByDepartment = await this.knex('prd_02_centros_trabalho')
        .where('ativo', true)
        .whereNotNull('departamento')
        .groupBy('departamento')
        .select(
          'departamento',
          this.knex.raw('COUNT(*) as total'),
          this.knex.raw('SUM(capacidade_horas_dia) as capacidade_total')
        );

      // Utilização atual
      const utilizacaoAtual = await this.knex('prd_01_ordens_producao as po')
        .join('prd_02_centros_trabalho as wc', 'po.centro_trabalho_id', 'wc.id')
        .join('prd_03_bom as b', 'po.bom_id', 'b.id')
        .where('po.ativo', true)
        .whereIn('po.status', ['planejada', 'liberada', 'em_producao'])
        .groupBy('wc.id', 'wc.nome', 'wc.capacidade_horas_dia')
        .select(
          'wc.id',
          'wc.nome',
          'wc.capacidade_horas_dia',
          this.knex.raw('COUNT(po.id) as ordens_ativas'),
          this.knex.raw('SUM(b.tempo_producao_horas * po.quantidade_planejada) as horas_programadas')
        );

      return {
        ...stats,
        estatisticas_por_tipo: statsByType,
        estatisticas_por_departamento: statsByDepartment,
        utilizacao_atual: utilizacaoAtual
      };
    } catch (error) {
      throw new Error(`Erro ao obter estatísticas: ${error.message}`);
    }
  }

  async getWorkCenterUtilization(id, startDate, endDate) {
    try {
      const workCenter = await this.knex('prd_02_centros_trabalho')
        .where({ id, ativo: true })
        .first();

      if (!workCenter) {
        throw new Error('Centro de trabalho não encontrado');
      }

      // Buscar ordens no período
      const ordensNoPeriodo = await this.knex('prd_01_ordens_producao as po')
        .join('prd_03_bom as b', 'po.bom_id', 'b.id')
        .join('cad_04_produtos as p', 'po.produto_id', 'p.id')
        .select(
          'po.id',
          'po.numero_ordem',
          'po.status',
          'po.quantidade_planejada',
          'po.quantidade_produzida',
          'po.data_inicio_planejada',
          'po.data_fim_planejada',
          'po.data_inicio_real',
          'po.data_fim_real',
          'p.nome as produto_nome',
          'b.tempo_producao_horas',
          'b.tempo_setup_horas'
        )
        .where('po.centro_trabalho_id', id)
        .where('po.ativo', true)
        .where(function() {
          this.whereBetween('po.data_inicio_planejada', [startDate, endDate])
              .orWhereBetween('po.data_fim_planejada', [startDate, endDate])
              .orWhere(function() {
                this.where('po.data_inicio_planejada', '<=', startDate)
                    .where('po.data_fim_planejada', '>=', endDate);
              });
        })
        .orderBy('po.data_inicio_planejada');

      // Calcular métricas
      const horasPlanejadasTotal = ordensNoPeriodo.reduce((sum, ordem) => {
        return sum + ((ordem.tempo_producao_horas + ordem.tempo_setup_horas) * ordem.quantidade_planejada);
      }, 0);

      const horasRealizadasTotal = ordensNoPeriodo.reduce((sum, ordem) => {
        if (ordem.status === 'concluida' && ordem.data_inicio_real && ordem.data_fim_real) {
          const inicio = new Date(ordem.data_inicio_real);
          const fim = new Date(ordem.data_fim_real);
          return sum + ((fim - inicio) / (1000 * 60 * 60)); // Converter para horas
        }
        return sum;
      }, 0);

      const diasPeriodo = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
      const capacidadeTotal = workCenter.capacidade_horas_dia * diasPeriodo;

      const utilizacaoPercentual = capacidadeTotal > 0 ? (horasPlanejadasTotal / capacidadeTotal) * 100 : 0;
      const eficienciaReal = horasPlanejadasTotal > 0 ? (horasRealizadasTotal / horasPlanejadasTotal) * 100 : 0;

      return {
        centro_trabalho_id: id,
        periodo: {
          inicio: startDate,
          fim: endDate,
          dias: diasPeriodo
        },
        capacidade: {
          horas_dia: workCenter.capacidade_horas_dia,
          horas_total: capacidadeTotal,
          disponibilidade_padrao: workCenter.disponibilidade_padrao,
          eficiencia_padrao: workCenter.eficiencia_padrao
        },
        utilizacao: {
          horas_planejadas: horasPlanejadasTotal,
          horas_realizadas: horasRealizadasTotal,
          percentual_utilizacao: utilizacaoPercentual,
          eficiencia_real: eficienciaReal
        },
        ordens: {
          total: ordensNoPeriodo.length,
          concluidas: ordensNoPeriodo.filter(o => o.status === 'concluida').length,
          em_andamento: ordensNoPeriodo.filter(o => o.status === 'em_producao').length,
          planejadas: ordensNoPeriodo.filter(o => o.status === 'planejada').length
        },
        detalhes_ordens: ordensNoPeriodo
      };
    } catch (error) {
      throw new Error(`Erro ao calcular utilização: ${error.message}`);
    }
  }

  async getMaintenanceSchedule(id) {
    try {
      const workCenter = await this.knex('prd_02_centros_trabalho')
        .where({ id, ativo: true })
        .first();

      if (!workCenter) {
        throw new Error('Centro de trabalho não encontrado');
      }

      const manutencoes = await this.knex('prd_08_manutencao_centros as mc')
        .leftJoin('cad_01_usuarios as resp', 'mc.responsavel_id', 'resp.id')
        .leftJoin('cad_01_usuarios as exec', 'mc.executado_por', 'exec.id')
        .select(
          'mc.*',
          'resp.nome as responsavel_nome',
          'exec.nome as executado_por_nome'
        )
        .where('mc.centro_trabalho_id', id)
        .orderBy('mc.data_prevista', 'desc');

      const configuracao = JSON.parse(workCenter.configuracao || '{}');
      const manutencaoConfig = configuracao.manutencao || {};

      return {
        centro_trabalho_id: id,
        configuracao_manutencao: manutencaoConfig,
        manutencoes: manutencoes,
        resumo: {
          total: manutencoes.length,
          pendentes: manutencoes.filter(m => m.status === 'pendente').length,
          em_andamento: manutencoes.filter(m => m.status === 'em_andamento').length,
          concluidas: manutencoes.filter(m => m.status === 'concluida').length,
          atrasadas: manutencoes.filter(m => 
            m.status === 'pendente' && new Date(m.data_prevista) < new Date()
          ).length
        }
      };
    } catch (error) {
      throw new Error(`Erro ao buscar programação de manutenção: ${error.message}`);
    }
  }

  async scheduleMaintenance(id, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const workCenter = await trx('prd_02_centros_trabalho')
        .where({ id, ativo: true })
        .first();

      if (!workCenter) {
        throw new Error('Centro de trabalho não encontrado');
      }

      const MaintenanceSchema = z.object({
        tipo: z.enum(['preventiva', 'preditiva', 'corretiva']),
        descricao: z.string().min(1).max(500),
        data_prevista: z.string().datetime(),
        data_fim_prevista: z.string().datetime().optional(),
        duracao_prevista_horas: z.number().positive(),
        prioridade: z.enum(['baixa', 'media', 'alta', 'critica']).default('media'),
        responsavel_id: z.number().int().positive().optional(),
        materiais_necessarios: z.string().max(1000).optional(),
        observacoes: z.string().max(1000).optional()
      });

      const validData = MaintenanceSchema.parse(data);

      const maintenanceData = {
        centro_trabalho_id: id,
        ...validData,
        status: 'pendente',
        created_at: new Date().toISOString(),
        created_by: userId
      };

      const [maintenance] = await trx('prd_08_manutencao_centros')
        .insert(maintenanceData)
        .returning('*');

      await trx.commit();

      return maintenance;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async getPerformanceMetrics(id, startDate, endDate) {
    try {
      const workCenter = await this.knex('prd_02_centros_trabalho')
        .where({ id, ativo: true })
        .first();

      if (!workCenter) {
        throw new Error('Centro de trabalho não encontrado');
      }

      // Buscar ordens concluídas no período
      const ordensCompletas = await this.knex('prd_01_ordens_producao as po')
        .join('prd_03_bom as b', 'po.bom_id', 'b.id')
        .select(
          'po.id',
          'po.numero_ordem',
          'po.quantidade_planejada',
          'po.quantidade_produzida',
          'po.data_inicio_planejada',
          'po.data_fim_planejada',
          'po.data_inicio_real',
          'po.data_fim_real',
          'b.tempo_producao_horas'
        )
        .where('po.centro_trabalho_id', id)
        .where('po.status', 'concluida')
        .where('po.ativo', true)
        .whereBetween('po.data_fim_real', [startDate, endDate]);

      // Calcular métricas de performance
      let totalOrdens = ordensCompletas.length;
      let tempoTotalPlanejado = 0;
      let tempoTotalReal = 0;
      let quantidadeTotalPlanejada = 0;
      let quantidadeTotalProduzida = 0;
      let ordensNoPrazo = 0;
      let ordensComQualidade = 0;

      ordensCompletas.forEach(ordem => {
        const tempoPlanejado = ordem.tempo_producao_horas * ordem.quantidade_planejada;
        const tempoReal = ordem.data_fim_real && ordem.data_inicio_real ?
          (new Date(ordem.data_fim_real) - new Date(ordem.data_inicio_real)) / (1000 * 60 * 60) : 0;

        tempoTotalPlanejado += tempoPlanejado;
        tempoTotalReal += tempoReal;
        quantidadeTotalPlanejada += ordem.quantidade_planejada;
        quantidadeTotalProduzida += ordem.quantidade_produzida;

        // Verificar se foi entregue no prazo
        if (new Date(ordem.data_fim_real) <= new Date(ordem.data_fim_planejada)) {
          ordensNoPrazo++;
        }

        // Verificar qualidade (assumindo que quantidade produzida = planejada indica qualidade)
        if (ordem.quantidade_produzida >= ordem.quantidade_planejada) {
          ordensComQualidade++;
        }
      });

      // Calcular OEE (Overall Equipment Effectiveness)
      const disponibilidade = workCenter.disponibilidade_padrao / 100;
      const performance = tempoTotalPlanejado > 0 ? tempoTotalPlanejado / tempoTotalReal : 0;
      const qualidade = quantidadeTotalPlanejada > 0 ? quantidadeTotalProduzida / quantidadeTotalPlanejada : 0;
      const oee = disponibilidade * performance * qualidade;

      return {
        centro_trabalho_id: id,
        periodo: {
          inicio: startDate,
          fim: endDate
        },
        metricas: {
          oee: oee * 100,
          disponibilidade: disponibilidade * 100,
          performance: performance * 100,
          qualidade: qualidade * 100,
          eficiencia_tempo: tempoTotalReal > 0 ? (tempoTotalPlanejado / tempoTotalReal) * 100 : 0,
          pontualidade: totalOrdens > 0 ? (ordensNoPrazo / totalOrdens) * 100 : 0,
          taxa_qualidade: totalOrdens > 0 ? (ordensComQualidade / totalOrdens) * 100 : 0
        },
        totais: {
          ordens_completas: totalOrdens,
          tempo_planejado: tempoTotalPlanejado,
          tempo_real: tempoTotalReal,
          quantidade_planejada: quantidadeTotalPlanejada,
          quantidade_produzida: quantidadeTotalProduzida,
          ordens_no_prazo: ordensNoPrazo,
          ordens_com_qualidade: ordensComQualidade
        }
      };
    } catch (error) {
      throw new Error(`Erro ao calcular métricas de performance: ${error.message}`);
    }
  }

  async getAvailableTimeSlots(id, startDate, endDate, durationHours) {
    try {
      const workCenter = await this.knex('prd_02_centros_trabalho')
        .where({ id, ativo: true })
        .first();

      if (!workCenter) {
        throw new Error('Centro de trabalho não encontrado');
      }

      const configuracao = JSON.parse(workCenter.configuracao || '{}');
      const horarioFuncionamento = configuracao.horario_funcionamento || {
        inicio: '08:00',
        fim: '17:00',
        dias_semana: [1, 2, 3, 4, 5]
      };

      // Buscar compromissos já agendados
      const compromissos = await this.knex('prd_01_ordens_producao as po')
        .join('prd_03_bom as b', 'po.bom_id', 'b.id')
        .select(
          'po.data_inicio_planejada',
          'po.data_fim_planejada',
          this.knex.raw('(b.tempo_producao_horas + b.tempo_setup_horas) * po.quantidade_planejada as duracao_horas')
        )
        .where('po.centro_trabalho_id', id)
        .where('po.ativo', true)
        .whereIn('po.status', ['planejada', 'liberada', 'em_producao'])
        .where(function() {
          this.whereBetween('po.data_inicio_planejada', [startDate, endDate])
              .orWhereBetween('po.data_fim_planejada', [startDate, endDate]);
        })
        .orderBy('po.data_inicio_planejada');

      const availableSlots = [];
      const dataInicio = new Date(startDate);
      const dataFim = new Date(endDate);

      for (let data = new Date(dataInicio); data <= dataFim; data.setDate(data.getDate() + 1)) {
        const diaSemana = data.getDay();
        
        if (horarioFuncionamento.dias_semana.includes(diaSemana)) {
          const [horaInicio, minutoInicio] = horarioFuncionamento.inicio.split(':');
          const [horaFim, minutoFim] = horarioFuncionamento.fim.split(':');
          
          const inicioTurno = new Date(data);
          inicioTurno.setHours(parseInt(horaInicio), parseInt(minutoInicio), 0, 0);
          
          const fimTurno = new Date(data);
          fimTurno.setHours(parseInt(horaFim), parseInt(minutoFim), 0, 0);
          
          // Verificar slots disponíveis neste dia
          const compromissosDia = compromissos.filter(c => {
            const inicioCompromisso = new Date(c.data_inicio_planejada);
            const fimCompromisso = new Date(c.data_fim_planejada);
            return inicioCompromisso.toDateString() === data.toDateString() ||
                   fimCompromisso.toDateString() === data.toDateString();
          });

          let horarioAtual = new Date(inicioTurno);
          
          compromissosDia.forEach(compromisso => {
            const inicioCompromisso = new Date(compromisso.data_inicio_planejada);
            const fimCompromisso = new Date(compromisso.data_fim_planejada);
            
            // Verificar se há tempo disponível antes do compromisso
            if (inicioCompromisso > horarioAtual) {
              const tempoDisponivel = (inicioCompromisso - horarioAtual) / (1000 * 60 * 60);
              
              if (tempoDisponivel >= durationHours) {
                availableSlots.push({
                  data: data.toISOString().split('T')[0],
                  inicio: horarioAtual.toISOString(),
                  fim: new Date(horarioAtual.getTime() + durationHours * 60 * 60 * 1000).toISOString(),
                  duracao_horas: durationHours,
                  tempo_disponivel: tempoDisponivel
                });
              }
            }
            
            horarioAtual = new Date(Math.max(horarioAtual, fimCompromisso));
          });
          
          // Verificar se há tempo disponível após o último compromisso
          if (horarioAtual < fimTurno) {
            const tempoDisponivel = (fimTurno - horarioAtual) / (1000 * 60 * 60);
            
            if (tempoDisponivel >= durationHours) {
              availableSlots.push({
                data: data.toISOString().split('T')[0],
                inicio: horarioAtual.toISOString(),
                fim: new Date(horarioAtual.getTime() + durationHours * 60 * 60 * 1000).toISOString(),
                duracao_horas: durationHours,
                tempo_disponivel: tempoDisponivel
              });
            }
          }
        }
      }

      return {
        centro_trabalho_id: id,
        periodo: {
          inicio: startDate,
          fim: endDate
        },
        duracao_solicitada: durationHours,
        slots_disponiveis: availableSlots,
        total_slots: availableSlots.length
      };
    } catch (error) {
      throw new Error(`Erro ao buscar horários disponíveis: ${error.message}`);
    }
  }
}

module.exports = WorkCentersService;