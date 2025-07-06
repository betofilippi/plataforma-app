# =====================================================================================
# MAKEFILE - ERP NXT PLATAFORMA.APP
# =====================================================================================

.PHONY: help setup dev prod test clean logs db-* docker-*

# Cores para output
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
BLUE=\033[0;34m
NC=\033[0m # No Color

help: ## Mostra ajuda dos comandos disponíveis
	@echo "$(BLUE)ERP NXT - Plataforma.app$(NC)"
	@echo "$(YELLOW)Comandos disponíveis:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# =====================================================================================
# SETUP E CONFIGURAÇÃO INICIAL
# =====================================================================================

setup: ## Configuração inicial completa do projeto
	@echo "$(BLUE)🚀 Configurando ambiente de desenvolvimento...$(NC)"
	@cp -n .env.example .env || true
	@docker-compose build
	@make db-setup
	@echo "$(GREEN)✅ Ambiente configurado com sucesso!$(NC)"

install: ## Instala dependências do backend
	@echo "$(BLUE)📦 Instalando dependências...$(NC)"
	@cd backend && npm install
	@echo "$(GREEN)✅ Dependências instaladas!$(NC)"

# =====================================================================================
# DESENVOLVIMENTO
# =====================================================================================

dev: ## Inicia ambiente de desenvolvimento completo
	@echo "$(BLUE)🚀 Iniciando ambiente de desenvolvimento...$(NC)"
	@docker-compose --profile development up -d
	@echo "$(GREEN)✅ Ambiente rodando!$(NC)"
	@echo "$(YELLOW)📍 URLs disponíveis:$(NC)"
	@echo "  - Backend: http://localhost:3001"
	@echo "  - Frontend: http://localhost:3000"
	@echo "  - PgAdmin: http://localhost:5050"
	@echo "  - Redis Commander: http://localhost:8081"

dev-backend: ## Inicia apenas o backend em modo desenvolvimento
	@echo "$(BLUE)🔧 Iniciando backend...$(NC)"
	@cd backend && npm run dev

dev-logs: ## Mostra logs do ambiente de desenvolvimento
	@docker-compose --profile development logs -f

stop: ## Para todos os serviços
	@echo "$(YELLOW)🛑 Parando serviços...$(NC)"
	@docker-compose down
	@echo "$(GREEN)✅ Serviços parados!$(NC)"

restart: ## Reinicia todos os serviços
	@make stop
	@make dev

# =====================================================================================
# PRODUÇÃO
# =====================================================================================

prod: ## Inicia ambiente de produção
	@echo "$(BLUE)🚀 Iniciando ambiente de produção...$(NC)"
	@docker-compose up -d
	@echo "$(GREEN)✅ Produção rodando!$(NC)"

prod-logs: ## Mostra logs de produção
	@docker-compose logs -f

# =====================================================================================
# BANCO DE DADOS
# =====================================================================================

db-setup: ## Configuração inicial do banco de dados
	@echo "$(BLUE)🗄️  Configurando banco de dados...$(NC)"
	@docker-compose up -d database redis
	@sleep 5
	@cd backend && npm run db:migrate
	@cd backend && npm run db:seed
	@echo "$(GREEN)✅ Banco configurado!$(NC)"

db-migrate: ## Executa migrações
	@echo "$(BLUE)📊 Executando migrações...$(NC)"
	@cd backend && npm run db:migrate
	@echo "$(GREEN)✅ Migrações executadas!$(NC)"

db-seed: ## Executa seeds
	@echo "$(BLUE)🌱 Executando seeds...$(NC)"
	@cd backend && npm run db:seed
	@echo "$(GREEN)✅ Seeds executados!$(NC)"

db-reset: ## Reseta o banco (cuidado!)
	@echo "$(RED)⚠️  ATENÇÃO: Isso apagará todos os dados!$(NC)"
	@read -p "Tem certeza? (s/N): " confirm && [ "$$confirm" = "s" ] || exit 1
	@cd backend && npm run db:reset
	@echo "$(GREEN)✅ Banco resetado!$(NC)"

db-backup: ## Cria backup do banco
	@echo "$(BLUE)💾 Criando backup...$(NC)"
	@docker exec nxt-erp-database pg_dump -U nxt_user erp_nxt_dev > database/backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Backup criado!$(NC)"

db-console: ## Acessa console do PostgreSQL
	@docker exec -it nxt-erp-database psql -U nxt_user -d erp_nxt_dev

# =====================================================================================
# DOCKER
# =====================================================================================

docker-build: ## Reconstrói todas as imagens Docker
	@echo "$(BLUE)🐳 Reconstruindo imagens...$(NC)"
	@docker-compose build --no-cache
	@echo "$(GREEN)✅ Imagens reconstruídas!$(NC)"

docker-clean: ## Remove containers, volumes e imagens não utilizados
	@echo "$(YELLOW)🧹 Limpando Docker...$(NC)"
	@docker-compose down -v
	@docker system prune -f
	@docker volume prune -f
	@echo "$(GREEN)✅ Docker limpo!$(NC)"

docker-status: ## Mostra status dos containers
	@docker-compose ps

# =====================================================================================
# LOGS E MONITORAMENTO
# =====================================================================================

logs: ## Mostra logs de todos os serviços
	@docker-compose logs -f

logs-backend: ## Mostra logs do backend
	@docker-compose logs -f backend

logs-database: ## Mostra logs do banco
	@docker-compose logs -f database

logs-clean: ## Limpa arquivos de log
	@echo "$(YELLOW)🧹 Limpando logs...$(NC)"
	@cd backend && npm run logs:clean
	@echo "$(GREEN)✅ Logs limpos!$(NC)"

# =====================================================================================
# TESTES
# =====================================================================================

test: ## Executa todos os testes
	@echo "$(BLUE)🧪 Executando testes...$(NC)"
	@cd backend && npm test
	@echo "$(GREEN)✅ Testes concluídos!$(NC)"

test-watch: ## Executa testes em modo watch
	@cd backend && npm run test:watch

test-coverage: ## Executa testes com cobertura
	@cd backend && npm run test:coverage

test-integration: ## Executa testes de integração
	@cd backend && npm run test:integrations

# =====================================================================================
# UTILITÁRIOS
# =====================================================================================

clean: ## Limpa arquivos temporários e builds
	@echo "$(YELLOW)🧹 Limpando projeto...$(NC)"
	@rm -rf backend/dist
	@rm -rf backend/node_modules/.cache
	@rm -rf logs/*.log
	@echo "$(GREEN)✅ Projeto limpo!$(NC)"

lint: ## Executa linting no código
	@echo "$(BLUE)📝 Executando linting...$(NC)"
	@cd backend && npm run lint
	@echo "$(GREEN)✅ Linting concluído!$(NC)"

format: ## Formata código
	@echo "$(BLUE)✨ Formatando código...$(NC)"
	@cd backend && npm run format
	@echo "$(GREEN)✅ Código formatado!$(NC)"

type-check: ## Verifica tipos TypeScript
	@echo "$(BLUE)🔍 Verificando tipos...$(NC)"
	@cd backend && npm run type-check
	@echo "$(GREEN)✅ Tipos verificados!$(NC)"

check: lint type-check ## Executa todas as verificações de código

update-progress: ## Atualiza documentação de progresso
	@echo "$(BLUE)📊 Atualizando progresso...$(NC)"
	@node scripts/update-progress.js
	@echo "$(GREEN)✅ Progresso atualizado!$(NC)"

# =====================================================================================
# RELEASE E DEPLOY
# =====================================================================================

release: ## Prepara release (testes + build + check)
	@echo "$(BLUE)🚀 Preparando release...$(NC)"
	@make check
	@make test
	@cd backend && npm run build
	@echo "$(GREEN)✅ Release preparado!$(NC)"

deploy-staging: ## Deploy para ambiente de staging
	@echo "$(BLUE)🚀 Deploy para staging...$(NC)"
	@make release
	@docker-compose -f docker-compose.staging.yml up -d
	@echo "$(GREEN)✅ Deploy staging concluído!$(NC)"

# =====================================================================================
# INFORMAÇÕES
# =====================================================================================

status: ## Mostra status geral do sistema
	@echo "$(BLUE)📊 Status do Sistema ERP NXT$(NC)"
	@echo "$(YELLOW)Docker:$(NC)"
	@make docker-status
	@echo "\n$(YELLOW)Banco de Dados:$(NC)"
	@docker exec nxt-erp-database pg_isready -U nxt_user -d erp_nxt_dev && echo "$(GREEN)✅ PostgreSQL: Online$(NC)" || echo "$(RED)❌ PostgreSQL: Offline$(NC)"
	@echo "\n$(YELLOW)Redis:$(NC)"
	@docker exec nxt-erp-redis redis-cli ping | grep -q PONG && echo "$(GREEN)✅ Redis: Online$(NC)" || echo "$(RED)❌ Redis: Offline$(NC)"

info: ## Mostra informações do projeto
	@echo "$(BLUE)📋 Informações do Projeto$(NC)"
	@echo "$(YELLOW)Nome:$(NC) ERP NXT - Plataforma.app"
	@echo "$(YELLOW)Versão:$(NC) 1.0.0"
	@echo "$(YELLOW)Node.js:$(NC) $(shell node --version 2>/dev/null || echo 'Não instalado')"
	@echo "$(YELLOW)Docker:$(NC) $(shell docker --version 2>/dev/null | cut -d' ' -f3 | sed 's/,//' || echo 'Não instalado')"
	@echo "$(YELLOW)Docker Compose:$(NC) $(shell docker-compose --version 2>/dev/null | cut -d' ' -f4 | sed 's/,//' || echo 'Não instalado')"