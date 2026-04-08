import React, { useState, useEffect } from 'react';
import {
  Building,
  Users,
  Trophy,
  MapPin,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  Search,
  Filter,
  Save,
  X,
  ArrowLeft,
  Grid,
  List,
  CalendarPlus,
  Check
} from 'lucide-react';
import {
  getAllOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  addSport,
  removeSport,
  addDivision,
  removeDivision,
  getAllAgeGroups
} from '../../firebase/apis/api-organizations';
import { useNavigate } from 'react-router-dom';

const OrganizationManagement = () => {
  // State management
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [selectedSport, setSelectedSport] = useState(null);
  const [view, setView] = useState('list'); // 'list', 'details', 'sports', 'divisions'
  const [showForm, setShowForm] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    address: '',
    status: 'active',
    sports: {}
  });

  // Sports and age group selection
  const [selectedSports, setSelectedSports] = useState([]);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState([]);
  const [customSport, setCustomSport] = useState('');
  const [useGrades, setUseGrades] = useState(false);

  // Predefined options
  const sportOptions = [
    { value: "Soccer", label: "⚽ Soccer" },
    { value: "Basketball", label: "🏀 Basketball" },
    { value: "Baseball", label: "⚾ Baseball" },
    { value: "Track", label: "🏃‍♂️ Track & Field" },
    { value: "Flag_football", label: "🏈 Flag Football" },
    { value: "Tackle_football", label: "🏈 Tackle Football" },
    { value: "Kickball", label: "🥎 Kickball" },
    { value: "Golf", label: "🏌️ Golf" },
    { value: "Cheer", label: "📣 Cheer" },
  ];

  const gradeOptions = [
    { value: "Kindergarden", label: "Kindergarden" },
    { value: "1st_grade", label: "1st Grade" },
    { value: "2nd_grade", label: "2nd Grade" },
    { value: "3rd_grade", label: "3rd Grade" },
    { value: "4th_grade", label: "4th Grade" },
    { value: "5th_grade", label: "5th Grade" },
    { value: "6th_grade", label: "6th Grade" },
    { value: "7th_grade", label: "7th Grade" },
    { value: "8th_grade", label: "8th Grade" },
  ];

  const ageGroupOptions = [
    { value: "U3", label: "3U (Under 3)" },
    { value: "U4", label: "4U (Under 4)" },
    { value: "U5", label: "5U (Under 5)" },
    { value: "U6", label: "6U (Under 6)" },
    { value: "U7", label: "7U (Under 7)" },
    { value: "U8", label: "8U (Under 8)" },
    { value: "U9", label: "9U (Under 9)" },
    { value: "U10", label: "10U (Under 10)" },
    { value: "U11", label: "11U (Under 11)" },
    { value: "U12", label: "12U (Under 12)" },
    { value: "U13", label: "13U (Under 13)" },
    { value: "U14", label: "14U (Under 14)" },
  ];

  // Load data on component mount
  useEffect(() => {
    loadOrganizations();
  }, []);

  // Reset form when opening
  useEffect(() => {
    if (showForm && !editingOrganization) {
      resetForm();
    }
  }, [showForm, editingOrganization]);

  // API Functions
  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const orgsData = await getAllOrganizations();
      setOrganizations(orgsData);
    } catch (error) {
      console.error('Error loading organizations:', error);
      alert('Error loading organizations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      city: '',
      address: '',
      status: 'active',
      sports: {}
    });
    setSelectedSports([]);
    setSelectedAgeGroups([]);
    setCustomSport('');
    setUseGrades(false);
  };

  // Navigation functions
  const handleBackToList = () => {
    setView('list');
    setSelectedOrganization(null);
    setSelectedSport(null);
  };

  const handleViewOrganization = (org) => {
    setSelectedOrganization(org);
    setView('details');
  };

  const handleViewSports = () => {
    setView('sports');
  };

  const handleViewSportDetails = (sport) => {
    setSelectedSport(sport);
    setView('divisions');
  };

  const handleBackToDetails = () => {
    setView('details');
    setSelectedSport(null);
  };

  const handleBackToSports = () => {
    setView('sports');
    setSelectedSport(null);
  };

  // Handle sport selection
  const handleSportToggle = (sportValue) => {
    setSelectedSports(prev => 
      prev.includes(sportValue) 
        ? prev.filter(s => s !== sportValue)
        : [...prev, sportValue]
    );
  };

  // Handle age group/grade selection
  const handleAgeGroupToggle = (ageValue) => {
    setSelectedAgeGroups(prev => 
      prev.includes(ageValue) 
        ? prev.filter(a => a !== ageValue)
        : [...prev, ageValue]
    );
  };

  // Add custom sport
  const handleAddCustomSport = () => {
    if (customSport.trim() && !selectedSports.includes(customSport)) {
      setSelectedSports(prev => [...prev, customSport.trim()]);
      setCustomSport('');
    }
  };

  // Prepare sports data for submission
  const prepareSportsData = () => {
    const sportsData = {};
    const divisions = selectedAgeGroups.map(age => ({
      age: age,
      ageGroup: useGrades 
        ? gradeOptions.find(g => g.value === age)?.label || age
        : ageGroupOptions.find(a => a.value === age)?.label || age
    }));

  // Only add sports if any are selected
  if (selectedSports.length > 0) {
    selectedSports.forEach(sport => {
      sportsData[sport] = { divisions };
    });
  } else {
    // If no sports selected, create a default "General" sport
    sportsData["General"] = { divisions };
  }

    return sportsData;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert("Organization name is required");
      return;
    }

    if (selectedAgeGroups.length === 0) {
      alert("Please select at least one age group/grade");
      return;
    }

    try {
      setLoading(true);
      const submissionData = {
        ...formData,
        sports: prepareSportsData(),
        createdAt: editingOrganization ? formData.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let result;
      if (editingOrganization) {
        console.log("editingOrganization", editingOrganization)
        result = await updateOrganization(editingOrganization.id, submissionData);
        setOrganizations(prev => prev.map(o => o.id === result.id ? result : o));
        if (selectedOrganization?.id === result.id) {
          setSelectedOrganization(result);
        }
      } else {
        result = await createOrganization(submissionData);
        setOrganizations(prev => [...prev, result]);
      }

      setShowForm(false);
      setEditingOrganization(null);
      resetForm();
      setView('list');
      
    } catch (error) {
      console.error("Error saving organization:", error);
      alert("Failed to save organization. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Edit organization
  const handleEdit = (org) => {
    setEditingOrganization(org);
    setFormData({
      name: org.name || '',
      city: org.city || '',
      address: org.address || '',
      status: org.status || 'active',
      sports: org.sports || {}
    });

    // Extract sports and age groups from existing data
    const sports = Object.keys(org.sports || {});
    setSelectedSports(sports);

    // Extract age groups from first sport (assuming all sports have same divisions)
    const firstSport = sports[0];
    if (firstSport && org.sports[firstSport]?.divisions) {
      const ages = org.sports[firstSport].divisions.map(d => d.age);
      setSelectedAgeGroups(ages);
      
      // Detect if using grades
      const hasGrades = org.sports[firstSport].divisions.some(d => 
        d.age.includes('grade') || d.ageGroup.includes('Grade')
      );
      setUseGrades(hasGrades);
    }

    setShowForm(true);
    setView('list');
  };

  // Delete organization
  const handleDelete = async (orgId) => {
    if (window.confirm("Are you sure you want to delete this organization?")) {
      try {
        setLoading(true);
        await deleteOrganization(orgId);
        setOrganizations(prev => prev.filter(org => org.id !== orgId));
        if (selectedOrganization?.id === orgId) {
          handleBackToList();
        }
      } catch (error) {
        console.error("Error deleting organization:", error);
        alert("Failed to delete organization. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Add sport to organization
  const handleAddSport = async (sportName) => {
    if (!sportName.trim()) {
      alert("Please enter a sport name");
      return;
    }

    try {
      setLoading(true);
      const result = await addSport(selectedOrganization.id, sportName, []);
      setOrganizations(prev => prev.map(o => o.id === result.id ? result : o));
      setSelectedOrganization(result);
    } catch (error) {
      console.error("Error adding sport:", error);
      alert("Failed to add sport. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Remove sport from organization
  const handleRemoveSport = async (sportName) => {
    if (window.confirm(`Are you sure you want to remove ${sportName}?`)) {
      try {
        setLoading(true);
        const result = await removeSport(selectedOrganization.id, sportName);
        setOrganizations(prev => prev.map(o => o.id === result.id ? result : o));
        setSelectedOrganization(result);
      } catch (error) {
        console.error("Error removing sport:", error);
        alert("Failed to remove sport. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Add division to sport
  const handleAddDivision = async (division) => {
    if (!division.age || !division.ageGroup) {
      alert("Please enter both age and age group");
      return;
    }

    try {
      setLoading(true);
      const result = await addDivision(selectedOrganization.id, selectedSport.name, division);
      setOrganizations(prev => prev.map(o => o.id === result.id ? result : o));
      setSelectedOrganization(result);
      setSelectedSport({ ...selectedSport, divisions: result.sports[selectedSport.name]?.divisions || [] });
    } catch (error) {
      console.error("Error adding division:", error);
      alert("Failed to add division. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Remove division from sport
  const handleRemoveDivision = async (divisionAge) => {
    if (window.confirm(`Are you sure you want to remove ${divisionAge}?`)) {
      try {
        setLoading(true);
        const result = await removeDivision(selectedOrganization.id, selectedSport.name, divisionAge);
        setOrganizations(prev => prev.map(o => o.id === result.id ? result : o));
        setSelectedOrganization(result);
        setSelectedSport({ ...selectedSport, divisions: result.sports[selectedSport.name]?.divisions || [] });
      } catch (error) {
        console.error("Error removing division:", error);
        alert("Failed to remove division. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Filter organizations based on search
  const filteredOrganizations = organizations.filter(org =>
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper functions
  const getSportsCount = (sports) => Object.keys(sports || {}).length;
  const getDivisionsCount = (sport) => sport?.divisions?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-6 left-[75px] z-50">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-white rounded-lg shadow-md border border-gray-200"
        >
          {isSidebarOpen ? <ChevronLeft size={20} /> : <Building size={20} />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar - Organizations List */}
        <div className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0 transition-transform duration-300 ease-in-out
          fixed lg:static inset-y-0 left-0 z-40
          w-80 lg:w-96 bg-white border-r border-gray-200 shadow-lg lg:shadow-none
          overflow-y-auto
        `}>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 mt-[50px]">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Building size={24} className="text-blue-600" />
                  Team Management
                </h2>
                <p className="text-sm text-gray-600">{filteredOrganizations.length} total</p>
              </div>
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingOrganization(null);
                  setView('list');
                }}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Add New Organization"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search Teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Organizations List */}
            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
              {loading && organizations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading organizations...</p>
                </div>
              ) : filteredOrganizations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building size={48} className="mx-auto mb-3 text-gray-300" />
                  <p>No organizations found</p>
                  {searchTerm && (
                    <p className="text-sm mt-1">Try adjusting your search</p>
                  )}
                </div>
              ) : (
                filteredOrganizations.map(org => (
                  <div
                    key={org.id}
                    onClick={() => handleViewOrganization(org)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedOrganization?.id === org.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-transparent bg-gray-50 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-lg">{org.name}</h3>
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                          <MapPin size={14} />
                          {org.city}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Trophy size={12} />
                            {getSportsCount(org.sports)} sports
                          </span>
                          <span>
                            {getDivisionsCount(org.sports?.[Object.keys(org.sports || {})[0]])} age groups
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(org); }}
                          className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
                          title="Edit Organization"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(org.id); }}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          title="Delete Organization"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 min-h-screen">
          <div className="p-[0.5rem]">
            {/* Header with Breadcrumb */}
            <div className="mb-6">
              {view !== 'list' && (
                <button
                  onClick={() => {
                    if (view === 'divisions') handleBackToSports();
                    else if (view === 'sports') handleBackToDetails();
                    else handleBackToList();
                  }}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 transition-colors"
                >
                  <ArrowLeft size={20} />
                  Back
                </button>
              )}
                <div className="flex gap-1 justify-end">
                <button
                  onClick={() => navigate('/admin/match')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  title="View and Create Matches"
                >
                  <CalendarPlus size={20} />
                  <span>See All Matches</span>
                </button>
              </div>
              <h1 className="text-3xl font-bold text-gray-800">
                {view === 'list' && 'Team Management'}
                {view === 'details' && selectedOrganization?.name}
                {view === 'sports' && `Sports - ${selectedOrganization?.name}`}
                {view === 'divisions' && `${selectedSport?.name} - Age Groups`}
              </h1>
              <p className="text-gray-600 mt-2">
                {view === 'list' && 'Manage Teams and League Matches'}
                {view === 'details' && 'View and manage team details'}
                {view === 'sports' && 'Manage sports programs for this team'}
                {view === 'divisions' && 'Manage age groups and divisions for this sport'}
              </p>
            </div>

            {/* Content based on current view */}
            {view === 'list' && showForm && (
              <OrganizationForm
                formData={formData}
                setFormData={setFormData}
                selectedSports={selectedSports}
                setSelectedSports={setSelectedSports}
                selectedAgeGroups={selectedAgeGroups}
                setSelectedAgeGroups={setSelectedAgeGroups}
                customSport={customSport}
                setCustomSport={setCustomSport}
                useGrades={useGrades}
                setUseGrades={setUseGrades}
                sportOptions={sportOptions}
                gradeOptions={gradeOptions}
                ageGroupOptions={ageGroupOptions}
                handleSubmit={handleSubmit}
                handleAddCustomSport={handleAddCustomSport}
                handleSportToggle={handleSportToggle}
                handleAgeGroupToggle={handleAgeGroupToggle}
                onCancel={() => {
                  setShowForm(false);
                  setEditingOrganization(null);
                  resetForm();
                }}
                editingOrganization={editingOrganization}
                loading={loading}
              />
            )}

            {view === 'list' && !showForm && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <Building size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Select the team</h3>
                <p className="text-gray-500 mb-6">Choose an team from the list to view details and manage team programs.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Create New Team
                </button>
              </div>
            )}

            {view === 'details' && selectedOrganization && (
              <OrganizationDetails
                organization={selectedOrganization}
                onEdit={handleEdit}
                onViewSports={handleViewSports}
                getSportsCount={getSportsCount}
                getDivisionsCount={getDivisionsCount}
              />
            )}

            {view === 'sports' && selectedOrganization && (
              <SportsView
                organization={selectedOrganization}
                onViewSportDetails={handleViewSportDetails}
                onAddSport={handleAddSport}
                onRemoveSport={handleRemoveSport}
                loading={loading}
              />
            )}

            {view === 'divisions' && selectedOrganization && selectedSport && (
              <DivisionsView
                sport={selectedSport}
                onAddDivision={handleAddDivision}
                onRemoveDivision={handleRemoveDivision}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Organization Form Component
const OrganizationForm = ({
  formData,
  setFormData,
  selectedSports,
  setSelectedSports,
  selectedAgeGroups,
  setSelectedAgeGroups,
  customSport,
  setCustomSport,
  useGrades,
  setUseGrades,
  sportOptions,
  gradeOptions,
  ageGroupOptions,
  handleSubmit,
  handleAddCustomSport,
  handleSportToggle,
  handleAgeGroupToggle,
  onCancel,
  editingOrganization,
  loading
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-[0.5rem]">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">
        {editingOrganization ? 'Edit Organization' : 'Create New Team'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">Basic Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Team name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City (Optional)</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter city"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter full address"
              />
            </div>
          </div>
        </div>

        {/* Sports Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-800">
              {useGrades ? 'Grade Levels' : 'Age Groups'} *
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Use Grades</span>
              <input
                type="checkbox"
                checked={useGrades}
                onChange={(e) => {
                  setUseGrades(e.target.checked);
                  setSelectedAgeGroups([]);
                }}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(useGrades ? gradeOptions : ageGroupOptions).map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleAgeGroupToggle(option.value)}
                className={`p-3 rounded-lg border-2 text-left transition-all flex items-center justify-between ${
                  selectedAgeGroups.includes(option.value)
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                {selectedAgeGroups.includes(option.value) && (
                  <Check size={16} className="text-green-600" />
                )}
              </button>
            ))}
          </div>
          {selectedAgeGroups.length > 0 && (
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm text-green-700">
                <strong>Selected {useGrades ? 'Grades' : 'Age Groups'}:</strong> {selectedAgeGroups.length} selected - {selectedAgeGroups.map(ag => 
                  useGrades 
                    ? gradeOptions.find(g => g.value === ag)?.label || ag
                    : ageGroupOptions.find(a => a.value === ag)?.label || ag
                ).join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Sports Selection - Optional */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">Sports Programs (Optional)</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Sports</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {sportOptions.map(sport => (
                <button
                  key={sport.value}
                  type="button"
                  className={`p-3 rounded-lg border-2 text-left transition-all flex items-center justify-between ${
                    selectedSports.includes(sport.value)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => handleSportToggle(sport.value)}
                >
                  <div className="font-medium">{sport.label}</div>
                  {selectedSports.includes(sport.value) && (
                    <Check size={16} className="text-blue-600" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Custom Sport Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customSport}
                onChange={(e) => setCustomSport(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSport())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add custom sport..."
              />
              <button
                type="button"
                onClick={handleAddCustomSport}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Sport
              </button>
            </div>
          </div>
        </div>

        {/* Selected Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">Summary</h4>
          <div className="text-sm text-gray-600">
            <p><strong>Organization:</strong> {formData.name || 'Not specified'}</p>
            <p><strong>City:</strong> {formData.city || 'Not specified'}</p>
            <p><strong>{useGrades ? 'Grades' : 'Age Groups'}:</strong> {selectedAgeGroups.length} selected</p>
            <p><strong>Sports:</strong> {selectedSports.length} selected</p>
            {selectedAgeGroups.length > 0 && (
              <p className="mt-2 text-green-600">
                This organization will offer {selectedSports.length > 0 ? selectedSports.join(', ') : 'General programs'} for {selectedAgeGroups.length} {useGrades ? 'grades' : 'age groups'}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
          >
            <Save size={16} />
            {loading ? 'Saving...' : (editingOrganization ? 'Update Organization' : 'Create Organization')}
          </button>
        </div>
      </form>
    </div>
  );
};

// Organization Details Component
// Organization Details Component
const OrganizationDetails = ({ organization, onEdit, onViewSports, getSportsCount, getDivisionsCount }) => {

  // Get unique age groups across all sports
const getUniqueAges = () => {
  if (!organization.sports) return [];

  const allAges = Object.values(organization.sports).flatMap(sport =>
    sport.divisions?.map(d => {
      const ag = d.ageGroup || d.age;
      // Extract only the numeric part + 'U' (remove parentheses)
      return ag?.split(' ')[0] || ag;
    })
  );

  return Array.from(new Set(allAges)).sort((a, b) => {
    // Sort numerically by number before 'U'
    const numA = parseInt(a);
    const numB = parseInt(b);
    return numA - numB;
  });
};

  const uniqueAges = getUniqueAges();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-[0.5rem]">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">{organization.name}</h3>
          <p className="text-gray-600 mt-1">{organization.city} • {organization.address}</p>
        </div>
<div className="flex flex-col xs:flex-row gap-2 w-full xs:w-auto max-w-[100px] xs:max-w-none">
  <button
    onClick={() => onEdit(organization)}
    className="px-3 py-2 xs:px-4 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2 flex-1 xs:flex-none text-sm xs:text-base"
  >
    <Edit size={16} />
    <span className="hidden xs:inline">Edit</span>
    <span className="xs:hidden">Edit Org</span>
  </button>
  <button
    onClick={onViewSports}
    className="px-3 py-2 xs:px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 flex-1 xs:flex-none text-sm xs:text-base"
  >
    <Trophy size={16} />
    <span className="hidden xs:inline">View Sports</span>
    <span className="xs:hidden">Sports</span>
  </button>
</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Sports Summary</h4>
          <div className="space-y-2">
            <p className="text-blue-700"><strong>Total Sports:</strong> {getSportsCount(organization.sports)}</p>
            <p className="text-blue-700"><strong>Age Groups per Sport:</strong> {getDivisionsCount(organization.sports)}</p>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-2">Team Details</h4>
          <div className="space-y-2">
            <p className="text-green-700"><strong>Status:</strong> <span className="capitalize">{organization.status}</span></p>
            <p className="text-green-700"><strong>City:</strong> {organization.city || 'Not specified'}</p>
            <p className="text-green-700"><strong>Address:</strong> {organization.address || 'Not specified'}</p>
          </div>
        </div>
      </div>

      {/* Unique Age Overview */}
      {uniqueAges.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Age Groups Overview</h4>
          <div className="flex flex-wrap gap-2">
            {uniqueAges.map(age => (
              <span
                key={age}
                className="px-2 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-purple-200 via-pink-200 to-red-200 text-gray-800"
              >
                {age}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Sports Overview */}
      {organization.sports && Object.keys(organization.sports).length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Sports Overview</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(organization.sports).map(([sportName, sportData]) => (
              <div key={sportName} className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-semibold text-gray-800 mb-2">{sportName}</h5>
                <p className="text-sm text-gray-600">{sportData.divisions?.length || 0} age groups</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


// Sports View Component
const SportsView = ({ organization, onViewSportDetails, onAddSport, onRemoveSport, loading }) => {
  const [newSportName, setNewSportName] = useState('');

  const handleAddSport = () => {
    if (newSportName.trim()) {
      onAddSport(newSportName.trim());
      setNewSportName('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800">Sports Programs</h3>
        <div className="text-sm text-gray-600">
          {Object.keys(organization.sports || {}).length} sports
        </div>
      </div>

      {/* Add Sport Form */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">Add New Sport</h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSportName}
            onChange={(e) => setNewSportName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSport())}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter sport name..."
            disabled={loading}
          />
          <button
            onClick={handleAddSport}
            disabled={loading || !newSportName.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Sport
          </button>
        </div>
      </div>

      {/* Sports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {organization.sports && Object.keys(organization.sports).length > 0 ? (
          Object.entries(organization.sports).map(([sportName, sportData]) => (
            <div key={sportName} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <h5 className="font-semibold text-gray-800 text-lg">{sportName}</h5>
                <button
                  onClick={() => onRemoveSport(sportName)}
                  className="p-1 text-red-600 hover:text-red-800 transition-colors"
                  title="Remove Sport"
                  disabled={loading}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                {sportData.divisions?.length || 0} age groups
              </p>
              
              <button
                onClick={() => onViewSportDetails({ name: sportName, ...sportData })}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Manage Age Groups
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            <Trophy size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No sports added yet</p>
            <p className="text-sm mt-1">Add a sport to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Divisions View Component
const DivisionsView = ({ sport, onAddDivision, onRemoveDivision, loading }) => {
  const [newDivision, setNewDivision] = useState({ age: '', ageGroup: '' });

  const handleAddDivision = () => {
    if (newDivision.age && newDivision.ageGroup) {
      onAddDivision({ ...newDivision });
      setNewDivision({ age: '', ageGroup: '' });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800">{sport.name} - Age Groups</h3>
        <div className="text-sm text-gray-600">
          {sport.divisions?.length || 0} age groups
        </div>
      </div>

      {/* Add Division Form */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">Add New Age Group</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            value={newDivision.age}
            onChange={(e) => setNewDivision({ ...newDivision, age: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Age (e.g., U8, 1st Grade)"
            disabled={loading}
          />
          <input
            type="text"
            value={newDivision.ageGroup}
            onChange={(e) => setNewDivision({ ...newDivision, ageGroup: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Age Group Description"
            disabled={loading}
          />
        </div>
        <button
          onClick={handleAddDivision}
          disabled={loading || !newDivision.age || !newDivision.ageGroup}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Age Group
        </button>
      </div>

      {/* Divisions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sport.divisions && sport.divisions.length > 0 ? (
          sport.divisions.map((division, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h5 className="font-semibold text-gray-800">{division.age}</h5>
                <button
                  onClick={() => onRemoveDivision(division.age)}
                  className="p-1 text-red-600 hover:text-red-800 transition-colors"
                  title="Remove Age Group"
                  disabled={loading}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-sm text-gray-600">{division.ageGroup}</p>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            <Users size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No age groups added yet</p>
            <p className="text-sm mt-1">Add age groups to organize players by age</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationManagement;