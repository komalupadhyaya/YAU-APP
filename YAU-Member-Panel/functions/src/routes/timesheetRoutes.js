// routes/timesheetRoutes.js
const express = require("express");
const router = express.Router();
const TimesheetController = require("../controllers/timesheetController");

// All routes now take coachId as parameter
router.post("/:coachId", TimesheetController.createEntry);
router.get("/coach/:coachId", TimesheetController.getAllEntries);
router.get("/:coachId/entry/:id", TimesheetController.getEntryById);
router.put("/:coachId/entry/:id", TimesheetController.updateEntry);
router.delete("/:coachId/entry/:id", TimesheetController.deleteEntry);
router.post("/:coachId/entry/:id/submit", TimesheetController.submitTimesheet);
router.get("/coach/:coachId/stats", TimesheetController.getCoachStats);

module.exports = router;
