# Estrutura E-commerce e Marketplace - Padrão Mercado Livre

## 🎯 Objetivo

Criar estrutura completa de dados para produtos em e-commerce e marketplaces, seguindo o padrão do Mercado Livre para integração automática com anúncios, catálogos e sincronização multi-canal.

---

## 🏗️ MÓDULO PRD - PRODUTOS E-COMMERCE (Extensão)

### **PRD_05_produtos_ecommerce**
```sql
CREATE TABLE prd_05_produtos_ecommerce (
    id_produto_ecommerce        SERIAL PRIMARY KEY,
    id_produto                  INTEGER NOT NULL REFERENCES prd_03_produtos(id_produto) ON DELETE CASCADE,
    
    -- ========== DADOS BÁSICOS MARKETPLACE ==========
    titulo_anuncio              VARCHAR(60) NOT NULL, -- Limite ML: 60 caracteres
    descricao_completa          TEXT NOT NULL, -- HTML permitido
    categoria_ml_id             VARCHAR(20), -- Category ID do Mercado Livre
    categoria_ml_nome           VARCHAR(100),
    condicao_produto            VARCHAR(10) DEFAULT 'new' CHECK (condicao_produto IN ('new', 'used', 'not_specified')),
    disponivel_marketplace      BOOLEAN DEFAULT TRUE,
    
    -- ========== MÍDIA E RECURSOS VISUAIS ==========
    fotos_urls                  JSONB DEFAULT '[]'::jsonb, -- Array até 12 URLs
    video_url                   VARCHAR(500), -- URL do vídeo principal
    video_youtube_id            VARCHAR(20), -- ID do vídeo YouTube
    catalogo_pdf_url            VARCHAR(500), -- Catálogo técnico PDF
    manual_usuario_url          VARCHAR(500), -- Manual do usuário
    certificados_urls           JSONB DEFAULT '[]'::jsonb, -- Certificações (ANATEL, etc)
    
    -- ========== ESPECIFICAÇÕES TÉCNICAS ==========
    atributos_ml                JSONB DEFAULT '{}'::jsonb, -- Atributos específicos ML
    especificacoes_tecnicas     JSONB DEFAULT '{}'::jsonb, -- Specs detalhadas
    compatibilidades            JSONB DEFAULT '[]'::jsonb, -- Produtos compatíveis
    itens_inclusos              JSONB DEFAULT '[]'::jsonb, -- O que vem na caixa
    
    -- ========== LOGÍSTICA E ENVIO ==========
    peso_produto_g              INTEGER, -- Peso em gramas
    altura_cm                   NUMERIC(6,2), -- Altura em cm
    largura_cm                  NUMERIC(6,2), -- Largura em cm
    profundidade_cm             NUMERIC(6,2), -- Profundidade em cm
    tempo_processamento_dias    INTEGER DEFAULT 2, -- Dias para processar
    origem_produto              VARCHAR(50) DEFAULT 'NACIONAL',
    
    -- ========== PRICING E VENDAS ==========
    preco_marketplace           NUMERIC(15,2) NOT NULL,
    preco_promocional           NUMERIC(15,2),
    data_inicio_promocao        DATE,
    data_fim_promocao           DATE,
    aceita_mercado_pago         BOOLEAN DEFAULT TRUE,
    parcelamento_max            INTEGER DEFAULT 12,
    desconto_maximo_pct         NUMERIC(5,2) DEFAULT 10.00,
    
    -- ========== SEO E OTIMIZAÇÃO ==========
    palavras_chave              JSONB DEFAULT '[]'::jsonb, -- Keywords para busca
    tags_produto                JSONB DEFAULT '[]'::jsonb, -- Tags organizacionais
    meta_description            VARCHAR(160), -- Para SEO
    slug_url                    VARCHAR(100), -- URL amigável
    
    -- ========== SYNC MERCADO LIVRE ==========
    ml_item_id                  VARCHAR(20) UNIQUE, -- ID do item no ML
    ml_listing_type             VARCHAR(20) DEFAULT 'gold_special', -- Tipo de anúncio
    ml_status                   VARCHAR(20) DEFAULT 'draft', -- Status no ML
    ml_permalink                VARCHAR(200), -- Link permanente ML
    ml_thumbnail                VARCHAR(200), -- Thumbnail ML
    ml_last_sync                TIMESTAMP, -- Última sincronização
    ml_sync_status              VARCHAR(20) DEFAULT 'pending', -- Status sync
    ml_sync_error               TEXT, -- Erro da última sync
    
    -- ========== OUTROS MARKETPLACES ==========
    shopee_enabled              BOOLEAN DEFAULT FALSE,
    amazon_enabled              BOOLEAN DEFAULT FALSE,
    magalu_enabled              BOOLEAN DEFAULT FALSE,
    marketplace_configs         JSONB DEFAULT '{}'::jsonb, -- Configs específicas
    
    -- ========== AUDITORIA ==========
    ativo                       BOOLEAN DEFAULT TRUE,
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW(),
    created_by                  VARCHAR(50) DEFAULT 'SISTEMA',
    updated_by                  VARCHAR(50) DEFAULT 'SISTEMA'
);

-- Índices para performance
CREATE INDEX idx_produtos_ecommerce_produto_id ON prd_05_produtos_ecommerce(id_produto);
CREATE INDEX idx_produtos_ecommerce_ml_item ON prd_05_produtos_ecommerce(ml_item_id);
CREATE INDEX idx_produtos_ecommerce_categoria ON prd_05_produtos_ecommerce(categoria_ml_id);
CREATE INDEX idx_produtos_ecommerce_status ON prd_05_produtos_ecommerce(ml_status);
CREATE INDEX idx_produtos_ecommerce_ativo ON prd_05_produtos_ecommerce(ativo);
CREATE INDEX idx_produtos_ecommerce_marketplace ON prd_05_produtos_ecommerce(disponivel_marketplace);

-- Índice GIN para JSONB
CREATE INDEX idx_produtos_ecommerce_atributos ON prd_05_produtos_ecommerce USING GIN(atributos_ml);
CREATE INDEX idx_produtos_ecommerce_specs ON prd_05_produtos_ecommerce USING GIN(especificacoes_tecnicas);
CREATE INDEX idx_produtos_ecommerce_keywords ON prd_05_produtos_ecommerce USING GIN(palavras_chave);
```

