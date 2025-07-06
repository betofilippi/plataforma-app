# LOG (Logística) Module

Módulo completo de gerenciamento logístico com transporte, otimização de rotas e gestão de transportadoras.

## Funcionalidades

### Gestão de Transportes
- ✅ Criação e gerenciamento de envios
- ✅ Cálculo de frete automático
- ✅ Rastreamento de entregas
- ✅ Controle de status em tempo real
- ✅ Integração com transportadoras
- ✅ Histórico de movimentações
- ✅ Gestão de documentos

### Otimização de Rotas
- ✅ Algoritmos de otimização (Nearest Neighbor)
- ✅ Planejamento de rotas eficientes
- ✅ Cálculo de distâncias e tempos
- ✅ Controle de execução de rotas
- ✅ Métricas de performance
- ✅ Análise de combustível
- ✅ Gestão de pontos de entrega

### Gestão de Transportadoras
- ✅ Cadastro completo de transportadoras
- ✅ Classificação por performance
- ✅ Controle de tarifas e taxas
- ✅ Análise de desempenho
- ✅ Cotação automática
- ✅ Gestão de contratos
- ✅ Avaliação de serviços

## Endpoints

### Transportes
```
GET    /api/log/transportation                    # Listar transportes
GET    /api/log/transportation/stats              # Estatísticas
GET    /api/log/transportation/active-deliveries  # Entregas ativas
POST   /api/log/transportation/calculate-freight  # Calcular frete
GET    /api/log/transportation/:id                # Buscar transporte
POST   /api/log/transportation                    # Criar transporte
PUT    /api/log/transportation/:id                # Atualizar transporte
DELETE /api/log/transportation/:id                # Excluir transporte
GET    /api/log/transportation/:id/tracking       # Rastreamento
PATCH  /api/log/transportation/:id/status         # Atualizar status
```

### Rotas
```
GET    /api/log/routes                # Listar rotas
GET    /api/log/routes/stats          # Estatísticas
GET    /api/log/routes/performance    # Métricas de performance
POST   /api/log/routes/optimize       # Otimizar rotas
POST   /api/log/routes/calculate      # Calcular rota
GET    /api/log/routes/:id            # Buscar rota
POST   /api/log/routes                # Criar rota
PUT    /api/log/routes/:id            # Atualizar rota
POST   /api/log/routes/:id/start      # Iniciar execução
POST   /api/log/routes/:id/complete   # Finalizar execução
```

### Transportadoras
```
GET    /api/log/carriers              # Listar transportadoras
GET    /api/log/carriers/stats        # Estatísticas
GET    /api/log/carriers/select       # Lista para seleção
GET    /api/log/carriers/:id          # Buscar transportadora
POST   /api/log/carriers              # Criar transportadora
PUT    /api/log/carriers/:id          # Atualizar transportadora
DELETE /api/log/carriers/:id          # Excluir transportadora
GET    /api/log/carriers/:id/performance    # Métricas de performance
PATCH  /api/log/carriers/:id/toggle-status  # Ativar/desativar
POST   /api/log/carriers/:id/quote          # Cotação de frete
```

## Estrutura de Dados

### Envios (log_01_envios)
- Informações completas de envio
- Origem e destino detalhados
- Controle de peso e volume
- Valores de frete e seguro
- Status e rastreamento
- Integração com pedidos

### Rotas (log_02_rotas)
- Planejamento de rotas
- Pontos de entrega (JSON)
- Coordenadas GPS (JSON)
- Métricas de performance
- Controle de execução
- Otimização automática

### Transportadoras (log_03_transportadoras)
- Cadastro completo
- Tipos de transporte
- Tarifas e descontos
- Regiões de atendimento (JSON)
- Serviços oferecidos (JSON)
- Documentos de habilitação (JSON)

### Rastreamento (log_04_rastreamento_entregas)
- Histórico de eventos
- Localização em tempo real
- Coordenadas GPS
- Responsáveis por evento
- Observações detalhadas

## Algoritmos de Otimização

### Nearest Neighbor
- Otimização de ordem de entregas
- Minimização de distâncias
- Consideração de restrições
- Cálculo de eficiência
- Estimativa de custos

### Métricas de Performance
- Taxa de pontualidade
- Tempo médio de entrega
- Custo por quilômetro
- Eficiência de combustível
- Análise comparativa

## Validações

- ✅ Validação Zod para todos os schemas
- ✅ Verificação de CNPJs únicos
- ✅ Validação de coordenadas GPS
- ✅ Controle de status válidos
- ✅ Verificação de disponibilidade
- ✅ Validação de datas e prazos

## Integrações

- ✅ Módulo CAD (Clientes)
- ✅ Módulo VND (Pedidos)
- ✅ Sistema de Auditoria
- ✅ Gestão de Frota (Veículos)
- ✅ RH (Motoristas)
- ✅ APIs de Mapas (Mock)

## Recursos Avançados

### Cálculo de Frete
- Múltiplas transportadoras
- Diferentes tipos de serviço
- Cálculo baseado em peso/volume
- Descontos por volume
- Seguro automático

### Rastreamento
- Eventos em tempo real
- Histórico completo
- Coordenadas GPS
- Notificações automáticas
- Interface de consulta

### Análise de Performance
- Dashboards de métricas
- Comparação de transportadoras
- Análise de eficiência
- Relatórios personalizados
- Tendências históricas

## Tecnologias

- Node.js + Express
- Knex.js (Query Builder)
- Zod (Validação)
- PostgreSQL
- JSONB (Dados complexos)
- Algoritmos de otimização

## Status

✅ **Implementado e Funcional**

- Controllers completos (Transportation, Routes, Carriers)
- Services com lógica de negócio avançada
- Validação robusta com Zod
- Sistema de auditoria integrado
- Transações de banco seguras
- Algoritmos de otimização
- Cálculo de frete automático
- Rastreamento completo
- Métricas de performance
- Tratamento de erros
- Documentação completa

## Próximos Passos

- Integração com APIs reais de mapas
- Algoritmos de otimização mais avançados
- Machine learning para previsões
- Notificações push em tempo real
- Integração com dispositivos GPS
- Dashboard analítico avançado
- API de webhooks para integrações