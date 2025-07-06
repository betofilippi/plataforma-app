const db = require('../../../src/database/connection');

/**
 * Service for units of measurement operations
 * Handles unit conversions and business logic
 */

class UnitsService {
  /**
   * Get all units with pagination and filters
   */
  async getAllUnits(options = {}) {
    const {
      page = 1,
      limit = 50,
      search = '',
      ativo = null,
      sort = 'descricao',
      order = 'asc'
    } = options;

    try {
      const offset = (page - 1) * limit;
      
      // Base query
      let query = db('cad_unidades_medida as u')
        .select([
          'u.id_unidade',
          'u.simbolo',
          'u.descricao',
          'u.categoria',
          'u.precisao_decimal',
          'u.ativo',
          'u.created_at',
          'u.updated_at',
          db.raw('(SELECT COUNT(*) FROM prd_03_produtos WHERE unidade_medida = u.simbolo) as total_produtos_usando')
        ]);

      // Apply filters
      if (search) {
        query.where(function() {
          this.whereILike('u.simbolo', `%${search}%`)
              .orWhereILike('u.descricao', `%${search}%`)
              .orWhereILike('u.categoria', `%${search}%`);
        });
      }

      if (ativo !== null) {
        query.where('u.ativo', ativo);
      }

      // Count total
      const totalQuery = query.clone().count('u.id_unidade as count').first();
      const { count: total } = await totalQuery;

      // Apply sorting and pagination
      query.orderBy(`u.${sort}`, order)
           .limit(limit)
           .offset(offset);

      const units = await query;

      return {
        data: units,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error in UnitsService.getAllUnits:', error);
      throw new Error('Erro ao buscar unidades de medida');
    }
  }

  /**
   * Get unit by ID
   */
  async getUnitById(id) {
    try {
      const unit = await db('cad_unidades_medida as u')
        .select([
          'u.*',
          db.raw('(SELECT COUNT(*) FROM prd_03_produtos WHERE unidade_medida = u.simbolo) as total_produtos_usando')
        ])
        .where('u.id_unidade', id)
        .first();

      if (!unit) {
        throw new Error('Unidade de medida não encontrada');
      }

      return unit;
    } catch (error) {
      console.error('Error in UnitsService.getUnitById:', error);
      if (error.message.includes('não encontrada')) {
        throw error;
      }
      throw new Error('Erro ao buscar unidade de medida');
    }
  }

  /**
   * Create new unit
   */
  async createUnit(unitData) {
    try {
      // Check for duplicate symbol
      const existingSymbol = await db('cad_unidades_medida')
        .where('simbolo', unitData.simbolo)
        .first();

      if (existingSymbol) {
        throw new Error('Já existe uma unidade com este símbolo');
      }

      // Check for duplicate description
      const existingDescription = await db('cad_unidades_medida')
        .where('descricao', unitData.descricao)
        .first();

      if (existingDescription) {
        throw new Error('Já existe uma unidade com esta descrição');
      }

      const newUnit = {
        ...unitData,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [id] = await db('cad_unidades_medida').insert(newUnit).returning('id_unidade');
      return await this.getUnitById(id.id_unidade || id);
    } catch (error) {
      console.error('Error in UnitsService.createUnit:', error);
      if (error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao criar unidade de medida');
    }
  }

  /**
   * Update unit
   */
  async updateUnit(id, updateData) {
    try {
      const unit = await this.getUnitById(id);

      // Check for duplicate symbol (excluding current unit)
      if (updateData.simbolo) {
        const existing = await db('cad_unidades_medida')
          .where('simbolo', updateData.simbolo)
          .whereNot('id_unidade', id)
          .first();

        if (existing) {
          throw new Error('Já existe uma unidade com este símbolo');
        }
      }

      // Check for duplicate description (excluding current unit)
      if (updateData.descricao) {
        const existing = await db('cad_unidades_medida')
          .where('descricao', updateData.descricao)
          .whereNot('id_unidade', id)
          .first();

        if (existing) {
          throw new Error('Já existe uma unidade com esta descrição');
        }
      }

      const updatedData = {
        ...updateData,
        updated_at: new Date()
      };

      await db('cad_unidades_medida').where('id_unidade', id).update(updatedData);

      // If symbol changed, update products that use this unit
      if (updateData.simbolo && updateData.simbolo !== unit.simbolo) {
        await db('prd_03_produtos')
          .where('unidade_medida', unit.simbolo)
          .update({ unidade_medida: updateData.simbolo });
      }

      return await this.getUnitById(id);
    } catch (error) {
      console.error('Error in UnitsService.updateUnit:', error);
      if (error.message.includes('não encontrada') || error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao atualizar unidade de medida');
    }
  }

  /**
   * Delete unit
   */
  async deleteUnit(id) {
    try {
      const unit = await this.getUnitById(id);

      // Check if unit is being used by products
      const productsUsing = await db('prd_03_produtos')
        .where('unidade_medida', unit.simbolo)
        .count()
        .first();

      if (parseInt(productsUsing.count) > 0) {
        throw new Error(`Unidade está em uso por ${productsUsing.count} produto(s) e não pode ser removida`);
      }

      await db('cad_unidades_medida').where('id_unidade', id).del();

      return { message: 'Unidade de medida removida com sucesso' };
    } catch (error) {
      console.error('Error in UnitsService.deleteUnit:', error);
      if (error.message.includes('não encontrada') || error.message.includes('em uso')) {
        throw error;
      }
      throw new Error('Erro ao remover unidade de medida');
    }
  }

  /**
   * Get conversion factor between two units
   */
  async getConversion(fromUnitId, toUnitId) {
    try {
      // Check if units exist
      const [fromUnit, toUnit] = await Promise.all([
        this.getUnitById(fromUnitId),
        this.getUnitById(toUnitId)
      ]);

      // Check if direct conversion exists
      let conversion = await db('cad_conversoes_unidades')
        .where('id_unidade_origem', fromUnitId)
        .where('id_unidade_destino', toUnitId)
        .first();

      if (conversion) {
        return {
          from_unit: fromUnit,
          to_unit: toUnit,
          factor: parseFloat(conversion.fator_conversao),
          direct: true
        };
      }

      // Check for reverse conversion
      conversion = await db('cad_conversoes_unidades')
        .where('id_unidade_origem', toUnitId)
        .where('id_unidade_destino', fromUnitId)
        .first();

      if (conversion) {
        return {
          from_unit: fromUnit,
          to_unit: toUnit,
          factor: 1 / parseFloat(conversion.fator_conversao),
          direct: false
        };
      }

      // If same unit, factor is 1
      if (fromUnitId === toUnitId) {
        return {
          from_unit: fromUnit,
          to_unit: toUnit,
          factor: 1,
          direct: true
        };
      }

      throw new Error('Conversão não encontrada entre estas unidades');
    } catch (error) {
      console.error('Error in UnitsService.getConversion:', error);
      if (error.message.includes('não encontrada')) {
        throw error;
      }
      throw new Error('Erro ao buscar conversão entre unidades');
    }
  }

  /**
   * Set conversion factor between units
   */
  async setConversion(fromUnitId, toUnitId, factor) {
    try {
      // Validate units exist
      await Promise.all([
        this.getUnitById(fromUnitId),
        this.getUnitById(toUnitId)
      ]);

      if (fromUnitId === toUnitId) {
        throw new Error('Não é possível definir conversão para a mesma unidade');
      }

      if (factor <= 0) {
        throw new Error('Fator de conversão deve ser maior que zero');
      }

      // Check if conversion already exists
      const existing = await db('cad_conversoes_unidades')
        .where('id_unidade_origem', fromUnitId)
        .where('id_unidade_destino', toUnitId)
        .first();

      const conversionData = {
        id_unidade_origem: fromUnitId,
        id_unidade_destino: toUnitId,
        fator_conversao: factor,
        updated_at: new Date()
      };

      if (existing) {
        // Update existing conversion
        await db('cad_conversoes_unidades')
          .where('id_conversao', existing.id_conversao)
          .update(conversionData);
        
        return {
          ...conversionData,
          id_conversao: existing.id_conversao
        };
      } else {
        // Create new conversion
        conversionData.created_at = new Date();
        const [id] = await db('cad_conversoes_unidades')
          .insert(conversionData)
          .returning('id_conversao');
        
        return {
          ...conversionData,
          id_conversao: id.id_conversao || id
        };
      }
    } catch (error) {
      console.error('Error in UnitsService.setConversion:', error);
      if (error.message.includes('não encontrada') || 
          error.message.includes('mesma unidade') ||
          error.message.includes('maior que zero')) {
        throw error;
      }
      throw new Error('Erro ao configurar conversão entre unidades');
    }
  }

  /**
   * Convert value between units
   */
  async convertValue(value, fromUnitId, toUnitId) {
    try {
      const conversion = await this.getConversion(fromUnitId, toUnitId);
      const convertedValue = value * conversion.factor;

      return {
        original_value: value,
        converted_value: convertedValue,
        from_unit: conversion.from_unit,
        to_unit: conversion.to_unit,
        factor: conversion.factor,
        precision: conversion.to_unit.precisao_decimal || 2
      };
    } catch (error) {
      console.error('Error in UnitsService.convertValue:', error);
      throw error;
    }
  }

  /**
   * Get unit statistics
   */
  async getUnitStats() {
    try {
      const [total, ativas, categorias, conversoes] = await Promise.all([
        db('cad_unidades_medida').count().first(),
        db('cad_unidades_medida').where('ativo', true).count().first(),
        db('cad_unidades_medida').distinct('categoria').count().first(),
        db('cad_conversoes_unidades').count().first()
      ]);

      const categoriaStats = await db('cad_unidades_medida')
        .select('categoria')
        .count()
        .groupBy('categoria')
        .orderBy('count', 'desc');

      const maisUsadas = await db('cad_unidades_medida as u')
        .select([
          'u.simbolo',
          'u.descricao',
          db.raw('COUNT(p.id_produto) as total_produtos')
        ])
        .leftJoin('prd_03_produtos as p', 'u.simbolo', 'p.unidade_medida')
        .groupBy('u.id_unidade', 'u.simbolo', 'u.descricao')
        .orderBy('total_produtos', 'desc')
        .limit(5);

      return {
        total: parseInt(total.count),
        ativas: parseInt(ativas.count),
        inativas: parseInt(total.count) - parseInt(ativas.count),
        categorias_diferentes: parseInt(categorias.count),
        conversoes_configuradas: parseInt(conversoes.count),
        por_categoria: categoriaStats.map(stat => ({
          categoria: stat.categoria || 'Sem categoria',
          quantidade: parseInt(stat.count)
        })),
        mais_usadas: maisUsadas.map(unit => ({
          simbolo: unit.simbolo,
          descricao: unit.descricao,
          total_produtos: parseInt(unit.total_produtos)
        }))
      };
    } catch (error) {
      console.error('Error in UnitsService.getUnitStats:', error);
      throw new Error('Erro ao buscar estatísticas de unidades');
    }
  }

  /**
   * Get units by category
   */
  async getUnitsByCategory(category) {
    try {
      const units = await db('cad_unidades_medida')
        .where('categoria', category)
        .where('ativo', true)
        .orderBy('descricao');

      return units;
    } catch (error) {
      console.error('Error in UnitsService.getUnitsByCategory:', error);
      throw new Error('Erro ao buscar unidades por categoria');
    }
  }

  /**
   * Get all available categories
   */
  async getCategories() {
    try {
      const categories = await db('cad_unidades_medida')
        .distinct('categoria')
        .whereNotNull('categoria')
        .orderBy('categoria');

      return categories.map(cat => cat.categoria);
    } catch (error) {
      console.error('Error in UnitsService.getCategories:', error);
      throw new Error('Erro ao buscar categorias de unidades');
    }
  }
}

module.exports = new UnitsService();