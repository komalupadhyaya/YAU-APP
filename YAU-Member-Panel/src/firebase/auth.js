// firebase/auth.js
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  confirmPasswordReset
} from 'firebase/auth';
import { // eslint-disable-next-line
  doc, // eslint-disable-next-line
  getDoc,
  getDocs,
  collection,
  query,
  where
} from 'firebase/firestore';
import { auth, db } from './config';
export { confirmPasswordReset };
// Auth state listener
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Sign in with email and password (Check both collections by EMAIL)
export const signInWithEmail = async (email, password) => {
  try {
    console.log('🔐 Attempting login for:', email);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    console.log('✅ Firebase auth successful, UID:', firebaseUser.uid);

    // Get complete user data from collections using EMAIL
    const userData = await getUserDataFromBothCollectionsByEmail(firebaseUser.email);
    
    if (!userData) {
      console.warn('⚠️ No user data found in collections for email:', firebaseUser.email);
      console.log('✅ Creating minimal user profile from Firebase auth');
      
      // Return minimal user data from Firebase auth
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        firstName: firebaseUser.displayName?.split(' ')[0] || '',
        lastName: firebaseUser.displayName?.split(' ')[1] || '',
        collection: 'firebase_only',
        isPaidMember: false,
        students: [],
        createdAt: new Date()
      };
    }

    console.log('✅ Complete user data retrieved:', userData);

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      ...userData
    };
  } catch (error) {
    console.error('❌ Login error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

// Get user data from both collections by EMAIL
export const getUserDataFromBothCollectionsByEmail = async (email) => {
  try {
    console.log('🔍 Searching for user data with email:', email);

    // First check members collection (paid users) - Search by email field
    try {
      console.log('🔍 Checking members collection by email...');
      const membersQuery = query(
        collection(db, 'members'), 
        where('email', '==', email)
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      if (!membersSnapshot.empty) {
        const memberDoc = membersSnapshot.docs[0]; // Get first matching document
        const memberData = memberDoc.data();
        console.log('✅ Found user in members collection:', memberData);
        
        return {
          id: memberDoc.id,
          ...memberData,
          collection: 'members',
          isPaidMember: memberData.isPaidMember !== false, // Default to true for members
          createdAt: memberData.createdAt?.toDate ? memberData.createdAt.toDate() : memberData.createdAt
        };
      } else {
        console.log('⚠️ User not found in members collection');
      }
    } catch (memberError) {
      console.warn('⚠️ Error checking members collection:', memberError);
    }
    
    // Then check registrations collection (free users) - Search by email field
    try {
      console.log('🔍 Checking registrations collection by email...');
      const registrationsQuery = query(
        collection(db, 'registrations'), 
        where('email', '==', email)
      );
      const registrationsSnapshot = await getDocs(registrationsQuery);
      
      if (!registrationsSnapshot.empty) {
        const registrationDoc = registrationsSnapshot.docs[0]; // Get first matching document
        const registrationData = registrationDoc.data();
        console.log('✅ Found user in registrations collection:', registrationData);
        
        return {
          id: registrationDoc.id,
          ...registrationData,
          collection: 'registrations',
          isPaidMember: false,
          createdAt: registrationData.createdAt?.toDate ? registrationData.createdAt.toDate() : registrationData.createdAt
        };
      } else {
        console.log('⚠️ User not found in registrations collection');
      }
    } catch (registrationError) {
      console.warn('⚠️ Error checking registrations collection:', registrationError);
    }
    
    console.log('❌ User not found in any collection');
    return null;
  } catch (error) {
    console.error('❌ Error getting user data by email:', error);
    throw error;
  }
};

// Also update the old function to work by email for compatibility
export const getUserDataFromBothCollections = async (uid) => {
  // For backward compatibility, but we'll primarily use email now
  const firebaseUser = auth.currentUser;
  if (firebaseUser?.email) {
    return await getUserDataFromBothCollectionsByEmail(firebaseUser.email);
  }
  return null;
};

// Rest of your functions remain the same...
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

const getAuthErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    default:
      return 'Login failed. Please check your credentials.';
  }
};