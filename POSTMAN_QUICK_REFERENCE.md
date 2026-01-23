# Postman Collection Quick Reference Guide

## Updated: Jan 24, 2026 - VERIFIED ✅

---

## Collection Overview

**Name:** Austin-Backend - Complete Live Streaming API v2.0  
**Version:** 2.0 (Fully Audited & Verified)  
**Total Endpoints:** 64  
**Production Server:** http://65.1.20.111:5000  

---

## Folder Structure

```
1. USER AUTH & PROFILE (14 endpoints)
   ├─ 1.1 User Authentication (11 endpoints)
   │  ├─ Register (form-data with image)
   │  ├─ Login
   │  ├─ Refresh Token
   │  ├─ Google Login
   │  ├─ Apple Login
   │  ├─ Send OTP
   │  ├─ Verify OTP
   │  ├─ Forgot Password
   │  ├─ Verify Email
   │  ├─ Verify Reset OTP
   │  └─ Reset Password
   └─ 1.2 User Profile (3 endpoints)
      ├─ Get Profile (Protected)
      ├─ Update Profile (Protected, form-data)
      └─ Delete Profile (Protected)

2. ADMIN AUTH & PROFILE (10 endpoints)
   ├─ 2.1 Admin Authentication (6 endpoints)
   │  ├─ Admin Login
   │  ├─ Admin Forgot Password
   │  ├─ Admin Verify Reset OTP
   │  ├─ Admin Reset Password
   │  ├─ Admin Change Password (Protected)
   │  └─ Admin Resend OTP
   └─ 2.2 Admin Profile & Management (4 endpoints)
      ├─ Get My Admin Profile (Protected) ⭐ NEW
      ├─ Get All Admins (SUPER_ADMIN)
      ├─ Create Admin (SUPER_ADMIN)
      └─ Delete Admin (SUPER_ADMIN)

3. CATEGORIES (5 endpoints)
   ├─ Get All Categories
   ├─ Get Category by ID
   ├─ Create Category (Admin)
   ├─ Update Category (Admin)
   └─ Delete Category (Admin)

4. STREAM MANAGEMENT (13 endpoints)
   ├─ Start Stream (form-data with banner upload) 🔥
   ├─ Get Live Streams
   ├─ Search Streams
   ├─ Get Stream Details
   ├─ Get Streamer History
   ├─ Join Stream (Get Agora Token)
   ├─ Leave Stream
   ├─ Like Stream
   ├─ Send Chat Message
   ├─ Update Stream Settings
   ├─ Toggle Stream Controls
   ├─ Get Stream Analytics
   └─ End Stream

5. GIFTS (9 endpoints)
   ├─ Get All Gifts
   ├─ Get Gifts by Category
   ├─ Get Gift by ID
   ├─ Create Gift (Admin)
   ├─ Update Gift (Admin)
   ├─ Delete Gift (Admin)
   ├─ Send Gift to Stream
   ├─ Get Stream Gifts
   └─ Get Streamer Received Gifts

6. POLLS (7 endpoints)
   ├─ Create Poll (Streamer)
   ├─ Vote on Poll
   ├─ Get Poll Results
   ├─ Get Active Poll
   ├─ Get All Stream Polls
   ├─ End Poll (Streamer)
   └─ Delete Poll (Streamer)

7. ANALYTICS DASHBOARD (6 endpoints)
   ├─ Platform Analytics (Admin)
   ├─ Real-time Analytics
   ├─ Streamer Analytics
   ├─ My Dashboard
   ├─ Category Analytics
   └─ Comparison Analytics
```

---

## Setup Instructions

### 1. Import Collection
1. Open Postman
2. Click **Import** → Select **Austin-backend.postman_collection.json**
3. Collection will load with all 64 endpoints

### 2. Configure Environment Variables
Set these variables in Postman:

| Variable | Value | Source |
|----------|-------|--------|
| `baseUrl` | `http://65.1.20.111:5000` | Production server |
| `userToken` | Copy from login response | /api/v1/auth/login |
| `adminToken` | Copy from admin login | /api/v1/auth/admin/login |
| `categoryId` | Create category or find existing | /api/v1/category |
| `categoryName` | Category slug (e.g., "gaming") | Category model |
| `streamId` | Start stream to get ID | /api/v1/stream/start |
| `userId` | From user registration | /api/v1/auth/register |
| `adminId` | From create admin | /api/v1/admin/create-admin |
| `giftId` | Create gift or find existing | /api/v1/gift |
| `pollId` | Create poll to get ID | /api/v1/poll/stream/.../create |

### 3. Get Started

**Step 1: Register User**
```
POST /api/v1/auth/register (form-data)
- Fill: name, email, password, role="user"
- Upload: image file
- Response: User object with ID and token
```

**Step 2: Copy Token**
```
Set {{userToken}} = access token from response
```

**Step 3: Get User Profile**
```
GET /api/v1/user/profile
Header: Authorization: Bearer {{userToken}}
```

**Step 4: Admin Operations**
```
POST /api/v1/auth/admin/login
- email: admin@example.com
- password: admin123
- Copy response token to {{adminToken}}
```

---

## Authentication

### Bearer Token Format
```
Authorization: Bearer {{userToken}}
```

