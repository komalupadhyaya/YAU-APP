# 🔗 Referral System API — Frontend Integration Guide

## 🌐 Base URLs

| Environment     | URL                                                   |
| --------------- | ----------------------------------------------------- |
| Local (Testing) | `http://127.0.0.1:5001/yau-app/us-central1/apis`      |
| Production      | `https://us-central1-yau-app.cloudfunctions.net/apis` |

All endpoints are under `/referrals`:

```
/referrals/<endpoint>
```

---

## ⚙️ Setup in Frontend

Example base configuration:

```javascript
export const API_BASE = "http://127.0.0.1:5001/yau-app/us-central1/apis/referrals";

export const headers = {
  "Content-Type": "application/json",
  // Add Authorization header when auth is enabled
  // "Authorization": `Bearer ${token}`
};
```

---

## 1️⃣ Create Referral

**POST** `/create`

Used when a user invites someone via **email**, **SMS**, or **link**.

```javascript
await fetch(`${API_BASE}/create`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    senderId: "2VfgW7Xd9GT4klRkAt1bFqWmqfy1",
    senderName: "Piyush R",
    senderEmail: "piyush@gmail.com",
    source: "email",  // "email", "sms", or "link"
    recipientEmail: "friend@example.com",
    recipientName: "Jane Smith"
  })
});
```

✅ **Response Example**

```json
{
  "success": true,
  "data": {
    "referralCode": "PIY-R-I0KC",
    "trackingUrl": "http://localhost:3000/join?ref=PIY-R-I0KC",
    "status": "sent"
  }
}
```

---

## 2️⃣ Track Opened (Referral Click)

**POST** `/track-opened`

Triggered when someone **clicks the referral link**.

```javascript
await fetch(`${API_BASE}/track-opened`, {
  method: "POST",
  headers,
  body: JSON.stringify({ referralCode: "PIY-R-I0KC" })
});
```

✅ **Response**

```json
{
  "success": true,
  "data": {
    "referralCode": "PIY-R-I0KC",
    "status": "opened"
  }
}
```

---

## 3️⃣ Track Joined (User Registers)

**POST** `/track-joined`

Triggered when referred person **creates an account** or **pays**.

```javascript
await fetch(`${API_BASE}/track-joined`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    referralCode: "PIY-R-I0KC",
    recipientId: "newUser123"
  })
});
```

✅ **Response**

```json
{
  "success": true,
  "data": {
    "referralCode": "PIY-R-I0KC",
    "status": "joined",
    "joinedAt": "2025-10-08T10:45:00.000Z"
  }
}
```

---

## 4️⃣ Get User Referrals

**GET** `/user/:userId`

Used to show all invites sent by a specific member.

```javascript
await fetch(`${API_BASE}/user/2VfgW7Xd9GT4klRkAt1bFqWmqfy1`);
```

✅ **Response**

```json
{
  "success": true,
  "data": {
    "referrals": [
      {
        "referralCode": "PIY-R-I0KC",
        "recipientEmail": "friend@example.com",
        "status": "joined",
        "createdAt": "2025-10-08T08:16:26.122Z",
        "openedAt": "2025-10-08T08:20:10.000Z",
        "joinedAt": "2025-10-08T09:30:00.000Z"
      }
    ]
  }
}
```

---

## 5️⃣ Get User Referral Stats

**GET** `/user/:userId/stats`

Shows summary for the member’s referral performance.

```javascript
await fetch(`${API_BASE}/user/2VfgW7Xd9GT4klRkAt1bFqWmqfy1/stats`);
```

✅ **Response**

```json
{
  "success": true,
  "data": {
    "total": 10,
    "sent": 10,
    "opened": 7,
    "joined": 3,
    "conversionRate": {
      "openRate": 70.0,
      "joinRate": 30.0
    }
  }
}
```

---

## 6️⃣ (Optional) Admin Stats

**GET** `/admin/stats/global`

Used for global dashboard or reporting.

```javascript
await fetch(`${API_BASE}/admin/stats/global`);
```

✅ **Response**

```json
{
  "success": true,
  "data": {
    "total": 1250,
    "joined": 350,
    "conversionRate": { "joinRate": 58.3 },
    "topReferrers": [
      {
        "senderName": "Piyush R",
        "senderEmail": "piyush@gmail.com",
        "joinedInvites": 25
      }
    ]
  }
}
```

---

## 🔄 Status Flow

| Step                 | Status   | Trigger         |
| -------------------- | -------- | --------------- |
| Referral sent        | `sent`   | `/create`       |
| Referral link opened | `opened` | `/track-opened` |
| Friend joined        | `joined` | `/track-joined` |

---

## 🔐 Auth Notes

During testing — middleware is disabled.
Once live:

* All `/user/*`, `/create`, `/track-joined` require valid Firebase **ID token**
* `/admin/*` require **admin role** token

---

## 🧠 UI Integration Summary

| UI Action          | API Used                  | Notes                                    |
| ------------------ | ------------------------- | ---------------------------------------- |
| Invite Friend      | `POST /create`            | Create referral and show confirmation    |
| Friend Clicks Link | `POST /track-opened`      | Called silently when referral link loads |
| Friend Joins       | `POST /track-joined`      | Trigger after signup or payment          |
| View My Invites    | `GET /user/:userId`       | List all referrals                       |
| View Stats         | `GET /user/:userId/stats` | Summary analytics                        |
| Admin Dashboard    | `GET /admin/stats/global` | Optional                                 |

---

**✅ Quick Test Example (Local)**

```bash
curl -X POST http://127.0.0.1:5001/yau-app/us-central1/apis/referrals/create \
  -H "Content-Type: application/json" \
  -d '{"senderId": "2VfgW7Xd9GT4klRkAt1bFqWmqfy1", "senderName": "Piyush R", "senderEmail": "piyush@gmail.com", "source": "email", "recipientEmail": "friend@example.com"}'
```

---

**Author:** Codecraft Team
**Version:** v1.0 – Referral Tracking System
**Updated:** October 2025
