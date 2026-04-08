import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../config';

const ASSIGNMENTS_COLLECTION = 'coach_assignments';

/**
 * Creates a new coach assignment
 */
export const createCoachAssignment = async (assignmentData) => {
  try {
    const docRef = await addDoc(collection(db, ASSIGNMENTS_COLLECTION), {
      ...assignmentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: docRef.id, ...assignmentData };
  } catch (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }
};

/**
 * Fetches all assignments, optionally filtered by coachId
 */
export const getCoachAssignments = async (coachId = null) => {
  try {
    
    let q;
    const assignmentsRef = collection(db, ASSIGNMENTS_COLLECTION);
    
    if (coachId) {
      q = query(assignmentsRef, where('coachId', '==', coachId));
    } else {
      // For Admin view, fetch all. You could add orderBy if needed.
      q = query(assignmentsRef);
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }
};

/**
 * Updates an existing assignment
 */
export const updateCoachAssignment = async (assignmentId, updateData) => {
  try {
    const docRef = doc(db, ASSIGNMENTS_COLLECTION, assignmentId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating assignment:', error);
    throw error;
  }
};

/**
 * Deletes an assignment
 */
export const deleteCoachAssignment = async (assignmentId) => {
  try {
    const docRef = doc(db, ASSIGNMENTS_COLLECTION, assignmentId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting assignment:', error);
    throw error;
  }
};
