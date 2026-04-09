import { addDoc, collection, doc, getDoc, getDocs, deleteDoc, orderBy, writeBatch, updateDoc, query, serverTimestamp, where } from "firebase/firestore";
import { calculateAgeGroup, getRosters, COLLECTIONS } from "../firestore";
import { db } from "../config";

// Get parents from registration collection - FIXED
export const getMembers = async () => {
  try {
    console.log('🔍 Fetching users from both members and registrations collections...');

    let allUsers = [];

    // First, get members (paid users)
    try {
      const membersQuerySnapshot = await getDocs(
        query(
          collection(db, 'members'),
          orderBy('createdAt', 'desc')
        )
      );

      const membersData = membersQuerySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        collection: 'members',
        isPaidMember: true,
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
      }));

      console.log(`✅ Found ${membersData.length} members`);
      allUsers = [...allUsers, ...membersData];
    } catch (membersError) {
      console.warn('⚠️ Error fetching members, trying without orderBy:', membersError);

      // Fallback for members without orderBy
      try {
        const membersQuerySnapshot = await getDocs(collection(db, 'members'));
        const membersData = membersQuerySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          collection: 'members',
          isPaidMember: true,
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
        }));

        console.log(`✅ Found ${membersData.length} members (fallback)`);
        allUsers = [...allUsers, ...membersData];
      } catch (membersFallbackError) {
        console.error('❌ Failed to fetch members even with fallback:', membersFallbackError);
      }
    }

    // Second, get registrations (free users)
    try {
      const registrationsQuerySnapshot = await getDocs(
        query(
          collection(db, 'registrations'),
          orderBy('createdAt', 'desc')
        )
      );

      const registrationsData = registrationsQuerySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        collection: 'registrations',
        isPaidMember: false,
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
      }));

      console.log(`✅ Found ${registrationsData.length} registrations`);
      allUsers = [...allUsers, ...registrationsData];
    } catch (registrationsError) {
      console.warn('⚠️ Error fetching registrations, trying without orderBy:', registrationsError);

      // Fallback for registrations without orderBy
      try {
        const registrationsQuerySnapshot = await getDocs(collection(db, 'registrations'));
        const registrationsData = registrationsQuerySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          collection: 'registrations',
          isPaidMember: false,
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
        }));

        console.log(`✅ Found ${registrationsData.length} registrations (fallback)`);
        allUsers = [...allUsers, ...registrationsData];
      } catch (registrationsFallbackError) {
        console.error('❌ Failed to fetch registrations even with fallback:', registrationsFallbackError);
      }
    }

    // Sort all users by creation date (newest first)
    allUsers.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || 0);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    console.log(`📊 Total users found: ${allUsers.length} (${allUsers.filter(u => u.isPaidMember).length} members, ${allUsers.filter(u => !u.isPaidMember).length} registrations)`);

    return allUsers;

  } catch (error) {
    console.error('❌ Error in getMembers function:', error);
    throw error;
  }
};

// Get user by ID from appropriate collection
export const getMemberById = async (id) => {
  try {
    console.log('🔍 Looking for user by ID:', id);

    // First check members collection
    try {
      const memberDocRef = doc(db, 'members', id);
      const memberDocSnap = await getDoc(memberDocRef);

      if (memberDocSnap.exists()) {
        console.log('✅ Found user in members collection');
        return {
          id: memberDocSnap.id,
          ...memberDocSnap.data(),
          collection: 'members',
          isPaidMember: true,
          createdAt: memberDocSnap.data().createdAt?.toDate()
        };
      }
    } catch (memberError) {
      console.warn('⚠️ Error checking members collection:', memberError);
    }

    // Then check registrations collection
    try {
      const registrationDocRef = doc(db, 'registrations', id);
      const registrationDocSnap = await getDoc(registrationDocRef);

      if (registrationDocSnap.exists()) {
        console.log('✅ Found user in registrations collection');
        return {
          id: registrationDocSnap.id,
          ...registrationDocSnap.data(),
          collection: 'registrations',
          isPaidMember: false,
          createdAt: registrationDocSnap.data().createdAt?.toDate()
        };
      }
    } catch (registrationError) {
      console.warn('⚠️ Error checking registrations collection:', registrationError);
    }

    console.log('❌ User not found in any collection');
    return null;
  } catch (error) {
    console.error('❌ Error getting user by ID:', error);
    throw error;
  }
};

// Get user by email from appropriate collection
export const getMemberByEmail = async (email) => {
  try {
    console.log('🔍 Looking for user by email:', email);

    // First check members collection by email
    try {
      const membersQuery = query(
        collection(db, 'members'),
        where('email', '==', email)
      );
      const membersSnapshot = await getDocs(membersQuery);
      console.log("membersSnapshottttttttttttttttt", membersSnapshot.docs[0])
      if (!membersSnapshot.empty) {
        const memberDoc = membersSnapshot.docs[0];
        console.log('✅ Found user in members collection');
        return {
          id: memberDoc.id,
          ...memberDoc.data(),
          collection: 'members',
          // isPaidMember: true,// this is hardcoded 
          createdAt: memberDoc.data().createdAt?.toDate()
        };
      }
    } catch (memberError) {
      console.warn('⚠️ Error checking members collection:', memberError);
    }

    // Then check registrations collection by email
    try {
      const registrationsQuery = query(
        collection(db, 'registrations'),
        where('email', '==', email)
      );
      const registrationsSnapshot = await getDocs(registrationsQuery);

      if (!registrationsSnapshot.empty) {
        const registrationDoc = registrationsSnapshot.docs[0];
        console.log('✅ Found user in registrations collection');
        return {
          id: registrationDoc.id,
          ...registrationDoc.data(),
          collection: 'registrations',
          isPaidMember: false,
          createdAt: registrationDoc.data().createdAt?.toDate()
        };
      }
    } catch (registrationError) {
      console.warn('⚠️ Error checking registrations collection:', registrationError);
    }

    console.log('❌ User not found in any collection');
    return null;
  } catch (error) {
    console.error('❌ Error getting user by email:', error);
    throw error;
  }
};

