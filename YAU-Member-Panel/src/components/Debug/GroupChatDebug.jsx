import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import GroupChatService from '../../services/groupChatService';
import GroupChatMigrationService from '../../services/groupChatMigrationService';
import MemberGroupChatService from '../../services/memberGroupChatService';

const GroupChatDebug = () => {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    if (!user?.email || !user?.uid) {
      alert('No user logged in');
      return;
    }

    setLoading(true);
    const debug = {
      user: {
        email: user.email,
        uid: user.uid,
        firstName: user.firstName,
        lastName: user.lastName
      },
      groupChats: [],
      allChats: [],
      shouldHaveAccess: []
    };

    try {
      // 1. Get user's group chats
      console.log('🔍 Getting user group chats for:', user.email, user.uid);
      debug.groupChats = await GroupChatService.getUserGroupChats(user.email, user.uid);

      // 2. Get all group chats to see what exists
      debug.allChats = await GroupChatMigrationService.listAllGroupChats();

      // 3. For this specific member (Gabriel Leo), check what should exist
      const memberData = {
        uid: user.uid,
        firstName: user.firstName || 'gabriel',
        lastName: user.lastName || 'leo', 
        email: user.email,
        sport: 'SOCCER',
        location: 'Andrews AFB - Clinton'
      };

      const student = {
        firstName: 'user1',
        lastName: 'new',
        dob: '09-08-2012',
        ageGroup: '13U'
      };

      // Generate what the chat ID should be
      const expectedChatId = GroupChatService.generateChatId(
        student.ageGroup,
        memberData.sport,
        memberData.location
      );
      
      console.log('🎯 Expected Chat ID generation:', {
        input: { ageGroup: student.ageGroup, sport: memberData.sport, location: memberData.location },
        output: expectedChatId,
        shouldMatch: 'soccer-13u-andrews-afb---clinton'
      });

      debug.shouldHaveAccess.push({
        expectedChatId,
        expectedName: `${student.ageGroup} ${memberData.sport} - ${memberData.location}`,
        student: `${student.firstName} ${student.lastName}`,
        exists: debug.allChats.some(chat => chat.id === expectedChatId)
      });

      console.log('🎯 Debug Results:', debug);
      setDebugInfo(debug);

    } catch (error) {
      console.error('❌ Debug error:', error);
      setDebugInfo({
        ...debug,
        error: error.message
      });
    }

    setLoading(false);
  };

  const createMissingGroupChat = async () => {
    if (!debugInfo?.shouldHaveAccess?.[0]) return;

    setLoading(true);
    try {
      const memberData = {
        uid: user.uid,
        firstName: user.firstName || 'gabriel',
        lastName: user.lastName || 'leo',
        email: user.email,
        sport: 'SOCCER',
        location: 'Andrews AFB - Clinton'
      };

      const student = {
        firstName: 'user1',
        lastName: 'new',
        dob: '09-08-2012',
        ageGroup: '13U'
      };

      console.log('🚀 Creating group chat for:', memberData, student);
      const result = await GroupChatService.createOrEnsureGroupChat(memberData, student);
      
      console.log('✅ Group chat result:', result);
      
      // Refresh debug info
      await runDebug();
      
      alert(result.success ? 'Group chat created successfully!' : `Error: ${result.error}`);
    } catch (error) {
      console.error('❌ Error creating group chat:', error);
      alert(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  const createMissingForCurrentUser = async () => {
    if (!user?.email || !user?.uid) return;

    setLoading(true);
    try {
      console.log('🔄 Creating missing group chats for current user...');
      const result = await MemberGroupChatService.createMissingGroupChatsForMember(user.email, user.uid);
      
      console.log('✅ Missing group chats result:', result);
      
      // Refresh debug info
      await runDebug();
      
      if (result.success) {
        alert(`Group chats created successfully! Created: ${result.groupsCreated}, Total details: ${result.details.length}`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error creating missing group chats:', error);
      alert(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Group Chat Debug Tool</h1>
      
      <div className="mb-4">
        <button
          onClick={runDebug}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 mr-4"
        >
          {loading ? 'Loading...' : 'Run Debug'}
        </button>
        
        {debugInfo?.shouldHaveAccess?.[0] && !debugInfo.shouldHaveAccess[0].exists && (
          <button
            onClick={createMissingGroupChat}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 mr-4"
          >
            Create Missing Group Chat
          </button>
        )}
        
        <button
          onClick={createMissingForCurrentUser}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          Fix Missing Chats for Current User
        </button>
      </div>

      {debugInfo && (
        <div className="space-y-6">
          {/* User Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">👤 Current User</h3>
            <div className="text-sm space-y-1">
              <div><strong>Email:</strong> {debugInfo.user.email}</div>
              <div><strong>UID:</strong> {debugInfo.user.uid}</div>
              <div><strong>Name:</strong> {debugInfo.user.firstName} {debugInfo.user.lastName}</div>
            </div>
          </div>

          {/* Expected Access */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">🎯 Expected Group Access</h3>
            {debugInfo.shouldHaveAccess.map((access, index) => (
              <div key={index} className="text-sm space-y-1">
                <div><strong>Student:</strong> {access.student}</div>
                <div><strong>Expected Chat ID:</strong> <code className="bg-gray-200 px-1 rounded">{access.expectedChatId}</code></div>
                <div><strong>Expected Name:</strong> {access.expectedName}</div>
                <div><strong>Exists in Firebase:</strong> {access.exists ? '✅ Yes' : '❌ No'}</div>
              </div>
            ))}
          </div>

          {/* User's Group Chats */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">📱 User's Group Chats ({debugInfo.groupChats.length})</h3>
            {debugInfo.groupChats.length === 0 ? (
              <p className="text-red-600">❌ No group chats found for this user</p>
            ) : (
              <div className="space-y-2">
                {debugInfo.groupChats.map((chat, index) => (
                  <div key={index} className="bg-white border rounded p-2 text-sm">
                    <div><strong>ID:</strong> <code className="bg-gray-200 px-1 rounded">{chat.id}</code></div>
                    <div><strong>Name:</strong> {chat.name}</div>
                    <div><strong>Members:</strong> {chat.memberCount}</div>
                    <div><strong>Sport:</strong> {chat.sport} • <strong>Age:</strong> {chat.ageGroup} • <strong>Location:</strong> {chat.location}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All Group Chats */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">📋 All Group Chats ({debugInfo.allChats.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {debugInfo.allChats.map((chat, index) => (
                <div key={index} className={`border rounded p-2 text-sm ${
                  chat.isProperFormat ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div><strong>ID:</strong> <code className="bg-gray-200 px-1 rounded text-xs">{chat.id}</code></div>
                      <div><strong>Name:</strong> {chat.name}</div>
                      <div>{chat.sport} • {chat.ageGroup} • {chat.location}</div>
                    </div>
                    <div className="text-right">
                      <div>{chat.memberCount} members</div>
                      <div className={chat.isProperFormat ? 'text-green-600' : 'text-red-600'}>
                        {chat.isProperFormat ? '✅' : '❌'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Debug Error */}
          {debugInfo.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">❌ Error</h3>
              <p className="text-red-700">{debugInfo.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupChatDebug;