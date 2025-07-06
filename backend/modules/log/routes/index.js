const express = require('express');
const router = express.Router();

// Import controllers
const transportationController = require('../controllers/transportationController');
const routeOptimizationController = require('../controllers/routeOptimizationController');
const carriersController = require('../controllers/carriersController');

// Import validation middleware
const { 
  validate, 
  validateQuery, 
  validateId,
  transportationSchema,
  transportationUpdateSchema,
  routeSchema,
  routeUpdateSchema,
  carrierSchema,
  carrierUpdateSchema
} = require('../services/validationService');

/**
 * LOG Module Routes
 * Complete logistics management system
 */

// ===== TRANSPORTATION ROUTES =====

// Get all transportation orders
router.get('/transportation', 
  validateQuery,
  transportationController.getAllTransportation
);

// Get transportation statistics
router.get('/transportation/stats', 
  transportationController.getTransportationStats
);

// Calculate freight cost
router.post('/transportation/calculate-freight', 
  transportationController.calculateFreight
);

// Get active deliveries
router.get('/transportation/active-deliveries', 
  transportationController.getActiveDeliveries
);

// Get transportation by ID
router.get('/transportation/:id', 
  validateId,
  transportationController.getTransportationById
);

// Create new transportation order
router.post('/transportation', 
  validate(transportationSchema),
  transportationController.createTransportation
);

// Update transportation order
router.put('/transportation/:id', 
  validateId,
  validate(transportationUpdateSchema),
  transportationController.updateTransportation
);

// Delete transportation order
router.delete('/transportation/:id', 
  validateId,
  transportationController.deleteTransportation
);

// Track transportation order
router.get('/transportation/:id/tracking', 
  validateId,
  transportationController.trackTransportation
);

// Update transportation status
router.patch('/transportation/:id/status', 
  validateId,
  transportationController.updateTransportationStatus
);

// ===== ROUTE OPTIMIZATION ROUTES =====

// Get all routes
router.get('/routes', 
  validateQuery,
  routeOptimizationController.getAllRoutes
);

// Get route statistics
router.get('/routes/stats', 
  routeOptimizationController.getRouteStats
);

// Get delivery performance metrics
router.get('/routes/performance', 
  routeOptimizationController.getDeliveryPerformance
);

// Optimize routes
router.post('/routes/optimize', 
  routeOptimizationController.optimizeRoutes
);

// Calculate route distance and time
router.post('/routes/calculate', 
  routeOptimizationController.calculateRoute
);

// Get route by ID
router.get('/routes/:id', 
  validateId,
  routeOptimizationController.getRouteById
);

// Create new route
router.post('/routes', 
  validate(routeSchema),
  routeOptimizationController.createRoute
);

// Update route
router.put('/routes/:id', 
  validateId,
  validate(routeUpdateSchema),
  routeOptimizationController.updateRoute
);

// Start route execution
router.post('/routes/:id/start', 
  validateId,
  routeOptimizationController.startRoute
);

// Complete route execution
router.post('/routes/:id/complete', 
  validateId,
  routeOptimizationController.completeRoute
);

// ===== CARRIERS ROUTES =====

// Get all carriers
router.get('/carriers', 
  validateQuery,
  carriersController.getAllCarriers
);

// Get carrier statistics
router.get('/carriers/stats', 
  carriersController.getCarrierStats
);

// Get carriers for selection dropdown
router.get('/carriers/select', 
  carriersController.getCarriersForSelect
);

// Get carrier by ID
router.get('/carriers/:id', 
  validateId,
  carriersController.getCarrierById
);

// Create new carrier
router.post('/carriers', 
  validate(carrierSchema),
  carriersController.createCarrier
);

// Update carrier
router.put('/carriers/:id', 
  validateId,
  validate(carrierUpdateSchema),
  carriersController.updateCarrier
);

// Delete carrier
router.delete('/carriers/:id', 
  validateId,
  carriersController.deleteCarrier
);

// Get carrier performance metrics
router.get('/carriers/:id/performance', 
  validateId,
  carriersController.getCarrierPerformance
);

// Toggle carrier active status
router.patch('/carriers/:id/toggle-status', 
  validateId,
  carriersController.toggleCarrierStatus
);

// Calculate shipping quote
router.post('/carriers/:id/quote', 
  validateId,
  carriersController.calculateShippingQuote
);

// ===== DELIVERY TRACKING ROUTES =====

// Note: Delivery tracking is handled through transportation routes
// Additional tracking endpoints can be added here if needed

/**
 * Error handling middleware for LOG routes
 */
router.use((error, req, res, next) => {
  console.error('LOG Module Error:', error);
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }

  if (error.message.includes('não encontrado') || error.message.includes('não encontrada')) {
    return res.status(404).json({
      success: false,
      error: 'Recurso não encontrado',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }

  if (error.message.includes('Já existe')) {
    return res.status(409).json({
      success: false,
      error: 'Conflito de dados',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }

  // Generic server error
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: 'Ocorreu um erro inesperado no módulo de logística',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;