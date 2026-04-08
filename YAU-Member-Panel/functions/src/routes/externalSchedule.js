const express = require("express");
const router = express.Router();
const externalScheduleController = require("../controllers/externalScheduleController");

// Match CRUD routes
router.post('/', externalScheduleController.createMatch);
router.get('/', externalScheduleController.getAllMatches);
router.get('/:id', externalScheduleController.getMatchById);
router.patch('/:id', externalScheduleController.updateMatch);
router.delete('/:id', externalScheduleController.deleteMatch);

// Bulk operations (use with caution)
router.delete('/bulk/all-matches', externalScheduleController.deleteAllMatches);
router.delete('/bulk/matches', externalScheduleController.deleteMultipleMatches); 

module.exports = router;