### **PRD_06_atributos_marketplace**
```sql
CREATE TABLE prd_06_atributos_marketplace (
    id_atributo                 SERIAL PRIMARY KEY,
    categoria_ml_id             VARCHAR(20) NOT NULL,
    atributo_ml_id              VARCHAR(50) NOT NULL,
    atributo_nome               VARCHAR(100) NOT NULL,
    atributo_tipo               VARCHAR(20) NOT NULL, -- string, number, boolean, list
    obrigatorio                 BOOLEAN DEFAULT FALSE,
    valores_permitidos          JSONB DEFAULT '[]'::jsonb, -- Lista de valores válidos
    valor_padrao                VARCHAR(100),
    unidade_medida              VARCHAR(20),
    validacao_regex             VARCHAR(200),
    descricao_help              TEXT,
    ordem_exibicao              INTEGER DEFAULT 999,
    ativo                       BOOLEAN DEFAULT TRUE,
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_atributos_categoria ON prd_06_atributos_marketplace(categoria_ml_id);
CREATE INDEX idx_atributos_ml_id ON prd_06_atributos_marketplace(atributo_ml_id);
CREATE INDEX idx_atributos_obrigatorio ON prd_06_atributos_marketplace(obrigatorio);
CREATE UNIQUE INDEX idx_atributos_categoria_ml_unique ON prd_06_atributos_marketplace(categoria_ml_id, atributo_ml_id);

-- Dados iniciais para equipamentos de mobilidade elétrica
INSERT INTO prd_06_atributos_marketplace (categoria_ml_id, atributo_ml_id, atributo_nome, atributo_tipo, obrigatorio, valores_permitidos) VALUES
('MLB1499', 'BRAND', 'Marca', 'string', TRUE, '[]'),
('MLB1499', 'MODEL', 'Modelo', 'string', TRUE, '[]'),
('MLB1499', 'MOTOR_POWER', 'Potência do Motor', 'string', TRUE, '["250W", "350W", "500W", "750W", "1000W", "1500W", "2000W"]'),
('MLB1499', 'BATTERY_TYPE', 'Tipo de Bateria', 'string', TRUE, '["Litio", "Chumbo", "LiFePO4"]'),
('MLB1499', 'BATTERY_VOLTAGE', 'Voltagem da Bateria', 'string', TRUE, '["12V", "24V", "36V", "48V", "60V", "72V"]'),
('MLB1499', 'AUTONOMY', 'Autonomia', 'string', TRUE, '["10-20km", "20-30km", "30-40km", "40-50km", "50-60km", "60km+"]'),
('MLB1499', 'MAX_SPEED', 'Velocidade Máxima', 'string', TRUE, '["20km/h", "25km/h", "30km/h", "35km/h", "40km/h", "45km/h", "50km/h+"]'),
('MLB1499', 'WEIGHT_CAPACITY', 'Capacidade de Peso', 'string', TRUE, '["100kg", "120kg", "150kg", "180kg", "200kg", "250kg+"]'),
('MLB1499', 'WHEEL_SIZE', 'Tamanho da Roda', 'string', FALSE, '["8 polegadas", "10 polegadas", "12 polegadas", "14 polegadas", "16 polegadas", "20 polegadas"]'),
('MLB1499', 'BRAKE_TYPE', 'Tipo de Freio', 'string', FALSE, '["Disco", "Tambor", "Regenerativo", "Híbrido"]'),
('MLB1499', 'SUSPENSION', 'Suspensão', 'string', FALSE, '["Sim", "Não"]'),
('MLB1499', 'FOLDABLE', 'Dobrável', 'boolean', FALSE, '[]'),
('MLB1499', 'WATERPROOF', 'Resistência à Água', 'string', FALSE, '["IPX4", "IPX5", "IPX6", "IPX7", "Não"]'),
('MLB1499', 'DISPLAY_TYPE', 'Tipo de Display', 'string', FALSE, '["LED", "LCD", "Digital", "Analógico", "Sem Display"]'),
('MLB1499', 'CHARGING_TIME', 'Tempo de Carregamento', 'string', FALSE, '["2-4h", "4-6h", "6-8h", "8-10h", "10h+"]');
```

