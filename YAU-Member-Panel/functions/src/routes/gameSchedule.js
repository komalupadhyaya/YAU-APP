// routes/gameScheduleRoutes.js
const express = require("express");
const router = express.Router();
const GameScheduleController = require("../controllers/gameScheduleController");

router.get("/", GameScheduleController.getSchedules);
router.get("/:id", GameScheduleController.getScheduleById);
router.post("/", GameScheduleController.addSchedule);
// Bulk operations (use with caution)
router.post("/bulk-delete", GameScheduleController.bulkDeleteSchedules);
router.put("/:id", GameScheduleController.updateSchedule);
router.delete("/:id", GameScheduleController.deleteSchedule);

// Notifications
router.post("/notifications/send", GameScheduleController.sendGameNotification);
router.post("/notifications/recipients", GameScheduleController.getGameRecipients);

module.exports = router;