const { z } = require('zod');

// Schema de validação para Ordem de Produção
const productionOrderSchema = z.object({
  id: z.string().uuid().optional(),
  numero_ordem: z.string().min(1, 'Número da ordem é obrigatório'),
  produto_id: z.string().uuid('ID do produto deve ser um UUID válido'),
  bom_id: z.string().uuid('ID do BOM deve ser um UUID válido'),
  quantidade_planejada: z.number().positive('Quantidade deve ser positiva'),
  quantidade_produzida: z.number().min(0).default(0),
  data_inicio_planejada: z.string().datetime('Data deve estar no formato ISO'),
  data_fim_planejada: z.string().datetime('Data deve estar no formato ISO'),
  data_inicio_real: z.string().datetime().optional(),
  data_fim_real: z.string().datetime().optional(),
  status: z.enum(['planejada', 'liberada', 'em_producao', 'concluida', 'cancelada']).default('planejada'),
  prioridade: z.enum(['baixa', 'normal', 'alta', 'urgente']).default('normal'),
  observacoes: z.string().optional(),
  custo_material: z.number().min(0).default(0),
  custo_mao_obra: z.number().min(0).default(0),
  custo_overhead: z.number().min(0).default(0),
  centro_trabalho_id: z.string().uuid().optional(),
  responsavel_id: z.string().uuid().optional(),
  metadados: z.record(z.any()).optional(),
  ativo: z.boolean().default(true)
});

// Schema de validação para Centro de Trabalho
const workCenterSchema = z.object({
  id: z.string().uuid().optional(),
  codigo: z.string().min(1, 'Código é obrigatório'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  tipo: z.enum(['maquina', 'linha', 'celula', 'manual', 'automatizado']),
  capacidade_horas_dia: z.number().positive('Capacidade deve ser positiva'),
  capacidade_pecas_hora: z.number().positive().optional(),
  custo_hora: z.number().min(0).default(0),
  tempo_setup: z.number().min(0).default(0),
  eficiencia_padrao: z.number().min(0).max(100).default(100),
  localizacao: z.string().optional(),
  responsavel_id: z.string().uuid().optional(),
  manutencao_preventiva: z.object({
    frequencia_dias: z.number().positive().optional(),
    proxima_manutencao: z.string().datetime().optional(),
    tempo_estimado_horas: z.number().positive().optional()
  }).optional(),
  configuracoes: z.record(z.any()).optional(),
  ativo: z.boolean().default(true)
});

// Schema de validação para BOM
const bomSchema = z.object({
  id: z.string().uuid().optional(),
  produto_id: z.string().uuid('ID do produto deve ser um UUID válido'),
  versao: z.string().min(1, 'Versão é obrigatória'),
  descricao: z.string().optional(),
  quantidade_base: z.number().positive('Quantidade base deve ser positiva'),
  unidade_medida: z.string().min(1, 'Unidade de medida é obrigatória'),
  tempo_producao_horas: z.number().min(0).default(0),
  tempo_setup_horas: z.number().min(0).default(0),
  data_validade_inicio: z.string().datetime(),
  data_validade_fim: z.string().datetime().optional(),
  status: z.enum(['rascunho', 'ativa', 'inativa', 'obsoleta']).default('rascunho'),
  tipo: z.enum(['producao', 'montagem', 'kit', 'fantasma']).default('producao'),
  centro_trabalho_padrao_id: z.string().uuid().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true)
});

// Schema de validação para Item do BOM
const bomItemSchema = z.object({
  id: z.string().uuid().optional(),
  bom_id: z.string().uuid('ID do BOM deve ser um UUID válido'),
  produto_id: z.string().uuid('ID do produto deve ser um UUID válido'),
  quantidade: z.number().positive('Quantidade deve ser positiva'),
  unidade_medida: z.string().min(1, 'Unidade de medida é obrigatória'),
  sequencia: z.number().positive().optional(),
  tipo_item: z.enum(['material', 'componente', 'ferramenta', 'consumivel']).default('material'),
  perda_percentual: z.number().min(0).max(100).default(0),
  centro_trabalho_id: z.string().uuid().optional(),
  operacao_id: z.string().uuid().optional(),
  posicao: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true)
});

// Schema de validação para Controle de Qualidade
const qualityControlSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  produto_id: z.string().uuid().optional(),
  operacao_id: z.string().uuid().optional(),
  tipo: z.enum(['recepcao', 'processo', 'final', 'expedicao']),
  metodo_inspecao: z.enum(['visual', 'dimensional', 'funcional', 'laboratorial']),
  frequencia: z.enum(['cada_lote', 'por_amostragem', 'periodica', 'aleatoria']),
  tamanho_amostra: z.number().positive().optional(),
  criterios_aceitacao: z.array(z.object({
    parametro: z.string(),
    valor_minimo: z.number().optional(),
    valor_maximo: z.number().optional(),
    valor_nominal: z.number().optional(),
    tolerancia: z.number().optional(),
    unidade: z.string().optional()
  })),
  procedimento: z.string().optional(),
  equipamentos: z.array(z.string()).optional(),
  tempo_inspecao_minutos: z.number().min(0).default(0),
  responsavel_id: z.string().uuid().optional(),
  ativo: z.boolean().default(true)
});

// Schema de validação para Inspeção de Qualidade
const qualityInspectionSchema = z.object({
  id: z.string().uuid().optional(),
  controle_qualidade_id: z.string().uuid('ID do controle é obrigatório'),
  ordem_producao_id: z.string().uuid().optional(),
  lote_numero: z.string().optional(),
  data_inspecao: z.string().datetime(),
  inspetor_id: z.string().uuid('ID do inspetor é obrigatório'),
  quantidade_inspecionada: z.number().positive('Quantidade deve ser positiva'),
  quantidade_aprovada: z.number().min(0),
  quantidade_rejeitada: z.number().min(0),
  resultado: z.enum(['aprovado', 'rejeitado', 'condicional']),
  medidas: z.array(z.object({
    parametro: z.string(),
    valor_medido: z.number(),
    resultado: z.enum(['conforme', 'nao_conforme']),
    observacoes: z.string().optional()
  })),
  nao_conformidades: z.array(z.object({
    descricao: z.string(),
    criticidade: z.enum(['baixa', 'media', 'alta', 'critica']),
    acao_corretiva: z.string().optional()
  })).optional(),
  observacoes: z.string().optional(),
  certificado_emitido: z.boolean().default(false)
});

// Schema de validação para Consumo de Materiais
const materialConsumptionSchema = z.object({
  id: z.string().uuid().optional(),
  ordem_producao_id: z.string().uuid('ID da ordem é obrigatório'),
  produto_id: z.string().uuid('ID do produto é obrigatório'),
  quantidade_consumida: z.number().positive('Quantidade deve ser positiva'),
  unidade_medida: z.string().min(1, 'Unidade é obrigatória'),
  lote_numero: z.string().optional(),
  data_consumo: z.string().datetime(),
  centro_trabalho_id: z.string().uuid().optional(),
  operacao_id: z.string().uuid().optional(),
  custo_unitario: z.number().min(0).default(0),
  tipo_consumo: z.enum(['normal', 'refugo', 'perda', 'retrabalho']).default('normal'),
  motivo_perda: z.string().optional(),
  responsavel_id: z.string().uuid().optional(),
  observacoes: z.string().optional()
});

// Schema de validação para Operação de Produção
const productionOperationSchema = z.object({
  id: z.string().uuid().optional(),
  bom_id: z.string().uuid('ID do BOM é obrigatório'),
  sequencia: z.number().positive('Sequência deve ser positiva'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  centro_trabalho_id: z.string().uuid('ID do centro de trabalho é obrigatório'),
  tempo_setup_minutos: z.number().min(0).default(0),
  tempo_execucao_minutos: z.number().min(0).default(0),
  tempo_por_peca_segundos: z.number().min(0).default(0),
  tipo_operacao: z.enum(['setup', 'producao', 'inspecao', 'movimentacao', 'espera']),
  ferramentas_necessarias: z.array(z.string()).optional(),
  habilidades_necessarias: z.array(z.string()).optional(),
  instrucoes_trabalho: z.string().optional(),
  controle_qualidade_id: z.string().uuid().optional(),
  ativo: z.boolean().default(true)
});

// Validações de negócio
class ValidationService {
  static validateProductionOrder(data) {
    const result = productionOrderSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Dados inválidos para ordem de produção: ${result.error.message}`);
    }
    
    // Validações de negócio
    const validData = result.data;
    
    if (validData.data_fim_planejada <= validData.data_inicio_planejada) {
      throw new Error('Data fim deve ser posterior à data início');
    }
    
    if (validData.quantidade_produzida > validData.quantidade_planejada) {
      throw new Error('Quantidade produzida não pode exceder a planejada');
    }
    
    return validData;
  }

  static validateWorkCenter(data) {
    const result = workCenterSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Dados inválidos para centro de trabalho: ${result.error.message}`);
    }
    
    const validData = result.data;
    
    if (validData.capacidade_horas_dia > 24) {
      throw new Error('Capacidade não pode exceder 24 horas por dia');
    }
    
    return validData;
  }

  static validateBOM(data) {
    const result = bomSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Dados inválidos para BOM: ${result.error.message}`);
    }
    
    const validData = result.data;
    
    if (validData.data_validade_fim && validData.data_validade_fim <= validData.data_validade_inicio) {
      throw new Error('Data fim de validade deve ser posterior ao início');
    }
    
    return validData;
  }

  static validateBOMItem(data) {
    const result = bomItemSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Dados inválidos para item do BOM: ${result.error.message}`);
    }
    
    return result.data;
  }

  static validateQualityControl(data) {
    const result = qualityControlSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Dados inválidos para controle de qualidade: ${result.error.message}`);
    }
    
    return result.data;
  }

  static validateQualityInspection(data) {
    const result = qualityInspectionSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Dados inválidos para inspeção: ${result.error.message}`);
    }
    
    const validData = result.data;
    
    if (validData.quantidade_aprovada + validData.quantidade_rejeitada > validData.quantidade_inspecionada) {
      throw new Error('Soma de aprovados e rejeitados não pode exceder quantidade inspecionada');
    }
    
    return validData;
  }

  static validateMaterialConsumption(data) {
    const result = materialConsumptionSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Dados inválidos para consumo de material: ${result.error.message}`);
    }
    
    return result.data;
  }

  static validateProductionOperation(data) {
    const result = productionOperationSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Dados inválidos para operação: ${result.error.message}`);
    }
    
    return result.data;
  }

  // Validações de relacionamentos
  static async validateProductExists(productId, knex) {
    const product = await knex('cad_04_produtos')
      .where({ id: productId, ativo: true })
      .first();
    
    if (!product) {
      throw new Error('Produto não encontrado ou inativo');
    }
    
    return product;
  }

  static async validateWorkCenterExists(workCenterId, knex) {
    const workCenter = await knex('prd_02_centros_trabalho')
      .where({ id: workCenterId, ativo: true })
      .first();
    
    if (!workCenter) {
      throw new Error('Centro de trabalho não encontrado ou inativo');
    }
    
    return workCenter;
  }

  static async validateBOMExists(bomId, knex) {
    const bom = await knex('prd_03_bom')
      .where({ id: bomId, ativo: true })
      .first();
    
    if (!bom) {
      throw new Error('BOM não encontrado ou inativo');
    }
    
    return bom;
  }

  static async validateMaterialAvailability(productId, quantity, knex) {
    const stock = await knex('est_01_estoque')
      .where({ produto_id: productId })
      .sum('quantidade_disponivel as total')
      .first();
    
    if (!stock || stock.total < quantity) {
      throw new Error('Estoque insuficiente para o material');
    }
    
    return true;
  }

  static async validateProductionCapacity(workCenterId, startDate, endDate, requiredHours, knex) {
    // Buscar capacidade do centro de trabalho
    const workCenter = await knex('prd_02_centros_trabalho')
      .where({ id: workCenterId })
      .first();
    
    if (!workCenter) {
      throw new Error('Centro de trabalho não encontrado');
    }
    
    // Calcular dias entre as datas
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    const totalCapacity = days * workCenter.capacidade_horas_dia;
    
    // Verificar ordens já programadas
    const usedCapacity = await knex('prd_01_ordens_producao')
      .join('prd_03_bom', 'prd_01_ordens_producao.bom_id', 'prd_03_bom.id')
      .where('prd_01_ordens_producao.centro_trabalho_id', workCenterId)
      .where('prd_01_ordens_producao.status', 'in', ['liberada', 'em_producao'])
      .whereBetween('prd_01_ordens_producao.data_inicio_planejada', [startDate, endDate])
      .sum('prd_03_bom.tempo_producao_horas as total')
      .first();
    
    const availableCapacity = totalCapacity - (usedCapacity.total || 0);
    
    if (availableCapacity < requiredHours) {
      throw new Error('Capacidade insuficiente no centro de trabalho para o período');
    }
    
    return true;
  }
}

module.exports = {
  ValidationService,
  productionOrderSchema,
  workCenterSchema,
  bomSchema,
  bomItemSchema,
  qualityControlSchema,
  qualityInspectionSchema,
  materialConsumptionSchema,
  productionOperationSchema
};