import { Router } from 'express';
import { WebsiteLogoController } from './websiteLogo.controller';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middleware/auth';
import fileUploadHandler from '../../middleware/fileUploadHandler';

const router = Router();
router.post('/upload', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), fileUploadHandler(), WebsiteLogoController.createOrUpdateLogo);

router.get('/', WebsiteLogoController.getLogo);

export const WebsiteLogoRoutes = router;
