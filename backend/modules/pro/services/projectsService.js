const { ValidationService } = require('./validationService');
const auditLogger = require('../../../src/utils/auditLogger');

class ProjectsService {
  constructor(knex) {
    this.knex = knex;
  }

  async listProjects(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      let query = this.knex('pro_01_projetos as p')
        .leftJoin('cad_02_clientes as c', 'p.cliente_id', 'c.id')
        .leftJoin('cad_01_usuarios as pm', 'p.gerente_projeto_id', 'pm.id')
        .select(
          'p.*',
          'c.nome as cliente_nome',
          'pm.nome as gerente_nome'
        )
        .where('p.ativo', true);

      // Aplicar filtros
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.whereIn('p.status', filters.status);
        } else {
          query = query.where('p.status', filters.status);
        }
      }

      if (filters.cliente_id) {
        query = query.where('p.cliente_id', filters.cliente_id);
      }

      if (filters.gerente_projeto_id) {
        query = query.where('p.gerente_projeto_id', filters.gerente_projeto_id);
      }

      if (filters.data_inicio) {
        query = query.where('p.data_inicio_planejada', '>=', filters.data_inicio);
      }

      if (filters.data_fim) {
        query = query.where('p.data_fim_planejada', '<=', filters.data_fim);
      }

      if (filters.search) {
        query = query.where(function() {
          this.where('p.nome', 'ilike', `%${filters.search}%`)
              .orWhere('p.codigo', 'ilike', `%${filters.search}%`)
              .orWhere('p.descricao', 'ilike', `%${filters.search}%`);
        });
      }

      // Buscar total de registros
      const totalQuery = query.clone().clearSelect().count('* as total');
      const [{ total }] = await totalQuery;

      // Aplicar paginação e ordenação
      const results = await query
        .orderBy('p.data_inicio_planejada', 'desc')
        .limit(limit)
        .offset(offset);

      // Adicionar métricas para cada projeto
      for (const project of results) {
        const metrics = await this.getProjectMetrics(project.id);
        project.metricas = metrics;
      }

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
      throw new Error(`Erro ao listar projetos: ${error.message}`);
    }
  }

  async getProjectById(id) {
    try {
      const project = await this.knex('pro_01_projetos as p')
        .leftJoin('cad_02_clientes as c', 'p.cliente_id', 'c.id')
        .leftJoin('cad_01_usuarios as pm', 'p.gerente_projeto_id', 'pm.id')
        .select(
          'p.*',
          'c.nome as cliente_nome',
          'c.email as cliente_email',
          'pm.nome as gerente_nome',
          'pm.email as gerente_email'
        )
        .where('p.id', id)
        .where('p.ativo', true)
        .first();

      if (!project) {
        throw new Error('Projeto não encontrado');
      }

      // Buscar fases do projeto
      const fases = await this.knex('pro_02_fases')
        .where('projeto_id', id)
        .where('ativo', true)
        .orderBy('sequencia');

      // Buscar tarefas do projeto
      const tarefas = await this.knex('pro_03_tarefas as t')
        .leftJoin('cad_01_usuarios as resp', 't.responsavel_id', 'resp.id')
        .leftJoin('pro_02_fases as f', 't.fase_id', 'f.id')
        .select(
          't.*',
          'resp.nome as responsavel_nome',
          'f.nome as fase_nome'
        )
        .where('t.projeto_id', id)
        .where('t.ativo', true)
        .orderBy('t.data_inicio_planejada');

      // Buscar recursos alocados
      const recursos = await this.knex('pro_05_alocacoes as a')
        .join('pro_04_recursos as r', 'a.recurso_id', 'r.id')
        .select(
          'a.*',
          'r.nome as recurso_nome',
          'r.tipo as recurso_tipo',
          'r.custo_hora'
        )
        .where('a.projeto_id', id)
        .where('a.ativo', true);

      // Buscar métricas do projeto
      const metricas = await this.getProjectMetrics(id);

      return {
        ...project,
        fases,
        tarefas,
        recursos,
        metricas
      };
    } catch (error) {
      throw new Error(`Erro ao buscar projeto: ${error.message}`);
    }
  }

  async createProject(data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const validData = ValidationService.validateProject(data);

      // Gerar código único se não fornecido
      if (!validData.codigo) {
        const lastProject = await trx('pro_01_projetos')
          .where('codigo', 'like', 'PRJ%')
          .orderBy('created_at', 'desc')
          .first();
        
        const nextNumber = lastProject ? 
          parseInt(lastProject.codigo.substring(3)) + 1 : 1;
        validData.codigo = `PRJ${nextNumber.toString().padStart(4, '0')}`;
      }

      // Verificar unicidade do código
      const existingProject = await trx('pro_01_projetos')
        .where('codigo', validData.codigo)
        .where('ativo', true)
        .first();

      if (existingProject) {
        throw new Error('Código do projeto já existe');
      }

      const now = new Date().toISOString();
      const projectData = {
        ...validData,
        created_at: now,
        updated_at: now,
        created_by: userId
      };

      const [project] = await trx('pro_01_projetos')
        .insert(projectData)
        .returning('*');

      // Criar fases padrão se especificadas
      if (data.fases_padrao && data.fases_padrao.length > 0) {
        const fases = data.fases_padrao.map((fase, index) => ({
          projeto_id: project.id,
          nome: fase.nome,
          descricao: fase.descricao,
          sequencia: index + 1,
          data_inicio_planejada: fase.data_inicio || project.data_inicio_planejada,
          data_fim_planejada: fase.data_fim || project.data_fim_planejada,
          status: 'planejada',
          created_at: now,
          created_by: userId
        }));

        await trx('pro_02_fases').insert(fases);
      }

      // Log de auditoria
      await auditLogger.log({
        tabela: 'pro_01_projetos',
        operacao: 'INSERT',
        registro_id: project.id,
        dados_novos: projectData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getProjectById(project.id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async updateProject(id, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const existingProject = await trx('pro_01_projetos')
        .where({ id, ativo: true })
        .first();

      if (!existingProject) {
        throw new Error('Projeto não encontrado');
      }

      const validData = ValidationService.validateProject({
        ...existingProject,
        ...data
      });

      const updateData = {
        ...validData,
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      delete updateData.id;
      delete updateData.created_at;
      delete updateData.created_by;

      await trx('pro_01_projetos')
        .where({ id })
        .update(updateData);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'pro_01_projetos',
        operacao: 'UPDATE',
        registro_id: id,
        dados_anteriores: existingProject,
        dados_novos: updateData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getProjectById(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async getProjectMetrics(projectId) {
    try {
      // Métricas de tarefas
      const taskMetrics = await this.knex('pro_03_tarefas')
        .where('projeto_id', projectId)
        .where('ativo', true)
        .select(
          this.knex.raw('COUNT(*) as total_tarefas'),
          this.knex.raw('COUNT(*) FILTER (WHERE status = ?) as tarefas_concluidas', ['concluida']),
          this.knex.raw('COUNT(*) FILTER (WHERE status = ?) as tarefas_em_andamento', ['em_andamento']),
          this.knex.raw('COUNT(*) FILTER (WHERE status = ?) as tarefas_pendentes', ['pendente']),
          this.knex.raw('SUM(horas_estimadas) as total_horas_estimadas'),
          this.knex.raw('SUM(horas_realizadas) as total_horas_realizadas')
        )
        .first();

      // Métricas financeiras
      const budgetMetrics = await this.knex('pro_01_projetos')
        .where('id', projectId)
        .select('orcamento_total', 'custo_realizado')
        .first();

      // Cálculo de progresso
      const totalTasks = parseInt(taskMetrics.total_tarefas) || 0;
      const completedTasks = parseInt(taskMetrics.tarefas_concluidas) || 0;
      const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Eficiência de tempo
      const estimatedHours = parseFloat(taskMetrics.total_horas_estimadas) || 0;
      const actualHours = parseFloat(taskMetrics.total_horas_realizadas) || 0;
      const timeEfficiency = estimatedHours > 0 ? (estimatedHours / actualHours) * 100 : 0;

      // Eficiência orçamentária
      const budget = parseFloat(budgetMetrics.orcamento_total) || 0;
      const spent = parseFloat(budgetMetrics.custo_realizado) || 0;
      const budgetUtilization = budget > 0 ? (spent / budget) * 100 : 0;

      return {
        tarefas: {
          total: totalTasks,
          concluidas: completedTasks,
          em_andamento: parseInt(taskMetrics.tarefas_em_andamento) || 0,
          pendentes: parseInt(taskMetrics.tarefas_pendentes) || 0
        },
        tempo: {
          estimado: estimatedHours,
          realizado: actualHours,
          eficiencia: timeEfficiency
        },
        financeiro: {
          orcamento: budget,
          gasto: spent,
          utilizacao: budgetUtilization,
          saldo: budget - spent
        },
        progresso: {
          percentual: progressPercentage,
          status: progressPercentage === 100 ? 'Concluído' :
                  progressPercentage > 0 ? 'Em Andamento' : 'Não Iniciado'
        }
      };
    } catch (error) {
      throw new Error(`Erro ao calcular métricas: ${error.message}`);
    }
  }

  async getProjectStats(filters = {}) {
    try {
      let query = this.knex('pro_01_projetos')
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
          this.knex.raw('COUNT(*) as total_projetos'),
          this.knex.raw('COUNT(*) FILTER (WHERE status = ?) as planejamento', ['planejamento']),
          this.knex.raw('COUNT(*) FILTER (WHERE status = ?) as em_andamento', ['em_andamento']),
          this.knex.raw('COUNT(*) FILTER (WHERE status = ?) as concluidos', ['concluido']),
          this.knex.raw('COUNT(*) FILTER (WHERE status = ?) as cancelados', ['cancelado']),
          this.knex.raw('SUM(orcamento_total) as orcamento_total'),
          this.knex.raw('SUM(custo_realizado) as custo_total'),
          this.knex.raw('AVG(CASE WHEN data_fim_real IS NOT NULL AND data_inicio_real IS NOT NULL THEN EXTRACT(epoch FROM (data_fim_real - data_inicio_real))/86400 END) as duracao_media_dias')
        )
        .first();

      // Projetos atrasados
      const projetosAtrasados = await this.knex('pro_01_projetos')
        .where('ativo', true)
        .where('status', 'in', ['em_andamento'])
        .where('data_fim_planejada', '<', new Date().toISOString())
        .count('* as total')
        .first();

      return {
        ...stats,
        projetos_atrasados: parseInt(projetosAtrasados.total),
        margem_lucro: stats.orcamento_total > 0 ? 
          ((stats.orcamento_total - stats.custo_total) / stats.orcamento_total) * 100 : 0
      };
    } catch (error) {
      throw new Error(`Erro ao obter estatísticas: ${error.message}`);
    }
  }

  async getGanttData(projectId) {
    try {
      const project = await this.knex('pro_01_projetos')
        .where({ id: projectId, ativo: true })
        .first();

      if (!project) {
        throw new Error('Projeto não encontrado');
      }

      // Buscar tarefas com dependências
      const tasks = await this.knex('pro_03_tarefas as t')
        .leftJoin('cad_01_usuarios as resp', 't.responsavel_id', 'resp.id')
        .leftJoin('pro_02_fases as f', 't.fase_id', 'f.id')
        .select(
          't.id',
          't.nome',
          't.data_inicio_planejada as start',
          't.data_fim_planejada as end',
          't.progresso',
          't.dependencias',
          'resp.nome as responsavel',
          'f.nome as fase'
        )
        .where('t.projeto_id', projectId)
        .where('t.ativo', true)
        .orderBy('t.data_inicio_planejada');

      // Formatar para formato Gantt
      const ganttTasks = tasks.map(task => ({
        id: task.id,
        text: task.nome,
        start_date: task.start,
        end_date: task.end,
        progress: task.progresso / 100,
        parent: 0, // Seria implementado com hierarquia de fases
        type: 'task',
        assignee: task.responsavel,
        phase: task.fase,
        dependencies: task.dependencias || []
      }));

      // Adicionar marcos (milestones)
      const milestones = await this.knex('pro_02_fases')
        .select(
          'id',
          'nome as text',
          'data_fim_planejada as start_date',
          'data_fim_planejada as end_date'
        )
        .where('projeto_id', projectId)
        .where('ativo', true);

      const ganttMilestones = milestones.map(milestone => ({
        ...milestone,
        type: 'milestone',
        progress: 0,
        parent: 0
      }));

      return {
        data: [...ganttTasks, ...ganttMilestones],
        links: [] // Seria implementado com dependências reais
      };
    } catch (error) {
      throw new Error(`Erro ao obter dados Gantt: ${error.message}`);
    }
  }
}

module.exports = ProjectsService;