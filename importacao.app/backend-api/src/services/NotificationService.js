const Redis = require('ioredis');
const EventEmitter = require('events');
const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const EmailService = require('./EmailService');
const databaseConfig = require('../config/database');

/**
 * Serviço principal de notificações
 */
class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.knex = null;
    this.notificationModel = null;
    this.preferenceModel = null;
    this.emailService = null;
    this.initialized = false;
    this.channels = new Map();
    this.processors = new Map();
    this.retryConfig = {
      attempts: 3,
      delay: 1000,
      backoff: 'exponential'
    };
  }

  /**
   * Inicializar serviço
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Inicializar Redis
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      await this.redis.connect();

      // Inicializar banco de dados
      this.knex = await databaseConfig.initialize();
      this.notificationModel = new Notification(this.knex);
      this.preferenceModel = new NotificationPreference(this.knex);

      // Inicializar serviços de canal
      this.emailService = new EmailService();
      await this.emailService.initialize();

      // Registrar canais de notificação
      this.registerChannels();

      // Configurar processadores
      this.setupProcessors();

      this.initialized = true;
      console.log('✅ Serviço de notificações inicializado');

    } catch (error) {
      console.error('❌ Erro ao inicializar serviço de notificações:', error);
      throw error;
    }
  }

  /**
   * Registrar canais de notificação
   */
  registerChannels() {
    // Canal In-App
    this.channels.set('in_app', {
      name: 'in_app',
      process: this.processInAppNotification.bind(this)
    });

    // Canal Email
    this.channels.set('email', {
      name: 'email',
      process: this.processEmailNotification.bind(this)
    });

    // Canal Push
    this.channels.set('push', {
      name: 'push',
      process: this.processPushNotification.bind(this)
    });

    // Canal SMS
    this.channels.set('sms', {
      name: 'sms',
      process: this.processSMSNotification.bind(this)
    });

    // Canal Webhook
    this.channels.set('webhook', {
      name: 'webhook',
      process: this.processWebhookNotification.bind(this)
    });
  }

  /**
   * Configurar processadores de fila
   */
  setupProcessors() {
    // Processador para notificações imediatas
    this.processors.set('immediate', setInterval(() => {
      this.processQueue('notifications:immediate');
    }, 1000));

    // Processador para notificações com delay
    this.processors.set('delayed', setInterval(() => {
      this.processQueue('notifications:delayed');
    }, 5000));

    // Processador para retry de notificações falhadas
    this.processors.set('retry', setInterval(() => {
      this.processRetryQueue();
    }, 30000));
  }

  /**
   * Criar notificação
   */
  async createNotification(notificationData) {
    const {
      user_id,
      user_ids = [],
      notification_type,
      title,
      message,
      data = {},
      source_module,
      source_entity,
      source_entity_id,
      priority = 'medium',
      channels = ['in_app'],
      delay = 0,
      expires_at,
      action_url,
      action_label
    } = notificationData;

    try {
      // Validar dados obrigatórios
      if (!title || !message) {
        throw new Error('Título e mensagem são obrigatórios');
      }

      // Buscar tipo de notificação
      const notificationType = await this.knex('notification_types')
        .where('name', notification_type)
        .first();

      if (!notificationType) {
        throw new Error(`Tipo de notificação '${notification_type}' não encontrado`);
      }

      // Determinar usuários destinatários
      const recipients = user_id ? [user_id] : user_ids;
      
      if (recipients.length === 0) {
        throw new Error('Nenhum usuário destinatário especificado');
      }

      const createdNotifications = [];

      // Criar notificação para cada usuário
      for (const userId of recipients) {
        const notification = await this.notificationModel.create({
          user_id: userId,
          notification_type_id: notificationType.id,
          title,
          message,
          data,
          source_module,
          source_entity,
          source_entity_id,
          priority,
          expires_at,
          action_url,
          action_label
        });

        createdNotifications.push(notification);

        // Enfileirar para processamento nos canais
        await this.enqueueNotification(notification, channels, delay);
      }

      // Emitir evento de notificação criada
      this.emit('notification_created', {
        notifications: createdNotifications,
        channels,
        delay
      });

      return createdNotifications;

    } catch (error) {
      console.error('❌ Erro ao criar notificação:', error);
      throw error;
    }
  }

  /**
   * Enfileirar notificação para processamento
   */
  async enqueueNotification(notification, channels, delay = 0) {
    const queueName = delay > 0 ? 'notifications:delayed' : 'notifications:immediate';
    
    const queueItem = {
      notification_id: notification.id,
      user_id: notification.user_id,
      channels,
      created_at: new Date(),
      process_at: new Date(Date.now() + delay * 1000)
    };

    await this.redis.lpush(queueName, JSON.stringify(queueItem));
  }

  /**
   * Processar fila de notificações
   */
  async processQueue(queueName) {
    try {
      const item = await this.redis.brpop(queueName, 1);
      
      if (!item) return;

      const queueItem = JSON.parse(item[1]);
      const now = new Date();

      // Verificar se é hora de processar
      if (queueItem.process_at && new Date(queueItem.process_at) > now) {
        // Recolocar na fila
        await this.redis.lpush(queueName, JSON.stringify(queueItem));
        return;
      }

      // Buscar notificação completa
      const notification = await this.notificationModel.findById(queueItem.notification_id);
      
      if (!notification) {
        console.warn(`Notificação ${queueItem.notification_id} não encontrada`);
        return;
      }

      // Processar canais
      await this.processNotificationChannels(notification, queueItem.channels);

    } catch (error) {
      console.error('❌ Erro ao processar fila:', error);
    }
  }

  /**
   * Processar notificação nos canais especificados
   */
  async processNotificationChannels(notification, channels) {
    for (const channelName of channels) {
      try {
        // Verificar se usuário tem canal habilitado
        const isEnabled = await this.preferenceModel.isEnabled(
          notification.user_id,
          notification.notification_type_id,
          await this.getChannelId(channelName)
        );

        if (!isEnabled) {
          console.log(`Canal ${channelName} desabilitado para usuário ${notification.user_id}`);
          continue;
        }

        // Processar canal
        const channel = this.channels.get(channelName);
        if (channel) {
          await channel.process(notification);
        } else {
          console.warn(`Canal ${channelName} não encontrado`);
        }

      } catch (error) {
        console.error(`❌ Erro ao processar canal ${channelName}:`, error);
        
        // Enfileirar para retry
        await this.enqueueForRetry(notification, channelName, error.message);
      }
    }
  }

  /**
   * Processar notificação in-app
   */
  async processInAppNotification(notification) {
    try {
      // Armazenar no Redis para recuperação rápida
      const cacheKey = `user:${notification.user_id}:notifications`;
      await this.redis.lpush(cacheKey, JSON.stringify(notification));
      await this.redis.expire(cacheKey, 3600); // Expira em 1 hora

      // Emitir evento para WebSocket
      this.emit('notification_in_app', notification);

      // Registrar entrega
      await this.recordDelivery(notification.id, 'in_app', 'delivered', {
        recipient: `user_${notification.user_id}`,
        delivered_at: new Date()
      });

      console.log(`📱 Notificação in-app enviada para usuário ${notification.user_id}`);

    } catch (error) {
      console.error('❌ Erro ao processar notificação in-app:', error);
      throw error;
    }
  }

  /**
   * Processar notificação por email
   */
  async processEmailNotification(notification) {
    try {
      // Buscar dados do usuário (assumindo que existe uma função para isso)
      const user = await this.getUserById(notification.user_id);
      
      if (!user || !user.email) {
        throw new Error('Usuário não encontrado ou sem email');
      }

      // Buscar template de email
      const template = await this.getEmailTemplate(notification.notification_type_id);
      
      // Preparar dados para o template
      const templateData = {
        user_name: user.name,
        notification_title: notification.title,
        notification_message: notification.message,
        notification_data: notification.data,
        action_url: notification.action_url,
        action_label: notification.action_label,
        unsubscribe_url: `${process.env.FRONTEND_URL}/notifications/unsubscribe/${user.id}`
      };

      // Enviar email
      await this.emailService.sendNotification(
        user.email,
        template ? template.subject : notification.title,
        template ? template.body_template : notification.message,
        templateData
      );

      // Registrar entrega
      await this.recordDelivery(notification.id, 'email', 'sent', {
        recipient: user.email,
        sent_at: new Date()
      });

      console.log(`📧 Email enviado para ${user.email}`);

    } catch (error) {
      console.error('❌ Erro ao processar notificação por email:', error);
      throw error;
    }
  }

  /**
   * Processar notificação push
   */
  async processPushNotification(notification) {
    try {
      // Implementar integração com serviço push (Firebase, etc.)
      console.log(`🔔 Push notification seria enviada para usuário ${notification.user_id}`);
      
      // Registrar como enviada (placeholder)
      await this.recordDelivery(notification.id, 'push', 'sent', {
        recipient: `user_${notification.user_id}`,
        sent_at: new Date()
      });

    } catch (error) {
      console.error('❌ Erro ao processar push notification:', error);
      throw error;
    }
  }

  /**
   * Processar notificação SMS
   */
  async processSMSNotification(notification) {
    try {
      // Implementar integração com serviço SMS
      console.log(`📱 SMS seria enviado para usuário ${notification.user_id}`);
      
      // Registrar como enviada (placeholder)
      await this.recordDelivery(notification.id, 'sms', 'sent', {
        recipient: `user_${notification.user_id}`,
        sent_at: new Date()
      });

    } catch (error) {
      console.error('❌ Erro ao processar SMS:', error);
      throw error;
    }
  }

  /**
   * Processar notificação webhook
   */
  async processWebhookNotification(notification) {
    try {
      // Implementar webhook
      console.log(`🔗 Webhook seria enviado para usuário ${notification.user_id}`);
      
      // Registrar como enviada (placeholder)
      await this.recordDelivery(notification.id, 'webhook', 'sent', {
        recipient: `user_${notification.user_id}`,
        sent_at: new Date()
      });

    } catch (error) {
      console.error('❌ Erro ao processar webhook:', error);
      throw error;
    }
  }

  /**
   * Registrar entrega de notificação
   */
  async recordDelivery(notificationId, channelName, status, metadata = {}) {
    const channelId = await this.getChannelId(channelName);
    
    if (!channelId) {
      throw new Error(`Canal ${channelName} não encontrado`);
    }

    await this.knex('notification_deliveries').insert({
      notification_id: notificationId,
      channel_id: channelId,
      status,
      recipient: metadata.recipient,
      metadata: JSON.stringify(metadata),
      sent_at: metadata.sent_at,
      delivered_at: metadata.delivered_at,
      failed_at: metadata.failed_at,
      error_message: metadata.error_message,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  /**
   * Obter ID do canal por nome
   */
  async getChannelId(channelName) {
    const channel = await this.knex('notification_channels')
      .where('name', channelName)
      .first();
    
    return channel ? channel.id : null;
  }

  /**
   * Obter usuário por ID
   */
  async getUserById(userId) {
    // Implementar busca de usuário no banco
    // Por enquanto, retorna dados mock
    return {
      id: userId,
      name: 'Usuário Teste',
      email: 'teste@exemplo.com'
    };
  }

  /**
   * Obter template de email
   */
  async getEmailTemplate(notificationTypeId) {
    const template = await this.knex('notification_templates')
      .where('notification_type_id', notificationTypeId)
      .where('channel_id', await this.getChannelId('email'))
      .where('is_active', true)
      .first();

    return template;
  }

  /**
   * Enfileirar para retry
   */
  async enqueueForRetry(notification, channelName, errorMessage) {
    const retryItem = {
      notification_id: notification.id,
      channel: channelName,
      error: errorMessage,
      attempts: 0,
      created_at: new Date()
    };

    await this.redis.lpush('notifications:retry', JSON.stringify(retryItem));
  }

  /**
   * Processar fila de retry
   */
  async processRetryQueue() {
    try {
      const item = await this.redis.brpop('notifications:retry', 1);
      
      if (!item) return;

      const retryItem = JSON.parse(item[1]);
      
      if (retryItem.attempts >= this.retryConfig.attempts) {
        console.log(`❌ Máximo de tentativas excedido para notificação ${retryItem.notification_id}`);
        return;
      }

      // Incrementar tentativas
      retryItem.attempts++;
      
      // Calcular delay
      const delay = this.retryConfig.delay * Math.pow(2, retryItem.attempts - 1);
      
      // Buscar notificação
      const notification = await this.notificationModel.findById(retryItem.notification_id);
      
      if (notification) {
        // Esperar delay e tentar novamente
        setTimeout(async () => {
          try {
            await this.processNotificationChannels(notification, [retryItem.channel]);
          } catch (error) {
            // Recolocar na fila de retry
            await this.redis.lpush('notifications:retry', JSON.stringify(retryItem));
          }
        }, delay);
      }

    } catch (error) {
      console.error('❌ Erro ao processar fila de retry:', error);
    }
  }

  /**
   * Buscar notificações do usuário
   */
  async getUserNotifications(userId, options = {}) {
    return this.notificationModel.findByUser(userId, options);
  }

  /**
   * Contar notificações não lidas
   */
  async getUnreadCount(userId) {
    return this.notificationModel.countUnread(userId);
  }

  /**
   * Marcar como lida
   */
  async markAsRead(notificationId, userId) {
    await this.notificationModel.markAsRead(notificationId, userId);
    
    // Emitir evento
    this.emit('notification_read', { notificationId, userId });
  }

  /**
   * Marcar todas como lidas
   */
  async markAllAsRead(userId) {
    await this.notificationModel.markAllAsRead(userId);
    
    // Emitir evento
    this.emit('all_notifications_read', { userId });
  }

  /**
   * Arquivar notificação
   */
  async archiveNotification(notificationId, userId) {
    await this.notificationModel.archive(notificationId, userId);
    
    // Emitir evento
    this.emit('notification_archived', { notificationId, userId });
  }

  /**
   * Limpar notificações expiradas
   */
  async cleanExpiredNotifications() {
    const deleted = await this.notificationModel.cleanExpired();
    console.log(`🗑️ ${deleted} notificações expiradas removidas`);
    return deleted;
  }

  /**
   * Obter estatísticas
   */
  async getStats(userId) {
    return this.notificationModel.getStats(userId);
  }

  /**
   * Encerrar serviço
   */
  async shutdown() {
    // Limpar processadores
    for (const processor of this.processors.values()) {
      clearInterval(processor);
    }

    // Fechar conexões
    if (this.redis) {
      await this.redis.quit();
    }

    if (this.knex) {
      await this.knex.destroy();
    }

    console.log('🔌 Serviço de notificações encerrado');
  }
}

module.exports = NotificationService;