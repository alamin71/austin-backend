# 🐛 FCM Push Notification Debugging Guide

**Issue**: In-app notifications work but FCM push notifications are not being sent

---

## 📋 Quick Checklist

### 1️⃣ **Firebase Credentials Setup**
```bash
✓ Is FIREBASE_SERVICE_ACCOUNT_PATH set in .env?
✓ Does the file exist at: ./src/config/vidzostreaming-firebase-adminsdk-fbsvc-161198afa5.json
✓ Are FIREBASE_DATABASE_URL and FIREBASE_PROJECT_ID set in .env?
```

**Check**: 
```bash
# Print Firebase config (from project root)
grep -i firebase .env
```

**Expected Output**:
```
FIREBASE_SERVICE_ACCOUNT_PATH=./src/config/vidzostreaming-firebase-adminsdk-fbsvc-161198afa5.json
FIREBASE_DATABASE_URL=https://vidzostreaming-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=vidzostreaming
```

---

### 2️⃣ **Device Token Registration**

**Verify**: Is the device token being saved to the database?

```bash
# Check MongoDB for registered tokens
# Connect to MongoDB and run:
db.devicetokens.find({user: ObjectId("your_user_id")})
```

**Expected Output**:
```json
{
  "_id": ObjectId(...),
  "user": ObjectId("..."),
  "deviceToken": "23049PCD8G...",
  "deviceType": "android",
  "isActive": true,
  "createdAt": ISODate(...),
  "updatedAt": ISODate(...)
}
```

**If No Results**:
- ❌ Device token NOT being registered
- Call the registration endpoint first:

```bash
curl -X POST http://localhost:5000/notification/device/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceToken": "YOUR_FCM_TOKEN",
    "deviceType": "android",
    "deviceName": "My Android Phone"
  }'
```

---

### 3️⃣ **Test FCM Push Manually**

**Endpoint**: `POST /notification/device/test-push`

```bash
curl -X POST http://localhost:5000/notification/device/test-push \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test FCM push"
  }'
```

**Expected Response**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Test push sent to 1 device(s)",
  "data": {
    "success": true,
    "sentTo": 1,
    "result": {
      "successCount": 1,
      "failureCount": 0
    }
  }
}
```

**If Failed**:
```json
{
  "statusCode": 200,
  "success": false,
  "message": "Test push failed",
  "data": {
    "success": false,
    "error": "..."
  }
}
```

---

### 4️⃣ **Check Server Logs**

**Start Server** with logging enabled:
```bash
npm run dev
# or
npm start
```

**Look for These Log Messages**:

#### ✅ Firebase Initialization:
```
✅ Firebase Admin SDK initialized successfully
📂 Loading Firebase credentials from: /path/to/firebase-adminsdk.json
ℹ️  Firebase Admin SDK already initialized
```

#### ✅ Device Token Registration:
```
Device token registered for user 6476...: android
```

#### ✅ Push Notification Sent:
```
📱 Triggering FCM push notification for user 6476..., type: new_follower
🔍 Fetching device tokens for user: 6476...
📨 Found 1 active device(s) for user 6476...
🚀 Sending FCM message: title="User X started following you", body="...", devices=1
✅ Multicast notification sent to 1 device(s), 0 failed
✅ FCM push sent to user 6476...: {"success":true,"sentTo":1,"result":{...}}
```

#### ❌ Errors to Look For:
```
🚨 Firebase initialization error: [error details]
⚠️  No active device tokens found for user 6476...
❌ Send to multiple devices error: [error details]
❌ FCM push failed for user 6476...: [error details]
```

---

## 🔍 Common Issues & Solutions

### **Issue 1: "No active device tokens found"**

**Cause**: Device tokens not registered or marked inactive

**Solution**:
1. Call device registration endpoint with valid FCM token
2. Check database: `db.devicetokens.find({user: ObjectId("..."), isActive: true})`
3. If inactive, delete and re-register

```bash
# Re-register device
curl -X POST http://localhost:5000/notification/device/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceToken": "YOUR_NEW_FCM_TOKEN",
    "deviceType": "android"
  }'
