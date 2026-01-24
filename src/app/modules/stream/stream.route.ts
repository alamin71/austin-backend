import express from 'express';
import streamController from './stream.controller.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
import { USER_ROLES } from '../../../enums/user.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
     startStreamSchema,
     updateStreamSettingsSchema,
     toggleStreamControlsSchema,
     sendChatMessageSchema,
} from './stream.validation.js';

const router = express.Router();

// Configure multer for banner upload
const storage = multer.diskStorage({
     destination: (req, file, cb) => {
          const uploadDir = path.join(process.cwd(), 'uploads', 'banner');
          if (!fs.existsSync(uploadDir)) {
               fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
     },
     filename: (req, file, cb) => {
          const fileExt = path.extname(file.originalname);
          const fileName = file.originalname.replace(fileExt, '').toLowerCase().split(' ').join('-') + '-' + Date.now();
          cb(null, fileName + fileExt);
     },
});

const upload = multer({
     storage: storage,
     limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
     fileFilter: (req, file, cb) => {
          const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
          if (allowedTypes.includes(file.mimetype)) {
               cb(null, true);
          } else {
               cb(new Error('Only .png, .jpg, .jpeg, .webp files are allowed'));
          }
     },
});

// Public routes
router.get('/live', streamController.getLiveStreams);
router.get('/search', streamController.searchStreams);
router.get(
     '/streamer/:streamerId/history',
     streamController.getStreamerHistory,
);
router.get('/:streamId', streamController.getStreamDetails);

// Protected routes (authenticated users only)
router.post(
     '/start',
     auth(USER_ROLES.USER),
     upload.single('banner'),
     validateRequest(startStreamSchema),
     streamController.startStream,
);
router.post(
     '/:streamId/end',
     auth(USER_ROLES.USER),
     streamController.endStream,
);
router.post(
     '/:streamId/join',
     auth(USER_ROLES.USER),
     streamController.joinStream,
);
router.post(
     '/:streamId/leave',
     auth(USER_ROLES.USER),
     streamController.leaveStream,
);
router.post(
     '/:streamId/like',
     auth(USER_ROLES.USER),
     streamController.likeStream,
);
router.post(
     '/:streamId/chat',
     auth(USER_ROLES.USER),
     validateRequest(sendChatMessageSchema),
     streamController.sendChatMessage,
);
router.put(
     '/:streamId/settings',
     auth(USER_ROLES.USER),
     validateRequest(updateStreamSettingsSchema),
     streamController.updateStreamSettings,
);
router.put(
     '/:streamId/controls',
     auth(USER_ROLES.USER),
     validateRequest(toggleStreamControlsSchema),
     streamController.toggleStreamControls,
);
router.get(
     '/:streamId/analytics',
     auth(USER_ROLES.USER),
     streamController.getStreamAnalytics,
);

export const StreamRouter = router;
