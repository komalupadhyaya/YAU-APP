const { db } = require('../utils/firebase');
const {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  updateDoc
} = require('firebase/firestore');

class GroupChatService {
  /**
   * Create or ensure group chat exists based on roster data
   * @param {Object} memberData - Member registration data
   * @param {Object} student - Individual student data
   */
  static async createOrEnsureGroupChat(memberData, student) {
    try {
      // Use grade for roster/chat grouping (primary)
      const grade = student.grade || "";
      // Keep ageGroup for backward compatibility
      const ageGroup = student.ageGroup || this.calculateAgeGroup(student.dob);
      
      // Use student's sport/location if available, otherwise fallback to memberData
      const studentSport = student.sport || memberData.sport || "";
      const studentLocation = student.location || memberData.location || "";
      
      if (!grade) {
        throw new Error(`Student ${student.firstName} ${student.lastName} missing grade`);
      }
      if (!studentSport || !studentLocation) {
        throw new Error(`Student ${student.firstName} ${student.lastName} missing sport or location`);
      }
      
      const rosterId = this.generateRosterId(grade, studentSport, studentLocation);
      
      console.log('📱 Creating/ensuring group chat:', {
        grade,
        ageGroup, // Keep for logging
        sport: studentSport,
        location: studentLocation,
        parentEmail: memberData.email,
        studentName: `${student.firstName} ${student.lastName}`
      });

      // First, check if corresponding roster exists and get its data
      let rosterData = null;
      try {
        const rosterRef = doc(db, 'rosters', rosterId);
        const rosterSnap = await getDoc(rosterRef);
        if (rosterSnap.exists()) {
          rosterData = rosterSnap.data();
          console.log('📋 Found matching roster:', rosterId);
        } else {
          console.log('⚠️ No matching roster found for:', rosterId);
        }
      } catch (rosterError) {
        console.warn('⚠️ Error checking roster:', rosterError.message);
      }

      // Find existing group chat or determine the correct chat ID
      const existingChat = await this.findExistingGroupChat(grade, studentSport, studentLocation);
      const chatId = existingChat.id;
      
      console.log(`📱 Using chat ID: ${chatId} (${existingChat.exists ? 'existing' : 'new'})`);

      const chatRef = doc(db, 'groupChats', chatId);
      let chatSnap;
      
      if (existingChat.exists) {
        chatSnap = await getDoc(chatRef);
      } else {
        chatSnap = { exists: () => false };
      }

      const newMemberData = {
        parentId: memberData.uid,
        parentName: `${memberData.firstName} ${memberData.lastName}`,
        parentEmail: memberData.email,
        studentId: `${memberData.uid}-${student.firstName} ${student.lastName}`,
        studentName: `${student.firstName} ${student.lastName}`,
        studentFirstName: student.firstName,
        studentLastName: student.lastName,
        grade: grade,
        ageGroup: ageGroup, // Keep for backward compatibility
        sport: studentSport,
        location: studentLocation,
        joinedAt: new Date().toISOString()
      };

      if (!chatSnap.exists()) {
        // Create new group chat with roster integration
        const teamName = rosterData?.teamName || `${grade} ${studentSport} - ${studentLocation}`;
        
        const groupChatData = {
          id: chatId,
          rosterId: rosterId,
          name: teamName,
          sport: studentSport,
          grade: grade, // Primary grouping field
          ageGroup: ageGroup, // Keep for backward compatibility
          location: studentLocation,
          createdAt: serverTimestamp(),
          lastActivity: serverTimestamp(),
          memberCount: 1,
          members: [newMemberData],
          isActive: true,
          status: 'active',
          type: 'team',
          // Link to roster data if available
          hasRoster: !!rosterData,
          rosterStatus: rosterData?.status || 'unknown',
          // Track if this was created from existing messages
          hadExistingMessages: existingChat.messageCount > 0
        };

        await setDoc(chatRef, groupChatData);
        console.log('✅ Created new group chat:', chatId);
        
        // If this chat had existing messages without document, log it
        if (existingChat.messageCount > 0) {
          console.log(`📨 Created document for existing chat with ${existingChat.messageCount} messages`);
        }
        
        return {
          success: true,
          chatId,
          rosterId,
          groupName: groupChatData.name,
          isNewGroup: true,
          memberCount: 1,
          hasRoster: !!rosterData,
          usedExistingFormat: existingChat.exists,
          hadExistingMessages: existingChat.messageCount > 0
        };
        
      } else {
        // Update existing group chat with new member
        const existingData = chatSnap.data();
        const existingMembers = existingData.members || [];
        
        // Check if this specific parent-student combination already exists
        const memberExists = existingMembers.some(member => 
          (member.parentId === memberData.uid || member.parentEmail === memberData.email) && 
          (member.studentName === `${student.firstName} ${student.lastName}` ||
           member.studentId === `${memberData.uid}-${student.firstName} ${student.lastName}`)
        );

        if (!memberExists) {
          const updatedMembers = [...existingMembers, newMemberData];

          await updateDoc(chatRef, {
            members: updatedMembers,
            memberCount: updatedMembers.length,
            lastActivity: serverTimestamp(),
            // Update roster linkage if we found one
            ...(rosterData && {
              hasRoster: true,
              rosterStatus: rosterData.status
            })
          });

          console.log('✅ Added member to existing group chat:', {
            chatId,
            rosterId,
            newMemberCount: updatedMembers.length,
            parentName: newMemberData.parentName,
            studentName: newMemberData.studentName
          });
          
          return {
            success: true,
            chatId,
            rosterId,
            groupName: existingData.name,
            isNewGroup: false,
            memberCount: updatedMembers.length,
            hasRoster: !!rosterData
          };
        } else {
          console.log('ℹ️ Member already exists in group chat:', {
            chatId,
            rosterId,
            parentEmail: memberData.email,
            studentName: newMemberData.studentName
          });
          
          return {
            success: true,
            chatId,
            rosterId,
            groupName: existingData.name,
            isNewGroup: false,
            memberCount: existingMembers.length,
            alreadyMember: true,
            hasRoster: !!rosterData
          };
        }
      }

    } catch (error) {
      console.error('❌ Error creating/ensuring group chat:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate roster ID - now uses grade instead of ageGroup
   * @param {string} grade - Grade (e.g., "1st Grade", "Kindergarten")
   * @param {string} sport - Sport name (e.g., "Kickball") 
   * @param {string} location - Location name (e.g., "Greenbelt, MD")
   */
  static generateRosterId(grade, sport, location) {
    // Clean and format components
    // Normalize grade: "1st Grade" -> "1st-grade", "Kindergarten" -> "kindergarten"
    const cleanGrade = (grade?.trim() || '').toLowerCase().replace(/\s+/g, '-');
    const cleanSport = (sport?.trim() || '').toLowerCase();
    
    // Handle location formatting to match existing roster format
    let cleanLocation = (location?.trim() || '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/,\s*/g, '---'); // Use triple dashes for comma separation
    
    // Create format: "sport-grade-location" (e.g., "soccer-1st-grade-greenbelt-md")
    return `${cleanSport}-${cleanGrade}-${cleanLocation}`;
  }

  /**
   * Generate chat ID - now uses grade instead of ageGroup
   * Examples: "1st_Grade_Kickball_Greenbelt,_MD"
   * @param {string} grade - Grade (e.g., "1st Grade", "Kindergarten")
   * @param {string} sport - Sport name (e.g., "Kickball") 
   * @param {string} location - Location name (e.g., "Greenbelt, MD")
   */
  static generateChatId(grade, sport, location) {
    // Format grade: "1st Grade" -> "1st_Grade", "Kindergarten" -> "Kindergarten"
    const cleanGrade = (grade?.trim() || '').replace(/\s+/g, '_');
    const cleanSport = (sport?.trim() || '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('_'); // Use underscores for multi-word sports (e.g., "Flag_Football")
    
    // Keep location as-is but clean up extra spaces
    const cleanLocation = (location?.trim() || '')
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/,/g, ',_'); // Add underscore after commas to match existing format
    
    // Create format: "1st_Grade_Kickball_Greenbelt,_MD"
    return `${cleanGrade}_${cleanSport}_${cleanLocation}`;
  }

  /**
   * Try to find existing group chat with different possible formats
   * Also checks for message collections without parent documents
   * @param {string} grade - Grade (e.g., "1st Grade")
   * @param {string} sport - Sport name
   * @param {string} location - Location
   */
  static async findExistingGroupChat(grade, sport, location) {
    const possibleIds = [
      // Current format: "1st_Grade_Kickball_Greenbelt,_MD"
      this.generateChatId(grade, sport, location),
      // Roster format: "soccer-1st-grade-greenbelt-md"
      this.generateRosterId(grade, sport, location),
      // Other possible variations
      `${grade.replace(/\s+/g, '_')}_${sport.replace(/\s+/g, '_')}_${location.replace(/\s+/g, '_').replace(/,/g, ',_')}`,
      `${grade.replace(/\s+/g, ' ')}_${sport.replace(/\s+/g, ' ')}_${location.replace(/\s+/g, '_').replace(/,/g, ',_')}`, // spaces in grade/sport
      `${grade.toLowerCase().replace(/\s+/g, '-')}-${sport.toLowerCase().replace(/\s+/g, '-')}-${location.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
    ];
    
    console.log(`🔍 Trying possible IDs for ${grade} ${sport} - ${location}:`, possibleIds);
    
    for (const chatId of possibleIds) {
      try {
        const chatRef = doc(db, 'groupChats', chatId);
        const chatSnap = await getDoc(chatRef);
        if (chatSnap.exists()) {
          console.log(`🎯 Found existing group chat with ID: ${chatId}`);
          return {
            id: chatId,
            data: chatSnap.data(),
            exists: true,
            hasDocument: true
          };
        } else {
          // Check if this chat has messages but no parent document
          const messagesSnapshot = await getDocs(collection(db, 'groupChats', chatId, 'messages'));
          if (messagesSnapshot.docs.length > 0) {
            console.log(`📨 Found chat with messages but no document: ${chatId}`);
            return {
              id: chatId,
              data: null,
              exists: true,
              hasDocument: false,
              messageCount: messagesSnapshot.docs.length
            };
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error checking chat ID ${chatId}:`, error.message);
      }
    }
    
    // Return the preferred format if none found
    return {
      id: this.generateChatId(grade, sport, location),
      data: null,
      exists: false,
      hasDocument: false
    };
  }

  /**
   * Get user's group chats based on their team memberships
   * @param {string} userEmail - User's email
   * @param {string} userUid - User's UID
   */
  static async getUserGroupChats(userEmail, userUid) {
    try {
      console.log('🔍 Getting group chats for user:', { email: userEmail, uid: userUid });

      const allChatsSnapshot = await getDocs(collection(db, 'groupChats'));
      const userGroupChats = [];
      const potentialChats = []; // Track chats that might belong to user

      // Process each group chat document
      for (const doc of allChatsSnapshot.docs) {
        const chatData = doc.data();
        const members = chatData.members || [];
        const chatId = doc.id;

        // Enhanced matching for email and UID (case-insensitive email)
        const isMember = members.some(member => 
          (member.parentEmail && member.parentEmail.toLowerCase() === userEmail.toLowerCase()) ||
          member.parentId === userUid
        );

        if (isMember) {
          userGroupChats.push({
            id: chatId,
            name: chatData.name || `${chatData.ageGroup} ${chatData.sport} - ${chatData.location}`,
            memberCount: chatData.memberCount || members.length,
            sport: chatData.sport,
            ageGroup: chatData.ageGroup,
            location: chatData.location,
            lastActivity: chatData.lastActivity?.toDate() || new Date(),
            createdAt: chatData.createdAt?.toDate() || new Date()
          });
        } else {
          // Check if this chat has messages - could indicate user should have access
          try {
            const messagesSnapshot = await getDocs(collection(db, 'groupChats', chatId, 'messages'));
            if (messagesSnapshot.docs.length > 0) {
              // Check if user has sent messages to this chat (indicates they should have access)
              const userMessages = messagesSnapshot.docs.filter(msgDoc => {
                const msgData = msgDoc.data();
                return msgData.uid === userUid || 
                       (msgData.senderInfo?.email && msgData.senderInfo.email.toLowerCase() === userEmail.toLowerCase());
              });

              if (userMessages.length > 0) {
                console.log(`🔧 Found chat ${chatId} where user has ${userMessages.length} messages but no member access`);
                potentialChats.push({
                  id: chatId,
                  hasMessages: true,
                  userMessageCount: userMessages.length,
                  totalMessages: messagesSnapshot.docs.length,
                  data: chatData,
                  needsFix: true
                });
              } else {
                potentialChats.push({
                  id: chatId,
                  hasMessages: true,
                  userMessageCount: 0,
                  totalMessages: messagesSnapshot.docs.length,
                  data: chatData,
                  needsFix: false
                });
              }
            }
          } catch (msgError) {
            console.warn(`⚠️ Error checking messages for chat ${chatId}:`, msgError.message);
          }
        }
      }

      console.log(`📱 Found ${userGroupChats.length} accessible group chats for user:`, {
        email: userEmail,
        uid: userUid,
        chats: userGroupChats.map(chat => ({
          id: chat.id,
          name: chat.name,
          memberCount: chat.memberCount
        }))
      });

      if (userGroupChats.length === 0) {
        console.warn('⚠️ No accessible group chats found.');
        const chatsNeedingFix = potentialChats.filter(chat => chat.needsFix);
        
        if (chatsNeedingFix.length > 0) {
          console.log(`🔧 Found ${chatsNeedingFix.length} chats that need user access fixes:`);
          chatsNeedingFix.forEach(chat => {
            console.log(`  - ${chat.id}: ${chat.userMessageCount} user messages, ${chat.totalMessages} total messages`);
          });
        }
        
        console.log(`🔍 Total potential chats: ${potentialChats.length}`);
      }

      return userGroupChats;

    } catch (error) {
      console.error('❌ Error getting user group chats:', error);
      return [];
    }
  }

  /**
   * Get messages for a specific group chat
   * @param {string} chatId - Group chat ID
   * @param {number} msgLimit - Number of messages to fetch (default: 50)
   * @param {boolean} createDocumentIfMissing - Create group chat document if it doesn't exist but has messages
   */
  static async getChatMessages(chatId, msgLimit = 50, createDocumentIfMissing = false) {
    try {
      console.log(`📨 Getting messages for chat: ${chatId}`);
      
      // Check if group chat document exists
      const chatRef = doc(db, 'groupChats', chatId);
      const chatSnap = await getDoc(chatRef);
      
      const messagesQuery = query(
        collection(db, 'groupChats', chatId, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(msgLimit)
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      
      if (messagesSnapshot.docs.length === 0) {
        console.log(`📭 No messages found for chat: ${chatId}`);
        return [];
      }
      
      // If we have messages but no group chat document, optionally create it
      if (!chatSnap.exists() && createDocumentIfMissing && messagesSnapshot.docs.length > 0) {
        console.log(`🔧 Creating missing group chat document for ${chatId} (has ${messagesSnapshot.docs.length} messages)`);
        await this.createGroupChatDocumentFromMessages(chatId, messagesSnapshot.docs);
      }
      
      const messages = messagesSnapshot.docs.map(doc => {
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

      console.log(`✅ Retrieved ${messages.length} messages for chat: ${chatId}`);
      
      // Return in chronological order (oldest first)
      return messages.reverse();

    } catch (error) {
      console.error(`❌ Error getting chat messages for ${chatId}:`, error);
      return [];
    }
  }

  /**
   * Listen to messages in real-time for a group chat
   * @param {string} chatId - Group chat ID
   * @param {Function} callback - Callback function to handle message updates
   * @param {number} msgLimit - Number of messages to listen to (default: 50)
   */
  static listenToChatMessages(chatId, callback, msgLimit = 50) {
    try {
      console.log(`👂 Setting up real-time listener for chat: ${chatId}`);
      
      const messagesQuery = query(
        collection(db, 'groupChats', chatId, 'messages'),
        orderBy('timestamp', 'asc'),
        limit(msgLimit)
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

        console.log(`📨 Real-time update: ${messages.length} messages for ${chatId}`);
        callback(messages);
      }, (error) => {
        console.error(`❌ Real-time listener error for ${chatId}:`, error);
      });

    } catch (error) {
      console.error('❌ Error setting up message listener:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Send a message to a group chat
   * @param {string} chatId - Group chat ID
   * @param {string} message - Message text
   * @param {string} senderId - Sender's UID
   * @param {string} senderName - Sender's display name
   * @param {Object} senderInfo - Additional sender information
   */
  static async sendMessage(chatId, message, senderId, senderName, senderInfo = null) {
    try {
      console.log(`📤 Sending message to chat: ${chatId}`);
      console.log(`📝 Message data:`, {
        chatId,
        message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        senderId,
        senderName,
        senderInfo
      });
      
      const messageRef = collection(db, 'groupChats', chatId, 'messages');
      
      // Create message data to match your existing format
      const messageData = {
        text: message,
        uid: senderId,
        senderId: senderId,
        senderName: senderName,
        senderType: senderInfo?.role || 'member',
        timestamp: serverTimestamp()
      };

      // Add detailed sender info (matching your existing format)
      if (senderInfo) {
        messageData.senderInfo = {
          firstName: senderInfo.firstName || '',
          lastName: senderInfo.lastName || '',
          role: senderInfo.role || 'member',
          senderType: senderInfo.role || 'member'
        };
      }

      // Send the message
      await addDoc(messageRef, messageData);

      // Update last activity in group chat (if group chat document exists)
      try {
        const chatRef = doc(db, 'groupChats', chatId);
        const chatSnap = await getDoc(chatRef);
        if (chatSnap.exists()) {
          await updateDoc(chatRef, {
            lastActivity: serverTimestamp()
          });
        } else {
          console.log(`⚠️ Group chat document doesn't exist for ${chatId}, message sent to messages subcollection only`);
        }
      } catch (updateError) {
        console.warn('⚠️ Error updating lastActivity, but message was sent:', updateError.message);
      }

      console.log(`✅ Message sent successfully to: ${chatId}`);
      return { success: true };

    } catch (error) {
      console.error(`❌ Error sending message to ${chatId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create group chat from existing roster data
   * @param {string} rosterId - Roster ID to create group chat for
   */
  static async createGroupChatFromRoster(rosterId) {
    try {
      console.log('📋 Creating group chat from roster:', rosterId);
      
      // Get roster data
      const rosterRef = doc(db, 'rosters', rosterId);
      const rosterSnap = await getDoc(rosterRef);
      
      if (!rosterSnap.exists()) {
        throw new Error(`Roster not found: ${rosterId}`);
      }
      
      const rosterData = rosterSnap.data();
      const chatId = rosterId; // Use same ID
      
      // Check if group chat already exists
      const chatRef = doc(db, 'groupChats', chatId);
      const chatSnap = await getDoc(chatRef);
      
      if (chatSnap.exists()) {
        console.log('ℹ️ Group chat already exists for roster:', rosterId);
        return {
          success: true,
          chatId,
          rosterId,
          groupName: chatSnap.data().name,
          alreadyExists: true
        };
      }
      
      // Create group chat with roster data
      const groupChatData = {
        id: chatId,
        rosterId: rosterId,
        name: rosterData.teamName || `${rosterData.ageGroup} ${rosterData.sport} - ${rosterData.location}`,
        sport: rosterData.sport,
        ageGroup: rosterData.ageGroup,
        location: rosterData.location,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        memberCount: 0,
        members: [],
        isActive: rosterData.isActive || true,
        status: rosterData.status || 'active',
        type: 'team',
        hasRoster: true,
        rosterStatus: rosterData.status
      };
      
      await setDoc(chatRef, groupChatData);
      console.log('✅ Created group chat from roster:', chatId);
      
      return {
        success: true,
        chatId,
        rosterId,
        groupName: groupChatData.name,
        isNewGroup: true
      };
      
    } catch (error) {
      console.error('❌ Error creating group chat from roster:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync all rosters to create missing group chats
   */
  static async syncRostersToGroupChats() {
    try {
      console.log('🔄 Syncing rosters to group chats...');
      
      // Get all rosters
      const rostersSnapshot = await getDocs(collection(db, 'rosters'));
      const results = [];
      
      for (const rosterDoc of rostersSnapshot.docs) {
        const rosterId = rosterDoc.id;
        const result = await this.createGroupChatFromRoster(rosterId);
        results.push({
          rosterId,
          ...result
        });
      }
      
      console.log('✅ Roster sync completed:', {
        total: results.length,
        created: results.filter(r => r.success && r.isNewGroup).length,
        existing: results.filter(r => r.success && r.alreadyExists).length,
        failed: results.filter(r => !r.success).length
      });
      
      return results;
      
    } catch (error) {
      console.error('❌ Error syncing rosters to group chats:', error);
      return [];
    }
  }

  /**
   * Calculate age group from date of birth
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

  /**
   * Ensure proper message collection structure for all group chats
   * This checks if group chats have the proper nested message structure
   */
  static async ensureMessageCollectionStructure() {
    try {
      console.log('🔍 Ensuring proper message collection structure for all group chats...');
      
      const groupChatsSnapshot = await getDocs(collection(db, 'groupChats'));
      const results = [];
      
      for (const chatDoc of groupChatsSnapshot.docs) {
        const chatId = chatDoc.id;
        const chatData = chatDoc.data();
        
        try {
          // Check if messages subcollection exists and has proper structure
          const messagesRef = collection(db, 'groupChats', chatId, 'messages');
          const messagesSnapshot = await getDocs(messagesRef);
          
          const messageCount = messagesSnapshot.docs.length;
          let structureValid = true;
          let fixedMessages = 0;
          
          // Check message structure for each message
          for (const messageDoc of messagesSnapshot.docs) {
            const messageData = messageDoc.data();
            
            // Check if message has required fields
            const hasRequiredFields = messageData.text && 
              (messageData.uid || messageData.senderId) && 
              messageData.timestamp;
            
            if (!hasRequiredFields) {
              structureValid = false;
              console.log(`⚠️ Message ${messageDoc.id} in chat ${chatId} has invalid structure`);
            }
            
            // Fix missing senderName if we have uid but no senderName
            if (messageData.uid && !messageData.senderName && chatData.members) {
              const sender = chatData.members.find(member => 
                member.parentId === messageData.uid
              );
              
              if (sender) {
                await updateDoc(doc(db, 'groupChats', chatId, 'messages', messageDoc.id), {
                  senderName: sender.parentName,
                  senderInfo: {
                    firstName: sender.parentName.split(' ')[0] || '',
                    lastName: sender.parentName.split(' ')[1] || '',
                    role: sender.role || 'member'
                  }
                });
                
                fixedMessages++;
                console.log(`✅ Fixed sender info for message ${messageDoc.id} in chat ${chatId}`);
              }
            }
          }
          
          results.push({
            chatId,
            chatName: chatData.name || 'Unknown',
            messageCount,
            structureValid,
            fixedMessages,
            success: true
          });
          
          console.log(`📨 Chat ${chatId}: ${messageCount} messages, structure ${structureValid ? 'valid' : 'needs attention'}, fixed ${fixedMessages} messages`);
          
        } catch (messageError) {
          console.error(`❌ Error processing messages for chat ${chatId}:`, messageError);
          results.push({
            chatId,
            chatName: chatData.name || 'Unknown',
            success: false,
            error: messageError.message
          });
        }
      }
      
      const summary = {
        totalChats: results.length,
        chatsWithMessages: results.filter(r => r.success && r.messageCount > 0).length,
        validStructure: results.filter(r => r.success && r.structureValid).length,
        totalFixedMessages: results.reduce((sum, r) => sum + (r.fixedMessages || 0), 0),
        errors: results.filter(r => !r.success).length
      };
      
      console.log('📊 Message structure check summary:', summary);
      
      return {
        success: true,
        results,
        summary
      };
      
    } catch (error) {
      console.error('❌ Error ensuring message collection structure:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a group chat document from existing messages
   * @param {string} chatId - Group chat ID
   * @param {Array} messageDocs - Array of message documents
   */
  static async createGroupChatDocumentFromMessages(chatId, messageDocs) {
    try {
      console.log(`🔧 Creating group chat document from ${messageDocs.length} messages for: ${chatId}`);
      
      // Parse chatId to get team info (simple implementation)
      const parts = chatId.split('_');
      let ageGroup = 'Unknown', sport = 'Unknown', location = 'Unknown';
      
      if (parts.length >= 3) {
        ageGroup = parts[0];
        sport = parts[1];
        location = parts.slice(2).join(' ');
      }
      
      // Get unique senders from messages
      const uniqueSenders = new Map();
      messageDocs.forEach(doc => {
        const data = doc.data();
        if (data.uid && data.senderName) {
          uniqueSenders.set(data.uid, {
            parentId: data.uid,
            parentName: data.senderName,
            parentEmail: data.senderInfo?.email || '',
            role: data.senderType || 'member',
            joinedAt: new Date().toISOString()
          });
        }
      });
      
      const members = Array.from(uniqueSenders.values());
      
      const groupChatData = {
        id: chatId,
        name: `${ageGroup} ${sport} - ${location}`,
        sport: sport,
        ageGroup: ageGroup,
        location: location,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        memberCount: members.length,
        members: members,
        isActive: true,
        status: 'active',
        type: 'team',
        hasRoster: false,
        createdFromMessages: true, // Flag to indicate this was created from existing messages
        originalMessageCount: messageDocs.length
      };
      
      await setDoc(doc(db, 'groupChats', chatId), groupChatData);
      console.log(`✅ Created group chat document for ${chatId} with ${members.length} members`);
      
      return {
        success: true,
        memberCount: members.length,
        messageCount: messageDocs.length
      };
      
    } catch (error) {
      console.error(`❌ Error creating group chat document from messages:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get latest messages from all user's group chats for dashboard
   * @param {string} userEmail - User's email
   * @param {string} userUid - User's UID
   * @param {number} msgLimit - Number of latest messages per chat (default: 1)
   */
  static async getUserGroupChatsWithLatestMessages(userEmail, userUid, msgLimit = 1) {
    try {
      console.log('📱 Getting user group chats with latest messages:', { email: userEmail, uid: userUid });

      const allChatsSnapshot = await getDocs(collection(db, 'groupChats'));
      const userGroupChatsWithMessages = [];

      // Process each group chat document
      for (const chatDoc of allChatsSnapshot.docs) {
        const chatData = chatDoc.data();
        const members = chatData.members || [];
        const chatId = chatDoc.id;

        // Check if user is a member of this chat
        const isMember = members.some(member =>
          (member.parentEmail && member.parentEmail.toLowerCase() === userEmail.toLowerCase()) ||
          member.parentId === userUid
        );

        if (isMember) {
          try {
            // Get latest messages for this chat
            const messagesQuery = query(
              collection(db, 'groupChats', chatId, 'messages'),
              orderBy('timestamp', 'desc'),
              ...(msgLimit > 0 ? [limit(msgLimit)] : [])
            );

            const messagesSnapshot = await getDocs(messagesQuery);
            const messages = messagesSnapshot.docs.map(doc => {
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

            // Add chat info with latest message(s)
            userGroupChatsWithMessages.push({
              // Group Chat Info
              id: chatId,
              name: chatData.name || `${chatData.ageGroup} ${chatData.sport} - ${chatData.location}`,
              sport: chatData.sport,
              ageGroup: chatData.ageGroup,
              location: chatData.location,
              memberCount: chatData.memberCount || members.length,
              lastActivity: chatData.lastActivity?.toDate() || new Date(),
              createdAt: chatData.createdAt?.toDate() || new Date(),
              isActive: chatData.isActive !== false,
              status: chatData.status || 'active',
              type: chatData.type || 'team',
              hasRoster: chatData.hasRoster || false,
              rosterId: chatData.rosterId,

              // Latest Message(s)
              latestMessages: messages,
              latestMessage: messages.length > 0 ? messages[0] : null,
              totalMessages: messagesSnapshot.size || 0,
              hasMessages: messages.length > 0,

              // User-specific info
              userIsMember: true
            });

          } catch (messageError) {
            console.warn(`⚠️ Error getting messages for chat ${chatId}:`, messageError.message);

            // Still include the chat info without messages
            userGroupChatsWithMessages.push({
              // Group Chat Info
              id: chatId,
              name: chatData.name || `${chatData.ageGroup} ${chatData.sport} - ${chatData.location}`,
              sport: chatData.sport,
              ageGroup: chatData.ageGroup,
              location: chatData.location,
              memberCount: chatData.memberCount || members.length,
              lastActivity: chatData.lastActivity?.toDate() || new Date(),
              createdAt: chatData.createdAt?.toDate() || new Date(),
              isActive: chatData.isActive !== false,
              status: chatData.status || 'active',
              type: chatData.type || 'team',
              hasRoster: chatData.hasRoster || false,
              rosterId: chatData.rosterId,

              // No messages available
              latestMessages: [],
              latestMessage: null,
              totalMessages: 0,
              hasMessages: false,
              messageError: messageError.message,

              // User-specific info
              userIsMember: true
            });
          }
        }
      }

      // Sort by latest activity (most recent first)
      userGroupChatsWithMessages.sort((a, b) => {
        const aTime = a.latestMessage?.timestamp || a.lastActivity || new Date(0);
        const bTime = b.latestMessage?.timestamp || b.lastActivity || new Date(0);
        return new Date(bTime) - new Date(aTime);
      });

      console.log(`📱 Found ${userGroupChatsWithMessages.length} group chats with messages for user:`, {
        email: userEmail,
        uid: userUid,
        chats: userGroupChatsWithMessages.map(chat => ({
          id: chat.id,
          name: chat.name,
          hasMessages: chat.hasMessages,
          latestMessageTime: chat.latestMessage?.timestamp
        }))
      });

      return userGroupChatsWithMessages;

    } catch (error) {
      console.error('❌ Error getting user group chats with latest messages:', error);
      return [];
    }
  }

  /**
   * Validate that a user can access a specific group chat
   * @param {string} chatId - Group chat ID
   * @param {string} userEmail - User's email
   * @param {string} userUid - User's UID
   */
  static async validateUserChatAccess(chatId, userEmail, userUid) {
    try {
      const chatRef = doc(db, 'groupChats', chatId);
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        // Check if chat has messages (indicates it should exist)
        const messagesSnapshot = await getDocs(collection(db, 'groupChats', chatId, 'messages'));
        if (messagesSnapshot.docs.length > 0) {
          // Check if user has sent messages to this chat
          const userMessages = messagesSnapshot.docs.filter(msgDoc => {
            const msgData = msgDoc.data();
            return msgData.uid === userUid || 
                   (msgData.senderInfo?.email && msgData.senderInfo.email.toLowerCase() === userEmail.toLowerCase());
          });
          
          if (userMessages.length > 0) {
            return {
              success: true,
              hasAccess: true,
              chatName: `Team Chat ${chatId}`,
              memberCount: 0,
              reason: 'User has messages in this chat',
              needsDocumentCreation: true,
              messageCount: messagesSnapshot.docs.length,
              userMessageCount: userMessages.length
            };
          }
        }
        
        return {
          success: false,
          hasAccess: false,
          reason: 'Chat does not exist or has no messages'
        };
      }
      
      const chatData = chatSnap.data();
      const members = chatData.members || [];
      
      const hasAccess = members.some(member => 
        (member.parentEmail && member.parentEmail.toLowerCase() === userEmail.toLowerCase()) ||
        member.parentId === userUid
      );
      
      return {
        success: true,
        hasAccess,
        chatName: chatData.name,
        memberCount: members.length,
        reason: hasAccess ? 'User is a member' : 'User is not a member'
      };
      
    } catch (error) {
      console.error(`❌ Error validating chat access for ${chatId}:`, error);
      return {
        success: false,
        hasAccess: false,
        reason: error.message
      };
    }
  }
}

module.exports = GroupChatService;