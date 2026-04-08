const express = require('express');
const router = express.Router();
const GroupChatController = require('../controllers/groupChatController');

// Create or ensure group chat exists
router.post('/create-or-ensure', GroupChatController.createOrEnsureGroupChat);

// Get user's group chats
router.post('/user-chats', GroupChatController.getUserGroupChats);

// Get user's group chats with latest messages for dashboard
router.get('/user-chats-with-messages', GroupChatController.getUserGroupChatsWithLatestMessages);

// Get messages for a specific chat
router.post('/:chatId/messages', GroupChatController.getChatMessages);

// Send message to a group chat
router.post('/:chatId/send-message', GroupChatController.sendMessage);

// Create group chat from roster
router.post('/from-roster', GroupChatController.createGroupChatFromRoster);

// Sync all rosters to group chats
router.post('/sync-rosters', GroupChatController.syncRostersToGroupChats);

// Validate user access to a chat
router.post('/:chatId/validate-access', GroupChatController.validateUserChatAccess);

// Ensure proper message collection structure (admin utility)
router.post('/admin/ensure-message-structure', GroupChatController.ensureMessageCollectionStructure);

module.exports = router;