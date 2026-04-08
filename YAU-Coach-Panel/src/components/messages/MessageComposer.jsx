// coach/components/messages/MessageComposer.jsx
import React, { useState } from 'react';
import { X, Send, Users, Mail, MessageSquare } from 'lucide-react';
import { sendTeamMessage } from '../../firebase/coachFirestore';
import { sendBulkTeamMessage } from '../../services/coachAPI';

const MessageComposer = ({ coachData, teams, isOpen, onClose, onSent, embedded = false }) => {
  const [formData, setFormData] = useState({
    recipients: 'team', // 'team', 'all', 'custom'
    teamId: '',
    subject: '',
    message: '',
    sendMethod: 'both' // 'email', 'sms', 'both'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError('');

      // Validate required fields
      if (!formData.message.trim()) {
        setError('Please enter a message.');
        return;
      }

      if (formData.recipients === 'team' && !formData.teamId) {
        setError('Please select a team.');
        return;
      }

      let messageData;

      if (formData.recipients === 'team') {
        const selectedTeam = teams.find(team => team.id === formData.teamId);
        if (!selectedTeam) {
          setError('Selected team not found.');
          return;
        }

        messageData = {
          message: formData.message,
          subject: formData.subject || `Message from Coach ${coachData.firstName}`,
          rosterId: formData.teamId,
          rosterName: selectedTeam.teamName || `${selectedTeam.ageGroup} ${selectedTeam.sport}`,
          coachId: coachData.id,
          coachName: `${coachData.firstName} ${coachData.lastName}`,
          sendMethod: formData.sendMethod,
          recipients: 'team',
          teamInfo: {
            sport: selectedTeam.sport,
            ageGroup: selectedTeam.ageGroup,
            location: selectedTeam.location
          }
        };
      } else {
        messageData = {
          message: formData.message,
          subject: formData.subject || `Message from Coach ${coachData.firstName}`,
          coachId: coachData.id,
          coachName: `${coachData.firstName} ${coachData.lastName}`,
          sendMethod: formData.sendMethod,
          recipients: formData.recipients,
          teams: teams.map(team => team.id)
        };
      }

      // Send message
      if (formData.recipients === 'team') {
        await sendTeamMessage(messageData);
      } else {
        await sendBulkTeamMessage(messageData);
      }

      console.log('✅ Message sent successfully');
      
      // Reset form
      setFormData({
        recipients: 'team',
        teamId: '',
        subject: '',
        message: '',
        sendMethod: 'both'
      });
      
      onSent?.();
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getRecipientCount = () => {
    if (formData.recipients === 'team' && formData.teamId) {
      const selectedTeam = teams.find(team => team.id === formData.teamId);
      return selectedTeam?.playerCount || 0;
    } else if (formData.recipients === 'all') {
      return teams.reduce((total, team) => total + (team.playerCount || 0), 0);
    }
    return 0;
  };

  const ComposeForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Recipients Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <Users size={16} className="inline mr-1" />
          Send To
        </label>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="radio"
              name="recipients"
              value="team"
              checked={formData.recipients === 'team'}
              onChange={(e) => handleInputChange('recipients', e.target.value)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">Specific Team</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="radio"
              name="recipients"
              value="all"
              checked={formData.recipients === 'all'}
              onChange={(e) => handleInputChange('recipients', e.target.value)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">All My Teams</span>
          </label>
        </div>
      </div>

      {/* Team Selection */}
      {formData.recipients === 'team' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Team
          </label>
          <select
            value={formData.teamId}
            onChange={(e) => handleInputChange('teamId', e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={formData.recipients === 'team'}
          >
            <option value="">Choose a team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.teamName || `${team.ageGroup} ${team.sport}`} - {team.location} ({team.playerCount || 0} families)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Recipient Count */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-700">
            📧 This message will be sent to {getRecipientCount()} families
          </span>
          <span className="text-xs text-blue-600">
            {formData.sendMethod === 'both' ? 'Email & SMS' : 
             formData.sendMethod === 'email' ? 'Email only' : 'SMS only'}
          </span>
        </div>
      </div>

      {/* Send Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Delivery Method
        </label>
        <select
          value={formData.sendMethod}
          onChange={(e) => handleInputChange('sendMethod', e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="both">Email & SMS</option>
          <option value="email">Email Only</option>
          <option value="sms">SMS Only</option>
        </select>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subject (for emails)
        </label>
        <input
          type="text"
          value={formData.subject}
          onChange={(e) => handleInputChange('subject', e.target.value)}
          placeholder={`Message from Coach ${coachData.firstName}`}
          className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MessageSquare size={16} className="inline mr-1" />
          Message *
        </label>
        <textarea
          value={formData.message}
          onChange={(e) => handleInputChange('message', e.target.value)}
          placeholder="Type your message to the team..."
          rows="6"
          className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">
            Keep messages clear and concise for better parent engagement
          </span>
          <span className="text-xs text-gray-500">
            {formData.message.length} characters
          </span>
        </div>
      </div>

      {/* Signature Preview */}
      {formData.message && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Message Preview:</h4>
          <div className="text-sm text-gray-600">
            <p className="whitespace-pre-wrap">{formData.message}</p>
            <div className="mt-3 pt-3 border-t border-gray-300 text-xs text-gray-500">
              Best regards,<br />
              Coach {coachData.firstName} {coachData.lastName}
              {coachData.phone && <><br />📞 {coachData.phone}</>}
              {coachData.email && <><br />📧 {coachData.email}</>}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-3 pt-4 border-t border-gray-200">
        {!embedded && (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          disabled={loading || getRecipientCount() === 0}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending...
            </>
          ) : (
            <>
              <Send size={16} className="mr-2" />
              Send Message
            </>
          )}
        </button>
      </div>
    </form>
  );

  if (embedded) {
    return <ComposeForm />;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Send className="mr-2 text-blue-600" size={24} />
            Send Message to Team
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <ComposeForm />
        </div>
      </div>
    </div>
  );
};

export default MessageComposer;