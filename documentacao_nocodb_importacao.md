# Documentação das Tabelas Importação no NocoDB

## Visão Geral

Este documento descreve a estrutura exata das 18 tabelas de importação como estão implementadas no NocoDB, extraídas do blueprint do Make.com. Estas tabelas gerenciam todo o processo de importação através de uma integração automatizada com WhatsApp.

## Características do Sistema

- **18 tabelas** interconectadas representando o fluxo completo de importação
- **Estrutura baseada em texto**: A maioria dos campos são do tipo TEXT no NocoDB
- **Duas chaves de referência**: `invoice_number` e `importacao_01_1_proforma_invoice_id`
- **Integração WhatsApp**: Recebe documentos via Z-API e processa automaticamente
- **Rastreabilidade completa**: Cada documento mantém referência ao processo principal

## Estrutura Hierárquica

```
importacao_01_1_proforma_invoice (TABELA PRINCIPAL)
│
├─ Documentos de Pagamento
│  ├── importacao_02_1_comprovante_pagamento_cambio
│  ├── importacao_03_1_contrato_de_cambio
│  └── importacao_04_1_swift
│
├─ Documentos Comerciais
│  ├── importacao_05_1_commercial_invoice
│  │   └── importacao_05_2_commercial_invoice_items
│  └── importacao_06_1_packing_list
│      ├── importacao_06_2_packing_list_containers
│      └── importacao_06_3_packing_list_items
│
├─ Documentos de Transporte
│  └── importacao_07_1_bill_of_lading
│      └── importacao_07_2_bill_of_lading_containers
│
├─ Documentos Aduaneiros
│  └── importacao_08_1_di_declaracao_importacao
│      ├── importacao_08_2_di_adicoes
│      └── importacao_08_3_di_tributos_por_adicao
│
├─ Documentos Fiscais
│  └── importacao_09_1_nota_fiscal
│      └── importacao_09_2_nota_fiscal_itens
│
└─ Fechamento
   └── importacao_10_1_fechamento
```

## Documentação Detalhada das Tabelas

### 1. importacao_01_1_proforma_invoice

**Propósito**: Tabela principal que registra a cotação inicial (Proforma Invoice) e contém dados completos do importador e exportador.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária (auto-incremento) |
| invoice_number | TEXT | Número único da invoice |
| condicao_pagamento | TEXT | Condições de pagamento acordadas |
| vendedor | TEXT | Nome do vendedor |
| email_vendedor | TEXT | E-mail do vendedor |
| whatsapp_vendedor | TEXT | WhatsApp do vendedor |
| endereco_carregamento | TEXT | Endereço de carregamento |
| cidade_carregamento | TEXT | Cidade de carregamento |
| pais_carregamento | TEXT | País de carregamento |
| porto_carregamento | TEXT | Porto de carregamento |
| endereco_entrega | TEXT | Endereço de entrega |
| cidade_entrega | TEXT | Cidade de entrega |
| pais_entrega | TEXT | País de entrega |
| porto_descarga | TEXT | Porto de descarga |
| cnpj_importador | TEXT | CNPJ do importador |
| nome_importador | TEXT | Nome/Razão social do importador |
| endereco_importador | TEXT | Endereço do importador |
| cidade_importador | TEXT | Cidade do importador |
| cep_importador | TEXT | CEP do importador |
| estado_importador | TEXT | Estado do importador |
| pais_importador | TEXT | País do importador |
| email_importador | TEXT | E-mail do importador |
| telefone_importador | TEXT | Telefone do importador |
| cnpj_exportador | TEXT | CNPJ/Tax ID do exportador |
| nome_exportador | TEXT | Nome do exportador |
| endereco_exportador | TEXT | Endereço do exportador |
| cidade_exportador | TEXT | Cidade do exportador |
| cep_exportador | TEXT | CEP/Postal Code do exportador |
| estado_exportador | TEXT | Estado/Província do exportador |
| pais_exportador | TEXT | País do exportador |
| email_exportador | TEXT | E-mail do exportador |
| telefone_exportador | TEXT | Telefone do exportador |
| observacoes | TEXT | Observações gerais |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

### 2. importacao_01_2_proforma_invoice_items

