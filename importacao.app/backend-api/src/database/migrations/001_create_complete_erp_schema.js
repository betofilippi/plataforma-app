/**
 * Complete ERP Database Schema for SQLite
 * This migration creates all necessary tables for the ERP system
 */

exports.up = async function(knex) {
  // Create auth_users table
  await knex.schema.createTable('auth_users', (table) => {
    table.increments('id').primary();
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('role').defaultTo('user');
    table.text('preferences').defaultTo('{}');
    table.datetime('last_login_at');
    table.string('status').defaultTo('active');
    table.timestamps(true, true);
  });

  // Create auth_sessions table
  await knex.schema.createTable('auth_sessions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('auth_users').onDelete('CASCADE');
    table.string('token_hash').notNullable();
    table.string('refresh_token_hash').notNullable();
    table.datetime('expires_at').notNullable();
    table.string('ip_address');
    table.text('user_agent');
    table.timestamps(true, true);
  });

  // Create importacao_clientes table
  await knex.schema.createTable('importacao_clientes', (table) => {
    table.increments('id').primary();
    table.string('nome').notNullable();
    table.string('email').unique();
    table.string('telefone');
    table.string('cpf_cnpj');
    table.string('tipo_pessoa').defaultTo('F'); // F = Física, J = Jurídica
    table.text('endereco');
    table.string('cidade');
    table.string('estado');
    table.string('cep');
    table.string('status').defaultTo('ativo');
    table.decimal('limite_credito', 10, 2).defaultTo(0);
    table.decimal('saldo_devedor', 10, 2).defaultTo(0);
    table.date('data_cadastro').defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });

  // Create importacao_fornecedores table
  await knex.schema.createTable('importacao_fornecedores', (table) => {
    table.increments('id').primary();
    table.string('nome').notNullable();
    table.string('email');
    table.string('telefone');
    table.string('cnpj');
    table.text('endereco');
    table.string('cidade');
    table.string('estado');
    table.string('cep');
    table.string('status').defaultTo('ativo');
    table.string('contato_principal');
    table.text('observacoes');
    table.timestamps(true, true);
  });

  // Create importacao_categorias table
  await knex.schema.createTable('importacao_categorias', (table) => {
    table.increments('id').primary();
    table.string('nome').notNullable();
    table.string('descricao');
    table.string('status').defaultTo('ativo');
    table.integer('parent_id').unsigned().references('id').inTable('importacao_categorias');
    table.timestamps(true, true);
  });

  // Create importacao_produtos table
  await knex.schema.createTable('importacao_produtos', (table) => {
    table.increments('id').primary();
    table.string('nome').notNullable();
    table.string('codigo_barras');
    table.string('sku').unique();
    table.text('descricao');
    table.integer('categoria_id').unsigned().references('id').inTable('importacao_categorias');
    table.decimal('preco_custo', 10, 2).defaultTo(0);
    table.decimal('preco_venda', 10, 2).defaultTo(0);
    table.decimal('margem_lucro', 5, 2).defaultTo(0);
    table.string('unidade_medida').defaultTo('UN');
    table.decimal('peso', 8, 3).defaultTo(0);
    table.text('dimensoes');
    table.string('status').defaultTo('ativo');
    table.integer('estoque_minimo').defaultTo(0);
    table.integer('estoque_maximo').defaultTo(0);
    table.timestamps(true, true);
  });

  // Create importacao_estoque table
  await knex.schema.createTable('importacao_estoque', (table) => {
    table.increments('id').primary();
    table.integer('produto_id').unsigned().references('id').inTable('importacao_produtos').onDelete('CASCADE');
    table.integer('quantidade').defaultTo(0);
    table.integer('quantidade_reservada').defaultTo(0);
    table.decimal('custo_medio', 10, 2).defaultTo(0);
    table.string('localizacao');
    table.date('data_ultimo_movimento');
    table.timestamps(true, true);
  });

  // Create importacao_vendas table
  await knex.schema.createTable('importacao_vendas', (table) => {
    table.increments('id').primary();
    table.string('numero_venda').unique();
    table.integer('cliente_id').unsigned().references('id').inTable('importacao_clientes');
    table.string('cliente_nome');
    table.date('data_venda').defaultTo(knex.fn.now());
    table.decimal('valor_total', 10, 2).defaultTo(0);
    table.decimal('valor_desconto', 10, 2).defaultTo(0);
    table.decimal('valor_frete', 10, 2).defaultTo(0);
    table.string('status').defaultTo('pendente');
    table.string('forma_pagamento');
    table.text('observacoes');
    table.timestamps(true, true);
  });

  // Create importacao_vendas_itens table
  await knex.schema.createTable('importacao_vendas_itens', (table) => {
    table.increments('id').primary();
    table.integer('venda_id').unsigned().references('id').inTable('importacao_vendas').onDelete('CASCADE');
    table.integer('produto_id').unsigned().references('id').inTable('importacao_produtos');
    table.integer('quantidade').defaultTo(1);
    table.decimal('preco_unitario', 10, 2).defaultTo(0);
    table.decimal('preco_total', 10, 2).defaultTo(0);
    table.decimal('desconto', 10, 2).defaultTo(0);
    table.timestamps(true, true);
  });

  // Create importacao_pedidos table
  await knex.schema.createTable('importacao_pedidos', (table) => {
    table.increments('id').primary();
    table.string('numero_pedido').unique();
    table.integer('cliente_id').unsigned().references('id').inTable('importacao_clientes');
    table.string('cliente_nome');
    table.date('data_pedido').defaultTo(knex.fn.now());
    table.date('data_prevista_entrega');
    table.decimal('valor_total', 10, 2).defaultTo(0);
    table.string('status').defaultTo('pendente');
    table.string('forma_pagamento');
    table.text('observacoes');
    table.timestamps(true, true);
  });

  // Create importacao_pedidos_itens table
  await knex.schema.createTable('importacao_pedidos_itens', (table) => {
    table.increments('id').primary();
    table.integer('pedido_id').unsigned().references('id').inTable('importacao_pedidos').onDelete('CASCADE');
    table.integer('produto_id').unsigned().references('id').inTable('importacao_produtos');
    table.integer('quantidade').defaultTo(1);
    table.decimal('preco_unitario', 10, 2).defaultTo(0);
    table.decimal('preco_total', 10, 2).defaultTo(0);
    table.timestamps(true, true);
  });

  // Create importacao_notas_fiscais table
  await knex.schema.createTable('importacao_notas_fiscais', (table) => {
    table.increments('id').primary();
    table.string('numero_nf').unique();
    table.string('serie');
    table.string('chave_acesso');
    table.integer('cliente_id').unsigned().references('id').inTable('importacao_clientes');
    table.integer('venda_id').unsigned().references('id').inTable('importacao_vendas');
    table.date('data_emissao').defaultTo(knex.fn.now());
    table.decimal('valor_total', 10, 2).defaultTo(0);
    table.decimal('valor_icms', 10, 2).defaultTo(0);
    table.decimal('valor_ipi', 10, 2).defaultTo(0);
    table.string('status').defaultTo('pendente');
    table.text('xml_nfe');
    table.timestamps(true, true);
  });

  // Create importacao_transporte table
  await knex.schema.createTable('importacao_transporte', (table) => {
    table.increments('id').primary();
    table.string('numero_tracking');
    table.integer('pedido_id').unsigned().references('id').inTable('importacao_pedidos');
    table.string('transportadora');
    table.decimal('valor_frete', 10, 2).defaultTo(0);
    table.date('data_saida');
    table.date('data_prevista_entrega');
    table.date('data_entrega');
    table.string('status').defaultTo('pendente');
    table.text('observacoes');
    table.timestamps(true, true);
  });

  // Create importacao_usuarios table
  await knex.schema.createTable('importacao_usuarios', (table) => {
    table.increments('id').primary();
    table.string('nome').notNullable();
    table.string('email').unique().notNullable();
    table.string('telefone');
    table.string('cargo');
    table.string('departamento');
    table.string('status').defaultTo('ativo');
    table.text('permissoes');
    table.timestamps(true, true);
  });

  // Create importacao_configuracoes table
  await knex.schema.createTable('importacao_configuracoes', (table) => {
    table.increments('id').primary();
    table.string('chave').unique().notNullable();
    table.text('valor');
    table.string('tipo').defaultTo('string');
    table.string('categoria').defaultTo('geral');
    table.text('descricao');
    table.timestamps(true, true);
  });

  // Create importacao_relatorios table
  await knex.schema.createTable('importacao_relatorios', (table) => {
    table.increments('id').primary();
    table.string('nome').notNullable();
    table.string('tipo');
    table.text('parametros');
    table.text('query_sql');
    table.string('formato').defaultTo('pdf');
    table.string('status').defaultTo('ativo');
    table.integer('usuario_id').unsigned().references('id').inTable('importacao_usuarios');
    table.timestamps(true, true);
  });

  // Create integration tables
  await knex.schema.createTable('importacao_integracao_ml', (table) => {
    table.increments('id').primary();
    table.string('ml_item_id');
    table.integer('produto_id').unsigned().references('id').inTable('importacao_produtos');
    table.string('status').defaultTo('ativo');
    table.decimal('preco_ml', 10, 2);
    table.integer('quantidade_disponivel');
    table.datetime('ultima_sincronizacao');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('importacao_integracao_instagram', (table) => {
    table.increments('id').primary();
    table.string('instagram_post_id');
    table.integer('produto_id').unsigned().references('id').inTable('importacao_produtos');
    table.string('status').defaultTo('ativo');
    table.text('post_content');
    table.datetime('ultima_sincronizacao');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('importacao_integracao_bling', (table) => {
    table.increments('id').primary();
    table.string('bling_id');
    table.integer('produto_id').unsigned().references('id').inTable('importacao_produtos');
    table.string('status').defaultTo('ativo');
    table.text('dados_bling');
    table.datetime('ultima_sincronizacao');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('importacao_integracao_supabase', (table) => {
    table.increments('id').primary();
    table.string('supabase_id');
    table.string('tabela');
    table.text('dados');
    table.string('status').defaultTo('ativo');
    table.datetime('ultima_sincronizacao');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('importacao_integracao_zapi', (table) => {
    table.increments('id').primary();
    table.string('numero_whatsapp');
    table.integer('cliente_id').unsigned().references('id').inTable('importacao_clientes');
    table.text('mensagem');
    table.string('status').defaultTo('enviado');
    table.datetime('data_envio');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('importacao_integracao_make', (table) => {
    table.increments('id').primary();
    table.string('scenario_id');
    table.string('webhook_id');
    table.text('dados_webhook');
    table.string('status').defaultTo('ativo');
    table.datetime('ultima_execucao');
    table.timestamps(true, true);
  });

  console.log('✅ All ERP tables created successfully');
};

exports.down = async function(knex) {
  // Drop tables in reverse order due to foreign key constraints
  await knex.schema.dropTableIfExists('importacao_integracao_make');
  await knex.schema.dropTableIfExists('importacao_integracao_zapi');
  await knex.schema.dropTableIfExists('importacao_integracao_supabase');
  await knex.schema.dropTableIfExists('importacao_integracao_bling');
  await knex.schema.dropTableIfExists('importacao_integracao_instagram');
  await knex.schema.dropTableIfExists('importacao_integracao_ml');
  await knex.schema.dropTableIfExists('importacao_relatorios');
  await knex.schema.dropTableIfExists('importacao_configuracoes');
  await knex.schema.dropTableIfExists('importacao_usuarios');
  await knex.schema.dropTableIfExists('importacao_transporte');
  await knex.schema.dropTableIfExists('importacao_notas_fiscais');
  await knex.schema.dropTableIfExists('importacao_pedidos_itens');
  await knex.schema.dropTableIfExists('importacao_pedidos');
  await knex.schema.dropTableIfExists('importacao_vendas_itens');
  await knex.schema.dropTableIfExists('importacao_vendas');
  await knex.schema.dropTableIfExists('importacao_estoque');
  await knex.schema.dropTableIfExists('importacao_produtos');
  await knex.schema.dropTableIfExists('importacao_categorias');
  await knex.schema.dropTableIfExists('importacao_fornecedores');
  await knex.schema.dropTableIfExists('importacao_clientes');
  await knex.schema.dropTableIfExists('auth_sessions');
  await knex.schema.dropTableIfExists('auth_users');
  
  console.log('✅ All ERP tables dropped successfully');
};