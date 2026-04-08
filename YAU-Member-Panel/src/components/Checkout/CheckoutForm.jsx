// components/Checkout/CheckoutForm.jsx
import React, { useState, useEffect } from 'react';
import {
  PaymentElement,
  AddressElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useAuth } from '../../context/AuthContext';
import { FaCreditCard, FaLock, FaCheck, FaTimes } from 'react-icons/fa';

const CheckoutForm = ({ 
  amount, 
  planType, 
  onSuccess, 
  onError, 
  planDetails 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('CheckoutForm mounted with:', {
      stripe: !!stripe,
      elements: !!elements,
      amount,
      planType,
      user: user?.email
    });
  }, [stripe, elements, amount, planType, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔄 Form submitted');

    if (!stripe || !elements) {
      setMessage('Stripe has not loaded yet. Please wait and try again.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // For testing purposes, we'll simulate a successful payment
      console.log('💳 Processing payment...');
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful payment for testing
      const mockPaymentIntent = {
        id: `pi_test_${Date.now()}`,
        status: 'succeeded',
        amount: amount,
        currency: 'usd'
      };

      setMessage('Payment successful! (Test Mode)');
      console.log('✅ Mock payment successful:', mockPaymentIntent);
      
      setTimeout(() => {
        onSuccess && onSuccess(mockPaymentIntent);
      }, 1500);

    } catch (err) {
      console.error('❌ Payment error:', err);
      setMessage('Payment failed. Please try again.');
      onError && onError(err);
    }

    setIsLoading(false);
  };

  // Show loading state if Stripe hasn't loaded
  if (!stripe || !elements) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading secure payment form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <FaCreditCard className="text-2xl" />
          <h2 className="text-2xl font-bold">Complete Your Payment</h2>
        </div>
        <p className="text-blue-100">Secure checkout powered by Stripe</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Order Summary */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Plan</span>
              <span className="font-medium">{planDetails?.name}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                {planType === 'monthly' ? 'Monthly Fee' : 'One-time Payment'}
              </span>
              <span className="font-medium">${(amount / 100).toFixed(2)}</span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span>${(amount / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Customer Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Test User'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Billing Address</h3>
          <div className="border border-gray-300 rounded-lg p-4">
            <AddressElement 
              options={{
                mode: 'billing',
                allowedCountries: ['US'],
              }}
              onReady={() => {
                console.log('✅ AddressElement ready');
                setIsReady(true);
              }}
              onLoadError={(error) => {
                console.error('❌ AddressElement error:', error);
              }}
            />
          </div>
        </div>

        {/* Payment Method Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FaCreditCard />
            Payment Method
          </h3>
          
          <div className="border border-gray-300 rounded-lg p-4">
            <PaymentElement
              id="payment-element"
              onReady={() => {
                console.log('✅ PaymentElement ready');
                setIsReady(true);
              }}
              onLoadError={(error) => {
                console.error('❌ PaymentElement error:', error);
                setMessage('Failed to load payment form. Please refresh the page.');
              }}
              options={{
                layout: 'tabs',
                paymentMethodOrder: ['card', 'apple_pay', 'google_pay']
              }}
            />
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-lg flex items-start gap-3 ${
            message.includes('successful') 
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.includes('successful') ? (
              <FaCheck className="text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <FaTimes className="text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <p>{message}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !stripe || !elements}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed text-gray-600'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              Processing Payment...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <FaLock />
              Pay ${(amount / 100).toFixed(2)} (Test Mode)
            </div>
          )}
        </button>

        {/* Security Notice */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <FaLock />
          <span>Your payment information is encrypted and secure</span>
        </div>

        {/* Test Mode Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">🧪 Test Mode Active</h4>
          <p className="text-sm text-yellow-700 mb-2">
            This is a demo checkout. No real charges will be made.
          </p>
          <div className="text-sm text-yellow-700">
            <p><strong>Test Cards:</strong></p>
            <p>• <code>4242424242424242</code> - Success</p>
            <p>• <code>4000000000000002</code> - Decline</p>
            <p>• Use any future expiry date and 3-digit CVC</p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutForm;