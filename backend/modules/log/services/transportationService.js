const knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'plataforma_db'
  }
});

/**
 * Service for transportation business logic
 * Handles all transportation operations with database transactions
 */

class TransportationService {
  /**
   * Get all transportation orders with pagination and filters
   */
  async getAllTransportation(filters = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = null,
      transportadora_id = null,
      origem = null,
      destino = null,
      sort = 'numero_envio',
      order = 'desc'
    } = filters;

    const offset = (page - 1) * limit;

    try {
      let query = knex('log_01_envios')
        .leftJoin('cad_01_clientes', 'log_01_envios.cliente_id', 'cad_01_clientes.id_cliente')
        .leftJoin('log_03_transportadoras', 'log_01_envios.transportadora_id', 'log_03_transportadoras.id_transportadora')
        .select([
          'log_01_envios.*',
          'cad_01_clientes.nome_cliente',
          'cad_01_clientes.email as cliente_email',
          'log_03_transportadoras.nome_transportadora',
          'log_03_transportadoras.tipo_transporte'
        ]);

      // Apply filters
      if (search) {
        query = query.where(function() {
          this.where('log_01_envios.numero_envio', 'ilike', `%${search}%`)
            .orWhere('cad_01_clientes.nome_cliente', 'ilike', `%${search}%`)
            .orWhere('log_01_envios.destinatario_nome', 'ilike', `%${search}%`)
            .orWhere('log_01_envios.codigo_rastreamento', 'ilike', `%${search}%`);
        });
      }

      if (status) {
        query = query.where('log_01_envios.status', status);
      }

      if (transportadora_id) {
        query = query.where('log_01_envios.transportadora_id', transportadora_id);
      }

      if (origem) {
        query = query.where('log_01_envios.origem_cidade', 'ilike', `%${origem}%`);
      }

      if (destino) {
        query = query.where('log_01_envios.destino_cidade', 'ilike', `%${destino}%`);
      }

      // Get total count
      const countQuery = query.clone();
      const [{ count }] = await countQuery.count('log_01_envios.id_envio as count');
      const total = parseInt(count);

      // Apply sorting and pagination
      const validSortColumns = [
        'numero_envio', 'status', 'data_coleta', 'data_entrega_prevista',
        'peso_kg', 'valor_frete', 'origem_cidade', 'destino_cidade'
      ];

      const sortColumn = validSortColumns.includes(sort) ? 
        `log_01_envios.${sort}` : 'log_01_envios.numero_envio';
      
      query = query.orderBy(sortColumn, order.toLowerCase() === 'desc' ? 'desc' : 'asc');
      query = query.limit(limit).offset(offset);

      const data = await query;

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error in getAllTransportation:', error);
      throw new Error(`Erro ao buscar transportes: ${error.message}`);
    }
  }

  /**
   * Get transportation by ID
   */
  async getTransportationById(id) {
    try {
      const transportation = await knex('log_01_envios')
        .leftJoin('cad_01_clientes', 'log_01_envios.cliente_id', 'cad_01_clientes.id_cliente')
        .leftJoin('log_03_transportadoras', 'log_01_envios.transportadora_id', 'log_03_transportadoras.id_transportadora')
        .leftJoin('vnd_01_pedidos', 'log_01_envios.pedido_id', 'vnd_01_pedidos.id_pedido')
        .select([
          'log_01_envios.*',
          'cad_01_clientes.nome_cliente',
          'cad_01_clientes.email as cliente_email',
          'cad_01_clientes.telefone as cliente_telefone',
          'log_03_transportadoras.nome_transportadora',
          'log_03_transportadoras.tipo_transporte',
          'log_03_transportadoras.possui_rastreamento',
          'vnd_01_pedidos.numero_pedido'
        ])
        .where('log_01_envios.id_envio', id)
        .first();

      if (!transportation) {
        throw new Error('Transporte não encontrado');
      }

      // Get tracking history
      const trackingHistory = await knex('log_04_rastreamento_entregas')
        .where('envio_id', id)
        .orderBy('data_evento', 'desc')
        .orderBy('hora_evento', 'desc');

      transportation.tracking_history = trackingHistory;

      return transportation;
    } catch (error) {
      console.error('Error in getTransportationById:', error);
      throw new Error(`Erro ao buscar transporte: ${error.message}`);
    }
  }

  /**
   * Create new transportation order
   */
  async createTransportation(transportationData) {
    const trx = await knex.transaction();

    try {
      // Check if numero_envio already exists
      const existingTransportation = await trx('log_01_envios')
        .where('numero_envio', transportationData.numero_envio)
        .first();

      if (existingTransportation) {
        throw new Error(`Já existe um transporte com o número ${transportationData.numero_envio}`);
      }

      // Validate cliente_id exists
      if (transportationData.cliente_id) {
        const cliente = await trx('cad_01_clientes')
          .where('id_cliente', transportationData.cliente_id)
          .first();

        if (!cliente) {
          throw new Error('Cliente não encontrado');
        }
      }

      // Validate transportadora_id exists
      const transportadora = await trx('log_03_transportadoras')
        .where('id_transportadora', transportationData.transportadora_id)
        .where('ativo', true)
        .first();

      if (!transportadora) {
        throw new Error('Transportadora não encontrada ou inativa');
      }

      // Calculate estimated delivery date if not provided
      if (!transportationData.data_entrega_prevista && transportationData.prazo_entrega_dias) {
        const dataColeta = new Date(transportationData.data_coleta || new Date());
        const dataEntrega = new Date(dataColeta);
        dataEntrega.setDate(dataEntrega.getDate() + transportationData.prazo_entrega_dias);
        transportationData.data_entrega_prevista = dataEntrega.toISOString().split('T')[0];
      }

      // Generate tracking code if not provided
      if (!transportationData.codigo_rastreamento) {
        const timestamp = Date.now().toString().slice(-8);
        const prefix = transportadora.nome_transportadora.substring(0, 3).toUpperCase();
        transportationData.codigo_rastreamento = `${prefix}${timestamp}`;
      }

      // Insert transportation
      const [newTransportation] = await trx('log_01_envios')
        .insert({
          ...transportationData,
          data_criacao: new Date(),
          data_atualizacao: new Date()
        })
        .returning('*');

      // Create initial tracking entry
      await trx('log_04_rastreamento_entregas').insert({
        envio_id: newTransportation.id_envio,
        data_evento: new Date().toISOString().split('T')[0],
        hora_evento: new Date().toISOString().split('T')[1].substring(0, 5),
        status_evento: 'COLETADO',
        localizacao: transportationData.origem_endereco || 'Origem',
        descricao_evento: 'Envio criado e aguardando coleta',
        data_criacao: new Date()
      });

      // Log audit trail
      await trx('auditoria_logs').insert({
        tabela: 'log_01_envios',
        operacao: 'INSERT',
        registro_id: newTransportation.id_envio,
        dados_novos: JSON.stringify(newTransportation),
        usuario_id: transportationData.usuario_id || null,
        data_operacao: new Date()
      });

      await trx.commit();

      return await this.getTransportationById(newTransportation.id_envio);
    } catch (error) {
      await trx.rollback();
      console.error('Error in createTransportation:', error);
      throw new Error(`Erro ao criar transporte: ${error.message}`);
    }
  }

  /**
   * Update transportation order
   */
  async updateTransportation(id, updateData) {
    const trx = await knex.transaction();

    try {
      // Check if transportation exists
      const existingTransportation = await trx('log_01_envios')
        .where('id_envio', id)
        .first();

      if (!existingTransportation) {
        throw new Error('Transporte não encontrado');
      }

      // Check if numero_envio already exists for other records
      if (updateData.numero_envio && updateData.numero_envio !== existingTransportation.numero_envio) {
        const duplicateTransportation = await trx('log_01_envios')
          .where('numero_envio', updateData.numero_envio)
          .whereNot('id_envio', id)
          .first();

        if (duplicateTransportation) {
          throw new Error(`Já existe um transporte com o número ${updateData.numero_envio}`);
        }
      }

      // Validate transportadora_id if being updated
      if (updateData.transportadora_id) {
        const transportadora = await trx('log_03_transportadoras')
          .where('id_transportadora', updateData.transportadora_id)
          .where('ativo', true)
          .first();

        if (!transportadora) {
          throw new Error('Transportadora não encontrada ou inativa');
        }
      }

      // Update transportation
      const [updatedTransportation] = await trx('log_01_envios')
        .where('id_envio', id)
        .update({
          ...updateData,
          data_atualizacao: new Date()
        })
        .returning('*');

      // Log audit trail
      await trx('auditoria_logs').insert({
        tabela: 'log_01_envios',
        operacao: 'UPDATE',
        registro_id: id,
        dados_antigos: JSON.stringify(existingTransportation),
        dados_novos: JSON.stringify(updatedTransportation),
        usuario_id: updateData.usuario_id || null,
        data_operacao: new Date()
      });

      await trx.commit();

      return await this.getTransportationById(id);
    } catch (error) {
      await trx.rollback();
      console.error('Error in updateTransportation:', error);
      throw new Error(`Erro ao atualizar transporte: ${error.message}`);
    }
  }

  /**
   * Delete transportation order
   */
  async deleteTransportation(id) {
    const trx = await knex.transaction();

    try {
      // Check if transportation exists
      const transportation = await trx('log_01_envios')
        .where('id_envio', id)
        .first();

      if (!transportation) {
        throw new Error('Transporte não encontrado');
      }

      // Check if transportation can be deleted (not in transit or delivered)
      if (['EM_TRANSITO', 'ENTREGUE'].includes(transportation.status)) {
        throw new Error('Não é possível excluir transporte em trânsito ou entregue');
      }

      // Delete tracking entries
      await trx('log_04_rastreamento_entregas')
        .where('envio_id', id)
        .del();

      // Delete transportation
      await trx('log_01_envios')
        .where('id_envio', id)
        .del();

      // Log audit trail
      await trx('auditoria_logs').insert({
        tabela: 'log_01_envios',
        operacao: 'DELETE',
        registro_id: id,
        dados_antigos: JSON.stringify(transportation),
        usuario_id: null,
        data_operacao: new Date()
      });

      await trx.commit();

      return {
        message: 'Transporte excluído com sucesso'
      };
    } catch (error) {
      await trx.rollback();
      console.error('Error in deleteTransportation:', error);
      throw new Error(`Erro ao excluir transporte: ${error.message}`);
    }
  }

  /**
   * Get transportation statistics
   */
  async getTransportationStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Total counts by status
      const statusCounts = await knex('log_01_envios')
        .select('status')
        .count('id_envio as count')
        .groupBy('status');

      // This month stats
      const thisMonthStats = await knex('log_01_envios')
        .where('data_criacao', '>=', thirtyDaysAgo)
        .select([
          knex.raw('COUNT(*) as total_envios'),
          knex.raw('SUM(valor_frete) as total_frete'),
          knex.raw('SUM(peso_kg) as total_peso'),
          knex.raw('AVG(prazo_entrega_dias) as prazo_medio')
        ])
        .first();

      // Top carriers
      const topCarriers = await knex('log_01_envios')
        .join('log_03_transportadoras', 'log_01_envios.transportadora_id', 'log_03_transportadoras.id_transportadora')
        .select([
          'log_03_transportadoras.nome_transportadora',
          knex.raw('COUNT(*) as total_envios'),
          knex.raw('SUM(valor_frete) as total_frete')
        ])
        .where('log_01_envios.data_criacao', '>=', thirtyDaysAgo)
        .groupBy('log_03_transportadoras.id_transportadora', 'log_03_transportadoras.nome_transportadora')
        .orderBy('total_envios', 'desc')
        .limit(5);

      // Delivery performance
      const deliveryPerformance = await knex('log_01_envios')
        .where('status', 'ENTREGUE')
        .where('data_criacao', '>=', thirtyDaysAgo)
        .select([
          knex.raw(`
            ROUND(
              AVG(
                EXTRACT(
                  days FROM (data_entrega_realizada::date - data_entrega_prevista::date)
                )
              ), 2
            ) as atraso_medio_dias
          `),
          knex.raw(`
            COUNT(CASE WHEN data_entrega_realizada::date <= data_entrega_prevista::date THEN 1 END) * 100.0 / COUNT(*) as taxa_pontualidade
          `)
        ])
        .first();

      return {
        status_counts: statusCounts.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        monthly_stats: {
          total_envios: parseInt(thisMonthStats.total_envios) || 0,
          total_frete: parseFloat(thisMonthStats.total_frete) || 0,
          total_peso: parseFloat(thisMonthStats.total_peso) || 0,
          prazo_medio: parseFloat(thisMonthStats.prazo_medio) || 0
        },
        top_carriers: topCarriers.map(carrier => ({
          ...carrier,
          total_envios: parseInt(carrier.total_envios),
          total_frete: parseFloat(carrier.total_frete)
        })),
        delivery_performance: {
          atraso_medio_dias: parseFloat(deliveryPerformance.atraso_medio_dias) || 0,
          taxa_pontualidade: parseFloat(deliveryPerformance.taxa_pontualidade) || 0
        }
      };
    } catch (error) {
      console.error('Error in getTransportationStats:', error);
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }
  }

  /**
   * Track transportation order
   */
  async trackTransportation(id) {
    try {
      const transportation = await this.getTransportationById(id);
      
      return {
        envio: {
          numero_envio: transportation.numero_envio,
          codigo_rastreamento: transportation.codigo_rastreamento,
          status: transportation.status,
          origem: `${transportation.origem_cidade}/${transportation.origem_uf}`,
          destino: `${transportation.destino_cidade}/${transportation.destino_uf}`,
          data_coleta: transportation.data_coleta,
          data_entrega_prevista: transportation.data_entrega_prevista,
          data_entrega_realizada: transportation.data_entrega_realizada,
          transportadora: transportation.nome_transportadora
        },
        historico: transportation.tracking_history
      };
    } catch (error) {
      console.error('Error in trackTransportation:', error);
      throw new Error(`Erro ao rastrear transporte: ${error.message}`);
    }
  }

  /**
   * Update transportation status with tracking
   */
  async updateTransportationStatus(id, statusData) {
    const trx = await knex.transaction();

    try {
      const { status, observacoes, localizacao_atual } = statusData;

      // Check if transportation exists
      const transportation = await trx('log_01_envios')
        .where('id_envio', id)
        .first();

      if (!transportation) {
        throw new Error('Transporte não encontrado');
      }

      // Update transportation status
      const updateData = {
        status,
        data_atualizacao: new Date()
      };

      if (localizacao_atual) {
        updateData.localizacao_atual = localizacao_atual;
      }

      if (status === 'ENTREGUE') {
        updateData.data_entrega_realizada = new Date().toISOString().split('T')[0];
      }

      const [updatedTransportation] = await trx('log_01_envios')
        .where('id_envio', id)
        .update(updateData)
        .returning('*');

      // Add tracking entry
      await trx('log_04_rastreamento_entregas').insert({
        envio_id: id,
        data_evento: new Date().toISOString().split('T')[0],
        hora_evento: new Date().toISOString().split('T')[1].substring(0, 5),
        status_evento: status,
        localizacao: localizacao_atual || transportation.localizacao_atual || 'Em trânsito',
        descricao_evento: observacoes || `Status alterado para ${status}`,
        data_criacao: new Date()
      });

      // Log audit trail
      await trx('auditoria_logs').insert({
        tabela: 'log_01_envios',
        operacao: 'UPDATE',
        registro_id: id,
        dados_antigos: JSON.stringify(transportation),
        dados_novos: JSON.stringify(updatedTransportation),
        usuario_id: null,
        data_operacao: new Date()
      });

      await trx.commit();

      return {
        message: 'Status atualizado com sucesso',
        transportation: updatedTransportation
      };
    } catch (error) {
      await trx.rollback();
      console.error('Error in updateTransportationStatus:', error);
      throw new Error(`Erro ao atualizar status: ${error.message}`);
    }
  }

  /**
   * Calculate freight cost
   */
  async calculateFreight(params) {
    try {
      const { origem, destino, peso, volume = 0, valor_mercadoria = 0, tipo_servico = 'NORMAL' } = params;

      // Get available carriers for the route
      const carriers = await knex('log_03_transportadoras')
        .where('ativo', true)
        .select('*');

      const calculations = [];

      for (const carrier of carriers) {
        let valor_frete = 0;

        // Base freight calculation
        if (carrier.taxa_base_frete) {
          valor_frete += carrier.taxa_base_frete;
        }

        // Weight-based calculation
        if (carrier.taxa_por_kg) {
          valor_frete += carrier.taxa_por_kg * peso;
        }

        // Distance-based calculation (simplified)
        const distancia_estimada = Math.random() * 1000 + 100; // Mock distance
        if (carrier.taxa_por_km) {
          valor_frete += carrier.taxa_por_km * distancia_estimada;
        }

        // Service type multiplier
        const serviceMultipliers = {
          'ECONOMICO': 0.8,
          'NORMAL': 1.0,
          'EXPRESSO': 1.5,
          'ESPECIAL': 2.0
        };

        valor_frete *= serviceMultipliers[tipo_servico] || 1.0;

        // Volume discount
        if (volume > 1 && carrier.desconto_volume) {
          valor_frete *= (1 - carrier.desconto_volume / 100);
        }

        // Insurance cost
        let valor_seguro = 0;
        if (valor_mercadoria > 0 && carrier.possui_seguro) {
          valor_seguro = valor_mercadoria * 0.005; // 0.5% insurance rate
        }

        calculations.push({
          transportadora_id: carrier.id_transportadora,
          nome_transportadora: carrier.nome_transportadora,
          tipo_transporte: carrier.tipo_transporte,
          prazo_entrega_dias: carrier.tempo_medio_entrega || 5,
          valor_frete: Math.round(valor_frete * 100) / 100,
          valor_seguro: Math.round(valor_seguro * 100) / 100,
          valor_total: Math.round((valor_frete + valor_seguro) * 100) / 100,
          possui_rastreamento: carrier.possui_rastreamento,
          taxa_sucesso_entrega: carrier.taxa_sucesso_entrega || 95
        });
      }

      // Sort by value
      calculations.sort((a, b) => a.valor_total - b.valor_total);

      return {
        origem,
        destino,
        peso,
        volume,
        valor_mercadoria,
        tipo_servico,
        cotacoes: calculations
      };
    } catch (error) {
      console.error('Error in calculateFreight:', error);
      throw new Error(`Erro ao calcular frete: ${error.message}`);
    }
  }

  /**
   * Get active deliveries
   */
  async getActiveDeliveries() {
    try {
      const activeDeliveries = await knex('log_01_envios')
        .leftJoin('cad_01_clientes', 'log_01_envios.cliente_id', 'cad_01_clientes.id_cliente')
        .leftJoin('log_03_transportadoras', 'log_01_envios.transportadora_id', 'log_03_transportadoras.id_transportadora')
        .select([
          'log_01_envios.id_envio',
          'log_01_envios.numero_envio',
          'log_01_envios.status',
          'log_01_envios.origem_cidade',
          'log_01_envios.origem_uf',
          'log_01_envios.destino_cidade',
          'log_01_envios.destino_uf',
          'log_01_envios.data_entrega_prevista',
          'log_01_envios.codigo_rastreamento',
          'log_01_envios.localizacao_atual',
          'cad_01_clientes.nome_cliente',
          'log_03_transportadoras.nome_transportadora'
        ])
        .whereIn('log_01_envios.status', ['COLETADO', 'EM_TRANSITO'])
        .orderBy('log_01_envios.data_entrega_prevista', 'asc');

      return activeDeliveries;
    } catch (error) {
      console.error('Error in getActiveDeliveries:', error);
      throw new Error(`Erro ao buscar entregas ativas: ${error.message}`);
    }
  }
}

module.exports = new TransportationService();