// coach/components/messages/CoachMessages.jsx
import React, { useState } from 'react';
import { MessageSquare, Users, Send, Plus, Search, Filter } from 'lucide-react';
import GroupChat from './GroupChat';
import ParentMessages from './ParentMessages';
import MessageComposer from './MessageComposer';

const CoachMessages = ({ coachData, rosters, messages }) => {
  const [activeTab, setActiveTab] = useState('group'); // 'group', 'parent', 'compose'
  const [selectedRoster, setSelectedRoster] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showComposer, setShowComposer] = useState(false);

  // Get unread messages count
  const getUnreadCount = (type) => {
    return messages?.filter(msg => !msg.read && msg.type === type).length;
  };

  const tabs = [
    {
      id: 'group',
      label: 'Team Chats',
      icon: Users,
      badge: getUnreadCount('group'),
      description: 'Real-time chat with team families'
    },
    {
      id: 'parent',
      label: 'Parent Messages',
      icon: MessageSquare,
      badge: getUnreadCount('parent'),
      description: 'Direct messages from parents'
    },
    {
      id: 'compose',
      label: 'Send Message',
      icon: Send,
      badge: 0,
      description: 'Send message to team or individual parents'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Messages</h2>
        <button
          onClick={() => setShowComposer(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span>New Message</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  activeTab === tab.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Icon size={20} className={activeTab === tab.id ? 'text-blue-600' : 'text-gray-600'} />
                    <span className={`font-medium ${activeTab === tab.id ? 'text-blue-800' : 'text-gray-800'}`}>
                      {tab.label}
                    </span>
                  </div>
                  {tab.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <p className={`text-sm ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'}`}>
                  {tab.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-lg">
        {activeTab === 'group' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Team Group Chats</h3>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {selectedRoster ? (
              <GroupChat
                roster={selectedRoster}
                coachData={coachData}
                onBack={() => setSelectedRoster(null)}
              />
            ) : (
              <div className="space-y-4">
                {rosters
                  ?.filter(roster => 
                    !searchTerm || 
                    roster.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    roster.sport?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((roster) => (
                    <div
                      key={roster.id}
                      onClick={() => setSelectedRoster(roster)}
                      className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                    >
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                        {roster.sport?.[0] || 'T'}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">
                          {roster.teamName || `${roster.ageGroup} ${roster.sport}`}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {roster.playerCount || 0} families • {roster.location}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-sm text-blue-600 font-medium">Enter Chat</span>
                        {/* Add unread message indicator here if available */}
                      </div>
                    </div>
                  ))}

                {rosters.length === 0 && (
                  <div className="text-center py-12">
                    <Users size={48} className="mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No Teams Assigned</h3>
                    <p className="text-gray-500">You don't have any teams assigned yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'parent' && (
          <ParentMessages
            coachData={coachData}
            rosters={rosters}
            messages={messages?.filter(msg => msg.type === 'parent')}
          />
        )}

        {activeTab === 'compose' && (
          <div className="p-6">
            <MessageComposer
              coachData={coachData}
              teams={rosters}
              isOpen={true}
              onClose={() => setActiveTab('group')}
              onSent={() => setActiveTab('group')}
              embedded={true}
            />
          </div>
        )}
      </div>

      {/* Composer Modal */}
      {showComposer && (
        <MessageComposer
          coachData={coachData}
          teams={rosters}
          isOpen={showComposer}
          onClose={() => setShowComposer(false)}
          onSent={() => setShowComposer(false)}
        />
      )}
    </div>
  );
};

export default CoachMessages;