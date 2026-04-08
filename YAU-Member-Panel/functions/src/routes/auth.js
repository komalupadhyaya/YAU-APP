const express = require("express");
const AuthService = require("../services/authService");
const router = express.Router();

router.post("/create-auth-user", AuthService.createFirebaseAuthUser);
module.exports = router;