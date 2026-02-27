import { Router } from 'express';
import { USER_ROLES } from '../../../enums/user.js';
import auth from '../../middleware/auth.js';
import { NotificationController } from './notification.controller.js';

const router = Router();

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

export const notificationRoutes = router;
