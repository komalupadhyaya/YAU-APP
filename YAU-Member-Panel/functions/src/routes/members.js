const express = require("express");
const router = express.Router();
const MemberController = require("../controllers/memberController");

router.get("/", MemberController.getMembers);
router.get("/:id", MemberController.getMemberById);
router.post("/", MemberController.createMember);
router.put("/:id", MemberController.updateMember);
router.delete("/:id", MemberController.deleteMember);
router.post("/batch-delete", MemberController.batchDeleteMembers);
router.get("/email/:email", MemberController.emailVerified);

module.exports = router;