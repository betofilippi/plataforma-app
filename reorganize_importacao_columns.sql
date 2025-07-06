-- Script para reorganizar a sequência das colunas nas tabelas importacao
-- Coloca url_documento e campos de relacionamento por último, antes de created_at/updated_at

-- IMPORTANTE: PostgreSQL não suporta reordenação direta de colunas
-- É necessário recriar as tabelas com a ordem desejada

-- ========================================
-- 1. TABELA PRINCIPAL: importacao_01_1_proforma_invoice
-- ========================================

-- Criar tabela temporária com nova ordem
CREATE TABLE importacao_01_1_proforma_invoice_new AS
SELECT 
    id,
    -- Campos de dados principais primeiro
    condicao_pagamento,
    vendedor,
    email_vendedor,
    whatsapp_vendedor,
    endereco_carregamento,
    cidade_carregamento,
    pais_carregamento,
    porto_carregamento,
    endereco_entrega,
    cidade_entrega,
    pais_entrega,
    porto_descarga,
    cnpj_importador,
    nome_importador,
    endereco_importador,
    cidade_importador,
    cep_importador,
    estado_importador,
    pais_importador,
    email_importador,
    telefone_importador,
    cnpj_exportador,
    nome_exportador,
    endereco_exportador,
    cidade_exportador,
    cep_exportador,
    estado_exportador,
    pais_exportador,
    email_exportador,
    telefone_exportador,
    observacoes,
    data,
    destino,
    email_contratado,
    empresa_contratada,
    package_method,
    porto_embarque,
    processado_em,
    remetente_whatsapp,
    valor_total,
    -- Campo de relacionamento
    invoice_number,
    -- Campo de attachment
    url_documento,
    -- Campos de auditoria por último
    created_at,
    updated_at
FROM importacao_01_1_proforma_invoice;

-- Copiar constraints e índices
ALTER TABLE importacao_01_1_proforma_invoice_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_01_1_proforma_invoice_new ALTER COLUMN id SET DEFAULT nextval('importacao_01_1_proforma_invoice_id_seq'::regclass);

-- Substituir tabela antiga
DROP TABLE importacao_01_1_proforma_invoice CASCADE;
ALTER TABLE importacao_01_1_proforma_invoice_new RENAME TO importacao_01_1_proforma_invoice;

-- Recriar índices
CREATE INDEX idx_proforma_invoice_invoice_number ON importacao_01_1_proforma_invoice(invoice_number);
CREATE INDEX idx_proforma_invoice_processado_em ON importacao_01_1_proforma_invoice(processado_em);
CREATE INDEX idx_proforma_invoice_remetente_whatsapp ON importacao_01_1_proforma_invoice(remetente_whatsapp);

-- Recriar trigger
CREATE TRIGGER update_importacao_01_1_proforma_invoice_updated_at 
BEFORE UPDATE ON importacao_01_1_proforma_invoice 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 2. TABELAS RELACIONADAS (items)
-- ========================================

-- importacao_01_2_proforma_invoice_items
CREATE TABLE importacao_01_2_proforma_invoice_items_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    item,
    quantidade,
    unidade,
    descricao,
    valor_unitario,
    valor_total,
    ncm,
    peso_unitario,
    peso_total,
    referencia,
    -- Campos de relacionamento por último
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_01_2_proforma_invoice_items;

ALTER TABLE importacao_01_2_proforma_invoice_items_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_01_2_proforma_invoice_items_new ALTER COLUMN id SET DEFAULT nextval('importacao_01_2_proforma_invoice_items_id_seq'::regclass);
DROP TABLE importacao_01_2_proforma_invoice_items CASCADE;
ALTER TABLE importacao_01_2_proforma_invoice_items_new RENAME TO importacao_01_2_proforma_invoice_items;

-- Recriar índices
CREATE INDEX idx_importacao_01_2_proforma_invoice_items_invoice_number ON importacao_01_2_proforma_invoice_items(invoice_number);
CREATE INDEX idx_importacao_01_2_proforma_invoice_items_proforma_id ON importacao_01_2_proforma_invoice_items(importacao_01_1_proforma_invoice_id);

-- ========================================
-- 3. TABELAS DE DOCUMENTOS PRINCIPAIS
-- ========================================

