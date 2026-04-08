import { RostersService } from './apiService';
import GroupChatService from './groupChatService';

class RosterFilteringService {
  static async getUserRosterIds(userEmail, userUid) {
    try {
      console.log('🔍 Looking up rosters for user:', { email: userEmail, uid: userUid });
      
      // Get all rosters from the API
      const rostersResponse = await RostersService.getAll();
      const allRosters = rostersResponse.data || rostersResponse || [];
      
      console.log('📋 Total rosters found:', allRosters.length);
      
      // Find rosters where the user is a participant
      const userRosterIds = [];
      const userTeams = [];
      
      for (const roster of allRosters) {
        if (!roster.participants || !Array.isArray(roster.participants)) {
          continue;
        }
        
        // Check if current user is in this roster's participants
        const userParticipant = roster.participants.find(participant => {
          return participant.parentEmail === userEmail || participant.parentId === userUid;
        });
        
        if (userParticipant) {
          userRosterIds.push(roster.id);
          
          // Generate chatId for this team based on roster data
          const chatId = GroupChatService.generateChatId(
            roster.ageGroup,
            roster.sport,
            roster.location
          );
          
          userTeams.push({
            rosterId: roster.id,
            teamName: roster.teamName || `${roster.ageGroup} ${roster.sport} - ${roster.location}`,
            ageGroup: roster.ageGroup,
            sport: roster.sport,
            location: roster.location,
            student: userParticipant.name || `${userParticipant.firstName} ${userParticipant.lastName}`,
            chatId: chatId // Add chatId for easy reference
          });
          
          console.log('✅ Found user in roster:', {
            rosterId: roster.id,
            teamName: roster.teamName,
            chatId: chatId,
            studentName: userParticipant.name
          });
        }
      }
      
      console.log('🎯 User roster matches:', {
        rosterIds: userRosterIds,
        teamCount: userTeams.length
      });
      
      return { rosterIds: userRosterIds, teams: userTeams };
    } catch (error) {
      console.error('❌ Error getting user roster IDs:', error);
      return { rosterIds: [], teams: [] };
    }
  }

  /**
   * Get filtered team messages from groupChats collection
   * This replaces the old TeamMessagesService approach
   */
  static async getFilteredTeamMessages(userEmail, userUid) {
    try {
      // Get user's group chats directly instead of filtering team messages
      const userGroupChats = await GroupChatService.getUserGroupChats(userEmail, userUid);
      
      console.log(`📧 User has access to ${userGroupChats.length} group chats`);
      
      // Convert group chats to the expected message format for backward compatibility
      const formattedMessages = [];
      
      for (const chat of userGroupChats) {
        // Get recent messages from each chat
        const recentMessages = await GroupChatService.getChatMessages(chat.id, 5); // Get last 5 messages
        
        recentMessages.forEach(msg => {
          formattedMessages.push({
            id: `${chat.id}-${msg.id}`,
            sender: msg.sender || 'Team Member',
            team: chat.name,
            subject: `Message from ${chat.name}`,
            message: msg.text || msg.message || 'No content',
            timestamp: msg.timestamp,
            priority: 'normal',
            read: false, // This will be determined by user's lastReadTimestamps
            rosterId: chat.id, // Use chatId as rosterId for compatibility
            uid: msg.uid,
            chatId: chat.id
          });
        });
      }

      return formattedMessages;

    } catch (error) {
      console.error('❌ Error filtering team messages:', error);
      return [];
    }
  }

  /**
   * Get user team information including group chat references
   */
  static async getUserTeamInfo(userEmail, userUid) {
    try {
      // Get user's group chats directly
      const userGroupChats = await GroupChatService.getUserGroupChats(userEmail, userUid);
      
      // Convert group chats to team info format
      const teams = userGroupChats.map(chat => {
        // Find the user's student name from the chat members
        const userMember = chat.members?.find(member => 
          member.parentEmail === userEmail || member.parentId === userUid
        );
        
        return {
          name: chat.name,
          rosterId: chat.id, // Use chatId as rosterId for compatibility
          chatId: chat.id,
          student: userMember?.studentName || 'Student',
          ageGroup: chat.ageGroup,
          sport: chat.sport,
          location: chat.location
        };
      });
      
      return {
        teams: teams,
        studentCount: teams.length // Number of teams/chats user is part of
      };
    } catch (error) {
      console.error('❌ Error getting user team info:', error);
      return { teams: [], studentCount: 0 };
    }
  }

  /**
   * DEPRECATED: Legacy method for backward compatibility
   * Use GroupChatService.getUserGroupChats instead
   */
  static async getUserGroupChats(userEmail, userUid) {
    console.warn('⚠️ Deprecated: Use GroupChatService.getUserGroupChats instead');
    return await GroupChatService.getUserGroupChats(userEmail, userUid);
  }
}

export default RosterFilteringService;