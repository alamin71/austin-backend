# 🚀 Real-Time Socket.io Integration Guide

## Backend Setup ✅ (Complete)

Socket.io is now fully integrated into your backend for:
- ✅ Real-time messaging between friends
- ✅ Real-time notifications (friend requests, new followers, etc.)
- ✅ Typing indicators
- ✅ Message read status updates
- ✅ Online/offline status

**Server Details:**
```
HTTP Server: http://localhost:5000
Socket.io Server: ws://localhost:3001
```

---

## 🎯 Socket Events Reference

### **1. Connection & Join Events**

#### Client → Server: Join Room
```javascript
socket.emit('user_join', userId);
// Notifies server that user is online
```

#### Server → Client: User Online
```javascript
socket.on('user_online', (data) => {
  // data: { userId, socketId }
  console.log(`${data.userId} is online`);
});
```

#### Server → Client: User Offline
```javascript
socket.on('user_offline', (data) => {
  // data: { userId }
  console.log(`${data.userId} is offline`);
});
```

---

### **2. Messaging Events**

#### Client → Server: Send Message
```javascript
socket.emit('send_message', {
  senderId: 'user_id_1',
  receiverId: 'user_id_2',
  content: 'Hello world!',
  type: 'text', // 'text', 'image', 'file'
  mediaUrl: null // URL if type is image/file
});
```

#### Server → Client: Message Sent (Acknowledgment)
```javascript
socket.on('message_sent', (data) => {
  // data: { success: true, timestamp }
  console.log('Message sent successfully');
});
```

#### Server → Client: New Message Received
```javascript
socket.on('new_message', (data) => {
  // data: { senderId, receiverId, content, type, mediaUrl, timestamp }
  addMessageToChat(data);
  updateMessagesList();
});
```

#### Client → Server: Message Read
```javascript
socket.emit('message_read', {
  senderId: 'user_id_1', // Who sent the message
  receiverId: 'my_user_id' // Me (who read it)
});
```

#### Server → Client: Messages Read Notification
```javascript
socket.on('messages_read', (data) => {
  // data: { receiverId, readAt }
  // Marks all messages from receiverId as read
  updateMessageStatus(data.receiverId, true);
});
```

---

### **3. Typing Indicators**

#### Client → Server: User is Typing
```javascript
socket.emit('typing', {
  senderId: 'my_user_id',
  receiverId: 'other_user_id'
});
// Emit while typing, every 300ms
```

#### Server → Client: Someone is Typing
```javascript
socket.on('user_typing', (data) => {
  // data: { senderId }
  showTypingIndicator(data.senderId);
});
```

#### Client → Server: Stop Typing
```javascript
socket.emit('stop_typing', {
  senderId: 'my_user_id',
  receiverId: 'other_user_id'
});
// Emit when typing stops
```

#### Server → Client: Stop Typing
```javascript
socket.on('user_stop_typing', (data) => {
  // data: { senderId }
  hideTypingIndicator(data.senderId);
});
```

---

### **4. Notification Events**

#### Server → Client: New Notification
```javascript
socket.on('new_notification', (data) => {
  // data: {
  //   _id: notification_id,
  //   type: 'friend_request_received', 'new_follower', etc.
  //   content: 'John sent you a friend request',
  //   relatedUser: user_id,
  //   actionUrl: '/friend/requests',
  //   icon: 'user-plus',
  //   read: false,
  //   createdAt: timestamp
  // }
  showNotification(data);
  updateNotificationBadge();
});
```

#### Server → Client: Unread Count Update
```javascript
socket.on('unread_count', (data) => {
  // data: { unreadCount: 5 }
  updateNotificationBadge(data.unreadCount);
});
```

---

## 📱 Flutter Implementation

### **1. Install socket_io_client Package**

```yaml
# pubspec.yaml
dependencies:
  socket_io_client: ^2.0.1
```

### **2. Create Socket Service**

```dart
// lib/services/socket_service.dart
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter/material.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  
  late IO.Socket socket;
  
  factory SocketService() {
    return _instance;
  }
  
  SocketService._internal();
  
  // Callbacks for events
  Function(Map)? onNewMessage;
  Function(Map)? onNewNotification;
  Function(String)? onUserTyping;
  Function(String)? onUserStopTyping;
  Function(Map)? onUnreadCount;
  Function(String)? onUserOnline;
  Function(String)? onUserOffline;
  
  void connect(String userId, {String serverUrl = 'http://localhost:3001'}) {
    socket = IO.io(serverUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
      'reconnection': true,
      'reconnectionDelay': 1000,
      'reconnectionAttempts': 5,
    });
    
    socket.onConnect((_) {
      print('✅ Connected to Socket.io server');
      
      // Join user-specific room
      socket.emit('user_join', userId);
    });
    
    socket.onDisconnect((_) {
      print('❌ Disconnected from Socket.io server');
    });
    
    // Listen for new messages
    socket.on('new_message', (data) {
      onNewMessage?.call(data);
    });
    
    // Listen for new notifications
    socket.on('new_notification', (data) {
      onNewNotification?.call(data);
    });
    
    // Listen for typing indicators
    socket.on('user_typing', (data) {
      onUserTyping?.call(data['senderId'] as String);
    });
    
    socket.on('user_stop_typing', (data) {
      onUserStopTyping?.call(data['senderId'] as String);
    });
    
    // Listen for unread count updates
    socket.on('unread_count', (data) {
      onUnreadCount?.call(data);
    });
    
    // Listen for online/offline status
    socket.on('user_online', (data) {
      onUserOnline?.call(data['userId'] as String);
    });
    
    socket.on('user_offline', (data) {
      onUserOffline?.call(data['userId'] as String);
    });
  }
  
  // Send message
  void sendMessage({
    required String senderId,
    required String receiverId,
    required String content,
    String type = 'text',
    String? mediaUrl,
  }) {
    socket.emit('send_message', {
      'senderId': senderId,
      'receiverId': receiverId,
      'content': content,
      'type': type,
      'mediaUrl': mediaUrl,
    });
  }
  
  // Mark message as read
  void markMessageAsRead({
    required String senderId,
    required String receiverId,
  }) {
    socket.emit('message_read', {
      'senderId': senderId,
      'receiverId': receiverId,
    });
  }
  
  // Typing indicator
  void emitTyping({
    required String senderId,
    required String receiverId,
  }) {
    socket.emit('typing', {
      'senderId': senderId,
      'receiverId': receiverId,
    });
  }
  
  void stopTyping({
    required String senderId,
    required String receiverId,
  }) {
    socket.emit('stop_typing', {
      'senderId': senderId,
      'receiverId': receiverId,
    });
  }
  
  void disconnect() {
    socket.disconnect();
  }
}
```

---

### **3. Use in Your Chat Screen**

```dart
// lib/screens/chat_screen.dart
import 'package:flutter/material.dart';
import '../services/socket_service.dart';

class ChatScreen extends StatefulWidget {
  final String otherUserId;
  final String currentUserId;
  
  const ChatScreen({
    required this.otherUserId,
    required this.currentUserId,
  });
  
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final socketService = SocketService();
  final messageController = TextEditingController();
  List<Map<String, dynamic>> messages = [];
  bool isOtherUserTyping = false;
  
  @override
  void initState() {
    super.initState();
    setupSocketListeners();
  }
  
  void setupSocketListeners() {
    socketService.onNewMessage = (data) {
      if (data['senderId'] == widget.otherUserId) {
        setState(() {
          messages.add(data);
        });
        
        // Mark as read
        socketService.markMessageAsRead(
          senderId: widget.otherUserId,
          receiverId: widget.currentUserId,
        );
      }
    };
    
    socketService.onUserTyping = (senderId) {
      if (senderId == widget.otherUserId) {
        setState(() {
          isOtherUserTyping = true;
        });
      }
    };
    
    socketService.onUserStopTyping = (senderId) {
      if (senderId == widget.otherUserId) {
        setState(() {
          isOtherUserTyping = false;
        });
      }
    };
  }
  
  void sendMessage() {
    if (messageController.text.isEmpty) return;
    
    socketService.sendMessage(
      senderId: widget.currentUserId,
      receiverId: widget.otherUserId,
      content: messageController.text,
      type: 'text',
    );
    
    messageController.clear();
  }
  
  void onTextChange() {
    if (messageController.text.isNotEmpty) {
      socketService.emitTyping(
        senderId: widget.currentUserId,
        receiverId: widget.otherUserId,
      );
    }
  }
  
  void onTextCompleted() {
    if (messageController.text.isEmpty) {
      socketService.stopTyping(
        senderId: widget.currentUserId,
        receiverId: widget.otherUserId,
      );
    }
  }
  
  @override
  void dispose() {
    messageController.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Chat')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final message = messages[index];
                final isMe = message['senderId'] == widget.currentUserId;
                
                return Align(
                  alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: EdgeInsets.all(8),
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isMe ? Colors.blue : Colors.gray[300],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      message['content'],
                      style: TextStyle(
                        color: isMe ? Colors.white : Colors.black,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          if (isOtherUserTyping)
            Padding(
              padding: EdgeInsets.all(8.0),
              child: Text('${widget.otherUserId} is typing...'),
            ),
          Container(
            padding: EdgeInsets.all(8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: messageController,
                    onChanged: (_) => onTextChange(),
                    onSubmitted: (_) => onTextCompleted(),
                    decoration: InputDecoration(
                      hintText: 'Send a message...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                    ),
                  ),
                ),
                SizedBox(width: 8),
                FloatingActionButton(
                  onPressed: sendMessage,
                  child: Icon(Icons.send),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```

