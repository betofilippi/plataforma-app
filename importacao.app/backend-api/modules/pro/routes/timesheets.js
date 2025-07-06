const express = require('express');
const router = express.Router();
const TimesheetsController = require('../controllers/timesheetsController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new TimesheetsController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/pro/timesheets
 * @desc    Listar timesheets
 * @access  Private
 */
router.get('/', 
  permissions.check('timesheets', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/pro/timesheets/:id
 * @desc    Buscar timesheet por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('timesheets', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/pro/timesheets
 * @desc    Criar novo timesheet
 * @access  Private
 */
router.post('/', 
  permissions.check('timesheets', 'create'),
  controller.create.bind(controller)
);

/**
 * @route   PUT /api/pro/timesheets/:id
 * @desc    Atualizar timesheet
 * @access  Private
 */
router.put('/:id', 
  permissions.check('timesheets', 'update'),
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/pro/timesheets/:id
 * @desc    Excluir timesheet
 * @access  Private
 */
router.delete('/:id', 
  permissions.check('timesheets', 'delete'),
  controller.delete.bind(controller)
);

/**
 * @route   POST /api/pro/timesheets/:id/submit
 * @desc    Submeter timesheet para aprovação
 * @access  Private
 */
router.post('/:id/submit', 
  permissions.check('timesheets', 'update'),
  controller.submitForApproval.bind(controller)
);

/**
 * @route   POST /api/pro/timesheets/:id/approve
 * @desc    Aprovar timesheet
 * @access  Private
 */
router.post('/:id/approve', 
  permissions.check('timesheets', 'approve'),
  controller.approve.bind(controller)
);

/**
 * @route   POST /api/pro/timesheets/:id/reject
 * @desc    Rejeitar timesheet
 * @access  Private
 */
router.post('/:id/reject', 
  permissions.check('timesheets', 'approve'),
  controller.reject.bind(controller)
);

/**
 * @route   GET /api/pro/timesheets/user/:userId
 * @desc    Listar timesheets por usuário
 * @access  Private
 */
router.get('/user/:userId', 
  permissions.check('timesheets', 'read'),
  controller.getByUser.bind(controller)
);

/**
 * @route   GET /api/pro/timesheets/project/:projectId
 * @desc    Listar timesheets por projeto
 * @access  Private
 */
router.get('/project/:projectId', 
  permissions.check('timesheets', 'read'),
  controller.getByProject.bind(controller)
);

/**
 * @route   GET /api/pro/timesheets/reports/summary
 * @desc    Relatório de resumo de horas
 * @access  Private
 */
router.get('/reports/summary', 
  permissions.check('timesheets', 'read'),
  controller.getSummaryReport.bind(controller)
);

/**
 * @route   POST /api/pro/timesheets/track-time
 * @desc    Registrar tempo em tempo real
 * @access  Private
 */
router.post('/track-time', 
  permissions.check('timesheets', 'create'),
  controller.trackTime.bind(controller)
);

module.exports = router;