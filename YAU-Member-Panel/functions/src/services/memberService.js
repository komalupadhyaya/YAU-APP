const { db } = require("../utils/firebase");
const {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} = require("firebase/firestore");
const { getFunctions, httpsCallable } = require("firebase/functions");
const RosterService = require("./rosterService");
const admin = require("firebase-admin");

class MemberService {
static async getMembers() {
  try {
    let allUsers = [];

    // Get from members collection
    try {
      const membersSnapshot = await getDocs(
        query(collection(db, "members"), orderBy("createdAt", "desc"))
      );
      const membersData = membersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        collection: 'members',
        // isPaidMember: true,
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
      }));
      allUsers = [...allUsers, ...membersData];
    } catch (error) {
      console.warn('Error fetching members:', error);
    }

    // Get from registrations collection  
    try {
      const registrationsSnapshot = await getDocs(
        query(collection(db, "registrations"), orderBy("createdAt", "desc"))
      );
      const registrationsData = registrationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        collection: 'registrations',
        isPaidMember: false,
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
      }));
      allUsers = [...allUsers, ...registrationsData];
    } catch (error) {
      console.warn('Error fetching registrations:', error);
    }

    // Sort by creation date
    allUsers.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || 0);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    return allUsers;
  } catch (error) {
    console.error('Error in getMembers:', error);
    throw error;
  }
}



  static async updateMember(id, updates) {
    try {
      const currentMemberData = await this.getMemberById(id);
      if (!currentMemberData) {
        throw new Error("Member not found");
      }
      const docRef = doc(db, "members", id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      await this.syncRosterChangesForMember(id, currentMemberData, updates);
      return { success: true, message: "Member updated successfully with roster sync" };
    } catch (error) {
      console.error("Error updating member:", error);
      throw error;
    }
  }

  static async syncRosterChangesForMember(parentId, oldMemberData, newMemberData) {
    try {
      const batch = writeBatch(db);
      const sportMapping = { "Flag Football": "Football", "Tackle Football": "Football" };
      const oldStudents = oldMemberData.students || [];
      const newStudents = newMemberData.students || [];
      const oldSport = sportMapping[oldMemberData.sport] || oldMemberData.sport;
      const newSport = sportMapping[newMemberData.sport] || newMemberData.sport;
      const oldLocation = oldMemberData.location;
      const newLocation = newMemberData.location;

      const changesDetected = {
        sportChanged: oldSport !== newSport,
        locationChanged: oldLocation !== newLocation,
        studentsAdded: [],
        studentsRemoved: [],
        studentsModified: [],
      };

      const oldStudentIds = oldStudents.map(s => s.name || `${s.firstName} ${s.lastName}`);
      const newStudentIds = newStudents.map(s => s.name || `${s.firstName} ${s.lastName}`);

      changesDetected.studentsAdded = newStudents.filter(newStudent => {
        const newStudentId = newStudent.name || `${newStudent.firstName} ${newStudent.lastName}`;
        return !oldStudentIds.includes(newStudentId);
      });

      changesDetected.studentsRemoved = oldStudents.filter(oldStudent => {
        const oldStudentId = oldStudent.name || `${oldStudent.firstName} ${oldStudent.lastName}`;
        return !newStudentIds.includes(oldStudentId);
      });

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

      if (changesDetected.sportChanged || changesDetected.locationChanged) {
        await this.handleMemberSportLocationChange(parentId, oldMemberData, newMemberData, batch);
      }

      for (const addedStudent of changesDetected.studentsAdded) {
        await this.addStudentToRoster(parentId, newMemberData, addedStudent, batch);
      }

      for (const removedStudent of changesDetected.studentsRemoved) {
        await this.removeStudentFromRoster(parentId, oldMemberData, removedStudent, batch);
      }

      for (const modifiedStudent of changesDetected.studentsModified) {
        await this.updateStudentInRoster(parentId, newMemberData, modifiedStudent, batch);
      }

      await batch.commit();
    } catch (error) {
      console.error("Error syncing roster changes:", error);
      throw error;
    }
  }

  static async handleMemberSportLocationChange(parentId, oldMemberData, newMemberData, batch) {
    const sportMapping = { "Flag Football": "Football", "Tackle Football": "Football" };
    const oldSport = sportMapping[oldMemberData.sport] || oldMemberData.sport;
    const newSport = sportMapping[newMemberData.sport] || newMemberData.sport;

    for (const student of oldMemberData.students || []) {
      const oldRosterId = `${oldSport.toLowerCase()}-${student.ageGroup.toLowerCase()}-${oldMemberData.location.replace(/\s+/g, "-").toLowerCase()}`;
      await this.removeStudentFromSpecificRoster(parentId, student, oldRosterId, batch);
    }

    for (const student of newMemberData.students || []) {
      const newRosterId = `${newSport.toLowerCase()}-${student.ageGroup.toLowerCase()}-${newMemberData.location.replace(/\s+/g, "-").toLowerCase()}`;
      await this.addStudentToSpecificRoster(parentId, newMemberData, student, newRosterId, batch);
    }
  }

static async getMemberById(id) {
  try {
    // Check members collection first
    let docRef = doc(db, "members", id);
    let docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate ? docSnap.data().createdAt.toDate() : docSnap.data().createdAt,
        collection: 'members',
      };
    }

    // Check registrations collection if not found in members
    docRef = doc(db, "registrations", id);
    docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate ? docSnap.data().createdAt.toDate() : docSnap.data().createdAt,
        collection: 'registrations',
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting member:", error);
    throw error;
  }
}

    static async deleteMember(uid) {
    try {
      // ✅ Delete from Firebase Auth first
      try {
        await admin.auth().deleteUser(uid);
        console.log(`✅ Deleted from Firebase Auth: ${uid}`);
      } catch (authError) {
        console.warn(`⚠️ Could not delete user from Auth (${uid}):`, authError.message);
      }

      // ✅ Delete the Firestore document from "members"
      const memberRef = doc(db, "members", uid);
      await deleteDoc(memberRef);
      console.log(`✅ Deleted Firestore member document: ${uid}`);

      return {
        success: true,
        message: "User deleted from Firebase Auth and Firestore",
        uid,
      };
    } catch (error) {
      console.error("❌ Error deleting member:", error);
      throw new Error(error.message);
    }
  }

  static async batchDeleteMembers(memberIds) {
    try {
      const results = [];
      const authEmailsToDelete = [];
      const memberEmails = [];

      for (const memberId of memberIds) {
        try {
          const member = await this.getMemberById(memberId);
          if (member) {
            if (member.email) {
              authEmailsToDelete.push(member.email);
              memberEmails.push({ id: memberId, email: member.email });
            }
            await this.deleteMemberFromDatabase(memberId, member);
            results.push({
              id: memberId,
              email: member.email,
              success: true,
              message: "Deleted from database, auth deletion pending...",
            });
          } else {
            results.push({
              id: memberId,
              success: false,
              error: "Member not found",
            });
          }
        } catch (error) {
          results.push({
            id: memberId,
            success: false,
            error: error.message,
          });
        }
      }

      if (authEmailsToDelete.length > 0) {
        try {
          const functions = getFunctions();
          const batchDeleteFunction = httpsCallable(functions, "batchDeleteUsersByEmail");
          const batchAuthResult = await batchDeleteFunction({ emails: authEmailsToDelete });
          results.forEach(result => {
            if (result.email) {
              const authResult = batchAuthResult.data.results.find(ar => ar.email === result.email);
              if (authResult) {
                result.authDeleted = authResult.success;
                result.authMessage = authResult.message;
                result.message = authResult.success
                  ? "Successfully deleted from both database and Firebase Auth"
                  : `Deleted from database, but auth deletion failed: ${authResult.error}`;
              }
            }
          });
        } catch (batchError) {
          console.error("Batch Firebase Auth deletion failed:", batchError);
          results.forEach(result => {
            if (result.email) {
              result.authDeleted = false;
              result.authMessage = batchError.message;
              result.message = "Deleted from database, but batch auth deletion failed";
            }
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      const authSuccessCount = results.filter(r => r.authDeleted).length;

      return {
        success: errorCount === 0,
        results,
        summary: {
          total: memberIds.length,
          successful: successCount,
          failed: errorCount,
          authDeleted: authSuccessCount,
          authFailed: authEmailsToDelete.length - authSuccessCount,
        },
      };
    } catch (error) {
      console.error("Error in batch deletion:", error);
      throw error;
    }
  }

  static async emailVerified(email) {
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      return userRecord
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async deleteMemberFromDatabase(memberId, member) {
    try {
      if (member.students && member.students.length > 0) {
        await this.removeStudentsFromRosters(memberId, member);
      }
      const memberRef = doc(db, "members", memberId);
      await deleteDoc(memberRef);
      await this.cleanupMemberRelatedData(memberId, member);
    } catch (error) {
      console.error(`Error deleting member ${memberId} from database:`, error);
      throw error;
    }
  }

  static async removeStudentsFromRosters(parentId, memberData) {
    try {
      const batch = writeBatch(db);
      const sportMapping = { "Flag Football": "Football", "Tackle Football": "Football" };
      const mappedSport = sportMapping[memberData.sport] || memberData.sport;

      for (const student of memberData.students || []) {
        if (!student.name && !student.firstName) continue;
        const childName = student.name || student.firstName;
        const childAgeGroup = student.ageGroup || RosterService.calculateAgeGroup(student.dob);
        if (!childAgeGroup || !mappedSport || !memberData.location) continue;

        const rosterId = `${mappedSport.toLowerCase().replace(/\s+/g, "-")}-${childAgeGroup.toLowerCase()}-${memberData.location.replace(/\s+/g, "-").toLowerCase()}`;
        const rosterRef = doc(db, "rosters", rosterId);
        const rosterSnap = await getDoc(rosterRef);

        if (rosterSnap.exists()) {
          const rosterData = rosterSnap.data();
          const studentId = `${parentId}-${childName}`;
          const updatedParticipants = (rosterData.participants || []).filter(p => p.id !== studentId);
          const newPlayerCount = updatedParticipants.length;

          if (newPlayerCount === 0 && !rosterData.hasAssignedCoach) {
            batch.delete(rosterRef);
          } else {
            let newStatus = "empty";
            if (newPlayerCount > 0 && rosterData.hasAssignedCoach) {
              newStatus = newPlayerCount >= 6 ? "active" : "forming";
            } else if (newPlayerCount > 0 && !rosterData.hasAssignedCoach) {
              newStatus = "needs-coach";
            } else if (newPlayerCount === 0 && rosterData.hasAssignedCoach) {
              newStatus = "needs-players";
            }
            batch.update(rosterRef, {
              participants: updatedParticipants,
              players: updatedParticipants,
              playerCount: newPlayerCount,
              hasPlayers: newPlayerCount > 0,
              status: newStatus,
              lastUpdated: serverTimestamp(),
            });
          }
        }
      }
      await batch.commit();
    } catch (error) {
      console.error("Error removing students from rosters:", error);
      throw error;
    }
  }

  static async cleanupMemberRelatedData(memberId, memberData) {
    try {
      const batch = writeBatch(db);
      const interestQuery = query(collection(db, "interest_records"), where("parentId", "==", memberId));
      const interestSnap = await getDocs(interestQuery);
      interestSnap.docs.forEach(docSnap => batch.delete(docSnap.ref));

      const paymentQuery = query(collection(db, "payments"), where("parentId", "==", memberId));
      const paymentSnap = await getDocs(paymentQuery);
      paymentSnap.docs.forEach(docSnap => batch.delete(docSnap.ref));

      const notificationQuery = query(collection(db, "notifications"), where("recipientId", "==", memberId));
      const notificationSnap = await getDocs(notificationQuery);
      notificationSnap.docs.forEach(docSnap => batch.delete(docSnap.ref));

      await batch.commit();
    } catch (error) {
      console.error("Error cleaning up related data:", error);
    }
  }
}

module.exports = MemberService;