import express, { NextFunction, Request, Response } from 'express';
import { USER_ROLES } from '../../../enums/user';
import { MessageController } from './message.controller';
import auth from '../../middleware/auth';
import fileUploadHandler from '../../middleware/fileUploadHandler';
import parseFileData from '../../middleware/parseFileData';
import { FOLDER_NAMES } from '../../../enums/files';

const router = express.Router();

router.post('/send-message/:chatId', auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN), fileUploadHandler(), parseFileData(FOLDER_NAMES.IMAGE), MessageController.sendMessage);
router.get('/:id', auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN), MessageController.getAllMessage);
router.post('/react/:messageId', auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN), MessageController.addReaction);
router.delete('/delete/:messageId', auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN), MessageController.deleteMessage);

export const MessageRoutes = router;
