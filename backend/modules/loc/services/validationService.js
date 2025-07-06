const { z } = require('zod');

/**
 * Validation schemas for LOC module using Zod
 * Provides type-safe validation for rental contracts and equipment
 */

// Rental Contract validation schema
const rentalContractSchema = z.object({
  numero_contrato: z.string()
    .min(1, 'Número do contrato é obrigatório')
    .max(50, 'Número do contrato deve ter no máximo 50 caracteres'),
  cliente_id: z.number()
    .int('ID do cliente deve ser um número inteiro')
    .positive('ID do cliente deve ser positivo'),
  equipamento_id: z.number()
    .int('ID do equipamento deve ser um número inteiro')
    .positive('ID do equipamento deve ser positivo'),
  data_inicio: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  data_fim: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  valor_diario: z.number()
    .min(0, 'Valor diário não pode ser negativo'),
  valor_mensal: z.number()
    .min(0, 'Valor mensal não pode ser negativo')
    .optional()
    .nullable(),
  valor_total: z.number()
    .min(0, 'Valor total não pode ser negativo'),
  forma_pagamento: z.enum(['DINHEIRO', 'CARTAO', 'PIX', 'BOLETO', 'TRANSFERENCIA'], {
    errorMap: () => ({ message: 'Forma de pagamento inválida' })
  }).default('BOLETO'),
  condicoes_pagamento: z.string()
    .max(200, 'Condições de pagamento devem ter no máximo 200 caracteres')
    .optional()
    .nullable(),
  observacoes: z.string()
    .optional()
    .nullable(),
  status: z.enum(['ATIVO', 'SUSPENSO', 'FINALIZADO', 'CANCELADO'], {
    errorMap: () => ({ message: 'Status inválido' })
  }).default('ATIVO'),
  clausulas_especiais: z.string()
    .optional()
    .nullable(),
  valor_multa_rescisao: z.number()
    .min(0, 'Valor da multa não pode ser negativo')
    .optional()
    .nullable(),
  permite_renovacao: z.boolean().default(true),
  auto_renovacao: z.boolean().default(false),
  prazo_renovacao_dias: z.number()
    .int('Prazo de renovação deve ser um número inteiro')
    .min(1, 'Prazo de renovação deve ser pelo menos 1 dia')
    .optional()
    .nullable(),
  responsavel_locacao: z.string()
    .max(100, 'Responsável pela locação deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  local_entrega: z.string()
    .max(200, 'Local de entrega deve ter no máximo 200 caracteres')
    .optional()
    .nullable(),
  local_devolucao: z.string()
    .max(200, 'Local de devolução deve ter no máximo 200 caracteres')
    .optional()
    .nullable(),
  taxa_entrega: z.number()
    .min(0, 'Taxa de entrega não pode ser negativa')
    .optional()
    .nullable(),
  taxa_devolucao: z.number()
    .min(0, 'Taxa de devolução não pode ser negativa')
    .optional()
    .nullable(),
  requer_caucao: z.boolean().default(false),
  valor_caucao: z.number()
    .min(0, 'Valor da caução não pode ser negativo')
    .optional()
    .nullable(),
  status_caucao: z.enum(['PENDENTE', 'PAGO', 'DEVOLVIDO'], {
    errorMap: () => ({ message: 'Status da caução inválido' })
  }).optional().nullable()
});

// Equipment validation schema
const equipmentSchema = z.object({
  codigo_equipamento: z.string()
    .min(1, 'Código do equipamento é obrigatório')
    .max(50, 'Código do equipamento deve ter no máximo 50 caracteres'),
  nome_equipamento: z.string()
    .min(2, 'Nome do equipamento deve ter pelo menos 2 caracteres')
    .max(100, 'Nome do equipamento deve ter no máximo 100 caracteres'),
  descricao: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional()
    .nullable(),
  tipo_equipamento: z.enum(['MAQUINAS', 'FERRAMENTAS', 'VEICULOS', 'EQUIPAMENTOS_TI', 'MOVEIS', 'OUTROS'], {
    errorMap: () => ({ message: 'Tipo de equipamento inválido' })
  }).default('OUTROS'),
  marca: z.string()
    .max(50, 'Marca deve ter no máximo 50 caracteres')
    .optional()
    .nullable(),
  modelo: z.string()
    .max(50, 'Modelo deve ter no máximo 50 caracteres')
    .optional()
    .nullable(),
  numero_serie: z.string()
    .max(100, 'Número de série deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  ano_fabricacao: z.number()
    .int('Ano de fabricação deve ser um número inteiro')
    .min(1900, 'Ano de fabricação deve ser a partir de 1900')
    .max(new Date().getFullYear() + 1, 'Ano de fabricação não pode ser futuro')
    .optional()
    .nullable(),
  valor_aquisicao: z.number()
    .min(0, 'Valor de aquisição não pode ser negativo')
    .optional()
    .nullable(),
  valor_locacao_diaria: z.number()
    .min(0, 'Valor de locação diária não pode ser negativo'),
  valor_locacao_mensal: z.number()
    .min(0, 'Valor de locação mensal não pode ser negativo')
    .optional()
    .nullable(),
  status: z.enum(['DISPONIVEL', 'LOCADO', 'MANUTENCAO', 'INDISPONIVEL'], {
    errorMap: () => ({ message: 'Status inválido' })
  }).default('DISPONIVEL'),
  condicao: z.enum(['NOVO', 'SEMINOVO', 'USADO', 'DANIFICADO'], {
    errorMap: () => ({ message: 'Condição inválida' })
  }).default('USADO'),
  localizacao_atual: z.string()
    .max(200, 'Localização atual deve ter no máximo 200 caracteres')
    .optional()
    .nullable(),
  responsavel_equipamento: z.string()
    .max(100, 'Responsável pelo equipamento deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  data_ultima_manutencao: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional()
    .nullable(),
  proxima_manutencao: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional()
    .nullable(),
  intervalo_manutencao_dias: z.number()
    .int('Intervalo de manutenção deve ser um número inteiro')
    .min(1, 'Intervalo de manutenção deve ser pelo menos 1 dia')
    .optional()
    .nullable(),
  observacoes: z.string()
    .optional()
    .nullable(),
  ativo: z.boolean().default(true),
  requer_operador_especializado: z.boolean().default(false),
  peso_kg: z.number()
    .min(0, 'Peso não pode ser negativo')
    .optional()
    .nullable(),
  dimensoes: z.string()
    .max(100, 'Dimensões devem ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  especificacoes_tecnicas: z.any().optional().nullable(), // JSONB field
  documentos_relacionados: z.any().optional().nullable(), // JSONB field
  fotos_equipamento: z.any().optional().nullable() // JSONB field
});

// Maintenance validation schema
const maintenanceSchema = z.object({
  equipamento_id: z.number()
    .int('ID do equipamento deve ser um número inteiro')
    .positive('ID do equipamento deve ser positivo'),
  tipo_manutencao: z.enum(['PREVENTIVA', 'CORRETIVA', 'EMERGENCIAL'], {
    errorMap: () => ({ message: 'Tipo de manutenção inválido' })
  }),
  data_agendada: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  data_realizada: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional()
    .nullable(),
  descricao_servico: z.string()
    .min(5, 'Descrição do serviço deve ter pelo menos 5 caracteres')
    .max(500, 'Descrição do serviço deve ter no máximo 500 caracteres'),
  tecnico_responsavel: z.string()
    .max(100, 'Técnico responsável deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  empresa_manutencao: z.string()
    .max(100, 'Empresa de manutenção deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  custo_manutencao: z.number()
    .min(0, 'Custo de manutenção não pode ser negativo')
    .optional()
    .nullable(),
  status: z.enum(['AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'], {
    errorMap: () => ({ message: 'Status inválido' })
  }).default('AGENDADA'),
  observacoes: z.string()
    .optional()
    .nullable(),
  pecas_substituidas: z.any().optional().nullable(), // JSONB field
  tempo_parada_horas: z.number()
    .min(0, 'Tempo de parada não pode ser negativo')
    .optional()
    .nullable()
});

// Update schemas (partial versions)
const rentalContractUpdateSchema = rentalContractSchema.partial();
const equipmentUpdateSchema = equipmentSchema.partial();
const maintenanceUpdateSchema = maintenanceSchema.partial();

// Query parameter schemas
const querySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  search: z.string().optional(),
  status: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc')
});

// ID parameter schema
const idSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number)
});

module.exports = {
  rentalContractSchema,
  equipmentSchema,
  maintenanceSchema,
  rentalContractUpdateSchema,
  equipmentUpdateSchema,
  maintenanceUpdateSchema,
  querySchema,
  idSchema,
  
  // Validation middleware factory
  validate: (schema) => (req, res, next) => {
    try {
      const result = schema.parse(req.body);
      req.validatedData = result;
      next();
    } catch (error) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return res.status(400).json({
        error: 'Dados inválidos',
        details: errors,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Query validation middleware
  validateQuery: (req, res, next) => {
    try {
      const result = querySchema.parse(req.query);
      req.validatedQuery = result;
      next();
    } catch (error) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return res.status(400).json({
        error: 'Parâmetros de consulta inválidos',
        details: errors,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // ID validation middleware
  validateId: (req, res, next) => {
    try {
      const result = idSchema.parse(req.params);
      req.validatedParams = result;
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número válido',
        timestamp: new Date().toISOString()
      });
    }
  }
};
