const db = require('../../../src/database/connection');
const { customerInteractionSchema, customerInteractionUpdateSchema } = require('./validationService');
const { z } = require('zod');

// Customer Interaction Service - Complete interaction tracking and CRM
class CustomerInteractionService {
  // Create new customer interaction
  async createInteraction(interactionData, userId) {
    const trx = await db.transaction();
    
    try {
      // Validate input
      const validatedData = customerInteractionSchema.parse(interactionData);
      
      // Insert interaction
      const [interactionId] = await trx('vnd_11_interacoes_clientes').insert({
        id_cliente: validatedData.id_cliente,
        id_vendedor: validatedData.id_vendedor,
        id_usuario_criacao: userId,
        tipo_interacao: validatedData.tipo_interacao,
        assunto: validatedData.assunto,
        descricao: validatedData.descricao,
        data_interacao: validatedData.data_interacao,
        duracao_minutos: validatedData.duracao_minutos || 0,
        resultado: validatedData.resultado,
        proxima_acao: validatedData.proxima_acao,
        data_proxima_acao: validatedData.data_proxima_acao,
        anexos: validatedData.anexos ? JSON.stringify(validatedData.anexos) : null,
        observacoes: validatedData.observacoes,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id_interacao');

      // Update customer last interaction date
      await trx('cad_03_clientes')
        .where('id_cliente', validatedData.id_cliente)
        .update({
          data_ultima_interacao: new Date(),
          updated_at: new Date()
        });

      // Create follow-up task if needed
      if (validatedData.proxima_acao && validatedData.data_proxima_acao) {
        await trx('vnd_12_tarefas_vendas').insert({
          id_vendedor: validatedData.id_vendedor,
          id_cliente: validatedData.id_cliente,
          id_interacao_origem: interactionId,
          titulo: `Follow-up: ${validatedData.assunto}`,
          descricao: validatedData.proxima_acao,
          data_vencimento: validatedData.data_proxima_acao,
          status: 'PENDENTE',
          prioridade: 'MEDIA',
          ativo: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      await trx.commit();
      return interactionId;

    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // Get customer interactions with filtering
  async getInteractionsByCustomer(customerId, filters = {}) {
    try {
      let query = db('vnd_11_interacoes_clientes as ic')
        .leftJoin('cad_05_usuarios as v', 'ic.id_vendedor', 'v.id_usuario')
        .leftJoin('cad_05_usuarios as u', 'ic.id_usuario_criacao', 'u.id_usuario')
        .select(
          'ic.*',
          'v.nome as vendedor_nome',
          'u.nome as criado_por'
        )
        .where('ic.id_cliente', customerId)
        .where('ic.ativo', true);

      // Apply filters
      if (filters.tipo_interacao) {
        query = query.where('ic.tipo_interacao', filters.tipo_interacao);
      }

      if (filters.data_inicial) {
        query = query.where('ic.data_interacao', '>=', filters.data_inicial);
      }

      if (filters.data_final) {
        query = query.where('ic.data_interacao', '<=', filters.data_final);
      }

      if (filters.id_vendedor) {
        query = query.where('ic.id_vendedor', filters.id_vendedor);
      }

      if (filters.resultado) {
        query = query.where('ic.resultado', filters.resultado);
      }

      const interactions = await query.orderBy('ic.data_interacao', 'desc');

      // Parse JSON fields
      return interactions.map(interaction => ({
        ...interaction,
        anexos: interaction.anexos ? JSON.parse(interaction.anexos) : []
      }));

    } catch (error) {
      throw error;
    }
  }

  // Get customer interaction statistics
  async getCustomerInteractionStats(customerId) {
    try {
      // Total interactions
      const totalInteractions = await db('vnd_11_interacoes_clientes')
        .where('id_cliente', customerId)
        .where('ativo', true)
        .count('* as count')
        .first();

      // Interactions by type
      const interactionsByType = await db('vnd_11_interacoes_clientes')
        .where('id_cliente', customerId)
        .where('ativo', true)
        .select('tipo_interacao')
        .count('* as count')
        .groupBy('tipo_interacao');

      // Interactions by result
      const interactionsByResult = await db('vnd_11_interacoes_clientes')
        .where('id_cliente', customerId)
        .where('ativo', true)
        .whereNotNull('resultado')
        .select('resultado')
        .count('* as count')
        .groupBy('resultado');

      // Last interaction
      const lastInteraction = await db('vnd_11_interacoes_clientes')
        .where('id_cliente', customerId)
        .where('ativo', true)
        .orderBy('data_interacao', 'desc')
        .first();

      // Average interaction duration
      const avgDuration = await db('vnd_11_interacoes_clientes')
        .where('id_cliente', customerId)
        .where('ativo', true)
        .where('duracao_minutos', '>', 0)
        .avg('duracao_minutos as media')
        .first();

      // Pending follow-ups
      const pendingFollowUps = await db('vnd_12_tarefas_vendas')
        .where('id_cliente', customerId)
        .where('status', 'PENDENTE')
        .where('ativo', true)
        .count('* as count')
        .first();

      return {
        total_interacoes: parseInt(totalInteractions.count),
        por_tipo: interactionsByType.map(i => ({
          tipo: i.tipo_interacao,
          quantidade: parseInt(i.count)
        })),
        por_resultado: interactionsByResult.map(i => ({
          resultado: i.resultado,
          quantidade: parseInt(i.count)
        })),
        ultima_interacao: lastInteraction ? {
          data: lastInteraction.data_interacao,
          tipo: lastInteraction.tipo_interacao,
          assunto: lastInteraction.assunto
        } : null,
        duracao_media: parseFloat(avgDuration.media) || 0,
        follow_ups_pendentes: parseInt(pendingFollowUps.count)
      };

    } catch (error) {
      throw error;
    }
  }

  // Update customer interaction
  async updateInteraction(interactionId, updateData, userId) {
    const trx = await db.transaction();
    
    try {
      // Validate input
      const validatedData = customerInteractionUpdateSchema.parse(updateData);

      const existingInteraction = await trx('vnd_11_interacoes_clientes')
        .where('id_interacao', interactionId)
        .first();

      if (!existingInteraction) {
        throw new Error('Interação não encontrada');
      }

      // Update interaction
      await trx('vnd_11_interacoes_clientes')
        .where('id_interacao', interactionId)
        .update({
          ...validatedData,
          anexos: validatedData.anexos ? JSON.stringify(validatedData.anexos) : existingInteraction.anexos,
          updated_at: new Date()
        });

      // Create follow-up task if needed
      if (validatedData.proxima_acao && validatedData.data_proxima_acao) {
        const existingTask = await trx('vnd_12_tarefas_vendas')
          .where('id_interacao_origem', interactionId)
          .where('status', 'PENDENTE')
          .first();

        if (existingTask) {
          // Update existing task
          await trx('vnd_12_tarefas_vendas')
            .where('id_tarefa', existingTask.id_tarefa)
            .update({
              titulo: `Follow-up: ${validatedData.assunto || existingInteraction.assunto}`,
              descricao: validatedData.proxima_acao,
              data_vencimento: validatedData.data_proxima_acao,
              updated_at: new Date()
            });
        } else {
          // Create new task
          await trx('vnd_12_tarefas_vendas').insert({
            id_vendedor: existingInteraction.id_vendedor,
            id_cliente: existingInteraction.id_cliente,
            id_interacao_origem: interactionId,
            titulo: `Follow-up: ${validatedData.assunto || existingInteraction.assunto}`,
            descricao: validatedData.proxima_acao,
            data_vencimento: validatedData.data_proxima_acao,
            status: 'PENDENTE',
            prioridade: 'MEDIA',
            ativo: true,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      await trx.commit();
      return true;

    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // Get salesperson tasks
  async getSalespersonTasks(vendedorId, filters = {}) {
    try {
      let query = db('vnd_12_tarefas_vendas as tv')
        .leftJoin('cad_03_clientes as c', 'tv.id_cliente', 'c.id_cliente')
        .leftJoin('vnd_11_interacoes_clientes as ic', 'tv.id_interacao_origem', 'ic.id_interacao')
        .select(
          'tv.*',
          'c.nome_razao_social as cliente_nome',
          'ic.assunto as interacao_assunto'
        )
        .where('tv.id_vendedor', vendedorId)
        .where('tv.ativo', true);

      // Apply filters
      if (filters.status) {
        query = query.where('tv.status', filters.status);
      }

      if (filters.prioridade) {
        query = query.where('tv.prioridade', filters.prioridade);
      }

      if (filters.data_inicial) {
        query = query.where('tv.data_vencimento', '>=', filters.data_inicial);
      }

      if (filters.data_final) {
        query = query.where('tv.data_vencimento', '<=', filters.data_final);
      }

      if (filters.id_cliente) {
        query = query.where('tv.id_cliente', filters.id_cliente);
      }

      const tasks = await query.orderBy('tv.data_vencimento', 'asc');

      // Add calculated fields
      const now = new Date();
      return tasks.map(task => ({
        ...task,
        dias_vencimento: Math.floor((new Date(task.data_vencimento) - now) / (1000 * 60 * 60 * 24)),
        em_atraso: new Date(task.data_vencimento) < now && task.status === 'PENDENTE'
      }));

    } catch (error) {
      throw error;
    }
  }

  // Complete task
  async completeTask(taskId, userId, observacoes = '') {
    const trx = await db.transaction();
    
    try {
      const task = await trx('vnd_12_tarefas_vendas')
        .where('id_tarefa', taskId)
        .first();

      if (!task) {
        throw new Error('Tarefa não encontrada');
      }

      await trx('vnd_12_tarefas_vendas')
        .where('id_tarefa', taskId)
        .update({
          status: 'CONCLUIDA',
          data_conclusao: new Date(),
          observacoes_conclusao: observacoes,
          updated_at: new Date()
        });

      await trx.commit();
      return true;

    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // Get customer timeline (interactions + sales orders + quotes)
  async getCustomerTimeline(customerId, filters = {}) {
    try {
      const timeline = [];

      // Get interactions
      const interactions = await db('vnd_11_interacoes_clientes as ic')
        .leftJoin('cad_05_usuarios as v', 'ic.id_vendedor', 'v.id_usuario')
        .select(
          'ic.id_interacao as id',
          'ic.data_interacao as data',
          'ic.tipo_interacao as tipo',
          'ic.assunto as titulo',
          'ic.descricao',
          'ic.resultado',
          'v.nome as vendedor_nome',
          db.raw("'INTERACAO' as categoria")
        )
        .where('ic.id_cliente', customerId)
        .where('ic.ativo', true);

      // Get sales orders
      const salesOrders = await db('vnd_01_pedidos_venda as pv')
        .leftJoin('cad_05_usuarios as v', 'pv.id_vendedor', 'v.id_usuario')
        .select(
          'pv.id_pedido_venda as id',
          'pv.data_pedido as data',
          'pv.status as tipo',
          'pv.numero_pedido as titulo',
          'pv.observacoes as descricao',
          'pv.valor_total as resultado',
          'v.nome as vendedor_nome',
          db.raw("'PEDIDO' as categoria")
        )
        .where('pv.id_cliente', customerId);

      // Get quotations
      const quotations = await db('vnd_04_orcamentos as o')
        .leftJoin('cad_05_usuarios as v', 'o.id_vendedor', 'v.id_usuario')
        .select(
          'o.id_orcamento as id',
          'o.data_orcamento as data',
          'o.status as tipo',
          'o.numero_orcamento as titulo',
          'o.descricao',
          'o.valor_total as resultado',
          'v.nome as vendedor_nome',
          db.raw("'ORCAMENTO' as categoria")
        )
        .where('o.id_cliente', customerId);

      // Combine and sort by date
      timeline.push(...interactions, ...salesOrders, ...quotations);
      timeline.sort((a, b) => new Date(b.data) - new Date(a.data));

      // Apply filters
      if (filters.data_inicial) {
        timeline = timeline.filter(item => new Date(item.data) >= new Date(filters.data_inicial));
      }

      if (filters.data_final) {
        timeline = timeline.filter(item => new Date(item.data) <= new Date(filters.data_final));
      }

      if (filters.categoria) {
        timeline = timeline.filter(item => item.categoria === filters.categoria);
      }

      if (filters.id_vendedor) {
        timeline = timeline.filter(item => item.vendedor_nome);
      }

      return timeline;

    } catch (error) {
      throw error;
    }
  }
}

module.exports = new CustomerInteractionService();