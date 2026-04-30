# Flutter Firebase Push Notification Implementation Guide

## ✅ Backend Ready?
- ✅ Firebase Admin SDK configured
- ✅ Device token registration endpoint ready
- ✅ Push notification sender system ready
- ✅ Real-time Socket.io listeners ready
- ✅ All APIs documented

**তাই Flutter শুধু integrate করতে হবে!**

---

## 📦 Step 1: Dependencies Install করো

### pubspec.yaml এ যোগ করো:

```yaml
dependencies:
  flutter:
    sdk: flutter
  firebase_core: ^2.24.0
  firebase_messaging: ^14.6.0
  flutter_local_notifications: ^16.1.0
  socket_io_client: ^2.0.0
  shared_preferences: ^2.2.0
  http: ^1.1.0
```

**Run করো:**
```bash
flutter pub get
```

---

## 🔥 Step 2: Firebase Setup

### Android এ (android/app/build.gradle):
```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        minSdkVersion 21  // Important for Firebase
    }
}

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
}
```

### iOS এ (ios/Podfile):
```ruby
post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= [
        '$(inherited)',
        'PERMISSION_NOTIFICATIONS=1',
      ]
    end
  end
end
```

---

## 📱 Step 3: Initialize Firebase

### main.dart:
```dart
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Notification App',
      home: const NotificationScreen(),
    );
  }
}
```

### firebase_options.dart (Firebase Console থেকে copy করো):
```dart
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'YOUR_ANDROID_API_KEY',
    appId: 'YOUR_ANDROID_APP_ID',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    projectId: 'your-project-id',
    storageBucket: 'your-project.appspot.com',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'YOUR_IOS_API_KEY',
    appId: 'YOUR_IOS_APP_ID',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    projectId: 'your-project-id',
    storageBucket: 'your-project.appspot.com',
  );

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'YOUR_WEB_API_KEY',
    appId: 'YOUR_WEB_APP_ID',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    projectId: 'your-project-id',
    storageBucket: 'your-project.appspot.com',
    authDomain: 'your-project.firebaseapp.com',
  );
}
```

---

## 🔔 Step 4: Notification Manager Class

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class NotificationManager {
  static final NotificationManager _instance = NotificationManager._internal();
  
  late FirebaseMessaging _firebaseMessaging;
  late FlutterLocalNotificationsPlugin _localNotifications;
  
  String? authToken;
  String? backendUrl;

  factory NotificationManager() {
    return _instance;
  }

  NotificationManager._internal();

  Future<void> initialize({
    required String authToken,
    required String backendUrl,
  }) async {
    this.authToken = authToken;
    this.backendUrl = backendUrl;
    
    _firebaseMessaging = FirebaseMessaging.instance;
    _localNotifications = FlutterLocalNotificationsPlugin();

    // Request permission
    await _requestPermissions();

    // Setup local notifications
    await _setupLocalNotifications();

    // Get FCM token
    String? fcmToken = await _firebaseMessaging.getToken();
    print('FCM Token: $fcmToken');

    // Register device
    if (fcmToken != null) {
      await registerDevice(fcmToken);
    }

    // Listen for foreground notifications
    FirebaseMessaging.onMessage.listen(_handleForegroundNotification);

    // Listen for background notifications
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    // Handle notification when app is killed
    RemoteMessage? initialMessage = 
        await _firebaseMessaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }
  }

  // Request notification permissions
  Future<void> _requestPermissions() async {
    NotificationSettings settings = 
        await _firebaseMessaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    print('User notification permission: ${settings.authorizationStatus}');
  }

  // Setup local notifications
  Future<void> _setupLocalNotifications() async {
    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('@mipmap/launcher_icon');
    
    const DarwinInitializationSettings iosSettings =
        DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(initSettings);
  }

  // Handle foreground notifications
  void _handleForegroundNotification(RemoteMessage message) {
    print('Foreground notification: ${message.notification?.title}');

    final notification = message.notification;
    final android = message.notification?.android;

    if (notification != null) {
      _localNotifications.show(
        notification.hashCode,
        notification.title,
        notification.body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            'default_channel_id',
            'Default Channel',
            channelDescription: 'Generic notifications',
            icon: '@mipmap/launcher_icon',
            importance: Importance.high,
            priority: Priority.high,
          ),
          iOS: const DarwinNotificationDetails(),
        ),
        payload: message.data.toString(),
      );
    }
  }

  // Handle notification tap
  void _handleNotificationTap(RemoteMessage message) {
    print('Notification tapped: ${message.data}');
    
    final actionUrl = message.data['actionUrl'];
    if (actionUrl != null) {
      // Navigate to the specified URL
      // Example: navigatorKey.currentState?.pushNamed(actionUrl);
      print('Navigate to: $actionUrl');
    }
  }

  // Register device token with backend
  Future<void> registerDevice(String fcmToken) async {
    try {
      final response = await http.post(
        Uri.parse('$backendUrl/notification/device/register'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'deviceToken': fcmToken,
          'deviceType': 'android', // or 'ios'
          'deviceName': 'Flutter App Device',
        }),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        print('Device registered successfully');
      } else {
        print('Failed to register device: ${response.body}');
      }
    } catch (e) {
      print('Error registering device: $e');
    }
  }

  // Deactivate device token
  Future<void> deactivateDevice(String fcmToken) async {
    try {
      final response = await http.post(
        Uri.parse('$backendUrl/notification/device/deactivate'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'deviceToken': fcmToken,
        }),
      );

      if (response.statusCode == 200) {
        print('Device deactivated successfully');
      }
    } catch (e) {
      print('Error deactivating device: $e');
    }
  }

  // Get all notifications
  Future<List<dynamic>> getNotifications({int page = 1, int limit = 20}) async {
    try {
      final response = await http.get(
        Uri.parse('$backendUrl/notification?page=$page&limit=$limit'),
        headers: {
          'Authorization': 'Bearer $authToken',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'] ?? [];
      }
      return [];
    } catch (e) {
      print('Error getting notifications: $e');
      return [];
    }
  }

  // Mark notification as read
  Future<void> markAsRead(String notificationId) async {
    try {
      await http.patch(
        Uri.parse('$backendUrl/notification/$notificationId/read'),
        headers: {
          'Authorization': 'Bearer $authToken',
        },
      );
    } catch (e) {
      print('Error marking notification as read: $e');
    }
  }

  // Get unread count
  Future<int> getUnreadCount() async {
    try {
      final response = await http.get(
        Uri.parse('$backendUrl/notification/unread/count'),
        headers: {
          'Authorization': 'Bearer $authToken',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data']['unreadCount'] ?? 0;
      }
      return 0;
    } catch (e) {
      print('Error getting unread count: $e');
      return 0;
    }
  }
}
```

---

## 🎯 Step 5: Use in Your Screen

```dart
import 'package:flutter/material.dart';
import 'notification_manager.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({Key? key}) : super(key: key);

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  late NotificationManager _notificationManager;
  List<dynamic> notifications = [];
  int unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _initializeNotifications();
  }

  Future<void> _initializeNotifications() async {
    _notificationManager = NotificationManager();
    
    // You need to get auth token (from login/shared preferences)
    String authToken = "YOUR_AUTH_TOKEN";
    String backendUrl = "http://your-backend.com";

    await _notificationManager.initialize(
      authToken: authToken,
      backendUrl: backendUrl,
    );

    // Load notifications
    await _loadNotifications();
    await _loadUnreadCount();
  }

  Future<void> _loadNotifications() async {
    final data = await _notificationManager.getNotifications();
    setState(() {
      notifications = data;
    });
  }

  Future<void> _loadUnreadCount() async {
    final count = await _notificationManager.getUnreadCount();
    setState(() {
      unreadCount = count;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          Badge(
            label: Text('$unreadCount'),
            child: IconButton(
              icon: const Icon(Icons.notifications),
              onPressed: _loadNotifications,
            ),
          ),
        ],
      ),
      body: notifications.isEmpty
          ? const Center(
              child: Text('No notifications'),
            )
          : ListView.builder(
              itemCount: notifications.length,
              itemBuilder: (context, index) {
                final notification = notifications[index];
                return ListTile(
                  title: Text(notification['content']),
                  subtitle: Text(
                    notification['createdAt'] ?? '',
                  ),
                  trailing: notification['read']
                      ? null
                      : const Icon(Icons.circle, 
                          color: Colors.blue, 
                          size: 12),
                  onTap: () {
                    _notificationManager
                        .markAsRead(notification['_id']);
                    _loadUnreadCount();
                  },
                );
              },
            ),
    );
  }
}
```

---

## 🔌 Step 6: Real-time Socket.io (Optional)

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketManager {
  static final SocketManager _instance = SocketManager._internal();
  late IO.Socket _socket;

  factory SocketManager() {
    return _instance;
  }

  SocketManager._internal();

  void connect(String backendUrl, String authToken) {
    _socket = IO.io(backendUrl, IO.OptionBuilder()
        .setTransports(['websocket'])
        .disableAutoConnect()
        .build());

    _socket.onConnect((_) {
      print('Socket connected');
    });

    // Listen for new notifications
    _socket.on('new_notification', (data) {
      print('New notification received: $data');
      // Update UI with new notification
    });

    // Listen for unread count update
    _socket.on('unread_count', (data) {
      print('Unread count updated: ${data['unreadCount']}');
      // Update badge count
    });

    _socket.connect();
  }

  void disconnect() {
    _socket.disconnect();
  }
}
```

---

## ✅ Checklist

- [ ] Firebase dependencies added
- [ ] firebase_options.dart configured
- [ ] Android setup (build.gradle, Podfile)
- [ ] iOS setup (Podfile, permissions)
- [ ] NotificationManager implemented
- [ ] Device token registration working
- [ ] Foreground notifications showing
- [ ] Background notifications handled
- [ ] Notification tap working
- [ ] Real-time Socket.io setup (optional)

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| FCM token not generated | Check Firebase config, Ensure min API 21 for Android |
| Notifications not showing | Check permissions, Check notification channel |
| App crashes on startup | Verify firebase_options.dart, Check dependencies |
| Backend registration fails | Check auth token, Check backend URL |
| Background notifications not working | Check app permissions, Check Firebase console |

---

## 📞 Backend Integration Summary

**Backend করেছে:**
- ✅ `/notification/device/register` - Token registration
- ✅ `/notification` - Get notifications
- ✅ `/notification/unread/count` - Get unread count
- ✅ `/notification/{id}/read` - Mark read
- ✅ Real-time notification push

**Flutter শুধু:**
- Register FCM token
- Listen for messages
- Show UI
- Call APIs

---

## 🎉 Next: Test করো!

1. App run করো
2. FCM token register হবে
3. Backend থেকে test notification পাঠাও
4. App এ দেখবে!

**Happy coding! 🚀**
