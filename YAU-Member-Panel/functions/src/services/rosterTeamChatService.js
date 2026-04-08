const { db } = require('../utils/firebase');
const { collection, getDocs, getDoc, doc, query, where, orderBy, limit } = require('firebase/firestore');

class RosterTeamChatService {
  static async getMemberTeamChats(memberId, memberEmail) {
    try {
      console.log('📥 Getting member team chats:', { memberId, memberEmail });
      
      // Step 1: Check rosters for member participation
      const rostersSnapshot = await getDocs(collection(db, 'rosters'));
      const memberRosters = [];
      
      rostersSnapshot.docs.forEach(rosterDoc => {
        const rosterData = rosterDoc.data();
        const participants = rosterData.participants || [];
        
        const isMember = participants.some(participant => 
          participant.parentId === memberId || 
          (participant.parentEmail && participant.parentEmail.toLowerCase() === memberEmail.toLowerCase())
        );
        
        if (isMember && rosterData.isActive) {
          memberRosters.push({
            id: rosterDoc.id,
            ...rosterData
          });
        }
      });
      
      console.log(`📋 Found ${memberRosters.length} rosters for member`);
      
      // Step 2: Get team chats for rosters
      const teamChats = [];
      for (const roster of memberRosters) {
        try {
          const chatResult = await this.findTeamChatForRoster(roster);
          if (chatResult) {
            teamChats.push({
              ...chatResult,
              rosterId: roster.id,
              userRole: 'member'
            });
          }
        } catch (error) {
          console.error(`❌ Error fetching group chat for roster ${roster.id}:`, error);
        }
      }
      
      // Step 3: Also check direct group chat membership (for existing chats)
      try {
        const directChats = await this.getDirectGroupChatMembership(memberId, memberEmail);
        // Add any chats not already found through rosters
        for (const directChat of directChats) {
          if (!teamChats.find(chat => chat.id === directChat.id)) {
            teamChats.push({
              ...directChat,
              userRole: 'member',
              foundVia: 'direct_membership'
            });
          }
        }
      } catch (directError) {
        console.warn('⚠️ Error checking direct group chat membership:', directError.message);
      }
      
      console.log(`✅ Found ${teamChats.length} team chats for member`);
      return teamChats;
      
    } catch (error) {
      console.error('❌ Error getting member team chats:', error);
      throw error;
    }
  }
  
  static async getCoachTeamChats(coachId) {
    try {
      console.log('📥 Getting coach team chats:', { coachId });
      
      const rostersSnapshot = await getDocs(
        query(collection(db, 'rosters'), where('coachId', '==', coachId), where('isActive', '==', true))
      );
      
      console.log(`📋 Found ${rostersSnapshot.docs.length} rosters for coach`);
      
      const teamChats = [];
      for (const rosterDoc of rostersSnapshot.docs) {
        try {
          const roster = { id: rosterDoc.id, ...rosterDoc.data() };
          
          const groupChatRef = doc(db, 'groupChats', roster.id);
          const groupChatSnap = await getDoc(groupChatRef);
          
          if (groupChatSnap.exists()) {
            const chatData = groupChatSnap.data();
            teamChats.push({
              id: groupChatSnap.id,
              name: chatData.name || roster.teamName || `${roster.ageGroup} ${roster.sport} - ${roster.location}`,
              sport: roster.sport,
              ageGroup: roster.ageGroup,
              location: roster.location,
              memberCount: chatData.memberCount || roster.playerCount || 0,
              coachName: roster.coachName,
              hasAssignedCoach: roster.hasAssignedCoach,
              lastActivity: chatData.lastActivity?.toDate() || roster.lastUpdated?.toDate() || new Date(),
              createdAt: chatData.createdAt?.toDate() || roster.createdAt?.toDate() || new Date(),
              rosterId: roster.id,
              userRole: 'coach',
              players: roster.players || []
            });
          } else {
            console.log(`⚠️ No group chat found for roster: ${roster.id}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching group chat for roster ${rosterDoc.id}:`, error);
        }
      }
      
      console.log(`✅ Found ${teamChats.length} team chats for coach`);
      return teamChats;
      
    } catch (error) {
      console.error('❌ Error getting coach team chats:', error);
      throw error;
    }
  }
  

static async getTeamChatMessages(teamChatId, limit = 50, all = false) {
  try {
    console.log(`📨 Getting messages for team chat: ${teamChatId}, all: ${all}, limit: ${limit}`);

    let messagesQuery = query(
      collection(db, 'groupChats', teamChatId, 'messages'),
      orderBy('timestamp', 'asc') // Changed to ascending for chronological order
    );

    if (!all) {
      messagesQuery = query(messagesQuery, limit(limit));
    }

    const messagesSnapshot = await getDocs(messagesQuery);
    const messages = messagesSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Handle timestamp conversion properly
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
        timestamp: timestamp.toISOString(), // Always return ISO string for consistency
        senderType: data.senderType || data.senderInfo?.role || 'member',
        senderInfo: data.senderInfo || {
          firstName: data.senderName?.split(' ')[0] || 'Unknown',
          lastName: data.senderName?.split(' ')[1] || '',
          role: data.senderType || 'member'
        }
      };
    });

    console.log(`✅ Retrieved ${messages.length} messages for team chat: ${teamChatId}`);
    return messages;

  } catch (error) {
    console.error(`❌ Error getting team chat messages for ${teamChatId}:`, error);
    throw error;
  }
}

  static async findTeamChatForRoster(roster) {
    try {
      const groupChatRef = doc(db, 'groupChats', roster.id);
      const groupChatSnap = await getDoc(groupChatRef);
      
      if (groupChatSnap.exists()) {
        const chatData = groupChatSnap.data();
        return {
          id: groupChatSnap.id,
          name: chatData.name || roster.teamName || `${roster.ageGroup} ${roster.sport} - ${roster.location}`,
          sport: roster.sport,
          ageGroup: roster.ageGroup,
          location: roster.location,
          memberCount: chatData.memberCount || roster.playerCount || 0,
          coachName: roster.coachName,
          hasAssignedCoach: roster.hasAssignedCoach,
          lastActivity: chatData.lastActivity?.toDate() || roster.lastUpdated?.toDate() || new Date(),
          createdAt: chatData.createdAt?.toDate() || roster.createdAt?.toDate() || new Date(),
          players: roster.players || []
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error finding team chat for roster ${roster.id}:`, error);
      return null;
    }
  }

  static async getDirectGroupChatMembership(memberId, memberEmail) {
    try {
      const groupChatsSnapshot = await getDocs(collection(db, 'groupChats'));
      const memberChats = [];
      
      for (const chatDoc of groupChatsSnapshot.docs) {
        const chatData = chatDoc.data();
        const members = chatData.members || [];
        
        const isMember = members.some(member => 
          member.parentId === memberId || 
          (member.parentEmail && member.parentEmail.toLowerCase() === memberEmail.toLowerCase())
        );
        
        if (isMember) {
          memberChats.push({
            id: chatDoc.id,
            name: chatData.name || 'Unknown Team',
            sport: chatData.sport,
            ageGroup: chatData.ageGroup,
            location: chatData.location,
            memberCount: chatData.memberCount || 0,
            lastActivity: chatData.lastActivity?.toDate() || new Date(),
            createdAt: chatData.createdAt?.toDate() || new Date()
          });
        }
      }
      
      return memberChats;
    } catch (error) {
      console.error('Error getting direct group chat membership:', error);
      return [];
    }
  }

  static async hasAccessToTeamChat(userId, userEmail, teamChatId) {
    try {
      // Step 1: Check roster-based access
      const rosterRef = doc(db, 'rosters', teamChatId);
      const rosterSnap = await getDoc(rosterRef);
      
      if (rosterSnap.exists()) {
        const rosterData = rosterSnap.data();
        
        if (rosterData.coachId === userId) {
          return { hasAccess: true, role: 'coach', source: 'roster_coach' };
        }
        
        const participants = rosterData.participants || [];
        const isMember = participants.some(participant => 
          participant.parentId === userId || 
          (participant.parentEmail && participant.parentEmail.toLowerCase() === userEmail.toLowerCase())
        );
        
        if (isMember) {
          return { hasAccess: true, role: 'member', source: 'roster_participant' };
        }
      }
      
      // Step 2: Check group chat document membership
      try {
        const groupChatRef = doc(db, 'groupChats', teamChatId);
        const groupChatSnap = await getDoc(groupChatRef);
        
        if (groupChatSnap.exists()) {
          const chatData = groupChatSnap.data();
          const members = chatData.members || [];
          
          const isMember = members.some(member => 
            member.parentId === userId || 
            (member.parentEmail && member.parentEmail.toLowerCase() === userEmail.toLowerCase()) ||
            (member.role === 'coach' && member.parentId === userId)
          );
          
          if (isMember) {
            const memberData = members.find(member => 
              member.parentId === userId || 
              (member.parentEmail && member.parentEmail.toLowerCase() === userEmail.toLowerCase())
            );
            
            return { 
              hasAccess: true, 
              role: memberData?.role || 'member', 
              source: 'group_chat_member' 
            };
          }
        } else {
          // Step 3: Check if chat has messages collection (might need document creation)
          try {
            const messagesSnapshot = await getDocs(
              query(
                collection(db, 'groupChats', teamChatId, 'messages'),
                limit(1)
              )
            );
            
            if (!messagesSnapshot.empty) {
              // Chat has messages but no document - check if user has messages
              const userMessagesSnapshot = await getDocs(
                query(
                  collection(db, 'groupChats', teamChatId, 'messages'),
                  where('uid', '==', userId),
                  limit(1)
                )
              );
              
              if (!userMessagesSnapshot.empty) {
                return { 
                  hasAccess: true, 
                  role: 'member', 
                  source: 'message_history',
                  needsDocumentFix: true 
                };
              }
              
              // Check by email if available
              if (userEmail) {
                const emailMessagesSnapshot = await getDocs(
                  query(
                    collection(db, 'groupChats', teamChatId, 'messages'),
                    where('senderInfo.email', '==', userEmail.toLowerCase()),
                    limit(1)
                  )
                );
                
                if (!emailMessagesSnapshot.empty) {
                  return { 
                    hasAccess: true, 
                    role: 'member', 
                    source: 'message_history_email',
                    needsDocumentFix: true 
                  };
                }
              }
            }
          } catch (messagesError) {
            console.warn('⚠️ Error checking messages collection:', messagesError.message);
          }
        }
      } catch (groupChatError) {
        console.warn('⚠️ Error checking group chat access:', groupChatError.message);
      }
      
      return { 
        hasAccess: false, 
        reason: 'User not found in roster or group chat members' 
      };
      
    } catch (error) {
      console.error('❌ Error checking team chat access:', error);
      return { hasAccess: false, reason: 'Error checking access' };
    }
  }
}

module.exports = RosterTeamChatService;