const PaymentService = require("../services/paymentService");
const StripeService = require("../services/stripeService");
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
class PaymentController {
  // Create payment record in Firestore
  static async createPaymentRecord(req, res) {
    try {
      const {
        userId,
        userEmail,
        amount,
        currency,
        paymentMethod,
        planType,
        planName,
        paymentIntentId,
        subscriptionId,
        metadata,
      } = req.body;

      const paymentData = {
        userId,
        userEmail,
        amount: Math.round(amount), // Ensure integer
        currency: currency || "usd",
        paymentMethod: paymentMethod || "card",
        paymentStatus: "complete",
        planType,
        planName,
        paymentIntentId,
        subscriptionId,
        transactionType: planType === "monthly" ? "subscription" : "one_time",
        metadata: metadata || {},
        paymentDate: new Date(),
      };

      const result = await PaymentService.createPaymentRecord(paymentData);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Payment record creation error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Update payment status
  static async updatePaymentStatus(req, res) {
    try {
      const {paymentHistoryId} = req.params;
      const {paymentStatus, paymentIntentId, metadata} = req.body;

      if (!paymentHistoryId) {
        return res.status(400).json({
          success: false,
          error: "Payment history ID is required",
        });
      }

      // If payment is completed, verify with Stripe
      if (paymentStatus === "completed" && paymentIntentId) {
        try {
          const verification = await StripeService.verifyPaymentIntent(paymentIntentId);
          if (verification.status !== "succeeded") {
            throw new Error("Payment verification failed");
          }
        } catch (verifyError) {
          console.error("Payment verification failed:", verifyError);
          return res.status(400).json({
            success: false,
            error: "Payment verification failed",
          });
        }
      }

      const updateData = {
        paymentStatus,
        updatedAt: new Date(),
        ...(metadata && {metadata: {...metadata}}),
      };

      const result = await PaymentService.updatePaymentStatus(paymentHistoryId, updateData);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Payment status update error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get user payment history
  static async getUserPaymentHistory(req, res) {
    try {
      const {userId} = req.params;
      const {limit = 50} = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      const payments = await PaymentService.getUserPaymentHistory(userId, parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          payments,
          count: payments.length,
        },
      });
    } catch (error) {
      console.error("Get payment history error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get payment history by email
  static async getPaymentHistoryByEmail(req, res) {
    try {
      const {email} = req.params;
      const {limit = 50} = req.query;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: "Email is required",
        });
      }

      const payments = await PaymentService.getPaymentHistoryByEmail(email, parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          payments,
          count: payments.length,
        },
      });
    } catch (error) {
      console.error("Get payment history by email error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get payment statistics
  static async getPaymentStats(req, res) {
    try {
      const {userId} = req.params;

      // FIXED: Better validation and error handling
      if (!userId || userId === "undefined" || userId === "null") {
        return res.status(400).json({
          success: false,
          error: "Valid User ID is required",
        });
      }

      console.log("📊 Getting payment stats for userId:", userId); // Debug log

      const stats = await PaymentService.getPaymentStats(userId);

      // FIXED: Always return success with stats, even if empty
      res.status(200).json({
        success: true,
        data: stats || {
          totalPayments: 0,
          totalAmount: 0,
          successfulPayments: 0,
          pendingPayments: 0,
          failedPayments: 0,
          refundedPayments: 0,
          lastPaymentDate: null,
          paymentMethods: {},
          planTypes: {},
          recentPayments: 0,
        },
      });
    } catch (error) {
      console.error("Get payment stats error:", error);

      // FIXED: Return meaningful error response
      res.status(500).json({
        success: false,
        error: "Failed to fetch payment statistics",
        details: error.message,
      });
    }
  }


  // Record refund
  static async recordRefund(req, res) {
    try {
      const {paymentHistoryId} = req.params;
      const {refundAmount, refundReason, refundId} = req.body;

      if (!paymentHistoryId || !refundAmount || !refundId) {
        return res.status(400).json({
          success: false,
          error: "Payment history ID, refund amount, and refund ID are required",
        });
      }

      const refundData = {
        amount: refundAmount,
        reason: refundReason || "user_requested",
        refundId,
        refundDate: new Date(),
      };

      const result = await PaymentService.recordRefund(paymentHistoryId, refundData);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Record refund error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Complete payment process (Stripe + Firestore)
  static async completePayment(req, res) {
    try {
      const {
        amount,
        currency,
        userEmail,
        userName,
        planType,
        planName,
        metadata,
      } = req.body;

      console.log("💳 Starting complete payment process:", {
        amount,
        userEmail,
        planType,
      });

      // Step 1: Create customer in Stripe
      const customer = await StripeService.createCustomer(userEmail, userName, metadata);

      // CRITICAL FIX: Monthly memberships should create SUBSCRIPTIONS, not payment intents
      if (planType === 'monthly') {
        console.log("🔄 Monthly membership detected in completePayment - creating subscription instead of payment intent");
        
        // Get the monthly price ID from config
        const { STRIPE_CONFIG } = require("../config/stripe");
        const priceId = STRIPE_CONFIG.plans.monthly.priceId;
        
        if (!priceId || priceId === "price_monthly_xxx" || priceId === "price_monthly_test") {
          throw new Error("Monthly subscription price ID is not configured. Please set YAU_MONTHLY_PRICE environment variable.");
        }

        // Create subscription with quantity for multiple children
        const childrenCount = metadata?.childrenCount || 1;
        const subscriptionResult = await StripeService.createSubscription(
          customer.customerId,
          priceId,
          {
            ...metadata,
            userId: metadata?.userId,
            planType: 'monthly',
            userEmail,
            userName: userName || metadata?.userName || userEmail.split('@')[0],
            childrenCount,
            quantity: childrenCount, // Use quantity for multiple children
          }
        );

        // Create payment record with subscription ID
        const paymentRecord = await PaymentService.createPaymentRecord({
          userId: metadata?.userId || null,
          userEmail,
          amount,
          currency: currency || "usd",
          paymentMethod: "card",
          paymentStatus: subscriptionResult.status === 'active' ? "complete" : "pending", // incomplete subscriptions are pending
          planType,
          planName: planName || "Monthly Subscription",
          paymentIntentId: null, // Subscription uses invoice payment intent, not direct payment intent
          subscriptionId: subscriptionResult.subscriptionId,
          customerId: customer.customerId,
          transactionType: "subscription",
          metadata: {
            ...metadata,
            customer_new: customer.isNew,
            subscriptionStatus: subscriptionResult.status,
            quantity: subscriptionResult.quantity,
            childrenCount,
          },
          paymentDate: new Date(),
        });

        // Step 4: Update member record with customer ID (non-blocking)
        try {
          const MembershipService = require("../services/membershipService");
          const memberData = await MembershipService.findUserByEmail(userEmail);
          
          if (memberData) {
            await MembershipService.updateMemberData(userEmail, {
              stripeCustomerId: customer.customerId,
              updatedAt: new Date(),
            });
            console.log("✅ Member updated with customer ID");
          }
        } catch (updateError) {
          console.warn("⚠️ Failed to update member with customer ID:", updateError.message);
          // Don't fail the payment for this
        }

        return res.status(200).json({
          success: true,
          data: {
            ...subscriptionResult, // Includes: subscriptionId, clientSecret, status, quantity
            customerId: customer.customerId,
            paymentHistoryId: paymentRecord.paymentHistoryId,
            isNewCustomer: customer.isNew,
            isSubscription: true,
            planType: 'monthly',
            // Note: paymentIntentId is null for subscriptions (they use invoice payment intents)
          },
        });
      }

      // For non-monthly plans, create payment intent as before
      // Step 2: Create payment intent in Stripe
      const paymentIntent = await StripeService.createPaymentIntent(
          amount,
          currency,
          {
            ...metadata,
            customer_id: customer.customerId,
            plan_type: planType,
            user_email: userEmail,
          },
      );

      // Step 3: Create payment record in Firestore
      const paymentRecord = await PaymentService.createPaymentRecord({
        userId: metadata?.userId || null,
        userEmail,
        amount,
        currency: currency || "usd",
        paymentMethod: "card",
        paymentStatus: "complete",
        planType,
        planName,
        paymentIntentId: paymentIntent.paymentIntentId,
        customerId: customer.customerId,
        transactionType: planType === "monthly" ? "subscription" : "one_time",
        metadata: {
          ...metadata,
          customer_new: customer.isNew,
        },
        paymentDate: new Date(),
      });

      // Step 4: Update member record with customer ID (non-blocking)
      try {
        const MembershipService = require("../services/membershipService");
        const memberData = await MembershipService.findUserByEmail(userEmail);
        
        if (memberData) {
          await MembershipService.updateMemberData(userEmail, {
            stripeCustomerId: customer.customerId,
            updatedAt: new Date(),
          });
          console.log("✅ Member updated with customer ID");
        }
      } catch (updateError) {
        console.warn("⚠️ Failed to update member with customer ID:", updateError.message);
        // Don't fail the payment for this
      }

      res.status(200).json({
        success: true,
        data: {
          clientSecret: paymentIntent.clientSecret,
          paymentIntentId: paymentIntent.paymentIntentId,
          customerId: customer.customerId,
          paymentHistoryId: paymentRecord.paymentHistoryId,
          isNewCustomer: customer.isNew,
          isSubscription: false,
        },
      });
    } catch (error) {
      console.error("Complete payment error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Webhook handler for Stripe events with logging
  static async handleWebhook(req, res) {
    let webhookLogId = null;

    try {
      const sig = req.headers["stripe-signature"];
      const webhookSecret = STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("❌ Webhook secret not configured");
        return res.status(400).json({
          success: false,
          error: "Webhook not configured",
        });
      }

      // Verify webhook signature
      const event = require("stripe")(STRIPE_SECRET_KEY)
          .webhooks.constructEvent(req.body, sig, webhookSecret);

      console.log("🎣 Webhook received:", event.type);

      // Log webhook event
      webhookLogId = await PaymentService.logWebhookEvent(event, 'processing');

      // Handle different event types
      switch (event.type) {
        case "payment_intent.succeeded":
          await PaymentService.handlePaymentSuccess(event.data.object);
          break;

        case "payment_intent.payment_failed":
          await PaymentService.handlePaymentFailed(event.data.object);
          break;

        case "invoice.payment_succeeded":
          await PaymentService.handleSubscriptionPaymentSuccess(event.data.object);
          break;

        case "invoice.payment_failed":
          await PaymentService.handleInvoicePaymentFailed(event.data.object);
          break;

        case "customer.subscription.created":
          await PaymentService.handleSubscriptionCreated(event.data.object);
          break;

        case "customer.subscription.updated":
          await PaymentService.handleSubscriptionUpdated(event.data.object);
          break;

        case "customer.subscription.deleted":
          await PaymentService.handleSubscriptionCanceled(event.data.object);
          break;

        default:
          console.log(`⚠️ Unhandled event type: ${event.type}`);
      }

      // Update webhook log as successful
      if (webhookLogId) {
        await PaymentService.updateWebhookLog(webhookLogId, 'completed', null);
      }

      res.status(200).json({received: true});
    } catch (error) {
      console.error("❌ Webhook error:", error);

      // Update webhook log as failed
      if (webhookLogId) {
        await PaymentService.updateWebhookLog(webhookLogId, 'failed', error.message);
      }

      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = PaymentController;
