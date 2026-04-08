const ParentService = require("../services/parentService");

class ParentController {
  static async getParents(req, res) {
    try {
      const parents = await ParentService.getParents();
      res.status(200).json({ success: true, data: parents });
    } catch (error) {
      console.error("Error fetching parents:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getParentById(req, res) {
    try {
      const { id } = req.params;
      const parent = await ParentService.getParentById(id);
      if (!parent) {
        return res.status(404).json({ success: false, error: "Parent not found" });
      }
      res.status(200).json({ success: true, data: parent });
    } catch (error) {
      console.error("Error fetching parent:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async addParent(req, res) {
    try {
      const parentId = await ParentService.addParent(req.body);
      res.status(201).json({ success: true, data: { id: parentId } });
    } catch (error) {
      console.error("Error adding parent:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async updateParent(req, res) {
    try {
      const { id } = req.params;
      await ParentService.updateParent(id, req.body);
      res.status(200).json({ success: true, message: "Parent updated successfully with roster sync" });
    } catch (error) {
      console.error("Error updating parent:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async deleteParent(req, res) {
    try {
      const { id } = req.params;
      await ParentService.deleteParent(id);
      res.status(200).json({ success: true, message: "Parent deleted successfully" });
    } catch (error) {
      console.error("Error deleting parent:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async assignChildrenToExistingRosters(req, res) {
    try {
      const { parentId, parentData } = req.body;
      const results = await ParentService.assignChildrenToExistingRosters(parentId, parentData);
      res.status(200).json({ success: true, data: results });
    } catch (error) {
      console.error("Error assigning children to rosters:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async syncParentsToRosters(req, res) {
    try {
      const result = await ParentService.syncParentsToRosters();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("Error syncing parents to rosters:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = ParentController;