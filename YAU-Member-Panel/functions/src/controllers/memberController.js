const MemberService = require("../services/memberService");
const MembershipService = require("../services/membershipService");
const EmailService = require("../services/emailService");
const TwilioService = require("../services/twilioService");
const { getAuth } = require("firebase-admin/auth");

class MemberController {
  static async getMembers(req, res) {
    try {
      const members = await MemberService.getMembers();
      res.status(200).json({ success: true, data: members });
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getMemberById(req, res) {
    try {
      const { id } = req.params;
      const member = await MemberService.getMemberById(id);
      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }
      res.status(200).json({ success: true, data: member });
    } catch (error) {
      console.error("Error fetching member:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async createMember(req, res) {
    let authUser = null;

    try {
      const memberData = req.body;

      console.log('🔐 Creating member with Firebase Auth:', memberData.email);

      // Validate required fields
      if (!memberData.email || !memberData.password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      if (!memberData.firstName || !memberData.lastName) {
        return res.status(400).json({
          success: false,
          error: 'First name and last name are required'
        });
      }

      // Create Firebase Auth user first
      console.log('👤 Creating Firebase Auth user for:', memberData.email);

      const auth = getAuth();

      try {
        authUser = await auth.createUser({
          email: memberData.email,
          password: memberData.password,
          displayName: `${memberData.firstName} ${memberData.lastName}`,
          emailVerified: true, // Auto-verify admin created accounts
        });

        console.log('✅ Firebase Auth user created:', authUser.uid);
      } catch (authError) {
        console.error('❌ Firebase Auth user creation failed:', authError);

        if (authError.code === 'auth/email-already-exists') {
          return res.status(400).json({
            success: false,
            error: 'A user with this email address already exists'
          });
        }

        return res.status(400).json({
          success: false,
          error: `Failed to create user account: ${authError.message}`
        });
      }

      // Create member document with the Firebase UID
      const memberWithUid = {
        ...memberData,
        uid: authUser.uid,
        emailVerified: true,
        createdBy: 'admin',
        registrationSource: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Remove password from member data (don't store it in Firestore)
      delete memberWithUid.password;

      console.log('📝 Creating member document in Firestore');

      const result = await MembershipService.createMember(memberWithUid);

      // Send welcome email after successful member creation
      try {
        await EmailService.sendMemberSignUpEmail(memberData.email, memberData.firstName);
        console.log("✅ Member sign-up email dispatched successfully.");
      } catch (emailError) {
        console.error("❌ Failed to send member sign-up email:", emailError.message);
        // Continue with the registration process even if email fails to send
      }

      // Send welcome SMS ONLY if user explicitly opted in (receiveMessages === true)
      // This is required for Twilio A2P 10DLC compliance
      const smsConsented = memberData.receiveMessages === true;
      if (smsConsented && memberData.phoneNumber) {
        try {
          await TwilioService.sendMemberWelcomeSMS(memberData.phoneNumber);
          console.log("✅ Member welcome SMS dispatched successfully.");
        } catch (smsError) {
          console.error("❌ Failed to send member welcome SMS:", smsError.message);
          // Continue with the registration process even if SMS fails to send
        }
      } else {
        console.log(`ℹ️ SMS skipped. Consented: ${smsConsented}, Phone: ${!!memberData.phoneNumber}`);
      }

      console.log('✅ Member created successfully:', result.memberId || result.id);

      res.status(201).json({
        success: true,
        data: {
          memberId: result.memberId || result.id,
          uid: authUser.uid,
          email: memberData.email,
          message: 'Member created successfully with login credentials'
        }
      });

    } catch (error) {
      console.error('❌ Error creating member with auth:', error);

      // If member creation failed but auth user was created, clean up auth user
      if (authUser && authUser.uid) {
        try {
          const auth = getAuth();
          await auth.deleteUser(authUser.uid);
          console.log('🧹 Cleaned up Firebase Auth user after member creation failure');
        } catch (cleanupError) {
          console.error('⚠️ Failed to cleanup auth user:', cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create member with authentication',
        details: error.message
      });
    }
  }

  static async updateMember(req, res) {
    try {
      const { id } = req.params;
      const result = await MemberService.updateMember(id, req.body);
      res.status(200).json(result);
    } catch (error) {
      console.error("Error updating member:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async deleteMember(req, res) {
    try {
      const { id } = req.params;
      const result = await MemberService.deleteMember(id);
      res.status(200).json(result);
    } catch (error) {
      console.error("Error deleting member:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async batchDeleteMembers(req, res) {
    try {
      const { memberIds } = req.body;
      const result = await MemberService.batchDeleteMembers(memberIds);
      res.status(200).json(result);
    } catch (error) {
      console.error("Error batch deleting members:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async emailVerified(req, res) {
    try {
      const { email } = req.params;
      const result = await MemberService.emailVerified(email);
      res.status(200).json({success: true,email:result.email});
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

module.exports = MemberController;