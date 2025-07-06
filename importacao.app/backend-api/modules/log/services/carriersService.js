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
 * Service for carriers business logic
 * Handles carrier management and performance tracking
 */

class CarriersService {
  /**
   * Get all carriers with pagination and filters
   */
  async getAllCarriers(filters = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      ativo = null,
      tipo_transporte = null,
      sort = 'nome_transportadora',
      order = 'asc'
    } = filters;

    const offset = (page - 1) * limit;

    try {
      let query = knex('log_03_transportadoras').select('*');

      // Apply filters
      if (search) {
        query = query.where(function() {
          this.where('nome_transportadora', 'ilike', `%${search}%`)
            .orWhere('cnpj', 'ilike', `%${search}%`)
            .orWhere('contato_principal', 'ilike', `%${search}%`)
            .orWhere('email', 'ilike', `%${search}%`);
        });
      }

      if (ativo !== null) {
        query = query.where('ativo', ativo);
      }

      if (tipo_transporte) {
        query = query.where('tipo_transporte', tipo_transporte);
      }

      // Get total count
      const countQuery = query.clone();
      const [{ count }] = await countQuery.count('id_transportadora as count');
      const total = parseInt(count);

      // Apply sorting and pagination
      const validSortColumns = [
        'nome_transportadora', 'cnpj', 'tipo_transporte', 'abrangencia',
        'classificacao', 'taxa_sucesso_entrega', 'tempo_medio_entrega'
      ];

      const sortColumn = validSortColumns.includes(sort) ? sort : 'nome_transportadora';
      query = query.orderBy(sortColumn, order.toLowerCase() === 'desc' ? 'desc' : 'asc');
      query = query.limit(limit).offset(offset);

      const data = await query;

      // Parse JSON fields
      const processedData = data.map(carrier => ({
        ...carrier,
        servicos_oferecidos: this.parseJsonField(carrier.servicos_oferecidos),
        regioes_atendimento: this.parseJsonField(carrier.regioes_atendimento),
        documentos_habilitacao: this.parseJsonField(carrier.documentos_habilitacao)
      }));

      return {
        data: processedData,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error in getAllCarriers:', error);
      throw new Error(`Erro ao buscar transportadoras: ${error.message}`);
    }
  }

  /**
   * Get carrier by ID
   */
  async getCarrierById(id) {
    try {
      const carrier = await knex('log_03_transportadoras')
        .where('id_transportadora', id)
        .first();

      if (!carrier) {
        throw new Error('Transportadora não encontrada');
      }

      // Parse JSON fields
      carrier.servicos_oferecidos = this.parseJsonField(carrier.servicos_oferecidos);
      carrier.regioes_atendimento = this.parseJsonField(carrier.regioes_atendimento);
      carrier.documentos_habilitacao = this.parseJsonField(carrier.documentos_habilitacao);

      // Get recent shipments
      const recentShipments = await knex('log_01_envios')
        .where('transportadora_id', id)
        .select(['id_envio', 'numero_envio', 'status', 'data_criacao', 'valor_frete'])
        .orderBy('data_criacao', 'desc')
        .limit(10);

      carrier.recent_shipments = recentShipments;

      return carrier;
    } catch (error) {
      console.error('Error in getCarrierById:', error);
      throw new Error(`Erro ao buscar transportadora: ${error.message}`);
    }
  }

  /**
   * Create new carrier
   */
  async createCarrier(carrierData) {
    const trx = await knex.transaction();

    try {
      // Check if CNPJ already exists
      const existingCarrier = await trx('log_03_transportadoras')
        .where('cnpj', carrierData.cnpj)
        .first();

      if (existingCarrier) {
        throw new Error(`Já existe uma transportadora com o CNPJ ${carrierData.cnpj}`);
      }

      // Validate and process JSON fields
      if (carrierData.servicos_oferecidos && typeof carrierData.servicos_oferecidos === 'object') {
        carrierData.servicos_oferecidos = JSON.stringify(carrierData.servicos_oferecidos);
      }

      if (carrierData.regioes_atendimento && typeof carrierData.regioes_atendimento === 'object') {
        carrierData.regioes_atendimento = JSON.stringify(carrierData.regioes_atendimento);
      }

      if (carrierData.documentos_habilitacao && typeof carrierData.documentos_habilitacao === 'object') {
        carrierData.documentos_habilitacao = JSON.stringify(carrierData.documentos_habilitacao);
      }

      // Insert carrier
      const [newCarrier] = await trx('log_03_transportadoras')
        .insert({
          ...carrierData,
          data_criacao: new Date(),
          data_atualizacao: new Date()
        })
        .returning('*');

      // Log audit trail
      await trx('auditoria_logs').insert({
        tabela: 'log_03_transportadoras',
        operacao: 'INSERT',
        registro_id: newCarrier.id_transportadora,
        dados_novos: JSON.stringify(newCarrier),
        usuario_id: carrierData.usuario_id || null,
        data_operacao: new Date()
      });

      await trx.commit();

      return await this.getCarrierById(newCarrier.id_transportadora);
    } catch (error) {
      await trx.rollback();
      console.error('Error in createCarrier:', error);
      throw new Error(`Erro ao criar transportadora: ${error.message}`);
    }
  }

