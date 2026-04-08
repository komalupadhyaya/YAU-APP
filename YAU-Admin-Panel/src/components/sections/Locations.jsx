import React, { useState, useEffect } from 'react';
import Header from '../layout/Header';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Table, { TableRow, TableCell } from '../common/Table';
import { getLocations, addLocation, updateLocation, deleteLocation } from '../../firebase/firestore';
import { Plus, Edit, Trash2, Search, MapPin, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

export const Locations = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: ''
  });

  // Items per page options
  const itemsPerPageOptions = [5, 10, 25, 50, 100];

  useEffect(() => {
    loadLocations();
  }, []);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const locationsData = await getLocations();
      console.log('Loaded locations data:', locationsData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    try {
      console.log('Adding location with data:', newLocation);
      await addLocation(newLocation);
      setNewLocation({
        name: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        notes: ''
      });
      setIsAddModalOpen(false);
      loadLocations();
    } catch (error) {
      console.error('Error adding location:', error);
      alert('Error adding location: ' + error.message);
    }
  };

  const handleEditLocation = async (e) => {
    e.preventDefault();
    try {
      console.log('Updating location with data:', editingLocation);
      await updateLocation(editingLocation.id, editingLocation);
      setEditingLocation(null);
      loadLocations();
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Error updating location: ' + error.message);
    }
  };

  const handleDeleteLocation = async (id) => {
    if (window.confirm('Are you sure you want to delete this location?')) {
      try {
        await deleteLocation(id);
        loadLocations();
      } catch (error) {
        console.error('Error deleting location:', error);
        alert('Error deleting location: ' + error.message);
      }
    }
  };

  // Filter locations based on search term
  const filteredLocations = locations.filter(location =>
    location.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalItems = filteredLocations.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredLocations.slice(startIndex, endIndex);

  // Pagination handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPage = (page) => setCurrentPage(page);

  // Generate page numbers for pagination
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
        title="Locations Management"
        subtitle="Manage all sports program locations"
      />

      <div className="glass rounded-2xl p-6">
        {/* Header with Search and Add Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              All Locations ({totalItems})
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
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus size={20} className="mr-2" />
              Add Location
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

        {/* Table */}
        <div className="overflow-x-auto">
          <Table headers={['Name', 'Address', 'City', 'State', 'Zip', 'Notes', 'Created', 'Actions']}>
            {currentItems.map((location) => (
              <TableRow key={location.id}>
                <TableCell className="font-medium">{location.name}</TableCell>
                <TableCell>{location.address}</TableCell>
                <TableCell>{location.city}</TableCell>
                <TableCell>{location.state}</TableCell>
                <TableCell>{location.zip}</TableCell>
                <TableCell>
                  <div className="truncate max-w-[200px]" title={location.notes}>
                    {location.notes || 'N/A'}
                  </div>
                </TableCell>
                <TableCell>
                  {location.createdAt ? (
                    location.createdAt.toDate ? 
                      location.createdAt.toDate().toLocaleDateString() : 
                      new Date(location.createdAt).toLocaleDateString()
                  ) : 'N/A'}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingLocation(location)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Edit Location"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(location.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Delete Location"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </div>

        {/* Empty State */}
        {currentItems.length === 0 && (
          <div className="text-center py-12">
            <MapPin size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 mb-2">
              {searchTerm ? 'No locations found matching your search.' : 'No locations found. Add your first location!'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-primary-600 hover:text-primary-800 text-sm"
              >
                Clear search to see all locations
              </button>
            )}
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
                    onClick={() => goToPage(pageNum)}
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

      {/* Add Location Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Location"
        size="lg"
      >
        <form onSubmit={handleAddLocation} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location Name *</label>
            <input
              type="text"
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              value={newLocation.name}
              onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
              required
              placeholder="Enter location name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
            <input
              type="text"
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              value={newLocation.address}
              onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
              required
              placeholder="Enter street address"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
              <input
                type="text"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={newLocation.city}
                onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
                required
                placeholder="Enter city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
              <input
                type="text"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={newLocation.state}
                onChange={(e) => setNewLocation({ ...newLocation, state: e.target.value })}
                required
                placeholder="Enter state"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code *</label>
              <input
                type="text"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={newLocation.zip}
                onChange={(e) => setNewLocation({ ...newLocation, zip: e.target.value })}
                required
                placeholder="Enter zip code"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              value={newLocation.notes}
              onChange={(e) => setNewLocation({ ...newLocation, notes: e.target.value })}
              rows="3"
              placeholder="Additional notes about the location..."
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Location</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Location Modal */}
      {editingLocation && (
        <Modal
          isOpen={!!editingLocation}
          onClose={() => setEditingLocation(null)}
          title="Edit Location"
          size="lg"
        >
          <form onSubmit={handleEditLocation} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location Name *</label>
              <input
                type="text"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={editingLocation.name}
                onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
              <input
                type="text"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={editingLocation.address}
                onChange={(e) => setEditingLocation({ ...editingLocation, address: e.target.value })}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  value={editingLocation.city}
                  onChange={(e) => setEditingLocation({ ...editingLocation, city: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  value={editingLocation.state}
                  onChange={(e) => setEditingLocation({ ...editingLocation, state: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code *</label>
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  value={editingLocation.zip}
                  onChange={(e) => setEditingLocation({ ...editingLocation, zip: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={editingLocation.notes || ''}
                onChange={(e) => setEditingLocation({ ...editingLocation, notes: e.target.value })}
                rows="3"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setEditingLocation(null)}>
                Cancel
              </Button>
              <Button type="submit">Update Location</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};