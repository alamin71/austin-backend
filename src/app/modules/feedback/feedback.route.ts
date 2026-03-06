import { Router } from 'express';
import { USER_ROLES } from '../../../enums/user.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
import { FeedbackController } from './feedback.controller.js';
import { FeedbackValidation } from './feedback.validation.js';

const router = Router();

// User routes only
router.post(
     '/',
     auth(USER_ROLES.USER),
     validateRequest(FeedbackValidation.createFeedbackZodSchema),
     FeedbackController.createFeedback,
);

router.get(
     '/',
     auth(USER_ROLES.USER),
     FeedbackController.getUserFeedbacks,
);

router.delete(
     '/:feedbackId',
     auth(USER_ROLES.USER),
     FeedbackController.deleteFeedback,
);

export const FeedbackRouter = router;