-- importacao_02_1_comprovante_pagamento_cambio
CREATE TABLE importacao_02_1_comprovante_pagamento_cambio_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    banco,
    agencia,
    conta,
    data_pagamento,
    valor_pagamento,
    taxa_cambio,
    valor_reais,
    numero_operacao,
    contrato_cambio,
    observacoes,
    processado_em,
    remetente_whatsapp,
    -- Campos de relacionamento
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campo de attachment
    url_documento,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_02_1_comprovante_pagamento_cambio;

ALTER TABLE importacao_02_1_comprovante_pagamento_cambio_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_02_1_comprovante_pagamento_cambio_new ALTER COLUMN id SET DEFAULT nextval('importacao_02_1_comprovante_pagamento_cambio_id_seq'::regclass);
DROP TABLE importacao_02_1_comprovante_pagamento_cambio CASCADE;
ALTER TABLE importacao_02_1_comprovante_pagamento_cambio_new RENAME TO importacao_02_1_comprovante_pagamento_cambio;

-- Recriar índices e trigger
CREATE INDEX idx_importacao_02_1_comprovante_pagamento_cambio_invoice_number ON importacao_02_1_comprovante_pagamento_cambio(invoice_number);
CREATE INDEX idx_importacao_02_1_comprovante_pagamento_cambio_proforma_id ON importacao_02_1_comprovante_pagamento_cambio(importacao_01_1_proforma_invoice_id);
CREATE TRIGGER update_importacao_02_1_comprovante_pagamento_cambio_updated_at 
BEFORE UPDATE ON importacao_02_1_comprovante_pagamento_cambio 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- importacao_03_1_contrato_de_cambio
CREATE TABLE importacao_03_1_contrato_de_cambio_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    numero_contrato,
    data_contrato,
    banco,
    valor_contrato,
    taxa_cambio,
    modalidade,
    prazo_liquidacao,
    forma_entrega,
    observacoes,
    processado_em,
    remetente_whatsapp,
    -- Campos de relacionamento
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campo de attachment
    url_documento,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_03_1_contrato_de_cambio;

ALTER TABLE importacao_03_1_contrato_de_cambio_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_03_1_contrato_de_cambio_new ALTER COLUMN id SET DEFAULT nextval('importacao_03_1_contrato_de_cambio_id_seq'::regclass);
DROP TABLE importacao_03_1_contrato_de_cambio CASCADE;
ALTER TABLE importacao_03_1_contrato_de_cambio_new RENAME TO importacao_03_1_contrato_de_cambio;

-- Recriar índices e trigger
CREATE INDEX idx_importacao_03_1_contrato_de_cambio_invoice_number ON importacao_03_1_contrato_de_cambio(invoice_number);
CREATE INDEX idx_importacao_03_1_contrato_de_cambio_proforma_id ON importacao_03_1_contrato_de_cambio(importacao_01_1_proforma_invoice_id);
CREATE TRIGGER update_importacao_03_1_contrato_de_cambio_updated_at 
BEFORE UPDATE ON importacao_03_1_contrato_de_cambio 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- importacao_04_1_swift
CREATE TABLE importacao_04_1_swift_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    numero_swift,
    data_swift,
    banco_remetente,
    banco_beneficiario,
    valor_transferencia,
    moeda,
    beneficiario,
    referencia_operacao,
    observacoes,
    processado_em,
    remetente_whatsapp,
    -- Campos de relacionamento
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campo de attachment
    url_documento,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_04_1_swift;

ALTER TABLE importacao_04_1_swift_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_04_1_swift_new ALTER COLUMN id SET DEFAULT nextval('importacao_04_1_swift_id_seq'::regclass);
DROP TABLE importacao_04_1_swift CASCADE;
ALTER TABLE importacao_04_1_swift_new RENAME TO importacao_04_1_swift;

-- Recriar índices e trigger
CREATE INDEX idx_importacao_04_1_swift_invoice_number ON importacao_04_1_swift(invoice_number);
CREATE INDEX idx_importacao_04_1_swift_proforma_id ON importacao_04_1_swift(importacao_01_1_proforma_invoice_id);
CREATE TRIGGER update_importacao_04_1_swift_updated_at 
BEFORE UPDATE ON importacao_04_1_swift 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- importacao_05_1_commercial_invoice
CREATE TABLE importacao_05_1_commercial_invoice_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    data_invoice,
    numero_invoice,
    vendedor,
    comprador,
    incoterm,
    porto_origem,
    porto_destino,
    valor_total_fob,
    valor_frete,
    valor_seguro,
    valor_total_cif,
    peso_liquido_total,
    peso_bruto_total,
    observacoes,
    processado_em,
    remetente_whatsapp,
    -- Campos de relacionamento
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campo de attachment
    url_documento,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_05_1_commercial_invoice;

ALTER TABLE importacao_05_1_commercial_invoice_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_05_1_commercial_invoice_new ALTER COLUMN id SET DEFAULT nextval('importacao_05_1_commercial_invoice_id_seq'::regclass);
DROP TABLE importacao_05_1_commercial_invoice CASCADE;
ALTER TABLE importacao_05_1_commercial_invoice_new RENAME TO importacao_05_1_commercial_invoice;

-- Recriar índices e trigger
CREATE INDEX idx_importacao_05_1_commercial_invoice_invoice_number ON importacao_05_1_commercial_invoice(invoice_number);
CREATE INDEX idx_importacao_05_1_commercial_invoice_proforma_id ON importacao_05_1_commercial_invoice(importacao_01_1_proforma_invoice_id);
CREATE TRIGGER update_importacao_05_1_commercial_invoice_updated_at 
BEFORE UPDATE ON importacao_05_1_commercial_invoice 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- importacao_06_1_packing_list
CREATE TABLE importacao_06_1_packing_list_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    numero_packing_list,
    data_packing_list,
    total_volumes,
    total_peso_liquido,
    total_peso_bruto,
    total_cbm,
    marca_volumes,
    numeracao_volumes,
    observacoes,
    processado_em,
    remetente_whatsapp,
    -- Campos de relacionamento
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campo de attachment
    url_documento,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_06_1_packing_list;

ALTER TABLE importacao_06_1_packing_list_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_06_1_packing_list_new ALTER COLUMN id SET DEFAULT nextval('importacao_06_1_packing_list_id_seq'::regclass);
DROP TABLE importacao_06_1_packing_list CASCADE;
ALTER TABLE importacao_06_1_packing_list_new RENAME TO importacao_06_1_packing_list;

-- Recriar índices e trigger
CREATE INDEX idx_importacao_06_1_packing_list_invoice_number ON importacao_06_1_packing_list(invoice_number);
CREATE INDEX idx_importacao_06_1_packing_list_proforma_id ON importacao_06_1_packing_list(importacao_01_1_proforma_invoice_id);
CREATE TRIGGER update_importacao_06_1_packing_list_updated_at 
BEFORE UPDATE ON importacao_06_1_packing_list 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- importacao_07_1_bill_of_lading
CREATE TABLE importacao_07_1_bill_of_lading_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    numero_bl,
    data_bl,
    tipo_bl,
    embarcador,
    consignatario,
    notificar,
    navio,
    viagem,
    porto_embarque,
    porto_descarga,
    porto_transbordo,
    data_embarque,
    data_chegada_prevista,
    peso_bruto,
    cbm,
    quantidade_containers,
    valor_frete,
    moeda_frete,
    observacoes,
    processado_em,
    remetente_whatsapp,
    -- Campos de relacionamento
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campo de attachment
    url_documento,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_07_1_bill_of_lading;

ALTER TABLE importacao_07_1_bill_of_lading_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_07_1_bill_of_lading_new ALTER COLUMN id SET DEFAULT nextval('importacao_07_1_bill_of_lading_id_seq'::regclass);
DROP TABLE importacao_07_1_bill_of_lading CASCADE;
ALTER TABLE importacao_07_1_bill_of_lading_new RENAME TO importacao_07_1_bill_of_lading;

-- Recriar índices e trigger
CREATE INDEX idx_importacao_07_1_bill_of_lading_invoice_number ON importacao_07_1_bill_of_lading(invoice_number);
CREATE INDEX idx_importacao_07_1_bill_of_lading_proforma_id ON importacao_07_1_bill_of_lading(importacao_01_1_proforma_invoice_id);
CREATE TRIGGER update_importacao_07_1_bill_of_lading_updated_at 
BEFORE UPDATE ON importacao_07_1_bill_of_lading 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- importacao_08_1_di_declaracao_importacao
CREATE TABLE importacao_08_1_di_declaracao_importacao_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    numero_di,
    data_registro,
    data_desembaraco,
    canal,
    recinto_aduaneiro,
    urf_despacho,
    urf_entrada,
    via_transporte,
    tipo_declaracao,
    importador_nome,
    importador_cnpj,
    valor_total_mercadoria,
    valor_frete,
    valor_seguro,
    valor_cif,
    peso_liquido_total,
    observacoes,
    processado_em,
    remetente_whatsapp,
    -- Campos de relacionamento
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campo de attachment
    url_documento,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_08_1_di_declaracao_importacao;

ALTER TABLE importacao_08_1_di_declaracao_importacao_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_08_1_di_declaracao_importacao_new ALTER COLUMN id SET DEFAULT nextval('importacao_08_1_di_declaracao_importacao_id_seq'::regclass);
DROP TABLE importacao_08_1_di_declaracao_importacao CASCADE;
ALTER TABLE importacao_08_1_di_declaracao_importacao_new RENAME TO importacao_08_1_di_declaracao_importacao;

-- Recriar índices e trigger
CREATE INDEX idx_importacao_08_1_di_declaracao_importacao_invoice_number ON importacao_08_1_di_declaracao_importacao(invoice_number);
CREATE INDEX idx_importacao_08_1_di_declaracao_importacao_proforma_id ON importacao_08_1_di_declaracao_importacao(importacao_01_1_proforma_invoice_id);
CREATE TRIGGER update_importacao_08_1_di_declaracao_importacao_updated_at 
BEFORE UPDATE ON importacao_08_1_di_declaracao_importacao 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- importacao_09_1_nota_fiscal
CREATE TABLE importacao_09_1_nota_fiscal_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    numero_nota_fiscal,
    serie,
    data_emissao,
    data_entrada,
    natureza_operacao,
    cfop,
    emitente_cnpj,
    emitente_nome,
    destinatario_cnpj,
    destinatario_nome,
    valor_produtos,
    valor_frete,
    valor_seguro,
    valor_desconto,
    valor_outras_despesas,
    valor_ipi,
    valor_total,
    observacoes,
    processado_em,
    remetente_whatsapp,
    -- Campos de relacionamento
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campo de attachment
    url_documento,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_09_1_nota_fiscal;

ALTER TABLE importacao_09_1_nota_fiscal_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_09_1_nota_fiscal_new ALTER COLUMN id SET DEFAULT nextval('importacao_09_1_nota_fiscal_id_seq'::regclass);
DROP TABLE importacao_09_1_nota_fiscal CASCADE;
ALTER TABLE importacao_09_1_nota_fiscal_new RENAME TO importacao_09_1_nota_fiscal;

-- Recriar índices e trigger
CREATE INDEX idx_importacao_09_1_nota_fiscal_invoice_number ON importacao_09_1_nota_fiscal(invoice_number);
CREATE INDEX idx_importacao_09_1_nota_fiscal_proforma_id ON importacao_09_1_nota_fiscal(importacao_01_1_proforma_invoice_id);
CREATE TRIGGER update_importacao_09_1_nota_fiscal_updated_at 
BEFORE UPDATE ON importacao_09_1_nota_fiscal 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- importacao_10_1_fechamento
CREATE TABLE importacao_10_1_fechamento_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    data_fechamento,
    numero_processo,
    status_processo,
    valor_total_produtos,
    valor_total_impostos,
    valor_total_despesas,
    valor_total_processo,
    observacoes_finais,
    documentos_pendentes,
    proximos_passos,
    processado_em,
    remetente_whatsapp,
    -- Campos de relacionamento
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campo de attachment
    url_documento,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_10_1_fechamento;

ALTER TABLE importacao_10_1_fechamento_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_10_1_fechamento_new ALTER COLUMN id SET DEFAULT nextval('importacao_10_1_fechamento_id_seq'::regclass);
DROP TABLE importacao_10_1_fechamento CASCADE;
ALTER TABLE importacao_10_1_fechamento_new RENAME TO importacao_10_1_fechamento;

