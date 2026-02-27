import { Router } from 'express';
import { USER_ROLES } from '../../../enums/user.js';
import auth from '../../middleware/auth.js';
import { MessageController } from './message.controller.js';

const router = Router();

// Send message
router.post(
     '/send',
     auth(USER_ROLES.USER),
     MessageController.sendMessage,
);

// Get conversation with specific user
router.get(
     '/conversation/:otherUserId',
     auth(USER_ROLES.USER),
     MessageController.getConversation,
);

// Get all conversations list
router.get(
     '/list',
     auth(USER_ROLES.USER),
     MessageController.getConversationsList,
);

// Mark messages as read
router.patch(
     '/read/:otherUserId',
     auth(USER_ROLES.USER),
     MessageController.markAsRead,
);

// Get unread count
router.get(
     '/unread/count',
     auth(USER_ROLES.USER),
     MessageController.getUnreadCount,
);

// Delete message
router.delete(
     '/:messageId',
     auth(USER_ROLES.USER),
     MessageController.deleteMessage,
);

export const messageRoutes = router;
