import { db } from "../../../firebase/config.js"; 
import { doc, getDoc, updateDoc } from "firebase/firestore";

/**
 * Delete a child/student from the parent's document in Firestore
 * @param {string} memberId - The parent/member document ID
 * @param {string} childUid - The child's UID to remove
 * @returns {Promise<void>}
 */
export async function deleteStudentDoc(memberId, childUid) {
  if (!memberId || !childUid) {
    throw new Error("memberId and childUid are required");
  }

  const parentRef = doc(db, "members", memberId);
  const parentSnap = await getDoc(parentRef);

  if (!parentSnap.exists()) {
    throw new Error("Parent not found");
  }

  const parentData = parentSnap.data();

  // filter out the child
  const updatedStudents = (parentData.students || []).filter(
    (student) => student.uid !== childUid
  );

  await updateDoc(parentRef, { students: updatedStudents });
}
