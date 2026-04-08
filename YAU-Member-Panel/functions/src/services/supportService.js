const admin = require('firebase-admin');

class SupportService {
  constructor() {
    // Initialize Firestore
    this.db = admin.firestore();
    console.log('📝 Support service initialized - messages will be saved to Firestore');
  }

  // Save support message to database
  async saveSupportMessage({ name, email, message }) {
    try {
      console.log('💾 Saving support message to database:', { name, email, messageLength: message.length });

      // Create support message document
      const supportMessageData = {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        status: 'new', // new, in-progress, resolved
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'support_form'
      };

      // Save to Firestore collection
      const docRef = await this.db.collection('support_messages').add(supportMessageData);
      
      console.log('✅ Support message saved successfully with ID:', docRef.id);

      return {
        success: true,
        messageId: docRef.id,
        message: 'Your message has been received successfully. We\'ll get back to you soon!'
      };

    } catch (error) {
      console.error('❌ Error saving support message to database:', error);
      throw new Error(`Failed to save support message: ${error.message}`);
    }
  }

  // Get support messages (for admin dashboard later)
  async getSupportMessages(limit = 50) {
    try {
      const snapshot = await this.db
        .collection('support_messages')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const messages = [];
      snapshot.forEach(doc => {
        messages.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        });
      });

      return messages;
    } catch (error) {
      console.error('❌ Error fetching support messages:', error);
      throw new Error(`Failed to fetch support messages: ${error.message}`);
    }
  }

  // Update message status (for admin use)
  async updateMessageStatus(messageId, status) {
    try {
      await this.db.collection('support_messages').doc(messageId).update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('✅ Message status updated:', { messageId, status });
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating message status:', error);
      throw new Error(`Failed to update message status: ${error.message}`);
    }
  }
}

module.exports = new SupportService();