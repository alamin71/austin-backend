# Analytics Dashboard API Documentation

## Overview

The Analytics API provides comprehensive insights into streaming platform performance, streamer metrics, and revenue analytics. This module is designed for both platform administrators and individual streamers.

---

## Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/analytics/platform` | Admin | Platform-wide analytics |
| GET | `/api/v1/analytics/realtime` | Public | Real-time live streaming data |
| GET | `/api/v1/analytics/my-dashboard` | User | Current user's dashboard |
| GET | `/api/v1/analytics/streamer/{streamerId}` | User/Admin | Specific streamer analytics |
| GET | `/api/v1/analytics/category/{categoryId}` | Public | Category performance analytics |
| GET | `/api/v1/analytics/comparison` | User | Month-over-month comparison |

---

## API Endpoints

### 1. Platform Analytics (Admin Only)

Get comprehensive platform-wide analytics including total streams, viewers, revenue, and top performers.

**Request:**
```
GET /api/v1/analytics/platform?startDate=2026-01-01&endDate=2026-01-31
Authorization: Bearer {admin_token}
```

**Query Parameters:**
- `startDate` (optional) - Start date for analytics range (ISO 8601)
- `endDate` (optional) - End date for analytics range (ISO 8601)

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Platform analytics retrieved successfully",
  "data": {
    "overview": {
      "totalStreams": 1250,
      "liveStreams": 45,
      "endedStreams": 1205,
      "totalStreamers": 320,
      "totalUniqueViewers": 15000,
      "totalWatchTime": 125000,
      "avgStreamDuration": 3600,
      "totalRevenue": 45000,
      "totalGifts": 8500
    },
    "topCategories": [
      {
        "category": "Gaming",
        "streamCount": 450,
        "totalViewers": 5000
      },
      {
        "category": "Music",
        "streamCount": 280,
        "totalViewers": 3500
      }
    ],
    "topStreamers": [
      {
        "streamer": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "Streamer Name",
          "avatar": "https://example.com/avatar.jpg"
        },
        "streamCount": 85,
        "totalViewers": 12000,
        "avgViewers": 141
      }
    ]
  }
}
```

---

### 2. Real-time Analytics (Public)

Get live streaming statistics including current active streams and total live viewers.

**Request:**
```
GET /api/v1/analytics/realtime
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Real-time analytics retrieved successfully",
  "data": {
    "liveStreamCount": 45,
    "totalLiveViewers": 3200,
    "liveStreams": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Epic Gaming Stream",
        "streamer": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Streamer Name",
          "image": {
            "profile_image": "url"
          }
        },
        "category": {
          "_id": "507f1f77bcf86cd799439013",
          "title": "Gaming"
        },
        "currentViewerCount": 250,
        "peakViewerCount": 320,
        "startedAt": "2026-01-23T10:00:00Z",
        "duration": 3600
      }
    ]
  }
}
```

---

### 3. My Dashboard (Current User)

Get analytics dashboard for the authenticated user.

**Request:**
```
GET /api/v1/analytics/my-dashboard?startDate=2026-01-01&endDate=2026-01-31
Authorization: Bearer {token}
```

**Query Parameters:**
- `startDate` (optional) - Start date for analytics range
- `endDate` (optional) - End date for analytics range

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Dashboard retrieved successfully",
  "data": {
    "overview": {
      "totalStreams": 45,
      "liveStreams": 2,
      "totalDuration": 162000,
      "avgDuration": 3600,
      "totalViewers": 2500,
      "avgViewers": 55,
      "peakViewers": 320,
      "totalLikes": 1250
    },
    "revenue": {
      "totalRevenue": 5600,
      "totalGifts": 450,
      "totalNewSubscribers": 85,
      "totalNewFollowers": 150,
      "avgEngagement": 68.5
    },
    "giftsBreakdown": [
      {
        "giftName": "Diamond",
        "giftImage": "https://example.com/diamond.png",
        "count": 45,
        "totalAmount": 2250
      },
      {
        "giftName": "Rose",
        "giftImage": "https://example.com/rose.png",
        "count": 120,
        "totalAmount": 1200
      }
    ],
    "recentStreams": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Gaming Stream",
        "status": "ended",
        "category": {
          "title": "Gaming"
        },
        "duration": 3600,
        "currentViewerCount": 150,
        "peakViewerCount": 250,
        "likes": 85,
        "startedAt": "2026-01-23T10:00:00Z",
        "endedAt": "2026-01-23T11:00:00Z"
      }
    ],
    "growthData": [
      {
        "_id": {
          "year": 2026,
          "month": 1,
          "day": 23
        },
        "streamCount": 3,
        "totalViewers": 450,
        "avgViewers": 150
      }
    ]
  }
}
```

---

### 4. Streamer Analytics (Specific User)

Get analytics for a specific streamer. Users can only view their own analytics unless they are admins.

**Request:**
```
GET /api/v1/analytics/streamer/{streamerId}?startDate=2026-01-01&endDate=2026-01-31
Authorization: Bearer {token}
```

**URL Parameters:**
- `streamerId` - User ID of the streamer

**Query Parameters:**
- `startDate` (optional) - Start date for analytics range
- `endDate` (optional) - End date for analytics range

**Response:** Same as "My Dashboard" response

