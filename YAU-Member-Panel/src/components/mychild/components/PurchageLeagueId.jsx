import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCamera, FaFilePdf, FaImage, FaCheck, FaCreditCard, FaLock, FaSpinner } from 'react-icons/fa';
import { uploadChildImage } from "../utils/uploadImage";
import { updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase/config.js";
import { useAuth } from "../../../context/AuthContext";
import { APIClient } from "../../../firebase/ApiClient.js";

// Update student document with purchase league ID data
async function updateStudentForLeagueId(memberId, childUid, data) {
  const parentRef = doc(db, "members", memberId);
  const parentSnap = await getDoc(parentRef);

  if (!parentSnap.exists()) throw new Error("Parent not found");

  const parentData = parentSnap.data();

  const updatedStudents = parentData.students.map((student) =>
    student.uid === childUid
      ? {
          ...student,
          ...data,
          idStatus: "pending",
          leagueIdPurchased: true,
          updatedAt: new Date()
        }
      : student
  );

  await updateDoc(parentRef, { students: updatedStudents });
}

// Simple Child ID Payment Component
const ChildIdPaymentForm = ({ amount, childName, user, onSuccess, onError, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiry: '',
    cvc: '',
    name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email?.split('@')[0] || '',
    email: user?.email || '',
  });
  const [errors, setErrors] = useState({});

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
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.cardNumber) newErrors.cardNumber = 'Card number is required';
    if (!formData.expiry) newErrors.expiry = 'Expiry date is required';
    if (!formData.cvc) newErrors.cvc = 'CVC is required';
    
    const cardNumber = formData.cardNumber.replace(/\s/g, '');
    if (cardNumber === '4000000000000002') {
      newErrors.cardNumber = 'Your card was declined';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Create payment intent via API
      console.log('🔄 Creating Child ID payment intent', {
        amount,
        childName,
        userEmail: formData.email
      });

      const paymentIntentResult = await APIClient.createPaymentIntent(
        amount,
        'usd',
        'childId',
        formData.email,
        user?.uid,
        {
          productType: 'childId',
          studentName: childName,
          userName: formData.name,
          planName: 'Child ID Service',
          description: `Child ID service for ${childName}`
        }
      );

      console.log('✅ Payment intent created:', paymentIntentResult);

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const cardNumber = formData.cardNumber.replace(/\s/g, '');
      
      // Test card scenarios
      if (cardNumber === '4000000000000069') {
        throw new Error('Your card has expired.');
      } else if (cardNumber === '4000000000000127') {
        throw new Error('Your card has insufficient funds.');
      }
      
      // Simulate successful payment
      onSuccess({
        id: paymentIntentResult.paymentIntentId || `pi_demo_${Date.now()}`,
        paymentIntentId: paymentIntentResult.paymentIntentId,
        status: 'succeeded',
        amount: amount,
        currency: 'usd',
        billing_details: {
          name: formData.name,
          email: formData.email,
        }
      });

    } catch (error) {
      console.error('❌ Child ID payment failed:', error);
      onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-md border border-gray-200">
      <h3 className="text-lg font-semibold text-green-700 mb-4">Child ID Payment - ${(amount / 100).toFixed(2)}</h3>
      <p className="text-sm text-gray-600 mb-4">Complete payment for {childName}'s Child ID service</p>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="john@example.com"
            />
            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name on Card</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="John Doe"
            />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
            <input
              type="text"
              value={formData.cardNumber}
              onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.cardNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="1234 5678 9012 3456"
              maxLength="19"
            />
            {errors.cardNumber && <p className="text-red-600 text-sm mt-1">{errors.cardNumber}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expiry</label>
              <input
                type="text"
                value={formData.expiry}
                onChange={(e) => handleInputChange('expiry', formatExpiry(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.expiry ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="MM/YY"
                maxLength="5"
              />
              {errors.expiry && <p className="text-red-600 text-sm mt-1">{errors.expiry}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CVC</label>
              <input
                type="text"
                value={formData.cvc}
                onChange={(e) => handleInputChange('cvc', e.target.value.replace(/\D/g, '').slice(0, 3))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.cvc ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="123"
                maxLength="3"
              />
              {errors.cvc && <p className="text-red-600 text-sm mt-1">{errors.cvc}</p>}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white mt-6 transition-all ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <FaSpinner className="animate-spin" />
              Processing Payment...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <FaLock />
              Pay ${(amount / 100).toFixed(2)}
            </div>
          )}
        </button>
      </form>
      
      <div className="mt-4 flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Test Cards Info */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm">
        <h4 className="font-medium text-yellow-800 mb-2">🧪 Test Cards</h4>
        <div className="text-yellow-700 space-y-1">
          <p><code>4242 4242 4242 4242</code> - Success</p>
          <p><code>4000 0000 0000 0002</code> - Declined</p>
          <p><code>4000 0000 0000 0069</code> - Expired Card</p>
          <p><code>4000 0000 0000 0127</code> - Insufficient Funds</p>
          <p className="text-xs mt-2">Use any future expiry (e.g., 12/28) and any 3-digit CVC</p>
        </div>
      </div>
    </div>
  );
};


function PurchaseLeagueID({ child, memberId, onSubmit }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('upload'); // 'upload' or 'payment'
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // File states
  const [birthCertificateFile, setBirthCertificateFile] = useState(null);
  const [headshotFile, setHeadshotFile] = useState(null);
  const [birthCertificatePreview, setBirthCertificatePreview] = useState(null);
  const [headshotPreview, setHeadshotPreview] = useState(null);
  
  // Refs for file inputs
  const birthCertRef = useRef(null);
  const headshotRef = useRef(null);

  // Clean up preview URLs
  useEffect(() => {
    return () => {
      if (birthCertificatePreview) URL.revokeObjectURL(birthCertificatePreview);
      if (headshotPreview) URL.revokeObjectURL(headshotPreview);
    };
  }, [birthCertificatePreview, headshotPreview]);

  const handleFileChange = (setFile, setPreview, fileType) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFile(file);
    
    // Create preview if it's an image
    if (file.type.includes('image')) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
    } else {
      setPreview(null);
    }
  };

  const openFilePicker = (ref) => ref.current?.click();

  const handleUploadFiles = async () => {
    if (!birthCertificateFile || !headshotFile) {
      alert("Please upload both birth certificate and headshot photo");
      return;
    }

    try {
      setBusy(true);
      
      // Upload birth certificate
      const birthCertUrl = await uploadChildImage(
        birthCertificateFile, 
        `child-purchasedid-docs/${child.id}/birth-certificate`
      );
      
      // Upload headshot
      const headshotUrl = await uploadChildImage(
        headshotFile, 
        `child-purchasedid-docs/${child.id}/headshot`
      );

      if (!birthCertUrl || !headshotUrl) {
        throw new Error("File upload failed");
      }

      // Get file extensions
      const birthCertExt = birthCertificateFile.type === "application/pdf" 
        ? "pdf" 
        : birthCertificateFile.type.split("/")[1];
      
      const headshotExt = headshotFile.type.split("/")[1];

      // Save to Firestore
      await updateStudentForLeagueId(memberId, child.id, {
        birthCertificateUrl: birthCertUrl,
        birthCertificateUrl_filetype: birthCertExt,
        headshotUrl: headshotUrl,
        headshotUrl_filetype: headshotExt,
        leagueIdRequestDate: new Date()
      });

      // Move to payment step
      setStep('payment');
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed, please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handlePaymentSuccess = async (paymentResult) => {
    try {
      console.log('🆔 Child ID payment successful:', paymentResult);
      
      // Update with payment information and set status to active
      await updateStudentForLeagueId(memberId, child.id, {
        leagueIdPayment: {
          amount: 1000, // $10 in cents
          currency: "usd",
          status: "succeeded",
          paymentIntentId: paymentResult.paymentIntentId || paymentResult.id,
          paidAt: new Date()
        },
        idStatus: "active", // Set child status to active after payment
        statusUpdatedAt: new Date()
      });
      
      setPaymentSuccess(true);
      setTimeout(() => {
        onSubmit?.(); // Notify parent component
      }, 2000);
    } catch (error) {
      console.error("Error updating payment info:", error);
      alert("Payment succeeded but there was an error updating records. Please contact support.");
    }
  };

  const handlePaymentError = (error) => {
    console.error('🆔 Child ID payment failed:', error);
    alert(`Payment error: ${error.message || 'Payment failed'}`);
  };

  if (paymentSuccess) {
    return (
      <motion.div
        className="p-6 text-center border rounded-2xl shadow-md bg-green-50 text-green-700"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaCheck className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
        <p className="mb-4">Your League ID purchase is being processed.</p>
        <button
          onClick={() => setStep('upload')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg"
        >
          Back to Uploads
        </button>
      </motion.div>
    );
  }

  if (step === 'payment') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ChildIdPaymentForm
          amount={1000} // $10 in cents
          childName={child.name}
          user={user}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onCancel={() => setStep('upload')}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-4 bg-white rounded-2xl shadow-md border border-gray-200"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-lg font-semibold text-green-700 mb-3">
        Purchase League ID ($10)
      </h2>
      <p className="text-sm py-4 pt-0">
        Please upload your child's birth certificate and headshot photo to order a YAU League ID.
      </p>

      <div className="space-y-6">
        {/* Pre-filled child info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={child.firstName || ''}
              className="w-full border rounded-lg p-2 bg-gray-50"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={child.lastName || ''}
              className="w-full border rounded-lg p-2 bg-gray-50"
              readOnly
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <input
            type="text"
            value={child.dob || ''}
            className="w-full border rounded-lg p-2 bg-gray-50"
            readOnly
          />
        </div>

        {/* Birth Certificate Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Birth Certificate
          </label>
          <div className="flex gap-2 mb-2">
            <button 
              className="px-3 py-2 bg-green-600 text-white rounded-lg flex items-center"
              onClick={() => alert("Take Photo functionality will be implemented later")}
              disabled={busy}
            >
              <FaCamera className="mr-2" /> Take Photo
            </button>
            <button 
              className="px-3 py-2 bg-green-100 text-green-700 rounded-lg border border-green-400 flex items-center"
              onClick={() => openFilePicker(birthCertRef)}
              disabled={busy}
            >
              <FaImage className="mr-2" /> Upload File
            </button>
          </div>
          
          <input
            ref={birthCertRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileChange(
              setBirthCertificateFile, 
              setBirthCertificatePreview,
              'birth-certificate'
            )}
          />
          
          {birthCertificatePreview && (
            <div className="mt-2 p-2 border border-gray-300 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Birth Certificate Preview:</h4>
              <img 
                src={birthCertificatePreview} 
                alt="Birth certificate preview" 
                className="max-h-48 max-w-full object-contain rounded-md"
              />
            </div>
          )}
          
          {birthCertificateFile && birthCertificateFile.type === 'application/pdf' && (
            <div className="mt-2 p-2 border border-gray-300 rounded-lg flex items-center">
              <FaFilePdf className="text-red-500 text-2xl mr-2" />
              <span>{birthCertificateFile.name}</span>
            </div>
          )}
        </div>

        {/* Headshot Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Headshot Photo
          </label>
          <div className="flex gap-2 mb-2">
            <button 
              className="px-3 py-2 bg-green-600 text-white rounded-lg flex items-center"
              onClick={() => alert("Take Photo functionality will be implemented later")}
              disabled={busy}
            >
              <FaCamera className="mr-2" /> Take Photo
            </button>
            <button 
              className="px-3 py-2 bg-green-100 text-green-700 rounded-lg border border-green-400 flex items-center"
              onClick={() => openFilePicker(headshotRef)}
              disabled={busy}
            >
              <FaImage className="mr-2" /> Upload Photo
            </button>
          </div>
          
          <input
            ref={headshotRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange(
              setHeadshotFile, 
              setHeadshotPreview,
              'headshot'
            )}
          />
          
          {headshotPreview && (
            <div className="mt-2 p-2 border border-gray-300 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Headshot Preview:</h4>
              <img 
                src={headshotPreview} 
                alt="Headshot preview" 
                className="max-h-48 max-w-full object-contain rounded-md"
              />
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleUploadFiles}
        disabled={busy || !birthCertificateFile || !headshotFile}
        className="mt-6 w-full bg-green-600 text-white py-2 rounded-lg disabled:opacity-50"
      >
        {busy ? "Uploading..." : "Continue to Payment"}
      </button>
    </motion.div>
  );
}

export default PurchaseLeagueID;