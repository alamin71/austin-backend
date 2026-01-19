import express from 'express';
import streamController from './stream.controller.js';
import auth from '../../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/live', streamController.getLiveStreams);
router.get('/search', streamController.searchStreams);
router.get('/streamer/:streamerId/history', streamController.getStreamerHistory);
router.get('/:streamId', streamController.getStreamDetails);

// Protected routes (authenticated users only)
router.post('/start', auth('user', 'streamer', 'business'), streamController.startStream);
router.post('/:streamId/end', auth('user', 'streamer', 'business'), streamController.endStream);
router.post('/:streamId/chat', auth('user', 'streamer', 'business'), streamController.sendChatMessage);

export const StreamRouter = router;
