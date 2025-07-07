/**
 * Módulo de Notificações (NOT)
 * Sistema completo de notificações e alertas para ERP
 */

const express = require('express');
const NotificationService = require('../../src/services/NotificationService');
const AlertService = require('../../src/services/AlertService');
const SocketService = require('../../src/services/SocketService');
const EmailService = require('../../src/services/EmailService');
const NotificationController = require('../../src/controllers/NotificationController');
const notificationRoutes = require('../../src/routes/notifications');
const notificationMiddleware = require('../../src/middleware/notifications');

class NotificationModule {
  constructor() {
    this.name = 'not';
    this.displayName = 'Notificações';
    this.version = '1.0.0';
    this.description = 'Sistema completo de notificações e alertas';
    
    // Serviços
    this.notificationService = new NotificationService();
    this.alertService = new AlertService();
    this.socketService = new SocketService();
    this.emailService = new EmailService();
    
    // Controller
    this.controller = new NotificationController();
    
    // Estado
    this.initialized = false;
    this.status = 'stopped';
  }

  /**
   * Inicializar módulo
   */
  async initialize(app, httpServer) {
    if (this.initialized) return;

    try {
      console.log('🔔 Inicializando módulo de notificações...');

      // Inicializar serviços
      await this.notificationService.initialize();
      await this.alertService.initialize();
      await this.emailService.initialize();
      
      // Inicializar Socket.IO se servidor HTTP fornecido
      if (httpServer) {
        this.socketService.initialize(httpServer);
        this.setupSocketIntegration();
      }

      // Configurar rotas
      this.setupRoutes(app);

      // Configurar middleware para módulos ERP
      this.setupModuleIntegrations(app);

      // Configurar eventos entre serviços
      this.setupServiceIntegration();

      this.initialized = true;
      this.status = 'running';
      
      console.log('✅ Módulo de notificações inicializado com sucesso');

    } catch (error) {
      console.error('❌ Erro ao inicializar módulo de notificações:', error);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Configurar rotas do módulo
   */
  setupRoutes(app) {
    // Rotas principais de notificações
    app.use('/api/notifications', notificationRoutes);

    // Rota de informações do módulo
    app.get('/api/notifications/module/info', (req, res) => {
      res.json({
        success: true,
        data: {
          name: this.name,
          displayName: this.displayName,
          version: this.version,
          description: this.description,
          status: this.status,
          initialized: this.initialized,
          features: [
            'Notificações em tempo real',
            'Sistema de alertas automáticos',
            'Notificações por email',
            'Preferências personalizáveis',
            'Integração com todos os módulos ERP',
            'Histórico e arquivo',
            'Push notifications',
            'Webhooks'
          ],
          services: {
            notification: this.notificationService.initialized,
            alert: this.alertService.initialized,
            socket: this.socketService.initialized,
            email: this.emailService.initialized
          }
        }
      });
    });

    // Rota de status do módulo
    app.get('/api/notifications/module/status', async (req, res) => {
      try {
        const stats = await this.getModuleStats();
        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Erro ao obter status do módulo',
          message: error.message
        });
      }
    });

    // Rota de saúde do módulo
    app.get('/api/notifications/module/health', async (req, res) => {
      try {
        const health = await this.checkHealth();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        
        res.status(statusCode).json({
          success: health.status === 'healthy',
          data: health
        });
      } catch (error) {
        res.status(503).json({
          success: false,
          error: 'Erro no health check',
          message: error.message
        });
      }
    });
  }

  /**
   * Configurar integrações com módulos ERP
   */
  setupModuleIntegrations(app) {
    const middleware = notificationMiddleware.getMiddleware();

    // Integração com módulo de estoque (EST)
    app.use('/api/est/*', middleware.stock);

    // Integração com módulo de vendas (VND)
    app.use('/api/vnd/*', middleware.sales);

    // Integração com módulo de produção (PRD)
    app.use('/api/prd/*', middleware.production);

    // Integração com módulo fiscal (FIS)
    app.use('/api/fis/*', middleware.financial);

    // Integração com módulo de importação (IMP)
    app.use('/api/imp/*', middleware.import);

    console.log('🔌 Integrações com módulos ERP configuradas');
  }

  /**
   * Configurar integração entre serviços
   */
  setupServiceIntegration() {
    // Integrar NotificationService com SocketService
    this.notificationService.on('notification_in_app', (notification) => {
      this.socketService.sendNotificationToUser(notification.user_id, notification);
    });

    this.notificationService.on('notification_created', (data) => {
      // Emitir evento para Socket.IO
      data.notifications.forEach(notification => {
        this.socketService.sendNotificationToUser(notification.user_id, notification);
      });
    });

    this.notificationService.on('notification_read', (data) => {
      // Atualizar contadores em tempo real
      this.socketService.emitToUser(data.userId, 'notification_read', data);
    });

    this.notificationService.on('all_notifications_read', (data) => {
      // Atualizar contadores em tempo real
      this.socketService.emitToUser(data.userId, 'all_notifications_read', data);
    });

    // Integrar AlertService com NotificationService
    this.alertService.on('alert_triggered', (data) => {
      // Propagar alertas para Socket.IO
      this.socketService.handleAlertTriggered(data);
    });

    console.log('🔗 Integração entre serviços configurada');
  }

  /**
   * Configurar integração com Socket.IO
   */
  setupSocketIntegration() {
    // Eventos do NotificationService para Socket.IO
    this.notificationService.on('notification_in_app', (notification) => {
      this.socketService.sendNotificationToUser(notification.user_id, notification);
    });

    console.log('📡 Integração com Socket.IO configurada');
  }

