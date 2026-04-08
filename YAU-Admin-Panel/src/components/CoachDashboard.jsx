// components/CoachDashboard.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getParents, getMessages, addMessage } from '../firebase/firestore';
import { Users, MessageCircle, Calendar, Trophy, LogOut, Send, Baby, MapPin, Phone, Mail } from 'lucide-react';

const CoachDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [rosters, setRosters] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const [newMessage, setNewMessage] = useState({
    title: '',
    description: '',
    targetAgeGroup: 'all',
    targetLocation: 'all',
    priority: 'normal'
  });

  useEffect(() => {
    if (user) {
      loadCoachData();
    }
  }, [user]);

  const loadCoachData = async () => {
    try {
      setLoading(true);
      const [parentsData, messagesData] = await Promise.all([
        getParents(),
        getMessages()
      ]);

      // Create rosters based on coach assignments
      const coachRosters = createCoachRosters(parentsData);
      setRosters(coachRosters);

      // Filter messages sent by this coach
      const coachMessages = messagesData.filter(msg => msg.authorId === user.uid);
      setMessages(coachMessages);

    } catch (error) {
      console.error('Error loading coach data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCoachRosters = (parents) => {
    if (!user?.assignedGroups || !user?.assignedLocations) {
      return [];
    }

    const rosterMap = new Map();

    // Group students based on coach's assignments
    parents.forEach(parent => {
      if (parent.students && parent.students.length > 0) {
        parent.students.forEach(child => {
          // Check if this child matches coach's assignments
          const matchesAgeGroup = user.assignedGroups.includes(child.ageGroup);
          const matchesLocation = user.assignedLocations.includes(parent.location);

          if (matchesAgeGroup && matchesLocation) {
            const rosterKey = `${child.ageGroup}-${parent.location}`;

            if (!rosterMap.has(rosterKey)) {
              rosterMap.set(rosterKey, {
                id: rosterKey,
                ageGroup: child.ageGroup,
                location: parent.location,
                sport: parent.sport,
                players: []
              });
            }

            const roster = rosterMap.get(rosterKey);
            roster.players.push({
              id: `${parent.id}-${child.firstName}`,
              firstName: child.firstName,
              lastName: child.lastName,
              dob: child.dob,
              ageGroup: child.ageGroup,
              age: calculateAge(child.dob),
              parent: {
                name: `${parent.firstName} ${parent.lastName}`,
                email: parent.email,
                phone: parent.phone,
                id: parent.id
              }
            });
          }
        });
      }
    });

    return Array.from(rosterMap.values()).map(roster => ({
      ...roster,
      playerCount: roster.players.length
    }));
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    try {
      await addMessage({
        ...newMessage,
        authorId: user.uid,
        authorName: `${user.firstName} ${user.lastName}`,
        read: false
      });

      setNewMessage({
        title: '',
        description: '',
        targetAgeGroup: 'all',
        targetLocation: 'all',
        priority: 'normal'
      });
      setShowMessageComposer(false);
      loadCoachData(); // Reload to show new message
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message: ' + error.message);
    }
  };

  const totalPlayers = rosters.reduce((sum, roster) => sum + roster.playerCount, 0);

  // Check if coach has assignments
  if (!user?.assignedGroups?.length && !user?.assignedLocations?.length) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} className="text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Welcome, {user?.firstName} {user?.lastName}!
          </h1>
          <p className="text-gray-600 mb-6">
            Your account is pending admin approval. You'll be notified once you're assigned to teams.
          </p>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center mx-auto"
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading your teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <div className="p-4 lg:p-8">
        {/* Header */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Welcome, {user?.firstName} {user?.lastName}!
              </h1>
              <p className="text-gray-600">Manage your teams and communicate with parents</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center"
            >
              <LogOut size={16} className="mr-2" />
              Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-2xl p-6 text-center">
            <Users size={32} className="mx-auto mb-3 text-primary-500" />
            <div className="text-2xl font-bold text-gray-800 mb-1">{totalPlayers}</div>
            <div className="text-gray-600">Total Players</div>
          </div>
          <div className="glass rounded-2xl p-6 text-center">
            <Trophy size={32} className="mx-auto mb-3 text-green-500" />
            <div className="text-2xl font-bold text-gray-800 mb-1">{rosters.length}</div>
            <div className="text-gray-600">Teams</div>
          </div>
          <div className="glass rounded-2xl p-6 text-center">
            <MessageCircle size={32} className="mx-auto mb-3 text-blue-500" />
            <div className="text-2xl font-bold text-gray-800 mb-1">{messages.length}</div>
            <div className="text-gray-600">Messages Sent</div>
          </div>
          <div className="glass rounded-2xl p-6 text-center">
            <Calendar size={32} className="mx-auto mb-3 text-orange-500" />
            <div className="text-2xl font-bold text-gray-800 mb-1">Active</div>
            <div className="text-gray-600">Status</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-4 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'overview'
                ? 'bg-white text-primary-500 shadow-lg'
                : 'text-white hover:bg-white/20'
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('rosters')}
            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'rosters'
                ? 'bg-white text-primary-500 shadow-lg'
                : 'text-white hover:bg-white/20'
              }`}
          >
            My Teams ({rosters.length})
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === 'messages'
                ? 'bg-white text-primary-500 shadow-lg'
                : 'text-white hover:bg-white/20'
              }`}
          >
            Messages
          </button>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Coach Profile */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Mail size={20} className="text-gray-400 mr-3" />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone size={20} className="text-gray-400 mr-3" />
                    <span>{user?.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar size={20} className="text-gray-400 mr-3" />
                    <span>Joined: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Assigned Age Groups</h4>
                    <div className="flex flex-wrap gap-2">
                      {user?.assignedGroups?.map((group) => (
                        <span key={group} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                          {group}
                        </span>
                      )) || <span className="text-gray-500">None assigned</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Assigned Locations</h4>
                    <div className="flex flex-wrap gap-2">
                      {user?.assignedLocations?.map((location) => (
                        <span key={location} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          {location}
                        </span>
                      )) || <span className="text-gray-500">None assigned</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Team Overview */}
            {rosters.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Team Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rosters.slice(0, 3).map((roster) => (
                    <div key={roster.id} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">
                        {roster.ageGroup} - {roster.location}
                      </h4>
                      <div className="text-sm text-gray-600">
                        <p>{roster.playerCount} Players</p>
                        <p>Sport: {roster.sport}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rosters' && (
          <div className="space-y-6">
            {rosters.length > 0 ? (
              rosters.map((roster) => (
                <div key={roster.id} className="glass rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {roster.ageGroup} {roster.sport} - {roster.location}
                    </h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {roster.playerCount} Players
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {roster.players.map((player, index) => (
                      <div key={player.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Baby size={16} className="text-blue-500 mr-2" />
                          <span className="font-medium text-gray-800">{player.name}</span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Age: {player.age} years</p>
                          <p>Parent: {player.parent.name}</p>
                          <p className="flex items-center">
                            <Phone size={12} className="mr-1" />
                            {player.parent.phone}
                          </p>
                          <p className="flex items-center">
                            <Mail size={12} className="mr-1" />
                            {player.parent.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="glass rounded-2xl p-6 text-center">
                <Users size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Teams Assigned</h3>
                <p className="text-gray-500">Contact your administrator to get assigned to teams.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Messages</h3>
                <button
                  onClick={() => setShowMessageComposer(!showMessageComposer)}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center"
                >
                  <Send size={16} className="mr-2" />
                  Send Message
                </button>
              </div>

              {/* Message Composer */}
              {showMessageComposer && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={newMessage.title}
                        onChange={(e) => setNewMessage({ ...newMessage, title: e.target.value })}
                        required
                        placeholder="Enter message subject"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={newMessage.description}
                        onChange={(e) => setNewMessage({ ...newMessage, description: e.target.value })}
                        required
                        rows="4"
                        placeholder="Enter your message"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age Group</label>
                        <select
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          value={newMessage.targetAgeGroup}
                          onChange={(e) => setNewMessage({ ...newMessage, targetAgeGroup: e.target.value })}
                        >
                          <option value="all">All Age Groups</option>
                          {user?.assignedGroups?.map(group => (
                            <option key={group} value={group}>{group}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <select
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          value={newMessage.targetLocation}
                          onChange={(e) => setNewMessage({ ...newMessage, targetLocation: e.target.value })}
                        >
                          <option value="all">All Locations</option>
                          {user?.assignedLocations?.map(location => (
                            <option key={location} value={location}>{location}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          value={newMessage.priority}
                          onChange={(e) => setNewMessage({ ...newMessage, priority: e.target.value })}
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowMessageComposer(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                      >
                        Send Message
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Messages List */}
              <div className="space-y-4">
                {messages.length > 0 ? (
                  messages.map((message) => (
                    <div key={message.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-800">{message.title}</h4>
                        <span className="text-sm text-gray-500">
                          {message.timestamp ? new Date(message.timestamp).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{message.description}</p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${message.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                              message.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                message.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                            }`}>
                            {message.priority || 'normal'}
                          </span>
                          <span className="text-gray-500">
                            Target: {message.targetAgeGroup !== 'all' ? message.targetAgeGroup : 'All'} / {message.targetLocation !== 'all' ? message.targetLocation : 'All'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No messages sent yet</p>
                    <p className="text-sm text-gray-500">Use the "Send Message" button to communicate with parents</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachDashboard;