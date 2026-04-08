import React, { useState, useCallback, memo } from "react";
import { useAuth } from "../../context/AuthContext";
import { updateMember, getCurrentUserData } from "../../firebase/apis/api-members";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { X, Plus, Loader2, CreditCard, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import PaymentPlanSelector from "../auth/Registration/PaymentPlanSelector";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { APIClient } from "../../firebase/ApiClient";
import RosterService from "../../services/rosterService";
import GroupChatService from "../../services/groupChatService";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const MIN_AGE = 3;
const MAX_AGE = 14;

// Memoized input component (same as registration)
const InputField = memo(({
  label,
  name,
  type = "text",
  value,
  error,
  onChange,
  onBlur,
  placeholder,
  options = [],
  isCustomSelect = false,
  maxLength,
}) => {
  const inputId = `input-${name}`;
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (optionValue) => {
    onChange({ target: { name, value: optionValue } });
    setIsOpen(false);
  };

  return (
    <div className="w-full relative">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}

      {type === "select" && isCustomSelect ? (
        <>
          <div
            className={`input flex items-center justify-between cursor-pointer ${
              error ? "border-red-500" : ""
            }`}
            onClick={() => setIsOpen(!isOpen)}
          >
            <span>{value || placeholder || `Select ${label}`}</span>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {options.map((option) => (
                <div
                  key={option.value}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </>
      ) : type === "select" ? (
        <select
          id={inputId}
          name={name}
          className={`input ${error ? "border-red-500" : ""}`}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
        >
          <option value="">{placeholder || `Select ${label}`}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={inputId}
          type={type}
          name={name}
          placeholder={placeholder}
          className={`input ${error ? "border-red-500" : ""}`}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          maxLength={maxLength}
        />
      )}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
});

// Age group calculation (same as registration)
const calculateAgeGroup = (dob) => {
  if (!dob) return "N/A";

  try {
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return "N/A";

    const today = new Date();
    const currentYear = today.getFullYear();
    const cutoffDate = new Date(currentYear, 6, 31);
    const seasonAge = currentYear - birthDate.getFullYear();

    if (seasonAge < 3 || seasonAge > 14) {
      return "N/A";
    }

    const birthdayThisYear = new Date(
      currentYear,
      birthDate.getMonth(),
      birthDate.getDate()
    );

    let ageGroup;
    if (birthdayThisYear > cutoffDate) {
      ageGroup = seasonAge - 1 + "U";
    } else {
      ageGroup = seasonAge + "U";
    }

    const groupNumber = parseInt(ageGroup);
    if (groupNumber < 3) {
      return "3U";
    }

    return ageGroup;
  } catch (error) {
    console.error("Error calculating age group:", error);
    return "N/A";
  }
};

// Student Info Form
const StudentInfoForm = memo(({ student, onChange, errors }) => {
  const currentYear = new Date().getFullYear();
  const maxBirthYear = currentYear - 3;
  const minBirthYear = currentYear - 14;

  const minAllowedDate = dayjs(`${minBirthYear}-01-01`);
  const maxAllowedDate = dayjs(`${maxBirthYear}-12-31`);

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4">
      <h4 className="text-lg font-medium text-gray-800 mb-3">
        Student Information
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <InputField
          label="First Name"
          name="firstName"
          type="text"
          value={student.firstName}
          error={errors.firstName}
          onChange={(e) => onChange("firstName", e.target.value)}
          placeholder="First Name"
        />
        <InputField
          label="Last Name"
          name="lastName"
          type="text"
          value={student.lastName}
          error={errors.lastName}
          onChange={(e) => onChange("lastName", e.target.value)}
          placeholder="Last Name"
        />
      </div>

      <div className="mt-4">
        <DatePicker
          label="Date of Birth"
          value={student.dob ? dayjs(student.dob) : null}
          onChange={(date) =>
            onChange("dob", date ? date.format("YYYY-MM-DD") : "")
          }
          minDate={minAllowedDate}
          maxDate={maxAllowedDate}
          disableFuture
          views={["year", "month", "day"]}
          slotProps={{
            textField: {
              fullWidth: true,
              error: !!errors.dob,
              helperText:
                errors.dob ||
                `Birth year must be between ${minBirthYear}-${maxBirthYear}. Students must be 3-14 years old as of July 31st.`,
            },
          }}
        />
      </div>

      {student.dob && (
        <p className="text-sm mt-2">
          {calculateAgeGroup(student.dob) === "N/A" ? (
            <span className="text-red-500">
              Student must be between 3-14 years old (born {minBirthYear}-
              {maxBirthYear})
            </span>
          ) : (
            <span className="text-green-600 font-medium">
              ✓ Eligible: {calculateAgeGroup(student.dob)} Age Group
            </span>
          )}
        </p>
      )}
    </div>
  );
});

// Custom Stripe Checkout Form for Add Student
const AddStudentStripeCheckout = ({ 
  plan, 
  amount, 
  user, 
  studentData, 
  onSuccess, 
  onError 
}) => {
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
      console.log('🔄 Creating payment intent for additional student');
      
      // Use the same createPaymentIntent endpoint with different metadata
      const { clientSecret, paymentIntentId, customerId } = await APIClient.createPaymentIntent(
        amount,
        'usd',
        plan,
        user?.email,
        user?.uid,
        {
          planName: plan === 'oneTime' ? 'One-Time Additional Student' : 'Monthly Additional Student',
          userEmail: user?.email,
          userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          userId: user?.uid,
          childrenCount: 1,
          pricePerChild: plan === 'oneTime' ? 200 : 50,
          description: `Additional student: ${studentData.firstName} ${studentData.lastName}`,
          studentName: `${studentData.firstName} ${studentData.lastName}`,
          isAdditionalStudent: true, // Key identifier
          paymentType: 'additional_student'
        }
      );

      console.log('✅ Payment intent created for additional student:', paymentIntentId);

      // Confirm the payment
      const card = elements.getElement(CardElement);
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            email: user?.email,
            name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          },
        },
      });

      if (error) {
        console.error('❌ Payment failed:', error);
        onError(error);
      } else {
        console.log('✅ Payment succeeded for additional student:', paymentIntent);
        onSuccess(paymentIntent);
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
          loading
            ? 'bg-gray-400 cursor-not-allowed text-gray-600'
            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="animate-spin" />
            Processing Payment...
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <CreditCard className="w-5 h-5" />
            Pay ${(amount / 100).toFixed(2)}
          </div>
        )}
      </button>
    </form>
  );
};

