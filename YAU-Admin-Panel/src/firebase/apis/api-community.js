// firebase/apis/api-community.js - Updated to use backend APIs instead of direct Firebase calls
import { API_CONFIG, buildApiUrl, getEndpoint } from '../config';

// Collection reference (kept for reference)
export const COMMUNITY_COLLECTIONS = {
  COMMUNITY: 'yau_community',
  COMMUNITY_LIKES: 'community_likes',
  COMMUNITY_COMMENTS: 'community_comments',
  COMMUNITY_REPORTS: 'community_reports'
};

// Helper function for API calls
const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.success !== false ? data.data || data : Promise.reject(new Error(data.error));
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Community Posts CRUD
export const getCommunityPosts = async (limit = 50, orderByField = 'createdAt', orderDirection = 'desc') => {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      orderBy: orderByField,
      orderDirection
    });
    
    const url = `${buildApiUrl(API_CONFIG.endpoints.community.getPosts)}?${params.toString()}`;
    const posts = await apiCall(url);
    
    if (!posts || posts.length === 0) {
      console.warn('No community posts found.');
      return [];
    }

    return posts;
  } catch (error) {
    console.error('Error getting community posts:', error.message);
    throw new Error(`Failed to load community posts: ${error.message}`);
  }
};

export const addCommunityPost = async (postData) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.community.createPost), {
      method: 'POST',
      body: JSON.stringify({
        ...postData,
        status: postData.status || 'published',
        reportCount: 0,
        isBlocked: false,
        likesCount: 0,
        commentsCount: 0,
        shareCount: 0
      })
    });
    
    console.log('✅ Community post added via API:', result.id || result);
    return result.id || result;
  } catch (error) {
    console.error('❌ Error adding community post via API:', error);
    throw error;
  }
};

export const updateCommunityPost = async (postId, updates) => {
  try {
    await apiCall(buildApiUrl(API_CONFIG.endpoints.community.updatePost, { id: postId }), {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    console.log('✅ Community post updated via API:', postId);
  } catch (error) {
    console.error('❌ Error updating community post via API:', error);
    throw error;
  }
};

export const deleteCommunityPost = async (postId) => {
  try {
    await apiCall(buildApiUrl(API_CONFIG.endpoints.community.deletePost, { id: postId }), {
      method: 'DELETE'
    });
    console.log('✅ Community post deleted via API:', postId);
  } catch (error) {
    console.error('❌ Error deleting community post via API:', error);
    throw error;
  }
};
export const uploadCommunityMedia = async (file, postId, mediaType, onProgress) => {
  try {
    console.log('🚀 Starting frontend upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      postId,
      mediaType
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('postId', postId);
    formData.append('userId', 'current-user-id'); // Replace with actual user ID
    formData.append('mediaType', mediaType);

    // Create XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded * 100) / event.total);
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (result.success) {
              resolve(result.data);
            } else {
              reject(new Error(result.error || 'Upload failed'));
            }
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload timeout'));
      };

      // Use buildApiUrl to construct the endpoint URL
      const endpoint = getEndpoint('upload.communityMedia');
      const url = buildApiUrl(endpoint);
      xhr.open('POST', url);
      xhr.timeout = 300000; // 5 minutes
      xhr.send(formData);
    });

  } catch (error) {
    console.error('❌ Frontend upload error:', error);
    throw error;
  }
};

// Likes System
export const toggleCommunityPostLike = async (postId, userId, userType, userName) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.community.toggleLike, { postId }), {
      method: 'POST',
      body: JSON.stringify({
        userId,
        userType,
        userName
      })
    });
    
    return result;
  } catch (error) {
    console.error('Error toggling like via API:', error);
    throw error;
  }
};

export const getCommunityPostLikes = async (postId) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.community.getPostLikes, { postId }));
  } catch (error) {
    console.error('Error getting post likes via API:', error);
    return [];
  }
};

export const deleteCommunityPostLikes = async (postId) => {
  try {
    // This would be handled by the backend when deleting a post
    await apiCall(`${API_CONFIG.baseURL}/community/posts/${postId}/likes`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting post likes via API:', error);
  }
};

export const deleteCommunityLike = async (likeId) => {
  try {
    await apiCall(`${API_CONFIG.baseURL}/community/likes/${likeId}`, {
      method: 'DELETE'
    });
    console.log('✅ Like deleted via API:', likeId);
  } catch (error) {
    console.error('❌ Error deleting like via API:', error);
    throw error;
  }
};

// Comments System
export const getCommunityPostComments = async (postId) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.community.getPostComments, { postId }));
  } catch (error) {
    console.error('Error getting post comments via API:', error);
    return [];
  }
};

export const addCommunityPostComment = async (postId, userId, userType, userName, comment) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.community.addComment, { postId }), {
      method: 'POST',
      body: JSON.stringify({
        userId,
        userType,
        userName,
        comment
      })
    });
    
    return result.id || result;
  } catch (error) {
    console.error('Error adding comment via API:', error);
    throw error;
  }
};

export const deleteCommunityPostComment = async (commentId) => {
  try {
    await apiCall(buildApiUrl(API_CONFIG.endpoints.community.deleteComment, { commentId }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting comment via API:', error);
    throw error;
  }
};

export const deleteCommunityPostComments = async (postId) => {
  try {
    // This would be handled by the backend when deleting a post
    await apiCall(`${API_CONFIG.baseURL}/community/posts/${postId}/comments`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting post comments via API:', error);
  }
};

export const updateCommunityComment = async (commentId, updates) => {
  try {
    await apiCall(`${API_CONFIG.baseURL}/community/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    console.log('✅ Comment updated via API:', commentId);
  } catch (error) {
    console.error('❌ Error updating comment via API:', error);
    throw error;
  }
};

// Reporting System
export const reportCommunityPost = async (postId, reporterId, reporterType, reason) => {
  try {
    await apiCall(buildApiUrl(API_CONFIG.endpoints.community.reportPost, { postId }), {
      method: 'POST',
      body: JSON.stringify({
        reporterId,
        reporterType,
        reason
      })
    });
  } catch (error) {
    console.error('Error reporting post via API:', error);
    throw error;
  }
};

export const getCommunityPostReports = async (postId) => {
  try {
    return await apiCall(`${API_CONFIG.baseURL}/community/posts/${postId}/reports`);
  } catch (error) {
    console.error('Error getting post reports via API:', error);
    return [];
  }
};

export const updateCommunityReportStatus = async (reportId, status) => {
  try {
    await apiCall(`${API_CONFIG.baseURL}/community/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    console.log('✅ Report status updated via API:', reportId);
  } catch (error) {
    console.error('❌ Error updating report status via API:', error);
    throw error;
  }
};

export const deleteCommunityReport = async (reportId) => {
  try {
    await apiCall(`${API_CONFIG.baseURL}/community/reports/${reportId}`, {
      method: 'DELETE'
    });
    console.log('✅ Report deleted via API:', reportId);
  } catch (error) {
    console.error('❌ Error deleting report via API:', error);
    throw error;
  }
};

// Utility Functions
export const getCommunityPostsByUserType = async (userType) => {
  try {
    const params = new URLSearchParams({ userType });
    const url = `${buildApiUrl(API_CONFIG.endpoints.community.getPosts)}?${params.toString()}`;
    return await apiCall(url);
  } catch (error) {
    console.error('Error getting posts by user type via API:', error);
    throw error;
  }
};

export const getReportedPosts = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.community.getReportedPosts));
  } catch (error) {
    console.error('Error getting reported posts via API:', error);
    throw error;
  }
};

export const getCommunityStats = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.community.getStats));
  } catch (error) {
    console.error('Error getting community stats via API:', error);
    return {};
  }
};

export const getCommunityAnalytics = async (timeRange = '7d') => {
  try {
    const params = new URLSearchParams({ timeRange });
    const url = `${buildApiUrl(API_CONFIG.endpoints.community.getAnalytics)}?${params.toString()}`;
    return await apiCall(url);
  } catch (error) {
    console.error('Error getting community analytics via API:', error);
    return null;
  }
};

// Bulk Operations
export const bulkUpdatePosts = async (postIds, updates) => {
  try {
    await apiCall(buildApiUrl(API_CONFIG.endpoints.community.bulkUpdatePosts), {
      method: 'POST',
      body: JSON.stringify({
        postIds,
        updates
      })
    });
    console.log('✅ Bulk update completed via API for', postIds.length, 'posts');
  } catch (error) {
    console.error('❌ Error in bulk update via API:', error);
    throw error;
  }
};

// Advanced Analytics Functions
export const getCommunityEngagementMetrics = async (timeRange = '7d') => {
  try {
    const params = new URLSearchParams({ timeRange, type: 'engagement' });
    const url = `${buildApiUrl(API_CONFIG.endpoints.community.getAnalytics)}?${params.toString()}`;
    return await apiCall(url);
  } catch (error) {
    console.error('Error getting engagement metrics via API:', error);
    return null;
  }
};

export const getCommunityUserActivity = async (userId, timeRange = '30d') => {
  try {
    const params = new URLSearchParams({ userId, timeRange });
    const url = `${API_CONFIG.baseURL}/community/analytics/user-activity?${params.toString()}`;
    return await apiCall(url);
  } catch (error) {
    console.error('Error getting user activity via API:', error);
    return null;
  }
};

export const getCommunityTrends = async (timeRange = '30d') => {
  try {
    const params = new URLSearchParams({ timeRange, type: 'trends' });
    const url = `${buildApiUrl(API_CONFIG.endpoints.community.getAnalytics)}?${params.toString()}`;
    return await apiCall(url);
  } catch (error) {
    console.error('Error getting community trends via API:', error);
    return null;
  }
};

