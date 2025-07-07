const NotificationService = require('../services/NotificationService');
const NotificationPreference = require('../models/NotificationPreference');
const databaseConfig = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * Controlador de Notificações
 */
class NotificationController {
  constructor() {
    this.notificationService = new NotificationService();
    this.preferenceModel = null;
    this.initialized = false;
  }

  /**
   * Inicializar controlador
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.notificationService.initialize();
      const knex = await databaseConfig.getInstance();
      this.preferenceModel = new NotificationPreference(knex);
      this.initialized = true;
    } catch (error) {
      console.error('❌ Erro ao inicializar NotificationController:', error);
      throw error;
    }
  }

  /**
   * Listar notificações do usuário
   */
  getUserNotifications = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const userId = req.user?.id || req.params.userId;
      const {
        page = 1,
        limit = 20,
        unread_only = false,
        type = null,
        priority = null,
        include_archived = false
      } = req.query;

      const offset = (page - 1) * limit;

      const notifications = await this.notificationService.getUserNotifications(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        unread_only: unread_only === 'true',
        type,
        priority,
        include_archived: include_archived === 'true'
      });

      const unreadCount = await this.notificationService.getUnreadCount(userId);
      const stats = await this.notificationService.getStats(userId);

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: stats.total,
            pages: Math.ceil(stats.total / limit)
          },
          stats: {
            unread_count: unreadCount,
            ...stats
          }
        }
      });

    } catch (error) {
      console.error('❌ Erro ao buscar notificações:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Buscar notificação específica
   */
  getNotification = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const userId = req.user?.id;
      const { id } = req.params;

      const notification = await this.notificationService.notificationModel.findById(id, userId);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notificação não encontrada'
        });
      }

      res.json({
        success: true,
        data: notification
      });

    } catch (error) {
      console.error('❌ Erro ao buscar notificação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Criar nova notificação
   */
  createNotification = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      // Validar dados
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: errors.array()
        });
      }

      const {
        user_id,
        user_ids,
        notification_type,
        title,
        message,
        data,
        source_module,
        source_entity,
        source_entity_id,
        priority,
        channels,
        delay,
        expires_at,
        action_url,
        action_label
      } = req.body;

      const notifications = await this.notificationService.createNotification({
        user_id,
        user_ids,
        notification_type,
        title,
        message,
        data,
        source_module,
        source_entity,
        source_entity_id,
        priority,
        channels,
        delay,
        expires_at,
        action_url,
        action_label
      });

      res.status(201).json({
        success: true,
        data: notifications,
        message: `${notifications.length} notificação(ões) criada(s) com sucesso`
      });

    } catch (error) {
      console.error('❌ Erro ao criar notificação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Marcar notificação como lida
   */
  markAsRead = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const userId = req.user?.id;
      const { id } = req.params;

      await this.notificationService.markAsRead(id, userId);

      res.json({
        success: true,
        message: 'Notificação marcada como lida'
      });

    } catch (error) {
      console.error('❌ Erro ao marcar notificação como lida:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Marcar todas as notificações como lidas
   */
  markAllAsRead = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const userId = req.user?.id;

      await this.notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'Todas as notificações foram marcadas como lidas'
      });

    } catch (error) {
      console.error('❌ Erro ao marcar todas as notificações como lidas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Arquivar notificação
   */
  archiveNotification = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const userId = req.user?.id;
      const { id } = req.params;

      await this.notificationService.archiveNotification(id, userId);

      res.json({
        success: true,
        message: 'Notificação arquivada com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao arquivar notificação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Excluir notificação
   */
  deleteNotification = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const userId = req.user?.id;
      const { id } = req.params;

      await this.notificationService.notificationModel.delete(id, userId);

      res.json({
        success: true,
        message: 'Notificação excluída com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao excluir notificação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Obter contagem de notificações não lidas
   */
  getUnreadCount = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const userId = req.user?.id;

      const count = await this.notificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: {
          unread_count: count
        }
      });

    } catch (error) {
      console.error('❌ Erro ao obter contagem de não lidas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Obter estatísticas de notificações
   */
  getStats = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const userId = req.user?.id;

      const stats = await this.notificationService.getStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Buscar preferências de notificação
   */
  getPreferences = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const userId = req.user?.id;

      const preferences = await this.preferenceModel.findByUser(userId);

      res.json({
        success: true,
        data: preferences
      });

    } catch (error) {
      console.error('❌ Erro ao buscar preferências:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Atualizar preferências de notificação
   */
  updatePreferences = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const userId = req.user?.id;
      const { preferences } = req.body;

      if (!Array.isArray(preferences)) {
        return res.status(400).json({
          success: false,
          error: 'Formato inválido de preferências'
        });
      }

      await this.preferenceModel.updateBulk(userId, preferences);

      res.json({
        success: true,
        message: 'Preferências atualizadas com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao atualizar preferências:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Buscar tipos de notificação disponíveis
   */
  getNotificationTypes = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const knex = await databaseConfig.getInstance();
      const types = await knex('notification_types')
        .where('is_active', true)
        .orderBy('display_name');

      res.json({
        success: true,
        data: types
      });

    } catch (error) {
      console.error('❌ Erro ao buscar tipos de notificação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Buscar canais de notificação disponíveis
   */
  getNotificationChannels = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const knex = await databaseConfig.getInstance();
      const channels = await knex('notification_channels')
        .where('is_active', true)
        .orderBy('display_name');

      res.json({
        success: true,
        data: channels
      });

    } catch (error) {
      console.error('❌ Erro ao buscar canais de notificação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Buscar combinações disponíveis de preferências
   */
  getAvailablePreferences = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const combinations = await this.preferenceModel.getAvailablePreferences();

      res.json({
        success: true,
        data: combinations
      });

    } catch (error) {
      console.error('❌ Erro ao buscar combinações disponíveis:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Criar preferências padrão para usuário
   */
  createDefaultPreferences = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const userId = req.user?.id;

      const preferences = await this.preferenceModel.createDefaultPreferences(userId);

      res.json({
        success: true,
        data: preferences,
        message: 'Preferências padrão criadas com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao criar preferências padrão:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Resetar preferências para os padrões
   */
  resetPreferences = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const userId = req.user?.id;

      await this.preferenceModel.resetToDefaults(userId);

      res.json({
        success: true,
        message: 'Preferências resetadas para os padrões'
      });

    } catch (error) {
      console.error('❌ Erro ao resetar preferências:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Obter resumo das preferências
   */
  getPreferencesSummary = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const userId = req.user?.id;

      const summary = await this.preferenceModel.getPreferencesSummary(userId);

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('❌ Erro ao obter resumo das preferências:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Testar envio de notificação
   */
  testNotification = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const userId = req.user?.id;
      const { type = 'email', message = 'Teste de notificação' } = req.body;

      const notification = await this.notificationService.createNotification({
        user_id: userId,
        notification_type: 'general',
        title: 'Teste de Notificação',
        message,
        priority: 'low',
        channels: [type],
        data: {
          test: true,
          timestamp: new Date()
        }
      });

      res.json({
        success: true,
        data: notification,
        message: 'Notificação de teste enviada com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao testar notificação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Limpar notificações expiradas
   */
  cleanExpired = async (req, res) => {
    try {
      if (!this.initialized) await this.initialize();

      const deleted = await this.notificationService.cleanExpiredNotifications();

      res.json({
        success: true,
        data: {
          deleted_count: deleted
        },
        message: `${deleted} notificações expiradas removidas`
      });

    } catch (error) {
      console.error('❌ Erro ao limpar notificações expiradas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }
}

module.exports = NotificationController;