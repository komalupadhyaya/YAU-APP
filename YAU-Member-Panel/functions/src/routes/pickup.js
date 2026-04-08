const express = require("express");
const router = express.Router();

const PickupSchoolController = require("../controllers/pickupSchoolController");
const PickupSchoolStudentController = require("../controllers/pickupSchoolStudentController");
const PickupSignoutController = require("../controllers/pickupSignoutController");
const PickupEnrollmentController = require("../controllers/pickupEnrollmentController");

// Schools (Admin)
router.get("/schools", PickupSchoolController.listSchools);
router.post("/schools", PickupSchoolController.createSchool);
router.get("/schools/:schoolId", PickupSchoolController.getSchoolById);
router.put("/schools/:schoolId", PickupSchoolController.updateSchool);
router.delete("/schools/:schoolId", PickupSchoolController.deleteSchool);
router.post("/schools/bulk-import", PickupSchoolController.bulkImportSchools);
router.post("/schools/bulk-delete", PickupSchoolController.bulkDeleteSchools);

// School Students (Admin)
router.get("/schools/:schoolId/students", PickupSchoolStudentController.listStudentsBySchool);
router.post("/schools/:schoolId/students", PickupSchoolStudentController.createStudent);
router.post("/schools/:schoolId/students/bulk-delete", PickupSchoolStudentController.bulkDeleteStudentsBySchool);
router.put("/school-students/:studentId", PickupSchoolStudentController.updateStudent);
router.delete("/school-students/:studentId", PickupSchoolStudentController.deleteStudent);
router.post("/school-students/bulk-import", PickupSchoolStudentController.bulkImportStudents);

// Sign-outs (Coach pickup)
router.get("/schools/:schoolId/signouts", PickupSignoutController.listSignoutsBySchool);
router.post("/schools/:schoolId/signouts", PickupSignoutController.createSignoutForSchool);

// Admin view: students + signout status for a school/date (for admin panel)
router.get("/schools/:schoolId/pickup-status", PickupSignoutController.getPickupStatusBySchool);

// Reporting (Admin)
router.get("/signouts", PickupSignoutController.listSignouts);

// Enrollments (Public submit + Admin read)
router.post("/enrollments/submit", PickupEnrollmentController.submitEnrollment);
router.get("/enrollments", PickupEnrollmentController.listEnrollments);
router.get("/enrollments/:enrollmentId", PickupEnrollmentController.getEnrollmentById);

module.exports = router;

