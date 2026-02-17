# Agora Cloud Recording Setup Guide

## Overview
The backend now **automatically handles Agora Cloud Recording** for live streams when `isRecordingEnabled: true` is set. Recordings are saved directly to your AWS S3 bucket.

## ✅ What's Implemented

### Files Created/Modified
1. **`src/helpers/agoraRecordingHelper.ts`** - New helper class for Agora Cloud Recording API
2. **`src/app/modules/stream/stream.service.ts`** - Integrated recording start/stop/webhook
3. **`src/config/index.ts`** - Already has Agora Cloud Recording config fields

---

## 🔑 Required Environment Variables

Add these to your `.env` file on the server:

```env
# Agora RTC Configuration
AGORA_APP_ID=0521b3b0b08140808bb1d7a1fa7bd739
AGORA_APP_CERTIFICATE=c13976b66f1b47608868895e9af14522

# ⚠️ REQUIRED: Agora Cloud Recording Credentials
AGORA_CUSTOMER_ID=your_customer_id_here
AGORA_CUSTOMER_SECRET=your_customer_secret_here

# Optional: Recording Configuration (uses AWS config if not provided)
AGORA_RECORDING_CALLBACK_URL=http://98.95.167.179:5000/api/v1/stream/recording/webhook
AGORA_STORAGE_VENDOR=1
AGORA_STORAGE_REGION=0
AGORA_STORAGE_BUCKET=austin-mahoney-buckets
AGORA_STORAGE_ACCESS_KEY=AKIA...
AGORA_STORAGE_SECRET_KEY=your_aws_secret

# AWS S3 Configuration (REQUIRED)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...  # Must start with AKIA
AWS_SECRET_ACCESS_KEY=your_valid_secret_key
AWS_S3_BUCKET_NAME=austin-mahoney-buckets
```

---

## 📍 Where to Get Agora Credentials

### 1. **Agora Customer ID & Secret** (for Cloud Recording API)
Go to: **https://console.agora.io/** → **Developer Toolkit** → **RESTful API**

You'll see:
- **Customer ID**: e.g., `4abc1234def5678ghijk9012`
- **Customer Certificate**: e.g., `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

Add to `.env`:
```env
AGORA_CUSTOMER_ID=4abc1234def5678ghijk9012
AGORA_CUSTOMER_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### 2. **AWS Access Key** (for S3 storage)
- Must start with `AKIA` (standard) or `ASIA` (temporary)
- IAM user needs **AmazonS3FullAccess** policy

---

## 🔄 How It Works

### **1. Stream Start (with Recording)**
```bash
POST /api/v1/stream/start
Content-Type: multipart/form-data

isRecordingEnabled: "true"
title: "My Live Stream"
category: "CATEGORY_ID"
```

**What Happens:**
- Backend calls `AgoraRecordingHelper.acquire()` → gets `resourceId`
- Backend calls `AgoraRecordingHelper.start()` → gets `sid`
- Recording starts immediately and saves to S3: `recordings/streams/{filename}.mp4`
- Stream document is saved with `recordingResourceId` and `recordingSid`

### **2. Stream End**
```bash
POST /api/v1/stream/:streamId/end
```

**What Happens:**
- Backend calls `AgoraRecordingHelper.stop()`
- Agora processes recording (takes 1-5 minutes) and uploads MP4 to S3
- Backend constructs recording URL: 
  ```
  https://austin-mahoney-buckets.s3.us-east-1.amazonaws.com/recordings/streams/{filename}.mp4
  ```
- `recordingUrl` is saved to stream document

### **3. Get Recordings**
```bash
GET /api/v1/stream/recordings?page=1&limit=10
```

**Response:**
```json
{
  "data": [
    {
      "_id": "...",
      "title": "My Live Stream",
      "recordingUrl": "https://austin-mahoney-buckets.s3.us-east-1.amazonaws.com/recordings/streams/stream_123_1708153200.mp4",
      "streamer": { "name": "John Doe", "avatar": "..." },
      "endedAt": "2026-02-17T10:30:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 5 }
}
```

---

## ⚙️ Configuration Options

### Storage Region Codes (AWS S3)
```env
AGORA_STORAGE_REGION=0   # us-east-1 (default)
AGORA_STORAGE_REGION=1   # us-east-2
AGORA_STORAGE_REGION=2   # us-west-1
AGORA_STORAGE_REGION=3   # us-west-2
```

### Recording Quality Settings
Edit `src/helpers/agoraRecordingHelper.ts` (line 145-150):
```typescript
transcodingConfig: {
     height: 1280,      // Video height
     width: 720,        // Video width
     bitrate: 2000,     // Video bitrate (kbps)
     fps: 30,           // Frames per second
     mixedVideoLayout: 0,
     backgroundColor: '#000000',
}
```

---

## 🧪 Testing

### 1. Add Credentials to Server
```bash
ssh ubuntu@98.95.167.179
cd /home/ubuntu/backend/austin-backend
nano .env
# Add AGORA_CUSTOMER_ID and AGORA_CUSTOMER_SECRET
pm2 restart austin-backend --update-env
pm2 logs austin-backend
```

### 2. Start Stream with Recording
```bash
curl -X POST http://98.95.167.179:5000/api/v1/stream/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Test Recording" \
  -F "category=CATEGORY_ID" \
  -F "isRecordingEnabled=true"
```

### 3. End Stream
```bash
curl -X POST http://98.95.167.179:5000/api/v1/stream/STREAM_ID/end \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Check Logs
```bash
pm2 logs austin-backend --lines 50
# Look for: "Recording started for stream..."
# Look for: "Recording URL saved: https://..."
```

### 5. Get Recordings
```bash
curl http://98.95.167.179:5000/api/v1/stream/recordings?page=1&limit=10
```

---

## 🐛 Troubleshooting

### ❌ Error: "Failed to acquire cloud recording resource"
**Cause:** Invalid Agora Customer ID/Secret

**Solution:**
1. Go to Agora Console → Developer Toolkit → RESTful API
2. Copy Customer ID and Customer Certificate
3. Update `.env` with correct values
4. Restart: `pm2 restart austin-backend --update-env`

### ❌ Error: "InvalidAccessKeyId"
**Cause:** AWS Access Key has wrong format

**Solution:**
- Access Key must start with `AKIA` (standard) or `ASIA` (temporary)
- Create new key: IAM → Users → Security Credentials → Create access key
- Update `.env` with new key
- Restart backend

### ⏱️ Recording URL Not Showing
**Cause:** Agora processing takes 1-5 minutes after stream ends

**Solution:**
- Wait 2-5 minutes
- Check logs: `pm2 logs austin-backend --lines 100`
- Look for: "Recording webhook received"
- Verify webhook is reachable: `curl http://98.95.167.179:5000/api/v1/stream/recording/webhook`

---

## 📁 S3 File Structure

```
austin-mahoney-buckets/
  recordings/
    streams/
      stream_123_1708153200.mp4
      stream_456_1708153300.mp4
```

---

## 🔐 Security Notes

1. **Webhook Security**: Consider adding signature verification
2. **S3 Bucket**: Ensure public read access is disabled (use signed URLs if needed)
3. **IAM Permissions**: Recording bot needs `s3:PutObject` permission

---

## 📚 Resources

- **Agora Cloud Recording API**: https://api-ref.agora.io/en/cloud-recording/RESTful/cloud_recording_api_overview.html
- **AWS S3 Permissions**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html

---

## ✅ Next Steps

1. Add `AGORA_CUSTOMER_ID` and `AGORA_CUSTOMER_SECRET` to `.env`
2. Verify AWS credentials are correct (AKIA... format)
3. Restart backend: `pm2 restart austin-backend --update-env`
4. Test recording flow
5. Check S3 bucket for recordings after stream ends
