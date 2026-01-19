import express, { NextFunction, Request, Response } from 'express';
import { USER_ROLES } from '../../../enums/user.js';
import { UserController } from './user.controller.js';
import { UserValidation } from './user.validation.js';
import { getSingleFilePath } from '../../../shared/getFilePath.js';
import auth from '../../middleware/auth.js';
import fileUploadHandler from '../../middleware/fileUploadHandler.js';
import validateRequest from '../../middleware/validateRequest.js';
const router = express.Router();

router
     .route('/profile')
     .get(auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.VENDOR), UserController.getUserProfile)
     .patch(
          auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.VENDOR),
          fileUploadHandler(),
          (req: Request, res: Response, next: NextFunction) => {
               const image = getSingleFilePath(req.files, 'image');
               const data = JSON.parse(req.body.data);
               req.body = { image, ...data };
               next();
          },
          validateRequest(UserValidation.updateUserZodSchema),
          UserController.updateProfile,
     );

router.route('/').post(validateRequest(UserValidation.createUserZodSchema), UserController.createUser);

router.delete('/delete', auth(USER_ROLES.USER), UserController.deleteProfile);

export const UserRouter = router;
