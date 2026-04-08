import React, { useState, useEffect } from 'react';
import { IdCard, Users, MapPin, Search, Download, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { getTeamPlayers } from '../../firebase/coachFirestore';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';

const MyTeamIds = ({ rosters, coachData }) => {
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTeams, setExpandedTeams] = useState({});
  const [groupBy, setGroupBy] = useState('team'); // 'team' or 'location'

  useEffect(() => {
    loadAllPlayers();
  }, [rosters]);

  const loadAllPlayers = async () => {
    setLoading(true);
    try {
      // First, get all members to access student ID data
      const membersSnapshot = await getDocs(collection(db, 'members'));
      const membersMap = {};

      membersSnapshot.docs.forEach(doc => {
        const memberData = doc.data();
        membersMap[doc.id] = memberData;
      });

      console.log('📋 Loaded members:', Object.keys(membersMap).length);

      const playersWithTeams = await Promise.all(
        rosters.map(async (roster) => {
          const players = await getTeamPlayers(roster.id);

          // Enrich player data with actual ID information from members collection
          return players
            .map(player => {
              // Find the parent/member data
              const parentData = membersMap[player.parentId];

              if (!parentData || !parentData.students) {
                return null;
              }

              // Find the specific student in the parent's students array
              const studentData = parentData.students.find(s =>
                (s.uid === player.uid) ||
                (s.name === player.name) ||
                (`${s.firstName} ${s.lastName}` === player.name)
              );

              // Only include if student has approved ID
              if (!studentData || studentData.idStatus !== 'active') {
                return null;
              }

              // Get the YAU ID (could be stored in different fields)
              const yauId = studentData.yauId ||
                           studentData.studentId ||
                           studentData.memberId ||
                           studentData.uid;

              return {
                ...player,
                ...studentData,
                teamId: roster.id,
                teamName: roster.teamName || `${roster.ageGroup} ${roster.sport}`,
                teamLocation: roster.location,
                sport: roster.sport,
                ageGroup: roster.ageGroup || studentData.ageGroup,
                yauId: yauId,
                idStatus: studentData.idStatus,
                expirationDate: studentData.expirationDate,
                parentData: {
                  firstName: parentData.firstName,
                  lastName: parentData.lastName,
                  email: parentData.email,
                  phone: parentData.phone,
                  location: parentData.location
                }
              };
            })
            .filter(player => player !== null); // Remove null entries
        })
      );

      const flatPlayers = playersWithTeams.flat();
      console.log('✅ Found students with approved IDs:', flatPlayers.length);
      setAllPlayers(flatPlayers);

      // Auto-expand all teams by default
      const expanded = {};
      if (groupBy === 'team') {
        rosters.forEach(roster => {
          expanded[roster.id] = true;
        });
      } else {
        const locations = [...new Set(flatPlayers.map(p => p.teamLocation))];
        locations.forEach(loc => {
          expanded[loc] = true;
        });
      }
      setExpandedTeams(expanded);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlayerId = (player) => {
    return player.yauId || player.studentId || player.memberId || 'No ID';
  };

  const filteredPlayers = allPlayers.filter(player => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      player.name?.toLowerCase().includes(search) ||
      player.firstName?.toLowerCase().includes(search) ||
      player.lastName?.toLowerCase().includes(search) ||
      getPlayerId(player).toLowerCase().includes(search) ||
      player.teamName?.toLowerCase().includes(search)
    );
  });

  const groupedPlayers = () => {
    if (groupBy === 'team') {
      return rosters.map(roster => ({
        id: roster.id,
        name: roster.teamName || `${roster.ageGroup} ${roster.sport}`,
        location: roster.location,
        sport: roster.sport,
        players: filteredPlayers.filter(p => p.teamId === roster.id)
      })).filter(group => group.players.length > 0);
    } else {
      const locations = [...new Set(filteredPlayers.map(p => p.teamLocation))];
      return locations.map(location => ({
        id: location,
        name: location,
        players: filteredPlayers.filter(p => p.teamLocation === location)
      }));
    }
  };

  const toggleGroup = (groupId) => {
    setExpandedTeams(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const csvContent = [
      ['Team', 'Location', 'Player Name', 'YAU ID', 'Age Group', 'Parent Name', 'Parent Email', 'Parent Phone'],
      ...filteredPlayers.map(player => [
        player.teamName,
        player.teamLocation,
        player.name || `${player.firstName} ${player.lastName}`,
        getPlayerId(player),
        player.ageGroup,
        player.parentName || '',
        player.parentEmail || '',
        player.parentPhone || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-ids-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team IDs...</p>
        </div>
      </div>
    );
  }

  const groups = groupedPlayers();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <IdCard className="w-7 h-7 text-blue-600" />
            My Team IDs
          </h2>
          <p className="text-gray-600 mt-1">View approved student IDs for your roster</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Printer size={18} />
            Print
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Group By */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Group by:</label>
            <select
              value={groupBy}
              onChange={(e) => {
                setGroupBy(e.target.value);
                loadAllPlayers(); // Reload to reset expanded state
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="team">Team</option>
              <option value="location">Location</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-700">Total Teams:</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
              {rosters.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-700">Total Students with IDs:</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-semibold">
              {allPlayers.length}
            </span>
          </div>
          {searchTerm && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-700">Filtered Results:</span>
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full font-semibold">
                {filteredPlayers.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Groups */}
      {groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                    {group.players.length}
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      {groupBy === 'team' ? <Users size={18} /> : <MapPin size={18} />}
                      {group.name}
                    </h3>
                    {groupBy === 'team' && group.location && (
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <MapPin size={14} />
                        {group.location}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      {group.players.length} student{group.players.length !== 1 ? 's' : ''} with approved IDs
                    </p>
                  </div>
                </div>
                {expandedTeams[group.id] ? (
                  <ChevronUp className="text-gray-400" size={24} />
                ) : (
                  <ChevronDown className="text-gray-400" size={24} />
                )}
              </button>

              {/* Group Content */}
              {expandedTeams[group.id] && (
                <div className="border-t border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Student Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            YAU ID
                          </th>
                          {groupBy === 'location' && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Team
                            </th>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Age Group
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Parent
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {group.players.map((player, index) => (
                          <tr key={`${player.teamId}-${index}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs mr-3">
                                  {player.name ? player.name.split(' ').map(n => n[0]).join('') : '?'}
                                </div>
                                <div className="text-sm font-medium text-gray-900">
                                  {player.name || `${player.firstName} ${player.lastName}`}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {getPlayerId(player)}
                              </span>
                            </td>
                            {groupBy === 'location' && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {player.teamName}
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {player.ageGroup}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {player.parentName || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              <div className="space-y-1">
                                {player.parentEmail && (
                                  <div className="text-xs truncate max-w-xs" title={player.parentEmail}>
                                    📧 {player.parentEmail}
                                  </div>
                                )}
                                {player.parentPhone && (
                                  <div className="text-xs">
                                    📞 {player.parentPhone}
                                  </div>
                                )}
                                {!player.parentEmail && !player.parentPhone && (
                                  <span className="text-red-500">No contact</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <IdCard size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            {allPlayers.length === 0 ? 'No Approved IDs Found' : 'No Results Found'}
          </h3>
          <p className="text-gray-500">
            {allPlayers.length === 0
              ? 'None of your students have approved YAU IDs yet.'
              : 'Try adjusting your search criteria.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default MyTeamIds;
