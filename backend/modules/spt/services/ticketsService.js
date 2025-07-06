const { ValidationService } = require('./validationService');
const auditLogger = require('../../../src/utils/auditLogger');

class TicketsService {
  constructor(knex) {
    this.knex = knex;
  }

  async listTickets(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      let query = this.knex('spt_01_tickets as t')
        .leftJoin('cad_02_clientes as c', 't.cliente_id', 'c.id')
        .leftJoin('cad_01_usuarios as agent', 't.agente_id', 'agent.id')
        .leftJoin('spt_05_sla_policies as sla', 't.sla_policy_id', 'sla.id')
        .select(
          't.*',
          'c.nome as cliente_nome',
          'c.email as cliente_email',
          'agent.nome as agente_nome',
          'sla.nome as sla_nome',
          'sla.tempo_resposta_horas',
          'sla.tempo_resolucao_horas'
        )
        .where('t.ativo', true);

      // Aplicar filtros
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.whereIn('t.status', filters.status);
        } else {
          query = query.where('t.status', filters.status);
        }
      }

      if (filters.prioridade) {
        query = query.where('t.prioridade', filters.prioridade);
      }

      if (filters.categoria) {
        query = query.where('t.categoria', filters.categoria);
      }

      if (filters.agente_id) {
        query = query.where('t.agente_id', filters.agente_id);
      }

      if (filters.cliente_id) {
        query = query.where('t.cliente_id', filters.cliente_id);
      }

      if (filters.canal) {
        query = query.where('t.canal_origem', filters.canal);
      }

      if (filters.data_inicio) {
        query = query.where('t.created_at', '>=', filters.data_inicio);
      }

      if (filters.data_fim) {
        query = query.where('t.created_at', '<=', filters.data_fim);
      }

      if (filters.search) {
        query = query.where(function() {
          this.where('t.titulo', 'ilike', `%${filters.search}%`)
              .orWhere('t.numero_ticket', 'ilike', `%${filters.search}%`)
              .orWhere('t.descricao', 'ilike', `%${filters.search}%`);
        });
      }

      // Filtros específicos de SLA
      if (filters.sla_violado) {
        query = query.where('t.sla_violado', true);
      }

      if (filters.vencimento_sla) {
        const now = new Date();
        const threshold = new Date(now.getTime() + (filters.vencimento_sla * 60 * 60 * 1000));
        query = query.where('t.data_limite_resposta', '<=', threshold);
      }

      // Buscar total de registros
      const totalQuery = query.clone().clearSelect().count('* as total');
      const [{ total }] = await totalQuery;

      // Aplicar paginação e ordenação
      const results = await query
        .orderBy('t.prioridade_numerica', 'desc')
        .orderBy('t.created_at', 'desc')
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
      throw new Error(`Erro ao listar tickets: ${error.message}`);
    }
  }

  async getTicketById(id) {
    try {
      const ticket = await this.knex('spt_01_tickets as t')
        .leftJoin('cad_02_clientes as c', 't.cliente_id', 'c.id')
        .leftJoin('cad_01_usuarios as agent', 't.agente_id', 'agent.id')
        .leftJoin('spt_05_sla_policies as sla', 't.sla_policy_id', 'sla.id')
        .select(
          't.*',
          'c.nome as cliente_nome',
          'c.email as cliente_email',
          'c.telefone as cliente_telefone',
          'agent.nome as agente_nome',
          'agent.email as agente_email',
          'sla.nome as sla_nome',
          'sla.tempo_resposta_horas',
          'sla.tempo_resolucao_horas'
        )
        .where('t.id', id)
        .where('t.ativo', true)
        .first();

      if (!ticket) {
        throw new Error('Ticket não encontrado');
      }

      // Buscar interações do ticket
      const interacoes = await this.knex('spt_02_interacoes as i')
        .leftJoin('cad_01_usuarios as u', 'i.usuario_id', 'u.id')
        .select(
          'i.*',
          'u.nome as usuario_nome'
        )
        .where('i.ticket_id', id)
        .orderBy('i.created_at', 'asc');

      // Buscar histórico de mudanças
      const historico = await this.knex('auditoria')
        .where('tabela', 'spt_01_tickets')
        .where('registro_id', id)
        .orderBy('created_at', 'desc')
        .limit(50);

      // Calcular métricas de SLA
      const slaMetrics = this.calculateSLAMetrics(ticket);

      return {
        ...ticket,
        interacoes,
        historico,
        sla_metrics: slaMetrics
      };
    } catch (error) {
      throw new Error(`Erro ao buscar ticket: ${error.message}`);
    }
  }

  async createTicket(data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const validData = ValidationService.validateTicket(data);

      // Gerar número único do ticket
      const lastTicket = await trx('spt_01_tickets')
        .where('numero_ticket', 'like', '#%')
        .orderBy('created_at', 'desc')
        .first();
      
      const nextNumber = lastTicket ? 
        parseInt(lastTicket.numero_ticket.substring(1)) + 1 : 1;
      validData.numero_ticket = `#${nextNumber.toString().padStart(6, '0')}`;

      // Determinar SLA baseado na categoria e prioridade
      const slaPolicy = await this.determineSLAPolicy(validData.categoria, validData.prioridade, trx);
      if (slaPolicy) {
        validData.sla_policy_id = slaPolicy.id;
        validData.data_limite_resposta = this.calculateSLADeadline(slaPolicy.tempo_resposta_horas);
        validData.data_limite_resolucao = this.calculateSLADeadline(slaPolicy.tempo_resolucao_horas);
      }

      // Auto-atribuição baseada em regras
      if (!validData.agente_id) {
        const agent = await this.autoAssignAgent(validData.categoria, validData.prioridade, trx);
        if (agent) {
          validData.agente_id = agent.id;
        }
      }

      // Mapear prioridade para valor numérico
      validData.prioridade_numerica = this.mapPriorityToNumber(validData.prioridade);

      const now = new Date().toISOString();
      const ticketData = {
        ...validData,
        created_at: now,
        updated_at: now,
        created_by: userId
      };

      const [ticket] = await trx('spt_01_tickets')
        .insert(ticketData)
        .returning('*');

      // Criar primeira interação se houver descrição
      if (validData.descricao) {
        await trx('spt_02_interacoes').insert({
          ticket_id: ticket.id,
          tipo: 'nota_interna',
          conteudo: validData.descricao,
          usuario_id: userId,
          visibilidade: 'publica',
          canal: validData.canal_origem || 'sistema',
          created_at: now
        });
      }

      // Log de auditoria
      await auditLogger.log({
        tabela: 'spt_01_tickets',
        operacao: 'INSERT',
        registro_id: ticket.id,
        dados_novos: ticketData,
        usuario_id: userId
      }, trx);

      // Disparar automações (notifications, webhooks, etc.)
      await this.triggerAutomations('ticket_created', ticket, trx);

      await trx.commit();

      return this.getTicketById(ticket.id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async updateTicket(id, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const existingTicket = await trx('spt_01_tickets')
        .where({ id, ativo: true })
        .first();

      if (!existingTicket) {
        throw new Error('Ticket não encontrado');
      }

      const validData = ValidationService.validateTicket({
        ...existingTicket,
        ...data
      });

      // Verificar se mudou a prioridade/categoria e recalcular SLA
      if (data.categoria !== existingTicket.categoria || data.prioridade !== existingTicket.prioridade) {
        const slaPolicy = await this.determineSLAPolicy(validData.categoria, validData.prioridade, trx);
        if (slaPolicy) {
          validData.sla_policy_id = slaPolicy.id;
          // Só recalcular se não foi respondido ainda
          if (!existingTicket.data_primeira_resposta) {
            validData.data_limite_resposta = this.calculateSLADeadline(slaPolicy.tempo_resposta_horas);
          }
          if (existingTicket.status !== 'resolvido' && existingTicket.status !== 'fechado') {
            validData.data_limite_resolucao = this.calculateSLADeadline(slaPolicy.tempo_resolucao_horas);
          }
        }
      }

      validData.prioridade_numerica = this.mapPriorityToNumber(validData.prioridade);

      const updateData = {
        ...validData,
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      delete updateData.id;
      delete updateData.created_at;
      delete updateData.created_by;

      await trx('spt_01_tickets')
        .where({ id })
        .update(updateData);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'spt_01_tickets',
        operacao: 'UPDATE',
        registro_id: id,
        dados_anteriores: existingTicket,
        dados_novos: updateData,
        usuario_id: userId
      }, trx);

      // Disparar automações para mudanças específicas
      if (data.status && data.status !== existingTicket.status) {
        await this.triggerAutomations(`ticket_status_changed_${data.status}`, { ...existingTicket, ...updateData }, trx);
      }

      await trx.commit();

      return this.getTicketById(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async assignTicket(id, agentId, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const ticket = await trx('spt_01_tickets')
        .where({ id, ativo: true })
        .first();

      if (!ticket) {
        throw new Error('Ticket não encontrado');
      }

      // Verificar se agente existe e está ativo
      const agent = await trx('spt_04_agentes')
        .where({ id: agentId, ativo: true })
        .first();

      if (!agent) {
        throw new Error('Agente não encontrado ou inativo');
      }

      const updateData = {
        agente_id: agentId,
        data_atribuicao: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      await trx('spt_01_tickets')
        .where({ id })
        .update(updateData);

      // Criar interação de atribuição
      await trx('spt_02_interacoes').insert({
        ticket_id: id,
        tipo: 'atribuicao',
        conteudo: `Ticket atribuído para ${agent.nome}`,
        usuario_id: userId,
        visibilidade: 'interna',
        canal: 'sistema',
        created_at: new Date().toISOString()
      });

      // Log de auditoria
      await auditLogger.log({
        tabela: 'spt_01_tickets',
        operacao: 'ASSIGN',
        registro_id: id,
        dados_anteriores: ticket,
        dados_novos: updateData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getTicketById(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async escalateTicket(id, reason, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const ticket = await trx('spt_01_tickets')
        .where({ id, ativo: true })
        .first();

      if (!ticket) {
        throw new Error('Ticket não encontrado');
      }

      // Determinar nova prioridade
      const newPriority = this.escalatePriority(ticket.prioridade);
      
      // Buscar agente supervisor ou especialista
      const supervisor = await this.findSupervisor(ticket.categoria, trx);

      const updateData = {
        prioridade: newPriority,
        prioridade_numerica: this.mapPriorityToNumber(newPriority),
        escalado: true,
        data_escalacao: new Date().toISOString(),
        motivo_escalacao: reason,
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      if (supervisor) {
        updateData.agente_id = supervisor.id;
      }

      await trx('spt_01_tickets')
        .where({ id })
        .update(updateData);

      // Criar interação de escalação
      await trx('spt_02_interacoes').insert({
        ticket_id: id,
        tipo: 'escalacao',
        conteudo: `Ticket escalado. Motivo: ${reason}`,
        usuario_id: userId,
        visibilidade: 'interna',
        canal: 'sistema',
        created_at: new Date().toISOString()
      });

      // Log de auditoria
      await auditLogger.log({
        tabela: 'spt_01_tickets',
        operacao: 'ESCALATE',
        registro_id: id,
        dados_anteriores: ticket,
        dados_novos: updateData,
        usuario_id: userId
      }, trx);

      // Disparar notificações de escalação
      await this.triggerAutomations('ticket_escalated', { ...ticket, ...updateData }, trx);

      await trx.commit();

      return this.getTicketById(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async closeTicket(id, resolution, satisfactionRating, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const ticket = await trx('spt_01_tickets')
        .where({ id, ativo: true })
        .first();

      if (!ticket) {
        throw new Error('Ticket não encontrado');
      }

      if (ticket.status === 'fechado') {
        throw new Error('Ticket já está fechado');
      }

      const now = new Date().toISOString();
      const updateData = {
        status: 'fechado',
        resolucao: resolution,
        data_fechamento: now,
        avaliacao_satisfacao: satisfactionRating,
        updated_at: now,
        updated_by: userId
      };

      // Calcular tempo de resolução
      const createdAt = new Date(ticket.created_at);
      const closedAt = new Date(now);
      updateData.tempo_resolucao_horas = (closedAt - createdAt) / (1000 * 60 * 60);

      await trx('spt_01_tickets')
        .where({ id })
        .update(updateData);

      // Criar interação de fechamento
      await trx('spt_02_interacoes').insert({
        ticket_id: id,
        tipo: 'resolucao',
        conteudo: resolution,
        usuario_id: userId,
        visibilidade: 'publica',
        canal: 'sistema',
        created_at: now
      });

      // Registrar satisfação se fornecida
      if (satisfactionRating) {
        await trx('spt_07_satisfacao').insert({
          ticket_id: id,
          cliente_id: ticket.cliente_id,
          avaliacao: satisfactionRating,
          comentarios: resolution,
          created_at: now
        });
      }

      // Log de auditoria
      await auditLogger.log({
        tabela: 'spt_01_tickets',
        operacao: 'CLOSE',
        registro_id: id,
        dados_anteriores: ticket,
        dados_novos: updateData,
        usuario_id: userId
      }, trx);

      // Disparar automações de fechamento
      await this.triggerAutomations('ticket_closed', { ...ticket, ...updateData }, trx);

      await trx.commit();

      return this.getTicketById(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // Métodos auxiliares
  calculateSLAMetrics(ticket) {
    const now = new Date();
    const created = new Date(ticket.created_at);
    
    const metrics = {
      tempo_decorrido_horas: (now - created) / (1000 * 60 * 60),
      sla_resposta: {
        limite: ticket.data_limite_resposta,
        violado: ticket.data_limite_resposta ? now > new Date(ticket.data_limite_resposta) : false,
        tempo_restante_horas: ticket.data_limite_resposta ? 
          Math.max(0, (new Date(ticket.data_limite_resposta) - now) / (1000 * 60 * 60)) : null
      },
      sla_resolucao: {
        limite: ticket.data_limite_resolucao,
        violado: ticket.data_limite_resolucao ? now > new Date(ticket.data_limite_resolucao) : false,
        tempo_restante_horas: ticket.data_limite_resolucao ? 
          Math.max(0, (new Date(ticket.data_limite_resolucao) - now) / (1000 * 60 * 60)) : null
      }
    };

    return metrics;
  }

  calculateSLADeadline(hours) {
    const now = new Date();
    return new Date(now.getTime() + (hours * 60 * 60 * 1000)).toISOString();
  }

  mapPriorityToNumber(priority) {
    const priorityMap = {
      'baixa': 1,
      'media': 2,
      'alta': 3,
      'urgente': 4,
      'critica': 5
    };
    return priorityMap[priority] || 2;
  }

  escalatePriority(currentPriority) {
    const escalationMap = {
      'baixa': 'media',
      'media': 'alta',
      'alta': 'urgente',
      'urgente': 'critica',
      'critica': 'critica'
    };
    return escalationMap[currentPriority] || 'alta';
  }

  async determineSLAPolicy(category, priority, trx) {
    return await trx('spt_05_sla_policies')
      .where('categoria', category)
      .where('prioridade', priority)
      .where('ativo', true)
      .first();
  }

  async autoAssignAgent(category, priority, trx) {
    // Buscar agente com menor carga e especialização na categoria
    return await trx('spt_04_agentes as a')
      .leftJoin('spt_01_tickets as t', function() {
        this.on('a.id', 't.agente_id')
            .andOn('t.status', 'not in', trx.raw("('fechado', 'resolvido')"));
      })
      .where('a.ativo', true)
      .where('a.especialidades', 'like', `%${category}%`)
      .groupBy('a.id', 'a.nome')
      .select('a.*')
      .count('t.id as carga_atual')
      .orderBy('carga_atual', 'asc')
      .first();
  }

  async findSupervisor(category, trx) {
    return await trx('spt_04_agentes')
      .where('ativo', true)
      .where('nivel', 'supervisor')
      .where('especialidades', 'like', `%${category}%`)
      .first();
  }

  async triggerAutomations(eventType, ticket, trx) {
    // Implementaria sistema de automações/webhooks
    // Por simplicidade, apenas log
    console.log(`Automation triggered: ${eventType} for ticket ${ticket.numero_ticket}`);
  }
}

module.exports = TicketsService;