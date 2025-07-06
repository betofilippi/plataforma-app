/**
 * @fileoverview Middleware de validação para o módulo EST
 * @author Sistema ERP NXT
 * @since 2025-07-06
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware para processar resultado da validação
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados de entrada inválidos',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Validações para operações de estoque
 */
const validationRules = {
  
  // Validação para entrada de estoque
  entrada: [
    body('id_produto')
      .isInt({ min: 1 })
      .withMessage('ID do produto deve ser um número inteiro positivo'),
    
    body('id_deposito')
      .isInt({ min: 1 })
      .withMessage('ID do depósito deve ser um número inteiro positivo'),
    
    body('quantidade')
      .isFloat({ min: 0.01 })
      .withMessage('Quantidade deve ser um número positivo maior que zero'),
    
    body('custo_unitario')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Custo unitário deve ser um número positivo'),
    
    body('documento_origem')
      .notEmpty()
      .withMessage('Documento de origem é obrigatório')
      .isLength({ max: 100 })
      .withMessage('Documento de origem deve ter no máximo 100 caracteres'),
    
    body('observacoes')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Observações devem ter no máximo 500 caracteres'),
    
    // Validações para lote (opcional)
    body('lote')
      .optional()
      .isObject()
      .withMessage('Dados do lote devem ser um objeto'),
    
    body('lote.numero_lote')
      .optional()
      .notEmpty()
      .withMessage('Número do lote é obrigatório quando lote é informado')
      .isLength({ max: 50 })
      .withMessage('Número do lote deve ter no máximo 50 caracteres'),
    
    body('lote.data_fabricacao')
      .optional()
      .isISO8601()
      .withMessage('Data de fabricação deve estar no formato ISO 8601'),
    
    body('lote.data_validade')
      .optional()
      .isISO8601()
      .withMessage('Data de validade deve estar no formato ISO 8601')
      .custom((value, { req }) => {
        if (req.body.lote?.data_fabricacao && value) {
          const fabricacao = new Date(req.body.lote.data_fabricacao);
          const validade = new Date(value);
          if (validade <= fabricacao) {
            throw new Error('Data de validade deve ser posterior à data de fabricação');
          }
        }
        return true;
      }),
    
    body('lote.fornecedor')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Fornecedor deve ter no máximo 100 caracteres')
  ],

  // Validação para saída de estoque
  saida: [
    body('id_produto')
      .isInt({ min: 1 })
      .withMessage('ID do produto deve ser um número inteiro positivo'),
    
    body('id_deposito')
      .isInt({ min: 1 })
      .withMessage('ID do depósito deve ser um número inteiro positivo'),
    
    body('quantidade')
      .isFloat({ min: 0.01 })
      .withMessage('Quantidade deve ser um número positivo maior que zero'),
    
    body('documento_origem')
      .notEmpty()
      .withMessage('Documento de origem é obrigatório')
      .isLength({ max: 100 })
      .withMessage('Documento de origem deve ter no máximo 100 caracteres'),
    
    body('observacoes')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Observações devem ter no máximo 500 caracteres'),
    
    body('usa_controle_lote')
      .optional()
      .isBoolean()
      .withMessage('Campo usa_controle_lote deve ser verdadeiro ou falso'),
    
    body('politica_consumo')
      .optional()
      .isIn(['FIFO', 'FEFO', 'LIFO', 'MANUAL'])
      .withMessage('Política de consumo deve ser FIFO, FEFO, LIFO ou MANUAL')
  ],

  // Validação para transferência
  transferencia: [
    body('id_produto')
      .isInt({ min: 1 })
      .withMessage('ID do produto deve ser um número inteiro positivo'),
    
    body('id_deposito_origem')
      .isInt({ min: 1 })
      .withMessage('ID do depósito origem deve ser um número inteiro positivo'),
    
    body('id_deposito_destino')
      .isInt({ min: 1 })
      .withMessage('ID do depósito destino deve ser um número inteiro positivo')
      .custom((value, { req }) => {
        if (value === req.body.id_deposito_origem) {
          throw new Error('Depósito de origem e destino devem ser diferentes');
        }
        return true;
      }),
    
    body('quantidade')
      .isFloat({ min: 0.01 })
      .withMessage('Quantidade deve ser um número positivo maior que zero'),
    
    body('observacoes')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Observações devem ter no máximo 500 caracteres')
  ],

  // Validação para reserva
  reserva: [
    body('id_produto')
      .isInt({ min: 1 })
      .withMessage('ID do produto deve ser um número inteiro positivo'),
    
    body('id_deposito')
      .isInt({ min: 1 })
      .withMessage('ID do depósito deve ser um número inteiro positivo'),
    
    body('quantidade')
      .isFloat({ min: 0.01 })
      .withMessage('Quantidade deve ser um número positivo maior que zero'),
    
    body('motivo')
      .notEmpty()
      .withMessage('Motivo da reserva é obrigatório')
      .isLength({ max: 200 })
      .withMessage('Motivo deve ter no máximo 200 caracteres'),
    
    body('data_vencimento')
      .optional()
      .isISO8601()
      .withMessage('Data de vencimento deve estar no formato ISO 8601')
      .custom(value => {
        if (value && new Date(value) <= new Date()) {
          throw new Error('Data de vencimento deve ser futura');
        }
        return true;
      }),
    
    body('observacoes')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Observações devem ter no máximo 500 caracteres')
  ],

  // Validação para ajuste de estoque
  ajuste: [
    body('id_produto')
      .isInt({ min: 1 })
      .withMessage('ID do produto deve ser um número inteiro positivo'),
    
    body('id_deposito')
      .isInt({ min: 1 })
      .withMessage('ID do depósito deve ser um número inteiro positivo'),
    
    body('quantidade_sistema')
      .isFloat({ min: 0 })
      .withMessage('Quantidade do sistema deve ser um número positivo ou zero'),
    
    body('quantidade_contada')
      .isFloat({ min: 0 })
      .withMessage('Quantidade contada deve ser um número positivo ou zero'),
    
    body('observacoes')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Observações devem ter no máximo 500 caracteres')
  ],

  // Validação para parâmetros de rota
  params: {
    idProduto: param('idProduto')
      .isInt({ min: 1 })
      .withMessage('ID do produto deve ser um número inteiro positivo'),
    
    idDeposito: param('idDeposito')
      .optional()
      .isInt({ min: 1 })
      .withMessage('ID do depósito deve ser um número inteiro positivo'),
    
    idReserva: param('idReserva')
      .isInt({ min: 1 })
      .withMessage('ID da reserva deve ser um número inteiro positivo')
  },

  // Validação para query parameters
  query: {
    paginacao: [
      query('limite')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Limite deve ser um número entre 1 e 1000'),
      
      query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset deve ser um número positivo ou zero')
    ],
    
    filtros: [
      query('produto')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Filtro de produto deve ser um número inteiro positivo'),
      
      query('deposito')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Filtro de depósito deve ser um número inteiro positivo'),
      
      query('tipo')
        .optional()
        .isIn(['ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'AJUSTE'])
        .withMessage('Tipo deve ser ENTRADA, SAIDA, TRANSFERENCIA ou AJUSTE'),
      
      query('data_inicio')
        .optional()
        .isISO8601()
        .withMessage('Data de início deve estar no formato ISO 8601'),
      
      query('data_fim')
        .optional()
        .isISO8601()
        .withMessage('Data de fim deve estar no formato ISO 8601')
        .custom((value, { req }) => {
          if (req.query.data_inicio && value) {
            const inicio = new Date(req.query.data_inicio);
            const fim = new Date(value);
            if (fim <= inicio) {
              throw new Error('Data de fim deve ser posterior à data de início');
            }
          }
          return true;
        }),
      
      query('incluir_zerados')
        .optional()
        .isBoolean()
        .withMessage('Campo incluir_zerados deve ser verdadeiro ou falso'),
      
      query('incluir_lotes')
        .optional()
        .isBoolean()
        .withMessage('Campo incluir_lotes deve ser verdadeiro ou falso'),
      
      query('politica')
        .optional()
        .isIn(['FIFO', 'FEFO', 'LIFO'])
        .withMessage('Política deve ser FIFO, FEFO ou LIFO')
    ]
  }
};

/**
 * Middleware para validar dados de entrada específicos para operações de lote
 */
const validarLote = [
  body('numero_lote')
    .notEmpty()
    .withMessage('Número do lote é obrigatório')
    .isLength({ max: 50 })
    .withMessage('Número do lote deve ter no máximo 50 caracteres')
    .matches(/^[A-Za-z0-9\-_]+$/)
    .withMessage('Número do lote deve conter apenas letras, números, hífens e underscores'),
  
  body('data_fabricacao')
    .isISO8601()
    .withMessage('Data de fabricação deve estar no formato ISO 8601')
    .custom(value => {
      const hoje = new Date();
      const fabricacao = new Date(value);
      if (fabricacao > hoje) {
        throw new Error('Data de fabricação não pode ser futura');
      }
      return true;
    }),
  
  body('data_validade')
    .optional()
    .isISO8601()
    .withMessage('Data de validade deve estar no formato ISO 8601'),
  
  body('fornecedor')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Fornecedor deve ter no máximo 100 caracteres')
];

/**
 * Middleware para validar regras de negócio específicas
 */
const validarRegrasNegocio = {
  
  // Validar se o produto existe e está ativo
  validarProdutoAtivo: async (req, res, next) => {
    try {
      const { id_produto } = req.body || req.params;
      
      if (!id_produto) {
        return next();
      }

      // Esta validação seria implementada consultando o banco
      // const produto = await produtoService.obterPorId(id_produto);
      // if (!produto || !produto.ativo) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Produto não encontrado ou inativo'
      //   });
      // }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao validar produto'
      });
    }
  },

  // Validar se o depósito existe e está ativo
  validarDepositoAtivo: async (req, res, next) => {
    try {
      const { id_deposito, id_deposito_origem, id_deposito_destino } = req.body || req.params;
      
      const depositos = [id_deposito, id_deposito_origem, id_deposito_destino].filter(Boolean);
      
      if (depositos.length === 0) {
        return next();
      }

      // Esta validação seria implementada consultando o banco
      // for (const idDeposito of depositos) {
      //   const deposito = await depositoService.obterPorId(idDeposito);
      //   if (!deposito || !deposito.ativo) {
      //     return res.status(400).json({
      //       success: false,
      //       message: `Depósito ${idDeposito} não encontrado ou inativo`
      //     });
      //   }
      // }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao validar depósito'
      });
    }
  }
};

module.exports = {
  validationRules,
  validarLote,
  validarRegrasNegocio,
  handleValidationErrors
};