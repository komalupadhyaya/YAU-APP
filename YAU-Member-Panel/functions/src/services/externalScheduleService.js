const { db } = require("../utils/firebase");
const {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  or,
  and
} = require("firebase/firestore");

class ExternalScheduleService {
  constructor() {
    this.matchesCol = collection(db, "external_schedule");
  }

  // Generate match ID (you can customize this logic)
  generateMatchId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `match_${timestamp}_${random}`;
  }

  // Validate match data
  validateMatchData(data) {
    const required = ['team1', 'team2', 'date', 'location'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (!data.team1.orgId || !data.team2.orgId) {
      throw new Error('Both teams must have orgId');
    }

    // Validate date format
    if (isNaN(new Date(data.date).getTime())) {
      throw new Error('Invalid date format');
    }
  }

  // Create new match
  async createMatch(data) {
    try {
      this.validateMatchData(data);

      const matchData = {
        // id: data.id || this.generateMatchId(),
        team1: {
          orgId: data.team1.orgId,
          orgName: data.team1.orgName || '',
          city: data.team1.city || '',
          sport: data.team1.sport || '',
          ageGroup: data.team1.ageGroup || ''
        },
        team2: {
          orgId: data.team2.orgId,
          orgName: data.team2.orgName || '',
          city: data.team2.city || '',
          sport: data.team2.sport || '',
          ageGroup: data.team2.ageGroup || ''
        },
        matchup: data.matchup || `${data.team1.orgName || 'Team 1'} vs ${data.team2.orgName || 'Team 2'}`,
        date: data.date,
        time: data.time || new Date(data.date).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'America/New_York'
        }),
        location: data.location,
        notes: data.notes || '',
        status: data.status || 'upcoming',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(this.matchesCol, matchData);
      const docSnap = await getDoc(docRef);
      return { id: docRef.id, ...docSnap.data() };
    } catch (error) {
      throw new Error(`Failed to create match: ${error.message}`);
    }
  }

  // Get all matches with optional filtering
  async getAllMatches({ orgId, sport, ageGroup, status } = {}) {
    try {
      let matchesQuery = this.matchesCol;
      const conditions = [];

      // Build query conditions based on filters
      if (orgId) {
        conditions.push(
          where('team1.orgId', '==', orgId),
          where('team2.orgId', '==', orgId)
        );
      }

      if (sport) {
        conditions.push(where('team1.sport', '==', sport));
        // Assuming both teams play the same sport
      }

      if (ageGroup) {
        conditions.push(where('team1.ageGroup', '==', ageGroup));
        // Assuming both teams are in same age group
      }

      if (status) {
        conditions.push(where('status', '==', status));
      }

      let snapshot;
      if (conditions.length > 0) {
        // For orgId, we need OR condition for team1 or team2
        if (orgId && conditions.length === 2) {
          const orgConditions = [
            where('team1.orgId', '==', orgId),
            where('team2.orgId', '==', orgId)
          ];
          snapshot = await getDocs(query(this.matchesCol, or(...orgConditions)));
        } else {
          snapshot = await getDocs(query(this.matchesCol, and(...conditions)));
        }
      } else {
        snapshot = await getDocs(this.matchesCol);
      }

      const matches = snapshot.docs.map(docSnap => ({ 
        id: docSnap.id, 
        ...docSnap.data() 
      }));

      // Additional client-side filtering for complex queries
      return matches.filter(match => {
        if (orgId && match.team1.orgId !== orgId && match.team2.orgId !== orgId) {
          return false;
        }
        if (sport && match.team1.sport !== sport) {
          return false;
        }
        if (ageGroup && match.team1.ageGroup !== ageGroup) {
          return false;
        }
        if (status && match.status !== status) {
          return false;
        }
        return true;
      });

    } catch (error) {
      throw new Error(`Failed to get matches: ${error.message}`);
    }
  }

  // Get match by ID
  async getMatchById(id) {
    try {
      const docSnap = await getDoc(doc(this.matchesCol, id));
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
      throw new Error(`Failed to get match: ${error.message}`);
    }
  }

  // Update match
  async updateMatch(id, updates) {
    try {
      const matchRef = doc(this.matchesCol, id);
      const matchSnap = await getDoc(matchRef);
      
      if (!matchSnap.exists()) {
        throw new Error('Match not found');
      }

      const currentData = matchSnap.data();
      
      // Prepare update data
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Handle team updates carefully
      if (updates.team1) {
        updateData.team1 = { ...currentData.team1, ...updates.team1 };
      }
      if (updates.team2) {
        updateData.team2 = { ...currentData.team2, ...updates.team2 };
      }

      // Update matchup if team names changed
      if ((updates.team1?.orgName || updates.team2?.orgName) && !updates.matchup) {
        updateData.matchup = `${updateData.team1?.orgName || currentData.team1.orgName} vs ${updateData.team2?.orgName || currentData.team2.orgName}`;
      }

      await updateDoc(matchRef, updateData);

      const updatedSnap = await getDoc(matchRef);
      return { id: updatedSnap.id, ...updatedSnap.data() };
    } catch (error) {
      throw new Error(`Failed to update match: ${error.message}`);
    }
  }

  // Delete match
  async deleteMatch(id) {
    try {
      const matchRef = doc(this.matchesCol, id);
      const matchSnap = await getDoc(matchRef);
      
      if (!matchSnap.exists()) {
        throw new Error('Match not found');
      }
      
      await deleteDoc(matchRef);
    } catch (error) {
      throw new Error(`Failed to delete match: ${error.message}`);
    }
  }

  // Delete all matches (use with caution)
  async deleteAllMatches() {
    try {
      const snapshot = await getDocs(this.matchesCol);
      const deletePromises = snapshot.docs.map(docSnap => 
        deleteDoc(doc(this.matchesCol, docSnap.id))
      );
      
      await Promise.all(deletePromises);
      
      return { 
        success: true, 
        message: `Successfully deleted ${snapshot.docs.length} matches`,
        count: snapshot.docs.length
      };
    } catch (error) {
      throw new Error(`Failed to delete all matches: ${error.message}`);
    }
  }

    // Delete multiple matches by IDs
    async deleteMultipleMatches(ids) {
      try {
        if (!Array.isArray(ids) || ids.length === 0) {
          throw new Error('Array of match IDs is required');
        }

        // Delete all matches (Firestore will handle non-existent IDs gracefully)
        const deletePromises = ids.map(id => 
          deleteDoc(doc(this.matchesCol, id))
        );
        
        const results = await Promise.allSettled(deletePromises);
        
        const successfulDeletes = results.filter(result => result.status === 'fulfilled').length;
        const failedDeletes = results.filter(result => result.status === 'rejected').length;
        
        return { 
          success: true, 
          message: `Successfully deleted ${successfulDeletes} matches, ${failedDeletes} failed`,
          successful: successfulDeletes,
          failed: failedDeletes,
          totalRequested: ids.length
        };
      } catch (error) {
        throw new Error(`Failed to delete multiple matches: ${error.message}`);
      }
    }

}

module.exports = new ExternalScheduleService();