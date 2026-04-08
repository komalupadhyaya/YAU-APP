const cors = require("cors");

const corsOptions = {
  origin: true, // Allow all origins for debugging
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-requested-with",
    "x-admin-id",
    "x-username",
    "x-csrf-token",
    "x-app-check-token"
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = cors(corsOptions);
