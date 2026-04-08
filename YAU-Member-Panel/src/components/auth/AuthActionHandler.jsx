import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../../firebase/config';  // Make sure to configure Firebase
import logo from '../../assets/brand_logo.png';

const AuthActionHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAuthAction = async () => {
      const mode = searchParams.get('mode');
      const oobCode = searchParams.get('oobCode');
      const apiKey = searchParams.get('apiKey');
      const lang = searchParams.get('lang');

      if (!mode || !oobCode) {
        setError('Invalid or incomplete action link');
        setLoading(false);
        return;
      }

      try {
        // Only process if the mode is 'resetPassword'
        if (mode === 'resetPassword' && oobCode) {
          // Verify the password reset code
          await verifyPasswordResetCode(auth, oobCode);
          console.log('✅ Reset code verified');
          
          // Redirect to your custom reset password page
          navigate(`/reset-password?oobCode=${oobCode}&mode=${mode}`, { replace: true });
        }
      } catch (error) {
        console.error('❌ Error handling auth action:', error);
        let errorMessage = 'Invalid or expired link';
        
        // Handle specific Firebase error codes here
        if (error.code === 'auth/expired-action-code') {
          errorMessage = 'This link has expired. Please request a new password reset.';
        } else if (error.code === 'auth/invalid-action-code') {
          errorMessage = 'This link is invalid or has already been used.';
        }
        setError(errorMessage);
      }

      setLoading(false);
    };

    handleAuthAction();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <img src={logo} alt="Logo" className="h-12 w-auto mx-auto mb-6" />
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Processing Request</h2>
            <p className="text-gray-600">Please wait while we verify your link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <img src={logo} alt="Logo" className="h-12 w-auto mx-auto mb-6" />
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Link Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/forgot-password')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Request New Reset Link
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthActionHandler;
