const { getDb } = require('../../../src/database/connection');

/**
 * Service layer for products (importacao_produtos)
 * Handles all database operations for product management
 */

class ProductsService {
  constructor() {
    this.tableName = 'importacao_produtos';
  }

  /**
   * Get all products with pagination and filters
   */
  async getAllProducts({
    page = 1,
    limit = 10,
    search = '',
    ativo = null,
    categoria_id = null,
    sort = 'nome',
    order = 'asc'
  } = {}) {
    try {
      const offset = (page - 1) * limit;
      
      const db = getDb();
      let query = db(this.tableName)
        .leftJoin('importacao_categorias', 'importacao_produtos.categoria_id', 'importacao_categorias.id')
        .select([
          'importacao_produtos.id',
          'importacao_produtos.nome',
          'importacao_produtos.codigo_barras',
          'importacao_produtos.sku',
          'importacao_produtos.descricao',
          'importacao_produtos.categoria_id',
          'importacao_categorias.nome as categoria_nome',
          'importacao_produtos.preco_custo',
          'importacao_produtos.preco_venda',
          'importacao_produtos.margem_lucro',
          'importacao_produtos.unidade_medida',
          'importacao_produtos.peso',
          'importacao_produtos.dimensoes',
          'importacao_produtos.status',
          'importacao_produtos.estoque_minimo',
          'importacao_produtos.estoque_maximo',
          'importacao_produtos.created_at',
          'importacao_produtos.updated_at'
        ]);

      // Apply filters
      if (search) {
        query = query.where(function() {
          this.where('importacao_produtos.nome', 'like', `%${search}%`)
              .orWhere('importacao_produtos.sku', 'like', `%${search}%`)
              .orWhere('importacao_produtos.codigo_barras', 'like', `%${search}%`)
              .orWhere('importacao_produtos.descricao', 'like', `%${search}%`);
        });
      }

      if (ativo !== null) {
        query = query.where('importacao_produtos.status', ativo ? 'ativo' : 'inativo');
      }

      if (categoria_id) {
        query = query.where('importacao_produtos.categoria_id', categoria_id);
      }

      // Get total count for pagination
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count('importacao_produtos.id as count');
      const total = parseInt(count);

      // Apply sorting and pagination
      const validSortFields = [
        'nome', 'sku', 'preco_custo', 'preco_venda', 'margem_lucro', 'created_at'
      ];
      
      const sortField = validSortFields.includes(sort) ? `importacao_produtos.${sort}` : 'importacao_produtos.nome';
      query = query.orderBy(sortField, order);

      const products = await query.limit(limit).offset(offset);

      return {
        data: products,
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
      console.error('Error fetching products:', error);
      throw new Error('Erro ao buscar produtos: ' + error.message);
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id) {
    try {
      const db = getDb();
      const product = await db(this.tableName)
        .leftJoin('importacao_categorias', 'importacao_produtos.categoria_id', 'importacao_categorias.id')
        .leftJoin('importacao_estoque', 'importacao_produtos.id', 'importacao_estoque.produto_id')
        .select([
          'importacao_produtos.*',
          'importacao_categorias.nome as categoria_nome',
          'importacao_estoque.quantidade as estoque_atual',
          'importacao_estoque.quantidade_reservada',
          'importacao_estoque.custo_medio',
          'importacao_estoque.localizacao'
        ])
        .where('importacao_produtos.id', id)
        .first();

      if (!product) {
        throw new Error('Produto não encontrado');
      }

      return product;
    } catch (error) {
      console.error('Error fetching product by ID:', error);
      throw new Error('Erro ao buscar produto: ' + error.message);
    }
  }

  /**
   * Create new product
   */
  async createProduct(productData) {
    try {
      const db = getDb();
      
      // Check if SKU already exists
      if (productData.sku) {
        const existingProduct = await db(this.tableName)
          .where('sku', productData.sku)
          .first();

        if (existingProduct) {
          throw new Error('Já existe um produto com este SKU');
        }
      }

      // Check if barcode already exists
      if (productData.codigo_barras) {
        const existingBarcode = await db(this.tableName)
          .where('codigo_barras', productData.codigo_barras)
          .first();

        if (existingBarcode) {
          throw new Error('Já existe um produto com este código de barras');
        }
      }

      // Calculate margin if not provided
      if (!productData.margem_lucro && productData.preco_custo && productData.preco_venda) {
        const custo = parseFloat(productData.preco_custo);
        const venda = parseFloat(productData.preco_venda);
        productData.margem_lucro = custo > 0 ? ((venda - custo) / custo * 100).toFixed(2) : 0;
      }

      const [newProductId] = await db(this.tableName)
        .insert({
          ...productData,
          status: productData.status || 'ativo',
          preco_custo: productData.preco_custo || 0,
          preco_venda: productData.preco_venda || 0,
          margem_lucro: productData.margem_lucro || 0,
          estoque_minimo: productData.estoque_minimo || 0,
          estoque_maximo: productData.estoque_maximo || 0,
          peso: productData.peso || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      // Create initial stock entry
      await db('importacao_estoque').insert({
        produto_id: newProductId,
        quantidade: 0,
        quantidade_reservada: 0,
        custo_medio: productData.preco_custo || 0,
        localizacao: productData.localizacao || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      return await this.getProductById(newProductId);
    } catch (error) {
      console.error('Error creating product:', error);
      if (error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao criar produto: ' + error.message);
    }
  }

  /**
   * Update product
   */
  async updateProduct(id, productData) {
    try {
      const db = getDb();
      
      // Check if product exists
      const existingProduct = await this.getProductById(id);

      // Check if SKU is being changed and already exists
      if (productData.sku && productData.sku !== existingProduct.sku) {
        const duplicateSku = await db(this.tableName)
          .where('sku', productData.sku)
          .whereNot('id', id)
          .first();

        if (duplicateSku) {
          throw new Error('Já existe um produto com este SKU');
        }
      }

      // Check if barcode is being changed and already exists
      if (productData.codigo_barras && productData.codigo_barras !== existingProduct.codigo_barras) {
        const duplicateBarcode = await db(this.tableName)
          .where('codigo_barras', productData.codigo_barras)
          .whereNot('id', id)
          .first();

        if (duplicateBarcode) {
          throw new Error('Já existe um produto com este código de barras');
        }
      }

      // Recalculate margin if prices changed
      if (productData.preco_custo || productData.preco_venda) {
        const custo = parseFloat(productData.preco_custo || existingProduct.preco_custo);
        const venda = parseFloat(productData.preco_venda || existingProduct.preco_venda);
        productData.margem_lucro = custo > 0 ? ((venda - custo) / custo * 100).toFixed(2) : 0;
      }

      await db(this.tableName)
        .where('id', id)
        .update({
          ...productData,
          updated_at: new Date().toISOString()
        });

      return await this.getProductById(id);
    } catch (error) {
      console.error('Error updating product:', error);
      if (error.message.includes('não encontrado') || error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao atualizar produto: ' + error.message);
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(id) {
    try {
      const db = getDb();
      
      // Check if product exists
      await this.getProductById(id);

      // Check if product has sales or purchase history
      const hasSales = await db('importacao_vendas_itens')
        .where('produto_id', id)
        .first();

      const hasOrders = await db('importacao_pedidos_itens')
        .where('produto_id', id)
        .first();

      if (hasSales || hasOrders) {
        // Soft delete - mark as inactive
        await db(this.tableName)
          .where('id', id)
          .update({ 
            status: 'inativo',
            updated_at: new Date().toISOString()
          });
        
        return { soft_deleted: true };
      } else {
        // Hard delete if no dependencies
        await db('importacao_estoque').where('produto_id', id).del();
        await db(this.tableName).where('id', id).del();
        
        return { hard_deleted: true };
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      if (error.message.includes('não encontrado')) {
        throw error;
      }
      throw new Error('Erro ao excluir produto: ' + error.message);
    }
  }

  /**
   * Get products for dropdown/select
   */
  async getProductsForSelect(activeOnly = true) {
    try {
      const db = getDb();
      let query = db(this.tableName)
        .select('id', 'nome', 'sku', 'preco_venda', 'unidade_medida')
        .orderBy('nome', 'asc');

      if (activeOnly) {
        query = query.where('status', 'ativo');
      }

      return await query;
    } catch (error) {
      console.error('Error getting products for select:', error);
      throw new Error('Erro ao buscar produtos para seleção: ' + error.message);
    }
  }

  /**
   * Search products
   */
  async searchProducts(searchTerm) {
    try {
      const db = getDb();
      return await db(this.tableName)
        .leftJoin('importacao_estoque', 'importacao_produtos.id', 'importacao_estoque.produto_id')
        .select([
          'importacao_produtos.id',
          'importacao_produtos.nome',
          'importacao_produtos.sku',
          'importacao_produtos.preco_venda',
          'importacao_produtos.unidade_medida',
          'importacao_estoque.quantidade as estoque_atual'
        ])
        .where('importacao_produtos.status', 'ativo')
        .where(function() {
          this.where('importacao_produtos.nome', 'like', `%${searchTerm}%`)
              .orWhere('importacao_produtos.sku', 'like', `%${searchTerm}%`)
              .orWhere('importacao_produtos.codigo_barras', 'like', `%${searchTerm}%`);
        })
        .orderBy('importacao_produtos.nome', 'asc')
        .limit(20);
    } catch (error) {
      console.error('Error searching products:', error);
      throw new Error('Erro ao pesquisar produtos: ' + error.message);
    }
  }

  /**
   * Get product statistics
   */
  async getProductStats() {
    try {
      const db = getDb();
      
      const [
        totalProducts,
        activeProducts,
        inactiveProducts,
        totalValue,
        lowStockCount
      ] = await Promise.all([
        db(this.tableName).count('id as count').first(),
        db(this.tableName).where('status', 'ativo').count('id as count').first(),
        db(this.tableName).where('status', 'inativo').count('id as count').first(),
        db(this.tableName).sum('preco_venda as total').first(),
        db(this.tableName)
          .leftJoin('importacao_estoque', 'importacao_produtos.id', 'importacao_estoque.produto_id')
          .whereRaw('importacao_estoque.quantidade <= importacao_produtos.estoque_minimo')
          .count('importacao_produtos.id as count')
          .first()
      ]);

      return {
        total: parseInt(totalProducts.count) || 0,
        ativo: parseInt(activeProducts.count) || 0,
        inativo: parseInt(inactiveProducts.count) || 0,
        valor_total_estoque: parseFloat(totalValue.total) || 0,
        produtos_estoque_baixo: parseInt(lowStockCount.count) || 0
      };
    } catch (error) {
      console.error('Error getting product stats:', error);
      throw new Error('Erro ao buscar estatísticas de produtos: ' + error.message);
    }
  }

  /**
   * Update product stock
   */
  async updateStock(id, stockData) {
    try {
      const db = getDb();
      await this.getProductById(id);

      await db('importacao_estoque')
        .where('produto_id', id)
        .update({
          ...stockData,
          data_ultimo_movimento: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        });

      return await this.getProductById(id);
    } catch (error) {
      console.error('Error updating stock:', error);
      throw new Error('Erro ao atualizar estoque: ' + error.message);
    }
  }
}

module.exports = new ProductsService();