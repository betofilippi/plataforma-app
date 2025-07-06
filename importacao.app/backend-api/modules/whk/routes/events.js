const express = require('express');
const router = express.Router();
const EventsController = require('../controllers/eventsController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new EventsController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/whk/events
 * @desc    Listar tipos de eventos
 * @access  Private
 */
router.get('/', 
  permissions.check('events', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/whk/events/:id
 * @desc    Buscar evento por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('events', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/whk/events
 * @desc    Criar novo tipo de evento
 * @access  Private
 */
router.post('/', 
  permissions.check('events', 'create'),
  controller.create.bind(controller)
);

/**
 * @route   PUT /api/whk/events/:id
 * @desc    Atualizar tipo de evento
 * @access  Private
 */
router.put('/:id', 
  permissions.check('events', 'update'),
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/whk/events/:id
 * @desc    Excluir tipo de evento
 * @access  Private
 */
router.delete('/:id', 
  permissions.check('events', 'delete'),
  controller.delete.bind(controller)
);

/**
 * @route   POST /api/whk/events/trigger
 * @desc    Disparar evento manualmente
 * @access  Private
 */
router.post('/trigger', 
  permissions.check('events', 'create'),
  controller.triggerEvent.bind(controller)
);

/**
 * @route   GET /api/whk/events/:id/subscriptions
 * @desc    Listar assinantes do evento
 * @access  Private
 */
router.get('/:id/subscriptions', 
  permissions.check('events', 'read'),
  controller.getSubscriptions.bind(controller)
);

/**
 * @route   POST /api/whk/events/:id/subscribe
 * @desc    Inscrever webhook em evento
 * @access  Private
 */
router.post('/:id/subscribe', 
  permissions.check('events', 'update'),
  controller.subscribeWebhook.bind(controller)
);

/**
 * @route   POST /api/whk/events/:id/unsubscribe
 * @desc    Desinscrever webhook de evento
 * @access  Private
 */
router.post('/:id/unsubscribe', 
  permissions.check('events', 'update'),
  controller.unsubscribeWebhook.bind(controller)
);

/**
 * @route   GET /api/whk/events/:id/history
 * @desc    Obter histórico de disparos do evento
 * @access  Private
 */
router.get('/:id/history', 
  permissions.check('events', 'read'),
  controller.getEventHistory.bind(controller)
);

/**
 * @route   GET /api/whk/events/:id/schema
 * @desc    Obter schema do payload do evento
 * @access  Private
 */
router.get('/:id/schema', 
  permissions.check('events', 'read'),
  controller.getEventSchema.bind(controller)
);

/**
 * @route   POST /api/whk/events/:id/schema
 * @desc    Atualizar schema do payload do evento
 * @access  Private
 */
router.post('/:id/schema', 
  permissions.check('events', 'update'),
  controller.updateEventSchema.bind(controller)
);

/**
 * @route   POST /api/whk/events/:id/validate-payload
 * @desc    Validar payload do evento
 * @access  Private
 */
router.post('/:id/validate-payload', 
  permissions.check('events', 'read'),
  controller.validatePayload.bind(controller)
);

/**
 * @route   GET /api/whk/events/categories
 * @desc    Listar categorias de eventos
 * @access  Private
 */
router.get('/categories', 
  permissions.check('events', 'read'),
  controller.getCategories.bind(controller)
);

/**
 * @route   GET /api/whk/events/stats
 * @desc    Estatísticas gerais de eventos
 * @access  Private
 */
router.get('/stats', 
  permissions.check('events', 'read'),
  controller.getEventStats.bind(controller)
);

module.exports = router;