# Configuração de Credenciais e Integração - NXT Indústria e Comércio Ltda

## 🎯 Objetivo

Documentar de forma detalhada a configuração de todas as credenciais, endpoints e configurações técnicas necessárias para as integrações com plataformas externas (Mercado Livre, Instagram, Bling, Z-API, Make.com) e ferramentas MCP.

---

## 🔐 CONFIGURAÇÕES DE SEGURANÇA

### **Variáveis de Ambiente (.env)**

```bash
# =============================================================================
# CONFIGURAÇÕES GERAIS
# =============================================================================
NODE_ENV=production
APP_NAME="NXT ERP System"
APP_URL=https://app.nxt.com.br
API_VERSION=v1

# Base de dados principal
DATABASE_URL=postgresql://username:password@localhost:5432/nxt_erp_db
SUPABASE_URL=https://plataforma.app.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# =============================================================================
# MERCADO LIVRE INTEGRATION
# =============================================================================
ML_APP_ID=your_mercadolivre_app_id
ML_CLIENT_SECRET=your_mercadolivre_client_secret
ML_REDIRECT_URI=https://app.nxt.com.br/oauth/mercadolivre/callback
ML_ACCESS_TOKEN=your_mercadolivre_access_token
ML_REFRESH_TOKEN=your_mercadolivre_refresh_token
ML_USER_ID=your_mercadolivre_user_id
ML_SITE_ID=MLB
ML_WEBHOOK_SECRET=your_mercadolivre_webhook_secret

# Endpoints ML
ML_API_BASE_URL=https://api.mercadolibre.com
ML_AUTH_URL=https://auth.mercadolibre.com.br
ML_WEBHOOK_URL=https://app.nxt.com.br/webhooks/mercadolivre

# =============================================================================
# INSTAGRAM BUSINESS INTEGRATION
# =============================================================================
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token
INSTAGRAM_LONG_LIVED_TOKEN=your_instagram_long_lived_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id
INSTAGRAM_PAGE_ID=your_facebook_page_id
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=your_instagram_webhook_verify_token

# Endpoints Instagram
INSTAGRAM_API_BASE_URL=https://graph.facebook.com/v18.0
INSTAGRAM_WEBHOOK_URL=https://app.nxt.com.br/webhooks/instagram

# =============================================================================
# BLING ERP INTEGRATION
# =============================================================================
BLING_CLIENT_ID=your_bling_client_id
BLING_CLIENT_SECRET=your_bling_client_secret
BLING_ACCESS_TOKEN=your_bling_access_token
BLING_REFRESH_TOKEN=your_bling_refresh_token
BLING_API_KEY=your_bling_api_key

# Endpoints Bling
BLING_API_BASE_URL=https://bling.com.br/Api/v3
BLING_WEBHOOK_URL=https://app.nxt.com.br/webhooks/bling

# =============================================================================
# Z-API WHATSAPP INTEGRATION
# =============================================================================
ZAPI_INSTANCE_ID=your_zapi_instance_id
ZAPI_INSTANCE_TOKEN=your_zapi_instance_token
ZAPI_CLIENT_TOKEN=your_zapi_client_token
ZAPI_WEBHOOK_SECRET=your_zapi_webhook_secret

# Endpoints Z-API
ZAPI_API_BASE_URL=https://api.z-api.io/instances
ZAPI_WEBHOOK_URL=https://app.nxt.com.br/webhooks/zapi

# =============================================================================
# MAKE.COM AUTOMATION
# =============================================================================
MAKE_API_TOKEN=your_make_api_token
MAKE_TEAM_ID=your_make_team_id
MAKE_ORGANIZATION_ID=your_make_organization_id
MAKE_WEBHOOK_SECRET=your_make_webhook_secret

# Endpoints Make.com
MAKE_API_BASE_URL=https://eu1.make.com/api/v2
MAKE_WEBHOOK_URL=https://app.nxt.com.br/webhooks/make

# =============================================================================
# EMAIL CONFIGURATION
# =============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=suporte@nxt.com.br
SMTP_PASS=your_email_app_password
EMAIL_FROM="NXT Suporte" <suporte@nxt.com.br>

# =============================================================================
# NOTIFICATION SERVICES
# =============================================================================
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/slack/webhook

# =============================================================================
# MCP INTEGRATIONS
# =============================================================================
MCP_SERVER_URL=http://localhost:3000
MCP_AUTH_TOKEN=your_mcp_auth_token

# =============================================================================
# SECURITY & ENCRYPTION
# =============================================================================
JWT_SECRET=your_super_secret_jwt_key_32_characters_min
ENCRYPT_KEY=your_32_character_encryption_key_here
WEBHOOK_SIGNATURE_SECRET=your_webhook_signature_secret

# =============================================================================
# RATE LIMITING & CACHE
# =============================================================================
REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# =============================================================================
# MONITORING & LOGGING
# =============================================================================
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn_for_error_tracking
ANALYTICS_API_KEY=your_analytics_api_key
```