// Content Moderation Functions
export const moderateCommunityPost = async (postId, action, reason) => {
  try {
    await apiCall(`${API_CONFIG.baseURL}/community/posts/${postId}/moderate`, {
      method: 'POST',
      body: JSON.stringify({
        action, // 'approve', 'block', 'delete', 'flag'
        reason
      })
    });
    console.log('✅ Post moderated via API:', postId, action);
  } catch (error) {
    console.error('❌ Error moderating post via API:', error);
    throw error;
  }
};

export const getModerationQueue = async () => {
  try {
    return await apiCall(`${API_CONFIG.baseURL}/community/moderation/queue`);
  } catch (error) {
    console.error('Error getting moderation queue via API:', error);
    return [];
  }
};

export const autoModerateCommunityContent = async (contentType = 'posts') => {
  try {
    const result = await apiCall(`${API_CONFIG.baseURL}/community/moderation/auto-moderate`, {
      method: 'POST',
      body: JSON.stringify({ contentType })
    });
    console.log('✅ Auto-moderation completed via API:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in auto-moderation via API:', error);
    throw error;
  }
};

// Search and Filter Functions
export const searchCommunityPosts = async (searchTerm, filters = {}) => {
  try {
    const params = new URLSearchParams({
      q: searchTerm,
      ...filters
    });
    const url = `${API_CONFIG.baseURL}/community/search?${params.toString()}`;
    return await apiCall(url);
  } catch (error) {
    console.error('Error searching community posts via API:', error);
    return [];
  }
};

export const getCommunityPostsByTag = async (tag) => {
  try {
    const params = new URLSearchParams({ tag });
    const url = `${buildApiUrl(API_CONFIG.endpoints.community.getPosts)}?${params.toString()}`;
    return await apiCall(url);
  } catch (error) {
    console.error('Error getting posts by tag via API:', error);
    return [];
  }
};

export const getFeaturedCommunityPosts = async (limit = 10) => {
  try {
    const params = new URLSearchParams({ featured: 'true', limit: limit.toString() });
    const url = `${buildApiUrl(API_CONFIG.endpoints.community.getPosts)}?${params.toString()}`;
    return await apiCall(url);
  } catch (error) {
    console.error('Error getting featured posts via API:', error);
    return [];
  }
};

// User Engagement Functions
export const getCommunityUserStats = async (userId) => {
  try {
    return await apiCall(`${API_CONFIG.baseURL}/community/users/${userId}/stats`);
  } catch (error) {
    console.error('Error getting user stats via API:', error);
    return {};
  }
};

export const getCommunityLeaderboard = async (timeRange = '30d', metric = 'engagement') => {
  try {
    const params = new URLSearchParams({ timeRange, metric });
    const url = `${API_CONFIG.baseURL}/community/leaderboard?${params.toString()}`;
    return await apiCall(url);
  } catch (error) {
    console.error('Error getting community leaderboard via API:', error);
    return [];
  }
};

// Export Functions
export const exportCommunityData = async (filters = {}, format = 'json') => {
  try {
    const params = new URLSearchParams({ ...filters, format });
    const url = `${API_CONFIG.baseURL}/community/export?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    
    if (format === 'json') {
      return await response.json();
    } else {
      return await response.blob();
    }
  } catch (error) {
    console.error('Error exporting community data via API:', error);
    throw error;
  }
};

// Notification Functions
export const getCommunityNotifications = async (userId) => {
  try {
    return await apiCall(`${API_CONFIG.baseURL}/community/users/${userId}/notifications`);
  } catch (error) {
    console.error('Error getting community notifications via API:', error);
    return [];
  }
};

export const markCommunityNotificationRead = async (notificationId) => {
  try {
    await apiCall(`${API_CONFIG.baseURL}/community/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
  } catch (error) {
    console.error('Error marking notification as read via API:', error);
    throw error;
  }
};

// Legacy function mappings for backward compatibility
export const createCommunityPost = addCommunityPost;

export default {
  // Posts
  getCommunityPosts,
  addCommunityPost,
  updateCommunityPost,
  deleteCommunityPost,
  
  // Media
  uploadCommunityMedia,
  
  // Likes
  toggleCommunityPostLike,
  getCommunityPostLikes,
  deleteCommunityLike,
  
  // Comments
  getCommunityPostComments,
  addCommunityPostComment,
  deleteCommunityPostComment,
  updateCommunityComment,
  
  // Reports
  reportCommunityPost,
  getCommunityPostReports,
  updateCommunityReportStatus,
  deleteCommunityReport,
  
  // Analytics
  getCommunityStats,
  getCommunityAnalytics,
  getCommunityEngagementMetrics,
  getCommunityTrends,
  
  // Moderation
  moderateCommunityPost,
  getModerationQueue,
  autoModerateCommunityContent,
  
  // Search
  searchCommunityPosts,
  getCommunityPostsByTag,
  getFeaturedCommunityPosts,
  
  // Utilities
  getCommunityPostsByUserType,
  getReportedPosts,
  bulkUpdatePosts,
  exportCommunityData
};