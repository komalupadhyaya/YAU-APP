const express = require("express");
/* eslint-disable-next-line new-cap */
const router = express.Router();
const StripeController = require("../controllers/stripecontroller");
const {validatePaymentIntent, validateCustomer} = require("../middleware/validation");

// Payment Intent routes
router.post("/create-payment-intent", validatePaymentIntent, StripeController.createPaymentIntent);
router.get("/verify-payment/:paymentIntentId", StripeController.verifyPayment);

// Customer routes
router.post("/create-customer", validateCustomer, StripeController.createCustomer);
router.get("/customer-by-email/:email", StripeController.getCustomerByEmail);
router.get("/payment-methods/:customerId", StripeController.getPaymentMethods);

// Payment Method Management
router.post("/create-setup-intent", StripeController.createSetupIntent);
router.post("/attach-payment-method", StripeController.attachPaymentMethod);
router.delete("/detach-payment-method/:paymentMethodId", StripeController.detachPaymentMethod);
router.post("/set-default-payment-method", StripeController.setDefaultPaymentMethod);

// Subscription routes
router.post("/create-subscription", StripeController.createSubscription);
router.post("/cancel-subscription", StripeController.cancelSubscription);

// Checkout session
router.post("/create-checkout-session", StripeController.createCheckoutSession);

// Plans
router.get("/plans", StripeController.getPlans);

module.exports = router;
