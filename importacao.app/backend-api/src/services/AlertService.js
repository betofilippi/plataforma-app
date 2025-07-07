const NotificationService = require('./NotificationService');
const databaseConfig = require('../config/database');
const cron = require('node-cron');

/**
 * Serviço de alertas automáticos
 */
class AlertService {
  constructor() {
    this.notificationService = new NotificationService();
    this.knex = null;
    this.scheduledTasks = new Map();
    this.alertHandlers = new Map();
    this.initialized = false;
  }

  /**
   * Inicializar serviço de alertas
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Inicializar dependências
      await this.notificationService.initialize();
      this.knex = await databaseConfig.getInstance();

      // Registrar handlers de alertas
      this.registerAlertHandlers();

      // Configurar tarefas agendadas
      this.setupScheduledTasks();

      this.initialized = true;
      console.log('✅ Serviço de alertas inicializado');

    } catch (error) {
      console.error('❌ Erro ao inicializar serviço de alertas:', error);
      throw error;
    }
  }

  /**
   * Registrar handlers de alertas por módulo
   */
  registerAlertHandlers() {
    // Alertas de estoque
    this.alertHandlers.set('stock_low', this.handleStockLowAlert.bind(this));
    this.alertHandlers.set('out_of_stock', this.handleOutOfStockAlert.bind(this));
    this.alertHandlers.set('stock_movement', this.handleStockMovementAlert.bind(this));
    this.alertHandlers.set('expiring_batch', this.handleExpiringBatchAlert.bind(this));

    // Alertas de vendas
    this.alertHandlers.set('new_order', this.handleNewOrderAlert.bind(this));
    this.alertHandlers.set('order_cancelled', this.handleOrderCancelledAlert.bind(this));
    this.alertHandlers.set('payment_received', this.handlePaymentReceivedAlert.bind(this));
    this.alertHandlers.set('payment_overdue', this.handlePaymentOverdueAlert.bind(this));

    // Alertas de produção
    this.alertHandlers.set('production_delay', this.handleProductionDelayAlert.bind(this));
    this.alertHandlers.set('quality_issue', this.handleQualityIssueAlert.bind(this));
    this.alertHandlers.set('machine_maintenance', this.handleMachineMaintenanceAlert.bind(this));

    // Alertas financeiros
    this.alertHandlers.set('budget_exceeded', this.handleBudgetExceededAlert.bind(this));
    this.alertHandlers.set('cash_flow_low', this.handleCashFlowLowAlert.bind(this));
    this.alertHandlers.set('invoice_due', this.handleInvoiceDueAlert.bind(this));

    // Alertas do sistema
    this.alertHandlers.set('system_error', this.handleSystemErrorAlert.bind(this));
    this.alertHandlers.set('backup_failed', this.handleBackupFailedAlert.bind(this));
    this.alertHandlers.set('maintenance_required', this.handleMaintenanceRequiredAlert.bind(this));

    // Alertas de importação/exportação
    this.alertHandlers.set('import_completed', this.handleImportCompletedAlert.bind(this));
    this.alertHandlers.set('import_failed', this.handleImportFailedAlert.bind(this));
    this.alertHandlers.set('export_ready', this.handleExportReadyAlert.bind(this));
  }

  /**
   * Configurar tarefas agendadas
   */
  setupScheduledTasks() {
    // Verificar alertas a cada minuto
    const alertCheckTask = cron.schedule('* * * * *', async () => {
      await this.checkAutomatedAlerts();
    }, {
      scheduled: false
    });

    // Verificar alertas diários às 9:00
    const dailyAlertsTask = cron.schedule('0 9 * * *', async () => {
      await this.checkDailyAlerts();
    }, {
      scheduled: false
    });

    // Verificar alertas semanais às segundas-feiras às 9:00
    const weeklyAlertsTask = cron.schedule('0 9 * * 1', async () => {
      await this.checkWeeklyAlerts();
    }, {
      scheduled: false
    });

    // Limpeza de logs antigos (mensalmente)
    const cleanupTask = cron.schedule('0 2 1 * *', async () => {
      await this.cleanupOldLogs();
    }, {
      scheduled: false
    });

    // Armazenar tarefas
    this.scheduledTasks.set('alert_check', alertCheckTask);
    this.scheduledTasks.set('daily_alerts', dailyAlertsTask);
    this.scheduledTasks.set('weekly_alerts', weeklyAlertsTask);
    this.scheduledTasks.set('cleanup', cleanupTask);

    // Iniciar tarefas
    this.startScheduledTasks();
  }

  /**
   * Iniciar tarefas agendadas
   */
  startScheduledTasks() {
    this.scheduledTasks.forEach((task, name) => {
      task.start();
      console.log(`⏰ Tarefa agendada iniciada: ${name}`);
    });
  }

  /**
   * Disparar alerta manualmente
   */
  async triggerAlert(alertType, data, options = {}) {
    try {
      const handler = this.alertHandlers.get(alertType);
      
      if (!handler) {
        throw new Error(`Handler para alerta '${alertType}' não encontrado`);
      }

      // Executar handler
      const result = await handler(data, options);

      // Registrar log
      await this.logAlert(alertType, 'triggered', data, result);

      return result;

    } catch (error) {
      console.error(`❌ Erro ao disparar alerta ${alertType}:`, error);
      
      // Registrar erro
      await this.logAlert(alertType, 'error', data, null, error.message);
      
      throw error;
    }
  }

  /**
   * Verificar alertas automatizados
   */
  async checkAutomatedAlerts() {
    try {
      const alerts = await this.knex('automated_alerts')
        .where('is_active', true)
        .where('frequency', 'immediate');

      for (const alert of alerts) {
        await this.processAutomatedAlert(alert);
      }

    } catch (error) {
      console.error('❌ Erro ao verificar alertas automatizados:', error);
    }
  }

  /**
   * Verificar alertas diários
   */
  async checkDailyAlerts() {
    try {
      const alerts = await this.knex('automated_alerts')
        .where('is_active', true)
        .where('frequency', 'daily');

      for (const alert of alerts) {
        await this.processAutomatedAlert(alert);
      }

    } catch (error) {
      console.error('❌ Erro ao verificar alertas diários:', error);
    }
  }

  /**
   * Verificar alertas semanais
   */
  async checkWeeklyAlerts() {
    try {
      const alerts = await this.knex('automated_alerts')
        .where('is_active', true)
        .where('frequency', 'weekly');

      for (const alert of alerts) {
        await this.processAutomatedAlert(alert);
      }

    } catch (error) {
      console.error('❌ Erro ao verificar alertas semanais:', error);
    }
  }

  /**
   * Processar alerta automatizado
   */
  async processAutomatedAlert(alert) {
    try {
      const conditions = JSON.parse(alert.conditions);
      const recipients = JSON.parse(alert.recipients);

      // Verificar condições
      const shouldTrigger = await this.checkAlertConditions(alert.module, alert.alert_type, conditions);

      if (shouldTrigger) {
        // Disparar alerta
        await this.triggerAlert(alert.alert_type, {
          alertId: alert.id,
          module: alert.module,
          conditions,
          recipients
        });

        // Atualizar última execução
        await this.knex('automated_alerts')
          .where('id', alert.id)
          .update({
            last_triggered_at: new Date(),
            trigger_count: this.knex.raw('trigger_count + 1')
          });
      }

    } catch (error) {
      console.error(`❌ Erro ao processar alerta automatizado ${alert.id}:`, error);
    }
  }

  /**
   * Verificar condições do alerta
   */
  async checkAlertConditions(module, alertType, conditions) {
    // Implementar lógica específica por módulo e tipo
    switch (module) {
      case 'est':
        return this.checkStockConditions(alertType, conditions);
      case 'vnd':
        return this.checkSalesConditions(alertType, conditions);
      case 'prd':
        return this.checkProductionConditions(alertType, conditions);
      case 'fis':
        return this.checkFinancialConditions(alertType, conditions);
      default:
        return false;
    }
  }

  /**
   * Verificar condições de estoque
   */
  async checkStockConditions(alertType, conditions) {
    switch (alertType) {
      case 'stock_low':
        return this.checkStockLowConditions(conditions);
      case 'out_of_stock':
        return this.checkOutOfStockConditions(conditions);
      default:
        return false;
    }
  }

  /**
   * Verificar condições de estoque baixo
   */
  async checkStockLowConditions(conditions) {
    try {
      const { threshold_type, threshold_value, comparison } = conditions;

      let query = this.knex('produtos as p')
        .select('p.*')
        .leftJoin('estoque as e', 'p.id', 'e.produto_id');

      if (threshold_type === 'percentage') {
        query = query.whereRaw('(e.quantidade_atual / e.quantidade_minima) * 100 < ?', [threshold_value]);
      } else {
        query = query.where('e.quantidade_atual', '<', threshold_value);
      }

      const lowStockProducts = await query;
      return lowStockProducts.length > 0;

    } catch (error) {
      console.error('❌ Erro ao verificar condições de estoque baixo:', error);
      return false;
    }
  }

  /**
   * Verificar condições de produtos sem estoque
   */
  async checkOutOfStockConditions(conditions) {
    try {
      const outOfStockProducts = await this.knex('produtos as p')
        .select('p.*')
        .leftJoin('estoque as e', 'p.id', 'e.produto_id')
        .where('e.quantidade_atual', '<=', 0);

      return outOfStockProducts.length > 0;

    } catch (error) {
      console.error('❌ Erro ao verificar condições de produtos sem estoque:', error);
      return false;
    }
  }

  // Handlers específicos de alertas

  /**
   * Handler: Estoque baixo
   */
  async handleStockLowAlert(data, options = {}) {
    const { module, conditions, recipients } = data;
    
    // Buscar produtos com estoque baixo
    const lowStockProducts = await this.knex('produtos as p')
      .select([
        'p.id', 'p.nome', 'p.codigo',
        'e.quantidade_atual', 'e.quantidade_minima'
      ])
      .leftJoin('estoque as e', 'p.id', 'e.produto_id')
      .whereRaw('e.quantidade_atual <= e.quantidade_minima');

    if (lowStockProducts.length === 0) {
      return { triggered: false, reason: 'Nenhum produto com estoque baixo encontrado' };
    }

    // Criar notificações
    const notifications = [];
    
    for (const product of lowStockProducts) {
      const notification = await this.notificationService.createNotification({
        user_ids: await this.resolveRecipients(recipients),
        notification_type: 'stock_alert',
        title: `Estoque baixo: ${product.nome}`,
        message: `O produto ${product.nome} (${product.codigo}) está com estoque baixo. Quantidade atual: ${product.quantidade_atual}, Mínimo: ${product.quantidade_minima}`,
        priority: 'high',
        channels: ['in_app', 'email'],
        source_module: 'est',
        source_entity: 'produto',
        source_entity_id: product.id,
        action_url: `/estoque/produtos/${product.id}`,
        action_label: 'Ver Produto',
        data: {
          product_id: product.id,
          product_name: product.nome,
          product_code: product.codigo,
          current_stock: product.quantidade_atual,
          min_stock: product.quantidade_minima,
          alert_type: 'stock_low'
        }
      });

      notifications.push(...notification);
    }

    return {
      triggered: true,
      notifications_sent: notifications.length,
      products_affected: lowStockProducts.length
    };
  }

  /**
   * Handler: Produto sem estoque
   */
  async handleOutOfStockAlert(data, options = {}) {
    const { module, conditions, recipients } = data;
    
    // Buscar produtos sem estoque
    const outOfStockProducts = await this.knex('produtos as p')
      .select([
        'p.id', 'p.nome', 'p.codigo',
        'e.quantidade_atual'
      ])
      .leftJoin('estoque as e', 'p.id', 'e.produto_id')
      .where('e.quantidade_atual', '<=', 0);

    if (outOfStockProducts.length === 0) {
      return { triggered: false, reason: 'Nenhum produto sem estoque encontrado' };
    }

    // Criar notificações
    const notifications = [];
    
    for (const product of outOfStockProducts) {
      const notification = await this.notificationService.createNotification({
        user_ids: await this.resolveRecipients(recipients),
        notification_type: 'stock_alert',
        title: `Produto sem estoque: ${product.nome}`,
        message: `O produto ${product.nome} (${product.codigo}) está sem estoque!`,
        priority: 'urgent',
        channels: ['in_app', 'email'],
        source_module: 'est',
        source_entity: 'produto',
        source_entity_id: product.id,
        action_url: `/estoque/produtos/${product.id}`,
        action_label: 'Ver Produto',
        data: {
          product_id: product.id,
          product_name: product.nome,
          product_code: product.codigo,
          current_stock: product.quantidade_atual,
          alert_type: 'out_of_stock'
        }
      });

      notifications.push(...notification);
    }

    return {
      triggered: true,
      notifications_sent: notifications.length,
      products_affected: outOfStockProducts.length
    };
  }

  /**
   * Handler: Novo pedido
   */
  async handleNewOrderAlert(data, options = {}) {
    const { orderId, orderValue, customerName, recipients } = data;
    
    const notification = await this.notificationService.createNotification({
      user_ids: await this.resolveRecipients(recipients),
      notification_type: 'sales_alert',
      title: 'Novo Pedido Recebido',
      message: `Novo pedido de ${customerName} no valor de R$ ${orderValue}`,
      priority: 'medium',
      channels: ['in_app'],
      source_module: 'vnd',
      source_entity: 'pedido',
      source_entity_id: orderId,
      action_url: `/vendas/pedidos/${orderId}`,
      action_label: 'Ver Pedido',
      data: {
        order_id: orderId,
        order_value: orderValue,
        customer_name: customerName,
        alert_type: 'new_order'
      }
    });

    return {
      triggered: true,
      notifications_sent: notification.length
    };
  }

  /**
   * Handler: Pagamento em atraso
   */
  async handlePaymentOverdueAlert(data, options = {}) {
    const { conditions, recipients } = data;
    const { days_overdue } = conditions;

    // Buscar pagamentos em atraso
    const overduePayments = await this.knex('contas_receber')
      .select('*')
      .where('data_vencimento', '<', this.knex.raw('NOW() - INTERVAL ? DAY', [days_overdue]))
      .where('status', 'pendente');

    if (overduePayments.length === 0) {
      return { triggered: false, reason: 'Nenhum pagamento em atraso encontrado' };
    }

    // Criar notificações
    const notifications = [];
    
    for (const payment of overduePayments) {
      const notification = await this.notificationService.createNotification({
        user_ids: await this.resolveRecipients(recipients),
        notification_type: 'financial_alert',
        title: 'Pagamento em Atraso',
        message: `Pagamento de R$ ${payment.valor} está ${days_overdue} dias em atraso`,
        priority: 'high',
        channels: ['in_app', 'email'],
        source_module: 'fis',
        source_entity: 'conta_receber',
        source_entity_id: payment.id,
        action_url: `/financeiro/contas-receber/${payment.id}`,
        action_label: 'Ver Conta',
        data: {
          payment_id: payment.id,
          payment_value: payment.valor,
          days_overdue: days_overdue,
          alert_type: 'payment_overdue'
        }
      });

      notifications.push(...notification);
    }

    return {
      triggered: true,
      notifications_sent: notifications.length,
      payments_affected: overduePayments.length
    };
  }

