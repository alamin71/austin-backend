# 🔐 Admin Dashboard Authentication - Setup & Testing Guide

## 📋 Overview

This guide covers:
1. ✅ **5 Core Authentication Endpoints** - Login, Forget Password, Reset Password, Resend OTP, Change Password
2. ✅ **OAuth Integration** - Google & Apple login
3. ✅ **OTP Authentication** - Email-based OTP login alternative
4. ✅ **Token Management** - Access & Refresh tokens
5. ✅ **Testing Instructions** - Postman, Thunder Client, cURL

---

## 🚀 Quick Start

### 1. Ensure Backend is Running
```bash
npm run dev
# Server running on http://localhost:5000
```

### 2. Ensure Database is Seeded
```bash
npm run seed
# Admin user created: admin@vidzo.com / admin123
```

### 3. Setup Environment Variables
```bash
# In .env file:
JWT_SECRET=your_secret_key
JWT_EXPIRE_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRE_IN=365d
```

---

## 🔑 Core Authentication Endpoints

### 1. Admin Login
**Endpoint:** `POST /api/v1/auth/login`

**Use Case:** Standard admin login with email & password

**Request:**
```json
{
  "email": "admin@vidzo.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User logged in successfully.",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Admin Dashboard Screen:**
- Login form with Email & Password fields
- "Forgot Password?" link
- "Login" button
- Loading indicator during request

---

### 2. Forget Password
**Endpoint:** `POST /api/v1/auth/forget-password`

**Use Case:** Admin initiates password reset process

**Request:**
```json
{
  "email": "admin@vidzo.com"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Please check your email: admin@vidzo.com. We have sent you a one-time passcode (OTP).",
  "data": {
    "otp": "123456"
  }
}
```

**Admin Dashboard Screen:**
- "Forgot Password?" page with email input
- Submit button
- Success message showing OTP sent
- Countdown timer (10 minutes)
- "Didn't receive OTP?" → Resend OTP button

---

### 3. Resend OTP
**Endpoint:** `POST /api/v1/auth/resend-otp`

**Use Case:** Resend OTP if admin didn't receive or OTP expired

**Request:**
```json
{
  "email": "admin@vidzo.com"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent successfully again",
  "data": {
    "otp": "789012",
    "expiryTime": "2024-01-19T10:15:00Z"
  }
}
```

**Admin Dashboard Screen:**
- Show after 10 minutes or if admin clicks "Resend"
- Displays new OTP expiry time
- Show "OTP resent successfully" toast notification

---

### 4. Reset Password
**Endpoint:** `POST /api/v1/auth/reset-password`

**Use Case:** Complete password reset with OTP verification

**Headers:**
```
resettoken: <token-from-verify-reset-otp>
```

**Request:**
```json
{
  "email": "admin@vidzo.com",
  "otp": "123456",
  "newPassword": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Your password has been successfully reset.",
  "data": {
    "email": "admin@vidzo.com",
    "role": "admin"
  }
}
```

**Admin Dashboard Flow:**
```
1. Enter Email → POST /forget-password
                ↓
2. Receive OTP in email → Show OTP input
                ↓
3. Enter OTP → POST /verify-reset-otp (gets resetToken)
                ↓
4. Enter New Password → POST /reset-password (with resetToken header)
                ↓
5. Success message → Redirect to Login
```

---

### 5. Change Password
**Endpoint:** `POST /api/v1/auth/change-password`

**Use Case:** Logged-in admin changes their current password

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "oldPassword": "admin123",
  "newPassword": "newPassword456",
  "confirmPassword": "newPassword456"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Your password has been successfully changed",
  "data": {
    "email": "admin@vidzo.com"
  }
}
```

**Admin Dashboard Screen:**
- Available in Settings / Security section
- Requires current password verification
- New password & confirmation fields
- Success → Logout → Redirect to Login

---

## 🔄 Complete Password Reset Flow (Visual)

