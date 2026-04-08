// App.jsx
import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast"; // Add this import
import { initializeInviteTracking } from "./utils/inviteTracking";
import Registration from "./components/auth/Registration/Registration";
import LoginPage from "./components/auth/Login";
import ForgotPasswordPage from "./components/auth/ForgotPassword";
import ResetPasswordPage from "./components/auth/ResetPassword";
import AuthActionHandler from "./components/auth/AuthActionHandler";
import MainLayout from "./components/Layout/MainLayout";
import Dashboard from "./components/Dashboard/Dashboard";
import Profile from "./components/Pages/Profile";
import Account from "./components/Pages/Account";
import Payments from "./components/Pages/Payments";
import UniformOrder from "./components/Pages/UniformOrder";
import ChildIdOrder from "./components/Pages/ChildIdOrder";
import Schedule from "./components/Pages/Schedule";
import ChildID from "./components/Pages/ChildID";
import Shop from "./components/Pages/Shop";
import Events from "./components/Pages/Events";
import Community from "./components/Pages/Community";
import Messages from "./components/Pages/Messages";
import Resources from "./components/Pages/Resources";
import Support from "./components/Pages/Support";
import Invitations from "./components/Pages/Invitations";
import { AuthProvider, useAuth } from "./context/AuthContext";
import CheckoutPage from "./components/Checkout/CheckoutPage";
import PaymentSuccess from "./components/Checkout/PaymentSuccess";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { CssBaseline } from "@mui/material";
import PaymentPending from "./components/Pages/PaymentPending";
import SupportPage from "./components/Layout/SupportPage";

// // Protected Route Component - requires authentication AND payment
// const ProtectedRoute = ({ children }) => {
//   const { isAuthenticated, loading, user, authChecked } = useAuth();

//   // Debug logging (remove in production)
//   console.log('🔍 ProtectedRoute - User state:', {
//     isAuthenticated,
//     loading,
//     authChecked,
//     user: user ? {
//       uid: user.uid,
//       email: user.email,
//       isPaidMember: user.isPaidMember,
//       membershipType: user.membershipType,
//       paymentStatus: user.paymentStatus,
//       collection: user.collection
//     } : null
//   });

//   // Show loading only if auth hasn't been checked yet AND we're still loading
//   if (loading && !authChecked) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-lg">Loading...</div>
//       </div>
//     );
//   }

//   // Must be authenticated
//   if (!isAuthenticated) {
//     return <Navigate to="/login" replace />;
//   }

//   // Check if user just completed payment (temporary bypass for recent payments)
//   const hasRecentPayment = sessionStorage.getItem("paymentCompleted");
//   const recentPaymentTime = hasRecentPayment ? parseInt(hasRecentPayment) : 0;
//   const isRecentPayment = Date.now() - recentPaymentTime < 60000; // Reduced to 1 minute for security
  
//   // Must have completed payment - stricter check
//   const hasPaidStatus = user?.isPaidMember === true || 
//                        user?.paymentStatus === 'active' || 
//                        user?.membershipType === 'monthly' || 
//                        user?.membershipType === 'oneTime';
  
//   // if (user && !hasPaidStatus && !isRecentPayment) {
//   //   // Check if there's a pending registration that needs payment
//   //   const hasPendingRegistration = sessionStorage.getItem("pendingRegistration");
    
//   //   if (hasPendingRegistration) {
//   //     try {
//   //       // Redirect to checkout to complete payment
//   //       const registrationData = JSON.parse(hasPendingRegistration);
//   //       const planParam = registrationData.selectedPlan || "monthly";
//   //       const email = encodeURIComponent(registrationData.userEmail || user.email);
//   //       return <Navigate to={`/checkout?plan=${planParam}&email=${email}`} replace />;
//   //     } catch (error) {
//   //       // Clear invalid session data
//   //       sessionStorage.removeItem("pendingRegistration");
//   //       return <Navigate to="/register" replace />;
//   //     }
//   //   } else {
//   //     // No pending registration, redirect to pricing/registration  
//   //     return <Navigate to="/register" replace />;
//   //   }
//   // }

//   return children;
// };