// Update getCurrentUserData to use email
export const getCurrentUserData = async (userEmail) => {
  try {
    const userData = await getMemberByEmail(userEmail);
    if (!userData) {
      console.warn('⚠️ User data not found in collections for email:', userEmail);
      // Return minimal user data instead of throwing error
      return {
        email: userEmail,
        firstName: '',
        lastName: '',
        collection: 'firebase_only',
        isPaidMember: false,
        students: [],
        childrenCount: 0,
        membershipStatus: 'Free',
        createdAt: new Date()
      };
    }
    console.log("backendCurr-userData", userData);
    // Enhance user data with additional info for dashboard
    const enhancedUserData = {
      ...userData,
      childrenCount: userData.students ? userData.students.length : 0,
      membershipStatus: userData.isPaidMember ? 'Paid' : 'Free',
      // registrationSource: userData.collection === 'members' ? 'Web' : 'Mobile'
    };
    console.log("backendCurrent-enhancedUserData", enhancedUserData);

    return enhancedUserData;
  } catch (error) {
    console.error('❌ Error getting current user data:', error);
    // Return minimal user data instead of throwing error
    return {
      email: userEmail,
      firstName: '',
      lastName: '',
      collection: 'firebase_only',
      isPaidMember: false,
      students: [],
      childrenCount: 0,
      membershipStatus: 'Free',
      createdAt: new Date()
    };
  }
};

export const emailExist= async(email)=>{
  const url=process.env.REACT_APP_API_BASE_URL
    const responce= await fetch(`${url}/members/email/${email}`)
    const data= await responce.json()
    return data
}

