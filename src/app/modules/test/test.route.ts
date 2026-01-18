import express from 'express';
import { emailHelper } from '../../../helpers/emailHelper';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

const router = express.Router();

// Test email endpoint
router.post(
     '/send-test-email',
     catchAsync(async (req, res) => {
          const { to } = req.body;

          if (!to) {
               return sendResponse(res, {
                    statusCode: 400,
                    success: false,
                    message: 'Please provide recipient email address',
               });
          }

          const result = await emailHelper.sendTestEmail(to);

          if (result) {
               sendResponse(res, {
                    statusCode: 200,
                    success: true,
                    message: 'Test email sent successfully! Check your inbox.',
               });
          } else {
               sendResponse(res, {
                    statusCode: 500,
                    success: false,
                    message: 'Failed to send test email. Check server logs.',
               });
          }
     }),
);

// Email connection verification
router.get(
     '/verify-email-config',
     catchAsync(async (req, res) => {
          const isConnected = await emailHelper.verifyEmailConnection();

          sendResponse(res, {
               statusCode: isConnected ? 200 : 500,
               success: isConnected,
               message: isConnected 
                    ? '✅ Email configuration is working correctly!' 
                    : '❌ Email configuration failed. Check your SMTP settings.',
          });
     }),
);

export const TestRouter = router;
