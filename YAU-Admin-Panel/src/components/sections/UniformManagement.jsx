import React, { useState, useEffect } from 'react';
import Header from '../layout/Header';
import Table, { TableRow, TableCell } from '../common/Table';
import Button from '../common/Button';
import TextField from '../common/TextField';
import LoadingSpinner from '../common/LoadingSpinner';
import StatCard from '../common/StatCard';
import Modal from '../common/Modal';
import UniformAPI from '../../firebase/apis/api-uniforms';
import { useAuth } from '../../context/AuthContext';

function UniformManagement() {
  const { user, isAuthenticated, canManageUsers } = useAuth();
  const [uniforms, setUniforms] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    team: '',
    status: '',
    paymentStatus: ''
  });
  const [isExporting, setIsExporting] = useState(false);
  const [selectedUniforms, setSelectedUniforms] = useState(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUniform, setEditingUniform] = useState(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUniformsData = async () => {
    try {
      setLoading(true);
      
      // If there's a search query, use search endpoint, otherwise use getAll with filters
      let uniformsData;
      if (searchQuery && searchQuery.trim()) {
        uniformsData = { uniforms: await UniformAPI.searchUniforms(searchQuery, filters) };
      } else {
        uniformsData = await UniformAPI.getAllUniforms(filters);
      }
      
      const summaryData = await UniformAPI.getUniformsSummary();
      console.log("summaryData", summaryData)
      setUniforms(uniformsData.uniforms || []);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching uniforms:', error);
      // Set empty state on error
      setUniforms([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniformsData();
  }, []);

  const handleSearch = async () => {
    await fetchUniformsData();
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const handleReceivedToggle = async (uniformId, currentStatus) => {
    try {
      await UniformAPI.updateReceivedStatus(uniformId, !currentStatus, user);
      await fetchUniformsData();
    } catch (error) {
      console.error('Error updating received status:', error);
    }
  };

  const handleSelectUniform = (uniformId, checked) => {
    const newSelected = new Set(selectedUniforms);
    if (checked) {
      newSelected.add(uniformId);
    } else {
      newSelected.delete(uniformId);
    }
    setSelectedUniforms(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = new Set(uniforms.map(u => u.id));
      setSelectedUniforms(allIds);
      setShowBulkActions(true);
    } else {
      setSelectedUniforms(new Set());
      setShowBulkActions(false);
    }
  };

  const handleBulkReceivedUpdate = async (received) => {
    try {
      const updatePromises = Array.from(selectedUniforms).map(uniformId =>
        UniformAPI.updateReceivedStatus(uniformId, received, user)
      );
      await Promise.all(updatePromises);
      setSelectedUniforms(new Set());
      setShowBulkActions(false);
      await fetchUniformsData();
    } catch (error) {
      console.error('Error updating bulk received status:', error);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsDeleting(true);
      const orderIds = Array.from(selectedUniforms);
      await UniformAPI.batchDeleteOrders(orderIds);
      
      // Clear selection and refresh data
      setSelectedUniforms(new Set());
      setShowBulkActions(false);
      setShowDeleteConfirmation(false);
      await fetchUniformsData();
      
      // Show success message (you might want to add a toast notification system)
      console.log(`✅ Successfully deleted ${orderIds.length} uniform orders`);
    } catch (error) {
      console.error('Error deleting uniform orders:', error);
      // Show error message
      alert(`Error deleting orders: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const timestamp = new Date().toISOString().split('T')[0];
      await UniformAPI.downloadCSV(filters, `uniforms-export-${timestamp}`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSingleDelete = async (uniformId, uniformName) => {
    if (window.confirm(`Are you sure you want to delete the uniform order for "${uniformName}"? This action cannot be undone.`)) {
      try {
        await UniformAPI.batchDeleteOrders([uniformId]);
        await fetchUniformsData();
        console.log('✅ Uniform order deleted successfully');
      } catch (error) {
        console.error('Error deleting uniform order:', error);
        alert(`Error deleting order: ${error.message}`);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPaymentStatusBadge = (status) => {
    const statusColors = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Authentication required</div>
          <div className="text-sm text-gray-400">Please log in to access uniform management</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        title="Uniform Management"
        subtitle="Track and manage uniform orders and deliveries"
      />

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={summary.totalOrders || 0}
          icon="📦"
        />
        <StatCard
          title="Not Received"
          value={summary.notReceived || 0}
          icon="⏳"
          valueColor="text-yellow-600"
        />
        <StatCard
          title="Received"
          value={summary.received || 0}
          icon="✅"
          valueColor="text-green-600"
        />
        <StatCard
          title="Pending Payment"
          value={summary.pendingPayment || 0}
          icon="💳"
          valueColor="text-red-600"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <TextField
              label="Search"
              placeholder="Search by student, parent name, or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team
            </label>
            <select
              value={filters.team}
              onChange={(e) => handleFilterChange('team', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Teams</option>
              <option value="U8">U8</option>
              <option value="U10">U10</option>
              <option value="U12">U12</option>
              <option value="U14">U14</option>
              <option value="U16">U16</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="received">Received</option>
              <option value="not_received">Not Received</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <Button
              onClick={handleSearch}
              className="w-full"
            >
              Search
            </Button>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <div className="flex space-x-2">
            <Button
              onClick={() => {
                setSearchQuery('');
                setFilters({ team: '', status: '', paymentStatus: '' });
                setSelectedUniforms(new Set());
                setShowBulkActions(false);
                fetchUniformsData();
              }}
              variant="secondary"
            >
              Clear Filters
            </Button>
            
            {canManageUsers() && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Add Manual Order</span>
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            {showBulkActions && (
              <>
                <Button
                  onClick={() => handleBulkReceivedUpdate(true)}
                  variant="secondary"
                  className="flex items-center space-x-1"
                >
                  <span>✅</span>
                  <span>Mark Received ({selectedUniforms.size})</span>
                </Button>
                <Button
                  onClick={() => handleBulkReceivedUpdate(false)}
                  variant="secondary"
                  className="flex items-center space-x-1"
                >
                  <span>⏳</span>
                  <span>Mark Not Received ({selectedUniforms.size})</span>
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirmation(true)}
                  variant="danger"
                  className="flex items-center space-x-1"
                >
                  <span>🗑️</span>
                  <span>Delete ({selectedUniforms.size})</span>
                </Button>
              </>
            )}
            
            <Button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="flex items-center space-x-2"
            >
              {isExporting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>Export CSV</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Uniforms Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Uniform Orders ({uniforms.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <Table
            headers={[
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedUniforms.size === uniforms.length && uniforms.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span></span>
                <span>Actions</span>
              </div>,
              'Student',
              'Parent',
              'Team',
              'Size',
              'Order Date',
              'Payment',
              'Status',
              'Admin Actions'
            ]}
          >
            {uniforms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No uniforms found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              uniforms.map((uniform) => (
                <TableRow key={uniform.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedUniforms.has(uniform.id)}
                        onChange={(e) => handleSelectUniform(uniform.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={uniform.received || false}
                          onChange={() => handleReceivedToggle(uniform.id, uniform.received)}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-600">
                          {uniform.received ? 'Received' : 'Not Received'}
                        </span>
                      </label>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="font-medium text-gray-900">
                      {uniform.studentName}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">
                        {uniform.parentName}
                      </div>
                      {uniform.parentEmail && (
                        <div className="text-sm text-gray-500">
                          {uniform.parentEmail}
                        </div>
                      )}
                      {uniform.parentPhone && (
                        <div className="text-sm text-gray-500">
                          {uniform.parentPhone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {uniform.team}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      {uniform.sizes?.map((size, index) => (
                        <span key={index} className="block text-sm">
                          {size.item}: {size.size}
                        </span>
                      )) || (
                        <div>
                          {uniform.uniformTop && <div className="text-sm">Top: {uniform.uniformTop}</div>}
                          {uniform.uniformBottom && <div className="text-sm">Bottom: {uniform.uniformBottom}</div>}
                          {uniform.size && <div className="text-sm">Size: {uniform.size}</div>}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-gray-600">
                    {formatDate(uniform.orderDate)}
                  </TableCell>
                  
                  <TableCell>
                    {getPaymentStatusBadge(uniform.paymentStatus)}
                    {uniform.paymentAmount && (
                      <div className="text-sm text-gray-500 mt-1">
                        ${uniform.paymentAmount}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      uniform.received 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {uniform.received ? 'Received' : 'Not Received'}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {canManageUsers() && (
                        <>
                          <button
                            onClick={() => setEditingUniform(uniform)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleSingleDelete(uniform.id, uniform.studentName)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          // TODO: Show uniform details modal
                          console.log('View details:', uniform);
                        }}
                        className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                      >
                        Details
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </Table>
        </div>
      </div>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        title="Confirm Bulk Delete"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-red-800 font-medium">Warning: This action cannot be undone</h3>
                <p className="text-red-700 text-sm mt-1">
                  You are about to delete {selectedUniforms.size} uniform order(s). This will permanently remove all selected orders from the system.
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-gray-600">
            Are you sure you want to proceed with the deletion?
          </p>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => setShowDeleteConfirmation(false)}
              variant="secondary"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkDelete}
              variant="danger"
              disabled={isDeleting}
              className="flex items-center space-x-2"
            >
              {isDeleting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <span>🗑️</span>
                  <span>Delete {selectedUniforms.size} Orders</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default UniformManagement;