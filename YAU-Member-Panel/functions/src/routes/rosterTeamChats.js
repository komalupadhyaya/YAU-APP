const express = require('express');
const RosterTeamChatsController = require('../controllers/rosterTeamChatsController');
const router = express.Router();

/**
 * @route   POST /api/member-team-chats
 * @desc    Get team chats for a member based on their roster participations
 * @access  Private (requires authentication)
 */
router.post('/member-team-chats', RosterTeamChatsController.getMemberTeamChats);

/**
 * @route   POST /api/coach-team-chats
 * @desc    Get team chats for a coach based on rosters they coach
 * @access  Private (requires authentication)
 */
router.post('/coach-team-chats', RosterTeamChatsController.getCoachTeamChats);

/**
 * @route   POST /api/team-chat/:teamChatId/messages
 * @desc    Get messages for a specific team chat
 * @access  Private (requires team membership)
 */
router.post('/team-chat/:teamChatId/messages', RosterTeamChatsController.getTeamChatMessages);

/**
 * @route   POST /api/team-chat/:teamChatId/send-message
 * @desc    Send a message to a team chat
 * @access  Private (requires team membership)
 */
router.post('/team-chat/:teamChatId/send-message', RosterTeamChatsController.sendTeamChatMessage);

/**
 * @route   POST /api/team-chat/:teamChatId/check-access
 * @desc    Check user's access and role in a specific team chat
 * @access  Private (requires authentication)
 */
router.post('/team-chat/:teamChatId/check-access', RosterTeamChatsController.checkTeamChatAccess);

module.exports = router;