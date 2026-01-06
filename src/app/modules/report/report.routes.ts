import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import { ReportController } from './report.controller';
import auth from '../../middleware/auth';
const router = express.Router();

router.post('/', auth(USER_ROLES.USER), ReportController.createReport);

export const ReportRoutes = router;
