# Sistema CRM - Leads e Clientes - NXT Indústria e Comércio Ltda

## 🎯 Objetivo do Sistema CRM

Implementar uma solução completa de gestão de relacionamento com clientes, integrando **leads** (prospecção) e **clientes** (vendas concretizadas) com foco na manufatura de equipamentos de mobilidade elétrica.

---

## 🏗️ Arquitetura do CRM

### **Módulo 1**: Gestão de Leads
- Captação de prospects de múltiplas origens
- Pipeline de vendas com probabilidades
- Rastreamento de conversões
- Histórico de interações

### **Módulo 2**: Gestão de Clientes  
- Base consolidada de clientes ativos
- Histórico completo de compras
- Relacionamento com notas fiscais
- Classificação por valor de negócio

### **Módulo 3**: Integração com Vendas
- Conversão automática lead → cliente
- Rastreamento de pedidos e entregas
- Análise de lifetime value
- Dashboard comercial

---

## 📋 Estrutura das Tabelas CRM

### 1. **cad_08_leads** - Sistema de Leads

```sql
CREATE TABLE cad_08_leads (
    id_lead                     SERIAL PRIMARY KEY,
    
    -- Dados básicos do lead
    nome                        VARCHAR(100) NOT NULL,
    email                       VARCHAR(100),
    telefone                    VARCHAR(20),
    whatsapp                    VARCHAR(20),
    empresa                     VARCHAR(100),
    cargo                       VARCHAR(50),
    segmento_empresa            VARCHAR(50), -- Logística, Delivery, Industrial, etc.
    
    -- Origem e rastreamento
    origem_lead                 VARCHAR(50) NOT NULL, -- Site, WhatsApp, Feira, Indicação, etc.
    canal_especifico            VARCHAR(100), -- WhatsApp Business, Google Ads, etc.
    utm_source                  VARCHAR(50),
    utm_medium                  VARCHAR(50),
    utm_campaign                VARCHAR(50),
    pagina_origem               VARCHAR(200),
    
    -- Status e pipeline
    status_lead                 VARCHAR(20) DEFAULT 'NOVO' CHECK (status_lead IN (
        'NOVO', 'QUALIFICADO', 'EM_NEGOCIACAO', 'PROPOSTA_ENVIADA', 
        'CONVERTIDO', 'PERDIDO', 'INATIVO'
    )),
    
    -- Dados comerciais
    produto_interesse           VARCHAR(100), -- Equipamento de interesse
    aplicacao_pretendida        VARCHAR(200), -- Como pretende usar
    valor_estimado_negocio      NUMERIC(15,2),
    probabilidade_fechamento    INTEGER DEFAULT 0 CHECK (probabilidade_fechamento BETWEEN 0 AND 100),
    prazo_estimado_decisao      VARCHAR(50), -- 30 dias, 60 dias, etc.
    
    -- Interações e conversão
    data_primeiro_contato       DATE DEFAULT CURRENT_DATE,
    data_ultimo_contato         DATE,
    quantidade_interacoes       INTEGER DEFAULT 1,
    data_conversao              DATE,
    id_cliente_convertido       INTEGER REFERENCES cad_03_clientes(id_cliente),
    id_venda_conversao          INTEGER REFERENCES vnd_05_vendas(id_venda),
    
    -- Observações e follow-up
    observacoes                 TEXT,
    observacoes_comerciais      TEXT,
    proxima_acao                VARCHAR(200),
    data_proxima_acao           DATE,
    
    -- Responsável
    vendedor_responsavel        VARCHAR(100),
    equipe_responsavel          VARCHAR(50),
    
    -- Controle
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
CREATE INDEX idx_leads_proxima_acao ON cad_08_leads(data_proxima_acao) WHERE data_proxima_acao IS NOT NULL;
```

### 2. **cad_09_interacoes_leads** - Histórico de Interações

