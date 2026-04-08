const { db } = require("../utils/firebase");
const {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  documentId,
  startAfter,
  writeBatch,
  serverTimestamp,
} = require("firebase/firestore");

const {
  normalizeText,
  normalizeKey,
  digitsOnlyPhone,
  splitMulti,
  parseYesNo,
  pickFirstExisting,
} = require("../utils/pickupNormalize");

const STUDENTS_COLLECTION = "pickupSchoolStudents";
const SCHOOLS_COLLECTION = "pickupSchools";
const PickupSchoolService = require("./pickupSchoolService");

function computeStudentKey({ schoolId, studentFirstName, studentLastName, parentEmail, parentPhone }) {
  const fn = normalizeKey(studentFirstName);
  const ln = normalizeKey(studentLastName);
  const email = normalizeKey(parentEmail);
  const phone = digitsOnlyPhone(parentPhone);
  const parentId = email || phone || "unknown-parent";
  return `${schoolId}|${fn}|${ln}|${parentId}`;
}

async function resolveSchoolIdByName(schoolName) {
  const schoolKey = normalizeKey(schoolName);
  if (!schoolKey) return null;
  const snap = await getDocs(
    query(collection(db, SCHOOLS_COLLECTION), where("schoolKey", "==", schoolKey), limit(1))
  );
  if (snap.empty) return null;
  return snap.docs[0].id;
}

