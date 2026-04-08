const admin = require("firebase-admin");
const { Timestamp } = require("firebase-admin/firestore");
const bcrypt = require("bcrypt");
const { toZonedTime, format } = require("date-fns-tz");

class PickupService {
  constructor() {
    this.db = admin.firestore();
    this.rosterCollection = 'pickup_rosters';
    this.studentCollection = 'pickup_roster_students';
    this.signoutCollection = 'pickup_signouts';
    this.userCollection = 'pickup_users';
    this.estTimeZone = 'America/New_York';
  }

  // ==================== TIMEZONE UTILITIES ====================
  // Convert to EST timezone and format as MM-DD-YYYY
  getESTDateString(date = new Date()) {
    try {
      // Convert current UTC date to EST timezone
      const estDate = toZonedTime(date, this.estTimeZone);
      
      // Format as MM-DD-YYYY
      return format(estDate, 'MM-dd-yyyy');
    } catch (error) {
      console.error('Error formatting EST date:', error);
      // Fallback: use current date and format manually
      const now = new Date();
      const estDate = toZonedTime(now, this.estTimeZone);
      return format(estDate, 'MM-dd-yyyy');
    }
  }

  // Get EST timestamp
  getESTTimestamp() {
    return Timestamp.now();
  }

  // Parse MM-DD-YYYY to Date object in EST
  parseESTDate(dateString) {
    try {
      const [month, day, year] = dateString.split('-').map(Number);
      // Create date in EST
      const date = new Date(year, month - 1, day);
      return date;
    } catch (error) {
      console.error('Error parsing EST date:', error);
      return new Date();
    }
  }

  // ==================== PICKUP ROSTERS ====================
  
  async createRoster(rosterData) {
    try {
      console.log('📋 Creating pickup roster:', rosterData);
      
      const rosterDoc = {
        school: rosterData.school,
        program: rosterData.program,
        grade: rosterData.grade,
        groupName: rosterData.groupName || null,
        days: rosterData.days || null,
        sessionStartDate: rosterData.sessionStartDate || null,
        sessionEndDate: rosterData.sessionEndDate || null,
        isActive: rosterData.isActive !== undefined ? rosterData.isActive : true,
        createdAt: Timestamp.now(),
        createdBy: rosterData.createdBy,
        updatedAt: Timestamp.now(),
        updatedBy: rosterData.createdBy
      };

      const docRef = await this.db.collection(this.rosterCollection).add(rosterDoc);
      
      console.log('✅ Roster created with ID:', docRef.id);
      return { id: docRef.id, ...rosterDoc };
    } catch (error) {
      console.error('❌ Error creating roster:', error);
      throw new Error(`Failed to create roster: ${error.message}`);
    }
  }

