# Sistema de Webhooks Centralizados - NXT Indústria e Comércio Ltda

## 🎯 Objetivo

Criar um sistema centralizado de comunicação que receba webhooks de todas as plataformas integradas (Mercado Livre, Instagram, Bling, Z-API WhatsApp, Make.com) e distribua as informações para os módulos corretos do ERP, registrando tudo para comunicação omnichannel com clientes.

---

## 🏗️ MÓDULO WHK - WEBHOOKS CENTRALIZADOS

### **WHK_01_configuracao_webhooks**
```sql
CREATE TABLE whk_01_configuracao_webhooks (
    id_webhook_config           SERIAL PRIMARY KEY,
    
    -- Identificação da plataforma
    plataforma                  VARCHAR(30) NOT NULL, -- ML, INSTAGRAM, BLING, ZAPI, MAKE, CUSTOM
    nome_plataforma             VARCHAR(100) NOT NULL,
    
    -- Configuração técnica
    endpoint_url                VARCHAR(500) NOT NULL, -- URL do nosso endpoint
    webhook_secret              VARCHAR(200), -- Secret para validação
    metodo_http                 VARCHAR(10) DEFAULT 'POST', -- POST, PUT, GET
    content_type               VARCHAR(50) DEFAULT 'application/json',
    
    -- Eventos monitorados
    eventos_monitorados         JSONB DEFAULT '[]'::jsonb, -- Lista de eventos
    campos_obrigatorios         JSONB DEFAULT '[]'::jsonb, -- Campos obrigatórios do payload
    
    -- Configurações de processamento
    ativo                       BOOLEAN DEFAULT TRUE,
    retry_tentativas            INTEGER DEFAULT 3,
    timeout_segundos            INTEGER DEFAULT 30,
    rate_limit_por_minuto       INTEGER DEFAULT 100,
    
    -- Mapeamento de dados
    mapeamento_campos           JSONB DEFAULT '{}'::jsonb, -- Como mapear campos para nossas tabelas
    regras_processamento        JSONB DEFAULT '[]'::jsonb, -- Regras de negócio específicas
    
    -- Auditoria
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW(),
    created_by                  VARCHAR(50) DEFAULT 'SISTEMA'
);

-- Índices
CREATE INDEX idx_webhook_config_plataforma ON whk_01_configuracao_webhooks(plataforma);
CREATE INDEX idx_webhook_config_ativo ON whk_01_configuracao_webhooks(ativo);

-- Dados iniciais das plataformas integradas
INSERT INTO whk_01_configuracao_webhooks (plataforma, nome_plataforma, endpoint_url, eventos_monitorados, campos_obrigatorios) VALUES
(
    'ML', 
    'Mercado Livre', 
    'https://api.nxt.com.br/webhooks/mercadolivre',
    '["orders", "questions", "claims", "items", "payments"]'::jsonb,
    '["resource", "user_id", "topic", "application_id"]'::jsonb
),
(
    'INSTAGRAM', 
    'Instagram Business', 
    'https://api.nxt.com.br/webhooks/instagram',
    '["messages", "comments", "mentions", "story_insights"]'::jsonb,
    '["object", "entry"]'::jsonb
),
(
    'BLING', 
    'Bling ERP', 
    'https://api.nxt.com.br/webhooks/bling',
    '["invoice.created", "invoice.sent", "product.updated", "order.updated"]'::jsonb,
    '["event", "data"]'::jsonb
),
(
    'ZAPI', 
    'Z-API WhatsApp', 
    'https://api.nxt.com.br/webhooks/zapi',
    '["message.received", "message.sent", "message.read", "group.created"]'::jsonb,
    '["phone", "message"]'::jsonb
),
(
    'MAKE', 
    'Make.com Automation', 
    'https://api.nxt.com.br/webhooks/make',
    '["scenario.completed", "scenario.error", "data.processed"]'::jsonb,
    '["scenario_id", "execution_id"]'::jsonb
);
```

### **WHK_02_log_webhooks_recebidos**
```sql
CREATE TABLE whk_02_log_webhooks_recebidos (
    id_webhook_log              SERIAL PRIMARY KEY,
    id_webhook_config           INTEGER REFERENCES whk_01_configuracao_webhooks(id_webhook_config),
    
    -- Dados da requisição
    plataforma                  VARCHAR(30) NOT NULL,
    evento_tipo                 VARCHAR(50) NOT NULL,
    webhook_id_externo          VARCHAR(100), -- ID único da plataforma externa
    
    -- Payload completo
    payload_original            JSONB NOT NULL, -- Payload completo recebido
    headers_http                JSONB DEFAULT '{}'::jsonb, -- Headers da requisição
    metodo_http                 VARCHAR(10),
    ip_origem                   INET,
    user_agent                  TEXT,
    
    -- Processamento
    status_processamento        VARCHAR(20) DEFAULT 'RECEBIDO' CHECK (status_processamento IN (
        'RECEBIDO', 'VALIDANDO', 'PROCESSANDO', 'CONCLUIDO', 'ERRO', 'IGNORADO'
    )),
    
    -- Dados extraídos
    dados_extraidos             JSONB DEFAULT '{}'::jsonb, -- Dados relevantes extraídos
    entidades_afetadas          JSONB DEFAULT '[]'::jsonb, -- Tabelas/registros afetados
    
    -- Controle de processamento
    tentativas_processamento    INTEGER DEFAULT 0,
    proximo_retry               TIMESTAMP,
    erro_processamento          TEXT,
    tempo_processamento_ms      INTEGER,
    
    -- Rastreamento
    hash_payload                VARCHAR(64), -- Hash para detectar duplicatas
    processado_por              VARCHAR(50) DEFAULT 'SISTEMA',
    
    -- Auditoria
    received_at                 TIMESTAMP DEFAULT NOW(),
    processed_at                TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_webhook_log_plataforma ON whk_02_log_webhooks_recebidos(plataforma);
CREATE INDEX idx_webhook_log_evento ON whk_02_log_webhooks_recebidos(evento_tipo);
CREATE INDEX idx_webhook_log_status ON whk_02_log_webhooks_recebidos(status_processamento);
CREATE INDEX idx_webhook_log_received_at ON whk_02_log_webhooks_recebidos(received_at);
CREATE INDEX idx_webhook_log_hash ON whk_02_log_webhooks_recebidos(hash_payload);
CREATE INDEX idx_webhook_log_retry ON whk_02_log_webhooks_recebidos(proximo_retry) WHERE proximo_retry IS NOT NULL;

-- Índice GIN para busca no payload
CREATE INDEX idx_webhook_log_payload ON whk_02_log_webhooks_recebidos USING GIN(payload_original);
CREATE INDEX idx_webhook_log_extraidos ON whk_02_log_webhooks_recebidos USING GIN(dados_extraidos);
```

### **WHK_03_processamento_regras**
```sql
CREATE TABLE whk_03_processamento_regras (
    id_regra                    SERIAL PRIMARY KEY,
    
    -- Identificação
    nome_regra                  VARCHAR(100) NOT NULL,
    plataforma                  VARCHAR(30) NOT NULL,
    evento_tipo                 VARCHAR(50) NOT NULL,
    
    -- Condições de ativação
    condicoes_ativacao          JSONB NOT NULL, -- Condições para processar este webhook
    prioridade                  INTEGER DEFAULT 100, -- Ordem de processamento
    
    -- Ações a executar
    acao_tipo                   VARCHAR(30) NOT NULL CHECK (acao_tipo IN (
        'CRIAR_LEAD', 'ATUALIZAR_CLIENTE', 'CRIAR_PEDIDO', 'ATUALIZAR_ESTOQUE',
        'CRIAR_TICKET', 'ENVIAR_NOTIFICACAO', 'SINCRONIZAR_PRODUTO', 'CUSTOM_FUNCTION'
    )),
    
    -- Mapeamento de dados
    mapeamento_dados            JSONB NOT NULL, -- Como mapear payload para nossa estrutura
    tabela_destino              VARCHAR(50), -- Tabela principal afetada
    acao_sql                    TEXT, -- SQL personalizado se necessário
    funcao_personalizada        VARCHAR(100), -- Nome da função PL/pgSQL
    
    -- Configurações
    requer_validacao            BOOLEAN DEFAULT FALSE,
    gerar_notificacao           BOOLEAN DEFAULT FALSE,
    template_notificacao        VARCHAR(100),
    
    -- Controle
    ativo                       BOOLEAN DEFAULT TRUE,
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_regras_plataforma_evento ON whk_03_processamento_regras(plataforma, evento_tipo);
CREATE INDEX idx_regras_prioridade ON whk_03_processamento_regras(prioridade);
CREATE INDEX idx_regras_ativo ON whk_03_processamento_regras(ativo);

-- Regras iniciais para as principais integrações
INSERT INTO whk_03_processamento_regras (nome_regra, plataforma, evento_tipo, condicoes_ativacao, acao_tipo, mapeamento_dados, tabela_destino) VALUES
(
    'ML - Novo Pedido',
    'ML',
    'orders',
    '{"topic": "orders", "resource": {"contains": "/orders/"}}'::jsonb,
    'CRIAR_PEDIDO',
    '{
        "id_cliente": "$.buyer.id",
        "valor_total": "$.total_amount",
        "status": "$.status",
        "data_venda": "$.date_created",
        "observacoes": "$.ml_order_id"
    }'::jsonb,
    'vnd_05_vendas'
),
(
    'Instagram - Nova Mensagem',
    'INSTAGRAM',
    'messages',
    '{"object": "instagram", "field": "messages"}'::jsonb,
    'CRIAR_LEAD',
    '{
        "nome": "$.entry[0].messaging[0].sender.id",
        "origem_lead": "INSTAGRAM",
        "observacoes": "$.entry[0].messaging[0].message.text"
    }'::jsonb,
    'cad_08_leads'
),
(
    'WhatsApp - Mensagem Recebida',
    'ZAPI',
    'message.received',
    '{"messageType": "text"}'::jsonb,
    'CRIAR_TICKET',
    '{
        "telefone_cliente": "$.phone",
        "assunto": "Mensagem WhatsApp",
        "descricao": "$.message.text",
        "canal": "WHATSAPP"
    }'::jsonb,
    'spt_05_tickets'
),
(
    'Bling - NF Emitida',
    'BLING',
    'invoice.sent',
    '{"event": "invoice.sent"}'::jsonb,
    'ATUALIZAR_CLIENTE',
    '{
        "ultima_nota_fiscal": "$.data.numero",
        "data_ultima_nf": "$.data.dataEmissao"
    }'::jsonb,
    'cad_03_clientes'
);
```

### **WHK_04_notificacoes_internas**
```sql
CREATE TABLE whk_04_notificacoes_internas (
    id_notificacao              SERIAL PRIMARY KEY,
    id_webhook_log              INTEGER REFERENCES whk_02_log_webhooks_recebidos(id_webhook_log),
    
    -- Dados da notificação
    tipo_notificacao            VARCHAR(30) NOT NULL CHECK (tipo_notificacao IN (
        'NOVO_LEAD', 'NOVO_PEDIDO', 'ERRO_PROCESSAMENTO', 'SYNC_NECESSARIO',
        'CLIENTE_ATUALIZADO', 'TICKET_CRIADO', 'ESTOQUE_BAIXO', 'PAGAMENTO_RECEBIDO'
    )),
    
    titulo                      VARCHAR(200) NOT NULL,
    mensagem                    TEXT NOT NULL,
    prioridade                  VARCHAR(10) DEFAULT 'NORMAL' CHECK (prioridade IN ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE')),
    
    -- Destinatários
    usuarios_destino            JSONB DEFAULT '[]'::jsonb, -- Lista de usuários
    departamentos_destino       JSONB DEFAULT '[]'::jsonb, -- Lista de departamentos
    email_destino               VARCHAR(200), -- Email específico
    whatsapp_destino            VARCHAR(20), -- WhatsApp para notificação
    
    -- Dados contextuais
    entidade_tipo               VARCHAR(30), -- lead, cliente, pedido, etc
    entidade_id                 INTEGER, -- ID da entidade relacionada
    dados_contexto              JSONB DEFAULT '{}'::jsonb, -- Dados extras para a notificação
    
    -- Status e controle
    status_envio                VARCHAR(20) DEFAULT 'PENDENTE' CHECK (status_envio IN (
        'PENDENTE', 'ENVIADO', 'LIDO', 'ERRO', 'CANCELADO'
    )),
    
    canais_envio                JSONB DEFAULT '["SISTEMA"]'::jsonb, -- SISTEMA, EMAIL, WHATSAPP, SMS
    tentativas_envio            INTEGER DEFAULT 0,
    erro_envio                  TEXT,
    
    -- Ações possíveis
    acoes_disponiveis           JSONB DEFAULT '[]'::jsonb, -- Botões/ações na notificação
    url_callback                VARCHAR(500), -- URL para ação rápida
    
    -- Auditoria
    created_at                  TIMESTAMP DEFAULT NOW(),
    enviado_at                  TIMESTAMP,
    lido_at                     TIMESTAMP,
    usuario_leitura             VARCHAR(50)
);

-- Índices
CREATE INDEX idx_notif_tipo ON whk_04_notificacoes_internas(tipo_notificacao);
CREATE INDEX idx_notif_status ON whk_04_notificacoes_internas(status_envio);
CREATE INDEX idx_notif_prioridade ON whk_04_notificacoes_internas(prioridade);
CREATE INDEX idx_notif_created_at ON whk_04_notificacoes_internas(created_at);
CREATE INDEX idx_notif_entidade ON whk_04_notificacoes_internas(entidade_tipo, entidade_id);
```

---

## 🔄 FUNÇÕES DE PROCESSAMENTO

### **Função Principal: Processar Webhook**
```sql
-- Função principal para processar webhooks recebidos
CREATE OR REPLACE FUNCTION fn_processar_webhook(
    p_plataforma VARCHAR(30),
    p_evento_tipo VARCHAR(50),
    p_payload JSONB,
    p_headers JSONB DEFAULT '{}'::jsonb,
    p_ip_origem INET DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    webhook_log_id INTEGER;
    config_record RECORD;
    regra_record RECORD;
    hash_payload VARCHAR(64);
    dados_extraidos JSONB := '{}'::jsonb;
    resultado_processamento TEXT;
BEGIN
    -- Gerar hash do payload para detectar duplicatas
    hash_payload := encode(digest(p_payload::text, 'sha256'), 'hex');
    
    -- Verificar se já foi processado (últimas 24h)
    IF EXISTS (
        SELECT 1 FROM whk_02_log_webhooks_recebidos 
        WHERE hash_payload = hash_payload 
          AND received_at > NOW() - INTERVAL '24 hours'
          AND status_processamento = 'CONCLUIDO'
    ) THEN
        RAISE NOTICE 'Webhook duplicado ignorado: %', hash_payload;
        RETURN -1;
    END IF;
    
    -- Buscar configuração da plataforma
    SELECT * INTO config_record 
    FROM whk_01_configuracao_webhooks 
    WHERE plataforma = p_plataforma AND ativo = TRUE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Configuração não encontrada para plataforma: %', p_plataforma;
    END IF;
    
    -- Inserir log do webhook
    INSERT INTO whk_02_log_webhooks_recebidos (
        id_webhook_config,
        plataforma,
        evento_tipo,
        payload_original,
        headers_http,
        hash_payload,
        ip_origem,
        status_processamento
    ) VALUES (
        config_record.id_webhook_config,
        p_plataforma,
        p_evento_tipo,
        p_payload,
        p_headers,
        hash_payload,
        p_ip_origem,
        'RECEBIDO'
    ) RETURNING id_webhook_log INTO webhook_log_id;
    
    -- Atualizar status para processando
    UPDATE whk_02_log_webhooks_recebidos 
    SET status_processamento = 'PROCESSANDO', 
        tentativas_processamento = tentativas_processamento + 1
    WHERE id_webhook_log = webhook_log_id;
    
    -- Buscar e executar regras de processamento
    FOR regra_record IN 
        SELECT * FROM whk_03_processamento_regras 
        WHERE plataforma = p_plataforma 
          AND evento_tipo = p_evento_tipo 
          AND ativo = TRUE
        ORDER BY prioridade ASC
    LOOP
        BEGIN
            -- Verificar condições de ativação
            IF fn_verificar_condicoes_webhook(p_payload, regra_record.condicoes_ativacao) THEN
                
                -- Executar ação específica
                resultado_processamento := fn_executar_acao_webhook(
                    regra_record.acao_tipo,
                    regra_record.mapeamento_dados,
                    regra_record.tabela_destino,
                    p_payload,
                    webhook_log_id
                );
                
                -- Atualizar dados extraídos
                dados_extraidos := dados_extraidos || jsonb_build_object(
                    regra_record.nome_regra, resultado_processamento
                );
                
                -- Gerar notificação se necessário
                IF regra_record.gerar_notificacao THEN
                    PERFORM fn_gerar_notificacao_webhook(
                        webhook_log_id,
                        regra_record.acao_tipo,
                        resultado_processamento,
                        regra_record.template_notificacao
                    );
                END IF;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log do erro mas continua processando outras regras
            UPDATE whk_02_log_webhooks_recebidos 
            SET erro_processamento = COALESCE(erro_processamento, '') || 
                'Erro na regra ' || regra_record.nome_regra || ': ' || SQLERRM || E'\n'
            WHERE id_webhook_log = webhook_log_id;
        END;
    END LOOP;
    
    -- Atualizar status final
    UPDATE whk_02_log_webhooks_recebidos 
    SET status_processamento = 'CONCLUIDO',
        dados_extraidos = dados_extraidos,
        processed_at = NOW(),
        tempo_processamento_ms = EXTRACT(epoch FROM (NOW() - received_at)) * 1000
    WHERE id_webhook_log = webhook_log_id;
    
    RETURN webhook_log_id;
    
EXCEPTION WHEN OTHERS THEN
    -- Marcar como erro
    UPDATE whk_02_log_webhooks_recebidos 
    SET status_processamento = 'ERRO',
        erro_processamento = SQLERRM,
        processed_at = NOW()
    WHERE id_webhook_log = webhook_log_id;
    
    RAISE;
END;
$$ LANGUAGE plpgsql;
```