  /**
   * Update carrier
   */
  async updateCarrier(id, updateData) {
    const trx = await knex.transaction();

    try {
      // Check if carrier exists
      const existingCarrier = await trx('log_03_transportadoras')
        .where('id_transportadora', id)
        .first();

      if (!existingCarrier) {
        throw new Error('Transportadora não encontrada');
      }

      // Check if CNPJ already exists for other carriers
      if (updateData.cnpj && updateData.cnpj !== existingCarrier.cnpj) {
        const duplicateCarrier = await trx('log_03_transportadoras')
          .where('cnpj', updateData.cnpj)
          .whereNot('id_transportadora', id)
          .first();

        if (duplicateCarrier) {
          throw new Error(`Já existe uma transportadora com o CNPJ ${updateData.cnpj}`);
        }
      }

      // Process JSON fields
      if (updateData.servicos_oferecidos && typeof updateData.servicos_oferecidos === 'object') {
        updateData.servicos_oferecidos = JSON.stringify(updateData.servicos_oferecidos);
      }

      if (updateData.regioes_atendimento && typeof updateData.regioes_atendimento === 'object') {
        updateData.regioes_atendimento = JSON.stringify(updateData.regioes_atendimento);
      }

      if (updateData.documentos_habilitacao && typeof updateData.documentos_habilitacao === 'object') {
        updateData.documentos_habilitacao = JSON.stringify(updateData.documentos_habilitacao);
      }

      // Update carrier
      const [updatedCarrier] = await trx('log_03_transportadoras')
        .where('id_transportadora', id)
        .update({
          ...updateData,
          data_atualizacao: new Date()
        })
        .returning('*');

      // Log audit trail
      await trx('auditoria_logs').insert({
        tabela: 'log_03_transportadoras',
        operacao: 'UPDATE',
        registro_id: id,
        dados_antigos: JSON.stringify(existingCarrier),
        dados_novos: JSON.stringify(updatedCarrier),
        usuario_id: updateData.usuario_id || null,
        data_operacao: new Date()
      });

      await trx.commit();

      return await this.getCarrierById(id);
    } catch (error) {
      await trx.rollback();
      console.error('Error in updateCarrier:', error);
      throw new Error(`Erro ao atualizar transportadora: ${error.message}`);
    }
  }

  /**
   * Delete carrier
   */
  async deleteCarrier(id) {
    const trx = await knex.transaction();

    try {
      // Check if carrier exists
      const carrier = await trx('log_03_transportadoras')
        .where('id_transportadora', id)
        .first();

      if (!carrier) {
        throw new Error('Transportadora não encontrada');
      }

      // Check if carrier has active shipments
      const activeShipments = await trx('log_01_envios')
        .where('transportadora_id', id)
        .whereIn('status', ['PENDENTE', 'COLETADO', 'EM_TRANSITO'])
        .count('id_envio as count')
        .first();

      if (parseInt(activeShipments.count) > 0) {
        throw new Error('Não é possível excluir transportadora com envios ativos');
      }

      // Soft delete - just mark as inactive
      await trx('log_03_transportadoras')
        .where('id_transportadora', id)
        .update({
          ativo: false,
          data_atualizacao: new Date()
        });

      // Log audit trail
      await trx('auditoria_logs').insert({
        tabela: 'log_03_transportadoras',
        operacao: 'DELETE',
        registro_id: id,
        dados_antigos: JSON.stringify(carrier),
        usuario_id: null,
        data_operacao: new Date()
      });

      await trx.commit();

      return {
        message: 'Transportadora desativada com sucesso'
      };
    } catch (error) {
      await trx.rollback();
      console.error('Error in deleteCarrier:', error);
      throw new Error(`Erro ao excluir transportadora: ${error.message}`);
    }
  }

  /**
   * Get carrier statistics
   */
  async getCarrierStats() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Total counts
      const totalStats = await knex('log_03_transportadoras')
        .select([
          knex.raw('COUNT(*) as total_transportadoras'),
          knex.raw('COUNT(CASE WHEN ativo = true THEN 1 END) as transportadoras_ativas'),
          knex.raw('COUNT(CASE WHEN tipo_transporte = \'RODOVIARIO\' THEN 1 END) as rodoviarias'),
          knex.raw('COUNT(CASE WHEN tipo_transporte = \'AEREO\' THEN 1 END) as aereas'),
          knex.raw('COUNT(CASE WHEN possui_rastreamento = true THEN 1 END) as com_rastreamento')
        ])
        .first();

