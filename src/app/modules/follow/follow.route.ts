import { Router } from 'express';
import { USER_ROLES } from '../../../enums/user.js';
import auth from '../../middleware/auth.js';
import { FollowController } from './follow.controller.js';

const router = Router();

// Follow user
router.post(
     '/follow',
     auth(USER_ROLES.USER),
     FollowController.followUser,
);

// Unfollow user
router.post(
     '/unfollow',
     auth(USER_ROLES.USER),
     FollowController.unfollowUser,
);

// Get followers list
router.get(
     '/followers/:userId?',
     auth(USER_ROLES.USER),
     FollowController.getFollowers,
);

// Get following list
router.get(
     '/following/:userId?',
     auth(USER_ROLES.USER),
     FollowController.getFollowing,
);

// Check if following
router.get(
     '/status/:followingId',
     auth(USER_ROLES.USER),
     FollowController.isFollowing,
);

export const followRoutes = router;