**Access Control:**
- Users can only view their own analytics (`streamerId` must match authenticated user ID)
- Admins can view any streamer's analytics

---

### 5. Category Analytics (Public)

Get performance analytics for a specific streaming category.

**Request:**
```
GET /api/v1/analytics/category/{categoryId}?startDate=2026-01-01&endDate=2026-01-31
```

**URL Parameters:**
- `categoryId` - Category ID

**Query Parameters:**
- `startDate` (optional) - Start date for analytics range
- `endDate` (optional) - End date for analytics range

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Category analytics retrieved successfully",
  "data": {
    "stats": {
      "totalStreams": 450,
      "totalViewers": 5000,
      "avgViewers": 11,
      "peakViewers": 320,
      "totalDuration": 1620000
    },
    "topStreamers": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "streamCount": 25,
        "totalViewers": 1200,
        "streamerInfo": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "Top Streamer",
          "image": {
            "profile_image": "url"
          }
        }
      }
    ]
  }
}
```

---

### 6. Comparison Analytics (Month-over-Month)

Compare current month performance with the previous month.

**Request:**
```
GET /api/v1/analytics/comparison?streamerId={streamerId}
Authorization: Bearer {token}
```

**Query Parameters:**
- `streamerId` (optional) - Specific streamer ID to analyze. If omitted, uses authenticated user.

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Comparison analytics retrieved successfully",
  "data": {
    "thisMonth": {
      "streamCount": 15,
      "totalViewers": 850,
      "avgViewers": 56.67
    },
    "lastMonth": {
      "streamCount": 12,
      "totalViewers": 650,
      "avgViewers": 54.17
    },
    "growth": {
      "streamCount": 25.0,
      "totalViewers": 30.77,
      "avgViewers": 4.62
    }
  }
}
```

**Growth Calculation:**
- Growth percentage = `((thisMonth - lastMonth) / lastMonth) * 100`
- Positive values indicate growth
- Negative values indicate decline

---

## Use Cases

### For Platform Admins
1. **Monitor Platform Health**
   - Use `/analytics/platform` to track total streams, viewers, revenue
   - Identify top-performing categories and streamers
   - Make data-driven decisions for platform improvements

2. **Track Real-time Activity**
   - Use `/analytics/realtime` to see current live streams
   - Monitor concurrent viewer counts
   - Identify trending content

### For Streamers
1. **Personal Performance Dashboard**
   - Use `/analytics/my-dashboard` to view comprehensive metrics
   - Track revenue, gifts, and engagement
   - Review recent stream performance

2. **Growth Tracking**
   - Use `/analytics/comparison` to compare month-over-month growth
   - Identify trends in viewer count and engagement
   - Set goals based on historical data

3. **Gift Revenue Analysis**
   - Review `giftsBreakdown` to see which gifts generate most revenue
   - Understand audience preferences
   - Optimize content for higher engagement

### For Category Managers
1. **Category Performance**
   - Use `/analytics/category/{categoryId}` to track category metrics
   - Identify top streamers in each category
   - Optimize category-specific promotions

---

## Data Metrics Explained

### Overview Metrics
- **totalStreams** - Total number of streams created
- **liveStreams** - Currently active streams
- **endedStreams** - Completed streams
- **totalStreamers** - Unique users who have streamed
- **totalUniqueViewers** - Unique users who watched streams
- **totalWatchTime** - Combined duration of all streams (seconds)
- **avgStreamDuration** - Average duration per stream (seconds)

### Revenue Metrics
- **totalRevenue** - Total earnings from gifts and monetization
- **totalGifts** - Number of gifts received
- **totalNewSubscribers** - New subscriptions gained during streams
- **totalNewFollowers** - New followers gained during streams
- **avgEngagement** - Average engagement rate percentage

### Performance Metrics
- **currentViewerCount** - Live viewers at stream end
- **peakViewerCount** - Maximum concurrent viewers
- **likes** - Total likes received
- **chatCount** - Total chat messages sent

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "statusCode": 401,
  "message": "User not authenticated"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "statusCode": 403,
  "message": "You can only view your own analytics"
}
```

### 404 Not Found
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Streamer not found"
}
```

---

## Best Practices

1. **Date Range Selection**
   - Use appropriate date ranges to avoid large data queries
   - Default behavior (no dates) returns all-time stats
   - Recommended: Monthly or weekly ranges for detailed analysis

2. **Caching**
   - Consider caching analytics data for frequently accessed endpoints
   - Real-time data updates every few seconds
   - Dashboard data can be cached for 5-15 minutes

3. **Performance**
   - Platform analytics may take longer for large datasets
   - Use date filters to improve query performance
   - Real-time analytics is optimized for fast response

4. **Access Control**
   - Admins have full access to all analytics
   - Users can only view their own streamer analytics
   - Public endpoints are available to all users

---

## Future Enhancements

- [ ] Export analytics to CSV/PDF
- [ ] Custom date range presets (Last 7 days, Last 30 days, etc.)
- [ ] Audience demographics (age, location, device)
- [ ] Revenue forecasting and predictions
- [ ] Advanced filtering and sorting
- [ ] Scheduled analytics reports via email
- [ ] Comparative analytics (compare multiple streamers)
- [ ] Stream-level detailed analytics
- [ ] Heatmap for peak viewing times

---

**Last Updated:** January 23, 2026  
**Version:** 1.0.0
