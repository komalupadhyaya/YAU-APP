// firestore.js - Updated to use backend APIs instead of direct Firebase calls
import { API_CONFIG, buildApiUrl } from './config';

// Collection references (kept for reference)
export const COLLECTIONS = {
  PARENTS: 'registrations',
  COACHES: 'users',
  LOCATIONS: 'locations',
  GAME_NOTIFICATIONS: 'game_notifications'
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

// Locations functions
export const getLocations = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.locations.getAll));
  } catch (error) {
    console.error('Error getting locations:', error);
    throw error;
  }
};

export const getLocationById = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.locations.getById, { id }));
  } catch (error) {
    console.error('Error getting location:', error);
    throw error;
  }
};

export const addLocation = async (locationData) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.locations.create), {
      method: 'POST',
      body: JSON.stringify(locationData)
    });
    return result.id || result;
  } catch (error) {
    console.error('Error adding location:', error);
    throw error;
  }
};

export const updateLocation = async (id, updates) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.locations.update, { id }), {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
};

export const deleteLocation = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.locations.delete, { id }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    throw error;
  }
};

// Parents/Registration functions
export const getParents = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.parents.getAll));
  } catch (error) {
    console.error('Error getting parents:', error);
    throw error;
  }
};

export const getParentById = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.parents.getById, { id }));
  } catch (error) {
    console.error('Error getting parent:', error);
    throw error;
  }
};

export const addParent = async (parentData) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.parents.create), {
      method: 'POST',
      body: JSON.stringify(parentData)
    });
    return result.id || result;
  } catch (error) {
    console.error('Error adding parent:', error);
    throw error;
  }
};

export const updateParent = async (id, updates) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.parents.update, { id }), {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  } catch (error) {
    console.error('Error updating parent:', error);
    throw error;
  }
};

export const deleteParent = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.parents.delete, { id }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting parent:', error);
    throw error;
  }
};

// Coach functions
export const getCoaches = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.coaches.getAll));
  } catch (error) {
    console.error('Error getting coaches:', error);
    throw error;
  }
};

export const getCoachById = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.coaches.getById, { id }));
  } catch (error) {
    console.error('Error getting coach:', error);
    throw error;
  }
};

export const addCoach = async (coachData) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.coaches.create), {
      method: 'POST',
      body: JSON.stringify(coachData)
    });
    return result.id || result;
  } catch (error) {
    console.error('Error adding coach:', error);
    throw error;
  }
};

export const updateCoach = async (id, updates) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.coaches.update, { id }), {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  } catch (error) {
    console.error('Error updating coach:', error);
    throw error;
  }
};

export const deleteCoach = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.coaches.delete, { id }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting coach:', error);
    throw error;
  }
};

export const bulkDeleteCoaches = async (coachIds = []) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.coaches.bulkDelete), {
      method: 'POST',
      body: JSON.stringify({ coachIds })
    });
  } catch (error) {
    console.error('Error bulk deleting coaches:', error);
    throw error;
  }
};

// Member functions
export const getMembers = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.members.getAll));
  } catch (error) {
    console.error('Error getting members:', error);
    throw error;
  }
};

export const getMemberById = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.members.getById, { id }));
  } catch (error) {
    console.error('Error getting member:', error);
    throw error;
  }
};

export const addMember = async (memberData) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.members.create), {
      method: 'POST',
      body: JSON.stringify(memberData)
    });
    return result.id || result;
  } catch (error) {
    console.error('Error adding member:', error);
    throw error;
  }
};

export const updateMember = async (id, updates) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.members.update, { id }), {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  } catch (error) {
    console.error('Error updating member:', error);
    throw error;
  }
};

export const deleteMember = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.members.delete, { id }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    throw error;
  }
};

// Roster functions - Manual creation flow (binds to external roster API)
export const getManualCreateOptions = async (filters = {}) => {
  try {
    const endpoint = API_CONFIG.endpoints.rosters.getOptions;
    const baseUrl = `${API_CONFIG.baseURL}${endpoint}`;
    const params = new URLSearchParams();
    if (filters.location) params.append('location', filters.location);
    if (filters.sport) params.append('sport', filters.sport);
    if (filters.ageGroup) params.append('ageGroup', filters.ageGroup);
    const url = params.toString() ? `${baseUrl}?${params}` : baseUrl;
    return await apiCall(url);
  } catch (error) {
    console.error('Error getting manual create options:', error);
    throw error;
  }
};

export const getOptionStudents = async ({ location = '', sport = '', grade = '', ageGroup = '' } = {}) => {
  try {
    const endpoint = API_CONFIG.endpoints.rosters.getOptionStudents;
    const baseUrl = `${API_CONFIG.baseURL}${endpoint}`;
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (sport) params.append('sport', sport);
    if (grade) params.append('grade', grade);
    if (ageGroup) params.append('ageGroup', ageGroup); // Keep for backward compatibility
    const url = params.toString() ? `${baseUrl}?${params}` : baseUrl;
    return await apiCall(url);
  } catch (error) {
    console.error('Error getting option students:', error);
    throw error;
  }
};

export const createRoster = async (payload) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.rosters.create), {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return result?.id ? result : result;
  } catch (error) {
    console.error('Error creating roster:', error);
    throw error;
  }
};

// Roster functions
export const getRosters = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.rosters.getAll));
  } catch (error) {
    console.error('Error getting rosters:', error);
    throw error;
  }
};

export const getRosterById = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.rosters.getById, { id }));
  } catch (error) {
    console.error('Error getting roster:', error);
    throw error;
  }
};

export const addRoster = async (rosterData) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.rosters.create), {
      method: 'POST',
      body: JSON.stringify(rosterData)
    });
    return result.id || result;
  } catch (error) {
    console.error('Error adding roster:', error);
    throw error;
  }
};

export const updateRoster = async (id, updates) => {
  try {
    console.log('🔄 Updating roster via API:', id, updates);
    
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.rosters.update, { id }), {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  } catch (error) {
    console.error('❌ Error updating roster via API:', error);
    throw error;
  }
};

export const deleteRoster = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.rosters.delete, { id }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting roster:', error);
    throw error;
  }
};

export const bulkDeleteRosters = async (rosterIds = []) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.rosters.bulkDelete), {
      method: 'POST',
      body: JSON.stringify({ rosterIds })
    });
  } catch (error) {
    console.error('Error bulk deleting rosters:', error);
    throw error;
  }
};

export const generateInitialRosters = async () => {
  try {
    console.log('🏗️ Generating initial rosters via API...');
    
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.rosters.generateInitial), {
      method: 'POST'
    });
    
    console.log(`✅ Successfully generated ${result.rostersCreated || 0} rosters via API`);
    return result.rostersCreated || 0;
  } catch (error) {
    console.error('❌ Error generating initial rosters via API:', error);
    throw error;
  }
};

export const syncAllRosters = async () => {
  try {
    console.log('🔄 Starting bulk roster sync via API...');
    
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.rosters.syncAll), {
      method: 'POST'
    });
    
    console.log('✅ Bulk roster sync completed via API');
    return result;
  } catch (error) {
    console.error('❌ Error in bulk sync via API:', error);
    throw error;
  }
};

// Helper function (kept for client-side calculations)
export const calculateAgeGroup = (dob, storedAgeGroup = null) => {
  if (!dob && storedAgeGroup) {
    return storedAgeGroup;
  }
  if (!dob) {
    return '6U';
  }

  try {
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) {
      return storedAgeGroup || '6U';
    }

    const currentYear = new Date().getFullYear();
    const cutoffDate = new Date(currentYear, 6, 31);

    let ageAsOfJuly31 = currentYear - birthDate.getFullYear();
    const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

    if (birthdayThisYear > cutoffDate) {
      ageAsOfJuly31--;
    }

    const ageGroupMapping = {
      2: '3U', 3: '3U', 4: '4U', 5: '4U', 6: '6U', 7: '6U',
      8: '8U', 9: '9U', 10: '10U', 11: '10U', 12: '12U', 13: '12U', 14: '14U', 15: '14U'
    };

    return ageGroupMapping[ageAsOfJuly31] || '6U';
  } catch (error) {
    console.error('❌ Error calculating age group:', error);
    return storedAgeGroup || '6U';
  }
};

// Interest record function
export const createInterestRecordNew = async (parentId, parentData, child, searchCriteria) => {
  try {
    const interestData = {
      parentId: parentId,
      parentName: `${parentData.firstName} ${parentData.lastName}`,
      parentEmail: parentData.email,
      parentPhone: parentData.phone,
      parentLocation: parentData.location,
      childName: child.name || child.firstName,
      childAgeGroup: child.ageGroup,
      childDob: child.dob,
      requestedSport: searchCriteria.sport,
      requestedAgeGroup: searchCriteria.ageGroup,
      requestedLocation: searchCriteria.location,
      status: 'waiting_for_team',
      reason: 'no_coach_assigned',
      needsCoachAssignment: true
    };

    // Note: You might need to add an interest records endpoint to your API
    const result = await apiCall(`${API_CONFIG.baseURL}/interest-records`, {
      method: 'POST',
      body: JSON.stringify(interestData)
    });
    
    console.log(`📝 Created interest record for ${child.name || child.firstName}`);
    return result;
  } catch (error) {
    console.error('❌ Error creating interest record:', error);
    throw error;
  }
};

// Messages/Posts functions
export const getMessages = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.messages.getAll));
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

export const addMessage = async (messageData) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.messages.create), {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
    return result.id || result;
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
};

export const updateMessage = async (id, updates) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.messages.update, { id }), {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
};

export const deleteMessage = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.messages.delete, { id }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

export const getMessagesForGroup = async (ageGroup, location, sport) => {
  try {
    const params = new URLSearchParams();
    if (ageGroup) params.append('ageGroup', ageGroup);
    if (location) params.append('location', location);
    if (sport) params.append('sport', sport);
    
    const url = `${buildApiUrl(API_CONFIG.endpoints.messages.getForGroup)}?${params.toString()}`;
    return await apiCall(url);
  } catch (error) {
    console.error('Error getting targeted messages:', error);
    throw error;
  }
};

export const sendMessage = async (message) => {
  try {
    return await addMessage(message);
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Event functions
export const getEvents = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.events.getAll));
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

export const addEvent = async (eventData) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.events.create), {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
    return result.id || result;
  } catch (error) {
    console.error('Error adding event:', error);
    throw error;
  }
};

export const updateEvent = async (eventId, eventData) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.events.update, { id: eventId }), {
      method: 'PUT',
      body: JSON.stringify(eventData)
    });
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

export const deleteEvent = async (eventId) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.events.delete, { id: eventId }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

export const deleteExpiredEvents = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.events.deleteExpired), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('❌ Error deleting expired events:', error);
    throw error;
  }
};

// Game Schedule functions
export const getSchedules = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.gameSchedules.getAll));
  } catch (error) {
    console.error('Error getting schedules:', error);
    throw error;
  }
};

export const getScheduleById = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.gameSchedules.getById, { id }));
  } catch (error) {
    console.error('Error getting schedule:', error);
    throw error;
  }
};

export const addSchedule = async (scheduleData) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.gameSchedules.create), {
      method: 'POST',
      body: JSON.stringify(scheduleData)
    });
    return result.id || result;
  } catch (error) {
    console.error('Error adding schedule:', error);
    throw error;
  }
};

export const updateSchedule = async (id, updates) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.gameSchedules.update, { id }), {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }
};

export const deleteSchedule = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.gameSchedules.delete, { id }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
};

// Bulk delete schedules (supports { ids: [...] } or { filters: {...} }, dryRun, maxToDelete)
export const bulkDeleteSchedules = async (payload = {}) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.gameSchedules.bulkDelete), {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Error bulk deleting schedules:', error);
    throw error;
  }
};

export const sendGameNotification = async (gameData, notificationType = 'game_scheduled') => {
  try {
    console.log('📱 Sending game notification via API:', { 
      gameTitle: `${gameData.team1 || gameData.team1Name} vs ${gameData.team2 || gameData.team2Name}`,
      type: notificationType
    });

    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.gameSchedules.sendNotification), {
      method: 'POST',
      body: JSON.stringify({ gameData, notificationType })
    });
    
    console.log('✅ Game notification sent via API:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending game notification via API:', error);
    throw error;
  }
};

export const getGameRecipients = async (gameData) => {
  try {
    console.log('🔍 Getting game recipients via API');

    return await apiCall(buildApiUrl(API_CONFIG.endpoints.gameSchedules.getRecipients), {
      method: 'POST',
      body: JSON.stringify(gameData)
    });
  } catch (error) {
    console.error('❌ Error getting recipients via API:', error);
    throw error;
  }
};

