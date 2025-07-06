# Documentação Completa das Tabelas de Importação

## Visão Geral

O sistema de importação é composto por 18 tabelas principais que representam todo o processo de importação de mercadorias, desde a cotação inicial (Proforma Invoice) até o fechamento final do processo. Todas as tabelas são relacionadas à tabela principal `importacao_01_1_proforma_invoice` através de foreign keys com CASCADE delete.

## Fluxo do Processo de Importação

```
1. Proforma Invoice (Cotação) → Base do processo
2. Comprovante de Pagamento de Câmbio → Prova de pagamento
3. Contrato de Câmbio → Contrato bancário
4. SWIFT → Transferência internacional
5. Commercial Invoice → Fatura comercial oficial
6. Packing List → Lista de embalagem
7. Bill of Lading → Conhecimento de embarque
8. DI (Declaração de Importação) → Documentos aduaneiros
9. Nota Fiscal → Documentação fiscal nacional
10. Fechamento → Consolidação final
```

## Estrutura Completa das Tabelas

### 1. **importacao_01_1_proforma_invoice** (Tabela Principal)
**Descrição**: Cotação inicial do fornecedor estrangeiro. Base de todo o processo de importação.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **condicao_pagamento** (`text`, nullable) - Condições de pagamento
- **vendedor** (`text`, nullable) - Nome do vendedor
- **email_vendedor** (`text`, nullable) - Email do vendedor
- **whatsapp_vendedor** (`text`, nullable) - WhatsApp do vendedor
- **endereco_carregamento** (`text`, nullable) - Endereço de carregamento
- **cidade_carregamento** (`text`, nullable) - Cidade de carregamento
- **pais_carregamento** (`text`, nullable) - País de carregamento
- **porto_carregamento** (`text`, nullable) - Porto de carregamento
- **endereco_entrega** (`text`, nullable) - Endereço de entrega
- **cidade_entrega** (`text`, nullable) - Cidade de entrega
- **pais_entrega** (`text`, nullable) - País de entrega
- **porto_descarga** (`text`, nullable) - Porto de descarga
- **cnpj_importador** (`text`, nullable) - CNPJ do importador
- **nome_importador** (`text`, nullable) - Nome do importador
- **endereco_importador** (`text`, nullable) - Endereço do importador
- **cidade_importador** (`text`, nullable) - Cidade do importador
- **cep_importador** (`text`, nullable) - CEP do importador
- **estado_importador** (`text`, nullable) - Estado do importador
- **pais_importador** (`text`, nullable) - País do importador
- **email_importador** (`text`, nullable) - Email do importador
- **telefone_importador** (`text`, nullable) - Telefone do importador
- **cnpj_exportador** (`text`, nullable) - CNPJ do exportador
- **nome_exportador** (`text`, nullable) - Nome do exportador
- **endereco_exportador** (`text`, nullable) - Endereço do exportador
- **cidade_exportador** (`text`, nullable) - Cidade do exportador
- **cep_exportador** (`text`, nullable) - CEP do exportador
- **estado_exportador** (`text`, nullable) - Estado do exportador
- **pais_exportador** (`text`, nullable) - País do exportador
- **email_exportador** (`text`, nullable) - Email do exportador
- **telefone_exportador** (`text`, nullable) - Telefone do exportador
- **observacoes** (`text`, nullable) - Observações
- **data** (`date`, nullable) - Data da proforma
- **destino** (`text`, nullable) - Destino
- **email_contratado** (`text`, nullable) - Email do contratado
- **empresa_contratada** (`text`, nullable) - Empresa contratada
- **package_method** (`text`, nullable) - Método de embalagem
- **porto_embarque** (`text`, nullable) - Porto de embarque
- **processado_em** (`timestamp without time zone`, nullable) - Data de processamento
- **remetente_whatsapp** (`text`, nullable) - WhatsApp do remetente
- **valor_total** (`numeric(15,2)`, nullable) - Valor total
- **invoice_number** (`text`, nullable) - Número da invoice
- **url_documento** (`jsonb`, nullable) - URL do documento
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 2. **importacao_01_2_proforma_invoice_items**
**Descrição**: Itens detalhados da cotação (Proforma Invoice).

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **item** (`text`, nullable) - Item
- **quantidade** (`numeric`, nullable) - Quantidade
- **unidade** (`text`, nullable) - Unidade
- **descricao** (`text`, nullable) - Descrição
- **valor_unitario** (`numeric(15,2)`, nullable) - Valor unitário
- **valor_total** (`numeric(15,2)`, nullable) - Valor total
- **ncm** (`text`, nullable) - Código NCM
- **peso_unitario** (`numeric`, nullable) - Peso unitário
- **peso_total** (`numeric`, nullable) - Peso total
- **referencia** (`text`, nullable) - Referência
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 3. **importacao_02_1_comprovante_pagamento_cambio**
**Descrição**: Comprovante de pagamento da operação de câmbio.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **banco** (`text`, nullable) - Banco
- **agencia** (`text`, nullable) - Agência
- **conta** (`text`, nullable) - Conta
- **data_pagamento** (`date`, nullable) - Data do pagamento
- **valor_pagamento** (`numeric(15,2)`, nullable) - Valor do pagamento
- **taxa_cambio** (`numeric(10,6)`, nullable) - Taxa de câmbio
- **valor_reais** (`numeric(15,2)`, nullable) - Valor em reais
- **numero_operacao** (`text`, nullable) - Número da operação
- **contrato_cambio** (`text`, nullable) - Contrato de câmbio
- **observacoes** (`text`, nullable) - Observações
- **processado_em** (`timestamp without time zone`, nullable) - Data de processamento
- **remetente_whatsapp** (`text`, nullable) - WhatsApp do remetente
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **url_documento** (`jsonb`, nullable) - URL do documento
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 4. **importacao_03_1_contrato_de_cambio**
**Descrição**: Contrato de câmbio firmado com o banco.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **numero_contrato** (`text`, nullable) - Número do contrato
- **data_contrato** (`date`, nullable) - Data do contrato
- **banco** (`text`, nullable) - Banco
- **valor_contrato** (`numeric(15,2)`, nullable) - Valor do contrato
- **taxa_cambio** (`numeric(10,6)`, nullable) - Taxa de câmbio
- **modalidade** (`text`, nullable) - Modalidade
- **prazo_liquidacao** (`text`, nullable) - Prazo de liquidação
- **forma_entrega** (`text`, nullable) - Forma de entrega
- **observacoes** (`text`, nullable) - Observações
- **processado_em** (`timestamp without time zone`, nullable) - Data de processamento
- **remetente_whatsapp** (`text`, nullable) - WhatsApp do remetente
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **url_documento** (`jsonb`, nullable) - URL do documento
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 5. **importacao_04_1_swift**
**Descrição**: Comprovante de transferência internacional SWIFT.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **numero_swift** (`text`, nullable) - Número do SWIFT
- **data_swift** (`date`, nullable) - Data do SWIFT
- **banco_remetente** (`text`, nullable) - Banco remetente
- **banco_beneficiario** (`text`, nullable) - Banco beneficiário
- **valor_transferencia** (`numeric(15,2)`, nullable) - Valor da transferência
- **moeda** (`text`, nullable) - Moeda
- **beneficiario** (`text`, nullable) - Beneficiário
- **referencia_operacao** (`text`, nullable) - Referência da operação
- **observacoes** (`text`, nullable) - Observações
- **processado_em** (`timestamp without time zone`, nullable) - Data de processamento
- **remetente_whatsapp** (`text`, nullable) - WhatsApp do remetente
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **url_documento** (`jsonb`, nullable) - URL do documento
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 6. **importacao_05_1_commercial_invoice**
**Descrição**: Fatura comercial oficial emitida pelo fornecedor.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **data_invoice** (`date`, nullable) - Data da invoice
- **numero_invoice** (`text`, nullable) - Número da invoice
- **vendedor** (`text`, nullable) - Vendedor
- **comprador** (`text`, nullable) - Comprador
- **incoterm** (`text`, nullable) - Incoterm
- **porto_origem** (`text`, nullable) - Porto de origem
- **porto_destino** (`text`, nullable) - Porto de destino
- **valor_total_fob** (`numeric(15,2)`, nullable) - Valor total FOB
- **valor_frete** (`numeric(15,2)`, nullable) - Valor do frete
- **valor_seguro** (`numeric(15,2)`, nullable) - Valor do seguro
- **valor_total_cif** (`numeric(15,2)`, nullable) - Valor total CIF
- **peso_liquido_total** (`numeric`, nullable) - Peso líquido total
- **peso_bruto_total** (`numeric`, nullable) - Peso bruto total
- **observacoes** (`text`, nullable) - Observações
- **processado_em** (`timestamp without time zone`, nullable) - Data de processamento
- **remetente_whatsapp** (`text`, nullable) - WhatsApp do remetente
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **url_documento** (`jsonb`, nullable) - URL do documento
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 7. **importacao_05_2_commercial_invoice_items**
**Descrição**: Itens detalhados da fatura comercial.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **item** (`text`, nullable) - Item
- **quantidade** (`numeric`, nullable) - Quantidade
- **unidade** (`text`, nullable) - Unidade
- **descricao** (`text`, nullable) - Descrição
- **ncm** (`text`, nullable) - Código NCM
- **valor_unitario_fob** (`numeric(15,2)`, nullable) - Valor unitário FOB
- **valor_total_fob** (`numeric(15,2)`, nullable) - Valor total FOB
- **peso_liquido** (`numeric`, nullable) - Peso líquido
- **peso_bruto** (`numeric`, nullable) - Peso bruto
- **referencia** (`text`, nullable) - Referência
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 8. **importacao_06_1_packing_list**
**Descrição**: Lista de embalagem com detalhes dos volumes.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **numero_packing_list** (`text`, nullable) - Número do packing list
- **data_packing_list** (`date`, nullable) - Data do packing list
- **total_volumes** (`integer`, nullable) - Total de volumes
- **total_peso_liquido** (`numeric`, nullable) - Total peso líquido
- **total_peso_bruto** (`numeric`, nullable) - Total peso bruto
- **total_cbm** (`numeric`, nullable) - Total CBM
- **marca_volumes** (`text`, nullable) - Marca dos volumes
- **numeracao_volumes** (`text`, nullable) - Numeração dos volumes
- **observacoes** (`text`, nullable) - Observações
- **processado_em** (`timestamp without time zone`, nullable) - Data de processamento
- **remetente_whatsapp** (`text`, nullable) - WhatsApp do remetente
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **url_documento** (`jsonb`, nullable) - URL do documento
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 9. **importacao_06_2_packing_list_containers**
**Descrição**: Contêineres utilizados no embarque.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **numero_container** (`text`, nullable) - Número do container
- **tipo_container** (`text`, nullable) - Tipo do container
- **lacre** (`text`, nullable) - Lacre
- **tara** (`numeric`, nullable) - Tara
- **peso_bruto** (`numeric`, nullable) - Peso bruto
- **cbm** (`numeric`, nullable) - CBM
- **quantidade_volumes** (`integer`, nullable) - Quantidade de volumes
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 10. **importacao_06_3_packing_list_items**
**Descrição**: Itens detalhados dentro de cada contêiner.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **container** (`text`, nullable) - Container
- **item** (`text`, nullable) - Item
- **referencia** (`text`, nullable) - Referência
- **descricao_ingles** (`text`, nullable) - Descrição em inglês
- **descricao_chines** (`text`, nullable) - Descrição em chinês
- **quantidade_por_pacote** (`numeric`, nullable) - Quantidade por pacote
- **quantidade_pacotes** (`integer`, nullable) - Quantidade de pacotes
- **quantidade_total** (`numeric`, nullable) - Quantidade total
- **peso_liquido_por_pacote** (`numeric`, nullable) - Peso líquido por pacote
- **peso_liquido_total** (`numeric`, nullable) - Peso líquido total
- **peso_bruto_por_pacote** (`numeric`, nullable) - Peso bruto por pacote
- **peso_bruto_total** (`numeric`, nullable) - Peso bruto total
- **comprimento_pacote** (`numeric`, nullable) - Comprimento do pacote
- **largura_pacote** (`numeric`, nullable) - Largura do pacote
- **altura_pacote** (`numeric`, nullable) - Altura do pacote
- **cbm_por_pacote** (`numeric`, nullable) - CBM por pacote
- **cbm_total** (`numeric`, nullable) - CBM total
- **marcacao_pacote** (`text`, nullable) - Marcação do pacote
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 11. **importacao_07_1_bill_of_lading**
**Descrição**: Conhecimento de embarque marítimo.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **numero_bl** (`text`, nullable) - Número do BL
- **data_bl** (`date`, nullable) - Data do BL
- **tipo_bl** (`text`, nullable) - Tipo do BL
- **embarcador** (`text`, nullable) - Embarcador
- **consignatario** (`text`, nullable) - Consignatário
- **notificar** (`text`, nullable) - Notificar
- **navio** (`text`, nullable) - Navio
- **viagem** (`text`, nullable) - Viagem
- **porto_embarque** (`text`, nullable) - Porto de embarque
- **porto_descarga** (`text`, nullable) - Porto de descarga
- **porto_transbordo** (`text`, nullable) - Porto de transbordo
- **data_embarque** (`date`, nullable) - Data de embarque
- **data_chegada_prevista** (`date`, nullable) - Data de chegada prevista
- **peso_bruto** (`numeric`, nullable) - Peso bruto
- **cbm** (`numeric`, nullable) - CBM
- **quantidade_containers** (`integer`, nullable) - Quantidade de containers
- **valor_frete** (`numeric(15,2)`, nullable) - Valor do frete
- **moeda_frete** (`text`, nullable) - Moeda do frete
- **observacoes** (`text`, nullable) - Observações
- **processado_em** (`timestamp without time zone`, nullable) - Data de processamento
- **remetente_whatsapp** (`text`, nullable) - WhatsApp do remetente
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **url_documento** (`jsonb`, nullable) - URL do documento
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 12. **importacao_07_2_bill_of_lading_containers**
**Descrição**: Contêineres listados no conhecimento de embarque.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **numero_container** (`text`, nullable) - Número do container
- **tipo_container** (`text`, nullable) - Tipo do container
- **lacre** (`text`, nullable) - Lacre
- **peso_bruto** (`numeric`, nullable) - Peso bruto
- **cbm** (`numeric`, nullable) - CBM
- **quantidade_volumes** (`integer`, nullable) - Quantidade de volumes
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 13. **importacao_08_1_di_declaracao_importacao**
**Descrição**: Declaração de Importação (DI) - documento aduaneiro principal.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **numero_di** (`text`, nullable) - Número da DI
- **data_registro** (`date`, nullable) - Data de registro
- **data_desembaraco** (`date`, nullable) - Data de desembaraço
- **canal** (`text`, nullable) - Canal
- **recinto_aduaneiro** (`text`, nullable) - Recinto aduaneiro
- **urf_despacho** (`text`, nullable) - URF de despacho
- **urf_entrada** (`text`, nullable) - URF de entrada
- **via_transporte** (`text`, nullable) - Via de transporte
- **tipo_declaracao** (`text`, nullable) - Tipo de declaração
- **importador_nome** (`text`, nullable) - Nome do importador
- **importador_cnpj** (`text`, nullable) - CNPJ do importador
- **valor_total_mercadoria** (`numeric(15,2)`, nullable) - Valor total da mercadoria
- **valor_frete** (`numeric(15,2)`, nullable) - Valor do frete
- **valor_seguro** (`numeric(15,2)`, nullable) - Valor do seguro
- **valor_cif** (`numeric(15,2)`, nullable) - Valor CIF
- **peso_liquido_total** (`numeric`, nullable) - Peso líquido total
- **observacoes** (`text`, nullable) - Observações
- **processado_em** (`timestamp without time zone`, nullable) - Data de processamento
- **remetente_whatsapp** (`text`, nullable) - WhatsApp do remetente
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **url_documento** (`jsonb`, nullable) - URL do documento
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 14. **importacao_08_2_di_adicoes**
**Descrição**: Adições da DI (detalhamento por produto/NCM).

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **numero_adicao** (`text`, nullable) - Número da adição
- **ncm** (`text`, nullable) - Código NCM
- **descricao_mercadoria** (`text`, nullable) - Descrição da mercadoria
- **quantidade** (`numeric`, nullable) - Quantidade
- **unidade_medida** (`text`, nullable) - Unidade de medida
- **valor_unitario** (`numeric(15,2)`, nullable) - Valor unitário
- **valor_total** (`numeric(15,2)`, nullable) - Valor total
- **peso_liquido** (`numeric`, nullable) - Peso líquido
- **fabricante_nome** (`text`, nullable) - Nome do fabricante
- **fabricante_endereco** (`text`, nullable) - Endereço do fabricante
- **fornecedor_nome** (`text`, nullable) - Nome do fornecedor
- **fornecedor_endereco** (`text`, nullable) - Endereço do fornecedor
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 15. **importacao_08_3_di_tributos_por_adicao**
**Descrição**: Tributos calculados por adição da DI.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **numero_adicao** (`text`, nullable) - Número da adição
- **tipo_tributo** (`text`, nullable) - Tipo de tributo
- **base_calculo** (`numeric(15,2)`, nullable) - Base de cálculo
- **aliquota** (`numeric(8,4)`, nullable) - Alíquota
- **valor_devido** (`numeric(15,2)`, nullable) - Valor devido
- **valor_recolhido** (`numeric(15,2)`, nullable) - Valor recolhido
- **data_pagamento** (`date`, nullable) - Data de pagamento
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 16. **importacao_09_1_nota_fiscal**
**Descrição**: Nota Fiscal de entrada da mercadoria importada.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **numero_nota_fiscal** (`text`, nullable) - Número da nota fiscal
- **serie** (`text`, nullable) - Série
- **data_emissao** (`date`, nullable) - Data de emissão
- **data_entrada** (`date`, nullable) - Data de entrada
- **natureza_operacao** (`text`, nullable) - Natureza da operação
- **cfop** (`text`, nullable) - CFOP
- **emitente_cnpj** (`text`, nullable) - CNPJ do emitente
- **emitente_nome** (`text`, nullable) - Nome do emitente
- **destinatario_cnpj** (`text`, nullable) - CNPJ do destinatário
- **destinatario_nome** (`text`, nullable) - Nome do destinatário
- **valor_produtos** (`numeric(15,2)`, nullable) - Valor dos produtos
- **valor_frete** (`numeric(15,2)`, nullable) - Valor do frete
- **valor_seguro** (`numeric(15,2)`, nullable) - Valor do seguro
- **valor_desconto** (`numeric(15,2)`, nullable) - Valor do desconto
- **valor_outras_despesas** (`numeric(15,2)`, nullable) - Valor de outras despesas
- **valor_ipi** (`numeric(15,2)`, nullable) - Valor do IPI
- **valor_total** (`numeric(15,2)`, nullable) - Valor total
- **observacoes** (`text`, nullable) - Observações
- **processado_em** (`timestamp without time zone`, nullable) - Data de processamento
- **remetente_whatsapp** (`text`, nullable) - WhatsApp do remetente
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **url_documento** (`jsonb`, nullable) - URL do documento
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

### 17. **importacao_09_2_nota_fiscal_itens**
**Descrição**: Itens da nota fiscal de entrada.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY, default: nextval) - Identificador único
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **item** (`text`, nullable) - Item
- **codigo_produto** (`text`, nullable) - Código do produto
- **descricao_produto** (`text`, nullable) - Descrição do produto
- **ncm** (`text`, nullable) - Código NCM
- **cfop** (`text`, nullable) - CFOP
- **unidade** (`text`, nullable) - Unidade
- **quantidade** (`numeric`, nullable) - Quantidade
- **valor_unitario** (`numeric(15,2)`, nullable) - Valor unitário
- **valor_total_produto** (`numeric(15,2)`, nullable) - Valor total do produto
- **base_calculo_icms** (`numeric(15,2)`, nullable) - Base de cálculo ICMS
- **aliquota_icms** (`numeric(8,4)`, nullable) - Alíquota ICMS
- **valor_icms** (`numeric(15,2)`, nullable) - Valor ICMS
- **aliquota_ipi** (`numeric(8,4)`, nullable) - Alíquota IPI
- **valor_ipi** (`numeric(15,2)`, nullable) - Valor IPI
- **referencia** (`text`, nullable) - Referência
- **nota_fiscal** (`text`, nullable) - Nota fiscal
- **importacao_11_1_traducao_pk_nf_id** (`integer`, nullable) - ID da tradução
- **status** (`text`, nullable) - Status
- **created_at** (`timestamp with time zone`, nullable, default: now()) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable, default: now()) - Data de atualização

### 18. **importacao_10_1_fechamento**
**Descrição**: Fechamento final do processo de importação com consolidação de custos.

**Colunas**:
- **id** (`integer`, NOT NULL, PRIMARY KEY) - Identificador único
- **data_fechamento** (`date`, nullable) - Data de fechamento
- **numero_processo** (`text`, nullable) - Número do processo
- **status_processo** (`text`, nullable) - Status do processo
- **valor_total_produtos** (`numeric(15,2)`, nullable) - Valor total dos produtos
- **valor_total_impostos** (`numeric(15,2)`, nullable) - Valor total dos impostos
- **valor_total_despesas** (`numeric(15,2)`, nullable) - Valor total das despesas
- **valor_total_processo** (`numeric(15,2)`, nullable) - Valor total do processo
- **observacoes_finais** (`text`, nullable) - Observações finais
- **documentos_pendentes** (`text`, nullable) - Documentos pendentes
- **proximos_passos** (`text`, nullable) - Próximos passos
- **processado_em** (`timestamp without time zone`, nullable) - Data de processamento
- **remetente_whatsapp** (`text`, nullable) - WhatsApp do remetente
- **invoice_number** (`text`, nullable) - Número da invoice
- **importacao_01_1_proforma_invoice_id** (`integer`, nullable, FOREIGN KEY) - Referência à tabela principal
- **url_documento** (`jsonb`, nullable) - URL do documento
- **created_at** (`timestamp with time zone`, nullable) - Data de criação
- **updated_at** (`timestamp with time zone`, nullable) - Data de atualização

