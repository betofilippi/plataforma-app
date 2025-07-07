/**
 * CAD Module - Cadastros (Registrations)
 * Tables: companies, clients, suppliers, products, categories, units, price_lists
 */

exports.up = function(knex) {
  return knex.schema
    // Companies table
    .createTable('companies', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.string('legal_name', 255);
      table.string('cnpj', 18).unique();
      table.string('cpf', 14).unique();
      table.string('ie', 50); // Inscricao Estadual
      table.string('im', 50); // Inscricao Municipal
      table.enum('type', ['matriz', 'filial', 'terceiro']).defaultTo('matriz');
      table.enum('status', ['active', 'inactive']).defaultTo('active');
      
      // Address
      table.string('address', 255);
      table.string('address_number', 20);
      table.string('address_complement', 100);
      table.string('neighborhood', 100);
      table.string('city', 100);
      table.string('state', 2);
      table.string('country', 100).defaultTo('Brasil');
      table.string('postal_code', 10);
      
      // Contact
      table.string('phone', 20);
      table.string('mobile', 20);
      table.string('email', 255);
      table.string('website', 255);
      
      // Business info
      table.text('notes');
      table.json('additional_data').defaultTo('{}');
      table.timestamps(true, true);
      
      table.index(['cnpj']);
      table.index(['cpf']);
      table.index(['name']);
      table.index(['status']);
    })
    
    // Categories table
    .then(() => {
      return knex.schema.createTable('categories', function(table) {
        table.increments('id').primary();
        table.string('name', 100).notNullable();
        table.string('code', 50).unique();
        table.text('description');
        table.integer('parent_id').references('id').inTable('categories').onDelete('SET NULL');
        table.enum('status', ['active', 'inactive']).defaultTo('active');
        table.json('additional_data').defaultTo('{}');
        table.timestamps(true, true);
        
        table.index(['code']);
        table.index(['name']);
        table.index(['parent_id']);
        table.index(['status']);
      });
    })
    
    // Units table
    .then(() => {
      return knex.schema.createTable('units', function(table) {
        table.increments('id').primary();
        table.string('name', 50).notNullable();
        table.string('symbol', 10).notNullable().unique();
        table.text('description');
        table.enum('type', ['weight', 'length', 'volume', 'quantity', 'time', 'other']).defaultTo('quantity');
        table.decimal('conversion_factor', 10, 4).defaultTo(1);
        table.integer('base_unit_id').references('id').inTable('units').onDelete('SET NULL');
        table.enum('status', ['active', 'inactive']).defaultTo('active');
        table.timestamps(true, true);
        
        table.index(['symbol']);
        table.index(['type']);
        table.index(['status']);
      });
    })
    
    // Products table
    .then(() => {
      return knex.schema.createTable('products', function(table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.string('code', 100).unique();
        table.string('sku', 100).unique();
        table.string('ean', 20);
        table.string('ncm', 20); // Nomenclatura Comum do Mercosul
        table.string('cest', 20); // Codigo Especificador da Substituicao Tributaria
        table.text('description');
        table.text('specifications');
        
        // Classification
        table.integer('category_id').references('id').inTable('categories').onDelete('SET NULL');
        table.integer('unit_id').references('id').inTable('units').onDelete('SET NULL');
        table.enum('type', ['product', 'service', 'raw_material', 'finished_good']).defaultTo('product');
        table.enum('status', ['active', 'inactive', 'discontinued']).defaultTo('active');
        
        // Pricing
        table.decimal('cost_price', 10, 2).defaultTo(0);
        table.decimal('sale_price', 10, 2).defaultTo(0);
        table.decimal('suggested_price', 10, 2).defaultTo(0);
        table.decimal('weight', 10, 3).defaultTo(0);
        table.decimal('length', 10, 3).defaultTo(0);
        table.decimal('width', 10, 3).defaultTo(0);
        table.decimal('height', 10, 3).defaultTo(0);
        
        // Stock control
        table.boolean('manage_stock').defaultTo(true);
        table.integer('min_stock').defaultTo(0);
        table.integer('max_stock').defaultTo(0);
        table.integer('reorder_point').defaultTo(0);
        
        // Tax information
        table.string('tax_origin', 1).defaultTo('0'); // 0=Nacional, 1=Estrangeira-Importacao direta, 2=Estrangeira-Adquirida no mercado interno
        table.decimal('icms_rate', 5, 2).defaultTo(0);
        table.decimal('ipi_rate', 5, 2).defaultTo(0);
        table.decimal('pis_rate', 5, 2).defaultTo(0);
        table.decimal('cofins_rate', 5, 2).defaultTo(0);
        
        // Additional data
        table.json('images').defaultTo('[]');
        table.json('attributes').defaultTo('{}');
        table.json('additional_data').defaultTo('{}');
        table.timestamps(true, true);
        
        table.index(['code']);
        table.index(['sku']);
        table.index(['ean']);
        table.index(['ncm']);
        table.index(['category_id']);
        table.index(['status']);
        table.index(['type']);
      });
    })
    
    // Clients table
    .then(() => {
      return knex.schema.createTable('clients', function(table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.string('legal_name', 255);
        table.string('cnpj', 18).unique();
        table.string('cpf', 14).unique();
        table.string('ie', 50); // Inscricao Estadual
        table.string('im', 50); // Inscricao Municipal
        table.enum('type', ['individual', 'company']).defaultTo('individual');
        table.enum('status', ['active', 'inactive', 'blocked']).defaultTo('active');
        
        // Address
        table.string('address', 255);
        table.string('address_number', 20);
        table.string('address_complement', 100);
        table.string('neighborhood', 100);
        table.string('city', 100);
        table.string('state', 2);
        table.string('country', 100).defaultTo('Brasil');
        table.string('postal_code', 10);
        
        // Contact
        table.string('phone', 20);
        table.string('mobile', 20);
        table.string('email', 255);
        table.string('website', 255);
        table.string('contact_person', 255);
        
        // Business info
        table.decimal('credit_limit', 10, 2).defaultTo(0);
        table.integer('payment_terms').defaultTo(30); // days
        table.enum('payment_method', ['cash', 'credit_card', 'bank_transfer', 'check', 'pix']).defaultTo('cash');
        table.decimal('discount_percentage', 5, 2).defaultTo(0);
        table.integer('price_list_id').references('id').inTable('price_lists').onDelete('SET NULL');
        
        // Sales info
        table.string('sales_rep', 255);
        table.string('segment', 100);
        table.string('origin', 100);
        table.date('first_purchase_date');
        table.date('last_purchase_date');
        table.decimal('total_purchases', 12, 2).defaultTo(0);
        table.integer('purchase_count').defaultTo(0);
        
        table.text('notes');
        table.json('additional_data').defaultTo('{}');
        table.timestamps(true, true);
        
        table.index(['cnpj']);
        table.index(['cpf']);
        table.index(['name']);
        table.index(['email']);
        table.index(['status']);
        table.index(['type']);
        table.index(['segment']);
      });
    })
    
    // Suppliers table
    .then(() => {
      return knex.schema.createTable('suppliers', function(table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.string('legal_name', 255);
        table.string('cnpj', 18).unique();
        table.string('cpf', 14).unique();
        table.string('ie', 50); // Inscricao Estadual
        table.string('im', 50); // Inscricao Municipal
        table.enum('type', ['individual', 'company']).defaultTo('company');
        table.enum('status', ['active', 'inactive', 'blocked']).defaultTo('active');
        
        // Address
        table.string('address', 255);
        table.string('address_number', 20);
        table.string('address_complement', 100);
        table.string('neighborhood', 100);
        table.string('city', 100);
        table.string('state', 2);
        table.string('country', 100).defaultTo('Brasil');
        table.string('postal_code', 10);
        
        // Contact
        table.string('phone', 20);
        table.string('mobile', 20);
        table.string('email', 255);
        table.string('website', 255);
        table.string('contact_person', 255);
        
        // Business info
        table.integer('payment_terms').defaultTo(30); // days
        table.enum('payment_method', ['cash', 'credit_card', 'bank_transfer', 'check', 'pix']).defaultTo('bank_transfer');
        table.decimal('discount_percentage', 5, 2).defaultTo(0);
        table.integer('delivery_time').defaultTo(0); // days
        table.decimal('min_order_value', 10, 2).defaultTo(0);
        
        // Purchase info
        table.string('buyer_responsible', 255);
        table.string('segment', 100);
        table.date('first_purchase_date');
        table.date('last_purchase_date');
        table.decimal('total_purchases', 12, 2).defaultTo(0);
        table.integer('purchase_count').defaultTo(0);
        
        // Performance metrics
        table.decimal('quality_rating', 3, 2).defaultTo(0); // 0-5 scale
        table.decimal('delivery_rating', 3, 2).defaultTo(0); // 0-5 scale
        table.decimal('service_rating', 3, 2).defaultTo(0); // 0-5 scale
        table.decimal('overall_rating', 3, 2).defaultTo(0); // 0-5 scale
        
        table.text('notes');
        table.json('additional_data').defaultTo('{}');
        table.timestamps(true, true);
        
        table.index(['cnpj']);
        table.index(['cpf']);
        table.index(['name']);
        table.index(['email']);
        table.index(['status']);
        table.index(['type']);
        table.index(['segment']);
      });
    })
    
    // Price lists table
    .then(() => {
      return knex.schema.createTable('price_lists', function(table) {
        table.increments('id').primary();
        table.string('name', 100).notNullable();
        table.string('code', 50).unique();
        table.text('description');
        table.enum('type', ['standard', 'promotional', 'wholesale', 'retail']).defaultTo('standard');
        table.date('valid_from');
        table.date('valid_to');
        table.decimal('discount_percentage', 5, 2).defaultTo(0);
        table.decimal('markup_percentage', 5, 2).defaultTo(0);
        table.enum('status', ['active', 'inactive', 'draft']).defaultTo('active');
        table.json('additional_data').defaultTo('{}');
        table.timestamps(true, true);
        
        table.index(['code']);
        table.index(['name']);
        table.index(['status']);
        table.index(['type']);
      });
    })
    
    // Price list items table
    .then(() => {
      return knex.schema.createTable('price_list_items', function(table) {
        table.increments('id').primary();
        table.integer('price_list_id').references('id').inTable('price_lists').onDelete('CASCADE');
        table.integer('product_id').references('id').inTable('products').onDelete('CASCADE');
        table.decimal('price', 10, 2).notNullable();
        table.decimal('cost', 10, 2).defaultTo(0);
        table.decimal('discount_percentage', 5, 2).defaultTo(0);
        table.decimal('markup_percentage', 5, 2).defaultTo(0);
        table.integer('min_quantity').defaultTo(1);
        table.date('valid_from');
        table.date('valid_to');
        table.enum('status', ['active', 'inactive']).defaultTo('active');
        table.timestamps(true, true);
        
        table.unique(['price_list_id', 'product_id']);
        table.index(['price_list_id']);
        table.index(['product_id']);
        table.index(['status']);
      });
    })
    
    // Insert default data
    .then(() => {
      return knex('units').insert([
        { name: 'Unidade', symbol: 'UN', type: 'quantity' },
        { name: 'Quilograma', symbol: 'KG', type: 'weight' },
        { name: 'Grama', symbol: 'G', type: 'weight', conversion_factor: 0.001 },
        { name: 'Litro', symbol: 'L', type: 'volume' },
        { name: 'Mililitro', symbol: 'ML', type: 'volume', conversion_factor: 0.001 },
        { name: 'Metro', symbol: 'M', type: 'length' },
        { name: 'Centímetro', symbol: 'CM', type: 'length', conversion_factor: 0.01 },
        { name: 'Caixa', symbol: 'CX', type: 'quantity' },
        { name: 'Pacote', symbol: 'PC', type: 'quantity' },
        { name: 'Dúzia', symbol: 'DZ', type: 'quantity', conversion_factor: 12 }
      ]);
    })
    
    .then(() => {
      return knex('categories').insert([
        { name: 'Geral', code: 'GERAL', description: 'Categoria geral para produtos' },
        { name: 'Matéria Prima', code: 'MP', description: 'Matérias primas' },
        { name: 'Produto Acabado', code: 'PA', description: 'Produtos acabados' },
        { name: 'Serviços', code: 'SERV', description: 'Serviços prestados' }
      ]);
    })
    
    .then(() => {
      return knex('price_lists').insert([
        { name: 'Tabela Padrão', code: 'PADRAO', description: 'Tabela de preços padrão', type: 'standard' },
        { name: 'Atacado', code: 'ATACADO', description: 'Preços para atacado', type: 'wholesale' },
        { name: 'Varejo', code: 'VAREJO', description: 'Preços para varejo', type: 'retail' }
      ]);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('price_list_items')
    .dropTableIfExists('price_lists')
    .dropTableIfExists('suppliers')
    .dropTableIfExists('clients')
    .dropTableIfExists('products')
    .dropTableIfExists('units')
    .dropTableIfExists('categories')
    .dropTableIfExists('companies');
};