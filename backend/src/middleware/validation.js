const { z } = require('zod');
const { auditLogger } = require('../utils/auditLogger');

/**
 * Middleware para validação centralizada com Zod
 */
const validate = (schema, options = {}) => {
  const { 
    location = 'body', // 'body', 'query', 'params', 'headers'
    allowUnknown = false,
    logErrors = true 
  } = options;

  return async (req, res, next) => {
    try {
      const dataToValidate = req[location];

      // Aplicar schema de validação
      const result = schema.safeParse(dataToValidate);

      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: err.received
        }));

        if (logErrors) {
          await auditLogger.logWarning({
            event_type: 'VALIDATION_ERROR',
            user_id: req.user ? req.user.id : null,
            path: req.path,
            method: req.method,
            validation_location: location,
            errors: errors,
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
          });
        }

        return res.status(400).json({
          success: false,
          message: 'Dados inválidos fornecidos',
          errors: errors
        });
      }

      // Substituir dados originais pelos dados validados e sanitizados
      req[location] = result.data;
      next();

    } catch (error) {
      console.error('Erro no middleware de validação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor durante validação'
      });
    }
  };
};

/**
 * Schemas de validação comuns
 */
const commonSchemas = {
  // Validação de ID
  id: z.object({
    id: z.coerce.number().int().positive('ID deve ser um número positivo')
  }),

  // Validação de paginação
  pagination: z.object({
    page: z.coerce.number().int().min(1, 'Página deve ser pelo menos 1').default(1),
    limit: z.coerce.number().int().min(1, 'Limite deve ser pelo menos 1').max(100, 'Limite máximo é 100').default(20),
    order_by: z.string().optional(),
    order_direction: z.enum(['asc', 'desc']).default('asc')
  }),

  // Validação de usuário
  userCreate: z.object({
    email: z.string().email('Email inválido').toLowerCase(),
    password: z.string()
      .min(8, 'Senha deve ter pelo menos 8 caracteres')
      .regex(/(?=.*[a-z])/, 'Senha deve conter pelo menos uma letra minúscula')
      .regex(/(?=.*[A-Z])/, 'Senha deve conter pelo menos uma letra maiúscula')
      .regex(/(?=.*\d)/, 'Senha deve conter pelo menos um número')
      .regex(/(?=.*[@$!%*?&])/, 'Senha deve conter pelo menos um caractere especial'),
    first_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50),
    last_name: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres').max(50),
    role: z.enum(['admin', 'manager', 'user', 'viewer']).default('user'),
    status: z.enum(['active', 'inactive', 'suspended']).default('active')
  }),

  userUpdate: z.object({
    email: z.string().email('Email inválido').toLowerCase().optional(),
    first_name: z.string().min(2).max(50).optional(),
    last_name: z.string().min(2).max(50).optional(),
    role: z.enum(['admin', 'manager', 'user', 'viewer']).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    preferences: z.object({}).optional()
  }),

  // Validação de login
  login: z.object({
    email: z.string().email('Email inválido').toLowerCase(),
    password: z.string().min(1, 'Senha é obrigatória'),
    remember_me: z.boolean().default(false)
  }),

  // Validação de mudança de senha
  changePassword: z.object({
    current_password: z.string().min(1, 'Senha atual é obrigatória'),
    new_password: z.string()
      .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
      .regex(/(?=.*[a-z])/, 'Nova senha deve conter pelo menos uma letra minúscula')
      .regex(/(?=.*[A-Z])/, 'Nova senha deve conter pelo menos uma letra maiúscula')
      .regex(/(?=.*\d)/, 'Nova senha deve conter pelo menos um número')
      .regex(/(?=.*[@$!%*?&])/, 'Nova senha deve conter pelo menos um caractere especial'),
    confirm_password: z.string()
  }).refine(data => data.new_password === data.confirm_password, {
    message: 'Confirmação de senha não confere',
    path: ['confirm_password']
  }),

  // Validação de configurações do sistema
  systemConfig: z.object({
    key: z.string().min(1, 'Chave é obrigatória'),
    value: z.union([z.string(), z.number(), z.boolean(), z.object({})]),
    description: z.string().optional(),
    type: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
    is_public: z.boolean().default(false),
    is_encrypted: z.boolean().default(false)
  }),

  // Validação de webhook
  webhook: z.object({
    name: z.string().min(1, 'Nome é obrigatório').max(100),
    url: z.string().url('URL inválida'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
    headers: z.object({}).optional(),
    events: z.array(z.string()).min(1, 'Pelo menos um evento deve ser selecionado'),
    is_active: z.boolean().default(true),
    retry_attempts: z.number().int().min(0).max(10).default(3),
    timeout_ms: z.number().int().min(1000).max(30000).default(5000)
  }),

  // Validação de produto
  product: z.object({
    codigo: z.string().min(1, 'Código é obrigatório').max(50),
    nome: z.string().min(1, 'Nome é obrigatório').max(200),
    descricao: z.string().optional(),
    categoria_id: z.number().int().positive().optional(),
    preco_venda: z.number().positive('Preço de venda deve ser positivo').optional(),
    preco_custo: z.number().positive('Preço de custo deve ser positivo').optional(),
    unidade: z.string().max(10).optional(),
    peso: z.number().positive().optional(),
    dimensoes: z.object({
      altura: z.number().positive().optional(),
      largura: z.number().positive().optional(),
      profundidade: z.number().positive().optional()
    }).optional(),
    ativo: z.boolean().default(true)
  }),

  // Validação de cliente/fornecedor
  contact: z.object({
    tipo: z.enum(['cliente', 'fornecedor', 'ambos']),
    tipo_pessoa: z.enum(['fisica', 'juridica']),
    nome: z.string().min(1, 'Nome é obrigatório').max(200),
    email: z.string().email('Email inválido').optional(),
    telefone: z.string().optional(),
    documento: z.string().min(1, 'Documento é obrigatório'),
    endereco: z.object({
      logradouro: z.string().optional(),
      numero: z.string().optional(),
      complemento: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string().optional(),
      estado: z.string().optional(),
      cep: z.string().optional()
    }).optional(),
    ativo: z.boolean().default(true)
  }),

  // Validação de pedido de venda
  salesOrder: z.object({
    cliente_id: z.number().int().positive('Cliente é obrigatório'),
    data_pedido: z.string().datetime('Data do pedido inválida'),
    valor_total: z.number().positive('Valor total deve ser positivo'),
    status: z.enum(['pendente', 'confirmado', 'separando', 'faturado', 'entregue', 'cancelado']).default('pendente'),
    observacoes: z.string().optional(),
    items: z.array(z.object({
      produto_id: z.number().int().positive(),
      quantidade: z.number().positive('Quantidade deve ser positiva'),
      preco_unitario: z.number().positive('Preço unitário deve ser positivo'),
      desconto: z.number().min(0).optional()
    })).min(1, 'Pelo menos um item é obrigatório')
  })
};

/**
 * Validador personalizado para CPF
 */
const cpfValidator = z.string().refine((cpf) => {
  if (!cpf) return false;
  
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit1 = (sum * 10) % 11;
  if (digit1 === 10) digit1 = 0;
  
  if (parseInt(cleanCPF.charAt(9)) !== digit1) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  let digit2 = (sum * 10) % 11;
  if (digit2 === 10) digit2 = 0;
  
  return parseInt(cleanCPF.charAt(10)) === digit2;
}, 'CPF inválido');

/**
 * Validador personalizado para CNPJ
 */
const cnpjValidator = z.string().refine((cnpj) => {
  if (!cnpj) return false;
  
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  let weight = 2;
  
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  
  let digit1 = sum % 11;
  digit1 = digit1 < 2 ? 0 : 11 - digit1;
  
  if (parseInt(cleanCNPJ.charAt(12)) !== digit1) return false;
  
  sum = 0;
  weight = 2;
  
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  
  let digit2 = sum % 11;
  digit2 = digit2 < 2 ? 0 : 11 - digit2;
  
  return parseInt(cleanCNPJ.charAt(13)) === digit2;
}, 'CNPJ inválido');

/**
 * Middleware para sanitização de dados
 */
const sanitize = (options = {}) => {
  const { trimStrings = true, removeEmptyStrings = true } = options;

  return (req, res, next) => {
    const sanitizeObject = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }

      if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          let sanitizedValue = value;

          if (typeof value === 'string') {
            if (trimStrings) {
              sanitizedValue = value.trim();
            }
            if (removeEmptyStrings && sanitizedValue === '') {
              continue; // Pular strings vazias
            }
          } else if (typeof value === 'object' && value !== null) {
            sanitizedValue = sanitizeObject(value);
          }

          sanitized[key] = sanitizedValue;
        }
        return sanitized;
      }

      return obj;
    };

    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    next();
  };
};

module.exports = {
  validate,
  commonSchemas,
  cpfValidator,
  cnpjValidator,
  sanitize
};