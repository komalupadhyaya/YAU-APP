const express = require('express');
const router = express.Router();
const childIdController = require('../controllers/childIdController');

// Admin Routes (should be protected with admin middleware)
// GET /child-ids - Get all Child ID orders with filters
router.get('/', childIdController.getAllChildIdOrders);

// GET /child-ids/summary - Get Child ID summary statistics
router.get('/summary', childIdController.getChildIdSummary);

// GET /child-ids/search - Search Child ID orders
router.get('/search', childIdController.searchChildIdOrders);

// POST /child-ids - Create Child ID order manually (admin)
router.post('/', childIdController.createChildIdOrder);

// PUT /child-ids/:orderId - Update Child ID order
router.put('/:orderId', childIdController.updateChildIdOrder);

// PUT /child-ids/:orderId/received - Update received status
router.put('/:orderId/received', childIdController.updateReceivedStatus);

// Member/Parent Routes
// GET /child-ids/parent/:parentId - Get Child ID orders by parent
router.get('/parent/:parentId', childIdController.getChildIdOrdersByParent);

// GET /child-ids/student/:studentId - Get Child ID orders by student
router.get('/student/:studentId', childIdController.getChildIdOrdersByStudent);

module.exports = router;