const express = require('express');
const { body, query, param } = require('express-validator');
const NotificationController = require('../controllers/NotificationController');
const auth = require('../middleware/auth');
const permissions = require('../middleware/permissions');

const router = express.Router();
const notificationController = new NotificationController();

// Middleware de autenticação para todas as rotas
router.use(auth);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Listar notificações do usuário
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Página da paginação
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Limite de resultados por página
 *       - in: query
 *         name: unread_only
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Filtrar apenas não lidas
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filtrar por tipo de notificação
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filtrar por prioridade
 *       - in: query
 *         name: include_archived
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Incluir notificações arquivadas
 *     responses:
 *       200:
 *         description: Lista de notificações
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('unread_only').optional().isBoolean(),
  query('type').optional().isString(),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('include_archived').optional().isBoolean()
], notificationController.getUserNotifications);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Obter contagem de notificações não lidas
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contagem de notificações não lidas
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @swagger
 * /api/notifications/stats:
 *   get:
 *     summary: Obter estatísticas de notificações
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas de notificações
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/stats', notificationController.getStats);

/**
 * @swagger
 * /api/notifications/types:
 *   get:
 *     summary: Listar tipos de notificação disponíveis
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tipos de notificação
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/types', notificationController.getNotificationTypes);

/**
 * @swagger
 * /api/notifications/channels:
 *   get:
 *     summary: Listar canais de notificação disponíveis
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de canais de notificação
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/channels', notificationController.getNotificationChannels);

/**
 * @swagger
 * /api/notifications/{id}:
 *   get:
 *     summary: Buscar notificação específica
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da notificação
 *     responses:
 *       200:
 *         description: Dados da notificação
 *       404:
 *         description: Notificação não encontrada
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:id', [
  param('id').isInt()
], notificationController.getNotification);

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Criar nova notificação
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notification_type
 *               - title
 *               - message
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: ID do usuário destinatário (alternativo a user_ids)
 *               user_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array de IDs dos usuários destinatários
 *               notification_type:
 *                 type: string
 *                 description: Tipo da notificação
 *               title:
 *                 type: string
 *                 description: Título da notificação
 *               message:
 *                 type: string
 *                 description: Mensagem da notificação
 *               data:
 *                 type: object
 *                 description: Dados adicionais
 *               source_module:
 *                 type: string
 *                 description: Módulo que originou a notificação
 *               source_entity:
 *                 type: string
 *                 description: Entidade que originou a notificação
 *               source_entity_id:
 *                 type: integer
 *                 description: ID da entidade que originou a notificação
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *                 description: Prioridade da notificação
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *                 default: ["in_app"]
 *                 description: Canais de entrega
 *               delay:
 *                 type: integer
 *                 default: 0
 *                 description: Delay em segundos antes do envio
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *                 description: Data de expiração
 *               action_url:
 *                 type: string
 *                 description: URL da ação relacionada
 *               action_label:
 *                 type: string
 *                 description: Label do botão de ação
 *     responses:
 *       201:
 *         description: Notificação criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Sem permissão
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/', [
  permissions(['admin', 'manager']),
  body('notification_type').notEmpty().withMessage('Tipo de notificação é obrigatório'),
  body('title').notEmpty().withMessage('Título é obrigatório'),
  body('message').notEmpty().withMessage('Mensagem é obrigatória'),
  body('user_id').optional().isInt(),
  body('user_ids').optional().isArray(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('channels').optional().isArray(),
  body('delay').optional().isInt({ min: 0 }),
  body('expires_at').optional().isISO8601()
], notificationController.createNotification);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Marcar notificação como lida
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da notificação
 *     responses:
 *       200:
 *         description: Notificação marcada como lida
 *       404:
 *         description: Notificação não encontrada
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/:id/read', [
  param('id').isInt()
], notificationController.markAsRead);

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   put:
 *     summary: Marcar todas as notificações como lidas
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas as notificações marcadas como lidas
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/mark-all-read', notificationController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/{id}/archive:
 *   put:
 *     summary: Arquivar notificação
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da notificação
 *     responses:
 *       200:
 *         description: Notificação arquivada
 *       404:
 *         description: Notificação não encontrada
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/:id/archive', [
  param('id').isInt()
], notificationController.archiveNotification);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Excluir notificação
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da notificação
 *     responses:
 *       200:
 *         description: Notificação excluída
 *       404:
 *         description: Notificação não encontrada
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.delete('/:id', [
  param('id').isInt()
], notificationController.deleteNotification);

// Rotas de preferências
/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     summary: Buscar preferências de notificação do usuário
 *     tags: [Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferências de notificação
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/preferences', notificationController.getPreferences);

/**
 * @swagger
 * /api/notifications/preferences:
 *   put:
 *     summary: Atualizar preferências de notificação
 *     tags: [Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - preferences
 *             properties:
 *               preferences:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     notification_type_id:
 *                       type: integer
 *                     channel_id:
 *                       type: integer
 *                     is_enabled:
 *                       type: boolean
 *                     settings:
 *                       type: object
 *     responses:
 *       200:
 *         description: Preferências atualizadas
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/preferences', [
  body('preferences').isArray().withMessage('Preferências devem ser um array')
], notificationController.updatePreferences);

/**
 * @swagger
 * /api/notifications/preferences/available:
 *   get:
 *     summary: Buscar combinações disponíveis de preferências
 *     tags: [Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Combinações disponíveis
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/preferences/available', notificationController.getAvailablePreferences);

/**
 * @swagger
 * /api/notifications/preferences/defaults:
 *   post:
 *     summary: Criar preferências padrão para o usuário
 *     tags: [Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferências padrão criadas
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/preferences/defaults', notificationController.createDefaultPreferences);

/**
 * @swagger
 * /api/notifications/preferences/reset:
 *   put:
 *     summary: Resetar preferências para os padrões
 *     tags: [Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferências resetadas
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/preferences/reset', notificationController.resetPreferences);

/**
 * @swagger
 * /api/notifications/preferences/summary:
 *   get:
 *     summary: Obter resumo das preferências
 *     tags: [Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumo das preferências
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/preferences/summary', notificationController.getPreferencesSummary);

// Rotas administrativas
/**
 * @swagger
 * /api/notifications/test:
 *   post:
 *     summary: Testar envio de notificação
 *     tags: [Notifications Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 default: email
 *                 description: Tipo de teste (email, in_app, etc.)
 *               message:
 *                 type: string
 *                 default: Teste de notificação
 *                 description: Mensagem de teste
 *     responses:
 *       200:
 *         description: Notificação de teste enviada
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/test', [
  permissions(['admin', 'manager']),
  body('type').optional().isString(),
  body('message').optional().isString()
], notificationController.testNotification);

/**
 * @swagger
 * /api/notifications/cleanup/expired:
 *   delete:
 *     summary: Limpar notificações expiradas
 *     tags: [Notifications Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notificações expiradas removidas
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Sem permissão
 *       500:
 *         description: Erro interno do servidor
 */
router.delete('/cleanup/expired', [
  permissions(['admin'])
], notificationController.cleanExpired);

module.exports = router;