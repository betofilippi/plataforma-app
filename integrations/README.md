# Integrations - Integrações Externas

## 🎯 Visão Geral

Módulo responsável por todas as integrações com plataformas externas, incluindo Mercado Livre, Instagram Business, Bling ERP, Z-API WhatsApp e Make.com. Centraliza autenticação, webhook processing e sincronização de dados.

## 🏗️ Estrutura

```
integrations/
├── 📁 mercadolivre/                # Integração Mercado Livre
│   ├── 📄 client.ts                # Cliente API ML
│   ├── 📄 auth.ts                  # OAuth ML
│   ├── 📄 webhooks.ts              # Webhooks ML
│   ├── 📄 orders.ts                # Pedidos ML
│   ├── 📄 products.ts              # Produtos ML
│   ├── 📄 questions.ts             # Perguntas ML
│   └── 📄 types.ts                 # Tipos ML
├── 📁 instagram/                   # Integração Instagram Business
│   ├── 📄 client.ts                # Cliente API IG
│   ├── 📄 auth.ts                  # OAuth IG
│   ├── 📄 webhooks.ts              # Webhooks IG
│   ├── 📄 media.ts                 # Posts/Stories IG
│   ├── 📄 comments.ts              # Comentários IG
│   ├── 📄 messages.ts              # DMs IG
│   └── 📄 types.ts                 # Tipos IG
├── 📁 bling/                       # Integração Bling ERP
│   ├── 📄 client.ts                # Cliente API Bling
│   ├── 📄 auth.ts                  # OAuth Bling
│   ├── 📄 webhooks.ts              # Webhooks Bling
│   ├── 📄 products.ts              # Produtos Bling
│   ├── 📄 invoices.ts              # NF-e Bling
│   ├── 📄 orders.ts                # Pedidos Bling
│   └── 📄 types.ts                 # Tipos Bling
├── 📁 zapi/                        # Integração Z-API WhatsApp
│   ├── 📄 client.ts                # Cliente API Z-API
│   ├── 📄 auth.ts                  # Auth Z-API
│   ├── 📄 webhooks.ts              # Webhooks Z-API
│   ├── 📄 messages.ts              # Mensagens WhatsApp
│   ├── 📄 groups.ts                # Grupos WhatsApp
│   ├── 📄 contacts.ts              # Contatos WhatsApp
│   └── 📄 types.ts                 # Tipos Z-API
├── 📁 make/                        # Integração Make.com
│   ├── 📄 client.ts                # Cliente API Make
│   ├── 📄 auth.ts                  # Auth Make
│   ├── 📄 webhooks.ts              # Webhooks Make
│   ├── 📄 scenarios.ts             # Cenários Make
│   ├── 📄 executions.ts            # Execuções Make
│   └── 📄 types.ts                 # Tipos Make
├── 📁 shared/                      # Código compartilhado
│   ├── 📄 base-client.ts           # Cliente base HTTP
│   ├── 📄 auth-manager.ts          # Gerenciador auth
│   ├── 📄 webhook-processor.ts     # Processador webhooks
│   ├── 📄 rate-limiter.ts          # Rate limiting
│   ├── 📄 error-handler.ts         # Tratamento erros
│   └── 📄 types.ts                 # Tipos compartilhados
└── 📁 utils/                       # Utilitários integração
    ├── 📄 encryption.ts            # Criptografia
    ├── 📄 signature-validator.ts   # Validação assinaturas
    ├── 📄 retry-logic.ts           # Lógica de retry
    └── 📄 logger.ts                # Logging integração
```

## 🔧 Tecnologias Utilizadas

- **Runtime**: Node.js 18+
- **HTTP Client**: Axios
- **Autenticação**: OAuth 2.0 / JWT
- **Validação**: Zod
- **Criptografia**: Node crypto
- **Rate Limiting**: Custom implementation
- **Logging**: Winston
- **Cache**: Redis (opcional)
- **Webhook Security**: HMAC SHA-256

## 🔌 Integração Mercado Livre

### **Cliente API ML**
```typescript
// mercadolivre/client.ts
export class MercadoLivreClient extends BaseClient {
  constructor(
    private appId: string,
    private clientSecret: string,
    private accessToken?: string
  ) {
    super('https://api.mercadolibre.com', {
      timeout: 30000,
      retries: 3
    })
  }

  async getUser(): Promise<MLUser> {
    return this.get('/users/me')
  }

  async getOrders(params?: MLOrdersParams): Promise<MLOrder[]> {
    return this.get('/orders/search', { params })
  }

  async getOrder(orderId: string): Promise<MLOrder> {
    return this.get(`/orders/${orderId}`)
  }

  async getQuestions(params?: MLQuestionsParams): Promise<MLQuestion[]> {
    return this.get('/my/received_questions/search', { params })
  }

  async answerQuestion(
    questionId: string, 
    text: string
  ): Promise<void> {
    return this.post(`/answers`, {
      question_id: questionId,
      text
    })
  }
}
```

### **Webhooks Mercado Livre**
```typescript
// mercadolivre/webhooks.ts
export class MLWebhookProcessor {
  async processOrderWebhook(payload: MLOrderWebhook): Promise<void> {
    const orderId = this.extractOrderId(payload.resource)
    const order = await this.mlClient.getOrder(orderId)
    
    // Processar pedido no ERP
    await this.createOrUpdateOrder(order)
    
    // Gerar notificação
    await this.notificationService.notify({
      type: 'NEW_ORDER',
      title: 'Novo pedido Mercado Livre',
      message: `Pedido #${order.id} recebido`,
      data: { orderId, amount: order.total_amount }
    })
  }

  async processQuestionWebhook(payload: MLQuestionWebhook): Promise<void> {
    const questionId = this.extractQuestionId(payload.resource)
    const question = await this.mlClient.getQuestion(questionId)
    
    // Criar ticket de suporte
    await this.ticketService.createFromQuestion(question)
    
    // Auto-resposta se configurada
    const autoResponse = await this.getAutoResponse(question.text)
    if (autoResponse) {
      await this.mlClient.answerQuestion(questionId, autoResponse)
    }
  }

  private extractOrderId(resource: string): string {
    const match = resource.match(/\/orders\/(\d+)/)
    if (!match) throw new Error('Invalid order resource')
    return match[1]
  }
}
```

## 📸 Integração Instagram Business

### **Cliente API Instagram**
```typescript
// instagram/client.ts
export class InstagramClient extends BaseClient {
  constructor(
    private accessToken: string,
    private businessAccountId: string
  ) {
    super('https://graph.facebook.com/v18.0', {
      timeout: 30000,
      retries: 3
    })
  }

  async getProfile(): Promise<IGProfile> {
    return this.get(`/${this.businessAccountId}`, {
      params: {
        fields: 'id,username,name,biography,followers_count,media_count'
      }
    })
  }

  async getMedia(params?: IGMediaParams): Promise<IGMedia[]> {
    return this.get(`/${this.businessAccountId}/media`, {
      params: {
        fields: 'id,media_type,media_url,caption,timestamp,comments_count,like_count',
        ...params
      }
    })
  }

  async getComments(mediaId: string): Promise<IGComment[]> {
    return this.get(`/${mediaId}/comments`, {
      params: {
        fields: 'id,text,timestamp,from,replies'
      }
    })
  }

  async replyToComment(
    commentId: string, 
    message: string
  ): Promise<void> {
    return this.post(`/${commentId}/replies`, {
      message
    })
  }

  async sendDirectMessage(
    recipientId: string,
    message: string
  ): Promise<void> {
    return this.post('/me/messages', {
      recipient: { id: recipientId },
      message: { text: message }
    })
  }
}
```

### **Processamento DMs Instagram**
```typescript
// instagram/messages.ts
export class IGMessageProcessor {
  async processIncomingMessage(message: IGMessage): Promise<void> {
    const senderId = message.from.id
    
    // Buscar ou criar lead/cliente
    const contact = await this.findOrCreateContact(senderId)
    
    // Criar ticket de suporte
    const ticket = await this.ticketService.create({
      contactId: contact.id,
      channel: 'INSTAGRAM',
      subject: 'Mensagem Instagram',
      message: message.text,
      externalId: message.id
    })
    
    // Classificar intenção da mensagem
    const intent = await this.classifyIntent(message.text)
    
    // Auto-resposta baseada na intenção
    if (intent.autoResponse) {
      await this.igClient.sendDirectMessage(
        senderId,
        intent.autoResponse
      )
    }
    
    // Notificar atendimento se necessário
    if (intent.requiresHumanAttention) {
      await this.notificationService.notifySupport(ticket)
    }
  }

