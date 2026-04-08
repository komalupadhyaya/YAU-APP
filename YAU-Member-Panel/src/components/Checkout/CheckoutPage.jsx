// src/components/Checkout/CheckoutPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { STRIPE_CONFIG } from '../../config/stripe';
import DemoStripeCheckout from './DemoStripeCheckout';
import { FaArrowLeft, FaShieldAlt, FaSpinner } from 'react-icons/fa';
import { MembershipService } from '../../firebase/apis/api-membership';
import { APIClient } from '../../firebase/ApiClient';
import { trackReferralRegistration } from '../../utils/inviteTracking';

const CheckoutPage = () => {
  const { user, updateUser, setupPostRegistrationUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [registrationData, setRegistrationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [checkoutUser, setCheckoutUser] = useState(null);
  const [dynamicPlanDetails, setDynamicPlanDetails] = useState(null); // ✅ NEW: Store calculated plan details
  const [childrenCount, setChildrenCount] = useState(1); // ✅ NEW: Track children count

  // Helper function to create uniform orders from registration data
  const createUniformOrdersFromRegistration = async (registrationData, paymentIntentId) => {
    try {
      const { memberData, userEmail, userUID } = registrationData;
      
      if (!memberData.students || !Array.isArray(memberData.students)) {
        throw new Error('No students found in registration data');
      }

      // Create uniform orders for each student
      for (const student of memberData.students) {
        if (student.uniformTop || student.uniformBottom) {
          const uniformOrderData = {
            studentId: student.uid || `${userUID}_${student.firstName}`,
            studentName: `${student.firstName} ${student.lastName}`,
            parentId: userUID,
            parentName: `${memberData.firstName} ${memberData.lastName}`,
            parentEmail: userEmail,
            parentPhone: memberData.phone || '',
            team: memberData.sport || '',
            ageGroup: student.ageGroup || '',
            uniformTop: student.uniformTop || memberData.uniformTop,
            uniformBottom: student.uniformBottom || memberData.uniformBottom,
            paymentIntentId: paymentIntentId,
            paymentStatus: 'completed',
            orderSource: 'registration'
          };

          console.log('👕 Creating uniform order for student:', uniformOrderData.studentName);
          
          await APIClient.createUniformOrder(uniformOrderData);
        }
      }

      console.log('✅ All uniform orders created successfully');
    } catch (error) {
      console.error('❌ Error creating uniform orders:', error);
      throw error;
    }
  };

  // Parse URL parameters
  const urlParams = new URLSearchParams(location.search);
  const planFromUrl = urlParams.get('plan');
  const emailFromUrl = urlParams.get('email');

  useEffect(() => {
    const initializeCheckout = async () => {
      try {
        setLoading(true);
        console.log('🔍 Initializing checkout page');

        let userEmail = null;
        let userData = null;
        let regData = null;
        let calculatedChildrenCount = 1; // Default

        // Priority 1: Check for pending registration data
        const pendingRegistration = sessionStorage.getItem('pendingRegistration');
        if (pendingRegistration) {
          try {
            regData = JSON.parse(pendingRegistration);
            console.log('📋 Found pending registration data:', regData);

            setRegistrationData(regData);
            setSelectedPlan(regData.selectedPlan || planFromUrl || 'monthly');

            userEmail = regData.userEmail;

            // ✅ FIXED: Get children count from registration data
            if (regData.memberData?.students && Array.isArray(regData.memberData.students)) {
              calculatedChildrenCount = regData.memberData.students.length;
              console.log('👶 Children count from registration students:', calculatedChildrenCount);
            } else if (regData.memberData?.children && Array.isArray(regData.memberData.children)) {
              calculatedChildrenCount = regData.memberData.children.length;
              console.log('👶 Children count from registration children:', calculatedChildrenCount);
            }

            userData = {
              email: regData.userEmail,
              uid: regData.userUID,
              firstName: regData.memberData?.firstName,
              lastName: regData.memberData?.lastName,
              students: regData.memberData?.students,
              childrenCount: calculatedChildrenCount
            };

            if (!user && regData.userUID && regData.userEmail) {
              console.log('👤 Setting up user context from registration:', regData.userEmail);
              try {
                await setupPostRegistrationUser(regData.userUID, regData.userEmail);
              } catch (authError) {
                console.warn('⚠️ Could not set up user context, continuing with registration data:', authError);
              }
            }
          } catch (parseError) {
            console.error('❌ Error parsing registration data:', parseError);
            sessionStorage.removeItem('pendingRegistration');
          }
        }

        // Priority 2: Use authenticated user
        if (!userEmail && user?.email) {
          userEmail = user.email;
          userData = user;

          // Get children count from user data
          if (user.students && Array.isArray(user.students)) {
            calculatedChildrenCount = user.students.length;
          } else if (user.children && Array.isArray(user.children)) {
            calculatedChildrenCount = user.children.length;
          }

          userData.childrenCount = calculatedChildrenCount;
          setSelectedPlan(planFromUrl || 'monthly');
          console.log('👤 Using authenticated user with', calculatedChildrenCount, 'children');
        }

        // Priority 3: Use URL parameter email
        if (!userEmail && emailFromUrl) {
          userEmail = emailFromUrl;
          userData = { email: emailFromUrl, childrenCount: 1 };
          calculatedChildrenCount = 1;
          setSelectedPlan(planFromUrl || 'monthly');
          console.log('🔗 Using email from URL:', emailFromUrl);
        }

        // Final validation
        if (!userEmail) {
          throw new Error('No user email found. Please go back and try again.');
        }

        const plan = selectedPlan || planFromUrl || 'monthly';
        if (!STRIPE_CONFIG.plans[plan]) {
          throw new Error(`Invalid plan selected: ${plan}`);
        }

        // ✅ FIXED: Set children count state
        setChildrenCount(calculatedChildrenCount);

        console.log('💰 Calculating pricing for:', { plan, childrenCount: calculatedChildrenCount });

        // ✅ FIXED: Calculate dynamic pricing based on children count
        console.log('🔍 CheckoutPage Debug - Before calculation:', {
          plan,
          calculatedChildrenCount,
          includeUniform: regData?.includeUniform,
          regData
        });

        const calculatedPlanDetails = STRIPE_CONFIG.getPlanDetails(
          plan,
          calculatedChildrenCount,
          regData?.includeUniform || false  // Pass uniform selection
        );

        if (!calculatedPlanDetails) {
          throw new Error(`Could not calculate pricing for plan: ${plan}`);
        }

        console.log('💵 Dynamic pricing calculated:', {
          basePricePerChild: calculatedPlanDetails.basePrice,
          totalPrice: calculatedPlanDetails.totalPrice,
          childrenCount: calculatedPlanDetails.childrenCount,
          hasDiscount: calculatedPlanDetails.hasDiscount,
          discountAmount: calculatedPlanDetails.discountAmount,
          finalAmount: calculatedPlanDetails.amount,
          includeUniform: calculatedPlanDetails.includeUniform,
          uniformPrice: calculatedPlanDetails.uniformPrice
        });

        // ✅ FIXED: Set the calculated plan details
        setDynamicPlanDetails(calculatedPlanDetails);

        // Set checkout user data
        setCheckoutUser({
          ...userData,
          childrenCount: calculatedChildrenCount
        });

        console.log('✅ Checkout initialized with dynamic pricing:', {
          userEmail,
          plan,
          childrenCount: calculatedChildrenCount,
          originalPrice: STRIPE_CONFIG.plans[plan].amount / 100,
          finalPrice: calculatedPlanDetails.totalPrice
        });

      } catch (error) {
        console.error('❌ Error initializing checkout:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeCheckout();
  }, [user, setupPostRegistrationUser, planFromUrl, emailFromUrl, selectedPlan]);


  const handlePaymentSuccess = useCallback(async (paymentIntent, registrationResult = null) => {
  try {
    console.log('✅ Processing payment success:', paymentIntent.id);

    const userEmail = checkoutUser?.email || user?.email || registrationData?.userEmail || emailFromUrl;

    if (!userEmail) {
      throw new Error('User email not found for payment processing');
    }

    // If this was a registration flow (NEW USER)
    if (registrationData) {
      console.log('🔄 Processing NEW USER registration after payment');

      if (!registrationResult) {
        throw new Error('No registration result received after payment');
      }

      console.log('✅ Registration completed successfully:', {
        userUID: registrationResult.userUID,
        students: registrationResult.processingResults?.length || 0
      });

      // ✅ Set up user context after successful registration
      try {
        console.log('🔐 Setting up user context for new user:', registrationResult.userUID);

        // Use your auth context to set up user data
        if (setupPostRegistrationUser) {
          await setupPostRegistrationUser(registrationResult.userUID, userEmail);
          console.log('✅ User context set up successfully');
        } else {
          console.warn('⚠️ setupPostRegistrationUser not available');
        }
      } catch (setupError) {
        console.warn('⚠️ User context setup failed:', setupError);
      }

      // ✅ Track referral registration immediately (backend now allows without auth)
      try {
        console.log('🔍 Checking for referral tracking after registration...');

        const storedReferralCode = sessionStorage.getItem('referralCode');

        if (!storedReferralCode) {
          console.log('ℹ️ No referral code found - user was not referred');
        } else {
          const userName = registrationData.memberData?.firstName && registrationData.memberData?.lastName
            ? `${registrationData.memberData.firstName} ${registrationData.memberData.lastName}`
            : registrationData.parentFirst && registrationData.parentLast
            ? `${registrationData.parentFirst} ${registrationData.parentLast}`
            : 'YAU Member';

          console.log('👤 Tracking referral immediately:', {
            referralCode: storedReferralCode,
            userId: registrationResult.userUID,
            email: userEmail,
            name: userName
          });

          // ✅ FIXED: Track immediately - backend no longer requires auth token
          const trackingResult = await trackReferralRegistration({
            userId: registrationResult.userUID,
            email: userEmail,
            name: userName
          });

          if (trackingResult) {
            console.log('✅ Referral tracked successfully:', trackingResult);
          } else {
            console.warn('⚠️ Referral tracking failed - check backend logs');
          }
        }
      } catch (referralError) {
        console.error('❌ Error tracking referral:', referralError);
        // Don't fail registration if referral tracking fails
      }


      // Clear pending registration
      sessionStorage.removeItem('pendingRegistration');

    } else {
      // ✅ EXISTING USER upgrade flow
      console.log('🔄 Processing EXISTING USER upgrade');

      await MembershipService.upgradeMembership(userEmail, {
        planType: selectedPlan,
        paymentIntentId: paymentIntent.id,
        paymentMethod: 'card'
      });

      console.log('✅ Existing user membership upgraded successfully');
    }

    // Navigate to success page
    navigate('/payment-success', {
      state: {
        planType: selectedPlan,
        planDetails: dynamicPlanDetails || STRIPE_CONFIG.plans[selectedPlan],
        paymentIntentId: paymentIntent.id,
        registrationData: registrationData,
        userEmail: userEmail,
        isNewUser: !!registrationData, // Pass this info to success page
        userUID: registrationResult?.userUID // Pass UID for new users
      }
    });

  } catch (error) {
    console.error('❌ Error handling payment success:', error);
    alert(`Error: ${error.message}`);
  }
}, [checkoutUser, user, registrationData, selectedPlan, emailFromUrl, navigate, dynamicPlanDetails, setupPostRegistrationUser]);

  const handlePaymentError = useCallback((error) => {
    console.error('❌ Payment error:', error);

    let errorMessage = 'Payment failed. Please try again.';

    if (error?.message) {
      if (error.message.includes('card')) {
        errorMessage = 'Card payment failed. Please check your card details and try again.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = error.message;
      }
    }

    setError(errorMessage);
  }, []);

  const handleGoBack = useCallback(() => {
    if (registrationData) {
      navigate('/register');
    } else {
      navigate('/dashboard');
    }
  }, [registrationData, navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Setting up checkout...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Checkout Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={handleGoBack}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Validate we have the required data
  if (!checkoutUser || !dynamicPlanDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Preparing checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Plan Summary with Dynamic Pricing */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="hidden bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-gray-800">{dynamicPlanDetails.name}</h4>
              <p className="text-gray-600 text-sm">{dynamicPlanDetails.description}</p>
              {registrationData && (
                <p className="text-blue-600 text-sm mt-1">
                  ✨ Full Access to Your to Membership Panel and Team Info 
                </p>
              )}

              {/* ✅ FIXED: Show pricing breakdown for multiple children */}
              {childrenCount > 1 && (
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <p>• {childrenCount} students × ${dynamicPlanDetails.basePrice}/
                    {selectedPlan === 'monthly' ? 'month' : 'one-time'} each</p>
                  {dynamicPlanDetails.hasDiscount && (
                    <p className="text-green-600">
                      • 15% family discount applied: -${dynamicPlanDetails.discountAmount.toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800">
                ${dynamicPlanDetails.totalPrice.toFixed(2)}
              </div>
              {selectedPlan === 'monthly' && (
                <div className="text-gray-500 text-sm">
                  per month ({childrenCount} student{childrenCount > 1 ? 's' : ''})
                </div>
              )}
              {childrenCount > 1 && (
                <div className="text-xs text-gray-500 mt-1">
                  ${dynamicPlanDetails.basePrice} per student
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ✅ FIXED: Pass the correct calculated amount and all required props */}
        <DemoStripeCheckout
          planType={selectedPlan}
          planDetails={dynamicPlanDetails} // Pass the calculated plan details
          amount={dynamicPlanDetails.amount} // Pass the calculated amount in cents
          user={checkoutUser}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          childrenCount={childrenCount} // Pass children count
        />
      </div>
    </div>
  );
};

export default CheckoutPage;