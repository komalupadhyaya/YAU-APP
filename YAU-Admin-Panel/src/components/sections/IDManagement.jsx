import React, { useState, useEffect } from 'react';
import {
  Search,
  Users,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  FileText,
  Image,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Trophy,
  Save,
  X,
  AlertTriangle,
  ExternalLink,
  Trash2,
  CreditCard
} from 'lucide-react';
import { getMembers, bulkDeleteIDRecords } from '../../firebase/apis/api-parents.js';
import { updateDoc, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/config.js";
import Header from '../layout/Header.jsx';
import Button from '../common/Button.jsx';
import Modal from '../common/Modal.jsx';
import Table, { TableRow, TableCell } from '../common/Table.jsx';
import { generateAndSaveIDCard, downloadGeneratedID } from '../../utils/IdGenerator.js';

const IDManagement = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedChild, setSelectedChild] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [filters, setFilters] = useState({
    idStatus: 'all',
    idType: 'all',
    sport: 'all',
    location: 'all',
    createdAt: 'all'
  });
  const [selectedChildren, setSelectedChildren] = useState(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const itemsPerPageOptions = [5, 10, 25, 50];

  const statusConfig = {
    submitted: { color: 'yellow', icon: Clock, label: 'Submitted' },
    paid: { color: 'blue', icon: CreditCard, label: 'Paid' },
    approved: { color: 'green', icon: CheckCircle, label: 'Approved' },
    rejected: { color: 'red', icon: XCircle, label: 'Rejected' },
    needsChanges: { color: 'orange', icon: AlertTriangle, label: 'Needs Changes' },
    unverified: { color: 'gray', icon: AlertCircle, label: 'Unverified' }
  };

  const paymentConfig = {
    paid: { color: 'green', icon: CheckCircle, label: 'Paid' },
    unpaid: { color: 'red', icon: XCircle, label: 'Unpaid' },
    refunded: { color: 'gray', icon: AlertCircle, label: 'Refunded' }
  };

  const idTypeConfig = {
    government: { label: 'Government ID', icon: FileText },
    league: { label: 'League ID', icon: Trophy }
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
      console.log('Members data:', membersData);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading members:', error);
      alert('Error loading members: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getAllChildren = () => {
    const children = [];
    members.forEach(member => {
      if (Array.isArray(member.students) && member.students.length > 0) {
        member.students.forEach(student => {
          if (student.uid) {
            children.push({
              ...student,
              parent: {
                id: member.id,
                firstName: member.firstName,
                lastName: member.lastName,
                email: member.email,
                phone: member.phone,
                location: member.location,
                createdAt: member.createdAt
              },
              idType: student.governmentIdUrl ? 'government' :
                student.leagueIdPurchased ? 'league' : 'none'
            });
          }
        });
      }
    });
    return children;
  };

  const updateChildStatusWithExpiry = async (childId, status, reason = '') => {
    try {
      const parent = members.find(m =>
        m.students && Array.isArray(m.students) && m.students.some(s => s.uid === childId)
      );

      if (!parent) {
        throw new Error('Parent not found for this child');
      }

      const parentRef = doc(db, "members", parent.id);
      const parentSnap = await getDoc(parentRef);

      if (!parentSnap.exists()) {
        throw new Error("Parent document not found");
      }

      const parentData = parentSnap.data();
      const updatedStudents = parentData.students.map(student =>
        student.uid === childId
          ? {
            ...student,
            idStatus: status,
            idRejectionReason: reason || '',
            idReviewedAt: Timestamp.now(),
            idReviewedBy: 'admin',
            expirationDate: status === 'active' ? calculateExpirationDate() : student.expirationDate
          }
          : student
      );

      await updateDoc(parentRef, { students: updatedStudents });
      return true;
    } catch (error) {
      console.error('Error updating child status:', error);
      throw error;
    }
  };

  const calculateExpirationDate = () => {
    const now = new Date();
    const nextYear = new Date(now);
    nextYear.setFullYear(now.getFullYear() + 1);
    return nextYear.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  };

  const handleApprove = async (childId) => {
    try {
      const childData = {
        id: selectedChild.uid,
        name: `${selectedChild.firstName} ${selectedChild.lastName}`,
        dob: selectedChild.dob,
        location: selectedChild.parent.location,
        headshotUrl: selectedChild.headshotUrl,
        expirationDate: calculateExpirationDate(),
        logoUrl: '/assets/YAU_Logo.png'
      };

      const parentMember = members.find(m => {
        return Array.isArray(m.students) && m.students.some(s => s.uid === childId);
      });

      if (!parentMember) {
        console.warn('Parent member not found for child:', childId);
        const success = await updateChildStatusWithExpiry(childId, 'active');
        if (success) {
          alert('✅ ID approved successfully! (Parent not found for ID generation)');
          setIsReviewModalOpen(false);
          setSelectedChild(null);
          setTimeout(() => loadMembers(), 500);
        }
        return;
      }

      const generatedFiles = await generateAndSaveIDCard(childData, parentMember.id, 'both');
      const success = await updateChildStatusWithExpiry(childId, 'active');

      if (success) {
        alert(`✅ ID approved successfully!
Generated ID card files:
- PNG: ${generatedFiles.png ? 'Created ✓' : 'Failed ✗'}
- PDF: ${generatedFiles.pdf ? 'Created ✓' : 'Failed ✗'}

The parent can now download their child's ID card.`);
      }

      setIsReviewModalOpen(false);
      setSelectedChild(null);
      setTimeout(() => loadMembers(), 500);
    } catch (error) {
      console.error('Error in approval process:', error);
      alert('❌ Error approving ID: ' + error.message);
      loadMembers();
    }
  };

  const regenerateIDCard = async (child) => {
    try {
      const childData = {
        id: child.uid,
        name: `${child.firstName} ${child.lastName}`,
        dob: child.dob,
        location: child.parent.location,
        headshotUrl: child.headshotUrl,
        expirationDate: child.expirationDate || calculateExpirationDate(),
        logoUrl: '/assets/YAU_Logo.png'
      };

      const parentMember = members.find(m => {
        return Array.isArray(m.students) && m.students.some(s => s.uid === child.uid);
      });

      if (!parentMember) {
        console.warn('Parent member not found for child:', child.uid);
        alert('❌ Error: Parent not found for regenerating ID.');
        return;
      }

      console.log('🔄 Regenerating ID card files...');
      await generateAndSaveIDCard(childData, parentMember.id, 'both');
      alert('✅ ID card files regenerated successfully!');
      loadMembers();
    } catch (error) {
      console.error('Regeneration error:', error);
      alert('❌ Error regenerating ID: ' + error.message);
    }
  };

  const handleReject = async (childId) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      const success = await updateChildStatusWithExpiry(childId, 'rejected', rejectionReason.trim());
      if (success) {
        alert('✅ ID rejected successfully');
        setIsReviewModalOpen(false);
        setSelectedChild(null);
        setRejectionReason('');
        setTimeout(() => loadMembers(), 500);
      }
    } catch (error) {
      alert('❌ Error rejecting ID: ' + error.message);
      loadMembers();
    }
  };

  // Bulk delete handlers
  const handleSelectChild = (childId) => {
    const newSelected = new Set(selectedChildren);
    if (newSelected.has(childId)) {
      newSelected.delete(childId);
    } else {
      newSelected.add(childId);
    }
    setSelectedChildren(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedChildren.size === filteredChildren.length) {
      setSelectedChildren(new Set());
    } else {
      setSelectedChildren(new Set(filteredChildren.map(child => child.uid)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsBulkDeleting(true);
      const childIds = Array.from(selectedChildren);
      const result = await bulkDeleteIDRecords(childIds);
      
      if (result.success) {
        alert(`✅ Successfully deleted ${result.deletedCount} ID records from ${result.updatedParents} parent(s)`);
        setSelectedChildren(new Set());
        setIsBulkDeleteModalOpen(false);
        loadMembers();
      }
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert('❌ Error deleting ID records: ' + error.message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleReview = (child) => {
    setSelectedChild(child);
    setRejectionReason(child.idRejectionReason || '');
    setIsReviewModalOpen(true);
  };

  const handlePreview = (url, title) => {
    setPreviewUrl(url);
    setPreviewTitle(title);
    setIsPreviewModalOpen(true);
  };

  const closePreview = () => {
    setIsPreviewModalOpen(false);
    setPreviewUrl('');
    setPreviewTitle('');
  };

  const allChildren = getAllChildren();
  const filteredChildren = allChildren.filter(child => {
    const matchesSearch =
      `${child.firstName} ${child.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${child.parent.firstName} ${child.parent.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      child.parent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      child.parent.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilters =
      (filters.idStatus === 'all' || child.idStatus === filters.idStatus) &&
      (filters.idType === 'all' || child.idType === filters.idType) &&
      (filters.sport === 'all' || child.sport === filters.sport) &&
      (filters.location === 'all' || child.parent.location === filters.location) &&
      (filters.createdAt === 'all' || true);

    return matchesSearch && matchesFilters;
  });

  const getUniqueValues = (field) => {
    const values = allChildren.map(child =>
      field === 'location' ? child.parent[field] : child[field]
    ).filter(Boolean);
    return [...new Set(values)].sort();
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      if (date && typeof date === 'object' && date.toDate) {
        return date.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      if (date && typeof date === 'object' && date.seconds) {
        const timestamp = new Timestamp(date.seconds, date.nanoseconds || 0);
        return timestamp.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      return 'Invalid Date';
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid Date';
    }
  };

  const totalItems = filteredChildren.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredChildren.slice(startIndex, endIndex);

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

  const exportToCSV = () => {
    const headers = ['Child Name', 'Parent Name', 'Email', 'Phone', 'Location', 'Sport', 'ID Type', 'Status', 'Submitted Date', 'Reviewed Date'];
    const csvContent = [
      headers.join(','),
      ...filteredChildren.map(child => [
        `"${child.firstName} ${child.lastName}"`,
        `"${child.parent.firstName} ${child.parent.lastName}"`,
        child.parent.email,
        child.parent.phone || '',
        child.parent.location || '',
        child.sport || '',
        child.idType === 'government' ? 'Government ID' : 'League ID',
        child.idStatus || 'unverified',
        child.updatedAt ? formatDate(child.updatedAt) : '',
        child.idReviewedAt ? formatDate(child.idReviewedAt) : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `id_verification_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
        title="ID Verification Management"
        subtitle="Review and manage children's ID verification status"
      />

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Users className="text-blue-600" size={20} />
              ID Verification Queue ({totalItems})
            </h3>
            {searchTerm && (
              <p className="text-sm text-gray-600 mt-1">
                Showing {currentItems.length} of {totalItems} filtered results
              </p>
            )}
            {selectedChildren.size > 0 && (
              <p className="text-sm text-red-600 mt-1 font-medium">
                {selectedChildren.size} item(s) selected for deletion
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search children..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
              />
            </div>

            <Button
              onClick={exportToCSV}
              variant="secondary"
              className="flex items-center gap-2"
              disabled={filteredChildren.length === 0}
            >
              <Download size={16} />
              Export CSV
            </Button>

            {selectedChildren.size > 0 && (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                <Trash2 size={16} />
                Delete Selected ({selectedChildren.size})
              </button>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={16} className="text-gray-600" />
            <span className="font-medium text-gray-700">Filters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Verification Status</label>
              <select
                value={filters.idStatus}
                onChange={(e) => setFilters({ ...filters, idStatus: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="active">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ID Type</label>
              <select
                value={filters.idType}
                onChange={(e) => setFilters({ ...filters, idType: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">All ID Types</option>
                <option value="government">Government ID</option>
                <option value="league">League ID</option>
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
          </div>

          <div className="mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters({
                idStatus: 'all',
                idType: 'all',
                sport: 'all',
                location: 'all',
                createdAt: 'all'
              })}
              className="text-xs"
            >
              Clear All Filters
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
          <Table headers={[
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedChildren.size === filteredChildren.length && filteredChildren.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
              />
            </div>,
            'Actions',
            'Status',
            'Child',
            'Parent',
            'Contact',
            'Location',
            'ID Type',
          ]}>
            {currentItems.map((child) => {
              const StatusIcon = statusConfig[child.idStatus || 'unverified']?.icon || AlertCircle;
              const statusColor = statusConfig[child.idStatus || 'unverified']?.color || 'gray';
              const IDTypeIcon = idTypeConfig[child.idType]?.icon || FileText;
              const idTypeLabel = idTypeConfig[child.idType]?.label || 'No ID';

              return (
                <TableRow key={`${child.parent.id}-${child.uid}`}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedChildren.has(child.uid)}
                      onChange={() => handleSelectChild(child.uid)}
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReview(child)}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        title="Review ID"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedChildren(new Set([child.uid]));
                          setIsBulkDeleteModalOpen(true);
                        }}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        title="Delete ID"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                      ${statusColor === 'green' ? 'bg-green-100 text-green-800' : ''}
                      ${statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${statusColor === 'red' ? 'bg-red-100 text-red-800' : ''}
                      ${statusColor === 'gray' ? 'bg-gray-100 text-gray-800' : ''}
                    `}>
                      {statusConfig[child.idStatus || 'unverified']?.label}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {child.firstName} {child.lastName}
                        </div>
                        <div className="text-xs text-gray-500">
                          DOB: {child.dob || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">
                        {child.parent.firstName} {child.parent.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        Member ID: {child.parent.id.slice(-8)}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail size={12} className="text-gray-400" />
                        <span className="text-gray-900">{child.parent.email}</span>
                      </div>
                      {child.parent.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone size={12} className="text-gray-400" />
                          <span className="text-gray-600">{child.parent.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="text-gray-400" />
                      <span className="text-sm text-gray-900">{child.parent.location || 'N/A'}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <IDTypeIcon size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-900">{idTypeLabel}</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        </div>

        {currentItems.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 mb-2">
              {searchTerm || Object.values(filters).some(f => f !== 'all')
                ? 'No children found matching your criteria.'
                : 'No children require ID verification.'}
            </p>
            {(searchTerm || Object.values(filters).some(f => f !== 'all')) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilters({
                    idStatus: 'all',
                    idType: 'all',
                    sport: 'all',
                    location: 'all',
                    createdAt: 'all'
                  });
                }}
                className="text-primary-600 hover:text-primary-800 text-sm"
              >
                Clear all filters to see all children
              </button>
            )}
          </div>
        )}

        {loading && members.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
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

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-60"
            onClick={() => !isBulkDeleting && setIsBulkDeleteModalOpen(false)}
          ></div>
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="text-red-600" size={20} />
                Confirm Bulk Delete
              </h3>
              <button
                onClick={() => !isBulkDeleting && setIsBulkDeleteModalOpen(false)}
                disabled={isBulkDeleting}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete the following <strong className="text-gray-900">{selectedChildren.size}</strong> ID record(s)?
              </p>
              <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-auto mb-4">
                <ul className="text-sm text-gray-600 space-y-1">
                  {filteredChildren
                    .filter(child => selectedChildren.has(child.uid))
                    .slice(0, 10)
                    .map(child => (
                      <li key={child.uid} className="flex items-center gap-2">
                        <User size={14} className="text-blue-500" />
                        {child.firstName} {child.lastName}
                        <span className="text-gray-400">({child.parent.firstName} {child.parent.lastName})</span>
                      </li>
                    ))}
                  {selectedChildren.size > 10 && (
                    <li className="text-gray-500 italic">
                      ...and {selectedChildren.size - 10} more
                    </li>
                  )}
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700">
                  <strong>Warning:</strong> This action cannot be undone. All selected ID records will be permanently removed.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  variant="secondary"
                  className="flex-1"
                  disabled={isBulkDeleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkDelete}
                  variant="danger"
                  className="flex-1 flex items-center justify-center gap-2"
                  disabled={isBulkDeleting}
                >
                  {isBulkDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete {selectedChildren.size} Record(s)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal - Higher z-index */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-60"
            onClick={closePreview}
          ></div>
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {previewTitle || 'Document Preview'}
              </h3>
              <button
                onClick={closePreview}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              <div className="text-center">
                <img
                  src={previewUrl}
                  alt={previewTitle}
                  className="max-w-full max-h-[60vh] mx-auto rounded-lg border border-gray-200 shadow-sm"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div style={{display: 'none'}} className="p-8 text-gray-500">
                  <FileText size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>Unable to preview this document</p>
                </div>
              </div>
              
              <div className="flex justify-center gap-3 mt-6">
                <Button
                  onClick={() => window.open(previewUrl, '_blank')}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <ExternalLink size={16} />
                  Open in New Tab
                </Button>
                <Button
                  onClick={closePreview}
                  variant="secondary"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedChild && (
        <Modal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedChild(null);
            setRejectionReason('');
          }}
          title={`Review ID - ${selectedChild.firstName} ${selectedChild.lastName}`}
          size="xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Child Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <span className="text-sm font-medium">Name:</span>
                    <span className="text-sm text-gray-700">{selectedChild.firstName} {selectedChild.lastName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-sm font-medium">DOB:</span>
                    <span className="text-sm text-gray-700">{selectedChild.dob || 'N/A'}</span>
                  </div>
                  {selectedChild.sport && (
                    <div className="flex items-center gap-2">
                      <Trophy size={16} className="text-gray-400" />
                      <span className="text-sm font-medium">Sport:</span>
                      <span className="text-sm text-gray-700">{selectedChild.sport}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Parent Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <span className="text-sm font-medium">Name:</span>
                    <span className="text-sm text-gray-700">{selectedChild.parent.firstName} {selectedChild.parent.lastName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm text-gray-700">{selectedChild.parent.email}</span>
                  </div>
                  {selectedChild.parent.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-sm font-medium">Phone:</span>
                      <span className="text-sm text-gray-700">{selectedChild.parent.phone}</span>
                    </div>
                  )}
                  {selectedChild.parent.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="text-sm font-medium">Location:</span>
                      <span className="text-sm text-gray-700">{selectedChild.parent.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Uploaded Documents</h4>

              {selectedChild.idType === 'government' && selectedChild.governmentIdUrl && (
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-700">Government ID</h5>
                  <div className="border border-gray-200 rounded-lg p-4">
                    {selectedChild.governmentIdUrl_filetype === 'pdf' ? (
                      <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
                        <FileText size={24} className="text-red-500" />
                        <span className="text-gray-700">PDF Document</span>
                        <button
                          onClick={() => window.open(selectedChild.governmentIdUrl, '_blank')}
                          className="ml-auto text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                        >
                          <ExternalLink size={16} />
                          View Document
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <img
                          src={selectedChild.governmentIdUrl}
                          alt="Government ID"
                          className="max-h-64 max-w-full mx-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => handlePreview(selectedChild.governmentIdUrl, 'Government ID')}
                        />
                        <button
                          onClick={() => handlePreview(selectedChild.governmentIdUrl, 'Government ID')}
                          className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm mx-auto"
                        >
                          <Eye size={16} />
                          Preview
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedChild.idType === 'league' && (
                <div className="space-y-4">
                  {selectedChild.birthCertificateUrl && (
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-700">Birth Certificate</h5>
                      <div className="border border-gray-200 rounded-lg p-4">
                        {selectedChild.birthCertificateUrl_filetype === 'pdf' ? (
                          <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
                            <FileText size={24} className="text-red-500" />
                            <span className="text-gray-700">PDF Document</span>
                            <button
                              onClick={() => window.open(selectedChild.birthCertificateUrl, '_blank')}
                              className="ml-auto text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                            >
                              <ExternalLink size={16} />
                              View Document
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <img
                              src={selectedChild.birthCertificateUrl}
                              alt="Birth Certificate"
                              className="max-h-64 max-w-full mx-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => handlePreview(selectedChild.birthCertificateUrl, 'Birth Certificate')}
                            />
                            <button
                              onClick={() => handlePreview(selectedChild.birthCertificateUrl, 'Birth Certificate')}
                              className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm mx-auto"
                            >
                              <Eye size={16} />
                              Preview
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedChild.headshotUrl && (
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-700">Headshot Photo</h5>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="text-center">
                          <img
                            src={selectedChild.headshotUrl}
                            alt="Headshot"
                            className="max-h-64 max-w-full mx-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => handlePreview(selectedChild.headshotUrl, 'Headshot Photo')}
                          />
                          <button
                            onClick={() => handlePreview(selectedChild.headshotUrl, 'Headshot Photo')}
                            className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm mx-auto"
                          >
                            <Eye size={16} />
                            Preview
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedChild.leagueIdPayment && (
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-700">Payment Information</h5>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Amount:</span>
                            <span className="ml-2 text-gray-700">
                              ${(selectedChild.leagueIdPayment.amount / 100).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Status:</span>
                            <span className="ml-2 text-gray-700 capitalize">
                              {selectedChild.leagueIdPayment.status}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Payment ID:</span>
                            <span className="ml-2 text-gray-700 font-mono text-xs">
                              {selectedChild.leagueIdPayment.paymentIntentId?.slice(-8)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedChild.idType === 'none' && (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle size={32} className="mx-auto mb-2 text-gray-300" />
                  <p>No ID documents uploaded</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Verification Status</h4>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Current Status:</span>
                    <span className="ml-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                        ${statusConfig[selectedChild.idStatus || 'unverified']?.color === 'green' ? 'bg-green-100 text-green-800' : ''}
                        ${statusConfig[selectedChild.idStatus || 'unverified']?.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${statusConfig[selectedChild.idStatus || 'unverified']?.color === 'red' ? 'bg-red-100 text-red-800' : ''}
                        ${statusConfig[selectedChild.idStatus || 'unverified']?.color === 'gray' ? 'bg-gray-100 text-gray-800' : ''}
                      `}>
                        {statusConfig[selectedChild.idStatus || 'unverified']?.label}
                      </span>
                    </span>
                  </div>

                  {selectedChild?.idReviewedAt && (
                    <div>
                      <span className="font-medium">Last Reviewed:</span>
                      <span className="ml-2 text-gray-700">
                        {formatDate(selectedChild?.idReviewedAt)}
                      </span>
                    </div>
                  )}

                  {selectedChild.idRejectionReason && (
                    <div className="md:col-span-2">
                      <span className="font-medium">Rejection Reason:</span>
                      <span className="ml-2 text-gray-700">{selectedChild.idRejectionReason}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {selectedChild.idStatus !== 'active' && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApprove(selectedChild.uid)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Approve ID
                    </Button>

                    <div className="flex-1 space-y-2">
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter rejection reason (required)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        rows={2}
                      />
                      <Button
                        onClick={() => handleReject(selectedChild.uid)}
                        className="w-full bg-red-600 hover:bg-red-700"
                        disabled={!rejectionReason.trim()}
                      >
                        <XCircle size={16} className="mr-2" />
                        Reject ID
                      </Button>
                    </div>
                  </div>
                )}

                {selectedChild.idStatus === 'active' && (
                  <div className="mt-4 space-y-2">
                    <div className="text-center text-green-600 py-2">
                      <CheckCircle size={20} className="inline mr-2" />
                      This ID has been approved
                    </div>
                    <Button
                      onClick={() => regenerateIDCard(selectedChild)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      🔄 Regenerate ID Files
                    </Button>
                    {selectedChild.generatedIdUrl ? (
                      <div className="text-xs text-green-600 text-center">
                        ✅ ID card files generated. 
                        <button
                          onClick={() => handlePreview(selectedChild.generatedIdUrl, 'Generated ID Card')}
                          className="underline ml-1 text-blue-600 hover:text-blue-800"
                        >
                          Preview
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-yellow-600 text-center">
                        ⚠️ ID card files may need to be generated
                      </div>
                    )}
                  </div>
                )}

                {selectedChild.idStatus === 'rejected' && (
                  <div className="text-center">
                    <Button
                      onClick={() => handleApprove(selectedChild.uid)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Approve Anyway
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default IDManagement;