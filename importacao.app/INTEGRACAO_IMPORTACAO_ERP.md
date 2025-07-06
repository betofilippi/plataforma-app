# Integração Importação ↔ ERP - Especificação Técnica

## 🎯 Objetivo da Integração

Conectar de forma inteligente as 18 tabelas do sistema de importação existente (importacao_) com o novo sistema ERP de 46 tabelas, mantendo **100% de compatibilidade** com o blueprint Make.com de 26.358 linhas.

---

## 🔐 Premissas Críticas

### ✅ **Intocáveis** - NUNCA Alterar
1. **18 tabelas importacao_**: Estrutura, nomes, relacionamentos
2. **Blueprint Make.com**: Nenhuma linha pode ser modificada
3. **Webhook Z-API**: Processo de recebimento de documentos
4. **Foreign Keys CASCADE**: Relacionamentos existentes preservados

### 🔄 **Integração** - Pontes Entre Sistemas
1. **Triggers automáticos**: Sincronização em tempo real
2. **Views unificadas**: Consultas integradas
3. **Funções de conversão**: Transformação de dados
4. **Validação cruzada**: Consistência entre sistemas

---

## 🏗️ Arquitetura de Integração

### Camada 1: **Preservação Total** (Sistema Importação)
```
importacao_01_1_proforma_invoice (NÚCLEO)
├── 17 tabelas dependentes (CASCADE DELETE)
└── Make.com Blueprint (26.358 linhas)
```

### Camada 2: **Ponte de Dados** (Nova - Conectores)
```
Triggers → Views → Functions → Validations
```

### Camada 3: **Sistema ERP** (Novo - 46 tabelas)
```
10 Módulos ERP Integrados
├── CAD, EST, PRD (Base)
├── PRO, VND (Operacional)  
├── CMP, FIS (Auxiliares)
└── LOG, LOC (Complementares)
```

---

## 🔄 Pontos de Integração Críticos

### 1. **Criação Automática de Produtos**

#### **Trigger Point**: `importacao_09_1_nota_fiscal` → Status: "Mercadoria Liberada"

```sql
-- Trigger para criação automática de produtos após liberação alfandegária
CREATE OR REPLACE FUNCTION fn_criar_produtos_pos_liberacao()
RETURNS TRIGGER AS $$
DECLARE
    produto_id INTEGER;
    item RECORD;
BEGIN
    -- Verifica se a nota fiscal indica liberação da mercadoria
    IF NEW.observacoes ILIKE '%liberado%' OR NEW.observacoes ILIKE '%desembaraçado%' THEN
        
        -- Para cada item da nota fiscal, cria produto no ERP se não existir
        FOR item IN 
            SELECT DISTINCT
                codigo_produto,
                descricao_produto,
                ncm,
                unidade,
                valor_unitario,
                referencia
            FROM importacao_09_2_nota_fiscal_itens 
            WHERE importacao_01_1_proforma_invoice_id = NEW.importacao_01_1_proforma_invoice_id
        LOOP
            -- Verifica se produto já existe
            SELECT id_produto INTO produto_id
            FROM prd_03_produtos 
            WHERE codigo_produto = item.codigo_produto
               OR referencia_importacao = item.referencia;
            
            -- Se não existe, cria o produto
            IF produto_id IS NULL THEN
                INSERT INTO prd_03_produtos (
                    codigo_produto,
                    descricao,
                    ncm,
                    unidade_medida,
                    preco_custo,
                    referencia_importacao,
                    origem_dados,
                    id_importacao_origem,
                    ativo,
                    created_at
                ) VALUES (
                    item.codigo_produto,
                    item.descricao_produto,
                    item.ncm,
                    item.unidade,
                    item.valor_unitario,
                    item.referencia,
                    'IMPORTACAO',
                    NEW.importacao_01_1_proforma_invoice_id,
                    TRUE,
                    NOW()
                ) RETURNING id_produto INTO produto_id;
                
                -- Log da criação
                INSERT INTO log_integracao_erp (
                    tabela_origem,
                    id_origem,
                    tabela_destino,
                    id_destino,
                    acao,
                    observacoes,
                    created_at
                ) VALUES (
                    'importacao_09_1_nota_fiscal',
                    NEW.id,
                    'prd_03_produtos',
                    produto_id,
                    'PRODUTO_CRIADO_AUTOMATICAMENTE',
                    'Produto criado após liberação alfandegária',
                    NOW()
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trg_criar_produtos_pos_liberacao
    AFTER UPDATE ON importacao_09_1_nota_fiscal
    FOR EACH ROW
    EXECUTE FUNCTION fn_criar_produtos_pos_liberacao();
```

### 2. **Entrada Automática em Estoque**

#### **Trigger Point**: Após criação de produto via importação

```sql
-- Trigger para entrada automática em estoque
CREATE OR REPLACE FUNCTION fn_entrada_estoque_importacao()
RETURNS TRIGGER AS $$
DECLARE
    saldo_atual NUMERIC(15,3) := 0;
    item RECORD;
BEGIN
    -- Só executa se produto foi criado via importação
    IF NEW.origem_dados = 'IMPORTACAO' THEN
        
        -- Para cada item da importação, cria entrada de estoque
        FOR item IN 
            SELECT 
                nfi.quantidade,
                nfi.codigo_produto,
                nfi.valor_unitario
            FROM importacao_09_2_nota_fiscal_itens nfi
            JOIN importacao_09_1_nota_fiscal nf ON nf.importacao_01_1_proforma_invoice_id = nfi.importacao_01_1_proforma_invoice_id
            WHERE nfi.codigo_produto = NEW.codigo_produto
              AND nf.importacao_01_1_proforma_invoice_id = NEW.id_importacao_origem
        LOOP
            -- Busca saldo atual
            SELECT COALESCE(saldo_atual, 0) INTO saldo_atual
            FROM est_03_saldos_estoque 
            WHERE id_produto = NEW.id_produto
              AND id_deposito = 1; -- Depósito padrão de importação
            
            -- Cria movimentação de entrada
            INSERT INTO est_04_movimentacoes (
                id_produto,
                id_deposito,
                id_tipo_movimento,
                quantidade,
                saldo_anterior,
                saldo_atual,
                preco_unitario,
                valor_total,
                documento,
                observacoes,
                data_movimento,
                created_at
            ) VALUES (
                NEW.id_produto,
                1, -- Depósito importação
                1, -- Tipo: Entrada por importação
                item.quantidade,
                saldo_atual,
                saldo_atual + item.quantidade,
                item.valor_unitario,
                item.quantidade * item.valor_unitario,
                'IMP-' || NEW.id_importacao_origem,
                'Entrada automática via importação',
                CURRENT_DATE,
                NOW()
            );
            
            -- Atualiza saldo
            INSERT INTO est_03_saldos_estoque (
                id_produto,
                id_deposito,
                saldo_atual,
                custo_medio,
                updated_at
            ) VALUES (
                NEW.id_produto,
                1,
                saldo_atual + item.quantidade,
                item.valor_unitario,
                NOW()
            ) ON CONFLICT (id_produto, id_deposito) 
            DO UPDATE SET
                saldo_atual = saldo_atual + item.quantidade,
                custo_medio = item.valor_unitario,
                updated_at = NOW();
                
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trg_entrada_estoque_importacao
    AFTER INSERT ON prd_03_produtos
    FOR EACH ROW
    EXECUTE FUNCTION fn_entrada_estoque_importacao();
```

### 3. **Sincronização de Custos**

#### **View**: Custo Total de Importação por Produto

