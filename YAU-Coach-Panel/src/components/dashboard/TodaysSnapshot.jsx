// coach/components/dashboard/TodaysSnapshot.jsx
import React from 'react';
import { Calendar, MessageSquare, Users, Clock } from 'lucide-react';

const TodaysSnapshot = ({ nextEvent, unreadMessages, teams }) => {
  const formatEventTime = (event) => {
    if (!event) return '';
    
    const eventDate = new Date(event.date);
    return eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatEventDate = (event) => {
    if (!event) return '';
    
    const eventDate = new Date(event.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (eventDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (eventDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getTotalPlayers = () => {
    return teams.reduce((total, team) => total + (team.playerCount || 0), 0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Today's Snapshot */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <Calendar className="mr-2 text-blue-600" size={24} />
          Today's Snapshot
        </h3>

        <div className="space-y-6">
          {/* Next Event */}
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Clock className="text-blue-600" size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">
                {nextEvent ? 'Next Practice' : 'No Upcoming Events'}
              </h4>
              {nextEvent ? (
                <div className="text-gray-600">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatEventTime(nextEvent)}
                  </p>
                  <p className="text-sm">
                    {formatEventDate(nextEvent)} • {nextEvent.location || nextEvent.field || 'TBD'}
                  </p>
                  {nextEvent.teamName && (
                    <p className="text-sm text-gray-500">Team: {nextEvent.teamName}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No practices or games scheduled</p>
              )}
            </div>
          </div>

          {/* New Messages */}
          <div className="flex items-start space-x-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <MessageSquare className="text-green-600" size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">New Messages</h4>
              <div className="text-2xl font-bold text-green-600">
                {unreadMessages}
              </div>
              <p className="text-sm text-gray-500">
                {unreadMessages === 1 ? 'Unread message' : 'Unread messages'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Overview */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <Users className="mr-2 text-purple-600" size={24} />
          Teams & Rosters
        </h3>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-800">Team Summary</h4>
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                {teams.length} {teams.length === 1 ? 'Team' : 'Teams'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{teams.length}</div>
                <div className="text-sm text-purple-600">Teams Assigned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{getTotalPlayers()}</div>
                <div className="text-sm text-blue-600">Total Players</div>
              </div>
            </div>
          </div>

          {/* Team List */}
          {teams.length > 0 ? (
            <div className="space-y-2">
              {teams.slice(0, 3).map((team) => (
                <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">
                      {team.teamName || `${team.ageGroup} ${team.sport}`}
                    </p>
                    <p className="text-sm text-gray-500">{team.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-800">{team.playerCount || 0}</p>
                    <p className="text-xs text-gray-500">players</p>
                  </div>
                </div>
              ))}
              {teams.length > 3 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  +{teams.length - 3} more teams
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">No teams assigned yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodaysSnapshot;