// src/components/pages/Resource.jsx
import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
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
  Star,
  Save,
  X,
  Plus,
  AlertTriangle,
  Upload,
  Info
} from 'lucide-react';
import {
  updateResource,
  deleteResource,
  getResourceById,
  batchDeleteResources,
  getResources,
  uploadFile,
  addResource,
} from '../../firebase/firestore';
import Header from '../layout/Header';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Table, { TableRow, TableCell } from '../common/Table';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

// EditResourceForm Component
const EditResourceForm = ({ resource, onSave, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    link: '',
    logo: '',
    isFeatured: false,
    phone: '', // Added for mobile app contact actions
    email: '', // Added for mobile app contact actions
  });
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    if (resource) {
      setFormData({
        name: resource.name || '',
        description: resource.description || '',
        link: resource.link || '',
        logo: resource.logo || '',
        isFeatured: resource.isFeatured || false,
        phone: resource.phone || '',
        email: resource.email || '',
      });
    }
  }, [resource]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = 'Name is required';
    if (!formData.link?.trim()) {
      newErrors.link = 'Link is required';
    } else if (!/^https?:\/\/[^\s$.?#].[^\s]*$/.test(formData.link)) {
      newErrors.link = 'Invalid URL format';
    }
    if (formData.phone && !/^\+?\d{10,15}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    let updatedData = { ...formData };
    if (logoFile) {
      try {
        setUploading(true);
        const uploadResult = await uploadFile(logoFile, 'image');
        updatedData.logo = uploadResult.url;
      } catch (error) {
        setErrors({ ...errors, logo: 'Failed to upload logo' });
        return;
      } finally {
        setUploading(false);
      }
    }
    onSave(updatedData);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, logo: 'Please upload an image file' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, logo: 'File size must be under 5MB' });
        return;
      }
      setLogoFile(file);
      setErrors({ ...errors, logo: '' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Resource Information</h4>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Resource Name"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Resource Description"
            rows={4}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Link *</label>
          <input
            type="url"
            value={formData.link}
            onChange={(e) => handleInputChange('link', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.link ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="https://example.com"
          />
          {errors.link && <p className="text-red-500 text-xs mt-1">{errors.link}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.phone ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="+1234567890"
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="contact@example.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
          {formData.logo && (
            <div className="mb-2">
              <img
                src={formData.logo}
                alt="Current logo"
                className="w-32 h-32 object-contain rounded-lg border border-gray-200"
              />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.logo && <p className="text-red-500 text-xs mt-1">{errors.logo}</p>}
          {uploading && <p className="text-blue-500 text-xs mt-1">Uploading...</p>}
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={formData.isFeatured}
            onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label className="text-sm font-medium text-gray-700">Feature this resource</label>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <Button type="button" onClick={onCancel} variant="secondary" disabled={loading || uploading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || uploading} className="flex items-center gap-2">
          <Save size={16} />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};

// Main Resource Component
const Resource = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [filters, setFilters] = useState({ isFeatured: 'all' });
  const [selectedResources, setSelectedResources] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, resource: null });
  const [selectedDescription, setSelectedDescription] = useState('');
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);

  const itemsPerPageOptions = [5, 10, 25, 50, 100];

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const loadResources = async () => {
    try {
      setLoading(true);
      const resourcesData = await getResources();
      setResources(resourcesData);
    } catch (error) {
      console.error('Error loading resources:', error);
      alert('Error loading resources: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResource = (resource) => {
    setDeleteConfirmation({ isOpen: true, resource });
  };

  const confirmDelete = async () => {
    const { resource } = deleteConfirmation;
    try {
      setLoading(true);
      const result = await deleteResource(resource.id);
      if (result.success) {
        alert(`✅ ${result.message}`);
        loadResources();
      } else {
        alert('❌ Failed to delete resource');
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert('❌ Error deleting resource: ' + error.message);
    } finally {
      setLoading(false);
      setDeleteConfirmation({ isOpen: false, resource: null });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedResources.length === 0) {
      alert('Please select resources to delete');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${selectedResources.length} resource(s)?`)) return;
    try {
      setLoading(true);
      const result = await batchDeleteResources(selectedResources);
      if (result.success) {
        alert(`✅ Successfully deleted ${result.summary.successful} resource(s)`);
      } else {
        alert(`⚠️ Batch deletion completed with ${result.summary.failed} errors.`);
      }
      setSelectedResources([]);
      loadResources();
    } catch (error) {
      console.error('Error in batch deletion:', error);
      alert('❌ Error during batch deletion: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditResource = async (resource) => {
    try {
      const resourceData = await getResourceById(resource.id);
      if (resourceData) {
        setEditingResource(resourceData);
        setIsEditModalOpen(true);
      }
    } catch (error) {
      console.error('Error loading resource for edit:', error);
      alert('Error loading resource data');
    }
  };

  const handleSaveEdit = async (updatedData) => {
    try {
      setLoading(true);
      await updateResource(editingResource.id, updatedData);
      alert('✅ Resource updated successfully');
      setIsEditModalOpen(false);
      setEditingResource(null);
      loadResources();
    } catch (error) {
      console.error('Error updating resource:', error);
      alert('❌ Error updating resource: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddResource = async (newData) => {
    try {
      setLoading(true);
      await addResource(newData);
      alert('✅ Resource added successfully');
      setIsAddModalOpen(false);
      loadResources();
    } catch (error) {
      console.error('Error adding resource:', error);
      alert('❌ Error adding resource: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (resource) => {
    setSelectedResource(resource);
    setIsViewModalOpen(true);
  };

  const handleViewDescription = (description) => {
    setSelectedDescription(description);
    setIsDescriptionModalOpen(true);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Description', 'Link', 'Phone', 'Email', 'Featured', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...filteredResources.map((resource) => [
        `"${resource.name}"`,
        `"${resource.description?.replace(/"/g, '""') || ''}"`,
        resource.link,
        resource.phone || '',
        resource.email || '',
        resource.isFeatured ? 'Yes' : 'No',
        resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : '',
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resources_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.link?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilters =
      filters.isFeatured === 'all' ||
      (filters.isFeatured === 'featured' && resource.isFeatured) ||
      (filters.isFeatured === 'notfeatured' && !resource.isFeatured);
    return matchesSearch && matchesFilters;
  });

  const totalItems = filteredResources.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredResources.slice(startIndex, endIndex);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

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

  if (loading && resources.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Resources Management" subtitle="Manage resources for the YAU app" />
      <div className="glass rounded-2xl p-6">
        {/* Header with Search and Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <BookOpen className="text-blue-600" size={20} />
              All Resources ({totalItems})
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
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
              />
            </div>
            <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
              <Plus size={16} />
              Add Resource
            </Button>
            <Button
              onClick={exportToCSV}
              variant="secondary"
              className="flex items-center gap-2"
              disabled={filteredResources.length === 0}
            >
              <Download size={16} />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Batch Operations Bar */}
        {selectedResources.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                {selectedResources.length} resource(s) selected
              </span>
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
                  onClick={() => setSelectedResources([])}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Featured Status</label>
              <select
                value={filters.isFeatured}
                onChange={(e) => setFilters({ ...filters, isFeatured: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">All</option>
                <option value="featured">Featured</option>
                <option value="notfeatured">Not Featured</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters({ isFeatured: 'all' })}
              className="text-xs"
            >
              Clear Filters
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
              {itemsPerPageOptions.map((option) => (
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

        {/* Resources Table */}
        <div className="overflow-x-auto">
          <Table
            headers={[
              <div key="select" className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedResources.length === currentItems.length && currentItems.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedResources(currentItems.map((r) => r.id));
                    } else {
                      setSelectedResources([]);
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>,
              'Actions',
              'Name',
              'Description',
              'Link',
              'Phone',
              'Email',
              'Featured',
              'Created',
            ]}
          >
            {currentItems.map((resource) => (
              <TableRow key={resource.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedResources.includes(resource.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedResources([...selectedResources, resource.id]);
                      } else {
                        setSelectedResources(selectedResources.filter((id) => id !== resource.id));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </TableCell>
                   <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewDetails(resource)}
                      className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                      title="View Details"
                      disabled={loading}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleEditResource(resource)}
                      className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
                      title="Edit Resource"
                      disabled={loading}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteResource(resource)}
                      className="p-1 text-red-600 hover:text-red-800 transition-colors"
                      title="Delete Resource"
                      disabled={loading}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {resource.logo ? (
                      <img
                        src={resource.logo}
                        alt={resource.name}
                        className="w-10 h-10 rounded-full object-contain border border-gray-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <BookOpen size={20} className="text-gray-500" />
                      </div>
                    )}
                    <div className="font-medium text-gray-900">{resource.name}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2 max-w-[200px]">
                    <div className="text-sm text-gray-600 line-clamp-2">
                      {resource.description || 'N/A'}
                    </div>
                    {resource.description && resource.description.length > 100 && (
                      <button
                        onClick={() => handleViewDescription(resource.description)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View full description"
                      >
                        <Info size={16} />
                      </button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <a
                    href={resource.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {resource.link.slice(0, 30)}...
                  </a>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-600">{resource.phone || 'N/A'}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-600">{resource.email || 'N/A'}</div>
                </TableCell>
                <TableCell>
                  {resource.isFeatured ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                      <Star size={12} />
                      Featured
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Not Featured</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-600">
                    {resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </TableCell>
             
              </TableRow>
            ))}
          </Table>
        </div>

        {/* Description Modal */}
        <Dialog open={isDescriptionModalOpen} onClose={() => setIsDescriptionModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Full Description</DialogTitle>
          <DialogContent>
            <p className="text-sm text-gray-600">{selectedDescription || 'N/A'}</p>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsDescriptionModalOpen(false)} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Empty State */}
        {currentItems.length === 0 && !loading && (
          <div className="text-center py-12">
            <BookOpen size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 mb-2">
              {searchTerm || Object.values(filters).some((f) => f !== 'all')
                ? 'No resources found matching your criteria.'
                : 'No resources found.'}
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="text-primary-600 hover:text-primary-800 text-sm"
            >
              Add your first resource
            </button>
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
              {getPageNumbers().map((pageNum) => (
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
      {selectedResource && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedResource(null);
          }}
          title={`Resource Details - ${selectedResource.name}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              {selectedResource.logo ? (
                <img
                  src={selectedResource.logo}
                  alt={selectedResource.name}
                  className="w-16 h-16 rounded-full object-contain border border-gray-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <BookOpen size={32} className="text-gray-500" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold">{selectedResource.name}</h3>
                {selectedResource.isFeatured && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium mt-1">
                    <Star size={12} />
                    Featured
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Description</h4>
              <p className="text-gray-700">{selectedResource.description || 'No description provided'}</p>
            </div>
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Contact Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Website:</span>
                  <a
                    href={selectedResource.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    {selectedResource.link}
                  </a>
                </div>
                <div>
                  <span className="font-medium">Phone:</span>
                  <span className="ml-2 text-gray-700">{selectedResource.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Email:</span>
                  <span className="ml-2 text-gray-700">{selectedResource.email || 'N/A'}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Created:</span>
                  <span className="ml-2 text-gray-700">
                    {selectedResource.createdAt ? new Date(selectedResource.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">ID:</span>
                  <span className="ml-2 text-gray-700 font-mono text-xs">{selectedResource.id}</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Resource Modal */}
      {editingResource && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingResource(null);
          }}
          title={`Edit Resource - ${editingResource.name}`}
          size="lg"
        >
          <EditResourceForm
            resource={editingResource}
            onSave={handleSaveEdit}
            onCancel={() => {
              setIsEditModalOpen(false);
              setEditingResource(null);
            }}
            loading={loading}
          />
        </Modal>
      )}

      {/* Add Resource Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Resource"
        size="lg"
      >
        <EditResourceForm
          resource={{}}
          onSave={handleAddResource}
          onCancel={() => setIsAddModalOpen(false)}
          loading={loading}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <Modal
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation({ isOpen: false, resource: null })}
          title="Confirm Deletion"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-white" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-red-900">Delete Resource</h4>
                <p className="text-sm text-red-700">This action cannot be undone</p>
              </div>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h5 className="font-medium mb-2">Resource to be deleted:</h5>
              <div className="flex items-center gap-3">
                {deleteConfirmation.resource.logo ? (
                  <img
                    src={deleteConfirmation.resource.logo}
                    alt={deleteConfirmation.resource.name}
                    className="w-8 h-8 rounded-full object-contain border border-gray-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <BookOpen size={16} className="text-gray-500" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{deleteConfirmation.resource.name}</p>
                  <p className="text-sm text-gray-600">{deleteConfirmation.resource.link.slice(0, 30)}...</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={() => setDeleteConfirmation({ isOpen: false, resource: null })}
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
                {loading ? 'Deleting...' : 'Delete Resource'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Resource;