  private async classifyIntent(text: string): Promise<MessageIntent> {
    // Lógica de classificação de intenção
    // Pode usar IA/ML ou regras simples
    
    const lowercaseText = text.toLowerCase()
    
    if (lowercaseText.includes('preço') || lowercaseText.includes('valor')) {
      return {
        category: 'PRICING',
        autoResponse: 'Olá! Para informações sobre preços, por favor acesse nosso site ou fale com nosso vendedor.',
        requiresHumanAttention: true
      }
    }
    
    if (lowercaseText.includes('horário') || lowercaseText.includes('funcionamento')) {
      return {
        category: 'HOURS',
        autoResponse: 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h.',
        requiresHumanAttention: false
      }
    }
    
    return {
      category: 'GENERAL',
      autoResponse: 'Obrigado pela sua mensagem! Em breve nossa equipe entrará em contato.',
      requiresHumanAttention: true
    }
  }
}
```

## 💼 Integração Bling ERP

### **Cliente API Bling**
```typescript
// bling/client.ts
export class BlingClient extends BaseClient {
  constructor(
    private accessToken: string
  ) {
    super('https://bling.com.br/Api/v3', {
      timeout: 30000,
      retries: 3
    })
  }

  async getProducts(params?: BlingProductsParams): Promise<BlingProduct[]> {
    return this.get('/produtos', { params })
  }

  async createProduct(product: CreateBlingProduct): Promise<BlingProduct> {
    return this.post('/produtos', product)
  }

  async updateProduct(
    productId: string, 
    updates: UpdateBlingProduct
  ): Promise<BlingProduct> {
    return this.put(`/produtos/${productId}`, updates)
  }

  async getInvoices(params?: BlingInvoicesParams): Promise<BlingInvoice[]> {
    return this.get('/nfe', { params })
  }

  async createInvoice(invoice: CreateBlingInvoice): Promise<BlingInvoice> {
    return this.post('/nfe', invoice)
  }

  async sendInvoice(invoiceId: string): Promise<void> {
    return this.post(`/nfe/${invoiceId}/enviar`)
  }
}
```

### **Sincronização Bling**
```typescript
// bling/sync.ts
export class BlingSyncService {
  async syncProducts(): Promise<SyncResult> {
    const startTime = Date.now()
    let processed = 0
    let errors = 0
    
    try {
      // Buscar produtos do Bling
      const blingProducts = await this.blingClient.getProducts({
        limit: 100
      })
      
      for (const blingProduct of blingProducts) {
        try {
          // Sincronizar com nosso ERP
          await this.syncSingleProduct(blingProduct)
          processed++
        } catch (error) {
          this.logger.error('Erro ao sincronizar produto', {
            productId: blingProduct.id,
            error: error.message
          })
          errors++
        }
      }
      
      return {
        success: true,
        processed,
        errors,
        duration: Date.now() - startTime
      }
      
    } catch (error) {
      this.logger.error('Erro na sincronização', { error: error.message })
      throw error
    }
  }
  
  private async syncSingleProduct(
    blingProduct: BlingProduct
  ): Promise<void> {
    const existingProduct = await this.productService.findByExternalId(
      'BLING',
      blingProduct.id
    )
    
    const productData = this.transformBlingProduct(blingProduct)
    
    if (existingProduct) {
      await this.productService.update(existingProduct.id, productData)
    } else {
      await this.productService.create({
        ...productData,
        externalIntegrations: {
          bling: {
            id: blingProduct.id,
            lastSync: new Date()
          }
        }
      })
    }
  }
}
```

## 💬 Integração Z-API WhatsApp

### **Cliente Z-API**
```typescript
// zapi/client.ts
export class ZAPIClient extends BaseClient {
  constructor(
    private instanceId: string,
    private instanceToken: string
  ) {
    super(`https://api.z-api.io/instances/${instanceId}/token/${instanceToken}`, {
      timeout: 30000,
      retries: 3
    })
  }

  async sendMessage(
    phone: string, 
    message: string
  ): Promise<ZAPIResponse> {
    return this.post('/send-text', {
      phone,
      message
    })
  }

  async sendImage(
    phone: string,
    image: string,
    caption?: string
  ): Promise<ZAPIResponse> {
    return this.post('/send-image', {
      phone,
      image,
      caption
    })
  }

  async sendDocument(
    phone: string,
    document: string,
    fileName: string
  ): Promise<ZAPIResponse> {
    return this.post('/send-document', {
      phone,
      document,
      fileName
    })
  }

  async getChats(): Promise<ZAPIChat[]> {
    return this.get('/chats')
  }

  async getChatMessages(
    chatId: string,
    limit = 50
  ): Promise<ZAPIMessage[]> {
    return this.get(`/chat/${chatId}/messages`, {
      params: { limit }
    })
  }