// Community functions
export const getCommunityPosts = async (limit = 50, orderByField = 'createdAt', orderDirection = 'desc') => {
  try {
    const params = new URLSearchParams({ limit, orderBy: orderByField, orderDirection });
    const url = `${buildApiUrl(API_CONFIG.endpoints.community.getPosts)}?${params.toString()}`;
    return await apiCall(url);
  } catch (error) {
    console.error('Error getting community posts:', error);
    throw error;
  }
};

export const addCommunityPost = async (postData) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.community.createPost), {
      method: 'POST',
      body: JSON.stringify(postData)
    });
    return result.id || result;
  } catch (error) {
    console.error('Error adding community post:', error);
    throw error;
  }
};

export const updateCommunityPost = async (postId, updates) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.community.updatePost, { id: postId }), {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  } catch (error) {
    console.error('Error updating community post:', error);
    throw error;
  }
};

export const deleteCommunityPost = async (postId) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.community.deletePost, { id: postId }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting community post:', error);
    throw error;
  }
};

export const toggleCommunityPostLike = async (postId, userId, userType, userName) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.community.toggleLike, { postId }), {
      method: 'POST',
      body: JSON.stringify({ userId, userType, userName })
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
};

export const getCommunityPostLikes = async (postId) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.community.getPostLikes, { postId }));
  } catch (error) {
    console.error('Error getting post likes:', error);
    return [];
  }
};

export const addCommunityPostComment = async (postId, userId, userType, userName, comment) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.community.addComment, { postId }), {
      method: 'POST',
      body: JSON.stringify({ userId, userType, userName, comment })
    });
    return result.id || result;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

export const getCommunityPostComments = async (postId) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.community.getPostComments, { postId }));
  } catch (error) {
    console.error('Error getting post comments:', error);
    return [];
  }
};

export const deleteCommunityPostComment = async (commentId) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.community.deleteComment, { commentId }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

export const reportCommunityPost = async (postId, reporterId, reporterType, reason) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.community.reportPost, { postId }), {
      method: 'POST',
      body: JSON.stringify({ reporterId, reporterType, reason })
    });
  } catch (error) {
    console.error('Error reporting post:', error);
    throw error;
  }
};

export const getCommunityStats = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.community.getStats));
  } catch (error) {
    console.error('Error getting community stats:', error);
    return {};
  }
};

export const getCommunityAnalytics = async (timeRange = '7d') => {
  try {
    const params = new URLSearchParams({ timeRange });
    const url = `${buildApiUrl(API_CONFIG.endpoints.community.getAnalytics)}?${params.toString()}`;
    return await apiCall(url);
  } catch (error) {
    console.error('Error getting community analytics:', error);
    return null;
  }
};

export const getReportedPosts = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.community.getReportedPosts));
  } catch (error) {
    console.error('Error getting reported posts:', error);
    throw error;
  }
};

// Upload functions (if you have upload endpoints)
export const uploadFile = async (file, type = 'image') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const endpointMap = {
      image: API_CONFIG.endpoints.upload.image,
      document: API_CONFIG.endpoints.upload.document,
      avatar: API_CONFIG.endpoints.upload.avatar,
      'community-media': API_CONFIG.endpoints.upload.communityMedia,
      'event-image': API_CONFIG.endpoints.upload.eventImage
    };
    
    const endpoint = endpointMap[type] || API_CONFIG.endpoints.upload.image;
    
    const response = await fetch(buildApiUrl(endpoint), {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Legacy function mappings for backward compatibility
export const createCoach = addCoach;
export const createMember = addMember;
export const createParent = addParent;
export const getResources = async () => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.resources.getAll));
  } catch (error) {
    console.error('Error getting resources:', error);
    throw error;
  }
};

export const getResourceById = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.resources.getById, { id }));
  } catch (error) {
    console.error('Error getting resource:', error);
    throw error;
  }
};

export const addResource = async (resourceData) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.resources.create), {
      method: 'POST',
      body: JSON.stringify(resourceData)
    });
    return result.id || result;
  } catch (error) {
    console.error('Error adding resource:', error);
    throw error;
  }
};

export const updateResource = async (id, updates) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.resources.update, { id }), {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  } catch (error) {
    console.error('Error updating resource:', error);
    throw error;
  }
};

export const deleteResource = async (id) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.resources.delete, { id }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting resource:', error);
    throw error;
  }
};

export const batchDeleteResources = async (ids) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.resources.batchDelete), {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  } catch (error) {
    console.error('Error batch deleting resources:', error);
    throw error;
  }
};