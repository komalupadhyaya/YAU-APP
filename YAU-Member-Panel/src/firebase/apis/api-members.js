import { API_CONFIG, buildApiUrl } from "../config";

// Helper function for API calls
const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.success !== false ? data.data || data : Promise.reject(new Error(data.error));
  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
};

const GRADE_BAND_MAP = {
  'Kindergarten': 'Band 1',
  '1st Grade': 'Band 1',
  '2nd Grade': 'Band 2',
  '3rd Grade': 'Band 2',
  '4th Grade': 'Band 3',
  '5th Grade': 'Band 3',
  '6th Grade': 'Band 4',
  '7th Grade': 'Band 4',
  '8th Grade': 'Band 4',
};

const getGradeBand = (grade) => GRADE_BAND_MAP[grade] || null;

// Get parents from registration collection
export const getMembers = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.members.getAll));
  } catch (error) {
    console.error("❌ Error in getMembers function:", error);
    throw error;
  }
};

// Get user by ID from appropriate collection
export const getMemberById = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.members.getById, { id }));
  } catch (error) {
    console.error("❌ Error getting user by ID:", error);
    throw error;
  }
};

// Get user by email from appropriate collection
export const getMemberByEmail = async (email) => {
  try {
    console.log('🔍 Looking for user by email via API:', email);
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.members.getByEmail, { email }));
  } catch (error) {
    console.error('❌ Error getting user by email:', error);
    throw error;
  }
};

// Update getCurrentUserData to use email
export const getCurrentUserData = async (userEmail) => {
  try {
    const userData = await getMemberByEmail(userEmail);
    if (!userData) {
      console.warn('⚠️ User data not found in collections for email:', userEmail);
      // Return minimal user data instead of throwing error
      return {
        email: userEmail,
        firstName: '',
        lastName: '',
        collection: 'firebase_only',
        isPaidMember: false,
        students: [],
        childrenCount: 0,
        membershipStatus: 'Free',
        createdAt: new Date()
      };
    }
    console.log("backendCurr-userData", userData);
    // Enhance user data with additional info for dashboard
    const enhancedUserData = {
      ...userData,
      childrenCount: userData.students ? userData.students.length : 0,
      membershipStatus: userData.isPaidMember ? 'Paid' : 'Free',
      // registrationSource: userData.collection === 'members' ? 'Web' : 'Mobile'
    };
    console.log("backendCurrent-enhancedUserData", enhancedUserData);

    return enhancedUserData;
  } catch (error) {
    console.error('❌ Error getting current user data:', error);
    // Return minimal user data instead of throwing error
    return {
      email: userEmail,
      firstName: '',
      lastName: '',
      collection: 'firebase_only',
      isPaidMember: false,
      students: [],
      childrenCount: 0,
      membershipStatus: 'Free',
      createdAt: new Date()
    };
  }
};

export const emailExist= async(email)=>{
  const url=process.env.REACT_APP_API_BASE_URL
    const responce= await fetch(`${url}/members/email/${email}`)
    const data= await responce.json()
    return data
}

// Add member function
export const addMember = async (parentData) => {
  try {
    console.log("➕ Adding member via API:", parentData);
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.members.create), {
      method: "POST",
      body: JSON.stringify(parentData),
    });
    console.log("✅ Member added successfully via API:", result);
    return result.id || result.memberId || result;
  } catch (error) {
    console.error("❌ Error adding member:", error);
    throw error;
  }
};

// Sync parents to newly created rosters (Triggered via API)
export const syncMembersToRosters = async () => {
  try {
    console.log('🔄 Triggering bulk roster sync via API...');
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.rosters.syncAll), {
      method: 'POST'
    });
  } catch (error) {
    console.error('❌ Error triggering bulk sync:', error);
    throw error;
  }
};

// Enhanced updateMember function
export const updateMember = async (id, updates) => {
  try {
    console.log("✏️ Updating member via API:", id, updates);
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.members.update, { id }), {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  } catch (error) {
    console.error("❌ Error updating member:", error);
    throw error;
  }
};

// Delete member via API - backend handles roster cleanup and related data
export const deleteMember = async (id) => {
  try {
    console.log('🗑️ Deleting member via API:', id);
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.members.delete, { id }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('❌ Error deleting member:', error);
    throw error;
  }
};

export const createFirebaseAuthUser = async (email, password) => {
  try {
    const { API_CONFIG } = await import('../config');
    console.log('👤 Calling Render backend for user creation...');

    const response = await fetch(`${API_CONFIG.baseURL}/auth/create-auth-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to create account on server');
    }

    return result.data.localId; // UID of created user
  } catch (error) {
    console.error('❌ Failed to create auth user via proxy:', error.message);
    throw error;
  }
};