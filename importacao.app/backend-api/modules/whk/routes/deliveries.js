const express = require('express');
const router = express.Router();
const DeliveriesController = require('../controllers/deliveriesController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new DeliveriesController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/whk/deliveries
 * @desc    Listar entregas de webhooks
 * @access  Private
 */
router.get('/', 
  permissions.check('deliveries', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/whk/deliveries/:id
 * @desc    Buscar entrega por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('deliveries', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/whk/deliveries/:id/retry
 * @desc    Retentar entrega falha
 * @access  Private
 */
router.post('/:id/retry', 
  permissions.check('deliveries', 'update'),
  controller.retryDelivery.bind(controller)
);

/**
 * @route   GET /api/whk/deliveries/:id/attempts
 * @desc    Listar tentativas de entrega
 * @access  Private
 */
router.get('/:id/attempts', 
  permissions.check('deliveries', 'read'),
  controller.getDeliveryAttempts.bind(controller)
);

/**
 * @route   POST /api/whk/deliveries/bulk-retry
 * @desc    Retentar múltiplas entregas
 * @access  Private
 */
router.post('/bulk-retry', 
  permissions.check('deliveries', 'update'),
  controller.bulkRetry.bind(controller)
);

/**
 * @route   GET /api/whk/deliveries/failed
 * @desc    Listar entregas falhadas
 * @access  Private
 */
router.get('/failed', 
  permissions.check('deliveries', 'read'),
  controller.getFailedDeliveries.bind(controller)
);

/**
 * @route   GET /api/whk/deliveries/pending
 * @desc    Listar entregas pendentes
 * @access  Private
 */
router.get('/pending', 
  permissions.check('deliveries', 'read'),
  controller.getPendingDeliveries.bind(controller)
);

/**
 * @route   GET /api/whk/deliveries/stats
 * @desc    Estatísticas de entregas
 * @access  Private
 */
router.get('/stats', 
  permissions.check('deliveries', 'read'),
  controller.getDeliveryStats.bind(controller)
);

/**
 * @route   GET /api/whk/deliveries/webhook/:webhookId
 * @desc    Listar entregas por webhook
 * @access  Private
 */
router.get('/webhook/:webhookId', 
  permissions.check('deliveries', 'read'),
  controller.getByWebhook.bind(controller)
);

/**
 * @route   GET /api/whk/deliveries/event/:eventId
 * @desc    Listar entregas por evento
 * @access  Private
 */
router.get('/event/:eventId', 
  permissions.check('deliveries', 'read'),
  controller.getByEvent.bind(controller)
);

/**
 * @route   POST /api/whk/deliveries/:id/mark-success
 * @desc    Marcar entrega como bem-sucedida
 * @access  Private
 */
router.post('/:id/mark-success', 
  permissions.check('deliveries', 'update'),
  controller.markAsSuccess.bind(controller)
);

/**
 * @route   POST /api/whk/deliveries/:id/mark-failed
 * @desc    Marcar entrega como falhada
 * @access  Private
 */
router.post('/:id/mark-failed', 
  permissions.check('deliveries', 'update'),
  controller.markAsFailed.bind(controller)
);

/**
 * @route   GET /api/whk/deliveries/reports/performance
 * @desc    Relatório de performance das entregas
 * @access  Private
 */
router.get('/reports/performance', 
  permissions.check('deliveries', 'read'),
  controller.getPerformanceReport.bind(controller)
);

/**
 * @route   POST /api/whk/deliveries/cleanup
 * @desc    Limpar entregas antigas
 * @access  Private
 */
router.post('/cleanup', 
  permissions.check('deliveries', 'delete'),
  controller.cleanupOldDeliveries.bind(controller)
);

/**
 * @route   GET /api/whk/deliveries/:id/response
 * @desc    Obter resposta da entrega
 * @access  Private
 */
router.get('/:id/response', 
  permissions.check('deliveries', 'read'),
  controller.getDeliveryResponse.bind(controller)
);

module.exports = router;