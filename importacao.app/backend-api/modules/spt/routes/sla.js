const express = require('express');
const router = express.Router();
const SLAController = require('../controllers/slaController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new SLAController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/spt/sla
 * @desc    Listar políticas de SLA
 * @access  Private
 */
router.get('/', 
  permissions.check('sla', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/spt/sla/:id
 * @desc    Buscar política de SLA por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('sla', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/spt/sla
 * @desc    Criar nova política de SLA
 * @access  Private
 */
router.post('/', 
  permissions.check('sla', 'create'),
  controller.create.bind(controller)
);

/**
 * @route   PUT /api/spt/sla/:id
 * @desc    Atualizar política de SLA
 * @access  Private
 */
router.put('/:id', 
  permissions.check('sla', 'update'),
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/spt/sla/:id
 * @desc    Excluir política de SLA
 * @access  Private
 */
router.delete('/:id', 
  permissions.check('sla', 'delete'),
  controller.delete.bind(controller)
);

/**
 * @route   GET /api/spt/sla/metrics
 * @desc    Obter métricas de SLA
 * @access  Private
 */
router.get('/metrics', 
  permissions.check('sla', 'read'),
  controller.getSLAMetrics.bind(controller)
);

/**
 * @route   GET /api/spt/sla/breaches
 * @desc    Listar violações de SLA
 * @access  Private
 */
router.get('/breaches', 
  permissions.check('sla', 'read'),
  controller.getSLABreaches.bind(controller)
);

/**
 * @route   GET /api/spt/sla/compliance
 * @desc    Relatório de compliance de SLA
 * @access  Private
 */
router.get('/compliance', 
  permissions.check('sla', 'read'),
  controller.getComplianceReport.bind(controller)
);

/**
 * @route   POST /api/spt/sla/:id/activate
 * @desc    Ativar política de SLA
 * @access  Private
 */
router.post('/:id/activate', 
  permissions.check('sla', 'update'),
  controller.activatePolicy.bind(controller)
);

/**
 * @route   POST /api/spt/sla/:id/deactivate
 * @desc    Desativar política de SLA
 * @access  Private
 */
router.post('/:id/deactivate', 
  permissions.check('sla', 'update'),
  controller.deactivatePolicy.bind(controller)
);

/**
 * @route   GET /api/spt/sla/ticket/:ticketId
 * @desc    Obter SLA de um ticket específico
 * @access  Private
 */
router.get('/ticket/:ticketId', 
  permissions.check('sla', 'read'),
  controller.getTicketSLA.bind(controller)
);

/**
 * @route   GET /api/spt/sla/escalations
 * @desc    Listar escalações de SLA
 * @access  Private
 */
router.get('/escalations', 
  permissions.check('sla', 'read'),
  controller.getEscalations.bind(controller)
);

/**
 * @route   POST /api/spt/sla/calculate
 * @desc    Calcular SLA para tickets
 * @access  Private
 */
router.post('/calculate', 
  permissions.check('sla', 'read'),
  controller.calculateSLA.bind(controller)
);

/**
 * @route   GET /api/spt/sla/reports/performance
 * @desc    Relatório de performance de SLA
 * @access  Private
 */
router.get('/reports/performance', 
  permissions.check('sla', 'read'),
  controller.getPerformanceReport.bind(controller)
);

module.exports = router;