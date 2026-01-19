import nodemailer from 'nodemailer';
import config from '../config/index.js';
import { errorLogger, logger } from '../shared/logger.js';
import { ISendEmail } from '../types/email.js';

// Gmail SMTP Configuration
const transporter = nodemailer.createTransport({
     host: config.email.host, // smtp.gmail.com
     port: Number(config.email.port), // 587
     secure: false, // true for 465, false for other ports (587 uses STARTTLS)
     auth: {
          user: config.email.user, // your Gmail address
          pass: config.email.pass, // your App Password (not regular password)
     },
     tls: {
          rejectUnauthorized: false, // Allow self-signed certificates (for development)
     },
});

const sendEmail = async (values: ISendEmail) => {
     try {
          const info = await transporter.sendMail({
               from: `${config.email.email_header} ${config.email.from}`,
               to: values.to,
               subject: values.subject,
               html: values.html,
          });

          logger.info('Mail send successfully', info.accepted);
     } catch (error) {
          errorLogger.error('Email', error);
     }
};
const sendEmailForAdmin = async (values: ISendEmail) => {
     try {
          const info = await transporter.sendMail({
               from: `"${values.to}" <${values.to}>`,
               to: config.email.user,
               subject: values.subject,
               html: values.html,
          });

          logger.info('Mail send successfully', info.accepted);
     } catch (error) {
          errorLogger.error('Email', error);
     }
};

// Verify transporter connection
const verifyEmailConnection = async () => {
     try {
          await transporter.verify();
          logger.info('✅ Email transporter is ready to send emails');
          return true;
     } catch (error) {
          errorLogger.error('❌ Email transporter verification failed:', error);
          return false;
     }
};

// Test email function (for development/testing)
const sendTestEmail = async (to: string) => {
     try {
          const info = await transporter.sendMail({
               from: `${config.email.email_header} <${config.email.from}>`,
               to: to,
               subject: '✅ Test Email - VidZo Backend',
               html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                         <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
                              <h2 style="color: #333;">🎉 Email Configuration Successful!</h2>
                              <p style="color: #666; line-height: 1.6;">
                                   This is a test email from your VidZo backend server. 
                                   If you're reading this, it means your nodemailer configuration is working perfectly!
                              </p>
                              <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                   <strong>Configuration Details:</strong><br>
                                   Host: ${config.email.host}<br>
                                   Port: ${config.email.port}<br>
                                   From: ${config.email.from}
                              </div>
                              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                                   Sent from VidZo Backend Server
                              </p>
                         </div>
                    </div>
               `,
          });

          logger.info('✅ Test email sent successfully to:', to);
          logger.info('Message ID:', info.messageId);
          return true;
     } catch (error) {
          errorLogger.error('❌ Failed to send test email:', error);
          return false;
     }
};

export const emailHelper = {
     sendEmail,
     sendEmailForAdmin,
     verifyEmailConnection,
     sendTestEmail,
};
