import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import RosterFilteringService from '../../services/rosterFilteringService';
import { TeamMessagesService } from '../../services/apiService';

export default function ComposeMessage({ isOpen, onClose, onMessageSent }) {
  const { user } = useAuth();
  const [userTeams, setUserTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rosterId: '',
    message: '',
    priority: 'normal'
  });

  // Load user's teams when component opens
  useEffect(() => {
    const loadUserTeams = async () => {
      if (!isOpen || !user?.email || !user?.uid) return;
      
      try {
        const { teams } = await RosterFilteringService.getUserRosterIds(user.email, user.uid);
        setUserTeams(teams);
        
        // Auto-select first team if only one team
        if (teams.length === 1) {
          setFormData(prev => ({ ...prev, rosterId: teams[0].rosterId }));
        }
      } catch (error) {
        console.error('Error loading user teams:', error);
      }
    };

    loadUserTeams();
  }, [isOpen, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.rosterId || !formData.message.trim()) {
      alert('Please select a team and enter a message');
      return;
    }

    setLoading(true);
    
    try {
      const selectedTeam = userTeams.find(team => team.rosterId === formData.rosterId);
      
      const messageData = {
        rosterId: formData.rosterId,
        rosterName: selectedTeam?.teamName,
        text: formData.message.trim(),
        senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split('@')[0],
        uid: user.uid,
        timestamp: new Date().toISOString(),
        priority: formData.priority,
        read: false
      };

      console.log('📤 Sending team message:', messageData);

      await TeamMessagesService.create(messageData);
      
      console.log('✅ Message sent successfully');
      
      // Reset form
      setFormData({
        rosterId: userTeams.length === 1 ? userTeams[0].rosterId : '',
        message: '',
        priority: 'normal'
      });
      
      // Notify parent component
      if (onMessageSent) {
        onMessageSent();
      }
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Compose Team Message</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {userTeams.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">📝</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Teams Found</h3>
            <p className="text-gray-600 text-sm">
              You don't have any team registrations. Contact admin to register for teams.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Team Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Team *
              </label>
              <select
                value={formData.rosterId}
                onChange={(e) => handleChange('rosterId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Choose a team...</option>
                {userTeams.map(team => (
                  <option key={team.rosterId} value={team.rosterId}>
                    {team.teamName} - {team.student}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                You can only post to teams where your children are registered
              </p>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low Priority</option>
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                placeholder="Enter your message to the team..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-none"
                required
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  Message will be visible to all team members and coaches
                </p>
                <span className="text-xs text-gray-400">
                  {formData.message.length}/500
                </span>
              </div>
            </div>

            {/* Selected Team Info */}
            {formData.rosterId && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Sending to:</h4>
                {(() => {
                  const selectedTeam = userTeams.find(team => team.rosterId === formData.rosterId);
                  return selectedTeam ? (
                    <div>
                      <div className="text-blue-800 font-medium">{selectedTeam.teamName}</div>
                      <div className="text-blue-600 text-sm">
                        {selectedTeam.ageGroup} • {selectedTeam.sport} • {selectedTeam.location}
                      </div>
                      <div className="text-blue-600 text-sm">
                        Student: {selectedTeam.student}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !formData.rosterId || !formData.message.trim()}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}