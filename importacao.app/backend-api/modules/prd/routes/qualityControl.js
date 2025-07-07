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
  controller.inspect.bind(controller)
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

/**
 * @route   GET /api/prd/quality-control/inspection-plans
 * @desc    Listar planos de inspeção
 * @access  Private
 */
router.get('/inspection-plans', 
  permissions.check('quality_control', 'read'),
  controller.getInspectionPlans.bind(controller)
);

/**
 * @route   POST /api/prd/quality-control/inspection-plans
 * @desc    Criar plano de inspeção
 * @access  Private
 */
router.post('/inspection-plans', 
  permissions.check('quality_control', 'create'),
  controller.createInspectionPlan.bind(controller)
);

/**
 * @route   GET /api/prd/quality-control/non-conformities
 * @desc    Listar não conformidades
 * @access  Private
 */
router.get('/non-conformities', 
  permissions.check('quality_control', 'read'),
  controller.getNonConformities.bind(controller)
);

/**
 * @route   POST /api/prd/quality-control/non-conformities
 * @desc    Criar não conformidade
 * @access  Private
 */
router.post('/non-conformities', 
  permissions.check('quality_control', 'create'),
  controller.createNonConformity.bind(controller)
);

/**
 * @route   GET /api/prd/quality-control/non-conformities/:id/actions
 * @desc    Obter ações corretivas
 * @access  Private
 */
router.get('/non-conformities/:id/actions', 
  permissions.check('quality_control', 'read'),
  controller.getCorrectiveActions.bind(controller)
);

/**
 * @route   POST /api/prd/quality-control/non-conformities/:id/actions
 * @desc    Criar ação corretiva
 * @access  Private
 */
router.post('/non-conformities/:id/actions', 
  permissions.check('quality_control', 'create'),
  controller.createCorrectiveAction.bind(controller)
);

/**
 * @route   GET /api/prd/quality-control/certificates
 * @desc    Listar certificados de qualidade
 * @access  Private
 */
router.get('/certificates', 
  permissions.check('quality_control', 'read'),
  controller.getCertificates.bind(controller)
);

/**
 * @route   POST /api/prd/quality-control/:id/certificate
 * @desc    Gerar certificado de qualidade
 * @access  Private
 */
router.post('/:id/certificate', 
  permissions.check('quality_control', 'create'),
  controller.generateCertificate.bind(controller)
);

/**
 * @route   GET /api/prd/quality-control/traceability/:id
 * @desc    Obter rastreabilidade do produto
 * @access  Private
 */
router.get('/traceability/:id', 
  permissions.check('quality_control', 'read'),
  controller.getTraceability.bind(controller)
);

module.exports = router;