-- Recriar índices e trigger
CREATE INDEX idx_importacao_10_1_fechamento_invoice_number ON importacao_10_1_fechamento(invoice_number);
CREATE INDEX idx_importacao_10_1_fechamento_proforma_id ON importacao_10_1_fechamento(importacao_01_1_proforma_invoice_id);
CREATE TRIGGER update_importacao_10_1_fechamento_updated_at 
BEFORE UPDATE ON importacao_10_1_fechamento 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 4. DEMAIS TABELAS DE ITENS
-- ========================================

-- importacao_05_2_commercial_invoice_items
CREATE TABLE importacao_05_2_commercial_invoice_items_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    item,
    quantidade,
    unidade,
    descricao,
    ncm,
    valor_unitario_fob,
    valor_total_fob,
    peso_liquido,
    peso_bruto,
    referencia,
    -- Campos de relacionamento por último
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_05_2_commercial_invoice_items;

ALTER TABLE importacao_05_2_commercial_invoice_items_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_05_2_commercial_invoice_items_new ALTER COLUMN id SET DEFAULT nextval('importacao_05_2_commercial_invoice_items_id_seq'::regclass);
DROP TABLE importacao_05_2_commercial_invoice_items CASCADE;
ALTER TABLE importacao_05_2_commercial_invoice_items_new RENAME TO importacao_05_2_commercial_invoice_items;

-- Recriar índices
CREATE INDEX idx_importacao_05_2_commercial_invoice_items_invoice_number ON importacao_05_2_commercial_invoice_items(invoice_number);
CREATE INDEX idx_importacao_05_2_commercial_invoice_items_proforma_id ON importacao_05_2_commercial_invoice_items(importacao_01_1_proforma_invoice_id);

-- importacao_06_2_packing_list_containers
CREATE TABLE importacao_06_2_packing_list_containers_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    numero_container,
    tipo_container,
    lacre,
    tara,
    peso_bruto,
    cbm,
    quantidade_volumes,
    -- Campos de relacionamento por último
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_06_2_packing_list_containers;

ALTER TABLE importacao_06_2_packing_list_containers_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_06_2_packing_list_containers_new ALTER COLUMN id SET DEFAULT nextval('importacao_06_2_packing_list_containers_id_seq'::regclass);
DROP TABLE importacao_06_2_packing_list_containers CASCADE;
ALTER TABLE importacao_06_2_packing_list_containers_new RENAME TO importacao_06_2_packing_list_containers;

-- Recriar índices
CREATE INDEX idx_importacao_06_2_packing_list_containers_invoice_number ON importacao_06_2_packing_list_containers(invoice_number);
CREATE INDEX idx_importacao_06_2_packing_list_containers_proforma_id ON importacao_06_2_packing_list_containers(importacao_01_1_proforma_invoice_id);

-- importacao_06_3_packing_list_items
CREATE TABLE importacao_06_3_packing_list_items_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    container,
    item,
    referencia,
    descricao_ingles,
    descricao_chines,
    quantidade_por_pacote,
    quantidade_pacotes,
    quantidade_total,
    peso_liquido_por_pacote,
    peso_liquido_total,
    peso_bruto_por_pacote,
    peso_bruto_total,
    comprimento_pacote,
    largura_pacote,
    altura_pacote,
    cbm_por_pacote,
    cbm_total,
    marcacao_pacote,
    -- Campos de relacionamento por último
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_06_3_packing_list_items;

ALTER TABLE importacao_06_3_packing_list_items_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_06_3_packing_list_items_new ALTER COLUMN id SET DEFAULT nextval('importacao_06_3_packing_list_items_id_seq'::regclass);
DROP TABLE importacao_06_3_packing_list_items CASCADE;
ALTER TABLE importacao_06_3_packing_list_items_new RENAME TO importacao_06_3_packing_list_items;

-- Recriar índices
CREATE INDEX idx_importacao_06_3_packing_list_items_invoice_number ON importacao_06_3_packing_list_items(invoice_number);
CREATE INDEX idx_importacao_06_3_packing_list_items_proforma_id ON importacao_06_3_packing_list_items(importacao_01_1_proforma_invoice_id);

-- importacao_07_2_bill_of_lading_containers
CREATE TABLE importacao_07_2_bill_of_lading_containers_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    numero_container,
    tipo_container,
    lacre,
    peso_bruto,
    cbm,
    quantidade_volumes,
    -- Campos de relacionamento por último
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_07_2_bill_of_lading_containers;

ALTER TABLE importacao_07_2_bill_of_lading_containers_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_07_2_bill_of_lading_containers_new ALTER COLUMN id SET DEFAULT nextval('importacao_07_2_bill_of_lading_containers_id_seq'::regclass);
DROP TABLE importacao_07_2_bill_of_lading_containers CASCADE;
ALTER TABLE importacao_07_2_bill_of_lading_containers_new RENAME TO importacao_07_2_bill_of_lading_containers;

-- Recriar índices
CREATE INDEX idx_importacao_07_2_bill_of_lading_containers_invoice_number ON importacao_07_2_bill_of_lading_containers(invoice_number);
CREATE INDEX idx_importacao_07_2_bill_of_lading_containers_proforma_id ON importacao_07_2_bill_of_lading_containers(importacao_01_1_proforma_invoice_id);

-- importacao_08_2_di_adicoes
CREATE TABLE importacao_08_2_di_adicoes_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    numero_adicao,
    ncm,
    descricao_mercadoria,
    quantidade,
    unidade_medida,
    valor_unitario,
    valor_total,
    peso_liquido,
    fabricante_nome,
    fabricante_endereco,
    fornecedor_nome,
    fornecedor_endereco,
    -- Campos de relacionamento por último
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_08_2_di_adicoes;

ALTER TABLE importacao_08_2_di_adicoes_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_08_2_di_adicoes_new ALTER COLUMN id SET DEFAULT nextval('importacao_08_2_di_adicoes_id_seq'::regclass);
DROP TABLE importacao_08_2_di_adicoes CASCADE;
ALTER TABLE importacao_08_2_di_adicoes_new RENAME TO importacao_08_2_di_adicoes;

-- Recriar índices
CREATE INDEX idx_importacao_08_2_di_adicoes_invoice_number ON importacao_08_2_di_adicoes(invoice_number);
CREATE INDEX idx_importacao_08_2_di_adicoes_proforma_id ON importacao_08_2_di_adicoes(importacao_01_1_proforma_invoice_id);

-- importacao_08_3_di_tributos_por_adicao
CREATE TABLE importacao_08_3_di_tributos_por_adicao_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    numero_adicao,
    tipo_tributo,
    base_calculo,
    aliquota,
    valor_devido,
    valor_recolhido,
    data_pagamento,
    -- Campos de relacionamento por último
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_08_3_di_tributos_por_adicao;

ALTER TABLE importacao_08_3_di_tributos_por_adicao_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_08_3_di_tributos_por_adicao_new ALTER COLUMN id SET DEFAULT nextval('importacao_08_3_di_tributos_por_adicao_id_seq'::regclass);
DROP TABLE importacao_08_3_di_tributos_por_adicao CASCADE;
ALTER TABLE importacao_08_3_di_tributos_por_adicao_new RENAME TO importacao_08_3_di_tributos_por_adicao;

-- Recriar índices
CREATE INDEX idx_importacao_08_3_di_tributos_por_adicao_invoice_number ON importacao_08_3_di_tributos_por_adicao(invoice_number);
CREATE INDEX idx_importacao_08_3_di_tributos_por_adicao_proforma_id ON importacao_08_3_di_tributos_por_adicao(importacao_01_1_proforma_invoice_id);

-- importacao_09_2_nota_fiscal_itens
CREATE TABLE importacao_09_2_nota_fiscal_itens_new AS
SELECT 
    id,
    -- Campos de dados primeiro
    item,
    codigo_produto,
    descricao_produto,
    ncm,
    cfop,
    unidade,
    quantidade,
    valor_unitario,
    valor_total_produto,
    base_calculo_icms,
    aliquota_icms,
    valor_icms,
    aliquota_ipi,
    valor_ipi,
    referencia,
    nota_fiscal,
    importacao_11_1_traducao_pk_nf_id,
    "Status",
    -- Campos de relacionamento por último
    invoice_number,
    importacao_01_1_proforma_invoice_id,
    -- Campos de auditoria
    created_at,
    updated_at
