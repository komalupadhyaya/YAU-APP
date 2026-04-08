const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Support both authentication methods: Account SID + Auth Token OR API Key + API Secret
let client = null;
if (apiKey && apiSecret && accountSid) {
  // API Key authentication (recommended)
  client = new twilio(apiKey, apiSecret, { accountSid });
} else if (accountSid && authToken) {
  // Traditional authentication
  client = new twilio(accountSid, authToken);
}

// Platform-specific messages
const getSMSMessage = (platform = 'member') => {
  switch (platform) {
    case 'pickup':
      return `Thank you for registering your child for YAUTeamUp. Check your emails (Spam/Junk). Emails come from YAU TeamUp (Fun@YAUSports.org). If you have questions, please call us on 800-293-0354 10am-5pm EST\n\nReply STOP to opt out.`;

    case 'member':
      return `Welcome to YAUTeamUp! Your account has been created successfully. Access your member portal at [https://members.yauapp.com/]. Practice details and uniform information will be shared via email. Contact us at 800-293-0354 for any questions.\n\nReply STOP to opt out.`;

    default:
      return `Welcome to YAUTeamUp! Your account has been created successfully. Access your member portal at [https://members.yauapp.com/]. Practice details and uniform information will be shared via email. Contact us at 800-293-0354 for any questions.\n\nReply STOP to opt out.`;
  }
};

exports.sendEnrollmentSMS = async (phoneNumber, platform = 'member') => {
  if (!client) {
    console.warn("Twilio credentials are not configured. Skipping SMS sending.");
    return;
  }

  if (!phoneNumber) {
    console.warn("No phone number provided for SMS sending.");
    return;
  }

  if (!twilioPhoneNumber) {
    console.warn("TWILIO_PHONE_NUMBER is not configured. Skipping SMS sending.");
    return;
  }

  try {
    // Format phone number - ensure it has country code
    let formattedPhone = phoneNumber;

    if (!formattedPhone.startsWith('+')) {
      // Require users to provide properly formatted international numbers
      // Don't assume +1 for US - this causes issues for international users
      console.warn(`Phone number ${phoneNumber} must include country code (e.g., +91 for India, +1 for US)`);
      return; // Skip SMS sending instead of sending invalid number
    }

    // Clean the number for Twilio (remove spaces, dashes, etc. but keep +)
    formattedPhone = formattedPhone.replace(/[\s\-\(\)]/g, '');

    // Validate that we have a proper international number
    if (formattedPhone.length < 10) {
      console.warn(`Phone number ${phoneNumber} appears to be too short for international format`);
      return;
    }

    const message = await client.messages.create({
      body: getSMSMessage(platform),
      from: twilioPhoneNumber,
      to: formattedPhone,
    });

    console.log(`SMS sent successfully to ${formattedPhone}. Message SID: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error("Error sending SMS via Twilio:", error.message);
    return { success: false, error: error.message };
  }
};

exports.sendMemberWelcomeSMS = async (phoneNumber, platform = 'member') => {
  if (!client) {
    console.warn("Twilio credentials are not configured. Skipping SMS sending.");
    return;
  }

  if (!phoneNumber) {
    console.warn("No phone number provided for SMS sending.");
    return;
  }

  if (!twilioPhoneNumber) {
    console.warn("TWILIO_PHONE_NUMBER is not configured. Skipping SMS sending.");
    return;
  }

  try {
    // Format phone number - ensure it has country code
    let formattedPhone = phoneNumber;

    if (!formattedPhone.startsWith('+')) {
      // Require users to provide properly formatted international numbers
      // Don't assume +1 for US - this causes issues for international users
      console.warn(`Phone number ${phoneNumber} must include country code (e.g., +91 for India, +1 for US)`);
      return; // Skip SMS sending instead of sending invalid number
    }

    // Clean the number for Twilio (remove spaces, dashes, etc. but keep +)
    formattedPhone = formattedPhone.replace(/[\s\-\(\)]/g, '');

    // Validate that we have a proper international number
    if (formattedPhone.length < 10) {
      console.warn(`Phone number ${phoneNumber} appears to be too short for international format`);
      return;
    }

    const message = await client.messages.create({
      body: getSMSMessage(platform),
      from: twilioPhoneNumber,
      to: formattedPhone,
    });

    console.log(`Member welcome SMS sent successfully to ${formattedPhone}. Message SID: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error("Error sending member welcome SMS via Twilio:", error.message);
    return { success: false, error: error.message };
  }
};

exports.sendCoachAssignmentSMS = async (phoneNumber, assignment) => {
  if (!client || !phoneNumber || !twilioPhoneNumber) {
    console.warn("Twilio configuration or phoneNumber missing. Skipping Coach Assignment SMS.");
    return { success: false, error: "Missing configuration or phone number" };
  }
  
  try {
    let formattedPhone = phoneNumber;
    if (!formattedPhone.startsWith('+')) {
       // Assume a US number if not prefixed but we should warn
       formattedPhone = '+1' + formattedPhone.replace(/[\s\-\(\)]/g, '');
    } else {
       formattedPhone = formattedPhone.replace(/[\s\-\(\)]/g, '');
    }

    if (formattedPhone.length < 10) return { success: false, error: "Invalid phone number length" };

    const body = `YAU Coach Assignment\nSite: ${assignment.site}\nDate: ${assignment.report}\nTime: ${assignment.hours}\nRole: ${assignment.role || 'Coach'}\nAddress: ${assignment.address || 'N/A'}\nStatus: ${assignment.status}\n\nReply STOP to opt out.`;

    const message = await client.messages.create({
      body: body,
      from: twilioPhoneNumber,
      to: formattedPhone,
    });

    console.log(`Assignment SMS sent to ${formattedPhone}. SID: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error("Error sending Coach Assignment SMS:", error.message);
    return { success: false, error: error.message };
  }
};