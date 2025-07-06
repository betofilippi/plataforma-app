const { ValidationService } = require('./validationService');
const auditLogger = require('../../../src/utils/auditLogger');
const crypto = require('crypto');
const axios = require('axios');

class WebhooksService {
  constructor(knex) {
    this.knex = knex;
    this.retryQueue = new Map(); // Em produção usaria Redis/Bull
    this.circuitBreakers = new Map();
  }

  async listWebhooks(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      let query = this.knex('whk_01_webhooks as w')
        .leftJoin('whk_04_assinantes as s', 'w.assinante_id', 's.id')
        .select(
          'w.*',
          's.nome as assinante_nome',
          's.email as assinante_email'
        )
        .where('w.ativo', true);

      // Aplicar filtros
      if (filters.status) {
        query = query.where('w.status', filters.status);
      }

      if (filters.assinante_id) {
        query = query.where('w.assinante_id', filters.assinante_id);
      }

      if (filters.evento_tipo) {
        query = query.whereRaw('? = ANY(w.eventos_subscritos)', [filters.evento_tipo]);
      }

      if (filters.search) {
        query = query.where(function() {
          this.where('w.nome', 'ilike', `%${filters.search}%`)
              .orWhere('w.url_destino', 'ilike', `%${filters.search}%`);
        });
      }

      // Buscar total de registros
      const totalQuery = query.clone().clearSelect().count('* as total');
      const [{ total }] = await totalQuery;

      // Aplicar paginação e ordenação
      const results = await query
        .orderBy('w.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      // Adicionar estatísticas para cada webhook
      for (const webhook of results) {
        const stats = await this.getWebhookStats(webhook.id);
        webhook.stats = stats;
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
      throw new Error(`Erro ao listar webhooks: ${error.message}`);
    }
  }

  async getWebhookById(id) {
    try {
      const webhook = await this.knex('whk_01_webhooks as w')
        .leftJoin('whk_04_assinantes as s', 'w.assinante_id', 's.id')
        .select(
          'w.*',
          's.nome as assinante_nome',
          's.email as assinante_email',
          's.configuracoes as assinante_configuracoes'
        )
        .where('w.id', id)
        .where('w.ativo', true)
        .first();

      if (!webhook) {
        throw new Error('Webhook não encontrado');
      }

      // Buscar últimas entregas
      const ultimasEntregas = await this.knex('whk_03_entregas')
        .where('webhook_id', id)
        .orderBy('created_at', 'desc')
        .limit(10);

      // Buscar estatísticas
      const stats = await this.getWebhookStats(id);

      // Buscar eventos disponíveis
      const eventosDisponiveis = await this.knex('whk_02_eventos')
        .where('ativo', true)
        .select('tipo', 'nome', 'descricao', 'schema_payload');

      return {
        ...webhook,
        ultimas_entregas: ultimasEntregas,
        stats,
        eventos_disponiveis: eventosDisponiveis
      };
    } catch (error) {
      throw new Error(`Erro ao buscar webhook: ${error.message}`);
    }
  }

  async createWebhook(data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const validData = ValidationService.validateWebhook(data);

      // Verificar se URL é válida e acessível
      await this.validateWebhookUrl(validData.url_destino);

      // Gerar chave secreta se não fornecida
      if (!validData.secret_key) {
        validData.secret_key = this.generateSecretKey();
      }

      // Verificar se assinante existe
      if (validData.assinante_id) {
        const assinante = await trx('whk_04_assinantes')
          .where({ id: validData.assinante_id, ativo: true })
          .first();
        
        if (!assinante) {
          throw new Error('Assinante não encontrado');
        }
      }

      // Validar eventos subscritos
      for (const eventoTipo of validData.eventos_subscritos) {
        const evento = await trx('whk_02_eventos')
          .where({ tipo: eventoTipo, ativo: true })
          .first();
        
        if (!evento) {
          throw new Error(`Tipo de evento '${eventoTipo}' não encontrado`);
        }
      }

      const now = new Date().toISOString();
      const webhookData = {
        ...validData,
        status: 'ativo',
        created_at: now,
        updated_at: now,
        created_by: userId
      };

      const [webhook] = await trx('whk_01_webhooks')
        .insert(webhookData)
        .returning('*');

      // Log de auditoria
      await auditLogger.log({
        tabela: 'whk_01_webhooks',
        operacao: 'INSERT',
        registro_id: webhook.id,
        dados_novos: { ...webhookData, secret_key: '[REDACTED]' },
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getWebhookById(webhook.id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async updateWebhook(id, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const existingWebhook = await trx('whk_01_webhooks')
        .where({ id, ativo: true })
        .first();

      if (!existingWebhook) {
        throw new Error('Webhook não encontrado');
      }

      const validData = ValidationService.validateWebhook({
        ...existingWebhook,
        ...data
      });

      // Validar URL se foi alterada
      if (data.url_destino && data.url_destino !== existingWebhook.url_destino) {
        await this.validateWebhookUrl(validData.url_destino);
        // Reset circuit breaker para nova URL
        this.circuitBreakers.delete(id);
      }

      const updateData = {
        ...validData,
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      delete updateData.id;
      delete updateData.created_at;
      delete updateData.created_by;

      await trx('whk_01_webhooks')
        .where({ id })
        .update(updateData);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'whk_01_webhooks',
        operacao: 'UPDATE',
        registro_id: id,
        dados_anteriores: { ...existingWebhook, secret_key: '[REDACTED]' },
        dados_novos: { ...updateData, secret_key: '[REDACTED]' },
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getWebhookById(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async deleteWebhook(id, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const webhook = await trx('whk_01_webhooks')
        .where({ id, ativo: true })
        .first();

      if (!webhook) {
        throw new Error('Webhook não encontrado');
      }

      const updateData = {
        ativo: false,
        status: 'inativo',
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      await trx('whk_01_webhooks')
        .where({ id })
        .update(updateData);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'whk_01_webhooks',
        operacao: 'DELETE',
        registro_id: id,
        dados_anteriores: { ...webhook, secret_key: '[REDACTED]' },
        usuario_id: userId
      }, trx);

      await trx.commit();

      return { success: true, message: 'Webhook desativado com sucesso' };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async triggerEvent(eventType, payload, context = {}) {
    const trx = await this.knex.transaction();
    
    try {
      // Verificar se evento existe
      const evento = await trx('whk_02_eventos')
        .where({ tipo: eventType, ativo: true })
        .first();

      if (!evento) {
        throw new Error(`Tipo de evento '${eventType}' não encontrado`);
      }

      // Validar payload contra schema do evento
      if (evento.schema_payload) {
        this.validatePayloadAgainstSchema(payload, evento.schema_payload);
      }

      // Buscar webhooks subscritos a este evento
      const webhooks = await trx('whk_01_webhooks')
        .where('ativo', true)
        .where('status', 'ativo')
        .whereRaw('? = ANY(eventos_subscritos)', [eventType]);

      const deliveries = [];

      for (const webhook of webhooks) {
        // Verificar filtros específicos
        if (webhook.filtros && !this.matchFilters(payload, webhook.filtros)) {
          continue;
        }

        // Verificar circuit breaker
        if (this.isCircuitBreakerOpen(webhook.id)) {
          console.log(`Circuit breaker open for webhook ${webhook.id}, skipping delivery`);
          continue;
        }

        // Criar entrega
        const delivery = await this.createDelivery(webhook, evento, payload, context, trx);
        deliveries.push(delivery);

        // Agendar entrega assíncrona
        this.scheduleDelivery(delivery);
      }

      await trx.commit();

      return {
        event_type: eventType,
        deliveries_created: deliveries.length,
        deliveries: deliveries.map(d => ({ id: d.id, webhook_id: d.webhook_id, status: d.status }))
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async testWebhook(id, testPayload = null) {
    try {
      const webhook = await this.knex('whk_01_webhooks')
        .where({ id, ativo: true })
        .first();

      if (!webhook) {
        throw new Error('Webhook não encontrado');
      }

      const payload = testPayload || {
        event_type: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'Teste de webhook',
          webhook_id: id
        }
      };

      const result = await this.deliverWebhook(webhook, payload, {
        tentativa: 1,
        is_test: true
      });

      return {
        success: result.success,
        status_code: result.status_code,
        response_time_ms: result.response_time_ms,
        response_body: result.response_body,
        error: result.error
      };
    } catch (error) {
      throw new Error(`Erro ao testar webhook: ${error.message}`);
    }
  }

  async retryDelivery(deliveryId, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const delivery = await trx('whk_03_entregas')
        .where({ id: deliveryId })
        .first();

      if (!delivery) {
        throw new Error('Entrega não encontrada');
      }

      if (delivery.status === 'sucesso') {
        throw new Error('Entrega já foi bem-sucedida');
      }

      const webhook = await trx('whk_01_webhooks')
        .where({ id: delivery.webhook_id })
        .first();

      if (!webhook) {
        throw new Error('Webhook não encontrado');
      }

      // Incrementar tentativa
      delivery.tentativa_atual += 1;
      
      const result = await this.deliverWebhook(webhook, delivery.payload, {
        tentativa: delivery.tentativa_atual,
        is_retry: true
      });

      // Atualizar entrega
      const updateData = {
        status: result.success ? 'sucesso' : 'falha',
        codigo_resposta: result.status_code,
        tempo_resposta_ms: result.response_time_ms,
        resposta: result.response_body,
        erro: result.error,
        tentativa_atual: delivery.tentativa_atual,
        proxima_tentativa: result.success ? null : this.calculateNextRetry(delivery.tentativa_atual),
        updated_at: new Date().toISOString()
      };

      await trx('whk_03_entregas')
        .where({ id: deliveryId })
        .update(updateData);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'whk_03_entregas',
        operacao: 'RETRY',
        registro_id: deliveryId,
        dados_novos: updateData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return {
        success: result.success,
        delivery_id: deliveryId,
        tentativa: delivery.tentativa_atual,
        proxima_tentativa: updateData.proxima_tentativa
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // Métodos auxiliares
  async validateWebhookUrl(url) {
    try {
      const response = await axios.head(url, { timeout: 5000 });
      return response.status < 400;
    } catch (error) {
      throw new Error(`URL inválida ou inacessível: ${error.message}`);
    }
  }

  generateSecretKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateHMACSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  validatePayloadAgainstSchema(payload, schema) {
    // Implementaria validação JSON Schema
    // Por simplicidade, apenas verificar se é objeto válido
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('Payload deve ser um objeto JSON válido');
    }
  }

  matchFilters(payload, filters) {
    // Implementaria lógica de filtros complexa
    // Por simplicidade, sempre retorna true
    return true;
  }

  isCircuitBreakerOpen(webhookId) {
    const breaker = this.circuitBreakers.get(webhookId);
    if (!breaker) return false;
    
    const now = Date.now();
    if (now > breaker.resetTime) {
      this.circuitBreakers.delete(webhookId);
      return false;
    }
    
    return breaker.failures >= 5; // 5 falhas consecutivas
  }

  updateCircuitBreaker(webhookId, success) {
    if (success) {
      this.circuitBreakers.delete(webhookId);
    } else {
      const breaker = this.circuitBreakers.get(webhookId) || { failures: 0, resetTime: 0 };
      breaker.failures += 1;
      breaker.resetTime = Date.now() + (15 * 60 * 1000); // 15 minutos
      this.circuitBreakers.set(webhookId, breaker);
    }
  }

  async createDelivery(webhook, evento, payload, context, trx) {
    const deliveryData = {
      webhook_id: webhook.id,
      evento_tipo: evento.tipo,
      payload: JSON.stringify(payload),
      status: 'pendente',
      tentativa_atual: 0,
      max_tentativas: webhook.max_tentativas || 3,
      proxima_tentativa: new Date().toISOString(),
      metadados: JSON.stringify(context),
      created_at: new Date().toISOString()
    };

    const [delivery] = await trx('whk_03_entregas')
      .insert(deliveryData)
      .returning('*');

    return delivery;
  }

  async deliverWebhook(webhook, payload, options = {}) {
    const startTime = Date.now();
    
    try {
      const signature = this.generateHMACSignature(payload, webhook.secret_key);
      
      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': payload.event_type || 'unknown',
        'X-Webhook-Delivery': options.delivery_id || 'test',
        'X-Webhook-Timestamp': new Date().toISOString(),
        'User-Agent': 'ERP-Webhook/1.0'
      };

      // Adicionar autenticação personalizada se configurada
      if (webhook.autenticacao) {
        const auth = webhook.autenticacao;
        if (auth.tipo === 'bearer') {
          headers['Authorization'] = `Bearer ${auth.token}`;
        } else if (auth.tipo === 'api_key') {
          headers[auth.header_name || 'X-API-Key'] = auth.api_key;
        }
      }

      const response = await axios.post(webhook.url_destino, payload, {
        headers,
        timeout: webhook.timeout || 30000,
        maxRedirects: 3,
        validateStatus: (status) => status < 500 // Não considerar 4xx como erro de rede
      });

      const responseTime = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;

      // Atualizar circuit breaker
      this.updateCircuitBreaker(webhook.id, success);

      return {
        success,
        status_code: response.status,
        response_time_ms: responseTime,
        response_body: response.data,
        error: null
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Atualizar circuit breaker
      this.updateCircuitBreaker(webhook.id, false);

      return {
        success: false,
        status_code: error.response?.status || 0,
        response_time_ms: responseTime,
        response_body: error.response?.data || null,
        error: error.message
      };
    }
  }

  scheduleDelivery(delivery) {
    // Em produção usaria uma queue (Bull, etc.)
    // Por simplicidade, executar assíncronamente
    setTimeout(async () => {
      try {
        await this.processDelivery(delivery.id);
      } catch (error) {
        console.error(`Erro ao processar entrega ${delivery.id}:`, error);
      }
    }, 100);
  }

  async processDelivery(deliveryId) {
    const trx = await this.knex.transaction();
    
    try {
      const delivery = await trx('whk_03_entregas')
        .where({ id: deliveryId })
        .first();

      if (!delivery || delivery.status !== 'pendente') {
        await trx.rollback();
        return;
      }

      const webhook = await trx('whk_01_webhooks')
        .where({ id: delivery.webhook_id })
        .first();

      if (!webhook || !webhook.ativo) {
        await trx('whk_03_entregas')
          .where({ id: deliveryId })
          .update({ status: 'cancelado' });
        await trx.commit();
        return;
      }

      delivery.tentativa_atual += 1;
      
      const result = await this.deliverWebhook(webhook, JSON.parse(delivery.payload), {
        delivery_id: deliveryId,
        tentativa: delivery.tentativa_atual
      });

      const updateData = {
        status: result.success ? 'sucesso' : 'falha',
        codigo_resposta: result.status_code,
        tempo_resposta_ms: result.response_time_ms,
        resposta: JSON.stringify(result.response_body),
        erro: result.error,
        tentativa_atual: delivery.tentativa_atual,
        proxima_tentativa: null,
        updated_at: new Date().toISOString()
      };

      // Se falhou e ainda há tentativas, agendar próxima
      if (!result.success && delivery.tentativa_atual < delivery.max_tentativas) {
        updateData.proxima_tentativa = this.calculateNextRetry(delivery.tentativa_atual);
        updateData.status = 'pendente';
        
        // Reagendar
        setTimeout(() => this.processDelivery(deliveryId), this.getRetryDelay(delivery.tentativa_atual));
      }

      await trx('whk_03_entregas')
        .where({ id: deliveryId })
        .update(updateData);

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      console.error(`Erro ao processar entrega ${deliveryId}:`, error);
    }
  }

  calculateNextRetry(attempt) {
    // Backoff exponencial: 2^attempt minutos
    const minutes = Math.pow(2, attempt);
    const nextTime = new Date(Date.now() + (minutes * 60 * 1000));
    return nextTime.toISOString();
  }

  getRetryDelay(attempt) {
    // Em milissegundos para setTimeout
    return Math.pow(2, attempt) * 60 * 1000;
  }

  async getWebhookStats(webhookId) {
    try {
      const stats = await this.knex('whk_03_entregas')
        .where('webhook_id', webhookId)
        .select(
          this.knex.raw('COUNT(*) as total_entregas'),
          this.knex.raw('COUNT(*) FILTER (WHERE status = ?) as sucessos', ['sucesso']),
          this.knex.raw('COUNT(*) FILTER (WHERE status = ?) as falhas', ['falha']),
          this.knex.raw('COUNT(*) FILTER (WHERE status = ?) as pendentes', ['pendente']),
          this.knex.raw('AVG(tempo_resposta_ms) as tempo_resposta_medio'),
          this.knex.raw('MAX(created_at) as ultima_entrega')
        )
        .first();

      const taxaSucesso = stats.total_entregas > 0 ? 
        (stats.sucessos / stats.total_entregas) * 100 : 0;

      return {
        ...stats,
        taxa_sucesso: parseFloat(taxaSucesso.toFixed(2))
      };
    } catch (error) {
      return {
        total_entregas: 0,
        sucessos: 0,
        falhas: 0,
        pendentes: 0,
        tempo_resposta_medio: 0,
        taxa_sucesso: 0,
        ultima_entrega: null
      };
    }
  }
}

module.exports = WebhooksService;