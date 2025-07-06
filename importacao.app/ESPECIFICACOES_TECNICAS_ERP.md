# Especificações Técnicas - Sistema ERP NXT Indústria e Comércio Ltda

## 📋 Visão Geral Técnica

Este documento detalha as especificações técnicas completas dos 10 módulos do sistema ERP integrado, incluindo estruturas de tabelas, relacionamentos, índices, triggers e regras de negócio específicas para a manufatura de equipamentos de mobilidade elétrica.

---

## 🏗️ Arquitetura de Dados

### Princípios Arquiteturais
1. **Integridade Referencial**: Todas as foreign keys com CASCADE apropriado
2. **Auditoria Completa**: created_at e updated_at em todas as tabelas
3. **Performance**: Índices estratégicos em chaves de busca
4. **Flexibilidade**: Campos JSONB para dados semiestruturados
5. **Compatibilidade**: Preservação total das tabelas importacao_

---

## 📋 MÓDULO 1: CAD - CADASTROS BÁSICOS + CRM

### 1.1 **cad_01_empresas**
```sql
CREATE TABLE cad_01_empresas (
    id_empresa           SERIAL PRIMARY KEY,
    cnpj                 VARCHAR(18) NOT NULL UNIQUE,
    razao_social         VARCHAR(100) NOT NULL,
    inscricao_estadual   VARCHAR(20),
    endereco             VARCHAR(100),
    bairro               VARCHAR(50),
    cep                  VARCHAR(10),
    municipio            VARCHAR(50),
    uf                   VARCHAR(2),
    telefone             VARCHAR(20),
    email                VARCHAR(100),
    website              VARCHAR(100),
    ativo                BOOLEAN DEFAULT TRUE,
    created_at           TIMESTAMP DEFAULT NOW(),
    updated_at           TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_empresas_cnpj ON cad_01_empresas(cnpj);
CREATE INDEX idx_empresas_ativo ON cad_01_empresas(ativo);
```

### 1.2 **cad_02_bancos**
```sql
CREATE TABLE cad_02_bancos (
    id_banco    SERIAL PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    codigo      VARCHAR(10) NOT NULL UNIQUE,
    ativo       BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Dados iniciais principais bancos brasileiros
INSERT INTO cad_02_bancos (nome, codigo) VALUES 
('Banco do Brasil', '001'),
('Bradesco', '237'),
('Itaú', '341'),
('Santander', '033'),
('Caixa Econômica Federal', '104');
```

### 1.3 **cad_03_clientes** (Expandido para CRM)
```sql
CREATE TABLE cad_03_clientes (
    id_cliente              SERIAL PRIMARY KEY,
    tipo_pessoa             VARCHAR(10) NOT NULL CHECK (tipo_pessoa IN ('F', 'J')),
    cnpj_cpf                VARCHAR(18) NOT NULL UNIQUE,
    nome_razao_social       VARCHAR(100) NOT NULL,
    inscricao_estadual      VARCHAR(20),
    endereco                VARCHAR(100),
    bairro                  VARCHAR(50),
    cep                     VARCHAR(10),
    municipio               VARCHAR(50),
    uf                      VARCHAR(2),
    telefone                VARCHAR(20),
    email                   VARCHAR(100),
    
    -- Extensões CRM
    historico_compras       JSONB DEFAULT '[]'::jsonb,
    total_compras           NUMERIC(15,2) DEFAULT 0,
    ultima_compra           DATE,
    data_primeira_compra    DATE,
    classificacao_cliente   VARCHAR(20) DEFAULT 'NOVO', -- NOVO, BRONZE, PRATA, OURO, PLATINA
    observacoes_comerciais  TEXT,
    vendedor_responsavel    VARCHAR(100),
    
    ativo                   BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_clientes_cnpj_cpf ON cad_03_clientes(cnpj_cpf);
CREATE INDEX idx_clientes_tipo_pessoa ON cad_03_clientes(tipo_pessoa);
CREATE INDEX idx_clientes_classificacao ON cad_03_clientes(classificacao_cliente);
CREATE INDEX idx_clientes_ultima_compra ON cad_03_clientes(ultima_compra);
```

### 1.4 **cad_04_fornecedores**
```sql
CREATE TABLE cad_04_fornecedores (
    id_fornecedor           SERIAL PRIMARY KEY,
    tipo_pessoa             VARCHAR(10) NOT NULL CHECK (tipo_pessoa IN ('F', 'J')),
    cnpj_cpf                VARCHAR(18),
    nome_razao_social       VARCHAR(100) NOT NULL,
    inscricao_estadual      VARCHAR(20),
    endereco                VARCHAR(100),
    bairro                  VARCHAR(50),
    cep                     VARCHAR(10),
    municipio               VARCHAR(50),
    uf                      VARCHAR(2),
    pais                    VARCHAR(50) DEFAULT 'Brasil',
    telefone                VARCHAR(20),
    email                   VARCHAR(100),
    contato_responsavel     VARCHAR(100),
    
    -- Campos específicos para importação
    tipo_fornecedor         VARCHAR(20) DEFAULT 'NACIONAL', -- NACIONAL, INTERNACIONAL
    moeda_padrao            VARCHAR(3) DEFAULT 'BRL',
    prazo_entrega_dias      INTEGER DEFAULT 30,
    condicoes_pagamento     TEXT,
    observacoes             TEXT,
    
    ativo                   BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_fornecedores_cnpj_cpf ON cad_04_fornecedores(cnpj_cpf);
CREATE INDEX idx_fornecedores_pais ON cad_04_fornecedores(pais);
CREATE INDEX idx_fornecedores_tipo ON cad_04_fornecedores(tipo_fornecedor);
```

### 1.5 **cad_05_transportadores**
```sql
CREATE TABLE cad_05_transportadores (
    id_transportador    SERIAL PRIMARY KEY,
    id_fornecedor       INTEGER REFERENCES cad_04_fornecedores(id_fornecedor),
    tipo_transporte     VARCHAR(20) CHECK (tipo_transporte IN ('RODOVIARIO', 'MARITIMO', 'AEREO', 'FERROVIARIO')),
    capacidade_carga    NUMERIC(15,2), -- em toneladas
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);
```

### 1.6 **cad_08_leads** (Nova tabela CRM)
```sql
CREATE TABLE cad_08_leads (
    id_lead                     SERIAL PRIMARY KEY,
    nome                        VARCHAR(100) NOT NULL,
    email                       VARCHAR(100),
    telefone                    VARCHAR(20),
    empresa                     VARCHAR(100),
    cargo                       VARCHAR(50),
    
    -- Origem e qualificação
    origem_lead                 VARCHAR(50) NOT NULL, -- SITE, WHATSAPP, INDICACAO, EVENTO, GOOGLE_ADS, etc.
    canal_captacao              VARCHAR(50), -- Detalhamento da origem
    campanha                    VARCHAR(100), -- Campanha específica se aplicável
    
    -- Status e qualificação
    status_lead                 VARCHAR(20) DEFAULT 'NOVO', -- NOVO, QUALIFICADO, EM_NEGOCIACAO, CONVERTIDO, PERDIDO
    qualificacao_score          INTEGER DEFAULT 0, -- 0-100
    interesse_produto           TEXT,
    necessidade_identificada    TEXT,
    orcamento_estimado          NUMERIC(15,2),
    
    -- Datas importantes
    data_primeiro_contato       DATE NOT NULL DEFAULT CURRENT_DATE,
    data_ultima_interacao       DATE,
    data_qualificacao           DATE,
    data_conversao              DATE,
    data_perda                  DATE,
    
    -- Conversão
    probabilidade_fechamento    INTEGER DEFAULT 0, -- 0-100%
    valor_estimado_negocio      NUMERIC(15,2),
    prazo_fechamento_estimado   DATE,
    motivo_perda                TEXT,
    
    -- Relacionamentos
    id_cliente_convertido       INTEGER REFERENCES cad_03_clientes(id_cliente),
    vendedor_responsavel        VARCHAR(100),
    
    -- Controle
    observacoes                 TEXT,
    proxima_acao                TEXT,
    data_proxima_acao           DATE,
    
    ativo                       BOOLEAN DEFAULT TRUE,
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_leads_status ON cad_08_leads(status_lead);
CREATE INDEX idx_leads_origem ON cad_08_leads(origem_lead);
CREATE INDEX idx_leads_vendedor ON cad_08_leads(vendedor_responsavel);
CREATE INDEX idx_leads_data_conversao ON cad_08_leads(data_conversao);
CREATE INDEX idx_leads_valor_estimado ON cad_08_leads(valor_estimado_negocio);
```

