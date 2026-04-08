const express = require('express');
const router = express.Router();
const SMSController = require('../controllers/smsController');
const { validateCSRFToken } = require('../middleware/csrf');

// Apply CSRF protection to all SMS routes
router.use(validateCSRFToken);

// Send single SMS
router.post('/send', SMSController.sendEnrollmentSMS);

// Send bulk SMS
router.post('/bulk', SMSController.sendBulkSMS);

module.exports = router;