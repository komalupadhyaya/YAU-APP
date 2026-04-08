import React, { useEffect, useState } from 'react';
import Header from '../layout/Header';
import Button from '../common/Button';
import Modal from '../common/Modal';
import MultiSelect from '../common/MultiSelect';
import { getCoaches, getRosters, updateRoster, updateCoach, getManualCreateOptions, getOptionStudents, createRoster, bulkDeleteRosters } from '../../firebase/firestore';
import { Users, MapPin, User, Shirt, Phone, Search, Mail, Calendar, Award, Filter, AlertTriangle, UserX, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, UserPlus, TrendingUp, Trophy, Plus, Check, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import { updateParent, getParents } from '../../firebase/apis/api-parents'

const Rosters = ({ userRole = 'admin', userId = null }) => {
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCoach, setSelectedCoach] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [rosters, setRosters] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isAssignCoachModalOpen, setIsAssignCoachModalOpen] = useState(false);
  const [assigningRoster, setAssigningRoster] = useState(null);
  console.log(rosters)
  // NEW: Add Players Modal State
  const [isAddPlayersModalOpen, setIsAddPlayersModalOpen] = useState(false);
  const [addingPlayersRoster, setAddingPlayersRoster] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Manual Create Roster modal state (binds to GET /rosters/options, GET /rosters/options/students, POST /rosters)
  const [isCreateRosterModalOpen, setIsCreateRosterModalOpen] = useState(false);
  const [createRosterLocations, setCreateRosterLocations] = useState([]);
  const [createRosterSports, setCreateRosterSports] = useState([]);
  const [createRosterGrades, setCreateRosterGrades] = useState([]);
  const [createRosterStudents, setCreateRosterStudents] = useState([]);
  const [createRosterSelectedLocation, setCreateRosterSelectedLocation] = useState('');
  const [createRosterSelectedSport, setCreateRosterSelectedSport] = useState('');
