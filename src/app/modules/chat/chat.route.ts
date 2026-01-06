import { Router } from 'express';
import { ChatController } from './chat.controller';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middleware/auth';

const router = Router();
router.get('/', auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN), ChatController.getChats);
router.post('/create-chat', auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN), ChatController.createChat);
router.patch('/mark-chat-as-read/:id', auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN), ChatController.markChatAsRead);

export const ChatRoutes = router;
