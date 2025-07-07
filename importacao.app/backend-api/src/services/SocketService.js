const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');

/**
 * Serviço de WebSocket para notificações em tempo real
 */
class SocketService {
  constructor() {
    this.io = null;
    this.redis = null;
    this.connectedUsers = new Map();
    this.userSockets = new Map();
    this.initialized = false;
  }

  /**
   * Inicializar serviço de Socket.IO
   */
  initialize(httpServer) {
    if (this.initialized) return;

    try {
      // Configurar Socket.IO
      this.io = socketIo(httpServer, {
        cors: {
          origin: [
            'http://localhost:3000',
            'https://plataforma.app',
            'https://www.plataforma.app',
            'https://importacao.app',
            'https://www.importacao.app'
          ],
          methods: ['GET', 'POST'],
          credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
      });

      // Configurar Redis para pub/sub
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: process.env.REDIS_DB || 0
      });

      // Configurar middleware de autenticação
      this.setupAuthentication();

      // Configurar handlers de eventos
      this.setupEventHandlers();

      // Configurar pub/sub para notificações
      this.setupNotificationPubSub();

      this.initialized = true;
      console.log('✅ Serviço de Socket.IO inicializado');

    } catch (error) {
      console.error('❌ Erro ao inicializar Socket.IO:', error);
      throw error;
    }
  }

  /**
   * Configurar middleware de autenticação
   */
  setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Token de autenticação não fornecido'));
        }

        // Verificar token JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar dados do usuário (implementar conforme necessário)
        const user = await this.getUserById(decoded.id);
        
        if (!user) {
          return next(new Error('Usuário não encontrado'));
        }

        socket.userId = user.id;
        socket.userRole = user.role;
        socket.userData = user;

        next();

      } catch (error) {
        console.error('❌ Erro na autenticação Socket.IO:', error);
        next(new Error('Token inválido'));
      }
    });
  }

  /**
   * Configurar handlers de eventos
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Usuário conectado: ${socket.userId}`);

      // Registrar usuário conectado
      this.registerUser(socket);

      // Entrar em salas específicas
      this.joinUserRooms(socket);

      // Handlers de eventos do cliente
      socket.on('mark_notification_read', (data) => {
        this.handleMarkNotificationRead(socket, data);
      });

      socket.on('mark_all_notifications_read', () => {
        this.handleMarkAllNotificationsRead(socket);
      });

      socket.on('subscribe_to_alerts', (data) => {
        this.handleSubscribeToAlerts(socket, data);
      });

      socket.on('unsubscribe_from_alerts', (data) => {
        this.handleUnsubscribeFromAlerts(socket, data);
      });

      socket.on('get_notification_stats', () => {
        this.handleGetNotificationStats(socket);
      });

      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });

      // Handler de desconexão
      socket.on('disconnect', () => {
        console.log(`🔌 Usuário desconectado: ${socket.userId}`);
        this.unregisterUser(socket);
      });

      // Enviar notificações pendentes
      this.sendPendingNotifications(socket);
    });
  }

  /**
   * Configurar pub/sub para notificações
   */
  setupNotificationPubSub() {
    const subscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: process.env.REDIS_DB || 0
    });

    // Subscrever canais de notificação
    subscriber.subscribe('notifications:new');
    subscriber.subscribe('notifications:read');
    subscriber.subscribe('notifications:archived');
    subscriber.subscribe('alerts:triggered');

    subscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        this.handleNotificationEvent(channel, data);
      } catch (error) {
        console.error('❌ Erro ao processar mensagem do Redis:', error);
      }
    });
  }

  /**
   * Registrar usuário conectado
   */
  registerUser(socket) {
    const userId = socket.userId;
    
    // Armazenar socket do usuário
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket);

    // Armazenar dados do usuário
    this.connectedUsers.set(userId, {
      id: userId,
      role: socket.userRole,
      connectedAt: new Date(),
      lastActivity: new Date(),
      socketCount: this.userSockets.get(userId).size
    });

    // Emitir evento de conexão
    this.emitToUser(userId, 'user_connected', {
      userId,
      connectedAt: new Date(),
      socketCount: this.userSockets.get(userId).size
    });
  }

  /**
   * Desregistrar usuário
   */
  unregisterUser(socket) {
    const userId = socket.userId;
    
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socket);
      
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
        this.connectedUsers.delete(userId);
      } else {
        // Atualizar contagem de sockets
        const userData = this.connectedUsers.get(userId);
        if (userData) {
          userData.socketCount = this.userSockets.get(userId).size;
          this.connectedUsers.set(userId, userData);
        }
      }
    }
  }

  /**
   * Entrar em salas específicas
   */
  joinUserRooms(socket) {
    const userId = socket.userId;
    const userRole = socket.userRole;

    // Sala específica do usuário
    socket.join(`user:${userId}`);

    // Sala por role
    if (userRole) {
      socket.join(`role:${userRole}`);
    }

    // Salas gerais
    socket.join('general');
    socket.join('system_alerts');
  }

  /**
   * Enviar notificação para usuário específico
   */
  async sendNotificationToUser(userId, notification) {
    try {
      // Verificar se usuário está conectado
      if (!this.connectedUsers.has(userId)) {
        console.log(`📱 Usuário ${userId} não conectado, armazenando notificação`);
        await this.storeOfflineNotification(userId, notification);
        return;
      }

      // Emitir notificação
      this.emitToUser(userId, 'new_notification', {
        notification,
        timestamp: new Date()
      });

      // Emitir atualização de contadores
      const stats = await this.getNotificationStats(userId);
      this.emitToUser(userId, 'notification_stats_updated', stats);

      console.log(`📱 Notificação enviada para usuário ${userId}`);

    } catch (error) {
      console.error('❌ Erro ao enviar notificação:', error);
    }
  }

  /**
   * Enviar notificação para múltiplos usuários
   */
  async sendNotificationToUsers(userIds, notification) {
    const promises = userIds.map(userId => 
      this.sendNotificationToUser(userId, notification)
    );
    
    await Promise.all(promises);
  }

  /**
   * Enviar notificação para role específico
   */
  sendNotificationToRole(role, notification) {
    this.io.to(`role:${role}`).emit('new_notification', {
      notification,
      timestamp: new Date()
    });
  }

  /**
   * Enviar notificação broadcast
   */
  sendBroadcastNotification(notification) {
    this.io.emit('new_notification', {
      notification,
      timestamp: new Date()
    });
  }

  /**
   * Emitir evento para usuário específico
   */
  emitToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Handle mark notification as read
   */
  handleMarkNotificationRead(socket, data) {
    const { notificationId } = data;
    
    // Emitir para todas as conexões do usuário
    this.emitToUser(socket.userId, 'notification_read', {
      notificationId,
      userId: socket.userId,
      timestamp: new Date()
    });

    // Publicar evento no Redis
    this.redis.publish('notifications:read', JSON.stringify({
      userId: socket.userId,
      notificationId,
      timestamp: new Date()
    }));
  }

  /**
   * Handle mark all notifications as read
   */
  handleMarkAllNotificationsRead(socket) {
    // Emitir para todas as conexões do usuário
    this.emitToUser(socket.userId, 'all_notifications_read', {
      userId: socket.userId,
      timestamp: new Date()
    });

    // Publicar evento no Redis
    this.redis.publish('notifications:read', JSON.stringify({
      userId: socket.userId,
      all: true,
      timestamp: new Date()
    }));
  }

  /**
   * Handle subscribe to alerts
   */
  handleSubscribeToAlerts(socket, data) {
    const { alertTypes } = data;
    
    if (Array.isArray(alertTypes)) {
      alertTypes.forEach(alertType => {
        socket.join(`alert:${alertType}`);
      });
    }

    socket.emit('alert_subscription_updated', {
      subscribed: alertTypes,
      timestamp: new Date()
    });
  }

  /**
   * Handle unsubscribe from alerts
   */
  handleUnsubscribeFromAlerts(socket, data) {
    const { alertTypes } = data;
    
    if (Array.isArray(alertTypes)) {
      alertTypes.forEach(alertType => {
        socket.leave(`alert:${alertType}`);
      });
    }

    socket.emit('alert_subscription_updated', {
      unsubscribed: alertTypes,
      timestamp: new Date()
    });
  }

  /**
   * Handle get notification stats
   */
  async handleGetNotificationStats(socket) {
    try {
      const stats = await this.getNotificationStats(socket.userId);
      socket.emit('notification_stats', stats);
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      socket.emit('error', { message: 'Erro ao obter estatísticas' });
    }
  }

  /**
   * Processar eventos de notificação
   */
  handleNotificationEvent(channel, data) {
    switch (channel) {
      case 'notifications:new':
        this.handleNewNotification(data);
        break;
      case 'notifications:read':
        this.handleNotificationRead(data);
        break;
      case 'notifications:archived':
        this.handleNotificationArchived(data);
        break;
      case 'alerts:triggered':
        this.handleAlertTriggered(data);
        break;
      default:
        console.warn(`Canal não reconhecido: ${channel}`);
    }
  }

  /**
   * Handle new notification event
   */
  handleNewNotification(data) {
    const { notification, userId } = data;
    
    if (userId) {
      this.sendNotificationToUser(userId, notification);
    }
  }

  /**
   * Handle notification read event
   */
  handleNotificationRead(data) {
    const { userId, notificationId, all } = data;
    
    if (all) {
      this.emitToUser(userId, 'all_notifications_read', data);
    } else {
      this.emitToUser(userId, 'notification_read', data);
    }
  }

  /**
   * Handle notification archived event
   */
  handleNotificationArchived(data) {
    const { userId, notificationId } = data;
    
    this.emitToUser(userId, 'notification_archived', data);
  }

  /**
   * Handle alert triggered event
   */
  handleAlertTriggered(data) {
    const { alertType, notification, recipients } = data;
    
    // Enviar para sala específica do alert
    this.io.to(`alert:${alertType}`).emit('alert_triggered', {
      alertType,
      notification,
      timestamp: new Date()
    });

    // Enviar para usuários específicos se fornecidos
    if (recipients && Array.isArray(recipients)) {
      recipients.forEach(userId => {
        this.sendNotificationToUser(userId, notification);
      });
    }
  }

  /**
   * Enviar notificações pendentes
   */
  async sendPendingNotifications(socket) {
    try {
      const userId = socket.userId;
      
      // Buscar notificações offline armazenadas
      const offlineNotifications = await this.getOfflineNotifications(userId);
      
      if (offlineNotifications.length > 0) {
        socket.emit('pending_notifications', offlineNotifications);
        
        // Remover notificações offline após envio
        await this.clearOfflineNotifications(userId);
      }

      // Enviar estatísticas atuais
      const stats = await this.getNotificationStats(userId);
      socket.emit('notification_stats', stats);

    } catch (error) {
      console.error('❌ Erro ao enviar notificações pendentes:', error);
    }
  }

  /**
   * Armazenar notificação offline
   */
  async storeOfflineNotification(userId, notification) {
    const key = `offline_notifications:${userId}`;
    await this.redis.lpush(key, JSON.stringify(notification));
    await this.redis.expire(key, 86400); // 24 horas
  }

  /**
   * Obter notificações offline
   */
  async getOfflineNotifications(userId) {
    const key = `offline_notifications:${userId}`;
    const notifications = await this.redis.lrange(key, 0, -1);
    return notifications.map(n => JSON.parse(n));
  }

  /**
   * Limpar notificações offline
   */
  async clearOfflineNotifications(userId) {
    const key = `offline_notifications:${userId}`;
    await this.redis.del(key);
  }

  /**
   * Obter estatísticas de notificação
   */
  async getNotificationStats(userId) {
    // Implementar busca de estatísticas
    // Por enquanto, retorna dados mock
    return {
      unread_count: 0,
      total: 0,
      urgent_unread: 0,
      high_unread: 0
    };
  }

  /**
   * Obter usuário por ID
   */
  async getUserById(userId) {
    // Implementar busca de usuário
    // Por enquanto, retorna dados mock
    return {
      id: userId,
      name: 'Usuário Teste',
      email: 'teste@exemplo.com',
      role: 'user'
    };
  }

  /**
   * Obter usuários conectados
   */
  getConnectedUsers() {
    return Array.from(this.connectedUsers.values());
  }

  /**
   * Verificar se usuário está conectado
   */
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  /**
   * Obter contagem de usuários conectados
   */
  getConnectedUserCount() {
    return this.connectedUsers.size;
  }

  /**
   * Obter estatísticas do serviço
   */
  getServiceStats() {
    return {
      connected_users: this.getConnectedUserCount(),
      total_sockets: this.io.engine.clientsCount,
      rooms: Object.keys(this.io.sockets.adapter.rooms).length,
      uptime: process.uptime()
    };
  }

  /**
   * Encerrar serviço
   */
  async shutdown() {
    if (this.io) {
      this.io.close();
    }
    
    if (this.redis) {
      await this.redis.quit();
    }

    console.log('🔌 Serviço de Socket.IO encerrado');
  }
}

module.exports = SocketService;