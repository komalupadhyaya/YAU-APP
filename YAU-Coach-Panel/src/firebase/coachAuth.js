// coach-panel/src/firebase/coachAuth.js
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  getDoc,
  setDoc,
  query,
  collection,
  where,
  getDocs,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './config';

// Set persistence to local to maintain session
const initializePersistence = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log('✅ Coach auth persistence set to local');
  } catch (error) {
    console.error('❌ Error setting auth persistence:', error);
  }
};

// Initialize persistence on module load
initializePersistence();

/**
 * Coach registration
 */
export const signUpCoach = async (coachData) => {
  try {
    const { email, password, firstName, lastName, phone, primarySport, experience } = coachData;
    
    // 1. Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // 2. Create user document in 'users' collection
    const userRef = doc(db, 'users', firebaseUser.uid);
    const newUser = {
      uid: firebaseUser.uid,
      email: email.toLowerCase().trim(),
      firstName,
      lastName,
      phone,
      primarySport,
      experience: experience || '',
      role: 'coach',
      status: 'pending', // Default status
      isActive: true,
      hourlyRate: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(userRef, newUser);
    console.log('✅ Coach registration successful for:', email);
    
    return { uid: firebaseUser.uid, ...newUser };
  } catch (error) {
    console.error('❌ Coach registration error:', error);
    throw error;
  }
};

// Coach authentication
export const signInCoach = async (email, password) => {
  try {
    console.log('🔑 Coach login attempt for:', email);
    
    // Ensure persistence is set
    await setPersistence(auth, browserLocalPersistence);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    console.log('🔥 Firebase user created:', firebaseUser.uid);

    // Check if user is a coach
    const coachQuery = query(
      collection(db, 'users'),
      where('email', '==', email.toLowerCase().trim()),
      where('role', '==', 'coach'),
      limit(1)
    );

    const querySnapshot = await getDocs(coachQuery);
    
    if (querySnapshot.empty) {
      console.log('❌ No coach found, signing out');
      await signOut(auth);
      throw new Error('Access denied. No coach account found for this email.');
    }

    const coachDoc = querySnapshot.docs[0];
    const coachData = coachDoc.data();

    // Check if coach is approved
    if (coachData.status !== 'approved') {
      console.log('❌ Coach not approved, status:', coachData.status);
      await signOut(auth);
      const message = coachData.status === 'pending' 
        ? 'Your account is pending approval. You will receive an email once approved.'
        : 'Your coach application was not approved. Please contact administration.';
      throw new Error(message);
    }

    // Check if coach is active
    if (coachData.isActive === false) {
      console.log('❌ Coach inactive, signing out');
      await signOut(auth);
      throw new Error('Your coach account has been deactivated. Please contact administration.');
    }

    const completeUserData = {
      uid: firebaseUser.uid,
      id: coachDoc.id,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      ...coachData,
      userType: 'coach',
      loginTime: new Date().toISOString()
    };

    // Store in localStorage with coach-specific key
    localStorage.setItem('coachUser', JSON.stringify(completeUserData));
    localStorage.setItem('coachAuthTime', Date.now().toString());

    console.log('✅ Coach login successful:', coachData.firstName, coachData.lastName);
    return completeUserData;

  } catch (error) {
    console.error('❌ Coach login error:', error);
    // Clear any stored data on login failure
    localStorage.removeItem('coachUser');
    localStorage.removeItem('coachAuthTime');
    throw error;
  }
};

// Send password reset email for coaches only
export const sendCoachPasswordReset = async (email) => {
  try {
    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail) {
      throw new Error('Please enter your email to reset your password.');
    }

    // Verify the email belongs to a coach account
    const coachQuery = query(
      collection(db, 'users'),
      where('email', '==', normalizedEmail),
      where('role', '==', 'coach'),
      limit(1)
    );

    const snapshot = await getDocs(coachQuery);
    if (snapshot.empty) {
      throw new Error('No coach account found for this email.');
    }

    await sendPasswordResetEmail(auth, normalizedEmail);
    console.log('📧 Password reset email sent to coach:', normalizedEmail);
  } catch (error) {
    console.error('❌ Error sending coach password reset email:', error);
    throw error;
  }
};

