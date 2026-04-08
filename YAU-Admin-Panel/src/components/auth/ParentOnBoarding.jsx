import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Baby } from 'lucide-react';
import { calculateAgeGroup } from '../../utils/ageCalculator';
import { locations } from '../../data/demoData';

const ParentOnBoarding = ({ onBack }) => {
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [parentData, setParentData] = useState({
    name: '',
    email: '',
    phone: '',
    location: ''
  });
  const [childData, setChildData] = useState({
    name: '',
    dateOfBirth: '',
    ageGroup: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleParentChange = (e) => {
    const { name, value } = e.target;
    setParentData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleChildChange = (e) => {
    const { name, value } = e.target;
    const updatedChildData = { ...childData, [name]: value };
    
    if (name === 'dateOfBirth' && value) {
      updatedChildData.ageGroup = calculateAgeGroup(value);
    }
    
    setChildData(updatedChildData);
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!parentData.name.trim()) newErrors.name = 'Name is required';
    if (!parentData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(parentData.email)) newErrors.email = 'Invalid email format';
    if (!parentData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!parentData.location) newErrors.location = 'Location is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!childData.name.trim()) newErrors.childName = 'Child\'s name is required';
    if (!childData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep2()) return;
    
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create user with onboarding complete
      const userData = {
        id: Date.now(),
        name: parentData.name,
        email: parentData.email,
        phone: parentData.phone,
        location: parentData.location,
        role: 'parent',
        isOnboarded: true,
        child: {
          ...childData,
          id: Date.now() + 1
        },
        joinDate: new Date().toISOString()
      };
      
      login(userData);
    } catch (error) {
      setErrors({ general: 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={step === 1 ? onBack : () => setStep(1)}
            className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            {step === 1 ? 'Back' : 'Previous Step'}
          </button>
          
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-2xl font-bold gradient-text">YAU</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Parent Registration</h1>
          <p className="text-white/80">
            Step {step} of 2: {step === 1 ? 'Your Information' : 'Child Information'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-white text-primary-500' : 'bg-white/30 text-white'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 rounded ${step >= 2 ? 'bg-white' : 'bg-white/30'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2 ? 'bg-white text-primary-500' : 'bg-white/30 text-white'
            }`}>
              2
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-6 lg:p-8">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm mb-6">
              {errors.general}
            </div>
          )}

          {step === 1 ? (
            // Step 1: Parent Information
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={parentData.name}
                    onChange={handleParentChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                      errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'
                    }`}
                    placeholder="Enter your full name"
                  />
                </div>
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={parentData.email}
                    onChange={handleParentChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                      errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'
                    }`}
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={parentData.phone}
                    onChange={handleParentChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                      errors.phone ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'
                    }`}
                    placeholder="Enter your phone number"
                  />
                </div>
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    name="location"
                    value={parentData.location}
                    onChange={handleParentChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                      errors.location ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'
                    }`}
                  >
                    <option value="">Select your location</option>
                    {locations.map((location) => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>
                {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
              </div>

              <Button type="submit" className="w-full py-3">
                Continue to Child Information
              </Button>
            </form>
          ) : (
            // Step 2: Child Information
            <form onSubmit={handleFinalSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Child's Name
                </label>
                <div className="relative">
                  <Baby size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={childData.name}
                    onChange={handleChildChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                      errors.childName ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'
                    }`}
                    placeholder="Enter your child's name"
                  />
                </div>
                {errors.childName && <p className="mt-1 text-sm text-red-600">{errors.childName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={childData.dateOfBirth}
                    onChange={handleChildChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                      errors.dateOfBirth ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'
                    }`}
                  />
                </div>
                {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>}
              </div>

              {childData.ageGroup && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age Group (Calculated)
                  </label>
                  <div className="p-4 bg-primary-50 rounded-xl">
                    <div className="flex items-center justify-center">
                      <span className="px-4 py-2 bg-primary-100 text-primary-800 rounded-full font-medium">
                        {childData.ageGroup}
                      </span>
                    </div>
                    <p className="text-sm text-primary-700 text-center mt-2">
                      Age calculated based on July 31st cutoff date
                    </p>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full py-3"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentOnBoarding;