import express from 'express';
import streamController from './stream.controller.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
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
     auth('user', 'streamer', 'business'),
     upload.single('banner'),
     validateRequest(startStreamSchema),
     streamController.startStream,
);
router.post(
     '/:streamId/end',
     auth('user', 'streamer', 'business'),
     streamController.endStream,
);
router.post(
     '/:streamId/join',
     auth('user', 'streamer', 'business'),
     streamController.joinStream,
);
router.post(
     '/:streamId/leave',
     auth('user', 'streamer', 'business'),
     streamController.leaveStream,
);
router.post(
     '/:streamId/like',
     auth('user', 'streamer', 'business'),
     streamController.likeStream,
);
router.post(
     '/:streamId/chat',
     auth('user', 'streamer', 'business'),
     validateRequest(sendChatMessageSchema),
     streamController.sendChatMessage,
);
router.put(
     '/:streamId/settings',
     auth('user', 'streamer', 'business'),
     validateRequest(updateStreamSettingsSchema),
     streamController.updateStreamSettings,
);
router.put(
     '/:streamId/controls',
     auth('user', 'streamer', 'business'),
     validateRequest(toggleStreamControlsSchema),
     streamController.toggleStreamControls,
);
router.get(
     '/:streamId/analytics',
     auth('user', 'streamer', 'business'),
     streamController.getStreamAnalytics,
);

export const StreamRouter = router;
