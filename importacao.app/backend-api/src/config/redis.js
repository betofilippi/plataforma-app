const { createClient } = require('redis');
const { performanceMonitor } = require('../utils/performanceMonitor');

/**
 * Configuração Redis para cache e sessões
 */
class RedisConfig {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.metrics = {
      commands: 0,
      hits: 0,
      misses: 0,
      errors: 0,
      slowCommands: 0
    };
  }

  /**
   * Inicializar conexões Redis
   */
  async initialize() {
    const config = this.getRedisConfig();
    
    try {
      // Cliente principal
      this.client = createClient(config);
      
      // Cliente para subscriber (pub/sub)
      this.subscriber = createClient(config);
      
      // Cliente para publisher (pub/sub)
      this.publisher = createClient(config);
      
      // Configurar eventos
      this.setupEventHandlers();
      
      // Conectar todos os clientes
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect()
      ]);
      
      // Testar conexão
      await this.testConnection();
      
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      console.log('✅ Conexão com Redis estabelecida');
      
      return this.client;
      
    } catch (error) {
      this.connectionAttempts++;
      console.error(`❌ Erro na conexão com Redis (tentativa ${this.connectionAttempts}):`, error.message);
      
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log('🔄 Tentando reconectar ao Redis em 3 segundos...');
        await this.sleep(3000);
        return this.initialize();
      } else {
        console.warn(`⚠️  Redis indisponível após ${this.maxConnectionAttempts} tentativas. Continuando sem cache.`);
        this.isConnected = false;
        return null;
      }
    }
  }

  /**
   * Obter configuração do Redis
   */
  getRedisConfig() {
    return {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB) || 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ Redis: Máximo de tentativas de reconexão atingido');
            return false;
          }
          return Math.min(retries * 50, 2000);
        }
      }
    };
  }

  /**
   * Configurar handlers de eventos
   */
  setupEventHandlers() {
    // Eventos do cliente principal
    this.client.on('connect', () => {
      console.log('🔗 Redis: Conectando...');
    });

    this.client.on('ready', () => {
      console.log('✅ Redis: Cliente principal pronto');
    });

    this.client.on('error', (error) => {
      this.metrics.errors++;
      console.error('❌ Redis Error:', error.message);
      performanceMonitor.recordRedisError(error);
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis: Reconectando...');
    });

    this.client.on('end', () => {
      console.log('🔌 Redis: Conexão encerrada');
      this.isConnected = false;
    });

    // Eventos similares para subscriber e publisher
    ['subscriber', 'publisher'].forEach(clientType => {
      const client = this[clientType];
      
      client.on('error', (error) => {
        console.error(`❌ Redis ${clientType} Error:`, error.message);
      });

      client.on('ready', () => {
        console.log(`✅ Redis: ${clientType} pronto`);
      });
    });
  }

  /**
   * Testar conexão
   */
  async testConnection() {
    try {
      const result = await this.client.ping();
      if (result === 'PONG') {
        console.log('✅ Redis: Teste de conexão bem-sucedido');
        return true;
      }
      throw new Error('Resposta inesperada do ping');
    } catch (error) {
      console.error('❌ Redis: Teste de conexão falhou:', error.message);
      throw error;
    }
  }

  /**
   * Cache wrapper com métricas
   */
  async get(key) {
    if (!this.isConnected) return null;
    
    try {
      const startTime = Date.now();
      const result = await this.client.get(key);
      const duration = Date.now() - startTime;
      
      this.metrics.commands++;
      
      if (result !== null) {
        this.metrics.hits++;
      } else {
        this.metrics.misses++;
      }
      
      if (duration > 100) {
        this.metrics.slowCommands++;
        console.warn(`🐌 Redis: Comando GET lento (${duration}ms) para chave: ${key}`);
      }
      
      // Tentar fazer parse JSON se possível
      if (result) {
        try {
          return JSON.parse(result);
        } catch {
          return result;
        }
      }
      
      return result;
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Redis GET error:', error.message);
      return null;
    }
  }

  /**
   * Set com TTL automático
   */
  async set(key, value, ttl = 3600) {
    if (!this.isConnected) return false;
    
    try {
      const startTime = Date.now();
      
      // Serializar valor se necessário
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      const result = await this.client.setEx(key, ttl, serializedValue);
      const duration = Date.now() - startTime;
      
      this.metrics.commands++;
      
      if (duration > 100) {
        this.metrics.slowCommands++;
        console.warn(`🐌 Redis: Comando SET lento (${duration}ms) para chave: ${key}`);
      }
      
      return result === 'OK';
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Redis SET error:', error.message);
      return false;
    }
  }

  /**
   * Deletar chave
   */
  async del(key) {
    if (!this.isConnected) return false;
    
    try {
      const result = await this.client.del(key);
      this.metrics.commands++;
      return result > 0;
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Redis DEL error:', error.message);
      return false;
    }
  }

  /**
   * Verificar se chave existe
   */
  async exists(key) {
    if (!this.isConnected) return false;
    
    try {
      const result = await this.client.exists(key);
      this.metrics.commands++;
      return result === 1;
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Redis EXISTS error:', error.message);
      return false;
    }
  }

  /**
   * Cache com callback
   */
  async cache(key, callback, ttl = 3600) {
    // Tentar obter do cache primeiro
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Executar callback e cachear resultado
    try {
      const result = await callback();
      await this.set(key, result, ttl);
      return result;
    } catch (error) {
      console.error('❌ Erro ao executar callback do cache:', error.message);
      throw error;
    }
  }

  /**
   * Incrementar contador
   */
  async incr(key, ttl = 3600) {
    if (!this.isConnected) return null;
    
    try {
      const result = await this.client.incr(key);
      
      // Definir TTL apenas se é a primeira vez
      if (result === 1) {
        await this.client.expire(key, ttl);
      }
      
      this.metrics.commands++;
      return result;
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Redis INCR error:', error.message);
      return null;
    }
  }

  /**
   * Operações de lista
   */
  async lpush(key, ...values) {
    if (!this.isConnected) return null;
    
    try {
      const serializedValues = values.map(v => 
        typeof v === 'string' ? v : JSON.stringify(v)
      );
      const result = await this.client.lPush(key, serializedValues);
      this.metrics.commands++;
      return result;
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Redis LPUSH error:', error.message);
      return null;
    }
  }

  async lpop(key) {
    if (!this.isConnected) return null;
    
    try {
      const result = await this.client.lPop(key);
      this.metrics.commands++;
      
      if (result) {
        try {
          return JSON.parse(result);
        } catch {
          return result;
        }
      }
      return result;
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Redis LPOP error:', error.message);
      return null;
    }
  }

  /**
   * Publish/Subscribe
   */
  async publish(channel, message) {
    if (!this.isConnected) return false;
    
    try {
      const serializedMessage = typeof message === 'string' ? message : JSON.stringify(message);
      const result = await this.publisher.publish(channel, serializedMessage);
      return result > 0;
    } catch (error) {
      console.error('❌ Redis PUBLISH error:', error.message);
      return false;
    }
  }

  async subscribe(channel, callback) {
    if (!this.isConnected) return false;
    
    try {
      await this.subscriber.subscribe(channel, (message) => {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch {
          callback(message);
        }
      });
      return true;
    } catch (error) {
      console.error('❌ Redis SUBSCRIBE error:', error.message);
      return false;
    }
  }

  /**
   * Limpeza de cache com padrão
   */
  async clearPattern(pattern) {
    if (!this.isConnected) return 0;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      
      const result = await this.client.del(keys);
      return result;
    } catch (error) {
      console.error('❌ Redis CLEAR PATTERN error:', error.message);
      return 0;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      await this.client.ping();
      const responseTime = Date.now() - startTime;
      
      const info = await this.client.info();
      const memory = await this.client.info('memory');
      
      return {
        status: 'healthy',
        responseTime,
        connected: this.isConnected,
        metrics: this.metrics,
        info: this.parseRedisInfo(info),
        memory: this.parseRedisInfo(memory),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connected: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Parse info do Redis
   */
  parseRedisInfo(info) {
    const parsed = {};
    info.split('\r\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          parsed[key] = isNaN(value) ? value : parseFloat(value);
        }
      }
    });
    return parsed;
  }

  /**
   * Obter métricas de performance
   */
  getMetrics() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0 
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100 
      : 0;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      isConnected: this.isConnected
    };
  }

  /**
   * Fechar conexões
   */
  async disconnect() {
    try {
      if (this.client) await this.client.quit();
      if (this.subscriber) await this.subscriber.quit();
      if (this.publisher) await this.publisher.quit();
      
      this.isConnected = false;
      console.log('🔌 Redis: Todas as conexões fechadas');
    } catch (error) {
      console.error('❌ Erro ao fechar conexões Redis:', error.message);
    }
  }

  /**
   * Utility para sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obter cliente Redis
   */
  getClient() {
    return this.client;
  }

  /**
   * Obter subscriber
   */
  getSubscriber() {
    return this.subscriber;
  }

  /**
   * Obter publisher
   */
  getPublisher() {
    return this.publisher;
  }
}

// Instância singleton
const redisConfig = new RedisConfig();

module.exports = redisConfig;