// const {stripe} = require("../config/stripe"); // Removed unused import
const StripeService = require("../services/stripeService");

class StripeController {
  // Create Payment Intent
// Create Payment Intent with Child ID saved card check
  static createPaymentIntent = async (req, res) => {
    try {
      const {amount, currency = "usd", planType, userEmail, userId, metadata = {}} = req.body;

      console.log("💳 Creating payment intent:", {amount, currency, planType, userEmail});

      // CRITICAL FIX: Monthly memberships should create SUBSCRIPTIONS, not payment intents
      if (planType === 'monthly') {
        console.log("🔄 Monthly membership detected - creating subscription instead of payment intent");
        
        // Get or create customer first
        const customer = await StripeService.createCustomer(
          userEmail,
          metadata.userName || userEmail.split('@')[0],
          {
            ...metadata,
            userId,
            planType: 'monthly',
          }
        );

        // Get the monthly price ID from config
        const { STRIPE_CONFIG } = require("../config/stripe");
        const priceId = STRIPE_CONFIG.plans.monthly.priceId;
        
        if (!priceId || priceId === "price_monthly_xxx" || priceId === "price_monthly_test") {
          throw new Error("Monthly subscription price ID is not configured. Please set YAU_MONTHLY_PRICE environment variable.");
        }

        // Create subscription with quantity for multiple children
        const childrenCount = metadata.childrenCount || 1;
        const subscriptionResult = await StripeService.createSubscription(
          customer.customerId,
          priceId,
          {
            ...metadata,
            userId,
            planType: 'monthly',
            userEmail,
            userName: metadata.userName,
            childrenCount,
            quantity: childrenCount, // Use quantity for multiple children
          }
        );

        return res.json({
          success: true,
          data: {
            ...subscriptionResult,
            customerId: customer.customerId,
            isSubscription: true,
            planType: 'monthly',
          },
        });
      }

      // Check if this is a Child ID payment - use saved card check
      let result;
      if (planType === 'childId' || metadata.isChildId) {
        console.log("🆔 Child ID payment detected - checking for saved cards");
        result = await StripeService.createPaymentIntentWithSavedCard(amount, currency, {
          planType,
          userEmail,
          userName: metadata.userName,
          userId,
          childrenCount: metadata.childrenCount,
          childName: metadata.childName,
          ...metadata,
        });
      } else {
        // Use regular payment intent for one-time membership payments
        result = await StripeService.createPaymentIntent(amount, currency, {
          planType,
          userEmail,
          userName: metadata.userName,
          userId,
          childrenCount: metadata.childrenCount,
          ...metadata,
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Error creating payment intent:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };


  // Create Customer
  static async createCustomer(req, res) {
    try {
      const {email, name, metadata} = req.body;

      const result = await StripeService.createCustomer(email, name, metadata);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Create Subscription
  static async createSubscription(req, res) {
    try {
      const {customerId, priceId, metadata} = req.body;

      if (!customerId || !priceId) {
        return res.status(400).json({
          success: false,
          error: "Customer ID and Price ID are required",
        });
      }

      const result = await StripeService.createSubscription(customerId, priceId, metadata);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get Payment Methods
  static async getPaymentMethods(req, res) {
    try {
      const {customerId} = req.params;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: "Customer ID is required",
        });
      }

      const result = await StripeService.getPaymentMethods(customerId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Cancel Subscription
  static async cancelSubscription(req, res) {
    try {
      const {subscriptionId} = req.body;
      const {reason} = req.body;

      if (!subscriptionId) {
        return res.status(400).json({
          success: false,
          error: "Subscription ID is required",
        });
      }

      const result = await StripeService.cancelSubscription(subscriptionId, reason);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get Plans
  static async getPlans(req, res) {
    try {
      const plans = StripeService.getPlans();

      res.status(200).json({
        success: true,
        data: {plans},
      });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Verify Payment
  static async verifyPayment(req, res) {
    try {
      const {paymentIntentId} = req.params;

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          error: "Payment Intent ID is required",
        });
      }

      const result = await StripeService.verifyPaymentIntent(paymentIntentId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Create Setup Intent
  static async createSetupIntent(req, res) {
    try {
      const { customerId, metadata } = req.body;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: "Customer ID is required",
        });
      }

      const result = await StripeService.createSetupIntent(customerId, metadata);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Attach Payment Method
  static async attachPaymentMethod(req, res) {
    try {
      const { paymentMethodId, customerId } = req.body;

      if (!paymentMethodId || !customerId) {
        return res.status(400).json({
          success: false,
          error: "Payment Method ID and Customer ID are required",
        });
      }

      const result = await StripeService.attachPaymentMethod(paymentMethodId, customerId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Detach Payment Method
  static async detachPaymentMethod(req, res) {
    try {
      const { paymentMethodId } = req.params;

      if (!paymentMethodId) {
        return res.status(400).json({
          success: false,
          error: "Payment Method ID is required",
        });
      }

      const result = await StripeService.detachPaymentMethod(paymentMethodId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Set Default Payment Method
  static async setDefaultPaymentMethod(req, res) {
    try {
      const { customerId, paymentMethodId } = req.body;

      if (!customerId || !paymentMethodId) {
        return res.status(400).json({
          success: false,
          error: "Customer ID and Payment Method ID are required",
        });
      }

      const result = await StripeService.setDefaultPaymentMethod(customerId, paymentMethodId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get Customer by Email
  static async getCustomerByEmail(req, res) {
    try {
      const { email } = req.params;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: "Email is required",
        });
      }

      const result = await StripeService.getCustomerByEmail(email);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Create Checkout Session
  static async createCheckoutSession(req, res) {
    try {
      const {
        priceId,
        customerEmail,
        successUrl,
        cancelUrl,
        metadata,
      } = req.body;

      if (!priceId || !customerEmail || !successUrl || !cancelUrl) {
        return res.status(400).json({
          success: false,
          error: "Price ID, customer email, success URL, and cancel URL are required",
        });
      }

      const result = await StripeService.createCheckoutSession(
          priceId,
          customerEmail,
          successUrl,
          cancelUrl,
          metadata,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Controller error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = StripeController;
