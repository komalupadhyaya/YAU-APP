const admin = require("firebase-admin");
const express = require("express");
const helmet = require("helmet");
const cors = require('cors');

// Load environment variables for local development
require('dotenv').config();

// Using .env file approach for both local and deployment

// Safe environment helper
const getEnvVar = (key, defaultValue = null) => {
  try {
    if (process && process.env && process.env[key]) {
      return process.env[key];
    }
    return defaultValue;
  } catch (error) {
    console.warn(`Could not access config for ${key}:`, error.message);
    return defaultValue;
  }
};

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  try {
    const serviceAccount = require('/etc/secrets/serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Initialized Firebase Admin with Service Account from /etc/secrets');
  } catch (e) {
    console.warn('⚠️ /etc/secrets/serviceAccountKey.json not found or invalid. Falling back to default initialization.', e.message);
    admin.initializeApp();
  }
}

const app = express();

// DEBUT LOGGING - VERY FIRST THING
// Use standard CORS package for maximum robustness
app.use(cors({
  origin: true, // Echoes the origin from the request
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-admin-id', 'x-username', 'x-csrf-token', 'x-app-check-token'],
  credentials: true,
  maxAge: 86400
}));

// DEBUT LOGGING - After CORS but before logic
app.use((req, res, next) => {
  console.log(`📩 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.headers.origin) {
    console.log(`🌐 Origin: ${req.headers.origin}`);
  }
  next();
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

// WEBHOOK ROUTE MUST BE BEFORE express.json()
app.post("/webhook", express.raw({type: "application/json"}), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const {stripe} = require("./src/config/stripe");
  const PaymentService = require("./src/services/paymentService");

  if (!stripe) {
    return res.status(500).json({error: "Stripe is not initialized due to missing secret key"});
  }

  let event;
  try {
    const webhookSecret = getEnvVar("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return res.status(500).json({error: "Webhook not configured"});
    }

    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await PaymentService.handlePaymentSuccess(event.data.object);
        break;
      case "invoice.payment_succeeded":
        await PaymentService.handleSubscriptionPaymentSuccess(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await PaymentService.handlePaymentFailed(event.data.object);
        break;
      case "customer.subscription.deleted":
        await PaymentService.handleSubscriptionCanceled(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    res.json({received: true});
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({error: "Webhook processing failed"});
  }
});

// Body parsing middleware
app.use(express.json({limit: "10mb"}));
app.use(express.urlencoded({extended: true}));

// Log body for debugging POST/PUT requests
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    console.log(`📦 Body:`, JSON.stringify(req.body));
  }
  next();
});

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "YAU API is running!",
    timestamp: new Date().toISOString(),
    environment: "production",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    firebase: admin.apps.length > 0 ? "initialized" : "not initialized",
  });
});
// Add this middleware to your Express app
app.get("/debug-test", (req, res) => {
  res.json({ success: true, message: "Server is reachable!" });
});

app.use((req, res, next) => {
  // Disable caching for dynamic content
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// For static assets, add versioning
app.use('/static', express.static('static', {
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  }
}));



app.get("/test-stripe", async (req, res) => {
  try {
    const {stripe} = require("./src/config/stripe");
    const balance = await stripe.balance.retrieve();

    res.json({
      success: true,
      message: "Stripe connection working!",
      data: {
        available: balance.available,
        pending: balance.pending,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Import routes - ALL FROM src/routes/
const stripeRoutes = require("./src/routes/stripe");
const paymentRoutes = require("./src/routes/payments");
const membershipRoutes = require("./src/routes/membership");
const coachRoutes = require("./src/routes/coaches");
const locationRoutes = require("./src/routes/locations");
const memberRoutes = require("./src/routes/members");
const parentRoutes = require("./src/routes/parents");
const rosterRoutes = require("./src/routes/rosters");
const communityRoutes = require("./src/routes/community");
const messageRoutes = require("./src/routes/messages");
const eventRoutes = require("./src/routes/events");
const gameScheduleRoutes = require("./src/routes/gameSchedule");
const uploadRouter= require("./src/routes/upload");
const authRouter= require("./src/routes/auth");
const adminRoutes = require('./src/routes/admin');
const resourceRoutes = require('./src/routes/resources');
const supportRoutes = require('./src/routes/support');
const uniformRoutes = require('./src/routes/uniforms');
const childIdRoutes = require('./src/routes/childIds');
const teamMessagesRoutes = require('./src/routes/teamMessages');
const rosterTeamChatsRoutes = require('./src/routes/rosterTeamChats');
const groupChatRoutes = require('./src/routes/groupChats');
const referralRoutes = require('./src/routes/referrals');
const externalSchedulesRoutes = require('./src/routes/externalSchedule');
const organizationRoutes = require('./src/routes/orgRoutes');
const timesheetRoutes = require('./src/routes/timesheetRoutes');
const adminTimesheetRoutes = require('./src/routes/adminTimesheetRoutes');
const constantContactRoutes = require('./src/routes/constantContactRoutes');
const forgotPasswordRoutes = require('./src/routes/forgotPasswordRoutes.js');
const pickupRoutes = require("./src/routes/pickup");
const smsRoutes = require("./src/routes/sms");
const coachAssignmentsRoutes = require("./src/routes/coachAssignmentsRoutes");
const CoachAssignmentsController = require('./src/controllers/coachAssignmentsController');

// CSRF token endpoint (public)
app.get("/csrf-token", require("./src/middleware/csrf").getCSRFToken);

// API routes
// MOVED TO TOP OF API ROUTES FOR PRIORITY
app.post('/admin/coach-assignments/notify', CoachAssignmentsController.sendNotification);
app.post('/debug-notify', (req, res) => {
  console.log('📩 DEBUG-NOTIFY received:', req.body);
  res.json({ success: true, message: "Debug notify reached!" });
});

app.use('/admins', adminRoutes);
app.use("/auth", authRouter);
app.use("/stripe", stripeRoutes);
app.use("/payments", paymentRoutes);
app.use("/membership", membershipRoutes);
app.use("/locations", locationRoutes);
app.use("/members", memberRoutes);
app.use("/parents", parentRoutes);
app.use("/coaches", coachRoutes);
app.use("/rosters", rosterRoutes);
app.use("/community", communityRoutes);
app.use("/messages", messageRoutes);
app.use("/events", eventRoutes);
app.use("/game-schedules", gameScheduleRoutes);
app.use("/upload", uploadRouter);
app.use('/resources', resourceRoutes);
app.use('/support', supportRoutes);
app.use('/uniforms', uniformRoutes);
app.use('/child-ids', childIdRoutes);
app.use('/team-messages', teamMessagesRoutes);
app.use('/chats', rosterTeamChatsRoutes);
app.use('/group-chats', groupChatRoutes);
app.use('/referrals', referralRoutes);
app.use('/external_schedules', externalSchedulesRoutes);
app.use('/organization', organizationRoutes);
app.use('/timesheets', timesheetRoutes);
app.use('/adminTimesheetRoutes', adminTimesheetRoutes);
app.use('/constant-contact', constantContactRoutes);
app.use('/forgot-password',forgotPasswordRoutes)
app.use("/pickup", pickupRoutes);
app.use('/sms', smsRoutes);
// MOVED UP app.use('/admin/coach-assignments', coachAssignmentsRoutes);

// Error handling
app.use((error, req, res, _next) => {
  console.error("Global error handler:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
