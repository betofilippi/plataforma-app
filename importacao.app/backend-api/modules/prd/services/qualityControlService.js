const { ValidationService } = require('./validationService');
const auditLogger = require('../../../src/utils/auditLogger');
const z = require('zod');

const QualityControlSchema = z.object({
  produto_id: z.number().int().positive(),
  ordem_producao_id: z.number().int().positive().optional(),
  lote: z.string().min(1).max(50),
  tipo_inspecao: z.enum(['recebimento', 'processo', 'final', 'expedicao']),
  plano_inspecao_id: z.number().int().positive().optional(),
  quantidade_inspecionada: z.number().positive(),
  data_inspecao: z.string().datetime(),
  responsavel_id: z.number().int().positive(),
  observacoes: z.string().max(1000).optional()
});

const InspectionPlanSchema = z.object({
  produto_id: z.number().int().positive(),
  nome: z.string().min(1).max(100),
  descricao: z.string().max(500).optional(),
  tipo_inspecao: z.enum(['recebimento', 'processo', 'final', 'expedicao']),
  frequencia: z.enum(['lote', 'amostragem', 'total']),
  parametros: z.array(z.object({
    nome: z.string().min(1).max(100),
    especificacao: z.string().min(1).max(500),
    unidade_medida: z.string().max(20).optional(),
    valor_minimo: z.number().optional(),
    valor_maximo: z.number().optional(),
    valor_nominal: z.number().optional(),
    tolerancia: z.number().optional(),
    obrigatorio: z.boolean().default(true),
    metodo_teste: z.string().max(200).optional()
  })),
  amostragem: z.object({
    tipo: z.enum(['simples', 'dupla', 'multipla', 'sequencial']),
    tamanho_amostra: z.number().int().positive(),
    nivel_aceitacao: z.number().min(0).max(100)
  }).optional()
});

const NonConformitySchema = z.object({
  controle_qualidade_id: z.number().int().positive(),
  produto_id: z.number().int().positive(),
  lote: z.string().min(1).max(50),
  descricao: z.string().min(1).max(1000),
  severidade: z.enum(['baixa', 'media', 'alta', 'critica']),
  categoria: z.enum(['dimensional', 'visual', 'funcional', 'material', 'processo']),
  quantidade_afetada: z.number().positive(),
  responsavel_deteccao_id: z.number().int().positive(),
  causa_raiz: z.string().max(1000).optional(),
  acao_imediata: z.string().max(1000).optional()
});

class QualityControlService {
  constructor(knex) {
    this.knex = knex;
  }

