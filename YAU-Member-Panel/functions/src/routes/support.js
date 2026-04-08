const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');

// POST /support/message - Send support message
router.post('/message', supportController.sendSupportMessage);

// GET /support/messages - Get all support messages (admin)
router.get('/messages', supportController.getSupportMessages);

// PUT /support/messages/:messageId/status - Update message status (admin)
router.put('/messages/:messageId/status', supportController.updateMessageStatus);

module.exports = router;