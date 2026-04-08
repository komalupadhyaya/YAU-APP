// coach/components/schedule/CreatePractice.jsx
import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Users, Plus } from 'lucide-react';
import { createPracticeEvent } from '../../firebase/coachFirestore';

const CreatePractice = ({ coachData, teams, isOpen, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    teamId: '',
    date: '',
    time: '',
    duration: '90', // minutes
    location: '',
    field: '',
    notes: '',
    notifyParents: true
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
      if (!formData.teamId || !formData.date || !formData.time) {
        setError('Please fill in all required fields.');
        return;
      }

      const selectedTeam = teams.find(team => team.id === formData.teamId);
      if (!selectedTeam) {
        setError('Selected team not found.');
        return;
      }

      // Combine date and time
      const practiceDateTime = new Date(`${formData.date}T${formData.time}`);
      
      // Create practice event
      const practiceData = {
        title: `${selectedTeam.teamName || `${selectedTeam.ageGroup} ${selectedTeam.sport}`} Practice`,
        type: 'practice',
        eventType: 'practice',
        date: practiceDateTime.toISOString(),
        teamId: formData.teamId,
        teamName: selectedTeam.teamName || `${selectedTeam.ageGroup} ${selectedTeam.sport}`,
        coachId: coachData.id,
        coachName: `${coachData.firstName} ${coachData.lastName}`,
        location: formData.location,
        field: formData.field,
        duration: parseInt(formData.duration),
        notes: formData.notes,
        sport: selectedTeam.sport,
        ageGroup: selectedTeam.ageGroup,
        notifyParents: formData.notifyParents,
        status: 'scheduled'
      };

      await createPracticeEvent(practiceData);

      // TODO: Send notifications to parents if enabled
      if (formData.notifyParents) {
        console.log('TODO: Send practice notification to parents');
      }

      console.log('✅ Practice created successfully');
      onCreated();
    } catch (error) {
      console.error('Error creating practice:', error);
      setError('Failed to create practice. Please try again.');
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

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Plus className="mr-2 text-blue-600" size={24} />
            Create Practice
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users size={16} className="inline mr-1" />
              Select Team *
            </label>
            <select
              value={formData.teamId}
              onChange={(e) => handleInputChange('teamId', e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose a team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.teamName || `${team.ageGroup} ${team.sport}`} - {team.location}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-1" />
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                min={today}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock size={16} className="inline mr-1" />
                Time *
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes)
            </label>
            <select
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
              <option value="150">2.5 hours</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin size={16} className="inline mr-1" />
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="e.g., Central Park"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Field/Court */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Field/Court
            </label>
            <input
              type="text"
              value={formData.field}
              onChange={(e) => handleInputChange('field', e.target.value)}
              placeholder="e.g., Field 3, Court A"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional information for parents..."
              rows="3"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notify Parents */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="notifyParents"
              checked={formData.notifyParents}
              onChange={(e) => handleInputChange('notifyParents', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="notifyParents" className="ml-2 text-sm text-gray-700">
              Notify parents about this practice
            </label>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Practice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePractice;