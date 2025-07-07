/**
 * Migration para criar sistema de notificações
 */
exports.up = async function(knex) {
  // Tabela de tipos de notificação
  await knex.schema.createTable('notification_types', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable().unique();
    table.string('display_name', 100).notNullable();
    table.text('description');
    table.string('icon', 50).defaultTo('bell');
    table.string('color', 20).defaultTo('primary');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Tabela de canais de notificação
  await knex.schema.createTable('notification_channels', (table) => {
    table.increments('id').primary();
    table.string('name', 30).notNullable().unique();
    table.string('display_name', 50).notNullable();
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Tabela de templates de notificação
  await knex.schema.createTable('notification_templates', (table) => {
    table.increments('id').primary();
    table.integer('notification_type_id').references('id').inTable('notification_types').onDelete('CASCADE');
    table.integer('channel_id').references('id').inTable('notification_channels').onDelete('CASCADE');
    table.string('subject', 200);
    table.text('body_template').notNullable();
    table.text('html_template');
    table.json('variables');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Tabela de preferências de notificação por usuário
  await knex.schema.createTable('notification_preferences', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.integer('notification_type_id').references('id').inTable('notification_types').onDelete('CASCADE');
    table.integer('channel_id').references('id').inTable('notification_channels').onDelete('CASCADE');
    table.boolean('is_enabled').defaultTo(true);
    table.json('settings'); // Configurações específicas (horários, thresholds, etc.)
    table.timestamps(true, true);
    table.unique(['user_id', 'notification_type_id', 'channel_id']);
  });

  // Tabela principal de notificações
  await knex.schema.createTable('notifications', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').defaultTo(knex.raw('gen_random_uuid()')).unique();
    table.integer('user_id').notNullable();
    table.integer('notification_type_id').references('id').inTable('notification_types').onDelete('CASCADE');
    table.string('title', 200).notNullable();
    table.text('message').notNullable();
    table.json('data'); // Dados adicionais específicos da notificação
    table.string('source_module', 20); // Módulo que gerou a notificação
    table.string('source_entity', 50); // Entidade que gerou a notificação
    table.integer('source_entity_id'); // ID da entidade que gerou a notificação
    table.string('priority', 20).defaultTo('medium'); // low, medium, high, urgent
    table.boolean('is_read').defaultTo(false);
    table.timestamp('read_at');
    table.boolean('is_archived').defaultTo(false);
    table.timestamp('archived_at');
    table.timestamp('expires_at');
    table.string('action_url', 500); // URL para ação relacionada
    table.string('action_label', 100); // Label do botão de ação
    table.timestamps(true, true);
    table.index(['user_id', 'created_at']);
    table.index(['user_id', 'is_read']);
    table.index(['notification_type_id', 'created_at']);
    table.index(['expires_at']);
  });

  // Tabela de histórico de entrega de notificações
  await knex.schema.createTable('notification_deliveries', (table) => {
    table.increments('id').primary();
    table.integer('notification_id').references('id').inTable('notifications').onDelete('CASCADE');
    table.integer('channel_id').references('id').inTable('notification_channels').onDelete('CASCADE');
    table.string('status', 20).notNullable(); // pending, sent, delivered, failed, bounced
    table.text('recipient').notNullable(); // Email, phone, etc.
    table.json('metadata'); // Dados específicos do canal (message_id, etc.)
    table.text('error_message');
    table.timestamp('sent_at');
    table.timestamp('delivered_at');
    table.timestamp('failed_at');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('next_retry_at');
    table.timestamps(true, true);
    table.index(['notification_id', 'channel_id']);
    table.index(['status', 'created_at']);
  });

  // Tabela de alertas automáticos
  await knex.schema.createTable('automated_alerts', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.text('description');
    table.string('module', 20).notNullable(); // est, vnd, prd, etc.
    table.string('alert_type', 50).notNullable(); // stock_low, payment_due, etc.
    table.json('conditions'); // Condições para disparar o alerta
    table.json('recipients'); // Lista de usuários ou grupos
    table.boolean('is_active').defaultTo(true);
    table.string('frequency', 20).defaultTo('immediate'); // immediate, daily, weekly
    table.timestamp('last_triggered_at');
    table.integer('trigger_count').defaultTo(0);
    table.timestamps(true, true);
    table.index(['module', 'alert_type']);
    table.index(['is_active', 'frequency']);
  });

  // Tabela de logs de alertas
  await knex.schema.createTable('alert_logs', (table) => {
    table.increments('id').primary();
    table.integer('alert_id').references('id').inTable('automated_alerts').onDelete('CASCADE');
    table.string('status', 20).notNullable(); // triggered, skipped, error
    table.json('trigger_data'); // Dados que dispararam o alerta
    table.integer('notifications_sent').defaultTo(0);
    table.text('error_message');
    table.timestamp('triggered_at').defaultTo(knex.fn.now());
    table.index(['alert_id', 'triggered_at']);
  });

  // Inserir dados iniciais
  await knex('notification_types').insert([
    { name: 'stock_alert', display_name: 'Alerta de Estoque', description: 'Notificações sobre níveis de estoque', icon: 'warehouse', color: 'warning' },
    { name: 'sales_alert', display_name: 'Alerta de Vendas', description: 'Notificações sobre vendas e pedidos', icon: 'shopping-cart', color: 'success' },
    { name: 'production_alert', display_name: 'Alerta de Produção', description: 'Notificações sobre produção e qualidade', icon: 'cogs', color: 'info' },
    { name: 'financial_alert', display_name: 'Alerta Financeiro', description: 'Notificações sobre pagamentos e orçamentos', icon: 'dollar-sign', color: 'danger' },
    { name: 'system_alert', display_name: 'Alerta do Sistema', description: 'Notificações sobre manutenção e atualizações', icon: 'server', color: 'secondary' },
    { name: 'import_export_alert', display_name: 'Alerta de Importação/Exportação', description: 'Notificações sobre processos de importação e exportação', icon: 'exchange-alt', color: 'primary' },
    { name: 'general', display_name: 'Geral', description: 'Notificações gerais do sistema', icon: 'bell', color: 'primary' }
  ]);

  await knex('notification_channels').insert([
    { name: 'in_app', display_name: 'Notificação In-App', description: 'Notificações exibidas dentro da aplicação' },
    { name: 'email', display_name: 'Email', description: 'Notificações enviadas por email' },
    { name: 'sms', display_name: 'SMS', description: 'Notificações enviadas por SMS' },
    { name: 'push', display_name: 'Push Notification', description: 'Notificações push para dispositivos móveis' },
    { name: 'webhook', display_name: 'Webhook', description: 'Notificações enviadas via webhook' }
  ]);

  // Inserir alertas automáticos padrão
  await knex('automated_alerts').insert([
    {
      name: 'Estoque Baixo',
      description: 'Alerta quando produtos ficam com estoque baixo',
      module: 'est',
      alert_type: 'stock_low',
      conditions: JSON.stringify({
        threshold_type: 'percentage',
        threshold_value: 10,
        comparison: 'less_than'
      }),
      recipients: JSON.stringify(['admin', 'manager'])
    },
    {
      name: 'Produto Sem Estoque',
      description: 'Alerta quando produtos ficam sem estoque',
      module: 'est',
      alert_type: 'out_of_stock',
      conditions: JSON.stringify({
        threshold_type: 'quantity',
        threshold_value: 0,
        comparison: 'equal'
      }),
      recipients: JSON.stringify(['admin', 'manager'])
    },
    {
      name: 'Novo Pedido de Venda',
      description: 'Alerta quando um novo pedido é criado',
      module: 'vnd',
      alert_type: 'new_order',
      conditions: JSON.stringify({
        event: 'order_created',
        min_value: 1000
      }),
      recipients: JSON.stringify(['sales'])
    },
    {
      name: 'Pagamento Vencido',
      description: 'Alerta quando pagamentos estão vencidos',
      module: 'fis',
      alert_type: 'payment_overdue',
      conditions: JSON.stringify({
        days_overdue: 3
      }),
      recipients: JSON.stringify(['finance']),
      frequency: 'daily'
    }
  ]);

  console.log('✅ Tabelas do sistema de notificações criadas com sucesso');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('alert_logs');
  await knex.schema.dropTableIfExists('automated_alerts');
  await knex.schema.dropTableIfExists('notification_deliveries');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('notification_templates');
  await knex.schema.dropTableIfExists('notification_channels');
  await knex.schema.dropTableIfExists('notification_types');
  
  console.log('✅ Tabelas do sistema de notificações removidas');
};