import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  addDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase/config';

class RosterService {
  /**
   * Get roster by ID
   * @param {string} rosterId - Roster ID
   */
  static async getRoster(rosterId) {
    try {
      const rosterRef = doc(db, 'rosters', rosterId);
      const rosterSnap = await getDoc(rosterRef);
      
      if (rosterSnap.exists()) {
        return {
          success: true,
          data: {
            id: rosterSnap.id,
            ...rosterSnap.data()
          }
        };
      } else {
        return {
          success: false,
          error: 'Roster not found'
        };
      }
    } catch (error) {
      console.error('❌ Error getting roster:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all rosters
   */
  static async getAllRosters() {
    try {
      const rostersSnapshot = await getDocs(collection(db, 'rosters'));
      const rosters = rostersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        success: true,
        data: rosters
      };
    } catch (error) {
      console.error('❌ Error getting all rosters:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Find roster by team characteristics
   * @param {string} sport - Sport name
   * @param {string} ageGroup - Age group
   * @param {string} location - Location
   */
  static async findRosterByTeam(sport, ageGroup, location) {
    try {
      // Try both roster ID format and also search all rosters
      const rosterId = this.generateRosterId(ageGroup, sport, location);
      
      console.log('🔍 Looking for roster:', {
        sport,
        ageGroup,
        location,
        generatedId: rosterId
      });
      
      // First try direct lookup
      const directResult = await this.getRoster(rosterId);
      if (directResult.success) {
        return directResult;
      }
      
      // If not found, search all rosters for a match
      const allRostersResult = await this.getAllRosters();
      if (allRostersResult.success) {
        const matchingRoster = allRostersResult.data.find(roster => 
          roster.ageGroup?.toLowerCase() === ageGroup.toLowerCase() &&
          roster.sport?.toLowerCase() === sport.toLowerCase().replace(/\s+/g, '').replace('flag', '') &&
          roster.location?.toLowerCase().includes(location.toLowerCase().split(',')[0].toLowerCase())
        );
        
        if (matchingRoster) {
          console.log('✅ Found matching roster via search:', matchingRoster.id);
          return {
            success: true,
            data: matchingRoster
          };
        }
      }
      
      return {
        success: false,
        error: `No roster found for ${ageGroup} ${sport} in ${location}`
      };
      
    } catch (error) {
      console.error('❌ Error finding roster by team:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate roster ID - now uses grade instead of ageGroup
   * @param {string} grade - Grade (e.g., "1st Grade", "Kindergarten")
   * @param {string} sport - Sport name (e.g., "track") 
   * @param {string} location - Location name (e.g., "Andrews AFB - Clinton")
   */
  static generateRosterId(grade, sport, location) {
    // Clean and format components
    // Normalize grade: "1st Grade" -> "1st-grade", "Kindergarten" -> "kindergarten"
    const cleanGrade = (grade?.trim() || '').toLowerCase().replace(/\s+/g, '-');
    const cleanSport = (sport?.trim() || '').toLowerCase();
    
    // Handle location formatting to match existing roster format
    let cleanLocation = (location?.trim() || '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/,\s*/g, '---'); // Use triple dashes for comma separation
    
    // Create format: "sport-grade-location" (e.g., "soccer-1st-grade-andrews-afb---clinton")
    return `${cleanSport}-${cleanGrade}-${cleanLocation}`;
  }

  /**
   * Create or update roster with new player
   * @param {Object} memberData - Member data
   * @param {Object} student - Student data
   */
  static async addPlayerToRoster(memberData, student) {
    try {
      // Use grade for roster grouping (primary)
      const grade = student.grade || "";
      // Keep ageGroup for backward compatibility
      const ageGroup = student.ageGroup || this.calculateAgeGroup(student.dob);
      
      // Use student's sport/location if available, otherwise fallback to memberData
      const studentSport = student.sport || memberData.sport || "";
      const studentLocation = student.location || memberData.location || "";
      
      if (!grade) {
        throw new Error(`Student ${student.firstName} ${student.lastName} missing grade`);
      }
      if (!studentSport || !studentLocation) {
        throw new Error(`Student ${student.firstName} ${student.lastName} missing sport or location`);
      }
      
      const rosterId = this.generateRosterId(grade, studentSport, studentLocation);
      
      console.log('🏀 Adding player to roster:', {
        rosterId,
        grade,
        sport: studentSport,
        location: studentLocation,
        parentName: `${memberData.firstName} ${memberData.lastName}`,
        studentName: `${student.firstName} ${student.lastName}`
      });
      
      const rosterRef = doc(db, 'rosters', rosterId);
      const rosterSnap = await getDoc(rosterRef);
      
      const playerData = {
        id: `${memberData.uid}-${student.firstName} ${student.lastName}`,
        name: `${student.firstName} ${student.lastName}`,
        firstName: student.firstName,
        lastName: student.lastName,
        ageGroup: ageGroup, // Keep for backward compatibility
        grade: grade,
        dob: student.dob,
        school_name: student.school_name || "",
        sport: studentSport.toLowerCase(),
        location: studentLocation,
        parentId: memberData.uid,
        parentName: `${memberData.firstName} ${memberData.lastName}`,
        parentEmail: memberData.email,
        parentPhone: memberData.phone || '',
        registeredAt: new Date().toISOString(),
        status: 'active'
      };
      
      if (!rosterSnap.exists()) {
        // Create new roster
        const newRosterData = {
          id: rosterId,
          sport: studentSport.toLowerCase(),
          grade: grade, // Primary grouping field
          ageGroup: ageGroup, // Keep for backward compatibility
          location: studentLocation,
          teamName: `${grade} ${studentSport} - ${studentLocation}`,
          status: 'needs-coach',
          isActive: false,
          isEmpty: false,
          hasPlayers: true,
          hasAssignedCoach: false,
          coachId: null,
          coachName: 'Unassigned',
          minPlayers: 6,
          maxPlayers: 20,
          playerCount: 1,
          players: [playerData],
          participants: [playerData], // Duplicate for compatibility
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        };
        
        await setDoc(rosterRef, newRosterData);
        console.log('✅ Created new roster:', rosterId);
        
        return {
          success: true,
          rosterId,
          isNewRoster: true,
          playerCount: 1
        };
        
      } else {
        // Update existing roster
        const existingData = rosterSnap.data();
        const existingPlayers = existingData.players || [];
        
        // Check if player already exists
        const playerExists = existingPlayers.some(player => 
          player.id === playerData.id || 
          (player.parentEmail === memberData.email && player.name === playerData.name)
        );
        
        if (!playerExists) {
          const updatedPlayers = [...existingPlayers, playerData];
          
          await updateDoc(rosterRef, {
            players: updatedPlayers,
            participants: updatedPlayers, // Keep both for compatibility
            playerCount: updatedPlayers.length,
            hasPlayers: true,
            isEmpty: false,
            lastUpdated: serverTimestamp()
          });
          
          console.log('✅ Added player to existing roster:', {
            rosterId,
            newPlayerCount: updatedPlayers.length,
            playerName: playerData.name
          });
          
          return {
            success: true,
            rosterId,
            isNewRoster: false,
            playerCount: updatedPlayers.length
          };
        } else {
          console.log('ℹ️ Player already exists in roster:', {
            rosterId,
            playerName: playerData.name
          });
          
          return {
            success: true,
            rosterId,
            isNewRoster: false,
            playerCount: existingPlayers.length,
            alreadyExists: true
          };
        }
      }
      
    } catch (error) {
      console.error('❌ Error adding player to roster:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate age group from date of birth (same logic as GroupChatService)
   * @param {string} dob - Date of birth in ISO format or MM-DD-YYYY
   */
  static calculateAgeGroup(dob) {
    if (!dob) return '6U';

    try {
      let birthDate;
      
      // Handle different date formats
      if (dob.includes('-') && dob.length === 10) {
        // Handle MM-DD-YYYY format
        const parts = dob.split('-');
        if (parts.length === 3 && parts[2].length === 4) {
          birthDate = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
        } else {
          birthDate = new Date(dob);
        }
      } else {
        birthDate = new Date(dob);
      }
      
      if (isNaN(birthDate.getTime())) return '6U';

      const today = new Date();
      const currentYear = today.getFullYear();

      // Create the cutoff date for this year (July 31)
      const cutoffDate = new Date(currentYear, 6, 31); // Month is 0-indexed (6 = July)

      // 1. Calculate the player's "season age" (age on Dec 31 of this year)
      const seasonAge = currentYear - birthDate.getFullYear();

      // 2. Check if the season age is within the valid range (3-14)
      if (seasonAge < 3 || seasonAge > 14) {
        return '6U';
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
      console.error('❌ Error calculating age group:', error);
      return '6U';
    }
  }
}

export default RosterService;