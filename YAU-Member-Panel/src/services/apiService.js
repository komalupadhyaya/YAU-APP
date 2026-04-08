import { API_CONFIG } from '../firebase/config';

class ApiService {
  static async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
}

// Events Service
export class EventsService extends ApiService {
  static async getAll() {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.events.getAll}`;
    return this.makeRequest(url);
  }

  static async getById(id) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.events.getById.replace(':id', id)}`;
    return this.makeRequest(url);
  }

  static async create(eventData) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.events.create}`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  static async update(id, eventData) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.events.update.replace(':id', id)}`;
    return this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  static async delete(id) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.events.delete.replace(':id', id)}`;
    return this.makeRequest(url, { method: 'DELETE' });
  }
}

// Game Schedules Service
export class GameSchedulesService extends ApiService {
  static async getAll() {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.gameSchedules.getAll}`;
    return this.makeRequest(url);
  }

  static async getById(id) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.gameSchedules.getById.replace(':id', id)}`;
    return this.makeRequest(url);
  }

  static async create(scheduleData) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.gameSchedules.create}`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    });
  }

  static async update(id, scheduleData) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.gameSchedules.update.replace(':id', id)}`;
    return this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(scheduleData),
    });
  }

  static async delete(id) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.gameSchedules.delete.replace(':id', id)}`;
    return this.makeRequest(url, { method: 'DELETE' });
  }

  /**
   * Bulk delete schedules by ids or by filters.
   *
   * payload example:
   * {
   *   confirmation: "BULK_DELETE_SCHEDULES",
   *   dryRun: true,
   *   maxToDelete: 5000,
   *   ids: ["id1","id2"],
   *   // OR
   *   filters: { season: "2024-25", sport: "Soccer", ageGroups: ["6U"] }
   * }
   */
  static async bulkDelete(payload) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.gameSchedules.bulkDelete}`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

// Resources Service
export class ResourcesService extends ApiService {
  static async getAll() {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.resources.getAll}`;
    return this.makeRequest(url);
  }

  static async getById(id) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.resources.getById.replace(':id', id)}`;
    return this.makeRequest(url);
  }

  static async create(resourceData) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.resources.create}`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(resourceData),
    });
  }

  static async update(id, resourceData) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.resources.update.replace(':id', id)}`;
    return this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(resourceData),
    });
  }

  static async delete(id) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.resources.delete.replace(':id', id)}`;
    return this.makeRequest(url, { method: 'DELETE' });
  }
}

// Community Service
export class CommunityService extends ApiService {
  static async getPosts() {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.community.getPosts}`;
    return this.makeRequest(url);
  }

  static async getPostById(id) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.community.getPostById.replace(':id', id)}`;
    return this.makeRequest(url);
  }

  static async createPost(postData) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.community.createPost}`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  static async updatePost(id, postData) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.community.updatePost.replace(':id', id)}`;
    return this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
  }

  static async deletePost(id) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.community.deletePost.replace(':id', id)}`;
    return this.makeRequest(url, { method: 'DELETE' });
  }

  static async toggleLike(postId) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.community.toggleLike.replace(':postId', postId)}`;
    return this.makeRequest(url, { method: 'POST' });
  }

  static async addComment(postId, commentData) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.community.addComment.replace(':postId', postId)}`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(commentData),
    });
  }

  static async getPostComments(postId) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.community.getPostComments.replace(':postId', postId)}`;
    return this.makeRequest(url);
  }

  static async deleteComment(commentId) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.community.deleteComment.replace(':commentId', commentId)}`;
    return this.makeRequest(url, { method: 'DELETE' });
  }

  static async getStats() {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.community.getStats}`;
    return this.makeRequest(url);
  }
}

// Rosters Service
export class RostersService extends ApiService {
  static async getAll() {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosters.getAll}`;
    return this.makeRequest(url);
  }

  /** Manual roster creation: all options in one call. Query: { location?, sport?, grade? } */
  static async getManualCreateOptions(query = {}) {
    const clean = Object.fromEntries(Object.entries(query).filter(([, v]) => v != null && v !== ''));
    const params = new URLSearchParams(clean);
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosters.getManualCreateOptions}${params.toString() ? `?${params.toString()}` : ''}`;
    return this.makeRequest(url);
  }

  /** Students (from parents) for manual roster. Query: { location?, sport?, grade? } */
  static async getOptionStudents(query = {}) {
    const clean = Object.fromEntries(Object.entries(query).filter(([, v]) => v != null && v !== ''));
    const params = new URLSearchParams(clean);
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosters.getOptionStudents}${params.toString() ? `?${params.toString()}` : ''}`;
    return this.makeRequest(url);
  }

  static async getOptionLocations() {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosters.getOptionLocations}`;
    return this.makeRequest(url);
  }

  static async getOptionSports() {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosters.getOptionSports}`;
    return this.makeRequest(url);
  }

  static async getOptionGrades() {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosters.getOptionGrades}`;
    return this.makeRequest(url);
  }

  static async getById(id) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosters.getById.replace(':id', id)}`;
    return this.makeRequest(url);
  }

  static async getByLocation(location) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosters.getByLocation.replace(':location', location)}`;
    return this.makeRequest(url);
  }

  static async getBySport(sport) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosters.getBySport.replace(':sport', sport)}`;
    return this.makeRequest(url);
  }

  static async getByGrade(grade) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosters.getByGrade.replace(':grade', grade)}`;
    return this.makeRequest(url);
  }

  static async getStats() {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosters.getStats}`;
    return this.makeRequest(url);
  }

  static async bulkDelete(rosterIds) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosters.bulkDelete}`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ rosterIds }),
    });
  }
}

// Pickup (bulk import)
export class PickupService extends ApiService {
  /**
   * Smart bulk import for pickup registrations.
   * See backend: POST /pickup/students/bulk-import (alias: /pickup/uploadNew)
   */
  static async bulkImport(payload) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.pickup.bulkImport}`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

// Team Messages Service
export class TeamMessagesService extends ApiService {
  static async getByRoster(rosterId) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.teamMessages.getByRoster.replace(':rosterId', rosterId)}`;
    return this.makeRequest(url);
  }

  static async getAll() {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.teamMessages.getAll}`;
    return this.makeRequest(url);
  }

  static async create(messageData) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.teamMessages.create}`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }
}

// Group Chats Service (Backend API calls)
export class GroupChatsService extends ApiService {
  static async createOrEnsureGroupChat(memberData, student) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.groupChats.createOrEnsure}`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ memberData, student }),
    });
  }

  static async getUserGroupChats(userEmail, userUid) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.groupChats.getUserChats}`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ userEmail, userUid }),
    });
  }

  static async getChatMessages(chatId, limit = 50, createDocumentIfMissing = false) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.groupChats.getMessages.replace(':chatId', chatId)}`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ limit, createDocumentIfMissing }),
    });
  }

  static async sendMessage(chatId, message, senderId, senderName, senderInfo = null) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.groupChats.sendMessage.replace(':chatId', chatId)}`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ message, senderId, senderName, senderInfo }),
    });
  }

  static async createGroupChatFromRoster(rosterId) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.groupChats.fromRoster}`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ rosterId }),
    });
  }

  static async syncRostersToGroupChats() {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.groupChats.syncRosters}`;
    return this.makeRequest(url, { method: 'POST' });
  }

  static async validateUserChatAccess(chatId, userEmail, userUid) {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.groupChats.validateAccess.replace(':chatId', chatId)}`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ userEmail, userUid }),
    });
  }

  static async ensureMessageCollectionStructure() {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.groupChats.ensureStructure}`;
    return this.makeRequest(url, { method: 'POST' });
  }
}

export default ApiService;