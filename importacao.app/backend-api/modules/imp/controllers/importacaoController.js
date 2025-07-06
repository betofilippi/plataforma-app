const importacaoService = require('../services/importacaoService');

/**
 * Controller for importation CRUD operations
 * Handles HTTP requests for all 18 importation tables
 */

class ImportacaoController {
  /**
   * Get all records for a specific table
   * GET /api/imp/:tableKey
   */
  async getAllRecords(req, res) {
    try {
      const { tableKey } = req.params;
      const {
        page = 1,
        limit = 20,
        search = '',
        invoice_number = '',
        date_from = null,
        date_to = null,
        status = null,
        sort = 'created_at',
        order = 'desc'
      } = req.query;

      const result = await importacaoService.getAllRecords(tableKey, {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        invoice_number,
        date_from,
        date_to,
        status,
        sort,
        order
      });

      res.json({
        success: true,
        message: 'Registros recuperados com sucesso',
        tableKey,
        table: importacaoService.getTableConfig(tableKey)?.displayName,
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAllRecords:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get record by ID
   * GET /api/imp/:tableKey/:id
   */
  async getRecordById(req, res) {
    try {
      const { tableKey, id } = req.params;
      const record = await importacaoService.getRecordById(tableKey, parseInt(id));

      res.json({
        success: true,
        message: 'Registro encontrado com sucesso',
        tableKey,
        table: importacaoService.getTableConfig(tableKey)?.displayName,
        data: record,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getRecordById:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Registro não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create new record
   * POST /api/imp/:tableKey
   */
  async createRecord(req, res) {
    try {
      const { tableKey } = req.params;
      const recordData = req.body;

      const newRecord = await importacaoService.createRecord(tableKey, recordData);

      res.status(201).json({
        success: true,
        message: 'Registro criado com sucesso',
        tableKey,
        table: importacaoService.getTableConfig(tableKey)?.displayName,
        data: newRecord,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createRecord:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update record
   * PUT /api/imp/:tableKey/:id
   */
  async updateRecord(req, res) {
    try {
      const { tableKey, id } = req.params;
      const recordData = req.body;

      const updatedRecord = await importacaoService.updateRecord(tableKey, parseInt(id), recordData);

      res.json({
        success: true,
        message: 'Registro atualizado com sucesso',
        tableKey,
        table: importacaoService.getTableConfig(tableKey)?.displayName,
        data: updatedRecord,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateRecord:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Registro não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete record
   * DELETE /api/imp/:tableKey/:id
   */
  async deleteRecord(req, res) {
    try {
      const { tableKey, id } = req.params;
      const result = await importacaoService.deleteRecord(tableKey, parseInt(id));

      res.json({
        success: true,
        message: result.message,
        tableKey,
        table: importacaoService.getTableConfig(tableKey)?.displayName,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in deleteRecord:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Registro não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get all available tables
   * GET /api/imp/tables
   */
  async getAllTables(req, res) {
    try {
      const tables = importacaoService.getAllTables();

      res.json({
        success: true,
        message: 'Tabelas recuperadas com sucesso',
        data: tables,
        count: tables.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAllTables:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get table configuration
   * GET /api/imp/tables/:tableKey/config
   */
  async getTableConfig(req, res) {
    try {
      const { tableKey } = req.params;
      const config = importacaoService.getTableConfig(tableKey);

      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'Tabela não encontrada',
          message: `Configuração para tabela ${tableKey} não encontrada`,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: 'Configuração recuperada com sucesso',
        data: { key: tableKey, ...config },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getTableConfig:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get table statistics
   * GET /api/imp/:tableKey/stats
   */
  async getTableStats(req, res) {
    try {
      const { tableKey } = req.params;
      const stats = await importacaoService.getTableStats(tableKey);

      res.json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        tableKey,
        table: importacaoService.getTableConfig(tableKey)?.displayName,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getTableStats:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Export records to CSV
   * GET /api/imp/:tableKey/export
   */
  async exportRecords(req, res) {
    try {
      const { tableKey } = req.params;
      const {
        search = '',
        invoice_number = '',
        date_from = null,
        date_to = null,
        status = null
      } = req.query;

      const records = await importacaoService.exportRecords(tableKey, {
        search,
        invoice_number,
        date_from,
        date_to,
        status
      });

      const tableConfig = importacaoService.getTableConfig(tableKey);
      
      // Set CSV headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${tableKey}_export.csv`);

      if (records.length === 0) {
        res.write('Nenhum registro encontrado\n');
        return res.end();
      }

      // Get column headers from first record
      const headers = Object.keys(records[0]).filter(key => 
        !key.includes('items') && !key.includes('containers') && !key.includes('tributes')
      );
      
      // Write CSV header
      res.write(headers.map(h => `"${h}"`).join(',') + '\n');

      // Write CSV rows
      records.forEach(record => {
        const row = headers.map(header => {
          let value = record[header];
          if (value === null || value === undefined) {
            value = '';
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        res.write(row.join(',') + '\n');
      });

      res.end();
    } catch (error) {
      console.error('Error in exportRecords:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Bulk operations
   * POST /api/imp/:tableKey/bulk
   */
  async bulkOperation(req, res) {
    try {
      const { tableKey } = req.params;
      const { operation, record_ids, data = {} } = req.body;

      if (!operation || !Array.isArray(record_ids) || record_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Operação e IDs dos registros são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      const result = await importacaoService.bulkOperation(tableKey, operation, record_ids, data);

      res.json({
        success: true,
        message: result.message,
        tableKey,
        table: importacaoService.getTableConfig(tableKey)?.displayName,
        operation,
        affected_records: record_ids.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in bulkOperation:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get importation process dashboard data
   * GET /api/imp/dashboard
   */
  async getDashboardData(req, res) {
    try {
      const tables = importacaoService.getAllTables();
      const dashboardData = {
        tables: [],
        summary: {
          total_processes: 0,
          active_processes: 0,
          completed_processes: 0,
          recent_activity: 0
        }
      };

      // Get stats for each table
      for (const table of tables) {
        try {
          const stats = await importacaoService.getTableStats(table.key);
          dashboardData.tables.push({
            key: table.key,
            name: table.displayName,
            ...stats
          });
          
          // Accumulate summary data
          dashboardData.summary.total_processes += stats.total;
          dashboardData.summary.recent_activity += stats.last_7_days;
        } catch (err) {
          console.warn(`Error getting stats for ${table.key}:`, err.message);
        }
      }

      // Get main processes count from proforma invoices
      try {
        const proformaStats = await importacaoService.getTableStats('proforma_invoice');
        dashboardData.summary.active_processes = proformaStats.total;
      } catch (err) {
        console.warn('Error getting proforma stats:', err.message);
      }

      res.json({
        success: true,
        message: 'Dashboard recuperado com sucesso',
        data: dashboardData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getDashboardData:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Search across all importation tables
   * POST /api/imp/search
   */
  async globalSearch(req, res) {
    try {
      const { query, table_keys = [], limit = 50 } = req.body;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Consulta deve ter pelo menos 2 caracteres',
          timestamp: new Date().toISOString()
        });
      }

      const tables = importacaoService.getAllTables();
      const searchResults = [];

      const tablesToSearch = table_keys.length > 0 
        ? tables.filter(t => table_keys.includes(t.key))
        : tables;

      for (const table of tablesToSearch) {
        try {
          const results = await importacaoService.getAllRecords(table.key, {
            search: query,
            limit: Math.min(limit, 10),
            page: 1
          });

          if (results.data.length > 0) {
            searchResults.push({
              table_key: table.key,
              table_name: table.displayName,
              results: results.data,
              total: results.pagination.total
            });
          }
        } catch (err) {
          console.warn(`Error searching in ${table.key}:`, err.message);
        }
      }

      res.json({
        success: true,
        message: 'Busca realizada com sucesso',
        query,
        data: searchResults,
        total_tables: searchResults.length,
        total_results: searchResults.reduce((sum, table) => sum + table.results.length, 0),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in globalSearch:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new ImportacaoController();