class PickupSchoolStudentService {
  static async listStudentsBySchool(schoolId, filters = {}) {
    const { isActive, grade, sport } = filters;
    const whereConstraints = [where("schoolId", "==", schoolId)];
    if (isActive !== null && isActive !== undefined) whereConstraints.push(where("isActive", "==", isActive));
    if (grade) whereConstraints.push(where("grade", "==", grade));
    // Sport filter cannot be done without array-contains; we can use it if sport is provided.
    if (sport) whereConstraints.push(where("sports", "array-contains", sport));

    // Prefer ordering by createdAt if indexed; fallback if not.
    try {
      const q = query(collection(db, STUDENTS_COLLECTION), ...whereConstraints, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      const snap = await getDocs(query(collection(db, STUDENTS_COLLECTION), ...whereConstraints));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  }

  static async getStudentById(studentId) {
    const snap = await getDoc(doc(db, STUDENTS_COLLECTION, studentId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  }

  static async _findByStudentKey(studentKey) {
    const snap = await getDocs(
      query(collection(db, STUDENTS_COLLECTION), where("studentKey", "==", studentKey), limit(1))
    );
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }

  static async createStudent(schoolId, payload, createdBy = null, options = {}) {
    const studentFirstName = normalizeText(payload?.studentFirstName);
    const studentLastName = normalizeText(payload?.studentLastName);
    const parentFirstName = normalizeText(payload?.parentFirstName);
    const parentLastName = normalizeText(payload?.parentLastName);
    const parentEmail = normalizeText(payload?.parentEmail);
    const parentPhone = normalizeText(payload?.parentPhone);
    const grade = normalizeText(payload?.grade);
    const sports = splitMulti(payload?.sports, { preferredDelimiter: "," });

    const seasons = Array.isArray(payload?.seasons) ? payload.seasons.map(normalizeText).filter(Boolean) : [];
    const season1 = payload?.season1 === true;
    const season2 = payload?.season2 === true;
    const season3 = payload?.season3 === true;
    const season4 = payload?.season4 === true;

    if (!studentFirstName) throw new Error("Missing studentFirstName");
    if (!studentLastName) throw new Error("Missing studentLastName");
    if (!parentFirstName) throw new Error("Missing parentFirstName");
    if (!parentLastName) throw new Error("Missing parentLastName");
    if (!grade) throw new Error("Missing grade");
    if (!sports.length) throw new Error("Missing sports");

    const studentKey = computeStudentKey({
      schoolId,
      studentFirstName,
      studentLastName,
      parentEmail,
      parentPhone,
    });

    const existing = await this._findByStudentKey(studentKey);
    if (existing) throw new Error("Student already exists for this school (duplicate)");

    const createdSource =
      typeof options?.createdSource === "string" && options.createdSource.trim()
        ? options.createdSource.trim()
        : createdBy
          ? "admin"
          : "unknown";
    const enrollmentId =
      typeof options?.enrollmentId === "string" && options.enrollmentId.trim() ? options.enrollmentId.trim() : null;

    const ref = await addDoc(collection(db, STUDENTS_COLLECTION), {
      schoolId,
      studentFirstName,
      studentLastName,
      parentFirstName,
      parentLastName,
      parentEmail: parentEmail ? parentEmail.toLowerCase() : null,
      parentPhone: digitsOnlyPhone(parentPhone) || null,
      grade,
      sports,
      // Option A (seasons apply overall); we store both for convenience
      seasons,
      season1,
      season2,
      season3,
      season4,
      studentKey,
      isActive: true,
      createdBy: createdBy || null,
      createdSource,
      enrollmentId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return ref.id;
  }

  static async updateStudent(studentId, updates, updatedBy = null) {
    const clean = {};
    Object.keys(updates || {}).forEach((k) => {
      if (updates[k] !== undefined) clean[k] = updates[k];
    });

    if (clean.studentFirstName !== undefined) clean.studentFirstName = normalizeText(clean.studentFirstName);
    if (clean.studentLastName !== undefined) clean.studentLastName = normalizeText(clean.studentLastName);
    if (clean.parentFirstName !== undefined) clean.parentFirstName = normalizeText(clean.parentFirstName);
    if (clean.parentLastName !== undefined) clean.parentLastName = normalizeText(clean.parentLastName);
    if (clean.parentEmail !== undefined) clean.parentEmail = normalizeText(clean.parentEmail) || null;
    if (clean.parentPhone !== undefined) clean.parentPhone = digitsOnlyPhone(clean.parentPhone) || null;
    if (clean.grade !== undefined) clean.grade = normalizeText(clean.grade);
    if (clean.sports !== undefined) clean.sports = splitMulti(clean.sports, { preferredDelimiter: "," });

    if (clean.seasons !== undefined && Array.isArray(clean.seasons)) {
      clean.seasons = clean.seasons.map(normalizeText).filter(Boolean);
    }

    if (updatedBy && !clean.updatedBy) clean.updatedBy = updatedBy;
    clean.updatedAt = serverTimestamp();
    await updateDoc(doc(db, STUDENTS_COLLECTION, studentId), clean);
  }

  static async deleteStudent(studentId) {
    // Hard delete
    await deleteDoc(doc(db, STUDENTS_COLLECTION, studentId));
  }

  /**
   * Hard-delete students by schoolIds.
   * Returns useful counts for admin UI.
   */
  static async hardDeleteStudentsBySchoolIds(schoolIds, options = {}) {
    if (!Array.isArray(schoolIds) || schoolIds.length === 0) {
      throw new Error("schoolIds (non-empty array) is required");
    }

    const maxToDelete =
      Number.isFinite(Number(options.maxToDelete)) && Number(options.maxToDelete) > 0
        ? Number(options.maxToDelete)
        : 50000;

    let scannedCount = 0;
    let deletedCount = 0;
    let batches = 0;
    const maxQueryLimit = 10000; // Firestore structured query limit max

    // Firestore "in" supports max 30 values; chunk schoolIds to be safe.
    const chunks = [];
    for (let i = 0; i < schoolIds.length; i += 30) chunks.push(schoolIds.slice(i, i + 30));

    for (const chunk of chunks) {
      let lastDoc = null;

      while (deletedCount < maxToDelete) {
        const remaining = maxToDelete - deletedCount;
        const pageSize = Math.min(maxQueryLimit, remaining);

        const qParts = [
          collection(db, STUDENTS_COLLECTION),
          where("schoolId", "in", chunk),
          orderBy(documentId()),
          ...(lastDoc ? [startAfter(lastDoc)] : []),
          limit(pageSize),
        ];

        const snap = await getDocs(query(...qParts));
        if (snap.empty) break;

        scannedCount += snap.size;
        const docs = snap.docs;

        // Batch writes max 500 ops (keep headroom)
        for (let i = 0; i < docs.length; i += 450) {
          const slice = docs.slice(i, i + 450);
          const batch = writeBatch(db);
          slice.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          deletedCount += slice.length;
          batches += 1;

          if (deletedCount >= maxToDelete) {
            return { scannedCount, deletedCount, batches, truncated: true };
          }
        }

        lastDoc = docs[docs.length - 1];
      }
    }

    return { scannedCount, deletedCount, batches, truncated: false };
  }

  /**
   * Hard-delete specific students by id, optionally validating they belong to a given schoolId.
   */
  static async hardDeleteStudentsByIds(studentIds, options = {}) {
    const { schoolId = null } = options || {};
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new Error("studentIds (non-empty array) is required");
    }

    let scannedCount = 0;
    let deletedCount = 0;
    let notFoundCount = 0;
    let wrongSchoolCount = 0;
    let batches = 0;

    // Firestore "in" supports max 30 values
    const chunks = [];
    for (let i = 0; i < studentIds.length; i += 30) chunks.push(studentIds.slice(i, i + 30));

    for (const chunk of chunks) {
      const snap = await getDocs(
        query(collection(db, STUDENTS_COLLECTION), where(documentId(), "in", chunk))
      );
      scannedCount += chunk.length;

      const foundById = new Map(snap.docs.map((d) => [d.id, d]));
      // Count missing
      chunk.forEach((id) => {
        if (!foundById.has(id)) notFoundCount += 1;
      });

      // Filter by schoolId if provided
      const toDelete = [];
      for (const d of snap.docs) {
        if (schoolId && d.data()?.schoolId !== schoolId) {
          wrongSchoolCount += 1;
          continue;
        }
        toDelete.push(d);
      }

      // Batch deletes max 500 ops
      for (let i = 0; i < toDelete.length; i += 450) {
        const slice = toDelete.slice(i, i + 450);
        const batch = writeBatch(db);
        slice.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        deletedCount += slice.length;
        batches += 1;
      }
    }

    return {
      scannedCount,
      deletedCount,
      notFoundCount,
      wrongSchoolCount,
      batches,
    };
  }

  /**
   * Bulk upsert students from JSON rows.
   * Intended for frontend chunking (e.g., 50 rows/request).
   *
   * Payload:
   * {
   *   mode?: "upsert" | "create_only",
   *   rows: object[],
   *   columnMap?: {...}
   * }
   */
  static async bulkUpsertRows(payload, adminId = null) {
    const { mode = "upsert", rows, columnMap = {}, createMissingSchools = false } = payload || {};
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("rows (non-empty array) is required");

    const map = {
      parentFirstName: "Parent First Name",
      parentLastName: "Parent Last Name",
      parentEmail: "Email",
      parentPhone: "Mobile Number",
      studentFirstName: "Student First Name",
      studentLastName: "Student Last Name",
      schoolName: "School Name",
      grade: "Grade",
      sports: "Sports",
      season1: "Season 1",
      season2: "Season 2",
      season3: "Season 3",
      season4: "Season 4",
      ...columnMap,
    };

    const summary = {
      mode,
      createMissingSchools: Boolean(createMissingSchools),
      rowsReceived: rows.length,
      created: 0,
      updated: 0,
      skippedExisting: 0,
      errors: 0,
      results: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      try {
        const parentFirstName = normalizeText(
          pickFirstExisting(row, [map.parentFirstName, "First Name", "firstName", "parentFirstName"])
        );
        const parentLastName = normalizeText(
          pickFirstExisting(row, [map.parentLastName, "Last Name", "lastName", "parentLastName"])
        );
        const parentEmail = normalizeText(pickFirstExisting(row, [map.parentEmail, "email", "parentEmail"]));
        const parentPhone = normalizeText(
          pickFirstExisting(row, [map.parentPhone, "Mobile Number", "mobile", "phone", "parentPhone"])
        );

        const studentFirstName = normalizeText(
          pickFirstExisting(row, [map.studentFirstName, "Student Name (First Name)", "studentFirstName"])
        );
        const studentLastName = normalizeText(
          pickFirstExisting(row, [map.studentLastName, "Student Name (Last Name)", "studentLastName"])
        );

        const grade = normalizeText(
          pickFirstExisting(row, [map.grade, "Your Student's Current Grade ?", "Current Grade", "grade"])
        );
        const sports = splitMulti(
          pickFirstExisting(row, [map.sports, "Which sport would your student like to play?", "sports"]),
          { preferredDelimiter: "," }
        );

        const schoolName = normalizeText(
          pickFirstExisting(row, [
            map.schoolName,
            "What school does your student attend?",
            "What school does your child attend?",
            "school",
            "School",
          ])
        );
        let schoolId = row?.schoolId || (schoolName ? await resolveSchoolIdByName(schoolName) : null);
        let schoolCreated = false;
        if (!schoolId && createMissingSchools && schoolName) {
          const ensured = await PickupSchoolService.getOrCreateByName(
            schoolName,
            { sports, mergeSports: true },
            adminId
          );
          schoolId = ensured.id;
          schoolCreated = ensured.created;
        }

        if (!schoolId) throw new Error("Missing school (schoolId or School Name must match existing school)");
        if (!studentFirstName) throw new Error("Missing student first name");
        if (!studentLastName) throw new Error("Missing student last name");
        if (!parentFirstName) throw new Error("Missing parent first name");
        if (!parentLastName) throw new Error("Missing parent last name");
        if (!grade) throw new Error("Missing grade");
        if (!sports.length) throw new Error("Missing sports");

        const season1 = parseYesNo(pickFirstExisting(row, [map.season1, "season1"]));
        const season2 = parseYesNo(pickFirstExisting(row, [map.season2, "season2"]));
        const season3 = parseYesNo(pickFirstExisting(row, [map.season3, "season3"]));
        const season4 = parseYesNo(pickFirstExisting(row, [map.season4, "season4"]));

        const seasons = [];
        if (season1) seasons.push("Season 1");
        if (season2) seasons.push("Season 2");
        if (season3) seasons.push("Season 3");
        if (season4) seasons.push("Season 4");

        const studentKey = computeStudentKey({
          schoolId,
          studentFirstName,
          studentLastName,
          parentEmail,
          parentPhone,
        });

        const existing = await this._findByStudentKey(studentKey);

        const studentDoc = {
          schoolId,
          studentFirstName,
          studentLastName,
          parentFirstName,
          parentLastName,
          parentEmail: parentEmail ? parentEmail.toLowerCase() : null,
          parentPhone: digitsOnlyPhone(parentPhone) || null,
          grade,
          sports,
          seasons,
          season1,
          season2,
          season3,
          season4,
          studentKey,
          isActive: true,
          updatedBy: adminId || null,
          updatedAt: serverTimestamp(),
        };

        if (existing) {
          if (mode === "create_only") {
            summary.skippedExisting += 1;
            summary.results.push({ rowIndex: i, action: "skipped_existing", studentId: existing.id });
            continue;
          }
          await updateDoc(doc(db, STUDENTS_COLLECTION, existing.id), studentDoc);
          summary.updated += 1;
          summary.results.push({
            rowIndex: i,
            action: "updated",
            studentId: existing.id,
            schoolId,
            schoolName: schoolName || null,
            schoolCreated,
          });
        } else {
          const ref = await addDoc(collection(db, STUDENTS_COLLECTION), {
            ...studentDoc,
            createdBy: adminId || null,
            createdAt: serverTimestamp(),
          });
          summary.created += 1;
          summary.results.push({
            rowIndex: i,
            action: "created",
            studentId: ref.id,
            schoolId,
            schoolName: schoolName || null,
            schoolCreated,
          });
        }
      } catch (err) {
        summary.errors += 1;
        summary.results.push({ rowIndex: i, action: "error", error: err?.message || String(err) });
      }
    }

    return summary;
  }
}

module.exports = PickupSchoolStudentService;

