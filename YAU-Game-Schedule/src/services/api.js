// src/services/api.js
const API_BASE_URL = 'https://us-central1-yau-app.cloudfunctions.net/apis';

export const api = {
  // Get all organizations
  getOrganizations: async () => {
    const response = await fetch(`${API_BASE_URL}/organization`);
    return response.json();
  },

  // Get all schedules
  getSchedules: async () => {
    const response = await fetch(`${API_BASE_URL}/external_schedules`);
    return response.json();
  }
};