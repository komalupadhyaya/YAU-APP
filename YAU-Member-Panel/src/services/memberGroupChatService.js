import { getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase/config';
import GroupChatService from './groupChatService';

class MemberGroupChatService {
  /**
   * Create missing group chats for all existing members
   * This is useful for members who registered before the group chat system was implemented
   */
  static async createMissingGroupChatsForAllMembers() {
    try {
      console.log('🚀 Creating missing group chats for all existing members...');

      // Get all members and registrations
      const [membersSnapshot, registrationsSnapshot] = await Promise.all([
        getDocs(collection(db, 'members')),
        getDocs(collection(db, 'registrations'))
      ]);

      const allUsers = [];
      
      // Process members
      membersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.students && Array.isArray(data.students)) {
          allUsers.push({
            id: doc.id,
            ...data,
            collection: 'members'
          });
        }
      });

      // Process registrations
      registrationsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.students && Array.isArray(data.students)) {
          allUsers.push({
            id: doc.id,
            ...data,
            collection: 'registrations'
          });
        }
      });

      console.log(`👥 Found ${allUsers.length} users with students`);

      let totalGroupsCreated = 0;
      let totalMembersProcessed = 0;
      const results = [];

      for (const user of allUsers) {
        try {
          const userResults = await this.createGroupChatsForUser(user);
          results.push({
            userId: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            success: true,
            groupsCreated: userResults.groupsCreated,
            details: userResults.details
          });
          
          totalGroupsCreated += userResults.groupsCreated;
          totalMembersProcessed++;
          
        } catch (error) {
          console.error(`❌ Error processing user ${user.email}:`, error);
          results.push({
            userId: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            success: false,
            error: error.message
          });
        }
      }

      console.log(`✅ Bulk group chat creation completed:`, {
        membersProcessed: totalMembersProcessed,
        totalGroupsCreated: totalGroupsCreated,
        errors: results.filter(r => !r.success).length
      });

      return {
        success: true,
        membersProcessed: totalMembersProcessed,
        totalGroupsCreated: totalGroupsCreated,
        results: results
      };

    } catch (error) {
      console.error('❌ Error in bulk group chat creation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create group chats for a specific user
   */
  static async createGroupChatsForUser(userData) {
    const results = {
      groupsCreated: 0,
      details: []
    };

    if (!userData.students || !Array.isArray(userData.students)) {
      return results;
    }

    for (const student of userData.students) {
      try {
        // Skip if student data is incomplete
        if (!student.firstName || !userData.sport || !userData.location) {
          console.warn(`⚠️ Skipping incomplete student data:`, {
            student: student.firstName,
            sport: userData.sport,
            location: userData.location
          });
          continue;
        }

        const memberData = {
          uid: userData.uid || userData.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          sport: userData.sport,
          location: userData.location
        };

        const studentData = {
          firstName: student.firstName,
          lastName: student.lastName,
          dob: student.dob,
          ageGroup: student.ageGroup || this.calculateAgeGroup(student.dob)
        };

        const result = await GroupChatService.createOrEnsureGroupChat(memberData, studentData);
        
        if (result.success && result.isNewGroup) {
          results.groupsCreated++;
        }

        results.details.push({
          student: `${studentData.firstName} ${studentData.lastName}`,
          chatId: result.chatId,
          action: result.alreadyMember ? 'already_member' : result.isNewGroup ? 'created' : 'joined_existing',
          success: result.success
        });

      } catch (error) {
        console.error(`❌ Error creating group for student ${student.firstName}:`, error);
        results.details.push({
          student: `${student.firstName} ${student.lastName}`,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Create missing group chats for a specific member by email/UID
   */
  static async createMissingGroupChatsForMember(userEmail, userUid) {
    try {
      console.log(`🔄 Creating missing group chats for member:`, { email: userEmail, uid: userUid });

      // Find the user in either members or registrations collection
      const [membersSnapshot, registrationsSnapshot] = await Promise.all([
        getDocs(collection(db, 'members')),
        getDocs(collection(db, 'registrations'))
      ]);

      let userData = null;

      // Check members collection
      for (const doc of membersSnapshot.docs) {
        const data = doc.data();
        if (data.email === userEmail || data.uid === userUid) {
          userData = { id: doc.id, ...data, collection: 'members' };
          break;
        }
      }

      // Check registrations collection if not found
      if (!userData) {
        for (const doc of registrationsSnapshot.docs) {
          const data = doc.data();
          if (data.email === userEmail || data.uid === userUid) {
            userData = { id: doc.id, ...data, collection: 'registrations' };
            break;
          }
        }
      }

      if (!userData) {
        throw new Error(`User not found with email: ${userEmail}, uid: ${userUid}`);
      }

      console.log(`👤 Found user:`, {
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`,
        sport: userData.sport,
        location: userData.location,
        students: userData.students?.length || 0
      });

      const results = await this.createGroupChatsForUser(userData);
      
      console.log(`✅ Group chat creation completed for ${userData.email}:`, results);
      
      return {
        success: true,
        userData: userData,
        ...results
      };

    } catch (error) {
      console.error(`❌ Error creating group chats for member:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate age group from date of birth
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
}

export default MemberGroupChatService;