const [createRosterSelectedGrade, setCreateRosterSelectedGrade] = useState([]);
  const [createRosterSelectedStudents, setCreateRosterSelectedStudents] = useState([]);
  const [createRosterTeamName, setCreateRosterTeamName] = useState('');
  const [createRosterLoading, setCreateRosterLoading] = useState(false);
  const [createRosterError, setCreateRosterError] = useState('');
  const [createRosterStudentSearchTerm, setCreateRosterStudentSearchTerm] = useState('');
  const [debouncedCreateRosterStudentSearchTerm, setDebouncedCreateRosterStudentSearchTerm] = useState('');

  // Bulk delete state
  const [selectedRosterIds, setSelectedRosterIds] = useState([]);

  const locations = ['National Harbor, MD', 'Greenbelt, MD', 'Bowie, MD', 'Andrews AFB - Clinton', 'Waldorf-Laplata, MD', 'New York'];
  const grades = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade'];
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
  const itemsPerPageOptions = [5, 10, 25, 50, 100];

  // Update your Rosters component
  useEffect(() => {
    const initializeRosters = async () => {
      try {
        console.log('🔄 Initializing rosters system...');

        // Check if rosters exist
        const existingRosters = await getRosters();
        console.log(`📊 Found ${existingRosters.length} existing rosters`);

        if (existingRosters.length === 0) {
          console.log('🏗️ No rosters found, generating initial rosters...');

          // Import the function dynamically to avoid circular dependencies
          const { generateInitialRosters } = await import('../../firebase/firestore');
          const createdCount = await generateInitialRosters();

          console.log(`✅ Created ${createdCount} initial rosters`);
          alert(`🎉 Successfully created ${createdCount} rosters from your existing ${33} parent registrations!`);
        }

        // Now load the roster data
        await loadRosterData();

      } catch (error) {
        console.error('❌ Error initializing rosters:', error);
        alert('Failed to initialize rosters. Please try the manual setup.');
      }
    };

    initializeRosters();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGrade, selectedSport, selectedLocation, selectedCoach, searchTerm]);

  // Debounce for createRosterStudentSearchTerm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCreateRosterStudentSearchTerm(createRosterStudentSearchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [createRosterStudentSearchTerm]);

  // Clear selections when rosters change
  useEffect(() => {
    setSelectedRosterIds((prev) => prev.filter(id => rosters.some(roster => roster.id === id)));
  }, [rosters]);

  const calculateCurrentAge = (dob) => {
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
  useEffect(() => {
    const initializeRosters = async () => {
      try {
        console.log('🔄 Loading demand-based rosters...');

        // Just load existing rosters - they're created when parents register
        await loadRosterData();

      } catch (error) {
        console.error('❌ Error loading rosters:', error);
        alert('Failed to load roster data. Please try again.');
      }
    };

    initializeRosters();
  }, []);
  // Add this function in your Rosters component
  const getDemandStatistics = () => {
    const stats = {
      totalRosters: filteredRosters.length,
      rostersWithPlayers: filteredRosters.filter(r => r.playerCount > 0).length,
      rostersNeedingCoaches: filteredRosters.filter(r => r.playerCount > 0 && !r.hasAssignedCoach).length,
      emptyRosters: filteredRosters.filter(r => r.playerCount === 0).length,
      activeRosters: filteredRosters.filter(r => r.playerCount > 0 && r.hasAssignedCoach).length,
      totalRegisteredFamilies: filteredRosters.reduce((sum, r) => sum + (r.participants.length || 0), 0),
      assignedCoaches: filteredRosters.filter(r => r.hasAssignedCoach).length
    };

    console.log('📊 Demand Statistics:', stats); // For debugging
    return stats;
  };

  // Enhanced loadRosterData function
  const loadRosterData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading roster data...');

      const [parentsData, coachesData, rostersData] = await Promise.all([
        getParents(),
        getCoaches(),
        getRosters()
      ]);

      console.log('📋 Parents data:', parentsData.length);
      console.log('👨‍🏫 Coaches data:', coachesData.length);
      console.log('📊 Rosters data:', rostersData.length);

      const validCoaches = coachesData.filter(coach => coach.role === 'coach');
      setCoaches(validCoaches);
      setParents(parentsData);

      // Sort rosters by status and then by age group
      const sortedRosters = rostersData.sort((a, b) => {
        const statusOrder = { 'active': 1, 'needs-coach': 2, 'needs-players': 3, 'empty': 4 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        const ageA = parseInt(a.ageGroup);
        const ageB = parseInt(b.ageGroup);
        if (ageA !== ageB) return ageA - ageB;
        if (a.sport !== b.sport) return a.sport.localeCompare(b.sport);
        return a.location.localeCompare(b.location);
      });

      setRosters(sortedRosters);
      console.log('✅ Rosters loaded:', sortedRosters.length);

    } catch (error) {
      console.error('❌ Error loading roster data:', error);
      alert('Failed to load roster data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Handle Add Players Modal
  const handleAddPlayers = (roster) => {
    setAddingPlayersRoster(roster);

    // Get all available students that match the roster criteria
    const eligibleStudents = [];

    parents.forEach(parent => {
      // Handle both 'students' and 'children' properties for compatibility
      const children = parent.students || parent.children || [];

      children.forEach(student => {
        // Check if student matches roster criteria
        const matchesSport = parent.sport === roster.sport;
        const matchesLocation = parent.location === roster.location;
        const matchesGrade = student.grade === roster.grade || (roster.ageGroup && student.ageGroup === roster.ageGroup); // Support both for backward compatibility

        // Check if student is already in this roster
        const alreadyInRoster = roster.participants?.some(p =>
          p.parentId === parent.id &&
          (p.name === student.name || p.name === (student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : student.name))
        );

        if (matchesSport && matchesLocation && matchesGrade && !alreadyInRoster) {
          eligibleStudents.push({
            id: `${parent.id}-${student.name || `${student.firstName} ${student.lastName}`}`,
            parentId: parent.id,
            parentName: `${parent.firstName} ${parent.lastName}`,
            parentEmail: parent.email,
            parentPhone: parent.phone,
            studentName: student.name || `${student.firstName} ${student.lastName}`,
            firstName: student.firstName || student.name?.split(' ')[0] || '',
            lastName: student.lastName || student.name?.split(' ')[1] || '',
            dob: student.dob,
            grade: student.grade,
            ageGroup: student.ageGroup, // Keep for backward compatibility
            sport: parent.sport,
            location: parent.location,
            calculatedAge: student.dob ? calculateCurrentAge(student.dob) : 'N/A'
          });
        }
      });
    });

    setAvailableStudents(eligibleStudents);
    setSelectedStudents([]);
    setStudentSearchTerm('');
    setIsAddPlayersModalOpen(true);

    console.log(`📝 Found ${eligibleStudents.length} eligible students for ${roster.teamName}`);
  };

  // NEW: Handle student selection
  const toggleStudentSelection = (student) => {
    setSelectedStudents(prev => {
      const isSelected = prev.find(s => s.id === student.id);
      if (isSelected) {
        return prev.filter(s => s.id !== student.id);
      } else {
        return [...prev, student];
      }
    });
  };

  // NEW: Add selected students to roster
  const handleAddSelectedStudents = async () => {
    if (!addingPlayersRoster || selectedStudents.length === 0) return;

    try {
      setLoading(true);
      console.log(`➕ Adding ${selectedStudents.length} students to ${addingPlayersRoster.teamName}`);

      // Create new participants from selected students
      const newParticipants = selectedStudents.map(student => ({
        id: student.id,
        parentId: student.parentId,
        name: student.studentName,
        firstName: student.firstName,
        lastName: student.lastName,
        dob: student.dob,
        ageGroup: student.ageGroup,
        calculatedAge: student.calculatedAge,
        sport: student.sport,
        location: student.location,
        parentName: student.parentName,
        parentEmail: student.parentEmail,
        parentPhone: student.parentPhone,
        parent: {
          id: student.parentId,
          name: student.parentName,
          email: student.parentEmail,
          phone: student.parentPhone
        },
        registeredAt: new Date().toISOString(),
        addedBy: userRole === 'admin' ? 'admin' : userId,
        addedAt: new Date().toISOString(),
      }));

      // Combine existing participants with new ones
      const updatedParticipants = [...(addingPlayersRoster.participants || []), ...newParticipants];
      const updatedPlayerCount = updatedParticipants.length;

      // Update roster status
      let newStatus = 'needs-coach';
      if (addingPlayersRoster.hasAssignedCoach && updatedPlayerCount > 0) {
        newStatus = 'active';
      } else if (!addingPlayersRoster.hasAssignedCoach && updatedPlayerCount > 0) {
        newStatus = 'needs-coach';
      } else if (addingPlayersRoster.hasAssignedCoach && updatedPlayerCount === 0) {
        newStatus = 'needs-players';
      } else {
        newStatus = 'empty';
      }

      // Update the roster
      await updateRoster(addingPlayersRoster.id, {
        participants: updatedParticipants,
        playerCount: updatedPlayerCount,
        hasPlayers: updatedPlayerCount > 0,
        status: newStatus,
        lastUpdated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });


      for (const student of selectedStudents) {
        const parent = parents.find(p => p.id === student.parentId);
        if (parent) {
          const existingAssignments = parent.assignments || [];
          const newAssignment = {
            rosterId: addingPlayersRoster.id,
            teamName: addingPlayersRoster.teamName,
            childName: student.studentName,
            coachName: addingPlayersRoster.coachName || 'Unassigned'
          };

          // Check if assignment already exists
          const assignmentExists = existingAssignments.some(a =>
            a.rosterId === newAssignment.rosterId &&
            a.childName === newAssignment.childName
          );

          if (!assignmentExists) {
            await updateParent(student.parentId, {
              assignments: [...existingAssignments, newAssignment],
              assignedAt: new Date().toISOString(),
              assignedBy: userRole === 'admin' ? 'admin' : userId,
              lastAssignmentUpdate: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      alert(`✅ Successfully added ${selectedStudents.length} students to ${addingPlayersRoster.teamName}!`);

      // Close modal and refresh data
      setIsAddPlayersModalOpen(false);
      setAddingPlayersRoster(null);
      setSelectedStudents([]);
      await loadRosterData();

    } catch (error) {
      console.error('❌ Error adding students to roster:', error);
      alert('Failed to add students to roster. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Assign coach to roster
  const handleAssignCoach = (roster) => {
    setAssigningRoster(roster);
    setIsAssignCoachModalOpen(true);
  };

  const handleCoachAssignment = async (coachId) => {
    if (!assigningRoster || !coachId) return;

    try {
      setLoading(true);
      const selectedCoach = coaches.find(c => c.id === coachId);

      if (!selectedCoach) {
        alert('Selected coach not found.');
        return;
      }

      console.log(`👨‍🏫 Assigning coach ${selectedCoach.firstName} ${selectedCoach.lastName} to roster ${assigningRoster.id}`);

      // Update roster with coach assignment
      await updateRoster(assigningRoster.id, {
        coachId: selectedCoach.id,
        coachName: `${selectedCoach.firstName} ${selectedCoach.lastName}`,
        hasAssignedCoach: true,
        status: assigningRoster.hasPlayers ? 'active' : 'needs-players',
        updatedAt: new Date().toISOString(),
      });

      // Update coach's assigned teams
      const updatedCoachTeams = [...(selectedCoach.assignedTeams || [])];
      const existingTeamIndex = updatedCoachTeams.findIndex(team => team.id === assigningRoster.id);

      const teamData = {
        id: assigningRoster.id,
        sport: assigningRoster.sport,
        ageGroup: assigningRoster.ageGroup,
        location: assigningRoster.location,
        teamName: assigningRoster.teamName,
        isPrimary: selectedCoach.primarySport === assigningRoster.sport
      };

      if (existingTeamIndex >= 0) {
        updatedCoachTeams[existingTeamIndex] = teamData;
      } else {
        updatedCoachTeams.push(teamData);
      }
      await updateCoach(selectedCoach.id, {
        assignedTeams: updatedCoachTeams,
        updatedAt: new Date().toISOString(),
      });

      alert(`✅ Coach ${selectedCoach.firstName} ${selectedCoach.lastName} assigned successfully!`);
      setIsAssignCoachModalOpen(false);
      setAssigningRoster(null);
      await loadRosterData(); // Refresh data

    } catch (error) {
      console.error('❌ Error assigning coach:', error);
      alert('Failed to assign coach. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Bulk sync all rosters
  const handleBulkSync = async () => {
    if (!window.confirm('This will update all rosters with current parent and coach data. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Starting bulk roster sync...');

      // Force reload all data
      await loadRosterData();

      alert('✅ All rosters have been synchronized with current data!');
    } catch (error) {
      console.error('❌ Error during bulk sync:', error);
      alert('Failed to sync rosters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Bulk delete handlers
  const toggleRosterSelection = (rosterId) => {
    setSelectedRosterIds((prev) => {
      if (prev.includes(rosterId)) {
        return prev.filter(id => id !== rosterId);
      } else {
        return [...prev, rosterId];
      }
    });
  };

  const handleSelectAllOnPage = () => {
    const currentPageRosterIds = currentItems.map(roster => roster.id);
    const allSelected = currentPageRosterIds.every(id => selectedRosterIds.includes(id));

    if (allSelected) {
      // Deselect all on current page
      setSelectedRosterIds(prev => prev.filter(id => !currentPageRosterIds.includes(id)));
    } else {
      // Select all on current page
      const combined = new Set([...selectedRosterIds, ...currentPageRosterIds]);
      setSelectedRosterIds(Array.from(combined));
    }
  };

  const handleBulkDeleteRosters = async () => {
    if (selectedRosterIds.length === 0) return;

    const count = selectedRosterIds.length;
    const confirmMessage = `Are you sure you want to delete ${count} selected roster(s)? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);
      console.log('🗑️ Bulk deleting rosters:', selectedRosterIds);
      
      await bulkDeleteRosters(selectedRosterIds);
      
      setSelectedRosterIds([]);
      await loadRosterData();
      
      alert(`✅ Successfully deleted ${count} roster(s)!`);
    } catch (error) {
      console.error('❌ Error bulk deleting rosters:', error);
      alert('Error deleting selected rosters: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Manual Create Roster flow - binds to GET /rosters/options, GET /rosters/options/students, POST /rosters
  const handleOpenCreateRoster = async () => {
    setIsCreateRosterModalOpen(true);
    setCreateRosterError('');
    setCreateRosterSelectedLocation('');
    setCreateRosterSelectedSport('');
    setCreateRosterSelectedGrade([]);
    setCreateRosterSelectedStudents([]);
    setCreateRosterTeamName('');
    try {
      setCreateRosterLoading(true);
      const data = await getManualCreateOptions();
      setCreateRosterLocations(Array.isArray(data?.locations) ? data.locations : []);
      setCreateRosterSports(Array.isArray(data?.sports) ? data.sports : []);
      setCreateRosterGrades(Array.isArray(data?.grades) ? data.grades : []);
      setCreateRosterStudents(Array.isArray(data?.students) ? data.students : []);
    } catch (error) {
      setCreateRosterError(error?.message || 'Failed to load form options');
    } finally {
      setCreateRosterLoading(false);
    }
  };

  const handleCreateRosterFilterChange = async (location, sport, grades) => {
    try {
      setCreateRosterLoading(true);
      const locationName = typeof location === 'object' && location !== null ? location?.name : location;
      
      if (!locationName && !sport && (!grades || grades.length === 0)) {
        const data = await getManualCreateOptions();
        setCreateRosterStudents(Array.isArray(data?.students) ? data.students : []);
        return;
      }

      let allStudents = [];
      
      if (grades && grades.length > 0) {
        // Multi-grade: Fetch each grade separately, merge unique by ID
        const gradePromises = grades.map(async (grade) => {
          try {
            const students = await getOptionStudents({ 
              location: locationName, 
              sport, 
              grade,  // Single grade per call
              ageGroup: undefined  // Avoid conflicts
            });
            return Array.isArray(students) ? students : [];
          } catch (err) {
            console.warn(`Failed to fetch grade ${grade}:`, err);
            return [];
          }
        });
        
        const gradeResults = await Promise.all(gradePromises);
        allStudents = gradeResults.flat();
        
        // Remove duplicates by ID (preserve first occurrence)
        const studentMap = new Map();
        allStudents.forEach(student => {
          if (student.id && !studentMap.has(student.id)) {
            studentMap.set(student.id, student);
          }
        });
        
        const uniqueStudents = Array.from(studentMap.values());
        setCreateRosterStudents(uniqueStudents);
        console.log(`✅ Multi-grade: Fetched ${uniqueStudents.length} unique students from ${grades.length} grades`);
      } else {
        // Fallback: single/no grade
        const students = await getOptionStudents({ 
          location: locationName, 
          sport 
        });
        setCreateRosterStudents(Array.isArray(students) ? students : []);
      }
    } catch (error) {
      console.error('❌ Filter error:', error);
      setCreateRosterError(error.message || 'Failed to filter students');
    } finally {
      setCreateRosterLoading(false);
    }
  };

  const handleCreateRosterLocationChange = (value) => {
    setCreateRosterSelectedLocation(value);
    handleCreateRosterFilterChange(value, createRosterSelectedSport, createRosterSelectedGrade);
  };

  const handleCreateRosterSportChange = (value) => {
    setCreateRosterSelectedSport(value);
    handleCreateRosterFilterChange(createRosterSelectedLocation, value, createRosterSelectedGrade);
  };

const handleCreateRosterGradeChange = (grades) => {
    setCreateRosterSelectedGrade(grades);
    handleCreateRosterFilterChange(createRosterSelectedLocation, createRosterSelectedSport, grades);
  };

  const toggleCreateRosterStudent = (student) => {
    setCreateRosterSelectedStudents((prev) => {
      const exists = prev.find((s) => s.id === student.id);
      if (exists) return prev.filter((s) => s.id !== student.id);
      return [...prev, student];
    });
  };

    const handleCreateRosterSubmit = async () => {
    // Extract location name if it's an object
    const locationName = typeof createRosterSelectedLocation === 'object' && createRosterSelectedLocation !== null 
      ? createRosterSelectedLocation?.name 
      : createRosterSelectedLocation;
    
    if (!createRosterSelectedSport || createRosterSelectedGrade.length === 0 || !locationName) {
      setCreateRosterError('Please select Location, Sport, and at least one Grade');
      return;
    }

    const primaryGrade = createRosterSelectedGrade[0];
    const teamNameDisplay = createRosterTeamName || `${createRosterSelectedGrade.join(', ')} ${createRosterSelectedSport} - ${locationName}`;
    
    try {
      setCreateRosterLoading(true);
      setCreateRosterError('');
      
      console.log('📤 Creating roster with payload:', {
        sport: createRosterSelectedSport,
        grade: primaryGrade,
        location: locationName,
        teamName: teamNameDisplay,
        participants: createRosterSelectedStudents
      });
      
      const payload = {
        sport: createRosterSelectedSport,
        grade: primaryGrade,  // ✅ Single string for backend validation
        location: locationName,
        teamName: teamNameDisplay,
        participants: createRosterSelectedStudents,
      };
      
      await createRoster(payload);
      setIsCreateRosterModalOpen(false);
      await loadRosterData();
      alert('✅ Roster created successfully!');
    } catch (error) {
      console.error('❌ Roster creation failed:', error);
      setCreateRosterError(error?.message || 'Failed to create roster');
    } finally {
      setCreateRosterLoading(false);
    }
  };

  const handleExportCSV = (rosterId) => {
    const roster = rosters.find(r => r.id === rosterId);
    if (!roster) return;

    const csvData = roster.participants.map((p, index) => ({
      '#': index + 1,
      'Student Name': p?.name,
      'Age Group': p?.ageGroup,
      'Current Age': calculateCurrentAge(p?.dob),
      'Date of Birth': p?.dob ? new Date(p?.dob).toLocaleDateString() : 'N/A',
      'Parent Name': p?.parentName,
      'Parent Email': p?.parentEmail,
      'Parent Phone': p?.parentPhone,
      'Sport': p?.sport,
      'Location': p?.location,
      'Coach': roster?.coachName,
      'Team Status': roster?.status,
      'Last Updated': roster?.lastUpdated ? new Date(roster?.lastUpdated).toLocaleString() : 'N/A'
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${roster.teamName.replace(/[^a-z0-9]/gi, '_')}_roster_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Role-based filtering
  const getFilteredRosters = () => {
    let filtered = [];

    if (userRole === 'admin') {
      filtered = rosters;
    } else if (userRole === 'coach') {
      filtered = rosters.filter(roster => roster.coachId === userId);
    } else {
      return [];
    }

    return filtered.filter(roster => {
      // Support both grade and ageGroup for backward compatibility
      const gradeMatch = selectedGrade === 'all' || 
        roster.grade === selectedGrade || 
        (roster.ageGroup && selectedGrade === roster.ageGroup);
      const sportMatch = selectedSport === 'all' || roster.sport === selectedSport;
      const locationMatch = selectedLocation === 'all' || roster.location === selectedLocation;

      let coachMatch = true;
      if (selectedCoach !== 'all') {
        if (selectedCoach === 'unassigned') {
          coachMatch = !roster.hasAssignedCoach;
        } else if (selectedCoach === 'assigned') {
          coachMatch = roster.hasAssignedCoach;
        } else {
          coachMatch = roster.coachId === selectedCoach;
        }
      }

      const searchMatch = !searchTerm || (
        roster.teamName?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
        roster.sport?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
        roster.grade?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
        roster.ageGroup?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
        roster.location?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
        roster.coachName?.toLowerCase().includes(searchTerm?.toLowerCase())
      );

      return gradeMatch && sportMatch && locationMatch && coachMatch && searchMatch;
    });
  };

  const filteredRosters = getFilteredRosters();
  const activeRosters = filteredRosters.filter(r => r.hasPlayers || r.hasAssignedCoach);
  const needCoachRosters = filteredRosters.filter(r => r.hasPlayers && !r.hasAssignedCoach);

  // Pagination logic
  const totalItems = activeRosters.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = activeRosters.slice(startIndex, endIndex);

  // Pagination handlers
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
      'Track & Field': '🏃‍♂️',
      'Flag Football': '🏈',
      'Tackle Football': '🏈',
      'Kickball': '🥎',
      'Golf': '🏌️',
      'Cheer': '📣'
    };
    return icons[sport] || '🏆';
  };

  const getAgeGroupColor = (ageGroup) => {
    const colors = {
      '3U': 'bg-pink-100 text-pink-800', '4U': 'bg-purple-100 text-purple-800',
      '6U': 'bg-blue-100 text-blue-800', '8U': 'bg-green-100 text-green-800',
      '9U': 'bg-yellow-100 text-yellow-800', '10U': 'bg-orange-100 text-orange-800',
      '12U': 'bg-red-100 text-red-800', '14U': 'bg-indigo-100 text-indigo-800'
    };
    return colors[ageGroup] || 'bg-gray-100 text-gray-800';
  };

  const getRosterStatus = (roster) => {
    if (roster.hasPlayers && roster.hasAssignedCoach) {
      return {
        status: 'active', color: 'border-green-500 bg-green-50', label: '✅ Ready',
        icon: <Award size={16} className="text-green-500" />
      };
    } else if (roster.hasPlayers && !roster.hasAssignedCoach) {
      return {
        status: 'needs-coach', color: 'border-red-500 bg-red-50', label: ' Needs Coach',
        icon: <UserX size={16} className="text-red-500" />
      };
    } else if (!roster.hasPlayers && roster.hasAssignedCoach) {
      return {
        status: 'needs-players', color: 'border-blue-500 bg-blue-50', label: '👥 Needs Players',
        icon: <Shirt size={16} className="text-blue-500" />
      };
    }
    return {
      status: 'empty', color: 'border-gray-300 bg-gray-50', label: '⭕ Empty',
      icon: <Users size={16} className="text-gray-400" />
    };
  };

  // Access control and loading states
  if (userRole !== 'admin' && userRole !== 'coach') {
    return (
      <div>
        <Header title="Access Denied" subtitle="Only administrators and coaches can access roster management" />
        <div className="glass rounded-2xl p-6">
          <div className="text-center py-12">
            <AlertTriangle size={64} className="mx-auto text-red-300 mb-4" />
            <h3 className="text-lg font-medium text-red-600 mb-2">Access Restricted</h3>
            <p className="text-red-500 mb-4">This section is only available to administrators and assigned coaches.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <Header title="Roster Management" subtitle="Loading and updating roster data..." />
        <div className="glass rounded-2xl p-6">
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-xl mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

  return (
    <div>
      <Header
        title="Roster Management"
        subtitle="Dynamic roster updates - Real-time player counts and coach assignments 🔄"
      />

      <div className="glass rounded-2xl p-6">
        {/* Filters with sync buttons */}
        <div className="bg-white rounded-xl p-4 mb-6 border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-600" />
              <h3 className="font-semibold text-gray-700">Filter Rosters</h3>
              {userRole === 'coach' && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  Showing only your assigned rosters
                </span>
              )}
            </div>

            {/* Sync buttons */}
            <div className="flex gap-3 flex-wrap">
              <Button onClick={() => {
                setSelectedSport('all')
                setSelectedLocation('all')
                setSelectedGrade('all')
                setSelectedCoach('all')
              }} variant="outline" className="w-full sm:w-auto">
                Reset Filter
              </Button>
              <Button onClick={loadRosterData} variant="secondary" className="flex items-center gap-2">
                <RefreshCw size={16} />
                Refresh Data
              </Button>
              {userRole === 'admin' && (
                <>
                  <Button onClick={handleOpenCreateRoster} variant="primary" className="flex items-center gap-2">
                    <Plus size={16} />
                    Create Roster
                  </Button>
                  <Button onClick={handleBulkSync} variant="primary" className="flex items-center gap-2">
                    <RefreshCw size={16} />
                    Sync All Rosters
                  </Button>
                  <Button 
                    onClick={handleBulkDeleteRosters} 
                    variant="danger" 
                    className="flex items-center gap-2"
                    disabled={selectedRosterIds.length === 0 || loading}
                  >
                    <Trash2 size={16} />
                    Delete Selected ({selectedRosterIds.length})
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Filter controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
              <select
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
              >
                <option value="all">All Grades</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sport</label>
              <select
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
              >
                <option value="all">All Sports</option>
                {sports.map((sport) => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <select
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <option value="all">All Locations</option>
                {locations.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>

            {userRole === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Coach Assignment</label>
                <select
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  value={selectedCoach}
                  onChange={(e) => setSelectedCoach(e.target.value)}
                >
                  <option value="all">All Rosters</option>
                  <option value="assigned">✅ Has Assigned Coach</option>
                  <option value="unassigned">Needs Coach Assignment</option>
                  <optgroup label="Specific Assigned Coaches">
                    {coaches.map((coach) => (
                      <option key={coach.id} value={coach.id}>
                        {coach.firstName} {coach.lastName}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search rosters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-blue-600">{getDemandStatistics().totalRosters}</div>
            <div className="text-sm text-blue-600">
              {userRole === 'admin' ? 'Total Rosters' : 'Your Rosters'}
            </div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-500">
            <div className="text-2xl font-bold text-green-600">{getDemandStatistics().activeRosters}</div>
            <div className="text-sm text-green-600">✅ Ready Teams</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border-l-4 border-red-500">
            <div className="text-2xl font-bold text-red-600">{getDemandStatistics().rostersNeedingCoaches}</div>
            <div className="text-sm text-red-600">❌ Need Coaches</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-300">
            <div className="text-2xl font-bold text-blue-600">{getDemandStatistics().emptyRosters}</div>
            <div className="text-sm text-blue-600">👥 Need Players</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border-l-4 border-purple-500">
            <div className="text-2xl font-bold text-purple-600">
              {getDemandStatistics().totalRegisteredFamilies}
            </div>
            <div className="text-sm text-purple-600">Total Families</div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 border-l-4 border-yellow-500">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredRosters.filter(r => r.hasAssignedCoach).length}
            </div>
            <div className="text-sm text-yellow-600">Assigned Coaches</div>
          </div>
        </div>

        {/* Enhanced alert for rosters needing coaches */}
        {needCoachRosters.length > 0 && userRole === 'admin' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-600" />
                <h3 className="font-semibold text-red-700">
                  🚨 Action Needed: {needCoachRosters.length} Teams Need Coaches
                </h3>
              </div>
              <Button
                onClick={() => {
                  const firstTeam = needCoachRosters[0];
                  if (firstTeam) {
                    handleAssignCoach(firstTeam);
                  }
                }}
                variant="primary"
                size="sm"
                className="flex items-center gap-2"
              >
                <UserPlus size={16} />
                Assign Coach
              </Button>
            </div>
            <div className="text-sm text-red-600 mt-2">
              These teams have registered players but no assigned coaches. Click 'Assign Coach' to start assigning.
            </div>
          </div>
        )}

        {/* Pagination controls */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Showing {currentItems.length} of {totalItems} active rosters
              {rosters.length > 0 && (
                <span className="ml-2 text-xs text-green-600">
                  (Last updated: {new Date().toLocaleTimeString()})
                </span>
              )}
            </div>
            {userRole === 'admin' && currentItems.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentItems.length > 0 && currentItems.every(roster => selectedRosterIds.includes(roster.id))}
                  onChange={handleSelectAllOnPage}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300"
                />
                <label className="text-sm text-gray-600">
                  Select All ({currentItems.length} on this page)
                </label>
              </div>
            )}
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

        {/* ENHANCED: Roster Grid with add players button */}
        {currentItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentItems.map((roster) => {
              const rosterStatus = getRosterStatus(roster);
              const isSelected = selectedRosterIds.includes(roster.id);
              return (
                <div
                  key={roster.id}
                  className={`rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:transform hover:-translate-y-1 border-2 ${isSelected ? 'border-primary-500 ring-2 ring-primary-300' : rosterStatus.color} hover:border-primary-500 relative`}
                >
                  {/* Real-time update indicator */}
                  {roster.lastUpdated && new Date(roster.lastUpdated).getTime() > Date.now() - 60000 && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                      Updated
                    </div>
                  )}

                  {/* Selection checkbox */}
                  {userRole === 'admin' && (
                    <div className="absolute top-2 left-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRosterSelection(roster.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-5 w-5 text-primary-600 rounded border-gray-300 cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getAgeGroupColor(roster.ageGroup)}`}>
                      {roster.ageGroup}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${rosterStatus.color.replace('border-', 'bg-').replace('50', '100')}`}>
                        {rosterStatus.icon}
                        {rosterStatus.label}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-lg text-gray-800 mb-2">
                    {roster.sport}
                  </h3>

                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={16} className="text-gray-500" />
                    <p className="text-gray-600 text-sm truncate">
                      {roster.location}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Shirt size={16} className="text-gray-500" />
                    <p className="text-gray-600 text-sm">
                      {roster.playerCount} Player{roster.playerCount !== 1 ? 's' : ''}
                      {roster.playerCount > 0 && (
                        <span className="ml-1 text-green-600 font-medium">
                          (+{roster.playerCount > 5 ? 'Full Team' : 'Building'})
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <User size={16} className={roster.hasAssignedCoach ? "text-green-500" : "text-red-500"} />
                    <p className={`text-sm font-medium ${roster.hasAssignedCoach ? "text-green-600" : "text-red-600"}`}>
                      {roster.hasAssignedCoach ? `✅ ${roster.coachName}` : ' No Assigned Coach'}
                    </p>
                  </div>

                  {/* ENHANCED: Action buttons with Add Players */}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedRoster(roster);
                          setIsRosterModalOpen(true);
                        }}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs py-2 px-3 rounded-lg transition-colors"
                      >
                        View Details
                      </button>

                      {userRole === 'admin' && !roster.hasAssignedCoach && (
                        <button
                          onClick={() => handleAssignCoach(roster)}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <UserPlus size={12} />
                          Assign Coach
                        </button>
                      )}
                    </div>

                    {/* NEW: Add Players Button */}
                    {userRole === 'admin' && (
                      <button
                        onClick={() => handleAddPlayers(roster)}
                        className="w-full bg-purple-500 hover:bg-purple-600 text-white text-xs py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus size={12} />
                        Add Players ({parents.filter(p =>
                          p.sport === roster.sport &&
                          p.location === roster.location &&
                          (p.students || p.children || []).some(student =>
                            student.ageGroup === roster.ageGroup &&
                            !roster.participants?.some(participant =>
                              participant.parentId === p.id &&
                              (participant.name === student.name || participant.name === `${student.firstName} ${student.lastName}`)
                            )
                          )
                        ).length} available)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              {userRole === 'coach' ? 'No Assigned Rosters Found' : 'No Active Rosters Found'}
            </h3>
            <p className="text-gray-500 mb-4">
              {filteredRosters.length === 0
                ? userRole === 'coach'
                  ? "You don't have any rosters assigned to you that match the current filters."
                  : "No rosters match your current filters or search criteria."
                : "All matching rosters are empty (no players or assigned coaches)."}
            </p>
          </div>
        )}

        {/* Pagination */}
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
      </div>

      {/* NEW: Add Players Modal */}
      <Modal
        isOpen={isAddPlayersModalOpen}
        onClose={() => {
          setIsAddPlayersModalOpen(false);
          setAddingPlayersRoster(null);
          setSelectedStudents([]);
        }}
        title={addingPlayersRoster ? `Add Players to ${addingPlayersRoster.teamName}` : 'Add Players'}
        size="xl"
      >
        {addingPlayersRoster && (
          <div className="space-y-6">
            {/* Roster Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-3">Roster Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-700">Sport:</span>
                  <span className="ml-2 text-blue-600">{addingPlayersRoster.sport}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Age Group:</span>
                  <span className="ml-2 text-blue-600">{addingPlayersRoster.ageGroup}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Location:</span>
                  <span className="ml-2 text-blue-600">{addingPlayersRoster.location}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Current Players:</span>
                  <span className="ml-2 text-blue-600">{addingPlayersRoster.playerCount}</span>
                </div>
              </div>
            </div>

            {/* Search and Selection Summary */}
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search available students..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {selectedStudents.length} selected • {availableStudents.length} available
                </span>
                {selectedStudents.length > 0 && (
                  <Button
                    onClick={handleAddSelectedStudents}
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add {selectedStudents.length} Students
                  </Button>
                )}
              </div>
            </div>

            {/* Available Students List */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">
                Available Students ({availableStudents.filter(student =>
                  !studentSearchTerm ||
                  student.studentName?.toLowerCase().includes(studentSearchTerm?.toLowerCase()) ||
                  student.parentName?.toLowerCase().includes(studentSearchTerm?.toLowerCase())
                ).length})
              </h4>

              {availableStudents.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {availableStudents
                    .filter(student =>
                      !studentSearchTerm ||
                      student.studentName?.toLowerCase().includes(studentSearchTerm?.toLowerCase()) ||
                      student.parentName?.toLowerCase().includes(studentSearchTerm?.toLowerCase())
                    )
                    .map((student) => {
                      const isSelected = selectedStudents.find(s => s.id === student.id);

                      return (
                        <div
                          key={student.id}
                          onClick={() => toggleStudentSelection(student)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-blue-300'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected
                                ? 'border-green-500 bg-green-500'
                                : 'border-gray-300'
                                }`}>
                                {isSelected && <Check size={14} className="text-white" />}
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {student.studentName.split(' ').map(n => n[0]).join('')}
                                </div>

                                <div>
                                  <h5 className="font-medium text-gray-800">
                                    {student.studentName}
                                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${getAgeGroupColor(student.ageGroup)}`}>
                                      {student.ageGroup}
                                    </span>
                                  </h5>
                                  <p className="text-sm text-gray-600">
                                    Parent: {student.parentName}
                                  </p>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {student.dob && (
                                      <span className="mr-3">
                                        DOB: {new Date(student.dob).toLocaleDateString()}
                                      </span>
                                    )}
                                    <span>Age: {student.calculatedAge} years</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="text-right text-sm text-gray-600">
                              <div className="flex items-center gap-1 mb-1">
                                <Mail size={12} />
                                {student.parentEmail}
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone size={12} />
                                {student.parentPhone}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Users size={48} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No eligible students found for this roster.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Students must match: <strong>{addingPlayersRoster.sport}</strong> • <strong>{addingPlayersRoster.ageGroup}</strong> • <strong>{addingPlayersRoster.location}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsAddPlayersModalOpen(false);
                  setAddingPlayersRoster(null);
                  setSelectedStudents([]);
                }}
              >
                Cancel
              </Button>

              {selectedStudents.length > 0 && (
                <Button
                  onClick={handleAddSelectedStudents}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''} to Roster
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create Roster Modal - binds to GET /rosters/options, GET /rosters/options/students, POST /rosters */}
      <Modal
        isOpen={isCreateRosterModalOpen}
        onClose={() => {
          setIsCreateRosterModalOpen(false);
          setCreateRosterError('');
        }}
        title="Create Roster"
        size="xl"
      >
        <div className="space-y-6">
          {createRosterError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {createRosterError}
            </div>
          )}

          {createRosterLoading && !createRosterLocations.length ? (
            <div className="text-center py-8 text-gray-500">Loading form options...</div>
          ) : (
            <>
              {/* Location, Sport, Grade */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <select
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                    value={typeof createRosterSelectedLocation === 'object' && createRosterSelectedLocation !== null ? createRosterSelectedLocation?.name : (createRosterSelectedLocation || '')}
                    onChange={(e) => {
                      const selectedLoc = createRosterLocations.find(loc => 
                        (typeof loc === 'object' ? loc?.name : loc) === e.target.value
                      );
                      handleCreateRosterLocationChange(selectedLoc || e.target.value);
                    }}
                  >
                    <option value="">Select location</option>
                    {createRosterLocations.map((loc) => {
                      const locName = typeof loc === 'object' ? loc?.name : loc;
                      const locId = typeof loc === 'object' ? loc?.id : loc;
                      return (
                        <option key={locId || loc} value={locName}>
                          {locName}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sport</label>
                  <select
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                    value={createRosterSelectedSport}
                    onChange={(e) => handleCreateRosterSportChange(e.target.value)}
                  >
                    <option value="">Select sport</option>
                    {createRosterSports.map((s) => (
                      <option key={s} value={typeof s === 'string' ? s : s?.name}>{typeof s === 'string' ? s : s?.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade {createRosterSelectedGrade.length > 1 && (
                      <span className="text-xs text-blue-600 ml-1">(Multi: {createRosterSelectedGrade.length})</span>
                    )}
                  </label>
                  <MultiSelect
                    options={createRosterGrades.map((grade) => ({
                      value: typeof grade === 'string' ? grade : grade?.name || grade,
                      label: typeof grade === 'string' ? grade : grade?.name || grade
                    }))}
                    value={createRosterSelectedGrade}
                    onChange={handleCreateRosterGradeChange}
                    placeholder="Select one or multiple grades"
                    searchable={true}
                  />
                </div>
              </div>

              {/* Team Name (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Team Name (optional)</label>
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  placeholder={createRosterSelectedSport && createRosterSelectedGrade && createRosterSelectedLocation
                    ? `${createRosterSelectedGrade} ${createRosterSelectedSport} - ${typeof createRosterSelectedLocation === 'object' && createRosterSelectedLocation !== null ? createRosterSelectedLocation?.name : createRosterSelectedLocation}`
                    : 'e.g. 1st Grade Soccer - National Harbor'}
                  value={createRosterTeamName}
                  onChange={(e) => setCreateRosterTeamName(e.target.value)}
                />
              </div>

              {/* Students List */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">
                  Select Students ({createRosterSelectedStudents.length} selected • {createRosterStudents.filter(student =>
                    !debouncedCreateRosterStudentSearchTerm ||
                    student.name?.toLowerCase().includes(debouncedCreateRosterStudentSearchTerm?.toLowerCase()) ||
                    student.parentName?.toLowerCase().includes(debouncedCreateRosterStudentSearchTerm?.toLowerCase()) ||
                    student.location?.toLowerCase().includes(debouncedCreateRosterStudentSearchTerm?.toLowerCase()) ||
                    student.sport?.toLowerCase().includes(debouncedCreateRosterStudentSearchTerm?.toLowerCase())
                  ).length} available)
                </h4>
                <div className="relative mb-3">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students by name, parent, location, or sport..."
                    value={createRosterStudentSearchTerm}
                    onChange={(e) => setCreateRosterStudentSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none"
                  />
                </div>
                {createRosterStudents.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {createRosterStudents
                      .filter(student =>
                        !debouncedCreateRosterStudentSearchTerm ||
                        student.name?.toLowerCase().includes(debouncedCreateRosterStudentSearchTerm?.toLowerCase()) ||
                        student.parentName?.toLowerCase().includes(debouncedCreateRosterStudentSearchTerm?.toLowerCase()) ||
                        student.location?.toLowerCase().includes(debouncedCreateRosterStudentSearchTerm?.toLowerCase()) ||
                        student.sport?.toLowerCase().includes(debouncedCreateRosterStudentSearchTerm?.toLowerCase())
                      )
                      .map((student) => {
                        const isSelected = createRosterSelectedStudents.find((s) => s.id === student.id);
                        const name = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim();
                      return (
                        <div
                          key={student.id}
                          onClick={() => toggleCreateRosterStudent(student)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                              {isSelected && <Check size={14} className="text-white" />}
                            </div>
                            <div>
                                  <h5 className="font-medium text-gray-800">
                                    {name}
                                    {student.grade && (
                                      <span className="ml-2 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                        {student.grade}
                                      </span>
                                    )}
                                    {!student.grade && student.ageGroup && (
                                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${getAgeGroupColor(student.ageGroup)}`}>
                                        {student.ageGroup}
                                      </span>
                                    )}
                                  </h5>
                                  <p className="text-sm text-gray-600">
                                    Parent: {student.parentName}
                                  </p>
                                  <div className="text-xs text-gray-500 mt-1">
                                    <span className="mr-3 flex items-center gap-1">
                                      <MapPin size={10} />
                                      {student.location}
                                    </span>
                                    <span className="mr-3 flex items-center gap-1">
                                      <Trophy size={10} />
                                      {student.sport}
                                    </span>
                                    <span className="mr-3 flex items-center gap-1">
                                      <Mail size={10} />
                                      {student.parentEmail}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Phone size={10} />
                                      {student.parentPhone}
                                    </span>
                                  </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <Users size={40} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">No students found. Select Location, Sport, and Grade to filter.</p>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="secondary" onClick={() => setIsCreateRosterModalOpen(false)}>Cancel</Button>
                <Button
                  variant="primary"
                  onClick={handleCreateRosterSubmit}
                  disabled={createRosterLoading || !createRosterSelectedLocation || !createRosterSelectedSport || !createRosterSelectedGrade}
                  className="flex items-center gap-2"
                >
                  {createRosterLoading ? 'Creating...' : 'Create Roster'}
                  <Plus size={16} />
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Assign Coach Modal */}
      <Modal
        isOpen={isAssignCoachModalOpen}
        onClose={() => {
          setIsAssignCoachModalOpen(false);
          setAssigningRoster(null);
        }}
        title={assigningRoster ? `Assign Coach to ${assigningRoster.teamName}` : 'Assign Coach'}
        size="lg"
      >
        {assigningRoster && (
          <div className="space-y-6">
            {/* Team Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-3">Team Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-700">Sport:</span>
                  <span className="ml-2 text-blue-600">{assigningRoster.sport}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Age Group:</span>
                  <span className="ml-2 text-blue-600">{assigningRoster.ageGroup}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Location:</span>
                  <span className="ml-2 text-blue-600">{assigningRoster.location}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Players:</span>
                  <span className="ml-2 text-blue-600">{assigningRoster.playerCount} registered</span>
                </div>
              </div>
            </div>

            {/* Available Coaches */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Available Coaches</h4>
              {coaches.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {coaches.map((coach) => {
                    const isPrimaryMatch = coach.primarySport === assigningRoster.sport;
                    const isSecondaryMatch = coach.secondarySports?.includes(assigningRoster.sport);
                    const hasExperience = coach.yearsExperience && parseInt(coach.yearsExperience) > 0;

                    return (
                      <div
                        key={coach.id}
                        onClick={() => handleCoachAssignment(coach.id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${isPrimaryMatch
                          ? 'border-green-500 bg-green-50 hover:bg-green-100'
                          : isSecondaryMatch
                            ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                          }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium text-gray-800">
                              {coach.firstName} {coach.lastName}
                              {isPrimaryMatch && (
                                <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                  Perfect Match
                                </span>
                              )}
                              {isSecondaryMatch && !isPrimaryMatch && (
                                <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                  Secondary Sport
                                </span>
                              )}
                            </h5>
                            <p className="text-sm text-gray-600 mt-1">
                              Primary: {coach.primarySport}
                              {coach.secondarySports?.length > 0 && (
                                <span> | Secondary: {coach.secondarySports.join(', ')}</span>
                              )}
                            </p>
                            {hasExperience && (
                              <p className="text-sm text-gray-600">
                                Experience: {coach.yearsExperience} years
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Currently assigned to {coach.assignedTeams?.length || 0} teams
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">{coach.email}</div>
                            {coach.phone && (
                              <div className="text-sm text-gray-600">{coach.phone}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <UserX size={48} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No coaches available for assignment.</p>
                  <p className="text-sm text-gray-400 mt-1">Add coaches through the Coaches management panel.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsAssignCoachModalOpen(false);
                  setAssigningRoster(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Roster Detail Modal - keeping existing implementation */}
      <Modal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        title={selectedRoster ? `${selectedRoster.ageGroup} ${selectedRoster.sport} - ${selectedRoster.location}` : ''}
        size="xl"
      >
        {selectedRoster && (
          <div className="space-y-6">
            {/* Roster Status Header */}
            <div className={`rounded-xl p-4 border-2 ${getRosterStatus(selectedRoster).color}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                    {getRosterStatus(selectedRoster).icon}
                    Status: {getRosterStatus(selectedRoster).label}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedRoster.playerCount} Registered Students • {selectedRoster.hasAssignedCoach ? 1 : 0} Assigned Coach
                  </p>
                  {selectedRoster.lastUpdated && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last updated: {new Date(selectedRoster.lastUpdated).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExportCSV(selectedRoster.id)}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <Download size={20} />
                    Export CSV
                  </Button>
                  {userRole === 'admin' && !selectedRoster.hasAssignedCoach && (
                    <Button
                      onClick={() => {
                        setIsRosterModalOpen(false);
                        handleAssignCoach(selectedRoster);
                      }}
                      variant="primary"
                      className="flex items-center gap-2"
                    >
                      <UserPlus size={20} />
                      Assign Coach
                    </Button>
                  )}
                  {/* NEW: Add Players button in modal */}
                  {userRole === 'admin' && (
                    <Button
                      onClick={() => {
                        setIsRosterModalOpen(false);
                        handleAddPlayers(selectedRoster);
                      }}
                      variant="primary"
                      className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600"
                    >
                      <Plus size={20} />
                      Add Players
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Roster Information */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team Details */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Award size={18} />
                    Team Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Team Name:</span>
                      <span className="font-medium">{selectedRoster.teamName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sport:</span>
                      <span className="font-medium flex items-center gap-1">
                        {getSportIcon(selectedRoster.sport)} {selectedRoster.sport}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Age Group:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getAgeGroupColor(selectedRoster.ageGroup)}`}>
                        {selectedRoster.ageGroup}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{selectedRoster.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Registered Students:</span>
                      <span className="font-medium text-blue-600">{selectedRoster.playerCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Children:</span>
                      <span className="font-medium text-purple-600">
                        {selectedRoster.participants?.length || 0}
                      </span>
                    </div>
                    {/* <div className="flex justify-between">
                      <span className="text-gray-600">Team Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedRoster.status === 'active' ? 'bg-green-100 text-green-800' :
                        selectedRoster.status === 'needs-coach' ? 'bg-red-100 text-red-800' :
                          selectedRoster.status === 'needs-players' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {selectedRoster.status === 'active' ? '✅ Ready to Play' :
                          selectedRoster.status === 'needs-coach' ? '❌ Needs Coach' :
                            selectedRoster.status === 'needs-players' ? '👥 Needs Players' : '⭕ Empty'}
                      </span>
                    </div> */}
                  </div>
                </div>

                {/* Coach Information */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <User size={18} />
                    Assigned Coach
                  </h4>
                  {selectedRoster.hasAssignedCoach ? (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {selectedRoster.coachName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-green-800">{selectedRoster.coachName}</p>
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                            Assigned Coach
                          </span>
                        </div>
                      </div>

                      {coaches.find(c => c.id === selectedRoster.coachId) && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <Mail size={12} />
                            {coaches.find(c => c.id === selectedRoster.coachId)?.email || 'N/A'}
                          </p>
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <Phone size={12} />
                            {coaches.find(c => c.id === selectedRoster.coachId)?.phone || 'N/A'}
                          </p>
                          <p className="text-xs text-green-600">
                            Primary Sport: {coaches.find(c => c.id === selectedRoster.coachId)?.primarySport || 'N/A'}
                          </p>
                          <p className="text-xs text-green-600">
                            Experience: {coaches.find(c => c.id === selectedRoster.coachId)?.yearsExperience || 'N/A'} years
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <UserX size={20} className="text-red-500" />
                        <p className="font-medium text-red-600">❌ No Coach Assigned</p>
                      </div>
                      <p className="text-xs text-red-500 mb-3">
                        This team needs a coach to be ready for games and practices.
                      </p>
                      {userRole === 'admin' && (
                        <button
                          onClick={() => {
                            setIsRosterModalOpen(false);
                            handleAssignCoach(selectedRoster);
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs py-2 px-3 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <UserPlus size={12} />
                          Assign Coach Now
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Complete Parent Information */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Users size={18} />
                  Registered Students ({selectedRoster.playerCount || 0})
                </h4>
                {selectedRoster.playerCount >= 8 && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                    ✅ Full Team Ready
                  </span>
                )}

              </div>

              {selectedRoster.participants && selectedRoster.participants.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {(() => {
                    const parentGroups = {};
                    selectedRoster.participants.forEach(participant => {
                      if (!parentGroups[participant.parentId]) {
                        parentGroups[participant.parentId] = {
                          parentInfo: {
                            id: participant.parentId,
                            name: participant.parentName,
                            email: participant.parentEmail,
                            phone: participant.parentPhone,
                            location: participant.location,
                            sport: participant.sport
                          },
                          children: []
                        };
                      }
                      parentGroups[participant.parentId].children.push(participant);
                    });

                    return Object.values(parentGroups).map((parentGroup, index) => (
                      <div key={parentGroup.parentInfo.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                        {/* Parent Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                              {parentGroup.parentInfo.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <h5 className="font-semibold text-gray-800">
                                {parentGroup.parentInfo.name}
                              </h5>
                              <p className="text-xs text-gray-500">Parent #{index + 1}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              {parentGroup.children.length} Student{parentGroup.children.length !== 1 ? 'ren' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Parent Contact Information */}
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <h6 className="text-xs font-medium text-gray-700 mb-2">CONTACT INFORMATION</h6>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Mail size={12} className="text-blue-500 flex-shrink-0" />
                              <span className="truncate">{parentGroup.parentInfo.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Phone size={12} className="text-green-500 flex-shrink-0" />
                              <span>{parentGroup.parentInfo.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <MapPin size={12} className="text-red-500 flex-shrink-0" />
                              <span className="truncate">{parentGroup.parentInfo.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Trophy size={12} className="text-purple-500 flex-shrink-0" />
                              <span>Registered for: {parentGroup.parentInfo.sport}</span>
                            </div>
                          </div>
                        </div>

                        {/* Children Information */}
                        <div className="space-y-2">
                          <h6 className="text-xs font-medium text-gray-700">REGISTERED CHILDREN</h6>
                          {parentGroup.children.map((student, childIndex) => (
                            <div key={student.id} className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <User size={14} className="text-blue-500" />
                                    <span className="font-medium text-blue-800 text-sm">{`${student.firstName} ${student.lastName}`}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getAgeGroupColor(student.ageGroup)}`}>
                                      {student.ageGroup}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center gap-4 text-xs text-blue-600">
                                    {student.dob && (
                                      <span className="flex items-center gap-1">
                                        <Calendar size={10} />
                                        DOB: {new Date(student.dob).toLocaleDateString()}
                                      </span>
                                    )}
                                    <span>
                                      Current Age: {student.dob ? calculateCurrentAge(student.dob) : 'N/A'} years
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs text-blue-600 font-medium">
                                    Student #{childIndex + 1}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Registration Details */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>Registered: {parentGroup.children[0]?.registeredAt ?
                              new Date(parentGroup.children[0].registeredAt).toLocaleDateString() :
                              'N/A'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users size={10} />
                              Family ID: {parentGroup.parentInfo.id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Users size={48} className="mx-auto text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Families Registered</h3>
                  <p className="text-gray-500 mb-4">
                    This roster doesn't have any registered families yet.
                  </p>
                  <p className="text-sm text-gray-400">
                    Families will appear here when parents register their children for:
                  </p>
                  <div className="mt-2 inline-flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
                    <span className="font-medium text-gray-700">{selectedRoster.sport}</span>
                    <span>•</span>
                    <span className="font-medium text-gray-700">{selectedRoster.ageGroup}</span>
                    <span>•</span>
                    <span className="font-medium text-gray-700">{selectedRoster.location}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Team Statistics */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp size={18} />
                Team Statistics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedRoster.playerCount || 0}</div>
                  <div className="text-xs text-blue-600">Total Families</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{selectedRoster.participants?.length || 0}</div>
                  <div className="text-xs text-purple-600">Total Children</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedRoster.hasAssignedCoach ? 1 : 0}
                  </div>
                  <div className="text-xs text-green-600">Assigned Coaches</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {selectedRoster.participants?.filter(p => p.dob && calculateCurrentAge(p.dob) >= 8).length || 0}
                  </div>
                  <div className="text-xs text-yellow-600">Players 8+ Years</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                onClick={() => handleExportCSV(selectedRoster.id)}
                variant="secondary"
                className="flex items-center gap-2 justify-center"
              >
                <Download size={16} />
                Export Family List
              </Button>

              {userRole === 'admin' && !selectedRoster.hasAssignedCoach && selectedRoster.playerCount > 0 && (
                <Button
                  onClick={() => {
                    setIsRosterModalOpen(false);
                    handleAssignCoach(selectedRoster);
                  }}
                  variant="primary"
                  className="flex items-center gap-2 justify-center"
                >
                  <UserPlus size={16} />
                  Assign Coach
                </Button>
              )}

              {userRole === 'admin' && (
                <Button
                  onClick={() => {
                    setIsRosterModalOpen(false);
                    handleAddPlayers(selectedRoster);
                  }}
                  variant="primary"
                  className="flex items-center gap-2 justify-center bg-purple-500 hover:bg-purple-600"
                >
                  <Plus size={16} />
                  Add Players
                </Button>
              )}

              <Button
                onClick={() => setIsRosterModalOpen(false)}
                variant="secondary"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Rosters;