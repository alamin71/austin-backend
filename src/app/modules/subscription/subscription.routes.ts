import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import { SubscriptionController } from './subscription.controller';
import auth from '../../middleware/auth';
const router = express.Router();

router.get('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), SubscriptionController.subscriptions);

router.get('/details', auth(USER_ROLES.USER), SubscriptionController.subscriptionDetails);
router.get('/success', SubscriptionController.orderSuccess);
router.get('/cancel', SubscriptionController.orderCancel);
router.post('/create-checkout-session/:id', auth(USER_ROLES.USER), SubscriptionController.createCheckoutSession);
router.post('/update/:id', auth(USER_ROLES.USER), SubscriptionController.updateSubscription);
router.delete('/cancel/:id', auth(USER_ROLES.USER), SubscriptionController.cancelSubscription);

export const SubscriptionRoutes = router;
