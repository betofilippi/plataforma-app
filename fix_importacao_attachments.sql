-- Script para adicionar campo url_documento (attachment) nas tabelas importacao
-- Este campo está presente no blueprint do Make.com mas foi omitido quando as tabelas foram recriadas

-- Adicionar campo url_documento em todas as 10 tabelas principais
-- Tipo JSONB para armazenar array de attachments com estrutura: {url, title, mimetype, size}

-- 1. importacao_01_1_proforma_invoice
ALTER TABLE importacao_01_1_proforma_invoice 
ADD COLUMN IF NOT EXISTS url_documento JSONB;

-- 2. importacao_02_1_comprovante_pagamento_cambio
ALTER TABLE importacao_02_1_comprovante_pagamento_cambio 
ADD COLUMN IF NOT EXISTS url_documento JSONB;

-- 3. importacao_03_1_contrato_de_cambio
ALTER TABLE importacao_03_1_contrato_de_cambio 
ADD COLUMN IF NOT EXISTS url_documento JSONB;

-- 4. importacao_04_1_swift
ALTER TABLE importacao_04_1_swift 
ADD COLUMN IF NOT EXISTS url_documento JSONB;

-- 5. importacao_05_1_commercial_invoice
ALTER TABLE importacao_05_1_commercial_invoice 
ADD COLUMN IF NOT EXISTS url_documento JSONB;

-- 6. importacao_06_1_packing_list
ALTER TABLE importacao_06_1_packing_list 
ADD COLUMN IF NOT EXISTS url_documento JSONB;

-- 7. importacao_07_1_bill_of_lading
ALTER TABLE importacao_07_1_bill_of_lading 
ADD COLUMN IF NOT EXISTS url_documento JSONB;

-- 8. importacao_08_1_di_declaracao_importacao
ALTER TABLE importacao_08_1_di_declaracao_importacao 
ADD COLUMN IF NOT EXISTS url_documento JSONB;

-- 9. importacao_09_1_nota_fiscal
ALTER TABLE importacao_09_1_nota_fiscal 
ADD COLUMN IF NOT EXISTS url_documento JSONB;

-- 10. importacao_10_1_fechamento
ALTER TABLE importacao_10_1_fechamento 
ADD COLUMN IF NOT EXISTS url_documento JSONB;

-- Comentários sobre a estrutura esperada do campo
COMMENT ON COLUMN importacao_01_1_proforma_invoice.url_documento IS 'Array de attachments: [{url: string, title: string, mimetype: string, size: number}]';
COMMENT ON COLUMN importacao_02_1_comprovante_pagamento_cambio.url_documento IS 'Array de attachments: [{url: string, title: string, mimetype: string, size: number}]';
COMMENT ON COLUMN importacao_03_1_contrato_de_cambio.url_documento IS 'Array de attachments: [{url: string, title: string, mimetype: string, size: number}]';
COMMENT ON COLUMN importacao_04_1_swift.url_documento IS 'Array de attachments: [{url: string, title: string, mimetype: string, size: number}]';
COMMENT ON COLUMN importacao_05_1_commercial_invoice.url_documento IS 'Array de attachments: [{url: string, title: string, mimetype: string, size: number}]';
COMMENT ON COLUMN importacao_06_1_packing_list.url_documento IS 'Array de attachments: [{url: string, title: string, mimetype: string, size: number}]';
COMMENT ON COLUMN importacao_07_1_bill_of_lading.url_documento IS 'Array de attachments: [{url: string, title: string, mimetype: string, size: number}]';
COMMENT ON COLUMN importacao_08_1_di_declaracao_importacao.url_documento IS 'Array de attachments: [{url: string, title: string, mimetype: string, size: number}]';
COMMENT ON COLUMN importacao_09_1_nota_fiscal.url_documento IS 'Array de attachments: [{url: string, title: string, mimetype: string, size: number}]';
COMMENT ON COLUMN importacao_10_1_fechamento.url_documento IS 'Array de attachments: [{url: string, title: string, mimetype: string, size: number}]';

-- Exemplo de como inserir dados no campo url_documento:
/*
UPDATE importacao_01_1_proforma_invoice 
SET url_documento = '[
  {
    "url": "https://storage.app/bucket/file1.pdf",
    "title": "Proforma Invoice PDF",
    "mimetype": "application/pdf",
    "size": 1024000
  },
  {
    "url": "https://storage.app/bucket/file2.jpg",
    "title": "Product Image",
    "mimetype": "image/jpeg",
    "size": 512000
  }
]'::jsonb
WHERE id = 1;
*/