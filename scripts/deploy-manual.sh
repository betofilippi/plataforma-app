#!/bin/bash

# =====================================================================================
# DEPLOY MANUAL - INSTRUÇÕES PARA VERCEL PLATAFORMA.APP
# =====================================================================================

echo "🚀 Instruções para Deploy Manual na Vercel"
echo "=========================================="
echo ""

echo "1️⃣ PRIMEIRO PASSO - Login na Vercel:"
echo "   vercel login"
echo ""

echo "2️⃣ SEGUNDO PASSO - Configurar projeto:"
echo "   cd /mnt/c/Users/Beto/Desktop/dev/plataforma.app"
echo "   vercel"
echo ""
echo "   Responder às perguntas:"
echo "   ? Set up and deploy? [Y/n] Y"
echo "   ? Which scope? Selecione sua organização"
echo "   ? Link to existing project? [y/N] N"
echo "   ? What's your project's name? plataforma-app"
echo "   ? In which directory is your code located? ./"
echo ""

echo "3️⃣ TERCEIRO PASSO - Configurar domínio:"
echo "   vercel domains add plataforma.app"
echo "   vercel alias set [deployment-url] plataforma.app"
echo ""

echo "4️⃣ QUARTO PASSO - Variáveis de ambiente:"
echo "   Configurar no painel da Vercel ou via CLI:"
echo ""
echo "   # Database"
echo "   vercel env add DATABASE_URL"
echo "   vercel env add REDIS_URL"
echo ""
echo "   # JWT"
echo "   vercel env add JWT_SECRET"
echo "   vercel env add JWT_REFRESH_SECRET"
echo ""
echo "   # Supabase"
echo "   vercel env add SUPABASE_URL"
echo "   vercel env add SUPABASE_SERVICE_ROLE_KEY"
echo ""

echo "5️⃣ QUINTO PASSO - Deploy final:"
echo "   vercel --prod"
echo ""

echo "📋 CHECKLIST PRÉ-DEPLOY:"
echo "========================"
echo "□ Login na Vercel feito"
echo "□ Projeto configurado"
echo "□ Domínio plataforma.app configurado"
echo "□ Variáveis de ambiente configuradas"
echo "□ Build local funcionando (npm run build:all)"
echo "□ Testes passando (npm test)"
echo ""

echo "🔗 LINKS ÚTEIS:"
echo "==============="
echo "Painel Vercel: https://vercel.com/dashboard"
echo "Documentação: https://vercel.com/docs"
echo "CLI Reference: https://vercel.com/docs/cli"
echo ""

echo "⚡ DEPLOY RÁPIDO (se já configurado):"
echo "====================================="
echo "cd /mnt/c/Users/Beto/Desktop/dev/plataforma.app && vercel --prod"