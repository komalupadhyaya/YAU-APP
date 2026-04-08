import React, { useState, useEffect, useRef } from 'react';
import Header from '../layout/Header';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Table, { TableRow, TableCell } from '../common/Table';
import { getCoaches, addCoach, updateCoach, deleteCoach, getLocations, bulkDeleteCoaches } from '../../firebase/firestore';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Plus, Edit, Trash2, Search, UserCheck, UserPlus, Trophy, EyeOff, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Calendar, Clock, MapPin, FileText, CheckCircle, XCircle, Send, DollarSign, Banknote } from 'lucide-react';
import { Autocomplete } from '../common/AutoComplete';
import { adminTimesheetApi } from '../../firebase/apis/adminTimesheetApi';
import AssignmentsSection from './AssignmentsSection';
import dayjs from 'dayjs';
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const Coaches = () => {
  const [coaches, setCoaches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState(null);
  const [assigningCoach, setAssigningCoach] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCoachIds, setSelectedCoachIds] = useState([]);
  const [isAddingCoach, setIsAddingCoach] = useState(false);
  const selectAllRef = useRef(null);

  // Timesheet modal state
  const [isTimesheetModalOpen, setIsTimesheetModalOpen] = useState(false);
  const [selectedCoachForTimesheets, setSelectedCoachForTimesheets] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [timesheetLoading, setTimesheetLoading] = useState(false);
  const [timesheetSummary, setTimesheetSummary] = useState(null);
  const [selectedTimesheets, setSelectedTimesheets] = useState([]);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // NEW: Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'assignments'

  const [selectedWeek, setSelectedWeek] = useState(dayjs().startOf('week').add(1, 'day')); // Default to Monday of current week

  const [newCoach, setNewCoach] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    location: '',
    role: 'coach',
    primarySport: '',
    secondarySports: [],
    assignedTeams: [],
    experience: '',
    certifications: [],
    yearsExperience: '',
    hourlyRate: 0
  });

  // Assignment state - sport-specific
  const [assignmentData, setAssignmentData] = useState({
    primarySport: 'Soccer',
    assignedGroups: [],
    assignedLocations: [],
    secondarySports: []
  });

  const ageGroups = ['3U', '4U', '5U', '6U', '7U', '8U', '9U', '10U', '11U', '12U', '13U', '14U'];
  const sports = [
    'Soccer',
    'Basketball',
    'Baseball',
    'Track & Field',
    'Flag Football',
    'Tackle Football',
    'Kickball',
    'Golf',
    'Cheer'
  ];

  const itemsPerPageOptions = [5, 10, 25, 50];

  useEffect(() => {
    loadData();
  }, []);

  // NEW: Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Keep selections in sync with available data
  useEffect(() => {
    setSelectedCoachIds((prev) => prev.filter(id => coaches.some(coach => coach.id === id)));
  }, [coaches]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Debug: Check all users first
      const allUsersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = allUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      console.log('🔍 DEBUG: All users in collection:', allUsers);
      console.log('🔍 DEBUG: Users with role coach:', allUsers.filter(u => u.role === 'coach'));

      // Get coaches and locations
      const [coachesData, locationsData] = await Promise.all([
        getCoaches(),
        getLocations()
      ]);
      console.log('✅ Loaded coaches data:', coachesData);
      console.log('✅ Loaded locations data:', locationsData);

      try {
        const tsResponse = await adminTimesheetApi.getAllTimesheets({ status: 'approved', limit: 10000 });
        const approvedTimesheets = Array.isArray(tsResponse.data) ? tsResponse.data : (tsResponse.data?.timesheets || []);
        const coachPayMap = {};
        approvedTimesheets.forEach(ts => {
          coachPayMap[ts.coachId] = (coachPayMap[ts.coachId] || 0) + (ts.totalHours || 0);
        });

        coachesData.forEach(c => {
          c.totalApprovedPay = (coachPayMap[c.id] || 0) * (c.hourlyRate || 0);
        });
      } catch (err) {
        console.warn("Could not calculate total approved pay", err);
      }

      setCoaches(coachesData);
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
      setSelectedCoachIds([]);

    } catch (error) {
      console.error('❌ Error loading data:', error);

      // Fallback: Try direct query for coaches
      try {
        console.log('🔄 Trying fallback method...');
        const fallbackSnapshot = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'coach'))
        );
        const fallbackCoaches = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('🔄 Fallback coaches:', fallbackCoaches);
        setCoaches(fallbackCoaches);
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoach = async (e) => {
    e.preventDefault();
    try {
      setIsAddingCoach(true);
      console.log('➕ Adding coach with data:', newCoach);
      await addCoach(newCoach);
      setNewCoach({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'coach',
        primarySport: 'Soccer',
        password: '',
        secondarySports: [],
        assignedTeams: [],
        experience: '',
        certifications: [],
        yearsExperience: '',
        hourlyRate: 0
      });
      setIsAddModalOpen(false);
      loadData();
    } catch (error) {
      console.error('❌ Error adding coach:', error);
      alert('Error adding coach: ' + error.message);
    } finally {
      setIsAddingCoach(false);
    }
  };

  const handleEditCoach = async (e) => {
    e.preventDefault();
    try {
      console.log('✏️ Updating coach with data:', editingCoach);
      await updateCoach(editingCoach.id, editingCoach);
      setEditingCoach(null);
      loadData();
    } catch (error) {
      console.error('❌ Error updating coach:', error);
      alert('Error updating coach: ' + error.message);
    }
  };

  const handleDeleteCoach = async (id) => {
    if (window.confirm('Are you sure you want to delete this coach?')) {
      try {
        await deleteCoach(id);
        loadData();
      } catch (error) {
        console.error('❌ Error deleting coach:', error);
        alert('Error deleting coach: ' + error.message);
      }
    }
  };

  const toggleCoachSelection = (coachId) => {
    setSelectedCoachIds((prevSelected) =>
      prevSelected.includes(coachId)
        ? prevSelected.filter(id => id !== coachId)
        : [...prevSelected, coachId]
    );
  };

  const handleSelectAllOnPage = (coachIdsOnPage) => {
    const allSelected = coachIdsOnPage.every(id => selectedCoachIds.includes(id));
    if (allSelected) {
      setSelectedCoachIds(prev => prev.filter(id => !coachIdsOnPage.includes(id)));
    } else {
      const combined = new Set([...selectedCoachIds, ...coachIdsOnPage]);
      setSelectedCoachIds(Array.from(combined));
    }
  };

  const handleBulkDeleteCoaches = async () => {
    if (selectedCoachIds.length === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedCoachIds.length} selected coach(es)? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);
      await bulkDeleteCoaches(selectedCoachIds);
      setSelectedCoachIds([]);
      await loadData();
    } catch (error) {
      console.error('❌ Error bulk deleting coaches:', error);
      alert('Error deleting selected coaches: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Sport-specific assignment handlers
  const handleAssignCoach = (coach) => {
    setAssigningCoach(coach);
    setAssignmentData({
      primarySport: coach.primarySport || 'Soccer',
      assignedGroups: coach.assignedGroups || [],
      assignedLocations: coach.assignedLocations || [],
      secondarySports: coach.secondarySports || []
    });
    setIsAssignModalOpen(true);
  };

  // CORRECTED: Only assign to existing rosters - no creation
  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();

    if (!assignmentData.assignedGroups.length || !assignmentData.assignedLocations.length) {
      alert('Please select at least one age group and one location.');
      return;
    }

    try {
      console.log('👨‍🏫 Assigning coach to existing rosters only:', assignmentData);

      const batch = writeBatch(db);
      const assignedTeams = [];
      let rostersUpdated = 0;
      let rostersNotFound = 0;

      // For each location + age group combination
      for (const location of assignmentData.assignedLocations) {
        for (const ageGroup of assignmentData.assignedGroups) {
          // Create consistent roster ID format
          const rosterId = `${assignmentData.primarySport.toLowerCase().replace(/\s+/g, '-')}-${ageGroup.toLowerCase()}-${location.toLowerCase().replace(/\s+/g, '-')}`;

          const rosterRef = doc(db, 'rosters', rosterId);
          const rosterSnap = await getDoc(rosterRef);

          if (rosterSnap.exists()) {
            // ONLY update existing roster with coach - don't create new ones
            const existingRoster = rosterSnap.data();

            batch.update(rosterRef, {
              coachId: assigningCoach.id,
              coachName: `${assigningCoach.firstName} ${assigningCoach.lastName}`,
              hasAssignedCoach: true,
              status: existingRoster.hasPlayers ? 'active' : 'needs-players',
              lastUpdated: serverTimestamp(),
              updatedAt: serverTimestamp()
            });

            assignedTeams.push({
              id: rosterId,
              sport: assignmentData.primarySport,
              ageGroup: ageGroup,
              location: location,
              teamName: existingRoster.teamName || `${ageGroup} ${assignmentData.primarySport} - ${location}`,
              isPrimary: true,
              playerCount: existingRoster.playerCount || 0
            });

            rostersUpdated++;
            console.log(`✅ Updated existing roster: ${rosterId} (${existingRoster.playerCount || 0} players)`);

          } else {
            // Just log that roster doesn't exist - don't create it
            rostersNotFound++;
            console.log(`ℹ️ Roster not found (will be created when parents register): ${rosterId}`);
          }
        }
      }

      if (assignedTeams.length === 0) {
        alert(`❌ No existing rosters found for the selected combinations.

📋 Rosters are created automatically when parents register their children.
📍 Selected: ${assignmentData.assignedLocations.join(', ')}
🏆 Sport: ${assignmentData.primarySport}
👶 Age Groups: ${assignmentData.assignedGroups.join(', ')}

ℹ️ Once parents register for these combinations, you can assign this coach to those rosters.`);
        return;
      }

      // Update coach with assigned teams
      const coachRef = doc(db, 'users', assigningCoach.id);
      batch.update(coachRef, {
        primarySport: assignmentData.primarySport,
        secondarySports: assignmentData.secondarySports,
        assignedGroups: assignmentData.assignedGroups,
        assignedLocations: assignmentData.assignedLocations,
        assignedTeams: assignedTeams,
        updatedAt: serverTimestamp()
      });

      await batch.commit();

      setIsAssignModalOpen(false);
      setAssigningCoach(null);
      loadData();

      // Success message with details
      alert(`✅ Coach assigned to existing rosters only!

📊 Results:
- ${rostersUpdated} existing rosters updated with coach
- ${rostersNotFound} combinations had no existing rosters (normal - created when parents register)
- Total active assignments: ${assignedTeams.length}

🎯 Active rosters (with players): ${assignedTeams.filter(t => t.playerCount > 0).length}
⏳ Waiting for players: ${assignedTeams.filter(t => t.playerCount === 0).length}

✨ No new rosters were created - they'll be created automatically when parents register!`);

    } catch (error) {
      console.error('❌ Error assigning coach:', error);
      alert('Error assigning coach: ' + error.message);
    }
  };

  const handleAssignmentAgeGroupToggle = (ageGroup) => {
    const currentGroups = assignmentData.assignedGroups || [];
    const updatedGroups = currentGroups.includes(ageGroup)
      ? currentGroups.filter(group => group !== ageGroup)
      : [...currentGroups, ageGroup];

    setAssignmentData({ ...assignmentData, assignedGroups: updatedGroups });
  };

  // const handleAssignmentLocationToggle = (location) => {
  //   const currentLocations = assignmentData.assignedLocations || [];
  //   const updatedLocations = currentLocations.includes(location)
  //     ? currentLocations.filter(loc => loc !== location)
  //     : [...currentLocations, location];

  //   setAssignmentData({ ...assignmentData, assignedLocations: updatedLocations });
  // };

  const handleSecondarySportToggle = (sport) => {
    if (sport === assignmentData.primarySport) return;

    const currentSecondary = assignmentData.secondarySports || [];
    const updatedSecondary = currentSecondary.includes(sport)
      ? currentSecondary.filter(s => s !== sport)
      : [...currentSecondary, sport];

    setAssignmentData({ ...assignmentData, secondarySports: updatedSecondary });
  };

  const handleNewCoachSecondarySportToggle = (sport) => {
    if (sport === newCoach.primarySport) return;

    const currentSecondary = newCoach.secondarySports || [];
    const updatedSecondary = currentSecondary.includes(sport)
      ? currentSecondary.filter(s => s !== sport)
      : [...currentSecondary, sport];

    setNewCoach({ ...newCoach, secondarySports: updatedSecondary });
  };

  const handleEditCoachSecondarySportToggle = (sport) => {
    if (sport === editingCoach.primarySport) return;

    const currentSecondary = editingCoach.secondarySports || [];
    const updatedSecondary = currentSecondary.includes(sport)
      ? currentSecondary.filter(s => s !== sport)
      : [...currentSecondary, sport];

    setEditingCoach({ ...editingCoach, secondarySports: updatedSecondary });
  };

  const filteredCoaches = coaches.filter(coach => {
    const matchesSearch = `${coach.firstName || ''} ${coach.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (coach.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (coach.primarySport || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || (coach.status || 'pending') === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // NEW: Pagination logic
  const totalItems = filteredCoaches.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredCoaches.slice(startIndex, endIndex);
  const currentPageCoachIds = currentItems.map(coach => coach.id);
  const allCurrentSelected = currentPageCoachIds.length > 0 && currentPageCoachIds.every(id => selectedCoachIds.includes(id));
  const someCurrentSelected = currentPageCoachIds.some(id => selectedCoachIds.includes(id));

  // NEW: Pagination handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPage = (page) => setCurrentPage(page);

  const getPageNumbers = () => {
    const delta = 2;
    const pages = [];
    const startPage = Math.max(1, currentPage - delta);
    const endPage = Math.min(totalPages, currentPage + delta);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const getSportIcon = (sport) => {
    const icons = {
      'Soccer': '⚽',
      'Basketball': '🏀',
      'Baseball': '⚾',
      'Football': '🏈',
      'Track & Field': '🏃',
      'Tennis': '🎾',
      'Swimming': '🏊',
      'Volleyball': '🏐',
      'Wrestling': '🤼'
    };
    return icons[sport] || '🏆';
  };

  // Fetch timesheets for a coach
  const handleViewTimesheets = async (coach) => {
    try {
      setSelectedCoachForTimesheets(coach);
      setIsTimesheetModalOpen(true);
      setTimesheetLoading(true);
      setSelectedTimesheets([]); // Clear selection when opening modal

      const response = await adminTimesheetApi.getCoachTimesheets(coach.id, {
        page: 1,
        limit: 100, // Get all timesheets
      });

      const responseData = response.data || {};
      const timesheetsArray = responseData.timesheets || [];
      const summaryData = responseData.summary || {};

      setTimesheets(timesheetsArray);
      setTimesheetSummary(summaryData);
    } catch (error) {
      console.error('Failed to fetch coach timesheets:', error);
      alert('Failed to load timesheets');
      setTimesheets([]);
      setTimesheetSummary(null);
    } finally {
      setTimesheetLoading(false);
    }
  };

  // Handle checkbox selection for timesheets
  const handleSelectTimesheet = (timesheetId) => {
    setSelectedTimesheets((prev) =>
      prev.includes(timesheetId)
        ? prev.filter((id) => id !== timesheetId)
        : [...prev, timesheetId]
    );
  };

  // Handle select all timesheets
  const handleSelectAllTimesheets = () => {
    if (selectedTimesheets.length === timesheets.length) {
      setSelectedTimesheets([]);
    } else {
      setSelectedTimesheets(timesheets.map((ts) => ts.id));
    }
  };

  // Bulk approve handler for timesheets
  const handleBulkApproveTimesheets = async () => {
    if (selectedTimesheets.length === 0) {
      alert("Please select at least one timesheet");
      return;
    }

    try {
      const selectedEntries = timesheets.filter(ts => selectedTimesheets.includes(ts.id));
      const totalHours = selectedEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
      const hourlyRate = selectedCoachForTimesheets?.hourlyRate || 0;
      const totalPayout = totalHours * hourlyRate;

      const confirmMessage = `Approve ${selectedTimesheets.length} timesheet(s)?\n\n` +
        `Total Hours: ${totalHours}h\n` +
        `Hourly Rate: $${hourlyRate.toFixed(2)}/hr\n` +
        `Total Payout: $${totalPayout.toFixed(2)}\n\n` +
        `Do you want to proceed?`;

      if (!window.confirm(confirmMessage)) return;

      setBulkActionLoading(true);
      const result = await adminTimesheetApi.bulkApproveTimesheets(
        selectedTimesheets,
        ""
      );

      if (result.success) {
        const message = result.message || `Successfully approved ${result.data?.successful || 0} timesheet(s)`;
        alert(message);
        setSelectedTimesheets([]);
        // Refresh timesheets
        if (selectedCoachForTimesheets) {
          const response = await adminTimesheetApi.getCoachTimesheets(selectedCoachForTimesheets.id, {
            page: 1,
            limit: 100,
          });
          const responseData = response.data || {};
          setTimesheets(responseData.timesheets || []);
          setTimesheetSummary(responseData.summary || {});
        }
      } else {
        alert(`Error: ${result.message || "Failed to approve timesheets"}`);
      }
    } catch (error) {
      console.error("Failed to bulk approve timesheets:", error);
      alert(`Failed to approve timesheets: ${error.message}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk reject handler for timesheets
  const handleBulkRejectTimesheets = async () => {
    if (selectedTimesheets.length === 0) {
      alert("Please select at least one timesheet");
      return;
    }

    if (!rejectionReason || rejectionReason.trim() === "") {
      alert("Please provide a rejection reason");
      return;
    }

    try {
      setBulkActionLoading(true);
      const result = await adminTimesheetApi.bulkRejectTimesheets(
        selectedTimesheets,
        rejectionReason
      );

      if (result.success) {
        const message = result.message || `Successfully rejected ${result.data?.successful || 0} timesheet(s)`;
        alert(message);
        setSelectedTimesheets([]);
        setRejectionReason("");
        setIsRejectModalOpen(false);
        // Refresh timesheets
        if (selectedCoachForTimesheets) {
          const response = await adminTimesheetApi.getCoachTimesheets(selectedCoachForTimesheets.id, {
            page: 1,
            limit: 100,
          });
          const responseData = response.data || {};
          setTimesheets(responseData.timesheets || []);
          setTimesheetSummary(responseData.summary || {});
        }
      } else {
        alert(`Error: ${result.message || "Failed to reject timesheets"}`);
      }
    } catch (error) {
      console.error("Failed to bulk reject timesheets:", error);
      alert(`Failed to reject timesheets: ${error.message}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      submitted: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status] || statusStyles.submitted
          }`}
      >
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someCurrentSelected && !allCurrentSelected;
    }
  }, [someCurrentSelected, allCurrentSelected]);

  if (loading) {
    return (
      <div>
        <Header
          title="Coach Management"
          subtitle="Loading coaches..."
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading coaches data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Coach Management"
        subtitle="Manage all coaches and their sport-specific team assignments"
      />

      <div className="glass rounded-2xl p-6">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'list' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('list')}
          >
            Coach List
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'assignments' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('assignments')}
          >
            Assignments
          </button>
        </div>

        {activeTab === 'list' ? (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                All Coaches ({coaches.length})
                {coaches.length === 0 && (
                  <span className="text-red-500 text-sm font-normal ml-2">
                    (No coaches found - check if users have role: 'coach')
                  </span>
                )}
              </h3>

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search coaches by name, email or sport..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <select
                    className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm bg-white"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <Button
                  onClick={async () => {
                    try {
                      setLoading(true);

                      // Import both sync functions
                      const { syncAllRosters, syncParentsToRosters } = await import('../../firebase/firestore');

                      // Sync rosters first, then parents
                      await syncAllRosters();
                      const parentSyncResult = await syncParentsToRosters();

                      alert(`✅ Complete sync finished!
      
📊 Results:
- All rosters updated with current data
- ${parentSyncResult.parentsUpdated} parents automatically assigned
- ${parentSyncResult.newAssignments} new assignments made

All data is now synchronized!`);

                      loadData();
                    } catch (error) {
                      console.error('❌ Error syncing:', error);
                      alert('Failed to sync: ' + error.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  variant="secondary"
                >
                  🔄 Sync All Data
                </Button>
                <Button
                  onClick={handleBulkDeleteCoaches}
                  variant="danger"
                  disabled={selectedCoachIds.length === 0}
                  className="min-w-[170px]"
                >
                  <Trash2 size={18} className="mr-2" />
                  Delete Selected ({selectedCoachIds.length})
                </Button>

                <Button onClick={() => setIsAddModalOpen(true)}>
                  <Plus size={20} className="mr-2" />
                  Add Coach
                </Button>
              </div>
            </div>

            {/* NEW: Pagination controls */}
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-600">
                Showing {currentItems.length} of {totalItems} coaches
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {itemsPerPageOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
            </div>

            {coaches.length > 0 ? (
              <>
                <Table
                  headers={[
                    <div className="flex items-center" key="select-all">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allCurrentSelected}
                        aria-checked={someCurrentSelected && !allCurrentSelected ? 'mixed' : allCurrentSelected}
                        onChange={() => handleSelectAllOnPage(currentPageCoachIds)}
                        className="h-4 w-4 text-primary-600 rounded border-gray-300"
                      />
                    </div>,
                    'Actions',
                    'Status',
                    'Name',
                    'Email',
                    'Primary Sport',
                    'Teams Assigned',
                    'Location',
                    'Experience',
                    'Joined',
                    'Approved Pay'
                  ]}
                >
                  {currentItems.map((coach) => (
                    <TableRow key={coach.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedCoachIds.includes(coach.id)}
                          onChange={() => toggleCoachSelection(coach.id)}
                          className="h-4 w-4 text-primary-600 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewTimesheets(coach)}
                            className="p-1 text-indigo-600 hover:text-indigo-800"
                            title="View Timesheets"
                          >
                            <Calendar size={16} />
                          </button>
                          <button
                            onClick={() => handleAssignCoach(coach)}
                            className="p-1 text-purple-600 hover:text-purple-800"
                            title="Assign Teams"
                          >
                            <UserPlus size={16} />
                          </button>
                          <button
                            onClick={() => setEditingCoach(coach)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Edit Coach"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCoach(coach.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Delete Coach"
                          >
                            <Trash2 size={16} />
                          </button>
                          {coach.status === 'pending' && (
                            <div className="flex space-x-1">
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Approve coach ${coach.firstName} ${coach.lastName}?`)) {
                                    try {
                                      await updateCoach(coach.id, { status: 'approved' });
                                      loadData();
                                    } catch (error) {
                                      alert('Failed to approve coach: ' + error.message);
                                    }
                                  }
                                }}
                                className="p-1 text-green-600 hover:text-green-800"
                                title="Approve Coach"
                              >
                                <UserCheck size={16} />
                              </button>
                              <button
                                onClick={async () => {
                                  const reason = window.prompt(`Reject coach ${coach.firstName} ${coach.lastName}? Please provide a reason:`);
                                  if (reason !== null) {
                                    try {
                                      await updateCoach(coach.id, {
                                        status: 'rejected',
                                        rejectionReason: reason
                                      });
                                      loadData();
                                    } catch (error) {
                                      alert('Failed to reject coach: ' + error.message);
                                    }
                                  }
                                }}
                                className="p-1 text-orange-600 hover:text-orange-800"
                                title="Reject Coach"
                              >
                                <XCircle size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${coach.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                            coach.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                              'bg-yellow-100 text-yellow-800 border-yellow-200'
                          }`}>
                          {(coach.status || 'pending').charAt(0).toUpperCase() + (coach.status || 'pending').slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full flex items-center justify-center text-primary-600 text-sm font-bold border border-primary-100">
                            {(coach.firstName || 'C')[0]}{(coach.lastName || 'C')[0]}
                          </div>
                          <div>
                            <div>{coach.firstName || 'N/A'} {coach.lastName || 'N/A'}</div>
                            {coach.yearsExperience && (
                              <div className="text-xs text-gray-500">{coach.yearsExperience} years exp.</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{coach.email || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getSportIcon(coach.primarySport)}</span>
                          <div>
                            <div className="font-medium">{coach.primarySport || 'Not set'}</div>
                            {coach.secondarySports && coach.secondarySports.length > 0 && (
                              <div className="text-xs text-gray-500">
                                +{coach.secondarySports.length} secondary
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {(coach.assignedTeams || []).slice(0, 2).map((team, index) => (
                            <div key={index} className={`text-xs px-2 py-1 rounded-full ${team.isPrimary
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                              }`}>
                              {team.teamName}
                            </div>
                          ))}
                          {(coach.assignedTeams || []).length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{coach.assignedTeams.length - 2} more teams
                            </div>
                          )}
                          {(!coach.assignedTeams || coach.assignedTeams.length === 0) && (
                            <span className="text-gray-500 text-sm">No teams assigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {coach.location ? (
                            <div className="truncate max-w-[150px]" title={coach.location}>
                              {coach.location}
                            </div>
                          ) : (
                            <span className="text-gray-500">Not specified</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {coach.experience ? (
                            <div className="truncate max-w-[150px]" title={coach.experience}>
                              {coach.experience}
                            </div>
                          ) : (
                            <span className="text-gray-500">Not specified</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {coach.createdAt ? (
                          coach.createdAt.toDate ?
                            coach.createdAt.toDate().toLocaleDateString() :
                            new Date(coach.createdAt).toLocaleDateString()
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold text-green-700"> 
                          ${(coach.totalApprovedPay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </TableCell>

                    </TableRow>
                  ))}
                </Table>

                {/* NEW: Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-6 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={goToFirstPage}
                        disabled={currentPage === 1}
                        className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="First Page"
                      >
                        <ChevronsLeft size={16} />
                      </button>
                      <button
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Previous Page"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="flex items-center gap-1">
                        {getPageNumbers().map(pageNum => (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pageNum === currentPage
                              ? 'bg-primary-500 text-white'
                              : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Next Page"
                      >
                        <ChevronRight size={16} />
                      </button>
                      <button
                        onClick={goToLastPage}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Last Page"
                      >
                        <ChevronsRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <UserCheck size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Coaches Found</h3>
                <div className="text-gray-500 space-y-1">
                  <p>No coaches found in the system.</p>
                  <p className="text-sm">• Make sure users have role: 'coach' in Firestore</p>
                  <p className="text-sm">• Check the 'users' collection</p>
                  <p className="text-sm">• Try adding a new coach using the button above</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <AssignmentsSection
            coaches={coaches}
            locations={locations}
            selectedWeek={selectedWeek}
            setSelectedWeek={setSelectedWeek}
          />
        )}
      </div>

      {/* All existing modals remain unchanged - keeping them as they are since they work correctly */}
      {/* Sport-Specific Assignment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssigningCoach(null);
          setAssignmentData({ primarySport: 'Soccer', assignedGroups: [], assignedLocations: [], secondarySports: [] });
        }}
        title={assigningCoach ? `Assign Teams to ${assigningCoach.firstName} ${assigningCoach.lastName}` : 'Assign Coach to Teams'}
        size="xl"
      >
        {assigningCoach && (
          <form onSubmit={handleAssignmentSubmit} className="space-y-6">
            {/* Coach Info */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Trophy size={20} className="text-purple-600" />
                Coach Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="ml-2 text-gray-600">
                    {assigningCoach.firstName} {assigningCoach.lastName}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="ml-2 text-gray-600">{assigningCoach.email}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Current Primary Sport:</span>
                  <span className="ml-2 text-gray-600 flex items-center gap-1">
                    {getSportIcon(assigningCoach.primarySport)} {assigningCoach.primarySport || 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Experience:</span>
                  <span className="ml-2 text-gray-600">{assigningCoach.experience || 'Not specified'}</span>
                </div>
              </div>
            </div>

            {/* Current Team Assignments */}
            {assigningCoach.assignedTeams && assigningCoach.assignedTeams.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-3">Current Team Assignments ({assigningCoach.assignedTeams.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {assigningCoach.assignedTeams.map((team, index) => (
                    <div key={index} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${team.isPrimary ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'
                      }`}>
                      <span>{getSportIcon(team.sport)}</span>
                      <span>{team.teamName}</span>
                      <span className="text-xs">({team.isPrimary ? 'Primary' : 'Secondary'})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sport Selection */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Sport Expertise</h4>

              {/* Primary Sport */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Sport *</label>
                <select
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  value={assignmentData.primarySport}
                  onChange={(e) => setAssignmentData({ ...assignmentData, primarySport: e.target.value })}
                  required
                >
                  {sports.map((sport) => (
                    <option key={sport} value={sport}>
                      {getSportIcon(sport)} {sport}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600 mt-1">The sport this coach specializes in and will primarily coach</p>
              </div>

              {/* Secondary Sports */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Sports (Optional)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {sports.filter(sport => sport !== assignmentData.primarySport).map((sport) => (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => handleSecondarySportToggle(sport)}
                      className={`p-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${assignmentData.secondarySports?.includes(sport)
                        ? 'bg-green-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      <span>{getSportIcon(sport)}</span>
                      <span>{sport}</span>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Additional sports this coach can assist with (limited assignments)
                </p>
              </div>
            </div>

            {/* Age Groups Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Age Groups</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {ageGroups.map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => handleAssignmentAgeGroupToggle(group)}
                    className={`p-3 rounded-xl text-center font-medium transition-all ${assignmentData.assignedGroups?.includes(group)
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {group}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Selected: {assignmentData.assignedGroups?.length || 0} age groups
              </p>
            </div>

            {/* Locations Assignment */}
            <div>
              <Autocomplete
                label="Locations"
                options={locations}
                value={assignmentData.assignedLocations}
                onChange={(selectedLocations) => {
                  setAssignmentData({
                    ...assignmentData,
                    assignedLocations: selectedLocations
                  });
                }}
                placeholder="Select locations..."
                getOptionLabel={(location) => typeof location === 'string' ? location : location.name}
                getOptionValue={(location) => typeof location === 'string' ? location : location.name}
                multiple={true} // Enable multiple selection
                allowCustomInput={true}
                className="w-full"
              />
            </div>


            {/* Assignment Preview - Updated message */}
            {(assignmentData.assignedGroups?.length > 0 && assignmentData.assignedLocations?.length > 0) && (
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-3">Assignment Preview - Existing Rosters Only</h4>

                {/* Primary Sport Teams */}
                <div className="mb-3">
                  <h5 className="font-medium text-green-700 mb-2">
                    {getSportIcon(assignmentData.primarySport)} {assignmentData.primarySport} Teams (Primary)
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
                    {assignmentData.assignedGroups.map(ageGroup =>
                      assignmentData.assignedLocations.map(location => (
                        <div key={`${ageGroup}-${location}`} className="bg-green-200 text-green-800 px-2 py-1 rounded">
                          {ageGroup} {assignmentData.primarySport} - {location}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-sm text-green-700">
                    <strong>Potential Assignments:</strong> {
                      (assignmentData.assignedGroups?.length || 0) * (assignmentData.assignedLocations?.length || 0)
                    } combinations
                  </p>
                  <div className="text-xs text-green-600 mt-1 space-y-1">
                    <p>✅ <strong>Will assign to:</strong> Existing rosters (created when parents registered)</p>
                    <p>⏭️ <strong>Will skip:</strong> Non-existent rosters (will assign automatically when parents register)</p>
                    <p>🚫 <strong>Will NOT create:</strong> Any new empty rosters</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setAssigningCoach(null);
                  setAssignmentData({ primarySport: 'Soccer', assignedGroups: [], assignedLocations: [], secondarySports: [] });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                <UserPlus size={16} className="mr-2" />
                Assign to Teams
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Coach Modal - keeping existing implementation */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Coach"
        size="lg"
      >
        <form onSubmit={handleAddCoach} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name <span className="pl-1 text-red-500">*</span></label>
              <input
                type="text"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={newCoach.firstName}
                onChange={(e) => setNewCoach({ ...newCoach, firstName: e.target.value })}
                required
                placeholder="Enter first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name <span className="pl-1 text-red-500">*</span></label>
              <input
                type="text"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={newCoach.lastName}
                onChange={(e) => setNewCoach({ ...newCoach, lastName: e.target.value })}
                required
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="pl-1 text-red-500">*</span></label>
            <input
              type="email"
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              value={newCoach.email}
              onChange={(e) => setNewCoach({ ...newCoach, email: e.target.value })}
              required
              placeholder="Enter email address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password <span className="pl-1 text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={newCoach.password}
                onChange={(e) => setNewCoach({ ...newCoach, password: e.target.value })}
                className={`w-full p-3 border-2 rounded-xl focus:outline-none transition-colors`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={newCoach.phone}
                onChange={(e) => setNewCoach({ ...newCoach, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
              <input
                type="number"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={newCoach.yearsExperience}
                onChange={(e) => setNewCoach({ ...newCoach, yearsExperience: e.target.value })}
                placeholder="e.g., 5"
                min="0"
                max="50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate ($/hour)</label>
              <input
                type="number"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={newCoach.hourlyRate}
                onChange={(e) => setNewCoach({ ...newCoach, hourlyRate: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., 20"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          {/* Location */}
          <Autocomplete
            label="Coach Location "
            options={locations}
            value={newCoach.location}
            onChange={(value) => setNewCoach({ ...newCoach, location: value })}
            placeholder="Select location or enter custom location"
            getOptionLabel={(location) => location}
            getOptionValue={(location) => location}
            allowCustomInput={true}
            required
          />
          {/* Primary Sport */}
          <div>
            <Autocomplete
              label="Primary Sport "
              options={sports}
              value={newCoach.primarySport}
              onChange={(value) => setNewCoach({ ...newCoach, primarySport: value })}
              placeholder="Select sport"
              getOptionLabel={(sport) => `${getSportIcon(sport)} ${sport}`}
              getOptionValue={(sport) => sport}
              required
            />

          </div>

          {/* Secondary Sports */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Secondary Sports (Optional)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {sports.filter(sport => sport !== newCoach.primarySport).map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => handleNewCoachSecondarySportToggle(sport)}
                  className={`p-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${newCoach.secondarySports?.includes(sport)
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <span>{getSportIcon(sport)}</span>
                  <span>{sport}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Experience & Background</label>
            <textarea
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              value={newCoach.experience}
              onChange={(e) => setNewCoach({ ...newCoach, experience: e.target.value })}
              rows="3"
              placeholder="Brief description of coaching experience, certifications, playing background..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isAddingCoach}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isAddingCoach}>
              {isAddingCoach ? 'Adding...' : 'Add Coach'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Coach Modal - keeping existing implementation */}
      {editingCoach && (
        <Modal
          isOpen={!!editingCoach}
          onClose={() => setEditingCoach(null)}
          title="Edit Coach"
          size="lg"
        >
          <form onSubmit={handleEditCoach} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  value={editingCoach.firstName || ''}
                  onChange={(e) => setEditingCoach({ ...editingCoach, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  value={editingCoach.lastName || ''}
                  onChange={(e) => setEditingCoach({ ...editingCoach, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={editingCoach.email || ''}
                onChange={(e) => setEditingCoach({ ...editingCoach, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={editingCoach.password}
                  onChange={(e) => setEditingCoach({ ...editingCoach, password: e.target.value })}
                  className={`w-full p-3 border-2 rounded-xl focus:outline-none transition-colors`}
                  placeholder="Enter your password"
                  disabled
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  value={editingCoach.phone || ''}
                  onChange={(e) => setEditingCoach({ ...editingCoach, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                <input
                  type="number"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  value={editingCoach.yearsExperience || ''}
                  onChange={(e) => setEditingCoach({ ...editingCoach, yearsExperience: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate ($/hour)</label>
                <input
                  type="number"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  value={editingCoach.hourlyRate || 0}
                  onChange={(e) => setEditingCoach({ ...editingCoach, hourlyRate: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 20"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Location */}
            <Autocomplete
              label="Coach Location "
              options={locations}
              value={editingCoach.location}
              onChange={(value) => setEditingCoach({ ...editingCoach, location: value })}
              placeholder="Select location or enter custom location"
              getOptionLabel={(location) => location}
              getOptionValue={(location) => location}
              allowCustomInput={true}
              required
            />
            {/* Primary Sport */}
            <div>
              <Autocomplete
                label="Primary Sport "
                options={sports}
                value={editingCoach.primarySport}
                onChange={(value) => setEditingCoach({ ...editingCoach, primarySport: value })}
                placeholder="Select sport"
                getOptionLabel={(sport) => `${getSportIcon(sport)} ${sport}`}
                getOptionValue={(sport) => sport}
                required
              />
            </div>

            {/* Secondary Sports */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Secondary Sports</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {sports.filter(sport => sport !== editingCoach.primarySport).map((sport) => (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => handleEditCoachSecondarySportToggle(sport)}
                    className={`p-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${editingCoach.secondarySports?.includes(sport)
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <span>{getSportIcon(sport)}</span>
                    <span>{sport}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Experience & Background</label>
              <textarea
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={editingCoach.experience || ''}
                onChange={(e) => setEditingCoach({ ...editingCoach, experience: e.target.value })}
                rows="3"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setEditingCoach(null)}>
                Cancel
              </Button>
              <Button type="submit">Update Coach</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Timesheets Modal */}
      <Modal
        isOpen={isTimesheetModalOpen}
        onClose={() => {
          setIsTimesheetModalOpen(false);
          setSelectedCoachForTimesheets(null);
          setTimesheets([]);
          setTimesheetSummary(null);
          setSelectedTimesheets([]);
          setIsRejectModalOpen(false);
          setRejectionReason("");
        }}
        title={selectedCoachForTimesheets ? `Timesheets - ${selectedCoachForTimesheets.firstName} ${selectedCoachForTimesheets.lastName}` : 'Timesheets'}
        size="xl"
      >
        {timesheetLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading timesheets...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            {timesheetSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Total Entries</p>
                      <p className="text-xl font-bold text-gray-900">
                        {timesheetSummary.totalEntries || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Clock className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Total Hours</p>
                      <p className="text-xl font-bold text-gray-900">
                        {timesheetSummary.totalHours || 0}h
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Send className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Submitted</p>
                      <p className="text-xl font-bold text-gray-900">
                        {timesheets.filter(ts => ts.status === 'submitted').length || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Approved</p>
                      <p className="text-xl font-bold text-gray-900">
                        {timesheets.filter(ts => ts.status === 'approved').length || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Action Buttons */}
            {selectedTimesheets.length > 0 && (
              <div className="mb-4 flex justify-end gap-3">
                <button
                  onClick={handleBulkApproveTimesheets}
                  disabled={bulkActionLoading}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition duration-200"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve All ({selectedTimesheets.length})
                </button>
                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  disabled={bulkActionLoading}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition duration-200"
                >
                  <XCircle className="h-4 w-4" />
                  Reject All ({selectedTimesheets.length})
                </button>
              </div>
            )}

            {/* Select All Checkbox */}
            {timesheets.length > 0 && (
              <div className="mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    timesheets.length > 0 &&
                    selectedTimesheets.length === timesheets.length
                  }
                  onChange={handleSelectAllTimesheets}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  Select All ({timesheets.length} timesheets)
                </label>
              </div>
            )}

            {/* Timesheets List */}
            {timesheets.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {timesheets.map((timesheet) => (
                  <div
                    key={timesheet.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={selectedTimesheets.includes(timesheet.id)}
                        onChange={() => handleSelectTimesheet(timesheet.id)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Date:</span>
                            <span className="text-sm text-gray-900">
                              {timesheet?.date
                                ? dayjs.utc(timesheet.date).format("DD-MMM-YYYY")
                                : "N/A"
                              }
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Time:</span>
                            <span className="text-sm text-gray-900">
                              {timesheet.startTime || "N/A"} - {timesheet.endTime || "N/A"}
                            </span>
                            <span className="text-sm text-gray-600">
                              ({timesheet.totalHours || 0}h)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Rate:</span>
                            <span className="text-sm text-gray-900">
                              ${((selectedCoachForTimesheets?.hourlyRate || 0)).toFixed(2)}/hr
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-green-700">Pay:</span>
                            <span className="text-sm font-bold text-green-700">
                              ${((timesheet.totalHours || 0) * (selectedCoachForTimesheets?.hourlyRate || 0)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Location:</span>
                            <span className="text-sm text-gray-900 truncate">
                              {timesheet.location || "No location"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Status:</span>
                            {getStatusBadge(timesheet.status)}
                          </div>
                          {timesheet.notes && (
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-700">Notes:</span>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {timesheet.notes}
                                </p>
                              </div>
                            </div>
                          )}
                          {timesheet.rejectionReason && (
                            <div className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-red-700">Rejection Reason:</span>
                                <p className="text-sm text-red-600 mt-1">
                                  {timesheet.rejectionReason}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Timesheets Found</h3>
                <p className="text-gray-500">
                  This coach hasn't submitted any timesheets yet.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal for Timesheets */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Reject Timesheets</h2>
            <p className="text-sm text-gray-600 mb-4">
              You are about to reject {selectedTimesheets.length} timesheet(s). Please provide a reason for rejection.
            </p>

            <div className="flex flex-col mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 min-h-[100px]"
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectionReason("");
                }}
                disabled={bulkActionLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkRejectTimesheets}
                disabled={bulkActionLoading || !rejectionReason.trim()}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkActionLoading ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coaches;
