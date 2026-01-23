# Endpoint Audit - Verified Against Codebase ✅

**Date:** Jan 24, 2026  
**Status:** COMPLETE - All endpoints audited and verified  
**Collection:** Austin-backend.postman_collection.json  

---

## 1. USER AUTH & PROFILE (14 endpoints)

### 1.1 User Authentication (11 endpoints)
**File:** [src/app/modules/auth/auth.route.ts](src/app/modules/auth/auth.route.ts)

| # | Method | Endpoint | Auth | Controller | Service | Status |
|---|--------|----------|------|-----------|---------|--------|
| 1 | POST | `/api/v1/auth/register` | ❌ | registerUser | registerUserToDB | ✅ |
| 2 | POST | `/api/v1/auth/login` | ❌ | loginUser | loginUserFromDB | ✅ |
| 3 | POST | `/api/v1/auth/refresh-token` | ❌ | refreshToken | - | ✅ |
| 4 | POST | `/api/v1/auth/google-login` | ❌ | googleLogin | googleLoginFromDB | ✅ |
| 5 | POST | `/api/v1/auth/apple-login` | ❌ | appleLogin | appleLoginFromDB | ✅ |
| 6 | POST | `/api/v1/auth/send-otp` | ❌ | sendOTP | sendOTPToDB | ✅ |
| 7 | POST | `/api/v1/auth/verify-otp` | ❌ | verifyOTP | verifyOTPFromDB | ✅ |
| 8 | POST | `/api/v1/auth/forget-password` | ❌ | forgetPassword | forgetPasswordToDB | ✅ |
| 9 | POST | `/api/v1/auth/verify-email` | ❌ | verifyEmail | verifyEmailFromDB | ✅ |
| 10 | POST | `/api/v1/auth/verify-reset-otp` | ❌ | verifyResetOTP | verifyResetOTPFromDB | ✅ |
| 11 | POST | `/api/v1/auth/reset-password` | ❌ | resetPassword | resetPasswordToDB | ✅ |

**Notes:**
- Register uses FORM-DATA with image upload
- All endpoints have corresponding controllers in `auth.controller.ts`
- All endpoints have corresponding services in `auth.service.ts`

### 1.2 User Profile (3 endpoints)
**File:** [src/app/modules/user/user.route.ts](src/app/modules/user/user.route.ts)

| # | Method | Endpoint | Auth | Roles | Controller | Service | Status |
|---|--------|----------|------|-------|-----------|---------|--------|
| 12 | GET | `/api/v1/user/profile` | 🔐 | USER, VENDOR, ADMIN, SUPER_ADMIN | getProfile | getProfileFromDB | ✅ |
| 13 | PATCH | `/api/v1/user/profile` | 🔐 | SUPER_ADMIN, ADMIN, USER, VENDOR | updateProfile | updateProfileToDB | ✅ |
| 14 | DELETE | `/api/v1/user/delete` | 🔐 | USER | deleteProfile | deleteProfileFromDB | ✅ |

**Notes:**
- Update Profile uses FORM-DATA with image upload
- All endpoints use validateRequest middleware
- File upload handled by fileUploadHandler

---

## 2. ADMIN AUTH & PROFILE (10 endpoints)

### 2.1 Admin Authentication (6 endpoints)
**File:** [src/app/modules/auth/auth.route.ts](src/app/modules/auth/auth.route.ts)

| # | Method | Endpoint | Auth | Controller | Service | Status |
|---|--------|----------|------|-----------|---------|--------|
| 1 | POST | `/api/v1/auth/admin/login` | ❌ | loginAdmin | loginAdminFromDB | ✅ |
| 2 | POST | `/api/v1/auth/admin/forget-password` | ❌ | forgetPassword | forgetPasswordToDB | ✅ |
| 3 | POST | `/api/v1/auth/admin/verify-reset-otp` | ❌ | verifyResetOTP | verifyResetOTPFromDB | ✅ |
| 4 | POST | `/api/v1/auth/admin/reset-password` | ❌ | resetPassword | resetPasswordToDB | ✅ |
| 5 | PATCH | `/api/v1/auth/admin/change-password` | 🔐 ADMIN, SUPER_ADMIN | changePassword | changePasswordToDB | ✅ |
| 6 | POST | `/api/v1/auth/admin/resend-otp` | ❌ | resendOTP | resendOTPToDB | ✅ |

**Notes:**
- Admin auth shares services with user auth (reusable logic)
- Change password requires authentication

### 2.2 Admin Profile & Management (4 endpoints)
**File:** [src/app/modules/admin/admin.route.ts](src/app/modules/admin/admin.route.ts)

| # | Method | Endpoint | Auth | Roles | Controller | Service | Status |
|---|--------|----------|------|-------|-----------|---------|--------|
| 7 | GET | `/api/v1/admin/profile` | 🔐 | ADMIN, SUPER_ADMIN | getAdminProfile | getAdminProfileById | ✅ |
| 8 | GET | `/api/v1/admin/get-admin` | 🔐 | SUPER_ADMIN | getAdmin | getAdminFromDB | ✅ |
| 9 | POST | `/api/v1/admin/create-admin` | 🔐 | SUPER_ADMIN | createAdmin | createAdminToDB | ✅ |
| 10 | DELETE | `/api/v1/admin/:id` | 🔐 | SUPER_ADMIN | deleteAdmin | deleteAdminFromDB | ✅ |

**Notes:**
- GET /profile returns authenticated admin's profile (NEW - Jan 24)
- GET /get-admin returns all admins (SUPER_ADMIN only)
- All endpoints properly authenticated and role-based

---

## 3. CATEGORIES (5 endpoints)

**File:** [src/app/modules/category/category.route.ts](src/app/modules/category/category.route.ts)

| # | Method | Endpoint | Auth | Controller | Service | Status |
|---|--------|----------|------|-----------|---------|--------|
| 1 | GET | `/api/v1/category` | ❌ | getCategory | getCategoryFromDB | ✅ |
| 2 | GET | `/api/v1/category/:id` | ❌ | getCategoryById | getCategoryByIdFromDB | ✅ |
| 3 | POST | `/api/v1/category` | 🔐 ADMIN | createCategory | createCategoryToDB | ✅ |
| 4 | PATCH | `/api/v1/category/:id` | 🔐 ADMIN | updateCategory | updateCategoryToDB | ✅ |
| 5 | DELETE | `/api/v1/category/:id` | 🔐 ADMIN | deleteCategory | deleteCategoryFromDB | ✅ |

---

## 4. STREAM MANAGEMENT (13 endpoints)

**File:** [src/app/modules/stream/stream.route.ts](src/app/modules/stream/stream.route.ts)

| # | Method | Endpoint | Auth | Key Features | Status |
|---|--------|----------|------|--------------|--------|
| 1 | POST | `/api/v1/stream/start` | 🔐 | **FORM-DATA with banner upload** (Multer 10MB) | ✅ |
| 2 | GET | `/api/v1/stream/live` | ❌ | Pagination support | ✅ |
| 3 | GET | `/api/v1/stream/search` | ❌ | Query parameter 'q' | ✅ |
| 4 | GET | `/api/v1/stream/:id` | ❌ | Get stream details | ✅ |
| 5 | GET | `/api/v1/stream/streamer/:userId/history` | ❌ | Streamer stream history | ✅ |
| 6 | POST | `/api/v1/stream/:id/join` | 🔐 | Get Agora token | ✅ |
| 7 | POST | `/api/v1/stream/:id/leave` | 🔐 | Leave stream | ✅ |
| 8 | POST | `/api/v1/stream/:id/like` | 🔐 | Like stream | ✅ |
| 9 | POST | `/api/v1/stream/:id/chat` | 🔐 | Send chat message | ✅ |
| 10 | PUT | `/api/v1/stream/:id/settings` | 🔐 | Update stream settings | ✅ |
| 11 | PUT | `/api/v1/stream/:id/controls` | 🔐 | Toggle camera/mic | ✅ |
| 12 | GET | `/api/v1/stream/:id/analytics` | 🔐 | Stream analytics | ✅ |
| 13 | POST | `/api/v1/stream/:id/end` | 🔐 | End stream | ✅ |

**Key Implementation:**
- Banner upload: Multer configured with 10MB limit, image/* types
- File saved to: `uploads/banner/{original-name}-{timestamp}.{ext}`
- Form-data preprocessing: Zod converts string booleans to actual booleans

---

## 5. GIFTS (9 endpoints)

**File:** [src/app/modules/gift/gift.route.ts](src/app/modules/gift/gift.route.ts)

| # | Method | Endpoint | Auth | Status |
|---|--------|----------|------|--------|
| 1 | GET | `/api/v1/gift` | ❌ | ✅ |
| 2 | GET | `/api/v1/gift/category/:category` | ❌ | ✅ |
| 3 | GET | `/api/v1/gift/:id` | ❌ | ✅ |
| 4 | POST | `/api/v1/gift` | 🔐 ADMIN | ✅ |
| 5 | PUT | `/api/v1/gift/:id` | 🔐 ADMIN | ✅ |
| 6 | DELETE | `/api/v1/gift/:id` | 🔐 ADMIN | ✅ |
| 7 | POST | `/api/v1/gift/send/:streamId` | 🔐 | ✅ |
| 8 | GET | `/api/v1/gift/stream/:streamId/list` | 🔐 | ✅ |
| 9 | GET | `/api/v1/gift/streamer/received` | 🔐 | ✅ |

---

## 6. POLLS (7 endpoints)

**File:** [src/app/modules/poll/poll.route.ts](src/app/modules/poll/poll.route.ts)

| # | Method | Endpoint | Auth | Status |
|---|--------|----------|------|--------|
| 1 | POST | `/api/v1/poll/stream/:streamId/create` | 🔐 | ✅ |
| 2 | POST | `/api/v1/poll/:id/vote` | 🔐 | ✅ |
| 3 | GET | `/api/v1/poll/:id/results` | ❌ | ✅ |
| 4 | GET | `/api/v1/poll/stream/:streamId/active` | ❌ | ✅ |
| 5 | GET | `/api/v1/poll/stream/:streamId/all` | ❌ | ✅ |
| 6 | POST | `/api/v1/poll/:id/end` | 🔐 | ✅ |
| 7 | DELETE | `/api/v1/poll/:id` | 🔐 | ✅ |

---

## 7. ANALYTICS (6 endpoints)

**File:** [src/app/modules/stream/analytics.route.ts](src/app/modules/stream/analytics.route.ts)

| # | Method | Endpoint | Auth | Controller | Service | Status |
|---|--------|----------|------|-----------|---------|--------|
| 1 | GET | `/api/v1/analytics/platform` | 🔐 ADMIN | getAnalytics | getPlatformAnalytics | ✅ |
| 2 | GET | `/api/v1/analytics/realtime` | ❌ | getAnalytics | getRealtimeAnalytics | ✅ |
| 3 | GET | `/api/v1/analytics/streamer/:id` | 🔐 | getAnalytics | getStreamerAnalytics | ✅ |
| 4 | GET | `/api/v1/analytics/my-dashboard` | 🔐 | getAnalytics | getMyDashboardAnalytics | ✅ |
| 5 | GET | `/api/v1/analytics/category/:id` | ❌ | getAnalytics | getCategoryAnalytics | ✅ |
| 6 | GET | `/api/v1/analytics/comparison` | 🔐 | getAnalytics | getComparisonAnalytics | ✅ |

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| User Auth | 11 | ✅ VERIFIED |
| User Profile | 3 | ✅ VERIFIED |
| Admin Auth | 6 | ✅ VERIFIED |
| Admin Profile | 4 | ✅ VERIFIED |
| Categories | 5 | ✅ VERIFIED |
| Stream Management | 13 | ✅ VERIFIED |
| Gifts | 9 | ✅ VERIFIED |
| Polls | 7 | ✅ VERIFIED |
| Analytics | 6 | ✅ VERIFIED |
| **TOTAL** | **64** | ✅ **ALL VERIFIED** |

---

## Postman Collection Structure

```
Austin-Backend API v2.0
├── 1. USER AUTH & PROFILE
│   ├── 1.1 User Authentication (11 endpoints)
│   └── 1.2 User Profile (3 endpoints)
├── 2. ADMIN AUTH & PROFILE
│   ├── 2.1 Admin Authentication (6 endpoints)
│   └── 2.2 Admin Profile & Management (4 endpoints)
├── 3. CATEGORIES (5 endpoints)
├── 4. STREAM MANAGEMENT (13 endpoints)
├── 5. GIFTS (9 endpoints)
├── 6. POLLS (7 endpoints)
└── 7. ANALYTICS DASHBOARD (6 endpoints)
```

---

## Key Features Verified

✅ **User Auth → User Profile Folder Hierarchy**
- Separate folder structure for auth and profile
- Clear organization for team collaboration

✅ **Admin Auth → Admin Profile Folder Hierarchy**
- Separate admin authentication endpoints
- Admin profile management (GET /admin/profile - NEW)
- Super admin management capabilities

✅ **Form-Data Support**
- User register with image upload
- User profile update with image upload
- Stream start with banner upload (10MB, image/* types)
- Zod preprocessing for booleans/arrays

✅ **Authentication & Authorization**
- JWT Bearer tokens configured
- Role-based access control (ADMIN, SUPER_ADMIN, USER, VENDOR)
- Protected endpoints properly marked with 🔐

✅ **Production Ready**
- All endpoints tested and verified
- Controllers and services exist and match
- Error handling in place
- Pagination support where needed
- File upload security configured

---

## Testing Instructions

1. **Set base URL** in Postman environment: `http://65.1.20.111:5000`
2. **Register a user** via `/api/v1/auth/register` (form-data)
3. **Login** via `/api/v1/auth/login` (get token)
4. **Set userToken** variable with received JWT
5. **Test protected endpoints** with Bearer token
6. **Admin endpoints** require `adminToken` in Authorization header

---

## Deployment Info

- **Server:** EC2 instance (IP: 65.1.20.111)
- **Port:** 5000 (HTTP)
- **Socket.io:** Port 6002
- **Database:** MongoDB Atlas (connected)
- **Process Manager:** PM2

**Deploy Command:**
```bash
git pull && npm install && npm run build
```

---

**Last Updated:** Jan 24, 2026  
**Status:** PRODUCTION READY ✅
