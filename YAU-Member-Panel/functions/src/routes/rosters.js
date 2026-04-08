// routes/rosterRoutes.js
const express = require("express");
const router = express.Router();
const RosterController = require("../controllers/rosterController");
const { validateRosterData, validateRosterUpdate } = require("../middleware/validation");

// Basic CRUD operations
router.get("/", RosterController.getRosters);
router.get("/options", RosterController.getManualCreateOptions);
router.get("/options/students", RosterController.getOptionStudents);
router.get("/options/locations", RosterController.getOptionLocations);
router.get("/options/sports", RosterController.getOptionSports);
router.get("/options/grades", RosterController.getOptionGrades);
router.get("/:id", RosterController.getRosterById);
router.post("/", validateRosterData, RosterController.createRoster);
router.put("/:id", validateRosterUpdate, RosterController.updateRoster);
router.delete("/:id", RosterController.deleteRoster);

// Player management
router.post("/:rosterId/players", RosterController.addPlayerToRoster);
router.delete("/:rosterId/players/:playerId", RosterController.removePlayerFromRoster);

// Coach assignment
router.post("/:rosterId/assign-coach", RosterController.assignCoachToRoster);
router.delete("/:rosterId/coach", RosterController.removeCoachFromRoster);

// Filtering and search
router.get("/location/:location", RosterController.getRostersByLocation);
router.get("/sport/:sport", RosterController.getRostersBySport);
router.get("/grade/:grade", RosterController.getRostersByGrade);

// Bulk operations and utilities
router.post("/generate-initial", RosterController.generateInitialRosters);
router.post("/sync-all", RosterController.syncAllRosters);
router.post("/bulk-update", RosterController.bulkUpdateRosters);
router.post("/bulk-delete", RosterController.bulkDeleteRosters);

// Statistics
router.get("/stats/overview", RosterController.getRosterStats);
router.post("/generate-initial", RosterController.generateInitialRosters);
router.post("/sync-all", RosterController.syncAllRosters);
router.delete("/cleanup/empty", RosterController.cleanupEmptyRosters);
router.get("/stats/creation", RosterController.getRosterCreationStats);

module.exports = router;