```sql
CREATE TABLE cad_09_interacoes_leads (
    id_interacao                SERIAL PRIMARY KEY,
    id_lead                     INTEGER NOT NULL REFERENCES cad_08_leads(id_lead) ON DELETE CASCADE,
    
    -- Dados da interação
    tipo_interacao              VARCHAR(30) NOT NULL CHECK (tipo_interacao IN (
        'TELEFONE', 'WHATSAPP', 'EMAIL', 'REUNIAO_PRESENCIAL', 
        'REUNIAO_ONLINE', 'DEMONSTRACAO', 'PROPOSTA', 'FOLLOW_UP'
    )),
    
    data_interacao              TIMESTAMP DEFAULT NOW(),
    duracao_minutos             INTEGER,
    
    -- Detalhes
    assunto                     VARCHAR(200),
    descricao                   TEXT,
    resultado                   VARCHAR(100), -- Interessado, Não interessado, Reagendar, etc.
    
    -- Próximos passos
    gerar_follow_up             BOOLEAN DEFAULT FALSE,
    data_follow_up              DATE,
    observacoes_follow_up       TEXT,
    
    -- Responsável
    usuario_responsavel         VARCHAR(100),
    
    -- Arquivos/links relacionados
    arquivos_anexos             JSONB, -- URLs de propostas, apresentações, etc.
    
    created_at                  TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_interacoes_lead ON cad_09_interacoes_leads(id_lead);
CREATE INDEX idx_interacoes_data ON cad_09_interacoes_leads(data_interacao);
CREATE INDEX idx_interacoes_tipo ON cad_09_interacoes_leads(tipo_interacao);
CREATE INDEX idx_interacoes_follow_up ON cad_09_interacoes_leads(data_follow_up) WHERE data_follow_up IS NOT NULL;
```

### 3. **cad_03_clientes** - Extensão para CRM (Tabela Existente + Campos CRM)

```sql
-- Campos CRM adicionados à tabela existente cad_03_clientes

ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS historico_compras JSONB DEFAULT '[]'::jsonb;
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS total_compras NUMERIC(15,2) DEFAULT 0;
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS quantidade_pedidos INTEGER DEFAULT 0;
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS ticket_medio NUMERIC(15,2) DEFAULT 0;
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS primeira_compra DATE;
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS ultima_compra DATE;
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS ultima_interacao DATE;

-- Classificação e segmentação
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS classificacao_cliente VARCHAR(20) DEFAULT 'NOVO' 
    CHECK (classificacao_cliente IN ('NOVO', 'BRONZE', 'PRATA', 'OURO', 'PLATINA', 'VIP'));
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS segmento_negocio VARCHAR(50); -- Logística, Delivery, etc.
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS porte_empresa VARCHAR(20); -- MEI, Pequeno, Médio, Grande

-- Dados comerciais e relacionamento
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS vendedor_responsavel VARCHAR(100);
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS gerente_conta VARCHAR(100);
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS observacoes_comerciais TEXT;
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS observacoes_internas TEXT;

-- Lead de origem
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS id_lead_origem INTEGER REFERENCES cad_08_leads(id_lead);
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS origem_cliente VARCHAR(50); -- Como chegou até nós

-- Contato principal e secundário
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS contato_principal_nome VARCHAR(100);
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS contato_principal_cargo VARCHAR(50);
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS contato_principal_whatsapp VARCHAR(20);
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS contato_secundario_nome VARCHAR(100);
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS contato_secundario_email VARCHAR(100);
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS contato_secundario_telefone VARCHAR(20);

-- Preferências comerciais
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS condicao_pagamento_preferida VARCHAR(50);
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS prazo_entrega_preferido VARCHAR(30);
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS observacoes_logisticas TEXT;

-- Produtos de interesse
ALTER TABLE cad_03_clientes ADD COLUMN IF NOT EXISTS produtos_interesse JSONB DEFAULT '[]'::jsonb;

-- Índices CRM
CREATE INDEX idx_clientes_classificacao ON cad_03_clientes(classificacao_cliente);
CREATE INDEX idx_clientes_vendedor ON cad_03_clientes(vendedor_responsavel);
CREATE INDEX idx_clientes_segmento ON cad_03_clientes(segmento_negocio);
CREATE INDEX idx_clientes_ultima_compra ON cad_03_clientes(ultima_compra);
CREATE INDEX idx_clientes_lead_origem ON cad_03_clientes(id_lead_origem);
```

---

## 🔄 Triggers e Automações

### 1. **Conversão Automática Lead → Cliente**

