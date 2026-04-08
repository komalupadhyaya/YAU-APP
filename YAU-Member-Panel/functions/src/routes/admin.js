// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');

// Authentication routes
router.post('/login', AdminController.loginAdmin);

// Member management routes (admin creates members)
router.post('/create-member-with-auth', AdminController.createMemberWithAuth);

// Admin CRUD routes
router.post('/', AdminController.createAdmin);
router.get('/', AdminController.getAdmins);
router.get('/stats', AdminController.getAdminStats);
router.get('/:adminId', AdminController.getAdminById);
router.put('/:adminId', AdminController.updateAdmin);
router.put('/:adminId/password', AdminController.updateAdminPassword);
router.patch('/:adminId/deactivate', AdminController.deactivateAdmin);
router.delete('/:adminId', AdminController.deleteAdmin);

module.exports = router;