### **PRD_07_templates_marketplace**
```sql
CREATE TABLE prd_07_templates_marketplace (
    id_template                 SERIAL PRIMARY KEY,
    nome_template               VARCHAR(100) NOT NULL,
    categoria_ml_id             VARCHAR(20),
    tipo_produto                VARCHAR(50), -- scooter, bicicleta, patinete, etc
    template_titulo             VARCHAR(60), -- Template para título
    template_descricao          TEXT, -- Template HTML para descrição
    template_especificacoes     JSONB DEFAULT '{}'::jsonb, -- Template de specs
    template_palavras_chave     JSONB DEFAULT '[]'::jsonb, -- Keywords padrão
    template_fotos_sugeridas    JSONB DEFAULT '[]'::jsonb, -- Tipos de foto sugeridas
    
    ativo                       BOOLEAN DEFAULT TRUE,
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW()
);

-- Templates iniciais para equipamentos de mobilidade
INSERT INTO prd_07_templates_marketplace (nome_template, categoria_ml_id, tipo_produto, template_titulo, template_descricao, template_palavras_chave) VALUES
('Patinete Elétrico Padrão', 'MLB1499', 'patinete', 
'Patinete Elétrico {MARCA} {MODELO} {POTENCIA} {AUTONOMIA}',
'<h2>🛴 Patinete Elétrico de Alta Performance</h2>
<p><strong>Especificações Técnicas:</strong></p>
<ul>
<li>🔋 <strong>Bateria:</strong> {BATTERY_TYPE} {BATTERY_VOLTAGE}</li>
<li>⚡ <strong>Motor:</strong> {MOTOR_POWER}</li>
<li>📏 <strong>Autonomia:</strong> {AUTONOMY}</li>
<li>🏃 <strong>Velocidade:</strong> {MAX_SPEED}</li>
<li>⚖️ <strong>Suporta até:</strong> {WEIGHT_CAPACITY}</li>
</ul>
<h3>🔥 Principais Características:</h3>
<ul>
<li>✅ Design moderno e resistente</li>
<li>✅ Freios seguros e eficientes</li>
<li>✅ Display digital informativo</li>
<li>✅ Bateria de longa duração</li>
<li>✅ Fácil manutenção</li>
</ul>
<h3>📦 Itens Inclusos:</h3>
<ul>
<li>1x Patinete Elétrico</li>
<li>1x Carregador</li>
<li>1x Manual do Usuário</li>
<li>1x Chave de Fenda</li>
</ul>
<p><strong>⚠️ ATENÇÃO:</strong> Produto certificado e dentro das normas brasileiras de segurança.</p>',
'["patinete elétrico", "scooter elétrico", "mobilidade elétrica", "transporte sustentável", "patinete adulto", "veículo elétrico"]'::jsonb);
```

### **PRD_08_sync_marketplace**
```sql
CREATE TABLE prd_08_sync_marketplace (
    id_sync                     SERIAL PRIMARY KEY,
    id_produto_ecommerce        INTEGER NOT NULL REFERENCES prd_05_produtos_ecommerce(id_produto_ecommerce) ON DELETE CASCADE,
    marketplace                 VARCHAR(20) NOT NULL, -- ML, SHOPEE, AMAZON, etc
    marketplace_item_id         VARCHAR(50),
    marketplace_sku             VARCHAR(100),
    status_sync                 VARCHAR(20) DEFAULT 'pending', -- pending, synced, error, disabled
    ultima_sync                 TIMESTAMP,
    proxima_sync                TIMESTAMP,
    erro_ultimo_sync            TEXT,
    tentativas_sync             INTEGER DEFAULT 0,
    dados_marketplace           JSONB DEFAULT '{}'::jsonb, -- Dados específicos do marketplace
    
    -- Configurações específicas
    auto_sync_estoque           BOOLEAN DEFAULT TRUE,
    auto_sync_preco             BOOLEAN DEFAULT TRUE,
    auto_sync_descricao         BOOLEAN DEFAULT FALSE,
    auto_sync_fotos             BOOLEAN DEFAULT FALSE,
    
    ativo                       BOOLEAN DEFAULT TRUE,
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_sync_marketplace_produto ON prd_08_sync_marketplace(id_produto_ecommerce);
CREATE INDEX idx_sync_marketplace_tipo ON prd_08_sync_marketplace(marketplace);
CREATE INDEX idx_sync_marketplace_status ON prd_08_sync_marketplace(status_sync);
CREATE INDEX idx_sync_marketplace_proxima ON prd_08_sync_marketplace(proxima_sync);
CREATE UNIQUE INDEX idx_sync_marketplace_unique ON prd_08_sync_marketplace(id_produto_ecommerce, marketplace);
```

---

## 🔄 TRIGGERS E FUNÇÕES DE SINCRONIZAÇÃO

### **Trigger: Atualização Automática**
```sql
-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para todas as tabelas
CREATE TRIGGER trg_produtos_ecommerce_updated_at
    BEFORE UPDATE ON prd_05_produtos_ecommerce
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_atributos_marketplace_updated_at
    BEFORE UPDATE ON prd_06_atributos_marketplace
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_sync_marketplace_updated_at
    BEFORE UPDATE ON prd_08_sync_marketplace
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
```

### **Função: Preparar Dados para Mercado Livre**
```sql
CREATE OR REPLACE FUNCTION fn_preparar_dados_ml(p_produto_ecommerce_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    produto_data RECORD;
    ml_data JSONB;
BEGIN
    -- Buscar dados do produto
    SELECT 
        pe.*,
        p.codigo_produto,
        p.descricao as desc_produto,
        p.preco_custo
    INTO produto_data
    FROM prd_05_produtos_ecommerce pe
    JOIN prd_03_produtos p ON p.id_produto = pe.id_produto
    WHERE pe.id_produto_ecommerce = p_produto_ecommerce_id;
    
    -- Montar JSON para API do ML
    ml_data := jsonb_build_object(
        'title', produto_data.titulo_anuncio,
        'category_id', produto_data.categoria_ml_id,
        'price', produto_data.preco_marketplace,
        'currency_id', 'BRL',
        'available_quantity', 999, -- Será atualizado pelo estoque
        'buying_mode', 'buy_it_now',
        'condition', produto_data.condicao_produto,
        'listing_type_id', produto_data.ml_listing_type,
        'description', jsonb_build_object(
            'plain_text', produto_data.descricao_completa
        ),
        'pictures', produto_data.fotos_urls,
        'attributes', produto_data.atributos_ml,
        'shipping', jsonb_build_object(
            'mode', 'me2',
            'dimensions', jsonb_build_object(
                'width', produto_data.largura_cm,
                'height', produto_data.altura_cm,
                'length', produto_data.profundidade_cm
            ),
            'weight', produto_data.peso_produto_g
        ),
        'tags', produto_data.palavras_chave
    );
    
    RETURN ml_data;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 VIEWS CONSOLIDADAS

### **View: Dashboard E-commerce**
```sql
CREATE VIEW vw_dashboard_ecommerce AS
SELECT 
    pe.id_produto_ecommerce,
    p.codigo_produto,
    p.descricao as produto_nome,
    pe.titulo_anuncio,
    pe.categoria_ml_nome,
    pe.preco_marketplace,
    pe.ml_item_id,
    pe.ml_status,
    pe.ml_last_sync,
    
    -- Status de sync por marketplace
    (SELECT COUNT(*) FROM prd_08_sync_marketplace sm 
     WHERE sm.id_produto_ecommerce = pe.id_produto_ecommerce 
       AND sm.status_sync = 'synced') as marketplaces_sincronizados,
       
    (SELECT COUNT(*) FROM prd_08_sync_marketplace sm 
     WHERE sm.id_produto_ecommerce = pe.id_produto_ecommerce 
       AND sm.status_sync = 'error') as marketplaces_com_erro,
    
    -- Estoque atual
    COALESCE((SELECT SUM(se.saldo_atual) 
              FROM est_03_saldos_estoque se 
              WHERE se.id_produto = pe.id_produto), 0) as estoque_atual,
    
    -- Status geral
    CASE 
        WHEN pe.ml_status = 'active' AND pe.disponivel_marketplace THEN 'ATIVO'
        WHEN pe.ml_status = 'paused' THEN 'PAUSADO'
        WHEN pe.ml_status = 'closed' THEN 'FINALIZADO'
        WHEN pe.ml_status IS NULL THEN 'NÃO_SINCRONIZADO'
        ELSE 'DESCONHECIDO'
    END as status_geral,
    
    pe.created_at,
    pe.updated_at
    
FROM prd_05_produtos_ecommerce pe
JOIN prd_03_produtos p ON p.id_produto = pe.id_produto
WHERE pe.ativo = TRUE
ORDER BY pe.updated_at DESC;
```

### **View: Produtos Pendentes de Sync**
```sql
CREATE VIEW vw_produtos_pendentes_sync AS
SELECT 
    pe.id_produto_ecommerce,
    p.codigo_produto,
    pe.titulo_anuncio,
    pe.ml_status,
    pe.ml_last_sync,
    
    -- Motivos pendência
    CASE 
        WHEN pe.ml_item_id IS NULL THEN 'NUNCA_SINCRONIZADO'
        WHEN pe.ml_last_sync < pe.updated_at THEN 'PRODUTO_ALTERADO'
        WHEN pe.ml_last_sync < NOW() - INTERVAL '24 hours' THEN 'SYNC_ANTIGA'
        WHEN EXISTS(SELECT 1 FROM prd_08_sync_marketplace sm 
                   WHERE sm.id_produto_ecommerce = pe.id_produto_ecommerce 
                     AND sm.status_sync = 'error') THEN 'ERRO_SYNC_MARKETPLACE'
        ELSE 'VERIFICAR'
    END as motivo_pendencia,
    
    pe.updated_at,
    pe.created_at
    
FROM prd_05_produtos_ecommerce pe
JOIN prd_03_produtos p ON p.id_produto = pe.id_produto
WHERE pe.ativo = TRUE
  AND pe.disponivel_marketplace = TRUE
  AND (
    pe.ml_item_id IS NULL OR
    pe.ml_last_sync IS NULL OR
    pe.ml_last_sync < pe.updated_at OR
    pe.ml_last_sync < NOW() - INTERVAL '24 hours' OR
    EXISTS(SELECT 1 FROM prd_08_sync_marketplace sm 
           WHERE sm.id_produto_ecommerce = pe.id_produto_ecommerce 
             AND sm.status_sync = 'error')
  )
ORDER BY pe.updated_at DESC;
```

---

## 🔧 COMANDOS DE MANUTENÇÃO

### **Comandos Úteis**
```sql
-- Listar produtos sem sincronização ML
SELECT * FROM vw_produtos_pendentes_sync;

-- Resetar status de sync para re-processamento
UPDATE prd_08_sync_marketplace 
SET status_sync = 'pending', tentativas_sync = 0, erro_ultimo_sync = NULL
WHERE marketplace = 'ML' AND status_sync = 'error';

-- Buscar produtos por categoria ML
SELECT pe.*, p.codigo_produto 
FROM prd_05_produtos_ecommerce pe
JOIN prd_03_produtos p ON p.id_produto = pe.id_produto
WHERE pe.categoria_ml_id = 'MLB1499';

-- Gerar dados para sync ML
SELECT fn_preparar_dados_ml(1);
```

---

**Estrutura E-commerce/Marketplace Completa**  
*Versão: 1.0*  
*Data: 2025-07-05*  
*Projeto: ERP Integrado NXT + E-commerce Multi-Marketplace*