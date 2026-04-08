// firebase/apis/api-card-management.js
import { API_CONFIG } from '../config';
import { auth } from '../config';

export class CardManagementService {
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

  // Get customer by email
  static async getCustomerByEmail(email) {
    try {
      console.log('🔍 Getting customer by email:', email);

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_CONFIG.baseURL}/stripe/customer-by-email/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers,
      });

      const result = await response.json();
      
      if (!result.success) {
        if (result.error.includes('not found')) {
          return null;
        }
        throw new Error(result.error);
      }
      
      console.log('✅ Customer found:', result.data);
      return result.data;
    } catch (error) {
      console.error('❌ Error getting customer:', error);
      throw error;
    }
  }

  // Get customer's payment methods
  static async getPaymentMethods(customerId) {
    try {
      console.log('💳 Getting payment methods for customer:', customerId);

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_CONFIG.baseURL}/stripe/payment-methods/${customerId}`, {
        method: 'GET',
        headers,
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('✅ Payment methods retrieved:', result.data);
      return result.data.paymentMethods || [];
    } catch (error) {
      console.error('❌ Error getting payment methods:', error);
      throw error;
    }
  }

  // Create setup intent for adding new card
  static async createSetupIntent(customerId) {
    try {
      console.log('🔧 Creating setup intent for customer:', customerId);

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_CONFIG.baseURL}/stripe/create-setup-intent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ customerId }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('✅ Setup intent created:', result.data);
      return result.data;
    } catch (error) {
      console.error('❌ Error creating setup intent:', error);
      throw error;
    }
  }

  // Attach payment method to customer
  static async attachPaymentMethod(paymentMethodId, customerId) {
    try {
      console.log('📎 Attaching payment method:', {paymentMethodId, customerId});

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_CONFIG.baseURL}/stripe/attach-payment-method`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ paymentMethodId, customerId }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('✅ Payment method attached:', result.data);
      return result.data;
    } catch (error) {
      console.error('❌ Error attaching payment method:', error);
      throw error;
    }
  }

  // Remove payment method
  static async detachPaymentMethod(paymentMethodId) {
    try {
      console.log('🗑️ Detaching payment method:', paymentMethodId);

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_CONFIG.baseURL}/stripe/detach-payment-method/${paymentMethodId}`, {
        method: 'DELETE',
        headers,
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('✅ Payment method detached:', result.data);
      return result.data;
    } catch (error) {
      console.error('❌ Error detaching payment method:', error);
      throw error;
    }
  }

  // Set default payment method
  static async setDefaultPaymentMethod(customerId, paymentMethodId) {
    try {
      console.log('⭐ Setting default payment method:', {customerId, paymentMethodId});

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_CONFIG.baseURL}/stripe/set-default-payment-method`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ customerId, paymentMethodId }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('✅ Default payment method set:', result.data);
      return result.data;
    } catch (error) {
      console.error('❌ Error setting default payment method:', error);
      throw error;
    }
  }
}

export default CardManagementService;