  async createGroup(
    name: string,
    participants: string[]
  ): Promise<ZAPIGroup> {
    return this.post('/create-group', {
      groupName: name,
      phones: participants
    })
  }
}
```

### **Processamento Mensagens WhatsApp**
```typescript
// zapi/message-processor.ts
export class WhatsAppMessageProcessor {
  async processIncomingMessage(webhook: ZAPIWebhook): Promise<void> {
    if (webhook.messageType !== 'text') {
      return // Por enquanto só processar texto
    }
    
    const phone = webhook.phone
    const message = webhook.message.text
    
    // Buscar ou criar contato
    const contact = await this.findOrCreateContactByPhone(phone)
    
    // Verificar se é um lead existente
    const existingLead = await this.leadService.findByPhone(phone)
    
    if (!existingLead) {
      // Criar novo lead
      await this.leadService.create({
        nome: contact.nome || 'Lead WhatsApp',
        telefone: phone,
        origemLead: 'WHATSAPP',
        observacoes: message
      })
    }
    
    // Criar ticket de suporte
    const ticket = await this.ticketService.create({
      contactId: contact.id,
      channel: 'WHATSAPP',
      subject: 'Mensagem WhatsApp',
      message,
      externalId: webhook.messageId
    })
    
    // Auto-resposta baseada em horário
    if (this.isBusinessHours()) {
      await this.sendAutoResponse(phone, 'business_hours')
    } else {
      await this.sendAutoResponse(phone, 'after_hours')
    }
    
    // Notificar equipe de vendas/suporte
    await this.notificationService.notify({
      type: 'NEW_WHATSAPP_MESSAGE',
      title: 'Nova mensagem WhatsApp',
      message: `Mensagem de ${phone}`,
      data: { ticketId: ticket.id, phone, message }
    })
  }
  
  private async sendAutoResponse(
    phone: string, 
    template: string
  ): Promise<void> {
    const responses = {
      business_hours: 'Olá! Recebemos sua mensagem e em breve nossa equipe entrará em contato. Horário de atendimento: 8h às 18h.',
      after_hours: 'Olá! Recebemos sua mensagem fora do horário de atendimento. Responderemos no próximo dia útil a partir das 8h.'
    }
    
    await this.zapiClient.sendMessage(phone, responses[template])
  }
}
```

## 🔄 Integração Make.com

### **Cliente Make.com**
```typescript
// make/client.ts
export class MakeClient extends BaseClient {
  constructor(
    private apiToken: string,
    private teamId?: string
  ) {
    super('https://eu1.make.com/api/v2', {
      timeout: 30000,
      retries: 3,
      headers: {
        'Authorization': `Token ${apiToken}`
      }
    })
  }

  async getScenarios(): Promise<MakeScenario[]> {
    return this.get('/scenarios', {
      params: { teamId: this.teamId }
    })
  }

  async runScenario(
    scenarioId: string,
    data?: any
  ): Promise<MakeExecution> {
    return this.post(`/scenarios/${scenarioId}/run`, data)
  }

  async getExecutions(
    scenarioId?: string
  ): Promise<MakeExecution[]> {
    return this.get('/executions', {
      params: { scenarioId, teamId: this.teamId }
    })
  }

  async getDataStores(): Promise<MakeDataStore[]> {
    return this.get('/data-stores', {
      params: { teamId: this.teamId }
    })
  }

  async addDataStoreRecord(
    dataStoreId: string,
    data: any
  ): Promise<MakeDataRecord> {
    return this.post(`/data-stores/${dataStoreId}/data`, data)
  }
}
```

## 🔐 Gerenciamento de Autenticação

### **Auth Manager**
```typescript
// shared/auth-manager.ts
export class AuthManager {
  private tokens: Map<string, TokenInfo> = new Map()
  
  async getValidToken(platform: string): Promise<string> {
    const tokenInfo = this.tokens.get(platform)
    
    if (!tokenInfo || this.isExpired(tokenInfo)) {
      await this.refreshToken(platform)
    }
    
    return this.tokens.get(platform)!.accessToken
  }
  
  async refreshToken(platform: string): Promise<void> {
    switch (platform) {
      case 'MERCADOLIVRE':
        await this.refreshMLToken()
        break
      case 'INSTAGRAM':
        await this.refreshIGToken()
        break
      case 'BLING':
        await this.refreshBlingToken()
        break
      default:
        throw new Error(`Platform ${platform} not supported`)
    }
  }
  
