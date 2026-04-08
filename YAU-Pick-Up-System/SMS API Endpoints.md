# SMS API Endpoints & Payload Guide

## Base URL
```
https://us-central1-yau-app.cloudfunctions.net/apis
```

---

## 1. Send Single SMS

### Endpoint
```
POST /sms/send
```

### Headers
| Header | Value | Required |
|--------|-------|----------|
| Content-Type | application/json | Yes |
| X-CSRF-Token | your_csrf_token | Yes |

### Request Payload
```json
{
  "phoneNumber": "+1234567890",
  "messageType": "enrollment",
  "platform": "pickup"
}
```

### Payload Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phoneNumber | string | Yes | Phone number with country code (e.g., +1234567890) |
| messageType | string | No | Type of message: "enrollment" or "welcome" (default: "enrollment") |
| platform | string | No | Platform type: "pickup" or "member" (default: "member") |

### Sample cURL Request
```bash
curl -X POST https://us-central1-yau-app.cloudfunctions.net/apis/sms/send \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: your_csrf_token_here" \
  -d '{
    "phoneNumber": "+1234567890",
    "messageType": "enrollment",
    "platform": "pickup"
  }'
```

### Success Response (200)
```json
{
  "success": true,
  "message": "enrollment SMS sent successfully",
  "phoneNumber": "+1234567890",
  "sid": "SM1234567890abcdef"
}
```

### Error Response (400)
```json
{
  "success": false,
  "error": "Phone number is required"
}
```

### Error Response (500)
```json
{
  "success": false,
  "error": "Failed to send SMS",
  "details": "Invalid phone number format"
}
```

---

## 2. Send Bulk SMS

### Endpoint
```
POST /sms/bulk
```

### Headers
| Header | Value | Required |
|--------|-------|----------|
| Content-Type | application/json | Yes |
| X-CSRF-Token | your_csrf_token | Yes |

### Request Payload
```json
{
  "phoneNumbers": ["+1234567890", "+1987654321"],
  "messageType": "welcome",
  "platform": "member"
}
```

### Payload Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phoneNumbers | array | Yes | Array of phone numbers with country code (max 10) |
| messageType | string | No | Type of message: "enrollment" or "welcome" (default: "enrollment") |
| platform | string | No | Platform type: "pickup" or "member" (default: "member") |

### Sample cURL Request
```bash
curl -X POST https://us-central1-yau-app.cloudfunctions.net/apis/sms/bulk \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: your_csrf_token_here" \
  -d '{
    "phoneNumbers": ["+1234567890", "+1987654321"],
    "messageType": "welcome",
    "platform": "member"
  }'
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Bulk SMS completed: 2 sent, 0 failed",
  "results": {
    "sent": 2,
    "failed": 0,
    "details": {
      "successful": [
        { "phoneNumber": "+1234567890", "status": "sent" },
        { "phoneNumber": "+1987654321", "status": "sent" }
      ],
      "failed": []
    }
  }
}
```

### Error Response (400)
```json
{
  "success": false,
  "error": "Maximum 10 phone numbers allowed for bulk SMS"
}
```

---

## 3. Get CSRF Token

### Endpoint
```
GET /csrf-token
```

### Sample cURL Request
```bash
curl -X GET https://us-central1-yau-app.cloudfunctions.net/apis/csrf-token
```

### Success Response (200)
```json
{
  "success": true,
  "csrfToken": "abc123xyz789"
}
```

---

## Message Types

### Enrollment Message (pickup platform)
```
Thank you for registering your child for YAUTeamUp. Check your emails (Spam/Junk). Emails come from YAU TeamUp (Fun@YAUSports.org). If you have questions, please call us on 800-293-0354 10am-5pm EST
```

### Welcome Message (member platform)
```
Welcome to YAUTeamUp! Your account has been created successfully. Access your member portal at [https://members.yauapp.com/]. Practice details and uniform information will be shared via email. Contact us at 800-293-0354 for any questions.
```

