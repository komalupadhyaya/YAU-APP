// coach/components/messages/GroupChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Users, Smile, Paperclip } from 'lucide-react';
import { useRealTimeMessages } from '../../hooks/useRealTimeMessages';
import { sendGroupMessage } from '../../firebase/coachFirestore';

const GroupChat = ({ roster, coachData, onBack }) => {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  
  const { messages, loading } = useRealTimeMessages(roster.id);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      
      await sendGroupMessage(roster.id, {
        text: newMessage.trim(),
        senderId: coachData.id,
        senderName: `Coach ${coachData.firstName}`,
        senderType: 'coach',
        senderInfo: {
          firstName: coachData.firstName,
          lastName: coachData.lastName,
          role: 'coach'
        }
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getMessageSenderInitials = (message) => {
    if (message.senderType === 'coach') {
      return `C${coachData.firstName?.[0] || ''}`;
    } else {
      return message.senderName?.split(' ').map(n => n[0]).join('') || 'P';
    }
  };

  const getMessageSenderColor = (message) => {
    if (message.senderType === 'coach') {
      return 'from-blue-500 to-blue-600';
    } else {
      return 'from-green-500 to-green-600';
    }
  };

  const isMyMessage = (message) => {
    return message.senderId === coachData.id || message.senderType === 'coach';
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
            {roster.sport?.[0] || 'T'}
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-800">
              {roster.teamName || `${roster.ageGroup} ${roster.sport}`}
            </h3>
            <p className="text-sm text-gray-500 flex items-center">
              <Users size={14} className="mr-1" />
              {roster.playerCount || 0} families
            </p>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          {loading ? 'Loading...' : `${messages.length} messages`}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length > 0 ? (
          <>
            {messages.map((message, index) => {
              const isMine = isMyMessage(message);
              const showSender = index === 0 || messages[index - 1].senderId !== message.senderId;
              
              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${isMine ? 'order-2' : 'order-1'}`}>
                    {showSender && (
                      <div className={`flex items-center space-x-2 mb-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {!isMine && (
                          <div className={`w-6 h-6 bg-gradient-to-r ${getMessageSenderColor(message)} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                            {getMessageSenderInitials(message)}
                          </div>
                        )}
                        <span className="text-xs text-gray-500">
                          {message.senderName || 'Unknown'}
                        </span>
                        {isMine && (
                          <div className={`w-6 h-6 bg-gradient-to-r ${getMessageSenderColor(message)} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                            {getMessageSenderInitials(message)}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isMine
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-gray-200 text-gray-800 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
                        {formatMessageTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users size={48} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">Start the Conversation</h3>
              <p className="text-gray-500">Be the first to send a message to your team!</p>
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message to the team..."
              className="w-full px-4 py-2 pr-20 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sending}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={sending}
              >
                <Smile size={18} />
              </button>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={sending}
              >
                <Paperclip size={18} />
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send size={18} />
            )}
          </button>
        </form>

        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>Messages are visible to all team families</span>
          <span className="text-blue-600">Coach {coachData.firstName}</span>
        </div>
      </div>
    </div>
  );
};

export default GroupChat;