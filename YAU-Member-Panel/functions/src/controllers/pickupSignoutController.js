const PickupSignoutService = require("../services/pickupSignoutService");
const PickupSchoolStudentService = require("../services/pickupSchoolStudentService");
const { requireBodyFields, getHeader, parseOptionalBoolean } = require("../utils/pickupHttp");

function toTodayDateKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Admin-friendly: list students for a school with their signout status for a given date.
 * GET /pickup/schools/:schoolId/pickup-status?date=YYYY-MM-DD
 * If date omitted, defaults to today.
 */
exports.getPickupStatusBySchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const date = req.query.date || toTodayDateKey();

    const [students, signouts] = await Promise.all([
      PickupSchoolStudentService.listStudentsBySchool(schoolId, {
        isActive: parseOptionalBoolean(req.query.isActive),
        grade: req.query.grade,
        sport: req.query.sport,
      }),
      PickupSignoutService.listSignoutsBySchool(schoolId, date),
    ]);

    const signoutByStudentId = new Map();
    for (const s of signouts) {
      if (s.schoolStudentId && !signoutByStudentId.has(s.schoolStudentId)) {
        signoutByStudentId.set(s.schoolStudentId, s);
      }
    }

    const rows = students.map((st) => {
      const signout = signoutByStudentId.get(st.id) || null;
      return {
        ...st,
        pickup: {
          date,
          isSignedOut: Boolean(signout),
          signout,
        },
      };
    });

    res.status(200).json({
      success: true,
      data: {
        schoolId,
        date,
        totals: {
          students: rows.length,
          signedOut: signouts.length,
        },
        students: rows,
        signouts,
      },
    });
  } catch (error) {
    console.error("Error getting pickup status by school:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create a signout for school-based pickup.
 * POST /pickup/schools/:schoolId/signouts
 * Body: { schoolStudentId, parentGuardianName, notes?, date? }
 */
exports.createSignoutForSchool = async (req, res) => {
  try {
    const missing = requireBodyFields(req.body || {}, ["schoolStudentId", "parentGuardianName"]);
    if (missing.length) {
      return res.status(400).json({ success: false, error: `Missing fields: ${missing.join(", ")}` });
    }
    const { schoolId } = req.params;
    const username = getHeader(req, "x-username");
    const id = await PickupSignoutService.createSignout(
      {
        schoolId,
        schoolStudentId: req.body.schoolStudentId,
        parentGuardianName: req.body.parentGuardianName,
        notes: req.body.notes,
        date: req.body.date,
      },
      username
    );
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    console.error("Error creating pickup signout:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * List signouts for a school (optionally filtered by date=YYYY-MM-DD).
 * GET /pickup/schools/:schoolId/signouts?date=YYYY-MM-DD
 */
exports.listSignoutsBySchool = async (req, res) => {
  try {
    // Default to today's signouts for pickup UI (prevents loading all history)
    const date = req.query.date || toTodayDateKey();
    const signouts = await PickupSignoutService.listSignoutsBySchool(req.params.schoolId, date);
    res.status(200).json({ success: true, data: signouts });
  } catch (error) {
    console.error("Error listing pickup signouts by school:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.listSignouts = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const signouts = await PickupSignoutService.listSignouts({
      schoolId: req.query.schoolId,
      schoolStudentId: req.query.schoolStudentId,
      rosterId: req.query.rosterId, // legacy filter
      studentId: req.query.studentId, // legacy filter
      date: req.query.date,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: Number.isFinite(limit) ? limit : null,
    });
    res.status(200).json({ success: true, data: signouts });
  } catch (error) {
    console.error("Error listing pickup signouts:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

