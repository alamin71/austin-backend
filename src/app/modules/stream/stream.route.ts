import express from 'express';
import streamController from './stream.controller.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
import {
     startStreamSchema,
     updateStreamSettingsSchema,
     toggleStreamControlsSchema,
     sendChatMessageSchema,
} from './stream.validation.js';

const router = express.Router();

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
