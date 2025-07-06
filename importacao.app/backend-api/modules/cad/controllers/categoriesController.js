const categoriesService = require('../services/categoriesService');
const { categorySchema, categoryUpdateSchema } = require('../services/validationService');

/**
 * Controller for hierarchical categories CRUD operations
 * Handles HTTP requests and responses for category management
 */

class CategoriesController {
  /**
   * Get all categories with hierarchical structure
   * GET /api/cad/categories
   */
  async getAllCategories(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        search = '',
        ativo = null,
        parent_id = null,
        hierarchical = 'true'
      } = req.query;

      const result = await categoriesService.getAllCategories({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : null,
        parent_id: parent_id ? parseInt(parent_id) : null,
        hierarchical: hierarchical === 'true'
      });

      res.json({
        success: true,
        message: 'Categorias recuperadas com sucesso',
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getAllCategories:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get category by ID with children
   * GET /api/cad/categories/:id
   */
  async getCategoryById(req, res) {
    try {
      const { id } = req.params;
      const includeChildren = req.query.include_children === 'true';
      
      const category = await categoriesService.getCategoryById(parseInt(id), includeChildren);

      res.json({
        success: true,
        message: 'Categoria encontrada com sucesso',
        data: category,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getCategoryById:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Categoria não encontrada' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create new category
   * POST /api/cad/categories
   */
  async createCategory(req, res) {
    try {
      const validatedData = categorySchema.parse(req.body);
      
      const newCategory = await categoriesService.createCategory(validatedData);

      res.status(201).json({
        success: true,
        message: 'Categoria criada com sucesso',
        data: newCategory,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in createCategory:', error);
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
   * Update category
   * PUT /api/cad/categories/:id
   */
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const validatedData = categoryUpdateSchema.parse(req.body);

      const updatedCategory = await categoriesService.updateCategory(parseInt(id), validatedData);

      res.json({
        success: true,
        message: 'Categoria atualizada com sucesso',
        data: updatedCategory,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in updateCategory:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('Já existe')) {
        statusCode = 409;
      } else if (error.message.includes('circular')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Categoria não encontrada' : 
               statusCode === 409 ? 'Conflito de dados' : 
               statusCode === 400 ? 'Dados inválidos' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete category
   * DELETE /api/cad/categories/:id
   */
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const force = req.query.force === 'true';
      
      const result = await categoriesService.deleteCategory(parseInt(id), force);

      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in deleteCategory:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('possui subcategorias') || error.message.includes('possui produtos')) {
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Categoria não encontrada' : 
               statusCode === 409 ? 'Conflito de dados' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Move category to different parent
   * PATCH /api/cad/categories/:id/move
   */
  async moveCategory(req, res) {
    try {
      const { id } = req.params;
      const { new_parent_id } = req.body;

      const result = await categoriesService.moveCategory(
        parseInt(id), 
        new_parent_id ? parseInt(new_parent_id) : null
      );

      res.json({
        success: true,
        message: 'Categoria movida com sucesso',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in moveCategory:', error);
      let statusCode = 500;
      
      if (error.message.includes('não encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('circular')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json({
        success: false,
        error: statusCode === 404 ? 'Categoria não encontrada' : 
               statusCode === 400 ? 'Dados inválidos' : 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get category tree structure
   * GET /api/cad/categories/tree
   */
  async getCategoryTree(req, res) {
    try {
      const { include_products = 'false' } = req.query;
      
      const tree = await categoriesService.getCategoryTree(include_products === 'true');

      res.json({
        success: true,
        message: 'Árvore de categorias recuperada com sucesso',
        data: tree,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getCategoryTree:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get categories for select dropdown
   * GET /api/cad/categories/select
   */
  async getCategoriesForSelect(req, res) {
    try {
      const { search = '', exclude_id = null } = req.query;
      
      const categories = await categoriesService.getCategoriesForSelect(
        search, 
        exclude_id ? parseInt(exclude_id) : null
      );

      res.json({
        success: true,
        message: 'Categorias para seleção recuperadas com sucesso',
        data: categories,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getCategoriesForSelect:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get category statistics
   * GET /api/cad/categories/stats
   */
  async getCategoryStats(req, res) {
    try {
      const stats = await categoriesService.getCategoryStats();

      res.json({
        success: true,
        message: 'Estatísticas de categorias recuperadas com sucesso',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getCategoryStats:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Bulk operations on categories
   * POST /api/cad/categories/bulk
   */
  async bulkOperations(req, res) {
    try {
      const { operation, category_ids, data } = req.body;

      if (!operation || !category_ids || !Array.isArray(category_ids)) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Operação e IDs das categorias são obrigatórios',
          timestamp: new Date().toISOString()
        });
      }

      const result = await categoriesService.bulkOperations(operation, category_ids, data);

      res.json({
        success: true,
        message: `Operação ${operation} executada com sucesso`,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in bulkOperations:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new CategoriesController();