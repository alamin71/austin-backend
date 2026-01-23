import express from 'express';
import { USER_ROLES } from '../../../enums/user.js';
import { AdminController } from './admin.controller.js';
import { AdminValidation } from './admin.validation.js';
import { AuthValidation } from '../auth/auth.validation.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
import categoryController from '../category/category.controller.js';
import { createCategorySchema, updateCategorySchema } from '../category/category.validation.js';
import fileUploadHandler from '../../middleware/fileUploadHandler.js';
const router = express.Router();

// ============================================
// ADMIN AUTHENTICATION ENDPOINTS
// ============================================

// Admin login - returns admin data
router.post('/login', validateRequest(AuthValidation.createLoginZodSchema), AdminController.adminLogin);

// Admin password reset (OTP-based) - returns admin data
router.post('/forget-password', validateRequest(AuthValidation.createForgetPasswordZodSchema), AdminController.adminForgetPassword);
router.post('/verify-reset-otp', validateRequest(AuthValidation.createVerifyEmailZodSchema), AdminController.adminVerifyResetOtp);
router.post('/reset-password', validateRequest(AuthValidation.createResetPasswordZodSchema), AdminController.adminResetPassword);

// Admin password change (logged in only) - returns admin data
router.patch('/change-password', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), validateRequest(AuthValidation.createChangePasswordZodSchema), AdminController.changePassword);

// Admin resend OTP - returns admin data
router.post('/resend-otp', AdminController.adminResendOtp);

// ============================================
// ADMIN MANAGEMENT ENDPOINTS
// ============================================

router.post('/create-admin', auth(USER_ROLES.SUPER_ADMIN), validateRequest(AdminValidation.createAdminZodSchema), AdminController.createAdmin);

router.get('/get-admin', auth(USER_ROLES.SUPER_ADMIN), AdminController.getAdmin);

router.get('/profile', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), AdminController.getAdminProfile);

router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN), AdminController.deleteAdmin);

// ============================================
// CATEGORY MANAGEMENT ENDPOINTS
// ============================================

router.post(
  '/create-category',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  fileUploadHandler(),
  validateRequest(createCategorySchema),
  categoryController.createCategory,
);

router.put(
  '/update-category/:categoryId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  fileUploadHandler(),
  validateRequest(updateCategorySchema),
  categoryController.updateCategory,
);

router.delete(
  '/delete-category/:categoryId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  categoryController.deleteCategory,
);

export const AdminRoutes = router;
