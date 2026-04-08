// controllers/adminController.js
const AdminService = require('../services/adminService');
const AuthService = require('../services/authService');
const MembershipService = require('../services/membershipService');
const { getAuth } = require('firebase-admin/auth');

class AdminController {
  // Create new admin
  static async createAdmin(req, res) {
    try {
      console.log('👤 Create admin request received');
      
      const adminData = req.body;
      const newAdmin = await AdminService.createAdmin(adminData);

      res.status(201).json({
        success: true,
        message: 'Admin created successfully',
        data: newAdmin
      });

    } catch (error) {
      console.error('❌ Error creating admin:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get all admins
  static async getAdmins(req, res) {
    try {
      console.log('📋 Get admins request received');
      
      const options = {
        page: parseInt(req.query.page) || 1,
        limitCount: parseInt(req.query.limit) || 20,
        role: req.query.role,
        department: req.query.department,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : null,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc',
        search: req.query.search || ''
      };

      const result = await AdminService.getAdmins(options);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Error getting admins:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get admin by ID
  static async getAdminById(req, res) {
    try {
      const { adminId } = req.params;
      const admin = await AdminService.getAdminById(adminId);

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found'
        });
      }

      res.status(200).json({
        success: true,
        data: admin
      });

    } catch (error) {
      console.error('❌ Error getting admin:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update admin
  static async updateAdmin(req, res) {
    try {
      const { adminId } = req.params;
      const updateData = req.body;

      const updatedAdmin = await AdminService.updateAdmin(adminId, updateData);

      res.status(200).json({
        success: true,
        message: 'Admin updated successfully',
        data: updatedAdmin
      });

    } catch (error) {
      console.error('❌ Error updating admin:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update admin password
  static async updateAdminPassword(req, res) {
    try {
      const { adminId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters'
        });
      }

      const result = await AdminService.updateAdminPassword(adminId, newPassword);

      res.status(200).json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('❌ Error updating admin password:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Deactivate admin
  static async deactivateAdmin(req, res) {
    try {
      const { adminId } = req.params;
      const result = await AdminService.deactivateAdmin(adminId);

      res.status(200).json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('❌ Error deactivating admin:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Delete admin
  static async deleteAdmin(req, res) {
    try {
      const { adminId } = req.params;
      const result = await AdminService.deleteAdmin(adminId);

      res.status(200).json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('❌ Error deleting admin:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get admin statistics
  static async getAdminStats(req, res) {
    try {
      const stats = await AdminService.getAdminStats();

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Error getting admin stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Create member with Firebase Auth user
  static async createMemberWithAuth(req, res) {
    let authUser = null;

    try {
      const memberData = req.body;

      console.log('🔐 Creating member with Firebase Auth:', memberData.email);

      // Validate required fields
      if (!memberData.email || !memberData.password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      if (!memberData.firstName || !memberData.lastName) {
        return res.status(400).json({
          success: false,
          error: 'First name and last name are required'
        });
      }

      // Create Firebase Auth user first
      console.log('👤 Creating Firebase Auth user for:', memberData.email);

      const auth = getAuth();

      try {
        authUser = await auth.createUser({
          email: memberData.email,
          password: memberData.password,
          displayName: `${memberData.firstName} ${memberData.lastName}`,
          emailVerified: true, // Auto-verify admin created accounts
        });

        console.log('✅ Firebase Auth user created:', authUser.uid);
      } catch (authError) {
        console.error('❌ Firebase Auth user creation failed:', authError);

        if (authError.code === 'auth/email-already-exists') {
          return res.status(400).json({
            success: false,
            error: 'A user with this email address already exists'
          });
        }

        return res.status(400).json({
          success: false,
          error: `Failed to create user account: ${authError.message}`
        });
      }

      // Create member document with the Firebase UID
      const memberWithUid = {
        ...memberData,
        uid: authUser.uid,
        emailVerified: true,
        createdBy: 'admin',
        registrationSource: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Remove password from member data (don't store it in Firestore)
      delete memberWithUid.password;

      console.log('📝 Creating member document in Firestore');

      const result = await MembershipService.createMember(memberWithUid);

      console.log('✅ Member created successfully:', result.memberId || result.id);

      res.status(201).json({
        success: true,
        data: {
          memberId: result.memberId || result.id,
          uid: authUser.uid,
          email: memberData.email,
          message: 'Member created successfully with login credentials'
        }
      });

    } catch (error) {
      console.error('❌ Error creating member with auth:', error);

      // If member creation failed but auth user was created, clean up auth user
      if (authUser && authUser.uid) {
        try {
          const auth = getAuth();
          await auth.deleteUser(authUser.uid);
          console.log('🧹 Cleaned up Firebase Auth user after member creation failure');
        } catch (cleanupError) {
          console.error('⚠️ Failed to cleanup auth user:', cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create member with authentication',
        details: error.message
      });
    }
  }

  // Admin login
  static async loginAdmin(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Sign in with Firebase Auth
      const authResult = await AuthService.signInWithEmailPassword(email, password);

      // Get admin data from Firestore
      const admin = await AdminService.getAdminByEmail(email);
      if (!admin) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found'
        });
      }

      if (!admin.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Admin account is deactivated'
        });
      }

      // Update last login
      await AdminService.updateLastLogin(admin.id);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          admin: {
            id: admin.id,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            fullName: admin.fullName,
            role: admin.role,
            department: admin.department,
            permissions: admin.permissions
          },
          token: authResult.idToken,
          refreshToken: authResult.refreshToken,
          expiresIn: authResult.expiresIn
        }
      });

    } catch (error) {
      console.error('❌ Error logging in admin:', error);
      res.status(401).json({
        success: false,
        error: error.message || 'Login failed'
      });
    }
  }
}

module.exports = AdminController;