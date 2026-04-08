const express = require("express");
const router = express.Router();
const CoachController= require("../controllers/coachControllers")
router.get("/", CoachController.getCoaches);
router.post("/bulk", CoachController.bulkDeleteCoaches);
router.get("/:id", CoachController.getCoachById);
router.post("/",  CoachController.createCoach);
router.put("/:id", CoachController.updateCoach);
router.delete("/:id", CoachController.deleteCoach);
router.post("/:id/assign-roster", CoachController.assignCoachToRoster);

module.exports = router;