// Get current coach data with validation
export const getCurrentCoachData = async (uid) => {
  try {
    console.log('📋 Fetching coach data for UID:', uid);

    // Check if we have valid stored data
    const storedUser = localStorage.getItem('coachUser');
    const authTime = localStorage.getItem('coachAuthTime');
    
    if (storedUser && authTime) {
      const userData = JSON.parse(storedUser);
      const loginTime = parseInt(authTime);
      const now = Date.now();
      
      // Check if session is less than 24 hours old
      if (now - loginTime < 24 * 60 * 60 * 1000 && userData.uid === uid) {
        console.log('✅ Using cached coach data');
        return userData;
      } else {
        console.log('⏰ Cached data expired, refreshing...');
        localStorage.removeItem('coachUser');
        localStorage.removeItem('coachAuthTime');
      }
    }

    // First try to find by UID
    let coachDoc = await getDoc(doc(db, 'users', uid));
    
    if (coachDoc.exists() && coachDoc.data().role === 'coach') {
      const coachData = {
        id: coachDoc.id,
        ...coachDoc.data(),
        uid: uid
      };

      // Update stored data
      localStorage.setItem('coachUser', JSON.stringify(coachData));
      localStorage.setItem('coachAuthTime', Date.now().toString());
      
      return coachData;
    }

    // If not found by UID, try to find by email from Firebase user
    const currentUser = auth.currentUser;
    if (currentUser?.email) {
      console.log('🔍 Searching coach by email:', currentUser.email);
      
      const coachQuery = query(
        collection(db, 'users'),
        where('email', '==', currentUser.email.toLowerCase()),
        where('role', '==', 'coach'),
        limit(1)
      );

      const querySnapshot = await getDocs(coachQuery);
      
      if (!querySnapshot.empty) {
        const coachDoc = querySnapshot.docs[0];
        const coachData = {
          id: coachDoc.id,
          ...coachDoc.data(),
          uid: uid
        };

        // Update stored data
        localStorage.setItem('coachUser', JSON.stringify(coachData));
        localStorage.setItem('coachAuthTime', Date.now().toString());
        
        return coachData;
      }
    }

    console.log('❌ No coach data found for UID:', uid);
    return null;
  } catch (error) {
    console.error('❌ Error getting coach data:', error);
    throw error;
  }
};

// Sign out coach
export const signOutCoach = async () => {
  try {
    console.log('🚪 Signing out coach...');
    await signOut(auth);
    localStorage.removeItem('coachUser');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('coachAuthTime');
    console.log('✅ Coach signed out successfully');
  } catch (error) {
    console.error('❌ Coach logout error:', error);
    // Clear storage even if signOut fails
    localStorage.removeItem('coachUser');
    localStorage.removeItem('coachAuthTime');
    throw error;
  }
};

// Auth state change listener with better error handling
export const onCoachAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    console.log('🔄 Coach auth state changed:', firebaseUser?.uid || 'null');
    
    try {
      if (firebaseUser) {
        // Verify the user is still a valid coach
        const coachData = await getCurrentCoachData(firebaseUser.uid);
        if (coachData) {
          callback(firebaseUser);
        } else {
          console.log('❌ User exists but no coach data found, signing out');
          await signOut(auth);
          callback(null);
        }
      } else {
        // Clear stored data when user signs out
        localStorage.removeItem('coachUser');
        localStorage.removeItem('coachAuthTime');
        callback(null);
      }
    } catch (error) {
      console.error('❌ Error in auth state change:', error);
      callback(null);
    }
  });
};

// Check if coach session is valid
export const isCoachSessionValid = () => {
  const storedUser = localStorage.getItem('coachUser');
  const authTime = localStorage.getItem('coachAuthTime');
  
  if (!storedUser || !authTime) {
    return false;
  }
  
  const loginTime = parseInt(authTime);
  const now = Date.now();
  
  // Session valid for 24 hours
  return (now - loginTime) < 24 * 60 * 60 * 1000;
};