/**
 * @fileoverview Rotas para Estoque - Endpoints HTTP para operações de inventário
 * @author Sistema ERP NXT
 * @since 2025-07-06
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const estoqueController = require('../controllers/estoqueController');
const authMiddleware = require('../../../src/middleware/auth');
const permissionMiddleware = require('../../../src/middleware/permissions');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

/**
 * Validadores de entrada
 */
const validarEntrada = [
  body('id_produto').isInt({ min: 1 }).withMessage('ID do produto é obrigatório'),
  body('id_deposito').isInt({ min: 1 }).withMessage('ID do depósito é obrigatório'),
  body('quantidade').isFloat({ min: 0.01 }).withMessage('Quantidade deve ser maior que zero'),
  body('custo_unitario').optional().isFloat({ min: 0 }).withMessage('Custo unitário deve ser positivo'),
  body('documento_origem').notEmpty().withMessage('Documento de origem é obrigatório'),
  body('observacoes').optional().isString().trim(),
  body('lote').optional().isObject(),
  body('lote.numero_lote').optional().notEmpty().withMessage('Número do lote é obrigatório'),
  body('lote.data_fabricacao').optional().isISO8601().withMessage('Data de fabricação inválida'),
  body('lote.data_validade').optional().isISO8601().withMessage('Data de validade inválida')
];

const validarSaida = [
  body('id_produto').isInt({ min: 1 }).withMessage('ID do produto é obrigatório'),
  body('id_deposito').isInt({ min: 1 }).withMessage('ID do depósito é obrigatório'),
  body('quantidade').isFloat({ min: 0.01 }).withMessage('Quantidade deve ser maior que zero'),
  body('documento_origem').notEmpty().withMessage('Documento de origem é obrigatório'),
  body('observacoes').optional().isString().trim(),
  body('usa_controle_lote').optional().isBoolean(),
  body('politica_consumo').optional().isIn(['FIFO', 'FEFO', 'LIFO', 'MANUAL'])
];

const validarTransferencia = [
  body('id_produto').isInt({ min: 1 }).withMessage('ID do produto é obrigatório'),
  body('id_deposito_origem').isInt({ min: 1 }).withMessage('ID do depósito origem é obrigatório'),
  body('id_deposito_destino').isInt({ min: 1 }).withMessage('ID do depósito destino é obrigatório'),
  body('quantidade').isFloat({ min: 0.01 }).withMessage('Quantidade deve ser maior que zero'),
  body('observacoes').optional().isString().trim()
];

const validarReserva = [
  body('id_produto').isInt({ min: 1 }).withMessage('ID do produto é obrigatório'),
  body('id_deposito').isInt({ min: 1 }).withMessage('ID do depósito é obrigatório'),
  body('quantidade').isFloat({ min: 0.01 }).withMessage('Quantidade deve ser maior que zero'),
  body('motivo').notEmpty().withMessage('Motivo da reserva é obrigatório'),
  body('data_vencimento').optional().isISO8601().withMessage('Data de vencimento inválida'),
  body('observacoes').optional().isString().trim()
];

const validarAjuste = [
  body('id_produto').isInt({ min: 1 }).withMessage('ID do produto é obrigatório'),
  body('id_deposito').isInt({ min: 1 }).withMessage('ID do depósito é obrigatório'),
  body('quantidade_sistema').isFloat({ min: 0 }).withMessage('Quantidade do sistema é obrigatória'),
  body('quantidade_contada').isFloat({ min: 0 }).withMessage('Quantidade contada é obrigatória'),
  body('observacoes').optional().isString().trim()
];

/**
 * Rotas de consulta (GET)
 */

// Obter saldo de produto
router.get('/saldo/:idProduto/:idDeposito?',
  permissionMiddleware(['est.saldo.read']),
  param('idProduto').isInt({ min: 1 }),
  param('idDeposito').optional().isInt({ min: 1 }),
  estoqueController.obterSaldo
);

