# PRD (Produção) Module

Módulo de gerenciamento de produção e manufatura com integração BOM e planejamento de capacidade.

## Funcionalidades

### Ordens de Produção
- ✅ Gestão completa do ciclo de vida das ordens
- ✅ Integração com BOM (Bill of Materials)
- ✅ Planejamento e programação de produção
- ✅ Controle de status e fases
- ✅ Rastreamento de materiais consumidos
- ✅ Gestão de lotes e números de série

### Centros de Trabalho
- ✅ Cadastro de recursos de produção
- ✅ Gestão de capacidade e disponibilidade
- ✅ Controle de utilização e eficiência
- ✅ Programação de atividades
- ✅ Manutenção preventiva e corretiva
- ✅ Análise de performance

### Controle de Qualidade
- ✅ Planos de inspeção por produto
- ✅ Controle de qualidade por etapa
- ✅ Registro de não conformidades
- ✅ Ações corretivas e preventivas
- ✅ Certificados de qualidade
- ✅ Rastreabilidade completa

### Planejamento de Produção
- ✅ MRP (Material Requirements Planning)
- ✅ Programação por capacidade finita
- ✅ Simulação de cenários
- ✅ Gestão de prioridades
- ✅ Análise de viabilidade
- ✅ Otimização de recursos

## Endpoints

### Ordens de Produção
```
GET    /api/prd/production-orders          # Listar ordens
GET    /api/prd/production-orders/:id      # Buscar ordem
POST   /api/prd/production-orders          # Criar ordem
PUT    /api/prd/production-orders/:id      # Atualizar ordem
DELETE /api/prd/production-orders/:id      # Cancelar ordem
GET    /api/prd/production-orders/stats    # Estatísticas
POST   /api/prd/production-orders/:id/start # Iniciar produção
POST   /api/prd/production-orders/:id/finish # Finalizar produção
GET    /api/prd/production-orders/:id/progress # Progresso
POST   /api/prd/production-orders/:id/materials # Consumir materiais
```

### Centros de Trabalho
```
GET    /api/prd/work-centers               # Listar centros
GET    /api/prd/work-centers/:id           # Buscar centro
POST   /api/prd/work-centers               # Criar centro
PUT    /api/prd/work-centers/:id           # Atualizar centro
DELETE /api/prd/work-centers/:id           # Excluir centro
GET    /api/prd/work-centers/stats         # Estatísticas
GET    /api/prd/work-centers/:id/capacity  # Capacidade
GET    /api/prd/work-centers/:id/schedule  # Programação
```

### Controle de Qualidade
```
GET    /api/prd/quality-control            # Listar controles
GET    /api/prd/quality-control/:id        # Buscar controle
POST   /api/prd/quality-control            # Criar controle
PUT    /api/prd/quality-control/:id        # Atualizar controle
DELETE /api/prd/quality-control/:id        # Excluir controle
POST   /api/prd/quality-control/:id/inspect # Executar inspeção
GET    /api/prd/quality-control/reports    # Relatórios qualidade
```

### BOM (Bill of Materials)
```
GET    /api/prd/bom                        # Listar BOMs
GET    /api/prd/bom/:id                    # Buscar BOM
POST   /api/prd/bom                        # Criar BOM
PUT    /api/prd/bom/:id                    # Atualizar BOM
DELETE /api/prd/bom/:id                    # Excluir BOM
GET    /api/prd/bom/:id/explode            # Explodir BOM
POST   /api/prd/bom/:id/cost-calc          # Calcular custos
```

## Estrutura de Dados

### Ordens de Produção (prd_01_ordens_producao)
- Informações da ordem completas
- Vínculo com produto e BOM
- Controle de quantidades
- Status e fases de produção
- Datas planejadas e realizadas
- Custos de produção

### Centros de Trabalho (prd_02_centros_trabalho)
- Cadastro de recursos
- Capacidade e disponibilidade
- Custos operacionais
- Configurações técnicas
- Histórico de utilização
- Indicadores de performance

### BOMs (prd_03_bom)
- Estrutura de produtos
- Lista de materiais e componentes
- Quantidades e unidades
- Tempos de processamento
- Rotas de produção
- Versões e revisões

### Controle de Qualidade (prd_04_controle_qualidade)
- Planos de inspeção
- Procedimentos de teste
- Critérios de aceitação
- Registros de inspeção
- Não conformidades
- Ações corretivas

### Consumo de Materiais (prd_05_consumo_materiais)
- Registro de consumos
- Vínculo com ordens
- Quantidades consumidas
- Lotes utilizados
- Perdas e refugos
- Custos de material

## Validações

- ✅ Validação Zod para todos os schemas
- ✅ Validação de disponibilidade de materiais
- ✅ Verificação de capacidade
- ✅ Controle de sequenciamento
- ✅ Validação de relacionamentos BOM
- ✅ Verificação de qualidade

## Auditoria

- ✅ Log completo de operações
- ✅ Rastreamento de mudanças
- ✅ Histórico de produção
- ✅ Controle de versões BOM
- ✅ Registro de qualidade

## Integrações

- ✅ Módulo EST (Estoque)
- ✅ Módulo CAD (Produtos)
- ✅ Módulo CMP (Compras)
- ✅ Módulo FIS (Custos)
- ✅ Sistema de Auditoria

## Analytics e KPIs

- ✅ OEE (Overall Equipment Effectiveness)
- ✅ Eficiência de produção
- ✅ Custos por unidade produzida
- ✅ Tempo de setup
- ✅ Qualidade first-pass
- ✅ Utilização de recursos

## Tecnologias

- Node.js + Express
- Knex.js (Query Builder)
- Zod (Validação)
- PostgreSQL
- JSON (Metadados)
- Bull Queue (Processamento)

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