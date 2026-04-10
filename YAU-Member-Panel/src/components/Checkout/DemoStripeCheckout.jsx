// src/components/Checkout/DemoStripeCheckout.jsx
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { APIClient } from '../../firebase/ApiClient';
import { FaCreditCard, FaLock, FaCheck, FaTimes, FaApplePay, FaGooglePay, FaSpinner } from 'react-icons/fa';
import { completeRegistrationAfterPayment } from '../../firebase/apis/postRegistration';

const STRIPE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
if (!STRIPE_KEY) {
  console.error("❌ STRIPE_PUBLISHABLE_KEY is missing from environment variables!");
}
const stripePromise = loadStripe(STRIPE_KEY);

// Real Stripe Checkout Form
const StripeCheckoutForm = ({ planType, planDetails, amount, user, onSuccess, onError, formData, childrenCount }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // 1. Create Payment Intent or Subscription on the server
      // CRITICAL FIX: Monthly memberships now create subscriptions, not payment intents
      console.log('🔄 Creating payment/subscription on click', { planType, amount });
      
      const result = await APIClient.createPaymentIntent(
        amount,
        'usd',
        planType,
        user?.email,
        user?.uid,
        {
          planName: planDetails?.name,
          userEmail: user?.email,
          userName: formData?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          userId: user?.uid,
          childrenCount: childrenCount || 1,
          pricePerChild: planDetails?.basePrice || (amount / (childrenCount || 1)),
          description: `YAU ${planType} membership for ${childrenCount || 1} student(s)`,
        }
      );

      const { clientSecret, paymentIntentId, subscriptionId, customerId, isSubscription } = result;
      
      if (isSubscription) {
        console.log('✅ Subscription created:', subscriptionId, 'Customer:', customerId);
      } else {
        console.log('✅ Payment intent created:', paymentIntentId, 'Customer:', customerId);
      }

      // 2. Confirm the payment on the client (works for both payment intents and subscription payment intents)
      const card = elements.getElement(CardElement);
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            email: user?.email,
            name: formData?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            address: formData?.address ? {
              line1: formData.address.line1,
              city: formData.address.city,
              state: formData.address.state,
              postal_code: formData.address.postal_code,
              country: formData.address.country || 'US'
            } : undefined
          },
        },
      });

      if (error) {
        console.error('❌ Payment failed:', error);
        onError(error);
      } else {
        console.log('✅ Payment succeeded:', paymentIntent);
        
        // For subscriptions, include subscription info in the success callback
        const paymentResult = {
          ...paymentIntent,
          subscriptionId: subscriptionId || null,
          isSubscription: isSubscription || false,
          customerId: customerId,
        };
        
        // Payment method attachment and subscription setup will be handled by the webhook
        onSuccess(paymentResult);
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Details
        </label>
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${loading
            ? 'bg-gray-400 cursor-not-allowed text-gray-600'
            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl'
          }`}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-3">
            <FaSpinner className="animate-spin" />
            Processing Payment...
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <FaLock />
            Pay ${(amount / 100).toFixed(2)}
          </div>
        )}
      </button>
    </form>
  );
};

// Main Component with Dynamic Pricing
const DemoStripeCheckout = ({ planType, planDetails, amount, user, onSuccess, onError, childrenCount = 1 }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('payment');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('stripe'); // Default to real Stripe
  const [registrationData, setRegistrationData] = useState(null);
  const [useRealStripe, setUseRealStripe] = useState(true); // Toggle for real vs demo

  // Enhanced initial form data with registration fallback
  const getInitialFormData = () => {
    // Try to get registration data from sessionStorage
    let regData = null;
    try {
      const pendingReg = sessionStorage.getItem('pendingRegistration');
      if (pendingReg) {
        regData = JSON.parse(pendingReg);
      }
    } catch (error) {
      console.warn('Could not parse registration data:', error);
    }

    // Determine name and email from available sources
    let userName = 'Test User';
    let userEmail = '';

    if (user?.firstName || user?.lastName) {
      // User is logged in - use user data
      userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      userEmail = user.email || '';
    } else if (regData?.memberData) {
      // Registration flow - use registration data
      userName = `${regData.memberData.firstName || ''} ${regData.memberData.lastName || ''}`.trim();
      userEmail = regData.userEmail || '';
    } else if (regData?.userEmail) {
      // Fallback - just have email from registration
      userEmail = regData.userEmail;
      // Try to extract name from email
      const emailName = regData.userEmail.split('@')[0];
      userName = emailName.charAt(0).toUpperCase() + emailName.slice(1).replace(/[._]/g, ' ');
    } else if (user?.email) {
      // Use user email if available
      userEmail = user.email;
      userName = user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1).replace(/[._]/g, ' ');
    }

    // Final fallback
    if (!userName || userName === '') {
      userName = 'Test User';
    }

    return {
      email: userEmail,
      cardNumber: '',
      expiry: '',
      cvc: '',
      name: userName,
      address: {
        line1: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'US'
      }
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  // Use the planDetails directly (already calculated)
  const pricingBreakdown = {
    childrenCount: childrenCount || planDetails?.childrenCount || 1,
    basePrice: planDetails?.basePrice || (planType === 'monthly' ? 50 : 200),
    subtotal: planDetails?.totalPrice || (amount / 100),
    discount: planDetails?.discountAmount || 0,
    discountPercent: planDetails?.discountPercent || 0,
    total: planDetails?.totalPrice || (amount / 100)
  };

  // Debug logging
  console.log('🔍 DemoStripeCheckout Debug:', {
    planType,
    childrenCount,
    amount,
    planDetails,
    pricingBreakdown
  });

  // Effect to load registration data and update form
  useEffect(() => {
    try {
      const pendingReg = sessionStorage.getItem('pendingRegistration');
      if (pendingReg) {
        const regData = JSON.parse(pendingReg);
        setRegistrationData(regData);

        // Update form data with registration info
        setFormData(prev => ({
          ...prev,
          email: regData.userEmail || prev.email,
          name: regData.memberData ?
            `${regData.memberData.firstName || ''} ${regData.memberData.lastName || ''}`.trim() :
            prev.name
        }));

        console.log('📝 Registration data loaded:', {
          email: regData.userEmail,
          name: regData.memberData ?
            `${regData.memberData.firstName} ${regData.memberData.lastName}` :
            'No name data',
          childrenCount: regData.memberData?.students?.length || 1
        });
      }
    } catch (error) {
      console.warn('Could not load registration data:', error);
    }
  }, []);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.name || formData.name.trim() === '') newErrors.name = 'Name is required';

    if (selectedPaymentMethod === 'card') {
      if (!formData.cardNumber) newErrors.cardNumber = 'Card number is required';
      if (!formData.expiry) newErrors.expiry = 'Expiry date is required';
      if (!formData.cvc) newErrors.cvc = 'CVC is required';

      const cardNumber = formData.cardNumber.replace(/\s/g, '');
      if (cardNumber === '4000000000000002') {
        newErrors.cardNumber = 'Your card was declined';
      }
    }

    if (selectedPaymentMethod === 'card') {
      if (!formData.address.line1) newErrors['address.line1'] = 'Address is required';
      if (!formData.address.city) newErrors['address.city'] = 'City is required';
      if (!formData.address.state) newErrors['address.state'] = 'State is required';
      if (!formData.address.postal_code) newErrors['address.postal_code'] = 'ZIP code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!useRealStripe && selectedPaymentMethod !== 'stripe') {
      // Demo payment logic
      if (!validateForm()) {
        return;
      }

      setIsLoading(true);
      setCurrentStep('processing');
      setMessage('');

      try {
        await new Promise(resolve => setTimeout(resolve, 3000));

        const cardNumber = formData.cardNumber.replace(/\s/g, '');

        if (cardNumber === '4000000000000069') {
          throw new Error('Your card has expired.');
        } else if (cardNumber === '4000000000000127') {
          throw new Error('Your card has insufficient funds.');
        }

        setCurrentStep('success');
        setMessage('Payment successful!');

        setTimeout(() => {
          onSuccess && onSuccess({
            id: `pi_demo_${Date.now()}`,
            status: 'succeeded',
            amount: amount,
            currency: 'usd',
            billing_details: {
              name: formData.name,
              email: formData.email,
              address: {
                line1: formData.address.line1,
                city: formData.address.city,
                state: formData.address.state,
                postal_code: formData.address.postal_code,
                country: formData.address.country
              }
            }
          });
        }, 2000);

      } catch (error) {
        setCurrentStep('payment');
        setMessage(error.message || 'Payment failed. Please try again.');
      }

      setIsLoading(false);
    }
  };

  // const handleStripeSuccess = (paymentIntent) => {
  //   setCurrentStep('success');
  //   setMessage('Payment successful!');

  //   setTimeout(() => {
  //     onSuccess && onSuccess(paymentIntent);
  //   }, 2000);
  // };

  const handleStripeError = (error) => {
    setMessage(error.message || 'Payment failed. Please try again.');
    onError && onError(error);
  };

  const handleStripeSuccess = async (paymentIntent) => {
    setCurrentStep("processing");
    setMessage("Payment successful! Completing registration...");

    try {
      // Complete registration after successful payment
      const registrationResult = await completeRegistrationAfterPayment(paymentIntent);

      console.log("✅ Registration completed after payment:", registrationResult);

      setCurrentStep("success");
      setMessage("Registration completed successfully!");

      setTimeout(() => {
        onSuccess && onSuccess(paymentIntent, registrationResult);
      }, 2000);
    } catch (error) {
      console.error("❌ Registration failed after payment:", error);

      // CRITICAL FIX: Since payment succeeded at Stripe, do NOT show "Payment Failed"
      // Instead, show a success message with a notice about account setup
      setCurrentStep("success");
      setMessage("Payment successful, but we encountered an issue setting up your account. Our team has been notified and will complete your setup manually. Please contact support if you don't have access within 24 hours.");

      // Delay the success callback and navigation so the user can read the message
      setTimeout(() => {
        // Still call onSuccess but maybe with a flag or without registrationResult
        onSuccess && onSuccess(paymentIntent, null);
      }, 8000); // Give user more time to read this critical notice
    }
  };

  // Processing screen
  if (currentStep === 'processing') {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800">Processing Your Payment</h3>
          <p className="text-gray-600 mt-2">Please don't close this page...</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-700">
            <div className="font-medium">Charging ${(amount / 100).toFixed(2)} to your card</div>
            <div className="mt-1">•••• •••• •••• {formData.cardNumber.slice(-4)}</div>
            <div className="mt-1 text-xs">{formData.name}</div>
            {childrenCount > 1 && (
              <div className="mt-2 text-xs">
                Payment for {childrenCount} student{childrenCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (currentStep === 'success') {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaCheck className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
        <p className="text-gray-600 mb-6">Redirecting you to your dashboard...</p>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">
            <div>{useRealStripe ? 'Payment' : 'Demo payment'} completed for {formData.name}</div>
            <div className="font-mono">${(amount / 100).toFixed(2)} USD</div>
            {childrenCount > 1 && (
              <div className="mt-1">
                For {childrenCount} student{childrenCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main payment form
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <FaCreditCard className="text-2xl" />
            <h2 className="text-2xl font-bold">Complete Your Payment</h2>
          </div>
          <p className="text-blue-100">{useRealStripe ? 'Secure' : 'Demo'} checkout powered by YAU</p>
          {registrationData && (
            <p className="text-blue-200 text-sm mt-1">
              Completing registration for {formData.name}
            </p>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Order Summary with Dynamic Pricing */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Order Summary</h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Plan</span>
                <span className="font-medium">{planDetails?.name}</span>
              </div>

              {/* Show per-child breakdown for multiple children */}
              {pricingBreakdown.childrenCount > 1 && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Students</span>
                    <span>{pricingBreakdown.childrenCount}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">
                      ${pricingBreakdown.basePrice} × {pricingBreakdown.childrenCount} student{pricingBreakdown.childrenCount > 1 ? 's' : ''}
                      {planType === 'monthly' ? '/month' : ''}
                    </span>
                    <span>${pricingBreakdown.subtotal.toFixed(2)}</span>
                  </div>

                  {pricingBreakdown.discount > 0 && (
                    <div className="flex justify-between items-center text-sm text-green-600">
                      <span>Family discount ({pricingBreakdown.discountPercent}%)</span>
                      <span>-${pricingBreakdown.discount.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}

              {/* Show uniform cost separately for monthly plans */}
              {planDetails?.includeUniform && planType === 'monthly' && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Uniform (Top & Bottom)</span>
                  <span>+${planDetails.uniformPrice.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  {planType === 'monthly' ? 'Monthly Fee' : 'One-time Payment'}
                </span>
                <span className="font-medium">${(amount / 100).toFixed(2)}</span>
              </div>

              {registrationData && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Type</span>
                  <span className="font-medium text-blue-600">Registration</span>
                </div>
              )}

              <div className="border-t pt-3">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span>${(amount / 100).toFixed(2)}</span>
                </div>
                {planType === 'monthly' && (
                  <p className="text-xs text-gray-500 mt-1">
                    {planDetails?.includeUniform ? 
                      `$${pricingBreakdown.basePrice} monthly membership + $${planDetails.uniformPrice} uniform = $${(amount / 100).toFixed(2)} total` :
                      `Recurring monthly charge for ${pricingBreakdown.childrenCount} student${pricingBreakdown.childrenCount > 1 ? 's' : ''}`
                    }
                  </p>
                )}
              </div>
            </div>

            {/* Family Discount Notice */}
            {pricingBreakdown.childrenCount >= 3 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium">
                  🎉 Family Discount Applied!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Save 15% on all plans when you register 3 or more students
                </p>
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  } ${registrationData ? 'bg-gray-50' : ''}`}
                placeholder="john@example.com"
                readOnly={!!registrationData}
              />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
              {registrationData && (
                <p className="text-gray-500 text-xs mt-1">Email from registration</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  } ${registrationData ? 'bg-gray-50' : ''}`}
                placeholder="John Doe"
                readOnly={!!registrationData && registrationData.memberData}
              />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
              {registrationData && registrationData.memberData && (
                <p className="text-gray-500 text-xs mt-1">Name from registration</p>
              )}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment Method</h3>

            {/* Toggle between Real Stripe and Demo */}
            {process.env.NODE_ENV === "development" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentType"
                      checked={useRealStripe}
                      onChange={() => {
                        setUseRealStripe(true);
                        setSelectedPaymentMethod('stripe');
                      }}
                    />
                    <span className="text-sm font-medium">Real Stripe Payment</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentType"
                      checked={!useRealStripe}
                      onChange={() => {
                        setUseRealStripe(false);
                        setSelectedPaymentMethod('card');
                      }}
                    />
                    <span className="text-sm font-medium">Demo Payment</span>
                  </label>
                </div>
              </div>
            )}

            <div className='flex justify-start gap-1'>
              <FaCreditCard className="text-xl" />
              <p className='text-black w-full'>For now we only accept Cards.</p>
            </div>
            <p className="text-gray-400">Apple Pay and Google Pay coming soon...</p>
          </div>

          {/* Real Stripe Payment Form */}
          {useRealStripe && (selectedPaymentMethod === 'stripe' || selectedPaymentMethod === 'card') && (
            !process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-medium">Stripe Configuration Error</p>
                <p className="text-red-600 text-sm">
                  The `REACT_APP_STRIPE_PUBLISHABLE_KEY` is missing. Please add it to your environment variables.
                </p>
              </div>
            ) : (
              <Elements stripe={stripePromise}>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Payment Information</h3>
                  <StripeCheckoutForm
                    planType={planType}
                    planDetails={planDetails}
                    amount={amount}
                    user={user}
                    onSuccess={handleStripeSuccess}
                    onError={handleStripeError}
                    formData={formData}
                    childrenCount={childrenCount}
                  />
                </div>
              </Elements>
            )
          )}

          {/* Demo Card Details (only when not using real Stripe) */}
          {!useRealStripe && selectedPaymentMethod === 'card' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Card Information (Demo)</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Number
                </label>
                <input
                  type="text"
                  value={formData.cardNumber}
                  onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.cardNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  placeholder="1234 5678 9012 3456"
                  maxLength="19"
                />
                {errors.cardNumber && <p className="text-red-600 text-sm mt-1">{errors.cardNumber}</p>}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={formData.expiry}
                    onChange={(e) => handleInputChange('expiry', formatExpiry(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.expiry ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="MM/YY"
                    maxLength="5"
                  />
                  {errors.expiry && <p className="text-red-600 text-sm mt-1">{errors.expiry}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVC
                  </label>
                  <input
                    type="text"
                    value={formData.cvc}
                    onChange={(e) => handleInputChange('cvc', e.target.value.replace(/\D/g, '').slice(0, 3))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.cvc ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="123"
                    maxLength="3"
                  />
                  {errors.cvc && <p className="text-red-600 text-sm mt-1">{errors.cvc}</p>}
                </div>
              </div>

              {/* Billing Address for Demo */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Billing Address</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={formData.address.line1}
                    onChange={(e) => handleInputChange('address.line1', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors['address.line1'] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="123 Main Street"
                  />
                  {errors['address.line1'] && <p className="text-red-600 text-sm mt-1">{errors['address.line1']}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors['address.city'] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      placeholder="New York"
                    />
                    {errors['address.city'] && <p className="text-red-600 text-sm mt-1">{errors['address.city']}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => handleInputChange('address.state', e.target.value.toUpperCase().slice(0, 2))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors['address.state'] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      placeholder="NY"
                      maxLength="2"
                    />
                    {errors['address.state'] && <p className="text-red-600 text-sm mt-1">{errors['address.state']}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={formData.address.postal_code}
                      onChange={(e) => handleInputChange('address.postal_code', e.target.value.replace(/\D/g, '').slice(0, 5))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors['address.postal_code'] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      placeholder="10001"
                      maxLength="5"
                    />
                    {errors['address.postal_code'] && <p className="text-red-600 text-sm mt-1">{errors['address.postal_code']}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {message && !message.includes('successful') && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FaTimes className="text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-red-800">{message}</p>
              </div>
            </div>
          )}

          {/* Demo Submit Button */}
          {!useRealStripe && selectedPaymentMethod === 'card' && (
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${isLoading
                  ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl'
                }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <FaSpinner className="animate-spin" />
                  Processing Payment...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <FaLock />
                  Pay ${(amount / 100).toFixed(2)} (Demo)
                </div>
              )}
            </button>
          )}

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <FaLock />
            <span>{useRealStripe ? 'Your payment is secured by Stripe' : 'This is a demo checkout - no real charges will be made'}</span>
          </div>

          {/* Test Cards Info (Demo only) */}
          {!useRealStripe && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">🧪 Demo Test Cards</h4>
              <div className="text-sm text-yellow-700 space-y-1">
                <p><code>4242 4242 4242 4242</code> - Success</p>
                <p><code>4000 0000 0000 0002</code> - Declined</p>
                <p><code>4000 0000 0000 0069</code> - Expired Card</p>
                <p><code>4000 0000 0000 0127</code> - Insufficient Funds</p>
                <p className="text-xs mt-2">Use any future expiry (e.g., 12/28) and any 3-digit CVC</p>
              </div>
            </div>
          )}

          {/* Registration Debug Info (only in development) */}
          {process.env.NODE_ENV === "development" && registrationData && (
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">🔧 Registration Debug Info</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Email: {registrationData.userEmail}</p>
                <p>Name: {registrationData.memberData?.firstName} {registrationData.memberData?.lastName}</p>
                <p>Plan: {registrationData.selectedPlan}</p>
                <p>Children Count: {registrationData.memberData?.students?.length || 1}</p>
                <p>Calculated Amount: ${(amount / 100).toFixed(2)}</p>
                <p>Payment Mode: {useRealStripe ? 'Real Stripe' : 'Demo'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoStripeCheckout;