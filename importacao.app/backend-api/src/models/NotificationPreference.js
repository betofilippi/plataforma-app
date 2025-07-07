/**
 * Modelo de Preferências de Notificação
 */
class NotificationPreference {
  constructor(knex) {
    this.knex = knex;
    this.tableName = 'notification_preferences';
  }

  /**
   * Buscar preferências por usuário
   */
  async findByUser(userId) {
    const preferences = await this.knex(this.tableName)
      .select([
        'notification_preferences.*',
        'notification_types.name as type_name',
        'notification_types.display_name as type_display_name',
        'notification_types.icon as type_icon',
        'notification_types.color as type_color',
        'notification_channels.name as channel_name',
        'notification_channels.display_name as channel_display_name'
      ])
      .leftJoin('notification_types', 'notification_preferences.notification_type_id', 'notification_types.id')
      .leftJoin('notification_channels', 'notification_preferences.channel_id', 'notification_channels.id')
      .where('notification_preferences.user_id', userId)
      .orderBy([
        'notification_types.display_name',
        'notification_channels.display_name'
      ]);

    return preferences.map(pref => ({
      ...pref,
      settings: pref.settings ? JSON.parse(pref.settings) : {}
    }));
  }

  /**
   * Buscar preferência específica
   */
  async findPreference(userId, notificationTypeId, channelId) {
    const preference = await this.knex(this.tableName)
      .select([
        'notification_preferences.*',
        'notification_types.name as type_name',
        'notification_types.display_name as type_display_name',
        'notification_channels.name as channel_name',
        'notification_channels.display_name as channel_display_name'
      ])
      .leftJoin('notification_types', 'notification_preferences.notification_type_id', 'notification_types.id')
      .leftJoin('notification_channels', 'notification_preferences.channel_id', 'notification_channels.id')
      .where('notification_preferences.user_id', userId)
      .where('notification_preferences.notification_type_id', notificationTypeId)
      .where('notification_preferences.channel_id', channelId)
      .first();

    if (preference) {
      return {
        ...preference,
        settings: preference.settings ? JSON.parse(preference.settings) : {}
      };
    }

    return null;
  }

  /**
   * Criar ou atualizar preferência
   */
  async upsert(userId, notificationTypeId, channelId, isEnabled, settings = {}) {
    const existingPreference = await this.knex(this.tableName)
      .where('user_id', userId)
      .where('notification_type_id', notificationTypeId)
      .where('channel_id', channelId)
      .first();

    const data = {
      user_id: userId,
      notification_type_id: notificationTypeId,
      channel_id: channelId,
      is_enabled: isEnabled,
      settings: JSON.stringify(settings),
      updated_at: new Date()
    };

    if (existingPreference) {
      await this.knex(this.tableName)
        .where('id', existingPreference.id)
        .update(data);
      
      return { ...existingPreference, ...data };
    } else {
      data.created_at = new Date();
      const [preference] = await this.knex(this.tableName)
        .insert(data)
        .returning('*');
      
      return preference;
    }
  }

  /**
   * Atualizar preferências em massa
   */
  async updateBulk(userId, preferences) {
    const updates = [];
    
    for (const pref of preferences) {
      const { notification_type_id, channel_id, is_enabled, settings } = pref;
      
      updates.push(
        this.upsert(userId, notification_type_id, channel_id, is_enabled, settings)
      );
    }

    return Promise.all(updates);
  }

  /**
   * Verificar se notificação está habilitada para usuário
   */
  async isEnabled(userId, notificationTypeId, channelId) {
    const preference = await this.knex(this.tableName)
      .where('user_id', userId)
      .where('notification_type_id', notificationTypeId)
      .where('channel_id', channelId)
      .first();

    // Se não há preferência definida, assume que está habilitada
    return preference ? preference.is_enabled : true;
  }

  /**
   * Buscar canais habilitados para um tipo de notificação
   */
  async getEnabledChannels(userId, notificationTypeId) {
    const channels = await this.knex(this.tableName)
      .select([
        'notification_channels.*',
        'notification_preferences.settings'
      ])
      .leftJoin('notification_channels', 'notification_preferences.channel_id', 'notification_channels.id')
      .where('notification_preferences.user_id', userId)
      .where('notification_preferences.notification_type_id', notificationTypeId)
      .where('notification_preferences.is_enabled', true)
      .where('notification_channels.is_active', true);

    return channels.map(channel => ({
      ...channel,
      settings: channel.settings ? JSON.parse(channel.settings) : {}
    }));
  }

  /**
   * Criar preferências padrão para um usuário
   */
  async createDefaultPreferences(userId) {
    // Buscar todos os tipos de notificação e canais ativos
    const types = await this.knex('notification_types')
      .where('is_active', true);
    
    const channels = await this.knex('notification_channels')
      .where('is_active', true);

    const defaultPreferences = [];

    for (const type of types) {
      for (const channel of channels) {
        // Definir configurações padrão baseadas no tipo e canal
        let isEnabled = true;
        let settings = {};

        // Email habilitado por padrão apenas para alertas importantes
        if (channel.name === 'email') {
          isEnabled = ['stock_alert', 'financial_alert', 'system_alert'].includes(type.name);
          settings = {
            immediate: true,
            daily_digest: false,
            weekly_digest: false
          };
        }

        // SMS apenas para alertas urgentes
        if (channel.name === 'sms') {
          isEnabled = ['stock_alert', 'financial_alert'].includes(type.name);
          settings = {
            only_urgent: true,
            quiet_hours: {
              start: '22:00',
              end: '08:00'
            }
          };
        }

        // In-app sempre habilitado
        if (channel.name === 'in_app') {
          isEnabled = true;
          settings = {
            show_desktop_notifications: true,
            auto_dismiss: false
          };
        }

        // Push notifications habilitado para a maioria
        if (channel.name === 'push') {
          isEnabled = !['general'].includes(type.name);
          settings = {
            vibrate: true,
            sound: true
          };
        }

        defaultPreferences.push({
          user_id: userId,
          notification_type_id: type.id,
          channel_id: channel.id,
          is_enabled: isEnabled,
          settings: JSON.stringify(settings),
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    // Inserir preferências padrão
    await this.knex(this.tableName)
      .insert(defaultPreferences)
      .onConflict(['user_id', 'notification_type_id', 'channel_id'])
      .ignore();

    return defaultPreferences;
  }

  /**
   * Buscar todas as combinações disponíveis
   */
  async getAvailablePreferences() {
    const result = await this.knex('notification_types')
      .select([
        'notification_types.id as type_id',
        'notification_types.name as type_name',
        'notification_types.display_name as type_display_name',
        'notification_types.description as type_description',
        'notification_types.icon as type_icon',
        'notification_types.color as type_color',
        'notification_channels.id as channel_id',
        'notification_channels.name as channel_name',
        'notification_channels.display_name as channel_display_name',
        'notification_channels.description as channel_description'
      ])
      .crossJoin('notification_channels')
      .where('notification_types.is_active', true)
      .where('notification_channels.is_active', true)
      .orderBy([
        'notification_types.display_name',
        'notification_channels.display_name'
      ]);

    return result;
  }

  /**
   * Resetar preferências para os padrões
   */
  async resetToDefaults(userId) {
    // Remover preferências existentes
    await this.knex(this.tableName)
      .where('user_id', userId)
      .del();

    // Criar preferências padrão
    return this.createDefaultPreferences(userId);
  }

  /**
   * Obter resumo das preferências
   */
  async getPreferencesSummary(userId) {
    const summary = await this.knex(this.tableName)
      .select([
        'notification_channels.name as channel_name',
        'notification_channels.display_name as channel_display_name',
        this.knex.raw('COUNT(*) as total_types'),
        this.knex.raw('COUNT(CASE WHEN is_enabled = true THEN 1 END) as enabled_types')
      ])
      .leftJoin('notification_channels', 'notification_preferences.channel_id', 'notification_channels.id')
      .where('notification_preferences.user_id', userId)
      .groupBy('notification_channels.id', 'notification_channels.name', 'notification_channels.display_name')
      .orderBy('notification_channels.display_name');

    return summary.map(item => ({
      ...item,
      total_types: parseInt(item.total_types),
      enabled_types: parseInt(item.enabled_types),
      disabled_types: parseInt(item.total_types) - parseInt(item.enabled_types)
    }));
  }
}

module.exports = NotificationPreference;