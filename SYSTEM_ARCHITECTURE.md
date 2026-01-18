# VidZo Streaming Platform System Architecture

## 1. High-Level Overview

```
[Mobile/Web Client]
        |
   [API Gateway]
        |
-------------------------------------------------
|         |         |         |         |        |
Auth   User/Profile  Stream   Market   Notify   Admin
Svc      Svc         Svc      Svc      Svc      Svc
        |            |        |        |        |
     [MongoDB]   [Redis]   [Agora] [Stripe] [S3/CDN]
        |            |        |        |        |
   [Monitoring/Logging/Queue/Deployment]
```

## 2. Components

- **Client Apps:** Mobile/Web (React Native/Flutter/React)
- **API Gateway:** Central entry point for all requests (rate limiting, auth, routing)
- **Backend Services (Node.js + TypeScript):**
     - **Auth Service** (JWT, OAuth, OTP)
          - Email/Password authentication
          - Google OAuth 2.0 (google-auth-library)
          - Apple OAuth (JWT token decoding)
          - OTP generation & verification (10-min expiry)
          - JWT token generation (access & refresh)
     - User/Profile Service
     - Stream Service (Live, Analytics, Chat)
     - Marketplace Service (Products, Orders, Payments)
     - Notification Service (Push, Email, In-app)
     - Admin Service (Dashboard, Moderation)
- **Database:** MongoDB (Sharded, Replica Set for scaling & failover)
- **Cache:** Redis (Session, rate limiting, frequently accessed data)
- **Live Streaming:** Agora (SDK integration for real-time video/audio)
- **Real-time Communication:** Socket.io (Live chat, notifications)
- **Payments:** Stripe/PayPal (secure payment processing)
- **File Storage:** Cloud Storage (AWS S3, GCP, etc. for media uploads)
- **CDN:** For fast media delivery (images, videos, banners)
- **Monitoring & Logging:** Winston, Prometheus, Grafana (error, performance, crash analytics)
- **Deployment:** Vercel, Docker, Kubernetes (auto-scaling, zero-downtime)

## 3. Scalability & Crash Protection

- Horizontal scaling (multiple backend instances)
- MongoDB sharding/replica set
- Redis for caching, pub/sub
- CDN for media/static files
- Rate limiting, circuit breaker for crash protection
- Graceful shutdown, health checks, async processing

## 4. Authentication Flow

### Multi-Provider Authentication Architecture
```
[Client]
    |
    +-- Email/Password Auth
    |       |
    |   [Email Login]
    |       |
    |   [Password Validation]
    |       |
    +-- Google OAuth
    |       |
    |   [Google ID Token]
    |       |
    |   [google-auth-library verification]
    |       |
    +-- Apple OAuth
    |       |
    |   [Apple Identity Token]
    |       |
    |   [JWT Decoding]
    |       |
    +-- OTP Authentication
            |
        [Email OTP (6-digit)]
            |
        [10-minute expiry]
            |
            v
      [JWT Token Generation]
            |
      [Access Token (7 days)]
      [Refresh Token (365 days)]
            |
        [Authenticated Client]
```

### OTP System
- Generated as 6-digit code
- Stored in User model with 10-minute expiry
- Email delivery (nodemailer/sendgrid integration needed)
- Single-use verification
- Marked email as verified after successful OTP verification

### OAuth Providers
- **Google:** Token verification via google-auth-library (verified official method)
- **Apple:** JWT token decoding (needs production signature verification)
- **User Creation:** Automatic on first OAuth login (email-based lookup)
- **Email Verification:** Set to true for OAuth users, optional for email/password users

## 5. Live Streaming Optimization

- Agora SDK for real-time video/audio
- Backend for signaling, user management, analytics
- Socket.io for live chat, reactions, polls
- CDN and cloud storage for media

## 6. API Response Optimization

- Minimal response (only required fields)
- Pagination, filtering, search optimization
- MongoDB indexes for fast query

## 7. Admin Dashboard & Extended Modules

- **Admin Dashboard:** Approvals, earnings, live monitoring, top performers, report monitoring, feedback, documentation management
- **Challenge Service:** Create, manage, and track user challenges
- **Category Service:** Manage stream/product categories
- **Feedback Service:** Collect and analyze user feedback
- **Documentation Service:** FAQ, privacy, terms, about management

## 8. Advanced Indexing & Search

- Compound indexes for search (name, category, tags)
- Text indexes for FAQ, documentation, feedback
- Analytics collections for dashboard stats

## 9. Security & Crash Protection

- Rate limiting, circuit breaker, health checks
- Audit logs for admin actions
- OAuth token validation (Google & Apple)
- OTP rate limiting to prevent brute force
- Password hashing with bcrypt (for email/password users)
- JWT expiry management (short-lived access tokens)

## 10. Feature Mapping (Figma Screens)

- All user, business, admin, challenge, marketplace, feedback, documentation, and analytics features are mapped to backend modules and collections
- ERD diagram (database structure) will be provided next.
