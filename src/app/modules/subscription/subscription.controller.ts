import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import SubscriptionService from './subscription.service.js';
import validateRequest from '../../middleware/validateRequest.js';
import { subscriptionValidation } from './subscription.validation.js';

class SubscriptionController {
  /**
   * ==================== TIER MANAGEMENT (ADMIN) ====================
   */

  /**
   * Create subscription tier
   */
  createSubscriptionTier = catchAsync(async (req: Request, res: Response) => {
    const result = await SubscriptionService.createSubscriptionTier(req.body, req.file);

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: 'Subscription tier created successfully',
      data: result,
    });
  });

  /**
   * Get all subscription tiers
   */
  getAllSubscriptionTiers = catchAsync(async (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === 'true';
    const result = await SubscriptionService.getAllSubscriptionTiers(includeInactive);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Subscription tiers retrieved successfully',
      data: result,
    });
  });

  /**
   * Update subscription tier
   */
  updateSubscriptionTier = catchAsync(async (req: Request, res: Response) => {
    const { tierId } = req.params;
    const result = await SubscriptionService.updateSubscriptionTier(tierId, req.body, req.file);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Subscription tier updated successfully',
      data: result,
    });
  });

  /**
   * Delete subscription tier
   */
  deleteSubscriptionTier = catchAsync(async (req: Request, res: Response) => {
    const { tierId } = req.params;
    const result = await SubscriptionService.deleteSubscriptionTier(tierId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: result.message,
      data: null,
    });
  });

  /**
   * ==================== USER SUBSCRIPTION ====================
   */

  /**
   * Create subscription (Web - Stripe)
   */
  createSubscription = catchAsync(async (req: Request, res: Response) => {
    const { streamerId, tierId, platform } = req.body;
    const userId = (req.user as any)._id;

    let result;
    if (platform === 'web') {
      result = await SubscriptionService.createStripeSubscription(
        userId,
        streamerId,
        tierId
      );
    } else {
      throw new Error('Platform not specified');
    }

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: 'Subscription initiated successfully',
      data: result,
    });
  });

  /**
   * Create IAP subscription (iOS/Android)
   */
  createIAPSubscription = catchAsync(async (req: Request, res: Response) => {
    const { streamerId, tierId, receiptData, platform } = req.body;
    const userId = (req.user as any)._id;

    const result = await SubscriptionService.verifyAndCreateIAPSubscription(
      userId,
      streamerId,
      tierId,
      receiptData,
      platform
    );

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: 'Subscription created successfully',
      data: result,
    });
  });

  /**
   * Confirm Stripe subscription (after payment)
   */
  confirmSubscription = catchAsync(async (req: Request, res: Response) => {
    const { paymentIntentId, stripeSubscriptionId } = req.body;

    const result = await SubscriptionService.confirmStripeSubscription(
      paymentIntentId,
      stripeSubscriptionId
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Subscription confirmed successfully',
      data: result,
    });
  });

  /**
   * Check if user is subscribed to streamer
   */
  checkSubscription = catchAsync(async (req: Request, res: Response) => {
    const { streamerId } = req.params;
    const userId = (req.user as any)._id;

    const isSubscribed = await SubscriptionService.isSubscribed(userId, streamerId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Subscription status retrieved',
      data: { isSubscribed },
    });
  });

  /**
   * Get user's subscriptions
   */
  getUserSubscriptions = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)._id;
    const result = await SubscriptionService.getUserSubscriptions(userId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'User subscriptions retrieved successfully',
      data: result,
    });
  });

  /**
   * Cancel subscription
   */
  cancelSubscription = catchAsync(async (req: Request, res: Response) => {
    const { streamerId } = req.params;
    const { cancellationReason } = req.body;
    const userId = (req.user as any)._id;

    const result = await SubscriptionService.cancelSubscription(
      userId,
      streamerId,
      cancellationReason
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Subscription cancelled successfully',
      data: result,
    });
  });

  /**
   * ==================== ADMIN ANALYTICS ====================
   */

  /**
   * Get subscription analytics
   */
  getSubscriptionAnalytics = catchAsync(async (req: Request, res: Response) => {
    const { streamerId } = req.query;
    const result = await SubscriptionService.getSubscriptionAnalytics(
      streamerId as string
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Subscription analytics retrieved successfully',
      data: result,
    });
  });

  /**
   * Get all subscriptions (Admin)
   */
  getAllSubscriptions = catchAsync(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const streamerId = req.query.streamerId as string;

    const result = await SubscriptionService.getAllSubscriptions(page, limit, {
      status,
      streamerId,
    });

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Subscriptions retrieved successfully',
      data: result.data,
      meta: {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        totalPage: result.pagination.pages,
      },
    });
  });
}

export default new SubscriptionController();
