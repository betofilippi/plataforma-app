# SPT (Suporte) Module

Módulo de gerenciamento de suporte ao cliente com sistema de tickets e knowledge base.

## Funcionalidades

### Sistema de Tickets
- ✅ Ciclo de vida completo de tickets
- ✅ Categorização e priorização automática
- ✅ Sistema de SLA com escalação
- ✅ Workflow customizável por tipo
- ✅ Atribuição automática e manual
- ✅ Histórico completo de interações

### Knowledge Base
- ✅ Base de conhecimento estruturada
- ✅ Artigos com categorização
- ✅ Sistema de busca avançado
- ✅ Avaliação de utilidade
- ✅ Versionamento de conteúdo
- ✅ Templates de resposta

### Gestão de Atendentes
- ✅ Perfis de agentes de suporte
- ✅ Especialização por categoria
- ✅ Métricas de performance
- ✅ Carga de trabalho balanceada
- ✅ Calendários e disponibilidade
- ✅ Treinamento e certificações

### Automação e Workflows
- ✅ Regras de negócio automáticas
- ✅ Escalação por SLA
- ✅ Notificações inteligentes
- ✅ Chatbots para primeiro atendimento
- ✅ Macros e respostas rápidas
- ✅ Integração multi-canal

### Analytics e Relatórios
- ✅ Dashboard de performance
- ✅ Métricas de satisfação
- ✅ Análise de tendências
- ✅ Relatórios de SLA
- ✅ KPIs de atendimento
- ✅ Análise de sentimento

## Endpoints

### Tickets
```
GET    /api/spt/tickets                    # Listar tickets
GET    /api/spt/tickets/:id                # Buscar ticket
POST   /api/spt/tickets                    # Criar ticket
PUT    /api/spt/tickets/:id                # Atualizar ticket
DELETE /api/spt/tickets/:id                # Excluir ticket
GET    /api/spt/tickets/stats              # Estatísticas
POST   /api/spt/tickets/:id/assign         # Atribuir ticket
POST   /api/spt/tickets/:id/escalate       # Escalar ticket
GET    /api/spt/tickets/:id/timeline       # Timeline ticket
POST   /api/spt/tickets/:id/close          # Fechar ticket
GET    /api/spt/tickets/my-queue           # Minha fila
```

### Knowledge Base
```
GET    /api/spt/knowledge-base             # Listar artigos
GET    /api/spt/knowledge-base/:id         # Buscar artigo
POST   /api/spt/knowledge-base             # Criar artigo
PUT    /api/spt/knowledge-base/:id         # Atualizar artigo
DELETE /api/spt/knowledge-base/:id         # Excluir artigo
GET    /api/spt/knowledge-base/search      # Buscar artigos
POST   /api/spt/knowledge-base/:id/rate    # Avaliar artigo
GET    /api/spt/knowledge-base/categories  # Categorias
```

### Agentes
```
GET    /api/spt/agents                     # Listar agentes
GET    /api/spt/agents/:id                 # Buscar agente
POST   /api/spt/agents                     # Criar agente
PUT    /api/spt/agents/:id                 # Atualizar agente
DELETE /api/spt/agents/:id                 # Excluir agente
GET    /api/spt/agents/performance         # Performance agentes
GET    /api/spt/agents/:id/workload        # Carga trabalho
```

### Automação
```
GET    /api/spt/automation/rules           # Regras automação
POST   /api/spt/automation/rules           # Criar regra
PUT    /api/spt/automation/rules/:id       # Atualizar regra
DELETE /api/spt/automation/rules/:id       # Excluir regra
GET    /api/spt/automation/workflows       # Workflows
POST   /api/spt/automation/test            # Testar regra
```

### SLA
```
GET    /api/spt/sla/policies               # Políticas SLA
POST   /api/spt/sla/policies               # Criar política
PUT    /api/spt/sla/policies/:id           # Atualizar política
DELETE /api/spt/sla/policies/:id           # Excluir política
GET    /api/spt/sla/violations             # Violações SLA
GET    /api/spt/sla/reports                # Relatórios SLA
```

## Estrutura de Dados

### Tickets (spt_01_tickets)
- Informações básicas do ticket
- Cliente e canal de origem
- Categoria, prioridade e SLA
- Status e agente responsável
- Histórico de interações
- Satisfação e avaliação

### Interações (spt_02_interacoes)
- Comunicações do ticket
- Tipo de interação (email, chat, phone)
- Conteúdo e anexos
- Agente e timestamp
- Visibilidade (pública/privada)
- Métricas de resposta

### Knowledge Base (spt_03_knowledge_base)
- Artigos de conhecimento
- Categorização hierárquica
- Conteúdo estruturado
- Tags e palavras-chave
- Avaliações e feedback
- Histórico de versões

### Agentes (spt_04_agentes)
- Perfil do agente
- Especialidades e habilidades
- Métricas de performance
- Configurações pessoais
- Calendário e disponibilidade
- Certificações e treinamentos

### SLA Policies (spt_05_sla_policies)
- Definições de SLA
- Tempo de resposta/resolução
- Critérios de aplicação
- Escalação automática
- Penalidades e alertas
- Configurações por categoria

### Automação (spt_06_automacao)
- Regras de negócio
- Condições e ações
- Triggers e eventos
- Workflows complexos
- Templates de resposta
- Macros e scripts

### Satisfação (spt_07_satisfacao)
- Pesquisas de satisfação
- Ratings e comentários
- NPS e CSAT
- Análise de sentimento
- Feedback qualitativo
- Ações de melhoria

## Validações

- ✅ Validação Zod para todos os schemas
- ✅ Validação de SLA e prazos
- ✅ Verificação de permissões
- ✅ Controle de qualidade
- ✅ Validação de conteúdo
- ✅ Verificação de dependências

## Auditoria

- ✅ Log completo de operações
- ✅ Rastreamento de mudanças
- ✅ Histórico de interações
- ✅ Controle de acesso
- ✅ Registro de performance

## Integrações

- ✅ Módulo CAD (Clientes)
- ✅ Sistema de Email
- ✅ Chat/WhatsApp
- ✅ Telefonia (VoIP)
- ✅ Sistema de Notificações
- ✅ CRM Integrado

## Canais Suportados

- ✅ Email
- ✅ Chat/WhatsApp
- ✅ Telefone
- ✅ Portal Web
- ✅ API/Webhook
- ✅ Redes Sociais

## Métricas e KPIs

- ✅ Tempo de primeira resposta
- ✅ Tempo de resolução
- ✅ Taxa de resolução primeiro contato
- ✅ Satisfação do cliente (CSAT)
- ✅ Net Promoter Score (NPS)
- ✅ Produtividade dos agentes
- ✅ Taxa de escalação
- ✅ Volume de tickets por canal

## Tecnologias

- Node.js + Express
- Knex.js (Query Builder)
- Zod (Validação)
- PostgreSQL
- JSON (Metadados)
- Bull Queue (Automação)
- Full-text Search
- WebSocket (Real-time)

## Status

✅ **Implementado e Funcional**

- Controllers completos
- Services com lógica de negócio
- Validação robusta
- Sistema de auditoria
- Transações de banco
- Tratamento de erros
- Analytics avançados
- Documentação completa