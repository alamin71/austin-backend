# Live Streaming API Documentation

## Overview

VidZo's live streaming feature enables users to broadcast real-time video content using Agora's RTC (Real-Time Communication) infrastructure. The system supports:
- Live streaming with Agora integration
- Real-time chat during streams
- Gift sending and emoji reactions
- Stream analytics and viewer tracking
- Stream history and search

---

## Database Models

### 1. Stream
Stores all information about a live or ended stream.

**Fields:**
- `streamer` (ObjectId) - Reference to User who is streaming
- `title` (String) - Stream title
- `description` (String) - Stream description
- `category` (ObjectId) - Reference to Category
- `contentRating` (String) - G, PG, PG-13, R, 18+
- `banner` (String) - Stream banner image URL
- `status` (String) - "scheduled", "live", "ended"
- `agora` (Object) - Agora configuration:
  - `channelName` (String)
  - `token` (String)
  - `uid` (Number)
  - `expiryTime` (Date)
- `viewers` (Array) - Array of viewer User IDs
- `currentViewerCount` (Number) - Current live viewers
- `peakViewerCount` (Number) - Peak viewers during stream
- `startedAt` (Date) - When stream went live
- `endedAt` (Date) - When stream ended
- `duration` (Number) - Duration in seconds
- `chat` (Array) - Array of Message IDs
- `gifts` (Array) - Array of Gift IDs
- `polls` (Array) - Array of Poll IDs
- `analytics` (ObjectId) - Reference to StreamAnalytics
- `allowComments` (Boolean) - Enable/disable comments
- `allowGifts` (Boolean) - Enable/disable gifts
- `isAgeRestricted` (Boolean) - Age restriction flag
- `isRecordingEnabled` (Boolean) - Enable recording
- `tags` (Array) - Stream tags for search
- `timestamps` - createdAt, updatedAt

### 2. StreamAnalytics
Tracks performance metrics for a stream.

**Fields:**
- `stream` (ObjectId) - Reference to Stream
- `totalViewers` (Number) - Total unique viewers
- `peakViewers` (Number) - Peak concurrent viewers
- `giftsReceived` (Number) - Total gifts received
- `duration` (Number) - Stream duration in seconds
- `likes` (Number) - Total likes
- `newSubscribers` (Number) - New subscriptions
- `newFollowers` (Number) - New followers
- `revenue` (Number) - Revenue generated
- `chatCount` (Number) - Total messages
- `avgEngagementRate` (Number) - Engagement percentage
- `viewerRetention` (Number) - Retention percentage
- `growthStats` (Object):
  - `subscribersGain`
  - `followersGain`
  - `likesGain`

### 3. Message
Real-time chat messages during streams.

**Fields:**
- `stream` (ObjectId) - Reference to Stream
- `sender` (ObjectId) - Reference to User
- `content` (String) - Message content (max 500 chars)
- `type` (String) - "text", "emoji", "gift", "system"
- `messageData` (Object) - Type-specific data:
  - `giftId` (ObjectId)
  - `giftAmount` (Number)
  - `giftName` (String)
- `isModerated` (Boolean) - Moderation flag
- `isPinned` (Boolean) - Pinned message flag
- `timestamps` - createdAt, updatedAt

---

## REST API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/stream/live` | No | Get paginated live streams with optional category filter |
| GET | `/api/v1/stream/search` | No | Search streams by title, description, tags |
| GET | `/api/v1/stream/streamer/{streamerId}/history` | No | Get streamer's past streams |
| GET | `/api/v1/stream/{streamId}` | No | Get single stream details with Agora token |
| POST | `/api/v1/stream/start` | Yes | Start a new stream |
| POST | `/api/v1/stream/{streamId}/end` | Yes | End an active stream |
| POST | `/api/v1/stream/{streamId}/join` | Yes | Add user as viewer to stream |
| POST | `/api/v1/stream/{streamId}/leave` | Yes | Remove user from stream viewers |
| POST | `/api/v1/stream/{streamId}/like` | Yes | Like a stream |
| POST | `/api/v1/stream/{streamId}/chat` | Yes | Send chat message during stream |
| PUT | `/api/v1/stream/{streamId}/settings` | Yes | Update stream settings (title, description) |
| PUT | `/api/v1/stream/{streamId}/controls` | Yes | Toggle stream controls (comments, gifts) |
| GET | `/api/v1/stream/{streamId}/analytics` | Yes | Get stream analytics data |

---

## REST API Endpoints

### Public Endpoints

