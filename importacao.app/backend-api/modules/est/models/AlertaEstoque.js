/**
 * @fileoverview Model para Alertas de Estoque - Monitoramento e notificações
 * @author Sistema ERP NXT
 * @since 2025-07-06
 */

const { z } = require('zod');

/**
 * Schema de validação para Configuração de Alerta
 */
const ConfiguracaoAlertaSchema = z.object({
  id_configuracao: z.number().optional(),
  id_produto: z.number().positive('ID do produto é obrigatório'),
  id_deposito: z.number().optional().nullable(),
  tipo_alerta: z.enum(['MINIMO', 'MAXIMO', 'VENCIMENTO', 'RUPTURA', 'EXCESSO']),
  valor_limite: z.number().min(0, 'Valor limite não pode ser negativo'),
  dias_antecedencia: z.number().min(1).max(365).optional().nullable(),
  ativo: z.boolean().default(true),
  envia_email: z.boolean().default(true),
  emails_notificacao: z.string().optional().nullable(),
  envia_sistema: z.boolean().default(true),
  usuarios_notificacao: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

/**
 * Schema de validação para Alerta Gerado
 */
const AlertaGeradoSchema = z.object({
  id_alerta: z.number().optional(),
  id_configuracao: z.number().positive('ID da configuração é obrigatório'),
  id_produto: z.number().positive('ID do produto é obrigatório'),
  id_deposito: z.number().optional().nullable(),
  tipo_alerta: z.enum(['MINIMO', 'MAXIMO', 'VENCIMENTO', 'RUPTURA', 'EXCESSO']),
  titulo: z.string().min(1, 'Título é obrigatório'),
  mensagem: z.string().min(1, 'Mensagem é obrigatória'),
  valor_atual: z.number().optional().nullable(),
  valor_limite: z.number().optional().nullable(),
  criticidade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).default('MEDIA'),
  status: z.enum(['PENDENTE', 'VISUALIZADO', 'RESOLVIDO', 'IGNORADO']).default('PENDENTE'),
  data_geracao: z.string().datetime('Data de geração inválida'),
  data_visualizacao: z.string().optional().nullable(),
  data_resolucao: z.string().optional().nullable(),
  resolvido_por: z.string().optional().nullable(),
  observacoes_resolucao: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

/**
 * Schema para filtros de alertas
 */
const FiltroAlertasSchema = z.object({
  tipo_alerta: z.enum(['MINIMO', 'MAXIMO', 'VENCIMENTO', 'RUPTURA', 'EXCESSO']).optional(),
  criticidade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']).optional(),
  status: z.enum(['PENDENTE', 'VISUALIZADO', 'RESOLVIDO', 'IGNORADO']).optional(),
  id_produto: z.number().optional(),
  id_deposito: z.number().optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  apenas_nao_resolvidos: z.boolean().default(false),
  limite: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0)
});

/**
 * Schema para notificação
 */
const NotificacaoSchema = z.object({
  tipo: z.enum(['EMAIL', 'SISTEMA', 'SMS', 'PUSH']),
  destinatarios: z.array(z.string()),
  titulo: z.string().min(1, 'Título é obrigatório'),
  mensagem: z.string().min(1, 'Mensagem é obrigatória'),
  prioridade: z.enum(['BAIXA', 'NORMAL', 'ALTA', 'URGENTE']).default('NORMAL'),
  dados_contexto: z.object({}).optional()
});

/**
 * Tipos de alerta
 */
const TIPOS_ALERTA = {
  MINIMO: {
    codigo: 'MINIMO',
    descricao: 'Estoque abaixo do mínimo',
    icone: 'warning',
    cor: '#f59e0b'
  },
  MAXIMO: {
    codigo: 'MAXIMO',
    descricao: 'Estoque acima do máximo',
    icone: 'info',
    cor: '#3b82f6'
  },
  VENCIMENTO: {
    codigo: 'VENCIMENTO',
    descricao: 'Produto próximo ao vencimento',
    icone: 'clock',
    cor: '#f97316'
  },
  RUPTURA: {
    codigo: 'RUPTURA',
    descricao: 'Produto em ruptura (zerado)',
    icone: 'alert-triangle',
    cor: '#ef4444'
  },
  EXCESSO: {
    codigo: 'EXCESSO',
    descricao: 'Excesso de estoque',
    icone: 'trending-up',
    cor: '#6366f1'
  }
};

/**
 * Níveis de criticidade
 */
const CRITICIDADE = {
  BAIXA: {
    codigo: 'BAIXA',
    peso: 1,
    cor: '#10b981',
    tempo_resolucao_horas: 168 // 7 dias
  },
  MEDIA: {
    codigo: 'MEDIA',
    peso: 2,
    cor: '#f59e0b',
    tempo_resolucao_horas: 72 // 3 dias
  },
  ALTA: {
    codigo: 'ALTA',
    peso: 3,
    cor: '#f97316',
    tempo_resolucao_horas: 24 // 1 dia
  },
  CRITICA: {
    codigo: 'CRITICA',
    peso: 4,
    cor: '#ef4444',
    tempo_resolucao_horas: 4 // 4 horas
  }
};

/**
 * Status de alerta
 */
const STATUS_ALERTA = {
  PENDENTE: 'PENDENTE',
  VISUALIZADO: 'VISUALIZADO',
  RESOLVIDO: 'RESOLVIDO',
  IGNORADO: 'IGNORADO'
};

/**
 * Classe principal do modelo AlertaEstoque
 */
class AlertaEstoqueModel {
  constructor(db) {
    this.db = db;
    this.tableConfiguracoes = 'est_08_configuracao_alertas';
    this.tableAlertas = 'est_09_alertas_gerados';
    this.tableNotificacoes = 'est_10_notificacoes';
  }

  /**
   * Validar configuração de alerta
   */
  validarConfiguracao(dados) {
    return ConfiguracaoAlertaSchema.parse(dados);
  }

  /**
   * Validar alerta gerado
   */
  validarAlerta(dados) {
    return AlertaGeradoSchema.parse(dados);
  }

  /**
   * Validar filtros de alertas
   */
  validarFiltros(dados) {
    return FiltroAlertasSchema.parse(dados);
  }

  /**
   * Validar notificação
   */
  validarNotificacao(dados) {
    return NotificacaoSchema.parse(dados);
  }

  /**
   * Determinar criticidade do alerta
   */
  determinarCriticidade(tipoAlerta, valorAtual, valorLimite, diasVencimento = null) {
    switch (tipoAlerta) {
      case 'RUPTURA':
        return 'CRITICA';
        
      case 'MINIMO':
        const percentualMinimo = valorLimite > 0 ? (valorAtual / valorLimite) * 100 : 0;
        if (percentualMinimo <= 25) return 'CRITICA';
        if (percentualMinimo <= 50) return 'ALTA';
        if (percentualMinimo <= 75) return 'MEDIA';
        return 'BAIXA';
        
      case 'VENCIMENTO':
        if (diasVencimento <= 0) return 'CRITICA';
        if (diasVencimento <= 3) return 'ALTA';
        if (diasVencimento <= 7) return 'MEDIA';
        return 'BAIXA';
        
      case 'MAXIMO':
        const percentualMaximo = valorLimite > 0 ? (valorAtual / valorLimite) * 100 : 0;
        if (percentualMaximo >= 200) return 'ALTA';
        if (percentualMaximo >= 150) return 'MEDIA';
        return 'BAIXA';
        
      case 'EXCESSO':
        return 'MEDIA';
        
      default:
        return 'MEDIA';
    }
  }

  /**
   * Gerar título do alerta
   */
  gerarTituloAlerta(tipoAlerta, produto, deposito = null) {
    const nomeDeposito = deposito ? ` (${deposito.descricao})` : '';
    
    switch (tipoAlerta) {
      case 'MINIMO':
        return `Estoque Mínimo: ${produto.descricao}${nomeDeposito}`;
      case 'MAXIMO':
        return `Estoque Máximo: ${produto.descricao}${nomeDeposito}`;
      case 'VENCIMENTO':
        return `Vencimento Próximo: ${produto.descricao}${nomeDeposito}`;
      case 'RUPTURA':
        return `Produto em Ruptura: ${produto.descricao}${nomeDeposito}`;
      case 'EXCESSO':
        return `Excesso de Estoque: ${produto.descricao}${nomeDeposito}`;
      default:
        return `Alerta de Estoque: ${produto.descricao}${nomeDeposito}`;
    }
  }

  /**
   * Gerar mensagem do alerta
   */
  gerarMensagemAlerta(tipoAlerta, dados) {
    const { produto, valorAtual, valorLimite, diasVencimento, deposito } = dados;
    const nomeDeposito = deposito ? ` no depósito ${deposito.descricao}` : '';
    
    switch (tipoAlerta) {
      case 'MINIMO':
        return `O produto ${produto.descricao}${nomeDeposito} está com estoque abaixo do mínimo. ` +
               `Quantidade atual: ${valorAtual} ${produto.unidade_medida}. ` +
               `Estoque mínimo: ${valorLimite} ${produto.unidade_medida}.`;
               
      case 'MAXIMO':
        return `O produto ${produto.descricao}${nomeDeposito} está com estoque acima do máximo. ` +
               `Quantidade atual: ${valorAtual} ${produto.unidade_medida}. ` +
               `Estoque máximo: ${valorLimite} ${produto.unidade_medida}.`;
               
      case 'VENCIMENTO':
        return `O produto ${produto.descricao}${nomeDeposito} possui lotes vencendo em ${diasVencimento} dias. ` +
               `Verifique os lotes e tome as ações necessárias.`;
               
      case 'RUPTURA':
        return `O produto ${produto.descricao}${nomeDeposito} está em ruptura (estoque zerado). ` +
               `É necessário reabastecer urgentemente.`;
               
      case 'EXCESSO':
        return `O produto ${produto.descricao}${nomeDeposito} apresenta excesso de estoque. ` +
               `Quantidade atual: ${valorAtual} ${produto.unidade_medida}. ` +
               `Considere ações para reduzir o estoque.`;
               
      default:
        return `Alerta gerado para o produto ${produto.descricao}${nomeDeposito}.`;
    }
  }

  /**
   * Verificar se alerta já foi gerado recentemente
   */
  async verificarAlertaRecente(idProduto, idDeposito, tipoAlerta, horasLimite = 24) {
    const dataLimite = new Date();
    dataLimite.setHours(dataLimite.getHours() - horasLimite);
    
    // Esta verificação seria implementada na camada de service
    // que tem acesso ao banco de dados
    return false;
  }

  /**
   * Calcular próxima verificação
   */
  calcularProximaVerificacao(tipoAlerta, criticidade) {
    const intervalos = {
      'MINIMO': { 'CRITICA': 1, 'ALTA': 2, 'MEDIA': 6, 'BAIXA': 12 },
      'MAXIMO': { 'CRITICA': 2, 'ALTA': 4, 'MEDIA': 8, 'BAIXA': 24 },
      'VENCIMENTO': { 'CRITICA': 1, 'ALTA': 2, 'MEDIA': 4, 'BAIXA': 8 },
      'RUPTURA': { 'CRITICA': 0.5, 'ALTA': 1, 'MEDIA': 2, 'BAIXA': 4 },
      'EXCESSO': { 'CRITICA': 4, 'ALTA': 8, 'MEDIA': 12, 'BAIXA': 24 }
    };
    
    const horasIntervalo = intervalos[tipoAlerta]?.[criticidade] || 6;
    const proximaVerificacao = new Date();
    proximaVerificacao.setHours(proximaVerificacao.getHours() + horasIntervalo);
    
    return proximaVerificacao;
  }

  /**
   * Obter tipos de alerta
   */
  getTiposAlerta() {
    return TIPOS_ALERTA;
  }

  /**
   * Obter níveis de criticidade
   */
  getCriticidade() {
    return CRITICIDADE;
  }

  /**
   * Obter status de alerta
   */
  getStatusAlerta() {
    return STATUS_ALERTA;
  }

  /**
   * Formatar dados para exibição
   */
  formatarParaExibicao(alerta) {
    const tipoInfo = TIPOS_ALERTA[alerta.tipo_alerta];
    const criticidadeInfo = CRITICIDADE[alerta.criticidade];
    
    return {
      ...alerta,
      tipo_info: tipoInfo,
      criticidade_info: criticidadeInfo,
      tempo_pendente: this.calcularTempoPendente(alerta.data_geracao),
      vencido: this.isAlertaVencido(alerta.data_geracao, alerta.criticidade)
    };
  }

  /**
   * Calcular tempo pendente
   */
  calcularTempoPendente(dataGeracao) {
    const agora = new Date();
    const geracao = new Date(dataGeracao);
    const diffMs = agora - geracao;
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffHoras / 24);
    
    if (diffDias > 0) {
      return `${diffDias} dia(s)`;
    } else if (diffHoras > 0) {
      return `${diffHoras} hora(s)`;
    } else {
      const diffMinutos = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutos} minuto(s)`;
    }
  }

  /**
   * Verificar se alerta está vencido
   */
  isAlertaVencido(dataGeracao, criticidade) {
    const agora = new Date();
    const geracao = new Date(dataGeracao);
    const diffHoras = (agora - geracao) / (1000 * 60 * 60);
    const tempoLimite = CRITICIDADE[criticidade]?.tempo_resolucao_horas || 72;
    
    return diffHoras > tempoLimite;
  }
}

module.exports = {
  AlertaEstoqueModel,
  ConfiguracaoAlertaSchema,
  AlertaGeradoSchema,
  FiltroAlertasSchema,
  NotificacaoSchema,
  TIPOS_ALERTA,
  CRITICIDADE,
  STATUS_ALERTA
};