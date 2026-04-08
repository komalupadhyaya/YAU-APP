# Twilio SMS Integration Guide for YAU Coach Pickup System

## Overview
This guide explains how Twilio SMS integration works for member registration in the YAU Coach Pickup System.

## Current Implementation

### Backend (membergit/functions)

The Twilio SMS functionality is already implemented in the membergit Firebase Functions.

#### 1. Service Layer
**File:** `membergit/functions/src/services/twilioService.js`

The service provides two main functions:
- `sendEnrollmentSMS(phoneNumber, platform)` - Sends enrollment confirmation SMS
- `sendMemberWelcomeSMS(phoneNumber, platform)` - Sends welcome SMS

**Platform-specific messages:**
- `pickup`: "Thank you for registering your child for YAUTeamUp. Check your emails (Spam/Junk). Emails come from YAU TeamUp (Fun@YAUSports.org). If you have questions, please call us on 800-293-0354 10am-5pm EST"
- `member`: "Welcome to YAUTeamUp! Your account has been created successfully. Access your member portal at [https://members.yauapp.com/]. Practice details and uniform information will be shared via email. Contact us at 800-293-0354 for any questions."

#### 2. Controller Layer
**File:** `membergit/functions/src/controllers/smsController.js`

Provides endpoints:
- `POST /sms/send` - Send single SMS
- `POST /sms/bulk` - Send bulk SMS (max 10 numbers)

**Request body for single SMS:**
```json
{
  "phoneNumber": "+1234567890",
  "messageType": "enrollment",  // or "welcome"
  "platform": "pickup"          // or "member"
}
```

#### 3. Pickup Enrollment Integration
**File:** `membergit/functions/src/controllers/pickupEnrollmentController.js`

The Twilio service is already imported and ready to use:
```javascript
const TwilioService = require("../services/twilioService");
```

**To enable SMS on enrollment, uncomment line 19:**
```javascript
// Send SMS confirmation to the parent
await TwilioService.sendEnrollmentSMS(req.body.mobileNumber, 'pickup');
```

### Environment Variables

Add these to `membergit/functions/.env`:
```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_API_KEY=your_api_key_here
TWILIO_API_SECRET=your_api_secret_here
TWILIO_PHONE_NUMBER=+1234567890
```

### API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/sms/send` | Send single SMS | CSRF Token |
| POST | `/sms/bulk` | Send bulk SMS (max 10) | CSRF Token |

### Frontend Integration (Pickup System)

**File:** `yau-coach-pickup-system/src/pages/EnrollmentPage.tsx`

The enrollment page already sends a welcome SMS after successful submission (lines 461-470):

```typescript
// Send welcome SMS
try {
  const { APIClient } = await import("../firebase/ApiClient");
  const csrfToken = await APIClient.getCSRFToken();
  await APIClient.sendWelcomeSMS(fullPhoneNumber, csrfToken, "pickup");
  console.log("✅ Welcome SMS sent successfully");
} catch (smsError) {
  console.warn("⚠️ Failed to send welcome SMS:", smsError);
  // Don't fail the whole submission if SMS fails
}
```

## How to Enable SMS for Pickup Enrollments

### Option 1: Enable SMS in Backend Controller (Recommended)

1. Open `membergit/functions/src/controllers/pickupEnrollmentController.js`
2. Uncomment line 19:
   ```javascript
   await TwilioService.sendEnrollmentSMS(req.body.mobileNumber, 'pickup');
   ```
3. Deploy the functions:
   ```bash
   cd membergit/functions
   firebase deploy --only functions
   ```

### Option 2: Use Frontend-Only SMS (Current Implementation)

The frontend already calls the SMS endpoint after successful enrollment. No changes needed.

## Testing the Integration

### 1. Test SMS Endpoint Directly

```bash
curl -X POST https://your-api-url/sms/send \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: your_csrf_token" \
  -d '{
    "phoneNumber": "+1234567890",
    "messageType": "enrollment",
    "platform": "pickup"
  }'
```

### 2. Test via Frontend

1. Complete the enrollment form
2. Submit the form
3. Check the browser console for SMS success/failure messages
4. Verify SMS is received on the provided phone number

## Phone Number Format

**Important:** Phone numbers must include the country code:
- ✅ Valid: `+1234567890` (US)
- ✅ Valid: `+919876543210` (India)
- ❌ Invalid: `234567890` (missing country code)
- ❌ Invalid: `123-456-7890` (dashes not allowed in API)

The frontend in `EnrollmentPage.tsx` already formats the phone number correctly:
```typescript
const fullPhoneNumber = `${selectedCountry.code}${mobileNumber.replace(/\D/g, "")}`;
// Result: +1234567890
```

## Error Handling

The SMS sending is designed to be non-blocking:
- If SMS fails, the enrollment still succeeds
- Errors are logged to console
- User is not notified of SMS failures

## Security Considerations

1. **CSRF Protection:** All SMS endpoints require a valid CSRF token
2. **Rate Limiting:** Consider adding rate limiting for SMS endpoints
3. **Phone Validation:** Phone numbers are validated to include country code
4. **Environment Variables:** Twilio credentials are stored in environment variables, never in code

## Troubleshooting

### SMS Not Sending

1. Check Twilio credentials are set correctly
2. Verify phone number includes country code (+)
3. Check Twilio console for delivery logs
4. Ensure Twilio phone number is valid and active

### CSRF Token Errors

1. Get a fresh CSRF token from `/csrf-token` endpoint
2. Include token in header: `X-CSRF-Token: your_token`

### Twilio Credentials Not Working

1. Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are correct
2. Check `TWILIO_PHONE_NUMBER` is a valid Twilio number
3. Ensure account has sufficient balance

## Deployment Checklist

- [ ] Set all Twilio environment variables in Firebase Functions
- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Test SMS endpoint with curl/Postman
- [ ] Complete a test enrollment and verify SMS is received
- [ ] Check error logs in Firebase Console

## Related Files

| File | Purpose |
|------|---------|
| `membergit/functions/src/services/twilioService.js` | Twilio service implementation |
| `membergit/functions/src/controllers/smsController.js` | SMS API endpoints |
| `membergit/functions/src/routes/sms.js` | SMS route definitions |
| `membergit/functions/src/controllers/pickupEnrollmentController.js` | Pickup enrollment with SMS |
| `yau-coach-pickup-system/src/pages/EnrollmentPage.tsx` | Frontend enrollment form |
| `yau-coach-pickup-system/src/firebase/ApiClient.ts` | API client with SMS methods |
