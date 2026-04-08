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
  writeBatch,
  serverTimestamp,
  getCountFromServer,
} = require("firebase/firestore");

const { normalizeText, normalizeKey, splitMulti } = require("../utils/pickupNormalize");

const COLLECTION = "pickupSchools";
const STUDENTS_COLLECTION = "pickupSchoolStudents";

function computeSchoolKey(name) {
  // Unique by normalized name
  return normalizeKey(name);
}

class PickupSchoolService {
  static async listSchools(filters = {}) {
    const { isActive, q } = filters;
    const whereConstraints = [];
    if (isActive !== null && isActive !== undefined) whereConstraints.push(where("isActive", "==", isActive));

    // Firestore can't do contains across multiple fields; we do a simple client filter when q is provided.
    // Also, some combinations (where + orderBy) require composite indexes; gracefully fallback if missing.
    let items = [];
    try {
      const baseQuery = query(
        collection(db, COLLECTION),
        ...whereConstraints,
        orderBy("createdAt", "desc"),
        limit(500)
      );
      const snap = await getDocs(baseQuery);
      items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      const baseQuery = query(collection(db, COLLECTION), ...whereConstraints, limit(500));
      const snap = await getDocs(baseQuery);
      items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Best-effort client sort (timestamps can be Firestore Timestamp objects in responses)
      items.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const tb = b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return tb - ta;
      });
    }

    // Add student count for each school
    // Using Promise.all to fetch counts in parallel for better performance
    const itemsWithCounts = await Promise.all(
      items.map(async (school) => {
        try {
          const countQuery = query(
            collection(db, STUDENTS_COLLECTION),
            where("schoolId", "==", school.id)
          );
          const countSnapshot = await getCountFromServer(countQuery);
          return {
            ...school,
            studentCount: countSnapshot.data().count,
          };
        } catch (err) {
          // If count query fails (e.g., missing index or API issue), fallback to fetching docs
          console.warn(`Failed to get student count for school ${school.id}:`, err.message);
          try {
            const studentsQuery = query(
              collection(db, STUDENTS_COLLECTION),
              where("schoolId", "==", school.id)
            );
            const studentsSnap = await getDocs(studentsQuery);
            return {
              ...school,
              studentCount: studentsSnap.size,
            };
          } catch (fallbackErr) {
            // If even the fallback fails, return 0 to prevent breaking the response
            console.error(`Failed to get student count (fallback) for school ${school.id}:`, fallbackErr.message);
            return {
              ...school,
              studentCount: 0,
            };
          }
        }
      })
    );

    if (!q) return itemsWithCounts;

    const qKey = normalizeKey(q);
    return itemsWithCounts.filter((s) => normalizeKey(s.name).includes(qKey) || normalizeKey(s.location).includes(qKey));
  }

  static async getSchoolById(id) {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  }

  static async findSchoolByKey(schoolKey) {
    const snap = await getDocs(
      query(collection(db, COLLECTION), where("schoolKey", "==", schoolKey), limit(1))
    );
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }

  static async createSchool(payload, createdBy = null) {
    const name = normalizeText(payload?.name);
    if (!name) throw new Error("Missing school name");

    const location = normalizeText(payload?.location);
    const sports = splitMulti(payload?.sports, { preferredDelimiter: "," });

    const schoolKey = computeSchoolKey(name);
    const existing = await this.findSchoolByKey(schoolKey);
    if (existing) throw new Error(`School already exists: ${name}`);

    const docData = {
      name,
      location: location || null,
      sports,
      schoolKey,
      isActive: true,
      createdBy: createdBy || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, COLLECTION), docData);
    return ref.id;
  }

  static async updateSchool(id, updates, updatedBy = null) {
    const clean = {};
    Object.keys(updates || {}).forEach((k) => {
      if (updates[k] !== undefined) clean[k] = updates[k];
    });

    // Normalize supported fields
    if (clean.name !== undefined) clean.name = normalizeText(clean.name);
    if (clean.location !== undefined) clean.location = normalizeText(clean.location) || null;
    if (clean.sports !== undefined) clean.sports = splitMulti(clean.sports, { preferredDelimiter: "," });

    // If name changes, enforce unique schoolKey
    if (clean.name) {
      const newKey = computeSchoolKey(clean.name);
      const existing = await this.findSchoolByKey(newKey);
      if (existing && existing.id !== id) {
        throw new Error(`School name already exists: ${clean.name}`);
      }
      clean.schoolKey = newKey;
    }

    if (updatedBy && !clean.updatedBy) clean.updatedBy = updatedBy;
    clean.updatedAt = serverTimestamp();
    await updateDoc(doc(db, COLLECTION, id), clean);
  }

  static async deleteSchool(id) {
    // Hard delete
    await deleteDoc(doc(db, COLLECTION, id));
  }

  /**
   * Bulk hard-delete schools by id.
   */
  static async bulkHardDeleteSchools(schoolIds) {
    if (!Array.isArray(schoolIds) || schoolIds.length === 0) {
      throw new Error("schoolIds (non-empty array) is required");
    }

    let deletedCount = 0;
    let batches = 0;

    // Batch writes max 500 ops
    for (let i = 0; i < schoolIds.length; i += 450) {
      const slice = schoolIds.slice(i, i + 450);
      const batch = writeBatch(db);
      slice.forEach((id) => {
        batch.delete(doc(db, COLLECTION, id));
      });
      await batch.commit();
      deletedCount += slice.length;
      batches += 1;
    }

    return { deletedCount, batches };
  }

  /**
   * Resolve a school by name (normalized) or create it if missing.
   *
   * Options:
   * - mergeSports: if true and school exists, union provided sports into school.sports
   */
  static async getOrCreateByName(name, options = {}, adminId = null) {
    const cleanName = normalizeText(name);
    if (!cleanName) throw new Error("Missing school name");

    const sports = splitMulti(options?.sports, { preferredDelimiter: "," });
    const mergeSports = options?.mergeSports === true;

    const schoolKey = computeSchoolKey(cleanName);
    const existing = await this.findSchoolByKey(schoolKey);
    if (existing) {
      if (mergeSports && sports.length) {
        const existingSports = Array.isArray(existing.sports) ? existing.sports : [];
        const merged = Array.from(new Set([...existingSports, ...sports].map(normalizeText).filter(Boolean)));
        await updateDoc(doc(db, COLLECTION, existing.id), {
          sports: merged,
          updatedBy: adminId || null,
          updatedAt: serverTimestamp(),
        });
      }
      return { id: existing.id, created: false };
    }

    const ref = await addDoc(collection(db, COLLECTION), {
      name: cleanName,
      location: null,
      sports,
      schoolKey,
      isActive: true,
      createdBy: adminId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: ref.id, created: true };
  }

  /**
   * Bulk upsert schools from JSON rows (frontend can chunk).
   * Body should be:
   * {
   *   mode?: "upsert" | "create_only",
   *   rows: object[],
   *   columnMap?: { name?: string, location?: string, sports?: string }
   * }
   */
  static async bulkUpsertRows(payload, adminId = null) {
    const { mode = "upsert", rows, columnMap = {} } = payload || {};
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("rows (non-empty array) is required");

    const map = {
      name: "School Name",
      location: "Location",
      sports: "Sports",
      ...columnMap,
    };

    const summary = {
      mode,
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
        const name = normalizeText(row?.[map.name] ?? row?.name ?? row?.schoolName);
        const location = normalizeText(row?.[map.location] ?? row?.location);
        const sports = splitMulti(row?.[map.sports] ?? row?.sports, { preferredDelimiter: "," });
        if (!name) throw new Error("Missing School Name");

        const schoolKey = computeSchoolKey(name);
        const existing = await this.findSchoolByKey(schoolKey);

        if (existing) {
          if (mode === "create_only") {
            summary.skippedExisting += 1;
            summary.results.push({ rowIndex: i, action: "skipped_existing", schoolId: existing.id });
            continue;
          }
          await updateDoc(doc(db, COLLECTION, existing.id), {
            name,
            location: location || null,
            sports,
            schoolKey,
            isActive: true,
            updatedBy: adminId || null,
            updatedAt: serverTimestamp(),
          });
          summary.updated += 1;
          summary.results.push({ rowIndex: i, action: "updated", schoolId: existing.id });
        } else {
          const ref = await addDoc(collection(db, COLLECTION), {
            name,
            location: location || null,
            sports,
            schoolKey,
            isActive: true,
            createdBy: adminId || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          summary.created += 1;
          summary.results.push({ rowIndex: i, action: "created", schoolId: ref.id });
        }
      } catch (err) {
        summary.errors += 1;
        summary.results.push({ rowIndex: i, action: "error", error: err?.message || String(err) });
      }
    }

    return summary;
  }
}

module.exports = PickupSchoolService;

