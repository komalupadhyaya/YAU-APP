import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import GroupChatService from './groupChatService';

class GroupChatMigrationService {
  /**
   * Find and fix group chats with inconsistent IDs
   * This will migrate chats like "ym5br53GGkmwdBVfFXQY" to proper format like "6U_Basketball_Greenbelt,_MD"
   */
  static async migrateInconsistentGroupChats() {
    try {
      console.log('🔄 Starting group chat migration...');
      
      // Get all existing group chats
      const groupChatsSnapshot = await getDocs(collection(db, 'groupChats'));
      const migrationsNeeded = [];
      const alreadyProper = [];

      for (const docSnap of groupChatsSnapshot.docs) {
        const chatId = docSnap.id;
        const chatData = docSnap.data();

        // Check if this chat has proper format (contains underscores and team info)
        const isProperFormat = this.isProperChatId(chatId);
        
        if (!isProperFormat && chatData.sport && chatData.ageGroup && chatData.location) {
          // This needs migration - generate the proper chat ID
          const properChatId = GroupChatService.generateChatId(
            chatData.ageGroup,
            chatData.sport,
            chatData.location
          );

          console.log(`🔄 Migration needed:`, {
            oldId: chatId,
            newId: properChatId,
            teamInfo: `${chatData.ageGroup} ${chatData.sport} - ${chatData.location}`
          });

          migrationsNeeded.push({
            oldId: chatId,
            newId: properChatId,
            chatData: chatData
          });
        } else if (isProperFormat) {
          alreadyProper.push(chatId);
        }
      }

      console.log(`📊 Migration Analysis:`, {
        totalChats: groupChatsSnapshot.docs.length,
        needMigration: migrationsNeeded.length,
        alreadyProper: alreadyProper.length
      });

      // Perform migrations
      let successCount = 0;
      let errorCount = 0;

      for (const migration of migrationsNeeded) {
        try {
          await this.migrateSingleChat(migration.oldId, migration.newId, migration.chatData);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to migrate ${migration.oldId}:`, error);
          errorCount++;
        }
      }

      console.log(`✅ Migration completed:`, {
        successful: successCount,
        failed: errorCount
      });

      return {
        success: true,
        migrationsPerformed: successCount,
        errors: errorCount,
        details: migrationsNeeded
      };

    } catch (error) {
      console.error('❌ Error during migration:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Migrate a single chat from old ID to new ID
   */
  static async migrateSingleChat(oldId, newId, chatData) {
    try {
      console.log(`🔄 Migrating: ${oldId} → ${newId}`);

      // Check if target already exists
      const targetDoc = await getDoc(doc(db, 'groupChats', newId));
      if (targetDoc.exists()) {
        console.log(`⚠️ Target ${newId} already exists, merging members...`);
        
        // Merge members from old chat into existing new chat
        const existingData = targetDoc.data();
        const existingMembers = existingData.members || [];
        const oldMembers = chatData.members || [];

        // Combine members, avoiding duplicates
        const combinedMembers = [...existingMembers];
        oldMembers.forEach(oldMember => {
          const exists = existingMembers.some(em => 
            em.parentEmail === oldMember.parentEmail && 
            em.studentName === oldMember.studentName
          );
          if (!exists) {
            combinedMembers.push(oldMember);
          }
        });

        // Update the target with combined members
        await setDoc(doc(db, 'groupChats', newId), {
          ...existingData,
          members: combinedMembers,
          memberCount: combinedMembers.length
        });

        // Migrate messages
        await this.migrateMessages(oldId, newId);

        // Delete old chat
        await deleteDoc(doc(db, 'groupChats', oldId));

        console.log(`✅ Merged ${oldId} into existing ${newId}`);
      } else {
        // Simply rename the chat
        await setDoc(doc(db, 'groupChats', newId), {
          ...chatData,
          id: newId
        });

        // Migrate messages
        await this.migrateMessages(oldId, newId);

        // Delete old chat
        await deleteDoc(doc(db, 'groupChats', oldId));

        console.log(`✅ Renamed ${oldId} to ${newId}`);
      }

    } catch (error) {
      console.error(`❌ Error migrating ${oldId}:`, error);
      throw error;
    }
  }

  /**
   * Migrate messages from old chat to new chat
   */
  static async migrateMessages(oldChatId, newChatId) {
    try {
      // Get all messages from old chat
      const oldMessagesSnapshot = await getDocs(
        collection(db, 'groupChats', oldChatId, 'messages')
      );

      if (oldMessagesSnapshot.empty) {
        console.log(`📭 No messages to migrate from ${oldChatId}`);
        return;
      }

      // Copy messages to new chat
      const batch = writeBatch(db);
      let messageCount = 0;

      oldMessagesSnapshot.docs.forEach(messageDoc => {
        const newMessageRef = doc(collection(db, 'groupChats', newChatId, 'messages'));
        batch.set(newMessageRef, messageDoc.data());
        messageCount++;
      });

      await batch.commit();
      console.log(`📧 Migrated ${messageCount} messages from ${oldChatId} to ${newChatId}`);

    } catch (error) {
      console.error(`❌ Error migrating messages from ${oldChatId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a chat ID follows the proper format
   */
  static isProperChatId(chatId) {
    // Proper format can be either:
    // OLD: "AgeGroup_Sport_Location" (e.g., "6U_Basketball_Greenbelt,_MD")
    // NEW: "sport-agegroup-location" (e.g., "soccer-13u-andrews-afb---clinton")
    
    // Check for NEW format (lowercase with dashes)
    if (chatId.includes('-')) {
      const parts = chatId.split('-');
      // Should have at least 3 parts: sport, agegroup, location
      if (parts.length >= 3) {
        // Check if second part looks like an age group (number followed by 'u')
        const secondPart = parts[1];
        if (/^\d+u$/.test(secondPart)) {
          return true;
        }
      }
    }
    
    // Check for OLD format (mixed case with underscores)
    const parts = chatId.split('_');
    if (parts.length >= 3) {
      // First part should be age group (ends with 'U')
      const firstPart = parts[0];
      if (/^\d+U$/.test(firstPart)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * List all group chats and their formats for debugging
   */
  static async listAllGroupChats() {
    try {
      const groupChatsSnapshot = await getDocs(collection(db, 'groupChats'));
      const chatsList = [];

      for (const docSnap of groupChatsSnapshot.docs) {
        const chatId = docSnap.id;
        const chatData = docSnap.data();
        const messagesSnapshot = await getDocs(
          collection(db, 'groupChats', chatId, 'messages')
        );

        chatsList.push({
          id: chatId,
          name: chatData.name,
          sport: chatData.sport,
          ageGroup: chatData.ageGroup,
          location: chatData.location,
          memberCount: chatData.memberCount || 0,
          messageCount: messagesSnapshot.size,
          isProperFormat: this.isProperChatId(chatId),
          shouldBe: chatData.sport && chatData.ageGroup && chatData.location 
            ? GroupChatService.generateChatId(chatData.ageGroup, chatData.sport, chatData.location)
            : 'N/A'
        });
      }

      console.log('📋 All Group Chats:', chatsList);
      return chatsList;

    } catch (error) {
      console.error('❌ Error listing group chats:', error);
      throw error;
    }
  }
}

export default GroupChatMigrationService;