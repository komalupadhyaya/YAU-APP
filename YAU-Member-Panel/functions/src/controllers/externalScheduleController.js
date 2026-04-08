const externalScheduleService = require('../services/externalScheduleService');

const externalScheduleController = {
  // Create new match
  async createMatch(req, res) {
    try {
      const matchData = req.body;
      const match = await externalScheduleService.createMatch(matchData);
      res.status(201).json({
        success: true,
        message: 'Match created successfully',
        data: match
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get all matches with optional filtering
  async getAllMatches(req, res) {
    try {
      const { orgId, sport, ageGroup, status } = req.query;
      const matches = await externalScheduleService.getAllMatches({ 
        orgId, 
        sport, 
        ageGroup, 
        status 
      });
      res.status(200).json({
        success: true,
        count: matches.length,
        data: matches
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get match by ID
  async getMatchById(req, res) {
    try {
      const { id } = req.params;
      const match = await externalScheduleService.getMatchById(id);
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }
      res.status(200).json({
        success: true,
        data: match
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Update match
  async updateMatch(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const match = await externalScheduleService.updateMatch(id, updateData);
      res.status(200).json({
        success: true,
        message: 'Match updated successfully',
        data: match
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Delete match
  async deleteMatch(req, res) {
    try {
      const { id } = req.params;
      await externalScheduleService.deleteMatch(id);
      res.status(200).json({
        success: true,
        message: 'Match deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Delete all matches (DANGEROUS - use with caution)
  async deleteAllMatches(req, res) {
    try {
      const { confirmation } = req.body;
      if (!confirmation || confirmation !== 'DELETE_ALL_MATCHES') {
        return res.status(400).json({
          success: false,
          message: 'Confirmation required. Send confirmation: "DELETE_ALL_MATCHES" in request body'
        });
      }

      const result = await externalScheduleService.deleteAllMatches();
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Delete multiple matches by IDs
    async deleteMultipleMatches(req, res) {
      try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Array of match IDs is required'
          });
        }

        const result = await externalScheduleService.deleteMultipleMatches(ids);
        
        res.status(200).json({
          success: true,
          message: result.message,
          data: result
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    }
};

module.exports = externalScheduleController;