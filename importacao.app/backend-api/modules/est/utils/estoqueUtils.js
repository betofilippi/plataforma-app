/**
 * @fileoverview Utilitários para o módulo EST - Funções auxiliares para operações de estoque
 * @author Sistema ERP NXT
 * @since 2025-07-06
 */

/**
 * Utilitários para cálculos de estoque
 */
class EstoqueUtils {

  /**
   * Calcular custo médio ponderado
   */
  static calcularCustoMedio(quantidadeAnterior, custoAnterior, quantidadeNova, custoNovo) {
    const quantidadeTotal = quantidadeAnterior + quantidadeNova;
    
    if (quantidadeTotal === 0) {
      return 0;
    }

    const valorAnterior = quantidadeAnterior * custoAnterior;
    const valorNovo = quantidadeNova * custoNovo;
    const valorTotal = valorAnterior + valorNovo;

    return valorTotal / quantidadeTotal;
  }

  /**
   * Verificar se quantidade é suficiente
   */
  static verificarQuantidadeSuficiente(quantidadeDisponivel, quantidadeSolicitada, tolerancia = 0) {
    return quantidadeDisponivel >= (quantidadeSolicitada - tolerancia);
  }

  /**
   * Calcular ABC de produtos por valor
   */
  static calcularClassificacaoABC(produtos) {
    // Ordenar produtos por valor total (quantidade * custo)
    const produtosOrdenados = produtos
      .map(produto => ({
        ...produto,
        valor_total: produto.quantidade_total * produto.custo_medio
      }))
      .sort((a, b) => b.valor_total - a.valor_total);

    const valorTotal = produtosOrdenados.reduce((acc, produto) => acc + produto.valor_total, 0);
    let valorAcumulado = 0;

    return produtosOrdenados.map(produto => {
      valorAcumulado += produto.valor_total;
      const percentualAcumulado = (valorAcumulado / valorTotal) * 100;

      let classificacao;
      if (percentualAcumulado <= 80) {
        classificacao = 'A';
      } else if (percentualAcumulado <= 95) {
        classificacao = 'B';
      } else {
        classificacao = 'C';
      }

      return {
        ...produto,
        classificacao_abc: classificacao,
        percentual_valor: (produto.valor_total / valorTotal) * 100,
        percentual_acumulado: percentualAcumulado
      };
    });
  }

  /**
   * Calcular giro de estoque
   */
  static calcularGiroEstoque(custoVendido, estoquemedio) {
    if (estoqueMedia <= 0) {
      return 0;
    }
    return custoVendido / estoqueMedia;
  }

  /**
   * Calcular dias de estoque
   */
  static calcularDiasEstoque(estoqueAtual, consumoMedio) {
    if (consumoMedio <= 0) {
      return Infinity;
    }
    return estoqueAtual / consumoMedio;
  }

  /**
   * Calcular estoque de segurança
   */
  static calcularEstoqueSeguranca(consumoMedio, tempoReposicao, fatorSeguranca = 1.5) {
    return consumoMedio * tempoReposicao * fatorSeguranca;
  }

  /**
   * Calcular ponto de reposição
   */
  static calcularPontoReposicao(consumoMedio, tempoReposicao, estoqueSeguranca) {
    return (consumoMedio * tempoReposicao) + estoqueSeguranca;
  }

  /**
   * Calcular lote econômico (EOQ)
   */
  static calcularLoteEconomico(demandaAnual, custoReposicao, custoCarregamento) {
    if (custoCarregamento <= 0) {
      return 0;
    }
    return Math.sqrt((2 * demandaAnual * custoReposicao) / custoCarregamento);
  }

  /**
   * Formatar número com precisão
   */
  static formatarQuantidade(quantidade, precisao = 2) {
    return parseFloat(quantidade.toFixed(precisao));
  }

