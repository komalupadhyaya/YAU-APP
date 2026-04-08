const PickupEnrollmentService = require("../services/pickupEnrollmentService");
const ZapierService = require("../services/zapierService"); // Add this line
const TwilioService = require("../services/twilioService"); // Add this line

exports.submitEnrollment = async (req, res) => {
  try {
    const meta = {
      source: "pickup.yauapp.com",
      ip: req.headers["x-forwarded-for"] || req.ip || null,
      userAgent: req.headers["user-agent"] || null,
    };

    const result = await PickupEnrollmentService.createEnrollmentAndStudents(req.body || {}, meta);

    // After successful enrollment, send data to Zapier
    await ZapierService.sendEnrollmentToZapier(req.body); // Add this line

    // Send SMS confirmation to the parent ONLY if they opted in (receiveMessages === true)
    // This respects the parent's consent for SMS/text messages
    const receiveMessages = req.body?.receiveMessages === true;
    if (receiveMessages && req.body?.mobileNumber) {
      try {
        await TwilioService.sendEnrollmentSMS(req.body.mobileNumber, "pickup");
        console.log("✅ Pickup enrollment SMS sent successfully.");
      } catch (smsError) {
        console.error("❌ Failed to send pickup enrollment SMS:", smsError.message);
        // Continue - SMS failure should not fail the enrollment
      }
    }

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Error submitting pickup enrollment:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.listEnrollments = async (req, res) => {
  try {
    const items = await PickupEnrollmentService.listEnrollments({
      limit: req.query.limit,
    });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error("Error listing pickup enrollments:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getEnrollmentById = async (req, res) => {
  try {
    const item = await PickupEnrollmentService.getEnrollmentById(req.params.enrollmentId);
    if (!item) return res.status(404).json({ success: false, error: "Enrollment not found" });
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error("Error getting pickup enrollment:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

