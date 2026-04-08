// Referral Status Constants
exports.REFERRAL_STATUS = {
  SENT: 'sent',
  OPENED: 'opened', 
  JOINED: 'joined'
};

// Referral Source Constants
exports.REFERRAL_SOURCE = {
  EMAIL: 'email',
  SMS: 'sms',
  LINK: 'link'
};

// Rate Limits
exports.RATE_LIMITS = {
  EMAIL_DAILY_LIMIT: 50,
  SMS_DAILY_LIMIT: 20
};

// Reward Configuration
exports.REWARDS = {
  JOIN_REWARD_AMOUNT: 10.00, // $10 credit for successful referral
  MAX_REWARDS_PER_USER: 500.00 // Max $500 in referral rewards
};