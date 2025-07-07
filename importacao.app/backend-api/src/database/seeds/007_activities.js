/**
 * Seed: Activities
 * Creates sample activities for dashboard and audit trail
 */

exports.seed = async function(knex) {
  // Clear existing entries
  await knex('activities').del();

  // Helper function to generate random date within last 30 days
  function randomDate(days = 30) {
    const now = new Date();
    const randomTime = now.getTime() - Math.random() * days * 24 * 60 * 60 * 1000;
    return new Date(randomTime);
  }

  // Helper function to get random user ID (1-6)
  function randomUserId() {
    return Math.floor(Math.random() * 6) + 1;
  }

  // Helper function to get random IP
  function randomIP() {
    const ips = [
      '192.168.1.10',
      '192.168.1.15',
      '192.168.1.20',
      '10.0.0.5',
      '10.0.0.8',
      '172.16.0.10'
    ];
    return ips[Math.floor(Math.random() * ips.length)];
  }

  // Insert sample activities
  await knex('activities').insert([
    // Login activities
    {
      id: 1,
      type: 'login',
      action: 'user_login',
      description: 'Usuário fez login no sistema',
      entity_type: 'users',
      entity_id: 1,
      user_id: 1,
      ip_address: '192.168.1.10',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'low',
      created_at: randomDate(1)
    },
    {
      id: 2,
      type: 'login',
      action: 'user_login',
      description: 'Usuário fez login no sistema',
      entity_type: 'users',
      entity_id: 2,
      user_id: 2,
      ip_address: '192.168.1.15',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      severity: 'low',
      created_at: randomDate(1)
    },

    // Client activities
    {
      id: 3,
      type: 'create',
      action: 'client_created',
      description: 'Novo cliente cadastrado no sistema',
      entity_type: 'clients',
      entity_id: 1,
      user_id: randomUserId(),
      ip_address: randomIP(),
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      new_values: JSON.stringify({
        name: 'João Silva Santos',
        email: 'joao.santos@email.com',
        status: 'active'
      }),
      severity: 'low',
      created_at: randomDate(7)
    },
    {
      id: 4,
      type: 'update',
      action: 'client_updated',
      description: 'Dados do cliente atualizados',
      entity_type: 'clients',
      entity_id: 4,
      user_id: randomUserId(),
      ip_address: randomIP(),
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      old_values: JSON.stringify({
        credit_limit: 40000.00,
        current_balance: 10000.00
      }),
      new_values: JSON.stringify({
        credit_limit: 50000.00,
        current_balance: 15000.00
      }),
      severity: 'medium',
      created_at: randomDate(5)
    },
    {
      id: 5,
      type: 'create',
      action: 'client_created',
      description: 'Novo cliente corporativo cadastrado',
      entity_type: 'clients',
      entity_id: 10,
      user_id: randomUserId(),
      ip_address: randomIP(),
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      new_values: JSON.stringify({
        name: 'Construtora Horizonte S.A.',
        cnpj: '78.901.234/0001-56',
        status: 'active'
      }),
      severity: 'medium',
      created_at: randomDate(3)
    },

    // Product activities
    {
      id: 6,
      type: 'create',
      action: 'product_created',
      description: 'Novo produto cadastrado no estoque',
      entity_type: 'products',
      entity_id: 1,
      user_id: randomUserId(),
      ip_address: randomIP(),
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      new_values: JSON.stringify({
        code: 'SMAR001',
        description: 'Smartphone Samsung Galaxy A54 128GB',
        sale_price: 1599.00
      }),
      severity: 'low',
      created_at: randomDate(10)
    },
    {
      id: 7,
      type: 'update',
      action: 'product_price_updated',
      description: 'Preço do produto atualizado',
      entity_type: 'products',
      entity_id: 5,
      user_id: randomUserId(),
      ip_address: randomIP(),
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      old_values: JSON.stringify({
        sale_price: 279.00
      }),
      new_values: JSON.stringify({
        sale_price: 299.00
      }),
      severity: 'medium',
      created_at: randomDate(2)
    },
    {
      id: 8,
      type: 'update',
      action: 'stock_updated',
      description: 'Estoque do produto atualizado',
      entity_type: 'products',
      entity_id: 3,
      user_id: randomUserId(),
      ip_address: randomIP(),
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      old_values: JSON.stringify({
        current_stock: 15
      }),
      new_values: JSON.stringify({
        current_stock: 8
      }),
      severity: 'medium',
      created_at: randomDate(1)
    },

    // Supplier activities
    {
      id: 9,
      type: 'create',
      action: 'supplier_created',
      description: 'Novo fornecedor cadastrado',
      entity_type: 'suppliers',
      entity_id: 1,
      user_id: randomUserId(),
      ip_address: randomIP(),
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      new_values: JSON.stringify({
        name: 'Distribuidora TechBrasil Ltda',
        cnpj: '11.222.333/0001-44',
        status: 'active'
      }),
      severity: 'low',
      created_at: randomDate(15)
    },
    {
      id: 10,
      type: 'update',
      action: 'supplier_updated',
      description: 'Condições de pagamento do fornecedor atualizadas',
      entity_type: 'suppliers',
      entity_id: 2,
      user_id: randomUserId(),
      ip_address: randomIP(),
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      old_values: JSON.stringify({
        payment_terms: '30_days',
        discount_percentage: 3.00
      }),
      new_values: JSON.stringify({
        payment_terms: '45_days',
        discount_percentage: 5.00
      }),
      severity: 'medium',
      created_at: randomDate(4)
    },

    // User management activities
    {
      id: 11,
      type: 'create',
      action: 'user_created',
      description: 'Novo usuário criado no sistema',
      entity_type: 'users',
      entity_id: 3,
      user_id: 1,
      ip_address: '192.168.1.10',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      new_values: JSON.stringify({
        email: 'vendedor@empresa.com.br',
        role: 'user',
        status: 'active'
      }),
      severity: 'medium',
      created_at: randomDate(20)
    },
    {
      id: 12,
      type: 'update',
      action: 'user_role_updated',
      description: 'Perfil do usuário alterado',
      entity_type: 'users',
      entity_id: 4,
      user_id: 1,
      ip_address: '192.168.1.10',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      old_values: JSON.stringify({
        role: 'viewer'
      }),
      new_values: JSON.stringify({
        role: 'user'
      }),
      severity: 'high',
      created_at: randomDate(8)
    },

    // System activities
    {
      id: 13,
      type: 'system',
      action: 'backup_created',
      description: 'Backup automático do banco de dados criado',
      entity_type: null,
      entity_id: null,
      user_id: null,
      ip_address: 'localhost',
      user_agent: 'System Scheduler',
      metadata: JSON.stringify({
        backup_size: '15.2 MB',
        backup_type: 'automatic',
        retention_days: 30
      }),
      severity: 'low',
      created_at: randomDate(1)
    },
    {
      id: 14,
      type: 'system',
      action: 'database_maintenance',
      description: 'Manutenção programada do banco de dados executada',
      entity_type: null,
      entity_id: null,
      user_id: null,
      ip_address: 'localhost',
      user_agent: 'System Maintenance',
      metadata: JSON.stringify({
        operation: 'VACUUM',
        duration_ms: 2500,
        space_freed: '1.8 MB'
      }),
      severity: 'low',
      created_at: randomDate(7)
    },

    // Security activities
    {
      id: 15,
      type: 'security',
      action: 'failed_login_attempt',
      description: 'Tentativa de login com credenciais inválidas',
      entity_type: 'users',
      entity_id: null,
      user_id: null,
      ip_address: '192.168.1.25',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      metadata: JSON.stringify({
        email_attempted: 'admin@empresa.com.br',
        reason: 'invalid_password',
        attempts_count: 3
      }),
      severity: 'high',
      created_at: randomDate(2)
    },
    {
      id: 16,
      type: 'security',
      action: 'password_changed',
      description: 'Usuário alterou sua senha',
      entity_type: 'users',
      entity_id: 2,
      user_id: 2,
      ip_address: '192.168.1.15',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      severity: 'medium',
      created_at: randomDate(5)
    },

    // Business activities
    {
      id: 17,
      type: 'business',
      action: 'low_stock_alert',
      description: 'Alerta de estoque baixo para produto',
      entity_type: 'products',
      entity_id: 12,
      user_id: null,
      ip_address: 'localhost',
      user_agent: 'Stock Monitor',
      metadata: JSON.stringify({
        product_code: 'FERR001',
        current_stock: 3,
        minimum_stock: 6,
        recommended_order: 12
      }),
      severity: 'medium',
      created_at: randomDate(1)
    },
    {
      id: 18,
      type: 'business',
      action: 'credit_limit_exceeded',
      description: 'Cliente excedeu limite de crédito',
      entity_type: 'clients',
      entity_id: 6,
      user_id: null,
      ip_address: 'localhost',
      user_agent: 'Credit Monitor',
      metadata: JSON.stringify({
        credit_limit: 100000.00,
        current_balance: 105000.00,
        exceeded_amount: 5000.00
      }),
      severity: 'high',
      created_at: randomDate(3)
    },

    // Data import activities
    {
      id: 19,
      type: 'import',
      action: 'data_import_completed',
      description: 'Importação de dados concluída com sucesso',
      entity_type: 'products',
      entity_id: null,
      user_id: randomUserId(),
      ip_address: randomIP(),
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      metadata: JSON.stringify({
        file_name: 'produtos_fornecedor_abc.csv',
        records_processed: 150,
        records_imported: 142,
        records_skipped: 8,
        duration_ms: 15000
      }),
      severity: 'low',
      created_at: randomDate(12)
    },
    {
      id: 20,
      type: 'export',
      action: 'report_generated',
      description: 'Relatório de vendas gerado',
      entity_type: null,
      entity_id: null,
      user_id: randomUserId(),
      ip_address: randomIP(),
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      metadata: JSON.stringify({
        report_type: 'sales_summary',
        period: 'last_30_days',
        format: 'PDF',
        file_size: '2.1 MB'
      }),
      severity: 'low',
      created_at: randomDate(6)
    }
  ]);

  console.log('✅ Activities seeded successfully');
  console.log('   - 20 sample activities created');
  console.log('   - Login activities: 2');
  console.log('   - Client activities: 3');
  console.log('   - Product activities: 3');
  console.log('   - Supplier activities: 2');
  console.log('   - User management: 2');
  console.log('   - System activities: 2');
  console.log('   - Security activities: 2');
  console.log('   - Business activities: 2');
  console.log('   - Import/Export activities: 2');
};