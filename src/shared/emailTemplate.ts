import { IContact, ICreateAccount, IHelpContact, IResetPassword, IResetPasswordByEmail, ITwoFactorLogin } from '../types/emailTamplate.js';

const logoImage = '<img src="cid:vidzo-logo" alt="VidZo Streaming Logo" style="display: block; margin: 0 auto 15px; width: 120px; height: auto;" />';

const createAccount = (values: ICreateAccount) => {
     const data = {
          to: values.email,
                    subject: `Verify Your OTP - ${values.otp}`,
          html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification OTP</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #251742; margin: 0; padding: 0;">
    <div style="width: 100%; max-width: 600px; margin: 40px auto; padding: 0; border: 3px solid #FDB940; border-radius: 12px; box-shadow: 0 10px 40px rgba(253, 185, 64, 0.3);">
        <!-- Header with gradient -->
        <div style="background: #251742; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; border-bottom: 2px solid #FDB940;">
            ${logoImage}
            <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: 600;">VidZo Streaming</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Live Streaming Platform</p>
        </div>

        <!-- Main Content -->
        <div style="background: #fff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            
            <!-- Badge for OTP Type -->
            <div style="display: inline-block; background: #251742; color: #FDB940; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; letter-spacing: 0.5px; border: 2px solid #FDB940;">
                VERIFY YOUR OTP
            </div>

            <!-- Greeting -->
            <h2 style="color: #333; font-size: 24px; margin: 15px 0 10px 0; font-weight: 600;">Welcome, ${values.name}!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                Thank you for signing up with VidZo Streaming. We're excited to have you join our live streaming community!
            </p>
            <p style="color: #251742; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0; font-weight: 600;">
                Verify Your OTP - ${values.otp}
            </p>

            <!-- OTP Section -->
            <div style="background: #f8f9fa; border-left: 4px solid #251742; padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center; border: 2px solid #251742;">
                <p style="color: #666; font-size: 14px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">Verify Your OTP</p>
                <div style="background: #fff; border: 3px solid #FDB940; padding: 20px; border-radius: 8px; margin: 15px 0;">
                    <p style="color: #251742; font-size: 36px; font-weight: 700; margin: 0; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                        ${values.otp}
                    </p>
                </div>
                <p style="color: #999; font-size: 13px; margin: 15px 0 0 0;">
                    ⏱️ This code expires in <strong style="color: #d32f2f;">3 minutes</strong>
                </p>
            </div>

            <!-- Instructions -->
            <div style="background: #fffbea; border: 1px solid #ffe082; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #333; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">⚠️ How to proceed:</p>
                <ol style="color: #666; font-size: 14px; margin: 10px 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Copy the code above</li>
                    <li style="margin-bottom: 8px;">Return to VidZo Streaming app</li>
                    <li style="margin-bottom: 8px;">Paste the code in the verification field</li>
                    <li>Complete your email verification</li>
                </ol>
            </div>

            <!-- Security Notice -->
            <div style="background: #f3e5f5; border-left: 4px solid #7b1fa2; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #6a1b9a; font-size: 13px; margin: 0;">
                    <strong>🔒 Security Notice:</strong> Never share this code with anyone, including VidZo Streaming staff. We will never ask for your verification code.
                </p>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
                <p style="color: #999; font-size: 13px; margin: 0 0 10px 0;">
                    Didn't request this code? You can safely ignore this email.
                </p>
                <p style="color: #999; font-size: 12px; margin: 0;">
                    © 2026 VidZo Streaming. All rights reserved.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`,
     };
     return data;
};
const contact = (values: IContact) => {
     const data = {
          to: values.email,
          subject: 'We’ve Received Your Message – Thank You!',
          html: `<body style="font-family: Arial, sans-serif; background-color: #251742; margin: 50px; padding: 20px; color: #555;">      
      <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); border: 3px solid #FDB940;">
          ${logoImage}
          <h2 style="color: #251742; font-size: 24px; margin-bottom: 20px; text-align: center;">Thank You for Contacting Us, ${values.name}!</h2>
          
          <p style="color: #555; font-size: 16px; line-height: 1.5; text-align: center;">
              We have received your message and our team will get back to you as soon as possible.
          </p>
          
          <div style="padding: 15px; background-color: #f4f4f4; border-radius: 8px; margin: 20px 0; border: 2px solid #251742;">
              <p style="color: #333; font-size: 16px; font-weight: bold;">Your Message Details:</p>
              <p><strong>Name:</strong> ${values.name}</p>
              <p><strong>Email:</strong> ${values.email}</p>
              <p><strong>Subject:</strong> ${values.subject}</p>
              <br/>
              <p><strong>Message:</strong> ${values.message}</p>
          </div>

          <p style="color: #555; font-size: 14px; text-align: center;">
              If your inquiry is urgent, feel free to reach out to us directly at 
              <a href="mailto:support@yourdomain.com" style="color: #251742; text-decoration: none; font-weight: 600;">support@yourdomain.com</a>.
          </p>

          <p style="color: #555; font-size: 14px; text-align: center; margin-top: 20px;">
              Best Regards, <br/>
              The VidZo Streaming Team
          </p>
      </div>
  </body>`,
     };
     return data;
};
const resetPassword = (values: IResetPassword) => {
     const data = {
          to: values.email,
        subject: `Verify Your OTP - ${values.otp}`,
          html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset OTP</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #251742; margin: 0; padding: 0;">
    <div style="width: 100%; max-width: 600px; margin: 40px auto; padding: 0; border: 3px solid #FDB940; border-radius: 12px; box-shadow: 0 10px 40px rgba(253, 185, 64, 0.3);">
        <!-- Header with gradient -->
        <div style="background: #251742; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; border-bottom: 2px solid #FDB940;">
            ${logoImage}
            <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: 600;">VidZo Streaming</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Password Reset Request</p>
        </div>

        <!-- Main Content -->
        <div style="background: #fff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            
            <!-- Badge for OTP Type -->
            <div style="display: inline-block; background: #251742; color: #FDB940; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; letter-spacing: 0.5px; border: 2px solid #FDB940;">
                VERIFY YOUR OTP
            </div>

            <!-- Warning Alert -->
            <div style="background: #fce4ec; border: 2px solid #f5576c; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                <p style="color: #c62828; font-size: 14px; font-weight: 600; margin: 0;">
                    🚨 Password Reset Request Detected
                </p>
                <p style="color: #ad1457; font-size: 13px; margin: 8px 0 0 0;">
                    Someone requested to reset the password for your VidZo Streaming account.
                </p>
            </div>

            <!-- OTP Section -->
            <div style="background: #f8f9fa; border-left: 4px solid #251742; padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center; border: 2px solid #251742;">
                <p style="color: #666; font-size: 14px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">Verify Your OTP</p>
                <div style="background: #fff; border: 3px solid #FDB940; padding: 20px; border-radius: 8px; margin: 15px 0;">
                    <p style="color: #251742; font-size: 36px; font-weight: 700; margin: 0; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                        ${values.otp}
                    </p>
                </div>
                <p style="color: #d32f2f; font-size: 13px; margin: 15px 0 0 0; font-weight: 600;">
                    ⏱️ This code expires in <strong>3 minutes</strong>
                </p>
            </div>

            <!-- Instructions -->
            <div style="background: #fff3e0; border: 1px solid #ffb74d; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #333; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">📋 Steps to reset your password:</p>
                <ol style="color: #666; font-size: 14px; margin: 10px 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Copy the code above</li>
                    <li style="margin-bottom: 8px;">Go to password reset page</li>
                    <li style="margin-bottom: 8px;">Enter the code and your new password</li>
                    <li>Confirm to update your password</li>
                </ol>
            </div>

            <!-- Did Not Request? -->
            <div style="background: #e8f5e9; border-left: 4px solid #2e7d32; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #1b5e20; font-size: 13px; margin: 0; font-weight: 600;">
                    ❓ Didn't request this?
                </p>
                <p style="color: #2e7d32; font-size: 13px; margin: 8px 0 0 0;">
                    If you didn't request a password reset, please ignore this email. Your account is safe. If you suspect unauthorized activity, <a href="mailto:support@vidzostreaming.com" style="color: #2e7d32; text-decoration: underline; font-weight: 600;">contact our support team</a>.
                </p>
            </div>

            <!-- Security Notice -->
            <div style="background: #f3e5f5; border-left: 4px solid #7b1fa2; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #6a1b9a; font-size: 13px; margin: 0;">
                    <strong>🔒 Security Reminder:</strong> VidZo Streaming staff will never ask you for this code. Keep it confidential.
                </p>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
                <p style="color: #999; font-size: 13px; margin: 0 0 10px 0;">
                    Need help? Contact us at <a href="mailto:support@vidzostreaming.com" style="color: #f5576c; text-decoration: none; font-weight: 600;">support@vidzostreaming.com</a>
                </p>
                <p style="color: #999; font-size: 12px; margin: 0;">
                    © 2026 VidZo Streaming. All rights reserved.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`,
     };
     return data;
};
const resetPasswordByUrl = (values: IResetPasswordByEmail) => {
     const data = {
          to: values.email,
          subject: 'Reset Your Password',
          html: `<body style="font-family: Arial, sans-serif; background-color: #251742; margin: 50px; padding: 20px; color: #555;">
      <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); border: 3px solid #FDB940;">
        ${logoImage}
        <div style="text-align: center;">
          <h2 style="color: #251742;">Reset Your Password</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">We received a request to reset your password. Click the button below to reset it:</p>
          <a href="${values.resetUrl}" target="_blank" style="display: inline-block; background-color: #251742; color: white; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-size: 18px; margin: 20px auto; border: 2px solid #FDB940;">Reset Password</a>
          <p style="color: #555; font-size: 16px; line-height: 1.5; margin-top: 20px;">If you didn’t request this, you can ignore this email.</p>
          <p style="color: #b9b4b4; font-size: 14px;">This link will expire in 10 minutes.</p>
        </div>
      </div>
    </body>`,
     };
     return data;
};

const contactFormTemplate = (values: IHelpContact) => {
     const data = {
          to: values.email,
          subject: 'Thank you for reaching out to us',
          html: `<body style="font-family: Arial, sans-serif; background-color: #251742; margin: 50px; padding: 20px; color: #555;">
    <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); border: 3px solid #FDB940;">
        ${logoImage}
        <div style="text-align: center;">
            <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Hello ${values.name},</p>
            <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Thank you for reaching out to us. We have received your message:</p>
            <div style="background-color: #f1f1f1; padding: 15px; border-radius: 8px; border: 2px solid #251742; margin-bottom: 20px;">
                <p style="color: #555; font-size: 16px; line-height: 1.5;">"${values.message}"</p>
            </div>
            <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">We will get back to you as soon as possible. Below are the details you provided:</p>
            <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 10px;">Email: ${values.email}</p>
            <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 10px;">Phone: ${values.phone}</p>
            <p style="color: #b9b4b4; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">If you need immediate assistance, please feel free to contact us directly at our support number.</p>
        </div>
    </div>
</body>`,
     };
     return data;
};

const twoFactorLogin = (values: ITwoFactorLogin) => {
     const data = {
          to: values.email,
        subject: `Verify Your OTP - ${values.otp}`,
          html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Two-Factor Authentication OTP</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #251742; margin: 0; padding: 0;">
    <div style="width: 100%; max-width: 600px; margin: 40px auto; padding: 0; border: 3px solid #FDB940; border-radius: 12px; box-shadow: 0 10px 40px rgba(253, 185, 64, 0.3);">
        <!-- Header with gradient -->
        <div style="background: #251742; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; border-bottom: 2px solid #FDB940;">
            ${logoImage}
            <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: 600;">VidZo Streaming</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Two-Factor Authentication</p>
        </div>

        <!-- Main Content -->
        <div style="background: #fff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            
            <!-- Badge for OTP Type -->
            <div style="display: inline-block; background: #251742; color: #FDB940; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; letter-spacing: 0.5px; border: 2px solid #FDB940;">
                VERIFY YOUR OTP
            </div>

            <!-- Greeting -->
            <h2 style="color: #333; font-size: 24px; margin: 15px 0 10px 0; font-weight: 600;">Verify Your OTP - ${values.otp}</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                A login attempt was detected on your VidZo Streaming account. To continue, please verify your identity using the OTP below.
            </p>
            <p style="color: #251742; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0; font-weight: 600;">
                Verify Your OTP - ${values.otp}
            </p>

            <!-- OTP Section -->
            <div style="background: #f8f9fa; border-left: 4px solid #251742; padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center; border: 2px solid #251742;">
                <p style="color: #666; font-size: 14px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">Verify Your OTP</p>
                <div style="background: #fff; border: 3px solid #FDB940; padding: 20px; border-radius: 8px; margin: 15px 0;">
                    <p style="color: #251742; font-size: 36px; font-weight: 700; margin: 0; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                        ${values.otp}
                    </p>
                </div>
                <p style="color: #d32f2f; font-size: 13px; margin: 15px 0 0 0; font-weight: 600;">
                    ⏱️ This code expires in <strong>3 minutes</strong>
                </p>
            </div>

            <!-- Instructions -->
            <div style="background: #fff3e0; border: 1px solid #ffb74d; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #333; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">📋 Steps to complete login:</p>
                <ol style="color: #666; font-size: 14px; margin: 10px 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Copy the code above</li>
                    <li style="margin-bottom: 8px;">Return to VidZo Streaming app</li>
                    <li style="margin-bottom: 8px;">Enter the code in the verification field</li>
                    <li>Complete your login</li>
                </ol>
            </div>

            <!-- Did Not Request? -->
            <div style="background: #ffebee; border-left: 4px solid #f44336; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #c62828; font-size: 13px; margin: 0; font-weight: 600;">
                    ❓ Didn't try to login?
                </p>
                <p style="color: #d32f2f; font-size: 13px; margin: 8px 0 0 0;">
                    If you didn't attempt to login, your account may be compromised. Please <a href="mailto:support@vidzostreaming.com" style="color: #d32f2f; text-decoration: underline; font-weight: 600;">contact our support team immediately</a> and change your password.
                </p>
            </div>

            <!-- Security Notice -->
            <div style="background: #f3e5f5; border-left: 4px solid #7b1fa2; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #6a1b9a; font-size: 13px; margin: 0;">
                    <strong>🔒 Security Reminder:</strong> VidZo Streaming staff will never ask you for this code. Keep it confidential.
                </p>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
                <p style="color: #999; font-size: 13px; margin: 0 0 10px 0;">
                    Need help? Contact us at <a href="mailto:support@vidzostreaming.com" style="color: #4facfe; text-decoration: none; font-weight: 600;">support@vidzostreaming.com</a>
                </p>
                <p style="color: #999; font-size: 12px; margin: 0;">
                    © 2026 VidZo Streaming. All rights reserved.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`,
     };
     return data;
};

export const emailTemplate = {
     createAccount,
     resetPassword,
     resetPasswordByUrl,
     contactFormTemplate,
     contact,
     twoFactorLogin,
};
