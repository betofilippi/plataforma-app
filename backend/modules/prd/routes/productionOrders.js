const express = require('express');
const router = express.Router();
const ProductionOrdersController = require('../controllers/productionOrdersController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new ProductionOrdersController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/prd/production-orders
 * @desc    Listar ordens de produção
 * @access  Private
 */
router.get('/', 
  permissions.check('production_orders', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/prd/production-orders/stats
 * @desc    Obter estatísticas das ordens
 * @access  Private
 */
router.get('/stats', 
  permissions.check('production_orders', 'read'),
  controller.getStats.bind(controller)
);

/**
 * @route   GET /api/prd/production-orders/:id
 * @desc    Buscar ordem por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('production_orders', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/prd/production-orders
 * @desc    Criar nova ordem de produção
 * @access  Private
 */
router.post('/', 
  permissions.check('production_orders', 'create'),
  controller.create.bind(controller)
);

/**
 * @route   PUT /api/prd/production-orders/:id
 * @desc    Atualizar ordem de produção
 * @access  Private
 */
router.put('/:id', 
  permissions.check('production_orders', 'update'),
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/prd/production-orders/:id
 * @desc    Excluir ordem de produção
 * @access  Private
 */
router.delete('/:id', 
  permissions.check('production_orders', 'delete'),
  controller.delete.bind(controller)
);

/**
 * @route   POST /api/prd/production-orders/:id/start
 * @desc    Iniciar produção
 * @access  Private
 */
router.post('/:id/start', 
  permissions.check('production_orders', 'update'),
  controller.start.bind(controller)
);

/**
 * @route   POST /api/prd/production-orders/:id/finish
 * @desc    Finalizar produção
 * @access  Private
 */
router.post('/:id/finish', 
  permissions.check('production_orders', 'update'),
  controller.finish.bind(controller)
);

/**
 * @route   GET /api/prd/production-orders/:id/progress
 * @desc    Obter progresso da produção
 * @access  Private
 */
router.get('/:id/progress', 
  permissions.check('production_orders', 'read'),
  controller.getProgress.bind(controller)
);

/**
 * @route   POST /api/prd/production-orders/:id/materials
 * @desc    Registrar consumo de materiais
 * @access  Private
 */
router.post('/:id/materials', 
  permissions.check('production_orders', 'update'),
  controller.consumeMaterial.bind(controller)
);

module.exports = router;