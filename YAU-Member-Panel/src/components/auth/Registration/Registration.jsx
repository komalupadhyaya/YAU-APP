import React, { useEffect, useState, useCallback, memo } from "react";
import {
  addMember,
  emailExist,
  createFirebaseAuthUser,
} from "../../../firebase/apis/api-members.js";
import { collection, doc } from "firebase/firestore";
import { db } from "../../../firebase/config.js";
import GroupChatService from "../../../services/groupChatService.js";
import RosterService from "../../../services/rosterService.js";
import { toast } from "react-hot-toast"; // Import toast library

import dayjs from "dayjs";
import { getLocations } from "../../../firebase/firestore.js";
import { getMembers } from "../../../firebase/apis/api-members.js";
import { Autocomplete } from "../../common/AutoComplete.jsx";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  User,
  Phone,
  Users,
  ClipboardList,
  Shirt,
  FileText,
  CheckCircle,
  Shield,
} from "lucide-react";
import YAU_Logo from "../../../assets/YAU_Logo.png";
import soccerPitch from "../../../assets/soccer-pitch.jpg";

const steps = [
  "Your Info",
  "Your Child",
  "Choose Program",
  "Uniform Selection",
  "Agreements",
];

const stepsWithIcons = [
  { name: "Your Info", icon: User },
  { name: "Your Child", icon: Users },
  { name: "Choose Program", icon: ClipboardList },
  { name: "Safe environment", icon: Shield },
];

// Country codes for phone numbers
const COUNTRY_CODES = [
  { code: "+1", country: "United States", flag: "🇺🇸", maxDigits: 10 },
  { code: "+91", country: "India", flag: "🇮🇳", maxDigits: 10 },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧", maxDigits: 10 },
  { code: "+61", country: "Australia", flag: "🇦🇺", maxDigits: 9 },
  { code: "+49", country: "Germany", flag: "🇩🇪", maxDigits: 10 },
  { code: "+33", country: "France", flag: "🇫🇷", maxDigits: 9 },
  { code: "+81", country: "Japan", flag: "🇯🇵", maxDigits: 10 },
  { code: "+86", country: "China", flag: "🇨🇳", maxDigits: 11 },
  { code: "+7", country: "Russia", flag: "🇷🇺", maxDigits: 10 },
  { code: "+55", country: "Brazil", flag: "🇧🇷", maxDigits: 11 },
  { code: "+27", country: "South Africa", flag: "🇿🇦", maxDigits: 9 },
  { code: "+52", country: "Mexico", flag: "🇲🇽", maxDigits: 10 },
  { code: "+39", country: "Italy", flag: "🇮🇹", maxDigits: 10 },
  { code: "+34", country: "Spain", flag: "🇪🇸", maxDigits: 9 },
  { code: "+31", country: "Netherlands", flag: "🇳🇱", maxDigits: 9 },
  { code: "+46", country: "Sweden", flag: "🇸🇪", maxDigits: 9 },
  { code: "+47", country: "Norway", flag: "🇳🇴", maxDigits: 8 },
  { code: "+45", country: "Denmark", flag: "🇩🇰", maxDigits: 8 },
  { code: "+41", country: "Switzerland", flag: "🇨🇭", maxDigits: 9 },
  { code: "+43", country: "Austria", flag: "🇦🇹", maxDigits: 10 }
];

// Memoized phone input component with country code
const PhoneInputField = memo(({ label, name, value, countryCodeValue, error, onChange, onCountryCodeChange, onBlur, placeholder }) => {
  const phoneInputId = `input-${name}`;
  const countryCodeId = `country-code-${name}`;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="flex">
        {/* Country Code Dropdown */}
        <div className="relative">
          <select
            id={countryCodeId}
            name="countryCode"
            value={countryCodeValue}
            onChange={onCountryCodeChange}
            onBlur={onBlur}
            className="input rounded-r-none border-r-0
             w-24 sm:w-32 pr-8 appearance-none bg-white"
          >
            {COUNTRY_CODES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.code}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Phone Number Input */}
        <input
          id={phoneInputId}
          type="tel"
          name={name}
          placeholder={placeholder}
          className={`input rounded-l-none border-l-0 flex-1 ${error ? "border-red-500" : ""}`}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
        />
      </div>

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      {/* Country info */}
      <p className="text-xs text-gray-500 mt-1">
        {COUNTRY_CODES.find(c => c.code === countryCodeValue)?.country} - {COUNTRY_CODES.find(c => c.code === countryCodeValue)?.maxDigits} digits required
      </p>
    </div>
  );
});

