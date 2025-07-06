const db = require('../../../src/database/connection');

/**
 * Service for category operations
 * Handles hierarchical category operations and business logic
 */

class CategoriesService {
  /**
   * Get all categories with hierarchical structure
   */
  async getAllCategories(options = {}) {
    const {
      page = 1,
      limit = 50,
      search = '',
      ativo = null,
      parent_id = null,
      hierarchical = true,
      sort = 'nome',
      order = 'asc'
    } = options;

    try {
      const offset = (page - 1) * limit;
      
      // Base query
      let query = db('cad_categorias as c')
        .select([
          'c.id_categoria',
          'c.nome',
          'c.descricao',
          'c.codigo',
          'c.parent_id',
          'c.nivel',
          'c.caminho_completo',
          'c.ativo',
          'c.created_at',
          'c.updated_at',
          'p.nome as categoria_pai',
          db.raw('(SELECT COUNT(*) FROM cad_categorias WHERE parent_id = c.id_categoria) as total_subcategorias'),
          db.raw('(SELECT COUNT(*) FROM prd_03_produtos WHERE id_categoria = c.id_categoria) as total_produtos')
        ])
        .leftJoin('cad_categorias as p', 'c.parent_id', 'p.id_categoria');

      // Apply filters
      if (search) {
        query.where(function() {
          this.whereILike('c.nome', `%${search}%`)
              .orWhereILike('c.descricao', `%${search}%`)
              .orWhereILike('c.codigo', `%${search}%`);
        });
      }

      if (ativo !== null) {
        query.where('c.ativo', ativo);
      }

      if (parent_id !== null) {
        query.where('c.parent_id', parent_id);
      }

      // Count total
      const totalQuery = query.clone().count('c.id_categoria as count').first();
      const { count: total } = await totalQuery;

      // Apply sorting and pagination
      query.orderBy(`c.${sort}`, order)
           .limit(limit)
           .offset(offset);

      const categories = await query;

      if (hierarchical && !parent_id) {
        // Build hierarchical structure
        const hierarchicalData = this.buildHierarchy(categories);
        return {
          data: hierarchicalData,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(total),
            totalPages: Math.ceil(total / limit)
          }
        };
      }

      return {
        data: categories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error in CategoriesService.getAllCategories:', error);
      throw new Error('Erro ao buscar categorias');
    }
  }

  /**
   * Get category by ID with optional children
   */
  async getCategoryById(id, includeChildren = false) {
    try {
      const category = await db('cad_categorias as c')
        .select([
          'c.*',
          'p.nome as categoria_pai',
          db.raw('(SELECT COUNT(*) FROM cad_categorias WHERE parent_id = c.id_categoria) as total_subcategorias'),
          db.raw('(SELECT COUNT(*) FROM prd_03_produtos WHERE id_categoria = c.id_categoria) as total_produtos')
        ])
        .leftJoin('cad_categorias as p', 'c.parent_id', 'p.id_categoria')
        .where('c.id_categoria', id)
        .first();

      if (!category) {
        throw new Error('Categoria não encontrada');
      }

      if (includeChildren) {
        category.subcategorias = await db('cad_categorias')
          .where('parent_id', id)
          .orderBy('nome');
      }

      return category;
    } catch (error) {
      console.error('Error in CategoriesService.getCategoryById:', error);
      if (error.message.includes('não encontrada')) {
        throw error;
      }
      throw new Error('Erro ao buscar categoria');
    }
  }

  /**
   * Create new category
   */
  async createCategory(categoryData) {
    try {
      // Check for duplicate name in same level
      const existing = await db('cad_categorias')
        .where('nome', categoryData.nome)
        .where('parent_id', categoryData.parent_id || null)
        .first();

      if (existing) {
        throw new Error('Já existe uma categoria com este nome no mesmo nível');
      }

      // Calculate level and path
      let nivel = 1;
      let caminhoCompleto = categoryData.nome;

      if (categoryData.parent_id) {
        const parent = await this.getCategoryById(categoryData.parent_id);
        nivel = parent.nivel + 1;
        caminhoCompleto = `${parent.caminho_completo} > ${categoryData.nome}`;
      }

      const newCategory = {
        ...categoryData,
        nivel,
        caminho_completo: caminhoCompleto,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [id] = await db('cad_categorias').insert(newCategory).returning('id_categoria');
      return await this.getCategoryById(id.id_categoria || id);
    } catch (error) {
      console.error('Error in CategoriesService.createCategory:', error);
      if (error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao criar categoria');
    }
  }

  /**
   * Update category
   */
  async updateCategory(id, updateData) {
    try {
      const category = await this.getCategoryById(id);

      // Check for duplicate name (excluding current category)
      if (updateData.nome) {
        const existing = await db('cad_categorias')
          .where('nome', updateData.nome)
          .where('parent_id', updateData.parent_id || category.parent_id || null)
          .whereNot('id_categoria', id)
          .first();

        if (existing) {
          throw new Error('Já existe uma categoria com este nome no mesmo nível');
        }
      }

      // Prevent circular reference
      if (updateData.parent_id) {
        const isCircular = await this.checkCircularReference(id, updateData.parent_id);
        if (isCircular) {
          throw new Error('Não é possível criar referência circular entre categorias');
        }
      }

      const updatedData = {
        ...updateData,
        updated_at: new Date()
      };

      await db('cad_categorias').where('id_categoria', id).update(updatedData);

      // Update hierarchy if parent changed
      if (updateData.parent_id !== undefined || updateData.nome) {
        await this.updateCategoryHierarchy(id);
      }

      return await this.getCategoryById(id);
    } catch (error) {
      console.error('Error in CategoriesService.updateCategory:', error);
      if (error.message.includes('não encontrada') || 
          error.message.includes('Já existe') || 
          error.message.includes('circular')) {
        throw error;
      }
      throw new Error('Erro ao atualizar categoria');
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(id, force = false) {
    try {
      const category = await this.getCategoryById(id);

      // Check for subcategories
      const subcategories = await db('cad_categorias').where('parent_id', id).count().first();
      if (parseInt(subcategories.count) > 0 && !force) {
        throw new Error('Categoria possui subcategorias. Use force=true para forçar exclusão');
      }

      // Check for products
      const products = await db('prd_03_produtos').where('id_categoria', id).count().first();
      if (parseInt(products.count) > 0 && !force) {
        throw new Error('Categoria possui produtos associados. Use force=true para forçar exclusão');
      }

      // If force, move subcategories to parent or root
      if (force && parseInt(subcategories.count) > 0) {
        await db('cad_categorias')
          .where('parent_id', id)
          .update({ parent_id: category.parent_id });
      }

      // If force, move products to uncategorized
      if (force && parseInt(products.count) > 0) {
        await db('prd_03_produtos')
          .where('id_categoria', id)
          .update({ id_categoria: null });
      }

      await db('cad_categorias').where('id_categoria', id).del();

      return { message: 'Categoria removida com sucesso' };
    } catch (error) {
      console.error('Error in CategoriesService.deleteCategory:', error);
      if (error.message.includes('não encontrada') || 
          error.message.includes('possui')) {
        throw error;
      }
      throw new Error('Erro ao remover categoria');
    }
  }

  /**
   * Move category to different parent
   */
  async moveCategory(id, newParentId) {
    try {
      // Prevent circular reference
      if (newParentId) {
        const isCircular = await this.checkCircularReference(id, newParentId);
        if (isCircular) {
          throw new Error('Não é possível criar referência circular entre categorias');
        }
      }

      await db('cad_categorias')
        .where('id_categoria', id)
        .update({ 
          parent_id: newParentId,
          updated_at: new Date()
        });

      // Update hierarchy
      await this.updateCategoryHierarchy(id);

      return await this.getCategoryById(id);
    } catch (error) {
      console.error('Error in CategoriesService.moveCategory:', error);
      if (error.message.includes('não encontrada') || 
          error.message.includes('circular')) {
        throw error;
      }
      throw new Error('Erro ao mover categoria');
    }
  }

  /**
   * Get category tree structure
   */
  async getCategoryTree(includeProducts = false) {
    try {
      let query = db('cad_categorias as c')
        .select([
          'c.id_categoria',
          'c.nome',
          'c.descricao',
          'c.codigo',
          'c.parent_id',
          'c.nivel',
          'c.ativo'
        ]);

      if (includeProducts) {
        query.select([
          db.raw('(SELECT COUNT(*) FROM prd_03_produtos WHERE id_categoria = c.id_categoria) as total_produtos')
        ]);
      }

      const categories = await query.where('c.ativo', true).orderBy('c.nome');

      return this.buildHierarchy(categories);
    } catch (error) {
      console.error('Error in CategoriesService.getCategoryTree:', error);
      throw new Error('Erro ao buscar árvore de categorias');
    }
  }

  /**
   * Get categories for select dropdown
   */
  async getCategoriesForSelect(search = '', excludeId = null) {
    try {
      let query = db('cad_categorias')
        .select([
          'id_categoria as value',
          'caminho_completo as label',
          'nome',
          'nivel'
        ])
        .where('ativo', true);

      if (search) {
        query.whereILike('nome', `%${search}%`);
      }

      if (excludeId) {
        // Exclude category and its descendants
        const descendants = await this.getCategoryDescendants(excludeId);
        const excludeIds = [excludeId, ...descendants.map(d => d.id_categoria)];
        query.whereNotIn('id_categoria', excludeIds);
      }

      return await query.orderBy('caminho_completo');
    } catch (error) {
      console.error('Error in CategoriesService.getCategoriesForSelect:', error);
      throw new Error('Erro ao buscar categorias para seleção');
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStats() {
    try {
      const [total, ativas, raiz, comProdutos] = await Promise.all([
        db('cad_categorias').count().first(),
        db('cad_categorias').where('ativo', true).count().first(),
        db('cad_categorias').whereNull('parent_id').count().first(),
        db('cad_categorias')
          .whereExists(db.select(1).from('prd_03_produtos').whereRaw('prd_03_produtos.id_categoria = cad_categorias.id_categoria'))
          .count().first()
      ]);

      const nivelStats = await db('cad_categorias')
        .select('nivel')
        .count()
        .groupBy('nivel')
        .orderBy('nivel');

      return {
        total: parseInt(total.count),
        ativas: parseInt(ativas.count),
        inativas: parseInt(total.count) - parseInt(ativas.count),
        categorias_raiz: parseInt(raiz.count),
        com_produtos: parseInt(comProdutos.count),
        por_nivel: nivelStats.map(stat => ({
          nivel: stat.nivel,
          quantidade: parseInt(stat.count)
        }))
      };
    } catch (error) {
      console.error('Error in CategoriesService.getCategoryStats:', error);
      throw new Error('Erro ao buscar estatísticas de categorias');
    }
  }

  /**
   * Bulk operations on categories
   */
  async bulkOperations(operation, categoryIds, data = {}) {
    try {
      switch (operation) {
        case 'activate':
          await db('cad_categorias')
            .whereIn('id_categoria', categoryIds)
            .update({ ativo: true, updated_at: new Date() });
          return { affected: categoryIds.length };

        case 'deactivate':
          await db('cad_categorias')
            .whereIn('id_categoria', categoryIds)
            .update({ ativo: false, updated_at: new Date() });
          return { affected: categoryIds.length };

        case 'delete':
          // Check if any category has dependencies
          const dependencies = await db('prd_03_produtos')
            .whereIn('id_categoria', categoryIds)
            .count().first();
          
          if (parseInt(dependencies.count) > 0 && !data.force) {
            throw new Error('Algumas categorias possuem produtos associados');
          }

          if (data.force) {
            await db('prd_03_produtos')
              .whereIn('id_categoria', categoryIds)
              .update({ id_categoria: null });
          }

          await db('cad_categorias').whereIn('id_categoria', categoryIds).del();
          return { affected: categoryIds.length };

        case 'move':
          if (!data.new_parent_id) {
            throw new Error('ID da categoria pai é obrigatório para mover');
          }

          for (const categoryId of categoryIds) {
            await this.moveCategory(categoryId, data.new_parent_id);
          }
          return { affected: categoryIds.length };

        default:
          throw new Error('Operação não suportada');
      }
    } catch (error) {
      console.error('Error in CategoriesService.bulkOperations:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */

  buildHierarchy(categories, parentId = null) {
    const result = [];
    const children = categories.filter(cat => cat.parent_id === parentId);

    for (const child of children) {
      const categoryWithChildren = {
        ...child,
        children: this.buildHierarchy(categories, child.id_categoria)
      };
      result.push(categoryWithChildren);
    }

    return result;
  }

  async checkCircularReference(categoryId, newParentId) {
    if (categoryId === newParentId) {
      return true;
    }

    const descendants = await this.getCategoryDescendants(categoryId);
    return descendants.some(desc => desc.id_categoria === newParentId);
  }

  async getCategoryDescendants(categoryId) {
    const descendants = [];
    const children = await db('cad_categorias').where('parent_id', categoryId);

    for (const child of children) {
      descendants.push(child);
      const grandChildren = await this.getCategoryDescendants(child.id_categoria);
      descendants.push(...grandChildren);
    }

    return descendants;
  }

  async updateCategoryHierarchy(categoryId) {
    const category = await this.getCategoryById(categoryId);
    
    let nivel = 1;
    let caminhoCompleto = category.nome;

    if (category.parent_id) {
      const parent = await this.getCategoryById(category.parent_id);
      nivel = parent.nivel + 1;
      caminhoCompleto = `${parent.caminho_completo} > ${category.nome}`;
    }

    await db('cad_categorias')
      .where('id_categoria', categoryId)
      .update({
        nivel,
        caminho_completo: caminhoCompleto,
        updated_at: new Date()
      });

    // Update all descendants
    const children = await db('cad_categorias').where('parent_id', categoryId);
    for (const child of children) {
      await this.updateCategoryHierarchy(child.id_categoria);
    }
  }
}

module.exports = new CategoriesService();