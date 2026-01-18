import express from 'express';
import multer from 'multer';
import { USER_ROLES } from '../../../enums/user';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validation';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
const router = express.Router();

const upload = multer({
     storage: multer.memoryStorage(), // Memory-তে রাখো (file system-এ না)
     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// ✅ Registration - form-data সাপোর্ট
router.post(
     '/register',
     upload.single('image'), // image field হ্যান্ডেল করো
     validateRequest(AuthValidation.createRegisterZodSchema),
     AuthController.registerUser,
);
router.post('/login', validateRequest(AuthValidation.createLoginZodSchema), AuthController.loginUser);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/forget-password', validateRequest(AuthValidation.createForgetPasswordZodSchema), AuthController.forgetPassword);

router.post('/verify-email', validateRequest(AuthValidation.createVerifyEmailZodSchema), AuthController.verifyEmail);
router.post('/verify-reset-otp', validateRequest(AuthValidation.createVerifyEmailZodSchema), AuthController.verifyResetOtp);

router.post('/reset-password', validateRequest(AuthValidation.createResetPasswordZodSchema), AuthController.resetPassword);
router.post('/dashboard/forget-password', validateRequest(AuthValidation.createForgetPasswordZodSchema), AuthController.forgetPasswordByUrl);

router.post('/dashboard/reset-password', auth(USER_ROLES.ADMIN, USER_ROLES.VENDOR), validateRequest(AuthValidation.createResetPasswordZodSchema), AuthController.resetPasswordByUrl);

router.post('/change-password', auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.VENDOR), validateRequest(AuthValidation.createChangePasswordZodSchema), AuthController.changePassword);
router.post('/resend-otp', AuthController.resendOtp);

export const AuthRouter = router;