```sql
-- Trigger para conversão automática quando venda é criada
CREATE OR REPLACE FUNCTION fn_converter_lead_cliente()
RETURNS TRIGGER AS $$
DECLARE
    lead_id INTEGER;
    cliente_record RECORD;
BEGIN
    -- Verifica se existe lead com mesmo email/telefone do cliente
    SELECT l.id_lead INTO lead_id
    FROM cad_08_leads l
    JOIN cad_03_clientes c ON c.id_cliente = NEW.id_cliente
    WHERE l.status_lead IN ('QUALIFICADO', 'EM_NEGOCIACAO', 'PROPOSTA_ENVIADA')
      AND (l.email = c.email OR l.telefone = c.telefone OR l.whatsapp = c.telefone)
    LIMIT 1;
    
    IF lead_id IS NOT NULL THEN
        -- Atualiza lead como convertido
        UPDATE cad_08_leads SET
            status_lead = 'CONVERTIDO',
            data_conversao = CURRENT_DATE,
            id_cliente_convertido = NEW.id_cliente,
            id_venda_conversao = NEW.id_venda,
            updated_at = NOW()
        WHERE id_lead = lead_id;
        
        -- Atualiza cliente com dados do lead
        SELECT * INTO cliente_record FROM cad_03_clientes WHERE id_cliente = NEW.id_cliente;
        
        UPDATE cad_03_clientes SET
            id_lead_origem = lead_id,
            origem_cliente = (SELECT origem_lead FROM cad_08_leads WHERE id_lead = lead_id),
            vendedor_responsavel = COALESCE(
                vendedor_responsavel, 
                (SELECT vendedor_responsavel FROM cad_08_leads WHERE id_lead = lead_id)
            ),
            observacoes_comerciais = COALESCE(
                observacoes_comerciais,
                (SELECT observacoes_comerciais FROM cad_08_leads WHERE id_lead = lead_id)
            ),
            updated_at = NOW()
        WHERE id_cliente = NEW.id_cliente;
        
        -- Log da conversão
        INSERT INTO cad_09_interacoes_leads (
            id_lead,
            tipo_interacao,
            assunto,
            descricao,
            resultado,
            usuario_responsavel
        ) VALUES (
            lead_id,
            'PROPOSTA',
            'CONVERSÃO AUTOMÁTICA',
            'Lead convertido automaticamente em cliente com venda ID: ' || NEW.id_venda,
            'CONVERTIDO',
            'SISTEMA'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trg_converter_lead_cliente
    AFTER INSERT ON vnd_05_vendas
    FOR EACH ROW
    EXECUTE FUNCTION fn_converter_lead_cliente();
```

### 2. **Atualização Automática de Estatísticas do Cliente**

```sql
-- Trigger para atualizar estatísticas do cliente após cada venda
CREATE OR REPLACE FUNCTION fn_atualizar_stats_cliente()
RETURNS TRIGGER AS $$
DECLARE
    stats RECORD;
BEGIN
    -- Calcula estatísticas atualizadas do cliente
    SELECT 
        COUNT(*) as total_vendas,
        SUM(valor_total) as valor_total,
        AVG(valor_total) as ticket_medio,
        MIN(data_venda) as primeira_compra,
        MAX(data_venda) as ultima_compra
    INTO stats
    FROM vnd_05_vendas 
    WHERE id_cliente = NEW.id_cliente;
    
    -- Atualiza cliente
    UPDATE cad_03_clientes SET
        quantidade_pedidos = stats.total_vendas,
        total_compras = COALESCE(stats.valor_total, 0),
        ticket_medio = COALESCE(stats.ticket_medio, 0),
        primeira_compra = stats.primeira_compra,
        ultima_compra = stats.ultima_compra,
        ultima_interacao = CURRENT_DATE,
        -- Classificação automática baseada no valor total
        classificacao_cliente = CASE 
            WHEN COALESCE(stats.valor_total, 0) >= 500000 THEN 'VIP'
            WHEN COALESCE(stats.valor_total, 0) >= 200000 THEN 'PLATINA'
            WHEN COALESCE(stats.valor_total, 0) >= 100000 THEN 'OURO'
            WHEN COALESCE(stats.valor_total, 0) >= 50000 THEN 'PRATA'
            WHEN COALESCE(stats.valor_total, 0) >= 10000 THEN 'BRONZE'
            ELSE 'NOVO'
        END,
        updated_at = NOW()
    WHERE id_cliente = NEW.id_cliente;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trg_atualizar_stats_cliente
    AFTER INSERT OR UPDATE ON vnd_05_vendas
    FOR EACH ROW
    EXECUTE FUNCTION fn_atualizar_stats_cliente();
```

