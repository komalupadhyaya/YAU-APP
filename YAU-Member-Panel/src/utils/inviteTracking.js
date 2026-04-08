// src/utils/inviteTracking.js
/**
 * Invite Tracking Utilities
 * Handles referral link tracking, pixel tracking, and invite attribution
 */

import {
  getInviteByCode,
  trackInviteOpened,
  trackInviteRegistered,
  trackInvitePaid
} from '../services/inviteService';

/**
 * Extract referral code from URL
 * @returns {string|null} - Referral code or null
 */
export const getReferralCodeFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('ref') || null;
};

/**
 * Store referral code in session
 * @param {string} referralCode - Referral code to store
 */
export const storeReferralCode = (referralCode) => {
  try {
    sessionStorage.setItem('referralCode', referralCode);
    sessionStorage.setItem('referralTimestamp', Date.now().toString());
    console.log('✅ Referral code stored:', referralCode);
  } catch (error) {
    console.error('Error storing referral code:', error);
  }
};

/**
 * Get stored referral code from session
 * @returns {string|null} - Stored referral code or null
 */
export const getStoredReferralCode = () => {
  try {
    const code = sessionStorage.getItem('referralCode');
    const timestamp = sessionStorage.getItem('referralTimestamp');

    // Check if code is still valid (within 30 days)
    if (code && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

      if (age < thirtyDaysInMs) {
        return code;
      } else {
        // Code expired, clear it
        clearReferralCode();
      }
    }

    return null;
  } catch (error) {
    console.error('Error retrieving referral code:', error);
    return null;
  }
};

/**
 * Clear stored referral code
 */
export const clearReferralCode = () => {
  try {
    sessionStorage.removeItem('referralCode');
    sessionStorage.removeItem('referralTimestamp');
    console.log('✅ Referral code cleared');
  } catch (error) {
    console.error('Error clearing referral code:', error);
  }
};

/**
 * Track invite link click
 * Called when user lands on site with referral code
 */
export const trackInviteLinkClick = async () => {
  try {
    // Check URL for referral code
    const referralCode = getReferralCodeFromUrl();

    if (!referralCode) {
      console.log('No referral code in URL');
      return null;
    }

    console.log('🔗 Processing referral code:', referralCode);

    // Store for later use
    storeReferralCode(referralCode);

    // Verify invite exists
    const invite = await getInviteByCode(referralCode);

    if (!invite) {
      console.warn('Invalid referral code:', referralCode);
      clearReferralCode();
      return null;
    }

    // Track as opened
    const updatedInvite = await trackInviteOpened(referralCode);

    if (updatedInvite) {
      console.log('✅ Invite opened tracked:', referralCode);
    }

    return updatedInvite;
  } catch (error) {
    console.error('Error tracking invite link click:', error);
    return null;
  }
};

/**
 * Track user registration with referral
 * Backend treats registration + payment as "joined"
 * @param {Object} userData - User data
 * @param {string} userData.userId - User ID
 * @param {string} userData.email - User email
 * @param {string} userData.name - User name
 */
export const trackReferralRegistration = async (userData) => {
  try {
    // Get stored referral code
    const referralCode = getStoredReferralCode();

    if (!referralCode) {
      console.log('No referral code stored for registration');
      return null;
    }

    console.log('📝 Tracking referral registration (joined):', {
      referralCode,
      userId: userData.userId,
      email: userData.email,
      name: userData.name
    });

    // Track as joined (backend combines registration + payment)
    const updatedInvite = await trackInviteRegistered(referralCode, {
      userId: userData.userId,
      email: userData.email,
      name: userData.name
    });

    if (updatedInvite) {
      console.log('✅ Referral registration tracked successfully:', referralCode);
      // Clear the code after successful tracking
      clearReferralCode();
    } else {
      console.log('⚠️ Backend returned null/false - tracking may have failed');
    }

    return updatedInvite;
  } catch (error) {
    console.error('Error tracking referral registration:', error);
    return null;
  }
};

