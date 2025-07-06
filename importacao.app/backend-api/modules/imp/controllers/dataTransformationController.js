const db = require('../../../src/database/connection');
const { z } = require('zod');

// Data Transformation Controller - Advanced data transformation workflows for import processing
class DataTransformationController {
  // Get all transformation workflows with filtering and pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const filters = {
        search: req.query.search || '',
        tipo_importacao: req.query.tipo_importacao || '',
        status: req.query.status || '',
        categoria: req.query.categoria || ''
      };

      // Base query with joins
      let query = db('imp_06_workflows_transformacao as wt')
        .leftJoin('cad_05_usuarios as u', 'wt.id_usuario_criacao', 'u.id_usuario')
        .select(
          'wt.*',
          'u.nome as criado_por'
        );

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('wt.nome_workflow', 'ilike', `%${filters.search}%`)
              .orWhere('wt.descricao', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.tipo_importacao) {
        query = query.where('wt.tipo_importacao', filters.tipo_importacao);
      }

      if (filters.status === 'ativo') {
        query = query.where('wt.ativo', true);
      } else if (filters.status === 'inativo') {
        query = query.where('wt.ativo', false);
      }

      if (filters.categoria) {
        query = query.where('wt.categoria', filters.categoria);
      }

      // Count total records
      const countQuery = query.clone().clearSelect().count('* as total').first();
      const { total } = await countQuery;

      // Apply sorting and pagination
      const sortField = req.query.sort || 'nome_workflow';
      const sortOrder = req.query.order || 'asc';
      query = query.orderBy(`wt.${sortField}`, sortOrder);

      const workflows = await query.limit(limit).offset(offset);

      // Add step count for each workflow
      for (let workflow of workflows) {
        const stepCount = await db('imp_07_etapas_transformacao')
          .where('id_workflow', workflow.id_workflow)
          .where('ativo', true)
          .count('* as count')
          .first();
        
        workflow.total_etapas = parseInt(stepCount.count);

        // Get usage statistics
        const usageStats = await db('imp_08_execucoes_workflow')
          .where('id_workflow', workflow.id_workflow)
          .select(
            db.raw('COUNT(*) as total_execucoes'),
            db.raw('COUNT(CASE WHEN status = \'SUCESSO\' THEN 1 END) as execucoes_sucesso'),
            db.raw('COUNT(CASE WHEN status = \'ERRO\' THEN 1 END) as execucoes_erro'),
            db.raw('MAX(data_execucao) as ultima_execucao')
          )
          .first();

        workflow.estatisticas = {
          total_execucoes: parseInt(usageStats.total_execucoes),
          execucoes_sucesso: parseInt(usageStats.execucoes_sucesso),
          execucoes_erro: parseInt(usageStats.execucoes_erro),
          ultima_execucao: usageStats.ultima_execucao,
          taxa_sucesso: usageStats.total_execucoes > 0 ? 
            Math.round((usageStats.execucoes_sucesso / usageStats.total_execucoes) * 100 * 100) / 100 : 0
        };
      }

      res.json({
        success: true,
        data: workflows,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          totalPages: Math.ceil(total / limit)
        },
        filters
      });

    } catch (error) {
      console.error('Error fetching transformation workflows:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar workflows de transformação',
        details: error.message
      });
    }
  }

  // Get workflow by ID with complete details
  async getById(req, res) {
    try {
      const { id } = req.params;

      // Get main workflow data
      const workflow = await db('imp_06_workflows_transformacao as wt')
        .leftJoin('cad_05_usuarios as u', 'wt.id_usuario_criacao', 'u.id_usuario')
        .leftJoin('cad_05_usuarios as uu', 'wt.id_usuario_atualizacao', 'uu.id_usuario')
        .select(
          'wt.*',
          'u.nome as criado_por',
          'uu.nome as atualizado_por'
        )
        .where('wt.id_workflow', id)
        .first();

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Workflow de transformação não encontrado'
        });
      }

      // Get workflow steps
      workflow.etapas = await db('imp_07_etapas_transformacao as et')
        .leftJoin('cad_05_usuarios as u', 'et.id_usuario_criacao', 'u.id_usuario')
        .select(
          'et.*',
          'u.nome as criado_por'
        )
        .where('et.id_workflow', id)
        .where('et.ativo', true)
        .orderBy('et.ordem_execucao');

      // Parse JSON configurations
      workflow.etapas = workflow.etapas.map(etapa => ({
        ...etapa,
        configuracao: typeof etapa.configuracao === 'string' 
          ? JSON.parse(etapa.configuracao) 
          : etapa.configuracao,
        parametros_entrada: typeof etapa.parametros_entrada === 'string'
          ? JSON.parse(etapa.parametros_entrada || '{}')
          : etapa.parametros_entrada || {},
        parametros_saida: typeof etapa.parametros_saida === 'string'
          ? JSON.parse(etapa.parametros_saida || '{}')
          : etapa.parametros_saida || {}
      }));

      // Get recent executions
      workflow.execucoes_recentes = await db('imp_08_execucoes_workflow as ew')
        .leftJoin('cad_05_usuarios as u', 'ew.id_usuario', 'u.id_usuario')
        .select(
          'ew.*',
          'u.nome as executado_por'
        )
        .where('ew.id_workflow', id)
        .orderBy('ew.data_execucao', 'desc')
        .limit(10);

      res.json({
        success: true,
        data: workflow
      });

    } catch (error) {
      console.error('Error fetching workflow by ID:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar workflow de transformação',
        details: error.message
      });
    }
  }

  // Create new transformation workflow
  async create(req, res) {
    const trx = await db.transaction();
    
    try {
      const validatedData = z.object({
        nome_workflow: z.string(),
        descricao: z.string().optional(),
        tipo_importacao: z.string(),
        categoria: z.enum(['LIMPEZA', 'VALIDACAO', 'TRANSFORMACAO', 'ENRIQUECIMENTO', 'FORMATACAO']),
        configuracao_global: z.object({}).optional(),
        etapas: z.array(z.object({
          nome_etapa: z.string(),
          tipo_transformacao: z.enum(['MAPPING', 'FILTER', 'VALIDATE', 'CALCULATE', 'LOOKUP', 'CUSTOM']),
          ordem_execucao: z.number(),
          configuracao: z.object({}),
          parametros_entrada: z.object({}).optional(),
          parametros_saida: z.object({}).optional(),
          obrigatoria: z.boolean().default(true),
          parar_em_erro: z.boolean().default(true),
          descricao: z.string().optional()
        })).min(1),
        ativo: z.boolean().default(true)
      }).parse(req.body);

      // Create main workflow record
      const workflowData = {
        nome_workflow: validatedData.nome_workflow,
        descricao: validatedData.descricao,
        tipo_importacao: validatedData.tipo_importacao,
        categoria: validatedData.categoria,
        configuracao_global: JSON.stringify(validatedData.configuracao_global || {}),
        ativo: validatedData.ativo,
        id_usuario_criacao: req.user?.id,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [workflowId] = await trx('imp_06_workflows_transformacao')
        .insert(workflowData)
        .returning('id_workflow');

      // Insert workflow steps
      for (const etapa of validatedData.etapas) {
        await trx('imp_07_etapas_transformacao').insert({
          id_workflow: workflowId,
          nome_etapa: etapa.nome_etapa,
          tipo_transformacao: etapa.tipo_transformacao,
          ordem_execucao: etapa.ordem_execucao,
          configuracao: JSON.stringify(etapa.configuracao),
          parametros_entrada: JSON.stringify(etapa.parametros_entrada || {}),
          parametros_saida: JSON.stringify(etapa.parametros_saida || {}),
          obrigatoria: etapa.obrigatoria,
          parar_em_erro: etapa.parar_em_erro,
          descricao: etapa.descricao,
          ativo: true,
          id_usuario_criacao: req.user?.id,
          created_at: new Date()
        });
      }

      await trx.commit();

      res.status(201).json({
        success: true,
        data: { id_workflow: workflowId },
        message: 'Workflow de transformação criado com sucesso'
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

      console.error('Error creating transformation workflow:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao criar workflow de transformação',
        details: error.message
      });
    }
  }

  // Update transformation workflow
  async update(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      
      const validatedData = z.object({
        nome_workflow: z.string().optional(),
        descricao: z.string().optional(),
        categoria: z.enum(['LIMPEZA', 'VALIDACAO', 'TRANSFORMACAO', 'ENRIQUECIMENTO', 'FORMATACAO']).optional(),
        configuracao_global: z.object({}).optional(),
        etapas: z.array(z.object({
          id_etapa: z.number().optional(),
          nome_etapa: z.string(),
          tipo_transformacao: z.enum(['MAPPING', 'FILTER', 'VALIDATE', 'CALCULATE', 'LOOKUP', 'CUSTOM']),
          ordem_execucao: z.number(),
          configuracao: z.object({}),
          parametros_entrada: z.object({}).optional(),
          parametros_saida: z.object({}).optional(),
          obrigatoria: z.boolean().default(true),
          parar_em_erro: z.boolean().default(true),
          descricao: z.string().optional()
        })).optional(),
        ativo: z.boolean().optional()
      }).parse(req.body);

      // Check if workflow exists
      const existingWorkflow = await trx('imp_06_workflows_transformacao')
        .where('id_workflow', id)
        .first();

      if (!existingWorkflow) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Workflow de transformação não encontrado'
        });
      }

      // Update main workflow record
      const updateData = {
        ...validatedData,
        configuracao_global: validatedData.configuracao_global ? 
          JSON.stringify(validatedData.configuracao_global) : undefined,
        id_usuario_atualizacao: req.user?.id,
        updated_at: new Date()
      };

      // Remove etapas from update data
      delete updateData.etapas;

      await trx('imp_06_workflows_transformacao')
        .where('id_workflow', id)
        .update(updateData);

      // Update steps if provided
      if (validatedData.etapas) {
        // Deactivate existing steps
        await trx('imp_07_etapas_transformacao')
          .where('id_workflow', id)
          .update({ ativo: false });

        // Insert/update new steps
        for (const etapa of validatedData.etapas) {
          if (etapa.id_etapa) {
            // Update existing step
            await trx('imp_07_etapas_transformacao')
              .where('id_etapa', etapa.id_etapa)
              .update({
                nome_etapa: etapa.nome_etapa,
                tipo_transformacao: etapa.tipo_transformacao,
                ordem_execucao: etapa.ordem_execucao,
                configuracao: JSON.stringify(etapa.configuracao),
                parametros_entrada: JSON.stringify(etapa.parametros_entrada || {}),
                parametros_saida: JSON.stringify(etapa.parametros_saida || {}),
                obrigatoria: etapa.obrigatoria,
                parar_em_erro: etapa.parar_em_erro,
                descricao: etapa.descricao,
                ativo: true,
                updated_at: new Date()
              });
          } else {
            // Insert new step
            await trx('imp_07_etapas_transformacao').insert({
              id_workflow: id,
              nome_etapa: etapa.nome_etapa,
              tipo_transformacao: etapa.tipo_transformacao,
              ordem_execucao: etapa.ordem_execucao,
              configuracao: JSON.stringify(etapa.configuracao),
              parametros_entrada: JSON.stringify(etapa.parametros_entrada || {}),
              parametros_saida: JSON.stringify(etapa.parametros_saida || {}),
              obrigatoria: etapa.obrigatoria,
              parar_em_erro: etapa.parar_em_erro,
              descricao: etapa.descricao,
              ativo: true,
              id_usuario_criacao: req.user?.id,
              created_at: new Date()
            });
          }
        }
      }

      await trx.commit();

      res.json({
        success: true,
        message: 'Workflow de transformação atualizado com sucesso'
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

      console.error('Error updating transformation workflow:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao atualizar workflow de transformação',
        details: error.message
      });
    }
  }

  // Execute transformation workflow
  async executeWorkflow(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { dados_entrada, configuracao_execucao = {} } = req.body;

      if (!dados_entrada || !Array.isArray(dados_entrada)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados de entrada são obrigatórios e devem ser um array'
        });
      }

      // Get workflow with steps
      const workflow = await trx('imp_06_workflows_transformacao')
        .where('id_workflow', id)
        .where('ativo', true)
        .first();

      if (!workflow) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Workflow não encontrado ou inativo'
        });
      }

      const steps = await trx('imp_07_etapas_transformacao')
        .where('id_workflow', id)
        .where('ativo', true)
        .orderBy('ordem_execucao');

      // Create execution record
      const [executionId] = await trx('imp_08_execucoes_workflow').insert({
        id_workflow: id,
        status: 'EXECUTANDO',
        total_registros_entrada: dados_entrada.length,
        configuracao_execucao: JSON.stringify(configuracao_execucao),
        data_inicio: new Date(),
        id_usuario: req.user?.id,
        created_at: new Date()
      }).returning('id_execucao');

      await trx.commit();

      // Execute workflow asynchronously
      this.processWorkflowExecution(executionId, workflow, steps, dados_entrada, configuracao_execucao, req.user?.id);

      res.json({
        success: true,
        data: {
          id_execucao: executionId,
          status: 'EXECUTANDO',
          total_registros: dados_entrada.length,
          total_etapas: steps.length
        },
        message: 'Execução do workflow iniciada com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error executing workflow:', error);
      res.status(500).json({
        success: false,
        error: 'EXECUTION_ERROR',
        message: 'Erro ao executar workflow',
        details: error.message
      });
    }
  }

  // Get workflow execution status
  async getExecutionStatus(req, res) {
    try {
      const { executionId } = req.params;

      const execution = await db('imp_08_execucoes_workflow as ew')
        .leftJoin('imp_06_workflows_transformacao as wt', 'ew.id_workflow', 'wt.id_workflow')
        .leftJoin('cad_05_usuarios as u', 'ew.id_usuario', 'u.id_usuario')
        .select(
          'ew.*',
          'wt.nome_workflow',
          'u.nome as executado_por'
        )
        .where('ew.id_execucao', executionId)
        .first();

      if (!execution) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Execução não encontrada'
        });
      }

      // Get step executions
      execution.etapas_execucao = await db('imp_09_execucoes_etapas')
        .where('id_execucao', executionId)
        .orderBy('ordem_execucao');

      // Parse JSON fields
      execution.configuracao_execucao = JSON.parse(execution.configuracao_execucao || '{}');
      execution.resultado_execucao = JSON.parse(execution.resultado_execucao || '{}');

      res.json({
        success: true,
        data: execution
      });

    } catch (error) {
      console.error('Error fetching execution status:', error);
      res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Erro ao buscar status da execução',
        details: error.message
      });
    }
  }

  // Test workflow with sample data
  async testWorkflow(req, res) {
    try {
      const { id } = req.params;
      const { dados_teste } = req.body;

      if (!dados_teste || dados_teste.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados de teste são obrigatórios'
        });
      }

      // Get workflow and steps
      const workflow = await db('imp_06_workflows_transformacao')
        .where('id_workflow', id)
        .first();

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Workflow não encontrado'
        });
      }

      const steps = await db('imp_07_etapas_transformacao')
        .where('id_workflow', id)
        .where('ativo', true)
        .orderBy('ordem_execucao');

      // Process test data through workflow
      const testResults = await this.processTestData(dados_teste, steps);

      res.json({
        success: true,
        data: {
          workflow: {
            id_workflow: workflow.id_workflow,
            nome_workflow: workflow.nome_workflow
          },
          dados_entrada: dados_teste,
          resultados_teste: testResults,
          total_etapas_executadas: steps.length
        }
      });

    } catch (error) {
      console.error('Error testing workflow:', error);
      res.status(500).json({
        success: false,
        error: 'TEST_ERROR',
        message: 'Erro ao testar workflow',
        details: error.message
      });
    }
  }

  // Clone workflow
  async cloneWorkflow(req, res) {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const { nome_novo_workflow } = req.body;

      if (!nome_novo_workflow) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Nome do novo workflow é obrigatório'
        });
      }

      // Get original workflow
      const originalWorkflow = await trx('imp_06_workflows_transformacao')
        .where('id_workflow', id)
        .first();

      if (!originalWorkflow) {
        await trx.rollback();
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Workflow não encontrado'
        });
      }

      // Clone main workflow
      const clonedWorkflowData = {
        ...originalWorkflow,
        nome_workflow: nome_novo_workflow,
        ativo: false, // Start as inactive
        id_usuario_criacao: req.user?.id,
        id_usuario_atualizacao: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      delete clonedWorkflowData.id_workflow;

      const [newWorkflowId] = await trx('imp_06_workflows_transformacao')
        .insert(clonedWorkflowData)
        .returning('id_workflow');

      // Clone steps
      const originalSteps = await trx('imp_07_etapas_transformacao')
        .where('id_workflow', id)
        .where('ativo', true);

      for (const step of originalSteps) {
        const clonedStep = {
          ...step,
          id_workflow: newWorkflowId,
          id_usuario_criacao: req.user?.id,
          created_at: new Date()
        };

        delete clonedStep.id_etapa;

        await trx('imp_07_etapas_transformacao').insert(clonedStep);
      }

      await trx.commit();

      res.status(201).json({
        success: true,
        data: { id_workflow: newWorkflowId },
        message: 'Workflow clonado com sucesso'
      });

    } catch (error) {
      await trx.rollback();
      console.error('Error cloning workflow:', error);
      res.status(500).json({
        success: false,
        error: 'CLONE_ERROR',
        message: 'Erro ao clonar workflow',
        details: error.message
      });
    }
  }

  // Helper methods
  async processWorkflowExecution(executionId, workflow, steps, inputData, executionConfig, userId) {
    try {
      let currentData = [...inputData];
      let totalProcessed = 0;
      let totalErrors = 0;

      for (const step of steps) {
        const stepConfig = JSON.parse(step.configuracao);
        const stepStartTime = new Date();

        try {
          // Execute step transformation
          const stepResult = await this.executeTransformationStep(step, currentData, stepConfig);
          
          currentData = stepResult.transformedData;
          totalErrors += stepResult.errors.length;

          // Log step execution
          await db('imp_09_execucoes_etapas').insert({
            id_execucao: executionId,
            id_etapa: step.id_etapa,
            ordem_execucao: step.ordem_execucao,
            status: stepResult.errors.length > 0 && step.parar_em_erro ? 'ERRO' : 'SUCESSO',
            registros_processados: stepResult.processedCount,
            registros_erro: stepResult.errors.length,
            tempo_execucao: new Date() - stepStartTime,
            detalhes_execucao: JSON.stringify({
              errors: stepResult.errors,
              warnings: stepResult.warnings || []
            }),
            data_inicio: stepStartTime,
            data_fim: new Date()
          });

          // Stop if step has errors and should stop on error
          if (stepResult.errors.length > 0 && step.parar_em_erro) {
            throw new Error(`Erro na etapa ${step.nome_etapa}: ${stepResult.errors[0].message}`);
          }

        } catch (stepError) {
          await db('imp_09_execucoes_etapas').insert({
            id_execucao: executionId,
            id_etapa: step.id_etapa,
            ordem_execucao: step.ordem_execucao,
            status: 'ERRO',
            registros_processados: 0,
            registros_erro: 1,
            tempo_execucao: new Date() - stepStartTime,
            detalhes_execucao: JSON.stringify({
              error: stepError.message
            }),
            data_inicio: stepStartTime,
            data_fim: new Date()
          });

          throw stepError;
        }
      }

      totalProcessed = currentData.length;

      // Update execution as successful
      await db('imp_08_execucoes_workflow')
        .where('id_execucao', executionId)
        .update({
          status: 'SUCESSO',
          total_registros_processados: totalProcessed,
          total_registros_erro: totalErrors,
          resultado_execucao: JSON.stringify({
            dados_transformados: currentData.slice(0, 100), // Store sample of transformed data
            resumo: {
              total_entrada: inputData.length,
              total_saida: totalProcessed,
              total_erros: totalErrors
            }
          }),
          data_fim: new Date(),
          updated_at: new Date()
        });

    } catch (error) {
      // Update execution as failed
      await db('imp_08_execucoes_workflow')
        .where('id_execucao', executionId)
        .update({
          status: 'ERRO',
          resultado_execucao: JSON.stringify({
            erro: error.message,
            dados_parciais: currentData.slice(0, 50)
          }),
          data_fim: new Date(),
          updated_at: new Date()
        });

      console.error('Workflow execution failed:', error);
    }
  }

  async executeTransformationStep(step, data, config) {
    const errors = [];
    const warnings = [];
    let transformedData = [...data];
    let processedCount = 0;

    switch (step.tipo_transformacao) {
      case 'MAPPING':
        // Field mapping transformation
        transformedData = data.map((record, index) => {
          try {
            const mappedRecord = {};
            for (const [targetField, sourceField] of Object.entries(config.mappings || {})) {
              mappedRecord[targetField] = record[sourceField] || null;
            }
            processedCount++;
            return mappedRecord;
          } catch (error) {
            errors.push({ line: index + 1, message: error.message });
            return record;
          }
        });
        break;

      case 'FILTER':
        // Filter transformation
        transformedData = data.filter((record, index) => {
          try {
            // Apply filter conditions
            const filterConditions = config.conditions || [];
            const passes = filterConditions.every(condition => {
              const fieldValue = record[condition.field];
              return this.evaluateCondition(fieldValue, condition.operator, condition.value);
            });
            if (passes) processedCount++;
            return passes;
          } catch (error) {
            errors.push({ line: index + 1, message: error.message });
            return false;
          }
        });
        break;

      case 'VALIDATE':
        // Validation transformation
        transformedData = data.map((record, index) => {
          try {
            const validationRules = config.rules || [];
            for (const rule of validationRules) {
              const fieldValue = record[rule.field];
              if (!this.validateField(fieldValue, rule)) {
                errors.push({ 
                  line: index + 1, 
                  field: rule.field,
                  message: `Validation failed: ${rule.message || 'Invalid value'}` 
                });
              }
            }
            processedCount++;
            return record;
          } catch (error) {
            errors.push({ line: index + 1, message: error.message });
            return record;
          }
        });
        break;

      case 'CALCULATE':
        // Calculation transformation
        transformedData = data.map((record, index) => {
          try {
            const calculations = config.calculations || [];
            const calculatedRecord = { ...record };
            
            for (const calc of calculations) {
              calculatedRecord[calc.targetField] = this.performCalculation(record, calc);
            }
            
            processedCount++;
            return calculatedRecord;
          } catch (error) {
            errors.push({ line: index + 1, message: error.message });
            return record;
          }
        });
        break;

      case 'LOOKUP':
        // Lookup transformation (would require database lookups)
        transformedData = data.map((record, index) => {
          try {
            // This would implement database lookups
            processedCount++;
            return record;
          } catch (error) {
            errors.push({ line: index + 1, message: error.message });
            return record;
          }
        });
        break;

      case 'CUSTOM':
        // Custom transformation (would implement custom business logic)
        transformedData = data.map((record, index) => {
          try {
            // This would implement custom transformation logic
            processedCount++;
            return record;
          } catch (error) {
            errors.push({ line: index + 1, message: error.message });
            return record;
          }
        });
        break;

      default:
        transformedData = data;
        processedCount = data.length;
    }

    return {
      transformedData,
      errors,
      warnings,
      processedCount
    };
  }

  async processTestData(testData, steps) {
    let currentData = [...testData];
    const stepResults = [];

    for (const step of steps) {
      const stepConfig = JSON.parse(step.configuracao);
      const stepResult = await this.executeTransformationStep(step, currentData, stepConfig);
      
      stepResults.push({
        etapa: step.nome_etapa,
        tipo: step.tipo_transformacao,
        ordem: step.ordem_execucao,
        dados_entrada: currentData.length,
        dados_saida: stepResult.transformedData.length,
        erros: stepResult.errors.length,
        processados: stepResult.processedCount,
        amostra_saida: stepResult.transformedData.slice(0, 3)
      });

      currentData = stepResult.transformedData;
    }

    return {
      dados_finais: currentData,
      etapas_executadas: stepResults,
      resumo: {
        registros_entrada: testData.length,
        registros_saida: currentData.length,
        total_etapas: steps.length
      }
    };
  }

  evaluateCondition(value, operator, expectedValue) {
    switch (operator) {
      case 'equals': return value === expectedValue;
      case 'not_equals': return value !== expectedValue;
      case 'contains': return String(value).includes(expectedValue);
      case 'starts_with': return String(value).startsWith(expectedValue);
      case 'ends_with': return String(value).endsWith(expectedValue);
      case 'greater_than': return Number(value) > Number(expectedValue);
      case 'less_than': return Number(value) < Number(expectedValue);
      case 'is_empty': return !value || value === '';
      case 'is_not_empty': return value && value !== '';
      default: return true;
    }
  }

  validateField(value, rule) {
    switch (rule.type) {
      case 'required': return value !== null && value !== undefined && value !== '';
      case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone': return /^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(value);
      case 'cpf': return this.validateCPF(value);
      case 'cnpj': return this.validateCNPJ(value);
      case 'numeric': return !isNaN(Number(value));
      case 'date': return !isNaN(Date.parse(value));
      case 'min_length': return String(value).length >= rule.value;
      case 'max_length': return String(value).length <= rule.value;
      default: return true;
    }
  }

  performCalculation(record, calculation) {
    const { operation, fields, formula } = calculation;
    
    switch (operation) {
      case 'sum':
        return fields.reduce((sum, field) => sum + (Number(record[field]) || 0), 0);
      case 'multiply':
        return fields.reduce((product, field) => product * (Number(record[field]) || 1), 1);
      case 'percentage':
        const base = Number(record[fields[0]]) || 0;
        const percentage = Number(record[fields[1]]) || 0;
        return base * (percentage / 100);
      case 'formula':
        // Would implement safe formula evaluation
        return 0;
      default:
        return null;
    }
  }

  validateCPF(cpf) {
    // Basic CPF validation logic
    return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf);
  }

  validateCNPJ(cnpj) {
    // Basic CNPJ validation logic
    return /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(cnpj);
  }
}

module.exports = new DataTransformationController();