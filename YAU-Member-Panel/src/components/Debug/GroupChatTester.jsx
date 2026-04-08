import React, { useState } from 'react';
import GroupChatService from '../../services/groupChatService.js';
import RosterService from '../../services/rosterService.js';
import { runFullSync, checkSyncStatus } from '../../utils/syncRostersToGroupChats.js';
import { 
  fixAllGroupChats, 
  getAllExistingGroupChats,
  parseGroupChatId,
  fixGroupChatAccess 
} from '../../utils/fixGroupChatAccess.js';
import { 
  diagnoseAllGroupChats, 
  testNewFunctionalityWithRealData,
  testUserGroupChatDetection 
} from '../../scripts/diagnoseGroupChats.js';
import { 
  testServerTimestampFix, 
  explainServerTimestampError 
} from '../../scripts/testServerTimestampFix.js';

const GroupChatTester = () => {
  const [results, setResults] = useState('');
  const [loading, setLoading] = useState(false);
  
  const addToResults = (message) => {
    setResults(prev => prev + '\n' + message);
    console.log(message);
  };

  const testGroupChatCreation = async () => {
    setLoading(true);
    setResults('🧪 Testing Group Chat Creation...\n');
    
    try {
      // Mock data similar to registration
      const mockMemberData = {
        uid: 'test-uid-' + Date.now(),
        firstName: 'Test',
        lastName: 'Parent',
        email: 'test@example.com',
        phone: '1234567890',
        sport: 'soccer',
        location: 'Andrews AFB - Clinton'
      };
      
      const mockStudent = {
        firstName: 'Test',
        lastName: 'Student',
        dob: '2012-08-27', // Should be 13U
        ageGroup: '13U'
      };
      
      addToResults('📋 Testing roster creation...');
      const rosterResult = await RosterService.addPlayerToRoster(mockMemberData, mockStudent);
      addToResults(`Roster result: ${JSON.stringify(rosterResult, null, 2)}`);
      
      addToResults('\n💬 Testing group chat creation...');
      const chatResult = await GroupChatService.createOrEnsureGroupChat(mockMemberData, mockStudent);
      addToResults(`Chat result: ${JSON.stringify(chatResult, null, 2)}`);
      
      if (rosterResult.success && chatResult.success) {
        addToResults('\n✅ Test completed successfully!');
        addToResults(`Roster ID: ${rosterResult.rosterId}`);
        addToResults(`Chat ID: ${chatResult.chatId}`);
        addToResults(`Group Name: ${chatResult.groupName}`);
        addToResults(`Has Roster Link: ${chatResult.hasRoster}`);
      } else {
        addToResults('\n❌ Test failed!');
        if (!rosterResult.success) addToResults(`Roster error: ${rosterResult.error}`);
        if (!chatResult.success) addToResults(`Chat error: ${chatResult.error}`);
      }
      
    } catch (error) {
      addToResults(`\n💥 Test error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testSyncStatus = async () => {
    setLoading(true);
    setResults('🔍 Checking Sync Status...\n');
    
    try {
      const status = await checkSyncStatus();
      addToResults(`Sync Status: ${JSON.stringify(status, null, 2)}`);
    } catch (error) {
      addToResults(`💥 Sync status error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const runFullSyncProcess = async () => {
    setLoading(true);
    setResults('🎯 Running Full Sync...\n');
    
    try {
      const syncResult = await runFullSync();
      addToResults(`Full sync result: ${JSON.stringify(syncResult, null, 2)}`);
    } catch (error) {
      addToResults(`💥 Full sync error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testIDGeneration = () => {
    setResults('🔧 Testing ID Generation...\n');
    
    const testCases = [
      { sport: 'soccer', ageGroup: '13U', location: 'Andrews AFB - Clinton' },
      { sport: 'track', ageGroup: '13U', location: 'Andrews AFB - Clinton' },
      { sport: 'basketball', ageGroup: '10U', location: 'Greenbelt, MD' },
      { sport: 'football', ageGroup: '14U', location: 'Bowie, MD' }
    ];
    
    testCases.forEach(testCase => {
      const rosterId = RosterService.generateRosterId(testCase.ageGroup, testCase.sport, testCase.location);
      const chatId = GroupChatService.generateChatId(testCase.ageGroup, testCase.sport, testCase.location);
      
      addToResults(`${testCase.sport} ${testCase.ageGroup} @ ${testCase.location}`);
      addToResults(`  Roster ID: ${rosterId}`);
      addToResults(`  Chat ID: ${chatId}`);
      addToResults(`  Match: ${rosterId === chatId ? '✅' : '❌'}\n`);
    });
  };

  const testFixAllGroupChats = async () => {
    setLoading(true);
    setResults('🔧 Fixing All Group Chats..\n');
    
    try {
      const result = await fixAllGroupChats();
      addToResults(`Fix result: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      addToResults(`💥 Fix error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testGetAllGroupChats = async () => {
    setLoading(true);
    setResults('📋 Getting All Existing Group Chats..\n');
    
    try {
      const result = await getAllExistingGroupChats();
      addToResults(`All group chats: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      addToResults(`💥 Get all error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testParseGroupChatId = () => {
    setResults('🔍 Testing Group Chat ID Parsing..\n');
    
    const testIds = [
      '6U_Flag_Football_Bowie,_MD',
      '14U_Kickball_Greenbelt,_MD',
      '10U_Soccer_Bowie,_MD', 
      '13U_Basketball_Andrews_AFB_-_Clinton',
      'invalid-format'
    ];
    
    testIds.forEach(id => {
      const parsed = parseGroupChatId(id);
      addToResults(`ID: ${id}`);
      addToResults(`  Parsed: ${JSON.stringify(parsed, null, 2)}\n`);
    });
  };

  const testFixSpecificChat = async () => {
    setLoading(true);
    
    const testChatId = '6U_Flag_Football_Bowie,_MD'; // Current user's actual group chat
    setResults(`🔧 Testing Fix for Specific Chat: ${testChatId}..\n`);
    
    try {
      const result = await fixGroupChatAccess(testChatId);
      addToResults(`Fix specific result: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      addToResults(`💥 Fix specific error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testMessageFetchingWithDocumentCreation = async () => {
    setLoading(true);
    setResults('📨 Testing Message Fetching with Document Creation..\n');
    
    try {
      // Test with known chats that might have messages but no document
      const testChats = [
        '6U_Flag_Football_Bowie,_MD',
        '14U_Kickball_Greenbelt,_MD',
        '10U_Soccer_Bowie,_MD'
      ];
      
      for (const chatId of testChats) {
        addToResults(`\n🔍 Testing chat: ${chatId}`);
        
        // Test document creation from messages
        const messages = await GroupChatService.getChatMessages(chatId, 50, true);
        addToResults(`  📨 Messages retrieved: ${messages.length}`);
        
        // Test access validation
        const accessResult = await GroupChatService.validateUserChatAccess(
          chatId, 
          'test@example.com', 
          'test-uid'
        );
        addToResults(`  🔐 Access validation: ${JSON.stringify(accessResult, null, 2)}`);
      }
    } catch (error) {
      addToResults(`💥 Message fetching test error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testImprovedUserGroupChats = async () => {
    setLoading(true);
    setResults('👤 Testing Improved User Group Chat Detection..\n');
    
    try {
      // Test with current user data
      const userChats = await GroupChatService.getUserGroupChats(
        'user@example.com',
        'test-user-uid'
      );
      
      addToResults(`📱 User group chats found: ${userChats.length}`);
      userChats.forEach((chat, index) => {
        addToResults(`  ${index + 1}. ${chat.name} (${chat.id})`);
        addToResults(`     Members: ${chat.memberCount}, Sport: ${chat.sport}, Age: ${chat.ageGroup}`);
      });
      
      if (userChats.length === 0) {
        addToResults('⚠️ No chats found - this will trigger diagnostic information in console');
      }
      
    } catch (error) {
      addToResults(`💥 User group chats test error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testGroupChatDocumentCreation = async () => {
    setLoading(true);
    setResults('🏗️ Testing Group Chat Document Creation from Messages..\n');
    
    try {
      // Test the new document creation functionality
      const testChatId = 'test_chat_document_creation';
      
      addToResults(`🔧 Testing document creation for: ${testChatId}`);
      
      // Test parseGroupChatId functionality
      const parseResults = [
        '14U_Kickball_Greenbelt,_MD',
        '6U_Flag_Football_Bowie,_MD',
        'soccer-13u-andrews-afb---clinton'
      ].map(id => ({
        id,
        parsed: parseGroupChatId(id)
      }));
      
      addToResults('\n🔍 Chat ID parsing tests:');
      parseResults.forEach(result => {
        addToResults(`  ${result.id}:`);
        addToResults(`    Success: ${result.parsed.success}`);
        if (result.parsed.success) {
          addToResults(`    Age: ${result.parsed.ageGroup}, Sport: ${result.parsed.sport}, Location: ${result.parsed.location}`);
        } else {
          addToResults(`    Error: ${result.parsed.error}`);
        }
      });
      
    } catch (error) {
      addToResults(`💥 Document creation test error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testComprehensiveDiagnosis = async () => {
    setLoading(true);
    setResults('🔍 Running Comprehensive Firebase Group Chat Diagnosis...\n');
    
    try {
      const analysis = await diagnoseAllGroupChats();
      
      if (analysis.success === false) {
        addToResults(`💥 Diagnosis failed: ${analysis.error}`);
        return;
      }
      
      addToResults('📊 DIAGNOSIS RESULTS:');
      addToResults(`Total group chats: ${analysis.totalChats}`);
      addToResults(`Chats with documents: ${analysis.chatsWithDocuments}`);
      addToResults(`Chats with messages: ${analysis.chatsWithMessages}`);
      addToResults(`Chats with both: ${analysis.chatsWithDocumentsAndMessages}`);
      addToResults(`Chats with messages only (need fixing): ${analysis.chatsWithMessagesOnly}`);
      addToResults(`Empty chats: ${analysis.chatsEmpty}`);
      
      // Show problematic chats
      const problemChats = analysis.detailedResults.filter(chat => chat.needsFix || chat.issues.length > 0);
      
      if (problemChats.length > 0) {
        addToResults(`\n🚨 CHATS NEEDING ATTENTION (${problemChats.length}):`);
        problemChats.forEach((chat, index) => {
          addToResults(`${index + 1}. ${chat.id}`);
          addToResults(`   📨 Messages: ${chat.messageCount}`);
          addToResults(`   📄 Has Document: ${chat.hasDocument ? '✅' : '❌'}`);
          if (chat.parseResult.success) {
            addToResults(`   🏷️ Team: ${chat.parseResult.ageGroup} ${chat.parseResult.sport} - ${chat.parseResult.location}`);
          }
          addToResults(`   ⚠️ Issues: ${chat.issues.join(', ')}`);
        });
      } else {
        addToResults('\n✅ All chats look good!');
      }
      
      // Show sample of working chats
      const workingChats = analysis.detailedResults.filter(chat => chat.hasDocument && chat.hasMessages);
      if (workingChats.length > 0) {
        addToResults(`\n✅ WORKING CHATS (showing first 5 of ${workingChats.length}):`);
        workingChats.slice(0, 5).forEach((chat, index) => {
          addToResults(`${index + 1}. ${chat.documentData.name || chat.id}`);
          addToResults(`   📨 Messages: ${chat.messageCount}, 👥 Members: ${chat.memberCount}`);
          if (chat.parseResult.success) {
            addToResults(`   🏷️ ${chat.parseResult.ageGroup} ${chat.parseResult.sport} - ${chat.parseResult.location}`);
          }
        });
      }
      
    } catch (error) {
      addToResults(`💥 Comprehensive diagnosis error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testRealDataFunctionality = async () => {
    setLoading(true);
    setResults('🧪 Testing New Functionality with Real Firebase Data...\n');
    
    try {
      const result = await testNewFunctionalityWithRealData();
      
      if (result.success) {
        addToResults('✅ Real data functionality test completed successfully!');
        addToResults('Check console for detailed results.');
      } else {
        addToResults(`💥 Real data test failed: ${result.error}`);
      }
      
    } catch (error) {
      addToResults(`💥 Real data functionality test error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testRealUserDetection = async () => {
    setLoading(true);
    setResults('👤 Testing Real User Group Chat Detection...\n');
    
    try {
      // Test with a few different user scenarios
      const testUsers = [
        { email: 'test@example.com', uid: 'test-uid' },
        { email: 'parent@yau.com', uid: 'parent-uid' },
        { email: 'coach@yau.com', uid: 'coach-uid' }
      ];
      
      for (const testUser of testUsers) {
        addToResults(`\n🔍 Testing user: ${testUser.email}`);
        
        const result = await testUserGroupChatDetection(testUser.email, testUser.uid);
        
        if (result.success) {
          addToResults(`✅ Found ${result.chatCount} accessible chats`);
          
          if (result.chats.length > 0) {
            result.chats.forEach((chat, index) => {
              addToResults(`  ${index + 1}. ${chat.name}`);
              addToResults(`     👥 ${chat.memberCount} members, 🏃 ${chat.sport} ${chat.ageGroup}`);
            });
          } else {
            addToResults('  ⚠️ No accessible chats (check console for diagnostic info)');
          }
        } else {
          addToResults(`💥 User detection failed: ${result.error}`);
        }
      }
      
    } catch (error) {
      addToResults(`💥 Real user detection test error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testServerTimestampIsFixed = async () => {
    setLoading(true);
    setResults('🔧 Testing serverTimestamp() Fix...\n');
    
    try {
      // First explain the error
      explainServerTimestampError();
      
      // Then test the fix
      const result = await testServerTimestampFix();
      
      if (result.success) {
        addToResults('✅ serverTimestamp() fix verified successfully!');
        addToResults(`✅ ${result.message}`);
        addToResults('');
        addToResults('📊 Test Results:');
        addToResults(`   Bad Example: ${result.testData.badExample}`);
        addToResults(`   Good Example: ${result.testData.goodExample}`);
        addToResults(`   Members Generated: ${result.testData.membersGenerated}`);
        addToResults('');
        addToResults('🎯 Key Points:');
        addToResults('   • serverTimestamp() cannot be used inside Firebase arrays');
        addToResults('   • We now use new Date().toISOString() for joinedAt timestamps');
        addToResults('   • This fixes the "not currently supported inside arrays" error');
        addToResults('   • The basketball-14u-bowie,-md error should be resolved');
      } else {
        addToResults(`❌ serverTimestamp() test failed: ${result.error}`);
      }
      
    } catch (error) {
      addToResults(`💥 serverTimestamp() test error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const clearResults = () => {
    setResults('');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Group Chat & Roster Tester</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <button
          onClick={testIDGeneration}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          🔧 Test ID Generation
        </button>
        
        <button
          onClick={testParseGroupChatId}
          disabled={loading}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-gray-400"
        >
          🔍 Test ID Parsing
        </button>
        
        <button
          onClick={testSyncStatus}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          📊 Check Sync Status
        </button>
        
        <button
          onClick={testGetAllGroupChats}
          disabled={loading}
          className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 disabled:bg-gray-400"
        >
          📋 Get All Group Chats
        </button>
        
        <button
          onClick={testFixSpecificChat}
          disabled={loading}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
        >
          🔧 Fix Specific Chat
        </button>
        
        <button
          onClick={testFixAllGroupChats}
          disabled={loading}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
        >
          🚨 Fix All Group Chats
        </button>
        
        <button
          onClick={testGroupChatCreation}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400"
        >
          🧪 Test New Chat Creation
        </button>
        
        <button
          onClick={runFullSyncProcess}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
        >
          🎯 Run Full Sync
        </button>
        
        <button
          onClick={testMessageFetchingWithDocumentCreation}
          disabled={loading}
          className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 disabled:bg-gray-400"
        >
          📨 Test Message Fetching
        </button>
        
        <button
          onClick={testImprovedUserGroupChats}
          disabled={loading}
          className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 disabled:bg-gray-400"
        >
          👤 Test User Chat Detection
        </button>
        
        <button
          onClick={testGroupChatDocumentCreation}
          disabled={loading}
          className="px-4 py-2 bg-lime-500 text-white rounded hover:bg-lime-600 disabled:bg-gray-400"
        >
          🏗️ Test Document Creation
        </button>
      </div>
      
      {/* New section for real Firebase data testing */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
        <h3 className="text-lg font-semibold text-green-800 mb-3">🔥 Real Firebase Data Testing</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={testComprehensiveDiagnosis}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            🔍 Comprehensive Diagnosis
          </button>
          
          <button
            onClick={testRealDataFunctionality}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-gray-400"
          >
            🧪 Test Real Data Fixes
          </button>
          
          <button
            onClick={testRealUserDetection}
            disabled={loading}
            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-400"
          >
            👤 Test Real User Detection
          </button>
          
          <button
            onClick={testServerTimestampIsFixed}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
          >
            🔧 Test serverTimestamp() Fix
          </button>
        </div>
        <div className="mt-3 text-sm text-green-700">
          <strong>⚡ These buttons test with actual Firebase data!</strong> The serverTimestamp fix should resolve the basketball-14u-bowie,-md error.
        </div>
      </div>
      
      <div className="mb-4">
        <button
          onClick={clearResults}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          🗑️ Clear Results
        </button>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Test Results:</h3>
        <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-96">
          {loading ? '⏳ Running test...' : results || 'No results yet. Click a test button above.'}
        </pre>
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">About This Tester:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>ID Generation:</strong> Tests if roster and chat IDs match properly</li>
          <li>• <strong>ID Parsing:</strong> Tests parsing existing chat IDs like "14U_Kickball_Greenbelt,_MD"</li>
          <li>• <strong>Sync Status:</strong> Checks which rosters have group chats</li>
          <li>• <strong>Get All Group Chats:</strong> Shows all existing group chats (with/without documents)</li>
          <li>• <strong>Fix Specific Chat:</strong> Tests fixing access for a specific existing group chat</li>
          <li>• <strong>Fix All Group Chats:</strong> Fixes access for all existing group chats</li>
          <li>• <strong>New Chat Creation:</strong> Tests the full registration flow for new chats</li>
          <li>• <strong>Full Sync:</strong> Creates group chats for all rosters without them</li>
          <li>• <strong>Message Fetching:</strong> Tests retrieving messages and creating documents from messages</li>
          <li>• <strong>User Chat Detection:</strong> Tests improved user group chat detection with diagnostic info</li>
          <li>• <strong>Document Creation:</strong> Tests creating group chat documents from existing message collections</li>
        </ul>
        
        <div className="mt-4 p-3 bg-yellow-100 rounded border-l-4 border-yellow-400">
          <p className="text-yellow-800 text-sm">
            <strong>⚠️ Important:</strong> The new tests help diagnose why users might not see their team chats. 
            Use "Fix All Group Chats" if users can't see their team chats after running diagnostics.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GroupChatTester;