FROM importacao_09_2_nota_fiscal_itens;

ALTER TABLE importacao_09_2_nota_fiscal_itens_new ADD PRIMARY KEY (id);
ALTER TABLE importacao_09_2_nota_fiscal_itens_new ALTER COLUMN id SET DEFAULT nextval('importacao_09_2_nota_fiscal_itens_id_seq'::regclass);
DROP TABLE importacao_09_2_nota_fiscal_itens CASCADE;
ALTER TABLE importacao_09_2_nota_fiscal_itens_new RENAME TO importacao_09_2_nota_fiscal_itens;

-- Recriar índices
CREATE INDEX idx_importacao_09_2_nota_fiscal_itens_invoice_number ON importacao_09_2_nota_fiscal_itens(invoice_number);
CREATE INDEX idx_importacao_09_2_nota_fiscal_itens_proforma_id ON importacao_09_2_nota_fiscal_itens(importacao_01_1_proforma_invoice_id);

-- ========================================
-- 5. RECRIAR COMENTÁRIOS NOS CAMPOS
-- ========================================

-- Comentários na tabela principal
COMMENT ON COLUMN importacao_01_1_proforma_invoice.data IS 'Data do documento';
COMMENT ON COLUMN importacao_01_1_proforma_invoice.destino IS 'Destino da importação';
COMMENT ON COLUMN importacao_01_1_proforma_invoice.email_contratado IS 'Email do contratado/fornecedor';
COMMENT ON COLUMN importacao_01_1_proforma_invoice.empresa_contratada IS 'Empresa contratada/fornecedor';
COMMENT ON COLUMN importacao_01_1_proforma_invoice.package_method IS 'Método de embalagem';
COMMENT ON COLUMN importacao_01_1_proforma_invoice.porto_embarque IS 'Porto de embarque (adicional)';
COMMENT ON COLUMN importacao_01_1_proforma_invoice.processado_em IS 'Data/hora de processamento pelo Make.com';
COMMENT ON COLUMN importacao_01_1_proforma_invoice.remetente_whatsapp IS 'Número WhatsApp que enviou o documento';
COMMENT ON COLUMN importacao_01_1_proforma_invoice.valor_total IS 'Valor total resumido';
COMMENT ON COLUMN importacao_01_1_proforma_invoice.url_documento IS 'Array de attachments: [{url, title, mimetype, size}]';

-- Aplicar comentários em todas as tabelas principais
DO $$
DECLARE
    tabela TEXT;
    tabelas TEXT[] := ARRAY[
        'importacao_02_1_comprovante_pagamento_cambio',
        'importacao_03_1_contrato_de_cambio',
        'importacao_04_1_swift',
        'importacao_05_1_commercial_invoice',
        'importacao_06_1_packing_list',
        'importacao_07_1_bill_of_lading',
        'importacao_08_1_di_declaracao_importacao',
        'importacao_09_1_nota_fiscal',
        'importacao_10_1_fechamento'
    ];
BEGIN
    FOREACH tabela IN ARRAY tabelas
    LOOP
        EXECUTE format('COMMENT ON COLUMN %I.url_documento IS %L', tabela, 'Array de attachments: [{url: string, title: string, mimetype: string, size: number}]');
        EXECUTE format('COMMENT ON COLUMN %I.processado_em IS %L', tabela, 'Data/hora de processamento pelo Make.com');
        EXECUTE format('COMMENT ON COLUMN %I.remetente_whatsapp IS %L', tabela, 'Número WhatsApp que enviou o documento');
        EXECUTE format('COMMENT ON COLUMN %I.created_at IS %L', tabela, 'Data de criação do registro');
        EXECUTE format('COMMENT ON COLUMN %I.updated_at IS %L', tabela, 'Data de última atualização');
    END LOOP;
END $$;

-- ========================================
-- 6. VALIDAÇÃO FINAL
-- ========================================

-- Verificar estrutura das tabelas reorganizadas
SELECT 
    table_name,
    column_name,
    ordinal_position,
    data_type
FROM information_schema.columns
WHERE table_name = 'importacao_01_1_proforma_invoice'
ORDER BY ordinal_position;

-- Verificar se todos os dados foram preservados
SELECT COUNT(*) as total_registros FROM importacao_01_1_proforma_invoice;