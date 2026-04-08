const express = require("express");
const router = express.Router();
const LocationController = require("../controllers/locationController");

router.get("/", LocationController.getLocations);
router.get("/:id", LocationController.getLocationById);
router.post("/", LocationController.addLocation);
router.put("/:id", LocationController.updateLocation);
router.delete("/:id", LocationController.deleteLocation);

module.exports = router;