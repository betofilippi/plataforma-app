const { z } = require('zod');

// Sales Order Item Schema
const salesOrderItemSchema = z.object({
  id_produto: z.number().int().positive('ID do produto deve ser um número positivo'),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  preco_unitario: z.number().positive('Preço unitário deve ser maior que zero'),
  desconto_percentual: z.number().min(0).max(100).optional(),
  observacoes: z.string().optional()
});

// Sales Order Schema
const salesOrderSchema = z.object({
  id_cliente: z.number().int().positive('ID do cliente é obrigatório'),
  id_empresa: z.number().int().positive('ID da empresa é obrigatório'),
  id_vendedor: z.number().int().positive().optional(),
  id_lista_precos: z.number().int().positive().optional(),
  data_entrega: z.string().datetime('Data de entrega deve ser uma data válida').optional(),
  observacoes: z.string().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional(),
  observacoes_internas: z.string().max(1000, 'Observações internas devem ter no máximo 1000 caracteres').optional(),
  condicao_pagamento: z.string().max(200, 'Condição de pagamento deve ter no máximo 200 caracteres').optional(),
  forma_pagamento: z.string().max(100, 'Forma de pagamento deve ter no máximo 100 caracteres').optional(),
  prazo_entrega: z.number().int().min(0, 'Prazo de entrega deve ser maior ou igual a zero').optional(),
  local_entrega: z.string().max(500, 'Local de entrega deve ter no máximo 500 caracteres').optional(),
  valor_frete: z.number().min(0, 'Valor do frete deve ser maior ou igual a zero').optional(),
  desconto_geral: z.number().min(0).max(100, 'Desconto geral deve estar entre 0 e 100%').optional(),
  itens: z.array(salesOrderItemSchema).min(1, 'Deve haver pelo menos um item no pedido')
});

// Sales Order Update Schema (partial)
const salesOrderUpdateSchema = z.object({
  id_cliente: z.number().int().positive().optional(),
  id_vendedor: z.number().int().positive().optional(),
  id_lista_precos: z.number().int().positive().optional(),
  data_entrega: z.string().datetime().optional(),
  observacoes: z.string().max(1000).optional(),
  observacoes_internas: z.string().max(1000).optional(),
  condicao_pagamento: z.string().max(200).optional(),
  forma_pagamento: z.string().max(100).optional(),
  prazo_entrega: z.number().int().min(0).optional(),
  local_entrega: z.string().max(500).optional(),
  valor_frete: z.number().min(0).optional(),
  desconto_geral: z.number().min(0).max(100).optional(),
  itens: z.array(salesOrderItemSchema).optional()
});

// Sales Quotation Schema
const salesQuotationSchema = z.object({
  id_cliente: z.number().int().positive('ID do cliente é obrigatório'),
  id_empresa: z.number().int().positive('ID da empresa é obrigatório'),
  id_vendedor: z.number().int().positive().optional(),
  numero_orcamento: z.string().min(1, 'Número do orçamento é obrigatório').max(50),
  descricao: z.string().min(1, 'Descrição é obrigatória').max(500),
  data_validade: z.string().datetime('Data de validade deve ser uma data válida'),
  observacoes: z.string().max(1000).optional(),
  condicao_pagamento: z.string().max(200).optional(),
  forma_pagamento: z.string().max(100).optional(),
  prazo_entrega: z.number().int().min(0).optional(),
  valor_frete: z.number().min(0).optional(),
  desconto_geral: z.number().min(0).max(100).optional(),
  itens: z.array(salesOrderItemSchema).min(1, 'Deve haver pelo menos um item no orçamento')
});

// Customer Schema (complementing CAD module)
const customerUpdateSchema = z.object({
  vendedor_responsavel: z.number().int().positive().optional(),
  limite_credito: z.number().min(0).optional(),
  dias_prazo_pagamento: z.number().int().min(0).optional(),
  observacoes_vendas: z.string().max(1000).optional(),
  classificacao_vendas: z.enum(['A', 'B', 'C', 'D']).optional(),
  canal_preferencial: z.string().max(100).optional()
});

// Sales Pipeline Schema
const salesPipelineSchema = z.object({
  id_cliente: z.number().int().positive('ID do cliente é obrigatório'),
  id_vendedor: z.number().int().positive('ID do vendedor é obrigatório'),
  id_empresa: z.number().int().positive('ID da empresa é obrigatório'),
  titulo: z.string().min(1, 'Título é obrigatório').max(200),
  descricao: z.string().max(1000).optional(),
  valor_estimado: z.number().min(0, 'Valor estimado deve ser maior ou igual a zero'),
  probabilidade: z.number().min(0).max(100, 'Probabilidade deve estar entre 0 e 100%'),
  data_fechamento_prevista: z.string().datetime('Data de fechamento deve ser uma data válida'),
  origem_lead: z.string().max(100).optional(),
  observacoes: z.string().max(1000).optional()
});

// Sales Pipeline Update Schema
const salesPipelineUpdateSchema = z.object({
  titulo: z.string().min(1).max(200).optional(),
  descricao: z.string().max(1000).optional(),
  valor_estimado: z.number().min(0).optional(),
  probabilidade: z.number().min(0).max(100).optional(),
  data_fechamento_prevista: z.string().datetime().optional(),
  estagio: z.enum(['PROSPECCAO', 'QUALIFICACAO', 'PROPOSTA', 'NEGOCIACAO', 'FECHAMENTO', 'GANHO', 'PERDIDO']).optional(),
  observacoes: z.string().max(1000).optional()
});

// Commission Schema
const commissionSchema = z.object({
  id_vendedor: z.number().int().positive('ID do vendedor é obrigatório'),
  id_pedido_venda: z.number().int().positive().optional(),
  id_produto: z.number().int().positive().optional(),
  tipo_comissao: z.enum(['FIXA', 'PERCENTUAL', 'MISTA'], 'Tipo de comissão inválido'),
  valor_fixo: z.number().min(0).optional(),
  percentual: z.number().min(0).max(100).optional(),
  valor_base: z.number().min(0, 'Valor base deve ser maior ou igual a zero'),
  valor_comissao: z.number().min(0, 'Valor da comissão deve ser maior ou igual a zero'),
  data_referencia: z.string().datetime('Data de referência deve ser uma data válida'),
  observacoes: z.string().max(500).optional()
});

// Sales Target Schema
const salesTargetSchema = z.object({
  id_vendedor: z.number().int().positive('ID do vendedor é obrigatório'),
  id_empresa: z.number().int().positive('ID da empresa é obrigatório'),
  ano: z.number().int().min(2000).max(2100, 'Ano deve estar entre 2000 e 2100'),
  mes: z.number().int().min(1).max(12, 'Mês deve estar entre 1 e 12'),
  meta_valor: z.number().min(0, 'Meta de valor deve ser maior ou igual a zero'),
  meta_quantidade: z.number().int().min(0, 'Meta de quantidade deve ser maior ou igual a zero').optional(),
  categoria_produto: z.string().max(100).optional(),
  observacoes: z.string().max(500).optional()
});

// Sales Report Filters Schema
const salesReportFiltersSchema = z.object({
  data_inicial: z.string().datetime('Data inicial deve ser uma data válida'),
  data_final: z.string().datetime('Data final deve ser uma data válida'),
  id_vendedor: z.number().int().positive().optional(),
  id_cliente: z.number().int().positive().optional(),
  id_produto: z.number().int().positive().optional(),
  categoria_produto: z.string().optional(),
  status: z.string().optional(),
  forma_pagamento: z.string().optional()
});

// Customer Interaction Schema
const customerInteractionSchema = z.object({
  id_cliente: z.number().int().positive('ID do cliente é obrigatório'),
  id_vendedor: z.number().int().positive('ID do vendedor é obrigatório'),
  tipo_interacao: z.enum(['LIGACAO', 'EMAIL', 'REUNIAO', 'VISITA', 'WHATSAPP', 'PROPOSTA'], 'Tipo de interação inválido'),
  assunto: z.string().min(1, 'Assunto é obrigatório').max(200),
  descricao: z.string().min(1, 'Descrição é obrigatória').max(1000),
  data_interacao: z.string().datetime('Data da interação deve ser uma data válida'),
  duracao_minutos: z.number().int().min(0).optional(),
  resultado: z.enum(['POSITIVO', 'NEGATIVO', 'NEUTRO', 'AGENDAMENTO']).optional(),
  proxima_acao: z.string().max(500).optional(),
  data_proxima_acao: z.string().datetime().optional(),
  anexos: z.array(z.string()).optional(),
  observacoes: z.string().max(500).optional()
});

// Customer Interaction Update Schema
const customerInteractionUpdateSchema = z.object({
  assunto: z.string().min(1).max(200).optional(),
  descricao: z.string().min(1).max(1000).optional(),
  duracao_minutos: z.number().int().min(0).optional(),
  resultado: z.enum(['POSITIVO', 'NEGATIVO', 'NEUTRO', 'AGENDAMENTO']).optional(),
  proxima_acao: z.string().max(500).optional(),
  data_proxima_acao: z.string().datetime().optional(),
  anexos: z.array(z.string()).optional(),
  observacoes: z.string().max(500).optional()
});

// Sales Dashboard Filters Schema
const salesDashboardFiltersSchema = z.object({
  periodo: z.enum(['HOJE', 'SEMANA', 'MES', 'TRIMESTRE', 'ANO', 'PERSONALIZADO']).optional(),
  data_inicial: z.string().datetime().optional(),
  data_final: z.string().datetime().optional(),
  id_vendedor: z.number().int().positive().optional(),
  id_cliente: z.number().int().positive().optional(),
  categoria_produto: z.string().optional(),
  status: z.string().optional()
});

// Sales Forecast Schema
const salesForecastSchema = z.object({
  id_vendedor: z.number().int().positive('ID do vendedor é obrigatório'),
  ano: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
  valor_previsto: z.number().min(0, 'Valor previsto deve ser maior ou igual a zero'),
  quantidade_prevista: z.number().int().min(0, 'Quantidade prevista deve ser maior ou igual a zero'),
  observacoes: z.string().max(500).optional()
});

// Advanced Sales Order Search Schema
const advancedSalesOrderSearchSchema = z.object({
  search: z.string().optional(),
  status: z.array(z.string()).optional(),
  data_inicial: z.string().datetime().optional(),
  data_final: z.string().datetime().optional(),
  id_vendedor: z.array(z.number().int().positive()).optional(),
  id_cliente: z.array(z.number().int().positive()).optional(),
  forma_pagamento: z.array(z.string()).optional(),
  valor_min: z.number().min(0).optional(),
  valor_max: z.number().min(0).optional(),
  com_desconto: z.boolean().optional(),
  urgente: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional()
});

module.exports = {
  salesOrderSchema,
  salesOrderUpdateSchema,
  salesQuotationSchema,
  customerUpdateSchema,
  salesPipelineSchema,
  salesPipelineUpdateSchema,
  commissionSchema,
  salesTargetSchema,
  salesReportFiltersSchema,
  customerInteractionSchema,
  customerInteractionUpdateSchema,
  salesDashboardFiltersSchema,
  salesForecastSchema,
  advancedSalesOrderSearchSchema
};