**Propósito**: Armazena os itens detalhados da Proforma Invoice.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| item | TEXT | Número/código do item |
| quantidade | NUMERIC | Quantidade do item |
| unidade | TEXT | Unidade de medida |
| descricao | TEXT | Descrição do produto |
| valor_unitario | NUMERIC | Valor unitário |
| valor_total | NUMERIC | Valor total do item |
| ncm | TEXT | Código NCM |
| peso_unitario | NUMERIC | Peso unitário |
| peso_total | NUMERIC | Peso total |
| referencia | TEXT | Referência do produto |

### 3. importacao_02_1_comprovante_pagamento_cambio

**Propósito**: Registra comprovantes de pagamento e operações de câmbio.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| banco | TEXT | Banco utilizado |
| agencia | TEXT | Agência bancária |
| conta | TEXT | Conta bancária |
| data_pagamento | DATE | Data do pagamento |
| valor_pagamento | NUMERIC | Valor pago em moeda estrangeira |
| taxa_cambio | NUMERIC | Taxa de câmbio aplicada |
| valor_reais | NUMERIC | Valor em reais |
| numero_operacao | TEXT | Número da operação bancária |
| contrato_cambio | TEXT | Número do contrato de câmbio |
| observacoes | TEXT | Observações |

### 4. importacao_03_1_contrato_de_cambio

**Propósito**: Armazena contratos de câmbio formalizados.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| numero_contrato | TEXT | Número do contrato |
| data_contrato | DATE | Data do contrato |
| banco | TEXT | Banco do contrato |
| valor_contrato | NUMERIC | Valor do contrato |
| taxa_cambio | NUMERIC | Taxa de câmbio |
| modalidade | TEXT | Modalidade do câmbio |
| prazo_liquidacao | TEXT | Prazo para liquidação |
| forma_entrega | TEXT | Forma de entrega |
| observacoes | TEXT | Observações |

### 5. importacao_04_1_swift

**Propósito**: Registra transferências internacionais SWIFT.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| numero_swift | TEXT | Número SWIFT |
| data_swift | DATE | Data da transferência |
| banco_remetente | TEXT | Banco remetente |
| banco_beneficiario | TEXT | Banco beneficiário |
| valor_transferencia | NUMERIC | Valor transferido |
| moeda | TEXT | Moeda da transferência |
| beneficiario | TEXT | Nome do beneficiário |
| referencia_operacao | TEXT | Referência da operação |
| observacoes | TEXT | Observações |

### 6. importacao_05_1_commercial_invoice

**Propósito**: Invoice comercial oficial para a importação.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| data_invoice | DATE | Data da invoice |
| numero_invoice | TEXT | Número da commercial invoice |
| vendedor | TEXT | Vendedor/Exportador |
| comprador | TEXT | Comprador/Importador |
| incoterm | TEXT | Incoterm utilizado |
| porto_origem | TEXT | Porto de origem |
| porto_destino | TEXT | Porto de destino |
| valor_total_fob | NUMERIC | Valor FOB total |
| valor_frete | NUMERIC | Valor do frete |
| valor_seguro | NUMERIC | Valor do seguro |
| valor_total_cif | NUMERIC | Valor CIF total |
| peso_liquido_total | NUMERIC | Peso líquido total |
| peso_bruto_total | NUMERIC | Peso bruto total |
| observacoes | TEXT | Observações |

### 7. importacao_05_2_commercial_invoice_items

**Propósito**: Itens da Commercial Invoice.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| item | TEXT | Número do item |
| quantidade | NUMERIC | Quantidade |
| unidade | TEXT | Unidade de medida |
| descricao | TEXT | Descrição do produto |
| ncm | TEXT | Código NCM |
| valor_unitario_fob | NUMERIC | Valor unitário FOB |
| valor_total_fob | NUMERIC | Valor total FOB |
| peso_liquido | NUMERIC | Peso líquido |
| peso_bruto | NUMERIC | Peso bruto |
| referencia | TEXT | Referência do produto |

### 8. importacao_06_1_packing_list

