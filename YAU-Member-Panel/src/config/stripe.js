// config/stripe.js
export const STRIPE_CONFIG = {
  publishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
  
  // Uniform pricing
  uniformPrice: 7500, // $75.00 in cents
  
  plans: {
    monthly: {
      name: "Monthly Membership",
      description: "Monthly recurring membership per student",
      amount: 5000, // $50.00 per student in cents
      currency: "USD",
      interval: "month",
      priceId: "price_monthly_xxx",
    },
    oneTime: {
      name: "One-Time Payment",
      description: "One-time membership fee per student (includes uniform)",
      amount: 20000, // $200.00 per student in cents  
      currency: "USD",
      priceId: "price_onetime_xxx",
    },
  },

  // Add pricing calculation helper
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

    // Add uniform cost if selected
    if (includeUniform && planType === 'monthly') {
      totalAmount += STRIPE_CONFIG.uniformPrice;
    }

    return totalAmount;
  },

  // Update helper to include uniform details
  getPlanDetails: (planType, childrenCount = 1, includeUniform = false) => {        
    const basePlan = STRIPE_CONFIG.plans[planType];
    if (!basePlan) return null;

    const calculatedAmount = STRIPE_CONFIG.calculateAmount(planType, childrenCount, includeUniform);

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
        (basePlan.amount * childrenCount - calculatedAmount + (includeUniform ? STRIPE_CONFIG.uniformPrice : 0)) / 100 : 0
    };
  }
};