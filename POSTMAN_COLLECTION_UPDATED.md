# Postman Collection - Live Streaming API (Updated)

**Version:** 2.0  
**Date:** January 24, 2026  
**Changes:** Form-data support for file uploads

---

## 🚀 Quick Start

### 1. Import Collection
1. Postman খুলুন
2. Import → File → Select this JSON file
3. Collection "Live Streaming API" import হবে

### 2. Setup Environment
Environment create করুন এবং এই variables add করুন:

```
baseUrl: http://localhost:5000/api/v1
userToken: <Get from login API>
adminToken: <Get from admin login>
categoryId: <Get from category list API>
streamId: <Get from stream start response>
```

---

## 📋 All Endpoints (19 Total)

### Public Endpoints (No Auth)
1. GET `/stream/live` - Browse live streams
2. GET `/stream/search?q=gaming` - Search streams
3. GET `/stream/:streamId` - Stream details
4. GET `/stream/streamer/:streamerId/history` - Streamer's past streams
5. GET `/category` - List all categories
6. GET `/analytics/realtime` - Real-time stats
7. GET `/analytics/category/:categoryId` - Category analytics

### Protected Endpoints (Need Auth Token)

**Stream Management:**
8. POST `/stream/start` - Start new stream (FORM-DATA)
9. POST `/stream/:streamId/end` - End stream
10. POST `/stream/:streamId/join` - Join as viewer
11. POST `/stream/:streamId/leave` - Leave stream
12. POST `/stream/:streamId/like` - Like stream
13. POST `/stream/:streamId/chat` - Send chat message
14. PUT `/stream/:streamId/settings` - Update settings
15. PUT `/stream/:streamId/controls` - Toggle controls
16. GET `/stream/:streamId/analytics` - Stream analytics

**Analytics Dashboard:**
17. GET `/analytics/my-dashboard` - Personal dashboard
18. GET `/analytics/streamer/:streamerId` - Streamer analytics
19. GET `/analytics/comparison` - Month comparison

**Admin Only:**
20. GET `/analytics/platform` - Platform analytics

---

## 🎯 Most Important APIs

### 1. Start Stream (FORM-DATA) ⭐⭐⭐

**Endpoint:** `POST {{baseUrl}}/stream/start`

**Headers:**
```
Authorization: Bearer {{userToken}}
Content-Type: multipart/form-data
```

**Body Type:** form-data (NOT JSON!)

**Fields:**

| Field | Type | Value Example | Required |
|-------|------|---------------|----------|
| title | Text | "Epic Gaming Session" | ✓ |
| description | Text | "Playing Valorant live!" | ✗ |
| category | Text | "{{categoryId}}" | ✓ |
| banner | File | banner.jpg | ✗ |
| allowComments | Text | "true" | ✗ |
| allowGifts | Text | "true" | ✗ |
| tags | Text | "gaming,live,valorant" | ✗ |

**⚠️ Important:**
- Boolean values must be STRING: `"true"` not `true`
- Tags: comma-separated string or JSON array
- Banner: Select file type in Postman

**cURL:**
```bash
curl --location 'http://localhost:5000/api/v1/stream/start' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--form 'title="Epic Gaming"' \
--form 'category="507f1f77bcf86cd799439011"' \
--form 'allowComments="true"' \
--form 'tags="gaming,live"' \
--form 'banner=@"/path/to/image.jpg"'
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "_id": "stream_id_here",
    "agora": {
      "channelName": "stream_xxx",
      "token": "AGORA_TOKEN_HERE",
      "uid": 12345,
      "expiryTime": "2026-01-24T01:30:00Z"
    },
    "status": "live"
  }
}
```

**Save:** `data._id` → {{streamId}}

---

### 2. Get Live Streams

**Endpoint:** `GET {{baseUrl}}/stream/live`

**Query Params:**
- `page=1`
- `limit=20`
- `category={{categoryId}}` (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "xxx",
      "title": "Gaming Stream",
      "streamer": { "name": "John" },
      "currentViewerCount": 150,
      "status": "live"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

---

### 3. Join Stream

**Endpoint:** `POST {{baseUrl}}/stream/{{streamId}}/join`

**Headers:**
```
Authorization: Bearer {{userToken}}
```

**Body:** Empty

**Response:**
```json
{
  "success": true,
  "data": {
    "currentViewerCount": 151,
    "agora": {
      "channelName": "stream_xxx",
      "token": "viewer_token_here"
    }
  }
}
```

---

### 4. Send Chat Message

**Endpoint:** `POST {{baseUrl}}/stream/{{streamId}}/chat`

**Headers:**
```
Authorization: Bearer {{userToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "content": "Amazing stream! 🔥",
  "type": "text"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "msg_id",
    "content": "Amazing stream! 🔥",
    "sender": {
      "name": "You"
    },
    "createdAt": "2026-01-24T00:30:00Z"
  }
}
```

---

### 5. End Stream

**Endpoint:** `POST {{baseUrl}}/stream/{{streamId}}/end`

**Headers:**
```
Authorization: Bearer {{userToken}}
```

**Body:** Empty

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ended",
    "duration": 3600,
    "peakViewerCount": 250
  }
}
```

---

### 6. Get Categories

**Endpoint:** `GET {{baseUrl}}/category`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Gaming",
      "image": "url",
      "streamCount": 45
    }
  ]
}
```

**Save:** `data[0]._id` → {{categoryId}}

---

### 7. My Analytics Dashboard

**Endpoint:** `GET {{baseUrl}}/analytics/my-dashboard`

**Headers:**
```
Authorization: Bearer {{userToken}}
```

**Query Params:**
- `startDate=2026-01-01` (optional)
- `endDate=2026-01-31` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalStreams": 45,
      "totalViewers": 2500,
      "avgViewers": 55,
      "totalRevenue": 5600
    },
    "giftsBreakdown": [...],
    "recentStreams": [...],
    "growthData": [...]
  }
}
```

---

## 🔧 Troubleshooting

### Error: "Title is required"
**Fix:** Make sure `title` field exists in form-data

### Error: "Category is required"
**Fix:** Get category ID from `/category` endpoint first

### Error: "File too large"
**Fix:** Banner must be under 10MB

### Error: "User not authenticated"
**Fix:** 
1. Check Authorization header: `Bearer {token}`
2. Get fresh token from login API
3. Token format must be exact

### Error: "Only .png, .jpg, .jpeg, .webp files allowed"
**Fix:** Check banner file type

---

## 📱 Testing Flow

### Complete Test Scenario:

1. **Login** → Get auth token
2. **Get Categories** → Get category ID
3. **Start Stream** → Use form-data with banner
4. **Join Stream** → As another user
5. **Send Chat** → Test real-time messaging
6. **Like Stream** → Test engagement
7. **Check Analytics** → View stats
8. **End Stream** → Close broadcast

---

## 🎯 Form-Data vs JSON

### When to use Form-Data:
- ✓ POST `/stream/start` - Has banner upload
- ✓ POST `/create-category` - Has image upload
- ✓ PUT `/category/:id` - Has image upload

### When to use JSON:
- ✓ POST `/stream/:id/chat` - Text only
- ✓ PUT `/stream/:id/settings` - No files
- ✓ All GET requests
- ✓ All analytics endpoints

---

## 📝 Notes

1. **Boolean in Form-Data:**
   ```
   Correct: allowComments = "true"
   Wrong:   allowComments = true
   ```

2. **Tags in Form-Data:**
   ```
   Option 1: "gaming,live,fun"
   Option 2: ["gaming","live","fun"]
   ```

3. **File Upload:**
   - Click dropdown next to Key
   - Select "File" type
   - Click "Select Files"

4. **Save Important IDs:**
   - categoryId
   - streamId
   - userId
   - token

---

**Last Updated:** January 24, 2026  
**API Version:** v1  
**Total Endpoints:** 19 (Stream: 13, Analytics: 6)
