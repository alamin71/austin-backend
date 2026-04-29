# Notification API Documentation for App Developers

## 📱 Base URL
```
https://your-backend-url/notification
```

---

## 🔐 Authentication
সব endpoints এ header দিতে হবে:
```javascript
Authorization: Bearer {userAuthToken}
```

---

## 📡 API Endpoints

### 1️⃣ Register Device Token (Firebase)

**POST** `/notification/device/register`

**Request:**
```json
{
  "deviceToken": "FCM_TOKEN_FROM_FIREBASE",
  "deviceType": "android|ios|web",
  "deviceName": "User's Device Name (optional)"
}
```

**Response:**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Device token registered successfully",
  "data": {
    "_id": "token_id",
    "deviceToken": "FCM_TOKEN",
    "deviceType": "android",
    "deviceName": "My Phone",
    "isActive": true,
    "createdAt": "2026-04-30T10:30:00Z"
  }
}
```

**Example (React Native):**
```javascript
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

async function registerFCMToken(authToken) {
  try {
    const token = await messaging().getToken();
    
    const response = await fetch(
      'https://your-backend.com/notification/device/register',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          deviceToken: token,
          deviceType: Platform.OS === 'ios' ? 'ios' : 'android',
          deviceName: 'My Device'
        })
      }
    );
    
    const result = await response.json();
    console.log('Token registered:', result);
  } catch (error) {
    console.error('Registration error:', error);
  }
}
```

---

### 2️⃣ Get All Notifications

**GET** `/notification?page=1&limit=20`

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 50)

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": [
    {
      "_id": "notification_id",
      "type": "follow",
      "content": "User X started following you",
      "relatedUser": {
        "_id": "user_id",
        "name": "User Name",
        "image": "profile_url"
      },
      "actionUrl": "/profile/user_id",
      "icon": "image_url",
      "read": false,
      "createdAt": "2026-04-30T10:30:00Z"
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

**Example:**
```javascript
async function getNotifications(authToken, page = 1) {
  const response = await fetch(
    `https://your-backend.com/notification?page=${page}&limit=20`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );
  
  return await response.json();
}
```

---

### 3️⃣ Get Unread Count

**GET** `/notification/unread/count`

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

**Example:**
```javascript
async function getUnreadCount(authToken) {
  const response = await fetch(
    'https://your-backend.com/notification/unread/count',
    {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );
  
  const data = await response.json();
  console.log(`You have ${data.data.unreadCount} unread notifications`);
}
```

---

### 4️⃣ Mark Notification as Read

**PATCH** `/notification/{notificationId}/read`

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "_id": "notification_id",
    "read": true
  }
}
```

**Example:**
```javascript
async function markAsRead(notificationId, authToken) {
  const response = await fetch(
    `https://your-backend.com/notification/${notificationId}/read`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );
  
  return await response.json();
}
```

---

### 5️⃣ Mark All Notifications as Read

**PATCH** `/notification/read/all`

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "All notifications marked as read"
}
```

**Example:**
```javascript
async function markAllAsRead(authToken) {
  await fetch(
    'https://your-backend.com/notification/read/all',
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );
}
```

---

### 6️⃣ Delete Notification

