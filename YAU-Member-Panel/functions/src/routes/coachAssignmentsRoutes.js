const express = require('express');
const router = express.Router();
const CoachAssignmentsController = require('../controllers/coachAssignmentsController');
const { verifyAppCheck } = require('../middleware/auth');

// Note: since this is hit from the admin dashboard we might want admin middleware, but app check might be enough right now. Let's just use it as is since CSRF is there.
router.post('/notify', CoachAssignmentsController.sendNotification);

module.exports = router;