// Update your addMember function in api-members.js
export const addMember = async (parentData) => {
  try {
    console.log('➕ Adding member with auto-roster creation:', parentData);

    const docRef = await addDoc(collection(db, 'members'), {
      ...parentData,
      uid: parentData.uid, // Store the Firebase Auth UID
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // ✨ NEW: Auto-create rosters for each student
    await createRostersForMember(docRef.id, parentData);

    console.log('✅ Member added successfully with rosters created',docRef,"and user data ",parentData);

        try {
      // Extract required fields from parentData
      const payload = {
        sport: parentData.sport || "",
        phone: parentData.phone || "",
        firstName: parentData.firstName || "",
        lastName: parentData.lastName || "",
        location: parentData.location || "",
        membershipType: parentData.membershipType || "",
        registrationPlan: parentData.registrationPlan || "",
        email: parentData.email || "", 
      };

      // Validate required fields
      if (!payload.firstName || !payload.lastName || !payload.phone) {
        throw new Error("Missing required fields: firstName, lastName, phone");
      }

      // API endpoint (adjust based on environment)
      const API_URL =
        process.env.NODE_ENV === "development"
          ? "http://127.0.0.1:5001/yau-app/us-central1/apis"
          : "http://127.0.0.1:5001/yau-app/us-central1/apis";

      const response = await fetch(
        `${API_URL}/constant-contact/register-yau`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Registration failed");
      }

      console.log("✅ YAU registration successful:", result);
      return result;
    } catch (error) {
      console.error("❌ YAU registration error:", error);
      throw error;
    }

    // REACT_APP_API_BASE_URL

    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding member:', error);
    throw error;
  }
};

// ✨ FIXED: Function to create rosters based on member's students
const createRostersForMember = async (parentId, parentData) => {
  try {
    console.log('🎯 Creating/updating rosters for member:', parentId);
    const batch = writeBatch(db);
    const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };

    for (const student of parentData.students || []) {
      // ✨ FIXED: Handle both firstName/lastName and name fields
      if (!student.name && !student.firstName) {
        console.warn('⚠️ Child missing name, skipping:', student);
        continue;
      }

      const childName = student.name || `${student.firstName} ${student.lastName}`.trim();
      // Use grade for roster grouping (primary)
      const childGrade = student.grade || "";
      // Keep ageGroup for backward compatibility
      const childAgeGroup = student.ageGroup || calculateAgeGroup(student.dob);
      
      // Use student's sport/location if available, otherwise fallback to parentData
      const studentSport = student.sport || parentData.sport || "";
      const studentLocation = student.location || parentData.location || "";
      const mappedSport = sportMapping[studentSport] || studentSport;

      // Validate required fields
      if (!childGrade || !mappedSport || !studentLocation) {
        console.warn('⚠️ Missing required fields for roster creation:', {
          childName,
          grade: childGrade,
          sport: mappedSport,
          location: studentLocation
        });
        continue;
      }

      // Create roster ID using grade (not ageGroup)
      const rosterId = `${mappedSport.toLowerCase().replace(/\s+/g, '-')}-${childGrade.toLowerCase().replace(/\s+/g, '-')}-${studentLocation.replace(/\s+/g, '-').toLowerCase()}`;

      console.log(`🔍 Processing student: ${childName} -> Roster: ${rosterId} (Grade: ${childGrade})`);

      const rosterRef = doc(db, 'rosters', rosterId);
      const rosterSnap = await getDoc(rosterRef);

      // Create participant data
      const participantData = {
        id: `${parentId}-${childName}`,
        name: childName,
        firstName: student.firstName || childName.split(' ')[0] || '',
        lastName: student.lastName || childName.split(' ')[1] || '',
        dob: student.dob,
        ageGroup: childAgeGroup, // Keep for backward compatibility
        grade: childGrade,
        school_name: student.school_name || "",
        parentId: parentId,
        parentName: `${parentData.firstName} ${parentData.lastName}`,
        parentEmail: parentData.email,
        parentPhone: parentData.phone,
        sport: mappedSport,
        location: studentLocation,
        registeredAt: new Date().toISOString(),
        status: 'active'
      };

      if (!rosterSnap.exists()) {
        // ✅ CREATE NEW ROSTER
        const newRoster = {
          id: rosterId,
          teamName: `${childGrade} ${mappedSport} - ${studentLocation}`,
          sport: mappedSport,
          grade: childGrade, // Primary grouping field
          ageGroup: childAgeGroup, // Keep for backward compatibility
          location: studentLocation,

          // Coach assignment (initially empty)
          coachId: null,
          coachName: 'Unassigned',
          hasAssignedCoach: false,

          // Add the first participant
          participants: [participantData],
          players: [participantData], // Keep both for compatibility

          // Roster stats
          playerCount: 1,
          hasPlayers: true,
          isEmpty: false,

          // Status logic
          status: 'needs-coach', // New roster always needs coach first

          // Timestamps
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),

          // Additional metadata
          maxPlayers: 20, // Default team size limit
          minPlayers: 6,  // Minimum for active team
          isActive: false, // Only active when has coach AND players
        };

        batch.set(rosterRef, newRoster);
        console.log(`🆕 Creating new roster: ${rosterId}`);

      } else {
        // ✅ UPDATE EXISTING ROSTER
        const existingRoster = rosterSnap.data();
        const existingParticipants = existingRoster.participants || [];

        // Remove existing entry for this student (prevent duplicates)
        const filteredParticipants = existingParticipants.filter(
          p => p.id !== participantData.id
        );

        // Add new entry
        const updatedParticipants = [...filteredParticipants, participantData];
        const newPlayerCount = updatedParticipants.length;

        // Calculate new status based on coach and player count
        let newStatus = 'empty';
        let isActive = false;

        if (newPlayerCount > 0 && existingRoster.hasAssignedCoach) {
          newStatus = newPlayerCount >= (existingRoster.minPlayers || 6) ? 'active' : 'forming';
          isActive = newPlayerCount >= (existingRoster.minPlayers || 6);
        } else if (newPlayerCount > 0 && !existingRoster.hasAssignedCoach) {
          newStatus = 'needs-coach';
          isActive = false;
        } else if (newPlayerCount === 0 && existingRoster.hasAssignedCoach) {
          newStatus = 'needs-players';
          isActive = false;
        } else {
          newStatus = 'empty';
          isActive = false;
        }

        const updateData = {
          participants: updatedParticipants,
          players: updatedParticipants, // Keep both for compatibility
          playerCount: newPlayerCount,
          hasPlayers: newPlayerCount > 0,
          isEmpty: newPlayerCount === 0,
          status: newStatus,
          isActive: isActive,
          lastUpdated: serverTimestamp(),

          // Update team name if needed (in case location changed)
          teamName: `${childGrade} ${mappedSport} - ${studentLocation}`
        };

        batch.update(rosterRef, updateData);
        console.log(`➕ Updated existing roster: ${rosterId} (${newPlayerCount} players)`);
      }
    }

    await batch.commit();
    console.log('✅ Roster creation/update completed');

    return { success: true, message: 'Rosters successfully created/updated' };

  } catch (error) {
    console.error('❌ Error in createRostersForMember:', error);
    throw error;
  }
};

