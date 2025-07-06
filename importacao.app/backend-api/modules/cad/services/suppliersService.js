const db = require('../../../src/database/connection');

/**
 * Service for suppliers operations
 * Handles comprehensive supplier management and business logic
 */

class SuppliersService {
  /**
   * Get all suppliers with pagination and filters
   */
  async getAllSuppliers(options = {}) {
    const {
      page = 1,
      limit = 50,
      search = '',
      ativo = null,
      tipo_pessoa = null,
      uf = null,
      cidade = null,
      forma_pagamento = null,
      avaliacao = null,
      sort = 'nome_razao_social',
      order = 'asc'
    } = options;

    try {
      const offset = (page - 1) * limit;
      
      // Base query
      let query = db('cad_fornecedores as f')
        .select([
          'f.id_fornecedor',
          'f.tipo_pessoa',
          'f.nome_razao_social',
          'f.nome_fantasia',
          'f.cpf_cnpj',
          'f.rg_ie',
          'f.email',
          'f.telefone',
          'f.celular',
          'f.endereco_logradouro',
          'f.endereco_numero',
          'f.endereco_complemento',
          'f.endereco_bairro',
          'f.endereco_cidade',
          'f.endereco_uf',
          'f.endereco_cep',
          'f.prazo_pagamento',
          'f.forma_pagamento',
          'f.limite_credito',
          'f.observacoes',
          'f.avaliacao',
          'f.ativo',
          'f.created_at',
          'f.updated_at',
          db.raw('(SELECT COUNT(*) FROM cmp_pedidos_compra WHERE id_fornecedor = f.id_fornecedor) as total_pedidos'),
          db.raw('(SELECT COALESCE(SUM(valor_total), 0) FROM cmp_pedidos_compra WHERE id_fornecedor = f.id_fornecedor AND ativo = true) as valor_total_compras'),
          db.raw('(SELECT MAX(data_pedido) FROM cmp_pedidos_compra WHERE id_fornecedor = f.id_fornecedor) as ultima_compra'),
          db.raw('(SELECT COALESCE(AVG(prazo_entrega_dias), 0) FROM cmp_pedidos_compra WHERE id_fornecedor = f.id_fornecedor AND data_entrega IS NOT NULL) as media_prazo_entrega'),
          db.raw('(SELECT COALESCE(AVG(CASE WHEN data_entrega <= prazo_entrega THEN 100.0 ELSE 0.0 END), 0) FROM cmp_pedidos_compra WHERE id_fornecedor = f.id_fornecedor AND data_entrega IS NOT NULL) as percentual_pontualidade')
        ]);

      // Apply filters
      if (search) {
        query.where(function() {
          this.whereILike('f.nome_razao_social', `%${search}%`)
              .orWhereILike('f.nome_fantasia', `%${search}%`)
              .orWhereILike('f.cpf_cnpj', `%${search}%`)
              .orWhereILike('f.email', `%${search}%`);
        });
      }

      if (ativo !== null) {
        query.where('f.ativo', ativo);
      }

      if (tipo_pessoa) {
        query.where('f.tipo_pessoa', tipo_pessoa);
      }

      if (uf) {
        query.where('f.endereco_uf', uf);
      }

      if (cidade) {
        query.whereILike('f.endereco_cidade', `%${cidade}%`);
      }

      if (forma_pagamento) {
        query.where('f.forma_pagamento', forma_pagamento);
      }

      if (avaliacao !== null) {
        query.where('f.avaliacao', '>=', avaliacao);
      }

      // Count total
      const totalQuery = query.clone().count('f.id_fornecedor as count').first();
      const { count: total } = await totalQuery;

      // Apply sorting and pagination
      query.orderBy(`f.${sort}`, order)
           .limit(limit)
           .offset(offset);

      const suppliers = await query;

      return {
        data: suppliers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error in SuppliersService.getAllSuppliers:', error);
      throw new Error('Erro ao buscar fornecedores');
    }
  }

  /**
   * Get supplier by ID with detailed information
   */
  async getSupplierById(id, includePerformance = false) {
    try {
      const supplier = await db('cad_fornecedores as f')
        .select([
          'f.*',
          db.raw('(SELECT COUNT(*) FROM cmp_pedidos_compra WHERE id_fornecedor = f.id_fornecedor) as total_pedidos'),
          db.raw('(SELECT COALESCE(SUM(valor_total), 0) FROM cmp_pedidos_compra WHERE id_fornecedor = f.id_fornecedor AND ativo = true) as valor_total_compras'),
          db.raw('(SELECT MAX(data_pedido) FROM cmp_pedidos_compra WHERE id_fornecedor = f.id_fornecedor) as ultima_compra')
        ])
        .where('f.id_fornecedor', id)
        .first();

      if (!supplier) {
        throw new Error('Fornecedor não encontrado');
      }

      if (includePerformance) {
        supplier.performance = await this.getSupplierPerformanceMetrics(id);
      }

      return supplier;
    } catch (error) {
      console.error('Error in SuppliersService.getSupplierById:', error);
      if (error.message.includes('não encontrado')) {
        throw error;
      }
      throw new Error('Erro ao buscar fornecedor');
    }
  }

  /**
   * Create new supplier
   */
  async createSupplier(supplierData) {
    try {
      // Validate CPF/CNPJ
      if (!this.validateDocument(supplierData.cpf_cnpj, supplierData.tipo_pessoa)) {
        throw new Error('CPF/CNPJ inválido');
      }

      // Check for duplicate CPF/CNPJ
      const existingDocument = await db('cad_fornecedores')
        .where('cpf_cnpj', supplierData.cpf_cnpj)
        .first();

      if (existingDocument) {
        throw new Error('Já existe um fornecedor com este CPF/CNPJ');
      }

      // Check for duplicate email
      if (supplierData.email) {
        const existingEmail = await db('cad_fornecedores')
          .where('email', supplierData.email)
          .first();

        if (existingEmail) {
          throw new Error('Já existe um fornecedor com este email');
        }
      }

      const newSupplier = {
        ...supplierData,
        cpf_cnpj: this.formatDocument(supplierData.cpf_cnpj),
        avaliacao: supplierData.avaliacao || 3, // Default rating
        created_at: new Date(),
        updated_at: new Date()
      };

      const [id] = await db('cad_fornecedores').insert(newSupplier).returning('id_fornecedor');
      return await this.getSupplierById(id.id_fornecedor || id);
    } catch (error) {
      console.error('Error in SuppliersService.createSupplier:', error);
      if (error.message.includes('Já existe') || error.message.includes('inválido')) {
        throw error;
      }
      throw new Error('Erro ao criar fornecedor');
    }
  }

  /**
   * Update supplier
   */
  async updateSupplier(id, updateData) {
    try {
      const supplier = await this.getSupplierById(id);

      // Validate CPF/CNPJ if provided
      if (updateData.cpf_cnpj && updateData.tipo_pessoa) {
        if (!this.validateDocument(updateData.cpf_cnpj, updateData.tipo_pessoa)) {
          throw new Error('CPF/CNPJ inválido');
        }
      }

      // Check for duplicate CPF/CNPJ (excluding current supplier)
      if (updateData.cpf_cnpj) {
        const existing = await db('cad_fornecedores')
          .where('cpf_cnpj', updateData.cpf_cnpj)
          .whereNot('id_fornecedor', id)
          .first();

        if (existing) {
          throw new Error('Já existe um fornecedor com este CPF/CNPJ');
        }
      }

      // Check for duplicate email (excluding current supplier)
      if (updateData.email) {
        const existing = await db('cad_fornecedores')
          .where('email', updateData.email)
          .whereNot('id_fornecedor', id)
          .first();

        if (existing) {
          throw new Error('Já existe um fornecedor com este email');
        }
      }

      const updatedData = {
        ...updateData,
        updated_at: new Date()
      };

      if (updateData.cpf_cnpj) {
        updatedData.cpf_cnpj = this.formatDocument(updateData.cpf_cnpj);
      }

      await db('cad_fornecedores').where('id_fornecedor', id).update(updatedData);

      return await this.getSupplierById(id);
    } catch (error) {
      console.error('Error in SuppliersService.updateSupplier:', error);
      if (error.message.includes('não encontrado') || 
          error.message.includes('Já existe') || 
          error.message.includes('inválido')) {
        throw error;
      }
      throw new Error('Erro ao atualizar fornecedor');
    }
  }

  /**
   * Delete supplier
   */
  async deleteSupplier(id) {
    try {
      const supplier = await this.getSupplierById(id);

      // Check for dependencies
      const [pedidos, produtos] = await Promise.all([
        db('cmp_pedidos_compra').where('id_fornecedor', id).count().first(),
        db('prd_produtos').where('id_fornecedor_principal', id).count().first()
      ]);

      const hasPedidos = parseInt(pedidos.count) > 0;
      const hasProdutos = parseInt(produtos.count) > 0;

      if (hasPedidos || hasProdutos) {
        throw new Error('Fornecedor possui pedidos ou produtos associados e não pode ser removido');
      }

      await db('cad_fornecedores').where('id_fornecedor', id).del();

      return { message: 'Fornecedor removido com sucesso' };
    } catch (error) {
      console.error('Error in SuppliersService.deleteSupplier:', error);
      if (error.message.includes('não encontrado') || error.message.includes('possui')) {
        throw error;
      }
      throw new Error('Erro ao remover fornecedor');
    }
  }

  /**
   * Get supplier statistics
   */
  async getSupplierStats() {
    try {
      const [total, ativos, porTipoPessoa, porUf, porAvaliacao] = await Promise.all([
        db('cad_fornecedores').count().first(),
        db('cad_fornecedores').where('ativo', true).count().first(),
        db('cad_fornecedores')
          .select('tipo_pessoa')
          .count()
          .groupBy('tipo_pessoa'),
        db('cad_fornecedores')
          .select('endereco_uf')
          .count()
          .whereNotNull('endereco_uf')
          .groupBy('endereco_uf')
          .orderBy('count', 'desc')
          .limit(10),
        db('cad_fornecedores')
          .select('avaliacao')
          .count()
          .whereNotNull('avaliacao')
          .groupBy('avaliacao')
          .orderBy('avaliacao')
      ]);

      const melhorAvaliados = await db('cad_fornecedores')
        .select(['nome_razao_social', 'avaliacao', 'total_pedidos'])
        .where('ativo', true)
        .whereNotNull('avaliacao')
        .orderBy('avaliacao', 'desc')
        .limit(5);

      return {
        total: parseInt(total.count),
        ativos: parseInt(ativos.count),
        inativos: parseInt(total.count) - parseInt(ativos.count),
        por_tipo_pessoa: porTipoPessoa.map(stat => ({
          tipo: stat.tipo_pessoa === 'F' ? 'Pessoa Física' : 'Pessoa Jurídica',
          quantidade: parseInt(stat.count)
        })),
        por_uf: porUf.map(stat => ({
          uf: stat.endereco_uf,
          quantidade: parseInt(stat.count)
        })),
        por_avaliacao: porAvaliacao.map(stat => ({
          avaliacao: stat.avaliacao,
          quantidade: parseInt(stat.count)
        })),
        melhor_avaliados: melhorAvaliados
      };
    } catch (error) {
      console.error('Error in SuppliersService.getSupplierStats:', error);
      throw new Error('Erro ao buscar estatísticas de fornecedores');
    }
  }

  /**
   * Get supplier performance metrics
   */
  async getSupplierPerformanceMetrics(supplierId) {
    try {
      const [pedidosStats, produtosStats, entregas] = await Promise.all([
        db('cmp_pedidos_compra')
          .select([
            db.raw('COUNT(*) as total_pedidos'),
            db.raw('COALESCE(SUM(valor_total), 0) as valor_total'),
            db.raw('COALESCE(AVG(valor_total), 0) as ticket_medio'),
            db.raw('MAX(data_pedido) as ultimo_pedido')
          ])
          .where('id_fornecedor', supplierId)
          .first(),
        
        db('prd_produtos')
          .count('id_produto as total_produtos')
          .where('id_fornecedor_principal', supplierId)
          .first(),
        
        db('cmp_pedidos_compra')
          .select([
            db.raw('COALESCE(AVG(prazo_entrega_dias), 0) as prazo_medio'),
            db.raw('COUNT(*) FILTER (WHERE data_entrega <= prazo_entrega) as entregas_pontuais'),
            db.raw('COUNT(*) FILTER (WHERE data_entrega IS NOT NULL) as total_entregas')
          ])
          .where('id_fornecedor', supplierId)
          .first()
      ]);

      const pontualidade = entregas.total_entregas > 0 
        ? (entregas.entregas_pontuais / entregas.total_entregas) * 100 
        : 0;

      return {
        pedidos: {
          total: parseInt(pedidosStats.total_pedidos),
          valor_total: parseFloat(pedidosStats.valor_total),
          ticket_medio: parseFloat(pedidosStats.ticket_medio),
          ultimo_pedido: pedidosStats.ultimo_pedido
        },
        produtos: {
          total_fornecidos: parseInt(produtosStats.total_produtos)
        },
        entregas: {
          prazo_medio_dias: parseFloat(entregas.prazo_medio),
          percentual_pontualidade: Math.round(pontualidade * 100) / 100,
          total_entregas: parseInt(entregas.total_entregas)
        }
      };
    } catch (error) {
      console.error('Error in SuppliersService.getSupplierPerformanceMetrics:', error);
      throw new Error('Erro ao buscar métricas de performance');
    }
  }

  /**
   * Bulk operations on suppliers
   */
  async bulkOperations(operation, supplierIds, data = {}) {
    try {
      switch (operation) {
        case 'activate':
          await db('cad_fornecedores')
            .whereIn('id_fornecedor', supplierIds)
            .update({ ativo: true, updated_at: new Date() });
          return { affected: supplierIds.length };

        case 'deactivate':
          await db('cad_fornecedores')
            .whereIn('id_fornecedor', supplierIds)
            .update({ ativo: false, updated_at: new Date() });
          return { affected: supplierIds.length };

        case 'delete':
          // Check dependencies for all suppliers
          const dependencies = await db('cmp_pedidos_compra')
            .whereIn('id_fornecedor', supplierIds)
            .count().first();
          
          if (parseInt(dependencies.count) > 0 && !data.force) {
            throw new Error('Alguns fornecedores possuem pedidos associados');
          }

          await db('cad_fornecedores').whereIn('id_fornecedor', supplierIds).del();
          return { affected: supplierIds.length };

        case 'update_rating':
          if (!data.avaliacao) {
            throw new Error('Avaliação é obrigatória para esta operação');
          }
          
          await db('cad_fornecedores')
            .whereIn('id_fornecedor', supplierIds)
            .update({ avaliacao: data.avaliacao, updated_at: new Date() });
          return { affected: supplierIds.length };

        case 'update_payment_terms':
          if (!data.prazo_pagamento || !data.forma_pagamento) {
            throw new Error('Prazo e forma de pagamento são obrigatórios');
          }
          
          await db('cad_fornecedores')
            .whereIn('id_fornecedor', supplierIds)
            .update({ 
              prazo_pagamento: data.prazo_pagamento,
              forma_pagamento: data.forma_pagamento,
              updated_at: new Date() 
            });
          return { affected: supplierIds.length };

        default:
          throw new Error('Operação não suportada');
      }
    } catch (error) {
      console.error('Error in SuppliersService.bulkOperations:', error);
      throw error;
    }
  }

  /**
   * Export suppliers to different formats
   */
  async exportSuppliers(format = 'csv', filters = {}) {
    try {
      const suppliers = await db('cad_fornecedores')
        .select([
          'tipo_pessoa',
          'nome_razao_social',
          'nome_fantasia',
          'cpf_cnpj',
          'rg_ie',
          'email',
          'telefone',
          'celular',
          'endereco_logradouro',
          'endereco_numero',
          'endereco_complemento',
          'endereco_bairro',
          'endereco_cidade',
          'endereco_uf',
          'endereco_cep',
          'prazo_pagamento',
          'forma_pagamento',
          'limite_credito',
          'avaliacao',
          'ativo'
        ])
        .modify(queryBuilder => {
          if (filters.ativo !== undefined) {
            queryBuilder.where('ativo', filters.ativo);
          }
          if (filters.tipo_pessoa) {
            queryBuilder.where('tipo_pessoa', filters.tipo_pessoa);
          }
          if (filters.uf) {
            queryBuilder.where('endereco_uf', filters.uf);
          }
        })
        .orderBy('nome_razao_social');

      if (format === 'csv') {
        let csv = 'Tipo Pessoa,Nome/Razão Social,Nome Fantasia,CPF/CNPJ,RG/IE,Email,Telefone,Celular,Logradouro,Número,Complemento,Bairro,Cidade,UF,CEP,Prazo Pagamento,Forma Pagamento,Limite Crédito,Avaliação,Ativo\n';
        
        suppliers.forEach(supplier => {
          csv += [
            supplier.tipo_pessoa || '',
            supplier.nome_razao_social || '',
            supplier.nome_fantasia || '',
            supplier.cpf_cnpj || '',
            supplier.rg_ie || '',
            supplier.email || '',
            supplier.telefone || '',
            supplier.celular || '',
            supplier.endereco_logradouro || '',
            supplier.endereco_numero || '',
            supplier.endereco_complemento || '',
            supplier.endereco_bairro || '',
            supplier.endereco_cidade || '',
            supplier.endereco_uf || '',
            supplier.endereco_cep || '',
            supplier.prazo_pagamento || '',
            supplier.forma_pagamento || '',
            supplier.limite_credito || '',
            supplier.avaliacao || '',
            supplier.ativo ? 'Sim' : 'Não'
          ].map(field => `"${field}"`).join(',') + '\n';
        });

        return csv;
      } else {
        return suppliers;
      }
    } catch (error) {
      console.error('Error in SuppliersService.exportSuppliers:', error);
      throw new Error('Erro ao exportar fornecedores');
    }
  }

  /**
   * Get suppliers for select dropdown
   */
  async getSuppliersForSelect(search = '') {
    try {
      let query = db('cad_fornecedores')
        .select([
          'id_fornecedor as value',
          'nome_razao_social as label',
          'nome_fantasia',
          'cpf_cnpj',
          'avaliacao'
        ])
        .where('ativo', true);

      if (search) {
        query.where(function() {
          this.whereILike('nome_razao_social', `%${search}%`)
              .orWhereILike('nome_fantasia', `%${search}%`)
              .orWhereILike('cpf_cnpj', `%${search}%`);
        });
      }

      return await query.orderBy('nome_razao_social').limit(50);
    } catch (error) {
      console.error('Error in SuppliersService.getSuppliersForSelect:', error);
      throw new Error('Erro ao buscar fornecedores para seleção');
    }
  }

  /**
   * Validation and formatting helpers
   */

  validateDocument(document, tipoPessoa) {
    if (!document || !tipoPessoa) return false;
    
    const cleanDoc = document.replace(/[^\d]/g, '');
    
    if (tipoPessoa === 'F') {
      return this.validateCpf(cleanDoc);
    } else if (tipoPessoa === 'J') {
      return this.validateCnpj(cleanDoc);
    }
    
    return false;
  }

  validateCpf(cpf) {
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    if (parseInt(cpf[9]) !== digit1) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    return parseInt(cpf[10]) === digit2;
  }

  validateCnpj(cnpj) {
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;

    let sum = 0;
    let weight = 5;
    
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    let checkDigit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    if (parseInt(cnpj[12]) !== checkDigit1) return false;
    
    sum = 0;
    weight = 6;
    
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    let checkDigit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    return parseInt(cnpj[13]) === checkDigit2;
  }

  formatDocument(document) {
    const cleanDoc = document.replace(/[^\d]/g, '');
    
    if (cleanDoc.length === 11) {
      // CPF format: 000.000.000-00
      return cleanDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cleanDoc.length === 14) {
      // CNPJ format: 00.000.000/0000-00
      return cleanDoc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return document;
  }
}

module.exports = new SuppliersService();