---

## Phone Number Format

### Valid Formats
| Format | Example | Valid |
|--------|---------|-------|
| E.164 with + | +1234567890 | ✅ Yes |
| E.164 with + | +919876543210 | ✅ Yes |
| Without + | 1234567890 | ❌ No |
| With dashes | 123-456-7890 | ❌ No |

### Phone Number Validation Rules
1. Must start with `+` (country code)
2. Must be at least 10 digits (excluding +)
3. No spaces, dashes, or parentheses allowed

---

## JavaScript/TypeScript Examples

### Send Single SMS
```javascript
async function sendSMS(phoneNumber, csrfToken) {
  const response = await fetch('https://us-central1-yau-app.cloudfunctions.net/apis/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({
      phoneNumber: phoneNumber,
      messageType: 'enrollment',
      platform: 'pickup'
    })
  });
  
  const data = await response.json();
  return data;
}

// Usage
const result = await sendSMS('+1234567890', 'your_csrf_token');
console.log(result);
```

### Send Bulk SMS
```javascript
async function sendBulkSMS(phoneNumbers, csrfToken) {
  const response = await fetch('https://us-central1-yau-app.cloudfunctions.net/apis/sms/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({
      phoneNumbers: phoneNumbers,
      messageType: 'welcome',
      platform: 'member'
    })
  });
  
  const data = await response.json();
  return data;
}

// Usage
const result = await sendBulkSMS(['+1234567890', '+1987654321'], 'your_csrf_token');
console.log(result);
```

### Get CSRF Token
```javascript
async function getCSRFToken() {
  const response = await fetch('https://us-central1-yau-app.cloudfunctions.net/apis/csrf-token');
  const data = await response.json();
  return data.csrfToken;
}

// Usage
const token = await getCSRFToken();
```

---

## Error Codes

| HTTP Code | Error | Description |
|-----------|-------|-------------|
| 400 | Phone number is required | Missing phoneNumber field |
| 400 | Phone number must include country code | Number doesn't start with + |
| 400 | Invalid platform | Platform must be "member" or "pickup" |
| 400 | Invalid message type | Message type must be "enrollment" or "welcome" |
| 400 | Maximum 10 phone numbers allowed | Bulk SMS limit exceeded |
| 401 | Invalid CSRF token | CSRF token is missing or invalid |
| 500 | Failed to send SMS | Twilio service error |

---

## Integration in Enrollment Flow

### Frontend Integration Example
```typescript
// After successful enrollment submission
async function sendWelcomeSMS(phoneNumber: string) {
  try {
    // Get CSRF token
    const csrfResponse = await fetch('https://us-central1-yau-app.cloudfunctions.net/apis/csrf-token');
    const { csrfToken } = await csrfResponse.json();
    
    // Send SMS
    const response = await fetch('https://us-central1-yau-app.cloudfunctions.net/apis/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber,
        messageType: 'enrollment',
        platform: 'pickup'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ SMS sent successfully:', result.sid);
    } else {
      console.error('❌ SMS failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error sending SMS:', error);
  }
}
```

---

## Backend Integration (Pickup Enrollment)

### Enable SMS in Pickup Enrollment Controller

File: `membergit/functions/src/controllers/pickupEnrollmentController.js`

```javascript
const TwilioService = require("../services/twilioService");

exports.submitEnrollment = async (req, res) => {
  try {
    const meta = {
      source: "pickup.yauapp.com",
      ip: req.headers["x-forwarded-for"] || req.ip || null,
      userAgent: req.headers["user-agent"] || null,
    };

    const result = await PickupEnrollmentService.createEnrollmentAndStudents(req.body || {}, meta);

    // Send SMS confirmation to the parent
    await TwilioService.sendEnrollmentSMS(req.body.mobileNumber, 'pickup');

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Error submitting pickup enrollment:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};
```
