const express = require("express");
const router = express.Router();
const AdminTimesheetController = require("../controllers/adminTimesheetController");

// All routes now work without authentication middleware
router.get("/timesheets", AdminTimesheetController.getAllTimesheets);
router.get("/timesheets/coach/:coachId", AdminTimesheetController.getCoachTimesheets);
router.get("/timesheets/stats", AdminTimesheetController.getTimesheetStats);
router.post("/timesheets/:id/approve", AdminTimesheetController.approveTimesheet);
router.post("/timesheets/:id/reject", AdminTimesheetController.rejectTimesheet);
router.post("/timesheets/bulk-approve", AdminTimesheetController.bulkApproveTimesheets);
router.post("/timesheets/bulk-reject", AdminTimesheetController.bulkRejectTimesheets);
router.get("/timesheets/export", AdminTimesheetController.exportTimesheets);

module.exports = router;