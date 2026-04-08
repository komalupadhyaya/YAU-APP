// coach/components/common/CoachHeader.jsx
import React from 'react';
import { Bell, LogOut, User, ArrowLeft } from 'lucide-react';

const CoachHeader = ({ 
  coachName, 
  teams = [], 
  selectedTeam, 
  onTeamChange, 
  notifications = [],
  onSwitchToMemberView,
  onSignOut 
}) => {
  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Coach Dashboard</h1>
            
            {teams.length > 1 && (
              <select
                value={selectedTeam}
                onChange={(e) => onTeamChange(e.target.value)}
                className="bg-blue-700 text-white px-3 py-2 rounded-lg border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">All Teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.teamName || `${team.ageGroup} ${team.sport}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button className="relative p-2 bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors">
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 min-w-[18px] h-[18px] flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>

            {/* Coach Info */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-800 rounded-full flex items-center justify-center">
                  <User size={18} />
                </div>
                <span className="font-medium">{coachName}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              {onSwitchToMemberView && (
                <button
                  onClick={onSwitchToMemberView}
                  className="flex items-center space-x-1 px-3 py-2 bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors text-sm"
                >
                  <ArrowLeft size={16} />
                  <span>Member View</span>
                </button>
              )}
              
              <button
                onClick={onSignOut}
                className="flex items-center space-x-1 px-3 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default CoachHeader;