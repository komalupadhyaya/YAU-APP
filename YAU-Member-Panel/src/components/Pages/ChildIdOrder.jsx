import React, { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaUser, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import DemoStripeCheckout from '../Checkout/DemoStripeCheckout';
import { STRIPE_CONFIG } from '../../config/stripe';

const ChildIdOrder = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleOrderChildId = useCallback(async () => {
    if (!selectedStudent) {
      setError('Please select a student');
      return;
    }

    if (!user?.email) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Show Stripe checkout for Child ID
      setShowCheckout(true);
    } catch (error) {
      console.error('Error initiating Child ID order:', error);
      setError('Failed to initiate Child ID order');
    } finally {
      setLoading(false);
    }
  }, [selectedStudent, user?.email]);

  const handlePaymentSuccess = useCallback(async (paymentResult) => {
    console.log('🆔 Child ID payment successful:', paymentResult);
    
    // Mark as successful
    setSuccess(true);
    setShowCheckout(false);
    
    // Store payment completion
    sessionStorage.setItem("childIdPaymentCompleted", Date.now().toString());
    sessionStorage.setItem("recentChildIdStudent", selectedStudent);

    // Reset form
    setSelectedStudent('');
  }, [selectedStudent]);

  const handlePaymentError = useCallback((error) => {
    console.error('🆔 Child ID payment failed:', error);
    setError(error.message || 'Payment failed');
    setShowCheckout(false);
  }, []);

  // Get student options (mock data for now)
  const studentOptions = user?.students || [
    { id: 'student1', firstName: 'John', lastName: 'Doe' },
    { id: 'student2', firstName: 'Jane', lastName: 'Doe' }
  ];

  if (showCheckout) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <DemoStripeCheckout
          amount={1000} // $10.00 in cents
          planType="childId"
          planDetails={{
            name: 'Child ID Service',
            description: 'Child identification service',
            amount: 1000
          }}
          userEmail={user?.email}
          userId={user?.uid}
          metadata={{
            productType: 'childId',
            studentName: selectedStudent,
            studentId: selectedStudent,
            userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email?.split('@')[0]
          }}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onCancel={() => setShowCheckout(false)}
        />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <FaCheckCircle className="mx-auto text-5xl text-green-600 mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">Child ID Order Successful!</h2>
          <p className="text-green-700 mb-4">
            Your Child ID order for <strong>{selectedStudent}</strong> has been placed successfully.
          </p>
          <p className="text-sm text-green-600 mb-6">
            You will receive an email confirmation shortly. The ID will be processed within 3-5 business days.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Order Another ID
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <FaUser className="mx-auto text-5xl text-blue-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Child ID Service</h1>
          <p className="text-gray-600">
            Order a professional child identification card for safety and peace of mind.
          </p>
        </div>

        {/* Pricing */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-800 mb-2">$10</div>
            <div className="text-blue-600">per Child ID</div>
            <div className="text-sm text-blue-500 mt-2">
              Includes photo, contact information, and emergency details
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">What's Included:</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center">
                <FaCheckCircle className="text-green-500 mr-2" />
                Professional photo ID card
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-500 mr-2" />
                Emergency contact information
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-500 mr-2" />
                Medical information (optional)
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-500 mr-2" />
                Durable, wallet-sized card
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Processing Time:</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Photo session scheduled within 1 week</li>
              <li>• Card production: 3-5 business days</li>
              <li>• Pickup available at team location</li>
              <li>• Digital copy emailed for immediate use</li>
            </ul>
          </div>
        </div>

        {/* Order Form */}
        <div className="border-t pt-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Place Your Order</h3>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <FaExclamationTriangle className="text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Student Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Student
              </label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Choose a student...</option>
                {studentOptions.map(student => (
                  <option key={student.id} value={`${student.firstName} ${student.lastName}`}>
                    {student.firstName} {student.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Order Button */}
            <button
              onClick={handleOrderChildId}
              disabled={loading || !selectedStudent}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <FaSpinner className="animate-spin mr-2" />
                  Processing...
                </div>
              ) : (
                `Order Child ID - $10.00`
              )}
            </button>

            <p className="text-sm text-gray-500 text-center">
              Secure payment processed by Stripe. You will receive a confirmation email after purchase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChildIdOrder;