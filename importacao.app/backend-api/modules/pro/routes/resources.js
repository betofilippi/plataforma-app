const express = require('express');
const router = express.Router();
const ResourcesController = require('../controllers/resourcesController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new ResourcesController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/pro/resources
 * @desc    Listar recursos
 * @access  Private
 */
router.get('/', 
  permissions.check('resources', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/pro/resources/:id
 * @desc    Buscar recurso por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('resources', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/pro/resources
 * @desc    Criar novo recurso
 * @access  Private
 */
router.post('/', 
  permissions.check('resources', 'create'),
  controller.create.bind(controller)
);

/**
 * @route   PUT /api/pro/resources/:id
 * @desc    Atualizar recurso
 * @access  Private
 */
router.put('/:id', 
  permissions.check('resources', 'update'),
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/pro/resources/:id
 * @desc    Excluir recurso
 * @access  Private
 */
router.delete('/:id', 
  permissions.check('resources', 'delete'),
  controller.delete.bind(controller)
);

/**
 * @route   GET /api/pro/resources/:id/allocation
 * @desc    Obter alocação do recurso
 * @access  Private
 */
router.get('/:id/allocation', 
  permissions.check('resources', 'read'),
  controller.getAllocation.bind(controller)
);

/**
 * @route   POST /api/pro/resources/:id/allocate
 * @desc    Alocar recurso a projeto/tarefa
 * @access  Private
 */
router.post('/:id/allocate', 
  permissions.check('resources', 'update'),
  controller.allocateResource.bind(controller)
);

/**
 * @route   POST /api/pro/resources/:id/deallocate
 * @desc    Desalocar recurso
 * @access  Private
 */
router.post('/:id/deallocate', 
  permissions.check('resources', 'update'),
  controller.deallocateResource.bind(controller)
);

/**
 * @route   GET /api/pro/resources/availability
 * @desc    Verificar disponibilidade de recursos
 * @access  Private
 */
router.get('/availability', 
  permissions.check('resources', 'read'),
  controller.checkAvailability.bind(controller)
);

/**
 * @route   GET /api/pro/resources/utilization
 * @desc    Relatório de utilização de recursos
 * @access  Private
 */
router.get('/utilization', 
  permissions.check('resources', 'read'),
  controller.getUtilizationReport.bind(controller)
);

/**
 * @route   GET /api/pro/resources/project/:projectId
 * @desc    Listar recursos alocados ao projeto
 * @access  Private
 */
router.get('/project/:projectId', 
  permissions.check('resources', 'read'),
  controller.getByProject.bind(controller)
);

module.exports = router;