const { db } = require("../utils/firebase");
const {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} = require("firebase/firestore");
const RosterService = require("./rosterService");
const { createFirebaseAuthUser } = require("./authService");

class ParentService {
  static async getParents() {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, "registrations"), orderBy("createdAt", "desc"))
      );
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
      }));
    } catch (error) {
      console.error("Error getting parents:", error);
      try {
        const querySnapshot = await getDocs(collection(db, "registrations"));
        return querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
        }));
      } catch (fallbackError) {
        console.error("Fallback error getting parents:", fallbackError);
        throw fallbackError;
      }
    }
  }

  static async getParentById(id) {
    try {
      const docRef = doc(db, "registrations", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate ? docSnap.data().createdAt.toDate() : docSnap.data().createdAt,
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting parent:", error);
      throw error;
    }
  }

  static async addParent(parentData) {
    try {
      const docRef = await addDoc(collection(db, "registrations"), {
        ...parentData,
        createdAt: serverTimestamp(),
      });
      await this.createRostersForParent(docRef.id, parentData);
      if (parentData.email && parentData.password) {
        try {
          await createFirebaseAuthUser(parentData.email, parentData.password);
          
        } catch (authError) {
          console.error("Error creating Firebase Auth user:", authError);
        }
      }
      return docRef.id;
    } catch (error) {
      console.error("Error adding parent:", error);
      throw error;
    }
  }

  static async updateParent(id, updates) {
    try {
      const currentParentData = await this.getParentById(id);
      if (!currentParentData) {
        throw new Error("Parent not found");
      }
      const docRef = doc(db, "registrations", id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      await this.syncRosterChangesForParent(id, currentParentData, updates);
    } catch (error) {
      console.error("Error updating parent:", error);
      throw error;
    }
  }

  static async deleteParent(id) {
    try {
      await deleteDoc(doc(db, "registrations", id));
    } catch (error) {
      console.error("Error deleting parent:", error);
      throw error;
    }
  }

  static async createRostersForParent(parentId, parentData) {
    try {
      const batch = writeBatch(db);
      const sportMapping = { "Flag Football": "Football", "Tackle Football": "Football" };
      for (const student of parentData.students || []) {
        if (!student.name && !student.firstName) continue;
        const childName = student.name || student.firstName;
        const childAgeGroup = student.ageGroup || RosterService.calculateAgeGroup(student.dob);
        const mappedSport = sportMapping[parentData.sport] || parentData.sport;
        if (!childAgeGroup || !mappedSport || !parentData.location) continue;

        const rosterId = `${mappedSport.toLowerCase().replace(/\s+/g, "-")}-${childAgeGroup.toLowerCase()}-${parentData.location.replace(/\s+/g, "-").toLowerCase()}`;
        const rosterRef = doc(db, "rosters", rosterId);
        const rosterSnap = await getDoc(rosterRef);

        const participantData = {
          id: `${parentId}-${childName}`,
          name: childName,
          firstName: student.firstName || childName.split(" ")[0] || "",
          lastName: student.lastName || childName.split(" ")[1] || "",
          dob: student.dob,
          ageGroup: childAgeGroup,
          grade: student.grade || "",
          school_name: student.school_name || "",
          parentId: parentId,
          parentName: `${parentData.firstName} ${parentData.lastName}`,
          parentEmail: parentData.email,
          parentPhone: parentData.phone,
          sport: mappedSport,
          location: parentData.location,
          registeredAt: new Date().toISOString(),
          status: "active",
        };

        if (!rosterSnap.exists()) {
          const newRoster = {
            id: rosterId,
            teamName: `${childAgeGroup} ${mappedSport} - ${parentData.location}`,
            sport: mappedSport,
            ageGroup: childAgeGroup,
            location: parentData.location,
            coachId: null,
            coachName: "Unassigned",
            hasAssignedCoach: false,
            participants: [participantData],
            players: [participantData],
            playerCount: 1,
            hasPlayers: true,
            isEmpty: false,
            status: "needs-coach",
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            maxPlayers: 20,
            minPlayers: 6,
          };
          batch.set(rosterRef, newRoster);
        } else {
          const existingRoster = rosterSnap.data();
          const existingParticipants = existingRoster.participants || [];
          const filteredParticipants = existingParticipants.filter(p => p.id !== participantData.id);
          const updatedParticipants = [...filteredParticipants, participantData];
          const newPlayerCount = updatedParticipants.length;
          let newStatus = "empty";
          if (newPlayerCount > 0 && existingRoster.hasAssignedCoach) {
            newStatus = newPlayerCount >= 6 ? "active" : "forming";
          } else if (newPlayerCount > 0 && !existingRoster.hasAssignedCoach) {
            newStatus = "needs-coach";
          } else if (newPlayerCount === 0 && existingRoster.hasAssignedCoach) {
            newStatus = "needs-players";
          }
          batch.update(rosterRef, {
            participants: updatedParticipants,
            players: updatedParticipants,
            playerCount: newPlayerCount,
            hasPlayers: newPlayerCount > 0,
            isEmpty: newPlayerCount === 0,
            status: newStatus,
            lastUpdated: serverTimestamp(),
            teamName: `${childAgeGroup} ${mappedSport} - ${parentData.location}`,
          });
        }
      }
      await batch.commit();
      return { success: true, message: "Rosters successfully created/updated" };
    } catch (error) {
      console.error("Error in createRostersForParent:", error);
      throw error;
    }
  }

  static async syncRosterChangesForParent(parentId, oldParentData, newParentData) {
    try {
      const batch = writeBatch(db);
      const sportMapping = { "Flag Football": "Football", "Tackle Football": "Football" };
      const oldStudents = oldParentData.students || [];
      const newStudents = newParentData.students || [];
      const oldSport = sportMapping[oldParentData.sport] || oldParentData.sport;
      const newSport = sportMapping[newParentData.sport] || newParentData.sport;
      const oldLocation = oldParentData.location;
      const newLocation = newParentData.location;

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
        await this.handleParentSportLocationChange(parentId, oldParentData, newParentData, batch);
      }

      for (const addedStudent of changesDetected.studentsAdded) {
        await this.addStudentToRoster(parentId, newParentData, addedStudent, batch);
      }

      for (const removedStudent of changesDetected.studentsRemoved) {
        await this.removeStudentFromRoster(parentId, oldParentData, removedStudent, batch);
      }

      for (const modifiedStudent of changesDetected.studentsModified) {
        await this.updateStudentInRoster(parentId, newParentData, modifiedStudent, batch);
      }

      await batch.commit();
    } catch (error) {
      console.error("Error syncing roster changes:", error);
      throw error;
    }
  }

  static async handleParentSportLocationChange(parentId, oldParentData, newParentData, batch) {
    const sportMapping = { "Flag Football": "Football", "Tackle Football": "Football" };
    const oldSport = sportMapping[oldParentData.sport] || oldParentData.sport;
    const newSport = sportMapping[newParentData.sport] || newParentData.sport;

    for (const student of oldParentData.students || []) {
      const oldRosterId = `${oldSport.toLowerCase()}-${student.ageGroup.toLowerCase()}-${oldParentData.location.replace(/\s+/g, "-").toLowerCase()}`;
      await this.removeStudentFromSpecificRoster(parentId, student, oldRosterId, batch);
    }

    for (const student of newParentData.students || []) {
      const newRosterId = `${newSport.toLowerCase()}-${student.ageGroup.toLowerCase()}-${newParentData.location.replace(/\s+/g, "-").toLowerCase()}`;
      await this.addStudentToSpecificRoster(parentId, newParentData, student, newRosterId, batch);
    }
  }

  static async addStudentToRoster(parentId, parentData, student, batch) {
    const sportMapping = { "Flag Football": "Football", "Tackle Football": "Football" };
    const mappedSport = sportMapping[parentData.sport] || parentData.sport;
    const rosterId = `${mappedSport.toLowerCase()}-${student.ageGroup.toLowerCase()}-${parentData.location.replace(/\s+/g, "-").toLowerCase()}`;
    await this.addStudentToSpecificRoster(parentId, parentData, student, rosterId, batch);
  }

  static async removeStudentFromRoster(parentId, parentData, student, batch) {
    const sportMapping = { "Flag Football": "Football", "Tackle Football": "Football" };
    const mappedSport = sportMapping[parentData.sport] || parentData.sport;
    const rosterId = `${mappedSport.toLowerCase()}-${student.ageGroup.toLowerCase()}-${parentData.location.replace(/\s+/g, "-").toLowerCase()}`;
    await this.removeStudentFromSpecificRoster(parentId, student, rosterId, batch);
  }

  static async updateStudentInRoster(parentId, parentData, student, batch) {
    await this.removeStudentFromRoster(parentId, parentData, student, batch);
    await this.addStudentToRoster(parentId, parentData, student, batch);
  }

  static async addStudentToSpecificRoster(parentId, parentData, student, rosterId, batch) {
    const rosterRef = doc(db, "rosters", rosterId);
    const rosterSnap = await getDoc(rosterRef);
    const newParticipant = {
      id: `${parentId}-${student.name || `${student.firstName} ${student.lastName}`}`,
      name: student.name || `${student.firstName} ${student.lastName}`,
      firstName: student.firstName || student.name?.split(" ")[0],
      lastName: student.lastName || student.name?.split(" ")[1] || "",
      dob: student.dob,
      ageGroup: student.ageGroup,
      parentId: parentId,
      parentName: `${parentData.firstName} ${parentData.lastName}`,
      parentEmail: parentData.email,
      parentPhone: parentData.phone,
      sport: parentData.sport,
      location: parentData.location,
      registeredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (rosterSnap.exists()) {
      const existingRoster = rosterSnap.data();
      const updatedParticipants = [...(existingRoster.participants || []), newParticipant];
      batch.update(rosterRef, {
        participants: updatedParticipants,
        players: updatedParticipants,
        playerCount: updatedParticipants.length,
        hasPlayers: true,
        status: existingRoster.hasAssignedCoach ? "active" : "needs-coach",
        lastUpdated: serverTimestamp(),
      });
    } else {
      const newRoster = {
        id: rosterId,
        teamName: `${student.ageGroup} ${parentData.sport} - ${parentData.location}`,
        sport: parentData.sport,
        ageGroup: student.ageGroup,
        location: parentData.location,
        coachId: null,
        coachName: "Unassigned",
        hasAssignedCoach: false,
        participants: [newParticipant],
        playerCount: 1,
        hasPlayers: true,
        status: "needs-coach",
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      };
      batch.set(rosterRef, newRoster);
    }
  }

  static async removeStudentFromSpecificRoster(parentId, student, rosterId, batch) {
    const rosterRef = doc(db, "rosters", rosterId);
    const rosterSnap = await getDoc(rosterRef);
    if (rosterSnap.exists()) {
      const existingRoster = rosterSnap.data();
      const studentId = `${parentId}-${student.name || `${student.firstName} ${student.lastName}`}`;
      const updatedParticipants = (existingRoster.participants || []).filter(p => p.id !== studentId);
      const updatedPlayerCount = updatedParticipants.length;

      if (updatedPlayerCount === 0 && !existingRoster.hasAssignedCoach) {
        batch.delete(rosterRef);
      } else {
        let newStatus = "empty";
        if (updatedPlayerCount > 0 && existingRoster.hasAssignedCoach) {
          newStatus = "active";
        } else if (updatedPlayerCount > 0 && !existingRoster.hasAssignedCoach) {
          newStatus = "needs-coach";
        } else if (updatedPlayerCount === 0 && existingRoster.hasAssignedCoach) {
          newStatus = "needs-players";
        }
        batch.update(rosterRef, {
          participants: updatedParticipants,
          players: updatedParticipants,
          playerCount: updatedPlayerCount,
          hasPlayers: updatedPlayerCount > 0,
          status: newStatus,
          lastUpdated: serverTimestamp(),
        });
      }
    }
  }

  static async assignChildrenToExistingRosters(parentId, parentData) {
    try {
      const assignmentResults = [];
      const sportMapping = { "Flag Football": "Football", "Tackle Football": "Football" };
      const mappedSport = sportMapping[parentData.sport] || parentData.sport;

      for (const student of parentData.children || parentData.students || []) {
        const childName = student.name || student.firstName || "";
        if (!childName) {
          assignmentResults.push({
            student: childName,
            status: "error",
            message: "Missing required information (child name)",
          });
          continue;
        }
        const childAgeGroup = student.ageGroup || RosterService.calculateAgeGroup(student.dob);
        if (!childAgeGroup || !mappedSport || !parentData.location) {
          assignmentResults.push({
            student: childName,
            status: "error",
            message: "Missing required information (age group, sport, or location)",
          });
          continue;
        }
        const rosterId = `${mappedSport.toLowerCase().replace(/\s+/g, "-")}-${childAgeGroup.toLowerCase()}-${parentData.location.replace(/\s+/g, "-").toLowerCase()}`;
        const rosterRef = doc(db, "rosters", rosterId);
        const rosterSnap = await getDoc(rosterRef);

        if (rosterSnap.exists()) {
          const rosterData = rosterSnap.data();
          await this.addPlayerToMatchingRoster(parentId, parentData, student, rosterRef, rosterData);
          assignmentResults.push({
            student: childName,
            roster: rosterId,
            status: rosterData.hasAssignedCoach ? "assigned" : "waiting",
            message: rosterData.hasAssignedCoach
              ? `Assigned to ${rosterData.teamName} (Coach: ${rosterData.coachName})`
              : "Added to team, waiting for coach assignment",
          });
        } else {
          await this.createNewRosterForChild(parentId, parentData, student, rosterId, mappedSport, childAgeGroup);
          await this.createInterestRecord(parentId, parentData, student, rosterId);
          assignmentResults.push({
            student: childName,
            roster: rosterId,
            status: "new_team",
            message: "Created new team - needs coach assignment",
          });
        }
      }
      return assignmentResults;
    } catch (error) {
      console.error("Error in assignChildrenToExistingRosters:", error);
      throw error;
    }
  }

  static async addPlayerToMatchingRoster(parentId, parentData, student, rosterRef, rosterData) {
    const childName = student.name || student.firstName || "";
    const participantData = {
      id: `${parentId}-${childName}`,
      name: childName,
      firstName: student.firstName || childName.split(" ")[0] || "",
      lastName: student.lastName || childName.split(" ")[1] || "",
      dob: student.dob,
      ageGroup: student.ageGroup || RosterService.calculateAgeGroup(student.dob),
      grade: student.grade || "",
      school_name: student.school_name || "",
      parentId: parentId,
      parentName: `${parentData.firstName} ${parentData.lastName}`,
      parentEmail: parentData.email,
      parentPhone: parentData.phone,
      sport: rosterData.sport,
      location: parentData.location,
      registeredAt: new Date().toISOString(),
    };
    const existingParticipants = rosterData.participants || [];
    const filteredParticipants = existingParticipants.filter(p => p.id !== participantData.id);
    const updatedParticipants = [...filteredParticipants, participantData];
    const newPlayerCount = updatedParticipants.length;
    let newStatus = "empty";
    if (newPlayerCount > 0 && rosterData.hasAssignedCoach) {
      newStatus = newPlayerCount >= 6 ? "active" : "forming";
    } else if (newPlayerCount > 0 && !rosterData.hasAssignedCoach) {
      newStatus = "needs-coach";
    } else if (newPlayerCount === 0 && rosterData.hasAssignedCoach) {
      newStatus = "needs-players";
    }
    await updateDoc(rosterRef, {
      participants: updatedParticipants,
      players: updatedParticipants,
      playerCount: newPlayerCount,
      hasPlayers: newPlayerCount > 0,
      isEmpty: false,
      status: newStatus,
      lastUpdated: serverTimestamp(),
    });
  }

  static async createNewRosterForChild(parentId, parentData, student, rosterId, mappedSport, childAgeGroup) {
    const childName = student.name || student.firstName || "";
    const participantData = {
      id: `${parentId}-${childName}`,
      name: childName,
      firstName: student.firstName || childName.split(" ")[0] || "",
      lastName: student.lastName || childName.split(" ")[1] || "",
      dob: student.dob,
      ageGroup: childAgeGroup,
      grade: student.grade || "",
      school_name: student.school_name || "",
      parentId: parentId,
      parentName: `${parentData.firstName} ${parentData.lastName}`,
      parentEmail: parentData.email,
      parentPhone: parentData.phone,
      sport: mappedSport,
      location: parentData.location,
      registeredAt: new Date().toISOString(),
    };
    const newRoster = {
      id: rosterId,
      teamName: `${childAgeGroup} ${mappedSport} - ${parentData.location}`,
      sport: mappedSport,
      ageGroup: childAgeGroup,
      location: parentData.location,
      coachId: null,
      coachName: "Unassigned",
      hasAssignedCoach: false,
      participants: [participantData],
      players: [participantData],
      playerCount: 1,
      hasPlayers: true,
      isEmpty: false,
      status: "needs-coach",
      isActive: false,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      maxPlayers: 20,
      minPlayers: 6,
    };
    await addDoc(collection(db, "rosters"), newRoster);
  }

  static async createInterestRecord(parentId, parentData, student, rosterId) {
    try {
      await addDoc(collection(db, "interest_records"), {
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
        status: "pending_team_creation",
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating interest record:", error);
    }
  }

  static async syncParentsToRosters() {
    try {
      const [parentsData, rostersData] = await Promise.all([this.getParents(), RosterService.getRosters()]);
      const batch = writeBatch(db);
      const currentTimestamp = new Date().toISOString();
      const sportMapping = { "Flag Football": "Football", "Tackle Football": "Football" };
      let parentsUpdated = 0;
      let rostersUpdated = 0;
      let newAssignments = 0;

      for (const parent of parentsData) {
        if (!parent.students || !Array.isArray(parent.students)) continue;
        let parentHasAssignments = false;
        const parentAssignments = [];

        for (const student of parent.students) {
          if (!student.name && !student.firstName) continue;
          const childName = student.name || student.firstName;
          const childAgeGroup = RosterService.calculateAgeGroup(student.dob, student.ageGroup);
          const mappedSport = sportMapping[parent.sport] || parent.sport;

          const matchingRoster = rostersData.find(roster =>
            roster.sport &&
            mappedSport &&
            roster.sport.toLowerCase() === mappedSport.toLowerCase() &&
            roster.ageGroup &&
            childAgeGroup &&
            roster.ageGroup.toLowerCase() === childAgeGroup.toLowerCase() &&
            roster.location &&
            parent.location &&
            roster.location.toLowerCase() === parent.location.toLowerCase() &&
            roster.hasAssignedCoach &&
            roster.coachId
          );

          if (matchingRoster) {
            const participantData = {
              id: `${parent.id}-${childName}`,
              firstName: student.firstName,
              lastName: student.lastName,
              dob: student.dob || null,
              ageGroup: childAgeGroup,
              grade: student.grade || "",
              school_name: student.school_name || "",
              parentId: parent.id,
              parentName: `${parent.firstName || ""} ${parent.lastName || ""}`.trim(),
              parentEmail: parent.email || "",
              parentPhone: parent.phone || "",
              sport: mappedSport,
              location: parent.location || "",
              coachId: matchingRoster.coachId,
              coachName: matchingRoster.coachName,
              assignedAt: currentTimestamp,
              assignedBy: "auto-sync",
            };

            const existingParticipants = matchingRoster.participants || [];
            const existingIndex = existingParticipants.findIndex(p => p.id === participantData.id);
            let updatedParticipants;
            if (existingIndex >= 0) {
              updatedParticipants = [...existingParticipants];
              updatedParticipants[existingIndex] = participantData;
            } else {
              updatedParticipants = [...existingParticipants, participantData];
              newAssignments++;
            }

            const rosterRef = doc(db, "rosters", matchingRoster.id);
            batch.update(rosterRef, {
              participants: updatedParticipants,
              players: updatedParticipants,
              playerCount: updatedParticipants.length,
              hasPlayers: true,
              status: "active",
              lastUpdated: serverTimestamp(),
            });
            rostersUpdated++;

            parentHasAssignments = true;
            parentAssignments.push({
              childName: childName,
              rosterId: matchingRoster.id,
              teamName: matchingRoster.teamName,
              coachName: matchingRoster.coachName,
            });
          }
        }

        if (parentHasAssignments) {
          const parentRef = doc(db, "registrations", parent.id);
          batch.update(parentRef, {
            assignedAt: serverTimestamp(),
            assignedBy: "auto-sync",
            lastAssignmentUpdate: currentTimestamp,
            assignments: parentAssignments,
          });
          parentsUpdated++;
        }
      }

      await batch.commit();
      return {
        parentsUpdated,
        rostersUpdated,
        newAssignments,
        message: `Sync completed! ${parentsUpdated} parents updated, ${newAssignments} new assignments made.`,
      };
    } catch (error) {
      console.error("Error syncing parents to rosters:", error);
      throw error;
    }
  }
}

module.exports = ParentService;