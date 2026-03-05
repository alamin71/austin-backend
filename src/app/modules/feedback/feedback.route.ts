import { Router } from 'express';
import { USER_ROLES } from '../../../enums/user.js';
import auth from '../../middleware/auth.js';
import validateRequest from '../../middleware/validateRequest.js';
import { FeedbackController } from './feedback.controller.js';
import { FeedbackValidation } from './feedback.validation.js';

const router = Router();

// User routes
router.post(
     '/',
     auth(USER_ROLES.USER),
     validateRequest(FeedbackValidation.createFeedbackZodSchema),
     FeedbackController.createFeedback,
);

router.get('/my-feedbacks', auth(USER_ROLES.USER), FeedbackController.getUserFeedbacks);

// Admin routes
router.get(
     '/',
     auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
     FeedbackController.getAllFeedbacks,
);

router.get(
     '/:feedbackId',
     auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
     FeedbackController.getFeedbackById,
);

router.delete(
     '/:feedbackId',
     auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
     FeedbackController.deleteFeedback,
);

export const FeedbackRouter = router;
