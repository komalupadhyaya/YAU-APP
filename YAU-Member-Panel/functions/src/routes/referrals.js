const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const auth = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/:referralCode', referralController.getReferral);
router.post('/track-opened', referralController.trackOpened);
router.post('/track-joined', referralController.trackJoined); // ✅ FIXED: Moved to public (no auth needed)

// Protected routes (require authentication)
router.post('/create', auth.verifyIdToken, referralController.createReferral);
router.get('/user/:userId', auth.verifyIdToken, referralController.getUserReferrals);
router.get('/user/:userId/stats', auth.verifyIdToken, referralController.getUserStats);
router.get('/check-rate-limit', auth.verifyIdToken, referralController.checkRateLimit);

// Admin only routes
router.get('/admin/stats/global', auth.verifyIdToken, auth.requireAdmin, referralController.getGlobalStats);
router.delete('/admin/:referralCode', auth.verifyIdToken, auth.requireAdmin, referralController.deleteReferral);



//Testing removed auth middle ware
// router.post('/create', referralController.createReferral);
// router.post('/track-joined', referralController.trackJoined);
// router.get('/user/:userId', referralController.getUserReferrals);
// router.get('/user/:userId/stats', referralController.getUserStats);
// router.get('/check-rate-limit', referralController.checkRateLimit);

// // Admin only routes
// router.get('/admin/stats/global', referralController.getGlobalStats);
// router.delete('/admin/:referralCode', referralController.deleteReferral);

module.exports = router;