const { db } = require('../utils/firebase');
const { collection, getDocs, query, orderBy, serverTimestamp, addDoc, getDoc, doc, setDoc } = require('firebase/firestore');

class TeamMessagesController {
  static async getAllTeamMessages(req, res) {
    try {
      console.log('📥 Getting all team messages...');
      
      // Get all group chats first (these are the team containers)
      const groupChatsSnapshot = await getDocs(
        query(collection(db, 'groupChats'), orderBy('lastActivity', 'desc'))
      );
      
      if (groupChatsSnapshot.empty) {
        console.log('📭 No group chats found');
        return res.status(200).json({
          success: true,
          data: [],
          count: 0,
          message: 'No team messages found'
        });
      }

      const teamChats = groupChatsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastActivity: doc.data().lastActivity?.toDate().toISOString(),
        createdAt: doc.data().createdAt?.toDate().toISOString()
      }));
      
      console.log(`✅ Retrieved ${teamChats.length} team group chats`);
      return res.status(200).json({ 
        success: true, 
        data: teamChats, 
        count: teamChats.length 
      });
    } catch (error) {
      console.error('❌ Error getting all team messages:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get team messages',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  static async getTeamMessagesByRoster(req, res) {
    try {
      const { rosterId } = req.params;
      if (!rosterId) {
        return res.status(400).json({ success: false, error: 'Roster ID is required' });
      }
      console.log(`📥 Getting team messages for roster: ${rosterId}`);
      
      // First get the group chat document (rosterId should match chatId)
      const groupChatRef = doc(db, 'groupChats', rosterId);
      const chatSnap = await getDoc(groupChatRef);
      
      if (!chatSnap.exists()) {
        console.log(`📭 No group chat found for roster: ${rosterId}`);
        return res.status(200).json({
          success: true,
          data: [],
          count: 0,
          rosterId,
          message: 'No group chat found for this roster'
        });
      }

      // Get messages from the messages subcollection
      const messagesSnapshot = await getDocs(
        query(
          collection(db, 'groupChats', rosterId, 'messages'), 
          orderBy('timestamp', 'desc')
        )
      );

      const messages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toISOString()
      }));

      const chatData = {
        id: chatSnap.id,
        ...chatSnap.data(),
        lastActivity: chatSnap.data().lastActivity?.toDate().toISOString(),
        createdAt: chatSnap.data().createdAt?.toDate().toISOString(),
        messages: messages
      };
      
      console.log(`✅ Retrieved group chat with ${messages.length} messages for roster: ${rosterId}`);
      return res.status(200).json({ 
        success: true, 
        data: chatData, 
        messageCount: messages.length,
        rosterId 
      });
    } catch (error) {
      console.error('❌ Error getting team messages by roster:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get team messages for roster',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
static async createTeamMessage(req, res) {
    try {
      const messageData = req.body;
      const requiredFields = ['rosterId', 'text', 'senderName', 'uid'];
      const missingFields = requiredFields.filter(field => !messageData[field]);
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          missingFields,
          required: requiredFields
        });
      }
      const rosterId = messageData.rosterId; // e.g., 'soccer-13u-andrews-afb---clinton'
      console.log('📤 Creating new team message:', {
        rosterId,
        sender: messageData.senderName,
        textLength: messageData.text?.length || 0
      });

      // Ensure the groupChats document exists
      const groupChatRef = doc(db, 'groupChats', rosterId);
      const docSnap = await getDoc(groupChatRef);
      if (!docSnap.exists()) {
        // Initialize the document with minimal data if needed
        await setDoc(groupChatRef, {
          rosterId,
          createdAt: serverTimestamp(),
          status: 'active' // Add any other initial data as needed
        });
      }

      // Prepare message document
      const messageDoc = {
        rosterId: messageData.rosterId,
        rosterName: messageData.rosterName || null,
        text: messageData.text,
        senderName: messageData.senderName,
        uid: messageData.uid,
        priority: messageData.priority || 'normal',
        read: messageData.read || false,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        messageType: 'team',
        status: 'active'
      };

      // Add the message to the messages subcollection
      const messagesRef = collection(groupChatRef, 'messages');
      const docRef = await addDoc(messagesRef, messageDoc);
      const createdDocSnapshot = await getDoc(docRef);
      const createdData = createdDocSnapshot.data();
      const responseMessage = {
        id: docRef.id,
        ...createdData,
        timestamp: createdData.timestamp?.toDate().toISOString(),
        createdAt: createdData.createdAt?.toDate().toISOString()
      };

      console.log(`✅ Team message created successfully with ID: ${docRef.id}`);
      return res.status(201).json({
        success: true,
        data: responseMessage,
        message: 'Team message created successfully'
      });
    } catch (error) {
      console.error('❌ Error creating team message:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create team message',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  static async markTeamMessageAsRead(req, res) {
    try {
      const { messageId } = req.params;
      const { uid } = req.body;
      if (!messageId) {
        return res.status(400).json({ success: false, error: 'Message ID is required' });
      }
      console.log(`📖 Marking team message as read: ${messageId}`);
      const messageRef = collection(db, 'groupChats').doc(messageId);
      const messageDoc = await messageRef.get();
      if (!messageDoc.exists) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }
      const updateData = { read: true, readAt: serverTimestamp() };
      if (uid) updateData.readBy = uid;
      await messageRef.update(updateData);
      console.log(`✅ Message marked as read: ${messageId}`);
      return res.status(200).json({ success: true, message: 'Message marked as read', messageId });
    } catch (error) {
      console.error('❌ Error marking message as read:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to mark message as read',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  static async deleteTeamMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { uid } = req.body;
      if (!messageId) {
        return res.status(400).json({ success: false, error: 'Message ID is required' });
      }
      console.log(`🗑️ Deleting team message: ${messageId}`);
      const messageRef = collection(db, 'groupChats').doc(messageId);
      const messageDoc = await messageRef.get();
      if (!messageDoc.exists) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }
      const messageData = messageDoc.data();
      if (uid && messageData.uid !== uid) {
        return res.status(403).json({ success: false, error: 'You can only delete your own messages' });
      }
      await messageRef.update({
        status: 'deleted',
        deletedAt: serverTimestamp(),
        deletedBy: uid || null
      });
      console.log(`✅ Message soft deleted: ${messageId}`);
      return res.status(200).json({ success: true, message: 'Message deleted successfully', messageId });
    } catch (error) {
      console.error('❌ Error deleting team message:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete team message',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  static async getTeamMessageStats(req, res) {
    try {
      console.log('📊 Getting team message statistics...');
      const snapshot = await getDocs(collection(db, 'groupChats'));
      const stats = {
        totalMessages: 0,
        messagesByRoster: {},
        messagesByPriority: { high: 0, normal: 0, low: 0 },
        readVsUnread: { read: 0, unread: 0 },
        recentActivity: { last24Hours: 0, last7Days: 0, last30Days: 0 }
      };
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'deleted') return;
        stats.totalMessages++;
        const chatId = doc.id;
        stats.messagesByRoster[chatId] = (stats.messagesByRoster[chatId] || 0) + 1;
        const priority = data.priority || 'normal';
        if (stats.messagesByPriority[priority] !== undefined) stats.messagesByPriority[priority]++;
        // Note: Group chats don't have individual read status, skip this for now
        stats.readVsUnread.read = 0;
        stats.readVsUnread.unread = 0;
        const timestamp = data.lastActivity?.toDate() || data.createdAt?.toDate();
        if (timestamp && timestamp > oneDayAgo) stats.recentActivity.last24Hours++;
        if (timestamp && timestamp > sevenDaysAgo) stats.recentActivity.last7Days++;
        if (timestamp && timestamp > thirtyDaysAgo) stats.recentActivity.last30Days++;
      });
      console.log(`✅ Retrieved team message statistics: ${stats.totalMessages} total messages`);
      return res.status(200).json({ success: true, data: stats });
    } catch (error) {
      console.error('❌ Error getting team message stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get team message statistics',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = TeamMessagesController;