      // Performance by classification
      const performanceByClass = await knex('log_03_transportadoras')
        .select([
          'classificacao',
          knex.raw('COUNT(*) as total'),
          knex.raw('AVG(taxa_sucesso_entrega) as taxa_sucesso_media'),
          knex.raw('AVG(tempo_medio_entrega) as tempo_medio')
        ])
        .where('ativo', true)
        .groupBy('classificacao')
        .orderBy('classificacao');

      // Recent activity
      const recentActivity = await knex('log_01_envios')
        .join('log_03_transportadoras', 'log_01_envios.transportadora_id', 'log_03_transportadoras.id_transportadora')
        .select([
          'log_03_transportadoras.nome_transportadora',
          knex.raw('COUNT(*) as total_envios'),
          knex.raw('SUM(valor_frete) as total_frete'),
          knex.raw('AVG(prazo_entrega_dias) as prazo_medio')
        ])
        .where('log_01_envios.data_criacao', '>=', thirtyDaysAgo)
        .groupBy('log_03_transportadoras.id_transportadora', 'log_03_transportadoras.nome_transportadora')
        .orderBy('total_envios', 'desc')
        .limit(10);

      return {
        total_stats: {
          total_transportadoras: parseInt(totalStats.total_transportadoras),
          transportadoras_ativas: parseInt(totalStats.transportadoras_ativas),
          rodoviarias: parseInt(totalStats.rodoviarias),
          aereas: parseInt(totalStats.aereas),
          com_rastreamento: parseInt(totalStats.com_rastreamento)
        },
        performance_by_class: performanceByClass.map(item => ({
          classificacao: item.classificacao,
          total: parseInt(item.total),
          taxa_sucesso_media: parseFloat(item.taxa_sucesso_media) || 0,
          tempo_medio: parseFloat(item.tempo_medio) || 0
        })),
        recent_activity: recentActivity.map(item => ({
          nome_transportadora: item.nome_transportadora,
          total_envios: parseInt(item.total_envios),
          total_frete: parseFloat(item.total_frete) || 0,
          prazo_medio: parseFloat(item.prazo_medio) || 0
        }))
      };
    } catch (error) {
      console.error('Error in getCarrierStats:', error);
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }
  }

  /**
   * Get carrier performance metrics
   */
  async getCarrierPerformance(id, filters = {}) {
    try {
      const { periodo = '30d' } = filters;
      
      let dateFilter = new Date();
      if (periodo === '7d') {
        dateFilter.setDate(dateFilter.getDate() - 7);
      } else if (periodo === '30d') {
        dateFilter.setDate(dateFilter.getDate() - 30);
      } else if (periodo === '90d') {
        dateFilter.setDate(dateFilter.getDate() - 90);
      }

      const dateFilterString = dateFilter.toISOString().split('T')[0];

      // Check if carrier exists
      const carrier = await knex('log_03_transportadoras')
        .where('id_transportadora', id)
        .first();

      if (!carrier) {
        throw new Error('Transportadora não encontrada');
      }

      // Performance metrics
      const performanceMetrics = await knex('log_01_envios')
        .where('transportadora_id', id)
        .where('data_criacao', '>=', dateFilterString)
        .select([
          knex.raw('COUNT(*) as total_envios'),
          knex.raw('COUNT(CASE WHEN status = \'ENTREGUE\' THEN 1 END) as envios_entregues'),
          knex.raw('COUNT(CASE WHEN status = \'CANCELADO\' THEN 1 END) as envios_cancelados'),
          knex.raw('COUNT(CASE WHEN status = \'EXTRAVIADO\' THEN 1 END) as envios_extraviados'),
          knex.raw('SUM(valor_frete) as receita_total'),
          knex.raw('AVG(valor_frete) as ticket_medio'),
          knex.raw('SUM(peso_kg) as peso_total'),
          knex.raw('AVG(prazo_entrega_dias) as prazo_medio')
        ])
        .first();

      // On-time delivery rate
      const deliveryStats = await knex('log_01_envios')
        .where('transportadora_id', id)
        .where('status', 'ENTREGUE')
        .where('data_criacao', '>=', dateFilterString)
        .select([
          knex.raw(`
            COUNT(CASE WHEN data_entrega_realizada::date <= data_entrega_prevista::date THEN 1 END) * 100.0 / COUNT(*) as taxa_pontualidade
          `),
          knex.raw(`
            AVG(
              EXTRACT(
                days FROM (data_entrega_realizada::date - data_entrega_prevista::date)
              )
            ) as atraso_medio_dias
          `)
        ])
        .first();

      // Monthly trend
      const monthlyTrend = await knex('log_01_envios')
        .where('transportadora_id', id)
        .where('data_criacao', '>=', dateFilterString)
        .select([
          knex.raw("DATE_TRUNC('month', data_criacao) as mes"),
          knex.raw('COUNT(*) as total_envios'),
          knex.raw('SUM(valor_frete) as receita'),
          knex.raw('COUNT(CASE WHEN status = \'ENTREGUE\' THEN 1 END) as entregas_sucesso')
        ])
        .groupBy(knex.raw("DATE_TRUNC('month', data_criacao)"))
        .orderBy('mes');

      const totalEnvios = parseInt(performanceMetrics.total_envios) || 0;
      const enviosEntregues = parseInt(performanceMetrics.envios_entregues) || 0;
      const taxaSucesso = totalEnvios > 0 ? (enviosEntregues / totalEnvios) * 100 : 0;

      return {
        carrier_info: {
          id_transportadora: carrier.id_transportadora,
          nome_transportadora: carrier.nome_transportadora,
          tipo_transporte: carrier.tipo_transporte,
          classificacao: carrier.classificacao
        },
        performance_metrics: {
          total_envios: totalEnvios,
          envios_entregues: enviosEntregues,
          envios_cancelados: parseInt(performanceMetrics.envios_cancelados) || 0,
          envios_extraviados: parseInt(performanceMetrics.envios_extraviados) || 0,
          taxa_sucesso: Math.round(taxaSucesso * 100) / 100,
          receita_total: parseFloat(performanceMetrics.receita_total) || 0,
          ticket_medio: parseFloat(performanceMetrics.ticket_medio) || 0,
          peso_total: parseFloat(performanceMetrics.peso_total) || 0,
          prazo_medio: parseFloat(performanceMetrics.prazo_medio) || 0
        },
        delivery_stats: {
          taxa_pontualidade: parseFloat(deliveryStats.taxa_pontualidade) || 0,
          atraso_medio_dias: parseFloat(deliveryStats.atraso_medio_dias) || 0
        },
        monthly_trend: monthlyTrend.map(item => ({
          mes: item.mes,
          total_envios: parseInt(item.total_envios),
          receita: parseFloat(item.receita),
          entregas_sucesso: parseInt(item.entregas_sucesso)
        }))
      };
    } catch (error) {
      console.error('Error in getCarrierPerformance:', error);
      throw new Error(`Erro ao buscar performance: ${error.message}`);
    }
  }

  /**
   * Calculate shipping quote for a carrier
   */
  async calculateShippingQuote(id, params) {
    try {
      const { origem, destino, peso, volume = 0, valor_mercadoria = 0, tipo_servico = 'NORMAL' } = params;

      // Get carrier information
      const carrier = await knex('log_03_transportadoras')
        .where('id_transportadora', id)
        .where('ativo', true)
        .first();

      if (!carrier) {
        throw new Error('Transportadora não encontrada ou inativa');
      }

      let valor_frete = 0;

      // Base freight calculation
      if (carrier.taxa_base_frete) {
        valor_frete += carrier.taxa_base_frete;
      }

      // Weight-based calculation
      if (carrier.taxa_por_kg) {
        valor_frete += carrier.taxa_por_kg * peso;
      }

      // Distance-based calculation (mock implementation)
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

      const prazoEntrega = carrier.tempo_medio_entrega || 5;
      const valorTotal = valor_frete + valor_seguro;

      return {
        transportadora: {
          id: carrier.id_transportadora,
          nome: carrier.nome_transportadora,
          tipo_transporte: carrier.tipo_transporte,
          possui_rastreamento: carrier.possui_rastreamento,
          taxa_sucesso_entrega: carrier.taxa_sucesso_entrega
        },
        cotacao: {
          origem,
          destino,
          peso,
          volume,
          valor_mercadoria,
          tipo_servico,
          distancia_estimada: Math.round(distancia_estimada * 100) / 100,
          prazo_entrega_dias: prazoEntrega,
          valor_frete: Math.round(valor_frete * 100) / 100,
          valor_seguro: Math.round(valor_seguro * 100) / 100,
          valor_total: Math.round(valorTotal * 100) / 100,
          data_cotacao: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error in calculateShippingQuote:', error);
      throw new Error(`Erro ao calcular cotação: ${error.message}`);
    }
  }

  /**
   * Helper method to parse JSON fields safely
   */
  parseJsonField(field) {
    if (!field) return null;
    
    try {
      return typeof field === 'string' ? JSON.parse(field) : field;
    } catch (e) {
      console.warn('Failed to parse JSON field:', field);
      return null;
    }
  }
}

module.exports = new CarriersService();