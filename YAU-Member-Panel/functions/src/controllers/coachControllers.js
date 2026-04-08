const CoachService = require("../services/coachService");

class CoachController {
  static async getCoaches(req, res) {
    try {
      console.log('📋 GET /coaches - Fetching all coaches');
      
      const coaches = await CoachService.getCoaches();
      
      res.status(200).json({ 
        success: true, 
        data: coaches,
        message: `Retrieved ${coaches.length} coaches successfully`
      });
      
    } catch (error) {
      console.error("❌ Error fetching coaches:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  static async getCoachById(req, res) {
    try {
      const { id } = req.params;
      console.log('🔍 GET /coaches/:id - Fetching coach:', id);
      
      const coach = await CoachService.getCoachById(id);
      
      if (!coach) {
        return res.status(404).json({ 
          success: false, 
          error: "Coach not found" 
        });
      }
      
      res.status(200).json({ 
        success: true, 
        data: coach 
      });
      
    } catch (error) {
      console.error("❌ Error fetching coach:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  static async createCoach(req, res) {
    try {
      console.log('➕ POST /coaches - Creating new coach');
      console.log('Request body fields:', Object.keys(req.body));
      
      const { firstName, lastName, email } = req.body;
      
      if (!firstName || !lastName || !email) {
        return res.status(400).json({
          success: false,
          error: 'First name, last name, and email are required'
        });
      }

      const coachId = await CoachService.createCoach(req.body);
      
      res.status(201).json({ 
        success: true, 
        data: { id: coachId },
        message: 'Coach created successfully with proper structure'
      });
      
    } catch (error) {
      console.error("❌ Error creating coach:", error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  static async updateCoach(req, res) {
    try {
      const { id } = req.params;
      console.log('📝 PUT /coaches/:id - Updating coach:', id);
      
      await CoachService.updateCoach(id, req.body);
      
      res.status(200).json({ 
        success: true, 
        message: "Coach updated successfully" 
      });
      
    } catch (error) {
      console.error("❌ Error updating coach:", error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  static async deleteCoach(req, res) {
    try {
      const { id } = req.params;
      console.log('🗑️ DELETE /coaches/:id - Deleting coach:', id);
      
      await CoachService.deleteCoach(id);
      
      res.status(200).json({ 
        success: true, 
        message: "Coach deleted successfully" 
      });
      
    } catch (error) {
      console.error("❌ Error deleting coach:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  static async bulkDeleteCoaches(req, res) {
    try {
      const { coachIds } = req.body;

      if (!Array.isArray(coachIds) || coachIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: "coachIds (non-empty array) is required"
        });
      }

      console.log('🗑️ DELETE /coaches/bulk - Deleting coaches:', coachIds);

      const results = await CoachService.bulkDeleteCoaches(coachIds);
      const failures = results.filter(result => result.status === 'failed');

      res.status(failures.length ? 207 : 200).json({
        success: failures.length === 0,
        message: failures.length
          ? `Deleted ${results.length - failures.length} coaches, ${failures.length} failed`
          : `Deleted ${results.length} coaches successfully`,
        results
      });
    } catch (error) {
      console.error("❌ Error bulk deleting coaches:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Enhanced assignment endpoint that matches existing structure  
  static async assignCoachToTeams(req, res) {
    try {
      const { id } = req.params;
      const assignmentData = req.body;
      
      console.log('🎯 POST /coaches/:id/assign-teams - Assigning coach to teams:', { id, assignmentData });
      
      const result = await CoachService.assignCoachToTeams(id, assignmentData);
      
      res.status(200).json({ 
        success: true, 
        message: "Coach assigned to teams successfully",
        data: result
      });
      
    } catch (error) {
      console.error("❌ Error assigning coach to teams:", error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  static async assignCoachToRoster(req, res) {
    try {
      const { id } = req.params;
      const { rosterId } = req.body;
      
      console.log('🎯 POST /coaches/:id/assign - Assigning coach to roster:', { id, rosterId });
      
      if (!rosterId) {
        return res.status(400).json({
          success: false,
          error: 'Roster ID is required'
        });
      }

      await CoachService.assignCoachToRoster(id, rosterId);
      
      res.status(200).json({ 
        success: true, 
        message: "Coach assigned to roster successfully" 
      });
      
    } catch (error) {
      console.error("❌ Error assigning coach to roster:", error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  static async getCoachesWithAssignments(req, res) {
    try {
      console.log('📋 GET /coaches/assignments - Getting coaches with assignments');
      
      const coaches = await CoachService.getCoachesWithAssignments();
      
      res.status(200).json({ 
        success: true, 
        data: coaches,
        message: `Retrieved ${coaches.length} coaches with assignment details`
      });
      
    } catch (error) {
      console.error("❌ Error getting coaches with assignments:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  static async getCoachesBySport(req, res) {
    try {
      const { sport } = req.params;
      console.log('🏆 GET /coaches/sport/:sport - Getting coaches by sport:', sport);
      
      const coaches = await CoachService.getCoachesBySport(sport);
      
      res.status(200).json({ 
        success: true, 
        data: coaches,
        message: `Found ${coaches.length} coaches for ${sport}`
      });
      
    } catch (error) {
      console.error("❌ Error getting coaches by sport:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  static async getCoachesByLocation(req, res) {
    try {
      const { location } = req.params;
      console.log('📍 GET /coaches/location/:location - Getting coaches by location:', location);
      
      const coaches = await CoachService.getCoachesByLocation(location);
      
      res.status(200).json({ 
        success: true, 
        data: coaches,
        message: `Found ${coaches.length} coaches for ${location}`
      });
      
    } catch (error) {
      console.error("❌ Error getting coaches by location:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  static async getCoachStats(req, res) {
    try {
      console.log('📊 GET /coaches/stats - Getting coach statistics');
      
      const stats = await CoachService.getCoachStats();
      
      res.status(200).json({ 
        success: true, 
        data: stats 
      });
      
    } catch (error) {
      console.error("❌ Error getting coach stats:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
}

module.exports = CoachController;