// src/controllers/resourceController.js

const ResourceService = require("../services/resourceServices");

class ResourceController {
  static async getAllResources(req, res) {
    try {
      const resources = await ResourceService.getAllResources();
      res.status(200).json({ success: true, data: resources });
    } catch (error) {
      console.error('Error getting resources:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch resources' });
    }
  }

  static async getResourceById(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Resource ID is required' });
      }
      const resource = await ResourceService.getResourceById(id);
      if (!resource) {
        return res.status(404).json({ success: false, error: 'Resource not found' });
      }
      res.status(200).json({ success: true, data: resource });
    } catch (error) {
      console.error('Error getting resource by ID:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch resource' });
    }
  }

  static async createResource(req, res) {
    try {
      const { name, description, link, isFeatured, phone, email } = req.body;
      let logo = req.body.logo;

      if (!name || !link) {
        return res.status(400).json({ success: false, error: 'Name and link are required' });
      }
      if (!/^https?:\/\/[^\s$.?#].[^\s]*$/.test(link)) {
        return res.status(400).json({ success: false, error: 'Invalid URL format' });
      }
      if (phone && !/^\+?\d{10,15}$/.test(phone)) {
        return res.status(400).json({ success: false, error: 'Invalid phone number format' });
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email format' });
      }
      if (req.file) {
        const uploadResult = await ResourceService.uploadResourceLogo(req.file);
        logo = uploadResult.url;
      }

      const resourceData = {
        name,
        description: description || '',
        link,
        logo: logo || '',
        isFeatured: !!isFeatured,
        phone: phone || '',
        email: email || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const resourceId = await ResourceService.createResource(resourceData);
      res.status(201).json({ success: true, message: 'Resource created successfully', data: { id: resourceId } });
    } catch (error) {
      console.error('Error creating resource:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to create resource' });
    }
  }

  static async updateResource(req, res) {
    try {
      const { id } = req.params;
      const { name, description, link, isFeatured, phone, email } = req.body;
      let logo = req.body.logo;

      if (!id) {
        return res.status(400).json({ success: false, error: 'Resource ID is required' });
      }
      if (!name || !link) {
        return res.status(400).json({ success: false, error: 'Name and link are required' });
      }
      if (!/^https?:\/\/[^\s$.?#].[^\s]*$/.test(link)) {
        return res.status(400).json({ success: false, error: 'Invalid URL format' });
      }
      if (phone && !/^\+?\d{10,15}$/.test(phone)) {
        return res.status(400).json({ success: false, error: 'Invalid phone number format' });
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email format' });
      }
      if (req.file) {
        const uploadResult = await ResourceService.uploadResourceLogo(req.file);
        logo = uploadResult.url;
      }

      const updates = {
        name,
        description: description || '',
        link,
        logo: logo || '',
        isFeatured: !!isFeatured,
        phone: phone || '',
        email: email || '',
        updatedAt: new Date(),
      };

      await ResourceService.updateResource(id, updates);
      res.status(200).json({ success: true, message: 'Resource updated successfully' });
    } catch (error) {
      console.error('Error updating resource:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to update resource' });
    }
  }

  static async deleteResource(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Resource ID is required' });
      }
      await ResourceService.deleteResource(id);
      res.status(200).json({ success: true, message: 'Resource deleted successfully' });
    } catch (error) {
      console.error('Error deleting resource:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to delete resource' });
    }
  }

  static async batchDeleteResources(req, res) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: 'Valid array of resource IDs is required' });
      }
      const result = await ResourceService.batchDeleteResources(ids);
      res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.successful} resource(s)`,
        summary: result,
      });
    } catch (error) {
      console.error('Error batch deleting resources:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to batch delete resources' });
    }
  }
}

module.exports = ResourceController;