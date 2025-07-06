# Sistema de Ticketing para Suporte - NXT Indústria e Comércio Ltda

## 🎯 Objetivo

Implementar um sistema completo de tickets de suporte que integre com todos os canais de comunicação (WhatsApp, Instagram, ML, E-mail, Telefone) e forneça atendimento omnichannel unificado para clientes da NXT.

---

## 🏗️ MÓDULO SPT - SUPORTE E TICKETING

### **SPT_01_configuracao_suporte**
```sql
CREATE TABLE spt_01_configuracao_suporte (
    id_config                   SERIAL PRIMARY KEY,
    
    -- Configurações gerais
    nome_empresa                VARCHAR(100) DEFAULT 'NXT Indústria e Comércio Ltda',
    email_suporte_principal     VARCHAR(100) DEFAULT 'suporte@nxt.com.br',
    telefone_suporte            VARCHAR(20) DEFAULT '(11) 3000-0000',
    whatsapp_suporte            VARCHAR(20) DEFAULT '(11) 99999-9999',
    
    -- SLA (Service Level Agreement)
    sla_resposta_minutos        INTEGER DEFAULT 60, -- 1 hora
    sla_resolucao_horas         INTEGER DEFAULT 24, -- 24 horas
    sla_critico_minutos         INTEGER DEFAULT 15, -- 15 minutos
    
    -- Horário de atendimento
    horario_inicio              TIME DEFAULT '08:00',
    horario_fim                 TIME DEFAULT '18:00',
    dias_atendimento            JSONB DEFAULT '["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]'::jsonb,
    fuso_horario                VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    
    -- Auto-resposta
    auto_resposta_ativa         BOOLEAN DEFAULT TRUE,
    mensagem_auto_resposta      TEXT DEFAULT 'Recebemos sua mensagem e retornaremos em breve. Nosso horário de atendimento é de segunda a sexta, das 8h às 18h.',
    
    -- Escalação automática
    escalacao_automatica        BOOLEAN DEFAULT TRUE,
    tempo_escalacao_horas       INTEGER DEFAULT 4,
    
    -- Integrações
    webhook_ml_ativo            BOOLEAN DEFAULT TRUE,
    webhook_instagram_ativo     BOOLEAN DEFAULT TRUE,
    webhook_whatsapp_ativo      BOOLEAN DEFAULT TRUE,
    integrar_com_crm            BOOLEAN DEFAULT TRUE,
    
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW()
);

-- Inserir configuração padrão
INSERT INTO spt_01_configuracao_suporte (id_config) VALUES (1);
```

### **SPT_02_categorias_tickets**
```sql
CREATE TABLE spt_02_categorias_tickets (
    id_categoria                SERIAL PRIMARY KEY,
    
    nome_categoria              VARCHAR(100) NOT NULL,
    descricao                   TEXT,
    cor_categoria               VARCHAR(7) DEFAULT '#007bff', -- Cor hexadecimal
    icone                       VARCHAR(50) DEFAULT 'ticket',
    
    -- SLA específico da categoria
    sla_resposta_personalizado  INTEGER, -- Se NULL, usa o padrão
    sla_resolucao_personalizado INTEGER,
    
    -- Atribuição automática
    equipe_responsavel          VARCHAR(50),
    agente_padrao              VARCHAR(100),
    
    -- Departamento
    departamento               VARCHAR(50) CHECK (departamento IN (
        'VENDAS', 'TECNICO', 'FINANCEIRO', 'COMERCIAL', 'LOGISTICA', 'GERAL'
    )),
    
    -- Prioridade padrão para esta categoria
    prioridade_padrao          VARCHAR(10) DEFAULT 'MEDIA' CHECK (prioridade_padrao IN (
        'BAIXA', 'MEDIA', 'ALTA', 'URGENTE', 'CRITICA'
    )),
    
    -- Status
    ativo                      BOOLEAN DEFAULT TRUE,
    ordem_exibicao            INTEGER DEFAULT 100,
    
    created_at                 TIMESTAMP DEFAULT NOW(),
    updated_at                 TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_categorias_departamento ON spt_02_categorias_tickets(departamento);
CREATE INDEX idx_categorias_ativo ON spt_02_categorias_tickets(ativo);

-- Categorias padrão para equipamentos de mobilidade elétrica
INSERT INTO spt_02_categorias_tickets (nome_categoria, descricao, departamento, prioridade_padrao, cor_categoria, ordem_exibicao) VALUES
('Dúvidas Técnicas', 'Questões sobre funcionamento, especificações e uso dos equipamentos', 'TECNICO', 'MEDIA', '#28a745', 1),
('Garantia e Assistência', 'Problemas com produtos em garantia, reparos e manutenção', 'TECNICO', 'ALTA', '#ffc107', 2),
('Vendas e Orçamentos', 'Solicitações de orçamento, dúvidas sobre produtos e vendas', 'VENDAS', 'MEDIA', '#007bff', 3),
('Entrega e Logística', 'Acompanhamento de pedidos, prazos de entrega, endereços', 'LOGISTICA', 'MEDIA', '#6f42c1', 4),
('Financeiro e Pagamentos', 'Questões sobre pagamentos, boletos, parcelamentos', 'FINANCEIRO', 'MEDIA', '#fd7e14', 5),
('Reclamações', 'Reclamações sobre produtos ou atendimento', 'COMERCIAL', 'ALTA', '#dc3545', 6),
('Sugestões', 'Sugestões de melhorias e novos produtos', 'GERAL', 'BAIXA', '#6c757d', 7);
```

### **SPT_03_agentes_suporte**
```sql
CREATE TABLE spt_03_agentes_suporte (
    id_agente                  SERIAL PRIMARY KEY,
    
    -- Dados pessoais
    nome_completo              VARCHAR(100) NOT NULL,
    email                      VARCHAR(100) UNIQUE NOT NULL,
    telefone                   VARCHAR(20),
    foto_perfil_url            VARCHAR(500),
    
    -- Acesso e permissões
    usuario_sistema            VARCHAR(50) UNIQUE NOT NULL,
    nivel_acesso               VARCHAR(20) DEFAULT 'AGENTE' CHECK (nivel_acesso IN (
        'AGENTE', 'SUPERVISOR', 'COORDENADOR', 'ADMIN'
    )),
    
    -- Departamentos e especialidades
    departamento_principal     VARCHAR(50) NOT NULL,
    departamentos_secundarios  JSONB DEFAULT '[]'::jsonb,
    especialidades             JSONB DEFAULT '[]'::jsonb, -- Produtos específicos que domina
    
    -- Configurações de trabalho
    horario_inicio             TIME DEFAULT '08:00',
    horario_fim                TIME DEFAULT '18:00',
    dias_trabalho              JSONB DEFAULT '["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]'::jsonb,
    
    -- Capacidade e carga de trabalho
    max_tickets_simultaneos    INTEGER DEFAULT 10,
    tickets_ativos_count       INTEGER DEFAULT 0,
    
    -- Métricas de performance
    tickets_resolvidos_total   INTEGER DEFAULT 0,
    tempo_medio_resolucao      NUMERIC(8,2), -- Em horas
    nota_avaliacao_media       NUMERIC(3,2), -- De 1 a 5
    total_avaliacoes           INTEGER DEFAULT 0,
    
    -- Status e disponibilidade
    status_agente              VARCHAR(20) DEFAULT 'DISPONIVEL' CHECK (status_agente IN (
        'DISPONIVEL', 'OCUPADO', 'AUSENTE', 'FERIAS', 'INATIVO'
    )),
    
    ultima_atividade           TIMESTAMP DEFAULT NOW(),
    recebe_notificacoes        BOOLEAN DEFAULT TRUE,
    
    -- Auditoria
    ativo                      BOOLEAN DEFAULT TRUE,
    created_at                 TIMESTAMP DEFAULT NOW(),
    updated_at                 TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_agentes_departamento ON spt_03_agentes_suporte(departamento_principal);
CREATE INDEX idx_agentes_status ON spt_03_agentes_suporte(status_agente);
CREATE INDEX idx_agentes_ativo ON spt_03_agentes_suporte(ativo);
CREATE INDEX idx_agentes_usuario ON spt_03_agentes_suporte(usuario_sistema);

-- Agentes padrão
INSERT INTO spt_03_agentes_suporte (nome_completo, email, usuario_sistema, departamento_principal, especialidades) VALUES
('Suporte Técnico NXT', 'tecnico@nxt.com.br', 'suporte.tecnico', 'TECNICO', '["Patinetes Elétricos", "Bicicletas Elétricas", "Scooters"]'::jsonb),
('Equipe Vendas NXT', 'vendas@nxt.com.br', 'equipe.vendas', 'VENDAS', '["Orçamentos", "Especificações", "Preços"]'::jsonb),
('Suporte Geral NXT', 'suporte@nxt.com.br', 'suporte.geral', 'GERAL', '["Atendimento Geral"]'::jsonb);
```

### **SPT_04_templates_resposta**
```sql
CREATE TABLE spt_04_templates_resposta (
    id_template                SERIAL PRIMARY KEY,
    
    -- Identificação
    nome_template              VARCHAR(100) NOT NULL,
    descricao                  TEXT,
    categoria_template         VARCHAR(50), -- FAQ, PRIMEIRA_RESPOSTA, RESOLUCAO, etc.
    
    -- Conteúdo
    assunto_template           VARCHAR(200),
    corpo_template             TEXT NOT NULL,
    tipo_conteudo              VARCHAR(20) DEFAULT 'TEXT' CHECK (tipo_conteudo IN (
        'TEXT', 'HTML', 'MARKDOWN'
    )),
    
    -- Uso e contexto
    canais_aplicaveis          JSONB DEFAULT '["TODOS"]'::jsonb, -- WhatsApp, Email, etc.
    departamentos_aplicaveis   JSONB DEFAULT '["TODOS"]'::jsonb,
    categorias_aplicaveis      JSONB DEFAULT '[]'::jsonb,
    
    -- Personalização
    possui_variaveis           BOOLEAN DEFAULT FALSE,
    variaveis_disponiveis      JSONB DEFAULT '[]'::jsonb, -- {NOME}, {PRODUTO}, etc.
    
    -- Anexos padrão
    anexos_padrao             JSONB DEFAULT '[]'::jsonb, -- URLs de manuais, catálogos
    
    -- Estatísticas de uso
    vezes_utilizado           INTEGER DEFAULT 0,
    ultima_utilizacao         TIMESTAMP,
    
    -- Status
    ativo                     BOOLEAN DEFAULT TRUE,
    created_at                TIMESTAMP DEFAULT NOW(),
    updated_at                TIMESTAMP DEFAULT NOW(),
    created_by                VARCHAR(50) DEFAULT 'ADMIN'
);

-- Índices
CREATE INDEX idx_templates_categoria ON spt_04_templates_resposta(categoria_template);
CREATE INDEX idx_templates_ativo ON spt_04_templates_resposta(ativo);
CREATE INDEX idx_templates_departamentos ON spt_04_templates_resposta USING GIN(departamentos_aplicaveis);

-- Templates padrão para NXT
INSERT INTO spt_04_templates_resposta (nome_template, categoria_template, assunto_template, corpo_template, possui_variaveis, variaveis_disponiveis) VALUES
(
    'Primeira Resposta - Dúvida Técnica',
    'PRIMEIRA_RESPOSTA',
    'Recebemos sua dúvida técnica',
    'Olá {NOME}!

Recebemos sua dúvida sobre {PRODUTO} e nossa equipe técnica está analisando sua solicitação.

Nosso compromisso é responder dúvidas técnicas em até 2 horas durante o horário comercial (08h às 18h).

Caso seja urgente, você pode entrar em contato pelo WhatsApp: (11) 99999-9999

Atenciosamente,
Equipe Técnica NXT',
    TRUE,
    '["NOME", "PRODUTO", "MODELO"]'::jsonb
),
(
    'Solicitar Informações Adicionais',
    'SOLICITACAO_INFO',
    'Informações adicionais necessárias',
    'Olá {NOME}!

Para melhor atendê-lo, precisamos de algumas informações adicionais:

• Qual o modelo exato do seu equipamento?
• Quando ocorreu o problema?
• Você pode enviar fotos ou vídeo do problema?
• O equipamento está na garantia?

Aguardo suas informações para dar continuidade ao atendimento.

Atenciosamente,
{AGENTE}',
    TRUE,
    '["NOME", "AGENTE"]'::jsonb
),
(
    'Problema Resolvido',
    'RESOLUCAO',
    'Problema resolvido - Ticket #{TICKET}',
    'Olá {NOME}!

Informo que seu chamado #{TICKET} foi resolvido com sucesso.

Solução aplicada: {SOLUCAO}

Caso o problema persista ou tenha outras dúvidas, não hesite em nos contatar.

Por favor, avalie nosso atendimento através do link: {LINK_AVALIACAO}

Muito obrigado pela confiança!

Atenciosamente,
{AGENTE} - NXT Suporte',
    TRUE,
    '["NOME", "TICKET", "SOLUCAO", "AGENTE", "LINK_AVALIACAO"]'::jsonb
),
(
    'Orientação Garantia',
    'GARANTIA',
    'Informações sobre garantia',
    'Olá {NOME}!

Sobre a garantia do seu {PRODUTO}:

✅ Garantia: 12 meses contra defeitos de fabricação
✅ Cobertura: Motor, bateria, controlador e componentes eletrônicos
✅ Para acionamento: Nota fiscal + fotos/vídeo do problema

Documentos necessários:
• Nota fiscal de compra
• Fotos do produto e defeito apresentado
• Descrição detalhada do problema

Nossa assistência técnica está localizada em São Paulo/SP.

Dúvidas? Entre em contato conosco!

Atenciosamente,
Equipe NXT',
    TRUE,
    '["NOME", "PRODUTO"]'::jsonb
);
```

### **SPT_05_tickets**
```sql
CREATE TABLE spt_05_tickets (
    id_ticket                  SERIAL PRIMARY KEY,
    
    -- Identificação
    numero_ticket              VARCHAR(20) UNIQUE NOT NULL, -- Gerado automaticamente
    
    -- Cliente e contato
    id_cliente                 INTEGER REFERENCES cad_03_clientes(id_cliente),
    id_lead                    INTEGER REFERENCES cad_08_leads(id_lead),
    nome_contato               VARCHAR(100) NOT NULL,
    email_contato              VARCHAR(100),
    telefone_cliente           VARCHAR(20),
    whatsapp_cliente           VARCHAR(20),
    
    -- Dados do ticket
    assunto                    VARCHAR(200) NOT NULL,
    descricao                  TEXT NOT NULL,
    id_categoria               INTEGER NOT NULL REFERENCES spt_02_categorias_tickets(id_categoria),
    
    -- Canal de origem
    canal_origem               VARCHAR(20) NOT NULL CHECK (canal_origem IN (
        'WHATSAPP', 'EMAIL', 'TELEFONE', 'INSTAGRAM', 'MERCADO_LIVRE', 
        'SITE', 'PRESENCIAL', 'SISTEMA', 'CHAT'
    )),
    canal_detalhes             JSONB DEFAULT '{}'::jsonb, -- Info específica do canal
    
    -- Produto relacionado
    id_produto                 INTEGER REFERENCES prd_03_produtos(id_produto),
    produto_descricao          VARCHAR(200),
    numero_serie               VARCHAR(50),
    data_compra                DATE,
    nota_fiscal                VARCHAR(50),
    
    -- Classificação e prioridade
    prioridade                 VARCHAR(10) DEFAULT 'MEDIA' CHECK (prioridade IN (
        'BAIXA', 'MEDIA', 'ALTA', 'URGENTE', 'CRITICA'
    )),
    
    tipo_ticket                VARCHAR(30) DEFAULT 'DUVIDA' CHECK (tipo_ticket IN (
        'DUVIDA', 'PROBLEMA', 'RECLAMACAO', 'SUGESTAO', 'GARANTIA', 
        'INSTALACAO', 'MANUTENCAO', 'ORCAMENTO'
    )),
    
    -- Status e atribuição
    status_ticket              VARCHAR(20) DEFAULT 'ABERTO' CHECK (status_ticket IN (
        'ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO_CLIENTE', 'ESCALADO',
        'RESOLVIDO', 'FECHADO', 'CANCELADO'
    )),
    
    id_agente_responsavel      INTEGER REFERENCES spt_03_agentes_suporte(id_agente),
    departamento_atual         VARCHAR(50),
    
    -- SLA e prazos
    data_limite_resposta       TIMESTAMP,
    data_limite_resolucao      TIMESTAMP,
    data_primeira_resposta     TIMESTAMP,
    data_resolucao             TIMESTAMP,
    
    -- Métricas de tempo
    tempo_primeira_resposta_min INTEGER, -- Em minutos
    tempo_resolucao_horas      NUMERIC(8,2), -- Em horas
    sla_resposta_cumprido      BOOLEAN,
    sla_resolucao_cumprido     BOOLEAN,
    
    -- Satisfação do cliente
    avaliacao_cliente          INTEGER CHECK (avaliacao_cliente BETWEEN 1 AND 5),
    comentario_avaliacao       TEXT,
    data_avaliacao             TIMESTAMP,
    
    -- Escalação
    escalado                   BOOLEAN DEFAULT FALSE,
    data_escalacao             TIMESTAMP,
    motivo_escalacao           TEXT,
    agente_escalacao           INTEGER REFERENCES spt_03_agentes_suporte(id_agente),
    
    -- Webhook de origem
    id_webhook_log             INTEGER REFERENCES whk_02_log_webhooks_recebidos(id_webhook_log),
    
    -- Anexos e links
    anexos                     JSONB DEFAULT '[]'::jsonb,
    links_relacionados         JSONB DEFAULT '[]'::jsonb,
    
    -- Tags e observações
    tags                       JSONB DEFAULT '[]'::jsonb,
    observacoes_internas       TEXT,
    
    -- Auditoria
    created_at                 TIMESTAMP DEFAULT NOW(),
    updated_at                 TIMESTAMP DEFAULT NOW(),
    created_by                 VARCHAR(50) DEFAULT 'SISTEMA',
    updated_by                 VARCHAR(50)
);

-- Índices para performance
CREATE INDEX idx_tickets_numero ON spt_05_tickets(numero_ticket);
CREATE INDEX idx_tickets_cliente ON spt_05_tickets(id_cliente);
CREATE INDEX idx_tickets_agente ON spt_05_tickets(id_agente_responsavel);
CREATE INDEX idx_tickets_status ON spt_05_tickets(status_ticket);
CREATE INDEX idx_tickets_prioridade ON spt_05_tickets(prioridade);
CREATE INDEX idx_tickets_categoria ON spt_05_tickets(id_categoria);
CREATE INDEX idx_tickets_canal ON spt_05_tickets(canal_origem);
CREATE INDEX idx_tickets_data_criacao ON spt_05_tickets(created_at);
CREATE INDEX idx_tickets_sla_resposta ON spt_05_tickets(data_limite_resposta);
CREATE INDEX idx_tickets_sla_resolucao ON spt_05_tickets(data_limite_resolucao);
CREATE INDEX idx_tickets_escalado ON spt_05_tickets(escalado) WHERE escalado = TRUE;

-- Índice GIN para JSONB
CREATE INDEX idx_tickets_tags ON spt_05_tickets USING GIN(tags);
CREATE INDEX idx_tickets_canal_detalhes ON spt_05_tickets USING GIN(canal_detalhes);
```