---

## 🔧 CONFIGURAÇÃO POR PLATAFORMA

### **1. Mercado Livre (ML)**

#### **Configuração OAuth**
```javascript
// config/mercadolivre.js
const mercadoLivreConfig = {
  appId: process.env.ML_APP_ID,
  clientSecret: process.env.ML_CLIENT_SECRET,
  redirectUri: process.env.ML_REDIRECT_URI,
  scopes: [
    'read',
    'write',
    'offline_access'
  ],
  endpoints: {
    auth: 'https://auth.mercadolibre.com.br/authorization',
    token: 'https://api.mercadolibre.com/oauth/token',
    api: 'https://api.mercadolibre.com'
  },
  webhook: {
    url: process.env.ML_WEBHOOK_URL,
    secret: process.env.ML_WEBHOOK_SECRET,
    events: [
      'orders',
      'questions', 
      'claims',
      'items',
      'payments'
    ]
  }
};
```

#### **Configuração Webhook ML**
```sql
-- Configuração no banco para ML
INSERT INTO whk_01_configuracao_webhooks (
    plataforma, 
    nome_plataforma, 
    endpoint_url, 
    webhook_secret,
    eventos_monitorados,
    campos_obrigatorios,
    metodo_http,
    content_type,
    retry_tentativas,
    timeout_segundos
) VALUES (
    'ML',
    'Mercado Livre',
    'https://app.nxt.com.br/webhooks/mercadolivre',
    'your_ml_webhook_secret',
    '["orders", "questions", "claims", "items", "payments"]'::jsonb,
    '["resource", "user_id", "topic", "application_id"]'::jsonb,
    'POST',
    'application/json',
    3,
    30
);
```

#### **Headers Obrigatórios ML**
```javascript
// Headers para requests ML
const mlHeaders = {
  'Authorization': `Bearer ${process.env.ML_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'NXT-ERP/1.0'
};
```

### **2. Instagram Business**

#### **Configuração OAuth Instagram**
```javascript
// config/instagram.js
const instagramConfig = {
  appId: process.env.INSTAGRAM_APP_ID,
  appSecret: process.env.INSTAGRAM_APP_SECRET,
  redirectUri: 'https://app.nxt.com.br/oauth/instagram/callback',
  scopes: [
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_comments',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement'
  ],
  endpoints: {
    auth: 'https://www.facebook.com/v18.0/dialog/oauth',
    token: 'https://graph.facebook.com/v18.0/oauth/access_token',
    api: 'https://graph.facebook.com/v18.0'
  },
  webhook: {
    url: process.env.INSTAGRAM_WEBHOOK_URL,
    verifyToken: process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN,
    fields: [
      'messages',
      'comments',
      'mentions'
    ]
  }
};
```

#### **Configuração Webhook Instagram**
```sql
INSERT INTO whk_01_configuracao_webhooks (
    plataforma,
    nome_plataforma,
    endpoint_url,
    webhook_secret,
    eventos_monitorados,
    campos_obrigatorios
) VALUES (
    'INSTAGRAM',
    'Instagram Business',
    'https://app.nxt.com.br/webhooks/instagram',
    'your_instagram_webhook_verify_token',
    '["messages", "comments", "mentions", "story_insights"]'::jsonb,
    '["object", "entry"]'::jsonb
);
```

### **3. Bling ERP**

#### **Configuração OAuth Bling**
```javascript
// config/bling.js
const blingConfig = {
  clientId: process.env.BLING_CLIENT_ID,
  clientSecret: process.env.BLING_CLIENT_SECRET,
  redirectUri: 'https://app.nxt.com.br/oauth/bling/callback',
  scopes: [
    'read',
    'write'
  ],
  endpoints: {
    auth: 'https://bling.com.br/Api/v3/oauth/authorize',
    token: 'https://bling.com.br/Api/v3/oauth/token',
    api: 'https://bling.com.br/Api/v3'
  },
  webhook: {
    url: process.env.BLING_WEBHOOK_URL,
    events: [
      'invoice.created',
      'invoice.sent', 
      'product.updated',
      'order.updated'
    ]
  }
};
```

#### **Headers Bling**
```javascript
const blingHeaders = {
  'Authorization': `Bearer ${process.env.BLING_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
```

### **4. Z-API WhatsApp**

#### **Configuração Z-API**
```javascript
// config/zapi.js
const zapiConfig = {
  instanceId: process.env.ZAPI_INSTANCE_ID,
  instanceToken: process.env.ZAPI_INSTANCE_TOKEN,
  clientToken: process.env.ZAPI_CLIENT_TOKEN,
  endpoints: {
    api: `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_INSTANCE_TOKEN}`,
    webhook: process.env.ZAPI_WEBHOOK_URL
  },
  webhook: {
    events: [
      'message.received',
      'message.sent',
      'message.read',
      'group.created'
    ]
  }
};
```

