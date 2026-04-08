import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Search, Filter, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Edit, Trash2, Clock, Bell, X, Users, Trophy, Star, TrendingUp, LayoutGrid, List } from 'lucide-react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { addSchedule, bulkDeleteSchedules, deleteSchedule, getLocations, getRosters, getSchedules, sendGameNotification, updateSchedule, getCoaches } from '../../firebase/firestore';
import Header from '../layout/Header';
import { Autocomplete } from '../common/AutoComplete';
import CustomDatePicker from '../common/CustomDatePicker';
import dayjs from 'dayjs';

const GameSchedule = ({ userRole = 'admin', userId = 'coach1' }) => {
    const [schedules, setSchedules] = useState([]);
    const [rosters, setRosters] = useState([]);
    const [locations, setLocations] = useState([]);
    const [coaches, setCoaches] = useState([]);
    const [selectedGameIds, setSelectedGameIds] = useState([]);
    const [selectedSport, setSelectedSport] = useState('all');
    const [selectedLocation, setSelectedLocation] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedAgeGroup, setSelectedAgeGroup] = useState('all');
    const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'list'
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedGame, setSelectedGame] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(12);

    // Details modal state
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedGameDetails, setSelectedGameDetails] = useState(null);

    const [formData, setFormData] = useState({
        team1Id: '',
        team1Name: '',
        team2Id: '',
        team2Name: '',
        date: '',
        time: '',
        location: '',
        sport: '',
        ageGroups: [], // CHANGED: Now supports multiple age groups
        status: '',
        coachId: '',
        coachName: '',
        notes: '',
        season: '2024-25'
    });

    // Keep grade strings consistent with other scheduling flows (see MatchCreation)
    const ageGroups = [
        'Kindergarden',
        '1st Grade',
        '2nd Grade',
        '3rd Grade',
        '4th Grade',
        '5th Grade',
        '6th Grade',
        '7th Grade',
        '8th Grade',
        '3U',
        '4U',
        '5U',
        '6U',
        '7U',
        '8U',
        '9U',
        '10U',
        '11U',
        '12U',
        '13U',
        '14U'
    ];
    const sports = ['Soccer', 'Basketball', 'Baseball', 'Track & Field', 'Flag Football', 'Tackle Football', 'Kickball', 'Golf', 'Cheer'];
    const gameStatuses = ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed'];

    useEffect(() => {
        loadScheduleData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
        // Avoid accidental bulk actions when filters change
        setSelectedGameIds([]);
    }, [selectedSport, selectedLocation, selectedStatus, selectedAgeGroup, searchTerm]);

    const loadScheduleData = async () => {
        try {
            setLoading(true);
            console.log('🔄 Loading schedule data...');

            const [schedulesData, rostersData, locationsData, coachesData] = await Promise.all([
                getSchedules(),
                getRosters(),
                getLocations(),
                getCoaches()
            ]);

            const sortedSchedules = schedulesData.sort((a, b) => {
                const dateA = new Date(`${a.date} ${a.time}`);
                const dateB = new Date(`${b.date} ${b.time}`);
                return dateA - dateB;
            });

            setSchedules(sortedSchedules);
            setRosters(rostersData);

            const validCoaches = coachesData.filter(coach => coach.role === 'coach');
            setCoaches(validCoaches);

            const processedLocations = locationsData.map(location => {
                if (typeof location === 'string') {
                    return location;
                }
                if (location.name) return location.name;
                if (location.city && location.state) return `${location.city}, ${location.state}`;
                if (location.address) return location.address;
                return 'Unknown Location';
            });

            setLocations(processedLocations);

        } catch (error) {
            console.error('❌ Error loading schedule data:', error);
            alert('Failed to load schedule data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const toggleGameSelection = (gameId) => {
        if (!gameId) return;
        setSelectedGameIds((prevSelected) =>
            prevSelected.includes(gameId)
                ? prevSelected.filter(id => id !== gameId)
                : [...prevSelected, gameId]
        );
    };

    const handleSelectAllOnPage = (gameIdsOnPage) => {
        const ids = (gameIdsOnPage || []).filter(Boolean);
        if (ids.length === 0) return;

        const allSelected = ids.every(id => selectedGameIds.includes(id));
        if (allSelected) {
            setSelectedGameIds(prev => prev.filter(id => !ids.includes(id)));
        } else {
            const combined = new Set([...selectedGameIds, ...ids]);
            setSelectedGameIds(Array.from(combined));
        }
    };

    const clearSelectedGames = () => setSelectedGameIds([]);

    const getEligibleRosters = () => {
        return rosters.filter(roster => {
            // const hasCoach = roster.hasAssignedCoach && roster.coachId;
            const isActive = roster.status !== 'empty';
            return isActive;
        });
    };

    // ENHANCED: Get eligible coaches based on sport and age groups
    const getEligibleCoaches = () => {
        if (!formData.sport && (!formData.ageGroups || formData.ageGroups.length === 0)) return coaches;

        return coaches.filter(coach => {
            const sportMatch = !formData.sport ||
                coach.primarySport === formData.sport ||
                (coach.secondarySports && coach.secondarySports.includes(formData.sport));

            const ageGroupMatch = !formData.ageGroups || formData.ageGroups.length === 0 ||
                !coach.assignedGroups ||
                coach.assignedGroups.length === 0 ||
                formData.ageGroups.some(ageGroup => coach.assignedGroups.includes(ageGroup));

            return sportMatch && ageGroupMatch;
        });
    };

    const handleCoachChange = (value) => {
        if (!value) {
            setFormData({ ...formData, coachId: '', coachName: '' });
            return;
        }

        const selectedCoach = coaches.find(c => c.id === value);
        if (selectedCoach) {
            setFormData({
                ...formData,
                coachId: selectedCoach.id,
                coachName: `${selectedCoach.firstName} ${selectedCoach.lastName}`
            });
        } else {
            setFormData({
                ...formData,
                coachId: '',
                coachName: value
            });
        }
    };

    const getTeam2Options = () => {
        const eligibleRosters = getEligibleRosters();
        // if (!formData.team1Id && !formData.team1Name) return eligibleRosters;

        // if (formData.team1Id) {
        //     const team1Roster = rosters.find(r => r.id === formData.team1Id);
        //     if (team1Roster) {
        //         return eligibleRosters.filter(roster =>
        //             roster.id !== formData.team1Id &&
        //             roster.sport === team1Roster.sport &&
        //             (formData.ageGroups.length === 0 || formData.ageGroups.includes(roster.ageGroup))
        //         );
        //     }
        // }

        return eligibleRosters;
    };

    // ENHANCED: Handle team1 changes with multiple age groups support
    const handleTeam1Change = (value) => {
        if (!value) {
            setFormData({
                ...formData,
                team1Id: '',
                team1Name: '',
                team2Id: '',
                team2Name: '',
                sport: 'Soccer',
                ageGroups: [], // Reset age groups
                location: '',
                coachId: '',
                coachName: 'TBD'
            });
            return;
        }

        const selectedRoster = rosters.find(r => r.id === value);
        if (selectedRoster) {
            setFormData({
                ...formData,
                team1Id: value,
                team1Name: selectedRoster.teamName,
                sport: selectedRoster.sport,
                ageGroups: [selectedRoster.ageGroup], // Set as array with single age group
                location: selectedRoster.location,
                coachId: selectedRoster.coachId || '',
                coachName: selectedRoster.coachName || 'TBD',
                team2Id: '',
                team2Name: ''
            });
        } else {
            setFormData({
                ...formData,
                team1Id: '',
                team1Name: value,
                sport: formData.sport || 'Soccer',
                ageGroups: formData.ageGroups.length > 0 ? formData.ageGroups : ['6U'], // Keep existing or default
                coachId: '',
                coachName: 'TBD',
                team2Id: '',
                team2Name: ''
            });
        }
    };

    const handleTeam2Change = (value) => {
        if (!value) {
            setFormData({ ...formData, team2Id: '', team2Name: '' });
            return;
        }

        const selectedRoster = rosters.find(r => r.id === value);
        if (selectedRoster) {
            setFormData({
                ...formData,
                team2Id: value,
                team2Name: selectedRoster.teamName
            });
        } else {
            setFormData({
                ...formData,
                team2Id: '',
                team2Name: value
            });
        }
    };

    const resetForm = () => {
        setFormData({
            team1Id: '',
            team1Name: '',
            team2Id: '',
            team2Name: '',
            date: '',
            time: '',
            location: '',
            sport: '',
            ageGroups: [], // Reset as empty array
            status: '',
            coachId: '',
            coachName: '',
            notes: '',
            season: '2024-25'
        });
    };

    // ENHANCED: Game creation with multiple age groups and notification to all age groups
    const handleAddGame = async () => {
        if (!formData.team1Name || !formData.team2Name || !formData.date || !formData.time || !formData.location || formData.ageGroups.length === 0) {
            alert('Please fill in all required fields including at least one age group.');
            return;
        }

        try {
            setLoading(true);
            const gameData = {
                ...formData,
                team1: formData.team1Name,
                team2: formData.team2Name,
                ageGroup: formData.ageGroups.join(', '), // Store as comma-separated string for compatibility
                createdAt: new Date(),
            };

            const gameId = await addSchedule(gameData);

            try {
                // Send notifications to all selected age groups
                await sendGameNotification({ ...gameData, id: gameId, ageGroups: formData.ageGroups }, 'game_scheduled');
                alert(`🎉 Game scheduled successfully! 📱 Mobile notifications sent to parents and coaches for age groups: ${formData.ageGroups.join(', ')}.`);
            } catch (notificationError) {
                console.error('⚠️ Notification error:', notificationError);
                alert('✅ Game scheduled successfully! (Note: Some notifications may have failed)');
            }

            await loadScheduleData();
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error('❌ Error adding game:', error);
            alert('Failed to schedule game. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ENHANCED: Game update with multiple age groups support
    const handleUpdateGame = async () => {
        if (!formData.team1Name || !formData.team2Name || !formData.date || !formData.time || !formData.location || formData.ageGroups.length === 0) {
            alert('Please fill in all required fields including at least one age group.');
            return;
        }

        try {
            setLoading(true);
            const gameData = {
                ...formData,
                team1: formData.team1Name,
                team2: formData.team2Name,
                ageGroup: formData.ageGroups.join(', '), // Store as comma-separated string for compatibility
                updatedAt: new Date()
            };
            await updateSchedule(selectedGame.id, gameData);

            try {
                await sendGameNotification({ ...gameData, id: selectedGame.id, ageGroups: formData.ageGroups }, 'game_updated');
                alert(`✅ Game updated successfully! 📱 Update notifications sent to age groups: ${formData.ageGroups.join(', ')}.`);
            } catch (notificationError) {
                console.error('⚠️ Game updated but notification failed:', notificationError);
                alert('✅ Game updated successfully! (Note: Some notifications may have failed)');
            }

            await loadScheduleData();
            setIsModalOpen(false);
            setIsEditing(false);
            setSelectedGame(null);
        } catch (error) {
            console.error('❌ Error updating game:', error);
            alert('Failed to update game. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ENHANCED: Game reminder with multiple age groups support
    const handleSendGameReminder = async (game, e) => {
        if (e) e.stopPropagation();

        try {
            setLoading(true);
            // Parse age groups from stored format
            const gameAgeGroups = game.ageGroups || (game.ageGroup ? game.ageGroup.split(', ') : []);
            await sendGameNotification({ ...game, ageGroups: gameAgeGroups }, 'game_reminder');
            alert(`📱 Game reminder sent successfully for ${game.team1 || game.team1Name} vs ${game.team2 || game.team2Name} to age groups: ${gameAgeGroups.join(', ')}!`);
        } catch (error) {
            console.error('❌ Error sending reminder:', error);
            alert('Failed to send reminder. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendReminder = async () => {
        if (!selectedGame) return;
        try {
            setLoading(true);
            const gameAgeGroups = formData.ageGroups.length > 0 ? formData.ageGroups : (selectedGame.ageGroup ? selectedGame.ageGroup.split(', ') : []);
            await sendGameNotification({ ...selectedGame, ageGroups: gameAgeGroups }, 'game_reminder');
            alert(`📱 Game reminder sent to all participants in age groups: ${gameAgeGroups.join(', ')}!`);
        } catch (error) {
            console.error('❌ Error sending reminder:', error);
            alert('Failed to send reminder.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelGame = async () => {
        if (!window.confirm('Are you sure you want to cancel this game? This will notify all participants.')) return;

        try {
            setLoading(true);
            const cancelledGameData = { ...selectedGame, status: 'Cancelled' };
            await updateSchedule(selectedGame.id, cancelledGameData);

            const gameAgeGroups = formData.ageGroups.length > 0 ? formData.ageGroups : (selectedGame.ageGroup ? selectedGame.ageGroup.split(', ') : []);
            await sendGameNotification({ ...cancelledGameData, ageGroups: gameAgeGroups }, 'game_cancelled');
            await loadScheduleData();
            setIsModalOpen(false);
            setSelectedGame(null);
            alert(`❌ Game cancelled and notifications sent to all participants in age groups: ${gameAgeGroups.join(', ')}.`);
        } catch (error) {
            console.error('❌ Error cancelling game:', error);
            alert('Failed to cancel game.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGame = async (gameId) => {
        if (!window.confirm('Are you sure you want to delete this game?')) return;

        try {
            setLoading(true);
            await deleteSchedule(gameId);
            await loadScheduleData();
            setIsModalOpen(false);
            setSelectedGame(null);
            alert('🗑️ Game deleted successfully!');
        } catch (error) {
            console.error('❌ Error deleting game:', error);
            alert('Failed to delete game. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDeleteSelectedGames = async () => {
        if (userRole !== 'admin') return;
        if (selectedGameIds.length === 0) return;

        const count = selectedGameIds.length;
        const typed = window.prompt(
            `You are about to delete ${count} game(s).\n\nType Delete to confirm:`
        );

        if ((typed || '').trim() !== 'Delete') {
            alert('Bulk delete cancelled.');
            return;
        }

        try {
            setLoading(true);
            const result = await bulkDeleteSchedules({
                confirmation: 'BULK_DELETE_SCHEDULES',
                ids: selectedGameIds,
                dryRun: false
            });

            clearSelectedGames();
            await loadScheduleData();

            const deletedCount = result?.deletedCount ?? result?.deleted ?? result?.count ?? count;
            alert(`🗑️ Bulk delete completed. Deleted ${deletedCount} game(s).`);
        } catch (error) {
            console.error('❌ Error bulk deleting games:', error);
            alert('Failed to bulk delete games. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (game, e) => {
        if (e) e.stopPropagation();
        setSelectedGameDetails(game);
        setShowDetailsModal(true);
    };

    // ENHANCED: Filtering to support multiple age groups
    const getFilteredGames = () => {
        return schedules.filter(game => {
            const sportMatch = selectedSport === 'all' || game?.sport === selectedSport;
            const locationMatch = selectedLocation === 'all' || game?.location === selectedLocation;
            const statusMatch = selectedStatus === 'all' || game?.status === selectedStatus;

            // ENHANCED: Age group matching for both single and multiple age groups
            const ageGroupMatch = selectedAgeGroup === 'all' ||
                game.ageGroup === selectedAgeGroup ||
                (game.ageGroup && game.ageGroup.includes(selectedAgeGroup)) ||
                (game.ageGroups && game.ageGroups.includes(selectedAgeGroup));

            const searchMatch = !searchTerm || (
                (game?.team1 || game.team1Name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (game?.team2 || game.team2Name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (game?.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (game?.sport || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (game?.coachName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (game?.ageGroup || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
            const roleMatch = userRole === 'admin' || (userRole === 'coach' && game?.coachId === userId);
            return sportMatch && locationMatch && statusMatch && ageGroupMatch && searchMatch && roleMatch;
        });
    };

    const filteredGames = getFilteredGames();
    const upcomingGames = filteredGames.filter(game => {
        const gameDateTime = new Date(`${game.date} ${game.time}`);
        return gameDateTime >= new Date() && game.status === 'Scheduled';
    });
    const completedGames = filteredGames.filter(game => game.status === 'Completed');
    const todayGames = filteredGames.filter(game => {
        const today = new Date().toISOString().split('T')[0];
        return game.date === today;
    });

    const totalItems = filteredGames.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredGames?.slice(startIndex, endIndex);
    const currentPageGameIds = (currentItems || []).map(g => g?.id).filter(Boolean);
    const allSelectedOnPage = currentPageGameIds.length > 0 && currentPageGameIds.every(id => selectedGameIds.includes(id));

    const getStatusColor = (status) => {
        const colors = {
            'Scheduled': 'bg-blue-500 text-white',
            'In Progress': 'bg-yellow-500 text-white',
            'Completed': 'bg-green-500 text-white',
            'Cancelled': 'bg-red-500 text-white',
            'Postponed': 'bg-orange-500 text-white'
        };
        return colors[status] || 'bg-gray-500 text-white';
    };

    const getSportIcon = (sport) => {
        const icons = {
            'Soccer': '⚽',
            'Basketball': '🏀',
            'Baseball': '⚾',
            'Track & Field': '🏃‍♂️',
            'Flag Football': '🏈',
            'Tackle Football': '🏈',
            'Kickball': '🥎',
            'Golf': '🏌️',
            'Cheer': '📣'
        };
        return icons[sport] || '🏆';
    };

    const isUpcoming = (date, time) => {
        const gameDateTime = new Date(`${date} ${time}`);
        return gameDateTime > new Date();
    };

    const isToday = (date) => {
        const today = new Date().toISOString().split('T')[0];
        return date === today;
    };

    const isTomorrow = (date) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return date === tomorrow.toISOString().split('T')[0];
    };

    const getAllTeams = () => {
        const teams = new Set();
        schedules.forEach(game => {
            if (game.team1Name || game.team1) {
                teams.add(game.team1Name || game.team1);
            }
            if (game.team2Name || game.team2) {
                teams.add(game.team2Name || game.team2);
            }
        });
        return Array.from(teams);
    };

    // Access control
    if (userRole !== 'admin' && userRole !== 'coach') {
        return (
            <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
                <Header title="Game Schedule" subtitle="View scheduled games" />
                <div className="bg-white rounded-2xl p-6 shadow-lg max-w-6xl mx-auto">
                    <div className="text-center py-12">
                        <AlertTriangle size={64} className="mx-auto text-red-300 mb-4" />
                        <h3 className="text-lg font-medium text-red-600 mb-2">Access Restricted</h3>
                        <p className="text-red-500 mb-4">This section is only available to administrators and coaches.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-6">
                <Header title="Game Schedule" subtitle="Loading schedule data..." />
                <div className="bg-white rounded-2xl p-6 shadow-lg max-w-6xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-32 bg-gray-200 rounded-xl mb-6"></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <div key={i} className="bg-gray-200 rounded-xl p-4">
                                    <div className="h-6 bg-gray-300 rounded mb-2"></div>
                                    <div className="h-4 bg-gray-300 rounded mb-1"></div>
                                    <div className="h-4 bg-gray-300 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const allTeams = getAllTeams();

    return (
        <div className="min-h-screen p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                <Header
                    title="Game Schedule"
                    subtitle={
                        userRole === 'admin'
                            ? "Schedule and manage games for multiple age groups - Mobile notifications enabled 📱"
                            : "View and manage your assigned team games"
                    }
                />

                <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg">
                    {/* Filters Section */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-6 border">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                            <div className="flex items-center gap-2">
                                <Filter size={20} className="text-gray-600" />
                                <h3 className="font-semibold text-gray-700">Filter Games</h3>
                            </div>
                            {userRole === 'coach' && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium w-fit">
                                    Showing only your assigned games
                                </span>
                            )}
                        </div>

                        {/* Filter Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sport</label>
                                <select
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                                    value={selectedSport}
                                    onChange={(e) => setSelectedSport(e.target.value)}
                                >
                                    <option value="all">All Sports</option>
                                    {sports.map((sport) => (
                                        <option key={sport} value={sport}>{getSportIcon(sport)} {sport}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Age Group / Grade</label>
                                <select
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                                    value={selectedAgeGroup}
                                    onChange={(e) => setSelectedAgeGroup(e.target.value)}
                                >
                                    <option value="all">All Age Groups / Grades</option>
                                    {ageGroups.map((group) => (
                                        <option key={group} value={group}>{group}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                                <select
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                                    value={selectedLocation}
                                    onChange={(e) => setSelectedLocation(e.target.value)}
                                >
                                    <option value="all">All Locations</option>
                                    {locations.map((location, index) => (
                                        <option key={index} value={location}>
                                            {location}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                >
                                    <option value="all">All Statuses</option>
                                    {gameStatuses.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="mt-4">
                            <div className="relative">
                                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search games..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex flex-col sm:flex-row sm:justify-between gap-3">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button onClick={() => {
                                    setSelectedSport('all')
                                    setSelectedLocation('all')
                                    setSelectedStatus('all')
                                    setSelectedAgeGroup('all')
                                }} variant="outline" className="w-full sm:w-auto">
                                    Reset Filter
                                </Button>
                                <Button onClick={loadScheduleData} variant="secondary" className="text-sm">
                                    🔄 Refresh Data
                                </Button>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    className="p-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                                >
                                    <option value={6}>6 per page</option>
                                    <option value={12}>12 per page</option>
                                    <option value={24}>24 per page</option>
                                    <option value={48}>48 per page</option>
                                </select>

                                {/* View toggle (icons only) */}
                                <div className="flex items-center gap-1 bg-white border-2 border-gray-200 rounded-xl p-1 w-fit">
                                    <button
                                        type="button"
                                        title="Card view"
                                        aria-label="Card view"
                                        onClick={() => setViewMode('cards')}
                                        className={`p-2 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                                    >
                                        <LayoutGrid size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        title="List view"
                                        aria-label="List view"
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                                    >
                                        <List size={18} />
                                    </button>
                                </div>
                            </div>
                            {userRole === 'admin' && (
                                <Button
                                    onClick={() => {
                                        setIsEditing(false);
                                        resetForm();
                                        setIsModalOpen(true);
                                    }}
                                    variant="primary"
                                    className="text-sm flex items-center gap-2 justify-center"
                                >
                                    <Plus size={18} />
                                    Schedule Game
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                        <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border-l-4 border-blue-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xl sm:text-2xl font-bold text-blue-600">{filteredGames.length}</div>
                                    <div className="text-xs sm:text-sm text-blue-600">Total Games</div>
                                </div>
                                <Trophy className="text-blue-500" size={20} />
                            </div>
                        </div>
                        <div className="bg-green-50 rounded-xl p-3 sm:p-4 border-l-4 border-green-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xl sm:text-2xl font-bold text-green-600">{upcomingGames.length}</div>
                                    <div className="text-xs sm:text-sm text-green-600">Upcoming</div>
                                </div>
                                <TrendingUp className="text-green-500" size={20} />
                            </div>
                        </div>
                        <div className="bg-yellow-50 rounded-xl p-3 sm:p-4 border-l-4 border-yellow-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xl sm:text-2xl font-bold text-yellow-600">{todayGames.length}</div>
                                    <div className="text-xs sm:text-sm text-yellow-600">Today</div>
                                </div>
                                <Star className="text-yellow-500" size={20} />
                            </div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3 sm:p-4 border-l-4 border-purple-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xl sm:text-2xl font-bold text-purple-600">{completedGames.length}</div>
                                    <div className="text-xs sm:text-sm text-purple-600">Completed</div>
                                </div>
                                <Trophy className="text-purple-500" size={20} />
                            </div>
                        </div>
                    </div>

                  

                    {/* Bulk Selection Actions (Admin only) */}
                    {userRole === 'admin' && currentItems.length > 0 && (
                        <div className="mb-4 bg-gray-50 border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="text-sm text-gray-700 font-medium">
                                Selected: <span className="font-bold">{selectedGameIds.length}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                    onClick={() => handleSelectAllOnPage(currentPageGameIds)}
                                    variant="outline"
                                    className="text-sm"
                                >
                                    {allSelectedOnPage ? 'Unselect Page' : 'Select Page'}
                                </Button>
                                <Button
                                    onClick={clearSelectedGames}
                                    variant="secondary"
                                    className="text-sm"
                                    disabled={selectedGameIds.length === 0}
                                >
                                    Clear Selection
                                </Button>
                                <Button
                                    onClick={handleBulkDeleteSelectedGames}
                                    variant="danger"
                                    className="text-sm flex items-center gap-2 justify-center"
                                    disabled={selectedGameIds.length === 0 || loading}
                                >
                                    <Trash2 size={16} />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Games (Card or List view) */}
                    {currentItems.length > 0 ? (
                        viewMode === 'list' ? (
                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                {/* Header row */}
                                <div className="hidden sm:grid grid-cols-12 gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600 border-b">
                                    <div className="col-span-1">{userRole === 'admin' ? ' ' : ' '}</div>
                                    <div className="col-span-2">Date</div>
                                    <div className="col-span-2">Time</div>
                                    <div className="col-span-3">Match</div>
                                    <div className="col-span-1">Sport</div>
                                    <div className="col-span-2">Age</div>
                                    <div className="col-span-1 text-right">Actions</div>
                                </div>

                                <div className="divide-y">
                                    {currentItems.map((game) => {
                                        const gameAgeGroups = game.ageGroups || (game.ageGroup ? game.ageGroup.split(', ') : []);
                                        const canRemind = isUpcoming(game.date, game.time) && game.status === 'Scheduled';

                                        const openEdit = () => {
                                            if (userRole !== 'admin') return;
                                            setSelectedGame(game);
                                            setFormData({
                                                team1Id: game.team1Id || '',
                                                team1Name: game.team1Name || game.team1 || '',
                                                team2Id: game.team2Id || '',
                                                team2Name: game.team2Name || game.team2 || '',
                                                date: game.date,
                                                time: game.time,
                                                location: game.location,
                                                sport: game.sport,
                                                ageGroups: gameAgeGroups,
                                                status: game.status,
                                                coachId: game.coachId || '',
                                                coachName: game.coachName || 'TBD',
                                                notes: game.notes || 'Arrive 30 minutes early with full uniform and gear.',
                                                season: game.season || '2024-25'
                                            });
                                            setIsEditing(true);
                                            setIsModalOpen(true);
                                        };

                                        return (
                                            <div
                                                key={game.id}
                                                className={`grid grid-cols-1 sm:grid-cols-12 gap-3 px-4 py-4 bg-white hover:bg-gray-50 transition-colors cursor-pointer ${selectedGameIds.includes(game.id) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                                                onClick={openEdit}
                                            >
                                                {/* Select */}
                                                <div className="sm:col-span-1 flex items-start">
                                                    {userRole === 'admin' && (
                                                        <label
                                                            className="flex items-center gap-2 cursor-pointer select-none"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedGameIds.includes(game.id)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={() => toggleGameSelection(game.id)}
                                                                className="h-4 w-4 cursor-pointer"
                                                                aria-label="Select game"
                                                            />
                                                        </label>
                                                    )}
                                                </div>

                                                {/* Date */}
                                                <div className="sm:col-span-2">
                                                    <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                                        <Calendar size={14} className="text-blue-500" />
                                                        <span>{game.date}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${getStatusColor(game.status)}`}>
                                                            {game.status}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Time */}
                                                <div className="sm:col-span-2">
                                                    <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                                        <Clock size={14} className="text-green-500" />
                                                        <span>{game.time}</span>
                                                    </div>
                                                    <div className="text-xs text-blue-600 mt-1 truncate" title={game.location}>
                                                        <span className="inline-flex items-center gap-1">
                                                            <MapPin size={12} />
                                                            {game.location}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Match */}
                                                <div className="sm:col-span-3">
                                                    <div className="text-sm font-bold text-gray-900 truncate">
                                                        {game.team1 || game.team1Name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-semibold">vs</div>
                                                    <div className="text-sm font-bold text-gray-900 truncate">
                                                        {game.team2 || game.team2Name}
                                                    </div>
                                                </div>

                                                {/* Sport */}
                                                <div className="sm:col-span-1">
                                                    <div className="text-sm font-semibold text-gray-800">
                                                        <span className="mr-1">{getSportIcon(game.sport)}</span>
                                                        <span className="hidden sm:inline">{/* keep compact */}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-600 mt-1 truncate" title={game.sport}>
                                                        {game.sport}
                                                    </div>
                                                </div>

                                                {/* Age Groups */}
                                                <div className="sm:col-span-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {gameAgeGroups.slice(0, 4).map((ag, idx) => (
                                                            <span
                                                                key={`${ag}-${idx}`}
                                                                className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                                            >
                                                                {ag}
                                                            </span>
                                                        ))}
                                                        {gameAgeGroups.length > 4 && (
                                                            <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                                                                +{gameAgeGroups.length - 4}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="sm:col-span-1 flex items-center justify-start sm:justify-end gap-2">
                                                    {canRemind && (
                                                        <button
                                                            type="button"
                                                            title="Send reminder"
                                                            aria-label="Send reminder"
                                                            onClick={(e) => handleSendGameReminder(game, e)}
                                                            className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                                            disabled={loading}
                                                        >
                                                            <Bell size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        title="View details"
                                                        aria-label="View details"
                                                        onClick={(e) => handleViewDetails(game, e)}
                                                        className="p-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                                                    >
                                                        <Trophy size={16} />
                                                    </button>
                                                    {userRole === 'admin' && (
                                                        <button
                                                            type="button"
                                                            title="Edit"
                                                            aria-label="Edit"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openEdit();
                                                            }}
                                                            className="p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-3 gap-4 sm:gap-6">
                                {currentItems.map((game) => (
                                    <div
                                        key={game.id}
                                        className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200 overflow-hidden cursor-pointer ${selectedGameIds.includes(game.id) ? 'ring-2 ring-blue-500' : ''}`}
                                        onClick={() => {
                                            if (userRole === 'admin') {
                                                setSelectedGame(game);
                                                // ENHANCED: Parse age groups from stored format
                                                const gameAgeGroups = game.ageGroups || (game.ageGroup ? game.ageGroup.split(', ') : []);
                                                setFormData({
                                                    team1Id: game.team1Id || '',
                                                    team1Name: game.team1Name || game.team1 || '',
                                                    team2Id: game.team2Id || '',
                                                    team2Name: game.team2Name || game.team2 || '',
                                                    date: game.date,
                                                    time: game.time,
                                                    location: game.location,
                                                    sport: game.sport,
                                                    ageGroups: gameAgeGroups, // Set as array
                                                    status: game.status,
                                                    coachId: game.coachId || '',
                                                    coachName: game.coachName || 'TBD',
                                                    notes: game.notes || 'Arrive 30 minutes early with full uniform and gear.',
                                                    season: game.season || '2024-25'
                                                });
                                                setIsEditing(true);
                                                setIsModalOpen(true);
                                            }
                                        }}
                                    >
                                    {/* Header with Status and Sport */}
                                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 sm:p-4 text-white relative">
                                        {/* Status Badges */}
                                        {isToday(game.date) && (
                                            <div className="absolute top-2 left-2 z-20 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                                                TODAY
                                            </div>
                                        )}
                                        {isTomorrow(game.date) && !isToday(game.date) && (
                                            <div className="absolute top-2 left-2 z-20 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                                TOMORROW
                                            </div>
                                        )}
                                        {isUpcoming(game.date, game.time) && game.status === 'Scheduled' && !isToday(game.date) && !isTomorrow(game.date) && (
                                            <div className="absolute top-2 left-2 z-20 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                                UPCOMING
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl sm:text-2xl">{getSportIcon(game.sport)}</span>
                                                <span className="font-semibold text-sm sm:text-base">{game.sport}</span>
                                            </div>
                                            <div className="flex flex-col gap-1 sm:gap-2 items-end">
                                                {/* Selection checkbox (Admin only) - inline to avoid covering UI */}
                                                {userRole === 'admin' && (
                                                    <div
                                                        className="bg-white/20 hover:bg-white/30 rounded-lg px-2 py-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedGameIds.includes(game.id)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={() => toggleGameSelection(game.id)}
                                                                className="h-4 w-4 cursor-pointer"
                                                                aria-label="Select game"
                                                            />
                                                            <span className="text-xs font-semibold">Select</span>
                                                        </label>
                                                    </div>
                                                )}

                                                {/* ENHANCED: Display multiple age groups */}
                                                <div className="flex flex-wrap gap-1">
                                                    {(game.ageGroups || (game.ageGroup ? game.ageGroup.split(', ') : [])).map((ageGroup, index) => (
                                                        <span key={index} className="bg-white/20 px-1.5 sm:px-2 py-1 rounded-full text-xs font-bold">
                                                            {ageGroup}
                                                        </span>
                                                    ))}
                                                </div>
                                                <span className={`px-1.5 sm:px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(game.status)}`}>
                                                    {game.status}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Team vs Team */}
                                        <div className="text-center">
                                            <div className="text-sm sm:text-sm font-bold mb-1 truncate">
                                                {game.team1 || game.team1Name}
                                            </div>
                                            <div className="text-xs sm:text-sm opacity-90 mb-1">vs</div>
                                            <div className="text-sm sm:text-sm font-bold truncate">
                                                {game.team2 || game.team2Name}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Game Details */}
                                    <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                                        {/* Date and Time Row */}
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1 sm:gap-2 text-gray-600">
                                                <Calendar size={14} className="text-blue-500 flex-shrink-0" />
                                                <span className="text-xs sm:text-sm font-medium truncate">{game.date}</span>
                                            </div>
                                            <div className="flex items-center gap-1 sm:gap-2 text-gray-600">
                                                <Clock size={14} className="text-green-500 flex-shrink-0" />
                                                <span className="text-xs sm:text-sm font-medium">{game.time}</span>
                                            </div>
                                        </div>

                                        {/* Location */}
                                        <div
                                            className="flex items-center gap-1 sm:gap-2 text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(`https://maps.google.com/?q=${encodeURIComponent(game.location)}`, '_blank');
                                            }}
                                        >
                                            <MapPin size={14} className="flex-shrink-0" />
                                            <span className="text-xs sm:text-sm font-medium underline truncate">{game.location}</span>
                                        </div>

                                        {/* Coach */}
                                        <div className="flex items-center gap-1 sm:gap-2 text-gray-600">
                                            <Users size={14} className="text-purple-500 flex-shrink-0" />
                                            <span className="text-xs sm:text-sm truncate">
                                                Coach: {game.coachName || 'TBD'}
                                                {game.coachId && (
                                                    <span className="ml-1 bg-green-200 text-green-800 px-1 py-0.5 rounded text-xs">✓</span>
                                                )}
                                            </span>
                                        </div>

                                        {/* Notes */}
                                        <div className="border-t pt-2 sm:pt-3 mt-2 sm:mt-3">
                                            <div className="text-xs text-gray-500 mb-1 font-medium">NOTES</div>
                                            <div className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-2 rounded line-clamp-2">
                                                {game.notes || 'Arrive 30 minutes early with full uniform and gear.'}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-1 sm:gap-2 pt-2">
                                            {isUpcoming(game.date, game.time) && game.status === 'Scheduled' && (
                                                <button
                                                    onClick={(e) => handleSendGameReminder(game, e)}
                                                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                                                    disabled={loading}
                                                >
                                                    <Bell size={10} />
                                                    <span className="hidden sm:inline">Remind</span>
                                                    <span className="sm:hidden">📱</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleViewDetails(game, e)}
                                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                                            >
                                                <Trophy size={10} />
                                                <span className="hidden sm:inline">Details</span>
                                                <span className="sm:hidden">👁️</span>
                                            </button>
                                            {userRole === 'admin' && (
                                                <button className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition-colors flex items-center justify-center gap-1">
                                                    <Edit size={10} />
                                                    <span className="hidden sm:inline">Edit</span>
                                                    <span className="sm:hidden">✏️</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Mobile Notification Indicator */}
                                    <div className="bg-gradient-to-r from-green-100 to-blue-100 text-center py-1 text-xs font-medium text-gray-700">
                                        📱 Multi-age group notifications enabled
                                    </div>
                                </div>
                            ))}
                            </div>
                        )
                    ) : (
                        <div className="text-center py-12">
                            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-base sm:text-lg font-medium text-gray-600 mb-2">
                                {userRole === 'coach' ? 'No Games Assigned' : 'No Games Scheduled'}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
                                {filteredGames.length === 0
                                    ? userRole === 'coach'
                                        ? "You don't have any games assigned to you that match the current filters."
                                        : "No games match your current filters or search criteria."
                                    : "All games are filtered out."}
                            </p>
                            {userRole === 'admin' && (
                                <Button
                                    onClick={() => {
                                        setIsEditing(false);
                                        resetForm();
                                        setIsModalOpen(true);
                                    }}
                                    variant="primary"
                                    className="flex items-center gap-2 mx-auto"
                                >
                                    <Plus size={20} />
                                    Schedule New Game
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center mt-6 pt-6 border-t border-gray-200">
                            <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                                Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
                            </div>
                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="p-1.5 sm:p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="First Page"
                                >
                                    <ChevronsLeft size={14} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 sm:p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Previous Page"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 border border-gray-200 rounded-md">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 sm:p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Next Page"
                                >
                                    <ChevronRight size={14} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 sm:p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Last Page"
                                >
                                    <ChevronsRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Game Details Modal */}
                <Modal
                    isOpen={showDetailsModal}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedGameDetails(null);
                    }}
                    title="Game Details"
                    size="xl"
                >
                    {selectedGameDetails && (
                        <div className="space-y-6">
                            {/* Game Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 sm:p-6 text-white">
                                <div className="text-center">
                                    <div className="text-2xl sm:text-3xl mb-2">{getSportIcon(selectedGameDetails.sport)}</div>
                                    <h2 className="text-lg sm:text-2xl font-bold mb-2">
                                        {selectedGameDetails.team1 || selectedGameDetails.team1Name}
                                        <span className="mx-2 sm:mx-4 text-base sm:text-lg">vs</span>
                                        {selectedGameDetails.team2 || selectedGameDetails.team2Name}
                                    </h2>
                                    <div className="flex flex-wrap justify-center gap-2 sm:gap-4 text-xs sm:text-sm opacity-90">
                                        <span>{selectedGameDetails.sport}</span>
                                        <span>•</span>
                                        {/* ENHANCED: Display multiple age groups */}
                                        <span>{(selectedGameDetails.ageGroups || (selectedGameDetails.ageGroup ? selectedGameDetails.ageGroup.split(', ') : [])).join(', ')}</span>
                                        <span>•</span>
                                        <span className={`px-2 py-1 rounded-full ${getStatusColor(selectedGameDetails.status)}`}>
                                            {selectedGameDetails.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Game Information Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                {/* Date & Time Info */}
                                <div className="space-y-4">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                                        <Calendar className="text-blue-500" size={18} />
                                        Schedule Information
                                    </h3>

                                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Date:</span>
                                            <span className="font-medium">{selectedGameDetails.date}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Time:</span>
                                            <span className="font-medium">{selectedGameDetails.time}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Season:</span>
                                            <span className="font-medium">{selectedGameDetails.season || '2024-25'}</span>
                                        </div>
                                        {/* ENHANCED: Age Groups display */}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Age Groups:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {(selectedGameDetails.ageGroups || (selectedGameDetails.ageGroup ? selectedGameDetails.ageGroup.split(', ') : [])).map((ageGroup, index) => (
                                                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                                        {ageGroup}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Status:</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedGameDetails.status)}`}>
                                                {selectedGameDetails.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Location & Coach Info */}
                                <div className="space-y-4">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                                        <MapPin className="text-green-500" size={18} />
                                        Location & Staff
                                    </h3>

                                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-3">
                                        <div className="space-y-2">
                                            <span className="text-gray-600 text-sm">Location:</span>
                                            <div
                                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 cursor-pointer"
                                                onClick={() => {
                                                    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(selectedGameDetails.location)}`;
                                                    window.open(mapsUrl, '_blank');
                                                }}
                                            >
                                                <MapPin size={16} />
                                                <span className="font-medium underline text-sm">{selectedGameDetails.location}</span>
                                            </div>
                                        </div>

                                        {/* Coach details */}
                                        <div className="space-y-2">
                                            <span className="text-gray-600 text-sm">Game Official:</span>
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">{selectedGameDetails.coachName || 'TBD'}</span>
                                                {selectedGameDetails.coachId && (
                                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                                        ✓ Assigned
                                                    </span>
                                                )}
                                                {!selectedGameDetails.coachId && selectedGameDetails.coachName !== 'TBD' && (
                                                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                                                        Custom
                                                    </span>
                                                )}
                                                {selectedGameDetails.coachName === 'TBD' && (
                                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                                        ⚠️ Unassigned
                                                    </span>
                                                )}
                                            </div>

                                            {/* Show coach details if available */}
                                            {selectedGameDetails.coachId && (() => {
                                                const coach = coaches.find(c => c.id === selectedGameDetails.coachId);
                                                if (coach) {
                                                    return (
                                                        <div className="bg-blue-50 rounded-lg p-2 mt-2">
                                                            <div className="text-xs text-blue-700 space-y-1">
                                                                <div>📧 {coach.email}</div>
                                                                {coach.phone && <div>📞 {coach.phone}</div>}
                                                                <div>🏆 Primary: {coach.primarySport}</div>
                                                                {coach.yearsExperience && <div>⭐ {coach.yearsExperience} years experience</div>}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Game Instructions/Notes */}
                            <div>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <Bell className="text-yellow-500" size={18} />
                                    Game Instructions
                                </h3>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                                    <p className="text-sm sm:text-base text-gray-700">
                                        {selectedGameDetails.notes || 'Arrive 30 minutes early with full uniform and gear.'}
                                    </p>
                                </div>
                            </div>

                            {/* Team Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                                    <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">Home Team</h4>
                                    <p className="text-blue-700 text-sm sm:text-base">{selectedGameDetails.team1 || selectedGameDetails.team1Name}</p>
                                    {selectedGameDetails.team1Id && (
                                        <p className="text-xs sm:text-sm text-blue-600">Team ID: {selectedGameDetails.team1Id}</p>
                                    )}
                                    {!selectedGameDetails.team1Id && (
                                        <p className="text-xs sm:text-sm text-blue-600 italic">Custom team name</p>
                                    )}
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                                    <h4 className="font-semibold text-green-800 mb-2 text-sm sm:text-base">Away Team</h4>
                                    <p className="text-green-700 text-sm sm:text-base">{selectedGameDetails.team2 || selectedGameDetails.team2Name}</p>
                                    {selectedGameDetails.team2Id && (
                                        <p className="text-xs sm:text-sm text-green-600">Team ID: {selectedGameDetails.team2Id}</p>
                                    )}
                                    {!selectedGameDetails.team2Id && (
                                        <p className="text-xs sm:text-sm text-green-600 italic">Custom team name</p>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t">
                                <Button
                                    onClick={() => {
                                        const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(selectedGameDetails.location)}`;
                                        window.open(mapsUrl, '_blank');
                                    }}
                                    variant="secondary"
                                    className="flex items-center gap-2 justify-center text-sm"
                                >
                                    <MapPin size={16} />
                                    Get Directions
                                </Button>

                                {isUpcoming(selectedGameDetails.date, selectedGameDetails.time) && selectedGameDetails.status === 'Scheduled' && (
                                    <Button
                                        onClick={() => handleSendGameReminder(selectedGameDetails)}
                                        variant="primary"
                                        className="flex items-center gap-2 justify-center text-sm"
                                    >
                                        <Bell size={16} />
                                        Send Reminder
                                    </Button>
                                )}

                                {userRole === 'admin' && (
                                    <Button
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            setSelectedGame(selectedGameDetails);
                                            const gameAgeGroups = selectedGameDetails.ageGroups || (selectedGameDetails.ageGroup ? selectedGameDetails.ageGroup.split(', ') : []);
                                            setFormData({
                                                team1Id: selectedGameDetails.team1Id || '',
                                                team1Name: selectedGameDetails.team1Name || selectedGameDetails.team1 || '',
                                                team2Id: selectedGameDetails.team2Id || '',
                                                team2Name: selectedGameDetails.team2Name || selectedGameDetails.team2 || '',
                                                date: selectedGameDetails.date,
                                                time: selectedGameDetails.time,
                                                location: selectedGameDetails.location,
                                                sport: selectedGameDetails.sport,
                                                ageGroups: gameAgeGroups,
                                                status: selectedGameDetails.status,
                                                coachId: selectedGameDetails.coachId || '',
                                                coachName: selectedGameDetails.coachName || 'TBD',
                                                notes: selectedGameDetails.notes || 'Arrive 30 minutes early with full uniform and gear.',
                                                season: selectedGameDetails.season || '2024-25'
                                            });
                                            setIsEditing(true);
                                            setIsModalOpen(true);
                                        }}
                                        variant="secondary"
                                        className="flex items-center gap-2 justify-center text-sm"
                                    >
                                        <Edit size={16} />
                                        Edit Game
                                    </Button>
                                )}

                                <Button
                                    onClick={() => {
                                        setShowDetailsModal(false);
                                        setSelectedGameDetails(null);
                                    }}
                                    variant="secondary"
                                    className="text-sm"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* ENHANCED: Game Modal with Multi-Age Group Selection */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setIsEditing(false);
                        setSelectedGame(null);
                    }}
                    title={isEditing ? 'Edit Game' : 'Schedule New Game'}
                    size="xl"
                >
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Team 1 Selection */}
                            <Autocomplete
                                label="Team 1 (Home Team)"
                                options={getEligibleRosters()}
                                value={formData.team1Name || formData.team1Id}
                                onChange={handleTeam1Change}
                                placeholder="Select team or enter custom team name"
                                getOptionLabel={(roster) =>
                                    `${roster.teamName} (${roster.status === 'needs-players' ? 'recruiting' : `${roster.playerCount} players`})`
                                }
                                getOptionValue={(roster) => roster.id}
                                allowCustomInput={userRole === 'admin'}
                                required
                            />

                            {/* Team 2 Selection */}
                            <Autocomplete
                                label="Team 2 (Away Team)"
                                options={getTeam2Options()}
                                value={formData.team2Name || formData.team2Id}
                                onChange={handleTeam2Change}
                                placeholder={formData.team1Name ? 'Select team or enter custom team name' : 'Select Home Team First'}
                                getOptionLabel={(roster) =>
                                    `${roster.teamName} (${roster.status === 'needs-players' ? 'recruiting' : `${roster.playerCount} players`})`
                                }
                                getOptionValue={(roster) => roster.id}
                                allowCustomInput={userRole === 'admin'}
                                disabled={!formData.team1Name}
                                required
                            />

                            {/* Date */}
                            <div>
                                <CustomDatePicker
                                    label="Game Date"
                                    value={formData.date}
                                    onChange={(value) => {
                                        console.log('Date changed:', value);
                                        setFormData({ ...formData, date: value || '' });
                                    }}
                                    textpadding="14px"
                                    placeholder="mm-dd-yyyy"
                                    required
                                    helperText="Select the date for the game"
                                    minDate={dayjs().format('MM-DD-YYYY')}
                                    format="MM-DD-YYYY"
                                    className="w-full"
                                />
                            </div>

                            {/* Time */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Time <span className="pl-1 text-red-500">*</span></label>
                                <input
                                    type="time"
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                                    required
                                />
                            </div>

                            {/* Sport */}
                            <Autocomplete
                                label="Sport"
                                options={sports}
                                value={formData.sport}
                                onChange={(value) => setFormData({ ...formData, sport: value })}
                                placeholder="Select Sport"
                                getOptionLabel={(sport) => `${getSportIcon(sport)} ${sport}`}
                                getOptionValue={(sport) => sport}
                            />

                            {/* ENHANCED: Multiple Age Groups Selection */}
                            <Autocomplete
                                label="Age Groups"
                                options={ageGroups}
                                value={formData.ageGroups}
                                onChange={(value) => {
                                    console.log('Age groups changed:', value);
                                    setFormData({ ...formData, ageGroups: Array.isArray(value) ? value : [value] });
                                }}
                                placeholder="Select Age Groups/Grade (multiple allowed)"
                                getOptionLabel={(group) => group}
                                getOptionValue={(group) => group}
                                multiple={true} // Enable multiple selection
                                required
                            />

                            {/* Location */}
                            <Autocomplete
                                label="Game Location"
                                options={locations}
                                value={formData.location}
                                onChange={(value) => setFormData({ ...formData, location: value })}
                                placeholder="Select location or enter custom location"
                                getOptionLabel={(location) => location}
                                getOptionValue={(location) => location}
                                allowCustomInput={userRole === 'admin'}
                                required
                            />

                            {/* Coach Selection */}
                            <Autocomplete
                                label="Game Official/Coach"
                                options={getEligibleCoaches()}
                                value={formData.coachName}
                                onChange={handleCoachChange}
                                placeholder="Select coach or enter custom name"
                                getOptionLabel={(coach) => {
                                    const isPrimaryMatch = coach.primarySport === formData.sport;
                                    const isSecondaryMatch = coach.secondarySports?.includes(formData.sport);
                                    const matchIndicator = isPrimaryMatch ? ' 🏆' : isSecondaryMatch ? ' 🥉' : '';
                                    return `${coach.firstName} ${coach.lastName}${matchIndicator} (${coach.primarySport})`;
                                }}
                                getOptionValue={(coach) => coach.id}
                                allowCustomInput={userRole === 'admin'}
                                renderOption={(coach) => (
                                    <div className="flex justify-between items-center w-full">
                                        <div>
                                            <div className="font-medium">
                                                {coach.firstName} {coach.lastName}
                                                {coach.primarySport === formData.sport && (
                                                    <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                                        Perfect Match
                                                    </span>
                                                )}
                                                {coach.secondarySports?.includes(formData.sport) && coach.primarySport !== formData.sport && (
                                                    <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                                        Secondary Sport
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                Primary: {coach.primarySport}
                                                {coach.yearsExperience && ` • ${coach.yearsExperience} years exp.`}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {coach.assignedTeams?.length || 0} teams
                                        </div>
                                    </div>
                                )}
                            />

                            {/* Game Status */}
                            <Autocomplete
                                label="Game Status"
                                options={gameStatuses}
                                value={formData.status}
                                onChange={(value) => setFormData({ ...formData, status: value })}
                                placeholder="Select Game Status"
                                getOptionLabel={(status) => status}
                                getOptionValue={(status) => status}
                            />
                        </div>

                        {/* ENHANCED: Game Preview with Multiple Age Groups */}
                        {formData.team1Name && formData.team2Name && formData.ageGroups.length > 0 && (
                            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-4 border">
                                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm sm:text-base">
                                    🏆 Game Preview
                                </h4>
                                <div className="text-center">
                                    <div className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
                                        {formData.team1Name} vs. {formData.team2Name}
                                    </div>
                                    <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                                        <span>{formData.sport}</span>
                                        <span>•</span>
                                        <div className="flex flex-wrap gap-1">
                                            {formData.ageGroups.map((ageGroup, index) => (
                                                <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                                    {ageGroup}
                                                </span>
                                            ))}
                                        </div>
                                        {formData.date && (
                                            <>
                                                <span>•</span>
                                                <span>{formData.date}</span>
                                            </>
                                        )}
                                        {formData.time && (
                                            <>
                                                <span>•</span>
                                                <span>{formData.time}</span>
                                            </>
                                        )}
                                    </div>
                                    {formData.location && (
                                        <div className="text-xs sm:text-sm text-blue-600 mt-1">📍 {formData.location}</div>
                                    )}
                                    {formData.coachName && formData.coachName !== 'TBD' && (
                                        <div className="text-xs sm:text-sm text-purple-600 mt-1">
                                            👨‍🏫 Official: {formData.coachName}
                                            {formData.coachId && <span className="ml-1 text-green-600">✓</span>}
                                        </div>
                                    )}
                                    {formData.ageGroups.length > 1 && (
                                        <div className="text-xs sm:text-sm text-green-600 mt-2 font-medium">
                                            📱 Notifications will be sent to all {formData.ageGroups.length} age groups
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Game Instructions</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                                rows="3"
                                placeholder="Arrive 30 minutes early with full uniform and gear."
                            />
                        </div>

                        {/* Modal Actions */}
                        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                            <Button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setIsEditing(false);
                                    setSelectedGame(null);
                                }}
                                variant="secondary"
                                className="order-last sm:order-first text-sm"
                            >
                                Cancel
                            </Button>

                            {isEditing && selectedGame && (
                                <>
                                    <Button
                                        onClick={handleSendReminder}
                                        variant="secondary"
                                        className="flex items-center gap-2 justify-center text-sm"
                                    >
                                        <Bell size={16} />
                                        Send Reminder
                                    </Button>

                                    {selectedGame.status !== 'Cancelled' && (
                                        <Button
                                            onClick={handleCancelGame}
                                            variant="danger"
                                            className="flex items-center gap-2 justify-center text-sm"
                                        >
                                            <X size={16} />
                                            Cancel Game
                                        </Button>
                                    )}
                                </>
                            )}

                            {isEditing && userRole === 'admin' && (
                                <Button
                                    onClick={() => handleDeleteGame(selectedGame.id)}
                                    variant="danger"
                                    className="flex items-center gap-2 justify-center text-sm"
                                >
                                    <Trash2 size={16} />
                                    Delete Game
                                </Button>
                            )}

                            {userRole === 'admin' && (
                                <Button
                                    onClick={isEditing ? handleUpdateGame : handleAddGame}
                                    variant="primary"
                                    disabled={!formData.team1Name || !formData.team2Name || formData.ageGroups.length === 0}
                                    className="flex items-center gap-2 justify-center text-sm"
                                >
                                    {isEditing ? <Edit size={16} /> : <Plus size={16} />}
                                    {isEditing ? 'Update Game' : 'Schedule Game'}
                                </Button>
                            )}
                        </div>
                    </div>
                </Modal>
            </div>
        </div>
    );
};

export default GameSchedule;