### **SPT_06_interacoes_tickets**
```sql
CREATE TABLE spt_06_interacoes_tickets (
    id_interacao               SERIAL PRIMARY KEY,
    id_ticket                  INTEGER NOT NULL REFERENCES spt_05_tickets(id_ticket) ON DELETE CASCADE,
    
    -- Dados da interação
    tipo_interacao             VARCHAR(30) NOT NULL CHECK (tipo_interacao IN (
        'RESPOSTA_AGENTE', 'MENSAGEM_CLIENTE', 'NOTA_INTERNA', 'MUDANCA_STATUS',
        'ESCALACAO', 'ANEXO', 'LIGACAO', 'REUNIAO', 'AVALIACAO'
    )),
    
    -- Autor da interação
    id_agente                  INTEGER REFERENCES spt_03_agentes_suporte(id_agente),
    nome_autor                 VARCHAR(100), -- Nome do cliente ou agente
    email_autor                VARCHAR(100),
    
    -- Conteúdo
    assunto                    VARCHAR(200),
    mensagem                   TEXT,
    mensagem_formatada         TEXT, -- HTML ou markdown
    
    -- Canal específico
    canal_interacao            VARCHAR(20) CHECK (canal_interacao IN (
        'WHATSAPP', 'EMAIL', 'TELEFONE', 'INSTAGRAM', 'SISTEMA', 'PRESENCIAL'
    )),
    
    -- Privacidade e visibilidade
    visivel_cliente            BOOLEAN DEFAULT TRUE,
    e_resposta_automatica      BOOLEAN DEFAULT FALSE,
    id_template_usado          INTEGER REFERENCES spt_04_templates_resposta(id_template),
    
    -- Anexos e mídia
    anexos                     JSONB DEFAULT '[]'::jsonb,
    imagens_urls               JSONB DEFAULT '[]'::jsonb,
    
    -- Tempo gasto
    tempo_gasto_minutos        INTEGER,
    
    -- Status da mensagem
    status_envio               VARCHAR(20) DEFAULT 'ENVIADO' CHECK (status_envio IN (
        'PENDENTE', 'ENVIADO', 'ENTREGUE', 'LIDO', 'ERRO'
    )),
    erro_envio                 TEXT,
    
    -- Métricas
    lida_pelo_cliente          BOOLEAN DEFAULT FALSE,
    data_leitura_cliente       TIMESTAMP,
    
    created_at                 TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_interacoes_ticket ON spt_06_interacoes_tickets(id_ticket);
CREATE INDEX idx_interacoes_tipo ON spt_06_interacoes_tickets(tipo_interacao);
CREATE INDEX idx_interacoes_agente ON spt_06_interacoes_tickets(id_agente);
CREATE INDEX idx_interacoes_data ON spt_06_interacoes_tickets(created_at);
CREATE INDEX idx_interacoes_visivel ON spt_06_interacoes_tickets(visivel_cliente);
CREATE INDEX idx_interacoes_canal ON spt_06_interacoes_tickets(canal_interacao);
```

---

## 🔄 FUNÇÕES E TRIGGERS AUTOMÁTICOS

### **Função: Gerar Número de Ticket**
```sql
-- Função para gerar número único de ticket
CREATE OR REPLACE FUNCTION fn_gerar_numero_ticket()
RETURNS TEXT AS $$
DECLARE
    novo_numero TEXT;
    ano_atual TEXT;
    contador INTEGER;
BEGIN
    -- Pegar ano atual
    ano_atual := EXTRACT(YEAR FROM CURRENT_DATE)::text;
    
    -- Contar tickets do ano atual
    SELECT COUNT(*) + 1 INTO contador
    FROM spt_05_tickets 
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Formato: NXT-YYYY-NNNNNN (ex: NXT-2025-000001)
    novo_numero := 'NXT-' || ano_atual || '-' || LPAD(contador::text, 6, '0');
    
    -- Verificar se já existe (precaução)
    WHILE EXISTS(SELECT 1 FROM spt_05_tickets WHERE numero_ticket = novo_numero) LOOP
        contador := contador + 1;
        novo_numero := 'NXT-' || ano_atual || '-' || LPAD(contador::text, 6, '0');
    END LOOP;
    
    RETURN novo_numero;
END;
$$ LANGUAGE plpgsql;
```

