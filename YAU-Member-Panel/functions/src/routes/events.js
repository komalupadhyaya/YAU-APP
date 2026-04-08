// routes/eventRoutes.js
const express = require("express");
const EventController = require("../controllers/eventControllers");
const router = express.Router();

router.get("/", EventController.getEvents);
router.get("/:id", EventController.getEventById);
router.post("/", EventController.addEvent);
router.put("/:id", EventController.updateEvent);
router.delete("/:id", EventController.deleteEvent);
router.delete("/cleanup/expired", EventController.deleteExpiredEvents);

module.exports = router;