// Obter movimentações
router.get('/movimentacoes',
  permissionMiddleware(['est.movimentacoes.read']),
  query('produto').optional().isInt({ min: 1 }),
  query('deposito').optional().isInt({ min: 1 }),
  query('tipo').optional().isIn(['ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'AJUSTE']),
  query('data_inicio').optional().isISO8601(),
  query('data_fim').optional().isISO8601(),
  query('limite').optional().isInt({ min: 1, max: 1000 }),
  query('offset').optional().isInt({ min: 0 }),
  estoqueController.obterMovimentacoes
);

// Gerar relatório de estoque
router.get('/relatorio',
  permissionMiddleware(['est.relatorio.read']),
  query('produto').optional().isInt({ min: 1 }),
  query('deposito').optional().isInt({ min: 1 }),
  query('incluir_zerados').optional().isBoolean(),
  query('incluir_lotes').optional().isBoolean(),
  estoqueController.gerarRelatorio
);

// Obter lotes de produto
router.get('/lotes/:idProduto/:idDeposito?',
  permissionMiddleware(['est.lotes.read']),
  param('idProduto').isInt({ min: 1 }),
  param('idDeposito').optional().isInt({ min: 1 }),
  query('politica').optional().isIn(['FIFO', 'FEFO', 'LIFO']),
  estoqueController.obterLotes
);

// Dashboard de estoque
router.get('/dashboard',
  permissionMiddleware(['est.dashboard.read']),
  estoqueController.obterDashboard
);

/**
 * Rotas de operação (POST/PUT)
 */

// Processar entrada de estoque
router.post('/entrada',
  permissionMiddleware(['est.entrada.create']),
  validarEntrada,
  estoqueController.processarEntrada
);

// Processar saída de estoque
router.post('/saida',
  permissionMiddleware(['est.saida.create']),
  validarSaida,
  estoqueController.processarSaida
);

// Processar transferência
router.post('/transferencia',
  permissionMiddleware(['est.transferencia.create']),
  validarTransferencia,
  estoqueController.processarTransferencia
);

// Criar reserva
router.post('/reserva',
  permissionMiddleware(['est.reserva.create']),
  validarReserva,
  estoqueController.criarReserva
);

// Liberar reserva
router.put('/reserva/:idReserva/liberar',
  permissionMiddleware(['est.reserva.update']),
  param('idReserva').isInt({ min: 1 }),
  body('motivo').optional().isString().trim(),
  estoqueController.liberarReserva
);

// Ajustar estoque (inventário)
router.post('/ajuste',
  permissionMiddleware(['est.ajuste.create']),
  validarAjuste,
  estoqueController.ajustarEstoque
);

// Verificar alertas manualmente
router.post('/verificar-alertas',
  permissionMiddleware(['est.alertas.create']),
  body('id_produto').optional().isInt({ min: 1 }),
  body('id_deposito').optional().isInt({ min: 1 }),
  estoqueController.verificarAlertas
);

/**
 * Rotas específicas para integração com outros módulos
 */

// Endpoint para CMP (Compras) - Processar entrada automática
router.post('/entrada/compra',
  permissionMiddleware(['cmp.entrada.create']),
  [
    body('id_compra').isInt({ min: 1 }).withMessage('ID da compra é obrigatório'),
    body('itens').isArray({ min: 1 }).withMessage('Lista de itens é obrigatória'),
    body('itens.*.id_produto').isInt({ min: 1 }),
    body('itens.*.quantidade').isFloat({ min: 0.01 }),
    body('itens.*.custo_unitario').isFloat({ min: 0 }),
    body('itens.*.lote').optional().isObject()
  ],
  async (req, res) => {
    try {
      const { id_compra, itens, observacoes } = req.body;
      const resultados = [];

      for (const item of itens) {
        const resultado = await estoqueController.processarEntrada({
          body: {
            id_produto: item.id_produto,
            id_deposito: item.id_deposito,
            quantidade: item.quantidade,
            custo_unitario: item.custo_unitario,
            documento_origem: `COMPRA-${id_compra}`,
            observacoes: observacoes || `Entrada automática da compra ${id_compra}`,
            lote: item.lote
          },
          user: req.user
        });
        resultados.push(resultado);
      }

      res.json({
        success: true,
        message: 'Entrada da compra processada com sucesso',
        data: resultados
      });

    } catch (error) {
      console.error('Erro ao processar entrada da compra:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Endpoint para VND (Vendas) - Processar saída automática
router.post('/saida/venda',
  permissionMiddleware(['vnd.saida.create']),
  [
    body('id_venda').isInt({ min: 1 }).withMessage('ID da venda é obrigatório'),
    body('itens').isArray({ min: 1 }).withMessage('Lista de itens é obrigatória'),
    body('itens.*.id_produto').isInt({ min: 1 }),
    body('itens.*.quantidade').isFloat({ min: 0.01 }),
    body('itens.*.id_deposito').isInt({ min: 1 })
  ],
  async (req, res) => {
    try {
      const { id_venda, itens, observacoes } = req.body;
      const resultados = [];

      for (const item of itens) {
        const resultado = await estoqueController.processarSaida({
          body: {
            id_produto: item.id_produto,
            id_deposito: item.id_deposito,
            quantidade: item.quantidade,
            documento_origem: `VENDA-${id_venda}`,
            observacoes: observacoes || `Saída automática da venda ${id_venda}`,
            usa_controle_lote: true,
            politica_consumo: 'FIFO'
          },
          user: req.user
        });
        resultados.push(resultado);
      }

      res.json({
        success: true,
        message: 'Saída da venda processada com sucesso',
        data: resultados
      });

    } catch (error) {
      console.error('Erro ao processar saída da venda:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * Rotas de utilitários
 */

// Health check
router.get('/health',
  (req, res) => {
    res.json({
      success: true,
      message: 'Módulo EST funcionando corretamente',
      timestamp: new Date().toISOString()
    });
  }
);

module.exports = router;