const validatePaymentIntent = (req, res, next) => {
  const { amount, currency } = req.body;

  if (!amount || amount < 50) {
    return res.status(400).json({
      error: "Invalid amount. Minimum $0.50",
    });
  }

  if (amount > 100000) { // $1000 max
    return res.status(400).json({
      error: "Amount exceeds maximum limit",
    });
  }

  if (!currency) {
    req.body.currency = "usd";
  }

  next();
};

const validateCustomer = (req, res, next) => {
  const { email, name } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({
      error: "Valid email is required",
    });
  }

  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      error: "Valid name is required",
    });
  }

  next();
};
// Add these to your existing validation.js file

const validatePaymentRecord = (req, res, next) => {
  const {
    // userId,
    userEmail,
    amount,
    planType,
    planName,
    paymentIntentId,
  } = req.body;

  if (!userEmail || !userEmail.includes("@")) {
    return res.status(400).json({
      error: "Valid email is required",
    });
  }

  if (!amount || amount < 50) {
    return res.status(400).json({
      error: "Invalid amount. Minimum $0.50",
    });
  }

  if (!planType || !planName) {
    return res.status(400).json({
      error: "Plan type and plan name are required",
    });
  }

  if (!paymentIntentId) {
    return res.status(400).json({
      error: "Payment intent ID is required",
    });
  }

  next();
};

const validatePaymentUpdate = (req, res, next) => {
  const { paymentStatus } = req.body;

  const validStatuses = ["pending", "completed", "failed", "refunded", "canceled"];

  if (!paymentStatus) {
    return res.status(400).json({
      error: "Payment status is required",
    });
  }

  if (!validStatuses.includes(paymentStatus)) {
    return res.status(400).json({
      error: `Invalid payment status. Must be one of: ${validStatuses.join(", ")}`,
    });
  }

  next();
};

const validateEmail = (req, res, next) => {
  const { email } = req.params;

  if (!email || !email.includes("@")) {
    return res.status(400).json({
      error: "Valid email parameter is required",
    });
  }

  next();
};

const validateUserId = (req, res, next) => {
  const { userId } = req.params;

  if (!userId || userId.trim().length < 3) {
    return res.status(400).json({
      error: "Valid user ID is required",
    });
  }

  next();
};
// middleware/validation.js - Add these validation functions

const validateRosterData = (req, res, next) => {
  const { sport, grade, ageGroup, location } = req.body;

  const errors = [];

  if (!sport || typeof sport !== 'string' || sport.trim().length === 0) {
    errors.push('Sport is required and must be a non-empty string');
  }

  // Grade is now the primary field, but ageGroup is still accepted for backward compatibility
  if (!grade && !ageGroup) {
    errors.push('Either grade or ageGroup is required');
  }

  if (grade && typeof grade !== 'string' || (grade && grade.trim().length === 0)) {
    errors.push('Grade must be a non-empty string if provided');
  }

  // Validate grade format (should be one of the standard grades)
  const validGrades = ["Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade"];
  if (grade && !validGrades.includes(grade)) {
    errors.push(`Grade must be one of: ${validGrades.join(', ')}`);
  }

  // Validate age group format if provided (for backward compatibility)
  if (ageGroup) {
    const ageGroupPattern = /^\d{1,2}U$/;
    if (typeof ageGroup !== 'string' || !ageGroupPattern.test(ageGroup)) {
      errors.push('Age group must be in format like "6U", "8U", "10U", etc.');
    }
  }

  if (!location || typeof location !== 'string' || location.trim().length === 0) {
    errors.push('Location is required and must be a non-empty string');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

const validateRosterUpdate = (req, res, next) => {
  const updates = req.body;
  const errors = [];

  // Validate only provided fields
  if (updates.sport !== undefined) {
    if (typeof updates.sport !== 'string' || updates.sport.trim().length === 0) {
      errors.push('Sport must be a non-empty string');
    }
  }

  if (updates.grade !== undefined) {
    const validGrades = ["Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade"];
    if (typeof updates.grade !== 'string' || !validGrades.includes(updates.grade)) {
      errors.push(`Grade must be one of: ${validGrades.join(', ')}`);
    }
  }

  if (updates.ageGroup !== undefined) {
    const ageGroupPattern = /^\d{1,2}U$/;
    if (typeof updates.ageGroup !== 'string' || !ageGroupPattern.test(updates.ageGroup)) {
      errors.push('Age group must be in format like "6U", "8U", "10U", etc.');
    }
  }

  if (updates.location !== undefined) {
    if (typeof updates.location !== 'string' || updates.location.trim().length === 0) {
      errors.push('Location must be a non-empty string');
    }
  }

  if (updates.maxPlayers !== undefined) {
    if (!Number.isInteger(updates.maxPlayers) || updates.maxPlayers < 1) {
      errors.push('Max players must be a positive integer');
    }
  }

  if (updates.minPlayers !== undefined) {
    if (!Number.isInteger(updates.minPlayers) || updates.minPlayers < 1) {
      errors.push('Min players must be a positive integer');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};


module.exports = {
  validatePaymentIntent,
  validateCustomer,
  validatePaymentRecord,
  validatePaymentUpdate,
  validateEmail,
  validateUserId,
  validateRosterData,
  validateRosterUpdate
};
