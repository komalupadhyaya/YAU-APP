# SMS API Integration Documentation

## Overview

The SMS API provides secure endpoints for sending SMS notifications to members during the registration process. It uses Twilio for SMS delivery and implements CSRF protection to ensure requests come from trusted sources.

## Security Features

- **CSRF Protection**: All SMS endpoints require a valid CSRF token
- **Origin Validation**: CSRF token generation validates request origin
- **Token Expiration**: CSRF tokens expire after 24 hours
- **Phone Number Validation**: Ensures international format (+country code)

## API Endpoints

### Get CSRF Token

**Endpoint**: `GET /csrf-token`

**Purpose**: Obtain a CSRF token for SMS API requests.

**Security**: Validates request origin against allowed domains.

**Response**:
```json
{
  "success": true,
  "csrfToken": "abc123def456..."
}
```

**Allowed Origins**:
- `https://members.yauapp.com`
- `https://yau-member-panel.web.app`
- `https://yau-member-panel.firebaseapp.com`
- `http://localhost:3000` (development)
- `http://localhost:3001` (development)

### Send SMS

**Endpoint**: `POST /sms/send`

**Purpose**: Send a single SMS message.

**Headers**:
```
x-csrf-token: <csrf-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "phoneNumber": "+1234567890",
  "messageType": "welcome" | "enrollment",
  "platform": "member" | "pickup"
}
```

