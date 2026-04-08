// routes/communityRoutes.js
const express = require("express");
const router = express.Router();
const CommunityController = require("../controllers/communityController");

// Posts
router.get("/posts", CommunityController.getCommunityPosts);
router.get("/posts/:id", CommunityController.getCommunityPostById);
router.post("/posts", CommunityController.addCommunityPost);
router.put("/posts/:id", CommunityController.updateCommunityPost);
router.delete("/posts/:id", CommunityController.deleteCommunityPost);

// Likes
router.post("/posts/:postId/like", CommunityController.toggleLike);
router.get("/posts/:postId/likes", CommunityController.getPostLikes);

// Comments
router.post("/posts/:postId/comments", CommunityController.addComment);
router.get("/posts/:postId/comments", CommunityController.getPostComments);
router.delete("/comments/:commentId", CommunityController.deleteComment);

// Reports
router.post("/posts/:postId/report", CommunityController.reportPost);
router.get("/reported-posts", CommunityController.getReportedPosts);

// Analytics & Stats
router.get("/stats", CommunityController.getCommunityStats);
router.get("/analytics", CommunityController.getCommunityAnalytics);

// Bulk operations
router.post("/posts/bulk-update", CommunityController.bulkUpdatePosts);

module.exports = router;