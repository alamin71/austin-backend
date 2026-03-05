import { Router } from 'express';
import { USER_ROLES } from '../../../enums/user.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
import { CustomerSupportController } from './customerSupport.controller.js';
import { CustomerSupportValidation } from './customerSupport.validation.js';

const router = Router();

// User routes
router.get(
     '/conversation',
     auth(USER_ROLES.USER),
     CustomerSupportController.getOrCreateConversation,
);

router.post(
     '/:conversationId/message',
     auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
     validateRequest(CustomerSupportValidation.sendMessageZodSchema),
     CustomerSupportController.sendMessage,
);

router.get(
     '/:conversationId/messages',
     auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
     CustomerSupportController.getMessages,
);

router.patch(
     '/:conversationId/mark-read',
     auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
     CustomerSupportController.markMessagesAsRead,
);

// Admin routes
router.get(
     '/',
     auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
     CustomerSupportController.getAllConversations,
);

router.patch(
     '/:conversationId/status',
     auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
     validateRequest(CustomerSupportValidation.updateStatusZodSchema),
     CustomerSupportController.updateConversationStatus,
);

export const CustomerSupportRouter = router;