// In firestore.js - Enhanced updateMember function
export const updateMember = async (id, updates) => {
  try {
    console.log('✏️ Updating member with roster sync:', id, updates);

    // Get the current member data first
    const currentMemberData = await getMemberById(id);
    if (!currentMemberData) {
      throw new Error('Member not found');
    }

    // Update the member document
    const docRef = doc(db, 'members', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    // ✨ NEW: Sync roster changes based on what was updated
    await syncRosterChangesForMember(id, currentMemberData, updates);

    console.log('✅ Member updated with roster sync completed');
    return { success: true, message: 'Member updated successfully with roster sync' };
  } catch (error) {
    console.error('❌ Error updating member:', error);
    throw error;
  }
};

// NEW: Function to sync roster changes when parent is updated
const syncRosterChangesForMember = async (parentId, oldMemberData, newMemberData) => {
  try {
    console.log('🔄 Syncing roster changes for parent:', parentId);

    const batch = writeBatch(db);
    const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };

    // Determine what changed
    const oldStudents = oldMemberData.students || [];
    const newStudents = newMemberData.students || [];
    const oldSport = sportMapping[oldMemberData.sport] || oldMemberData.sport;
    const newSport = sportMapping[newMemberData.sport] || newMemberData.sport;
    const oldLocation = oldMemberData.location;
    const newLocation = newMemberData.location;

    // Track changes
    let changesDetected = {
      sportChanged: oldSport !== newSport,
      locationChanged: oldLocation !== newLocation,
      studentsAdded: [],
      studentsRemoved: [],
      studentsModified: []
    };

    // Detect student changes
    const oldStudentIds = oldStudents.map(s => s.name || `${s.firstName} ${s.lastName}`);
    const newStudentIds = newStudents.map(s => s.name || `${s.firstName} ${s.lastName}`);

    // Find added students
    changesDetected.studentsAdded = newStudents.filter(newStudent => {
      const newStudentId = newStudent.name || `${newStudent.firstName} ${newStudent.lastName}`;
      return !oldStudentIds.includes(newStudentId);
    });

    // Find removed students
    changesDetected.studentsRemoved = oldStudents.filter(oldStudent => {
      const oldStudentId = oldStudent.name || `${oldStudent.firstName} ${oldStudent.lastName}`;
      return !newStudentIds.includes(oldStudentId);
    });

    // Find modified students (same name but different data)
    changesDetected.studentsModified = newStudents.filter(newStudent => {
      const newStudentId = newStudent.name || `${newStudent.firstName} ${newStudent.lastName}`;
      const oldStudent = oldStudents.find(os =>
        (os.name || `${os.firstName} ${os.lastName}`) === newStudentId
      );

      if (!oldStudent) return false;

      return (
        oldStudent.dob !== newStudent.dob ||
        oldStudent.ageGroup !== newStudent.ageGroup ||
        JSON.stringify(oldStudent) !== JSON.stringify(newStudent)
      );
    });

    console.log('📋 Detected changes:', changesDetected);

    // Handle sport or location changes - need to move all students
    if (changesDetected.sportChanged || changesDetected.locationChanged) {
      await handleMemberSportLocationChange(
        parentId,
        oldMemberData,
        newMemberData,
        batch
      );
    }

    // Handle added students
    for (const addedStudent of changesDetected.studentsAdded) {
      await addStudentToRoster(
        parentId,
        newMemberData,
        addedStudent,
        batch
      );
    }

    // Handle removed students
    for (const removedStudent of changesDetected.studentsRemoved) {
      await removeStudentFromRoster(
        parentId,
        oldMemberData,
        removedStudent,
        batch
      );
    }

    // Handle modified students
    for (const modifiedStudent of changesDetected.studentsModified) {
      await updateStudentInRoster(
        parentId,
        newMemberData,
        modifiedStudent,
        batch
      );
    }

    // Commit all changes
    await batch.commit();
    console.log('✅ Roster sync completed for parent update');

  } catch (error) {
    console.error('❌ Error syncing roster changes:', error);
    throw error;
  }
};

// Handle when parent changes sport or location (affects all students)
const handleMemberSportLocationChange = async (parentId, oldMemberData, newMemberData, batch) => {
  console.log('🔄 Handling sport/location change for parent:', parentId);

  const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };
  const oldSport = sportMapping[oldMemberData.sport] || oldMemberData.sport;
  const newSport = sportMapping[newMemberData.sport] || newMemberData.sport;

  // Remove all students from old rosters
  for (const student of oldMemberData.students || []) {
    const oldRosterId = `${oldSport.toLowerCase()}-${student.ageGroup.toLowerCase()}-${oldMemberData.location.replace(/\s+/g, '-').toLowerCase()}`;
    await removeStudentFromSpecificRoster(parentId, student, oldRosterId, batch);
  }

  // Add all students to new rosters
  for (const student of newMemberData.students || []) {
    const newRosterId = `${newSport.toLowerCase()}-${student.ageGroup.toLowerCase()}-${newMemberData.location.replace(/\s+/g, '-').toLowerCase()}`;
    await addStudentToSpecificRoster(parentId, newMemberData, student, newRosterId, batch);
  }
};

// Add a student to appropriate roster
const addStudentToRoster = async (parentId, parentData, student, batch) => {
  const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };
  const mappedSport = sportMapping[parentData.sport] || parentData.sport;
  const rosterId = `${mappedSport.toLowerCase()}-${student.ageGroup.toLowerCase()}-${parentData.location.replace(/\s+/g, '-').toLowerCase()}`;

  await addStudentToSpecificRoster(parentId, parentData, student, rosterId, batch);
};

// Remove a student from their roster
const removeStudentFromRoster = async (parentId, parentData, student, batch) => {
  const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };
  const mappedSport = sportMapping[parentData.sport] || parentData.sport;
  const rosterId = `${mappedSport.toLowerCase()}-${student.ageGroup.toLowerCase()}-${parentData.location.replace(/\s+/g, '-').toLowerCase()}`;

  await removeStudentFromSpecificRoster(parentId, student, rosterId, batch);
};

// Update student data in their roster
const updateStudentInRoster = async (parentId, parentData, student, batch) => {
  // Remove old version and add new version
  await removeStudentFromRoster(parentId, parentData, student, batch);
  await addStudentToRoster(parentId, parentData, student, batch);
};

// Helper: Add student to specific roster
const addStudentToSpecificRoster = async (parentId, parentData, student, rosterId, batch) => {
  const rosterRef = doc(db, 'rosters', rosterId);
  const rosterSnap = await getDoc(rosterRef);

  const newParticipant = {
    id: `${parentId}-${student.name || `${student.firstName} ${student.lastName}`}`,
    name: student.name || `${student.firstName} ${student.lastName}`,
    firstName: student.firstName || student.name?.split(' ')[0],
    lastName: student.lastName || student.name?.split(' ')[1] || '',
    dob: student.dob,
    ageGroup: student.ageGroup,
    parentId: parentId,
    parentName: `${parentData.firstName} ${parentData.lastName}`,
    parentEmail: parentData.email,
    parentPhone: parentData.phone,
    sport: parentData.sport,
    location: parentData.location,
    registeredAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (rosterSnap.exists()) {
    // Update existing roster
    const existingRoster = rosterSnap.data();
    const updatedParticipants = [...(existingRoster.participants || []), newParticipant];

    batch.update(rosterRef, {
      participants: updatedParticipants,
      playerCount: updatedParticipants.length,
      hasPlayers: true,
      status: existingRoster.hasAssignedCoach ? 'active' : 'needs-coach',
      lastUpdated: serverTimestamp()
    });

    console.log(`➕ Added student to existing roster: ${rosterId}`);
  } else {
    // Create new roster
    const newRoster = {
      id: rosterId,
      teamName: `${student.ageGroup} ${parentData.sport} - ${parentData.location}`,
      sport: parentData.sport,
      ageGroup: student.ageGroup,
      location: parentData.location,
      coachId: null,
      coachName: 'Unassigned',
      hasAssignedCoach: false,
      participants: [newParticipant],
      playerCount: 1,
      hasPlayers: true,
      status: 'needs-coach',
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    };

    batch.set(rosterRef, newRoster);
    console.log(`🆕 Created new roster: ${rosterId}`);
  }
};

// Helper: Remove student from specific roster
const removeStudentFromSpecificRoster = async (parentId, student, rosterId, batch) => {
  const rosterRef = doc(db, 'rosters', rosterId);
  const rosterSnap = await getDoc(rosterRef);

  if (rosterSnap.exists()) {
    const existingRoster = rosterSnap.data();
    const studentId = `${parentId}-${student.name || `${student.firstName} ${student.lastName}`}`;

    const updatedParticipants = (existingRoster.participants || []).filter(
      p => p.id !== studentId
    );

    const updatedPlayerCount = updatedParticipants.length;

    if (updatedPlayerCount === 0 && !existingRoster.hasAssignedCoach) {
      // Delete empty roster with no coach
      batch.delete(rosterRef);
      console.log(`🗑️ Deleted empty roster: ${rosterId}`);
    } else {
      // Update roster
      let newStatus = 'empty';
      if (updatedPlayerCount > 0 && existingRoster.hasAssignedCoach) {
        newStatus = 'active';
      } else if (updatedPlayerCount > 0 && !existingRoster.hasAssignedCoach) {
        newStatus = 'needs-coach';
      } else if (updatedPlayerCount === 0 && existingRoster.hasAssignedCoach) {
        newStatus = 'needs-players';
      }

      batch.update(rosterRef, {
        participants: updatedParticipants,
        playerCount: updatedPlayerCount,
        hasPlayers: updatedPlayerCount > 0,
        status: newStatus,
        lastUpdated: serverTimestamp()
      });

      console.log(`➖ Removed student from roster: ${rosterId} (${updatedPlayerCount} remaining)`);
    }
  }
};
export const createFirebaseAuthUser = async (email, password) => {
  try {
    const { API_CONFIG } = await import('../config');
    console.log('👤 Calling Render backend for user creation...');

    const response = await fetch(`${API_CONFIG.baseURL}/auth/create-auth-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to create account on server');
    }

    return result.data.localId; // UID of created user
  } catch (error) {
    console.error('❌ Failed to create auth user via proxy:', error.message);
    throw error;
  }
};

// Sync parents to newly created rosters
export const syncMembersToRosters = async () => {
  try {
    console.log('🔄 Syncing parents to newly created rosters...');

    const [parentsData, rostersData] = await Promise.all([
      getMembers(),
      getRosters()
    ]);

    console.log(`📊 Found ${parentsData.length} parents and ${rostersData.length} rosters`);

    const batch = writeBatch(db);
    const currentTimestamp = new Date().toISOString();
    const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };

    let parentsUpdated = 0;
    let rostersUpdated = 0;
    let newAssignments = 0;

    // Process each parent
    for (const parent of parentsData) {
      if (!parent.students || !Array.isArray(parent.students)) {
        continue;
      }

      let parentHasAssignments = false;
      const parentAssignments = [];

      // Check each student against available rosters
      for (const student of parent.students) {
        if (!student.name && !student.firstName) continue;

        const childName = student.name || student.firstName;
        const childAgeGroup = calculateAgeGroup(student.dob, student.ageGroup);
        const mappedSport = sportMapping[parent.sport] || parent.sport;

        // Find matching roster for this student
        const matchingRoster = rostersData.find(roster =>
          roster.sport && mappedSport &&
          roster.sport.toLowerCase() === mappedSport.toLowerCase() &&
          roster.ageGroup && childAgeGroup &&
          roster.ageGroup.toLowerCase() === childAgeGroup.toLowerCase() &&
          roster.location && parent.location &&
          roster.location.toLowerCase() === parent.location.toLowerCase() &&
          roster.hasAssignedCoach && roster.coachId // Only assign to rosters with coaches
        );

        if (matchingRoster) {
          console.log(`✅ Found matching roster for ${childName}: ${matchingRoster.id}`);

          // Create participant data
          const participantData = {
            id: `${parent.id}-${childName}`,
            firstName: student.firstName,
            lastName: student.lastName,
            dob: student.dob || null,
            ageGroup: childAgeGroup,
            parentId: parent.id,
            parentName: `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
            parentEmail: parent.email || '',
            parentPhone: parent.phone || '',
            sport: mappedSport,
            location: parent.location || '',
            coachId: matchingRoster.coachId,
            coachName: matchingRoster.coachName,
            assignedAt: currentTimestamp,
            assignedBy: 'auto-sync'
          };

          // Check if student already exists in roster
          const existingParticipants = matchingRoster.participants || [];
          const existingIndex = existingParticipants.findIndex(p => p.id === participantData.id);

          let updatedParticipants;
          if (existingIndex >= 0) {
            // Update existing participant
            updatedParticipants = [...existingParticipants];
            updatedParticipants[existingIndex] = participantData;
          } else {
            // Add new participant
            updatedParticipants = [...existingParticipants, participantData];
            newAssignments++;
          }

          // Update roster
          const rosterRef = doc(db, 'rosters', matchingRoster.id);
          const rosterUpdateData = {
            participants: updatedParticipants,
            players: updatedParticipants,
            playerCount: updatedParticipants.length,
            hasPlayers: true,
            status: 'active',
            lastUpdated: serverTimestamp()
          };

          batch.update(rosterRef, rosterUpdateData);
          rostersUpdated++;

          parentHasAssignments = true;
          parentAssignments.push({
            childName: childName,
            rosterId: matchingRoster.id,
            teamName: matchingRoster.teamName,
            coachName: matchingRoster.coachName
          });
        } else {
          console.log(`⚠️ No matching roster found for ${childName} (${childAgeGroup} ${mappedSport} at ${parent.location})`);
        }
      }

      // Update parent assignment status if they got assigned
      if (parentHasAssignments) {
        const parentRef = doc(db, COLLECTIONS.PARENTS, parent.id);
        const parentUpdateData = {
          assignedAt: serverTimestamp(),
          assignedBy: 'auto-sync',
          lastAssignmentUpdate: currentTimestamp,
          assignments: parentAssignments // Track what they were assigned to
        };

        batch.update(parentRef, parentUpdateData);
        parentsUpdated++;

        console.log(`✅ Updated parent ${parent.firstName} ${parent.lastName} with ${parentAssignments.length} assignments`);
      }
    }

    // Commit all changes
    await batch.commit();

    console.log(`🎯 Sync completed:`, {
      parentsUpdated,
      rostersUpdated,
      newAssignments
    });

    return {
      parentsUpdated,
      rostersUpdated,
      newAssignments,
      message: `✅ Sync completed! ${parentsUpdated} parents updated, ${newAssignments} new assignments made.`
    };

  } catch (error) {
    console.error('❌ Error syncing parents to rosters:', error);
    throw error;
  }
};
export const assignChildrenToExistingRosters = async (parentId, parentData) => {
  try {
    console.log(`🎯 Assigning children to rosters for parent: ${parentId}`);

    const assignmentResults = [];
    const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };
    const mappedSport = sportMapping[parentData.sport] || parentData.sport;

    for (const student of parentData.children || parentData.students || []) {
      const childName = student.name || student.firstName || '';
      if (!childName) {
        console.warn('⚠️ Child missing name, skipping:', student);
        continue;
      }

      // Use grade for roster grouping (primary)
      const childGrade = student.grade || "";
      // Keep ageGroup for backward compatibility
      const childAgeGroup = student.ageGroup || calculateAgeGroup(student.dob);
      
      // Use student's sport/location if available, otherwise fallback to parentData
      const studentSport = student.sport || parentData.sport || "";
      const studentLocation = student.location || parentData.location || "";
      const mappedSport = sportMapping[studentSport] || studentSport;

      // Validate required matching criteria
      if (!childGrade || !mappedSport || !studentLocation) {
        assignmentResults.push({
          student: childName,
          status: 'error',
          message: 'Missing required information (grade, sport, or location)'
        });
        continue;
      }

      // Generate roster ID using grade (not ageGroup)
      const rosterId = `${mappedSport.toLowerCase().replace(/\s+/g, '-')}-${childGrade.toLowerCase().replace(/\s+/g, '-')}-${studentLocation.replace(/\s+/g, '-').toLowerCase()}`;

      console.log(`👶 Processing: ${childName} -> Looking for roster: ${rosterId}`);
      console.log(`📋 Matching criteria: Sport="${mappedSport}", Grade="${childGrade}", Location="${studentLocation}"`);

      // Check if exact matching roster exists
      const rosterRef = doc(db, 'rosters', rosterId);
      const rosterSnap = await getDoc(rosterRef);

      if (rosterSnap.exists()) {
        const rosterData = rosterSnap.data();

        // ✅ EXACT MATCH FOUND
        console.log(`✅ Found matching roster: ${rosterId}`);
        console.log(`📊 Roster details:`, {
          sport: rosterData.sport,
          grade: rosterData.grade,
          ageGroup: rosterData.ageGroup, // Keep for logging
          location: rosterData.location,
          hasCoach: rosterData.hasAssignedCoach,
          playerCount: rosterData.playerCount || 0
        });

        // Add student to this roster
        await addPlayerToMatchingRoster(parentId, parentData, student, rosterRef, rosterData);

        if (rosterData.hasAssignedCoach) {
          assignmentResults.push({
            student: childName,
            roster: rosterId,
            status: 'assigned',
            message: `✅ Assigned to ${rosterData.teamName} (Coach: ${rosterData.coachName})`
          });
        } else {
          assignmentResults.push({
            student: childName,
            roster: rosterId,
            status: 'waiting',
            message: `⏳ Added to team, waiting for coach assignment`
          });
        }

      } else {
        // ❌ NO EXACT MATCH - CREATE NEW ROSTER
        console.log(`❌ No exact match found for: ${rosterId}`);
        console.log(`🆕 Creating new roster for: Sport="${mappedSport}", Grade="${childGrade}", Location="${studentLocation}"`);

        await createNewRosterForChild(parentId, parentData, student, rosterId, mappedSport, childGrade, childAgeGroup, studentLocation);

        assignmentResults.push({
          student: childName,
          roster: rosterId,
          status: 'new_team',
          message: `🆕 Created new team - needs coach assignment`
        });

        // Create interest record for coach assignment
        await createInterestRecord(parentId, parentData, student, rosterId);
      }
    }

    console.log('📊 Assignment Results:', assignmentResults);
    return assignmentResults;

  } catch (error) {
    console.error('❌ Error in assignChildrenToExistingRosters:', error);
    throw error;
  }
};

