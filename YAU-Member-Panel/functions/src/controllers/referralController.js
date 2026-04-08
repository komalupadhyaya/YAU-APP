const referralService = require('../services/referralService');

class ReferralController {
  /**
   * Create a new referral
   */
  async createReferral(req, res) {
    try {
      const {
        senderId,
        senderName,
        senderEmail,
        source,
        recipientEmail,
        recipientPhone,
        recipientName,
        campaign
      } = req.body;

      const referral = await referralService.createReferral({
        senderId,
        senderName,
        senderEmail,
        source,
        recipientEmail,
        recipientPhone,
        recipientName,
        campaign,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      });

      res.status(201).json({
        success: true,
        data: referral
      });

    } catch (error) {
      console.error('Create referral error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get referral by code
   */
  async getReferral(req, res) {
    try {
      const { referralCode } = req.params;

      const referral = await referralService.getReferralByCode(referralCode);
      
      if (!referral) {
        return res.status(404).json({
          success: false,
          error: 'Referral not found'
        });
      }

      res.json({
        success: true,
        data: referral
      });

    } catch (error) {
      console.error('Get referral error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Track referral opened (when someone clicks the link)
   */
  async trackOpened(req, res) {
    try {
      const { referralCode } = req.body;

      const updatedReferral = await referralService.updateReferralStatus({
        referralCode,
        status: 'opened',
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      });

      res.json({
        success: true,
        data: updatedReferral
      });

    } catch (error) {
      console.error('Track opened error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Track referral joined (when someone registers + pays)
   * Note: This endpoint is public (no auth required) to support new user registration flow
   */
  async trackJoined(req, res) {
    try {
      const { referralCode, recipientId } = req.body;

      // ✅ Validate required fields
      if (!referralCode || !recipientId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: referralCode and recipientId'
        });
      }

      // ✅ Validate referralCode format (alphanumeric, 8-12 chars)
      if (!/^[A-Z0-9-]{8,12}$/i.test(referralCode)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid referral code format'
        });
      }

      // ✅ Validate recipientId is a valid Firebase UID format (alphanumeric, 20-30 chars)
      if (!/^[a-zA-Z0-9]{20,30}$/.test(recipientId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid recipient ID format'
        });
      }

      console.log('📥 Track joined request:', {
        referralCode,
        recipientId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      const updatedReferral = await referralService.updateReferralStatus({
        referralCode,
        status: 'joined',
        recipientId,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      });

      res.json({
        success: true,
        data: updatedReferral
      });

    } catch (error) {
      console.error('Track joined error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user's referrals
   */
  async getUserReferrals(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const result = await referralService.getUserReferrals(userId, parseInt(limit), parseInt(offset));

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Get user referrals error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user referral statistics
   */
  async getUserStats(req, res) {
    try {
      const { userId } = req.params;

      const stats = await referralService.getUserReferralStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get global referral statistics (admin only)
   */
  async getGlobalStats(req, res) {
    try {
      const stats = await referralService.getGlobalReferralStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get global stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Check rate limits
   */
  async checkRateLimit(req, res) {
    try {
      const { userId, source } = req.query;

      let rateLimit;
      if (source === 'email') {
        rateLimit = await referralService.checkEmailRateLimit(userId);
      } else if (source === 'sms') {
        rateLimit = await referralService.checkSMSRateLimit(userId);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid source. Use "email" or "sms"'
        });
      }

      res.json({
        success: true,
        data: rateLimit
      });

    } catch (error) {
      console.error('Check rate limit error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete referral (admin only)
   */
  async deleteReferral(req, res) {
    try {
      const { referralCode } = req.params;

      const result = await referralService.deleteReferral(referralCode);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Delete referral error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new ReferralController();