// Protected Route Component - requires authentication AND payment
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user, authChecked } = useAuth();

  // Debug logging (remove in production)
  console.log('🔍 ProtectedRoute - User state:', {
    isAuthenticated,
    loading,
    authChecked,
    user: user ? {
      uid: user.uid,
      email: user.email,
      isPaidMember: user.isPaidMember,
      membershipType: user.membershipType,
      paymentStatus: user.paymentStatus,
      collection: user.collection
    } : null
  });

  // Show loading only if auth hasn't been checked yet AND we're still loading
  if (loading && !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Must be authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user just completed payment (temporary bypass for recent payments)
  const hasRecentPayment = sessionStorage.getItem("paymentCompleted");
  const recentPaymentTime = hasRecentPayment ? parseInt(hasRecentPayment) : 0;
  const isRecentPayment = Date.now() - recentPaymentTime < 60000; // Reduced to 1 minute for security
  
  // Must have completed payment - stricter check
  // const hasPaidStatus = user?.isPaidMember === true || 
  //                      user?.paymentStatus === 'active' || 
  //                      user?.membershipType === 'monthly' || 
  //                      user?.membershipType === 'oneTime';


  const hasPaidStatus = user?.paymentStatus === 'Active' || user?.isPaidMember === true;
  
  // If user is authenticated but hasn't paid, show payment pending page
  if (user && !hasPaidStatus && !isRecentPayment) {
    return <PaymentPending />;
  }

  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, authChecked } = useAuth();

  // Only show loading if auth hasn't been checked yet AND we're still loading
  // This prevents infinite loading after logout
  if (loading && !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

// Payment Success Route - allows payment processing without full membership check
const PaymentSuccessRoute = ({ children }) => {
  const { isAuthenticated, loading, authChecked } = useAuth();

  if (loading && !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // For payment success, we only need authentication (or pending registration)
  // Don't check isPaidMember since we're in the process of updating it
  if (!isAuthenticated) {
    const hasPendingRegistration = sessionStorage.getItem("pendingRegistration");
    const hasRecentPayment = sessionStorage.getItem("paymentCompleted");
    
    // Allow access if there's pending registration or recent payment
    if (!hasPendingRegistration && !hasRecentPayment) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

// Semi-Protected Route for Checkout (allows registration flow)
const CheckoutRoute = ({ children }) => {
  const { isAuthenticated, loading, authChecked } = useAuth();

  if (loading && !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const hasPendingRegistration = sessionStorage.getItem("pendingRegistration");
  return isAuthenticated || hasPendingRegistration ? children : <Navigate to="/login" replace />;
};

const AppContent = () => {
  // Initialize invite tracking on mount
  useEffect(() => {
    initializeInviteTracking();
  }, []);

  return (
    <Router basename="/">
      <Routes>
        {/* Firebase Auth Action Handler - MUST BE FIRST */}
        <Route path="/__/auth/action" element={<AuthActionHandler />} />
        
        {/* Public Routes */}
        <Route
          path="/join"
          element={
            <PublicRoute>
              <Registration />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Registration />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />

        {/* Protected Routes - All use MainLayout wrapper */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="account" element={<Account />} />
          <Route path="payments" element={<Payments />} />
          <Route path="uniform" element={<UniformOrder />} />
          <Route path="child-id-order" element={<ChildIdOrder />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="child-id" element={<ChildID />} />
          <Route path="shop" element={<Shop />} />
          <Route path="events" element={<Events />} />
          <Route path="invitations" element={<Invitations />} />
          <Route path="invitaions" element={<Community />} />
          <Route path="messages" element={<Messages />} />
          <Route path="resources" element={<Resources />} />
          <Route path="support" element={<SupportPage />} />
        </Route>

        {/* Checkout Route */}
        <Route
          path="/checkout"
          element={
            <CheckoutRoute>
              <CheckoutPage />
            </CheckoutRoute>
          }
        />
        <Route
          path="/payment-success"
          element={
            <PaymentSuccessRoute>
              <PaymentSuccess />
            </PaymentSuccessRoute>
          }
        />

        <Route
        path="/payment-pending"
        element={
          <ProtectedRoute>
            <PaymentPending />
          </ProtectedRoute>
        }
      />
      </Routes>

      {/* Toast Notifications - Add this */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Define default options
          className: '',
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            maxWidth: '500px',
          },
          // Default options for specific types
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
          loading: {
            duration: Infinity,
          },
        }}
      />
    </Router>
  );
};

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LocalizationProvider>
  );
}

export default App;