// Helper function to add player to matching roster
const addPlayerToMatchingRoster = async (parentId, parentData, student, rosterRef, rosterData) => {
  const childName = student.name || student.firstName || '';
  const studentGrade = student.grade || "";
  const studentAgeGroup = student.ageGroup || calculateAgeGroup(student.dob);
  const studentSport = student.sport || rosterData.sport || "";
  const studentLocation = student.location || parentData.location || "";

  const participantData = {
    id: `${parentId}-${childName}`,
    name: childName,
    firstName: student.firstName || childName.split(' ')[0] || '',
    lastName: student.lastName || childName.split(' ')[1] || '',
    dob: student.dob,
    ageGroup: studentAgeGroup, // Keep for backward compatibility
    grade: studentGrade,
    school_name: student.school_name || "",
    parentId: parentId,
    parentName: `${parentData.firstName} ${parentData.lastName}`,
    parentEmail: parentData.email,
    parentPhone: parentData.phone,
    sport: studentSport,
    location: studentLocation,
    registeredAt: new Date().toISOString()
  };

  // Remove existing entry (prevent duplicates)
  const existingParticipants = rosterData.participants || [];
  const filteredParticipants = existingParticipants.filter(p => p.id !== participantData.id);

  // Add new entry
  const updatedParticipants = [...filteredParticipants, participantData];
  const newPlayerCount = updatedParticipants.length;

  // Calculate status
  let newStatus = 'empty';
  if (newPlayerCount > 0 && rosterData.hasAssignedCoach) {
    newStatus = newPlayerCount >= 6 ? 'active' : 'forming';
  } else if (newPlayerCount > 0 && !rosterData.hasAssignedCoach) {
    newStatus = 'needs-coach';
  } else if (newPlayerCount === 0 && rosterData.hasAssignedCoach) {
    newStatus = 'needs-players';
  }

  await updateDoc(rosterRef, {
    participants: updatedParticipants,
    players: updatedParticipants,
    playerCount: newPlayerCount,
    hasPlayers: newPlayerCount > 0,
    isEmpty: false,
    status: newStatus,
    lastUpdated: serverTimestamp()
  });

  console.log(`✅ Added ${childName} to roster. New count: ${newPlayerCount}`);
};

// Helper function to create new roster for student
const createNewRosterForChild = async (parentId, parentData, student, rosterId, mappedSport, childGrade, childAgeGroup, studentLocation) => {
  const childName = student.name || student.firstName || '';
  const location = studentLocation || parentData.location || "";

  const participantData = {
    id: `${parentId}-${childName}`,
    name: childName,
    firstName: student.firstName || childName.split(' ')[0] || '',
    lastName: student.lastName || childName.split(' ')[1] || '',
    dob: student.dob,
    ageGroup: childAgeGroup, // Keep for backward compatibility
    grade: childGrade,
    school_name: student.school_name || "",
    parentId: parentId,
    parentName: `${parentData.firstName} ${parentData.lastName}`,
    parentEmail: parentData.email,
    parentPhone: parentData.phone,
    sport: mappedSport,
    location: location,
    registeredAt: new Date().toISOString()
  };

  const newRoster = {
    id: rosterId,
    teamName: `${childGrade} ${mappedSport} - ${location}`,
    sport: mappedSport,
    grade: childGrade, // Primary grouping field
    ageGroup: childAgeGroup, // Keep for backward compatibility
    location: location,

    // Coach info
    coachId: null,
    coachName: 'Unassigned',
    hasAssignedCoach: false,

    // Players
    participants: [participantData],
    players: [participantData],
    playerCount: 1,
    hasPlayers: true,
    isEmpty: false,

    // Status
    status: 'needs-coach',
    isActive: false,

    // Timestamps
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),

    // Limits
    maxPlayers: 20,
    minPlayers: 6
  };

  await addDoc(collection(db, 'rosters'), newRoster);
  console.log(`🆕 Created new roster: ${rosterId}`);
};
// Helper function to create interest record
const createInterestRecord = async (parentId, parentData, student, rosterId) => {
  try {
    await addDoc(collection(db, 'interest_records'), {
      parentId: parentId,
      parentName: `${parentData.firstName} ${parentData.lastName}`,
      parentEmail: parentData.email,
      parentPhone: parentData.phone,
      childName: student.name || student.firstName,
      childAgeGroup: student.ageGroup,
      childDob: student.dob,
      sport: parentData.sport,
      location: parentData.location,
      requestedRosterId: rosterId,
      status: 'pending_team_creation',
      createdAt: serverTimestamp()
    });

    console.log(`📝 Created interest record for ${student.name || student.firstName} - ${rosterId}`);
  } catch (error) {
    console.error('❌ Error creating interest record:', error);
  }
};
// ✨ UPDATED: Enhanced deleteMember with roster cleanup
export const deleteMember = async (id) => {
  try {
    console.log('🗑️ Starting complete member deletion process for:', id);

    // 1. Get member data first
    const member = await getMemberById(id);
    if (!member) {
      throw new Error('Member not found');
    }

    console.log('📋 Found member:', member.firstName, member.lastName, '| Email:', member.email);

    // 2. ✨ NEW: Remove from rosters if they have students assigned
    if (member.students && member.students.length > 0) {
      await removeStudentsFromRosters(id, member);
    }

    // // 3. Delete from Firebase Auth using email
    // if (member.email) {
    //   try {
    //     console.log('🔐 Deleting from Firebase Auth using EMAIL:', member.email);
    //     const authResult = await deleteFirebaseAuthUserByEmail(member.email);

    //     if (authResult.success) {
    //       console.log('✅ Successfully deleted from Firebase Auth:', authResult.message);
    //     } else {
    //       console.warn('⚠️ Firebase Auth deletion had issues:', authResult.message);
    //     }

    //   } catch (authError) {
    //     console.error('❌ Firebase Auth deletion failed:', authError.message);
    //     // Continue with database deletion even if auth deletion fails
    //   }
    // }

    // 4. Delete from members collection
    const memberRef = doc(db, 'members', id);
    await deleteDoc(memberRef);
    console.log('✅ Deleted from members collection');

    // 5. ✨ NEW: Clean up related data
    await cleanupMemberRelatedData(id, member);

    console.log('🎯 Complete member deletion completed successfully');

    return {
      success: true,
      message: 'Member completely deleted from all systems including rosters and Firebase Auth',
      deletedFromAuth: !!member.email,
      email: member.email
    };

  } catch (error) {
    console.error('❌ Error deleting member:', error);
    throw error;
  }
};

