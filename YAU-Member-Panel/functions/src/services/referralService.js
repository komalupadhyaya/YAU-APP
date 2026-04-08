const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Referral Constants
const REFERRAL_STATUS = {
  SENT: 'sent',
  OPENED: 'opened', 
  JOINED: 'joined'
};

const REFERRAL_SOURCE = {
  EMAIL: 'email',
  SMS: 'sms',
  LINK: 'link'
};

const RATE_LIMITS = {
  EMAIL_DAILY_LIMIT: 50,
  SMS_DAILY_LIMIT: 20
};

const REWARDS = {
  JOIN_REWARD_AMOUNT: 10.00,
  MAX_REWARDS_PER_USER: 500.00
};

const db = admin.firestore();
const REFERRALS_COLLECTION = 'referrals';
const USERS_COLLECTION = 'users';

class ReferralService {
  /**
   * Generate unique referral code
   */
  generateReferralCode(senderName) {
    const prefix = senderName.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-R-${random}`;
  }

  /**
   * Generate tracking URL
   */
  generateTrackingUrl(referralCode) {
    const domain = process.env.NODE_ENV === 'production' 
      ? 'https://yauapp.com' 
      : 'http://localhost:3000';
    return `${domain}/join?ref=${referralCode}`;
  }

  /**
   * Create a new referral
   */
  async createReferral(data) {
    try {
      const { senderId, senderName, senderEmail, source, recipientEmail, recipientPhone, recipientName, campaign } = data;

      // Validate required fields
      if (!senderId || !senderName || !senderEmail || !source) {
        throw new Error('Missing required fields: senderId, senderName, senderEmail, source');
      }

      // Validate source
      if (!Object.values(REFERRAL_SOURCE).includes(source)) {
        throw new Error('Invalid referral source');
      }

      // Check rate limits for email/SMS
      if (source === REFERRAL_SOURCE.EMAIL) {
        const rateLimit = await this.checkEmailRateLimit(senderId);
        if (!rateLimit.allowed) {
          throw new Error(`Daily email limit reached. You can send ${rateLimit.remaining} more invites tomorrow.`);
        }
      }

      if (source === REFERRAL_SOURCE.SMS) {
        const rateLimit = await this.checkSMSRateLimit(senderId);
        if (!rateLimit.allowed) {
          throw new Error(`Daily SMS limit reached. You can send ${rateLimit.remaining} more invites tomorrow.`);
        }
      }

      // Generate unique referral code
      const referralCode = this.generateReferralCode(senderName);
      
      // Check for duplicates
      const existing = await db.collection(REFERRALS_COLLECTION)
        .where('referralCode', '==', referralCode)
        .get();
      
      if (!existing.empty) {
        throw new Error('Referral code collision, please try again');
      }

      const referral = {
        id: uuidv4(),
        referralCode,
        senderId,
        senderName,
        senderEmail,
        recipientEmail: recipientEmail || null,
        recipientPhone: recipientPhone || null,
        recipientName: recipientName || null,
        source,
        status: REFERRAL_STATUS.SENT,
        createdAt: new Date().toISOString(),
        trackingUrl: this.generateTrackingUrl(referralCode),
        metadata: {
          campaign: campaign || null,
          userAgent: data.userAgent || null,
          ipAddress: data.ipAddress || null
        }
      };

      // Store in Firestore using referralCode as document ID for easy lookup
      await db.collection(REFERRALS_COLLECTION)
        .doc(referralCode)
        .set(referral);

      console.log(`✅ Referral created: ${referralCode} by ${senderEmail}`);
      return referral;

    } catch (error) {
      console.error('Error creating referral:', error);
      throw error;
    }
  }

  /**
   * Get referral by code
   */
  async getReferralByCode(referralCode) {
    try {
      const doc = await db.collection(REFERRALS_COLLECTION)
        .doc(referralCode)
        .get();

      if (!doc.exists) {
        return null;
      }

      return doc.data();
    } catch (error) {
      console.error('Error getting referral:', error);
      throw error;
    }
  }

  /**
   * Update referral status
   */
  async updateReferralStatus(data) {
    try {
      const { referralCode, status, recipientId, userAgent, ipAddress } = data;

      const referral = await this.getReferralByCode(referralCode);
      if (!referral) {
        throw new Error('Referral not found');
      }

      const updateData = {
        status
      };

      // Set timestamps based on status
      if (status === REFERRAL_STATUS.OPENED && !referral.openedAt) {
        updateData.openedAt = new Date().toISOString();
      }

      if (status === REFERRAL_STATUS.JOINED && !referral.joinedAt) {
        updateData.joinedAt = new Date().toISOString();
        updateData.recipientId = recipientId;
        
        // Award referral credit to sender
        await this.awardReferralCredit(referral.senderId, referralCode);
      }

      // Update metadata
      if (userAgent || ipAddress) {
        updateData.metadata = {
          ...referral.metadata,
          userAgent: userAgent || referral.metadata?.userAgent,
          ipAddress: ipAddress || referral.metadata?.ipAddress
        };
      }

      await db.collection(REFERRALS_COLLECTION)
        .doc(referralCode)
        .update(updateData);

      console.log(`✅ Referral ${referralCode} status updated to: ${status}`);
      return {
        ...referral,
        ...updateData
      };

    } catch (error) {
      console.error('Error updating referral status:', error);
      throw error;
    }
  }

  /**
   * Get user referrals with pagination
   */
  async getUserReferrals(userId, limit = 50, offset = 0) {
    try {
      const snapshot = await db.collection(REFERRALS_COLLECTION)
        .where('senderId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const referrals = [];
      snapshot.forEach(doc => {
        referrals.push(doc.data());
      });

      // Apply offset manually since Firestore doesn't support offset with where clauses
      const paginatedReferrals = referrals.slice(offset, offset + limit);

      // Get total count
      const countSnapshot = await db.collection(REFERRALS_COLLECTION)
        .where('senderId', '==', userId)
        .count()
        .get();

      return {
        referrals: paginatedReferrals,
        total: countSnapshot.data().count,
        limit,
        offset
      };

    } catch (error) {
      console.error('Error getting user referrals:', error);
      throw error;
    }
  }

  /**
   * Get referral statistics for a user
   */
  async getUserReferralStats(userId) {
    try {
      const snapshot = await db.collection(REFERRALS_COLLECTION)
        .where('senderId', '==', userId)
        .get();

      const referrals = [];
      snapshot.forEach(doc => {
        referrals.push(doc.data());
      });

      const stats = {
        total: referrals.length,
        sent: referrals.filter(r => r.status === REFERRAL_STATUS.SENT).length,
        opened: referrals.filter(r => r.status === REFERRAL_STATUS.OPENED).length,
        joined: referrals.filter(r => r.status === REFERRAL_STATUS.JOINED).length,
        bySource: {
          email: referrals.filter(r => r.source === REFERRAL_SOURCE.EMAIL).length,
          sms: referrals.filter(r => r.source === REFERRAL_SOURCE.SMS).length,
          link: referrals.filter(r => r.source === REFERRAL_SOURCE.LINK).length
        },
        conversionRate: {
          openRate: referrals.length > 0 
            ? Number(((referrals.filter(r => 
                [REFERRAL_STATUS.OPENED, REFERRAL_STATUS.JOINED].includes(r.status)).length / referrals.length) * 100).toFixed(1))
            : 0,
          joinRate: referrals.length > 0 
            ? Number(((referrals.filter(r => r.status === REFERRAL_STATUS.JOINED).length / referrals.length) * 100).toFixed(1))
            : 0
        }
      };

      return stats;

    } catch (error) {
      console.error('Error getting user referral stats:', error);
      throw error;
    }
  }

  /**
   * Get global referral statistics (admin only)
   */
  async getGlobalReferralStats() {
    try {
      const snapshot = await db.collection(REFERRALS_COLLECTION).get();
      
      const referrals = [];
      snapshot.forEach(doc => {
        referrals.push(doc.data());
      });

      // Calculate top referrers
      const referrerMap = {};
      referrals.forEach(referral => {
        if (!referrerMap[referral.senderId]) {
          referrerMap[referral.senderId] = {
            senderId: referral.senderId,
            senderName: referral.senderName,
            senderEmail: referral.senderEmail,
            totalInvites: 0,
            joinedInvites: 0
          };
        }
        referrerMap[referral.senderId].totalInvites++;
        if (referral.status === REFERRAL_STATUS.JOINED) {
          referrerMap[referral.senderId].joinedInvites++;
        }
      });

      const topReferrers = Object.values(referrerMap)
        .sort((a, b) => b.joinedInvites - a.joinedInvites)
        .slice(0, 10);

      const stats = {
        total: referrals.length,
        sent: referrals.filter(r => r.status === REFERRAL_STATUS.SENT).length,
        opened: referrals.filter(r => r.status === REFERRAL_STATUS.OPENED).length,
        joined: referrals.filter(r => r.status === REFERRAL_STATUS.JOINED).length,
        bySource: {
          email: referrals.filter(r => r.source === REFERRAL_SOURCE.EMAIL).length,
          sms: referrals.filter(r => r.source === REFERRAL_SOURCE.SMS).length,
          link: referrals.filter(r => r.source === REFERRAL_SOURCE.LINK).length
        },
        conversionRate: {
          openRate: referrals.length > 0 
            ? Number(((referrals.filter(r => 
                [REFERRAL_STATUS.OPENED, REFERRAL_STATUS.JOINED].includes(r.status)).length / referrals.length) * 100).toFixed(1))
            : 0,
          joinRate: referrals.length > 0 
            ? Number(((referrals.filter(r => r.status === REFERRAL_STATUS.JOINED).length / referrals.length) * 100).toFixed(1))
            : 0
        },
        topReferrers
      };

      return stats;

    } catch (error) {
      console.error('Error getting global referral stats:', error);
      throw error;
    }
  }

  /**
   * Check email rate limit
   */
  async checkEmailRateLimit(userId) {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const snapshot = await db.collection(REFERRALS_COLLECTION)
      .where('senderId', '==', userId)
      .where('source', '==', REFERRAL_SOURCE.EMAIL)
      .where('createdAt', '>', last24Hours.toISOString())
      .count()
      .get();

    const count = snapshot.data().count;
    const remaining = Math.max(0, RATE_LIMITS.EMAIL_DAILY_LIMIT - count);

    return {
      allowed: count < RATE_LIMITS.EMAIL_DAILY_LIMIT,
      remaining,
      limit: RATE_LIMITS.EMAIL_DAILY_LIMIT,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Check SMS rate limit
   */
  async checkSMSRateLimit(userId) {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const snapshot = await db.collection(REFERRALS_COLLECTION)
      .where('senderId', '==', userId)
      .where('source', '==', REFERRAL_SOURCE.SMS)
      .where('createdAt', '>', last24Hours.toISOString())
      .count()
      .get();

    const count = snapshot.data().count;
    const remaining = Math.max(0, RATE_LIMITS.SMS_DAILY_LIMIT - count);

    return {
      allowed: count < RATE_LIMITS.SMS_DAILY_LIMIT,
      remaining,
      limit: RATE_LIMITS.SMS_DAILY_LIMIT,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Award referral credit when someone joins
   */
  async awardReferralCredit(senderId, referralCode) {
    try {
      // Update user's referral rewards
      const userRef = db.collection(USERS_COLLECTION).doc(senderId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        console.warn(`User ${senderId} not found for referral reward`);
        return;
      }

      const userData = userDoc.data();
      const currentRewards = userData.referralRewards || 0;
      const newRewards = currentRewards + REWARDS.JOIN_REWARD_AMOUNT;

      // Cap rewards at maximum
      const cappedRewards = Math.min(newRewards, REWARDS.MAX_REWARDS_PER_USER);

      await userRef.update({
        referralRewards: cappedRewards,
        totalReferrals: admin.firestore.FieldValue.increment(1),
        lastRewardAt: new Date().toISOString()
      });

      console.log(`💰 Awarded $${REWARDS.JOIN_REWARD_AMOUNT} to user ${senderId} for referral ${referralCode}`);

    } catch (error) {
      console.error('Error awarding referral credit:', error);
      throw error;
    }
  }

  /**
   * Delete referral (admin only)
   */
  async deleteReferral(referralCode) {
    try {
      await db.collection(REFERRALS_COLLECTION)
        .doc(referralCode)
        .delete();

      console.log(`🗑️ Referral deleted: ${referralCode}`);
      return { success: true };

    } catch (error) {
      console.error('Error deleting referral:', error);
      throw error;
    }
  }
}

module.exports = new ReferralService();