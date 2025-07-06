const db = require('../../../src/database/connection');
const { taxRuleSchema, taxRuleUpdateSchema } = require('../services/validationService');
const { z } = require('zod');

// Tax Rules Controller - Comprehensive tax rule management for Brazilian fiscal compliance
class TaxRulesController {
  // Get all tax rules with advanced filtering and pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // Parse and validate filters
      const filters = {
        search: req.query.search || '',
        tipo_regra: req.query.tipo_regra || '',
        id_empresa: req.query.id_empresa || '',
        ativo: req.query.ativo || '',
        cfop: req.query.cfop || '',
        ncm: req.query.ncm || '',
        uf_origem: req.query.uf_origem || '',
        uf_destino: req.query.uf_destino || '',
        tipo_pessoa: req.query.tipo_pessoa || ''
      };

      // Base query with joins
      let query = db('fis_02_regras_tributarias as rt')
        .leftJoin('cad_01_empresas as e', 'rt.id_empresa', 'e.id_empresa')
        .leftJoin('cad_05_usuarios as u', 'rt.id_usuario_criacao', 'u.id_usuario')
        .select(
          'rt.*',
          'e.nome_fantasia as empresa_nome',
          'e.cnpj as empresa_cnpj',
          'u.nome as criado_por'
        );

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('rt.nome_regra', 'ilike', `%${filters.search}%`)
              .orWhere('rt.descricao', 'ilike', `%${filters.search}%`)
              .orWhere('rt.cfop', 'ilike', `%${filters.search}%`)
              .orWhere('rt.ncm', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.tipo_regra) {
        query = query.where('rt.tipo_regra', filters.tipo_regra);
      }

      if (filters.id_empresa) {
        query = query.where('rt.id_empresa', filters.id_empresa);
      }

      if (filters.ativo === 'true') {
        query = query.where('rt.ativo', true);
      } else if (filters.ativo === 'false') {
        query = query.where('rt.ativo', false);
      }

      if (filters.cfop) {
        query = query.where('rt.cfop', filters.cfop);
      }

      if (filters.ncm) {
        query = query.where('rt.ncm', 'like', `${filters.ncm}%`);
      }

      if (filters.uf_origem) {
        query = query.where('rt.uf_origem', filters.uf_origem);
      }

      if (filters.uf_destino) {
        query = query.where('rt.uf_destino', filters.uf_destino);
      }

      if (filters.tipo_pessoa) {
        query = query.where('rt.tipo_pessoa', filters.tipo_pessoa);
      }

      // Count total records for pagination
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting and pagination
      const sortField = req.query.sort || 'nome_regra';
      const sortOrder = req.query.order || 'asc';
      query = query.orderBy(`rt.${sortField}`, sortOrder);

      const taxRules = await query.limit(limit).offset(offset);

      // Add rule hierarchy information
      for (let rule of taxRules) {
        // Check if this rule has exceptions
        rule.tem_excecoes = await db('fis_12_excecoes_tributarias')
          .where('id_regra_pai', rule.id_regra)
          .where('ativo', true)
          .count('* as count')
          .first()
          .then(result => parseInt(result.count) > 0);

        // Get parent rule if this is an exception
        if (rule.id_regra_pai) {
          rule.regra_pai = await db('fis_02_regras_tributarias')
            .select('nome_regra', 'tipo_regra')
            .where('id_regra', rule.id_regra_pai)
            .first();
        }
      }

      res.json({
        success: true,
        data: taxRules,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        },
        filters
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

  // Get tax rule by ID with complete details
  async getById(req, res) {
    try {
      const { id } = req.params;

      // Get main tax rule data
      const taxRule = await db('fis_02_regras_tributarias as rt')
        .leftJoin('cad_01_empresas as e', 'rt.id_empresa', 'e.id_empresa')
        .leftJoin('cad_05_usuarios as u', 'rt.id_usuario_criacao', 'u.id_usuario')
        .leftJoin('cad_05_usuarios as uu', 'rt.id_usuario_atualizacao', 'uu.id_usuario')
        .select(
          'rt.*',
          'e.nome_fantasia as empresa_nome',
          'e.cnpj as empresa_cnpj',
          'u.nome as criado_por',
          'uu.nome as atualizado_por'
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

      // Get exceptions for this rule
      taxRule.excecoes = await db('fis_12_excecoes_tributarias as et')
        .leftJoin('cad_05_usuarios as u', 'et.id_usuario_criacao', 'u.id_usuario')
        .select(
          'et.*',
          'u.nome as criado_por'
        )
        .where('et.id_regra_pai', id)
        .where('et.ativo', true)
        .orderBy('et.prioridade', 'asc');

      // Get parent rule if this is an exception
      if (taxRule.id_regra_pai) {
        taxRule.regra_pai = await db('fis_02_regras_tributarias')
          .select('id_regra', 'nome_regra', 'tipo_regra', 'aliquota')
          .where('id_regra', taxRule.id_regra_pai)
          .first();
      }

      // Get rule usage statistics
      const usageStats = await this.getRuleUsageStats(id);
      taxRule.estatisticas_uso = usageStats;

      res.json({
        success: true,
        data: taxRule
      });

    } catch (error) {
      console.error('Error fetching tax rule by ID:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar regra tributária',
        details: error.message
      });
    }
  }

  // Create new tax rule
  async create(req, res) {
    const trx = await db.transaction();
    
    try {
      // Validate input
      const validatedData = taxRuleSchema.parse(req.body);

      // Check for rule conflicts
      const conflicts = await this.checkRuleConflicts(validatedData, trx);
      if (conflicts.length > 0) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'RULE_CONFLICT',
          message: 'Conflito com regras existentes',
          conflicts: conflicts
        });
      }

