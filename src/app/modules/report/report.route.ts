import { Router } from 'express';
import { USER_ROLES } from '../../../enums/user.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
import { ReportController } from './report.controller.js';
import { ReportValidation } from './report.validation.js';

const router = Router();

// ─── User routes ────────────────────────────────────────────────────────────

/** POST /report/stream/:streamId  – report a live stream */
router.post(
  '/stream/:streamId',
  auth(USER_ROLES.USER),
  validateRequest(ReportValidation.createReportSchema),
  ReportController.reportStream,
);

/** POST /report/profile/:userId  – report another user's profile */
router.post(
  '/profile/:userId',
  auth(USER_ROLES.USER),
  validateRequest(ReportValidation.createReportSchema),
  ReportController.reportProfile,
);

/** POST /report/post/:postId  – report a moment/post */
router.post(
  '/post/:postId',
  auth(USER_ROLES.USER),
  validateRequest(ReportValidation.createReportSchema),
  ReportController.reportPost,
);

// ─── Admin routes ────────────────────────────────────────────────────────────

/** GET /report  – list all reports (filterable by status, reportType) */
router.get(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReportController.getAllReports,
);

/** GET /report/:reportId  – get a single report detail */
router.get(
  '/:reportId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReportController.getReportById,
);

/** PATCH /report/:reportId/status  – update report status */
router.patch(
  '/:reportId/status',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(ReportValidation.updateReportStatusSchema),
  ReportController.updateReportStatus,
);

export const ReportRouter = router;
