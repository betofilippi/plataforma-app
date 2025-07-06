# Manual de Implementação por Fases - ERP NXT Indústria e Comércio Ltda

## 🎯 Objetivo do Manual

Este manual detalha step-by-step a implementação do sistema ERP integrado em 5 fases de 30 dias cada, totalizando 120 dias para completa operação do sistema unificado de importação e ERP.

---

## 📅 Cronograma Geral

| **Fase** | **Período** | **Foco Principal** | **Duração** |
|----------|-------------|-------------------|-------------|
| **Fase 1** | Dias 1-30 | Infraestrutura e Cadastros Base | 30 dias |
| **Fase 2** | Dias 31-60 | Módulos Operacionais Core | 30 dias |
| **Fase 3** | Dias 61-90 | Integração Importação + Produção | 30 dias |
| **Fase 4** | Dias 91-120 | CRM, Vendas e Logística | 30 dias |
| **Fase 5** | Pós-120 | Otimização e Expansão | Contínuo |

---

## 🚀 FASE 1: INFRAESTRUTURA E CADASTROS BASE (Dias 1-30)

### **Semana 1 (Dias 1-7): Preparação e Ambiente**

#### **Dia 1-2: Setup Inicial**
```bash
# 1. Backup completo do sistema atual
pg_dump plataforma_db > backup_pre_erp_$(date +%Y%m%d).sql

# 2. Criar ambiente de desenvolvimento
createdb erp_nxt_dev
createdb erp_nxt_test

# 3. Configurar repositório Git
git init erp-nxt-sistema
git remote add origin https://github.com/nxt-industria/erp-sistema.git
```

#### **Dia 3-4: Estrutura Base**
```sql
-- 1. Criar tabelas de controle
CREATE TABLE sistema_config (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(50) UNIQUE NOT NULL,
    valor TEXT,
    modulo VARCHAR(20),
    descricao TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Criar tabela de log de implementação
CREATE TABLE log_implementacao (
    id SERIAL PRIMARY KEY,
    fase VARCHAR(20),
    etapa VARCHAR(100),
    status VARCHAR(20), -- INICIADO, CONCLUIDO, ERRO
    data_inicio TIMESTAMP,
    data_fim TIMESTAMP,
    observacoes TEXT,
    responsavel VARCHAR(50)
);

-- 3. Inserir configurações iniciais
INSERT INTO sistema_config (chave, valor, modulo, descricao) VALUES
('fase_atual', '1', 'SISTEMA', 'Fase atual da implementação'),
('ambiente', 'DESENVOLVIMENTO', 'SISTEMA', 'Ambiente atual'),
('empresa_principal_id', '1', 'CAD', 'ID da empresa principal');
```

#### **Dia 5-7: Módulo CAD - Cadastros Básicos**
```sql
-- Executar scripts do módulo CAD conforme ESPECIFICACOES_TECNICAS_ERP.md
-- 1. cad_01_empresas
-- 2. cad_02_bancos  
-- 3. cad_03_clientes
-- 4. cad_04_fornecedores
-- 5. cad_05_transportadores

-- Inserir dados iniciais da NXT
INSERT INTO cad_01_empresas (
    cnpj, razao_social, endereco, municipio, uf, 
    telefone, email, ativo
) VALUES (
    'XX.XXX.XXX/0001-XX', 
    'NXT Indústria e Comércio Ltda',
    'Endereço da NXT',
    'Cidade',
    'SP',
    '(11) XXXX-XXXX',
    'contato@nxt.com.br',
    TRUE
);
```

### **Semana 2 (Dias 8-14): Módulos de Localização e Produtos Base**

#### **Dia 8-10: Módulo LOC - Localização**
```sql
-- 1. loc_01_tipos_localidade
-- 2. loc_02_estabelecimentos  
-- 3. loc_03_depositos
-- 4. loc_04_enderecos_estoque

-- Dados iniciais de depósitos
INSERT INTO loc_03_depositos (descricao, tipo_deposito, ativo) VALUES
('Depósito Principal - Importação', 'IMPORTACAO', TRUE),
('Depósito Produção', 'PRODUCAO', TRUE),
('Depósito Expedição', 'EXPEDICAO', TRUE);
```