  /**
   * Formatar moeda
   */
  static formatarMoeda(valor, moeda = 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: moeda
    }).format(valor);
  }

  /**
   * Validar código de lote
   */
  static validarCodigoLote(codigo) {
    // Aceita apenas letras, números, hífens e underscores
    const regex = /^[A-Za-z0-9\-_]+$/;
    return regex.test(codigo) && codigo.length <= 50;
  }

  /**
   * Gerar código de movimentação único
   */
  static gerarCodigoMovimentacao(tipo = 'MOV') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${tipo}-${timestamp}-${random}`;
  }

  /**
   * Verificar data de validade
   */
  static verificarDataValidade(dataValidade, diasAlerta = 30) {
    if (!dataValidade) {
      return { vencido: false, proximo_vencimento: false, dias_restantes: null };
    }

    const hoje = new Date();
    const validade = new Date(dataValidade);
    const diffTime = validade - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      vencido: diffDays < 0,
      proximo_vencimento: diffDays >= 0 && diffDays <= diasAlerta,
      dias_restantes: diffDays,
      data_validade: validade
    };
  }

  /**
   * Aplicar política de consumo de lotes
   */
  static aplicarPoliticaConsumo(lotes, politica = 'FIFO') {
    let lotesOrdenados = [...lotes];

    switch (politica.toUpperCase()) {
      case 'FIFO': // First In, First Out
        lotesOrdenados.sort((a, b) => new Date(a.data_fabricacao) - new Date(b.data_fabricacao));
        break;

      case 'FEFO': // First Expired, First Out
        lotesOrdenados.sort((a, b) => {
          const validadeA = a.data_validade ? new Date(a.data_validade) : new Date('9999-12-31');
          const validadeB = b.data_validade ? new Date(b.data_validade) : new Date('9999-12-31');
          return validadeA - validadeB;
        });
        break;

      case 'LIFO': // Last In, First Out
        lotesOrdenados.sort((a, b) => new Date(b.data_fabricacao) - new Date(a.data_fabricacao));
        break;

      default:
        // Manter ordem original para política manual
        break;
    }

    return lotesOrdenados;
  }

  /**
   * Consolidar saldos por produto
   */
  static consolidarSaldosPorProduto(saldos) {
    const consolidado = {};

    saldos.forEach(saldo => {
      const key = saldo.id_produto;
      
      if (!consolidado[key]) {
        consolidado[key] = {
          id_produto: saldo.id_produto,
          quantidade_disponivel: 0,
          quantidade_reservada: 0,
          quantidade_total: 0,
          valor_total: 0,
          depositos: []
        };
      }

      consolidado[key].quantidade_disponivel += saldo.quantidade_disponivel || 0;
      consolidado[key].quantidade_reservada += saldo.quantidade_reservada || 0;
      consolidado[key].quantidade_total += saldo.quantidade_total || 0;
      consolidado[key].valor_total += (saldo.quantidade_total || 0) * (saldo.custo_medio || 0);
      consolidado[key].depositos.push({
        id_deposito: saldo.id_deposito,
        descricao_deposito: saldo.descricao_deposito,
        quantidade_disponivel: saldo.quantidade_disponivel,
        quantidade_reservada: saldo.quantidade_reservada,
        quantidade_total: saldo.quantidade_total,
        custo_medio: saldo.custo_medio
      });
    });

    // Calcular custo médio consolidado
    Object.values(consolidado).forEach(item => {
      if (item.quantidade_total > 0) {
        item.custo_medio = item.valor_total / item.quantidade_total;
      } else {
        item.custo_medio = 0;
      }
    });

    return Object.values(consolidado);
  }

  /**
   * Calcular métricas de performance de estoque
   */
  static calcularMetricasPerformance(movimentacoes, saldos) {
    const metricas = {
      total_entradas: 0,
      total_saidas: 0,
      valor_entradas: 0,
      valor_saidas: 0,
      giro_medio: 0,
      produtos_criticos: 0,
      produtos_excesso: 0
    };

    // Processar movimentações
    movimentacoes.forEach(mov => {
      if (mov.indicador_cd === 'C') { // Crédito (entrada)
        metricas.total_entradas += mov.quantidade;
        metricas.valor_entradas += mov.valor_total || 0;
      } else if (mov.indicador_cd === 'D') { // Débito (saída)
        metricas.total_saidas += mov.quantidade;
        metricas.valor_saidas += mov.valor_total || 0;
      }
    });

    // Processar saldos
    saldos.forEach(saldo => {
      // Produtos com estoque crítico (menos de 10% do estoque máximo teórico)
      if (saldo.quantidade_disponivel <= (saldo.quantidade_total * 0.1)) {
        metricas.produtos_criticos++;
      }

      // Produtos com excesso (mais de 90% do estoque máximo teórico)
      if (saldo.quantidade_disponivel >= (saldo.quantidade_total * 0.9)) {
        metricas.produtos_excesso++;
      }
    });

    // Calcular giro médio
    if (saldos.length > 0) {
      const valorMedioEstoque = saldos.reduce((acc, saldo) => {
        return acc + (saldo.quantidade_total * (saldo.custo_medio || 0));
      }, 0) / saldos.length;

      if (valorMedioEstoque > 0) {
        metricas.giro_medio = metricas.valor_saidas / valorMedioEstoque;
      }
    }

    return metricas;
  }

  /**
   * Exportar dados para CSV
   */
  static exportarCSV(dados, colunas) {
    if (!dados || dados.length === 0) {
      return 'Nenhum dado para exportar';
    }

    // Cabeçalho
    const cabecalho = colunas.map(col => `"${col.label}"`).join(',');
    
    // Linhas de dados
    const linhas = dados.map(item => {
      return colunas.map(col => {
        let valor = item[col.key];
        
        // Tratar tipos especiais
        if (valor === null || valor === undefined) {
          valor = '';
        } else if (typeof valor === 'number') {
          valor = col.type === 'currency' ? 
            this.formatarMoeda(valor).replace('R$', '').trim() : 
            valor.toString();
        } else if (valor instanceof Date) {
          valor = valor.toLocaleDateString('pt-BR');
        } else {
          valor = valor.toString();
        }
        
        return `"${valor}"`;
      }).join(',');
    });

    return [cabecalho, ...linhas].join('\n');
  }

  /**
   * Validar integridade de movimentação
   */
  static validarIntegridadeMovimentacao(movimentacao) {
    const erros = [];

    // Validações básicas
    if (!movimentacao.id_produto) {
      erros.push('ID do produto é obrigatório');
    }

    if (!movimentacao.id_deposito) {
      erros.push('ID do depósito é obrigatório');
    }

    if (!movimentacao.quantidade || movimentacao.quantidade <= 0) {
      erros.push('Quantidade deve ser maior que zero');
    }

    if (!['ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'AJUSTE'].includes(movimentacao.tipo_movimentacao)) {
      erros.push('Tipo de movimentação inválido');
    }

    if (!['C', 'D'].includes(movimentacao.indicador_cd)) {
      erros.push('Indicador C/D inválido');
    }

    // Validação de consistência entre tipo e indicador
    const tiposCredito = ['ENTRADA'];
    const tiposDebito = ['SAIDA'];

    if (tiposCredito.includes(movimentacao.tipo_movimentacao) && movimentacao.indicador_cd !== 'C') {
      erros.push('Movimentação de entrada deve ter indicador C (crédito)');
    }

    if (tiposDebito.includes(movimentacao.tipo_movimentacao) && movimentacao.indicador_cd !== 'D') {
      erros.push('Movimentação de saída deve ter indicador D (débito)');
    }

    return {
      valida: erros.length === 0,
      erros
    };
  }

  /**
   * Limpar dados sensíveis para logs
   */
  static limparDadosLog(dados) {
    const dadosLimpos = { ...dados };
    
    // Remover campos sensíveis
    delete dadosLimpos.password;
    delete dadosLimpos.token;
    delete dadosLimpos.api_key;
    
    // Mascarar valores monetários em logs de auditoria
    if (dadosLimpos.custo_unitario) {
      dadosLimpos.custo_unitario = '***';
    }
    
    return dadosLimpos;
  }
}

/**
 * Constantes úteis para o módulo EST
 */
const CONSTANTES = {
  TIPOS_MOVIMENTACAO: {
    ENTRADA: 'ENTRADA',
    SAIDA: 'SAIDA',
    TRANSFERENCIA: 'TRANSFERENCIA',
    AJUSTE: 'AJUSTE'
  },

  INDICADORES_CD: {
    CREDITO: 'C',
    DEBITO: 'D'
  },

  POLITICAS_LOTE: {
    FIFO: 'FIFO',
    FEFO: 'FEFO',
    LIFO: 'LIFO',
    MANUAL: 'MANUAL'
  },

  STATUS_RESERVA: {
    ATIVA: 'ATIVA',
    LIBERADA: 'LIBERADA',
    CONSUMIDA: 'CONSUMIDA',
    EXPIRADA: 'EXPIRADA'
  },

  STATUS_LOTE: {
    ATIVO: 'ATIVO',
    BLOQUEADO: 'BLOQUEADO',
    VENCIDO: 'VENCIDO',
    CONSUMIDO: 'CONSUMIDO'
  },

  CLASSIFICACAO_ABC: {
    A: 'A', // 80% do valor
    B: 'B', // 15% do valor
    C: 'C'  // 5% do valor
  },

  UNIDADES_MEDIDA: [
    { codigo: 'UN', descricao: 'Unidade' },
    { codigo: 'KG', descricao: 'Quilograma' },
    { codigo: 'G', descricao: 'Grama' },
    { codigo: 'L', descricao: 'Litro' },
    { codigo: 'ML', descricao: 'Mililitro' },
    { codigo: 'M', descricao: 'Metro' },
    { codigo: 'CM', descricao: 'Centímetro' },
    { codigo: 'M2', descricao: 'Metro Quadrado' },
    { codigo: 'M3', descricao: 'Metro Cúbico' },
    { codigo: 'CX', descricao: 'Caixa' },
    { codigo: 'PC', descricao: 'Peça' },
    { codigo: 'PAR', descricao: 'Par' },
    { codigo: 'DZ', descricao: 'Dúzia' }
  ]
};

module.exports = {
  EstoqueUtils,
  CONSTANTES
};