import express from 'express';
import AnalyticsController from './analytics.controller.js';
import auth from '../../middleware/auth.js';
import { USER_ROLES } from '../../../enums/user.js';

const router = express.Router();

// Platform analytics (Admin only)
router.get('/platform', auth(USER_ROLES.ADMIN), AnalyticsController.getPlatformAnalytics);

// Real-time analytics (Public)
router.get('/realtime', AnalyticsController.getRealtimeAnalytics);

// Streamer dashboard (Own or Admin)
router.get('/streamer/:streamerId', auth(USER_ROLES.USER, USER_ROLES.ADMIN), AnalyticsController.getStreamerDashboard);

// My dashboard (Current user)
router.get('/my-dashboard', auth(USER_ROLES.USER), AnalyticsController.getMyDashboard);

// Category analytics (Public)
router.get('/category/:categoryId', AnalyticsController.getCategoryAnalytics);

// Comparison analytics (This month vs Last month)
router.get('/comparison', auth(USER_ROLES.USER, USER_ROLES.ADMIN), AnalyticsController.getComparisonAnalytics);

export default router;
