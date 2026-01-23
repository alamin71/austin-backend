import express from 'express';
import multer from 'multer';
import { USER_ROLES } from '../../../enums/user.js';
import { AuthController } from './auth.controller.js';
import { AuthValidation } from './auth.validation.js';
import validateRequest from '../../middleware/validateRequest.js';
import auth from '../../middleware/auth.js';

const router = express.Router();

const upload = multer({
     storage: multer.memoryStorage(),
     limits: { fileSize: 5 * 1024 * 1024 },
});

const parseFormDataForValidation = (req: any, res: any, next: any) => {
     try {
          // socialLinks object
          const socialLinks: any = {};
          Object.keys(req.body).forEach((key) => {
               if (key.startsWith('socialLinks[')) {
                    const fieldName = key.match(/socialLinks\[(.*?)\]/)?.[1];
                    if (fieldName) {
                         socialLinks[fieldName] = req.body[key];
                    }
                    delete req.body[key];
               }
          });

          // socialLinks
          if (Object.keys(socialLinks).length > 0) {
               req.body.socialLinks = socialLinks;
          }

          // Zod validation-body wrapper
          req.body = { body: req.body };

          next();
     } catch (err) {
          next(err);
     }
};



// ============================================
// USER AUTHENTICATION ENDPOINTS
// ============================================

// User login & registration
router.post(
     '/register',
     upload.single('image'),
     parseFormDataForValidation,
     // validateRequest(AuthValidation.createRegisterZodSchema),
     AuthController.registerUser,
);
router.post('/login', validateRequest(AuthValidation.createLoginZodSchema), AuthController.loginUser);
router.post('/refresh-token', AuthController.refreshToken);

// OAuth endpoints (User only)
router.post('/google-login', AuthController.googleLogin);
router.post('/apple-login', AuthController.appleLogin);

// OTP endpoints (User only)
router.post('/verify-otp', AuthController.verifyOTPAndLogin);
router.post('/resend-otp', AuthController.resendOtp);

// User password reset (email-based)
router.post('/forget-password', validateRequest(AuthValidation.createForgetPasswordZodSchema), AuthController.forgetPassword);
router.post('/verify-email', validateRequest(AuthValidation.createVerifyEmailZodSchema), AuthController.verifyEmail);
router.post('/verify-reset-otp', validateRequest(AuthValidation.createVerifyEmailZodSchema), AuthController.verifyResetOtp);
router.post('/reset-password', validateRequest(AuthValidation.createResetPasswordZodSchema), AuthController.resetPassword);

export const AuthRouter = router;
