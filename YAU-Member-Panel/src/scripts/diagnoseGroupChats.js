/**
 * Diagnostic script to examine actual Firebase group chat structure
 * This will check which group chats have message collections and verify our fixes
 */

import { db } from '../firebase/config.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import GroupChatService from '../services/groupChatService.js';
import { parseGroupChatId } from '../utils/fixGroupChatAccess.js';

export const diagnoseAllGroupChats = async () => {
  console.log('🔍 Starting comprehensive group chat diagnosis...');
  console.log('=====================================');
  
  try {
    // Step 1: Get all group chat documents
    console.log('📋 Step 1: Fetching all group chat documents...');
    const groupChatsSnapshot = await getDocs(collection(db, 'groupChats'));
    
    const analysis = {
      totalChats: 0,
      chatsWithDocuments: 0,
      chatsWithMessages: 0,
      chatsWithDocumentsAndMessages: 0,
      chatsWithMessagesOnly: 0,
      chatsEmpty: 0,
      detailedResults: []
    };
    
    console.log(`Found ${groupChatsSnapshot.docs.length} group chat entries in Firebase`);
    
    // Step 2: Analyze each group chat
    for (const chatDoc of groupChatsSnapshot.docs) {
      const chatId = chatDoc.id;
      const chatData = chatDoc.data();
      
      console.log(`\n🔍 Analyzing chat: ${chatId}`);
      
      const chatAnalysis = {
        id: chatId,
        hasDocument: !!chatData.name,
        documentData: chatData,
        messageCount: 0,
        hasMessages: false,
        members: chatData.members || [],
        memberCount: chatData.memberCount || 0,
        parseResult: parseGroupChatId(chatId),
        needsFix: false,
        issues: []
      };
      
      // Check for messages subcollection
      try {
        const messagesSnapshot = await getDocs(collection(db, 'groupChats', chatId, 'messages'));
        chatAnalysis.messageCount = messagesSnapshot.docs.length;
        chatAnalysis.hasMessages = messagesSnapshot.docs.length > 0;
        
        console.log(`  📨 Messages: ${chatAnalysis.messageCount}`);
        
        if (chatAnalysis.hasMessages) {
          analysis.chatsWithMessages++;
          
          // Analyze message structure
          const sampleMessage = messagesSnapshot.docs[0]?.data();
          if (sampleMessage) {
            console.log(`  📝 Sample message from:`, sampleMessage.senderName || sampleMessage.uid || 'Unknown');
            chatAnalysis.sampleMessage = {
              text: sampleMessage.text?.substring(0, 50) + '...',
              sender: sampleMessage.senderName,
              uid: sampleMessage.uid,
              timestamp: sampleMessage.timestamp
            };
          }
        }
        
      } catch (msgError) {
        console.warn(`  ⚠️ Error checking messages: ${msgError.message}`);
        chatAnalysis.issues.push(`Messages check error: ${msgError.message}`);
      }
      
      // Categorize the chat
      if (chatAnalysis.hasDocument) {
        analysis.chatsWithDocuments++;
        console.log(`  📄 Document: ✅ "${chatData.name}"`);
        console.log(`  👥 Members: ${chatAnalysis.memberCount}`);
        
        if (chatAnalysis.hasMessages) {
          analysis.chatsWithDocumentsAndMessages++;
        }
      } else {
        console.log(`  📄 Document: ❌ (No main document)`);
        chatAnalysis.issues.push('Missing main document');
      }
      
      if (chatAnalysis.hasMessages && !chatAnalysis.hasDocument) {
        analysis.chatsWithMessagesOnly++;
        chatAnalysis.needsFix = true;
        chatAnalysis.issues.push('Has messages but no document - needs fixing');
        console.log(`  🔧 Status: NEEDS DOCUMENT CREATION`);
      }
      
      if (!chatAnalysis.hasMessages && !chatAnalysis.hasDocument) {
        analysis.chatsEmpty++;
        console.log(`  📭 Status: Empty (no document or messages)`);
      }
      
      // Parse chat ID
      if (chatAnalysis.parseResult.success) {
        console.log(`  🏷️ Parsed: ${chatAnalysis.parseResult.ageGroup} ${chatAnalysis.parseResult.sport} - ${chatAnalysis.parseResult.location}`);
      } else {
        console.log(`  🏷️ Parse failed: ${chatAnalysis.parseResult.error}`);
        chatAnalysis.issues.push(`ID parsing failed: ${chatAnalysis.parseResult.error}`);
      }
      
      analysis.detailedResults.push(chatAnalysis);
      analysis.totalChats++;
    }
    
    // Step 3: Print summary
    console.log('\n📊 DIAGNOSIS SUMMARY');
    console.log('=====================================');
    console.log(`Total group chats found: ${analysis.totalChats}`);
    console.log(`Chats with documents: ${analysis.chatsWithDocuments}`);
    console.log(`Chats with messages: ${analysis.chatsWithMessages}`);
    console.log(`Chats with both documents and messages: ${analysis.chatsWithDocumentsAndMessages}`);
    console.log(`Chats with messages only (need fixing): ${analysis.chatsWithMessagesOnly}`);
    console.log(`Empty chats: ${analysis.chatsEmpty}`);
    
    // Step 4: Show problematic chats
    const problemChats = analysis.detailedResults.filter(chat => chat.needsFix || chat.issues.length > 0);
    
    if (problemChats.length > 0) {
      console.log(`\n🚨 CHATS NEEDING ATTENTION: ${problemChats.length}`);
      console.log('=====================================');
      
      problemChats.forEach((chat, index) => {
        console.log(`${index + 1}. ${chat.id}`);
        console.log(`   Messages: ${chat.messageCount}`);
        console.log(`   Has Document: ${chat.hasDocument ? '✅' : '❌'}`);
        console.log(`   Issues: ${chat.issues.join(', ')}`);
        if (chat.parseResult.success) {
          console.log(`   Team: ${chat.parseResult.ageGroup} ${chat.parseResult.sport} - ${chat.parseResult.location}`);
        }
        console.log('');
      });
    }
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test the new functionality with real data
 */
export const testNewFunctionalityWithRealData = async () => {
  console.log('🧪 Testing new functionality with real Firebase data...');
  console.log('=====================================');
  
  try {
    // Get the diagnosis first
    const analysis = await diagnoseAllGroupChats();
    
    if (!analysis.success === false) {
      const chatsWithMessagesOnly = analysis.detailedResults.filter(chat => 
        chat.hasMessages && !chat.hasDocument
      );
      
      console.log(`\n🔧 Testing document creation for ${chatsWithMessagesOnly.length} chats with messages only...`);
      
      for (const chat of chatsWithMessagesOnly.slice(0, 3)) { // Test first 3 to avoid overwhelming
        console.log(`\n🧪 Testing chat: ${chat.id}`);
        
        // Test the new getChatMessages with document creation
        const messages = await GroupChatService.getChatMessages(chat.id, 10, true);
        console.log(`✅ Retrieved ${messages.length} messages`);
        
        // Check if document was created
        const chatRef = doc(db, 'groupChats', chat.id);
        const chatSnap = await getDoc(chatRef);
        
        if (chatSnap.exists()) {
          const newData = chatSnap.data();
          console.log(`✅ Document created: "${newData.name}"`);
          console.log(`📊 Members: ${newData.memberCount || 0}`);
          console.log(`🏷️ Created from messages: ${newData.createdFromMessages || false}`);
        } else {
          console.log(`❌ Document creation failed for ${chat.id}`);
        }
      }
    }
    
    console.log('\n✅ Real data testing completed!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Real data testing failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test user group chat detection with real user data
 */
export const testUserGroupChatDetection = async (userEmail = 'test@example.com', userUid = 'test-uid') => {
  console.log(`👤 Testing user group chat detection for: ${userEmail}`);
  console.log('=====================================');
  
  try {
    // Use the enhanced getUserGroupChats method
    const userChats = await GroupChatService.getUserGroupChats(userEmail, userUid);
    
    console.log(`📱 User has access to ${userChats.length} group chats:`);
    
    userChats.forEach((chat, index) => {
      console.log(`${index + 1}. ${chat.name} (${chat.id})`);
      console.log(`   Members: ${chat.memberCount}`);
      console.log(`   Sport: ${chat.sport}, Age: ${chat.ageGroup}`);
      console.log(`   Last Activity: ${chat.lastActivity}`);
    });
    
    if (userChats.length === 0) {
      console.log('⚠️ No accessible chats found - check console for diagnostic info');
    }
    
    return { success: true, chatCount: userChats.length, chats: userChats };
    
  } catch (error) {
    console.error('❌ User detection test failed:', error);
    return { success: false, error: error.message };
  }
};

// Export for use in browser console or components
export default {
  diagnoseAllGroupChats,
  testNewFunctionalityWithRealData,
  testUserGroupChatDetection
};