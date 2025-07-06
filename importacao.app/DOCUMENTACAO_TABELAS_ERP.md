# Documentação Completa do Sistema ERP

## Visão Geral

O sistema ERP é composto por 46 tabelas organizadas em 9 módulos principais que controlam todas as operações da empresa, desde cadastros básicos até processos de importação, vendas, compras, estoque, produção e logística.

## Módulos do Sistema

### 📋 **CAD** - Cadastros Básicos (5 tabelas)
- **cad_01_empresas**: Cadastro de empresas
- **cad_02_bancos**: Cadastro de bancos  
- **cad_03_clientes**: Cadastro de clientes
- **cad_04_fornecedores**: Cadastro de fornecedores
- **cad_05_transportadores**: Cadastro de transportadores

### 🛒 **CMP** - Compras (3 tabelas)
- **cmp_07_compras**: Pedidos de compra
- **cmp_08_itens_compra**: Itens dos pedidos de compra
- **cmp_09_tipos_compra**: Tipos de operações de compra

### 📦 **EST** - Estoque (4 tabelas)
- **est_01_tipos_movimento**: Tipos de movimentação de estoque
- **est_02_indicadores_cd**: Indicadores de crédito/débito
- **est_03_saldos_estoque**: Saldos atuais de estoque
- **est_04_movimentacoes**: Movimentações de estoque

### 📄 **FIS** - Fiscal (3 tabelas)
- **fis_08_tipos_operacao**: Tipos de operações fiscais
- **fis_09_notas_fiscais**: Notas fiscais
- **fis_10_itens_nota_fiscal**: Itens das notas fiscais

### 🌍 **IMP** - Importação (15 tabelas)
- **imp_05_proforma_invoices**: Proforma invoices
- **imp_06_proforma_invoice_itens**: Itens das proforma invoices
- **imp_07_commercial_invoices**: Commercial invoices
- **imp_08_commercial_invoice_itens**: Itens das commercial invoices
- **imp_09_packing_lists**: Packing lists
- **imp_10_conhecimentos_embarque**: Conhecimentos de embarque
- **imp_11_declaracoes_importacao**: Declarações de importação
- **imp_12_di_adicoes**: Adições das DI
- **imp_13_documentos_importacao**: Documentos de importação
- **imp_14_seguros_transporte**: Seguros de transporte
- **imp_15_custos_importacao**: Custos de importação
- **imp_16_pagamentos_importacao**: Pagamentos de importação
- **imp_17_fechamentos_importacao**: Fechamentos de importação
- **imp_18_importacao_itens_resumo**: Resumo de itens de importação
- **imp_19_contratos_cambio**: Contratos de câmbio

### 📍 **LOC** - Localização (4 tabelas)
- **loc_01_tipos_localidade**: Tipos de localidade
- **loc_02_estabelecimentos**: Estabelecimentos
- **loc_03_depositos**: Depósitos
- **loc_04_enderecos_estoque**: Endereços de estoque

### 🚚 **LOG** - Logística (2 tabelas)
- **log_05_itens_entrega**: Itens de entrega
- **log_06_entregas**: Entregas

### 🏭 **PRD** - Produtos (4 tabelas)
- **prd_01_tipos_produto**: Tipos de produto
- **prd_02_modelos**: Modelos de produto
- **prd_03_produtos**: Produtos
- **prd_04_composicao_produtos**: Composição de produtos

### 🔧 **PRO** - Produção (3 tabelas)
- **pro_04_itens_ordem_producao**: Itens de ordem de produção
- **pro_05_ordens_producao**: Ordens de produção
- **pro_06_status_producao**: Status de produção

### 💰 **VND** - Vendas (3 tabelas)
- **vnd_05_vendas**: Vendas
- **vnd_06_itens_venda**: Itens de venda
- **vnd_07_condicoes_pagamento**: Condições de pagamento

---

## Estrutura Completa das Tabelas

### 📋 **MÓDULO CAD - CADASTROS BÁSICOS**

#### 1. **cad_01_empresas**
**Descrição**: Cadastro de empresas do grupo/sistema.

**Colunas**:
- **id_empresa** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único da empresa
- **cnpj** (`character varying(18)`, NOT NULL) - CNPJ da empresa
- **razao_social** (`character varying(100)`, NOT NULL) - Razão social da empresa
- **inscricao_estadual** (`character varying(20)`, nullable) - Inscrição estadual
- **endereco** (`character varying(100)`, nullable) - Endereço completo
- **bairro** (`character varying(50)`, nullable) - Bairro
- **cep** (`character varying(10)`, nullable) - CEP
- **municipio** (`character varying(50)`, nullable) - Município
- **uf** (`character varying(2)`, nullable) - Unidade federativa
- **telefone** (`character varying(20)`, nullable) - Telefone de contato
- **email** (`character varying(100)`, nullable) - Email de contato
- **website** (`character varying(100)`, nullable) - Website da empresa
- **ativo** (`boolean`, nullable, default: true) - Status ativo/inativo
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 2. **cad_02_bancos**
**Descrição**: Cadastro de bancos para operações financeiras.

**Colunas**:
- **id_banco** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do banco
- **nome** (`character varying(100)`, NOT NULL) - Nome do banco
- **codigo** (`character varying(10)`, NOT NULL) - Código do banco
- **ativo** (`boolean`, nullable, default: true) - Status ativo/inativo
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 3. **cad_03_clientes**
**Descrição**: Cadastro de clientes pessoa física ou jurídica.

**Colunas**:
- **id_cliente** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do cliente
- **tipo_pessoa** (`character varying(10)`, NOT NULL) - Tipo de pessoa (F=Física, J=Jurídica)
- **cnpj_cpf** (`character varying(18)`, NOT NULL) - CNPJ ou CPF do cliente
- **nome_razao_social** (`character varying(100)`, NOT NULL) - Nome ou razão social
- **inscricao_estadual** (`character varying(20)`, nullable) - Inscrição estadual
- **endereco** (`character varying(100)`, nullable) - Endereço completo
- **bairro** (`character varying(50)`, nullable) - Bairro
- **cep** (`character varying(10)`, nullable) - CEP
- **municipio** (`character varying(50)`, nullable) - Município
- **uf** (`character varying(2)`, nullable) - Unidade federativa
- **telefone** (`character varying(20)`, nullable) - Telefone de contato
- **email** (`character varying(100)`, nullable) - Email de contato
- **ativo** (`boolean`, nullable, default: true) - Status ativo/inativo
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 4. **cad_04_fornecedores**
**Descrição**: Cadastro de fornecedores nacionais e internacionais.

**Colunas**:
- **id_fornecedor** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do fornecedor
- **tipo_pessoa** (`character varying(10)`, NOT NULL) - Tipo de pessoa (F=Física, J=Jurídica)
- **cnpj_cpf** (`character varying(18)`, nullable) - CNPJ ou CPF do fornecedor
- **nome_razao_social** (`character varying(100)`, NOT NULL) - Nome ou razão social
- **inscricao_estadual** (`character varying(20)`, nullable) - Inscrição estadual
- **endereco** (`character varying(100)`, nullable) - Endereço completo
- **bairro** (`character varying(50)`, nullable) - Bairro
- **cep** (`character varying(10)`, nullable) - CEP
- **municipio** (`character varying(50)`, nullable) - Município
- **uf** (`character varying(2)`, nullable) - Unidade federativa
- **pais** (`character varying(50)`, nullable, default: 'Brasil') - País do fornecedor
- **telefone** (`character varying(20)`, nullable) - Telefone de contato
- **email** (`character varying(100)`, nullable) - Email de contato
- **contato_responsavel** (`character varying(100)`, nullable) - Nome do contato responsável
- **ativo** (`boolean`, nullable, default: true) - Status ativo/inativo
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 5. **cad_05_transportadores**
**Descrição**: Cadastro de empresas transportadoras.

**Colunas**:
- **id_transportador** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do transportador
- **id_fornecedor** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao fornecedor → cad_04_fornecedores(id_fornecedor)
- **tipo_transporte** (`character varying(20)`, nullable) - Tipo de transporte (Rodoviário, Marítimo, Aéreo)
- **capacidade_carga** (`numeric(15,2)`, nullable) - Capacidade de carga em toneladas
- **id_nota_fiscal** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à nota fiscal → fis_09_notas_fiscais(id_nota_fiscal)
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

---

### 🛒 **MÓDULO CMP - COMPRAS**

#### 6. **cmp_07_compras**
**Descrição**: Pedidos de compra realizados com fornecedores.

**Colunas**:
- **id_compra** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único da compra
- **id_fornecedor** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência ao fornecedor → cad_04_fornecedores(id_fornecedor)
- **id_tipo_compra** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao tipo de compra → cmp_09_tipos_compra(id_tipo_compra)
- **id_condicao_pagamento** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à condição de pagamento → vnd_07_condicoes_pagamento(id_condicao_pagamento)
- **numero_pedido** (`character varying(20)`, NOT NULL) - Número do pedido de compra
- **data_pedido** (`date`, NOT NULL) - Data do pedido
- **data_entrega_prevista** (`date`, nullable) - Data prevista para entrega
- **valor_total_produtos** (`numeric(15,2)`, nullable) - Valor total dos produtos
- **valor_desconto** (`numeric(15,2)`, nullable) - Valor do desconto
- **valor_frete** (`numeric(15,2)`, nullable) - Valor do frete
- **valor_total** (`numeric(15,2)`, nullable) - Valor total da compra
- **observacoes** (`text`, nullable) - Observações do pedido
- **status** (`character varying(20)`, nullable) - Status do pedido
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 7. **cmp_08_itens_compra**
**Descrição**: Itens detalhados dos pedidos de compra.

**Colunas**:
- **id_item_compra** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do item
- **id_compra** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência à compra → cmp_07_compras(id_compra)
- **id_produto** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência ao produto → prd_03_produtos(id_produto)
- **numero_item** (`integer(32,0)`, NOT NULL) - Número sequencial do item
- **quantidade** (`numeric(15,4)`, nullable) - Quantidade solicitada
- **unidade_medida** (`character varying(10)`, nullable) - Unidade de medida
- **valor_unitario** (`numeric(15,4)`, nullable) - Valor unitário
- **valor_total** (`numeric(15,2)`, nullable) - Valor total do item
- **valor_desconto** (`numeric(15,2)`, nullable) - Valor do desconto
- **data_entrega_prevista** (`date`, nullable) - Data prevista de entrega
- **quantidade_entregue** (`numeric(15,4)`, nullable) - Quantidade já entregue
- **saldo_entregar** (`numeric(15,4)`, nullable) - Saldo a entregar
- **observacoes** (`text`, nullable) - Observações do item
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 8. **cmp_09_tipos_compra**
**Descrição**: Tipos de operações de compra (Nacional, Importação, etc.).

**Colunas**:
- **id_tipo_compra** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do tipo
- **codigo_tipo** (`character varying(20)`, NOT NULL) - Código do tipo de compra
- **descricao** (`character varying(100)`, NOT NULL) - Descrição do tipo
- **observacoes** (`text`, nullable) - Observações
- **ativo** (`boolean`, nullable, default: true) - Status ativo/inativo
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

---

### 📦 **MÓDULO EST - ESTOQUE**

#### 9. **est_01_tipos_movimento**
**Descrição**: Tipos de movimentação de estoque (Entrada, Saída, Transferência, etc.).

**Colunas**:
- **id_tipo_movimento** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do tipo
- **codigo** (`character varying(3)`, NOT NULL) - Código do tipo (ENT, SAI, TRF)
- **descricao** (`character varying(100)`, NOT NULL) - Descrição do tipo de movimento
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 10. **est_02_indicadores_cd**
**Descrição**: Indicadores de crédito e débito para movimentações de estoque.

**Colunas**:
- **id_indicador_credito_debito** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único
- **indicador** (`character varying(3)`, NOT NULL) - Indicador (CRE, DEB)
- **descricao** (`character varying(100)`, NOT NULL) - Descrição do indicador
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 11. **est_03_saldos_estoque**
**Descrição**: Saldos atuais de estoque por produto, depósito e endereço.

**Colunas**:
- **id_saldo_estoque** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único
- **id_produto** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência ao produto → prd_03_produtos(id_produto)
- **id_deposito** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência ao depósito → loc_03_depositos(id_deposito)
- **id_endereco_estoque** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao endereço → loc_04_enderecos_estoque(id_endereco_estoque)
- **quantidade_disponivel** (`numeric(15,3)`, nullable, default: 0) - Quantidade disponível
- **quantidade_reservada** (`numeric(15,3)`, nullable, default: 0) - Quantidade reservada
- **quantidade_total** (`numeric(15,3)`, nullable, default: 0) - Quantidade total
- **custo_medio** (`numeric(15,4)`, nullable) - Custo médio do produto
- **data_ultima_entrada** (`timestamp without time zone`, nullable) - Data da última entrada
- **data_ultima_saida** (`timestamp without time zone`, nullable) - Data da última saída
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 12. **est_04_movimentacoes**
**Descrição**: Histórico de todas as movimentações de estoque.

