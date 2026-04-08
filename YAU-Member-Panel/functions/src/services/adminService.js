// services/adminService.js
const { collection, addDoc, doc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit } = require('firebase/firestore');
const { db } = require("../utils/firebase");
const AuthService = require('./authService');

const ADMIN_COLLECTION = 'admins';

class AdminService {
  // Create new admin
  static async createAdmin(adminData) {
    try {
      console.log('👤 Creating new admin:', adminData.email);

      // Validate required fields
      const validation = this.validateAdminData(adminData);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const { email, password, firstName, lastName, role = 'admin', department = '', permissions = ['read'] } = adminData;

      // Check if admin already exists
      const existingAdmin = await this.getAdminByEmail(email);
      if (existingAdmin) {
        throw new Error('Admin with this email already exists');
      }

      console.log('🔐 Creating Firebase Auth user...');
      
      // Create Firebase Auth user
      const firebaseUserId = await AuthService.createFirebaseAuthUser(email, password);
      
      console.log('✅ Firebase Auth user created with ID:', firebaseUserId);

      // Prepare admin document
      const adminDoc = {
        firebaseUserId,
        email: email.toLowerCase().trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        department: department.trim(),
        permissions: Array.isArray(permissions) ? permissions : ['read'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        loginCount: 0,
        profilePicture: null,
        phone: adminData.phone || '',
        address: adminData.address || '',
        notes: adminData.notes || ''
      };

      console.log('💾 Saving admin to Firestore...');

      // Save to Firestore
      const docRef = await addDoc(collection(db, ADMIN_COLLECTION), adminDoc);
      
      console.log('✅ Admin created successfully with ID:', docRef.id);

      // Return admin data without sensitive info
      return {
        id: docRef.id,
        firebaseUserId,
        email: adminDoc.email,
        firstName: adminDoc.firstName,
        lastName: adminDoc.lastName,
        fullName: `${adminDoc.firstName} ${adminDoc.lastName}`,
        role: adminDoc.role,
        department: adminDoc.department,
        permissions: adminDoc.permissions,
        isActive: adminDoc.isActive,
        createdAt: adminDoc.createdAt,
        phone: adminDoc.phone,
        address: adminDoc.address
      };

    } catch (error) {
      console.error('❌ Error creating admin:', error);
      throw new Error(`Failed to create admin: ${error.message}`);
    }
  }

  // Get all admins with pagination and filters
  static async getAdmins(options = {}) {
    try {
      const { 
        page = 1, 
        limitCount = 20, 
        role = null, 
        department = null, 
        isActive = null,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search = ''
      } = options;

      console.log('📋 Getting admins with options:', options);

      let q = collection(db, ADMIN_COLLECTION);
      let constraints = [];

      // Add filters
      if (role) {
        constraints.push(where('role', '==', role));
      }
      if (department) {
        constraints.push(where('department', '==', department));
      }
      if (isActive !== null) {
        constraints.push(where('isActive', '==', isActive));
      }

      // Add sorting
      constraints.push(orderBy(sortBy, sortOrder));

      // Add pagination
      constraints.push(limit(limitCount));

      // Build query
      if (constraints.length > 0) {
        q = query(q, ...constraints);
      }

      const snapshot = await getDocs(q);
      let admins = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
        lastLogin: doc.data().lastLogin?.toDate?.() || doc.data().lastLogin,
        fullName: `${doc.data().firstName} ${doc.data().lastName}`
      }));

      // Apply search filter (client-side for complex search)
      if (search) {
        const searchLower = search.toLowerCase();
        admins = admins.filter(admin => 
          admin.firstName.toLowerCase().includes(searchLower) ||
          admin.lastName.toLowerCase().includes(searchLower) ||
          admin.email.toLowerCase().includes(searchLower) ||
          admin.department.toLowerCase().includes(searchLower)
        );
      }

      // Get total count for pagination
      const totalSnapshot = await getDocs(collection(db, ADMIN_COLLECTION));
      const totalCount = totalSnapshot.size;

      console.log(`✅ Retrieved ${admins.length} admins`);

      return {
        admins,
        pagination: {
          currentPage: page,
          itemsPerPage: limitCount,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limitCount),
          hasNextPage: admins.length === limitCount,
          hasPreviousPage: page > 1
        },
        filters: {
          role,
          department,
          isActive,
          search
        }
      };

    } catch (error) {
      console.error('❌ Error getting admins:', error);
      throw new Error(`Failed to get admins: ${error.message}`);
    }
  }

  // Get admin by ID
  static async getAdminById(adminId) {
    try {
      console.log('🔍 Getting admin by ID:', adminId);

      const docRef = doc(db, ADMIN_COLLECTION, adminId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const adminData = docSnap.data();
      return {
        id: docSnap.id,
        ...adminData,
        createdAt: adminData.createdAt?.toDate?.() || adminData.createdAt,
        updatedAt: adminData.updatedAt?.toDate?.() || adminData.updatedAt,
        lastLogin: adminData.lastLogin?.toDate?.() || adminData.lastLogin,
        fullName: `${adminData.firstName} ${adminData.lastName}`
      };

    } catch (error) {
      console.error('❌ Error getting admin by ID:', error);
      throw new Error(`Failed to get admin: ${error.message}`);
    }
  }

  // Get admin by email
  static async getAdminByEmail(email) {
    try {
      const q = query(
        collection(db, ADMIN_COLLECTION),
        where('email', '==', email.toLowerCase().trim()),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const adminData = doc.data();
      
      return {
        id: doc.id,
        ...adminData,
        createdAt: adminData.createdAt?.toDate?.() || adminData.createdAt,
        updatedAt: adminData.updatedAt?.toDate?.() || adminData.updatedAt,
        lastLogin: adminData.lastLogin?.toDate?.() || adminData.lastLogin,
        fullName: `${adminData.firstName} ${adminData.lastName}`
      };

    } catch (error) {
      console.error('❌ Error getting admin by email:', error);
      throw new Error(`Failed to get admin by email: ${error.message}`);
    }
  }

  // Update admin
  static async updateAdmin(adminId, updateData) {
    try {
      console.log('📝 Updating admin:', adminId);

      // Get existing admin
      const existingAdmin = await this.getAdminById(adminId);
      if (!existingAdmin) {
        throw new Error('Admin not found');
      }

      // Validate update data
      const allowedFields = [
        'firstName', 'lastName', 'department', 'permissions', 'isActive',
        'phone', 'address', 'notes', 'role', 'profilePicture'
      ];

      const updates = {};
      
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          if (key === 'firstName' || key === 'lastName') {
            updates[key] = value.trim();
          } else if (key === 'permissions' && Array.isArray(value)) {
            updates[key] = value;
          } else if (key === 'isActive' && typeof value === 'boolean') {
            updates[key] = value;
          } else if (typeof value === 'string') {
            updates[key] = value.trim();
          } else {
            updates[key] = value;
          }
        }
      }

      if (Object.keys(updates).length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add updated timestamp
      updates.updatedAt = new Date();

      // Update in Firestore
      const docRef = doc(db, ADMIN_COLLECTION, adminId);
      await updateDoc(docRef, updates);

      console.log('✅ Admin updated successfully');

      // Return updated admin
      return await this.getAdminById(adminId);

    } catch (error) {
      console.error('❌ Error updating admin:', error);
      throw new Error(`Failed to update admin: ${error.message}`);
    }
  }

  // Update admin password (Firebase Auth)
  static async updateAdminPassword(adminId, newPassword) {
    try {
      console.log('🔐 Updating admin password:', adminId);

      const admin = await this.getAdminById(adminId);
      if (!admin) {
        throw new Error('Admin not found');
      }

      if (!admin.firebaseUserId) {
        throw new Error('Admin does not have Firebase Auth user');
      }

      // Update password using Firebase Auth REST API
      await AuthService.updateFirebaseUserPassword(admin.firebaseUserId, newPassword);

      // Update timestamp in Firestore
      await updateDoc(doc(db, ADMIN_COLLECTION, adminId), {
        updatedAt: new Date()
      });

      console.log('✅ Admin password updated successfully');
      return { success: true, message: 'Password updated successfully' };

    } catch (error) {
      console.error('❌ Error updating admin password:', error);
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  // Soft delete admin (deactivate)
  static async deactivateAdmin(adminId) {
    try {
      console.log('🚫 Deactivating admin:', adminId);

      const admin = await this.getAdminById(adminId);
      if (!admin) {
        throw new Error('Admin not found');
      }

      // Update admin status
      await updateDoc(doc(db, ADMIN_COLLECTION, adminId), {
        isActive: false,
        updatedAt: new Date(),
        deactivatedAt: new Date()
      });

      // Optionally disable Firebase Auth user
      if (admin.firebaseUserId) {
        try {
          await AuthService.disableFirebaseUser(admin.firebaseUserId);
        } catch (authError) {
          console.warn('⚠️ Could not disable Firebase Auth user:', authError.message);
        }
      }

      console.log('✅ Admin deactivated successfully');
      return { success: true, message: 'Admin deactivated successfully' };

    } catch (error) {
      console.error('❌ Error deactivating admin:', error);
      throw new Error(`Failed to deactivate admin: ${error.message}`);
    }
  }

  // Hard delete admin (permanent)
  static async deleteAdmin(adminId) {
    try {
      console.log('🗑️ Deleting admin permanently:', adminId);

      const admin = await this.getAdminById(adminId);
      if (!admin) {
        throw new Error('Admin not found');
      }

      // Delete Firebase Auth user
      if (admin.firebaseUserId) {
        try {
          await AuthService.deleteFirebaseUser(admin.firebaseUserId);
          console.log('✅ Firebase Auth user deleted');
        } catch (authError) {
          console.warn('⚠️ Could not delete Firebase Auth user:', authError.message);
        }
      }

      // Delete from Firestore
      await deleteDoc(doc(db, ADMIN_COLLECTION, adminId));
      
      console.log('✅ Admin deleted permanently');
      return { success: true, message: 'Admin deleted permanently' };

    } catch (error) {
      console.error('❌ Error deleting admin:', error);
      throw new Error(`Failed to delete admin: ${error.message}`);
    }
  }

  // Update last login
  static async updateLastLogin(adminId) {
    try {
      const admin = await this.getAdminById(adminId);
      if (!admin) {
        throw new Error('Admin not found');
      }

      await updateDoc(doc(db, ADMIN_COLLECTION, adminId), {
        lastLogin: new Date(),
        loginCount: (admin.loginCount || 0) + 1
      });

    } catch (error) {
      console.warn('Could not update last login:', error.message);
    }
  }

  // Get admin statistics
  static async getAdminStats() {
    try {
      const snapshot = await getDocs(collection(db, ADMIN_COLLECTION));
      
      let totalAdmins = 0;
      let activeAdmins = 0;
      let inactiveAdmins = 0;
      const roleStats = {};
      const departmentStats = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        totalAdmins++;
        
        if (data.isActive) {
          activeAdmins++;
        } else {
          inactiveAdmins++;
        }

        const role = data.role || 'unknown';
        roleStats[role] = (roleStats[role] || 0) + 1;

        const department = data.department || 'unassigned';
        departmentStats[department] = (departmentStats[department] || 0) + 1;
      });

      return {
        totalAdmins,
        activeAdmins,
        inactiveAdmins,
        roleBreakdown: roleStats,
        departmentBreakdown: departmentStats,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error getting admin stats:', error);
      throw new Error(`Failed to get admin stats: ${error.message}`);
    }
  }

  // Helper methods
  static validateAdminData(adminData, isUpdate = false) {
    const { email, password, firstName, lastName, permissions } = adminData;

    if (!isUpdate) {
      if (!email || !email.includes('@')) {
        return { isValid: false, error: 'Valid email is required' };
      }

      if (!password || password.length < 6) {
        return { isValid: false, error: 'Password must be at least 6 characters' };
      }

      if (!firstName || firstName.trim().length === 0) {
        return { isValid: false, error: 'First name is required' };
      }

      if (!lastName || lastName.trim().length === 0) {
        return { isValid: false, error: 'Last name is required' };
      }
    }

    if (permissions && !Array.isArray(permissions)) {
      return { isValid: false, error: 'Permissions must be an array' };
    }

    const validPermissions = ['read', 'write', 'delete', 'admin'];
    if (permissions && permissions.some(p => !validPermissions.includes(p))) {
      return { isValid: false, error: `Invalid permissions. Allowed: ${validPermissions.join(', ')}` };
    }

    return { isValid: true };
  }

  static generateRandomPassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

module.exports = AdminService;