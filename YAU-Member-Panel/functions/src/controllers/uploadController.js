const UploadService = require("../services/uploadService");

class UploadController {
  static async uploadCommunityMedia(req, res) {
    try {
      console.log('📤 Community Media Upload Request Started');
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file provided"
        });
      }

      const { postId, userId, mediaType } = req.body;
      
      if (!postId) {
        return res.status(400).json({
          success: false,
          error: "postId is required"
        });
      }

      // Validate file type
      const validation = UploadService.validateFile(req.file, {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: [
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/avi', 'video/mov', 'video/wmv'
        ],
        required: true
      });

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.error
        });
      }

      const detectedMediaType = mediaType || (req.file.mimetype.startsWith('image/') ? 'image' : 'video');

      const uploadResult = await UploadService.uploadCommunityMedia(req.file, {
        postId,
        userId,
        mediaType: detectedMediaType
      });

      res.status(200).json({
        success: true,
        message: 'Community media uploaded successfully',
        data: uploadResult
      });

    } catch (error) {
      console.error("❌ Community media upload failed:", error);
      
      res.status(500).json({
        success: false,
        error: error.message || 'Upload failed'
      });
    }
  }

  static async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No image file provided"
        });
      }

      const validation = UploadService.validateFile(req.file, {
        maxSize: 5 * 1024 * 1024, // 5MB for images
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        required: true
      });

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.error
        });
      }

      const uploadResult = await UploadService.uploadImage(req.file, {
        folder: req.body.folder || 'images',
        userId: req.body.userId
      });

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        data: uploadResult
      });

    } catch (error) {
      console.error("❌ Image upload failed:", error);
      res.status(500).json({
        success: false,
        error: error.message || 'Image upload failed'
      });
    }
  }

  static async getFiles(req, res) {
    try {
      const files = await UploadService.getFiles(req.query);
      res.status(200).json({
        success: true,
        data: files
      });
    } catch (error) {
      console.error("❌ Error getting files:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async deleteFile(req, res) {
    try {
      await UploadService.deleteFile(req.params.fileId);
      res.status(200).json({
        success: true,
        message: "File deleted successfully"
      });
    } catch (error) {
      console.error("❌ Error deleting file:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = UploadController;