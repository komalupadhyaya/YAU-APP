// config/stripe.js
// Load environment variables for local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Simple environment variable getter for Firebase Functions v2
const getEnvVar = (key, defaultValue = null) => {
  // Use process.env for both local development and production
  return process.env[key] || defaultValue;
};

const STRIPE_SECRET_KEY = getEnvVar('STRIPE_SECRET_KEY');

if (!STRIPE_SECRET_KEY) {
  console.warn("Stripe key missing - skipping Stripe init");
}

const stripe = STRIPE_SECRET_KEY ? require("stripe")(STRIPE_SECRET_KEY) : null;

const STRIPE_CONFIG = {
  // Uniform pricing - $75.00 in cents
  uniformPrice: 7500,
  
  plans: {
    monthly: {
      name: "Monthly Membership",
      description: "Monthly recurring membership per student",
      amount: 5000, // $50.00 per student in cents
      currency: "USD",
      interval: "month",
      priceId: getEnvVar('YAU_MONTHLY_PRICE') || "price_monthly_test",
    },
    oneTime: {
      name: "One-Time Payment with Uniform",
      description: "One-time membership fee per student (includes uniform)",
      amount: 20000, // $200.00 per student in cents  
      currency: "USD",
      priceId: getEnvVar('YAU_ONE_TIME_WITH_UNIFORM_PRICE') || "price_onetime_test",
    },
    uniform: {
      name: "Uniform Order",
      description: "Standalone uniform purchase",
      amount: 7500, // $75.00 in cents
      currency: "USD", 
      priceId: getEnvVar('YAU_UNIFORM_ONLY') || "price_uniform_test",
    },
    childId: {
      name: "Child ID",
      description: "Child identification service",
      amount: 1000, // $10.00 in cents
      currency: "USD",
      priceId: getEnvVar('YAU_CHILD_ID') || "price_childid_test",
    },
  },

  // Pricing calculation helper - monthly excludes uniform by default, one-time includes it
  calculateAmount: (planType, childrenCount = 1, includeUniform = false) => {
    const baseAmount = STRIPE_CONFIG.plans[planType]?.amount;
    if (!baseAmount) return 5000;

    let totalAmount = 0;

    if (childrenCount <= 1) {
      totalAmount = baseAmount;
    } else if (childrenCount === 2) {
      totalAmount = baseAmount * 2;
    } else {
      // 15% family discount for 3+ children
      totalAmount = Math.floor(baseAmount * childrenCount * 0.85);
    }

    // For monthly plans: uniform is optional and separate
    // For one-time plans: uniform is always included in the base price
    if (planType === 'monthly' && includeUniform) {
      totalAmount += STRIPE_CONFIG.uniformPrice;
    }

    return totalAmount;
  },

  // Update helper to include uniform details
  getPlanDetails: (planType, childrenCount = 1, includeUniform = false) => {
    const basePlan = STRIPE_CONFIG.plans[planType];
    if (!basePlan) return null;

    const calculatedAmount = STRIPE_CONFIG.calculateAmount(planType,
      childrenCount, includeUniform);

    return {
      ...basePlan,
      amount: calculatedAmount,
      basePrice: basePlan.amount / 100,
      totalPrice: calculatedAmount / 100,
      childrenCount,
      includeUniform,
      uniformPrice: includeUniform ? STRIPE_CONFIG.uniformPrice / 100 : 0,
      hasDiscount: childrenCount >= 3,
      discountPercent: childrenCount >= 3 ? 15 : 0,
      discountAmount: childrenCount >= 3 ?
        (basePlan.amount * childrenCount - calculatedAmount + (includeUniform ?
          STRIPE_CONFIG.uniformPrice : 0)) / 100 : 0
    };
  }
};
module.exports = {
  stripe,
  STRIPE_CONFIG,
};
