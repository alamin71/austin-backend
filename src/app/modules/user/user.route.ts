import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { USER_ROLES } from '../../../enums/user.js';
import { UserController } from './user.controller.js';
import { UserValidation } from './user.validation.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';

const router = express.Router();

// Multer setup for file upload (S3)
const upload = multer({
     storage: multer.memoryStorage(),
     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router
     .route('/profile')
     .get(auth(USER_ROLES.ADMIN, USER_ROLES.USER), UserController.getUserProfile)
     .patch(
          auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER),
          upload.single('image'),
          (req: Request, res: Response, next: NextFunction) => {
               // Parse JSON data field
               if (req.body.data) {
                    const data = JSON.parse(req.body.data);
                    req.body = { ...data };
               }
               next();
          },
          validateRequest(UserValidation.updateUserZodSchema),
          UserController.updateProfile,
     );

// Get other user's profile
router.get('/profile/:userId', auth(USER_ROLES.USER), UserController.getUserProfileById);

router.route('/').post(validateRequest(UserValidation.createUserZodSchema), UserController.createUser);

router.delete('/delete', auth(USER_ROLES.USER), UserController.deleteProfile);

// Block/Unblock endpoints
router.post('/block/:blockUserId', auth(USER_ROLES.USER), UserController.blockUser);
router.post('/unblock/:unblockUserId', auth(USER_ROLES.USER), UserController.unblockUser);
router.get('/blocked-users', auth(USER_ROLES.USER), UserController.getBlockedUsers);
router.get('/is-blocked/:checkUserId', auth(USER_ROLES.USER), UserController.isUserBlocked);

// Privacy & Safety endpoints
router.get('/privacy-settings', auth(USER_ROLES.USER), UserController.getPrivacySettings);
router.patch('/privacy-settings', auth(USER_ROLES.USER), UserController.updatePrivacySettings);

// Security endpoints
router.get('/security-settings', auth(USER_ROLES.USER), UserController.getSecuritySettings);
router.patch('/security-settings', auth(USER_ROLES.USER), UserController.updateSecuritySettings);

export const UserRouter = router;
