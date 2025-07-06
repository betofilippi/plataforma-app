/**
 * @fileoverview Model para Estoque - Controla saldos e movimentações
 * @author Sistema ERP NXT
 * @since 2025-07-06
 */

const { z } = require('zod');

/**
 * Schema de validação para Saldo de Estoque
 */
const SaldoEstoqueSchema = z.object({
  id_saldo_estoque: z.number().optional(),
  id_produto: z.number().positive('ID do produto é obrigatório'),
  id_deposito: z.number().positive('ID do depósito é obrigatório'),
  id_endereco_estoque: z.number().optional().nullable(),
  quantidade_disponivel: z.number().min(0, 'Quantidade disponível não pode ser negativa').default(0),
  quantidade_reservada: z.number().min(0, 'Quantidade reservada não pode ser negativa').default(0),
  quantidade_total: z.number().min(0, 'Quantidade total não pode ser negativa').default(0),
  custo_medio: z.number().min(0, 'Custo médio não pode ser negativo').optional(),
  data_ultima_entrada: z.string().optional().nullable(),
  data_ultima_saida: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

/**
 * Schema de validação para Movimentação de Estoque
 */
const MovimentacaoSchema = z.object({
  id_movimentacao: z.number().optional(),
  id_tipo_movimento: z.number().positive('Tipo de movimento é obrigatório'),
  id_indicador_credito_debito: z.number().positive('Indicador crédito/débito é obrigatório'),
  id_produto: z.number().positive('ID do produto é obrigatório'),
  id_deposito: z.number().positive('ID do depósito é obrigatório'),
  id_endereco_estoque: z.number().optional().nullable(),
  data_movimento: z.string().datetime('Data de movimento inválida'),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  valor_unitario: z.number().min(0, 'Valor unitário não pode ser negativo').optional(),
  valor_total: z.number().min(0, 'Valor total não pode ser negativo').optional(),
  id_nota_fiscal: z.number().optional().nullable(),
  id_ordem_producao: z.number().optional().nullable(),
  id_compra: z.number().optional().nullable(),
  id_venda: z.number().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  lote: z.string().optional().nullable(),
  data_validade: z.string().optional().nullable(),
  numero_serie: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

/**
 * Schema para consulta de estoque
 */
const ConsultaEstoqueSchema = z.object({
  id_produto: z.number().optional(),
  id_deposito: z.number().optional(),
  codigo_produto: z.string().optional(),
  descricao: z.string().optional(),
  categoria: z.string().optional(),
  apenas_com_saldo: z.boolean().default(false),
  limite: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0)
});

/**
 * Schema para filtros de movimentação
 */
const FiltroMovimentacaoSchema = z.object({
  id_produto: z.number().optional(),
  id_deposito: z.number().optional(),
  tipo_movimento: z.string().optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  id_compra: z.number().optional(),
  id_venda: z.number().optional(),
  lote: z.string().optional(),
  limite: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0)
});

/**
 * Schema para transferência entre depósitos
 */
const TransferenciaSchema = z.object({
  id_produto: z.number().positive('ID do produto é obrigatório'),
  id_deposito_origem: z.number().positive('Depósito origem é obrigatório'),
  id_deposito_destino: z.number().positive('Depósito destino é obrigatório'),
  id_endereco_origem: z.number().optional().nullable(),
  id_endereco_destino: z.number().optional().nullable(),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  observacoes: z.string().optional().nullable(),
  lote: z.string().optional().nullable()
}).refine(data => data.id_deposito_origem !== data.id_deposito_destino, {
  message: "Depósitos de origem e destino devem ser diferentes"
});

/**
 * Schema para reserva de estoque
 */
const ReservaEstoqueSchema = z.object({
  id_produto: z.number().positive('ID do produto é obrigatório'),
  id_deposito: z.number().positive('ID do depósito é obrigatório'),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  id_venda: z.number().optional().nullable(),
  data_validade_reserva: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable()
});

/**
 * Tipos de movimento padrão
 */
const TIPOS_MOVIMENTO = {
  ENTRADA: {
    COMPRA: 'ENT_COMPRA',
    PRODUCAO: 'ENT_PRODUCAO',
    DEVOLUCAO: 'ENT_DEVOLUCAO',
    AJUSTE_POSITIVO: 'ENT_AJUSTE_POS',
    TRANSFERENCIA: 'ENT_TRANSFERENCIA'
  },
  SAIDA: {
    VENDA: 'SAI_VENDA',
    TRANSFERENCIA: 'SAI_TRANSFERENCIA',
    CONSUMO: 'SAI_CONSUMO',
    PERDA: 'SAI_PERDA',
    AJUSTE_NEGATIVO: 'SAI_AJUSTE_NEG'
  }
};

/**
 * Indicadores de crédito/débito
 */
const INDICADORES_CD = {
  CREDITO: 'CRE', // Aumenta estoque
  DEBITO: 'DEB'   // Diminui estoque
};

/**
 * Classe principal do modelo Estoque
 */
class EstoqueModel {
  constructor(db) {
    this.db = db;
    this.tableSaldos = 'est_03_saldos_estoque';
    this.tableMovimentacoes = 'est_04_movimentacoes';
    this.tableTiposMovimento = 'est_01_tipos_movimento';
    this.tableIndicadoresCD = 'est_02_indicadores_cd';
  }

  /**
   * Validar dados de saldo
   */
  validarSaldo(dados) {
    return SaldoEstoqueSchema.parse(dados);
  }

  /**
   * Validar dados de movimentação
   */
  validarMovimentacao(dados) {
    return MovimentacaoSchema.parse(dados);
  }

  /**
   * Validar dados de consulta
   */
  validarConsulta(dados) {
    return ConsultaEstoqueSchema.parse(dados);
  }

  /**
   * Validar dados de transferência
   */
  validarTransferencia(dados) {
    return TransferenciaSchema.parse(dados);
  }

  /**
   * Validar dados de reserva
   */
  validarReserva(dados) {
    return ReservaEstoqueSchema.parse(dados);
  }

  /**
   * Obter tipos de movimento
   */
  getTiposMovimento() {
    return TIPOS_MOVIMENTO;
  }

  /**
   * Obter indicadores de crédito/débito
   */
  getIndicadoresCD() {
    return INDICADORES_CD;
  }

  /**
   * Calcular quantidade total (disponível + reservada)
   */
  calcularQuantidadeTotal(disponivel, reservada) {
    return (disponivel || 0) + (reservada || 0);
  }

  /**
   * Verificar se tem saldo suficiente
   */
  temSaldoSuficiente(saldoAtual, quantidadeNecessaria) {
    return (saldoAtual?.quantidade_disponivel || 0) >= quantidadeNecessaria;
  }

  /**
   * Calcular novo custo médio
   */
  calcularCustoMedio(custoAtual, quantidadeAtual, novoValor, novaQuantidade) {
    const valorTotal = (custoAtual * quantidadeAtual) + (novoValor * novaQuantidade);
    const quantidadeTotal = quantidadeAtual + novaQuantidade;
    
    return quantidadeTotal > 0 ? valorTotal / quantidadeTotal : 0;
  }
}

module.exports = {
  EstoqueModel,
  SaldoEstoqueSchema,
  MovimentacaoSchema,
  ConsultaEstoqueSchema,
  FiltroMovimentacaoSchema,
  TransferenciaSchema,
  ReservaEstoqueSchema,
  TIPOS_MOVIMENTO,
  INDICADORES_CD
};