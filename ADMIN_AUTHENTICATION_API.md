# Admin Dashboard Authentication API Documentation

## 🔐 Complete Authentication Endpoints for Admin Dashboard

All authentication endpoints are ready for admin dashboard integration. These endpoints support multiple authentication methods including OAuth (Google, Apple) and OTP.

---

## 📋 Table of Contents

1. [Admin Login](#admin-login)
2. [Forget Password](#forget-password)
3. [Reset Password](#reset-password)
4. [Resend OTP](#resend-otp)
5. [Change Password](#change-password)
6. [Refresh Token](#refresh-token)
7. [OAuth Logins](#oauth-logins)

---

## 🔑 Admin Login

### Endpoint
```
POST /api/v1/auth/login
```

### Description
Authenticates admin user with email and password. Returns JWT access and refresh tokens.

### Request Body
```json
{
  "email": "admin@example.com",
  "password": "securePassword123"
}
```

### Response (Success)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User logged in successfully.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Token Details
- **Access Token:** 7-day expiry
- **Refresh Token:** 365-day expiry
- **Payload:** { id, email, role }

### Usage in Admin Dashboard
```javascript
// Store tokens
localStorage.setItem('accessToken', response.data.accessToken);
localStorage.setItem('refreshToken', response.data.refreshToken);

// Use in subsequent requests
Authorization: Bearer <accessToken>
```

---

## 🔓 Forget Password

### Endpoint
```
POST /api/v1/auth/forget-password
```

### Description
Generates OTP and sends to admin's email for password reset initiation.

### Request Body
```json
{
  "email": "admin@example.com"
}
```

### Response (Success)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Please check your email: admin@example.com. We have sent you a one-time passcode (OTP).",
  "data": {
    "otp": "123456"
  }
}
```

### OTP Details
- **Format:** 6-digit code
- **Expiry:** 10 minutes
- **Delivery:** Email
- **Usage:** Required for password reset verification

### Admin Dashboard Flow
1. User enters email
2. System sends OTP to email
3. Show OTP input screen
4. Proceed to [Reset Password](#reset-password) endpoint

---

## 🔄 Reset Password

### Endpoint
```
POST /api/v1/auth/reset-password
```

### Description
Resets admin password using OTP verification and reset token.

### Request Header
```
resettoken: <reset-token-from-verify-reset-otp>
```

### Request Body
```json
{
  "email": "admin@example.com",
  "otp": "123456",
  "newPassword": "newSecurePassword123",
  "confirmPassword": "newSecurePassword123"
}
```

### Response (Success)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Your password has been successfully reset.",
  "data": {
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### Complete Password Reset Flow
```
1. Admin clicks "Forgot Password"
   ↓
2. POST /api/v1/auth/forget-password (sends OTP)
   ↓
3. Admin enters OTP from email
   ↓
4. POST /api/v1/auth/verify-reset-otp (verifies OTP, returns resetToken)
   ↓
5. POST /api/v1/auth/reset-password (with resetToken header, resets password)
   ↓
6. Success message + Redirect to login
```

---

## 📤 Resend OTP

### Endpoint
```
POST /api/v1/auth/resend-otp
```

### Description
Resends OTP to admin's email if the previous one expired or was not received.

### Request Body
```json
{
  "email": "admin@example.com"
}
```

### Response (Success)
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

### Usage
- If admin doesn't receive OTP in 10 minutes, show "Resend OTP" button
- Click triggers this endpoint
- New OTP is generated and sent

---

## 🔑 Change Password

### Endpoint
```
POST /api/v1/auth/change-password
Authorization: Bearer <accessToken>
```

### Description
Changes password for logged-in admin. Requires current password verification.

### Request Header
```
Authorization: Bearer <accessToken>
```

### Request Body
```json
{
  "oldPassword": "currentPassword123",
  "newPassword": "newSecurePassword456",
  "confirmPassword": "newSecurePassword456"
}
```

### Response (Success)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Your password has been successfully changed",
  "data": {
    "email": "admin@example.com"
  }
}
```

### Security Requirements
- Admin must be logged in (valid access token required)
- Current password must be correct
- New password must be different from current password
- New password must match confirmation password

### Admin Dashboard Usage
- Available in "Account Settings" or "Security Settings"
- Only accessible after successful login

---

## 🔃 Refresh Token

### Endpoint
```
POST /api/v1/auth/refresh-token
```

### Description
Generates new access token using refresh token. Use when access token expires.

### Request Header
```
refreshtoken: <refreshToken>
```

### Response (Success)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Access token retrieved successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Implementation in Admin Dashboard
```javascript
// When access token expires (401 response)
try {
  const newTokenResponse = await fetch('/api/v1/auth/refresh-token', {
    method: 'POST',
    headers: {
      'refreshtoken': localStorage.getItem('refreshToken')
    }
  });
  
  if (newTokenResponse.ok) {
    const data = await newTokenResponse.json();
    localStorage.setItem('accessToken', data.data.accessToken);
    // Retry original request with new token
  } else {
    // Refresh token expired, redirect to login
  }
} catch (error) {
  // Redirect to login
}
```

---

## 🔐 OAuth Logins

### Google Login

#### Endpoint
```
POST /api/v1/auth/google-login
```

#### Request Body
```json
{
  "idToken": "<Google ID Token>"
}
```

#### Response (Success)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User logged in successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Implementation
```javascript
// Using Google Sign-In Library
import { GoogleLogin } from '@react-oauth/google';

<GoogleLogin
  onSuccess={(credentialResponse) => {
    fetch('/api/v1/auth/google-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: credentialResponse.credential })
    })
  }}
/>
```

---

### Apple Login

#### Endpoint
```
POST /api/v1/auth/apple-login
```

#### Request Body
```json
{
  "identityToken": "<Apple Identity Token>",
  "authorizationCode": "<Authorization Code>"
}
```

#### Response (Success)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User logged in successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 🔄 OTP Authentication (Alternative Login)

### Send OTP

#### Endpoint
```
POST /api/v1/auth/send-otp
```

#### Request Body
```json
{
  "email": "admin@example.com"
}
```

#### Response (Success)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent successfully to your email",
  "data": {
    "expiryTime": 600000
  }
}
```

### Verify OTP & Login

#### Endpoint
```
POST /api/v1/auth/verify-otp
```

#### Request Body
```json
{
  "email": "admin@example.com",
  "otp": "123456"
}
```

#### Response (Success)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP verified successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 🛡️ Security Considerations for Admin Dashboard

### Token Management
- Store access token in memory (not localStorage for security)
- Store refresh token securely (httpOnly cookie if possible)
- Clear tokens on logout
- Implement auto-refresh before token expiry

### OTP Security
- 6-digit code, 10-minute expiry
- Single-use verification
- Rate limiting on OTP generation (prevent brute force)
- Email delivery required

### Admin-Specific Security
- All admin endpoints require role verification
- Change password forces current password verification
- Forgot password requires OTP verification
- Session timeout recommended

### CORS Headers Required
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

## 📱 Admin Dashboard Implementation Guide

### Login Screen
```html
<form onSubmit={handleLogin}>
  <input type="email" placeholder="Email" />
  <input type="password" placeholder="Password" />
  <button type="submit">Login</button>
  <a href="/forgot-password">Forgot Password?</a>
</form>
```

### Forgot Password Flow
```
Screen 1: Email Input
  ↓ POST /api/v1/auth/forget-password
Screen 2: OTP Verification
  ↓ POST /api/v1/auth/verify-reset-otp
Screen 3: New Password Input
  ↓ POST /api/v1/auth/reset-password
Success: Redirect to Login
```

### Change Password (Settings)
```
Requirement: Valid access token
Form Fields:
  - Current Password
  - New Password
  - Confirm Password
Endpoint: POST /api/v1/auth/change-password
Response: Success → Logout → Redirect to Login
```

---

## 🧪 Testing with Thunder Client / Postman

### 1. Admin Login
```
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@vidzo.com",
  "password": "admin123"
}
```

### 2. Get New Access Token
```
POST http://localhost:5000/api/v1/auth/refresh-token
refreshtoken: <refreshToken>
```

### 3. Change Password
```
POST http://localhost:5000/api/v1/auth/change-password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "oldPassword": "admin123",
  "newPassword": "newAdmin456",
  "confirmPassword": "newAdmin456"
}
```

### 4. Forget Password
```
POST http://localhost:5000/api/v1/auth/forget-password
Content-Type: application/json

{
  "email": "admin@vidzo.com"
}
```

### 5. Reset Password
```
POST http://localhost:5000/api/v1/auth/reset-password
resettoken: <token-from-verify-otp>
Content-Type: application/json

{
  "email": "admin@vidzo.com",
  "otp": "123456",
  "newPassword": "resetAdmin789",
  "confirmPassword": "resetAdmin789"
}
```

---

## ✅ Ready for Admin Dashboard

All authentication endpoints are fully implemented and tested:
- ✅ Admin login with email/password
- ✅ Forget password with OTP
- ✅ Reset password flow
- ✅ Change password (for logged-in admins)
- ✅ Resend OTP functionality
- ✅ Token refresh mechanism
- ✅ OAuth (Google & Apple) support

**Status:** Production Ready ✅
