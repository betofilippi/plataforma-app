const { z } = require('zod');

/**
 * Validation schemas for LOG module using Zod
 * Provides type-safe validation for transportation, routes, and carriers
 */

// Transportation validation schema
const transportationSchema = z.object({
  numero_envio: z.string()
    .min(1, 'Número do envio é obrigatório')
    .max(50, 'Número do envio deve ter no máximo 50 caracteres'),
  pedido_id: z.number()
    .int('ID do pedido deve ser um número inteiro')
    .positive('ID do pedido deve ser positivo')
    .optional()
    .nullable(),
  cliente_id: z.number()
    .int('ID do cliente deve ser um número inteiro')
    .positive('ID do cliente deve ser positivo'),
  transportadora_id: z.number()
    .int('ID da transportadora deve ser um número inteiro')
    .positive('ID da transportadora deve ser positivo'),
  origem_endereco: z.string()
    .min(5, 'Endereço de origem deve ter pelo menos 5 caracteres')
    .max(200, 'Endereço de origem deve ter no máximo 200 caracteres'),
  origem_cep: z.string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP de origem deve estar no formato 00000-000'),
  origem_cidade: z.string()
    .max(50, 'Cidade de origem deve ter no máximo 50 caracteres'),
  origem_uf: z.string()
    .length(2, 'UF de origem deve ter exatamente 2 caracteres'),
  destino_endereco: z.string()
    .min(5, 'Endereço de destino deve ter pelo menos 5 caracteres')
    .max(200, 'Endereço de destino deve ter no máximo 200 caracteres'),
  destino_cep: z.string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP de destino deve estar no formato 00000-000'),
  destino_cidade: z.string()
    .max(50, 'Cidade de destino deve ter no máximo 50 caracteres'),
  destino_uf: z.string()
    .length(2, 'UF de destino deve ter exatamente 2 caracteres'),
  destinatario_nome: z.string()
    .min(2, 'Nome do destinatário deve ter pelo menos 2 caracteres')
    .max(100, 'Nome do destinatário deve ter no máximo 100 caracteres'),
  destinatario_telefone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Telefone deve estar em formato válido')
    .optional()
    .nullable(),
  peso_kg: z.number()
    .min(0.001, 'Peso deve ser maior que zero')
    .max(50000, 'Peso não pode exceder 50.000 kg'),
  volume_m3: z.number()
    .min(0.001, 'Volume deve ser maior que zero')
    .max(1000, 'Volume não pode exceder 1.000 m³')
    .optional()
    .nullable(),
  valor_mercadoria: z.number()
    .min(0, 'Valor da mercadoria não pode ser negativo'),
  valor_frete: z.number()
    .min(0, 'Valor do frete não pode ser negativo'),
  valor_seguro: z.number()
    .min(0, 'Valor do seguro não pode ser negativo')
    .optional()
    .nullable(),
  prazo_entrega_dias: z.number()
    .int('Prazo de entrega deve ser um número inteiro')
    .min(1, 'Prazo de entrega deve ser pelo menos 1 dia'),
  data_coleta: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional()
    .nullable(),
  data_entrega_prevista: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  data_entrega_realizada: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional()
    .nullable(),
  status: z.enum(['PENDENTE', 'COLETADO', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADO', 'EXTRAVIADO'], {
    errorMap: () => ({ message: 'Status inválido' })
  }).default('PENDENTE'),
  codigo_rastreamento: z.string()
    .max(100, 'Código de rastreamento deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  observacoes: z.string()
    .optional()
    .nullable(),
  tipo_servico: z.enum(['NORMAL', 'EXPRESSO', 'ECONOMICO', 'ESPECIAL'], {
    errorMap: () => ({ message: 'Tipo de serviço inválido' })
  }).default('NORMAL'),
  requer_agendamento: z.boolean().default(false),
  possui_seguro: z.boolean().default(false),
  necessita_nf: z.boolean().default(true),
  localizacao_atual: z.string()
    .max(200, 'Localização atual deve ter no máximo 200 caracteres')
    .optional()
    .nullable(),
  historico_rastreamento: z.any().optional().nullable(), // JSONB field
  documentos_anexos: z.any().optional().nullable() // JSONB field
});

// Route validation schema
const routeSchema = z.object({
  codigo_rota: z.string()
    .min(1, 'Código da rota é obrigatório')
    .max(50, 'Código da rota deve ter no máximo 50 caracteres'),
  nome_rota: z.string()
    .min(2, 'Nome da rota deve ter pelo menos 2 caracteres')
    .max(100, 'Nome da rota deve ter no máximo 100 caracteres'),
  data_rota: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  veiculo_id: z.number()
    .int('ID do veículo deve ser um número inteiro')
    .positive('ID do veículo deve ser positivo')
    .optional()
    .nullable(),
  motorista_id: z.number()
    .int('ID do motorista deve ser um número inteiro')
    .positive('ID do motorista deve ser positivo')
    .optional()
    .nullable(),
  endereco_inicio: z.string()
    .min(5, 'Endereço de início deve ter pelo menos 5 caracteres')
    .max(200, 'Endereço de início deve ter no máximo 200 caracteres'),
  endereco_fim: z.string()
    .min(5, 'Endereço de fim deve ter pelo menos 5 caracteres')
    .max(200, 'Endereço de fim deve ter no máximo 200 caracteres'),
  distancia_total_km: z.number()
    .min(0, 'Distância não pode ser negativa')
    .optional()
    .nullable(),
  tempo_estimado_horas: z.number()
    .min(0, 'Tempo estimado não pode ser negativo')
    .optional()
    .nullable(),
  custo_combustivel: z.number()
    .min(0, 'Custo de combustível não pode ser negativo')
    .optional()
    .nullable(),
  custo_pedagio: z.number()
    .min(0, 'Custo de pedágio não pode ser negativo')
    .optional()
    .nullable(),
  custo_total: z.number()
    .min(0, 'Custo total não pode ser negativo')
    .optional()
    .nullable(),
  status: z.enum(['PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'], {
    errorMap: () => ({ message: 'Status inválido' })
  }).default('PLANEJADA'),
  hora_inicio: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM')
    .optional()
    .nullable(),
  hora_fim: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM')
    .optional()
    .nullable(),
  km_inicial: z.number()
    .min(0, 'KM inicial não pode ser negativo')
    .optional()
    .nullable(),
  km_final: z.number()
    .min(0, 'KM final não pode ser negativo')
    .optional()
    .nullable(),
  combustivel_inicial: z.number()
    .min(0, 'Combustível inicial não pode ser negativo')
    .max(100, 'Combustível inicial não pode exceder 100%')
    .optional()
    .nullable(),
  combustivel_final: z.number()
    .min(0, 'Combustível final não pode ser negativo')
    .max(100, 'Combustível final não pode exceder 100%')
    .optional()
    .nullable(),
  observacoes: z.string()
    .optional()
    .nullable(),
  pontos_entrega: z.any().optional().nullable(), // JSONB field with delivery points
  coordenadas_gps: z.any().optional().nullable(), // JSONB field with GPS coordinates
  otimizada: z.boolean().default(false),
  eficiencia_combustivel: z.number()
    .min(0, 'Eficiência de combustível não pode ser negativa')
    .optional()
    .nullable()
});

// Carrier validation schema
const carrierSchema = z.object({
  nome_transportadora: z.string()
    .min(2, 'Nome da transportadora deve ter pelo menos 2 caracteres')
    .max(100, 'Nome da transportadora deve ter no máximo 100 caracteres'),
  cnpj: z.string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato 00.000.000/0000-00'),
  inscricao_estadual: z.string()
    .max(20, 'Inscrição estadual deve ter no máximo 20 caracteres')
    .optional()
    .nullable(),
  endereco: z.string()
    .max(200, 'Endereço deve ter no máximo 200 caracteres')
    .optional()
    .nullable(),
  numero: z.string()
    .max(20, 'Número deve ter no máximo 20 caracteres')
    .optional()
    .nullable(),
  complemento: z.string()
    .max(50, 'Complemento deve ter no máximo 50 caracteres')
    .optional()
    .nullable(),
  bairro: z.string()
    .max(50, 'Bairro deve ter no máximo 50 caracteres')
    .optional()
    .nullable(),
  cidade: z.string()
    .max(50, 'Cidade deve ter no máximo 50 caracteres')
    .optional()
    .nullable(),
  uf: z.string()
    .length(2, 'UF deve ter exatamente 2 caracteres')
    .optional()
    .nullable(),
  cep: z.string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP deve estar no formato 00000-000')
    .optional()
    .nullable(),
  telefone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Telefone deve estar em formato válido')
    .optional()
    .nullable(),
  email: z.string()
    .email('Email deve ser um endereço válido')
    .max(100, 'Email deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  contato_principal: z.string()
    .max(100, 'Contato principal deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  telefone_contato: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Telefone do contato deve estar em formato válido')
    .optional()
    .nullable(),
  email_contato: z.string()
    .email('Email do contato deve ser um endereço válido')
    .max(100, 'Email do contato deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  tipo_transporte: z.enum(['RODOVIARIO', 'AEREO', 'MARITIMO', 'FERROVIARIO', 'MULTIMODAL'], {
    errorMap: () => ({ message: 'Tipo de transporte inválido' })
  }).default('RODOVIARIO'),
  abrangencia: z.enum(['LOCAL', 'REGIONAL', 'NACIONAL', 'INTERNACIONAL'], {
    errorMap: () => ({ message: 'Abrangência inválida' })
  }).default('REGIONAL'),
  ativo: z.boolean().default(true),
  prazo_pagamento_dias: z.number()
    .int('Prazo de pagamento deve ser um número inteiro')
    .min(0, 'Prazo de pagamento não pode ser negativo')
    .optional()
    .nullable(),
  limite_credito: z.number()
    .min(0, 'Limite de crédito não pode ser negativo')
    .optional()
    .nullable(),
  taxa_base_frete: z.number()
    .min(0, 'Taxa base de frete não pode ser negativa')
    .optional()
    .nullable(),
  taxa_por_kg: z.number()
    .min(0, 'Taxa por kg não pode ser negativa')
    .optional()
    .nullable(),
  taxa_por_km: z.number()
    .min(0, 'Taxa por km não pode ser negativa')
    .optional()
    .nullable(),
  desconto_volume: z.number()
    .min(0, 'Desconto por volume não pode ser negativo')
    .max(100, 'Desconto não pode exceder 100%')
    .optional()
    .nullable(),
  observacoes: z.string()
    .optional()
    .nullable(),
  classificacao: z.enum(['A', 'B', 'C'], {
    errorMap: () => ({ message: 'Classificação deve ser A, B ou C' })
  }).default('C'),
  possui_rastreamento: z.boolean().default(false),
  possui_seguro: z.boolean().default(false),
  tempo_medio_entrega: z.number()
    .min(0, 'Tempo médio de entrega não pode ser negativo')
    .optional()
    .nullable(),
  taxa_sucesso_entrega: z.number()
    .min(0, 'Taxa de sucesso não pode ser negativa')
    .max(100, 'Taxa de sucesso não pode exceder 100%')
    .optional()
    .nullable(),
  servicos_oferecidos: z.any().optional().nullable(), // JSONB field
  regioes_atendimento: z.any().optional().nullable(), // JSONB field
  documentos_habilitacao: z.any().optional().nullable() // JSONB field
});

// Delivery tracking schema
const deliveryTrackingSchema = z.object({
  envio_id: z.number()
    .int('ID do envio deve ser um número inteiro')
    .positive('ID do envio deve ser positivo'),
  data_evento: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  hora_evento: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM'),
  status_evento: z.enum([
    'COLETADO', 'SAIU_ORIGEM', 'EM_TRANSITO', 'CHEGOU_DESTINO', 
    'ENTREGUE', 'TENTATIVA_ENTREGA', 'CANCELADO', 'EXTRAVIADO'
  ], {
    errorMap: () => ({ message: 'Status do evento inválido' })
  }),
  localizacao: z.string()
    .max(200, 'Localização deve ter no máximo 200 caracteres'),
  descricao_evento: z.string()
    .max(500, 'Descrição do evento deve ter no máximo 500 caracteres')
    .optional()
    .nullable(),
  responsavel: z.string()
    .max(100, 'Responsável deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  coordenadas_lat: z.number()
    .min(-90, 'Latitude deve estar entre -90 e 90')
    .max(90, 'Latitude deve estar entre -90 e 90')
    .optional()
    .nullable(),
  coordenadas_lng: z.number()
    .min(-180, 'Longitude deve estar entre -180 e 180')
    .max(180, 'Longitude deve estar entre -180 e 180')
    .optional()
    .nullable(),
  observacoes: z.string()
    .optional()
    .nullable()
});

// Update schemas (partial versions)
const transportationUpdateSchema = transportationSchema.partial();
const routeUpdateSchema = routeSchema.partial();
const carrierUpdateSchema = carrierSchema.partial();
const deliveryTrackingUpdateSchema = deliveryTrackingSchema.partial();

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
  transportationSchema,
  routeSchema,
  carrierSchema,
  deliveryTrackingSchema,
  transportationUpdateSchema,
  routeUpdateSchema,
  carrierUpdateSchema,
  deliveryTrackingUpdateSchema,
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
