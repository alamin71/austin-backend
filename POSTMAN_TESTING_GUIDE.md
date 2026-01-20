# Postman Testing Guide - Go Live Features

এই guide এ আপনি সব Go Live APIs এর Postman testing examples পাবেন। প্রতিটি API এর জন্য full request body, headers, এবং expected response দেওয়া আছে।

---

## 📝 পূর্ব প্রয়োজন (Prerequisites)

### 1. Environment Variables Setup (Postman)
Postman এ নতুন Environment তৈরি করুন এবং এই variables add করুন:

```
baseUrl: http://localhost:5000/api/v1
userToken: <your_user_jwt_token>
streamerToken: <your_streamer_jwt_token>
adminToken: <your_admin_jwt_token>
userId: <your_user_id>
streamerId: <your_streamer_id>
```

### 2. Common Headers
সব authenticated requests এ এই headers যোগ করুন:
```
Authorization: Bearer {{userToken}}
Content-Type: application/json
```

---

## 🎯 Category APIs Testing

### 📋 Category APIs Overview

| Operation | Method | URL | Auth Required | Data Type | Purpose |
|-----------|--------|-----|----------------|-----------|---------|
| **List All** | GET | `/category` | ❌ No | - | সব active categories দেখুন (dropdown এর জন্য) |
| **Create** | POST | `/create-category` | ✅ Admin | form-data | নতুন category যোগ করুন (ছবি সহ) |
| **Get Details** | GET | `/category/:id` | ❌ No | - | একটি category এর details দেখুন |
| **Update** | PUT | `/category/:id` | ✅ Admin | form-data | category এর title/image পরিবর্তন করুন |
| **Delete** | DELETE | `/category/:id` | ✅ Admin | - | category delete করুন |

---

### 1️⃣ Get All Categories (নতুন Stream শুরু করার সময় Dropdown তৈরি করতে)

**সেটিং:** 
- 🔍 **কী করে:** সব active categories এর list পায়
- 🎯 **ব্যবহার:** Go Live Screen এ category dropdown fill করতে
- 🔐 **Auth:** প্রয়োজন নেই (সবাই দেখতে পারে)

---

**POSTMAN এ কীভাবে সেটাপ করবেন:**

```
┌─────────────────────────────────────┐
│ METHOD:  GET                        │
│ URL:     {{baseUrl}}/category       │
│                                     │
│ HEADERS:                            │
│ └─ Content-Type: application/json  │
└─────────────────────────────────────┘
```

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/v1/category" \
  -H "Content-Type: application/json"
```

**Response:** ✅ (Status: 200)
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Gaming",
      "slug": "gaming",
      "image": "https://example.com/gaming.jpg",
      "icon": "🎮",
      "isActive": true,
      "streamCount": 5,
      "order": 1,
      "createdAt": "2024-01-20T10:00:00.000Z",
      "updatedAt": "2024-01-20T10:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "title": "Cooking",
      "slug": "cooking",
      "image": "https://example.com/cooking.jpg",
      "icon": "👨‍🍳",
      "isActive": true,
      "streamCount": 3,
      "order": 2
    }
  ]
}
```

💡 **মনে রাখবেন:** এই response থেকে category IDs save করুন - পরবর্তী stream create করার সময় লাগবে।

---

### 2️⃣ Create Category (Admin Only) - নতুন Category যোগ করতে (Image File এর সাথে)

**সেটিং:** 
- 🔍 **কী করে:** নতুন category তৈরি করে এবং image upload করে
- 🎯 **ব্যবহার:** Admin dashboard থেকে categories manage করতে
- 🔐 **Auth:** **ADMIN TOKEN প্রয়োজন** ⚠️
- 📤 **Data Type:** **FORM-DATA** (JSON নয়!)

---

**POSTMAN এ কীভাবে সেটাপ করবেন:**

```
┌─────────────────────────────────────────────┐
│ METHOD:  POST                               │
│ URL:     {{baseUrl}}/create-category        │
│                                             │
│ HEADERS:                                    │
│ ├─ Authorization: Bearer {{adminToken}}    │
│ └─ Content-Type: multipart/form-data       │
└─────────────────────────────────────────────┘
```

**POSTMAN Body এ কী দিবেন:**

