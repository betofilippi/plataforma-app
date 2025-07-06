const express = require('express');
const router = express.Router();
const WebhooksController = require('../controllers/webhooksController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new WebhooksController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/whk/webhooks
 * @desc    Listar webhooks
 * @access  Private
 */
router.get('/', 
  permissions.check('webhooks', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/whk/webhooks/:id
 * @desc    Buscar webhook por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('webhooks', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/whk/webhooks
 * @desc    Criar novo webhook
 * @access  Private
 */
router.post('/', 
  permissions.check('webhooks', 'create'),
  controller.create.bind(controller)
);

/**
 * @route   PUT /api/whk/webhooks/:id
 * @desc    Atualizar webhook
 * @access  Private
 */
router.put('/:id', 
  permissions.check('webhooks', 'update'),
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/whk/webhooks/:id
 * @desc    Excluir webhook
 * @access  Private
 */
router.delete('/:id', 
  permissions.check('webhooks', 'delete'),
  controller.delete.bind(controller)
);

/**
 * @route   POST /api/whk/webhooks/:id/test
 * @desc    Testar webhook
 * @access  Private
 */
router.post('/:id/test', 
  permissions.check('webhooks', 'update'),
  controller.testWebhook.bind(controller)
);

/**
 * @route   POST /api/whk/webhooks/:id/activate
 * @desc    Ativar webhook
 * @access  Private
 */
router.post('/:id/activate', 
  permissions.check('webhooks', 'update'),
  controller.activateWebhook.bind(controller)
);

/**
 * @route   POST /api/whk/webhooks/:id/deactivate
 * @desc    Desativar webhook
 * @access  Private
 */
router.post('/:id/deactivate', 
  permissions.check('webhooks', 'update'),
  controller.deactivateWebhook.bind(controller)
);

/**
 * @route   GET /api/whk/webhooks/:id/deliveries
 * @desc    Obter histórico de entregas do webhook
 * @access  Private
 */
router.get('/:id/deliveries', 
  permissions.check('webhooks', 'read'),
  controller.getDeliveries.bind(controller)
);

/**
 * @route   POST /api/whk/webhooks/:id/retry
 * @desc    Reenviar webhook falho
 * @access  Private
 */
router.post('/:id/retry', 
  permissions.check('webhooks', 'update'),
  controller.retryWebhook.bind(controller)
);

/**
 * @route   GET /api/whk/webhooks/:id/stats
 * @desc    Obter estatísticas do webhook
 * @access  Private
 */
router.get('/:id/stats', 
  permissions.check('webhooks', 'read'),
  controller.getWebhookStats.bind(controller)
);

/**
 * @route   POST /api/whk/webhooks/:id/regenerate-secret
 * @desc    Regenerar secret do webhook
 * @access  Private
 */
router.post('/:id/regenerate-secret', 
  permissions.check('webhooks', 'update'),
  controller.regenerateSecret.bind(controller)
);

/**
 * @route   GET /api/whk/webhooks/bulk-test
 * @desc    Testar múltiplos webhooks
 * @access  Private
 */
router.post('/bulk-test', 
  permissions.check('webhooks', 'update'),
  controller.bulkTest.bind(controller)
);

/**
 * @route   POST /api/whk/webhooks/validate-url
 * @desc    Validar URL do webhook
 * @access  Private
 */
router.post('/validate-url', 
  permissions.check('webhooks', 'read'),
  controller.validateURL.bind(controller)
);

module.exports = router;