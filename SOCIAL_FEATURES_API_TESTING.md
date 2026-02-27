# Social Features - API Testing Guide (Postman)

## Base URL
```
{{baseUrl}}/api/v1
```

## Authentication
All endpoints require JWT token in header:
```
Authorization: Bearer {{token}}
```

---

## 1. FOLLOW SYSTEM (`/follow`)

### 1.1 Follow User
**POST** `/follow/follow`
```json
{
  "followingId": "USER_ID_TO_FOLLOW"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Successfully followed",
  "statusCode": 200,
  "data": {}
}
```

### 1.2 Unfollow User
**POST** `/follow/unfollow`
```json
{
  "followingId": "USER_ID_TO_UNFOLLOW"
}
```

### 1.3 Get Followers List
**GET** `/follow/followers/:userId?`
- Without userId - returns current user's followers
- With userId - returns specified user's followers

**Response:**
```json
{
  "success": true,
  "message": "Followers retrieved",
  "data": [
    {
      "_id": "user123",
      "name": "John Doe",
      "userName": "johndoe",
      "image": "https://...",
      "bio": "Streamer"
    }
  ]
}
```

### 1.4 Get Following List
**GET** `/follow/following/:userId?`

### 1.5 Check if Following
**GET** `/follow/status/:followingId`
**Response:**
```json
{
  "success": true,
  "data": {
    "isFollowing": true
  }
}
```

---

## 2. FRIEND REQUEST SYSTEM (`/friend-request`)

### 2.1 Send Friend Request
**POST** `/friend-request/send`
```json
{
  "receiverId": "USER_ID"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Friend request sent successfully",
  "statusCode": 201,
  "data": {
    "_id": "request123",
    "sender": {
      "_id": "sender123",
      "name": "Alice",
      "userName": "alice"
    },
    "receiver": {
      "_id": "receiver123",
      "name": "Bob",
      "userName": "bob"
    },
    "status": "pending",
    "requestedAt": "2026-02-27T10:30:00Z"
  }
}
```
**Triggers:** Notification sent to receiver

### 2.2 Get Pending Requests
**GET** `/friend-request/pending`
**Response:**
```json
{
  "success": true,
  "message": "Pending requests retrieved",
  "data": [
    {
      "_id": "request123",
      "sender": {
        "name": "Alice",
        "userName": "alice",
        "image": "https://..."
      },
      "status": "pending",
      "requestedAt": "2026-02-27T10:30:00Z"
    }
  ]
}
```

### 2.3 Accept Friend Request
**PATCH** `/friend-request/:requestId/accept`
**Response:**
```json
{
  "success": true,
  "message": "Friend request accepted",
  "data": {
    "_id": "request123",
    "status": "accepted",
    "respondedAt": "2026-02-27T11:00:00Z"
  }
}
```
**Triggers:** 
- Both users added to each other's friends list
- Notification sent to sender

### 2.4 Reject Friend Request
**PATCH** `/friend-request/:requestId/reject`
**Triggers:** Notification sent to sender (optional)

### 2.5 Get Friends List
**GET** `/friend-request/list/:userId?`
**Response:**
```json
{
  "success": true,
  "message": "Friends list retrieved",
  "data": [
    {
      "_id": "user123",
      "name": "John Doe",
      "userName": "johndoe",
      "image": "https://...",
      "bio": "My bio"
    }
  ]
}
```

### 2.6 Remove Friend
**DELETE** `/friend-request/:friendId`

---

## 3. MESSAGING SYSTEM (`/message`)

### 3.1 Send Message
**POST** `/message/send`
```json
{
  "receiverId": "USER_ID",
  "content": "Hello! How are you?",
  "type": "text",
  "mediaUrl": "https://... (optional)"
}
```
**Types:** `text`, `image`, `file`

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "statusCode": 201,
  "data": {
    "_id": "msg123",
    "sender": {
      "name": "Alice",
      "userName": "alice"
    },
    "receiver": {
      "name": "Bob",
      "userName": "bob"
    },
    "content": "Hello! How are you?",
    "type": "text",
    "isRead": false,
    "createdAt": "2026-02-27T12:00:00Z"
  }
}
```
**Note:** Only works if users are friends!

### 3.2 Get Conversation
**GET** `/message/conversation/:otherUserId?limit=50`
**Response:**
```json
{
  "success": true,
  "message": "Conversation retrieved",
  "data": [
    {
      "_id": "msg123",
      "sender": {...},
      "receiver": {...},
      "content": "Hello!",
      "type": "text",
      "isRead": true,
      "createdAt": "2026-02-27T12:00:00Z"
    }
  ]
}
```

### 3.3 Get Conversations List
**GET** `/message/list`
**Response:**
```json
{
  "success": true,
  "message": "Conversations list retrieved",
  "data": [
    {
      "userId": "user123",
      "lastMessage": {
        "content": "See you later!",
        "createdAt": "2026-02-27T13:00:00Z",
        "sender": {...},
        "receiver": {...}
      },
      "unreadCount": 3
    }
  ]
}
```

### 3.4 Mark Messages as Read
**PATCH** `/message/read/:otherUserId`

### 3.5 Get Unread Count
**GET** `/message/unread/count`
**Response:**
```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

### 3.6 Delete Message
**DELETE** `/message/:messageId`

---

## 4. NOTIFICATION SYSTEM (`/notification`)

### 4.1 Get All Notifications
**GET** `/notification?limit=20&skip=0`
**Response:**
```json
{
  "success": true,
  "message": "Notifications retrieved",
  "data": {
    "notifications": [
      {
        "_id": "notif123",
        "type": "friend_request_received",
        "content": "Alice sent you a friend request",
        "relatedUser": {
          "name": "Alice",
          "userName": "alice",
          "image": "https://..."
        },
        "actionUrl": "/friend-request/req123",
        "icon": "https://...",
        "read": false,
        "createdAt": "2026-02-27T10:30:00Z"
      },
      {
        "_id": "notif124",
        "type": "friend_request_accepted",
        "content": "Bob accepted your friend request",
        "relatedUser": {...},
        "read": true,
        "createdAt": "2026-02-27T09:00:00Z"
      }
    ],
    "total": 15
  }
}
```

### 4.2 Get Unread Count
**GET** `/notification/unread/count`
**Response:**
```json
{
  "success": true,
  "data": {
    "unreadCount": 3
  }
}
```

### 4.3 Mark Notification as Read
**PATCH** `/notification/:notificationId/read`

### 4.4 Mark All as Read
**PATCH** `/notification/read/all`

### 4.5 Delete Notification
**DELETE** `/notification/:notificationId`

### 4.6 Clear All Notifications
**DELETE** `/notification/clear/all`

---

## NOTIFICATION TYPES

| Type | Description | Triggered By |
|------|-------------|--------------|
| `friend_request_received` | Someone sent you friend request | Friend request sent |
| `friend_request_accepted` | Your request was accepted | Request accepted |
| `friend_request_rejected` | Your request was rejected | Request rejected |
| `gift_received` | You received a gift | Gift sent (future) |
| `subscription_purchased` | Someone subscribed to you | Subscription (future) |
| `stream_live` | Streamer went live | Stream started (future) |
| `comment` | New comment on your content | Comment posted (future) |

---

## TESTING WORKFLOW

### Scenario 1: Complete Friend Request Flow
1. **User A** sends friend request to **User B**
   ```
   POST /friend-request/send
   Body: { "receiverId": "userB_id" }
   ```
   → Notification created for User B

2. **User B** checks notifications
   ```
   GET /notification
   ```
   → Sees "User A sent you a friend request"

3. **User B** checks pending requests
   ```
   GET /friend-request/pending
   ```

4. **User B** accepts request
   ```
   PATCH /friend-request/:requestId/accept
   ```
   → Both users now friends
   → Notification created for User A

5. **User A** checks notifications
   ```
   GET /notification
   ```
   → Sees "User B accepted your friend request"

6. **User B** views friends list
   ```
   GET /friend-request/list
   ```
   → User A appears in list

### Scenario 2: Messaging Between Friends
1. **User A** sends message to **User B** (must be friends)
   ```
   POST /message/send
   Body: {
     "receiverId": "userB_id",
     "content": "Hey friend!",
     "type": "text"
   }
   ```

2. **User B** checks conversations list
   ```
   GET /message/list
   ```
   → Sees User A with unread count

3. **User B** opens conversation
   ```
   GET /message/conversation/userA_id
   ```

4. **User B** marks as read
   ```
   PATCH /message/read/userA_id
   ```

### Scenario 3: Following Streamers
1. **User A** follows **Streamer B**
   ```
   POST /follow/follow
   Body: { "followingId": "streamerB_id" }
   ```

2. **Streamer B** checks followers
   ```
   GET /follow/followers
   ```

3. **User A** checks if following
   ```
   GET /follow/status/streamerB_id
   ```
   → Returns { "isFollowing": true }

---

## ERROR CASES TO TEST

### Friend Request Errors
- ❌ Send request to yourself → `400 Bad Request`
- ❌ Send duplicate request → `400 Bad Request`
- ❌ Accept already processed request → `400 Bad Request`
- ❌ Non-receiver tries to accept → `403 Forbidden`

### Message Errors
- ❌ Send message to non-friend → `403 Forbidden`
- ❌ Send message to yourself → `400 Bad Request`

### Follow Errors
- ❌ Follow yourself → `400 Bad Request`
- ❌ Follow already following user → `400 Bad Request`

---

## POSTMAN ENVIRONMENT VARIABLES

```
baseUrl = http://localhost:5000
token = YOUR_JWT_TOKEN
userId = YOUR_USER_ID
otherUserId = ANOTHER_USER_ID
requestId = FRIEND_REQUEST_ID
notificationId = NOTIFICATION_ID
```

## Quick Test Setup

1. Login/Register two users (User A and User B)
2. Save their tokens and IDs
3. Test friend request flow (A → B)
4. Test notification retrieval (B)
5. Test accept request (B)
6. Test messaging (A ↔ B)
7. Test follow system (A → B)
8. Test notification count/read status

---

## Expected Database Changes

After complete friend request acceptance:
- `User A.friends` includes User B
- `User B.friends` includes User A
- `FriendRequest.status` = "accepted"
- 2 notifications created (sent + accepted)

After following:
- `Streamer.followers` includes User
- `User.following` includes Streamer