**Colunas**:
- **id_movimentacao** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único
- **id_tipo_movimento** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência ao tipo → est_01_tipos_movimento(id_tipo_movimento)
- **id_indicador_credito_debito** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência ao indicador → est_02_indicadores_cd(id_indicador_credito_debito)
- **id_produto** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência ao produto → prd_03_produtos(id_produto)
- **id_deposito** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência ao depósito → loc_03_depositos(id_deposito)
- **id_endereco_estoque** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao endereço → loc_04_enderecos_estoque(id_endereco_estoque)
- **data_movimento** (`timestamp without time zone`, NOT NULL) - Data e hora da movimentação
- **quantidade** (`numeric(15,3)`, NOT NULL) - Quantidade movimentada
- **valor_unitario** (`numeric(15,4)`, nullable) - Valor unitário
- **valor_total** (`numeric(15,2)`, nullable) - Valor total da movimentação
- **id_nota_fiscal** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à nota fiscal → fis_09_notas_fiscais(id_nota_fiscal)
- **id_ordem_producao** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à ordem de produção → pro_05_ordens_producao(id_ordem_producao)
- **id_compra** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à compra → cmp_07_compras(id_compra)
- **id_venda** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à venda → vnd_05_vendas(id_venda)
- **observacoes** (`text`, nullable) - Observações da movimentação
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

---

### 📄 **MÓDULO FIS - FISCAL**

#### 13. **fis_08_tipos_operacao**
**Descrição**: Tipos de operações fiscais (Venda, Compra, Transferência, etc.).

**Colunas**:
- **id_tipo_operacao** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do tipo
- **codigo** (`character varying(20)`, NOT NULL) - Código do tipo de operação
- **descricao** (`character varying(100)`, NOT NULL) - Descrição do tipo de operação
- **natureza** (`character varying(100)`, nullable) - Natureza da operação
- **cfop_padrao** (`character varying(10)`, nullable) - CFOP padrão da operação
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 14. **fis_09_notas_fiscais**
**Descrição**: Notas fiscais eletrônicas emitidas e recebidas.

**Colunas**:
- **id_nota_fiscal** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único da nota fiscal
- **id_empresa** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência à empresa → cad_01_empresas(id_empresa)
- **id_tipo_operacao** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao tipo de operação → fis_08_tipos_operacao(id_tipo_operacao)
- **id_cliente** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao cliente → cad_03_clientes(id_cliente)
- **id_fornecedor** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao fornecedor → cad_04_fornecedores(id_fornecedor)
- **numero_nota** (`character varying(20)`, NOT NULL) - Número da nota fiscal
- **serie** (`character varying(5)`, nullable) - Série da nota fiscal
- **data_emissao** (`timestamp without time zone`, NOT NULL) - Data de emissão
- **data_saida_entrada** (`timestamp without time zone`, nullable) - Data de saída/entrada
- **natureza_operacao** (`character varying(100)`, nullable) - Natureza da operação
- **cfop** (`character varying(10)`, nullable) - Código fiscal de operações e prestações
- **inscricao_estadual_substituicao** (`character varying(20)`, nullable) - Inscrição estadual de substituição
- **valor_total_produtos** (`numeric(15,2)`, nullable) - Valor total dos produtos
- **valor_frete** (`numeric(15,2)`, nullable) - Valor do frete
- **valor_seguro** (`numeric(15,2)`, nullable) - Valor do seguro
- **valor_desconto** (`numeric(15,2)`, nullable) - Valor do desconto
- **valor_outras_despesas** (`numeric(15,2)`, nullable) - Valor de outras despesas
- **valor_ipi** (`numeric(15,2)`, nullable) - Valor do IPI
- **valor_icms** (`numeric(15,2)`, nullable) - Valor do ICMS
- **valor_icms_substituicao** (`numeric(15,2)`, nullable) - Valor do ICMS substituição
- **valor_pis** (`numeric(15,2)`, nullable) - Valor do PIS
- **valor_cofins** (`numeric(15,2)`, nullable) - Valor do COFINS
- **valor_total_nota** (`numeric(15,2)`, nullable) - Valor total da nota
- **informacoes_complementares** (`text`, nullable) - Informações complementares
- **status** (`character varying(20)`, nullable) - Status da nota fiscal
- **chave_acesso** (`character varying(50)`, nullable) - Chave de acesso da NFe
- **protocolo_autorizacao** (`character varying(50)`, nullable) - Protocolo de autorização
- **data_autorizacao** (`timestamp without time zone`, nullable) - Data de autorização
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 15. **fis_10_itens_nota_fiscal**
**Descrição**: Itens detalhados das notas fiscais com tributos.

**Colunas**:
- **id_item_nota_fiscal** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do item
- **id_nota_fiscal** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência à nota fiscal → fis_09_notas_fiscais(id_nota_fiscal)
- **id_produto** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência ao produto → prd_03_produtos(id_produto)
- **numero_item** (`integer(32,0)`, NOT NULL) - Número sequencial do item
- **cfop** (`character varying(10)`, nullable) - CFOP do item
- **unidade_medida** (`character varying(10)`, nullable) - Unidade de medida
- **quantidade** (`numeric(15,4)`, nullable) - Quantidade
- **valor_unitario** (`numeric(15,4)`, nullable) - Valor unitário
- **valor_total** (`numeric(15,2)`, nullable) - Valor total do item
- **valor_desconto** (`numeric(15,2)`, nullable) - Valor do desconto
- **base_calculo_icms** (`numeric(15,2)`, nullable) - Base de cálculo ICMS
- **aliquota_icms** (`numeric(5,2)`, nullable) - Alíquota ICMS
- **valor_icms** (`numeric(15,2)`, nullable) - Valor ICMS
- **base_calculo_icms_st** (`numeric(15,2)`, nullable) - Base de cálculo ICMS ST
- **aliquota_icms_st** (`numeric(5,2)`, nullable) - Alíquota ICMS ST
- **valor_icms_st** (`numeric(15,2)`, nullable) - Valor ICMS ST
- **base_calculo_ipi** (`numeric(15,2)`, nullable) - Base de cálculo IPI
- **aliquota_ipi** (`numeric(5,2)`, nullable) - Alíquota IPI
- **valor_ipi** (`numeric(15,2)`, nullable) - Valor IPI
- **base_calculo_pis** (`numeric(15,2)`, nullable) - Base de cálculo PIS
- **aliquota_pis** (`numeric(5,2)`, nullable) - Alíquota PIS
- **valor_pis** (`numeric(15,2)`, nullable) - Valor PIS
- **base_calculo_cofins** (`numeric(15,2)`, nullable) - Base de cálculo COFINS
- **aliquota_cofins** (`numeric(5,2)`, nullable) - Alíquota COFINS
- **valor_cofins** (`numeric(15,2)`, nullable) - Valor COFINS
- **informacoes_adicionais** (`text`, nullable) - Informações adicionais do item
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

---

### 🌍 **MÓDULO IMP - IMPORTAÇÃO**

#### 16. **imp_05_proforma_invoices**
**Descrição**: Proforma invoices (cotações) dos fornecedores internacionais.