---

## 📦 MÓDULO 2: EST - ESTOQUE

### 2.1 **est_01_tipos_movimento**
```sql
CREATE TABLE est_01_tipos_movimento (
    id_tipo_movimento   SERIAL PRIMARY KEY,
    codigo              VARCHAR(3) NOT NULL UNIQUE,
    descricao           VARCHAR(100) NOT NULL,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Dados iniciais
INSERT INTO est_01_tipos_movimento (codigo, descricao) VALUES
('ENT', 'Entrada'),
('SAI', 'Saída'),
('TRF', 'Transferência'),
('AJU', 'Ajuste'),
('INV', 'Inventário');
```

### 2.2 **est_02_indicadores_cd**
```sql
CREATE TABLE est_02_indicadores_cd (
    id_indicador_credito_debito SERIAL PRIMARY KEY,
    indicador                   VARCHAR(3) NOT NULL UNIQUE,
    descricao                   VARCHAR(100) NOT NULL,
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW()
);

-- Dados iniciais
INSERT INTO est_02_indicadores_cd (indicador, descricao) VALUES
('CRE', 'Crédito'),
('DEB', 'Débito');
```

### 2.3 **est_03_saldos_estoque**
```sql
CREATE TABLE est_03_saldos_estoque (
    id_saldo_estoque        SERIAL PRIMARY KEY,
    id_produto              INTEGER NOT NULL REFERENCES prd_03_produtos(id_produto),
    id_deposito             INTEGER NOT NULL REFERENCES loc_03_depositos(id_deposito),
    id_endereco_estoque     INTEGER REFERENCES loc_04_enderecos_estoque(id_endereco_estoque),
    
    -- Quantidades
    quantidade_disponivel   NUMERIC(15,3) DEFAULT 0,
    quantidade_reservada    NUMERIC(15,3) DEFAULT 0,
    quantidade_total        NUMERIC(15,3) DEFAULT 0,
    
    -- Custos
    custo_medio             NUMERIC(15,4),
    valor_total_estoque     NUMERIC(15,2),
    
    -- Controle de datas
    data_ultima_entrada     TIMESTAMP,
    data_ultima_saida       TIMESTAMP,
    data_ultimo_inventario  TIMESTAMP,
    
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(id_produto, id_deposito, id_endereco_estoque)
);

-- Índices para performance
CREATE INDEX idx_saldos_produto ON est_03_saldos_estoque(id_produto);
CREATE INDEX idx_saldos_deposito ON est_03_saldos_estoque(id_deposito);
CREATE INDEX idx_saldos_disponivel ON est_03_saldos_estoque(quantidade_disponivel);
```

### 2.4 **est_04_movimentacoes**
```sql
CREATE TABLE est_04_movimentacoes (
    id_movimentacao             SERIAL PRIMARY KEY,
    id_tipo_movimento           INTEGER NOT NULL REFERENCES est_01_tipos_movimento(id_tipo_movimento),
    id_indicador_credito_debito INTEGER NOT NULL REFERENCES est_02_indicadores_cd(id_indicador_credito_debito),
    id_produto                  INTEGER NOT NULL REFERENCES prd_03_produtos(id_produto),
    id_deposito                 INTEGER NOT NULL REFERENCES loc_03_depositos(id_deposito),
    id_endereco_estoque         INTEGER REFERENCES loc_04_enderecos_estoque(id_endereco_estoque),
    
    -- Dados da movimentação
    data_movimento              TIMESTAMP NOT NULL DEFAULT NOW(),
    quantidade                  NUMERIC(15,3) NOT NULL,
    valor_unitario              NUMERIC(15,4),
    valor_total                 NUMERIC(15,2),
    
    -- Relacionamentos opcionais com outros módulos
    id_nota_fiscal              INTEGER REFERENCES fis_09_notas_fiscais(id_nota_fiscal),
    id_ordem_producao           INTEGER REFERENCES pro_05_ordens_producao(id_ordem_producao),
    id_compra                   INTEGER REFERENCES cmp_07_compras(id_compra),
    id_venda                    INTEGER REFERENCES vnd_05_vendas(id_venda),
    
    -- Relacionamento com importação
    id_proforma_invoice         INTEGER REFERENCES importacao_01_1_proforma_invoice(id),
    
    -- Controle
    documento_origem            VARCHAR(50),
    numero_documento            VARCHAR(50),
    observacoes                 TEXT,
    usuario_responsavel         VARCHAR(100),
    
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW()
);

-- Índices para consultas frequentes
CREATE INDEX idx_movimentacoes_produto ON est_04_movimentacoes(id_produto);
CREATE INDEX idx_movimentacoes_data ON est_04_movimentacoes(data_movimento);
CREATE INDEX idx_movimentacoes_tipo ON est_04_movimentacoes(id_tipo_movimento);
CREATE INDEX idx_movimentacoes_proforma ON est_04_movimentacoes(id_proforma_invoice);
```

---

## 🏭 MÓDULO 3: PRD - PRODUTOS

### 3.1 **prd_01_tipos_produto**
```sql
CREATE TABLE prd_01_tipos_produto (
    id_tipo_produto SERIAL PRIMARY KEY,
    codigo          VARCHAR(10) NOT NULL UNIQUE,
    descricao       VARCHAR(100) NOT NULL,
    
    -- Classificações específicas para equipamentos elétricos
    categoria       VARCHAR(50), -- COMPONENTE, SUBCONJUNTO, PRODUTO_FINAL
    aplicacao       VARCHAR(50), -- MOBILIDADE_URBANA, CARGA, PESSOAL
    
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Dados iniciais para equipamentos de mobilidade elétrica
INSERT INTO prd_01_tipos_produto (codigo, descricao, categoria, aplicacao) VALUES
('COMP', 'Componentes', 'COMPONENTE', 'GERAL'),
('BATT', 'Baterias', 'COMPONENTE', 'ENERGIA'),
('MOTO', 'Motores', 'COMPONENTE', 'PROPULSAO'),
('CONT', 'Controladores', 'COMPONENTE', 'CONTROLE'),
('ACES', 'Acessórios', 'COMPONENTE', 'GERAL'),
('SCOO', 'Scooters', 'PRODUTO_FINAL', 'MOBILIDADE_URBANA'),
('BIKE', 'Bicicletas Elétricas', 'PRODUTO_FINAL', 'MOBILIDADE_URBANA'),
('TRIC', 'Triciclos de Carga', 'PRODUTO_FINAL', 'CARGA');
```

### 3.2 **prd_02_modelos**
```sql
CREATE TABLE prd_02_modelos (
    id_modelo           SERIAL PRIMARY KEY,
    id_tipo_produto     INTEGER REFERENCES prd_01_tipos_produto(id_tipo_produto),
    codigo              VARCHAR(20) NOT NULL UNIQUE,
    descricao           VARCHAR(100) NOT NULL,
    
    -- Especificações técnicas detalhadas
    especificacoes      JSONB DEFAULT '{}'::jsonb,
    versao              VARCHAR(10) DEFAULT '1.0',
    
    -- Status
    ativo               BOOLEAN DEFAULT TRUE,
    em_desenvolvimento  BOOLEAN DEFAULT FALSE,
    data_lancamento     DATE,
    
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Índice para busca por especificações
CREATE INDEX idx_modelos_especificacoes ON prd_02_modelos USING GIN (especificacoes);
```

### 3.3 **prd_03_produtos** (Tabela Central)
```sql
CREATE TABLE prd_03_produtos (
    id_produto              SERIAL PRIMARY KEY,
    id_modelo               INTEGER REFERENCES prd_02_modelos(id_modelo),
    id_fornecedor           INTEGER REFERENCES cad_04_fornecedores(id_fornecedor),
    
    -- Identificação
    codigo                  VARCHAR(20) NOT NULL UNIQUE,
    codigo_fabricante       VARCHAR(50), -- Código do fornecedor/fabricante
    codigo_ncm              VARCHAR(10),
    descricao               VARCHAR(100) NOT NULL,
    descricao_detalhada     TEXT,
    
    -- Especificações físicas (críticas para importação e produção)
    unidade_medida          VARCHAR(10) DEFAULT 'UN',
    peso_liquido            NUMERIC(15,3), -- kg
    peso_bruto              NUMERIC(15,3), -- kg
    volume_m3               NUMERIC(15,3), -- metros cúbicos
    dimensoes               JSONB, -- {comprimento, largura, altura}
    
    -- Custos e preços
    preco_custo             NUMERIC(15,2),
    preco_venda             NUMERIC(15,2),
    margem_lucro_percentual NUMERIC(5,2),
    moeda_custo             VARCHAR(3) DEFAULT 'BRL',
    
    -- Controle de estoque
    estoque_minimo          NUMERIC(15,2) DEFAULT 0,
    estoque_maximo          NUMERIC(15,2),
    ponto_reposicao         NUMERIC(15,2),
    lote_minimo_compra      NUMERIC(15,2) DEFAULT 1,
    lead_time_dias          INTEGER DEFAULT 30,
    
    -- Classificações
    tipo_produto            VARCHAR(20), -- MATERIA_PRIMA, COMPONENTE, PRODUTO_ACABADO
    abc_classe              VARCHAR(1) CHECK (abc_classe IN ('A', 'B', 'C')),
    critico_producao        BOOLEAN DEFAULT FALSE,
    
    -- Relacionamento com importação
    id_proforma_origem      INTEGER REFERENCES importacao_01_1_proforma_invoice(id),
    data_criacao_importacao TIMESTAMP,
    
    -- Controle de qualidade
    requer_certificacao     BOOLEAN DEFAULT FALSE,
    requer_inspecao         BOOLEAN DEFAULT FALSE,
    validade_dias           INTEGER,
    
    -- Observações e anexos
    observacoes             TEXT,
    anexos                  JSONB DEFAULT '[]'::jsonb,
    especificacoes_tecnicas JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    ativo                   BOOLEAN DEFAULT TRUE,
    descontinuado           BOOLEAN DEFAULT FALSE,
    data_descontinuacao     DATE,
    
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- Índices essenciais
CREATE INDEX idx_produtos_codigo ON prd_03_produtos(codigo);
CREATE INDEX idx_produtos_ncm ON prd_03_produtos(codigo_ncm);
CREATE INDEX idx_produtos_fornecedor ON prd_03_produtos(id_fornecedor);
CREATE INDEX idx_produtos_tipo ON prd_03_produtos(tipo_produto);
CREATE INDEX idx_produtos_ativo ON prd_03_produtos(ativo);
CREATE INDEX idx_produtos_proforma ON prd_03_produtos(id_proforma_origem);
CREATE INDEX idx_produtos_especificacoes ON prd_03_produtos USING GIN (especificacoes_tecnicas);
```

### 3.4 **prd_04_composicao_produtos** (BOM - Bill of Materials)
```sql
CREATE TABLE prd_04_composicao_produtos (
    id_composicao       SERIAL PRIMARY KEY,
    id_produto_pai      INTEGER NOT NULL REFERENCES prd_03_produtos(id_produto),
    id_produto_filho    INTEGER NOT NULL REFERENCES prd_03_produtos(id_produto),
    
    -- Quantidade e medidas
    quantidade          NUMERIC(15,4) NOT NULL,
    unidade_medida      VARCHAR(10) DEFAULT 'UN',
    
    -- Controle de perdas e eficiência
    perda_processo      NUMERIC(5,2) DEFAULT 0, -- % de perda
    eficiencia_uso      NUMERIC(5,2) DEFAULT 100, -- % de eficiência
    
    -- Posição na estrutura
    nivel_estrutura     INTEGER DEFAULT 1,
    sequencia_montagem  INTEGER,
    
    -- Controle de versão
    versao_bom          VARCHAR(10) DEFAULT '1.0',
    data_vigencia_inicio DATE DEFAULT CURRENT_DATE,
    data_vigencia_fim   DATE,
    
    -- Observações técnicas
    instrucoes_montagem TEXT,
    ferramentas_necessarias TEXT,
    tempo_montagem_minutos INTEGER,
    
    -- Status
    ativo               BOOLEAN DEFAULT TRUE,
    
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    
    -- Constraint para evitar auto-referência
    CHECK (id_produto_pai != id_produto_filho),
    
    -- Chave única para evitar duplicação
    UNIQUE(id_produto_pai, id_produto_filho, versao_bom)
);

-- Índices para consultas de BOM
CREATE INDEX idx_composicao_pai ON prd_04_composicao_produtos(id_produto_pai);
CREATE INDEX idx_composicao_filho ON prd_04_composicao_produtos(id_produto_filho);
CREATE INDEX idx_composicao_nivel ON prd_04_composicao_produtos(nivel_estrutura);
CREATE INDEX idx_composicao_versao ON prd_04_composicao_produtos(versao_bom);
```

---

## 🔧 MÓDULO 4: PRO - PRODUÇÃO

### 4.1 **pro_06_status_producao**
```sql
CREATE TABLE pro_06_status_producao (
    id_status_producao  SERIAL PRIMARY KEY,
    codigo              VARCHAR(10) NOT NULL UNIQUE,
    descricao           VARCHAR(100) NOT NULL,
    cor_status          VARCHAR(7) DEFAULT '#000000', -- Hex color para UI
    permite_edicao      BOOLEAN DEFAULT TRUE,
    status_final        BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Dados iniciais
INSERT INTO pro_06_status_producao (codigo, descricao, cor_status, permite_edicao, status_final) VALUES
('PLANEJADA', 'Planejada', '#FFA500', TRUE, FALSE),
('LIBERADA', 'Liberada', '#4169E1', TRUE, FALSE),
('INICIADA', 'Em Produção', '#32CD32', TRUE, FALSE),
('PAUSADA', 'Pausada', '#FFD700', TRUE, FALSE),
('FINALIZADA', 'Finalizada', '#008000', FALSE, TRUE),
('CANCELADA', 'Cancelada', '#DC143C', FALSE, TRUE);
```

### 4.2 **pro_05_ordens_producao**
```sql
CREATE TABLE pro_05_ordens_producao (
    id_ordem_producao       SERIAL PRIMARY KEY,
    numero_ordem            VARCHAR(20) NOT NULL UNIQUE,
    
    -- Datas de planejamento
    data_emissao            DATE NOT NULL DEFAULT CURRENT_DATE,
    data_inicio_prevista    DATE,
    data_fim_prevista       DATE,
    data_inicio_real        DATE,
    data_fim_real           DATE,
    
    -- Relacionamentos
    id_cliente              INTEGER REFERENCES cad_03_clientes(id_cliente), -- Para produção sob encomenda
    id_produto              INTEGER NOT NULL REFERENCES prd_03_produtos(id_produto),
    id_deposito_origem      INTEGER REFERENCES loc_03_depositos(id_deposito), -- Dep. de insumos
    id_deposito_destino     INTEGER REFERENCES loc_03_depositos(id_deposito), -- Dep. de produtos acabados
    id_status_producao      INTEGER NOT NULL REFERENCES pro_06_status_producao(id_status_producao),
    
    -- Quantidades
    quantidade_planejada    NUMERIC(15,3) NOT NULL,
    quantidade_produzida    NUMERIC(15,3) DEFAULT 0,
    quantidade_refugo       NUMERIC(15,3) DEFAULT 0,
    
    -- Custos planejados vs reais
    custo_planejado         NUMERIC(15,2),
    custo_real              NUMERIC(15,2),
    custo_mao_obra          NUMERIC(15,2),
    custo_overhead          NUMERIC(15,2),
    
    -- Controle de versão do BOM
    versao_bom_utilizada    VARCHAR(10),
    
    -- Informações adicionais
    prioridade              INTEGER DEFAULT 5 CHECK (prioridade BETWEEN 1 AND 10), -- 1=Baixa, 10=Alta
    tipo_ordem              VARCHAR(20) DEFAULT 'PRODUCAO', -- PRODUCAO, MANUTENCAO, RETRABALHO
    origem_demanda          VARCHAR(20), -- ESTOQUE, PEDIDO_CLIENTE, PREVISAO
    
    -- Controle de qualidade
    aprovacao_qualidade     BOOLEAN DEFAULT FALSE,
    data_aprovacao_qualidade DATE,
    responsavel_qualidade   VARCHAR(100),
    
    -- Observações e instruções
    observacoes             TEXT,
    instrucoes_especiais    TEXT,
    
    -- Responsáveis
    responsavel_producao    VARCHAR(100),
    turno_producao          VARCHAR(20),
    linha_producao          VARCHAR(50),
    
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_ordem_numero ON pro_05_ordens_producao(numero_ordem);
CREATE INDEX idx_ordem_produto ON pro_05_ordens_producao(id_produto);
CREATE INDEX idx_ordem_status ON pro_05_ordens_producao(id_status_producao);
CREATE INDEX idx_ordem_cliente ON pro_05_ordens_producao(id_cliente);
CREATE INDEX idx_ordem_data_prevista ON pro_05_ordens_producao(data_fim_prevista);
CREATE INDEX idx_ordem_prioridade ON pro_05_ordens_producao(prioridade);
```

### 4.3 **pro_04_itens_ordem_producao**
```sql
CREATE TABLE pro_04_itens_ordem_producao (
    id_item_ordem_producao  SERIAL PRIMARY KEY,
    id_ordem_producao       INTEGER NOT NULL REFERENCES pro_05_ordens_producao(id_ordem_producao) ON DELETE CASCADE,
    id_produto              INTEGER NOT NULL REFERENCES prd_03_produtos(id_produto),
    
    -- Tipo do item na ordem
    tipo_item               VARCHAR(20) NOT NULL CHECK (tipo_item IN ('INSUMO', 'PRODUTO', 'SUBPRODUTO', 'REFUGO')),
    
    -- Quantidades planejadas
    quantidade_planejada    NUMERIC(15,3) NOT NULL,
    quantidade_necessaria   NUMERIC(15,3), -- Baseada no BOM
    quantidade_disponivel   NUMERIC(15,3), -- Disponível em estoque
    quantidade_reservada    NUMERIC(15,3) DEFAULT 0,
    
    -- Quantidades reais (consumo/produção)
    quantidade_consumida    NUMERIC(15,3) DEFAULT 0,
    quantidade_produzida    NUMERIC(15,3) DEFAULT 0,
    quantidade_refugada     NUMERIC(15,3) DEFAULT 0,
    
    -- Custos
    custo_unitario_planejado NUMERIC(15,4),
    custo_unitario_real      NUMERIC(15,4),
    custo_total_planejado    NUMERIC(15,2),
    custo_total_real         NUMERIC(15,2),
    
    -- Controle de movimentação
    id_movimentacao_saida    INTEGER REFERENCES est_04_movimentacoes(id_movimentacao),
    id_movimentacao_entrada  INTEGER REFERENCES est_04_movimentacoes(id_movimentacao),
    
    -- Lotes e rastreabilidade
    lote_origem             VARCHAR(50),
    lote_destino            VARCHAR(50),
    data_consumo            TIMESTAMP,
    data_producao           TIMESTAMP,
    
    -- Observações específicas
    observacoes             TEXT,
    motivo_refugo           TEXT,
    
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_item_ordem_producao ON pro_04_itens_ordem_producao(id_ordem_producao);
CREATE INDEX idx_item_produto ON pro_04_itens_ordem_producao(id_produto);
CREATE INDEX idx_item_tipo ON pro_04_itens_ordem_producao(tipo_item);
CREATE INDEX idx_item_lote ON pro_04_itens_ordem_producao(lote_origem);
```

---

## 💰 MÓDULO 5: VND - VENDAS

### 5.1 **vnd_07_condicoes_pagamento**
```sql
CREATE TABLE vnd_07_condicoes_pagamento (
    id_condicao_pagamento   SERIAL PRIMARY KEY,
    codigo                  VARCHAR(10) NOT NULL UNIQUE,
    descricao               VARCHAR(100) NOT NULL,
    dias_vencimento         INTEGER DEFAULT 0,
    desconto_percentual     NUMERIC(5,2) DEFAULT 0,
    acrescimo_percentual    NUMERIC(5,2) DEFAULT 0,
    numero_parcelas         INTEGER DEFAULT 1,
    intervalo_parcelas_dias INTEGER DEFAULT 30,
    ativo                   BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- Dados iniciais
INSERT INTO vnd_07_condicoes_pagamento (codigo, descricao, dias_vencimento, desconto_percentual, numero_parcelas) VALUES
('AV', 'À Vista', 0, 5.0, 1),
('30DD', '30 Dias', 30, 0, 1),
('2X30', '2x30 Dias', 30, 0, 2),
('3X30', '3x30 Dias', 30, 0, 3);
```

### 5.2 **vnd_05_vendas**
```sql
CREATE TABLE vnd_05_vendas (
    id_venda                    SERIAL PRIMARY KEY,
    id_cliente                  INTEGER NOT NULL REFERENCES cad_03_clientes(id_cliente),
    id_vendedor                 INTEGER, -- Referência a tabela de funcionários (futura)
    id_condicao_pagamento       INTEGER REFERENCES vnd_07_condicoes_pagamento(id_condicao_pagamento),
    
    -- Identificação
    numero_pedido               VARCHAR(20) NOT NULL UNIQUE,
    numero_pedido_cliente       VARCHAR(50), -- Número do pedido no sistema do cliente
    
    -- Datas
    data_pedido                 DATE NOT NULL DEFAULT CURRENT_DATE,
    data_entrega_prevista       DATE,
    data_entrega_real           DATE,
    data_faturamento            DATE,
    
    -- Valores
    valor_total_produtos        NUMERIC(15,2) DEFAULT 0,
    valor_desconto              NUMERIC(15,2) DEFAULT 0,
    valor_frete                 NUMERIC(15,2) DEFAULT 0,
    valor_seguro                NUMERIC(15,2) DEFAULT 0,
    valor_outras_despesas       NUMERIC(15,2) DEFAULT 0,
    valor_total                 NUMERIC(15,2) DEFAULT 0,
    
    -- Status e controle
    status                      VARCHAR(20) DEFAULT 'ORCAMENTO', -- ORCAMENTO, CONFIRMADO, PRODUCAO, FATURADO, ENTREGUE, CANCELADO
    origem_venda                VARCHAR(20), -- INTERNO, SITE, WHATSAPP, REPRESENTANTE
    canal_venda                 VARCHAR(50),
    prioridade                  INTEGER DEFAULT 5 CHECK (prioridade BETWEEN 1 AND 10),
    
    -- Relacionamento com leads
    id_lead_origem              INTEGER REFERENCES cad_08_leads(id_lead),
    
    -- Entrega
    endereco_entrega            JSONB,
    transportadora              VARCHAR(100),
    tipo_frete                  VARCHAR(20), -- CIF, FOB
    
    -- Observações
    observacoes                 TEXT,
    observacoes_internas        TEXT,
    condicoes_especiais         TEXT,
    
    -- Aprovações
    requer_aprovacao            BOOLEAN DEFAULT FALSE,
    aprovado                    BOOLEAN DEFAULT FALSE,
    data_aprovacao              DATE,
    aprovado_por                VARCHAR(100),
    
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_vendas_cliente ON vnd_05_vendas(id_cliente);
CREATE INDEX idx_vendas_numero ON vnd_05_vendas(numero_pedido);
CREATE INDEX idx_vendas_status ON vnd_05_vendas(status);
CREATE INDEX idx_vendas_data ON vnd_05_vendas(data_pedido);
CREATE INDEX idx_vendas_lead ON vnd_05_vendas(id_lead_origem);
```

