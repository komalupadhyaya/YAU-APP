const GroupChatService = require('../services/groupChatService');

class GroupChatController {
  /**
   * Create or ensure group chat exists
   */
  static async createOrEnsureGroupChat(req, res) {
    try {
      const { memberData, student } = req.body;
      
      if (!memberData || !student) {
        return res.status(400).json({
          success: false,
          error: 'Member data and student data are required',
          required: ['memberData', 'student']
        });
      }
      
      console.log('📱 API: Creating/ensuring group chat');
      
      const result = await GroupChatService.createOrEnsureGroupChat(memberData, student);
      
      return res.status(result.success ? 200 : 400).json(result);
      
    } catch (error) {
      console.error('❌ Error in createOrEnsureGroupChat:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create/ensure group chat',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get user's group chats
   */
  static async getUserGroupChats(req, res) {
    try {
      const { userEmail, userUid } = req.body;
      
      if (!userEmail || !userUid) {
        return res.status(400).json({
          success: false,
          error: 'User email and UID are required',
          required: ['userEmail', 'userUid']
        });
      }
      
      console.log('📱 API: Getting user group chats:', { userEmail, userUid });
      
      const groupChats = await GroupChatService.getUserGroupChats(userEmail, userUid);
      
      return res.status(200).json({
        success: true,
        data: groupChats,
        count: groupChats.length
      });
      
    } catch (error) {
      console.error('❌ Error in getUserGroupChats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get user group chats',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get chat messages
   */
  static async getChatMessages(req, res) {
    try {
      const { chatId } = req.params;
      const { limit = 50, createDocumentIfMissing = false } = req.body;
      
      if (!chatId) {
        return res.status(400).json({
          success: false,
          error: 'Chat ID is required'
        });
      }
      
      console.log(`📨 API: Getting messages for chat: ${chatId}`);
      
      const messages = await GroupChatService.getChatMessages(
        chatId, 
        parseInt(limit), 
        createDocumentIfMissing
      );
      
      return res.status(200).json({
        success: true,
        data: messages,
        count: messages.length,
        chatId
      });
      
    } catch (error) {
      console.error('❌ Error in getChatMessages:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get chat messages',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Send message to group chat
   */
  static async sendMessage(req, res) {
    try {
      const { chatId } = req.params;
      const { message, senderId, senderName, senderInfo } = req.body;
      
      if (!chatId || !message || !senderId || !senderName) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['chatId', 'message', 'senderId', 'senderName']
        });
      }
      
      console.log(`📤 API: Sending message to chat: ${chatId}`);
      
      const result = await GroupChatService.sendMessage(
        chatId, 
        message, 
        senderId, 
        senderName, 
        senderInfo
      );
      
      return res.status(result.success ? 201 : 400).json({
        success: result.success,
        chatId,
        error: result.error || null,
        message: result.success ? 'Message sent successfully' : 'Failed to send message'
      });
      
    } catch (error) {
      console.error('❌ Error in sendMessage:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send message',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Create group chat from roster
   */
  static async createGroupChatFromRoster(req, res) {
    try {
      const { rosterId } = req.body;
      
      if (!rosterId) {
        return res.status(400).json({
          success: false,
          error: 'Roster ID is required',
          required: ['rosterId']
        });
      }
      
      console.log('📋 API: Creating group chat from roster:', rosterId);
      
      const result = await GroupChatService.createGroupChatFromRoster(rosterId);
      
      return res.status(result.success ? 200 : 400).json(result);
      
    } catch (error) {
      console.error('❌ Error in createGroupChatFromRoster:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create group chat from roster',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Sync all rosters to group chats
   */
  static async syncRostersToGroupChats(req, res) {
    try {
      console.log('🔄 API: Syncing rosters to group chats');
      
      const results = await GroupChatService.syncRostersToGroupChats();
      
      const summary = {
        total: results.length,
        created: results.filter(r => r.success && r.isNewGroup).length,
        existing: results.filter(r => r.success && r.alreadyExists).length,
        failed: results.filter(r => !r.success).length
      };
      
      return res.status(200).json({
        success: true,
        summary,
        results,
        message: `Sync completed: ${summary.created} created, ${summary.existing} existing, ${summary.failed} failed`
      });
      
    } catch (error) {
      console.error('❌ Error in syncRostersToGroupChats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to sync rosters to group chats',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get user's group chats with latest messages for dashboard
   */
  static async getUserGroupChatsWithLatestMessages(req, res) {
    try {
      const { userEmail, userUid, limit = 1 } = req.query;

      if (!userEmail || !userUid) {
        return res.status(400).json({
          success: false,
          error: 'User email and UID are required as query parameters',
          required: ['userEmail', 'userUid'],
          example: '/api/groupChats/user-chats-with-messages?userEmail=user@example.com&userUid=firebase-uid'
        });
      }

      console.log('📱 API: Getting user group chats with latest messages:', { userEmail, userUid, limit });

      const groupChatsWithMessages = await GroupChatService.getUserGroupChatsWithLatestMessages(
        userEmail,
        userUid,
        parseInt(limit) || 1
      );

      return res.status(200).json({
        success: true,
        data: groupChatsWithMessages,
        count: groupChatsWithMessages.length,
        summary: {
          totalChats: groupChatsWithMessages.length,
          chatsWithMessages: groupChatsWithMessages.filter(chat => chat.hasMessages).length,
          chatsWithoutMessages: groupChatsWithMessages.filter(chat => !chat.hasMessages).length
        }
      });

    } catch (error) {
      console.error('❌ Error in getUserGroupChatsWithLatestMessages:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get user group chats with latest messages',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Validate user chat access
   */
  static async validateUserChatAccess(req, res) {
    try {
      const { chatId } = req.params;
      const { userEmail, userUid } = req.body;
      
      if (!chatId || !userEmail || !userUid) {
        return res.status(400).json({
          success: false,
          error: 'Chat ID, user email, and user UID are required',
          required: ['chatId', 'userEmail', 'userUid']
        });
      }
      
      console.log(`🔐 API: Validating user access to chat: ${chatId}`);
      
      const result = await GroupChatService.validateUserChatAccess(chatId, userEmail, userUid);
      
      return res.status(200).json(result);
      
    } catch (error) {
      console.error('❌ Error in validateUserChatAccess:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to validate chat access',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Ensure proper message collection structure
   */
  static async ensureMessageCollectionStructure(req, res) {
    try {
      console.log('🔧 API: Ensuring proper message collection structure');
      
      const result = await GroupChatService.ensureMessageCollectionStructure();
      
      return res.status(200).json(result);
      
    } catch (error) {
      console.error('❌ Error in ensureMessageCollectionStructure:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to ensure message collection structure',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = GroupChatController;