**Colunas**:
- **id_proforma** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único da proforma
- **id_fornecedor** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência ao fornecedor → cad_04_fornecedores(id_fornecedor)
- **numero_proforma** (`character varying(50)`, NOT NULL) - Número da proforma invoice
- **data_proforma** (`date`, nullable) - Data da proforma
- **incoterm** (`character varying(10)`, nullable) - Termo de comercio internacional (FOB, CIF, etc.)
- **porto_origem** (`character varying(100)`, nullable) - Porto de origem
- **porto_destino** (`character varying(100)`, nullable) - Porto de destino
- **valor_total_fob** (`numeric(15,2)`, nullable) - Valor total FOB
- **valor_frete** (`numeric(15,2)`, nullable) - Valor do frete
- **valor_seguro** (`numeric(15,2)`, nullable) - Valor do seguro
- **valor_total_cif** (`numeric(15,2)`, nullable) - Valor total CIF
- **moeda** (`character varying(5)`, nullable) - Moeda da cotação
- **prazo_entrega** (`character varying(50)`, nullable) - Prazo de entrega
- **condicoes_pagamento** (`character varying(100)`, nullable) - Condições de pagamento
- **validade_proposta** (`date`, nullable) - Data de validade da proposta
- **observacoes** (`text`, nullable) - Observações
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 17. **imp_06_proforma_invoice_itens**
**Descrição**: Itens detalhados das proforma invoices.

**Colunas**:
- **id_item_proforma** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do item
- **id_proforma** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência à proforma → imp_05_proforma_invoices(id_proforma)
- **id_produto** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao produto → prd_03_produtos(id_produto)
- **numero_item** (`integer(32,0)`, NOT NULL) - Número sequencial do item
- **descricao** (`text`, nullable) - Descrição do item
- **referencia_fabricante** (`character varying(100)`, nullable) - Referência do fabricante
- **quantidade** (`numeric(15,4)`, nullable) - Quantidade
- **unidade_medida** (`character varying(10)`, nullable) - Unidade de medida
- **valor_unitario_fob** (`numeric(15,4)`, nullable) - Valor unitário FOB
- **valor_total_fob** (`numeric(15,2)`, nullable) - Valor total FOB
- **peso_liquido** (`numeric(15,3)`, nullable) - Peso líquido
- **peso_bruto** (`numeric(15,3)`, nullable) - Peso bruto
- **ncm** (`character varying(10)`, nullable) - Código NCM
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 18. **imp_07_commercial_invoices**
**Descrição**: Commercial invoices (faturas comerciais) oficiais dos fornecedores.

**Colunas**:
- **id_commercial_invoice** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único da commercial invoice
- **id_proforma** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à proforma → imp_05_proforma_invoices(id_proforma)
- **id_fornecedor** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência ao fornecedor → cad_04_fornecedores(id_fornecedor)
- **numero_commercial_invoice** (`character varying(50)`, NOT NULL) - Número da commercial invoice
- **data_invoice** (`date`, nullable) - Data da invoice
- **incoterm** (`character varying(10)`, nullable) - Termo de comércio internacional
- **porto_origem** (`character varying(100)`, nullable) - Porto de origem
- **porto_destino** (`character varying(100)`, nullable) - Porto de destino
- **valor_total_fob** (`numeric(15,2)`, nullable) - Valor total FOB
- **valor_frete** (`numeric(15,2)`, nullable) - Valor do frete
- **valor_seguro** (`numeric(15,2)`, nullable) - Valor do seguro
- **valor_total_cif** (`numeric(15,2)`, nullable) - Valor total CIF
- **moeda** (`character varying(5)`, nullable) - Moeda da fatura
- **peso_liquido_total** (`numeric(15,3)`, nullable) - Peso líquido total
- **peso_bruto_total** (`numeric(15,3)`, nullable) - Peso bruto total
- **observacoes** (`text`, nullable) - Observações
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 19. **imp_08_commercial_invoice_itens**
**Descrição**: Itens detalhados das commercial invoices.

**Colunas**:
- **id_item_commercial_invoice** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do item
- **id_commercial_invoice** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência à commercial invoice → imp_07_commercial_invoices(id_commercial_invoice)
- **id_produto** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao produto → prd_03_produtos(id_produto)
- **numero_item** (`integer(32,0)`, NOT NULL) - Número sequencial do item
- **descricao** (`text`, nullable) - Descrição do item
- **referencia_fabricante** (`character varying(100)`, nullable) - Referência do fabricante
- **quantidade** (`numeric(15,4)`, nullable) - Quantidade
- **unidade_medida** (`character varying(10)`, nullable) - Unidade de medida
- **valor_unitario_fob** (`numeric(15,4)`, nullable) - Valor unitário FOB
- **valor_total_fob** (`numeric(15,2)`, nullable) - Valor total FOB
- **peso_liquido** (`numeric(15,3)`, nullable) - Peso líquido
- **peso_bruto** (`numeric(15,3)`, nullable) - Peso bruto
- **ncm** (`character varying(10)`, nullable) - Código NCM
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 20. **imp_09_packing_lists**
**Descrição**: Listas de embalagem com detalhes dos volumes e contêineres.

**Colunas**:
- **id_packing_list** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do packing list
- **id_commercial_invoice** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à commercial invoice → imp_07_commercial_invoices(id_commercial_invoice)
- **numero_packing_list** (`character varying(50)`, nullable) - Número do packing list
- **data_packing** (`date`, nullable) - Data do packing
- **total_volumes** (`integer(32,0)`, nullable) - Total de volumes
- **total_peso_liquido** (`numeric(15,3)`, nullable) - Total peso líquido
- **total_peso_bruto** (`numeric(15,3)`, nullable) - Total peso bruto
- **total_cbm** (`numeric(15,3)`, nullable) - Total em metros cúbicos
- **marca_volumes** (`character varying(100)`, nullable) - Marca dos volumes
- **numeracao_volumes** (`character varying(200)`, nullable) - Numeração dos volumes
- **observacoes** (`text`, nullable) - Observações
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 21. **imp_10_conhecimentos_embarque**
**Descrição**: Conhecimentos de embarque (Bill of Lading) marítimo ou aéreo.

**Colunas**:
- **id_conhecimento_embarque** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do conhecimento
- **id_transportador** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao transportador → cad_05_transportadores(id_transportador)
- **numero_conhecimento** (`character varying(50)`, NOT NULL) - Número do conhecimento
- **tipo_conhecimento** (`character varying(20)`, nullable) - Tipo (BL, AWB, CTR)
- **data_embarque** (`date`, nullable) - Data de embarque
- **data_chegada_prevista** (`date`, nullable) - Data prevista de chegada
- **navio_voo** (`character varying(100)`, nullable) - Nome do navio ou voo
- **porto_aeroporto_origem** (`character varying(100)`, nullable) - Porto/aeroporto de origem
- **porto_aeroporto_destino** (`character varying(100)`, nullable) - Porto/aeroporto de destino
- **porto_aeroporto_transbordo** (`character varying(100)`, nullable) - Porto/aeroporto de transbordo
- **peso_bruto_total** (`numeric(15,3)`, nullable) - Peso bruto total
- **volume_total_m3** (`numeric(15,3)`, nullable) - Volume total em m³
- **quantidade_containers** (`integer(32,0)`, nullable) - Quantidade de contêineres
- **valor_frete** (`numeric(15,2)`, nullable) - Valor do frete
- **moeda_frete** (`character varying(5)`, nullable) - Moeda do frete
- **observacoes** (`text`, nullable) - Observações
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização
- **id_proforma** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à proforma → imp_05_proforma_invoices(id_proforma)

