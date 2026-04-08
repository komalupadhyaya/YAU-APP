// coach-panel/src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CoachLayout from './components/layout/CoachLayout';
import CoachLogin from './components/auth/CoachLogin';
import CoachSignup from './components/auth/CoachSignup';
import CoachForgotPassword from './components/auth/CoachForgotPassword';
import { useCoachAuth } from './hooks/useCoachAuth';
import { isCoachSessionValid } from './firebase/coachAuth';
import './styles/globals.css';

function App() {
  const { user, userData, loading, error } = useCoachAuth();

  // Monitor session validity
  useEffect(() => {
    const checkSession = () => {
      if (userData && !isCoachSessionValid()) {
        console.log('⏰ Coach session expired, redirecting to login');
        localStorage.removeItem('coachUser');
        localStorage.removeItem('coachAuthTime');
        window.location.href = '/login';
      }
    };

    // Check session validity every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [userData]);

  const handleSwitchToMemberView = () => {
    const memberPortalUrl = process.env.REACT_APP_MEMBER_PORTAL_URL || 'https://members.yauapp.com';
    window.open(memberPortalUrl, '_blank', 'noopener,noreferrer');
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Loading Coach Dashboard</h2>
          <p className="text-gray-600">Initializing your coaching portal...</p>
          {error && (
            <p className="text-red-600 text-sm mt-2">Error: {error}</p>
          )}
        </div>
      </div>
    );
  }

  // Error screen
  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-red-800 mb-2">Authentication Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App min-h-screen bg-gray-50">
        <Routes>
          {/* Login Route */}
          <Route 
            path="/login" 
            element={
              !user ? 
                <CoachLogin /> : 
                <Navigate to="/dashboard" replace />
            } 
          />
          <Route 
            path="/signup" 
            element={!user ? <CoachSignup /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/forgot-password" 
            element={!user ? <CoachForgotPassword /> : <Navigate to="/dashboard" replace />} 
          />

          {/* Protected Coach Routes */}
          <Route 
            path="/*" 
            element={
              user && userData && isCoachSessionValid() ? 
                <CoachLayout 
                  userData={userData}
                  onSwitchToMemberView={handleSwitchToMemberView} 
                /> : 
                <Navigate to="/login" replace />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;