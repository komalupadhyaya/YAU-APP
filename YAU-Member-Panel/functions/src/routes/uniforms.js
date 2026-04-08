const express = require('express');
const router = express.Router();
const uniformController = require('../controllers/uniformController');

// Admin Routes (should be protected with admin middleware)
// GET /uniforms - Get all uniform orders with filters
router.get('/', uniformController.getAllUniformOrders);

// GET /uniforms/summary - Get uniform summary statistics
router.get('/summary', uniformController.getUniformSummary);

// GET /uniforms/search - Search uniform orders
router.get('/search', uniformController.searchUniformOrders);

// GET /uniforms/export/csv - Export uniform orders to CSV
router.get('/export/csv', uniformController.exportUniformOrdersCSV);

// POST /uniforms - Create uniform order manually (admin)
router.post('/', uniformController.createUniformOrder);

// PUT /uniforms/:orderId - Update uniform order
router.put('/:orderId', uniformController.updateUniformOrder);

// PUT /uniforms/:orderId/received - Update received status
router.put('/:orderId/received', uniformController.updateReceivedStatus);

// POST /uniforms/batch-delete - Batch delete uniform orders
router.post('/batch-delete', uniformController.batchDeleteUniformOrders);

// Member/Parent Routes
// GET /uniforms/parent/:parentId - Get uniform orders by parent
router.get('/parent/:parentId', uniformController.getUniformOrdersByParent);

// GET /uniforms/student/:studentId - Get uniform orders by student
router.get('/student/:studentId', uniformController.getUniformOrdersByStudent);

module.exports = router;