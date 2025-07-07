# Módulo de Notificações (NOT)

Sistema completo de notificações e alertas para o ERP NXT, fornecendo comunicação em tempo real, alertas automáticos e integração com todos os módulos do sistema.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Características](#características)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [API Reference](#api-reference)
- [Tipos de Notificação](#tipos-de-notificação)
- [Canais de Entrega](#canais-de-entrega)
- [Sistema de Alertas](#sistema-de-alertas)
- [Integração com Módulos](#integração-com-módulos)
- [WebSocket/Socket.IO](#websocketsocketio)
- [Preferências do Usuário](#preferências-do-usuário)
- [Exemplos de Uso](#exemplos-de-uso)

## 🎯 Visão Geral

O módulo de notificações é o centro de comunicação do ERP NXT, responsável por:

- **Notificações em tempo real** via WebSocket
- **Alertas automáticos** baseados em regras de negócio
- **Notificações por email** com templates personalizáveis
- **Sistema de preferências** personalizável por usuário
- **Integração automática** com todos os módulos ERP
- **Histórico e arquivo** de notificações
- **Escalabilidade** com Redis para alta performance

## ✨ Características

### 🔔 Sistema de Notificações
- Notificações em tempo real via Socket.IO
- Suporte a múltiplos canais (in-app, email, SMS, push, webhook)
- Sistema de prioridades (baixa, média, alta, urgente)
- Expiração automática de notificações
- Arquivamento e histórico completo

### 🚨 Sistema de Alertas
- Alertas automáticos baseados em condições
- Monitoramento contínuo de:
  - Níveis de estoque
  - Vendas e pagamentos
  - Produção e qualidade
  - Indicadores financeiros
  - Status do sistema
  - Processos de importação/exportação

### 📧 Notificações por Email
- Templates HTML responsivos
- Suporte a variáveis dinâmicas
- Sistema de retry automático
- Configuração SMTP flexível

### ⚙️ Preferências Personalizáveis
- Configuração por tipo de notificação
- Configuração por canal de entrega
- Horários silenciosos
- Filtros por prioridade

### 🔌 Integração Automática
- Middleware transparente para módulos ERP
- Eventos automáticos baseados em ações
- API pública para integração customizada

## 🏗️ Arquitetura

```
modules/not/
├── index.js                    # Módulo principal
├── README.md                   # Documentação
└── ...

src/
├── controllers/
│   └── NotificationController.js    # Controller principal
├── services/
│   ├── NotificationService.js       # Serviço de notificações
│   ├── AlertService.js              # Serviço de alertas
│   ├── SocketService.js             # Serviço WebSocket
│   └── EmailService.js              # Serviço de email
├── models/
│   ├── Notification.js              # Modelo de notificação
│   └── NotificationPreference.js    # Modelo de preferências
├── middleware/
│   └── notifications.js             # Middleware de integração
├── routes/
│   └── notifications.js             # Rotas da API
└── database/
    └── migrations/
        └── 004_create_notifications_system.js
```

## 🚀 Instalação

### 1. Dependências

As dependências já estão incluídas no `package.json` principal:

```json
{
  "socket.io": "^4.7.4",
  "ioredis": "^5.3.2",
  "nodemailer": "^6.9.7",
  "node-cron": "^3.0.3"
}
```

### 2. Executar Migrations

```bash
npm run db:migrate
```

### 3. Configurar Variáveis de Ambiente

```env
# Redis (para cache e filas)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# SMTP (para emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
SMTP_FROM=seu-email@gmail.com

# JWT (para autenticação WebSocket)
JWT_SECRET=seu-jwt-secret

# Frontend (para links em emails)
FRONTEND_URL=http://localhost:3000
```

## ⚙️ Configuração

### Inicialização do Módulo

```javascript
const notificationModule = require('./modules/not');
const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Inicializar módulo com servidor HTTP para Socket.IO
await notificationModule.initialize(app, server);
```

### Configuração de Alertas Automáticos

Os alertas são configurados automaticamente via migration, mas podem ser customizados:

```javascript
// Criar alerta personalizado
await knex('automated_alerts').insert({
  name: 'Estoque Crítico',
  description: 'Alerta quando estoque fica abaixo de 5%',
  module: 'est',
  alert_type: 'stock_critical',
  conditions: JSON.stringify({
    threshold_type: 'percentage',
    threshold_value: 5,
    comparison: 'less_than'
  }),
  recipients: JSON.stringify(['admin', 'manager']),
  frequency: 'immediate'
});
```

## 📡 API Reference

### Notificações

#### Listar Notificações
```http
GET /api/notifications
```

**Query Parameters:**
- `page` (int): Página da paginação
- `limit` (int): Itens por página
- `unread_only` (boolean): Apenas não lidas
- `type` (string): Filtrar por tipo
- `priority` (string): Filtrar por prioridade
- `include_archived` (boolean): Incluir arquivadas

#### Criar Notificação
```http
POST /api/notifications
```

```json
{
  "user_ids": [1, 2, 3],
  "notification_type": "sales_alert",
  "title": "Novo Pedido",
  "message": "Pedido #123 foi criado",
  "priority": "medium",
  "channels": ["in_app", "email"],
  "data": {
    "order_id": 123,
    "customer": "Cliente ABC"
  }
}
```

#### Marcar como Lida
```http
PUT /api/notifications/{id}/read
```

#### Marcar Todas como Lidas
```http
PUT /api/notifications/mark-all-read
```

#### Arquivar Notificação
```http
PUT /api/notifications/{id}/archive
```

### Preferências

#### Buscar Preferências
```http
GET /api/notifications/preferences
```

#### Atualizar Preferências
```http
PUT /api/notifications/preferences
```

```json
{
  "preferences": [
    {
      "notification_type_id": 1,
      "channel_id": 1,
      "is_enabled": true,
      "settings": {
        "immediate": true,
        "daily_digest": false
      }
    }
  ]
}
```

### Status e Saúde

#### Informações do Módulo
```http
GET /api/notifications/module/info
```

#### Status do Módulo
```http
GET /api/notifications/module/status
```

#### Health Check
```http
GET /api/notifications/module/health
```

## 🏷️ Tipos de Notificação

| Tipo | Nome | Descrição | Ícone |
|------|------|-----------|-------|
| `stock_alert` | Alerta de Estoque | Notificações sobre níveis de estoque | warehouse |
| `sales_alert` | Alerta de Vendas | Notificações sobre vendas e pedidos | shopping-cart |
| `production_alert` | Alerta de Produção | Notificações sobre produção e qualidade | cogs |
| `financial_alert` | Alerta Financeiro | Notificações sobre pagamentos e orçamentos | dollar-sign |
| `system_alert` | Alerta do Sistema | Notificações sobre manutenção e atualizações | server |
| `import_export_alert` | Alerta de Importação/Exportação | Notificações sobre processos de importação | exchange-alt |
| `general` | Geral | Notificações gerais do sistema | bell |

## 📢 Canais de Entrega

### In-App (in_app)
- Notificações exibidas na interface
- WebSocket em tempo real
- Contador de não lidas
- Histórico navegável

### Email (email)
- Templates HTML responsivos
- Suporte a variáveis dinâmicas
- Link de descadastro
- Retry automático

### SMS (sms) *
- Notificações por SMS
- Configuração de horários silenciosos
- Apenas para alertas urgentes

### Push Notifications (push) *
- Notificações push para mobile
- Suporte a ícones e sons
- Agrupamento inteligente

### Webhook (webhook) *
- Integração com sistemas externos
- Payload customizável
- Retry com backoff exponencial

\* *Implementação futura*

## 🚨 Sistema de Alertas

### Alertas de Estoque

#### Estoque Baixo
```javascript
{
  "alert_type": "stock_low",
  "conditions": {
    "threshold_type": "percentage", // ou "quantity"
    "threshold_value": 10,
    "comparison": "less_than"
  }
}
```

#### Produto Sem Estoque
```javascript
{
  "alert_type": "out_of_stock",
  "conditions": {
    "threshold_value": 0,
    "comparison": "equal"
  }
}
```

### Alertas de Vendas

#### Novo Pedido
```javascript
{
  "alert_type": "new_order",
  "conditions": {
    "event": "order_created",
    "min_value": 1000 // Apenas pedidos acima de R$ 1.000
  }
}
```

### Alertas Financeiros

#### Pagamento Vencido
```javascript
{
  "alert_type": "payment_overdue",
  "conditions": {
    "days_overdue": 3
  },
  "frequency": "daily"
}
```

## 🔌 Integração com Módulos

### Automática via Middleware

O sistema se integra automaticamente com todos os módulos através de middleware:

```javascript
// Configuração automática no módulo principal
app.use('/api/est/*', notificationMiddleware.stock);
app.use('/api/vnd/*', notificationMiddleware.sales);
app.use('/api/prd/*', notificationMiddleware.production);
```

### Manual via API Pública

```javascript
const notificationAPI = notificationModule.getPublicAPI();

// Criar notificação
await notificationAPI.createNotification({
  user_ids: [1, 2],
  notification_type: 'custom_alert',
  title: 'Evento Personalizado',
  message: 'Algo importante aconteceu'
});

// Disparar alerta
await notificationAPI.triggerAlert('custom_alert', {
  data: 'custom data',
  recipients: ['admin']
});
```

## 📡 WebSocket/Socket.IO

### Eventos do Cliente

#### Conexão
```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'jwt-token'
  }
});
```

#### Marcar Notificação como Lida
```javascript
socket.emit('mark_notification_read', {
  notificationId: 123
});
```

#### Subscrever Alertas
```javascript
socket.emit('subscribe_to_alerts', {
  alertTypes: ['stock_alert', 'sales_alert']
});
```

### Eventos do Servidor

#### Nova Notificação
```javascript
socket.on('new_notification', (data) => {
  console.log('Nova notificação:', data.notification);
  // Atualizar UI
});
```

#### Estatísticas Atualizadas
```javascript
socket.on('notification_stats_updated', (stats) => {
  console.log('Não lidas:', stats.unread_count);
  // Atualizar contador
});
```

#### Alerta Disparado
```javascript
socket.on('alert_triggered', (data) => {
  console.log('Alerta:', data.alertType);
  // Exibir toast/modal
});
```

## 👤 Preferências do Usuário

### Estrutura das Preferências

```javascript
{
  "notification_type_id": 1,
  "channel_id": 1,
  "is_enabled": true,
  "settings": {
    // Configurações específicas do canal
    "immediate": true,
    "daily_digest": false,
    "quiet_hours": {
      "start": "22:00",
      "end": "08:00"
    },
    "only_urgent": false
  }
}
```

### Configurações Padrão

| Canal | Estoque | Vendas | Produção | Financeiro | Sistema |
|-------|---------|--------|----------|------------|---------|
| In-App | ✅ | ✅ | ✅ | ✅ | ✅ |
| Email | ✅ | ❌ | ❌ | ✅ | ✅ |
| SMS | ✅ | ❌ | ❌ | ✅ | ❌ |

## 💡 Exemplos de Uso

### 1. Notificação Simples

```javascript
await notificationService.createNotification({
  user_id: 1,
  notification_type: 'general',
  title: 'Bem-vindo!',
  message: 'Seja bem-vindo ao sistema ERP NXT',
  priority: 'low',
  channels: ['in_app']
});
```

### 2. Alerta de Estoque Baixo

```javascript
// Disparado automaticamente pelo sistema
await alertService.triggerAlert('stock_low', {
  product_id: 123,
  current_stock: 5,
  min_stock: 10,
  recipients: ['manager', 'stock_supervisor']
});
```

### 3. Notificação de Novo Pedido

```javascript
// Via middleware automático ou manual
await notificationService.createNotification({
  user_ids: await getUsersByRole(['sales']),
  notification_type: 'sales_alert',
  title: 'Novo Pedido Recebido',
  message: `Pedido #${orderId} de ${customerName}`,
  priority: 'medium',
  channels: ['in_app'],
  action_url: `/vendas/pedidos/${orderId}`,
  action_label: 'Ver Pedido',
  data: {
    order_id: orderId,
    customer_name: customerName,
    order_value: orderValue
  }
});
```

### 4. Email com Template

```javascript
await emailService.sendNotification(
  'usuario@empresa.com',
  'Relatório de Estoque',
  'stock_report',
  {
    user_name: 'João Silva',
    report_date: new Date(),
    low_stock_count: 5,
    out_of_stock_count: 2
  }
);
```

### 5. Configurar Preferências

```javascript
await notificationController.updatePreferences(req, res);
// Corpo da requisição:
{
  "preferences": [
    {
      "notification_type_id": 1, // stock_alert
      "channel_id": 1, // in_app
      "is_enabled": true,
      "settings": {
        "show_desktop_notifications": true
      }
    },
    {
      "notification_type_id": 1, // stock_alert
      "channel_id": 2, // email
      "is_enabled": true,
      "settings": {
        "immediate": true,
        "daily_digest": false
      }
    }
  ]
}
```

## 🔧 Manutenção

### Limpeza Automática

O sistema executa limpezas automáticas:

- **Notificações expiradas**: Removidas automaticamente
- **Logs de alerta antigos**: Removidos após 30 dias
- **Cache Redis**: Expiração automática configurada

### Monitoramento

```javascript
// Verificar saúde do sistema
const health = await notificationModule.checkHealth();

// Obter estatísticas
const stats = await notificationModule.getModuleStats();

// Verificar usuários conectados
const connectedUsers = notificationModule.getPublicAPI().getConnectedUsers();
```

## 📊 Métricas e Logs

O sistema registra automaticamente:

- Total de notificações enviadas
- Taxa de entrega por canal
- Alertas disparados vs. falsos positivos
- Usuários conectados em tempo real
- Performance de queries
- Erros e tentativas de retry

## 🤝 Contribuição

Para contribuir com o módulo de notificações:

1. Mantenha a compatibilidade com a API existente
2. Adicione testes para novos features
3. Documente novos tipos de alerta
4. Considere performance e escalabilidade
5. Mantenha logs detalhados para debugging

## 📝 Changelog

### v1.0.0
- ✅ Sistema completo de notificações
- ✅ Alertas automáticos
- ✅ WebSocket/Socket.IO
- ✅ Notificações por email
- ✅ Sistema de preferências
- ✅ Integração com módulos ERP
- ✅ API completa REST
- ✅ Middleware automático

### Próximas Versões
- 📱 Push notifications mobile
- 📞 Notificações por SMS
- 🔗 Sistema de webhooks
- 📊 Dashboard de métricas
- 🤖 IA para alertas inteligentes

---

**Desenvolvido por NXT Indústria e Comércio Ltda**  
Sistema ERP NXT - Módulo de Notificações v1.0.0