import express from 'express';
import walletController from './wallet.controller.js';
import auth from '../../middleware/auth.js';
import { USER_ROLES } from '../../../enums/user.js';

const router = express.Router();

/**
 * ==================== USER ROUTES ====================
 */

// Get wallet balance
router.get(
  '/balance',
  auth(USER_ROLES.USER),
  walletController.getWalletBalance
);

// Get transaction history
router.get(
  '/transactions',
  auth(USER_ROLES.USER),
  walletController.getTransactionHistory
);

// Get feather packages (public)
router.get('/feathers/packages', walletController.getFeatherPackages);

// Create withdrawal request
router.post(
  '/withdraw',
  auth(USER_ROLES.USER),
  walletController.createWithdrawal
);

/**
 * ==================== ADMIN ROUTES ====================
 */

// Create feather package
router.post(
  '/admin/feathers/packages',
  auth(USER_ROLES.ADMIN),
  walletController.createFeatherPackage
);

// Update feather package
router.put(
  '/admin/feathers/packages/:packageId',
  auth(USER_ROLES.ADMIN),
  walletController.updateFeatherPackage
);

// Get all wallets
router.get(
  '/admin/all',
  auth(USER_ROLES.ADMIN),
  walletController.getAllWallets
);

export default router;
