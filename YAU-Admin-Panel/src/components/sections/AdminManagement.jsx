// components/admin/AdminManagement.jsx - Updated for Sports Admin Panel
import React, { useState, useEffect } from 'react';
import Header from '../layout/Header';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Table, { TableRow, TableCell } from '../common/Table';
import TextField from '../common/TextField';
import { 
  createAdmin, 
  getAdmins, 
  updateAdmin, 
  deleteAdmin,
  deactivateAdmin,
  activateAdmin,
  updateAdminPassword,
  getAdminStats
} from '../../firebase/apis/api-admin';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Users, 
  UserX, 
  UserCheck, 
  Key,
  Shield,
  ShieldCheck,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Download,
  BarChart3,
  Trophy
} from 'lucide-react';

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedSportsArea, setSelectedSportsArea] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [stats, setStats] = useState(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [newAdmin, setNewAdmin] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
    sportsArea: '',
    permissions: ['read'],
    phone: '',
    address: '',
    notes: ''
  });

  const [passwordUpdate, setPasswordUpdate] = useState({
    adminId: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Sports Admin Role Options
  const roleOptions = [
    { value: 'super_admin', label: '🔥 Super Admin', color: 'text-red-600', description: 'Full system access' },
    { value: 'admin', label: '👑 System Admin', color: 'text-blue-600', description: 'General system management' },
    { value: 'sports_director', label: '🏆 Sports Director', color: 'text-purple-600', description: 'Oversee all sports programs' },
    { value: 'coach_coordinator', label: '🎯 Coach Coordinator', color: 'text-green-600', description: 'Manage coaches and assignments' },
    { value: 'registrar', label: '📋 Registrar', color: 'text-indigo-600', description: 'Handle registrations and enrollment' },
    { value: 'moderator', label: '🛡️ Community Moderator', color: 'text-orange-600', description: 'Monitor community content' },
    { value: 'editor', label: '✏️ Content Editor', color: 'text-yellow-600', description: 'Manage website content' },
    { value: 'viewer', label: '👁️ Reports Viewer', color: 'text-gray-600', description: 'View-only access to reports' }
  ];

  // Sports Areas/Specializations
  const sportsAreaOptions = [
    { value: 'all_sports', label: '🏆 All Sports', icon: '🏆' },
    { value: 'soccer', label: '⚽ Soccer', icon: '⚽' },
    { value: 'basketball', label: '🏀 Basketball', icon: '🏀' },
    { value: 'baseball', label: '⚾ Baseball', icon: '⚾' },
    { value: 'football', label: '🏈 Football', icon: '🏈' },
    { value: 'track_field', label: '🏃‍♂️ Track & Field', icon: '🏃‍♂️' },
    { value: 'golf', label: '🏌️ Golf', icon: '🏌️' },
    { value: 'cheer', label: '📣 Cheerleading', icon: '📣' },
    { value: 'kickball', label: '🥎 Kickball', icon: '🥎' },
    { value: 'community_programs', label: '👥 Community Programs', icon: '👥' },
    { value: 'events_tournaments', label: '🏅 Events & Tournaments', icon: '🏅' }
  ];

  // Enhanced Permission Options for Sports Admin
  const permissionOptions = [
    { value: 'read', label: '👀 Read', description: 'View data, reports, and user information' },
    { value: 'write', label: '✏️ Write', description: 'Create and edit content, manage registrations' },
    { value: 'delete', label: '🗑️ Delete', description: 'Remove data and content' },
    { value: 'manage_users', label: '👥 Manage Users', description: 'Add, edit, and manage parents/coaches' },
    { value: 'manage_rosters', label: '📋 Manage Rosters', description: 'Create and modify team rosters' },
    { value: 'manage_events', label: '📅 Manage Events', description: 'Create and manage sports events' },
    { value: 'financial_access', label: '💰 Financial Access', description: 'View payments and financial reports' },
    { value: 'admin', label: '⚙️ Full Admin', description: 'Complete system administration access' }
  ];

  const itemsPerPageOptions = [5, 10, 25, 50, 100];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRole, selectedSportsArea, selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [adminsData, statsData] = await Promise.all([
        getAdmins({
          page: 1,
          limit: 1000 // Get all for client-side filtering
        }),
        getAdminStats()
      ]);

      setAdmins(adminsData.admins || []);
      setStats(statsData);
      console.log('📊 Admin data loaded:', adminsData.admins?.length, 'admins');
    } catch (error) {
      console.error('❌ Error loading admin data:', error);
      alert(`Error loading admin data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const validateForm = (isEdit = false) => {
    const admin = isEdit ? editingAdmin : newAdmin;
    
    if (!admin.firstName?.trim()) return 'First name is required';
    if (!admin.lastName?.trim()) return 'Last name is required';
    if (!admin.email?.trim()) return 'Email is required';
    if (!validateEmail(admin.email)) return 'Valid email is required';
    
    if (!isEdit) {
      if (!admin.password) return 'Password is required';
      if (!validatePassword(admin.password)) return 'Password must be at least 6 characters';
      if (admin.password !== admin.confirmPassword) return 'Passwords do not match';
    }
    
    if (!admin.role) return 'Role is required';
    if (!admin.permissions?.length) return 'At least one permission is required';
    
    return null;
  };

  // CRUD Operations
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setLoading(true);
      
      const adminData = {
        firstName: newAdmin.firstName.trim(),
        lastName: newAdmin.lastName.trim(),
        email: newAdmin.email.toLowerCase().trim(),
        password: newAdmin.password,
        role: newAdmin.role,
        sportsArea: newAdmin.sportsArea.trim(),
        permissions: newAdmin.permissions,
        phone: newAdmin.phone.trim(),
        address: newAdmin.address.trim(),
        notes: newAdmin.notes.trim()
      };

      await createAdmin(adminData);

      // Reset form
      setNewAdmin({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'admin',
        sportsArea: '',
        permissions: ['read'],
        phone: '',
        address: '',
        notes: ''
      });

      setIsAddModalOpen(false);
      await loadData();
      
      alert('✅ Admin created successfully!');
    } catch (error) {
      console.error('❌ Error adding admin:', error);
      alert(`Error creating admin: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAdmin = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm(true);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setLoading(true);

      const updateData = {
        firstName: editingAdmin.firstName?.trim(),
        lastName: editingAdmin.lastName?.trim(),
        role: editingAdmin.role,
        sportsArea: editingAdmin.sportsArea?.trim() || '',
        permissions: editingAdmin.permissions,
        phone: editingAdmin.phone?.trim(),
        address: editingAdmin.address?.trim(),
        notes: editingAdmin.notes?.trim(),
        isActive: editingAdmin.isActive
      };

      await updateAdmin(editingAdmin.id, updateData);

      setEditingAdmin(null);
      await loadData();
      
      alert('✅ Admin updated successfully!');
    } catch (error) {
      console.error('❌ Error updating admin:', error);
      alert(`Error updating admin: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (admin) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${admin.firstName} ${admin.lastName}?\n\nThis action cannot be undone and will:\n- Remove the admin from the system\n- Delete their Firebase Auth account\n- Remove all associated data\n\nType 'DELETE' to confirm.`)) {
      return;
    }

    const confirmation = window.prompt('Type "DELETE" to confirm permanent deletion:');
    if (confirmation !== 'DELETE') {
      alert('Deletion cancelled - confirmation text did not match');
      return;
    }

    try {
      setLoading(true);
      await deleteAdmin(admin.id);
      await loadData();
      alert('✅ Admin deleted permanently');
    } catch (error) {
      console.error('❌ Error deleting admin:', error);
      alert(`Error deleting admin: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (admin) => {
    const action = admin.isActive ? 'deactivate' : 'activate';
    const actionText = admin.isActive ? 'deactivated' : 'activated';
    
    if (!window.confirm(`Are you sure you want to ${action} ${admin.firstName} ${admin.lastName}?`)) {
      return;
    }

    try {
      setLoading(true);
      
      if (admin.isActive) {
        await deactivateAdmin(admin.id);
      } else {
        await activateAdmin(admin.id);
      }
      
      await loadData();
      alert(`✅ Admin ${actionText} successfully`);
    } catch (error) {
      console.error(`❌ Error ${action}ing admin:`, error);
      alert(`Error ${action}ing admin: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (!passwordUpdate.newPassword) {
      alert('New password is required');
      return;
    }

    if (!validatePassword(passwordUpdate.newPassword)) {
      alert('Password must be at least 6 characters');
      return;
    }

    if (passwordUpdate.newPassword !== passwordUpdate.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await updateAdminPassword(passwordUpdate.adminId, passwordUpdate.newPassword);
      
      setPasswordUpdate({
        adminId: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsPasswordModalOpen(false);
      
      alert('✅ Password updated successfully!');
    } catch (error) {
      console.error('❌ Error updating password:', error);
      alert(`Error updating password: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openPasswordModal = (admin) => {
    setPasswordUpdate({
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`,
      newPassword: '',
      confirmPassword: ''
    });
    setIsPasswordModalOpen(true);
  };

  // Filtering and pagination
  const getFilteredAdmins = () => {
    return admins.filter(admin => {
      const matchesSearch = searchTerm === '' || 
        `${admin.firstName} ${admin.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.sportsArea?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = selectedRole === '' || admin.role === selectedRole;
      const matchesSportsArea = selectedSportsArea === '' || admin.sportsArea === selectedSportsArea;
      const matchesStatus = selectedStatus === '' || 
        (selectedStatus === 'active' && admin.isActive) ||
        (selectedStatus === 'inactive' && !admin.isActive);

      return matchesSearch && matchesRole && matchesSportsArea && matchesStatus;
    });
  };

  const filteredAdmins = getFilteredAdmins();
  const totalItems = filteredAdmins.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredAdmins.slice(startIndex, endIndex);

  // Pagination functions
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

  // Utility functions
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getRoleInfo = (role) => {
    return roleOptions.find(r => r.value === role) || { label: role, color: 'text-gray-600' };
  };

  const getSportsAreaInfo = (sportsArea) => {
    return sportsAreaOptions.find(s => s.value === sportsArea) || { label: sportsArea || 'Unassigned', icon: '🏆' };
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRole('');
    setSelectedSportsArea('');
    setSelectedStatus('');
  };

  if (loading && admins.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-lg">Loading admin data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        title="Sports Admin Management"
        subtitle="Manage administrators for Youth Athlete University sports programs"
      />

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Admins</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAdmins}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Admins</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeAdmins}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive Admins</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactiveAdmins}</p>
              </div>
              <UserX className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sports Areas</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Object.keys(stats.departmentBreakdown || {}).length || sportsAreaOptions.length}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-6">
        {/* Header with Search and Add Button */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Sports Administrators ({totalItems})
            </h3>
            {(searchTerm || selectedRole || selectedSportsArea || selectedStatus) && (
              <p className="text-sm text-gray-600 mt-1">
                Showing {currentItems.length} of {totalItems} filtered results
                <button 
                  onClick={clearFilters}
                  className="ml-2 text-primary-600 hover:text-primary-800 underline"
                >
                  Clear filters
                </button>
              </p>
            )}
          </div>

          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus size={20} className="mr-2" />
            Add Sports Admin
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search admins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Roles</option>
            {roleOptions.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>

          <select
            value={selectedSportsArea}
            onChange={(e) => setSelectedSportsArea(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Sports Areas</option>
            {sportsAreaOptions.map(area => (
              <option key={area.value} value={area.value}>{area.label}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Show:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {itemsPerPageOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Admin Table */}
        <div className="overflow-x-auto">
          <Table headers={['Actions','Admin', 'Role', 'Sports Area', 'Permissions', 'Contact', 'Status', 'Joined']}>
            {currentItems.map((admin) => (
              <TableRow key={admin.id}>
                 <TableCell>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingAdmin(admin)}
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                      title="Edit Admin"
                    >
                      <Edit size={16} />
                    </button>
                    
                    <button
                      onClick={() => openPasswordModal(admin)}
                      className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                      title="Change Password"
                    >
                      <Key size={16} />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(admin)}
                      className={`p-1 rounded ${
                        admin.isActive 
                          ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-50' 
                          : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                      }`}
                      title={admin.isActive ? 'Deactivate Admin' : 'Activate Admin'}
                    >
                      {admin.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>

                    <button
                      onClick={() => handleDeleteAdmin(admin)}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      title="Delete Admin Permanently"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                        {admin.firstName?.[0]}{admin.lastName?.[0]}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {admin.firstName} {admin.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{admin.email}</div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleInfo(admin.role).color} bg-gray-100`}>
                    {getRoleInfo(admin.role).label}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="inline-flex items-center text-sm text-gray-900">
                    <span className="mr-1">{getSportsAreaInfo(admin.sportsArea || admin.department).icon}</span>
                    {getSportsAreaInfo(admin.sportsArea || admin.department).label}
                  </span>
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {admin.permissions?.slice(0, 2).map(permission => (
                      <span 
                        key={permission}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {permissionOptions.find(p => p.value === permission)?.label || permission}
                      </span>
                    ))}
                    {admin.permissions?.length > 2 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                        +{admin.permissions.length - 2}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-sm text-gray-900">
                    {admin.phone && (
                      <div className="flex items-center">
                        <Phone size={12} className="mr-1 text-gray-400" />
                        {admin.phone}
                      </div>
                    )}
                    {admin.address && (
                      <div className="flex items-center mt-1">
                        <MapPin size={12} className="mr-1 text-gray-400" />
                        <span className="truncate max-w-24" title={admin.address}>
                          {admin.address}
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(admin.isActive)}`}>
                    {admin.isActive ? (
                      <>
                        <UserCheck size={12} className="mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <UserX size={12} className="mr-1" />
                        Inactive
                      </>
                    )}
                  </span>
                </TableCell>

                <TableCell>
                  <div className="text-sm text-gray-900">
                    {formatDate(admin.createdAt)}
                  </div>
                  {admin.lastLogin && (
                    <div className="text-xs text-gray-500">
                      Last login: {formatDate(admin.lastLogin)}
                    </div>
                  )}
                </TableCell>

               
              </TableRow>
            ))}
          </Table>
        </div>

        {/* Empty State */}
        {currentItems.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 mb-2">
              {filteredAdmins.length === 0 && admins.length > 0 
                ? 'No sports administrators found matching your filters.' 
                : 'No sports administrators found. Add your first admin!'}
            </p>
            {filteredAdmins.length === 0 && admins.length > 0 && (
              <button
                onClick={clearFilters}
                className="text-primary-600 hover:text-primary-800 text-sm"
              >
                Clear filters to see all admins
              </button>
            )}
          </div>
        )}

        {/* Pagination - Same as before */}
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
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pageNum === currentPage
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

      {/* Add Admin Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setNewAdmin({
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: '',
            role: 'admin',
            sportsArea: '',
            permissions: ['read'],
            phone: '',
            address: '',
            notes: ''
          });
        }}
        title="Add New Sports Administrator"
        size="lg"
      >
        <form onSubmit={handleAddAdmin} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="First Name"
              type="text"
              value={newAdmin.firstName}
              onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
              placeholder="Enter first name"
              required
            />
            
            <TextField
              label="Last Name"
              type="text"
              value={newAdmin.lastName}
              onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
              placeholder="Enter last name"
              required
            />
          </div>

          <TextField
            label="Email Address"
            type="email"
            value={newAdmin.email}
            onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
            placeholder="Enter email address"
            required
          />

          {/* Password Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none pr-10"
                  placeholder="Enter password"
                  required
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={newAdmin.confirmPassword}
                  onChange={(e) => setNewAdmin({ ...newAdmin, confirmPassword: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none pr-10"
                  placeholder="Confirm password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {/* Role and Sports Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Administrative Role <span className="text-red-500">*</span>
              </label>
              <select
                value={newAdmin.role}
                onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                required
              >
                {roleOptions.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {roleOptions.find(r => r.value === newAdmin.role)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sports Area/Specialization</label>
              <select
                value={newAdmin.sportsArea}
                onChange={(e) => setNewAdmin({ ...newAdmin, sportsArea: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              >
                <option value="">Select Sports Area</option>
                {sportsAreaOptions.map(area => (
                  <option key={area.value} value={area.value}>{area.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              System Permissions <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {permissionOptions.map(permission => (
                <label key={permission.value} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={newAdmin.permissions.includes(permission.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewAdmin({
                          ...newAdmin,
                          permissions: [...newAdmin.permissions, permission.value]
                        });
                      } else {
                        setNewAdmin({
                          ...newAdmin,
                          permissions: newAdmin.permissions.filter(p => p !== permission.value)
                        });
                      }
                    }}
                    className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {permission.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {permission.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Phone Number"
              type="tel"
              value={newAdmin.phone}
              onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
              placeholder="Enter phone number"
            />

            <TextField
              label="Address"
              type="text"
              value={newAdmin.address}
              onChange={(e) => setNewAdmin({ ...newAdmin, address: e.target.value })}
              placeholder="Enter address"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Administrative Notes</label>
            <textarea
              value={newAdmin.notes}
              onChange={(e) => setNewAdmin({ ...newAdmin, notes: e.target.value })}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none resize-none"
              rows="3"
              placeholder="Additional notes about this administrator's role and responsibilities..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Sports Admin'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Admin Modal */}
      {editingAdmin && (
        <Modal
          isOpen={!!editingAdmin}
          onClose={() => setEditingAdmin(null)}
          title={`Edit ${editingAdmin.firstName} ${editingAdmin.lastName}`}
          size="lg"
        >
          <form onSubmit={handleEditAdmin} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="First Name"
                type="text"
                value={editingAdmin.firstName}
                onChange={(e) => setEditingAdmin({ ...editingAdmin, firstName: e.target.value })}
                placeholder="Enter first name"
                required
              />
              
              <TextField
                label="Last Name"
                type="text"
                value={editingAdmin.lastName}
                onChange={(e) => setEditingAdmin({ ...editingAdmin, lastName: e.target.value })}
                placeholder="Enter last name"
                required
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={editingAdmin.email}
                className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 cursor-not-allowed"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed. Use the password reset option if needed.
              </p>
            </div>

            {/* Role and Sports Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Administrative Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingAdmin.role}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, role: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  required
                >
                  {roleOptions.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sports Area/Specialization</label>
                <select
                  value={editingAdmin.sportsArea || editingAdmin.department || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, sportsArea: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                >
                  <option value="">Select Sports Area</option>
                  {sportsAreaOptions.map(area => (
                    <option key={area.value} value={area.value}>{area.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                System Permissions <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {permissionOptions.map(permission => (
                  <label key={permission.value} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={editingAdmin.permissions.includes(permission.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingAdmin({
                            ...editingAdmin,
                            permissions: [...editingAdmin.permissions, permission.value]
                          });
                        } else {
                          setEditingAdmin({
                            ...editingAdmin,
                            permissions: editingAdmin.permissions.filter(p => p !== permission.value)
                          });
                        }
                      }}
                      className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {permission.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {permission.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Phone Number"
                type="tel"
                value={editingAdmin.phone || ''}
                onChange={(e) => setEditingAdmin({ ...editingAdmin, phone: e.target.value })}
                placeholder="Enter phone number"
              />

              <TextField
                label="Address"
                type="text"
                value={editingAdmin.address || ''}
                onChange={(e) => setEditingAdmin({ ...editingAdmin, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Administrative Notes</label>
              <textarea
                value={editingAdmin.notes || ''}
                onChange={(e) => setEditingAdmin({ ...editingAdmin, notes: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none resize-none"
                rows="3"
                placeholder="Additional notes about this administrator's role and responsibilities..."
              />
            </div>

            {/* Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="editAdminStatus"
                checked={editingAdmin.isActive}
                onChange={(e) => setEditingAdmin({ ...editingAdmin, isActive: e.target.checked })}
                className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="editAdminStatus" className="ml-2 text-sm text-gray-700">
                Administrator is active
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingAdmin(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Admin'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Password Update Modal - Same as before */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPasswordUpdate({
            adminId: '',
            newPassword: '',
            confirmPassword: ''
          });
        }}
        title={`Update Password for ${passwordUpdate.adminName}`}
        size="md"
      >
        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Password Update</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  This will update the administrator's Firebase Authentication password. They will need to use the new password to log in.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordUpdate.newPassword}
                onChange={(e) => setPasswordUpdate({ ...passwordUpdate, newPassword: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none pr-10"
                placeholder="Enter new password"
                required
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordUpdate.confirmPassword}
                onChange={(e) => setPasswordUpdate({ ...passwordUpdate, confirmPassword: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none pr-10"
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {passwordUpdate.newPassword && passwordUpdate.confirmPassword && passwordUpdate.newPassword !== passwordUpdate.confirmPassword && (
            <div className="text-red-600 text-sm">
              Passwords do not match
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPasswordModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || passwordUpdate.newPassword !== passwordUpdate.confirmPassword}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminManagement;