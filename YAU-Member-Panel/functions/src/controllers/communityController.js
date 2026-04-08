// controllers/communityController.js

const CommunityService = require("../services/communityService");

class CommunityController {
  static async getCommunityPosts(req, res) {
    try {
      const { limit, orderBy, orderDirection } = req.query;
      const posts = await CommunityService.getCommunityPosts(
        parseInt(limit) || 50,
        orderBy || "createdAt",
        orderDirection || "desc"
      );
      res.status(200).json({ success: true, data: posts });
    } catch (error) {
      console.error("Error fetching community posts:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getCommunityPostById(req, res) {
    try {
      const { id } = req.params;
      const post = await CommunityService.getCommunityPostById(id);
      if (!post) {
        return res.status(404).json({ success: false, error: "Post not found" });
      }
      res.status(200).json({ success: true, data: post });
    } catch (error) {
      console.error("Error fetching community post:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async addCommunityPost(req, res) {
    try {
      const postId = await CommunityService.addCommunityPost(req.body);
      res.status(201).json({ success: true, data: { id: postId } });
    } catch (error) {
      console.error("Error adding community post:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async updateCommunityPost(req, res) {
    try {
      const { id } = req.params;
      await CommunityService.updateCommunityPost(id, req.body);
      res.status(200).json({ success: true, message: "Post updated successfully" });
    } catch (error) {
      console.error("Error updating community post:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async deleteCommunityPost(req, res) {
    try {
      const { id } = req.params;
      await CommunityService.deleteCommunityPost(id);
      res.status(200).json({ success: true, message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting community post:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async toggleLike(req, res) {
    try {
      const { postId } = req.params;
      const { userId, userType, userName } = req.body;
      const result = await CommunityService.toggleLike(postId, userId, userType, userName);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("Error toggling like:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async getPostLikes(req, res) {
    try {
      const { postId } = req.params;
      const likes = await CommunityService.getPostLikes(postId);
      res.status(200).json({ success: true, data: likes });
    } catch (error) {
      console.error("Error fetching post likes:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async addComment(req, res) {
    try {
      const { postId } = req.params;
      const { userId, userType, userName, comment } = req.body;
      const commentId = await CommunityService.addComment(postId, userId, userType, userName, comment);
      res.status(201).json({ success: true, data: { id: commentId } });
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async getPostComments(req, res) {
    try {
      const { postId } = req.params;
      const comments = await CommunityService.getPostComments(postId);
      res.status(200).json({ success: true, data: comments });
    } catch (error) {
      console.error("Error fetching post comments:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async deleteComment(req, res) {
    try {
      const { commentId } = req.params;
      await CommunityService.deleteComment(commentId);
      res.status(200).json({ success: true, message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async reportPost(req, res) {
    try {
      const { postId } = req.params;
      const { reporterId, reporterType, reason } = req.body;
      await CommunityService.reportPost(postId, reporterId, reporterType, reason);
      res.status(201).json({ success: true, message: "Post reported successfully" });
    } catch (error) {
      console.error("Error reporting post:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async getCommunityStats(req, res) {
    try {
      const stats = await CommunityService.getCommunityStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      console.error("Error fetching community stats:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getCommunityAnalytics(req, res) {
    try {
      const { timeRange } = req.query;
      const analytics = await CommunityService.getCommunityAnalytics(timeRange || "7d");
      res.status(200).json({ success: true, data: analytics });
    } catch (error) {
      console.error("Error fetching community analytics:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getReportedPosts(req, res) {
    try {
      const reportedPosts = await CommunityService.getReportedPosts();
      res.status(200).json({ success: true, data: reportedPosts });
    } catch (error) {
      console.error("Error fetching reported posts:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async bulkUpdatePosts(req, res) {
    try {
      const { postIds, updates } = req.body;
      await CommunityService.bulkUpdatePosts(postIds, updates);
      res.status(200).json({ success: true, message: "Posts updated successfully" });
    } catch (error) {
      console.error("Error bulk updating posts:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

module.exports = CommunityController;