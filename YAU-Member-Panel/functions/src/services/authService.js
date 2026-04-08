const FIREBASE_API_KEY = "AIzaSyCADG-9nm-61nmsHbe-hNlg82g0ccKpjkw";

class AuthService {
  static async createFirebaseAuthUser(email, password) {
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: false,
          }),
        }
      );
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      return data.localId;
    } catch (error) {
      console.error("Failed to create Firebase Auth user:", error.message);
      throw error;
    }
  }
}

module.exports = AuthService;