### 3. **Atualização Automática de Leads por Interação**

```sql
-- Trigger para atualizar lead após cada interação
CREATE OR REPLACE FUNCTION fn_atualizar_lead_pos_interacao()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE cad_08_leads SET
        data_ultimo_contato = NEW.data_interacao::date,
        quantidade_interacoes = quantidade_interacoes + 1,
        -- Atualiza próxima ação se foi definida
        proxima_acao = CASE 
            WHEN NEW.data_follow_up IS NOT NULL 
            THEN NEW.observacoes_follow_up 
            ELSE proxima_acao 
        END,
        data_proxima_acao = COALESCE(NEW.data_follow_up, data_proxima_acao),
        updated_at = NOW()
    WHERE id_lead = NEW.id_lead;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trg_atualizar_lead_pos_interacao
    AFTER INSERT ON cad_09_interacoes_leads
    FOR EACH ROW
    EXECUTE FUNCTION fn_atualizar_lead_pos_interacao();
```

---

## 📊 Views e Relatórios CRM

### 1. **Dashboard de Leads**

```sql
CREATE VIEW vw_dashboard_leads AS
SELECT 
    l.id_lead,
    l.nome,
    l.empresa,
    l.origem_lead,
    l.status_lead,
    l.valor_estimado_negocio,
    l.probabilidade_fechamento,
    l.data_primeiro_contato,
    l.data_ultimo_contato,
    l.quantidade_interacoes,
    l.vendedor_responsavel,
    l.data_proxima_acao,
    l.proxima_acao,
    
    -- Idade do lead
    CURRENT_DATE - l.data_primeiro_contato as dias_no_pipeline,
    
    -- Última interação
    (SELECT tipo_interacao 
     FROM cad_09_interacoes_leads i 
     WHERE i.id_lead = l.id_lead 
     ORDER BY data_interacao DESC LIMIT 1) as ultima_interacao,
     
    -- Status de follow-up
    CASE 
        WHEN l.data_proxima_acao < CURRENT_DATE THEN 'ATRASADO'
        WHEN l.data_proxima_acao = CURRENT_DATE THEN 'HOJE'
        WHEN l.data_proxima_acao BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 7 THEN 'ESTA_SEMANA'
        ELSE 'FUTURO'
    END as status_follow_up,
    
    -- Valor ponderado (valor × probabilidade)
    l.valor_estimado_negocio * (l.probabilidade_fechamento / 100.0) as valor_ponderado

FROM cad_08_leads l
WHERE l.ativo = TRUE
  AND l.status_lead NOT IN ('CONVERTIDO', 'PERDIDO', 'INATIVO')
ORDER BY l.data_proxima_acao ASC NULLS LAST, l.valor_estimado_negocio DESC;
```

### 2. **Análise de Conversão de Leads**

```sql
CREATE VIEW vw_analise_conversao_leads AS
SELECT 
    origem_lead,
    vendedor_responsavel,
    DATE_TRUNC('month', data_primeiro_contato) as mes_entrada,
    
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE status_lead = 'CONVERTIDO') as leads_convertidos,
    COUNT(*) FILTER (WHERE status_lead = 'PERDIDO') as leads_perdidos,
    COUNT(*) FILTER (WHERE status_lead IN ('QUALIFICADO', 'EM_NEGOCIACAO', 'PROPOSTA_ENVIADA')) as leads_ativos,
    
    -- Taxa de conversão
    ROUND(
        COUNT(*) FILTER (WHERE status_lead = 'CONVERTIDO') * 100.0 / 
        NULLIF(COUNT(*), 0), 2
    ) as taxa_conversao_percent,
    
    -- Valor médio dos negócios
    AVG(valor_estimado_negocio) as valor_medio_estimado,
    SUM(valor_estimado_negocio) FILTER (WHERE status_lead = 'CONVERTIDO') as valor_convertido,
    
    -- Tempo médio até conversão
    AVG(data_conversao - data_primeiro_contato) FILTER (WHERE status_lead = 'CONVERTIDO') as tempo_medio_conversao

FROM cad_08_leads
WHERE data_primeiro_contato >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY origem_lead, vendedor_responsavel, DATE_TRUNC('month', data_primeiro_contato)
ORDER BY mes_entrada DESC, taxa_conversao_percent DESC;
```

### 3. **Relatório Completo de Clientes**

```sql
CREATE VIEW vw_relatorio_clientes_completo AS
SELECT 
    c.id_cliente,
    c.cnpj_cpf,
    c.nome_razao_social,
    c.email,
    c.telefone,
    c.classificacao_cliente,
    c.segmento_negocio,
    c.vendedor_responsavel,
    
    -- Estatísticas de compras
    c.quantidade_pedidos,
    c.total_compras,
    c.ticket_medio,
    c.primeira_compra,
    c.ultima_compra,
    
    -- Análise temporal
    CURRENT_DATE - c.ultima_compra as dias_sem_comprar,
    CASE 
        WHEN c.ultima_compra >= CURRENT_DATE - INTERVAL '30 days' THEN 'ATIVO'
        WHEN c.ultima_compra >= CURRENT_DATE - INTERVAL '90 days' THEN 'MORNO'
        WHEN c.ultima_compra >= CURRENT_DATE - INTERVAL '180 days' THEN 'FRIO'
        ELSE 'INATIVO'
    END as status_atividade,
    
    -- Lead de origem
    l.origem_lead as origem_inicial,
    l.data_primeiro_contato as data_primeiro_contato_lead,
    
    -- Última venda
    (SELECT v.numero_pedido 
     FROM vnd_05_vendas v 
     WHERE v.id_cliente = c.id_cliente 
     ORDER BY v.data_venda DESC LIMIT 1) as ultimo_pedido,
     
    -- Última nota fiscal
    (SELECT nf.numero_nota_fiscal 
     FROM fis_09_notas_fiscais nf
     JOIN vnd_05_vendas v ON v.id_venda = nf.id_venda
     WHERE v.id_cliente = c.id_cliente 
     ORDER BY nf.data_emissao DESC LIMIT 1) as ultima_nota_fiscal,
     
    c.observacoes_comerciais,
    c.created_at as data_cadastro

FROM cad_03_clientes c
LEFT JOIN cad_08_leads l ON l.id_lead = c.id_lead_origem
WHERE c.ativo = TRUE
ORDER BY c.total_compras DESC;
```

### 4. **Pipeline de Vendas**

```sql
CREATE VIEW vw_pipeline_vendas AS
SELECT 
    status_lead,
    COUNT(*) as quantidade_leads,
    SUM(valor_estimado_negocio) as valor_total_pipeline,
    SUM(valor_estimado_negocio * probabilidade_fechamento / 100.0) as valor_ponderado,
    AVG(probabilidade_fechamento) as probabilidade_media,
    
    -- Por vendedor
    vendedor_responsavel,
    
    -- Análise temporal
    COUNT(*) FILTER (WHERE data_primeiro_contato >= CURRENT_DATE - INTERVAL '30 days') as novos_ultimos_30_dias,
    
    -- Próximas ações
    COUNT(*) FILTER (WHERE data_proxima_acao = CURRENT_DATE) as acoes_hoje,
    COUNT(*) FILTER (WHERE data_proxima_acao BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 7) as acoes_proxima_semana

FROM cad_08_leads
WHERE ativo = TRUE 
  AND status_lead NOT IN ('CONVERTIDO', 'PERDIDO', 'INATIVO')
GROUP BY status_lead, vendedor_responsavel
ORDER BY 
    CASE status_lead
        WHEN 'PROPOSTA_ENVIADA' THEN 1
        WHEN 'EM_NEGOCIACAO' THEN 2
        WHEN 'QUALIFICADO' THEN 3
        WHEN 'NOVO' THEN 4
    END,
    valor_ponderado DESC;
```

---

## 🤖 Funcionalidades Automáticas

### 1. **Função de Qualificação Automática de Leads**

```sql
-- Função para qualificar leads automaticamente baseado em critérios
CREATE OR REPLACE FUNCTION fn_qualificar_lead_automatico(p_lead_id INTEGER)
RETURNS TEXT AS $$
DECLARE
    lead_record RECORD;
    pontuacao INTEGER := 0;
    novo_status VARCHAR(20);
    resultado TEXT;
BEGIN
    -- Busca dados do lead
    SELECT * INTO lead_record FROM cad_08_leads WHERE id_lead = p_lead_id;
    
    IF NOT FOUND THEN
        RETURN 'Lead não encontrado';
    END IF;
    
    -- Sistema de pontuação para qualificação
    
    -- Origem (peso: até 30 pontos)
    pontuacao := pontuacao + CASE lead_record.origem_lead
        WHEN 'INDICACAO' THEN 30
        WHEN 'SITE' THEN 25
        WHEN 'FEIRA' THEN 20
        WHEN 'WHATSAPP' THEN 15
        WHEN 'GOOGLE_ADS' THEN 10
        ELSE 5
    END;
    
    -- Empresa definida (peso: 20 pontos)
    IF lead_record.empresa IS NOT NULL AND lead_record.empresa != '' THEN
        pontuacao := pontuacao + 20;
    END IF;
    
    -- Valor estimado (peso: até 25 pontos)
    pontuacao := pontuacao + CASE 
        WHEN lead_record.valor_estimado_negocio >= 100000 THEN 25
        WHEN lead_record.valor_estimado_negocio >= 50000 THEN 20
        WHEN lead_record.valor_estimado_negocio >= 20000 THEN 15
        WHEN lead_record.valor_estimado_negocio >= 10000 THEN 10
        WHEN lead_record.valor_estimado_negocio > 0 THEN 5
        ELSE 0
    END;
    
    -- Produto de interesse específico (peso: 15 pontos)
    IF lead_record.produto_interesse IS NOT NULL AND lead_record.produto_interesse != '' THEN
        pontuacao := pontuacao + 15;
    END IF;
    
    -- Aplicação definida (peso: 10 pontos)
    IF lead_record.aplicacao_pretendida IS NOT NULL AND lead_record.aplicacao_pretendida != '' THEN
        pontuacao := pontuacao + 10;
    END IF;
    
    -- Define novo status baseado na pontuação
    novo_status := CASE 
        WHEN pontuacao >= 70 THEN 'QUALIFICADO'
        WHEN pontuacao >= 40 THEN 'EM_NEGOCIACAO'
        ELSE 'NOVO'
    END;
    
    -- Atualiza probabilidade baseada na pontuação
    UPDATE cad_08_leads SET
        status_lead = novo_status,
        probabilidade_fechamento = GREATEST(probabilidade_fechamento, pontuacao),
        observacoes = COALESCE(observacoes, '') || 
            E'\n[' || CURRENT_DATE || '] Qualificação automática: ' || pontuacao || ' pontos',
        updated_at = NOW()
    WHERE id_lead = p_lead_id;
    
    -- Cria interação automática
    INSERT INTO cad_09_interacoes_leads (
        id_lead,
        tipo_interacao,
        assunto,
        descricao,
        resultado,
        usuario_responsavel
    ) VALUES (
        p_lead_id,
        'FOLLOW_UP',
        'Qualificação Automática',
        'Lead qualificado automaticamente com ' || pontuacao || ' pontos. Status: ' || novo_status,
        'QUALIFICADO',
        'SISTEMA'
    );
    
    resultado := 'Lead qualificado: ' || pontuacao || ' pontos, Status: ' || novo_status;
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;
```

### 2. **Alerta de Follow-up**

```sql
-- View para alertas de follow-up pendentes
CREATE VIEW vw_alertas_follow_up AS
SELECT 
    l.id_lead,
    l.nome,
    l.empresa,
    l.telefone,
    l.vendedor_responsavel,
    l.data_proxima_acao,
    l.proxima_acao,
    l.valor_estimado_negocio,
    
    CASE 
        WHEN l.data_proxima_acao < CURRENT_DATE THEN 'ATRASADO'
        WHEN l.data_proxima_acao = CURRENT_DATE THEN 'HOJE'
        WHEN l.data_proxima_acao = CURRENT_DATE + 1 THEN 'AMANHA'
    END as urgencia,
    
    CURRENT_DATE - l.data_proxima_acao as dias_atraso

FROM cad_08_leads l
WHERE l.ativo = TRUE
  AND l.status_lead IN ('QUALIFICADO', 'EM_NEGOCIACAO', 'PROPOSTA_ENVIADA')
  AND l.data_proxima_acao <= CURRENT_DATE + 1
ORDER BY l.data_proxima_acao ASC, l.valor_estimado_negocio DESC;
```

