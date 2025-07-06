# WHK (Webhooks) Module

Módulo de gerenciamento centralizado de webhooks com entrega garantida e monitoramento.

## Funcionalidades

### Gestão de Webhooks
- ✅ Registro e configuração de endpoints
- ✅ Assinatura de eventos por tipo
- ✅ Autenticação e segurança
- ✅ Filtros e condições avançadas
- ✅ Rate limiting e throttling
- ✅ Versionamento de payloads

### Sistema de Entrega
- ✅ Entrega garantida com retry
- ✅ Dead letter queue para falhas
- ✅ Circuit breaker para endpoints instáveis
- ✅ Entrega ordenada quando necessário
- ✅ Batch delivery para alta performance
- ✅ Delivery confirmations e acks

### Monitoramento e Analytics
- ✅ Logs detalhados de entregas
- ✅ Métricas de performance
- ✅ Alertas para falhas
- ✅ Dashboard de monitoramento
- ✅ Análise de padrões de uso
- ✅ SLA tracking

### Segurança e Autenticação
- ✅ Assinatura HMAC de payloads
- ✅ Autenticação JWT e API Key
- ✅ Whitelist de IPs
- ✅ Rate limiting por consumer
- ✅ Criptografia de dados sensíveis
- ✅ Audit trail completo

### Desenvolvimento e Debug
- ✅ Webhook simulator para testes
- ✅ Payload inspector e validator
- ✅ Request/Response logging
- ✅ Mock endpoints para desenvolvimento
- ✅ Debug mode com logs verbosos
- ✅ Testing frameworks integration

## Endpoints

### Webhook Registration
```
GET    /api/whk/webhooks                   # Listar webhooks
GET    /api/whk/webhooks/:id               # Buscar webhook
POST   /api/whk/webhooks                   # Registrar webhook
PUT    /api/whk/webhooks/:id               # Atualizar webhook
DELETE /api/whk/webhooks/:id               # Excluir webhook
POST   /api/whk/webhooks/:id/test          # Testar webhook
GET    /api/whk/webhooks/:id/logs          # Logs do webhook
```

### Event Management
```
GET    /api/whk/events                     # Listar tipos de evento
GET    /api/whk/events/:type               # Detalhes do evento
POST   /api/whk/events/trigger             # Disparar evento
GET    /api/whk/events/history             # Histórico eventos
GET    /api/whk/events/stats               # Estatísticas eventos
```

### Delivery Management
```
GET    /api/whk/deliveries                 # Listar entregas
GET    /api/whk/deliveries/:id             # Detalhes entrega
POST   /api/whk/deliveries/:id/retry       # Retentar entrega
GET    /api/whk/deliveries/failed          # Entregas falhadas
GET    /api/whk/deliveries/stats           # Estatísticas entrega
POST   /api/whk/deliveries/bulk-retry      # Retry em lote
```

### Monitoring
```
GET    /api/whk/monitoring/dashboard       # Dashboard principal
GET    /api/whk/monitoring/health          # Health checks
GET    /api/whk/monitoring/metrics         # Métricas detalhadas
GET    /api/whk/monitoring/alerts          # Alertas ativos
POST   /api/whk/monitoring/alerts          # Criar alerta
```

### Security
```
GET    /api/whk/security/signatures        # Gerenciar assinaturas
POST   /api/whk/security/rotate-key        # Rotacionar chaves
GET    /api/whk/security/audit             # Logs de auditoria
POST   /api/whk/security/validate          # Validar payload
```

## Estrutura de Dados

### Webhooks (whk_01_webhooks)
- Configuração do webhook
- URL de destino e método HTTP
- Eventos subscritos
- Configurações de autenticação
- Filtros e condições
- Status e configurações

### Eventos (whk_02_eventos)
- Definição de tipos de evento
- Schema do payload
- Metadados e contexto
- Versionamento
- Configurações de entrega
- Histórico de disparos

### Entregas (whk_03_entregas)
- Log de entregas realizadas
- Status e timestamps
- Request/Response completos
- Métricas de performance
- Informações de retry
- Dados de debugging

### Assinantes (whk_04_assinantes)
- Registro de endpoints
- Configurações de autenticação
- Rate limits e quotas
- Preferências de entrega
- Histórico de atividade
- Métricas de uso

### Configurações (whk_05_configuracoes)
- Configurações globais
- Políticas de retry
- Rate limits padrão
- Configurações de segurança
- Templates de eventos
- Configurações de monitoramento

### Alertas (whk_06_alertas)
- Definição de alertas
- Condições e triggers
- Canais de notificação
- Políticas de escalação
- Histórico de ativação
- Configurações de throttling

## Tipos de Eventos Suportados

### Sistema
- `system.startup` - Sistema iniciado
- `system.shutdown` - Sistema parado
- `system.health_check` - Verificação de saúde
- `system.backup_completed` - Backup concluído

### Usuários
- `user.created` - Usuário criado
- `user.updated` - Usuário atualizado
- `user.deleted` - Usuário excluído
- `user.login` - Login realizado
- `user.logout` - Logout realizado

### Pedidos
- `order.created` - Pedido criado
- `order.updated` - Pedido atualizado
- `order.cancelled` - Pedido cancelado
- `order.completed` - Pedido finalizado
- `order.shipped` - Pedido enviado

### Produtos
- `product.created` - Produto criado
- `product.updated` - Produto atualizado
- `product.deleted` - Produto excluído
- `product.out_of_stock` - Produto sem estoque

### Customizados
- Eventos personalizados por módulo
- Schema flexível com validação
- Versionamento automático
- Backward compatibility

## Padrões de Entrega

### Immediate Delivery
- Entrega imediata após evento
- Menor latência possível
- Ideal para notificações críticas
- Retry automático em falhas

### Batch Delivery
- Agrupamento de eventos
- Entrega em intervalos definidos
- Maior eficiência para alto volume
- Redução de overhead de rede

### Delayed Delivery
- Entrega programada
- Suporte a scheduling
- Ideal para notificações não urgentes
- Otimização de recursos

### Ordered Delivery
- Garantia de ordem de entrega
- FIFO queue por endpoint
- Essencial para eventos sequenciais
- Trade-off com performance

## Validações

- ✅ Validação Zod para schemas
- ✅ Validação de URLs e endpoints
- ✅ Verificação de segurança
- ✅ Validação de payloads
- ✅ Rate limit compliance
- ✅ Schema versioning

## Auditoria

- ✅ Log completo de operações
- ✅ Rastreamento de entregas
- ✅ Histórico de configurações
- ✅ Logs de segurança
- ✅ Performance tracking

## Integrações

- ✅ Todos os módulos ERP
- ✅ Sistemas externos via API
- ✅ Message queues (Redis/RabbitMQ)
- ✅ Monitoring tools (Prometheus)
- ✅ Alert systems (PagerDuty, Slack)
- ✅ Analytics platforms

## Métricas e KPIs

- ✅ Taxa de sucesso de entrega
- ✅ Latência média de entrega
- ✅ Volume de eventos por tipo
- ✅ Uptime dos endpoints
- ✅ Taxa de retry
- ✅ Performance por consumer

## Tecnologias

- Node.js + Express
- Knex.js (Query Builder)
- Zod (Validação)
- PostgreSQL
- Redis (Queue/Cache)
- Bull Queue (Processing)
- Axios (HTTP Client)
- Crypto (HMAC Signatures)

## Status

✅ **Implementado e Funcional**

- Controllers completos
- Services com lógica de negócio
- Validação robusta
- Sistema de auditoria
- Transações de banco
- Tratamento de erros
- Retry mechanisms
- Monitoring completo
- Documentação completa