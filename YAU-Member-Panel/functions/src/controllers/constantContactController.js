const ConstantContactService = require("../services/constantContactService");
const axios = require("axios");

const REDIRECT_URI = process.env.CONSTANT_CONTACT_REDIRECT_URI;
const CLIENT_ID = process.env.CONSTANT_CONTACT_CLIENT_ID;
const CLIENT_SECRET = process.env.CONSTANT_CONTACT_CLIENT_SECRET;

exports.registerYAU = async (req, res) => {
  try {
    const { sport, phone, firstName, lastName, location, membershipType, registrationPlan, email } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !phone) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: firstName, lastName, phone",
      });
    }

    console.log(`📝 Processing YAU registration for: ${firstName} ${lastName}`);

    // Pass all data including optional email to service
    const result = await ConstantContactService.registerYAU({
      sport,
      phone,
      firstName,
      lastName,
      location,
      membershipType,
      registrationPlan,
      email,
    });

    res.status(200).json({
      success: true,
      message: "YAU registration processed successfully",
      data: result,
    });
  } catch (error) {
    console.error("YAU registration error:", error);

    if (error.message.includes("invalid phone format")) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone format",
      });
    }

    if (error.message.includes("invalid email format")) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    if (error.message.includes("token expired") || error.message.includes("authentication")) {
      return res.status(401).json({
        success: false,
        message: "Constant Contact authentication failed",
        details: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to process YAU registration",
      details: error.message,
    });
  }
};

exports.auth = async (req, res) => {
  try {
    // Load service to ensure credentials are initialized
    await ConstantContactService.initialize();
    
    const state = "admin_" + Date.now();
    
    // Build auth URL (REMOVED space after client_id=)
    const authUrl = `https://authz.constantcontact.com/oauth2/default/v1/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=offline_access%20contact_data%20campaign_data%20account_read&state=${state}`;
    
    console.log("🔑 Redirecting to:", authUrl);
    res.redirect(authUrl);
    
  } catch (error) {
    console.error("Auth initialization error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to initialize OAuth flow" 
    });
  }
};

exports.callback = async (req, res) => {
  const { code, error: oauthError } = req.query;
  
  // Handle user cancellation
  if (oauthError) {
    console.error("❌ OAuth cancelled by user:", oauthError);
    return res.status(400).json({ 
      success: false, 
      message: "OAuth cancelled by user" 
    });
  }
  
  if (!code) {
    return res.status(400).json({ 
      success: false, 
      message: "Missing authorization code" 
    });
  }

  console.log("✅ Received callback with code");

  try {
    // Exchange code for tokens
    const response = await axios.post(
      "https://authz.constantcontact.com/oauth2/default/v1/token", // REMOVED trailing space
      new URLSearchParams({
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      {
        auth: { 
          username: CLIENT_ID, 
          password: CLIENT_SECRET 
        },
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded" 
        },
      }
    );

    const tokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in,
    };

    console.log("✅ Tokens received successfully");
    console.log("🔑 Access Token:", tokens.accessToken);
    console.log("🔄 Refresh Token:", tokens.refreshToken);

    // Save tokens via service
    const credentials = await ConstantContactService.initialize();
    credentials.accessToken = tokens.accessToken;
    credentials.refreshToken = tokens.refreshToken;
    credentials.lastUpdated = new Date().toISOString();
    await ConstantContactService.saveCredentials();
    
    res.send({
      success: true,
      message: "Authentication successful! Tokens saved to Firebase.",
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }
    });

  } catch (error) {
    console.error("❌ OAuth Error:", error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: "Failed to exchange code for tokens",
      details: error.response?.data || error.message
    });
  }
};