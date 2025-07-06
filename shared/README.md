# Shared - Código Compartilhado

## 🎯 Visão Geral

Biblioteca de código compartilhado entre backend e frontend, incluindo definições TypeScript, validações Zod, constantes globais, utilitários comuns e tipos de dados unificados.

## 🏗️ Estrutura

```
shared/
├── 📁 types/                       # Definições TypeScript
│   ├── 📄 index.ts                 # Exports centralizados
│   ├── 📄 api.ts                   # Tipos de API
│   ├── 📄 auth.ts                  # Tipos de autenticação
│   ├── 📄 webhook.ts               # Tipos de webhooks
│   └── 📁 modules/                 # Tipos por módulo ERP
│       ├── 📄 cad.ts               # Cadastros
│       ├── 📄 imp.ts               # Importação
│       ├── 📄 vnd.ts               # Vendas
│       ├── 📄 whk.ts               # Webhooks
│       └── 📄 spt.ts               # Suporte
├── 📁 constants/                   # Constantes globais
│   ├── 📄 index.ts                 # Exports centralizados
│   ├── 📄 api.ts                   # URLs e endpoints
│   ├── 📄 modules.ts               # Constantes dos módulos
│   ├── 📄 status.ts                # Status padronizados
│   └── 📄 integrations.ts          # Constantes integrações
├── 📁 validations/                 # Validações Zod
│   ├── 📄 index.ts                 # Exports centralizados
│   ├── 📄 auth.ts                  # Validações auth
│   ├── 📄 common.ts                # Validações comuns
│   └── 📁 modules/                 # Validações por módulo
│       ├── 📄 cad.ts               # Cadastros
│       ├── 📄 imp.ts               # Importação
│       ├── 📄 vnd.ts               # Vendas
│       └── 📄 whk.ts               # Webhooks
├── 📁 utils/                       # Utilitários comuns
│   ├── 📄 index.ts                 # Exports centralizados
│   ├── 📄 formatters.ts            # Formatação de dados
│   ├── 📄 validators.ts            # Validadores customizados
│   ├── 📄 transformers.ts          # Transformação de dados
│   └── 📄 helpers.ts               # Funções auxiliares
└── 📁 interfaces/                  # Interfaces de integração
    ├── 📄 mercadolivre.ts          # Tipos Mercado Livre
    ├── 📄 instagram.ts             # Tipos Instagram
    ├── 📄 bling.ts                 # Tipos Bling
    ├── 📄 zapi.ts                  # Tipos Z-API
    └── 📄 make.ts                  # Tipos Make.com
```

## 🔧 Tecnologias Utilizadas

- **Linguagem**: TypeScript
- **Validação**: Zod
- **Build**: TypeScript Compiler (tsc)
- **Testes**: Jest
- **Linting**: ESLint + Prettier

## 📋 Tipos Principais

### **Tipos de API**
```typescript
// types/api.ts
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  field?: string
}
```

### **Tipos de Autenticação**
```typescript
// types/auth.ts
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  permissions: Permission[]
  lastLogin?: Date
  isActive: boolean
}

export interface Session {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  user: User
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER'

export interface Permission {
  module: ModuleCode
  actions: PermissionAction[]
}

export type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'MANAGE'
```

### **Tipos de Módulos ERP**
```typescript
// types/modules/cad.ts
export interface Cliente {
  id: number
  nome: string
  email?: string
  telefone?: string
  documento: string
  tipoDocumento: 'CPF' | 'CNPJ'
  endereco?: Endereco
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Lead {
  id: number
  nome: string
  email?: string
  telefone?: string
  origemLead: OrigemLead
  statusLead: StatusLead
  valorEstimado?: number
  observacoes?: string
  clienteConvertido?: boolean
  dataConversao?: Date
  createdAt: Date
  updatedAt: Date
}

export type OrigemLead = 
  | 'WEBSITE' 
  | 'MERCADOLIVRE' 
  | 'INSTAGRAM' 
  | 'WHATSAPP' 
  | 'TELEFONE' 
  | 'EMAIL'
  | 'INDICACAO'

export type StatusLead = 
  | 'NOVO' 
  | 'CONTATADO' 
  | 'QUALIFICADO' 
  | 'PROPOSTA' 
  | 'NEGOCIACAO' 
  | 'GANHO' 
  | 'PERDIDO'
```

### **Tipos de Webhooks**
```typescript
// types/webhook.ts
export interface WebhookPayload {
  id: string
  source: WebhookSource
  event: string
  timestamp: string
  data: Record<string, any>
  signature?: string
}

export type WebhookSource = 
  | 'MERCADOLIVRE' 
  | 'INSTAGRAM' 
  | 'BLING' 
  | 'ZAPI' 
  | 'MAKE'

export interface WebhookConfig {
  id: number
  plataforma: WebhookSource
  endpoint: string
  secret?: string
  events: string[]
  active: boolean
  retryConfig: {
    maxRetries: number
    backoffMs: number
  }
}

export interface WebhookLog {
  id: number
  webhookConfigId: number
  payload: WebhookPayload
  status: WebhookStatus
  processedAt?: Date
  errorMessage?: string
  retryCount: number
}

export type WebhookStatus = 
  | 'RECEIVED' 
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'RETRY'
```

## 🔍 Validações Zod

### **Validações Comuns**
```typescript
// validations/common.ts
export const emailSchema = z.string()
  .email('Email inválido')
  .toLowerCase()

export const phoneSchema = z.string()
  .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone inválido')

export const documentSchema = z.string()
  .refine(
    (doc) => isValidCPF(doc) || isValidCNPJ(doc),
    'CPF ou CNPJ inválido'
  )

export const cepSchema = z.string()
  .regex(/^\d{5}-?\d{3}$/, 'CEP inválido')
  .transform((cep) => cep.replace('-', ''))

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(25),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc')
})
```

### **Validações de Cadastros**
```typescript
// validations/modules/cad.ts
export const createClienteSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: emailSchema.optional(),
  telefone: phoneSchema.optional(),
  documento: documentSchema,
  endereco: z.object({
    logradouro: z.string().min(5, 'Logradouro obrigatório'),
    numero: z.string().min(1, 'Número obrigatório'),
    complemento: z.string().optional(),
    bairro: z.string().min(2, 'Bairro obrigatório'),
    cidade: z.string().min(2, 'Cidade obrigatória'),
    uf: z.string().length(2, 'UF deve ter 2 caracteres'),
    cep: cepSchema
  }).optional()
})

export const createLeadSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  email: emailSchema.optional(),
  telefone: phoneSchema.optional(),
  origemLead: z.enum([
    'WEBSITE', 'MERCADOLIVRE', 'INSTAGRAM', 
    'WHATSAPP', 'TELEFONE', 'EMAIL', 'INDICACAO'
  ]),
  valorEstimado: z.number().positive().optional(),
  observacoes: z.string().max(1000).optional()
})
```

### **Validações de Webhooks**
```typescript
// validations/modules/whk.ts
export const webhookPayloadSchema = z.object({
  id: z.string(),
  source: z.enum(['MERCADOLIVRE', 'INSTAGRAM', 'BLING', 'ZAPI', 'MAKE']),
  event: z.string().min(1),
  timestamp: z.string().datetime(),
  data: z.record(z.any()),
  signature: z.string().optional()
})

export const mercadoLivreWebhookSchema = z.object({
  resource: z.string(),
  user_id: z.number(),
  topic: z.string(),
  application_id: z.number(),
  attempts: z.number(),
  sent: z.string().datetime(),
  received: z.string().datetime().optional()
})

export const instagramWebhookSchema = z.object({
  object: z.literal('instagram'),
  entry: z.array(z.object({
    id: z.string(),
    time: z.number(),
    messaging: z.array(z.object({
      sender: z.object({
        id: z.string()
      }),
      recipient: z.object({
        id: z.string()
      }),
      timestamp: z.number(),
      message: z.object({
        mid: z.string(),
        text: z.string().optional()
      }).optional()
    })).optional()
  }))
})
```

## 🔧 Constantes Globais

### **Constantes de Módulos**
```typescript
// constants/modules.ts
export const MODULE_CODES = {
  CAD: 'CAD',
  CMP: 'CMP',
  EST: 'EST',
  FIS: 'FIS',
  IMP: 'IMP',
  LOC: 'LOC',
  LOG: 'LOG',
  PRD: 'PRD',
  PRO: 'PRO',
  VND: 'VND',
  WHK: 'WHK',
  SPT: 'SPT'
} as const

export const MODULE_NAMES = {
  [MODULE_CODES.CAD]: 'Cadastros',
  [MODULE_CODES.CMP]: 'Compras',
  [MODULE_CODES.EST]: 'Estoque',
  [MODULE_CODES.FIS]: 'Fiscal',
  [MODULE_CODES.IMP]: 'Importação',
  [MODULE_CODES.LOC]: 'Localização',
  [MODULE_CODES.LOG]: 'Logística',
  [MODULE_CODES.PRD]: 'Produção',
  [MODULE_CODES.PRO]: 'Projetos',
  [MODULE_CODES.VND]: 'Vendas',
  [MODULE_CODES.WHK]: 'Webhooks',
  [MODULE_CODES.SPT]: 'Suporte'
} as const

export type ModuleCode = keyof typeof MODULE_CODES
```

### **Constantes de Status**
```typescript
// constants/status.ts
export const LEAD_STATUS = {
  NOVO: 'NOVO',
  CONTATADO: 'CONTATADO',
  QUALIFICADO: 'QUALIFICADO',
  PROPOSTA: 'PROPOSTA',
  NEGOCIACAO: 'NEGOCIACAO',
  GANHO: 'GANHO',
  PERDIDO: 'PERDIDO'
} as const

export const TICKET_STATUS = {
  ABERTO: 'ABERTO',
  EM_ANDAMENTO: 'EM_ANDAMENTO',
  AGUARDANDO_CLIENTE: 'AGUARDANDO_CLIENTE',
  RESOLVIDO: 'RESOLVIDO',
  FECHADO: 'FECHADO'
} as const

export const WEBHOOK_STATUS = {
  RECEIVED: 'RECEIVED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  RETRY: 'RETRY'
} as const
```

### **Constantes de Integrações**
```typescript
// constants/integrations.ts
export const INTEGRATION_PLATFORMS = {
  MERCADOLIVRE: 'MERCADOLIVRE',
  INSTAGRAM: 'INSTAGRAM',
  BLING: 'BLING',
  ZAPI: 'ZAPI',
  MAKE: 'MAKE'
} as const

export const WEBHOOK_EVENTS = {
  MERCADOLIVRE: [
    'orders',
    'questions',
    'claims',
    'items',
    'payments'
  ],
  INSTAGRAM: [
    'messages',
    'comments',
    'mentions',
    'story_insights'
  ],
  BLING: [
    'invoice.created',
    'invoice.sent',
    'product.updated',
    'order.updated'
  ],
  ZAPI: [
    'message.received',
    'message.sent',
    'message.read',
    'group.created'
  ],
  MAKE: [
    'scenario.completed',
    'scenario.error',
    'data.processed'
  ]
} as const
```

## 🛠️ Utilitários Comuns

### **Formatadores**
```typescript
// utils/formatters.ts
export const formatCurrency = (
  value: number, 
  currency = 'BRL'
): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency
  }).format(value)
}

export const formatDate = (
  date: Date | string,
  format: 'short' | 'long' | 'datetime' = 'short'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const formats = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    long: { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    },
    datetime: { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  } as const
  
  return new Intl.DateTimeFormat('pt-BR', formats[format]).format(dateObj)
}

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }
  
  return phone
}

export const formatDocument = (document: string): string => {
  const cleaned = document.replace(/\D/g, '')
  
  if (cleaned.length === 11) {
    // CPF
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`
  } else if (cleaned.length === 14) {
    // CNPJ
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`
  }
  
  return document
}
```

### **Validadores Customizados**
```typescript
// utils/validators.ts
export const isValidCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, '')
  
  if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) {
    return false
  }
  
  // Algoritmo de validação do CPF
  const digits = cleaned.split('').map(Number)
  
  // Primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i)
  }
  let remainder = sum % 11
  const firstDigit = remainder < 2 ? 0 : 11 - remainder
  
  if (digits[9] !== firstDigit) return false
  
  // Segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i)
  }
  remainder = sum % 11
  const secondDigit = remainder < 2 ? 0 : 11 - remainder
  
  return digits[10] === secondDigit
}

export const isValidCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/\D/g, '')
  
  if (cleaned.length !== 14 || /^(\d)\1{13}$/.test(cleaned)) {
    return false
  }
  
  // Algoritmo de validação do CNPJ
  const digits = cleaned.split('').map(Number)
  
  // Primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * weights1[i]
  }
  let remainder = sum % 11
  const firstDigit = remainder < 2 ? 0 : 11 - remainder
  
  if (digits[12] !== firstDigit) return false
  
  // Segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += digits[i] * weights2[i]
  }
  remainder = sum % 11
  const secondDigit = remainder < 2 ? 0 : 11 - remainder
  
  return digits[13] === secondDigit
}

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
```

### **Transformadores de Dados**
```typescript
// utils/transformers.ts
export const transformApiResponse = <T>(
  response: any,
  transformer: (data: any) => T
): ApiResponse<T> => {
  try {
    return {
      success: true,
      data: transformer(response.data),
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      success: false,
      error: 'Erro ao transformar dados',
      timestamp: new Date().toISOString()
    }
  }
}

export const transformWebhookPayload = (
  rawPayload: any,
  source: WebhookSource
): WebhookPayload => {
  return {
    id: rawPayload.id || generateId(),
    source,
    event: rawPayload.event || rawPayload.topic || 'unknown',
    timestamp: rawPayload.timestamp || new Date().toISOString(),
    data: rawPayload,
    signature: rawPayload.signature
  }
}
```

## 📦 Build e Deploy

### **Configuração TypeScript**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

### **Scripts de Build**
```bash
# Build para produção
npm run build

# Build em modo watch
npm run build:watch

# Verificar tipos
npm run type-check

# Linting
npm run lint

# Testes
npm run test

# Publicar pacote
npm run publish
```

## 🧪 Testes

### **Testes de Validação**
```typescript
// __tests__/validations.test.ts
describe('Validações Comuns', () => {
  test('deve validar CPF correto', () => {
    expect(isValidCPF('123.456.789-09')).toBe(true)
    expect(isValidCPF('12345678909')).toBe(true)
  })
  
  test('deve rejeitar CPF inválido', () => {
    expect(isValidCPF('111.111.111-11')).toBe(false)
    expect(isValidCPF('123.456.789-00')).toBe(false)
  })
  
  test('deve validar email', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('invalid-email')).toBe(false)
  })
})
```

## 📚 Documentação Adicional

- 📝 [Type Definitions Guide](./docs/types.md)
- ✅ [Validation Patterns](./docs/validations.md)
- 🔧 [Utility Functions](./docs/utils.md)
- 📊 [Constants Reference](./docs/constants.md)

---

**Versão**: 1.0  
**Mantenedores**: Equipe Full Stack NXT  
**Última Atualização**: 2025-07-05