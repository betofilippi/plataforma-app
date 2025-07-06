-- =====================================================================================
-- SCRIPT DE INICIALIZAÇÃO DO BANCO DE DADOS - ERP NXT PLATAFORMA.APP
-- =====================================================================================

-- Criar usuário da aplicação se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nxt_user') THEN
        CREATE USER nxt_user WITH PASSWORD 'nxt_password';
    END IF;
END
$$;

-- Criar banco de desenvolvimento se não existir
SELECT 'CREATE DATABASE erp_nxt_dev OWNER nxt_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'erp_nxt_dev')\gexec

-- Criar banco de teste se não existir
SELECT 'CREATE DATABASE erp_nxt_test OWNER nxt_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'erp_nxt_test')\gexec

-- Conectar ao banco de desenvolvimento
\c erp_nxt_dev;

-- Conceder privilégios ao usuário da aplicação
GRANT ALL PRIVILEGES ON DATABASE erp_nxt_dev TO nxt_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO nxt_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO nxt_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO nxt_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO nxt_user;

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Criar schema de logs para implementação
CREATE SCHEMA IF NOT EXISTS logs;
GRANT ALL PRIVILEGES ON SCHEMA logs TO nxt_user;

-- Tabela para acompanhar progresso da implementação
CREATE TABLE IF NOT EXISTS logs.log_implementacao (
    id SERIAL PRIMARY KEY,
    fase VARCHAR(50) NOT NULL,
    etapa VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_PROGRESSO', 'CONCLUIDO', 'ERRO')),
    data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP,
    observacoes TEXT,
    responsavel VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir log inicial
INSERT INTO logs.log_implementacao (fase, etapa, status, observacoes, responsavel) 
VALUES ('FASE_1', 'INICIALIZACAO_BANCO', 'CONCLUIDO', 'Banco de dados inicializado com sucesso', 'SISTEMA_DOCKER');

-- Configurações adicionais
ALTER DATABASE erp_nxt_dev SET timezone TO 'America/Sao_Paulo';

-- Conectar ao banco de teste e aplicar as mesmas configurações
\c erp_nxt_test;

GRANT ALL PRIVILEGES ON DATABASE erp_nxt_test TO nxt_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO nxt_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO nxt_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO nxt_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO nxt_user;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS logs;
GRANT ALL PRIVILEGES ON SCHEMA logs TO nxt_user;

CREATE TABLE IF NOT EXISTS logs.log_implementacao (
    id SERIAL PRIMARY KEY,
    fase VARCHAR(50) NOT NULL,
    etapa VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_PROGRESSO', 'CONCLUIDO', 'ERRO')),
    data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP,
    observacoes TEXT,
    responsavel VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER DATABASE erp_nxt_test SET timezone TO 'America/Sao_Paulo';

-- Fim da inicialização
\echo 'Banco de dados inicializado com sucesso!'