```
┌─────────────────────────────────────────────────────────────┐
│           ADMIN DASHBOARD - FORGOT PASSWORD                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │  Enter Email Address     │
            │  [admin@vidzo.com]       │
            │  [Send OTP]              │
            └──────────────────────────┘
                           │
        POST /forget-password
                           ▼
            ✅ OTP sent to email
            ⏱️  10 minutes expiry
                           │
            ┌──────────────────────────┐
            │  Enter 6-Digit OTP       │
            │  [123456]                │
            │  [Verify OTP]            │
            │  [Resend OTP]            │
            └──────────────────────────┘
                           │
      POST /verify-reset-otp
                           ▼
            ✅ OTP Verified
            📋 Get resetToken
                           │
            ┌──────────────────────────┐
            │  Set New Password        │
            │  [New Password]          │
            │  [Confirm Password]      │
            │  [Reset Password]        │
            └──────────────────────────┘
                           │
    POST /reset-password (+ resettoken header)
                           ▼
            ✅ Password Reset Successfully
            🔄 Redirect to Login
                           │
            ┌──────────────────────────┐
            │  Login with New Password │
            │  [Email]                 │
            │  [New Password]          │
            │  [Login]                 │
            └──────────────────────────┘
```

---

## 🧪 Testing with Postman / Thunder Client

### Import Collection

1. **Download/Copy** `POSTMAN_ADMIN_AUTH_COLLECTION.json`
2. **Open Postman/Thunder Client**
3. **Import Collection:**
   - Postman: File → Import → Select JSON file
   - Thunder Client: Collections → Import → Select JSON file
4. **Set Variables:**
   - `base_url`: `http://localhost:5000`
   - `accessToken`: (Will be set after login)
   - `refreshToken`: (Will be set after login)
   - `resetToken`: (Will be set after OTP verification)

### Test Sequence

#### Step 1: Admin Login
```
POST /api/v1/auth/login
Body: {
  "email": "admin@vidzo.com",
  "password": "admin123"
}
✅ Copy accessToken & refreshToken from response
```

#### Step 2: Forget Password
```
POST /api/v1/auth/forget-password
Body: {
  "email": "admin@vidzo.com"
}
✅ Check email or console logs for OTP (e.g., 123456)
```

#### Step 3: Verify Reset OTP
```
POST /api/v1/auth/verify-reset-otp
Body: {
  "email": "admin@vidzo.com",
  "otp": "123456"
}
✅ Copy resetToken from response
```

#### Step 4: Reset Password
```
POST /api/v1/auth/reset-password
Headers:
  resettoken: <resetToken>
Body: {
  "email": "admin@vidzo.com",
  "otp": "123456",
  "newPassword": "newAdmin456",
  "confirmPassword": "newAdmin456"
}
✅ Password reset successful
```

#### Step 5: Login with New Password
```
POST /api/v1/auth/login
Body: {
  "email": "admin@vidzo.com",
  "password": "newAdmin456"
}
✅ Get new tokens
```

#### Step 6: Change Password (Logged In)
```
POST /api/v1/auth/change-password
Headers:
  Authorization: Bearer <accessToken>
Body: {
  "oldPassword": "newAdmin456",
  "newPassword": "admin123",
  "confirmPassword": "admin123"
}
✅ Password changed successfully
```

#### Step 7: Refresh Token
```
POST /api/v1/auth/refresh-token
Headers:
  refreshtoken: <refreshToken>
✅ Get new accessToken
```

---

## 🔐 OAuth Integration

### Google Login
```
POST /api/v1/auth/google-login
Body: {
  "idToken": "<Google_ID_Token>"
}
Response: { accessToken, refreshToken }
```

**Frontend Implementation:**
```jsx
import { GoogleLogin } from '@react-oauth/google';

<GoogleLogin
  onSuccess={(credentialResponse) => {
    fetch('/api/v1/auth/google-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        idToken: credentialResponse.credential 
      })
    })
    .then(res => res.json())
    .then(data => {
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      // Redirect to dashboard
    })
  }}
/>
```

### Apple Login
```
POST /api/v1/auth/apple-login
Body: {
  "identityToken": "<Apple_Identity_Token>",
  "authorizationCode": "<Authorization_Code>"
}
Response: { accessToken, refreshToken }
```

---

## 📱 OTP Login Alternative

### Send OTP
```
POST /api/v1/auth/send-otp
Body: { "email": "admin@vidzo.com" }
✅ OTP sent to email (10-minute expiry)
```

### Verify OTP & Login
```
POST /api/v1/auth/verify-otp
Body: {
  "email": "admin@vidzo.com",
  "otp": "123456"
}
✅ Logged in with tokens
```

---

## 🛡️ Security Implementation

### Token Storage
```javascript
// ✅ CORRECT: Memory storage
const accessToken = response.data.accessToken; // Store in memory

// ❌ WRONG: localStorage for sensitive tokens
localStorage.setItem('accessToken', token); // Not recommended

// ✅ BETTER: httpOnly cookie (backend sets)
// Server response header: Set-Cookie: refreshToken=...; HttpOnly;
```

### Auto-Refresh Logic
```javascript
// When access token expires (401 response)
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await fetch('/api/v1/auth/refresh-token', {
    method: 'POST',
    headers: { 'refreshtoken': refreshToken }
  });
  
  if (response.ok) {
    const newAccessToken = await response.json();
    // Retry original request with new token
  } else {
    // Redirect to login
  }
};
```

### Error Handling
```javascript
const handleAuthError = (error) => {
  if (error.statusCode === 401) {
    // Unauthorized - token expired or invalid
    // Try refresh token
  } else if (error.statusCode === 403) {
    // Forbidden - no permission (not admin)
  } else if (error.statusCode === 400) {
    // Bad request - validation error
    // Show error message from response
  }
};
```

---

## ✅ Implementation Checklist for Admin Dashboard

### Login Page
- [ ] Email input field
- [ ] Password input field
- [ ] Login button
- [ ] "Forgot Password?" link
- [ ] Loading state
- [ ] Error message display
- [ ] Form validation

### Forgot Password Page
- [ ] Email input field
- [ ] Send OTP button
- [ ] Success message with countdown timer
- [ ] Resend OTP button (after 10 min or manual)
- [ ] Error handling

### OTP Verification Page
- [ ] OTP input (6 digits)
- [ ] Verify button
- [ ] Resend OTP link
- [ ] Timer showing expiry
- [ ] Error handling

### Reset Password Page
- [ ] New password field
- [ ] Confirm password field
- [ ] Password strength indicator
- [ ] Reset button
- [ ] Validation (passwords match)
- [ ] Success message + redirect to login

### Change Password (Settings)
- [ ] Current password field
- [ ] New password field
- [ ] Confirm password field
- [ ] Change button
- [ ] Authorization check (logged in)
- [ ] Error handling

### General
- [ ] Token storage (memory for access, secure for refresh)
- [ ] Auto-refresh on token expiry
- [ ] Session timeout (30 min idle)
- [ ] Logout functionality
- [ ] CORS configuration
- [ ] Error boundary components
- [ ] Loading skeletons
- [ ] Toast/notification system

---

## 🚨 Common Issues & Solutions

### Issue: 401 Unauthorized
**Solution:**
- Access token expired → Use refresh token to get new one
- Invalid token → Logout and login again
- Missing Authorization header → Add: `Authorization: Bearer <token>`

### Issue: 400 Bad Request
**Solution:**
- Invalid email format → Validate before sending
- Passwords don't match → Check confirmation
- OTP expired → Resend OTP
- Missing required fields → Check request body

### Issue: CORS Error
**Solution:**
- Ensure backend has CORS enabled
- Check allowed origins in backend config
- Use proper headers (Content-Type, Authorization)

### Issue: OTP Not Received
**Solution:**
- Check email spam folder
- Use "Resend OTP" endpoint
- Check backend logs for email sending errors
- Ensure nodemailer/sendgrid is configured

---

## 📊 Response Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue |
| 201 | Created | Success |
| 400 | Bad Request | Show validation error |
| 401 | Unauthorized | Refresh token or login again |
| 403 | Forbidden | No permission (not admin) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Email already exists |
| 500 | Server Error | Show error message |

---

## 📚 Documentation Files

- **`ADMIN_AUTHENTICATION_API.md`** - Detailed endpoint documentation
- **`ADMIN_AUTH_QUICK_REFERENCE.md`** - Quick endpoint summary
- **`POSTMAN_ADMIN_AUTH_COLLECTION.json`** - Import for Postman/Thunder Client
- **`ADMIN_DASHBOARD_AUTHENTICATION_SETUP.md`** - This file

---

## 🎯 Next Steps

1. ✅ **Review Documentation** - Read ADMIN_AUTHENTICATION_API.md
2. ✅ **Test Endpoints** - Import Postman collection and test
3. ✅ **UI Development** - Create admin dashboard screens
4. ✅ **Integration** - Integrate endpoints into dashboard
5. ✅ **Testing** - Test all flows with real admin user
6. ✅ **Deployment** - Deploy to staging/production

---

## 📞 Support

For issues or questions:
1. Check documentation first
2. Review error logs from backend
3. Test with Postman collection
4. Check browser console for client-side errors
5. Verify .env configuration

---

**Status:** ✅ All endpoints production-ready and fully documented!
