# Go Live Features - API Documentation

## Overview
This document covers all APIs and Socket.io events for the **Go Live** feature, including Category management, Gifts, Polls, Stream settings, and real-time controls.

---

## Table of Contents
1. [Category APIs](#category-apis)
2. [Gift APIs](#gift-apis)
3. [Poll APIs](#poll-apis)
4. [Stream APIs (Go Live Features)](#stream-apis-go-live-features)
5. [Socket.io Events](#socketio-events)

---

## Category APIs

### 1. Get All Categories
**GET** `/api/v1/category`

Get all active categories for stream selection.

**Query Parameters:**
```
includeInactive?: boolean (default: false)
```

**Response:**
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "_id": "category_id",
      "title": "Gaming",
      "slug": "gaming",
      "description": "Gaming streams",
      "image": "https://example.com/gaming.jpg",
      "icon": "🎮",
      "isActive": true,
      "order": 1,
      "streamCount": 125,
      "createdAt": "2024-01-20T10:00:00.000Z",
      "updatedAt": "2024-01-20T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Category by ID
**GET** `/api/v1/category/:categoryId`

Get details of a specific category.

**Response:**
```json
{
  "success": true,
  "message": "Category retrieved successfully",
  "data": {
    "_id": "category_id",
    "title": "Gaming",
    "slug": "gaming",
    "description": "Gaming streams",
    "image": "https://example.com/gaming.jpg",
    "icon": "🎮",
    "isActive": true,
    "order": 1,
    "streamCount": 125
  }
}
```

---

### 3. Create Category (Admin Only)
**POST** `/api/v1/category`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "title": "Gaming",
  "description": "Gaming streams and esports",
  "image": "https://example.com/gaming.jpg",
  "icon": "🎮",
  "order": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "_id": "category_id",
    "title": "Gaming",
    "slug": "gaming",
    "description": "Gaming streams and esports",
    "image": "https://example.com/gaming.jpg",
    "icon": "🎮",
    "isActive": true,
    "order": 1,
    "streamCount": 0,
    "createdAt": "2024-01-20T10:00:00.000Z",
    "updatedAt": "2024-01-20T10:00:00.000Z"
  }
}
```

---

### 4. Update Category (Admin Only)
**PUT** `/api/v1/category/:categoryId`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "title": "Gaming & Esports",
  "isActive": true,
  "order": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "_id": "category_id",
    "title": "Gaming & Esports",
    "slug": "gaming-esports",
    "isActive": true,
    "order": 2
  }
}
```

---

### 5. Delete Category (Admin Only)
**DELETE** `/api/v1/category/:categoryId`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Category deleted successfully",
  "data": null
}
```

---

## Gift APIs

### 1. Get All Gifts
**GET** `/api/v1/gift`

Get all active gifts available for sending.

**Query Parameters:**
```
includeInactive?: boolean (default: false)
```

**Response:**
```json
{
  "success": true,
  "message": "Gifts retrieved successfully",
  "data": [
    {
      "_id": "gift_id",
      "name": "Rose",
      "description": "A beautiful rose",
      "image": "https://example.com/rose.png",
      "animation": "https://example.com/rose.json",
      "price": 100,
      "category": "basic",
      "isActive": true,
      "order": 1,
      "createdAt": "2024-01-20T10:00:00.000Z",
      "updatedAt": "2024-01-20T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Gifts by Category
**GET** `/api/v1/gift/category/:category`

Get gifts filtered by category.

**Categories:** `basic`, `premium`, `luxury`, `exclusive`

**Response:**
```json
{
  "success": true,
  "message": "Gifts retrieved successfully",
  "data": [...]
}
```

---

### 3. Send Gift to Streamer
**POST** `/api/v1/gift/send/:streamId`

**Headers:**
```
Authorization: Bearer <user_token>
```

**Request Body:**
```json
{
  "giftId": "gift_id",
  "quantity": 5,
  "message": "Great stream!",
  "isAnonymous": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Gift sent successfully",
  "data": {
    "_id": "transaction_id",
    "sender": {
      "_id": "user_id",
      "name": "John Doe",
      "avatar": "https://example.com/avatar.jpg"
    },
    "receiver": {
      "_id": "streamer_id",
      "name": "Jane Streamer"
    },
    "stream": "stream_id",
    "gift": {
      "_id": "gift_id",
      "name": "Rose",
      "image": "https://example.com/rose.png",
      "animation": "https://example.com/rose.json",
      "price": 100
    },
    "quantity": 5,
    "totalAmount": 500,
    "message": "Great stream!",
    "isAnonymous": false,
    "status": "completed",
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

---

### 4. Get Stream Gifts
**GET** `/api/v1/gift/stream/:streamId/list`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Stream gifts retrieved successfully",
  "data": [
    {
      "_id": "transaction_id",
      "sender": {
        "name": "John Doe",
        "avatar": "https://example.com/avatar.jpg"
      },
      "gift": {
        "name": "Rose",
        "image": "https://example.com/rose.png"
      },
      "quantity": 5,
      "totalAmount": 500,
      "createdAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

---

### 5. Get Streamer Received Gifts
**GET** `/api/v1/gift/streamer/received`

**Headers:**
```
Authorization: Bearer <streamer_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Streamer gifts retrieved successfully",
  "data": [...]
}
```

---

### 6. Create Gift (Admin Only)
**POST** `/api/v1/gift`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "name": "Diamond",
  "description": "A precious diamond",
  "image": "https://example.com/diamond.png",
  "animation": "https://example.com/diamond.json",
  "price": 5000,
  "category": "luxury",
  "order": 10
}
```

**Response:**
```json
{
  "success": true,
  "message": "Gift created successfully",
  "data": {
    "_id": "gift_id",
    "name": "Diamond",
    "price": 5000,
    "category": "luxury"
  }
}
```

---

## Poll APIs

### 1. Create Poll
**POST** `/api/v1/poll/stream/:streamId/create`

Create a poll during a live stream (streamer only).

**Headers:**
```
Authorization: Bearer <streamer_token>
```

**Request Body:**
```json
{
  "question": "What game should I play next?",
  "options": ["Fortnite", "Valorant", "Apex Legends", "CS:GO"],
  "duration": 300,
  "allowMultipleVotes": false
}
```

**Validation:**
- `question`: 1-200 characters
- `options`: 2-10 options, each 1-100 characters
- `duration`: 30-3600 seconds (30 seconds to 1 hour)

**Response:**
```json
{
  "success": true,
  "message": "Poll created successfully",
  "data": {
    "_id": "poll_id",
    "stream": "stream_id",
    "streamer": "streamer_id",
    "question": "What game should I play next?",
    "options": [
      {
        "option": "Fortnite",
        "votes": 0,
        "voters": []
      },
      {
        "option": "Valorant",
        "votes": 0,
        "voters": []
      }
    ],
    "duration": 300,
    "startTime": "2024-01-20T10:00:00.000Z",
    "endTime": "2024-01-20T10:05:00.000Z",
    "isActive": true,
    "totalVotes": 0,
    "allowMultipleVotes": false
  }
}
```

---

### 2. Vote on Poll
**POST** `/api/v1/poll/:pollId/vote`

**Headers:**
```
Authorization: Bearer <user_token>
```

**Request Body:**
```json
{
  "optionIndex": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vote cast successfully",
  "data": {
    "_id": "poll_id",
    "question": "What game should I play next?",
    "options": [
      {
        "option": "Fortnite",
        "votes": 1,
        "voters": ["user_id"]
      }
    ],
    "totalVotes": 1,
    "isActive": true
  }
}
```

---

### 3. Get Poll Results
**GET** `/api/v1/poll/:pollId/results`

**Response:**
```json
{
  "success": true,
  "message": "Poll results retrieved successfully",
  "data": {
    "_id": "poll_id",
    "question": "What game should I play next?",
    "options": [
      {
        "option": "Fortnite",
        "votes": 25
      },
      {
        "option": "Valorant",
        "votes": 18
      }
    ],
    "totalVotes": 43,
    "isActive": false,
    "endTime": "2024-01-20T10:05:00.000Z"
  }
}
```

---

### 4. Get Active Poll for Stream
**GET** `/api/v1/poll/stream/:streamId/active`

**Response:**
```json
{
  "success": true,
  "message": "Active poll retrieved successfully",
  "data": {
    "_id": "poll_id",
    "question": "What game should I play next?",
    "options": [...],
    "endTime": "2024-01-20T10:05:00.000Z",
    "isActive": true
  }
}
```

---

### 5. Get All Polls for Stream
**GET** `/api/v1/poll/stream/:streamId/all`

**Response:**
```json
{
  "success": true,
  "message": "Stream polls retrieved successfully",
  "data": [...]
}
```

---

### 6. End Poll
**POST** `/api/v1/poll/:pollId/end`

**Headers:**
```
Authorization: Bearer <streamer_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Poll ended successfully",
  "data": {
    "_id": "poll_id",
    "isActive": false
  }
}
```

---

### 7. Delete Poll
**DELETE** `/api/v1/poll/:pollId`

**Headers:**
```
Authorization: Bearer <streamer_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Poll deleted successfully",
  "data": null
}
```

---

## Stream APIs (Go Live Features)

### 1. Start Stream
**POST** `/api/v1/stream/start`

**Headers:**
```
Authorization: Bearer <user_token>
```

**Request Body:**
```json
{
  "title": "Epic Gaming Session",
  "description": "Playing Valorant with viewers",
  "category": "category_id",
  "contentRating": "PG-13",
  "banner": "https://example.com/banner.jpg",
  "bannerPosition": "top",
  "visibility": "public",
  "allowComments": true,
  "allowGifts": true,
  "enablePolls": true,
  "enableAdBanners": false,
  "isAgeRestricted": false,
  "isRecordingEnabled": true,
  "background": "",
  "tags": ["gaming", "valorant", "live"]
}
```

**Field Details:**
- `contentRating`: "G" | "PG" | "PG-13" | "R" | "18+"
- `bannerPosition`: "top" | "bottom" | "center"
- `visibility`: "public" | "followers" | "subscribers"

**Response:**
```json
{
  "success": true,
  "message": "Stream started successfully",
  "data": {
    "_id": "stream_id",
    "streamer": {
      "_id": "user_id",
      "name": "John Streamer",
      "avatar": "https://example.com/avatar.jpg"
    },
    "title": "Epic Gaming Session",
    "category": "category_id",
    "visibility": "public",
    "status": "live",
    "agora": {
      "channelName": "stream_123_1234567890",
      "token": "agora_rtc_token",
      "uid": 12345,
      "expiryTime": "2024-01-20T11:00:00.000Z"
    },
    "streamControls": {
      "cameraOn": true,
      "micOn": true,
      "background": ""
    },
    "currentViewerCount": 0,
    "likes": 0,
    "startedAt": "2024-01-20T10:00:00.000Z"
  }
}
```

---

### 2. Update Stream Settings
**PUT** `/api/v1/stream/:streamId/settings`

Update stream settings during live stream.

**Headers:**
```
Authorization: Bearer <streamer_token>
```

**Request Body:**
```json
{
  "title": "Updated Stream Title",
  "description": "Updated description",
  "allowComments": false,
  "allowGifts": true,
  "enablePolls": true,
  "enableAdBanners": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stream settings updated successfully",
  "data": {
    "_id": "stream_id",
    "title": "Updated Stream Title",
    "allowComments": false,
    "allowGifts": true,
    "enablePolls": true,
    "enableAdBanners": false
  }
}
```

---

### 3. Toggle Stream Controls
**PUT** `/api/v1/stream/:streamId/controls`

Toggle camera, mic, or background during stream.

**Headers:**
```
Authorization: Bearer <streamer_token>
```

**Request Body:**
```json
{
  "cameraOn": false,
  "micOn": true,
  "background": "blur"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stream controls updated successfully",
  "data": {
    "_id": "stream_id",
    "streamControls": {
      "cameraOn": false,
      "micOn": true,
      "background": "blur"
    }
  }
}
```

---

### 4. Like Stream
**POST** `/api/v1/stream/:streamId/like`

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Stream liked successfully",
  "data": {
    "_id": "stream_id",
    "likes": 124
  }
}
```

---

### 5. Join Stream
**POST** `/api/v1/stream/:streamId/join`

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Joined stream successfully",
  "data": {
    "stream": {
      "_id": "stream_id",
      "title": "Epic Gaming Session",
      "currentViewerCount": 51
    },
    "viewerToken": {
      "token": "agora_subscriber_token",
      "channelName": "stream_123_1234567890",
      "uid": 67890,
      "expiryTime": "2024-01-20T11:00:00.000Z"
    }
  }
}
```

---

### 6. Leave Stream
**POST** `/api/v1/stream/:streamId/leave`

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Left stream successfully",
  "data": {
    "_id": "stream_id",
    "currentViewerCount": 50
  }
}
```

---

### 7. Get Stream Analytics
**GET** `/api/v1/stream/:streamId/analytics`

**Headers:**
```
Authorization: Bearer <streamer_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Stream analytics retrieved successfully",
  "data": {
    "stream": "stream_id",
    "totalViewers": 4070,
    "peakViewers": 5000,
    "likes": 823,
    "giftsReceived": 156,
    "revenue": 493.50,
    "averageWatchTime": 107,
    "newSubscribers": 12,
    "newFollowers": 34,
    "duration": 3671,
    "engagementRate": 45.2
  }
}
```

---

## Socket.io Events

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'user_jwt_token'
  }
});
```

---

### Client → Server Events

#### 1. Join Stream
```javascript
socket.emit('stream:join', {
  streamId: 'stream_id',
  userId: 'user_id'
});
```

**Server Response:**
```javascript
socket.on('stream:viewer-joined', (data) => {
  // data = { userId, streamId, viewerCount }
});
```

---

#### 2. Leave Stream
```javascript
socket.emit('stream:leave', {
  streamId: 'stream_id',
  userId: 'user_id'
});
```

**Server Response:**
```javascript
socket.on('stream:viewer-left', (data) => {
  // data = { userId, streamId, viewerCount }
});
```

---

#### 3. Send Chat Message
```javascript
socket.emit('stream:chat', {
  streamId: 'stream_id',
  userId: 'user_id',
  content: 'Hello everyone!'
});
```

**Server Broadcast:**
```javascript
socket.on('stream:message', (data) => {
  // data = { _id, sender, content, type: 'text', createdAt }
});
```

---

#### 4. Send Gift
```javascript
socket.emit('stream:gift', {
  streamId: 'stream_id',
  userId: 'user_id',
  giftId: 'gift_id',
  quantity: 5,
  message: 'Great stream!',
  isAnonymous: false
});
```

**Server Broadcast:**
```javascript
socket.on('stream:gift-sent', (data) => {
  /* data = {
    transaction: {
      _id, sender, gift, quantity, message, totalAmount
    },
    timestamp
  } */
});
```

---

#### 5. Like Stream
```javascript
socket.emit('stream:like', {
  streamId: 'stream_id',
  userId: 'user_id'
});
```

**Server Broadcast:**
```javascript
socket.on('stream:liked', (data) => {
  // data = { userId, timestamp }
});
```

---

#### 6. Send Emoji Reaction
```javascript
socket.emit('stream:emoji', {
  streamId: 'stream_id',
  userId: 'user_id',
  emoji: '❤️'
});
```

**Server Broadcast:**
```javascript
socket.on('stream:emoji-reaction', (data) => {
  // data = { userId, emoji, timestamp }
});
```

---

#### 7. Create Poll (Streamer Only)
```javascript
socket.emit('stream:create-poll', {
  streamId: 'stream_id',
  streamerId: 'streamer_id',
  question: 'What game next?',
  options: ['Fortnite', 'Valorant', 'CS:GO'],
  duration: 300
});
```

**Server Broadcast:**
```javascript
socket.on('stream:poll-created', (data) => {
  /* data = {
    poll: { _id, question, options, duration, endTime },
    timestamp
  } */
});
```

---

#### 8. Vote on Poll
```javascript
socket.emit('stream:vote-poll', {
  pollId: 'poll_id',
  streamId: 'stream_id',
  userId: 'user_id',
  optionIndex: 0
});
```

**Server Broadcast:**
```javascript
socket.on('stream:poll-updated', (data) => {
  // data = { pollId, options, totalVotes }
});
```

---

#### 9. End Poll (Streamer Only)
```javascript
socket.emit('stream:end-poll', {
  pollId: 'poll_id',
  streamId: 'stream_id'
});
```

**Server Broadcast:**
```javascript
socket.on('stream:poll-ended', (data) => {
  // data = { pollId, results, totalVotes }
});
```

---

#### 10. Update Stream Settings (Streamer Only)
```javascript
socket.emit('stream:settings-changed', {
  streamId: 'stream_id',
  settings: {
    allowComments: false,
    allowGifts: true,
    enablePolls: true
  }
});
```

**Server Broadcast:**
```javascript
socket.on('stream:settings-updated', (data) => {
  // data = { settings, timestamp }
});
```

---

#### 11. Update Stream Controls (Streamer Only)
```javascript
socket.emit('stream:controls-changed', {
  streamId: 'stream_id',
  controls: {
    cameraOn: false,
    micOn: true
  }
});
```

**Server Broadcast:**
```javascript
socket.on('stream:controls-updated', (data) => {
  // data = { controls, timestamp }
});
```

---

### Server → Client Events

#### 1. Viewer Count Update
```javascript
socket.on('stream:viewer-count', (data) => {
  // data = { count, timestamp }
});
```

---

#### 2. Error Handling
```javascript
socket.on('error', (error) => {
  console.error(error.message);
});
```

---

## Error Responses

All APIs follow this error format:

```json
{
  "success": false,
  "message": "Error message",
  "errorMessages": [
    {
      "path": "field_name",
      "message": "Detailed error message"
    }
  ],
  "stack": "Error stack trace (development only)"
}
```

**Common Error Codes:**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error

---

## Rate Limiting

- **Gift sending**: Max 10 gifts per minute per user
- **Poll voting**: Max 1 vote per poll per user
- **Chat messages**: Max 5 messages per second per user

---

## Notes

1. All timestamps are in ISO 8601 format (UTC)
2. Prices are in USD cents (e.g., 100 = $1.00)
3. Agora tokens expire after 1 hour
4. Polls auto-end after specified duration
5. Anonymous gifts hide sender information from broadcast but are stored in database

---

**Last Updated:** January 20, 2024
