# Backend - Plataforma ERP NXT

## 🎯 Visão Geral

Backend Node.js + Express + TypeScript que implementa toda a lógica de negócio do ERP integrado, APIs REST, processamento de webhooks e integrações com sistemas externos.

## 🏗️ Arquitetura

```
backend/
├── 📁 src/                         # Código fonte principal
│   ├── 📄 app.ts                   # Configuração Express
│   ├── 📄 server.ts                # Inicialização do servidor
│   └── 📄 index.ts                 # Entry point
├── 📁 database/                    # Banco de dados
│   ├── 📁 migrations/              # Migrações SQL
│   ├── 📁 seeds/                   # Dados iniciais
│   └── 📄 connection.ts            # Conexão Supabase
├── 📁 api/                         # Rotas e Controllers
│   ├── 📁 routes/                  # Definições de rotas
│   ├── 📁 controllers/             # Lógica dos endpoints
│   └── 📁 validators/              # Validação de entrada
├── 📁 services/                    # Lógica de negócio
│   ├── 📁 integrations/            # Serviços de integração
│   ├── 📁 notifications/           # Sistema de notificações
│   └── 📁 webhooks/                # Processamento webhooks
├── 📁 middleware/                  # Middlewares Express
│   ├── 📄 auth.ts                  # Autenticação JWT
│   ├── 📄 cors.ts                  # CORS configuration
│   ├── 📄 rateLimit.ts             # Rate limiting
│   └── 📄 errorHandler.ts          # Tratamento de erros
├── 📁 utils/                       # Utilitários
│   ├── 📄 logger.ts                # Sistema de logs
│   ├── 📄 encryption.ts            # Criptografia
│   └── 📄 constants.ts             # Constantes backend
└── 📁 modules/                     # Módulos ERP organizados
    ├── 📁 cad/                     # Cadastros
    ├── 📁 cmp/                     # Compras  
    ├── 📁 est/                     # Estoque
    ├── 📁 fis/                     # Fiscal
    ├── 📁 imp/                     # Importação
    ├── 📁 loc/                     # Localização
    ├── 📁 log/                     # Logística
    ├── 📁 prd/                     # Produção
    ├── 📁 pro/                     # Projetos
    ├── 📁 vnd/                     # Vendas
    ├── 📁 whk/                     # Webhooks
    └── 📁 spt/                     # Suporte
```

## 🔧 Tecnologias Utilizadas

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Linguagem**: TypeScript
- **Banco de Dados**: PostgreSQL + Supabase
- **ORM**: Supabase Client
- **Validação**: Zod
- **Autenticação**: JWT + Supabase Auth
- **Logs**: Winston
- **Testes**: Jest + Supertest
- **Cache**: Redis (opcional)

## 📋 Módulos ERP

### **CAD - Cadastros**
- Clientes, fornecedores, produtos
- Leads e conversão automática
- Contatos e relacionamentos

### **IMP - Importação**
- Processo completo de importação
- NCM, licenças, documentação
- Tracking de containers

### **VND - Vendas**
- Pedidos e faturamento
- Integração com marketplaces
- Pipeline de vendas

### **WHK - Webhooks**
- Sistema centralizado
- Processamento inteligente
- Roteamento automático

### **SPT - Suporte**
- Sistema de tickets
- Atendimento omnichannel
- SLA e escalação

*[Outros módulos seguem padrão similar]*

## 🚀 Configuração e Uso

### **Instalação**
```bash
cd backend
npm install
```

### **Configuração**
```bash
# Copiar exemplo de configuração
cp .env.example .env

# Editar variáveis necessárias
nano .env
```

### **Desenvolvimento**
```bash
# Modo desenvolvimento
npm run dev

# Build TypeScript
npm run build

# Executar em produção
npm start
```

### **Testes**
```bash
# Executar todos os testes
npm test

# Testes com coverage
npm run test:coverage

# Testes específicos
npm test -- --grep "CAD module"
```

## 📡 APIs Principais

### **Endpoints de Cadastros**
```
GET    /api/cad/clientes           # Listar clientes
POST   /api/cad/clientes           # Criar cliente
PUT    /api/cad/clientes/:id       # Atualizar cliente
DELETE /api/cad/clientes/:id       # Deletar cliente
```

### **Endpoints de Importação**
```
GET    /api/imp/processos          # Listar processos
POST   /api/imp/processos          # Criar processo
GET    /api/imp/tracking/:id       # Rastrear processo
```

### **Endpoints de Webhooks**
```
POST   /api/webhooks/mercadolivre  # Webhook ML
POST   /api/webhooks/instagram     # Webhook Instagram
POST   /api/webhooks/zapi          # Webhook WhatsApp
POST   /api/webhooks/bling         # Webhook Bling
```

## 🔒 Segurança

### **Autenticação**
- JWT tokens via Supabase Auth
- Refresh token automático
- Rate limiting por IP

### **Autorização**
- RBAC baseado em módulos
- Permissões granulares
- Middleware de autorização

### **Validação**
- Zod schemas para entrada
- Sanitização de dados
- Validação de tipos TypeScript

## 📊 Monitoramento

### **Logs**
- Winston para logging estruturado
- Rotação automática de arquivos
- Níveis: error, warn, info, debug

### **Métricas**
- Tempo de resposta de APIs
- Taxa de erro por endpoint
- Uso de recursos do sistema

### **Health Checks**
```
GET /health                       # Status geral
GET /health/database             # Status banco
GET /health/integrations         # Status integrações
```

## 🔧 Scripts Utilitários

```bash
# Executar migrações
npm run db:migrate

# Executar seeds
npm run db:seed

# Backup do banco
npm run db:backup

# Limpar logs antigos
npm run logs:clean

# Reprocessar webhooks com erro
npm run webhooks:retry
```

## 🐛 Debug e Troubleshooting

### **Logs de Debug**
```bash
# Habilitar logs detalhados
DEBUG=app:* npm run dev

# Logs específicos de módulo
DEBUG=app:cad,app:imp npm run dev
```

### **Problemas Comuns**
- Conexão com banco: Verificar `DATABASE_URL`
- Webhooks falham: Verificar secrets e IPs
- Rate limiting: Ajustar limites em `.env`

## 📚 Documentação Adicional

- 🔗 [API Documentation](./docs/api.md)
- 🗃️ [Database Schema](./docs/database.md)
- 🔌 [Webhook Integration Guide](./docs/webhooks.md)
- 🔐 [Security Guidelines](./docs/security.md)

---

**Versão**: 1.0  
**Mantenedores**: Equipe NXT  
**Última Atualização**: 2025-07-05