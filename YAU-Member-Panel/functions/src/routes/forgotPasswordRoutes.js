const express = require("express");
const router = express.Router();
const ForgotPasswordController = require("../controllers/forgotPasswordController");

router.post("/", ForgotPasswordController.requestPasswordReset);
router.get("/verify", ForgotPasswordController.verifyResetToken);
router.post("/reset", ForgotPasswordController.resetPassword);

module.exports = router;