// Memoized input component
const InputField = memo(
  ({
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
              className={`input flex items-center justify-between cursor-pointer ${error ? "border-red-500" : ""
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
        ) : type === "checkbox" ? (
          <label className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
            <input
              id={inputId}
              type="checkbox"
              name={name}
              checked={value}
              onChange={onChange}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
            />
            <span className="text-sm font-medium text-gray-700">
              {placeholder}
            </span>
          </label>
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
  }
);

// Memoized step card component
const StepCard = memo(({ step, displayStep, title, children }) => {
  // Calculate display step: step 0 = 1, step 2 = 2, step 3 = 3, step 4 = 4
  const stepNumber = displayStep !== undefined ? displayStep : (step === 0 ? 1 : step === 2 ? 2 : step === 3 ? 3 : step === 4 ? 4 : step + 1);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 w-full max-w-2xl mx-auto">
      <div className="flex items-center mb-4 sm:mb-6">
        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500 text-white font-bold mr-3">
          {stepNumber}
        </div>
        <h3 className="text-xl sm:text-2xl font-semibold text-gray-800">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
});

const MIN_AGE = 3;
const MAX_AGE = 14;

const calculateAgeGroup = (dob) => {
  if (!dob) return "N/A";

  try {
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return "N/A";

    const today = new Date();
    const currentYear = today.getFullYear();

    // Create the cutoff date for this year (July 31)
    const cutoffDate = new Date(currentYear, 6, 31); // Month is 0-indexed (6 = July)

    // 1. Calculate the player's "season age" (age on Dec 31 of this year)
    const seasonAge = currentYear - birthDate.getFullYear();

    // 2. Check if the season age is within the valid range (3-14)
    if (seasonAge < 3 || seasonAge > 14) {
      return "N/A";
    }

    // 3. Create the player's birthday for THIS year
    const birthdayThisYear = new Date(
      currentYear,
      birthDate.getMonth(),
      birthDate.getDate()
    );

    // 4. Apply the Roster Logic
    let ageGroup;
    if (birthdayThisYear > cutoffDate) {
      // Player's birthday is AFTER the cutoff.
      // They are eligible to play one group DOWN (e.g., 12U base -> 11U eligible).
      ageGroup = seasonAge - 1 + "U";
    } else {
      // Player's birthday is ON or BEFORE the cutoff.
      // They must play in their base group.
      ageGroup = seasonAge + "U";
    }

    // 5. Handle the edge case for the youngest group.
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

// Grade options for student (K through 8th)
const GRADE_OPTIONS = [
  { value: "Kindergarten", label: "Kindergarten" },
  { value: "1st Grade", label: "1st Grade" },
  { value: "2nd Grade", label: "2nd Grade" },
  { value: "3rd Grade", label: "3rd Grade" },
  { value: "4th Grade", label: "4th Grade" },
  { value: "5th Grade", label: "5th Grade" },
  { value: "6th Grade", label: "6th Grade" },
  { value: "7th Grade", label: "7th Grade" },
  { value: "8th Grade", label: "8th Grade" },
];

// School options (searchable)
const SCHOOL_OPTIONS = [
  "John Hanson",
  "Benjamin Stoddert",
  "Baden Elementary",
  "John Bayne Elementary",
  "Benjamin Tasker",
  "Brandywine Elementary",
  "High Bridge Elementary",
  "James Ryder Randall Elementary",
  "William W. Hall Academy",
  "Carmody Hills Elementary",
];

const ChildInfoForm = memo(({ child, index, onChange, onRemove, errors, validateField, touched, handleBlur, locations, sportOptions }) => {
  const currentYear = new Date().getFullYear();
  const maxBirthYear = currentYear - 3; // Minimum age 3
  const minBirthYear = currentYear - 14; // Maximum age 14

  const minAllowedDate = dayjs(`${minBirthYear}-01-01`);
  const maxAllowedDate = dayjs(`${maxBirthYear}-12-31`);

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4 relative">
      {index > 0 && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="absolute top-3 right-3 text-red-500 hover:text-red-700"
        >
          ✕
        </button>
      )}

      <h4 className="text-lg font-medium text-gray-800 mb-3">
        Student {index + 1}
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <InputField
          label="First Name"
          name={`childFirst-${index}`}
          type="text"
          value={child.firstName}
          error={errors[`childFirst-${index}`]}
          onChange={(e) => onChange(index, "firstName", e.target.value)}
          placeholder="First Name"
        />
        <InputField
          label="Last Name"
          name={`childLast-${index}`}
          type="text"
          value={child.lastName}
          error={errors[`childLast-${index}`]}
          onChange={(e) => onChange(index, "lastName", e.target.value)}
          placeholder="Last Name"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <InputField
          label="What grade is your child currently in?"
          name={`childGrade-${index}`}
          type="select"
          value={child.grade || ""}
          error={errors[`childGrade-${index}`]}
          onChange={(e) => onChange(index, "grade", e.target.value)}
          onBlur={handleBlur}
          placeholder="Select grade"
          options={GRADE_OPTIONS}
          isCustomSelect={true}
        />
        <InputField
          label="What school does your child currently attend?"
          name={`childSchool-${index}`}
          type="text"
          value={child.school_name || ""}
          error={errors[`childSchool-${index}`]}
          onChange={(e) => onChange(index, "school_name", e.target.value)}
          onBlur={handleBlur}
          placeholder="Enter school name"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <InputField
          label="Your Student's Primary Sport"
          name={`childSport-${index}`}
          type="select"
          value={child.sport || ""}
          error={errors[`childSport-${index}`]}
          onChange={(e) => onChange(index, "sport", e.target.value)}
          onBlur={handleBlur}
          options={sportOptions}
          isCustomSelect={true}
          placeholder="Select sport"
        />
        <div className="w-full">
          <Autocomplete
            label="Your Primary Location"
            options={locations.map((loc) => loc.name || loc.label || loc)}
            value={child.location || ""}
            onChange={(value) => {
              onChange(index, "location", value);
              if (touched[`childLocation-${index}`]) {
                validateField(`childLocation-${index}`, value);
              }
            }}
            onBlur={handleBlur}
            placeholder="Select or Enter Your Primary Location"
            getOptionLabel={(location) => location}
            getOptionValue={(location) => location}
            allowCustomInput={true}
            required
            className="w-full"
          />
          {errors[`childLocation-${index}`] && (
            <p className="text-red-500 text-sm mt-1">{errors[`childLocation-${index}`]}</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <DatePicker
          label="Date of Birth"
          value={child.dob ? dayjs(child.dob) : null}
          onChange={(date) =>
            onChange(index, "dob", date ? date.format("YYYY-MM-DD") : "")
          }
          minDate={minAllowedDate}
          maxDate={maxAllowedDate}
          disableFuture
          views={["year", "month", "day"]}
          slotProps={{
            textField: {
              fullWidth: true,
              error: !!errors[`childDob-${index}`],
              helperText:
                errors[`childDob-${index}`] ||
                `Birth year must be between ${minBirthYear}-${maxBirthYear}. Students must be 3-14 years old as of July 31st.`,
            },
          }}
        />
      </div>

      {/* Age Group Display */}
      {child.dob && (
        <p className="text-sm mt-2">
          {calculateAgeGroup(child.dob) === "N/A" ? (
            <span className="text-red-500">
              Student must be between 3-14 years old (born {minBirthYear}-
              {maxBirthYear})
            </span>
          ) : (
            <span className="text-green-600 font-medium">
              ✓ Eligible: {calculateAgeGroup(child.dob)} Age Group
            </span>
          )}
        </p>
      )}
    </div>
  );
});

// Success confirmation component
const SuccessConfirmation = memo(({ onAddAnother, formData }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl mx-auto">
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Registration Successful!
      </h2>
      <p className="text-gray-600 mb-6">
        Thank you for registering {formData.parentFirst} {formData.parentLast}.
        We've received information for {formData.children.length} child
        {formData.children.length !== 1 ? "ren" : ""}.
      </p>
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-green-800 mb-2">
          What happens next?
        </h3>
        <ul className="text-left text-green-700 text-sm space-y-1">
          <li>• You'll receive a confirmation email shortly</li>
          <li>• Our team will contact you within 24 hours</li>
          <li>• Program details will be sent before the start date</li>
          <li>• You can now login to access your dashboard</li>
        </ul>
      </div>
      <button
        onClick={onAddAnother}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
      >
        Register Another Student
      </button>
    </div>
  </div>
));

export default function Registration() {
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [parents, setParents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // New state for submission loading

  const [formData, setFormData] = useState({
    parentFirst: "",
    parentLast: "",
    email: "",
    password: "",
    mobile: "",
    countryCode: "+1", // Default to USA
    receiveMessages: false,
    children: [{ firstName: "", lastName: "", dob: "", grade: "", school_name: "", sport: "", location: "" }],
    uniformTop: "",
    uniformBottom: "",
    includeUniform: false,
    registrationAgreement: false,
    parentConduct: false,
    fundraiserCommitment: false,
    encouragementCommitment: false,
    noRefundPolicy: false,
  });

  const [errors, setErrors] = useState({});
  const [emailError, setEmailError] = useState('');
  const [touched, setTouched] = useState({});

  // Sport options
  const sportOptions = [
    { value: "Soccer", label: "⚽ Soccer" },
    { value: "Flag_football", label: "🏈 Flag Football" },
    { value: "Cheer", label: "📣 Cheer" },
    { value: "Tackle_football", label: "🏈 Tackle Football" },
    { value: "Basketball", label: "🏀 Basketball" },
    // { value: "Baseball", label: "⚾ Baseball" },
    // { value: "Track", label: "🏃‍♂️ Track & Field" },
    // { value: "Kickball", label: "🥎 Kickball" },
    // { value: "Golf", label: "🏌️ Golf" },
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

  // Mark field as touched
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  // Validate individual field
  const validateField = useCallback(
    (name, value) => {
      let newErrors = { ...errors };

      switch (name) {
        case "parentFirst":
          if (!value) newErrors.parentFirst = "First name required";
          else delete newErrors.parentFirst;
          break;
        case "parentLast":
          if (!value) newErrors.parentLast = "Last name required";
          else delete newErrors.parentLast;
          break;
        case "email":
          if (!value) newErrors.email = "Email required";
          else if (!/\S+@\S+\.\S+/.test(value))
            newErrors.email = "Email is invalid";
          else delete newErrors.email;
          break;
        case "password":
          if (!value) newErrors.password = "Password required";
          else if (value.length < 6)
            newErrors.password = "Password must be at least 6 characters";
          else delete newErrors.password;
          break;
        case "mobile":
          if (!value) {
            newErrors.mobile = "Mobile number required";
          } else {
            const digitsOnly = value.replace(/\D/g, "");
            const countryData = COUNTRY_CODES.find(c => c.code === formData.countryCode);
            const requiredDigits = countryData ? countryData.maxDigits : 10;

            if (digitsOnly.length !== requiredDigits) {
              newErrors.mobile = `Phone number must be exactly ${requiredDigits} digits for ${countryData ? countryData.country : 'selected country'}`;
            } else {
              delete newErrors.mobile;
            }
          }
          break;
        case "sport":
          if (!value) newErrors.sport = "Select a sport";
          else delete newErrors.sport;
          break;
        case "location":
          if (!value) newErrors.location = "Select a location";
          else delete newErrors.location;
          break;
        case "uniformTop":
          if (plan === "oneTime" && !value)
            newErrors.uniformTop = "Top size required";
          else delete newErrors.uniformTop;
          break;
        case "uniformBottom":
          if (plan === "oneTime" && !value)
            newErrors.uniformBottom = "Bottom size required";
          else delete newErrors.uniformBottom;
          break;
        default:
          // Handle child fields
          if (name.startsWith("childFirst-")) {
            if (!value) newErrors[name] = "Student first name required";
            else delete newErrors[name];
          } else if (name.startsWith("childLast-")) {
            if (!value) newErrors[name] = "Student last name required";
            else delete newErrors[name];
          } else if (name.startsWith("childDob-")) {
            if (!value) newErrors[name] = "Date of birth required";
            else delete newErrors[name];
          } else if (name.startsWith("childGrade-")) {
            if (!value) newErrors[name] = "Grade is required";
            else delete newErrors[name];
          } else if (name.startsWith("childSport-")) {
            if (!value) newErrors[name] = "Sport is required";
            else delete newErrors[name];
          } else if (name.startsWith("childLocation-")) {
            if (!value) newErrors[name] = "Location is required";
            else delete newErrors[name];
          }
          break;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [errors, plan]
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [parentsData, locationsData] = await Promise.all([
        getMembers(),
        getLocations(),
      ]);

      setParents(parentsData);

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

  // validation rules per step
  const validateStep = useCallback(() => {
    let newErrors = {};

    if (step === 0) {
      if (!formData.parentFirst) newErrors.parentFirst = "First name required";
      if (!formData.parentLast) newErrors.parentLast = "Last name required";
      if (!formData.email) newErrors.email = "Email required";
      else if (!/\S+@\S+\.\S+/.test(formData.email))
        newErrors.email = "Email is invalid";
      if (!formData.password) newErrors.password = "Password required";
      else if (formData.password.length < 6)
        newErrors.password = "Password must be at least 6 characters";
      if (!formData.mobile) {
        newErrors.mobile = "Mobile number required";
      } else {
        const digitsOnly = formData.mobile.replace(/\D/g, "");
        const countryData = COUNTRY_CODES.find(c => c.code === formData.countryCode);
        const requiredDigits = countryData ? countryData.maxDigits : 10;

        if (digitsOnly.length !== requiredDigits) {
          newErrors.mobile = `Phone number must be exactly ${requiredDigits} digits for ${countryData ? countryData.country : 'selected country'}`;
        }
      }
      if (!formData.receiveMessages) newErrors.receiveMessages = "Consent is required";
    }

    if (step === 2) {
      // Require plan selection so monthly flow doesn't land on step 3 (no uniform) with nothing to show
      if (!plan || (plan !== "monthly" && plan !== "oneTime")) {
        newErrors.plan = "Please select a membership plan";
      } else {
        delete newErrors.plan;
      }
      formData.children.forEach((child, index) => {
        if (!child.firstName)
          newErrors[`childFirst-${index}`] = "Student first name required";
        if (!child.lastName)
          newErrors[`childLast-${index}`] = "Student last name required";
        if (!child.dob)
          newErrors[`childDob-${index}`] = "Date of birth required";
        if (!child.grade)
          newErrors[`childGrade-${index}`] = "Grade is required";
        if (!child.sport)
          newErrors[`childSport-${index}`] = "Sport is required";
        if (!child.location)
          newErrors[`childLocation-${index}`] = "Location is required";
      });
    }

    if (step === 3 && plan === "oneTime") {
      if (!formData.uniformTop) newErrors.uniformTop = "Top size required";
      if (!formData.uniformBottom)
        newErrors.uniformBottom = "Bottom size required";
    }

    if (step === 3 && plan === "monthly" && formData.includeUniform) {
      if (!formData.uniformTop) newErrors.uniformTop = "Top size required";
      if (!formData.uniformBottom)
        newErrors.uniformBottom = "Bottom size required";
    }

    // Agreements validation - step 4 for both plans, or step 3 when monthly (skipped uniform)
    if ((step === 4 || (step === 3 && plan === "monthly")) && plan) {
      if (!formData.registrationAgreement)
        newErrors.registrationAgreement =
          "You must agree to the registration agreement";
      if (!formData.parentConduct)
        newErrors.parentConduct =
          "You must agree to the parent code of conduct";
      if (!formData.fundraiserCommitment)
        newErrors.fundraiserCommitment =
          "You must agree to the fundraiser commitment";
      if (!formData.encouragementCommitment)
        newErrors.encouragementCommitment =
          "You must agree to the encouragement commitment";
      if (!formData.noRefundPolicy)
        newErrors.noRefundPolicy = "You must acknowledge the no refund policy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [step, formData, plan]);

  const nextStep = useCallback(async () => {
    if (step == 0 && formData.email) {
      const res = await emailExist(formData.email)
      if (res.success) {
        setEmailError('Email already exists')
        return
      }
    }
    if (validateStep()) {
      // Skip step 1 (removed), go directly from step 0 to step 2
      if (step === 0) {
        setStep(2);
      } else if (step === 2) {
        // From step 2: skip uniform step for monthly, show for oneTime
        if (plan === "monthly") {
          setStep(4); // Skip uniform, go directly to Agreements
        } else {
          setStep(3); // Go to uniform selection for oneTime
        }
      } else {
        setStep((prev) => prev + 1);
      }
      window.scrollTo(0, 0);
    }
  }, [validateStep, step, formData.email, plan]);

  const prevStep = useCallback(() => {
    // Skip step 1 (removed), go directly from step 2 to step 0
    if (step === 2) {
      setStep(0);
    } else if (step === 4) {
      // From Agreements: go back to uniform for oneTime, or to step 2 for monthly
      if (plan === "oneTime") {
        setStep(3); // Go back to uniform selection
      } else {
        setStep(2); // Skip uniform, go back to Your Child
      }
    } else {
      setStep((prev) => prev - 1);
    }
    window.scrollTo(0, 0);
  }, [step, plan]);

  const formatPhoneInput = (value, countryCode = "+1") => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, "");

    // Get max digits for the selected country
    const countryData = COUNTRY_CODES.find(c => c.code === countryCode);
    const maxDigits = countryData ? countryData.maxDigits : 10;

    // Limit to max digits for the country
    const limitedDigits = digitsOnly.slice(0, maxDigits);

    // Format based on country and length
    if (countryCode === "+1") {
      // USA format: (123) 456-7890
      if (limitedDigits.length <= 3) {
        return limitedDigits;
      } else if (limitedDigits.length <= 6) {
        return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
      } else {
        return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
      }
    } else {
      // For other countries, just return the digits with spaces every 3 characters
      return limitedDigits.replace(/(\d{3})(?=\d)/g, '$1 ');
    }
  };

  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      let newValue = type === "checkbox" ? checked : value;

      if (name === "mobile") {
        newValue = formatPhoneInput(newValue, formData.countryCode);

        setFormData((prev) => ({
          ...prev,
          [name]: newValue,
        }));
      } else if (name === "countryCode") {
        // When country code changes, reformat the phone number
        setFormData((prev) => ({
          ...prev,
          [name]: newValue,
          mobile: formatPhoneInput(prev.mobile, newValue),
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [name]: newValue,
        }));
      }

      if (touched[name]) {
        validateField(name, newValue);
      }
    },
    [touched, validateField, formData.countryCode]
  );

  // Handle child information changes
  const handleChildChange = useCallback(
    (index, field, value) => {
      setFormData((prev) => {
        const updatedChildren = [...prev.children];
        updatedChildren[index] = {
          ...updatedChildren[index],
          [field]: value,
        };
        return {
          ...prev,
          children: updatedChildren,
        };
      });

      const fieldName = `child${field.charAt(0).toUpperCase() + field.slice(1)
        }-${index}`;
      if (touched[fieldName]) {
        validateField(fieldName, value);
      }
    },
    [touched, validateField]
  );

  // Add a new child
  const addChild = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      children: [...prev.children, { firstName: "", lastName: "", dob: "", grade: "", school_name: "", sport: "", location: "" }],
    }));
  }, []);

  // Remove a child
  const removeChild = useCallback(
    (index) => {
      if (formData.children.length > 1) {
        setFormData((prev) => ({
          ...prev,
          children: prev.children.filter((_, i) => i !== index),
        }));

        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[`childFirst-${index}`];
          delete newErrors[`childLast-${index}`];
          delete newErrors[`childDob-${index}`];
          delete newErrors[`childGrade-${index}`];
          delete newErrors[`childSchool-${index}`];
          delete newErrors[`childSport-${index}`];
          delete newErrors[`childLocation-${index}`];
          return newErrors;
        });
      }
    },
    [formData.children.length]
  );

  const ConvertYYMMDD = (YYYYMMDD) => {
    if (!YYYYMMDD || YYYYMMDD === "Invalid Date" || YYYYMMDD === "null" || YYYYMMDD === "undefined") {
      return "";
    }

    try {
      const date = dayjs(YYYYMMDD, "YYYY-MM-DD", true);
      if (!date.isValid()) {
        console.warn("Invalid date format in registration:", YYYYMMDD);
        return "";
      }
      return date.format("MM-DD-YYYY");
    } catch (error) {
      console.error("Error converting date in registration:", error, YYYYMMDD);
      return "";
    }
  };

  const handleSubmit = useCallback(async () => {
    if (validateStep()) {
      setIsSubmitting(true);

      try {
        // Calculate base price based on plan and children count
        const childrenCount = formData.children.length;
        let basePrice = 0;

        if (plan === "oneTime") {
          basePrice = 200 * childrenCount; // $200 per child
        } else if (plan === "monthly") {
          basePrice = 50 * childrenCount; // $50 per child per month
        }

        // Clean phone number and combine with country code
        const cleanPhoneDigits = formData.mobile.replace(/\D/g, "");
        const cleanPhone = `${formData.countryCode}${cleanPhoneDigits}`;

        // Store registration data for checkout with proper structure
        const registrationData = {
          // Basic info
          parentFirst: formData.parentFirst,
          parentLast: formData.parentLast,
          userEmail: formData.email,
          userUID: "", // Will be created after payment
          password: formData.password,
          mobile: cleanPhone,

          // Member data with proper structure that checkout expects
          memberData: {
            // Parent info
            firstName: formData.parentFirst,
            lastName: formData.parentLast,
            email: formData.email,
            phone: cleanPhone,
            // Note: location and sport are now per-student, not per-parent
            // Keeping these for backward compatibility but they may not be used
            location: formData.children[0]?.location || "",
            sport: formData.children[0]?.sport?.toUpperCase() || "",

            // Children info - stored as "students" (what checkout expects)
            students: formData.children.map((child, index) => ({
              uid: `student_${Date.now()}_${index}`, // Generate temporary ID
              firstName: child.firstName,
              lastName: child.lastName,
              dob: ConvertYYMMDD(child.dob),
              ageGroup: calculateAgeGroup(child.dob), // Keep for backward compatibility
              grade: child.grade || "",
              school_name: child.school_name || "",
              sport: child.sport?.toUpperCase() || "",
              location: child.location || "",
              uniformTop: formData.uniformTop || "",
              uniformBottom: formData.uniformBottom || "",
              registrationAgreement: formData.registrationAgreement || false,
            })),

            // Membership info
            membershipType: "free", // Always start as free
            isPaidMember: false,
            registrationPlan: plan === "oneTime" ? "oneTime" : plan,

            // Agreements
            receiveMessages: formData.receiveMessages || false,
            consentText: formData.receiveMessages || false,
            consentTimestamp: formData.receiveMessages ? new Date().toISOString() : null,
            registrationAgreement: formData.registrationAgreement || false,
            parentConduct: formData.parentConduct || false,
            fundraiserCommitment: formData.fundraiserCommitment || false,
            encouragementCommitment: formData.encouragementCommitment || false,
            noRefundPolicy: formData.noRefundPolicy || false,

            // Timestamps
            createdAt: new Date(),
            registrationSource: "web",
          },

          // Plan and pricing info
          selectedPlan: plan,
          childrenCount: childrenCount,
          basePrice: basePrice,
          includeUniform: plan === "oneTime",
        };

        sessionStorage.setItem(
          "pendingRegistration",
          JSON.stringify(registrationData)
        );

        console.log("📦 Registration data stored:", {
          plan,
          childrenCount,
          basePrice,
          totalPrice: basePrice,
          studentsCount: registrationData.memberData.students.length
        });

        // Redirect to checkout
        const planParam = plan === "oneTime" ? "oneTime" : "monthly";
        window.location.href = `/checkout?plan=${planParam}&email=${encodeURIComponent(
          formData.email
        )}`;

      } catch (error) {
        console.error("Error preparing registration:", error);
        setIsSubmitting(false);
        toast.error("There was an error preparing your registration. Please try again.");
      }
    }
  }, [validateStep, plan, formData]);

  const resetForm = useCallback(() => {
    setFormData({
      parentFirst: "",
      parentLast: "",
      email: "",
      password: "",
      mobile: "",
      countryCode: "+1", // Default to USA
      receiveMessages: false,
      children: [{ firstName: "", lastName: "", dob: "", grade: "", school_name: "", sport: "", location: "" }],
      uniformTop: "",
      uniformBottom: "",
      includeUniform: false,
      registrationAgreement: false,
      parentConduct: false,
      fundraiserCommitment: false,
      encouragementCommitment: false,
      noRefundPolicy: false,
    });
    setErrors({});
    setTouched({});
    setStep(0);
    setIsSubmitted(false);
  }, []);

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 sm:py-10 px-3 sm:px-4">
        <div className="w-full max-w-4xl">
          <SuccessConfirmation onAddAnother={resetForm} formData={formData} />
        </div>
      </div>
    );
  }

  // Calculate current step for display
  // Monthly: Step 0 = Your Info (0), Step 2 = Your Child (1), Step 4 = Agreements (2)
  // OneTime: Step 0 = Your Info (0), Step 2 = Your Child (1), Step 3 = Uniform (2), Step 4 = Agreements (3)
  const getDisplayStep = () => {
    if (step === 0) return 0; // Your Info
    if (step === 2) return 1; // Your Child
    if (step === 3 && plan === "oneTime") return 2; // Uniform Selection (only for oneTime)
    if ((step === 4 || (step === 3 && plan === "monthly")) && plan === "monthly") return 2; // Agreements for monthly (skipped uniform)
    if (step === 4 && plan === "oneTime") return 3; // Agreements for oneTime
    return 0;
  };
  const displayStep = getDisplayStep();
  const totalDisplaySteps = plan === "monthly" ? 3 : 4; // 3 steps for monthly (skip uniform), 4 for oneTime

  // Get current step name for display
  const getCurrentStepName = () => {
    if (step === 0) return "Your Info";
    if (step === 2) return "Your Child";
    if (step === 3 && plan === "oneTime") return "Uniform Selection";
    if (step === 4 || (step === 3 && plan === "monthly")) return "Agreements";
    return "Choose Program";
  };

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Background Image - scrolls with content */}
      <div className="absolute inset-0 z-0">
        <img
          src={soccerPitch}
          alt="Background"
          className="w-full h-full min-h-full object-cover"
          style={{ filter: "blur(0px)" }}
        />
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center py-6 sm:py-10 px-3 sm:px-4 min-h-screen">
        <div className="w-full max-w-4xl">
          {/* Header Section */}
          <div className="text-center mb-6">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <div className="bg-transparent w-32 h-32 sm:w-40   sm:h-40 rounded-lg flex items-center justify-center  ">
                <img
                  src={YAU_Logo}
                  alt="YAU Logo"
                  className="transform w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-4xl md:text-6xl font-medium text-white mb-2 drop-shadow-lg">
              Reserve Your Child's Spot at YAU
            </h1>

            {/* Subtitle */}
            <p className="text-white/90 text-lg sm:text-3xl mb-4 drop-shadow-md">
              You're just a few steps away from securing your child's place.
            </p>

            {/* Progress Indicator */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-red-500" />
              <span className="text-white font-medium text-sm sm:text-base">
                Step {displayStep + 1} of {totalDisplaySteps}: {getCurrentStepName()}
              </span>
            </div>
            <div className="flex gap-2 justify-center max-w-md mx-auto">
              {[...Array(totalDisplaySteps)].map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-all duration-500 ${i <= displayStep ? "bg-red-500" : "bg-gray-400"
                    }`}
                />
              ))}
            </div>
          </div>

          {/* Dark Grey Card with Navigation and Program Selection */}
          <div className="bg-gray-800 rounded-xl shadow-2xl p-4 sm:p-6 mb-6">
            {/* Navigation Tabs */}
            <div className="flex items-center w-[90%] mb-6 overflow-x-auto ">
              {stepsWithIcons.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === displayStep;
                const isFirst = i === 0;
                const isLast = i === stepsWithIcons.length - 1;

                // Determine clip-path based on position
                let clipPath;
                if (isFirst) {
                  // First step (right arrow only)
                  clipPath = 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)';
                } else if (isLast) {
                  // Last step (left arrow only)
                  // clipPath = 'polygon(0px 0, 100% 0, 100% 100%, 0px 100%, 0 50%)';
                  clipPath = 'polygon(0px 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0px 100%, 0 50%)';


                } else {
                  // Middle steps (both arrows)
                  clipPath = 'polygon(0px 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0px 100%, 0 50%)';
                }

                return (
                  <div
                    key={i}
                    className={`
                      flex items-center justify-center gap-2 sm:gap-3
                      flex-1 px-5 sm:px-6 py-2.5 sm:py-3
                      font-medium text-sm sm:text-base
                      transition-all duration-200
                      relative cursor-pointer
                      ${isActive
                        ? 'bg-red-600 text-white shadow-md shadow-red-800/30 border-red-700'
                        : 'bg-gray-800/90 text-gray-200 hover:bg-gray-700/90 border-gray-600'
                      }
                    `}
                    style={{
                      clipPath: clipPath,
                      WebkitClipPath: clipPath,
                      marginLeft: i === 0 ? '0' : '-20px',
                      zIndex: isActive ? stepsWithIcons.length + 1 : stepsWithIcons.length - i
                    }}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="whitespace-nowrap">{s.name}</span>
                  </div>
                );
              })}
            </div>

            {/* Benefits List */}
            {plan && (
              <div className="flex flex-row justify-between p-4">
                <div className="flex flex-col">
                  <h3 className="font-semibold text-2xl text-white mb-1">
                    {plan === "monthly" ? "Monthly Plan" : "Season Pass"}
                  </h3>
                  <p className="text-white text-lg font-semibold">
                    {plan === "monthly" ? (
                      <>$50 <span className="text-sm">/ Per Month</span></>
                    ) : (
                      <>$200 <span className="text-sm">/ 3 Months</span></>
                    )}
                  </p>
                </div>
                <div className="flex flex-col gap-4 justify-end text-white text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-red-500" />
                    <span>Structured evening program</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-red-500" />
                    <span>Trusted by local families</span>
                  </div>
                  {plan === "oneTime" && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-red-500" />
                      <span>Includes uniform</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Plan selection error - when on step 2 and no plan selected */}
            {step === 2 && errors.plan && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium">{errors.plan}</p>
              </div>
            )}
            {/* Program Selection - Show on all steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Monthly Plan */}
              <label
                onClick={() => setPlan("monthly")}
                className={`relative cursor-pointer rounded-xl border-2 p-4 sm:p-5 shadow-md transition-all ${plan === "monthly"
                  ? "bg-gradient-to-br from-yellow-50 to-yellow-100 border-red-500 shadow-lg"
                  : "bg-white border-gray-300 hover:border-gray-400"
                  }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value="monthly"
                  checked={plan === "monthly"}
                  onChange={() => setPlan("monthly")}
                  className="hidden"
                />
                {/* {plan === "monthly" && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                      MOST POPULAR
                    </div>
                  )} */}
                <div className=" items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 mb-1">
                      Monthly Plan
                    </h3>
                    <p className="text-gray-600 text-sm">$50 / Per Month</p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${plan === "monthly"
                      ? "border-red-600 bg-red-600"
                      : "border-blue-500 bg-white"
                      }`}
                  >
                    {plan === "monthly" && (
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </label>

              {/* Season Pass */}
              <label
                onClick={() => setPlan("oneTime")}
                className={`relative cursor-pointer rounded-xl border-2 p-4 sm:p-5 shadow-md transition-all ${plan === "oneTime"
                  ? "bg-gradient-to-br from-yellow-50 to-yellow-100 border-red-500 shadow-lg"
                  : "bg-white border-gray-300 hover:border-gray-400"
                  }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value="oneTime"
                  checked={plan === "oneTime"}
                  onChange={() => setPlan("oneTime")}
                  className="hidden"
                />
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 mb-1">
                      Season Pass
                    </h3>
                    <p className="text-gray-600 text-sm">$200 / 3 Months</p>
                    <p className="text-gray-500 text-xs mt-1">(Includes uniform)</p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${plan === "oneTime"
                      ? "border-red-600 bg-red-600"
                      : "border-blue-500 bg-white"
                      }`}
                  >
                    {plan === "oneTime" && (
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </label>
            </div>


          </div>

          {/* Steps */}
          {step === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 w-full max-w-2xl mx-auto">
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500 text-white font-bold mr-3">
                  1
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-800">
                  Your Information
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <InputField
                  label="First Name"
                  name="parentFirst"
                  type="text"
                  value={formData.parentFirst}
                  error={errors.parentFirst}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="First Name"
                />
                <InputField
                  label="Last Name"
                  name="parentLast"
                  type="text"
                  value={formData.parentLast}
                  error={errors.parentLast}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Last Name"
                />
              </div>
              <div className="mt-4">
                <InputField
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  error={errors.email || emailError}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Email"
                />
              </div>
              <div className="mt-4">
                <InputField
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  error={errors.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Password (minimum 6 characters)"
                />
              </div>
              <div className="mt-4">
                <PhoneInputField
                  label="Phone"
                  name="mobile"
                  value={formData.mobile}
                  countryCodeValue={formData.countryCode}
                  error={errors.mobile}
                  onChange={handleChange}
                  onCountryCodeChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Phone number"
                />
              </div>
              <div className="mt-4">
                <InputField
                  name="receiveMessages"
                  type="checkbox"
                  value={formData.receiveMessages}
                  error={errors.receiveMessages}
                  onChange={handleChange}
                  placeholder={
                    <div className="leading-relaxed">
                      By checking this box, you agree to receive SMS messages from Youth Athlete University regarding schedules, updates, and notifications.
                      <br /><br />
                      Message and data rates may apply. Message frequency varies.
                      <br /><br />
                      Reply STOP to opt out, HELP for help.
                      <br /><br />
                      <a href="https://youthathleteuniversity.org/privacyterms/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>Privacy Policy</a> <span className="text-black">|</span> <a href="https://youthathleteuniversity.org/terms/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>Terms</a>
                    </div>
                  }
                />
              </div>
              <div className="mt-4 flex items-center justify-end">
                <button
                  onClick={nextStep}
                  className="px-6 py-2 sm:px-8 sm:py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-md"
                >
                  Next
                </button>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Already a member?{" "}
                  <a
                    href="/login"
                    className="text-blue-600 font-medium hover:underline"
                  >
                    Log In
                  </a>
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <StepCard step={step} displayStep={2} title="Student Information">
              {formData.children.map((child, index) => (
                <ChildInfoForm
                  key={index}
                  child={child}
                  index={index}
                  onChange={handleChildChange}
                  onRemove={removeChild}
                  errors={errors}
                  validateField={validateField}
                  touched={touched}
                  handleBlur={handleBlur}
                  locations={locations}
                  sportOptions={sportOptions}
                />
              ))}

              <p className="text-sm italic text-gray-500">
                Please Note: Each student has their own membership cost. Adding a
                2nd student now will increase the cost. Example: 1 student =
                $50/month, 2 students = $100/month. Family discounts begin with 3
                students. You can always add additional students later.”
              </p>

              <button
                type="button"
                onClick={addChild}
                className="flex items-center justify-center w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-400 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add Another Student
              </button>
            </StepCard>
          )}

          {/* Removed Sports & Location step - sport and location are now per-student */}
          {false && step === 3 && (
            <StepCard step={step} title="Sports & Location">
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <InputField
                  label="Your Student’s Primary Sport"
                  name="sport"
                  type="select"
                  value={formData.sport}
                  error={errors.sport}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  options={sportOptions}
                  isCustomSelect={true}
                />

                <div>
                  <Autocomplete
                    label="Your Primary Location"
                    options={locations.map((loc) => loc.name || loc.label || loc)}
                    value={formData.location}
                    onChange={(value) => {
                      setFormData((prev) => ({ ...prev, location: value }));
                      if (touched.location) {
                        validateField("location", value);
                      }
                    }}
                    onBlur={handleBlur}
                    placeholder="Select or Enter Your Primary Location
"
                    getOptionLabel={(location) => location}
                    getOptionValue={(location) => location}
                    allowCustomInput={true}
                    required
                    className="w-full"
                  />
                  {errors.location && (
                    <p className="text-red-500 text-sm mt-1">{errors.location}</p>
                  )}
                </div>
              </div>
            </StepCard>
          )}



          {/* Uniform step - only for oneTime plan */}
          {step === 3 && plan === "oneTime" && (
            <StepCard step={step} displayStep={3} title="Uniform Selection">
              {plan === "oneTime" ? (
                <>
                  <p className="text-gray-600 mb-4">
                    Your One-Time Payment ($200) includes a complete uniform set.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <InputField
                      label="Top Size"
                      name="uniformTop"
                      type="select"
                      value={formData.uniformTop}
                      error={errors.uniformTop}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      options={uniformOptions}
                      placeholder="Select top size"
                    />
                    <InputField
                      label="Bottom Size"
                      name="uniformBottom"
                      type="select"
                      value={formData.uniformBottom}
                      error={errors.uniformBottom}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      options={uniformOptions}
                      placeholder="Select bottom size"
                    />
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg mt-4">
                    <p className="text-green-800 text-sm">
                      <strong>✓ Uniform Included</strong>
                      <br />
                      Your $200 one-time payment includes both membership and uniform.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-600 mb-4">
                    Would you like to purchase a uniform? Uniforms are available for $75 (optional).
                  </p>
                  <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="includeUniform"
                        checked={formData.includeUniform}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            includeUniform: e.target.checked,
                            uniformTop: e.target.checked ? prev.uniformTop : "",
                            uniformBottom: e.target.checked ? prev.uniformBottom : "",
                          }));
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-700">Yes, I would like to purchase a uniform ($75)</span>
                    </label>
                  </div>
                  {formData.includeUniform && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      <InputField
                        label="Top Size"
                        name="uniformTop"
                        type="select"
                        value={formData.uniformTop}
                        error={errors.uniformTop}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        options={uniformOptions}
                        placeholder="Select top size"
                      />
                      <InputField
                        label="Bottom Size"
                        name="uniformBottom"
                        type="select"
                        value={formData.uniformBottom}
                        error={errors.uniformBottom}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        options={uniformOptions}
                        placeholder="Select bottom size"
                      />
                    </div>
                  )}
                </>
              )}
            </StepCard>
          )}

          {/* Removed "Almost Done!" step - monthly plans go directly to Agreements */}
          {false && step === 3 && plan === "monthly" && (
            <StepCard step={step} title="Almost Done!">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Monthly Membership Selected
                </h3>
                <p className="text-gray-600 mb-4">
                  Your monthly membership is just{" "}
                  <strong>$50/month per student</strong>.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    About Uniforms
                  </h4>
                  <p className="text-blue-700 text-sm">
                    Uniforms are{" "}
                    <span className="font-bold text-red-600"> not included </span>{" "}
                    with monthly memberships. After completing your registration
                    and payment, you’ll be able to order your child’s uniform
                    directly from your Member Dashboard.
                  </p>
                  <p className="text-blue-600 text-xs mt-2">
                    <span className="font-bold text-red-500">
                      Uniform price: $75 (available after registration)
                    </span>
                  </p>
                </div>
              </div>
            </StepCard>
          )}

          {step === 3 && plan !== "monthly" && plan !== "oneTime" && (
            <div className="relative max-w-md mx-auto mb-6">
              {/* Pointer arrow */}
              <div className="absolute -top-4 left-10 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-red-500"></div>

              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-400 rounded-lg shadow-md">
                <svg
                  className="w-6 h-6 text-red-600 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 9v2m0 4h.01M21 12c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8z" />
                </svg>
                <div>
                  <p className="font-semibold text-red-700 text-lg">
                    Please select a membership plan!
                  </p>
                  <p className="text-red-600 text-sm mt-1">
                    Choose either <span className="font-bold">One-Time</span> or{" "}
                    <span className="font-bold">Monthly</span> to proceed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Agreements step - step 4 for both plans; also step 3 when monthly (no uniform step) */}
          {((step === 4 && plan) || (step === 3 && plan === "monthly")) && (
            <StepCard step={step} displayStep={plan === "monthly" ? 3 : 4} title="Agreements">
              <div className="space-y-3 sm:space-y-4">
                <h1 className="text-2xl">Waiver & Agreement</h1>

                {/* Combined Registration Agreement */}
                <div
                  className={`p-3 sm:p-4 rounded-lg ${errors.registrationAgreement ? "bg-red-50" : "bg-gray-50"
                    }`}
                >
                  <InputField
                    name="registrationAgreement"
                    type="checkbox"
                    value={formData.registrationAgreement}
                    error={errors.registrationAgreement}
                    onChange={handleChange}
                    placeholder="I consent to the Waiver of Liability and understand that participation in sports activities involves inherent risks. I voluntarily assume all responsibility for any injuries that may occur. I grant permission for my student's name, image and likeness to be used by Youth Athlete University for promotional purposes. I have read and understand the program policies regarding payments, attendance, and code of conduct."
                  />
                  <a
                    href="https://youthathleteuniversity.org/waiver/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm hover:underline mt-2 block"
                  >
                    View Full Waiver
                  </a>
                </div>

                {/* Parents' Code of Conduct */}
                <div
                  className={`p-3 sm:p-4 rounded-lg ${errors.parentConduct ? "bg-red-50" : "bg-gray-50"
                    }`}
                >
                  <InputField
                    name="parentConduct"
                    type="checkbox"
                    value={formData.parentConduct}
                    error={errors.parentConduct}
                    onChange={handleChange}
                    placeholder="Parents' Code of Conduct: I agree to model positive behavior on the field at all games and during practices."
                  />
                </div>

                {/* Fundraiser Commitment */}
                <div
                  className={`p-3 sm:p-4 rounded-lg ${errors.fundraiserCommitment ? "bg-red-50" : "bg-gray-50"
                    }`}
                >
                  <InputField
                    name="fundraiserCommitment"
                    type="checkbox"
                    value={formData.fundraiserCommitment}
                    error={errors.fundraiserCommitment}
                    onChange={handleChange}
                    placeholder="Fundraiser Commitment: I understand that participation in fundraising activities is part of supporting the program."
                  />
                </div>

                {/* Encouragement Commitment */}
                <div
                  className={`p-3 sm:p-4 rounded-lg ${errors.encouragementCommitment ? "bg-red-50" : "bg-gray-50"
                    }`}
                >
                  <InputField
                    name="encouragementCommitment"
                    type="checkbox"
                    value={formData.encouragementCommitment}
                    error={errors.encouragementCommitment}
                    onChange={handleChange}
                    placeholder="Encouragement Commitment: I agree to encourage other players and foster a supportive environment for all students."
                  />
                </div>

                {/* No Refund Policy */}
                <div
                  className={`p-3 sm:p-4 rounded-lg ${errors.noRefundPolicy ? "bg-red-50" : "bg-gray-50"
                    }`}
                >
                  <InputField
                    name="noRefundPolicy"
                    type="checkbox"
                    value={formData.noRefundPolicy}
                    error={errors.noRefundPolicy}
                    onChange={handleChange}
                    placeholder="No Refund Policy: I acknowledge that all payments are final and non-refundable."
                  />
                </div>
              </div>
            </StepCard>
          )}

          {/* Navigation - Only show for steps after step 0 */}
          {step > 0 && (
            <div className="flex justify-between mt-6 sm:mt-8 w-full max-w-2xl mx-auto">
              <button
                onClick={prevStep}
                className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm sm:text-base"
              >
                Back
              </button>
              {/* Show Next button for steps 0, 2, and step 3 (only for oneTime plan) */}
              {(step === 0 || step === 2 || (step === 3 && plan === "oneTime")) && (
                <button
                  onClick={nextStep}
                  className="ml-auto px-5 py-2 sm:px-6 sm:py-3 bg-blue-500 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-md text-sm sm:text-base"
                >
                  Next
                </button>
              )}
              {/* Show Submit button for step 4 (Agreements), or step 3 when monthly (skipped uniform) */}
              {((step === 4 && plan) || (step === 3 && plan === "monthly")) && (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="ml-auto px-5 py-2 sm:px-8 sm:py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 shadow-md text-sm sm:text-base disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    "Let's Finish Up"
                  )}
                </button>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <footer className="mt-auto pt-10 pb-6 text-center text-white text-sm md:text-base ">
          <p>
            © 2026 Youth Athlete University |
            <a href="mailto:Fun@YAUSports.org" className="hover:underline mx-1 font-bold">Fun@YAUSports.org</a> |
            301-292-3688
          </p>
          <p className="mt-2 font-semibold tracking-wide">
            Every Child Plays Project®
          </p>
        </footer>
      </div>
    </div>
  );
}


