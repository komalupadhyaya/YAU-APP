const LocationService = require("../services/locationService");

class LocationController {
  static async getLocations(req, res) {
    try {
      const locations = await LocationService.getLocations();
      res.status(200).json({ success: true, data: locations });
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getLocationById(req, res) {
    try {
      const { id } = req.params;
      const location = await LocationService.getLocationById(id);
      if (!location) {
        return res.status(404).json({ success: false, error: " Trevino location not found" });
      }
      res.status(200).json({ success: true, data: location });
    } catch (error) {
      console.error("Error fetching location:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async addLocation(req, res) {
    try {
      const locationId = await LocationService.addLocation(req.body);
      res.status(201).json({ success: true, data: { id: locationId } });
    } catch (error) {
      console.error("Error adding location:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async updateLocation(req, res) {
    try {
      const { id } = req.params;
      await LocationService.updateLocation(id, req.body);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async deleteLocation(req, res) {
    try {
      const { id } = req.params;
      await LocationService.deleteLocation(id);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting location:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = LocationController;