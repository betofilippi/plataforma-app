const NotificationService = require('../services/NotificationService');
const AlertService = require('../services/AlertService');

/**
 * Middleware de notificações para integração com módulos ERP
 */
class NotificationMiddleware {
  constructor() {
    this.notificationService = new NotificationService();
    this.alertService = new AlertService();
    this.initialized = false;
  }

  /**
   * Inicializar middleware
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.notificationService.initialize();
      await this.alertService.initialize();
      this.initialized = true;
    } catch (error) {
      console.error('❌ Erro ao inicializar NotificationMiddleware:', error);
      throw error;
    }
  }

  /**
   * Middleware para capturar eventos de estoque
   */
  stockEventHandler = async (req, res, next) => {
    try {
      if (!this.initialized) await this.initialize();

      // Interceptar resposta para detectar mudanças
      const originalSend = res.send;
      
      res.send = async function(data) {
        try {
          const responseData = typeof data === 'string' ? JSON.parse(data) : data;
          
          // Verificar se é uma operação de sucesso
          if (responseData.success && req.method !== 'GET') {
            await this.handleStockEvent(req, responseData);
          }
        } catch (error) {
          console.error('❌ Erro no middleware de estoque:', error);
        } finally {
          originalSend.call(this, data);
        }
      }.bind(this);

      next();

    } catch (error) {
      console.error('❌ Erro no middleware de estoque:', error);
      next();
    }
  }

  /**
   * Processar eventos de estoque
   */
  async handleStockEvent(req, responseData) {
    const { method, path, body, user } = req;
    
    try {
      // Movimento de estoque
      if (path.includes('/estoque/movimentos') && method === 'POST') {
        await this.handleStockMovement(body, user, responseData);
      }
      
      // Atualização de estoque
      if (path.includes('/estoque') && method === 'PUT') {
        await this.handleStockUpdate(body, user, responseData);
      }

      // Criação/atualização de produto
      if (path.includes('/produtos') && ['POST', 'PUT'].includes(method)) {
        await this.checkStockLevels(body, responseData);
      }

    } catch (error) {
      console.error('❌ Erro ao processar evento de estoque:', error);
    }
  }

  /**
   * Processar movimento de estoque
   */
  async handleStockMovement(movementData, user, responseData) {
    const { produto_id, tipo_movimento, quantidade } = movementData;

    // Verificar níveis após movimento
    await this.checkStockLevels({ produto_id }, responseData);

    // Notificar sobre movimento significativo
    if (quantidade >= 100) { // Threshold configurável
      await this.alertService.triggerAlert('stock_movement', {
        product_id: produto_id,
        movement_type: tipo_movimento,
        quantity: quantidade,
        user_id: user?.id,
        recipients: ['manager', 'stock_supervisor']
      });
    }
  }

  /**
   * Processar atualização de estoque
   */
  async handleStockUpdate(stockData, user, responseData) {
    const { produto_id } = stockData;

    // Verificar níveis após atualização
    await this.checkStockLevels({ produto_id }, responseData);
  }

  /**
   * Verificar níveis de estoque
   */
  async checkStockLevels(productData, responseData) {
    try {
      // Disparar verificação de estoque baixo
      await this.alertService.triggerAlert('stock_low', {
        product_id: productData.produto_id,
        check_all: !productData.produto_id,
        recipients: ['manager', 'stock_supervisor']
      });

      // Disparar verificação de produtos sem estoque
      await this.alertService.triggerAlert('out_of_stock', {
        product_id: productData.produto_id,
        check_all: !productData.produto_id,
        recipients: ['manager', 'stock_supervisor']
      });

    } catch (error) {
      console.error('❌ Erro ao verificar níveis de estoque:', error);
    }
  }

  /**
   * Middleware para capturar eventos de vendas
   */
  salesEventHandler = async (req, res, next) => {
    try {
      if (!this.initialized) await this.initialize();

      const originalSend = res.send;
      
      res.send = async function(data) {
        try {
          const responseData = typeof data === 'string' ? JSON.parse(data) : data;
          
          if (responseData.success && req.method !== 'GET') {
            await this.handleSalesEvent(req, responseData);
          }
        } catch (error) {
          console.error('❌ Erro no middleware de vendas:', error);
        } finally {
          originalSend.call(this, data);
        }
      }.bind(this);

      next();

    } catch (error) {
      console.error('❌ Erro no middleware de vendas:', error);
      next();
    }
  }

  /**
   * Processar eventos de vendas
   */
  async handleSalesEvent(req, responseData) {
    const { method, path, body, user } = req;
    
    try {
      // Novo pedido
      if (path.includes('/pedidos') && method === 'POST') {
        await this.handleNewOrder(body, user, responseData);
      }
      
      // Atualização de pedido
      if (path.includes('/pedidos') && method === 'PUT') {
        await this.handleOrderUpdate(body, user, responseData);
      }

      // Pagamento recebido
      if (path.includes('/pagamentos') && method === 'POST') {
        await this.handlePaymentReceived(body, user, responseData);
      }

    } catch (error) {
      console.error('❌ Erro ao processar evento de vendas:', error);
    }
  }

  /**
   * Processar novo pedido
   */
  async handleNewOrder(orderData, user, responseData) {
    const { cliente_id, valor_total, items } = orderData;
    const orderId = responseData.data?.id;

    if (!orderId) return;

    // Buscar dados do cliente
    const clientName = await this.getClientName(cliente_id);

    // Disparar alerta de novo pedido
    await this.alertService.triggerAlert('new_order', {
      orderId,
      orderValue: valor_total,
      customerName: clientName,
      itemsCount: items?.length || 0,
      recipients: ['sales', 'manager']
    });

    // Verificar se é um pedido de alto valor
    if (valor_total >= 10000) { // Threshold configurável
      await this.notificationService.createNotification({
        user_ids: await this.getUsersByRole(['manager', 'director']),
        notification_type: 'sales_alert',
        title: 'Pedido de Alto Valor',
        message: `Novo pedido de ${clientName} no valor de R$ ${valor_total}`,
        priority: 'high',
        channels: ['in_app', 'email'],
        source_module: 'vnd',
        source_entity: 'pedido',
        source_entity_id: orderId,
        action_url: `/vendas/pedidos/${orderId}`,
        action_label: 'Ver Pedido',
        data: {
          order_id: orderId,
          order_value: valor_total,
          customer_name: clientName,
          high_value: true
        }
      });
    }
  }

  /**
   * Processar atualização de pedido
   */
  async handleOrderUpdate(orderData, user, responseData) {
    const { status, motivo_cancelamento } = orderData;
    const orderId = responseData.data?.id;

    if (!orderId) return;

    // Pedido cancelado
    if (status === 'cancelado') {
      await this.alertService.triggerAlert('order_cancelled', {
        orderId,
        reason: motivo_cancelamento,
        cancelledBy: user?.id,
        recipients: ['sales', 'manager']
      });
    }
  }

  /**
   * Processar pagamento recebido
   */
  async handlePaymentReceived(paymentData, user, responseData) {
    const { pedido_id, valor } = paymentData;

    await this.alertService.triggerAlert('payment_received', {
      orderId: pedido_id,
      amount: valor,
      receivedBy: user?.id,
      recipients: ['finance', 'sales']
    });
  }

  /**
   * Middleware para capturar eventos de produção
   */
  productionEventHandler = async (req, res, next) => {
    try {
      if (!this.initialized) await this.initialize();

      const originalSend = res.send;
      
      res.send = async function(data) {
        try {
          const responseData = typeof data === 'string' ? JSON.parse(data) : data;
          
          if (responseData.success && req.method !== 'GET') {
            await this.handleProductionEvent(req, responseData);
          }
        } catch (error) {
          console.error('❌ Erro no middleware de produção:', error);
        } finally {
          originalSend.call(this, data);
        }
      }.bind(this);

      next();

    } catch (error) {
      console.error('❌ Erro no middleware de produção:', error);
      next();
    }
  }