#### **Configuração Webhook Z-API**
```sql
INSERT INTO whk_01_configuracao_webhooks (
    plataforma,
    nome_plataforma, 
    endpoint_url,
    webhook_secret,
    eventos_monitorados,
    campos_obrigatorios
) VALUES (
    'ZAPI',
    'Z-API WhatsApp',
    'https://app.nxt.com.br/webhooks/zapi',
    'your_zapi_webhook_secret',
    '["message.received", "message.sent", "message.read", "group.created"]'::jsonb,
    '["phone", "message"]'::jsonb
);
```

### **5. Make.com**

#### **Configuração Make.com**
```javascript
// config/make.js
const makeConfig = {
  apiToken: process.env.MAKE_API_TOKEN,
  teamId: process.env.MAKE_TEAM_ID,
  organizationId: process.env.MAKE_ORGANIZATION_ID,
  endpoints: {
    api: 'https://eu1.make.com/api/v2',
    webhook: process.env.MAKE_WEBHOOK_URL
  },
  webhook: {
    secret: process.env.MAKE_WEBHOOK_SECRET,
    events: [
      'scenario.completed',
      'scenario.error',
      'data.processed'
    ]
  }
};
```

---

## 🔑 CONFIGURAÇÕES MCP (Model Context Protocol)

### **Configuração MCP Supabase**
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "@mcp-integrations/supabase",
        "run"
      ],
      "env": {
        "SUPABASE_URL": "https://plataforma.app.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your_service_role_key"
      }
    }
  }
}
```

### **Configuração MCP GitHub**
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": [
        "@mcp-integrations/github",
        "run"
      ],
      "env": {
        "GITHUB_TOKEN": "your_github_personal_access_token"
      }
    }
  }
}
```

### **Configuração MCP Make.com**
```json
{
  "mcpServers": {
    "make": {
      "command": "npx", 
      "args": [
        "@mcp-integrations/make",
        "run"
      ],
      "env": {
        "MAKE_API_TOKEN": "your_make_api_token",
        "MAKE_TEAM_ID": "your_team_id"
      }
    }
  }
}
```

---

## 🛡️ CONFIGURAÇÕES DE SEGURANÇA

### **Middleware de Autenticação Webhook**
```javascript
// middleware/webhookAuth.js
const crypto = require('crypto');

function validateWebhookSignature(req, res, next) {
  const platform = req.params.platform;
  const signature = req.get('X-Hub-Signature-256') || req.get('X-Signature');
  const payload = JSON.stringify(req.body);
  
  let secret;
  switch(platform) {
    case 'mercadolivre':
      secret = process.env.ML_WEBHOOK_SECRET;
      break;
    case 'instagram':
      secret = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
      break;
    case 'zapi':
      secret = process.env.ZAPI_WEBHOOK_SECRET;
      break;
    case 'make':
      secret = process.env.MAKE_WEBHOOK_SECRET;
      break;
    default:
      return res.status(401).json({ error: 'Platform not supported' });
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  if (signature !== `sha256=${expectedSignature}`) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
}
```

### **Rate Limiting**
```javascript
// middleware/rateLimiting.js
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Máximo 1000 requests por IP
  message: 'Too many webhook requests',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Máximo 100 requests por IP
  message: 'Too many API requests'
});
```

---

## 📊 CONFIGURAÇÕES DE MONITORAMENTO

### **Logging Configuration**
```javascript
// config/logging.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'nxt-erp-integrations' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### **Health Check Endpoints**
```javascript
// routes/health.js
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      supabase: 'connected',
      redis: 'connected'
    }
  });
});

app.get('/health/integrations', async (req, res) => {
  const integrations = {};
  
  // Check ML
  try {
    const mlResponse = await fetch(`${process.env.ML_API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${process.env.ML_ACCESS_TOKEN}` }
    });
    integrations.mercadolivre = mlResponse.ok ? 'connected' : 'error';
  } catch (error) {
    integrations.mercadolivre = 'error';
  }
  
  // Check Instagram
  try {
    const igResponse = await fetch(`${process.env.INSTAGRAM_API_BASE_URL}/me?access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`);
    integrations.instagram = igResponse.ok ? 'connected' : 'error';
  } catch (error) {
    integrations.instagram = 'error';
  }
  
  res.json({
    status: 'ok',
    integrations
  });
});
```

---

## 🔄 CONFIGURAÇÕES DE RETRY E FALLBACK

### **Retry Configuration**
```javascript
// config/retry.js
const retryConfig = {
  mercadolivre: {
    maxRetries: 3,
    backoffBase: 1000,
    backoffMultiplier: 2,
    maxBackoff: 30000
  },
  instagram: {
    maxRetries: 5,
    backoffBase: 500,
    backoffMultiplier: 1.5,
    maxBackoff: 10000
  },
  bling: {
    maxRetries: 3,
    backoffBase: 2000,
    backoffMultiplier: 2,
    maxBackoff: 60000
  },
  zapi: {
    maxRetries: 2,
    backoffBase: 1000,
    backoffMultiplier: 1.5,
    maxBackoff: 15000
  }
};
```

### **Circuit Breaker**
```javascript
// utils/circuitBreaker.js
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }
  
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

---

## 📋 SCRIPTS DE CONFIGURAÇÃO

### **Script de Inicialização**
```bash
#!/bin/bash
# scripts/setup-integrations.sh

echo "🚀 Configurando integrações NXT ERP..."

# Verificar variáveis obrigatórias
required_vars=(
  "ML_APP_ID"
  "INSTAGRAM_APP_ID"
  "BLING_CLIENT_ID"
  "ZAPI_INSTANCE_ID"
  "SUPABASE_URL"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Variável $var não definida"
    exit 1
  fi
done

echo "✅ Todas as variáveis obrigatórias estão definidas"

# Configurar webhooks no banco
echo "📊 Configurando webhooks no banco de dados..."
psql $DATABASE_URL -f sql/setup-webhooks.sql

# Testar conexões
echo "🔍 Testando conexões..."
npm run test:integrations

echo "✅ Configuração concluída!"
```

### **Script de Teste de Integração**
```javascript
// scripts/test-integrations.js
const testIntegrations = async () => {
  console.log('🧪 Testando integrações...');
  
  const results = {};
  
  // Test ML
  try {
    const mlTest = await fetch(`${process.env.ML_API_BASE_URL}/sites/MLB`, {
      headers: { Authorization: `Bearer ${process.env.ML_ACCESS_TOKEN}` }
    });
    results.mercadolivre = mlTest.ok ? '✅' : '❌';
  } catch (error) {
    results.mercadolivre = '❌';
  }
  
  // Test Instagram
  try {
    const igTest = await fetch(`${process.env.INSTAGRAM_API_BASE_URL}/me?access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`);
    results.instagram = igTest.ok ? '✅' : '❌';
  } catch (error) {
    results.instagram = '❌';
  }
  
  // Test Supabase
  try {
    const supabaseTest = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      headers: { 
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
      }
    });
    results.supabase = supabaseTest.ok ? '✅' : '❌';
  } catch (error) {
    results.supabase = '❌';
  }
  
  console.log('Resultados dos testes:');
  console.table(results);
};

testIntegrations();
```

---

## 🛠️ COMANDOS ÚTEIS

### **Renovar Tokens**
```bash
# Renovar token ML
curl -X POST "https://api.mercadolibre.com/oauth/token" \
  -d "grant_type=refresh_token" \
  -d "client_id=$ML_APP_ID" \
  -d "client_secret=$ML_CLIENT_SECRET" \
  -d "refresh_token=$ML_REFRESH_TOKEN"

# Renovar token Instagram
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=$INSTAGRAM_APP_ID&client_secret=$INSTAGRAM_APP_SECRET&fb_exchange_token=$INSTAGRAM_ACCESS_TOKEN"
```

### **Verificar Status dos Webhooks**
```sql
-- Verificar configurações de webhook
SELECT 
    plataforma,
    nome_plataforma,
    ativo,
    endpoint_url,
    created_at
FROM whk_01_configuracao_webhooks 
ORDER BY plataforma;

-- Verificar últimos webhooks recebidos
SELECT 
    plataforma,
    evento_tipo,
    status_processamento,
    received_at,
    erro_processamento
FROM whk_02_log_webhooks_recebidos 
ORDER BY received_at DESC 
LIMIT 20;
```

---

**Configuração de Credenciais Completa**  
*Versão: 1.0*  
*Data: 2025-07-05*  
*Projeto: ERP Integrado NXT + Integrações Multi-plataforma*