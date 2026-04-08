const PickupSchoolService = require("../services/pickupSchoolService");
const PickupSchoolStudentService = require("../services/pickupSchoolStudentService");
const { parseOptionalBoolean, getHeader, requireBodyFields } = require("../utils/pickupHttp");

exports.listSchools = async (req, res) => {
  try {
    const items = await PickupSchoolService.listSchools({
      isActive: parseOptionalBoolean(req.query.isActive),
      q: req.query.q,
    });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error("Error listing pickup schools:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createSchool = async (req, res) => {
  try {
    const missing = requireBodyFields(req.body || {}, ["name"]);
    if (missing.length) {
      return res.status(400).json({ success: false, error: `Missing fields: ${missing.join(", ")}` });
    }
    const adminId = getHeader(req, "x-admin-id");
    const id = await PickupSchoolService.createSchool(req.body, adminId);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    console.error("Error creating pickup school:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getSchoolById = async (req, res) => {
  try {
    const school = await PickupSchoolService.getSchoolById(req.params.schoolId);
    if (!school) return res.status(404).json({ success: false, error: "School not found" });
    res.status(200).json({ success: true, data: school });
  } catch (error) {
    console.error("Error getting pickup school:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateSchool = async (req, res) => {
  try {
    const adminId = getHeader(req, "x-admin-id");
    await PickupSchoolService.updateSchool(req.params.schoolId, req.body, adminId);
    res.status(200).json({ success: true, message: "School updated successfully" });
  } catch (error) {
    console.error("Error updating pickup school:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteSchool = async (req, res) => {
  try {
    await PickupSchoolService.deleteSchool(req.params.schoolId);
    res.status(200).json({ success: true, message: "School deleted successfully" });
  } catch (error) {
    console.error("Error deleting pickup school:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.bulkImportSchools = async (req, res) => {
  try {
    const { rows } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: "rows (non-empty array) is required" });
    }
    const adminId = getHeader(req, "x-admin-id");
    const result = await PickupSchoolService.bulkUpsertRows(req.body, adminId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error bulk importing schools:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Bulk hard-delete schools, optionally hard-deleting all students within those schools.
 *
 * POST /pickup/schools/bulk-delete
 * Body:
 * {
 *   schoolIds: string[],
 *   deleteStudents?: boolean
 * }
 */
exports.bulkDeleteSchools = async (req, res) => {
  try {
    const { schoolIds, deleteStudents } = req.body || {};
    if (!Array.isArray(schoolIds) || schoolIds.length === 0) {
      return res.status(400).json({ success: false, error: "schoolIds (non-empty array) is required" });
    }
    if (deleteStudents !== undefined && typeof deleteStudents !== "boolean") {
      return res.status(400).json({ success: false, error: "deleteStudents must be a boolean" });
    }

    const schoolsResult = await PickupSchoolService.bulkHardDeleteSchools(schoolIds);

    let studentsResult = null;
    if (deleteStudents) {
      studentsResult = await PickupSchoolStudentService.hardDeleteStudentsBySchoolIds(schoolIds);
    }

    res.status(200).json({
      success: true,
      data: {
        deleteStudents: Boolean(deleteStudents),
        schools: schoolsResult,
        students: studentsResult,
      },
    });
  } catch (error) {
    console.error("Error bulk deleting schools:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};
