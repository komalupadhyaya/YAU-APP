// server/api/send-fcm-notification.js
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (do this once in your app)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // or use service account key
    // credential: admin.credential.cert(serviceAccount),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { tokens, payload } = req.body;

  try {
    const message = {
      notification: payload.notification,
      data: payload.data,
      android: payload.android,
      apns: payload.apns,
      webpush: payload.webpush,
      tokens: tokens // For multicast
    };

    const response = await admin.messaging().sendMulticast(message);
    
    console.log(`Successfully sent ${response.successCount} messages`);
    
    // Handle failed tokens
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Failed to send to token ${tokens[idx]}:`, resp.error);
        }
      });
    }

    res.status(200).json({
      successCount: response.successCount,
      failureCount: response.failureCount
    });

  } catch (error) {
    console.error('Error sending FCM message:', error);
    res.status(500).json({ error: error.message });
  }
}