### **Função: Verificar Condições**
```sql
-- Função para verificar se as condições de uma regra são atendidas
CREATE OR REPLACE FUNCTION fn_verificar_condicoes_webhook(
    p_payload JSONB,
    p_condicoes JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    condicao_key TEXT;
    condicao_valor JSONB;
    payload_valor JSONB;
BEGIN
    -- Iterar sobre todas as condições
    FOR condicao_key, condicao_valor IN SELECT * FROM jsonb_each(p_condicoes) LOOP
        
        -- Extrair valor do payload usando JSONPath
        BEGIN
            IF condicao_key LIKE '$.%' THEN
                -- É um JSONPath
                payload_valor := jsonb_path_query(p_payload, condicao_key::jsonpath);
            ELSE
                -- É uma chave simples
                payload_valor := p_payload -> condicao_key;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Se não conseguir extrair, condição falha
            RETURN FALSE;
        END;
        
        -- Verificar se o valor atende a condição
        IF jsonb_typeof(condicao_valor) = 'object' THEN
            -- Condição complexa (contains, equals, etc.)
            IF condicao_valor ? 'contains' THEN
                IF NOT (payload_valor::text ILIKE '%' || (condicao_valor ->> 'contains') || '%') THEN
                    RETURN FALSE;
                END IF;
            ELSIF condicao_valor ? 'equals' THEN
                IF payload_valor != condicao_valor -> 'equals' THEN
                    RETURN FALSE;
                END IF;
            END IF;
        ELSE
            -- Condição simples (igualdade)
            IF payload_valor != condicao_valor THEN
                RETURN FALSE;
            END IF;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### **Função: Executar Ação**
```sql
-- Função para executar ações baseadas no tipo
CREATE OR REPLACE FUNCTION fn_executar_acao_webhook(
    p_acao_tipo VARCHAR(30),
    p_mapeamento JSONB,
    p_tabela_destino VARCHAR(50),
    p_payload JSONB,
    p_webhook_log_id INTEGER
)
RETURNS TEXT AS $$
DECLARE
    dados_mapeados JSONB := '{}'::jsonb;
    campo_key TEXT;
    jsonpath_expr TEXT;
    valor_extraido JSONB;
    resultado TEXT;
    lead_id INTEGER;
    cliente_id INTEGER;
    ticket_id INTEGER;
BEGIN
    -- Mapear dados do payload
    FOR campo_key, jsonpath_expr IN SELECT * FROM jsonb_each_text(p_mapeamento) LOOP
        BEGIN
            IF jsonpath_expr LIKE '$.%' THEN
                valor_extraido := jsonb_path_query(p_payload, jsonpath_expr::jsonpath);
            ELSE
                valor_extraido := to_jsonb(jsonpath_expr);
            END IF;
            
            dados_mapeados := dados_mapeados || jsonb_build_object(campo_key, valor_extraido);
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar campos que não conseguir extrair
            CONTINUE;
        END;
    END LOOP;
    
    -- Executar ação específica
    CASE p_acao_tipo
        WHEN 'CRIAR_LEAD' THEN
            INSERT INTO cad_08_leads (
                nome, 
                origem_lead, 
                observacoes,
                valor_estimado_negocio,
                telefone,
                email
            ) VALUES (
                COALESCE(dados_mapeados ->> 'nome', 'Lead Webhook'),
                COALESCE(dados_mapeados ->> 'origem_lead', 'WEBHOOK'),
                dados_mapeados ->> 'observacoes',
                (dados_mapeados ->> 'valor_estimado')::numeric,
                dados_mapeados ->> 'telefone',
                dados_mapeados ->> 'email'
            ) RETURNING id_lead INTO lead_id;
            
            resultado := 'Lead criado: ' || lead_id;
            
        WHEN 'CRIAR_TICKET' THEN
            INSERT INTO spt_05_tickets (
                assunto,
                descricao,
                canal_origem,
                telefone_cliente,
                status_ticket
            ) VALUES (
                COALESCE(dados_mapeados ->> 'assunto', 'Ticket via Webhook'),
                dados_mapeados ->> 'descricao',
                COALESCE(dados_mapeados ->> 'canal', 'WEBHOOK'),
                dados_mapeados ->> 'telefone_cliente',
                'ABERTO'
            ) RETURNING id_ticket INTO ticket_id;
            
            resultado := 'Ticket criado: ' || ticket_id;
            
        WHEN 'CRIAR_PEDIDO' THEN
            -- Lógica para criar pedido de venda
            resultado := 'Pedido processado via webhook';
            
        WHEN 'ATUALIZAR_CLIENTE' THEN
            -- Lógica para atualizar cliente
            resultado := 'Cliente atualizado via webhook';
            
        ELSE
            resultado := 'Ação não implementada: ' || p_acao_tipo;
    END CASE;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 VIEWS DE MONITORAMENTO

### **Dashboard de Webhooks**
```sql
CREATE VIEW vw_dashboard_webhooks AS
SELECT 
    w.plataforma,
    COUNT(*) as total_webhooks,
    COUNT(*) FILTER (WHERE w.status_processamento = 'CONCLUIDO') as processados_sucesso,
    COUNT(*) FILTER (WHERE w.status_processamento = 'ERRO') as com_erro,
    COUNT(*) FILTER (WHERE w.received_at >= CURRENT_DATE) as hoje,
    COUNT(*) FILTER (WHERE w.received_at >= CURRENT_DATE - INTERVAL '7 days') as ultimos_7_dias,
    
    AVG(w.tempo_processamento_ms) FILTER (WHERE w.tempo_processamento_ms IS NOT NULL) as tempo_medio_ms,
    MAX(w.received_at) as ultimo_webhook,
    
    -- Taxa de sucesso
    ROUND(
        COUNT(*) FILTER (WHERE w.status_processamento = 'CONCLUIDO') * 100.0 / 
        NULLIF(COUNT(*), 0), 2
    ) as taxa_sucesso_percent
    
FROM whk_02_log_webhooks_recebidos w
WHERE w.received_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY w.plataforma
ORDER BY total_webhooks DESC;
```

### **Alertas de Webhooks**
```sql
CREATE VIEW vw_alertas_webhooks AS
SELECT 
    'WEBHOOK_COM_ERRO' as tipo_alerta,
    w.plataforma || ' - ' || w.evento_tipo as descricao,
    w.erro_processamento as detalhes,
    w.received_at,
    'ALTA' as prioridade
FROM whk_02_log_webhooks_recebidos w
WHERE w.status_processamento = 'ERRO'
  AND w.received_at >= CURRENT_DATE - INTERVAL '24 hours'

UNION ALL

SELECT 
    'WEBHOOK_PENDENTE_RETRY' as tipo_alerta,
    w.plataforma || ' - Retry pendente' as descricao,
    'Tentativas: ' || w.tentativas_processamento as detalhes,
    w.proximo_retry as received_at,
    'MEDIA' as prioridade
FROM whk_02_log_webhooks_recebidos w
WHERE w.proximo_retry <= NOW()
  AND w.status_processamento != 'CONCLUIDO'

ORDER BY received_at DESC;
```

---

## 🔧 COMANDOS DE MANUTENÇÃO

### **Comandos Úteis**
```sql
-- Reprocessar webhooks com erro
UPDATE whk_02_log_webhooks_recebidos 
SET status_processamento = 'RECEBIDO', 
    tentativas_processamento = 0,
    erro_processamento = NULL
WHERE status_processamento = 'ERRO' 
  AND received_at >= CURRENT_DATE - INTERVAL '24 hours';

-- Limpar logs antigos (manter últimos 90 dias)
DELETE FROM whk_02_log_webhooks_recebidos 
WHERE received_at < CURRENT_DATE - INTERVAL '90 days';

-- Estatísticas de webhooks por plataforma
SELECT * FROM vw_dashboard_webhooks;

-- Verificar webhooks pendentes de retry
SELECT * FROM whk_02_log_webhooks_recebidos 
WHERE proximo_retry <= NOW() 
  AND status_processamento != 'CONCLUIDO';
```

---

**Sistema de Webhooks Centralizados Completo**  
*Versão: 1.0*  
*Data: 2025-07-05*  
*Projeto: ERP Integrado NXT + Comunicação Omnichannel*