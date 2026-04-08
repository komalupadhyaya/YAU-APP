# Roster-Based Team Chats API

This API provides roster-based team chat functionality that matches member/coach roster participations with group chats.

## Endpoints

### 1. Get Member Team Chats
**POST** `/api/member-team-chats`

Get team chats for a member based on their roster participations.

**Request Body:**
```json
{
  "memberId": "string",    // Member's UID
  "memberEmail": "string"  // Member's email
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "soccer-13u-andrews-afb---clinton",
      "name": "13U SOCCER - Andrews AFB - Clinton",
      "sport": "soccer",
      "ageGroup": "13U",
      "location": "Andrews AFB - Clinton",
      "memberCount": 10,
      "coachName": "coach Sam",
      "hasAssignedCoach": true,
      "lastActivity": "2025-09-09T10:41:22.821Z",
      "createdAt": "2025-08-26T12:52:00.135Z",
      "rosterId": "soccer-13u-andrews-afb---clinton",
      "userRole": "member"
    }
  ],
  "count": 1,
  "userType": "member"
}
```

### 2. Get Coach Team Chats
**POST** `/api/coach-team-chats`

Get team chats for a coach based on rosters they coach.

**Request Body:**
```json
{
  "coachId": "string"  // Coach's UID
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "soccer-13u-andrews-afb---clinton",
      "name": "13U SOCCER - Andrews AFB - Clinton",
      "sport": "soccer",
      "ageGroup": "13U",
      "location": "Andrews AFB - Clinton",
      "memberCount": 10,
      "coachName": "coach Sam",
      "hasAssignedCoach": true,
      "lastActivity": "2025-09-09T10:41:22.821Z",
      "createdAt": "2025-08-26T12:52:00.135Z",
      "rosterId": "soccer-13u-andrews-afb---clinton",
      "userRole": "coach",
      "players": [...]
    }
  ],
  "count": 1,
  "userType": "coach"
}
```

### 3. Get Team Chat Messages
**POST** `/api/team-chat/:teamChatId/messages`

Get messages for a specific team chat.

**Request Body:**
```json
{
  "userId": "string",      // User's UID
  "userEmail": "string",   // User's email
  "limit": 50              // Optional: Number of messages to fetch
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "messageId",
      "text": "Hello team!",
      "uid": "userId",
      "senderId": "userId",
      "senderName": "John Doe",
      "timestamp": "2025-09-09T10:41:22.821Z",
      "senderType": "member",
      "senderInfo": {
        "firstName": "John",
        "lastName": "Doe",
        "role": "member",
        "senderType": "member"
      }
    }
  ],
  "count": 1,
  "teamChatId": "soccer-13u-andrews-afb---clinton",
  "userRole": "member"
}
```

### 4. Send Team Chat Message
**POST** `/api/team-chat/:teamChatId/send-message`

Send a message to a team chat.

**Request Body:**
```json
{
  "userId": "string",        // User's UID
  "userEmail": "string",     // User's email
  "message": "string",       // Message text
  "senderName": "string",    // Sender's display name
  "senderInfo": {            // Optional: Additional sender info
    "firstName": "string",
    "lastName": "string",
    "role": "string"
  }
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "newMessageId",
  "teamChatId": "soccer-13u-andrews-afb---clinton",
  "userRole": "member",
  "message": "Message sent successfully"
}
```

### 5. Check Team Chat Access
**POST** `/api/team-chat/:teamChatId/check-access`

Check user's access and role in a specific team chat.

**Request Body:**
```json
{
  "userId": "string",    // User's UID
  "userEmail": "string"  // User's email
}
```

**Response:**
```json
{
  "success": true,
  "hasAccess": true,
  "role": "member",      // "member" or "coach"
  "reason": null,        // Only present if hasAccess is false
  "teamChatId": "soccer-13u-andrews-afb---clinton"
}
```

## Data Flow

1. **Roster Matching**: The API matches user participation in rosters with corresponding group chats
2. **Role Detection**: Automatically determines if user is a member (participant) or coach
3. **Access Control**: Ensures users can only access chats for teams they're part of
4. **Real-time**: Frontend uses Firebase listeners for real-time message updates

## Database Structure

```
/rosters/{rosterId}
  - id: "soccer-13u-andrews-afb---clinton"
  - participants: [array of member objects]
  - coachId: "coachUid"
  - ...other roster data

/groupChats/{chatId}  // chatId matches rosterId
  - id: "soccer-13u-andrews-afb---clinton"
  - name: "13U SOCCER - Andrews AFB - Clinton"
  - members: [array of member objects]
  - ...other chat metadata
  
  /messages/{messageId}
    - text: "message content"
    - uid: "senderId"
    - timestamp: serverTimestamp
    - senderInfo: {...}
```

## Error Responses

All endpoints return errors in this format:
```json
{
  "success": false,
  "error": "Error description",
  "details": "Detailed error message (development only)"
}
```

Common HTTP status codes:
- **400**: Bad Request (missing required fields)
- **403**: Forbidden (no access to team chat)
- **404**: Not Found (roster/chat doesn't exist)
- **500**: Internal Server Error