#### 22. **imp_11_declaracoes_importacao**
**Descrição**: Declarações de Importação (DI) para desembaraço aduaneiro.

**Colunas**:
- **id_declaracao_importacao** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único da DI
- **numero_di** (`character varying(50)`, NOT NULL) - Número da Declaração de Importação
- **data_registro** (`date`, NOT NULL) - Data de registro da DI
- **data_desembaraco** (`date`, nullable) - Data de desembaraço aduaneiro
- **canal** (`character varying(10)`, nullable) - Canal de conferência (Verde, Amarelo, Vermelho, Cinza)
- **recinto_aduaneiro** (`character varying(100)`, nullable) - Recinto aduaneiro
- **urf_despacho** (`character varying(100)`, nullable) - URF de despacho
- **urf_entrada** (`character varying(100)`, nullable) - URF de entrada
- **via_transporte** (`character varying(20)`, nullable) - Via de transporte
- **tipo_declaracao** (`character varying(20)`, nullable) - Tipo de declaração
- **id_importador** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao importador → cad_03_clientes(id_cliente)
- **valor_total_mercadoria** (`numeric(15,2)`, nullable) - Valor total da mercadoria
- **valor_frete** (`numeric(15,2)`, nullable) - Valor do frete
- **valor_seguro** (`numeric(15,2)`, nullable) - Valor do seguro
- **valor_cif** (`numeric(15,2)`, nullable) - Valor CIF total
- **peso_liquido_total** (`numeric(15,3)`, nullable) - Peso líquido total
- **observacoes** (`text`, nullable) - Observações
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização
- **id_conhecimento_embarque** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao conhecimento → imp_10_conhecimentos_embarque(id_conhecimento_embarque)

#### 23. **imp_12_di_adicoes**
**Descrição**: Adições da DI (detalhamento por produto/NCM).

**Colunas**:
- **id_adicao** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único da adição
- **id_declaracao_importacao** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência à DI → imp_11_declaracoes_importacao(id_declaracao_importacao)
- **numero_adicao** (`integer(32,0)`, NOT NULL) - Número sequencial da adição
- **id_produto** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao produto → prd_03_produtos(id_produto)
- **ncm** (`character varying(10)`, nullable) - Código NCM
- **descricao_mercadoria** (`text`, nullable) - Descrição da mercadoria
- **quantidade** (`numeric(15,4)`, nullable) - Quantidade
- **unidade_medida** (`character varying(10)`, nullable) - Unidade de medida
- **valor_unitario** (`numeric(15,4)`, nullable) - Valor unitário
- **valor_total** (`numeric(15,2)`, nullable) - Valor total
- **peso_liquido** (`numeric(15,3)`, nullable) - Peso líquido
- **fabricante_nome** (`character varying(200)`, nullable) - Nome do fabricante
- **fabricante_endereco** (`text`, nullable) - Endereço do fabricante
- **id_fornecedor** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao fornecedor → cad_04_fornecedores(id_fornecedor)
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 24. **imp_13_documentos_importacao**
**Descrição**: Controle de documentos utilizados no processo de importação.

**Colunas**:
- **id_documento_importacao** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do documento
- **id_proforma** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à proforma → imp_05_proforma_invoices(id_proforma)
- **id_commercial_invoice** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à commercial invoice → imp_07_commercial_invoices(id_commercial_invoice)
- **id_packing_list** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao packing list → imp_09_packing_lists(id_packing_list)
- **id_conhecimento_embarque** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao conhecimento → imp_10_conhecimentos_embarque(id_conhecimento_embarque)
- **id_declaracao_importacao** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à DI → imp_11_declaracoes_importacao(id_declaracao_importacao)
- **id_nota_fiscal** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à nota fiscal → fis_09_notas_fiscais(id_nota_fiscal)
- **tipo_documento** (`character varying(50)`, NOT NULL) - Tipo do documento
- **numero_documento** (`character varying(100)`, nullable) - Número do documento
- **data_documento** (`date`, nullable) - Data do documento
- **arquivo_anexo** (`text`, nullable) - Caminho do arquivo anexo
- **observacoes** (`text`, nullable) - Observações
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 25. **imp_14_seguros_transporte**
**Descrição**: Seguros de transporte internacional contratados.

**Colunas**:
- **id_seguro_transporte** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do seguro
- **numero_apolice** (`character varying(50)`, NOT NULL) - Número da apólice
- **seguradora** (`character varying(100)`, nullable) - Nome da seguradora
- **data_inicio_vigencia** (`date`, nullable) - Data de início da vigência
- **data_fim_vigencia** (`date`, nullable) - Data de fim da vigência
- **valor_premio** (`numeric(15,2)`, nullable) - Valor do prêmio
- **valor_cobertura** (`numeric(15,2)`, nullable) - Valor da cobertura
- **tipo_cobertura** (`character varying(50)`, nullable) - Tipo de cobertura
- **franquia** (`numeric(15,2)`, nullable) - Franquia
- **observacoes** (`text`, nullable) - Observações
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização
- **id_conhecimento_embarque** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao conhecimento → imp_10_conhecimentos_embarque(id_conhecimento_embarque)

#### 26. **imp_15_custos_importacao**
**Descrição**: Todos os custos envolvidos no processo de importação.

**Colunas**:
- **id_custo_importacao** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do custo
- **id_proforma** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à proforma → imp_05_proforma_invoices(id_proforma)
- **id_commercial_invoice** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à commercial invoice → imp_07_commercial_invoices(id_commercial_invoice)
- **id_declaracao_importacao** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à DI → imp_11_declaracoes_importacao(id_declaracao_importacao)
- **tipo_custo** (`character varying(50)`, NOT NULL) - Tipo do custo (Frete, Seguro, Impostos, etc.)
- **descricao** (`character varying(200)`, nullable) - Descrição do custo
- **valor_moeda_original** (`numeric(15,2)`, nullable) - Valor na moeda original
- **moeda_original** (`character varying(5)`, nullable) - Moeda original
- **taxa_conversao** (`numeric(10,4)`, nullable) - Taxa de conversão para reais
- **valor_reais** (`numeric(15,2)`, nullable) - Valor em reais
- **id_fornecedor** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao fornecedor → cad_04_fornecedores(id_fornecedor)
- **numero_documento** (`character varying(50)`, nullable) - Número do documento
- **data_vencimento** (`date`, nullable) - Data de vencimento
- **data_pagamento** (`date`, nullable) - Data de pagamento
- **observacoes** (`text`, nullable) - Observações
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 27. **imp_16_pagamentos_importacao**
**Descrição**: Pagamentos realizados no processo de importação.

**Colunas**:
- **id_pagamento_importacao** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do pagamento
- **id_proforma** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à proforma → imp_05_proforma_invoices(id_proforma)
- **id_contrato_cambio** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao contrato de câmbio → imp_19_contratos_cambio(id_contrato_cambio)
- **id_banco** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao banco → cad_02_bancos(id_banco)
- **tipo_pagamento** (`character varying(50)`, nullable) - Tipo de pagamento
- **numero_swift** (`character varying(50)`, nullable) - Número do SWIFT
- **data_pagamento** (`date`, nullable) - Data do pagamento
- **valor_moeda_estrangeira** (`numeric(15,2)`, nullable) - Valor em moeda estrangeira
- **moeda** (`character varying(5)`, nullable) - Moeda
- **taxa_cambio** (`numeric(10,4)`, nullable) - Taxa de câmbio
- **valor_reais** (`numeric(15,2)`, nullable) - Valor em reais
- **despesas_bancarias** (`numeric(15,2)`, nullable) - Despesas bancárias
- **observacoes** (`text`, nullable) - Observações
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 28. **imp_17_fechamentos_importacao**
**Descrição**: Fechamento final do processo de importação com consolidação de custos.

**Colunas**:
- **id_fechamento_importacao** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do fechamento
- **id_proforma** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência à proforma → imp_05_proforma_invoices(id_proforma)
- **id_declaracao_importacao** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à DI → imp_11_declaracoes_importacao(id_declaracao_importacao)
- **data_fechamento** (`date`, NOT NULL) - Data de fechamento
- **numero_processo** (`character varying(50)`, nullable) - Número do processo
- **status_processo** (`character varying(50)`, nullable) - Status do processo
- **valor_total_produtos_fob** (`numeric(15,2)`, nullable) - Valor total dos produtos FOB
- **valor_total_frete** (`numeric(15,2)`, nullable) - Valor total do frete
- **valor_total_seguro** (`numeric(15,2)`, nullable) - Valor total do seguro
- **valor_total_impostos** (`numeric(15,2)`, nullable) - Valor total dos impostos
- **valor_total_despesas** (`numeric(15,2)`, nullable) - Valor total das despesas
- **valor_total_processo** (`numeric(15,2)`, nullable) - Valor total do processo
- **taxa_cambio_media** (`numeric(10,4)`, nullable) - Taxa de câmbio média
- **observacoes_finais** (`text`, nullable) - Observações finais
- **documentos_pendentes** (`text`, nullable) - Documentos pendentes
- **proximos_passos** (`text`, nullable) - Próximos passos
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 29. **imp_18_importacao_itens_resumo**
**Descrição**: Resumo consolidado dos custos por item importado.

**Colunas**:
- **id_item_resumo** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do resumo
- **id_proforma** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência à proforma → imp_05_proforma_invoices(id_proforma)
- **id_produto** (`integer(32,0)`, NOT NULL, FOREIGN KEY) - Referência ao produto → prd_03_produtos(id_produto)
- **quantidade_total** (`numeric(15,3)`, nullable) - Quantidade total importada
- **valor_total_fob** (`numeric(15,2)`, nullable) - Valor total FOB
- **valor_total_cif** (`numeric(15,2)`, nullable) - Valor total CIF
- **valor_impostos** (`numeric(15,2)`, nullable) - Valor dos impostos
- **valor_despesas** (`numeric(15,2)`, nullable) - Valor das despesas
- **custo_total** (`numeric(15,2)`, nullable) - Custo total do item
- **custo_unitario** (`numeric(15,4)`, nullable) - Custo unitário final
- **percentual_markup** (`numeric(5,2)`, nullable) - Percentual de markup sugerido
- **preco_venda_sugerido** (`numeric(15,2)`, nullable) - Preço de venda sugerido
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 30. **imp_19_contratos_cambio**
**Descrição**: Contratos de câmbio para operações de importação.

**Colunas**:
- **id_contrato_cambio** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do contrato
- **id_banco** (`integer(32,0)`, nullable, FOREIGN KEY) - Referência ao banco → cad_02_bancos(id_banco)
- **numero_contrato** (`character varying(50)`, NOT NULL) - Número do contrato de câmbio
- **data_contrato** (`date`, NOT NULL) - Data do contrato
- **valor_contrato** (`numeric(15,2)`, nullable) - Valor do contrato
- **moeda** (`character varying(5)`, nullable) - Moeda estrangeira
- **taxa_cambio** (`numeric(10,4)`, nullable) - Taxa de câmbio contratada
- **modalidade** (`character varying(50)`, nullable) - Modalidade da operação
- **prazo_liquidacao_dias** (`integer(32,0)`, nullable) - Prazo para liquidação em dias
- **forma_entrega** (`character varying(50)`, nullable) - Forma de entrega da moeda
- **observacoes** (`text`, nullable) - Observações
- **status** (`character varying(20)`, nullable) - Status do contrato
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

### 📍 **MÓDULO LOC - LOCALIZAÇÃO**

#### 49. **loc_01_tipos_localidade**
**Descrição**: Cadastro de tipos de localidade para classificação de estabelecimentos.

**Colunas**:
- **id_tipo_localidade** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do tipo de localidade
- **codigo** (`character varying(10)`, NOT NULL) - Código único do tipo de localidade
- **descricao** (`character varying(100)`, NOT NULL) - Descrição do tipo de localidade
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 50. **loc_02_estabelecimentos**
**Descrição**: Cadastro de estabelecimentos/filiais da empresa.

**Colunas**:
- **id_estabelecimento** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do estabelecimento
- **id_empresa** (`integer(32,0)`, NOT NULL, FOREIGN KEY → cad_01_empresas) - Referência à empresa
- **id_tipo_localidade** (`integer(32,0)`, nullable, FOREIGN KEY → loc_01_tipos_localidade) - Tipo de localidade
- **codigo** (`character varying(10)`, NOT NULL) - Código único do estabelecimento
- **descricao** (`character varying(100)`, NOT NULL) - Nome/descrição do estabelecimento
- **cnpj** (`character varying(18)`, nullable) - CNPJ do estabelecimento
- **inscricao_estadual** (`character varying(20)`, nullable) - Inscrição estadual
- **endereco** (`character varying(100)`, nullable) - Endereço completo
- **bairro** (`character varying(50)`, nullable) - Bairro
- **cep** (`character varying(10)`, nullable) - CEP
- **municipio** (`character varying(50)`, nullable) - Município
- **uf** (`character varying(2)`, nullable) - Unidade federativa
- **telefone** (`character varying(20)`, nullable) - Telefone de contato
- **email** (`character varying(100)`, nullable) - Email de contato
- **responsavel** (`character varying(100)`, nullable) - Responsável pelo estabelecimento
- **ativo** (`boolean`, nullable, default: true) - Status ativo/inativo
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 51. **loc_03_depositos**
**Descrição**: Cadastro de depósitos/almoxarifados dos estabelecimentos.

**Colunas**:
- **id_deposito** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do depósito
- **id_estabelecimento** (`integer(32,0)`, NOT NULL, FOREIGN KEY → loc_02_estabelecimentos) - Referência ao estabelecimento
- **codigo** (`character varying(10)`, NOT NULL) - Código único do depósito
- **descricao** (`character varying(100)`, NOT NULL) - Nome/descrição do depósito
- **tipo_deposito** (`character varying(20)`, nullable) - Tipo do depósito (matéria-prima, acabado, etc.)
- **capacidade_m3** (`numeric(15,2)`, nullable) - Capacidade volumétrica em metros cúbicos
- **capacidade_kg** (`numeric(15,2)`, nullable) - Capacidade de peso em quilogramas
- **endereco** (`character varying(100)`, nullable) - Localização do depósito
- **responsavel** (`character varying(100)`, nullable) - Responsável pelo depósito
- **ativo** (`boolean`, nullable, default: true) - Status ativo/inativo
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 52. **loc_04_enderecos_estoque**
**Descrição**: Endereçamento detalhado dentro dos depósitos para localização precisa de produtos.

**Colunas**:
- **id_endereco_estoque** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do endereço
- **id_deposito** (`integer(32,0)`, NOT NULL, FOREIGN KEY → loc_03_depositos) - Referência ao depósito
- **codigo** (`character varying(20)`, NOT NULL) - Código único do endereço
- **descricao** (`character varying(100)`, nullable) - Descrição do endereço
- **corredor** (`character varying(10)`, nullable) - Corredor
- **prateleira** (`character varying(10)`, nullable) - Prateleira
- **nivel** (`character varying(10)`, nullable) - Nível
- **posicao** (`character varying(10)`, nullable) - Posição
- **capacidade_kg** (`numeric(15,2)`, nullable) - Capacidade de peso
- **capacidade_m3** (`numeric(15,2)`, nullable) - Capacidade volumétrica
- **tipo_produto_permitido** (`character varying(50)`, nullable) - Tipos de produtos permitidos
- **ocupado** (`boolean`, nullable, default: false) - Indica se está ocupado
- **bloqueado** (`boolean`, nullable, default: false) - Indica se está bloqueado
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

### 🚚 **MÓDULO LOG - LOGÍSTICA**

#### 53. **log_05_itens_entrega**
**Descrição**: Itens específicos de cada entrega com quantidades e observações.

**Colunas**:
- **id_item_entrega** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do item de entrega
- **id_entrega** (`integer(32,0)`, NOT NULL, FOREIGN KEY → log_06_entregas) - Referência à entrega
- **id_item_venda** (`integer(32,0)`, nullable, FOREIGN KEY → vnd_06_itens_venda) - Referência ao item de venda
- **id_produto** (`integer(32,0)`, NOT NULL, FOREIGN KEY → prd_03_produtos) - Referência ao produto
- **quantidade** (`numeric(15,3)`, nullable) - Quantidade entregue
- **observacoes** (`text`, nullable) - Observações sobre o item
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 54. **log_06_entregas**
**Descrição**: Controle de entregas de produtos aos clientes.

**Colunas**:
- **id_entrega** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único da entrega
- **id_venda** (`integer(32,0)`, nullable, FOREIGN KEY → vnd_05_vendas) - Referência à venda
- **id_nota_fiscal** (`integer(32,0)`, nullable, FOREIGN KEY → fis_09_notas_fiscais) - Referência à nota fiscal
- **id_transportador** (`integer(32,0)`, nullable, FOREIGN KEY → cad_05_transportadores) - Transportador
- **numero_entrega** (`character varying(20)`, NOT NULL) - Número único da entrega
- **data_saida** (`date`, nullable) - Data de saída do depósito
- **data_entrega_prevista** (`date`, nullable) - Data prevista para entrega
- **data_entrega_real** (`date`, nullable) - Data real da entrega
- **endereco_entrega** (`text`, nullable) - Endereço completo de entrega
- **responsavel_recebimento** (`character varying(100)`, nullable) - Responsável pelo recebimento
- **observacoes_entrega** (`text`, nullable) - Observações sobre a entrega
- **status** (`character varying(20)`, nullable) - Status da entrega
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

### 🏭 **MÓDULO PRD - PRODUTOS**

#### 55. **prd_01_tipos_produto**
**Descrição**: Classificação de tipos de produtos para categorização.

**Colunas**:
- **id_tipo_produto** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do tipo de produto
- **codigo** (`character varying(10)`, NOT NULL) - Código único do tipo
- **descricao** (`character varying(100)`, NOT NULL) - Descrição do tipo de produto
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 56. **prd_02_modelos**
**Descrição**: Modelos de produtos baseados nos tipos, definindo especificações padrão.

**Colunas**:
- **id_modelo** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do modelo
- **id_tipo_produto** (`integer(32,0)`, nullable, FOREIGN KEY → prd_01_tipos_produto) - Tipo de produto
- **codigo** (`character varying(20)`, NOT NULL) - Código único do modelo
- **descricao** (`character varying(100)`, NOT NULL) - Descrição do modelo
- **especificacoes** (`text`, nullable) - Especificações técnicas detalhadas
- **ativo** (`boolean`, nullable, default: true) - Status ativo/inativo
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 57. **prd_03_produtos**
**Descrição**: Cadastro principal de produtos com todas as informações comerciais e técnicas.

**Colunas**:
- **id_produto** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do produto
- **id_modelo** (`integer(32,0)`, nullable, FOREIGN KEY → prd_02_modelos) - Modelo do produto
- **id_fornecedor** (`integer(32,0)`, nullable, FOREIGN KEY → cad_04_fornecedores) - Fornecedor principal
- **codigo** (`character varying(20)`, NOT NULL) - Código único do produto
- **descricao** (`character varying(100)`, NOT NULL) - Descrição do produto
- **descricao_detalhada** (`text`, nullable) - Descrição técnica detalhada
- **ncm** (`character varying(10)`, nullable) - Código NCM para classificação fiscal
- **unidade_medida** (`character varying(10)`, nullable) - Unidade de medida padrão
- **peso_liquido** (`numeric(15,3)`, nullable) - Peso líquido unitário
- **peso_bruto** (`numeric(15,3)`, nullable) - Peso bruto unitário
- **volume_m3** (`numeric(15,3)`, nullable) - Volume unitário em metros cúbicos
- **preco_custo** (`numeric(15,2)`, nullable) - Preço de custo
- **preco_venda** (`numeric(15,2)`, nullable) - Preço de venda
- **estoque_minimo** (`numeric(15,2)`, nullable) - Estoque mínimo
- **estoque_maximo** (`numeric(15,2)`, nullable) - Estoque máximo
- **lead_time_dias** (`integer(32,0)`, nullable) - Lead time em dias
- **ativo** (`boolean`, nullable, default: true) - Status ativo/inativo
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 58. **prd_04_composicao_produtos**
**Descrição**: Estrutura/composição de produtos que possuem componentes (BOM - Bill of Materials).

