const express = require('express');
const router = express.Router();

// Import route modules
const rentalContractsRoutes = require('./rentalContracts');
const equipmentRoutes = require('./equipment');
const maintenanceRoutes = require('./maintenance');

// Mount routes
router.use('/rental-contracts', rentalContractsRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/maintenance', maintenanceRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'LOC module is healthy',
    module: 'Locação (LOC)',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