// Create uniform orders for additional student (similar to registration)
const createUniformOrdersForAdditionalStudent = async ({ 
  student, 
  userData, 
  userEmail, 
  userUID, 
  paymentIntentId 
}) => {
  try {
    console.log('👕 Creating uniform orders for additional student:', {
      userUID,
      studentName: `${student.firstName} ${student.lastName}`,
      paymentIntentId
    });

    // Only create uniform order if sizes are specified and it's one-time plan
    if (student.uniformTop || student.uniformBottom) {
      const uniformOrderData = {
        studentId: student.uid,
        studentName: `${student.firstName} ${student.lastName}`,
        parentId: userUID,
        parentName: `${userData.firstName} ${userData.lastName}`,
        parentEmail: userEmail,
        parentPhone: userData.phone || '',
        team: student.sport || '',
        ageGroup: student.ageGroup || calculateAgeGroup(student.dob),
        uniformTop: student.uniformTop || '',
        uniformBottom: student.uniformBottom || '',
        paymentIntentId: paymentIntentId,
        paymentStatus: 'completed',
        orderStatus: 'processing',
        orderSource: 'additional_student', // Different source
        amount: 0, // $0 - included in one-time payment
        createdAt: new Date(),
        orderDate: new Date()
      };

      console.log('👕 Creating uniform order for additional student:', {
        studentName: uniformOrderData.studentName,
        parentId: uniformOrderData.parentId,
        orderSource: uniformOrderData.orderSource
      });
      
      // Use the same createUniformOrder endpoint
      await APIClient.createUniformOrder(uniformOrderData);
      console.log('✅ Uniform order created for additional student:', student.firstName);
    } else {
      console.log('⚠️ No uniform sizes specified for additional student:', student.firstName);
    }

    console.log('✅ Uniform order process completed for additional student');
  } catch (error) {
    console.error('❌ Error creating uniform orders for additional student:', error);
    // Don't throw error - uniform orders shouldn't fail the entire process
  }
};