**Colunas**:
- **id_composicao** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único da composição
- **id_produto_pai** (`integer(32,0)`, NOT NULL, FOREIGN KEY → prd_03_produtos) - Produto principal
- **id_produto_filho** (`integer(32,0)`, NOT NULL, FOREIGN KEY → prd_03_produtos) - Componente
- **quantidade** (`numeric(15,4)`, NOT NULL) - Quantidade necessária do componente
- **unidade_medida** (`character varying(10)`, nullable) - Unidade de medida da quantidade
- **perda_processo** (`numeric(5,2)`, nullable, default: 0) - Percentual de perda no processo
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

### 🔧 **MÓDULO PRO - PRODUÇÃO**

#### 59. **pro_04_itens_ordem_producao**
**Descrição**: Itens detalhados de cada ordem de produção (insumos e produtos).

**Colunas**:
- **id_item_ordem_producao** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do item
- **id_ordem_producao** (`integer(32,0)`, NOT NULL, FOREIGN KEY → pro_05_ordens_producao) - Ordem de produção
- **id_produto** (`integer(32,0)`, NOT NULL, FOREIGN KEY → prd_03_produtos) - Produto/insumo
- **tipo_item** (`character varying(20)`, nullable) - Tipo (insumo, produto, subproduto)
- **quantidade_planejada** (`numeric(15,3)`, nullable) - Quantidade planejada
- **quantidade_consumida** (`numeric(15,3)`, nullable) - Quantidade efetivamente consumida
- **custo_unitario** (`numeric(15,4)`, nullable) - Custo unitário
- **custo_total** (`numeric(15,2)`, nullable) - Custo total do item
- **observacoes** (`text`, nullable) - Observações específicas
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 60. **pro_05_ordens_producao**
**Descrição**: Ordens de produção para controle da manufatura de produtos.

**Colunas**:
- **id_ordem_producao** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único da ordem
- **numero_ordem** (`character varying(20)`, NOT NULL) - Número único da ordem
- **data_emissao** (`date`, NOT NULL) - Data de emissão da ordem
- **data_inicio_prevista** (`date`, nullable) - Data prevista para início
- **data_fim_prevista** (`date`, nullable) - Data prevista para fim
- **data_inicio_real** (`date`, nullable) - Data real de início
- **data_fim_real** (`date`, nullable) - Data real de fim
- **id_cliente** (`integer(32,0)`, nullable, FOREIGN KEY → cad_03_clientes) - Cliente (se sob encomenda)
- **id_produto** (`integer(32,0)`, NOT NULL, FOREIGN KEY → prd_03_produtos) - Produto a ser produzido
- **quantidade_planejada** (`numeric(15,3)`, nullable) - Quantidade planejada
- **quantidade_produzida** (`numeric(15,3)`, nullable) - Quantidade efetivamente produzida
- **id_deposito_origem** (`integer(32,0)`, nullable, FOREIGN KEY → loc_03_depositos) - Depósito de insumos
- **id_deposito_destino** (`integer(32,0)`, nullable, FOREIGN KEY → loc_03_depositos) - Depósito de produtos
- **id_status_producao** (`integer(32,0)`, nullable, FOREIGN KEY → pro_06_status_producao) - Status atual
- **observacoes** (`text`, nullable) - Observações gerais
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 61. **pro_06_status_producao**
**Descrição**: Status possíveis para ordens de produção.

**Colunas**:
- **id_status_producao** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do status
- **codigo** (`character varying(10)`, NOT NULL) - Código único do status
- **descricao** (`character varying(100)`, NOT NULL) - Descrição do status
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

### 💰 **MÓDULO VND - VENDAS**

#### 62. **vnd_05_vendas**
**Descrição**: Registro de vendas/pedidos de clientes.

**Colunas**:
- **id_venda** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único da venda
- **id_cliente** (`integer(32,0)`, NOT NULL, FOREIGN KEY → cad_03_clientes) - Cliente
- **id_vendedor** (`integer(32,0)`, nullable, FOREIGN KEY → funcionários) - Vendedor responsável
- **id_condicao_pagamento** (`integer(32,0)`, nullable, FOREIGN KEY → vnd_07_condicoes_pagamento) - Condição de pagamento
- **numero_pedido** (`character varying(20)`, NOT NULL) - Número único do pedido
- **data_pedido** (`date`, NOT NULL) - Data do pedido
- **data_entrega_prevista** (`date`, nullable) - Data prevista para entrega
- **valor_total_produtos** (`numeric(15,2)`, nullable) - Valor total dos produtos
- **valor_desconto** (`numeric(15,2)`, nullable) - Valor total de desconto
- **valor_frete** (`numeric(15,2)`, nullable) - Valor do frete
- **valor_total** (`numeric(15,2)`, nullable) - Valor total da venda
- **observacoes** (`text`, nullable) - Observações da venda
- **status** (`character varying(20)`, nullable) - Status da venda
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 63. **vnd_06_itens_venda**
**Descrição**: Itens detalhados de cada venda com quantidades e valores.

**Colunas**:
- **id_item_venda** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único do item
- **id_venda** (`integer(32,0)`, NOT NULL, FOREIGN KEY → vnd_05_vendas) - Referência à venda
- **id_produto** (`integer(32,0)`, NOT NULL, FOREIGN KEY → prd_03_produtos) - Produto vendido
- **numero_item** (`integer(32,0)`, NOT NULL) - Número sequencial do item
- **quantidade** (`numeric(15,4)`, nullable) - Quantidade vendida
- **unidade_medida** (`character varying(10)`, nullable) - Unidade de medida
- **valor_unitario** (`numeric(15,4)`, nullable) - Valor unitário
- **valor_total** (`numeric(15,2)`, nullable) - Valor total do item
- **valor_desconto** (`numeric(15,2)`, nullable) - Desconto aplicado
- **data_entrega_prevista** (`date`, nullable) - Data prevista para entrega do item
- **quantidade_entregue** (`numeric(15,4)`, nullable) - Quantidade já entregue
- **saldo_entregar** (`numeric(15,4)`, nullable) - Saldo pendente de entrega
- **observacoes** (`text`, nullable) - Observações específicas do item
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

#### 64. **vnd_07_condicoes_pagamento**
**Descrição**: Condições de pagamento disponíveis para vendas.

**Colunas**:
- **id_condicao_pagamento** (`integer(32,0)`, NOT NULL, PRIMARY KEY) - Identificador único da condição
- **codigo** (`character varying(10)`, NOT NULL) - Código único da condição
- **descricao** (`character varying(100)`, NOT NULL) - Descrição da condição
- **dias_vencimento** (`integer(32,0)`, nullable) - Prazo para vencimento em dias
- **desconto_percentual** (`numeric(5,2)`, nullable) - Desconto percentual para pagamento antecipado
- **created_at** (`timestamp without time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp without time zone`, nullable, default: now()) - Data de atualização

---
