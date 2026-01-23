# Quick Reference - API Endpoints & Examples

সব Go Live APIs এর quick reference চার্ট।

---

## 📊 Category APIs

| Action | Method | Endpoint | Auth Required | Body |
|--------|--------|----------|---|------|
| Get All Categories | GET | `/category` | ❌ | - |
| Get Category by ID | GET | `/category/:id` | ❌ | - |
| Create Category | POST | `/category` | ✅ Admin | `{title, icon, description, image, order}` |
| Update Category | PUT | `/category/:id` | ✅ Admin | `{title?, icon?, order?}` |
| Delete Category | DELETE | `/category/:id` | ✅ Admin | - |

---

## 🎁 Gift APIs

| Action | Method | Endpoint | Auth Required | Body |
|--------|--------|----------|---|------|
| Get All Gifts | GET | `/gift` | ❌ | - |
| Get Gifts by Category | GET | `/gift/category/:category` | ❌ | - |
| Create Gift | POST | `/gift` | ✅ Admin | `{name, price, category, image, animation?}` |
| Update Gift | PUT | `/gift/:id` | ✅ Admin | `{name?, price?, category?, isActive?}` |
| Delete Gift | DELETE | `/gift/:id` | ✅ Admin | - |
| Send Gift to Streamer | POST | `/gift/stream/:streamId` | ✅ User | `{giftId, quantity, message?, isAnonymous}` |
| Get Stream Gifts | GET | `/gift/stream/:streamId/list` | ✅ User | - |
| Get Streamer Gifts | GET | `/gift/streamer/received` | ✅ Streamer | - |

---

## 📊 Poll APIs

| Action | Method | Endpoint | Auth Required | Body |
|--------|--------|----------|---|------|
| Create Poll | POST | `/poll/stream/:streamId/create` | ✅ Streamer | `{question, options[], duration, allowMultipleVotes}` |
| Vote on Poll | POST | `/poll/:pollId/vote` | ✅ User | `{optionIndex}` |
| Get Poll Results | GET | `/poll/:pollId/results` | ❌ | - |
| Get Active Poll | GET | `/poll/stream/:streamId/active` | ❌ | - |
| Get All Polls | GET | `/poll/stream/:streamId/all` | ❌ | - |
| End Poll | POST | `/poll/:pollId/end` | ✅ Streamer | - |
| Delete Poll | DELETE | `/poll/:pollId` | ✅ Streamer | - |

---

## 📺 Stream APIs

| Action | Method | Endpoint | Auth Required | Body |
|--------|--------|----------|---|------|
| Start Stream | POST | `/stream/start` | ✅ Streamer | See below |
| Get Stream Details | GET | `/stream/:streamId` | ❌ | - |
| Get Live Streams | GET | `/stream/live` | ❌ | - |
| Join Stream | POST | `/stream/:streamId/join` | ✅ User | `{}` |
| Leave Stream | POST | `/stream/:streamId/leave` | ✅ User | `{}` |
| Like Stream | POST | `/stream/:streamId/like` | ✅ User | `{}` |
| Update Settings | PUT | `/stream/:streamId/settings` | ✅ Streamer | `{title?, description?, allowComments?, allowGifts?...}` |
| Toggle Controls | PUT | `/stream/:streamId/controls` | ✅ Streamer | `{cameraOn?, micOn?, background?}` |
| Get Analytics | GET | `/stream/:streamId/analytics` | ✅ Streamer | - |
| Send Chat Message | POST | `/stream/:streamId/chat` | ✅ User | `{content, type?}` |
| End Stream | POST | `/stream/:streamId/end` | ✅ Streamer | `{}` |

---

## 🎯 Start Stream Body (Full Example)

```json
{
  "title": "Epic Gaming Session",
  "description": "Playing Valorant with viewers",
  "category": "category_id_here",
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

**Content Rating Options:** `G | PG | PG-13 | R | 18+`
**Banner Position:** `top | bottom | center`
**Visibility:** `public | followers | subscribers`

---

## 🔑 Authorization Headers

```
Authorization: Bearer {{userToken}}
Content-Type: application/json
```

**Roles:**
- `{{userToken}}` - Regular user (viewer)
- `{{streamerToken}}` - Streamer/Business user
- `{{adminToken}}` - Admin user

---

## 💬 Socket.io Events Cheat Sheet

### Client to Server Events

```javascript
// Join stream
socket.emit('stream:join', {streamId, userId})

// Leave stream
socket.emit('stream:leave', {streamId, userId})

// Send chat
socket.emit('stream:chat', {streamId, userId, content})

// Send gift
socket.emit('stream:gift', {streamId, userId, giftId, quantity, message?, isAnonymous})

// Like stream
socket.emit('stream:like', {streamId, userId})

// Send emoji
socket.emit('stream:emoji', {streamId, userId, emoji})

// Create poll
socket.emit('stream:create-poll', {streamId, streamerId, question, options[], duration})

// Vote on poll
socket.emit('stream:vote-poll', {pollId, streamId, userId, optionIndex})

// End poll
socket.emit('stream:end-poll', {pollId, streamId})

// Update settings
socket.emit('stream:settings-changed', {streamId, settings})

// Update controls
socket.emit('stream:controls-changed', {streamId, controls})
```

### Server to Client Events (Listen)

```javascript
// Viewer joined/left
socket.on('stream:viewer-joined', (data) => {})
socket.on('stream:viewer-left', (data) => {})

// New message
socket.on('stream:message', (data) => {})

// Gift sent
socket.on('stream:gift-sent', (data) => {})

// Liked
socket.on('stream:liked', (data) => {})

// Emoji reaction
socket.on('stream:emoji-reaction', (data) => {})

// Poll events
socket.on('stream:poll-created', (data) => {})
socket.on('stream:poll-updated', (data) => {})
socket.on('stream:poll-ended', (data) => {})

// Settings/Controls updated
socket.on('stream:settings-updated', (data) => {})
socket.on('stream:controls-updated', (data) => {})

// Viewer count
socket.on('stream:viewer-count', (data) => {})
```

---

## 🚀 cURL Examples

### Get All Categories
```bash
curl -X GET \
  http://localhost:5000/api/v1/category \
  -H 'Content-Type: application/json'
```

### Start Stream
```bash
curl -X POST \
  http://localhost:5000/api/v1/stream/start \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Gaming Session",
    "category": "category_id",
    "visibility": "public"
  }'
```

### Send Gift
```bash
curl -X POST \
  http://localhost:5000/api/v1/gift/stream/STREAM_ID \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "giftId": "gift_id",
    "quantity": 5,
    "message": "Love it!"
  }'
```

### Create Poll
```bash
curl -X POST \
  http://localhost:5000/api/v1/poll/stream/STREAM_ID/create \
  -H 'Authorization: Bearer STREAMER_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "What next?",
    "options": ["Option 1", "Option 2"],
    "duration": 300
  }'
```

### Vote on Poll
```bash
curl -X POST \
  http://localhost:5000/api/v1/poll/POLL_ID/vote \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "optionIndex": 0
  }'
```

---

## 🦋 Flutter Code Snippets

### Get Categories (Dropdown)
```dart
List<dynamic> categories = await ApiService.getCategories();

DropdownButton<String>(
  items: categories.map((cat) {
    return DropdownMenuItem(
      value: cat['_id'],
      child: Text(cat['icon'] + ' ' + cat['title']),
    );
  }).toList(),
  onChanged: (value) {},
)
```

### Start Stream
```dart
final stream = await ApiService.startStream({
  'title': 'My Stream',
  'category': selectedCategoryId,
  'visibility': 'public',
});

// Use stream['agora']['token'] with Agora SDK
```

### Send Gift
```dart
await ApiService.sendGift(streamId, giftId, 5);
```

### Create Poll
```dart
final poll = await ApiService.createPoll(
  streamId,
  'What game next?',
  ['Fortnite', 'Valorant'],
  300, // 5 minutes
);
```

### Vote Poll
```dart
await ApiService.votePoll(pollId, 0); // Vote for first option
```

### Socket Events
```dart
socket.on('stream:gift-sent', (data) {
  showGiftAnimation(data['transaction']);
});

socket.on('stream:poll-created', (data) {
  showPollUI(data['poll']);
});
```

---

## 📊 Response Status Codes

| Code | Meaning | Possible Causes |
|------|---------|-----------------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Missing/invalid fields in body |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry (e.g., same email) |
| 500 | Server Error | Internal server error |

---

## 💡 Pro Tips

1. **Save IDs from responses:**
   - After starting stream → Save `streamId`
   - After creating poll → Save `pollId`
   - After getting gifts → Save `giftId`

2. **Token storage:**
   ```dart
   final prefs = await SharedPreferences.getInstance();
   prefs.setString('userToken', token);
   ```

3. **Environment variables in Postman:**
   - Set `{{baseUrl}}` to avoid hardcoding URLs
   - Use `{{userToken}}` etc. for flexibility

4. **Socket connection:**
   - Always include `auth: {token}` when connecting
   - Listen for `connect` event before emitting

5. **Error handling:**
   - Always check `response.statusCode`
   - Print full `response.body` for debugging

---

## 📚 Additional Resources

- [Postman Collection](Live-Streaming-API-v2.postman_collection.json) (Import করুন)
- [Postman Testing Guide](POSTMAN_COLLECTION_UPDATED.md)
- [Complete Flutter Guide](COMPLETE_TESTING_FLUTTER_GUIDE.md)
- [API Documentation](GO_LIVE_API_DOCUMENTATION.md)
- [Socket.io Docs](https://socket.io/docs/)
- [Agora Flutter SDK](https://pub.dev/packages/agora_rtc_engine)

---

**Last Updated:** January 20, 2024
**Version:** 1.0
