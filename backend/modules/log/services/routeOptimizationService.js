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
 * Service for route optimization business logic
 * Handles route management and optimization algorithms
 */

class RouteOptimizationService {
  /**
   * Get all routes with pagination and filters
   */
  async getAllRoutes(filters = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = null,
      veiculo_id = null,
      motorista_id = null,
      sort = 'data_rota',
      order = 'desc'
    } = filters;

    const offset = (page - 1) * limit;

    try {
      let query = knex('log_02_rotas')
        .select([
          'log_02_rotas.*',
          knex.raw('COALESCE(veiculos.placa, veiculos.modelo) as veiculo_info'),
          knex.raw('COALESCE(motoristas.nome, motoristas.cnh) as motorista_info')
        ])
        .leftJoin('frota_veiculos as veiculos', 'log_02_rotas.veiculo_id', 'veiculos.id_veiculo')
        .leftJoin('rh_funcionarios as motoristas', 'log_02_rotas.motorista_id', 'motoristas.id_funcionario');

      // Apply filters
      if (search) {
        query = query.where(function() {
          this.where('log_02_rotas.codigo_rota', 'ilike', `%${search}%`)
            .orWhere('log_02_rotas.nome_rota', 'ilike', `%${search}%`)
            .orWhere('veiculos.placa', 'ilike', `%${search}%`)
            .orWhere('motoristas.nome', 'ilike', `%${search}%`);
        });
      }

      if (status) {
        query = query.where('log_02_rotas.status', status);
      }

      if (veiculo_id) {
        query = query.where('log_02_rotas.veiculo_id', veiculo_id);
      }

      if (motorista_id) {
        query = query.where('log_02_rotas.motorista_id', motorista_id);
      }

      // Get total count
      const countQuery = query.clone();
      const [{ count }] = await countQuery.count('log_02_rotas.id_rota as count');
      const total = parseInt(count);

      // Apply sorting and pagination
      const validSortColumns = [
        'codigo_rota', 'nome_rota', 'data_rota', 'status', 
        'distancia_total_km', 'custo_total', 'hora_inicio'
      ];

      const sortColumn = validSortColumns.includes(sort) ? 
        `log_02_rotas.${sort}` : 'log_02_rotas.data_rota';
      
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
      console.error('Error in getAllRoutes:', error);
      throw new Error(`Erro ao buscar rotas: ${error.message}`);
    }
  }

  /**
   * Get route by ID
   */
  async getRouteById(id) {
    try {
      const route = await knex('log_02_rotas')
        .select([
          'log_02_rotas.*',
          'veiculos.placa as veiculo_placa',
          'veiculos.modelo as veiculo_modelo',
          'motoristas.nome as motorista_nome',
          'motoristas.cnh as motorista_cnh'
        ])
        .leftJoin('frota_veiculos as veiculos', 'log_02_rotas.veiculo_id', 'veiculos.id_veiculo')
        .leftJoin('rh_funcionarios as motoristas', 'log_02_rotas.motorista_id', 'motoristas.id_funcionario')
        .where('log_02_rotas.id_rota', id)
        .first();

      if (!route) {
        throw new Error('Rota não encontrada');
      }

      // Get delivery points if available
      if (route.pontos_entrega) {
        try {
          route.pontos_entrega = JSON.parse(route.pontos_entrega);
        } catch (e) {
          route.pontos_entrega = [];
        }
      }

      // Get GPS coordinates if available
      if (route.coordenadas_gps) {
        try {
          route.coordenadas_gps = JSON.parse(route.coordenadas_gps);
        } catch (e) {
          route.coordenadas_gps = [];
        }
      }

      return route;
    } catch (error) {
      console.error('Error in getRouteById:', error);
      throw new Error(`Erro ao buscar rota: ${error.message}`);
    }
  }

  /**
   * Create new route
   */
  async createRoute(routeData) {
    const trx = await knex.transaction();

    try {
      // Check if codigo_rota already exists
      const existingRoute = await trx('log_02_rotas')
        .where('codigo_rota', routeData.codigo_rota)
        .first();

      if (existingRoute) {
        throw new Error(`Já existe uma rota com o código ${routeData.codigo_rota}`);
      }

      // Validate vehicle availability
      if (routeData.veiculo_id) {
        const vehicle = await trx('frota_veiculos')
          .where('id_veiculo', routeData.veiculo_id)
          .where('status', 'DISPONIVEL')
          .first();

        if (!vehicle) {
          throw new Error('Veículo não encontrado ou não disponível');
        }

        // Check if vehicle is already assigned to another active route
        const activeRoute = await trx('log_02_rotas')
          .where('veiculo_id', routeData.veiculo_id)
          .where('data_rota', routeData.data_rota)
          .whereIn('status', ['PLANEJADA', 'EM_ANDAMENTO'])
          .first();

        if (activeRoute) {
          throw new Error('Veículo já está atribuído a outra rota ativa nesta data');
        }
      }

      // Validate driver availability
      if (routeData.motorista_id) {
        const driver = await trx('rh_funcionarios')
          .where('id_funcionario', routeData.motorista_id)
          .where('ativo', true)
          .first();

        if (!driver) {
          throw new Error('Motorista não encontrado ou inativo');
        }

        // Check if driver is already assigned to another active route
        const activeRoute = await trx('log_02_rotas')
          .where('motorista_id', routeData.motorista_id)
          .where('data_rota', routeData.data_rota)
          .whereIn('status', ['PLANEJADA', 'EM_ANDAMENTO'])
          .first();

        if (activeRoute) {
          throw new Error('Motorista já está atribuído a outra rota ativa nesta data');
        }
      }

      // Insert route
      const [newRoute] = await trx('log_02_rotas')
        .insert({
          ...routeData,
          data_criacao: new Date(),
          data_atualizacao: new Date()
        })
        .returning('*');

      // Log audit trail
      await trx('auditoria_logs').insert({
        tabela: 'log_02_rotas',
        operacao: 'INSERT',
        registro_id: newRoute.id_rota,
        dados_novos: JSON.stringify(newRoute),
        usuario_id: routeData.usuario_id || null,
        data_operacao: new Date()
      });

      await trx.commit();

      return await this.getRouteById(newRoute.id_rota);
    } catch (error) {
      await trx.rollback();
      console.error('Error in createRoute:', error);
      throw new Error(`Erro ao criar rota: ${error.message}`);
    }
  }

  /**
   * Optimize routes using delivery points
   */
  async optimizeRoutes(params) {
    const trx = await knex.transaction();

    try {
      const { entregas_ids, veiculo_id, motorista_id, data_rota, restricoes = {} } = params;

      // Get deliveries to optimize
      const deliveries = await trx('log_01_envios')
        .whereIn('id_envio', entregas_ids)
        .where('status', 'PENDENTE')
        .select([
          'id_envio', 'destino_endereco', 'destino_cidade', 'destino_uf',
          'destino_cep', 'peso_kg', 'volume_m3', 'data_entrega_prevista'
        ]);

      if (deliveries.length === 0) {
        throw new Error('Nenhuma entrega válida encontrada para otimização');
      }

      // Simple optimization algorithm (nearest neighbor)
      const optimizedOrder = this.optimizeDeliveryOrder(deliveries, restricoes);

      // Calculate total distance and time
      const routeCalculation = this.calculateRouteMetrics(optimizedOrder);

      // Create optimized route
      const routeCode = `OPT-${Date.now().toString().slice(-8)}`;
      const routeName = `Rota Otimizada - ${new Date(data_rota).toLocaleDateString('pt-BR')}`;

      const optimizedRoute = {
        codigo_rota: routeCode,
        nome_rota: routeName,
        data_rota,
        veiculo_id,
        motorista_id,
        endereco_inicio: optimizedOrder[0]?.destino_endereco || 'Base',
        endereco_fim: optimizedOrder[optimizedOrder.length - 1]?.destino_endereco || 'Base',
        distancia_total_km: routeCalculation.distancia_total,
        tempo_estimado_horas: routeCalculation.tempo_estimado,
        custo_combustivel: routeCalculation.custo_combustivel,
        custo_total: routeCalculation.custo_total,
        status: 'PLANEJADA',
        pontos_entrega: JSON.stringify(optimizedOrder.map(delivery => ({
          envio_id: delivery.id_envio,
          endereco: delivery.destino_endereco,
          cidade: delivery.destino_cidade,
          ordem: optimizedOrder.indexOf(delivery) + 1,
          peso: delivery.peso_kg,
          volume: delivery.volume_m3
        }))),
        otimizada: true,
        eficiencia_combustivel: routeCalculation.eficiencia
      };

      // Create the route
      const newRoute = await this.createRoute(optimizedRoute);

      // Update deliveries with route assignment
      await trx('log_01_envios')
        .whereIn('id_envio', entregas_ids)
        .update({
          rota_id: newRoute.id_rota,
          data_atualizacao: new Date()
        });

      await trx.commit();

      return {
        rota: newRoute,
        entregas_otimizadas: optimizedOrder.length,
        distancia_total: routeCalculation.distancia_total,
        tempo_estimado: routeCalculation.tempo_estimado,
        custo_estimado: routeCalculation.custo_total,
        economia_estimada: routeCalculation.economia || 0
      };
    } catch (error) {
      await trx.rollback();
      console.error('Error in optimizeRoutes:', error);
      throw new Error(`Erro ao otimizar rotas: ${error.message}`);
    }
  }

  /**
   * Calculate route distance and time
   */
  async calculateRoute(params) {
    try {
      const { origem, destinos } = params;

      let totalDistance = 0;
      let totalTime = 0;
      let currentLocation = origem;
      const routeSegments = [];

      for (const destino of destinos) {
        // Mock calculation - in real implementation, use Google Maps API
        const segment = this.calculateSegment(currentLocation, destino);
        
        routeSegments.push({
          origem: currentLocation,
          destino: destino,
          distancia_km: segment.distancia,
          tempo_minutos: segment.tempo,
          custo_estimado: segment.custo
        });

        totalDistance += segment.distancia;
        totalTime += segment.tempo;
        currentLocation = destino;
      }

      // Return to origin
      const returnSegment = this.calculateSegment(currentLocation, origem);
      routeSegments.push({
        origem: currentLocation,
        destino: origem,
        distancia_km: returnSegment.distancia,
        tempo_minutos: returnSegment.tempo,
        custo_estimado: returnSegment.custo
      });

      totalDistance += returnSegment.distancia;
      totalTime += returnSegment.tempo;

      return {
        origem,
        destinos,
        distancia_total_km: Math.round(totalDistance * 100) / 100,
        tempo_total_minutos: Math.round(totalTime),
        tempo_total_horas: Math.round((totalTime / 60) * 100) / 100,
        custo_combustivel_estimado: Math.round((totalDistance * 0.8) * 100) / 100, // R$ 0.80/km
        segmentos: routeSegments
      };
    } catch (error) {
      console.error('Error in calculateRoute:', error);
      throw new Error(`Erro ao calcular rota: ${error.message}`);
    }
  }

  /**
   * Update route
   */
  async updateRoute(id, updateData) {
    const trx = await knex.transaction();

    try {
      // Check if route exists
      const existingRoute = await trx('log_02_rotas')
        .where('id_rota', id)
        .first();

      if (!existingRoute) {
        throw new Error('Rota não encontrada');
      }

      // Check if route can be updated
      if (existingRoute.status === 'CONCLUIDA') {
        throw new Error('Não é possível alterar rota já concluída');
      }

      // Update route
      const [updatedRoute] = await trx('log_02_rotas')
        .where('id_rota', id)
        .update({
          ...updateData,
          data_atualizacao: new Date()
        })
        .returning('*');

      // Log audit trail
      await trx('auditoria_logs').insert({
        tabela: 'log_02_rotas',
        operacao: 'UPDATE',
        registro_id: id,
        dados_antigos: JSON.stringify(existingRoute),
        dados_novos: JSON.stringify(updatedRoute),
        usuario_id: updateData.usuario_id || null,
        data_operacao: new Date()
      });

      await trx.commit();

      return await this.getRouteById(id);
    } catch (error) {
      await trx.rollback();
      console.error('Error in updateRoute:', error);
      throw new Error(`Erro ao atualizar rota: ${error.message}`);
    }
  }

  /**
   * Start route execution
   */
  async startRoute(id, startData = {}) {
    const trx = await knex.transaction();

    try {
      const route = await trx('log_02_rotas')
        .where('id_rota', id)
        .first();

      if (!route) {
        throw new Error('Rota não encontrada');
      }

      if (route.status !== 'PLANEJADA') {
        throw new Error('Apenas rotas planejadas podem ser iniciadas');
      }

      // Update route status
      const [updatedRoute] = await trx('log_02_rotas')
        .where('id_rota', id)
        .update({
          status: 'EM_ANDAMENTO',
          hora_inicio: new Date().toISOString().split('T')[1].substring(0, 5),
          km_inicial: startData.km_inicial || route.km_inicial,
          combustivel_inicial: startData.combustivel_inicial || route.combustivel_inicial,
          observacoes: startData.observacoes || route.observacoes,
          data_atualizacao: new Date()
        })
        .returning('*');

      // Update vehicle status if assigned
      if (route.veiculo_id) {
        await trx('frota_veiculos')
          .where('id_veiculo', route.veiculo_id)
          .update({ status: 'EM_ROTA' });
      }

      // Log audit trail
      await trx('auditoria_logs').insert({
        tabela: 'log_02_rotas',
        operacao: 'UPDATE',
        registro_id: id,
        dados_antigos: JSON.stringify(route),
        dados_novos: JSON.stringify(updatedRoute),
        usuario_id: null,
        data_operacao: new Date()
      });

      await trx.commit();

      return {
        message: 'Rota iniciada com sucesso',
        route: updatedRoute
      };
    } catch (error) {
      await trx.rollback();
      console.error('Error in startRoute:', error);
      throw new Error(`Erro ao iniciar rota: ${error.message}`);
    }
  }

  /**
   * Complete route execution
   */
  async completeRoute(id, completionData = {}) {
    const trx = await knex.transaction();

    try {
      const route = await trx('log_02_rotas')
        .where('id_rota', id)
        .first();

      if (!route) {
        throw new Error('Rota não encontrada');
      }

      if (route.status !== 'EM_ANDAMENTO') {
        throw new Error('Apenas rotas em andamento podem ser concluídas');
      }

      // Calculate route efficiency
      const kmPercorridos = completionData.km_final - (route.km_inicial || 0);
      const eficiencia = kmPercorridos > 0 ? 
        (route.distancia_total_km / kmPercorridos) * 100 : 100;

      // Update route status
      const [updatedRoute] = await trx('log_02_rotas')
        .where('id_rota', id)
        .update({
          status: 'CONCLUIDA',
          hora_fim: new Date().toISOString().split('T')[1].substring(0, 5),
          km_final: completionData.km_final || route.km_final,
          combustivel_final: completionData.combustivel_final || route.combustivel_final,
          observacoes: completionData.observacoes || route.observacoes,
          eficiencia_combustivel: Math.round(eficiencia * 100) / 100,
          data_atualizacao: new Date()
        })
        .returning('*');

      // Update vehicle status if assigned
      if (route.veiculo_id) {
        await trx('frota_veiculos')
          .where('id_veiculo', route.veiculo_id)
          .update({ status: 'DISPONIVEL' });
      }

      // Log audit trail
      await trx('auditoria_logs').insert({
        tabela: 'log_02_rotas',
        operacao: 'UPDATE',
        registro_id: id,
        dados_antigos: JSON.stringify(route),
        dados_novos: JSON.stringify(updatedRoute),
        usuario_id: null,
        data_operacao: new Date()
      });

      await trx.commit();

      return {
        message: 'Rota concluída com sucesso',
        route: updatedRoute
      };
    } catch (error) {
      await trx.rollback();
      console.error('Error in completeRoute:', error);
      throw new Error(`Erro ao concluir rota: ${error.message}`);
    }
  }

  /**
   * Get route statistics
   */
  async getRouteStats(filters = {}) {
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

      // Route counts by status
      const statusCounts = await knex('log_02_rotas')
        .select('status')
        .count('id_rota as count')
        .where('data_criacao', '>=', dateFilterString)
        .groupBy('status');

      // Efficiency metrics
      const efficiencyStats = await knex('log_02_rotas')
        .where('status', 'CONCLUIDA')
        .where('data_criacao', '>=', dateFilterString)
        .select([
          knex.raw('COUNT(*) as total_rotas'),
          knex.raw('SUM(distancia_total_km) as total_distancia'),
          knex.raw('AVG(eficiencia_combustivel) as eficiencia_media'),
          knex.raw('SUM(custo_total) as custo_total'),
          knex.raw('AVG(tempo_estimado_horas) as tempo_medio')
        ])
        .first();

      // Top performing drivers
      const topDrivers = await knex('log_02_rotas')
        .join('rh_funcionarios', 'log_02_rotas.motorista_id', 'rh_funcionarios.id_funcionario')
        .select([
          'rh_funcionarios.nome',
          knex.raw('COUNT(*) as total_rotas'),
          knex.raw('AVG(eficiencia_combustivel) as eficiencia_media'),
          knex.raw('SUM(distancia_total_km) as total_distancia')
        ])
        .where('log_02_rotas.status', 'CONCLUIDA')
        .where('log_02_rotas.data_criacao', '>=', dateFilterString)
        .groupBy('rh_funcionarios.id_funcionario', 'rh_funcionarios.nome')
        .orderBy('eficiencia_media', 'desc')
        .limit(5);

      return {
        status_counts: statusCounts.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        efficiency_stats: {
          total_rotas: parseInt(efficiencyStats.total_rotas) || 0,
          total_distancia: parseFloat(efficiencyStats.total_distancia) || 0,
          eficiencia_media: parseFloat(efficiencyStats.eficiencia_media) || 0,
          custo_total: parseFloat(efficiencyStats.custo_total) || 0,
          tempo_medio: parseFloat(efficiencyStats.tempo_medio) || 0
        },
        top_drivers: topDrivers.map(driver => ({
          ...driver,
          total_rotas: parseInt(driver.total_rotas),
          eficiencia_media: parseFloat(driver.eficiencia_media),
          total_distancia: parseFloat(driver.total_distancia)
        }))
      };
    } catch (error) {
      console.error('Error in getRouteStats:', error);
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }
  }

  /**
   * Get delivery performance metrics
   */
  async getDeliveryPerformance(filters = {}) {
    try {
      const { motorista_id = null, periodo = '30d' } = filters;
      
      let dateFilter = new Date();
      if (periodo === '7d') {
        dateFilter.setDate(dateFilter.getDate() - 7);
      } else if (periodo === '30d') {
        dateFilter.setDate(dateFilter.getDate() - 30);
      } else if (periodo === '90d') {
        dateFilter.setDate(dateFilter.getDate() - 90);
      }

      const dateFilterString = dateFilter.toISOString().split('T')[0];

      let query = knex('log_02_rotas')
        .where('status', 'CONCLUIDA')
        .where('data_criacao', '>=', dateFilterString);

      if (motorista_id) {
        query = query.where('motorista_id', motorista_id);
      }

      const performance = await query
        .select([
          knex.raw('COUNT(*) as total_rotas'),
          knex.raw('SUM(distancia_total_km) as distancia_total'),
          knex.raw('AVG(tempo_estimado_horas) as tempo_medio'),
          knex.raw('AVG(eficiencia_combustivel) as eficiencia_media'),
          knex.raw('SUM(custo_total) as custo_total'),
          knex.raw(`
            COUNT(CASE WHEN otimizada = true THEN 1 END) * 100.0 / COUNT(*) as taxa_otimizacao
          `)
        ])
        .first();

      return {
        total_rotas: parseInt(performance.total_rotas) || 0,
        distancia_total: parseFloat(performance.distancia_total) || 0,
        tempo_medio: parseFloat(performance.tempo_medio) || 0,
        eficiencia_media: parseFloat(performance.eficiencia_media) || 0,
        custo_total: parseFloat(performance.custo_total) || 0,
        taxa_otimizacao: parseFloat(performance.taxa_otimizacao) || 0
      };
    } catch (error) {
      console.error('Error in getDeliveryPerformance:', error);
      throw new Error(`Erro ao buscar métricas de performance: ${error.message}`);
    }
  }

  // Helper methods for optimization algorithms

  /**
   * Optimize delivery order using nearest neighbor algorithm
   */
  optimizeDeliveryOrder(deliveries, restricoes = {}) {
    if (deliveries.length <= 1) return deliveries;

    const optimized = [];
    const remaining = [...deliveries];
    
    // Start with the first delivery or priority one
    let current = remaining.shift();
    optimized.push(current);

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const distance = this.calculateDistance(current, remaining[i]);
        
        // Apply restrictions
        if (restricoes.peso_maximo && 
            this.getTotalWeight(optimized) + remaining[i].peso_kg > restricoes.peso_maximo) {
          continue;
        }

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      current = remaining.splice(nearestIndex, 1)[0];
      optimized.push(current);
    }

    return optimized;
  }

  /**
   * Calculate route metrics
   */
  calculateRouteMetrics(deliveries) {
    let totalDistance = 0;
    let totalTime = 0;

    for (let i = 0; i < deliveries.length - 1; i++) {
      const segment = this.calculateSegment(deliveries[i], deliveries[i + 1]);
      totalDistance += segment.distancia;
      totalTime += segment.tempo;
    }

    const costPerKm = 0.8; // R$ 0.80 per km
    const fuelEfficiency = 85; // 85% efficiency

    return {
      distancia_total: Math.round(totalDistance * 100) / 100,
      tempo_estimado: Math.round((totalTime / 60) * 100) / 100, // hours
      custo_combustivel: Math.round(totalDistance * costPerKm * 100) / 100,
      custo_total: Math.round(totalDistance * costPerKm * 1.2 * 100) / 100, // 20% overhead
      eficiencia: fuelEfficiency
    };
  }

  /**
   * Calculate distance between two points (mock implementation)
   */
  calculateDistance(point1, point2) {
    // Mock distance calculation - in real implementation, use proper geolocation
    const lat1 = this.extractLatFromAddress(point1.destino_endereco);
    const lng1 = this.extractLngFromAddress(point1.destino_endereco);
    const lat2 = this.extractLatFromAddress(point2.destino_endereco);
    const lng2 = this.extractLngFromAddress(point2.destino_endereco);

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = 6371 * c; // Earth radius in km

    return distance || Math.random() * 50 + 5; // Fallback to random distance
  }

  /**
   * Calculate segment between two locations
   */
  calculateSegment(origem, destino) {
    const distance = typeof origem === 'string' ? 
      Math.random() * 30 + 10 : 
      this.calculateDistance(origem, destino);
    
    const tempo = distance * 1.5 + Math.random() * 15; // minutes
    const custo = distance * 0.8; // R$ per km

    return {
      distancia: Math.round(distance * 100) / 100,
      tempo: Math.round(tempo),
      custo: Math.round(custo * 100) / 100
    };
  }

  /**
   * Get total weight of deliveries
   */
  getTotalWeight(deliveries) {
    return deliveries.reduce((total, delivery) => total + (delivery.peso_kg || 0), 0);
  }

  /**
   * Extract latitude from address (mock)
   */
  extractLatFromAddress(address) {
    return -23.5505 + (Math.random() - 0.5) * 2; // São Paulo area
  }

  /**
   * Extract longitude from address (mock)
   */
  extractLngFromAddress(address) {
    return -46.6333 + (Math.random() - 0.5) * 2; // São Paulo area
  }
}

module.exports = new RouteOptimizationService();