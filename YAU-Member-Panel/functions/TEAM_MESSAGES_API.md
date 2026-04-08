# Team Messages API Documentation

## Overview
This API manages team messages stored in the `groupChats` Firestore collection. It provides full CRUD operations for team communication within rosters.

## Base URL
```
https://us-central1-yau-app.cloudfunctions.net/apis/team-messages
```

## Endpoints

### 1. Get All Team Messages
```http
GET /team-messages
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "message_id",
      "rosterId": "soccer-13u-andrews-afb---clinton",
      "rosterName": "13U SOCCER - Andrews AFB - Clinton",
      "text": "Hello team! Practice is at 3 PM today.",
      "senderName": "Jacob Milton",
      "uid": "user_uid",
      "priority": "normal",
      "read": false,
      "timestamp": "2025-09-08T13:45:00.000Z",
      "messageType": "team",
      "status": "active"
    }
  ],
  "count": 1
}
```

### 2. Get Team Messages by Roster
```http
GET /team-messages/:rosterId
```

**Parameters:**
- `rosterId` (string): The roster ID to filter messages

**Example:**
```http
GET /team-messages/soccer-13u-andrews-afb---clinton
```

### 3. Create Team Message
```http
POST /team-messages
```

**Request Body:**
```json
{
  "rosterId": "soccer-13u-andrews-afb---clinton",
  "rosterName": "13U SOCCER - Andrews AFB - Clinton",
  "text": "Practice is canceled today due to rain.",
  "senderName": "Jacob Milton",
  "uid": "user_uid",
  "priority": "high"
}
```

**Required Fields:**
- `rosterId`: Roster ID the message belongs to
- `text`: Message content
- `senderName`: Name of the message sender
- `uid`: User ID of the sender

**Optional Fields:**
- `rosterName`: Display name of the roster
- `priority`: Message priority (`low`, `normal`, `high`)
- `timestamp`: Custom timestamp (defaults to now)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new_message_id",
    "rosterId": "soccer-13u-andrews-afb---clinton",
    "rosterName": "13U SOCCER - Andrews AFB - Clinton",
    "text": "Practice is canceled today due to rain.",
    "senderName": "Jacob Milton",
    "uid": "user_uid",
    "priority": "high",
    "read": false,
    "timestamp": "2025-09-08T14:00:00.000Z",
    "createdAt": "2025-09-08T14:00:00.000Z",
    "messageType": "team",
    "status": "active"
  },
  "message": "Team message created successfully"
}
```

### 4. Mark Message as Read
```http
PATCH /team-messages/:messageId/read
```

**Request Body:**
```json
{
  "uid": "user_uid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message marked as read",
  "messageId": "message_id"
}
```

### 5. Delete Team Message
```http
DELETE /team-messages/:messageId
```

**Request Body:**
```json
{
  "uid": "user_uid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message deleted successfully",
  "messageId": "message_id"
}
```

**Note:** This is a soft delete - the message is marked as deleted but not removed from the database.

### 6. Get Team Message Statistics
```http
GET /team-messages/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMessages": 25,
    "messagesByRoster": {
      "soccer-13u-andrews-afb---clinton": 10,
      "basketball-15u-greenbelt-md": 15
    },
    "messagesByPriority": {
      "high": 5,
      "normal": 18,
      "low": 2
    },
    "readVsUnread": {
      "read": 20,
      "unread": 5
    },
    "recentActivity": {
      "last24Hours": 3,
      "last7Days": 8,
      "last30Days": 15
    }
  }
}
```

## Error Handling

All endpoints return errors in the following format:
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information (development only)"
}
```

### Common HTTP Status Codes:
- `200`: Success
- `201`: Created (for POST requests)
- `400`: Bad Request (missing required fields)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

## Data Model

### Team Message Document (groupChats collection)
```javascript
{
  id: "auto-generated",
  rosterId: "soccer-13u-andrews-afb---clinton",
  rosterName: "13U SOCCER - Andrews AFB - Clinton",
  text: "Message content",
  senderName: "User Name",
  uid: "firebase_user_uid",
  priority: "normal", // low, normal, high
  read: false,
  timestamp: Timestamp,
  createdAt: Timestamp,
  messageType: "team",
  status: "active", // active, deleted
  
  // Optional fields for read/delete operations
  readAt: Timestamp,
  readBy: "user_uid",
  deletedAt: Timestamp,
  deletedBy: "user_uid"
}
```

## Integration with Frontend

The team messages API is already integrated with the member panel frontend through:

1. **RosterFilteringService**: Filters messages based on user's roster assignments
2. **ComposeMessage Component**: Creates new team messages
3. **Messages Page**: Displays team messages with roster filtering

### Frontend Usage Example:
```javascript
// Create a team message
const messageData = {
  rosterId: "soccer-13u-andrews-afb---clinton",
  rosterName: "13U SOCCER - Andrews AFB - Clinton",
  text: "Team meeting at 5 PM",
  senderName: "Jacob Milton",
  uid: "user_uid",
  priority: "normal"
};

const response = await TeamMessagesService.create(messageData);
```

## Deployment

1. **Deploy to Firebase Functions:**
   ```bash
   cd functions
   firebase deploy --only functions
   ```

2. **Test the API:**
   ```bash
   curl https://us-central1-yau-app.cloudfunctions.net/apis/team-messages/stats
   ```

## Security Considerations

- **Authentication**: Currently public, can add Firebase Auth middleware
- **Authorization**: Users can only delete their own messages
- **Input Validation**: All required fields are validated
- **Soft Delete**: Messages are soft-deleted for audit trail
- **Rate Limiting**: Consider adding rate limiting for production use

## Future Enhancements

1. **Real-time Updates**: Add WebSocket or Firebase Realtime Database sync
2. **Message Threading**: Support for reply threads
3. **File Attachments**: Support for image/file uploads
4. **Push Notifications**: Send notifications for new messages
5. **Message Reactions**: Like/emoji reactions
6. **Message Moderation**: Admin approval for certain message types