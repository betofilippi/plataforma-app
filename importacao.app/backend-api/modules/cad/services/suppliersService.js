const { getDb } = require('../../../src/database/connection');

/**
 * Service layer for suppliers (importacao_fornecedores)
 * Handles all database operations for supplier management
 */

class SuppliersService {
  constructor() {
    this.tableName = 'importacao_fornecedores';
  }

  /**
   * Get all suppliers with pagination and filters
   */
  async getAllSuppliers({
    page = 1,
    limit = 10,
    search = '',
    ativo = null,
    sort = 'nome',
    order = 'asc'
  } = {}) {
    try {
      const offset = (page - 1) * limit;
      
      const db = getDb();
      let query = db(this.tableName)
        .select([
          'id',
          'nome',
          'email',
          'telefone',
          'cnpj',
          'endereco',
          'cidade',
          'estado',
          'cep',
          'status',
          'contato_principal',
          'observacoes',
          'created_at',
          'updated_at'
        ]);

      // Apply filters
      if (search) {
        query = query.where(function() {
          this.where('nome', 'like', `%${search}%`)
              .orWhere('email', 'like', `%${search}%`)
              .orWhere('cnpj', 'like', `%${search}%`)
              .orWhere('contato_principal', 'like', `%${search}%`);
        });
      }

      if (ativo !== null) {
        query = query.where('status', ativo ? 'ativo' : 'inativo');
      }

      // Get total count for pagination
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count('id as count');
      const total = parseInt(count);

      // Apply sorting and pagination
      const validSortFields = [
        'nome', 'cnpj', 'email', 'cidade', 'estado', 'created_at'
      ];
      
      if (validSortFields.includes(sort)) {
        query = query.orderBy(sort, order);
      } else {
        query = query.orderBy('nome', 'asc');
      }

      const suppliers = await query.limit(limit).offset(offset);

      return {
        data: suppliers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw new Error('Erro ao buscar fornecedores: ' + error.message);
    }
  }

  /**
   * Get supplier by ID
   */
  async getSupplierById(id) {
    try {
      const db = getDb();
      const supplier = await db(this.tableName)
        .where('id', id)
        .first();

      if (!supplier) {
        throw new Error('Fornecedor não encontrado');
      }

      return supplier;
    } catch (error) {
      console.error('Error fetching supplier by ID:', error);
      throw new Error('Erro ao buscar fornecedor: ' + error.message);
    }
  }

  /**
   * Create new supplier
   */
  async createSupplier(supplierData) {
    try {
      const db = getDb();
      
      // Check if CNPJ already exists
      if (supplierData.cnpj) {
        const existingSupplier = await db(this.tableName)
          .where('cnpj', supplierData.cnpj)
          .first();

        if (existingSupplier) {
          throw new Error('Já existe um fornecedor com este CNPJ');
        }
      }

      const [newSupplierId] = await db(this.tableName)
        .insert({
          ...supplierData,
          status: supplierData.status || 'ativo',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      return await this.getSupplierById(newSupplierId);
    } catch (error) {
      console.error('Error creating supplier:', error);
      if (error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao criar fornecedor: ' + error.message);
    }
  }

  /**
   * Update supplier
   */
  async updateSupplier(id, supplierData) {
    try {
      const db = getDb();
      
      // Check if supplier exists
      const existingSupplier = await this.getSupplierById(id);

      // Check if CNPJ is being changed and already exists
      if (supplierData.cnpj && supplierData.cnpj !== existingSupplier.cnpj) {
        const duplicateSupplier = await db(this.tableName)
          .where('cnpj', supplierData.cnpj)
          .whereNot('id', id)
          .first();

        if (duplicateSupplier) {
          throw new Error('Já existe um fornecedor com este CNPJ');
        }
      }

      await db(this.tableName)
        .where('id', id)
        .update({
          ...supplierData,
          updated_at: new Date().toISOString()
        });

      return await this.getSupplierById(id);
    } catch (error) {
      console.error('Error updating supplier:', error);
      if (error.message.includes('não encontrado') || error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao atualizar fornecedor: ' + error.message);
    }
  }

  /**
   * Delete supplier
   */
  async deleteSupplier(id) {
    try {
      const db = getDb();
      
      // Check if supplier exists
      await this.getSupplierById(id);

      // Note: In our current schema, we don't have a direct fornecedor_id in products
      // So we'll just do a soft delete for now
      await db(this.tableName)
        .where('id', id)
        .update({ 
          status: 'inativo',
          updated_at: new Date().toISOString()
        });
      
      return { soft_deleted: true };
    } catch (error) {
      console.error('Error deleting supplier:', error);
      if (error.message.includes('não encontrado')) {
        throw error;
      }
      throw new Error('Erro ao excluir fornecedor: ' + error.message);
    }
  }

  /**
   * Toggle supplier status
   */
  async toggleSupplierStatus(id) {
    try {
      const db = getDb();
      const supplier = await this.getSupplierById(id);
      
      const newStatus = supplier.status === 'ativo' ? 'inativo' : 'ativo';
      
      await db(this.tableName)
        .where('id', id)
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        });

      return await this.getSupplierById(id);
    } catch (error) {
      console.error('Error toggling supplier status:', error);
      throw new Error('Erro ao alterar status do fornecedor: ' + error.message);
    }
  }

  /**
   * Get supplier statistics
   */
  async getSupplierStats() {
    try {
      const db = getDb();
      
      const [
        totalSuppliers,
        activeSuppliers,
        inactiveSuppliers
      ] = await Promise.all([
        db(this.tableName).count('id as count').first(),
        db(this.tableName).where('status', 'ativo').count('id as count').first(),
        db(this.tableName).where('status', 'inativo').count('id as count').first()
      ]);

      return {
        total: parseInt(totalSuppliers.count) || 0,
        ativo: parseInt(activeSuppliers.count) || 0,
        inativo: parseInt(inactiveSuppliers.count) || 0
      };
    } catch (error) {
      console.error('Error getting supplier stats:', error);
      throw new Error('Erro ao buscar estatísticas de fornecedores: ' + error.message);
    }
  }

  /**
   * Get suppliers for dropdown/select
   */
  async getSuppliersForSelect(activeOnly = true) {
    try {
      const db = getDb();
      let query = db(this.tableName)
        .select('id', 'nome', 'cnpj', 'contato_principal')
        .orderBy('nome', 'asc');

      if (activeOnly) {
        query = query.where('status', 'ativo');
      }

      return await query;
    } catch (error) {
      console.error('Error getting suppliers for select:', error);
      throw new Error('Erro ao buscar fornecedores para seleção: ' + error.message);
    }
  }

  /**
   * Search suppliers
   */
  async searchSuppliers(searchTerm) {
    try {
      const db = getDb();
      return await db(this.tableName)
        .select('id', 'nome', 'cnpj', 'email', 'telefone', 'contato_principal')
        .where('status', 'ativo')
        .where(function() {
          this.where('nome', 'like', `%${searchTerm}%`)
              .orWhere('cnpj', 'like', `%${searchTerm}%`)
              .orWhere('contato_principal', 'like', `%${searchTerm}%`);
        })
        .orderBy('nome', 'asc')
        .limit(20);
    } catch (error) {
      console.error('Error searching suppliers:', error);
      throw new Error('Erro ao pesquisar fornecedores: ' + error.message);
    }
  }
}

module.exports = new SuppliersService();