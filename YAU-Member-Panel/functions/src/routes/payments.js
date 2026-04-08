const express = require("express");
/* eslint-disable-next-line new-cap */
const router = express.Router();
const PaymentController = require("../controllers/paymentController");
const {validatePaymentRecord, validatePaymentUpdate} = require("../middleware/validation");

// Payment record routes
router.post("/create-payment-record", validatePaymentRecord, PaymentController.createPaymentRecord);
router.put("/update-status/:paymentHistoryId", validatePaymentUpdate, PaymentController.updatePaymentStatus);

// Payment history routes
router.get("/history/user/:userId", PaymentController.getUserPaymentHistory);
router.get("/history/email/:email", PaymentController.getPaymentHistoryByEmail);
router.get("/stats/:userId", PaymentController.getPaymentStats);

// Refund routes
router.post("/refund/:paymentHistoryId", PaymentController.recordRefund);

// Complete payment process (Stripe + Firestore)
router.post("/complete-payment", PaymentController.completePayment);

// Stripe webhook handler
router.post("/webhook", express.raw({type: "application/json"}), PaymentController.handleWebhook);

module.exports = router;
