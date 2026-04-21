const express = require('express');
const router = express.Router();
const CoachAssignmentsController = require('../controllers/coachAssignmentsController');

// Coach Assignments CRUD
router.get('/', CoachAssignmentsController.getAssignments);
router.post('/', CoachAssignmentsController.createAssignment);
router.put('/:id', CoachAssignmentsController.updateAssignment);
router.delete('/:id', CoachAssignmentsController.deleteAssignment);

// Notifications
router.post('/notify', CoachAssignmentsController.sendNotification);

module.exports = router;