## Relacionamentos

### Relacionamentos Principais
Todas as tabelas `importacao_` possuem foreign key para `importacao_01_1_proforma_invoice(id)` com CASCADE delete.

### Relacionamentos Secundários
- `importacao_01_2_proforma_invoice_items` → `importacao_01_1_proforma_invoice`
- `importacao_05_2_commercial_invoice_items` → `importacao_05_1_commercial_invoice`
- `importacao_06_2_packing_list_containers` → `importacao_06_1_packing_list`
- `importacao_06_3_packing_list_items` → `importacao_06_1_packing_list` e `importacao_06_2_packing_list_containers`
- `importacao_07_2_bill_of_lading_containers` → `importacao_07_1_bill_of_lading`
- `importacao_08_2_di_adicoes` → `importacao_08_1_di_declaracao_importacao`
- `importacao_08_3_di_tributos_por_adicao` → `importacao_08_2_di_adicoes`
- `importacao_09_2_nota_fiscal_itens` → `importacao_09_1_nota_fiscal`

## Índices de Performance

Foram criados índices em todos os campos de foreign key para otimizar consultas:
- `idx_importacao_XX_X_tabela_fk` em cada campo `importacao_01_1_proforma_invoice_id`

## Regras de Negócio

1. **Integridade Referencial**: Todas as tabelas dependem da proforma invoice principal
2. **Cascade Delete**: Ao deletar uma proforma, todos os documentos relacionados são removidos
3. **Rastreabilidade**: Cada documento mantém referência à proforma original
4. **Sequência Lógica**: Os documentos seguem a sequência natural do processo de importação
5. **Consolidação**: A tabela de fechamento consolida todos os custos do processo

## Consultas Úteis

### Buscar processo completo de uma importação
```sql
SELECT * FROM importacao_01_1_proforma_invoice WHERE id = ?;
```

### Listar todos os documentos de uma importação
```sql
SELECT 'Proforma Items' as documento, COUNT(*) as quantidade 
FROM importacao_01_2_proforma_invoice_items 
WHERE importacao_01_1_proforma_invoice_id = ?
UNION ALL
SELECT 'Commercial Invoice' as documento, COUNT(*) as quantidade 
FROM importacao_05_1_commercial_invoice 
WHERE importacao_01_1_proforma_invoice_id = ?
-- ... (repetir para todas as tabelas)
```

### Calcular custo total de uma importação
```sql
SELECT 
    custo_mercadoria,
    custo_frete,
    custo_seguro,
    tributos_totais,
    custo_total
FROM importacao_10_1_fechamento 
WHERE importacao_01_1_proforma_invoice_id = ?;
```

---

*Documentação gerada em: 2025-07-05*
*Sistema de Importação - Plataforma.app*