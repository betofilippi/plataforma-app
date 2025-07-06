const productsService = require('../services/productsService');
const { productSchema, productUpdateSchema } = require('../services/validationService');

/**
 * Controller for products CRUD operations
 * Handles HTTP requests and responses for product management
 */

class ProductsController {
  /**
   * Get all products with pagination and filters
   * GET /api/cad/products
   */
  async getAllProducts(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        ativo = null,
        categoria = null,
        tipo_produto = null,
        origem = null,
        sort = 'descricao',
        order = 'asc'
      } = req.validatedQuery || req.query;

      const result = await productsService.getAllProducts({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : null,
        categoria,
        tipo_produto,
        origem,
        sort,
        order
      });

      res.json({
        success: true,
        message: 'Produtos recuperados com sucesso',
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAllProducts:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get product by ID
   * GET /api/cad/products/:id
   */
  async getProductById(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const product = await productsService.getProductById(parseInt(id));

      res.json({
        success: true,
        message: 'Produto encontrado com sucesso',
        data: product,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getProductById:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Produto não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create new product
   * POST /api/cad/products
   */
  async createProduct(req, res) {
    try {
      const validatedData = req.validatedData || req.body;

      const newProduct = await productsService.createProduct(validatedData);

      res.status(201).json({
        success: true,
        message: 'Produto criado com sucesso',
        data: newProduct,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createProduct:', error);
      const statusCode = error.message.includes('Já existe') ? 409 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update product
   * PUT /api/cad/products/:id
   */
  async updateProduct(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const validatedData = req.validatedData || req.body;

      const updatedProduct = await productsService.updateProduct(parseInt(id), validatedData);

      res.json({
        success: true,
        message: 'Produto atualizado com sucesso',
        data: updatedProduct,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateProduct:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('Já existe')) {
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Produto não encontrado' : 
               statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete product
   * DELETE /api/cad/products/:id
   */
  async deleteProduct(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const result = await productsService.deleteProduct(parseInt(id));

      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in deleteProduct:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Produto não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get product statistics
   * GET /api/cad/products/stats
   */
  async getProductStats(req, res) {
    try {
      const stats = await productsService.getProductStats();

      res.json({
        success: true,
        message: 'Estatísticas recuperadas com sucesso',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getProductStats:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Advanced product search
   * POST /api/cad/products/search
   */
  async searchProducts(req, res) {
    try {
      const searchParams = req.body;
      const products = await productsService.searchProducts(searchParams);

      res.json({
        success: true,
        message: 'Busca realizada com sucesso',
        data: products,
        count: products.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in searchProducts:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get products for select dropdown
   * GET /api/cad/products/select
   */
  async getProductsForSelect(req, res) {
    try {
      const { search = '' } = req.query;
      const products = await productsService.getProductsForSelect(search);

      res.json({
        success: true,
        message: 'Produtos para seleção recuperados com sucesso',
        data: products,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getProductsForSelect:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get product categories
   * GET /api/cad/products/categories
   */
  async getCategories(req, res) {
    try {
      const categories = await productsService.getCategories();

      res.json({
        success: true,
        message: 'Categorias recuperadas com sucesso',
        data: categories.map(cat => ({ value: cat, label: cat })),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getCategories:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get product subcategories for a category
   * GET /api/cad/products/categories/:category/subcategories
   */
  async getSubcategories(req, res) {
    try {
      const { category } = req.params;
      const subcategories = await productsService.getSubcategories(category);

      res.json({
        success: true,
        message: 'Subcategorias recuperadas com sucesso',
        data: subcategories.map(sub => ({ value: sub, label: sub })),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getSubcategories:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Bulk update product prices
   * PUT /api/cad/products/bulk-update-prices
   */
  async bulkUpdatePrices(req, res) {
    try {
      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Array de atualizações é obrigatório',
          timestamp: new Date().toISOString()
        });
      }

      // Validate each update
      for (const update of updates) {
        if (!update.id_produto || (!update.preco_custo && !update.preco_venda)) {
          return res.status(400).json({
            success: false,
            error: 'Dados inválidos',
            message: 'Cada atualização deve ter id_produto e pelo menos um preço',
            timestamp: new Date().toISOString()
          });
        }
      }

      const result = await productsService.bulkUpdatePrices(updates);

      res.json({
        success: true,
        message: result.message,
        data: result.products,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in bulkUpdatePrices:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Toggle product active status
   * PATCH /api/cad/products/:id/toggle-status
   */
  async toggleProductStatus(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const product = await productsService.getProductById(parseInt(id));
      
      const updatedProduct = await productsService.updateProduct(parseInt(id), {
        ativo: !product.ativo
      });

      res.json({
        success: true,
        message: `Produto ${updatedProduct.ativo ? 'ativado' : 'desativado'} com sucesso`,
        data: { id: updatedProduct.id_produto, ativo: updatedProduct.ativo },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in toggleProductStatus:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Produto não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get product types for filters
   * GET /api/cad/products/types
   */
  async getProductTypes(req, res) {
    try {
      const types = [
        { value: 'MATERIA_PRIMA', label: 'Matéria Prima' },
        { value: 'PRODUTO_ACABADO', label: 'Produto Acabado' },
        { value: 'COMPONENTE', label: 'Componente' },
        { value: 'SERVICO', label: 'Serviço' }
      ];

      res.json({
        success: true,
        message: 'Tipos de produto recuperados com sucesso',
        data: types,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getProductTypes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Export products to CSV
   * GET /api/cad/products/export
   */
  async exportProducts(req, res) {
    try {
      const {
        search = '',
        ativo = null,
        categoria = null,
        tipo_produto = null,
        origem = null
      } = req.query;
      
      const result = await productsService.getAllProducts({
        page: 1,
        limit: 1000, // Large limit for export
        search,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : null,
        categoria,
        tipo_produto,
        origem,
        sort: 'descricao',
        order: 'asc'
      });

      // Set CSV headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=produtos.csv');

      // CSV header
      const csvHeader = [
        'ID',
        'Código',
        'Código de Barras',
        'Descrição',
        'Marca',
        'Modelo',
        'Categoria',
        'Subcategoria',
        'Unidade',
        'Preço Custo',
        'Preço Venda',
        'Margem %',
        'Estoque Mín.',
        'Estoque Máx.',
        'Tipo',
        'Origem',
        'Ativo',
        'Criado em'
      ].join(',') + '\n';

      res.write(csvHeader);

      // CSV rows
      result.data.forEach(product => {
        const row = [
          product.id_produto,
          `"${product.codigo_produto || ''}"`,
          `"${product.codigo_barras || ''}"`,
          `"${product.descricao || ''}"`,
          `"${product.marca || ''}"`,
          `"${product.modelo || ''}"`,
          `"${product.categoria || ''}"`,
          `"${product.subcategoria || ''}"`,
          `"${product.unidade_medida || ''}"`,
          product.preco_custo || 0,
          product.preco_venda || 0,
          product.margem_lucro || 0,
          product.estoque_minimo || 0,
          product.estoque_maximo || 0,
          product.tipo_produto || '',
          product.origem || '',
          product.ativo ? 'Sim' : 'Não',
          new Date(product.created_at).toLocaleDateString('pt-BR')
        ].join(',') + '\n';
        
        res.write(row);
      });

      res.end();
    } catch (error) {
      console.error('Error in exportProducts:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Duplicate product
   * POST /api/cad/products/:id/duplicate
   */
  async duplicateProduct(req, res) {
    try {
      const { id } = req.validatedParams || req.params;
      const originalProduct = await productsService.getProductById(parseInt(id));

      // Create new product data without ID and with modified code
      const newProductData = {
        ...originalProduct,
        codigo_produto: `${originalProduct.codigo_produto}_COPY`,
        descricao: `${originalProduct.descricao} (Cópia)`,
        codigo_barras: null // Remove barcode to avoid duplicates
      };

      // Remove fields that shouldn't be copied
      delete newProductData.id_produto;
      delete newProductData.created_at;
      delete newProductData.updated_at;
      delete newProductData.estoque;
      delete newProductData.fornecedor;

      const duplicatedProduct = await productsService.createProduct(newProductData);

      res.status(201).json({
        success: true,
        message: 'Produto duplicado com sucesso',
        data: duplicatedProduct,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in duplicateProduct:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Produto não encontrado' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new ProductsController();