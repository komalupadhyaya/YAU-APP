const admin = require("firebase-admin");

class AuthService {
  static async createFirebaseAuthUser(req, res) {
    const { email, password } = req.body;
    
    try {
      console.log('👤 Creating Firebase Auth user via Admin SDK for:', email);
      
      const userRecord = await admin.auth().createUser({
        email,
        password,
      });

      console.log('✅ Successfully created new user:', userRecord.uid);
      
      res.status(201).json({
        success: true,
        data: {
          localId: userRecord.uid
        }
      });
    } catch (error) {
      console.error("❌ Failed to create Firebase Auth user:", error.message);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = AuthService;