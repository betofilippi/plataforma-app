const express = require('express');
const router = express.Router();
const SecurityController = require('../controllers/securityController');
const auth = require('../../../src/middleware/auth');
const permissions = require('../../../src/middleware/permissions');

const controller = new SecurityController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @route   GET /api/whk/security/audit-log
 * @desc    Obter logs de auditoria
 * @access  Private
 */
router.get('/audit-log', 
  permissions.check('security', 'read'),
  controller.getAuditLog.bind(controller)
);

/**
 * @route   GET /api/whk/security/access-tokens
 * @desc    Listar tokens de acesso
 * @access  Private
 */
router.get('/access-tokens', 
  permissions.check('security', 'read'),
  controller.listAccessTokens.bind(controller)
);

/**
 * @route   POST /api/whk/security/access-tokens
 * @desc    Criar novo token de acesso
 * @access  Private
 */
router.post('/access-tokens', 
  permissions.check('security', 'create'),
  controller.createAccessToken.bind(controller)
);

/**
 * @route   DELETE /api/whk/security/access-tokens/:id
 * @desc    Revogar token de acesso
 * @access  Private
 */
router.delete('/access-tokens/:id', 
  permissions.check('security', 'delete'),
  controller.revokeAccessToken.bind(controller)
);

/**
 * @route   POST /api/whk/security/rotate-secrets
 * @desc    Rotacionar secrets dos webhooks
 * @access  Private
 */
router.post('/rotate-secrets', 
  permissions.check('security', 'update'),
  controller.rotateSecrets.bind(controller)
);

/**
 * @route   GET /api/whk/security/failed-attempts
 * @desc    Listar tentativas de acesso falhadas
 * @access  Private
 */
router.get('/failed-attempts', 
  permissions.check('security', 'read'),
  controller.getFailedAttempts.bind(controller)
);

/**
 * @route   GET /api/whk/security/ip-whitelist
 * @desc    Listar IPs na whitelist
 * @access  Private
 */
router.get('/ip-whitelist', 
  permissions.check('security', 'read'),
  controller.getIPWhitelist.bind(controller)
);

/**
 * @route   POST /api/whk/security/ip-whitelist
 * @desc    Adicionar IP à whitelist
 * @access  Private
 */
router.post('/ip-whitelist', 
  permissions.check('security', 'create'),
  controller.addToIPWhitelist.bind(controller)
);

/**
 * @route   DELETE /api/whk/security/ip-whitelist/:id
 * @desc    Remover IP da whitelist
 * @access  Private
 */
router.delete('/ip-whitelist/:id', 
  permissions.check('security', 'delete'),
  controller.removeFromIPWhitelist.bind(controller)
);

/**
 * @route   POST /api/whk/security/validate-signature
 * @desc    Validar assinatura HMAC
 * @access  Private
 */
router.post('/validate-signature', 
  permissions.check('security', 'read'),
  controller.validateSignature.bind(controller)
);

/**
 * @route   GET /api/whk/security/encryption-status
 * @desc    Status da criptografia
 * @access  Private
 */
router.get('/encryption-status', 
  permissions.check('security', 'read'),
  controller.getEncryptionStatus.bind(controller)
);

/**
 * @route   POST /api/whk/security/encrypt-payloads
 * @desc    Criptografar payloads existentes
 * @access  Private
 */
router.post('/encrypt-payloads', 
  permissions.check('security', 'update'),
  controller.encryptExistingPayloads.bind(controller)
);

/**
 * @route   GET /api/whk/security/permissions
 * @desc    Listar permissões de segurança
 * @access  Private
 */
router.get('/permissions', 
  permissions.check('security', 'read'),
  controller.getSecurityPermissions.bind(controller)
);

/**
 * @route   POST /api/whk/security/scan-vulnerabilities
 * @desc    Executar scan de vulnerabilidades
 * @access  Private
 */
router.post('/scan-vulnerabilities', 
  permissions.check('security', 'update'),
  controller.scanVulnerabilities.bind(controller)
);

/**
 * @route   GET /api/whk/security/compliance-report
 * @desc    Relatório de compliance de segurança
 * @access  Private
 */
router.get('/compliance-report', 
  permissions.check('security', 'read'),
  controller.getComplianceReport.bind(controller)
);

/**
 * @route   POST /api/whk/security/emergency-disable
 * @desc    Desativar todos os webhooks em emergência
 * @access  Private
 */
router.post('/emergency-disable', 
  permissions.check('security', 'emergency'),
  controller.emergencyDisable.bind(controller)
);

module.exports = router;