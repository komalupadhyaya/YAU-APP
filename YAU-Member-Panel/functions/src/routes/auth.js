const express = require("express");
const AuthService = require("../services/authService");
const router = express.Router();

// Route for proxying Firebase Auth user creation
router.post("/create-auth-user", AuthService.createFirebaseAuthUser);

module.exports = router;