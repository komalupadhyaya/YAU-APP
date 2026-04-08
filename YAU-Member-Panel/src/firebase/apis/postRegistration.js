// src\firebase\apis\postRegistration.js
// apis/api-members.js (add this function)

import { collection, doc } from "firebase/firestore";
import { db } from "../config";
import dayjs from "dayjs";
import { addMember, createFirebaseAuthUser } from "./api-members";
// src\services\rosterService.js
//pwd src\firebase\apis\postRegistration.js
import RosterService from "../../../src/services/rosterService";
import GroupChatService from "../../../src/services/groupChatService";
import { APIClient } from "../ApiClient";



const ConvertYYMMDD = (YYYYMMDD) => {
  if (!YYYYMMDD || YYYYMMDD === "Invalid Date" || YYYYMMDD === "null" || YYYYMMDD === "undefined") {
    return "";
  }
  
  try {
    // Try parsing as YYYY-MM-DD format first (from form)
    let date = dayjs(YYYYMMDD, "YYYY-MM-DD", true);
    
    // If that fails, try parsing as MM-DD-YYYY format (already converted)
    if (!date.isValid()) {
      date = dayjs(YYYYMMDD, "MM-DD-YYYY", true);
    }
    
    // If still invalid, try parsing as ISO string or default format
    if (!date.isValid()) {
      date = dayjs(YYYYMMDD);
    }
    
    if (!date.isValid()) {
      console.warn("Invalid date format:", YYYYMMDD);
      return "";
    }
    
    return date.format("MM-DD-YYYY");
  } catch (error) {
    console.error("Error converting date:", error, YYYYMMDD);
    return "";
  }
};

