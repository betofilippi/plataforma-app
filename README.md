# 🚀 ERP NXT - Plataforma.app

Sistema ERP completo para **NXT Indústria e Comércio Ltda** com integração omnichannel e automação de processos empresariais.

## 📋 Visão Geral

O **plataforma.app** é um sistema ERP modular que centraliza:
- **18 tabelas de importação** para controle de processos internacionais
- **Integrações** com Mercado Livre, Instagram, Bling, Z-API e Make.com
- **Sistema de webhooks** centralizados
- **Interface moderna** em React/Next.js
- **Backend robusto** em Node.js/Express/TypeScript

## 🏗️ Arquitetura do Sistema

### **Stack Tecnológica**
- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + Next.js + TypeScript
- **Banco de Dados**: PostgreSQL + Supabase
- **Webhooks**: Sistema centralizado de comunicação
- **Integrações**: Mercado Livre, Instagram, Bling, Z-API, Make.com
- **Containerização**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

### **Módulos do ERP**

| Módulo | Descrição | Responsabilidade |
|--------|-----------|------------------|
| **CAD** | Cadastros | Clientes, fornecedores, produtos, leads |
| **CMP** | Compras | Ordens de compra, fornecedores |
| **EST** | Estoque | Controle de inventário, movimentações |
| **FIS** | Fiscal | Notas fiscais, tributos, compliance |
| **IMP** | Importação | Processo de importação, NCM, licensing |
| **LOC** | Localização | Endereços, regiões, estabelecimentos |
| **LOG** | Logística | Transportes, entregas, rastreamento |
| **PRD** | Produção | Manufatura, processos produtivos |
| **PRO** | Projetos | Gestão de projetos, cronogramas |
| **VND** | Vendas | Pedidos, vendas, faturamento |
| **WHK** | Webhooks | Comunicação centralizada |
| **SPT** | Suporte | Tickets, atendimento, CRM |

## 📁 Estrutura de Diretórios

```
plataforma.app/
├── 📁 backend/                     # API e serviços backend
│   ├── 📁 src/                     # Código fonte principal
│   ├── 📁 database/                # Migrações e schemas
│   ├── 📁 api/                     # Rotas e controllers
│   ├── 📁 services/                # Lógica de negócio
│   ├── 📁 middleware/              # Middlewares Express
│   ├── 📁 utils/                   # Utilitários backend
│   └── 📁 modules/                 # Módulos ERP
│       ├── 📁 cad/                 # Cadastros
│       ├── 📁 imp/                 # Importação
│       ├── 📁 vnd/                 # Vendas
│       └── ...                     # Outros módulos
├── 📁 frontend/                    # Interface React/Next.js
│   ├── 📁 src/                     # Código fonte frontend
│   ├── 📁 components/              # Componentes React
│   ├── 📁 pages/                   # Páginas Next.js
│   ├── 📁 hooks/                   # Custom hooks
│   └── 📁 stores/                  # Estado global
├── 📁 shared/                      # Código compartilhado
│   ├── 📁 types/                   # Definições TypeScript
│   ├── 📁 constants/               # Constantes globais
│   └── 📁 validations/             # Validações Zod
├── 📁 integrations/                # Integrações externas
│   ├── 📁 mercadolivre/            # APIs Mercado Livre
│   ├── 📁 instagram/               # Instagram Business
│   ├── 📁 bling/                   # Bling ERP
│   ├── 📁 zapi/                    # Z-API WhatsApp
│   └── 📁 make/                    # Make.com automations
├── 📁 docs/                        # Documentação
├── 📁 scripts/                     # Scripts utilitários
├── 📁 tests/                       # Testes automatizados
├── 📁 docker/                      # Containers Docker
├── 📁 monitoring/                  # Logs e monitoramento
└── 📁 deployment/                  # Deploy e CI/CD
```

## 🚀 Funcionalidades Principais

### **Sistema de Importação**
- ✅ Gestão completa do processo de importação
- ✅ Controle de licenças e documentação
- ✅ Tracking de containers e cargas
- ✅ Gestão de NCM e classificação fiscal
- ✅ Integração com despachantes e órgãos

### **ERP Corporativo**
- ✅ Gestão de clientes, fornecedores e produtos
- ✅ Controle de estoque e movimentações
- ✅ Emissão de notas fiscais (NF-e, NFC-e)
- ✅ Gestão de vendas e faturamento
- ✅ Controle de compras e fornecedores

### **CRM e Leads**
- ✅ Gestão de leads com pipeline de vendas
- ✅ Conversão automática lead → cliente
- ✅ Histórico completo de interações
- ✅ Classificação automática de clientes

### **Comunicação Omnichannel**
- ✅ WhatsApp Business (Z-API)
- ✅ Instagram Business
- ✅ Mercado Livre
- ✅ Email SMTP
- ✅ Sistema de tickets unificado

### **Integrações Externas**
- ✅ **Mercado Livre**: Produtos, pedidos, perguntas
- ✅ **Instagram**: DMs, comentários, posts
- ✅ **Bling ERP**: Sincronização de dados
- ✅ **Z-API**: WhatsApp Business
- ✅ **Make.com**: Automações avançadas

## 📊 Dashboard e Analytics

- 📈 **Dashboard Executivo**: KPIs em tempo real
- 📊 **Relatórios Financeiros**: Vendas, compras, margem
- 🎯 **Analytics de CRM**: Conversão de leads, pipeline
- 🔄 **Monitoramento de Integrações**: Status, webhooks
- 📦 **Tracking de Importações**: Status, prazos, custos

## 🔒 Segurança e Compliance

- 🔐 **Autenticação**: JWT + Supabase Auth
- 🛡️ **Autorização**: RBAC por módulos
- 🔒 **Criptografia**: Dados sensíveis protegidos
- 📝 **Auditoria**: Log completo de operações
- ⚖️ **Compliance**: NCM, tributos, legislação

## 🛠️ Configuração e Deploy

## 🚀 Início Rápido

### Pré-requisitos
- Docker e Docker Compose
- Node.js 18+ (para desenvolvimento local)
- Git

### 1. Clone e Configure
```bash
git clone <repository-url> plataforma.app
cd plataforma.app
make setup
```

### 2. Inicie o Ambiente
```bash
make dev
```

### 3. Acesse as URLs
- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:3000  
- **PgAdmin**: http://localhost:5050
- **Redis Commander**: http://localhost:8081

## 📦 Módulos Implementados

### 🎯 Módulo de Importação (IMP)
Sistema completo para gestão de processos de importação com 18 tabelas:

| Tabela | Descrição |
|--------|-----------|
| `imp_01_processos` | Processos de importação |
| `imp_02_fornecedores_internacionais` | Fornecedores externos |
| `imp_03_produtos_importados` | Catálogo de produtos |
| `imp_04_itens_processo` | Itens por processo |
| `imp_05_documentos` | Documentação |
| `imp_06_despachantes` | Gestão de despachantes |
| `imp_07_etapas_processo` | Controle de etapas |
| `imp_08_custos` | Controle de custos |
| `imp_09_impostos_taxas` | Impostos e taxas |
| `imp_10_licencas` | Licenças de importação |
| `imp_11_transporte` | Logística |
| `imp_12_armazenagem` | Armazenamento |
| `imp_13_cambio_pagamentos` | Câmbio e pagamentos |
| `imp_14_inspecoes` | Inspeções |
| `imp_15_drawback` | Regime de drawback |
| `imp_16_entregas` | Controle de entregas |
| `imp_17_follow_up` | Acompanhamento |
| `imp_18_historico_alteracoes` | Auditoria |

## 🔗 Integrações

### Marketplaces
- **Mercado Livre**: Gestão de anúncios, pedidos e estoque
- **Instagram Shopping**: Catálogo e vendas

### ERP Externo  
- **Bling**: Sincronização de produtos e vendas

### Comunicação
- **Z-API**: WhatsApp Business automatizado

### Automação
- **Make.com**: Workflows e integrações

### Banco de Dados
- **Supabase**: Backend-as-a-Service principal

## 🛠️ Comandos Disponíveis

```bash
# Desenvolvimento
make dev              # Inicia ambiente completo
make dev-backend      # Apenas backend
make stop             # Para serviços
make restart          # Reinicia tudo

# Banco de Dados
make db-setup         # Configuração inicial
make db-migrate       # Executa migrações
make db-seed          # Popula dados
make db-reset         # Reset completo (cuidado!)
make db-backup        # Backup

# Testes e Qualidade
make test             # Executa testes
make lint             # Linting
make format           # Formatação
make type-check       # Verificação TypeScript

# Docker
make docker-build     # Reconstrói imagens
make docker-clean     # Limpa Docker
make docker-status    # Status containers

# Utilitários
make logs             # Logs gerais
make status           # Status do sistema
make clean            # Limpa temporários
make help             # Lista comandos
```

## 📊 Progresso da Implementação

Acompanhe o progresso detalhado em: [`EVOLUCAO_IMPLEMENTACAO.md`](./EVOLUCAO_IMPLEMENTACAO.md)

**Status Atual:**
- ✅ **Fase 1**: 50% (Documentação + Schema de banco)
- 🔄 **Fase 2**: Iniciando (Backend APIs)
- ⏳ **Fase 3**: Pendente (Frontend)
- ⏳ **Fase 4**: Pendente (Integrações)
- ⏳ **Fase 5**: Pendente (Deploy)

## 📚 Documentação Adicional

- 📖 [Manual de Implementação por Fases](./docs/MANUAL_IMPLEMENTACAO_FASES.md)
- 🏗️ [Arquitetura de Comunicação Omnichannel](./docs/ARQUITETURA_COMUNICACAO_OMNICHANNEL.md)
- 🎯 [Sistema CRM e Leads](./docs/SISTEMA_CRM_LEADS_CLIENTES.md)
- 🔗 [Sistema de Webhooks Centralizados](./docs/SISTEMA_WEBHOOKS_CENTRALIZADOS.md)
- 🔐 [Configuração de Credenciais](./docs/CONFIGURACAO_CREDENCIAIS_INTEGRACOES.md)

## 🏢 Sobre a NXT Indústria e Comércio

Empresa especializada em **equipamentos de mobilidade elétrica**, atuando na importação, fabricação e comercialização de veículos elétricos inovadores para logística urbana e last-mile delivery.

## 📞 Suporte e Contato

- 📧 **Email**: suporte@nxt.com.br
- 💬 **WhatsApp**: +55 11 XXXX-XXXX
- 🌐 **Website**: https://nxt.com.br
- 📍 **Endereço**: São Paulo, SP - Brasil

---

**Versão**: 1.0  
**Data**: 2025-07-06  
**Deploy**: GitHub + Vercel  
**Repositório**: https://github.com/betofilippi/plataforma-app  
**URL Produção**: https://plataforma.app  
**Frontend Correto**: https://plataforma.app/frontend-correto.html  
**Licença**: Proprietário - NXT Indústria e Comércio Ltda

## 🚀 URLs de Acesso

- **Sistema Principal**: https://plataforma.app  
- **Frontend ERP**: https://plataforma.app/frontend-correto.html  
- **API Backend**: https://erp-api-clean-r88y1fdz9-nxt-9032fd74.vercel.app  
- **Login Demo**: admin@plataforma.app / admin123

✅ **Status**: Login funcionando - Erro "failed to fetch" resolvido!