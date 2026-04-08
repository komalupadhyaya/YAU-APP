// components/pages/Members.jsx
import React, { useState, useEffect } from 'react';
import {
  Search,
  Users,
  User,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Trophy,
  Save,
  X,
  Plus,
  AlertTriangle
} from 'lucide-react';
import AddMemberForm from '../layout/AddMemberForm';
import {
  updateMember,
  deleteMember,
  getMemberById,
  batchDeleteMembers,
  getMembers,
} from '../../firebase/apis/api-parents';
import Header from '../layout/Header';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Table, { TableRow, TableCell } from '../common/Table';
import { API_CONFIG, buildApiUrl } from '../../firebase/config';

// EditMemberForm Component
const EditMemberForm = ({ member, onSave, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    sport: '',
    membershipType: '',
    isPaidMember: false,
    students: []
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (member) {
      setFormData({
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        email: member.email || '',
        phone: member.phone || '',
        location: member.location || '',
        sport: member.sport || '',
        membershipType: member.membershipType || '',
        isPaidMember: member.isPaidMember || false,
        students: member.students || []
      });
    }
  }, [member]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const updatedData = {
      ...formData,
      phone: formData.phone ? formData.phone.replace(/\D/g, '') : null
    };

    onSave(updatedData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const addStudent = () => {
    setFormData(prev => ({
      ...prev,
      students: [...prev.students, {
        firstName: '',
        lastName: '',
        dob: '',
        ageGroup: ''
      }]
    }));
  };

  const updateStudent = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      students: prev.students.map((student, i) =>
        i === index ? { ...student, [field]: value } : student
      )
    }));
  };

  const removeStudent = (index) => {
    setFormData(prev => ({
      ...prev,
      students: prev.students.filter((_, i) => i !== index)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-800 border-b pb-2">
          Basic Information
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User size={14} className="inline mr-1" />
              First Name *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.firstName ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="First Name"
            />
            {errors.firstName && (
              <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.lastName ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="Last Name"
            />
            {errors.lastName && (
              <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail size={14} className="inline mr-1" />
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="Email Address"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone size={14} className="inline mr-1" />
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="Phone Number"
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin size={14} className="inline mr-1" />
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Trophy size={14} className="inline mr-1" />
              Sport
            </label>
            <select
              value={formData.sport}
              onChange={(e) => handleInputChange('sport', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Sport</option>
              <option value="Soccer">Soccer</option>
              <option value="Basketball">Basketball</option>
              <option value="Baseball">Baseball</option>
              <option value="Flag Football">Flag Football</option>
              <option value="Tackle Football">Tackle Football</option>
              <option value="Track">Track</option>
              <option value="Golf">Golf</option>
              <option value="Cheer">Cheer</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Membership Type
            </label>
            <select
              value={formData.membershipType}
              onChange={(e) => handleInputChange('membershipType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Type</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="one-time">One-time</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <div className="flex items-center space-x-4 mt-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="isPaidMember"
                  checked={formData.isPaidMember === true}
                  onChange={() => handleInputChange('isPaidMember', true)}
                  className="mr-2"
                />
                Paid Member
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="isPaidMember"
                  checked={formData.isPaidMember === false}
                  onChange={() => handleInputChange('isPaidMember', false)}
                  className="mr-2"
                />
                Free Member
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Students Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-md font-semibold text-gray-800 border-b pb-2">
            <Users size={16} className="inline mr-1" />
            Students ({formData.students.length})
          </h4>
          <Button
            type="button"
            onClick={addStudent}
            variant="secondary"
            size="sm"
            className="flex items-center gap-1"
          >
            <Plus size={14} />
            Add Student
          </Button>
        </div>

        {formData.students.map((student, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-800">Student {index + 1}</span>
              <button
                type="button"
                onClick={() => removeStudent(index)}
                className="text-red-600 hover:text-red-800"
                title="Remove Student"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={student.firstName || ''}
                onChange={(e) => updateStudent(index, 'firstName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="First Name"
              />
              <input
                type="text"
                value={student.lastName || ''}
                onChange={(e) => updateStudent(index, 'lastName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Last Name"
              />
              <input
                type="date"
                value={student.dob || ''}
                onChange={(e) => updateStudent(index, 'dob', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={student.ageGroup || ''}
                onChange={(e) => updateStudent(index, 'ageGroup', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Age Group"
              />
            </div>
          </div>
        ))}

        {formData.students.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users size={32} className="mx-auto mb-2 text-gray-300" />
            <p>No students added yet</p>
            <p className="text-sm">Click "Add Student" to get started</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          onClick={onCancel}
          variant="secondary"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Save size={16} />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};

// Main Members Component
const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    membershipType: 'all',
    paymentStatus: 'all',
    sport: 'all',
    location: 'all',
    registrationSource: 'all'
  });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, member: null });

  const itemsPerPageOptions = [5, 10, 25, 50, 100];

  // Sport options with emojis
  const getSportIcon = (sport) => {
    const icons = {
      'soccer': '⚽',
      'basketball': '🏀',
      'baseball': '⚾',
      'track': '🏃‍♂️',
      'flag_football': '🏈',
      'tackle_football': '🏈',
      'kickball': '🥎',
      'golf': '🏌️',
      'cheer': '📣'
    };
    return icons[sport?.toLowerCase().replace(/\s+/g, '_')] || '🏆';
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

  // Format date as "August 1, 2025"
  const formatDate = (date) => {
    if (!date) return 'N/A';

    let dateObj;
    if (date.toDate) {
      dateObj = date.toDate();
    } else {
      dateObj = new Date(date);
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) return 'N/A';

    // Format as "Month Day, Year"
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return dateObj.toLocaleDateString('en-US', options);
  };

  // Get unique values for filters
  const getUniqueValues = (field) => {
    const values = members.map(member => member[field]).filter(Boolean);
    return [...new Set(values)].sort();
  };

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const membersData = await getMembers();
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading members:', error);
      alert('Error loading members: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced delete function
  const handleDeleteMember = async (member) => {
    setDeleteConfirmation({ isOpen: true, member });
  };

  const confirmDelete = async () => {
    const { member } = deleteConfirmation;

    try {
      setLoading(true);
      const result = await deleteMember(member.id);

      if (result.success) {
        alert(`✅ ${result.message}`);
        loadMembers(); // Refresh the list
      } else {
        alert('❌ Failed to delete member');
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('❌ Error deleting member: ' + error.message);
    } finally {
      setLoading(false);
      setDeleteConfirmation({ isOpen: false, member: null });
    }
  };

  // Batch delete function
  const handleBatchDelete = async () => {
    if (selectedMembers.length === 0) {
      alert('Please select members to delete');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedMembers.length} member(s)? This action cannot be undone and will remove them from all systems including Firebase Auth.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);
      const result = await batchDeleteMembers(selectedMembers);

      if (result.success) {
        alert(`✅ Successfully deleted ${result.summary.successful} member(s)`);
      } else {
        alert(`⚠️ Batch deletion completed with ${result.summary.failed} errors. Check console for details.`);
        console.log('Batch deletion results:', result.results);
      }

      setSelectedMembers([]);
      loadMembers();
    } catch (error) {
      console.error('Error in batch deletion:', error);
      alert('❌ Error during batch deletion: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit member function
  const handleEditMember = async (member) => {
    try {
      // Get fresh member data
      const memberData = await getMemberById(member.id);
      if (memberData) {
        setEditingMember(memberData);
        setIsEditModalOpen(true);
      }
    } catch (error) {
      console.error('Error loading member for edit:', error);
      alert('Error loading member data');
    }
  };

  const handleSaveEdit = async (updatedData) => {
    try {
      setLoading(true);
      await updateMember(editingMember.id, updatedData);
      alert('✅ Member updated successfully');
      setIsEditModalOpen(false);
      setEditingMember(null);
      loadMembers(); // Refresh the list
    } catch (error) {
      console.error('Error updating member:', error);
      alert('❌ Error updating member: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add new member with Firebase Auth creation
  const  handleAddNewMember = async (memberData) => {
    try {
      setLoading(true);

      // Add createdBy admin info and registration source
      const newMemberData = {
        ...memberData,
        registrationSource: 'admin',
        createdBy: 'admin',
        isPaidMember:false,
        createdAt: new Date().toISOString(),
        uid: null, // Will be set after Firebase Auth creation
      };

      // Call API to create member with Firebase Auth user
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.members.create), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMemberData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create member');
      }

      alert('✅ Member created successfully with login credentials');
      setIsAddMemberModalOpen(false);
      loadMembers(); // Refresh the list
    } catch (error) {
      console.error('Error creating member:', error);
      alert('❌ Error creating member: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddMember = () => {
    setIsAddMemberModalOpen(true);
  };

  const handleViewDetails = (member) => {
    console.log("Viewing_member", member);
    setSelectedMember(member);
    setIsViewModalOpen(true);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Location', 'Sport', 'Membership Type', 'Paid Member', 'Students Count', 'Registration Date'];
    const csvContent = [
      headers.join(','),
      ...filteredMembers.map(member => [
        `"${member.firstName} ${member.lastName}"`,
        member.email,
        member.phone || '',
        member.location || '',
        member.sport || '',
        member.membershipType || '',
        member.isPaidMember ? 'Yes' : 'No',
        member.students?.length || 0,
        formatDate(member.createdAt)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Filter members based on search term and filters
  const filteredMembers = members.filter(member => {
    const matchesSearch =
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.sport?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone?.includes(searchTerm) ||
       (Array.isArray(member.students) && member.students.some(student =>
        (`${student.firstName} ${student.lastName}`).toLowerCase().includes(searchTerm.toLowerCase())
      ));
    const matchesFilters =
      (filters.membershipType === 'all' || member.membershipType === filters.membershipType) &&
      (filters.paymentStatus === 'all' || member.paymentStatus === filters.paymentStatus) &&
      (filters.sport === 'all' || member.sport === filters.sport) &&
      (filters.location === 'all' || member.location === filters.location) &&
      (filters.registrationSource === 'all' || member.registrationSource === filters.registrationSource);

    return matchesSearch && matchesFilters;
  });

  // Pagination
  const totalItems = filteredMembers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredMembers.slice(startIndex, endIndex);

  console.log("currentItems", currentItems)

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

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

  if (loading && members.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Members Management"
        subtitle="View and manage all paid members"
      />

      <div className="glass rounded-2xl p-6">
        {/* Header with Search and Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Users className="text-blue-600" size={20} />
              All Members ({totalItems})
            </h3>
            {searchTerm && (
              <p className="text-sm text-gray-600 mt-1">
                Showing {currentItems.length} of {totalItems} filtered results
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
              />
            </div>

            <Button
              onClick={handleOpenAddMember}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Add New Member
            </Button>

            <Button
              onClick={exportToCSV}
              variant="secondary"
              className="flex items-center gap-2"
              disabled={filteredMembers.length === 0}
            >
              <Download size={16} />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Batch Operations Bar */}
        {selectedMembers.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-800">
                  {selectedMembers.length} member(s) selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleBatchDelete}
                  variant="danger"
                  size="sm"
                  className="flex items-center gap-1"
                  disabled={loading}
                >
                  <Trash2 size={14} />
                  Delete Selected
                </Button>
                <Button
                  onClick={() => setSelectedMembers([])}
                  variant="secondary"
                  size="sm"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={16} className="text-gray-600" />
            <span className="font-medium text-gray-700">Filters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Membership Type</label>
              <select
                value={filters.membershipType}
                onChange={(e) => setFilters({ ...filters, membershipType: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">All Types</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One-time</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Paid - Monthly">Paid - Monthly</option>
                <option value="Paid - Seasonal">Paid - Seasonal</option>
                <option value="Past Due">Past Due</option>
                <option value="Canceled">Canceled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sport</label>
              <select
                value={filters.sport}
                onChange={(e) => setFilters({ ...filters, sport: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">All Sports</option>
                {getUniqueValues('sport').map(sport => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <select
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">All Locations</option>
                {getUniqueValues('location').map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
              <select
                value={filters.registrationSource}
                onChange={(e) => setFilters({ ...filters, registrationSource: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">All Sources</option>
                <option value="web">Web</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters({
                membershipType: 'all',
                isPaidMember: 'all',
                sport: 'all',
                location: 'all',
                registrationSource: 'all'
              })}
              className="text-xs"
            >
              Clear All Filters
            </Button>
          </div>
        </div>

        {/* Items per page selector */}
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

        {/* Members Table */}
        <div className="overflow-x-auto">
          <Table headers={[
            <div key="select" className="flex items-center">
              <input
                type="checkbox"
                checked={selectedMembers.length === currentItems.length && currentItems.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedMembers(currentItems.map(m => m.id));
                  } else {
                    setSelectedMembers([]);
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>,

            'Actions',
            'Students',
            'Parent Name',
            'Contact Info',
            'Membership',
            'Sport',
            'Location',
            'Registered',
          ]}>
            {currentItems.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMembers([...selectedMembers, member.id]);
                      } else {
                        setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewDetails(member)}
                      className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                      title="View Details"
                      disabled={loading}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleEditMember(member)}
                      className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
                      title="Edit Member"
                      disabled={loading}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member)}
                      className="p-1 text-red-600 hover:text-red-800 transition-colors"
                      title="Delete Member"
                      disabled={loading}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {/* <div className="text-sm font-medium text-gray-900">
                      {member.students?.length || 0} student{member.students?.length !== 1 ? 's' : ''}
                    </div> */}
                    {member.students && member.students.length > 0 && (
                      <div className="text-xs text-gray-500 space-y-1">
                        {member.students.slice(0, 2).map((student, index) => (
                          <div key={index} className="flex items-center gap-1 text-sm font-medium text-gray-900">
                            <User size={10} />
                            <span>{student.firstName} {student.lastName} ({student.ageGroup})</span>
                          </div>
                        ))}
                        {member.students.length > 2 && (
                          <div className="text-xs text-gray-400">
                            +{member.students.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${member.isPaidMember ? 'bg-green-500' : 'bg-gray-400'
                      }`}>
                      {member.firstName?.charAt(0) || 'M'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {/* {member.isPaidMember ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <CheckCircle size={12} />
                            Paid Member
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                            <Clock size={12} />
                            Free Member
                          </span>
                        )} */}

                        {member.isPaidMember ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <CheckCircle size={12} />
                            Paid Member
                          </span>
                        ) : member?.paymentStatus === 'Active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <CheckCircle size={12} />
                            Active Member
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                            <Clock size={12} />
                            Free Member
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm">
                      <Mail size={12} className="text-gray-400" />
                      <span className="text-gray-900">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone size={12} className="text-gray-400" />
                        <span className="text-gray-600">{member.phone}</span>
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-900">
                      {member.membershipType || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {member.registrationSource === 'web' ? '🌐 Web' : '📱 Mobile'}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {member.sport && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      <span>{getSportIcon(member.sport)}</span>
                      {member.sport}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <MapPin size={12} className="text-gray-400" />
                    <span className="text-sm text-gray-900">{member.location || 'N/A'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar size={12} className="text-gray-400" />
                    <span className="text-gray-900">{formatDate(member.createdAt)}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </div>

        {/* Empty State */}
        {currentItems.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 mb-2">
              {searchTerm || Object.values(filters).some(f => f !== 'all')
                ? 'No members found matching your criteria.'
                : 'No members found.'}
            </p>
            {(searchTerm || Object.values(filters).some(f => f !== 'all')) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilters({
                    membershipType: 'all',
                    isPaidMember: 'all',
                    sport: 'all',
                    location: 'all',
                    registrationSource: 'all'
                  });
                }}
                className="text-primary-600 hover:text-primary-800 text-sm"
              >
                Clear all filters to see all members
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && members.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <span className="ml-2 text-gray-600">Processing...</span>
          </div>
        )}

        {/* Pagination */}
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
                    onClick={() => setCurrentPage(pageNum)}
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

      {/* View Details Modal */}
      {selectedMember && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedMember(null);
          }}
          title={`Member Details - ${selectedMember.firstName} ${selectedMember.lastName}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* Header with Member Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${selectedMember.isPaidMember ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                  {selectedMember.firstName?.charAt(0) || 'M'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedMember.firstName} {selectedMember.lastName}</h3>
                  <p className="text-sm text-gray-600">Member ID: {selectedMember.id}</p>
                </div>
              </div>
              <div className="text-right">


                {selectedMember.isPaidMember ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    <CheckCircle size={12} />
                    Paid Member
                  </span>
                ) : selectedMember.paymentStatus === 'Active' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    <CheckCircle size={12} />
                    Active Member
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                    <Clock size={12} />
                    Free Member
                  </span>
                )}


              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Contact Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm text-gray-700">{selectedMember.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-gray-400" />
                    <span className="text-sm font-medium">Phone:</span>
                    <span className="text-sm text-gray-700">{selectedMember.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gray-400" />
                    <span className="text-sm font-medium">Location:</span>
                    <span className="text-sm text-gray-700">{selectedMember.location || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Program Information */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Program Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-gray-400" />
                    <span className="text-sm font-medium">Sport:</span>
                    <span className="text-sm text-gray-700 flex items-center gap-1">
                      {getSportIcon(selectedMember.sport)} {selectedMember.sport || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Membership Type:</span>
                    <span className="text-sm text-gray-700">{selectedMember.membershipType || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Registration Source:</span>
                    <span className="text-sm text-gray-700">
                      {selectedMember.registrationSource === 'web' ? '🌐 Web Registration' : '📱 Mobile App'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Students Information */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800 border-b pb-2">
                Students ({selectedMember.students?.length || 0})
              </h4>
              {selectedMember.students && selectedMember.students.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedMember.students.map((student, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={16} className="text-blue-500" />
                        <span className="font-medium">{student.firstName} {student.lastName}</span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div><strong>Age Group:</strong> {student.ageGroup}</div>
                        <div><strong>DOB:</strong> {student.dob}</div>
                        <div><strong>Age:</strong> {calculateAge(student.dob)} years old</div>
                        {student.uniformTop && (
                          <div><strong>Uniform:</strong> Top: {student.uniformTop}, Bottom: {student.uniformBottom}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No students registered</p>
              )}
            </div>

            {/* Agreements and Consent */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Agreements & Consent</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-3 rounded-lg border ${selectedMember.agreeTerms ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                  <div className="flex items-center gap-2">
                    {selectedMember.agreeTerms ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <XCircle size={16} className="text-red-600" />
                    )}
                    <span className="text-sm font-medium">Terms & Conditions</span>
                  </div>
                </div>

                <div className={`p-3 rounded-lg border ${selectedMember.consentText ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                  <div className="flex items-center gap-2">
                    {selectedMember.consentText ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <XCircle size={16} className="text-red-600" />
                    )}
                    <span className="text-sm font-medium">SMS Consent</span>
                  </div>
                </div>

                <div className={`p-3 rounded-lg border ${selectedMember.waiverConsent ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                  <div className="flex items-center gap-2">
                    {selectedMember.waiverConsent ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <XCircle size={16} className="text-red-600" />
                    )}
                    <span className="text-sm font-medium">Waiver Consent</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Details */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Registration Details</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Registered:</span>
                    <span className="ml-2 text-gray-700">{formatDate(selectedMember.createdAt)}</span>
                  </div>
                  <div>
                    <span className="font-medium">UID:</span>
                    <span className="ml-2 text-gray-700 font-mono text-xs">{selectedMember.uid || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingMember(null);
          }}
          title={`Edit Member - ${editingMember.firstName} ${editingMember.lastName}`}
          size="xl"
        >
          <EditMemberForm
            member={editingMember}
            onSave={handleSaveEdit}
            onCancel={() => {
              setIsEditModalOpen(false);
              setEditingMember(null);
            }}
            loading={loading}
            isNewMember={false}
          />
        </Modal>
      )}

      {/* Add New Member Modal */}
      <Modal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        title="Add New Member"
        size="xl"
      >
        <AddMemberForm
          onSave={handleAddNewMember}
          onCancel={() => setIsAddMemberModalOpen(false)}
          setLoading={setLoading}
          loading={loading}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <Modal
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation({ isOpen: false, member: null })}
          title="Confirm Deletion"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-white" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-red-900">Delete Member</h4>
                <p className="text-sm text-red-700">This action cannot be undone</p>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h5 className="font-medium mb-2">Member to be deleted:</h5>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {deleteConfirmation.member?.firstName?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">
                    {deleteConfirmation.member?.firstName} {deleteConfirmation.member?.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{deleteConfirmation.member?.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h5 className="font-medium text-yellow-800 mb-2 flex items-center gap-1">
                <AlertTriangle size={16} />
                Warning
              </h5>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Member will be removed from the members database</li>
                <li>• Their Firebase Auth account will be deleted</li>
                <li>• Students will be removed from all team rosters</li>
                <li>• All related data (payments, notifications) will be deleted</li>
                <li>• This action is permanent and cannot be undone</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={() => setDeleteConfirmation({ isOpen: false, member: null })}
                variant="secondary"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                variant="danger"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Trash2 size={16} />
                {loading ? 'Deleting...' : 'Delete Member'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Members;