// controllers/eventController.js

const EventService = require("../services/eventService");

class EventController {
  static async getEvents(req, res) {
    try {
      const events = await EventService.getEvents();
      res.status(200).json({ success: true, data: events });
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getEventById(req, res) {
    try {
      const { id } = req.params;
      const event = await EventService.getEventById(id);
      if (!event) {
        return res.status(404).json({ success: false, error: "Event not found" });
      }
      res.status(200).json({ success: true, data: event });
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async addEvent(req, res) {
    try {
      const eventId = await EventService.addEvent(req.body);
      res.status(201).json({ success: true, data: { id: eventId } });
    } catch (error) {
      console.error("Error adding event:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async updateEvent(req, res) {
    try {
      const { id } = req.params;
      await EventService.updateEvent(id, req.body);
      res.status(200).json({ success: true, message: "Event updated successfully" });
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      await EventService.deleteEvent(id);
      res.status(200).json({ success: true, message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async deleteExpiredEvents(req, res) {
    try {
      const result = await EventService.deleteExpiredEvents();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("Error deleting expired events:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = EventController;