---

### **4. Use in Notifications Widget**

```dart
// lib/screens/notifications_screen.dart
class NotificationsScreen extends StatefulWidget {
  final String userId;
  
  const NotificationsScreen({required this.userId});
  
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final socketService = SocketService();
  List<Map<String, dynamic>> notifications = [];
  int unreadCount = 0;
  
  @override
  void initState() {
    super.initState();
    setupSocketListeners();
  }
  
  void setupSocketListeners() {
    socketService.onNewNotification = (data) {
      setState(() {
        notifications.insert(0, data);
      });
    };
    
    socketService.onUnreadCount = (data) {
      setState(() {
        unreadCount = data['unreadCount'] as int;
      });
    };
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Notifications'),
        actions: [
          Badge(
            label: Text('$unreadCount'),
            child: Icon(Icons.notifications),
          ),
        ],
      ),
      body: ListView.builder(
        itemCount: notifications.length,
        itemBuilder: (context, index) {
          final notif = notifications[index];
          return ListTile(
            title: Text(notif['content']),
            subtitle: Text(notif['type']),
            leading: Icon(Icons.notifications_active),
            trailing: !notif['read'] ? Icon(Icons.circle, color: Colors.blue) : null,
          );
        },
      ),
    );
  }
}
```

---

## 🔌 Socket.io Server Configuration

**Environment Variables Needed:**
```env
SOCKET_PORT=3001
ALLOWED_ORIGINS=http://localhost:3000,http://192.168.x.x:3000
```

**CORS Configuration (Already set):**
```typescript
cors: {
  origin: config.allowed_origins || '*',
  methods: ['GET', 'POST'],
  credentials: true,
}
```

---

## 🧪 Testing Socket.io

### **Using Socket.io Client Tests**

```bash
# Install socket.io-client globally
npm install -g socket.io-client

# Test connection
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3001');
socket.on('connect', () => console.log('Connected!'));
socket.on('new_message', (data) => console.log('Message:', data));
"
```

### **Using WebSocket Client in Browser**

```javascript
// Open browser console and run:
const socket = io('http://localhost:3001', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Connected');
  socket.emit('user_join', 'your_user_id');
});

socket.on('new_message', (data) => {
  console.log('New message:', data);
});

socket.emit('send_message', {
  senderId: 'user1',
  receiverId: 'user2',
  content: 'Hello!',
  type: 'text'
});
```

---

## 🚀 Deployment

### **Production Socket.io Setup:**

```typescript
// src/config/index.ts
const config = {
  socket_port: process.env.SOCKET_PORT || 3001,
  allowed_origins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://yourdomain.com',
    'https://app.yourdomain.com',
  ],
};
```

### **Nginx Reverse Proxy for Socket.io:**

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Flutter Mobile App                     │
└──────┬──────────────────────────────────────────────┬────┘
       │                                              │
       │      WebSocket (Socket.io)                  │
       │      ws://localhost:3001                    │
       │                                              │
┌──────▼──────────────────────────────────────────────▼────┐
│                   Node.js Backend                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │  Socket Handler  │      │  Services        │        │
│  │  - Messages      │◄────►│  - Notifications │        │
│  │  - Notifications │      │  - Messages      │        │
│  └──────────────────┘      └──────────────────┘        │
│           │                         │                   │
│           └────────┬────────────────┘                   │
│                    │                                     │
│           ┌────────▼──────────┐                         │
│           │   MongoDB DB      │                         │
│           │  - Messages       │                         │
│           │  - Notifications  │                         │
│           │  - Users          │                         │
│           └───────────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist

- ✅ Socket.io installed and configured
- ✅ Real-time messaging support
- ✅ Real-time notifications
- ✅ Typing indicators
- ✅ Online/offline status
- ✅ Read receipts
- ✅ Flutter integration ready
- ✅ Production deployment ready

---

**Next Steps:**
1. Integrate SocketService in your Flutter app
2. Test with real users
3. Deploy to production
4. Monitor socket connections

**For more info:** Check examples in message.socket.ts and notification.socket.ts
