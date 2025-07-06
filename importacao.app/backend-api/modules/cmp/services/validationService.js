const { z } = require('zod');

// Purchase Order Item Schema
const purchaseOrderItemSchema = z.object({
  id_produto: z.number().int().positive('ID do produto deve ser um número positivo'),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  preco_unitario: z.number().positive('Preço unitário deve ser maior que zero'),
  desconto_percentual: z.number().min(0).max(100).optional(),
  observacoes: z.string().optional()
});

// Purchase Order Schema
const purchaseOrderSchema = z.object({
  id_fornecedor: z.number().int().positive('ID do fornecedor é obrigatório'),
  id_empresa: z.number().int().positive('ID da empresa é obrigatório'),
  id_usuario_solicitante: z.number().int().positive().optional(),
  data_necessidade: z.string().datetime('Data de necessidade deve ser uma data válida').optional(),
  descricao: z.string().min(1, 'Descrição é obrigatória').max(500, 'Descrição deve ter no máximo 500 caracteres'),
  observacoes: z.string().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional(),
  urgente: z.boolean().optional(),
  centro_custo: z.string().max(100, 'Centro de custo deve ter no máximo 100 caracteres').optional(),
  condicao_pagamento: z.string().max(200, 'Condição de pagamento deve ter no máximo 200 caracteres').optional(),
  forma_pagamento: z.string().max(100, 'Forma de pagamento deve ter no máximo 100 caracteres').optional(),
  prazo_entrega: z.number().int().min(0, 'Prazo de entrega deve ser maior ou igual a zero').optional(),
  local_entrega: z.string().max(500, 'Local de entrega deve ter no máximo 500 caracteres').optional(),
  itens: z.array(purchaseOrderItemSchema).min(1, 'Deve haver pelo menos um item no pedido')
});

// Purchase Order Update Schema (partial)
const purchaseOrderUpdateSchema = z.object({
  id_fornecedor: z.number().int().positive().optional(),
  data_necessidade: z.string().datetime().optional(),
  descricao: z.string().min(1).max(500).optional(),
  observacoes: z.string().max(1000).optional(),
  urgente: z.boolean().optional(),
  centro_custo: z.string().max(100).optional(),
  condicao_pagamento: z.string().max(200).optional(),
  forma_pagamento: z.string().max(100).optional(),
  prazo_entrega: z.number().int().min(0).optional(),
  local_entrega: z.string().max(500).optional(),
  itens: z.array(purchaseOrderItemSchema).optional()
});

// Purchase Order Filters Schema
const purchaseOrderFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO', 'ENTREGUE']).optional(),
  id_fornecedor: z.string().optional(),
  data_inicial: z.string().optional(),
  data_final: z.string().optional(),
  aprovado: z.string().optional(),
  urgente: z.string().optional(),
  centro_custo: z.string().optional()
});

// Quotation Schema
const quotationSchema = z.object({
  id_fornecedor: z.number().int().positive('ID do fornecedor é obrigatório'),
  id_empresa: z.number().int().positive('ID da empresa é obrigatório'),
  numero_cotacao: z.string().min(1, 'Número da cotação é obrigatório').max(50),
  descricao: z.string().min(1, 'Descrição é obrigatória').max(500),
  data_validade: z.string().datetime('Data de validade deve ser uma data válida'),
  observacoes: z.string().max(1000).optional(),
  condicao_pagamento: z.string().max(200).optional(),
  prazo_entrega: z.number().int().min(0).optional(),
  frete_incluso: z.boolean().optional(),
  valor_frete: z.number().min(0).optional(),
  itens: z.array(z.object({
    id_produto: z.number().int().positive(),
    quantidade: z.number().positive(),
    preco_unitario: z.number().positive(),
    desconto_percentual: z.number().min(0).max(100).optional(),
    observacoes: z.string().optional()
  })).min(1, 'Deve haver pelo menos um item na cotação')
});

// Supplier Performance Schema
const supplierPerformanceSchema = z.object({
  id_fornecedor: z.number().int().positive('ID do fornecedor é obrigatório'),
  periodo_inicio: z.string().datetime('Data de início deve ser uma data válida'),
  periodo_fim: z.string().datetime('Data de fim deve ser uma data válida'),
  nota_qualidade: z.number().min(1).max(10).optional(),
  nota_prazo: z.number().min(1).max(10).optional(),
  nota_preco: z.number().min(1).max(10).optional(),
  observacoes: z.string().max(1000).optional()
});

// Purchase Requisition Schema
const purchaseRequisitionSchema = z.object({
  id_empresa: z.number().int().positive('ID da empresa é obrigatório'),
  id_usuario_solicitante: z.number().int().positive().optional(),
  departamento: z.string().min(1, 'Departamento é obrigatório').max(100),
  justificativa: z.string().min(1, 'Justificativa é obrigatória').max(1000),
  data_necessidade: z.string().datetime('Data de necessidade deve ser uma data válida'),
  urgente: z.boolean().optional(),
  centro_custo: z.string().max(100).optional(),
  itens: z.array(z.object({
    id_produto: z.number().int().positive().optional(),
    descricao_item: z.string().min(1, 'Descrição do item é obrigatória').max(200),
    quantidade: z.number().positive(),
    especificacoes: z.string().max(500).optional(),
    fornecedor_sugerido: z.string().max(200).optional(),
    valor_estimado: z.number().min(0).optional()
  })).min(1, 'Deve haver pelo menos um item na requisição')
});

// Budget Comparison Schema
const budgetComparisonSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória').max(200),
  observacoes: z.string().max(1000).optional(),
  itens: z.array(z.object({
    id_produto: z.number().int().positive(),
    quantidade: z.number().positive(),
    especificacoes: z.string().max(500).optional()
  })).min(1, 'Deve haver pelo menos um item para comparação'),
  fornecedores: z.array(z.number().int().positive()).min(2, 'Deve haver pelo menos 2 fornecedores para comparação')
});

module.exports = {
  purchaseOrderSchema,
  purchaseOrderUpdateSchema,
  purchaseOrderFiltersSchema,
  quotationSchema,
  supplierPerformanceSchema,
  purchaseRequisitionSchema,
  budgetComparisonSchema
};