const express = require('express');
const router = express.Router();
const QualityControlController = require('../controllers/qualityControlController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new QualityControlController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/prd/quality-control
 * @desc    Listar controles de qualidade
 * @access  Private
 */
router.get('/', 
  permissions.check('quality_control', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/prd/quality-control/:id
 * @desc    Buscar controle por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('quality_control', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/prd/quality-control
 * @desc    Criar novo controle de qualidade
 * @access  Private
 */
router.post('/', 
  permissions.check('quality_control', 'create'),
  controller.create.bind(controller)
);

/**
 * @route   PUT /api/prd/quality-control/:id
 * @desc    Atualizar controle de qualidade
 * @access  Private
 */
router.put('/:id', 
  permissions.check('quality_control', 'update'),
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/prd/quality-control/:id
 * @desc    Excluir controle de qualidade
 * @access  Private
 */
router.delete('/:id', 
  permissions.check('quality_control', 'delete'),
  controller.delete.bind(controller)
);

/**
 * @route   POST /api/prd/quality-control/:id/inspect
 * @desc    Executar inspeção de qualidade
 * @access  Private
 */
router.post('/:id/inspect', 
  permissions.check('quality_control', 'update'),
  controller.executeInspection.bind(controller)
);

/**
 * @route   GET /api/prd/quality-control/reports
 * @desc    Relatórios de qualidade
 * @access  Private
 */
router.get('/reports', 
  permissions.check('quality_control', 'read'),
  controller.getReports.bind(controller)
);

module.exports = router;