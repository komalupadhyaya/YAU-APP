// routes/teamMessages.js
const express = require('express');
const router = express.Router();
const TeamMessagesController = require('../controllers/teamMessagesController');

// Middleware for logging
router.use((req, res, next) => {
  console.log(`📨 Team Messages API: ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * @route   GET /team-messages/stats
 * @desc    Get team message statistics
 * @access  Public (can add auth middleware later)
 */
router.get('/stats', TeamMessagesController.getTeamMessageStats);

/**
 * @route   GET /team-messages
 * @desc    Get all team messages from groupChats collection
 * @access  Public (can add auth middleware later)
 */
router.get('/', TeamMessagesController.getAllTeamMessages);

/**
 * @route   GET /team-messages/:rosterId
 * @desc    Get team messages by roster ID
 * @access  Public (can add auth middleware later)
 */
router.get('/:rosterId', TeamMessagesController.getTeamMessagesByRoster);

/**
 * @route   POST /team-messages
 * @desc    Create a new team message
 * @access  Public (can add auth middleware later)
 * @body    { rosterId, rosterName, text, senderName, uid, priority?, timestamp? }
 */
router.post('/', TeamMessagesController.createTeamMessage);

/**
 * @route   PATCH /team-messages/:messageId/read
 * @desc    Mark a team message as read
 * @access  Public (can add auth middleware later)
 * @body    { uid? }
 */
router.patch('/:messageId/read', TeamMessagesController.markTeamMessageAsRead);

/**
 * @route   DELETE /team-messages/:messageId
 * @desc    Delete a team message (soft delete)
 * @access  Public (can add auth middleware later)
 * @body    { uid }
 */
router.delete('/:messageId', TeamMessagesController.deleteTeamMessage);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('❌ Team Messages API Error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    endpoint: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;