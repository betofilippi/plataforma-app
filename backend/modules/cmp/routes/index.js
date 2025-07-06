const express = require('express');
const router = express.Router();

// Import route modules
const purchaseOrdersRoutes = require('./purchaseOrders');
const quotationsRoutes = require('./quotations');
const requisitionsRoutes = require('./requisitions');

// Module health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    module: 'CMP',
    description: 'Módulo de Compras',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      purchase_orders: '/api/cmp/purchase-orders',
      quotations: '/api/cmp/quotations',
      requisitions: '/api/cmp/requisitions'
    }
  });
});

// Route mappings
router.use('/purchase-orders', purchaseOrdersRoutes);
router.use('/quotations', quotationsRoutes);
router.use('/requisitions', requisitionsRoutes);

// Module statistics endpoint
router.get('/stats', async (req, res) => {
  try {
    const db = require('../../../src/database/connection');
    
    // Get overall purchase module statistics
    const [
      totalOrders,
      totalQuotations,
      totalRequisitions,
      pendingApprovals,
      monthlySpending
    ] = await Promise.all([
      db('cmp_01_pedidos_compra').count('* as count').first(),
      db('cmp_04_cotacoes').count('* as count').first(),
      db('cmp_06_requisicoes_compra').count('* as count').first(),
      db('cmp_01_pedidos_compra').where('status', 'PENDENTE').count('* as count').first(),
      db('cmp_01_pedidos_compra as pc')
        .leftJoin('cmp_02_itens_pedido_compra as i', 'pc.id_pedido_compra', 'i.id_pedido_compra')
        .whereRaw('EXTRACT(MONTH FROM pc.data_pedido) = EXTRACT(MONTH FROM CURRENT_DATE)')
        .whereRaw('EXTRACT(YEAR FROM pc.data_pedido) = EXTRACT(YEAR FROM CURRENT_DATE)')
        .sum(db.raw('i.quantidade * i.preco_unitario * (1 - COALESCE(i.desconto_percentual, 0) / 100)'))
        .first()
    ]);

    res.json({
      success: true,
      data: {
        total_pedidos: parseInt(totalOrders.count),
        total_cotacoes: parseInt(totalQuotations.count),
        total_requisicoes: parseInt(totalRequisitions.count),
        pendentes_aprovacao: parseInt(pendingApprovals.count),
        gasto_mensal: parseFloat(monthlySpending.sum) || 0
      }
    });

  } catch (error) {
    console.error('Error fetching CMP module stats:', error);
    res.status(500).json({
      success: false,
      error: 'DATABASE_ERROR',
      message: 'Erro ao buscar estatísticas do módulo',
      details: error.message
    });
  }
});

module.exports = router;