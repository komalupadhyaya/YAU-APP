// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import AdminPanel from './components/AdminPanel';
import ProtectedRoute from './components/auth/protectedRoute';
import CoachLogin from './coach/components/auth/CoachLogin';
import CoachDashboard from './coach/components/dashboard/CoachDashboard';
import { isCoachSessionValid } from './firebase/coachAuth';

const AppContent = () => {
  const { user, loading, logout, isAuthenticated } = useAuth();

  const hasValidCoachSession = () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      return currentUser?.userType === 'coach' && isCoachSessionValid();
    } catch {
      return false;
    }
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="text-gray-700 text-xl">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              user?.role === 'admin' ? (
                <Navigate to="/admin" replace />
              ) : (
                <AccessDenied logout={logout} />
              )
            ) : (
              <Login />
            )
          }
        />

        {/* Coach Routes (separate portal) */}
        <Route
          path="/coach-login"
          element={hasValidCoachSession() ? <Navigate to="/coach" replace /> : <CoachLogin />}
        />
        <Route
          path="/coach"
          element={hasValidCoachSession() ? <CoachDashboard /> : <Navigate to="/coach-login" replace />}
        />

        {/* Protected Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* Default Redirects */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              user?.role === 'admin' ? (
                <Navigate to="/admin" replace />
              ) : (
                <AccessDenied logout={logout} />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Catch all - redirect to appropriate route */}
        <Route
          path="*"
          element={
            hasValidCoachSession() ? (
              <Navigate to="/coach" replace />
            ) : isAuthenticated ? (
              user?.role === 'admin' ? (
                <Navigate to="/admin" replace />
              ) : (
                <AccessDenied logout={logout} />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
};

// Access Denied Component
const AccessDenied = ({ logout }) => (
  <div className="min-h-screen bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl shadow-lg mb-4">
        <span className="text-2xl font-bold text-white">!</span>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-600 mb-6">
        This application is restricted to administrators only.
      </p>
      <button
        onClick={() => logout()}
        className="w-full py-3 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
      >
        Sign Out
      </button>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;