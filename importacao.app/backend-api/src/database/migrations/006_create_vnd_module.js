/**
 * VND Module - Sales (Vendas)
 * Tables: sales_pipeline, sales_opportunities, quotations, quotation_items, sales_orders, sales_order_items, commissions
 */

exports.up = function(knex) {
  return knex.schema
    // Sales Pipeline table
    .createTable('sales_pipeline', function(table) {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('code', 50).unique();
      table.text('description');
      table.integer('order_position').defaultTo(0);
      table.decimal('probability', 5, 2).defaultTo(0); // 0-100 percentage
      table.string('color', 7).defaultTo('#007bff'); // hex color
      table.enum('stage_type', ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).defaultTo('lead');
      table.boolean('is_active').defaultTo(true);
      table.json('additional_data').defaultTo('{}');
      table.timestamps(true, true);
      
      table.index(['code']);
      table.index(['stage_type']);
      table.index(['is_active']);
      table.index(['order_position']);
    })
    
    // Sales Opportunities table
    .then(() => {
      return knex.schema.createTable('sales_opportunities', function(table) {
        table.increments('id').primary();
        table.string('title', 255).notNullable();
        table.string('code', 50).unique();
        table.text('description');
        
        // Client information
        table.integer('client_id').references('id').inTable('clients').onDelete('CASCADE');
        table.string('contact_person', 255);
        table.string('contact_email', 255);
        table.string('contact_phone', 20);
        
        // Opportunity details
        table.integer('pipeline_stage_id').references('id').inTable('sales_pipeline').onDelete('SET NULL');
        table.decimal('estimated_value', 12, 2).defaultTo(0);
        table.decimal('probability', 5, 2).defaultTo(0); // 0-100 percentage
        table.date('expected_close_date');
        table.date('actual_close_date');
        
        // Assignment
        table.string('assigned_to', 255); // Sales rep
        table.string('team', 100);
        table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
        table.enum('status', ['active', 'won', 'lost', 'cancelled']).defaultTo('active');
        
        // Source and tracking
        table.string('source', 100); // Where the lead came from
        table.string('campaign', 100);
        table.json('tags').defaultTo('[]');
        table.text('notes');
        table.json('additional_data').defaultTo('{}');
        table.timestamps(true, true);
        
        table.index(['code']);
        table.index(['client_id']);
        table.index(['pipeline_stage_id']);
        table.index(['assigned_to']);
        table.index(['status']);
        table.index(['expected_close_date']);
        table.index(['source']);
      });
    })
    
    // Quotations table
    .then(() => {
      return knex.schema.createTable('quotations', function(table) {
        table.increments('id').primary();
        table.string('number', 50).unique().notNullable();
        table.date('date').notNullable();
        table.date('valid_until');
        table.date('delivery_date');
        
        // Client information
        table.integer('client_id').references('id').inTable('clients').onDelete('CASCADE');
        table.string('client_name', 255);
        table.string('client_email', 255);
        table.string('client_phone', 20);
        table.text('client_address');
        
        // Business information
        table.integer('opportunity_id').references('id').inTable('sales_opportunities').onDelete('SET NULL');
        table.string('sales_rep', 255);
        table.string('payment_terms', 255);
        table.enum('payment_method', ['cash', 'credit_card', 'bank_transfer', 'check', 'pix']).defaultTo('cash');
        table.string('delivery_terms', 255);
        
        // Values
        table.decimal('subtotal', 12, 2).defaultTo(0);
        table.decimal('discount_percentage', 5, 2).defaultTo(0);
        table.decimal('discount_amount', 12, 2).defaultTo(0);
        table.decimal('tax_amount', 12, 2).defaultTo(0);
        table.decimal('shipping_amount', 12, 2).defaultTo(0);
        table.decimal('total_amount', 12, 2).defaultTo(0);
        
        // Status and tracking
        table.enum('status', ['draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled']).defaultTo('draft');
        table.date('sent_date');
        table.date('accepted_date');
        table.date('rejected_date');
        table.string('rejection_reason', 255);
        table.text('notes');
        table.text('terms_conditions');
        table.json('additional_data').defaultTo('{}');
        table.timestamps(true, true);
        
        table.index(['number']);
        table.index(['client_id']);
        table.index(['opportunity_id']);
        table.index(['status']);
        table.index(['date']);
        table.index(['sales_rep']);
      });
    })
    
    // Quotation Items table
    .then(() => {
      return knex.schema.createTable('quotation_items', function(table) {
        table.increments('id').primary();
        table.integer('quotation_id').references('id').inTable('quotations').onDelete('CASCADE');
        table.integer('product_id').references('id').inTable('products').onDelete('CASCADE');
        table.string('product_name', 255);
        table.string('product_code', 100);
        table.text('description');
        table.decimal('quantity', 10, 3).notNullable();
        table.string('unit', 20);
        table.decimal('unit_price', 10, 2).notNullable();
        table.decimal('discount_percentage', 5, 2).defaultTo(0);
        table.decimal('discount_amount', 10, 2).defaultTo(0);
        table.decimal('total_amount', 12, 2).notNullable();
        table.integer('order_position').defaultTo(0);
        table.json('additional_data').defaultTo('{}');
        table.timestamps(true, true);
        
        table.index(['quotation_id']);
        table.index(['product_id']);
        table.index(['order_position']);
      });
    })
    
    // Sales Orders table
    .then(() => {
      return knex.schema.createTable('sales_orders', function(table) {
        table.increments('id').primary();
        table.string('number', 50).unique().notNullable();
        table.date('date').notNullable();
        table.date('delivery_date');
        table.date('promised_date');
        table.date('shipped_date');
        table.date('delivered_date');
        
        // Client information
        table.integer('client_id').references('id').inTable('clients').onDelete('CASCADE');
        table.string('client_name', 255);
        table.string('client_email', 255);
        table.string('client_phone', 20);
        table.text('billing_address');
        table.text('shipping_address');
        
        // Business information
        table.integer('quotation_id').references('id').inTable('quotations').onDelete('SET NULL');
        table.integer('opportunity_id').references('id').inTable('sales_opportunities').onDelete('SET NULL');
        table.string('sales_rep', 255);
        table.string('payment_terms', 255);
        table.enum('payment_method', ['cash', 'credit_card', 'bank_transfer', 'check', 'pix']).defaultTo('cash');
        table.string('delivery_terms', 255);
        table.string('shipping_method', 100);
        table.string('tracking_number', 100);
        
        // Values
        table.decimal('subtotal', 12, 2).defaultTo(0);
        table.decimal('discount_percentage', 5, 2).defaultTo(0);
        table.decimal('discount_amount', 12, 2).defaultTo(0);
        table.decimal('tax_amount', 12, 2).defaultTo(0);
        table.decimal('shipping_amount', 12, 2).defaultTo(0);
        table.decimal('total_amount', 12, 2).defaultTo(0);
        table.decimal('paid_amount', 12, 2).defaultTo(0);
        table.decimal('balance_due', 12, 2).defaultTo(0);
        
        // Status and tracking
        table.enum('status', ['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']).defaultTo('draft');
        table.enum('payment_status', ['pending', 'partial', 'paid', 'overdue', 'cancelled']).defaultTo('pending');
        table.enum('shipping_status', ['pending', 'preparing', 'shipped', 'delivered', 'returned']).defaultTo('pending');
        table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
        
        table.text('notes');
        table.text('internal_notes');
        table.json('additional_data').defaultTo('{}');
        table.timestamps(true, true);
        
        table.index(['number']);
        table.index(['client_id']);
        table.index(['quotation_id']);
        table.index(['opportunity_id']);
        table.index(['status']);
        table.index(['payment_status']);
        table.index(['shipping_status']);
        table.index(['date']);
        table.index(['sales_rep']);
        table.index(['delivery_date']);
      });
    })
    
    // Sales Order Items table
    .then(() => {
      return knex.schema.createTable('sales_order_items', function(table) {
        table.increments('id').primary();
        table.integer('sales_order_id').references('id').inTable('sales_orders').onDelete('CASCADE');
        table.integer('product_id').references('id').inTable('products').onDelete('CASCADE');
        table.string('product_name', 255);
        table.string('product_code', 100);
        table.text('description');
        table.decimal('quantity', 10, 3).notNullable();
        table.decimal('quantity_shipped', 10, 3).defaultTo(0);
        table.decimal('quantity_returned', 10, 3).defaultTo(0);
        table.string('unit', 20);
        table.decimal('unit_price', 10, 2).notNullable();
        table.decimal('discount_percentage', 5, 2).defaultTo(0);
        table.decimal('discount_amount', 10, 2).defaultTo(0);
        table.decimal('tax_amount', 10, 2).defaultTo(0);
        table.decimal('total_amount', 12, 2).notNullable();
        table.integer('order_position').defaultTo(0);
        table.enum('status', ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned']).defaultTo('pending');
        table.json('additional_data').defaultTo('{}');
        table.timestamps(true, true);
        
        table.index(['sales_order_id']);
        table.index(['product_id']);
        table.index(['status']);
        table.index(['order_position']);
      });
    })
    
    // Commissions table
    .then(() => {
      return knex.schema.createTable('commissions', function(table) {
        table.increments('id').primary();
        table.string('sales_rep', 255).notNullable();
        table.integer('sales_order_id').references('id').inTable('sales_orders').onDelete('CASCADE');
        table.integer('client_id').references('id').inTable('clients').onDelete('CASCADE');
        table.decimal('order_amount', 12, 2).notNullable();
        table.decimal('commission_percentage', 5, 2).notNullable();
        table.decimal('commission_amount', 12, 2).notNullable();
        table.decimal('base_amount', 12, 2).notNullable(); // Amount used for commission calculation
        table.date('sale_date').notNullable();
        table.date('due_date');
        table.date('paid_date');
        table.enum('status', ['pending', 'approved', 'paid', 'cancelled']).defaultTo('pending');
        table.enum('commission_type', ['percentage', 'fixed', 'tiered']).defaultTo('percentage');
        table.text('notes');
        table.json('additional_data').defaultTo('{}');
        table.timestamps(true, true);
        
        table.index(['sales_rep']);
        table.index(['sales_order_id']);
        table.index(['client_id']);
        table.index(['status']);
        table.index(['sale_date']);
        table.index(['due_date']);
      });
    })
    
    // Activities table (for tracking interactions)
    .then(() => {
      return knex.schema.createTable('sales_activities', function(table) {
        table.increments('id').primary();
        table.enum('type', ['call', 'email', 'meeting', 'task', 'note', 'proposal', 'demo', 'follow_up']).notNullable();
        table.string('subject', 255).notNullable();
        table.text('description');
        table.datetime('activity_date').notNullable();
        table.datetime('due_date');
        table.datetime('completed_date');
        table.string('assigned_to', 255);
        table.string('created_by', 255);
        
        // Related entities
        table.integer('client_id').references('id').inTable('clients').onDelete('CASCADE');
        table.integer('opportunity_id').references('id').inTable('sales_opportunities').onDelete('SET NULL');
        table.integer('quotation_id').references('id').inTable('quotations').onDelete('SET NULL');
        table.integer('sales_order_id').references('id').inTable('sales_orders').onDelete('SET NULL');
        
        table.enum('status', ['scheduled', 'completed', 'cancelled', 'rescheduled']).defaultTo('scheduled');
        table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
        table.enum('outcome', ['successful', 'unsuccessful', 'no_response', 'rescheduled']).defaultTo('successful');
        
        table.json('additional_data').defaultTo('{}');
        table.timestamps(true, true);
        
        table.index(['type']);
        table.index(['client_id']);
        table.index(['opportunity_id']);
        table.index(['assigned_to']);
        table.index(['status']);
        table.index(['activity_date']);
        table.index(['due_date']);
      });
    })
    
    // Insert default pipeline stages
    .then(() => {
      return knex('sales_pipeline').insert([
        { name: 'Lead', code: 'LEAD', description: 'Novo lead/prospecto', order_position: 1, probability: 10, color: '#6c757d', stage_type: 'lead' },
        { name: 'Qualificado', code: 'QUALIFIED', description: 'Lead qualificado', order_position: 2, probability: 25, color: '#007bff', stage_type: 'qualified' },
        { name: 'Proposta', code: 'PROPOSAL', description: 'Proposta enviada', order_position: 3, probability: 50, color: '#ffc107', stage_type: 'proposal' },
        { name: 'Negociação', code: 'NEGOTIATION', description: 'Em negociação', order_position: 4, probability: 75, color: '#fd7e14', stage_type: 'negotiation' },
        { name: 'Fechado - Ganho', code: 'CLOSED_WON', description: 'Venda fechada', order_position: 5, probability: 100, color: '#28a745', stage_type: 'closed_won' },
        { name: 'Fechado - Perdido', code: 'CLOSED_LOST', description: 'Oportunidade perdida', order_position: 6, probability: 0, color: '#dc3545', stage_type: 'closed_lost' }
      ]);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('sales_activities')
    .dropTableIfExists('commissions')
    .dropTableIfExists('sales_order_items')
    .dropTableIfExists('sales_orders')
    .dropTableIfExists('quotation_items')
    .dropTableIfExists('quotations')
    .dropTableIfExists('sales_opportunities')
    .dropTableIfExists('sales_pipeline');
};