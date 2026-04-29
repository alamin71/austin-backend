import { Router } from 'express';
import { USER_ROLES } from '../../../enums/user.js';
import auth from '../../middleware/auth.js';
import { NotificationController } from './notification.controller.js';
import deviceTokenController from './deviceToken.controller.js';

const router = Router();

// Notification routes
// Get all notifications (paginated)
router.get(
     '/',
     auth(USER_ROLES.USER),
     NotificationController.getNotifications,
);

// Get unread count
router.get(
     '/unread/count',
     auth(USER_ROLES.USER),
     NotificationController.getUnreadCount,
);

// Mark single notification as read
router.patch(
     '/:notificationId/read',
     auth(USER_ROLES.USER),
     NotificationController.markAsRead,
);

// Mark all notifications as read
router.patch(
     '/read/all',
     auth(USER_ROLES.USER),
     NotificationController.markAllAsRead,
);

// Delete notification
router.delete(
     '/:notificationId',
     auth(USER_ROLES.USER),
     NotificationController.deleteNotification,
);

// Clear all notifications
router.delete(
     '/clear/all',
     auth(USER_ROLES.USER),
     NotificationController.clearAllNotifications,
);

// Device Token routes (for push notifications)
// Register device token for push notifications
router.post(
     '/device/register',
     auth(USER_ROLES.USER),
     deviceTokenController.registerDeviceToken,
);

// Get user's device tokens
router.get(
     '/device/user-tokens',
     auth(USER_ROLES.USER),
     deviceTokenController.getUserDeviceTokens,
);

// Deactivate device token
router.post(
     '/device/deactivate',
     auth(USER_ROLES.USER),
     deviceTokenController.deactivateDeviceToken,
);

// Delete device token
router.delete(
     '/device/delete',
     auth(USER_ROLES.USER),
     deviceTokenController.deleteDeviceToken,
);

export const notificationRoutes = router;
