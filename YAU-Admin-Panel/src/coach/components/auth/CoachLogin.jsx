// components/auth/CoachLogin.jsx
import React, { useState } from 'react';
import { signInCoach } from '../../../firebase/coachAuth';
import { Eye, EyeOff, User, Lock, LogIn } from 'lucide-react';

const CoachLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const coachData = await signInCoach(formData.email, formData.password);

      // Store user data
      localStorage.setItem('currentUser', JSON.stringify({
        ...coachData,
        userType: 'coach'
      }));

      // Redirect will be handled by App.jsx routing
      window.location.href = '/coach';
    } catch (error) {
      console.error('Coach login error:', error);
      setError(error.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError(''); // Clear error when user starts typing
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Coach Dashboard</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage your teams and communicate with families
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
                <div className="flex-shrink-0 w-5 h-5 text-red-400 mt-0.5">⚠️</div>
                <div className="flex-1">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  placeholder="Enter your coach email"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`block w-full pl-10 pr-12 py-3 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !formData.email || !formData.password}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <LogIn className="h-5 w-5 text-white group-hover:text-blue-100 transition-colors" />
                )}
              </span>
              {loading ? 'Signing in...' : 'Sign in to Coach Dashboard'}
            </button>
          </form>

          {/* Additional Links */}
          <div className="mt-6 space-y-3">
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  // Handle forgot password
                  alert('Please contact administration to reset your password:\ncoaches@yauapp.com or (555) 123-4567');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Forgot your password?
              </button>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <div className="text-center text-sm text-gray-600">
                Need help accessing your account?
                <br />
                <span className="text-blue-600">Contact: coaches@yauapp.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <button
              onClick={() => window.location.href = '/admin-login'}
              className="hover:text-blue-600 transition-colors"
            >
              Admin Login
            </button>
            <span>•</span>
            <button
              onClick={() => window.open('https://members.yauapp.com', '_blank')}
              className="hover:text-blue-600 transition-colors"
            >
              Member Portal
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Youth Athletic Union Coach Portal
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachLogin;