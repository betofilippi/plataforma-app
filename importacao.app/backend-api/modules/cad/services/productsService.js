const db = require('../../../src/database/connection');

/**
 * Service layer for products (prd_03_produtos)
 * Handles all database operations for product management
 */

class ProductsService {
  constructor() {
    this.tableName = 'prd_03_produtos';
  }

  /**
   * Get all products with pagination and filters
   */
  async getAllProducts({
    page = 1,
    limit = 10,
    search = '',
    ativo = null,
    categoria = null,
    tipo_produto = null,
    origem = null,
    sort = 'descricao',
    order = 'asc'
  } = {}) {
    try {
      const offset = (page - 1) * limit;
      
      let query = db(this.tableName)
        .select([
          'id_produto',
          'codigo_produto',
          'codigo_barras',
          'descricao',
          'marca',
          'modelo',
          'categoria',
          'subcategoria',
          'unidade_medida',
          'preco_custo',
          'preco_venda',
          'margem_lucro',
          'estoque_minimo',
          'estoque_maximo',
          'tipo_produto',
          'origem',
          'ativo',
          'created_at',
          'updated_at'
        ]);

      // Apply filters
      if (search) {
        query = query.where(function() {
          this.where('descricao', 'ilike', `%${search}%`)
              .orWhere('codigo_produto', 'ilike', `%${search}%`)
              .orWhere('codigo_barras', 'ilike', `%${search}%`)
              .orWhere('marca', 'ilike', `%${search}%`)
              .orWhere('modelo', 'ilike', `%${search}%`);
        });
      }

      if (ativo !== null) {
        query = query.where('ativo', ativo);
      }

      if (categoria) {
        query = query.where('categoria', categoria);
      }

      if (tipo_produto) {
        query = query.where('tipo_produto', tipo_produto);
      }

      if (origem) {
        query = query.where('origem', origem);
      }

      // Get total count for pagination
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count('id_produto as count');
      const total = parseInt(count);

      // Apply sorting and pagination
      const validSortFields = [
        'descricao', 'codigo_produto', 'marca', 'categoria', 
        'preco_custo', 'preco_venda', 'estoque_minimo', 'created_at'
      ];
      
      if (validSortFields.includes(sort)) {
        query = query.orderBy(sort, order);
      } else {
        query = query.orderBy('descricao', 'asc');
      }

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
   * Get product by ID with detailed information
   */
  async getProductById(id) {
    try {
      const product = await db(this.tableName)
        .where('id_produto', id)
        .first();

      if (!product) {
        throw new Error('Produto não encontrado');
      }

      // Get stock information if exists
      let stockInfo = null;
      try {
        stockInfo = await db('est_03_saldos_estoque')
          .select(['quantidade_atual', 'quantidade_reservada', 'quantidade_disponivel'])
          .where('id_produto', id)
          .first();
      } catch (err) {
        // Stock table might not exist yet
        console.warn('Stock table not available:', err.message);
      }

      // Get supplier information if exists
      let supplierInfo = null;
      if (product.id_fornecedor_principal) {
        try {
          supplierInfo = await db('cad_04_fornecedores')
            .select(['nome_razao_social', 'nome_fantasia', 'telefone', 'email'])
            .where('id_fornecedor', product.id_fornecedor_principal)
            .first();
        } catch (err) {
          console.warn('Supplier table not available:', err.message);
        }
      }

      return {
        ...product,
        estoque: stockInfo,
        fornecedor: supplierInfo
      };
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
      // Check if product code already exists
      const existingProduct = await db(this.tableName)
        .where('codigo_produto', productData.codigo_produto)
        .first();

      if (existingProduct) {
        throw new Error('Já existe um produto com este código');
      }

      // Check barcode if provided
      if (productData.codigo_barras) {
        const existingBarcode = await db(this.tableName)
          .where('codigo_barras', productData.codigo_barras)
          .first();

        if (existingBarcode) {
          throw new Error('Já existe um produto com este código de barras');
        }
      }

      // Calculate margin if both prices are provided
      if (productData.preco_custo && productData.preco_venda) {
        productData.margem_lucro = ((productData.preco_venda - productData.preco_custo) / productData.preco_custo * 100).toFixed(2);
      }

      const [newProduct] = await db(this.tableName)
        .insert({
          ...productData,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      return newProduct;
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
      // Check if product exists
      const existingProduct = await this.getProductById(id);

      // Check if product code is being changed and if it's already in use
      if (productData.codigo_produto && productData.codigo_produto !== existingProduct.codigo_produto) {
        const duplicateProduct = await db(this.tableName)
          .where('codigo_produto', productData.codigo_produto)
          .where('id_produto', '!=', id)
          .first();

        if (duplicateProduct) {
          throw new Error('Já existe outro produto com este código');
        }
      }

      // Check barcode if being changed
      if (productData.codigo_barras && productData.codigo_barras !== existingProduct.codigo_barras) {
        const duplicateBarcode = await db(this.tableName)
          .where('codigo_barras', productData.codigo_barras)
          .where('id_produto', '!=', id)
          .first();

        if (duplicateBarcode) {
          throw new Error('Já existe outro produto com este código de barras');
        }
      }

      // Calculate margin if both prices are provided
      const preco_custo = productData.preco_custo || existingProduct.preco_custo;
      const preco_venda = productData.preco_venda || existingProduct.preco_venda;
      
      if (preco_custo && preco_venda) {
        productData.margem_lucro = ((preco_venda - preco_custo) / preco_custo * 100).toFixed(2);
      }

      const [updatedProduct] = await db(this.tableName)
        .where('id_produto', id)
        .update({
          ...productData,
          updated_at: new Date()
        })
        .returning('*');

      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      if (error.message.includes('Já existe') || error.message.includes('não encontrado')) {
        throw error;
      }
      throw new Error('Erro ao atualizar produto: ' + error.message);
    }
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(id) {
    try {
      // Check if product exists
      await this.getProductById(id);

      // Check if product has stock movements
      let hasMovements = false;
      try {
        hasMovements = await db('est_04_movimentacoes')
          .where('id_produto', id)
          .first();
      } catch (err) {
        // Stock movements table might not exist yet
      }

      // Check if product is in active sales
      let hasSales = false;
      try {
        hasSales = await db('vnd_06_itens_venda')
          .where('id_produto', id)
          .first();
      } catch (err) {
        // Sales table might not exist yet
      }

      if (hasMovements || hasSales) {
        // Soft delete only
        await db(this.tableName)
          .where('id_produto', id)
          .update({
            ativo: false,
            updated_at: new Date()
          });

        return { message: 'Produto desativado com sucesso (possui movimentações associadas)' };
      } else {
        // Can be completely removed
        await db(this.tableName)
          .where('id_produto', id)
          .del();

        return { message: 'Produto removido com sucesso' };
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
   * Get product statistics
   */
  async getProductStats() {
    try {
      const stats = await db(this.tableName)
        .select([
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(*) FILTER (WHERE ativo = true) as ativos'),
          db.raw('COUNT(*) FILTER (WHERE ativo = false) as inativos'),
          db.raw('AVG(preco_venda) as preco_medio'),
          db.raw('COUNT(*) FILTER (WHERE estoque_minimo > 0) as com_estoque_minimo'),
          db.raw('COUNT(*) FILTER (WHERE origem = \'NACIONAL\') as nacionais'),
          db.raw('COUNT(*) FILTER (WHERE origem = \'IMPORTADO\') as importados')
        ])
        .first();

      // Get products by category
      const byCategory = await db(this.tableName)
        .select('categoria')
        .count('id_produto as count')
        .where('ativo', true)
        .whereNotNull('categoria')
        .groupBy('categoria')
        .orderBy('count', 'desc')
        .limit(10);

      // Get products by type
      const byType = await db(this.tableName)
        .select('tipo_produto')
        .count('id_produto as count')
        .where('ativo', true)
        .groupBy('tipo_produto');

      // Get price ranges
      const priceRanges = await db(this.tableName)
        .select([
          db.raw('COUNT(*) FILTER (WHERE preco_venda < 100) as ate_100'),
          db.raw('COUNT(*) FILTER (WHERE preco_venda >= 100 AND preco_venda < 500) as de_100_a_500'),
          db.raw('COUNT(*) FILTER (WHERE preco_venda >= 500 AND preco_venda < 1000) as de_500_a_1000'),
          db.raw('COUNT(*) FILTER (WHERE preco_venda >= 1000) as acima_1000')
        ])
        .where('ativo', true)
        .whereNotNull('preco_venda')
        .first();

      return {
        ...stats,
        byCategory: byCategory.reduce((acc, item) => {
          acc[item.categoria] = parseInt(item.count);
          return acc;
        }, {}),
        byType: byType.reduce((acc, item) => {
          acc[item.tipo_produto] = parseInt(item.count);
          return acc;
        }, {}),
        priceRanges
      };
    } catch (error) {
      console.error('Error fetching product stats:', error);
      throw new Error('Erro ao buscar estatísticas: ' + error.message);
    }
  }

  /**
   * Search products with advanced filters
   */
  async searchProducts({
    termo = '',
    categoria = null,
    subcategoria = null,
    marca = null,
    tipo_produto = null,
    origem = null,
    preco_min = null,
    preco_max = null,
    ativo = null,
    com_estoque = null
  } = {}) {
    try {
      let query = db(this.tableName)
        .select([
          'id_produto',
          'codigo_produto',
          'codigo_barras',
          'descricao',
          'marca',
          'modelo',
          'categoria',
          'subcategoria',
          'unidade_medida',
          'preco_custo',
          'preco_venda',
          'margem_lucro',
          'estoque_minimo',
          'tipo_produto',
          'origem',
          'ativo'
        ]);

      if (termo) {
        query = query.where(function() {
          this.where('descricao', 'ilike', `%${termo}%`)
              .orWhere('codigo_produto', 'ilike', `%${termo}%`)
              .orWhere('codigo_barras', 'ilike', `%${termo}%`)
              .orWhere('marca', 'ilike', `%${termo}%`)
              .orWhere('modelo', 'ilike', `%${termo}%`);
        });
      }

      if (categoria) {
        query = query.where('categoria', categoria);
      }

      if (subcategoria) {
        query = query.where('subcategoria', subcategoria);
      }

      if (marca) {
        query = query.where('marca', 'ilike', `%${marca}%`);
      }

      if (tipo_produto) {
        query = query.where('tipo_produto', tipo_produto);
      }

      if (origem) {
        query = query.where('origem', origem);
      }

      if (preco_min !== null) {
        query = query.where('preco_venda', '>=', preco_min);
      }

      if (preco_max !== null) {
        query = query.where('preco_venda', '<=', preco_max);
      }

      if (ativo !== null) {
        query = query.where('ativo', ativo);
      }

      const products = await query
        .orderBy('descricao', 'asc')
        .limit(50); // Limit advanced search results

      // Add stock information if requested
      if (com_estoque && products.length > 0) {
        try {
          const stockData = await db('est_03_saldos_estoque')
            .select(['id_produto', 'quantidade_atual', 'quantidade_disponivel'])
            .whereIn('id_produto', products.map(p => p.id_produto));

          const stockMap = stockData.reduce((acc, stock) => {
            acc[stock.id_produto] = stock;
            return acc;
          }, {});

          products.forEach(product => {
            product.estoque = stockMap[product.id_produto] || null;
          });

          if (com_estoque === 'sem_estoque') {
            return products.filter(p => !p.estoque || p.estoque.quantidade_disponivel <= 0);
          } else if (com_estoque === 'estoque_baixo') {
            return products.filter(p => p.estoque && p.estoque.quantidade_disponivel <= p.estoque_minimo);
          }
        } catch (err) {
          console.warn('Stock table not available for filtering:', err.message);
        }
      }

      return products;
    } catch (error) {
      console.error('Error in advanced product search:', error);
      throw new Error('Erro na busca avançada: ' + error.message);
    }
  }

  /**
   * Get products for dropdown/select components
   */
  async getProductsForSelect(search = '') {
    try {
      let query = db(this.tableName)
        .select([
          'id_produto as value',
          'descricao as label',
          'codigo_produto',
          'preco_venda',
          'unidade_medida',
          'estoque_minimo'
        ])
        .where('ativo', true);

      if (search) {
        query = query.where(function() {
          this.where('descricao', 'ilike', `%${search}%`)
              .orWhere('codigo_produto', 'ilike', `%${search}%`);
        });
      }

      const products = await query
        .orderBy('descricao', 'asc')
        .limit(20);

      return products.map(product => ({
        value: product.value,
        label: `${product.label} (${product.codigo_produto})`,
        codigo: product.codigo_produto,
        preco: product.preco_venda,
        unidade: product.unidade_medida,
        estoque_minimo: product.estoque_minimo
      }));
    } catch (error) {
      console.error('Error fetching products for select:', error);
      throw new Error('Erro ao buscar produtos: ' + error.message);
    }
  }

  /**
   * Get categories for filters
   */
  async getCategories() {
    try {
      const categories = await db(this.tableName)
        .distinct('categoria')
        .whereNotNull('categoria')
        .where('ativo', true)
        .orderBy('categoria');

      return categories.map(c => c.categoria).filter(Boolean);
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Erro ao buscar categorias: ' + error.message);
    }
  }

  /**
   * Get subcategories for a specific category
   */
  async getSubcategories(category) {
    try {
      const subcategories = await db(this.tableName)
        .distinct('subcategoria')
        .where('categoria', category)
        .whereNotNull('subcategoria')
        .where('ativo', true)
        .orderBy('subcategoria');

      return subcategories.map(s => s.subcategoria).filter(Boolean);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      throw new Error('Erro ao buscar subcategorias: ' + error.message);
    }
  }

  /**
   * Bulk update prices
   */
  async bulkUpdatePrices(updates) {
    try {
      const results = [];
      
      for (const update of updates) {
        const { id_produto, preco_custo, preco_venda, margem_lucro } = update;
        
        // Calculate margin if prices are provided
        let calculatedMargin = margem_lucro;
        if (preco_custo && preco_venda) {
          calculatedMargin = ((preco_venda - preco_custo) / preco_custo * 100).toFixed(2);
        }

        const [updatedProduct] = await db(this.tableName)
          .where('id_produto', id_produto)
          .update({
            preco_custo,
            preco_venda,
            margem_lucro: calculatedMargin,
            updated_at: new Date()
          })
          .returning(['id_produto', 'codigo_produto', 'descricao']);

        if (updatedProduct) {
          results.push(updatedProduct);
        }
      }

      return {
        message: `${results.length} produtos atualizados com sucesso`,
        products: results
      };
    } catch (error) {
      console.error('Error in bulk price update:', error);
      throw new Error('Erro na atualização em lote: ' + error.message);
    }
  }
}

module.exports = new ProductsService();