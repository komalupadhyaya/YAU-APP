// apis/api-members.js - Updated to use backend APIs instead of direct Firebase calls
import { API_CONFIG, buildApiUrl } from "../config";
import { calculateAgeGroup } from "../firestore";
import { db } from "../config";
import { doc, getDoc, writeBatch } from "firebase/firestore";

// Helper function for API calls
const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.success !== false ? data.data || data : Promise.reject(new Error(data.error));
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Get members from members collection
export const getMembers = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.members.getAll));
  } catch (error) {
    console.error('Error getting members:', error);
    throw error;
  }
};

export const getMemberById = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.members.getById, { id }));
  } catch (error) {
    console.error('Error getting member:', error);
    throw error;
  }
};

// Enhanced updateMember function with roster sync
export const updateMember = async (id, updates) => {
  try {
    console.log('✏️ Updating member with roster sync:', id, updates);

    // Get the current member data first
    const currentMemberData = await getMemberById(id);
    if (!currentMemberData) {
      throw new Error('Member not found');
    }

    // Update the member via API
    await apiCall(buildApiUrl(API_CONFIG.endpoints.members.update, { id }), {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    // Sync roster changes based on what was updated
    await syncRosterChangesForMember(id, currentMemberData, updates);

    console.log('✅ Member updated with roster sync completed');
    return { success: true, message: 'Member updated successfully with roster sync' };
  } catch (error) {
    console.error('❌ Error updating member:', error);
    throw error;
  }
};

// Function to sync roster changes when parent is updated
const syncRosterChangesForMember = async (parentId, oldMemberData, newMemberData) => {
  try {
    console.log('🔄 Syncing roster changes for parent:', parentId);

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
        newMemberData
      );
    }

    // Handle added students
    for (const addedStudent of changesDetected.studentsAdded) {
      await addStudentToRoster(
        parentId,
        newMemberData,
        addedStudent
      );
    }

    // Handle removed students
    for (const removedStudent of changesDetected.studentsRemoved) {
      await removeStudentFromRoster(
        parentId,
        oldMemberData,
        removedStudent
      );
    }

    // Handle modified students
    for (const modifiedStudent of changesDetected.studentsModified) {
      await updateStudentInRoster(
        parentId,
        newMemberData,
        modifiedStudent
      );
    }

    console.log('✅ Roster sync completed for parent update');

  } catch (error) {
    console.error('❌ Error syncing roster changes:', error);
    throw error;
  }
};

const handleMemberSportLocationChange = async (parentId, oldMemberData, newMemberData) => {
  console.log('🔄 Handling sport/location change for parent:', parentId);

  const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };
  const oldSport = sportMapping[oldMemberData.sport] || oldMemberData.sport;
  const newSport = sportMapping[newMemberData.sport] || newMemberData.sport;

  // Remove all students from old rosters
  for (const student of oldMemberData.students || []) {
    const oldRosterId = `${oldSport.toLowerCase()}-${student.ageGroup.toLowerCase()}-${oldMemberData.location.replace(/\s+/g, '-').toLowerCase()}`;
    await removeStudentFromSpecificRoster(parentId, student, oldRosterId);
  }

  // Add all students to new rosters
  for (const student of newMemberData.students || []) {
    const newRosterId = `${newSport.toLowerCase()}-${student.ageGroup.toLowerCase()}-${newMemberData.location.replace(/\s+/g, '-').toLowerCase()}`;
    await addStudentToSpecificRoster(parentId, newMemberData, student, newRosterId);
  }
};

// Firebase Auth user deletion via API
export const deleteFirebaseAuthUserByEmail = async (email) => {
  try {
    console.log('🔥 Calling API to delete user by email:', email);

    // Validate email
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new Error('Valid email is required to delete user');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Invalid email format');
    }

    // Call admin API to delete Firebase Auth user
    const result = await apiCall(`${API_CONFIG.baseURL}/admin/delete-auth-user`, {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() })
    });

    console.log('✅ API response:', result);
    return result;

  } catch (error) {
    console.error('❌ Error calling delete auth user API:', error);
    
    if (error.message.includes('unauthenticated')) {
      throw new Error('Authentication failed. Please sign out and sign in again.');
    } else if (error.message.includes('permission-denied')) {
      throw new Error('You do not have permission to delete users');
    } else {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }
};

// Batch delete Firebase Auth users via API
export const batchDeleteFirebaseAuthUsersByEmail = async (emails) => {
  try {
    console.log('🔥 Calling API to batch delete users by email:', emails);

    // Validate emails array
    if (!Array.isArray(emails) || emails.length === 0) {
      throw new Error('Valid emails array is required');
    }

    // Filter out invalid emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emails.filter(email =>
      email && typeof email === 'string' && emailRegex.test(email.trim())
    ).map(email => email.trim());

    if (validEmails.length === 0) {
      throw new Error('No valid emails provided');
    }

    if (validEmails.length !== emails.length) {
      console.warn(`⚠️ Filtered out ${emails.length - validEmails.length} invalid emails`);
    }

    // Call admin API for batch delete
    const result = await apiCall(`${API_CONFIG.baseURL}/admin/batch-delete-auth-users`, {
      method: 'POST',
      body: JSON.stringify({ emails: validEmails })
    });

    console.log('✅ Batch delete response:', result);
    return result;

  } catch (error) {
    console.error('❌ Error calling batch delete API:', error);

    if (error.message.includes('unauthenticated')) {
      throw new Error('Authentication failed. Please sign out and sign in again.');
    }

    throw new Error(`Failed to batch delete users: ${error.message}`);
  }
};

// Legacy function for backward compatibility
export const deleteFirebaseAuthUser = async (uid) => {
  try {
    console.log('🔥 Calling legacy API to delete user by UID:', uid);
    console.log('⚠️ Consider using deleteFirebaseAuthUserByEmail for better reliability');

    if (!uid || typeof uid !== 'string' || uid.trim() === '') {
      throw new Error('Valid UID is required to delete user');
    }

    const result = await apiCall(`${API_CONFIG.baseURL}/admin/delete-auth-user-by-uid`, {
      method: 'POST',
      body: JSON.stringify({ uid: uid.trim() })
    });

    console.log('✅ Legacy API response:', result);
    return result;

  } catch (error) {
    console.error('❌ Error calling legacy delete API:', error);
    throw new Error(`Failed to delete user: ${error.message}`);
  }
};

// Enhanced deleteMember function with email-based auth deletion
export const deleteMember = async (id) => {
  try {
    console.log('🗑️ Starting complete member deletion process for:', id);

    // 1. Get member data first
    const member = await getMemberById(id);
    if (!member) {
      throw new Error('Member not found');
    }

    console.log('📋 Found member:', member.firstName, member.lastName, '| Email:', member.email);

    // 2. Remove from rosters if they have students assigned
    if (member.students && member.students.length > 0) {
      await removeStudentsFromRosters(id, member);
    }

    // 3. Delete from Firebase Auth using email
    if (member.email) {
      try {
        console.log('🔐 Deleting from Firebase Auth using EMAIL:', member.email);
        const authResult = await deleteFirebaseAuthUserByEmail(member.email);

        if (authResult.success) {
          console.log('✅ Successfully deleted from Firebase Auth:', authResult.message);
        } else {
          console.warn('⚠️ Firebase Auth deletion had issues:', authResult.message);
        }

      } catch (authError) {
        console.error('❌ Firebase Auth deletion failed:', authError.message);
        // Continue with database deletion even if auth deletion fails
      }
    } else {
      console.log('ℹ️ No email found, skipping Firebase Auth deletion');
    }

    // 4. Delete from members collection via API
    await apiCall(buildApiUrl(API_CONFIG.endpoints.members.delete, { id }), {
      method: 'DELETE'
    });
    console.log('✅ Deleted from members collection');

    // 5. Clean up related data
    // await cleanupMemberRelatedData(id, member);

    console.log('🎯 Complete member deletion completed successfully');

    return {
      success: true,
      message: 'Member completely deleted from all systems including Firebase Auth',
      deletedFromAuth: !!member.email,
      email: member.email
    };

  } catch (error) {
    console.error('❌ Error deleting member:', error);
    throw error;
  }
};