1. **Body Tab তে "form-data" select করুন** (NOT raw!)
2. এই fields add করুন:

| Key | Type | Value |
|-----|------|-------|
| title | text | Gaming |
| image | file | category-image.jpg (আপনার ছবি file) |

📸 **Postman Screenshot Guide:**
```
Body → form-data tab
├─ title       : Gaming        (Text)
└─ image       : [Select File] (File)
```

**cURL Example:**
```bash
curl -X POST "http://localhost:5000/api/v1/create-category" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "title=Gaming" \
  -F "image=@/path/to/gaming.jpg"
```

**Response:** ✅ (Status: 201)
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "title": "Gaming",
    "image": "https://cloudinary.com/gaming-123456.jpg"
  }
}
```

💡 **শুধুমাত্র 3টি field response এ:**
- `_id` - Category ID
- `title` - Category নাম
- `image` - Category এর uploaded image URL

---

---

### 3️⃣ Get Category by ID - একটি Category এর বিস্তারিত দেখতে

**সেটিং:** 
- 🔍 **কী করে:** একটি specific category এর সম্পূর্ণ তথ্য পায়
- 🎯 **ব্যবহার:** Category details page load করার সময়
- 🔐 **Auth:** প্রয়োজন নেই

---

**POSTMAN এ কীভাবে সেটাপ করবেন:**

```
┌──────────────────────────────────────────────────────────┐
│ METHOD:  GET                                             │
│ URL:     {{baseUrl}}/category/507f1f77bcf86cd799439011   │
│                                                          │
│ HEADERS:                                                 │
│ └─ Content-Type: application/json                       │
└──────────────────────────────────────────────────────────┘
```

**কীভাবে ID পাবেন?**
- Step 1: "Get All Categories" API call করুন
- Step 2: Response থেকে কোন category এর `_id` copy করুন
- Step 3: এই ID টা উপরের URL এ replace করুন

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/v1/category/507f1f77bcf86cd799439011" \
  -H "Content-Type: application/json"
```

**Response:** ✅ (Status: 200)
```json
{
  "success": true,
  "message": "Category retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Gaming",
    "slug": "gaming",
    "description": "All gaming related streams",
    "image": "https://example.com/gaming.jpg",
    "icon": "🎮",
    "isActive": true,
    "streamCount": 5,
    "order": 1,
    "createdAt": "2024-01-20T10:00:00.000Z",
    "updatedAt": "2024-01-20T10:00:00.000Z"
  }
}
```

---

### 4️⃣ Update Category (Admin Only) - Category এর Title এবং Image পরিবর্তন করতে

**সেটিং:** 
- 🔍 **কী করে:** Category এর title এবং image update করে
- 🎯 **ব্যবহার:** Category এর নাম বা ছবি পরিবর্তন করতে
- 🔐 **Auth:** **ADMIN TOKEN প্রয়োজন** ⚠️
- 📤 **Data Type:** **FORM-DATA** (JSON নয়!)

---

**POSTMAN এ কীভাবে সেটাপ করবেন:**

```
┌──────────────────────────────────────────────────────────┐
│ METHOD:  PUT                                             │
│ URL:     {{baseUrl}}/category/507f1f77bcf86cd799439011   │
│                                                          │
│ HEADERS:                                                 │
│ ├─ Authorization: Bearer {{adminToken}}                 │
│ └─ Content-Type: multipart/form-data                    │
└──────────────────────────────────────────────────────────┘
```

**POSTMAN Body এ কী দিবেন:**

1. **Body Tab তে "form-data" select করুন** (NOT raw!)
2. এই fields add করুন:

| Key | Type | Value |
|-----|------|-------|
| title | text | Gaming & Esports |
| image | file | new-gaming-image.jpg (নতুন ছবি file) |

**cURL Example:**
```bash
curl -X PUT "http://localhost:5000/api/v1/category/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "title=Gaming & Esports" \
  -F "image=@/path/to/new-image.jpg"
```

**Response:** ✅ (Status: 200)
```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Gaming & Esports",
    "image": "https://cloudinary.com/gaming-esports-new-123.jpg"
  }
}
```

💡 **শুধুমাত্র 3টি field response এ:**
- `_id` - Category ID
- `title` - Updated category নাম
- `image` - Updated image URL

