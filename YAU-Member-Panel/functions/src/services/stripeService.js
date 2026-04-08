const {stripe, STRIPE_CONFIG} = require("../config/stripe");

class StripeService {
  // Create Payment Intent for one-time payments
 static calculateDynamicAmount(planType, childrenCount = 1) {
  const baseAmount = STRIPE_CONFIG.plans[planType]?.amount || 5000;

  if (childrenCount <= 1) return baseAmount;
  if (childrenCount === 2) return baseAmount * 2;

  // 15% family discount for 3+ children
  return Math.floor(baseAmount * childrenCount * 0.85);
}

// Create payment intent with saved card check
static async createPaymentIntentWithSavedCard(amount, currency = "usd", metadata = {}) {
  try {
    console.log("💳 Creating payment intent with saved card check:", {
      amount,
      currency,
      userEmail: metadata.userEmail
    });

    let customerId = null;
    let useDefaultPaymentMethod = false;
    let selectedPaymentMethodId = null;

    // Check for existing customer and saved cards
    if (metadata.userEmail) {
      try {
        const customerData = await this.getCustomerByEmail(metadata.userEmail);
        if (customerData) {
          customerId = customerData.customerId;
          console.log("👤 Found existing customer:", customerId);

          // Check for saved payment methods
          const paymentMethods = await this.getPaymentMethods(customerId);
          if (paymentMethods.paymentMethods && paymentMethods.paymentMethods.length > 0) {
            // Prefer the default payment method if set, otherwise use the first one
            selectedPaymentMethodId = customerData.defaultPaymentMethod || paymentMethods.paymentMethods[0].id;
            useDefaultPaymentMethod = true;
            console.log("💾 Customer has saved payment methods, using:", selectedPaymentMethodId);
          } else {
            console.log("👤 Customer found but NO saved payment methods found");
          }
        }
      } catch (error) {
        console.warn("⚠️ Could not check existing customer or payment methods:", error.message);
      }
    }

    // If no saved payment method found or error occurred, create new payment intent (which will prompt for card)
    if (!useDefaultPaymentMethod) {
      console.log("🆕 No saved payment method, creating new payment intent");
      return await this.createPaymentIntent(amount, currency, metadata);
    }

    // Use saved payment method - create payment intent with customer
    const paymentIntentConfig = {
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      customer: customerId,
      payment_method: selectedPaymentMethodId, // CRITICAL: Must provide PM ID when confirm: true
      off_session: true, // Use off_session if confirming with saved card on backend
      confirm: true,
      return_url: metadata.return_url || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success`,
      metadata: {
        ...metadata,
        created_at: new Date().toISOString(),
        used_saved_card: 'true',
        payment_method_id: selectedPaymentMethodId
      },
      description: `YAU ${metadata.planType || 'Child ID'} payment - ${metadata.childName || 'service'}`,
    };

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      customerId: customerId,
      usedSavedCard: true,
    };
  } catch (error) {
    console.error("❌ Error creating payment intent with saved card:", error);
    throw new Error(`Payment intent creation failed: ${error.message}`);
  }
}

// Update createPaymentIntent to use dynamic pricing and save payment methods
static async createPaymentIntent(amount, currency = "usd", metadata = {}) {
  try {
    console.log("💳 Creating payment intent with dynamic pricing:", {
      amount, 
      currency, 
      childrenCount: metadata.childrenCount,
      userEmail: metadata.userEmail
    });

    // Validate amount matches expected calculation
    if (metadata.childrenCount && metadata.planType) {
      const expectedAmount = this.calculateDynamicAmount(metadata.planType, metadata.childrenCount);
      if (Math.abs(amount - expectedAmount) > 100) { // Allow $1 variance
        console.warn(`⚠️ Amount mismatch: expected ${expectedAmount}, got ${amount}`);
      }
    }

    let customerId = null;

    // Create or get customer if email is provided
    if (metadata.userEmail) {
      try {
        const customerResult = await this.createCustomer(
          metadata.userEmail, 
          metadata.userName || metadata.userEmail.split('@')[0],
          {
            ...metadata,
            payment_intent_creation: new Date().toISOString()
          }
        );
        customerId = customerResult.customerId;
        console.log("👤 Customer created/retrieved:", customerId);
      } catch (customerError) {
        console.warn("⚠️ Could not create customer, proceeding without:", customerError.message);
      }
    }

    // Payment intent configuration
    const paymentIntentConfig = {
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        ...metadata,
        created_at: new Date().toISOString(),
      },
      description: `YAU ${metadata.planType} membership - ${metadata.childrenCount || 1} student(s)`,
    };

    // Add customer and save payment method option if we have a customer
    if (customerId) {
      paymentIntentConfig.customer = customerId;
      paymentIntentConfig.setup_future_usage = 'off_session'; // This saves the payment method
      console.log("💾 Payment method will be saved for future use");
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      customerId: customerId,
    };
  } catch (error) {
    console.error("❌ Error creating payment intent:", error);
    throw new Error(`Payment intent creation failed: ${error.message}`);
  }
}


  // Create Customer
  static async createCustomer(email, name, metadata = {}) {
    try {
      console.log("👤 Creating customer:", {email, name});

      // Check if customer already exists
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        console.log("✅ Customer already exists:", existingCustomers.data[0].id);
        return {
          customerId: existingCustomers.data[0].id,
          isNew: false,
        };
      }

      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          ...metadata,
          created_at: new Date().toISOString(),
        },
      });

      return {
        customerId: customer.id,
        isNew: true,
      };
    } catch (error) {
      console.error("❌ Error creating customer:", error);
      throw new Error(`Customer creation failed: ${error.message}`);
    }
  }

  // Create Subscription
  static async createSubscription(customerId, priceId, metadata = {}) {
    try {
      console.log("🔄 Creating subscription:", {customerId, priceId, quantity: metadata.quantity});

      // Use quantity for multiple children (family plans)
      const quantity = metadata.quantity || metadata.childrenCount || 1;

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: priceId,
          quantity: quantity, // Support multiple children
        }],
        payment_behavior: "default_incomplete",
        payment_settings: {save_default_payment_method: "on_subscription"},
        expand: ["latest_invoice.payment_intent"],
        metadata: {
          ...metadata,
          created_at: new Date().toISOString(),
          childrenCount: quantity.toString(),
        },
      });

      console.log("✅ Subscription created:", {
        subscriptionId: subscription.id,
        status: subscription.status,
        quantity: quantity,
      });

      return {
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        status: subscription.status,
        quantity: quantity,
      };
    } catch (error) {
      console.error("❌ Error creating subscription:", error);
      throw new Error(`Subscription creation failed: ${error.message}`);
    }
  }

  // Get Customer Payment Methods
  static async getPaymentMethods(customerId) {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });

      return {
        paymentMethods: paymentMethods.data.map((pm) => ({
          id: pm.id,
          type: pm.type,
          card: pm.card ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            exp_month: pm.card.exp_month,
            exp_year: pm.card.exp_year,
          } : null,
        })),
      };
    } catch (error) {
      console.error("❌ Error fetching payment methods:", error);
      throw new Error(`Failed to fetch payment methods: ${error.message}`);
    }
  }

  // Cancel Subscription
  static async cancelSubscription(subscriptionId, reason = "user_requested") {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        metadata: {
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
        },
      });

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: subscription.current_period_end,
      };
    } catch (error) {
      console.error("❌ Error canceling subscription:", error);
      throw new Error(`Subscription cancellation failed: ${error.message}`);
    }
  }

  // Get Plans
  static getPlans() {
    return STRIPE_CONFIG.plans;
  }

  // Verify Payment Intent
  static async verifyPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        created: paymentIntent.created,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      console.error("❌ Error verifying payment intent:", error);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  // Create Setup Intent for saving payment methods
  static async createSetupIntent(customerId, metadata = {}) {
    try {
      console.log("🔧 Creating setup intent for customer:", customerId);

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: {
          ...metadata,
          created_at: new Date().toISOString(),
        },
      });

      return {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
        status: setupIntent.status,
      };
    } catch (error) {
      console.error("❌ Error creating setup intent:", error);
      throw new Error(`Setup intent creation failed: ${error.message}`);
    }
  }

  // Attach payment method to customer
  static async attachPaymentMethod(paymentMethodId, customerId) {
    try {
      console.log("📎 Attaching payment method to customer:", {paymentMethodId, customerId});

      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      return {
        paymentMethodId: paymentMethod.id,
        status: 'attached',
      };
    } catch (error) {
      console.error("❌ Error attaching payment method:", error);
      throw new Error(`Payment method attachment failed: ${error.message}`);
    }
  }

  // Detach payment method from customer
  static async detachPaymentMethod(paymentMethodId) {
    try {
      console.log("🗑️ Detaching payment method:", paymentMethodId);

      const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);

      return {
        paymentMethodId: paymentMethod.id,
        status: 'detached',
      };
    } catch (error) {
      console.error("❌ Error detaching payment method:", error);
      throw new Error(`Payment method detachment failed: ${error.message}`);
    }
  }

  // Set default payment method for customer
  static async setDefaultPaymentMethod(customerId, paymentMethodId) {
    try {
      console.log("⭐ Setting default payment method:", {customerId, paymentMethodId});

      const customer = await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      return {
        customerId: customer.id,
        defaultPaymentMethod: paymentMethodId,
      };
    } catch (error) {
      console.error("❌ Error setting default payment method:", error);
      throw new Error(`Setting default payment method failed: ${error.message}`);
    }
  }

  // Get customer by email
  static async getCustomerByEmail(email) {
    try {
      console.log("🔍 Finding customer by email:", email);

      const customers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (customers.data.length === 0) {
        return null;
      }

      const customer = customers.data[0];
      return {
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        defaultPaymentMethod: customer.invoice_settings?.default_payment_method,
      };
    } catch (error) {
      console.error("❌ Error finding customer:", error);
      throw new Error(`Customer lookup failed: ${error.message}`);
    }
  }

  // Create Checkout Session
  static async createCheckoutSession(priceId, customerEmail, successUrl, cancelUrl, metadata = {}) {
    try {
      console.log("🛒 Creating checkout session:", {priceId, customerEmail});

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        mode: STRIPE_CONFIG.plans.monthly.priceId === priceId ? "subscription" : "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        metadata: {
          ...metadata,
          created_at: new Date().toISOString(),
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      console.error("❌ Error creating checkout session:", error);
      throw new Error(`Checkout session creation failed: ${error.message}`);
    }
  }
}

module.exports = StripeService;