#### **Dia 11-14: Módulo PRD - Produtos Base**
```sql
-- 1. prd_01_tipos_produto
-- 2. prd_02_modelos
-- 3. prd_03_produtos  
-- 4. prd_04_composicao_produtos

-- Tipos de produto para mobilidade elétrica
INSERT INTO prd_01_tipos_produto (descricao, categoria, ativo) VALUES
('Equipamentos Autopropelidos', 'PRODUTO_FINAL', TRUE),
('Componentes Eletrônicos', 'COMPONENTE', TRUE),
('Baterias e Carregadores', 'COMPONENTE', TRUE),
('Chassis e Estruturas', 'MATERIA_PRIMA', TRUE);
```

### **Semana 3 (Dias 15-21): Módulo de Estoque**

#### **Dia 15-17: Módulo EST - Estoque**
```sql
-- 1. est_01_tipos_movimento
-- 2. est_02_indicadores_cd
-- 3. est_03_saldos_estoque
-- 4. est_04_movimentacoes

-- Tipos de movimento específicos para importação
INSERT INTO est_01_tipos_movimento (descricao, tipo_operacao, indicador_cd) VALUES
('Entrada por Importação', 'ENTRADA', 'C'),
('Saída para Produção', 'SAIDA', 'D'),
('Transferência entre Depósitos', 'TRANSFERENCIA', 'N'),
('Ajuste de Inventário', 'AJUSTE', 'N');
```

#### **Dia 18-21: Configuração de Triggers Base**
```sql
-- Implementar triggers de auditoria
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em todas as tabelas principais
CREATE TRIGGER trg_audit_cad_empresas 
    BEFORE UPDATE ON cad_01_empresas 
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
```

### **Semana 4 (Dias 22-30): Testes e Validação Fase 1**

#### **Dia 22-25: Testes de Integridade**
```sql
-- Script de validação da Fase 1
CREATE OR REPLACE FUNCTION fn_validar_fase_1()
RETURNS TEXT AS $$
DECLARE
    resultado TEXT := '';
    contador INTEGER;
BEGIN
    -- Verificar tabelas criadas
    SELECT COUNT(*) INTO contador 
    FROM information_schema.tables 
    WHERE table_name LIKE 'cad_%' OR table_name LIKE 'loc_%' 
       OR table_name LIKE 'prd_%' OR table_name LIKE 'est_%';
    
    resultado := 'Tabelas criadas: ' || contador || E'\n';
    
    -- Verificar dados básicos
    SELECT COUNT(*) INTO contador FROM cad_01_empresas;
    resultado := resultado || 'Empresas cadastradas: ' || contador || E'\n';
    
    SELECT COUNT(*) INTO contador FROM loc_03_depositos;
    resultado := resultado || 'Depósitos cadastrados: ' || contador || E'\n';
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- Executar validação
SELECT fn_validar_fase_1();
```

#### **Dia 26-30: Documentação e Entrega Fase 1**
```markdown
# ENTREGÁVEIS FASE 1
- [x] 20 tabelas implementadas (CAD, LOC, PRD, EST)
- [x] Dados básicos da empresa NXT configurados
- [x] Sistema de auditoria implementado
- [x] Ambiente de desenvolvimento configurado
- [x] Scripts de backup e restore testados
```

---

## 🔧 FASE 2: MÓDULOS OPERACIONAIS CORE (Dias 31-60)

### **Semana 5 (Dias 31-37): Módulo de Compras**

#### **Dia 31-33: Módulo CMP - Compras**
```sql
-- 1. cmp_07_compras
-- 2. cmp_08_itens_compra  
-- 3. cmp_09_tipos_compra

-- Configurar tipos de compra específicos
INSERT INTO cmp_09_tipos_compra (descricao, categoria, requer_aprovacao) VALUES
('Importação de Componentes', 'IMPORTACAO', TRUE),
('Compra Nacional Matéria-Prima', 'NACIONAL', FALSE),
('Serviços de Terceiros', 'SERVICOS', TRUE);
```