  private async refreshMLToken(): Promise<void> {
    const tokenInfo = this.tokens.get('MERCADOLIVRE')
    if (!tokenInfo?.refreshToken) {
      throw new Error('No refresh token available for ML')
    }
    
    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: process.env.ML_APP_ID,
        client_secret: process.env.ML_CLIENT_SECRET,
        refresh_token: tokenInfo.refreshToken
      })
    })
    
    const data = await response.json()
    
    this.tokens.set('MERCADOLIVRE', {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000)
    })
    
    // Salvar no banco para persistência
    await this.saveTokenToDatabase('MERCADOLIVRE', this.tokens.get('MERCADOLIVRE')!)
  }
}
```

## 🔄 Processador de Webhooks

### **Base Webhook Processor**
```typescript
// shared/webhook-processor.ts
export abstract class BaseWebhookProcessor {
  protected abstract platform: string
  
  async processWebhook(
    payload: any,
    signature?: string
  ): Promise<WebhookResult> {
    const startTime = Date.now()
    
    try {
      // Validar assinatura
      if (signature && !this.validateSignature(payload, signature)) {
        throw new Error('Invalid webhook signature')
      }
      
      // Log do webhook recebido
      const webhookLog = await this.logWebhook(payload)
      
      // Processar webhook específico da plataforma
      const result = await this.processSpecificWebhook(payload)
      
      // Atualizar log com sucesso
      await this.updateWebhookLog(webhookLog.id, {
        status: 'COMPLETED',
        processedAt: new Date(),
        result,
        processingTime: Date.now() - startTime
      })
      
      return { success: true, result }
      
    } catch (error) {
      // Log do erro
      await this.logWebhookError(payload, error)
      
      return { success: false, error: error.message }
    }
  }
  
  protected abstract processSpecificWebhook(payload: any): Promise<any>
  
  protected abstract validateSignature(
    payload: any, 
    signature: string
  ): boolean
  
  private async logWebhook(payload: any): Promise<WebhookLog> {
    return this.webhookLogService.create({
      platform: this.platform,
      event: this.extractEventType(payload),
      payload,
      status: 'RECEIVED',
      receivedAt: new Date()
    })
  }
}
```

## 📊 Monitoramento e Métricas

### **Integration Health Monitor**
```typescript
// shared/health-monitor.ts
export class IntegrationHealthMonitor {
  async checkAllIntegrations(): Promise<HealthReport> {
    const results = await Promise.allSettled([
      this.checkMercadoLivre(),
      this.checkInstagram(),
      this.checkBling(),
      this.checkZAPI(),
      this.checkMake()
    ])
    
    return {
      timestamp: new Date(),
      overall: results.every(r => r.status === 'fulfilled' && r.value.healthy),
      integrations: {
        mercadolivre: results[0].status === 'fulfilled' ? results[0].value : { healthy: false },
        instagram: results[1].status === 'fulfilled' ? results[1].value : { healthy: false },
        bling: results[2].status === 'fulfilled' ? results[2].value : { healthy: false },
        zapi: results[3].status === 'fulfilled' ? results[3].value : { healthy: false },
        make: results[4].status === 'fulfilled' ? results[4].value : { healthy: false }
      }
    }
  }
  
  private async checkMercadoLivre(): Promise<IntegrationHealth> {
    try {
      const token = await this.authManager.getValidToken('MERCADOLIVRE')
      const response = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      return {
        healthy: response.ok,
        responseTime: Date.now() - Date.now(), // Simplified
        lastCheck: new Date(),
        details: response.ok ? null : `HTTP ${response.status}`
      }
    } catch (error) {
      return {
        healthy: false,
        responseTime: null,
        lastCheck: new Date(),
        details: error.message
      }
    }
  }
}
```

## 🚀 Scripts de Deploy

### **Setup Script**
```bash
#!/bin/bash
# scripts/setup-integrations.sh

echo "🔌 Configurando integrações..."

# Verificar variáveis de ambiente
required_vars=(
  "ML_APP_ID"
  "INSTAGRAM_APP_ID"
  "BLING_CLIENT_ID"
  "ZAPI_INSTANCE_ID"
  "MAKE_API_TOKEN"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Variável $var não definida"
    exit 1
  fi
done

echo "✅ Todas as variáveis estão definidas"

# Instalar dependências
npm install

# Build
npm run build

# Testar conexões
npm run test:integrations

echo "✅ Integrações configuradas com sucesso!"
```

## 📚 Documentação Adicional

- 🔌 [Integration Patterns](./docs/patterns.md)
- 🔐 [Authentication Guide](./docs/auth.md)
- 🎣 [Webhook Security](./docs/webhook-security.md)
- 📊 [Monitoring Guide](./docs/monitoring.md)

---

**Versão**: 1.0  
**Mantenedores**: Equipe Integrações NXT  
**Última Atualização**: 2025-07-05