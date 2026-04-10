import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { APIClient } from '../../firebase/ApiClient';
import { useAuth } from '../../context/AuthContext';
import { FaCreditCard, FaLock, FaCheck, FaTimes, FaSpinner, FaShoppingCart, FaTshirt } from 'react-icons/fa';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Uniform Order Checkout Form
const UniformCheckoutForm = ({ uniformData, user, onSuccess, onError, availableStudents = [], selectedStudentId = '' }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  // const [clientSecret, setClientSecret] = useState('');

  // Create payment intent for uniform order
  // useEffect(() => {
  //   const createPaymentIntent = async () => {
  //     try {
  //       console.log('🔄 Creating payment intent for uniform order', {
  //         amount: uniformData.totalAmount,
  //         userEmail: user?.email
  //       });

  //       // Get selected student info for payment metadata
  //       const selectedStudent = availableStudents.find(student => student.uid === selectedStudentId);
  //       const studentName = selectedStudent?.fullName || selectedStudent?.displayName || 'Student';
  //       const studentId = selectedStudent?.uid || selectedStudentId || user?.uid;
        
  //       const result = await APIClient.createPaymentIntent(
  //         uniformData.totalAmount,
  //         'usd',
  //         'uniform',
  //         user?.email,
  //         user?.uid,
  //         {
  //           productType: 'uniform',
  //           uniformTop: uniformData.topSize,
  //           uniformBottom: uniformData.bottomSize,
  //           quantity: uniformData.quantity || 1,
  //           userEmail: user?.email,
  //           userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email?.split('@')[0],
  //           userId: user?.uid,
  //           studentId: studentId,
  //           studentName: studentName,
  //           selectedStudentId: selectedStudentId,
  //           description: `YAU Uniform Order for ${studentName} - Top: ${uniformData.topSize}, Bottom: ${uniformData.bottomSize}`
  //         }
  //       );

  //       setClientSecret(result.clientSecret);
  //       console.log('✅ Payment intent created for uniform order:', result.paymentIntentId);

  //     } catch (error) {
  //       console.error('❌ Error creating payment intent for uniform:', error);
  //       onError(error);
  //     }
  //   };

  //   if (uniformData.totalAmount && user?.email) {
  //     createPaymentIntent();
  //   }
  // }, [uniformData, user, onError]);

  const handleSubmit = async (event) => {
    event.preventDefault();


     // Get selected student info for payment metadata
        const selectedStudent = availableStudents.find(student => student.uid === selectedStudentId);
        const studentName = selectedStudent?.fullName || selectedStudent?.displayName || 'Student';
        const studentId = selectedStudent?.uid || selectedStudentId || user?.uid;
        
          const { clientSecret, paymentIntentId, customerId } = await APIClient.createPaymentIntent(
          uniformData.totalAmount,
          'usd',
          'uniform',
          user?.email,
          user?.uid,
          {
            productType: 'uniform',
            uniformTop: uniformData.topSize,
            uniformBottom: uniformData.bottomSize,
            quantity: uniformData.quantity || 1,
            userEmail: user?.email,
            userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email?.split('@')[0],
            userId: user?.uid,
            studentId: studentId,
            studentName: studentName,
            selectedStudentId: selectedStudentId,
            description: `YAU Uniform Order for ${studentName} - Top: ${uniformData.topSize}, Bottom: ${uniformData.bottomSize}`
          }
        );

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setLoading(true);

    try {
      const card = elements.getElement(CardElement);

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            email: user?.email,
            name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email?.split('@')[0],
          },
        },
      });

      if (error) {
        console.error('❌ Uniform payment failed:', error);
        onError(error);
      } else {
        console.log('✅ Uniform payment succeeded:', paymentIntent);
        onSuccess(paymentIntent);
      }
    } catch (error) {
      console.error('❌ Uniform payment error:', error);
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
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
        disabled={!stripe || loading }
        className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
          loading 
            ? 'bg-gray-400 cursor-not-allowed text-gray-600'
            : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl'
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
            Pay ${(uniformData.totalAmount / 100).toFixed(2)}
          </div>
        )}
      </button>
    </form>
  );
};

// Main Uniform Order Component
const UniformOrder = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('order-history'); // Start with order-history to show status first
  const [step, setStep] = useState('selection'); // selection, payment, processing, success, error
  const [message, setMessage] = useState('');
  const [uniformOrders, setUniformOrders] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [uniformData, setUniformData] = useState({
    topSize: '',
    bottomSize: '',
    quantity: 1,
    pricePerSet: 75, // $75 per uniform set
    totalAmount: 7500, // $75.00 in cents
  });
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [includedUniforms, setIncludedUniforms] = useState([]);
  const [isLoadingMembership, setIsLoadingMembership] = useState(true);

  // Uniform size options
  const uniformOptions = [
    { value: "Youth XS", label: "Youth XS" },
    { value: "Youth S", label: "Youth S" },
    { value: "Youth M", label: "Youth M" },
    { value: "Youth L", label: "Youth L" },
    { value: "Adult XS", label: "Adult XS" },
    { value: "Adult S", label: "Adult S" },
    { value: "Adult M", label: "Adult M" },
    { value: "Adult L", label: "Adult L" },
    { value: "Adult XL", label: "Adult XL" },
    { value: "Adult 2XL", label: "Adult 2XL" },
  ];

  const [errors, setErrors] = useState({});

  // Load membership status, uniform order history and available students on component mount
  useEffect(() => {
    if (user?.email) {
      loadMembershipStatus();
      loadUniformOrderHistory();
      loadAvailableStudents();
    }
  }, [user]);

  // Load user's membership status and determine uniform entitlements
  const loadMembershipStatus = async () => {
    try {
      setIsLoadingMembership(true);
      console.log('🔍 Loading membership status for user:', user?.email);
      
      if (!user?.email || !user?.isPaidMember) {
        console.log('⚠️ User not authenticated or not a paid member');
        setMembershipStatus({
          isPaidMember: false,
          membershipType: null,
          hasUniformIncluded: false,
          canOrderUniforms: false
        });
        setIsLoadingMembership(false);
        return;
      }
      
      // Determine membership type and uniform entitlements based on user data
      const membershipType = user.membershipType || 'monthly';
      const isOneTimePlan = membershipType === 'one_time' || membershipType === 'annual';
      const isMonthlyPlan = membershipType === 'monthly';
      
      console.log('📊 User membership details:', {
        email: user.email,
        isPaidMember: user.isPaidMember,
        membershipType: membershipType,
        isOneTimePlan,
        isMonthlyPlan
      });
      
      // $200 one-time plan includes uniform, $50 monthly plan does not
      const hasUniformIncluded = isOneTimePlan && user.isPaidMember;
      const canOrderUniforms = (isMonthlyPlan && user.isPaidMember) || !hasUniformIncluded;
      
      setMembershipStatus({
        isPaidMember: user.isPaidMember,
        membershipType: membershipType,
        hasUniformIncluded: hasUniformIncluded,
        canOrderUniforms: canOrderUniforms,
        planAmount: isOneTimePlan ? 200 : 50
      });
      
      // If user has uniform included, create/load their included uniform record
      if (hasUniformIncluded) {
        await loadOrCreateIncludedUniforms();
      }
      
      console.log('✅ Membership status loaded:', {
        hasUniformIncluded,
        canOrderUniforms,
        membershipType
      });
      
    } catch (error) {
      console.error('❌ Error loading membership status:', error);
      // Fallback to safe defaults
      setMembershipStatus({
        isPaidMember: false,
        membershipType: 'monthly',
        hasUniformIncluded: false,
        canOrderUniforms: false
      });
    } finally {
      setIsLoadingMembership(false);
    }
  };

  // Load or create included uniforms for $200 one-time plan members
  const loadOrCreateIncludedUniforms = async () => {
    try {
      console.log('👕 Loading/creating included uniforms for $200 plan member');
      
      // Check if user already has included uniform records
      const existingOrders = await APIClient.getUniformOrdersByParent(user.uid);
      const includedUniformOrders = existingOrders.filter(order => 
        order.orderSource === 'membership_included' || order.isIncluded === true
      );
      
      if (includedUniformOrders.length > 0) {
        console.log('✅ Found existing included uniforms:', includedUniformOrders.length);
        setIncludedUniforms(includedUniformOrders);
        return;
      }
      
      // If no included uniforms exist, create them for each student
      if (availableStudents.length === 0) {
        // Wait for students to be loaded first
        console.log('⏳ Waiting for students to be loaded before creating included uniforms');
        return;
      }
      
      console.log('🆕 Creating included uniform records for', availableStudents.length, 'students');
      const createdIncludedUniforms = [];
      
      for (const student of availableStudents) {
        try {
          const includedUniformData = {
            studentId: student.uid,
            studentName: student.fullName || student.displayName,
            parentId: user.uid,
            parentName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email?.split('@')[0],
            parentEmail: user.email,
            team: student.sport || 'YAU',
            ageGroup: student.ageGroup || 'General',
            uniformTop: 'Not Selected', // User needs to select sizes
            uniformBottom: 'Not Selected', // User needs to select sizes
            orderDate: user.membershipActivatedAt ? new Date(user.membershipActivatedAt) : new Date(),
            paymentStatus: 'included_with_membership',
            orderStatus: 'pending_size_selection',
            orderSource: 'membership_included',
            isIncluded: true,
            amount: 0, // Free with membership
            quantity: 1,
            notes: `Uniform included with $200 one-time membership plan`,
            membershipType: user.membershipType,
            createdBy: 'system',
            createdVia: 'membership_inclusion'
          };
          
          console.log('🆕 Creating included uniform for student:', student.displayName);
          const result = await APIClient.createUniformOrder(includedUniformData);
          
          if (result.success) {
            createdIncludedUniforms.push({
              id: result.orderId,
              ...includedUniformData
            });
            console.log('✅ Created included uniform for', student.displayName);
          }
        } catch (studentError) {
          console.error('❌ Error creating included uniform for student', student.displayName, ':', studentError);
        }
      }
      
      setIncludedUniforms(createdIncludedUniforms);
      console.log('✅ Created', createdIncludedUniforms.length, 'included uniform records');
      
      // Refresh the main uniform orders to include the new included uniforms
      await loadUniformOrderHistory();
      
    } catch (error) {
      console.error('❌ Error loading/creating included uniforms:', error);
    }
  };

  // Update included uniforms when students are loaded
  useEffect(() => {
    if (membershipStatus?.hasUniformIncluded && availableStudents.length > 0 && includedUniforms.length === 0) {
      loadOrCreateIncludedUniforms();
    }
  }, [availableStudents, membershipStatus]);

  // Load available students for the current parent
  const loadAvailableStudents = async () => {
    try {
      if (!user?.email) {
        console.log('⚠️ No user email available for fetching student data');
        return;
      }

      console.log('👥 Loading available students for parent:', user.email);
      
      // Get current user data to find their students
      const { getCurrentUserData } = await import('../../firebase/apis/api-members');
      const currentUserData = await getCurrentUserData(user.email);
      
      if (currentUserData?.students && currentUserData.students.length > 0) {
        console.log('✅ Found', currentUserData.students.length, 'students for parent');
        
        // Format students with proper display names
        const formattedStudents = currentUserData.students.map(student => ({
          ...student,
          displayName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || `Student ${student.uid?.slice(-4) || ''}`,
          fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim()
        }));
        
        setAvailableStudents(formattedStudents);
        
        // Auto-select first student if only one available
        if (formattedStudents.length === 1) {
          setSelectedStudentId(formattedStudents[0].uid || '');
          console.log('👦 Auto-selected single student:', formattedStudents[0].displayName);
        } else {
          console.log('👥 Multiple students available, user will need to select one');
        }
      } else {
        console.log('⚠️ No students found for this parent');
        setAvailableStudents([]);
      }
      
    } catch (error) {
      console.warn('⚠️ Could not load available students:', error);
      setAvailableStudents([]);
    }
  };

  const loadUniformOrderHistory = async () => {
    try {
      if (!user?.uid) {
        console.log('⚠️ No user UID available for fetching uniform orders');
        return;
      }

      console.log('👕 Fetching uniform orders from API for user UID:', user.uid);
      console.log('👤 User data:', { uid: user.uid, email: user.email, isPaidMember: user.isPaidMember });
      
      try {
        // Use the APIClient to fetch uniform orders
        const orders = await APIClient.getUniformOrdersByParent(user.uid);
        
        console.log('✅ Uniform orders fetched successfully:', orders);
        console.log('👕 Found', orders.length, 'uniform orders for user');
        console.log('📋 Order details:', orders.map(order => ({
          id: order.id,
          studentName: order.studentName,
          parentEmail: order.parentEmail,
          parentId: order.parentId,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          orderDate: order.orderDate,
          received: order.received,
          uniformTop: order.uniformTop,
          uniformBottom: order.uniformBottom,
          amount: order.amount
        })));
        
        setUniformOrders(orders);
        return;
        
      } catch (apiError) {
        console.log('⚠️ API Error:', apiError.message);
        
        // If we get a 404 or other error, it might mean no orders exist for this user
        if (apiError.message.includes('404')) {
          console.log('📝 No uniform orders found for this user');
          setUniformOrders([]);
          return;
        }
        
        console.log('⚠️ API call failed, using fallback data');
      }
      
      // Fallback: Load from session storage if API fails
      console.log('🔄 API failed, using fallback mock data');
      const fallbackOrders = [];
      
      // Add recent uniform order if exists
      const recentUniformPayment = sessionStorage.getItem("uniformPaymentCompleted");
      if (recentUniformPayment && (Date.now() - parseInt(recentUniformPayment)) < 2592000000) { // 30 days
        const recentOrder = {
          id: 'uniform_recent',
          orderDate: new Date(parseInt(recentUniformPayment)),
          studentName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Student',
          uniformTop: sessionStorage.getItem("recentUniformTop") || 'Adult M',
          uniformBottom: sessionStorage.getItem("recentUniformBottom") || 'Adult M',
          amount: 7500,
          paymentStatus: 'completed',
          orderStatus: 'processing',
          orderSource: 'dashboard',
          received: false,
          paymentIntentId: 'pi_recent_uniform_' + parseInt(recentUniformPayment)
        };
        fallbackOrders.push(recentOrder);
      }

      setUniformOrders(fallbackOrders);
      
    } catch (error) {
      console.error('❌ Error loading uniform order history:', error);
      setUniformOrders([]);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!uniformData.topSize) newErrors.topSize = 'Top size is required';
    if (!uniformData.bottomSize) newErrors.bottomSize = 'Bottom size is required';
    
    // For size selection of included uniforms, we need a selected student
    if (activeTab === 'size-selection' && !selectedStudentId) {
      newErrors.student = 'Student selection is required';
    }
    
    // For new orders, if multiple students available, ensure one is selected
    if (activeTab === 'new-order' && availableStudents.length > 1 && !selectedStudentId) {
      newErrors.student = 'Please select a student for this uniform order';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setUniformData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleProceedToPayment = () => {
    if (validateForm()) {
      setStep('payment');
    }
  };

  // Handle size selection for included uniforms
  const handleSizeSelection = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setStep('processing');
      console.log('📏 Updating sizes for included uniform');
      
      // Find the included uniform for the selected student
      const includedUniform = includedUniforms.find(uniform => uniform.studentId === selectedStudentId);
      
      if (!includedUniform) {
        setStep('error');
        setMessage('Could not find included uniform record for selected student.');
        return;
      }

      // Update the included uniform with selected sizes
      const updateData = {
        uniformTop: uniformData.topSize,
        uniformBottom: uniformData.bottomSize,
        orderStatus: 'processing',
        lastUpdated: new Date().toISOString(),
        sizesSelectedAt: new Date().toISOString(),
        notes: `Sizes selected: Top ${uniformData.topSize}, Bottom ${uniformData.bottomSize}`
      };

      await APIClient.updateUniformOrder(includedUniform.id, updateData);
      
      // Update local state
      setIncludedUniforms(prev => prev.map(uniform => 
        uniform.studentId === selectedStudentId 
          ? { ...uniform, ...updateData }
          : uniform
      ));
      
      // Refresh uniform order history
      await loadUniformOrderHistory();
      
      setStep('success');
      setMessage('Uniform sizes updated successfully!');
      
      console.log('✅ Sizes updated for included uniform');
    } catch (error) {
      console.error('❌ Error updating uniform sizes:', error);
      setStep('error');
      setMessage('Failed to update uniform sizes. Please try again.');
    }
  };

  const handlePaymentSuccess = async (paymentIntent) => {
    setStep('processing');
    
    try {
      console.log('✅ Uniform order payment successful:', paymentIntent);
      
      // Get selected student for session storage
      const selectedStudent = availableStudents.find(student => student.uid === selectedStudentId);
      const sessionStudentName = selectedStudent?.fullName || selectedStudent?.displayName || 
                                   (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Student');
      
      // Save uniform order information to session storage for history tracking
      const uniformOrderData = {
        id: paymentIntent.id,
        orderDate: new Date().toISOString(),
        studentName: sessionStudentName,
        studentId: selectedStudent?.uid || selectedStudentId || user?.uid,
        uniformTop: uniformData.topSize,
        uniformBottom: uniformData.bottomSize,
        amount: uniformData.totalAmount,
        paymentStatus: 'completed',
        orderStatus: 'processing',
        orderSource: 'dashboard',
        paymentIntentId: paymentIntent.id
      };

      // Store uniform payment completion time and order details
      sessionStorage.setItem("uniformPaymentCompleted", Date.now().toString());
      sessionStorage.setItem("recentUniformTop", uniformData.topSize);
      sessionStorage.setItem("recentUniformBottom", uniformData.bottomSize);
      sessionStorage.setItem("recentUniformOrder", JSON.stringify(uniformOrderData));

      console.log('📦 Uniform order data saved:', uniformOrderData);
      
      // 🆕 Create uniform order directly via API since webhook might not work in development
      try {
        console.log('👕 Creating uniform order directly via API');
        
        // Get user data for proper student and parent details
        let userSport = 'YAU'; // Default
        let userPhone = '';
        let parentName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email?.split('@')[0] || 'Parent';
        let studentName = 'Student'; // Default
        let studentId = user?.uid; // Default
        let ageGroup = 'General'; // Default
        let location = '';
        
        // Use selected student if available, otherwise use defaults
        const selectedStudent = availableStudents.find(student => student.uid === selectedStudentId);
        
        if (selectedStudent) {
          // Use the selected student's information
          studentName = selectedStudent.fullName || selectedStudent.displayName;
          studentId = selectedStudent.uid;
          ageGroup = selectedStudent.ageGroup || 'General';
          userSport = selectedStudent.sport || 'YAU';
          
          console.log('👦 Using selected student:', {
            studentName,
            studentId,
            ageGroup,
            sport: userSport,
            selectedFromId: selectedStudentId
          });
        } else if (availableStudents.length === 1) {
          // Use the single available student
          const singleStudent = availableStudents[0];
          studentName = singleStudent.fullName || singleStudent.displayName;
          studentId = singleStudent.uid;
          ageGroup = singleStudent.ageGroup || 'General';
          userSport = singleStudent.sport || 'YAU';
          
          console.log('👦 Using single available student:', {
            studentName,
            studentId,
            ageGroup,
            sport: userSport
          });
        } else {
          // Fallback: Try to get current user data for parent info and first student
          try {
            const { getCurrentUserData } = await import('../../firebase/apis/api-members');
            const currentUserData = await getCurrentUserData(user.email);
            if (currentUserData) {
              // Extract parent info
              userSport = currentUserData.sport || 'YAU';
              userPhone = currentUserData.phone || currentUserData.parentPhone || '';
              parentName = `${currentUserData.firstName || ''} ${currentUserData.lastName || ''}`.trim() || parentName;
              location = currentUserData.location || '';
              
              console.log('👤 Got user data (fallback):', {
                sport: userSport,
                phone: userPhone,
                parentName: parentName,
                location: location,
                studentsCount: currentUserData.students?.length || 0
              });
              
              // Get first student if available
              if (currentUserData.students && currentUserData.students.length > 0) {
                const firstStudent = currentUserData.students[0];
                studentName = `${firstStudent.firstName || ''} ${firstStudent.lastName || ''}`.trim();
                studentId = firstStudent.uid || user?.uid;
                ageGroup = firstStudent.ageGroup || 'General';
                
                // Fallback to parent name if student name is empty
                if (!studentName || studentName.trim() === '') {
                  studentName = parentName + "'s Student";
                }
                
                console.log('👦 Using first student (fallback):', { 
                  studentName, 
                  studentId, 
                  ageGroup,
                  originalFirstName: firstStudent.firstName,
                  originalLastName: firstStudent.lastName
                });
              } else {
                // No students found, use parent name as student fallback
                studentName = parentName + "'s Child";
                console.log('👥 No students found, using parent name as student (fallback):', studentName);
              }
            }
          } catch (userDataError) {
            console.warn('⚠️ Could not fetch user data for student/parent info (fallback):', userDataError);
            // Use parent name as student name fallback
            studentName = parentName + "'s Child";
          }
        }
        
        // Get parent info from current user data
        try {
          const { getCurrentUserData } = await import('../../firebase/apis/api-members');
          const currentUserData = await getCurrentUserData(user.email);
          if (currentUserData) {
            userPhone = currentUserData.phone || currentUserData.parentPhone || '';
            parentName = `${currentUserData.firstName || ''} ${currentUserData.lastName || ''}`.trim() || parentName;
            location = currentUserData.location || '';
          }
        } catch (parentDataError) {
          console.warn('⚠️ Could not fetch parent data:', parentDataError);
        }
        
        const apiUniformOrderData = {
          studentId: studentId,
          studentName: studentName,
          parentId: user?.uid,
          parentName: parentName,
          parentEmail: user?.email,
          parentPhone: userPhone,
          team: userSport,
          ageGroup: ageGroup,
          uniformTop: uniformData.topSize,
          uniformBottom: uniformData.bottomSize,
          orderDate: new Date().toISOString(),
          paymentIntentId: paymentIntent.id,
          paymentStatus: 'completed',
          orderStatus: 'processing',
          orderSource: 'dashboard',
          received: false,
          amount: uniformData.totalAmount, // This should be 7500 (cents)
          quantity: uniformData.quantity || 1,
          notes: `Ordered via member dashboard - Top: ${uniformData.topSize}, Bottom: ${uniformData.bottomSize}`,
          location: location,
          createdBy: 'member',
          createdVia: 'stripe_payment',
          stripePaymentStatus: 'succeeded',
          membershipType: user?.membershipType || 'unknown',
          // Additional tracking fields
          browserInfo: navigator.userAgent ? navigator.userAgent.slice(0, 100) : '',
          orderTimestamp: Date.now(),
          // Match old data structure fields
          lastUpdated: new Date().toISOString(),
          lastUpdatedBy: user?.uid,
          lastUpdatedByName: parentName
        };
        
        console.log('👕 Creating uniform order with data:', apiUniformOrderData);
        
        const result = await APIClient.createUniformOrder(apiUniformOrderData);
        console.log('✅ Uniform order created via API:', result);
        
      } catch (apiError) {
        console.warn('⚠️ Failed to create uniform order via direct API call:', apiError);
        console.log('ℹ️ Uniform order will be created via payment webhook automatically');
      }
      
      // Refresh the uniform order history to show the updated order
      await loadUniformOrderHistory();
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStep('success');
      setMessage('Uniform order placed successfully!');
    } catch (error) {
      console.error('❌ Error processing uniform order:', error);
      setStep('error');
      setMessage('There was an error processing your order. Please contact support.');
    }
  };

  const handlePaymentError = (error) => {
    setStep('error');
    setMessage(error.message || 'Payment failed. Please try again.');
  };

  const resetOrder = () => {
    setStep('selection');
    setMessage('');
    setUniformData({
      topSize: '',
      bottomSize: '',
      quantity: 1,
      pricePerSet: 75,
      totalAmount: 7500,
    });
    setErrors({});
    
    // Reset to appropriate tab based on membership
    if (membershipStatus?.hasUniformIncluded) {
      setActiveTab('included-uniforms');
    } else {
      setActiveTab('new-order');
    }
  };

  // Processing screen
  if (step === 'processing') {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800">Processing Your Uniform Order</h3>
          <p className="text-gray-600 mt-2">Please don't close this page...</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-700">
            <div className="font-medium">Processing ${(uniformData.totalAmount / 100).toFixed(2)} uniform order</div>
            <div className="mt-1">Top: {uniformData.topSize}</div>
            <div className="mt-1">Bottom: {uniformData.bottomSize}</div>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (step === 'success') {
    const isSizeSelection = activeTab === 'size-selection';
    
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaCheck className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          {isSizeSelection ? 'Uniform Sizes Updated!' : 'Uniform Order Successful!'}
        </h3>
        <p className="text-gray-600 mb-6">
          {isSizeSelection 
            ? 'Your included uniform sizes have been confirmed and will be prepared.'
            : 'Your uniform has been ordered and will be delivered soon.'
          }
        </p>

        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-green-800 mb-2">
            {isSizeSelection ? 'Size Details:' : 'Order Details:'}
          </h4>
          <div className="text-sm text-green-700">
            <p>Top Size: {uniformData.topSize}</p>
            <p>Bottom Size: {uniformData.bottomSize}</p>
            <p>{isSizeSelection ? 'Cost: FREE (Included with membership)' : `Total: $${(uniformData.totalAmount / 100).toFixed(2)}`}</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-800 mb-2">What's Next?</h4>
          <ul className="text-left text-blue-700 text-sm space-y-1">
            {isSizeSelection ? (
              <>
                <li>• Your uniform will be prepared with the selected sizes</li>
                <li>• Processing typically takes 3-5 business days</li>
                <li>• You'll be notified when ready for pickup</li>
                <li>• No payment required - included with your membership</li>
              </>
            ) : (
              <>
                <li>• You'll receive a confirmation email shortly</li>
                <li>• Your uniform will be processed within 1-2 business days</li>
                <li>• Delivery typically takes 5-7 business days</li>
                <li>• You'll receive tracking information via email</li>
              </>
            )}
          </ul>
        </div>
        
        <div className="flex gap-4 justify-center">
          {isSizeSelection ? (
            <>
              <button
                onClick={() => {
                  setStep('selection');
                  setActiveTab('included-uniforms');
                }}
                className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                View Included Uniforms
              </button>
              <button
                onClick={() => {
                  setStep('selection');
                  setActiveTab('order-history');
                }}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                View Order History
              </button>
            </>
          ) : (
            <>
              {membershipStatus?.canOrderUniforms && (
                <button
                  onClick={resetOrder}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Order Another Uniform
                </button>
              )}
              <button
                onClick={() => {
                  setStep('selection');
                  setActiveTab('order-history');
                }}
                className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                View Order History
              </button>
              <button
                onClick={() => window.location.href = '/payments'}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Payment History
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Error screen
  if (step === 'error') {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaTimes className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Order Failed</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        
        <button
          onClick={resetOrder}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Payment screen
  if (step === 'payment') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <FaShoppingCart className="text-2xl" />
              <h2 className="text-2xl font-bold">Complete Your Uniform Order</h2>
            </div>
            <p className="text-green-100">Secure checkout for YAU uniforms</p>
          </div>

          <div className="p-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Product</span>
                  <span className="font-medium">YAU Uniform Set</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Top Size</span>
                  <span className="font-medium">{uniformData.topSize}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Bottom Size</span>
                  <span className="font-medium">{uniformData.bottomSize}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Quantity</span>
                  <span className="font-medium">{uniformData.quantity}</span>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span>${(uniformData.totalAmount / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            {!process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-center">
                <p className="text-red-800 font-medium">Stripe Configuration Error</p>
                <p className="text-red-600 text-sm">
                  The `REACT_APP_STRIPE_PUBLISHABLE_KEY` is missing. Please add it to your Vercel/Environment settings.
                </p>
              </div>
            ) : (
              <Elements stripe={stripePromise}>
                <UniformCheckoutForm
                  uniformData={uniformData}
                  user={user}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  availableStudents={availableStudents}
                  selectedStudentId={selectedStudentId}
                />
              </Elements>
            )}

            {/* Back Button */}
            <button
              onClick={() => setStep('selection')}
              className="w-full mt-4 py-3 px-6 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Size Selection
            </button>

            {/* Security Notice */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-6">
              <FaLock />
              <span>Your payment is secured by Stripe</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingMembership) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800">Loading Your Membership Status</h3>
          <p className="text-gray-600 mt-2">Please wait while we check your uniform entitlements...</p>
        </div>
      </div>
    );
  }

  // Access denied state for non-paid members
  if (!membershipStatus?.isPaidMember) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaTshirt className="w-8 h-8 text-yellow-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Uniform Orders - Premium Feature</h3>
        <p className="text-gray-600 mb-6">
          Uniform ordering is available for paid members only. Please upgrade your membership to access this feature.
        </p>
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-800 mb-2">Available Plans:</h4>
          <div className="space-y-2 text-sm text-blue-700">
            <div className="flex justify-between items-center">
              <span>Monthly Plan:</span>
              <span className="font-medium">$50/month + uniforms separate</span>
            </div>
            <div className="flex justify-between items-center">
              <span>One-Time Plan:</span>
              <span className="font-medium">$200 (includes 1 free uniform set)</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.location.href = '/payments'}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Upgrade Membership
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Selection screen (default) - now with tabs
  return (
    <div className="max-w-4xl mx-auto">
      {/* Membership Status Banner */}
      {membershipStatus && (
        <div className={`mb-6 p-4 rounded-lg ${
          membershipStatus.hasUniformIncluded 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`font-semibold ${
                membershipStatus.hasUniformIncluded ? 'text-green-800' : 'text-blue-800'
              }`}>
                {membershipStatus.membershipType === 'one_time' ? 'One-Time Plan' : 'Monthly Plan'} Member
              </h4>
              <p className={`text-sm ${
                membershipStatus.hasUniformIncluded ? 'text-green-700' : 'text-blue-700'
              }`}>
                {membershipStatus.hasUniformIncluded 
                  ? 'Your $200 plan includes complimentary uniform sets' 
                  : 'Uniforms available for separate purchase ($75 per set)'}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              membershipStatus.hasUniformIncluded
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              ${membershipStatus.planAmount} Plan
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {/* Show 'Included Uniforms' tab for $200 plan members, 'New Order' for $50 plan */}
          <button
            onClick={() => setActiveTab(membershipStatus?.hasUniformIncluded ? 'included-uniforms' : 'new-order')}
            className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-colors ${
              activeTab === (membershipStatus?.hasUniformIncluded ? 'included-uniforms' : 'new-order')
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {membershipStatus?.hasUniformIncluded ? 'Included Uniforms' : 'Order Uniform'}
          </button>
          <button
            onClick={() => setActiveTab('order-history')}
            className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-colors ${
              activeTab === 'order-history'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Order History ({uniformOrders.length})
          </button>
        </div>
      </div>

      {activeTab === 'included-uniforms' ? (
        // Included Uniforms Tab (for $200 one-time plan members)
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <FaCheck className="text-2xl" />
              <h2 className="text-2xl font-bold">Your Included Uniforms</h2>
            </div>
            <p className="text-green-100">Complimentary uniforms included with your $200 membership</p>
          </div>

          <div className="p-6">
            {includedUniforms.length === 0 ? (
              <div className="text-center py-12">
                <FaSpinner className="animate-spin text-6xl text-gray-300 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Setting up your included uniforms...</h3>
                <p className="text-gray-500 mb-6">Please wait while we prepare your complimentary uniform sets.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {includedUniforms.map((includedUniform) => (
                  <div key={includedUniform.id} className="border border-green-200 rounded-xl p-6 bg-green-50">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-green-800">
                          {includedUniform.studentName}'s Uniform Set
                        </h3>
                        <p className="text-sm text-green-600">
                          Included with your {membershipStatus?.membershipType === 'one_time' ? '$200 One-Time' : 'Premium'} membership
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-800">FREE</div>
                        <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          includedUniform.orderStatus === 'pending_size_selection'
                            ? 'bg-yellow-100 text-yellow-800'
                            : includedUniform.orderStatus === 'ready_for_pickup' 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {includedUniform.orderStatus === 'pending_size_selection' 
                            ? 'SIZES NEEDED' 
                            : includedUniform.orderStatus?.toUpperCase() || 'PENDING'
                          }
                        </div>
                      </div>
                    </div>

                    {/* Uniform Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium text-green-700">Student Details</h4>
                        <p className="text-green-600 text-sm">{includedUniform.studentName}</p>
                        {includedUniform.ageGroup && (
                          <p className="text-green-600 text-sm">{includedUniform.ageGroup} - {includedUniform.team}</p>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-green-700">Uniform Sizes</h4>
                        <p className="text-green-600 text-sm">
                          Top: {includedUniform.uniformTop === 'Not Selected' 
                            ? <span className="text-yellow-600 font-medium">Please Select</span>
                            : includedUniform.uniformTop
                          }
                        </p>
                        <p className="text-green-600 text-sm">
                          Bottom: {includedUniform.uniformBottom === 'Not Selected'
                            ? <span className="text-yellow-600 font-medium">Please Select</span>
                            : includedUniform.uniformBottom
                          }
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-green-700">Order Status</h4>
                        <p className="text-green-600 text-sm">
                          {includedUniform.orderStatus === 'pending_size_selection' 
                            ? 'Waiting for size selection'
                            : includedUniform.orderStatus === 'processing'
                            ? 'Being prepared'
                            : includedUniform.orderStatus === 'ready_for_pickup'
                            ? 'Ready for pickup'
                            : includedUniform.orderStatus || 'Processing'
                          }
                        </p>
                        {includedUniform.orderDate && (
                          <p className="text-green-600 text-sm">
                            Included: {new Date(includedUniform.orderDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-green-200">
                      {(includedUniform.uniformTop === 'Not Selected' || includedUniform.uniformBottom === 'Not Selected') && (
                        <button 
                          onClick={() => {
                            setSelectedStudentId(includedUniform.studentId);
                            setActiveTab('size-selection');
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          Select Sizes
                        </button>
                      )}
                      {includedUniform.orderStatus === 'ready_for_pickup' && (
                        <button className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                          Pickup Details
                        </button>
                      )}
                      <button className="px-4 py-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
                        Contact Support
                      </button>
                    </div>
                  </div>
                ))}

                {/* Information Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">About Your Included Uniforms</h4>
                  <ul className="text-left text-blue-700 text-sm space-y-1">
                    <li>• Each student gets one complimentary uniform set</li>
                    <li>• Please select sizes to complete your uniform preparation</li>
                    <li>• Additional uniforms can be purchased separately for $75</li>
                    <li>• Contact support if you need help with sizing</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'new-order' || activeTab === 'size-selection' ? (
        // New Order Tab (for $50 monthly plan members) or Size Selection for included uniforms
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              {activeTab === 'size-selection' ? (
                <>
                  <FaTshirt className="text-2xl" />
                  <h2 className="text-2xl font-bold">Select Uniform Sizes</h2>
                </>
              ) : (
                <>
                  <FaShoppingCart className="text-2xl" />
                  <h2 className="text-2xl font-bold">Order Additional Uniform</h2>
                </>
              )}
            </div>
            <p className="text-blue-100">
              {activeTab === 'size-selection' 
                ? 'Complete your included uniform by selecting sizes'
                : 'Get additional YAU uniforms for $75 each'
              }
            </p>
          </div>

        <div className="p-6">
          {/* Show access restriction message for users who shouldn't be ordering */}
          {!membershipStatus?.canOrderUniforms && activeTab === 'new-order' ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaTshirt className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Additional Uniforms</h3>
              <p className="text-gray-600 mb-6">
                {membershipStatus?.hasUniformIncluded 
                  ? 'You already have complimentary uniforms included with your membership. Check your "Included Uniforms" tab to manage them.'
                  : 'Uniform ordering is available for paid members only.'
                }
              </p>
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-800 mb-2">
                  {membershipStatus?.hasUniformIncluded ? 'Need More Uniforms?' : 'Want to Order Uniforms?'}
                </h4>
                <p className="text-blue-700 text-sm">
                  {membershipStatus?.hasUniformIncluded 
                    ? 'Contact support to purchase additional uniform sets for $75 each.'
                    : 'Upgrade to a paid membership plan to access uniform ordering.'
                  }
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setActiveTab(membershipStatus?.hasUniformIncluded ? 'included-uniforms' : 'order-history')}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  {membershipStatus?.hasUniformIncluded ? 'View Included Uniforms' : 'View Order History'}
                </button>
                <button
                  onClick={() => window.location.href = '/support'}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Contact Support
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Uniform Information */}
              <div className="bg-blue-50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  {activeTab === 'size-selection' ? 'Uniform Set Details' : 'What\'s Included'}
                </h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Official YAU uniform top</li>
                  <li>• Official YAU uniform bottom</li>
                  <li>• High-quality athletic material</li>
                  <li>• Custom team colors and logo</li>
                  <li>• Perfect for games and practices</li>
                  {activeTab === 'size-selection' && (
                    <li className="font-medium text-green-700">• FREE with your membership!</li>
                  )}
                </ul>
              </div>

          {/* Student Selection (if multiple students available) */}
            {availableStudents.length > 1 && (
              <div className="bg-blue-50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Select Student</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Which student is this uniform order for? *
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.student ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select a student</option>
                      {availableStudents.map((student) => (
                        <option key={student.uid} value={student.uid}>
                          {student.displayName} {student.ageGroup && `(${student.ageGroup})`}
                        </option>
                      ))}
                    </select>
                    {errors.student && <p className="text-red-600 text-sm mt-1">{errors.student}</p>}
                  </div>
                </div>
                
                {selectedStudentId && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">Selected Student Details:</h4>
                    {(() => {
                      const selectedStudent = availableStudents.find(s => s.uid === selectedStudentId);
                      return selectedStudent ? (
                        <div className="text-sm text-blue-700 space-y-1">
                          <p><strong>Name:</strong> {selectedStudent.displayName}</p>
                          {selectedStudent.ageGroup && <p><strong>Age Group:</strong> {selectedStudent.ageGroup}</p>}
                          {selectedStudent.sport && <p><strong>Sport:</strong> {selectedStudent.sport}</p>}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            )}
            
            {/* Show student info for single student */}
            {availableStudents.length === 1 && (
              <div className="bg-green-50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-green-800 mb-2">Student Information</h3>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>Name:</strong> {availableStudents[0].displayName}</p>
                  {availableStudents[0].ageGroup && <p><strong>Age Group:</strong> {availableStudents[0].ageGroup}</p>}
                  {availableStudents[0].sport && <p><strong>Sport:</strong> {availableStudents[0].sport}</p>}
                </div>
              </div>
            )}
            
            {/* Show message if no students found */}
            {availableStudents.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Students Found</h3>
                <div className="text-sm text-yellow-700">
                  <p>We couldn't find any students associated with your account.</p>
                  <p className="mt-2">The uniform will be ordered for your account holder information.</p>
                  <p className="mt-2 font-medium">If you need to add student information, please contact support.</p>
                </div>
              </div>
            )}

          {/* Size Selection */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Select Your Sizes</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Top Size *
                </label>
                <select
                  value={uniformData.topSize}
                  onChange={(e) => handleInputChange('topSize', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.topSize ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select top size</option>
                  {uniformOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.topSize && <p className="text-red-600 text-sm mt-1">{errors.topSize}</p>}
              </div>

              {/* Bottom Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bottom Size *
                </label>
                <select
                  value={uniformData.bottomSize}
                  onChange={(e) => handleInputChange('bottomSize', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.bottomSize ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select bottom size</option>
                  {uniformOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.bottomSize && <p className="text-red-600 text-sm mt-1">{errors.bottomSize}</p>}
              </div>
            </div>

            {/* Price Display */}
            <div className={`rounded-xl p-6 ${
              activeTab === 'size-selection' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
            }`}>
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium">
                  {activeTab === 'size-selection' ? 'Uniform Set Value:' : 'Uniform Set Price:'}
                </span>
                <span className={`font-bold ${
                  activeTab === 'size-selection' ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {activeTab === 'size-selection' ? 'FREE' : `$${(uniformData.totalAmount / 100).toFixed(2)}`}
                </span>
              </div>
              <p className={`text-sm mt-2 ${
                activeTab === 'size-selection' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {activeTab === 'size-selection' 
                  ? 'Included with your $200 membership - both top and bottom pieces'
                  : 'Price includes both top and bottom uniform pieces'
                }
              </p>
            </div>

            {/* Important Notes */}
            <div className={`border rounded-lg p-4 ${
              activeTab === 'size-selection' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <h4 className={`font-medium mb-2 ${
                activeTab === 'size-selection' ? 'text-green-800' : 'text-yellow-800'
              }`}>
                {activeTab === 'size-selection' ? '✅ Size Selection' : '⚠️ Important Notes'}
              </h4>
              <ul className={`text-sm space-y-1 ${
                activeTab === 'size-selection' ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {activeTab === 'size-selection' ? (
                  <>
                    <li>• Please double-check sizes before confirming</li>
                    <li>• Sizes cannot be changed after confirmation</li>
                    <li>• Uniform preparation takes 3-5 business days</li>
                    <li>• Contact support if you need sizing help</li>
                    <li>• Additional uniforms can be purchased for $75</li>
                  </>
                ) : (
                  <>
                    <li>• Custom uniforms are non-refundable</li>
                    <li>• Please double-check sizes before ordering</li>
                    <li>• Delivery takes 5-7 business days</li>
                    <li>• Contact support if you need help with sizing</li>
                  </>
                )}
              </ul>
            </div>

            {/* Error Messages */}
            {message && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FaTimes className="text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-red-800">{message}</p>
                </div>
              </div>
            )}

            {/* Proceed Button */}
            <button
              onClick={activeTab === 'size-selection' ? handleSizeSelection : handleProceedToPayment}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-center gap-3">
                {activeTab === 'size-selection' ? (
                  <>
                    <FaCheck />
                    Confirm Sizes
                  </>
                ) : (
                  <>
                    <FaCreditCard />
                    Proceed to Payment
                  </>
                )}
              </div>
            </button>
            
            {/* Back Button for Size Selection */}
            {activeTab === 'size-selection' && (
              <button
                onClick={() => setActiveTab('included-uniforms')}
                className="w-full mt-4 py-3 px-6 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Back to Included Uniforms
              </button>
            )}
          </div>
            </>
          )}
        </div>
        </div>
      ) : (
        // Order History Tab
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 mb-2">
                <FaTshirt className="text-2xl" />
                <h2 className="text-2xl font-bold">Your Uniform History</h2>
              </div>
              <button
                onClick={() => {
                  loadUniformOrderHistory();
                  if (membershipStatus?.hasUniformIncluded) {
                    loadOrCreateIncludedUniforms();
                  }
                }}
                className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors text-sm font-medium"
              >
                🔄 Refresh
              </button>
            </div>
            <p className="text-blue-100">
              {membershipStatus?.hasUniformIncluded 
                ? 'Your included and purchased uniforms'
                : 'Track your uniform orders and delivery status'
              }
            </p>
          </div>

          <div className="p-6">
            {uniformOrders.length === 0 ? (
              <div className="text-center py-12">
                <FaTshirt className="mx-auto text-6xl text-gray-300 mb-6" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {membershipStatus?.hasUniformIncluded ? 'No uniform history yet' : 'No uniform orders yet'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {membershipStatus?.hasUniformIncluded 
                    ? 'Your included uniforms will appear here once sizes are selected.'
                    : "You haven't placed any uniform orders yet. Start by ordering your first uniform!"
                  }
                </p>
                {membershipStatus?.canOrderUniforms && (
                  <button
                    onClick={() => setActiveTab(membershipStatus?.hasUniformIncluded ? 'included-uniforms' : 'new-order')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    {membershipStatus?.hasUniformIncluded ? 'View Included Uniforms' : 'Order Your First Uniform'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {uniformOrders.map((order) => {
                  const isIncludedUniform = order.isIncluded || order.orderSource === 'membership_included' || order.paymentStatus === 'included_with_membership';
                  const isIncludedPending = isIncludedUniform && (order.uniformTop === 'Not Selected' || order.uniformBottom === 'Not Selected');
                  
                  return (
                    <div key={order.id} className={`border rounded-xl p-6 hover:shadow-lg transition-shadow ${
                      isIncludedUniform ? 'border-green-200 bg-green-50' : 'border-gray-200'
                    }`}>
                      {/* Order Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-800">
                              {isIncludedUniform ? 'Included Uniform' : `Order #${order.id.slice(-8)}`}
                            </h3>
                            {isIncludedUniform && (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                FREE
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {isIncludedUniform ? 'Included with membership' : 'Placed'} on {new Date(order.orderDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-800">
                            {isIncludedUniform ? 'FREE' : `$${order.amount ? (order.amount / 100).toFixed(2) : '75.00'}`}
                          </div>
                          <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            order.paymentStatus === 'completed' || order.paymentStatus === 'included_with_membership'
                              ? 'bg-green-100 text-green-800'
                              : order.paymentStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'  
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {order.paymentStatus === 'included_with_membership' 
                              ? 'INCLUDED' 
                              : order.paymentStatus.toUpperCase()
                            }
                          </div>
                        </div>
                      </div>

                    {/* Order Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium text-gray-700">Student</h4>
                        <p className="text-gray-600">{order.studentName}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700">Uniform Sizes</h4>
                        <p className="text-gray-600">Top: {order.uniformTop}</p>
                        <p className="text-gray-600">Bottom: {order.uniformBottom}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700">Order Status</h4>
                        <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                          order.received === true || order.orderStatus === 'delivered'
                            ? 'bg-green-100 text-green-800'
                            : order.orderStatus === 'shipped'
                            ? 'bg-blue-100 text-blue-800'
                            : order.orderStatus === 'processing' || !order.orderStatus
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.received === true 
                            ? 'RECEIVED' 
                            : order.orderStatus 
                              ? order.orderStatus.toUpperCase() 
                              : 'PROCESSING'
                          }
                        </div>
                        {order.trackingNumber && (
                          <p className="text-sm text-blue-600 mt-1">
                            Tracking: {order.trackingNumber}
                          </p>
                        )}
                      </div>
                    </div>

                      {/* Order Actions */}
                      <div className={`flex gap-3 pt-4 border-t ${
                        isIncludedUniform ? 'border-green-200' : 'border-gray-100'
                      }`}>
                        {isIncludedPending && (
                          <button 
                            onClick={() => {
                              setSelectedStudentId(order.studentId);
                              setActiveTab('size-selection');
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Select Sizes
                          </button>
                        )}
                        {order.trackingNumber && (
                          <button className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                            Track Package
                          </button>
                        )}
                        {order.orderStatus === 'delivered' && !isIncludedUniform && (
                          <button 
                            onClick={() => setActiveTab('new-order')}
                            className="px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                          >
                            Order Another
                          </button>
                        )}
                        {!isIncludedUniform && (
                          <button className="px-4 py-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
                            View Receipt
                          </button>
                        )}
                        <button className="px-4 py-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
                          Contact Support
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Summary Stats */}
                <div className="bg-gray-50 rounded-xl p-6 mt-8">
                  <h3 className="text-lg font-semibold mb-4">Uniform Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{uniformOrders.length}</div>
                      <div className="text-sm text-gray-600">Total Uniforms</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {uniformOrders.filter(order => 
                          order.isIncluded || order.orderSource === 'membership_included' || order.paymentStatus === 'included_with_membership'
                        ).length}
                      </div>
                      <div className="text-sm text-gray-600">Included FREE</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        ${((uniformOrders
                          .filter(order => !(order.isIncluded || order.orderSource === 'membership_included' || order.paymentStatus === 'included_with_membership'))
                          .reduce((sum, order) => sum + (order.amount || 7500), 0)) / 100).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">Amount Paid</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {uniformOrders.filter(order => 
                          !order.received && 
                          (order.orderStatus === 'processing' || order.orderStatus === 'shipped' || order.orderStatus === 'pending_size_selection' || !order.orderStatus)
                        ).length}
                      </div>
                      <div className="text-sm text-gray-600">In Progress</div>
                    </div>
                  </div>
                  
                  {/* Membership Benefits Summary */}
                  {membershipStatus?.hasUniformIncluded && (
                    <div className="mt-6 p-4 bg-green-100 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">Your Membership Benefits</h4>
                      <div className="text-sm text-green-700">
                        <p>✅ Your $200 one-time plan includes <strong>{availableStudents.length} free uniform set{availableStudents.length !== 1 ? 's' : ''}</strong></p>
                        <p>💰 You've saved <strong>${(availableStudents.length * 75).toFixed(2)}</strong> in uniform costs</p>
                        <p>🛍️ Additional uniforms available for $75 each</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UniformOrder;