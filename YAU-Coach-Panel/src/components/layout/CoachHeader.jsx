// coach-panel/src/components/layout/CoachHeader.jsx
import React from 'react';
import { Bell, Menu, User, ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signOutCoach } from '../../firebase/coachAuth';

const CoachHeader = ({ 
  coachName, 
  teams = [], 
  selectedTeam, 
  onTeamChange, 
  onMenuClick,
  onSwitchToMemberView 
}) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOutCoach();
      localStorage.removeItem('currentUser');
      localStorage.removeItem('coachUser');
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Coach Dashboard</h1>
              
              {/* Team selector */}
              {teams.length > 1 && (
                <select
                  value={selectedTeam}
                  onChange={(e) => onTeamChange(e.target.value)}
                  className="hidden sm:block px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
              <Bell size={20} />
              {/* Notification badge */}
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 min-w-[16px] h-[16px] flex items-center justify-center">
                3
              </span>
            </button>

            {/* User menu */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {coachName.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="hidden sm:block font-medium text-gray-900">{coachName}</span>
              </div>

              {/* Actions dropdown */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={onSwitchToMemberView}
                  className="hidden sm:flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>Member View</span>
                </button>
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile team selector */}
        {teams.length > 1 && (
          <div className="sm:hidden pb-4">
            <select
              value={selectedTeam}
              onChange={(e) => onTeamChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Teams</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.teamName || `${team.ageGroup} ${team.sport}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </header>
  );
};

export default CoachHeader;