**Propósito**: Lista de embalagem com informações de volumes.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| numero_packing_list | TEXT | Número da packing list |
| data_packing_list | DATE | Data da packing list |
| total_volumes | INTEGER | Total de volumes |
| total_peso_liquido | NUMERIC | Peso líquido total |
| total_peso_bruto | NUMERIC | Peso bruto total |
| total_cbm | NUMERIC | Volume total em CBM |
| marca_volumes | TEXT | Marca dos volumes |
| numeracao_volumes | TEXT | Numeração dos volumes |
| observacoes | TEXT | Observações |

### 9. importacao_06_2_packing_list_containers

**Propósito**: Informações dos containers na packing list.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| numero_container | TEXT | Número do container |
| tipo_container | TEXT | Tipo (20', 40', 40'HC) |
| lacre | TEXT | Número do lacre |
| tara | NUMERIC | Tara do container |
| peso_bruto | NUMERIC | Peso bruto |
| cbm | NUMERIC | Volume em CBM |
| quantidade_volumes | INTEGER | Quantidade de volumes |

### 10. importacao_06_3_packing_list_items

**Propósito**: Detalhamento dos itens por container/embalagem.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| container | TEXT | Container onde está o item |
| item | TEXT | Código do item |
| referencia | TEXT | Referência do produto |
| descricao_ingles | TEXT | Descrição em inglês |
| descricao_chines | TEXT | Descrição em chinês |
| quantidade_por_pacote | INTEGER | Quantidade por pacote |
| quantidade_pacotes | INTEGER | Quantidade de pacotes |
| quantidade_total | INTEGER | Quantidade total |
| peso_liquido_por_pacote | NUMERIC | Peso líquido/pacote |
| peso_liquido_total | NUMERIC | Peso líquido total |
| peso_bruto_por_pacote | NUMERIC | Peso bruto/pacote |
| peso_bruto_total | NUMERIC | Peso bruto total |
| comprimento_pacote | NUMERIC | Comprimento do pacote |
| largura_pacote | NUMERIC | Largura do pacote |
| altura_pacote | NUMERIC | Altura do pacote |
| cbm_por_pacote | NUMERIC | CBM por pacote |
| cbm_total | NUMERIC | CBM total |
| marcacao_pacote | TEXT | Marcação do pacote |

### 11. importacao_07_1_bill_of_lading

**Propósito**: Conhecimento de embarque (B/L) marítimo.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| numero_bl | TEXT | Número do B/L |
| data_bl | DATE | Data de emissão |
| tipo_bl | TEXT | Tipo (Master/House) |
| embarcador | TEXT | Shipper |
| consignatario | TEXT | Consignee |
| notificar | TEXT | Notify party |
| navio | TEXT | Nome do navio |
| viagem | TEXT | Número da viagem |
| porto_embarque | TEXT | Porto de embarque |
| porto_descarga | TEXT | Porto de descarga |
| porto_transbordo | TEXT | Porto de transbordo |
| data_embarque | DATE | Data de embarque |
| data_chegada_prevista | DATE | ETA |
| peso_bruto | NUMERIC | Peso bruto total |
| cbm | NUMERIC | Volume total |
| quantidade_containers | INTEGER | Qtd containers |
| valor_frete | NUMERIC | Valor do frete |
| moeda_frete | TEXT | Moeda do frete |
| observacoes | TEXT | Observações |

### 12. importacao_07_2_bill_of_lading_containers

**Propósito**: Containers listados no B/L.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| numero_container | TEXT | Número do container |
| tipo_container | TEXT | Tipo do container |
| lacre | TEXT | Número do lacre |
| peso_bruto | NUMERIC | Peso bruto |
| cbm | NUMERIC | Volume em CBM |
| quantidade_volumes | INTEGER | Quantidade de volumes |

### 13. importacao_08_1_di_declaracao_importacao

**Propósito**: Declaração de Importação (DI) para desembaraço aduaneiro.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| numero_di | TEXT | Número da DI |
| data_registro | DATE | Data de registro |
| data_desembaraco | DATE | Data de desembaraço |
| canal | TEXT | Canal (verde/amarelo/vermelho) |
| recinto_aduaneiro | TEXT | Recinto aduaneiro |
| urf_despacho | TEXT | URF de despacho |
| urf_entrada | TEXT | URF de entrada |
| via_transporte | TEXT | Via de transporte |
| tipo_declaracao | TEXT | Tipo de declaração |
| importador_nome | TEXT | Nome do importador |
| importador_cnpj | TEXT | CNPJ do importador |
| valor_total_mercadoria | NUMERIC | Valor total mercadoria |
| valor_frete | NUMERIC | Valor do frete |
| valor_seguro | NUMERIC | Valor do seguro |
| valor_cif | NUMERIC | Valor CIF |
| peso_liquido_total | NUMERIC | Peso líquido total |
| observacoes | TEXT | Observações |

### 14. importacao_08_2_di_adicoes

**Propósito**: Adições da DI (detalhamento por NCM).

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| numero_adicao | INTEGER | Número da adição |
| ncm | TEXT | Código NCM |
| descricao_mercadoria | TEXT | Descrição da mercadoria |
| quantidade | NUMERIC | Quantidade |
| unidade_medida | TEXT | Unidade de medida |
| valor_unitario | NUMERIC | Valor unitário |
| valor_total | NUMERIC | Valor total |
| peso_liquido | NUMERIC | Peso líquido |
| fabricante_nome | TEXT | Nome do fabricante |
| fabricante_endereco | TEXT | Endereço do fabricante |
| fornecedor_nome | TEXT | Nome do fornecedor |
| fornecedor_endereco | TEXT | Endereço do fornecedor |

### 15. importacao_08_3_di_tributos_por_adicao

**Propósito**: Tributos calculados por adição da DI.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| numero_adicao | INTEGER | Número da adição |
| tipo_tributo | TEXT | Tipo (II, IPI, PIS, COFINS, ICMS) |
| base_calculo | NUMERIC | Base de cálculo |
| aliquota | NUMERIC | Alíquota aplicada |
| valor_devido | NUMERIC | Valor devido |
| valor_recolhido | NUMERIC | Valor recolhido |
| data_pagamento | DATE | Data do pagamento |

### 16. importacao_09_1_nota_fiscal

**Propósito**: Nota fiscal de entrada da importação.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| numero_nota_fiscal | TEXT | Número da NF |
| serie | TEXT | Série da NF |
| data_emissao | DATE | Data de emissão |
| data_entrada | DATE | Data de entrada |
| natureza_operacao | TEXT | Natureza da operação |
| cfop | TEXT | CFOP |
| emitente_cnpj | TEXT | CNPJ do emitente |
| emitente_nome | TEXT | Nome do emitente |
| destinatario_cnpj | TEXT | CNPJ do destinatário |
| destinatario_nome | TEXT | Nome do destinatário |
| valor_produtos | NUMERIC | Valor dos produtos |
| valor_frete | NUMERIC | Valor do frete |
| valor_seguro | NUMERIC | Valor do seguro |
| valor_desconto | NUMERIC | Valor do desconto |
| valor_outras_despesas | NUMERIC | Outras despesas |
| valor_ipi | NUMERIC | Valor do IPI |
| valor_total | NUMERIC | Valor total da NF |
| observacoes | TEXT | Observações |

### 17. importacao_09_2_nota_fiscal_itens

**Propósito**: Itens da nota fiscal de entrada.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| item | INTEGER | Número do item |
| codigo_produto | TEXT | Código do produto |
| descricao_produto | TEXT | Descrição do produto |
| ncm | TEXT | NCM |
| cfop | TEXT | CFOP |
| unidade | TEXT | Unidade |
| quantidade | NUMERIC | Quantidade |
| valor_unitario | NUMERIC | Valor unitário |
| valor_total_produto | NUMERIC | Valor total |
| base_calculo_icms | NUMERIC | Base ICMS |
| aliquota_icms | NUMERIC | Alíquota ICMS |
| valor_icms | NUMERIC | Valor ICMS |
| aliquota_ipi | NUMERIC | Alíquota IPI |
| valor_ipi | NUMERIC | Valor IPI |
| referencia | TEXT | Referência do produto |
| nota_fiscal | TEXT | Número da NF |
| importacao_11_1_traducao_pk_nf_id | INTEGER | FK para traduções |
| Status | TEXT | Status do item |

### 18. importacao_10_1_fechamento

**Propósito**: Fechamento e resumo do processo de importação.

**Campos**:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| invoice_number | TEXT | Referência à invoice |
| importacao_01_1_proforma_invoice_id | INTEGER | FK para tabela principal |
| data_fechamento | DATE | Data do fechamento |
| numero_processo | TEXT | Número do processo |
| status_processo | TEXT | Status do processo |
| valor_total_produtos | NUMERIC | Valor total produtos |
| valor_total_impostos | NUMERIC | Valor total impostos |
| valor_total_despesas | NUMERIC | Valor total despesas |
| valor_total_processo | NUMERIC | Valor total do processo |
| observacoes_finais | TEXT | Observações finais |
| documentos_pendentes | TEXT | Documentos pendentes |
| proximos_passos | TEXT | Próximos passos |

## Fluxo de Integração com Make.com

### 1. Recepção via WhatsApp
```
WhatsApp (Z-API) → Make.com → Processamento → NocoDB
```

### 2. Processamento de Documentos
- PDF/Imagem recebido via WhatsApp
- Extração de dados (OCR/Parser)
- Validação de campos
- Inserção no NocoDB

### 3. Vinculação de Dados
- Primeiro documento gera `invoice_number`
- Todos os subsequentes referenciam via `importacao_01_1_proforma_invoice_id`
- Mantém rastreabilidade completa

## Queries Úteis para NocoDB

### 1. Buscar processo completo por invoice
```sql
-- Todos os documentos de uma importação
SELECT * FROM importacao_01_1_proforma_invoice 
WHERE invoice_number = 'INV-2024-001';

-- Com todos os relacionados
SELECT * FROM importacao_* 
WHERE invoice_number = 'INV-2024-001';
```

### 2. Status de importações em andamento
```sql
SELECT 
    pi.invoice_number,
    pi.nome_exportador,
    f.status_processo,
    f.valor_total_processo
FROM importacao_01_1_proforma_invoice pi
LEFT JOIN importacao_10_1_fechamento f 
    ON pi.id = f.importacao_01_1_proforma_invoice_id
WHERE f.status_processo != 'FECHADO' OR f.status_processo IS NULL;
```

### 3. Documentos pendentes por processo
```sql
SELECT 
    pi.invoice_number,
    CASE 
        WHEN ci.id IS NULL THEN 'Commercial Invoice'
        WHEN pl.id IS NULL THEN 'Packing List'
        WHEN bl.id IS NULL THEN 'Bill of Lading'
        WHEN di.id IS NULL THEN 'DI'
        WHEN nf.id IS NULL THEN 'Nota Fiscal'
        ELSE 'Completo'
    END as documento_pendente
FROM importacao_01_1_proforma_invoice pi
LEFT JOIN importacao_05_1_commercial_invoice ci ON pi.id = ci.importacao_01_1_proforma_invoice_id
LEFT JOIN importacao_06_1_packing_list pl ON pi.id = pl.importacao_01_1_proforma_invoice_id
LEFT JOIN importacao_07_1_bill_of_lading bl ON pi.id = bl.importacao_01_1_proforma_invoice_id
LEFT JOIN importacao_08_1_di_declaracao_importacao di ON pi.id = di.importacao_01_1_proforma_invoice_id
LEFT JOIN importacao_09_1_nota_fiscal nf ON pi.id = nf.importacao_01_1_proforma_invoice_id;
```

## Melhores Práticas

### 1. Inserção de Dados
- Sempre começar pela `importacao_01_1_proforma_invoice`
- Capturar o ID gerado para usar nas tabelas filhas
- Manter `invoice_number` consistente

### 2. Validações
- Verificar duplicidade de `invoice_number`
- Validar formatos de data e números
- Garantir integridade referencial

### 3. Integração Make.com
- Usar webhooks para notificações
- Implementar retry em caso de falha
- Log detalhado de processamento

### 4. Performance
- Indexar campos `invoice_number` e `importacao_01_1_proforma_invoice_id`
- Queries paginadas para grandes volumes
- Cache de consultas frequentes

## Conclusão

As tabelas de importação no NocoDB formam um sistema completo e integrado para gerenciar todo o ciclo de importação, desde a cotação inicial até o fechamento do processo. A integração com WhatsApp via Make.com permite automação completa da captura de documentos, mantendo rastreabilidade e organização de todo o processo.