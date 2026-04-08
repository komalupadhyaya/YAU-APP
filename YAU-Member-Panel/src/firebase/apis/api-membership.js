import {  deduplicateRequest } from '../../utils/requestCache'; // Single import
import { API_CONFIG } from '../config';
import { auth } from '../config';

export class MembershipService {
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

  // Find user in both collections by email
  static async findUserByEmail(email) {
    try {
      console.log('🔍 Searching for user with email:', email);

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_CONFIG.baseURL}/membership/find-user/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers,
      });

      const result = await response.json();
      
      if (!result.success) {
        if (result.error.includes('User not found') || result.error.includes('not found')) {
          console.log('❌ User not found in any collection');
          return null;
        }
        throw new Error(result.error);
      }
      
      console.log('✅ Found user via API:', result.data.collection);
      return result.data;
    } catch (error) {
      console.error('❌ Error finding user via API:', error);
      throw error;
    }
  }

  // Update user membership status
  static async upgradeMembership(userEmail, membershipDetails) {
    const requestKey = `upgrade-${userEmail}-${membershipDetails.paymentIntentId}`;
    
    return deduplicateRequest(requestKey, async () => {
      try {
        console.log('💳 Upgrading membership via API for:', userEmail);

        const headers = await this.getAuthHeaders();
        const response = await fetch(`${API_CONFIG.baseURL}/membership/upgrade`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            userEmail,
            membershipDetails
          }),
        });

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error);
        }

        console.log('✅ Membership upgraded successfully via API');
        
        return {
          success: true,
          userId: result.data.userId,
          collection: result.data.collection,
          updatedData: result.data.updatedData
        };
      } catch (error) {
        console.error('❌ Error upgrading membership via API:', error);
        throw error;
      }
    });
  }


  // Get user membership status
  static async getMembershipStatus(userEmail) {
    try {
      console.log('📊 Getting membership status via API for:', userEmail);

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_CONFIG.baseURL}/membership/status/${encodeURIComponent(userEmail)}`, {
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

      return {
        isPaidMember: result.data.isPaidMember || false,
        membershipType: result.data.membershipType || null,
        paymentStatus: result.data.paymentStatus || 'inactive',
        membershipActivatedAt: result.data.membershipActivatedAt || null,
        collection: result.data.collection
      };
    } catch (error) {
      console.error('❌ Error getting membership status via API:', error);
      throw error;
    }
  }

  // Cancel membership (downgrade)
  static async cancelMembership(userEmail, reason = 'user_requested') {
    try {
      console.log('❌ Canceling membership via API for:', userEmail);

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_CONFIG.baseURL}/membership/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userEmail,
          reason
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      console.log('✅ Membership canceled successfully via API');
      return { success: true };
    } catch (error) {
      console.error('❌ Error canceling membership via API:', error);
      throw error;
    }
  }

  // Move user from registrations to members collection
  static async moveToMembersCollection(userEmail, membershipDetails) {
    try {
      console.log('🔄 Moving user to members collection via API:', userEmail);

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_CONFIG.baseURL}/membership/move-to-members`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userEmail,
          membershipDetails
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      console.log('✅ User moved to members collection successfully via API');
      
      return {
        success: true,
        userId: result.data.userId,
        collection: result.data.collection,
        updatedData: result.data.updatedData
      };
    } catch (error) {
      console.error('❌ Error moving user to members collection via API:', error);
      throw error;
    }
  }
}