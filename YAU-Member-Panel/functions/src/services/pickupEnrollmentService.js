const { db } = require("../utils/firebase");
const {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} = require("firebase/firestore");

const { normalizeText, digitsOnlyPhone, splitMulti } = require("../utils/pickupNormalize");
const PickupSchoolStudentService = require("./pickupSchoolStudentService");
const PickupSchoolService = require("./pickupSchoolService");
const EmailService = require("./emailService");

const ENROLLMENTS_COLLECTION = "pickupEnrollments";

function cleanString(v) {
  const s = normalizeText(v);
  return s || null;
}

function cleanStringArray(v) {
  const arr = splitMulti(v, { preferredDelimiter: "," });
  return arr.map(normalizeText).filter(Boolean);
}

function toBoolean(v) {
  return v === true;
}

function toBooleanWithDefault(v, defaultValue = false) {
  // If value is explicitly provided as boolean, use it
  if (typeof v === 'boolean') return v;
  // Otherwise return default (handles undefined, null, etc.)
  return defaultValue;
}

class PickupEnrollmentService {
  static async createEnrollmentAndStudents(payload, meta = {}) {
    const parentFirstName = cleanString(payload?.parentFirstName);
    const parentLastName = cleanString(payload?.parentLastName);
    const email = cleanString(payload?.email);
    const mobileNumber = digitsOnlyPhone(payload?.mobileNumber) || cleanString(payload?.mobileNumber);

    const volunteerInterests = cleanStringArray(payload?.volunteerInterest);
    // Backward-compatible single-string field (useful for legacy UI)
    const volunteerInterest = volunteerInterests.length ? volunteerInterests.join(", ") : null;
    const termsAccepted = toBoolean(payload?.termsAccepted);
    const electronicSignature = cleanString(payload?.electronicSignature);
    const humanVerified = toBoolean(payload?.humanVerified);
    
    // NEW: Receive messages consent (SMS/text messages and emails for program updates)
    // Default to false for backward compatibility with old submissions
    const receiveMessages = toBooleanWithDefault(payload?.receiveMessages, false);

    const students = Array.isArray(payload?.students) ? payload.students : [];

    if (!parentFirstName) throw new Error("Missing parentFirstName");
    if (!parentLastName) throw new Error("Missing parentLastName");
    if (!email) throw new Error("Missing email");
    if (!mobileNumber) throw new Error("Missing mobileNumber");
    if (!termsAccepted) throw new Error("termsAccepted must be true");
    if (!electronicSignature) throw new Error("Missing electronicSignature");
    if (!humanVerified) throw new Error("humanVerified must be true");
    if (students.length === 0) throw new Error("students (non-empty array) is required");

    // Create enrollment record first (then append created student ids + per-student errors)
    const enrollmentRef = await addDoc(collection(db, ENROLLMENTS_COLLECTION), {
      schemaVersion: 1,
      parentFirstName,
      parentLastName,
      email: email.toLowerCase(),
      mobileNumber,
      volunteerInterest,
      volunteerInterests,
      termsAccepted,
      electronicSignature,
      humanVerified,
      receiveMessages, // NEW: SMS/text consent for program updates
      rawPayload: payload || {},
      studentsRaw: students,
      source: meta?.source || "pickup.yauapp.com",
      status: "submitted",
      createdStudents: [],
      errors: [],
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      meta: {
        ip: meta?.ip || null,
        userAgent: meta?.userAgent || null,
      },
    });

    const enrollmentId = enrollmentRef.id;
    const createdStudents = [];
    const errors = [];

    for (let i = 0; i < students.length; i++) {
      const st = students[i] || {};
      try {
        const schoolId = cleanString(st?.schoolId);
        const studentFirstName = cleanString(st?.firstName);
        const studentLastName = cleanString(st?.lastName);
        const grade = cleanString(st?.studentGrade);
        const sports = splitMulti(st?.sportSelections, { preferredDelimiter: "," });

        if (!schoolId) throw new Error("Missing schoolId");
        if (!studentFirstName) throw new Error("Missing student firstName");
        if (!studentLastName) throw new Error("Missing student lastName");
        if (!grade) throw new Error("Missing studentGrade");
        if (!sports.length) throw new Error("Missing sportSelections");

        const school = await PickupSchoolService.getSchoolById(schoolId);
        if (!school) throw new Error("Invalid schoolId");

        const studentId = await PickupSchoolStudentService.createStudent(
          schoolId,
          {
            studentFirstName,
            studentLastName,
            parentFirstName,
            parentLastName,
            parentEmail: email,
            parentPhone: mobileNumber,
            grade,
            sports,
          },
          null,
          { createdSource: "pickup_enrollment", enrollmentId }
        );

        createdStudents.push({
          index: i,
          schoolId,
          studentId,
          schoolAttendance: cleanString(st?.schoolAttendance),
        });
      } catch (err) {
        errors.push({
          index: i,
          error: err?.message || String(err),
          schoolId: cleanString(st?.schoolId),
          schoolAttendance: cleanString(st?.schoolAttendance),
          studentFirstName: cleanString(st?.firstName),
          studentLastName: cleanString(st?.lastName),
        });
      }
    }

    await updateDoc(doc(db, ENROLLMENTS_COLLECTION, enrollmentId), {
      createdStudents,
      errors,
      status: errors.length ? (createdStudents.length ? "partial" : "failed") : "completed",
      updatedAt: serverTimestamp(),
    });

    // Send enrollment confirmation email
    if (email && parentFirstName) {
      try {
        const childName = students.length > 0 ? students[0].firstName : ""; // Assuming first child's name for email
        await EmailService.sendPickupEnrollmentEmail(email, childName);
        console.log("✅ Pickup enrollment email dispatched successfully.");
      } catch (emailError) {
        console.error("❌ Failed to send pickup enrollment email:", emailError.message);
        // Continue with the process even if email fails to send
      }
    }

    return { enrollmentId, createdStudents, errors };
  }

  static async listEnrollments(options = {}) {
    const max = Number.isFinite(Number(options?.limit)) ? Math.max(1, Math.min(200, Number(options.limit))) : 50;

    try {
      const snap = await getDocs(
        query(collection(db, ENROLLMENTS_COLLECTION), orderBy("submittedAt", "desc"), limit(max))
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      // Fallback if index/orderBy issues
      const snap = await getDocs(query(collection(db, ENROLLMENTS_COLLECTION), limit(max)));
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => {
        const ta = a.submittedAt?.toMillis?.() ?? (a.submittedAt?.seconds ? a.submittedAt.seconds * 1000 : 0);
        const tb = b.submittedAt?.toMillis?.() ?? (b.submittedAt?.seconds ? b.submittedAt.seconds * 1000 : 0);
        return tb - ta;
      });
      return items;
    }
  }

  static async getEnrollmentById(enrollmentId) {
    const snap = await getDoc(doc(db, ENROLLMENTS_COLLECTION, enrollmentId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  }
}

module.exports = PickupEnrollmentService;

