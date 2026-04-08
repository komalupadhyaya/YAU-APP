const express = require("express");
const router = express.Router();
const ConstantContactController = require("../controllers/constantContactController");

// POST: Register user to YAU group and send welcome email
router.post("/register-yau", ConstantContactController.registerYAU);
router.get("/auth",ConstantContactController.auth)
router.get("/callback",ConstantContactController.callback)

module.exports = router;