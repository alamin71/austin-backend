# Firebase Cloud Messaging Implementation Guide

## 🔧 Backend Setup (আপনি সব করে দিয়েছেন!)

### ✅ Already Implemented:
1. ✅ Firebase Admin SDK installed
2. ✅ Firebase Helper service created
3. ✅ Device Token Model created
4. ✅ Device Token Service created
5. ✅ Device Token Controller & Routes created
6. ✅ Notification service updated with push notifications

---

## 📋 Configuration

### Step 1: Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Enable Cloud Messaging
4. Go to **Project Settings** → **Service Accounts**
5. Click **Generate New Private Key**
6. Save the JSON file safely

### Step 2: Backend Configuration

Create or update `.env` file:
```bash
# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

Place your service account JSON at: `./config/firebase-service-account.json`

### Step 3: Initialize Firebase in Server

Add this to `src/server.ts`:
```javascript
import FirebaseHelper from './helpers/firebaseHelper.js';

// Initialize Firebase
FirebaseHelper.initialize();
```

---

## 🚀 API Endpoints

### 1. Register Device Token
**POST** `/notification/device/register`
```json
{
  "deviceToken": "FCM_TOKEN_HERE",
  "deviceType": "android|ios|web",
  "deviceName": "My Phone (optional)"
}
```

### 2. Get User's Device Tokens
**GET** `/notification/device/user-tokens`
```json
Response:
{
  "statusCode": 200,
  "success": true,
  "data": [
    {
      "_id": "...",
      "deviceToken": "...",
      "deviceType": "android",
      "deviceName": "My Phone"
    }
  ]
}
```

### 3. Deactivate Device Token
**POST** `/notification/device/deactivate`
```json
{
  "deviceToken": "FCM_TOKEN_HERE"
}
```

### 4. Delete Device Token
**DELETE** `/notification/device/delete`
```json
{
  "deviceToken": "FCM_TOKEN_HERE"
}
```

---

## 📱 Frontend Implementation

### Mobile App (React Native / Flutter)

#### 1. Install Firebase Messaging
```bash
# React Native
npm install @react-native-firebase/messaging

# Flutter
flutter pub add firebase_messaging
```

#### 2. Get FCM Token and Register
```javascript
// React Native Example
import messaging from '@react-native-firebase/messaging';

async function registerFCMToken() {
  try {
    const token = await messaging().getToken();
    
    const response = await fetch('https://your-backend.com/notification/device/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        deviceToken: token,
        deviceType: Platform.OS, // 'android' or 'ios'
        deviceName: DeviceInfo.getModel()
      })
    });
    
    console.log('Device token registered:', token);
  } catch (error) {
    console.error('FCM registration error:', error);
  }
}

// Call on app startup
useEffect(() => {
  registerFCMToken();
}, []);
```

#### 3. Listen to Notifications
```javascript
// When app is in foreground
messaging().onMessage(async (remoteMessage) => {
  console.log('Notification received:', remoteMessage);
  
  // Show notification UI
  showNotificationUI({
    title: remoteMessage.notification?.title,
    body: remoteMessage.notification?.body,
    data: remoteMessage.data
  });
});

// When app is launched from notification
messaging().onNotificationOpenedApp((remoteMessage) => {
  if (remoteMessage) {
    const { actionUrl } = remoteMessage.data;
    // Navigate to URL
    navigation.navigate(actionUrl);
  }
});

// Background handler
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background notification:', remoteMessage);
});
```

### Web App (React)

#### 1. Install Firebase
```bash
npm install firebase
```

#### 2. Initialize Firebase
```javascript
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export default messaging;
```

#### 3. Request Permission and Get Token
```javascript
import { getToken, onMessage } from "firebase/messaging";
import messaging from './firebase-config';

async function registerFCMToken() {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'YOUR_VAPID_PUBLIC_KEY'
      });
      
      // Register token with backend
      await fetch('https://your-backend.com/notification/device/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          deviceToken: token,
          deviceType: 'web',
          deviceName: 'Web Browser'
        })
      });
      
      console.log('FCM Token:', token);
    }
  } catch (error) {
    console.error('FCM registration error:', error);
  }
}

