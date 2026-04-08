import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Calendar, Users, Trophy, FileText, Filter, X } from 'lucide-react';
import { GameSchedulesService } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { getCurrentUserData } from '../../firebase/apis/api-members';
import Modal from '../common/Model';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export default function Schedule() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    team: 'all',
    sport: 'all',
    ageGroup: 'all',
    status: 'all',
    dateRange: 'all',
    homeAway: 'all'
  });

  useEffect(() => {
    const fetchUserDataAndSchedules = async () => {
      try {
        setLoading(true);

        // Fetch current user data
        const currentUserData = await getCurrentUserData(user.email);
        setUserData(currentUserData);

        // Fetch game schedules
        const response = await GameSchedulesService.getAll();
        const schedulesData = response.data || response;

        // Convert current IST time to US Eastern Time (ET)
        const currentDateIST = new Date('2025-09-11T15:54:00+05:30');
        const currentDateET = new Date(
          currentDateIST.toLocaleString('en-US', { timeZone: 'America/New_York' })
        );

        // Map schedules to component format
        const formattedSchedules = schedulesData.map((schedule) => {
          const dateParts = schedule.date.split('-');
          const formattedDate = `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`;
          const gameDateTime = new Date(`${formattedDate}T${schedule.time}:00-04:00`);
          
          return {
            id: schedule.id,
            team: schedule.team1Name || schedule.team1 || 'Unknown Team',
            opponent: schedule.team2Name || schedule.team2 || 'TBD',
            date: schedule.date,
            time: schedule.time,
            location: schedule.location || 'TBD',
            type: schedule.status === 'Completed' ? 'Completed Game' : 'League Game',
            homeAway: schedule.team1Id?.includes(currentUserData?.location?.toLowerCase())
              ? 'Home'
              : 'Away',
            status: schedule.status || 'Scheduled',
            homeScore: schedule.homeScore || null,
            awayScore: schedule.awayScore || null,
            season: schedule.season,
            week: schedule.week || 'N/A',
            createdAt: schedule.createdAt,
            notes: schedule.notes || '',
            sport: schedule.sport,
            ageGroup: schedule.ageGroup,
            ageGroups: schedule.ageGroups || [],
            coachName: schedule.coachName || 'TBD',
            coachId: schedule.coachId,
            gameDateTime: isNaN(gameDateTime) ? null : gameDateTime,
          };
        });

        // Filter out invalid dates and sort by date/time
        const validSchedules = formattedSchedules.filter(schedule => schedule.gameDateTime !== null);
        validSchedules.sort((a, b) => b.gameDateTime - a.gameDateTime);

        setSchedules(validSchedules);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data or game schedules:', error);
        setSchedules([]);
        setLoading(false);
      }
    };

    if (user?.email) {
      fetchUserDataAndSchedules();
    } else {
      setLoading(false);
    }
  }, [user]);

  const formatDate = (dateString) => {
    let date;

    if (dateString.includes('-') && dateString.length === 10) {
      const parts = dateString.split('-');
      if (parts[0].length === 2) {
        date = dayjs(`${parts[2]}-${parts[0]}-${parts[1]}`);
      } else {
        date = dayjs(dateString);
      }
    } else {
      date = dayjs(dateString);
    }

    const dayName = date.format('dddd');
    const monthDay = date.format('MMM D, YYYY');
    const shortDayName = date.format('ddd');
     const time = date.format('h:mm A'); 

    return { dayName, monthDay, shortDayName, time };
  };


  const formatScheduleTime = (dateString, timeString) => {
  try {
    // Convert schedule.date and schedule.time into a full datetime string
    const dateParts = dateString.split('-'); // MM-DD-YYYY or YYYY-MM-DD
    let fullDate;

    if (dateParts[0].length === 2) {
      // MM-DD-YYYY
      fullDate = `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`; // YYYY-MM-DD
    } else {
      fullDate = dateString; // Assume already in YYYY-MM-DD
    }

    // Combine with time and parse as UTC (or source timezone if known)
    const dateTime = dayjs.tz(`${fullDate}T${timeString}`, 'America/New_York'); // 🕒 set to Eastern Time

    // Format to 12-hour format with AM/PM, in local browser time
    return dateTime.local().format('h:mm A');
  } catch (e) {
    return timeString; // Fallback
  }
};


  // Extract unique values for filters
  const getUniqueValues = (key) => {
    const values = schedules.map(schedule => schedule[key]).filter(Boolean);
    return ['all', ...new Set(values.flatMap(val => 
      Array.isArray(val) ? val : [val]
    ))];
  };

  // Get unique teams, sports, age groups
  const teams = getUniqueValues('team');
  const sports = getUniqueValues('sport');
  const ageGroups = getUniqueValues('ageGroups');
  const statuses = ['all', 'Scheduled', 'Completed', 'Cancelled', 'Postponed'];

  // Apply filters
  const filteredSchedules = schedules.filter(schedule => {
    return (
      (filters.team === 'all' || schedule.team === filters.team) &&
      (filters.sport === 'all' || schedule.sport === filters.sport) &&
      (filters.ageGroup === 'all' || 
        schedule.ageGroups?.includes(filters.ageGroup) || 
        schedule.ageGroup === filters.ageGroup) &&
      (filters.status === 'all' || schedule.status === filters.status) &&
      (filters.dateRange === 'all' || applyDateFilter(schedule, filters.dateRange)) &&
      (filters.homeAway === 'all' || schedule.homeAway === filters.homeAway)
    );
  });

  const applyDateFilter = (schedule, dateRange) => {
    const currentDateIST = new Date('2025-09-11T15:54:00+05:30');
    const currentDateET = new Date(
      currentDateIST.toLocaleString('en-US', { timeZone: 'America/New_York' })
    );

    switch (dateRange) {
      case 'upcoming':
        return schedule.gameDateTime >= currentDateET && schedule.status !== 'Completed';
      case 'past':
        return schedule.gameDateTime < currentDateET || schedule.status === 'Completed';
      case 'thisWeek':
        const oneWeekFromNow = new Date(currentDateET);
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
        return schedule.gameDateTime >= currentDateET && schedule.gameDateTime <= oneWeekFromNow;
      default:
        return true;
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      team: 'all',
      sport: 'all',
      ageGroup: 'all',
      status: 'all',
      dateRange: 'all',
      homeAway: 'all'
    });
  };

  const getNextGame = () => {
    const currentDateIST = new Date('2025-09-11T15:54:00+05:30');
    const currentDateET = new Date(
      currentDateIST.toLocaleString('en-US', { timeZone: 'America/New_York' })
    );
    
    const upcomingGames = schedules.filter(
      (schedule) =>
        schedule.status !== 'Completed' &&
        schedule.gameDateTime &&
        schedule.gameDateTime >= currentDateET
    );
    
    upcomingGames.sort((a, b) => a.gameDateTime - b.gameDateTime);
    return upcomingGames[0];
  };

  const handleViewDetails = (schedule) => {
    setSelectedGame(schedule);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedGame(null);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Game Schedule</h1>
        
        <div className="flex gap-4">
          {/* Toggle Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filters
            {Object.values(filters).some(filter => filter !== 'all') && (
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {Object.values(filters).filter(filter => filter !== 'all').length}
              </span>
            )}
          </button>

          {/* Clear Filters */}
          {Object.values(filters).some(filter => filter !== 'all') && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Sport Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
              <select
                value={filters.sport}
                onChange={(e) => handleFilterChange('sport', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sports.map(sport => (
                  <option key={sport} value={sport}>
                    {sport === 'all' ? 'All Sports' : sport}
                  </option>
                ))}
              </select>
            </div>

            {/* Team Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
              <select
                value={filters.team}
                onChange={(e) => handleFilterChange('team', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {teams.map(team => (
                  <option key={team} value={team}>
                    {team === 'all' ? 'All Teams' : team}
                  </option>
                ))}
              </select>
            </div>

            {/* Age Group Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age Group</label>
              <select
                value={filters.ageGroup}
                onChange={(e) => handleFilterChange('ageGroup', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ageGroups.map(ageGroup => (
                  <option key={ageGroup} value={ageGroup}>
                    {ageGroup === 'all' ? 'All Ages' : ageGroup}
                  </option>
                ))}
              </select>
            </div>

            {/* Home/Away Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Home/Away</label>
              <select
                value={filters.homeAway}
                onChange={(e) => handleFilterChange('homeAway', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Games</option>
                <option value="Home">Home Games Only</option>
                <option value="Away">Away Games Only</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Status' : status}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Dates</option>
                <option value="upcoming">Upcoming Games</option>
                <option value="past">Past Games</option>
                <option value="thisWeek">This Week</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredSchedules.length} of {schedules.length} games
      </div>

      {/* Schedule Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSchedules.map((schedule) => {
          const { shortDayName, monthDay, time } = formatDate(schedule.date);

          console.log("scheduletimmmmmmmmmmeeee", schedule.time)
          const nextGame = getNextGame();

          return (
            <div
              key={schedule.id}
              className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition cursor-pointer relative"
              onClick={() => handleViewDetails(schedule)}
            >
              {/* Status Badges */}
              {nextGame && schedule.id === nextGame.id && schedule.status !== 'Completed' && (
                <div className="absolute top-2 right-2">
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    NEXT GAME
                  </span>
                </div>
              )}
              {schedule.status === 'Completed' && (
                <div className="absolute top-2 right-2">
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    COMPLETED
                  </span>
                </div>
              )}

              {/* Date */}
              <div className="text-sm font-semibold text-gray-700 mb-2">
                {shortDayName} – {monthDay}
              </div>

              {/* Age Group & Sport */}
              <div className="bg-teal-500 text-white text-sm font-semibold px-3 py-1 inline-block rounded mb-3">
                {schedule.ageGroup} – {schedule.sport.replace('_', ' ')}
              </div>

              {/* Time */}
              {schedule.time && (
                <div className="flex items-center text-gray-600 text-sm mb-1">
                  <Clock className="w-4 h-4 mr-2" />
                  {/* {schedule.time} */}
                  {formatScheduleTime(schedule.date, schedule.time)} EST
                </div>
              )}

              {/* Location */}
              <div className="flex items-center text-gray-600 text-sm mb-1">
                <MapPin className="w-4 h-4 mr-2" />
                <span className="truncate">{schedule.location}</span>
              </div>

              {/* Teams */}
              <div className="text-gray-800 text-sm font-medium">
                {schedule.team} vs {schedule.opponent}
              </div>

              {/* Coach */}
              <div className="text-gray-600 text-xs mt-2">
                Coach: {schedule.coachName}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredSchedules.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No games found matching your criteria</div>
          <div className="text-gray-400 text-sm mt-2">
            Try adjusting your filters or check back later
          </div>
        </div>
      )}

      {/* Game Details Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Game Details" size="lg">
        {selectedGame && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {selectedGame.team} vs {selectedGame.opponent}
              </h2>
              <div className="flex justify-center gap-2 flex-wrap">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {selectedGame.sport}
                </span>
                {selectedGame.ageGroup && (
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                    {selectedGame.ageGroup}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedGame.homeAway === 'Home' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {selectedGame.homeAway}
                </span>
              </div>
            </div>

            {/* Game Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date & Time */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Calendar className="w-5 h-5 text-gray-600 mr-2" />
                  <h3 className="font-semibold text-gray-800">Date & Time</h3>
                </div>
                <p className="text-gray-700">{formatDate(selectedGame.date).dayName}</p>
                <p className="text-gray-700">{formatDate(selectedGame.date).monthDay}</p>
                <div className="flex items-center mt-2">
                  <Clock className="w-4 h-4 text-gray-600 mr-1" />
                  <span className="text-gray-600">{formatScheduleTime(selectedGame.date, selectedGame.time)} EST</span>
                </div>
              </div>

              {/* Location */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <MapPin className="w-5 h-5 text-gray-600 mr-2" />
                  <h3 className="font-semibold text-gray-800">Location</h3>
                </div>
                <p className="text-gray-700">{selectedGame.location}</p>
              </div>

              {/* Teams */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Users className="w-5 h-5 text-gray-600 mr-2" />
                  <h3 className="font-semibold text-gray-800">Teams</h3>
                </div>
                <p className="text-gray-700 mb-1">
                  <strong>Home:</strong> {selectedGame.team}
                </p>
                <p className="text-gray-700">
                  <strong>Away:</strong> {selectedGame.opponent}
                </p>
              </div>

              {/* Coach & Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Trophy className="w-5 h-5 text-gray-600 mr-2" />
                  <h3 className="font-semibold text-gray-800">Game Info</h3>
                </div>
                <p className="text-gray-700 mb-1">
                  <strong>Coach:</strong> {selectedGame.coachName}
                </p>
                <p className="text-gray-700 mb-1">
                  <strong>Status:</strong> {selectedGame.status || 'Scheduled'}
                </p>
                <p className="text-gray-700">
                  <strong>Season:</strong> {selectedGame.season}
                </p>
              </div>
            </div>

            {/* Score (if completed) */}
            {selectedGame.status === 'Completed' && selectedGame.homeScore !== null && selectedGame.awayScore !== null && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center">
                  <Trophy className="w-5 h-5 mr-2" />
                  Final Score
                </h3>
                <p className="text-lg font-bold text-green-700">
                  {selectedGame.homeAway === 'Home' ? selectedGame.homeScore : selectedGame.awayScore} - {' '}
                  {selectedGame.homeAway === 'Home' ? selectedGame.awayScore : selectedGame.homeScore}
                </p>
              </div>
            )}

            {/* Notes */}
            {selectedGame.notes && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Notes
                </h3>
                <p className="text-blue-700">{selectedGame.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}