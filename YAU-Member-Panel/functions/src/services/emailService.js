const { Resend } = require("resend");

// Initialize Resend API with environment key
const resend = new Resend(process.env.RESEND_API_KEY || "missing_api_key");

class EmailService {
  /**
   * Core Reusable Send Email Function
   */
  static async sendEmail({ to, subject, html, text }) {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn("⚠️ RESEND_API_KEY not configured. Email skipping...");
        return { success: false, error: "Missing API Key" };
      }

      const response = await resend.emails.send({
        from: process.env.EMAIL_SENDER || "onboarding@resend.dev", 
        to,
        subject,
        html,
        text
      });

      console.log("Email sent:", response);
      return { success: true, data: response };
    } catch (error) {
      console.warn("Email failed, continuing...");
      console.error("Email error:", error);
      // Do NOT crash server if email fails
      return { success: false, error: error.message };
    }
  }

  static async sendPasswordResetEmail(email, resetLink, firstName = null) {
    try {
      console.log(`📧 Preparing to send password reset email to: ${email} and link is ${resetLink}`);

      // Create transporter


      const displayName = firstName ? firstName : email.split("@")[0];
      const subject = "Reset Your YAU Member Panel Password";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin-top: 0;">Password Reset Request</h1>
            <p>Hello ${displayName},</p>
            <p>We received a request to reset your password for your YAU Member Panel account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${resetLink}</p>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              <strong>Important:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              If you continue to have problems, please contact support.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              © ${new Date().getFullYear()} YAU Sports. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Password Reset Request

Hello ${displayName},

We received a request to reset your password for your YAU Member Panel account.

Click the link below to reset your password:
${resetLink}

Important: This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.

If you continue to have problems, please contact support.

© ${new Date().getFullYear()} YAU Sports. All rights reserved.
      `;

      // Send email using nodemailer


      const info = await this.sendEmail({ to: email, subject: subject, html: htmlContent, text: typeof textContent !== "undefined" ? textContent : undefined });
      if (!info.success) return { success: false, error: info.error };
      console.log(`✅ Password reset email sent successfully to: ${email}`);


      return {
        success: true,
        message: "Password reset email sent successfully",
        email: email,

      };
    } catch (error) {
      console.error("❌ Error sending password reset email:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset confirmation email
   * @param {string} email - User's email address
   * @param {string} firstName - User's first name (optional)
   * @returns {Promise<Object>} Result of email sending
   */
  static async sendPasswordResetConfirmation(email, firstName = null) {
    try {
      console.log(`📧 Preparing password reset confirmation email to: ${email}`);

      // Create transporter


      const displayName = firstName ? firstName : email.split("@")[0];
      const subject = "Password Reset Successful - YAU Member Panel";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Successful</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: #28a745; margin-top: 0;">Password Reset Successful</h1>
            <p>Hello ${displayName},</p>
            <p>Your password has been successfully reset for your YAU Member Panel account.</p>
            <p style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
              <strong>Security Notice:</strong> If you did not make this change, please contact support immediately.
            </p>
            <p style="margin-top: 20px;">
              You can now log in with your new password.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              © ${new Date().getFullYear()} YAU Sports. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Password Reset Successful

Hello ${displayName},

Your password has been successfully reset for your YAU Member Panel account.

Security Notice: If you did not make this change, please contact support immediately.

You can now log in with your new password.

© ${new Date().getFullYear()} YAU Sports. All rights reserved.
      `;

      // Send email using nodemailer


      const info = await this.sendEmail({ to: email, subject: subject, html: htmlContent, text: typeof textContent !== "undefined" ? textContent : undefined });
      if (!info.success) return { success: false, error: info.error };
      console.log(`✅ Password reset confirmation email sent successfully to: ${email}`);


      return {
        success: true,
        message: "Password reset confirmation email sent successfully",
        email: email,

      };
    } catch (error) {
      console.error("❌ Error sending password reset confirmation email:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email to new member upon sign up
   * @param {string} email - Member's email address
   * @param {string} firstName - Member's first name
   * @returns {Promise<Object>} Result of email sending
   */
  static async sendMemberSignUpEmail(email, firstName) {
    try {
      console.log(`📧 Preparing member sign-up email to: ${email}`);



      const displayName = firstName ? firstName : email.split("@")[0];
      const subject = "Welcome to YAU FUN";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to YAU FUN</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin-top: 0;">Welcome to YAU FUN!</h1>
            <p>Thank you for signing up for YAU Evening Activities through our member portal.</p>
            <p>We’re excited to have you and your athlete join our evening programming. Your registration has been received, and you are officially on our roster. Additional details regarding practice schedules, locations, and program expectations will be shared shortly.</p>
            <p>YAU Evening Activities are designed to provide structured training, skill development, and a positive team environment. Our coaches focus on discipline, confidence, teamwork, and continuous improvement in every session.</p>
            <p style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
              <strong>Important:</strong> If you have not already done so, please make sure all required uniforms and practice shirts are purchased prior to the start of activities. Having the proper gear ensures consistency, safety, and a unified team experience for all participants.
            </p>
            <p>We appreciate your commitment to the program and look forward to a great season ahead.</p>
            <p>Thank you for being part of the YAU community.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              © ${new Date().getFullYear()} YAU Sports. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Welcome to YAU FUN!

Thank you for signing up for YAU Evening Activities through our member portal.
We’re excited to have you and your athlete join our evening programming. Your registration has been received, and you are officially on our roster. Additional details regarding practice schedules, locations, and program expectations will be shared shortly.
YAU Evening Activities are designed to provide structured training, skill development, and a positive team environment. Our coaches focus on discipline, confidence, teamwork, and continuous improvement in every session.
Important: If you have not already done so, please make sure all required uniforms and practice shirts are purchased prior to the start of activities. Having the proper gear ensures consistency, safety, and a unified team experience for all participants.
We appreciate your commitment to the program and look forward to a great season ahead.
Thank you for being part of the YAU community.
© ${new Date().getFullYear()} YAU Sports. All rights reserved.
      `;



      const info = await this.sendEmail({ to: email, subject: subject, html: htmlContent, text: typeof textContent !== "undefined" ? textContent : undefined });
      if (!info.success) return { success: false, error: info.error };
      console.log(`✅ Member sign-up email sent successfully to: ${email}`);


      return {
        success: true,
        message: "Member sign-up email sent successfully",
        email: email,

      };
    } catch (error) {
      console.error("❌ Error sending member sign-up email:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email for YAUTeamUp pickup enrollment
   * @param {string} email - Parent's email address
   * @param {string} childName - Child's name
   * @returns {Promise<Object>} Result of email sending
   */
  static async sendPickupEnrollmentEmail(email, childName) {
    try {
      console.log(`📧 Preparing YAUTeamUp enrollment email to: ${email}`);



      const subject = "Welcome to YAUTeamUp – Enrollment Submitted";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to YAUTeamUp</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin-top: 0;">Welcome to YAUTeamUp!</h1>
            <p>Thank you for completing the YAUTeamUp enrollment form for your child${childName ? ` ${childName}` : ""}.</p>
            <p>We’re excited to welcome your family to the YAUTeamUp community and appreciate you taking the time to register. Your submission has been successfully received and is currently being processed.</p>
            <p>Over the next several days, you will receive additional communications with important details related to program schedules, expectations, and next steps. Please be sure to regularly check your email inbox, including your Spam or Junkfolders, as automated messages may occasionally be filtered there.</p>
            <p>YAUTeamUp is designed to provide a fun, structured, and engaging after-school experience that promotes teamwork, confidence, discipline, and physical activity. Our staff is committed to creating a safe and positive environment where every child can learn, grow, and enjoy being active.</p>
            <p>We look forward to having your child participate in the program and are excited about the upcoming season. More information will be shared soon to help you prepare.</p>
            <p>Thank you for choosing YAUTeamUp.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              © ${new Date().getFullYear()} YAUTeamUp. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Welcome to YAUTeamUp!

Thank you for completing the YAUTeamUp enrollment form for your child${childName ? ` ${childName}` : ""}.
We’re excited to welcome your family to the YAUTeamUp community and appreciate you taking the time to register. Your submission has been successfully received and is currently being processed.
Over the next several days, you will receive additional communications with important details related to program schedules, expectations, and next steps. Please be sure to regularly check your email inbox, including your Spam or Junkfolders, as automated messages may occasionally be filtered there.
YAUTeamUp is designed to provide a fun, structured, and engaging after-school experience that promotes teamwork, confidence, discipline, and physical activity. Our staff is committed to creating a safe and positive environment where every child can learn, grow, and enjoy being active.
We look forward to having your child participate in the program and are excited about the upcoming season. More information will be shared soon to help you prepare.
Thank you for choosing YAUTeamUp.
© ${new Date().getFullYear()} YAUTeamUp. All rights reserved.
      `;



      const info = await this.sendEmail({ to: email, subject: subject, html: htmlContent, text: typeof textContent !== "undefined" ? textContent : undefined });
      if (!info.success) return { success: false, error: info.error };
      console.log(`✅ YAUTeamUp enrollment email sent successfully to: ${email}`);


      return {
        success: true,
        message: "YAUTeamUp enrollment email sent successfully",
        email: email,

      };
    } catch (error) {
      console.error("❌ Error sending YAUTeamUp enrollment email:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Coach Assignment Notification Email
   */
  static async sendCoachAssignmentEmail(email, firstName, assignment) {
    try {
      console.log(`📧 Preparing coach assignment email to: ${email}`);

      const displayName = firstName ? firstName : email.split("@")[0];
      const subject = `New YAU Coaching Assignment: ${assignment.site}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Coach Assignment</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin-top: 0;">New Coaching Assignment</h1>
            <p>Hello ${displayName},</p>
            <p>You have a new coaching assignment configured. Here are the details:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Site Name:</strong> ${assignment.site}</p>
              <p style="margin: 0 0 10px 0;"><strong>Address:</strong> ${assignment.address || 'N/A'}</p>
              <p style="margin: 0 0 10px 0;"><strong>Report Date:</strong> ${assignment.report}</p>
              <p style="margin: 0 0 10px 0;"><strong>Staff Hours:</strong> ${assignment.hours}</p>
              <p style="margin: 0 0 10px 0;"><strong>Role:</strong> ${assignment.role || 'Coach'}</p>
              <p style="margin: 0 0 10px 0;"><strong>Status:</strong> <span style="background: #e0f2f1; color: #00796b; padding: 2px 8px; border-radius: 4px;">${assignment.status}</span></p>
              ${assignment.note ? `<p style="margin: 10px 0 0 0; padding-top: 10px; border-top: 1px solid #eee;"><strong>Notes:</strong> ${assignment.note}</p>` : ''}
            </div>
            
            <p>You can view all your assignments by logging into your Coach Dashboard.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              © ${new Date().getFullYear()} YAU Sports. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `;

      const textContent = `
New Coaching Assignment

Hello ${displayName},

You have a new coaching assignment configured. Here are the details:

Site Name: ${assignment.site}
Address: ${assignment.address || 'N/A'}
Report Date: ${assignment.report}
Staff Hours: ${assignment.hours}
Role: ${assignment.role || 'Coach'}
Status: ${assignment.status}
${assignment.note ? `Notes: ${assignment.note}` : ''}

You can view all your assignments by logging into your Coach Dashboard.
© ${new Date().getFullYear()} YAU Sports. All rights reserved.
      `;



      const info = await this.sendEmail({ to: email, subject: subject, html: htmlContent, text: typeof textContent !== "undefined" ? textContent : undefined });
      if (!info.success) return { success: false, error: info.error };
      console.log(`✅ Coach Assignment email sent successfully to: ${email}`);
      return { success: true, };
    } catch (error) {
      console.error("❌ Error sending Coach assignment email:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Welcome Email to newly registered Coach
   */
  static async sendCoachWelcomeEmail(email, password, firstName) {
    try {
      console.log(`📧 Preparing coach welcome email to: ${email}`);

      const displayName = firstName || email.split("@")[0];
      const subject = "Welcome to the YAU Coaching Team!";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to YAU</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h1 style="color: #2c3e50; margin-top: 0;">Welcome, Coach ${displayName}!</h1>
            <p>We are thrilled to have you join the YAU Sports coaching family.</p>
            <p>Your account has been created, and your application is currently under review by our administration team. Once approved, you will be able to access your full coach dashboard.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Your Login Credentials:</strong></p>
              <p style="margin: 0 0 5px 0;">Email: ${email}</p>
              <p style="margin: 0;">Password: ${password}</p>
            </div>
            
            <p>You can sign in here: <a href="https://coach.yauapp.com/login" style="color: #007bff;">Coach Login Portal</a></p>
            
            <p>If you have any questions during the onboarding process, please don't hesitate to reach out.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">© ${new Date().getFullYear()} YAU Sports. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;



      const info = await this.sendEmail({ to: email, subject: subject, html: htmlContent, text: typeof textContent !== "undefined" ? textContent : undefined });
      if (!info.success) return { success: false, error: info.error };
      console.log(`✅ Coach welcome email sent successfully to: ${email}`);
      return { success: true, };
    } catch (error) {
      console.error("❌ Error sending Coach welcome email:", error);
      // We don't throw here to avoid blocking coach creation
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Approval Email to Coach
   */
  static async sendCoachApprovalEmail(email, firstName) {
    try {
      console.log(`📧 Preparing coach approval email to: ${email}`);

      const displayName = firstName || email.split("@")[0];
      const subject = "Your YAU Coach Account Has Been Approved!";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Account Approved</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f0fdf4; padding: 30px; border-radius: 10px; border: 1px solid #bbfcbd;">
            <h1 style="color: #166534; margin-top: 0;">Congratulations ${displayName}!</h1>
            <p>Your YAU Coach application has been <strong>approved</strong>.</p>
            <p>You now have full access to your dashboard where you can:</p>
            <ul>
              <li>View your coaching assignments</li>
              <li>Submit timesheets for payout</li>
              <li>Manage your profile and availability</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://coach.yauapp.com/dashboard" 
                 style="background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Access My Dashboard
              </a>
            </div>
            
            <p>Welcome to the team! We're excited to work with you.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">© ${new Date().getFullYear()} YAU Sports. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;



      const info = await this.sendEmail({ to: email, subject: subject, html: htmlContent, text: typeof textContent !== "undefined" ? textContent : undefined });
      if (!info.success) return { success: false, error: info.error };
      console.log(`✅ Coach approval email sent successfully to: ${email}`);
      return { success: true, };
    } catch (error) {
      console.error("❌ Error sending Coach approval email:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Rejection Email to Coach
   */
  static async sendCoachRejectionEmail(email, firstName, reason = "") {
    try {
      console.log(`📧 Preparing coach rejection email to: ${email}`);

      const displayName = firstName || email.split("@")[0];
      const subject = "Your YAU Coach Application Status";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Application Status</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fef2f2; padding: 30px; border-radius: 10px; border: 1px solid #fee2e2;">
            <h1 style="color: #991b1b; margin-top: 0;">Application Update</h1>
            <p>Hello ${displayName},</p>
            <p>Thank you for your interest in coaching with YAU Sports. At this time, we are unable to proceed with your application.</p>
            
            ${reason ? `<div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #f87171; margin: 20px 0;">
              <p style="margin: 0;"><strong>Message from Administration:</strong> ${reason}</p>
            </div>` : ''}
            
            <p>We appreciate the time you took to apply and wish you the best in your future endeavors.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">© ${new Date().getFullYear()} YAU Sports. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;



      const info = await this.sendEmail({ to: email, subject: subject, html: htmlContent, text: typeof textContent !== "undefined" ? textContent : undefined });
      if (!info.success) return { success: false, error: info.error };
      console.log(`✅ Coach rejection email sent successfully to: ${email}`);
      return { success: true, };
    } catch (error) {
      console.error("❌ Error sending Coach rejection email:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = EmailService;