#### **Dia 34-37: Integração Compras + Estoque**
```sql
-- Trigger para movimentação automática após recebimento
CREATE OR REPLACE FUNCTION fn_recebimento_compra()
RETURNS TRIGGER AS $$
BEGIN
    -- Criar entrada de estoque automaticamente
    INSERT INTO est_04_movimentacoes (
        id_produto, id_deposito, id_tipo_movimento,
        quantidade, preco_unitario, documento,
        observacoes, data_movimento
    ) VALUES (
        NEW.id_produto,
        1, -- Depósito principal
        1, -- Entrada por compra
        NEW.quantidade_recebida,
        NEW.preco_unitario,
        'COMP-' || NEW.id_compra,
        'Entrada automática por compra',
        CURRENT_DATE
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recebimento_compra
    AFTER UPDATE ON cmp_08_itens_compra
    FOR EACH ROW
    WHEN (NEW.quantidade_recebida > OLD.quantidade_recebida)
    EXECUTE FUNCTION fn_recebimento_compra();
```

### **Semana 6 (Dias 38-44): Módulo de Produção**

#### **Dia 38-40: Módulo PRO - Produção**
```sql
-- 1. pro_04_itens_ordem_producao
-- 2. pro_05_ordens_producao
-- 3. pro_06_status_producao

-- Status específicos para produção de equipamentos
INSERT INTO pro_06_status_producao (descricao, etapa, cor_status) VALUES
('Aguardando Componentes', 'INICIAL', '#FFA500'),
('Em Montagem', 'PRODUCAO', '#0066CC'),
('Teste Qualidade', 'CONTROLE', '#9900CC'),
('Finalizado', 'CONCLUIDO', '#00AA00'),
('Problema Técnico', 'ERRO', '#FF0000');
```

#### **Dia 41-44: BOM (Bill of Materials)**
```sql
-- Implementar estrutura de BOM para equipamentos autopropelidos
CREATE OR REPLACE FUNCTION fn_criar_bom_produto(
    p_produto_id INTEGER,
    p_componentes JSONB
) RETURNS TEXT AS $$
DECLARE
    componente JSONB;
BEGIN
    -- Limpar BOM existente
    DELETE FROM prd_04_composicao_produtos 
    WHERE id_produto_pai = p_produto_id;
    
    -- Inserir novos componentes
    FOR componente IN SELECT * FROM jsonb_array_elements(p_componentes)
    LOOP
        INSERT INTO prd_04_composicao_produtos (
            id_produto_pai,
            id_produto_filho,
            quantidade,
            unidade,
            observacoes
        ) VALUES (
            p_produto_id,
            (componente->>'id_componente')::INTEGER,
            (componente->>'quantidade')::NUMERIC,
            componente->>'unidade',
            componente->>'observacoes'
        );
    END LOOP;
    
    RETURN 'BOM criado com sucesso';
END;
$$ LANGUAGE plpgsql;
```

### **Semana 7 (Dias 45-51): Módulo Fiscal**

#### **Dia 45-47: Módulo FIS - Fiscal**
```sql
-- 1. fis_08_tipos_operacao
-- 2. fis_09_notas_fiscais
-- 3. fis_10_itens_nota_fiscal

-- Operações fiscais específicas para NXT
INSERT INTO fis_08_tipos_operacao (codigo, descricao, tipo_operacao, cfop) VALUES
('VENDA_ESTADUAL', 'Venda de Equipamento - Mesmo Estado', 'SAIDA', '5102'),
('VENDA_INTERESTADUAL', 'Venda de Equipamento - Outro Estado', 'SAIDA', '6102'),
('ENTRADA_IMPORTACAO', 'Entrada por Importação', 'ENTRADA', '3102'),
('REMESSA_CONSERTO', 'Remessa para Conserto', 'SAIDA', '5915');
```

#### **Dia 48-51: Integração Fiscal + Vendas**
```sql
-- Trigger para geração automática de NF
CREATE OR REPLACE FUNCTION fn_gerar_nf_venda()
RETURNS TRIGGER AS $$
DECLARE
    nf_id INTEGER;
BEGIN
    -- Só gera NF se venda foi aprovada
    IF NEW.status_venda = 'APROVADA' AND OLD.status_venda != 'APROVADA' THEN
        INSERT INTO fis_09_notas_fiscais (
            numero_nota_fiscal,
            serie,
            data_emissao,
            id_cliente,
            valor_total,
            tipo_operacao,
            observacoes
        ) VALUES (
            fn_proximo_numero_nf(),
            '001',
            CURRENT_DATE,
            NEW.id_cliente,
            NEW.valor_total,
            'SAIDA',
            'NF gerada automaticamente da venda ' || NEW.numero_pedido
        ) RETURNING id_nota_fiscal INTO nf_id;
        
        -- Atualizar venda com ID da NF
        UPDATE vnd_05_vendas 
        SET id_nota_fiscal = nf_id 
        WHERE id_venda = NEW.id_venda;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### **Semana 8 (Dias 52-60): Validação Fase 2**

#### **Dia 52-55: Testes Integrados**
```sql
-- Teste completo: Compra → Produção → Venda
BEGIN;