```

---

### **Issue 2: "Firebase initialization error"**

**Cause**: Invalid credentials file or path

**Solution**:
1. Check Firebase credentials file exists:
   ```bash
   ls -la ./src/config/vidzostreaming-firebase-adminsdk-fbsvc-161198afa5.json
   ```

2. Verify it's valid JSON:
   ```bash
   cat ./src/config/vidzostreaming-firebase-adminsdk-fbsvc-161198afa5.json | python -m json.tool
   ```

3. Check .env has correct path:
   ```bash
   grep FIREBASE_SERVICE_ACCOUNT_PATH .env
   ```

4. Restart server and check logs

---

### **Issue 3: "Send to multiple devices error"**

**Cause**: Firebase API call failed (invalid tokens, quota exceeded, etc.)

**Solution**:
1. Check Firebase Console for errors/quotas
2. Verify FCM token is valid (hasn't expired)
3. Check token is from correct Firebase project
4. Re-register device with fresh FCM token

---

### **Issue 4: Push Works in Test but Not in Production**

**Cause**: Different Firebase projects or credentials

**Solution**:
1. Verify FIREBASE_SERVICE_ACCOUNT_PATH points to correct file
2. Verify FIREBASE_PROJECT_ID matches your project
3. Check mobile app is using same Firebase project ID
4. Ensure mobile app credentials match backend project

---

## 📊 Complete Debug Flow

### Step 1: Register Device Token
```bash
POST /notification/device/register
{
  "deviceToken": "YOUR_FCM_TOKEN",
  "deviceType": "android"
}
```
✅ Should return 201 with token details

### Step 2: Verify Token in Database
```bash
db.devicetokens.findOne({deviceToken: "YOUR_FCM_TOKEN"})
```
✅ Should show isActive: true

### Step 3: Test Push Endpoint
```bash
POST /notification/device/test-push
{}
```
✅ Should return success: true, sentTo: 1

### Step 4: Test Follow Action
- Have user A follow user B
- Check logs for push notification send
- Check user B's device for notification

### Step 5: Check Logs
```bash
# In terminal running server, look for:
✅ Multicast notification sent to 1 device(s)
✅ FCM push sent to user [userId]
```

---

## 🛠️ Advanced Debugging

### View Real-Time Logs
```bash
npm start 2>&1 | grep -E "(FCM|Firebase|📱|✅|❌|⚠️)"
```

### Enable Full Logging
In `src/server.ts`, add:
```ts
process.env.DEBUG = 'firebase-admin:*';
```

### Manually Send FCM from Node.js
```js
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./src/config/vidzostreaming-firebase-adminsdk-fbsvc-161198afa5.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

await admin.messaging().send({
  token: 'YOUR_FCM_TOKEN',
  notification: {
    title: 'Test',
    body: 'Manual test from Node.js'
  }
});
```

---

## 📝 API Endpoints Reference

### Register Device Token
```
POST /notification/device/register
Authorization: Bearer {token}

{
  "deviceToken": "string (required)",
  "deviceType": "android|ios|web (required)",
  "deviceName": "string (optional)"
}
```

### Get User's Device Tokens
```
GET /notification/device/user-tokens
Authorization: Bearer {token}
```

### Test FCM Push
```
POST /notification/device/test-push
Authorization: Bearer {token}

{
  "title": "string (optional)",
  "body": "string (optional)"
}
```

### Deactivate Token
```
POST /notification/device/deactivate
Authorization: Bearer {token}

{
  "deviceToken": "string (required)"
}
```

### Delete Token
```
DELETE /notification/device/delete
Authorization: Bearer {token}

{
  "deviceToken": "string (required)"
}
```

---

## 🧪 Postman Test Collection

### 1. Register Token
```
Method: POST
URL: {{BASE_URL}}/notification/device/register
Headers:
  Authorization: Bearer {{auth_token}}
  Content-Type: application/json

Body (raw):
{
  "deviceToken": "23049PCD8G...",
  "deviceType": "android",
  "deviceName": "My Phone"
}
```

### 2. Get Tokens
```
Method: GET
URL: {{BASE_URL}}/notification/device/user-tokens
Headers:
  Authorization: Bearer {{auth_token}}
```

### 3. Send Test Push
```
Method: POST
URL: {{BASE_URL}}/notification/device/test-push
Headers:
  Authorization: Bearer {{auth_token}}
  Content-Type: application/json

Body (raw):
{
  "title": "Hello",
  "body": "This is a test"
}
```

### 4. Test Follow Notification
```
Method: POST
URL: {{BASE_URL}}/follow/follow
Headers:
  Authorization: Bearer {{auth_token}}
  Content-Type: application/json

Body (raw):
{
  "followingId": "USER_ID_TO_FOLLOW"
}

Expected Result:
- In-app notification via Socket.io ✅
- FCM push in logs: "✅ Multicast notification sent to 1" ✅
```

---

## ✅ Success Indicators

When everything is working:

1. **Logs show**:
   ```
   ✅ Firebase Admin SDK initialized successfully
   ✅ Multicast notification sent to 1 device(s), 0 failed
   ✅ FCM push sent to user [id]
   ```

2. **Database has**:
   - Active device tokens for users
   - Notifications saved

3. **Mobile/Web app receives**:
   - Push notification banner
   - Background notification (if app is closed)
   - Can tap notification and navigate

---

## 🚀 When Everything Works

### Flow:
```
User A follows User B
↓
Follow Service creates notification
↓
Notification Service saves to DB
↓
Notification Service triggers FCM push
↓
DeviceTokenService fetches User B's tokens
↓
FirebaseHelper sends via Firebase Admin SDK
↓
Firebase sends to device
↓
Device receives notification
↓
User sees push notification
```

### Logs Show:
```
📱 Triggering FCM push notification for user [B_ID]
🔍 Fetching device tokens for user: [B_ID]
📨 Found 1 active device(s) for user [B_ID]
🚀 Sending FCM message: title="User A started following you"
✅ Multicast notification sent to 1 device(s), 0 failed
✅ FCM push sent to user [B_ID]: {"success":true,"sentTo":1}
```

---

## 📞 Need Help?

Check these in order:
1. ✅ Firebase credentials loaded?
2. ✅ Device token registered in database?
3. ✅ Test push endpoint works?
4. ✅ Server logs show send attempt?
5. ✅ Mobile app listening for notifications?

If still not working, share server logs with the team!