**DELETE** `/notification/{notificationId}`

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Notification deleted"
}
```

**Example:**
```javascript
async function deleteNotification(notificationId, authToken) {
  await fetch(
    `https://your-backend.com/notification/${notificationId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );
}
```

---

### 7️⃣ Clear All Notifications

**DELETE** `/notification/clear/all`

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "All notifications cleared"
}
```

**Example:**
```javascript
async function clearAllNotifications(authToken) {
  await fetch(
    'https://your-backend.com/notification/clear/all',
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );
}
```

---

## 🔔 Real-time Notifications (Socket.io)

### Subscribe to Notifications

**Event:** `new_notification`

```javascript
import io from 'socket.io-client';

const socket = io('https://your-backend.com:6002');

socket.on('new_notification', (notification) => {
  console.log('New notification received:', notification);
  // {
  //   _id: notification_id,
  //   type: 'follow',
  //   content: 'User started following you',
  //   actionUrl: '/profile/user_id',
  //   icon: 'image_url',
  //   read: false,
  //   createdAt: timestamp
  // }
});
```

### Listen to Unread Count Changes

**Event:** `unread_count`

```javascript
socket.on('unread_count', (data) => {
  console.log(`Unread notifications: ${data.unreadCount}`);
  // Update badge count in UI
  updateBadge(data.unreadCount);
});
```

---

## 📝 Notification Types

Backend থেকে পাওয়া যায় বিভিন্ন ধরনের notifications:

### **Social Notifications**
```
follow              - কেউ আপনাকে follow করলে
                    Content: "User X started following you"
                    actionUrl: /profile/{userId}

unfollow            - কেউ আপনাকে unfollow করলে
                    Content: "User X unfollowed you"
                    actionUrl: /profile/{userId}

friend_request      - বন্ধু অনুরোধ পেলে
                    Content: "User X sent you a friend request"
                    actionUrl: /friends/requests

friend_accepted     - বন্ধু অনুরোধ গ্রহণ হলে
                    Content: "User X accepted your friend request"
                    actionUrl: /friends
```

### **Stream Notifications**
```
stream_started      - আপনার অনুসারী লাইভ স্ট্রিম শুরু করলে
                    Content: "User X started streaming"
                    actionUrl: /stream/{streamId}

stream_ended        - লাইভ স্ট্রিম শেষ হলে
                    Content: "Stream has ended"
                    actionUrl: /streams

viewer_joined       - নতুন viewer যোগ দিলে (streamer এর জন্য)
                    Content: "User X joined your stream"
                    actionUrl: /stream/{streamId}

viewer_left         - viewer চলে গেলে (streamer এর জন্য)
                    Content: "User X left your stream"
                    actionUrl: /stream/{streamId}
```

### **Gift Notifications**
```
gift_received       - গিফট পেলে
                    Content: "User X sent you a gift worth $5"
                    actionUrl: /gifts/sent

gift_sent           - গিফট সফলভাবে পাঠানো হলে
                    Content: "Gift sent successfully"
                    actionUrl: /gifts/history
```

### **Message Notifications**
```
message             - নতুন সরাসরি বার্তা পেলে
                    Content: "User X: Hello there!"
                    actionUrl: /messages/{userId}

message_group       - গ্রুপ বার্তা পেলে
                    Content: "User X: Check this out"
                    actionUrl: /messages/groups/{groupId}
```

### **Engagement Notifications**
```
comment             - আপনার পোস্টে মন্তব্য হলে
                    Content: "User X commented on your post"
                    actionUrl: /post/{postId}

like                - আপনার পোস্টে লাইক পেলে
                    Content: "User X liked your post"
                    actionUrl: /post/{postId}

share               - আপনার কন্টেন্ট শেয়ার হলে
                    Content: "User X shared your post"
                    actionUrl: /post/{postId}
```

### **Payment/Subscription Notifications**
```
payment_received    - পেমেন্ট পেলে
                    Content: "Payment received: $50"
                    actionUrl: /wallet/history

payment_sent        - পেমেন্ট পাঠানো হলে
                    Content: "Payment sent successfully to User X"
                    actionUrl: /wallet/history

subscription_renewed - সাবস্ক্রিপশন রিনিউ হলে
                    Content: "Your subscription renewed"
                    actionUrl: /subscription

subscription_expiring - সাবস্ক্রিপশন শীঘ্রই শেষ হতে যাচ্ছে
                    Content: "Your subscription expires in 3 days"
                    actionUrl: /subscription

purchase_successful - ক্রয় সম্পন্ন হলে
                    Content: "Purchase completed successfully"
                    actionUrl: /orders/{orderId}
```

### **Reward/Challenge Notifications**
```
challenge_started   - চ্যালেঞ্জ শুরু হলে
                    Content: "New challenge available!"
                    actionUrl: /challenges

challenge_completed - চ্যালেঞ্জ সম্পন্ন হলে
                    Content: "You completed the challenge! Won $10"
                    actionUrl: /challenges/{challengeId}

reward_available    - পুরস্কার পাওয়া যায়
                    Content: "Daily reward available: 100 points"
                    actionUrl: /rewards

reward_collected    - পুরস্কার সংগ্রহ হলে
                    Content: "Reward collected: 100 points"
                    actionUrl: /wallet
```

### **System Notifications**
```
account_verified    - অ্যাকাউন্ট যাচাই হলে
                    Content: "Your account has been verified!"
                    actionUrl: /profile

profile_updated     - প্রোফাইল আপডেট হলে
                    Content: "Your profile has been updated"
                    actionUrl: /profile

password_changed    - পাসওয়ার্ড পরিবর্তন হলে
                    Content: "Your password has been changed"
                    actionUrl: /account/security

login_alert         - নতুন জায়গা থেকে লগইন হলে
                    Content: "New login from Android device"
                    actionUrl: /account/security

email_verified      - ইমেইল যাচাই হলে
                    Content: "Your email has been verified"
                    actionUrl: /account

maintenance         - সিস্টেম রক্ষণাবেক্ষণের সময়
                    Content: "Server maintenance on Apr 30"
                    actionUrl: /notifications

announcement        - নতুন ঘোষণা
                    Content: "New feature available!"
                    actionUrl: /announcements
```

### **Violation/Warning Notifications**
```
warning             - কন্টেন্ট সতর্কতা
                    Content: "Your post violates guidelines"
                    actionUrl: /account/violations

content_removed     - কন্টেন্ট অপসারণ হলে
                    Content: "Your post has been removed"
                    actionUrl: /account/violations

account_suspended   - অ্যাকাউন্ট স্থগিত হলে
                    Content: "Your account has been suspended"
                    actionUrl: /support
```

### **Trending/Discovery**
```
trending            - ট্রেন্ডিং কন্টেন্ট
                    Content: "Check out this trending stream!"
                    actionUrl: /stream/{streamId}

recommendation      - সুপারিশ
                    Content: "We think you'll like this stream"
                    actionUrl: /stream/{streamId}

popular_user        - জনপ্রিয় ব্যবহারকারী
                    Content: "Follow @user_X - Popular streamer"
                    actionUrl: /profile/{userId}
```

---

## 🎯 Response Object Structure

প্রতিটি notification এ এটা আসবে:

```javascript
{
  "_id": "notification_id",
  "type": "follow|message|gift_received|...",
  "content": "Notification text",
  "relatedUser": {
    "_id": "user_id",
    "name": "User Name",
    "userName": "username",
    "image": "profile_image_url"
  },
  "relatedId": "related_resource_id",     // post_id, stream_id, etc
  "actionUrl": "/profile/user_id",        // Where to navigate on tap
  "icon": "image_url",                    // Notification icon
  "read": false,                          // Is read or not
  "createdAt": "2026-04-30T10:30:00Z",
  "updatedAt": "2026-04-30T10:30:00Z"
}
```

---

## 🚀 Complete Implementation Example

```javascript
import messaging from '@react-native-firebase/messaging';
import io from 'socket.io-client';
import { Platform } from 'react-native';

class NotificationManager {
  constructor(authToken, backendUrl) {
    this.authToken = authToken;
    this.backendUrl = backendUrl;
    this.socket = null;
    this.notificationCount = 0;
  }

  // Initialize notifications
  async initialize() {
    // 1. Get FCM token
    const fcmToken = await messaging().getToken();
    
    // 2. Register with backend
    await this.registerDevice(fcmToken);
    
    // 3. Setup Socket.io
    this.setupSocket();
    
    // 4. Setup Firebase message handlers
    this.setupMessageHandlers();
  }

  // Register device token
  async registerDevice(fcmToken) {
    try {
      const response = await fetch(
        `${this.backendUrl}/notification/device/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({
            deviceToken: fcmToken,
            deviceType: Platform.OS,
            deviceName: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device'
          })
        }
      );
      
      console.log('Device registered:', await response.json());
    } catch (error) {
      console.error('Device registration error:', error);
    }
  }

  // Setup Socket.io for real-time
  setupSocket() {
    this.socket = io(`${this.backendUrl}:6002`);
    
    // Listen for new notifications
    this.socket.on('new_notification', (notification) => {
      console.log('🔔 New notification:', notification);
      this.handleNotification(notification);
    });
    
    // Listen for unread count updates
    this.socket.on('unread_count', (data) => {
      this.notificationCount = data.unreadCount;
      this.updateBadge(data.unreadCount);
    });
  }

  // Handle incoming notification
  handleNotification(notification) {
    // Play sound, show banner, etc
    this.showNotification(notification);
    
    // Update UI
    this.updateNotificationUI();
  }

  // Get all notifications
  async getNotifications(page = 1) {
    const response = await fetch(
      `${this.backendUrl}/notification?page=${page}&limit=20`,
      {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      }
    );
    
    return await response.json();
  }

  // Mark as read
  async markAsRead(notificationId) {
    await fetch(
      `${this.backendUrl}/notification/${notificationId}/read`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      }
    );
  }

  // Setup Firebase message handlers
  setupMessageHandlers() {
    // Handle notification when app is in foreground
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground notification:', remoteMessage);
      this.showNotification(remoteMessage.notification);
    });

    // Handle notification tap
    messaging().onNotificationOpenedApp((remoteMessage) => {
      const { actionUrl } = remoteMessage.data;
      if (actionUrl) {
        this.navigateTo(actionUrl);
      }
    });
  }

  // Show notification in app
  showNotification(notification) {
    // Implement based on your UI library
    console.log('Showing:', notification.title, notification.body);
  }

  // Update badge count
  updateBadge(count) {
    // Implement badge update (platform specific)
    console.log('Badge count:', count);
  }

  // Navigate to action URL
  navigateTo(url) {
    // Implement navigation based on your router
    console.log('Navigate to:', url);
  }

  // Update notification UI
  updateNotificationUI() {
    // Refresh notification list in UI
  }

  // Cleanup
  dispose() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default NotificationManager;
```

---

## ✅ Implementation Checklist

- [ ] Firebase setup (Android/iOS)
- [ ] FCM token generation
- [ ] Device token registration endpoint called
- [ ] Real-time listener setup (Socket.io)
- [ ] Notification badge/count display
- [ ] Notification tap handling
- [ ] Mark as read functionality
- [ ] Unread count display
- [ ] Test with background notifications

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Token not registering | Check auth token, check network |
| No real-time notifications | Check Socket.io connection, firewall |
| Notifications not showing | Check Firebase permissions, app foreground/background state |
| Badge count wrong | Check `unread_count` event listener |
| Old notifications piling up | Implement pagination, delete old ones |

---

## 📞 API Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request |
| 401 | Unauthorized |
| 404 | Not found |
| 500 | Server error |

---

## 🔒 Security Notes

- সব endpoints require authentication
- Device tokens unique per device
- Users শুধু নিজেদের notifications দেখতে পারে
- Sensitive data notification body-তে পাঠানো যায় না

---

## 📚 Resources

- Firebase Documentation: https://firebase.google.com/docs/cloud-messaging
- Socket.io Client: https://socket.io/docs/v4/client-api/
- React Native Firebase: https://rnfirebase.io/

---

**Happy Coding! 🚀**
