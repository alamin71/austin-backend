import express from 'express';
import { USER_ROLES } from '../../../enums/user.js';
import { AdminController } from './admin.controller.js';
import { AdminValidation } from './admin.validation.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
const router = express.Router();

router.post('/create-admin', auth(USER_ROLES.SUPER_ADMIN), validateRequest(AdminValidation.createAdminZodSchema), AdminController.createAdmin);

router.get('/get-admin', auth(USER_ROLES.SUPER_ADMIN), AdminController.getAdmin);

router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN), AdminController.deleteAdmin);

export const AdminRoutes = router;