  async getAllRosters(filters = {}) {
    try {
      console.log('📋 Getting all pickup rosters with filters:', filters);
      
      const buildFilteredQuery = () => {
        let query = this.db.collection(this.rosterCollection);

        if (filters.school) {
          query = query.where('school', '==', filters.school);
        }

        if (filters.program) {
          query = query.where('program', '==', filters.program);
        }

        if (filters.grade) {
          query = query.where('grade', '==', filters.grade);
        }

        if (filters.isActive !== undefined) {
          query = query.where('isActive', '==', filters.isActive);
        }

        return query;
      };

      const mapSnapshotToRosters = (snapshot) => {
        const rosters = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          rosters.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
          });
        });

        return rosters;
      };

      const sortRostersInMemory = (rosters) => {
        // Newest first. If createdAt missing, keep stable-ish ordering.
        return rosters.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });
      };

      const isMissingIndexError = (err) => {
        const msg = `${err?.message || ''}`.toLowerCase();
        return err?.code === 9 || msg.includes('requires an index') || msg.includes('failed_precondition');
      };

      // Attempt 1: filtered query + server ordering (fastest when indexes exist)
      try {
        const snapshot = await buildFilteredQuery().orderBy('createdAt', 'desc').get();
        const rosters = mapSnapshotToRosters(snapshot);
        console.log(`✅ Retrieved ${rosters.length} rosters (server-ordered)`);
        return rosters;
      } catch (error) {
        if (!isMissingIndexError(error)) {
          throw error;
        }

        console.warn('⚠️ Missing Firestore index for roster query; falling back to in-memory sort/filter.');

        // Attempt 2: filtered query without orderBy (avoids many composite-index requirements)
        try {
          const snapshot = await buildFilteredQuery().get();
          const rosters = sortRostersInMemory(mapSnapshotToRosters(snapshot));
          console.log(`✅ Retrieved ${rosters.length} rosters (fallback: in-memory sort)`);
          return rosters;
        } catch (error2) {
          if (!isMissingIndexError(error2)) {
            throw error2;
          }

          // Attempt 3: fetch all + filter/sort in memory (MVP-safe; rosters set is usually small)
          const snapshot = await this.db.collection(this.rosterCollection).get();
          const allRosters = mapSnapshotToRosters(snapshot);

          const filtered = allRosters.filter((r) => {
            if (filters.school && r.school !== filters.school) return false;
            if (filters.program && r.program !== filters.program) return false;
            if (filters.grade && r.grade !== filters.grade) return false;
            if (filters.isActive !== undefined && r.isActive !== filters.isActive) return false;
            return true;
          });

          const rosters = sortRostersInMemory(filtered);
          console.log(`✅ Retrieved ${rosters.length} rosters (fallback: fetch-all + in-memory filter/sort)`);
          return rosters;
        }
      }
    } catch (error) {
      console.error('❌ Error getting rosters:', error);
      throw new Error(`Failed to get rosters: ${error.message}`);
    }
  }

  async getRosterById(rosterId) {
    try {
      const doc = await this.db.collection(this.rosterCollection).doc(rosterId).get();
      
      if (!doc.exists) {
        throw new Error('Roster not found');
      }

      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting roster:', error);
      throw error;
    }
  }

  async updateRoster(rosterId, updateData, updatedBy) {
    try {
      const rosterRef = this.db.collection(this.rosterCollection).doc(rosterId);
      const doc = await rosterRef.get();
      
      if (!doc.exists) {
        throw new Error('Roster not found');
      }

      const updateDoc = {
        ...updateData,
        updatedAt: Timestamp.now(),
        updatedBy: updatedBy
      };

      await rosterRef.update(updateDoc);
      
      console.log('✅ Roster updated:', rosterId);
      return { id: rosterId, ...updateDoc };
    } catch (error) {
      console.error('❌ Error updating roster:', error);
      throw new Error(`Failed to update roster: ${error.message}`);
    }
  }

  async deleteRoster(rosterId) {
    try {
      // Check if roster has students
      const studentsSnapshot = await this.db.collection(this.studentCollection)
        .where('rosterId', '==', rosterId)
        .limit(1)
        .get();

      if (!studentsSnapshot.empty) {
        throw new Error('Cannot delete roster with students. Remove students first.');
      }

      await this.db.collection(this.rosterCollection).doc(rosterId).delete();
      console.log('✅ Roster deleted:', rosterId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting roster:', error);
      throw error;
    }
  }

  // ==================== ROSTER STUDENTS ====================

  async addStudentToRoster(studentData) {
    try {
      console.log('👨‍🎓 Adding student to roster:', studentData);
      
      const studentDoc = {
        rosterId: studentData.rosterId,
        childName: studentData.childName,
        parentName: studentData.parentName,
        school: studentData.school,
        grade: studentData.grade,
        program: studentData.program,
        isActive: true,
        addedAt: Timestamp.now(),
        addedBy: studentData.addedBy,
        removedAt: null,
        removedBy: null
      };

      const docRef = await this.db.collection(this.studentCollection).add(studentDoc);
      
      console.log('✅ Student added with ID:', docRef.id);
      return { id: docRef.id, ...studentDoc };
    } catch (error) {
      console.error('❌ Error adding student:', error);
      throw new Error(`Failed to add student: ${error.message}`);
    }
  }

  async getStudentsByRoster(rosterId, filters = {}) {
    try {
      let query = this.db.collection(this.studentCollection)
        .where('rosterId', '==', rosterId);

      if (filters.isActive !== undefined) {
        query = query.where('isActive', '==', filters.isActive);
      }

      const snapshot = await query.get();
      const students = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        students.push({
          id: doc.id,
          ...data,
          addedAt: data.addedAt?.toDate?.()?.toISOString(),
          removedAt: data.removedAt?.toDate?.()?.toISOString() || null
        });
      });

      // Sort in-memory to avoid requiring composite Firestore indexes
      students.sort((a, b) => (a.childName || '').localeCompare(b.childName || ''));
      return students;
    } catch (error) {
      console.error('❌ Error getting students:', error);
      throw new Error(`Failed to get students: ${error.message}`);
    }
  }

  async updateStudent(studentId, updateData, updatedBy) {
    try {
      const studentRef = this.db.collection(this.studentCollection).doc(studentId);
      const doc = await studentRef.get();
      
      if (!doc.exists) {
        throw new Error('Student not found');
      }

      await studentRef.update(updateData);
      
      console.log('✅ Student updated:', studentId);
      return true;
    } catch (error) {
      console.error('❌ Error updating student:', error);
      throw error;
    }
  }

  async deleteStudent(studentId, deletedBy) {
    try {
      const studentRef = this.db.collection(this.studentCollection).doc(studentId);
      
      await studentRef.update({
        isActive: false,
        removedAt: Timestamp.now(),
        removedBy: deletedBy
      });
      
      console.log('✅ Student deleted (soft):', studentId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting student:', error);
      throw error;
    }
  }

  async bulkAddStudents(students, rosterId, addedBy) {
    try {
      const batch = this.db.batch();
      const addedStudents = [];

      for (const student of students) {
        const studentRef = this.db.collection(this.studentCollection).doc();
        const studentDoc = {
          rosterId: rosterId,
          childName: student.childName,
          parentName: student.parentName,
          school: student.school,
          grade: student.grade,
          program: student.program,
          isActive: true,
          addedAt: Timestamp.now(),
          addedBy: addedBy,
          removedAt: null,
          removedBy: null
        };
        
        batch.set(studentRef, studentDoc);
        addedStudents.push({ id: studentRef.id, ...studentDoc });
      }

      await batch.commit();
      console.log(`✅ Bulk added ${addedStudents.length} students`);
      return addedStudents;
    } catch (error) {
      console.error('❌ Error bulk adding students:', error);
      throw new Error(`Failed to bulk add students: ${error.message}`);
    }
  }

  // ==================== SIGN-OUTS ====================

  async createSignOut(signOutData) {
    try {
      console.log('✍️ Creating sign-out:', signOutData);
      
      const dateString = this.getESTDateString();
      
      // Check if already signed out today
      const existingSignOut = await this.db.collection(this.signoutCollection)
        .where('studentId', '==', signOutData.studentId)
        .where('date', '==', dateString)
        .limit(1)
        .get();

      if (!existingSignOut.empty) {
        const existing = existingSignOut.docs[0].data();
        throw new Error(`Student already signed out at ${existing.signOutTime?.toDate?.()?.toLocaleString() || 'unknown time'}`);
      }

      const signOutDoc = {
        studentId: signOutData.studentId,
        rosterId: signOutData.rosterId,
        date: dateString, // MM-DD-YYYY format
        signOutTime: Timestamp.now(),
        parentGuardianName: signOutData.parentGuardianName,
        notes: signOutData.notes || null,
        signedOutBy: signOutData.signedOutBy,
        createdAt: Timestamp.now()
      };

      const docRef = await this.db.collection(this.signoutCollection).add(signOutDoc);
      
      console.log('✅ Sign-out created with ID:', docRef.id);
      return { id: docRef.id, ...signOutDoc };
    } catch (error) {
      console.error('❌ Error creating sign-out:', error);
      throw error;
    }
  }

  async getSignOutsByRoster(rosterId, date = null) {
    try {
      const dateString = date || this.getESTDateString();
      
      const mapSnapshotToSignOuts = (snapshot) => {
        const signOuts = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          signOuts.push({
            id: doc.id,
            ...data,
            signOutTime: data.signOutTime?.toDate?.()?.toISOString(),
            createdAt: data.createdAt?.toDate?.()?.toISOString(),
          });
        });

        return signOuts;
      };

      const sortSignOutsInMemory = (signOuts) => {
        // Newest first. If signOutTime missing, keep stable-ish ordering.
        return signOuts.sort((a, b) => {
          const aTime = a.signOutTime ? new Date(a.signOutTime).getTime() : 0;
          const bTime = b.signOutTime ? new Date(b.signOutTime).getTime() : 0;
          return bTime - aTime;
        });
      };

      const isMissingIndexError = (err) => {
        const msg = `${err?.message || ''}`.toLowerCase();
        return err?.code === 9 || msg.includes('requires an index') || msg.includes('failed_precondition');
      };

      const baseQuery = this.db.collection(this.signoutCollection)
        .where('rosterId', '==', rosterId)
        .where('date', '==', dateString);

      // Attempt 1: server ordering (requires composite index in many cases)
      try {
        const snapshot = await baseQuery.orderBy('signOutTime', 'desc').get();
        return mapSnapshotToSignOuts(snapshot);
      } catch (error) {
        if (!isMissingIndexError(error)) {
          throw error;
        }

        console.warn('⚠️ Missing Firestore index for signouts-by-roster query; falling back to in-memory sort.');

        // Attempt 2: no orderBy (often avoids composite index requirement)
        const snapshot = await baseQuery.get();
        return sortSignOutsInMemory(mapSnapshotToSignOuts(snapshot));
      }
    } catch (error) {
      console.error('❌ Error getting sign-outs:', error);
      throw new Error(`Failed to get sign-outs: ${error.message}`);
    }
  }

  async getSignOutsByStudent(studentId, date = null) {
    try {
      const dateString = date || this.getESTDateString();
      
      const snapshot = await this.db.collection(this.signoutCollection)
        .where('studentId', '==', studentId)
        .where('date', '==', dateString)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        signOutTime: data.signOutTime?.toDate?.()?.toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting student sign-out:', error);
      throw error;
    }
  }

  async getAllSignOuts(filters = {}) {
    try {
      let query = this.db.collection(this.signoutCollection);

      if (filters.rosterId) {
        query = query.where('rosterId', '==', filters.rosterId);
      }

      if (filters.studentId) {
        query = query.where('studentId', '==', filters.studentId);
      }

      if (filters.date) {
        query = query.where('date', '==', filters.date);
      }

      if (filters.startDate && filters.endDate) {
        // Note: Firestore doesn't support range queries on string fields easily
        // This is a simplified version - may need refinement
        query = query.where('date', '>=', filters.startDate)
                     .where('date', '<=', filters.endDate);
      }

      const mapSnapshotToSignOuts = (snapshot) => {
        const signOuts = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          signOuts.push({
            id: doc.id,
            ...data,
            signOutTime: data.signOutTime?.toDate?.()?.toISOString(),
            createdAt: data.createdAt?.toDate?.()?.toISOString(),
          });
        });

        return signOuts;
      };

      const sortSignOutsInMemory = (signOuts) => {
        // Newest first. If signOutTime missing, keep stable-ish ordering.
        return signOuts.sort((a, b) => {
          const aTime = a.signOutTime ? new Date(a.signOutTime).getTime() : 0;
          const bTime = b.signOutTime ? new Date(b.signOutTime).getTime() : 0;
          return bTime - aTime;
        });
      };

      const isMissingIndexError = (err) => {
        const msg = `${err?.message || ''}`.toLowerCase();
        return err?.code === 9 || msg.includes('requires an index') || msg.includes('failed_precondition');
      };

      // Attempt 1: server ordering (fastest if indexes exist)
      try {
        let orderedQuery = query.orderBy('signOutTime', 'desc');

        if (filters.limit) {
          orderedQuery = orderedQuery.limit(parseInt(filters.limit));
        }

        const snapshot = await orderedQuery.get();
        return mapSnapshotToSignOuts(snapshot);
      } catch (error) {
        if (!isMissingIndexError(error)) {
          throw error;
        }

        console.warn('⚠️ Missing Firestore index for getAllSignOuts query; falling back to in-memory sort.');

        // Fallback: fetch without orderBy then sort in memory.
        // Note: if Firestore still requires indexes for the where-combination, last-resort fetch-all is used.
        try {
          let unorderedQuery = query;
          if (filters.limit) {
            unorderedQuery = unorderedQuery.limit(parseInt(filters.limit));
          }
          const snapshot = await unorderedQuery.get();
          return sortSignOutsInMemory(mapSnapshotToSignOuts(snapshot));
        } catch (error2) {
          if (!isMissingIndexError(error2)) {
            throw error2;
          }

          const snapshot = await this.db.collection(this.signoutCollection).get();
          const all = mapSnapshotToSignOuts(snapshot);

          const filtered = all.filter((s) => {
            if (filters.rosterId && s.rosterId !== filters.rosterId) return false;
            if (filters.studentId && s.studentId !== filters.studentId) return false;
            if (filters.date && s.date !== filters.date) return false;

            // startDate/endDate are string comparisons; this matches existing behavior (but see note in code above).
            if (filters.startDate && filters.endDate) {
              if (typeof s.date !== 'string') return false;
              if (s.date < filters.startDate) return false;
              if (s.date > filters.endDate) return false;
            }

            return true;
          });

          const sorted = sortSignOutsInMemory(filtered);
          return filters.limit ? sorted.slice(0, parseInt(filters.limit)) : sorted;
        }
      }
    } catch (error) {
      console.error('❌ Error getting sign-outs:', error);
      throw new Error(`Failed to get sign-outs: ${error.message}`);
    }
  }

  // ==================== PICKUP USERS ====================

  async createPickupUser(userData) {
    try {
      console.log('👤 Creating pickup user:', userData.username);
      
      // Check if username already exists
      const existingUser = await this.db.collection(this.userCollection)
        .where('username', '==', userData.username.toLowerCase().trim())
        .limit(1)
        .get();

      if (!existingUser.empty) {
        throw new Error('Username already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const userDoc = {
        username: userData.username.toLowerCase().trim(),
        password: hashedPassword,
        role: userData.role || 'coach',
        isShared: userData.isShared || false,
        notes: userData.notes || null,
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        createdAt: Timestamp.now(),
        createdBy: userData.createdBy,
        updatedAt: Timestamp.now(),
        updatedBy: userData.createdBy,
        lastLoginAt: null,
        lastLoginIP: null
      };

      const docRef = await this.db.collection(this.userCollection).add(userDoc);
      
      // Don't return password
      const { password, ...userWithoutPassword } = userDoc;
      
      console.log('✅ Pickup user created with ID:', docRef.id);
      return { id: docRef.id, ...userWithoutPassword };
    } catch (error) {
      console.error('❌ Error creating pickup user:', error);
      throw error;
    }
  }

  async getAllPickupUsers(filters = {}) {
    try {
      let query = this.db.collection(this.userCollection);

      if (filters.role) {
        query = query.where('role', '==', filters.role);
      }

      if (filters.isActive !== undefined) {
        query = query.where('isActive', '==', filters.isActive);
      }

      query = query.orderBy('createdAt', 'desc');

      const snapshot = await query.get();
      const users = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        const { password, ...userWithoutPassword } = data;
        users.push({
          id: doc.id,
          ...userWithoutPassword,
          createdAt: data.createdAt?.toDate?.()?.toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
          lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() || null
        });
      });

      return users;
    } catch (error) {
      console.error('❌ Error getting pickup users:', error);
      throw new Error(`Failed to get pickup users: ${error.message}`);
    }
  }

  async getPickupUserById(userId) {
    try {
      const doc = await this.db.collection(this.userCollection).doc(userId).get();
      
      if (!doc.exists) {
        throw new Error('Pickup user not found');
      }

      const data = doc.data();
      const { password, ...userWithoutPassword } = data;
      return {
        id: doc.id,
        ...userWithoutPassword,
        createdAt: data.createdAt?.toDate?.()?.toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
        lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() || null
      };
    } catch (error) {
      console.error('❌ Error getting pickup user:', error);
      throw error;
    }
  }

  async updatePickupUser(userId, updateData, updatedBy) {
    try {
      const userRef = this.db.collection(this.userCollection).doc(userId);
      const doc = await userRef.get();
      
      if (!doc.exists) {
        throw new Error('Pickup user not found');
      }

      // Don't allow username updates via this method (to prevent conflicts)
      const { username, password, ...safeUpdateData } = updateData;

      const updateDoc = {
        ...safeUpdateData,
        updatedAt: Timestamp.now(),
        updatedBy: updatedBy
      };

      await userRef.update(updateDoc);
      
      console.log('✅ Pickup user updated:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error updating pickup user:', error);
      throw error;
    }
  }

  async resetPickupUserPassword(userId, newPassword, updatedBy) {
    try {
      const userRef = this.db.collection(this.userCollection).doc(userId);
      const doc = await userRef.get();
      
      if (!doc.exists) {
        throw new Error('Pickup user not found');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await userRef.update({
        password: hashedPassword,
        updatedAt: Timestamp.now(),
        updatedBy: updatedBy
      });
      
      console.log('✅ Pickup user password reset:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error resetting password:', error);
      throw error;
    }
  }

  async deletePickupUser(userId) {
    try {
      await this.db.collection(this.userCollection).doc(userId).delete();
      console.log('✅ Pickup user deleted:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting pickup user:', error);
      throw error;
    }
  }

  async authenticatePickupUser(username, password) {
    try {
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      const snapshot = await this.db.collection(this.userCollection)
        .where('username', '==', username.toLowerCase().trim())
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new Error('Invalid username or password');
      }

      const doc = snapshot.docs[0];
      const userData = doc.data();

      // Verify password
      const isValid = await bcrypt.compare(password, userData.password);

      if (!isValid) {
        throw new Error('Invalid username or password');
      }

      // Update last login
      await doc.ref.update({
        lastLoginAt: Timestamp.now()
      });

      const { password: pwd, ...userWithoutPassword } = userData;
      return {
        id: doc.id,
        ...userWithoutPassword
      };
    } catch (error) {
      console.error('❌ Authentication error:', error);
      throw error;
    }
  }
}

module.exports = new PickupService();
