/**
 * Migration: Create BI Module Tables
 * Creates tables for Business Intelligence functionality
 */

exports.up = function(knex) {
  return Promise.all([
    // Dashboard configurations table
    knex.schema.createTable('dashboard_configs', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable();
      table.uuid('company_id').notNullable();
      table.string('dashboard_type').notNullable(); // executive, sales, inventory, financial, production
      table.jsonb('configuration').notNullable(); // widgets, layout, settings
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index(['user_id', 'dashboard_type']);
      table.index(['company_id', 'dashboard_type']);
      table.index('is_active');
      
      // Foreign keys (if user/company tables exist)
      // table.foreign('user_id').references('id').inTable('users');
      // table.foreign('company_id').references('id').inTable('companies');
    }),

    // Report templates table
    knex.schema.createTable('report_templates', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.text('description');
      table.string('category').notNullable(); // sales, inventory, financial, production, etc.
      table.string('module'); // vnd, est, fin, prd, etc.
      table.string('type').notNullable().unique(); // unique identifier for the report type
      table.jsonb('configuration').notNullable(); // fields, charts, filters, etc.
      table.boolean('is_public').defaultTo(false);
      table.boolean('is_active').defaultTo(true);
      table.uuid('created_by');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index('category');
      table.index('module');
      table.index('type');
      table.index('is_public');
      table.index('is_active');
      table.index('created_by');
    }),

    // Reports table
    knex.schema.createTable('reports', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable();
      table.uuid('company_id').notNullable();
      table.string('report_type').notNullable();
      table.string('name');
      table.text('description');
      table.jsonb('parameters'); // filters, date ranges, etc.
      table.jsonb('data'); // generated report data
      table.string('format').defaultTo('json'); // json, pdf, excel
      table.string('status').defaultTo('pending'); // pending, processing, completed, failed
      table.string('file_url'); // URL to generated file
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index(['user_id', 'report_type']);
      table.index(['company_id', 'report_type']);
      table.index('status');
      table.index('created_at');
    }),

    // Scheduled reports table
    knex.schema.createTable('scheduled_reports', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable();
      table.uuid('company_id').notNullable();
      table.string('report_type').notNullable();
      table.string('name').notNullable();
      table.jsonb('schedule').notNullable(); // frequency, time, day of week/month
      table.jsonb('recipients').notNullable(); // email addresses
      table.string('format').defaultTo('pdf'); // pdf, excel
      table.jsonb('filters'); // report filters
      table.boolean('is_active').defaultTo(true);
      table.timestamp('last_run');
      table.timestamp('next_run');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index(['user_id', 'is_active']);
      table.index(['company_id', 'is_active']);
      table.index('next_run');
      table.index('is_active');
    }),

    // Analytics cache table
    knex.schema.createTable('analytics_cache', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('company_id').notNullable();
      table.string('analytics_type').notNullable(); // sales, inventory, financial, etc.
      table.string('cache_key').notNullable();
      table.jsonb('parameters'); // request parameters
      table.jsonb('data').notNullable(); // cached analytics data
      table.timestamp('expires_at').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index(['company_id', 'analytics_type']);
      table.index('cache_key');
      table.index('expires_at');
      
      // Unique constraint
      table.unique(['company_id', 'cache_key']);
    }),

    // KPI definitions table
    knex.schema.createTable('kpi_definitions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('kpi_key').notNullable().unique();
      table.string('name').notNullable();
      table.text('description');
      table.string('category').notNullable(); // sales, financial, operational, etc.
      table.string('unit'); // currency, percentage, count, etc.
      table.jsonb('calculation_config').notNullable(); // how to calculate the KPI
      table.jsonb('thresholds'); // warning/danger thresholds
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index('category');
      table.index('is_active');
    }),

    // KPI values table
    knex.schema.createTable('kpi_values', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('company_id').notNullable();
      table.string('kpi_key').notNullable();
      table.decimal('value', 15, 4).notNullable();
      table.decimal('previous_value', 15, 4);
      table.decimal('target_value', 15, 4);
      table.date('period_date').notNullable();
      table.string('period_type').notNullable(); // daily, weekly, monthly, quarterly, yearly
      table.jsonb('metadata'); // additional context data
      table.timestamp('calculated_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index(['company_id', 'kpi_key', 'period_date']);
      table.index(['kpi_key', 'period_type']);
      table.index('period_date');
      
      // Unique constraint
      table.unique(['company_id', 'kpi_key', 'period_date', 'period_type']);
      
      // Foreign key
      table.foreign('kpi_key').references('kpi_key').inTable('kpi_definitions');
    }),

    // Dashboard widgets table
    knex.schema.createTable('dashboard_widgets', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('dashboard_config_id').notNullable();
      table.string('widget_type').notNullable(); // kpi, chart, table, etc.
      table.string('widget_id').notNullable();
      table.string('title');
      table.jsonb('configuration').notNullable(); // widget-specific config
      table.jsonb('position'); // x, y, width, height
      table.boolean('is_visible').defaultTo(true);
      table.integer('sort_order').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index('dashboard_config_id');
      table.index(['dashboard_config_id', 'is_visible']);
      table.index('sort_order');
      
      // Foreign key
      table.foreign('dashboard_config_id').references('id').inTable('dashboard_configs').onDelete('CASCADE');
    }),

    // Chart configurations table
    knex.schema.createTable('chart_configs', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('chart_key').notNullable().unique();
      table.string('name').notNullable();
      table.text('description');
      table.string('chart_type').notNullable(); // line, bar, pie, doughnut, etc.
      table.string('data_source').notNullable(); // table or query identifier
      table.jsonb('query_config').notNullable(); // how to fetch data
      table.jsonb('chart_options'); // Chart.js options
      table.string('category'); // dashboard category this chart belongs to
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index('chart_type');
      table.index('category');
      table.index('is_active');
    }),

    // Alert configurations table
    knex.schema.createTable('alert_configs', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('company_id').notNullable();
      table.string('alert_type').notNullable(); // kpi_threshold, inventory_low, etc.
      table.string('name').notNullable();
      table.text('description');
      table.jsonb('conditions').notNullable(); // alert trigger conditions
      table.jsonb('actions').notNullable(); // what to do when triggered
      table.string('severity').defaultTo('medium'); // low, medium, high, critical
      table.boolean('is_active').defaultTo(true);
      table.uuid('created_by').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Indexes
      table.index(['company_id', 'alert_type']);
      table.index('is_active');
      table.index('severity');
      table.index('created_by');
    }),

    // Alert instances table
    knex.schema.createTable('alert_instances', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('alert_config_id').notNullable();
      table.uuid('company_id').notNullable();
      table.string('status').defaultTo('active'); // active, acknowledged, resolved
      table.jsonb('trigger_data'); // data that triggered the alert
      table.text('message');
      table.timestamp('triggered_at').defaultTo(knex.fn.now());
      table.timestamp('acknowledged_at');
      table.timestamp('resolved_at');
      table.uuid('acknowledged_by');
      table.uuid('resolved_by');
      
      // Indexes
      table.index(['company_id', 'status']);
      table.index('alert_config_id');
      table.index('triggered_at');
      table.index('status');
      
      // Foreign key
      table.foreign('alert_config_id').references('id').inTable('alert_configs').onDelete('CASCADE');
    }),

    // Real-time subscriptions table
    knex.schema.createTable('realtime_subscriptions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('socket_id').notNullable();
      table.uuid('user_id').notNullable();
      table.uuid('company_id').notNullable();
      table.string('subscription_type').notNullable(); // dashboard, kpi, chart, alert
      table.string('subscription_key').notNullable(); // specific identifier
      table.jsonb('parameters'); // subscription parameters
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('last_active').defaultTo(knex.fn.now());
      
      // Indexes
      table.index('socket_id');
      table.index(['user_id', 'subscription_type']);
      table.index(['company_id', 'subscription_type']);
      table.index('last_active');
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('realtime_subscriptions'),
    knex.schema.dropTableIfExists('alert_instances'),
    knex.schema.dropTableIfExists('alert_configs'),
    knex.schema.dropTableIfExists('chart_configs'),
    knex.schema.dropTableIfExists('dashboard_widgets'),
    knex.schema.dropTableIfExists('kpi_values'),
    knex.schema.dropTableIfExists('kpi_definitions'),
    knex.schema.dropTableIfExists('analytics_cache'),
    knex.schema.dropTableIfExists('scheduled_reports'),
    knex.schema.dropTableIfExists('reports'),
    knex.schema.dropTableIfExists('report_templates'),
    knex.schema.dropTableIfExists('dashboard_configs')
  ]);
};