#### Get Live Streams
```
GET /api/v1/stream/live?page=1&limit=20&category={categoryId}
```

**Response:**
```json
{
  "success": true,
  "message": "Live streams retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Gaming Stream",
      "streamer": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Streamer Name",
        "avatar": "url"
      },
      "category": {
        "_id": "507f1f77bcf86cd799439013",
        "title": "Gaming"
      },
      "currentViewerCount": 150,
      "startedAt": "2024-01-19T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPage": 3
  }
}
```

#### Search Streams
```
GET /api/v1/stream/search?q={searchQuery}&page=1&limit=20
```

**Query Parameters:**
- `q` - Search query (searches title, description, tags)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

**Response:**
```json
{
  "success": true,
  "message": "Streams found",
  "data": [ { ... } ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPage": 1
  }
}
```

#### Get Streamer History
```
GET /api/v1/stream/streamer/{streamerId}/history?page=1&limit=20
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

**Response:**
```json
{
  "success": true,
  "message": "Streamer history retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Past Gaming Stream",
      "status": "ended",
      "duration": 3600,
      "currentViewerCount": 150,
      "peakViewerCount": 250,
      "startedAt": "2024-01-19T10:00:00Z",
      "endedAt": "2024-01-19T11:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPage": 1
  }
}
```

#### Get Stream Details
```
GET /api/v1/stream/{streamId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Gaming Stream",
    "description": "Epic gaming session",
    "streamer": { ... },v
    "category": { ... },
    "status": "live",
    "agora": {
      "channelName": "stream_507f...",
      "token": "agora_token_xyz...",
      "uid": 12345,
      "expiryTime": "2024-01-19T11:00:00Z"
    },
    "currentViewerCount": 150,
    "peakViewerCount": 200,
    "startedAt": "2024-01-19T10:00:00Z",
    "allowComments": true,
    "allowGifts": true,
    "analytics": { ... }
  }
}
```

#### Search Streams
```
GET /api/v1/stream/search?q=gaming&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "message": "Streams search results retrieved successfully",
  "data": [ ... ],
  "meta": { ... }
}
```

#### Get Streamer History
```
GET /api/v1/stream/streamer/{streamerId}/history?page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "message": "Streamer history retrieved successfully",
  "data": [
    {
      "_id": "507f...",
      "title": "Past Stream",
      "status": "ended",
      "duration": 3600,
      "viewers": 150,
      "createdAt": "2024-01-19T10:00:00Z"
    }
  ],
  "meta": { ... }
}
```

---

### Protected Endpoints (Requires Authentication)

#### Start a Stream
```
POST /api/v1/stream/start
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "My Gaming Stream",
  "description": "Epic gaming session with friends",
  "category": "507f1f77bcf86cd799439013",
  "contentRating": "PG-13",
  "banner": "https://example.com/banner.jpg",
  "allowComments": true,
  "allowGifts": true,
  "isAgeRestricted": false,
  "isRecordingEnabled": true,
  "tags": ["gaming", "live", "twitch"]
}
```

#### End a Stream
```
POST /api/v1/stream/{streamId}/end
Authorization: Bearer {token}
```

#### Join Stream (Add Viewer)
```
POST /api/v1/stream/{streamId}/join
Authorization: Bearer {token}
```

#### Leave Stream (Remove Viewer)
```
POST /api/v1/stream/{streamId}/leave
Authorization: Bearer {token}
```

#### Like Stream
```
POST /api/v1/stream/{streamId}/like
Authorization: Bearer {token}
```

#### Send Chat Message
```
POST /api/v1/stream/{streamId}/chat
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Amazing stream!",
  "type": "text"
}
```

#### Update Stream Settings
```
PUT /api/v1/stream/{streamId}/settings
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "allowComments": true,
  "allowGifts": false
}
```

#### Toggle Stream Controls
```
PUT /api/v1/stream/{streamId}/controls
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "allowComments": true,
  "allowGifts": true,
  "isAgeRestricted": false
}
```

#### Get Stream Analytics
```
GET /api/v1/stream/{streamId}/analytics
Authorization: Bearer {token}
```

---

## Socket.io Events

### Join Stream
```javascript
socket.emit('stream:join', {
  streamId: '507f1f77bcf86cd799439011',
  userId: '507f1f77bcf86cd799439021'
});

// Listen for viewers joining
socket.on('stream:viewer-joined', (data) => {
  console.log(`User ${data.userId} joined stream`);
});
```

### Leave Stream
```javascript
socket.emit('stream:leave', {
  streamId: '507f1f77bcf86cd799439011',
  userId: '507f1f77bcf86cd799439021'
});

