const crypto = require('crypto');

/**
 * Configurações globais do sistema com suporte a criptografia
 */
class SystemSettings {
  constructor() {
    this.knex = null;
    this.cache = new Map();
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
    this.iv = crypto.randomBytes(16);
    
    // Configurações padrão do sistema
    this.defaultSettings = {
      // Aplicação
      'app.name': { value: 'ERP NXT', type: 'string', is_public: true, description: 'Nome da aplicação' },
      'app.version': { value: '1.0.0', type: 'string', is_public: true, description: 'Versão da aplicação' },
      'app.timezone': { value: 'America/Sao_Paulo', type: 'string', is_public: true, description: 'Fuso horário padrão' },
      'app.locale': { value: 'pt-BR', type: 'string', is_public: true, description: 'Idioma padrão' },
      'app.currency': { value: 'BRL', type: 'string', is_public: true, description: 'Moeda padrão' },
      'app.debug': { value: false, type: 'boolean', is_public: false, description: 'Modo debug ativo' },

      // Autenticação e Segurança
      'auth.session_duration': { value: 3600, type: 'number', is_public: false, description: 'Duração da sessão em segundos' },
      'auth.max_login_attempts': { value: 5, type: 'number', is_public: false, description: 'Máximo de tentativas de login' },
      'auth.lockout_duration': { value: 900, type: 'number', is_public: false, description: 'Duração do bloqueio em segundos' },
      'auth.password_min_length': { value: 8, type: 'number', is_public: true, description: 'Tamanho mínimo da senha' },
      'auth.require_2fa': { value: false, type: 'boolean', is_public: true, description: 'Exigir autenticação de dois fatores' },
      'auth.jwt_expiration': { value: '24h', type: 'string', is_public: false, description: 'Expiração do JWT' },

      // Email
      'email.smtp_host': { value: '', type: 'string', is_public: false, is_encrypted: true, description: 'Servidor SMTP' },
      'email.smtp_port': { value: 587, type: 'number', is_public: false, description: 'Porta SMTP' },
      'email.smtp_secure': { value: false, type: 'boolean', is_public: false, description: 'SMTP seguro (SSL/TLS)' },
      'email.smtp_user': { value: '', type: 'string', is_public: false, is_encrypted: true, description: 'Usuário SMTP' },
      'email.smtp_password': { value: '', type: 'string', is_public: false, is_encrypted: true, description: 'Senha SMTP' },
      'email.from_address': { value: '', type: 'string', is_public: false, description: 'Endereço de envio padrão' },
      'email.from_name': { value: 'ERP NXT', type: 'string', is_public: false, description: 'Nome de envio padrão' },

      // Backup
      'backup.auto_backup': { value: true, type: 'boolean', is_public: false, description: 'Backup automático ativo' },
      'backup.backup_interval': { value: 24, type: 'number', is_public: false, description: 'Intervalo de backup em horas' },
      'backup.retention_days': { value: 30, type: 'number', is_public: false, description: 'Dias de retenção de backup' },
      'backup.compress': { value: true, type: 'boolean', is_public: false, description: 'Comprimir backups' },

      // Storage
      'storage.max_file_size': { value: 52428800, type: 'number', is_public: true, description: 'Tamanho máximo de arquivo em bytes (50MB)' },
      'storage.allowed_extensions': { value: 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,csv,txt', type: 'string', is_public: true, description: 'Extensões permitidas' },
      'storage.upload_path': { value: 'uploads/', type: 'string', is_public: false, description: 'Caminho de upload' },

      // Performance
      'performance.max_connections': { value: 100, type: 'number', is_public: false, description: 'Máximo de conexões do banco' },
      'performance.query_timeout': { value: 30000, type: 'number', is_public: false, description: 'Timeout de query em ms' },
      'performance.cache_duration': { value: 300, type: 'number', is_public: false, description: 'Duração do cache em segundos' },

      // Logs
      'logs.level': { value: 'info', type: 'string', is_public: false, description: 'Nível de log (error, warn, info, debug)' },
      'logs.retention_days': { value: 30, type: 'number', is_public: false, description: 'Dias de retenção de logs' },
      'logs.max_file_size': { value: 10485760, type: 'number', is_public: false, description: 'Tamanho máximo do arquivo de log em bytes (10MB)' },

      // Integrações
      'integrations.max_retries': { value: 3, type: 'number', is_public: false, description: 'Máximo de tentativas para integrações' },
      'integrations.timeout': { value: 30000, type: 'number', is_public: false, description: 'Timeout de integrações em ms' },
      'integrations.webhook_secret': { value: '', type: 'string', is_public: false, is_encrypted: true, description: 'Chave secreta para webhooks' },

      // Sistema
      'system.maintenance_mode': { value: false, type: 'boolean', is_public: true, description: 'Modo manutenção ativo' },
      'system.maintenance_message': { value: 'Sistema em manutenção. Voltamos em breve.', type: 'string', is_public: true, description: 'Mensagem de manutenção' },
      'system.allow_registration': { value: false, type: 'boolean', is_public: true, description: 'Permitir auto-registro' },
      'system.default_user_role': { value: 'viewer', type: 'string', is_public: false, description: 'Role padrão para novos usuários' }
    };
  }

  /**
   * Inicializar o sistema de configurações
   */
  async initialize(knexInstance) {
    this.knex = knexInstance;
    await this.createSettingsTable();
    await this.seedDefaultSettings();
    await this.loadAllSettings();
  }

  /**
   * Criar tabela de configurações se não existir
   */
  async createSettingsTable() {
    const exists = await this.knex.schema.hasTable('system_settings');
    if (!exists) {
      await this.knex.schema.createTable('system_settings', (table) => {
        table.increments('id').primary();
        table.string('key', 255).notNullable().unique();
        table.text('value');
        table.string('type', 20).defaultTo('string'); // string, number, boolean, json
        table.text('description');
        table.boolean('is_public').defaultTo(false);
        table.boolean('is_encrypted').defaultTo(false);
        table.timestamp('updated_at').defaultTo(this.knex.fn.now());
        table.timestamp('created_at').defaultTo(this.knex.fn.now());

        table.index(['key']);
        table.index(['is_public']);
      });
    }
  }

  /**
   * Inserir configurações padrão
   */
  async seedDefaultSettings() {
    for (const [key, config] of Object.entries(this.defaultSettings)) {
      const exists = await this.knex('system_settings').where({ key }).first();
      
      if (!exists) {
        let value = config.value;
        
        // Criptografar se necessário
        if (config.is_encrypted && value) {
          value = this.encrypt(value.toString());
        }

        await this.knex('system_settings').insert({
          key,
          value: this.serializeValue(value, config.type),
          type: config.type,
          description: config.description,
          is_public: config.is_public || false,
          is_encrypted: config.is_encrypted || false
        });
      }
    }
  }

  /**
   * Carregar todas as configurações no cache
   */
  async loadAllSettings() {
    const settings = await this.knex('system_settings').select('*');
    
    for (const setting of settings) {
      let value = setting.value;
      
      // Descriptografar se necessário
      if (setting.is_encrypted && value) {
        try {
          value = this.decrypt(value);
        } catch (error) {
          console.error(`Erro ao descriptografar configuração ${setting.key}:`, error);
          continue;
        }
      }

      // Deserializar valor
      value = this.deserializeValue(value, setting.type);
      
      this.cache.set(setting.key, {
        value,
        type: setting.type,
        is_public: setting.is_public,
        is_encrypted: setting.is_encrypted,
        description: setting.description,
        updated_at: setting.updated_at
      });
    }
  }

  /**
   * Obter configuração
   */
  async get(key, defaultValue = null) {
    // Verificar cache primeiro
    if (this.cache.has(key)) {
      return this.cache.get(key).value;
    }

    // Buscar no banco
    const setting = await this.knex('system_settings').where({ key }).first();
    
    if (!setting) {
      return defaultValue;
    }

    let value = setting.value;
    
    // Descriptografar se necessário
    if (setting.is_encrypted && value) {
      try {
        value = this.decrypt(value);
      } catch (error) {
        console.error(`Erro ao descriptografar configuração ${key}:`, error);
        return defaultValue;
      }
    }

    // Deserializar valor
    value = this.deserializeValue(value, setting.type);
    
    // Atualizar cache
    this.cache.set(key, {
      value,
      type: setting.type,
      is_public: setting.is_public,
      is_encrypted: setting.is_encrypted,
      description: setting.description,
      updated_at: setting.updated_at
    });

    return value;
  }

  /**
   * Definir configuração
   */
  async set(key, value, options = {}) {
    const {
      type = 'string',
      description = '',
      is_public = false,
      is_encrypted = false
    } = options;

    let serializedValue = value;

    // Criptografar se necessário
    if (is_encrypted && value) {
      serializedValue = this.encrypt(value.toString());
    }

    // Serializar valor
    serializedValue = this.serializeValue(serializedValue, type);

    // Verificar se já existe
    const existing = await this.knex('system_settings').where({ key }).first();

    if (existing) {
      // Atualizar
      await this.knex('system_settings')
        .where({ key })
        .update({
          value: serializedValue,
          type,
          description,
          is_public,
          is_encrypted,
          updated_at: new Date()
        });
    } else {
      // Criar
      await this.knex('system_settings').insert({
        key,
        value: serializedValue,
        type,
        description,
        is_public,
        is_encrypted
      });
    }

    // Atualizar cache
    this.cache.set(key, {
      value,
      type,
      is_public,
      is_encrypted,
      description,
      updated_at: new Date()
    });

    return true;
  }

  /**
   * Deletar configuração
   */
  async delete(key) {
    await this.knex('system_settings').where({ key }).del();
    this.cache.delete(key);
    return true;
  }

  /**
   * Obter todas as configurações públicas
   */
  async getPublicSettings() {
    const publicSettings = {};
    
    for (const [key, config] of this.cache.entries()) {
      if (config.is_public) {
        publicSettings[key] = config.value;
      }
    }

    return publicSettings;
  }

  /**
   * Obter todas as configurações (somente para admins)
   */
  async getAllSettings() {
    const allSettings = {};
    
    for (const [key, config] of this.cache.entries()) {
      allSettings[key] = {
        value: config.is_encrypted ? '[ENCRYPTED]' : config.value,
        type: config.type,
        is_public: config.is_public,
        is_encrypted: config.is_encrypted,
        description: config.description,
        updated_at: config.updated_at
      };
    }

    return allSettings;
  }

  /**
   * Recarregar cache
   */
  async reloadCache() {
    this.cache.clear();
    await this.loadAllSettings();
  }

  /**
   * Criptografar valor
   */
  encrypt(text) {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Descriptografar valor
   */
  decrypt(encryptedText) {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Serializar valor baseado no tipo
   */
  serializeValue(value, type) {
    if (value === null || value === undefined) {
      return null;
    }

    switch (type) {
      case 'boolean':
        return value.toString();
      case 'number':
        return value.toString();
      case 'json':
        return JSON.stringify(value);
      default:
        return value.toString();
    }
  }

  /**
   * Deserializar valor baseado no tipo
   */
  deserializeValue(value, type) {
    if (value === null || value === undefined) {
      return null;
    }

    switch (type) {
      case 'boolean':
        return value === 'true';
      case 'number':
        return parseFloat(value);
      case 'json':
        try {
          return JSON.parse(value);
        } catch (error) {
          console.error('Erro ao fazer parse de JSON:', error);
          return null;
        }
      default:
        return value;
    }
  }
}

// Instância singleton
const systemSettings = new SystemSettings();

module.exports = systemSettings;