// firebase/auth.js - Updated for admin management integration
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  getDoc,
  query,
  collection,
  where,
  getDocs,
  limit
} from 'firebase/firestore';
import { auth, db } from './config';

// Auth state listener
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Sign in with email and password (Admin only)
export const signInWithEmail = async (email, password) => {
  try {
    console.log('🔑 Attempting admin login for:', email);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    console.log('✅ Firebase Auth successful, checking admin records...');

    // First, try to find admin by Firebase UID (new system)
    let adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
    let userData = null;

    if (adminDoc.exists()) {
      userData = adminDoc.data();
      console.log('✅ Admin found by UID in new system');
    } else {
      // Fallback: Search by email in case UID doesn't match (migration support)
      console.log('🔍 Admin not found by UID, searching by email...');
      
      const adminQuery = query(
        collection(db, 'admins'),
        where('email', '==', email.toLowerCase().trim()),
        where('isActive', '==', true),
        limit(1)
      );

      const querySnapshot = await getDocs(adminQuery);
      
      if (!querySnapshot.empty) {
        const adminDocFromQuery = querySnapshot.docs[0];
        userData = {
          id: adminDocFromQuery.id,
          ...adminDocFromQuery.data()
        };
        console.log('✅ Admin found by email in new system');
      }
    }

    // If still no admin data found, check legacy collections
    if (!userData) {
      console.log('🔍 Checking legacy admin collections...');
      
      // Check legacy 'users' collection with admin role
      const legacyUserDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (legacyUserDoc.exists()) {
        const legacyData = legacyUserDoc.data();
        if (legacyData.role === 'admin' || legacyData.role === 'super_admin') {
          userData = legacyData;
          console.log('✅ Legacy admin found in users collection');
        }
      }
    }

    if (!userData) {
      console.error('❌ No admin record found for:', email);
      await signOut(auth); // Sign out the Firebase user
      throw new Error('Access denied. No admin record found for this account.');
    }

    // Check if admin is active
    if (userData.isActive === false) {
      console.error('❌ Admin account is deactivated:', email);
      await signOut(auth);
      throw new Error('Access denied. Your admin account has been deactivated. Please contact system administrator.');
    }

    // Verify admin role
    const validAdminRoles = ['admin', 'super_admin', 'moderator', 'editor'];
    if (!validAdminRoles.includes(userData.role)) {
      console.error('❌ Invalid admin role:', userData.role);
      await signOut(auth);
      throw new Error('Access denied. Insufficient privileges for admin panel access.');
    }

    console.log('🎉 Admin login successful:', userData.role);

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      collection: 'admins',
      firebaseUserId: firebaseUser.uid,
      ...userData
    };

  } catch (error) {
    console.error('❌ Login error:', error);
    
    // Handle specific Firebase errors
    if (error.code) {
      throw new Error(getAuthErrorMessage(error.code));
    }
    
    // Re-throw custom errors
    throw error;
  }
};

// Sign out
export const signOutUser = async () => {
  try {
    console.log('🚪 Signing out admin user...');
    await signOut(auth);
    console.log('✅ Admin signed out successfully');
  } catch (error) {
    console.error('❌ Logout error:', error);
    throw error;
  }
};

// Send password reset email
export const resetPassword = async (email) => {
  try {
    console.log('🔄 Sending password reset email to:', email);
    
    // First verify this email belongs to an admin
    const adminQuery = query(
      collection(db, 'admins'),
      where('email', '==', email.toLowerCase().trim()),
      limit(1)
    );

    const querySnapshot = await getDocs(adminQuery);
    
    if (querySnapshot.empty) {
      throw new Error('No admin account found with this email address.');
    }

    const adminData = querySnapshot.docs[0].data();
    if (adminData.isActive === false) {
      throw new Error('Cannot reset password for deactivated admin account.');
    }

    await sendPasswordResetEmail(auth, email);
    console.log('✅ Password reset email sent');
    
  } catch (error) {
    console.error('❌ Password reset error:', error);
    
    if (error.code) {
      throw new Error(getAuthErrorMessage(error.code));
    }
    
    throw error;
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Get user data from admin collection with fallback support
export const getUserData = async (uid) => {
  try {
    console.log('📋 Fetching admin data for UID:', uid);

    // Primary: Check new admin collection by UID
    let adminDoc = await getDoc(doc(db, 'admins', uid));
    
    if (adminDoc.exists()) {
      const data = adminDoc.data();
      console.log('✅ Admin data found by UID');
      
      return {
        id: adminDoc.id,
        ...data,
        collection: 'admins'
      };
    }

    // Fallback: Get Firebase user email and search by email
    const currentUser = getCurrentUser();
    if (currentUser?.email) {
      console.log('🔍 Searching admin by email:', currentUser.email);
      
      const adminQuery = query(
        collection(db, 'admins'),
        where('email', '==', currentUser.email.toLowerCase()),
        where('isActive', '==', true),
        limit(1)
      );

      const querySnapshot = await getDocs(adminQuery);
      
      if (!querySnapshot.empty) {
        const adminDoc = querySnapshot.docs[0];
        const data = adminDoc.data();
        console.log('✅ Admin data found by email');
        
        return {
          id: adminDoc.id,
          ...data,
          collection: 'admins'
        };
      }
    }

    // Legacy fallback: Check users collection
    console.log('🔍 Checking legacy users collection...');
    const legacyUserDoc = await getDoc(doc(db, 'users', uid));
    
    if (legacyUserDoc.exists()) {
      const legacyData = legacyUserDoc.data();
      if (legacyData.role === 'admin' || legacyData.role === 'super_admin') {
        console.log('✅ Legacy admin data found');
        return {
          id: legacyUserDoc.id,
          ...legacyData,
          collection: 'users' // Legacy indicator
        };
      }
    }

    console.log('❌ No admin data found for UID:', uid);
    return null;

  } catch (error) {
    console.error('❌ Error getting admin data:', error);
    throw error;
  }
};

// Check if user has specific admin permissions
export const checkAdminPermission = (userData, requiredPermission) => {
  if (!userData || !userData.permissions) {
    return false;
  }

  // Super admin has all permissions
  if (userData.role === 'super_admin') {
    return true;
  }

  // Check if user has the specific permission
  return userData.permissions.includes(requiredPermission) || userData.permissions.includes('admin');
};

// Get admin role display info
export const getAdminRoleInfo = (role) => {
  const roleInfo = {
    super_admin: { label: '🔥 Super Admin', color: 'text-red-600', priority: 1 },
    admin: { label: '👑 Admin', color: 'text-blue-600', priority: 2 },
    moderator: { label: '🛡️ Moderator', color: 'text-green-600', priority: 3 },
    editor: { label: '✏️ Editor', color: 'text-yellow-600', priority: 4 },
    viewer: { label: '👁️ Viewer', color: 'text-gray-600', priority: 5 }
  };

  return roleInfo[role] || { label: role, color: 'text-gray-600', priority: 99 };
};

// Helper function for error messages
const getAuthErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No admin account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-disabled':
      return 'This admin account has been disabled.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please try again later or reset your password.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/email-not-verified':
      return 'Please verify your email address before accessing the admin panel.';
    case 'auth/requires-recent-login':
      return 'Please log out and log back in to perform this action.';
    default:
      return 'Authentication failed. Please ensure you have admin privileges and try again.';
  }
};
