// controllers/MessagesController.js
const MessageService = require("../services/messageService");

class MessagesController {
  static async getMessages(req, res) {
    try {
      const messages = await MessageService.getMessages();
      res.status(200).json({ success: true, data: messages });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getMessageById(req, res) {
    try {
      const { id } = req.params;
      const message = await MessageService.getMessageById(id);
      if (!message) {
        return res.status(404).json({ success: false, error: "Message not found" });
      }
      res.status(200).json({ success: true, data: message });
    } catch (error) {
      console.error("Error fetching message:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async addMessage(req, res) {
    try {
      const messageId = await MessageService.addMessage(req.body);
      res.status(201).json({ success: true, data: { id: messageId } });
    } catch (error) {
      console.error("Error adding message:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async updateMessage(req, res) {
    try {
      const { id } = req.params;
      await MessageService.updateMessage(id, req.body);
      res.status(200).json({ success: true, message: "Message updated successfully" });
    } catch (error) {
      console.error("Error updating message:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async deleteMessage(req, res) {
    try {
      const { id } = req.params;
      await MessageService.deleteMessage(id);
      res.status(200).json({ success: true, message: "Message deleted successfully" });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getMessagesForGroup(req, res) {
    try {
      const { ageGroup, location, sport } = req.query;
      const messages = await MessageService.getMessagesForGroup(ageGroup, location, sport);
      res.status(200).json({ success: true, data: messages });
    } catch (error) {
      console.error("Error fetching messages for group:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = MessagesController;