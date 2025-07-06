# LOC (Locação) Module

Módulo de gerenciamento de locação de equipamentos e ativos.

## Funcionalidades

### Contratos de Locação
- ✅ Gerenciamento completo de contratos
- ✅ Renovação automática e manual
- ✅ Cálculo de faturamento
- ✅ Controle de caução
- ✅ Alertas de vencimento
- ✅ Histórico e auditoria

### Equipamentos
- ✅ Cadastro completo de equipamentos
- ✅ Controle de disponibilidade
- ✅ Gerenciamento de status
- ✅ Histórico de manutenção
- ✅ Documentação técnica
- ✅ Controle de localização

### Manutenção
- ✅ Agendamento preventivo
- ✅ Controle corretivo
- ✅ Histórico de intervenções
- ✅ Custos de manutenção
- ✅ Controle de peças

## Endpoints

### Contratos de Locação
```
GET    /api/loc/rental-contracts          # Listar contratos
GET    /api/loc/rental-contracts/:id      # Buscar contrato
POST   /api/loc/rental-contracts          # Criar contrato
PUT    /api/loc/rental-contracts/:id      # Atualizar contrato
DELETE /api/loc/rental-contracts/:id      # Excluir contrato
GET    /api/loc/rental-contracts/stats    # Estatísticas
GET    /api/loc/rental-contracts/expiring # Contratos vencendo
POST   /api/loc/rental-contracts/:id/renew # Renovar contrato
GET    /api/loc/rental-contracts/:id/billing # Cálculo faturamento
```

### Equipamentos
```
GET    /api/loc/equipment                 # Listar equipamentos
GET    /api/loc/equipment/:id             # Buscar equipamento
POST   /api/loc/equipment                 # Criar equipamento
PUT    /api/loc/equipment/:id             # Atualizar equipamento
DELETE /api/loc/equipment/:id             # Excluir equipamento
GET    /api/loc/equipment/stats           # Estatísticas
GET    /api/loc/equipment/available       # Equipamentos disponíveis
PATCH  /api/loc/equipment/:id/status      # Atualizar status
GET    /api/loc/equipment/:id/maintenance # Histórico manutenção
```

## Estrutura de Dados

### Contratos (loc_01_contratos_locacao)
- Informações contratuais completas
- Vínculo cliente/equipamento
- Controle financeiro
- Cláusulas especiais
- Status e renovações

### Equipamentos (loc_02_equipamentos)
- Cadastro técnico completo
- Controle de status
- Valores de locação
- Especificações técnicas
- Documentação anexa

### Manutenções (loc_03_manutencoes)
- Agendamentos
- Histórico de serviços
- Custos e peças
- Tempo de parada
- Responsáveis

## Validações

- ✅ Validação Zod para todos os schemas
- ✅ Validação de datas contratuais
- ✅ Verificação de disponibilidade
- ✅ Controle de unicidade
- ✅ Validação de relacionamentos

## Auditoria

- ✅ Log completo de operações
- ✅ Rastreamento de mudanças
- ✅ Histórico de status
- ✅ Registro de ações

## Integrações

- ✅ Módulo CAD (Clientes)
- ✅ Módulo FIS (Faturamento)
- ✅ Módulo VND (Vendas)
- ✅ Sistema de Auditoria

## Tecnologias

- Node.js + Express
- Knex.js (Query Builder)
- Zod (Validação)
- PostgreSQL
- JSON (Metadados)

## Status

✅ **Implementado e Funcional**

- Controllers completos
- Services com lógica de negócio
- Validação robusta
- Sistema de auditoria
- Transações de banco
- Tratamento de erros
- Documentação completa