-- 1. Criar pedido de compra
INSERT INTO cmp_07_compras (
    numero_pedido, id_fornecedor, data_pedido, 
    valor_total, status_compra
) VALUES (
    'COMP-TEST-001', 1, CURRENT_DATE, 5000.00, 'APROVADO'
);

-- 2. Criar ordem de produção
INSERT INTO pro_05_ordens_producao (
    numero_ordem, id_produto, quantidade_planejada,
    data_inicio_planejada, status_producao
) VALUES (
    'OP-TEST-001', 1, 10, CURRENT_DATE, 'INICIADA'
);

-- 3. Simular venda
INSERT INTO vnd_05_vendas (
    numero_pedido, id_cliente, data_venda,
    valor_total, status_venda
) VALUES (
    'VND-TEST-001', 1, CURRENT_DATE, 15000.00, 'PENDENTE'
);

ROLLBACK; -- Teste apenas
```

---

## 🔗 FASE 3: INTEGRAÇÃO IMPORTAÇÃO + PRODUÇÃO (Dias 61-90)

### **Semana 9 (Dias 61-67): Preparação para Integração**

#### **Dia 61-63: Análise das Tabelas Importação**
```sql
-- Análise estrutural completa das 18 tabelas importacao_
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name LIKE 'importacao_%'
ORDER BY table_name, ordinal_position;

-- Verificar relacionamentos existentes
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name LIKE 'importacao_%';
```

#### **Dia 64-67: Implementar Tabelas de Ponte**
```sql
-- Conforme especificado em INTEGRACAO_IMPORTACAO_ERP.md
-- 1. log_integracao_erp
-- 2. map_importacao_erp

-- Também criar views de monitoramento
CREATE VIEW vw_status_integracoes AS
SELECT 
    COUNT(*) as total_importacoes,
    COUNT(*) FILTER (WHERE status_integracao = 'SINCRONIZADO') as sincronizadas,
    COUNT(*) FILTER (WHERE status_integracao = 'PENDENTE') as pendentes,
    COUNT(*) FILTER (WHERE status_integracao = 'ERRO') as com_erro
FROM map_importacao_erp;
```

### **Semana 10 (Dias 68-74): Triggers de Integração**

#### **Dia 68-70: Trigger de Criação de Produtos**
```sql
-- Implementar fn_criar_produtos_pos_liberacao()
-- Conforme código detalhado em INTEGRACAO_IMPORTACAO_ERP.md

-- Testar trigger com dados reais
UPDATE importacao_09_1_nota_fiscal 
SET observacoes = 'Mercadoria liberada pela alfândega'
WHERE id = 1; -- Usar importação real existente
```

#### **Dia 71-74: Trigger de Entrada em Estoque**
```sql
-- Implementar fn_entrada_estoque_importacao()
-- Testar criação automática de produtos e entrada em estoque

-- Validar integridade
SELECT 
    p.codigo_produto,
    p.descricao,
    se.saldo_atual,
    pi.invoice_number
FROM prd_03_produtos p
JOIN est_03_saldos_estoque se ON se.id_produto = p.id_produto
JOIN importacao_01_1_proforma_invoice pi ON pi.id = p.id_importacao_origem
WHERE p.origem_dados = 'IMPORTACAO';
```

### **Semana 11 (Dias 75-81): Views de Integração**

#### **Dia 75-77: Views de Custos**
```sql
-- Implementar vw_custos_importacao_produto
-- Conforme INTEGRACAO_IMPORTACAO_ERP.md

-- Teste de precisão de custos
SELECT 
    codigo_produto,
    custo_fob,
    total_tributos,
    custos_nacionais,
    custo_unitario_final
