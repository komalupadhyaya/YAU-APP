// firebase/ApiClient.js (Create this file)
import { API_CONFIG } from './config';

export class APIClient {
  static async makeRequest(endpoint, options = {}) {
    try {
      const url = `${API_CONFIG.baseURL}${endpoint}`;
      console.log('🔗 Making API request to:', url);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'API request failed');
      }
      
      return result.data;
    } catch (error) {
      console.error('❌ API request failed:', error);
      throw error;
    }
  }

  // Stripe API methods using your backend
  static async createPaymentIntent(amount, currency = 'usd', planType, userEmail, userId, metadata = {}) {
    return this.makeRequest(API_CONFIG.endpoints.stripe.createPaymentIntent, {
      method: 'POST',
      body: JSON.stringify({
        amount,
        currency,
        planType,
        userEmail,
        userId,
        metadata,
      }),
    });
  }

  // Create Subscription (for monthly memberships)
  static async createSubscription(customerId, priceId, metadata = {}) {
    return this.makeRequest(API_CONFIG.endpoints.stripe.createSubscription, {
      method: 'POST',
      body: JSON.stringify({
        customerId,
        priceId,
        metadata,
      }),
    });
  }

  static async createCustomer(email, name, metadata = {}) {
    return this.makeRequest(API_CONFIG.endpoints.stripe.createCustomer, {
      method: 'POST',
      body: JSON.stringify({
        email,
        name,
        metadata,
      }),
    });
  }

  // Support methods
  static async sendSupportMessage(name, email, message) {
    return this.makeRequest('/support/message', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        message,
      }),
    });
  }

  // Uniform management methods
  static async getAllUniformOrders(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const url = `/uniforms${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.makeRequest(url, { method: 'GET' });
  }

  static async getUniformOrdersByParent(parentId) {
    return this.makeRequest(`/uniforms/parent/${parentId}`, { method: 'GET' });
  }

  static async getUniformOrdersByStudent(studentId) {
    return this.makeRequest(`/uniforms/student/${studentId}`, { method: 'GET' });
  }

  static async createUniformOrder(orderData) {
    return this.makeRequest('/uniforms', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  static async updateUniformOrder(orderId, updateData) {
    return this.makeRequest(`/uniforms/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  static async updateUniformReceivedStatus(orderId, received, adminId, adminName, notes = '') {
    return this.makeRequest(`/uniforms/${orderId}/received`, {
      method: 'PUT',
      body: JSON.stringify({
        received,
        adminId,
        adminName,
        notes,
      }),
    });
  }

  static async getUniformSummary(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const url = `/uniforms/summary${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.makeRequest(url, { method: 'GET' });
  }

  static async searchUniformOrders(searchTerm) {
    return this.makeRequest(`/uniforms/search?q=${encodeURIComponent(searchTerm)}`, {
      method: 'GET',
    });
  }

  static async exportUniformOrdersCSV(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const url = `${API_CONFIG.baseURL}/uniforms/export/csv${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    // For CSV export, we need to handle the response differently
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Return the blob for download
    return response.blob();
  }

  // CSRF API methods
  static async getCSRFToken() {
    // For CSRF token, we need to make a direct request to the backend
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.csrf.token}`;
    console.log('🔑 Getting CSRF token from:', url);

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to get CSRF token');
    }

    return result.csrfToken;
  }

  // SMS API methods
  static async sendWelcomeSMS(phoneNumber, csrfToken, platform = 'member') {
    return this.makeRequest(API_CONFIG.endpoints.sms.send, {
      method: 'POST',
      headers: {
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({
        phoneNumber,
        messageType: 'welcome',
        platform
      }),
    });
  }

  static async sendEnrollmentSMS(phoneNumber, csrfToken, platform = 'member') {
    return this.makeRequest(API_CONFIG.endpoints.sms.send, {
      method: 'POST',
      headers: {
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({
        phoneNumber,
        messageType: 'enrollment',
        platform
      }),
    });
  }
}