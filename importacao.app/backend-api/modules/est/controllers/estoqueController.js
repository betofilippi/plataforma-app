/**
 * @fileoverview Controller para Estoque - Handlers HTTP para operações de inventário
 * @author Sistema ERP NXT
 * @since 2025-07-06
 */

const estoqueService = require('../services/EstoqueService');
const { validationResult } = require('express-validator');

/**
 * Controller para operações de estoque
 */
class EstoqueController {
  
  /**
   * Obter saldo de produto
   * GET /api/estoque/saldo/:idProduto/:idDeposito?
   */
  async obterSaldo(req, res) {
    try {
      const { idProduto, idDeposito } = req.params;
      
      const saldo = await estoqueService.obterSaldoProduto(
        parseInt(idProduto),
        idDeposito ? parseInt(idDeposito) : null
      );

      if (!saldo) {
        return res.status(404).json({
          success: false,
          message: 'Produto não possui estoque'
        });
      }

      res.json({
        success: true,
        data: saldo
      });

    } catch (error) {
      console.error('Erro ao obter saldo:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Processar entrada de estoque
   * POST /api/estoque/entrada
   */
  async processarEntrada(req, res) {
    try {
      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
      }

      const dadosEntrada = {
        ...req.body,
        id_usuario: req.user?.id || null
      };

      const resultado = await estoqueService.processarEntrada(dadosEntrada);

      res.status(201).json({
        success: true,
        message: 'Entrada processada com sucesso',
        data: resultado
      });

    } catch (error) {
      console.error('Erro ao processar entrada:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Processar saída de estoque
   * POST /api/estoque/saida
   */
  async processarSaida(req, res) {
    try {
      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
      }

      const dadosSaida = {
        ...req.body,
        id_usuario: req.user?.id || null
      };

      const resultado = await estoqueService.processarSaida(dadosSaida);

      res.json({
        success: true,
        message: 'Saída processada com sucesso',
        data: resultado
      });

    } catch (error) {
      console.error('Erro ao processar saída:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Processar transferência entre depósitos
   * POST /api/estoque/transferencia
   */
  async processarTransferencia(req, res) {
    try {
      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
      }

      const dadosTransferencia = {
        ...req.body,
        id_usuario: req.user?.id || null
      };

      const resultado = await estoqueService.processarTransferencia(dadosTransferencia);

      res.status(201).json({
        success: true,
        message: 'Transferência processada com sucesso',
        data: resultado
      });

    } catch (error) {
      console.error('Erro ao processar transferência:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Criar reserva de estoque
   * POST /api/estoque/reserva
   */
  async criarReserva(req, res) {
    try {
      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
      }

      const dadosReserva = {
        ...req.body,
        id_usuario: req.user?.id || null
      };

      const resultado = await estoqueService.criarReserva(dadosReserva);

      res.status(201).json({
        success: true,
        message: 'Reserva criada com sucesso',
        data: resultado
      });

    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Liberar reserva de estoque
   * PUT /api/estoque/reserva/:idReserva/liberar
   */
  async liberarReserva(req, res) {
    try {
      const { idReserva } = req.params;
      const { motivo } = req.body;

      const resultado = await estoqueService.liberarReserva(
        parseInt(idReserva),
        motivo
      );

      res.json({
        success: true,
        message: resultado.message,
        data: resultado.saldo_atualizado
      });

    } catch (error) {
      console.error('Erro ao liberar reserva:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obter movimentações de estoque
   * GET /api/estoque/movimentacoes
   */
  async obterMovimentacoes(req, res) {
    try {
      const filtros = {
        id_produto: req.query.produto ? parseInt(req.query.produto) : null,
        id_deposito: req.query.deposito ? parseInt(req.query.deposito) : null,
        tipo_movimentacao: req.query.tipo,
        data_inicio: req.query.data_inicio,
        data_fim: req.query.data_fim,
        limite: parseInt(req.query.limite) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      const resultado = await estoqueService.obterMovimentacoes(filtros);

      res.json({
        success: true,
        data: resultado.data,
        pagination: {
          total: resultado.total,
          limite: resultado.limite,
          offset: resultado.offset,
          pages: Math.ceil(resultado.total / resultado.limite)
        }
      });

    } catch (error) {
      console.error('Erro ao obter movimentações:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Gerar relatório de estoque
   * GET /api/estoque/relatorio
   */
  async gerarRelatorio(req, res) {
    try {
      const filtros = {
        id_produto: req.query.produto ? parseInt(req.query.produto) : null,
        id_deposito: req.query.deposito ? parseInt(req.query.deposito) : null,
        incluir_zerados: req.query.incluir_zerados === 'true',
        incluir_lotes: req.query.incluir_lotes === 'true'
      };

      const relatorio = await estoqueService.gerarRelatorioEstoque(filtros);

      res.json({
        success: true,
        data: relatorio
      });

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obter lotes de um produto
   * GET /api/estoque/lotes/:idProduto/:idDeposito?
   */
  async obterLotes(req, res) {
    try {
      const { idProduto, idDeposito } = req.params;
      const { politica = 'FIFO' } = req.query;

      const lotes = await estoqueService.obterLotesDisponiveis(
        parseInt(idProduto),
        idDeposito ? parseInt(idDeposito) : null,
        politica
      );

      res.json({
        success: true,
        data: lotes
      });

    } catch (error) {
      console.error('Erro ao obter lotes:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Verificar alertas de estoque
   * POST /api/estoque/verificar-alertas
   */
  async verificarAlertas(req, res) {
    try {
      const { id_produto, id_deposito } = req.body;

      await estoqueService.verificarAlertas(
        id_produto ? parseInt(id_produto) : null,
        id_deposito ? parseInt(id_deposito) : null
      );

      res.json({
        success: true,
        message: 'Verificação de alertas executada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao verificar alertas:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obter dashboard de estoque
   * GET /api/estoque/dashboard
   */
  async obterDashboard(req, res) {
    try {
      // Produtos com estoque baixo
      const produtosBaixo = await estoqueService.gerarRelatorioEstoque({
        incluir_zerados: false
      });

      // Filtrar produtos com estoque baixo (menos de 10% do valor máximo)
      const produtosComAlerta = produtosBaixo.data.filter(item => {
        return item.quantidade_disponivel < (item.quantidade_total * 0.1);
      }).slice(0, 10);

      // Estatísticas gerais
      const stats = {
        total_produtos: produtosBaixo.data.length,
        valor_total_estoque: produtosBaixo.totais.valor_total_estoque,
        produtos_zerados: produtosBaixo.data.filter(item => item.quantidade_total === 0).length,
        produtos_baixo_estoque: produtosComAlerta.length
      };

      // Movimentações recentes
      const movimentacoesRecentes = await estoqueService.obterMovimentacoes({
        limite: 10,
        offset: 0
      });

      res.json({
        success: true,
        data: {
          estatisticas: stats,
          produtos_baixo_estoque: produtosComAlerta,
          movimentacoes_recentes: movimentacoesRecentes.data
        }
      });

    } catch (error) {
      console.error('Erro ao obter dashboard:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Ajustar estoque (inventário)
   * POST /api/estoque/ajuste
   */
  async ajustarEstoque(req, res) {
    try {
      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
      }

      const {
        id_produto,
        id_deposito,
        quantidade_sistema,
        quantidade_contada,
        observacoes
      } = req.body;

      const diferenca = quantidade_contada - quantidade_sistema;

      if (diferenca === 0) {
        return res.json({
          success: true,
          message: 'Não há diferença para ajustar'
        });
      }

      // Processar como entrada ou saída dependendo da diferença
      let resultado;
      if (diferenca > 0) {
        // Entrada (ajuste positivo)
        resultado = await estoqueService.processarEntrada({
          id_produto,
          id_deposito,
          quantidade: Math.abs(diferenca),
          documento_origem: `AJUSTE-${Date.now()}`,
          observacoes: `Ajuste de inventário: ${observacoes || 'Sem observações'}`,
          id_usuario: req.user?.id || null
        });
      } else {
        // Saída (ajuste negativo)
        resultado = await estoqueService.processarSaida({
          id_produto,
          id_deposito,
          quantidade: Math.abs(diferenca),
          documento_origem: `AJUSTE-${Date.now()}`,
          observacoes: `Ajuste de inventário: ${observacoes || 'Sem observações'}`,
          id_usuario: req.user?.id || null
        });
      }

      res.json({
        success: true,
        message: 'Ajuste de estoque processado com sucesso',
        data: {
          diferenca,
          tipo_ajuste: diferenca > 0 ? 'ENTRADA' : 'SAIDA',
          ...resultado
        }
      });

    } catch (error) {
      console.error('Erro ao ajustar estoque:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new EstoqueController();