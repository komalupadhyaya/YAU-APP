import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
// import { MembershipService } from "../../firebase/apis/api-membership";
// import { useAuth } from "../../context/AuthContext";
// import { getCurrentUserData, updateMember } from "../../firebase/apis/api-members.js";
// src\firebase\apis\api-members.js
// src\components\mychild\components\AddChild.jsx
import { updateMember } from "../../../firebase/apis/api-members.js";
// import { uploadChildImage } from "../mychild/utils/uploadImage";
// import childImagePlaceholder from '../../assets/child.jpg';
import { FaCamera, FaPlus, FaTimes } from 'react-icons/fa';
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

import { collection, doc, getDoc, updateDoc } from "firebase/firestore"; 
import { db } from "../../../firebase/config.js";




function AddChildModal({ isOpen, onClose, onAddChild, memberId }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dob: ""
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

      // 4. Apply the Roster Logic
      let ageGroup;
      if (birthdayThisYear > cutoffDate) {
        // Player's birthday is AFTER the cutoff.
        // They are eligible to play one group DOWN (e.g., 12U base -> 11U eligible).
        ageGroup = (seasonAge - 1) + "U";
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.dob) {
      newErrors.dob = "Date of birth is required";
    } else {
      const ageGroup = calculateAgeGroup(formData.dob);
      if (ageGroup === "N/A") {
        newErrors.dob = `Child must be between ${MIN_AGE}-${MAX_AGE} years old`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Get current parent data
      const parentData = await getCurrentUserDataByMemberId(memberId);
      
      // Create new child object
      const newChild = {
        uid: doc(collection(db, "students")).id,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dob: dayjs(formData.dob).format("MM-DD-YYYY"),
        ageGroup: calculateAgeGroup(formData.dob),
        idStatus: "unverified",
        createdAt: new Date(),
        uniformTop: "",
        uniformBottom: ""
      };

      // Update parent's students array
      const updatedStudents = [...(parentData.students || []), newChild];
      
      await updateMember(memberId, { students: updatedStudents });
      
      onAddChild(newChild);
      onClose();
      
      // Reset form
      setFormData({ firstName: "", lastName: "", dob: "" });
      setErrors({});
      
    } catch (error) {
      console.error("Error adding child:", error);
      alert("Failed to add child. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-green-700">Add New Child</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              className={`w-full p-3 border rounded-lg ${
                errors.firstName ? "border-red-500" : "border-gray-300"
              } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
              placeholder="Enter first name"
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              className={`w-full p-3 border rounded-lg ${
                errors.lastName ? "border-red-500" : "border-gray-300"
              } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
              placeholder="Enter last name"
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth *
            </label>
            <DatePicker
              value={formData.dob ? dayjs(formData.dob) : null}
              onChange={(date) => handleChange("dob", date ? date.toISOString() : "")}
              minDate={dayjs("2011-01-01")}
              maxDate={dayjs()}
              disableFuture
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.dob,
                  helperText: errors.dob || `Children must be ${MIN_AGE}-${MAX_AGE} years old`,
                },
              }}
            />
          </div>

          {formData.dob && calculateAgeGroup(formData.dob) !== "N/A" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-700 text-sm">
                ✓ Eligible for: {calculateAgeGroup(formData.dob)} Age Group
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Adding..." : "Add Child"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Helper function to get user data by member ID
async function getCurrentUserDataByMemberId(memberId) {
  const memberRef = doc(db, "members", memberId);
  const memberSnap = await getDoc(memberRef);
  
  if (!memberSnap.exists()) {
    throw new Error("Member not found");
  }
  
  return memberSnap.data();
}


export default AddChildModal;