```sql
-- View consolidada de custos de importação
CREATE VIEW vw_custos_importacao_produto AS
SELECT 
    p.id_produto,
    p.codigo_produto,
    p.descricao,
    pi.invoice_number,
    pi.id as id_importacao,
    
    -- Custos base da mercadoria
    ci.valor_total_fob as custo_fob,
    ci.valor_frete as custo_frete,
    ci.valor_seguro as custo_seguro,
    ci.valor_total_cif as custo_cif,
    
    -- Tributos da DI
    (SELECT SUM(dt.valor_devido) 
     FROM importacao_08_3_di_tributos_por_adicao dt 
     WHERE dt.importacao_01_1_proforma_invoice_id = pi.id) as total_tributos,
    
    -- Custos nacionais (despachante, armazenagem, etc)
    nf.valor_outras_despesas as custos_nacionais,
    
    -- Custo total calculado
    (ci.valor_total_cif + 
     COALESCE((SELECT SUM(dt.valor_devido) 
               FROM importacao_08_3_di_tributos_por_adicao dt 
               WHERE dt.importacao_01_1_proforma_invoice_id = pi.id), 0) +
     COALESCE(nf.valor_outras_despesas, 0)) as custo_total_importacao,
    
    -- Quantidade importada
    (SELECT SUM(nfi.quantidade) 
     FROM importacao_09_2_nota_fiscal_itens nfi 
     WHERE nfi.importacao_01_1_proforma_invoice_id = pi.id
       AND nfi.codigo_produto = p.codigo_produto) as quantidade_importada,
    
    -- Custo unitário final
    ROUND(
        (ci.valor_total_cif + 
         COALESCE((SELECT SUM(dt.valor_devido) 
                   FROM importacao_08_3_di_tributos_por_adicao dt 
                   WHERE dt.importacao_01_1_proforma_invoice_id = pi.id), 0) +
         COALESCE(nf.valor_outras_despesas, 0)) / 
        NULLIF((SELECT SUM(nfi.quantidade) 
                FROM importacao_09_2_nota_fiscal_itens nfi 
                WHERE nfi.importacao_01_1_proforma_invoice_id = pi.id
                  AND nfi.codigo_produto = p.codigo_produto), 0), 4
    ) as custo_unitario_final,
    
    pi.created_at as data_importacao

FROM prd_03_produtos p
JOIN importacao_01_1_proforma_invoice pi ON pi.id = p.id_importacao_origem
LEFT JOIN importacao_05_1_commercial_invoice ci ON ci.importacao_01_1_proforma_invoice_id = pi.id
LEFT JOIN importacao_09_1_nota_fiscal nf ON nf.importacao_01_1_proforma_invoice_id = pi.id
WHERE p.origem_dados = 'IMPORTACAO'
ORDER BY pi.created_at DESC;
```

---

## 📊 Dashboard de Integração

### **View**: Status Geral das Importações

```sql
CREATE VIEW vw_dashboard_importacao_erp AS
SELECT 
    pi.id as id_importacao,
    pi.invoice_number,
    pi.nome_exportador as fornecedor,
    pi.valor_total as valor_proforma,
    pi.data as data_proforma,
    
    -- Status dos documentos
    CASE WHEN comp.id IS NOT NULL THEN '✅' ELSE '❌' END as pagamento_cambio,
    CASE WHEN cont.id IS NOT NULL THEN '✅' ELSE '❌' END as contrato_cambio,
    CASE WHEN swift.id IS NOT NULL THEN '✅' ELSE '❌' END as swift,
    CASE WHEN ci.id IS NOT NULL THEN '✅' ELSE '❌' END as commercial_invoice,
    CASE WHEN pl.id IS NOT NULL THEN '✅' ELSE '❌' END as packing_list,
    CASE WHEN bl.id IS NOT NULL THEN '✅' ELSE '❌' END as bill_lading,
    CASE WHEN di.id IS NOT NULL THEN '✅' ELSE '❌' END as declaracao_importacao,
    CASE WHEN nf.id IS NOT NULL THEN '✅' ELSE '❌' END as nota_fiscal,
    CASE WHEN fech.id IS NOT NULL THEN '✅' ELSE '❌' END as fechamento,
    
    -- Status de integração ERP
    (SELECT COUNT(*) 
     FROM prd_03_produtos p 
     WHERE p.id_importacao_origem = pi.id) as produtos_criados,
     
    (SELECT SUM(se.saldo_atual) 
     FROM est_03_saldos_estoque se
     JOIN prd_03_produtos p ON p.id_produto = se.id_produto
     WHERE p.id_importacao_origem = pi.id) as saldo_estoque_atual,
    
    -- Status geral
    CASE 
        WHEN fech.id IS NOT NULL AND 
             (SELECT COUNT(*) FROM prd_03_produtos p WHERE p.id_importacao_origem = pi.id) > 0
        THEN 'INTEGRADO_COMPLETO'
        WHEN nf.id IS NOT NULL THEN 'AGUARDANDO_LIBERACAO'
        WHEN di.id IS NOT NULL THEN 'EM_DESEMBARACO'
        WHEN bl.id IS NOT NULL THEN 'EM_TRANSITO'
        WHEN ci.id IS NOT NULL THEN 'EMBARCADO'
        WHEN swift.id IS NOT NULL THEN 'PAGO'
        ELSE 'EM_NEGOCIACAO'
    END as status_processo

FROM importacao_01_1_proforma_invoice pi
LEFT JOIN importacao_02_1_comprovante_pagamento_cambio comp ON comp.importacao_01_1_proforma_invoice_id = pi.id
LEFT JOIN importacao_03_1_contrato_de_cambio cont ON cont.importacao_01_1_proforma_invoice_id = pi.id
LEFT JOIN importacao_04_1_swift swift ON swift.importacao_01_1_proforma_invoice_id = pi.id
LEFT JOIN importacao_05_1_commercial_invoice ci ON ci.importacao_01_1_proforma_invoice_id = pi.id
LEFT JOIN importacao_06_1_packing_list pl ON pl.importacao_01_1_proforma_invoice_id = pi.id
LEFT JOIN importacao_07_1_bill_of_lading bl ON bl.importacao_01_1_proforma_invoice_id = pi.id
LEFT JOIN importacao_08_1_di_declaracao_importacao di ON di.importacao_01_1_proforma_invoice_id = pi.id
LEFT JOIN importacao_09_1_nota_fiscal nf ON nf.importacao_01_1_proforma_invoice_id = pi.id
LEFT JOIN importacao_10_1_fechamento fech ON fech.importacao_01_1_proforma_invoice_id = pi.id
ORDER BY pi.created_at DESC;
```

---

## 🔍 Tabelas de Controle e Log

### **Tabela**: Log de Integração

```sql
-- Tabela para rastrear todas as integrações entre sistemas
CREATE TABLE log_integracao_erp (
    id                  SERIAL PRIMARY KEY,
    tabela_origem       VARCHAR(50) NOT NULL,
    id_origem           INTEGER NOT NULL,
    tabela_destino      VARCHAR(50) NOT NULL,
    id_destino          INTEGER,
    acao                VARCHAR(50) NOT NULL, -- CRIADO, ATUALIZADO, ERRO, etc
    observacoes         TEXT,
    dados_antes         JSONB,
    dados_depois        JSONB,
    erro_msg            TEXT,
    usuario_sistema     VARCHAR(50) DEFAULT 'SISTEMA',
    created_at          TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_log_integracao_origem ON log_integracao_erp(tabela_origem, id_origem);
CREATE INDEX idx_log_integracao_destino ON log_integracao_erp(tabela_destino, id_destino);
CREATE INDEX idx_log_integracao_acao ON log_integracao_erp(acao);
CREATE INDEX idx_log_integracao_data ON log_integracao_erp(created_at);
```

### **Tabela**: Mapeamento Importação ↔ ERP

```sql
-- Tabela para manter mapeamento entre importação e ERP
CREATE TABLE map_importacao_erp (
    id                          SERIAL PRIMARY KEY,
    importacao_proforma_id      INTEGER NOT NULL REFERENCES importacao_01_1_proforma_invoice(id) ON DELETE CASCADE,
    produto_erp_id              INTEGER REFERENCES prd_03_produtos(id_produto) ON DELETE SET NULL,
    ordem_producao_id           INTEGER REFERENCES pro_05_ordens_producao(id_ordem_producao) ON DELETE SET NULL,
    venda_id                    INTEGER REFERENCES vnd_05_vendas(id_venda) ON DELETE SET NULL,
    cliente_id                  INTEGER REFERENCES cad_03_clientes(id_cliente) ON DELETE SET NULL,
    status_integracao           VARCHAR(30) DEFAULT 'PENDENTE',
    observacoes_integracao      TEXT,
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_map_importacao_proforma ON map_importacao_erp(importacao_proforma_id);
CREATE INDEX idx_map_importacao_produto ON map_importacao_erp(produto_erp_id);
CREATE INDEX idx_map_importacao_status ON map_importacao_erp(status_integracao);
```

---

## ⚙️ Funções Utilitárias

### 1. **Sincronização Manual**

```sql
-- Função para sincronizar uma importação específica com o ERP
CREATE OR REPLACE FUNCTION fn_sincronizar_importacao_erp(p_importacao_id INTEGER)
RETURNS TEXT AS $$
DECLARE
    resultado TEXT := '';
    produtos_criados INTEGER := 0;
    erro_msg TEXT;
BEGIN
    BEGIN
        -- Executa criação de produtos se nota fiscal existe e foi liberada
        SELECT fn_criar_produtos_pos_liberacao() INTO resultado;
        
        -- Conta produtos criados
        SELECT COUNT(*) INTO produtos_criados
        FROM prd_03_produtos 
        WHERE id_importacao_origem = p_importacao_id;
        
        -- Atualiza mapeamento
        INSERT INTO map_importacao_erp (
            importacao_proforma_id,
            status_integracao,
            observacoes_integracao
        ) VALUES (
            p_importacao_id,
            CASE WHEN produtos_criados > 0 THEN 'SINCRONIZADO' ELSE 'PENDENTE' END,
            'Sincronização manual - ' || produtos_criados || ' produtos criados'
        ) ON CONFLICT (importacao_proforma_id) 
        DO UPDATE SET
            status_integracao = CASE WHEN produtos_criados > 0 THEN 'SINCRONIZADO' ELSE 'PENDENTE' END,
            observacoes_integracao = 'Sincronização manual - ' || produtos_criados || ' produtos criados',
            updated_at = NOW();
        
        RETURN 'Sucesso: ' || produtos_criados || ' produtos processados';
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS erro_msg = MESSAGE_TEXT;
        
        -- Log do erro
        INSERT INTO log_integracao_erp (
            tabela_origem,
            id_origem,
            tabela_destino,
            acao,
            erro_msg,
            observacoes
        ) VALUES (
            'importacao_01_1_proforma_invoice',
            p_importacao_id,
            'prd_03_produtos',
            'ERRO_SINCRONIZACAO',
            erro_msg,
            'Erro na sincronização manual'
        );
        
        RETURN 'Erro: ' || erro_msg;
    END;
END;
$$ LANGUAGE plpgsql;
```

### 2. **Validação de Integridade**

```sql
-- Função para validar integridade entre importação e ERP
CREATE OR REPLACE FUNCTION fn_validar_integridade_importacao_erp()
RETURNS TABLE(
    importacao_id INTEGER,
    invoice_number TEXT,
    problema TEXT,
    solucao_sugerida TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Importações sem produtos criados (mas com NF liberada)
    SELECT 
        pi.id::INTEGER,
        pi.invoice_number::TEXT,
        'Nota fiscal liberada mas produtos não criados no ERP'::TEXT,
        'Executar: SELECT fn_sincronizar_importacao_erp(' || pi.id || ');'::TEXT
    FROM importacao_01_1_proforma_invoice pi
    JOIN importacao_09_1_nota_fiscal nf ON nf.importacao_01_1_proforma_invoice_id = pi.id
    WHERE nf.observacoes ILIKE '%liberado%'
      AND NOT EXISTS (
          SELECT 1 FROM prd_03_produtos p 
          WHERE p.id_importacao_origem = pi.id
      )
    
    UNION ALL
    
    -- Produtos sem entrada de estoque
    SELECT 
        p.id_importacao_origem::INTEGER,
        pi.invoice_number::TEXT,
        'Produto criado mas sem entrada de estoque'::TEXT,
        'Verificar trigger de entrada automática'::TEXT
    FROM prd_03_produtos p
    JOIN importacao_01_1_proforma_invoice pi ON pi.id = p.id_importacao_origem
    WHERE p.origem_dados = 'IMPORTACAO'
      AND NOT EXISTS (
          SELECT 1 FROM est_04_movimentacoes em 
          WHERE em.id_produto = p.id_produto 
            AND em.documento LIKE 'IMP-%'
      )
    
    UNION ALL
    
    -- Divergências de custo
    SELECT 
        p.id_importacao_origem::INTEGER,
        pi.invoice_number::TEXT,
        'Divergência entre custo ERP e custo calculado importação'::TEXT,
        'Revisar cálculo de custos de importação'::TEXT
    FROM prd_03_produtos p
    JOIN importacao_01_1_proforma_invoice pi ON pi.id = p.id_importacao_origem
    JOIN vw_custos_importacao_produto vci ON vci.id_produto = p.id_produto
    WHERE p.origem_dados = 'IMPORTACAO'
      AND ABS(p.preco_custo - vci.custo_unitario_final) > 0.01;
      
END;
$$ LANGUAGE plpgsql;
```

---

## 🚨 Monitoramento e Alertas

### **View**: Alertas de Integração

```sql
CREATE VIEW vw_alertas_integracao AS
SELECT 
    'PRODUTO_NAO_CRIADO' as tipo_alerta,
    'Importação com NF liberada mas produto não criado no ERP' as descricao,
    pi.id as id_importacao,
    pi.invoice_number,
    nf.data_entrada as data_evento,
    'CRITICO' as severidade
FROM importacao_01_1_proforma_invoice pi
JOIN importacao_09_1_nota_fiscal nf ON nf.importacao_01_1_proforma_invoice_id = pi.id
WHERE nf.observacoes ILIKE '%liberado%'
  AND NOT EXISTS (SELECT 1 FROM prd_03_produtos p WHERE p.id_importacao_origem = pi.id)
  AND nf.data_entrada < CURRENT_DATE - INTERVAL '2 days'

UNION ALL

SELECT 
    'ESTOQUE_NAO_ATUALIZADO' as tipo_alerta,
    'Produto criado mas sem movimentação de estoque' as descricao,
    p.id_importacao_origem,
    pi.invoice_number,
    p.created_at as data_evento,
    'ALTO' as severidade
FROM prd_03_produtos p
JOIN importacao_01_1_proforma_invoice pi ON pi.id = p.id_importacao_origem
WHERE p.origem_dados = 'IMPORTACAO'
  AND NOT EXISTS (SELECT 1 FROM est_04_movimentacoes em WHERE em.id_produto = p.id_produto)
  AND p.created_at < NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
    'CUSTO_DIVERGENTE' as tipo_alerta,
    'Divergência entre custo ERP e importação superior a R$ 10,00' as descricao,
    p.id_importacao_origem,
    pi.invoice_number,
    p.updated_at as data_evento,
    'MEDIO' as severidade
FROM prd_03_produtos p
JOIN importacao_01_1_proforma_invoice pi ON pi.id = p.id_importacao_origem
JOIN vw_custos_importacao_produto vci ON vci.id_produto = p.id_produto
WHERE p.origem_dados = 'IMPORTACAO'
  AND ABS(p.preco_custo - vci.custo_unitario_final) > 10.00;
```

---

## 📋 Checklist de Implementação

### **Fase 1: Preparação** ✅
- [x] Backup completo das tabelas importacao_
- [x] Backup do blueprint Make.com
- [x] Ambiente de teste configurado

### **Fase 2: Estrutura Base** 🔄
- [ ] Criar tabelas de log e mapeamento
- [ ] Implementar views de integração
- [ ] Configurar triggers automáticos

### **Fase 3: Testes** ⏳
- [ ] Testar criação automática de produtos
- [ ] Validar entrada de estoque
- [ ] Verificar cálculo de custos

### **Fase 4: Monitoramento** ⏳
- [ ] Implementar sistema de alertas
- [ ] Configurar dashboard de status
- [ ] Documentar procedimentos de erro

### **Fase 5: Validação Final** ⏳
- [ ] Executar função de validação completa
- [ ] Testar blueprint Make.com
- [ ] Confirmar integridade dos dados

---

## 🔧 Comandos de Manutenção

### **Verificação Diária**
```sql
-- Executar todo dia às 8h
SELECT * FROM vw_alertas_integracao WHERE severidade IN ('CRITICO', 'ALTO');
```

### **Sincronização Manual**
```sql
-- Para ressincronizar uma importação específica
SELECT fn_sincronizar_importacao_erp(123); -- ID da importação
```

### **Relatório de Integridade**
```sql
-- Relatório completo de problemas
SELECT * FROM fn_validar_integridade_importacao_erp();
```

---

## ⚡ Performance e Otimização

### **Índices Críticos**
```sql
-- Otimização de consultas de integração
CREATE INDEX CONCURRENTLY idx_produtos_origem_importacao 
ON prd_03_produtos(origem_dados, id_importacao_origem) 
WHERE origem_dados = 'IMPORTACAO';

CREATE INDEX CONCURRENTLY idx_nota_fiscal_observacoes 
ON importacao_09_1_nota_fiscal USING gin(to_tsvector('portuguese', observacoes));

CREATE INDEX CONCURRENTLY idx_movimentacoes_documento_imp 
ON est_04_movimentacoes(documento) 
WHERE documento LIKE 'IMP-%';
```

### **Particionamento** (Para alto volume)
```sql
-- Se necessário, particionar tabela de log por mês
CREATE TABLE log_integracao_erp_y2025m01 PARTITION OF log_integracao_erp
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

---

*Documento de Integração Técnica*  
*Versão: 1.0*  
*Data: 2025-07-05*  
*Projeto: ERP Integrado NXT Indústria e Comércio Ltda*