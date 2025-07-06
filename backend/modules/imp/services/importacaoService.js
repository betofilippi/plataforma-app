const db = require('../../../src/database/connection');

/**
 * Service layer for all importation tables
 * Provides unified CRUD operations for the 18 importation tables
 */

class ImportacaoService {
  constructor() {
    // Define all 18 importation tables with their configurations
    this.tables = {
      // Main table - Proforma Invoice
      proforma_invoice: {
        name: 'importacao_01_1_proforma_invoice',
        displayName: 'Proforma Invoice',
        primaryKey: 'id',
        hasItems: true,
        itemsTable: 'importacao_01_2_proforma_invoice_items'
      },
      
      // Payment documents
      comprovante_pagamento: {
        name: 'importacao_02_1_comprovante_pagamento_cambio',
        displayName: 'Comprovante de Pagamento de Câmbio',
        primaryKey: 'id',
        foreignKey: 'importacao_01_1_proforma_invoice_id'
      },
      
      // Exchange contract
      contrato_cambio: {
        name: 'importacao_03_1_contrato_de_cambio',
        displayName: 'Contrato de Câmbio',
        primaryKey: 'id',
        foreignKey: 'importacao_01_1_proforma_invoice_id'
      },
      
      // SWIFT transfer
      swift: {
        name: 'importacao_04_1_swift',
        displayName: 'SWIFT',
        primaryKey: 'id',
        foreignKey: 'importacao_01_1_proforma_invoice_id'
      },
      
      // Commercial invoice
      commercial_invoice: {
        name: 'importacao_05_1_commercial_invoice',
        displayName: 'Commercial Invoice',
        primaryKey: 'id',
        foreignKey: 'importacao_01_1_proforma_invoice_id',
        hasItems: true,
        itemsTable: 'importacao_05_2_commercial_invoice_items'
      },
      
      // Packing list
      packing_list: {
        name: 'importacao_06_1_packing_list',
        displayName: 'Packing List',
        primaryKey: 'id',
        foreignKey: 'importacao_01_1_proforma_invoice_id',
        hasItems: true,
        itemsTable: 'importacao_06_3_packing_list_items',
        hasContainers: true,
        containersTable: 'importacao_06_2_packing_list_containers'
      },
      
      // Bill of lading
      bill_of_lading: {
        name: 'importacao_07_1_bill_of_lading',
        displayName: 'Bill of Lading',
        primaryKey: 'id',
        foreignKey: 'importacao_01_1_proforma_invoice_id',
        hasContainers: true,
        containersTable: 'importacao_07_2_bill_of_lading_containers'
      },
      
      // DI (Import Declaration)
      di_declaracao: {
        name: 'importacao_08_1_di_declaracao_importacao',
        displayName: 'DI - Declaração de Importação',
        primaryKey: 'id',
        foreignKey: 'importacao_01_1_proforma_invoice_id',
        hasItems: true,
        itemsTable: 'importacao_08_2_di_adicoes',
        hasTributes: true,
        tributesTable: 'importacao_08_3_di_tributos_por_adicao'
      },
      
      // Invoice (Nota Fiscal)
      nota_fiscal: {
        name: 'importacao_09_1_nota_fiscal',
        displayName: 'Nota Fiscal',
        primaryKey: 'id',
        foreignKey: 'importacao_01_1_proforma_invoice_id',
        hasItems: true,
        itemsTable: 'importacao_09_2_nota_fiscal_itens'
      },
      
      // Final closing
      fechamento: {
        name: 'importacao_10_1_fechamento',
        displayName: 'Fechamento',
        primaryKey: 'id',
        foreignKey: 'importacao_01_1_proforma_invoice_id'
      }
    };
  }

