// context/AuthContext.jsx - Updated for admin management system
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmail, 
  signOutUser, 
  onAuthStateChange, 
  getUserData,
  resetPassword as firebaseResetPassword,
  checkAdminPermission,
  getAdminRoleInfo
} from '../firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const isCoachRoute = () => {
    try {
      const p = window.location?.pathname || '';
      return p.startsWith('/coach') || p.startsWith('/coach-login');
    } catch {
      return false;
    }
  };

  useEffect(() => {
    console.log('🔄 Setting up auth state listener...');
    
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log('🔍 Auth state changed:', firebaseUser?.email || 'No user');
      
      if (firebaseUser) {
        try {
          setLoading(true);
          
          // Get additional user data from admin collections
          const userData = await getUserData(firebaseUser.uid);
          
          if (userData) {
            // Verify this is an admin user
            const validAdminRoles = ['admin', 'super_admin', 'moderator', 'editor', 'viewer'];
            
            if (!validAdminRoles.includes(userData.role)) {
              console.warn('❌ User does not have admin privileges:', userData.role);
              // If we're on a coach route, don't sign out (coach portal uses Firebase auth too).
              if (!isCoachRoute()) {
                await signOutUser(); // Sign out non-admin users when in admin app
              }
              setUser(null);
            } else if (userData.isActive === false) {
              console.warn('❌ Admin account is deactivated');
              if (!isCoachRoute()) {
                await signOutUser();
              }
              setUser(null);
            } else {
              console.log('✅ Admin authenticated:', userData.role);
              
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || `${userData.firstName} ${userData.lastName}`,
                emailVerified: firebaseUser.emailVerified,
                ...userData
              });
            }
          } else {
            // No admin data found - sign out user
            console.warn('❌ No admin data found for authenticated user');
            if (!isCoachRoute()) {
              await signOutUser();
            }
            setUser(null);
          }
        } catch (error) {
          console.error('❌ Error fetching admin data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
      setAuthChecked(true);
    });

    return () => {
      console.log('🔄 Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      console.log('🚀 Attempting admin login...');
      
      const userData = await signInWithEmail(email, password);
      
      // Additional verification - ensure only admin roles can access
      const validAdminRoles = ['admin', 'super_admin', 'moderator', 'editor'];
      
      if (!validAdminRoles.includes(userData.role)) {
        await signOutUser();
        throw new Error('Access denied. This application is for administrators only.');
      }

      if (userData.isActive === false) {
        await signOutUser();
        throw new Error('Access denied. Your admin account has been deactivated.');
      }
      
      console.log('✅ Admin login successful');
      setUser(userData);
      
      return userData;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out admin user...');
      await signOutUser();
      setUser(null);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      console.log('🔄 Initiating password reset...');
      await firebaseResetPassword(email);
      console.log('✅ Password reset email sent');
    } catch (error) {
      console.error('❌ Password reset error:', error);
      throw error;
    }
  };

  const updateUser = (updatedData) => {
    console.log('📝 Updating user data in context');
    setUser(prev => ({ ...prev, ...updatedData }));
  };

  // Check if user has specific permission
  const hasPermission = (permission) => {
    if (!user) return false;
    return checkAdminPermission(user, permission);
  };

  // Get user's role information
  const getRoleInfo = () => {
    if (!user) return null;
    return getAdminRoleInfo(user.role);
  };

  // Check if user can perform admin actions
  const canManageAdmins = () => {
    return hasPermission('admin') || user?.role === 'super_admin';
  };

  // Check if user can manage users/parents/coaches
  const canManageUsers = () => {
    return hasPermission('write') || hasPermission('admin');
  };

  // Check if user can delete items
  const canDelete = () => {
    return hasPermission('delete') || hasPermission('admin');
  };

  const value = {
    user,
    login,
    logout,
    resetPassword,
    updateUser,
    loading,
    authChecked,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isSuperAdmin: user?.role === 'super_admin',
    
    // Permission helpers
    hasPermission,
    getRoleInfo,
    canManageAdmins,
    canManageUsers,
    canDelete,
    
    // User info helpers
    userDisplayName: user ? `${user.firstName} ${user.lastName}` : null,
    userRole: user?.role,
    userPermissions: user?.permissions || [],
    isActive: user?.isActive !== false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};