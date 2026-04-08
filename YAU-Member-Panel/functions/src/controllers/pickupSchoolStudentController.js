const PickupSchoolStudentService = require("../services/pickupSchoolStudentService");
const { parseOptionalBoolean, getHeader, requireBodyFields } = require("../utils/pickupHttp");

exports.listStudentsBySchool = async (req, res) => {
  try {
    const students = await PickupSchoolStudentService.listStudentsBySchool(req.params.schoolId, {
      isActive: parseOptionalBoolean(req.query.isActive),
      grade: req.query.grade,
      sport: req.query.sport,
    });
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    console.error("Error listing school students:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const missing = requireBodyFields(req.body || {}, [
      "studentFirstName",
      "studentLastName",
      "parentFirstName",
      "parentLastName",
      "grade",
      "sports",
    ]);
    if (missing.length) {
      return res.status(400).json({ success: false, error: `Missing fields: ${missing.join(", ")}` });
    }
    const adminId = getHeader(req, "x-admin-id");
    const id = await PickupSchoolStudentService.createStudent(req.params.schoolId, req.body, adminId);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    console.error("Error creating school student:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const adminId = getHeader(req, "x-admin-id");
    await PickupSchoolStudentService.updateStudent(req.params.studentId, req.body, adminId);
    res.status(200).json({ success: true, message: "Student updated successfully" });
  } catch (error) {
    console.error("Error updating school student:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    await PickupSchoolStudentService.deleteStudent(req.params.studentId);
    res.status(200).json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting school student:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.bulkImportStudents = async (req, res) => {
  try {
    const { rows } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: "rows (non-empty array) is required" });
    }
    const adminId = getHeader(req, "x-admin-id");
    const result = await PickupSchoolStudentService.bulkUpsertRows(req.body, adminId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error bulk importing school students:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Bulk hard-delete students from a specific school.
 *
 * POST /pickup/schools/:schoolId/students/bulk-delete
 * Body:
 * {
 *   studentIds: string[]
 * }
 */
exports.bulkDeleteStudentsBySchool = async (req, res) => {
  try {
    const { studentIds } = req.body || {};
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, error: "studentIds (non-empty array) is required" });
    }

    const result = await PickupSchoolStudentService.hardDeleteStudentsByIds(studentIds, {
      schoolId: req.params.schoolId,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error bulk deleting school students:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};