### **Função: Calcular SLA**
```sql
-- Função para calcular prazos de SLA
CREATE OR REPLACE FUNCTION fn_calcular_sla_ticket(
    p_categoria_id INTEGER,
    p_prioridade VARCHAR(10),
    p_data_criacao TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE(data_limite_resposta TIMESTAMP, data_limite_resolucao TIMESTAMP) AS $$
DECLARE
    config_sla RECORD;
    fator_prioridade NUMERIC;
    minutos_resposta INTEGER;
    horas_resolucao INTEGER;
BEGIN
    -- Buscar configuração de SLA
    SELECT 
        COALESCE(c.sla_resposta_personalizado, cfg.sla_resposta_minutos) as resposta_min,
        COALESCE(c.sla_resolucao_personalizado, cfg.sla_resolucao_horas) as resolucao_hr
    INTO config_sla
    FROM spt_02_categorias_tickets c
    CROSS JOIN spt_01_configuracao_suporte cfg
    WHERE c.id_categoria = p_categoria_id;
    
    -- Fator de prioridade
    fator_prioridade := CASE p_prioridade
        WHEN 'CRITICA' THEN 0.25
        WHEN 'URGENTE' THEN 0.5
        WHEN 'ALTA' THEN 0.75
        WHEN 'MEDIA' THEN 1.0
        WHEN 'BAIXA' THEN 1.5
        ELSE 1.0
    END;
    
    -- Calcular prazos
    minutos_resposta := (config_sla.resposta_min * fator_prioridade)::INTEGER;
    horas_resolucao := (config_sla.resolucao_hr * fator_prioridade)::INTEGER;
    
    -- Ajustar para horário comercial se necessário
    data_limite_resposta := fn_calcular_prazo_comercial(p_data_criacao, minutos_resposta);
    data_limite_resolucao := fn_calcular_prazo_comercial(p_data_criacao, horas_resolucao * 60);
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
```

### **Função: Horário Comercial**
```sql
-- Função para calcular prazo considerando horário comercial
CREATE OR REPLACE FUNCTION fn_calcular_prazo_comercial(
    p_data_inicio TIMESTAMP,
    p_minutos_prazo INTEGER
)
RETURNS TIMESTAMP AS $$
DECLARE
    data_resultado TIMESTAMP;
    minutos_restantes INTEGER;
    hora_inicio TIME;
    hora_fim TIME;
    dia_semana INTEGER;
BEGIN
    -- Buscar configuração de horário
    SELECT horario_inicio, horario_fim INTO hora_inicio, hora_fim
    FROM spt_01_configuracao_suporte LIMIT 1;
    
    data_resultado := p_data_inicio;
    minutos_restantes := p_minutos_prazo;
    
    -- Se está fora do horário comercial, ajustar para próximo horário
    WHILE minutos_restantes > 0 LOOP
        dia_semana := EXTRACT(DOW FROM data_resultado); -- 0=Domingo, 1=Segunda
        
        -- Se é fim de semana, pular para segunda
        IF dia_semana = 0 THEN -- Domingo
            data_resultado := date_trunc('day', data_resultado) + INTERVAL '1 day' + hora_inicio;
        ELSIF dia_semana = 6 THEN -- Sábado
            data_resultado := date_trunc('day', data_resultado) + INTERVAL '2 days' + hora_inicio;
        ELSE
            -- Dia útil
            IF data_resultado::time < hora_inicio THEN
                data_resultado := date_trunc('day', data_resultado) + hora_inicio;
            ELSIF data_resultado::time >= hora_fim THEN
                data_resultado := date_trunc('day', data_resultado) + INTERVAL '1 day' + hora_inicio;
            END IF;
            
            -- Calcular minutos até o fim do expediente
            DECLARE
                fim_expediente TIMESTAMP;
                minutos_disponiveis INTEGER;
            BEGIN
                fim_expediente := date_trunc('day', data_resultado) + hora_fim;
                minutos_disponiveis := EXTRACT(EPOCH FROM (fim_expediente - data_resultado)) / 60;
                
                IF minutos_restantes <= minutos_disponiveis THEN
                    data_resultado := data_resultado + (minutos_restantes || ' minutes')::interval;
                    minutos_restantes := 0;
                ELSE
                    minutos_restantes := minutos_restantes - minutos_disponiveis;
                    data_resultado := date_trunc('day', data_resultado) + INTERVAL '1 day' + hora_inicio;
                END IF;
            END;
        END IF;
    END LOOP;
    
    RETURN data_resultado;
END;
$$ LANGUAGE plpgsql;
```

