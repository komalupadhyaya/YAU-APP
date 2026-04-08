// coach/components/teams/PlayerCard.jsx
import React from 'react';
import { User, Mail, Phone, Calendar, MapPin } from 'lucide-react';

const PlayerCard = ({ player, status, coachData }) => {
  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'incomplete':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleContactParent = (type) => {
    if (type === 'email' && player.parentEmail) {
      const subject = `Regarding ${player.name} - ${coachData.firstName} ${coachData.lastName}`;
      const body = `Hello ${player.parentName},\n\nI hope this message finds you well. I wanted to reach out regarding ${player.name}.\n\nBest regards,\nCoach ${coachData.firstName} ${coachData.lastName}`;
      window.location.href = `mailto:${player.parentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else if (type === 'phone' && player.parentPhone) {
      window.location.href = `tel:${player.parentPhone}`;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Player Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {player.name ? player.name.split(' ').map(n => n[0]).join('') : '?'}
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">
              {player.name || `${player.firstName} ${player.lastName}` || 'Unknown Player'}
            </h4>
            <p className="text-sm text-gray-500">
              {player.ageGroup || 'Age Group Unknown'}
            </p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
          {status}
        </span>
      </div>

      {/* Player Details */}
      <div className="space-y-2 mb-4">
        {player.dob && (
          <div className="flex items-center text-sm text-gray-600">
            <Calendar size={14} className="mr-2 text-gray-400" />
            <span>Age: {calculateAge(player.dob)} years</span>
          </div>
        )}
        
        {player.location && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin size={14} className="mr-2 text-gray-400" />
            <span className="truncate">{player.location}</span>
          </div>
        )}
      </div>

      {/* Parent Information */}
      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center space-x-2 mb-2">
          <User size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            Parent: {player.parentName || 'Unknown'}
          </span>
        </div>

        {/* Contact Buttons */}
        <div className="flex space-x-2">
          {player.parentEmail && (
            <button
              onClick={() => handleContactParent('email')}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm"
              title={`Email: ${player.parentEmail}`}
            >
              <Mail size={14} />
              <span className="hidden sm:inline">Email</span>
            </button>
          )}
          
          {player.parentPhone && (
            <button
              onClick={() => handleContactParent('phone')}
              className="flex items-center space-x-1 px-3 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors text-sm"
              title={`Phone: ${player.parentPhone}`}
            >
              <Phone size={14} />
              <span className="hidden sm:inline">Call</span>
            </button>
          )}
          
          {!player.parentEmail && !player.parentPhone && (
            <span className="text-xs text-red-500">Contact info missing</span>
          )}
        </div>

        {/* Contact Info Display */}
        <div className="mt-2 space-y-1">
          {player.parentEmail && (
            <p className="text-xs text-gray-500 truncate" title={player.parentEmail}>
              📧 {player.parentEmail}
            </p>
          )}
          {player.parentPhone && (
            <p className="text-xs text-gray-500">
              📞 {player.parentPhone}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;