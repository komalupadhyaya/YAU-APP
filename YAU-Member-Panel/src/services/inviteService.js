// src/services/inviteService.js
/**
 * Referral/Invite Tracking Service
 * Integrates with backend referrals API
 *
 * Tracks invites through: Sent → Opened → Joined
 */

import { API_CONFIG } from '../firebase/config';
import { auth } from '../firebase/config';

// Get auth token
const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
};

// Invite status enum (Backend uses: sent, opened, joined)
export const InviteStatus = {
  SENT: 'sent',
  OPENED: 'opened',
  JOINED: 'joined',
  // Keep these for backward compatibility in UI
  REGISTERED: 'joined',
  PAID: 'joined'
};

// Invite channel/source enum
export const InviteChannel = {
  EMAIL: 'email',
  SMS: 'sms',
  LINK: 'link'
};

/**
 * Create a new invite
 * @param {Object} data - Invite data
 * @param {string} data.senderId - User ID of sender
 * @param {string} data.senderName - Name of sender
 * @param {string} data.senderEmail - Email of sender
 * @param {string} data.source - 'email', 'sms', or 'link'
 * @param {string} data.recipientEmail - Email of recipient (optional for link)
 * @param {string} data.recipientPhone - Phone of recipient (optional for email/link)
 * @param {string} data.recipientName - Name of recipient (optional)
 */
export const createInvite = async (data) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.referrals.create}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({
        senderId: data.senderId,
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        source: data.source || data.channel, // Backend uses 'source'
        recipientEmail: data.recipientEmail,
        recipientPhone: data.recipientPhone,
        recipientName: data.recipientName,
        campaign: data.campaign
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to create invite');
    }

    // Transform backend response to match frontend format
    return {
      id: result.data.id,
      inviteCode: result.data.referralCode,
      trackingUrl: result.data.trackingUrl,
      senderId: result.data.senderId,
      senderName: result.data.senderName,
      senderEmail: result.data.senderEmail,
      channel: result.data.source,
      recipientEmail: result.data.recipientEmail,
      recipientPhone: result.data.recipientPhone,
      recipientName: result.data.recipientName,
      status: result.data.status,
      createdAt: result.data.createdAt,
      sentAt: result.data.createdAt,
      openedAt: result.data.openedAt || null,
      joinedAt: result.data.joinedAt || null,
      // Maintain compatibility
      registeredAt: result.data.joinedAt || null,
      paidAt: result.data.joinedAt || null,
      metadata: result.data.metadata
    };
  } catch (error) {
    console.error('Error creating invite:', error);
    throw error;
  }
};

/**
 * Get invites for a specific user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 */
export const getUserInvites = async (userId, options = {}) => {
  try {
    const token = await getAuthToken();
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.referrals.getUserReferrals.replace(':userId', userId)}?limit=${limit}&offset=${offset}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch invites');
    }

    // Transform backend response to match frontend format
    const transformedInvites = result.data.referrals.map(invite => ({
      id: invite.id,
      inviteCode: invite.referralCode,
      trackingUrl: invite.trackingUrl,
      senderId: invite.senderId,
      senderName: invite.senderName,
      senderEmail: invite.senderEmail,
      channel: invite.source,
      recipientEmail: invite.recipientEmail,
      recipientPhone: invite.recipientPhone,
      recipientName: invite.recipientName,
      status: invite.status,
      createdAt: invite.createdAt,
      sentAt: invite.createdAt,
      openedAt: invite.openedAt || null,
      joinedAt: invite.joinedAt || null,
      registeredAt: invite.joinedAt || null,
      paidAt: invite.joinedAt || null,
      inviteeUserId: invite.recipientId,
      recipientId: invite.recipientId
    }));

    // Apply client-side filters if needed
    let filteredInvites = transformedInvites;

    if (options.status) {
      filteredInvites = filteredInvites.filter(invite => invite.status === options.status);
    }

    if (options.channel) {
      filteredInvites = filteredInvites.filter(invite => invite.channel === options.channel);
    }

    return {
      invites: filteredInvites,
      total: result.data.total,
      hasMore: result.data.offset + result.data.limit < result.data.total
    };
  } catch (error) {
    console.error('Error fetching user invites:', error);
    throw error;
  }
};

/**
 * Get all invites (admin only)
 * @param {Object} options - Query options
 */
export const getAllInvites = async (options = {}) => {
  // For admin, we can call getGlobalStats or iterate through users
  // For now, return user invites (admin would need separate endpoint)
  console.warn('getAllInvites not implemented - use getGlobalInviteStats for admin view');
  return {
    invites: [],
    total: 0,
    hasMore: false
  };
};

/**
 * Get invite by code
 * @param {string} inviteCode - Invite code
 */
export const getInviteByCode = async (inviteCode) => {
  try {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.referrals.getByCode.replace(':referralCode', inviteCode)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    // Transform backend response
    return {
      id: result.data.id,
      inviteCode: result.data.referralCode,
      trackingUrl: result.data.trackingUrl,
      senderId: result.data.senderId,
      senderName: result.data.senderName,
      senderEmail: result.data.senderEmail,
      channel: result.data.source,
      status: result.data.status,
      createdAt: result.data.createdAt,
      openedAt: result.data.openedAt || null,
      joinedAt: result.data.joinedAt || null
    };
  } catch (error) {
    console.error('Error fetching invite by code:', error);
    return null;
  }
};

/**
 * Track invite opened (via link click)
 * @param {string} inviteCode - Invite code
 */
export const trackInviteOpened = async (inviteCode) => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.referrals.trackOpened}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ referralCode: inviteCode })
    });

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    return {
      id: result.data.id,
      inviteCode: result.data.referralCode,
      status: result.data.status,
      openedAt: result.data.openedAt
    };
  } catch (error) {
    console.error('Error tracking invite opened:', error);
    return null;
  }
};

/**
 * Track invite registered (user signed up)
 * @param {string} inviteCode - Invite code
 * @param {Object} userData - User data
 */
export const trackInviteRegistered = async (inviteCode, userData) => {
  // Backend uses trackInviteJoined for this
  return trackInviteJoined(inviteCode, userData.userId);
};

/**
 * Track invite joined (user registered/paid)
 * @param {string} inviteCode - Invite code
 * @param {string} recipientId - User ID of new member
 */
export const trackInviteJoined = async (inviteCode, recipientId) => {
  try {
    console.log('🚀 trackInviteJoined called with:', { inviteCode, recipientId });

    // Validate inputs
    if (!inviteCode || !recipientId) {
      console.error('❌ Invalid inputs:', { inviteCode, recipientId });
      return null;
    }

    const token = await getAuthToken();
    console.log('🔑 Auth token obtained:', !!token);

    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.referrals.trackJoined}`;
    console.log('🌐 API URL:', url);

    const requestBody = {
      referralCode: inviteCode,
      recipientId: recipientId
    };
    console.log('📤 Request body:', requestBody);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response ok:', response.ok);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('❌ Non-JSON response received:', textResponse);
      return null;
    }

    const result = await response.json();
    console.log('📥 Response body:', result);

    if (!response.ok) {
      console.error('❌ HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        body: result
      });

      // Provide specific error messages for common issues
      if (response.status === 401) {
        console.error('❌ AUTHENTICATION FAILED: Backend requires auth token but none was provided or token is invalid');
        console.error('💡 TIP: This usually happens when the user is not logged in yet. Wait for Firebase auth to complete.');
      } else if (response.status === 404) {
        console.error('❌ NOT FOUND: The referral code does not exist in the database');
      } else if (response.status === 400) {
        console.error('❌ BAD REQUEST: Invalid request data sent to backend');
      }

      return null;
    }

    if (!result.success) {
      console.error('❌ Backend returned success=false:', {
        error: result.error,
        message: result.message,
        details: result.details
      });
      return null;
    }

    if (!result.data) {
      console.error('❌ Backend returned no data:', result);
      return null;
    }

    const transformedResult = {
      id: result.data.id,
      inviteCode: result.data.referralCode,
      status: result.data.status,
      joinedAt: result.data.joinedAt,
      recipientId: result.data.recipientId
    };

    console.log('✅ Transformed result:', transformedResult);
    return transformedResult;
  } catch (error) {
    console.error('❌ Error tracking invite joined:', error);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    return null;
  }
};

/**
 * Track invite paid (first payment completed)
 * @param {string} inviteCode - Invite code
 * @param {Object} paymentData - Payment data
 */
export const trackInvitePaid = async (inviteCode, paymentData) => {
  // Backend treats joined as the final state (includes payment)
  return trackInviteJoined(inviteCode, paymentData.userId);
};

/**
 * Get invite statistics for a user
 * @param {string} userId - User ID
 */
export const getUserInviteStats = async (userId) => {
  try {
    const token = await getAuthToken();
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.referrals.getUserStats.replace(':userId', userId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch stats');
    }

    // Transform to match frontend format
    return {
      total: result.data.total,
      sent: result.data.sent,
      opened: result.data.opened,
      registered: result.data.joined, // Backend uses 'joined'
      joined: result.data.joined,
      paid: result.data.joined,
      byChannel: result.data.bySource || result.data.byChannel || {
        email: 0,
        sms: 0,
        link: 0
      },
      conversionRate: {
        openRate: result.data.conversionRate?.openRate || 0,
        registrationRate: result.data.conversionRate?.joinRate || 0,
        joinRate: result.data.conversionRate?.joinRate || 0,
        paymentRate: result.data.conversionRate?.joinRate || 0
      }
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
};

/**
 * Get global invite statistics (admin only)
 */
export const getGlobalInviteStats = async () => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.referrals.getGlobalStats}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch global stats');
    }

    return {
      total: result.data.total,
      sent: result.data.sent,
      opened: result.data.opened,
      registered: result.data.joined,
      joined: result.data.joined,
      paid: result.data.joined,
      byChannel: result.data.bySource || result.data.byChannel || {
        email: 0,
        sms: 0,
        link: 0
      },
      conversionRate: {
        openRate: result.data.conversionRate?.openRate || 0,
        registrationRate: result.data.conversionRate?.joinRate || 0,
        joinRate: result.data.conversionRate?.joinRate || 0,
        paymentRate: result.data.conversionRate?.joinRate || 0
      },
      topReferrers: result.data.topReferrers || []
    };
  } catch (error) {
    console.error('Error fetching global stats:', error);
    throw error;
  }
};

/**
 * Delete an invite (admin only)
 * @param {string} referralCode - Referral code
 */
export const deleteInvite = async (referralCode) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(
      `${API_CONFIG.baseURL}${API_CONFIG.endpoints.referrals.deleteReferral.replace(':referralCode', referralCode)}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }
    );

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting invite:', error);
    throw error;
  }
};

/**
 * Resend an invite
 * @param {string} inviteId - Invite ID
 */
export const resendInvite = async (inviteId) => {
  // Backend doesn't have resend endpoint, so we recreate the invite
  console.warn('Resend functionality not implemented in backend');
  throw new Error('Resend not supported');
};

/**
 * Send email invite (calls createInvite)
 * @param {Object} data - Email data
 */
export const sendEmailInvite = async (data) => {
  console.log('📧 Sending email invite to:', data.recipientEmail);

  const invite = await createInvite({
    ...data,
    source: InviteChannel.EMAIL,
    channel: InviteChannel.EMAIL
  });

  return {
    success: true,
    invite
  };
};

/**
 * Send SMS invite (calls createInvite)
 * @param {Object} data - SMS data
 */
export const sendSMSInvite = async (data) => {
  console.log('📱 Sending SMS invite to:', data.recipientPhone);

  const invite = await createInvite({
    ...data,
    source: InviteChannel.SMS,
    channel: InviteChannel.SMS
  });

  return {
    success: true,
    invite
  };
};

/**
 * Rate limiting check for email invites
 * @param {string} userId - User ID
 */
export const checkEmailRateLimit = async (userId) => {
  try {
    const token = await getAuthToken();
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.referrals.checkRateLimit}?userId=${userId}&source=email`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    const result = await response.json();

    if (!result.success) {
      // Return default if check fails
      return {
        allowed: true,
        remaining: 50,
        limit: 50,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    }

    return result.data;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return {
      allowed: true,
      remaining: 50,
      limit: 50,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }
};

// Helper functions for backward compatibility
export const generateInviteCode = () => {
  // Backend generates codes, but keep for compatibility
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const generateTrackingUrl = (inviteCode) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/join?ref=${inviteCode}`;
};

export default {
  createInvite,
  getUserInvites,
  getAllInvites,
  getInviteByCode,
  trackInviteOpened,
  trackInviteRegistered,
  trackInviteJoined,
  trackInvitePaid,
  getUserInviteStats,
  getGlobalInviteStats,
  deleteInvite,
  resendInvite,
  sendEmailInvite,
  sendSMSInvite,
  checkEmailRateLimit,
  generateInviteCode,
  generateTrackingUrl,
  InviteStatus,
  InviteChannel
};
