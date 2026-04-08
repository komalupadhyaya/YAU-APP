// src/routes/resources.js
const express = require('express');
const router = express.Router();
const ResourceController = require('../controllers/resourceController');

// Routes for resources
router.get('/', ResourceController.getAllResources);
router.get('/:id', ResourceController.getResourceById);
router.post('/',  ResourceController.createResource);
router.put('/:id',  ResourceController.updateResource);
router.delete('/:id',  ResourceController.deleteResource);
router.post('/batch-delete',  ResourceController.batchDeleteResources);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Resource service is healthy',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;