FROM vw_custos_importacao_produto
WHERE id_importacao = 1;
```

#### **Dia 78-81: Dashboard de Importação**
```sql
-- Implementar vw_dashboard_importacao_erp
-- Criar relatório executivo

CREATE VIEW vw_resumo_importacoes_mes AS
SELECT 
    DATE_TRUNC('month', pi.created_at) as mes,
    COUNT(*) as total_importacoes,
    SUM(pi.valor_total) as valor_total_usd,
    COUNT(*) FILTER (WHERE fech.id IS NOT NULL) as fechadas,
    COUNT(*) FILTER (WHERE map.status_integracao = 'SINCRONIZADO') as integradas_erp
FROM importacao_01_1_proforma_invoice pi
LEFT JOIN importacao_10_1_fechamento fech ON fech.importacao_01_1_proforma_invoice_id = pi.id
LEFT JOIN map_importacao_erp map ON map.importacao_proforma_id = pi.id
WHERE pi.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', pi.created_at)
ORDER BY mes DESC;
```

### **Semana 12 (Dias 82-90): Testes de Integração Completa**

#### **Dia 82-85: Simulação de Processo Completo**
```sql
-- Processo: Importação → Produto → Estoque → Produção

-- 1. Simular liberação alfandegária
UPDATE importacao_09_1_nota_fiscal 
SET observacoes = observacoes || E'\nLiberado em ' || CURRENT_DATE
WHERE importacao_01_1_proforma_invoice_id = 1;

-- 2. Verificar criação automática de produto
SELECT fn_sincronizar_importacao_erp(1);

-- 3. Verificar entrada em estoque
SELECT * FROM est_04_movimentacoes 
WHERE documento LIKE 'IMP-%'
ORDER BY created_at DESC LIMIT 5;

-- 4. Criar ordem de produção com o produto importado
INSERT INTO pro_05_ordens_producao (
    numero_ordem,
    id_produto,
    quantidade_planejada,
    observacoes
) 
SELECT 
    'OP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || p.id_produto,
    p.id_produto,
    LEAST(se.saldo_atual, 50), -- Produzir até 50 ou saldo disponível
    'OP criada automaticamente com produto importado'
FROM prd_03_produtos p
JOIN est_03_saldos_estoque se ON se.id_produto = p.id_produto
WHERE p.origem_dados = 'IMPORTACAO'
  AND se.saldo_atual > 0
LIMIT 1;
```

#### **Dia 86-90: Validação e Documentação**
```sql
-- Executar todas as funções de validação
SELECT * FROM fn_validar_integridade_importacao_erp();
SELECT * FROM vw_alertas_integracao;

-- Gerar relatório de implementação Fase 3
SELECT 
    'Produtos criados via importação' as metrica,
    COUNT(*) as valor
FROM prd_03_produtos WHERE origem_dados = 'IMPORTACAO'
UNION ALL
SELECT 
    'Movimentações de estoque por importação',
    COUNT(*)
FROM est_04_movimentacoes WHERE documento LIKE 'IMP-%'
UNION ALL
SELECT 
    'Importações integradas ao ERP',
    COUNT(*)
FROM map_importacao_erp WHERE status_integracao = 'SINCRONIZADO';
```

---

## 💼 FASE 4: CRM, VENDAS E LOGÍSTICA (Dias 91-120)

### **Semana 13 (Dias 91-97): Módulo de Vendas**

#### **Dia 91-93: Módulo VND - Vendas**
```sql
-- 1. vnd_05_vendas
-- 2. vnd_06_itens_venda  
-- 3. vnd_07_condicoes_pagamento

-- Condições de pagamento específicas para equipamentos
INSERT INTO vnd_07_condicoes_pagamento (descricao, parcelas, dias_vencimento, percentual_entrada) VALUES
('À Vista', 1, 0, 100.00),
('30 DDL', 1, 30, 0.00),
('Parcelado 3x sem juros', 3, 30, 33.33),
('50% entrada + 2x', 2, 30, 50.00);
```

#### **Dia 94-97: Integração Vendas + Estoque**
```sql
-- Trigger para baixa automática de estoque na venda
CREATE OR REPLACE FUNCTION fn_baixa_estoque_venda()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    IF NEW.status_venda = 'APROVADA' AND OLD.status_venda != 'APROVADA' THEN
        -- Para cada item da venda, dar baixa no estoque
        FOR item IN 
            SELECT vi.id_produto, vi.quantidade
            FROM vnd_06_itens_venda vi
            WHERE vi.id_venda = NEW.id_venda
        LOOP
            -- Criar movimentação de saída
            INSERT INTO est_04_movimentacoes (
                id_produto, id_deposito, id_tipo_movimento,
                quantidade, documento, observacoes, data_movimento
            ) VALUES (
                item.id_produto,
                1, -- Depósito principal
                2, -- Saída por venda
                -item.quantidade, -- Quantidade negativa para saída
                'VND-' || NEW.numero_pedido,
                'Baixa automática por venda',
                CURRENT_DATE
            );
            
            -- Atualizar saldo
            UPDATE est_03_saldos_estoque 
            SET saldo_atual = saldo_atual - item.quantidade,
                updated_at = NOW()
            WHERE id_produto = item.id_produto AND id_deposito = 1;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_baixa_estoque_venda
    AFTER UPDATE ON vnd_05_vendas
    FOR EACH ROW
    EXECUTE FUNCTION fn_baixa_estoque_venda();
```

### **Semana 14 (Dias 98-104): Sistema CRM**

#### **Dia 98-100: Implementar CRM Completo**
```sql
-- Implementar todas as tabelas do SISTEMA_CRM_LEADS_CLIENTES.md
-- 1. cad_08_leads
-- 2. cad_09_interacoes_leads
-- 3. Extensões em cad_03_clientes

-- Dados de teste para CRM
INSERT INTO cad_08_leads (
    nome, empresa, email, telefone,
    origem_lead, produto_interesse, valor_estimado_negocio,
    vendedor_responsavel
) VALUES
('João Silva', 'Logística Express', 'joao@logistica.com', '11999999999',
 'SITE', 'Empilhadeira Elétrica', 45000.00, 'Vendedor NXT'),
('Maria Santos', 'Delivery Fast', 'maria@delivery.com', '11888888888',
 'FEIRA', 'Transpaleteira Elétrica', 15000.00, 'Vendedor NXT');
```

#### **Dia 101-104: Triggers e Automações CRM**
```sql
-- Implementar todos os triggers do CRM:
-- 1. fn_converter_lead_cliente()
-- 2. fn_atualizar_stats_cliente()  
-- 3. fn_atualizar_lead_pos_interacao()

-- Testar conversão automática lead → cliente
INSERT INTO vnd_05_vendas (
    numero_pedido, id_cliente, data_venda, valor_total, status_venda
) 
SELECT 
    'VND-LEAD-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    c.id_cliente,
    CURRENT_DATE,
    l.valor_estimado_negocio,
    'APROVADA'
FROM cad_08_leads l
JOIN cad_03_clientes c ON c.email = l.email
WHERE l.status_lead = 'QUALIFICADO'
LIMIT 1;
```

### **Semana 15 (Dias 105-111): Módulo de Logística**

#### **Dia 105-107: Módulo LOG - Logística**
```sql
-- 1. log_05_itens_entrega
-- 2. log_06_entregas

-- Criar tipos de entrega específicos
ALTER TABLE log_06_entregas ADD COLUMN tipo_entrega VARCHAR(30);
ALTER TABLE log_06_entregas ADD COLUMN equipamento_entrega VARCHAR(50);

-- Dados para entrega de equipamentos pesados
INSERT INTO log_06_entregas (
    numero_entrega, id_venda, data_programada,
    tipo_entrega, equipamento_entrega, observacoes
) VALUES
('ENT-2025-001', 1, CURRENT_DATE + 7,
 'EQUIPAMENTO_PESADO', 'Caminhão Munck', 'Entrega de empilhadeira - requer equipamento especial');
```

#### **Dia 108-111: Integração Logística + Vendas**
```sql
-- Trigger para criar entrega automática
CREATE OR REPLACE FUNCTION fn_criar_entrega_automatica()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status_venda = 'APROVADA' AND OLD.status_venda != 'APROVADA' THEN
        -- Verificar se venda tem produtos que requerem entrega especial
        IF EXISTS (
            SELECT 1 FROM vnd_06_itens_venda vi
            JOIN prd_03_produtos p ON p.id_produto = vi.id_produto
            JOIN prd_01_tipos_produto tp ON tp.id_tipo = p.id_tipo_produto
            WHERE vi.id_venda = NEW.id_venda 
              AND tp.categoria = 'PRODUTO_FINAL'
        ) THEN
            INSERT INTO log_06_entregas (
                numero_entrega,
                id_venda,
                data_programada,
                tipo_entrega,
                status_entrega,
                observacoes
            ) VALUES (
                'ENT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEW.id_venda::TEXT, 6, '0'),
                NEW.id_venda,
                CURRENT_DATE + INTERVAL '7 days',
                'EQUIPAMENTO_PESADO',
                'PROGRAMADA',
                'Entrega criada automaticamente para venda ' || NEW.numero_pedido
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_criar_entrega_automatica
    AFTER UPDATE ON vnd_05_vendas
    FOR EACH ROW
    EXECUTE FUNCTION fn_criar_entrega_automatica();
```

### **Semana 16 (Dias 112-120): Finalização e Validação**

#### **Dia 112-115: Dashboards e Relatórios Finais**
```sql
-- Dashboard executivo completo
CREATE VIEW vw_dashboard_executivo AS
SELECT 
    -- Importação
    (SELECT COUNT(*) FROM importacao_01_1_proforma_invoice 
     WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as importacoes_mes,
     
    -- Produção  
    (SELECT COUNT(*) FROM pro_05_ordens_producao 
     WHERE data_inicio_planejada >= CURRENT_DATE - INTERVAL '30 days') as producao_mes,
     
    -- Vendas
    (SELECT COALESCE(SUM(valor_total), 0) FROM vnd_05_vendas 
     WHERE data_venda >= CURRENT_DATE - INTERVAL '30 days') as vendas_mes,
     
    -- Estoque
    (SELECT COUNT(*) FROM est_03_saldos_estoque 
     WHERE saldo_atual > 0) as produtos_estoque,
     
    -- CRM
    (SELECT COUNT(*) FROM cad_08_leads 
     WHERE status_lead IN ('QUALIFICADO', 'EM_NEGOCIACAO', 'PROPOSTA_ENVIADA')) as leads_ativos,
     
    -- Entregas
    (SELECT COUNT(*) FROM log_06_entregas 
     WHERE data_programada BETWEEN CURRENT_DATE AND CURRENT_DATE + 7) as entregas_semana;
```

#### **Dia 116-120: Validação Final e Go-Live**
```sql
-- Script de validação completa do sistema
CREATE OR REPLACE FUNCTION fn_validacao_final_sistema()
RETURNS TABLE(
    modulo TEXT,
    status TEXT,
    observacoes TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Módulo CAD
    SELECT 'CAD'::TEXT, 
           CASE WHEN COUNT(*) = 5 THEN 'OK' ELSE 'ERRO' END::TEXT,
           'Tabelas CAD: ' || COUNT(*)::TEXT
    FROM information_schema.tables 
    WHERE table_name ~ '^cad_[0-9]+_'
    
    UNION ALL
    
    -- Módulo Importação Integrado
    SELECT 'IMPORTACAO'::TEXT,
           CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'ERRO' END::TEXT,
           'Produtos criados via importação: ' || COUNT(*)::TEXT
    FROM prd_03_produtos WHERE origem_dados = 'IMPORTACAO'
    
    UNION ALL
    
    -- Módulo CRM
    SELECT 'CRM'::TEXT,
           CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'ERRO' END::TEXT,
           'Leads cadastrados: ' || COUNT(*)::TEXT  
    FROM cad_08_leads
    
    UNION ALL
    
    -- Integração Geral
    SELECT 'INTEGRACAO'::TEXT,
           CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ATENCAO' END::TEXT,
           'Alertas pendentes: ' || COUNT(*)::TEXT
    FROM vw_alertas_integracao WHERE severidade IN ('CRITICO', 'ALTO');
END;
$$ LANGUAGE plpgsql;

-- Executar validação final
SELECT * FROM fn_validacao_final_sistema();
```

---

## 📈 FASE 5: OTIMIZAÇÃO E EXPANSÃO (Pós-120 dias)

### **Mês 5: Monitoramento e Ajustes**

#### **Semana 17-20: Monitoramento Intensivo**
```sql
-- Jobs automáticos de monitoramento
CREATE OR REPLACE FUNCTION fn_job_monitoramento_diario()
RETURNS TEXT AS $$
DECLARE
    resultado TEXT := '';
    alertas INTEGER;
BEGIN
    -- Verificar alertas críticos
    SELECT COUNT(*) INTO alertas 
    FROM vw_alertas_integracao 
    WHERE severidade = 'CRITICO';
    
    IF alertas > 0 THEN
        resultado := 'ATENÇÃO: ' || alertas || ' alertas críticos encontrados';
    ELSE
        resultado := 'Sistema funcionando normalmente';
    END IF;
    
    -- Log de monitoramento
    INSERT INTO log_implementacao (
        fase, etapa, status, observacoes, responsavel
    ) VALUES (
        '5', 'MONITORAMENTO_DIARIO', 'CONCLUIDO', resultado, 'SISTEMA'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- Agendar execução diária (via cron ou equivalente)
-- 0 8 * * * psql -d erp_nxt -c "SELECT fn_job_monitoramento_diario();"
```

### **Mês 6+: Expansões**

#### **Módulos Adicionais**
- **Qualidade**: Controle de qualidade para equipamentos
- **Manutenção**: Histórico de manutenções e garantias  
- **BI/Analytics**: Dashboards avançados e relatórios gerenciais
- **Integração E-commerce**: Catálogo online de equipamentos
- **Mobile**: App para vendedores e técnicos

---

## 🎯 Marcos de Entrega (Milestones)

| **Marco** | **Data** | **Entregável** | **Critério de Sucesso** |
|-----------|----------|-----------------|-------------------------|
| **M1** | Dia 30 | Cadastros Base Funcionais | 100% tabelas CAD/LOC/PRD/EST criadas |
| **M2** | Dia 60 | Módulos Operacionais | CMP/PRO/FIS integrados e testados |
| **M3** | Dia 90 | Integração Importação | Produtos criados automaticamente via importação |
| **M4** | Dia 120 | Sistema Completo | CRM + Vendas + Logística funcionais |
| **M5** | Dia 150 | Otimização | Performance e monitoramento implementados |

---

## 🛠️ Kit de Ferramentas

### **Scripts Úteis**

#### **Backup Automático**
```bash
#!/bin/bash
# backup_erp.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/erp_nxt"
DB_NAME="erp_nxt_production"

mkdir -p $BACKUP_DIR
pg_dump $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Manter apenas últimos 30 backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

#### **Monitoramento de Performance**
```sql
-- Performance das queries mais lentas
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
```

#### **Status do Sistema**
```sql
-- Status geral do sistema
CREATE VIEW vw_status_sistema AS
SELECT 
    'Conectado' as status_db,
    pg_size_pretty(pg_database_size(current_database())) as tamanho_db,
    (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as conexoes_ativas,
    CURRENT_TIMESTAMP as ultimo_check;
```

---

## 📞 Suporte e Escalação

### **Contatos de Emergência**
- **Desenvolvedor Líder**: [contato]
- **DBA**: [contato]  
- **Administrador de Sistema**: [contato]

### **Procedimentos de Escalação**
1. **Nível 1**: Alertas automáticos (< 5 min)
2. **Nível 2**: Problemas funcionais (< 30 min)
3. **Nível 3**: Problemas críticos (< 2 horas)
4. **Nível 4**: Problemas de arquitetura (< 24 horas)

---

## ✅ Checklist Final de Implementação

### **Antes do Go-Live**
- [ ] Backup completo realizado
- [ ] Todos os triggers testados
- [ ] Views de integração validadas  
- [ ] Sistema de monitoramento ativo
- [ ] Documentação atualizada
- [ ] Equipe treinada
- [ ] Plano de rollback preparado

### **Pós Go-Live (Primeiros 30 dias)**
- [ ] Monitoramento diário ativo
- [ ] Performance dentro do esperado
- [ ] Integração com Make.com funcionando
- [ ] Usuários adaptados ao sistema
- [ ] Nenhum alerta crítico pendente

---

*Manual de Implementação por Fases*  
*Versão: 1.0*  
*Data: 2025-07-05*  
*Sistema ERP Integrado - NXT Indústria e Comércio Ltda*