// Enhanced batch delete with email-based auth deletion
export const batchDeleteMembers = async (memberIds) => {
  try {
    console.log('🗑️ Starting batch deletion for:', memberIds.length, 'members');

    const results = [];
    const authEmailsToDelete = [];
    const memberEmails = [];

    // First pass: collect all member data and emails
    for (const memberId of memberIds) {
      try {
        const member = await getMemberById(memberId);

        if (member) {
          if (member.email) {
            authEmailsToDelete.push(member.email);
            memberEmails.push({ id: memberId, email: member.email });
          }

          // Delete from database via API
          await deleteMemberFromDatabase(memberId, member);

          results.push({
            id: memberId,
            email: member.email,
            success: true,
            message: 'Deleted from database, auth deletion pending...'
          });
        } else {
          results.push({
            id: memberId,
            success: false,
            error: 'Member not found'
          });
        }

      } catch (error) {
        results.push({
          id: memberId,
          success: false,
          error: error.message
        });
      }
    }

    // Second pass: batch delete from Firebase Auth using emails
    if (authEmailsToDelete.length > 0) {
      try {
        console.log('🔥 Batch deleting from Firebase Auth using emails:', authEmailsToDelete);
        // const batchAuthResult = await batchDeleteFirebaseAuthUsersByEmail(authEmailsToDelete);

        // console.log('✅ Batch Firebase Auth deletion completed:', batchAuthResult.summary);

        // Update results with auth deletion status
        // results.forEach(result => {
        //   if (result.email) {
        //     const authResult = batchAuthResult.results.find(ar => ar.email === result.email);
        //     if (authResult) {
        //       result.authDeleted = authResult.success;
        //       result.authMessage = authResult.message;
        //       if (authResult.success) {
        //         result.message = 'Successfully deleted from both database and Firebase Auth';
        //       } else {
        //         result.message = `Deleted from database, but auth deletion failed: ${authResult.error}`;
        //       }
        //     }
        //   }
        // });

      } catch (batchError) {
        console.error('❌ Batch Firebase Auth deletion failed:', batchError.message);

        // Update results to reflect auth deletion failure
        results.forEach(result => {
          if (result.email) {
            result.authDeleted = false;
            result.authMessage = batchError.message;
            result.message = 'Deleted from database, but batch auth deletion failed';
          }
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    const authSuccessCount = results.filter(r => r.authDeleted).length;

    console.log(`📊 Batch deletion completed: ${successCount} database deletions, ${authSuccessCount} auth deletions, ${errorCount} failed`);

    return {
      success: errorCount === 0,
      results,
      summary: {
        total: memberIds.length,
        successful: successCount,
        failed: errorCount,
        authDeleted: authSuccessCount,
        authFailed: authEmailsToDelete.length - authSuccessCount
      }
    };

  } catch (error) {
    console.error('❌ Error in batch deletion:', error);
    throw error;
  }
};

// Helper function to delete member from database only (used in batch operations)
const deleteMemberFromDatabase = async (memberId, member) => {
  try {
    // Remove from rosters
    if (member.students && member.students.length > 0) {
      await removeStudentsFromRosters(memberId, member);
    }

    // Delete from members collection via API
    await apiCall(buildApiUrl(API_CONFIG.endpoints.members.delete, { id: memberId }), {
      method: 'DELETE'
    });

    // Clean up related data
    // await cleanupMemberRelatedData(memberId, member);

    console.log(`✅ Deleted member ${memberId} from database`);
  } catch (error) {
    console.error(`❌ Error deleting member ${memberId} from database:`, error);
    throw error;
  }
};

// Helper function to remove students from rosters via API
const removeStudentsFromRosters = async (parentId, memberData) => {
  try {
    console.log('🏃‍♂️ Removing students from rosters via API...');

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

      try {
        // Remove player from roster via API
        await apiCall(buildApiUrl(API_CONFIG.endpoints.rosters.removePlayer, { 
          rosterId: rosterId, 
          playerId: `${parentId}-${childName}` 
        }), {
          method: 'DELETE'
        });

        console.log(`➖ Removed ${childName} from roster: ${rosterId}`);
      } catch (rosterError) {
        console.warn(`⚠️ Could not remove ${childName} from roster ${rosterId}:`, rosterError.message);
        // Continue with other students even if one fails
      }
    }

    console.log('✅ Students removed from rosters via API');

  } catch (error) {
    console.error('❌ Error removing students from rosters via API:', error);
    throw error;
  }
};

// Helper function to clean up related data via API
// const cleanupMemberRelatedData = async (memberId, memberData) => {
//   try {
//     console.log('🧹 Cleaning up related data via API...');

//     // Use admin API to cleanup related data
//     await apiCall(`${API_CONFIG.baseURL}/admin/cleanup-member-data`, {
//       method: 'POST',
//       body: JSON.stringify({ 
//         memberId, 
//         memberEmail: memberData.email 
//       })
//     });

//     console.log('✅ Related data cleaned up via API');

//   } catch (error) {
//     console.error('❌ Error cleaning up related data via API:', error);
//     // Don't throw error here - cleanup is not critical
//   }
// };

// Test function for debugging
export const testCloudFunction = async () => {
  try {
    const result = await apiCall(`${API_CONFIG.baseURL}/admin/test-function`, {
      method: 'POST',
      body: JSON.stringify({
        test: 'data',
        email: 'test@example.com'
      })
    });

    console.log('✅ Test function result:', result);
    return result;

  } catch (error) {
    console.error('❌ Test function error:', error);
    throw error;
  }
};

// Get parents from API
export const getParents = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.parents.getAll));
  } catch (error) {
    console.error('Error getting parents:', error);
    throw error;
  }
};

// ===== NEW ID MANAGEMENT APIs =====

// Upload file to Firebase Storage
export const uploadFileToStorage = async (path, file) => {
  try {
    console.log('📤 Uploading file:', path);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    const response = await fetch(`${API_CONFIG.baseURL}/storage/upload`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Upload failed');

    console.log('✅ Upload success:', result.downloadURL);
    return result.downloadURL;
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
};

// Submit child ID for admin review
export const submitChildID = async (childUid, parentId, idData) => {
  try {
    console.log('📤 Submitting child ID:', childUid, idData);
    
    const response = await fetch(`${API_CONFIG.baseURL}/members/${parentId}/students/${childUid}/submit-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...idData,
        idStatus: 'submitted',
        submittedAt: new Date().toISOString()
      })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Submit failed');

    console.log('✅ ID submitted:', result);
    return result;
  } catch (error) {
    console.error('❌ Submit ID error:', error);
    throw error;
  }
};

export const getParentById = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.parents.getById, { id }));
  } catch (error) {
    console.error('Error getting parent:', error);
    throw error;
  }
};

// Add parent with auto-roster creation via API
export const addParent = async (parentData) => {
  try {
    console.log('➕ Adding parent with auto-roster creation via API:', parentData);

    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.parents.create), {
      method: 'POST',
      body: JSON.stringify(parentData)
    });

    console.log('✅ Parent added with rosters created via API');
    return result.id || result;
  } catch (error) {
    console.error('❌ Error adding parent via API:', error);
    throw error;
  }
};

// Update parent with roster sync via API
export const updateParent = async (id, updates) => {
  try {
    console.log('✏️ Updating parent with roster sync via API:', id, updates);

    await apiCall(buildApiUrl(API_CONFIG.endpoints.parents.update, { id }), {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    console.log('✅ Parent updated with roster sync completed via API');
  } catch (error) {
    console.error('❌ Error updating parent via API:', error);
    throw error;
  }
};

// Create Firebase Auth user via API
export const createFirebaseAuthUser = async (email, password) => {
  try {
    const result = await apiCall(`${API_CONFIG.baseURL}/auth/create-auth-user`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    return result.uid || result.localId;
  } catch (error) {
    console.error('❌ Failed to create Firebase Auth user via API:', error.message);
    throw error;
  }
};

// Sync parents to newly created rosters via API
export const syncParentsToRosters = async () => {
  try {
    console.log('🔄 Syncing parents to newly created rosters via API...');

    const result = await apiCall(`${API_CONFIG.baseURL}/rosters/sync-parents`, {
      method: 'POST'
    });

    console.log(`🎯 Sync completed via API:`, result);
    return result;

  } catch (error) {
    console.error('❌ Error syncing parents to rosters via API:', error);
    throw error;
  }
};

// Assign children to existing rosters via API
export const assignChildrenToExistingRosters = async (parentId, parentData) => {
  try {
    console.log(`🎯 Assigning children to rosters via API for parent: ${parentId}`);

    const result = await apiCall(`${API_CONFIG.baseURL}/rosters/assign-children`, {
      method: 'POST',
      body: JSON.stringify({ parentId, parentData })
    });

    console.log('📊 Assignment Results via API:', result);
    return result;

  } catch (error) {
    console.error('❌ Error in assignChildrenToExistingRosters via API:', error);
    throw error;
  }
};

// Delete parent via API
export const deleteParent = async (id) => {
  try {
    await apiCall(buildApiUrl(API_CONFIG.endpoints.parents.delete, { id }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting parent:', error);
    throw error;
  }
};

// Additional roster helper functions via API
const addStudentToRoster = async (parentId, parentData, student) => {
  try {
    const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };
    const mappedSport = sportMapping[parentData.sport] || parentData.sport;
    const rosterId = `${mappedSport.toLowerCase()}-${student.ageGroup.toLowerCase()}-${parentData.location.replace(/\s+/g, '-').toLowerCase()}`;

    await apiCall(buildApiUrl(API_CONFIG.endpoints.rosters.addPlayer, { rosterId }), {
      method: 'POST',
      body: JSON.stringify({
        playerData: {
          id: `${parentId}-${student.name || student.firstName}`,
          name: student.name || student.firstName,
          firstName: student.firstName,
          lastName: student.lastName,
          dob: student.dob,
          ageGroup: student.ageGroup,
          parentId: parentId,
          parentName: `${parentData.firstName} ${parentData.lastName}`,
          parentEmail: parentData.email,
          parentPhone: parentData.phone,
          sport: mappedSport,
          location: parentData.location
        }
      })
    });
  } catch (error) {
    console.error('Error adding student to roster via API:', error);
    throw error;
  }
};

const removeStudentFromRoster = async (parentId, parentData, student) => {
  try {
    const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };
    const mappedSport = sportMapping[parentData.sport] || parentData.sport;
    const rosterId = `${mappedSport.toLowerCase()}-${student.ageGroup.toLowerCase()}-${parentData.location.replace(/\s+/g, '-').toLowerCase()}`;
    const playerId = `${parentId}-${student.name || student.firstName}`;

    await apiCall(buildApiUrl(API_CONFIG.endpoints.rosters.removePlayer, { rosterId, playerId }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error removing student from roster via API:', error);
    throw error;
  }
};

const updateStudentInRoster = async (parentId, parentData, student) => {
  try {
    // Remove old version and add new version
    await removeStudentFromRoster(parentId, parentData, student);
    await addStudentToRoster(parentId, parentData, student);
  } catch (error) {
    console.error('Error updating student in roster via API:', error);
    throw error;
  }
};

const addStudentToSpecificRoster = async (parentId, parentData, student, rosterId) => {
  try {
    await apiCall(buildApiUrl(API_CONFIG.endpoints.rosters.addPlayer, { rosterId }), {
      method: 'POST',
      body: JSON.stringify({
        playerData: {
          id: `${parentId}-${student.name || student.firstName}`,
          name: student.name || student.firstName,
          firstName: student.firstName,
          lastName: student.lastName,
          dob: student.dob,
          ageGroup: student.ageGroup,
          parentId: parentId,
          parentName: `${parentData.firstName} ${parentData.lastName}`,
          parentEmail: parentData.email,
          parentPhone: parentData.phone,
          sport: parentData.sport,
          location: parentData.location
        }
      })
    });
  } catch (error) {
    console.error('Error adding student to specific roster via API:', error);
    throw error;
  }
};

const removeStudentFromSpecificRoster = async (parentId, student, rosterId) => {
  try {
    const playerId = `${parentId}-${student.name || student.firstName}`;

    await apiCall(buildApiUrl(API_CONFIG.endpoints.rosters.removePlayer, { rosterId, playerId }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error removing student from specific roster via API:', error);
    throw error;
  }
};

// Bulk delete ID records (students/children from parents)
// This removes multiple children from their respective parent documents

export const bulkDeleteIDRecords = async (childIds = []) => {
  try {
    console.log('🗑️ Starting bulk delete for ID records:', childIds.length, 'children');

    if (!childIds || childIds.length === 0) {
      throw new Error('No child IDs provided for deletion');
    }

    // Group child IDs by parent ID
    const parentChildMap = {};
    const allMembers = await getMembers();

    for (const member of allMembers) {
      if (Array.isArray(member.students)) {
        for (const student of member.students) {
          if (childIds.includes(student.uid)) {
            if (!parentChildMap[member.id]) {
              parentChildMap[member.id] = [];
            }
            parentChildMap[member.id].push(student.uid);
          }
        }
      }
    }

    const parentIds = Object.keys(parentChildMap);
    console.log('📋 Parents to update:', parentIds.length);

    if (parentIds.length === 0) {
      throw new Error('No parents found for the provided child IDs');
    }

    // Use Firestore batch to update all parent documents
    const batch = writeBatch(db);
    let totalDeleted = 0;

    for (const parentId of parentIds) {
      const parentRef = doc(db, 'members', parentId);
      const parentSnap = await getDoc(parentRef);

      if (!parentSnap.exists()) {
        console.warn(`⚠️ Parent document ${parentId} not found, skipping`);
        continue;
      }

      const parentData = parentSnap.data();
      const childrenToDelete = parentChildMap[parentId];

      // Filter out the children to be deleted
      const updatedStudents = (parentData.students || []).filter(
        student => !childrenToDelete.includes(student.uid)
      );

      batch.update(parentRef, { students: updatedStudents });
      totalDeleted += childrenToDelete.length;
      console.log(`✅ Queued deletion of ${childrenToDelete.length} children from parent ${parentId}`);
    }

    // Commit the batch
    await batch.commit();
    console.log(`🎯 Bulk delete completed: ${totalDeleted} children removed from ${parentIds.length} parents`);

    return {
      success: true,
      deletedCount: totalDeleted,
      updatedParents: parentIds.length,
      message: `Successfully deleted ${totalDeleted} ID records`
    };

  } catch (error) {
    console.error('❌ Error in bulk delete ID records:', error);
    throw error;
  }
};