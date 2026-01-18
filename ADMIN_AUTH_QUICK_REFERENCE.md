# 🔐 Admin Dashboard Authentication - Quick Reference

## Complete Authentication Endpoints Summary

### Base URL
```
http://localhost:5000/api/v1/auth
```

---

## 📋 Available Endpoints

| Method | Endpoint | Purpose | Auth Required | Description |
|--------|----------|---------|---------------|----|
| **POST** | `/login` | Admin Login | ❌ No | Login with email & password |
| **POST** | `/forget-password` | Initiate Password Reset | ❌ No | Send OTP to email |
| **POST** | `/verify-reset-otp` | Verify Reset OTP | ❌ No | Verify OTP, get reset token |
| **POST** | `/reset-password` | Reset Password | ❌ No (needs resettoken header) | Reset with OTP verification |
| **POST** | `/resend-otp` | Resend OTP | ❌ No | Resend OTP to email |
| **POST** | `/change-password` | Change Password | ✅ YES | Change password when logged in |
| **POST** | `/refresh-token` | Refresh Access Token | ❌ No (needs refreshtoken header) | Get new access token |
| **POST** | `/google-login` | Google OAuth Login | ❌ No | Login with Google |
| **POST** | `/apple-login` | Apple OAuth Login | ❌ No | Login with Apple |
| **POST** | `/send-otp` | Send OTP for Registration | ❌ No | Send OTP for email verification |
| **POST** | `/verify-otp` | OTP Login | ❌ No | Login with OTP verification |

---

## 🔑 Authentication Methods

### 1️⃣ Email & Password Login
```
POST /login
Body: { email, password }
Response: { accessToken, refreshToken }
```

### 2️⃣ Google OAuth
```
POST /google-login
Body: { idToken }
Response: { accessToken, refreshToken }
```

### 3️⃣ Apple OAuth
```
POST /apple-login
Body: { identityToken, authorizationCode }
Response: { accessToken, refreshToken }
```

### 4️⃣ OTP Authentication
```
POST /send-otp
Body: { email }
↓
POST /verify-otp
Body: { email, otp }
Response: { accessToken, refreshToken }
```

---

## 🔄 Password Management Flow

### Forgot Password
```
1. POST /forget-password (email)
   ↓ OTP sent to email
2. POST /verify-reset-otp (email, otp)
   ↓ Returns resetToken
3. POST /reset-password (email, otp, newPassword) with resettoken header
   ↓ Password reset successful
```

### Change Password (Logged In)
```
Authorization: Bearer <accessToken>
POST /change-password
Body: { oldPassword, newPassword, confirmPassword }
Response: Success message
```

---

## 💾 Token Usage

### Access Token
- **Duration:** 7 days
- **Usage:** `Authorization: Bearer <accessToken>`
- **When expires:** Use refresh token to get new one

### Refresh Token
- **Duration:** 365 days
- **Usage:** `refreshtoken: <refreshToken>` (in headers)
- **When expires:** User must login again

### Reset Token (Forgot Password)
- **Duration:** Short-lived
- **Usage:** `resettoken: <resetToken>` (in headers for reset endpoint)
- **Source:** Returned from `/verify-reset-otp`

---

## 🧪 Quick Test Commands

### Test Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vidzo.com",
    "password": "admin123"
  }'
```

### Test Forget Password
```bash
curl -X POST http://localhost:5000/api/v1/auth/forget-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vidzo.com"
  }'
```

### Test Change Password
```bash
curl -X POST http://localhost:5000/api/v1/auth/change-password \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "admin123",
    "newPassword": "newAdmin456",
    "confirmPassword": "newAdmin456"
  }'
```

### Test Refresh Token
```bash
curl -X POST http://localhost:5000/api/v1/auth/refresh-token \
  -H "refreshtoken: <refreshToken>"
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success message",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message",
  "data": null
}
```

---

## ⚙️ Error Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Success |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid credentials |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Already exists |
| 500 | Server Error |

---

## 🛡️ Security Notes

1. **Access Token:** Store in memory only (not localStorage)
2. **Refresh Token:** Store securely (httpOnly cookie)
3. **OTP:** 6-digit code with 10-minute expiry
4. **Rate Limiting:** Implemented on OTP generation
5. **Password:** Hashed with bcrypt (12 rounds)
6. **CORS:** Enabled for admin dashboard domain

---

## ✅ Implementation Checklist

- [ ] Admin Login page created
- [ ] Forget Password flow implemented
- [ ] OTP verification screen added
- [ ] Reset Password form created
- [ ] Change Password page in settings
- [ ] Token refresh logic implemented
- [ ] OAuth providers integrated (Google/Apple)
- [ ] Error handling & validation added
- [ ] Loading states & feedback added
- [ ] Session timeout implemented
- [ ] CORS headers configured
- [ ] Testing with Thunder Client/Postman done

---

## 📚 Full Documentation

See `ADMIN_AUTHENTICATION_API.md` for detailed endpoint documentation with examples.

---

**Status:** ✅ All endpoints ready for admin dashboard integration!
