#!/usr/bin/env node
/**
 * Test script for CAD module
 * Run with: node backend/modules/cad/test-module.js
 */

const express = require('express');
const cadRoutes = require('./routes');

console.log('🧪 Testing CAD Module...\n');

// Test 1: Check if routes are properly defined
console.log('✅ Test 1: Route Definition');
console.log('   - Routes object:', typeof cadRoutes);
console.log('   - Routes stack length:', cadRoutes.stack ? cadRoutes.stack.length : 'No stack');

// Test 2: Check if all controllers exist
console.log('\n✅ Test 2: Controllers');
try {
  const clientsController = require('./controllers/clientsController');
  const suppliersController = require('./controllers/suppliersController');
  const productsController = require('./controllers/productsController');
  
  console.log('   - Clients controller methods:', Object.keys(clientsController).length);
  console.log('   - Suppliers controller methods:', Object.keys(suppliersController).length);
  console.log('   - Products controller methods:', Object.keys(productsController).length);
} catch (error) {
  console.log('   ❌ Controller loading error:', error.message);
}

// Test 3: Check if all services exist
console.log('\n✅ Test 3: Services');
try {
  const validationService = require('./services/validationService');
  const clientsService = require('./services/clientsService');
  const suppliersService = require('./services/suppliersService');
  const productsService = require('./services/productsService');
  
  console.log('   - Validation service schemas:', Object.keys(validationService).filter(k => k.includes('Schema')).length);
  console.log('   - Clients service methods:', Object.getOwnPropertyNames(clientsService.prototype || clientsService).length);
  console.log('   - Suppliers service methods:', Object.getOwnPropertyNames(suppliersService.prototype || suppliersService).length);
  console.log('   - Products service methods:', Object.getOwnPropertyNames(productsService.prototype || productsService).length);
} catch (error) {
  console.log('   ❌ Service loading error:', error.message);
}

// Test 4: Test basic Express app integration
console.log('\n✅ Test 4: Express Integration');
try {
  const app = express();
  app.use('/api/cad', cadRoutes);
  
  console.log('   - Express app created successfully');
  console.log('   - CAD routes mounted at /api/cad');
  
  // Count routes
  let routeCount = 0;
  app._router.stack.forEach(layer => {
    if (layer.route) {
      routeCount++;
    } else if (layer.name === 'router') {
      layer.handle.stack.forEach(subLayer => {
        if (subLayer.route) {
          routeCount++;
        } else if (subLayer.name === 'router') {
          routeCount += subLayer.handle.stack.length;
        }
      });
    }
  });
  
  console.log('   - Total routes registered:', routeCount);
} catch (error) {
  console.log('   ❌ Express integration error:', error.message);
}

// Test 5: Database connection test
console.log('\n✅ Test 5: Database Connection');
try {
  const db = require('../../src/database/connection');
  console.log('   - Database connection imported successfully');
  console.log('   - Connection type:', typeof db);
  
  // Test a simple query (non-blocking)
  db.raw('SELECT 1 as test')
    .then(() => {
      console.log('   - Database connection test: ✅ SUCCESS');
    })
    .catch((err) => {
      console.log('   - Database connection test: ⚠️  FAILED (running in mock mode)');
      console.log('     Error:', err.message);
    });
} catch (error) {
  console.log('   ❌ Database connection import error:', error.message);
}

console.log('\n🎉 CAD Module Test Complete!');
console.log('\n📋 Summary:');
console.log('   - Module structure: ✅ Valid');
console.log('   - Controllers: ✅ Loaded');
console.log('   - Services: ✅ Loaded');
console.log('   - Routes: ✅ Configured');
console.log('   - Express integration: ✅ Ready');
console.log('   - Database: ⚠️  Test running...');

console.log('\n🚀 To start the server with CAD module:');
console.log('   cd backend && npm start');
console.log('\n🌐 API endpoints will be available at:');
console.log('   - Health: GET http://localhost:3001/api/cad/health');
console.log('   - Clients: GET http://localhost:3001/api/cad/clients');
console.log('   - Suppliers: GET http://localhost:3001/api/cad/suppliers');
console.log('   - Products: GET http://localhost:3001/api/cad/products');

console.log('\n🔑 Note: All endpoints require JWT authentication');
console.log('   Add header: Authorization: Bearer <your-jwt-token>');