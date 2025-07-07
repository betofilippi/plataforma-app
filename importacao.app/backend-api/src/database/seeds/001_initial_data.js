const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Clear existing data
  await knex('importacao_vendas_itens').del();
  await knex('importacao_pedidos_itens').del();
  await knex('importacao_notas_fiscais').del();
  await knex('importacao_transporte').del();
  await knex('importacao_vendas').del();
  await knex('importacao_pedidos').del();
  await knex('importacao_estoque').del();
  await knex('importacao_produtos').del();
  await knex('importacao_categorias').del();
  await knex('importacao_fornecedores').del();
  await knex('importacao_clientes').del();
  await knex('importacao_usuarios').del();
  await knex('importacao_configuracoes').del();
  await knex('importacao_relatorios').del();
  await knex('importacao_integracao_ml').del();
  await knex('importacao_integracao_instagram').del();
  await knex('importacao_integracao_bling').del();
  await knex('importacao_integracao_supabase').del();
  await knex('importacao_integracao_zapi').del();
  await knex('importacao_integracao_make').del();
  await knex('auth_sessions').del();
  await knex('auth_users').del();

  // Insert admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  await knex('auth_users').insert([
    {
      id: 1,
      email: 'admin@nxt.com',
      password_hash: passwordHash,
      first_name: 'Admin',
      last_name: 'NXT',
      role: 'admin',
      preferences: JSON.stringify({
        theme: 'light',
        language: 'pt-BR',
        notifications: true
      }),
      status: 'active'
    }
  ]);

  // Insert categories
  await knex('importacao_categorias').insert([
    { id: 1, nome: 'Eletrônicos', descricao: 'Produtos eletrônicos em geral' },
    { id: 2, nome: 'Roupas', descricao: 'Vestuário e acessórios' },
    { id: 3, nome: 'Casa e Jardim', descricao: 'Produtos para casa e jardim' },
    { id: 4, nome: 'Livros', descricao: 'Livros e materiais educativos' },
    { id: 5, nome: 'Esportes', descricao: 'Artigos esportivos e fitness' }
  ]);

  // Insert suppliers
  await knex('importacao_fornecedores').insert([
    {
      id: 1,
      nome: 'TechSupply Ltda',
      email: 'vendas@techsupply.com',
      telefone: '(11) 99999-1234',
      cnpj: '12.345.678/0001-90',
      endereco: 'Rua das Tecnologias, 123',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234-567',
      contato_principal: 'João Silva'
    },
    {
      id: 2,
      nome: 'Moda Fashion Distribuidora',
      email: 'contato@modafashion.com',
      telefone: '(21) 88888-5678',
      cnpj: '23.456.789/0001-01',
      endereco: 'Av. da Moda, 456',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      cep: '20000-000',
      contato_principal: 'Maria Santos'
    },
    {
      id: 3,
      nome: 'Casa Verde Importadora',
      email: 'vendas@casaverde.com',
      telefone: '(31) 77777-9012',
      cnpj: '34.567.890/0001-12',
      endereco: 'Rua dos Jardins, 789',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      cep: '30000-000',
      contato_principal: 'Pedro Oliveira'
    }
  ]);

  // Insert clients
  await knex('importacao_clientes').insert([
    {
      id: 1,
      nome: 'João da Silva',
      email: 'joao.silva@email.com',
      telefone: '(11) 99999-0001',
      cpf_cnpj: '123.456.789-01',
      tipo_pessoa: 'F',
      endereco: 'Rua das Flores, 123',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234-567',
      limite_credito: 5000.00,
      data_cadastro: '2024-01-15'
    },
    {
      id: 2,
      nome: 'Maria Santos',
      email: 'maria.santos@email.com',
      telefone: '(21) 88888-0002',
      cpf_cnpj: '234.567.890-12',
      tipo_pessoa: 'F',
      endereco: 'Av. das Palmeiras, 456',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      cep: '20000-000',
      limite_credito: 3000.00,
      data_cadastro: '2024-02-01'
    },
    {
      id: 3,
      nome: 'Empresa XYZ Ltda',
      email: 'contato@empresaxyz.com',
      telefone: '(31) 77777-0003',
      cpf_cnpj: '12.345.678/0001-90',
      tipo_pessoa: 'J',
      endereco: 'Rua Comercial, 789',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      cep: '30000-000',
      limite_credito: 15000.00,
      data_cadastro: '2024-01-20'
    },
    {
      id: 4,
      nome: 'Pedro Oliveira',
      email: 'pedro.oliveira@email.com',
      telefone: '(41) 66666-0004',
      cpf_cnpj: '345.678.901-23',
      tipo_pessoa: 'F',
      endereco: 'Rua dos Pinheiros, 321',
      cidade: 'Curitiba',
      estado: 'PR',
      cep: '80000-000',
      limite_credito: 2000.00,
      data_cadastro: '2024-02-10'
    },
    {
      id: 5,
      nome: 'Ana Costa',
      email: 'ana.costa@email.com',
      telefone: '(51) 55555-0005',
      cpf_cnpj: '456.789.012-34',
      tipo_pessoa: 'F',
      endereco: 'Av. dos Trabalhadores, 654',
      cidade: 'Porto Alegre',
      estado: 'RS',
      cep: '90000-000',
      limite_credito: 4000.00,
      data_cadastro: '2024-01-25'
    }
  ]);

  // Insert products
  await knex('importacao_produtos').insert([
    {
      id: 1,
      nome: 'Smartphone Samsung Galaxy A54',
      codigo_barras: '7891234567890',
      sku: 'SM-A54-128GB',
      descricao: 'Smartphone com 128GB de armazenamento, câmera tripla e tela de 6.4 polegadas',
      categoria_id: 1,
      preco_custo: 800.00,
      preco_venda: 1200.00,
      margem_lucro: 50.00,
      unidade_medida: 'UN',
      peso: 0.202,
      dimensoes: '158.2 x 76.7 x 8.2 mm',
      estoque_minimo: 5,
      estoque_maximo: 50
    },
    {
      id: 2,
      nome: 'Camiseta Polo Masculina',
      codigo_barras: '7891234567891',
      sku: 'POLO-M-AZUL',
      descricao: 'Camiseta polo masculina 100% algodão, cor azul marinho',
      categoria_id: 2,
      preco_custo: 25.00,
      preco_venda: 59.90,
      margem_lucro: 139.60,
      unidade_medida: 'UN',
      peso: 0.180,
      dimensoes: '60 x 40 x 2 cm',
      estoque_minimo: 10,
      estoque_maximo: 100
    },
    {
      id: 3,
      nome: 'Jogo de Panelas Antiaderente',
      codigo_barras: '7891234567892',
      sku: 'PANELA-SET-5PC',
      descricao: 'Conjunto de 5 panelas antiaderentes com cabos de baquelite',
      categoria_id: 3,
      preco_custo: 120.00,
      preco_venda: 229.90,
      margem_lucro: 91.58,
      unidade_medida: 'KIT',
      peso: 3.500,
      dimensoes: '50 x 30 x 20 cm',
      estoque_minimo: 3,
      estoque_maximo: 30
    },
    {
      id: 4,
      nome: 'Livro "Programação JavaScript"',
      codigo_barras: '7891234567893',
      sku: 'BOOK-JS-2024',
      descricao: 'Livro completo sobre programação JavaScript moderno',
      categoria_id: 4,
      preco_custo: 35.00,
      preco_venda: 79.90,
      margem_lucro: 128.29,
      unidade_medida: 'UN',
      peso: 0.450,
      dimensoes: '23 x 16 x 3 cm',
      estoque_minimo: 5,
      estoque_maximo: 50
    },
    {
      id: 5,
      nome: 'Tênis Esportivo Nike Air',
      codigo_barras: '7891234567894',
      sku: 'TENIS-NIKE-42',
      descricao: 'Tênis esportivo Nike Air Max, tamanho 42, cor preta',
      categoria_id: 5,
      preco_custo: 180.00,
      preco_venda: 349.90,
      margem_lucro: 94.39,
      unidade_medida: 'PAR',
      peso: 0.800,
      dimensoes: '35 x 25 x 15 cm',
      estoque_minimo: 2,
      estoque_maximo: 20
    },
    {
      id: 6,
      nome: 'Notebook Dell Inspiron',
      codigo_barras: '7891234567895',
      sku: 'DELL-INSP-I5',
      descricao: 'Notebook Dell com processador Intel i5, 8GB RAM, 256GB SSD',
      categoria_id: 1,
      preco_custo: 1800.00,
      preco_venda: 2799.90,
      margem_lucro: 55.55,
      unidade_medida: 'UN',
      peso: 2.100,
      dimensoes: '35 x 25 x 2 cm',
      estoque_minimo: 2,
      estoque_maximo: 15
    },
    {
      id: 7,
      nome: 'Vestido Floral Feminino',
      codigo_barras: '7891234567896',
      sku: 'VEST-FLORAL-M',
      descricao: 'Vestido feminino com estampa floral, tamanho M',
      categoria_id: 2,
      preco_custo: 40.00,
      preco_venda: 89.90,
      margem_lucro: 124.75,
      unidade_medida: 'UN',
      peso: 0.250,
      dimensoes: '60 x 40 x 5 cm',
      estoque_minimo: 5,
      estoque_maximo: 50
    },
    {
      id: 8,
      nome: 'Aspirador de Pó Robô',
      codigo_barras: '7891234567897',
      sku: 'ROBO-ASPIRADOR',
      descricao: 'Aspirador de pó robô inteligente com mapeamento automático',
      categoria_id: 3,
      preco_custo: 450.00,
      preco_venda: 799.90,
      margem_lucro: 77.76,
      unidade_medida: 'UN',
      peso: 3.200,
      dimensoes: '35 x 35 x 10 cm',
      estoque_minimo: 2,
      estoque_maximo: 20
    }
  ]);

  // Insert stock data
  await knex('importacao_estoque').insert([
    { id: 1, produto_id: 1, quantidade: 25, quantidade_reservada: 2, custo_medio: 800.00, localizacao: 'A1-001' },
    { id: 2, produto_id: 2, quantidade: 45, quantidade_reservada: 5, custo_medio: 25.00, localizacao: 'B2-015' },
    { id: 3, produto_id: 3, quantidade: 15, quantidade_reservada: 1, custo_medio: 120.00, localizacao: 'C3-008' },
    { id: 4, produto_id: 4, quantidade: 30, quantidade_reservada: 0, custo_medio: 35.00, localizacao: 'D4-022' },
    { id: 5, produto_id: 5, quantidade: 12, quantidade_reservada: 2, custo_medio: 180.00, localizacao: 'E5-003' },
    { id: 6, produto_id: 6, quantidade: 8, quantidade_reservada: 1, custo_medio: 1800.00, localizacao: 'A1-002' },
    { id: 7, produto_id: 7, quantidade: 35, quantidade_reservada: 3, custo_medio: 40.00, localizacao: 'B2-020' },
    { id: 8, produto_id: 8, quantidade: 6, quantidade_reservada: 0, custo_medio: 450.00, localizacao: 'C3-012' }
  ]);

  // Insert orders
  await knex('importacao_pedidos').insert([
    {
      id: 1,
      numero_pedido: 'PED-2024-001',
      cliente_id: 1,
      cliente_nome: 'João da Silva',
      data_pedido: '2024-01-20',
      data_prevista_entrega: '2024-01-27',
      valor_total: 1200.00,
      status: 'confirmado',
      forma_pagamento: 'cartao_credito'
    },
    {
      id: 2,
      numero_pedido: 'PED-2024-002',
      cliente_id: 2,
      cliente_nome: 'Maria Santos',
      data_pedido: '2024-02-05',
      data_prevista_entrega: '2024-02-12',
      valor_total: 359.70,
      status: 'pendente',
      forma_pagamento: 'pix'
    },
    {
      id: 3,
      numero_pedido: 'PED-2024-003',
      cliente_id: 3,
      cliente_nome: 'Empresa XYZ Ltda',
      data_pedido: '2024-02-10',
      data_prevista_entrega: '2024-02-17',
      valor_total: 5599.80,
      status: 'em_producao',
      forma_pagamento: 'boleto'
    }
  ]);

  // Insert order items
  await knex('importacao_pedidos_itens').insert([
    { id: 1, pedido_id: 1, produto_id: 1, quantidade: 1, preco_unitario: 1200.00, preco_total: 1200.00 },
    { id: 2, pedido_id: 2, produto_id: 2, quantidade: 2, preco_unitario: 59.90, preco_total: 119.80 },
    { id: 3, pedido_id: 2, produto_id: 3, quantidade: 1, preco_unitario: 229.90, preco_total: 229.90 },
    { id: 4, pedido_id: 3, produto_id: 6, quantidade: 2, preco_unitario: 2799.90, preco_total: 5599.80 }
  ]);

  // Insert sales
  await knex('importacao_vendas').insert([
    {
      id: 1,
      numero_venda: 'VEN-2024-001',
      cliente_id: 1,
      cliente_nome: 'João da Silva',
      data_venda: '2024-01-20',
      valor_total: 1200.00,
      valor_desconto: 0.00,
      valor_frete: 0.00,
      status: 'finalizada',
      forma_pagamento: 'cartao_credito'
    },
    {
      id: 2,
      numero_venda: 'VEN-2024-002',
      cliente_id: 4,
      cliente_nome: 'Pedro Oliveira',
      data_venda: '2024-02-01',
      valor_total: 349.90,
      valor_desconto: 10.00,
      valor_frete: 15.00,
      status: 'finalizada',
      forma_pagamento: 'pix'
    },
    {
      id: 3,
      numero_venda: 'VEN-2024-003',
      cliente_id: 5,
      cliente_nome: 'Ana Costa',
      data_venda: '2024-02-15',
      valor_total: 89.90,
      valor_desconto: 0.00,
      valor_frete: 12.00,
      status: 'finalizada',
      forma_pagamento: 'cartao_debito'
    }
  ]);

  // Insert sales items
  await knex('importacao_vendas_itens').insert([
    { id: 1, venda_id: 1, produto_id: 1, quantidade: 1, preco_unitario: 1200.00, preco_total: 1200.00 },
    { id: 2, venda_id: 2, produto_id: 5, quantidade: 1, preco_unitario: 349.90, preco_total: 349.90 },
    { id: 3, venda_id: 3, produto_id: 7, quantidade: 1, preco_unitario: 89.90, preco_total: 89.90 }
  ]);

  // Insert users
  await knex('importacao_usuarios').insert([
    {
      id: 1,
      nome: 'Carlos Vendedor',
      email: 'carlos.vendedor@nxt.com',
      telefone: '(11) 99999-1111',
      cargo: 'Vendedor',
      departamento: 'Vendas',
      permissoes: JSON.stringify(['vendas', 'clientes', 'produtos'])
    },
    {
      id: 2,
      nome: 'Ana Estoque',
      email: 'ana.estoque@nxt.com',
      telefone: '(11) 99999-2222',
      cargo: 'Assistente de Estoque',
      departamento: 'Logística',
      permissoes: JSON.stringify(['estoque', 'produtos', 'fornecedores'])
    }
  ]);

  // Insert configurations
  await knex('importacao_configuracoes').insert([
    {
      id: 1,
      chave: 'empresa_nome',
      valor: 'NXT Indústria e Comércio Ltda',
      categoria: 'empresa',
      descricao: 'Nome da empresa'
    },
    {
      id: 2,
      chave: 'empresa_cnpj',
      valor: '12.345.678/0001-90',
      categoria: 'empresa',
      descricao: 'CNPJ da empresa'
    },
    {
      id: 3,
      chave: 'moeda_padrao',
      valor: 'BRL',
      categoria: 'sistema',
      descricao: 'Moeda padrão do sistema'
    },
    {
      id: 4,
      chave: 'email_smtp_host',
      valor: 'smtp.gmail.com',
      categoria: 'email',
      descricao: 'Servidor SMTP para envio de emails'
    },
    {
      id: 5,
      chave: 'backup_automatico',
      valor: 'true',
      tipo: 'boolean',
      categoria: 'sistema',
      descricao: 'Habilitar backup automático'
    }
  ]);

  // Insert integration sample data
  await knex('importacao_integracao_ml').insert([
    {
      id: 1,
      ml_item_id: 'MLB123456789',
      produto_id: 1,
      status: 'ativo',
      preco_ml: 1199.99,
      quantidade_disponivel: 23,
      ultima_sincronizacao: new Date().toISOString()
    },
    {
      id: 2,
      ml_item_id: 'MLB987654321',
      produto_id: 5,
      status: 'ativo',
      preco_ml: 349.90,
      quantidade_disponivel: 10,
      ultima_sincronizacao: new Date().toISOString()
    }
  ]);

  await knex('importacao_integracao_instagram').insert([
    {
      id: 1,
      instagram_post_id: 'IG_POST_001',
      produto_id: 2,
      status: 'ativo',
      post_content: 'Confira nossa nova coleção de camisetas polo!',
      ultima_sincronizacao: new Date().toISOString()
    }
  ]);

  await knex('importacao_integracao_bling').insert([
    {
      id: 1,
      bling_id: 'BLING_001',
      produto_id: 3,
      status: 'ativo',
      dados_bling: JSON.stringify({ codigo: 'PANELA-001', categoria: 'Casa' }),
      ultima_sincronizacao: new Date().toISOString()
    }
  ]);

  console.log('✅ Initial data seeded successfully');
};