---

## 📈 KPIs e Métricas CRM

### **Dashboard Executivo**

```sql
-- Métricas principais do CRM
CREATE VIEW vw_kpis_crm AS
SELECT 
    -- Leads
    (SELECT COUNT(*) FROM cad_08_leads WHERE ativo = TRUE) as total_leads_ativo,
    (SELECT COUNT(*) FROM cad_08_leads WHERE status_lead = 'CONVERTIDO' 
     AND data_conversao >= CURRENT_DATE - INTERVAL '30 days') as conversoes_mes,
    (SELECT ROUND(AVG(probabilidade_fechamento), 2) FROM cad_08_leads 
     WHERE status_lead IN ('QUALIFICADO', 'EM_NEGOCIACAO', 'PROPOSTA_ENVIADA')) as probabilidade_media_pipeline,
    
    -- Pipeline
    (SELECT SUM(valor_estimado_negocio) FROM cad_08_leads 
     WHERE status_lead IN ('QUALIFICADO', 'EM_NEGOCIACAO', 'PROPOSTA_ENVIADA')) as valor_total_pipeline,
    (SELECT SUM(valor_estimado_negocio * probabilidade_fechamento / 100.0) FROM cad_08_leads 
     WHERE status_lead IN ('QUALIFICADO', 'EM_NEGOCIACAO', 'PROPOSTA_ENVIADA')) as valor_ponderado_pipeline,
    
    -- Clientes
    (SELECT COUNT(*) FROM cad_03_clientes WHERE ativo = TRUE) as total_clientes,
    (SELECT COUNT(*) FROM cad_03_clientes WHERE ultima_compra >= CURRENT_DATE - INTERVAL '90 days') as clientes_ativos_90d,
    (SELECT AVG(ticket_medio) FROM cad_03_clientes WHERE ticket_medio > 0) as ticket_medio_geral,
    
    -- Vendas
    (SELECT SUM(valor_total) FROM vnd_05_vendas 
     WHERE data_venda >= DATE_TRUNC('month', CURRENT_DATE)) as vendas_mes_atual,
    (SELECT SUM(valor_total) FROM vnd_05_vendas 
     WHERE data_venda >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
       AND data_venda < DATE_TRUNC('month', CURRENT_DATE)) as vendas_mes_anterior,
    
    -- Follow-ups
    (SELECT COUNT(*) FROM cad_08_leads WHERE data_proxima_acao = CURRENT_DATE) as follow_ups_hoje,
    (SELECT COUNT(*) FROM cad_08_leads WHERE data_proxima_acao < CURRENT_DATE 
     AND status_lead NOT IN ('CONVERTIDO', 'PERDIDO', 'INATIVO')) as follow_ups_atrasados;
```

---

## 🛠️ Configurações e Personalização

### **Tabela de Configurações CRM**

```sql
CREATE TABLE crm_configuracoes (
    id                      SERIAL PRIMARY KEY,
    chave                   VARCHAR(50) UNIQUE NOT NULL,
    valor                   TEXT,
    descricao               VARCHAR(200),
    tipo_dado               VARCHAR(20) DEFAULT 'STRING', -- STRING, NUMBER, BOOLEAN, JSON
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- Configurações padrão
INSERT INTO crm_configuracoes (chave, valor, descricao, tipo_dado) VALUES
('lead_qualificacao_automatica', 'true', 'Ativar qualificação automática de leads', 'BOOLEAN'),
('lead_pontuacao_minima_qualificado', '70', 'Pontuação mínima para lead qualificado', 'NUMBER'),
('cliente_classificacao_automatica', 'true', 'Ativar classificação automática de clientes', 'BOOLEAN'),
('follow_up_dias_alerta', '1', 'Dias de antecedência para alerta de follow-up', 'NUMBER'),
('pipeline_valor_minimo', '5000', 'Valor mínimo para aparecer no pipeline principal', 'NUMBER'),
('vendedor_padrao', 'Vendas NXT', 'Vendedor padrão para novos leads', 'STRING');
```

---

*Sistema CRM Completo - NXT Indústria e Comércio Ltda*  
*Versão: 1.0*  
*Data: 2025-07-05*  
*Integração com ERP e Sistema de Importação*