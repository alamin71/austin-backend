import { Router } from 'express';
import multer from 'multer';
import { USER_ROLES } from '../../../enums/user.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
import { CustomerSupportController } from './customerSupport.controller.js';
import { CustomerSupportValidation } from './customerSupport.validation.js';

const router = Router();
const upload = multer({ 
     storage: multer.memoryStorage(),
     limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// User routes only
router.get(
     '/conversation',
     auth(USER_ROLES.USER),
     CustomerSupportController.getOrCreateConversation,
);

router.post(
     '/:conversationId/message',
     auth(USER_ROLES.USER),
     upload.single('media'),
     validateRequest(CustomerSupportValidation.sendMessageZodSchema),
     CustomerSupportController.sendMessage,
);

router.get(
     '/:conversationId/messages',
     auth(USER_ROLES.USER),
     CustomerSupportController.getMessages,
);

router.patch(
     '/:conversationId/mark-read',
     auth(USER_ROLES.USER),
     CustomerSupportController.markMessagesAsRead,
);

export const CustomerSupportRouter = router;
