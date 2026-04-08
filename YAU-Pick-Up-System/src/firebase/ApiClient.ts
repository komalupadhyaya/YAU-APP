
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") || "http://127.0.0.1:5001/yau-app/us-central1/apis";

export class APIClient {
  static async makeRequest(endpoint: string, options: RequestInit = {}) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
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

  static async getCSRFToken() {
    const url = `${API_BASE_URL}/csrf-token`;
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

  static async sendWelcomeSMS(phoneNumber: string, csrfToken: string, platform: 'member' | 'pickup' = 'pickup') {
    return this.makeRequest('/sms/send', {
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

  static async sendEnrollmentSMS(phoneNumber: string, csrfToken: string, platform: 'member' | 'pickup' = 'member') {
    return this.makeRequest('/sms/send', {
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
