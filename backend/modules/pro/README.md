# PRO (Projetos) Module

Módulo de gerenciamento de projetos com controle de fases, tarefas e recursos.

## Funcionalidades

### Gestão de Projetos
- ✅ Ciclo de vida completo de projetos
- ✅ Controle de fases e marcos (milestones)
- ✅ Gestão de cronograma e dependências
- ✅ Orçamento e controle de custos
- ✅ Gestão de riscos e issues
- ✅ Relatórios e dashboards de progresso

### Gestão de Tarefas
- ✅ Criação e atribuição de tarefas
- ✅ Controle de dependências entre tarefas
- ✅ Gestão de prioridades e deadlines
- ✅ Controle de progresso e status
- ✅ Comentários e colaboração
- ✅ Anexos e documentação

### Gestão de Recursos
- ✅ Alocação de recursos humanos
- ✅ Controle de capacidade e disponibilidade
- ✅ Gestão de custos de recursos
- ✅ Análise de utilização
- ✅ Planejamento de capacidade
- ✅ Relatórios de performance

### Controle de Tempo
- ✅ Registro de horas trabalhadas (timesheet)
- ✅ Controle de tempo por tarefa/projeto
- ✅ Aprovação de timesheets
- ✅ Relatórios de produtividade
- ✅ Análise de eficiência
- ✅ Integração com folha de pagamento

## Endpoints

### Projetos
```
GET    /api/pro/projects                   # Listar projetos
GET    /api/pro/projects/:id               # Buscar projeto
POST   /api/pro/projects                   # Criar projeto
PUT    /api/pro/projects/:id               # Atualizar projeto
DELETE /api/pro/projects/:id               # Excluir projeto
GET    /api/pro/projects/stats             # Estatísticas
GET    /api/pro/projects/:id/gantt         # Dados Gantt
POST   /api/pro/projects/:id/phases        # Criar fase
GET    /api/pro/projects/:id/budget        # Orçamento projeto
```

### Tarefas
```
GET    /api/pro/tasks                      # Listar tarefas
GET    /api/pro/tasks/:id                  # Buscar tarefa
POST   /api/pro/tasks                      # Criar tarefa
PUT    /api/pro/tasks/:id                  # Atualizar tarefa
DELETE /api/pro/tasks/:id                  # Excluir tarefa
GET    /api/pro/tasks/my-tasks             # Minhas tarefas
POST   /api/pro/tasks/:id/comments         # Adicionar comentário
GET    /api/pro/tasks/:id/time-entries     # Entradas de tempo
```

### Recursos
```
GET    /api/pro/resources                  # Listar recursos
GET    /api/pro/resources/:id              # Buscar recurso
POST   /api/pro/resources                  # Criar recurso
PUT    /api/pro/resources/:id              # Atualizar recurso
DELETE /api/pro/resources/:id              # Excluir recurso
GET    /api/pro/resources/availability     # Disponibilidade
GET    /api/pro/resources/:id/allocation   # Alocação recurso
```

### Timesheets
```
GET    /api/pro/timesheets                 # Listar timesheets
GET    /api/pro/timesheets/:id             # Buscar timesheet
POST   /api/pro/timesheets                 # Criar timesheet
PUT    /api/pro/timesheets/:id             # Atualizar timesheet
DELETE /api/pro/timesheets/:id             # Excluir timesheet
POST   /api/pro/timesheets/:id/approve     # Aprovar timesheet
GET    /api/pro/timesheets/reports         # Relatórios tempo
```

## Estrutura de Dados

### Projetos (pro_01_projetos)
- Informações básicas do projeto
- Datas início/fim planejado e real
- Orçamento e custos
- Status e progresso
- Cliente e responsável
- Configurações e metadados

### Fases (pro_02_fases)
- Estrutura hierárquica de fases
- Marcos e deliverables
- Dependências entre fases
- Critérios de aceitação
- Controle de progresso
- Aprovações e sign-offs

### Tarefas (pro_03_tarefas)
- Detalhes da tarefa
- Responsável e participantes
- Estimativas e progresso
- Dependências e predecessores
- Prioridade e criticidade
- Anexos e comentários

### Recursos (pro_04_recursos)
- Cadastro de recursos
- Capacidade e disponibilidade
- Custos e taxas
- Habilidades e competências
- Calendário de trabalho
- Histórico de alocações

### Alocações (pro_05_alocacoes)
- Vínculo recurso-projeto-tarefa
- Período de alocação
- Percentual de dedicação
- Custo da alocação
- Status e aprovação
- Histórico de mudanças

### Timesheets (pro_06_timesheets)
- Registro de horas trabalhadas
- Vínculo com tarefa/projeto
- Data e período trabalhado
- Descrição das atividades
- Status de aprovação
- Custos calculados

## Validações

- ✅ Validação Zod para todos os schemas
- ✅ Validação de datas e cronogramas
- ✅ Verificação de dependências
- ✅ Controle de orçamento
- ✅ Validação de alocações
- ✅ Verificação de capacidade

## Auditoria

- ✅ Log completo de operações
- ✅ Rastreamento de mudanças
- ✅ Histórico de progresso
- ✅ Controle de versões
- ✅ Registro de aprovações

## Integrações

- ✅ Módulo CAD (Usuários/Clientes)
- ✅ Módulo FIS (Faturamento)
- ✅ Módulo CMP (Recursos/Compras)
- ✅ Sistema de Auditoria
- ✅ Sistema de Notificações

## Analytics e KPIs

- ✅ Performance de projetos
- ✅ Utilização de recursos
- ✅ Análise de produtividade
- ✅ Controle de prazos
- ✅ Análise de custos
- ✅ ROI de projetos

## Metodologias Suportadas

- ✅ Waterfall (Cascata)
- ✅ Agile/Scrum
- ✅ Kanban
- ✅ Híbrida
- ✅ PMBOK
- ✅ PRINCE2

## Tecnologias

- Node.js + Express
- Knex.js (Query Builder)
- Zod (Validação)
- PostgreSQL
- JSON (Metadados)
- Bull Queue (Notificações)

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