  /**
   * Processar eventos de produção
   */
  async handleProductionEvent(req, responseData) {
    const { method, path, body, user } = req;
    
    try {
      // Ordem de produção
      if (path.includes('/ordens-producao') && method === 'POST') {
        await this.handleProductionOrderCreated(body, user, responseData);
      }
      
      // Atualização de ordem
      if (path.includes('/ordens-producao') && method === 'PUT') {
        await this.handleProductionOrderUpdate(body, user, responseData);
      }

      // Problema de qualidade
      if (path.includes('/qualidade/problemas') && method === 'POST') {
        await this.handleQualityIssue(body, user, responseData);
      }

    } catch (error) {
      console.error('❌ Erro ao processar evento de produção:', error);
    }
  }

  /**
   * Processar criação de ordem de produção
   */
  async handleProductionOrderCreated(orderData, user, responseData) {
    const { produto_id, quantidade, data_prevista } = orderData;
    const orderId = responseData.data?.id;

    if (!orderId) return;

    // Notificar equipe de produção
    await this.notificationService.createNotification({
      user_ids: await this.getUsersByRole(['production', 'supervisor']),
      notification_type: 'production_alert',
      title: 'Nova Ordem de Produção',
      message: `Nova ordem de produção criada para ${quantidade} unidades`,
      priority: 'medium',
      channels: ['in_app'],
      source_module: 'prd',
      source_entity: 'ordem_producao',
      source_entity_id: orderId,
      action_url: `/producao/ordens/${orderId}`,
      action_label: 'Ver Ordem',
      data: {
        order_id: orderId,
        product_id: produto_id,
        quantity: quantidade,
        expected_date: data_prevista
      }
    });
  }

  /**
   * Processar atualização de ordem de produção
   */
  async handleProductionOrderUpdate(orderData, user, responseData) {
    const { status, data_conclusao, atraso_motivo } = orderData;
    const orderId = responseData.data?.id;

    if (!orderId) return;

    // Ordem atrasada
    if (status === 'atrasada') {
      await this.alertService.triggerAlert('production_delay', {
        orderId,
        reason: atraso_motivo,
        reportedBy: user?.id,
        recipients: ['production', 'manager']
      });
    }

    // Ordem concluída
    if (status === 'concluida') {
      await this.notificationService.createNotification({
        user_ids: await this.getUsersByRole(['sales', 'manager']),
        notification_type: 'production_alert',
        title: 'Produção Concluída',
        message: `Ordem de produção #${orderId} foi concluída`,
        priority: 'low',
        channels: ['in_app'],
        source_module: 'prd',
        source_entity: 'ordem_producao',
        source_entity_id: orderId,
        data: {
          order_id: orderId,
          completion_date: data_conclusao
        }
      });
    }
  }

  /**
   * Processar problema de qualidade
   */
  async handleQualityIssue(issueData, user, responseData) {
    const { ordem_producao_id, severidade, descricao } = issueData;
    const issueId = responseData.data?.id;

    await this.alertService.triggerAlert('quality_issue', {
      issueId,
      orderId: ordem_producao_id,
      severity: severidade,
      description: descricao,
      reportedBy: user?.id,
      recipients: ['production', 'quality', 'manager']
    });
  }

  /**
   * Middleware para capturar eventos financeiros
   */
  financialEventHandler = async (req, res, next) => {
    try {
      if (!this.initialized) await this.initialize();

      const originalSend = res.send;
      
      res.send = async function(data) {
        try {
          const responseData = typeof data === 'string' ? JSON.parse(data) : data;
          
          if (responseData.success && req.method !== 'GET') {
            await this.handleFinancialEvent(req, responseData);
          }
        } catch (error) {
          console.error('❌ Erro no middleware financeiro:', error);
        } finally {
          originalSend.call(this, data);
        }
      }.bind(this);

      next();

    } catch (error) {
      console.error('❌ Erro no middleware financeiro:', error);
      next();
    }
  }

