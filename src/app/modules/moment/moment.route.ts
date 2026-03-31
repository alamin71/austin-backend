import { Router } from 'express';
import multer from 'multer';
import { USER_ROLES } from '../../../enums/user.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
import { MomentController } from './moment.controller.js';
import { MomentValidation } from './moment.validation.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB for video support
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
});

// ─── Feed & Discovery ────────────────────────────────────────────────────────

/** GET /moment?tab=all|friends&page=1&limit=20  – main feed */
router.get('/', auth(USER_ROLES.USER), MomentController.getMoments);

/** GET /moment/saved  – current user's saved moments */
router.get('/saved', auth(USER_ROLES.USER), MomentController.getSavedMoments);

/** GET /moment/my  – current user's own moments */
router.get('/my', auth(USER_ROLES.USER), MomentController.getMyMoments);

/** GET /moment/user/:userId  – moments by a specific user */
router.get('/user/:userId', auth(USER_ROLES.USER), MomentController.getUserMoments);

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * POST /moment
 * form-data:
 *   description  (string, optional)
 *   media        (files, optional – images/videos, max 10)
 */
router.post(
  '/',
  auth(USER_ROLES.USER),
  upload.array('media', 10),
  MomentController.createMoment,
);

// ─── Single moment ───────────────────────────────────────────────────────────

/** GET /moment/:momentId */
router.get('/:momentId', auth(USER_ROLES.USER), MomentController.getMomentById);

/** DELETE /moment/:momentId */
router.delete('/:momentId', auth(USER_ROLES.USER), MomentController.deleteMoment);

// ─── Like / Save ─────────────────────────────────────────────────────────────

/** POST /moment/:momentId/like */
router.post('/:momentId/like', auth(USER_ROLES.USER), MomentController.toggleLike);

/** POST /moment/:momentId/save */
router.post('/:momentId/save', auth(USER_ROLES.USER), MomentController.toggleSave);

// ─── Comments ────────────────────────────────────────────────────────────────

/** POST /moment/:momentId/comment */
router.post(
  '/:momentId/comment',
  auth(USER_ROLES.USER),
  validateRequest(MomentValidation.addCommentSchema),
  MomentController.addComment,
);

/** GET /moment/:momentId/comments */
router.get('/:momentId/comments', auth(USER_ROLES.USER), MomentController.getComments);

/** POST /moment/comment/:commentId/like */
router.post(
  '/comment/:commentId/like',
  auth(USER_ROLES.USER),
  MomentController.toggleCommentLike,
);

export const MomentRouter = router;
