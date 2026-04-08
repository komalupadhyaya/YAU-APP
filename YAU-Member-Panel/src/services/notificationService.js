import { API_CONFIG } from '../firebase/config';

class NotificationService {
  static async getAdminNotifications() {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.adminNotifications.getAll}`);
      if (!response.ok) throw new Error('Failed to fetch admin notifications');
      const result = await response.json();
      // Handle response structure where data is nested
      return result.data ? result : { data: result };
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
      throw error;
    }
  }

  static async markNotificationAsRead(id) {
    try {
      const response = await fetch(
        `${API_CONFIG.baseURL}${API_CONFIG.endpoints.adminNotifications.markAsRead.replace(':id', id)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true })
        }
      );
      if (!response.ok) throw new Error('Failed to mark notification as read');
      return await response.json();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async getTeamMessages(rosterId) {
    try {
      const response = await fetch(
        `${API_CONFIG.baseURL}${API_CONFIG.endpoints.teamMessages.getByRoster.replace(':rosterId', rosterId)}`
      );
      if (!response.ok) throw new Error('Failed to fetch team messages');
      return await response.json();
    } catch (error) {
      console.error('Error fetching team messages:', error);
      throw error;
    }
  }

  static async getParentMessages(rosterId) {
    try {
      const response = await fetch(
        `${API_CONFIG.baseURL}${API_CONFIG.endpoints.parentMessages.getByRoster.replace(':rosterId', rosterId)}`
      );
      if (!response.ok) throw new Error('Failed to fetch parent messages');
      return await response.json();
    } catch (error) {
      console.error('Error fetching parent messages:', error);
      throw error;
    }
  }
}

export default NotificationService;