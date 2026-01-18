# Admin Endpoints Reference

## 🔐 Clear Endpoint Organization

Admin endpoints now use `/admin` prefix for better clarity and organization.

---

## Admin Authentication Endpoints

### 1. Admin Login
```
POST /api/v1/auth/admin/login
```
- Email & password authentication
- Returns access & refresh tokens
- No authentication required

### 2. Admin Forget Password (OTP Generation)
```
POST /api/v1/auth/admin/forget-password
```
- Generates 6-digit OTP
- Sends OTP to admin's email
- 10-minute expiry
- No authentication required

### 3. Admin Verify Reset OTP
```
POST /api/v1/auth/admin/verify-reset-otp
```
- Verifies OTP from email
- Returns reset token
- Valid for 24 hours
- No authentication required

### 4. Admin Reset Password
```
POST /api/v1/auth/admin/reset-password
```
- Resets password using OTP
- Requires reset token in header
- Both email and OTP must match
- No authentication required

### 5. Admin Change Password (Logged In)
```
POST /api/v1/auth/admin/change-password
Authorization: Bearer <accessToken>
```
- Changes password when already logged in
- Requires valid access token
- Requires current password verification
- Returns success message

### 6. Admin Resend OTP
```
POST /api/v1/auth/admin/resend-otp
```
- Resends OTP if expired
- Generates new OTP code
- Sends to registered email
- No authentication required

---

## User Endpoints (Unchanged)

```
POST /api/v1/auth/login               - Email & password login
POST /api/v1/auth/register            - User registration
POST /api/v1/auth/google-login        - Google OAuth login
POST /api/v1/auth/apple-login         - Apple OAuth login
POST /api/v1/auth/send-otp            - Send OTP to email
POST /api/v1/auth/verify-otp          - Verify OTP & login
POST /api/v1/auth/forget-password     - User password reset
POST /api/v1/auth/refresh-token       - Refresh access token
```

---

## Quick API Testing Examples

### Admin Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### Admin Forget Password
```bash
curl -X POST http://localhost:5000/api/v1/auth/admin/forget-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com"}'
```

### Admin Reset Password
```bash
curl -X POST http://localhost:5000/api/v1/auth/admin/reset-password \
  -H "Content-Type: application/json" \
  -H "resettoken: <token_from_verify_otp>" \
  -d '{"email":"admin@example.com","otp":"123456","newPassword":"newPass@123","confirmPassword":"newPass@123"}'
```

### Admin Change Password
```bash
curl -X POST http://localhost:5000/api/v1/auth/admin/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"oldPassword":"currentPass@123","newPassword":"newPass@456","confirmPassword":"newPass@456"}'
```

---

## Architecture Overview

```
USER ENDPOINTS (/api/v1/auth/*)
├── /login              - Email/password login
├── /register           - New user registration
├── /google-login       - Google OAuth
├── /apple-login        - Apple OAuth
├── /send-otp           - OTP for login
├── /verify-otp         - OTP verification
├── /forget-password    - Password reset
└── /refresh-token      - Token refresh

ADMIN ENDPOINTS (/api/v1/auth/admin/*)
├── /login              - Email/password login
├── /forget-password    - OTP-based reset
├── /verify-reset-otp   - OTP verification
├── /reset-password     - Password reset
├── /change-password    - Change when logged in
└── /resend-otp         - Resend OTP
```

---

## Security Features

### Admin Authentication
✅ Email/password login with JWT tokens
✅ OTP-based password reset (10-min expiry)
✅ Role-based access control
✅ Refresh token mechanism (365-day expiry)
✅ Access token expiry (7-day)

### Password Requirements
✅ Minimum 8 characters
✅ Uppercase & lowercase letters
✅ Numbers & special characters
✅ Must confirm on change/reset

---

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Admin Login | ✅ Ready | JWT tokens returned |
| Admin Registration | ⏳ Via Seed | seedAdmin.ts creates admin users |
| Forget Password | ✅ Ready | OTP sent to email |
| Reset Password | ✅ Ready | OTP verification required |
| Change Password | ✅ Ready | Must be logged in |
| Token Refresh | ✅ Ready | Refresh token management |
| Email Delivery | ⏳ Config | Requires email service setup |

---

## Next Steps for Frontend

1. **Login Page**: Call `/admin/login`
2. **Forgot Password**: 
   - Call `/admin/forget-password`
   - Call `/admin/verify-reset-otp`
   - Call `/admin/reset-password`
3. **Change Password** (Settings): Call `/admin/change-password`
4. **OTP Resend**: Call `/admin/resend-otp`

All responses include error handling and user-friendly messages.

---

**Last Updated:** 2024-01-19  
**Status:** Production Ready ✅  
**TypeScript Build:** Zero Errors ✅
