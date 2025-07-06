const db = require('../../../src/database/connection');
const { taxCalculationSchema, taxRuleSchema } = require('../services/validationService');
const { z } = require('zod');

// Tax Engine Controller - Complete tax calculation and rule management
class TaxEngineController {
  // Calculate taxes for a transaction
  async calculateTaxes(req, res) {
    try {
      // Validate input
      const validatedData = taxCalculationSchema.parse(req.body);

      const calculations = [];
      
      // Process each item
      for (const item of validatedData.itens) {
        const itemCalculation = await this.calculateItemTaxes(
          validatedData.id_empresa,
          item,
          validatedData.cliente
        );
        calculations.push(itemCalculation);
      }

      // Consolidate totals
      const totals = this.consolidateTaxTotals(calculations);

      res.json({
        success: true,
        data: {
          itens: calculations,
          totais: totals,
          observacoes: 'Cálculo realizado com base nas regras tributárias vigentes'
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos para cálculo de impostos',
          details: error.errors
        });
      }

      console.error('Error calculating taxes:', error);
      res.status(500).json({
        success: false,
        error: 'CALCULATION_ERROR',
        message: 'Erro ao calcular impostos',
        details: error.message
      });
    }
  }

  // Calculate taxes for a specific item
  async calculateItemTaxes(idEmpresa, item, cliente) {
    // Get company tax configuration
    const company = await db('cad_01_empresas')
      .leftJoin('fis_01_configuracoes_tributarias as ct', 'cad_01_empresas.id_empresa', 'ct.id_empresa')
      .select(
        'cad_01_empresas.*',
        'ct.tipo_regime',
        'ct.aliquota_simples',
        'ct.inscricao_estadual',
        'ct.inscricao_municipal'
      )
      .where('cad_01_empresas.id_empresa', idEmpresa)
      .first();

    if (!company) {
      throw new Error('Empresa não encontrada ou sem configuração tributária');
    }

    // Get product tax information
    const product = await db('prd_03_produtos')
      .where('id_produto', item.id_produto)
      .first();

    if (!product) {
      throw new Error(`Produto ${item.id_produto} não encontrado`);
    }

    const baseValue = item.quantidade * item.valor_unitario - (item.desconto || 0);
    
    const taxes = {
      id_produto: item.id_produto,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      desconto: item.desconto || 0,
      valor_base: baseValue,
      cfop: item.cfop,
      ncm: item.ncm,
      icms: await this.calculateICMS(company, item, cliente, baseValue),
      ipi: await this.calculateIPI(company, item, cliente, baseValue),
      pis: await this.calculatePIS(company, item, cliente, baseValue),
      cofins: await this.calculateCOFINS(company, item, cliente, baseValue),
      iss: await this.calculateISS(company, item, cliente, baseValue)
    };

    // Calculate total taxes
    taxes.valor_total_tributos = 
      (taxes.icms.valor || 0) +
      (taxes.ipi.valor || 0) +
      (taxes.pis.valor || 0) +
      (taxes.cofins.valor || 0) +
      (taxes.iss.valor || 0);

    taxes.valor_total_item = baseValue + taxes.valor_total_tributos;

    return taxes;
  }

  // Calculate ICMS
  async calculateICMS(company, item, cliente, baseValue) {
    // Get ICMS rule
    const rule = await this.getTaxRule(company.id_empresa, 'ICMS', item, cliente);
    
    if (!rule) {
      return { situacao: '00', aliquota: 0, valor: 0, base_calculo: 0 };
    }

    // ICMS calculation logic based on CFOP and states
    const sameState = company.uf === cliente.uf;
    let aliquota = rule.aliquota;
    let baseCalculo = baseValue;

    // Apply reduction if configured
    if (rule.reducao_base > 0) {
      baseCalculo = baseValue * (1 - rule.reducao_base / 100);
    }

    // Interstate operations
    if (!sameState) {
      // Check if it's an interstate operation
      if (['6101', '6102', '6103', '6104', '6105', '6106', '6107', '6108', '6109', '6110'].includes(item.cfop)) {
        aliquota = cliente.contribuinte_icms ? 12 : 7; // Default interstate rates
      }
    }

    const valor = baseCalculo * (aliquota / 100);

    return {
      situacao: rule.situacao_tributaria,
      aliquota,
      base_calculo: baseCalculo,
      valor: valor,
      reducao_base: rule.reducao_base || 0
    };
  }

  // Calculate IPI
  async calculateIPI(company, item, cliente, baseValue) {
    const rule = await this.getTaxRule(company.id_empresa, 'IPI', item, cliente);
    
    if (!rule) {
      return { situacao: '53', aliquota: 0, valor: 0, base_calculo: 0 };
    }

    // IPI only applies to industrialized products
    const isIndustrialized = ['5101', '5102', '5103', '6101', '6102', '6103'].includes(item.cfop);
    
    if (!isIndustrialized) {
      return { situacao: '53', aliquota: 0, valor: 0, base_calculo: 0 };
    }

    let baseCalculo = baseValue;
    if (rule.reducao_base > 0) {
      baseCalculo = baseValue * (1 - rule.reducao_base / 100);
    }

    const valor = baseCalculo * (rule.aliquota / 100);

    return {
      situacao: rule.situacao_tributaria,
      aliquota: rule.aliquota,
      base_calculo: baseCalculo,
      valor: valor
    };
  }