  /**
   * Get all records for a specific table with pagination and filters
   */
  async getAllRecords(tableKey, {
    page = 1,
    limit = 20,
    search = '',
    invoice_number = '',
    date_from = null,
    date_to = null,
    status = null,
    sort = 'created_at',
    order = 'desc'
  } = {}) {
    try {
      const tableConfig = this.tables[tableKey];
      if (!tableConfig) {
        throw new Error(`Tabela ${tableKey} não encontrada`);
      }

      const offset = (page - 1) * limit;
      
      let query = db(tableConfig.name)
        .select('*');

      // Apply search filters
      if (search) {
        // Get table columns to determine searchable fields
        const columns = await db(tableConfig.name).columnInfo();
        const searchableColumns = Object.keys(columns).filter(col => 
          ['text', 'varchar', 'character varying'].includes(columns[col].type.toLowerCase()) &&
          !col.includes('id') && 
          !col.includes('created_at') && 
          !col.includes('updated_at')
        );

        if (searchableColumns.length > 0) {
          query = query.where(function() {
            searchableColumns.forEach((col, index) => {
              if (index === 0) {
                this.where(col, 'ilike', `%${search}%`);
              } else {
                this.orWhere(col, 'ilike', `%${search}%`);
              }
            });
          });
        }
      }

      // Filter by invoice number
      if (invoice_number) {
        query = query.where('invoice_number', 'ilike', `%${invoice_number}%`);
      }

      // Date range filter
      if (date_from && date_to) {
        // Try to find a date column
        const columns = await db(tableConfig.name).columnInfo();
        const dateColumn = Object.keys(columns).find(col => 
          col.includes('data') || col.includes('date') || col === 'created_at'
        );
        
        if (dateColumn) {
          query = query.whereBetween(dateColumn, [date_from, date_to]);
        }
      }

      // Status filter (if exists)
      if (status !== null) {
        const columns = await db(tableConfig.name).columnInfo();
        if (columns.status) {
          query = query.where('status', status);
        } else if (columns.ativo) {
          query = query.where('ativo', status === 'ativo');
        }
      }

      // Get total count for pagination
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count(`${tableConfig.primaryKey} as count`);
      const total = parseInt(count);

      // Apply sorting and pagination
      const validSortFields = ['created_at', 'updated_at', 'invoice_number', tableConfig.primaryKey];
      if (validSortFields.includes(sort)) {
        query = query.orderBy(sort, order);
      } else {
        query = query.orderBy('created_at', 'desc');
      }

      const records = await query.limit(limit).offset(offset);

      return {
        data: records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error(`Error fetching ${tableKey} records:`, error);
      throw new Error(`Erro ao buscar registros de ${tableKey}: ${error.message}`);
    }
  }

  /**
   * Get record by ID with related data
   */
  async getRecordById(tableKey, id) {
    try {
      const tableConfig = this.tables[tableKey];
      if (!tableConfig) {
        throw new Error(`Tabela ${tableKey} não encontrada`);
      }

      const record = await db(tableConfig.name)
        .where(tableConfig.primaryKey, id)
        .first();

      if (!record) {
        throw new Error('Registro não encontrado');
      }

      // Get related items if table has items
      if (tableConfig.hasItems && tableConfig.itemsTable) {
        try {
          const items = await db(tableConfig.itemsTable)
            .where(tableConfig.foreignKey || 'importacao_01_1_proforma_invoice_id', record[tableConfig.foreignKey || 'id'])
            .orderBy('id');
          record.items = items;
        } catch (err) {
          console.warn(`Items table ${tableConfig.itemsTable} not available:`, err.message);
          record.items = [];
        }
      }

      // Get related containers if table has containers
      if (tableConfig.hasContainers && tableConfig.containersTable) {
        try {
          const containers = await db(tableConfig.containersTable)
            .where(tableConfig.foreignKey || 'importacao_01_1_proforma_invoice_id', record[tableConfig.foreignKey || 'id'])
            .orderBy('id');
          record.containers = containers;
        } catch (err) {
          console.warn(`Containers table ${tableConfig.containersTable} not available:`, err.message);
          record.containers = [];
        }
      }

      // Get related tributes if table has tributes
      if (tableConfig.hasTributes && tableConfig.tributesTable) {
        try {
          const tributes = await db(tableConfig.tributesTable)
            .where(tableConfig.foreignKey || 'importacao_01_1_proforma_invoice_id', record[tableConfig.foreignKey || 'id'])
            .orderBy('id');
          record.tributes = tributes;
        } catch (err) {
          console.warn(`Tributes table ${tableConfig.tributesTable} not available:`, err.message);
          record.tributes = [];
        }
      }

      return record;
    } catch (error) {
      console.error(`Error fetching ${tableKey} record by ID:`, error);
      throw new Error(`Erro ao buscar registro: ${error.message}`);
    }
  }

  /**
   * Create new record
   */
  async createRecord(tableKey, recordData) {
    const trx = await db.transaction();
    
    try {
      const tableConfig = this.tables[tableKey];
      if (!tableConfig) {
        throw new Error(`Tabela ${tableKey} não encontrada`);
      }

      // Extract items, containers, and tributes from main data
      const { items, containers, tributes, ...mainData } = recordData;

      // Add timestamps
      mainData.created_at = new Date();
      mainData.updated_at = new Date();

      // Insert main record
      const [newRecord] = await trx(tableConfig.name)
        .insert(mainData)
        .returning('*');

      // Insert items if provided
      if (items && tableConfig.hasItems && tableConfig.itemsTable) {
        const itemsToInsert = items.map(item => ({
          ...item,
          [tableConfig.foreignKey || 'importacao_01_1_proforma_invoice_id']: newRecord[tableConfig.primaryKey],
          created_at: new Date(),
          updated_at: new Date()
        }));
        
        if (itemsToInsert.length > 0) {
          await trx(tableConfig.itemsTable).insert(itemsToInsert);
        }
      }

      // Insert containers if provided
      if (containers && tableConfig.hasContainers && tableConfig.containersTable) {
        const containersToInsert = containers.map(container => ({
          ...container,
          [tableConfig.foreignKey || 'importacao_01_1_proforma_invoice_id']: newRecord[tableConfig.primaryKey],
          created_at: new Date(),
          updated_at: new Date()
        }));
        
        if (containersToInsert.length > 0) {
          await trx(tableConfig.containersTable).insert(containersToInsert);
        }
      }

      // Insert tributes if provided
      if (tributes && tableConfig.hasTributes && tableConfig.tributesTable) {
        const tributesToInsert = tributes.map(tribute => ({
          ...tribute,
          [tableConfig.foreignKey || 'importacao_01_1_proforma_invoice_id']: newRecord[tableConfig.primaryKey],
          created_at: new Date(),
          updated_at: new Date()
        }));
        
        if (tributesToInsert.length > 0) {
          await trx(tableConfig.tributesTable).insert(tributesToInsert);
        }
      }

      await trx.commit();
      
      // Return complete record with related data
      return await this.getRecordById(tableKey, newRecord[tableConfig.primaryKey]);
    } catch (error) {
      await trx.rollback();
      console.error(`Error creating ${tableKey} record:`, error);
      throw new Error(`Erro ao criar registro: ${error.message}`);
    }
  }

  /**
   * Update record
   */
  async updateRecord(tableKey, id, recordData) {
    const trx = await db.transaction();
    
    try {
      const tableConfig = this.tables[tableKey];
      if (!tableConfig) {
        throw new Error(`Tabela ${tableKey} não encontrada`);
      }

      // Check if record exists
      const existingRecord = await trx(tableConfig.name)
        .where(tableConfig.primaryKey, id)
        .first();

      if (!existingRecord) {
        throw new Error('Registro não encontrado');
      }

      // Extract items, containers, and tributes from main data
      const { items, containers, tributes, ...mainData } = recordData;

      // Add updated timestamp
      mainData.updated_at = new Date();

      // Update main record
      const [updatedRecord] = await trx(tableConfig.name)
        .where(tableConfig.primaryKey, id)
        .update(mainData)
        .returning('*');

      // Update items if provided
      if (items && tableConfig.hasItems && tableConfig.itemsTable) {
        // Delete existing items
        await trx(tableConfig.itemsTable)
          .where(tableConfig.foreignKey || 'importacao_01_1_proforma_invoice_id', id)
          .del();

        // Insert new items
        const itemsToInsert = items.map(item => ({
          ...item,
          [tableConfig.foreignKey || 'importacao_01_1_proforma_invoice_id']: id,
          created_at: new Date(),
          updated_at: new Date()
        }));
        
        if (itemsToInsert.length > 0) {
          await trx(tableConfig.itemsTable).insert(itemsToInsert);
        }
      }

      // Update containers if provided
      if (containers && tableConfig.hasContainers && tableConfig.containersTable) {
        // Delete existing containers
        await trx(tableConfig.containersTable)
          .where(tableConfig.foreignKey || 'importacao_01_1_proforma_invoice_id', id)
          .del();

        // Insert new containers
        const containersToInsert = containers.map(container => ({
          ...container,
          [tableConfig.foreignKey || 'importacao_01_1_proforma_invoice_id']: id,
          created_at: new Date(),
          updated_at: new Date()
        }));
        
        if (containersToInsert.length > 0) {
          await trx(tableConfig.containersTable).insert(containersToInsert);
        }
      }

      // Update tributes if provided
      if (tributes && tableConfig.hasTributes && tableConfig.tributesTable) {
        // Delete existing tributes
        await trx(tableConfig.tributesTable)
          .where(tableConfig.foreignKey || 'importacao_01_1_proforma_invoice_id', id)
          .del();

        // Insert new tributes
        const tributesToInsert = tributes.map(tribute => ({
          ...tribute,
          [tableConfig.foreignKey || 'importacao_01_1_proforma_invoice_id']: id,
          created_at: new Date(),
          updated_at: new Date()
        }));
        
        if (tributesToInsert.length > 0) {
          await trx(tableConfig.tributesTable).insert(tributesToInsert);
        }
      }

      await trx.commit();
      
      // Return complete updated record
      return await this.getRecordById(tableKey, id);
    } catch (error) {
      await trx.rollback();
      console.error(`Error updating ${tableKey} record:`, error);
      throw new Error(`Erro ao atualizar registro: ${error.message}`);
    }
  }

  /**
   * Delete record
   */
  async deleteRecord(tableKey, id) {
    const trx = await db.transaction();
    
    try {
      const tableConfig = this.tables[tableKey];
      if (!tableConfig) {
        throw new Error(`Tabela ${tableKey} não encontrada`);
      }

      // Check if record exists
      const existingRecord = await trx(tableConfig.name)
        .where(tableConfig.primaryKey, id)
        .first();

      if (!existingRecord) {
        throw new Error('Registro não encontrado');
      }

      // Delete related items
      if (tableConfig.hasItems && tableConfig.itemsTable) {
        await trx(tableConfig.itemsTable)
          .where(tableConfig.foreignKey || 'importacao_01_1_proforma_invoice_id', id)
          .del();
      }

      // Delete related containers
      if (tableConfig.hasContainers && tableConfig.containersTable) {
        await trx(tableConfig.containersTable)
          .where(tableConfig.foreignKey || 'importacao_01_1_proforma_invoice_id', id)
          .del();
      }

      // Delete related tributes
      if (tableConfig.hasTributes && tableConfig.tributesTable) {
        await trx(tableConfig.tributesTable)
          .where(tableConfig.foreignKey || 'importacao_01_1_proforma_invoice_id', id)
          .del();
      }

      // Delete main record
      await trx(tableConfig.name)
        .where(tableConfig.primaryKey, id)
        .del();

      await trx.commit();
      
      return { message: 'Registro removido com sucesso' };
    } catch (error) {
      await trx.rollback();
      console.error(`Error deleting ${tableKey} record:`, error);
      throw new Error(`Erro ao excluir registro: ${error.message}`);
    }
  }

  /**
   * Get table configuration
   */
  getTableConfig(tableKey) {
    return this.tables[tableKey];
  }

  /**
   * Get all available tables
   */
  getAllTables() {
    return Object.keys(this.tables).map(key => ({
      key,
      ...this.tables[key]
    }));
  }

  /**
   * Get statistics for a table
   */
  async getTableStats(tableKey) {
    try {
      const tableConfig = this.tables[tableKey];
      if (!tableConfig) {
        throw new Error(`Tabela ${tableKey} não encontrada`);
      }

      const stats = await db(tableConfig.name)
        .select([
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL \'30 days\') as last_30_days'),
          db.raw('COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL \'7 days\') as last_7_days'),
          db.raw('MIN(created_at) as oldest_record'),
          db.raw('MAX(created_at) as newest_record')
        ])
        .first();

      return {
        ...stats,
        total: parseInt(stats.total),
        last_30_days: parseInt(stats.last_30_days),
        last_7_days: parseInt(stats.last_7_days)
      };
    } catch (error) {
      console.error(`Error fetching ${tableKey} stats:`, error);
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }
  }

  /**
   * Export records to CSV
   */
  async exportRecords(tableKey, filters = {}) {
    try {
      const tableConfig = this.tables[tableKey];
      if (!tableConfig) {
        throw new Error(`Tabela ${tableKey} não encontrada`);
      }

      const result = await this.getAllRecords(tableKey, {
        ...filters,
        limit: 10000, // Large limit for export
        page: 1
      });

      return result.data;
    } catch (error) {
      console.error(`Error exporting ${tableKey} records:`, error);
      throw new Error(`Erro ao exportar registros: ${error.message}`);
    }
  }

  /**
   * Bulk operations
   */
  async bulkOperation(tableKey, operation, recordIds, data = {}) {
    const trx = await db.transaction();
    
    try {
      const tableConfig = this.tables[tableKey];
      if (!tableConfig) {
        throw new Error(`Tabela ${tableKey} não encontrada`);
      }

      let result;
      
      switch (operation) {
        case 'delete':
          await trx(tableConfig.name)
            .whereIn(tableConfig.primaryKey, recordIds)
            .del();
          result = { message: `${recordIds.length} registros removidos com sucesso` };
          break;

        case 'update_status':
          if (data.status !== undefined) {
            await trx(tableConfig.name)
              .whereIn(tableConfig.primaryKey, recordIds)
              .update({
                status: data.status,
                updated_at: new Date()
              });
            result = { message: `Status atualizado para ${recordIds.length} registros` };
          } else {
            throw new Error('Status é obrigatório para esta operação');
          }
          break;

        default:
          throw new Error(`Operação ${operation} não suportada`);
      }

      await trx.commit();
      return result;
    } catch (error) {
      await trx.rollback();
      console.error(`Error in bulk operation ${operation} for ${tableKey}:`, error);
      throw new Error(`Erro na operação em lote: ${error.message}`);
    }
  }
}

module.exports = new ImportacaoService();