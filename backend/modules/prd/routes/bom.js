const express = require('express');
const router = express.Router();
const BOMController = require('../controllers/bomController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new BOMController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/prd/bom
 * @desc    Listar BOMs
 * @access  Private
 */
router.get('/', 
  permissions.check('bom', 'read'),
  controller.list.bind(controller)
);

/**
 * @route   GET /api/prd/bom/:id
 * @desc    Buscar BOM por ID
 * @access  Private
 */
router.get('/:id', 
  permissions.check('bom', 'read'),
  controller.getById.bind(controller)
);

/**
 * @route   POST /api/prd/bom
 * @desc    Criar novo BOM
 * @access  Private
 */
router.post('/', 
  permissions.check('bom', 'create'),
  controller.create.bind(controller)
);

/**
 * @route   PUT /api/prd/bom/:id
 * @desc    Atualizar BOM
 * @access  Private
 */
router.put('/:id', 
  permissions.check('bom', 'update'),
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/prd/bom/:id
 * @desc    Excluir BOM
 * @access  Private
 */
router.delete('/:id', 
  permissions.check('bom', 'delete'),
  controller.delete.bind(controller)
);

/**
 * @route   GET /api/prd/bom/:id/explode
 * @desc    Explodir BOM (listar todos os componentes)
 * @access  Private
 */
router.get('/:id/explode', 
  permissions.check('bom', 'read'),
  controller.explode.bind(controller)
);

/**
 * @route   POST /api/prd/bom/:id/cost-calc
 * @desc    Calcular custos do BOM
 * @access  Private
 */
router.post('/:id/cost-calc', 
  permissions.check('bom', 'read'),
  controller.calculateCost.bind(controller)
);

module.exports = router;