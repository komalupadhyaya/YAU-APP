import { API_CONFIG } from '../firebase/config';
import { onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

class RosterTeamChatService {
  /**
   * Get team chats for a member based on their roster participations
   * @param {string} memberId - Member's UID
   * @param {string} memberEmail - Member's email
   */
  static async getMemberTeamChats(memberId, memberEmail) {
    try {
      console.log('📥 Frontend: Getting member team chats:', { memberId, memberEmail });

      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosterTeamChats.getMemberChats}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId,
          memberEmail
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to get member team chats');
      }

      console.log(`✅ Frontend: Retrieved ${result.count} member team chats`);
      return result.data;

    } catch (error) {
      console.error('❌ Frontend: Error getting member team chats:', error);
      throw error;
    }
  }

  /**
   * Get team chats for a coach based on rosters they coach
   * @param {string} coachId - Coach's UID
   */
  static async getCoachTeamChats(coachId) {
    try {
      console.log('📥 Frontend: Getting coach team chats:', { coachId });

      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosterTeamChats.getCoachChats}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coachId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to get coach team chats');
      }

      console.log(`✅ Frontend: Retrieved ${result.count} coach team chats`);
      return result.data;

    } catch (error) {
      console.error('❌ Frontend: Error getting coach team chats:', error);
      throw error;
    }
  }

  /**
   * Get messages for a specific team chat
   * @param {string} teamChatId - Team chat/roster ID
   * @param {string} userId - User's UID
   * @param {string} userEmail - User's email
   * @param {number} limit - Number of messages to fetch
   */
 static async getTeamChatMessages(teamChatId, limit = 50, markAsRead = true,AuthUser) {
  try {
    console.log(`📨 Frontend: Getting messages for team chat: ${teamChatId}`);
    
    // Import auth to get current user
    const user = AuthUser
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosterTeamChats.getMessages.replace(':teamChatId', teamChatId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.uid,
        userEmail: user.email,
        limit
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP error! status: ${response.status}, response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('📨 Backend response:', result);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get team chat messages');
    }
    
    console.log(`✅ Frontend: Retrieved ${result.count} messages for team chat: ${teamChatId}`);
    return result.data;
    
  } catch (error) {
    console.error(`❌ Frontend: Error getting team chat messages:`, error);
    throw error;
  }
}

// services/rosterTeamChatService.js - Add this new method

static async getTeamChatMessagesWithUser(teamChatId, userId, userEmail, limit = 50) {
  try {
    console.log(`📨 Frontend: Getting messages for team chat: ${teamChatId}`);
    
    const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosterTeamChats.getMessages.replace(':teamChatId', teamChatId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        userEmail,
        limit
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP error! status: ${response.status}, response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('📨 Backend response:', result);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get team chat messages');
    }
    
    console.log(`✅ Frontend: Retrieved ${result.count} messages for team chat: ${teamChatId}`);
    return result.data || [];
    
  } catch (error) {
    console.error(`❌ Frontend: Error getting team chat messages:`, error);
    return []; // Return empty array instead of throwing
  }
}
  /**
   * Send a message to a team chat
   * @param {string} teamChatId - Team chat/roster ID
   * @param {string} message - Message text
   * @param {string} userId - User's UID
   * @param {string} userEmail - User's email
   * @param {string} senderName - Sender's display name
   * @param {Object} senderInfo - Additional sender information
   */
  static async sendTeamChatMessage(teamChatId, message, userId, userEmail, senderName, senderInfo = null) {
    try {
      console.log(`📤 Frontend: Sending message to team chat: ${teamChatId}`);

      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosterTeamChats.sendMessage.replace(':teamChatId', teamChatId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userEmail,
          message,
          senderName,
          senderInfo
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      console.log(`✅ Frontend: Message sent successfully to team chat: ${teamChatId}`);
      return result;

    } catch (error) {
      console.error(`❌ Frontend: Error sending team chat message:`, error);
      throw error;
    }
  }

  /**
   * Check user's access to a specific team chat
   * @param {string} teamChatId - Team chat/roster ID
   * @param {string} userId - User's UID
   * @param {string} userEmail - User's email
   */
  static async checkTeamChatAccess(teamChatId, userId, userEmail) {
    try {
      console.log(`🔐 Frontend: Checking access for team chat: ${teamChatId}`);

      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosterTeamChats.checkAccess.replace(':teamChatId', teamChatId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userEmail
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to check team chat access');
      }

      console.log(`✅ Frontend: Access check completed for team chat: ${teamChatId}`, {
        hasAccess: result.hasAccess,
        role: result.role
      });
      return result;

    } catch (error) {
      console.error(`❌ Frontend: Error checking team chat access:`, error);
      throw error;
    }
  }

  /**
   * Get user chats with messages
   * @param {string} memberId - Member's UID
   * @param {string} memberEmail - Member's email
   * @param {number} limit - Number of chats/messages to return
   */
  static async getUserChatsWithMessages(memberId, memberEmail, limit = 1) {
    try {
      console.log('📥 Frontend: Getting user chats with messages:', { memberId, memberEmail, limit });

      const response = await fetch(
        `${API_CONFIG.baseURL}${API_CONFIG.endpoints.groupChats.getUserMessages}?userEmail=${memberEmail}&userUid=${memberId}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Frontend: Retrieved user chats with messages`, result);
      return result;

    } catch (error) {
      console.error('❌ Frontend: Error getting user chats with messages:', error);
      throw error;
    }
  }


  /**
   * Listen to messages in real-time for a team chat using Firebase listeners
   * @param {string} teamChatId - Team chat/roster ID
   * @param {Function} callback - Callback function to handle message updates
   * @param {number} messageLimit - Number of messages to listen to (default: 50)
   */
  static listenToTeamChatMessages(teamChatId, callback, messageLimit = 50) {
    try {
      console.log(`👂 Frontend: Setting up real-time listener for team chat: ${teamChatId}`);

      const messagesQuery = query(
        collection(db, 'groupChats', teamChatId, 'messages'),
        orderBy('timestamp', 'asc'),
        limit(messageLimit)
      );

      return onSnapshot(messagesQuery, (snapshot) => {
        const messages = snapshot.docs.map(doc => {
          const data = doc.data();

          // Handle timestamp conversion
          let timestamp;
          if (data.timestamp && data.timestamp.toDate) {
            timestamp = data.timestamp.toDate();
          } else if (data.timestamp && data.timestamp.seconds) {
            timestamp = new Date(data.timestamp.seconds * 1000);
          } else if (data.timestamp) {
            timestamp = new Date(data.timestamp);
          } else {
            timestamp = new Date();
          }

          return {
            id: doc.id,
            text: data.text || '',
            uid: data.uid || data.senderId,
            senderId: data.senderId || data.uid,
            senderName: data.senderName || 'Unknown',
            timestamp: timestamp.toISOString(),
            senderType: data.senderType || 'member',
            senderInfo: data.senderInfo || {
              firstName: data.senderName?.split(' ')[0] || 'Unknown',
              lastName: data.senderName?.split(' ')[1] || '',
              role: data.senderType || 'member'
            }
          };
        });

        console.log(`📨 Frontend: Real-time messages update for ${teamChatId}:`, messages.length, 'messages');
        callback(messages);
      }, (error) => {
        console.error(`❌ Real-time listener error for ${teamChatId}:`, error);
      });

    } catch (error) {
      console.error(`❌ Frontend: Error setting up message listener for ${teamChatId}:`, error);
      return () => { }; // Return empty unsubscribe function
    }
  }

  /**
   * Determine user role and get appropriate team chats
   * @param {Object} user - User object with uid, email, role properties
   */
  static async getUserTeamChats(user) {
    try {
      console.log('🔍 Frontend: Determining user type and getting team chats:', {
        uid: user.uid,
        email: user.email,
        role: user.role
      });

      // Check if user is a coach first (coaches can also be members)
      if (user.role === 'coach' || user.isCoach) {
        try {
          const coachChats = await this.getCoachTeamChats(user.uid);
          if (coachChats.length > 0) {
            console.log(`✅ Frontend: User is a coach with ${coachChats.length} team chats`);
            return coachChats;
          }
        } catch (error) {
          console.warn('⚠️ Frontend: Error getting coach chats, trying member chats:', error.message);
        }
      }

      // Try as member (default case)
      const memberChats = await this.getMemberTeamChats(user.uid, user.email);
      console.log(`✅ Frontend: User is a member with ${memberChats.length} team chats`);
      return memberChats;

    } catch (error) {
      console.error('❌ Frontend: Error getting user team chats:', error);
      return [];
    }
  }
}

export default RosterTeamChatService;