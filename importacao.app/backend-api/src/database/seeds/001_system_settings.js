/**
 * Seed: System Settings
 * Creates initial system configuration
 */

exports.seed = async function(knex) {
  // Clear existing entries
  await knex('system_settings').del();

  // Insert system settings
  await knex('system_settings').insert([
    // General settings
    {
      key: 'company_name',
      value: 'ERP System',
      type: 'string',
      category: 'general',
      description: 'Nome da empresa',
      is_public: true
    },
    {
      key: 'company_cnpj',
      value: '12.345.678/0001-90',
      type: 'string',
      category: 'general',
      description: 'CNPJ da empresa',
      is_public: false
    },
    {
      key: 'company_phone',
      value: '(11) 3456-7890',
      type: 'string',
      category: 'general',
      description: 'Telefone da empresa',
      is_public: true
    },
    {
      key: 'company_email',
      value: 'contato@empresa.com.br',
      type: 'string',
      category: 'general',
      description: 'Email da empresa',
      is_public: true
    },
    {
      key: 'company_address',
      value: JSON.stringify({
        street: 'Av. Paulista',
        number: '1000',
        complement: 'Sala 101',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipcode: '01310-100'
      }),
      type: 'json',
      category: 'general',
      description: 'Endereço da empresa',
      is_public: true
    },

    // Security settings
    {
      key: 'password_min_length',
      value: '8',
      type: 'number',
      category: 'security',
      description: 'Tamanho mínimo da senha',
      is_public: true
    },
    {
      key: 'password_require_uppercase',
      value: 'true',
      type: 'boolean',
      category: 'security',
      description: 'Exigir letra maiúscula na senha',
      is_public: true
    },
    {
      key: 'password_require_lowercase',
      value: 'true',
      type: 'boolean',
      category: 'security',
      description: 'Exigir letra minúscula na senha',
      is_public: true
    },
    {
      key: 'password_require_numbers',
      value: 'true',
      type: 'boolean',
      category: 'security',
      description: 'Exigir números na senha',
      is_public: true
    },
    {
      key: 'password_require_symbols',
      value: 'false',
      type: 'boolean',
      category: 'security',
      description: 'Exigir símbolos na senha',
      is_public: true
    },
    {
      key: 'session_timeout',
      value: '7200',
      type: 'number',
      category: 'security',
      description: 'Timeout da sessão em segundos (2 horas)',
      is_public: true
    },

    // Business settings
    {
      key: 'default_currency',
      value: 'BRL',
      type: 'string',
      category: 'business',
      description: 'Moeda padrão',
      is_public: true
    },
    {
      key: 'default_tax_rate',
      value: '18.0',
      type: 'number',
      category: 'business',
      description: 'Alíquota de imposto padrão (ICMS)',
      is_public: true
    },
    {
      key: 'default_payment_terms',
      value: '30_days',
      type: 'string',
      category: 'business',
      description: 'Prazo de pagamento padrão',
      is_public: true
    },
    {
      key: 'inventory_method',
      value: 'fifo',
      type: 'string',
      category: 'business',
      description: 'Método de avaliação de estoque (FIFO/LIFO/Average)',
      is_public: true
    },
    {
      key: 'low_stock_threshold',
      value: '10',
      type: 'number',
      category: 'business',
      description: 'Limite mínimo de estoque para alerta',
      is_public: true
    },

    // Email settings
    {
      key: 'email_from_name',
      value: 'ERP System',
      type: 'string',
      category: 'email',
      description: 'Nome do remetente dos emails',
      is_public: false
    },
    {
      key: 'email_from_address',
      value: 'noreply@empresa.com.br',
      type: 'string',
      category: 'email',
      description: 'Email do remetente',
      is_public: false
    },
    {
      key: 'smtp_host',
      value: 'smtp.gmail.com',
      type: 'string',
      category: 'email',
      description: 'Servidor SMTP',
      is_public: false
    },
    {
      key: 'smtp_port',
      value: '587',
      type: 'number',
      category: 'email',
      description: 'Porta SMTP',
      is_public: false
    },
    {
      key: 'smtp_secure',
      value: 'true',
      type: 'boolean',
      category: 'email',
      description: 'Usar SSL/TLS',
      is_public: false
    },

    // UI settings
    {
      key: 'items_per_page',
      value: '25',
      type: 'number',
      category: 'ui',
      description: 'Itens por página nas listagens',
      is_public: true
    },
    {
      key: 'default_theme',
      value: 'light',
      type: 'string',
      category: 'ui',
      description: 'Tema padrão (light/dark)',
      is_public: true
    },
    {
      key: 'date_format',
      value: 'DD/MM/YYYY',
      type: 'string',
      category: 'ui',
      description: 'Formato de data',
      is_public: true
    },
    {
      key: 'time_format',
      value: 'HH:mm',
      type: 'string',
      category: 'ui',
      description: 'Formato de hora',
      is_public: true
    },
    {
      key: 'decimal_places',
      value: '2',
      type: 'number',
      category: 'ui',
      description: 'Casas decimais para valores monetários',
      is_public: true
    },

    // Backup settings
    {
      key: 'backup_frequency',
      value: 'daily',
      type: 'string',
      category: 'backup',
      description: 'Frequência de backup automático',
      is_public: false
    },
    {
      key: 'backup_retention_days',
      value: '30',
      type: 'number',
      category: 'backup',
      description: 'Dias para manter backups',
      is_public: false
    },
    {
      key: 'backup_enabled',
      value: 'true',
      type: 'boolean',
      category: 'backup',
      description: 'Backup automático habilitado',
      is_public: false
    }
  ]);

  console.log('✅ System settings seeded successfully');
};