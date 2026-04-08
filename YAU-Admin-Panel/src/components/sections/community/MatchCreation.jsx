import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  FileText, 
  Plus,
  Search,
  Users,
  Trophy,
  Building,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Save,
  ArrowLeft,
  X,

} from 'lucide-react';
import { getAllOrganizations, createMatch, getAllMatches, updateMatch, deleteMatch, deleteMultipleMatches } from '../../../../src/firebase/apis/api-organizations';
import { useNavigate } from 'react-router-dom';
import TeamSelector from './MatchTeamCreation';


import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TextField ,Chip, Stack, Tooltip } from "@mui/material";
import dayjs from "dayjs";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";




const MatchCreation = () => {
  // State management
  const [organizations, setOrganizations] = useState([]);
  const [team1, setTeam1] = useState(null);
  const [team2, setTeam2] = useState(null);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState([]);
  const [sport, setSport] = useState('');
  const navigate = useNavigate();
  
  // Form state
  const [matchData, setMatchData] = useState({
    date: '',
    hours: '',
    minutes: '',
    ampm: 'AM',
    location: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Search states for organization selection
  const [team1Search, setTeam1Search] = useState('');
  const [team2Search, setTeam2Search] = useState('');
  const [showTeam1Results, setShowTeam1Results] = useState(false);
  const [showTeam2Results, setShowTeam2Results] = useState(false);

  // Load organizations and matches on component mount
  useEffect(() => {
    loadOrganizations();
    loadMatches();
  }, []);

  // Filter organizations based on search
  const filterOrganizations = (searchTerm) => {
    if (!searchTerm) return organizations;
    return organizations.filter(org =>
      org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // API Functions
  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const orgsData = await getAllOrganizations();
      setOrganizations(orgsData);
    } catch (error) {
      console.error('Error loading organizations:', error);
      alert('Error loading organizations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    try {
      setLoading(true);
      const response = await getAllMatches();
      const data = response;
      console.log("printing data", data);
      if (data.success) {
        setMatches(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to load matches');
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      alert('Error loading matches: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Convert AM/PM time to 24-hour format
  const convertTo24Hour = (timeStr) => {
    if (!timeStr) return '00:00';
    
    let [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
      hours = '00';
    }
    
    if (modifier === 'PM') {
      hours = parseInt(hours, 10) + 12;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

const handleCreateMatch = async () => {
  // Check for required fields
  if (!team1 || !team2 || !matchData.date || !matchData.time || !matchData.location) {
    alert('Please fill in all required fields');
    return;
  }

  // Combine date and time safely
  const datePart = matchData.date; // "2025-10-25"
  const timePart = matchData.time; // "03:15 PM"

  // Convert 12-hour format to 24-hour for comparison
  const [time, modifier] = timePart.split(" ");
  let [hours, minutes] = time.split(":");
  if (modifier === "PM" && hours !== "12") hours = String(Number(hours) + 12);
  if (modifier === "AM" && hours === "12") hours = "00";
  const time24Hour = `${hours.padStart(2, "0")}:${minutes}`;

  // Create combined datetime
  const selectedDateTime = new Date(`${datePart}T${time24Hour}`);
  const now = new Date();

  if (selectedDateTime < now) {
    alert('Cannot create matches in the past. Please select a future date and time.');
    return;
  }

  try {
    setLoading(true);

    const formattedDate = selectedDateTime.toISOString();

    const matchPayload = {
      team1: {
        orgId: team1.id,
        orgName: team1.name,
        city: team1.city,
        sport: sport,
        ageGroup: selectedAgeGroups,
      },
      team2: {
        orgId: team2.id,
        orgName: team2.name,
        city: team2.city,
        sport: sport,
        ageGroup: selectedAgeGroups,
      },
      date: formattedDate,
      location: matchData.location,
      notes: matchData.notes,
      status: "upcoming",
    };

    const response = await createMatch(matchPayload);

    if (response.success) {
      alert('Match created successfully!');
      resetForm();
      setShowCreateForm(false);
      loadMatches();
    } else {
      throw new Error('Failed to create match');
    }
  } catch (error) {
    console.error('Error creating match:', error);
    alert('Error creating match: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  const handleUpdateMatch = async () => {
    if (!editingMatch) return;

    // Check for past date
    const selectedDateTime = new Date(`${editingMatch.date}T${editingMatch.time}`);
    const now = new Date();
    
    if (selectedDateTime < now) {
      alert('Cannot update matches to past dates. Please select a future date and time.');
      return;
    }

    try {
      setLoading(true);
      const response = await updateMatch(editingMatch.id, editingMatch);

      if (response.success) {
        alert('Match updated successfully!');
        setEditingMatch(null);
        loadMatches();
      } else {
        throw new Error('Failed to update match');
      }
    } catch (error) {
      console.error('Error updating match:', error);
      alert('Error updating match: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteMatches = async () => {
    if (selectedMatches.length === 0) {
      alert('Please select matches to delete');
      return;
    }

    try {
      setLoading(true);
      const response = await deleteMultipleMatches(selectedMatches);
      const data = response;

      if (data.success) {
        alert(`Successfully deleted ${selectedMatches.length} match(es)`);
        setSelectedMatches([]);
        setShowBulkDeleteConfirm(false);
        loadMatches();
      } else {
        throw new Error(data.error || 'Failed to delete matches');
      }
    } catch (error) {
      console.error('Error deleting matches:', error);
      alert('Error deleting matches: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMatchSelection = (matchId) => {
    setSelectedMatches(prev => 
      prev.includes(matchId)
        ? prev.filter(id => id !== matchId)
        : [...prev, matchId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMatches.length === matches.length) {
      setSelectedMatches([]);
    } else {
      setSelectedMatches(matches.map(match => match.id));
    }
  };

  const handleDeleteMatch = async (matchId) => {
    try {
      setLoading(true);
      const response = await deleteMatch(matchId);

      if (response.success) {
        alert('Match deleted successfully!');
        setDeleteConfirm(null);
        loadMatches();
      } else {
        throw new Error('Failed to delete match');
      }
    } catch (error) {
      console.error('Error deleting match:', error);
      alert('Error deleting match: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (match) => {
    // Extract time components from existing time
    const matchTime = match.time || new Date(match.date).toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    });
    
    let hours = '';
    let minutes = '';
    let ampm = '';
    
    if (matchTime) {
      const timeParts = matchTime.split(' ');
      if (timeParts.length === 2) {
        ampm = timeParts[1];
        const [time] = timeParts[0].split(':');
        hours = time;
        minutes = matchTime.split(':')[1]?.split(' ')[0] || '00';
      }
    }

    setEditingMatch({
      ...match,
      date: match.date.split('T')[0],
      hours,
      minutes,
      ampm
    });
  };

  const cancelEditing = () => {
    setEditingMatch(null);
  };

  const resetForm = () => {
    setTeam1(null);
    setTeam2(null);
    setSelectedAgeGroups([]);
    setSport('');
    setTeam1Search('');
    setTeam2Search('');
    setMatchData({
      date: '',
      hours: '',
      minutes: '',
      ampm: 'AM',
      location: '',
      notes: ''
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Age groups options
  const ageGroups = [
    'Kindergarden', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade',
    '5th Grade', '6th Grade', '7th Grade', '8th Grade',
    '3U', '4U', '5U', '6U', '7U', '8U', '9U', '10U', '11U', '12U', '13U', '14U'
  ];

  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Match Management</h1>
              <p className="text-gray-600 mt-2">View all matches and schedule new games</p>
            </div>

            <div className='flex flex-col sm:flex-row gap-2 sm:gap-3'>
                          <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-3 sm:px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2 flex-1 sm:flex-none"
            >
              {showCreateForm ? <EyeOff size={20} /> : <Plus size={20} />}
                <span className="hidden xs:inline">
              {showCreateForm ? 'View Matches' : 'Create New Match'}
                </span>
                <span className="xs:hidden">
                  {showCreateForm ? 'View' : 'Create'}
                </span>
              </button>

            <button
              onClick={() => navigate('/admin/external_schedules')}
              className="px-4 py-3 sm:px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2 flex-1 sm:flex-none"
            >
              <ArrowLeft size={20} /> 
                <span className="hidden xs:inline">Team Management</span>
                <span className="xs:hidden">Teams</span>
              </button>
            </div>
          </div>
        </div>

        {/* All Matches View */}
        {!showCreateForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar size={24} className="text-blue-600" />
                All Matches ({matches.length})
              </h2>
              
              {selectedMatches.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {selectedMatches.length} match(es) selected
                  </span>
                  <button
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete Selected
                  </button>
                  <button
                    onClick={() => setSelectedMatches([])}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading matches...</p>
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar size={48} className="mx-auto mb-3 text-gray-300" />
                <p>No matches scheduled yet</p>
                <p className="text-sm mt-1">Create your first match to get started</p>
              </div>
            ) : (
              <>
                {/* Select All Checkbox */}
                {matches.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                      <input
                        type="checkbox"
                        checked={selectedMatches.length === matches.length && matches.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      Select All Matches
                    </label>
                  </div>
                )}

                {/* matched mapping */}

                {console.log("matcheeeeeeeeeees", matches)}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
  {matches.map((match) => {
    // Combine age groups from both teams, unique
    const ageGroups = Array.from(
      new Set([
        ...(Array.isArray(match.team1?.ageGroup) ? match.team1.ageGroup : []),
        ...(Array.isArray(match.team2?.ageGroup) ? match.team2.ageGroup : []),
      ])
    );

    const isPast = new Date(match.date) < new Date();

    return (
      <div
        key={match.id}
        className={`relative rounded-xl p-5 transition-all overflow-hidden
          ${selectedMatches.includes(match.id) ? 'ring-2 ring-blue-400' : ''}
          bg-gradient-to-br from-white via-blue-50 to-blue-100 hover:scale-105 hover:shadow-lg`}
      >
        {/* Top-left checkbox */}
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            checked={selectedMatches.includes(match.id)}
            onChange={() => toggleMatchSelection(match.id)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Top-right actions */}
        <div className="absolute top-3 right-3 flex gap-2 z-10">
          <button
            onClick={() => startEditing(match)}
            disabled={isPast}
            className={`p-1 rounded transition-colors
              ${isPast ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-300 text-blue-800 hover:bg-blue-400'}`}
            title={isPast ? "Cannot edit past matches" : "Edit Match"}
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleteConfirm(match.id)}
            className="p-1 rounded bg-red-300 text-red-800 hover:bg-red-400 transition-colors"
            title="Delete Match"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Teams Row */}
        <div className="flex justify-between items-center mb-3 pt-5">
          <div className="text-center flex-1">
            <p className="font-bold text-gray-800">{match.team1?.orgName}</p>
            <p className="text-gray-500 text-xs">{match.team1?.city}</p>
          </div>
          <span className="mx-1 font-bold text-white px-3 py-1 rounded-full bg-gradient-to-r from-red-400 to-pink-400 text-sm">
            VS
          </span>
          <div className="text-center flex-1">
            <p className="font-bold text-gray-800">{match.team2?.orgName}</p>
            <p className="text-gray-500 text-xs">{match.team2?.city}</p>
          </div>
        </div>

        {/* Age Group Chips */}
        <div className="flex flex-wrap gap-1 mb-3">
          {ageGroups.map((ag) => (
            <span
              key={ag}
              className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-200 via-pink-200 to-red-200 text-gray-800"
            >
              {ag}
            </span>
          ))}
        </div>

        {/* Sport */}
        {match.sport || match.team1?.sport ? (
          <p className="text-xs font-medium text-gray-700 mb-3">{match.sport || match.team1?.sport}</p>
        ) : null}

        {/* Match Details */}
        <div className="flex flex-wrap gap-2 text-xs text-gray-700 mb-2">
          <span className="px-2 py-0.5 bg-gradient-to-r from-green-100 to-green-200 rounded-full">{formatDate(match.date)}</span>
          <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-full">{match.time || formatTime(match.date)}</span>
          <span className="px-2 py-0.5 bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-full">{match.location}</span>
        </div>

        {/* Notes */}
        {match.notes && (
          <p className="text-xs text-gray-600 italic mb-2 px-2 py-1 bg-gray-100 rounded">{match.notes}</p>
        )}

        {/* Status Badge */}
        <span
          className={`absolute top-3 right-20 px-2 py-0.5 rounded-full text-xs font-medium
            ${isPast || match.status === 'completed'
              ? 'bg-gray-300 text-gray-700'
              : match.status === 'upcoming'
              ? 'bg-green-200 text-green-800'
              : 'bg-blue-200 text-blue-800'}
          `}
        >
          {isPast ? 'completed' : match.status}
        </span>

        {/* Created Date */}
        <p className="text-xs text-gray-400 mt-2">Created: {new Date(match.createdAt).toLocaleDateString()}</p>
      </div>
    );
  })}
</div>


              </>
            )}
          </div>
        )}

        {/* Edit Match Modal */}
        {editingMatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Edit size={24} className="text-blue-600" />
                    Edit Match
                  </h2>
                  <button
                    onClick={cancelEditing}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Match Teams Display */}
                <div className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-lg p-6 mb-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <h3 className="font-bold text-gray-800 text-lg">{editingMatch.team1?.orgName}</h3>
                      <p className="text-sm text-gray-600">{editingMatch.team1?.city}</p>
                    </div>
                    <span className="mx-4 text-red-600 font-bold text-lg">VS</span>
                    <div className="text-center flex-1">
                      <h3 className="font-bold text-gray-800 text-lg">{editingMatch.team2?.orgName}</h3>
                      <p className="text-sm text-gray-600">{editingMatch.team2?.city}</p>
                    </div>
                  </div>
                  <div className="text-center mt-3">
                    <p className="text-sm text-gray-600">
                      {[editingMatch.team1?.sport, editingMatch.team1?.ageGroup].filter(Boolean).join(' • ')}
                    </p>

                  </div>
                </div>

                {/* Edit Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Date Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      Date *
                    </label>
                    <input
                      type="date"
                      value={editingMatch.date}
                      onChange={(e) => setEditingMatch({ ...editingMatch, date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                      required
                    />
                  </div>

                  {/* Time Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Clock size={16} className="text-gray-400" />
                      Time (US Time Zone) *
                    </label>
                    <div className="flex gap-2">
                      {/* Hours Dropdown */}
                      <select
                        value={editingMatch.hours || ''}
                        onChange={(e) => setEditingMatch({ ...editingMatch, hours: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Hour</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
                          <option key={hour} value={hour}>
                            {hour}
                          </option>
                        ))}
                      </select>
                      
                      {/* Minutes Dropdown */}
                      <select
                        value={editingMatch.minutes || ''}
                        onChange={(e) => setEditingMatch({ ...editingMatch, minutes: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Min</option>
                        <option value="00">00</option>
                        <option value="15">15</option>
                        <option value="30">30</option>
                        <option value="45">45</option>
                      </select>
                      
                      {/* AM/PM Dropdown */}
                      <select
                        value={editingMatch.ampm || ''}
                        onChange={(e) => setEditingMatch({ ...editingMatch, ampm: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      Location *
                    </label>
                    <input
                      type="text"
                      value={editingMatch.location}
                      onChange={(e) => setEditingMatch({ ...editingMatch, location: e.target.value })}
                      placeholder="Enter match location"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      Notes
                    </label>
                    <textarea
                      value={editingMatch.notes || ''}
                      onChange={(e) => setEditingMatch({ ...editingMatch, notes: e.target.value })}
                      placeholder="Additional notes for the match..."
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={editingMatch.status}
                      onChange={(e) => setEditingMatch({ ...editingMatch, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={cancelEditing}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateMatch}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Update Match
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirmation Modal */}
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 size={24} className="text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Delete Multiple Matches</h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete <strong>{selectedMatches.length}</strong> selected match(es)? 
                This action cannot be undone.
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-red-800">
                  ⚠️ This will permanently delete all selected matches from the system.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDeleteMatches}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete {selectedMatches.length} Match(es)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 size={24} className="text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Delete Match</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this match? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteMatch(deleteConfirm)}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete Match
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Match Form */}
        {showCreateForm && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Create New Match</h2>
              <p className="text-gray-600 mt-2">Schedule matches between youth sports organizations</p>
            </div>

            {/* Teams Selection */}
      <TeamSelector
        organizations={organizations}
        team1={team1}
        setTeam1={setTeam1}
        team2={team2}
        setTeam2={setTeam2}
      />

            {/* Age Groups & Sport */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Age Groups - Multi Select */}
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
    <Users size={20} className="text-purple-600" />
    Age Groups / Grades
    <span className="ml-2 bg-purple-100 text-purple-800 text-sm px-2 py-1 rounded-full">
      {selectedAgeGroups.length} selected
    </span>
  </h2>

  {/* Grades Section */}
  <div className="mb-4">
    <h3 className="text-sm font-medium text-gray-600 mb-2">Grades</h3>
    <div className="flex flex-wrap gap-2">
      {ageGroups
        .filter(item => item.includes("Grade") || item === "Kindergarden")
        .map(ageGroup => (
          <button
            key={ageGroup}
            onClick={() => {
              setSelectedAgeGroups(prev =>
                prev.includes(ageGroup)
                  ? prev.filter(ag => ag !== ageGroup)
                  : [...prev, ageGroup]
              );
            }}
            className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
              selectedAgeGroups.includes(ageGroup)
                ? "border-purple-500 bg-purple-100 text-purple-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            {ageGroup}
            {selectedAgeGroups.includes(ageGroup) && (
              <span className="ml-1 text-purple-600">✓</span>
            )}
          </button>
        ))}
    </div>
  </div>

  {/* U Groups Section */}
  <div>
    <h3 className="text-sm font-medium text-gray-600 mb-2">Age (U) Groups</h3>
    <div className="flex flex-wrap gap-2">
      {ageGroups
        .filter(item => item.endsWith("U"))
        .map(ageGroup => (
          <button
            key={ageGroup}
            onClick={() => {
              setSelectedAgeGroups(prev =>
                prev.includes(ageGroup)
                  ? prev.filter(ag => ag !== ageGroup)
                  : [...prev, ageGroup]
              );
            }}
            className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
              selectedAgeGroups.includes(ageGroup)
                ? "border-purple-500 bg-purple-100 text-purple-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            {ageGroup}
            {selectedAgeGroups.includes(ageGroup) && (
              <span className="ml-1 text-purple-600">✓</span>
            )}
          </button>
        ))}
    </div>
  </div>
</div>



              {/* Sport - Optional */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Trophy size={20} className="text-green-600" />
                  Sport (Optional)
                </h2>
                
                <input
                  type="text"
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  placeholder="e.g., Soccer, Basketball, Baseball..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                
                <p className="text-xs text-gray-500 mt-2">
                  Leave empty if not applicable
                </p>
              </div>
            </div>

            {/* Match Details Form */}
            {team1 && team2 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {/* Team vs Team Header */}
                <div className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-lg p-6 mb-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <div className="flex items-center justify-center gap-4">
                        {/* Team 1 */}
                        <div className="text-center">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-blue-300">
                            <Building size={24} className="text-blue-600" />
                          </div>
                          <h3 className="font-bold text-gray-800 text-lg">{team1?.name}</h3>
                          <p className="text-sm text-gray-600">{team1?.city}</p>
                        </div>
                        
                        {/* VS Badge */}
                          <div className="flex flex-col items-center text-center">
      {/* VS Badge */}
      <span className="bg-red-600 text-white px-5 py-2 rounded-full font-bold text-base shadow-sm">
        VS
      </span>

      {/* Sport Info */}
      <p className="text-sm text-gray-700 mt-3 font-medium">
        {sport || "Sport not specified"}
      </p>

      {/* Age Groups as Chips */}
      {selectedAgeGroups.length > 0 ? (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          justifyContent="center"
          sx={{
            mt: 1,
            maxWidth: 240,
          }}
        >
          {selectedAgeGroups.map((age, idx) => (
            <Tooltip key={idx} title={age}>
              <Chip
                label={age}
                size="small"
                color="primary"
                variant="outlined"
                sx={{
                  borderRadius: "16px",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                }}
              />
            </Tooltip>
          ))}
        </Stack>
      ) : (
        <p className="text-xs text-gray-500 mt-2">
          No age groups selected
        </p>
      )}
    </div>
                        
                        {/* Team 2 */}
                        <div className="text-center">
                          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-orange-300">
                            <Building size={24} className="text-orange-600" />
                          </div>
                          <h3 className="font-bold text-gray-800 text-lg">{team2?.name}</h3>
                          <p className="text-sm text-gray-600">{team2?.city}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <Plus size={20} className="text-red-600" />
                  Match Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Date Selection */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        <Calendar size={16} className="text-gray-400" />
        Date *
      </label>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label="Select match date"
          value={matchData.date ? dayjs(matchData.date) : null}
          onChange={(newValue) => {
            if (newValue) {
              setMatchData({
                ...matchData,
                date: newValue.format("YYYY-MM-DD"),
              });
            }
          }}
          minDate={dayjs()} // ⏳ today or future only
          format="MMMM D, YYYY"
          slotProps={{
            textField: {
              fullWidth: true,
              required: true,
              variant: "outlined",
              sx: {
                "& .MuiInputBase-root": {
                  borderRadius: "8px",
                  fontSize: "1rem",
                },
              },
            },
          }}
        />
      </LocalizationProvider>

  
    </div>

                  {/* Time Selection */}
<div>
      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        <Clock size={16} className="text-gray-400" />
        Time (US Time Zone) *
      </label>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <TimePicker
          label="Select match time"
          value={
            matchData.time
              ? dayjs(matchData.time, "hh:mm A")
              : null
          }
          onChange={(newValue) => {
            if (newValue) {
              setMatchData({
                ...matchData,
                time: newValue.format("hh:mm A"), // store formatted 12-hour time
              });
            }
          }}
          minutesStep={15} // ⏱ increments in 15 minutes
          ampm // show AM/PM (12-hour)
          slotProps={{
            textField: {
              fullWidth: true,
              required: true,
              variant: "outlined",
              sx: {
                "& .MuiInputBase-root": {
                  borderRadius: "8px",
                  fontSize: "1rem",
                },
              },
            },
          }}
        />
      </LocalizationProvider>
    </div>

                  {/* Location */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      Location *
                    </label>
                    <input
                      type="text"
                      value={matchData.location}
                      onChange={(e) => setMatchData({ ...matchData, location: e.target.value })}
                      placeholder="Enter match location"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      Notes
                    </label>
                    <textarea
                      value={matchData.notes}
                      onChange={(e) => setMatchData({ ...matchData, notes: e.target.value })}
                      placeholder="Additional notes for the match..."
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Match Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">Match Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Team 1:</strong> {team1?.name}</p>
                      <p><strong>Team 2:</strong> {team2?.name}</p>
                    </div>
                    <div>
                      <p><strong>Sport:</strong> {sport || 'Not specified'}</p>
                      <p><strong>Age Group:</strong> {selectedAgeGroups.length > 0 ? selectedAgeGroups.join(', ') : 'Not specified'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p><strong>Location:</strong> {matchData.location || 'Not specified'}</p>
                      <p><strong>Date:</strong> {matchData.date ? new Date(matchData.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 'Not specified'}</p>
                      <p><strong>Time:</strong> {matchData.hours && matchData.minutes && matchData.ampm ? 
                        `${matchData.hours}:${matchData.minutes} ${matchData.ampm}` : 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Create Match Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleCreateMatch}
                    disabled={loading}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating Match...
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        Create Match
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MatchCreation;