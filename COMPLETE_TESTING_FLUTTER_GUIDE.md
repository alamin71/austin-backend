# Go Live API Testing & Flutter Integration Complete Guide

সম্পূর্ণ guide যেখানে Postman testing থেকে Flutter integration পর্যন্ত সব আছে।

---

## 📋 Table of Contents
1. [Setup Instructions](#setup-instructions)
2. [Postman Collection Import](#postman-collection-import)
3. [Testing Step by Step](#testing-step-by-step)
4. [Flutter Integration Examples](#flutter-integration-examples)
5. [Socket.io Integration](#socketio-integration)
6. [Error Handling](#error-handling)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Setup Instructions

### Prerequisites
- Node.js server running on `http://localhost:5000`
- Database connected and migrated
- User, Streamer, and Admin accounts created
- JWT tokens for testing

### 1. Get Your Tokens

প্রথমে login করে JWT tokens পান:

```bash
# User Login
POST http://localhost:5000/api/v1/auth/login
Body:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "your_user_token_here",
    "user": { "_id": "user_id", ... }
  }
}
```

**Streamer এবং Admin এর জন্যও একই প্রক্রিয়া করুন এবং tokens save করুন।**

---

## 📮 Postman Collection Import

### Step 1: Postman ডাউনলোড এবং খুলুন
- [Postman Download](https://www.postman.com/downloads/)

### Step 2: Collection Import করুন
1. Postman খুলুন
2. **File → Import** ক্লিক করুন
3. **Go-Live-APIs-Postman-Collection.json** file select করুন
4. **Import** button ক্লিক করুন

### Step 3: Environment Setup করুন
1. **Environment** button ক্লিক করুন (Postman এর ডান পাশে)
2. **Create** button ক্লিক করুন
3. নাম দিন: **Go Live Development**
4. এই variables add করুন:

```
baseUrl          = http://localhost:5000/api/v1
userToken        = your_user_token_here
streamerToken    = your_streamer_token_here
adminToken       = your_admin_token_here
userId           = your_user_id
streamerId       = your_streamer_id
categoryId       = (update after creating category)
streamId         = (update after starting stream)
pollId           = (update after creating poll)
```

5. **Save** button ক্লিক করুন

---

## 🧪 Testing Step by Step

### Phase 1: Category Setup (Admin)

#### Test 1: Create Category
```
Method: POST
URL: {{baseUrl}}/category
Headers: Authorization: Bearer {{adminToken}}
Body:
{
  "title": "Gaming",
  "description": "Gaming streams",
  "image": "https://example.com/gaming.jpg",
  "icon": "🎮",
  "order": 1
}
```

**Response থেকে category `_id` copy করুন এবং `categoryId` variable update করুন।**

#### Test 2: Get All Categories
```
Method: GET
URL: {{baseUrl}}/category
```

✅ **Expected Response:** Category list

---

### Phase 2: Gift Setup (Admin)

#### Test 1: Create Gifts
```
Method: POST
URL: {{baseUrl}}/gift
Headers: Authorization: Bearer {{adminToken}}
Body:
{
  "name": "Rose",
  "description": "A beautiful rose",
  "image": "https://example.com/rose.png",
  "animation": "https://example.com/rose.json",
  "price": 100,
  "category": "basic",
  "order": 1
}
```

**4-5 টি ভিন্ন gift create করুন (basic, premium, luxury):**

```json
// Gift 2: Premium
{
  "name": "Diamond",
  "price": 5000,
  "category": "premium"
}

// Gift 3: Luxury
{
  "name": "Crown",
  "price": 10000,
  "category": "luxury"
}
```

#### Test 2: Get All Gifts
```
Method: GET
URL: {{baseUrl}}/gift
```

✅ **Expected Response:** সব gifts এর list

---

### Phase 3: Stream Creation (Streamer)

#### Test 1: Start Stream ⭐
```
Method: POST
URL: {{baseUrl}}/stream/start
Headers: Authorization: Bearer {{streamerToken}}
Body:
{
  "title": "Epic Gaming Session",
  "description": "Live gaming with friends",
  "category": "{{categoryId}}",
  "contentRating": "PG-13",
  "banner": "https://example.com/banner.jpg",
  "bannerPosition": "top",
  "visibility": "public",
  "allowComments": true,
  "allowGifts": true,
  "enablePolls": true,
  "enableAdBanners": false,
  "isRecordingEnabled": true,
  "tags": ["gaming", "live"]
}
```

**Response থেকে stream `_id` copy করুন এবং `streamId` variable update করুন।**

✅ **Response Data:** Stream object, agora token, channel name

#### Test 2: Get Stream Details
```
Method: GET
URL: {{baseUrl}}/stream/{{streamId}}
```

✅ **Expected Response:** Stream details with all settings

---

### Phase 4: Viewer Interaction (User)

#### Test 1: Join Stream
```
Method: POST
URL: {{baseUrl}}/stream/{{streamId}}/join
Headers: Authorization: Bearer {{userToken}}
Body: {}
```

✅ **Response:** Viewer token for Agora, viewer count

#### Test 2: Like Stream
```
Method: POST
URL: {{baseUrl}}/stream/{{streamId}}/like
Headers: Authorization: Bearer {{userToken}}
Body: {}
```

✅ **Expected:** Like count incremented

#### Test 3: Send Gift ⭐
```
Method: POST
URL: {{baseUrl}}/gift/stream/{{streamId}}
Headers: Authorization: Bearer {{userToken}}
Body:
{
  "giftId": "gift_id_from_gifts_list",
  "quantity": 5,
  "message": "Great stream!",
  "isAnonymous": false
}
```

✅ **Expected:** Gift transaction created, revenue calculated

#### Test 4: Get Stream Gifts
```
Method: GET
URL: {{baseUrl}}/gift/stream/{{streamId}}/list
Headers: Authorization: Bearer {{userToken}}
```

✅ **Expected:** সব gifts যা stream এ পাঠানো হয়েছে

---

### Phase 5: Polls (Interactive)

#### Test 1: Create Poll ⭐
```
Method: POST
URL: {{baseUrl}}/poll/stream/{{streamId}}/create
Headers: Authorization: Bearer {{streamerToken}}
Body:
{
  "question": "What game should I play next?",
  "options": ["Fortnite", "Valorant", "CS:GO", "Apex Legends"],
  "duration": 300,
  "allowMultipleVotes": false
}
```

**Response থেকে poll `_id` copy করুন এবং `pollId` variable update করুন।**

✅ **Expected:** Poll object with options

#### Test 2: Get Active Poll
```
Method: GET
URL: {{baseUrl}}/poll/stream/{{streamId}}/active
```

✅ **Expected:** Current active poll

#### Test 3: Vote on Poll ⭐
```
Method: POST
URL: {{baseUrl}}/poll/{{pollId}}/vote
Headers: Authorization: Bearer {{userToken}}
Body:
{
  "optionIndex": 0
}
```

✅ **Expected:** Poll updated with vote counted

#### Test 4: Get Poll Results
```
Method: GET
URL: {{baseUrl}}/poll/{{pollId}}/results
```

✅ **Expected:** Poll results with vote counts

#### Test 5: End Poll
```
Method: POST
URL: {{baseUrl}}/poll/{{pollId}}/end
Headers: Authorization: Bearer {{streamerToken}}
Body: {}
```

✅ **Expected:** Poll marked as inactive

---

### Phase 6: Stream Controls & Settings (Streamer)

#### Test 1: Update Settings
```
Method: PUT
URL: {{baseUrl}}/stream/{{streamId}}/settings
Headers: Authorization: Bearer {{streamerToken}}
Body:
{
  "title": "Updated Title 🔥",
  "description": "Now playing new game",
  "allowComments": false,
  "allowGifts": true,
  "enablePolls": true
}
```

✅ **Expected:** Settings updated

#### Test 2: Toggle Controls
```
Method: PUT
URL: {{baseUrl}}/stream/{{streamId}}/controls
Headers: Authorization: Bearer {{streamerToken}}
Body:
{
  "cameraOn": false,
  "micOn": true,
  "background": "blur"
}
```

✅ **Expected:** Controls updated

---

### Phase 7: Analytics & Closing

#### Test 1: Get Stream Analytics ⭐
```
Method: GET
URL: {{baseUrl}}/stream/{{streamId}}/analytics
Headers: Authorization: Bearer {{streamerToken}}
```

✅ **Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalViewers": 150,
    "peakViewers": 200,
    "likes": 345,
    "giftsReceived": 25,
    "revenue": 1250.50,
    "duration": 3671,
    "engagementRate": 52.3
  }
}
```

#### Test 2: End Stream
```
Method: POST
URL: {{baseUrl}}/stream/{{streamId}}/end
Headers: Authorization: Bearer {{streamerToken}}
Body: {}
```

✅ **Expected:** Stream status changed to "ended"

---

## 🦋 Flutter Integration Examples

### 1. Initial Setup

#### pubspec.yaml Dependencies
```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP Requests
  http: ^1.1.0
  
  # Socket.io
  socket_io_client: ^2.0.0
  
  # State Management
  provider: ^6.0.0
  
  # Storage
  shared_preferences: ^2.2.0
  
  # Agora
  agora_rtc_engine: ^6.0.0
  
  # JSON Serialization
  json_annotation: ^4.8.0
  
  # UI
  flutter_lottie: ^2.7.0
  
dev_dependencies:
  build_runner: ^2.4.0
  json_serializable: ^6.7.0
```

---

### 2. API Service Setup

**lib/services/api_service.dart:**
```dart
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class ApiService {
  static const String BASE_URL = 'http://localhost:5000/api/v1';
  
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('userToken');
  }

  static Future<Map<String, String>> getHeaders([bool isMultipart = false]) async {
    final token = await getToken();
    final headers = {
      'Content-Type': isMultipart ? 'multipart/form-data' : 'application/json',
    };
    
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    
    return headers;
  }

  // Category APIs
  static Future<List<dynamic>> getCategories() async {
    final response = await http.get(
      Uri.parse('$BASE_URL/category'),
      headers: await getHeaders(),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'];
    }
    throw Exception('Failed to load categories');
  }

  // Gift APIs
  static Future<List<dynamic>> getGifts() async {
    final response = await http.get(
      Uri.parse('$BASE_URL/gift'),
      headers: await getHeaders(),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'];
    }
    throw Exception('Failed to load gifts');
  }

  // Stream APIs
  static Future<Map<String, dynamic>> startStream(Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse('$BASE_URL/stream/start'),
      headers: await getHeaders(),
      body: jsonEncode(data),
    );

    if (response.statusCode == 200) {
      final resData = jsonDecode(response.body);
      return resData['data'];
    }
    throw Exception('Failed to start stream: ${response.body}');
  }

  static Future<Map<String, dynamic>> sendGift(
    String streamId,
    String giftId,
    int quantity,
  ) async {
    final response = await http.post(
      Uri.parse('$BASE_URL/gift/stream/$streamId'),
      headers: await getHeaders(),
      body: jsonEncode({
        'giftId': giftId,
        'quantity': quantity,
        'message': '',
        'isAnonymous': false,
      }),
    );

    if (response.statusCode == 201) {
      final data = jsonDecode(response.body);
      return data['data'];
    }
    throw Exception('Failed to send gift: ${response.body}');
  }

  static Future<Map<String, dynamic>> createPoll(
    String streamId,
    String question,
    List<String> options,
    int duration,
  ) async {
    final response = await http.post(
      Uri.parse('$BASE_URL/poll/stream/$streamId/create'),
      headers: await getHeaders(),
      body: jsonEncode({
        'question': question,
        'options': options,
        'duration': duration,
        'allowMultipleVotes': false,
      }),
    );

    if (response.statusCode == 201) {
      final data = jsonDecode(response.body);
      return data['data'];
    }
    throw Exception('Failed to create poll: ${response.body}');
  }

  static Future<void> votePoll(String pollId, int optionIndex) async {
    final response = await http.post(
      Uri.parse('$BASE_URL/poll/$pollId/vote'),
      headers: await getHeaders(),
      body: jsonEncode({'optionIndex': optionIndex}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to vote on poll: ${response.body}');
    }
  }

  static Future<Map<String, dynamic>> getStreamAnalytics(String streamId) async {
    final response = await http.get(
      Uri.parse('$BASE_URL/stream/$streamId/analytics'),
      headers: await getHeaders(),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'];
    }
    throw Exception('Failed to get analytics: ${response.body}');
  }
}
```

---

### 3. Go Live Screen Widget

**lib/screens/go_live_screen.dart:**
```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../providers/stream_provider.dart';

class GoLiveScreen extends StatefulWidget {
  @override
  _GoLiveScreenState createState() => _GoLiveScreenState();
}

class _GoLiveScreenState extends State<GoLiveScreen> {
  List<dynamic> categories = [];
  String? selectedCategoryId;
  String selectedContentRating = 'PG-13';
  String selectedVisibility = 'public';
  bool allowComments = true;
  bool allowGifts = true;
  bool enablePolls = true;

  final titleController = TextEditingController();
  final descriptionController = TextEditingController();
  bool isLoading = false;

  @override
  void initState() {
    super.initState();
    loadCategories();
  }

  Future<void> loadCategories() async {
    try {
      final cats = await ApiService.getCategories();
      setState(() {
        categories = cats;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading categories: $e')),
      );
    }
  }

  Future<void> startStream() async {
    if (titleController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please enter stream title')),
      );
      return;
    }

    if (selectedCategoryId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please select a category')),
      );
      return;
    }

    setState(() => isLoading = true);

    try {
      final streamData = await ApiService.startStream({
        'title': titleController.text,
        'description': descriptionController.text,
        'category': selectedCategoryId,
        'contentRating': selectedContentRating,
        'visibility': selectedVisibility,
        'allowComments': allowComments,
        'allowGifts': allowGifts,
        'enablePolls': enablePolls,
        'bannerPosition': 'top',
        'isRecordingEnabled': true,
        'tags': ['live', 'gaming'],
      });

      // Save stream data to provider
      Provider.of<StreamProvider>(context, listen: false)
          .setCurrentStream(streamData);

      // Navigate to live stream screen
      Navigator.of(context).pushNamed('/live-stream', arguments: streamData);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Go Live'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title
            Text(
              'Stream Title',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            SizedBox(height: 8),
            TextField(
              controller: titleController,
              decoration: InputDecoration(
                hintText: 'Enter stream title',
                border: OutlineInputBorder(),
              ),
              maxLength: 200,
            ),
            SizedBox(height: 20),

            // Description
            Text(
              'Description',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            SizedBox(height: 8),
            TextField(
              controller: descriptionController,
              decoration: InputDecoration(
                hintText: 'Enter stream description',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
              maxLength: 1000,
            ),
            SizedBox(height: 20),

            // Category Dropdown
            Text(
              'Category',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey),
                borderRadius: BorderRadius.circular(4),
              ),
              child: DropdownButton<String>(
                hint: Text('Select Category'),
                value: selectedCategoryId,
                isExpanded: true,
                underline: SizedBox(),
                items: categories.map<DropdownMenuItem<String>>((cat) {
                  return DropdownMenuItem<String>(
                    value: cat['_id'],
                    child: Row(
                      children: [
                        Text(cat['icon'] ?? ''),
                        SizedBox(width: 8),
                        Text(cat['title']),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() => selectedCategoryId = value);
                },
              ),
            ),
            SizedBox(height: 20),

            // Content Rating
            Text(
              'Content Rating',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: ['G', 'PG', 'PG-13', 'R', '18+'].map((rating) {
                return FilterChip(
                  label: Text(rating),
                  selected: selectedContentRating == rating,
                  onSelected: (_) {
                    setState(() => selectedContentRating = rating);
                  },
                );
              }).toList(),
            ),
            SizedBox(height: 20),

            // Visibility
            Text(
              'Visibility',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: ['public', 'followers', 'subscribers'].map((vis) {
                return FilterChip(
                  label: Text(vis.capitalize()),
                  selected: selectedVisibility == vis,
                  onSelected: (_) {
                    setState(() => selectedVisibility = vis);
                  },
                );
              }).toList(),
            ),
            SizedBox(height: 20),

            // Settings
            Text(
              'Settings',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            SizedBox(height: 8),
            CheckboxListTile(
              title: Text('Allow Comments'),
              value: allowComments,
              onChanged: (val) {
                setState(() => allowComments = val ?? false);
              },
            ),
            CheckboxListTile(
              title: Text('Allow Gifts'),
              value: allowGifts,
              onChanged: (val) {
                setState(() => allowGifts = val ?? false);
              },
            ),
            CheckboxListTile(
              title: Text('Enable Polls'),
              value: enablePolls,
              onChanged: (val) {
                setState(() => enablePolls = val ?? false);
              },
            ),
            SizedBox(height: 24),

            // Start Button
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: isLoading ? null : startStream,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                ),
                child: isLoading
                    ? SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(
                          valueColor:
                              AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Text(
                        'GO LIVE',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    titleController.dispose();
    descriptionController.dispose();
    super.dispose();
  }
}

extension StringExtension on String {
  String capitalize() {
    return "${this[0].toUpperCase()}${this.substring(1)}";
  }
}
```

---

### 4. Live Stream Screen (with Gifts & Polls)

**lib/screens/live_stream_screen.dart:**
```dart
import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../services/api_service.dart';
import '../widgets/gift_panel.dart';
import '../widgets/poll_widget.dart';

class LiveStreamScreen extends StatefulWidget {
  final Map<String, dynamic> streamData;

  LiveStreamScreen({required this.streamData});

  @override
  _LiveStreamScreenState createState() => _LiveStreamScreenState();
}

class _LiveStreamScreenState extends State<LiveStreamScreen> {
  late IO.Socket socket;
  List<dynamic> gifts = [];
  dynamic activePoll;
  int viewerCount = 0;
  int likeCount = 0;
  List<Map<String, dynamic>> messages = [];
  bool showGiftPanel = false;

  @override
  void initState() {
    super.initState();
    setupSocket();
    loadGifts();
    loadActivePoll();
  }

  void setupSocket() {
    socket = IO.io('http://localhost:5000', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
      'auth': {
        'token': 'user_token_here', // Get from SharedPreferences
      }
    });

    socket.on('connect', (_) {
      print('Socket connected');
      socket.emit('stream:join', {
        'streamId': widget.streamData['_id'],
        'userId': 'user_id_here', // Get from SharedPreferences
      });
    });

    socket.on('stream:viewer-joined', (data) {
      setState(() => viewerCount = data['viewerCount']);
    });

    socket.on('stream:message', (data) {
      setState(() {
        messages.add({
          'sender': data['sender'],
          'content': data['content'],
          'timestamp': data['createdAt'],
        });
      });
    });

    socket.on('stream:gift-sent', (data) {
      showGiftAnimation(data['transaction']);
    });

    socket.on('stream:liked', (data) {
      setState(() => likeCount++);
    });

    socket.on('stream:poll-created', (data) {
      setState(() => activePoll = data['poll']);
    });

    socket.on('stream:poll-updated', (data) {
      if (activePoll != null) {
        setState(() => activePoll['options'] = data['options']);
      }
    });
  }

  Future<void> loadGifts() async {
    try {
      final giftsList = await ApiService.getGifts();
      setState(() => gifts = giftsList);
    } catch (e) {
      print('Error loading gifts: $e');
    }
  }

  Future<void> loadActivePoll() async {
    try {
      final response = await http.get(
        Uri.parse(
            'http://localhost:5000/api/v1/poll/stream/${widget.streamData['_id']}/active'),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['data'] != null) {
          setState(() => activePoll = data['data']);
        }
      }
    } catch (e) {
      print('Error loading poll: $e');
    }
  }

  void sendGift(String giftId, int quantity) async {
    try {
      await ApiService.sendGift(
        widget.streamData['_id'],
        giftId,
        quantity,
      );
      // Gift will be shown via socket event
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error sending gift: $e')),
      );
    }
  }

  void showGiftAnimation(Map<String, dynamic> transaction) {
    // Show gift animation overlay
    showDialog(
      context: context,
      builder: (context) => GiftAnimationDialog(gift: transaction['gift']),
    );
  }

  void likeStream() {
    socket.emit('stream:like', {
      'streamId': widget.streamData['_id'],
      'userId': 'user_id_here',
    });
  }

  void sendPoll(String question, List<String> options) {
    socket.emit('stream:create-poll', {
      'streamId': widget.streamData['_id'],
      'streamerId': widget.streamData['streamer']['_id'],
      'question': question,
      'options': options,
      'duration': 300,
    });
  }

  void votePoll(int optionIndex) {
    if (activePoll != null) {
      socket.emit('stream:vote-poll', {
        'pollId': activePoll['_id'],
        'streamId': widget.streamData['_id'],
        'userId': 'user_id_here',
        'optionIndex': optionIndex,
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.streamData['title']),
        actions: [
          Padding(
            padding: EdgeInsets.all(16),
            child: Center(
              child: Text('👥 $viewerCount'),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Main stream area (Agora integration goes here)
          Container(
            color: Colors.black,
            child: Center(
              child: Text(
                'Agora Stream UI',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ),

          // Bottom controls
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Column(
              children: [
                // Active Poll
                if (activePoll != null)
                  PollWidget(
                    poll: activePoll,
                    onVote: votePoll,
                  ),

                // Control buttons
                Container(
                  color: Colors.black87,
                  padding: EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      // Like button
                      IconButton(
                        onPressed: likeStream,
                        icon: Icon(Icons.favorite_border, color: Colors.white),
                        label: Text(
                          '$likeCount',
                          style: TextStyle(color: Colors.white),
                        ),
                      ),

                      // Gift button
                      IconButton(
                        onPressed: () {
                          setState(() => showGiftPanel = !showGiftPanel);
                        },
                        icon: Icon(Icons.card_giftcard, color: Colors.white),
                      ),

                      // Message button
                      IconButton(
                        onPressed: () {
                          // Show chat input
                        },
                        icon: Icon(Icons.chat, color: Colors.white),
                      ),

                      // Share button
                      IconButton(
                        onPressed: () {
                          // Share stream
                        },
                        icon: Icon(Icons.share, color: Colors.white),
                      ),
                    ],
                  ),
                ),

                // Gift Panel
                if (showGiftPanel)
                  GiftPanel(
                    gifts: gifts,
                    onSelectGift: (giftId, quantity) {
                      sendGift(giftId, quantity);
                      setState(() => showGiftPanel = false);
                    },
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    socket.disconnect();
    super.dispose();
  }
}
```

---

### 5. Socket.io Integration Provider

**lib/providers/stream_provider.dart:**
```dart
import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

class StreamProvider extends ChangeNotifier {
  late IO.Socket socket;
  Map<String, dynamic>? currentStream;
  List<Map<String, dynamic>> messages = [];
  int viewerCount = 0;
  int likeCount = 0;
  dynamic activePoll;

  void initializeSocket(String token) {
    socket = IO.io('http://localhost:5000', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
      'auth': {'token': token},
    });

    setupListeners();
  }

  void setupListeners() {
    socket.on('stream:message', (data) {
      messages.add(data);
      notifyListeners();
    });

    socket.on('stream:gift-sent', (data) {
      notifyListeners();
    });

    socket.on('stream:liked', (data) {
      likeCount++;
      notifyListeners();
    });

    socket.on('stream:viewer-joined', (data) {
      viewerCount = data['viewerCount'];
      notifyListeners();
    });

    socket.on('stream:poll-created', (data) {
      activePoll = data['poll'];
      notifyListeners();
    });
  }

  void setCurrentStream(Map<String, dynamic> stream) {
    currentStream = stream;
    notifyListeners();
  }

  void emitEvent(String event, Map<String, dynamic> data) {
    socket.emit(event, data);
  }

  void disconnectSocket() {
    socket.disconnect();
  }

  @override
  void dispose() {
    socket.disconnect();
    super.dispose();
  }
}
```

---

## 🔌 Socket.io Integration

### Connection Example
```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  static IO.Socket setupSocket(String token) {
    final socket = IO.io(
      'http://localhost:5000',
      <String, dynamic>{
        'transports': ['websocket'],
        'autoConnect': true,
        'auth': {'token': token},
        'reconnection': true,
        'reconnectionDelay': 1000,
        'reconnectionAttempts': 5,
      },
    );

    socket.onConnect((_) {
      print('✅ Socket connected');
    });

    socket.onDisconnect((_) {
      print('❌ Socket disconnected');
    });

    socket.onError((error) {
      print('❌ Socket error: $error');
    });

    return socket;
  }
}
```

---

## ⚠️ Error Handling

### Common Errors & Solutions

#### 1. 401 Unauthorized
```
Problem: Token is missing or invalid
Solution: 
  - Check if token is saved in SharedPreferences
  - Verify token is not expired
  - Re-login to get new token
```

#### 2. 404 Not Found
```
Problem: Resource doesn't exist
Solution:
  - Check if streamId/categoryId is correct
  - Verify resource was created successfully
```

#### 3. 400 Bad Request
```
Problem: Validation error in request body
Solution:
  - Check all required fields are present
  - Verify data types (string, number, boolean)
  - Check enum values are correct
```

#### 4. Stream Not Live
```
Problem: Cannot send gift/poll to ended stream
Solution:
  - Check stream status is 'live'
  - Verify stream hasn't ended
```

---

## 🔧 Troubleshooting

### Socket.io Connection Issues
```dart
// Check connection status
socket.connected ? print('Connected') : print('Disconnected');

// Manually reconnect
socket.connect();

// Disconnect gracefully
socket.disconnect();
```

### API Request Issues
```dart
// Print response for debugging
print('Status: ${response.statusCode}');
print('Body: ${response.body}');

// Use better_dio or dio for interceptors
class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    print('REQUEST: ${options.method} ${options.path}');
    print('BODY: ${options.data}');
    super.onRequest(options, handler);
  }
}
```

### Token Management
```dart
// Save token
final prefs = await SharedPreferences.getInstance();
await prefs.setString('userToken', token);

// Retrieve and check expiration
final token = prefs.getString('userToken');
final isExpired = isTokenExpired(token);
if (isExpired) {
  // Refresh token or re-login
}
```

---

## ✅ Verification Checklist

Before going to production, verify:

- [ ] All APIs tested in Postman ✓
- [ ] Token management working correctly ✓
- [ ] Socket.io events firing properly ✓
- [ ] Error handling implemented ✓
- [ ] Loading states shown in UI ✓
- [ ] Agora integration working ✓
- [ ] Gift animations displaying ✓
- [ ] Poll UI responsive ✓
- [ ] Analytics data showing correctly ✓
- [ ] Logout clears all data ✓

---

## 🚀 Production Checklist

Before deploying:

1. **API Base URL:** Update to production API
2. **Token Storage:** Use secure storage (flutter_secure_storage)
3. **Error Logging:** Implement Crashlytics
4. **Performance:** Profile app for memory leaks
5. **Security:** Enable certificate pinning
6. **Testing:** Run full integration tests

---

**Happy Coding! 🎉 Contact support if you need help.**
