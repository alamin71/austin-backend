import { Router } from 'express';
import { USER_ROLES } from '../../../enums/user.js';
import auth from '../../middleware/auth.js';
import { FriendRequestController } from './friendRequest.controller.js';

const router = Router();

// Send friend request
router.post(
     '/send',
     auth(USER_ROLES.USER),
     FriendRequestController.sendFriendRequest,
);

// Get pending requests for current user
router.get(
     '/pending',
     auth(USER_ROLES.USER),
     FriendRequestController.getPendingRequests,
);

// Accept friend request
router.patch(
     '/:requestId/accept',
     auth(USER_ROLES.USER),
     FriendRequestController.acceptFriendRequest,
);

// Reject friend request
router.patch(
     '/:requestId/reject',
     auth(USER_ROLES.USER),
     FriendRequestController.rejectFriendRequest,
);

// Get friends list (for user or specific user)
router.get(
     '/list/:userId?',
     auth(USER_ROLES.USER),
     FriendRequestController.getFriendsList,
);

// Remove friend
router.delete(
     '/:friendId',
     auth(USER_ROLES.USER),
     FriendRequestController.removeFriend,
);

export const friendRequestRoutes = router;
