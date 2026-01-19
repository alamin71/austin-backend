# 📧 Nodemailer Gmail Configuration Guide

## ✅ Configuration Complete

Your nodemailer is now configured for Gmail SMTP! Here's what was set up:

---

## 🔧 Environment Variables (.env)

```env
# SMTP Gmail Configuration
EMAIL_HEADER_NAME=Example Email
EMAIL_FROM="alamin.softvence@gmail.com"
EMAIL_USER="alamin.softvence@gmail.com"
EMAIL_PASS="mzcr seca bwuw vbpg"
EMAIL_PORT=587
EMAIL_HOST=smtp.gmail.com
```

### 🔐 Important: Gmail App Password

Your `EMAIL_PASS` is a **Gmail App Password**, NOT your regular Gmail password.

**How to generate Gmail App Password:**
1. Go to Google Account: https://myaccount.google.com/security
2. Enable **2-Step Verification** (required)
3. Go to **App Passwords**: https://myaccount.google.com/apppasswords
4. Select app: **Mail**
5. Select device: **Other (Custom name)** → Type "Nodemailer Backend"
6. Click **Generate**
7. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)
8. Paste it in `.env` as `EMAIL_PASS` (spaces removed)

---

## 📝 What Was Updated

### 1. **emailHelper.ts** - Improved Configuration
```typescript
const transporter = nodemailer.createTransport({
     host: 'smtp.gmail.com',
     port: 587,
     secure: false, // STARTTLS for port 587
     auth: {
          user: 'alamin.softvence@gmail.com',
          pass: 'your-app-password',
     },
     tls: {
          rejectUnauthorized: false, // For development
     },
});
```

### 2. **New Functions Added**
- ✅ `verifyEmailConnection()` - Tests SMTP connection on startup
- ✅ `sendTestEmail()` - Sends test email with HTML template

### 3. **server.ts** - Auto-verify on Startup
Email connection is verified automatically when server starts.

### 4. **Test Routes Added**
Two new test endpoints created in `/api/v1/test`:

---

## 🧪 Testing Email Configuration

### Method 1: Check Server Logs
Start the server and check logs:
```bash
npm run dev
```

Look for:
```
✅ Email transporter is ready to send emails
```

### Method 2: Test Email Endpoint

**Send Test Email:**
```bash
POST http://localhost:5000/api/v1/test/send-test-email
Content-Type: application/json

{
  "to": "your-email@example.com"
}
```

**Verify Email Config:**
```bash
GET http://localhost:5000/api/v1/test/verify-email-config
```

### Method 3: Postman/Thunder Client

**Test Email:**
- Method: POST
- URL: `http://localhost:5000/api/v1/test/send-test-email`
- Body (JSON):
```json
{
  "to": "test@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Test email sent successfully! Check your inbox."
}
```

---

## 📧 Sending Emails from Your Code

### Example: Send OTP Email
```typescript
import { emailHelper } from '../helpers/emailHelper';

const sendOTPEmail = async (email: string, otp: string) => {
     await emailHelper.sendEmail({
          to: email,
          subject: 'Your OTP Code - VidZo',
          html: `
               <h2>Your OTP Code</h2>
               <p>Your verification code is: <strong>${otp}</strong></p>
               <p>This code will expire in 10 minutes.</p>
          `,
     });
};
```

### Example: Send Welcome Email
```typescript
await emailHelper.sendEmail({
     to: user.email,
     subject: 'Welcome to VidZo!',
     html: `
          <h1>Welcome ${user.name}!</h1>
          <p>Thank you for joining VidZo.</p>
     `,
});
```

### Example: Send Admin Notification
```typescript
await emailHelper.sendEmailForAdmin({
     to: 'user@example.com',
     subject: 'New User Registration',
     html: '<p>A new user has registered!</p>',
});
```

---

## 🐛 Troubleshooting

### Issue 1: "Invalid login" error
**Solution:** 
- Make sure you're using **App Password**, not regular Gmail password
- Verify 2-Step Verification is enabled

### Issue 2: "Connection timeout"
**Solution:**
- Check firewall/antivirus blocking port 587
- Try port 465 with `secure: true`
- Check internet connection

### Issue 3: Email not received
**Solution:**
- Check spam/junk folder
- Verify recipient email is correct
- Check Gmail "Sent" folder
- Review server logs for errors

### Issue 4: "Less secure app" warning
**Solution:**
- Gmail no longer supports "less secure apps"
- MUST use **App Password** with 2-Step Verification
- Regular password won't work anymore

---

## 🔒 Security Best Practices

### ✅ DO:
- Use App Passwords (never regular password)
- Keep `.env` file in `.gitignore`
- Use environment variables
- Enable 2-Step Verification
- Rotate App Passwords periodically

### ❌ DON'T:
- Never commit `.env` to Git
- Don't share App Passwords
- Don't use regular Gmail password
- Don't disable TLS in production

---

## 🌐 Alternative SMTP Providers

If Gmail doesn't work, you can use:

### SendGrid (Recommended for Production)
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=<your-sendgrid-api-key>
```

### Mailgun
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=<your-mailgun-smtp-username>
EMAIL_PASS=<your-mailgun-smtp-password>
```

### AWS SES
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=<your-aws-access-key-id>
EMAIL_PASS=<your-aws-secret-access-key>
```

---

## 📊 Current Configuration Status

| Item | Status | Details |
|------|--------|---------|
| Nodemailer | ✅ Installed | v6.10.0 |
| Types | ✅ Installed | @types/nodemailer |
| Gmail SMTP | ✅ Configured | smtp.gmail.com:587 |
| App Password | ⏳ Verify | Check if current password works |
| Email Helper | ✅ Updated | With verify & test functions |
| Test Routes | ✅ Created | `/api/v1/test/*` |
| Server Startup | ✅ Integrated | Auto-verify on start |

---

## 🚀 Next Steps

1. **Start server:**
   ```bash
   npm run dev
   ```

2. **Check logs for:**
   ```
   ✅ Email transporter is ready to send emails
   ```

3. **Test email sending:**
   ```bash
   curl -X POST http://localhost:5000/api/v1/test/send-test-email \
     -H "Content-Type: application/json" \
     -d '{"to":"your-email@gmail.com"}'
   ```

4. **Integrate emails in your auth flow:**
   - OTP emails (forget password)
   - Welcome emails (registration)
   - Password reset confirmations
   - Admin notifications

---

## 📞 Support

If you encounter any issues:
1. Check server logs for error details
2. Verify Gmail App Password is correct
3. Test with `/api/v1/test/verify-email-config`
4. Review nodemailer documentation: https://nodemailer.com/

---

**Status:** ✅ Ready to Use  
**Last Updated:** 2026-01-19  
**Build:** Zero Errors ✅