// Process roster and group chat for additional student (similar to registration)
const processStudentForRosterAndChat = async (userData, student) => {
  try {
    console.log('🚀 Processing additional student for roster and group chat:', {
      student: `${student.firstName} ${student.lastName}`,
      sport: student.sport,
      location: student.location,
      ageGroup: student.ageGroup
    });

    const processingResults = [];

    try {
      // Add to roster - following the same pattern as registration
      const rosterResult = await RosterService.addPlayerToRoster(
        { 
          ...userData, 
          uid: userData.uid || userData.id,
          sport: student.sport || userData.sport,
          location: student.location || userData.location
        },
        {
          firstName: student.firstName,
          lastName: student.lastName,
          dob: student.dob,
          ageGroup: student.ageGroup,
        }
      );

      console.log('✅ Roster result for additional student:', rosterResult);

      // Create group chat - following the same pattern as registration
      const chatResult = await GroupChatService.createOrEnsureGroupChat(
        { 
          ...userData, 
          uid: userData.uid || userData.id,
          sport: student.sport || userData.sport,
          location: student.location || userData.location
        },
        {
          firstName: student.firstName,
          lastName: student.lastName,
          dob: student.dob,
          ageGroup: student.ageGroup,
        }
      );

      console.log('✅ Group chat result for additional student:', chatResult);

      processingResults.push({
        student: `${student.firstName} ${student.lastName}`,
        roster: rosterResult,
        chat: chatResult,
        success: rosterResult.success && chatResult.success,
      });

    } catch (error) {
      console.error(`❌ Error processing additional student for roster/chat:`, error);
      processingResults.push({
        student: `${student.firstName} ${student.lastName}`,
        success: false,
        error: error.message,
      });
    }

    return processingResults;

  } catch (error) {
    console.error('❌ Error in processStudentForRosterAndChat:', error);
    throw error;
  }
};

// Store payment record using existing payment history system
const storeAdditionalStudentPaymentRecord = async (student, paymentIntent, plan) => {
  try {
    const paymentData = {
      id: `additional_student_${Date.now()}`,
      planName: plan === "oneTime" ? "One-Time Additional Student" : "Monthly Additional Student",
      amount: plan === "oneTime" ? 20000 : 5000, // in cents
      currency: "USD",
      paymentStatus: "completed",
      paymentDate: new Date(),
      paymentMethod: "card",
      planType: plan,
      paymentIntentId: paymentIntent.id,
      description: `Additional student: ${student.firstName} ${student.lastName}`,
      studentName: `${student.firstName} ${student.lastName}`,
      isAdditionalStudent: true,
      studentId: student.uid,
      metadata: {
        paymentType: 'additional_student',
        studentId: student.uid
      }
    };

    // Store in sessionStorage for immediate access in payment history
    const existingPayments = JSON.parse(sessionStorage.getItem("additionalStudentPayments") || "[]");
    sessionStorage.setItem("additionalStudentPayments", JSON.stringify([...existingPayments, paymentData]));

    console.log("💰 Payment record stored for additional student");

  } catch (error) {
    console.error("❌ Error storing payment record:", error);
  }
};

// NEW: Direct update function that bypasses roster sync
const updateMemberDirectly = async (memberId, updates) => {
  try {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../../firebase/config');
    
    console.log('✏️ Updating member directly (no roster sync):', memberId);
    
    const memberRef = doc(db, 'members', memberId);
    await updateDoc(memberRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Member updated directly without roster sync');
    return { success: true, message: 'Member updated successfully' };
  } catch (error) {
    console.error('❌ Error updating member directly:', error);
    throw error;
  }
};

// Main Add Student Modal Component
const AddStudentModal = ({ isOpen, onClose, onStudentAdded }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1); // 1: Student Info, 2: Payment, 3: Success
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    student: {
      firstName: "",
      lastName: "",
      dob: "",
    },
    sport: "",
    location: "",
    uniformTop: "",
    uniformBottom: "",
  });

  const [errors, setErrors] = useState({});

  // Sport options
  const sportOptions = [
    { value: "Soccer", label: "⚽ Soccer" },
    { value: "Basketball", label: "🏀 Basketball" },
    { value: "Baseball", label: "⚾ Baseball" },
    { value: "Track", label: "🏃‍♂️ Track & Field" },
    { value: "Flag_football", label: "🏈 Flag Football" },
    { value: "Tackle_football", label: "🏈 Tackle Football" },
    { value: "Kickball", label: "🥎 Kickball" },
    { value: "Golf", label: "🏌️ Golf" },
    { value: "Cheer", label: "📣 Cheer" },
  ];

  // Uniform options
  const uniformOptions = [
    { value: "Youth XS", label: "Youth XS" },
    { value: "Youth S", label: "Youth S" },
    { value: "Youth M", label: "Youth M" },
    { value: "Youth L", label: "Youth L" },
    { value: "Youth XL", label: "Youth XL" },
    { value: "Youth 2XL", label: "Youth 2XL" },
    { value: "Adult XS", label: "Adult XS" },
    { value: "Adult S", label: "Adult S" },
    { value: "Adult M", label: "Adult M" },
    { value: "Adult L", label: "Adult L" },
    { value: "Adult XL", label: "Adult XL" },
    { value: "Adult 2XL", label: "Adult 2XL" },
  ];

  const handleStudentChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      student: {
        ...prev.student,
        [field]: value
      }
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateStep = (step) => {
    let newErrors = {};

    if (step === 1) {
      if (!formData.student.firstName) newErrors.firstName = "First name required";
      if (!formData.student.lastName) newErrors.lastName = "Last name required";
      if (!formData.student.dob) newErrors.dob = "Date of birth required";
      if (!formData.sport) newErrors.sport = "Select a sport";
      if (!formData.location) newErrors.location = "Select a location";
      
      // Validate age
      if (formData.student.dob && calculateAgeGroup(formData.student.dob) === "N/A") {
        newErrors.dob = "Student must be between 3-14 years old";
      }
    }

    if (step === 2 && plan === "oneTime") {
      if (!formData.uniformTop) newErrors.uniformTop = "Top size required";
      if (!formData.uniformBottom) newErrors.uniformBottom = "Bottom size required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Add student to database after successful payment
  const addStudentToDatabase = async (paymentIntent) => {
    setLoading(true);
    try {
      const userData = await getCurrentUserData(user.email);
      const ageGroup = calculateAgeGroup(formData.student.dob);

      const newStudent = {
        uid: `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        firstName: formData.student.firstName,
        lastName: formData.student.lastName,
        dob: formData.student.dob,
        ageGroup: ageGroup,
        sport: formData.sport,
        location: formData.location,
        uniformTop: formData.uniformTop,
        uniformBottom: formData.uniformBottom,
        registrationDate: new Date().toISOString(),
        paymentStatus: "completed",
        paymentIntentId: paymentIntent.id,
        planType: plan,
        isAdditionalStudent: true
      };

      const updatedStudents = [...(userData.students || []), newStudent];
      
      // Update user document with new student - USING DIRECT UPDATE TO BYPASS ROSTER SYNC
      await updateMemberDirectly(userData.id, { 
        students: updatedStudents,
        sport: formData.sport || userData.sport,
        location: formData.location || userData.location
      });

      console.log("✅ Student added to member document");

      // Process roster and group chat separately (like registration flow)
      const processingResults = await processStudentForRosterAndChat(userData, newStudent);
      console.log("✅ Roster and group chat processing completed:", processingResults);

      // Create uniform order if one-time plan (using similar pattern as registration)
      if (plan === "oneTime") {
        await createUniformOrdersForAdditionalStudent({
          student: newStudent,
          userData,
          userEmail: user.email,
          userUID: user.uid,
          paymentIntentId: paymentIntent.id
        });
      }

      // Store payment record
      await storeAdditionalStudentPaymentRecord(newStudent, paymentIntent, plan);

      console.log("✅ Student added successfully after payment:", newStudent);
      return newStudent;

    } catch (error) {
      console.error("❌ Error adding student to database:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      console.log("✅ Payment successful, adding student to database...");
      const newStudent = await addStudentToDatabase(paymentIntent);
      
      setCurrentStep(3);
      toast.success("Student added and payment completed successfully!");
      
      // Notify parent component
      if (onStudentAdded) {
        onStudentAdded(newStudent);
      }

    } catch (error) {
      console.error("❌ Error after payment success:", error);
      toast.error("Payment completed but failed to save student data. Please contact support.");
    }
  };

  const handlePaymentError = (error) => {
    console.error("❌ Payment error:", error);
    toast.error("Payment failed. Please try again.");
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
      student: { firstName: "", lastName: "", dob: "" },
      sport: "",
      location: "",
      uniformTop: "",
      uniformBottom: "",
    });
    setErrors({});
    setPlan(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {currentStep === 1 && "Add New Student"}
            {currentStep === 2 && "Payment Plan"}
            {currentStep === 3 && "Success!"}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      currentStep > step ? "bg-blue-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Student Info</span>
            <span>Payment</span>
            <span>Complete</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Student Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <StudentInfoForm
                student={formData.student}
                onChange={handleStudentChange}
                errors={errors}
              />

              <div className="grid grid-cols-1 gap-4">
                <InputField
                  label="Primary Sport"
                  name="sport"
                  type="select"
                  value={formData.sport}
                  error={errors.sport}
                  onChange={handleFormChange}
                  options={sportOptions}
                  isCustomSelect={true}
                  placeholder="Select sport"
                />

                <InputField
                  label="Primary Location"
                  name="location"
                  type="text"
                  value={formData.location}
                  error={errors.location}
                  onChange={handleFormChange}
                  placeholder="Enter location"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  onClick={handleClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={nextStep}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Payment */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <PaymentPlanSelector plan={plan} setPlan={setPlan} inFormAddStudent={true} />

              {plan && (
                <>
                  {/* Uniform Selection for One-Time Plan */}
                  {plan === "oneTime" && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-lg font-medium text-gray-800 mb-3">
                        Uniform Selection
                      </h4>
                      <p className="text-gray-600 mb-4">
                        Your One-Time Payment ($200) includes a complete uniform set.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField
                          label="Top Size"
                          name="uniformTop"
                          type="select"
                          value={formData.uniformTop}
                          error={errors.uniformTop}
                          onChange={handleFormChange}
                          options={uniformOptions}
                          placeholder="Select top size"
                        />
                        <InputField
                          label="Bottom Size"
                          name="uniformBottom"
                          type="select"
                          value={formData.uniformBottom}
                          error={errors.uniformBottom}
                          onChange={handleFormChange}
                          options={uniformOptions}
                          placeholder="Select bottom size"
                        />
                      </div>
                    </div>
                  )}

                  {/* Payment Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">
                      Payment Summary
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Student Registration</span>
                        <span>${plan === "oneTime" ? "200.00" : "50.00"}</span>
                      </div>
                      {plan === "oneTime" && (
                        <div className="flex justify-between text-green-600">
                          <span>Uniform (Included)</span>
                          <span>$0.00</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Total</span>
                        <span>${plan === "oneTime" ? "200.00" : "50.00"}</span>
                      </div>
                      {plan === "monthly" && (
                        <p className="text-sm text-gray-600 mt-2">
                          * Uniform can be purchased separately for $75
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stripe Checkout */}
                  <Elements stripe={stripePromise}>
                    <AddStudentStripeCheckout
                      plan={plan}
                      amount={plan === "oneTime" ? 20000 : 5000}
                      user={user}
                      studentData={formData.student}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  </Elements>

                  <div className="flex justify-start pt-4">
                    <button
                      onClick={prevStep}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back to Student Info
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Success */}
          {currentStep === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Student Added Successfully!
              </h3>
              <p className="text-gray-600 mb-6">
                {formData.student.firstName} {formData.student.lastName} has been registered 
                {plan && ` with ${plan === "oneTime" ? "one-time" : "monthly"} payment`}.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-green-800 mb-2">
                  What happens next?
                </h4>
                <ul className="text-left text-green-700 text-sm space-y-1">
                  <li>• Student is now in your profile</li>
                  <li>• Payment has been recorded in your history</li>
                  {plan === "oneTime" && <li>• Uniform will be processed</li>}
                  <li>• Student has been added to team roster</li>
                  <li>• You can manage this student from your dashboard</li>
                </ul>
              </div>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddStudentModal;