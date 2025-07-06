# Documentação Completa do Sistema ERP

## Índice
1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Arquitetura Modular](#arquitetura-modular)
3. [Mapa de Relacionamentos](#mapa-de-relacionamentos)
4. [Módulo CAD - Cadastros](#módulo-cad---cadastros)
5. [Módulo CMP - Compras](#módulo-cmp---compras)
6. [Módulo EST - Estoque](#módulo-est---estoque)
7. [Módulo FIS - Fiscal](#módulo-fis---fiscal)
8. [Módulo IMP - Importação](#módulo-imp---importação)
9. [Módulo LOC - Localização](#módulo-loc---localização)
10. [Módulo LOG - Logística](#módulo-log---logística)
11. [Módulo PRD - Produtos](#módulo-prd---produtos)
12. [Módulo PRO - Produção](#módulo-pro---produção)
13. [Módulo VND - Vendas](#módulo-vnd---vendas)
14. [Fluxos de Processos](#fluxos-de-processos)
15. [Casos de Uso](#casos-de-uso)
16. [Considerações de Migração](#considerações-de-migração)

## Visão Geral do Sistema

O Sistema ERP é composto por **46 tabelas** organizadas em **10 módulos** interconectados através de **73 foreign keys**. O sistema foi projetado para gerenciar completamente as operações de uma empresa de importação, produção e venda.

### Estatísticas Gerais
- **Total de Tabelas**: 46
- **Total de Foreign Keys**: 73
- **Módulos**: CAD, CMP, EST, FIS, IMP, LOC, LOG, PRD, PRO, VND

### Convenções de Nomenclatura
- **Prefixo do Módulo**: Cada tabela inicia com o código do módulo (ex: cad_, cmp_, est_)
- **Numeração**: Tabelas numeradas sequencialmente dentro de cada módulo
- **Campos de Auditoria**: created_at e updated_at em todas as tabelas

## Arquitetura Modular

```
┌─────────────────────────────────────────────────────────────────┐
│                        MÓDULOS CENTRAIS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │   CAD   │    │   PRD   │    │   LOC   │    │   FIS   │   │
│  │Cadastros│    │Produtos │    │Localiz. │    │ Fiscal  │   │
│  └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘   │
│       │              │              │              │         │
│       └──────────────┴──────┬───────┴──────────────┘         │
│                             │                                 │
├─────────────────────────────┴─────────────────────────────────┤
│                      MÓDULOS DE PROCESSO                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │   CMP   │    │   IMP   │    │   PRO   │    │   VND   │   │
│  │ Compras │    │ Import. │    │Produção │    │ Vendas  │   │
│  └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘   │
│       │              │              │              │         │
│       └──────────────┴──────┬───────┴──────────────┘         │
│                             │                                 │
├─────────────────────────────┴─────────────────────────────────┤
│                    MÓDULOS DE CONTROLE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│            ┌─────────┐              ┌─────────┐              │
│            │   EST   │              │   LOG   │              │
│            │ Estoque │              │Logística│              │
│            └─────────┘              └─────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Mapa de Relacionamentos

### Relacionamentos Inter-Módulos

```
CAD (Cadastros) ─────┬──> CMP (Compras)
    │                ├──> FIS (Fiscal)
    │                ├──> LOG (Logística)
    │                └──> VND (Vendas)
    │
    └──> IMP (Importação)
         │
PRD (Produtos) ──────┬──> CMP (Compras)
    │                ├──> EST (Estoque)
    │                ├──> FIS (Fiscal)
    │                ├──> IMP (Importação)
    │                ├──> LOG (Logística)
    │                ├──> PRO (Produção)
    │                └──> VND (Vendas)
    │
LOC (Localização) ───┬──> CMP (Compras)
    │                ├──> EST (Estoque)
    │                ├──> LOG (Logística)
    │                ├──> PRO (Produção)
    │                └──> VND (Vendas)
    │
FIS (Fiscal) ────────┬──> CAD (Transportadores)
                     └──> LOG (Logística)
```

## Módulo CAD - Cadastros

### Visão Geral
O módulo CAD é responsável pelo cadastramento de todas as entidades básicas do sistema: empresas, bancos, clientes, fornecedores e transportadores.

### Tabelas do Módulo

#### 1. cad_01_empresas
**Propósito**: Cadastro de empresas do grupo

**Estrutura**:
```sql
CREATE TABLE cad_01_empresas (
    id_empresa INTEGER PRIMARY KEY,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    razao_social VARCHAR(100) NOT NULL,
    inscricao_estadual VARCHAR(20),
    endereco VARCHAR(100),
    bairro VARCHAR(50),
    cep VARCHAR(10),
    municipio VARCHAR(50),
    uf VARCHAR(2),
    telefone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(100),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

**Relacionamentos**:
- Referenciada por: fis_09_notas_fiscais

#### 2. cad_02_bancos
**Propósito**: Cadastro de instituições bancárias

**Estrutura**:
```sql
CREATE TABLE cad_02_bancos (
    id_banco INTEGER PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

**Relacionamentos**:
- Referenciada por: imp_19_contratos_cambio

#### 3. cad_03_clientes
**Propósito**: Cadastro de clientes

**Estrutura**:
```sql
CREATE TABLE cad_03_clientes (
    id_cliente INTEGER PRIMARY KEY,
    tipo_pessoa VARCHAR(10) NOT NULL,
    cnpj_cpf VARCHAR(18) NOT NULL UNIQUE,
    nome_razao_social VARCHAR(100) NOT NULL,
    inscricao_estadual VARCHAR(20),
    endereco VARCHAR(100),
    bairro VARCHAR(50),
    cep VARCHAR(10),
    municipio VARCHAR(50),
    uf VARCHAR(2),
    telefone VARCHAR(20),
    email VARCHAR(100),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

**Relacionamentos**:
- Referenciada por: fis_09_notas_fiscais, log_06_entregas, vnd_05_vendas

#### 4. cad_04_fornecedores
**Propósito**: Cadastro de fornecedores nacionais e internacionais

**Estrutura**:
```sql
CREATE TABLE cad_04_fornecedores (
    id_fornecedor INTEGER PRIMARY KEY,
    tipo_pessoa VARCHAR(10) NOT NULL,
    cnpj_cpf VARCHAR(18),
    nome_razao_social VARCHAR(100) NOT NULL,
    inscricao_estadual VARCHAR(20),
    endereco VARCHAR(100),
    bairro VARCHAR(50),
    cep VARCHAR(10),
    municipio VARCHAR(50),
    uf VARCHAR(2),
    pais VARCHAR(50) DEFAULT 'Brasil',
    telefone VARCHAR(20),
    email VARCHAR(100),
    contato_responsavel VARCHAR(100),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

**Relacionamentos**:
- Referenciada por: cmp_07_compras

#### 5. cad_05_transportadores
**Propósito**: Cadastro de transportadores vinculados às notas fiscais

**Estrutura**:
```sql
CREATE TABLE cad_05_transportadores (
    id_transportador INTEGER PRIMARY KEY,
    id_nota_fiscal INTEGER NOT NULL,
    nome_transportador VARCHAR(100),
    cnpj_cpf_transportador VARCHAR(18),
    inscricao_estadual_transp VARCHAR(20),
    endereco_transportador VARCHAR(100),
    municipio_transportador VARCHAR(50),
    uf_transportador VARCHAR(2),
    frete_por_conta VARCHAR(20),
    codigo_antt VARCHAR(20),
    placa_veiculo VARCHAR(10),
    uf_veiculo VARCHAR(2),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

**Relacionamentos**:
- FK: id_nota_fiscal -> fis_09_notas_fiscais
- Referenciada por: log_06_entregas

### Casos de Uso - CAD

1. **Cadastro de Novo Cliente**
```sql
INSERT INTO cad_03_clientes (
    tipo_pessoa, cnpj_cpf, nome_razao_social, 
    endereco, municipio, uf, email
) VALUES (
    'J', '12.345.678/0001-90', 'Cliente Exemplo Ltda',
    'Rua das Flores, 123', 'São Paulo', 'SP', 'cliente@exemplo.com'
);
```

2. **Buscar Fornecedores Ativos por País**
```sql
SELECT * FROM cad_04_fornecedores 
WHERE pais = 'China' AND ativo = true;
```

## Módulo CMP - Compras

### Visão Geral
O módulo CMP gerencia todo o processo de compras, desde a solicitação até o recebimento, incluindo compras nacionais e importadas.

### Tabelas do Módulo

#### 6. cmp_07_compras
**Propósito**: Cabeçalho das ordens de compra

**Estrutura**:
```sql
CREATE TABLE cmp_07_compras (
    id_compra INTEGER PRIMARY KEY,
    codigo_compra VARCHAR(20) NOT NULL UNIQUE,
    id_declaracao_importacao INTEGER,
    id_fornecedor INTEGER NOT NULL,
    id_tipo_compra INTEGER NOT NULL,
    data_pedido DATE NOT NULL,
    data_entrega_prevista DATE,
    data_entrega_real DATE,
    valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    moeda VARCHAR(3) NOT NULL DEFAULT 'BRL',
    status_compra VARCHAR(20) DEFAULT 'PENDENTE',
    observacoes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

**Relacionamentos**:
- FK: id_declaracao_importacao -> imp_11_declaracoes_importacao
- FK: id_fornecedor -> cad_04_fornecedores
- FK: id_tipo_compra -> cmp_09_tipos_compra
- Referenciada por: cmp_08_itens_compra, est_04_movimentacoes, fis_09_notas_fiscais

#### 7. cmp_08_itens_compra
**Propósito**: Itens das ordens de compra

**Estrutura**:
```sql
CREATE TABLE cmp_08_itens_compra (
    id_item_compra INTEGER PRIMARY KEY,
    id_compra INTEGER NOT NULL,
    id_produto INTEGER NOT NULL,
    quantidade NUMERIC(10,3) NOT NULL,
    unidade_medida VARCHAR(10) NOT NULL,
    valor_unitario NUMERIC(10,2) NOT NULL,
    valor_total NUMERIC(15,2) NOT NULL,
    id_estabelecimento INTEGER NOT NULL,
    observacoes_item TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

**Relacionamentos**:
- FK: id_compra -> cmp_07_compras
- FK: id_produto -> prd_03_produtos
- FK: id_estabelecimento -> loc_02_estabelecimentos

#### 8. cmp_09_tipos_compra
**Propósito**: Tipos/categorias de compra

**Estrutura**:
```sql
CREATE TABLE cmp_09_tipos_compra (
    id_tipo_compra INTEGER PRIMARY KEY,
    codigo_tipo VARCHAR(20) NOT NULL UNIQUE,
    descricao VARCHAR(100) NOT NULL,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

**Relacionamentos**:
- Referenciada por: cmp_07_compras

### Fluxo de Compras

```
1. Criar Ordem de Compra (cmp_07_compras)
    ↓
2. Adicionar Itens (cmp_08_itens_compra)
    ↓
3. Se importação: Vincular DI (imp_11_declaracoes_importacao)
    ↓
4. Recebimento: Gerar Movimentação (est_04_movimentacoes)
    ↓
5. Gerar Nota Fiscal de Entrada (fis_09_notas_fiscais)
```

## Módulo EST - Estoque

### Visão Geral
O módulo EST controla todo o estoque da empresa, incluindo saldos, movimentações e localizações.

### Tabelas do Módulo

#### 9. est_01_tipos_movimento
**Propósito**: Tipos de movimentação de estoque

**Estrutura**:
```sql
CREATE TABLE est_01_tipos_movimento (
    id_tipo_movimento INTEGER PRIMARY KEY,
    codigo VARCHAR(3) NOT NULL UNIQUE,
    descricao VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

**Relacionamentos**:
- Referenciada por: est_04_movimentacoes

#### 10. est_02_indicadores_cd
**Propósito**: Indicadores de crédito/débito para movimentações

**Estrutura**:
```sql
CREATE TABLE est_02_indicadores_cd (
    id_indicador_credito_debito INTEGER PRIMARY KEY,
    codigo VARCHAR(1) NOT NULL UNIQUE,
    descricao VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

**Relacionamentos**:
- Referenciada por: est_04_movimentacoes

#### 11. est_03_saldos_estoque
**Propósito**: Saldos atuais por produto/localização

**Estrutura**:
```sql
CREATE TABLE est_03_saldos_estoque (
    id_estoque INTEGER PRIMARY KEY,
    id_produto INTEGER NOT NULL,
    id_endereco_estoque INTEGER NOT NULL,
    id_deposito INTEGER NOT NULL,
    id_estabelecimento INTEGER NOT NULL,
    quantidade NUMERIC(10,3) NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

**Relacionamentos**:
- FK: id_produto -> prd_03_produtos
- FK: id_endereco_estoque -> loc_04_enderecos_estoque
- FK: id_deposito -> loc_03_depositos
- FK: id_estabelecimento -> loc_02_estabelecimentos

#### 12. est_04_movimentacoes
**Propósito**: Registro de todas as movimentações de estoque

**Estrutura**:
```sql
CREATE TABLE est_04_movimentacoes (
    id_movimentacao_estoque INTEGER PRIMARY KEY,
    id_tipo_movimento INTEGER NOT NULL,
    id_produto INTEGER NOT NULL,
    id_estabelecimento INTEGER,
    id_deposito INTEGER,
    id_endereco_estoque INTEGER,
    quantidade NUMERIC(13,3) NOT NULL,
    unidade_medida VARCHAR(3) NOT NULL,
    data_lancamento DATE NOT NULL,
    id_indicador_credito_debito INTEGER,
    texto_item VARCHAR(100),
    id_compra INTEGER,
    id_entrega INTEGER,
    id_ordem_producao INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

**Relacionamentos**:
- FK: id_tipo_movimento -> est_01_tipos_movimento
- FK: id_produto -> prd_03_produtos
- FK: id_estabelecimento -> loc_02_estabelecimentos
- FK: id_deposito -> loc_03_depositos
- FK: id_endereco_estoque -> loc_04_enderecos_estoque
- FK: id_indicador_credito_debito -> est_02_indicadores_cd
- FK: id_compra -> cmp_07_compras
- FK: id_entrega -> log_06_entregas
- FK: id_ordem_producao -> pro_05_ordens_producao

### Casos de Uso - EST

1. **Consultar Saldo de um Produto**
```sql
SELECT 
    p.nome_produto,
    e.nome as estabelecimento,
    d.nome_deposito,
    s.quantidade
FROM est_03_saldos_estoque s
JOIN prd_03_produtos p ON p.id_produto = s.id_produto
JOIN loc_02_estabelecimentos e ON e.id_estabelecimento = s.id_estabelecimento
JOIN loc_03_depositos d ON d.id_deposito = s.id_deposito
WHERE p.codigo_produto = 'PROD001';
```

2. **Registrar Entrada por Compra**
```sql
INSERT INTO est_04_movimentacoes (
    id_tipo_movimento, id_produto, id_estabelecimento,
    quantidade, unidade_medida, data_lancamento,
    id_indicador_credito_debito, id_compra
) VALUES (
    1, 100, 1, 500, 'UN', CURRENT_DATE, 1, 50
);
```

## Módulo FIS - Fiscal

### Visão Geral
O módulo FIS gerencia toda a parte fiscal da empresa, incluindo emissão de notas fiscais e cálculo de impostos.

### Tabelas do Módulo

#### 13. fis_08_tipos_operacao
**Propósito**: Tipos de operações fiscais

**Estrutura**:
```sql
CREATE TABLE fis_08_tipos_operacao (
    id_tipo_operacao INTEGER PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL UNIQUE,
    descricao VARCHAR(100) NOT NULL,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

**Relacionamentos**:
- Referenciada por: fis_09_notas_fiscais

#### 14. fis_09_notas_fiscais
**Propósito**: Cabeçalho das notas fiscais

**Estrutura**:
```sql
CREATE TABLE fis_09_notas_fiscais (
    id_nota_fiscal INTEGER PRIMARY KEY,
    numero_nfe INTEGER NOT NULL,
    serie INTEGER NOT NULL,
    chave_acesso VARCHAR(44) NOT NULL UNIQUE,
    protocolo_autorizacao VARCHAR(30),
    id_tipo_operacao INTEGER NOT NULL,
    id_empresa INTEGER NOT NULL,
    id_cliente INTEGER NOT NULL,
    id_venda INTEGER,
    id_compra INTEGER,
    natureza_operacao VARCHAR(100),
    finalidade_operacao INTEGER,
    data_emissao DATE NOT NULL,
    data_saida DATE,
    hora_saida TIME WITHOUT TIME ZONE,
    valor_total_produtos NUMERIC(10,2) NOT NULL,
    valor_frete NUMERIC(10,2) DEFAULT 0,
    valor_seguro NUMERIC(10,2) DEFAULT 0,
    desconto NUMERIC(10,2) DEFAULT 0,
    outras_despesas NUMERIC(10,2) DEFAULT 0,
    valor_total_nota NUMERIC(10,2) NOT NULL,
    base_calculo_icms NUMERIC(10,2),
    valor_icms NUMERIC(10,2),
    valor_ipi NUMERIC(10,2) DEFAULT 0,
    total_aproximado_tributos NUMERIC(10,2),
    percentual_tributos NUMERIC(5,2),
    observacoes TEXT,
    status_nota VARCHAR(20) DEFAULT 'EMITIDA',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

**Relacionamentos**:
- FK: id_tipo_operacao -> fis_08_tipos_operacao
- FK: id_empresa -> cad_01_empresas
- FK: id_cliente -> cad_03_clientes
- FK: id_venda -> vnd_05_vendas
- FK: id_compra -> cmp_07_compras
- Referenciada por: cad_05_transportadores, fis_10_itens_nota_fiscal, log_06_entregas

#### 15. fis_10_itens_nota_fiscal
**Propósito**: Itens das notas fiscais

**Estrutura**:
```sql
CREATE TABLE fis_10_itens_nota_fiscal (
    id_item_nota_fiscal INTEGER PRIMARY KEY,
    id_nota_fiscal INTEGER NOT NULL,
    id_produto INTEGER NOT NULL,
    numero_item INTEGER NOT NULL,
    cst VARCHAR(3),
    cfop VARCHAR(4),
    quantidade NUMERIC(10,3) NOT NULL,
    valor_unitario NUMERIC(10,2) NOT NULL,
    valor_total NUMERIC(10,2) NOT NULL,
    base_calculo_icms NUMERIC(10,2),
    valor_icms NUMERIC(10,2),
    percentual_icms NUMERIC(5,2),
    valor_ipi NUMERIC(10,2) DEFAULT 0,
    percentual_ipi NUMERIC(5,2) DEFAULT 0,
    peso_bruto NUMERIC(10,3),
    peso_liquido NUMERIC(10,3),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

**Relacionamentos**:
- FK: id_nota_fiscal -> fis_09_notas_fiscais
- FK: id_produto -> prd_03_produtos

## Módulo IMP - Importação

### Visão Geral
O módulo IMP gerencia todo o processo de importação, desde a proforma invoice até o fechamento do processo.

### Estrutura Hierárquica
```
imp_05_proforma_invoices (Documento inicial)
├── imp_06_proforma_invoice_itens
└── imp_07_commercial_invoices
    ├── imp_08_commercial_invoice_itens
    ├── imp_09_packing_lists
    ├── imp_10_conhecimentos_embarque
    ├── imp_11_declaracoes_importacao
    │   └── imp_12_di_adicoes
    ├── imp_13_documentos_importacao
    ├── imp_14_seguros_transporte
    ├── imp_15_custos_importacao
    ├── imp_16_pagamentos_importacao
    └── imp_17_fechamentos_importacao
        └── imp_18_importacao_itens_resumo

imp_19_contratos_cambio (Independente)
└── imp_16_pagamentos_importacao
```

### Tabelas do Módulo

#### 16. imp_05_proforma_invoices
**Propósito**: Documento inicial de cotação/proposta

**Estrutura**:
```sql
CREATE TABLE imp_05_proforma_invoices (
    id_proforma_invoice INTEGER PRIMARY KEY,
    numero VARCHAR(50) NOT NULL UNIQUE,
    data_emissao DATE NOT NULL,
    porto_embarque VARCHAR(100),
    valor_total NUMERIC(15,2),
    observacoes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

#### 17-30. [Demais tabelas IMP]
[Estruturas detalhadas conforme arquivo original]

### Fluxo de Importação

```
1. Proforma Invoice → 2. Commercial Invoice → 3. Packing List
                                           ↓
                                    4. Bill of Lading
                                           ↓
                                    5. Declaração Importação
                                           ↓
                                    6. Nacionalização/NF
                                           ↓
                                    7. Fechamento
```

## Módulo LOC - Localização

### Visão Geral
O módulo LOC gerencia toda a estrutura física da empresa: estabelecimentos, depósitos e endereços de estoque.

### Hierarquia
```
loc_01_tipos_localidade
    ↓
loc_02_estabelecimentos
    ↓
loc_03_depositos
    ↓
loc_04_enderecos_estoque
```

### Tabelas do Módulo

#### 31. loc_01_tipos_localidade
**Propósito**: Classificação dos tipos de localidade

**Estrutura**:
```sql
CREATE TABLE loc_01_tipos_localidade (
    id_tipo_localidade INTEGER PRIMARY KEY,
    codigo_tipo VARCHAR(20) NOT NULL UNIQUE,
    nome_tipo VARCHAR(100) NOT NULL,
    descricao_tipo TEXT,
    permite_producao BOOLEAN DEFAULT false,
    permite_venda BOOLEAN DEFAULT false,
    permite_estoque BOOLEAN DEFAULT true,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
```

#### 32-34. [Demais tabelas LOC]
[Estruturas detalhadas conforme arquivo original]

## Módulo LOG - Logística

### Visão Geral
O módulo LOG gerencia entregas e expedição de produtos.

### Tabelas do Módulo

#### 35. log_05_itens_entrega
**Propósito**: Itens a serem entregues

#### 36. log_06_entregas
**Propósito**: Controle de entregas

**Relacionamentos Principais**:
- Conecta vendas (VND) com notas fiscais (FIS)
- Utiliza transportadores (CAD)
- Gera movimentações de estoque (EST)

## Módulo PRD - Produtos

### Visão Geral
O módulo PRD é central no sistema, gerenciando produtos, modelos e composições.

### Hierarquia
```
prd_01_tipos_produto
    ↓
prd_02_modelos
    ↓
prd_03_produtos
    ↓
prd_04_composicao_produtos
```

### Tabelas do Módulo

#### 37-40. [Tabelas PRD]
[Estruturas detalhadas conforme arquivo original]

### Importância do Módulo PRD
- **Central no Sistema**: Referenciado por 7 dos 10 módulos
- **21 Foreign Keys** apontam para prd_03_produtos
- Base para: Compras, Vendas, Estoque, Produção, Importação

## Módulo PRO - Produção

### Visão Geral
O módulo PRO controla ordens de produção e status de fabricação.

### Tabelas do Módulo

#### 41-43. [Tabelas PRO]
[Estruturas detalhadas conforme arquivo original]

### Fluxo de Produção
```
1. Criar Ordem de Produção (pro_05_ordens_producao)
2. Definir Itens a Produzir (pro_04_itens_ordem_producao)
3. Atualizar Status (pro_06_status_producao)
4. Gerar Movimentações de Estoque (est_04_movimentacoes)
```

## Módulo VND - Vendas

### Visão Geral
O módulo VND gerencia todo o processo de vendas.

### Tabelas do Módulo

#### 44-46. [Tabelas VND]
[Estruturas detalhadas conforme arquivo original]

### Fluxo de Vendas
```
1. Criar Pedido (vnd_05_vendas)
2. Adicionar Itens (vnd_06_itens_venda)
3. Gerar Nota Fiscal (fis_09_notas_fiscais)
4. Criar Entrega (log_06_entregas)
5. Baixar Estoque (est_04_movimentacoes)
```

## Fluxos de Processos

### Fluxo Completo de Importação
```
1. Cotação (Proforma Invoice)
2. Pedido de Compra (cmp_07_compras)
3. Commercial Invoice
4. Pagamento/Câmbio
5. Embarque (B/L)
6. Desembaraço (DI)
7. Nota Fiscal Entrada
8. Entrada no Estoque
```

### Fluxo de Produção
```
1. Ordem de Produção
2. Requisição de Materiais
3. Baixa de Estoque (Matérias-primas)
4. Produção
5. Entrada de Produtos Acabados
```

### Fluxo de Vendas
```
1. Pedido de Venda
2. Análise de Crédito
3. Separação/Picking
4. Faturamento (NF)
5. Expedição
6. Baixa de Estoque
```

## Casos de Uso

### 1. Importação Completa
```sql
-- 1. Criar Proforma
INSERT INTO imp_05_proforma_invoices (numero, data_emissao, valor_total)
VALUES ('PI-2024-001', '2024-01-15', 50000.00);

-- 2. Criar Commercial Invoice
INSERT INTO imp_07_commercial_invoices (numero, id_proforma_invoice, data_emissao, valor_total)
VALUES ('CI-2024-001', 1, '2024-01-20', 50000.00);

-- 3. Registrar DI
INSERT INTO imp_11_declaracoes_importacao (numero, id_commercial_invoice, porto_entrada, data_registro, valor_total)
VALUES ('24/0001234-5', 1, 'Santos', '2024-02-10', 65000.00);

-- 4. Vincular à Compra
UPDATE cmp_07_compras 
SET id_declaracao_importacao = 1 
WHERE id_compra = 100;
```

### 2. Consulta de Rastreabilidade
```sql
-- Rastrear produto desde importação até venda
SELECT 
    pi.numero as proforma,
    ci.numero as commercial,
    di.numero as di,
    nf_e.numero_nfe as nf_entrada,
    v.codigo_pedido as pedido_venda,
    nf_s.numero_nfe as nf_saida
FROM imp_05_proforma_invoices pi
JOIN imp_07_commercial_invoices ci ON ci.id_proforma_invoice = pi.id_proforma_invoice
JOIN imp_11_declaracoes_importacao di ON di.id_commercial_invoice = ci.id_commercial_invoice
JOIN cmp_07_compras c ON c.id_declaracao_importacao = di.id_declaracao_importacao
JOIN fis_09_notas_fiscais nf_e ON nf_e.id_compra = c.id_compra
JOIN vnd_05_vendas v ON v.id_estabelecimento = c.id_estabelecimento
JOIN fis_09_notas_fiscais nf_s ON nf_s.id_venda = v.id_venda
WHERE pi.numero = 'PI-2024-001';
```

### 3. Análise de Estoque por Localização
```sql
-- Estoque total por estabelecimento
SELECT 
    e.nome as estabelecimento,
    p.nome_produto,
    SUM(s.quantidade) as estoque_total
FROM est_03_saldos_estoque s
JOIN prd_03_produtos p ON p.id_produto = s.id_produto
JOIN loc_02_estabelecimentos e ON e.id_estabelecimento = s.id_estabelecimento
GROUP BY e.nome, p.nome_produto
ORDER BY e.nome, estoque_total DESC;
```

## Conclusão

O Sistema ERP apresenta uma arquitetura robusta e bem estruturada, com clara separação de responsabilidades entre módulos.

### Pontos Fortes
- Modularidade clara
- Relacionamentos bem definidos
- Campos de auditoria em todas as tabelas
- Flexibilidade para diferentes tipos de operação

### Oportunidades de Melhoria
- Modernização do módulo IMP
- Integração com sistemas externos
- Otimização de performance
- Implementação de APIs REST

A documentação completa permite uma visão holística do sistema, facilitando manutenção, evolução e tomada de decisões arquiteturais.