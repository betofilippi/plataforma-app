/**
 * @fileoverview Serviço de backup automático do sistema
 * @author Sistema ERP NXT
 * @since 2025-07-06
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');
const logger = require('../utils/logger');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Serviço de backup e restore do sistema
 */
class BackupService {
  constructor() {
    this.knex = null;
    this.config = {
      backupDir: process.env.BACKUP_DIR || path.join(process.cwd(), 'backups'),
      maxBackups: parseInt(process.env.MAX_BACKUPS) || 30,
      compressionLevel: parseInt(process.env.BACKUP_COMPRESSION) || 6,
      encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || null,
      autoBackupInterval: parseInt(process.env.AUTO_BACKUP_INTERVAL) || 86400000, // 24h
      databases: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'erp_db',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || ''
      }
    };

    this.backupTimer = null;
    this.isInitialized = false;
  }

  /**
   * Inicializar serviço
   */
  async initialize(knexInstance) {
    try {
      this.knex = knexInstance;
      
      // Criar diretório de backup
      await this.ensureBackupDirectory();
      
      // Criar tabela de controle de backups
      await this.createBackupTables();
      
      // Iniciar backup automático se configurado
      if (process.env.AUTO_BACKUP_ENABLED === 'true') {
        this.startAutoBackup();
      }

      this.isInitialized = true;
      logger.info('BackupService inicializado com sucesso', {
        backupDir: this.config.backupDir,
        autoBackup: process.env.AUTO_BACKUP_ENABLED === 'true'
      });

    } catch (error) {
      logger.error('Erro ao inicializar BackupService', { error: error.message });
      throw error;
    }
  }

  /**
   * Garantir que o diretório de backup existe
   */
  async ensureBackupDirectory() {
    try {
      await fs.access(this.config.backupDir);
    } catch (error) {
      await fs.mkdir(this.config.backupDir, { recursive: true });
      logger.info('Diretório de backup criado', { path: this.config.backupDir });
    }
  }

  /**
   * Criar tabelas de controle
   */
  async createBackupTables() {
    if (!this.knex) return;

    const backupsExists = await this.knex.schema.hasTable('system_backups');
    if (!backupsExists) {
      await this.knex.schema.createTable('system_backups', (table) => {
        table.increments('id').primary();
        table.string('filename', 255).notNullable();
        table.string('type', 50).notNullable(); // 'full', 'incremental', 'schema'
        table.bigInteger('size_bytes').notNullable();
        table.string('checksum', 64).notNullable();
        table.boolean('compressed').default(true);
        table.boolean('encrypted').default(false);
        table.text('description').nullable();
        table.json('metadata').nullable();
        table.enum('status', ['running', 'completed', 'failed', 'expired']).default('running');
        table.text('error_message').nullable();
        table.timestamp('started_at').notNullable();
        table.timestamp('completed_at').nullable();
        table.timestamp('expires_at').nullable();
        table.timestamp('created_at').defaultTo(this.knex.fn.now());

        table.index(['type']);
        table.index(['status']);
        table.index(['created_at']);
        table.index(['expires_at']);
      });
    }
  }

  /**
   * Criar backup completo do sistema
   */
  async createFullBackup(description = null) {
    const backupId = await this.startBackupRecord('full', description);
    
    try {
      logger.info('Iniciando backup completo', { backupId });

      // Gerar nome do arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup_full_${timestamp}.sql`;
      const filepath = path.join(this.config.backupDir, filename);

      // Executar dump do banco
      const dumpResult = await this.executeDatabaseDump(filepath);
      
      // Comprimir arquivo se configurado
      let finalFilepath = filepath;
      if (this.config.compressionLevel > 0) {
        finalFilepath = await this.compressFile(filepath);
        await fs.unlink(filepath); // Remove arquivo original
      }

      // Criptografar se configurado
      if (this.config.encryptionKey) {
        finalFilepath = await this.encryptFile(finalFilepath);
      }

      // Calcular checksum
      const checksum = await this.calculateChecksum(finalFilepath);
      const stats = await fs.stat(finalFilepath);

      // Atualizar registro
      await this.completeBackupRecord(backupId, {
        filename: path.basename(finalFilepath),
        size_bytes: stats.size,
        checksum,
        compressed: this.config.compressionLevel > 0,
        encrypted: !!this.config.encryptionKey,
        metadata: {
          tables_included: dumpResult.tables || [],
          dump_options: dumpResult.options || {}
        }
      });

      // Limpar backups antigos
      await this.cleanupOldBackups();

      logger.info('Backup completo criado com sucesso', {
        backupId,
        filename: path.basename(finalFilepath),
        size: stats.size
      });

      return {
        id: backupId,
        filename: path.basename(finalFilepath),
        size: stats.size,
        checksum
      };

    } catch (error) {
      await this.failBackupRecord(backupId, error.message);
      logger.error('Erro ao criar backup completo', { backupId, error: error.message });
      throw error;
    }
  }

  /**
   * Criar backup incremental
   */
  async createIncrementalBackup(description = null) {
    const backupId = await this.startBackupRecord('incremental', description);
    
    try {
      logger.info('Iniciando backup incremental', { backupId });

      // Obter último backup como base
      const lastBackup = await this.getLastSuccessfulBackup();
      const sinceDate = lastBackup ? lastBackup.created_at : new Date(Date.now() - 86400000); // 24h atrás

      // Gerar nome do arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup_incremental_${timestamp}.json`;
      const filepath = path.join(this.config.backupDir, filename);

      // Coletar dados incrementais
      const incrementalData = await this.collectIncrementalData(sinceDate);
      
      // Salvar dados
      await fs.writeFile(filepath, JSON.stringify(incrementalData, null, 2));

      // Comprimir e criptografar se configurado
      let finalFilepath = filepath;
      if (this.config.compressionLevel > 0) {
        finalFilepath = await this.compressFile(filepath);
        await fs.unlink(filepath);
      }

      if (this.config.encryptionKey) {
        finalFilepath = await this.encryptFile(finalFilepath);
      }

      // Calcular checksum
      const checksum = await this.calculateChecksum(finalFilepath);
      const stats = await fs.stat(finalFilepath);

      // Atualizar registro
      await this.completeBackupRecord(backupId, {
        filename: path.basename(finalFilepath),
        size_bytes: stats.size,
        checksum,
        compressed: this.config.compressionLevel > 0,
        encrypted: !!this.config.encryptionKey,
        metadata: {
          since_date: sinceDate.toISOString(),
          records_count: incrementalData.recordsCount || 0
        }
      });

      logger.info('Backup incremental criado com sucesso', {
        backupId,
        filename: path.basename(finalFilepath),
        recordsCount: incrementalData.recordsCount
      });

      return {
        id: backupId,
        filename: path.basename(finalFilepath),
        size: stats.size,
        recordsCount: incrementalData.recordsCount
      };

    } catch (error) {
      await this.failBackupRecord(backupId, error.message);
      logger.error('Erro ao criar backup incremental', { backupId, error: error.message });
      throw error;
    }
  }

  /**
   * Executar dump do banco de dados
   */
  async executeDatabaseDump(filepath) {
    return new Promise((resolve, reject) => {
      const args = [
        '-h', this.config.databases.host,
        '-p', this.config.databases.port,
        '-U', this.config.databases.username,
        '-d', this.config.databases.database,
        '--verbose',
        '--no-password',
        '--format=custom',
        '--file=' + filepath
      ];

      const env = {
        ...process.env,
        PGPASSWORD: this.config.databases.password
      };

      const pgDump = spawn('pg_dump', args, { env });

      let output = '';
      let errorOutput = '';

      pgDump.stdout.on('data', (data) => {
        output += data.toString();
      });

      pgDump.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            output,
            tables: this.extractTablesFromOutput(output),
            options: { format: 'custom', verbose: true }
          });
        } else {
          reject(new Error(`pg_dump failed with code ${code}: ${errorOutput}`));
        }
      });

      pgDump.on('error', (error) => {
        reject(new Error(`Failed to start pg_dump: ${error.message}`));
      });
    });
  }

  /**
   * Comprimir arquivo
   */
  async compressFile(filepath) {
    const compressedPath = filepath + '.gz';
    const data = await fs.readFile(filepath);
    const compressed = await gzip(data, { level: this.config.compressionLevel });
    await fs.writeFile(compressedPath, compressed);
    return compressedPath;
  }

  /**
   * Descomprimir arquivo
   */
  async decompressFile(filepath) {
    const decompressedPath = filepath.replace('.gz', '');
    const data = await fs.readFile(filepath);
    const decompressed = await gunzip(data);
    await fs.writeFile(decompressedPath, decompressed);
    return decompressedPath;
  }

  /**
   * Criptografar arquivo
   */
  async encryptFile(filepath) {
    if (!this.config.encryptionKey) {
      throw new Error('Chave de criptografia não configurada');
    }

    const encryptedPath = filepath + '.enc';
    const data = await fs.readFile(filepath);
    
    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const result = Buffer.concat([iv, encrypted]);
    await fs.writeFile(encryptedPath, result);
    
    await fs.unlink(filepath); // Remove arquivo original
    return encryptedPath;
  }

  /**
   * Descriptografar arquivo
   */
  async decryptFile(filepath) {
    if (!this.config.encryptionKey) {
      throw new Error('Chave de criptografia não configurada');
    }

    const decryptedPath = filepath.replace('.enc', '');
    const data = await fs.readFile(filepath);
    
    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);
    const iv = data.slice(0, 16);
    const encrypted = data.slice(16);
    
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    await fs.writeFile(decryptedPath, decrypted);
    return decryptedPath;
  }

  /**
   * Calcular checksum do arquivo
   */
  async calculateChecksum(filepath) {
    const data = await fs.readFile(filepath);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Coletar dados incrementais
   */
  async collectIncrementalData(sinceDate) {
    const data = {
      timestamp: new Date().toISOString(),
      sinceDate: sinceDate.toISOString(),
      recordsCount: 0,
      tables: {}
    };

    if (!this.knex) {
      return data;
    }

    try {
      // Tabelas com controle de timestamp
      const auditableTables = [
        'users',
        'audit_logs',
        'system_settings',
        'request_metrics',
        'database_metrics',
        'system_metrics'
      ];

      for (const tableName of auditableTables) {
        try {
          const hasTable = await this.knex.schema.hasTable(tableName);
          if (!hasTable) continue;

          const records = await this.knex(tableName)
            .where('created_at', '>=', sinceDate)
            .orWhere('updated_at', '>=', sinceDate);

          if (records.length > 0) {
            data.tables[tableName] = records;
            data.recordsCount += records.length;
          }
        } catch (error) {
          logger.warn(`Erro ao coletar dados incrementais da tabela ${tableName}`, {
            error: error.message
          });
        }
      }

    } catch (error) {
      logger.error('Erro ao coletar dados incrementais', { error: error.message });
    }

    return data;
  }

  /**
   * Restaurar backup
   */
  async restoreBackup(backupId, options = {}) {
    try {
      logger.info('Iniciando restauração de backup', { backupId, options });

      // Obter informações do backup
      const backup = await this.getBackupById(backupId);
      if (!backup) {
        throw new Error('Backup não encontrado');
      }

      const filepath = path.join(this.config.backupDir, backup.filename);
      
      // Verificar se arquivo existe
      await fs.access(filepath);

      // Verificar checksum
      const currentChecksum = await this.calculateChecksum(filepath);
      if (currentChecksum !== backup.checksum) {
        throw new Error('Checksum do backup não confere - arquivo pode estar corrompido');
      }

      let workingFile = filepath;

      // Descriptografar se necessário
      if (backup.encrypted) {
        workingFile = await this.decryptFile(filepath);
      }

      // Descomprimir se necessário
      if (backup.compressed) {
        workingFile = await this.decompressFile(workingFile);
      }

      // Executar restauração baseada no tipo
      let result;
      if (backup.type === 'full') {
        result = await this.restoreFullBackup(workingFile, options);
      } else if (backup.type === 'incremental') {
        result = await this.restoreIncrementalBackup(workingFile, options);
      } else {
        throw new Error(`Tipo de backup não suportado: ${backup.type}`);
      }

      // Limpar arquivos temporários
      if (workingFile !== filepath) {
        await fs.unlink(workingFile);
      }

      logger.info('Backup restaurado com sucesso', { backupId, result });
      return result;

    } catch (error) {
      logger.error('Erro ao restaurar backup', { backupId, error: error.message });
      throw error;
    }
  }

  /**
   * Restaurar backup completo
   */
  async restoreFullBackup(filepath, options = {}) {
    return new Promise((resolve, reject) => {
      const args = [
        '-h', this.config.databases.host,
        '-p', this.config.databases.port,
        '-U', this.config.databases.username,
        '-d', this.config.databases.database,
        '--verbose',
        '--no-password'
      ];

      if (options.cleanFirst) {
        args.push('--clean');
      }

      args.push(filepath);

      const env = {
        ...process.env,
        PGPASSWORD: this.config.databases.password
      };

      const pgRestore = spawn('pg_restore', args, { env });

      let output = '';
      let errorOutput = '';

      pgRestore.stdout.on('data', (data) => {
        output += data.toString();
      });

      pgRestore.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pgRestore.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            output,
            type: 'full',
            restoredAt: new Date().toISOString()
          });
        } else {
          reject(new Error(`pg_restore failed with code ${code}: ${errorOutput}`));
        }
      });

      pgRestore.on('error', (error) => {
        reject(new Error(`Failed to start pg_restore: ${error.message}`));
      });
    });
  }

  /**
   * Restaurar backup incremental
   */
  async restoreIncrementalBackup(filepath, options = {}) {
    const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
    let restoredCount = 0;

    if (!this.knex) {
      throw new Error('Conexão com banco de dados não disponível');
    }

    for (const [tableName, records] of Object.entries(data.tables)) {
      try {
        const hasTable = await this.knex.schema.hasTable(tableName);
        if (!hasTable) {
          logger.warn(`Tabela ${tableName} não existe - pulando restauração`);
          continue;
        }

        for (const record of records) {
          try {
            await this.knex(tableName)
              .insert(record)
              .onConflict('id')
              .merge();
            restoredCount++;
          } catch (error) {
            if (!options.ignoreErrors) {
              throw error;
            }
            logger.warn(`Erro ao restaurar registro em ${tableName}`, {
              error: error.message,
              recordId: record.id
            });
          }
        }
      } catch (error) {
        if (!options.ignoreErrors) {
          throw error;
        }
        logger.warn(`Erro ao restaurar tabela ${tableName}`, {
          error: error.message
        });
      }
    }

    return {
      success: true,
      type: 'incremental',
      restoredRecords: restoredCount,
      restoredAt: new Date().toISOString()
    };
  }

  /**
   * Listar backups disponíveis
   */
  async listBackups(filters = {}) {
    if (!this.knex) return [];

    let query = this.knex('system_backups')
      .select('*')
      .orderBy('created_at', 'desc');

    if (filters.type) {
      query = query.where('type', filters.type);
    }

    if (filters.status) {
      query = query.where('status', filters.status);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    return await query;
  }

  /**
   * Obter backup por ID
   */
  async getBackupById(id) {
    if (!this.knex) return null;

    return await this.knex('system_backups')
      .where('id', id)
      .first();
  }

  /**
   * Remover backup
   */
  async removeBackup(id) {
    const backup = await this.getBackupById(id);
    if (!backup) {
      throw new Error('Backup não encontrado');
    }

    // Remover arquivo
    const filepath = path.join(this.config.backupDir, backup.filename);
    try {
      await fs.unlink(filepath);
    } catch (error) {
      logger.warn('Erro ao remover arquivo de backup', {
        filepath,
        error: error.message
      });
    }

    // Remover registro
    await this.knex('system_backups')
      .where('id', id)
      .delete();

    logger.info('Backup removido', { id, filename: backup.filename });
  }

  /**
   * Iniciar backup automático
   */
  startAutoBackup() {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }

    this.backupTimer = setInterval(async () => {
      try {
        await this.createFullBackup('Backup automático');
      } catch (error) {
        logger.error('Erro no backup automático', { error: error.message });
      }
    }, this.config.autoBackupInterval);

    logger.info('Backup automático iniciado', {
      interval: this.config.autoBackupInterval
    });
  }

  /**
   * Parar backup automático
   */
  stopAutoBackup() {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
      logger.info('Backup automático parado');
    }
  }

  /**
   * Limpar backups antigos
   */
  async cleanupOldBackups() {
    if (!this.knex) return;

    // Marcar backups expirados
    const expirationDate = new Date(Date.now() - (this.config.maxBackups * 86400000));
    
    const expiredBackups = await this.knex('system_backups')
      .where('created_at', '<', expirationDate)
      .where('status', 'completed');

    for (const backup of expiredBackups) {
      try {
        await this.removeBackup(backup.id);
      } catch (error) {
        logger.warn('Erro ao remover backup expirado', {
          backupId: backup.id,
          error: error.message
        });
      }
    }

    logger.info('Limpeza de backups concluída', {
      removedCount: expiredBackups.length
    });
  }

  /**
   * Helpers para controle de registros
   */
  async startBackupRecord(type, description) {
    if (!this.knex) return null;

    const [record] = await this.knex('system_backups')
      .insert({
        filename: 'pending',
        type,
        size_bytes: 0,
        checksum: '',
        description,
        status: 'running',
        started_at: new Date()
      })
      .returning('id');

    return record.id || record;
  }

  async completeBackupRecord(id, data) {
    if (!this.knex || !id) return;

    await this.knex('system_backups')
      .where('id', id)
      .update({
        ...data,
        status: 'completed',
        completed_at: new Date()
      });
  }

  async failBackupRecord(id, errorMessage) {
    if (!this.knex || !id) return;

    await this.knex('system_backups')
      .where('id', id)
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date()
      });
  }

  async getLastSuccessfulBackup() {
    if (!this.knex) return null;

    return await this.knex('system_backups')
      .where('status', 'completed')
      .orderBy('created_at', 'desc')
      .first();
  }

  extractTablesFromOutput(output) {
    // Extrair nomes das tabelas do output do pg_dump
    const tableMatches = output.match(/COPY (\w+)/g) || [];
    return tableMatches.map(match => match.replace('COPY ', ''));
  }

  /**
   * Verificar saúde do serviço
   */
  getHealthStatus() {
    return {
      initialized: this.isInitialized,
      autoBackupActive: !!this.backupTimer,
      backupDirectory: this.config.backupDir,
      maxBackups: this.config.maxBackups,
      lastCheck: new Date().toISOString()
    };
  }
}

// Instância singleton
const backupService = new BackupService();

module.exports = { backupService };