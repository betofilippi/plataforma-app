const db = require('../../../src/database/connection');
const { z } = require('zod');

// Data Validation Controller - Comprehensive import data validation system
class DataValidationController {
  // Validate import data against business rules
  async validateImportData(req, res) {
    try {
      const { tipo_importacao, dados } = req.body;

      if (!tipo_importacao || !dados || !Array.isArray(dados)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Tipo de importação e dados são obrigatórios'
        });
      }

      // Get validation rules for this import type
      const validationRules = await this.getValidationRules(tipo_importacao);
      
      if (!validationRules) {
        return res.status(400).json({
          success: false,
          error: 'IMPORT_TYPE_ERROR',
          message: 'Tipo de importação não suportado'
        });
      }

      // Validate each record
      const validationResults = [];
      let totalRecords = dados.length;
      let validRecords = 0;
      let invalidRecords = 0;

      for (let i = 0; i < dados.length; i++) {
        const record = dados[i];
        const recordValidation = await this.validateSingleRecord(
          record, 
          validationRules, 
          i + 1,
          tipo_importacao
        );

        validationResults.push(recordValidation);

        if (recordValidation.valido) {
          validRecords++;
        } else {
          invalidRecords++;
        }
      }

      // Generate validation summary
      const summary = {
        total_registros: totalRecords,
        registros_validos: validRecords,
        registros_invalidos: invalidRecords,
        taxa_validacao: Math.round((validRecords / totalRecords) * 100 * 100) / 100,
        pode_importar: invalidRecords === 0
      };

      // Save validation results for later reference
      const validationId = await this.saveValidationResults({
        tipo_importacao,
        summary,
        results: validationResults,
        usuario_id: req.user?.id
      });