**Parameters**:
- `phoneNumber`: Phone number in international format (must start with +)
- `messageType`: Either "welcome" or "enrollment" (for API consistency, doesn't affect message content)
- `platform`: **Required** - Either "member" (for member registration) or "pickup" (for pickup enrollment) - determines which message template is sent

**Response**:
```json
{
  "success": true,
  "message": "welcome SMS sent successfully",
  "phoneNumber": "+1234567890"
}
```

### Bulk SMS

**Endpoint**: `POST /sms/bulk`

**Purpose**: Send SMS to multiple phone numbers (max 10).

**Headers**:
```
x-csrf-token: <csrf-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "phoneNumbers": ["+1234567890", "+1987654321"],
  "messageType": "welcome",
  "platform": "member"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Bulk SMS completed: 2 sent, 0 failed",
  "results": {
    "sent": 2,
    "failed": 0,
    "details": {
      "successful": [
        {"phoneNumber": "+1234567890", "status": "sent"}
      ],
      "failed": []
    }
  }
}
```

## SMS Message Types & Platforms

### Platform-Based Messages

The SMS service supports different message templates based on the `platform` parameter. The system automatically selects the appropriate message based on the platform, regardless of the `messageType` parameter.

#### Member Platform (`platform: "member"`)
**Used for**: Member registration, account creation
**Message** (both "welcome" and "enrollment" types):
```
Welcome to YAUTeamUp! Your account has been created successfully. Access your member portal at [https://members.yauapp.com/]. Practice details and uniform information will be shared via email. Contact us at 800-293-0354 for any questions.
```

#### Pickup Platform (`platform: "pickup"`)
**Used for**: Pickup enrollment, event registration
**Message** (both "welcome" and "enrollment" types):
```
Thank you for registering your child for YAUTeamUp. Check your emails (Spam/Junk). Emails come from YAU TeamUp (Fun@YAUSports.org). If you have questions, please call us on 800-293-0354 10am-5pm EST
```

**Note**: The `messageType` parameter ("welcome" vs "enrollment") is maintained for API consistency but doesn't change the message content - the `platform` parameter determines which message template is used.

### Platform Logic

```javascript
// Platform determines message content
if (platform === 'member') {
  // Always sends: "Welcome to YAUTeamUp! Your account has been created..."
} else if (platform === 'pickup') {
  // Always sends: "Thank you for registering your child for YAUTeamUp..."
} else {
  // Default to member message
}
```

## Frontend Integration

### 1. Get CSRF Token

```javascript
const getCSRFToken = async () => {
  const response = await fetch('/csrf-token');
  const data = await response.json();
  if (data.success) {
    return data.csrfToken;
  }
  throw new Error('Failed to get CSRF token');
};
```

### 2. Send Welcome SMS

```javascript
import { APIClient } from '../firebase/ApiClient';

const sendWelcomeSMS = async (phoneNumber, platform = 'member') => {
  try {
    const csrfToken = await getCSRFToken();
    await APIClient.sendWelcomeSMS(phoneNumber, csrfToken, platform);
    console.log('Welcome SMS sent successfully');
  } catch (error) {
    console.error('Failed to send welcome SMS:', error);
  }
};
```

### 3. Registration Integration

The SMS sending is automatically integrated into the post-registration process in `src/firebase/apis/postRegistration.js`. After successful member creation, a welcome SMS is sent to the new member's phone number using `platform: "member"`.

### 4. Current Usage

- **Member Registration**: Automatically sends welcome message with `platform: "member"`
- **Future Pickup System**: Will use enrollment message with `platform: "pickup"`
- **Bulk Operations**: Admin can send bulk SMS with specified platform

## Backend Implementation

### Files Created/Modified

1. **CSRF Middleware**: `functions/src/middleware/csrf.js`
   - Token generation and validation
   - Origin checking
   - Token expiration (24 hours)

2. **SMS Controller**: `functions/src/controllers/smsController.js`
   - Single SMS sending with platform-based message selection
   - Bulk SMS sending with platform validation
   - Phone number and platform parameter validation

3. **SMS Routes**: `functions/src/routes/sms.js`
   - Route definitions with CSRF protection

4. **Main App**: `functions/index.js`
   - CSRF token endpoint
   - SMS routes registration

5. **Post-Registration**: `src/firebase/apis/postRegistration.js`
   - Automatic SMS sending after registration

6. **API Client**: `src/firebase/ApiClient.js`
   - SMS API methods

7. **API Config**: `src/firebase/config.js`
   - SMS endpoint configuration

## Environment Variables Required

```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_API_KEY=your_twilio_api_key  # Optional, for API key auth
TWILIO_API_SECRET=your_twilio_api_secret  # Optional, for API key auth
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number
```

## Error Handling

- **Invalid CSRF Token**: Returns 403 with "Invalid CSRF token"
- **Expired CSRF Token**: Returns 403 with "CSRF token expired"
- **Invalid Phone Number**: Returns 400 with validation message
- **Invalid Platform**: Returns 400 with "Invalid platform. Must be 'member' or 'pickup'"
- **Twilio Errors**: Logged but don't break the registration flow
- **Origin Not Allowed**: Returns 403 with "Request from unauthorized origin"

## Rate Limiting

- CSRF tokens are single-use (deleted after validation)
- No explicit rate limiting implemented (rely on Firebase Functions limits)
- Bulk SMS limited to 10 numbers per request

## Testing

### Local Development
```bash
# Start Firebase Functions locally
firebase serve --only functions

# Test CSRF token endpoint
curl http://localhost:5001/yau-app/us-central1/apis/csrf-token

# Test SMS endpoint (with CSRF token)
# Member registration SMS
curl -X POST http://localhost:5001/yau-app/us-central1/apis/sms/send \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: your-csrf-token" \
  -d '{"phoneNumber": "+1234567890", "messageType": "welcome", "platform": "member"}'

# Pickup enrollment SMS
curl -X POST http://localhost:5001/yau-app/us-central1/apis/sms/send \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: your-csrf-token" \
  -d '{"phoneNumber": "+1234567890", "messageType": "enrollment", "platform": "pickup"}'
```

### Production Testing
Replace `localhost:5001` with your production Firebase Functions URL.

## Security Considerations

1. **CSRF Protection**: Prevents cross-site request forgery attacks
2. **Origin Validation**: Ensures requests come from trusted domains
3. **Phone Number Validation**: Prevents invalid SMS sending
4. **Error Handling**: SMS failures don't break registration flow
5. **Environment Variables**: Sensitive Twilio credentials stored securely

## Monitoring

- SMS sending results are logged to Firebase Functions logs
- Failed SMS attempts are logged as warnings (don't fail registration)
- Successful SMS sends are logged with message SID for tracking

## Current Features ✅

- ✅ Platform-based message selection (member vs pickup)
- ✅ CSRF protection with token validation
- ✅ International phone number support with country codes
- ✅ Bulk SMS sending (up to 10 numbers)
- ✅ Automatic SMS sending after member registration
- ✅ Comprehensive error handling and logging

## Future Enhancements

- Add SMS delivery status tracking and webhooks
- Implement retry logic for failed SMS deliveries
- Add more platform types (events, tournaments, etc.)
- Rate limiting per user/phone number
- SMS analytics and reporting dashboard
- SMS template customization per organization