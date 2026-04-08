# 🔗 Referral System API Documentation

## 📋 Base URL
```
Development: http://127.0.0.1:5001/yau-app/us-central1/apis
Production: https://us-central1-yau-app.cloudfunctions.net/apis
```

## 🎯 API Endpoints

### 1. Create Referral
**POST** `/api/referrals/create`

Create a new referral link or send an invite.

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "senderId": "user123",
  "senderName": "John Doe",
  "senderEmail": "john@example.com",
  "source": "email", // "email", "sms", or "link"
  "recipientEmail": "friend@example.com", // Required for email
  "recipientPhone": "+1234567890", // Required for SMS
  "recipientName": "Jane Smith", // Optional
  "campaign": "summer2024" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "invite_123456",
    "referralCode": "JOH-R-ABC123",
    "senderId": "user123",
    "senderName": "John Doe",
    "senderEmail": "john@example.com",
    "recipientEmail": "friend@example.com",
    "source": "email",
    "status": "sent",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "trackingUrl": "https://yauapp.com/join?ref=JOH-R-ABC123",
    "metadata": {
      "campaign": "summer2024"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or invalid source
- `400 Bad Request` - Rate limit exceeded
- `401 Unauthorized` - Invalid or missing token

---

### 2. Get Referral by Code
**GET** `/api/referrals/:referralCode`

Get referral details by referral code.

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Parameters:**
- `referralCode` (path parameter) - The referral code to look up

**Example:**
```
GET /api/referrals/JOH-R-ABC123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "invite_123456",
    "referralCode": "JOH-R-ABC123",
    "senderId": "user123",
    "senderName": "John Doe",
    "senderEmail": "john@example.com",
    "source": "email",
    "status": "opened",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "openedAt": "2024-01-15T10:35:00.000Z",
    "trackingUrl": "https://yauapp.com/join?ref=JOH-R-ABC123"
  }
}
```

**Error Responses:**
- `404 Not Found` - Referral code not found

---

### 3. Track Referral Opened
**POST** `/api/referrals/track-opened`

Track when someone clicks a referral link.

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "referralCode": "JOH-R-ABC123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "invite_123456",
    "referralCode": "JOH-R-ABC123",
    "status": "opened",
    "openedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid referral code
- `404 Not Found` - Referral not found

---

### 4. Track Referral Joined
**POST** `/api/referrals/track-joined`

Track when someone completes registration and payment.

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "referralCode": "JOH-R-ABC123",
  "recipientId": "newUser456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "invite_123456",
    "referralCode": "JOH-R-ABC123",
    "status": "joined",
    "joinedAt": "2024-01-15T10:45:00.000Z",
    "recipientId": "newUser456"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid referral code
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Referral not found

---

### 5. Get User Referrals
**GET** `/api/referrals/user/:userId`

Get paginated list of referrals for a specific user.

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Parameters:**
- `userId` (path parameter) - User ID to get referrals for
- `limit` (query parameter, optional) - Number of results per page (default: 50)
- `offset` (query parameter, optional) - Number of results to skip (default: 0)

**Example:**
```
GET /api/referrals/user/user123?limit=10&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": {
    "referrals": [
      {
        "id": "invite_123456",
        "referralCode": "JOH-R-ABC123",
        "senderId": "user123",
        "senderName": "John Doe",
        "recipientEmail": "friend@example.com",
        "source": "email",
        "status": "joined",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "openedAt": "2024-01-15T10:35:00.000Z",
        "joinedAt": "2024-01-15T10:45:00.000Z",
        "trackingUrl": "https://yauapp.com/join?ref=JOH-R-ABC123"
      }
    ],
    "total": 15,
    "limit": 10,
    "offset": 0
  }
}
```

---

### 6. Get User Referral Statistics
**GET** `/api/referrals/user/:userId/stats`

Get referral statistics and conversion rates for a user.

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Example:**
```
GET /api/referrals/user/user123/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 25,
    "sent": 10,
    "opened": 8,
    "joined": 5,
    "bySource": {
      "email": 15,
      "sms": 5,
      "link": 5
    },
    "conversionRate": {
      "openRate": 80.0,
      "joinRate": 50.0
    }
  }
}
```

---

### 7. Check Rate Limit
**GET** `/api/referrals/check-rate-limit`

Check remaining invites for email or SMS.

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Query Parameters:**
- `userId` (required) - User ID to check limits for
- `source` (required) - "email" or "sms"

**Example:**
```
GET /api/referrals/check-rate-limit?userId=user123&source=email
```

**Response:**
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "remaining": 35,
    "limit": 50,
    "resetAt": "2024-01-16T10:30:00.000Z"
  }
}
```

---

### 8. Get Global Referral Statistics (Admin Only)
**GET** `/api/referrals/admin/stats/global`

Get global referral statistics across all users.

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>",
  "Content-Type": "application/json"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 1250,
    "sent": 800,
    "opened": 600,
    "joined": 350,
    "bySource": {
      "email": 700,
      "sms": 300,
      "link": 250
    },
    "conversionRate": {
      "openRate": 75.0,
      "joinRate": 58.3
    },
    "topReferrers": [
      {
        "senderId": "user123",
        "senderName": "John Doe",
        "senderEmail": "john@example.com",
        "totalInvites": 50,
        "joinedInvites": 25
      }
    ]
  }
}
```

---

### 9. Delete Referral (Admin Only)
**DELETE** `/api/referrals/admin/:referralCode`

Delete a referral (admin only).

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>",
  "Content-Type": "application/json"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

---

## 📊 Status Flow

```
Sent → Opened → Joined
```

**Status Definitions:**
- `sent` - Referral created but not yet clicked
- `opened` - Referral link clicked but not yet converted
- `joined` - User completed registration + payment

---

## ⚡ Rate Limits

| Channel | Daily Limit | Reset Time |
|---------|-------------|------------|
| Email | 50 invites | 24 hours from first invite |
| SMS | 20 invites | 24 hours from first invite |
| Link | Unlimited | N/A |

---

## 💰 Reward System

- **Reward Amount**: $10.00 credit per successful referral
- **Maximum Rewards**: $500.00 per user
- **Trigger**: When referred user reaches "joined" status

---

## 🔐 Authentication

**Public Endpoints** (No auth required):
- `GET /api/referrals/:referralCode`
- `POST /api/referrals/track-opened`

**Protected Endpoints** (User auth required):
- All other endpoints require valid JWT token

**Admin Endpoints** (Admin auth required):
- `GET /api/referrals/admin/stats/global`
- `DELETE /api/referrals/admin/:referralCode`

---

## 🚨 Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

---

## 📝 Example Usage Flow

### 1. Create Referral
```javascript
// User creates an email referral
POST /api/referrals/create
{
  "senderId": "user123",
  "senderName": "John Doe", 
  "senderEmail": "john@example.com",
  "source": "email",
  "recipientEmail": "friend@example.com",
  "recipientName": "Jane Smith"
}
```

### 2. Friend Clicks Link
```javascript
// Friend clicks the referral link
POST /api/referrals/track-opened
{
  "referralCode": "JOH-R-ABC123"
}
```

### 3. Friend Registers & Pays
```javascript
// After friend completes registration + payment
POST /api/referrals/track-joined
{
  "referralCode": "JOH-R-ABC123", 
  "recipientId": "newUser456"
}
```

### 4. Check Stats
```javascript
// User checks their referral performance
GET /api/referrals/user/user123/stats
```

---

## 🔄 Integration with Frontend

### Frontend Service Example:
```javascript
import { API_CONFIG } from '../firebase/config';

class ReferralService {
  static async createReferral(inviteData) {
    const response = await fetch(
      `${API_CONFIG.baseURL}${API_CONFIG.endpoints.referrals.create}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inviteData)
      }
    );
    return await response.json();
  }

  static async trackOpened(referralCode) {
    const response = await fetch(
      `${API_CONFIG.baseURL}${API_CONFIG.endpoints.referrals.trackOpened}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ referralCode })
      }
    );
    return await response.json();
  }
}
```

This documentation provides complete API reference for integrating the referral system with your frontend application!