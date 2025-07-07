const { ValidationService } = require('./validationService');
const auditLogger = require('../../../src/utils/auditLogger');
const z = require('zod');

class SchedulingService {
  constructor(knex) {
    this.knex = knex;
  }

  async getProductionSchedule(filters = {}) {
    try {
      const { data_inicio, data_fim, centro_trabalho_id, status, view_type } = filters;

      let query = this.knex('prd_01_ordens_producao as po')
        .join('cad_04_produtos as p', 'po.produto_id', 'p.id')
        .join('prd_03_bom as b', 'po.bom_id', 'b.id')
        .leftJoin('prd_02_centros_trabalho as wc', 'po.centro_trabalho_id', 'wc.id')
        .leftJoin('cad_01_usuarios as resp', 'po.responsavel_id', 'resp.id')
        .select(
          'po.*',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo',
          'b.tempo_producao_horas',
          'b.tempo_setup_horas',
          'wc.nome as centro_trabalho_nome',
          'wc.capacidade_horas_dia',
          'resp.nome as responsavel_nome'
        )
        .where('po.ativo', true);

      if (data_inicio) {
        query = query.where('po.data_inicio_planejada', '>=', data_inicio);
      }

      if (data_fim) {
        query = query.where('po.data_fim_planejada', '<=', data_fim);
      }

      if (centro_trabalho_id) {
        query = query.where('po.centro_trabalho_id', centro_trabalho_id);
      }

      if (status) {
        if (Array.isArray(status)) {
          query = query.whereIn('po.status', status);
        } else {
          query = query.where('po.status', status);
        }
      }

      const orders = await query.orderBy('po.data_inicio_planejada');

      // Organizar dados conforme o tipo de visualização
      if (view_type === 'gantt') {
        return this.formatGanttData(orders);
      } else if (view_type === 'calendar') {
        return this.formatCalendarData(orders);
      } else if (view_type === 'kanban') {
        return this.formatKanbanData(orders);
      }

      return {
        total: orders.length,
        orders: orders,
        view_type: view_type
      };
    } catch (error) {
      throw new Error(`Erro ao obter programação: ${error.message}`);
    }
  }

  formatGanttData(orders) {
    const tasks = orders.map(order => ({
      id: order.id,
      name: `${order.numero_ordem} - ${order.produto_nome}`,
      start: order.data_inicio_planejada,
      end: order.data_fim_planejada,
      duration: order.tempo_producao_horas + order.tempo_setup_horas,
      progress: this.calculateProgress(order),
      resource: order.centro_trabalho_nome,
      status: order.status,
      priority: order.prioridade,
      dependencies: [],
      type: 'task',
      details: order
    }));

    // Identificar dependências (simplificado)
    tasks.forEach(task => {
      const dependencies = orders.filter(o => 
        o.produto_id === task.details.produto_id && 
        o.id !== task.id &&
        new Date(o.data_fim_planejada) <= new Date(task.start)
      );
      task.dependencies = dependencies.map(d => d.id);
    });

    return {
      tasks: tasks,
      resources: this.extractResources(orders),
      timeline: {
        start: Math.min(...orders.map(o => new Date(o.data_inicio_planejada))),
        end: Math.max(...orders.map(o => new Date(o.data_fim_planejada)))
      }
    };
  }

  formatCalendarData(orders) {
    const events = orders.map(order => ({
      id: order.id,
      title: `${order.numero_ordem} - ${order.produto_nome}`,
      start: order.data_inicio_planejada,
      end: order.data_fim_planejada,
      color: this.getStatusColor(order.status),
      resource: order.centro_trabalho_id,
      extendedProps: {
        status: order.status,
        priority: order.prioridade,
        quantity: order.quantidade_planejada,
        details: order
      }
    }));

    return {
      events: events,
      resources: this.extractResources(orders)
    };
  }

  formatKanbanData(orders) {
    const columns = {
      planejada: { name: 'Planejada', orders: [] },
      liberada: { name: 'Liberada', orders: [] },
      em_producao: { name: 'Em Produção', orders: [] },
      concluida: { name: 'Concluída', orders: [] },
      cancelada: { name: 'Cancelada', orders: [] }
    };

    orders.forEach(order => {
      if (columns[order.status]) {
        columns[order.status].orders.push({
          id: order.id,
          title: `${order.numero_ordem}`,
          subtitle: order.produto_nome,
          priority: order.prioridade,
          dueDate: order.data_fim_planejada,
          assignee: order.responsavel_nome,
          progress: this.calculateProgress(order),
          details: order
        });
      }
    });

    return {
      columns: columns,
      stats: {
        total: orders.length,
        by_status: Object.keys(columns).reduce((acc, status) => {
          acc[status] = columns[status].orders.length;
          return acc;
        }, {})
      }
    };
  }

