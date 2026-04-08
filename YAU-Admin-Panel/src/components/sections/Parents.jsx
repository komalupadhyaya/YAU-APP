import React, { useState, useEffect } from 'react';
import Header from '../layout/Header';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Table, { TableRow, TableCell } from '../common/Table';
import { Autocomplete } from '../common/AutoComplete'; // Import Autocomplete
import { getLocations, COLLECTIONS, createInterestRecordNew } from '../../firebase/firestore';
import { Plus, Edit, Trash2, Search, Users, User, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, EyeOff, Eye } from 'lucide-react';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import CustomDatePicker from '../common/CustomDatePicker';
import TextField from '../common/TextField';
import { addParent, deleteParent, getParents, updateParent, createFirebaseAuthUser } from '../../firebase/apis/api-parents';
// Helper function to parse name field into firstName and lastName and ensure consistency
const parseNameField = (user) => {
  // If already has separate fields, use them
  if (user.firstName && user.lastName) {
    return {
      firstName: user.firstName,
      lastName: user.lastName
    };
  }
  // If has firstName but no lastName
  else if (user.firstName && !user.lastName) {
    return {
      firstName: user.firstName,
      lastName: ''
    };
  }
  // If has old name field, parse it
  else if (user.name) {
    const nameParts = user.name.trim().split(' ');
    return {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || ''
    };
  }
  // Fallback
  else {
    return {
      firstName: '',
      lastName: ''
    };
  }
};
const Parents = () => {
  const [parents, setParents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningParent, setAssigningParent] = useState(null);
  const [selectedAssignments, setSelectedAssignments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showPassword, setShowPassword] = useState(false);

  // Phone validation states
  const [phoneErrors, setPhoneErrors] = useState({
    add: '',
    edit: ''
  });

  const [newParent, setNewParent] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    location: '',
    sport: '',
    smsOtpIn: false,
    students: []
  });

  const sportsOptions = ['Soccer', 'Basketball', 'Baseball', 'Track & Field', 'Flag Football', 'Tackle Football', 'Kickball', 'Golf', 'Cheer'];

  const itemsPerPageOptions = [5, 10, 25, 50, 100];

  // Phone number validation function
  const validatePhoneNumber = (phone) => {
    if (!phone) {
      return { isValid: false, error: 'Phone number is required' };
    }

    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // Check if it's empty after removing non-digits
    if (!digitsOnly) {
      return { isValid: false, error: 'Phone number must contain digits' };
    }

    // Check for US phone number (10 digits) or international (7-15 digits)
    if (digitsOnly.length === 10) {
      // US phone number validation
      if (digitsOnly.startsWith('0') || digitsOnly.startsWith('1')) {
        return { isValid: false, error: 'US phone numbers cannot start with 0 or 1' };
      }
      return { isValid: true, error: '' };
    } else if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      // International phone number
      return { isValid: true, error: '' };
    } else {
      return {
        isValid: false,
        error: 'Phone number must be 10 digits (US) or 7-15 digits (international)'
      };
    }
  };

  // Format phone number for display (US format)
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';

    const digitsOnly = phone.replace(/\D/g, '');

    if (digitsOnly.length === 10) {
      // Format as (XXX) XXX-XXXX for US numbers
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    }

    return phone; // Return as-is for international numbers
  };

  // Handle phone number input with validation
  const handlePhoneChange = (value, isEditing = false) => {
    const validation = validatePhoneNumber(value);

    if (isEditing) {
      setEditingParent({ ...editingParent, phone: value });
      setPhoneErrors({ ...phoneErrors, edit: validation.error });
    } else {
      setNewParent({ ...newParent, phone: value });
      setPhoneErrors({ ...phoneErrors, add: validation.error });
    }
  };

  // Calculate age group based on DOB with July 31st cutoff
  const calculateAgeGroup = (dob) => {
    if (!dob) return 'N/A';

    const birthDate = new Date(dob);
    const cutoffDate = new Date(new Date().getFullYear(), 6, 31); // July 31st
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    if (today < cutoffDate &&
      (birthDate.getMonth() > 6 ||
        (birthDate.getMonth() === 6 && birthDate.getDate() > 31))) {
      age--;
    }

    if (age < 3) return 'N/A';
    return `${age}U`;
  };

  // Calculate age for display
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

  // Helper function to get sport icon
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

  // Process locations for autocomplete
  const getLocationOptions = () => {
    return locations.map(location => {
      if (typeof location === 'string') {
        return location;
      }
      // Handle location objects - extract meaningful display name
      if (location.name) return location.name;
      if (location.city && location.state) return `${location.city}, ${location.state}`;
      if (location.address) return location.address;
      return 'Unknown Location';
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [parentsData, locationsData] = await Promise.all([
        getParents(),
        getLocations()
      ]);

      // Normalize parent data to ensure firstName/lastName fields
      const normalizedParents = parentsData.map(parent => {
        const { firstName, lastName } = parseNameField(parent);
        return {
          ...parent,
          firstName,
          lastName,
          // Keep the original name field for reference but prioritize firstName/lastName
          ...(parent.name && !parent.firstName && !parent.lastName ? { originalName: parent.name } : {})
        };
      });

      setParents(normalizedParents);
      console.log("normalized parents", normalizedParents);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // const getAvailableCoachesAndTeams = async (parentLocation, childAgeGroup, sport) => {
  //   try {
  //     console.log(`🔍 Finding coaches for: ${sport} - ${childAgeGroup} - ${parentLocation}`);
  //     const allCoaches = await getCoaches();

  //     const availableCoaches = allCoaches.filter(coach => {
  //       if (!coach.assignedTeams || coach.assignedTeams.length === 0) {
  //         return false;
  //       }

  //       const hasMatchingTeam = coach.assignedTeams.some(team =>
  //         team.sport === sport &&
  //         team.ageGroup === childAgeGroup &&
  //         team.location === parentLocation
  //       );

  //       return hasMatchingTeam;
  //     });

  //     const coachesWithTeams = availableCoaches.map(coach => {
  //       const matchingTeams = coach.assignedTeams.filter(team =>
  //         team.sport === sport &&
  //         team.ageGroup === childAgeGroup &&
  //         team.location === parentLocation
  //       );

  //       return {
  //         ...coach,
  //         availableTeams: matchingTeams
  //       };
  //     });

  //     return {
  //       coaches: coachesWithTeams,
  //       hasAvailableTeams: coachesWithTeams.length > 0,
  //       searchCriteria: {
  //         sport,
  //         ageGroup: childAgeGroup,
  //         location: parentLocation
  //       }
  //     };
  //   } catch (error) {
  //     console.error('❌ Error filtering coaches:', error);
  //     throw error;
  //   }
  // };

  // const handleAssignClick = async (parent) => {
  //   try {
  //     setAssigningParent(parent);
  //     setLoading(true);

  //     if (!parent.students || parent.students.length === 0) {
  //       alert('⚠️ This parent has no students to assign.');
  //       return;
  //     }

  //     const studentAssignmentOptions = [];
  //     for (const student of parent.students) {
  //       const studentName = student.name || student.firstName || 'Unnamed';
  //       const studentAgeGroup = calculateAgeGroup(student.dob);

  //       const options = await getAvailableCoachesAndTeams(
  //         parent.location,
  //         studentAgeGroup,
  //         parent.sport
  //       );

  //       studentAssignmentOptions.push({
  //         student: student,
  //         studentName: studentName,
  //         ...options,
  //         selectedCoachId: null,
  //         selectedTeamId: null
  //       });
  //     }

  //     setSelectedAssignments(studentAssignmentOptions);
  //     setIsAssignModalOpen(true);
  //   } catch (error) {
  //     console.error('❌ Error loading assignment options:', error);
  //     alert('Error loading coaches: ' + error.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const getStudentAssignmentStatus = (parent) => {
  //   if (!parent.students || parent.students.length === 0) {
  //     return { status: 'no-students', message: 'No students' };
  //   }

  //   if (parent.assignmentStatus === 'assigned') {
  //     return { status: 'assigned', message: 'Assigned to teams' };
  //   }

  //   return { status: 'pending', message: 'Pending assignment' };
  // };

  const handleCoachSelection = (studentIndex, coachId) => {
    const updatedAssignments = [...selectedAssignments];
    const assignment = updatedAssignments[studentIndex];

    assignment.selectedCoachId = coachId || null;

    if (coachId) {
      const selectedCoach = assignment.coaches.find(c => c.id === coachId);
      if (selectedCoach && selectedCoach.availableTeams) {
        assignment.selectedTeamId = selectedCoach.availableTeams[0]?.id || null;
        assignment.selectedCoach = selectedCoach;
      }
    } else {
      assignment.selectedTeamId = null;
      assignment.selectedCoach = null;
    }

    setSelectedAssignments(updatedAssignments);
  };

  const handleTeamSelection = (studentIndex, teamId) => {
    const updatedAssignments = [...selectedAssignments];
    updatedAssignments[studentIndex].selectedTeamId = teamId;
    setSelectedAssignments(updatedAssignments);
  };

  const handleManualAssignment = async () => {
    try {
      console.log('🎯 Processing manual assignments...');
      const batch = writeBatch(db);
      const currentTimestamp = new Date().toISOString();
      let assignedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const assignment of selectedAssignments) {
        if (assignment.selectedCoachId && assignment.selectedTeamId && assignment.hasAvailableTeams) {
          const selectedCoach = assignment.selectedCoach;
          const selectedTeam = selectedCoach.availableTeams.find(t => t.id === assignment.selectedTeamId);

          if (!selectedTeam) {
            console.warn(`⚠️ Selected team not found for ${assignment.studentName}`);
            skippedCount++;
            continue;
          }

          const participantData = {
            id: `${assigningParent.id}-${assignment.student.name || assignment.student.firstName}`,
            name: assignment.student.name || assignment.student.firstName || '',
            dob: assignment.student.dob || null,
            ageGroup: calculateAgeGroup(assignment.student.dob) || '6U',
            parentId: assigningParent.id,
            parentName: `${assigningParent.firstName} ${assigningParent.lastName}`,
            parentEmail: assigningParent.email || '',
            parentPhone: assigningParent.phone || '',
            sport: assigningParent.sport,
            location: assigningParent.location,
            coachId: assignment.selectedCoachId,
            coachName: `${selectedCoach.firstName} ${selectedCoach.lastName}`,
            teamId: assignment.selectedTeamId,
            teamName: selectedTeam.teamName,
            assignedAt: currentTimestamp,
            assignedBy: 'admin'
          };

          const rosterRef = doc(db, 'rosters', assignment.selectedTeamId);
          const rosterSnap = await getDoc(rosterRef);

          if (rosterSnap.exists()) {
            const rosterData = rosterSnap.data();
            const existingParticipants = rosterData.participants || [];
            const existingIndex = existingParticipants.findIndex(p => p.id === participantData.id);

            let updatedParticipants;
            if (existingIndex >= 0) {
              updatedParticipants = [...existingParticipants];
              updatedParticipants[existingIndex] = participantData;
              updatedCount++;
            } else {
              updatedParticipants = [...existingParticipants, participantData];
              assignedCount++;
            }

            const updateData = {
              participants: updatedParticipants,
              players: updatedParticipants,
              playerCount: updatedParticipants.length,
              hasPlayers: true,
              status: 'active',
              lastUpdated: serverTimestamp()
            };

            batch.update(rosterRef, updateData);
          }
        } else {
          skippedCount++;
          console.log(`⏭️ Skipping ${assignment.studentName} - incomplete selection or no teams available`);
        }
      }

      if (assignedCount > 0 || updatedCount > 0) {
        const parentRef = doc(db, COLLECTIONS.PARENTS, assigningParent.id);
        batch.update(parentRef, {
          assignedAt: serverTimestamp(),
          assignedBy: 'admin',
          lastAssignmentUpdate: currentTimestamp
        });
      }

      await batch.commit();

      setIsAssignModalOpen(false);
      setAssigningParent(null);
      setSelectedAssignments([]);
      loadData();

      let message = '';
      if (assignedCount > 0) message += `✅ ${assignedCount} new assignments completed. `;
      if (updatedCount > 0) message += `🔄 ${updatedCount} existing assignments updated. `;
      if (skippedCount > 0) message += `⏭️ ${skippedCount} students skipped (no teams available or incomplete selection).`;

      alert(message || 'No changes were made.');
    } catch (error) {
      console.error('❌ Error in manual assignment:', error);
      alert(`Error assigning to teams: ${error.message}`);
    }
  };

  const handleAddParent = async (e) => {
    e.preventDefault();

    // Validate phone number before submitting
    const phoneValidation = validatePhoneNumber(newParent.phone);
    if (!phoneValidation.isValid) {
      setPhoneErrors({ ...phoneErrors, add: phoneValidation.error });
      return;
    }

    try {

      // Prepare parent data with firstName/lastName (no name field)
      const parentData = {
        ...newParent,
        phone: formatPhoneNumber(newParent.phone),
        // Ensure we're using firstName and lastName, not name
        firstName: newParent.firstName,
        lastName: newParent.lastName,
        students: newParent.students.map(student => ({
          ...student,
          ageGroup: calculateAgeGroup(student.dob),
          // Also ensure students use firstName/lastName if they have name field
          firstName: student.firstName || (student.name ? student.name.split(' ')[0] : ''),
          lastName: student.lastName || (student.name ? student.name.split(' ').slice(1).join(' ') : '')
        }))
      };

      // Remove any old name field
      delete parentData.name;
      parentData.students = parentData.students.map(student => {
        const { name, ...studentWithoutName } = student;
        return studentWithoutName;
      });

      await addParent(parentData);

      // Reset form
      setNewParent({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        location: '',
        sport: 'Soccer',
        smsOtpIn: false,
        students: []
      });
      setPhoneErrors({ ...phoneErrors, add: '' });

      setIsAddModalOpen(false);
      loadData();

      console.log('✅ Parent added with firstName/lastName structure');

      alert(`✅ Parent registered successfully! 
    
🎯 Rosters automatically created for:
${parentData.students.map(s => `• ${s?.ageGroup} ${parentData.sport} - ${parentData.location}`).join('\n')}

These rosters are now available for coach assignment.`);

    } catch (error) {
      console.error('❌ Error adding parent:', error.message);
      alert(`Error: ${error.message}`);
    }
  };

  // In Parents.js - Update handleEditParent
  const handleEditParent = async (e) => {
    e.preventDefault();

    // Validate phone number before submitting
    const phoneValidation = validatePhoneNumber(editingParent.phone);
    if (!phoneValidation.isValid) {
      setPhoneErrors({ ...phoneErrors, edit: phoneValidation.error });
      return;
    }

    try {
      // Prepare updated parent data with firstName/lastName
      const parentData = {
        ...editingParent,
        phone: formatPhoneNumber(editingParent.phone),
        // Ensure we're using firstName and lastName
        firstName: editingParent.firstName,
        lastName: editingParent.lastName,
        students: editingParent.students.map(student => ({
          ...student,
          ageGroup: calculateAgeGroup(student.dob),
          // Ensure students also use firstName/lastName
          firstName: student.firstName || (student.name ? student.name.split(' ')[0] : ''),
          lastName: student.lastName || (student.name ? student.name.split(' ').slice(1).join(' ') : '')
        }))
      };

      // Remove any old name field
      delete parentData.name;
      delete parentData.originalName;
      parentData.students = parentData.students.map(student => {
        const { name, ...studentWithoutName } = student;
        return studentWithoutName;
      });

      await updateParent(editingParent.id, parentData);

      setEditingParent(null);
      setPhoneErrors({ ...phoneErrors, edit: '' });
      loadData();

      alert(`✅ Parent updated successfully!
    
🔄 Data normalized to use firstName/lastName structure:
- Student data synchronized
- Team assignments updated
- Age groups recalculated`);

    } catch (error) {
      console.error('Error updating parent:', error);
      alert(`Error updating parent: ${error.message}`);
    }
  };

  const handleDeleteParent = async (id) => {
    if (window.confirm('Are you sure you want to delete this parent?')) {
      try {
        await deleteParent(id);
        loadData();
      } catch (error) {
        console.error('Error deleting parent:', error);
      }
    }
  };

  const addStudent = (isEditing = false) => {
    const target = isEditing ? editingParent : newParent;
    const setter = isEditing ? setEditingParent : setNewParent;

    const newStudent = {
      firstName: '',
      lastName: '',
      dob: '',
      ageGroup: '' // Initialize with empty string instead of undefined
    };

    setter({
      ...target,
      students: [...(target.students || []), newStudent]
    });
  };

  const updateStudent = (index, field, value, isEditing = false) => {
    const target = isEditing ? editingParent : newParent;
    const setter = isEditing ? setEditingParent : setNewParent;

    const updatedStudents = [...(target.students || [])];

    // Ensure the student object exists
    if (!updatedStudents[index]) {
      updatedStudents[index] = {
        firstName: '',
        lastName: '',
        dob: '',
        ageGroup: ''
      };
    }

    // Update the specific field
    updatedStudents[index] = {
      ...updatedStudents[index],
      [field]: value,
      // Recalculate age group if DOB changes, otherwise preserve existing ageGroup
      ageGroup: field === 'dob'
        ? calculateAgeGroup(value)
        : (updatedStudents[index]?.ageGroup || calculateAgeGroup(updatedStudents[index]?.dob))
    };

    setter({
      ...target,
      students: updatedStudents
    });
  };

  const removeStudent = (index, isEditing = false) => {
    const target = isEditing ? editingParent : newParent;
    const setter = isEditing ? setEditingParent : setNewParent;

    const updatedStudents = (target.students || []).filter((_, i) => i !== index);

    setter({
      ...target,
      students: updatedStudents
    });
  };

  const filteredParents = parents.filter(parent =>
    `${parent.firstName} ${parent.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.sport?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = filteredParents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredParents.slice(startIndex, endIndex);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Parents Management"
        subtitle="Manage all registered parents and their students"
      />

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              All Parents ({totalItems})
            </h3>
            {searchTerm && (
              <p className="text-sm text-gray-600 mt-1">
                Showing {currentItems.length} of {totalItems} filtered results
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search parents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus size={20} className="mr-2" />
              Add Parent
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
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

          {totalPages > 1 && (
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table headers={['Actions','Name', 'Email', 'Phone', 'Location', 'Sport', 'Students', 'SMS Opt-in', 'Joined', ]}>
            {currentItems.map((parent) => (
              <TableRow key={parent.id}>
                <TableCell>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const { firstName, lastName } = parseNameField(parent);
                        setEditingParent({
                          ...parent,
                          firstName,
                          lastName
                        });
                      }}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Edit Parent"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteParent(parent.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Delete Parent"
                    >
                      <Trash2 size={16} />
                    </button>
                    {/* <button
                      onClick={() => handleAssignClick(parent)}
                      className={`p-1 hover:scale-110 transition-transform ${getStudentAssignmentStatus(parent).status === 'assigned'
                        ? 'text-blue-600 hover:text-blue-800'
                        : 'text-green-600 hover:text-green-800'
                        }`}
                      title={
                        getStudentAssignmentStatus(parent).status === 'assigned'
                          ? 'Update Team Assignment'
                          : 'Assign to Team'
                      }
                      disabled={!parent.students || parent.students.length === 0}
                    >
                      <UserPlus size={16} />
                    </button> */}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {(() => {
                    const { firstName, lastName } = parseNameField(parent);
                    return `${firstName} ${lastName}`.trim() || 'No Name';
                  })()}
                </TableCell>
                <TableCell>{parent.email}</TableCell>
                <TableCell>{parent.phone || 'N/A'}</TableCell>
                <TableCell>{parent.location}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    {parent.sport}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {(parent.students || []).map((student, index) => {
                      const studentFirstName = student.firstName || (student.name ? student.name.split(' ')[0] : '');
                      const studentLastName = student.lastName || (student.name ? student.name.split(' ').slice(1).join(' ') : '');
                      const fullName = `${studentFirstName} ${studentLastName}`.trim() || 'Unnamed';

                      return (
                        <div key={index} className="flex items-center gap-2">
                          <User size={12} className="text-blue-500" />
                          <span className="text-sm">
                            {fullName} ({calculateAgeGroup(student.dob)}) - Age {calculateAge(student.dob)}
                          </span>
                        </div>
                      );
                    })}
                    {(!parent.students || parent.students.length === 0) && (
                      <span className="text-gray-500 text-sm">No students</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${parent.smsOtpIn
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                    }`}>
                    {parent.smsOtpIn ? 'Yes' : 'No'}
                  </span>
                </TableCell>
                <TableCell>
                  {parent.createdAt ? (
                    parent.createdAt.toDate ?
                      parent.createdAt.toDate().toLocaleDateString() :
                      new Date(parent.createdAt).toLocaleDateString()
                  ) : 'N/A'}
                </TableCell>

                
              </TableRow>
            ))}
          </Table>
        </div>

        {currentItems.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 mb-2">
              {searchTerm ? 'No parents found matching your search.' : 'No parents found. Add your first parent!'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-primary-600 hover:text-primary-800 text-sm"
              >
                Clear search to see all parents
              </button>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages} ({totalItems} total entries)
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

      {/* Add Parent Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setPhoneErrors({ ...phoneErrors, add: '' });
        }}
        title="Add New Parent"
        size="lg"
      >
        <form onSubmit={handleAddParent} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name <span className="pl-1 text-red-500">*</span></label>
              <input
                type="text"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={newParent.firstName}
                onChange={(e) => setNewParent({ ...newParent, firstName: e.target.value })}
                required
                placeholder="Enter first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name <span className="pl-1 text-red-500">*</span></label>
              <input
                type="text"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={newParent.lastName}
                onChange={(e) => setNewParent({ ...newParent, lastName: e.target.value })}
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
              value={newParent.email}
              onChange={(e) => setNewParent({ ...newParent, email: e.target.value })}
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
                value={newParent.password}
                onChange={(e) => setNewParent({ ...newParent, password: e.target.value })}
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

          {/* Phone Number Input with Validation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="pl-1 text-red-500">*</span>
            </label>
            <input
              type="tel"
              className={`w-full p-3 border-2 rounded-xl focus:outline-none transition-colors ${phoneErrors.add
                ? 'border-red-300 focus:border-red-500'
                : 'border-gray-200 focus:border-primary-500'
                }`}
              value={newParent.phone}
              onChange={(e) => handlePhoneChange(e.target.value, false)}
              required
              placeholder="Enter phone number (e.g., (555) 123-4567)"
            />
            {phoneErrors.add && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {phoneErrors.add}
              </p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              📱 US format: (555) 123-4567 • International: +1-555-123-4567
            </p>
          </div>

          {/* Location - Using Autocomplete for Add Modal */}
          <Autocomplete
            label="Location"
            options={getLocationOptions()}
            value={newParent.location}
            onChange={(value) => setNewParent({ ...newParent, location: value })}
            placeholder="Select or enter location"
            getOptionLabel={(location) => location}
            getOptionValue={(location) => location}
            allowCustomInput={true}
            required
          />

          {/* Sport - Using Autocomplete for Add Modal */}
          <Autocomplete
            label="Sport"
            options={sportsOptions}
            value={newParent.sport}
            onChange={(value) => setNewParent({ ...newParent, sport: value })}
            placeholder="Select sport"
            getOptionLabel={(sport) => `${getSportIcon(sport)} ${sport}`}
            getOptionValue={(sport) => sport}
            required
          />

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">Students</label>
              <Button type="button" variant="secondary" size="sm" onClick={() => addStudent(false)}>
                <Plus size={16} className="mr-1" />
                Add Student
              </Button>
            </div>

            {(newParent.students || []).map((student, index) => (
              <div key={index} className="border-2 border-gray-200 rounded-xl p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">Student {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeStudent(index, false)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <TextField
                      label="First Name"
                      type="text"
                      value={student.firstName || ''}
                      onChange={(e) => updateStudent(index, 'firstName', e.target.value, false)}
                      placeholder="Student's first name"
                      required
                    />
                  </div>
                  <div>
                    <TextField
                      label="Last Name"
                      type="text"
                      value={student.lastName || ''}
                      onChange={(e) => updateStudent(index, 'lastName', e.target.value, false)}
                      placeholder="Student's last name"
                      required
                    />
                  </div>

                  <div>
                    <CustomDatePicker
                      label="Date of Birth"
                      value={student.dob}
                      onChange={(value) => updateStudent(index, 'dob', value, false)}
                      placeholder="mm-dd-yyyy"
                      required
                      textpadding="14px"
                      minDate=""
                    />
                    {student.dob && (
                      <p className="text-sm text-gray-600 mt-1">
                        Age Group: {calculateAgeGroup(student.dob)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="smsOtpIn"
              className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
              checked={newParent.smsOtpIn}
              onChange={(e) => setNewParent({ ...newParent, smsOtpIn: e.target.checked })}
            />
            <label htmlFor="smsOtpIn" className="ml-2 text-sm text-gray-700">
              SMS Opt-in for updates and notifications
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                setPhoneErrors({ ...phoneErrors, add: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!!phoneErrors.add}>
              Add Parent
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Parent Modal - UPDATED with Phone Validation */}
      {editingParent && (
        <Modal
          isOpen={!!editingParent}
          onClose={() => {
            setEditingParent(null);
            setPhoneErrors({ ...phoneErrors, edit: '' });
          }}
          title="Edit Parent"
          size="lg"
        >
          <form onSubmit={handleEditParent} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name <span className="pl-1 text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  value={editingParent.firstName}
                  onChange={(e) => setEditingParent({ ...editingParent, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name <span className="pl-1 text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  value={editingParent.lastName}
                  onChange={(e) => setEditingParent({ ...editingParent, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="pl-1 text-red-500">*</span></label>
              <input
                type="email"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={editingParent.email}
                onChange={(e) => setEditingParent({ ...editingParent, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={editingParent.password}
                  onChange={(e) => setEditingParent({ ...editingParent, password: e.target.value })}
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

            {/* Phone Number Input with Validation for Edit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="pl-1 text-red-500">*</span>
              </label>
              <input
                type="tel"
                className={`w-full p-3 border-2 rounded-xl focus:outline-none transition-colors ${phoneErrors.edit
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-200 focus:border-primary-500'
                  }`}
                value={editingParent.phone || ''}
                onChange={(e) => handlePhoneChange(e.target.value, true)}
                required
                placeholder="Enter phone number (e.g., (555) 123-4567)"
              />
              {phoneErrors.edit && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {phoneErrors.edit}
                </p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                📱 US format: (555) 123-4567 • International: +1-555-123-4567
              </p>
            </div>

            {/* Location */}
            <Autocomplete
              label="Location"
              options={getLocationOptions()}
              value={editingParent.location}
              onChange={(value) => setEditingParent({ ...editingParent, location: value })}
              placeholder="Select or enter location"
              getOptionLabel={(location) => location}
              getOptionValue={(location) => location}
              allowCustomInput={true}
              required
            />

            {/* Sport */}
            <Autocomplete
              label="Sport "
              options={sportsOptions}
              value={editingParent.sport}
              onChange={(value) => setEditingParent({ ...editingParent, sport: value })}
              placeholder="Select sport"
              getOptionLabel={(sport) => `${getSportIcon(sport)} ${sport}`}
              getOptionValue={(sport) => sport}
              required
            />

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">Students</label>
                <Button type="button" variant="secondary" size="sm" onClick={() => addStudent(true)}>
                  <Plus size={16} className="mr-1" />
                  Add Student
                </Button>
              </div>

              {(editingParent.students || []).map((student, index) => (
                <div key={index} className="border-2 border-gray-200 rounded-xl p-4 mb-3">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">Student {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeStudent(index, true)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <TextField
                        label="First Name"
                        type="text"
                        value={student.firstName || ''}
                        onChange={(e) => updateStudent(index, 'firstName', e.target.value, true)}
                        placeholder="Student's first name"
                        required
                      />
                    </div>
                    <div>
                      <TextField
                        label="Last Name"
                        type="text"
                        value={student.lastName || ''}
                        onChange={(e) => updateStudent(index, 'lastName', e.target.value, true)}
                        placeholder="Student's last name"
                        required
                      />
                    </div>
                    <div>
                      <CustomDatePicker
                        label="Date of Birth"
                        value={student.dob}
                        onChange={(e) => updateStudent(index, 'dob', e, true)}
                        placeholder="mm-dd-yyyy"
                        required
                        textpadding="14px"
                        minDate=""
                      />
                      {student.dob && (
                        <p className="text-sm text-gray-600 mt-1">
                          Age Group: {calculateAgeGroup(student.dob)}
                        </p>
                      )}

                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="editSmsOtpIn"
                className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                checked={editingParent.smsOtpIn}
                onChange={(e) => setEditingParent({ ...editingParent, smsOtpIn: e.target.checked })}
              />
              <label htmlFor="editSmsOtpIn" className="ml-2 text-sm text-gray-700">
                SMS Opt-in for updates and notifications
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingParent(null);
                  setPhoneErrors({ ...phoneErrors, edit: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!!phoneErrors.edit}>
                Update Parent
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assignment Modal remains the same */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssigningParent(null);
          setSelectedAssignments([]);
        }}
        title={assigningParent ? `Assign ${assigningParent.firstName} ${assigningParent.lastName}'s Students` : 'Assign to Teams'}
        size="xl"
      >
        {assigningParent && (
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Parent Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Name:</strong> {assigningParent.firstName} {assigningParent.lastName}</div>
                <div><strong>Email:</strong> {assigningParent.email}</div>
                <div><strong>Sport:</strong> {assigningParent.sport}</div>
                <div><strong>Location:</strong> {assigningParent.location}</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800">Student Assignment Options:</h4>

              {selectedAssignments.map((assignment, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <User size={20} className="text-blue-500" />
                      <div>
                        <h5 className="font-medium text-gray-800">{assignment.studentName}</h5>
                        <p className="text-sm text-gray-600">
                          {calculateAgeGroup(assignment.student.dob)} • {assignment.searchCriteria.sport} • {assignment.searchCriteria.location}
                        </p>
                      </div>
                    </div>

                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${assignment.hasAvailableTeams
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {assignment.hasAvailableTeams
                        ? `${assignment.coaches.length} coaches available`
                        : 'No teams available'
                      }
                    </div>
                  </div>

                  {assignment.hasAvailableTeams ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Coach</label>
                        <select
                          className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
                          value={assignment.selectedCoachId || ''}
                          onChange={(e) => handleCoachSelection(index, e.target.value)}
                        >
                          <option value="">Choose a coach...</option>
                          {assignment.coaches.map(coach => (
                            <option key={coach.id} value={coach.id}>
                              {coach.firstName} {coach.lastName} ({coach.availableTeams.length} teams)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Team</label>
                        <select
                          className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
                          value={assignment.selectedTeamId || ''}
                          onChange={(e) => handleTeamSelection(index, e.target.value)}
                          disabled={!assignment.selectedCoachId}
                        >
                          <option value="">Choose a team...</option>
                          {assignment.selectedCoach?.availableTeams.map(team => (
                            <option key={team.id} value={team.id}>
                              {team.teamName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h6 className="font-medium text-red-800 mb-2">No Teams Available</h6>
                          <p className="text-sm text-red-700 mb-4">
                            No coaches are currently assigned to handle <strong>{calculateAgeGroup(assignment.student.dob)} {assignment.searchCriteria.sport}</strong> at <strong>{assignment.searchCriteria.location}</strong>.
                          </p>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const params = new URLSearchParams({
                                  sport: assignment.searchCriteria.sport,
                                  ageGroup: calculateAgeGroup(assignment.student.dob),
                                  location: assignment.searchCriteria.location,
                                  action: 'assign_coach'
                                });
                                window.open(`/coaches?${params.toString()}`, '_blank');
                              }}
                            >
                              🎯 Assign Coach to This Age Group
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                createInterestRecordNew(assigningParent.id, assigningParent, assignment.student, {
                                  ...assignment.searchCriteria,
                                  ageGroup: calculateAgeGroup(assignment.student.dob)
                                });
                                alert(`📝 Added ${assignment.studentName} to waiting list. They will be notified when a team becomes available.`);
                              }}
                            >
                              📝 Add to Waiting List
                            </Button>
                          </div>

                          <p className="text-xs text-red-600 mt-3">
                            💡 <strong>What to do:</strong> Either assign a coach to handle this age group at this location, or add the student to the waiting list until a team becomes available.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-800 mb-2">Assignment Summary</h5>
              <div className="space-y-1 text-sm">
                {selectedAssignments.map((assignment, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{assignment.studentName}:</span>
                    <span className={assignment.selectedCoachId && assignment.selectedTeamId ? 'text-green-600' : 'text-gray-500'}>
                      {assignment.selectedCoachId && assignment.selectedTeamId
                        ? '✅ Ready to assign'
                        : assignment.hasAvailableTeams
                          ? '⏳ Select coach & team'
                          : '❌ No teams available'
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                {selectedAssignments.filter(a => a.selectedCoachId && a.selectedTeamId).length} of {selectedAssignments.length} students ready for assignment
              </div>

              <div className="flex space-x-3">
                <Button variant="secondary" onClick={() => setIsAssignModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleManualAssignment}
                  disabled={!selectedAssignments.some(a => a.selectedCoachId && a.selectedTeamId)}
                >
                  Assign Selected Students
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Parents;