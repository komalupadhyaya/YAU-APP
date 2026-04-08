// ==================== CONTROLLERS/organizationController.js ====================
const organizationService = require('../services/orgService');

const organizationController = {
  // Create new organization
  async createOrganization(req, res) {
    try {
      const orgData = req.body;
      const organization = await organizationService.createOrganization(orgData);
      res.status(201).json({
        success: true,
        message: 'Organization created successfully',
        data: organization
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get all organizations
  async getAllOrganizations(req, res) {
    try {
      const { status, city } = req.query;
      const organizations = await organizationService.getAllOrganizations({ status, city });
      res.status(200).json({
        success: true,
        count: organizations.length,
        data: organizations
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get organization by ID
  async getOrganizationById(req, res) {
    try {
      const { id } = req.params;
      const organization = await organizationService.getOrganizationById(id);
      if (!organization) {
        return res.status(404).json({
          success: false,
          message: 'Organization not found'
        });
      }
      res.status(200).json({
        success: true,
        data: organization
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Update organization
  async updateOrganization(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const organization = await organizationService.updateOrganization(id, updateData);
      res.status(200).json({
        success: true,
        message: 'Organization updated successfully',
        data: organization
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Delete organization
  async deleteOrganization(req, res) {
    try {
      const { id } = req.params;
      await organizationService.deleteOrganization(id);
      res.status(200).json({
        success: true,
        message: 'Organization deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Add new sport to organization
  async addSport(req, res) {
    try {
      const { id } = req.params;
      const { sportName, divisions } = req.body;
      
      if (!sportName) {
        return res.status(400).json({
          success: false,
          message: 'Sport name is required'
        });
      }

      const organization = await organizationService.addSport(id, sportName, divisions || []);
      res.status(200).json({
        success: true,
        message: 'Sport added successfully',
        data: organization
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Update sport in organization
  async updateSport(req, res) {
    try {
      const { id, sportName } = req.params;
      const { divisions } = req.body;
      
      if (!divisions || !Array.isArray(divisions)) {
        return res.status(400).json({
          success: false,
          message: 'Divisions array is required'
        });
      }

      const organization = await organizationService.updateSport(id, sportName, divisions);
      res.status(200).json({
        success: true,
        message: 'Sport updated successfully',
        data: organization
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Remove sport from organization
  async removeSport(req, res) {
    try {
      const { id, sportName } = req.params;
      const organization = await organizationService.removeSport(id, sportName);
      res.status(200).json({
        success: true,
        message: 'Sport removed successfully',
        data: organization
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Add division to a sport
  async addDivision(req, res) {
    try {
      const { id, sportName } = req.params;
      const { division } = req.body;
      
      if (!division) {
        return res.status(400).json({
          success: false,
          message: 'Division is required'
        });
      }

      const organization = await organizationService.addDivision(id, sportName, division);
      res.status(200).json({
        success: true,
        message: 'Division added successfully',
        data: organization
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Remove division from a sport
  async removeDivision(req, res) {
    try {
      const { id, sportName, division } = req.params;
      const organization = await organizationService.removeDivision(id, sportName, division);
      res.status(200).json({
        success: true,
        message: 'Division removed successfully',
        data: organization
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get all age groups
  async getAllAgeGroups(req, res) {
    try {
      const ageGroups = await organizationService.getAllAgeGroups();
      res.status(200).json({
        success: true,
        count: ageGroups.length,
        data: ageGroups
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get age group by age
  async getAgeGroupByAge(req, res) {
    try {
      const { age } = req.params;
      const ageGroup = await organizationService.getAgeGroupByAge(age);
      if (!ageGroup) {
        return res.status(404).json({
          success: false,
          message: 'Age group not found'
        });
      }
      res.status(200).json({
        success: true,
        data: ageGroup
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },
  // ==================== AGE GROUPS CRUD ====================

async createAgeGroup(req, res) {
  try {
    const data = req.body;
    const newAge = await organizationService.createAgeGroup(data);
    res.status(201).json({
      success: true,
      message: "Age group created successfully",
      data: newAge,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
},

async updateAgeGroup(req, res) {
  try {
    const { age } = req.params;
    const updates = req.body;
    const updated = await organizationService.updateAgeGroup(age, updates);
    res.status(200).json({
      success: true,
      message: "Age group updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
},

async deleteAgeGroup(req, res) {
  try {
    const { age } = req.params;
    const result = await organizationService.deleteAgeGroup(age);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
},

// ==================== BULK DELETE ENDPOINTS ====================

  // Delete all organizations (DANGEROUS - use with caution)
  async deleteAllOrganizations(req, res) {
    try {
      // Optional: Add security check for admin role
      // if (!req.user || !req.user.isAdmin) {
      //   return res.status(403).json({
      //     success: false,
      //     message: 'Admin access required for this operation'
      //   });
      // }

      // Optional: Add confirmation token or password
      const { confirmation } = req.body;
      if (!confirmation || confirmation !== 'DELETE_ALL_ORGANIZATIONS') {
        return res.status(400).json({
          success: false,
          message: 'Confirmation required. Send confirmation: "DELETE_ALL_ORGANIZATIONS" in request body'
        });
      }

      const result = await organizationService.deleteAllOrganizations();
      
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

  // Delete all age groups
  async deleteAllAgeGroups(req, res) {
    try {
      const { confirmation } = req.body;
      if (!confirmation || confirmation !== 'DELETE_ALL_AGE_GROUPS') {
        return res.status(400).json({
          success: false,
          message: 'Confirmation required. Send confirmation: "DELETE_ALL_AGE_GROUPS" in request body'
        });
      }

      const result = await organizationService.deleteAllAgeGroups();
      
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

  // Delete all data (organizations + age groups)
  async deleteAllData(req, res) {
    try {
      const { confirmation } = req.body;
      if (!confirmation || confirmation !== 'DELETE_ALL_DATA') {
        return res.status(400).json({
          success: false,
          message: 'Confirmation required. Send confirmation: "DELETE_ALL_DATA" in request body'
        });
      }

      const result = await organizationService.deleteAllData();
      
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

module.exports = organizationController;

