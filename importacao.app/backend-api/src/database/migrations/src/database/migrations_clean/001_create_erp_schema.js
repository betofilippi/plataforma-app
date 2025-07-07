/**
 * Migration: Create ERP System Database Schema
 * Creates all core tables for the ERP system
 */

exports.up = async function(knex) {
  
  // 1. Users table
  await knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.enum('role', ['admin', 'manager', 'user', 'viewer']).notNullable().defaultTo('user');
    table.enum('status', ['active', 'inactive', 'suspended']).notNullable().defaultTo('active');
    table.string('avatar_url', 500).nullable();
    table.string('phone', 20).nullable();
    table.json('preferences').nullable(); // User preferences as JSON
    table.datetime('last_login').nullable();
    table.datetime('password_changed_at').nullable();
    table.boolean('force_password_change').defaultTo(false);
    table.timestamps(true, true); // created_at, updated_at
    
    // Indexes
    table.index(['email']);
    table.index(['role']);
    table.index(['status']);
    table.index(['created_at']);
  });

  // 2. Clients table
  await knex.schema.createTable('clients', function(table) {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('email', 255).nullable();
    table.string('phone', 20).nullable();
    table.string('mobile', 20).nullable();
    table.string('cpf_cnpj', 18).nullable().unique();
    table.enum('person_type', ['individual', 'company']).notNullable().defaultTo('individual');
    table.string('company_name', 255).nullable(); // Razão social
    table.string('trade_name', 255).nullable(); // Nome fantasia
    table.string('state_registration', 20).nullable(); // IE
    table.string('municipal_registration', 20).nullable(); // IM
    
    // Address fields
    table.string('address_street', 255).nullable();
    table.string('address_number', 10).nullable();
    table.string('address_complement', 100).nullable();
    table.string('address_neighborhood', 100).nullable();
    table.string('address_city', 100).nullable();
    table.string('address_state', 2).nullable();
    table.string('address_zipcode', 10).nullable();
    table.string('address_country', 100).defaultTo('Brasil');
    
    // Financial info
    table.decimal('credit_limit', 15, 2).defaultTo(0);
    table.decimal('current_balance', 15, 2).defaultTo(0);
    table.enum('payment_terms', ['cash', '30_days', '60_days', '90_days', 'custom']).defaultTo('cash');
    table.integer('custom_payment_days').nullable();
    
    // Status and categorization
    table.enum('status', ['active', 'inactive', 'blocked', 'pending']).notNullable().defaultTo('active');
    table.string('category', 100).nullable(); // Categoria do cliente
    table.string('segment', 100).nullable(); // Segmento de mercado
    table.string('origin', 100).nullable(); // Origem do cliente
    
    // Additional info
    table.text('notes').nullable();
    table.string('website', 255).nullable();
    table.json('contacts').nullable(); // Additional contacts as JSON
    table.json('custom_fields').nullable(); // Custom fields as JSON
    
    table.timestamps(true, true);
    
    // Indexes
    table.index(['cpf_cnpj']);
    table.index(['email']);
    table.index(['status']);
    table.index(['person_type']);
    table.index(['category']);
    table.index(['created_at']);
  });

  // 3. Products table
  await knex.schema.createTable('products', function(table) {
    table.increments('id').primary();
    table.string('code', 50).notNullable().unique();
    table.string('barcode', 50).nullable();
    table.string('description', 255).notNullable();
    table.text('detailed_description').nullable();
    table.string('category', 100).nullable();
    table.string('subcategory', 100).nullable();
    table.string('brand', 100).nullable();
    table.string('model', 100).nullable();
    table.string('unit', 10).notNullable().defaultTo('UN'); // UN, KG, M, etc.
    
    // Pricing
    table.decimal('cost_price', 15, 4).defaultTo(0);
    table.decimal('sale_price', 15, 4).defaultTo(0);
    table.decimal('margin_percentage', 5, 2).defaultTo(0);
    table.decimal('markup_percentage', 5, 2).defaultTo(0);
    table.decimal('discount_percentage', 5, 2).defaultTo(0);
    table.decimal('minimum_price', 15, 4).defaultTo(0);
    
    // Stock control
    table.integer('current_stock').defaultTo(0);
    table.integer('minimum_stock').defaultTo(0);
    table.integer('maximum_stock').defaultTo(0);
    table.integer('reorder_point').defaultTo(0);
    table.integer('reorder_quantity').defaultTo(0);
    table.enum('stock_control', ['yes', 'no']).defaultTo('yes');
    
    // Physical characteristics
    table.decimal('weight', 10, 3).nullable(); // kg
    table.decimal('height', 10, 3).nullable(); // cm
    table.decimal('width', 10, 3).nullable(); // cm
    table.decimal('length', 10, 3).nullable(); // cm
    
    // Tax information
    table.string('ncm_code', 8).nullable(); // NCM
    table.string('cest_code', 7).nullable(); // CEST
    table.decimal('icms_percentage', 5, 2).defaultTo(0);
    table.decimal('ipi_percentage', 5, 2).defaultTo(0);
    table.decimal('pis_percentage', 5, 2).defaultTo(0);
    table.decimal('cofins_percentage', 5, 2).defaultTo(0);
    
    // Status and classification
    table.enum('status', ['active', 'inactive', 'discontinued']).notNullable().defaultTo('active');
    table.enum('type', ['product', 'service', 'raw_material', 'finished_good']).defaultTo('product');
    table.boolean('is_kit').defaultTo(false);
    table.boolean('allow_fraction').defaultTo(false);
    
    // Additional info
    table.string('supplier_code', 50).nullable(); // Código do fornecedor
    table.string('location', 100).nullable(); // Localização no estoque
    table.json('images').nullable(); // Product images URLs
    table.json('specifications').nullable(); // Technical specifications
    table.json('custom_fields').nullable(); // Custom fields
    table.text('notes').nullable();
    
    table.timestamps(true, true);
    
    // Indexes
    table.index(['code']);
    table.index(['barcode']);
    table.index(['category']);
    table.index(['status']);
    table.index(['type']);
    table.index(['created_at']);
  });

  // 4. Suppliers table
  await knex.schema.createTable('suppliers', function(table) {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('cnpj', 18).notNullable().unique();
    table.string('company_name', 255).nullable(); // Razão social
    table.string('trade_name', 255).nullable(); // Nome fantasia
    table.string('state_registration', 20).nullable(); // IE
    table.string('municipal_registration', 20).nullable(); // IM
    
    // Contact information
    table.string('contact_person', 255).nullable();
    table.string('email', 255).nullable();
    table.string('phone', 20).nullable();
    table.string('mobile', 20).nullable();
    table.string('fax', 20).nullable();
    table.string('website', 255).nullable();
    
    // Address fields
    table.string('address_street', 255).nullable();
    table.string('address_number', 10).nullable();
    table.string('address_complement', 100).nullable();
    table.string('address_neighborhood', 100).nullable();
    table.string('address_city', 100).nullable();
    table.string('address_state', 2).nullable();
    table.string('address_zipcode', 10).nullable();
    table.string('address_country', 100).defaultTo('Brasil');
    
    // Financial and commercial terms
    table.enum('payment_terms', ['cash', '30_days', '60_days', '90_days', 'custom']).defaultTo('30_days');
    table.integer('custom_payment_days').nullable();
    table.decimal('credit_limit', 15, 2).defaultTo(0);
    table.decimal('current_balance', 15, 2).defaultTo(0);
    table.decimal('discount_percentage', 5, 2).defaultTo(0);
    table.integer('delivery_days').defaultTo(0);
    
    // Status and classification
    table.enum('status', ['active', 'inactive', 'blocked', 'pending']).notNullable().defaultTo('active');
    table.string('category', 100).nullable(); // Categoria do fornecedor
    table.string('segment', 100).nullable(); // Segmento de atuação
    table.integer('rating').nullable(); // Avaliação (1-5)
    
    // Bank information
    table.string('bank_name', 100).nullable();
    table.string('bank_agency', 10).nullable();
    table.string('bank_account', 20).nullable();
    table.string('pix_key', 100).nullable();
    
    // Additional info
    table.text('notes').nullable();
    table.json('contacts').nullable(); // Additional contacts as JSON
    table.json('products_supplied').nullable(); // List of product categories
    table.json('custom_fields').nullable(); // Custom fields as JSON
    
    table.timestamps(true, true);
    
    // Indexes
    table.index(['cnpj']);
    table.index(['email']);
    table.index(['status']);
    table.index(['category']);
    table.index(['created_at']);
  });

  // 5. Activities table (for audit/logging)
  await knex.schema.createTable('activities', function(table) {
    table.increments('id').primary();
    table.string('type', 50).notNullable(); // login, create, update, delete, etc.
    table.string('action', 100).notNullable(); // specific action description
    table.text('description').nullable(); // detailed description
    table.string('entity_type', 50).nullable(); // users, clients, products, etc.
    table.integer('entity_id').nullable(); // ID of the affected entity
    table.integer('user_id').nullable(); // User who performed the action
    table.string('ip_address', 45).nullable(); // IPv4 or IPv6
    table.string('user_agent', 500).nullable(); // Browser/client info
    table.json('old_values').nullable(); // Previous values (for updates)
    table.json('new_values').nullable(); // New values (for updates)
    table.json('metadata').nullable(); // Additional metadata
    table.enum('severity', ['low', 'medium', 'high', 'critical']).defaultTo('low');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['type']);
    table.index(['entity_type']);
    table.index(['entity_id']);
    table.index(['user_id']);
    table.index(['created_at']);
    table.index(['severity']);
  });

  // 6. Product Categories table
  await knex.schema.createTable('product_categories', function(table) {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('code', 20).nullable().unique();
    table.text('description').nullable();
    table.integer('parent_id').nullable();
    table.boolean('is_active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
    
    // Foreign key
    table.foreign('parent_id').references('id').inTable('product_categories').onDelete('SET NULL');
    
    // Indexes
    table.index(['parent_id']);
    table.index(['is_active']);
    table.index(['sort_order']);
  });

  // 7. Client Categories table
  await knex.schema.createTable('client_categories', function(table) {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.string('code', 20).nullable().unique();
    table.text('description').nullable();
    table.boolean('is_active').defaultTo(true);
    table.decimal('default_discount', 5, 2).defaultTo(0);
    table.timestamps(true, true);
    
    // Indexes
    table.index(['is_active']);
  });

  // 8. Supplier Categories table
  await knex.schema.createTable('supplier_categories', function(table) {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.string('code', 20).nullable().unique();
    table.text('description').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // Indexes
    table.index(['is_active']);
  });

  // 9. System Settings table
  await knex.schema.createTable('system_settings', function(table) {
    table.increments('id').primary();
    table.string('key', 100).notNullable().unique();
    table.text('value').nullable();
    table.string('type', 20).defaultTo('string'); // string, number, boolean, json
    table.string('category', 50).nullable(); // general, security, email, etc.
    table.text('description').nullable();
    table.boolean('is_public').defaultTo(false); // Can be accessed by frontend
    table.timestamps(true, true);
    
    // Indexes
    table.index(['key']);
    table.index(['category']);
    table.index(['is_public']);
  });

  console.log('✅ ERP database schema created successfully');
};

exports.down = async function(knex) {
  // Drop tables in reverse order to avoid foreign key constraints
  await knex.schema.dropTableIfExists('system_settings');
  await knex.schema.dropTableIfExists('supplier_categories');
  await knex.schema.dropTableIfExists('client_categories');
  await knex.schema.dropTableIfExists('product_categories');
  await knex.schema.dropTableIfExists('activities');
  await knex.schema.dropTableIfExists('suppliers');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('clients');
  await knex.schema.dropTableIfExists('users');
  
  console.log('✅ ERP database schema dropped successfully');
};