  calculateProgress(order) {
    if (order.status === 'concluida') return 100;
    if (order.status === 'cancelada') return 0;
    if (order.status === 'em_producao') {
      const now = new Date();
      const start = new Date(order.data_inicio_real || order.data_inicio_planejada);
      const end = new Date(order.data_fim_planejada);
      const total = end - start;
      const elapsed = now - start;
      return Math.min(Math.max((elapsed / total) * 100, 0), 100);
    }
    return 0;
  }

  getStatusColor(status) {
    const colors = {
      planejada: '#007bff',
      liberada: '#ffc107',
      em_producao: '#28a745',
      concluida: '#6c757d',
      cancelada: '#dc3545'
    };
    return colors[status] || '#007bff';
  }

  extractResources(orders) {
    const resourceMap = new Map();
    
    orders.forEach(order => {
      if (order.centro_trabalho_id && order.centro_trabalho_nome) {
        resourceMap.set(order.centro_trabalho_id, {
          id: order.centro_trabalho_id,
          name: order.centro_trabalho_nome,
          capacity: order.capacidade_horas_dia
        });
      }
    });

    return Array.from(resourceMap.values());
  }

  async optimizeSchedule(orders, constraints = {}, userId) {
    const trx = await this.knex.transaction();
    
    try {
      // Algoritmo básico de otimização
      const optimizedOrders = await this.applySchedulingAlgorithm(orders, constraints);

      // Salvar programação otimizada
      const schedulingData = {
        nome: `Programação Otimizada ${new Date().toISOString()}`,
        algoritmo: constraints.algoritmo || 'earliest_due_date',
        parametros: JSON.stringify(constraints),
        ordens_programadas: JSON.stringify(optimizedOrders),
        status: 'gerada',
        created_at: new Date().toISOString(),
        created_by: userId
      };

      const [schedule] = await trx('prd_15_programacoes')
        .insert(schedulingData)
        .returning('*');

      await trx.commit();

      return {
        schedule_id: schedule.id,
        orders: optimizedOrders,
        metrics: this.calculateScheduleMetrics(optimizedOrders),
        improvements: this.calculateImprovements(orders, optimizedOrders)
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async applySchedulingAlgorithm(orders, constraints) {
    const algorithm = constraints.algoritmo || 'earliest_due_date';
    
    switch (algorithm) {
      case 'earliest_due_date':
        return this.earliestDueDateScheduling(orders, constraints);
      case 'shortest_processing_time':
        return this.shortestProcessingTimeScheduling(orders, constraints);
      case 'critical_ratio':
        return this.criticalRatioScheduling(orders, constraints);
      case 'capacity_constrained':
        return this.capacityConstrainedScheduling(orders, constraints);
      default:
        return this.earliestDueDateScheduling(orders, constraints);
    }
  }

  earliestDueDateScheduling(orders, constraints) {
    // Ordenar por data de entrega mais próxima
    const sortedOrders = [...orders].sort((a, b) => 
      new Date(a.data_fim_planejada) - new Date(b.data_fim_planejada)
    );

    return this.scheduleOrdersSequentially(sortedOrders, constraints);
  }

  shortestProcessingTimeScheduling(orders, constraints) {
    // Ordenar por menor tempo de processamento
    const sortedOrders = [...orders].sort((a, b) => 
      a.tempo_producao_horas - b.tempo_producao_horas
    );

    return this.scheduleOrdersSequentially(sortedOrders, constraints);
  }

  criticalRatioScheduling(orders, constraints) {
    const now = new Date();
    
    // Calcular razão crítica para cada ordem
    const ordersWithRatio = orders.map(order => {
      const dueDate = new Date(order.data_fim_planejada);
      const timeRemaining = (dueDate - now) / (1000 * 60 * 60); // horas
      const workRemaining = order.tempo_producao_horas + order.tempo_setup_horas;
      const criticalRatio = timeRemaining / workRemaining;
      
      return { ...order, criticalRatio };
    });

    // Ordenar por razão crítica (menor primeiro = mais crítico)
    const sortedOrders = ordersWithRatio.sort((a, b) => a.criticalRatio - b.criticalRatio);

    return this.scheduleOrdersSequentially(sortedOrders, constraints);
  }

  async capacityConstrainedScheduling(orders, constraints) {
    // Buscar capacidades dos centros de trabalho
    const workCenters = await this.knex('prd_02_centros_trabalho')
      .where('ativo', true);

    const capacityMap = new Map();
    workCenters.forEach(wc => {
      capacityMap.set(wc.id, {
        capacity: wc.capacidade_horas_dia,
        schedule: new Map() // data -> horas ocupadas
      });
    });

    const scheduledOrders = [];

    // Ordenar por prioridade e data de entrega
    const sortedOrders = [...orders].sort((a, b) => {
      if (a.prioridade !== b.prioridade) {
        const priorityOrder = { alta: 3, media: 2, baixa: 1 };
        return priorityOrder[b.prioridade] - priorityOrder[a.prioridade];
      }
      return new Date(a.data_fim_planejada) - new Date(b.data_fim_planejada);
    });

    for (const order of sortedOrders) {
      const workCenter = capacityMap.get(order.centro_trabalho_id);
      if (!workCenter) continue;

      const duration = order.tempo_producao_horas + order.tempo_setup_horas;
      const startDate = this.findEarliestAvailableSlot(
        workCenter,
        duration,
        new Date(order.data_inicio_planejada)
      );

      const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

      // Atualizar programação do centro
      this.blockTimeSlot(workCenter, startDate, endDate);

      scheduledOrders.push({
        ...order,
        data_inicio_programada: startDate.toISOString(),
        data_fim_programada: endDate.toISOString(),
        atraso_dias: Math.max(0, (endDate - new Date(order.data_fim_planejada)) / (1000 * 60 * 60 * 24))
      });
    }

    return scheduledOrders;
  }

  scheduleOrdersSequentially(orders, constraints) {
    const scheduled = [];
    let currentTime = new Date(constraints.data_inicio || new Date());

    for (const order of orders) {
      const duration = order.tempo_producao_horas + order.tempo_setup_horas;
      const endTime = new Date(currentTime.getTime() + duration * 60 * 60 * 1000);

      scheduled.push({
        ...order,
        data_inicio_programada: currentTime.toISOString(),
        data_fim_programada: endTime.toISOString(),
        atraso_dias: Math.max(0, (endTime - new Date(order.data_fim_planejada)) / (1000 * 60 * 60 * 24))
      });

      currentTime = endTime;
    }

    return scheduled;
  }

  findEarliestAvailableSlot(workCenter, duration, preferredStart) {
    let currentDate = new Date(preferredStart);
    currentDate.setHours(8, 0, 0, 0); // Assumir início do turno às 8h

    while (true) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const occupiedHours = workCenter.schedule.get(dateKey) || 0;
      const availableHours = workCenter.capacity - occupiedHours;

      if (availableHours >= duration) {
        return new Date(currentDate);
      }

      // Tentar próximo dia
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(8, 0, 0, 0);
    }
  }

  blockTimeSlot(workCenter, startDate, endDate) {
    const durationHours = (endDate - startDate) / (1000 * 60 * 60);
    let currentDate = new Date(startDate);

    while (currentDate < endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const remainingToday = Math.min(
        durationHours,
        workCenter.capacity - (workCenter.schedule.get(dateKey) || 0)
      );

      workCenter.schedule.set(dateKey, 
        (workCenter.schedule.get(dateKey) || 0) + remainingToday
      );

      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(8, 0, 0, 0);
    }
  }

  calculateScheduleMetrics(orders) {
    const totalOrders = orders.length;
    const onTimeOrders = orders.filter(o => o.atraso_dias === 0).length;
    const averageDelay = orders.reduce((sum, o) => sum + o.atraso_dias, 0) / totalOrders;
    const maxDelay = Math.max(...orders.map(o => o.atraso_dias));
    
    const totalDuration = orders.reduce((sum, o) => 
      sum + (o.tempo_producao_horas + o.tempo_setup_horas), 0
    );

    const scheduleSpan = orders.length > 0 ? 
      (new Date(Math.max(...orders.map(o => new Date(o.data_fim_programada)))) - 
       new Date(Math.min(...orders.map(o => new Date(o.data_inicio_programada))))) / 
      (1000 * 60 * 60 * 24) : 0;

    return {
      total_ordens: totalOrders,
      ordens_no_prazo: onTimeOrders,
      taxa_pontualidade: totalOrders > 0 ? (onTimeOrders / totalOrders) * 100 : 0,
      atraso_medio_dias: averageDelay,
      atraso_maximo_dias: maxDelay,
      duracao_total_horas: totalDuration,
      tempo_programacao_dias: scheduleSpan,
      utilizacao_tempo: scheduleSpan > 0 ? (totalDuration / (scheduleSpan * 24)) * 100 : 0
    };
  }

  calculateImprovements(originalOrders, optimizedOrders) {
    const originalMetrics = this.calculateScheduleMetrics(originalOrders);
    const optimizedMetrics = this.calculateScheduleMetrics(optimizedOrders);

    return {
      pontualidade: optimizedMetrics.taxa_pontualidade - originalMetrics.taxa_pontualidade,
      atraso_medio: originalMetrics.atraso_medio_dias - optimizedMetrics.atraso_medio_dias,
      utilizacao: optimizedMetrics.utilizacao_tempo - originalMetrics.utilizacao_tempo,
      tempo_total: originalMetrics.tempo_programacao_dias - optimizedMetrics.tempo_programacao_dias
    };
  }

  async generateSchedule(periodo, algoritmo, parametros, userId) {
    try {
      // Buscar ordens não programadas no período
      const orders = await this.knex('prd_01_ordens_producao as po')
        .join('prd_03_bom as b', 'po.bom_id', 'b.id')
        .select(
          'po.*',
          'b.tempo_producao_horas',
          'b.tempo_setup_horas'
        )
        .where('po.ativo', true)
        .whereIn('po.status', ['planejada', 'liberada'])
        .whereBetween('po.data_inicio_planejada', [periodo.inicio, periodo.fim]);

      const constraints = {
        algoritmo: algoritmo,
        data_inicio: periodo.inicio,
        ...parametros
      };

      return this.optimizeSchedule(orders, constraints, userId);
    } catch (error) {
      throw new Error(`Erro ao gerar programação: ${error.message}`);
    }
  }

  async updateOrderSchedule(orderId, scheduleData, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const order = await trx('prd_01_ordens_producao')
        .where({ id: orderId, ativo: true })
        .first();

      if (!order) {
        throw new Error('Ordem de produção não encontrada');
      }

      // Verificar conflitos de capacidade
      if (scheduleData.centro_trabalho_id || scheduleData.data_inicio_planejada) {
        const conflicts = await this.checkScheduleConflicts(
          orderId,
          scheduleData.centro_trabalho_id || order.centro_trabalho_id,
          scheduleData.data_inicio_planejada || order.data_inicio_planejada,
          scheduleData.data_fim_planejada || order.data_fim_planejada,
          trx
        );

        if (conflicts.length > 0) {
          throw new Error(`Conflito de programação detectado com as ordens: ${conflicts.join(', ')}`);
        }
      }

      const updateData = {
        ...scheduleData,
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      await trx('prd_01_ordens_producao')
        .where({ id: orderId })
        .update(updateData);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_01_ordens_producao',
        operacao: 'UPDATE_SCHEDULE',
        registro_id: orderId,
        dados_anteriores: order,
        dados_novos: updateData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      const updatedOrder = await this.knex('prd_01_ordens_producao')
        .where('id', orderId)
        .first();

      return updatedOrder;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async checkScheduleConflicts(orderId, centroTrabalhoId, dataInicio, dataFim, trx) {
    const conflicts = await trx('prd_01_ordens_producao')
      .where('centro_trabalho_id', centroTrabalhoId)
      .where('ativo', true)
      .whereNot('id', orderId)
      .where(function() {
        this.whereBetween('data_inicio_planejada', [dataInicio, dataFim])
            .orWhereBetween('data_fim_planejada', [dataInicio, dataFim])
            .orWhere(function() {
              this.where('data_inicio_planejada', '<=', dataInicio)
                  .where('data_fim_planejada', '>=', dataFim);
            });
      })
      .select('numero_ordem');

    return conflicts.map(c => c.numero_ordem);
  }

  async getCapacityAnalysis(filters = {}) {
    try {
      const { data_inicio, data_fim, centro_trabalho_id } = filters;

      let query = this.knex('prd_02_centros_trabalho as wc')
        .where('wc.ativo', true);

      if (centro_trabalho_id) {
        query = query.where('wc.id', centro_trabalho_id);
      }

      const workCenters = await query.select('*');

      const analysis = [];

      for (const wc of workCenters) {
        const capacity = await this.calculateWorkCenterCapacity(wc.id, data_inicio, data_fim);
        analysis.push({
          centro_trabalho: {
            id: wc.id,
            nome: wc.nome,
            capacidade_dia: wc.capacidade_horas_dia
          },
          ...capacity
        });
      }

      return {
        periodo: { inicio: data_inicio, fim: data_fim },
        centros_trabalho: analysis,
        resumo: {
          capacidade_total: analysis.reduce((sum, a) => sum + a.capacidade_total, 0),
          utilizacao_total: analysis.reduce((sum, a) => sum + a.horas_programadas, 0),
          percentual_utilizacao: analysis.length > 0 ? 
            analysis.reduce((sum, a) => sum + a.percentual_utilizacao, 0) / analysis.length : 0
        }
      };
    } catch (error) {
      throw new Error(`Erro na análise de capacidade: ${error.message}`);
    }
  }

  async calculateWorkCenterCapacity(workCenterId, dataInicio, dataFim) {
    const workCenter = await this.knex('prd_02_centros_trabalho')
      .where('id', workCenterId)
      .first();

    if (!workCenter) {
      throw new Error('Centro de trabalho não encontrado');
    }

    const diasPeriodo = Math.ceil((new Date(dataFim) - new Date(dataInicio)) / (1000 * 60 * 60 * 24));
    const capacidadeTotal = workCenter.capacidade_horas_dia * diasPeriodo;

    const horasProgramadas = await this.knex('prd_01_ordens_producao as po')
      .join('prd_03_bom as b', 'po.bom_id', 'b.id')
      .where('po.centro_trabalho_id', workCenterId)
      .where('po.ativo', true)
      .whereBetween('po.data_inicio_planejada', [dataInicio, dataFim])
      .sum('(b.tempo_producao_horas + b.tempo_setup_horas) * po.quantidade_planejada as total')
      .first();

    const utilizacao = parseFloat(horasProgramadas.total || 0);
    const percentualUtilizacao = capacidadeTotal > 0 ? (utilizacao / capacidadeTotal) * 100 : 0;

    return {
      capacidade_total: capacidadeTotal,
      horas_programadas: utilizacao,
      horas_disponiveis: capacidadeTotal - utilizacao,
      percentual_utilizacao: percentualUtilizacao,
      status: percentualUtilizacao > 100 ? 'sobrecarga' : 
              percentualUtilizacao > 90 ? 'alta_utilizacao' :
              percentualUtilizacao > 70 ? 'normal' : 'baixa_utilizacao'
    };
  }

  async identifyBottlenecks(filters = {}) {
    try {
      const capacityAnalysis = await this.getCapacityAnalysis(filters);
      
      const bottlenecks = capacityAnalysis.centros_trabalho
        .filter(wc => wc.percentual_utilizacao > 90)
        .sort((a, b) => b.percentual_utilizacao - a.percentual_utilizacao)
        .map(wc => ({
          ...wc,
          severidade: wc.percentual_utilizacao > 100 ? 'critica' :
                     wc.percentual_utilizacao > 95 ? 'alta' : 'media',
          impacto: this.calculateBottleneckImpact(wc),
          sugestoes: this.generateBottleneckSuggestions(wc)
        }));

      return {
        periodo: filters,
        total_gargalos: bottlenecks.length,
        gargalos: bottlenecks,
        impacto_global: bottlenecks.reduce((sum, b) => sum + b.impacto.score, 0)
      };
    } catch (error) {
      throw new Error(`Erro ao identificar gargalos: ${error.message}`);
    }
  }

  calculateBottleneckImpact(workCenter) {
    const score = Math.min(workCenter.percentual_utilizacao / 100, 2) * 
                  (workCenter.horas_programadas / 1000);
    
    return {
      score: score,
      descricao: score > 1.5 ? 'Alto impacto' : score > 1 ? 'Médio impacto' : 'Baixo impacto',
      ordens_afetadas: Math.floor(workCenter.horas_programadas / 8) // Estimativa
    };
  }

  generateBottleneckSuggestions(workCenter) {
    const suggestions = [];

    if (workCenter.percentual_utilizacao > 100) {
      suggestions.push('Redistribuir ordens para outros centros de trabalho');
      suggestions.push('Considerar horas extras ou turnos adicionais');
      suggestions.push('Revisar tempos de setup para otimização');
    }

    if (workCenter.percentual_utilizacao > 95) {
      suggestions.push('Programar manutenção preventiva fora do horário de pico');
      suggestions.push('Treinar operadores em outros centros para flexibilidade');
    }

    suggestions.push('Monitorar de perto o desempenho deste centro');

    return suggestions;
  }

  async getGanttChartData(filters = {}) {
    try {
      const schedule = await this.getProductionSchedule({
        ...filters,
        view_type: 'gantt'
      });

      // Enriquecer dados para o Gantt
      const enrichedTasks = await Promise.all(
        schedule.tasks.map(async (task) => {
          const dependencies = await this.calculateTaskDependencies(task.id);
          const criticalPath = await this.isOnCriticalPath(task.id);
          
          return {
            ...task,
            dependencies: dependencies,
            critical: criticalPath,
            color: this.getTaskColor(task.status, criticalPath),
            milestone: task.type === 'milestone'
          };
        })
      );

      return {
        tasks: enrichedTasks,
        resources: schedule.resources,
        timeline: schedule.timeline,
        critical_path: await this.calculateCriticalPath(enrichedTasks),
        zoom_level: filters.zoom_level
      };
    } catch (error) {
      throw new Error(`Erro ao gerar dados do Gantt: ${error.message}`);
    }
  }

  async calculateTaskDependencies(taskId) {
    // Lógica simplificada de dependências
    // Em um sistema real, isso seria baseado em regras de negócio complexas
    const dependencies = await this.knex('prd_16_dependencias_ordens')
      .where('ordem_dependente_id', taskId)
      .select('ordem_prerequisito_id');

    return dependencies.map(d => d.ordem_prerequisito_id);
  }

  async isOnCriticalPath(taskId) {
    // Simplificado - em um sistema real seria baseado no algoritmo CPM
    return false;
  }

  async calculateCriticalPath(tasks) {
    // Algoritmo CPM simplificado
    // Em um sistema real, implementaria o algoritmo completo
    return tasks
      .filter(t => t.critical)
      .map(t => t.id);
  }

  getTaskColor(status, critical) {
    if (critical) return '#ff0000';
    return this.getStatusColor(status);
  }

  async simulateScheduleScenario(scenario, parameters) {
    try {
      const baseOrders = await this.knex('prd_01_ordens_producao')
        .where('ativo', true)
        .whereIn('status', ['planejada', 'liberada']);

      const scenarioOrders = this.applyScenarioChanges(baseOrders, scenario, parameters);
      const simulation = await this.applySchedulingAlgorithm(scenarioOrders, parameters);

      return {
        cenario: scenario,
        parametros: parameters,
        resultados: {
          ordens_simuladas: simulation.length,
          metricas: this.calculateScheduleMetrics(simulation),
          comparacao: await this.compareWithCurrentSchedule(simulation)
        },
        recomendacoes: this.generateRecommendations(simulation)
      };
    } catch (error) {
      throw new Error(`Erro na simulação: ${error.message}`);
    }
  }

  applyScenarioChanges(orders, scenario, parameters) {
    switch (scenario) {
      case 'aumento_capacidade':
        return this.simulateCapacityIncrease(orders, parameters.percentual_aumento);
      case 'novos_pedidos':
        return this.simulateNewOrders(orders, parameters.novos_pedidos);
      case 'manutencao_programada':
        return this.simulateMaintenanceDowntime(orders, parameters.manutencao);
      default:
        return orders;
    }
  }

  simulateCapacityIncrease(orders, percentage) {
    // Simular aumento de capacidade reduzindo tempos de processamento
    return orders.map(order => ({
      ...order,
      tempo_producao_horas: order.tempo_producao_horas * (1 - percentage / 100)
    }));
  }

  simulateNewOrders(orders, newOrders) {
    return [...orders, ...newOrders];
  }

  simulateMaintenanceDowntime(orders, maintenanceSchedule) {
    // Simular paradas para manutenção
    return orders.map(order => {
      const maintenance = maintenanceSchedule.find(m => 
        m.centro_trabalho_id === order.centro_trabalho_id
      );
      
      if (maintenance) {
        // Adicionar tempo de parada
        const maintenanceHours = maintenance.duracao_horas || 0;
        return {
          ...order,
          tempo_producao_horas: order.tempo_producao_horas + maintenanceHours
        };
      }
      
      return order;
    });
  }

  async compareWithCurrentSchedule(simulatedOrders) {
    const currentMetrics = await this.getCurrentScheduleMetrics();
    const simulatedMetrics = this.calculateScheduleMetrics(simulatedOrders);

    return {
      atual: currentMetrics,
      simulado: simulatedMetrics,
      diferencas: {
        pontualidade: simulatedMetrics.taxa_pontualidade - currentMetrics.taxa_pontualidade,
        atraso_medio: currentMetrics.atraso_medio_dias - simulatedMetrics.atraso_medio_dias,
        utilizacao: simulatedMetrics.utilizacao_tempo - currentMetrics.utilizacao_tempo
      }
    };
  }

  async getCurrentScheduleMetrics() {
    const currentOrders = await this.knex('prd_01_ordens_producao as po')
      .join('prd_03_bom as b', 'po.bom_id', 'b.id')
      .select(
        'po.*',
        'b.tempo_producao_horas',
        'b.tempo_setup_horas'
      )
      .where('po.ativo', true)
      .whereIn('po.status', ['planejada', 'liberada', 'em_producao']);

    return this.calculateScheduleMetrics(currentOrders);
  }

  generateRecommendations(simulationResults) {
    const recommendations = [];
    const metrics = this.calculateScheduleMetrics(simulationResults);

    if (metrics.taxa_pontualidade < 80) {
      recommendations.push({
        tipo: 'alerta',
        prioridade: 'alta',
        mensagem: 'Taxa de pontualidade baixa. Considere revisar prazos ou aumentar capacidade.'
      });
    }

    if (metrics.atraso_medio_dias > 5) {
      recommendations.push({
        tipo: 'acao',
        prioridade: 'media',
        mensagem: 'Atraso médio elevado. Revise sequenciamento e prioridades das ordens.'
      });
    }

    if (metrics.utilizacao_tempo < 60) {
      recommendations.push({
        tipo: 'otimizacao',
        prioridade: 'baixa',
        mensagem: 'Baixa utilização detectada. Considere compactar a programação.'
      });
    }

    return recommendations;
  }

  async getSchedulingRules() {
    const rules = await this.knex('prd_17_regras_programacao')
      .where('ativo', true)
      .orderBy('prioridade', 'desc');

    return rules;
  }

  async updateSchedulingRules(rulesData, userId) {
    const trx = await this.knex.transaction();
    
    try {
      // Desativar regras existentes
      await trx('prd_17_regras_programacao')
        .update({ ativo: false });

      // Inserir novas regras
      const now = new Date().toISOString();
      for (const rule of rulesData.regras) {
        await trx('prd_17_regras_programacao').insert({
          ...rule,
          ativo: true,
          created_at: now,
          created_by: userId
        });
      }

      await trx.commit();

      return this.getSchedulingRules();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async getScheduleMetrics(filters = {}) {
    try {
      const orders = await this.knex('prd_01_ordens_producao as po')
        .join('prd_03_bom as b', 'po.bom_id', 'b.id')
        .select(
          'po.*',
          'b.tempo_producao_horas',
          'b.tempo_setup_horas'
        )
        .where('po.ativo', true)
        .modify(query => {
          if (filters.data_inicio) {
            query.where('po.data_inicio_planejada', '>=', filters.data_inicio);
          }
          if (filters.data_fim) {
            query.where('po.data_fim_planejada', '<=', filters.data_fim);
          }
        });

      const metrics = this.calculateScheduleMetrics(orders);
      
      // Adicionar métricas específicas de programação
      const additionalMetrics = {
        densidade_programacao: await this.calculateScheduleDensity(filters),
        flexibilidade_recursos: await this.calculateResourceFlexibility(filters),
        estabilidade_programacao: await this.calculateScheduleStability(filters)
      };

      return {
        ...metrics,
        ...additionalMetrics,
        periodo: filters
      };
    } catch (error) {
      throw new Error(`Erro ao calcular métricas: ${error.message}`);
    }
  }

  async calculateScheduleDensity(filters) {
    // Calcular densidade da programação (ordens por dia)
    const totalDays = Math.ceil(
      (new Date(filters.data_fim) - new Date(filters.data_inicio)) / (1000 * 60 * 60 * 24)
    );

    const totalOrders = await this.knex('prd_01_ordens_producao')
      .where('ativo', true)
      .whereBetween('data_inicio_planejada', [filters.data_inicio, filters.data_fim])
      .count('* as total')
      .first();

    return totalDays > 0 ? parseInt(totalOrders.total) / totalDays : 0;
  }

  async calculateResourceFlexibility(filters) {
    // Calcular flexibilidade baseada na distribuição de ordens por centro
    const distribution = await this.knex('prd_01_ordens_producao as po')
      .join('prd_02_centros_trabalho as wc', 'po.centro_trabalho_id', 'wc.id')
      .where('po.ativo', true)
      .whereBetween('po.data_inicio_planejada', [filters.data_inicio, filters.data_fim])
      .groupBy('wc.id', 'wc.nome')
      .select(
        'wc.nome',
        this.knex.raw('COUNT(*) as total_ordens')
      );

    if (distribution.length === 0) return 0;

    const totalOrders = distribution.reduce((sum, d) => sum + parseInt(d.total_ordens), 0);
    const averagePerCenter = totalOrders / distribution.length;
    
    // Calcular desvio padrão
    const variance = distribution.reduce((sum, d) => 
      sum + Math.pow(parseInt(d.total_ordens) - averagePerCenter, 2), 0
    ) / distribution.length;

    const stdDev = Math.sqrt(variance);
    
    // Flexibilidade = 1 - (desvio padrão / média)
    return averagePerCenter > 0 ? Math.max(0, 1 - (stdDev / averagePerCenter)) : 0;
  }

  async calculateScheduleStability(filters) {
    // Simplificado - em um sistema real, compararia com versões anteriores da programação
    return 0.85; // Valor mock
  }

  async validateSchedule(scheduleData) {
    const validationResults = [];

    // Validar disponibilidade de recursos
    for (const order of scheduleData.ordens || []) {
      const conflicts = await this.checkScheduleConflicts(
        order.id,
        order.centro_trabalho_id,
        order.data_inicio_planejada,
        order.data_fim_planejada,
        this.knex
      );

      if (conflicts.length > 0) {
        validationResults.push({
          ordem_id: order.id,
          tipo: 'conflito_recurso',
          severidade: 'erro',
          mensagem: `Conflito com ordens: ${conflicts.join(', ')}`
        });
      }

      // Validar disponibilidade de materiais
      const materialAvailability = await this.checkMaterialAvailability(order);
      if (!materialAvailability.disponivel) {
        validationResults.push({
          ordem_id: order.id,
          tipo: 'material_indisponivel',
          severidade: 'aviso',
          mensagem: `Materiais insuficientes: ${materialAvailability.faltantes.join(', ')}`
        });
      }

      // Validar prazos
      if (new Date(order.data_fim_planejada) > new Date(order.data_entrega_cliente)) {
        validationResults.push({
          ordem_id: order.id,
          tipo: 'prazo_excedido',
          severidade: 'alerta',
          mensagem: 'Data planejada excede prazo de entrega'
        });
      }
    }

    return {
      valida: !validationResults.some(r => r.severidade === 'erro'),
      total_problemas: validationResults.length,
      problemas_criticos: validationResults.filter(r => r.severidade === 'erro').length,
      detalhes: validationResults
    };
  }

  async checkMaterialAvailability(order) {
    // Simplificado - verificar disponibilidade de materiais
    const bomItems = await this.knex('prd_04_itens_bom')
      .where('bom_id', order.bom_id)
      .where('ativo', true);

    const faltantes = [];
    let disponivel = true;

    for (const item of bomItems) {
      const estoque = await this.knex('est_01_estoque')
        .where('produto_id', item.produto_id)
        .first();

      const necessario = item.quantidade * order.quantidade_planejada;
      const disponivel_estoque = estoque ? estoque.quantidade_disponivel : 0;

      if (disponivel_estoque < necessario) {
        faltantes.push(`${item.produto_nome}: ${necessario - disponivel_estoque}`);
        disponivel = false;
      }
    }

    return { disponivel, faltantes };
  }

  async getAlternativeSchedules(orderId, criteria) {
    try {
      const order = await this.knex('prd_01_ordens_producao')
        .where('id', orderId)
        .first();

      if (!order) {
        throw new Error('Ordem não encontrada');
      }

      const alternatives = [];

      // Alternativa 1: Mesmo centro, horário diferente
      const timeAlternatives = await this.findTimeAlternatives(order);
      alternatives.push(...timeAlternatives);

      // Alternativa 2: Centros diferentes
      const resourceAlternatives = await this.findResourceAlternatives(order);
      alternatives.push(...resourceAlternatives);

      // Alternativa 3: Divisão da ordem
      const splitAlternatives = await this.findSplitAlternatives(order);
      alternatives.push(...splitAlternatives);

      return {
        ordem_original: order,
        alternativas: alternatives,
        criterios_aplicados: criteria
      };
    } catch (error) {
      throw new Error(`Erro ao buscar alternativas: ${error.message}`);
    }
  }

  async findTimeAlternatives(order) {
    // Buscar slots de tempo alternativos no mesmo centro
    const workCenter = await this.knex('prd_02_centros_trabalho')
      .where('id', order.centro_trabalho_id)
      .first();

    // Simplificado - retornar algumas alternativas de horário
    return [
      {
        tipo: 'tempo_alternativo',
        descricao: 'Início mais cedo',
        data_inicio: new Date(new Date(order.data_inicio_planejada).getTime() - 24 * 60 * 60 * 1000).toISOString(),
        impacto: 'Antecipação de 1 dia'
      },
      {
        tipo: 'tempo_alternativo',
        descricao: 'Início mais tarde',
        data_inicio: new Date(new Date(order.data_inicio_planejada).getTime() + 24 * 60 * 60 * 1000).toISOString(),
        impacto: 'Atraso de 1 dia'
      }
    ];
  }

  async findResourceAlternatives(order) {
    // Buscar centros de trabalho alternativos
    const alternativeCenters = await this.knex('prd_02_centros_trabalho')
      .where('ativo', true)
      .whereNot('id', order.centro_trabalho_id)
      .where('tipo', function() {
        this.select('tipo')
            .from('prd_02_centros_trabalho')
            .where('id', order.centro_trabalho_id);
      });

    return alternativeCenters.map(center => ({
      tipo: 'recurso_alternativo',
      centro_trabalho_id: center.id,
      centro_trabalho_nome: center.nome,
      impacto: `Mudança para ${center.nome}`
    }));
  }

  async findSplitAlternatives(order) {
    if (order.quantidade_planejada <= 1) return [];

    return [
      {
        tipo: 'divisao_ordem',
        descricao: 'Dividir em 2 lotes',
        lotes: [
          { quantidade: Math.ceil(order.quantidade_planejada / 2) },
          { quantidade: Math.floor(order.quantidade_planejada / 2) }
        ],
        impacto: 'Paralelização da produção'
      }
    ];
  }

  async applySchedule(scheduleId, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const schedule = await trx('prd_15_programacoes')
        .where('id', scheduleId)
        .first();

      if (!schedule) {
        throw new Error('Programação não encontrada');
      }

      const orders = JSON.parse(schedule.ordens_programadas);

      // Aplicar programação às ordens
      for (const order of orders) {
        await trx('prd_01_ordens_producao')
          .where('id', order.id)
          .update({
            data_inicio_planejada: order.data_inicio_programada,
            data_fim_planejada: order.data_fim_programada,
            updated_at: new Date().toISOString(),
            updated_by: userId
          });
      }

      // Marcar programação como aplicada
      await trx('prd_15_programacoes')
        .where('id', scheduleId)
        .update({
          status: 'aplicada',
          data_aplicacao: new Date().toISOString(),
          aplicada_por: userId
        });

      await trx.commit();

      return {
        schedule_id: scheduleId,
        ordens_atualizadas: orders.length,
        status: 'aplicada'
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
}

module.exports = SchedulingService;