  async listQualityControls(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      let query = this.knex('prd_09_controle_qualidade as qc')
        .leftJoin('cad_04_produtos as p', 'qc.produto_id', 'p.id')
        .leftJoin('prd_01_ordens_producao as po', 'qc.ordem_producao_id', 'po.id')
        .leftJoin('prd_10_planos_inspecao as pi', 'qc.plano_inspecao_id', 'pi.id')
        .leftJoin('cad_01_usuarios as resp', 'qc.responsavel_id', 'resp.id')
        .select(
          'qc.*',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo',
          'po.numero_ordem',
          'pi.nome as plano_nome',
          'resp.nome as responsavel_nome'
        )
        .where('qc.ativo', true);

      if (filters.produto_id) {
        query = query.where('qc.produto_id', filters.produto_id);
      }

      if (filters.ordem_producao_id) {
        query = query.where('qc.ordem_producao_id', filters.ordem_producao_id);
      }

      if (filters.status) {
        query = query.where('qc.status', filters.status);
      }

      if (filters.tipo_inspecao) {
        query = query.where('qc.tipo_inspecao', filters.tipo_inspecao);
      }

      if (filters.data_inicio) {
        query = query.where('qc.data_inspecao', '>=', filters.data_inicio);
      }

      if (filters.data_fim) {
        query = query.where('qc.data_inspecao', '<=', filters.data_fim);
      }

      const totalQuery = query.clone().clearSelect().count('* as total');
      const [{ total }] = await totalQuery;

      const results = await query
        .orderBy('qc.data_inspecao', 'desc')
        .limit(limit)
        .offset(offset);

      return {
        data: results,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Erro ao listar controles de qualidade: ${error.message}`);
    }
  }

  async getQualityControlById(id) {
    try {
      const qualityControl = await this.knex('prd_09_controle_qualidade as qc')
        .leftJoin('cad_04_produtos as p', 'qc.produto_id', 'p.id')
        .leftJoin('prd_01_ordens_producao as po', 'qc.ordem_producao_id', 'po.id')
        .leftJoin('prd_10_planos_inspecao as pi', 'qc.plano_inspecao_id', 'pi.id')
        .leftJoin('cad_01_usuarios as resp', 'qc.responsavel_id', 'resp.id')
        .leftJoin('cad_01_usuarios as insp', 'qc.inspetor_id', 'insp.id')
        .select(
          'qc.*',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo',
          'po.numero_ordem',
          'pi.nome as plano_nome',
          'pi.parametros as plano_parametros',
          'resp.nome as responsavel_nome',
          'insp.nome as inspetor_nome'
        )
        .where('qc.id', id)
        .where('qc.ativo', true)
        .first();

      if (!qualityControl) {
        throw new Error('Controle de qualidade não encontrado');
      }

      // Buscar resultados da inspeção
      const inspectionResults = await this.knex('prd_11_resultados_inspecao')
        .where('controle_qualidade_id', id)
        .orderBy('parametro_nome');

      // Buscar não conformidades
      const nonConformities = await this.knex('prd_12_nao_conformidades as nc')
        .leftJoin('cad_01_usuarios as u', 'nc.responsavel_deteccao_id', 'u.id')
        .select(
          'nc.*',
          'u.nome as responsavel_deteccao_nome'
        )
        .where('nc.controle_qualidade_id', id)
        .orderBy('nc.created_at', 'desc');

      // Buscar ações corretivas para as não conformidades
      for (const nc of nonConformities) {
        nc.acoes_corretivas = await this.knex('prd_13_acoes_corretivas as ac')
          .leftJoin('cad_01_usuarios as u', 'ac.responsavel_id', 'u.id')
          .select(
            'ac.*',
            'u.nome as responsavel_nome'
          )
          .where('ac.nao_conformidade_id', nc.id)
          .orderBy('ac.created_at');
      }

      return {
        ...qualityControl,
        resultados_inspecao: inspectionResults,
        nao_conformidades: nonConformities
      };
    } catch (error) {
      throw new Error(`Erro ao buscar controle de qualidade: ${error.message}`);
    }
  }

  async createQualityControl(data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const validData = QualityControlSchema.parse(data);

      // Validar produto existe
      await ValidationService.validateProductExists(validData.produto_id, trx);

      // Validar ordem de produção se fornecida
      if (validData.ordem_producao_id) {
        const ordem = await trx('prd_01_ordens_producao')
          .where('id', validData.ordem_producao_id)
          .where('ativo', true)
          .first();

        if (!ordem) {
          throw new Error('Ordem de produção não encontrada');
        }
      }

      // Validar responsável
      const responsavel = await trx('cad_01_usuarios')
        .where('id', validData.responsavel_id)
        .where('ativo', true)
        .first();

      if (!responsavel) {
        throw new Error('Responsável não encontrado');
      }

      // Gerar número único
      const lastControl = await trx('prd_09_controle_qualidade')
        .where('numero_controle', 'like', 'QC%')
        .orderBy('created_at', 'desc')
        .first();

      const nextNumber = lastControl ? 
        parseInt(lastControl.numero_controle.substring(2)) + 1 : 1;
      const numeroControle = `QC${nextNumber.toString().padStart(6, '0')}`;

      const now = new Date().toISOString();
      const qualityControlData = {
        ...validData,
        numero_controle: numeroControle,
        status: 'pendente',
        created_at: now,
        updated_at: now,
        created_by: userId
      };

      const [qualityControl] = await trx('prd_09_controle_qualidade')
        .insert(qualityControlData)
        .returning('*');

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_09_controle_qualidade',
        operacao: 'INSERT',
        registro_id: qualityControl.id,
        dados_novos: qualityControlData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getQualityControlById(qualityControl.id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async updateQualityControl(id, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const existingControl = await trx('prd_09_controle_qualidade')
        .where({ id, ativo: true })
        .first();

      if (!existingControl) {
        throw new Error('Controle de qualidade não encontrado');
      }

      // Não permitir alteração se já inspecionado
      if (existingControl.status === 'inspecionado') {
        throw new Error('Não é possível alterar controle já inspecionado');
      }

      const validData = QualityControlSchema.parse({
        ...existingControl,
        ...data
      });

      const updateData = {
        ...validData,
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      delete updateData.id;
      delete updateData.created_at;
      delete updateData.created_by;

      await trx('prd_09_controle_qualidade')
        .where({ id })
        .update(updateData);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_09_controle_qualidade',
        operacao: 'UPDATE',
        registro_id: id,
        dados_anteriores: existingControl,
        dados_novos: updateData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getQualityControlById(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async deleteQualityControl(id, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const control = await trx('prd_09_controle_qualidade')
        .where({ id, ativo: true })
        .first();

      if (!control) {
        throw new Error('Controle de qualidade não encontrado');
      }

      if (control.status === 'inspecionado') {
        throw new Error('Não é possível excluir controle já inspecionado');
      }

      const updateData = {
        ativo: false,
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      await trx('prd_09_controle_qualidade')
        .where({ id })
        .update(updateData);

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_09_controle_qualidade',
        operacao: 'DELETE',
        registro_id: id,
        dados_anteriores: control,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return { success: true, message: 'Controle de qualidade excluído com sucesso' };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async executeInspection(id, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const control = await trx('prd_09_controle_qualidade')
        .where({ id, ativo: true })
        .first();

      if (!control) {
        throw new Error('Controle de qualidade não encontrado');
      }

      if (control.status === 'inspecionado') {
        throw new Error('Controle já foi inspecionado');
      }

      const InspectionSchema = z.object({
        resultados: z.array(z.object({
          parametro_nome: z.string().min(1).max(100),
          valor_medido: z.number(),
          aprovado: z.boolean(),
          observacoes: z.string().max(500).optional()
        })),
        resultado_geral: z.enum(['aprovado', 'reprovado', 'aprovado_condicional']),
        observacoes_gerais: z.string().max(1000).optional()
      });

      const validData = InspectionSchema.parse(data);

      // Atualizar status do controle
      const updateData = {
        status: 'inspecionado',
        resultado: validData.resultado_geral,
        data_inspecao_real: new Date().toISOString(),
        inspetor_id: userId,
        observacoes_inspecao: validData.observacoes_gerais,
        updated_at: new Date().toISOString(),
        updated_by: userId
      };

      await trx('prd_09_controle_qualidade')
        .where({ id })
        .update(updateData);

      // Inserir resultados individuais
      for (const resultado of validData.resultados) {
        await trx('prd_11_resultados_inspecao').insert({
          controle_qualidade_id: id,
          parametro_nome: resultado.parametro_nome,
          valor_medido: resultado.valor_medido,
          aprovado: resultado.aprovado,
          observacoes: resultado.observacoes,
          created_at: new Date().toISOString(),
          created_by: userId
        });
      }

      // Se reprovado, criar não conformidade automaticamente
      if (validData.resultado_geral === 'reprovado') {
        await this.createNonConformity({
          controle_qualidade_id: id,
          produto_id: control.produto_id,
          lote: control.lote,
          descricao: `Produto reprovado na inspeção ${control.tipo_inspecao}`,
          severidade: 'alta',
          categoria: 'processo',
          quantidade_afetada: control.quantidade_inspecionada,
          responsavel_deteccao_id: userId
        }, userId, trx);
      }

      // Log de auditoria
      await auditLogger.log({
        tabela: 'prd_09_controle_qualidade',
        operacao: 'INSPECT',
        registro_id: id,
        dados_anteriores: control,
        dados_novos: updateData,
        usuario_id: userId
      }, trx);

      await trx.commit();

      return this.getQualityControlById(id);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async getQualityReports(filters = {}) {
    try {
      let query = this.knex('prd_09_controle_qualidade as qc')
        .join('cad_04_produtos as p', 'qc.produto_id', 'p.id')
        .where('qc.ativo', true)
        .where('qc.status', 'inspecionado');

      if (filters.data_inicio) {
        query = query.where('qc.data_inspecao_real', '>=', filters.data_inicio);
      }

      if (filters.data_fim) {
        query = query.where('qc.data_inspecao_real', '<=', filters.data_fim);
      }

      if (filters.produto_id) {
        query = query.where('qc.produto_id', filters.produto_id);
      }

      if (filters.tipo_inspecao) {
        query = query.where('qc.tipo_inspecao', filters.tipo_inspecao);
      }

      const resumoGeral = await query.clone()
        .select(
          this.knex.raw('COUNT(*) as total_inspecoes'),
          this.knex.raw('COUNT(*) FILTER (WHERE qc.resultado = ?) as aprovados', ['aprovado']),
          this.knex.raw('COUNT(*) FILTER (WHERE qc.resultado = ?) as reprovados', ['reprovado']),
          this.knex.raw('COUNT(*) FILTER (WHERE qc.resultado = ?) as condicionais', ['aprovado_condicional']),
          this.knex.raw('SUM(qc.quantidade_inspecionada) as quantidade_total')
        )
        .first();

      const resumoPorProduto = await query.clone()
        .groupBy('p.id', 'p.nome', 'p.codigo')
        .select(
          'p.id',
          'p.nome',
          'p.codigo',
          this.knex.raw('COUNT(*) as total_inspecoes'),
          this.knex.raw('COUNT(*) FILTER (WHERE qc.resultado = ?) as aprovados', ['aprovado']),
          this.knex.raw('COUNT(*) FILTER (WHERE qc.resultado = ?) as reprovados', ['reprovado']),
          this.knex.raw('SUM(qc.quantidade_inspecionada) as quantidade_total')
        );

      const resumoPorTipo = await query.clone()
        .groupBy('qc.tipo_inspecao')
        .select(
          'qc.tipo_inspecao',
          this.knex.raw('COUNT(*) as total_inspecoes'),
          this.knex.raw('COUNT(*) FILTER (WHERE qc.resultado = ?) as aprovados', ['aprovado']),
          this.knex.raw('COUNT(*) FILTER (WHERE qc.resultado = ?) as reprovados', ['reprovado'])
        );

      // Não conformidades por categoria
      const naoConformidadesPorCategoria = await this.knex('prd_12_nao_conformidades')
        .groupBy('categoria')
        .select(
          'categoria',
          this.knex.raw('COUNT(*) as total'),
          this.knex.raw('SUM(quantidade_afetada) as quantidade_total')
        )
        .where('created_at', '>=', filters.data_inicio || '1900-01-01')
        .where('created_at', '<=', filters.data_fim || '2100-12-31');

      const taxaAprovacao = resumoGeral.total_inspecoes > 0 ? 
        (resumoGeral.aprovados / resumoGeral.total_inspecoes) * 100 : 0;

      return {
        periodo: {
          inicio: filters.data_inicio,
          fim: filters.data_fim
        },
        resumo_geral: {
          ...resumoGeral,
          taxa_aprovacao: taxaAprovacao
        },
        resumo_por_produto: resumoPorProduto,
        resumo_por_tipo: resumoPorTipo,
        nao_conformidades_por_categoria: naoConformidadesPorCategoria
      };
    } catch (error) {
      throw new Error(`Erro ao gerar relatórios de qualidade: ${error.message}`);
    }
  }

  async getInspectionPlans(filters = {}) {
    try {
      let query = this.knex('prd_10_planos_inspecao as pi')
        .leftJoin('cad_04_produtos as p', 'pi.produto_id', 'p.id')
        .leftJoin('cad_01_usuarios as u', 'pi.created_by', 'u.id')
        .select(
          'pi.*',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo',
          'u.nome as criado_por_nome'
        )
        .where('pi.ativo', filters.ativo !== false);

      if (filters.produto_id) {
        query = query.where('pi.produto_id', filters.produto_id);
      }

      const plans = await query.orderBy('pi.nome');

      return plans;
    } catch (error) {
      throw new Error(`Erro ao buscar planos de inspeção: ${error.message}`);
    }
  }

  async createInspectionPlan(data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const validData = InspectionPlanSchema.parse(data);

      // Validar produto existe
      await ValidationService.validateProductExists(validData.produto_id, trx);

      const now = new Date().toISOString();
      const planData = {
        ...validData,
        parametros: JSON.stringify(validData.parametros),
        amostragem: JSON.stringify(validData.amostragem || {}),
        created_at: now,
        updated_at: now,
        created_by: userId
      };

      const [plan] = await trx('prd_10_planos_inspecao')
        .insert(planData)
        .returning('*');

      await trx.commit();

      return plan;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async getNonConformities(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      let query = this.knex('prd_12_nao_conformidades as nc')
        .leftJoin('prd_09_controle_qualidade as qc', 'nc.controle_qualidade_id', 'qc.id')
        .leftJoin('cad_04_produtos as p', 'nc.produto_id', 'p.id')
        .leftJoin('cad_01_usuarios as u', 'nc.responsavel_deteccao_id', 'u.id')
        .select(
          'nc.*',
          'qc.numero_controle',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo',
          'u.nome as responsavel_deteccao_nome'
        );

      if (filters.status) {
        query = query.where('nc.status', filters.status);
      }

      if (filters.severidade) {
        query = query.where('nc.severidade', filters.severidade);
      }

      if (filters.data_inicio) {
        query = query.where('nc.created_at', '>=', filters.data_inicio);
      }

      if (filters.data_fim) {
        query = query.where('nc.created_at', '<=', filters.data_fim);
      }

      const totalQuery = query.clone().clearSelect().count('* as total');
      const [{ total }] = await totalQuery;

      const results = await query
        .orderBy('nc.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return {
        data: results,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Erro ao listar não conformidades: ${error.message}`);
    }
  }

  async createNonConformity(data, userId, trx = null) {
    const transaction = trx || await this.knex.transaction();
    
    try {
      const validData = NonConformitySchema.parse(data);

      // Gerar número único
      const lastNC = await transaction('prd_12_nao_conformidades')
        .where('numero_nc', 'like', 'NC%')
        .orderBy('created_at', 'desc')
        .first();

      const nextNumber = lastNC ? 
        parseInt(lastNC.numero_nc.substring(2)) + 1 : 1;
      const numeroNC = `NC${nextNumber.toString().padStart(6, '0')}`;

      const now = new Date().toISOString();
      const nonConformityData = {
        ...validData,
        numero_nc: numeroNC,
        status: 'aberta',
        created_at: now,
        updated_at: now,
        created_by: userId
      };

      const [nonConformity] = await transaction('prd_12_nao_conformidades')
        .insert(nonConformityData)
        .returning('*');

      if (!trx) {
        await transaction.commit();
      }

      return nonConformity;
    } catch (error) {
      if (!trx) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  async getCorrectiveActions(nonConformityId) {
    try {
      const actions = await this.knex('prd_13_acoes_corretivas as ac')
        .leftJoin('cad_01_usuarios as resp', 'ac.responsavel_id', 'resp.id')
        .leftJoin('cad_01_usuarios as exec', 'ac.executado_por', 'exec.id')
        .select(
          'ac.*',
          'resp.nome as responsavel_nome',
          'exec.nome as executado_por_nome'
        )
        .where('ac.nao_conformidade_id', nonConformityId)
        .orderBy('ac.created_at');

      return actions;
    } catch (error) {
      throw new Error(`Erro ao buscar ações corretivas: ${error.message}`);
    }
  }

  async createCorrectiveAction(nonConformityId, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const nc = await trx('prd_12_nao_conformidades')
        .where('id', nonConformityId)
        .first();

      if (!nc) {
        throw new Error('Não conformidade não encontrada');
      }

      const ActionSchema = z.object({
        tipo: z.enum(['corretiva', 'preventiva']),
        descricao: z.string().min(1).max(1000),
        prazo_execucao: z.string().datetime(),
        responsavel_id: z.number().int().positive(),
        prioridade: z.enum(['baixa', 'media', 'alta', 'critica']).default('media')
      });

      const validData = ActionSchema.parse(data);

      const actionData = {
        nao_conformidade_id: nonConformityId,
        ...validData,
        status: 'pendente',
        created_at: new Date().toISOString(),
        created_by: userId
      };

      const [action] = await trx('prd_13_acoes_corretivas')
        .insert(actionData)
        .returning('*');

      await trx.commit();

      return action;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async getQualityCertificates(filters = {}) {
    try {
      let query = this.knex('prd_14_certificados_qualidade as cq')
        .leftJoin('cad_04_produtos as p', 'cq.produto_id', 'p.id')
        .leftJoin('prd_09_controle_qualidade as qc', 'cq.controle_qualidade_id', 'qc.id')
        .select(
          'cq.*',
          'p.nome as produto_nome',
          'p.codigo as produto_codigo',
          'qc.numero_controle'
        );

      if (filters.produto_id) {
        query = query.where('cq.produto_id', filters.produto_id);
      }

      if (filters.lote) {
        query = query.where('cq.lote', 'ilike', `%${filters.lote}%`);
      }

      if (filters.data_inicio) {
        query = query.where('cq.data_emissao', '>=', filters.data_inicio);
      }

      if (filters.data_fim) {
        query = query.where('cq.data_emissao', '<=', filters.data_fim);
      }

      const certificates = await query.orderBy('cq.data_emissao', 'desc');

      return certificates;
    } catch (error) {
      throw new Error(`Erro ao buscar certificados: ${error.message}`);
    }
  }

  async generateQualityCertificate(controlId, data, userId) {
    const trx = await this.knex.transaction();
    
    try {
      const control = await trx('prd_09_controle_qualidade')
        .where({ id: controlId, ativo: true })
        .first();

      if (!control) {
        throw new Error('Controle de qualidade não encontrado');
      }

      if (control.resultado !== 'aprovado') {
        throw new Error('Só é possível gerar certificado para produtos aprovados');
      }

      // Gerar número único do certificado
      const lastCert = await trx('prd_14_certificados_qualidade')
        .where('numero_certificado', 'like', 'CERT%')
        .orderBy('created_at', 'desc')
        .first();

      const nextNumber = lastCert ? 
        parseInt(lastCert.numero_certificado.substring(4)) + 1 : 1;
      const numeroCertificado = `CERT${nextNumber.toString().padStart(6, '0')}`;

      const certificateData = {
        numero_certificado: numeroCertificado,
        controle_qualidade_id: controlId,
        produto_id: control.produto_id,
        lote: control.lote,
        quantidade_certificada: control.quantidade_inspecionada,
        data_emissao: new Date().toISOString(),
        data_validade: data.data_validade,
        especificacoes_atendidas: JSON.stringify(data.especificacoes || {}),
        observacoes: data.observacoes,
        emitido_por: userId,
        created_at: new Date().toISOString(),
        created_by: userId
      };

      const [certificate] = await trx('prd_14_certificados_qualidade')
        .insert(certificateData)
        .returning('*');

      await trx.commit();

      return certificate;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async getProductTraceability(productId) {
    try {
      // Buscar controles de qualidade do produto
      const qualityControls = await this.knex('prd_09_controle_qualidade as qc')
        .leftJoin('prd_01_ordens_producao as po', 'qc.ordem_producao_id', 'po.id')
        .leftJoin('cad_01_usuarios as insp', 'qc.inspetor_id', 'insp.id')
        .select(
          'qc.*',
          'po.numero_ordem',
          'insp.nome as inspetor_nome'
        )
        .where('qc.produto_id', productId)
        .where('qc.ativo', true)
        .orderBy('qc.data_inspecao', 'desc');

      // Buscar ordens de produção
      const productionOrders = await this.knex('prd_01_ordens_producao as po')
        .leftJoin('prd_03_bom as b', 'po.bom_id', 'b.id')
        .leftJoin('prd_02_centros_trabalho as wc', 'po.centro_trabalho_id', 'wc.id')
        .select(
          'po.*',
          'b.versao as bom_versao',
          'wc.nome as centro_trabalho_nome'
        )
        .where('po.produto_id', productId)
        .where('po.ativo', true)
        .orderBy('po.created_at', 'desc');

      // Buscar consumo de materiais
      const materialConsumption = await this.knex('prd_05_consumo_materiais as cm')
        .join('prd_01_ordens_producao as po', 'cm.ordem_producao_id', 'po.id')
        .join('cad_04_produtos as p', 'cm.produto_id', 'p.id')
        .select(
          'cm.*',
          'po.numero_ordem',
          'p.nome as material_nome',
          'p.codigo as material_codigo'
        )
        .where('po.produto_id', productId)
        .where('po.ativo', true)
        .orderBy('cm.created_at', 'desc');

      // Buscar certificados
      const certificates = await this.knex('prd_14_certificados_qualidade')
        .where('produto_id', productId)
        .orderBy('data_emissao', 'desc');

      return {
        produto_id: productId,
        controles_qualidade: qualityControls,
        ordens_producao: productionOrders,
        consumo_materiais: materialConsumption,
        certificados: certificates,
        rastreabilidade_completa: {
          total_controles: qualityControls.length,
          total_ordens: productionOrders.length,
          total_certificados: certificates.length,
          cobertura_qualidade: qualityControls.length > 0 ? 'Completa' : 'Parcial'
        }
      };
    } catch (error) {
      throw new Error(`Erro ao obter rastreabilidade: ${error.message}`);
    }
  }
}

module.exports = QualityControlService;