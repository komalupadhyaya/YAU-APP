// services/rosterService.js
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
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} = require("firebase/firestore");
const LocationService = require("./locationService");

/** Standard age groups for manual roster creation (3U–14U). */
const STANDARD_AGE_GROUPS = ["3U", "4U", "5U", "6U", "7U", "8U", "9U", "10U", "11U", "12U", "13U", "14U"];

/** Standard grades for manual roster creation (K–8th Grade). */
const STANDARD_GRADES = ["Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade"];

/** Standard sports list for manual roster creation - matches Registration component. */
const STANDARD_SPORTS = [
  "Soccer",
  "Basketball",
  "Baseball",
  "Track",
  "Flag Football",
  "Tackle Football",
  "Kickball",
  "Golf",
  "Cheer"
];

class RosterService {
  static calculateAgeGroup(dob, providedAgeGroup = null) {
    if (!dob && providedAgeGroup) {
      return providedAgeGroup;
    }
    if (!dob) {
      return '6U';
    }

    try {
      const birthDate = new Date(dob);
      if (isNaN(birthDate.getTime())) {
        return providedAgeGroup || '6U';
      }

      const today = new Date();
      const currentYear = today.getFullYear();

      // Create the cutoff date for this year (July 31)
      const cutoffDate = new Date(currentYear, 6, 31); // Month is 0-indexed (6 = July)

      // 1. Calculate the player's "season age" (age on Dec 31 of this year)
      const seasonAge = currentYear - birthDate.getFullYear();

      // 2. Check if the season age is within the valid range (3-14)
      if (seasonAge < 3 || seasonAge > 14) {
        return providedAgeGroup || '6U';
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
      console.error('Error calculating age group:', error);
      return providedAgeGroup || '6U';
    }
  }

  /**
   * Get all parents from the members collection.
   * This is a separate function in rosterService to avoid dependency on parentService.
   */
  static async getParents() {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, "members"), orderBy("createdAt", "desc"))
      );
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
      }));
    } catch (error) {
      console.error("Error getting parents:", error);
      try {
        const querySnapshot = await getDocs(collection(db, "members"));
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

  static async getRosters() {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, "rosters"), orderBy("createdAt", "desc"))
      );
      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        
        // Clean up any undefined values
        const cleanData = {};
        Object.keys(data).forEach(key => {
          if (data[key] !== undefined) {
            cleanData[key] = data[key];
          }
        });

        return {
          id: doc.id,
          ...cleanData,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
          lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : data.lastUpdated
        };
      });
    } catch (error) {
      console.error("Error getting rosters:", error);
      // Fallback without orderBy
      try {
        const querySnapshot = await getDocs(collection(db, "rosters"));
        return querySnapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Clean up any undefined values
          const cleanData = {};
          Object.keys(data).forEach(key => {
            if (data[key] !== undefined) {
              cleanData[key] = data[key];
            }
          });

          return {
            id: doc.id,
            ...cleanData
          };
        });
      } catch (fallbackError) {
        console.error("Fallback error getting rosters:", fallbackError);
        throw fallbackError;
      }
    }
  }

  static async getRosterById(id) {
    try {
      const docRef = doc(db, "rosters", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Clean up any undefined values
        const cleanData = {};
        Object.keys(data).forEach(key => {
          if (data[key] !== undefined) {
            cleanData[key] = data[key];
          }
        });

        return {
          id: docSnap.id,
          ...cleanData,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
          lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : data.lastUpdated
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting roster:", error);
      throw error;
    }
  }

  static async createRoster(rosterData) {
    try {
      const sportMapping = { "Flag Football": "Football", "Tackle Football": "Football" };
      const mappedSport = sportMapping[rosterData.sport] || rosterData.sport;
      const rosterId = `${mappedSport.toLowerCase().replace(/\s+/g, "-")}-${rosterData.grade.toLowerCase().replace(/\s+/g, "-")}-${rosterData.location.replace(/\s+/g, "-").toLowerCase()}`;
      
      // Check if roster already exists
      const existingRoster = await this.getRosterById(rosterId);
      if (existingRoster) {
        throw new Error(`Roster already exists for ${mappedSport} ${rosterData.ageGroup} at ${rosterData.location}`);
      }

      const newRoster = {
        id: rosterId,
        teamName: rosterData.teamName || `${rosterData.grade} ${mappedSport} - ${rosterData.location}`,
        sport: mappedSport,
        ageGroup: rosterData.ageGroup || rosterData.grade,
        location: rosterData.location,
        
        // Coach assignment (initially empty)
        coachId: null,
        coachName: "Unassigned",
        hasAssignedCoach: false,
        
        // Players
        participants: rosterData.participants || [],
        players: rosterData.players || rosterData.participants || [], // Keep both for compatibility
        playerCount: (rosterData.participants || []).length,
        hasPlayers: (rosterData.participants || []).length > 0,
        isEmpty: (rosterData.participants || []).length === 0,
        
        // Status logic
        status: (rosterData.participants || []).length > 0 ? "needs-coach" : "empty",
        isActive: false, // Only active when has coach AND players
        
        // Timestamps
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        
        // Limits
        maxPlayers: rosterData.maxPlayers || 20,
        minPlayers: rosterData.minPlayers || 6,
      };

      // Remove undefined values
      Object.keys(newRoster).forEach(key => {
        if (newRoster[key] === undefined) {
          newRoster[key] = null;
        }
      });

      doc(db, "rosters", rosterId);
      await addDoc(collection(db, "rosters"), newRoster);
      return rosterId;
    } catch (error) {
      console.error("Error creating roster:", error);
      throw error;
    }
  }

  static async updateRoster(id, updates) {
    try {
      console.log('🔄 Updating roster:', id, updates);
      
      const roster = await this.getRosterById(id);
      if (!roster) {
        throw new Error("Roster not found");
      }

      // Remove undefined values from updates
      const cleanUpdates = {};
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          cleanUpdates[key] = updates[key];
        }
      });

      // Add timestamp
      cleanUpdates.lastUpdated = serverTimestamp();
      cleanUpdates.updatedAt = serverTimestamp();

      const docRef = doc(db, "rosters", id);
      await updateDoc(docRef, cleanUpdates);
      
      console.log('✅ Roster updated successfully');
    } catch (error) {
      console.error("❌ Error updating roster:", error);
      throw error;
    }
  }

  static async deleteRoster(id) {
    try {
      const roster = await this.getRosterById(id);
      if (!roster) {
        throw new Error("Roster not found");
      }

      // If roster has players, we might want to warn or prevent deletion
      if (roster.playerCount > 0) {
        console.warn(`⚠️ Deleting roster with ${roster.playerCount} players: ${roster.teamName}`);
      }

      const docRef = doc(db, "rosters", id);
      await deleteDoc(docRef);
      console.log(`🗑️ Roster deleted: ${id}`);
    } catch (error) {
      console.error("Error deleting roster:", error);
      throw error;
    }
  }

  static async addPlayerToRoster(rosterId, playerData) {
    try {
      const roster = await this.getRosterById(rosterId);
      if (!roster) {
        throw new Error("Roster not found");
      }

      const existingParticipants = roster.participants || [];
      
      // Check if player already exists
      const existingPlayerIndex = existingParticipants.findIndex(p => p.id === playerData.id);
      
      if (existingPlayerIndex >= 0) {
        // Update existing player
        existingParticipants[existingPlayerIndex] = {
          ...existingParticipants[existingPlayerIndex],
          ...playerData,
          updatedAt: new Date().toISOString()
        };
      } else {
        // Add new player
        existingParticipants.push({
          ...playerData,
          registeredAt: new Date().toISOString()
        });
      }

      const newPlayerCount = existingParticipants.length;
      
      // Calculate new status
      let newStatus = 'empty';
      let isActive = false;

      if (newPlayerCount > 0 && roster.hasAssignedCoach) {
        newStatus = newPlayerCount >= (roster.minPlayers || 6) ? 'active' : 'forming';
        isActive = newPlayerCount >= (roster.minPlayers || 6);
      } else if (newPlayerCount > 0 && !roster.hasAssignedCoach) {
        newStatus = 'needs-coach';
        isActive = false;
      } else if (newPlayerCount === 0 && roster.hasAssignedCoach) {
        newStatus = 'needs-players';
        isActive = false;
      } else {
        newStatus = 'empty';
        isActive = false;
      }

      await this.updateRoster(rosterId, {
        participants: existingParticipants,
        players: existingParticipants, // Keep both for compatibility
        playerCount: newPlayerCount,
        hasPlayers: newPlayerCount > 0,
        isEmpty: newPlayerCount === 0,
        status: newStatus,
        isActive: isActive
      });

      console.log(`✅ Player ${existingPlayerIndex >= 0 ? 'updated' : 'added'} to roster: ${rosterId}`);
    } catch (error) {
      console.error("Error adding player to roster:", error);
      throw error;
    }
  }

  static async removePlayerFromRoster(rosterId, playerId) {
    try {
      const roster = await this.getRosterById(rosterId);
      if (!roster) {
        throw new Error("Roster not found");
      }

      const existingParticipants = roster.participants || [];
      const updatedParticipants = existingParticipants.filter(p => p.id !== playerId);
      const newPlayerCount = updatedParticipants.length;

      // Calculate new status
      let newStatus = 'empty';
      let isActive = false;

      if (newPlayerCount > 0 && roster.hasAssignedCoach) {
        newStatus = newPlayerCount >= (roster.minPlayers || 6) ? 'active' : 'forming';
        isActive = newPlayerCount >= (roster.minPlayers || 6);
      } else if (newPlayerCount > 0 && !roster.hasAssignedCoach) {
        newStatus = 'needs-coach';
        isActive = false;
      } else if (newPlayerCount === 0 && roster.hasAssignedCoach) {
        newStatus = 'needs-players';
        isActive = false;
      } else {
        newStatus = 'empty';
        isActive = false;
      }

      await this.updateRoster(rosterId, {
        participants: updatedParticipants,
        players: updatedParticipants, // Keep both for compatibility
        playerCount: newPlayerCount,
        hasPlayers: newPlayerCount > 0,
        isEmpty: newPlayerCount === 0,
        status: newStatus,
        isActive: isActive
      });

      console.log(`➖ Player removed from roster: ${rosterId} (${newPlayerCount} remaining)`);
    } catch (error) {
      console.error("Error removing player from roster:", error);
      throw error;
    }
  }

  static async assignCoachToRoster(rosterId, coachId) {
    try {
      const roster = await this.getRosterById(rosterId);
      if (!roster) {
        throw new Error("Roster not found");
      }

      // Get coach data - you might need to import CoachService
      // For now, we'll just use the coachId and generate a name
      const coachName = `Coach ${coachId}`; // This should be replaced with actual coach data

      // Calculate new status
      let newStatus = 'needs-players';
      let isActive = false;

      if (roster.playerCount > 0) {
        newStatus = roster.playerCount >= (roster.minPlayers || 6) ? 'active' : 'forming';
        isActive = roster.playerCount >= (roster.minPlayers || 6);
      }

      await this.updateRoster(rosterId, {
        coachId: coachId,
        coachName: coachName,
        hasAssignedCoach: true,
        status: newStatus,
        isActive: isActive
      });

      console.log(`👨‍🏫 Coach ${coachId} assigned to roster: ${rosterId}`);
    } catch (error) {
      console.error("Error assigning coach to roster:", error);
      throw error;
    }
  }

  static async removeCoachFromRoster(rosterId) {
    try {
      const roster = await this.getRosterById(rosterId);
      if (!roster) {
        throw new Error("Roster not found");
      }

      // Calculate new status
      let newStatus = 'empty';
      if (roster.playerCount > 0) {
        newStatus = 'needs-coach';
      }

      await this.updateRoster(rosterId, {
        coachId: null,
        coachName: "Unassigned",
        hasAssignedCoach: false,
        status: newStatus,
        isActive: false
      });

      console.log(`❌ Coach removed from roster: ${rosterId}`);
    } catch (error) {
      console.error("Error removing coach from roster:", error);
      throw error;
    }
  }

  static async getRostersByLocation(location) {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, "rosters"),
          where("location", "==", location),
          orderBy("createdAt", "desc")
        )
      );
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
      }));
    } catch (error) {
      console.error("Error getting rosters by location:", error);
      throw error;
    }
  }

  static async getRostersBySport(sport) {
    try {
      const sportMapping = { "Flag Football": "Football", "Tackle Football": "Football" };
      const mappedSport = sportMapping[sport] || sport;

      const querySnapshot = await getDocs(
        query(
          collection(db, "rosters"),
          where("sport", "==", mappedSport),
          orderBy("createdAt", "desc")
        )
      );
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
      }));
    } catch (error) {
      console.error("Error getting rosters by sport:", error);
      throw error;
    }
  }

  static async getRostersByGrade(grade) {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, "rosters"),
          where("grade", "==", grade),
          orderBy("createdAt", "desc")
        )
      );
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
      }));
    } catch (error) {
      console.error("Error getting rosters by grade:", error);
      throw error;
    }
  }

  static async getRosterStats() {
    try {
      const rosters = await this.getRosters();
      
      const stats = {
        totalRosters: rosters.length,
        activeRosters: rosters.filter(r => r.status === 'active').length,
        rostersNeedingCoaches: rosters.filter(r => r.status === 'needs-coach').length,
        rostersNeedingPlayers: rosters.filter(r => r.status === 'needs-players').length,
        emptyRosters: rosters.filter(r => r.status === 'empty').length,
        totalPlayers: rosters.reduce((sum, r) => sum + (r.participants.length || 0), 0),
        totalCoaches: rosters.filter(r => r.hasAssignedCoach).length,
        averagePlayersPerRoster: rosters.length > 0 ? 
          (rosters.reduce((sum, r) => sum + (r.playerCount || 0), 0) / rosters.length).toFixed(1) : 0,
        
        // Breakdown by sport
        sportBreakdown: rosters.reduce((acc, roster) => {
          acc[roster.sport] = (acc[roster.sport] || 0) + 1;
          return acc;
        }, {}),
        
        // Breakdown by age group
        ageGroupBreakdown: rosters.reduce((acc, roster) => {
          acc[roster.ageGroup] = (acc[roster.ageGroup] || 0) + 1;
          return acc;
        }, {}),
        
        // Breakdown by location
        locationBreakdown: rosters.reduce((acc, roster) => {
          acc[roster.location] = (acc[roster.location] || 0) + 1;
          return acc;
        }, {})
      };

      return stats;
    } catch (error) {
      console.error("Error getting roster stats:", error);
      throw error;
    }
  }

   static async generateInitialRosters() {
    try {
      console.log('🏗️ Generating initial rosters from existing parents...');
      
      const parentsData = await this.getParents();
      console.log(`📋 Found ${parentsData.length} parents to process`);

      if (parentsData.length === 0) {
        console.log('⚠️ No parents found, skipping roster generation');
        return {
          success: false,
          message: 'No parents found',
          rostersCreated: 0,
          rostersByStatus: {}
        };
      }

      const batch = writeBatch(db);
      const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };
      const rosterMap = new Map(); // To track unique rosters needed
      const currentTimestamp = new Date().toISOString();

      // First pass: Identify all unique roster combinations needed
      parentsData.forEach(parent => {
        if (parent.students && Array.isArray(parent.students)) {
          parent.students.forEach(child => {
            if (!child.name && !child.firstName) return;

            const childAgeGroup = this.calculateAgeGroup(child.dob, child.ageGroup);
            const mappedSport = sportMapping[parent.sport] || parent.sport;
            const rosterId = `${mappedSport.toLowerCase().replace(/\s+/g, '-')}-${childAgeGroup.toLowerCase()}-${parent.location.replace(/\s+/g, '-').toLowerCase()}`;

            if (!rosterMap.has(rosterId)) {
              rosterMap.set(rosterId, {
                id: rosterId,
                teamName: `${childAgeGroup} ${mappedSport} - ${parent.location}`,
                sport: mappedSport,
                ageGroup: childAgeGroup,
                location: parent.location,
                participants: [],
                players: [],
                playerCount: 0,
                hasPlayers: false,
                hasAssignedCoach: false,
                isEmpty: true,
                status: 'empty',
                coachId: null,
                coachName: 'Unassigned',
                isActive: false,
                maxPlayers: 20,
                minPlayers: 6,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp()
              });
            }
          });
        }
      });

      console.log(`🏆 Found ${rosterMap.size} unique roster combinations needed`);

      // Second pass: Add participants to rosters
      parentsData.forEach(parent => {
        if (parent.students && Array.isArray(parent.students)) {
          parent.students.forEach(child => {
            if (!child.name && !child.firstName) return;

            const childAgeGroup = this.calculateAgeGroup(child.dob, child.ageGroup);
            const mappedSport = sportMapping[parent.sport] || parent.sport;
            const rosterId = `${mappedSport.toLowerCase().replace(/\s+/g, '-')}-${childAgeGroup.toLowerCase()}-${parent.location.replace(/\s+/g, '-').toLowerCase()}`;

            const participant = {
              id: `${parent.id}-${child.name || child.firstName}`,
              name: child.name || child.firstName || '',
              firstName: child.firstName || child.name?.split(' ')[0] || '',
              lastName: child.lastName || child.name?.split(' ')[1] || '',
              dob: child.dob || null,
              ageGroup: childAgeGroup,
              parentId: parent.id,
              parentName: `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
              parentEmail: parent.email || '',
              parentPhone: parent.phone || '',
              sport: mappedSport,
              location: parent.location || '',
              registeredAt: currentTimestamp,
              status: 'active'
            };

            // Remove undefined values
            Object.keys(participant).forEach(key => {
              if (participant[key] === undefined) {
                participant[key] = null;
              }
            });

            // Add participant to the roster
            const roster = rosterMap.get(rosterId);
            if (roster) {
              roster.participants.push(participant);
              roster.players.push(participant);
            }
          });
        }
      });

      // Third pass: Update roster stats and create in Firestore
      for (const [rosterId, roster] of rosterMap) {
        const playerCount = roster.participants.length;
        
        roster.playerCount = playerCount;
        roster.hasPlayers = playerCount > 0;
        roster.isEmpty = playerCount === 0;
        roster.status = playerCount > 0 ? 'needs-coach' : 'empty';
        roster.isActive = false; // Will be true when has both coach and players

        console.log(`📝 Creating roster: ${rosterId} with ${playerCount} players`);

        // Remove undefined values from roster object
        Object.keys(roster).forEach(key => {
          if (roster[key] === undefined) {
            roster[key] = null;
          }
        });

        const rosterRef = doc(db, 'rosters', rosterId);
        batch.set(rosterRef, roster);
      }

      await batch.commit();
      console.log(`✅ Successfully created ${rosterMap.size} initial rosters`);

      // Log summary
      const rostersByStatus = {};
      for (const roster of rosterMap.values()) {
        rostersByStatus[roster.status] = (rostersByStatus[roster.status] || 0) + 1;
      }
      
      console.log('📊 Roster summary:', rostersByStatus);

      return {
        success: true,
        message: `Successfully created ${rosterMap.size} initial rosters`,
        rostersCreated: rosterMap.size,
        rostersByStatus: rostersByStatus,
        details: {
          totalParents: parentsData.length,
          totalRosters: rosterMap.size,
          rostersWithPlayers: rostersByStatus['needs-coach'] || 0,
          emptyRosters: rostersByStatus['empty'] || 0
        }
      };

    } catch (error) {
      console.error('❌ Error generating initial rosters:', error);
      throw error;
    }
  }

  static async syncAllRosters() {
    try {
      console.log('🔄 Starting bulk roster sync...');
      
      const [parentsData, rostersData] = await Promise.all([
        this.getParents(),
        this.getRosters()
      ]);

      const batch = writeBatch(db);
      const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };
      const currentTimestamp = new Date().toISOString();

      let rostersUpdated = 0;
      let participantsProcessed = 0;

      // Generate current participants from all parents
      const allParticipants = [];
      parentsData.forEach(parent => {
        if (parent.students && Array.isArray(parent.students)) {
          parent.students.forEach(child => {
            // Validate child data
            if (!child.name && !child.firstName) {
              console.log('⚠️ Skipping child with no name:', child);
              return;
            }

            const correctAgeGroup = this.calculateAgeGroup(child.dob, child.ageGroup);
            const mappedSport = sportMapping[parent.sport] || parent.sport;

            // Create participant without serverTimestamp
            const participant = {
              id: `${parent.id}-${child.name || child.firstName}`,
              name: child.name || child.firstName || '',
              firstName: child.firstName || child.name?.split(' ')[0] || '',
              lastName: child.lastName || child.name?.split(' ')[1] || '',
              dob: child.dob || null,
              ageGroup: correctAgeGroup,
              parentId: parent.id,
              parentName: `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
              parentEmail: parent.email || '',
              parentPhone: parent.phone || '',
              sport: mappedSport,
              location: parent.location || '',
              registeredAt: currentTimestamp,
              status: 'active'
            };

            // Remove undefined values
            Object.keys(participant).forEach(key => {
              if (participant[key] === undefined) {
                participant[key] = null;
              }
            });

            allParticipants.push(participant);
            participantsProcessed++;
          });
        }
      });

      console.log(`👥 Generated ${allParticipants.length} participants from ${parentsData.length} parents`);

      // Update each roster with matching participants
      for (const roster of rostersData) {
        const matchingParticipants = allParticipants.filter(p =>
          p.sport && roster.sport &&
          p.sport.toLowerCase() === roster.sport.toLowerCase() &&
          p.ageGroup && roster.ageGroup &&
          p.ageGroup.toLowerCase() === roster.ageGroup.toLowerCase() &&
          p.location && roster.location &&
          p.location.toLowerCase() === roster.location.toLowerCase()
        );

        const playerCount = matchingParticipants.length;
        const hasAssignedCoach = !!roster.coachId;
        
        // Determine status
        let status = 'empty';
        let isActive = false;

        if (playerCount > 0 && hasAssignedCoach) {
          status = playerCount >= (roster.minPlayers || 6) ? 'active' : 'forming';
          isActive = playerCount >= (roster.minPlayers || 6);
        } else if (playerCount > 0 && !hasAssignedCoach) {
          status = 'needs-coach';
          isActive = false;
        } else if (playerCount === 0 && hasAssignedCoach) {
          status = 'needs-players';
          isActive = false;
        } else {
          status = 'empty';
          isActive = false;
        }

        // Only update if there are changes
        const hasChanges = (
          roster.playerCount !== playerCount ||
          roster.status !== status ||
          !roster.participants ||
          roster.participants.length !== playerCount ||
          roster.isActive !== isActive
        );

        if (hasChanges) {
          console.log(`🔄 Updating roster ${roster.id}: ${roster.playerCount || 0} → ${playerCount} players, status: ${roster.status} → ${status}`);
          
          const updateData = {
            participants: matchingParticipants,
            players: matchingParticipants, // Keep both for compatibility
            playerCount: playerCount,
            hasPlayers: playerCount > 0,
            isEmpty: playerCount === 0 && !hasAssignedCoach,
            status: status,
            isActive: isActive,
            lastUpdated: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          // Remove undefined values
          Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
              delete updateData[key];
            }
          });

          const rosterRef = doc(db, 'rosters', roster.id);
          batch.update(rosterRef, updateData);
          rostersUpdated++;
        }
      }

      await batch.commit();
      console.log('✅ Bulk roster sync completed');

      const finalStats = {
        totalParents: parentsData.length,
        totalRosters: rostersData.length,
        rostersUpdated: rostersUpdated,
        participantsProcessed: participantsProcessed,
        activeRosters: rostersData.filter(r => r.status === 'active' || (r.playerCount > 0 && r.hasAssignedCoach)).length,
        rostersNeedingCoaches: rostersData.filter(r => r.playerCount > 0 && !r.hasAssignedCoach).length,
        emptyRosters: rostersData.filter(r => r.playerCount === 0 && !r.hasAssignedCoach).length
      };

      console.log('📊 Sync summary:', finalStats);
      
      return {
        success: true,
        message: `Successfully synced ${rostersUpdated} rosters`,
        stats: finalStats
      };
      
    } catch (error) {
      console.error('❌ Error in bulk sync:', error);
      throw error;
    }
  }


  static async bulkUpdateRosters(rosterIds, updates) {
    try {
      console.log(`🔄 Bulk updating ${rosterIds.length} rosters`);
      
      const batch = writeBatch(db);
      
      // Remove undefined values from updates
      const cleanUpdates = {};
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          cleanUpdates[key] = updates[key];
        }
      });

      // Add timestamp
      cleanUpdates.lastUpdated = serverTimestamp();
      cleanUpdates.updatedAt = serverTimestamp();
      
      rosterIds.forEach(rosterId => {
        const rosterRef = doc(db, "rosters", rosterId);
        batch.update(rosterRef, cleanUpdates);
      });
      
      await batch.commit();
      console.log(`✅ Bulk update completed for ${rosterIds.length} rosters`);
    } catch (error) {
      console.error("❌ Error in bulk update:", error);
      throw error;
    }
  }

  static async bulkDeleteRosters(rosterIds) {
    try {
      if (!Array.isArray(rosterIds) || rosterIds.length === 0) {
        throw new Error("rosterIds must be a non-empty array");
      }

      console.log(`🗑️ Bulk deleting ${rosterIds.length} rosters (direct delete, no existence check)`);
      
      const results = {
        total: rosterIds.length,
        deleted: [],
        failed: []
      };

      // Firestore batch limit is 500 operations
      const BATCH_SIZE = 500;
      
      // Process in batches
      for (let i = 0; i < rosterIds.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const batchIds = rosterIds.slice(i, i + BATCH_SIZE);
        
        // Directly delete all provided IDs without checking existence first
        // Firestore batch.delete() handles non-existent documents gracefully
        batchIds.forEach((rosterId) => {
          try {
            const rosterRef = doc(db, "rosters", rosterId);
            batch.delete(rosterRef);
            results.deleted.push({ id: rosterId });
          } catch (error) {
            console.error(`❌ Error preparing delete for ${rosterId}:`, error);
            results.failed.push({
              id: rosterId,
              error: error.message || 'Error preparing delete operation'
            });
          }
        });

        // Commit batch
        try {
          await batch.commit();
          console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} deleted successfully (${batchIds.length} rosters)`);
        } catch (batchError) {
          console.error(`❌ Error committing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, batchError);
          // Mark all rosters in this batch as failed
          batchIds.forEach(rosterId => {
            const existingDeleted = results.deleted.find(r => r.id === rosterId);
            if (existingDeleted) {
              results.deleted = results.deleted.filter(r => r.id !== rosterId);
            }
            if (!results.failed.find(r => r.id === rosterId)) {
              results.failed.push({
                id: rosterId,
                error: batchError.message || 'Batch commit failed'
              });
            }
          });
        }
      }

      console.log(`✅ Bulk delete completed: ${results.deleted.length} deleted, ${results.failed.length} failed`);
      
      return {
        success: results.failed.length === 0,
        total: results.total,
        deleted: results.deleted.length,
        failed: results.failed.length,
        details: results
      };
    } catch (error) {
      console.error("❌ Error in bulk delete:", error);
      throw error;
    }
  }
    static async cleanupEmptyRosters() {
    try {
      console.log('🧹 Cleaning up empty rosters...');
      
      const rosters = await this.getRosters();
      const emptyRosters = rosters.filter(r => 
        r.playerCount === 0 && 
        !r.hasAssignedCoach && 
        r.status === 'empty'
      );

      if (emptyRosters.length === 0) {
        console.log('✅ No empty rosters to clean up');
        return { deletedCount: 0, message: 'No empty rosters found' };
      }

      const batch = writeBatch(db);
      emptyRosters.forEach(roster => {
        const rosterRef = doc(db, 'rosters', roster.id);
        batch.delete(rosterRef);
      });

      await batch.commit();
      console.log(`🗑️ Deleted ${emptyRosters.length} empty rosters`);

      return {
        deletedCount: emptyRosters.length,
        message: `Successfully deleted ${emptyRosters.length} empty rosters`,
        deletedRosters: emptyRosters.map(r => r.id)
      };
    } catch (error) {
      console.error('❌ Error cleaning up empty rosters:', error);
      throw error;
    }
  }

  /**
   * Get all students flattened from parents for manual roster creation.
   * Optional filters: location, sport, grade (student must match all provided filters).
   */
  static async getOptionStudents(filters = {}) {
    const { location, sport, grade } = filters;
    const parentsData = await this.getParents();
    const sportMapping = { 
      "Flag Football": "Football", 
      "Tackle Football": "Football",
      "Flag_football": "Football",
      "Tackle_football": "Football"
    };
    
    // Helper function to normalize sport (apply mapping and normalize case)
    const normalizeSport = (sportValue) => {
      if (!sportValue) return "";
      const upperSport = String(sportValue).toUpperCase();
      // Check if it matches any mapping key (case-insensitive)
      for (const [key, mappedValue] of Object.entries(sportMapping)) {
        if (upperSport === key.toUpperCase()) {
          return mappedValue;
        }
      }
      // Return original value with first letter capitalized
      return sportValue.charAt(0).toUpperCase() + sportValue.slice(1).toLowerCase();
    };
    
    // Helper function to normalize location (trim and lowercase for comparison)
    const normalizeLocation = (locationValue) => {
      return String(locationValue || "").trim().toLowerCase();
    };
    
    const students = [];

    parentsData.forEach((parent) => {
      if (!parent.students || !Array.isArray(parent.students)) return;

      parent.students.forEach((child) => {
        if (!child.name && !child.firstName) return;
        
        // ✅ FIX: Use child's sport/location (per-student), fallback to parent's for backward compatibility
        const childSportRaw = child.sport || parent.sport || "";
        const childLocationRaw = child.location || parent.location || "";
        
        // Normalize sport and location for comparison
        const childSport = normalizeSport(childSportRaw);
        const childLocation = normalizeLocation(childLocationRaw);
        
        // Use grade from child data, fallback to ageGroup calculation for backward compatibility
        const childGrade = child.grade || "";
        const childAgeGroup = this.calculateAgeGroup(child.dob, child.ageGroup);
        
        // ✅ FIX: Apply filters using CHILD values (normalized)
        if (location) {
          const filterLocation = normalizeLocation(location);
          if (childLocation !== filterLocation) return;
        }
        
        if (sport) {
          const filterSport = normalizeSport(sport);
          // Compare normalized sports (case-insensitive)
          if (childSport.toLowerCase() !== filterSport.toLowerCase()) return;
        }
        
        if (grade && childGrade !== grade) return;

        students.push({
          id: `${parent.id}-${child.name || child.firstName}`,
          parentId: parent.id,
          name: child.name || child.firstName || "",
          firstName: child.firstName || child.name?.split(" ")[0] || "",
          lastName: child.lastName || child.name?.split(" ")[1] || "",
          dob: child.dob || null,
          grade: childGrade,
          ageGroup: childAgeGroup,
          school_name: child.school_name || "",
          parentName: `${parent.firstName || ""} ${parent.lastName || ""}`.trim(),
          parentEmail: parent.email || "",
          parentPhone: parent.phone || "",
          sport: childSport || childSportRaw, // Use normalized sport, fallback to raw
          location: childLocationRaw || "", // Use original location format
        });
      });
    });

    return students;
  }

  /** Get locations for manual roster creation (dropdown). */
  static async getOptionLocations() {
    return LocationService.getLocations();
  }

  /** Get all sports for manual roster creation - returns all sports from Registration component. */
  static async getOptionSports() {
    // Return all standard sports from Registration component
    // Also include any additional sports found in parent registrations for completeness
    const parentsData = await this.getParents();
    const fromParents = new Set();
    parentsData.forEach((p) => {
      if (p.sport) {
        // Normalize sport names: Flag_football -> Flag Football, Tackle_football -> Tackle Football
        let normalizedSport = p.sport;
        if (p.sport === "Flag_football") normalizedSport = "Flag Football";
        if (p.sport === "Tackle_football") normalizedSport = "Tackle Football";
        fromParents.add(normalizedSport);
      }
    });
    // Combine standard sports with any additional sports from parents
    const combined = new Set([...STANDARD_SPORTS, ...fromParents]);
    return Array.from(combined).sort();
  }

  /** Get age groups for manual roster creation (dropdown). */
  static getOptionAgeGroups() {
    return [...STANDARD_AGE_GROUPS];
  }

  /** Get grades for manual roster creation (dropdown). */
  static getOptionGrades() {
    return [...STANDARD_GRADES];
  }

  /**
   * Get all options for manual roster creation in one call: students, locations, sports, grades.
   * Optional query filters for students: location, sport, grade.
   */
  static async getManualCreateOptions(filters = {}) {
    const [students, locations, sports] = await Promise.all([
      this.getOptionStudents(filters),
      this.getOptionLocations(),
      this.getOptionSports(),
    ]);
    const grades = this.getOptionGrades();
    return { students, locations, sports, grades };
  }

  // Method to get roster creation statistics
  static async getRosterCreationStats() {
    try {
      const [rosters, parents] = await Promise.all([
        this.getRosters(),
        this.getParents()
      ]);

      const stats = {
        existing: {
          rosters: rosters.length,
          rostersWithPlayers: rosters.filter(r => r.playerCount > 0).length,
          rostersWithCoaches: rosters.filter(r => r.hasAssignedCoach).length,
          activeRosters: rosters.filter(r => r.status === 'active').length
        },
        potential: {
          parents: parents.length,
          totalStudents: parents.reduce((sum, p) => sum + (p.students?.length || 0), 0)
        },
        breakdown: {
          bySport: rosters.reduce((acc, r) => {
            acc[r.sport] = (acc[r.sport] || 0) + 1;
            return acc;
          }, {}),
          byLocation: rosters.reduce((acc, r) => {
            acc[r.location] = (acc[r.location] || 0) + 1;
            return acc;
          }, {}),
          byAgeGroup: rosters.reduce((acc, r) => {
            acc[r.ageGroup] = (acc[r.ageGroup] || 0) + 1;
            return acc;
          }, {})
        }
      };

      return stats;
    } catch (error) {
      console.error('❌ Error getting roster creation stats:', error);
      throw error;
    }
  }

}

module.exports = RosterService;