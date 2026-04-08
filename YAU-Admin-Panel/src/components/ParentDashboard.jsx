// components/ParentDashboard.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMessagesForGroup } from '../firebase/firestore';
import { Baby, MessageCircle, Calendar, MapPin, LogOut, User, Trophy, Phone, Mail } from 'lucide-react';

const ParentDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user && user.students && user.students.length > 0) {
      loadMessages();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      if (user.students && user.students.length > 0) {
        // Get messages for the first child's age group (you can modify this logic)
        const firstChild = user.students[0];
        const userMessages = await getMessagesForGroup(
          firstChild.ageGroup, 
          user.location, 
          user.sport
        );
        setMessages(userMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const messageDate = date instanceof Date ? date : new Date(date);
    const diffInSeconds = Math.floor((now - messageDate) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return messageDate.toLocaleDateString();
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

  const totalChildren = user?.children?.length || 0;
  const unreadMessages = messages.filter(msg => !msg.read).length;

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
              <p className="text-gray-600">Stay connected with your child's athletic journey</p>
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

        {/* Navigation Tabs */}
        <div className="flex space-x-4 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white text-primary-500 shadow-lg'
                : 'text-white hover:bg-white/20'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('children')}
            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
              activeTab === 'children'
                ? 'bg-white text-primary-500 shadow-lg'
                : 'text-white hover:bg-white/20'
            }`}
          >
            My Children ({totalChildren})
          </button>
          <button
            onClick={() => setActiveTab('id')}
            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
              activeTab === 'id'
                ? 'bg-white text-primary-500 shadow-lg'
                : 'text-white hover:bg-white/20'
            }`}
          >
            Digital ID
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
              activeTab === 'messages'
                ? 'bg-white text-primary-500 shadow-lg'
                : 'text-white hover:bg-white/20'
            }`}
          >
            Messages ({unreadMessages})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass rounded-2xl p-6 text-center">
                <Baby size={32} className="mx-auto mb-3 text-primary-500" />
                <div className="text-2xl font-bold text-gray-800 mb-1">{totalChildren}</div>
                <div className="text-gray-600">Registered Children</div>
              </div>
              <div className="glass rounded-2xl p-6 text-center">
                <MessageCircle size={32} className="mx-auto mb-3 text-orange-500" />
                <div className="text-2xl font-bold text-gray-800 mb-1">{unreadMessages}</div>
                <div className="text-gray-600">Unread Messages</div>
              </div>
              <div className="glass rounded-2xl p-6 text-center">
                <Trophy size={32} className="mx-auto mb-3 text-green-500" />
                <div className="text-2xl font-bold text-gray-800 mb-1">{user?.sport || 'N/A'}</div>
                <div className="text-gray-600">Sport</div>
              </div>
              <div className="glass rounded-2xl p-6 text-center">
                <MapPin size={32} className="mx-auto mb-3 text-blue-500" />
                <div className="text-2xl font-bold text-gray-800 mb-1">Active</div>
                <div className="text-gray-600">Status</div>
              </div>
            </div>

            {/* Parent Profile */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <User size={20} className="text-gray-400 mr-3" />
                    <span className="font-medium">{user?.firstName} {user?.lastName}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail size={20} className="text-gray-400 mr-3" />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone size={20} className="text-gray-400 mr-3" />
                    <span>{user?.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin size={20} className="text-gray-400 mr-3" />
                    <span>{user?.location}</span>
                  </div>
                </div>
                <div className="bg-primary-50 rounded-lg p-4">
                  <h4 className="font-medium text-primary-800 mb-2">Registration Info</h4>
                  <p className="text-primary-700">Sport: {user?.sport}</p>
                  <p className="text-primary-700">SMS Opt-in: {user?.smsOtpIn ? 'Yes' : 'No'}</p>
                  <p className="text-sm text-primary-600 mt-2">
                    Registered: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Children Quick View */}
            {user?.students && user.students.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Children</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user.students.map((child, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Baby size={20} className="text-blue-500 mr-2" />
                        <span className="font-medium text-gray-800">{child.name}</span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Age: {calculateAge(child.dob)} years</p>
                        <p>Age Group: <span className="font-medium text-primary-600">{child.ageGroup}</span></p>
                        <p>DOB: {child.dob ? new Date(child.dob).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'children' && (
          <div className="space-y-6">
            {user?.students && user.students.length > 0 ? (
              user.students.map((child, index) => (
                <div key={index} className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                    <Baby className="mr-2 text-blue-500" />
                    {child.name}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                        <p className="text-gray-800 font-medium">{child.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Date of Birth</label>
                        <p className="text-gray-800">{child.dob ? new Date(child.dob).toLocaleDateString() : 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Current Age</label>
                        <p className="text-gray-800 font-medium">{calculateAge(child.dob)} years old</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Age Group</label>
                        <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                          {child.ageGroup}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-800 mb-3">Team Information</h4>
                        <div className="space-y-2">
                          <p className="text-sm"><span className="font-medium">Sport:</span> {user?.sport}</p>
                          <p className="text-sm"><span className="font-medium">Location:</span> {user?.location}</p>
                          <p className="text-sm"><span className="font-medium">Age Group:</span> {child.ageGroup}</p>
                        </div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 mb-2">Registration Status</h4>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass rounded-2xl p-6 text-center">
                <Baby size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Children Registered</h3>
                <p className="text-gray-500">Contact support to add children to your account.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Messages from Coaches & Admins</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No messages yet</p>
                <p className="text-sm text-gray-500 mt-2">Messages from your child's coaches will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-800">{message.title}</h4>
                      <div className="flex items-center gap-2">
                        {!message.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                        <span className="text-sm text-gray-500">
                          {getTimeAgo(message.timestamp)}
                        </span>
                      </div>
                    </div>
                    {message.imageUrl && (
                      <div className="mb-3">
                        <img 
                          src={message.imageUrl} 
                          alt="Message" 
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <p className="text-gray-700 whitespace-pre-wrap">{message.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          message.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          message.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          message.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {message.priority || 'normal'}
                        </span>
                        {message.read ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                            Read
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;