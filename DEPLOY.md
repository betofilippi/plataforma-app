# 🚀 Deploy Guide - Plataforma.app

Este guia detalha como configurar e executar deploy do ERP Plataforma.app em produção.

## 🏗️ Opções de Deploy

### 1. Vercel (Recomendado - Frontend + API)
- **Frontend**: Next.js com SSG/ISR
- **Backend**: Serverless Functions  
- **URL**: https://plataforma.app
- **Vantagens**: Deploy automático, CDN global, SSL gratuito

### 2. Render.com (Alternativo - Full Stack)
- **Backend**: Container Node.js
- **Frontend**: Static Site
- **Database**: PostgreSQL gerenciado
- **Vantagens**: Servidor dedicado, melhor para workloads intensivos

---

## 🔧 Configuração Vercel

### 1. Setup Inicial
```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Configurar projeto
vercel
```

### 2. Variáveis de Ambiente
Configure no painel Vercel ou via CLI:

```bash
# Database
vercel env add DATABASE_URL
vercel env add REDIS_URL

# JWT
vercel env add JWT_SECRET
vercel env add JWT_REFRESH_SECRET

# Supabase
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Integrações (será configurado após setup)
vercel env add ML_CLIENT_SECRET
vercel env add INSTAGRAM_APP_SECRET
vercel env add BLING_CLIENT_SECRET
vercel env add ZAPI_TOKEN
vercel env add MAKE_API_TOKEN
```

### 3. Deploy Manual
```bash
# Deploy preview
vercel

# Deploy produção
vercel --prod
```

### 4. CI/CD Automático
O GitHub Actions está configurado para deploy automático:
- **Push na main**: Deploy produção
- **Pull Request**: Deploy preview

---

## 🐳 Configuração Render.com

### 1. Setup do Serviço Web
1. Conectar repositório GitHub
2. Configurar build:
   - **Build Command**: `npm run build:all`
   - **Start Command**: `npm start`
   - **Environment**: `Node`

### 2. Database PostgreSQL
```yaml
# Configuração automática via render.yaml
Database Name: erp_nxt_prod
User: nxt_user
Plan: Pro (4GB)
```

### 3. Redis Cache
```yaml
# Configuração automática
Plan: Pro (1GB)
Policy: allkeys-lru
```

---

## 📋 Checklist Pré-Deploy

### ✅ Código e Build
- [ ] Todos os testes passando
- [ ] Build sem erros
- [ ] Linting sem warnings
- [ ] TypeScript sem erros
- [ ] Bundle size otimizado

### ✅ Database
- [ ] Migrações aplicadas
- [ ] Seeds de produção configurados
- [ ] Backup strategy definida
- [ ] Índices otimizados
- [ ] Row Level Security configurado

### ✅ Integrações
- [ ] Credenciais de produção configuradas
- [ ] Webhooks URLs atualizadas
- [ ] Rate limits configurados
- [ ] Callbacks OAuth corretos

### ✅ Segurança
- [ ] Variáveis de ambiente seguras
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativo
- [ ] SSL/TLS configurado
- [ ] Headers de segurança

### ✅ Monitoramento
- [ ] Logs configurados
- [ ] Health checks funcionando
- [ ] Metrics coletados
- [ ] Alertas configurados

---

## 🚀 Processo de Deploy

### Deploy Vercel (Automático)
```bash
# 1. Push para main
git add .
git commit -m "feat: nova funcionalidade"
git push origin main

# 2. GitHub Actions executa:
# - Testes
# - Build
# - Deploy Vercel
# - Smoke tests
```

### Deploy Render (Manual)
```bash
# 1. Trigger via webhook
curl -X POST "$RENDER_DEPLOY_HOOK_URL"

# 2. Ou via Git push
git push origin main
```

---

## 🔍 Verificação Pós-Deploy

### 1. Health Checks
```bash
# API Health
curl https://plataforma.app/api/health

# Database Status  
curl https://plataforma.app/api/status

# Frontend
curl https://plataforma.app
```

### 2. Testes de Fumaça
```bash
# Executar teste manual das principais funções:
# - Login/logout
# - CRUD básico (cadastros)
# - Integração teste
# - Upload de arquivo
# - Geração de relatório
```

### 3. Monitoramento
- Verificar logs em tempo real
- Confirmar métricas normais
- Testar alertas críticos

---

## 🔄 Rollback

### Vercel Rollback
```bash
# Listar deployments
vercel ls

# Promover deployment anterior
vercel promote [deployment-url] --prod
```

### Render Rollback
```bash
# Via dashboard Render.com:
# 1. Ir para o serviço
# 2. Selecionar deployment anterior
# 3. Clicar em "Promote"
```

---

## 📊 Ambientes

| Ambiente | URL | Deploy | Database |
|----------|-----|--------|----------|
| **Desenvolvimento** | localhost:3000 | Manual | Local PostgreSQL |
| **Preview** | `[hash].vercel.app` | Auto (PR) | Desenvolvimento |
| **Produção** | plataforma.app | Auto (main) | Produção |

---

## 📞 Troubleshooting

### Problemas Comuns

#### Build Falha
```bash
# Verificar logs
vercel logs [deployment-url]

# Build local
npm run build:all
```

#### Database Connection Error
```bash
# Verificar string de conexão
echo $DATABASE_URL

# Testar conexão
npm run db:status
```

#### Variáveis de Ambiente
```bash
# Listar variáveis Vercel
vercel env ls

# Adicionar nova variável
vercel env add NOVA_VAR
```

### Suporte
- **GitHub Issues**: https://github.com/nxt-industria/erp-system/issues
- **Discord**: #deploy-support
- **Email**: dev@nxt.com.br

---

*Última atualização: 2025-07-06*