**cURL Example:**
```bash
curl -X PUT "http://localhost:5000/api/v1/category/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Gaming & Esports",
    "description": "Competitive gaming and esports tournaments",
    "image": "https://example.com/gaming-esports-new.jpg",
    "isActive": true,
    "order": 1
  }'
```

**Response:** ✅ (Status: 200)
```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Gaming & Esports",
    "slug": "gaming-esports",
    "description": "Competitive gaming and esports tournaments",
    "image": "https://example.com/gaming-esports-new.jpg",
    "icon": "🎮",
    "isActive": true,
    "streamCount": 5,
    "order": 1,
    "updatedAt": "2024-01-20T11:30:00.000Z"
  }
}
```

---

### 5️⃣ Delete Category (Admin Only) - Category মুছে ফেলতে

**সেটিং:** 
- 🔍 **কী করে:** একটি category সম্পূর্ণভাবে delete করে
- 🎯 **ব্যবহার:** অপ্রয়োজনীয় categories মুছে ফেলতে
- 🔐 **Auth:** **ADMIN TOKEN প্রয়োজন** ⚠️

⚠️ **সতর্কতা:** একবার delete করলে ফিরিয়ে আনা যাবে না!

---

**POSTMAN এ কীভাবে সেটাপ করবেন:**

```
┌──────────────────────────────────────────────────────────┐
│ METHOD:  DELETE                                          │
│ URL:     {{baseUrl}}/category/507f1f77bcf86cd799439011   │
│                                                          │
│ HEADERS:                                                 │
│ ├─ Authorization: Bearer {{adminToken}}                 │
│ └─ Content-Type: application/json                       │
└──────────────────────────────────────────────────────────┘
```

**cURL Example:**
```bash
curl -X DELETE "http://localhost:5000/api/v1/category/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:** ✅ (Status: 200)
```json
{
  "success": true,
  "message": "Category deleted successfully",
  "data": null
}
```

💡 **ফলাফল:** Category dropdown থেকে এখন এটা দেখা যাবে না।

---

## 🎁 Gift APIs Testing

### 1️⃣ Get All Gifts
**Method:** `GET`
**URL:** `{{baseUrl}}/gift`
**Headers:**
```
Content-Type: application/json
```

**Response:** ✅
```json
{
  "success": true,
  "message": "Gifts retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Rose",
      "description": "A beautiful rose",
      "image": "https://example.com/rose.png",
      "animation": "https://example.com/rose.json",
      "price": 100,
      "category": "basic",
      "isActive": true,
      "order": 1,
      "createdAt": "2024-01-20T10:00:00.000Z"
    }
  ]
}
```

---

### 2️⃣ Create Gift (Admin Only)
**Method:** `POST`
**URL:** `{{baseUrl}}/gift`
**Headers:**
```
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

**Body:**
```json
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

**Response:** ✅
```json
{
  "success": true,
  "message": "Gift created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Rose",
    "price": 100,
    "category": "basic",
    "isActive": true
  }
}
```

---

### 3️⃣ Get Gifts by Category
**Method:** `GET`
**URL:** `{{baseUrl}}/gift/category/premium`
**Headers:**
```
Content-Type: application/json
```

**Response:** ✅
```json
{
  "success": true,
  "message": "Gifts retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Diamond",
      "description": "A precious diamond",
      "image": "https://example.com/diamond.png",
      "price": 5000,
      "category": "luxury",
      "isActive": true
    }
  ]
}
```

---

### 4️⃣ Send Gift to Streamer ⭐ (IMPORTANT)
**Method:** `POST`
**URL:** `{{baseUrl}}/gift/stream/{{streamId}}`
**Headers:**
```
Authorization: Bearer {{userToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "giftId": "507f1f77bcf86cd799439012",
  "quantity": 5,
  "message": "Great stream! Keep it up!",
  "isAnonymous": false
}
```

**Response:** ✅
```json
{
  "success": true,
  "message": "Gift sent successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "sender": {
      "_id": "{{userId}}",
      "name": "John Doe",
      "avatar": "https://example.com/avatar.jpg"
    },
    "receiver": {
      "_id": "{{streamerId}}",
      "name": "Jane Streamer"
    },
    "stream": "{{streamId}}",
    "gift": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Rose",
      "image": "https://example.com/rose.png",
      "animation": "https://example.com/rose.json",
      "price": 100
    },
    "quantity": 5,
    "totalAmount": 500,
    "message": "Great stream! Keep it up!",
    "isAnonymous": false,
    "status": "completed",
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

