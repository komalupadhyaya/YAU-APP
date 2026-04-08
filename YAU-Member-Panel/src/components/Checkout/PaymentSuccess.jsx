import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MembershipService } from '../../firebase/apis/api-membership';
import { FaCheck, FaHome, FaReceipt, FaSpinner } from 'react-icons/fa';
import PaymentAPIService from '../../firebase/apis/api-payment-history';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser, setupPostRegistrationUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const hasProcessedRef = useRef(false);
  const redirectTimeoutRef = useRef(null);
  const initialProcessingRef = useRef(false);
  
  const { planType, planDetails, paymentIntentId, registrationData, isNewUser, userUID } = location.state || {};

  // ✅ FIXED: Payment processing already happened in CheckoutPage
  // This component only needs to:
  // 1. Create payment history record
  // 2. Update user context if needed
  // 3. Show success message
  useEffect(() => {
    // Only run once
    if (initialProcessingRef.current || hasProcessedRef.current) {
      return;
    }

    const hasRequiredData = (user?.email || registrationData?.userEmail) && planType && paymentIntentId;
    
    if (!hasRequiredData) {
      console.warn('⚠️ Missing required data for payment success:', {
        hasUser: !!user?.email,
        hasRegistration: !!registrationData?.userEmail,
        hasPlanType: !!planType,
        hasPaymentIntent: !!paymentIntentId
      });
      
      setError('Missing payment information. Please contact support.');
      setIsProcessing(false);
      return;
    }

    const finalizeSucessDisplay = async () => {
      initialProcessingRef.current = true;
      hasProcessedRef.current = true;

      const userEmail = user?.email || registrationData?.userEmail;
      const userId = user?.uid || registrationData?.userUID || userUID;

      try {
        console.log('✅ Payment already processed, finalizing success display...');

        // Step 1: Create payment history record
          console.log('📝 Creating payment history record...');
          
          try {
            await PaymentAPIService.createPaymentRecord({
              userId: userId,
              userEmail: userEmail,
              amount: planDetails?.amount || planDetails?.totalPrice * 100 || 0,
              currency: 'USD',
              paymentMethod: 'card',
              paymentStatus: 'completed',
              paymentDate: new Date(),
              planType: planType,
              planName: planDetails?.name || `${planType} plan`,
              paymentIntentId: paymentIntentId,
              transactionType: planType === 'monthly' ? 'subscription' : 'one_time',
              metadata: {
                isNewUser: isNewUser || !!registrationData,
                registrationData: registrationData ? true : false
              }
            });
            
            console.log('✅ Payment history record created successfully');
          } catch (historyError) {
            console.error('⚠️ Could not create payment history record:', historyError);
            // Don't fail the whole process if history recording fails
          }

          // Step 2: Clear session storage
          console.log('🗑️ Clearing session storage');
          sessionStorage.removeItem("pendingRegistration");
          sessionStorage.setItem("paymentCompleted", Date.now().toString());

          // Step 3: Update user context if needed (for display purposes)
          if (user && updateUser) {
            updateUser({
              isPaidMember: true,
              membershipType: planType,
              membershipActivatedAt: new Date(),
              lastPaymentDate: new Date(),
              paymentStatus: 'active'
            });
          }
          else if (registrationData && setupPostRegistrationUser && updateUser) {
            console.log('🔄 Setting up user context after registration');
            await setupPostRegistrationUser(registrationData.userUID, registrationData.userEmail);
            
            updateUser({
              isPaidMember: true,
              membershipType: planType,
              membershipActivatedAt: new Date(),
              lastPaymentDate: new Date(),
              paymentStatus: 'active',
              ...(registrationData.memberData && {
                firstName: registrationData.memberData.firstName,
                lastName: registrationData.memberData.lastName,
                students: registrationData.memberData.students
              })
            });
        }

        setIsProcessing(false);

        // For new registrations, automatically redirect to dashboard after a brief success message
        if (isNewUser || registrationData) {
          console.log('🚀 New registration completed - redirecting to dashboard in 3 seconds');
          setRedirecting(true);
          
          redirectTimeoutRef.current = setTimeout(() => {
            console.log('➡️ Redirecting to dashboard...');
            navigate('/', { 
              replace: true,
              state: { 
                justRegistered: true, 
                membershipType: planType,
                showWelcome: true 
              }
            });
          }, 3000);
        }

      } catch (error) {
        console.error('❌ Error finalizing payment success:', error);
        setError(error.message || 'Failed to finalize payment');
        setIsProcessing(false);
        hasProcessedRef.current = false; // Reset on error
      }
    };

    console.log('🚀 Starting payment success finalization...');
    finalizeSucessDisplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - run only once on mount

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // ✅ FIXED: Add validation for location state
// At the top of PaymentSuccess component, add this validation:
useEffect(() => {
  // If we don't have location state, check if we have registration data
  if (!location.state) {
    const pendingRegistration = sessionStorage.getItem("pendingRegistration");
    if (pendingRegistration) {
      console.log('⚠️ No location state but found pending registration, checking for recent payment...');
      
      // Check if we have a recent payment completion marker
      const paymentCompleted = sessionStorage.getItem("paymentCompleted");
      if (!paymentCompleted) {
        console.warn('⚠️ No payment completion found, redirecting to checkout');
        navigate('/checkout', { replace: true });
        return;
      }
    } else {
      console.warn('⚠️ No payment success data found, redirecting to dashboard');
      navigate('/', { replace: true });
      return;
    }
  }
}, [location.state, navigate]);

  // Processing state with different messages for registration vs upgrade
  if (isProcessing) {
    const isNewRegistration = !!registrationData;
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-2xl text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800">
            {isNewRegistration ? 'Setting Up Your Account' : 'Processing Your Membership'}
          </h3>
          <p className="text-gray-600 mt-2">
            {isNewRegistration ? 'Creating your YAU membership...' : 'Updating your account...'}
          </p>
          {isNewRegistration && (
            <div className="mt-4 text-sm text-blue-600">
              <p>🎉 Welcome to Youth Athlete University!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-red-800 mb-2">Update Failed</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isNewRegistration = !!registrationData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Success Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-8 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {redirecting && isNewRegistration ? (
              <FaSpinner className="w-10 h-10 text-white animate-spin" />
            ) : (
              <FaCheck className="w-10 h-10 text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {isNewRegistration ? 'Welcome to YAU!' : 'Payment Successful!'}
          </h2>
          <p className="text-green-100">
            {redirecting && isNewRegistration ? 'Taking you to your dashboard...' : 'Young Athlete University'}
          </p>
        </div>

        {/* Success Content */}
        <div className="p-8">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {isNewRegistration ? 'Your account is ready!' : 'Your membership is now active'}
            </h3>
            <p className="text-gray-600">
              {isNewRegistration 
                ? 'Thank you for registering! You now have full access to all YAU programs and features.' 
                : 'Thank you for joining YAU! You now have access to all our programs and features.'
              }
            </p>
            {redirecting && isNewRegistration && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-700 text-sm flex items-center justify-center gap-2">
                  <FaSpinner className="animate-spin" />
                  Redirecting to your dashboard in a few seconds...
                </p>
              </div>
            )}
          </div>

          {/* Plan Details */}
          {planDetails && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-800 mb-2">Plan Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan:</span>
                  <span className="font-medium">{planDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">${(planDetails.amount / 100).toFixed(2)}</span>
                </div>
                {planDetails.interval && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Billing:</span>
                    <span className="font-medium">Every {planDetails.interval}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-green-600 font-medium">Active</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons - Hidden during redirect for new registrations */}
          {!(redirecting && isNewRegistration) && (
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <FaHome />
                Go to Dashboard
              </button>
              
              <button 
                onClick={() => navigate('/payments')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <FaReceipt />
                View Payment History
              </button>
            </div>
          )}

          {/* Next Steps */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">What's Next?</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Check out the <b>Member Dashboard</b></li>
              <li>• View your student's <b>team messages</b></li>
              <li>• Access upcoming <b>game schedules</b></li>
              <li>• Shop for exclusive <b>parent gear</b></li>
              <li>• Join us for <b>community events</b></li>
              <li>• Explore helpful <b>parent resources</b></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;