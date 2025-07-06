#!/bin/bash

# =====================================================================================
# INICIALIZAR GIT E DEPLOY VIA GITHUB - PLATAFORMA.APP
# =====================================================================================

set -e

echo "🔧 Inicializando repositório Git..."

# Navegar para o diretório raiz do projeto
cd "$(dirname "$0")/.."

# Verificar se já é um repositório git
if [ ! -d ".git" ]; then
    echo "📦 Inicializando novo repositório Git..."
    git init
    
    echo "📝 Adicionando arquivos..."
    git add .
    
    echo "💾 Primeiro commit..."
    git commit -m "feat: configuração inicial plataforma.app ERP

✨ Features implementadas:
- 18 tabelas importacao_ configuradas
- Sistema de migrações Knex.js
- Ambiente de desenvolvimento Docker
- Configuração Vercel e Render
- CI/CD GitHub Actions
- Templates GitHub profissionais

🚀 Ready for production deploy
📊 80% da Fase 1 concluída"

    echo "🌐 Configurando remote GitHub..."
    echo "Execute manualmente:"
    echo "git remote add origin https://github.com/nxt-industria/erp-system.git"
    echo "git branch -M main"
    echo "git push -u origin main"
    
else
    echo "📂 Repositório Git já existe"
    
    echo "📝 Verificando status..."
    git status
    
    echo "💾 Adicionando mudanças..."
    git add .
    
    echo "📝 Commit das atualizações..."
    git commit -m "feat: deploy configuration complete

🚀 Deploy ready for plataforma.app:
- Vercel configuration (vercel.json)
- Render.com configuration (render.yaml)
- Production environment variables
- GitHub Actions CI/CD
- Deploy documentation and scripts

Status: 80% Phase 1 complete, ready for production deploy"

    echo "🚀 Push para repositório..."
    git push origin main
fi

echo ""
echo "🎯 PRÓXIMOS PASSOS PARA DEPLOY:"
echo "================================"
echo ""
echo "1. GitHub Repository Setup:"
echo "   - Criar repositório em: https://github.com/nxt-industria/erp-system"
echo "   - Configurar secrets necessários"
echo ""
echo "2. Vercel Integration:"
echo "   - Conectar repositório na Vercel"
echo "   - Configurar domínio plataforma.app"
echo "   - Deploy automático será ativado"
echo ""
echo "3. Variáveis de Ambiente:"
echo "   - DATABASE_URL (Supabase ou PostgreSQL)"
echo "   - REDIS_URL (Upstash ou Redis)"
echo "   - JWT_SECRET"
echo "   - SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "✅ Repositório preparado para deploy!"