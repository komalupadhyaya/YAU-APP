// firebase/apis/api-admins.js
import { API_CONFIG, buildApiUrl } from '../config';

class AdminAPI {
  // Create new admin
  static async createAdmin(adminData) {
    try {
      console.log('🚀 Creating new admin:', adminData.email);
      
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.admin.create), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to create admin`);
      }

      console.log('✅ Admin created successfully:', result.data);
      return result.data;
    } catch (error) {
      console.error('❌ Error creating admin:', error);
      throw error;
    }
  }

  // Get all admins
  static async getAdmins(options = {}) {
    try {
      console.log('📋 Fetching admins with options:', options);
      
      const queryParams = new URLSearchParams();
      
      // Add query parameters
      Object.entries(options).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const url = `${buildApiUrl(API_CONFIG.endpoints.admin.getAll)}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to fetch admins`);
      }

      console.log('✅ Admins fetched successfully:', result.data.admins.length);
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching admins:', error);
      throw error;
    }
  }

  // Get admin by ID
  static async getAdminById(adminId) {
    try {
      console.log('🔍 Fetching admin by ID:', adminId);
      
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.admin.getById, { id: adminId }), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to fetch admin`);
      }

      console.log('✅ Admin fetched successfully');
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching admin:', error);
      throw error;
    }
  }

  // Update admin
  static async updateAdmin(adminId, updateData) {
    try {
      console.log('📝 Updating admin:', adminId);
      
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.admin.update, { id: adminId }), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to update admin`);
      }

      console.log('✅ Admin updated successfully');
      return result.data;
    } catch (error) {
      console.error('❌ Error updating admin:', error);
      throw error;
    }
  }

  // Update admin password
  static async updateAdminPassword(adminId, newPassword) {
    try {
      console.log('🔐 Updating admin password:', adminId);
      
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.admin.updatePassword, { id: adminId }), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to update password`);
      }

      console.log('✅ Admin password updated successfully');
      return result;
    } catch (error) {
      console.error('❌ Error updating admin password:', error);
      throw error;
    }
  }

  // Deactivate admin
  static async deactivateAdmin(adminId) {
    try {
      console.log('🚫 Deactivating admin:', adminId);
      
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.admin.deactivate, { id: adminId }), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to deactivate admin`);
      }

      console.log('✅ Admin deactivated successfully');
      return result;
    } catch (error) {
      console.error('❌ Error deactivating admin:', error);
      throw error;
    }
  }

  // Delete admin permanently
  static async deleteAdmin(adminId) {
    try {
      console.log('🗑️ Deleting admin permanently:', adminId);
      
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.admin.delete, { id: adminId }), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to delete admin`);
      }

      console.log('✅ Admin deleted successfully');
      return result;
    } catch (error) {
      console.error('❌ Error deleting admin:', error);
      throw error;
    }
  }

  // Admin login
  static async loginAdmin(email, password) {
    try {
      console.log('🔑 Admin login attempt:', email);
      
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.admin.login), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Login failed`);
      }

      console.log('✅ Admin login successful');
      return result.data;
    } catch (error) {
      console.error('❌ Admin login failed:', error);
      throw error;
    }
  }

  // Get admin statistics
  static async getAdminStats() {
    try {
      console.log('📊 Fetching admin statistics');
      
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.admin.getStats), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to fetch admin stats`);
      }

      console.log('✅ Admin stats fetched successfully');
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching admin stats:', error);
      throw error;
    }
  }

  // Activate admin (opposite of deactivate)
  static async activateAdmin(adminId) {
    try {
      console.log('✅ Activating admin:', adminId);
      
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.admin.update, { id: adminId }), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: true })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to activate admin`);
      }

      console.log('✅ Admin activated successfully');
      return result.data;
    } catch (error) {
      console.error('❌ Error activating admin:', error);
      throw error;
    }
  }
}

// Export individual functions for easier imports
export const {
  createAdmin,
  getAdmins,
  getAdminById,
  updateAdmin,
  updateAdminPassword,
  deactivateAdmin,
  deleteAdmin,
  loginAdmin,
  getAdminStats,
  activateAdmin
} = AdminAPI;

export default AdminAPI;