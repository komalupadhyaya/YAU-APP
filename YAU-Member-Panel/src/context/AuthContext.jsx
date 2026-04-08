// // contexts/AuthContext.jsx
// import React, { createContext, useContext, useState, useEffect } from 'react';
// import { 
//   signInWithEmail, 
//   signOutUser, 
//   onAuthStateChange, 
//   getUserDataFromBothCollections,
//   resetPassword as firebaseResetPassword
// } from '../firebase/auth';

// const AuthContext = createContext();

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [authChecked, setAuthChecked] = useState(false);

//   useEffect(() => {
//     console.log('🔄 Setting up auth state listener...');
    
//     const unsubscribe = onAuthStateChange(async (firebaseUser) => {
//       console.log('🔄 Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
      
//       if (firebaseUser) {
//         try {
//           console.log('🔍 Firebase user detected, UID:', firebaseUser.uid);
          
//           // Get complete user data from both collections
//           const userData = await getUserDataFromBothCollections(firebaseUser.uid);
          
//           if (userData) {
//             console.log('✅ Setting complete user data in context:', userData);
            
//             setUser({
//               uid: firebaseUser.uid,
//               email: firebaseUser.email,
//               displayName: firebaseUser.displayName,
//               ...userData
//             });
//           } else {
//             console.warn('⚠️ User authenticated but no data found in collections');
            
//             // Fallback to basic Firebase user data
//             setUser({
//               uid: firebaseUser.uid,
//               email: firebaseUser.email,
//               displayName: firebaseUser.displayName,
//               firstName: firebaseUser.displayName?.split(' ')[0] || '',
//               lastName: firebaseUser.displayName?.split(' ')[1] || '',
//               role: 'user',
//               isPaidMember: false,
//               collection: 'unknown'
//             });
//           }
//         } catch (error) {
//           console.error('❌ Error fetching user data in auth context:', error);
//           setUser(null);
//         }
//       } else {
//         console.log('👋 User logged out, clearing context');
//         setUser(null);
//       }
      
//       setLoading(false);
//       setAuthChecked(true);
//     });

//     return () => {
//       console.log('🧹 Cleaning up auth listener');
//       unsubscribe();
//     };
//   }, []);

//   const login = async (email, password) => {
//     try {
//       console.log('🔐 Login attempt for:', email);
//       setLoading(true);
      
//       const userData = await signInWithEmail(email, password);
//       console.log('✅ Login successful, setting user data:', userData);
      
//       setUser(userData);
//       return userData;
//     } catch (error) {
//       console.error('❌ Login failed:', error);
//       throw error;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const logout = async () => {
//     try {
//       console.log('👋 Logging out user...');
//       await signOutUser();
//       setUser(null);
//       console.log('✅ Logout successful');
//     } catch (error) {
//       console.error('❌ Logout error:', error);
//       throw error;
//     }
//   };

//   const resetPassword = async (email) => {
//     try {
//       await firebaseResetPassword(email);
//     } catch (error) {
//       console.error('Password reset error:', error);
//       throw error;
//     }
//   };

//   const updateUser = (updatedData) => {
//     console.log('🔄 Updating user data in context:', updatedData);
//     setUser(prev => ({ 
//       ...prev, 
//       ...updatedData 

      
//     }));
//   };

//   // Debug: Log current user state
//   useEffect(() => {
//     if (user) {
//       console.log('👤 Current user in context:', {
//         uid: user.uid,
//         email: user.email,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         isPaidMember: user.isPaidMember,
//         collection: user.collection,
//         students: user.students?.length || 0
//       });
//     }
//   }, [user]);

//   const value = {
//     user,
//     login,
//     logout,
//     resetPassword,
//     updateUser,
//     loading,
//     authChecked,
//     isAuthenticated: !!user,
//     isMember: user?.collection === 'members'
//   };

//   return (
//     <AuthContext.Provider value={value}>
//       {children}
//     </AuthContext.Provider>
//   );
// };








// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmail, 
  signOutUser, 
  onAuthStateChange, 
  getUserDataFromBothCollections,
  resetPassword as firebaseResetPassword
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

  useEffect(() => {
    console.log('🔄 Setting up auth state listener...');
    
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log('🔄 Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
      
      if (firebaseUser) {
        try {
          console.log('🔍 Firebase user detected, UID:', firebaseUser.uid);
          
          // Get complete user data from both collections
          const userData = await getUserDataFromBothCollections(firebaseUser.uid);
          
          if (userData) {
            console.log('✅ Setting complete user data in context:', userData);
            
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              ...userData
            });
          } else {
            console.warn('⚠️ User authenticated but no data found in collections');
            
            // Fallback to basic Firebase user data
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              firstName: firebaseUser.displayName?.split(' ')[0] || '',
              lastName: firebaseUser.displayName?.split(' ')[1] || '',
              role: 'user',
              isPaidMember: false,
              collection: 'unknown'
            });
          }
        } catch (error) {
          console.error('❌ Error fetching user data in auth context:', error);
          setUser(null);
        }
      } else {
        console.log('👋 User logged out, clearing context');
        setUser(null);
      }
      
      setLoading(false);
      setAuthChecked(true);
    });

    return () => {
      console.log('🧹 Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    try {
      console.log('🔐 Login attempt for:', email);
      setLoading(true);
      
      const userData = await signInWithEmail(email, password);
      console.log('✅ Login successful, setting user data:', userData);
      
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('👋 Logging out user...');
      
      // Immediately clear user and loading state to prevent loading loops
      setUser(null);
      setLoading(false);
      setAuthChecked(true);
      
      // Clear any session storage data that might cause issues
      sessionStorage.removeItem("paymentCompleted");
      sessionStorage.removeItem("pendingRegistration");
      sessionStorage.removeItem("childIdPaymentCompleted");
      sessionStorage.removeItem("recentChildIdStudent");
      sessionStorage.removeItem("uniformPaymentCompleted");
      sessionStorage.removeItem("recentUniformStudent");
      
      // Then sign out from Firebase
      await signOutUser();
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Even if signOut fails, keep the user logged out locally
      setUser(null);
      setLoading(false);
      setAuthChecked(true);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      await firebaseResetPassword(email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  // MODIFIED: Enhanced updateUser function to handle registration flow
  const updateUser = (updatedData) => {
    console.log('🔄 Updating user data in context:', updatedData);
    
    // If user is null (during registration flow), create a minimal user object
    if (!user) {
      console.log('ℹ️ Creating minimal user object for registration flow');
      setUser({
        uid: updatedData.uid || 'temp-' + Date.now(),
        email: updatedData.email || '',
        isPaidMember: updatedData.isPaidMember || false,
        membershipType: updatedData.membershipType || null,
        // Add other essential fields with defaults
        firstName: updatedData.firstName || '',
        lastName: updatedData.lastName || '',
        role: 'user',
        collection: updatedData.collection || 'registrations',
        ...updatedData
      });
    } else {
      // Normal update for existing user
      setUser(prev => ({ 
        ...prev, 
        ...updatedData 
      }));
    }
  };

  // NEW: Function to handle post-registration user setup
  const setupPostRegistrationUser = async (userUID, userEmail) => {
    try {
      console.log('🔄 Setting up post-registration user context');
      
      // Create a temporary user object for the registration flow
      setUser({
        uid: userUID,
        email: userEmail,
        isPaidMember: false, // Will be updated after payment
        membershipType: null,
        firstName: '', // These will be populated after payment success
        lastName: '',
        role: 'user',
        collection: 'registrations' // Default collection for new registrations
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error setting up post-registration user:', error);
      return false;
    }
  };

  // Debug: Log current user state
  useEffect(() => {
    if (user) {
      console.log('👤 Current user in context:', {
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isPaidMember: user.isPaidMember,
        collection: user.collection,
        students: user.students?.length || 0
      });
    }
  }, [user]);

  // Helper function to get user's roster information
  const getUserRosterInfo = () => {
    if (!user || !user.students || user.students.length === 0) {
      return { rosterIds: [], teams: [], studentCount: 0 };
    }

    const rosterIds = [];
    const teams = [];

    user.students.forEach(student => {
      if (student.rosterId) {
        rosterIds.push(student.rosterId);
      }
      
      // Generate roster ID from student data if not present
      if (student.ageGroup && student.sport && student.location) {
        const generatedRosterId = `${student.ageGroup}_${student.sport}_${student.location}`.replace(/\s+/g, '_').replace(/,/g, '');
        rosterIds.push(generatedRosterId);
      }

      teams.push({
        name: student.rosterId?.replace(/_/g, ' ') || `${student.ageGroup} ${student.sport}`,
        rosterId: student.rosterId,
        student: `${student.firstName} ${student.lastName}`,
        ageGroup: student.ageGroup,
        sport: student.sport,
        location: student.location
      });
    });

    return {
      rosterIds: [...new Set(rosterIds)], // Remove duplicates
      teams,
      studentCount: user.students.length
    };
  };

  const value = {
    user,
    login,
    logout,
    resetPassword,
    updateUser,
    setupPostRegistrationUser, // NEW: Added this function
    getUserRosterInfo, // NEW: Added roster helper
    loading,
    authChecked,
    isAuthenticated: !!user,
    isMember: user?.collection === 'members'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};