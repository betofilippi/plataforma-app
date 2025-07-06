const express = require('express');
const router = express.Router();
const TicketsController = require('../controllers/ticketsController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new TicketsController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/spt/tickets
 * @desc    Listar tickets
 * @access  Private
 */
router.get('/', 
  permissions.check('tickets', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/spt/tickets/:id
 * @desc    Buscar ticket por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('tickets', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/spt/tickets
 * @desc    Criar novo ticket
 * @access  Private
 */
router.post('/', 
  permissions.check('tickets', 'create'),
  controller.create.bind(controller)
);

/**
 * @route   PUT /api/spt/tickets/:id
 * @desc    Atualizar ticket
 * @access  Private
 */
router.put('/:id', 
  permissions.check('tickets', 'update'),
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/spt/tickets/:id
 * @desc    Excluir ticket
 * @access  Private
 */
router.delete('/:id', 
  permissions.check('tickets', 'delete'),
  controller.delete.bind(controller)
);

/**
 * @route   POST /api/spt/tickets/:id/assign
 * @desc    Atribuir ticket a um agente
 * @access  Private
 */
router.post('/:id/assign', 
  permissions.check('tickets', 'update'),
  controller.assignTicket.bind(controller)
);

/**
 * @route   POST /api/spt/tickets/:id/escalate
 * @desc    Escalar ticket
 * @access  Private
 */
router.post('/:id/escalate', 
  permissions.check('tickets', 'update'),
  controller.escalateTicket.bind(controller)
);

/**
 * @route   POST /api/spt/tickets/:id/close
 * @desc    Fechar ticket
 * @access  Private
 */
router.post('/:id/close', 
  permissions.check('tickets', 'update'),
  controller.closeTicket.bind(controller)
);

/**
 * @route   POST /api/spt/tickets/:id/reopen
 * @desc    Reabrir ticket
 * @access  Private
 */
router.post('/:id/reopen', 
  permissions.check('tickets', 'update'),
  controller.reopenTicket.bind(controller)
);

/**
 * @route   GET /api/spt/tickets/:id/history
 * @desc    Obter histórico do ticket
 * @access  Private
 */
router.get('/:id/history', 
  permissions.check('tickets', 'read'),
  controller.getTicketHistory.bind(controller)
);

/**
 * @route   POST /api/spt/tickets/:id/comments
 * @desc    Adicionar comentário ao ticket
 * @access  Private
 */
router.post('/:id/comments', 
  permissions.check('tickets', 'update'),
  controller.addComment.bind(controller)
);

/**
 * @route   GET /api/spt/tickets/queue/:agentId
 * @desc    Obter fila de tickets do agente
 * @access  Private
 */
router.get('/queue/:agentId', 
  permissions.check('tickets', 'read'),
  controller.getAgentQueue.bind(controller)
);

/**
 * @route   GET /api/spt/tickets/reports/sla
 * @desc    Relatório de SLA
 * @access  Private
 */
router.get('/reports/sla', 
  permissions.check('tickets', 'read'),
  controller.getSLAReport.bind(controller)
);

/**
 * @route   POST /api/spt/tickets/:id/satisfaction
 * @desc    Registrar satisfação do cliente
 * @access  Private
 */
router.post('/:id/satisfaction', 
  permissions.check('tickets', 'update'),
  controller.recordSatisfaction.bind(controller)
);

module.exports = router;