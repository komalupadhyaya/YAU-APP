const express = require("express");
const router = express.Router();
const ParentController = require("../controllers/parentController");

router.get("/", ParentController.getParents);
router.get("/:id", ParentController.getParentById);
router.post("/", ParentController.addParent);
router.put("/:id", ParentController.updateParent);
router.delete("/:id", ParentController.deleteParent);
router.post("/assign-rosters", ParentController.assignChildrenToExistingRosters);
router.post("/sync-rosters", ParentController.syncParentsToRosters);

module.exports = router;