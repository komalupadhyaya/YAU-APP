import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaEdit, FaSave, FaTimes, FaSpinner, FaCheck } from 'react-icons/fa';
import { MembershipService } from '../../firebase/apis/api-membership';

const AccountInfoEditor = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [accountInfo, setAccountInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });

  const [editedInfo, setEditedInfo] = useState({...accountInfo});

  // Load current user data
  useEffect(() => {
    if (user) {
      const currentInfo = {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || user.parentPhone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zipCode: user.zipCode || user.zip || ''
      };
      setAccountInfo(currentInfo);
      setEditedInfo(currentInfo);
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setEditedInfo(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear messages when user starts editing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    if (!editedInfo.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!editedInfo.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!editedInfo.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!editedInfo.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('💾 Updating account information...');
      
      // Prepare update data - only include changed fields
      const updateData = {};
      Object.keys(editedInfo).forEach(key => {
        if (editedInfo[key] !== accountInfo[key]) {
          updateData[key] = editedInfo[key];
        }
      });
      
      // Add phone mapping for backward compatibility
      if (updateData.phone) {
        updateData.parentPhone = updateData.phone;
      }
      
      // Add zip mapping for backward compatibility  
      if (updateData.zipCode) {
        updateData.zip = updateData.zipCode;
      }
      
      console.log('📝 Updating fields:', Object.keys(updateData));
      
      if (Object.keys(updateData).length === 0) {
        setSuccess('No changes to save');
        setIsEditing(false);
        return;
      }
      
      // Update via membership service
      const result = await MembershipService.updateMemberData(user.email, updateData);
      
      if (result.success) {
        // Update local auth context
        updateUser(updateData);
        
        // Update local state
        setAccountInfo({...editedInfo});
        setIsEditing(false);
        setSuccess('Account information updated successfully!');
        
        console.log('✅ Account information updated');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Update failed');
      }
      
    } catch (err) {
      console.error('❌ Error updating account information:', err);
      setError(err.message || 'Failed to update account information. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedInfo({...accountInfo});
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <FaSpinner className="animate-spin text-2xl text-blue-600 mx-auto mb-2" />
            <p className="text-gray-600">Loading account information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Account Information</h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaEdit className="text-sm" />
            <span>Edit Info</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                saving 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {saving ? (
                <>
                  <FaSpinner className="animate-spin text-sm" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FaSave className="text-sm" />
                  <span>Save</span>
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <FaTimes className="text-sm" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-green-700">
            <FaCheck className="text-sm" />
            <p className="text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Account Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FaUser className="inline mr-2" />
            First Name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedInfo.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter first name"
            />
          ) : (
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
              {accountInfo.firstName || 'Not provided'}
            </div>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FaUser className="inline mr-2" />
            Last Name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedInfo.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter last name"
            />
          ) : (
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
              {accountInfo.lastName || 'Not provided'}
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FaEnvelope className="inline mr-2" />
            Email Address
          </label>
          <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600">
            {accountInfo.email}
            <span className="text-xs ml-2 text-gray-500">(Cannot be changed)</span>
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FaPhone className="inline mr-2" />
            Phone Number
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={editedInfo.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter phone number"
            />
          ) : (
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
              {accountInfo.phone || 'Not provided'}
            </div>
          )}
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FaMapMarkerAlt className="inline mr-2" />
            Street Address
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedInfo.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter street address"
            />
          ) : (
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
              {accountInfo.address || 'Not provided'}
            </div>
          )}
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedInfo.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter city"
            />
          ) : (
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
              {accountInfo.city || 'Not provided'}
            </div>
          )}
        </div>

        {/* State */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedInfo.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter state"
            />
          ) : (
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
              {accountInfo.state || 'Not provided'}
            </div>
          )}
        </div>

        {/* Zip Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ZIP Code
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedInfo.zipCode}
              onChange={(e) => handleInputChange('zipCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter ZIP code"
            />
          ) : (
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
              {accountInfo.zipCode || 'Not provided'}
            </div>
          )}
        </div>
      </div>

      {/* Membership Info (Read-only) */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-md font-semibold text-gray-800 mb-4">Membership Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Membership Type
            </label>
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 font-medium">
              {user?.membershipType === 'monthly' ? '$50 Monthly Plan' : 
               user?.membershipType === 'one_time' ? '$200 One-Time Plan (includes uniform)' :
               user?.isPaidMember ? 'Paid Member' : 'Free Account'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Status
            </label>
            <div className={`px-3 py-2 border rounded-lg font-medium ${
              user?.isPaidMember 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-yellow-50 border-yellow-200 text-yellow-800'
            }`}>
              {user?.isPaidMember ? '✅ Active Membership' : '⏳ Pending Payment'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountInfoEditor;