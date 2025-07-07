/**
 * Complete ERP Database Schema Migration
 * This migration creates all tables for the comprehensive ERP system
 * with proper relationships, indexes, and constraints
 */

exports.up = function(knex) {
  return knex.schema
    
    // =====================================================
    // CORE SYSTEM TABLES
    // =====================================================
    
    // Companies/Organizations
    .createTable('companies', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.string('legal_name', 255);
      table.string('tax_id', 50).unique(); // CNPJ/CPF
      table.string('state_tax_id', 50); // IE
      table.string('municipal_tax_id', 50); // IM
      table.string('phone', 20);
      table.string('email', 255);
      table.string('website', 255);
      table.json('address').defaultTo('{}');
      table.enum('type', ['matriz', 'filial', 'cliente', 'fornecedor', 'transportadora']).defaultTo('matriz');
      table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
      table.json('settings').defaultTo('{}');
      table.json('tax_settings').defaultTo('{}');
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.index(['tax_id']);
      table.index(['type']);
      table.index(['status']);
      table.index(['deleted_at']);
    })
    
    // Enhanced Users with company association
    .createTable('users', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.string('email', 255).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.string('first_name', 100).notNullable();
      table.string('last_name', 100).notNullable();
      table.string('phone', 20);
      table.string('department', 100);
      table.string('position', 100);
      table.enum('role', ['admin', 'manager', 'supervisor', 'operator', 'viewer']).defaultTo('operator');
      table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
      table.json('permissions').defaultTo('{}');
      table.json('preferences').defaultTo('{}');
      table.timestamp('last_login_at');
      table.string('reset_password_token', 255);
      table.timestamp('reset_password_expires');
      table.decimal('salary', 10, 2);
      table.date('hire_date');
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.index(['company_id']);
      table.index(['email']);
      table.index(['role']);
      table.index(['status']);
      table.index(['deleted_at']);
    })
    
    // =====================================================
    // CAD MODULE - CADASTROS
    // =====================================================
    
    // Product Categories
    .createTable('product_categories', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.integer('parent_id').references('id').inTable('product_categories').onDelete('SET NULL');
      table.string('name', 100).notNullable();
      table.string('code', 50);
      table.text('description');
      table.decimal('default_margin', 5, 2);
      table.string('tax_classification', 20); // NCM
      table.enum('status', ['active', 'inactive']).defaultTo('active');
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.index(['company_id']);
      table.index(['parent_id']);
      table.index(['code']);
      table.index(['status']);
      table.index(['deleted_at']);
    })
    
    // Units of Measure
    .createTable('units', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.string('name', 50).notNullable();
      table.string('symbol', 10).notNullable();
      table.string('type', 30); // peso, volume, comprimento, etc
      table.decimal('conversion_factor', 10, 6).defaultTo(1);
      table.integer('base_unit_id').references('id').inTable('units').onDelete('SET NULL');
      table.enum('status', ['active', 'inactive']).defaultTo('active');
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.index(['company_id']);
      table.index(['type']);
      table.index(['status']);
      table.index(['deleted_at']);
    })
    
    // Products
    .createTable('products', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.integer('category_id').references('id').inTable('product_categories').onDelete('SET NULL');
      table.integer('unit_id').references('id').inTable('units').onDelete('SET NULL');
      table.string('name', 255).notNullable();
      table.string('code', 100).notNullable();
      table.string('ean', 20);
      table.string('ncm', 20);
      table.text('description');
      table.decimal('cost_price', 12, 4).defaultTo(0);
      table.decimal('sale_price', 12, 4).defaultTo(0);
      table.decimal('min_stock', 12, 4).defaultTo(0);
      table.decimal('max_stock', 12, 4).defaultTo(0);
      table.decimal('weight', 10, 4);
      table.decimal('length', 10, 4);
      table.decimal('width', 10, 4);
      table.decimal('height', 10, 4);
      table.enum('type', ['produto', 'servico', 'materia_prima', 'produto_acabado']).defaultTo('produto');
      table.enum('status', ['active', 'inactive', 'discontinued']).defaultTo('active');
      table.json('tax_info').defaultTo('{}');
      table.json('specifications').defaultTo('{}');
      table.string('image_url', 500);
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.unique(['company_id', 'code']);
      table.index(['company_id']);
      table.index(['category_id']);
      table.index(['code']);
      table.index(['ean']);
      table.index(['ncm']);
      table.index(['type']);
      table.index(['status']);
      table.index(['deleted_at']);
    })
    
    // Clients
    .createTable('clients', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.string('name', 255).notNullable();
      table.string('legal_name', 255);
      table.string('tax_id', 50); // CNPJ/CPF
      table.string('state_tax_id', 50); // IE
      table.string('municipal_tax_id', 50); // IM
      table.enum('person_type', ['fisica', 'juridica']).defaultTo('juridica');
      table.string('phone', 20);
      table.string('mobile', 20);
      table.string('email', 255);
      table.string('website', 255);
      table.json('address').defaultTo('{}');
      table.json('contacts').defaultTo('[]');
      table.decimal('credit_limit', 12, 2).defaultTo(0);
      table.integer('payment_term_days').defaultTo(30);
      table.enum('status', ['active', 'inactive', 'blocked']).defaultTo('active');
      table.text('notes');
      table.string('segment', 100);
      table.string('size', 50); // pequeno, médio, grande
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.index(['company_id']);
      table.index(['tax_id']);
      table.index(['person_type']);
      table.index(['status']);
      table.index(['segment']);
      table.index(['deleted_at']);
    })
    
    // Suppliers
    .createTable('suppliers', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.string('name', 255).notNullable();
      table.string('legal_name', 255);
      table.string('tax_id', 50); // CNPJ/CPF
      table.string('state_tax_id', 50); // IE
      table.string('municipal_tax_id', 50); // IM
      table.enum('person_type', ['fisica', 'juridica']).defaultTo('juridica');
      table.string('phone', 20);
      table.string('mobile', 20);
      table.string('email', 255);
      table.string('website', 255);
      table.json('address').defaultTo('{}');
      table.json('contacts').defaultTo('[]');
      table.integer('payment_term_days').defaultTo(30);
      table.enum('status', ['active', 'inactive', 'blocked']).defaultTo('active');
      table.text('notes');
      table.string('segment', 100);
      table.decimal('rating', 3, 2); // 0-5 rating
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.index(['company_id']);
      table.index(['tax_id']);
      table.index(['person_type']);
      table.index(['status']);
      table.index(['segment']);
      table.index(['deleted_at']);
    })
    
    // Price Lists
    .createTable('price_lists', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.string('name', 100).notNullable();
      table.string('code', 50);
      table.text('description');
      table.date('valid_from');
      table.date('valid_to');
      table.enum('status', ['active', 'inactive', 'draft']).defaultTo('draft');
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.index(['company_id']);
      table.index(['code']);
      table.index(['status']);
      table.index(['valid_from', 'valid_to']);
      table.index(['deleted_at']);
    })
    
    // Price List Items
    .createTable('price_list_items', function(table) {
      table.increments('id').primary();
      table.integer('price_list_id').references('id').inTable('price_lists').onDelete('CASCADE');
      table.integer('product_id').references('id').inTable('products').onDelete('CASCADE');
      table.decimal('price', 12, 4).notNullable();
      table.decimal('min_quantity', 12, 4).defaultTo(1);
      table.decimal('discount_percentage', 5, 2).defaultTo(0);
      table.timestamps(true, true);
      
      table.unique(['price_list_id', 'product_id']);
      table.index(['price_list_id']);
      table.index(['product_id']);
    })
    
    // =====================================================
    // EST MODULE - ESTOQUE
    // =====================================================
    
    // Warehouses
    .createTable('warehouses', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.string('name', 100).notNullable();
      table.string('code', 50).notNullable();
      table.text('description');
      table.json('address').defaultTo('{}');
      table.string('manager_name', 100);
      table.string('phone', 20);
      table.enum('type', ['principal', 'secundario', 'transito', 'terceiros']).defaultTo('principal');
      table.enum('status', ['active', 'inactive', 'maintenance']).defaultTo('active');
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.unique(['company_id', 'code']);
      table.index(['company_id']);
      table.index(['code']);
      table.index(['type']);
      table.index(['status']);
      table.index(['deleted_at']);
    })
    
    // Stock
    .createTable('stock', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.integer('warehouse_id').references('id').inTable('warehouses').onDelete('CASCADE');
      table.integer('product_id').references('id').inTable('products').onDelete('CASCADE');
      table.decimal('quantity', 12, 4).defaultTo(0);
      table.decimal('reserved_quantity', 12, 4).defaultTo(0);
      table.decimal('available_quantity', 12, 4).defaultTo(0);
      table.decimal('average_cost', 12, 4).defaultTo(0);
      table.decimal('last_cost', 12, 4).defaultTo(0);
      table.timestamp('last_movement_at');
      table.timestamps(true, true);
      
      table.unique(['company_id', 'warehouse_id', 'product_id']);
      table.index(['company_id']);
      table.index(['warehouse_id']);
      table.index(['product_id']);
      table.index(['quantity']);
      table.index(['available_quantity']);
    })
    
    // Stock Movements
    .createTable('stock_movements', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.integer('warehouse_id').references('id').inTable('warehouses').onDelete('CASCADE');
      table.integer('product_id').references('id').inTable('products').onDelete('CASCADE');
      table.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.enum('type', ['entrada', 'saida', 'transferencia', 'ajuste', 'inventario']).notNullable();
      table.enum('reason', ['compra', 'venda', 'producao', 'devolucao', 'ajuste', 'perda', 'transferencia']).notNullable();
      table.decimal('quantity', 12, 4).notNullable();
      table.decimal('cost', 12, 4).defaultTo(0);
      table.decimal('total_cost', 12, 4).defaultTo(0);
      table.string('reference_type', 50); // sales_order, purchase_order, etc
      table.integer('reference_id');
      table.text('notes');
      table.string('batch_number', 100);
      table.date('expiry_date');
      table.timestamp('movement_date').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      
      table.index(['company_id']);
      table.index(['warehouse_id']);
      table.index(['product_id']);
      table.index(['user_id']);
      table.index(['type']);
      table.index(['reason']);
      table.index(['reference_type', 'reference_id']);
      table.index(['movement_date']);
      table.index(['batch_number']);
    })
    
    // Stock Alerts
    .createTable('stock_alerts', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.integer('warehouse_id').references('id').inTable('warehouses').onDelete('CASCADE');
      table.integer('product_id').references('id').inTable('products').onDelete('CASCADE');
      table.enum('type', ['min_stock', 'max_stock', 'expired', 'expiring']).notNullable();
      table.decimal('current_quantity', 12, 4);
      table.decimal('threshold_quantity', 12, 4);
      table.enum('status', ['active', 'resolved', 'ignored']).defaultTo('active');
      table.timestamp('resolved_at');
      table.integer('resolved_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamps(true, true);
      
      table.index(['company_id']);
      table.index(['warehouse_id']);
      table.index(['product_id']);
      table.index(['type']);
      table.index(['status']);
      table.index(['created_at']);
    })
    
    // =====================================================
    // VND MODULE - VENDAS
    // =====================================================
    
    // Sales Pipeline
    .createTable('sales_pipeline', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.string('name', 100).notNullable();
      table.text('description');
      table.json('stages').defaultTo('[]');
      table.boolean('is_default').defaultTo(false);
      table.enum('status', ['active', 'inactive']).defaultTo('active');
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.index(['company_id']);
      table.index(['status']);
      table.index(['deleted_at']);
    })
    
    // Sales Opportunities
    .createTable('sales_opportunities', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.integer('client_id').references('id').inTable('clients').onDelete('CASCADE');
      table.integer('pipeline_id').references('id').inTable('sales_pipeline').onDelete('SET NULL');
      table.integer('user_id').references('id').inTable('users').onDelete('SET NULL'); // responsible
      table.string('title', 255).notNullable();
      table.text('description');
      table.decimal('estimated_value', 12, 2).defaultTo(0);
      table.integer('probability').defaultTo(0); // 0-100
      table.string('current_stage', 100);
      table.date('expected_close_date');
      table.enum('status', ['open', 'won', 'lost', 'cancelled']).defaultTo('open');
      table.text('notes');
      table.json('custom_fields').defaultTo('{}');
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.index(['company_id']);
      table.index(['client_id']);
      table.index(['pipeline_id']);
      table.index(['user_id']);
      table.index(['status']);
      table.index(['expected_close_date']);
      table.index(['deleted_at']);
    })
    
    // Quotations
    .createTable('quotations', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.integer('client_id').references('id').inTable('clients').onDelete('CASCADE');
      table.integer('opportunity_id').references('id').inTable('sales_opportunities').onDelete('SET NULL');
      table.integer('user_id').references('id').inTable('users').onDelete('SET NULL'); // salesperson
      table.string('number', 50).notNullable();
      table.date('quotation_date').defaultTo(knex.fn.now());
      table.date('valid_until');
      table.decimal('subtotal', 12, 2).defaultTo(0);
      table.decimal('discount_amount', 12, 2).defaultTo(0);
      table.decimal('tax_amount', 12, 2).defaultTo(0);
      table.decimal('total_amount', 12, 2).defaultTo(0);
      table.enum('status', ['draft', 'sent', 'approved', 'rejected', 'expired', 'converted']).defaultTo('draft');
      table.text('notes');
      table.json('payment_terms').defaultTo('{}');
      table.json('delivery_terms').defaultTo('{}');
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.unique(['company_id', 'number']);
      table.index(['company_id']);
      table.index(['client_id']);
      table.index(['opportunity_id']);
      table.index(['user_id']);
      table.index(['number']);
      table.index(['status']);
      table.index(['quotation_date']);
      table.index(['deleted_at']);
    })
    
    // Quotation Items
    .createTable('quotation_items', function(table) {
      table.increments('id').primary();
      table.integer('quotation_id').references('id').inTable('quotations').onDelete('CASCADE');
      table.integer('product_id').references('id').inTable('products').onDelete('CASCADE');
      table.decimal('quantity', 12, 4).notNullable();
      table.decimal('unit_price', 12, 4).notNullable();
      table.decimal('discount_percentage', 5, 2).defaultTo(0);
      table.decimal('discount_amount', 12, 2).defaultTo(0);
      table.decimal('subtotal', 12, 2).notNullable();
      table.text('notes');
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['quotation_id']);
      table.index(['product_id']);
      table.index(['sort_order']);
    })
    
    // Sales Orders
    .createTable('sales_orders', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.integer('client_id').references('id').inTable('clients').onDelete('CASCADE');
      table.integer('quotation_id').references('id').inTable('quotations').onDelete('SET NULL');
      table.integer('user_id').references('id').inTable('users').onDelete('SET NULL'); // salesperson
      table.string('number', 50).notNullable();
      table.date('order_date').defaultTo(knex.fn.now());
      table.date('delivery_date');
      table.decimal('subtotal', 12, 2).defaultTo(0);
      table.decimal('discount_amount', 12, 2).defaultTo(0);
      table.decimal('tax_amount', 12, 2).defaultTo(0);
      table.decimal('total_amount', 12, 2).defaultTo(0);
      table.enum('status', ['draft', 'confirmed', 'production', 'shipped', 'delivered', 'cancelled']).defaultTo('draft');
      table.text('notes');
      table.json('payment_terms').defaultTo('{}');
      table.json('delivery_terms').defaultTo('{}');
      table.json('shipping_address').defaultTo('{}');
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.unique(['company_id', 'number']);
      table.index(['company_id']);
      table.index(['client_id']);
      table.index(['quotation_id']);
      table.index(['user_id']);
      table.index(['number']);
      table.index(['status']);
      table.index(['order_date']);
      table.index(['delivery_date']);
      table.index(['deleted_at']);
    })
    
    // Sales Order Items
    .createTable('sales_order_items', function(table) {
      table.increments('id').primary();
      table.integer('sales_order_id').references('id').inTable('sales_orders').onDelete('CASCADE');
      table.integer('product_id').references('id').inTable('products').onDelete('CASCADE');
      table.decimal('quantity', 12, 4).notNullable();
      table.decimal('unit_price', 12, 4).notNullable();
      table.decimal('discount_percentage', 5, 2).defaultTo(0);
      table.decimal('discount_amount', 12, 2).defaultTo(0);
      table.decimal('subtotal', 12, 2).notNullable();
      table.decimal('delivered_quantity', 12, 4).defaultTo(0);
      table.text('notes');
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['sales_order_id']);
      table.index(['product_id']);
      table.index(['sort_order']);
    })
    
    // Sales Commissions
    .createTable('sales_commissions', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE'); // salesperson
      table.integer('sales_order_id').references('id').inTable('sales_orders').onDelete('CASCADE');
      table.decimal('base_amount', 12, 2).notNullable();
      table.decimal('commission_rate', 5, 2).notNullable();
      table.decimal('commission_amount', 12, 2).notNullable();
      table.date('due_date');
      table.date('paid_date');
      table.enum('status', ['pending', 'paid', 'cancelled']).defaultTo('pending');
      table.text('notes');
      table.timestamps(true, true);
      
      table.index(['company_id']);
      table.index(['user_id']);
      table.index(['sales_order_id']);
      table.index(['status']);
      table.index(['due_date']);
    })
    
    // =====================================================
    // CMP MODULE - COMPRAS
    // =====================================================
    
    // Purchase Requisitions
    .createTable('purchase_requisitions', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE'); // requester
      table.integer('department_id').references('id').inTable('users').onDelete('SET NULL'); // dept head
      table.string('number', 50).notNullable();
      table.date('requisition_date').defaultTo(knex.fn.now());
      table.date('needed_by');
      table.text('justification');
      table.decimal('total_amount', 12, 2).defaultTo(0);
      table.enum('status', ['draft', 'submitted', 'approved', 'rejected', 'converted']).defaultTo('draft');
      table.timestamp('approved_at');
      table.integer('approved_by').references('id').inTable('users').onDelete('SET NULL');
      table.text('approval_notes');
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.unique(['company_id', 'number']);
      table.index(['company_id']);
      table.index(['user_id']);
      table.index(['status']);
      table.index(['requisition_date']);
      table.index(['needed_by']);
      table.index(['deleted_at']);
    })
    
    // Purchase Requisition Items
    .createTable('purchase_requisition_items', function(table) {
      table.increments('id').primary();
      table.integer('requisition_id').references('id').inTable('purchase_requisitions').onDelete('CASCADE');
      table.integer('product_id').references('id').inTable('products').onDelete('CASCADE');
      table.decimal('quantity', 12, 4).notNullable();
      table.decimal('estimated_price', 12, 4).defaultTo(0);
      table.decimal('estimated_total', 12, 2).defaultTo(0);
      table.text('notes');
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['requisition_id']);
      table.index(['product_id']);
      table.index(['sort_order']);
    })
    
    // Purchase Orders
    .createTable('purchase_orders', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.integer('supplier_id').references('id').inTable('suppliers').onDelete('CASCADE');
      table.integer('user_id').references('id').inTable('users').onDelete('SET NULL'); // buyer
      table.string('number', 50).notNullable();
      table.date('order_date').defaultTo(knex.fn.now());
      table.date('expected_delivery');
      table.decimal('subtotal', 12, 2).defaultTo(0);
      table.decimal('discount_amount', 12, 2).defaultTo(0);
      table.decimal('tax_amount', 12, 2).defaultTo(0);
      table.decimal('total_amount', 12, 2).defaultTo(0);
      table.enum('status', ['draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled']).defaultTo('draft');
      table.text('notes');
      table.json('payment_terms').defaultTo('{}');
      table.json('delivery_terms').defaultTo('{}');
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.unique(['company_id', 'number']);
      table.index(['company_id']);
      table.index(['supplier_id']);
      table.index(['user_id']);
      table.index(['number']);
      table.index(['status']);
      table.index(['order_date']);
      table.index(['expected_delivery']);
      table.index(['deleted_at']);
    })
    
    // Purchase Order Items
    .createTable('purchase_order_items', function(table) {
      table.increments('id').primary();
      table.integer('purchase_order_id').references('id').inTable('purchase_orders').onDelete('CASCADE');
      table.integer('product_id').references('id').inTable('products').onDelete('CASCADE');
      table.decimal('quantity', 12, 4).notNullable();
      table.decimal('unit_price', 12, 4).notNullable();
      table.decimal('discount_percentage', 5, 2).defaultTo(0);
      table.decimal('discount_amount', 12, 2).defaultTo(0);
      table.decimal('subtotal', 12, 2).notNullable();
      table.decimal('received_quantity', 12, 4).defaultTo(0);
      table.text('notes');
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['purchase_order_id']);
      table.index(['product_id']);
      table.index(['sort_order']);
    })
    
    // Purchase Quotations
    .createTable('purchase_quotations', function(table) {
      table.increments('id').primary();
      table.integer('company_id').references('id').inTable('companies').onDelete('CASCADE');
      table.integer('supplier_id').references('id').inTable('suppliers').onDelete('CASCADE');
      table.integer('user_id').references('id').inTable('users').onDelete('SET NULL'); // buyer
      table.string('number', 50).notNullable();
      table.date('quotation_date').defaultTo(knex.fn.now());
      table.date('valid_until');
      table.decimal('subtotal', 12, 2).defaultTo(0);
      table.decimal('discount_amount', 12, 2).defaultTo(0);
      table.decimal('tax_amount', 12, 2).defaultTo(0);
      table.decimal('total_amount', 12, 2).defaultTo(0);
      table.enum('status', ['draft', 'sent', 'received', 'selected', 'rejected', 'expired']).defaultTo('draft');
      table.text('notes');
      table.json('payment_terms').defaultTo('{}');
      table.json('delivery_terms').defaultTo('{}');
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();
      
      table.unique(['company_id', 'number']);
      table.index(['company_id']);
      table.index(['supplier_id']);
      table.index(['user_id']);
      table.index(['number']);
      table.index(['status']);
      table.index(['quotation_date']);
      table.index(['deleted_at']);
    })
    
    // Purchase Quotation Items
    .createTable('purchase_quotation_items', function(table) {
      table.increments('id').primary();
      table.integer('quotation_id').references('id').inTable('purchase_quotations').onDelete('CASCADE');
      table.integer('product_id').references('id').inTable('products').onDelete('CASCADE');
      table.decimal('quantity', 12, 4).notNullable();
      table.decimal('unit_price', 12, 4).notNullable();
      table.decimal('discount_percentage', 5, 2).defaultTo(0);
      table.decimal('discount_amount', 12, 2).defaultTo(0);
      table.decimal('subtotal', 12, 2).notNullable();
      table.text('notes');
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['quotation_id']);
      table.index(['product_id']);
      table.index(['sort_order']);
    });
};

exports.down = function(knex) {
  return knex.schema
    // Drop in reverse order to respect foreign key constraints
    .dropTableIfExists('purchase_quotation_items')
    .dropTableIfExists('purchase_quotations')
    .dropTableIfExists('purchase_order_items')
    .dropTableIfExists('purchase_orders')
    .dropTableIfExists('purchase_requisition_items')
    .dropTableIfExists('purchase_requisitions')
    .dropTableIfExists('sales_commissions')
    .dropTableIfExists('sales_order_items')
    .dropTableIfExists('sales_orders')
    .dropTableIfExists('quotation_items')
    .dropTableIfExists('quotations')
    .dropTableIfExists('sales_opportunities')
    .dropTableIfExists('sales_pipeline')
    .dropTableIfExists('stock_alerts')
    .dropTableIfExists('stock_movements')
    .dropTableIfExists('stock')
    .dropTableIfExists('warehouses')
    .dropTableIfExists('price_list_items')
    .dropTableIfExists('price_lists')
    .dropTableIfExists('suppliers')
    .dropTableIfExists('clients')
    .dropTableIfExists('products')
    .dropTableIfExists('units')
    .dropTableIfExists('product_categories')
    .dropTableIfExists('users')
    .dropTableIfExists('companies');
};