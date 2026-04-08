// controllers/rosterController.js

const RosterService = require("../services/rosterService");

class RosterController {
  static async getRosters(req, res) {
    try {
      const rosters = await RosterService.getRosters();
      res.status(200).json({ success: true, data: rosters });
    } catch (error) {
      console.error("Error fetching rosters:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getRosterById(req, res) {
    try {
      const { id } = req.params;
      const roster = await RosterService.getRosterById(id);
      if (!roster) {
        return res.status(404).json({ success: false, error: "Roster not found" });
      }
      res.status(200).json({ success: true, data: roster });
    } catch (error) {
      console.error("Error fetching roster:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async createRoster(req, res) {
    try {
      const rosterId = await RosterService.createRoster(req.body);
      res.status(201).json({ success: true, data: { id: rosterId } });
    } catch (error) {
      console.error("Error creating roster:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async updateRoster(req, res) {
    try {
      const { id } = req.params;
      await RosterService.updateRoster(id, req.body);
      res.status(200).json({ success: true, message: "Roster updated successfully" });
    } catch (error) {
      console.error("Error updating roster:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async deleteRoster(req, res) {
    try {
      const { id } = req.params;
      await RosterService.deleteRoster(id);
      res.status(200).json({ success: true, message: "Roster deleted successfully" });
    } catch (error) {
      console.error("Error deleting roster:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async addPlayerToRoster(req, res) {
    try {
      const { rosterId } = req.params;
      const { playerData } = req.body;
      await RosterService.addPlayerToRoster(rosterId, playerData);
      res.status(200).json({ success: true, message: "Player added to roster successfully" });
    } catch (error) {
      console.error("Error adding player to roster:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async removePlayerFromRoster(req, res) {
    try {
      const { rosterId, playerId } = req.params;
      await RosterService.removePlayerFromRoster(rosterId, playerId);
      res.status(200).json({ success: true, message: "Player removed from roster successfully" });
    } catch (error) {
      console.error("Error removing player from roster:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async assignCoachToRoster(req, res) {
    try {
      const { rosterId } = req.params;
      const { coachId } = req.body;
      await RosterService.assignCoachToRoster(rosterId, coachId);
      res.status(200).json({ success: true, message: "Coach assigned to roster successfully" });
    } catch (error) {
      console.error("Error assigning coach to roster:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async removeCoachFromRoster(req, res) {
    try {
      const { rosterId } = req.params;
      await RosterService.removeCoachFromRoster(rosterId);
      res.status(200).json({ success: true, message: "Coach removed from roster successfully" });
    } catch (error) {
      console.error("Error removing coach from roster:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

//   static async generateInitialRosters(req, res) {
//     try {
//       const result = await RosterService.generateInitialRosters();
//       res.status(200).json({ success: true, data: result });
//     } catch (error) {
//       console.error("Error generating initial rosters:", error);
//       res.status(500).json({ success: false, error: error.message });
//     }
//   }

//   static async syncAllRosters(req, res) {
//     try {
//       const result = await RosterService.syncAllRosters();
//       res.status(200).json({ success: true, data: result });
//     } catch (error) {
//       console.error("Error syncing all rosters:", error);
//       res.status(500).json({ success: false, error: error.message });
//     }
//   }

  static async getRostersByLocation(req, res) {
    try {
      const { location } = req.params;
      const rosters = await RosterService.getRostersByLocation(location);
      res.status(200).json({ success: true, data: rosters });
    } catch (error) {
      console.error("Error fetching rosters by location:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getRostersBySport(req, res) {
    try {
      const { sport } = req.params;
      const rosters = await RosterService.getRostersBySport(sport);
      res.status(200).json({ success: true, data: rosters });
    } catch (error) {
      console.error("Error fetching rosters by sport:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getRostersByGrade(req, res) {
    try {
      const { grade } = req.params;
      const rosters = await RosterService.getRostersByGrade(grade);
      res.status(200).json({ success: true, data: rosters });
    } catch (error) {
      console.error("Error fetching rosters by grade:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getRosterStats(req, res) {
    try {
      const stats = await RosterService.getRosterStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      console.error("Error fetching roster stats:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async bulkUpdateRosters(req, res) {
    try {
      const { rosterIds, updates } = req.body;
      await RosterService.bulkUpdateRosters(rosterIds, updates);
      res.status(200).json({ success: true, message: "Rosters updated successfully" });
    } catch (error) {
      console.error("Error bulk updating rosters:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async bulkDeleteRosters(req, res) {
    try {
      const { rosterIds } = req.body;
      
      if (!rosterIds || !Array.isArray(rosterIds) || rosterIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: "rosterIds is required and must be a non-empty array"
        });
      }

      const result = await RosterService.bulkDeleteRosters(rosterIds);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: `Successfully deleted ${result.deleted} roster(s)`,
          data: result
        });
      } else {
        res.status(207).json({ // 207 Multi-Status for partial success
          success: false,
          message: `Deleted ${result.deleted} roster(s), but ${result.failed} failed`,
          data: result
        });
      }
    } catch (error) {
      console.error("Error bulk deleting rosters:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
    static async generateInitialRosters(req, res) {
    try {
      console.log('📞 API call: Generate initial rosters');
      const result = await RosterService.generateInitialRosters();
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
          data: result
        });
      }
    } catch (error) {
      console.error("❌ Error generating initial rosters:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: "Failed to generate initial rosters from parent data"
      });
    }
  }

  static async syncAllRosters(req, res) {
    try {
      console.log('📞 API call: Sync all rosters');
      const result = await RosterService.syncAllRosters();
      
      res.status(200).json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      console.error("❌ Error syncing all rosters:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: "Failed to sync roster data with current parents and coaches"
      });
    }
  }

  static async cleanupEmptyRosters(req, res) {
    try {
      const result = await RosterService.cleanupEmptyRosters();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("Error cleaning up empty rosters:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getRosterCreationStats(req, res) {
    try {
      const stats = await RosterService.getRosterCreationStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      console.error("Error getting roster creation stats:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Manual roster creation: options to populate form (students, locations, sports, grades)
  static async getManualCreateOptions(req, res) {
    try {
      const filters = {
        location: req.query.location,
        sport: req.query.sport,
        grade: req.query.grade,
      };
      const options = await RosterService.getManualCreateOptions(filters);
      res.status(200).json({ success: true, data: options });
    } catch (error) {
      console.error("Error getting manual create options:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getOptionStudents(req, res) {
    try {
      const filters = {
        location: req.query.location,
        sport: req.query.sport,
        grade: req.query.grade,
      };
      const students = await RosterService.getOptionStudents(filters);
      res.status(200).json({ success: true, data: students });
    } catch (error) {
      console.error("Error getting option students:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getOptionLocations(req, res) {
    try {
      const locations = await RosterService.getOptionLocations();
      res.status(200).json({ success: true, data: locations });
    } catch (error) {
      console.error("Error getting option locations:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getOptionSports(req, res) {
    try {
      const sports = await RosterService.getOptionSports();
      res.status(200).json({ success: true, data: sports });
    } catch (error) {
      console.error("Error getting option sports:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getOptionGrades(req, res) {
    try {
      const grades = RosterService.getOptionGrades();
      res.status(200).json({ success: true, data: grades });
    } catch (error) {
      console.error("Error getting option grades:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

}

module.exports = RosterController;