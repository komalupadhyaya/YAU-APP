import GroupChatService from '../services/groupChatService.js';
import { db } from '../firebase/config.js';
import { collection, getDocs } from 'firebase/firestore';

/**
 * Utility script to sync all existing rosters with group chats
 * This creates group chats for rosters that don't have them yet
 */
export const syncRostersToGroupChats = async () => {
  console.log('🚀 Starting roster to group chat sync...');
  
  try {
    // Use the service method to sync all rosters
    const results = await GroupChatService.syncRostersToGroupChats();
    
    // Display detailed results
    console.log('📊 Sync Results Summary:');
    console.log(`✅ Total rosters processed: ${results.length}`);
    console.log(`🆕 New group chats created: ${results.filter(r => r.success && r.isNewGroup).length}`);
    console.log(`♻️  Existing group chats found: ${results.filter(r => r.success && r.alreadyExists).length}`);
    console.log(`❌ Failed syncs: ${results.filter(r => !r.success).length}`);
    
    // Log detailed results for each roster
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const action = result.isNewGroup ? 'CREATED' : 
                    result.alreadyExists ? 'EXISTS' : 
                    result.success ? 'UPDATED' : 'FAILED';
      
      console.log(`${status} [${index + 1}/${results.length}] ${action}: ${result.rosterId}`);
      
      if (result.success && result.groupName) {
        console.log(`    📝 Group: "${result.groupName}"`);
      }
      
      if (!result.success && result.error) {
        console.log(`    💥 Error: ${result.error}`);
      }
    });
    
    return results;
    
  } catch (error) {
    console.error('💥 Failed to sync rosters to group chats:', error);
    return [];
  }
};

/**
 * Check the sync status between rosters and group chats
 */
export const checkSyncStatus = async () => {
  console.log('🔍 Checking sync status between rosters and group chats...');
  
  try {
    // Get all rosters
    const rostersSnapshot = await getDocs(collection(db, 'rosters'));
    const rosterIds = rostersSnapshot.docs.map(doc => doc.id);
    
    // Get all group chats
    const chatsSnapshot = await getDocs(collection(db, 'groupChats'));
    const chatIds = chatsSnapshot.docs.map(doc => doc.id);
    
    // Find rosters without group chats
    const rostersWithoutChats = rosterIds.filter(rosterId => !chatIds.includes(rosterId));
    
    // Find group chats without rosters
    const chatsWithoutRosters = chatIds.filter(chatId => !rosterIds.includes(chatId));
    
    console.log('📊 Sync Status Report:');
    console.log(`📋 Total rosters: ${rosterIds.length}`);
    console.log(`💬 Total group chats: ${chatIds.length}`);
    console.log(`🔗 Perfectly synced: ${rosterIds.length - rostersWithoutChats.length}`);
    console.log(`⚠️  Rosters missing group chats: ${rostersWithoutChats.length}`);
    console.log(`⚠️  Group chats without rosters: ${chatsWithoutRosters.length}`);
    
    if (rostersWithoutChats.length > 0) {
      console.log('📋 Rosters needing group chats:');
      rostersWithoutChats.forEach(id => console.log(`  - ${id}`));
    }
    
    if (chatsWithoutRosters.length > 0) {
      console.log('💬 Group chats without rosters:');
      chatsWithoutRosters.forEach(id => console.log(`  - ${id}`));
    }
    
    return {
      totalRosters: rosterIds.length,
      totalChats: chatIds.length,
      syncedCount: rosterIds.length - rostersWithoutChats.length,
      rostersWithoutChats,
      chatsWithoutRosters,
      isFullySynced: rostersWithoutChats.length === 0
    };
    
  } catch (error) {
    console.error('💥 Failed to check sync status:', error);
    return null;
  }
};

/**
 * Main function to run sync and status check
 */
export const runFullSync = async () => {
  console.log('🎯 Running full roster to group chat sync...');
  
  // Check initial status
  const initialStatus = await checkSyncStatus();
  
  if (!initialStatus) {
    console.error('❌ Could not check initial sync status');
    return;
  }
  
  if (initialStatus.isFullySynced) {
    console.log('✅ All rosters already have group chats. No sync needed.');
    return initialStatus;
  }
  
  // Run sync for missing group chats
  console.log(`🔄 Syncing ${initialStatus.rostersWithoutChats.length} missing group chats...`);
  const syncResults = await syncRostersToGroupChats();
  
  // Check final status
  const finalStatus = await checkSyncStatus();
  
  console.log('🎉 Full sync completed!');
  console.log(`Before: ${initialStatus.syncedCount}/${initialStatus.totalRosters} synced`);
  console.log(`After: ${finalStatus?.syncedCount}/${finalStatus?.totalRosters} synced`);
  
  return {
    initial: initialStatus,
    syncResults,
    final: finalStatus
  };
};

// Export default for easy import
export default {
  syncRostersToGroupChats,
  checkSyncStatus,
  runFullSync
};