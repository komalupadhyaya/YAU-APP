const { db } = require("../utils/firebase");
const {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit: fsLimit,
  serverTimestamp,
} = require("firebase/firestore");

const COLLECTION = "pickupSignouts";

function toDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

class PickupSignoutService {
  static async createSignout(data, signedOutBy = null) {
    const dateKey = toDateKey(data.date || new Date()) || toDateKey(new Date());
    const docData = {
      // New school-based pickup fields
      schoolId: data.schoolId,
      schoolStudentId: data.schoolStudentId,
      // Legacy fields (kept for backward compatibility if any old data exists)
      studentId: data.studentId || null,
      rosterId: data.rosterId || null,

      parentGuardianName: (data.parentGuardianName || "").trim(),
      notes: data.notes ? String(data.notes).trim() : null,
      signedOutBy: data.signedOutBy || signedOutBy || null,
      date: dateKey,
      signedOutAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, COLLECTION), docData);
    return ref.id;
  }

  static async listSignoutsBySchool(schoolId, date = null) {
    const whereConstraints = [where("schoolId", "==", schoolId)];
    if (date) whereConstraints.push(where("date", "==", date));

    try {
      const q = query(
        collection(db, COLLECTION),
        ...whereConstraints,
        orderBy("signedOutAt", "desc")
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      const q = query(collection(db, COLLECTION), ...whereConstraints);
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  }

  static async listSignouts(filters = {}) {
    const { schoolId, schoolStudentId, rosterId, studentId, date, startDate, endDate, limit } = filters;
    const whereConstraints = [];

    if (schoolId) whereConstraints.push(where("schoolId", "==", schoolId));
    if (schoolStudentId) whereConstraints.push(where("schoolStudentId", "==", schoolStudentId));
    if (rosterId) whereConstraints.push(where("rosterId", "==", rosterId));
    if (studentId) whereConstraints.push(where("studentId", "==", studentId));
    if (date) whereConstraints.push(where("date", "==", date));
    if (startDate) whereConstraints.push(where("date", ">=", startDate));
    if (endDate) whereConstraints.push(where("date", "<=", endDate));

    const qParts = [collection(db, COLLECTION), ...whereConstraints, orderBy("date", "desc")];
    if (limit) qParts.push(fsLimit(limit));

    let q;
    try {
      q = query(...qParts);
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      // Fallback: drop orderBy/limit if indexing not available
      q = whereConstraints.length
        ? query(collection(db, COLLECTION), ...whereConstraints)
        : collection(db, COLLECTION);
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return limit ? rows.slice(0, limit) : rows;
    }
  }
}

module.exports = PickupSignoutService;

