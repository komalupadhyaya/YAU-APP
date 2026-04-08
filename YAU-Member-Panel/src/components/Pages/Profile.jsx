import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getCurrentUserData, updateMember } from "../../firebase/apis/api-members";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "../../firebase/config";
import { Eye, EyeOff, User, Users, Lock, Phone, MapPin, CreditCard, Edit3, Plus, Save, X, Loader2, CheckCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";
import AddStudentModal from "../Modal/AddStudentModal";

function Profile() {
  const { user } = useAuth();
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [addingChild, setAddingChild] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: '',
    color: 'bg-gray-200'
  });

  // Loading states for different operations
  const [loadingStates, setLoadingStates] = useState({
    personalUpdate: false,
    addChild: false,
    updateChild: false,
    removeChild: false,
    changePassword: false
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [personalForm, setPersonalForm] = useState({});
  const [childForm, setChildForm] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    ageGroup: ''
  });

  // Password strength checker
  const checkPasswordStrength = (password) => {
    let score = 0;
    let message = '';
    let color = 'bg-gray-200';

    if (!password) {
      return { score: 0, message: 'Please enter a password', color: 'bg-gray-200' };
    }

    // Length check
    if (password.length >= 8) score += 2;
    else if (password.length >= 6) score += 1;

    // Character type checks
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Determine strength
    if (score >= 5) {
      message = 'Strong';
      color = 'bg-green-500';
    } else if (score >= 3) {
      message = 'Medium';
      color = 'bg-yellow-500';
    } else {
      message = 'Weak';
      color = 'bg-red-500';
    }

    return { score, message, color };
  };

  // Handle password change with strength checking
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'newPassword') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userData = await getCurrentUserData(user.email);
        setCurrentUserData(userData);
        setPersonalForm({
          firstName: userData?.firstName || '',
          lastName: userData?.lastName || '',
          phone: userData?.phone || '',
          location: userData?.location || '',
          sport: userData?.sport || ''
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) {
      fetchUserData();
    }
  }, [user?.email]);

  // Helper function to set loading state
  const setLoadingState = (key, value) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  };

  // Personal Information Handlers
  const handlePersonalChange = (e) => {
    setPersonalForm({
      ...personalForm,
      [e.target.name]: e.target.value
    });
  };

  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    setLoadingState('personalUpdate', true);
    
    try {
      await updateMember(currentUserData.id, personalForm);
      
      setCurrentUserData({
        ...currentUserData,
        ...personalForm
      });
      
      setEditingPersonal(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoadingState('personalUpdate', false);
    }
  };

  const cancelPersonalEdit = () => {
    setPersonalForm({
      firstName: currentUserData?.firstName || '',
      lastName: currentUserData?.lastName || '',
      phone: currentUserData?.phone || '',
      location: currentUserData?.location || '',
      sport: currentUserData?.sport || ''
    });
    setEditingPersonal(false);
  };

  // Child Management Handlers
  const handleChildChange = (e) => {
    setChildForm({
      ...childForm,
      [e.target.name]: e.target.value
    });
  };

  const calculateAgeGroup = (dob) => {
    if (!dob) return '';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age <= 5) return 'U6';
    if (age <= 7) return 'U8';
    if (age <= 9) return 'U10';
    if (age <= 11) return 'U12';
    if (age <= 13) return 'U14';
    if (age <= 15) return 'U16';
    if (age <= 17) return 'U18';
    return 'Adult';
  };

  const handleAddChild = async (e) => {
    e.preventDefault();
    setLoadingState('addChild', true);
    
    try {
      const ageGroup = calculateAgeGroup(childForm.dob);
      const newChild = {
        ...childForm,
        ageGroup,
        uid: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const updatedStudents = [...(currentUserData?.students || []), newChild];
      
      await updateMember(currentUserData.id, { students: updatedStudents });
      
      setCurrentUserData({
        ...currentUserData,
        students: updatedStudents
      });
      
      setChildForm({ firstName: '', lastName: '', dob: '', ageGroup: '' });
      setAddingChild(false);
      toast.success('Child added successfully!');
    } catch (error) {
      console.error('Error adding child:', error);
      toast.error('Failed to add child');
    } finally {
      setLoadingState('addChild', false);
    }
  };

  const handleEditChild = (index, childData) => {
    setEditingChild(index);
    setChildForm({
      firstName: childData.firstName || '',
      lastName: childData.lastName || '',
      dob: childData.dob || '',
      ageGroup: childData.ageGroup || ''
    });
  };

  const handleUpdateChild = async (e) => {
    e.preventDefault();
    setLoadingState('updateChild', true);
    
    try {
      const ageGroup = calculateAgeGroup(childForm.dob);
      const updatedChild = { ...childForm, ageGroup };
      
      const updatedStudents = [...currentUserData.students];
      updatedStudents[editingChild] = {
        ...updatedStudents[editingChild],
        ...updatedChild
      };
      
      await updateMember(currentUserData.id, { students: updatedStudents });
      
      setCurrentUserData({
        ...currentUserData,
        students: updatedStudents
      });
      
      setEditingChild(null);
      setChildForm({ firstName: '', lastName: '', dob: '', ageGroup: '' });
      toast.success('Child updated successfully!');
    } catch (error) {
      console.error('Error updating child:', error);
      toast.error('Failed to update child');
    } finally {
      setLoadingState('updateChild', false);
    }
  };

  const handleRemoveChild = async (index) => {
    if (window.confirm('Are you sure you want to remove this child?')) {
      setLoadingState('removeChild', true);
      
      try {
        const updatedStudents = currentUserData.students.filter((_, i) => i !== index);
        
        await updateMember(currentUserData.id, { students: updatedStudents });
        
        setCurrentUserData({
          ...currentUserData,
          students: updatedStudents
        });
        
        toast.success('Child removed successfully!');
      } catch (error) {
        console.error('Error removing child:', error);
        toast.error('Failed to remove child');
      } finally {
        setLoadingState('removeChild', false);
      }
    }
  };

  const cancelChildEdit = () => {
    setEditingChild(null);
    setAddingChild(false);
    setChildForm({ firstName: '', lastName: '', dob: '', ageGroup: '' });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (passwordStrength.score < 3) {
      toast.error('Password is too weak. Please use a stronger password.');
      return;
    }

    setLoadingState('changePassword', true);

    try {
      const currentUser = auth.currentUser;
      
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordForm.currentPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      
      await updatePassword(currentUser, passwordForm.newPassword);
      
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStrength({ score: 0, message: '', color: 'bg-gray-200' });
      toast.success('Password updated successfully!');
    } catch (error) {
      console.error('Password change error:', error);
      if (error.code === 'auth/wrong-password') {
        toast.error('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password is too weak');
      } else {
        toast.error('Failed to update password. Please try again.');
      }
    } finally {
      setLoadingState('changePassword', false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  const getAgeFromDob = (dob) => {
    if (!dob) return '';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const userData = currentUserData || user;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Profile</h1>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('personal')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'personal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="inline-block w-4 h-4 mr-2" />
              Personal Info
            </button>
            <button
              onClick={() => setActiveTab('children')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'children'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="inline-block w-4 h-4 mr-2" />
              Children ({userData?.students?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Lock className="inline-block w-4 h-4 mr-2" />
              Security
            </button>
          </nav>
        </div>
      </div>

      {/* Personal Information Tab */}
      {activeTab === 'personal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Personal Information
              </h2>
              {!editingPersonal && (
                <button
                  onClick={() => setEditingPersonal(true)}
                  className="flex items-center px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  disabled={loadingStates.personalUpdate}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </button>
              )}
            </div>

            <form onSubmit={handlePersonalSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={personalForm.firstName}
                    onChange={handlePersonalChange}
                    className={`w-full p-3 border border-gray-300 rounded-lg ${
                      editingPersonal ? 'bg-white' : 'bg-gray-50'
                    }`}
                    readOnly={!editingPersonal}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={personalForm.lastName}
                    onChange={handlePersonalChange}
                    className={`w-full p-3 border border-gray-300 rounded-lg ${
                      editingPersonal ? 'bg-white' : 'bg-gray-50'
                    }`}
                    readOnly={!editingPersonal}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={userData?.email || ''}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                  />
                  <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 text-gray-400 mr-3" />
                    <input
                      type="text"
                      name="phone"
                      value={personalForm.phone}
                      onChange={handlePersonalChange}
                      className={`w-full p-3 border border-gray-300 rounded-lg ${
                        editingPersonal ? 'bg-white' : 'bg-gray-50'
                      }`}
                      readOnly={!editingPersonal}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sport</label>
                  <select
                    name="sport"
                    value={personalForm.sport}
                    onChange={handlePersonalChange}
                    className={`w-full p-3 border border-gray-300 rounded-lg ${
                      editingPersonal ? 'bg-white' : 'bg-gray-50'
                    }`}
                    disabled={!editingPersonal}
                  >
                    <option value="">Select Sport</option>
                    <option value="Football">Football</option>
                    <option value="Flag Football">Flag Football</option>
                    <option value="Basketball">Basketball</option>
                    <option value="Soccer">Soccer</option>
                    <option value="Baseball">Baseball</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                    <input
                      type="text"
                      name="location"
                      value={personalForm.location}
                      onChange={handlePersonalChange}
                      className={`w-full p-3 border border-gray-300 rounded-lg ${
                        editingPersonal ? 'bg-white' : 'bg-gray-50'
                      }`}
                      readOnly={!editingPersonal}
                      placeholder="City, State"
                    />
                  </div>
                </div>
              </div>

              {editingPersonal && (
                <div className="flex space-x-4 mt-6">
                  <button
                    type="submit"
                    disabled={loadingStates.personalUpdate}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingStates.personalUpdate ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {loadingStates.personalUpdate ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelPersonalEdit}
                    disabled={loadingStates.personalUpdate}
                    className="flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-green-600" />
              Membership Status
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-600">Status</span>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ml-2`}>
                  {/* {userData?.membershipStatus || (userData?.isPaidMember ? 'Paid Member' : 'Free Member')} */}

                   {userData.isPaidMember ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <CheckCircle size={12} />
                            Paid 
                          </span>
                        ) : userData?.paymentStatus === 'Active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <CheckCircle size={12} />
                            Active 
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                            <Clock size={12} />
                            Pending 
                          </span>
                        )}
                </div>
              </div>

              {userData?.membershipType && (
                <div>
                  <span className="text-sm text-gray-600">Plan</span>
                  <p className="font-medium capitalize">{userData.membershipType}</p>
                </div>
              )}

              {userData?.lastPaymentDate && (
                <div>
                  <span className="text-sm text-gray-600">Last Payment</span>
                  <p className="font-medium">{formatDate(userData.lastPaymentDate)}</p>
                </div>
              )}

              <div>
                <span className="text-sm text-gray-600">Member Since</span>
                <p className="font-medium">{formatDate(userData?.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'children' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              Children Information ({userData?.students?.length || 0})
            </h2>
            {!addingChild && (
              <button
                onClick={() => setAddingChild(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Child
              </button>
            )}
          </div>

          {/* {addingChild && (
            <div className="mb-8 p-6 border border-gray-200 rounded-xl bg-gray-50">
              <h3 className="text-lg font-semibold mb-4">Add New Child</h3>
              <form onSubmit={handleAddChild}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={childForm.firstName}
                      onChange={handleChildChange}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={childForm.lastName}
                      onChange={handleChildChange}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      name="dob"
                      value={childForm.dob}
                      onChange={handleChildChange}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Age Group</label>
                    <input
                      type="text"
                      value={calculateAgeGroup(childForm.dob)}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                      readOnly
                      placeholder="Auto-calculated"
                    />
                  </div>
                </div>
                <div className="flex space-x-4 mt-4">
                  <button
                    type="submit"
                    disabled={loadingStates.addChild}
                    className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingStates.addChild ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {loadingStates.addChild ? 'Adding...' : 'Add Child'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelChildEdit}
                    disabled={loadingStates.addChild}
                    className="flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )} */}

          <AddStudentModal
            isOpen={addingChild}
            onClose={() => setAddingChild(false)}
            onStudentAdded={(newStudent) => {
              // Refresh the students list
              const fetchUserData = async () => {
                const userData = await getCurrentUserData(user.email);
                setCurrentUserData(userData);
              };
              fetchUserData();
            }}
          />

          {userData?.students && userData.students.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userData.students.map((student, index) => (
                <div key={student.uid || index} className="border border-gray-200 rounded-xl p-4">
                  {editingChild === index ? (
                    <form onSubmit={handleUpdateChild}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                          <input
                            type="text"
                            name="firstName"
                            value={childForm.firstName}
                            onChange={handleChildChange}
                            className="w-full p-2 border border-gray-300 rounded"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                          <input
                            type="text"
                            name="lastName"
                            value={childForm.lastName}
                            onChange={handleChildChange}
                            className="w-full p-2 border border-gray-300 rounded"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                          <input
                            type="date"
                            name="dob"
                            value={childForm.dob}
                            onChange={handleChildChange}
                            className="w-full p-2 border border-gray-300 rounded"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Age Group</label>
                          <input
                            type="text"
                            value={calculateAgeGroup(childForm.dob)}
                            className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                            readOnly
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="submit"
                            disabled={loadingStates.updateChild}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                          >
                            {loadingStates.updateChild ? (
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : (
                              'Save'
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={cancelChildEdit}
                            disabled={loadingStates.updateChild}
                            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <>
                      {student.headshotUrl && (
                        <div className="flex justify-center mb-4">
                          <img
                            src={student.headshotUrl}
                            alt={`${student.firstName} ${student.lastName}`}
                            className="w-20 h-20 rounded-full object-cover border-4 border-blue-100"
                          />
                        </div>
                      )}

                      <div className="text-center mb-4">
                        <h3 className="font-semibold text-lg">
                          {student.firstName} {student.lastName}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {student.grade ? `Grade: ${student.grade}` : `Age: ${getAgeFromDob(student.dob)} • ${student.ageGroup || "N/A"}`}
                        </p>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date of Birth:</span>
                          <span className="font-medium">{student.dob}</span>
                        </div>

                        {student.idStatus && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">League ID:</span>
                            <span className={`font-medium capitalize px-2 py-1 rounded text-xs ${
                              student.idStatus === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : student.idStatus === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {student.idStatus}
                            </span>
                          </div>
                        )}

                        {student.expirationDate && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">ID Expires:</span>
                            <span className="font-medium">{student.expirationDate}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex space-x-2">
                        <button
                          onClick={() => handleEditChild(index, student)}
                          className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveChild(index)}
                          disabled={loadingStates.removeChild}
                          className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm disabled:opacity-50"
                        >
                          {loadingStates.removeChild ? (
                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                          ) : (
                            'Remove'
                          )}
                        </button>
                        {student.generatedIdUrl && (
                          <button className="flex-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm">
                            View ID
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No children added yet</h3>
              <p className="text-gray-600 mb-4">Add your first child to get started with league registration.</p>
              <button
                onClick={() => setAddingChild(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Child
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'security' && (
        <div className="max-w-2xl bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-blue-600" />
            Change Password
          </h2>

          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full p-3 border border-gray-300 rounded-lg pr-12"
                  placeholder="Enter your current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full p-3 border border-gray-300 rounded-lg pr-12"
                  placeholder="Enter your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {passwordForm.newPassword && (
                <div className="mt-2">
                  <div className="h-1 w-full bg-gray-200 rounded">
                    <div className={`h-full rounded ${passwordStrength.color}`} style={{ width: `${(passwordStrength.score / 6) * 100}%` }}></div>
                  </div>
                  <p className={`text-sm mt-1 ${passwordStrength.score >= 5 ? 'text-green-600' : passwordStrength.score >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                    Password Strength: {passwordStrength.message}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Confirm your new password"
                required
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Password Requirements:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li className={passwordForm.newPassword.length >= 8 ? 'text-green-600' : ''}>
                  • At least 8 characters long {passwordForm.newPassword.length >= 8 && '✓'}
                </li>
                <li className={/[A-Z]/.test(passwordForm.newPassword) ? 'text-green-600' : ''}>
                  • Contains uppercase letter {/[A-Z]/.test(passwordForm.newPassword) && '✓'}
                </li>
                <li className={/[a-z]/.test(passwordForm.newPassword) ? 'text-green-600' : ''}>
                  • Contains lowercase letter {/[a-z]/.test(passwordForm.newPassword) && '✓'}
                </li>
                <li className={/[0-9]/.test(passwordForm.newPassword) ? 'text-green-600' : ''}>
                  • Contains number {/[0-9]/.test(passwordForm.newPassword) && '✓'}
                </li>
                <li className={/[^A-Za-z0-9]/.test(passwordForm.newPassword) ? 'text-green-600' : ''}>
                  • Contains special character {/[^A-Za-z0-9]/.test(passwordForm.newPassword) && '✓'}
                </li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loadingStates.changePassword || passwordStrength.score < 3}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loadingStates.changePassword ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                {loadingStates.changePassword ? 'Updating...' : 'Update Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordStrength({ score: 0, message: '', color: 'bg-gray-200' });
                }}
                disabled={loadingStates.changePassword}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Profile;