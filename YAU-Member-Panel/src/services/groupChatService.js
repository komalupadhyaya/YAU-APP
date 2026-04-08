import { 
  collection, 
  onSnapshot,
  orderBy, 
  limit,
  query
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { GroupChatsService } from './apiService';

class GroupChatService {
  /**
   * Create or ensure group chat exists based on roster data
   * Now calls the backend API instead of direct Firebase operations
   * @param {Object} memberData - Member registration data
   * @param {Object} student - Individual student data
   */
  static async createOrEnsureGroupChat(memberData, student) {
    try {
      console.log('📱 Frontend: Creating/ensuring group chat via API');
      return await GroupChatsService.createOrEnsureGroupChat(memberData, student);
    } catch (error) {
      console.error('❌ Frontend: Error creating/ensuring group chat:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's group chats based on their team memberships
   * Now calls the backend API instead of direct Firebase operations
   * @param {string} userEmail - User's email
   * @param {string} userUid - User's UID
   */
  static async getUserGroupChats(userEmail, userUid) {
    try {
      console.log('🔍 Frontend: Getting user group chats via API');
      const response = await GroupChatsService.getUserGroupChats(userEmail, userUid);
      return response.success ? response.data : [];
    } catch (error) {
      console.error('❌ Frontend: Error getting user group chats:', error);
      return [];
    }
  }

  /**
   * Get messages for a specific group chat
   * Now calls the backend API instead of direct Firebase operations
   * @param {string} chatId - Group chat ID
   * @param {number} limit - Number of messages to fetch (default: 50)
   * @param {boolean} createDocumentIfMissing - Create group chat document if it doesn't exist but has messages
   */
  static async getChatMessages(chatId, limit = 50, createDocumentIfMissing = false) {
    try {
      console.log(`📨 Frontend: Getting messages for chat: ${chatId} via API`);
      const response = await GroupChatsService.getChatMessages(chatId, limit, createDocumentIfMissing);
      return response.success ? response.data : [];
    } catch (error) {
      console.error(`❌ Frontend: Error getting chat messages for ${chatId}:`, error);
      return [];
    }
  }

  /**
   * Listen to messages in real-time for a group chat
   * This still uses direct Firebase listener for real-time functionality
   * @param {string} chatId - Group chat ID
   * @param {Function} callback - Callback function to handle message updates
   * @param {number} limit - Number of messages to listen to (default: 50)
   */
  static listenToChatMessages(chatId, callback, limit = 50) {
    try {
      console.log(`👂 Frontend: Setting up real-time listener for chat: ${chatId}`);
      
      const messagesQuery = query(
        collection(db, 'groupChats', chatId, 'messages'),
        orderBy('timestamp', 'asc'),
        limit(limit)
      );

      return onSnapshot(messagesQuery, (snapshot) => {
        const messages = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Handle different timestamp formats
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
            timestamp: timestamp,
            senderType: data.senderType || 'member',
            senderInfo: data.senderInfo || {
              firstName: data.senderName?.split(' ')[0] || 'Unknown',
              lastName: data.senderName?.split(' ')[1] || '',
              role: data.senderType || 'member'
            }
          };
        });

        console.log(`📨 Frontend: Real-time update: ${messages.length} messages for ${chatId}`);
        callback(messages);
      }, (error) => {
        console.error(`❌ Frontend: Real-time listener error for ${chatId}:`, error);
      });

    } catch (error) {
      console.error('❌ Frontend: Error setting up message listener:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Send a message to a group chat
   * Now calls the backend API instead of direct Firebase operations
   * @param {string} chatId - Group chat ID
   * @param {string} message - Message text
   * @param {string} senderId - Sender's UID
   * @param {string} senderName - Sender's display name
   * @param {Object} senderInfo - Additional sender information
   */
  static async sendMessage(chatId, message, senderId, senderName, senderInfo = null) {
    try {
      console.log(`📤 Frontend: Sending message to chat: ${chatId} via API`);
      return await GroupChatsService.sendMessage(chatId, message, senderId, senderName, senderInfo);
    } catch (error) {
      console.error(`❌ Frontend: Error sending message to ${chatId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create group chat from existing roster data
   * Now calls the backend API instead of direct Firebase operations
   * @param {string} rosterId - Roster ID to create group chat for
   */
  static async createGroupChatFromRoster(rosterId) {
    try {
      console.log('📋 Frontend: Creating group chat from roster via API:', rosterId);
      return await GroupChatsService.createGroupChatFromRoster(rosterId);
    } catch (error) {
      console.error('❌ Frontend: Error creating group chat from roster:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync all rosters to create missing group chats
   * Now calls the backend API instead of direct Firebase operations
   */
  static async syncRostersToGroupChats() {
    try {
      console.log('🔄 Frontend: Syncing rosters to group chats via API');
      return await GroupChatsService.syncRostersToGroupChats();
    } catch (error) {
      console.error('❌ Frontend: Error syncing rosters to group chats:', error);
      return [];
    }
  }

  /**
   * Validate that a user can access a specific group chat
   * Now calls the backend API instead of direct Firebase operations
   * @param {string} chatId - Group chat ID
   * @param {string} userEmail - User's email
   * @param {string} userUid - User's UID
   */
  static async validateUserChatAccess(chatId, userEmail, userUid) {
    try {
      console.log(`🔐 Frontend: Validating user access to chat: ${chatId} via API`);
      return await GroupChatsService.validateUserChatAccess(chatId, userEmail, userUid);
    } catch (error) {
      console.error(`❌ Frontend: Error validating chat access for ${chatId}:`, error);
      return {
        success: false,
        hasAccess: false,
        reason: error.message
      };
    }
  }

  /**
   * Ensure proper message collection structure for all group chats
   * Now calls the backend API instead of direct Firebase operations
   */
  static async ensureMessageCollectionStructure() {
    try {
      console.log('🔧 Frontend: Ensuring proper message collection structure via API');
      return await GroupChatsService.ensureMessageCollectionStructure();
    } catch (error) {
      console.error('❌ Frontend: Error ensuring message collection structure:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate age group from date of birth
   * This is a pure utility function that doesn't need to call the backend
   * @param {string} dob - Date of birth in ISO format
   */
  static calculateAgeGroup(dob) {
    if (!dob) return '6U';

    try {
      const birthDate = new Date(dob);
      if (isNaN(birthDate.getTime())) return '6U';

      const today = new Date();
      const currentYear = today.getFullYear();

      // Create the cutoff date for this year (July 31)
      const cutoffDate = new Date(currentYear, 6, 31); // Month is 0-indexed (6 = July)

      // 1. Calculate the player's "season age" (age on Dec 31 of this year)
      const seasonAge = currentYear - birthDate.getFullYear();

      // 2. Check if the season age is within the valid range (3-14)
      if (seasonAge < 3 || seasonAge > 14) {
        return '6U';
      }

      // 3. Create the player's birthday for THIS year
      const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

      // 4. Apply the Roster Logic
      let ageGroup;
      if (birthdayThisYear > cutoffDate) {
        // Player's birthday is AFTER the cutoff.
        // They are eligible to play one group DOWN (e.g., 12U base -> 11U eligible).
        ageGroup = (seasonAge - 1) + "U";
      } else {
        // Player's birthday is ON or BEFORE the cutoff.
        // They must play in their base group.
        ageGroup = seasonAge + "U";
      }

      // 5. Handle the edge case for the youngest group.
      const groupNumber = parseInt(ageGroup);
      if (groupNumber < 3) {
        return "3U";
      }

      return ageGroup;

    } catch (error) {
      console.error('❌ Error calculating age group:', error);
      return '6U';
    }
  }

  // Legacy methods for backward compatibility - these could still be used by existing components
  // that directly access Firebase but want to use the same ID generation logic
  
  /**
   * Generate roster ID to match existing roster format
   * @param {string} ageGroup - Age group (e.g., "14U")
   * @param {string} sport - Sport name (e.g., "Kickball") 
   * @param {string} location - Location name (e.g., "Greenbelt, MD")
   */
  static generateRosterId(ageGroup, sport, location) {
    // Clean and format components to match existing roster format exactly
    const cleanAgeGroup = (ageGroup?.trim() || '').toLowerCase();
    const cleanSport = (sport?.trim() || '').toLowerCase();
    
    // Handle location formatting to match existing roster format
    let cleanLocation = (location?.trim() || '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/,\s*/g, '---'); // Use triple dashes for comma separation like in your roster data
    
    // Create format: "sport-agegroup-location" (to match existing roster data)
    return `${cleanSport}-${cleanAgeGroup}-${cleanLocation}`;
  }

  /**
   * Generate chat ID to match existing group chat format (using underscores)
   * Examples: "14U_Kickball_Greenbelt,_MD"
   * @param {string} ageGroup - Age group (e.g., "14U")
   * @param {string} sport - Sport name (e.g., "Kickball") 
   * @param {string} location - Location name (e.g., "Greenbelt, MD")
   */
  static generateChatId(ageGroup, sport, location) {
    // Format to match existing group chats: "6U_Flag_Football_Bowie,_MD"
    const cleanAgeGroup = (ageGroup?.trim() || '').toUpperCase(); // Keep uppercase for age group
    const cleanSport = (sport?.trim() || '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('_'); // Use underscores for multi-word sports (e.g., "Flag_Football")
    
    // Keep location as-is but clean up extra spaces
    const cleanLocation = (location?.trim() || '')
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/,/g, ',_'); // Add underscore after commas to match existing format
    
    // Create format: "6U_Flag_Football_Bowie,_MD" (to match existing group chat format)
    return `${cleanAgeGroup}_${cleanSport}_${cleanLocation}`;
  }
}

export default GroupChatService;