  /**
   * Processar eventos financeiros
   */
  async handleFinancialEvent(req, responseData) {
    const { method, path, body, user } = req;
    
    try {
      // Conta a receber vencida
      if (path.includes('/contas-receber') && method === 'PUT') {
        await this.handleReceivableUpdate(body, user, responseData);
      }
      
      // Orçamento excedido
      if (path.includes('/orcamentos') && method === 'PUT') {
        await this.handleBudgetUpdate(body, user, responseData);
      }

    } catch (error) {
      console.error('❌ Erro ao processar evento financeiro:', error);
    }
  }

  /**
   * Processar atualização de conta a receber
   */
  async handleReceivableUpdate(accountData, user, responseData) {
    const { status, data_vencimento, valor } = accountData;
    const accountId = responseData.data?.id;

    // Conta vencida
    if (status === 'vencida') {
      await this.alertService.triggerAlert('invoice_due', {
        accountId,
        dueDate: data_vencimento,
        amount: valor,
        recipients: ['finance', 'manager']
      });
    }
  }

  /**
   * Processar atualização de orçamento
   */
  async handleBudgetUpdate(budgetData, user, responseData) {
    const { valor_gasto, valor_limite } = budgetData;
    const budgetId = responseData.data?.id;

    // Orçamento excedido
    if (valor_gasto > valor_limite) {
      await this.alertService.triggerAlert('budget_exceeded', {
        budgetId,
        spent: valor_gasto,
        limit: valor_limite,
        overage: valor_gasto - valor_limite,
        recipients: ['finance', 'manager', 'director']
      });
    }
  }

  /**
   * Middleware para capturar eventos de importação
   */
  importEventHandler = async (req, res, next) => {
    try {
      if (!this.initialized) await this.initialize();

      const originalSend = res.send;
      
      res.send = async function(data) {
        try {
          const responseData = typeof data === 'string' ? JSON.parse(data) : data;
          
          if (responseData.success && req.method !== 'GET') {
            await this.handleImportEvent(req, responseData);
          }
        } catch (error) {
          console.error('❌ Erro no middleware de importação:', error);
        } finally {
          originalSend.call(this, data);
        }
      }.bind(this);

      next();

    } catch (error) {
      console.error('❌ Erro no middleware de importação:', error);
      next();
    }
  }

  /**
   * Processar eventos de importação
   */
  async handleImportEvent(req, responseData) {
    const { method, path, body, user } = req;
    
    try {
      // Importação concluída
      if (path.includes('/importacao') && method === 'POST') {
        await this.handleImportCompleted(body, user, responseData);
      }

    } catch (error) {
      console.error('❌ Erro ao processar evento de importação:', error);
    }
  }

  /**
   * Processar importação concluída
   */
  async handleImportCompleted(importData, user, responseData) {
    const { arquivo, registros_processados, registros_erro } = importData;
    const importId = responseData.data?.id;

    const hasErrors = registros_erro > 0;

    await this.alertService.triggerAlert(
      hasErrors ? 'import_failed' : 'import_completed',
      {
        importId,
        filename: arquivo,
        processedRecords: registros_processados,
        errorRecords: registros_erro,
        success: !hasErrors,
        userId: user?.id,
        recipients: ['admin', 'manager']
      }
    );
  }

  // Métodos auxiliares

  /**
   * Obter nome do cliente
   */
  async getClientName(clientId) {
    try {
      // Implementar busca real do cliente
      return `Cliente #${clientId}`;
    } catch (error) {
      return 'Cliente Desconhecido';
    }
  }

  /**
   * Obter usuários por role
   */
  async getUsersByRole(roles) {
    try {
      // Implementar busca real de usuários por role
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Obter instância do middleware para uso em rotas
   */
  getMiddleware() {
    return {
      stock: this.stockEventHandler,
      sales: this.salesEventHandler,
      production: this.productionEventHandler,
      financial: this.financialEventHandler,
      import: this.importEventHandler
    };
  }
}

// Instância singleton
const notificationMiddleware = new NotificationMiddleware();

module.exports = notificationMiddleware;