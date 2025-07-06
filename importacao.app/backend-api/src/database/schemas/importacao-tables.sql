-- =====================================================================================
-- SISTEMA ERP NXT - MÓDULO IMPORTAÇÃO
-- Criação das 18 tabelas do módulo IMP (Importação)
-- Data: 2025-07-05
-- =====================================================================================

-- Verificar se o schema de importação existe
CREATE SCHEMA IF NOT EXISTS importacao;

-- =====================================================================================
-- IMP_01 - PROCESSOS DE IMPORTAÇÃO
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_01_processos (
    id_processo SERIAL PRIMARY KEY,
    numero_processo VARCHAR(50) UNIQUE NOT NULL,
    descricao TEXT,
    tipo_processo VARCHAR(20) DEFAULT 'IMPORTACAO', -- IMPORTACAO, EXPORTACAO, TRANSITO
    status VARCHAR(30) DEFAULT 'PLANEJAMENTO', -- PLANEJAMENTO, ANDAMENTO, CONCLUIDO, CANCELADO
    data_inicio DATE,
    data_previsao_conclusao DATE,
    data_conclusao DATE,
    valor_total_usd DECIMAL(15,2),
    valor_total_brl DECIMAL(15,2),
    moeda_base VARCHAR(3) DEFAULT 'USD',
    taxa_cambio DECIMAL(10,4),
    observacoes TEXT,
    prioridade VARCHAR(10) DEFAULT 'MEDIA', -- BAIXA, MEDIA, ALTA, URGENTE
    responsavel_id INTEGER,
    empresa_id INTEGER DEFAULT 1,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

-- =====================================================================================
-- IMP_02 - FORNECEDORES INTERNACIONAIS
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_02_fornecedores_internacionais (
    id_fornecedor SERIAL PRIMARY KEY,
    codigo_fornecedor VARCHAR(30) UNIQUE NOT NULL,
    razao_social VARCHAR(200) NOT NULL,
    nome_fantasia VARCHAR(150),
    pais_origem VARCHAR(3) NOT NULL, -- ISO 3166-1 alpha-3
    endereco_completo TEXT,
    cidade VARCHAR(100),
    estado_provincia VARCHAR(100),
    cep_codigo_postal VARCHAR(20),
    telefone VARCHAR(30),
    email VARCHAR(150),
    website VARCHAR(200),
    contato_principal VARCHAR(100),
    cargo_contato VARCHAR(50),
    telefone_contato VARCHAR(30),
    email_contato VARCHAR(150),
    condicoes_pagamento TEXT,
    banco_internacional VARCHAR(150),
    swift_code VARCHAR(20),
    conta_bancaria VARCHAR(50),
    tipo_fornecedor VARCHAR(30) DEFAULT 'GERAL', -- GERAL, MATERIA_PRIMA, EQUIPAMENTOS, SERVICOS
    classificacao VARCHAR(10) DEFAULT 'A', -- A, B, C (confiabilidade)
    documentos_habilitacao JSONB,
    certificacoes JSONB,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

-- =====================================================================================
-- IMP_03 - PRODUTOS IMPORTADOS
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_03_produtos_importados (
    id_produto_imp SERIAL PRIMARY KEY,
    codigo_produto VARCHAR(50) UNIQUE NOT NULL,
    codigo_ncm VARCHAR(10) NOT NULL,
    descricao_comercial VARCHAR(300) NOT NULL,
    descricao_tecnica TEXT,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    categoria VARCHAR(50),
    subcategoria VARCHAR(50),
    unidade_medida VARCHAR(10) DEFAULT 'UN',
    peso_liquido DECIMAL(12,4),
    peso_bruto DECIMAL(12,4),
    dimensoes_cm VARCHAR(50), -- LxAxP
    pais_origem VARCHAR(3) NOT NULL,
    uso_pretendido VARCHAR(100), -- REVENDA, INDUSTRIALIZACAO, ATIVO_FIXO
    necessita_licenca BOOLEAN DEFAULT FALSE,
    orgao_licenciamento VARCHAR(100),
    possui_similar_nacional BOOLEAN DEFAULT FALSE,
    ex_tarifario VARCHAR(10),
    regime_tributario VARCHAR(30), -- NORMAL, DRAWBACK, EX_TARIFARIO
    aliquota_ii DECIMAL(5,2), -- Imposto de Importação
    aliquota_ipi DECIMAL(5,2),
    aliquota_pis DECIMAL(5,4),
    aliquota_cofins DECIMAL(5,4),
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

-- =====================================================================================
-- IMP_04 - ITENS DO PROCESSO
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_04_itens_processo (
    id_item SERIAL PRIMARY KEY,
    id_processo INTEGER NOT NULL REFERENCES importacao.imp_01_processos(id_processo),
    id_produto_imp INTEGER NOT NULL REFERENCES importacao.imp_03_produtos_importados(id_produto_imp),
    id_fornecedor INTEGER NOT NULL REFERENCES importacao.imp_02_fornecedores_internacionais(id_fornecedor),
    quantidade DECIMAL(12,4) NOT NULL,
    valor_unitario_usd DECIMAL(15,4) NOT NULL,
    valor_total_usd DECIMAL(15,2) NOT NULL,
    peso_liquido_total DECIMAL(12,4),
    peso_bruto_total DECIMAL(12,4),
    condicao_venda VARCHAR(10) DEFAULT 'FOB', -- FOB, CIF, CFR, EXW, etc
    prazo_entrega INTEGER, -- dias
    observacoes_item TEXT,
    status VARCHAR(20) DEFAULT 'ATIVO', -- ATIVO, CANCELADO, SUBSTITUIDO
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- IMP_05 - DOCUMENTOS DE IMPORTAÇÃO
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_05_documentos (
    id_documento SERIAL PRIMARY KEY,
    id_processo INTEGER NOT NULL REFERENCES importacao.imp_01_processos(id_processo),
    tipo_documento VARCHAR(50) NOT NULL, -- FATURA_COMERCIAL, PACKING_LIST, BL, CERTIFICADO, etc
    numero_documento VARCHAR(100),
    data_emissao DATE,
    data_validade DATE,
    orgao_emissor VARCHAR(150),
    arquivo_nome VARCHAR(200),
    arquivo_caminho TEXT,
    arquivo_tamanho INTEGER, -- bytes
    arquivo_tipo VARCHAR(20), -- PDF, JPG, PNG, etc
    status_documento VARCHAR(20) DEFAULT 'PENDENTE', -- PENDENTE, APROVADO, REJEITADO, VENCIDO
    observacoes TEXT,
    obrigatorio BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(50)
);

-- =====================================================================================
-- IMP_06 - DESPACHANTES ADUANEIROS
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_06_despachantes (
    id_despachante SERIAL PRIMARY KEY,
    codigo_despachante VARCHAR(20) UNIQUE NOT NULL,
    razao_social VARCHAR(200) NOT NULL,
    nome_fantasia VARCHAR(150),
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    endereco_completo TEXT,
    cidade VARCHAR(100),
    uf VARCHAR(2),
    cep VARCHAR(10),
    telefone VARCHAR(20),
    email VARCHAR(150),
    contato_principal VARCHAR(100),
    registro_suframa VARCHAR(20),
    especialidades JSONB, -- porto, aeroporto, fronteira, etc
    portos_atuacao JSONB,
    taxa_servico DECIMAL(5,2), -- percentual
    valor_minimo_servico DECIMAL(10,2),
    condicoes_pagamento TEXT,
    observacoes TEXT,
    classificacao VARCHAR(10) DEFAULT 'A', -- A, B, C
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

-- =====================================================================================
-- IMP_07 - ETAPAS DO PROCESSO
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_07_etapas_processo (
    id_etapa SERIAL PRIMARY KEY,
    id_processo INTEGER NOT NULL REFERENCES importacao.imp_01_processos(id_processo),
    codigo_etapa VARCHAR(10) NOT NULL, -- E01, E02, etc
    nome_etapa VARCHAR(100) NOT NULL,
    descricao_etapa TEXT,
    ordem_execucao INTEGER NOT NULL,
    data_prevista DATE,
    data_inicio DATE,
    data_conclusao DATE,
    status_etapa VARCHAR(20) DEFAULT 'PENDENTE', -- PENDENTE, ANDAMENTO, CONCLUIDA, ATRASADA
    responsavel VARCHAR(100),
    departamento VARCHAR(50),
    observacoes TEXT,
    documento_necessario BOOLEAN DEFAULT FALSE,
    prazo_maximo_dias INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- IMP_08 - CUSTOS DE IMPORTAÇÃO
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_08_custos (
    id_custo SERIAL PRIMARY KEY,
    id_processo INTEGER NOT NULL REFERENCES importacao.imp_01_processos(id_processo),
    tipo_custo VARCHAR(50) NOT NULL, -- FRETE, SEGURO, IMPOSTO, DESPACHANTE, ARMAZENAGEM, etc
    categoria_custo VARCHAR(30) NOT NULL, -- OBRIGATORIO, OPCIONAL, CONTINGENCIA
    descricao_custo VARCHAR(200),
    valor_previsto_usd DECIMAL(15,2),
    valor_real_usd DECIMAL(15,2),
    valor_previsto_brl DECIMAL(15,2),
    valor_real_brl DECIMAL(15,2),
    taxa_cambio_aplicada DECIMAL(10,4),
    data_previsao DATE,
    data_efetivacao DATE,
    fornecedor_servico VARCHAR(150),
    numero_documento VARCHAR(100),
    centro_custo VARCHAR(20),
    conta_contabil VARCHAR(20),
    observacoes TEXT,
    status_custo VARCHAR(20) DEFAULT 'PREVISTO', -- PREVISTO, CONFIRMADO, PAGO, CANCELADO
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- IMP_09 - IMPOSTOS E TAXAS
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_09_impostos_taxas (
    id_imposto SERIAL PRIMARY KEY,
    id_processo INTEGER NOT NULL REFERENCES importacao.imp_01_processos(id_processo),
    id_produto_imp INTEGER REFERENCES importacao.imp_03_produtos_importados(id_produto_imp),
    tipo_imposto VARCHAR(20) NOT NULL, -- II, IPI, PIS, COFINS, ICMS, TAXA_SISCOMEX, etc
    base_calculo DECIMAL(15,2),
    aliquota DECIMAL(7,4),
    valor_calculado DECIMAL(15,2),
    valor_pago DECIMAL(15,2),
    data_vencimento DATE,
    data_pagamento DATE,
    numero_darf VARCHAR(50),
    observacoes TEXT,
    status_pagamento VARCHAR(20) DEFAULT 'PENDENTE', -- PENDENTE, PAGO, VENCIDO, ISENTO
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- IMP_10 - LICENÇAS DE IMPORTAÇÃO
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_10_licencas (
    id_licenca SERIAL PRIMARY KEY,
    id_processo INTEGER NOT NULL REFERENCES importacao.imp_01_processos(id_processo),
    tipo_licenca VARCHAR(50) NOT NULL, -- LI_AUTOMATICA, LI_NAO_AUTOMATICA, ANUENCIA, etc
    orgao_responsavel VARCHAR(100) NOT NULL,
    numero_licenca VARCHAR(100),
    data_solicitacao DATE,
    data_emissao DATE,
    data_validade DATE,
    status_licenca VARCHAR(20) DEFAULT 'SOLICITADA', -- SOLICITADA, DEFERIDA, INDEFERIDA, VENCIDA
    valor_taxa DECIMAL(10,2),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- IMP_11 - TRANSPORTE INTERNACIONAL
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_11_transporte (
    id_transporte SERIAL PRIMARY KEY,
    id_processo INTEGER NOT NULL REFERENCES importacao.imp_01_processos(id_processo),
    modal_transporte VARCHAR(20) NOT NULL, -- MARITIMO, AEREO, RODOVIARIO, FERROVIARIO
    transportadora VARCHAR(150),
    navio_aeronave VARCHAR(100),
    viagem_voo VARCHAR(50),
    porto_embarque VARCHAR(100),
    porto_desembarque VARCHAR(100),
    data_embarque DATE,
    data_chegada_prevista DATE,
    data_chegada_real DATE,
    numero_bl_awb VARCHAR(100), -- Bill of Lading ou Air Way Bill
    numero_container VARCHAR(50),
    tipo_container VARCHAR(20), -- 20', 40', 40'HC, etc
    peso_bruto_total DECIMAL(12,4),
    volume_m3 DECIMAL(10,4),
    valor_frete_usd DECIMAL(12,2),
    valor_seguro_usd DECIMAL(12,2),
    observacoes TEXT,
    status_transporte VARCHAR(20) DEFAULT 'PROGRAMADO', -- PROGRAMADO, TRANSITO, CHEGADO, LIBERADO
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- IMP_12 - ARMAZENAGEM
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_12_armazenagem (
    id_armazenagem SERIAL PRIMARY KEY,
    id_processo INTEGER NOT NULL REFERENCES importacao.imp_01_processos(id_processo),
    tipo_local VARCHAR(30) NOT NULL, -- PORTO, AEROPORTO, EADI, ETC, RFalfandegado
    nome_local VARCHAR(150) NOT NULL,
    endereco_local TEXT,
    data_entrada DATE,
    data_saida_prevista DATE,
    data_saida_real DATE,
    numero_conhecimento VARCHAR(100),
    area_ocupada DECIMAL(10,2), -- m²
    peso_armazenado DECIMAL(12,4),
    taxa_diaria DECIMAL(8,2),
    valor_total_armazenagem DECIMAL(12,2),
    dias_armazenagem INTEGER,
    observacoes TEXT,
    status_armazenagem VARCHAR(20) DEFAULT 'ENTRADA', -- ENTRADA, ARMAZENADO, LIBERADO, RETIRADO
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- IMP_13 - CÂMBIO E PAGAMENTOS
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_13_cambio_pagamentos (
    id_cambio SERIAL PRIMARY KEY,
    id_processo INTEGER NOT NULL REFERENCES importacao.imp_01_processos(id_processo),
    tipo_operacao VARCHAR(30) NOT NULL, -- ANTECIPACAO, PRONTO, PRAZO, FINANCIAMENTO
    banco_intermediador VARCHAR(150) NOT NULL,
    numero_operacao VARCHAR(100),
    valor_usd DECIMAL(15,2) NOT NULL,
    taxa_cambio DECIMAL(10,6) NOT NULL,
    valor_brl DECIMAL(15,2) NOT NULL,
    iof DECIMAL(10,2),
    outras_taxas DECIMAL(10,2),
    valor_total_brl DECIMAL(15,2),
    data_contratacao DATE,
    data_liquidacao DATE,
    data_vencimento DATE,
    observacoes TEXT,
    status_operacao VARCHAR(20) DEFAULT 'CONTRATADA', -- CONTRATADA, LIQUIDADA, VENCIDA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- IMP_14 - INSPEÇÕES E CERTIFICAÇÕES
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_14_inspecoes (
    id_inspecao SERIAL PRIMARY KEY,
    id_processo INTEGER NOT NULL REFERENCES importacao.imp_01_processos(id_processo),
    tipo_inspecao VARCHAR(50) NOT NULL, -- QUALIDADE, QUANTIDADE, FITOSSANITARIA, etc
    orgao_certificador VARCHAR(150),
    data_solicitacao DATE,
    data_realizacao DATE,
    local_inspecao VARCHAR(150),
    resultado VARCHAR(20), -- APROVADO, REPROVADO, APROVADO_COM_RESSALVA
    numero_certificado VARCHAR(100),
    data_validade_certificado DATE,
    valor_inspecao DECIMAL(10,2),
    observacoes TEXT,
    documento_anexo VARCHAR(200),
    status_inspecao VARCHAR(20) DEFAULT 'SOLICITADA', -- SOLICITADA, REALIZADA, APROVADA, REPROVADA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- IMP_15 - CONTROLE DE DRAWBACK
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_15_drawback (
    id_drawback SERIAL PRIMARY KEY,
    id_processo INTEGER NOT NULL REFERENCES importacao.imp_01_processos(id_processo),
    tipo_drawback VARCHAR(30) NOT NULL, -- SUSPENSAO, ISENCAO, RESTITUICAO
    numero_ato_concessorio VARCHAR(100),
    data_ato_concessorio DATE,
    data_validade DATE,
    valor_tributos_suspensos DECIMAL(15,2),
    valor_utilizado DECIMAL(15,2),
    saldo_disponivel DECIMAL(15,2),
    produto_a_exportar VARCHAR(200),
    quantidade_a_exportar DECIMAL(12,4),
    prazo_exportacao DATE,
    observacoes TEXT,
    status_drawback VARCHAR(20) DEFAULT 'ATIVO', -- ATIVO, UTILIZADO, VENCIDO, CANCELADO
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- IMP_16 - ENTREGAS E DISTRIBUIÇÃO
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_16_entregas (
    id_entrega SERIAL PRIMARY KEY,
    id_processo INTEGER NOT NULL REFERENCES importacao.imp_01_processos(id_processo),
    tipo_entrega VARCHAR(30) NOT NULL, -- DIRETA, CONSOLIDADA, FRACIONADA
    transportadora_nacional VARCHAR(150),
    endereco_entrega TEXT NOT NULL,
    contato_recebimento VARCHAR(100),
    telefone_contato VARCHAR(20),
    data_programada DATE,
    data_realizada DATE,
    horario_programado TIME,
    horario_realizado TIME,
    numero_nf_entrega VARCHAR(100),
    peso_entregue DECIMAL(12,4),
    volumes_entregues INTEGER,
    valor_frete_nacional DECIMAL(10,2),
    observacoes_entrega TEXT,
    status_entrega VARCHAR(20) DEFAULT 'PROGRAMADA', -- PROGRAMADA, SAIU_ENTREGA, ENTREGUE, FRUSTRADA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- IMP_17 - FOLLOW-UP E ACOMPANHAMENTO
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_17_follow_up (
    id_follow SERIAL PRIMARY KEY,
    id_processo INTEGER NOT NULL REFERENCES importacao.imp_01_processos(id_processo),
    data_follow DATE NOT NULL,
    hora_follow TIME,
    tipo_contato VARCHAR(30), -- TELEFONE, EMAIL, REUNIAO, VISITA, SISTEMA
    contato_realizado_com VARCHAR(150),
    assunto VARCHAR(200),
    descricao_detalhada TEXT,
    proxima_acao TEXT,
    data_proxima_acao DATE,
    responsavel_follow VARCHAR(100),
    status_follow VARCHAR(20) DEFAULT 'REALIZADO', -- AGENDADO, REALIZADO, CANCELADO
    prioridade VARCHAR(10) DEFAULT 'MEDIA', -- BAIXA, MEDIA, ALTA, URGENTE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50)
);

-- =====================================================================================
-- IMP_18 - HISTÓRICO DE ALTERAÇÕES
-- =====================================================================================
CREATE TABLE IF NOT EXISTS importacao.imp_18_historico_alteracoes (
    id_historico SERIAL PRIMARY KEY,
    tabela_alterada VARCHAR(50) NOT NULL,
    id_registro INTEGER NOT NULL,
    tipo_operacao VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    campo_alterado VARCHAR(100),
    valor_anterior TEXT,
    valor_novo TEXT,
    data_alteracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_alteracao VARCHAR(50) NOT NULL,
    ip_origem INET,
    observacoes TEXT,
    sessao_id VARCHAR(100)
);

-- =====================================================================================
-- CRIAÇÃO DE ÍNDICES PARA PERFORMANCE
-- =====================================================================================

-- Índices principais
CREATE INDEX IF NOT EXISTS idx_imp_01_numero_processo ON importacao.imp_01_processos(numero_processo);
CREATE INDEX IF NOT EXISTS idx_imp_01_status ON importacao.imp_01_processos(status);
CREATE INDEX IF NOT EXISTS idx_imp_01_data_inicio ON importacao.imp_01_processos(data_inicio);

CREATE INDEX IF NOT EXISTS idx_imp_02_codigo_fornecedor ON importacao.imp_02_fornecedores_internacionais(codigo_fornecedor);
CREATE INDEX IF NOT EXISTS idx_imp_02_pais_origem ON importacao.imp_02_fornecedores_internacionais(pais_origem);

CREATE INDEX IF NOT EXISTS idx_imp_03_codigo_produto ON importacao.imp_03_produtos_importados(codigo_produto);
CREATE INDEX IF NOT EXISTS idx_imp_03_codigo_ncm ON importacao.imp_03_produtos_importados(codigo_ncm);

CREATE INDEX IF NOT EXISTS idx_imp_04_id_processo ON importacao.imp_04_itens_processo(id_processo);
CREATE INDEX IF NOT EXISTS idx_imp_04_id_produto ON importacao.imp_04_itens_processo(id_produto_imp);

CREATE INDEX IF NOT EXISTS idx_imp_05_id_processo ON importacao.imp_05_documentos(id_processo);
CREATE INDEX IF NOT EXISTS idx_imp_05_tipo_documento ON importacao.imp_05_documentos(tipo_documento);

CREATE INDEX IF NOT EXISTS idx_imp_07_id_processo ON importacao.imp_07_etapas_processo(id_processo);
CREATE INDEX IF NOT EXISTS idx_imp_07_status_etapa ON importacao.imp_07_etapas_processo(status_etapa);

CREATE INDEX IF NOT EXISTS idx_imp_08_id_processo ON importacao.imp_08_custos(id_processo);
CREATE INDEX IF NOT EXISTS idx_imp_08_tipo_custo ON importacao.imp_08_custos(tipo_custo);

CREATE INDEX IF NOT EXISTS idx_imp_18_tabela_id ON importacao.imp_18_historico_alteracoes(tabela_alterada, id_registro);
CREATE INDEX IF NOT EXISTS idx_imp_18_data_alteracao ON importacao.imp_18_historico_alteracoes(data_alteracao);

-- =====================================================================================
-- TRIGGERS PARA AUDITORIA AUTOMÁTICA
-- =====================================================================================

-- Função para auditoria automática
CREATE OR REPLACE FUNCTION importacao.fn_auditoria_automatica()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO importacao.imp_18_historico_alteracoes (
            tabela_alterada, id_registro, tipo_operacao, 
            valor_anterior, data_alteracao, usuario_alteracao
        ) VALUES (
            TG_TABLE_NAME, OLD.id, 'DELETE',
            row_to_json(OLD)::text, NOW(), USER
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO importacao.imp_18_historico_alteracoes (
            tabela_alterada, id_registro, tipo_operacao,
            valor_anterior, valor_novo, data_alteracao, usuario_alteracao
        ) VALUES (
            TG_TABLE_NAME, NEW.id, 'UPDATE',
            row_to_json(OLD)::text, row_to_json(NEW)::text, NOW(), USER
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO importacao.imp_18_historico_alteracoes (
            tabela_alterada, id_registro, tipo_operacao,
            valor_novo, data_alteracao, usuario_alteracao
        ) VALUES (
            TG_TABLE_NAME, NEW.id, 'INSERT',
            row_to_json(NEW)::text, NOW(), USER
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers em tabelas principais (exemplo para as 3 primeiras)
CREATE TRIGGER trg_auditoria_imp_01_processos
    AFTER INSERT OR UPDATE OR DELETE ON importacao.imp_01_processos
    FOR EACH ROW EXECUTE FUNCTION importacao.fn_auditoria_automatica();

CREATE TRIGGER trg_auditoria_imp_02_fornecedores
    AFTER INSERT OR UPDATE OR DELETE ON importacao.imp_02_fornecedores_internacionais
    FOR EACH ROW EXECUTE FUNCTION importacao.fn_auditoria_automatica();

CREATE TRIGGER trg_auditoria_imp_03_produtos
    AFTER INSERT OR UPDATE OR DELETE ON importacao.imp_03_produtos_importados
    FOR EACH ROW EXECUTE FUNCTION importacao.fn_auditoria_automatica();

-- =====================================================================================
-- INSERÇÃO DE DADOS INICIAIS
-- =====================================================================================

-- Inserir configurações iniciais do módulo
INSERT INTO importacao.imp_01_processos (
    numero_processo, descricao, status, observacoes, created_by
) VALUES (
    'IMP-2025-001', 
    'Processo de Importação Teste - Configuração Inicial', 
    'PLANEJAMENTO',
    'Processo criado para teste da estrutura do sistema',
    'SISTEMA'
) ON CONFLICT (numero_processo) DO NOTHING;

-- =====================================================================================
-- COMENTÁRIOS DAS TABELAS
-- =====================================================================================

COMMENT ON SCHEMA importacao IS 'Schema dedicado ao módulo de importação do ERP NXT';

COMMENT ON TABLE importacao.imp_01_processos IS 'Tabela principal de controle dos processos de importação';
COMMENT ON TABLE importacao.imp_02_fornecedores_internacionais IS 'Cadastro de fornecedores internacionais';
COMMENT ON TABLE importacao.imp_03_produtos_importados IS 'Catálogo de produtos para importação';
COMMENT ON TABLE importacao.imp_04_itens_processo IS 'Itens detalhados de cada processo de importação';
COMMENT ON TABLE importacao.imp_05_documentos IS 'Controle de documentos necessários para importação';
COMMENT ON TABLE importacao.imp_06_despachantes IS 'Cadastro de despachantes aduaneiros';
COMMENT ON TABLE importacao.imp_07_etapas_processo IS 'Controle de etapas e marcos dos processos';
COMMENT ON TABLE importacao.imp_08_custos IS 'Controle detalhado de custos de importação';
COMMENT ON TABLE importacao.imp_09_impostos_taxas IS 'Cálculo e controle de impostos e taxas';
COMMENT ON TABLE importacao.imp_10_licencas IS 'Controle de licenças de importação';
COMMENT ON TABLE importacao.imp_11_transporte IS 'Informações de transporte internacional';
COMMENT ON TABLE importacao.imp_12_armazenagem IS 'Controle de armazenagem em recintos alfandegados';
COMMENT ON TABLE importacao.imp_13_cambio_pagamentos IS 'Operações cambiais e pagamentos';
COMMENT ON TABLE importacao.imp_14_inspecoes IS 'Inspeções e certificações necessárias';
COMMENT ON TABLE importacao.imp_15_drawback IS 'Controle de regime especial drawback';
COMMENT ON TABLE importacao.imp_16_entregas IS 'Logística de entrega nacional';
COMMENT ON TABLE importacao.imp_17_follow_up IS 'Acompanhamento e follow-up dos processos';
COMMENT ON TABLE importacao.imp_18_historico_alteracoes IS 'Auditoria e histórico de todas as alterações';

-- =====================================================================================
-- FIM DO SCRIPT DE CRIAÇÃO DAS TABELAS DE IMPORTAÇÃO
-- =====================================================================================