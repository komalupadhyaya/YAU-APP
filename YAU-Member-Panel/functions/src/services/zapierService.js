const axios = require('axios');

const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;

exports.sendEnrollmentToZapier = async (enrollmentData) => {
  if (!ZAPIER_WEBHOOK_URL) {
    console.warn("ZAPIER_WEBHOOK_URL is not configured. Skipping Zapier integration.");
    return;
  }

  try {
    await axios.post(ZAPIER_WEBHOOK_URL, enrollmentData);
    console.log("Enrollment data sent to Zapier successfully.");
  } catch (error) {
    console.error("Error sending enrollment data to Zapier:", error.message);
    // Depending on your requirements, you might want to re-throw the error
    // or handle it more gracefully without blocking the main enrollment process.
  }
};