const calculateAgeGroup = (dob) => {
  if (!dob || dob === "Invalid Date" || dob === "null" || dob === "undefined") {
    return "N/A";
  }

  try {
    // Try parsing as YYYY-MM-DD format first (from form)
    let birthDate = dayjs(dob, "YYYY-MM-DD", true);
    
    // If that fails, try parsing as MM-DD-YYYY format (already converted)
    if (!birthDate.isValid()) {
      birthDate = dayjs(dob, "MM-DD-YYYY", true);
    }
    
    // If still invalid, try parsing as ISO string or default format
    if (!birthDate.isValid()) {
      birthDate = dayjs(dob);
    }
    
    if (!birthDate.isValid()) {
      console.warn("Invalid date for age group calculation:", dob);
      return "N/A";
    }

    const today = dayjs();
    const currentYear = today.year();

    // Create the cutoff date for this year (July 31)
    const cutoffDate = dayjs(`${currentYear}-07-31`);

    // 1. Calculate the player's "season age" (age on Dec 31 of this year)
    const seasonAge = currentYear - birthDate.year();

    // 2. Check if the season age is within the valid range (3-14)
    if (seasonAge < 3 || seasonAge > 14) {
      return "N/A";
    }

    // 3. Create the player's birthday for THIS year
    const birthdayThisYear = dayjs(`${currentYear}-${birthDate.month() + 1}-${birthDate.date()}`);

    // 4. Apply the Roster Logic
    let ageGroup;
    if (birthdayThisYear.isAfter(cutoffDate)) {
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
    console.error("Error calculating age group:", error, dob);
    return "N/A";
  }
};



// src/firebase/apis/postRegistration.js
export const completeRegistrationAfterPayment = async (paymentIntent) => {
  try {
    // Get the stored registration data
    const pendingRegistration = sessionStorage.getItem("pendingRegistration");
    if (!pendingRegistration) {
      throw new Error("No pending registration found");
    }

    const registrationData = JSON.parse(pendingRegistration);
    
    // ✅ FIXED: Use the correct data structure from pendingRegistration
    const { 
      parentFirst, 
      parentLast, 
      userEmail, 
      password, 
      mobile,
      memberData, // This contains the actual form data
      selectedPlan 
    } = registrationData;

    console.log('🔑 Password available for user creation:', !!password);
    console.log('📋 Registration data structure:', { 
      hasMemberData: !!memberData,
      hasFormData: !!registrationData.formData,
      parentFirst,
      userEmail 
    });

    // ✅ FIXED: Use data from the correct structure
    // Phone number should already include country code (e.g., "+1234567890")
    const cleanPhone = mobile;

    const finalMemberData = {
      // Parent info - use data from registrationData root level
      firstName: parentFirst || memberData?.firstName,
      lastName: parentLast || memberData?.lastName,
      email: userEmail || memberData?.email,
      phone: cleanPhone || memberData?.phone,
      // Note: location and sport are now per-student
      // Keeping for backward compatibility (use first student's values)
      location: memberData?.students?.[0]?.location || memberData?.location || "",
      sport: memberData?.students?.[0]?.sport?.toUpperCase() || memberData?.sport?.toUpperCase() || '',

      // Payment info
      paymentIntentId: paymentIntent.id,
      membershipType: "paid",
      isPaidMember: true,
      registrationPlan: selectedPlan,
      paymentStatus: "paid",
      paidAt: new Date(),

      // Children info - use students from memberData
      students: (memberData?.students || []).map((student) => {
        // Calculate ageGroup BEFORE converting date format (use original YYYY-MM-DD format)
        // Keep ageGroup for backward compatibility, but use grade for roster/chat grouping
        const originalDob = student.dob; // Keep original format for ageGroup calculation
        const ageGroup = calculateAgeGroup(originalDob);
        const convertedDob = ConvertYYMMDD(originalDob);
        
        return {
          uid: doc(collection(db, "students")).id,
          firstName: student.firstName,
          lastName: student.lastName,
          dob: convertedDob || originalDob, // Use converted format, fallback to original if conversion fails
          ageGroup: ageGroup, // Keep for backward compatibility
          grade: student.grade || "",
          school_name: student.school_name || "",
          sport: student.sport?.toUpperCase() || "",
          location: student.location || "",
          uniformTop: student.uniformTop || memberData?.uniformTop || "",
          uniformBottom: student.uniformBottom || memberData?.uniformBottom || "",
        };
      }),

      // Agreements - use data from memberData
      consentText: memberData?.consentText || false,
      registrationAgreement: memberData?.registrationAgreement || false,
      parentConduct: memberData?.parentConduct || false,
      fundraiserCommitment: memberData?.fundraiserCommitment || false,
      encouragementCommitment: memberData?.encouragementCommitment || false,
      noRefundPolicy: memberData?.noRefundPolicy || false,

      // Timestamps
      createdAt: memberData?.createdAt || new Date(),
      registrationSource: "web",
    };

    // 1. Create Firebase Auth user
    console.log("👤 Creating Firebase Auth user...");
    const authUID = await createFirebaseAuthUser(userEmail, password);
    
    // 2. Add to members collection
    console.log("📝 Adding member to database...");
    await addMember({ ...finalMemberData, uid: authUID });

    // 3. ✅ CREATE UNIFORM ORDERS (MOVED HERE)
    if (selectedPlan === 'oneTime' && finalMemberData.students && finalMemberData.students.length > 0) {
      console.log('👕 Creating uniform orders for one-time plan registration');
      await createUniformOrdersForRegistration({
        memberData: { ...finalMemberData, uid: authUID },
        userEmail: userEmail,
        userUID: authUID, // ✅ Now we have the real UID!
        paymentIntentId: paymentIntent.id,
        students: finalMemberData.students
      });
    }

    // 4. Process rosters and group chats
    console.log("🚀 Processing students for rosters and group chats...");
    const processingResults = [];

    for (const student of finalMemberData.students) {
      try {
        // Add to roster
        // Use grade for roster grouping (replacing ageGroup)
        // Keep ageGroup for backward compatibility
        const studentAgeGroup = student.ageGroup || calculateAgeGroup(student.dob);
        const studentGrade = student.grade || "";
        const studentSport = student.sport || finalMemberData.sport || "";
        const studentLocation = student.location || finalMemberData.location || "";
        
        if (!studentGrade) {
          console.warn(`⚠️ Student ${student.firstName} ${student.lastName} missing grade, skipping roster/chat creation`);
          continue;
        }
        
        if (!studentSport || !studentLocation) {
          console.warn(`⚠️ Student ${student.firstName} ${student.lastName} missing sport or location, skipping roster/chat creation`);
          continue;
        }
        
        const rosterResult = await RosterService.addPlayerToRoster(
          { 
            ...finalMemberData, 
            uid: authUID,
            sport: studentSport,
            location: studentLocation
          },
          {
            firstName: student.firstName,
            lastName: student.lastName,
            dob: student.dob,
            ageGroup: studentAgeGroup, // Keep for backward compatibility
            grade: studentGrade,
            school_name: student.school_name || "",
            sport: studentSport,
            location: studentLocation,
          }
        );

        // Create group chat
        const chatResult = await GroupChatService.createOrEnsureGroupChat(
          { 
            ...finalMemberData, 
            uid: authUID,
            sport: studentSport,
            location: studentLocation
          },
          {
            firstName: student.firstName,
            lastName: student.lastName,
            dob: student.dob,
            ageGroup: studentAgeGroup, // Keep for backward compatibility
            grade: studentGrade,
            sport: studentSport,
            location: studentLocation,
          }
        );

        processingResults.push({
          student: `${student.firstName} ${student.lastName}`,
          roster: rosterResult,
          chat: chatResult,
          success: rosterResult.success && chatResult.success,
        });

      } catch (error) {
        console.error(`Error processing student:`, error);
        processingResults.push({
          student: `${student.firstName} ${student.lastName}`,
          success: false,
          error: error.message,
        });
      }
    }

    // 5. Send welcome SMS
    try {
      console.log("📱 Sending welcome SMS to new member...");

      // Get CSRF token first
      const csrfToken = await APIClient.getCSRFToken();
      console.log("🔑 Got CSRF token for SMS");

      // Send welcome SMS
      await APIClient.sendWelcomeSMS(cleanPhone, csrfToken, 'member');
      console.log("✅ Welcome SMS sent successfully");

    } catch (smsError) {
      console.warn("⚠️ Failed to send welcome SMS:", smsError);
      // Don't fail registration if SMS fails
    }

    // 6. Clear pending registration
    sessionStorage.removeItem("pendingRegistration");

    console.log("✅ Registration completed successfully");
    return {
      success: true,
      userUID: authUID,
      memberData: finalMemberData,
      processingResults,
    };

  } catch (error) {
    console.error("❌ Error completing registration:", error);
    throw error;
  }
};

// ✅ NEW: Separate function for uniform order creation
const createUniformOrdersForRegistration = async ({ memberData, userEmail, userUID, paymentIntentId, students }) => {
  try {
    console.log('👕 Creating uniform orders from registration:', {
      userUID, // ✅ Now we have the real Firebase UID
      studentCount: students.length,
      paymentIntentId
    });

    if (!students || !Array.isArray(students)) {
      console.warn('❌ No students found for uniform orders');
      return;
    }

    // Create uniform orders for each student
    for (const student of students) {
      // Only create uniform order if sizes are specified
      if (student.uniformTop || student.uniformBottom) {
        const uniformOrderData = {
          studentId: student.uid || `student_${Date.now()}_${student.firstName}`,
          studentName: `${student.firstName} ${student.lastName}`,
          parentId: userUID, // ✅ REAL Firebase UID
          parentName: `${memberData.firstName} ${memberData.lastName}`,
          parentEmail: userEmail,
          parentPhone: memberData.phone || '',
          team: memberData.sport || '',
          ageGroup: student.ageGroup || calculateAgeGroup(student.dob),
          uniformTop: student.uniformTop || '',
          uniformBottom: student.uniformBottom || '',
          paymentIntentId: paymentIntentId,
          paymentStatus: 'completed',
          orderStatus: 'processing',
          orderSource: 'registration',
          amount: 0, // $0 - included in one-time payment
          createdAt: new Date(),
          orderDate: new Date()
        };

        console.log('👕 Creating uniform order with REAL parentId:', {
          studentName: uniformOrderData.studentName,
          parentId: uniformOrderData.parentId,
          parentName: uniformOrderData.parentName
        });
        
        await APIClient.createUniformOrder(uniformOrderData);
        console.log('✅ Uniform order created for:', student.firstName);
      } else {
        console.log('⚠️ No uniform sizes specified for:', student.firstName);
      }
    }

    console.log('✅ All uniform orders created successfully');
  } catch (error) {
    console.error('❌ Error creating uniform orders in post-registration:', error);
    // Don't throw error - uniform orders shouldn't fail the entire registration
    // Just log the error and continue
  }
};
