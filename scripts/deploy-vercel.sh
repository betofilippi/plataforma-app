#!/bin/bash

# =====================================================================================
# SCRIPT DE DEPLOY AUTOMÁTICO - VERCEL PLATAFORMA.APP
# =====================================================================================

set -e

echo "🚀 Iniciando deploy na Vercel..."

# Navegar para o diretório raiz do projeto
cd "$(dirname "$0")/.."

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: package.json não encontrado. Execute este script a partir do diretório raiz do projeto."
    exit 1
fi

echo "📦 Instalando dependências..."
npm install

echo "🏗️ Fazendo build do projeto..."
npm run build:all

echo "🔧 Verificando configuração Vercel..."
if [ ! -f "vercel.json" ]; then
    echo "❌ Erro: vercel.json não encontrado."
    exit 1
fi

echo "🌐 Fazendo deploy para Vercel..."

# Deploy de produção para plataforma.app
vercel --prod --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" 

echo "✅ Deploy concluído!"
echo "🌐 URL: https://plataforma.app"

# Verificar se o deploy foi bem-sucedido
echo "🔍 Verificando saúde da aplicação..."
sleep 30

# Test API health
if curl -f https://plataforma.app/api/health > /dev/null 2>&1; then
    echo "✅ API funcionando corretamente"
else
    echo "⚠️  API pode não estar respondendo ainda"
fi

# Test frontend
if curl -f https://plataforma.app > /dev/null 2>&1; then
    echo "✅ Frontend funcionando corretamente"
else
    echo "⚠️  Frontend pode não estar respondendo ainda"
fi

echo "🎉 Deploy concluído com sucesso!"