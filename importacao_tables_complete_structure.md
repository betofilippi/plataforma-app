# Estrutura Completa das Tabelas Importação (Atualizada)

## Campos Identificados como Faltantes no Blueprint

Após análise profunda do blueprint do Make.com, foram identificados os seguintes campos faltantes nas tabelas recriadas:

### Campos Faltantes na Tabela Principal (importacao_01_1_proforma_invoice)

1. **data** - Data do documento
2. **destino** - Destino da importação
3. **email_contratado** - Email do contratado/fornecedor
4. **empresa_contratada** - Empresa contratada/fornecedor
5. **package_method** - Método de embalagem
6. **porto_embarque** - Porto de embarque (campo adicional)
7. **processado_em** - Data/hora de processamento pelo Make.com
8. **remetente_whatsapp** - Número WhatsApp que enviou o documento
9. **valor_total** - Valor total resumido
10. **url_documento** - Array de attachments (JSONB)
11. **created_at** - Data de criação do registro
12. **updated_at** - Data de última atualização

### Campos Faltantes nas Demais Tabelas Principais

Em todas as 9 tabelas principais restantes:
- **url_documento** - Array de attachments (JSONB)
- **processado_em** - Data/hora de processamento
- **remetente_whatsapp** - Número WhatsApp do remetente
- **created_at** - Data de criação
- **updated_at** - Data de atualização

## Estrutura do Campo url_documento

```json
{
  "url_documento": [
    {
      "url": "https://storage.app/bucket/file.pdf",
      "title": "Nome do arquivo",
      "mimetype": "application/pdf",
      "size": 2048000
    }
  ]
}
```

## Estrutura Completa Atualizada

### 1. importacao_01_1_proforma_invoice (ATUALIZADA)

| Campo | Tipo | Descrição | Status |
|-------|------|-----------|--------|
| id | INTEGER | Chave primária | Existente |
| invoice_number | TEXT | Número da invoice | Existente |
| condicao_pagamento | TEXT | Condições de pagamento | Existente |
| vendedor | TEXT | Nome do vendedor | Existente |
| email_vendedor | TEXT | Email do vendedor | Existente |
| whatsapp_vendedor | TEXT | WhatsApp do vendedor | Existente |
| endereco_carregamento | TEXT | Endereço de carregamento | Existente |
| cidade_carregamento | TEXT | Cidade de carregamento | Existente |
| pais_carregamento | TEXT | País de carregamento | Existente |
| porto_carregamento | TEXT | Porto de carregamento | Existente |
| endereco_entrega | TEXT | Endereço de entrega | Existente |
| cidade_entrega | TEXT | Cidade de entrega | Existente |
| pais_entrega | TEXT | País de entrega | Existente |
| porto_descarga | TEXT | Porto de descarga | Existente |
| cnpj_importador | TEXT | CNPJ do importador | Existente |
| nome_importador | TEXT | Nome do importador | Existente |
| endereco_importador | TEXT | Endereço do importador | Existente |
| cidade_importador | TEXT | Cidade do importador | Existente |
| cep_importador | TEXT | CEP do importador | Existente |
| estado_importador | TEXT | Estado do importador | Existente |
| pais_importador | TEXT | País do importador | Existente |
| email_importador | TEXT | Email do importador | Existente |
| telefone_importador | TEXT | Telefone do importador | Existente |
| cnpj_exportador | TEXT | CNPJ do exportador | Existente |
| nome_exportador | TEXT | Nome do exportador | Existente |
| endereco_exportador | TEXT | Endereço do exportador | Existente |
| cidade_exportador | TEXT | Cidade do exportador | Existente |
| cep_exportador | TEXT | CEP do exportador | Existente |
| estado_exportador | TEXT | Estado do exportador | Existente |
| pais_exportador | TEXT | País do exportador | Existente |
| email_exportador | TEXT | Email do exportador | Existente |
| telefone_exportador | TEXT | Telefone do exportador | Existente |
| observacoes | TEXT | Observações | Existente |
| **data** | DATE | Data do documento | **FALTANDO** |
| **destino** | TEXT | Destino da importação | **FALTANDO** |
| **email_contratado** | TEXT | Email do contratado | **FALTANDO** |
| **empresa_contratada** | TEXT | Empresa contratada | **FALTANDO** |
| **package_method** | TEXT | Método de embalagem | **FALTANDO** |
| **porto_embarque** | TEXT | Porto embarque (adicional) | **FALTANDO** |
| **processado_em** | TIMESTAMP | Data/hora processamento | **FALTANDO** |
| **remetente_whatsapp** | TEXT | WhatsApp remetente | **FALTANDO** |
| **valor_total** | NUMERIC(15,2) | Valor total resumido | **FALTANDO** |
| **url_documento** | JSONB | Attachments | **FALTANDO** |
| **created_at** | TIMESTAMP | Data criação | **FALTANDO** |
| **updated_at** | TIMESTAMP | Data atualização | **FALTANDO** |

### Demais Tabelas - Campos Faltantes Comuns

Todas as seguintes tabelas estão faltando os mesmos 5 campos:

1. **importacao_02_1_comprovante_pagamento_cambio**
2. **importacao_03_1_contrato_de_cambio**
3. **importacao_04_1_swift**
4. **importacao_05_1_commercial_invoice**
5. **importacao_06_1_packing_list**
6. **importacao_07_1_bill_of_lading**
7. **importacao_08_1_di_declaracao_importacao**
8. **importacao_09_1_nota_fiscal**
9. **importacao_10_1_fechamento**

Campos faltantes em cada uma:
- **url_documento** (JSONB) - Array de attachments
- **processado_em** (TIMESTAMP) - Data/hora de processamento
- **remetente_whatsapp** (TEXT) - Número WhatsApp do remetente
- **created_at** (TIMESTAMP) - Data de criação
- **updated_at** (TIMESTAMP) - Data de atualização

## Scripts de Correção

### 1. Script Principal de Correção
- **Arquivo**: `fix_importacao_complete_fields.sql`
- **Conteúdo**: Adiciona todos os campos faltantes identificados

### 2. Script Original (Parcial)
- **Arquivo**: `fix_importacao_attachments.sql`
- **Conteúdo**: Adiciona apenas o campo url_documento

## Integração com Make.com

### Fluxo de Dados

1. **Recepção via WhatsApp (Z-API)**
   - Documento recebido
   - Número do remetente capturado em `remetente_whatsapp`
   - Timestamp registrado em `processado_em`

2. **Upload para Supabase Storage**
   - Arquivo enviado para bucket "importacao.app"
   - URL, título, mimetype e tamanho salvos em `url_documento`

3. **Processamento de Dados**
   - Extração de informações do documento
   - Preenchimento dos campos específicos
   - Registro de auditoria em `created_at` e `updated_at`

### Estrutura do Webhook Z-API

O webhook recebe os seguintes dados que precisam ser mapeados:
- `phone` → `remetente_whatsapp`
- `momment` (timestamp) → `processado_em`
- Documento anexo → processado e salvo em `url_documento`

## Validações Necessárias

1. **Verificar se tabelas existem antes de alterar**
2. **Validar tipos de dados JSONB para PostgreSQL**
3. **Criar índices para campos de busca frequente**
4. **Implementar triggers para `updated_at`**

## Próximos Passos

1. **Executar script de correção completo**
   ```sql
   -- Executar no Supabase
   \i fix_importacao_complete_fields.sql
   ```

2. **Validar estrutura após alterações**
   ```sql
   SELECT table_name, column_name, data_type
   FROM information_schema.columns
   WHERE table_name LIKE 'importacao_%'
   ORDER BY table_name, ordinal_position;
   ```

3. **Testar integração com Make.com**
   - Enviar documento teste via WhatsApp
   - Verificar preenchimento de todos os campos
   - Validar armazenamento de attachments

4. **Atualizar documentação NocoDB**
   - Incluir novos campos na interface
   - Ajustar formulários de entrada
   - Configurar visualizações

## Observações Importantes

1. **Campos de Auditoria**: `created_at` e `updated_at` são essenciais para rastreabilidade
2. **Campo url_documento**: Tipo JSONB permite queries complexas no PostgreSQL
3. **Índices**: Criados para `invoice_number`, `processado_em` e `remetente_whatsapp`
4. **Triggers**: Automatizam atualização de `updated_at`
5. **Compatibilidade**: Script usa `IF NOT EXISTS` para ser idempotente