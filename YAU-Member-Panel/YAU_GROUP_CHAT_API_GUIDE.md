# YAU Group Chat API - Complete Developer Guide
**For Mobile App Development (Flutter/React Native)**

---

## 🌐 Base Configuration

### API Base URL
```
Production:  https://us-central1-yau-app.cloudfunctions.net/apis
Development: http://127.0.0.1:5001/yau-app/us-central1/apis
```

### Required Headers
```
Content-Type: application/json
Accept: application/json
```

---

## 📋 Table of Contents

1. [Member Registration & Group Chat Creation](#-member-registration--group-chat-creation)
2. [Member Chat APIs](#-member-chat-apis)
3. [Coach Chat APIs](#-coach-chat-apis)
4. [Message Management](#-message-management)
5. [Admin Functions](#-admin-functions)
6. [Real-time Integration](#-real-time-integration)
7. [Flutter Implementation](#-flutter-implementation)
8. [Error Handling](#-error-handling)

---

## 🎯 Member Registration & Group Chat Creation

### Create/Ensure Group Chat During Registration
**Use Case:** When a new member registers for a sport, automatically create or join team chat

**Endpoint:** `POST /group-chats/create-or-ensure`

**Request Payload:**
```json
{
  "memberData": {
    "uid": "firebase_user_uid_123",
    "firstName": "Sarah",
    "lastName": "Johnson",
    "email": "sarah.johnson@email.com", 
    "sport": "Flag Football",
    "location": "Bowie, MD"
  },
  "student": {
    "firstName": "Tommy",
    "lastName": "Johnson",
    "ageGroup": "8U",
    "dob": "2016-05-15"
  }
}
```

**Field Requirements:**
- `memberData.uid` *(required)* - Firebase Auth UID
- `memberData.firstName` *(required)* - Parent first name
- `memberData.lastName` *(required)* - Parent last name  
- `memberData.email` *(required)* - Parent email
- `memberData.sport` *(required)* - Sport name
- `memberData.location` *(required)* - Location
- `student.firstName` *(required)* - Child first name
- `student.lastName` *(required)* - Child last name
- `student.dob` *(required)* - Birth date (YYYY-MM-DD)
- `student.ageGroup` *(optional)* - Auto-calculated if not provided

**Success Response:**
```json
{
  "success": true,
  "chatId": "8U_Flag_Football_Bowie,_MD",
  "rosterId": "flag-football-8u-bowie---md", 
  "groupName": "8U Flag Football - Bowie, MD",
  "isNewGroup": false,
  "memberCount": 15,
  "hasRoster": true,
  "alreadyMember": false
}
```

**cURL Example:**
```bash
curl -X POST "https://us-central1-yau-app.cloudfunctions.net/apis/group-chats/create-or-ensure" \
  -H "Content-Type: application/json" \
  -d '{
    "memberData": {
      "uid": "user123",
      "firstName": "Sarah", 
      "lastName": "Johnson",
      "email": "sarah@email.com",
      "sport": "Flag Football",
      "location": "Bowie, MD"
    },
    "student": {
      "firstName": "Tommy",
      "lastName": "Johnson", 
      "dob": "2016-05-15"
    }
  }'
```

---

## 👥 Member Chat APIs

### Get Member's Team Chats
**Use Case:** Display all team chats a parent/member has access to

**Endpoint:** `POST /chats/member-team-chats`

**Request:**
```json
{
  "memberId": "firebase_user_uid_123",
  "memberEmail": "sarah.johnson@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "8U_Flag_Football_Bowie,_MD",
      "name": "8U Flag Football - Bowie, MD",
      "sport": "Flag Football",
      "ageGroup": "8U", 
      "location": "Bowie, MD",
      "memberCount": 15,
      "lastActivity": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-01T09:00:00.000Z",
      "rosterId": "flag-football-8u-bowie---md",
      "userRole": "member"
    }
  ],
  "count": 1,
  "userType": "member"
}
```

### Check Access to Team Chat
**Use Case:** Verify user can access a specific chat before showing it

**Endpoint:** `POST /chats/team-chat/{teamChatId}/check-access`

**URL Params:**
- `teamChatId`: Chat ID (e.g., "8U_Flag_Football_Bowie,_MD")

**Request:**
```json
{
  "userId": "firebase_user_uid_123",
  "userEmail": "sarah.johnson@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "hasAccess": true,
  "role": "member",
  "reason": null,
  "teamChatId": "8U_Flag_Football_Bowie,_MD"
}
```

---

## 👨‍🏫 Coach Chat APIs

### Get Coach's Team Chats
**Use Case:** Display all teams a coach manages

**Endpoint:** `POST /chats/coach-team-chats`

**Request:**
```json
{
  "coachId": "coach_firebase_uid_456"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "8U_Flag_Football_Bowie,_MD",
      "name": "8U Flag Football - Bowie, MD", 
      "sport": "Flag Football",
      "ageGroup": "8U",
      "location": "Bowie, MD",
      "memberCount": 15,
      "coachName": "Coach Smith",
      "hasAssignedCoach": true,
      "lastActivity": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-01T09:00:00.000Z",
      "rosterId": "flag-football-8u-bowie---md",
      "userRole": "coach",
      "players": []
    }
  ],
  "count": 1,
  "userType": "coach"
}
```

---

## 💬 Message Management

### Get Chat Messages
**Use Case:** Load message history for a team chat

**Endpoint:** `POST /chats/team-chat/{teamChatId}/messages`

**Request:**
```json
{
  "userId": "firebase_user_uid_123",
  "userEmail": "sarah.johnson@email.com",
  "limit": 50
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg_abc123",
      "text": "Great practice today! Next game is Saturday at 10am.",
      "uid": "coach_uid_456",
      "senderId": "coach_uid_456", 
      "senderName": "Coach Smith",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "senderType": "coach",
      "senderInfo": {
        "firstName": "Coach",
        "lastName": "Smith", 
        "role": "coach"
      }
    },
    {
      "id": "msg_def456",
      "text": "Thanks for the update, Coach!",
      "uid": "parent_uid_789",
      "senderId": "parent_uid_789",
      "senderName": "Sarah Johnson", 
      "timestamp": "2024-01-15T10:35:00.000Z",
      "senderType": "member",
      "senderInfo": {
        "firstName": "Sarah",
        "lastName": "Johnson",
        "role": "member"
      }
    }
  ],
  "count": 2,
  "teamChatId": "8U_Flag_Football_Bowie,_MD",
  "userRole": "member"
}
```

### Send Message
**Use Case:** Send a message to team chat

**Endpoint:** `POST /chats/team-chat/{teamChatId}/send-message`

**Request:**
```json
{
  "userId": "firebase_user_uid_123",
  "userEmail": "sarah.johnson@email.com",
  "message": "Will Tommy be able to make it to Saturday's game?",
  "senderName": "Sarah Johnson",
  "senderInfo": {
    "firstName": "Sarah",
    "lastName": "Johnson", 
    "role": "member"
  }
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_xyz789",
  "teamChatId": "8U_Flag_Football_Bowie,_MD",
  "userRole": "member",
  "message": "Message sent successfully"
}
```

---

## 🔧 Admin Functions

### Create Group Chat from Roster
**Use Case:** Admin creates chat for existing team roster

**Endpoint:** `POST /group-chats/from-roster`

**Request:**
```json
{
  "rosterId": "flag-football-8u-bowie---md"
}
```

### Sync All Rosters to Group Chats
**Use Case:** Bulk create chats for all rosters without chats

**Endpoint:** `POST /group-chats/sync-rosters`

**Request:** (empty body)
```json
{}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total": 25,
    "created": 8,
    "existing": 15,
    "failed": 2
  },
  "results": [...],
  "message": "Sync completed: 8 created, 15 existing, 2 failed"
}
```

---

## 🔴 Real-time Integration

### Firebase Realtime Listeners
For live message updates, use Firebase Firestore directly:

**Collection Structure:**
```
groupChats/{chatId}/messages/{messageId}
```

**Flutter Realtime Listener:**
```dart
Stream<List<ChatMessage>> getMessagesStream(String chatId) {
  return FirebaseFirestore.instance
    .collection('groupChats')
    .doc(chatId)
    .collection('messages')
    .orderBy('timestamp', descending: false)
    .limit(50)
    .snapshots()
    .map((snapshot) => 
      snapshot.docs.map((doc) => ChatMessage.fromJson(doc.data())).toList()
    );
}
```

---

## 📱 Flutter Implementation

### 1. Setup HTTP Service
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class ApiService {
  static const String baseUrl = 'https://us-central1-yau-app.cloudfunctions.net/apis';
  
  static Future<Map<String, dynamic>> post(
    String endpoint, 
    Map<String, dynamic> body
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl$endpoint'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: json.encode(body),
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw ApiException('HTTP ${response.statusCode}: ${response.body}');
      }
    } catch (e) {
      throw ApiException('Network error: $e');
    }
  }
}

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  
  @override
  String toString() => 'ApiException: $message';
}
```

### 2. Group Chat Service
```dart
class GroupChatService {
  // Registration flow
  static Future<GroupChatResult> createOrEnsureGroupChat({
    required String uid,
    required String firstName,
    required String lastName, 
    required String email,
    required String sport,
    required String location,
    required String childFirstName,
    required String childLastName,
    required String childDob,
    String? ageGroup,
  }) async {
    final response = await ApiService.post('/group-chats/create-or-ensure', {
      'memberData': {
        'uid': uid,
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'sport': sport,
        'location': location,
      },
      'student': {
        'firstName': childFirstName,
        'lastName': childLastName,
        'ageGroup': ageGroup,
        'dob': childDob,
      },
    });
    
    return GroupChatResult.fromJson(response);
  }
  
  // Get member chats
  static Future<List<TeamChat>> getMemberTeamChats(
    String memberId, 
    String memberEmail
  ) async {
    final response = await ApiService.post('/chats/member-team-chats', {
      'memberId': memberId,
      'memberEmail': memberEmail,
    });
    
    if (response['success']) {
      return (response['data'] as List)
          .map((chat) => TeamChat.fromJson(chat))
          .toList();
    }
    throw ApiException(response['error'] ?? 'Failed to get team chats');
  }
  
  // Get coach chats
  static Future<List<TeamChat>> getCoachTeamChats(String coachId) async {
    final response = await ApiService.post('/chats/coach-team-chats', {
      'coachId': coachId,
    });
    
    if (response['success']) {
      return (response['data'] as List)
          .map((chat) => TeamChat.fromJson(chat))
          .toList();
    }
    throw ApiException(response['error'] ?? 'Failed to get coach chats');
  }
  
  // Get messages
  static Future<List<ChatMessage>> getChatMessages(
    String teamChatId,
    String userId,
    String userEmail, {
    int limit = 50,
  }) async {
    final response = await ApiService.post('/chats/team-chat/$teamChatId/messages', {
      'userId': userId,
      'userEmail': userEmail,
      'limit': limit,
    });
    
    if (response['success']) {
      return (response['data'] as List)
          .map((msg) => ChatMessage.fromJson(msg))
          .toList();
    }
    throw ApiException(response['error'] ?? 'Failed to get messages');
  }
  
  // Send message
  static Future<bool> sendMessage({
    required String teamChatId,
    required String userId,
    required String userEmail,
    required String message,
    required String senderName,
    required String senderRole,
  }) async {
    final names = senderName.split(' ');
    final response = await ApiService.post('/chats/team-chat/$teamChatId/send-message', {
      'userId': userId,
      'userEmail': userEmail,
      'message': message,
      'senderName': senderName,
      'senderInfo': {
        'firstName': names.isNotEmpty ? names[0] : '',
        'lastName': names.length > 1 ? names.sublist(1).join(' ') : '',
        'role': senderRole,
      },
    });
    
    return response['success'] ?? false;
  }
}
```

### 3. Data Models
```dart
class TeamChat {
  final String id;
  final String name;
  final String sport;
  final String ageGroup;
  final String location;
  final int memberCount;
  final DateTime lastActivity;
  final DateTime createdAt;
  final String rosterId;
  final String userRole;
  
  TeamChat({
    required this.id,
    required this.name,
    required this.sport,
    required this.ageGroup,
    required this.location,
    required this.memberCount,
    required this.lastActivity,
    required this.createdAt,
    required this.rosterId,
    required this.userRole,
  });
  
  factory TeamChat.fromJson(Map<String, dynamic> json) {
    return TeamChat(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      sport: json['sport'] ?? '',
      ageGroup: json['ageGroup'] ?? '',
      location: json['location'] ?? '',
      memberCount: json['memberCount'] ?? 0,
      lastActivity: DateTime.parse(json['lastActivity'] ?? DateTime.now().toIso8601String()),
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      rosterId: json['rosterId'] ?? '',
      userRole: json['userRole'] ?? 'member',
    );
  }
}

class ChatMessage {
  final String id;
  final String text;
  final String senderId;
  final String senderName;
  final DateTime timestamp;
  final String senderType;
  final Map<String, dynamic> senderInfo;
  
  ChatMessage({
    required this.id,
    required this.text,
    required this.senderId,
    required this.senderName,
    required this.timestamp,
    required this.senderType,
    required this.senderInfo,
  });
  
  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] ?? '',
      text: json['text'] ?? '',
      senderId: json['senderId'] ?? json['uid'] ?? '',
      senderName: json['senderName'] ?? 'Unknown',
      timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
      senderType: json['senderType'] ?? 'member',
      senderInfo: json['senderInfo'] ?? {},
    );
  }
}

class GroupChatResult {
  final bool success;
  final String chatId;
  final String rosterId;
  final String groupName;
  final bool isNewGroup;
  final int memberCount;
  final bool hasRoster;
  final bool alreadyMember;
  final String? error;
  
  GroupChatResult({
    required this.success,
    required this.chatId,
    required this.rosterId,
    required this.groupName,
    required this.isNewGroup,
    required this.memberCount,
    required this.hasRoster,
    required this.alreadyMember,
    this.error,
  });
  
  factory GroupChatResult.fromJson(Map<String, dynamic> json) {
    return GroupChatResult(
      success: json['success'] ?? false,
      chatId: json['chatId'] ?? '',
      rosterId: json['rosterId'] ?? '',
      groupName: json['groupName'] ?? '',
      isNewGroup: json['isNewGroup'] ?? false,
      memberCount: json['memberCount'] ?? 0,
      hasRoster: json['hasRoster'] ?? false,
      alreadyMember: json['alreadyMember'] ?? false,
      error: json['error'],
    );
  }
}
```

### 4. Usage Examples
```dart
class RegistrationScreen extends StatefulWidget {
  @override
  _RegistrationScreenState createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen> {
  Future<void> _completeRegistration() async {
    try {
      // After successful payment/signup
      final result = await GroupChatService.createOrEnsureGroupChat(
        uid: FirebaseAuth.instance.currentUser!.uid,
        firstName: firstNameController.text,
        lastName: lastNameController.text,
        email: emailController.text,
        sport: selectedSport,
        location: selectedLocation,
        childFirstName: childFirstNameController.text,
        childLastName: childLastNameController.text,
        childDob: selectedBirthDate.toIso8601String().split('T')[0],
      );
      
      if (result.success) {
        // Success - navigate to team chat
        Navigator.pushNamed(context, '/team-chat', arguments: result.chatId);
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Welcome to ${result.groupName}!')),
        );
      } else {
        throw Exception(result.error ?? 'Failed to join team chat');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }
}
```

---

## ❌ Error Handling

### Common HTTP Status Codes
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `403` - Forbidden (access denied)
- `404` - Not Found (invalid endpoint)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": "Access denied",
  "reason": "User not found in roster or group chat members",
  "required": ["userId", "userEmail"]
}
```

### Flutter Error Handling
```dart
try {
  final result = await GroupChatService.getMemberTeamChats(userId, userEmail);
  // Handle success
} on ApiException catch (e) {
  // Handle API-specific errors
  print('API Error: ${e.message}');
  showErrorDialog('Failed to load team chats: ${e.message}');
} catch (e) {
  // Handle general errors
  print('Unexpected error: $e');
  showErrorDialog('An unexpected error occurred');
}
```

---

## 🚀 Quick Start Checklist

### For Mobile Registration Flow:
1. ✅ User completes registration form
2. ✅ Payment/signup successful
3. ✅ Call `/group-chats/create-or-ensure` with member + student data
4. ✅ Store returned `chatId` for future use
5. ✅ Navigate user to team chat screen
6. ✅ Setup real-time message listener with Firebase
7. ✅ Allow user to send messages via `/send-message` endpoint

### Required User Data:
- Firebase Auth UID
- Parent name and email
- Child name and birth date
- Selected sport and location

### Chat ID Format:
- Example: `"8U_Flag_Football_Bowie,_MD"`
- Format: `"{ageGroup}_{Sport}_{Location}"`
- Use this ID for all message operations

---

## 🔗 Related Firebase Collections

```
📁 groupChats/
  └── {chatId}/              # e.g., "8U_Flag_Football_Bowie,_MD"
      ├── (document fields)  # Chat metadata, members, etc.
      └── messages/          # Subcollection for real-time messages
          └── {messageId}/   # Individual messages
```

**Direct Firebase Access:**
- ✅ Reading messages (real-time listeners)  
- ❌ Writing messages (use API endpoints only)
- ❌ Creating chats (use API endpoints only)
- ❌ Managing members (use API endpoints only)

This ensures data consistency and proper validation while maintaining real-time message functionality.