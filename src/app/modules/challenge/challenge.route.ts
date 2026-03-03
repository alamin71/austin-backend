import express from 'express';
import challengeController from './challenge.controller.js';
import auth from '../../middleware/auth.js';
import { USER_ROLES } from '../../../enums/user.js';

const router = express.Router();

/**
 * Challenge Routes
 * Based on Figma: Explore > Challenges tab
 */

// Public: Get all active challenges
router.get('/', challengeController.getChallenges);

// User: Get own progress & ranking
router.get(
  '/progress',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  challengeController.getUserProgress
);

// Public: Get global rankings (leaderboard)
router.get('/rankings', challengeController.getRankings);

// Admin: Create a challenge
router.post(
  '/admin',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  challengeController.createChallenge
);

// Admin: Update a challenge
router.patch(
  '/admin/:challengeId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  challengeController.updateChallenge
);

// Admin: Delete a challenge
router.delete(
  '/admin/:challengeId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  challengeController.deleteChallenge
);

export default router;
