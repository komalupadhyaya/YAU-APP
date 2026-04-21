const twilioService = require('../services/twilioService');
const EmailService = require('../services/emailService');
const CoachAssignmentsService = require('../services/coachAssignmentsService');
const admin = require('firebase-admin');

class CoachAssignmentsController {
  static async getAssignments(req, res) {
    try {
      const assignments = await CoachAssignmentsService.getAssignments();
      res.status(200).json({ success: true, data: assignments });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async createAssignment(req, res) {
    try {
      const id = await CoachAssignmentsService.createAssignment(req.body);
      res.status(201).json({ success: true, data: { id } });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async updateAssignment(req, res) {
    try {
      const { id } = req.params;
      await CoachAssignmentsService.updateAssignment(id, req.body);
      res.status(200).json({ success: true, message: 'Assignment updated' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async deleteAssignment(req, res) {
    try {
      const { id } = req.params;
      await CoachAssignmentsService.deleteAssignment(id);
      res.status(200).json({ success: true, message: 'Assignment deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async sendNotification(req, res) {
    try {
      const { assignmentId, coachId } = req.body;
      console.log(`📋 sendNotification called with assignmentId: ${assignmentId}, coachId: ${coachId}`);

      if (!assignmentId || !coachId) {
        console.warn('❌ Missing assignmentId or coachId');
        return res.status(400).json({ error: 'assignmentId and coachId are required' });
      }

      // Fetch Coach
      console.log(`📋 Fetching coach document from 'users' collection: ${coachId}`);
      const coachDoc = await admin.firestore().collection('users').doc(coachId).get();
      if (!coachDoc.exists) {
        console.warn(`❌ Coach not found in 'users' collection: ${coachId}`);
        return res.status(404).json({ error: 'Coach not found' });
      }
      const coach = coachDoc.data();
      console.log(`✅ Coach found: ${coach.firstName} ${coach.lastName}`);

      // Fetch Assignment
      console.log(`📋 Fetching assignment document: ${assignmentId}`);
      const assignmentDoc = await admin.firestore().collection('coach_assignments').doc(assignmentId).get();
      if (!assignmentDoc.exists) {
        console.warn(`❌ Assignment not found: ${assignmentId}`);
        return res.status(404).json({ error: 'Assignment not found' });
      }
      const assignment = assignmentDoc.data();
      console.log(`✅ Assignment found for user: ${assignment.userName}`);

      let smsSuccess = false;
      let emailSuccess = false;
      
      let smsErrorDetails = 'Not attempted';
      let emailErrorDetails = 'Not attempted';

      // Send SMS
      if (coach.phoneNumber) {
        try {
          await twilioService.sendCoachAssignmentSMS(coach.phoneNumber, assignment);
          smsSuccess = true;
        } catch (smsErr) {
          smsErrorDetails = smsErr.message || 'Unknown SMS error';
          console.error("SMS notification failed:", smsErr);
        }
      } else {
        smsErrorDetails = 'No phone number';
      }

      // Send Email
      if (coach.email) {
        try {
          await EmailService.sendCoachAssignmentEmail(coach.email, coach.firstName, assignment);
          emailSuccess = true;
        } catch (emailErr) {
          emailErrorDetails = emailErr.message || 'Unknown Email error';
          console.error("Email notification failed:", emailErr);
        }
      } else {
        emailErrorDetails = 'No email';
      }

      if (!smsSuccess && !emailSuccess) {
        return res.status(500).json({ error: `Failed to send notifications. Email Error: ${emailErrorDetails} | SMS Error: ${smsErrorDetails}` });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Notification sent successfully!',
        smsSuccess,
        emailSuccess
      });

    } catch (error) {
      console.error('Error sending notification:', error);
      return res.status(500).json({ 
        error: 'Failed to send notification.', 
        details: error.message,
        stack: error.stack
      });
    }
  }
}

module.exports = CoachAssignmentsController;