  /**
   * Obter estatísticas do módulo
   */
  async getModuleStats() {
    try {
      const stats = {
        module: {
          name: this.name,
          status: this.status,
          uptime: process.uptime()
        },
        services: {
          notification: this.notificationService.initialized,
          alert: this.alertService.initialized,
          socket: this.socketService.initialized,
          email: this.emailService.initialized
        }
      };

      // Estatísticas do serviço de notificações
      if (this.notificationService.initialized) {
        // stats.notifications = await this.notificationService.getStats();
      }

      // Estatísticas do serviço de alertas
      if (this.alertService.initialized) {
        stats.alerts = await this.alertService.getAlertStats();
      }

      // Estatísticas do Socket.IO
      if (this.socketService.initialized) {
        stats.realtime = this.socketService.getServiceStats();
      }

      return stats;

    } catch (error) {
      console.error('❌ Erro ao obter estatísticas do módulo:', error);
      throw error;
    }
  }

  /**
   * Verificar saúde do módulo
   */
  async checkHealth() {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {}
      };

      // Verificar serviços
      health.services.notification = this.notificationService.initialized ? 'healthy' : 'unhealthy';
      health.services.alert = this.alertService.initialized ? 'healthy' : 'unhealthy';
      health.services.socket = this.socketService.initialized ? 'healthy' : 'unhealthy';
      health.services.email = this.emailService.initialized ? 'healthy' : 'unhealthy';

      // Verificar se algum serviço está com problema
      const unhealthyServices = Object.values(health.services).filter(status => status === 'unhealthy');
      
      if (unhealthyServices.length > 0) {
        health.status = 'degraded';
      }

      if (!this.initialized) {
        health.status = 'unhealthy';
      }

      return health;

    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * API pública para outros módulos
   */
  getPublicAPI() {
    return {
      // Criar notificação
      createNotification: async (data) => {
        return this.notificationService.createNotification(data);
      },

      // Disparar alerta
      triggerAlert: async (alertType, data, options = {}) => {
        return this.alertService.triggerAlert(alertType, data, options);
      },

      // Enviar email
      sendEmail: async (to, subject, template, data = {}) => {
        return this.emailService.sendNotification(to, subject, template, data);
      },

      // Enviar notificação em tempo real
      sendRealTimeNotification: async (userId, notification) => {
        return this.socketService.sendNotificationToUser(userId, notification);
      },

      // Verificar se usuário está conectado
      isUserConnected: (userId) => {
        return this.socketService.isUserConnected(userId);
      },

      // Obter usuários conectados
      getConnectedUsers: () => {
        return this.socketService.getConnectedUsers();
      }
    };
  }

  /**
   * Configurar integração com outros módulos
   */
  integrateWithModule(moduleName, moduleAPI) {
    console.log(`🔗 Integrando com módulo ${moduleName}`);
    
    // Configurações específicas por módulo podem ser adicionadas aqui
    switch (moduleName) {
      case 'est':
        this.setupStockIntegration(moduleAPI);
        break;
      case 'vnd':
        this.setupSalesIntegration(moduleAPI);
        break;
      case 'prd':
        this.setupProductionIntegration(moduleAPI);
        break;
      case 'fis':
        this.setupFinancialIntegration(moduleAPI);
        break;
      default:
        console.log(`Integração padrão configurada para ${moduleName}`);
    }
  }

  /**
   * Configurar integração específica com estoque
   */
  setupStockIntegration(stockAPI) {
    // Configurações específicas para módulo de estoque
    console.log('📦 Integração com módulo de estoque configurada');
  }

  /**
   * Configurar integração específica com vendas
   */
  setupSalesIntegration(salesAPI) {
    // Configurações específicas para módulo de vendas
    console.log('💰 Integração com módulo de vendas configurada');
  }

  /**
   * Configurar integração específica com produção
   */
  setupProductionIntegration(productionAPI) {
    // Configurações específicas para módulo de produção
    console.log('🏭 Integração com módulo de produção configurada');
  }

  /**
   * Configurar integração específica com financeiro
   */
  setupFinancialIntegration(financialAPI) {
    // Configurações específicas para módulo financeiro
    console.log('💳 Integração com módulo financeiro configurada');
  }

  /**
   * Parar módulo
   */
  async stop() {
    try {
      console.log('🔔 Parando módulo de notificações...');

      // Parar serviços
      if (this.alertService.initialized) {
        await this.alertService.shutdown();
      }

      if (this.socketService.initialized) {
        await this.socketService.shutdown();
      }

      if (this.notificationService.initialized) {
        await this.notificationService.shutdown();
      }

      this.status = 'stopped';
      this.initialized = false;

      console.log('✅ Módulo de notificações parado');

    } catch (error) {
      console.error('❌ Erro ao parar módulo de notificações:', error);
      throw error;
    }
  }

  /**
   * Obter informações do módulo
   */
  getModuleInfo() {
    return {
      name: this.name,
      displayName: this.displayName,
      version: this.version,
      description: this.description,
      status: this.status,
      initialized: this.initialized,
      dependencies: [
        'express',
        'socket.io',
        'ioredis',
        'nodemailer',
        'node-cron'
      ],
      routes: [
        '/api/notifications',
        '/api/notifications/module/info',
        '/api/notifications/module/status',
        '/api/notifications/module/health'
      ],
      integrations: [
        'est', 'vnd', 'prd', 'fis', 'imp', 'cmp', 'log', 'cad'
      ]
    };
  }
}

// Instância singleton do módulo
const notificationModule = new NotificationModule();

module.exports = notificationModule;