const db = require('../../../src/database/connection');

/**
 * Service for price lists operations
 * Handles price list management and pricing rules
 */

class PriceListsService {
  /**
   * Get all price lists with pagination and filters
   */
  async getAllPriceLists(options = {}) {
    const {
      page = 1,
      limit = 50,
      search = '',
      ativo = null,
      tipo_lista = null,
      id_empresa = null,
      sort = 'nome',
      order = 'asc'
    } = options;

    try {
      const offset = (page - 1) * limit;
      
      // Base query
      let query = db('cad_listas_precos as lp')
        .select([
          'lp.id_lista_precos',
          'lp.nome',
          'lp.descricao',
          'lp.tipo_lista',
          'lp.data_inicio',
          'lp.data_fim',
          'lp.ativo',
          'lp.id_empresa',
          'lp.margem_padrao',
          'lp.permite_desconto',
          'lp.desconto_maximo',
          'lp.created_at',
          'lp.updated_at',
          'e.nome_fantasia as empresa_nome',
          db.raw('(SELECT COUNT(*) FROM cad_lista_precos_itens WHERE id_lista_precos = lp.id_lista_precos) as total_itens')
        ])
        .leftJoin('cad_empresas as e', 'lp.id_empresa', 'e.id_empresa');

      // Apply filters
      if (search) {
        query.where(function() {
          this.whereILike('lp.nome', `%${search}%`)
              .orWhereILike('lp.descricao', `%${search}%`);
        });
      }

      if (ativo !== null) {
        query.where('lp.ativo', ativo);
      }

      if (tipo_lista) {
        query.where('lp.tipo_lista', tipo_lista);
      }

      if (id_empresa) {
        query.where('lp.id_empresa', id_empresa);
      }

      // Count total
      const totalQuery = query.clone().count('lp.id_lista_precos as count').first();
      const { count: total } = await totalQuery;

      // Apply sorting and pagination
      query.orderBy(`lp.${sort}`, order)
           .limit(limit)
           .offset(offset);

      const priceLists = await query;

      return {
        data: priceLists,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error in PriceListsService.getAllPriceLists:', error);
      throw new Error('Erro ao buscar listas de preços');
    }
  }

  /**
   * Get price list by ID with items
   */
  async getPriceListById(id, includeItems = false) {
    try {
      const priceList = await db('cad_listas_precos as lp')
        .select([
          'lp.*',
          'e.nome_fantasia as empresa_nome'
        ])
        .leftJoin('cad_empresas as e', 'lp.id_empresa', 'e.id_empresa')
        .where('lp.id_lista_precos', id)
        .first();

      if (!priceList) {
        throw new Error('Lista de preços não encontrada');
      }

      if (includeItems) {
        // Get price list items
        priceList.itens = await db('cad_lista_precos_itens as lpi')
          .select([
            'lpi.*',
            'p.codigo',
            'p.descricao as produto_descricao',
            'u.sigla as unidade_sigla'
          ])
          .join('cad_produtos as p', 'lpi.id_produto', 'p.id_produto')
          .leftJoin('cad_unidades as u', 'p.id_unidade', 'u.id_unidade')
          .where('lpi.id_lista_precos', id)
          .orderBy('p.descricao');
      }

      return priceList;
    } catch (error) {
      console.error('Error in PriceListsService.getPriceListById:', error);
      if (error.message.includes('não encontrada')) {
        throw error;
      }
      throw new Error('Erro ao buscar lista de preços');
    }
  }

  /**
   * Create new price list
   */
  async createPriceList(priceListData) {
    const trx = await db.transaction();
    
    try {
      // Validate name uniqueness within company
      const existingName = await trx('cad_listas_precos')
        .where('nome', priceListData.nome)
        .where('id_empresa', priceListData.id_empresa)
        .first();

      if (existingName) {
        throw new Error('Já existe uma lista de preços com este nome nesta empresa');
      }

      // Validate date range
      if (priceListData.data_inicio && priceListData.data_fim) {
        if (new Date(priceListData.data_inicio) >= new Date(priceListData.data_fim)) {
          throw new Error('Data de início deve ser anterior à data de fim');
        }
      }

      const newPriceList = {
        nome: priceListData.nome,
        descricao: priceListData.descricao,
        tipo_lista: priceListData.tipo_lista || 'VENDA',
        data_inicio: priceListData.data_inicio ? new Date(priceListData.data_inicio) : null,
        data_fim: priceListData.data_fim ? new Date(priceListData.data_fim) : null,
        id_empresa: priceListData.id_empresa,
        margem_padrao: priceListData.margem_padrao || 0,
        permite_desconto: priceListData.permite_desconto !== undefined ? priceListData.permite_desconto : true,
        desconto_maximo: priceListData.desconto_maximo || 0,
        ativo: priceListData.ativo !== undefined ? priceListData.ativo : true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [id] = await trx('cad_listas_precos').insert(newPriceList).returning('id_lista_precos');
      const priceListId = id.id_lista_precos || id;

      // Add items if provided
      if (priceListData.itens && priceListData.itens.length > 0) {
        const itemsData = priceListData.itens.map(item => ({
          id_lista_precos: priceListId,
          id_produto: item.id_produto,
          preco_venda: item.preco_venda,
          preco_promocional: item.preco_promocional || null,
          data_inicio_promocao: item.data_inicio_promocao ? new Date(item.data_inicio_promocao) : null,
          data_fim_promocao: item.data_fim_promocao ? new Date(item.data_fim_promocao) : null,
          margem_percentual: item.margem_percentual || 0,
          desconto_maximo: item.desconto_maximo || 0,
          ativo: item.ativo !== undefined ? item.ativo : true,
          created_at: new Date()
        }));
        await trx('cad_lista_precos_itens').insert(itemsData);
      }

      await trx.commit();
      return await this.getPriceListById(priceListId, true);
    } catch (error) {
      await trx.rollback();
      console.error('Error in PriceListsService.createPriceList:', error);
      if (error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao criar lista de preços');
    }
  }

  /**
   * Update price list
   */
  async updatePriceList(id, updateData) {
    const trx = await db.transaction();
    
    try {
      const priceList = await this.getPriceListById(id);

      // Check for duplicate name (excluding current price list)
      if (updateData.nome) {
        const existing = await trx('cad_listas_precos')
          .where('nome', updateData.nome)
          .where('id_empresa', priceList.id_empresa)
          .whereNot('id_lista_precos', id)
          .first();

        if (existing) {
          throw new Error('Já existe uma lista de preços com este nome nesta empresa');
        }
      }

      // Validate date range
      if (updateData.data_inicio && updateData.data_fim) {
        if (new Date(updateData.data_inicio) >= new Date(updateData.data_fim)) {
          throw new Error('Data de início deve ser anterior à data de fim');
        }
      }

      const updatedData = {
        ...updateData,
        updated_at: new Date()
      };

      // Remove items array from main update
      delete updatedData.itens;

      await trx('cad_listas_precos').where('id_lista_precos', id).update(updatedData);

      // Update items if provided
      if (updateData.itens !== undefined) {
        // Remove existing items
        await trx('cad_lista_precos_itens').where('id_lista_precos', id).del();
        
        // Add new items
        if (updateData.itens.length > 0) {
          const itemsData = updateData.itens.map(item => ({
            id_lista_precos: id,
            id_produto: item.id_produto,
            preco_venda: item.preco_venda,
            preco_promocional: item.preco_promocional || null,
            data_inicio_promocao: item.data_inicio_promocao ? new Date(item.data_inicio_promocao) : null,
            data_fim_promocao: item.data_fim_promocao ? new Date(item.data_fim_promocao) : null,
            margem_percentual: item.margem_percentual || 0,
            desconto_maximo: item.desconto_maximo || 0,
            ativo: item.ativo !== undefined ? item.ativo : true,
            created_at: new Date()
          }));
          await trx('cad_lista_precos_itens').insert(itemsData);
        }
      }

      await trx.commit();
      return await this.getPriceListById(id, true);
    } catch (error) {
      await trx.rollback();
      console.error('Error in PriceListsService.updatePriceList:', error);
      if (error.message.includes('não encontrada') || 
          error.message.includes('Já existe')) {
        throw error;
      }
      throw new Error('Erro ao atualizar lista de preços');
    }
  }

  /**
   * Delete price list
   */
  async deletePriceList(id) {
    const trx = await db.transaction();
    
    try {
      const priceList = await this.getPriceListById(id);

      // Check for dependencies
      const dependencies = await Promise.all([
        trx('vnd_pedidos').where('id_lista_precos', id).count().first(),
        trx('vnd_orcamentos').where('id_lista_precos', id).count().first()
      ]);

      const hasDependencies = dependencies.some(dep => parseInt(dep.count) > 0);

      if (hasDependencies) {
        // Instead of deleting, deactivate the price list
        await trx('cad_listas_precos')
          .where('id_lista_precos', id)
          .update({ 
            ativo: false, 
            updated_at: new Date() 
          });
        
        await trx.commit();
        return { message: 'Lista de preços desativada com sucesso (possui registros associados)' };
      }

      // Delete items first
      await trx('cad_lista_precos_itens').where('id_lista_precos', id).del();
      
      // Delete price list
      await trx('cad_listas_precos').where('id_lista_precos', id).del();

      await trx.commit();
      return { message: 'Lista de preços removida com sucesso' };
    } catch (error) {
      await trx.rollback();
      console.error('Error in PriceListsService.deletePriceList:', error);
      if (error.message.includes('não encontrada')) {
        throw error;
      }
      throw new Error('Erro ao remover lista de preços');
    }
  }

  /**
   * Get price for product in specific price list
   */
  async getProductPrice(idProduto, idListaPrecos, quantidade = 1) {
    try {
      const item = await db('cad_lista_precos_itens as lpi')
        .select([
          'lpi.*',
          'lp.nome as lista_nome',
          'lp.permite_desconto',
          'lp.desconto_maximo as lista_desconto_maximo',
          'p.codigo',
          'p.descricao as produto_descricao'
        ])
        .join('cad_listas_precos as lp', 'lpi.id_lista_precos', 'lp.id_lista_precos')
        .join('cad_produtos as p', 'lpi.id_produto', 'p.id_produto')
        .where('lpi.id_produto', idProduto)
        .where('lpi.id_lista_precos', idListaPrecos)
        .where('lpi.ativo', true)
        .where('lp.ativo', true)
        .first();

      if (!item) {
        return null;
      }

      const now = new Date();
      let preco = item.preco_venda;

      // Check if promotional price is active
      if (item.preco_promocional && 
          item.data_inicio_promocao && 
          item.data_fim_promocao) {
        const inicioPromocao = new Date(item.data_inicio_promocao);
        const fimPromocao = new Date(item.data_fim_promocao);
        
        if (now >= inicioPromocao && now <= fimPromocao) {
          preco = item.preco_promocional;
        }
      }

      return {
        id_produto: item.id_produto,
        codigo: item.codigo,
        descricao: item.produto_descricao,
        preco_unitario: parseFloat(preco),
        preco_total: parseFloat(preco) * quantidade,
        quantidade,
        margem_percentual: item.margem_percentual,
        desconto_maximo: Math.min(item.desconto_maximo, item.lista_desconto_maximo),
        permite_desconto: item.permite_desconto,
        em_promocao: item.preco_promocional && 
                     item.data_inicio_promocao && 
                     item.data_fim_promocao &&
                     now >= new Date(item.data_inicio_promocao) && 
                     now <= new Date(item.data_fim_promocao),
        preco_promocional: item.preco_promocional,
        data_inicio_promocao: item.data_inicio_promocao,
        data_fim_promocao: item.data_fim_promocao
      };
    } catch (error) {
      console.error('Error in PriceListsService.getProductPrice:', error);
      throw new Error('Erro ao buscar preço do produto');
    }
  }

  /**
   * Get price list statistics
   */
  async getPriceListStats() {
    try {
      const [total, ativas, porTipo, porEmpresa] = await Promise.all([
        db('cad_listas_precos').count().first(),
        db('cad_listas_precos').where('ativo', true).count().first(),
        db('cad_listas_precos')
          .select('tipo_lista')
          .count()
          .groupBy('tipo_lista'),
        db('cad_listas_precos as lp')
          .select(['e.nome_fantasia', db.raw('COUNT(*) as quantidade')])
          .join('cad_empresas as e', 'lp.id_empresa', 'e.id_empresa')
          .groupBy('e.id_empresa', 'e.nome_fantasia')
          .orderBy('quantidade', 'desc')
          .limit(5)
      ]);

      const proximasExpirar = await db('cad_listas_precos')
        .select(['nome', 'data_fim'])
        .where('ativo', true)
        .whereNotNull('data_fim')
        .where('data_fim', '>', new Date())
        .where('data_fim', '<=', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // Next 30 days
        .orderBy('data_fim')
        .limit(5);

      return {
        total: parseInt(total.count),
        ativas: parseInt(ativas.count),
        inativas: parseInt(total.count) - parseInt(ativas.count),
        por_tipo: porTipo.map(stat => ({
          tipo: stat.tipo_lista,
          quantidade: parseInt(stat.count)
        })),
        por_empresa: porEmpresa.map(stat => ({
          empresa: stat.nome_fantasia,
          quantidade: parseInt(stat.quantidade)
        })),
        proximas_expirar: proximasExpirar
      };
    } catch (error) {
      console.error('Error in PriceListsService.getPriceListStats:', error);
      throw new Error('Erro ao buscar estatísticas de listas de preços');
    }
  }

  /**
   * Bulk operations on price lists
   */
  async bulkOperations(operation, priceListIds, data = {}) {
    const trx = await db.transaction();
    
    try {
      switch (operation) {
        case 'activate':
          await trx('cad_listas_precos')
            .whereIn('id_lista_precos', priceListIds)
            .update({ ativo: true, updated_at: new Date() });
          break;

        case 'deactivate':
          await trx('cad_listas_precos')
            .whereIn('id_lista_precos', priceListIds)
            .update({ ativo: false, updated_at: new Date() });
          break;

        case 'set_dates':
          if (!data.data_inicio && !data.data_fim) {
            throw new Error('Data de início ou fim é obrigatória');
          }
          
          const updateData = { updated_at: new Date() };
          if (data.data_inicio) updateData.data_inicio = new Date(data.data_inicio);
          if (data.data_fim) updateData.data_fim = new Date(data.data_fim);
          
          await trx('cad_listas_precos')
            .whereIn('id_lista_precos', priceListIds)
            .update(updateData);
          break;

        case 'apply_margin':
          if (!data.margem_percentual) {
            throw new Error('Margem percentual é obrigatória');
          }
          
          // Update all items in selected price lists
          await trx('cad_lista_precos_itens')
            .whereIn('id_lista_precos', priceListIds)
            .update({
              margem_percentual: data.margem_percentual,
              updated_at: new Date()
            });
          break;

        case 'copy_prices':
          if (!data.source_list_id || !data.target_list_id) {
            throw new Error('Lista de origem e destino são obrigatórias');
          }
          
          // Get source items
          const sourceItems = await trx('cad_lista_precos_itens')
            .where('id_lista_precos', data.source_list_id);
          
          if (sourceItems.length > 0) {
            // Delete existing items in target list
            await trx('cad_lista_precos_itens')
              .where('id_lista_precos', data.target_list_id)
              .del();
            
            // Copy items to target list
            const targetItems = sourceItems.map(item => ({
              id_lista_precos: data.target_list_id,
              id_produto: item.id_produto,
              preco_venda: item.preco_venda,
              preco_promocional: item.preco_promocional,
              data_inicio_promocao: item.data_inicio_promocao,
              data_fim_promocao: item.data_fim_promocao,
              margem_percentual: item.margem_percentual,
              desconto_maximo: item.desconto_maximo,
              ativo: item.ativo,
              created_at: new Date()
            }));
            
            await trx('cad_lista_precos_itens').insert(targetItems);
          }
          break;

        case 'delete':
          // Check for dependencies
          const dependencies = await trx('vnd_pedidos')
            .whereIn('id_lista_precos', priceListIds)
            .count().first();
          
          if (parseInt(dependencies.count) > 0 && !data.force) {
            throw new Error('Algumas listas possuem registros associados');
          }

          if (data.force) {
            // Deactivate instead of deleting
            await trx('cad_listas_precos')
              .whereIn('id_lista_precos', priceListIds)
              .update({ ativo: false, updated_at: new Date() });
          } else {
            // Delete items first
            await trx('cad_lista_precos_itens').whereIn('id_lista_precos', priceListIds).del();
            // Delete price lists
            await trx('cad_listas_precos').whereIn('id_lista_precos', priceListIds).del();
          }
          break;

        default:
          throw new Error('Operação não suportada');
      }

      await trx.commit();
      return { affected: priceListIds.length };
    } catch (error) {
      await trx.rollback();
      console.error('Error in PriceListsService.bulkOperations:', error);
      throw error;
    }
  }

  /**
   * Export price lists to different formats
   */
  async exportPriceLists(format = 'csv', filters = {}) {
    try {
      const priceLists = await db('cad_listas_precos as lp')
        .select([
          'lp.nome',
          'lp.descricao',
          'lp.tipo_lista',
          'lp.data_inicio',
          'lp.data_fim',
          'lp.margem_padrao',
          'lp.permite_desconto',
          'lp.desconto_maximo',
          'lp.ativo',
          'e.nome_fantasia as empresa'
        ])
        .leftJoin('cad_empresas as e', 'lp.id_empresa', 'e.id_empresa')
        .modify(queryBuilder => {
          if (filters.ativo !== undefined) {
            queryBuilder.where('lp.ativo', filters.ativo);
          }
          if (filters.tipo_lista) {
            queryBuilder.where('lp.tipo_lista', filters.tipo_lista);
          }
          if (filters.id_empresa) {
            queryBuilder.where('lp.id_empresa', filters.id_empresa);
          }
        })
        .orderBy('lp.nome');

      if (format === 'csv') {
        let csv = 'Nome,Descricao,Tipo,Data Inicio,Data Fim,Margem Padrao,Permite Desconto,Desconto Maximo,Ativo,Empresa\\n';
        
        priceLists.forEach(list => {
          csv += [
            list.nome || '',
            list.descricao || '',
            list.tipo_lista || '',
            list.data_inicio ? new Date(list.data_inicio).toLocaleDateString('pt-BR') : '',
            list.data_fim ? new Date(list.data_fim).toLocaleDateString('pt-BR') : '',
            list.margem_padrao || '0',
            list.permite_desconto ? 'Sim' : 'Não',
            list.desconto_maximo || '0',
            list.ativo ? 'Sim' : 'Não',
            list.empresa || ''
          ].map(field => `"${field}"`).join(',') + '\\n';
        });

        return csv;
      } else {
        return priceLists;
      }
    } catch (error) {
      console.error('Error in PriceListsService.exportPriceLists:', error);
      throw new Error('Erro ao exportar listas de preços');
    }
  }

  /**
   * Get price lists for select dropdown
   */
  async getPriceListsForSelect(search = '', companyId = null) {
    try {
      let query = db('cad_listas_precos')
        .select([
          'id_lista_precos as value',
          'nome as label',
          'tipo_lista',
          'data_inicio',
          'data_fim'
        ])
        .where('ativo', true);

      if (search) {
        query.where(function() {
          this.whereILike('nome', `%${search}%`)
              .orWhereILike('descricao', `%${search}%`);
        });
      }

      if (companyId) {
        query.where('id_empresa', companyId);
      }

      // Filter by current date if there are date restrictions
      const now = new Date();
      query.where(function() {
        this.whereNull('data_inicio')
            .orWhere('data_inicio', '<=', now);
      }).where(function() {
        this.whereNull('data_fim')
            .orWhere('data_fim', '>=', now);
      });

      return await query.orderBy('nome').limit(50);
    } catch (error) {
      console.error('Error in PriceListsService.getPriceListsForSelect:', error);
      throw new Error('Erro ao buscar listas de preços para seleção');
    }
  }

  /**
   * Calculate prices for multiple products
   */
  async calculatePrices(idListaPrecos, produtos) {
    try {
      const results = [];
      
      for (const produto of produtos) {
        const price = await this.getProductPrice(
          produto.id_produto, 
          idListaPrecos, 
          produto.quantidade || 1
        );
        
        if (price) {
          results.push(price);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error in PriceListsService.calculatePrices:', error);
      throw new Error('Erro ao calcular preços');
    }
  }
}

module.exports = new PriceListsService();