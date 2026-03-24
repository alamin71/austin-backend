import express from 'express';
import multer from 'multer';
import { USER_ROLES } from '../../../enums/user.js';
import { AdminController } from './admin.controller.js';
import { AdminValidation } from './admin.validation.js';
import { AuthValidation } from '../auth/auth.validation.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
import categoryController from '../category/category.controller.js';
import { createCategorySchema, updateCategorySchema } from '../category/category.validation.js';
import cmsController from '../cms/cms.controller.js';
import {
  createFaqSchema,
  createStaticContentSchema,
  updateFaqSchema,
  updateStaticContentSchema,
} from '../cms/cms.validation.js';
import challengeController from '../challenge/challenge.controller.js';
import { ReportController } from '../report/report.controller.js';
import { ReportValidation } from '../report/report.validation.js';

const router = express.Router();

// Multer for admin profile image uploads
const adminUpload = multer({
     storage: multer.memoryStorage(),
     limits: { fileSize: 5 * 1024 * 1024 },
     fileFilter: (req, file, cb) => {
          const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
          if (allowedTypes.includes(file.mimetype)) {
               cb(null, true);
          } else {
               cb(new Error('Only .png, .jpg, .jpeg, .webp files are allowed'));
          }
     },
});

// Multer for category image uploads (memory storage for S3)
const categoryUpload = multer({
     storage: multer.memoryStorage(),
     limits: { fileSize: 5 * 1024 * 1024 },
     fileFilter: (req, file, cb) => {
          const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
          if (allowedTypes.includes(file.mimetype)) {
               cb(null, true);
          } else {
               cb(new Error('Only .png, .jpg, .jpeg, .webp files are allowed'));
          }
     },
});

// Multer for support message uploads (images, PDFs, documents, etc.)
const supportUpload = multer({ 
     storage: multer.memoryStorage(),
     limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Multer parser for challenge form-data text fields
const challengeUpload = multer();

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

router.patch(
  '/profile/update',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  adminUpload.fields([{ name: 'image', maxCount: 1 }]),
  AdminController.updateAdminProfile,
);

router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN), AdminController.deleteAdmin);

// ============================================
// CATEGORY MANAGEMENT ENDPOINTS
// ============================================

router.post(
  '/create-category',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  categoryUpload.fields([{ name: 'image', maxCount: 1 }]),
  validateRequest(createCategorySchema),
  categoryController.createCategory,
);

router.put(
  '/update-category/:categoryId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  categoryUpload.fields([{ name: 'image', maxCount: 1 }]),
  validateRequest(updateCategorySchema),
  categoryController.updateCategory,
);

router.delete(
  '/delete-category/:categoryId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  categoryController.deleteCategory,
);

// ============================================
// CMS MANAGEMENT ENDPOINTS (FAQ + STATIC PAGES)
// ============================================

router.post(
  '/faq',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(createFaqSchema),
  cmsController.createFaq,
);

router.get(
  '/faq',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  cmsController.getAllFaqs,
);

router.get(
  '/faq/:faqId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  cmsController.getFaqById,
);

router.patch(
  '/faq/:faqId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(updateFaqSchema),
  cmsController.updateFaq,
);

router.delete(
  '/faq/:faqId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  cmsController.deleteFaq,
);

router.post(
  '/static-content',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(createStaticContentSchema),
  cmsController.createStaticContent,
);

router.get(
  '/static-content',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  cmsController.getAllStaticContents,
);

router.get(
  '/static-content/:key',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  cmsController.getStaticContentByKey,
);

router.put(
  '/static-content/:key',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(updateStaticContentSchema),
  cmsController.updateStaticContentByKey,
);

router.delete(
  '/static-content/:key',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  cmsController.deleteStaticContentByKey,
);

// ============================================
// STREAM MONITORING & MODERATION ENDPOINTS
// ============================================

router.get(
  '/stream/active',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.getActiveStreams,
);

router.get(
  '/stream/monitoring',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.getStreamMonitoring,
);

router.get(
  '/top-performers',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.getTopPerformers,
);

router.get(
  '/overview',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.getDashboardOverview,
);

router.get(
  '/earnings',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.getAdminEarnings,
);

// ============================================
// REPORT MONITORING ENDPOINTS (ADMIN)
// ============================================

router.get(
  '/report/stream',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReportController.getStreamReports,
);

router.get(
  '/report/profile',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReportController.getProfileReports,
);

router.get(
  '/report/post',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReportController.getPostReports,
);

router.patch(
  '/report/:reportId/status',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(ReportValidation.updateReportStatusSchema),
  ReportController.updateReportStatus,
);

// ============================================
// CHALLENGE MANAGEMENT ENDPOINTS (ADMIN)
// ============================================

router.get(
  '/challenge-list',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  challengeController.getAdminChallenges,
);

router.get(
  '/challenge/:challengeId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  challengeController.getAdminChallengeById,
);

router.post(
  '/challenge-create',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  challengeUpload.none(),
  challengeController.createChallenge,
);

router.patch(
  '/challenge-update/:challengeId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  challengeUpload.none(),
  challengeController.updateChallenge,
);

router.patch(
  '/challenge-update/:challengeId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  challengeUpload.none(),
  challengeController.updateChallenge,
);

router.delete(
  '/challenge-delete/:challengeId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  challengeController.deleteChallenge,
);

router.post(
  '/stream/:streamId/warn',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.warnStreamer,
);

router.patch(
  '/stream/:streamId/end',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.endStream,
);

router.get(
  '/stream/:streamerId/warnings',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminController.getStreamerWarnings,
);

// ============================================
// FEEDBACK MANAGEMENT ENDPOINTS
// ============================================

import { FeedbackController } from '../feedback/feedback.controller.js';

router.get(
  '/feedback',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  FeedbackController.getAllFeedbacks,
);

router.get(
  '/feedback/:feedbackId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  FeedbackController.getFeedbackById,
);

router.delete(
  '/feedback/:feedbackId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  FeedbackController.deleteFeedback,
);

// ============================================
// CUSTOMER SUPPORT MANAGEMENT ENDPOINTS
// ============================================

import { CustomerSupportController } from '../customerSupport/customerSupport.controller.js';
import { CustomerSupportValidation } from '../customerSupport/customerSupport.validation.js';

router.get(
  '/support',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  CustomerSupportController.getAllConversations,
);

router.post(
  '/support/:conversationId/message',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  supportUpload.single('media'),
  validateRequest(CustomerSupportValidation.sendMessageZodSchema),
  CustomerSupportController.sendMessage,
);

router.get(
  '/support/:conversationId/messages',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  CustomerSupportController.getMessages,
);

router.patch(
  '/support/:conversationId/mark-read',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  CustomerSupportController.markMessagesAsRead,
);

router.patch(
  '/support/:conversationId/status',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(CustomerSupportValidation.updateStatusZodSchema),
  CustomerSupportController.updateConversationStatus,
);

export const AdminRoutes = router;
