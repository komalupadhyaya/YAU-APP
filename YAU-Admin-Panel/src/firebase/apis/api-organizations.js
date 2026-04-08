import { buildApiUrl, API_CONFIG } from '../config';

// Organization API Service
export const organizationAPI = {
  // ==================== ORGANIZATION CRUD ====================
  
  // Get all organization
  async getAllOrganizations(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.city) queryParams.append('city', filters.city);
      
      const url = `${buildApiUrl(API_CONFIG.endpoints.organization.getAll)}?${queryParams}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data || [];
      } else {
        throw new Error(data.error || 'Failed to fetch organization');
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      throw error;
    }
  },

  // Get organization by ID
  async getOrganizationById(id) {
    try {
      const endpoint = buildApiUrl(API_CONFIG.endpoints.organization.getById, { id });
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Organization not found');
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      throw error;
    }
  },

  // Create new organization
  async createOrganization(organizationData) {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.organization.create), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(organizationData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to create organization');
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  },

  // Update organization
  async updateOrganization(id, organizationData) {
    try {
      console.log("API_CONFIG.endpoints.organization.update",API_CONFIG.endpoints.organization.update)
      const endpoint = buildApiUrl(API_CONFIG.endpoints.organization.update, { id });
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(organizationData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to update organization');
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      throw error;
    }
  },

  // Delete organization
  async deleteOrganization(id) {
    try {
      const endpoint = buildApiUrl(API_CONFIG.endpoints.organization.delete, { id });
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data;
      } else {
        throw new Error(data.error || 'Failed to delete organization');
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      throw error;
    }
  },

    // Create new match
  async createMatch(matchData) {
    try {
      
      const endpoint = buildApiUrl(API_CONFIG.endpoints.organization.externalSchedule);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data;
      } else {
        throw new Error(data.error || 'Failed to create match');
      }
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  },
 // ==================== MATCHS MANAGEMENT ====================
    // Get all matches
    async getAllMatches() {
      try {
        const endpoint = buildApiUrl(API_CONFIG.endpoints.organization.externalSchedule);
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("printing data test",data)
        if (data.success) {
          return data;
        } else {
          throw new Error(data.error || 'Failed to load matches');
        }
      } catch (error) {
        console.error('Error loading matches:', error);
        throw error;
      }
    },

    // Update match function
    async updateMatch(matchId, updateData) {
      try {
        const endpoint = buildApiUrl(`${API_CONFIG.endpoints.organization.externalSchedule}/${matchId}`);
        const response = await fetch(endpoint, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("printing update match response", data);
        
        if (data.success) {
          return data;
        } else {
          throw new Error(data.error || 'Failed to update match');
        }
      } catch (error) {
        console.error('Error updating match:', error);
        throw error;
      }
    },

    // Delete match function
    async deleteMatch(matchId) {
      try {
        const endpoint = buildApiUrl(`${API_CONFIG.endpoints.organization.externalSchedule}/${matchId}`);
        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("printing delete match response", data);
        
        if (data.success) {
          return data;
        } else {
          throw new Error(data.error || 'Failed to delete match');
        }
      } catch (error) {
        console.error('Error deleting match:', error);
        throw error;
      }
    },

    // Delete multiple matches by IDs
    async deleteMultipleMatches(matchIds) {
      try {
        console.log('Deleting matches with IDs:', matchIds);
        
        
        const endpoint = buildApiUrl(`${API_CONFIG.endpoints.organization.deleteMultipleMatches}`);
        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: matchIds })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        
        console.log('Bulk delete response:', data);
        return data;
      } catch (error) {
        console.error('Error in deleteMultipleMatches:', error);
        throw new Error(`Failed to delete matches: ${error.message}`);
      }
    },

  // ==================== SPORTS MANAGEMENT ====================

  // Add sport to organization
  async addSport(organizationId, sportName, divisions = []) {
    try {
      const endpoint = buildApiUrl(API_CONFIG.endpoints.organization.addSport, { id: organizationId });
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sportName, divisions }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to add sport');
      }
    } catch (error) {
      console.error('Error adding sport:', error);
      throw error;
    }
  },

  // Update sport in organization
  async updateSport(organizationId, sportName, divisions) {
    try {
      const endpoint = buildApiUrl(API_CONFIG.endpoints.organization.updateSport, { 
        id: organizationId, 
        sportName 
      });
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ divisions }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to update sport');
      }
    } catch (error) {
      console.error('Error updating sport:', error);
      throw error;
    }
  },

  // Remove sport from organization
  async removeSport(organizationId, sportName) {
    try {
      const endpoint = buildApiUrl(API_CONFIG.endpoints.organization.removeSport, { 
        id: organizationId, 
        sportName 
      });
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to remove sport');
      }
    } catch (error) {
      console.error('Error removing sport:', error);
      throw error;
    }
  },

  // ==================== DIVISION MANAGEMENT ====================

  // Add division to a sport
  async addDivision(organizationId, sportName, division) {
    try {
      const endpoint = buildApiUrl(API_CONFIG.endpoints.organization.addDivision, { 
        id: organizationId, 
        sportName 
      });
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ division }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to add division');
      }
    } catch (error) {
      console.error('Error adding division:', error);
      throw error;
    }
  },

  // Remove division from a sport
  async removeDivision(organizationId, sportName, division) {
    try {
      const endpoint = buildApiUrl(API_CONFIG.endpoints.organization.removeDivision, { 
        id: organizationId, 
        sportName, 
        division 
      });
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to remove division');
      }
    } catch (error) {
      console.error('Error removing division:', error);
      throw error;
    }
  },

  // ==================== AGE GROUPS MANAGEMENT ====================

  // Get all age groups
  async getAllAgeGroups() {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.organization.getAllAgeGroups), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data || [];
      } else {
        throw new Error(data.error || 'Failed to fetch age groups');
      }
    } catch (error) {
      console.error('Error fetching age groups:', error);
      throw error;
    }
  },

  // Create age group
  async createAgeGroup(ageGroupData) {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.organization.createAgeGroup), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ageGroupData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to create age group');
      }
    } catch (error) {
      console.error('Error creating age group:', error);
      throw error;
    }
  },

  // Update age group
  async updateAgeGroup(age, updates) {
    try {
      const endpoint = buildApiUrl(API_CONFIG.endpoints.organization.updateAgeGroup, { age });
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to update age group');
      }
    } catch (error) {
      console.error('Error updating age group:', error);
      throw error;
    }
  },

  // Delete age group
  async deleteAgeGroup(age) {
    try {
      const endpoint = buildApiUrl(API_CONFIG.endpoints.organization.deleteAgeGroup, { age });
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data;
      } else {
        throw new Error(data.error || 'Failed to delete age group');
      }
    } catch (error) {
      console.error('Error deleting age group:', error);
      throw error;
    }
  }
};

// Export individual functions for convenience
export const {
  getAllOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  addSport,
  updateSport,
  removeSport,
  addDivision,
  removeDivision,
  getAllAgeGroups,
  createAgeGroup,
  updateAgeGroup,
  deleteAgeGroup,
  createMatch,
  getAllMatches,
  updateMatch,
  deleteMatch,
  deleteMultipleMatches
} = organizationAPI;