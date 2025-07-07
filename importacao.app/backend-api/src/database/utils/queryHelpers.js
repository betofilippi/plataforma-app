/**
 * Database Query Helpers
 * Provides common database operations and query utilities
 */

const sqliteConfig = require('../../config/sqlite');

class QueryHelpers {
  constructor() {
    this.db = null;
  }

  /**
   * Get database instance
   */
  getDb() {
    if (!this.db) {
      this.db = sqliteConfig.getInstance();
    }
    return this.db;
  }

  /**
   * Execute a raw query with error handling
   */
  async executeRaw(query, bindings = []) {
    try {
      const db = this.getDb();
      return await db.raw(query, bindings);
    } catch (error) {
      console.error('Raw query error:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Paginated query helper
   */
  async paginate(query, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
      const [{ total }] = await countQuery;
      
      // Get paginated results
      const results = await query.offset(offset).limit(limit);
      
      return {
        data: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Pagination error:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Search with full-text search support
   */
  async searchTable(table, searchTerm, columns = [], options = {}) {
    try {
      const db = this.getDb();
      const { limit = 10, page = 1, status = null } = options;
      
      // Try FTS first if available
      const ftsTable = `${table}_fts`;
      const ftsExists = await this.tableExists(ftsTable);
      
      if (ftsExists && searchTerm) {
        // Use FTS for better search performance
        let query = db.raw(`
          SELECT ${table}.*, rank FROM ${table}
          JOIN ${ftsTable} ON ${table}.id = ${ftsTable}.rowid
          WHERE ${ftsTable} MATCH ?
          ORDER BY rank
        `, [`"${searchTerm}"`]);
        
        if (status) {
          query = db.raw(`
            SELECT ${table}.*, rank FROM ${table}
            JOIN ${ftsTable} ON ${table}.id = ${ftsTable}.rowid
            WHERE ${ftsTable} MATCH ? AND ${table}.status = ?
            ORDER BY rank
          `, [`"${searchTerm}"`, status]);
        }
        
        return await this.paginate(query, page, limit);
      }
      
      // Fallback to LIKE search
      let query = db(table);
      
      if (searchTerm && columns.length > 0) {
        query = query.where(function() {
          columns.forEach((column, index) => {
            if (index === 0) {
              this.where(column, 'LIKE', `%${searchTerm}%`);
            } else {
              this.orWhere(column, 'LIKE', `%${searchTerm}%`);
            }
          });
        });
      }
      
      if (status) {
        query = query.where('status', status);
      }
      
      return await this.paginate(query, page, limit);
    } catch (error) {
      console.error('Search error:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Batch insert with conflict resolution
   */
  async batchInsert(table, data, options = {}) {
    try {
      const db = this.getDb();
      const { chunkSize = 100, onConflict = 'ignore' } = options;
      
      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }
      
      const results = [];
      
      // Process in chunks to avoid memory issues
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        
        if (onConflict === 'replace') {
          // Use INSERT OR REPLACE
          const insertQuery = db(table).insert(chunk);
          const query = insertQuery.toString().replace('insert', 'insert or replace');
          const result = await db.raw(query);
          results.push(result);
        } else if (onConflict === 'ignore') {
          // Use INSERT OR IGNORE
          const insertQuery = db(table).insert(chunk);
          const query = insertQuery.toString().replace('insert', 'insert or ignore');
          const result = await db.raw(query);
          results.push(result);
        } else {
          // Regular insert
          const result = await db(table).insert(chunk);
          results.push(result);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Batch insert error:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Upsert (insert or update) operation
   */
  async upsert(table, data, conflictColumns = ['id']) {
    try {
      const db = this.getDb();
      
      if (Array.isArray(data)) {
        return await this.batchUpsert(table, data, conflictColumns);
      }
      
      // Single record upsert
      const columns = Object.keys(data);
      const values = Object.values(data);
      const updateSet = columns
        .filter(col => !conflictColumns.includes(col))
        .map(col => `${col} = excluded.${col}`)
        .join(', ');
      
      const query = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES (${values.map(() => '?').join(', ')})
        ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updateSet}
      `;
      
      return await db.raw(query, values);
    } catch (error) {
      console.error('Upsert error:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Batch upsert operation
   */
  async batchUpsert(table, data, conflictColumns = ['id']) {
    try {
      const db = this.getDb();
      
      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }
      
      const results = [];
      
      for (const record of data) {
        const result = await this.upsert(table, record, conflictColumns);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Batch upsert error:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Get record by ID with error handling
   */
  async findById(table, id, columns = ['*']) {
    try {
      const db = this.getDb();
      const result = await db(table).select(columns).where('id', id).first();
      
      if (!result) {
        throw new Error(`Record with ID ${id} not found in ${table}`);
      }
      
      return result;
    } catch (error) {
      console.error('Find by ID error:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Soft delete (update status to inactive)
   */
  async softDelete(table, id, userId = null) {
    try {
      const db = this.getDb();
      
      const updateData = {
        status: 'inactive',
        updated_at: new Date()
      };
      
      const result = await db(table).where('id', id).update(updateData);
      
      if (result === 0) {
        throw new Error(`Record with ID ${id} not found in ${table}`);
      }
      
      // Log activity
      if (userId) {
        await this.logActivity({
          type: 'delete',
          action: 'soft_delete',
          entity_type: table,
          entity_id: id,
          user_id: userId,
          description: `Soft deleted record from ${table}`
        });
      }
      
      return result;
    } catch (error) {
      console.error('Soft delete error:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Log activity/audit trail
   */
  async logActivity(activityData) {
    try {
      const db = this.getDb();
      
      const activity = {
        ...activityData,
        created_at: new Date(),
        ip_address: activityData.ip_address || null,
        user_agent: activityData.user_agent || null
      };
      
      return await db('activities').insert(activity);
    } catch (error) {
      console.error('Log activity error:', error);
      // Don't throw here to prevent activity logging from breaking main operations
    }
  }

  /**
   * Get table statistics
   */
  async getTableStats(table) {
    try {
      const db = this.getDb();
      
      const [totalCount] = await db(table).count('* as count');
      const [activeCount] = await db(table).where('status', 'active').count('* as count');
      const [inactiveCount] = await db(table).where('status', 'inactive').count('* as count');
      
      return {
        total: totalCount.count,
        active: activeCount.count,
        inactive: inactiveCount.count,
        table: table
      };
    } catch (error) {
      console.error('Table stats error:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Check if table exists
   */
  async tableExists(tableName) {
    try {
      const db = this.getDb();
      const result = await db.raw(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `, [tableName]);
      
      return result.length > 0;
    } catch (error) {
      console.error('Table exists check error:', error);
      return false;
    }
  }

  /**
   * Get database info
   */
  async getDatabaseInfo() {
    try {
      const db = this.getDb();
      
      // Get all tables
      const tables = await db.raw(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      
      // Get database size
      const [sizeResult] = await db.raw('PRAGMA page_count');
      const [pageSizeResult] = await db.raw('PRAGMA page_size');
      const size = sizeResult.page_count * pageSizeResult.page_size;
      
      return {
        tables: tables.map(t => t.name),
        size: size,
        sizeFormatted: this.formatBytes(size)
      };
    } catch (error) {
      console.error('Database info error:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Handle database errors
   */
  handleDatabaseError(error) {
    // SQLite specific error handling
    if (error.code === 'SQLITE_CONSTRAINT') {
      return new Error('Database constraint violation: ' + error.message);
    }
    
    if (error.code === 'SQLITE_LOCKED') {
      return new Error('Database is locked. Please try again.');
    }
    
    if (error.code === 'SQLITE_BUSY') {
      return new Error('Database is busy. Please try again.');
    }
    
    if (error.code === 'SQLITE_CORRUPT') {
      return new Error('Database corruption detected. Please contact support.');
    }
    
    // Generic error handling
    return new Error(`Database error: ${error.message}`);
  }

  /**
   * Transaction helper
   */
  async transaction(callback) {
    const db = this.getDb();
    const trx = await db.transaction();
    
    try {
      const result = await callback(trx);
      await trx.commit();
      return result;
    } catch (error) {
      await trx.rollback();
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Validate required fields
   */
  validateRequiredFields(data, requiredFields) {
    const missing = requiredFields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    return true;
  }

  /**
   * Sanitize data for insertion
   */
  sanitizeData(data, allowedFields) {
    const sanitized = {};
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        sanitized[field] = data[field];
      }
    });
    
    return sanitized;
  }
}

// Export singleton instance
module.exports = new QueryHelpers();