### Roles & Permissions
- **USER:** User endpoints, stream participation
- **VENDOR:** User endpoints + vendor features
- **ADMIN:** Admin operations, content moderation
- **SUPER_ADMIN:** Full administrative access, user management

### Protected Endpoints
All endpoints marked with 🔐 require authentication:
- User profile (get, update, delete)
- Stream operations (start, join, leave, etc.)
- Gift sending
- Poll creation/voting
- Analytics access

---

## Form-Data Requests

### User Registration
```
POST /api/v1/auth/register
Content-Type: multipart/form-data

Fields:
- name: text
- email: text  
- password: text
- role: text ("user", "vendor", etc.)
- image: file (JPG, PNG, WEBP, max 10MB)
```

### User Profile Update
```
PATCH /api/v1/user/profile
Authorization: Bearer {{userToken}}
Content-Type: multipart/form-data

Fields:
- data: JSON string {"name": "New Name", ...}
- image: file (optional)
```

### Stream Start
```
POST /api/v1/stream/start
Authorization: Bearer {{userToken}}
Content-Type: multipart/form-data

Fields:
- title: text
- description: text
- category: text (category ID)
- contentRating: text
- banner: file (image/*, max 10MB)
- bannerPosition: text
- visibility: text
- allowComments: "true"/"false"
- allowGifts: "true"/"false"
- enablePolls: "true"/"false"
- enableAdBanners: "true"/"false"
- isAgeRestricted: "true"/"false"
- isRecordingEnabled: "true"/"false"
- tags: comma-separated text
```

**Note:** Boolean fields as strings are automatically converted to actual booleans by Zod preprocessing

---

## Common Use Cases

### 1. Complete User Registration & Profile Setup
```
1. POST /api/v1/auth/register → Get token
2. PATCH /api/v1/user/profile → Update profile
3. GET /api/v1/user/profile → Verify changes
```

### 2. Stream Management Workflow
```
1. POST /api/v1/stream/start → Start stream
2. POST /api/v1/stream/:id/join → Join as viewer
3. POST /api/v1/stream/:id/like → Like stream
4. POST /api/v1/stream/:id/chat → Send message
5. POST /api/v1/stream/:id/end → End stream
```

### 3. Gift System
```
1. GET /api/v1/gift → List all gifts
2. POST /api/v1/gift/send/:streamId → Send gift during stream
3. GET /api/v1/gift/streamer/received → View received gifts
```

### 4. Analytics Dashboard
```
1. GET /api/v1/analytics/realtime → Real-time stats (public)
2. GET /api/v1/analytics/my-dashboard → Personal stats (protected)
3. GET /api/v1/analytics/platform → Platform stats (admin only)
```

---

## Error Handling

All endpoints follow standard error response format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400,
  "data": null
}
```

### Common Status Codes
- **200:** Success
- **201:** Created
- **400:** Bad Request (validation error)
- **401:** Unauthorized (missing/invalid token)
- **403:** Forbidden (insufficient permissions)
- **404:** Not Found
- **500:** Server Error

---

## Tips & Tricks

### Auto-populate Variables
After logging in, Postman can auto-extract tokens:
1. Go to response
2. Click "Tests" tab
3. Use: `pm.environment.set("userToken", pm.response.json().data.token);`

### Test Multiple Endpoints
- Use "Run Collection" feature to test flow
- Set delays between requests if needed
- Check test results in Collection Runner

### Debug Issues
1. Check `baseUrl` variable is set
2. Verify token hasn't expired (1 hour)
3. Ensure correct role for protected endpoints
4. Check file uploads not exceeding size limits

---

## File Upload Requirements

### Accepted Formats
- Images: PNG, JPG, JPEG, WEBP
- Max Size: 10MB

### Upload Paths
```
Register image: uploads/image/{filename}-{timestamp}.ext
Profile image: uploads/image/{filename}-{timestamp}.ext
Stream banner: uploads/banner/{filename}-{timestamp}.ext
```

---

## Production Server Info

**URL:** http://65.1.20.111:5000  
**Status:** Running ✅  
**Database:** MongoDB Atlas  
**Socket.io:** Port 6002  
**Process Manager:** PM2  

### Deploy & Update
```bash
cd /path/to/project
git pull origin main
npm install
npm run build
pm2 restart austin-backend
```

---

## Troubleshooting

### 401 Unauthorized
- Token may have expired (1 hour lifespan)
- Solution: Re-login to get new token

### 403 Forbidden
- User role doesn't have permission
- Solution: Use correct admin/user token for endpoint

### 400 Bad Request
- Form-data fields malformed
- Solution: Check field names and types match documentation

### File Upload Fails
- File size > 10MB
- Wrong file type
- Solution: Use PNG/JPG under 10MB

---

## Additional Resources

- **Audit Documentation:** [AUDIT_ENDPOINTS_VERIFIED.md](AUDIT_ENDPOINTS_VERIFIED.md)
- **API Documentation:** [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)
- **Database Schema:** [DATABASE_ERD.md](DATABASE_ERD.md)
- **Stream Form-Data:** [STREAM_START_FORMDATA.md](STREAM_START_FORMDATA.md)

---

**Last Updated:** Jan 24, 2026  
**Status:** Production Ready ✅  
**Total Endpoints Verified:** 64  
**Collection Version:** 2.0
