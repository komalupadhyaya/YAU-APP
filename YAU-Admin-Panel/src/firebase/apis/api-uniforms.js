import { API_CONFIG, buildApiUrl } from '../config';

class UniformAPI {
  static async getAllUniforms(options = {}) {
    try {
      console.log('📋 Fetching all uniforms with options:', options);
      
      const queryParams = new URLSearchParams();
      
      // Map frontend filter names to backend expected names
      const filterMapping = {
        search: 'q', // if search is passed, use it for search endpoint instead
        status: 'received' // Map status filter to received boolean
      };
      
      Object.entries(options).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          // Handle status mapping
          if (key === 'status') {
            if (value === 'received') {
              queryParams.append('received', 'true');
            } else if (value === 'not_received') {
              queryParams.append('received', 'false');
            }
          } else if (key !== 'search') { // Skip search for main uniforms endpoint
            queryParams.append(key, value.toString());
          }
        }
      });

      const url = `${buildApiUrl(API_CONFIG.endpoints.uniforms.getAll)}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || `HTTP ${response.status}: Failed to fetch uniforms`);
      }

      console.log('✅ Uniforms fetched successfully:', result.data?.uniforms?.length || 0);
      return result.data || { uniforms: [] };
    } catch (error) {
      console.error('❌ Error fetching uniforms:', error);
      throw error;
    }
  }

  static async getUniformsSummary() {
    try {
      console.log('📊 Fetching uniforms summary statistics');
      
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.uniforms.summary), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to fetch uniforms summary`);
      }

      console.log('✅ Uniforms summary fetched successfully');
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching uniforms summary:', error);
      throw error;
    }
  }

  static async searchUniforms(searchQuery, filters = {}) {
    try {
      console.log('🔍 Searching uniforms with query:', searchQuery, 'filters:', filters);
      
      const queryParams = new URLSearchParams();
      
      if (searchQuery) {
        queryParams.append('q', searchQuery);
      }
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const url = `${buildApiUrl(API_CONFIG.endpoints.uniforms.search)}?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to search uniforms`);
      }

      console.log('✅ Uniform search completed successfully');
      return result.data;
    } catch (error) {
      console.error('❌ Error searching uniforms:', error);
      throw error;
    }
  }

  static async updateReceivedStatus(uniformId, received = true, adminUser = null) {
    try {
      console.log(`📦 Updating uniform ${uniformId} received status to:`, received);
      
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.uniforms.updateReceived, { orderId: uniformId }), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          received,
          adminId: adminUser?.uid || 'web-admin',
          adminName: adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Admin User'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || `HTTP ${response.status}: Failed to update received status`);
      }

      console.log('✅ Uniform received status updated successfully');
      return result;
    } catch (error) {
      console.error('❌ Error updating uniform received status:', error);
      throw error;
    }
  }


  static async batchDeleteOrders(orderIds) {
  try {
    console.log('🗑️ Deleting uniform orders in batch:', orderIds);
    
    const response = await fetch(buildApiUrl(API_CONFIG.endpoints.uniforms.batchDelete), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        orderIds: orderIds
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || `HTTP ${response.status}: Failed to delete orders`);
    }

    console.log('✅ Uniform orders deleted successfully');
    return result;
  } catch (error) {
    console.error('❌ Error deleting uniform orders:', error);
    throw error;
  }
}

  static async exportToCsv(filters = {}) {
    try {
      console.log('📥 Exporting uniforms to CSV with filters:', filters);
      
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const url = `${buildApiUrl(API_CONFIG.endpoints.uniforms.exportCsv)}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `HTTP ${response.status}: Failed to export uniforms`);
      }

      const blob = await response.blob();
      console.log('✅ Uniforms exported to CSV successfully');
      return blob;
    } catch (error) {
      console.error('❌ Error exporting uniforms to CSV:', error);
      throw error;
    }
  }

  static async getUniformsByParent(parentId) {
    try {
      console.log('👪 Fetching uniforms for parent:', parentId);
      
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.uniforms.getByParent, { parentId: parentId }), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || `HTTP ${response.status}: Failed to fetch parent's uniforms`);
      }

      console.log('✅ Parent uniforms fetched successfully');
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching parent uniforms:', error);
      throw error;
    }
  }

  static async getUniformsByStudent(studentId) {
    try {
      console.log('👦 Fetching uniforms for student:', studentId);
      
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.uniforms.getByStudent, { studentId: studentId }), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || `HTTP ${response.status}: Failed to fetch student's uniforms`);
      }

      console.log('✅ Student uniforms fetched successfully');
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching student uniforms:', error);
      throw error;
    }
  }

  static async downloadCSV(filters = {}, filename = 'uniforms-export') {
    try {
      const blob = await this.exportToCsv(filters);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ CSV download initiated');
    } catch (error) {
      console.error('❌ Error downloading CSV:', error);
      throw error;
    }
  }
}

export const {
  getAllUniforms,
  getUniformsSummary,
  searchUniforms,
  updateReceivedStatus,
  exportToCsv,
  getUniformsByParent,
  getUniformsByStudent,
  downloadCSV
} = UniformAPI;

export default UniformAPI;