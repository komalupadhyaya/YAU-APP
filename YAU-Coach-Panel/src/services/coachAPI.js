// coach/services/coachAPI.js
import { API_CONFIG, buildApiUrl } from '../firebase/config';

// Helper function to get coachId from localStorage
const getCoachId = () => {
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.uid) {
      throw new Error('No coach ID found in localStorage. Please log in again.');
    }
    return currentUser.id;
  } catch (error) {
    console.error('Error getting coach ID from localStorage:', error);
    throw new Error('Authentication required. Please log in again.');
  }
};

// Helper function for API calls
const coachApiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Coach API call failed:', error);
    throw error;
  }
};

// Get coach dashboard data
export const getCoachDashboard = async (coachId) => {
  try {
    const url = buildApiUrl(`/coaches/${coachId}/dashboard`);
    return await coachApiCall(url);
  } catch (error) {
    console.error('Error fetching coach dashboard:', error);
    throw error;
  }
};

// Get coach's assigned teams
export const getCoachTeams = async (coachId) => {
  try {
    const url = buildApiUrl(API_CONFIG.endpoints.coaches.getAssignments, { id: coachId });
    return await coachApiCall(url);
  } catch (error) {
    console.error('Error fetching coach teams:', error);
    throw error;
  }
};

// Send bulk message to team parents
export const sendBulkTeamMessage = async (messageData) => {
  try {
    const url = buildApiUrl(API_CONFIG.endpoints.parents.sendBulkEmail);
    return await coachApiCall(url, {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
  } catch (error) {
    console.error('Error sending team message:', error);
    throw error;
  }
};

// Create practice event
export const createPractice = async (practiceData) => {
  try {
    const url = buildApiUrl(API_CONFIG.endpoints.events.create);
    return await coachApiCall(url, {
      method: 'POST',
      body: JSON.stringify({
        ...practiceData,
        type: 'practice'
      })
    });
  } catch (error) {
    console.error('Error creating practice:', error);
    throw error;
  }
};

// Report game score
export const reportScore = async (gameData) => {
  try {
    const url = buildApiUrl(API_CONFIG.endpoints.gameSchedules.update, { id: gameData.gameId });
    return await coachApiCall(url, {
      method: 'PUT',
      body: JSON.stringify({
        homeScore: gameData.homeScore,
        awayScore: gameData.awayScore,
        status: 'completed',
        reportedAt: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Error reporting game score:', error);
    throw error;
  }
};

// ----------------- TIMESHEET -----------------

// Fetch all timesheet entries for a coach
export const getTimesheetEntries = async () => {
  try {
    const coachId = getCoachId();
    const url = buildApiUrl(`/timesheets/coach/${coachId}`);
    return await coachApiCall(url);
  } catch (error) {
    console.error('Error fetching timesheet entries:', error);
    throw error;
  }
};

// Create a new timesheet entry
export const createTimesheetEntry = async (entryData) => {
  try {
    const coachId = getCoachId();
    const url = buildApiUrl(`/timesheets/${coachId}`);
    return await coachApiCall(url, {
      method: 'POST',
      body: JSON.stringify({
        ...entryData,
        coachId: coachId // Still include in body for backend validation
      })
    });
  } catch (error) {
    console.error('Error creating timesheet entry:', error);
    throw error;
  }
};

// Update an existing timesheet entry
export const updateTimesheetEntry = async (entryId, updatedData) => {
  try {
    const coachId = getCoachId();
    const url = buildApiUrl(`/timesheets/${coachId}/entry/${entryId}`);
    return await coachApiCall(url, {
      method: 'PUT',
      body: JSON.stringify(updatedData)
    });
  } catch (error) {
    console.error('Error updating timesheet entry:', error);
    throw error;
  }
};

// Delete a timesheet entry
export const deleteTimesheetEntry = async (entryId) => {
  try {
    const coachId = getCoachId();
    const url = buildApiUrl(`/timesheets/${coachId}/entry/${entryId}`);
    return await coachApiCall(url, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting timesheet entry:', error);
    throw error;
  }
};

// Submit timesheet for review
export const submitTimesheetEntry = async (entryId) => {
  try {
    const coachId = getCoachId();
    const url = buildApiUrl(`/timesheets/${coachId}/entry/${entryId}/submit`);
    return await coachApiCall(url, {
      method: 'POST'
    });
  } catch (error) {
    console.error('Error submitting timesheet entry:', error);
    throw error;
  }
};

// Get coach statistics
export const getCoachStats = async () => {
  try {
    const coachId = getCoachId();
    const url = buildApiUrl(`/timesheets/coach/${coachId}/stats`);
    return await coachApiCall(url);
  } catch (error) {
    console.error('Error fetching coach stats:', error);
    throw error;
  }
};

// ----------------- ADMIN TIMESHEET -----------------

// Admin: Get all timesheets with filters
export const getAllTimesheets = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add filter parameters
    if (filters.coachId) queryParams.append('coachId', filters.coachId);
    if (filters.location) queryParams.append('location', filters.location);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);
    
    const url = buildApiUrl(`/admin/timesheets?${queryParams.toString()}`);
    return await coachApiCall(url);
  } catch (error) {
    console.error('Error fetching all timesheets:', error);
    throw error;
  }
};

// Admin: Get specific coach timesheets
export const getAdminCoachTimesheets = async (coachId, filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.status) queryParams.append('status', filters.status);
    
    const url = buildApiUrl(`/admin/timesheets/coach/${coachId}?${queryParams.toString()}`);
    return await coachApiCall(url);
  } catch (error) {
    console.error('Error fetching admin coach timesheets:', error);
    throw error;
  }
};

// Admin: Get timesheet statistics
export const getTimesheetStats = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    
    const url = buildApiUrl(`/admin/timesheets/stats?${queryParams.toString()}`);
    return await coachApiCall(url);
  } catch (error) {
    console.error('Error fetching timesheet stats:', error);
    throw error;
  }
};

// Admin: Approve timesheet
export const approveTimesheet = async (entryId, notes = '') => {
  try {
    const url = buildApiUrl(`/admin/timesheets/${entryId}/approve`);
    return await coachApiCall(url, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  } catch (error) {
    console.error('Error approving timesheet:', error);
    throw error;
  }
};

// Admin: Reject timesheet
export const rejectTimesheet = async (entryId, reason = '') => {
  try {
    const url = buildApiUrl(`/admin/timesheets/${entryId}/reject`);
    return await coachApiCall(url, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  } catch (error) {
    console.error('Error rejecting timesheet:', error);
    throw error;
  }
};

// Admin: Export timesheets
export const exportTimesheets = async (filters = {}, format = 'json') => {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    queryParams.append('format', format);
    
    const url = buildApiUrl(`/admin/timesheets/export?${queryParams.toString()}`);
    
    if (format === 'csv') {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    }
    
    return await coachApiCall(url);
  } catch (error) {
    console.error('Error exporting timesheets:', error);
    throw error;
  }
};