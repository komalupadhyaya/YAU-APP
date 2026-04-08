const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");
const EmailService = require("../services/emailService");
const MembershipService = require("../services/membershipService");

class ForgotPasswordController {
  /**
   * Request password reset - sends reset link to user's email
   * POST /forgot-password
   */
  static async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      // Validate email
      if (!email) {
        return res.status(400).json({
          success: false,
          error: "Email is required"
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: "Invalid email format"
        });
      }

      console.log(`🔐 Password reset requested for: ${email}`);

      // Check if user exists in Firestore (members or registrations)
      const userInfo = await MembershipService.findUserByEmail(email.toLowerCase().trim());
      console.log("user info ",userInfo)
      
      if (!userInfo || userInfo == null) {
        // For security, don't reveal if email exists or not
        // Return success message even if user doesn't exist
        console.log(`⚠️ Password reset requested for non-existent email: ${email}`);
        return res.status(200).json({
          success: true,
          message: "If an account with that email exists, a password reset link has been sent."
        });
      }

      // Check if user exists in Firebase Auth
      // First try by email, then by UID if available
      const auth = getAuth();
      let firebaseUser;
      let userEmail = email.toLowerCase().trim();
      
      try {
        // Try to get user by email first
        firebaseUser = await auth.getUserByEmail(userEmail);
        console.log(`✅ User found in Firebase Auth by email: ${userEmail}`);
      } catch (authError) {
        if (authError.code === "auth/user-not-found") {
          // User not found by email, try by UID if available
          if (userInfo.data?.uid) {
            try {
              firebaseUser = await auth.getUser(userInfo.data.uid);
              console.log(`✅ User found in Firebase Auth by UID: ${userInfo.data.uid}`);
              // Update email to match Firebase Auth user's email
              userEmail = firebaseUser.email;
            } catch (uidError) {
              // User doesn't exist in Firebase Auth at all
              console.error(`❌ User not found in Firebase Auth (email: ${userEmail}, UID: ${userInfo.data.uid})`);
              console.log(`⚠️ User exists in Firestore but not in Firebase Auth. Cannot reset password without Firebase Auth account.`);
              
              // Return error - user needs to contact support or create account
              return res.status(400).json({
                success: false,
                error: "Account found but authentication setup is incomplete. Please contact support for assistance."
              });
            }
          } else {
            // No UID in Firestore, user definitely doesn't exist in Firebase Auth
            console.log(`⚠️ User not found in Firebase Auth: ${userEmail} (returning generic success message for security)`);
            return res.status(200).json({
              success: true,
              message: "If an account with that email exists, a password reset link has been sent."
            });
          }
        } else {
          // Re-throw other auth errors
          console.error("❌ Firebase Auth error:", authError);
          throw authError;
        }
      }

      // Generate password reset link using the email from Firebase Auth user
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const actionCodeSettings = {
        url: `${frontendUrl}/reset-password`,
        handleCodeInApp: false,
      };

      let resetLink;
      try {
        // Generate the password reset link using the email from Firebase Auth
        // Note: This does NOT send the email - we need to send it manually
        resetLink = await auth.generatePasswordResetLink(
          userEmail, // Use email from Firebase Auth user
          actionCodeSettings
        );
        console.log(`✅ Password reset link generated for: ${userEmail}`);
      } catch (linkError) {
        console.error("❌ Error generating password reset link:", linkError);
        throw new Error(`Failed to generate password reset link: ${linkError.message}`);
      }

      // Get user's first name if available
      const firstName = userInfo.data?.firstName || null;

      // Send password reset email using EmailService
      // Use the original email from request (not necessarily the Firebase Auth email)
      const emailToSend = email.toLowerCase().trim();
      try {
        await EmailService.sendPasswordResetEmail(
          emailToSend,
          resetLink,
          firstName
        );
        console.log(`✅ Password reset email sent to: ${emailToSend}`);
      } catch (emailError) {
        console.error("❌ Error sending password reset email:", emailError);
        // For security, still return success message (don't reveal if email failed)
      }

      // Return success response
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent."
      });

    } catch (error) {
      console.error("❌ Error in requestPasswordReset:", error);
      return res.status(500).json({
        success: false,
        error: "An error occurred while processing your request. Please try again later."
      });
    }
  }

  /**
   * Verify password reset token
   * GET /forgot-password/verify?oobCode=...
   */
  static async verifyResetToken(req, res) {
    try {
      const { oobCode } = req.query;

      if (!oobCode) {
        return res.status(400).json({
          success: false,
          error: "Reset token is required"
        });
      }

      console.log(`🔍 Verifying password reset token...`);

      // Verify the action code
      const auth = getAuth();
      try {
        // This will throw an error if the code is invalid or expired
        await auth.verifyPasswordResetCode(oobCode);
        
        return res.status(200).json({
          success: true,
          message: "Reset token is valid"
        });
      } catch (verifyError) {
        console.error("❌ Invalid or expired reset token:", verifyError);
        return res.status(400).json({
          success: false,
          error: "Invalid or expired reset token"
        });
      }

    } catch (error) {
      console.error("❌ Error in verifyResetToken:", error);
      return res.status(500).json({
        success: false,
        error: "An error occurred while verifying the reset token"
      });
    }
  }

  /**
   * Reset password with token
   * POST /forgot-password/reset
   */
  static async resetPassword(req, res) {
    try {
      const { oobCode, newPassword } = req.body;

      // Validate inputs
      if (!oobCode) {
        return res.status(400).json({
          success: false,
          error: "Reset token is required"
        });
      }

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          error: "New password is required"
        });
      }

      // Validate password strength
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: "Password must be at least 6 characters long"
        });
      }

      console.log(`🔐 Resetting password with token...`);

      const auth = getAuth();
      
      try {
        // Verify the code first to get the email
        const email = await auth.verifyPasswordResetCode(oobCode);
        console.log(`✅ Reset token verified for: ${email}`);

        // Confirm password reset
        await auth.confirmPasswordReset(oobCode, newPassword);
        console.log(`✅ Password reset successful for: ${email}`);

        // Get user info to send confirmation email
        try {
          const userInfo = await MembershipService.findUserByEmail(email);
          const firstName = userInfo?.data?.firstName || null;
          
          // Send confirmation email (optional, don't fail if it fails)
          try {
            await EmailService.sendPasswordResetConfirmation(email, firstName);
          } catch (emailError) {
            console.warn("⚠️ Failed to send confirmation email:", emailError);
          }
        } catch (userError) {
          console.warn("⚠️ Could not fetch user info for confirmation email:", userError);
        }

        return res.status(200).json({
          success: true,
          message: "Password has been reset successfully"
        });

      } catch (resetError) {
        console.error("❌ Error resetting password:", resetError);
        
        if (resetError.code === "auth/invalid-action-code" || 
            resetError.code === "auth/expired-action-code") {
          return res.status(400).json({
            success: false,
            error: "Invalid or expired reset token. Please request a new password reset."
          });
        }

        throw resetError;
      }

    } catch (error) {
      console.error("❌ Error in resetPassword:", error);
      return res.status(500).json({
        success: false,
        error: "An error occurred while resetting your password. Please try again."
      });
    }
  }
}

module.exports = ForgotPasswordController;

