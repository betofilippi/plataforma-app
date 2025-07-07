/**
 * Modelo de Notificação
 */
class Notification {
  constructor(knex) {
    this.knex = knex;
    this.tableName = 'notifications';
  }

  /**
   * Criar nova notificação
   */
  async create(notificationData) {
    const {
      user_id,
      notification_type_id,
      title,
      message,
      data = {},
      source_module,
      source_entity,
      source_entity_id,
      priority = 'medium',
      expires_at,
      action_url,
      action_label
    } = notificationData;

    const [notification] = await this.knex(this.tableName)
      .insert({
        user_id,
        notification_type_id,
        title,
        message,
        data: JSON.stringify(data),
        source_module,
        source_entity,
        source_entity_id,
        priority,
        expires_at,
        action_url,
        action_label,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    return notification;
  }

  /**
   * Buscar notificações por usuário
   */
  async findByUser(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      unread_only = false,
      type = null,
      priority = null,
      include_archived = false
    } = options;

    let query = this.knex(this.tableName)
      .select([
        'notifications.*',
        'notification_types.name as type_name',
        'notification_types.display_name as type_display_name',
        'notification_types.icon as type_icon',
        'notification_types.color as type_color'
      ])
      .leftJoin('notification_types', 'notifications.notification_type_id', 'notification_types.id')
      .where('notifications.user_id', userId)
      .orderBy('notifications.created_at', 'desc');

    if (unread_only) {
      query = query.where('notifications.is_read', false);
    }

    if (type) {
      query = query.where('notification_types.name', type);
    }

    if (priority) {
      query = query.where('notifications.priority', priority);
    }

    if (!include_archived) {
      query = query.where('notifications.is_archived', false);
    }

    // Filtrar notificações expiradas
    query = query.where(function() {
      this.whereNull('notifications.expires_at')
        .orWhere('notifications.expires_at', '>', new Date());
    });

    const notifications = await query
      .limit(limit)
      .offset(offset);

    return notifications.map(notification => ({
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : {}
    }));
  }

  /**
   * Contar notificações não lidas
   */
  async countUnread(userId) {
    const result = await this.knex(this.tableName)
      .count('id as total')
      .where('user_id', userId)
      .where('is_read', false)
      .where('is_archived', false)
      .where(function() {
        this.whereNull('expires_at')
          .orWhere('expires_at', '>', new Date());
      })
      .first();

    return parseInt(result.total);
  }

  /**
   * Marcar notificação como lida
   */
  async markAsRead(notificationId, userId) {
    await this.knex(this.tableName)
      .where('id', notificationId)
      .where('user_id', userId)
      .update({
        is_read: true,
        read_at: new Date(),
        updated_at: new Date()
      });
  }

  /**
   * Marcar todas as notificações como lidas
   */
  async markAllAsRead(userId) {
    await this.knex(this.tableName)
      .where('user_id', userId)
      .where('is_read', false)
      .update({
        is_read: true,
        read_at: new Date(),
        updated_at: new Date()
      });
  }

  /**
   * Arquivar notificação
   */
  async archive(notificationId, userId) {
    await this.knex(this.tableName)
      .where('id', notificationId)
      .where('user_id', userId)
      .update({
        is_archived: true,
        archived_at: new Date(),
        updated_at: new Date()
      });
  }

  /**
   * Excluir notificação
   */
  async delete(notificationId, userId) {
    await this.knex(this.tableName)
      .where('id', notificationId)
      .where('user_id', userId)
      .del();
  }

  /**
   * Buscar notificação por ID
   */
  async findById(id, userId = null) {
    let query = this.knex(this.tableName)
      .select([
        'notifications.*',
        'notification_types.name as type_name',
        'notification_types.display_name as type_display_name',
        'notification_types.icon as type_icon',
        'notification_types.color as type_color'
      ])
      .leftJoin('notification_types', 'notifications.notification_type_id', 'notification_types.id')
      .where('notifications.id', id);

    if (userId) {
      query = query.where('notifications.user_id', userId);
    }

    const notification = await query.first();

    if (notification) {
      return {
        ...notification,
        data: notification.data ? JSON.parse(notification.data) : {}
      };
    }

    return null;
  }

  /**
   * Buscar notificações por UUID
   */
  async findByUuid(uuid, userId = null) {
    let query = this.knex(this.tableName)
      .select([
        'notifications.*',
        'notification_types.name as type_name',
        'notification_types.display_name as type_display_name',
        'notification_types.icon as type_icon',
        'notification_types.color as type_color'
      ])
      .leftJoin('notification_types', 'notifications.notification_type_id', 'notification_types.id')
      .where('notifications.uuid', uuid);

    if (userId) {
      query = query.where('notifications.user_id', userId);
    }

    const notification = await query.first();

    if (notification) {
      return {
        ...notification,
        data: notification.data ? JSON.parse(notification.data) : {}
      };
    }

    return null;
  }

  /**
   * Limpar notificações expiradas
   */
  async cleanExpired() {
    const deleted = await this.knex(this.tableName)
      .where('expires_at', '<', new Date())
      .del();

    return deleted;
  }

  /**
   * Buscar estatísticas de notificações
   */
  async getStats(userId) {
    const stats = await this.knex(this.tableName)
      .select(
        this.knex.raw('COUNT(*) as total'),
        this.knex.raw('COUNT(CASE WHEN is_read = false THEN 1 END) as unread'),
        this.knex.raw('COUNT(CASE WHEN is_archived = true THEN 1 END) as archived'),
        this.knex.raw('COUNT(CASE WHEN priority = \'urgent\' AND is_read = false THEN 1 END) as urgent_unread'),
        this.knex.raw('COUNT(CASE WHEN priority = \'high\' AND is_read = false THEN 1 END) as high_unread')
      )
      .where('user_id', userId)
      .where(function() {
        this.whereNull('expires_at')
          .orWhere('expires_at', '>', new Date());
      })
      .first();

    return {
      total: parseInt(stats.total),
      unread: parseInt(stats.unread),
      archived: parseInt(stats.archived),
      urgent_unread: parseInt(stats.urgent_unread),
      high_unread: parseInt(stats.high_unread),
      read: parseInt(stats.total) - parseInt(stats.unread)
    };
  }

  /**
   * Buscar notificações por tipo
   */
  async findByType(typeName, options = {}) {
    const {
      limit = 50,
      offset = 0,
      user_id = null,
      unread_only = false
    } = options;

    let query = this.knex(this.tableName)
      .select([
        'notifications.*',
        'notification_types.name as type_name',
        'notification_types.display_name as type_display_name',
        'notification_types.icon as type_icon',
        'notification_types.color as type_color'
      ])
      .leftJoin('notification_types', 'notifications.notification_type_id', 'notification_types.id')
      .where('notification_types.name', typeName)
      .orderBy('notifications.created_at', 'desc');

    if (user_id) {
      query = query.where('notifications.user_id', user_id);
    }

    if (unread_only) {
      query = query.where('notifications.is_read', false);
    }

    const notifications = await query
      .limit(limit)
      .offset(offset);

    return notifications.map(notification => ({
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : {}
    }));
  }

  /**
   * Criar notificação em massa
   */
  async createBulk(notifications) {
    const notificationsData = notifications.map(notification => ({
      ...notification,
      data: JSON.stringify(notification.data || {}),
      created_at: new Date(),
      updated_at: new Date()
    }));

    const created = await this.knex(this.tableName)
      .insert(notificationsData)
      .returning('*');

    return created;
  }
}

module.exports = Notification;