import { db } from '../firebase/config.js';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc,
  updateDoc,
  serverTimestamp, 
  query
} from 'firebase/firestore';

/**
 * Utility to fix existing group chats by adding proper member lists
 * from roster data so users can access them
 */

/**
 * Parse existing group chat ID to extract team info
 * Examples: "14U_Kickball_Greenbelt,_MD", "baseball-10u-bowie,-md", "6U_Flag_Football_Bowie,_MD"
 */
export const parseGroupChatId = (chatId) => {
  try {
    console.log(`🔍 Parsing chat ID: ${chatId}`);
    
    // Handle different formats
    let parts, ageGroup, sport, location;
    
    // Format 1: "sport-agegroup-location" (e.g., "baseball-10u-bowie,-md")
    if (chatId.includes('-') && !chatId.includes('_')) {
      parts = chatId.split('-');
      if (parts.length >= 3) {
        sport = parts[0]; // "baseball"
        ageGroup = parts[1]; // "10u"
        const locationParts = parts.slice(2); // ["bowie,", "md"]
        
        // Reconstruct location
        location = locationParts.join('-').replace(',-', ', ').replace(/,/g, ', ');
        
        // Capitalize properly
        ageGroup = ageGroup.toUpperCase(); // "10U"
        sport = sport.charAt(0).toUpperCase() + sport.slice(1); // "Baseball"
        location = location.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '); // "Bowie, MD"
        
        return {
          ageGroup,
          sport,
          location,
          success: true
        };
      }
    }
    
    // Format 2: "6U_Flag_Football_Bowie,_MD" (underscore format)
    if (chatId.includes('_')) {
      parts = chatId.split('_');
      if (parts.length >= 3) {
        ageGroup = parts[0]; // "6U"
        sport = parts[1]; // "Flag" or "Football"
        const locationParts = parts.slice(2); // ["Bowie,", "MD"] or ["Flag", "Football", "Bowie,", "MD"]
        
        // Handle multi-word sports like "Flag_Football"
        let sportParts = [sport];
        let locationStart = 2;
        
        // Check if we have more sport words before location
        for (let i = 2; i < parts.length; i++) {
          const part = parts[i];
          // If part looks like location (contains comma or is last and looks like state)
          if (part.includes(',') || (i === parts.length - 1 && part.length === 2 && part.toUpperCase() === part)) {
            locationStart = i;
            break;
          } else {
            sportParts.push(part);
            locationStart = i + 1;
          }
        }
        
        sport = sportParts.join(' '); // "Flag Football"
        const actualLocationParts = parts.slice(locationStart); // ["Bowie,", "MD"]
        
        // Reconstruct location by joining and cleaning up
        if (actualLocationParts.some(part => part.includes(','))) {
          // Format: "Bowie,_MD" -> "Bowie, MD"
          location = actualLocationParts.join(' ').replace(',_', ', ');
        } else {
          // Format: "Bowie_MD" -> "Bowie MD"
          location = actualLocationParts.join(' ');
        }
        
        return {
          ageGroup,
          sport,
          location,
          success: true
        };
      }
    }
    
    // Format 3: Try to parse other mixed formats
    // Look for age group pattern (number + U)
    const ageGroupMatch = chatId.match(/(\d+[uU])/i);
    if (ageGroupMatch) {
      ageGroup = ageGroupMatch[1].toUpperCase();
      
      // Try to extract sport and location
      const remaining = chatId.replace(ageGroupMatch[0], '').replace(/^[-_\s]+|[-_\s]+$/g, '');
      const remainingParts = remaining.split(/[-_\s]+/);
      
      if (remainingParts.length >= 2) {
        // Assume first part(s) are sport, last part(s) are location
        // Look for location indicators (state abbreviations, common location words)
        const locationIndicators = ['md', 'va', 'dc', 'afb', 'clinton', 'bowie', 'greenbelt', 'harbor'];
        let locationStartIndex = -1;
        
        for (let i = remainingParts.length - 1; i >= 0; i--) {
          if (locationIndicators.some(indicator => 
            remainingParts[i].toLowerCase().includes(indicator)
          )) {
            locationStartIndex = i;
            break;
          }
        }
        
        if (locationStartIndex > 0) {
          sport = remainingParts.slice(0, locationStartIndex).join(' ');
          location = remainingParts.slice(locationStartIndex).join(' ').replace(/,/g, ', ');
        } else {
          // Default split: last 2 parts are location, rest is sport
          if (remainingParts.length >= 3) {
            sport = remainingParts.slice(0, -2).join(' ');
            location = remainingParts.slice(-2).join(' ').replace(/,/g, ', ');
          } else {
            sport = remainingParts[0];
            location = remainingParts.slice(1).join(' ').replace(/,/g, ', ');
          }
        }
        
        // Capitalize properly
        sport = sport.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        
        location = location.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        
        return {
          ageGroup,
          sport,
          location,
          success: true
        };
      }
    }
    
    return {
      success: false,
      error: `Cannot parse chat ID: ${chatId}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Find matching roster for a group chat based on team characteristics
 */
export const findMatchingRoster = async (ageGroup, sport, location) => {
  try {
    console.log(`🔍 Looking for roster matching:`, { ageGroup, sport, location });
    
    // Get all rosters
    const rostersSnapshot = await getDocs(collection(db, 'rosters'));
    const rosters = rostersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Try to find exact match first
    let matchingRoster = rosters.find(roster => 
      roster.ageGroup?.toLowerCase() === ageGroup.toLowerCase() &&
      roster.sport?.toLowerCase() === sport.toLowerCase() &&
      roster.location?.toLowerCase() === location.toLowerCase()
    );
    
    // If no exact match, try partial matches
    if (!matchingRoster) {
      matchingRoster = rosters.find(roster => 
        roster.ageGroup?.toLowerCase() === ageGroup.toLowerCase() &&
        roster.sport?.toLowerCase() === sport.toLowerCase() &&
        roster.location?.toLowerCase().includes(location.toLowerCase().split(',')[0])
      );
    }
    
    if (matchingRoster) {
      console.log(`✅ Found matching roster: ${matchingRoster.id}`);
      return {
        success: true,
        roster: matchingRoster
      };
    } else {
      console.log(`⚠️ No matching roster found for: ${ageGroup} ${sport} - ${location}`);
      return {
        success: false,
        error: 'No matching roster found'
      };
    }
    
  } catch (error) {
    console.error('❌ Error finding matching roster:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create or update group chat document with proper member list from roster
 */
export const fixGroupChatAccess = async (chatId) => {
  try {
    console.log(`🔧 Fixing group chat access for: ${chatId}`);
    
    // Parse the chat ID to get team info
    const parseResult = parseGroupChatId(chatId);
    if (!parseResult.success) {
      throw new Error(parseResult.error);
    }
    
    const { ageGroup, sport, location } = parseResult;
    
    // Find matching roster
    const rosterResult = await findMatchingRoster(ageGroup, sport, location);
    if (!rosterResult.success) {
      console.warn(`⚠️ No roster found for ${chatId}, creating basic group chat document`);
    }
    
    // Check if group chat document exists
    const chatRef = doc(db, 'groupChats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (chatSnap.exists()) {
      console.log(`ℹ️ Group chat document already exists for ${chatId}`);
      const existingData = chatSnap.data();
      
      // Update with roster info if we have it and it's missing
      if (rosterResult.success && (!existingData.members || existingData.members.length === 0)) {
        const roster = rosterResult.roster;
        const members = (roster.players || roster.participants || []).map(player => ({
          parentId: player.parentId,
          parentName: player.parentName,
          parentEmail: player.parentEmail,
          studentId: player.id,
          studentName: player.name,
          studentFirstName: player.firstName,
          studentLastName: player.lastName,
          ageGroup: player.ageGroup,
          sport: player.sport,
          location: player.location,
          joinedAt: new Date().toISOString()
        }));
        
        await updateDoc(chatRef, {
          members: members,
          memberCount: members.length,
          rosterId: roster.id,
          hasRoster: true,
          rosterStatus: roster.status,
          lastActivity: serverTimestamp()
        });
        
        console.log(`✅ Updated existing group chat ${chatId} with ${members.length} members from roster`);
      }
      
      return {
        success: true,
        chatId,
        action: 'updated',
        memberCount: existingData.members?.length || 0
      };
    }
    
    // Create new group chat document
    const members = rosterResult.success ? 
      (rosterResult.roster.players || rosterResult.roster.participants || []).map(player => ({
        parentId: player.parentId,
        parentName: player.parentName,
        parentEmail: player.parentEmail,
        studentId: player.id,
        studentName: player.name,
        studentFirstName: player.firstName,
        studentLastName: player.lastName,
        ageGroup: player.ageGroup,
        sport: player.sport,
        location: player.location,
        joinedAt: new Date().toISOString()
      })) : [];
    
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
      hasRoster: rosterResult.success,
      ...(rosterResult.success && {
        rosterId: rosterResult.roster.id,
        rosterStatus: rosterResult.roster.status
      })
    };
    
    await setDoc(chatRef, groupChatData);
    
    console.log(`✅ Created group chat document for ${chatId} with ${members.length} members`);
    
    return {
      success: true,
      chatId,
      action: 'created',
      memberCount: members.length
    };
    
  } catch (error) {
    console.error(`❌ Error fixing group chat access for ${chatId}:`, error);
    return {
      success: false,
      chatId,
      error: error.message
    };
  }
};

/**
 * Fix all existing group chats by scanning the groupChats collection
 */
export const fixAllGroupChats = async () => {
  try {
    console.log('🚀 Starting to fix all existing group chats...');
    
    // Get all group chats (including those with only messages subcollection)
    const groupChatsSnapshot = await getDocs(collection(db, 'groupChats'));
    const results = [];
    
    console.log(`📊 Found ${groupChatsSnapshot.docs.length} group chats to process`);
    
    for (const chatDoc of groupChatsSnapshot.docs) {
      const chatId = chatDoc.id;
      const result = await fixGroupChatAccess(chatId);
      results.push(result);
      
      // Add small delay to avoid overwhelming Firestore
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      created: results.filter(r => r.success && r.action === 'created').length,
      updated: results.filter(r => r.success && r.action === 'updated').length
    };
    
    console.log('📊 Fix all group chats summary:', summary);
    
    return {
      success: true,
      results,
      summary
    };
    
  } catch (error) {
    console.error('❌ Error fixing all group chats:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get all group chats that exist (including ones with only messages)
 */
export const getAllExistingGroupChats = async () => {
  try {
    console.log('📋 Getting all existing group chats...');
    
    const groupChatsSnapshot = await getDocs(collection(db, 'groupChats'));
    const groupChats = [];
    
    for (const chatDoc of groupChatsSnapshot.docs) {
      const chatId = chatDoc.id;
      const data = chatDoc.data();
      
      // Check if this chat has messages
      const messagesSnapshot = await getDocs(collection(db, 'groupChats', chatId, 'messages'));
      const messageCount = messagesSnapshot.docs.length;
      
      const parseResult = parseGroupChatId(chatId);
      
      groupChats.push({
        id: chatId,
        name: data.name || `${parseResult.ageGroup || 'Unknown'} ${parseResult.sport || 'Unknown'}`,
        hasDocument: !!data.name,
        memberCount: data.memberCount || 0,
        messageCount,
        lastActivity: data.lastActivity,
        parsed: parseResult.success ? {
          ageGroup: parseResult.ageGroup,
          sport: parseResult.sport,
          location: parseResult.location
        } : null
      });
    }
    
    console.log(`📊 Found ${groupChats.length} existing group chats`);
    
    return {
      success: true,
      groupChats,
      summary: {
        total: groupChats.length,
        withDocuments: groupChats.filter(gc => gc.hasDocument).length,
        withoutDocuments: groupChats.filter(gc => !gc.hasDocument).length,
        withMessages: groupChats.filter(gc => gc.messageCount > 0).length
      }
    };
    
  } catch (error) {
    console.error('❌ Error getting existing group chats:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Fix group chat access for a specific user based on their member data
 * @param {string} userEmail - User's email
 * @param {string} userUid - User's UID
 */
export const fixUserGroupChatAccess = async (userEmail, userUid) => {
  try {
    console.log(`🔧 Fixing group chat access for user: ${userEmail}`);
    
    // Step 1: Get user's member data to find their teams
    const memberRef = doc(db, 'members', userUid);
    const memberSnap = await getDoc(memberRef);
    
    if (!memberSnap.exists()) {
      console.log(`⚠️ Member document not found for: ${userEmail}`);
      return {
        success: false,
        error: 'Member document not found'
      };
    }
    
    const memberData = memberSnap.data();
    console.log(`📋 Found member data:`, {
      email: memberData.email,
      location: memberData.location,
      sport: memberData.sport,
      students: memberData.students?.length || 0
    });
    
    // Step 2: For each student, try to find/fix their group chat
    const results = [];
    const students = memberData.students || [];
    
    for (const student of students) {
      try {
        const ageGroup = student.ageGroup;
        const sport = memberData.sport;
        const location = memberData.location;
        
        console.log(`👨‍🎓 Processing student: ${student.firstName} ${student.lastName}`);
        console.log(`🏀 Team info: ${ageGroup} ${sport} - ${location}`);
        
        // Generate possible chat IDs for this student's team
        const possibleChatIds = [
          `${ageGroup}_${sport.replace(/\s+/g, '_')}_${location.replace(/\s+/g, '_').replace(/,/g, ',_')}`,
          `${ageGroup}_${sport.replace(/\s+/g, ' ')}_${location.replace(/\s+/g, '_').replace(/,/g, ',_')}`,
          `${ageGroup}_${sport}_${location}`.replace(/\s+/g, '_').replace(/,/g, ',_'),
        ];
        
        console.log(`🔍 Checking possible chat IDs:`, possibleChatIds);
        
        let foundChatId = null;
        let needsFix = false;
        
        // Check if any of these chats exist
        for (const chatId of possibleChatIds) {
          try {
            const chatRef = doc(db, 'groupChats', chatId);
            const chatSnap = await getDoc(chatRef);
            
            if (chatSnap.exists()) {
              console.log(`✅ Found existing chat: ${chatId}`);
              foundChatId = chatId;
              
              // Check if user is already a member
              const chatData = chatSnap.data();
              const members = chatData.members || [];
              const isMember = members.some(member => 
                (member.parentEmail && member.parentEmail.toLowerCase() === userEmail.toLowerCase()) ||
                member.parentId === userUid
              );
              
              if (!isMember) {
                console.log(`🔧 User not in member list, needs fix`);
                needsFix = true;
              } else {
                console.log(`✅ User already in member list`);
              }
              
              break;
            } else {
              // Check if chat exists with messages but no document
              const messagesSnapshot = await getDocs(collection(db, 'groupChats', chatId, 'messages'));
              if (messagesSnapshot.docs.length > 0) {
                console.log(`📨 Found chat with messages but no document: ${chatId}`);
                foundChatId = chatId;
                needsFix = true;
                break;
              }
            }
          } catch (checkError) {
            console.log(`⚠️ Error checking ${chatId}:`, checkError.message);
          }
        }
        
        if (foundChatId && needsFix) {
          console.log(`🔧 Fixing chat: ${foundChatId}`);
          const fixResult = await fixGroupChatAccess(foundChatId);
          
          // Add user to the fixed chat if not already there
          if (fixResult.success) {
            await addUserToGroupChat(foundChatId, {
              uid: userUid,
              email: userEmail,
              firstName: memberData.firstName,
              lastName: memberData.lastName
            }, student);
          }
          
          results.push({
            student: `${student.firstName} ${student.lastName}`,
            chatId: foundChatId,
            action: 'fixed',
            success: fixResult.success,
            error: fixResult.error
          });
        } else if (foundChatId) {
          results.push({
            student: `${student.firstName} ${student.lastName}`,
            chatId: foundChatId,
            action: 'already_accessible',
            success: true
          });
        } else {
          console.log(`⚠️ No group chat found for ${student.firstName}`);
          results.push({
            student: `${student.firstName} ${student.lastName}`,
            action: 'not_found',
            success: false,
            error: 'No group chat found for this team'
          });
        }
      } catch (studentError) {
        console.error(`❌ Error processing student ${student.firstName}:`, studentError);
        results.push({
          student: `${student.firstName} ${student.lastName}`,
          action: 'error',
          success: false,
          error: studentError.message
        });
      }
    }
    
    const summary = {
      total: results.length,
      fixed: results.filter(r => r.action === 'fixed' && r.success).length,
      alreadyAccessible: results.filter(r => r.action === 'already_accessible').length,
      notFound: results.filter(r => r.action === 'not_found').length,
      errors: results.filter(r => !r.success).length
    };
    
    console.log(`✅ User fix completed:`, summary);
    
    return {
      success: true,
      userEmail,
      userUid,
      results,
      summary
    };
    
  } catch (error) {
    console.error(`❌ Error fixing user group chat access:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Add a user to a specific group chat
 */
export const addUserToGroupChat = async (chatId, userData, studentData) => {
  try {
    const chatRef = doc(db, 'groupChats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (!chatSnap.exists()) {
      throw new Error(`Group chat ${chatId} does not exist`);
    }
    
    const chatData = chatSnap.data();
    const existingMembers = chatData.members || [];
    
    // Check if user already exists
    const userExists = existingMembers.some(member => 
      member.parentId === userData.uid || 
      (member.parentEmail && member.parentEmail.toLowerCase() === userData.email.toLowerCase())
    );
    
    if (userExists) {
      console.log(`👤 User already in chat: ${chatId}`);
      return { success: true, action: 'already_member' };
    }
    
    // Add user to members
    const newMember = {
      parentId: userData.uid,
      parentName: `${userData.firstName} ${userData.lastName}`,
      parentEmail: userData.email,
      studentId: `${userData.uid}-${studentData.firstName} ${studentData.lastName}`,
      studentName: `${studentData.firstName} ${studentData.lastName}`,
      studentFirstName: studentData.firstName,
      studentLastName: studentData.lastName,
      ageGroup: studentData.ageGroup,
      joinedAt: new Date().toISOString()
    };
    
    const updatedMembers = [...existingMembers, newMember];
    
    await updateDoc(chatRef, {
      members: updatedMembers,
      memberCount: updatedMembers.length,
      lastActivity: serverTimestamp()
    });
    
    console.log(`✅ Added user to chat: ${chatId}`);
    return { success: true, action: 'added' };
    
  } catch (error) {
    console.error(`❌ Error adding user to chat:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Fix group chat access for all members based on their registrations
 */
export const fixAllMemberGroupChatAccess = async () => {
  try {
    console.log('🚀 Starting to fix all member group chat access...');
    
    // Step 1: Get all members
    const membersSnapshot = await getDocs(collection(db, 'members'));
    const results = [];
    let processed = 0;
    
    console.log(`📊 Found ${membersSnapshot.docs.length} members to process`);
    
    for (const memberDoc of membersSnapshot.docs) {
      try {
        const memberData = memberDoc.data();
        const memberUid = memberDoc.id;
        
        console.log(`🔧 Processing member: ${memberData.firstName} ${memberData.lastName} (${memberData.email})`);
        
        if (!memberData.students || memberData.students.length === 0) {
          console.log(`⚠️ Member ${memberData.email} has no students, skipping`);
          results.push({
            memberEmail: memberData.email,
            memberUid,
            success: true,
            action: 'skipped',
            reason: 'no_students'
          });
          continue;
        }
        
        // For each student, find their team's group chat
        for (const student of memberData.students) {
          try {
            const ageGroup = student.ageGroup;
            const sport = memberData.sport;
            const location = memberData.location;
            
            console.log(`👨‍🎓 Processing student: ${student.firstName} ${student.lastName} (${ageGroup} ${sport} - ${location})`);
            
            // Generate possible chat IDs based on different formats
            const possibleChatIds = [
              // Format 1: sport-agegroup-location (roster format)
              `${sport.toLowerCase().replace(/\s+/g, '-')}-${ageGroup.toLowerCase()}-${location.toLowerCase().replace(/\s+/g, '-').replace(/,\s*/g, '---')}`,
              // Format 2: ageGroup_Sport_Location (group chat format)  
              `${ageGroup}_${sport.replace(/\s+/g, '_')}_${location.replace(/\s+/g, '_').replace(/,/g, ',_')}`,
              // Format 3: Other variations
              `${sport.toLowerCase().replace(/\s+/g, ' ')}-${ageGroup.toLowerCase()}-${location.toLowerCase().replace(/\s+/g, '-').replace(/,\s*/g, '-')}`,
              `${ageGroup.toLowerCase()}_${sport.toLowerCase().replace(/\s+/g, '_')}_${location.toLowerCase().replace(/\s+/g, '_').replace(/,/g, ',_')}`
            ];
            
            console.log(`🔍 Looking for possible chat IDs:`, possibleChatIds);
            
            let foundChatId = null;
            let foundChatData = null;
            
            // Check if any of these chats exist
            for (const chatId of possibleChatIds) {
              try {
                const chatRef = doc(db, 'groupChats', chatId);
                const chatSnap = await getDoc(chatRef);
                
                if (chatSnap.exists()) {
                  console.log(`✅ Found existing chat: ${chatId}`);
                  foundChatId = chatId;
                  foundChatData = chatSnap.data();
                  break;
                } else {
                  // Check if chat exists with messages but no document
                  const messagesSnapshot = await getDocs(collection(db, 'groupChats', chatId, 'messages'));
                  if (messagesSnapshot.docs.length > 0) {
                    console.log(`📨 Found chat with messages but no document: ${chatId}`);
                    foundChatId = chatId;
                    foundChatData = null; // No main document
                    break;
                  }
                }
              } catch (checkError) {
                console.log(`⚠️ Error checking ${chatId}:`, checkError.message);
              }
            }
            
            if (foundChatId) {
              // Fix/create the chat document if needed
              if (!foundChatData) {
                console.log(`🔧 Creating missing group chat document for: ${foundChatId}`);
                await fixGroupChatAccess(foundChatId);
              }
              
              // Add user to the chat if not already there
              const addResult = await addUserToGroupChat(foundChatId, {
                uid: memberUid,
                email: memberData.email,
                firstName: memberData.firstName,
                lastName: memberData.lastName
              }, student);
              
              results.push({
                memberEmail: memberData.email,
                memberUid,
                studentName: `${student.firstName} ${student.lastName}`,
                chatId: foundChatId,
                success: addResult.success,
                action: addResult.action,
                error: addResult.error
              });
              
              console.log(`✅ Processed student ${student.firstName} ${student.lastName} for chat ${foundChatId}: ${addResult.action}`);
            } else {
              console.log(`⚠️ No group chat found for ${student.firstName} ${student.lastName} (${ageGroup} ${sport} - ${location})`);
              results.push({
                memberEmail: memberData.email,
                memberUid,
                studentName: `${student.firstName} ${student.lastName}`,
                success: false,
                action: 'not_found',
                error: 'No matching group chat found'
              });
            }
          } catch (studentError) {
            console.error(`❌ Error processing student ${student.firstName}:`, studentError);
            results.push({
              memberEmail: memberData.email,
              memberUid,
              studentName: `${student.firstName} ${student.lastName}`,
              success: false,
              action: 'error',
              error: studentError.message
            });
          }
        }
        
        processed++;
        console.log(`📊 Processed member ${processed}/${membersSnapshot.docs.length}`);
        
        // Add small delay to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (memberError) {
        console.error(`❌ Error processing member ${memberDoc.id}:`, memberError);
        results.push({
          memberEmail: 'unknown',
          memberUid: memberDoc.id,
          success: false,
          action: 'error',
          error: memberError.message
        });
      }
    }
    
    const summary = {
      totalMembers: membersSnapshot.docs.length,
      totalResults: results.length,
      added: results.filter(r => r.success && r.action === 'added').length,
      alreadyMember: results.filter(r => r.success && r.action === 'already_member').length,
      skipped: results.filter(r => r.success && r.action === 'skipped').length,
      notFound: results.filter(r => r.action === 'not_found').length,
      errors: results.filter(r => !r.success && r.action === 'error').length
    };
    
    console.log('📊 Fix all members summary:', summary);
    
    return {
      success: true,
      results,
      summary
    };
    
  } catch (error) {
    console.error('❌ Error fixing all member group chat access:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Fix coach group chat access based on assigned teams
 */
export const fixCoachGroupChatAccess = async () => {
  try {
    console.log('🚀 Starting to fix coach group chat access...');
    
    // Get all coaches
    const coachesSnapshot = await getDocs(
      query(collection(db, 'coaches'))
    );
    const results = [];
    
    console.log(`📊 Found ${coachesSnapshot.docs.length} coaches to process`);
    
    for (const coachDoc of coachesSnapshot.docs) {
      try {
        const coachData = coachDoc.data();
        const coachUid = coachDoc.id;
        
        console.log(`🔧 Processing coach: ${coachData.firstName} ${coachData.lastName} (${coachData.email})`);
        
        if (!coachData.assignedTeams || coachData.assignedTeams.length === 0) {
          console.log(`⚠️ Coach ${coachData.email} has no assigned teams, skipping`);
          results.push({
            coachEmail: coachData.email,
            coachUid,
            success: true,
            action: 'skipped',
            reason: 'no_assigned_teams'
          });
          continue;
        }
        
        // For each assigned team, find their group chat
        for (const team of coachData.assignedTeams) {
          try {
            const ageGroup = team.ageGroup;
            const sport = team.sport;
            const location = team.location;
            const teamId = team.id;
            
            console.log(`👨‍🏫 Processing team: ${team.teamName} (${teamId})`);
            
            // Try to find group chat by team ID first, then by generated IDs
            const possibleChatIds = [
              teamId, // Direct team ID
              // Generated formats
              `${ageGroup}_${sport.replace(/\s+/g, '_')}_${location.replace(/\s+/g, '_').replace(/,/g, ',_')}`,
              `${sport.toLowerCase().replace(/\s+/g, '-')}-${ageGroup.toLowerCase()}-${location.toLowerCase().replace(/\s+/g, '-').replace(/,\s*/g, '---')}`
            ];
            
            console.log(`🔍 Looking for coach chat IDs:`, possibleChatIds);
            
            let foundChatId = null;
            let foundChatData = null;
            
            // Check if any of these chats exist
            for (const chatId of possibleChatIds) {
              try {
                const chatRef = doc(db, 'groupChats', chatId);
                const chatSnap = await getDoc(chatRef);
                
                if (chatSnap.exists()) {
                  console.log(`✅ Found existing chat: ${chatId}`);
                  foundChatId = chatId;
                  foundChatData = chatSnap.data();
                  break;
                }
              } catch (checkError) {
                console.log(`⚠️ Error checking ${chatId}:`, checkError.message);
              }
            }
            
            if (foundChatId && foundChatData) {
              // Add coach to the chat members with coach role
              const existingMembers = foundChatData.members || [];
              
              // Check if coach already exists
              const coachExists = existingMembers.some(member => 
                member.parentId === coachUid || 
                (member.parentEmail && member.parentEmail.toLowerCase() === coachData.email.toLowerCase()) ||
                member.role === 'coach'
              );
              
              if (!coachExists) {
                const coachMember = {
                  parentId: coachUid,
                  parentName: `${coachData.firstName} ${coachData.lastName}`,
                  parentEmail: coachData.email,
                  role: 'coach',
                  isCoach: true,
                  ageGroup: ageGroup,
                  sport: sport,
                  location: location,
                  teamId: teamId,
                  joinedAt: new Date().toISOString()
                };
                
                const updatedMembers = [...existingMembers, coachMember];
                
                const chatRef = doc(db, 'groupChats', foundChatId);
                await updateDoc(chatRef, {
                  members: updatedMembers,
                  memberCount: updatedMembers.length,
                  lastActivity: serverTimestamp(),
                  hasCoach: true,
                  coachId: coachUid,
                  coachName: `${coachData.firstName} ${coachData.lastName}`
                });
                
                console.log(`✅ Added coach to chat: ${foundChatId}`);
                results.push({
                  coachEmail: coachData.email,
                  coachUid,
                  teamId,
                  chatId: foundChatId,
                  success: true,
                  action: 'added'
                });
              } else {
                console.log(`✅ Coach already in chat: ${foundChatId}`);
                results.push({
                  coachEmail: coachData.email,
                  coachUid,
                  teamId,
                  chatId: foundChatId,
                  success: true,
                  action: 'already_member'
                });
              }
            } else {
              console.log(`⚠️ No group chat found for team ${teamId}`);
              results.push({
                coachEmail: coachData.email,
                coachUid,
                teamId,
                success: false,
                action: 'not_found',
                error: 'No matching group chat found'
              });
            }
          } catch (teamError) {
            console.error(`❌ Error processing team ${team.id}:`, teamError);
            results.push({
              coachEmail: coachData.email,
              coachUid,
              teamId: team.id,
              success: false,
              action: 'error',
              error: teamError.message
            });
          }
        }
        
        // Add small delay to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (coachError) {
        console.error(`❌ Error processing coach ${coachDoc.id}:`, coachError);
        results.push({
          coachEmail: 'unknown',
          coachUid: coachDoc.id,
          success: false,
          action: 'error',
          error: coachError.message
        });
      }
    }
    
    const summary = {
      totalCoaches: coachesSnapshot.docs.length,
      totalResults: results.length,
      added: results.filter(r => r.success && r.action === 'added').length,
      alreadyMember: results.filter(r => r.success && r.action === 'already_member').length,
      skipped: results.filter(r => r.success && r.action === 'skipped').length,
      notFound: results.filter(r => r.action === 'not_found').length,
      errors: results.filter(r => !r.success && r.action === 'error').length
    };
    
    console.log('📊 Fix coaches summary:', summary);
    
    return {
      success: true,
      results,
      summary
    };
    
  } catch (error) {
    console.error('❌ Error fixing coach group chat access:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  parseGroupChatId,
  findMatchingRoster,
  fixGroupChatAccess,
  fixAllGroupChats,
  getAllExistingGroupChats,
  fixUserGroupChatAccess,
  addUserToGroupChat,
  fixAllMemberGroupChatAccess,
  fixCoachGroupChatAccess
};