      // Create main tax rule record
      const ruleData = {
        ...validatedData,
        id_usuario_criacao: req.user?.id || validatedData.id_usuario_criacao,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [ruleId] = await trx('fis_02_regras_tributarias').insert(ruleData).returning('id_regra');

      // Create exceptions if provided
      if (validatedData.excecoes && validatedData.excecoes.length > 0) {
        for (let i = 0; i < validatedData.excecoes.length; i++) {
          const excecao = validatedData.excecoes[i];
          await trx('fis_12_excecoes_tributarias').insert({
            id_regra_pai: ruleId,
            prioridade: i + 1,
            ...excecao,
            id_usuario_criacao: req.user?.id,
            created_at: new Date()
          });
        }
      }

      // Log rule creation
      await trx('fis_13_log_regras_tributarias').insert({
        id_regra: ruleId,
        acao: 'CRIACAO',
        descricao: 'Regra tributária criada',
        dados_anteriores: null,
        dados_novos: JSON.stringify(ruleData),
        id_usuario: req.user?.id,
        data_acao: new Date()
      });

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
          message: 'Dados inválidos para criação da regra tributária',
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
  async update(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      
      // Validate input
      const validatedData = taxRuleUpdateSchema.parse(req.body);

      // Check if rule exists
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

      // Check for rule conflicts (excluding current rule)
      const conflicts = await this.checkRuleConflicts(validatedData, trx, id);
      if (conflicts.length > 0) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'RULE_CONFLICT',
          message: 'Conflito com regras existentes',
          conflicts: conflicts
        });
      }

      // Update main tax rule record
      const updateData = {
        ...validatedData,
        id_usuario_atualizacao: req.user?.id,
        updated_at: new Date()
      };

      await trx('fis_02_regras_tributarias')
        .where('id_regra', id)
        .update(updateData);

      // Update exceptions if provided
      if (validatedData.excecoes !== undefined) {
        // Delete existing exceptions
        await trx('fis_12_excecoes_tributarias')
          .where('id_regra_pai', id)
          .update({ ativo: false });
        
        // Insert new exceptions
        if (validatedData.excecoes.length > 0) {
          for (let i = 0; i < validatedData.excecoes.length; i++) {
            const excecao = validatedData.excecoes[i];
            await trx('fis_12_excecoes_tributarias').insert({
              id_regra_pai: id,
              prioridade: i + 1,
              ...excecao,
              id_usuario_criacao: req.user?.id,
              created_at: new Date()
            });
          }
        }
      }

      // Log rule update
      await trx('fis_13_log_regras_tributarias').insert({
        id_regra: id,
        acao: 'ALTERACAO',
        descricao: 'Regra tributária alterada',
        dados_anteriores: JSON.stringify(existingRule),
        dados_novos: JSON.stringify(updateData),
        id_usuario: req.user?.id,
        data_acao: new Date()
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
          message: 'Dados inválidos para atualização da regra tributária',
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

  // Activate/Deactivate tax rule
  async toggleStatus(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { ativo } = req.body;

      if (typeof ativo !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Campo "ativo" deve ser boolean'
        });
      }

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

      // Update status
      await trx('fis_02_regras_tributarias')
        .where('id_regra', id)
        .update({
          ativo: ativo,
          data_fim: ativo ? null : new Date(),
          id_usuario_atualizacao: req.user?.id,
          updated_at: new Date()
        });

      // Also update exceptions status
      await trx('fis_12_excecoes_tributarias')
        .where('id_regra_pai', id)
        .update({ ativo: ativo });

      // Log status change
      await trx('fis_13_log_regras_tributarias').insert({
        id_regra: id,
        acao: ativo ? 'ATIVACAO' : 'DESATIVACAO',
        descricao: `Regra tributária ${ativo ? 'ativada' : 'desativada'}`,
        dados_anteriores: JSON.stringify({ ativo: existingRule.ativo }),
        dados_novos: JSON.stringify({ ativo: ativo }),
        id_usuario: req.user?.id,
        data_acao: new Date()
      });

      await trx.commit();

      res.json({
        success: true,
        message: `Regra tributária ${ativo ? 'ativada' : 'desativada'} com sucesso`
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error toggling tax rule status:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao alterar status da regra tributária',
        details: error.message
      });
    }
  }

  // Delete tax rule (soft delete)
  async delete(req, res) {
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

      // Check if rule is being used
      const isBeingUsed = await this.checkRuleUsage(id);
      if (isBeingUsed) {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          error: 'RULE_IN_USE',
          message: 'Regra tributária não pode ser excluída pois está sendo utilizada'
        });
      }

      // Soft delete the rule and its exceptions
      await trx('fis_02_regras_tributarias')
        .where('id_regra', id)
        .update({
          ativo: false,
          data_fim: new Date(),
          deleted_at: new Date(),
          id_usuario_atualizacao: req.user?.id,
          updated_at: new Date()
        });

      await trx('fis_12_excecoes_tributarias')
        .where('id_regra_pai', id)
        .update({ ativo: false });

      // Log deletion
      await trx('fis_13_log_regras_tributarias').insert({
        id_regra: id,
        acao: 'EXCLUSAO',
        descricao: 'Regra tributária excluída',
        dados_anteriores: JSON.stringify(existingRule),
        dados_novos: null,
        id_usuario: req.user?.id,
        data_acao: new Date()
      });

      await trx.commit();

      res.json({
        success: true,
        message: 'Regra tributária excluída com sucesso'
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

  // Test tax rule against sample data
  async testRule(req, res) {
    try {
      const { id } = req.params;
      const { test_data } = req.body;

      if (!test_data) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados de teste são obrigatórios'
        });
      }

      const taxRule = await db('fis_02_regras_tributarias')
        .where('id_regra', id)
        .where('ativo', true)
        .first();

      if (!taxRule) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Regra tributária não encontrada ou inativa'
        });
      }

      // Test rule application logic
      const testResult = await this.applyRuleToTestData(taxRule, test_data);

      res.json({
        success: true,
        data: {
          regra: {
            id_regra: taxRule.id_regra,
            nome_regra: taxRule.nome_regra,
            tipo_regra: taxRule.tipo_regra,
            aliquota: taxRule.aliquota
          },
          dados_teste: test_data,
          resultado: testResult
        }
      });

    } catch (error) {
      console.error('Error testing tax rule:', error);
      res.status(500).json({
        success: false,
        error: 'TEST_ERROR',
        message: 'Erro ao testar regra tributária',
        details: error.message
      });
    }
  }

  // Clone tax rule
  async clone(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { novo_nome } = req.body;

      if (!novo_nome) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Nome da nova regra é obrigatório'
        });
      }

      const originalRule = await trx('fis_02_regras_tributarias')
        .where('id_regra', id)
        .first();

      if (!originalRule) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Regra tributária não encontrada'
        });
      }

      // Clone main rule
      const clonedRuleData = {
        ...originalRule,
        nome_regra: novo_nome,
        ativo: false, // Start as inactive
        id_usuario_criacao: req.user?.id,
        id_usuario_atualizacao: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      delete clonedRuleData.id_regra;

      const [newRuleId] = await trx('fis_02_regras_tributarias')
        .insert(clonedRuleData)
        .returning('id_regra');

      // Clone exceptions
      const exceptions = await trx('fis_12_excecoes_tributarias')
        .where('id_regra_pai', id)
        .where('ativo', true);

      for (const exception of exceptions) {
        const clonedException = {
          ...exception,
          id_regra_pai: newRuleId,
          id_usuario_criacao: req.user?.id,
          created_at: new Date()
        };

        delete clonedException.id_excecao;

        await trx('fis_12_excecoes_tributarias').insert(clonedException);
      }

      // Log cloning
      await trx('fis_13_log_regras_tributarias').insert({
        id_regra: newRuleId,
        acao: 'CLONAGEM',
        descricao: `Regra clonada de ID ${id}`,
        dados_anteriores: null,
        dados_novos: JSON.stringify(clonedRuleData),
        id_usuario: req.user?.id,
        data_acao: new Date()
      });

      await trx.commit();

      res.status(201).json({
        success: true,
        data: { id_regra: newRuleId },
        message: 'Regra tributária clonada com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error cloning tax rule:', error);
      res.status(500).json({
        success: false,
        error: 'CLONE_ERROR',
        message: 'Erro ao clonar regra tributária',
        details: error.message
      });
    }
  }

  // Get tax rule history
  async getHistory(req, res) {
    try {
      const { id } = req.params;

      const history = await db('fis_13_log_regras_tributarias as log')
        .leftJoin('cad_05_usuarios as u', 'log.id_usuario', 'u.id_usuario')
        .select(
          'log.*',
          'u.nome as usuario_nome'
        )
        .where('log.id_regra', id)
        .orderBy('log.data_acao', 'desc');

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error('Error fetching tax rule history:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar histórico da regra tributária',
        details: error.message
      });
    }
  }

  // Get tax rules statistics
  async getStats(req, res) {
    try {
      const filters = {
        id_empresa: req.query.id_empresa || ''
      };

      let baseQuery = db('fis_02_regras_tributarias');
      
      if (filters.id_empresa) {
        baseQuery = baseQuery.where('id_empresa', filters.id_empresa);
      }

      // Total rules
      const totalRules = await baseQuery.clone()
        .count('* as count')
        .first();

      // Rules by type
      const rulesByType = await baseQuery.clone()
        .select('tipo_regra')
        .count('* as count')
        .groupBy('tipo_regra');

      // Rules by status
      const rulesByStatus = await baseQuery.clone()
        .select('ativo')
        .count('* as count')
        .groupBy('ativo');

      // Rules with exceptions
      const rulesWithExceptions = await baseQuery.clone()
        .leftJoin('fis_12_excecoes_tributarias as exc', 'fis_02_regras_tributarias.id_regra', 'exc.id_regra_pai')
        .whereNotNull('exc.id_regra_pai')
        .countDistinct('fis_02_regras_tributarias.id_regra as count')
        .first();

      // Recent activity
      const recentActivity = await db('fis_13_log_regras_tributarias as log')
        .leftJoin('cad_05_usuarios as u', 'log.id_usuario', 'u.id_usuario')
        .leftJoin('fis_02_regras_tributarias as rt', 'log.id_regra', 'rt.id_regra')
        .select(
          'log.acao',
          'log.descricao',
          'log.data_acao',
          'u.nome as usuario_nome',
          'rt.nome_regra'
        )
        .where('log.data_acao', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
        .orderBy('log.data_acao', 'desc')
        .limit(10);

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
          })),
          com_excecoes: parseInt(rulesWithExceptions.count),
          atividade_recente: recentActivity
        }
      });

    } catch (error) {
      console.error('Error fetching tax rules stats:', error);
      res.status(500).json({
        success: false,
        error: 'STATS_ERROR',
        message: 'Erro ao buscar estatísticas das regras tributárias',
        details: error.message
      });
    }
  }

  // Helper methods
  async checkRuleConflicts(ruleData, trx, excludeId = null) {
    let query = trx('fis_02_regras_tributarias')
      .where('id_empresa', ruleData.id_empresa)
      .where('tipo_regra', ruleData.tipo_regra)
      .where('ativo', true);

    if (excludeId) {
      query = query.where('id_regra', '!=', excludeId);
    }

    // Check for overlapping criteria
    if (ruleData.cfop) {
      query = query.where('cfop', ruleData.cfop);
    }

    if (ruleData.ncm) {
      query = query.where('ncm', ruleData.ncm);
    }

    if (ruleData.uf_origem) {
      query = query.where('uf_origem', ruleData.uf_origem);
    }

    if (ruleData.uf_destino) {
      query = query.where('uf_destino', ruleData.uf_destino);
    }

    if (ruleData.tipo_pessoa) {
      query = query.where('tipo_pessoa', ruleData.tipo_pessoa);
    }

    return await query.select('id_regra', 'nome_regra');
  }

  async checkRuleUsage(ruleId) {
    // Check if rule is being used in any tax calculations
    // This would check against transaction tables, invoices, etc.
    // For demo purposes, we'll return false
    return false;
  }

  async getRuleUsageStats(ruleId) {
    // Get usage statistics for the rule
    // This would analyze how often the rule is applied
    // For demo purposes, we'll return mock data
    return {
      total_aplicacoes: 0,
      ultima_aplicacao: null,
      valor_total_calculado: 0
    };
  }

  async applyRuleToTestData(rule, testData) {
    // Apply the tax rule to test data and return results
    const baseValue = testData.valor_base || 1000;
    const aliquota = rule.aliquota || 0;
    
    return {
      aplicavel: true,
      aliquota_aplicada: aliquota,
      valor_base: baseValue,
      valor_imposto: baseValue * (aliquota / 100),
      valor_total: baseValue + (baseValue * (aliquota / 100)),
      observacoes: `Regra ${rule.nome_regra} aplicada com sucesso`
    };
  }
}

module.exports = new TaxRulesController();