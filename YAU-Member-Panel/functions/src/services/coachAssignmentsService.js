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
} = require("firebase/firestore");

class CoachAssignmentsService {
  static async getAssignments() {
    try {
      const snapshot = await getDocs(
        query(collection(db, "coach_assignments"), orderBy("createdAt", "desc"))
      );
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
      }));
    } catch (error) {
      console.error("Error getting assignments:", error);
      throw error;
    }
  }

  static async createAssignment(data) {
    try {
      const docRef = await addDoc(collection(db, "coach_assignments"), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creating assignment:", error);
      throw error;
    }
  }

  static async updateAssignment(id, updates) {
    try {
      const docRef = doc(db, "coach_assignments", id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Error updating assignment:", error);
      throw error;
    }
  }

  static async deleteAssignment(id) {
    try {
      const docRef = doc(db, "coach_assignments", id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error("Error deleting assignment:", error);
      throw error;
    }
  }
}

module.exports = CoachAssignmentsService;
