// coach-panel/src/hooks/useCoachAuth.js
import { useState, useEffect, useRef } from 'react';
import { onCoachAuthStateChange, getCurrentCoachData, isCoachSessionValid } from '../firebase/coachAuth';

export const useCoachAuth = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let unsubscribe;

    const initializeAuth = async () => {
      try {
        // Check for existing valid session first
        const storedUser = localStorage.getItem('coachUser');
        if (storedUser && isCoachSessionValid()) {
          try {
            const parsedUser = JSON.parse(storedUser);
            console.log('📱 Restored coach session:', parsedUser.email);
            
            if (mounted.current) {
              setUser(parsedUser);
              setUserData(parsedUser);
              setLoading(false);
              setAuthChecked(true);
              setError(null);
            }
            return;
          } catch (error) {
            console.error('❌ Error parsing stored user:', error);
            localStorage.removeItem('coachUser');
            localStorage.removeItem('coachAuthTime');
          }
        }

        // Set up Firebase auth listener
        unsubscribe = onCoachAuthStateChange(async (firebaseUser) => {
          if (!mounted.current) return;

          try {
            setError(null);
            
            if (firebaseUser) {
              console.log('🔥 Firebase user detected:', firebaseUser.uid);
              
              const coachData = await getCurrentCoachData(firebaseUser.uid);
              
              if (mounted.current) {
                if (coachData) {
                  const completeUserData = {
                    ...firebaseUser,
                    ...coachData,
                    userType: 'coach',
                    sessionTime: new Date().toISOString()
                  };
                  
                  setUser(firebaseUser);
                  setUserData(completeUserData);
                  
                  // Update localStorage
                  localStorage.setItem('coachUser', JSON.stringify(completeUserData));
                  localStorage.setItem('coachAuthTime', Date.now().toString());
                  
                  console.log('✅ Coach authenticated successfully');
                } else {
                  console.log('❌ No coach data found');
                  setUser(null);
                  setUserData(null);
                  localStorage.removeItem('coachUser');
                  localStorage.removeItem('coachAuthTime');
                  setError('Coach account not found or inactive');
                }
              }
            } else {
              console.log('🚫 No Firebase user');
              if (mounted.current) {
                setUser(null);
                setUserData(null);
                localStorage.removeItem('coachUser');
                localStorage.removeItem('coachAuthTime');
              }
            }
          } catch (err) {
            console.error('❌ Auth error:', err);
            if (mounted.current) {
              setError(err.message);
              setUser(null);
              setUserData(null);
              localStorage.removeItem('coachUser');
              localStorage.removeItem('coachAuthTime');
            }
          } finally {
            if (mounted.current && !authChecked) {
              setLoading(false);
              setAuthChecked(true);
            }
          }
        });

        // Set timeout to stop loading if no auth response
        setTimeout(() => {
          if (mounted.current && !authChecked) {
            setLoading(false);
            setAuthChecked(true);
          }
        }, 3000);

      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (mounted.current) {
          setError(error.message);
          setLoading(false);
          setAuthChecked(true);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted.current = false;
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  return {
    user,
    userData,
    loading,
    error,
    isAuthenticated: !!user && !!userData && !error,
    setUserData,
    setUser
  };
};