  // Calculate PIS
  async calculatePIS(company, item, cliente, baseValue) {
    const rule = await this.getTaxRule(company.id_empresa, 'PIS', item, cliente);
    
    if (!rule || company.tipo_regime === 'SIMPLES') {
      return { situacao: '07', aliquota: 0, valor: 0, base_calculo: 0 };
    }

    let baseCalculo = baseValue;
    const valor = baseCalculo * (rule.aliquota / 100);

    return {
      situacao: rule.situacao_tributaria,
      aliquota: rule.aliquota,
      base_calculo: baseCalculo,
      valor: valor
    };
  }

  // Calculate COFINS
  async calculateCOFINS(company, item, cliente, baseValue) {
    const rule = await this.getTaxRule(company.id_empresa, 'COFINS', item, cliente);
    
    if (!rule || company.tipo_regime === 'SIMPLES') {
      return { situacao: '07', aliquota: 0, valor: 0, base_calculo: 0 };
    }

    let baseCalculo = baseValue;
    const valor = baseCalculo * (rule.aliquota / 100);

    return {
      situacao: rule.situacao_tributaria,
      aliquota: rule.aliquota,
      base_calculo: baseCalculo,
      valor: valor
    };
  }

  // Calculate ISS (for services)
  async calculateISS(company, item, cliente, baseValue) {
    const rule = await this.getTaxRule(company.id_empresa, 'ISS', item, cliente);
    
    if (!rule) {
      return { situacao: '07', aliquota: 0, valor: 0, base_calculo: 0 };
    }

    // ISS only applies to services
    const isService = item.cfop && item.cfop.startsWith('5') || item.cfop.startsWith('6');
    
    if (!isService) {
      return { situacao: '07', aliquota: 0, valor: 0, base_calculo: 0 };
    }

    let baseCalculo = baseValue;
    const valor = baseCalculo * (rule.aliquota / 100);

    return {
      situacao: rule.situacao_tributaria,
      aliquota: rule.aliquota,
      base_calculo: baseCalculo,
      valor: valor
    };
  }

  // Get applicable tax rule
  async getTaxRule(idEmpresa, tipoImposto, item, cliente) {
    let query = db('fis_02_regras_tributarias')
      .where('id_empresa', idEmpresa)
      .where('tipo_regra', tipoImposto)
      .where('ativo', true)
      .where('data_inicio', '<=', new Date());

    // Apply filters based on available criteria
    if (item.cfop) {
      query = query.where(function() {
        this.where('cfop', item.cfop).orWhereNull('cfop');
      });
    }

    if (item.ncm) {
      query = query.where(function() {
        this.where('ncm', item.ncm).orWhereNull('ncm');
      });
    }

    if (cliente.tipo_pessoa) {
      query = query.where(function() {
        this.where('tipo_pessoa', cliente.tipo_pessoa).orWhereNull('tipo_pessoa');
      });
    }

    if (cliente.uf) {
      query = query.where(function() {
        this.where('uf_destino', cliente.uf).orWhereNull('uf_destino');
      });
    }

    // Order by specificity (more specific rules first)
    query = query.orderByRaw(`
      CASE 
        WHEN cfop IS NOT NULL THEN 1 
        ELSE 2 
      END,
      CASE 
        WHEN ncm IS NOT NULL THEN 1 
        ELSE 2 
      END,
      CASE 
        WHEN tipo_pessoa IS NOT NULL THEN 1 
        ELSE 2 
      END
    `);

    return await query.first();
  }

  // Consolidate tax totals
  consolidateTaxTotals(calculations) {
    const totals = {
      valor_total_produtos: 0,
      valor_total_descontos: 0,
      valor_total_icms: 0,
      valor_total_ipi: 0,
      valor_total_pis: 0,
      valor_total_cofins: 0,
      valor_total_iss: 0,
      valor_total_tributos: 0,
      valor_total_nota: 0
    };

    for (const item of calculations) {
      totals.valor_total_produtos += item.valor_base;
      totals.valor_total_descontos += item.desconto;
      totals.valor_total_icms += item.icms.valor || 0;
      totals.valor_total_ipi += item.ipi.valor || 0;
      totals.valor_total_pis += item.pis.valor || 0;
      totals.valor_total_cofins += item.cofins.valor || 0;
      totals.valor_total_iss += item.iss.valor || 0;
      totals.valor_total_tributos += item.valor_total_tributos;
    }

    totals.valor_total_nota = totals.valor_total_produtos + totals.valor_total_tributos - totals.valor_total_descontos;

    return totals;
  }

