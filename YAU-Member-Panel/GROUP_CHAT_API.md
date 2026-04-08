# YAU Group Chat API Documentation
## For Mobile App Development (Flutter)

### Base URL
```
Production: https://us-central1-yau-app.cloudfunctions.net/apis
Development: https://us-central1-yau-app.cloudfunctions.net/apis
```

---

## 🏀 Member APIs

### 1. Get Member's Team Chats
**Endpoint:** `POST /chats/member-team-chats`

**Description:** Get all team chats for a member based on roster participation

**Request Body:**
```json
{
  "memberId": "user123",
  "memberEmail": "parent@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "6U_Flag_Football_Bowie,_MD",
      "name": "6U Flag Football - Bowie, MD",
      "sport": "Flag Football",
      "ageGroup": "6U",
      "location": "Bowie, MD",
      "memberCount": 15,
      "lastActivity": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-01T09:00:00.000Z",
      "rosterId": "flag-football-6u-bowie---md",
      "userRole": "member"
    }
  ],
  "count": 1,
  "userType": "member"
}
```

### 2. Get Team Chat Messages
**Endpoint:** `POST /chats/team-chat/{teamChatId}/messages`

**Description:** Get messages for a specific team chat

**URL Params:**
- `teamChatId`: The chat ID (e.g., "6U_Flag_Football_Bowie,_MD")

**Request Body:**
```json
{
  "userId": "user123",
  "userEmail": "parent@email.com",
  "limit": 50
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg123",
      "text": "Great practice today!",
      "uid": "coach456",
      "senderId": "coach456",
      "senderName": "Coach Smith",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "senderType": "coach",
      "senderInfo": {
        "firstName": "Coach",
        "lastName": "Smith",
        "role": "coach"
      }
    }
  ],
  "count": 1,
  "teamChatId": "6U_Flag_Football_Bowie,_MD",
  "userRole": "member"
}
```

### 3. Send Message to Team Chat
**Endpoint:** `POST /chats/team-chat/{teamChatId}/send-message`

**Request Body:**
```json
{
  "userId": "user123",
  "userEmail": "parent@email.com",
  "message": "Thanks for the update!",
  "senderName": "John Parent",
  "senderInfo": {
    "firstName": "John",
    "lastName": "Parent",
    "role": "member"
  }
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg456",
  "teamChatId": "6U_Flag_Football_Bowie,_MD",
  "userRole": "member",
  "message": "Message sent successfully"
}
```

---

## 👨‍🏫 Coach APIs

### 1. Get Coach's Team Chats
**Endpoint:** `POST /chats/coach-team-chats`

**Description:** Get all team chats for a coach based on their assigned teams

**Request Body:**
```json
{
  "coachId": "coach456"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "6U_Flag_Football_Bowie,_MD",
      "name": "6U Flag Football - Bowie, MD",
      "sport": "Flag Football",
      "ageGroup": "6U",
      "location": "Bowie, MD",
      "memberCount": 15,
      "coachName": "Coach Smith",
      "hasAssignedCoach": true,
      "lastActivity": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-01T09:00:00.000Z",
      "rosterId": "flag-football-6u-bowie---md",
      "userRole": "coach",
      "players": []
    }
  ],
  "count": 1,
  "userType": "coach"
}
```

### 2. Check Team Chat Access
**Endpoint:** `POST /chats/team-chat/{teamChatId}/check-access`

**Description:** Verify if user has access to a specific team chat

**Request Body:**
```json
{
  "userId": "user123",
  "userEmail": "parent@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "hasAccess": true,
  "role": "member",
  "reason": null,
  "teamChatId": "6U_Flag_Football_Bowie,_MD"
}
```

---

## 🔧 Group Chat Management APIs

### 1. Create/Ensure Group Chat
**Endpoint:** `POST /group-chats/create-or-ensure`

**Description:** Create a new group chat or ensure existing one during member registration

**Request Body:**
```json
{
  "memberData": {
    "uid": "user123",
    "firstName": "John",
    "lastName": "Parent",
    "email": "parent@email.com",
    "sport": "Flag Football",
    "location": "Bowie, MD"
  },
  "student": {
    "firstName": "Jimmy",
    "lastName": "Parent",
    "ageGroup": "6U",
    "dob": "2018-03-15"
  }
}
```

**Response:**
```json
{
  "success": true,
  "chatId": "6U_Flag_Football_Bowie,_MD",
  "rosterId": "flag-football-6u-bowie---md",
  "groupName": "6U Flag Football - Bowie, MD",
  "isNewGroup": false,
  "memberCount": 16,
  "hasRoster": true
}
```

### 2. Get User's Group Chats
**Endpoint:** `POST /group-chats/user-chats`

**Description:** Get all group chats for a user

**Request Body:**
```json
{
  "userEmail": "parent@email.com",
  "userUid": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "6U_Flag_Football_Bowie,_MD",
      "name": "6U Flag Football - Bowie, MD",
      "memberCount": 15,
      "sport": "Flag Football",
      "ageGroup": "6U",
      "location": "Bowie, MD",
      "lastActivity": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-01T09:00:00.000Z"
    }
  ],
  "count": 1
}
```

### 3. Send Message to Group Chat
**Endpoint:** `POST /group-chats/{chatId}/send-message`

**Request Body:**
```json
{
  "message": "Hello team!",
  "senderId": "user123",
  "senderName": "John Parent",
  "senderInfo": {
    "firstName": "John",
    "lastName": "Parent",
    "role": "member"
  }
}
```

**Response:**
```json
{
  "success": true,
  "chatId": "6U_Flag_Football_Bowie,_MD",
  "message": "Message sent successfully"
}
```

---

## 🚀 Flutter Implementation Guide

### 1. Setup HTTP Client
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class ApiService {
  static const String baseUrl = 'https://us-central1-yau-app.cloudfunctions.net/apis';
  
  static Future<Map<String, dynamic>> post(String endpoint, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('$baseUrl$endpoint'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(body),
    );
    
    return json.decode(response.body);
  }
}
```

### 2. Get Member Team Chats
```dart
class ChatService {
  static Future<List<TeamChat>> getMemberTeamChats(String memberId, String memberEmail) async {
    final response = await ApiService.post('/chats/member-team-chats', {
      'memberId': memberId,
      'memberEmail': memberEmail,
    });
    
    if (response['success']) {
      return (response['data'] as List)
          .map((chat) => TeamChat.fromJson(chat))
          .toList();
    }
    throw Exception('Failed to get team chats');
  }
}
```

### 3. Send Message
```dart
static Future<bool> sendMessage(String teamChatId, String userId, String userEmail, String message, String senderName) async {
  final response = await ApiService.post('/chats/team-chat/$teamChatId/send-message', {
    'userId': userId,
    'userEmail': userEmail,
    'message': message,
    'senderName': senderName,
    'senderInfo': {
      'firstName': senderName.split(' ')[0],
      'lastName': senderName.split(' ').length > 1 ? senderName.split(' ')[1] : '',
      'role': 'member'
    }
  });
  
  return response['success'] ?? false;
}
```

### 4. Data Models
```dart
class TeamChat {
  final String id;
  final String name;
  final String sport;
  final String ageGroup;
  final String location;
  final int memberCount;
  final DateTime lastActivity;
  final String userRole;
  
  TeamChat.fromJson(Map<String, dynamic> json)
    : id = json['id'],
      name = json['name'],
      sport = json['sport'],
      ageGroup = json['ageGroup'],
      location = json['location'],
      memberCount = json['memberCount'],
      lastActivity = DateTime.parse(json['lastActivity']),
      userRole = json['userRole'];
}

class ChatMessage {
  final String id;
  final String text;
  final String senderId;
  final String senderName;
  final DateTime timestamp;
  final String senderType;
  
  ChatMessage.fromJson(Map<String, dynamic> json)
    : id = json['id'],
      text = json['text'],
      senderId = json['senderId'],
      senderName = json['senderName'],
      timestamp = DateTime.parse(json['timestamp']),
      senderType = json['senderType'];
}
```

---

## 🔐 Authentication & Error Handling

### Headers Required
```
Content-Type: application/json
```

### Common Error Responses
```json
{
  "success": false,
  "error": "Access denied",
  "reason": "User not found in roster or group chat members"
}
```

### Status Codes
- `200`: Success
- `400`: Bad Request (missing parameters)
- `403`: Access Denied
- `500`: Internal Server Error

---

## 📱 Real-time Updates

For real-time message updates, use Firebase Firestore listeners directly:

### Flutter Firebase Listener
```dart
Stream<List<ChatMessage>> getMessagesStream(String chatId) {
  return FirebaseFirestore.instance
    .collection('groupChats')
    .doc(chatId)
    .collection('messages')
    .orderBy('timestamp', descending: false)
    .limit(50)
    .snapshots()
    .map((snapshot) => snapshot.docs
        .map((doc) => ChatMessage.fromJson(doc.data()))
        .toList());
}
```

---

## 🎯 Key Points for Mobile Development

1. **User Roles**: Members and Coaches have different access levels
2. **Chat IDs**: Use format like "6U_Flag_Football_Bowie,_MD"
3. **Authentication**: Always include userId and userEmail in requests
4. **Real-time**: Use Firebase listeners for live message updates
5. **Error Handling**: Check `success` field in all responses
6. **Pagination**: Use `limit` parameter for message loading

This API handles all group chat logic on the backend while preserving the existing functionality and flow.