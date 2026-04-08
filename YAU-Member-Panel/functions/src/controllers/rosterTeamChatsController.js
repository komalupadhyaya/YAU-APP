const { db } = require('../utils/firebase');
const { collection, addDoc, serverTimestamp, updateDoc, doc, setDoc } = require('firebase/firestore');
const RosterTeamChatService = require('../services/rosterTeamChatService');

class RosterTeamChatsController {
  static async getMemberTeamChats(req, res) {
    try {
      const { memberId, memberEmail } = req.body;
      
      if (!memberId || !memberEmail) {
        return res.status(400).json({
          success: false,
          error: 'Member ID and email are required',
          required: ['memberId', 'memberEmail']
        });
      }
      
      console.log('📥 API: Getting member team chats:', { memberId, memberEmail });
      
      const teamChats = await RosterTeamChatService.getMemberTeamChats(memberId, memberEmail);
      
      return res.status(200).json({
        success: true,
        data: teamChats,
        count: teamChats.length,
        userType: 'member'
      });
      
    } catch (error) {
      console.error('❌ Error in getMemberTeamChats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get member team chats',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
  
  static async getCoachTeamChats(req, res) {
    try {
      const { coachId } = req.body;
      
      if (!coachId) {
        return res.status(400).json({
          success: false,
          error: 'Coach ID is required',
          required: ['coachId']
        });
      }
      
      console.log('📥 API: Getting coach team chats:', { coachId });
      
      const teamChats = await RosterTeamChatService.getCoachTeamChats(coachId);
      
      return res.status(200).json({
        success: true,
        data: teamChats,
        count: teamChats.length,
        userType: 'coach'
      });
      
    } catch (error) {
      console.error('❌ Error in getCoachTeamChats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get coach team chats',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
  

static async getTeamChatMessages(req, res) {
  try {
    const { teamChatId } = req.params;
    const { userId, userEmail, limit = 50 } = req.body;
    
    if (!teamChatId) {
      return res.status(400).json({
        success: false,
        error: 'Team chat ID is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    const accessCheck = await RosterTeamChatService.hasAccessToTeamChat(userId, userEmail, teamChatId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        reason: accessCheck.reason
      });
    }
    
    console.log(`📨 API: Getting messages for team chat: ${teamChatId}`);
    
    const messages = await RosterTeamChatService.getTeamChatMessages(teamChatId, parseInt(limit));
    
    return res.status(200).json({
      success: true,
      data: messages,
      count: messages.length,
      teamChatId,
      userRole: accessCheck.role
    });
    
  } catch (error) {
    console.error('❌ Error in getTeamChatMessages:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get team chat messages',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
  
  static async sendTeamChatMessage(req, res) {
    try {
      const { teamChatId } = req.params;
      const { userId, userEmail, message, senderName, senderInfo } = req.body;
      
      if (!teamChatId || !userId || !message || !senderName) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['teamChatId', 'userId', 'message', 'senderName']
        });
      }
      
      const accessCheck = await RosterTeamChatService.hasAccessToTeamChat(userId, userEmail, teamChatId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          reason: accessCheck.reason
        });
      }
      
      // If the chat needs a document fix, create it
      if (accessCheck.needsDocumentFix) {
        try {
          await setDoc(doc(db, 'groupChats', teamChatId), {
            name: `Team Chat ${teamChatId}`,
            createdAt: serverTimestamp(),
            lastActivity: serverTimestamp(),
            memberCount: 1,
            members: [{
              parentId: userId,
              parentName: senderName,
              parentEmail: userEmail,
              role: accessCheck.role,
              joinedAt: new Date().toISOString()
            }]
          }, { merge: true });
          
          console.log(`✅ Created missing group chat document: ${teamChatId}`);
        } catch (docError) {
          console.warn(`⚠️ Could not create group chat document: ${docError.message}`);
        }
      }
      
      console.log(`📤 API: Sending message to team chat: ${teamChatId}`);
      
      const messageData = {
        text: message,
        uid: userId,
        senderId: userId,
        senderName: senderName,
        timestamp: serverTimestamp(),
        senderType: accessCheck.role
      };
      
      if (senderInfo) {
        messageData.senderInfo = {
          firstName: senderInfo.firstName || '',
          lastName: senderInfo.lastName || '',
          role: accessCheck.role,
          senderType: accessCheck.role
        };
      }
      
      const messagesRef = collection(db, 'groupChats', teamChatId, 'messages');
      const docRef = await addDoc(messagesRef, messageData);
      
      const chatRef = doc(db, 'groupChats', teamChatId);
      await updateDoc(chatRef, {
        lastActivity: serverTimestamp()
      });
      
      console.log(`✅ Message sent successfully to team chat: ${teamChatId}, messageId: ${docRef.id}`);
      
      return res.status(201).json({
        success: true,
        messageId: docRef.id,
        teamChatId,
        userRole: accessCheck.role,
        message: 'Message sent successfully'
      });
      
    } catch (error) {
      console.error('❌ Error in sendTeamChatMessage:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send message',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
  
  static async checkTeamChatAccess(req, res) {
    try {
      const { teamChatId } = req.params;
      const { userId, userEmail } = req.body;
      
      if (!teamChatId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Team chat ID and user ID are required'
        });
      }
      
      const accessCheck = await RosterTeamChatService.hasAccessToTeamChat(userId, userEmail, teamChatId);
      
      return res.status(200).json({
        success: true,
        hasAccess: accessCheck.hasAccess,
        role: accessCheck.role || null,
        reason: accessCheck.reason || null,
        teamChatId
      });
      
    } catch (error) {
      console.error('❌ Error in checkTeamChatAccess:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check team chat access',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = RosterTeamChatsController;