### **Trigger: Auto-preenchimento Ticket**
```sql
-- Trigger para preenchimento automático de dados do ticket
CREATE OR REPLACE FUNCTION fn_auto_preencher_ticket()
RETURNS TRIGGER AS $$
DECLARE
    sla_prazos RECORD;
    agente_disponivel RECORD;
BEGIN
    -- Gerar número do ticket se não foi fornecido
    IF NEW.numero_ticket IS NULL OR NEW.numero_ticket = '' THEN
        NEW.numero_ticket := fn_gerar_numero_ticket();
    END IF;
    
    -- Calcular SLA
    SELECT * INTO sla_prazos 
    FROM fn_calcular_sla_ticket(NEW.id_categoria, NEW.prioridade, NEW.created_at);
    
    NEW.data_limite_resposta := sla_prazos.data_limite_resposta;
    NEW.data_limite_resolucao := sla_prazos.data_limite_resolucao;
    
    -- Atribuir agente automaticamente se não foi especificado
    IF NEW.id_agente_responsavel IS NULL THEN
        -- Buscar agente disponível do departamento
        SELECT id_agente INTO agente_disponivel
        FROM spt_03_agentes_suporte a
        JOIN spt_02_categorias_tickets c ON c.departamento = a.departamento_principal
        WHERE c.id_categoria = NEW.id_categoria
          AND a.status_agente = 'DISPONIVEL'
          AND a.ativo = TRUE
          AND a.tickets_ativos_count < a.max_tickets_simultaneos
        ORDER BY a.tickets_ativos_count ASC, RANDOM()
        LIMIT 1;
        
        IF FOUND THEN
            NEW.id_agente_responsavel := agente_disponivel.id_agente;
            NEW.departamento_atual := (SELECT departamento FROM spt_02_categorias_tickets WHERE id_categoria = NEW.id_categoria);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
CREATE TRIGGER trg_auto_preencher_ticket
    BEFORE INSERT ON spt_05_tickets
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_preencher_ticket();
```

### **Trigger: Atualizar Contador de Tickets do Agente**
```sql
-- Trigger para manter contador de tickets ativos do agente
CREATE OR REPLACE FUNCTION fn_atualizar_contador_agente()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando ticket é criado ou agente é alterado
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.id_agente_responsavel != NEW.id_agente_responsavel) THEN
        -- Decrementar contador do agente anterior (se existir)
        IF TG_OP = 'UPDATE' AND OLD.id_agente_responsavel IS NOT NULL THEN
            UPDATE spt_03_agentes_suporte 
            SET tickets_ativos_count = tickets_ativos_count - 1
            WHERE id_agente = OLD.id_agente_responsavel;
        END IF;
        
        -- Incrementar contador do novo agente
        IF NEW.id_agente_responsavel IS NOT NULL THEN
            UPDATE spt_03_agentes_suporte 
            SET tickets_ativos_count = tickets_ativos_count + 1,
                ultima_atividade = NOW()
            WHERE id_agente = NEW.id_agente_responsavel;
        END IF;
    END IF;
    
    -- Quando ticket é fechado
    IF TG_OP = 'UPDATE' AND OLD.status_ticket NOT IN ('RESOLVIDO', 'FECHADO', 'CANCELADO') 
       AND NEW.status_ticket IN ('RESOLVIDO', 'FECHADO', 'CANCELADO') THEN
        
        -- Decrementar contador
        IF NEW.id_agente_responsavel IS NOT NULL THEN
            UPDATE spt_03_agentes_suporte 
            SET tickets_ativos_count = tickets_ativos_count - 1,
                tickets_resolvidos_total = tickets_resolvidos_total + 1
            WHERE id_agente = NEW.id_agente_responsavel;
        END IF;
        
        -- Calcular tempo de resolução
        IF NEW.status_ticket = 'RESOLVIDO' AND NEW.data_resolucao IS NULL THEN
            NEW.data_resolucao := NOW();
            NEW.tempo_resolucao_horas := EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 3600;
            NEW.sla_resolucao_cumprido := (NOW() <= NEW.data_limite_resolucao);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
CREATE TRIGGER trg_atualizar_contador_agente
    AFTER INSERT OR UPDATE ON spt_05_tickets
    FOR EACH ROW
    EXECUTE FUNCTION fn_atualizar_contador_agente();
```

---

## 📊 VIEWS E RELATÓRIOS

### **Dashboard de Tickets**
```sql
CREATE VIEW vw_dashboard_tickets AS
SELECT 
    -- Estatísticas gerais
    COUNT(*) as total_tickets,
    COUNT(*) FILTER (WHERE status_ticket = 'ABERTO') as tickets_abertos,
    COUNT(*) FILTER (WHERE status_ticket = 'EM_ANDAMENTO') as tickets_em_andamento,
    COUNT(*) FILTER (WHERE status_ticket = 'AGUARDANDO_CLIENTE') as aguardando_cliente,
    COUNT(*) FILTER (WHERE status_ticket = 'RESOLVIDO') as tickets_resolvidos,
    
    -- Por prioridade
    COUNT(*) FILTER (WHERE prioridade = 'CRITICA') as criticos,
    COUNT(*) FILTER (WHERE prioridade = 'URGENTE') as urgentes,
    COUNT(*) FILTER (WHERE prioridade = 'ALTA') as alta_prioridade,
    
    -- SLA
    COUNT(*) FILTER (WHERE data_limite_resposta < NOW() AND data_primeira_resposta IS NULL) as sla_resposta_vencido,
    COUNT(*) FILTER (WHERE data_limite_resolucao < NOW() AND status_ticket NOT IN ('RESOLVIDO', 'FECHADO')) as sla_resolucao_vencido,
    
    -- Por período
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as tickets_hoje,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as tickets_semana,
    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as tickets_mes,
    
    -- Métricas de qualidade
    AVG(tempo_primeira_resposta_min) FILTER (WHERE tempo_primeira_resposta_min IS NOT NULL) as tempo_medio_resposta,
    AVG(tempo_resolucao_horas) FILTER (WHERE tempo_resolucao_horas IS NOT NULL) as tempo_medio_resolucao,
    AVG(avaliacao_cliente) FILTER (WHERE avaliacao_cliente IS NOT NULL) as nota_media_satisfacao,
    
    -- Taxa de resolução no SLA
    ROUND(
        COUNT(*) FILTER (WHERE sla_resolucao_cumprido = TRUE) * 100.0 / 
        NULLIF(COUNT(*) FILTER (WHERE status_ticket = 'RESOLVIDO'), 0), 2
    ) as taxa_sla_resolucao_pct

FROM spt_05_tickets
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
```

### **Tickets Críticos e Alertas**
```sql
CREATE VIEW vw_alertas_tickets AS
SELECT 
    t.id_ticket,
    t.numero_ticket,
    t.assunto,
    t.nome_contato,
    t.prioridade,
    t.status_ticket,
    c.nome_categoria,
    a.nome_completo as agente_responsavel,
    
    -- Tipo de alerta
    CASE 
        WHEN t.data_limite_resposta < NOW() AND t.data_primeira_resposta IS NULL THEN 'SLA_RESPOSTA_VENCIDO'
        WHEN t.data_limite_resolucao < NOW() AND t.status_ticket NOT IN ('RESOLVIDO', 'FECHADO') THEN 'SLA_RESOLUCAO_VENCIDO'
        WHEN t.prioridade IN ('CRITICA', 'URGENTE') AND t.status_ticket = 'ABERTO' THEN 'PRIORIDADE_ALTA_ABERTO'
        WHEN t.status_ticket = 'AGUARDANDO_CLIENTE' AND t.updated_at < NOW() - INTERVAL '3 days' THEN 'AGUARDANDO_CLIENTE_LONGO'
        WHEN t.escalado = TRUE AND t.data_escalacao < NOW() - INTERVAL '2 hours' THEN 'ESCALACAO_SEM_ACAO'
    END as tipo_alerta,
    
    -- Urgência
    CASE 
        WHEN t.prioridade = 'CRITICA' THEN 'CRITICA'
        WHEN t.data_limite_resposta < NOW() - INTERVAL '2 hours' THEN 'ALTA'
        WHEN t.data_limite_resposta < NOW() THEN 'MEDIA'
        ELSE 'BAIXA'
    END as urgencia_alerta,
    
    t.created_at,
    t.data_limite_resposta,
    t.data_limite_resolucao
    
FROM spt_05_tickets t
JOIN spt_02_categorias_tickets c ON c.id_categoria = t.id_categoria
LEFT JOIN spt_03_agentes_suporte a ON a.id_agente = t.id_agente_responsavel
WHERE t.status_ticket NOT IN ('RESOLVIDO', 'FECHADO', 'CANCELADO')
  AND (
    (t.data_limite_resposta < NOW() AND t.data_primeira_resposta IS NULL) OR
    (t.data_limite_resolucao < NOW()) OR
    (t.prioridade IN ('CRITICA', 'URGENTE') AND t.status_ticket = 'ABERTO') OR
    (t.status_ticket = 'AGUARDANDO_CLIENTE' AND t.updated_at < NOW() - INTERVAL '3 days') OR
    (t.escalado = TRUE AND t.data_escalacao < NOW() - INTERVAL '2 hours')
  )
ORDER BY 
    CASE urgencia_alerta 
        WHEN 'CRITICA' THEN 1 
        WHEN 'ALTA' THEN 2 
        WHEN 'MEDIA' THEN 3 
        ELSE 4 
    END,
    t.data_limite_resposta ASC;
```

---

**Sistema de Ticketing Completo - NXT Indústria e Comércio Ltda**  
*Versão: 1.0*  
*Data: 2025-07-05*  
*Integração com ERP, CRM e Sistema de Webhooks*