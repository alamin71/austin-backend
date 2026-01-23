# Stream Start - Form-Data Example

## POST {{baseUrl}}/api/v1/stream/start

### Headers
```
Authorization: Bearer {your_jwt_token}
Content-Type: multipart/form-data
```

### Body (form-data)

Send the following fields as **form-data** (NOT JSON):

| Key | Type | Value | Required |
|-----|------|-------|----------|
| `title` | Text | Epic Gaming Session | ✓ Yes |
| `description` | Text | Playing Valorant with viewers. Come join! | No |
| `category` | Text | 507f1f77bcf86cd799439011 | ✓ Yes |
| `contentRating` | Text | PG-13 | No |
| `banner` | File | [Select image file] | No |
| `bannerPosition` | Text | top | No |
| `visibility` | Text | public | No |
| `allowComments` | Text | true | No |
| `allowGifts` | Text | true | No |
| `enablePolls` | Text | true | No |
| `enableAdBanners` | Text | false | No |
| `isAgeRestricted` | Text | false | No |
| `isRecordingEnabled` | Text | true | No |
| `background` | Text | | No |
| `tags` | Text | gaming,valorant,live | No |

---

## ⚠️ Important Notes:

### 1. Boolean Fields
Boolean values must be sent as **string** (`"true"` or `"false"`) in form-data:
```
allowComments: "true"  ✓ Correct
allowComments: true    ✗ Wrong (will be ignored)
```

### 2. Tags Field
Tags can be sent in two ways:

**Option A: Comma-separated string**
```
tags: "gaming,valorant,live"
```

**Option B: JSON array string**
```
tags: ["gaming", "valorant", "live"]
```

### 3. Banner Upload
- Field name: `banner`
- File types: `.png`, `.jpg`, `.jpeg`, `.webp`
- Max size: 10MB
- If uploaded, banner URL will be automatically set

### 4. Category ID
You must provide a valid MongoDB ObjectId for category. Get category list first:
```
GET {{baseUrl}}/api/v1/category
```

---

## Postman Setup Steps

### 1. Create New Request
- Method: `POST`
- URL: `http://localhost:5000/api/v1/stream/start`

### 2. Authorization Tab
- Type: Bearer Token
- Token: `{your_jwt_token}`

### 3. Body Tab
- Select: `form-data` (NOT raw JSON)
- Add fields as shown in table above

### 4. Add Banner Image (Optional)
- Click dropdown next to "Key"
- Select "File" type
- Click "Select Files"
- Choose your image

### 5. Send Request

---

## Example Response

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Stream started successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Epic Gaming Session",
    "description": "Playing Valorant with viewers. Come join!",
    "streamer": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Your Name",
      "image": {
        "profile_image": "url"
      }
    },
    "category": {
      "_id": "507f1f77bcf86cd799439013",
      "title": "Gaming"
    },
    "status": "live",
    "agora": {
      "channelName": "stream_507f1f77bcf86cd799439011",
      "token": "agora_rtc_token_here...",
      "uid": 12345,
      "expiryTime": "2026-01-24T01:30:00Z"
    },
    "banner": "/uploads/banner/epic-gaming-session-1706058000000.jpg",
    "bannerPosition": "top",
    "visibility": "public",
    "contentRating": "PG-13",
    "allowComments": true,
    "allowGifts": true,
    "enablePolls": true,
    "enableAdBanners": false,
    "isAgeRestricted": false,
    "isRecordingEnabled": true,
    "tags": ["gaming", "valorant", "live"],
    "currentViewerCount": 0,
    "peakViewerCount": 0,
    "startedAt": "2026-01-24T00:30:00Z",
    "createdAt": "2026-01-24T00:30:00Z"
  }
}
```

---

## cURL Example

```bash
curl --location 'http://localhost:5000/api/v1/stream/start' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN' \
--form 'title="Epic Gaming Session"' \
--form 'description="Playing Valorant with viewers. Come join!"' \
--form 'category="507f1f77bcf86cd799439011"' \
--form 'contentRating="PG-13"' \
--form 'banner=@"/path/to/banner.jpg"' \
--form 'bannerPosition="top"' \
--form 'visibility="public"' \
--form 'allowComments="true"' \
--form 'allowGifts="true"' \
--form 'enablePolls="true"' \
--form 'enableAdBanners="false"' \
--form 'isAgeRestricted="false"' \
--form 'isRecordingEnabled="true"' \
--form 'tags="gaming,valorant,live"'
```

---

## Common Errors

### 1. "Title is required"
- Make sure `title` field is included
- Value should not be empty

### 2. "Category is required"
- Include valid MongoDB ObjectId for category
- Get category list first

### 3. "Only .png, .jpg, .jpeg, .webp files are allowed"
- Check your banner file format
- Use supported image formats only

### 4. "File too large"
- Banner size must be under 10MB
- Compress your image if needed

### 5. "User not authenticated"
- Check Authorization header
- Verify JWT token is valid
- Token format: `Bearer {token}`

---

## Testing Without Banner

You can test without uploading a banner:

```
Key: title               | Value: Epic Gaming Session
Key: description         | Value: Testing stream
Key: category            | Value: 507f1f77bcf86cd799439011
Key: allowComments       | Value: true
Key: allowGifts          | Value: true
Key: tags                | Value: test,live
```

Banner will be optional and stream will work without it.

---

**Updated:** January 24, 2026  
**Status:** ✅ Form-data support enabled
