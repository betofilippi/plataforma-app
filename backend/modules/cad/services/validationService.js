const { z } = require('zod');

/**
 * Validation schemas for CAD module using Zod
 * Provides type-safe validation for clients, suppliers, and products
 */

// Common validation patterns
const phonePattern = /^[\+]?[1-9][\d]{0,15}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cnpjPattern = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const cpfPattern = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

// Client validation schema
const clientSchema = z.object({
  tipo_pessoa: z.enum(['F', 'J'], {
    errorMap: () => ({ message: 'Tipo de pessoa deve ser F (Física) ou J (Jurídica)' })
  }),
  cnpj_cpf: z.string()
    .min(11, 'CPF/CNPJ deve ter pelo menos 11 caracteres')
    .max(18, 'CPF/CNPJ deve ter no máximo 18 caracteres')
    .refine((val) => {
      // Remove formatting and check if it's valid CPF or CNPJ
      const cleaned = val.replace(/[^\d]/g, '');
      return cleaned.length === 11 || cleaned.length === 14;
    }, 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos'),
  nome_razao_social: z.string()
    .min(2, 'Nome/Razão Social deve ter pelo menos 2 caracteres')
    .max(100, 'Nome/Razão Social deve ter no máximo 100 caracteres'),
  nome_fantasia: z.string()
    .max(80, 'Nome Fantasia deve ter no máximo 80 caracteres')
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
    .regex(phonePattern, 'Telefone deve estar em formato válido')
    .optional()
    .nullable(),
  email: z.string()
    .email('Email deve ser um endereço válido')
    .max(100, 'Email deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  inscricao_estadual: z.string()
    .max(20, 'Inscrição Estadual deve ter no máximo 20 caracteres')
    .optional()
    .nullable(),
  inscricao_municipal: z.string()
    .max(20, 'Inscrição Municipal deve ter no máximo 20 caracteres')
    .optional()
    .nullable(),
  observacoes: z.string()
    .optional()
    .nullable(),
  ativo: z.boolean().default(true),
  data_nascimento: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional()
    .nullable(),
  renda_mensal: z.number()
    .min(0, 'Renda mensal não pode ser negativa')
    .optional()
    .nullable(),
  limite_credito: z.number()
    .min(0, 'Limite de crédito não pode ser negativo')
    .optional()
    .nullable(),
  classificacao_cliente: z.enum(['NOVO', 'BRONZE', 'PRATA', 'OURO', 'DIAMANTE'], {
    errorMap: () => ({ message: 'Classificação inválida' })
  }).default('NOVO'),
  total_compras: z.number()
    .min(0, 'Total de compras não pode ser negativo')
    .default(0),
  historico_compras: z.any().optional().nullable() // JSONB field
});

// Supplier validation schema
const supplierSchema = z.object({
  tipo_pessoa: z.enum(['F', 'J'], {
    errorMap: () => ({ message: 'Tipo de pessoa deve ser F (Física) ou J (Jurídica)' })
  }),
  cnpj_cpf: z.string()
    .min(11, 'CPF/CNPJ deve ter pelo menos 11 caracteres')
    .max(18, 'CPF/CNPJ deve ter no máximo 18 caracteres'),
  nome_razao_social: z.string()
    .min(2, 'Nome/Razão Social deve ter pelo menos 2 caracteres')
    .max(100, 'Nome/Razão Social deve ter no máximo 100 caracteres'),
  nome_fantasia: z.string()
    .max(80, 'Nome Fantasia deve ter no máximo 80 caracteres')
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
    .regex(phonePattern, 'Telefone deve estar em formato válido')
    .optional()
    .nullable(),
  email: z.string()
    .email('Email deve ser um endereço válido')
    .max(100, 'Email deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  inscricao_estadual: z.string()
    .max(20, 'Inscrição Estadual deve ter no máximo 20 caracteres')
    .optional()
    .nullable(),
  inscricao_municipal: z.string()
    .max(20, 'Inscrição Municipal deve ter no máximo 20 caracteres')
    .optional()
    .nullable(),
  observacoes: z.string()
    .optional()
    .nullable(),
  ativo: z.boolean().default(true),
  contato_principal: z.string()
    .max(100, 'Contato principal deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  telefone_contato: z.string()
    .regex(phonePattern, 'Telefone do contato deve estar em formato válido')
    .optional()
    .nullable(),
  email_contato: z.string()
    .email('Email do contato deve ser um endereço válido')
    .max(100, 'Email do contato deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  prazo_pagamento_padrao: z.number()
    .min(0, 'Prazo de pagamento não pode ser negativo')
    .optional()
    .nullable(),
  limite_credito: z.number()
    .min(0, 'Limite de crédito não pode ser negativo')
    .optional()
    .nullable(),
  condicoes_pagamento: z.string()
    .optional()
    .nullable(),
  banco: z.string()
    .max(100, 'Banco deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  agencia: z.string()
    .max(20, 'Agência deve ter no máximo 20 caracteres')
    .optional()
    .nullable(),
  conta_corrente: z.string()
    .max(30, 'Conta corrente deve ter no máximo 30 caracteres')
    .optional()
    .nullable(),
  tipo_fornecedor: z.enum(['MATERIA_PRIMA', 'SERVICOS', 'EQUIPAMENTOS', 'OUTROS'], {
    errorMap: () => ({ message: 'Tipo de fornecedor inválido' })
  }).default('OUTROS'),
  classificacao_fornecedor: z.enum(['A', 'B', 'C'], {
    errorMap: () => ({ message: 'Classificação deve ser A, B ou C' })
  }).default('C')
});

// Product validation schema
const productSchema = z.object({
  codigo_produto: z.string()
    .min(1, 'Código do produto é obrigatório')
    .max(50, 'Código do produto deve ter no máximo 50 caracteres'),
  codigo_barras: z.string()
    .max(20, 'Código de barras deve ter no máximo 20 caracteres')
    .optional()
    .nullable(),
  descricao: z.string()
    .min(2, 'Descrição deve ter pelo menos 2 caracteres')
    .max(200, 'Descrição deve ter no máximo 200 caracteres'),
  descricao_detalhada: z.string()
    .optional()
    .nullable(),
  marca: z.string()
    .max(50, 'Marca deve ter no máximo 50 caracteres')
    .optional()
    .nullable(),
  modelo: z.string()
    .max(50, 'Modelo deve ter no máximo 50 caracteres')
    .optional()
    .nullable(),
  categoria: z.string()
    .max(50, 'Categoria deve ter no máximo 50 caracteres')
    .optional()
    .nullable(),
  subcategoria: z.string()
    .max(50, 'Subcategoria deve ter no máximo 50 caracteres')
    .optional()
    .nullable(),
  unidade_medida: z.string()
    .max(10, 'Unidade de medida deve ter no máximo 10 caracteres')
    .default('UN'),
  peso_liquido: z.number()
    .min(0, 'Peso líquido não pode ser negativo')
    .optional()
    .nullable(),
  peso_bruto: z.number()
    .min(0, 'Peso bruto não pode ser negativo')
    .optional()
    .nullable(),
  volume_m3: z.number()
    .min(0, 'Volume não pode ser negativo')
    .optional()
    .nullable(),
  dimensoes: z.string()
    .max(50, 'Dimensões devem ter no máximo 50 caracteres')
    .optional()
    .nullable(),
  preco_custo: z.number()
    .min(0, 'Preço de custo não pode ser negativo')
    .optional()
    .nullable(),
  preco_venda: z.number()
    .min(0, 'Preço de venda não pode ser negativo')
    .optional()
    .nullable(),
  margem_lucro: z.number()
    .min(0, 'Margem de lucro não pode ser negativa')
    .max(100, 'Margem de lucro não pode ser maior que 100%')
    .optional()
    .nullable(),
  estoque_minimo: z.number()
    .min(0, 'Estoque mínimo não pode ser negativo')
    .default(0),
  estoque_maximo: z.number()
    .min(0, 'Estoque máximo não pode ser negativo')
    .optional()
    .nullable(),
  lead_time_dias: z.number()
    .min(0, 'Lead time não pode ser negativo')
    .optional()
    .nullable(),
  ativo: z.boolean().default(true),
  necessita_serial: z.boolean().default(false),
  controla_lote: z.boolean().default(false),
  perecivel: z.boolean().default(false),
  dias_validade: z.number()
    .min(0, 'Dias de validade não pode ser negativo')
    .optional()
    .nullable(),
  observacoes: z.string()
    .optional()
    .nullable(),
  aplicacao: z.string()
    .max(200, 'Aplicação deve ter no máximo 200 caracteres')
    .optional()
    .nullable(),
  origem: z.enum(['NACIONAL', 'IMPORTADO'], {
    errorMap: () => ({ message: 'Origem deve ser NACIONAL ou IMPORTADO' })
  }).default('NACIONAL'),
  tipo_produto: z.enum(['MATERIA_PRIMA', 'PRODUTO_ACABADO', 'COMPONENTE', 'SERVICO'], {
    errorMap: () => ({ message: 'Tipo de produto inválido' })
  }).default('PRODUTO_ACABADO')
});

// Update schemas (partial versions for PATCH operations)
const clientUpdateSchema = clientSchema.partial();
const supplierUpdateSchema = supplierSchema.partial();
const productUpdateSchema = productSchema.partial();

// Query parameter schemas
const querySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  search: z.string().optional(),
  ativo: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc')
});

// ID parameter schema
const idSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number)
});

module.exports = {
  clientSchema,
  supplierSchema,
  productSchema,
  clientUpdateSchema,
  supplierUpdateSchema,
  productUpdateSchema,
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