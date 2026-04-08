// firebase/apis/api-payment-history.js
import { cachedRequest, clearCache, deduplicateRequest } from '../../utils/requestCache'; // Single import
import { API_CONFIG } from '../config';
import { auth } from '../config';

class PaymentAPIService {
  // Get authorization header with Firebase ID token
  static async getAuthHeaders() {
    try {
      const user = auth.currentUser;
      if (user) {
        const idToken = await user.getIdToken();
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        };
      }
      return {
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('Error getting auth token:', error);
      return {
        'Content-Type': 'application/json'
      };
    }
  }

  // Get payment history by email with caching
  static async getPaymentHistoryByEmail(email, limit = 50) {
    const cacheKey = `payment-history-${email}-${limit}`;
    
    return cachedRequest(cacheKey, async () => {
      try {
        console.log('📊 Fetching payment history for:', email);
        
        const headers = await this.getAuthHeaders();
        const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.payments.getEmailHistory}/${encodeURIComponent(email)}?limit=${limit}`;
        
        console.log('🔗 Payment history API URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch payment history');
        }
        
        console.log('✅ Payment history fetched:', result.data?.length || 0, 'records');
        return result.data || [];
      } catch (error) {
        console.error('❌ Error fetching payment history by email:', error);
        throw error;
      }
    });
  }

  // Get payment statistics with caching
  static async getPaymentStats(userId) {
    if (!userId) return null;
    
    const cacheKey = `payment-stats-${userId}`;
    
    return cachedRequest(cacheKey, async () => {
      try {
        console.log('📊 Fetching payment stats for:', userId);
        
        const headers = await this.getAuthHeaders();
        const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.payments.getStats}/${userId}`;
        
        console.log('🔗 Payment stats API URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch payment stats');
        }
        
        console.log('✅ Payment stats fetched:', result.data);
        return result.data;
      } catch (error) {
        console.error('❌ Error fetching payment stats:', error);
        throw error;
      }
    });
  }

  // Get user payment history with caching
  static async getUserPaymentHistory(userId, limit = 50) {
    if (!userId) return [];
    
    const cacheKey = `user-payment-history-${userId}-${limit}`;
    
    return cachedRequest(cacheKey, async () => {
      try {
        console.log('📊 Fetching user payment history for:', userId);
        
        const headers = await this.getAuthHeaders();
        const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.payments.getUserHistory}/${userId}?limit=${limit}`;
        
        console.log('🔗 User payment history API URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch payment history');
        }
        
        console.log('✅ User payment history fetched:', result.data?.length || 0, 'records');
        return result.data || [];
      } catch (error) {
        console.error('❌ Error fetching user payment history:', error);
        throw error;
      }
    });
  }

  // Create payment record with deduplication
  static async createPaymentRecord(paymentData) {
    const requestKey = `payment-record-${paymentData.paymentIntentId}-${paymentData.userEmail}`;
    
    return deduplicateRequest(requestKey, async () => {
      try {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.payments.createRecord}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(paymentData),
        });

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error);
        }
        
        // Clear related cache when new payment is created
        clearCache('payment-history');
        clearCache('payment-stats');
        
        return result.data;
      } catch (error) {
        console.error('❌ Error creating payment record:', error);
        throw error;
      }
    });
  }

  // Update payment status
  static async updatePaymentStatus(paymentHistoryId, updates) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.payments.updateStatus}/${paymentHistoryId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Clear related cache when payment is updated
      clearCache('payment-history');
      clearCache('payment-stats');
      
      return result.data;
    } catch (error) {
      console.error('❌ Error updating payment status:', error);
      throw error;
    }
  }

  // Complete payment (Stripe + Firestore)
  static async completePayment(paymentData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.payments.completePayment}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Clear cache after successful payment completion
      clearCache('payment-history');
      clearCache('payment-stats');
      
      return result.data;
    } catch (error) {
      console.error('❌ Error completing payment:', error);
      throw error;
    }
  }

  // Clear cache method
  static clearCache(pattern) {
    clearCache(pattern);
  }
}

export default PaymentAPIService;