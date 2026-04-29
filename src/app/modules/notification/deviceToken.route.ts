import express from 'express';
import deviceTokenController from './deviceToken.controller.js';
import auth from '../../middleware/auth.js';
import { USER_ROLES } from '../../../enums/user.js';

const router = express.Router();

// Register device token for push notifications
router.post(
     '/register',
     auth(USER_ROLES.USER),
     deviceTokenController.registerDeviceToken,
);

// Get user's device tokens
router.get(
     '/user-tokens',
     auth(USER_ROLES.USER),
     deviceTokenController.getUserDeviceTokens,
);

// Deactivate device token
router.post(
     '/deactivate',
     auth(USER_ROLES.USER),
     deviceTokenController.deactivateDeviceToken,
);

// Delete device token
router.delete(
     '/delete',
     auth(USER_ROLES.USER),
     deviceTokenController.deleteDeviceToken,
);

export default router;