/**
 * Track first payment with referral
 * Note: Backend treats this the same as registration (both are "joined")
 * @param {Object} paymentData - Payment data
 * @param {number} paymentData.amount - Payment amount
 * @param {string} paymentData.paymentId - Payment ID
 * @param {string} paymentData.userId - User ID
 */
export const trackReferralPayment = async (paymentData) => {
  try {
    // Get stored referral code
    const referralCode = getStoredReferralCode();

    if (!referralCode) {
      console.log('No referral code stored for payment');
      return null;
    }

    console.log('💰 Tracking referral payment (joined):', {
      referralCode,
      amount: paymentData.amount,
      userId: paymentData.userId
    });

    // Track as joined (backend combines registration + payment)
    const updatedInvite = await trackInvitePaid(referralCode, {
      amount: paymentData.amount,
      paymentId: paymentData.paymentId,
      userId: paymentData.userId
    });

    if (updatedInvite) {
      console.log('✅ Referral payment tracked:', referralCode);

      // Clear the code after successful tracking
      clearReferralCode();
    }

    return updatedInvite;
  } catch (error) {
    console.error('Error tracking referral payment:', error);
    return null;
  }
};

/**
 * Initialize invite tracking on page load
 * Call this in your App.jsx or main component
 */
export const initializeInviteTracking = async () => {
  try {
    // Check if there's a referral code in the URL
    const referralCode = getReferralCodeFromUrl();

    if (referralCode) {
      console.log('🎯 Initializing invite tracking for:', referralCode);
      await trackInviteLinkClick();

      // Clean URL (remove ref parameter)
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    }
  } catch (error) {
    console.error('Error initializing invite tracking:', error);
  }
};

/**
 * Generate email tracking pixel URL
 * For backend implementation - generates a tracking pixel URL
 * @param {string} inviteCode - Invite code
 * @returns {string} - Tracking pixel URL
 */
export const generateEmailTrackingPixel = (inviteCode) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/api/track-invite-open?code=${inviteCode}`;
};

/**
 * Check if user has an active referral
 * @returns {boolean}
 */
export const hasActiveReferral = () => {
  return getStoredReferralCode() !== null;
};

/**
 * Get referral info for display
 * @returns {Object|null}
 */
export const getReferralInfo = async () => {
  try {
    const referralCode = getStoredReferralCode();

    if (!referralCode) {
      return null;
    }

    const invite = await getInviteByCode(referralCode);

    if (!invite) {
      clearReferralCode();
      return null;
    }

    return {
      code: referralCode,
      senderName: invite.senderName,
      senderEmail: invite.senderEmail,
      channel: invite.channel
    };
  } catch (error) {
    console.error('Error getting referral info:', error);
    return null;
  }
};

/**
 * Attribution handling for multiple invites
 * First-click attribution (default)
 */
export const ATTRIBUTION_STRATEGY = {
  FIRST_CLICK: 'first_click',
  LAST_CLICK: 'last_click'
};

/**
 * Handle attribution strategy
 * @param {string} newReferralCode - New referral code
 * @param {string} strategy - Attribution strategy
 */
export const handleAttribution = (newReferralCode, strategy = ATTRIBUTION_STRATEGY.FIRST_CLICK) => {
  const existingCode = getStoredReferralCode();

  if (strategy === ATTRIBUTION_STRATEGY.FIRST_CLICK) {
    // Only store if no existing code
    if (!existingCode) {
      storeReferralCode(newReferralCode);
      return newReferralCode;
    }
    return existingCode;
  } else if (strategy === ATTRIBUTION_STRATEGY.LAST_CLICK) {
    // Always overwrite with new code
    storeReferralCode(newReferralCode);
    return newReferralCode;
  }

  return existingCode || newReferralCode;
};

export default {
  getReferralCodeFromUrl,
  storeReferralCode,
  getStoredReferralCode,
  clearReferralCode,
  trackInviteLinkClick,
  trackReferralRegistration,
  trackReferralPayment,
  initializeInviteTracking,
  generateEmailTrackingPixel,
  hasActiveReferral,
  getReferralInfo,
  handleAttribution,
  ATTRIBUTION_STRATEGY
};
