/**
 * @fileoverview Model para Controle de Lotes - Rastreabilidade e validade
 * @author Sistema ERP NXT
 * @since 2025-07-06
 */

const { z } = require('zod');

/**
 * Schema de validação para Lote
 */
const LoteSchema = z.object({
  id_lote: z.number().optional(),
  codigo_lote: z.string().min(1, 'Código do lote é obrigatório'),
  id_produto: z.number().positive('ID do produto é obrigatório'),
  id_fornecedor: z.number().optional().nullable(),
  data_fabricacao: z.string().optional().nullable(),
  data_validade: z.string().optional().nullable(),
  data_recebimento: z.string().datetime('Data de recebimento inválida'),
  quantidade_inicial: z.number().positive('Quantidade inicial deve ser maior que zero'),
  quantidade_atual: z.number().min(0, 'Quantidade atual não pode ser negativa'),
  unidade_medida: z.string().min(1, 'Unidade de medida é obrigatória'),
  status: z.enum(['ATIVO', 'BLOQUEADO', 'VENCIDO', 'CONSUMIDO']).default('ATIVO'),
  observacoes: z.string().optional().nullable(),
  numero_nota_fiscal: z.string().optional().nullable(),
  certificado_qualidade: z.string().optional().nullable(),
  temperatura_armazenamento: z.number().optional().nullable(),
  umidade_relativa: z.number().min(0).max(100).optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

/**
 * Schema para movimentação de lote específico
 */
const MovimentacaoLoteSchema = z.object({
  id_movimentacao_lote: z.number().optional(),
  id_lote: z.number().positive('ID do lote é obrigatório'),
  id_movimentacao: z.number().positive('ID da movimentação é obrigatório'),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  tipo_operacao: z.enum(['ENTRADA', 'SAIDA', 'TRANSFERENCIA']),
  id_deposito_origem: z.number().optional().nullable(),
  id_deposito_destino: z.number().optional().nullable(),
  data_operacao: z.string().datetime('Data da operação inválida'),
  observacoes: z.string().optional().nullable(),
  created_at: z.string().optional()
});

/**
 * Schema para consulta de lotes
 */
const ConsultaLoteSchema = z.object({
  id_produto: z.number().optional(),
  codigo_lote: z.string().optional(),
  status: z.enum(['ATIVO', 'BLOQUEADO', 'VENCIDO', 'CONSUMIDO']).optional(),
  data_validade_inicio: z.string().optional(),
  data_validade_fim: z.string().optional(),
  vencendo_em_dias: z.number().min(0).optional(),
  apenas_vencidos: z.boolean().default(false),
  apenas_ativos: z.boolean().default(false),
  limite: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0)
});

/**
 * Schema para rastreabilidade
 */
const RastreabilidadeSchema = z.object({
  codigo_lote: z.string().min(1, 'Código do lote é obrigatório'),
  incluir_movimentacoes: z.boolean().default(true),
  incluir_vendas: z.boolean().default(true),
  incluir_producao: z.boolean().default(true)
});

/**
 * Políticas de FIFO/FEFO
 */
const POLITICAS_CONSUMO = {
  FIFO: 'FIRST_IN_FIRST_OUT',     // Primeiro que entra, primeiro que sai
  FEFO: 'FIRST_EXPIRED_FIRST_OUT', // Primeiro que vence, primeiro que sai
  LIFO: 'LAST_IN_FIRST_OUT',      // Último que entra, primeiro que sai
  MANUAL: 'MANUAL_SELECTION'       // Seleção manual
};

/**
 * Status possíveis para lotes
 */
const STATUS_LOTE = {
  ATIVO: 'ATIVO',
  BLOQUEADO: 'BLOQUEADO',
  VENCIDO: 'VENCIDO',
  CONSUMIDO: 'CONSUMIDO'
};

/**
 * Classe principal do modelo Lote
 */
class LoteModel {
  constructor(db) {
    this.db = db;
    this.tableLotes = 'est_05_lotes';
    this.tableMovimentacaoLotes = 'est_06_movimentacao_lotes';
    this.tableHistoricoLotes = 'est_07_historico_lotes';
  }

  /**
   * Validar dados de lote
   */
  validarLote(dados) {
    return LoteSchema.parse(dados);
  }

  /**
   * Validar movimentação de lote
   */
  validarMovimentacaoLote(dados) {
    return MovimentacaoLoteSchema.parse(dados);
  }

  /**
   * Validar consulta de lotes
   */
  validarConsultaLote(dados) {
    return ConsultaLoteSchema.parse(dados);
  }

  /**
   * Validar rastreabilidade
   */
  validarRastreabilidade(dados) {
    return RastreabilidadeSchema.parse(dados);
  }

  /**
   * Verificar se lote está vencido
   */
  isLoteVencido(dataValidade) {
    if (!dataValidade) return false;
    
    const hoje = new Date();
    const validade = new Date(dataValidade);
    
    return validade < hoje;
  }

  /**
   * Verificar se lote está vencendo em X dias
   */
  isLoteVencendoEm(dataValidade, dias) {
    if (!dataValidade) return false;
    
    const hoje = new Date();
    const validade = new Date(dataValidade);
    const limiteDias = new Date();
    limiteDias.setDate(hoje.getDate() + dias);
    
    return validade <= limiteDias && validade >= hoje;
  }

  /**
   * Calcular dias para vencimento
   */
  diasParaVencimento(dataValidade) {
    if (!dataValidade) return null;
    
    const hoje = new Date();
    const validade = new Date(dataValidade);
    const diffTime = validade - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Gerar código de lote automático
   */
  gerarCodigoLote(idProduto, dataRecebimento = null) {
    const data = dataRecebimento ? new Date(dataRecebimento) : new Date();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    const hora = String(data.getHours()).padStart(2, '0');
    const minuto = String(data.getMinutes()).padStart(2, '0');
    
    return `P${idProduto}_${ano}${mes}${dia}_${hora}${minuto}`;
  }

  /**
   * Ordenar lotes por política FIFO
   */
  ordenarLotesFIFO(lotes) {
    return lotes.sort((a, b) => {
      const dataA = new Date(a.data_recebimento);
      const dataB = new Date(b.data_recebimento);
      return dataA - dataB;
    });
  }

  /**
   * Ordenar lotes por política FEFO
   */
  ordenarLotesFEFO(lotes) {
    return lotes.sort((a, b) => {
      // Lotes sem validade vão para o final
      if (!a.data_validade && !b.data_validade) {
        return new Date(a.data_recebimento) - new Date(b.data_recebimento);
      }
      if (!a.data_validade) return 1;
      if (!b.data_validade) return -1;
      
      const validadeA = new Date(a.data_validade);
      const validadeB = new Date(b.data_validade);
      return validadeA - validadeB;
    });
  }

  /**
   * Selecionar lotes para consumo baseado na política
   */
  selecionarLotesParaConsumo(lotes, quantidadeNecessaria, politica = 'FEFO') {
    let lotesOrdenados;
    
    switch (politica) {
      case POLITICAS_CONSUMO.FIFO:
        lotesOrdenados = this.ordenarLotesFIFO(lotes);
        break;
      case POLITICAS_CONSUMO.FEFO:
        lotesOrdenados = this.ordenarLotesFEFO(lotes);
        break;
      case POLITICAS_CONSUMO.LIFO:
        lotesOrdenados = this.ordenarLotesFIFO(lotes).reverse();
        break;
      default:
        lotesOrdenados = lotes;
    }

    // Filtrar apenas lotes ativos com quantidade disponível
    const lotesDisponiveis = lotesOrdenados.filter(lote => 
      lote.status === STATUS_LOTE.ATIVO && 
      lote.quantidade_atual > 0
    );

    const lotesConsumidos = [];
    let quantidadeRestante = quantidadeNecessaria;

    for (const lote of lotesDisponiveis) {
      if (quantidadeRestante <= 0) break;

      const quantidadeConsumir = Math.min(lote.quantidade_atual, quantidadeRestante);
      
      if (quantidadeConsumir > 0) {
        lotesConsumidos.push({
          ...lote,
          quantidade_consumida: quantidadeConsumir
        });
        
        quantidadeRestante -= quantidadeConsumir;
      }
    }

    return {
      lotes: lotesConsumidos,
      quantidade_total_consumida: quantidadeNecessaria - quantidadeRestante,
      quantidade_faltante: quantidadeRestante
    };
  }

  /**
   * Verificar se produto requer controle de lote
   */
  produtoRequerControleData(produto) {
    // Critérios que indicam necessidade de controle de lote:
    // - Produtos perecíveis
    // - Produtos farmacêuticos
    // - Produtos com validade
    // - Produtos controlados
    return produto.controla_lote || 
           produto.categoria === 'FARMACEUTICO' ||
           produto.categoria === 'ALIMENTO' ||
           produto.tem_validade;
  }

  /**
   * Obter políticas de consumo
   */
  getPoliticasConsumo() {
    return POLITICAS_CONSUMO;
  }

  /**
   * Obter status de lote
   */
  getStatusLote() {
    return STATUS_LOTE;
  }
}

module.exports = {
  LoteModel,
  LoteSchema,
  MovimentacaoLoteSchema,
  ConsultaLoteSchema,
  RastreabilidadeSchema,
  POLITICAS_CONSUMO,
  STATUS_LOTE
};