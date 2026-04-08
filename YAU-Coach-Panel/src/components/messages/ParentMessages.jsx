// coach/components/messages/ParentMessages.jsx
import React, { useState } from 'react';
import { Search, Filter, Mail, Phone, MessageSquare, Clock, User } from 'lucide-react';

const ParentMessages = ({ coachData, rosters, messages }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState(null);

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const getTeamName = (rosterId) => {
    const roster = rosters.find(r => r.id === rosterId);
    return roster ? (roster.teamName || `${roster.ageGroup} ${roster.sport}`) : 'Unknown Team';
  };

  const filteredMessages = messages?.filter(message => {
    const matchesSearch = !searchTerm || 
      message.parentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.playerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.message?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'unread' && !message.read) ||
      (statusFilter === 'read' && message.read);
    
    return matchesSearch && matchesStatus;
  });

  const handleReplyToParent = (message) => {
    if (message.parentEmail) {
      const subject = `Re: ${message.playerName} - Team ${getTeamName(message.rosterId)}`;
      const body = `Hello,\n\nThank you for your message regarding ${message.playerName}.\n\nOriginal message: "${message.message}"\n\nBest regards,\nCoach ${coachData.firstName} ${coachData.lastName}`;
      window.location.href = `mailto:${message.parentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  const handleCallParent = (message) => {
    if (message.parentPhone) {
      window.location.href = `tel:${message.parentPhone}`;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Parent Messages</h3>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="relative">
            <Filter size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Messages</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
        </div>
      </div>

      {filteredMessages?.length > 0 ? (
        <div className="space-y-4">
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                message.read ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'
              }`}
              onClick={() => setSelectedMessage(selectedMessage === message.id ? null : message.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {message.parentName?.split(' ').map(n => n[0]).join('') || 'P'}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-800">
                        {message.parentName || 'Unknown Parent'}
                      </h4>
                      {!message.read && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <span className="flex items-center">
                        <User size={14} className="mr-1" />
                        Player: {message.playerName || 'Unknown'}
                      </span>
                      <span className="flex items-center">
                        <MessageSquare size={14} className="mr-1" />
                        Team: {getTeamName(message.rosterId)}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 text-sm">
                      {selectedMessage === message.id 
                        ? message.message 
                        : message.message?.substring(0, 100) + (message.message?.length > 100 ? '...' : '')
                      }
                    </p>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock size={12} className="mr-1" />
                        {formatMessageTime(message.timestamp)}
                      </div>
                      
                      {selectedMessage === message.id && (
                        <div className="flex space-x-2">
                          {message.parentEmail && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReplyToParent(message);
                              }}
                              className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                            >
                              <Mail size={14} />
                              <span>Reply</span>
                            </button>
                          )}
                          
                          {message.parentPhone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCallParent(message);
                              }}
                              className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm"
                            >
                              <Phone size={14} />
                              <span>Call</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {selectedMessage === message.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h5 className="font-medium text-gray-800 mb-2">Full Message:</h5>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
                      {message.message}
                    </p>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <strong>Parent:</strong> {message.parentName}
                    </div>
                    <div>
                      <strong>Player:</strong> {message.playerName}
                    </div>
                    {message.parentEmail && (
                      <div>
                        <strong>Email:</strong> {message.parentEmail}
                      </div>
                    )}
                    {message.parentPhone && (
                      <div>
                        <strong>Phone:</strong> {message.parentPhone}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            {filteredMessages?.length === 0 && messages?.length > 0 
              ? 'No Messages Found' 
              : 'No Parent Messages'}
          </h3>
          <p className="text-gray-500">
            {filteredMessages?.length === 0 && messages?.length > 0
              ? 'Try adjusting your search or filter criteria.'
              : 'Parent messages will appear here when families send you direct messages.'}
          </p>
        </div>
      )}

      {/* Statistics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{messages?.length}</div>
          <div className="text-sm text-blue-600">Total Messages</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {messages?.filter(m => m.read)?.length}
          </div>
          <div className="text-sm text-green-600">Read Messages</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {messages?.filter(m => !m.read)?.length}
          </div>
          <div className="text-sm text-orange-600">Unread Messages</div>
        </div>
      </div>
    </div>
  );
};

export default ParentMessages;