---

### 5️⃣ Get Stream Gifts
**Method:** `GET`
**URL:** `{{baseUrl}}/gift/stream/{{streamId}}/list`
**Headers:**
```
Authorization: Bearer {{userToken}}
Content-Type: application/json
```

**Response:** ✅
```json
{
  "success": true,
  "message": "Stream gifts retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "sender": {
        "name": "John Doe",
        "avatar": "https://example.com/avatar.jpg"
      },
      "gift": {
        "name": "Rose",
        "image": "https://example.com/rose.png"
      },
      "quantity": 5,
      "totalAmount": 500,
      "createdAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

---

## 📊 Poll APIs Testing

### 1️⃣ Create Poll ⭐
**Method:** `POST`
**URL:** `{{baseUrl}}/poll/stream/{{streamId}}/create`
**Headers:**
```
Authorization: Bearer {{streamerToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "question": "What game should I play next?",
  "options": ["Fortnite", "Valorant", "Apex Legends", "CS:GO"],
  "duration": 300,
  "allowMultipleVotes": false
}
```

**Response:** ✅
```json
{
  "success": true,
  "message": "Poll created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "stream": "{{streamId}}",
    "streamer": "{{streamerId}}",
    "question": "What game should I play next?",
    "options": [
      {
        "option": "Fortnite",
        "votes": 0,
        "voters": []
      },
      {
        "option": "Valorant",
        "votes": 0,
        "voters": []
      },
      {
        "option": "Apex Legends",
        "votes": 0,
        "voters": []
      },
      {
        "option": "CS:GO",
        "votes": 0,
        "voters": []
      }
    ],
    "duration": 300,
    "startTime": "2024-01-20T10:00:00.000Z",
    "endTime": "2024-01-20T10:05:00.000Z",
    "isActive": true,
    "totalVotes": 0,
    "allowMultipleVotes": false
  }
}
```

---

### 2️⃣ Vote on Poll ⭐
**Method:** `POST`
**URL:** `{{baseUrl}}/poll/507f1f77bcf86cd799439015/vote`
**Headers:**
```
Authorization: Bearer {{userToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "optionIndex": 0
}
```

**Response:** ✅
```json
{
  "success": true,
  "message": "Vote cast successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "question": "What game should I play next?",
    "options": [
      {
        "option": "Fortnite",
        "votes": 1,
        "voters": ["{{userId}}"]
      },
      {
        "option": "Valorant",
        "votes": 0,
        "voters": []
      }
    ],
    "totalVotes": 1,
    "isActive": true
  }
}
```

---

### 3️⃣ Get Poll Results
**Method:** `GET`
**URL:** `{{baseUrl}}/poll/507f1f77bcf86cd799439015/results`
**Headers:**
```
Content-Type: application/json
```

**Response:** ✅
```json
{
  "success": true,
  "message": "Poll results retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "question": "What game should I play next?",
    "options": [
      {
        "option": "Fortnite",
        "votes": 25
      },
      {
        "option": "Valorant",
        "votes": 18
      },
      {
        "option": "Apex Legends",
        "votes": 12
      },
      {
        "option": "CS:GO",
        "votes": 8
      }
    ],
    "totalVotes": 63,
    "isActive": false,
    "endTime": "2024-01-20T10:05:00.000Z"
  }
}
```

---

### 4️⃣ Get Active Poll for Stream
**Method:** `GET`
**URL:** `{{baseUrl}}/poll/stream/{{streamId}}/active`
**Headers:**
```
Content-Type: application/json
```

**Response:** ✅
```json
{
  "success": true,
  "message": "Active poll retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "question": "What game should I play next?",
    "options": [
      {
        "option": "Fortnite",
        "votes": 15
      }
    ],
    "endTime": "2024-01-20T10:05:00.000Z",
    "isActive": true
  }
}
```

---

### 5️⃣ End Poll
**Method:** `POST`
**URL:** `{{baseUrl}}/poll/507f1f77bcf86cd799439015/end`
**Headers:**
```
Authorization: Bearer {{streamerToken}}
Content-Type: application/json
```

**Response:** ✅
```json
{
  "success": true,
  "message": "Poll ended successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "isActive": false
  }
}
```

---

## 📺 Stream APIs (Go Live) Testing

### 1️⃣ Start Stream ⭐⭐ (MOST IMPORTANT)
**Method:** `POST`
**URL:** `{{baseUrl}}/stream/start`
**Headers:**
```
Authorization: Bearer {{streamerToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Epic Gaming Session 🎮",
  "description": "Playing Valorant with viewers. Come join!",
  "category": "507f1f77bcf86cd799439011",
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

**Response:** ✅ (Save stream ID!)
```json
{
  "success": true,
  "message": "Stream started successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "streamer": {
      "_id": "{{streamerId}}",
      "name": "John Streamer",
      "avatar": "https://example.com/avatar.jpg"
    },
    "title": "Epic Gaming Session 🎮",
    "description": "Playing Valorant with viewers. Come join!",
    "category": "507f1f77bcf86cd799439011",
    "contentRating": "PG-13",
    "banner": "https://example.com/banner.jpg",
    "bannerPosition": "top",
    "visibility": "public",
    "status": "live",
    "agora": {
      "channelName": "stream_123_1234567890",
      "token": "007eJxTYGAYZWAc/Z8hc0vL+TsFBroOBSWVhpkFSUmGJQUpxQWZxQUlJcUFGRmFJYV5JZklKQWFeXlFxZklJSlFBcklJakl+TkpBXk5JQU5mWWpBQUlxfnFJUVFqQWpxSUlhZVFWQx1DMwMDAwMjA2MDAzM9AyNzMwMDIwM9A0NDYzMDAyRioBAADTEKQ=",
      "uid": 12345,
      "expiryTime": "2024-01-20T11:00:00.000Z"
    },
    "streamControls": {
      "cameraOn": true,
      "micOn": true,
      "background": ""
    },
    "currentViewerCount": 0,
    "likes": 0,
    "allowComments": true,
    "allowGifts": true,
    "enablePolls": true,
    "enableAdBanners": false,
    "startedAt": "2024-01-20T10:00:00.000Z"
  }
}
```

**⚠️ মনে রাখবেন:** এই response এ `_id` (stream ID) এবং `agora.token` save করুন। এগুলো পরবর্তী requests এ দরকার হবে।

---

### 2️⃣ Update Stream Settings ⭐
**Method:** `PUT`
**URL:** `{{baseUrl}}/stream/{{streamId}}/settings`
**Headers:**
```
Authorization: Bearer {{streamerToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Updated Stream Title 🎮🔥",
  "description": "Updated description - now playing CS:GO",
  "allowComments": true,
  "allowGifts": true,
  "enablePolls": false,
  "enableAdBanners": false
}
```

**Response:** ✅
```json
{
  "success": true,
  "message": "Stream settings updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "title": "Updated Stream Title 🎮🔥",
    "description": "Updated description - now playing CS:GO",
    "allowComments": true,
    "allowGifts": true,
    "enablePolls": false,
    "enableAdBanners": false
  }
}
```

---

### 3️⃣ Toggle Stream Controls (Camera/Mic) ⭐
**Method:** `PUT`
**URL:** `{{baseUrl}}/stream/{{streamId}}/controls`
**Headers:**
```
Authorization: Bearer {{streamerToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "cameraOn": false,
  "micOn": true,
  "background": "blur"
}
```

**Response:** ✅
```json
{
  "success": true,
  "message": "Stream controls updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "streamControls": {
      "cameraOn": false,
      "micOn": true,
      "background": "blur"
    }
  }
}
```

---

### 4️⃣ Like Stream
**Method:** `POST`
**URL:** `{{baseUrl}}/stream/{{streamId}}/like`
**Headers:**
```
Authorization: Bearer {{userToken}}
Content-Type: application/json
```

**Body:** (empty)
```json
{}
```

**Response:** ✅
```json
{
  "success": true,
  "message": "Stream liked successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "likes": 124
  }
}
```

---

### 5️⃣ Join Stream (Viewer Token পেতে)
**Method:** `POST`
**URL:** `{{baseUrl}}/stream/{{streamId}}/join`
**Headers:**
```
Authorization: Bearer {{userToken}}
Content-Type: application/json
```

**Body:**
```json
{}
```

**Response:** ✅
```json
{
  "success": true,
  "message": "Joined stream successfully",
  "data": {
    "stream": {
      "_id": "507f1f77bcf86cd799439016",
      "title": "Epic Gaming Session 🎮",
      "currentViewerCount": 51,
      "agora": {
        "channelName": "stream_123_1234567890"
      }
    },
    "viewerToken": {
      "token": "007eJxTYGAYZWAc/Z8hc0vL+TsFBroOBSWVhpkFSUUpxQWZxQUlJcUFGRmFJYV5JZklKQWFeXlFxZklJSlFBcklJakl+TkpBXk5JQU5mWWpBQUlxfnFJUVFqQWpxSUlhZVFWQx1DMwMDAwMjA2MDAzM9AyNzMwMDIwM9A0NDYzMDAyRioBAADTEKQ=",
      "channelName": "stream_123_1234567890",
      "uid": 67890,
      "expiryTime": "2024-01-20T11:00:00.000Z"
    }
  }
}
```

---

### 6️⃣ Get Stream Analytics ⭐
**Method:** `GET`
**URL:** `{{baseUrl}}/stream/{{streamId}}/analytics`
**Headers:**
```
Authorization: Bearer {{streamerToken}}
Content-Type: application/json
```

**Response:** ✅
```json
{
  "success": true,
  "message": "Stream analytics retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439017",
    "stream": "507f1f77bcf86cd799439016",
    "totalViewers": 4070,
    "peakViewers": 5000,
    "likes": 823,
    "giftsReceived": 156,
    "revenue": 493.50,
    "averageWatchTime": 107,
    "newSubscribers": 12,
    "newFollowers": 34,
    "duration": 3671,
    "engagementRate": 45.2
  }
}
```

---

### 7️⃣ End Stream
**Method:** `POST`
**URL:** `{{baseUrl}}/stream/{{streamId}}/end`
**Headers:**
```
Authorization: Bearer {{streamerToken}}
Content-Type: application/json
```

**Body:**
```json
{}
```

**Response:** ✅
```json
{
  "success": true,
  "message": "Stream ended successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "status": "ended",
    "endedAt": "2024-01-20T10:01:00.000Z",
    "duration": 60
  }
}
```

---

## 💬 Socket.io Events Testing

Postman এ Socket.io events test করতে **Socket.io Client** tool use করুন অথবা command line এ curl দিয়ে test করুন।

### Connection Setup
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### 1️⃣ Join Stream
```javascript
socket.emit('stream:join', {
  streamId: '507f1f77bcf86cd799439016',
  userId: '{{userId}}'
});

// Listen for response
socket.on('stream:viewer-joined', (data) => {
  console.log('User joined:', data);
  // data = { userId, streamId, viewerCount }
});
```

---

### 2️⃣ Send Chat Message
```javascript
socket.emit('stream:chat', {
  streamId: '507f1f77bcf86cd799439016',
  userId: '{{userId}}',
  content: 'Great stream! 🔥'
});

// Listen for broadcast
socket.on('stream:message', (data) => {
  console.log('New message:', data);
  // data = { _id, sender, content, type: 'text', createdAt }
});
```

---

### 3️⃣ Send Gift
```javascript
socket.emit('stream:gift', {
  streamId: '507f1f77bcf86cd799439016',
  userId: '{{userId}}',
  giftId: '507f1f77bcf86cd799439012',
  quantity: 5,
  message: 'Love your content!',
  isAnonymous: false
});

// Listen for broadcast
socket.on('stream:gift-sent', (data) => {
  console.log('Gift sent:', data);
  /* data = {
    transaction: {
      _id, sender, gift, quantity, message, totalAmount
    },
    timestamp
  } */
});
```

---

### 4️⃣ Like Stream
```javascript
socket.emit('stream:like', {
  streamId: '507f1f77bcf86cd799439016',
  userId: '{{userId}}'
});

// Listen for broadcast
socket.on('stream:liked', (data) => {
  console.log('Stream liked:', data);
  // data = { userId, timestamp }
});
```

---

### 5️⃣ Create Poll
```javascript
socket.emit('stream:create-poll', {
  streamId: '507f1f77bcf86cd799439016',
  streamerId: '{{streamerId}}',
  question: 'What game next?',
  options: ['Fortnite', 'Valorant', 'CS:GO'],
  duration: 300
});

// Listen for broadcast
socket.on('stream:poll-created', (data) => {
  console.log('Poll created:', data);
  /* data = {
    poll: { _id, question, options, duration, endTime },
    timestamp
  } */
});
```

---

### 6️⃣ Vote on Poll
```javascript
socket.emit('stream:vote-poll', {
  pollId: '507f1f77bcf86cd799439015',
  streamId: '507f1f77bcf86cd799439016',
  userId: '{{userId}}',
  optionIndex: 0
});

// Listen for broadcast
socket.on('stream:poll-updated', (data) => {
  console.log('Poll updated:', data);
  // data = { pollId, options, totalVotes }
});
```

---

## 🦋 Flutter Integration Examples

### 1️⃣ Categories Dropdown (Go Live Screen)
```dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class GoLiveScreen extends StatefulWidget {
  @override
  _GoLiveScreenState createState() => _GoLiveScreenState();
}

class _GoLiveScreenState extends State<GoLiveScreen> {
  List<dynamic> categories = [];
  String? selectedCategory;
  bool isLoading = false;

  @override
  void initState() {
    super.initState();
    fetchCategories();
  }

  Future<void> fetchCategories() async {
    setState(() => isLoading = true);
    
    try {
      final response = await http.get(
        Uri.parse('http://localhost:5000/api/v1/category'),
        headers: {
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          categories = data['data'];
          isLoading = false;
        });
      }
    } catch (e) {
      print('Error: $e');
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Go Live')),
      body: isLoading
          ? Center(child: CircularProgressIndicator())
          : ListView(
              padding: EdgeInsets.all(16),
              children: [
                // Category Dropdown
                DropdownButton<String>(
                  hint: Text('Select Category'),
                  value: selectedCategory,
                  isExpanded: true,
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
                    setState(() => selectedCategory = value);
                  },
                ),
              ],
            ),
    );
  }
}
```

---

### 2️⃣ Start Stream Request
```dart
Future<void> startStream() async {
  final String token = 'your_streamer_token'; // from SharedPreferences
  
  try {
    final response = await http.post(
      Uri.parse('http://localhost:5000/api/v1/stream/start'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'title': 'My Epic Stream',
        'description': 'Gaming session',
        'category': selectedCategory,
        'contentRating': 'PG-13',
        'visibility': 'public',
        'allowComments': true,
        'allowGifts': true,
        'enablePolls': true,
        'enableAdBanners': false,
        'isRecordingEnabled': true,
        'tags': ['gaming', 'live'],
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final streamId = data['data']['_id'];
      final agoraToken = data['data']['agora']['token'];
      final channelName = data['data']['agora']['channelName'];

      // Navigate to streaming screen with Agora
      // initializeAgora(agoraToken, channelName);
    }
  } catch (e) {
    print('Error: $e');
  }
}
```

---

### 3️⃣ Send Gift (Socket.io or HTTP)
```dart
// Option 1: Using Socket.io
void sendGift({
  required String streamId,
  required String giftId,
  required int quantity,
  String? message,
}) {
  socket.emit('stream:gift', {
    'streamId': streamId,
    'userId': userId,
    'giftId': giftId,
    'quantity': quantity,
    'message': message ?? '',
    'isAnonymous': false,
  });
}

// Option 2: Using HTTP POST
Future<void> sendGiftHttp({
  required String streamId,
  required String giftId,
  required int quantity,
}) async {
  final token = 'your_user_token';
  
  try {
    final response = await http.post(
      Uri.parse('http://localhost:5000/api/v1/gift/stream/$streamId'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'giftId': giftId,
        'quantity': quantity,
        'message': 'Great stream!',
        'isAnonymous': false,
      }),
    );

    if (response.statusCode == 201) {
      final data = jsonDecode(response.body);
      print('Gift sent: ${data['data']['totalAmount']} cents');
    }
  } catch (e) {
    print('Error: $e');
  }
}
```

---

### 4️⃣ Listen to Socket.io Events
```dart
void setupSocketListeners(String streamId) {
  // Listen for gift sent
  socket.on('stream:gift-sent', (data) {
    print('Gift received: ${data['transaction']['totalAmount']}');
    // Update UI with gift animation
    showGiftAnimation(data['transaction']['gift']['animation']);
  });

  // Listen for new messages
  socket.on('stream:message', (data) {
    print('New message: ${data['content']}');
    // Update chat UI
    addMessageToChat(data);
  });

  // Listen for poll created
  socket.on('stream:poll-created', (data) {
    print('New poll: ${data['poll']['question']}');
    // Show poll UI
    showPollDialog(data['poll']);
  });

  // Listen for like
  socket.on('stream:liked', (data) {
    print('Stream liked!');
    // Animate like button
  });
}
```

---

### 5️⃣ Create Poll (Streamer)
```dart
Future<void> createPoll({
  required String streamId,
  required String question,
  required List<String> options,
  required int duration,
}) async {
  final token = 'your_streamer_token';
  
  try {
    final response = await http.post(
      Uri.parse('http://localhost:5000/api/v1/poll/stream/$streamId/create'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'question': question,
        'options': options,
        'duration': duration,
        'allowMultipleVotes': false,
      }),
    );

    if (response.statusCode == 201) {
      final data = jsonDecode(response.body);
      final pollId = data['data']['_id'];
      print('Poll created: $pollId');
    }
  } catch (e) {
    print('Error: $e');
  }
}
```

---

### 6️⃣ Vote on Poll (Viewer)
```dart
Future<void> votePoll({
  required String pollId,
  required int optionIndex,
}) async {
  final token = 'your_user_token';
  
  try {
    final response = await http.post(
      Uri.parse('http://localhost:5000/api/v1/poll/$pollId/vote'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'optionIndex': optionIndex,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      print('Vote cast successfully');
      // Update poll UI with results
      updatePollResults(data['data']['options']);
    }
  } catch (e) {
    print('Error: $e');
  }
}
```

---

### 7️⃣ Get Stream Analytics
```dart
Future<void> getStreamAnalytics(String streamId) async {
  final token = 'your_streamer_token';
  
  try {
    final response = await http.get(
      Uri.parse('http://localhost:5000/api/v1/stream/$streamId/analytics'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final analytics = data['data'];
      
      print('Total Viewers: ${analytics['totalViewers']}');
      print('Peak Viewers: ${analytics['peakViewers']}');
      print('Likes: ${analytics['likes']}');
      print('Revenue: \$${analytics['revenue']}');
      
      // Update UI with analytics
      updateAnalyticsDisplay(analytics);
    }
  } catch (e) {
    print('Error: $e');
  }
}
```

---

## 🔑 Important Notes

### Token Management
```dart
// Store token in SharedPreferences
final prefs = await SharedPreferences.getInstance();
prefs.setString('userToken', token);

// Retrieve token
final token = prefs.getString('userToken');

// Always include in headers
'Authorization': 'Bearer $token',
```

---

### Base URL Configuration
```dart
const String BASE_URL = 'http://localhost:5000/api/v1';

// For production
// const String BASE_URL = 'https://your-api.com/api/v1';
```

---

### Socket.io Connection with Token
```dart
final socket = IO.io(
  'http://localhost:5000',
  OptionBuilder()
    .setTransports(['websocket'])
    .setAuth({'token': 'your_jwt_token'})
    .build(),
);

socket.onConnect((_) {
  print('Socket connected');
});

socket.onDisconnect((_) {
  print('Socket disconnected');
});
```

---

## 🚀 Testing Order (Recommended)

1. ✅ **Category APIs** - Get categories list first
2. ✅ **Start Stream** - Create a live stream
3. ✅ **Join Stream** - Join as viewer
4. ✅ **Create Poll** - Create a poll in the stream
5. ✅ **Vote on Poll** - Vote on the poll
6. ✅ **Send Gift** - Send gift to streamer
7. ✅ **Update Settings** - Change stream settings
8. ✅ **Toggle Controls** - Toggle camera/mic
9. ✅ **Get Analytics** - Get stream statistics
10. ✅ **End Stream** - End the stream

---

**Happy Testing! 🎉**