// Listen to notifications
onMessage(messaging, (payload) => {
  console.log('Notification received:', payload);
  
  // Show notification
  new Notification(payload.notification.title, {
    body: payload.notification.body,
    icon: payload.notification.image
  });
});
```

#### 4. Create Service Worker
Create `public/firebase-messaging-sw.js`:
```javascript
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background notification:', payload);
  
  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
      icon: payload.notification.image,
      tag: 'notification'
    }
  );
});
```

---

## 🔔 Sending Notifications from Backend

### Method 1: Within Notification Service
```javascript
import { NotificationService } from './notification.service.js';

await NotificationService.createNotification(
  userId,
  'follow',
  'User X started following you',
  followerId,
  followerId,
  `/profile/${followerId}`,
  userImage,
  true // sendPushNotification = true
);
```

### Method 2: Direct Push via Device Token Service
```javascript
import DeviceTokenService from './deviceToken.service.js';

await DeviceTokenService.sendNotificationToUser(
  userId,
  'Payment Received',
  'You received $50',
  {
    type: 'payment',
    amount: '50'
  },
  iconUrl
);
```

### Method 3: Bulk Notification to Multiple Users
```javascript
const userIds = ['user1', 'user2', 'user3'];

await DeviceTokenService.sendBulkNotification(
  userIds,
  'New Stream Available',
  'Check out the new live stream!',
  { streamId: 'stream_123' }
);
```

---

## 🧪 Testing

### Test Notification from Firebase Console
1. Go to Firebase Console
2. Cloud Messaging tab
3. Send test message
4. Select device by FCM token
5. Send!

### Test via Backend
```bash
curl -X POST http://localhost:5000/notification/device/register \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceToken": "YOUR_FCM_TOKEN",
    "deviceType": "web",
    "deviceName": "Test Device"
  }'
```

---

## 🎯 Real-time + Push Notification Flow

```
Notification Triggered
    ↓
1. Save to DB
    ↓
2. Real-time (Socket.io) → Online users
    ↓
3. Push (Firebase) → Offline/All users
    ↓
Notification shown in both channels
```

**Key Features:**
- ✅ Works offline
- ✅ Works across multiple devices
- ✅ Mobile & Web support
- ✅ Deep linking support
- ✅ Analytics tracking

---

## 📊 Database Schema

### DeviceToken Collection:
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  deviceToken: String (unique),
  deviceType: 'android' | 'ios' | 'web',
  deviceName: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚨 Error Handling

Common issues and solutions:

| Error | Solution |
|-------|----------|
| Firebase not initialized | Call `FirebaseHelper.initialize()` in server.ts |
| Token not found | User's device not registered |
| 401 Unauthorized | Check bearer token |
| Invalid FCM token | Regenerate token on client |
| Notification not showing | Check notification permissions |

---

## ⚡ Performance Tips

1. **Batch notifications** - Send multiple users at once
2. **Remove invalid tokens** - System auto-removes failed tokens
3. **Topic-based** - Use topics for broadcast notifications
4. **Scheduling** - Firebase supports scheduled messages
5. **Analytics** - Monitor delivery rates in Firebase Console

---

## 🔐 Security

- ✅ All endpoints require authentication
- ✅ Users can only manage their own tokens
- ✅ Tokens are automatically invalidated
- ✅ No sensitive data in notification body
- ✅ VAPID key protected

---

## 📚 Resources

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase](https://rnfirebase.io/)
- [Firebase Web Setup](https://firebase.google.com/docs/web/setup)

---

## ✅ Checklist

Backend:
- [ ] Firebase project created
- [ ] Service account key downloaded
- [ ] Environment variables set
- [ ] Firebase initialized in server.ts
- [ ] Package installed with `npm install`

Frontend (Mobile):
- [ ] Firebase Messaging installed
- [ ] FCM token registration implemented
- [ ] Message listeners configured
- [ ] Service worker setup (if web)

Frontend (Web):
- [ ] Firebase config added
- [ ] VAPID key configured
- [ ] Service worker created
- [ ] Notification permission requested

---

## 🤝 Need Help?

Contact your backend team for:
- Firebase credentials
- VAPID key (web)
- API endpoint documentation
- Test notifications

Enjoy Push Notifications! 🎉
