# Projeto ERP Integrado - NXT Indústria e Comércio Ltda

## 📋 Visão Geral Executiva

### Empresa
**NXT Indústria e Comércio Ltda** - Manufatura de equipamentos de mobilidade elétrica (autopropelidos)

### Objetivo do Projeto
Implementar um sistema ERP completo integrado com o processo de importação existente, preservando a integridade das operações Make.com e criando uma solução robusta para controle de manufatura, estoque, vendas e relacionamento com clientes.

### Desafio Principal
Integrar 18 tabelas de importação (importacao_) com um sistema ERP de 46 tabelas distribuídas em 10 módulos, mantendo a compatibilidade com o blueprint Make.com de 26.358 linhas que não pode ser alterado.

---

## 🎯 Objetivos Específicos

### 1. **Preservação Total**
- Manter 18 tabelas importacao_ intactas
- Preservar blueprint Make.com sem alterações
- Garantir continuidade das operações de importação

### 2. **Integração Inteligente**
- Criar ponte entre processos de importação e ERP
- Estabelecer fluxo: Importação → Produtos → Estoque → Produção → Vendas
- Sincronização automática de dados

### 3. **Sistema CRM Expandido**
- Cadastro de leads com origem e conversão
- Histórico completo de compras dos clientes
- Rastreamento de notas fiscais por cliente

### 4. **Controle de Manufatura**
- BOM (Bill of Materials) para montagem
- Controle de ordens de produção
- Gestão de insumos e produtos acabados

---

## 🏗️ Arquitetura do Sistema

### Núcleo Central: Importação
```
importacao_01_1_proforma_invoice (Tabela Principal)
├── 17 tabelas dependentes com CASCADE delete
└── Processo completo: Proforma → Commercial → Packing → BL → DI → NF → Fechamento
```

### Módulos ERP Integrados (10 módulos - 46 tabelas)

#### **CRÍTICOS** - Fase 1 (30 dias)
1. **📋 CAD** - Cadastros Básicos (5 tabelas + 2 extensões CRM)
2. **📦 EST** - Estoque (4 tabelas)
3. **🏭 PRD** - Produtos (4 tabelas)

#### **ESSENCIAIS** - Fase 2 (30 dias)
4. **🔧 PRO** - Produção (3 tabelas)
5. **💰 VND** - Vendas (3 tabelas)

#### **IMPORTANTES** - Fase 3 (30 dias)
6. **🛒 CMP** - Compras (3 tabelas)
7. **📄 FIS** - Fiscal (3 tabelas)

#### **COMPLEMENTARES** - Fase 4 (15 dias)
8. **🚚 LOG** - Logística (2 tabelas)
9. **📍 LOC** - Localização (4 tabelas)

#### **INTEGRAÇÃO FINAL** - Fase 5 (15 dias)
10. **🌍 IMP** - Integração Importação (18 tabelas existentes)

---

## 📊 Análise de Campos Críticos

### Produtos (prd_03_produtos)
```sql
-- Campos essenciais para manufatura de equipamentos elétricos
peso_liquido        numeric(15,3)  -- Peso líquido unitário
peso_bruto          numeric(15,3)  -- Peso bruto unitário  
volume_m3           numeric(15,3)  -- Volume unitário em m³
preco_custo         numeric(15,2)  -- Preço de custo
preco_venda         numeric(15,2)  -- Preço de venda
estoque_minimo      numeric(15,2)  -- Estoque mínimo
estoque_maximo      numeric(15,2)  -- Estoque máximo
lead_time_dias      integer        -- Lead time em dias
```

### Composição de Produtos (prd_04_composicao_produtos)
```sql
-- BOM - Bill of Materials para montagem
id_produto_pai      integer  -- Produto principal (equipamento)
id_produto_filho    integer  -- Componente/insumo
quantidade          numeric  -- Quantidade necessária
perda_processo      numeric  -- % de perda no processo
```

### Ordens de Produção (pro_05_ordens_producao)
```sql
-- Controle de manufatura
numero_ordem             varchar(20)  -- Número único da ordem
data_inicio_prevista     date         -- Data prevista início
data_fim_prevista        date         -- Data prevista fim
quantidade_planejada     numeric      -- Quantidade a produzir
quantidade_produzida     numeric      -- Quantidade efetivamente produzida
id_deposito_origem       integer      -- Depósito de insumos
id_deposito_destino      integer      -- Depósito de produtos acabados
```

---

## 🔄 Fluxo de Processos

### 1. **Processo de Importação** (Existente - Preservado)
```
Proforma Invoice → Pagamento Câmbio → Contrato Câmbio → SWIFT → 
Commercial Invoice → Packing List → Bill of Lading → 
DI (Declaração) → Nota Fiscal → Fechamento
```

### 2. **Criação de Produtos** (Novo - Integrado)
```
Mercadoria Chegada + Alfândega OK → 
Criação Automática em prd_03_produtos → 
Entrada em Estoque (est_03_saldos_estoque)
```

### 3. **Processo de Manufatura** (Novo)
```
Pedido Cliente → Verificação Estoque → 
Criação Ordem Produção → Consumo Insumos → 
Montagem → Produto Acabado → Estoque Final
```

### 4. **Processo de Vendas + CRM** (Novo)
```
Lead (origem) → Qualificação → Cliente → 
Pedido → Produção/Estoque → Entrega → 
Nota Fiscal → Histórico Cliente
```

---

## 📈 Extensões CRM Solicitadas

### 1. **Sistema de Leads**
```sql
-- Nova tabela: cad_08_leads
CREATE TABLE cad_08_leads (
    id_lead                  SERIAL PRIMARY KEY,
    nome                     VARCHAR(100) NOT NULL,
    email                    VARCHAR(100),
    telefone                 VARCHAR(20),
    empresa                  VARCHAR(100),
    origem_lead              VARCHAR(50), -- Site, WhatsApp, Indicação, etc.
    status_lead              VARCHAR(20), -- Novo, Qualificado, Convertido, Perdido
    data_primeiro_contato    DATE,
    observacoes              TEXT,
    valor_estimado           NUMERIC(15,2),
    probabilidade_fechamento INTEGER, -- 0-100%
    data_conversao           DATE,
    id_cliente_convertido    INTEGER REFERENCES cad_03_clientes(id_cliente),
    created_at               TIMESTAMP DEFAULT NOW(),
    updated_at               TIMESTAMP DEFAULT NOW()
);
```

### 2. **Clientes com Histórico de Compras**
```sql
-- Extensão da tabela existente cad_03_clientes
ALTER TABLE cad_03_clientes ADD COLUMN historico_compras JSONB;
ALTER TABLE cad_03_clientes ADD COLUMN total_compras NUMERIC(15,2) DEFAULT 0;
ALTER TABLE cad_03_clientes ADD COLUMN ultima_compra DATE;

-- Relacionamento com notas fiscais
CREATE VIEW cliente_notas_fiscais AS
SELECT 
    c.id_cliente,
    c.nome_razao_social,
    nf.numero_nota_fiscal,
    nf.data_emissao,
    nf.valor_total,
    nf.observacoes
FROM cad_03_clientes c
JOIN vnd_05_vendas v ON c.id_cliente = v.id_cliente
JOIN fis_09_notas_fiscais nf ON v.id_venda = nf.id_venda;
```

---

## ⏱️ Cronograma de Implementação (120 dias)

### **Fase 1: Base do Sistema (Dias 1-30)**
- **Semana 1-2**: Módulo CAD + Sistema de Leads
- **Semana 3**: Módulo EST (Estoque)
- **Semana 4**: Módulo PRD (Produtos + BOM)

### **Fase 2: Operações Core (Dias 31-60)**
- **Semana 5-6**: Módulo PRO (Produção)
- **Semana 7-8**: Módulo VND (Vendas + CRM)

### **Fase 3: Processos Auxiliares (Dias 61-90)**
- **Semana 9-10**: Módulo CMP (Compras)
- **Semana 11-12**: Módulo FIS (Fiscal)

### **Fase 4: Logística e Localização (Dias 91-105)**
- **Semana 13**: Módulo LOG (Logística)
- **Semana 14**: Módulo LOC (Localização)
- **Semana 15**: Testes Integrados

### **Fase 5: Integração Final (Dias 106-120)**
- **Semana 16**: Integração com tabelas importacao_
- **Semana 17**: Validação blueprint Make.com
- **Semana 18**: Testes finais e go-live

---

## 🛠️ Stack Tecnológico

### **Banco de Dados**
- PostgreSQL/Supabase
- Preservação de todas as foreign keys existentes
- Novos relacionamentos com CASCADE apropriado

### **Integrações Preservadas**
- Make.com (blueprint 26.358 linhas)
- Z-API WhatsApp (documentos importação)
- Webhook para processamento automático

### **Novas Funcionalidades**
- Interface web para gestão ERP
- Dashboards executivos
- Relatórios de produção
- CRM com pipeline de vendas

---

## 📋 Deliverables do Projeto

### **Documentação Técnica**
1. ✅ PROJETO_ERP_NXT_COMPLETO.md (este documento)
2. 📋 ESPECIFICACOES_TECNICAS_ERP.md
3. 🔗 INTEGRACAO_IMPORTACAO_ERP.md
4. 👥 SISTEMA_CRM_LEADS_CLIENTES.md
5. 📚 MANUAL_IMPLEMENTACAO_FASES.md

### **Artefatos Técnicos**
- Scripts SQL completos de criação
- Diagramas ERD (Entity Relationship Diagram)
- Scripts de migração de dados
- Casos de teste detalhados

### **Sistema Funcional**
- Todos os módulos integrados e funcionais
- Interface web responsiva
- Relatórios e dashboards
- Sistema de backup e recuperação

---

## ⚠️ Riscos e Mitigações

### **Riscos Críticos**
1. **Quebra do blueprint Make.com**
   - *Mitigação*: Testes contínuos em ambiente separado
   
2. **Perda de dados importação**
   - *Mitigação*: Backup completo antes de cada fase
   
3. **Incompatibilidade de relacionamentos**
   - *Mitigação*: Validação de foreign keys em cada etapa

### **Estratégia de Rollback**
- Backup completo antes de cada fase
- Scripts de reversão preparados
- Ambiente de teste espelhado
- Validação funcional contínua

---

## 🎯 Indicadores de Sucesso

### **Técnicos**
- ✅ 100% das tabelas importacao_ preservadas
- ✅ Blueprint Make.com funcionando sem alterações
- ✅ Todos os relacionamentos íntegros
- ✅ Performance mantida ou melhorada

### **Funcionais**
- ✅ Controle completo de produção de equipamentos
- ✅ Sistema CRM com leads e conversões
- ✅ Histórico completo de clientes
- ✅ Integração fluida importação → produção → vendas

### **Negócio**
- ✅ Redução de tempo de controle de estoque
- ✅ Melhoria na gestão de ordens de produção
- ✅ Aumento na conversão de leads
- ✅ Visibilidade completa do processo produtivo

---

*Documento criado em: 2025-07-05*  
*Projeto: ERP Integrado NXT Indústria e Comércio Ltda*  
*Versão: 1.0*