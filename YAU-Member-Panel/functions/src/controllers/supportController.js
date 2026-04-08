const supportService = require('../services/supportService');

class SupportController {
  // Send support message
  async sendSupportMessage(req, res) {
    try {
      const { name, email, message } = req.body;

      // Validation
      if (!name || !email || !message) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and message are required'
        });
      }

      if (!email.includes('@')) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      if (message.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Message must be at least 10 characters long'
        });
      }

      console.log('📞 Processing support request:', {
        name,
        email,
        messageLength: message.length
      });

      // Save support message to database
      const result = await supportService.saveSupportMessage({
        name: name.trim(),
        email: email.trim(),
        message: message.trim()
      });

      console.log('✅ Support request processed successfully');

      res.status(200).json({
        success: true,
        message: result.message,
        messageId: result.messageId
      });

    } catch (error) {
      console.error('❌ Error in sendSupportMessage:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to send your message. Please try again or contact us directly.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get support messages (for admin dashboard)
  async getSupportMessages(req, res) {
    try {
      const { limit } = req.query;
      
      const messages = await supportService.getSupportMessages(
        limit ? parseInt(limit) : 50
      );

      res.status(200).json({
        success: true,
        data: messages,
        count: messages.length
      });

    } catch (error) {
      console.error('❌ Error fetching support messages:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch support messages',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update message status (for admin use)
  async updateMessageStatus(req, res) {
    try {
      const { messageId } = req.params;
      const { status } = req.body;

      if (!['new', 'in-progress', 'resolved'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be: new, in-progress, or resolved'
        });
      }

      await supportService.updateMessageStatus(messageId, status);

      res.status(200).json({
        success: true,
        message: 'Message status updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating message status:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to update message status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new SupportController();