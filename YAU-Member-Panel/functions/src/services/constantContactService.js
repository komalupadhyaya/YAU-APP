const { db } = require("../utils/firebase");
const { doc, getDoc, setDoc } = require("firebase/firestore");
const axios = require("axios");

class ConstantContactService {
  static COLLECTION = "constant-contact";
  static CREDENTIALS_DOC = "credentials";
  static YAU_GROUP_NAME = "YAU NEW";
  static CUSTOM_FIELDS_DOC = "custom-fields";

  static credentials = null;
  static customFieldIds = null;

  static async initialize() {
    try {
      if (this.credentials) return this.credentials;

      const docRef = doc(db, this.COLLECTION, this.CREDENTIALS_DOC);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.credentials = docSnap.data();
        console.log("✅ Constant Contact credentials loaded from Firebase");
      } else {
        // Initialize from environment variables
        this.credentials = {
          clientId: process.env.CONSTANT_CONTACT_CLIENT_ID,
          clientSecret: process.env.CONSTANT_CONTACT_CLIENT_SECRET,
          accessToken: process.env.CONSTANT_CONTACT_ACCESS_TOKEN,
          refreshToken: process.env.CONSTANT_CONTACT_REFRESH_TOKEN,
          welcomeCampaignActivityId: process.env.WELCOME_CAMPAIGN_ACTIVITY_ID,
          fromEmail: process.env.FROM_EMAIL,
          fromName: process.env.FROM_NAME,
          replyToEmail: process.env.REPLY_TO_EMAIL || process.env.FROM_EMAIL,
          lastUpdated: new Date().toISOString(),
        };
        await this.saveCredentials();
        console.log("✅ Credentials initialized from env and saved to Firebase");
      }

      // Load or create custom field IDs
      await this.initializeCustomFields();

      return this.credentials;
    } catch (error) {
      console.error("Error loading CC credentials:", error);
      throw new Error("Failed to initialize Constant Contact service: " + error.message);
    }
  }

  static async initializeCustomFields() {
    try {
      const docRef = doc(db, this.COLLECTION, this.CUSTOM_FIELDS_DOC);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.customFieldIds = docSnap.data();
        console.log("✅ Custom field IDs loaded from Firebase");
      } else {
        // Create custom fields in Constant Contact
        console.log("🔄 Creating custom fields in Constant Contact...");
        this.customFieldIds = await this.createConstantContactCustomFields();
        await setDoc(docRef, this.customFieldIds);
        console.log("✅ Custom field IDs saved to Firebase");
      }
    } catch (error) {
      console.error("Error initializing custom fields:", error);
      // Continue without custom fields if creation fails
      this.customFieldIds = {};
    }
  }

  static async createConstantContactCustomFields() {
    try {
      const config = await this.getApiConfig();
      const API_URL = "https://api.cc.email/v3";
      
      // Define the custom fields we need
      const fields = [
        { label: "Sport", type: "string" },
        { label: "Location", type: "string" },
        { label: "Membership Type", type: "string" },
        { label: "Registration Plan", type: "string" },
      ];

      const fieldIds = {};

      // Get existing custom fields
      const response = await axios.get(`${API_URL}/contact_custom_fields`, config);
      const existingFields = response.data.custom_fields || [];

      // Create or find each field
      for (const field of fields) {
        const existing = existingFields.find(f => f.label === field.label);
        
        if (existing) {
          fieldIds[field.label] = existing.custom_field_id;
          console.log(`✅ Found existing field: ${field.label} (${existing.custom_field_id})`);
        } else {
          // Create new field
          const createResponse = await axios.post(
            `${API_URL}/contact_custom_fields`,
            {
              label: field.label,
              type: field.type,
            },
            config
          );
          fieldIds[field.label] = createResponse.data.custom_field_id;
          console.log(`✅ Created new field: ${field.label} (${createResponse.data.custom_field_id})`);
        }
      }

      return fieldIds;
    } catch (error) {
      console.error("Failed to create custom fields:", error.response?.data || error.message);
      throw error;
    }
  }

  static async saveCredentials() {
    try {
      const docRef = doc(db, this.COLLECTION, this.CREDENTIALS_DOC);
      await setDoc(docRef, {
        ...this.credentials,
        lastUpdated: new Date().toISOString(),
      });
      console.log("✅ Credentials saved to Firebase");
    } catch (error) {
      console.error("Error saving CC credentials:", error);
      throw new Error("Failed to save credentials: " + error.message);
    }
  }

  static isTokenExpired(token) {
    try {
      if (!token) return true;
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
      const expiryTime = payload.exp * 1000;
      return expiryTime - Date.now() < 5 * 60 * 1000; // 5 minute buffer
    } catch (error) {
      console.error("Error decoding token:", error);
      return true;
    }
  }

  static async refreshAccessToken() {
    try {
      await this.initialize();

      if (!this.credentials.refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await axios.post(
        "https://authz.constantcontact.com/oauth2/default/v1/token ",
        new URLSearchParams({
          refresh_token: this.credentials.refreshToken,
          grant_type: "refresh_token",
        }),
        {
          auth: {
            username: this.credentials.clientId,
            password: this.credentials.clientSecret,
          },
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      this.credentials.accessToken = response.data.access_token;
      this.credentials.refreshToken = response.data.refresh_token;
      await this.saveCredentials();

      console.log("🔄 Access token refreshed successfully");
      return this.credentials.accessToken;
    } catch (error) {
      console.error("Failed to refresh token:", error.response?.data || error.message);
      throw new Error("Token refresh failed: " + (error.response?.data?.error || error.message));
    }
  }

  static async ensureValidToken() {
    await this.initialize();

    if (this.isTokenExpired(this.credentials.accessToken)) {
      console.log("⚠️ Access token expired or about to expire, refreshing...");
      await this.refreshAccessToken();
    }

    return this.credentials.accessToken;
  }

  static isValidPhone(phone) {
    return phone && phone.replace(/\D/g, "").length >= 10;
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  static async getApiConfig() {
    const token = await this.ensureValidToken();
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };
  }

  static async getOrCreateYAUGroup() {
    try {
      const config = await this.getApiConfig();
      const API_URL = "https://api.cc.email/v3";

      const response = await axios.get(`${API_URL}/contact_lists`, config);
      const existing = response.data.lists?.find((list) => list.name === this.YAU_GROUP_NAME);

      if (existing) {
        console.log(`✅ Found YAU group: ${existing.list_id}`);
        return existing.list_id;
      }

      const createRes = await axios.post(
        `${API_URL}/contact_lists`,
        { name: this.YAU_GROUP_NAME },
        config
      );
      console.log(`✅ Created YAU group: ${createRes.data.list_id}`);
      return createRes.data.list_id;
    } catch (error) {
      console.error(`❌ Error with YAU group:`, error.response?.data || error.message);
      throw new Error(`YAU group operation failed: ${error.message}`);
    }
  }

  static async getContactByEmail(email) {
    try {
      const config = await this.getApiConfig();
      const API_URL = "https://api.cc.email/v3";

      const response = await axios.get(
        `${API_URL}/contacts?email=${encodeURIComponent(email)}`,
        config
      );
      return response.data.contacts?.[0] || null;
    } catch (error) {
      console.error("Error getting contact:", error.response?.data || error.message);
      return null;
    }
  }

  static buildCustomFields(userData) {
    const fields = [];
    
    if (this.customFieldIds["Sport"] && userData.sport) {
      fields.push({
        custom_field_id: this.customFieldIds["Sport"],
        value: userData.sport,
      });
    }
    
    if (this.customFieldIds["Location"] && userData.location) {
      fields.push({
        custom_field_id: this.customFieldIds["Location"],
        value: userData.location,
      });
    }
    
    if (this.customFieldIds["Membership Type"] && userData.membershipType) {
      fields.push({
        custom_field_id: this.customFieldIds["Membership Type"],
        value: userData.membershipType,
      });
    }
    
    if (this.customFieldIds["Registration Plan"] && userData.registrationPlan) {
      fields.push({
        custom_field_id: this.customFieldIds["Registration Plan"],
        value: userData.registrationPlan,
      });
    }
    
    return fields;
  }

  static async createYAUContact(userData) {
    try {
      const { sport, phone, firstName, lastName, location, membershipType, registrationPlan, email } = userData;

      // Validate phone
      if (!this.isValidPhone(phone)) {
        throw new Error("invalid phone format");
      }

      // Validate email if provided
      if (email && !this.isValidEmail(email)) {
        throw new Error("invalid email format");
      }

      // Initialize credentials and custom fields
      await this.initialize();

      // Build email from phone if not provided
      const contactEmail = email || `user_${phone.replace(/\D/g, '')}@yau-sports.temp`;

      // Check if contact exists
      const existingContact = await this.getContactByEmail(contactEmail);
      if (existingContact) {
        console.log(`⚠️ Contact already exists: ${existingContact.contact_id}`);
        return existingContact;
      }

      // Get or create YAU group
      const listId = await this.getOrCreateYAUGroup();

      // Build custom fields with IDs
      const customFields = this.buildCustomFields(userData);

      // Prepare contact payload with custom fields
      const contactPayload = {
        email_address: {
          address: contactEmail,
          permission_to_send: "implicit",
        },
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone,
        list_memberships: [listId],
        create_source: "Account",
        custom_fields: customFields, // Use IDs here
      };

      const config = await this.getApiConfig();
      const API_URL = "https://api.cc.email/v3";

      const response = await axios.post(`${API_URL}/contacts`, contactPayload, config);
      console.log(`✅ YAU contact created: ${response.data.contact_id}`);

      return response.data;
    } catch (error) {
      console.error("Create YAU contact error:", error.response?.data || error.message);
      throw new Error("Failed to create YAU contact: " + error.message);
    }
  }

  static async sendWelcomeEmail(email) {
    try {
      await this.initialize();

      if (!this.credentials.welcomeCampaignActivityId) {
        console.warn("⚠️ Welcome campaign activity ID not configured");
        return { status: "skipped", message: "Campaign ID not configured" };
      }

      const config = await this.getApiConfig();
      const API_URL = "https://api.cc.email/v3";

      const response = await axios.post(
        `${API_URL}/emails/activities/${this.credentials.welcomeCampaignActivityId}/tests`,
        {
          email_addresses: [email],
          personal_message: "Welcome to YAU Sports!",
        },
        config
      );

      console.log(`✅ Welcome email sent to: ${email}`);
      return response.data;
    } catch (error) {
      console.warn("⚠️ Welcome email failed:", error.response?.data?.message || error.message);
      return {
        status: "failed",
        message: error.response?.data?.message || error.message,
      };
    }
  }

  static async registerYAU(userData) {
    try {
      console.log("🚀 Processing YAU registration...");

      // Step 1: Create contact and add to YAU group
      const contact = await this.createYAUContact(userData);

      // Step 2: Send welcome email
      const emailResult = await this.sendWelcomeEmail(contact.email_address.address);

      return {
        success: true,
        contactId: contact.contact_id,
        contactEmail: contact.email_address.address,
        group: this.YAU_GROUP_NAME,
        welcomeEmailSent: emailResult.status !== "failed",
        welcomeEmailStatus: emailResult,
        customFields: contact.custom_fields,
      };
    } catch (error) {
      console.error("❌ YAU registration failed:", error);
      throw error;
    }
  }
  static async saveCredentialsToDB(accessToken, refreshToken) {
    try {
      const docRef = doc(db, this.COLLECTION, this.CREDENTIALS_DOC);
      await setDoc(docRef, {
        ...this.credentials, // Keep all existing credentials
        accessToken: accessToken,
        refreshToken: refreshToken,
        lastUpdated: new Date().toISOString(),
      }, { merge: true }); // Use merge to preserve other fields
      console.log("✅ Credentials saved to Firebase");
    } catch (error) {
      console.error("Error saving CC credentials:", error);
      throw new Error("Failed to save credentials: " + error.message);
    }
  }
}

module.exports = ConstantContactService;