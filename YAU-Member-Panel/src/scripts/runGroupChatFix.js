/**
 * Production script to fix group chat access for existing users
 * Run this after the recent roster sync to ensure users can access their team chats
 */

import { fixAllGroupChats, getAllExistingGroupChats, fixAllMemberGroupChatAccess, fixCoachGroupChatAccess } from '../utils/fixGroupChatAccess.js';
import GroupChatService from '../services/groupChatService.js';

/**
 * Main function to run the group chat fix
 */
export const runGroupChatFix = async () => {
  try {
    console.log('🚀 Starting Group Chat Fix Script...');
    console.log('=====================================');
    
    // Step 1: Get current status
    console.log('📊 Step 1: Checking current group chat status...');
    const statusResult = await getAllExistingGroupChats();
    
    if (!statusResult.success) {
      throw new Error(`Failed to get existing group chats: ${statusResult.error}`);
    }
    
    console.log('📊 Current Status:');
    console.log(`   Total Group Chats: ${statusResult.summary.total}`);
    console.log(`   With Documents: ${statusResult.summary.withDocuments}`);
    console.log(`   Without Documents: ${statusResult.summary.withoutDocuments}`);
    console.log(`   With Messages: ${statusResult.summary.withMessages}`);
    console.log('');
    
    // Step 2: Run group chat document fix
    console.log('🔧 Step 2: Running group chat document fix...');
    const fixResult = await fixAllGroupChats();
    
    if (!fixResult.success) {
      throw new Error(`Fix process failed: ${fixResult.error}`);
    }
    
    console.log('✅ Document fix completed successfully!');
    console.log('📊 Fix Results:');
    console.log(`   Total Processed: ${fixResult.summary.total}`);
    console.log(`   Successful: ${fixResult.summary.successful}`);
    console.log(`   Failed: ${fixResult.summary.failed}`);
    console.log(`   Created: ${fixResult.summary.created}`);
    console.log(`   Updated: ${fixResult.summary.updated}`);
    console.log('');
    
    // Step 3: Fix member access to group chats
    console.log('👥 Step 3: Fixing member access to group chats...');
    const memberFixResult = await fixAllMemberGroupChatAccess();
    
    if (!memberFixResult.success) {
      console.warn('⚠️ Member fix had issues:', memberFixResult.error);
    } else {
      console.log('✅ Member access fix completed!');
      console.log('📊 Member Fix Results:');
      console.log(`   Total Members Processed: ${memberFixResult.summary.totalMembers}`);
      console.log(`   Added to Chats: ${memberFixResult.summary.added}`);
      console.log(`   Already Members: ${memberFixResult.summary.alreadyMember}`);
      console.log(`   Not Found: ${memberFixResult.summary.notFound}`);
      console.log(`   Errors: ${memberFixResult.summary.errors}`);
    }
    console.log('');
    
    // Step 4: Fix coach access to group chats
    console.log('👨‍🏫 Step 4: Fixing coach access to group chats...');
    const coachFixResult = await fixCoachGroupChatAccess();
    
    if (!coachFixResult.success) {
      console.warn('⚠️ Coach fix had issues:', coachFixResult.error);
    } else {
      console.log('✅ Coach access fix completed!');
      console.log('📊 Coach Fix Results:');
      console.log(`   Total Coaches Processed: ${coachFixResult.summary.totalCoaches}`);
      console.log(`   Added to Chats: ${coachFixResult.summary.added}`);
      console.log(`   Already Members: ${coachFixResult.summary.alreadyMember}`);
      console.log(`   Not Found: ${coachFixResult.summary.notFound}`);
      console.log(`   Errors: ${coachFixResult.summary.errors}`);
    }
    console.log('');
    
    // Step 5: Ensure proper message collection structure
    console.log('📨 Step 5: Ensuring proper message collection structure...');
    const messageStructureResult = await GroupChatService.ensureMessageCollectionStructure();
    
    if (!messageStructureResult.success) {
      console.warn('⚠️ Message structure check had issues:', messageStructureResult.error);
    } else {
      console.log('✅ Message structure check completed!');
      console.log('📊 Message Structure Results:');
      console.log(`   Total Chats Checked: ${messageStructureResult.summary.totalChats}`);
      console.log(`   Chats with Messages: ${messageStructureResult.summary.chatsWithMessages}`);
      console.log(`   Valid Structure: ${messageStructureResult.summary.validStructure}`);
      console.log(`   Fixed Messages: ${messageStructureResult.summary.totalFixedMessages}`);
      console.log(`   Errors: ${messageStructureResult.summary.errors}`);
    }
    console.log('');
    
    // Step 6: Final status check
    console.log('📊 Step 6: Final status check...');
    const finalStatusResult = await getAllExistingGroupChats();
    
    if (finalStatusResult.success) {
      console.log('📊 Final Status:');
      console.log(`   Total Group Chats: ${finalStatusResult.summary.total}`);
      console.log(`   With Documents: ${finalStatusResult.summary.withDocuments}`);
      console.log(`   Without Documents: ${finalStatusResult.summary.withoutDocuments}`);
      console.log(`   With Messages: ${finalStatusResult.summary.withMessages}`);
    }
    
    console.log('');
    console.log('🎉 Group Chat Fix Script completed successfully!');
    console.log('=====================================');
    
    // Show any failures for debugging
    if (fixResult.summary.failed > 0) {
      console.log('⚠️ Failed fixes:');
      fixResult.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   ${r.chatId}: ${r.error}`);
        });
    }
    
    return {
      success: true,
      initialStatus: statusResult.summary,
      fixResults: fixResult.summary,
      memberFixResults: memberFixResult.success ? memberFixResult.summary : null,
      coachFixResults: coachFixResult.success ? coachFixResult.summary : null,
      messageStructureResults: messageStructureResult.success ? messageStructureResult.summary : null,
      finalStatus: finalStatusResult.success ? finalStatusResult.summary : null
    };
    
  } catch (error) {
    console.error('💥 Group Chat Fix Script failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Run the script immediately when imported
 */
if (typeof window === 'undefined') {
  // Node.js environment - run immediately
  runGroupChatFix()
    .then(result => {
      if (result.success) {
        console.log('✅ Script completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Script failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Script error:', error);
      process.exit(1);
    });
}

export default runGroupChatFix;