### 5.3 **vnd_06_itens_venda**
```sql
CREATE TABLE vnd_06_itens_venda (
    id_item_venda           SERIAL PRIMARY KEY,
    id_venda                INTEGER NOT NULL REFERENCES vnd_05_vendas(id_venda) ON DELETE CASCADE,
    id_produto              INTEGER NOT NULL REFERENCES prd_03_produtos(id_produto),
    
    -- Sequência e identificação
    numero_item             INTEGER NOT NULL,
    codigo_produto_cliente  VARCHAR(50), -- Código do produto no sistema do cliente
    
    -- Quantidades
    quantidade              NUMERIC(15,4) NOT NULL,
    unidade_medida          VARCHAR(10) DEFAULT 'UN',
    quantidade_entregue     NUMERIC(15,4) DEFAULT 0,
    saldo_entregar          NUMERIC(15,4),
    
    -- Preços e valores
    valor_unitario          NUMERIC(15,4) NOT NULL,
    valor_total_item        NUMERIC(15,2),
    valor_desconto_item     NUMERIC(15,2) DEFAULT 0,
    percentual_desconto     NUMERIC(5,2) DEFAULT 0,
    
    -- Datas específicas do item
    data_entrega_prevista   DATE,
    data_entrega_real       DATE,
    
    -- Produção relacionada
    id_ordem_producao       INTEGER REFERENCES pro_05_ordens_producao(id_ordem_producao),
    produzir_sob_encomenda  BOOLEAN DEFAULT FALSE,
    especificacoes_especiais TEXT,
    
    -- Controle de estoque
    reserva_estoque         BOOLEAN DEFAULT TRUE,
    id_reserva_estoque      INTEGER, -- Referência futura a tabela de reservas
    
    -- Status do item
    status_item             VARCHAR(20) DEFAULT 'PENDENTE', -- PENDENTE, PRODUCAO, DISPONIVEL, ENTREGUE, CANCELADO
    
    -- Observações
    observacoes             TEXT,
    
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW(),
    
    -- Constraint para garantir sequência única por venda
    UNIQUE(id_venda, numero_item)
);

-- Índices
CREATE INDEX idx_itens_venda ON vnd_06_itens_venda(id_venda);
CREATE INDEX idx_itens_produto ON vnd_06_itens_venda(id_produto);
CREATE INDEX idx_itens_status ON vnd_06_itens_venda(status_item);
CREATE INDEX idx_itens_ordem_producao ON vnd_06_itens_venda(id_ordem_producao);
```

---

## 🛒 MÓDULO 6: CMP - COMPRAS

### 6.1 **cmp_09_tipos_compra**
```sql
CREATE TABLE cmp_09_tipos_compra (
    id_tipo_compra  SERIAL PRIMARY KEY,
    codigo_tipo     VARCHAR(20) NOT NULL UNIQUE,
    descricao       VARCHAR(100) NOT NULL,
    observacoes     TEXT,
    ativo           BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Dados iniciais
INSERT INTO cmp_09_tipos_compra (codigo_tipo, descricao) VALUES
('NACIONAL', 'Compra Nacional'),
('IMPORTACAO', 'Importação'),
('SERVICO', 'Prestação de Serviços'),
('CONSUMO', 'Material de Consumo');
```

### 6.2 **cmp_07_compras**
```sql
CREATE TABLE cmp_07_compras (
    id_compra                   SERIAL PRIMARY KEY,
    id_fornecedor               INTEGER NOT NULL REFERENCES cad_04_fornecedores(id_fornecedor),
    id_tipo_compra              INTEGER REFERENCES cmp_09_tipos_compra(id_tipo_compra),
    id_condicao_pagamento       INTEGER REFERENCES vnd_07_condicoes_pagamento(id_condicao_pagamento),
    
    -- Identificação
    numero_pedido               VARCHAR(20) NOT NULL UNIQUE,
    numero_cotacao              VARCHAR(50),
    
    -- Datas
    data_pedido                 DATE NOT NULL DEFAULT CURRENT_DATE,
    data_entrega_prevista       DATE,
    data_entrega_real           DATE,
    data_aprovacao              DATE,
    
    -- Valores
    valor_total_produtos        NUMERIC(15,2) DEFAULT 0,
    valor_desconto              NUMERIC(15,2) DEFAULT 0,
    valor_frete                 NUMERIC(15,2) DEFAULT 0,
    valor_seguro                NUMERIC(15,2) DEFAULT 0,
    valor_outras_despesas       NUMERIC(15,2) DEFAULT 0,
    valor_total                 NUMERIC(15,2) DEFAULT 0,
    
    -- Para importação (integração com importacao_)
    id_proforma_invoice         INTEGER REFERENCES importacao_01_1_proforma_invoice(id),
    moeda                       VARCHAR(3) DEFAULT 'BRL',
    taxa_cambio                 NUMERIC(10,6),
    valor_total_moeda_origem    NUMERIC(15,2),
    
    -- Status e controle
    status                      VARCHAR(20) DEFAULT 'SOLICITADO', -- SOLICITADO, APROVADO, ENVIADO, RECEBIDO, CANCELADO
    urgente                     BOOLEAN DEFAULT FALSE,
    
    -- Entrega
    endereco_entrega            JSONB,
    contato_recebimento         VARCHAR(100),
    
    -- Aprovação
    requer_aprovacao            BOOLEAN DEFAULT TRUE,
    aprovado                    BOOLEAN DEFAULT FALSE,
    aprovado_por                VARCHAR(100),
    motivo_reprovacao           TEXT,
    
    -- Observações
    observacoes                 TEXT,
    condicoes_especiais         TEXT,
    
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_compras_fornecedor ON cmp_07_compras(id_fornecedor);
CREATE INDEX idx_compras_numero ON cmp_07_compras(numero_pedido);
CREATE INDEX idx_compras_status ON cmp_07_compras(status);
CREATE INDEX idx_compras_proforma ON cmp_07_compras(id_proforma_invoice);
```

### 6.3 **cmp_08_itens_compra**
```sql
CREATE TABLE cmp_08_itens_compra (
    id_item_compra          SERIAL PRIMARY KEY,
    id_compra               INTEGER NOT NULL REFERENCES cmp_07_compras(id_compra) ON DELETE CASCADE,
    id_produto              INTEGER NOT NULL REFERENCES prd_03_produtos(id_produto),
    
    -- Sequência
    numero_item             INTEGER NOT NULL,
    
    -- Quantidades
    quantidade              NUMERIC(15,4) NOT NULL,
    unidade_medida          VARCHAR(10) DEFAULT 'UN',
    quantidade_entregue     NUMERIC(15,4) DEFAULT 0,
    saldo_entregar          NUMERIC(15,4),
    
    -- Preços
    valor_unitario          NUMERIC(15,4) NOT NULL,
    valor_total             NUMERIC(15,2),
    valor_desconto          NUMERIC(15,2) DEFAULT 0,
    
    -- Datas específicas
    data_entrega_prevista   DATE,
    quantidade_recebida     NUMERIC(15,4) DEFAULT 0,
    data_ultimo_recebimento DATE,
    
    -- Controle de qualidade
    inspecao_obrigatoria    BOOLEAN DEFAULT FALSE,
    aprovado_qualidade      BOOLEAN DEFAULT FALSE,
    quantidade_rejeitada    NUMERIC(15,4) DEFAULT 0,
    motivo_rejeicao         TEXT,
    
    -- Observações
    observacoes             TEXT,
    especificacoes_tecnicas TEXT,
    
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(id_compra, numero_item)
);

-- Índices
CREATE INDEX idx_itens_compra ON cmp_08_itens_compra(id_compra);
CREATE INDEX idx_itens_compra_produto ON cmp_08_itens_compra(id_produto);
```

---

## 📄 MÓDULO 7: FIS - FISCAL

### 7.1 **fis_08_tipos_operacao**
```sql
CREATE TABLE fis_08_tipos_operacao (
    id_tipo_operacao    SERIAL PRIMARY KEY,
    codigo              VARCHAR(20) NOT NULL UNIQUE,
    descricao           VARCHAR(100) NOT NULL,
    natureza            VARCHAR(100),
    cfop_padrao         VARCHAR(10),
    tipo_movimento      VARCHAR(10) CHECK (tipo_movimento IN ('ENTRADA', 'SAIDA')),
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Dados iniciais
INSERT INTO fis_08_tipos_operacao (codigo, descricao, natureza, cfop_padrao, tipo_movimento) VALUES
('VENDA', 'Venda de Produtos', 'Venda de mercadoria adquirida ou produzida pelo estabelecimento', '5102', 'SAIDA'),
('COMPRA', 'Compra de Produtos', 'Compra para comercialização', '1102', 'ENTRADA'),
('IMPORT', 'Importação', 'Compra para comercialização, diretamente do exterior', '3102', 'ENTRADA'),
('TRANSF', 'Transferência', 'Transferência de produtos acabados', '5152', 'SAIDA');
```

### 7.2 **fis_09_notas_fiscais**
```sql
CREATE TABLE fis_09_notas_fiscais (
    id_nota_fiscal          SERIAL PRIMARY KEY,
    id_tipo_operacao        INTEGER NOT NULL REFERENCES fis_08_tipos_operacao(id_tipo_operacao),
    
    -- Relacionamentos com outros módulos
    id_venda                INTEGER REFERENCES vnd_05_vendas(id_venda),
    id_compra               INTEGER REFERENCES cmp_07_compras(id_compra),
    id_proforma_invoice     INTEGER REFERENCES importacao_01_1_proforma_invoice(id),
    
    -- Identificação da NF
    numero_nota_fiscal      VARCHAR(20) NOT NULL,
    serie                   VARCHAR(10) NOT NULL,
    modelo                  VARCHAR(10) DEFAULT '55', -- 55=NFe, 65=NFCe
    chave_acesso            VARCHAR(44), -- Chave de acesso da NFe
    
    -- Datas
    data_emissao            DATE NOT NULL DEFAULT CURRENT_DATE,
    data_entrada_saida      DATE,
    data_autorizacao        TIMESTAMP,
    
    -- Emitente e destinatário
    id_emitente             INTEGER REFERENCES cad_01_empresas(id_empresa),
    id_destinatario_cliente INTEGER REFERENCES cad_03_clientes(id_cliente),
    id_destinatario_fornec  INTEGER REFERENCES cad_04_fornecedores(id_fornecedor),
    
    -- Valores
    valor_produtos          NUMERIC(15,2) DEFAULT 0,
    valor_frete             NUMERIC(15,2) DEFAULT 0,
    valor_seguro            NUMERIC(15,2) DEFAULT 0,
    valor_desconto          NUMERIC(15,2) DEFAULT 0,
    valor_outras_despesas   NUMERIC(15,2) DEFAULT 0,
    valor_ipi               NUMERIC(15,2) DEFAULT 0,
    valor_icms              NUMERIC(15,2) DEFAULT 0,
    valor_pis               NUMERIC(15,2) DEFAULT 0,
    valor_cofins            NUMERIC(15,2) DEFAULT 0,
    valor_total             NUMERIC(15,2) DEFAULT 0,
    
    -- Status fiscal
    situacao_fiscal         VARCHAR(20) DEFAULT 'DIGITACAO', -- DIGITACAO, TRANSMITIDA, AUTORIZADA, CANCELADA, DENEGADA
    protocolo_autorizacao   VARCHAR(50),
    motivo_cancelamento     TEXT,
    
    -- Observações
    observacoes             TEXT,
    informacoes_adicionais  TEXT,
    
    -- Arquivo XML
    arquivo_xml             TEXT, -- XML da NFe
    
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW(),
    
    -- Garantir numeração única por série
    UNIQUE(numero_nota_fiscal, serie, id_emitente)
);

-- Índices
CREATE INDEX idx_nf_numero ON fis_09_notas_fiscais(numero_nota_fiscal, serie);
CREATE INDEX idx_nf_chave ON fis_09_notas_fiscais(chave_acesso);
CREATE INDEX idx_nf_data_emissao ON fis_09_notas_fiscais(data_emissao);
CREATE INDEX idx_nf_situacao ON fis_09_notas_fiscais(situacao_fiscal);
CREATE INDEX idx_nf_venda ON fis_09_notas_fiscais(id_venda);
CREATE INDEX idx_nf_compra ON fis_09_notas_fiscais(id_compra);
CREATE INDEX idx_nf_proforma ON fis_09_notas_fiscais(id_proforma_invoice);
```

### 7.3 **fis_10_itens_nota_fiscal**
```sql
CREATE TABLE fis_10_itens_nota_fiscal (
    id_item_nota_fiscal     SERIAL PRIMARY KEY,
    id_nota_fiscal          INTEGER NOT NULL REFERENCES fis_09_notas_fiscais(id_nota_fiscal) ON DELETE CASCADE,
    id_produto              INTEGER NOT NULL REFERENCES prd_03_produtos(id_produto),
    
    -- Sequência e identificação
    numero_item             INTEGER NOT NULL,
    codigo_produto          VARCHAR(50),
    
    -- Descrição e classificação
    descricao_produto       VARCHAR(100),
    ncm                     VARCHAR(10),
    cfop                    VARCHAR(10),
    cst_icms                VARCHAR(10),
    cst_pis                 VARCHAR(10),
    cst_cofins              VARCHAR(10),
    
    -- Quantidades
    quantidade              NUMERIC(15,4) NOT NULL,
    unidade_medida          VARCHAR(10) DEFAULT 'UN',
    
    -- Valores
    valor_unitario          NUMERIC(15,4) NOT NULL,
    valor_total_produto     NUMERIC(15,2),
    valor_desconto          NUMERIC(15,2) DEFAULT 0,
    valor_frete             NUMERIC(15,2) DEFAULT 0,
    valor_seguro            NUMERIC(15,2) DEFAULT 0,
    valor_outras_despesas   NUMERIC(15,2) DEFAULT 0,
    
    -- ICMS
    base_calculo_icms       NUMERIC(15,2) DEFAULT 0,
    aliquota_icms           NUMERIC(5,2) DEFAULT 0,
    valor_icms              NUMERIC(15,2) DEFAULT 0,
    
    -- IPI
    base_calculo_ipi        NUMERIC(15,2) DEFAULT 0,
    aliquota_ipi            NUMERIC(5,2) DEFAULT 0,
    valor_ipi               NUMERIC(15,2) DEFAULT 0,
    
    -- PIS
    base_calculo_pis        NUMERIC(15,2) DEFAULT 0,
    aliquota_pis            NUMERIC(5,2) DEFAULT 0,
    valor_pis               NUMERIC(15,2) DEFAULT 0,
    
    -- COFINS
    base_calculo_cofins     NUMERIC(15,2) DEFAULT 0,
    aliquota_cofins         NUMERIC(5,2) DEFAULT 0,
    valor_cofins            NUMERIC(15,2) DEFAULT 0,
    
    -- Relacionamento com outros itens
    id_item_venda           INTEGER REFERENCES vnd_06_itens_venda(id_item_venda),
    id_item_compra          INTEGER REFERENCES cmp_08_itens_compra(id_item_compra),
    
    -- Rastreabilidade
    numero_lote             VARCHAR(50),
    data_fabricacao         DATE,
    data_validade           DATE,
    
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(id_nota_fiscal, numero_item)
);

-- Índices
CREATE INDEX idx_itens_nf ON fis_10_itens_nota_fiscal(id_nota_fiscal);
CREATE INDEX idx_itens_nf_produto ON fis_10_itens_nota_fiscal(id_produto);
CREATE INDEX idx_itens_nf_ncm ON fis_10_itens_nota_fiscal(ncm);
```

---

## 🚚 MÓDULO 8: LOG - LOGÍSTICA

### 8.1 **log_06_entregas**
```sql
CREATE TABLE log_06_entregas (
    id_entrega              SERIAL PRIMARY KEY,
    id_venda                INTEGER REFERENCES vnd_05_vendas(id_venda),
    id_transportador        INTEGER REFERENCES cad_05_transportadores(id_transportador),
    
    -- Identificação
    numero_entrega          VARCHAR(20) NOT NULL UNIQUE,
    numero_rastreamento     VARCHAR(50),
    
    -- Datas
    data_programada         DATE NOT NULL,
    data_carregamento       DATE,
    data_entrega_realizada  DATE,
    data_comprovacao        DATE,
    
    -- Endereço de entrega
    endereco_entrega        JSONB NOT NULL,
    contato_recebimento     VARCHAR(100),
    telefone_contato        VARCHAR(20),
    
    -- Status
    status_entrega          VARCHAR(20) DEFAULT 'PROGRAMADA', -- PROGRAMADA, CARREGADA, TRANSITO, ENTREGUE, DEVOLVIDA
    
    -- Observações
    observacoes             TEXT,
    instrucoes_especiais    TEXT,
    motivo_devolucao        TEXT,
    
    -- Comprovação
    nome_recebedor          VARCHAR(100),
    documento_recebedor     VARCHAR(20),
    assinatura_digital      TEXT, -- Base64 da assinatura
    foto_comprovacao        TEXT, -- URL ou base64 da foto
    
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_entregas_venda ON log_06_entregas(id_venda);
CREATE INDEX idx_entregas_status ON log_06_entregas(status_entrega);
CREATE INDEX idx_entregas_data ON log_06_entregas(data_programada);
```

### 8.2 **log_05_itens_entrega**
```sql
CREATE TABLE log_05_itens_entrega (
    id_item_entrega         SERIAL PRIMARY KEY,
    id_entrega              INTEGER NOT NULL REFERENCES log_06_entregas(id_entrega) ON DELETE CASCADE,
    id_item_venda           INTEGER NOT NULL REFERENCES vnd_06_itens_venda(id_item_venda),
    id_produto              INTEGER NOT NULL REFERENCES prd_03_produtos(id_produto),
    
    -- Quantidades
    quantidade_programada   NUMERIC(15,3) NOT NULL,
    quantidade_carregada    NUMERIC(15,3) DEFAULT 0,
    quantidade_entregue     NUMERIC(15,3) DEFAULT 0,
    quantidade_devolvida    NUMERIC(15,3) DEFAULT 0,
    
    -- Rastreabilidade
    numero_serie            VARCHAR(50),
    numero_lote             VARCHAR(50),
    
    -- Status do item
    status_item             VARCHAR(20) DEFAULT 'PROGRAMADO', -- PROGRAMADO, CARREGADO, ENTREGUE, DEVOLVIDO
    motivo_devolucao        TEXT,
    
    -- Observações
    observacoes             TEXT,
    condicao_produto        VARCHAR(50), -- PERFEITO, AVARIADO, FALTANDO_ACESSORIO
    
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_itens_entrega ON log_05_itens_entrega(id_entrega);
CREATE INDEX idx_itens_entrega_produto ON log_05_itens_entrega(id_produto);
CREATE INDEX idx_itens_entrega_venda ON log_05_itens_entrega(id_item_venda);
```

---

## 📍 MÓDULO 9: LOC - LOCALIZAÇÃO

### 9.1 **loc_01_tipos_localidade**
```sql
CREATE TABLE loc_01_tipos_localidade (
    id_tipo_localidade  SERIAL PRIMARY KEY,
    codigo              VARCHAR(10) NOT NULL UNIQUE,
    descricao           VARCHAR(100) NOT NULL,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Dados iniciais
INSERT INTO loc_01_tipos_localidade (codigo, descricao) VALUES
('MATRIZ', 'Matriz'),
('FILIAL', 'Filial'),
('DEPOSITO', 'Depósito'),
('TERCEIRO', 'Terceirizado');
```

### 9.2 **loc_02_estabelecimentos**
```sql
CREATE TABLE loc_02_estabelecimentos (
    id_estabelecimento      SERIAL PRIMARY KEY,
    id_empresa              INTEGER NOT NULL REFERENCES cad_01_empresas(id_empresa),
    id_tipo_localidade      INTEGER NOT NULL REFERENCES loc_01_tipos_localidade(id_tipo_localidade),
    
    -- Identificação
    codigo                  VARCHAR(20) NOT NULL UNIQUE,
    nome                    VARCHAR(100) NOT NULL,
    
    -- Localização
    endereco                VARCHAR(100),
    bairro                  VARCHAR(50),
    cep                     VARCHAR(10),
    municipio               VARCHAR(50),
    uf                      VARCHAR(2),
    coordenadas_gps         POINT, -- PostGIS
    
    -- Contato
    telefone                VARCHAR(20),
    email                   VARCHAR(100),
    responsavel             VARCHAR(100),
    
    -- Status
    ativo                   BOOLEAN DEFAULT TRUE,
    
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_estabelecimentos_empresa ON loc_02_estabelecimentos(id_empresa);
CREATE INDEX idx_estabelecimentos_tipo ON loc_02_estabelecimentos(id_tipo_localidade);
```

### 9.3 **loc_03_depositos**
```sql
CREATE TABLE loc_03_depositos (
    id_deposito             SERIAL PRIMARY KEY,
    id_estabelecimento      INTEGER NOT NULL REFERENCES loc_02_estabelecimentos(id_estabelecimento),
    
    -- Identificação
    codigo                  VARCHAR(20) NOT NULL UNIQUE,
    nome                    VARCHAR(100) NOT NULL,
    
    -- Características
    area_total_m2           NUMERIC(10,2),
    area_util_m2            NUMERIC(10,2),
    pe_direito_m            NUMERIC(5,2),
    capacidade_toneladas    NUMERIC(10,2),
    
    -- Tipo de armazenagem
    tipo_deposito           VARCHAR(20), -- COMUM, REFRIGERADO, QUIMICOS, INFLAMAVEIS
    temperatura_controlada  BOOLEAN DEFAULT FALSE,
    temperatura_min         NUMERIC(5,2),
    temperatura_max         NUMERIC(5,2),
    
    -- Controle
    controla_enderecamento  BOOLEAN DEFAULT TRUE,
    permite_estoque_negativo BOOLEAN DEFAULT FALSE,
    
    -- Status
    ativo                   BOOLEAN DEFAULT TRUE,
    
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_depositos_estabelecimento ON loc_03_depositos(id_estabelecimento);
CREATE INDEX idx_depositos_tipo ON loc_03_depositos(tipo_deposito);
```

### 9.4 **loc_04_enderecos_estoque**
```sql
CREATE TABLE loc_04_enderecos_estoque (
    id_endereco_estoque     SERIAL PRIMARY KEY,
    id_deposito             INTEGER NOT NULL REFERENCES loc_03_depositos(id_deposito),
    
    -- Endereçamento
    codigo_endereco         VARCHAR(20) NOT NULL,
    descricao               VARCHAR(100),
    
    -- Estrutura física
    corredor                VARCHAR(10),
    rua                     VARCHAR(10),
    modulo                  VARCHAR(10),
    nivel                   VARCHAR(10),
    posicao                 VARCHAR(10),
    
    -- Características do endereço
    tipo_endereco           VARCHAR(20), -- PISO, ESTRUTURA, MEZANINO
    capacidade_peso_kg      NUMERIC(10,2),
    capacidade_volume_m3    NUMERIC(10,2),
    largura_cm              NUMERIC(8,2),
    profundidade_cm         NUMERIC(8,2),
    altura_cm               NUMERIC(8,2),
    
    -- Restrições
    aceita_fracionado       BOOLEAN DEFAULT TRUE,
    produto_especifico      INTEGER REFERENCES prd_03_produtos(id_produto),
    observacoes_restricoes  TEXT,
    
    -- Status
    ativo                   BOOLEAN DEFAULT TRUE,
    bloqueado               BOOLEAN DEFAULT FALSE,
    motivo_bloqueio         TEXT,
    
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW(),
    
    -- Endereço único por depósito
    UNIQUE(id_deposito, codigo_endereco)
);

-- Índices
CREATE INDEX idx_enderecos_deposito ON loc_04_enderecos_estoque(id_deposito);
CREATE INDEX idx_enderecos_corredor ON loc_04_enderecos_estoque(corredor);
CREATE INDEX idx_enderecos_tipo ON loc_04_enderecos_estoque(tipo_endereco);
```

---

## 🔗 Relacionamentos Críticos e Triggers

### Triggers para Atualização Automática

#### 1. **Atualização de Saldos de Estoque**
```sql
-- Trigger para atualizar saldos após movimentação
CREATE OR REPLACE FUNCTION atualizar_saldo_estoque()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualiza saldo baseado no tipo de movimento
    IF NEW.id_indicador_credito_debito = 1 THEN -- CREDITO
        UPDATE est_03_saldos_estoque 
        SET quantidade_total = quantidade_total + NEW.quantidade,
            quantidade_disponivel = quantidade_disponivel + NEW.quantidade,
            data_ultima_entrada = NEW.data_movimento
        WHERE id_produto = NEW.id_produto 
          AND id_deposito = NEW.id_deposito;
    ELSE -- DEBITO
        UPDATE est_03_saldos_estoque 
        SET quantidade_total = quantidade_total - NEW.quantidade,
            quantidade_disponivel = quantidade_disponivel - NEW.quantidade,
            data_ultima_saida = NEW.data_movimento
        WHERE id_produto = NEW.id_produto 
          AND id_deposito = NEW.id_deposito;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_saldo_estoque
    AFTER INSERT ON est_04_movimentacoes
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_saldo_estoque();
```

#### 2. **Atualização de Histórico de Clientes**
```sql
-- Trigger para atualizar histórico de compras dos clientes
CREATE OR REPLACE FUNCTION atualizar_historico_cliente()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualiza dados do cliente após nova venda
    UPDATE cad_03_clientes 
    SET total_compras = COALESCE(total_compras, 0) + NEW.valor_total,
        ultima_compra = NEW.data_pedido,
        data_primeira_compra = CASE 
            WHEN data_primeira_compra IS NULL THEN NEW.data_pedido
            ELSE data_primeira_compra
        END
    WHERE id_cliente = NEW.id_cliente;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_historico_cliente
    AFTER INSERT ON vnd_05_vendas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_historico_cliente();
```

#### 3. **Conversão de Lead para Cliente**
```sql
-- Trigger para marcar lead como convertido
CREATE OR REPLACE FUNCTION marcar_lead_convertido()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a venda tem lead origem, marcar como convertido
    IF NEW.id_lead_origem IS NOT NULL THEN
        UPDATE cad_08_leads 
        SET status_lead = 'CONVERTIDO',
            data_conversao = NEW.data_pedido,
            id_cliente_convertido = NEW.id_cliente
        WHERE id_lead = NEW.id_lead_origem;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_marcar_lead_convertido
    AFTER INSERT ON vnd_05_vendas
    FOR EACH ROW
    EXECUTE FUNCTION marcar_lead_convertido();
```

---

## 📊 Views Úteis para Relatórios

### 1. **Dashboard de Produção**
```sql
CREATE VIEW view_dashboard_producao AS
SELECT 
    op.numero_ordem,
    op.data_inicio_prevista,
    op.data_fim_prevista,
    p.descricao as produto,
    op.quantidade_planejada,
    op.quantidade_produzida,
    sp.descricao as status,
    (op.quantidade_produzida / op.quantidade_planejada * 100) as percentual_conclusao
FROM pro_05_ordens_producao op
JOIN prd_03_produtos p ON op.id_produto = p.id_produto
JOIN pro_06_status_producao sp ON op.id_status_producao = sp.id_status_producao
WHERE op.data_fim_prevista >= CURRENT_DATE - INTERVAL '30 days';
```

### 2. **Pipeline de Vendas**
```sql
CREATE VIEW view_pipeline_vendas AS
SELECT 
    l.nome,
    l.empresa,
    l.origem_lead,
    l.status_lead,
    l.valor_estimado_negocio,
    l.probabilidade_fechamento,
    l.data_primeiro_contato,
    l.vendedor_responsavel,
    c.nome_razao_social as cliente_convertido
FROM cad_08_leads l
LEFT JOIN cad_03_clientes c ON l.id_cliente_convertido = c.id_cliente
WHERE l.status_lead IN ('QUALIFICADO', 'EM_NEGOCIACAO')
ORDER BY l.valor_estimado_negocio DESC;
```

### 3. **Relatório de Estoque Crítico**
```sql
CREATE VIEW view_estoque_critico AS
SELECT 
    p.codigo,
    p.descricao,
    d.nome as deposito,
    s.quantidade_disponivel,
    p.estoque_minimo,
    (s.quantidade_disponivel - p.estoque_minimo) as diferenca,
    p.lead_time_dias,
    f.nome_razao_social as fornecedor
FROM est_03_saldos_estoque s
JOIN prd_03_produtos p ON s.id_produto = p.id_produto
JOIN loc_03_depositos d ON s.id_deposito = d.id_deposito
LEFT JOIN cad_04_fornecedores f ON p.id_fornecedor = f.id_fornecedor
WHERE s.quantidade_disponivel <= p.estoque_minimo
ORDER BY (s.quantidade_disponivel - p.estoque_minimo) ASC;
```

---

*Documentação Técnica Completa - NXT Indústria e Comércio Ltda*  
*Criado em: 2025-07-05*  
*Versão: 1.0*