  /**
   * Placeholder handlers para outros tipos de alerta
   */
  async handleStockMovementAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  async handleExpiringBatchAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  async handleOrderCancelledAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  async handlePaymentReceivedAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  async handleProductionDelayAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  async handleQualityIssueAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  async handleMachineMaintenanceAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  async handleBudgetExceededAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  async handleCashFlowLowAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  async handleInvoiceDueAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  async handleSystemErrorAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  async handleBackupFailedAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  async handleMaintenanceRequiredAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  async handleImportCompletedAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  async handleImportFailedAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  async handleExportReadyAlert(data, options = {}) {
    // Implementar lógica específica
    return { triggered: false, reason: 'Handler não implementado' };
  }

  /**
   * Resolver destinatários
   */
  async resolveRecipients(recipients) {
    if (!Array.isArray(recipients)) {
      return [];
    }

    const userIds = [];
    
    for (const recipient of recipients) {
      if (typeof recipient === 'number') {
        userIds.push(recipient);
      } else if (typeof recipient === 'string') {
        // Resolver por role, email, etc.
        const users = await this.getUsersByRole(recipient);
        userIds.push(...users);
      }
    }

    return [...new Set(userIds)]; // Remove duplicatas
  }

  /**
   * Buscar usuários por role
   */
  async getUsersByRole(role) {
    // Implementar busca de usuários por role
    // Por enquanto, retorna array vazio
    return [];
  }

  /**
   * Registrar log de alerta
   */
  async logAlert(alertType, status, triggerData, result, errorMessage = null) {
    try {
      // Buscar ID do alerta automatizado
      const alert = await this.knex('automated_alerts')
        .where('alert_type', alertType)
        .first();

      if (!alert) {
        console.warn(`Alerta automatizado '${alertType}' não encontrado para log`);
        return;
      }

      await this.knex('alert_logs').insert({
        alert_id: alert.id,
        status,
        trigger_data: JSON.stringify(triggerData),
        notifications_sent: result?.notifications_sent || 0,
        error_message: errorMessage,
        triggered_at: new Date()
      });

    } catch (error) {
      console.error('❌ Erro ao registrar log de alerta:', error);
    }
  }

  /**
   * Limpar logs antigos
   */
  async cleanupOldLogs() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deleted = await this.knex('alert_logs')
        .where('triggered_at', '<', thirtyDaysAgo)
        .del();

      console.log(`🗑️ ${deleted} logs de alerta antigos removidos`);
      return deleted;

    } catch (error) {
      console.error('❌ Erro ao limpar logs antigos:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de alertas
   */
  async getAlertStats() {
    try {
      const stats = await this.knex('alert_logs')
        .select([
          this.knex.raw('COUNT(*) as total_alerts'),
          this.knex.raw('COUNT(CASE WHEN status = "triggered" THEN 1 END) as triggered_alerts'),
          this.knex.raw('COUNT(CASE WHEN status = "error" THEN 1 END) as error_alerts'),
          this.knex.raw('SUM(notifications_sent) as total_notifications')
        ])
        .where('triggered_at', '>=', this.knex.raw('NOW() - INTERVAL 30 DAY'))
        .first();

      return {
        total_alerts: parseInt(stats.total_alerts || 0),
        triggered_alerts: parseInt(stats.triggered_alerts || 0),
        error_alerts: parseInt(stats.error_alerts || 0),
        total_notifications: parseInt(stats.total_notifications || 0)
      };

    } catch (error) {
      console.error('❌ Erro ao obter estatísticas de alertas:', error);
      throw error;
    }
  }

  /**
   * Parar tarefas agendadas
   */
  stopScheduledTasks() {
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      console.log(`⏰ Tarefa agendada parada: ${name}`);
    });
  }

  /**
   * Encerrar serviço
   */
  async shutdown() {
    this.stopScheduledTasks();
    
    if (this.notificationService) {
      await this.notificationService.shutdown();
    }

    console.log('🔌 Serviço de alertas encerrado');
  }
}

module.exports = AlertService;