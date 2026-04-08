const express = require("express");
/* eslint-disable-next-line new-cap */
const router = express.Router();
const MembershipController = require("../controllers/membershipController");
const {validateEmail} = require("../middleware/validation");

// Find user by email
router.get("/find-user/:email", validateEmail, MembershipController.findUserByEmail);

// Upgrade membership
router.post("/upgrade", MembershipController.upgradeMembership);

// Get membership status
router.get("/status/:email", validateEmail, MembershipController.getMembershipStatus);

// Cancel membership
router.post("/cancel", MembershipController.cancelMembership);

// Move to members collection
router.post("/move-to-members", MembershipController.moveToMembersCollection);

module.exports = router;
