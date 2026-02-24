import express from 'express';
import multer from 'multer';
import subscriptionController from './subscription.controller.js';
import auth from '../../middleware/auth.js';
import { USER_ROLES } from '../../../enums/user.js';
import validateRequest from '../../middleware/validateRequest.js';
import { subscriptionValidation } from './subscription.validation.js';

const router = express.Router();

// Multer setup for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

/**
 * ==================== PUBLIC ROUTES ====================
 */

// Get all subscription tiers (public)
router.get('/tiers', subscriptionController.getAllSubscriptionTiers);

/**
 * ==================== USER ROUTES (AUTHENTICATED) ====================
 */

// Create subscription
router.post(
  '/subscribe',
  auth(USER_ROLES.USER),
  validateRequest(subscriptionValidation.createSubscriptionSchema),
  subscriptionController.createSubscription
);

// Create IAP subscription
router.post(
  '/subscribe/iap',
  auth(USER_ROLES.USER),
  validateRequest(subscriptionValidation.iapSubscriptionSchema),
  subscriptionController.createIAPSubscription
);

// Confirm subscription (after payment)
router.post(
  '/confirm',
  auth(USER_ROLES.USER),
  validateRequest(subscriptionValidation.confirmSubscriptionSchema),
  subscriptionController.confirmSubscription
);

// Check if subscribed to streamer
router.get(
  '/check/:streamerId',
  auth(USER_ROLES.USER),
  subscriptionController.checkSubscription
);

// Get user's subscriptions
router.get(
  '/my-subscriptions',
  auth(USER_ROLES.USER),
  subscriptionController.getUserSubscriptions
);

// Cancel subscription
router.post(
  '/cancel/:streamerId',
  auth(USER_ROLES.USER),
  validateRequest(subscriptionValidation.cancelSubscriptionSchema),
  subscriptionController.cancelSubscription
);

/**
 * ==================== ADMIN ROUTES ====================
 */

// Create subscription tier
router.post(
  '/admin/tiers',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  upload.single('badgeIcon'),
  subscriptionController.createSubscriptionTier
);

// Update subscription tier
router.put(
  '/admin/tiers/:tierId',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  upload.single('badgeIcon'),
  subscriptionController.updateSubscriptionTier
);

// Delete subscription tier
router.delete(
  '/admin/tiers/:tierId',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  subscriptionController.deleteSubscriptionTier
);

// Get all subscriptions (admin)
router.get(
  '/admin/all',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  subscriptionController.getAllSubscriptions
);

// Get subscription analytics (admin)
router.get(
  '/admin/analytics',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  subscriptionController.getSubscriptionAnalytics
);

export default router;
