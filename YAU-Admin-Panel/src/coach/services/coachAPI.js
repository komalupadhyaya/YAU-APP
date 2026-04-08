// coach/services/coachAPI.js
import { API_CONFIG, buildApiUrl } from '../../firebase/config';

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