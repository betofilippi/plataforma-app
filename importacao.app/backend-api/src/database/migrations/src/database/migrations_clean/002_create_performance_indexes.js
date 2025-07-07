/**
 * Migration: Create Performance Indexes
 * Adds additional indexes for optimal query performance
 */

exports.up = async function(knex) {
  
  // Composite indexes for common queries
  
  // Users table indexes
  await knex.schema.alterTable('users', function(table) {
    table.index(['status', 'role'], 'idx_users_status_role');
    table.index(['last_login'], 'idx_users_last_login');
    table.index(['created_at', 'status'], 'idx_users_created_status');
  });

  // Clients table indexes
  await knex.schema.alterTable('clients', function(table) {
    table.index(['status', 'person_type'], 'idx_clients_status_type');
    table.index(['category', 'status'], 'idx_clients_category_status');
    table.index(['address_city', 'address_state'], 'idx_clients_city_state');
    table.index(['current_balance'], 'idx_clients_balance');
    table.index(['credit_limit'], 'idx_clients_credit_limit');
    table.index(['name'], 'idx_clients_name'); // For search
  });

  // Products table indexes
  await knex.schema.alterTable('products', function(table) {
    table.index(['status', 'type'], 'idx_products_status_type');
    table.index(['category', 'subcategory'], 'idx_products_category_subcategory');
    table.index(['current_stock', 'minimum_stock'], 'idx_products_stock_levels');
    table.index(['sale_price'], 'idx_products_sale_price');
    table.index(['cost_price'], 'idx_products_cost_price');
    table.index(['description'], 'idx_products_description'); // For search
    table.index(['brand'], 'idx_products_brand');
    table.index(['ncm_code'], 'idx_products_ncm');
  });

  // Suppliers table indexes
  await knex.schema.alterTable('suppliers', function(table) {
    table.index(['status', 'category'], 'idx_suppliers_status_category');
    table.index(['address_city', 'address_state'], 'idx_suppliers_city_state');
    table.index(['current_balance'], 'idx_suppliers_balance');
    table.index(['rating'], 'idx_suppliers_rating');
    table.index(['name'], 'idx_suppliers_name'); // For search
  });

  // Activities table indexes
  await knex.schema.alterTable('activities', function(table) {
    table.index(['type', 'entity_type'], 'idx_activities_type_entity');
    table.index(['entity_type', 'entity_id'], 'idx_activities_entity_lookup');
    table.index(['user_id', 'created_at'], 'idx_activities_user_date');
    table.index(['created_at', 'severity'], 'idx_activities_date_severity');
  });

  // Full-text search indexes (SQLite FTS5 for better search performance)
  // Note: These are virtual tables for full-text search
  
  // Clients search index
  await knex.raw(`
    CREATE VIRTUAL TABLE IF NOT EXISTS clients_fts USING fts5(
      name,
      company_name,
      trade_name,
      email,
      cpf_cnpj,
      content=clients,
      content_rowid=id
    );
  `);

  // Products search index
  await knex.raw(`
    CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
      code,
      description,
      detailed_description,
      category,
      brand,
      model,
      content=products,
      content_rowid=id
    );
  `);

  // Suppliers search index
  await knex.raw(`
    CREATE VIRTUAL TABLE IF NOT EXISTS suppliers_fts USING fts5(
      name,
      company_name,
      trade_name,
      contact_person,
      email,
      content=suppliers,
      content_rowid=id
    );
  `);

  // Create triggers to maintain FTS indexes
  
  // Clients FTS triggers
  await knex.raw(`
    CREATE TRIGGER clients_fts_insert AFTER INSERT ON clients BEGIN
      INSERT INTO clients_fts(rowid, name, company_name, trade_name, email, cpf_cnpj)
      VALUES (new.id, new.name, new.company_name, new.trade_name, new.email, new.cpf_cnpj);
    END;
  `);

  await knex.raw(`
    CREATE TRIGGER clients_fts_delete AFTER DELETE ON clients BEGIN
      DELETE FROM clients_fts WHERE rowid = old.id;
    END;
  `);

  await knex.raw(`
    CREATE TRIGGER clients_fts_update AFTER UPDATE ON clients BEGIN
      DELETE FROM clients_fts WHERE rowid = old.id;
      INSERT INTO clients_fts(rowid, name, company_name, trade_name, email, cpf_cnpj)
      VALUES (new.id, new.name, new.company_name, new.trade_name, new.email, new.cpf_cnpj);
    END;
  `);

  // Products FTS triggers
  await knex.raw(`
    CREATE TRIGGER products_fts_insert AFTER INSERT ON products BEGIN
      INSERT INTO products_fts(rowid, code, description, detailed_description, category, brand, model)
      VALUES (new.id, new.code, new.description, new.detailed_description, new.category, new.brand, new.model);
    END;
  `);

  await knex.raw(`
    CREATE TRIGGER products_fts_delete AFTER DELETE ON products BEGIN
      DELETE FROM products_fts WHERE rowid = old.id;
    END;
  `);

  await knex.raw(`
    CREATE TRIGGER products_fts_update AFTER UPDATE ON products BEGIN
      DELETE FROM products_fts WHERE rowid = old.id;
      INSERT INTO products_fts(rowid, code, description, detailed_description, category, brand, model)
      VALUES (new.id, new.code, new.description, new.detailed_description, new.category, new.brand, new.model);
    END;
  `);

  // Suppliers FTS triggers
  await knex.raw(`
    CREATE TRIGGER suppliers_fts_insert AFTER INSERT ON suppliers BEGIN
      INSERT INTO suppliers_fts(rowid, name, company_name, trade_name, contact_person, email)
      VALUES (new.id, new.name, new.company_name, new.trade_name, new.contact_person, new.email);
    END;
  `);

  await knex.raw(`
    CREATE TRIGGER suppliers_fts_delete AFTER DELETE ON suppliers BEGIN
      DELETE FROM suppliers_fts WHERE rowid = old.id;
    END;
  `);

  await knex.raw(`
    CREATE TRIGGER suppliers_fts_update AFTER UPDATE ON suppliers BEGIN
      DELETE FROM suppliers_fts WHERE rowid = old.id;
      INSERT INTO suppliers_fts(rowid, name, company_name, trade_name, contact_person, email)
      VALUES (new.id, new.name, new.company_name, new.trade_name, new.contact_person, new.email);
    END;
  `);

  console.log('✅ Performance indexes and full-text search created successfully');
};

exports.down = async function(knex) {
  
  // Drop FTS triggers
  await knex.raw('DROP TRIGGER IF EXISTS clients_fts_insert;');
  await knex.raw('DROP TRIGGER IF EXISTS clients_fts_delete;');
  await knex.raw('DROP TRIGGER IF EXISTS clients_fts_update;');
  await knex.raw('DROP TRIGGER IF EXISTS products_fts_insert;');
  await knex.raw('DROP TRIGGER IF EXISTS products_fts_delete;');
  await knex.raw('DROP TRIGGER IF EXISTS products_fts_update;');
  await knex.raw('DROP TRIGGER IF EXISTS suppliers_fts_insert;');
  await knex.raw('DROP TRIGGER IF EXISTS suppliers_fts_delete;');
  await knex.raw('DROP TRIGGER IF EXISTS suppliers_fts_update;');

  // Drop FTS tables
  await knex.raw('DROP TABLE IF EXISTS clients_fts;');
  await knex.raw('DROP TABLE IF EXISTS products_fts;');
  await knex.raw('DROP TABLE IF EXISTS suppliers_fts;');

  // Drop composite indexes
  await knex.schema.alterTable('users', function(table) {
    table.dropIndex(['status', 'role'], 'idx_users_status_role');
    table.dropIndex(['last_login'], 'idx_users_last_login');
    table.dropIndex(['created_at', 'status'], 'idx_users_created_status');
  });

  await knex.schema.alterTable('clients', function(table) {
    table.dropIndex(['status', 'person_type'], 'idx_clients_status_type');
    table.dropIndex(['category', 'status'], 'idx_clients_category_status');
    table.dropIndex(['address_city', 'address_state'], 'idx_clients_city_state');
    table.dropIndex(['current_balance'], 'idx_clients_balance');
    table.dropIndex(['credit_limit'], 'idx_clients_credit_limit');
    table.dropIndex(['name'], 'idx_clients_name');
  });

  await knex.schema.alterTable('products', function(table) {
    table.dropIndex(['status', 'type'], 'idx_products_status_type');
    table.dropIndex(['category', 'subcategory'], 'idx_products_category_subcategory');
    table.dropIndex(['current_stock', 'minimum_stock'], 'idx_products_stock_levels');
    table.dropIndex(['sale_price'], 'idx_products_sale_price');
    table.dropIndex(['cost_price'], 'idx_products_cost_price');
    table.dropIndex(['description'], 'idx_products_description');
    table.dropIndex(['brand'], 'idx_products_brand');
    table.dropIndex(['ncm_code'], 'idx_products_ncm');
  });

  await knex.schema.alterTable('suppliers', function(table) {
    table.dropIndex(['status', 'category'], 'idx_suppliers_status_category');
    table.dropIndex(['address_city', 'address_state'], 'idx_suppliers_city_state');
    table.dropIndex(['current_balance'], 'idx_suppliers_balance');
    table.dropIndex(['rating'], 'idx_suppliers_rating');
    table.dropIndex(['name'], 'idx_suppliers_name');
  });

  await knex.schema.alterTable('activities', function(table) {
    table.dropIndex(['type', 'entity_type'], 'idx_activities_type_entity');
    table.dropIndex(['entity_type', 'entity_id'], 'idx_activities_entity_lookup');
    table.dropIndex(['user_id', 'created_at'], 'idx_activities_user_date');
    table.dropIndex(['created_at', 'severity'], 'idx_activities_date_severity');
  });

  console.log('✅ Performance indexes dropped successfully');
};