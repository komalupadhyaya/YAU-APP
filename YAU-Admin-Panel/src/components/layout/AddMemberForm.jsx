import React, { useEffect, useState, useCallback } from 'react';
import { User, Mail, Phone, MapPin, Trophy, Users, Save, X, Plus } from 'lucide-react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Button from '../common/Button';
import { getLocations } from '../../firebase/firestore';
import { Autocomplete } from '../common/AutoComplete';
import dayjs from 'dayjs';

const AddMemberForm = ({ onSave, onCancel, loading, setLoading }) => {
  const [locations, setLocations] = useState([]);
  const [touched, setTouched] = useState({});
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    sport: '',
    membershipType: '',
    password: '',
    students: []
  });
  const [errors, setErrors] = useState({});

  const MIN_AGE = 3;
  const MAX_AGE = 14;
  const currentYear = new Date().getFullYear();
  const maxBirthYear = currentYear - MIN_AGE; // Minimum age 3
  const minBirthYear = currentYear - MAX_AGE; // Maximum age 14
  const minAllowedDate = dayjs(`${minBirthYear}-01-01`);
  const maxAllowedDate = dayjs(`${maxBirthYear}-12-31`);

  // Sport options with emojis (same as Registration)
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

  const loadData = async () => {
    try {
      setLoading(true);
      const locationsData = await getLocations();
      const processedLocations = locationsData.map((location) => ({
        id: location.id,
        name: location.name || location.label || location,
        label: location.name || location.label || location,
        ...location,
      }));
      setLocations(processedLocations);
    } catch (error) {
      console.error("Error loading data:", error);
      setLocations([
        { id: "andrews_afb", name: "Andrews AFB - Clinton" },
        { id: "bowie", name: "Bowie, MD" },
        { id: "greenbelt", name: "Greenbelt, MD" },
        { id: "john_bayne", name: "John Bayne Elementary School" },
        { id: "national_harbor", name: "National Harbor, MD" },
        { id: "waldorf", name: "Waldorf-Laplata, MD" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateAgeGroup = useCallback((dob) => {
    if (!dob) return "N/A";
    try {
      const birthDate = new Date(dob);
      if (isNaN(birthDate.getTime())) return "N/A";

      const today = new Date();
      const currentYear = today.getFullYear();
      const cutoffDate = new Date(currentYear, 6, 31); // July 31 cutoff
      const seasonAge = currentYear - birthDate.getFullYear();

      if (seasonAge < MIN_AGE || seasonAge > MAX_AGE) {
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
      if (groupNumber < MIN_AGE) {
        return "3U";
      }

      return ageGroup;
    } catch (error) {
      console.error("Error calculating age group:", error);
      return "N/A";
    }
  }, []);

  const validateField = useCallback((name, value) => {
    let newErrors = { ...errors };

    switch (name) {
      case "firstName":
        if (!value?.trim()) newErrors.firstName = "First name is required";
        else delete newErrors.firstName;
        break;
      case "lastName":
        if (!value?.trim()) newErrors.lastName = "Last name is required";
        else delete newErrors.lastName;
        break;
      case "email":
        if (!value?.trim()) newErrors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(value)) newErrors.email = "Email is invalid";
        else delete newErrors.email;
        break;
      case "phone":
        if (value && !/^\d{10}$/.test(value.replace(/\D/g, ''))) {
          newErrors.phone = "Phone must be 10 digits";
        } else {
          delete newErrors.phone;
        }
        break;
      case "password":
        if (!value?.trim()) newErrors.password = "Password is required";
        else if (value.length < 6) newErrors.password = "Password must be at least 6 characters";
        else delete newErrors.password;
        break;
      case "sport":
        if (!value) newErrors.sport = "Select a sport";
        else delete newErrors.sport;
        break;
      case "location":
        if (!value) newErrors.location = "Select a location";
        else delete newErrors.location;
        break;
      default:
        // Handle student fields
        if (name.startsWith("studentFirst-")) {
          if (!value) newErrors[name] = "Student first name required";
          else delete newErrors[name];
        } else if (name.startsWith("studentLast-")) {
          if (!value) newErrors[name] = "Student last name required";
          else delete newErrors[name];
        } else if (name.startsWith("studentDob-")) {
          if (!value) newErrors[name] = "Date of birth required";
          else delete newErrors[name];
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [errors]);

  const validateForm = useCallback(() => {
    let newErrors = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!formData.email?.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = "Phone must be 10 digits";
    }
    if (!formData.password?.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (!formData.sport) {
      newErrors.sport = "Select a sport";
    }
    if (!formData.location) {
      newErrors.location = "Select a location";
    }

    formData.students.forEach((student, index) => {
      if (!student.firstName) newErrors[`studentFirst-${index}`] = "Student first name required";
      if (!student.lastName) newErrors[`studentLast-${index}`] = "Student last name required";
      if (!student.dob) newErrors[`studentDob-${index}`] = "Date of birth required";
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const memberData = {
      ...formData,
      isPaidMember: false,
      paymentStatus: 'Active',
      phone: formData.phone ? formData.phone.replace(/\D/g, '') : null,
      students: formData.students.map(student => ({
        ...student,
        ageGroup: calculateAgeGroup(student.dob),
      })),
    };

    onSave(memberData);
  }, [formData, calculateAgeGroup, validateForm, onSave]);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (touched[field]) {
      validateField(field, value);
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, formData[name]);
  }, [formData, validateField]);

  const addStudent = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      students: [...prev.students, { firstName: '', lastName: '', dob: '', ageGroup: '' }]
    }));
  }, []);

  const updateStudent = useCallback((index, field, value) => {
    const updatedStudent = { [field]: value };
    if (field === 'dob' && value) {
      updatedStudent.ageGroup = calculateAgeGroup(value);
    }

    setFormData(prev => ({
      ...prev,
      students: prev.students.map((student, i) =>
        i === index ? { ...student, ...updatedStudent } : student
      )
    }));

    const fieldName = `student${field.charAt(0).toUpperCase() + field.slice(1)}-${index}`;
    if (touched[fieldName]) {
      validateField(fieldName, value);
    }
  }, [touched, validateField, calculateAgeGroup]);

  const removeStudent = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      students: prev.students.filter((_, i) => i !== index)
    }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`studentFirst-${index}`];
      delete newErrors[`studentLast-${index}`];
      delete newErrors[`studentDob-${index}`];
      return newErrors;
    });
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-gray-800 border-b pb-2">
            Basic Information
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User size={14} className="inline mr-1" />
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.firstName ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="First Name"
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.lastName ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="Last Name"
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail size={14} className="inline mr-1" />
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="Email Address"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone size={14} className="inline mr-1" />
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="Phone Number"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Autocomplete
                label="Primary Location"
                name="location"
                options={locations.map((loc) => loc.name || loc.label || loc)}
                value={formData.location}
                onChange={(value) => {
                  handleInputChange('location', value);
                  if (touched.location) {
                    validateField('location', value);
                  }
                }}
                onBlur={handleBlur}
                placeholder="Select or enter your primary location"
                getOptionLabel={(location) => location}
                getOptionValue={(location) => location}
                allowCustomInput={true}
                required
                className="w-full"
              />
              {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
            </div>

            <div>
              <Autocomplete
                label="Primary Sport"
                name="sport"
                options={sportOptions.map(sport => sport.label)}
                value={sportOptions.find(sport => sport.value === formData.sport)?.label || formData.sport}
                onChange={(value) => {
                  const selectedSport = sportOptions.find(sport => sport.label === value)?.value || value;
                  handleInputChange('sport', selectedSport);
                  if (touched.sport) {
                    validateField('sport', selectedSport);
                  }
                }}
                onBlur={handleBlur}
                placeholder="Select or enter your primary sport"
                getOptionLabel={(sport) => sport}
                getOptionValue={(sport) => sport}
                allowCustomInput={true}
                required
                className="w-full"
              />
              {errors.sport && <p className="text-red-500 text-xs mt-1">{errors.sport}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Membership Type
              </label>
              <select
                name="membershipType"
                value={formData.membershipType}
                onChange={(e) => handleInputChange('membershipType', e.target.value)}
                onBlur={handleBlur}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Type</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One-time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-800 font-medium">Active</span>
                <p className="text-xs text-green-600 mt-1">New members start as Active (legacy status)</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              onBlur={handleBlur}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Enter password for member login"
              minLength="6"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            <p className="text-sm text-gray-600 mt-1">
              This password will be used for member login to members.yauapp.com
            </p>
          </div>
        </div>

        {/* Students Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-gray-800 border-b pb-2">
              <Users size={16} className="inline mr-1" />
              Students ({formData.students.length})
            </h4>
            <Button
              type="button"
              onClick={addStudent}
              variant="secondary"
              size="sm"
              className="flex items-center gap-1"
            >
              <Plus size={14} />
              Add Student
            </Button>
          </div>

          {formData.students.map((student, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-800">Student {index + 1}</span>
                {formData.students.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStudent(index)}
                    className="text-red-600 hover:text-red-800"
                    title="Remove Student"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name={`studentFirst-${index}`}
                    value={student.firstName || ''}
                    onChange={(e) => updateStudent(index, 'firstName', e.target.value)}
                    onBlur={handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[`studentFirst-${index}`] ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="First Name"
                  />
                  {errors[`studentFirst-${index}`] && <p className="text-red-500 text-xs mt-1">{errors[`studentFirst-${index}`]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name={`studentLast-${index}`}
                    value={student.lastName || ''}
                    onChange={(e) => updateStudent(index, 'lastName', e.target.value)}
                    onBlur={handleBlur}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[`studentLast-${index}`] ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="Last Name"
                  />
                  {errors[`studentLast-${index}`] && <p className="text-red-500 text-xs mt-1">{errors[`studentLast-${index}`]}</p>}
                </div>
                <div>
                  <DatePicker
                    label="Date of Birth *"
                    name={`studentDob-${index}`}
                    value={student.dob ? dayjs(student.dob) : null}
                    onChange={(date) => updateStudent(index, 'dob', date ? date.format("YYYY-MM-DD") : '')}
                    minDate={minAllowedDate}
                    maxDate={maxAllowedDate}
                    disableFuture
                    views={["year", "month", "day"]}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors[`studentDob-${index}`],
                        helperText: errors[`studentDob-${index}`] || `Birth year must be between ${minBirthYear}-${maxBirthYear}. Students must be 3-14 years old as of July 31st.`,
                        onBlur: () => {
                          setTouched(prev => ({ ...prev, [`studentDob-${index}`]: true }));
                          validateField(`studentDob-${index}`, student.dob);
                        }
                      },
                    }}
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age Group
                  </label>
                  <input
                    type="text"
                    value={student.ageGroup || calculateAgeGroup(student.dob)}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    placeholder="Age Group (auto-calculated)"
                  />
                  {student.dob && (
                    <div className="text-xs mt-1">
                      {calculateAgeGroup(student.dob) === "N/A" ? (
                        <span className="text-red-500">
                          ⚠ Student must be between 3-14 years old (born {minBirthYear}-{maxBirthYear})
                        </span>
                      ) : (
                        <span className="text-green-600">
                          ✓ Eligible: {calculateAgeGroup(student.dob)} Age Group
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {formData.students.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users size={32} className="mx-auto mb-2 text-gray-300" />
              <p>No students added yet</p>
              <p className="text-sm">Click "Add Student" to get started</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            {loading ? 'Creating...' : 'Create Member'}
          </Button>
        </div>
      </form>
    </LocalizationProvider>
  );
};

export default AddMemberForm;