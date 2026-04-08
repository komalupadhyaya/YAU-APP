import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import NotificationService from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import RosterTeamChatService from '../../services/rosterTeamChatService';
import GroupInfoModal from '../Messages/GroupInfoModal';
import { onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import GroupChatService from '../../services/groupChatService';
import GroupChatTester from '../Debug/GroupChatTester';
import GroupChatFixer from '../Admin/GroupChatFixer';

// Memoized TeamCard component to prevent unnecessary re-renders
const TeamCard = React.memo(({ chat, unreadCount, onOpenChat, formatTimestamp }) => (
  <div
    className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition-shadow cursor-pointer"
    onClick={() => onOpenChat(chat)}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <span className="text-lg">{chat.userRole === 'coach' ? '🏆' : '👥'}</span>
        <h3 className="font-semibold text-gray-900">{chat.name}</h3>
      </div>
      <div className="flex items-center gap-2">
        {chat.userRole === 'coach' && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
            Coach
          </span>
        )}
        {unreadCount > 0 && (
          <div className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
            {unreadCount}
          </div>
        )}
      </div>
    </div>
    <div className="text-gray-700 text-sm mb-1">
      {chat.memberCount} member{chat.memberCount !== 1 ? 's' : ''}
      {chat.hasAssignedCoach && chat.coachName && (
        <span className="ml-2 text-gray-500">• Coach: {chat.coachName}</span>
      )}
    </div>
    <div className="text-gray-500 text-xs mb-2">
      {chat.sport} • {chat.ageGroup} • {chat.location}
    </div>
    <div className="text-gray-400 text-xs">
      {chat.lastActivity 
        ? `Last activity: ${formatTimestamp(chat.lastActivity)}`
        : 'No recent activity'
      }
    </div>
  </div>
));

// Memoized ChatMessage component
const ChatMessage = React.memo(({ message, isOwn, formatTimestamp }) => (
  <div className={`mb-3 ${isOwn ? 'text-right' : 'text-left'}`}>
    <div className={`inline-block max-w-xs px-3 py-2 rounded-lg ${
      isOwn 
        ? 'bg-blue-500 text-white' 
        : 'bg-gray-50 border border-gray-200'
    }`}>
      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
      <div className="text-xs mt-1 opacity-70">
        {!isOwn && (
          <span className="font-medium">
            {message.senderInfo 
              ? `${message.senderInfo.firstName} ${message.senderInfo.lastName}`.trim()
              : message.senderName || message.sender || 'Unknown'
            }
            {message.senderInfo?.role === 'coach' && (
              <span className="ml-1 text-xs bg-green-200 text-green-800 px-1 rounded">Coach</span>
            )}
            {' • '}
          </span>
        )}
        {formatTimestamp(message.timestamp)}
      </div>
    </div>
  </div>
));

export default function Messages() {
  const { user } = useAuth();
  const [adminMessages, setAdminMessages] = useState([]);
  const [userGroupChats, setUserGroupChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('team');
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [sending, setSending] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const currentChatListenerRef = useRef(null);

  // Memoized values
  const totalUnreadCount = useMemo(() => 
    Object.values(unreadCounts).reduce((sum, count) => sum + count, 0),
    [unreadCounts]
  );

  const unreadAdminCount = useMemo(() => 
    adminMessages.filter(m => !m.read).length,
    [adminMessages]
  );

  // Effect to scroll to latest message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Effect to focus input when chat is selected
  useEffect(() => {
    if (inputRef.current && selectedChat) {
      inputRef.current.focus();
    }
  }, [selectedChat]);

  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      if (currentChatListenerRef.current) {
        currentChatListenerRef.current();
      }
    };
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!user?.email || !user?.uid) {
      console.log('No user email or UID available for fetching messages');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get admin notifications
      const adminNotifications = await NotificationService.getAdminNotifications();
      console.log("adminNotifications",adminNotifications)
      const formattedAdminMessages = adminNotifications.data.map(notif => ({
        id: notif.id,
        sender: notif.authorName || 'YAU Administration',
        subject: notif.title,
        message: notif.description,
        timestamp: notif.timestamp,
        priority: notif.priority || 'normal',
        type: 'admin',
        read: notif.read || false,
        targetAgeGroup: notif.targetAgeGroup,
        targetLocation: notif.targetLocation,
        targetSport: notif.targetSport,
        imageUrl: notif.imageUrl,
      }));

      console.log('🔍 Fetching team chats for user:', { 
        email: user.email, 
        uid: user.uid, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        role: user.role 
      });
      
      // Try team-chat API first (for existing users), fallback to direct Firebase
      let groupChats = [];
      
      try {
        console.log('📱 Trying roster-based team chat API...');
        groupChats = await RosterTeamChatService.getUserTeamChats(user);
        console.log(`✅ Roster API returned ${groupChats.length} chats`);
        
        if (groupChats.length === 0) {
          throw new Error('No chats from API, trying Firebase direct');
        }
      } catch (apiError) {
        console.log('⚠️ Team chat API failed or returned no results, trying direct Firebase...');
        console.log('API Error:', apiError.message);
        
        try {
          const firebaseChats = await GroupChatService.getUserGroupChats(user.email, user.uid);
          groupChats = firebaseChats.map(chat => ({
            ...chat,
            userRole: 'member', // Add for compatibility
            rosterId: chat.id // Assume chat ID is roster ID
          }));
          console.log(`✅ Firebase direct returned ${groupChats.length} chats`);
        } catch (firebaseError) {
          console.error('❌ Both API and Firebase failed:', firebaseError);
          groupChats = [];
        }
      }
      
      console.log('📱 Final user group chats loaded:', {
        chatCount: groupChats.length,
        chats: groupChats.map(chat => ({
          id: chat.id,
          name: chat.name,
          memberCount: chat.memberCount,
          sport: chat.sport,
          ageGroup: chat.ageGroup,
          location: chat.location,
          userRole: chat.userRole || 'member'
        }))
      });

      if (groupChats.length === 0) {
        console.log('⚠️ No team chats found for user');
        console.log('⚠️ Debug: Check if user is in any rosters or group chats');
      }

      setUserGroupChats(groupChats);
      setAdminMessages(formattedAdminMessages);
      setupUnreadCountListeners(groupChats);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  }, [user?.email, user?.uid]);

  const setupUnreadCountListeners = useCallback((groupChats) => {
    if (!user?.uid) return;
    
    groupChats.forEach(chat => {
      const userDocRef = doc(db, 'members', user.uid);
      
      onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          const lastReadTimestamps = userData.lastReadTimestamps || {};
          const lastReadTimestamp = lastReadTimestamps[chat.id] 
            ? new Date(lastReadTimestamps[chat.id].seconds * 1000) 
            : new Date(0);

          const unsubscribe = GroupChatService.listenToChatMessages(chat.id, (messages) => {
            const unreadMessages = messages.filter(msg => 
              msg.timestamp > lastReadTimestamp && msg.uid !== user.uid
            );
            
            setUnreadCounts(prev => ({
              ...prev,
              [chat.id]: unreadMessages.length
            }));
          });

          return () => unsubscribe();
        }
      });
    });
  }, [user?.uid]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleMarkAsRead = useCallback(async (messageId) => {
    try {
      await NotificationService.markNotificationAsRead(messageId);
      setAdminMessages(prev =>
        prev.map(msg => (msg.id === messageId ? { ...msg, read: true } : msg))
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, []);

  const openGroupChat = useCallback(async (chat) => {
    setSelectedChat(chat);
    setMessageText('');
    
    try {
      console.log('🔍 Opening chat:', chat.id, 'for user:', user.uid);
      
      // Try API first (for existing roster-based chats), fallback to Firebase
      let messages = [];
      let unsubscribe = null;
      
      try {
        // If chat has roster info, try API approach first
        if (chat.userRole || chat.rosterId) {
          console.log('📱 Using roster-based API for messages...');
          messages = await RosterTeamChatService.getTeamChatMessagesWithUser(
            chat.id, 
            user.uid, 
            user.email, 
            50
          );
          
          // Set up API-based listener
          unsubscribe = RosterTeamChatService.listenToTeamChatMessages(chat.id, (newMessages) => {
            console.log(`📨 Real-time API messages update for ${chat.id}:`, newMessages.length, 'messages');
            setChatMessages(newMessages);
          });
          
          console.log(`✅ API returned ${messages.length} messages`);
        } else {
          throw new Error('No roster info, using Firebase direct');
        }
      } catch (apiError) {
        console.log('⚠️ API approach failed, using Firebase direct...');
        
        // Use direct Firebase approach with document creation if needed
        messages = await GroupChatService.getChatMessages(chat.id, 50, true);
        
        // Set up Firebase listener
        unsubscribe = GroupChatService.listenToChatMessages(chat.id, (newMessages) => {
          console.log(`📨 Real-time Firebase messages update for ${chat.id}:`, newMessages.length, 'messages');
          setChatMessages(newMessages);
        });
        
        console.log(`✅ Firebase returned ${messages.length} messages`);
      }
      
      console.log('📨 Final loaded messages:', messages.length);
      setChatMessages(messages);

      // Clean up previous listener
      if (currentChatListenerRef.current) {
        currentChatListenerRef.current();
      }

      currentChatListenerRef.current = unsubscribe;
    } catch (error) {
      console.error('Error opening chat:', error);
      setChatMessages([]);
    }

    try {
      const userDocRef = doc(db, 'members', user.uid);
      await updateDoc(userDocRef, {
        [`lastReadTimestamps.${chat.id}`]: serverTimestamp()
      });

      setUnreadCounts(prev => ({
        ...prev,
        [chat.id]: 0
      }));
    } catch (error) {
      console.error('Error updating last read timestamp:', error);
    }
  }, [user?.uid, user?.email]);

  const sendChatMessage = useCallback(async () => {
    if (!messageText.trim() || !selectedChat || sending) return;

    try {
      setSending(true);
      
      const senderInfo = {
        firstName: user.firstName || user.displayName?.split(' ')[0] || 'User',
        lastName: user.lastName || user.displayName?.split(' ')[1] || '',
        role: selectedChat.userRole || user.role || 'member'
      };

      const displayName = `${senderInfo.firstName} ${senderInfo.lastName}`.trim() || user.email;

      let result = { success: false };
      
      // Try API first (for roster-based chats), fallback to Firebase
      try {
        if (selectedChat.userRole || selectedChat.rosterId) {
          console.log('📱 Sending message via roster API...');
          result = await RosterTeamChatService.sendTeamChatMessage(
            selectedChat.id,
            messageText.trim(),
            user.uid,
            user.email,
            displayName,
            senderInfo
          );
          console.log('✅ API message send result:', result.success);
        } else {
          throw new Error('No roster info, using Firebase direct');
        }
      } catch (apiError) {
        console.log('⚠️ API send failed, trying Firebase direct...');
        
        result = await GroupChatService.sendMessage(
          selectedChat.id,
          messageText.trim(),
          user.uid,
          displayName,
          senderInfo
        );
        console.log('✅ Firebase message send result:', result.success);
      }

      if (result.success) {
        setMessageText('');
        console.log('✅ Message sent successfully');
      } else {
        console.error('Failed to send message:', result.error);
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  }, [messageText, selectedChat, sending, user]);

  // Handle input change - simplified
  const handleInputChange = useCallback((e) => {
    setMessageText(e.target.value);
  }, []);

  // Handle key press for sending messages
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  }, [sendChatMessage]);

  const formatTimestamp = useCallback((timestamp) => {
    try {
      let date;
      
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (timestamp && timestamp.toDate) {
        date = timestamp.toDate();
      } else if (timestamp && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }

      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }

      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
      }
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Unknown time';
    }
  }, []);

  const getPriorityColor = useCallback((priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getMessageTypeIcon = useCallback((type) => {
    switch (type) {
      case 'admin': return '📢';
      case 'team': return '👥';
      case 'announcement': return '📢';
      case 'event': return '🎉';
      case 'notification': return '📄';
      default: return '💬';
    }
  }, []);

  const handleCloseChat = useCallback(() => {
    if (currentChatListenerRef.current) {
      currentChatListenerRef.current();
      currentChatListenerRef.current = null;
    }
    setSelectedChat(null);
    setChatMessages([]);
    setMessageText('');
  }, []);


    // Toggle message expansion
  const toggleMessageExpansion = useCallback((messageId) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        // Auto-mark as read when expanding
        handleMarkAsRead(messageId);
      }
      return newSet;
    });
  }, [handleMarkAsRead]);

    // Check if message is expanded
  const isMessageExpanded = useCallback((messageId) => {
    return expandedMessages.has(messageId);
  }, [expandedMessages]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Chat interface component - now stable
  if (selectedChat) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-t-lg shadow">
            <h3 className="text-xl font-bold">{selectedChat.name}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowGroupInfoModal(true)}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                title="View group information"
              >
                <span>ℹ️</span>
                <span>Group Info</span>
              </button>
              <button
                onClick={handleCloseChat}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div
            ref={chatContainerRef}
            className="max-h-[calc(100vh-300px)] overflow-y-auto mb-4 p-4 bg-white shadow"
            style={{ minHeight: '400px' }}
          >
            {chatMessages.length > 0 ? (
              chatMessages.map(message => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isOwn={message.uid === user.uid}
                  formatTimestamp={formatTimestamp}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No messages yet. Start the conversation!</p>
              </div>
            )}
          </div>

          {/* Message input */}
          <div className="bg-white p-4 rounded-b-lg shadow">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={messageText}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={sending}
                autoComplete="off"
              />
              <button
                onClick={sendChatMessage}
                disabled={!messageText.trim() || sending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        <GroupInfoModal
          isOpen={showGroupInfoModal}
          onClose={() => setShowGroupInfoModal(false)}
          groupChat={selectedChat}
        />
      </div>
    );
  }

  console.log("adminMessages", adminMessages)

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('team')}
          className={`px-6 py-3 font-medium transition-colors ${activeTab === 'team'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Team Messages
          {totalUnreadCount > 0 && (
            <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1">
              {totalUnreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-6 py-3 font-medium transition-colors ${activeTab === 'admin'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Admin Notifications
          {unreadAdminCount > 0 && (
            <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1">
              {unreadAdminCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'team' && (
        <div>
          {userGroupChats.length > 0 ? (
            <div className="bg-blue-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-blue-900">Your Team Chats</h3>
                <span className="text-sm text-blue-700">
                  {userGroupChats.length} group{userGroupChats.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userGroupChats.map((chat) => (
                  <TeamCard 
                    key={chat.id} 
                    chat={chat} 
                    unreadCount={unreadCounts[chat.id] || 0}
                    onOpenChat={openGroupChat}
                    formatTimestamp={formatTimestamp}
                  />
                ))}
              </div>
              <div className="text-xs text-blue-600 mt-2">
                Click a team to open group chat
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">No team chats available</div>
              <div className="text-gray-400 text-sm">You'll see team group chats here once you're added to a team</div>
              
            
              <div className="mt-8 hidden">
                <div className="text-sm text-gray-600 mb-4">Need help? Try these diagnostic tools:</div>
                <div className="space-y-4">
                  <GroupChatFixer/>
                  <details className="bg-gray-50 rounded-lg p-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                      🔧 Advanced Diagnostic Tools
                    </summary>
                    <div className="mt-4">
                      <GroupChatTester/>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'admin' && (
        <div className="space-y-4">
          {adminMessages.map(message =>{


          const isExpanded = isMessageExpanded(message.id);
          const shouldTruncate = message.message.length > 150; // Adjust character limit as needed
           return (
            <div
              key={message.id}
              className={`bg-white rounded-2xl shadow p-6 hover:shadow-md transition-shadow ${!message.read ? 'ring-2 ring-blue-200' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getMessageTypeIcon('admin')}</span>
                    {/* <h3 className="font-semibold text-gray-900">{message.sender}</h3> */}
                    <h3 className="font-semibold text-gray-900">{message.sender}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(message.priority)}`}>
                   {message.priority.charAt(0).toUpperCase() + message.priority.slice(1)}
                  </span>
                  {!message.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
              
              <h4 className="text-lg font-medium text-gray-900 mb-2">{message.subject}</h4>
              {/* <p className="text-gray-700 mb-4 leading-relaxed line-clamp-2">{message.message}</p> */}

              {/* Expandable Message Content */}
              <div className="text-gray-700 mb-4 leading-relaxed">
                {isExpanded ? (
                  <p className="whitespace-pre-wrap">{message.message}</p>
                ) : (
                  <div>
                    <p className={shouldTruncate ? "line-clamp-3" : ""}>
                      {shouldTruncate 
                        ? `${message.message.substring(0, 150)}...` 
                        : message.message
                      }
                    </p>
                  </div>
                )}
              </div>

              {(message.targetAgeGroup !== 'all' || message.targetLocation !== 'all' || message.targetSport !== 'all') && (
                <div className="flex flex-wrap gap-1 mb-3">
                  <span className="text-xs text-gray-500 mr-2">Target:</span>
                  {message.targetAgeGroup !== 'all' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {message.targetAgeGroup}
                    </span>
                  )}
                  {message.targetLocation !== 'all' && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      {message.targetLocation}
                    </span>
                  )}
                  {message.targetSport !== 'all' && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                      {message.targetSport}
                    </span>
                  )}
                </div>
              )}

              {message.imageUrl && (
                <div className="mb-4">
                  <img
                    src={message.imageUrl}
                    alt="Message attachment"
                    className="max-w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}
              
              {/* <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{formatTimestamp(message.timestamp)}</span>
                <div className="flex gap-2">
                  {!message.read && (
                    <button
                      onClick={() => handleMarkAsRead(message.id)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Mark as Read
                    </button>
                  )}
                  <button className="text-blue-600 hover:text-blue-800 font-medium">
                    View
                  </button>
                </div>
              </div> */}


                        <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{formatTimestamp(message.timestamp)}</span>
            <div className="flex gap-2">
              
              {!message.read && !isExpanded && (
                <button
                  onClick={() => handleMarkAsRead(message.id)}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full p-1 px-2 font-medium"
                >
                  Mark as Read
                </button>
              )}
              {/* <button 
                onClick={() => toggleMessageExpansion(message.id)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {isExpanded ? 'Collapse' : 'View'}
              </button> */}
              {shouldTruncate && (
                <button
                  onClick={() => toggleMessageExpansion(message.id)}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full p-1 px-2 font-medium"
                >
                  {isExpanded ? 'View Less' : 'View More'}
                </button>
              )}
            </div>
            </div>
            </div>
          )
        })}

          {adminMessages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">No messages</div>
              <div className="text-gray-400 text-sm">No admin notifications at the moment</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}