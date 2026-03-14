import { Router } from 'express';
import { USER_ROLES } from '../../../enums/user.js';
import auth from '../../middleware/auth.js';
import { CommunityPulseController } from './communityPulse.controller.js';

const router = Router();

/**
 * GET /community-pulse/live?tab=all|friends&limit=10
 * Returns currently live streams for the Live row.
 */
router.get('/live', auth(USER_ROLES.USER), CommunityPulseController.getLiveStreams);

/**
 * GET /community-pulse?tab=all|friends&page=1&limit=20
 * Returns a merged feed of streams + moments sorted by newest.
 */
router.get('/', auth(USER_ROLES.USER), CommunityPulseController.getFeed);

export const CommunityPulseRouter = router;
