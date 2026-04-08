const admin = require("firebase-admin");

// Verify Firebase ID Token
const verifyIdToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "No authorization token provided",
      });
    }

    const idToken = authHeader.split("Bearer ")[1];

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

// Check if user owns the resource
const checkResourceOwnership = (req, res, next) => {
  const {userId} = req.params;
  const authenticatedUserId = req.user.uid;

  if (userId !== authenticatedUserId) {
    return res.status(403).json({
      success: false,
      error: "Access denied. You can only access your own data.",
    });
  }

  next();
};

// Optional auth - allows both authenticated and unauthenticated requests
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
    }

    next();
  } catch (error) {
    // Continue without auth for optional routes
    next(error);
  }
};



// Require admin middleware
const requireAdmin = (req, res, next) => {
  // Check if the decoded token includes admin claim or custom role
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: "Admin access required"
    });
  }
  next();
};

module.exports = {
  verifyIdToken,
  checkResourceOwnership,
  optionalAuth,
  requireAdmin
};
