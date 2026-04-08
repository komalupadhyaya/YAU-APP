// coach/components/teams/TeamsRosters.jsx
import React, { useState, useEffect } from 'react';
import { Users, Mail, Phone, MapPin, Calendar, User, Search, Filter } from 'lucide-react';
import { getTeamPlayers } from '../../firebase/coachFirestore';
import PlayerCard from './PlayerCard';

const TeamsRosters = ({ rosters, coachData, onRefresh }) => {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (rosters.length > 0 && !selectedTeam) {
      setSelectedTeam(rosters[0]);
    }
  }, [rosters]);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamPlayers();
    }
  }, [selectedTeam]);

  const loadTeamPlayers = async () => {
    if (!selectedTeam) return;
    
    setLoading(true);
    try {
      const players = await getTeamPlayers(selectedTeam.id);
      setTeamPlayers(players);
    } catch (error) {
      console.error('Error loading team players:', error);
      setTeamPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const getPlayerStatus = (player) => {
    // This would typically come from your database
    // For now, we'll simulate based on available data
    if (player.parentEmail && player.parentPhone) {
      return 'Active';
    } else if (player.parentEmail || player.parentPhone) {
      return 'Pending';
    }
    return 'Incomplete';
  };

  const filteredPlayers = teamPlayers.filter(player => {
    const matchesSearch = !searchTerm || 
      player.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.parentName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      getPlayerStatus(player).toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Teams & Rosters</h2>
        <button
          onClick={onRefresh}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Team Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Teams</h3>
            
            {rosters.length > 0 ? (
              <div className="space-y-3">
                {rosters.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedTeam?.id === team.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {team.sport?.[0] || 'T'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-800 truncate">
                          {team.teamName || `${team.ageGroup} ${team.sport}`}
                        </h4>
                        <p className="text-sm text-gray-500 truncate">{team.location}</p>
                        <p className="text-xs text-gray-400">
                          {team.playerCount || 0} players
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No teams assigned yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Team Details & Roster */}
        <div className="lg:col-span-3">
          {selectedTeam ? (
            <div className="space-y-6">
              {/* Team Info */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {selectedTeam.teamName || `${selectedTeam.ageGroup} ${selectedTeam.sport}`}
                    </h3>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center">
                        <MapPin size={14} className="mr-1" />
                        {selectedTeam.location}
                      </span>
                      <span className="flex items-center">
                        <Users size={14} className="mr-1" />
                        {teamPlayers.length} players
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedTeam.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedTeam.status?.toUpperCase() || 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search players or parents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="relative">
                    <Filter size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="incomplete">Incomplete</option>
                    </select>
                  </div>
                </div>

                {/* Players List */}
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading team roster...</p>
                  </div>
                ) : filteredPlayers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPlayers.map((player, index) => (
                      <PlayerCard 
                        key={player.id || index}
                        player={player}
                        status={getPlayerStatus(player)}
                        coachData={coachData}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users size={48} className="mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">
                      {teamPlayers.length === 0 ? 'No Players Registered' : 'No Players Found'}
                    </h3>
                    <p className="text-gray-500">
                      {teamPlayers.length === 0 
                        ? 'This team doesn\'t have any registered players yet.'
                        : 'Try adjusting your search or filter criteria.'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <Users size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">Select a Team</h3>
              <p className="text-gray-500">Choose a team from the left to view its roster and details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamsRosters;