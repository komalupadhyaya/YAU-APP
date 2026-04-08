// controllers/gameScheduleController.js

const GameScheduleService = require("../services/gameScheduleService");

class GameScheduleController {
  static async getSchedules(req, res) {
    try {
      const schedules = await GameScheduleService.getSchedules();
      res.status(200).json({ success: true, data: schedules });
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getScheduleById(req, res) {
    try {
      const { id } = req.params;
      const schedule = await GameScheduleService.getScheduleById(id);
      if (!schedule) {
        return res.status(404).json({ success: false, error: "Schedule not found" });
      }
      res.status(200).json({ success: true, data: schedule });
    } catch (error) {
      console.error("Error fetching schedule:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async addSchedule(req, res) {
    try {
      const scheduleId = await GameScheduleService.addSchedule(req.body);
      res.status(201).json({ success: true, data: { id: scheduleId } });
    } catch (error) {
      console.error("Error adding schedule:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async updateSchedule(req, res) {
    try {
      const { id } = req.params;
      await GameScheduleService.updateSchedule(id, req.body);
      res.status(200).json({ success: true, message: "Schedule updated successfully" });
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async deleteSchedule(req, res) {
    try {
      const { id } = req.params;
      await GameScheduleService.deleteSchedule(id);
      res.status(200).json({ success: true, message: "Schedule deleted successfully" });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Bulk delete schedules by ids OR by filters.
   *
   * Body:
   * {
   *   confirmation: "BULK_DELETE_SCHEDULES",
   *   dryRun?: boolean,
   *   maxToDelete?: number,
   *   ids?: string[],
   *   filters?: {
   *     season?: string,
   *     sport?: string,
   *     date?: string,
   *     coachId?: string,
   *     team1Id?: string,
   *     team2Id?: string,
   *     status?: string,
   *     ageGroups?: string[]
   *   }
   * }
   */
  static async bulkDeleteSchedules(req, res) {
    try {
      const {
        confirmation,
        dryRun = false,
        maxToDelete,
        ids,
        filters,
      } = req.body || {};

      if (confirmation !== "BULK_DELETE_SCHEDULES") {
        return res.status(400).json({
          success: false,
          error: 'Confirmation required. Send confirmation: "BULK_DELETE_SCHEDULES" in request body',
        });
      }

      const hasIds = Array.isArray(ids) && ids.length > 0;
      const hasFilters = filters && typeof filters === "object" && Object.keys(filters).length > 0;

      if (!hasIds && !hasFilters) {
        return res.status(400).json({
          success: false,
          error: "Provide either ids (non-empty array) or filters (non-empty object).",
        });
      }

      const result = await GameScheduleService.bulkDeleteSchedules({
        ids: hasIds ? ids : undefined,
        filters: hasFilters ? filters : undefined,
        dryRun,
        maxToDelete,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("Error bulk deleting schedules:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async sendGameNotification(req, res) {
    try {
      const { gameData, notificationType } = req.body;
      const result = await GameScheduleService.sendGameNotification(gameData, notificationType);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("Error sending game notification:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async getGameRecipients(req, res) {
    try {
      const recipients = await GameScheduleService.getGameRecipients(req.body);
      res.status(200).json({ success: true, data: recipients });
    } catch (error) {
      console.error("Error fetching game recipients:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = GameScheduleController;