// Listen for viewers leaving
socket.on('stream:viewer-left', (data) => {
  console.log(`User ${data.userId} left stream`);
});
```

### Send Chat Message
```javascript
socket.emit('stream:chat', {
  streamId: '507f1f77bcf86cd799439011',
  userId: '507f1f77bcf86cd799439021',
  content: 'Amazing stream!'
});

// Listen for new messages
socket.on('stream:message', (message) => {
  console.log(`${message.sender.name}: ${message.content}`);
});
```

### Send Gift
```javascript
socket.emit('stream:gift', {
  streamId: '507f1f77bcf86cd799439011',
  userId: '507f1f77bcf86cd799439021',
  giftId: 'gift_123',
  amount: 50
});

// Listen for gifts
socket.on('stream:gift-sent', (data) => {
  console.log(`Gift worth ${data.amount} received`);
});
```

### Like Stream
```javascript
socket.emit('stream:like', {
  streamId: '507f1f77bcf86cd799439011',
  userId: '507f1f77bcf86cd799439021'
});

// Listen for likes
socket.on('stream:liked', (data) => {
  console.log(`User liked the stream`);
});
```

### Emoji Reaction
```javascript
socket.emit('stream:emoji', {
  streamId: '507f1f77bcf86cd799439011',
  userId: '507f1f77bcf86cd799439021',
  emoji: '😍'
});

// Listen for emoji reactions
socket.on('stream:emoji-reaction', (data) => {
  console.log(`User reacted with ${data.emoji}`);
});
```

### Update Viewer Count
```javascript
socket.emit('stream:update-viewer-count', {
  streamId: '507f1f77bcf86cd799439011',
  viewerCount: 150
});

// Listen for viewer count updates
socket.on('stream:viewer-count', (data) => {
  console.log(`Current viewers: ${data.count}`);
});
```

---

## Agora Configuration

Add the following environment variables to your `.env` file:

```env
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate
```

Obtain these credentials from [Agora Console](https://console.agora.io):
1. Sign up/Log in to Agora Console
2. Create a new project
3. Copy the App ID and App Certificate
4. Add them to your `.env` file

---

## Error Handling

### Common Errors

**400 Bad Request - Missing required fields**
```json
{
  "success": false,
  "message": "Title is required",
  "statusCode": 400
}
```

**401 Unauthorized - Not authenticated**
```json
{
  "success": false,
  "message": "User not authenticated",
  "statusCode": 401
}
```

**404 Not Found - Stream doesn't exist**
```json
{
  "success": false,
  "message": "Stream not found",
  "statusCode": 404
}
```

**500 Internal Server Error - Agora token generation failed**
```json
{
  "success": false,
  "message": "Failed to generate Agora token",
  "statusCode": 500
}
```

---

## Best Practices

### For Streamers
1. **Test stream settings** before going live
2. **Enable moderation** for larger audiences
3. **Set appropriate content rating** for your content
4. **Use tags** to improve discoverability
5. **Interact with viewers** through chat

### For Viewers
1. **Connect to the Agora channel** using the provided token
2. **Send messages** via socket.io for real-time chat
3. **Send gifts** to support your favorite streamers
4. **Use emoji reactions** to engage with content

### For Developers
1. **Always include authentication** for protected endpoints
2. **Validate Agora tokens** before using them
3. **Implement proper error handling** for socket connections
4. **Cache stream data** for frequently accessed streams
5. **Monitor Agora API** for any rate limits

---

## Performance Considerations

1. **Pagination** - Use pagination for listing streams to reduce data transfer
2. **Text Indexing** - Search is optimized with full-text indexes
3. **Viewer Tracking** - Viewer count updates are broadcast efficiently
4. **Analytics** - Batch analytics updates to reduce database writes
5. **Chat Moderation** - Implement spam filters for high-volume chats

---

## Future Enhancements

- [ ] HD streaming support
- [ ] Multi-guest streaming
- [ ] Custom filters and effects
- [ ] Stream monetization (tips, subscriptions)
- [ ] Advanced analytics dashboard
- [ ] Stream scheduling with notifications
- [ ] Automatic recording and VOD (Video on Demand)
- [ ] Stream clips and highlights
- [ ] Social media integration
- [ ] AI-powered content moderation

---

## Support

For issues or questions:
- Check the [Agora Documentation](https://docs.agora.io)
- Review error messages in server logs
- Test with Agora sample applications
- Contact support with detailed error logs