  // List all tax rules with filtering
  async listTaxRules(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const filters = {
        tipo_regra: req.query.tipo_regra || '',
        ativo: req.query.ativo || '',
        search: req.query.search || ''
      };

      let query = db('fis_02_regras_tributarias as rt')
        .leftJoin('cad_01_empresas as e', 'rt.id_empresa', 'e.id_empresa')
        .select(
          'rt.*',
          'e.nome_fantasia as empresa_nome'
        );

      // Apply filters
      if (filters.tipo_regra) {
        query = query.where('rt.tipo_regra', filters.tipo_regra);
      }

      if (filters.ativo === 'true') {
        query = query.where('rt.ativo', true);
      } else if (filters.ativo === 'false') {
        query = query.where('rt.ativo', false);
      }

      if (filters.search) {
        query = query.where(function() {
          this.where('rt.nome_regra', 'ilike', `%${filters.search}%`)
              .orWhere('rt.cfop', 'ilike', `%${filters.search}%`)
              .orWhere('rt.ncm', 'ilike', `%${filters.search}%`);
        });
      }

      // Count total records
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting and pagination
      const sortField = req.query.sort || 'nome_regra';
      const sortOrder = req.query.order || 'asc';
      query = query.orderBy(`rt.${sortField}`, sortOrder);

      const taxRules = await query.limit(limit).offset(offset);

      res.json({
        success: true,
        data: taxRules,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching tax rules:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar regras tributárias',
        details: error.message
      });
    }
  }

  // Get tax rule by ID
  async getTaxRuleById(req, res) {
    try {
      const { id } = req.params;

      const taxRule = await db('fis_02_regras_tributarias as rt')
        .leftJoin('cad_01_empresas as e', 'rt.id_empresa', 'e.id_empresa')
        .select(
          'rt.*',
          'e.nome_fantasia as empresa_nome'
        )
        .where('rt.id_regra', id)
        .first();

      if (!taxRule) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Regra tributária não encontrada'
        });
      }

      res.json({
        success: true,
        data: taxRule
      });

    } catch (error) {
      console.error('Error fetching tax rule:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar regra tributária',
        details: error.message
      });
    }
  }

  // Create new tax rule
  async createTaxRule(req, res) {
    const trx = await db.transaction();
    
    try {
      // Validate input
      const validatedData = taxRuleSchema.parse(req.body);

      // Insert tax rule
      const [ruleId] = await trx('fis_02_regras_tributarias').insert({
        ...validatedData,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id_regra');

      await trx.commit();

      res.status(201).json({
        success: true,
        data: { id_regra: ruleId },
        message: 'Regra tributária criada com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: error.errors
        });
      }

      console.error('Error creating tax rule:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar regra tributária',
        details: error.message
      });
    }
  }

  // Update tax rule
  async updateTaxRule(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      
      // Validate input
      const validatedData = taxRuleSchema.parse(req.body);

      const existingRule = await trx('fis_02_regras_tributarias')
        .where('id_regra', id)
        .first();

      if (!existingRule) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Regra tributária não encontrada'
        });
      }

      // Update tax rule
      await trx('fis_02_regras_tributarias')
        .where('id_regra', id)
        .update({
          ...validatedData,
          updated_at: new Date()
        });

      await trx.commit();

      res.json({
        success: true,
        message: 'Regra tributária atualizada com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: error.errors
        });
      }

      console.error('Error updating tax rule:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao atualizar regra tributária',
        details: error.message
      });
    }
  }

  // Delete tax rule
  async deleteTaxRule(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;

      const existingRule = await trx('fis_02_regras_tributarias')
        .where('id_regra', id)
        .first();

      if (!existingRule) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Regra tributária não encontrada'
        });
      }

      // Soft delete - just mark as inactive
      await trx('fis_02_regras_tributarias')
        .where('id_regra', id)
        .update({
          ativo: false,
          updated_at: new Date()
        });

      await trx.commit();

      res.json({
        success: true,
        message: 'Regra tributária desativada com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error deleting tax rule:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao excluir regra tributária',
        details: error.message
      });
    }
  }

  // Get tax calculation statistics
  async getStats(req, res) {
    try {
      // Total tax rules
      const totalRules = await db('fis_02_regras_tributarias')
        .count('* as count')
        .first();

      // Rules by tax type
      const rulesByType = await db('fis_02_regras_tributarias')
        .select('tipo_regra')
        .count('* as count')
        .where('ativo', true)
        .groupBy('tipo_regra');

      // Active vs inactive rules
      const rulesByStatus = await db('fis_02_regras_tributarias')
        .select('ativo')
        .count('* as count')
        .groupBy('ativo');

      res.json({
        success: true,
        data: {
          total_regras: parseInt(totalRules.count),
          por_tipo: rulesByType.map(r => ({
            tipo: r.tipo_regra,
            quantidade: parseInt(r.count)
          })),
          por_status: rulesByStatus.map(r => ({
            status: r.ativo ? 'Ativas' : 'Inativas',
            quantidade: parseInt(r.count)
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching tax engine stats:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar estatísticas do motor tributário',
        details: error.message
      });
    }
  }
}

module.exports = new TaxEngineController();