const crypto = require('crypto');

// In-memory store for CSRF tokens (in production, use Redis or database)
const csrfTokens = new Map();

// Clean up expired tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of csrfTokens.entries()) {
    if (now - data.createdAt > 24 * 60 * 60 * 1000) { // 24 hours
      csrfTokens.delete(token);
    }
  }
}, 60 * 60 * 1000); // Run every hour

// Generate CSRF token
const generateCSRFToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const createdAt = Date.now();

  csrfTokens.set(token, { createdAt });

  return token;
};

// Validate CSRF token
const validateCSRFToken = (req, res, next) => {
  const token = req.headers['x-csrf-token'] || req.body.csrfToken;

  if (!token) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token required'
    });
  }

  const tokenData = csrfTokens.get(token);

  if (!tokenData) {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token'
    });
  }

  // Check if token is expired (24 hours)
  if (Date.now() - tokenData.createdAt > 24 * 60 * 60 * 1000) {
    csrfTokens.delete(token);
    return res.status(403).json({
      success: false,
      error: 'CSRF token expired'
    });
  }

  // Token is valid, remove it to prevent reuse
  csrfTokens.delete(token);

  next();
};

// Get CSRF token endpoint
const getCSRFToken = (req, res) => {
  try {
    // Check if request comes from our trusted domain
    const origin = req.headers.origin || req.headers.referer;
    const allowedOrigins = [
      'https://members.yauapp.com',
      'https://yau-member-panel.web.app',
      'https://yau-member-panel.firebaseapp.com',
      'https://yau-app.onrender.com',
      'http://pickup.yauapp.com',
      'https://pickup.yauapp.com',
      'http://localhost:3000', // For development
      'http://localhost:3001', // For development
      'http://localhost:5173', // Vite default
      'http://localhost:5174'  // Vite alternative
    ];

    if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return res.status(403).json({
        success: false,
        error: 'Request from unauthorized origin'
      });
    }

    const token = generateCSRFToken();

    res.status(200).json({
      success: true,
      csrfToken: token
    });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate CSRF token'
    });
  }
};

module.exports = {
  generateCSRFToken,
  validateCSRFToken,
  getCSRFToken
};