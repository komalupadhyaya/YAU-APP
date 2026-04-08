// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const MessageController = require("../controllers/messagesController");

router.get("/", MessageController.getMessages);
router.get("/:id", MessageController.getMessageById);
router.post("/", MessageController.addMessage);
router.put("/:id", MessageController.updateMessage);
router.delete("/:id", MessageController.deleteMessage);
router.get("/group/targeted", MessageController.getMessagesForGroup);

module.exports = router;