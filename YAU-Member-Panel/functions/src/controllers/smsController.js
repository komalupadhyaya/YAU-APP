const twilioService = require('../services/twilioService');

class SMSController {
  // Send enrollment confirmation SMS
  async sendEnrollmentSMS(req, res) {
    try {
      console.log('📱 SMS Request received:', {
        body: req.body,
        bodyType: typeof req.body,
        headers: req.headers,
        method: req.method,
        url: req.url
      });

      // Handle both parsed JSON and raw string body
      let requestData;
      if (typeof req.body === 'string') {
        try {
          requestData = JSON.parse(req.body);
          console.log('📱 Parsed string body to JSON:', requestData);
        } catch (parseError) {
          console.error('❌ Failed to parse request body as JSON:', parseError);
          return res.status(400).json({
            success: false,
            error: 'Invalid JSON in request body'
          });
        }
      } else {
        requestData = req.body;
      }

      const { phoneNumber, messageType = 'enrollment', platform = 'member' } = requestData;

      console.log('📱 Extracted data:', { phoneNumber, messageType, platform });

      // Validation
      if (!phoneNumber) {
        console.log('❌ Phone number validation failed - phoneNumber:', phoneNumber);
        return res.status(400).json({
          success: false,
          error: 'Phone number is required'
        });
      }

      // Validate platform
      if (!['member', 'pickup'].includes(platform)) {
        console.log('❌ Platform validation failed - platform:', platform);
        return res.status(400).json({
          success: false,
          error: 'Invalid platform. Must be "member" or "pickup"'
        });
      }

      // Validate phone number format (must include country code)
      if (!phoneNumber.startsWith('+')) {
        return res.status(400).json({
          success: false,
          error: 'Phone number must include country code (e.g., +1 for US)'
        });
      }

      // Validate message type
      if (!['enrollment', 'welcome'].includes(messageType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid message type. Must be "enrollment" or "welcome"'
        });
      }

      console.log(`📱 Sending ${messageType} SMS to:`, phoneNumber);
      
      const response = messageType === 'welcome' 
        ? await twilioService.sendMemberWelcomeSMS(phoneNumber, platform)
        : await twilioService.sendEnrollmentSMS(phoneNumber, platform);

      if (response && response.success) {
        console.log('✅ SMS sent successfully, SID:', response.sid);
        return res.status(200).json({
          success: true,
          message: `${messageType} SMS sent successfully`,
          phoneNumber: phoneNumber,
          sid: response.sid
        });
      } else {
        const errorMsg = response ? response.error : 'Unknown error from Twilio service';
        console.error('❌ SMS sending failed:', errorMsg);
        return res.status(500).json({
          success: false,
          error: 'Failed to send SMS',
          details: errorMsg
        });
      }

    } catch (error) {
      console.error('❌ Error sending SMS:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to send SMS',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Send bulk SMS (for future use)
  async sendBulkSMS(req, res) {
    try {
      const { phoneNumbers, messageType = 'enrollment', platform = 'member' } = req.body;

      // Validation
      if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Phone numbers array is required'
        });
      }

      if (phoneNumbers.length > 10) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 10 phone numbers allowed for bulk SMS'
        });
      }

      console.log(`📱 Sending bulk ${messageType} SMS to ${phoneNumbers.length} numbers`);

      const results = [];
      const errors = [];

      for (const phoneNumber of phoneNumbers) {
        try {
          if (!phoneNumber.startsWith('+')) {
            errors.push({ phoneNumber, error: 'Invalid format - must include country code' });
            continue;
          }

          let result;
          if (messageType === 'welcome') {
            result = await twilioService.sendMemberWelcomeSMS(phoneNumber, platform);
          } else {
            result = await twilioService.sendEnrollmentSMS(phoneNumber, platform);
          }

          results.push({ phoneNumber, status: 'sent' });
        } catch (error) {
          console.error(`❌ Error sending SMS to ${phoneNumber}:`, error);
          errors.push({ phoneNumber, error: error.message });
        }
      }

      console.log(`✅ Bulk SMS completed: ${results.length} sent, ${errors.length} failed`);

      res.status(200).json({
        success: true,
        message: `Bulk SMS completed: ${results.length} sent, ${errors.length} failed`,
        results: {
          sent: results.length,
          failed: errors.length,
          details: {
            successful: results,
            failed: errors
          }
        }
      });

    } catch (error) {
      console.error('❌ Error in bulk SMS:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to send bulk SMS',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new SMSController();