      res.json({
        success: true,
        data: {
          id_validacao: validationId,
          resumo: summary,
          resultados: validationResults
        }
      });

    } catch (error) {
      console.error('Error validating import data:', error);
      res.status(500).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Erro ao validar dados de importação',
        details: error.message
      });
    }
  }

  // Get validation rules for specific import type
  async getValidationRules(req, res) {
    try {
      const { tipo_importacao } = req.params;

      const rules = await db('imp_01_regras_validacao')
        .where('tipo_importacao', tipo_importacao)
        .where('ativo', true)
        .orderBy('ordem_execucao');

      if (rules.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Regras de validação não encontradas para este tipo'
        });
      }

      // Get field mappings
      const fieldMappings = await db('imp_02_mapeamento_campos')
        .where('tipo_importacao', tipo_importacao)
        .where('ativo', true);

      // Get transformation rules
      const transformationRules = await db('imp_03_regras_transformacao')
        .where('tipo_importacao', tipo_importacao)
        .where('ativo', true);

      res.json({
        success: true,
        data: {
          tipo_importacao,
          regras_validacao: rules,
          mapeamento_campos: fieldMappings,
          regras_transformacao: transformationRules
        }
      });

    } catch (error) {
      console.error('Error fetching validation rules:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar regras de validação',
        details: error.message
      });
    }
  }

  // Create or update validation rules
  async createValidationRule(req, res) {
    const trx = await db.transaction();
    
    try {
      const validatedData = z.object({
        tipo_importacao: z.string(),
        nome_regra: z.string(),
        campo_validacao: z.string(),
        tipo_validacao: z.enum(['OBRIGATORIO', 'FORMATO', 'TAMANHO', 'VALOR', 'REFERENCIA', 'CUSTOM']),
        parametros_validacao: z.object({}).optional(),
        mensagem_erro: z.string(),
        nivel_criticidade: z.enum(['BAIXO', 'MEDIO', 'ALTO', 'CRITICO']),
        ordem_execucao: z.number().optional(),
        ativo: z.boolean().default(true)
      }).parse(req.body);

      // Check if rule already exists
      const existingRule = await trx('imp_01_regras_validacao')
        .where('tipo_importacao', validatedData.tipo_importacao)
        .where('campo_validacao', validatedData.campo_validacao)
        .where('tipo_validacao', validatedData.tipo_validacao)
        .first();

      if (existingRule) {
        await trx.rollback();
        return res.status(409).json({
          success: false,
          error: 'RULE_EXISTS',
          message: 'Regra de validação já existe para este campo'
        });
      }

      // Get next order if not provided
      if (!validatedData.ordem_execucao) {
        const lastRule = await trx('imp_01_regras_validacao')
          .where('tipo_importacao', validatedData.tipo_importacao)
          .orderBy('ordem_execucao', 'desc')
          .first();
        
        validatedData.ordem_execucao = lastRule ? lastRule.ordem_execucao + 1 : 1;
      }

      const ruleData = {
        ...validatedData,
        parametros_validacao: JSON.stringify(validatedData.parametros_validacao || {}),
        created_at: new Date(),
        updated_at: new Date()
      };

      const [ruleId] = await trx('imp_01_regras_validacao')
        .insert(ruleData)
        .returning('id_regra');

      await trx.commit();

      res.status(201).json({
        success: true,
        data: { id_regra: ruleId },
        message: 'Regra de validação criada com sucesso'
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

      console.error('Error creating validation rule:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar regra de validação',
        details: error.message
      });
    }
  }

  // Test validation rules against sample data
  async testValidationRules(req, res) {
    try {
      const { tipo_importacao, dados_teste } = req.body;

      if (!tipo_importacao || !dados_teste) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Tipo de importação e dados de teste são obrigatórios'
        });
      }

      const rules = await this.getValidationRules(tipo_importacao);
      
      if (!rules) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Regras não encontradas para este tipo de importação'
        });
      }

      // Test validation against sample data
      const testResults = await this.validateSingleRecord(
        dados_teste,
        rules,
        1,
        tipo_importacao
      );

      res.json({
        success: true,
        data: {
          dados_teste,
          resultado_validacao: testResults,
          regras_aplicadas: rules.regras_validacao?.length || 0
        }
      });

    } catch (error) {
      console.error('Error testing validation rules:', error);
      res.status(500).json({
        success: false,
        error: 'TEST_ERROR',
        message: 'Erro ao testar regras de validação',
        details: error.message
      });
    }
  }

  // Get validation statistics
  async getValidationStats(req, res) {
    try {
      const filters = {
        tipo_importacao: req.query.tipo_importacao || '',
        periodo: req.query.periodo || '30' // days
      };

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - parseInt(filters.periodo));

      let query = db('imp_04_historico_validacoes');

      if (filters.tipo_importacao) {
        query = query.where('tipo_importacao', filters.tipo_importacao);
      }

      // Total validations
      const totalValidations = await query.clone()
        .where('created_at', '>=', dateFrom)
        .count('* as count')
        .first();

      // Validations by type
      const validationsByType = await query.clone()
        .where('created_at', '>=', dateFrom)
        .select('tipo_importacao')
        .count('* as count')
        .sum('total_registros as total_records')
        .sum('registros_validos as valid_records')
        .sum('registros_invalidos as invalid_records')
        .groupBy('tipo_importacao');

      // Common validation errors
      const commonErrors = await db('imp_05_detalhes_validacao as dv')
        .join('imp_04_historico_validacoes as hv', 'dv.id_validacao', 'hv.id_validacao')
        .select('dv.campo', 'dv.tipo_erro', 'dv.mensagem_erro')
        .count('* as frequency')
        .where('hv.created_at', '>=', dateFrom)
        .where('dv.valido', false)
        .groupBy('dv.campo', 'dv.tipo_erro', 'dv.mensagem_erro')
        .orderBy('frequency', 'desc')
        .limit(10);

      // Success rate over time
      const successRate = await query.clone()
        .where('created_at', '>=', dateFrom)
        .select(db.raw('DATE(created_at) as data'))
        .avg('taxa_validacao as taxa_media')
        .groupBy(db.raw('DATE(created_at)'))
        .orderBy('data');

      res.json({
        success: true,
        data: {
          total_validacoes: parseInt(totalValidations.count),
          por_tipo: validationsByType.map(v => ({
            tipo: v.tipo_importacao,
            quantidade: parseInt(v.count),
            total_registros: parseInt(v.total_records),
            registros_validos: parseInt(v.valid_records),
            registros_invalidos: parseInt(v.invalid_records),
            taxa_sucesso: v.total_records > 0 ? 
              Math.round((v.valid_records / v.total_records) * 100 * 100) / 100 : 0
          })),
          erros_comuns: commonErrors.map(e => ({
            campo: e.campo,
            tipo_erro: e.tipo_erro,
            mensagem: e.mensagem_erro,
            frequencia: parseInt(e.frequency)
          })),
          taxa_sucesso_historica: successRate.map(r => ({
            data: r.data,
            taxa_media: Math.round(parseFloat(r.taxa_media) * 100) / 100
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching validation stats:', error);
      res.status(500).json({
        success: false,
        error: 'STATS_ERROR',
        message: 'Erro ao buscar estatísticas de validação',
        details: error.message
      });
    }
  }

  // Get validation history
  async getValidationHistory(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const filters = {
        tipo_importacao: req.query.tipo_importacao || '',
        usuario_id: req.query.usuario_id || '',
        data_inicial: req.query.data_inicial || '',
        data_final: req.query.data_final || ''
      };

      let query = db('imp_04_historico_validacoes as hv')
        .leftJoin('cad_05_usuarios as u', 'hv.usuario_id', 'u.id_usuario')
        .select(
          'hv.*',
          'u.nome as usuario_nome'
        );

      // Apply filters
      if (filters.tipo_importacao) {
        query = query.where('hv.tipo_importacao', filters.tipo_importacao);
      }

      if (filters.usuario_id) {
        query = query.where('hv.usuario_id', filters.usuario_id);
      }

      if (filters.data_inicial && filters.data_final) {
        query = query.whereBetween('hv.created_at', [filters.data_inicial, filters.data_final]);
      }

      // Count total records
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting and pagination
      const sortField = req.query.sort || 'created_at';
      const sortOrder = req.query.order || 'desc';
      query = query.orderBy(`hv.${sortField}`, sortOrder);

      const history = await query.limit(limit).offset(offset);

      res.json({
        success: true,
        data: history,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        },
        filters
      });

    } catch (error) {
      console.error('Error fetching validation history:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar histórico de validação',
        details: error.message
      });
    }
  }

  // Get detailed validation results
  async getValidationDetails(req, res) {
    try {
      const { id } = req.params;

      const validation = await db('imp_04_historico_validacoes')
        .where('id_validacao', id)
        .first();

      if (!validation) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Validação não encontrada'
        });
      }

      // Get detailed results
      const details = await db('imp_05_detalhes_validacao')
        .where('id_validacao', id)
        .orderBy('numero_linha');

      // Parse stored results
      validation.resumo_validacao = JSON.parse(validation.resumo_validacao || '{}');

      res.json({
        success: true,
        data: {
          validacao: validation,
          detalhes: details
        }
      });

    } catch (error) {
      console.error('Error fetching validation details:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar detalhes da validação',
        details: error.message
      });
    }
  }

  // Helper methods
  async getValidationRules(tipo_importacao) {
    const rules = await db('imp_01_regras_validacao')
      .where('tipo_importacao', tipo_importacao)
      .where('ativo', true)
      .orderBy('ordem_execucao');

    const fieldMappings = await db('imp_02_mapeamento_campos')
      .where('tipo_importacao', tipo_importacao)
      .where('ativo', true);

    const transformationRules = await db('imp_03_regras_transformacao')
      .where('tipo_importacao', tipo_importacao)
      .where('ativo', true);

    if (rules.length === 0) return null;

    return {
      regras_validacao: rules,
      mapeamento_campos: fieldMappings,
      regras_transformacao: transformationRules
    };
  }

  async validateSingleRecord(record, validationRules, lineNumber, importType) {
    const errors = [];
    const warnings = [];
    let isValid = true;

    // Apply each validation rule
    for (const rule of validationRules.regras_validacao || []) {
      const fieldValue = record[rule.campo_validacao];
      const params = typeof rule.parametros_validacao === 'string' 
        ? JSON.parse(rule.parametros_validacao) 
        : rule.parametros_validacao || {};

      const validationResult = await this.applyValidationRule(
        fieldValue,
        rule,
        params,
        record,
        importType
      );

      if (!validationResult.valid) {
        const error = {
          campo: rule.campo_validacao,
          tipo_erro: rule.tipo_validacao,
          mensagem_erro: rule.mensagem_erro,
          nivel_criticidade: rule.nivel_criticidade,
          valor_atual: fieldValue
        };

        if (rule.nivel_criticidade === 'CRITICO' || rule.nivel_criticidade === 'ALTO') {
          errors.push(error);
          isValid = false;
        } else {
          warnings.push(error);
        }
      }
    }

    return {
      numero_linha: lineNumber,
      valido: isValid,
      erros: errors,
      avisos: warnings,
      total_erros: errors.length,
      total_avisos: warnings.length,
      dados_linha: record
    };
  }

  async applyValidationRule(value, rule, params, fullRecord, importType) {
    switch (rule.tipo_validacao) {
      case 'OBRIGATORIO':
        return {
          valid: value !== null && value !== undefined && value !== ''
        };

      case 'FORMATO':
        if (!value) return { valid: true }; // Optional field
        const regex = new RegExp(params.pattern || '.*');
        return {
          valid: regex.test(value.toString())
        };

      case 'TAMANHO':
        if (!value) return { valid: true }; // Optional field
        const length = value.toString().length;
        const minLength = params.min || 0;
        const maxLength = params.max || Infinity;
        return {
          valid: length >= minLength && length <= maxLength
        };

      case 'VALOR':
        if (!value) return { valid: true }; // Optional field
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return { valid: false };
        const minValue = params.min !== undefined ? params.min : -Infinity;
        const maxValue = params.max !== undefined ? params.max : Infinity;
        return {
          valid: numValue >= minValue && numValue <= maxValue
        };

      case 'REFERENCIA':
        if (!value) return { valid: true }; // Optional field
        return await this.validateReference(value, params, importType);

      case 'CUSTOM':
        return await this.validateCustomRule(value, params, fullRecord, importType);

      default:
        return { valid: true };
    }
  }

  async validateReference(value, params, importType) {
    // Validate if referenced record exists
    if (!params.table || !params.field) {
      return { valid: false };
    }

    try {
      const record = await db(params.table)
        .where(params.field, value)
        .first();

      return { valid: !!record };
    } catch (error) {
      console.error('Reference validation error:', error);
      return { valid: false };
    }
  }

  async validateCustomRule(value, params, fullRecord, importType) {
    // Implement custom validation logic based on params
    // This would be extended based on specific business requirements
    return { valid: true };
  }

  async saveValidationResults(validationData) {
    const trx = await db.transaction();
    
    try {
      // Save main validation record
      const [validationId] = await trx('imp_04_historico_validacoes').insert({
        tipo_importacao: validationData.tipo_importacao,
        total_registros: validationData.summary.total_registros,
        registros_validos: validationData.summary.registros_validos,
        registros_invalidos: validationData.summary.registros_invalidos,
        taxa_validacao: validationData.summary.taxa_validacao,
        resumo_validacao: JSON.stringify(validationData.summary),
        usuario_id: validationData.usuario_id,
        created_at: new Date()
      }).returning('id_validacao');

      // Save detailed results
      for (const result of validationData.results) {
        await trx('imp_05_detalhes_validacao').insert({
          id_validacao: validationId,
          numero_linha: result.numero_linha,
          valido: result.valido,
          total_erros: result.total_erros,
          total_avisos: result.total_avisos,
          detalhes_erros: JSON.stringify(result.erros),
          detalhes_avisos: JSON.stringify(result.avisos),
          dados_linha: JSON.stringify(result.dados_linha),
          created_at: new Date()
        });
      }

      await trx.commit();
      return validationId;

    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
}

module.exports = new DataValidationController();