-- Script completo para adicionar TODOS os campos faltantes nas tabelas importacao
-- Baseado na análise do blueprint do Make.com

-- ========================================
-- 1. CAMPOS FALTANTES NA TABELA PRINCIPAL
-- ========================================

-- importacao_01_1_proforma_invoice
ALTER TABLE importacao_01_1_proforma_invoice 
ADD COLUMN IF NOT EXISTS data DATE,
ADD COLUMN IF NOT EXISTS destino TEXT,
ADD COLUMN IF NOT EXISTS email_contratado TEXT,
ADD COLUMN IF NOT EXISTS empresa_contratada TEXT,
ADD COLUMN IF NOT EXISTS package_method TEXT,
ADD COLUMN IF NOT EXISTS porto_embarque TEXT,
ADD COLUMN IF NOT EXISTS processado_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS remetente_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS valor_total NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS url_documento JSONB,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Comentários para os novos campos
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

-- ========================================
-- 2. CAMPOS URL_DOCUMENTO NAS DEMAIS TABELAS
-- ========================================

-- importacao_02_1_comprovante_pagamento_cambio
ALTER TABLE importacao_02_1_comprovante_pagamento_cambio 
ADD COLUMN IF NOT EXISTS url_documento JSONB,
ADD COLUMN IF NOT EXISTS processado_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS remetente_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- importacao_03_1_contrato_de_cambio
ALTER TABLE importacao_03_1_contrato_de_cambio 
ADD COLUMN IF NOT EXISTS url_documento JSONB,
ADD COLUMN IF NOT EXISTS processado_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS remetente_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- importacao_04_1_swift
ALTER TABLE importacao_04_1_swift 
ADD COLUMN IF NOT EXISTS url_documento JSONB,
ADD COLUMN IF NOT EXISTS processado_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS remetente_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- importacao_05_1_commercial_invoice
ALTER TABLE importacao_05_1_commercial_invoice 
ADD COLUMN IF NOT EXISTS url_documento JSONB,
ADD COLUMN IF NOT EXISTS processado_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS remetente_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- importacao_06_1_packing_list
ALTER TABLE importacao_06_1_packing_list 
ADD COLUMN IF NOT EXISTS url_documento JSONB,
ADD COLUMN IF NOT EXISTS processado_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS remetente_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- importacao_07_1_bill_of_lading
ALTER TABLE importacao_07_1_bill_of_lading 
ADD COLUMN IF NOT EXISTS url_documento JSONB,
ADD COLUMN IF NOT EXISTS processado_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS remetente_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- importacao_08_1_di_declaracao_importacao
ALTER TABLE importacao_08_1_di_declaracao_importacao 
ADD COLUMN IF NOT EXISTS url_documento JSONB,
ADD COLUMN IF NOT EXISTS processado_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS remetente_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- importacao_09_1_nota_fiscal
ALTER TABLE importacao_09_1_nota_fiscal 
ADD COLUMN IF NOT EXISTS url_documento JSONB,
ADD COLUMN IF NOT EXISTS processado_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS remetente_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- importacao_10_1_fechamento
ALTER TABLE importacao_10_1_fechamento 
ADD COLUMN IF NOT EXISTS url_documento JSONB,
ADD COLUMN IF NOT EXISTS processado_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS remetente_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ========================================
-- 3. COMENTÁRIOS PARA CAMPOS COMUNS
-- ========================================

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
-- 4. TRIGGERS PARA UPDATED_AT
-- ========================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers para todas as tabelas
DO $$
DECLARE
    tabela TEXT;
    tabelas TEXT[] := ARRAY[
        'importacao_01_1_proforma_invoice',
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
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', tabela, tabela);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tabela, tabela);
    END LOOP;
END $$;

-- ========================================
-- 5. ÍNDICES PARA PERFORMANCE
-- ========================================

-- Criar índices nos campos mais consultados
CREATE INDEX IF NOT EXISTS idx_proforma_invoice_invoice_number ON importacao_01_1_proforma_invoice(invoice_number);
CREATE INDEX IF NOT EXISTS idx_proforma_invoice_processado_em ON importacao_01_1_proforma_invoice(processado_em);
CREATE INDEX IF NOT EXISTS idx_proforma_invoice_remetente_whatsapp ON importacao_01_1_proforma_invoice(remetente_whatsapp);

-- Índices para todas as tabelas relacionadas
DO $$
DECLARE
    tabela TEXT;
    tabelas TEXT[] := ARRAY[
        'importacao_01_2_proforma_invoice_items',
        'importacao_02_1_comprovante_pagamento_cambio',
        'importacao_03_1_contrato_de_cambio',
        'importacao_04_1_swift',
        'importacao_05_1_commercial_invoice',
        'importacao_05_2_commercial_invoice_items',
        'importacao_06_1_packing_list',
        'importacao_06_2_packing_list_containers',
        'importacao_06_3_packing_list_items',
        'importacao_07_1_bill_of_lading',
        'importacao_07_2_bill_of_lading_containers',
        'importacao_08_1_di_declaracao_importacao',
        'importacao_08_2_di_adicoes',
        'importacao_08_3_di_tributos_por_adicao',
        'importacao_09_1_nota_fiscal',
        'importacao_09_2_nota_fiscal_itens',
        'importacao_10_1_fechamento'
    ];
BEGIN
    FOREACH tabela IN ARRAY tabelas
    LOOP
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_invoice_number ON %I(invoice_number)', tabela, tabela);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_proforma_id ON %I(importacao_01_1_proforma_invoice_id)', tabela, tabela);
    END LOOP;
END $$;

-- ========================================
-- 6. VALIDAÇÃO E EXEMPLO DE USO
-- ========================================

-- Verificar estrutura após alterações
/*
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name LIKE 'importacao_%'
    AND column_name IN ('url_documento', 'processado_em', 'remetente_whatsapp', 'created_at', 'updated_at')
ORDER BY table_name, ordinal_position;
*/

-- Exemplo de inserção com novos campos
/*
INSERT INTO importacao_01_1_proforma_invoice (
    invoice_number,
    data,
    destino,
    email_contratado,
    empresa_contratada,
    package_method,
    porto_embarque,
    processado_em,
    remetente_whatsapp,
    valor_total,
    url_documento,
    -- campos originais...
    condicao_pagamento,
    vendedor,
    email_vendedor
) VALUES (
    'INV-2024-001',
    '2024-01-15',
    'São Paulo, Brasil',
    'fornecedor@china.com',
    'China Export Co. Ltd',
    'Pallets',
    'Shanghai',
    CURRENT_TIMESTAMP,
    '5511999887766',
    125000.00,
    '[
        {
            "url": "https://supabase.storage/bucket/importacao.app/INV-2024-001-proforma.pdf",
            "title": "Proforma Invoice Original",
            "mimetype": "application/pdf",
            "size": 2048000
        }
    ]'::jsonb,
    '30 dias',
    'John Doe',
    'john@chinaexport.com'
);
*/