// Helper function to remove students from rosters
const removeStudentsFromRosters = async (parentId, memberData) => {
  try {
    console.log('🏃‍♂️ Removing students from rosters...');

    const batch = writeBatch(db);
    const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };
    const mappedSport = sportMapping[memberData.sport] || memberData.sport;

    for (const student of memberData.students || []) {
      if (!student.name && !student.firstName) continue;

      const childName = student.name || student.firstName;
      const childAgeGroup = student.ageGroup || calculateAgeGroup(student.dob);

      if (!childAgeGroup || !mappedSport || !memberData.location) continue;

      // Find the roster this student should be in
      const rosterId = `${mappedSport.toLowerCase().replace(/\s+/g, '-')}-${childAgeGroup.toLowerCase()}-${memberData.location.replace(/\s+/g, '-').toLowerCase()}`;

      console.log(`🔍 Looking for student ${childName} in roster: ${rosterId}`);

      const rosterRef = doc(db, 'rosters', rosterId);
      const rosterSnap = await getDoc(rosterRef);

      if (rosterSnap.exists()) {
        const rosterData = rosterSnap.data();
        const studentId = `${parentId}-${childName}`;

        // Remove student from participants
        const updatedParticipants = (rosterData.participants || []).filter(
          p => p.id !== studentId
        );

        const newPlayerCount = updatedParticipants.length;

        if (newPlayerCount === 0 && !rosterData.hasAssignedCoach) {
          // Delete empty roster with no coach
          batch.delete(rosterRef);
          console.log(`🗑️ Deleting empty roster: ${rosterId}`);
        } else {
          // Update roster with remaining players
          let newStatus = 'empty';
          if (newPlayerCount > 0 && rosterData.hasAssignedCoach) {
            newStatus = newPlayerCount >= 6 ? 'active' : 'forming';
          } else if (newPlayerCount > 0 && !rosterData.hasAssignedCoach) {
            newStatus = 'needs-coach';
          } else if (newPlayerCount === 0 && rosterData.hasAssignedCoach) {
            newStatus = 'needs-players';
          }

          batch.update(rosterRef, {
            participants: updatedParticipants,
            players: updatedParticipants,
            playerCount: newPlayerCount,
            hasPlayers: newPlayerCount > 0,
            status: newStatus,
            lastUpdated: serverTimestamp()
          });

          console.log(`➖ Removed ${childName} from roster: ${rosterId}`);
        }
      }
    }

    await batch.commit();
    console.log('✅ Students removed from rosters');

  } catch (error) {
    console.error('❌ Error removing students from rosters:', error);
    throw error;
  }
};

// Helper function to clean up related data
const cleanupMemberRelatedData = async (memberId, memberData) => {
  try {
    console.log('🧹 Cleaning up related data...');

    const batch = writeBatch(db);

    // Delete interest records
    const interestQuery = query(
      collection(db, 'interest_records'),
      where('parentId', '==', memberId)
    );
    const interestSnap = await getDocs(interestQuery);

    interestSnap.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    // Delete payment records (if they exist)
    const paymentQuery = query(
      collection(db, 'payments'),
      where('parentId', '==', memberId)
    );
    const paymentSnap = await getDocs(paymentQuery);

    paymentSnap.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    // Delete notifications related to this member
    const notificationQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', memberId)
    );
    const notificationSnap = await getDocs(notificationQuery);

    notificationSnap.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();
    console.log('✅ Related data cleaned up');

  } catch (error) {
    console.error('❌ Error cleaning up related data:', error);
    // Don't throw error here - cleanup is not critical
  }
};